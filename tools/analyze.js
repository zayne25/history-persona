/**
 * 数据分析器：对题库与人物库做一次可复现的大规模模拟体检
 *
 *   用法：node tools/analyze.js [样本量]
 *   产出：assets/js/data/analysis.js  →  window.ANALYSIS_DATA
 *
 * 设计要点（决定了结论能不能站得住）：
 *   1. 固定随机种子：同一份数据、同一份代码，任何时刻跑出的结论完全一致，便于前后对比。
 *   2. 混合人群建模：真实流量不会全是认真用户，按「认真 35% / 一般 50% / 乱点 15%」抽样。
 *   3. 每个指标都配阈值与判据：结论不是「看起来还行」，而是「通过 / 警告 / 不通过」。
 *   4. 明确写出局限：模拟用户不等于真实用户，这条不写出来，整份报告就没有说服力。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = { window: {}, console, navigator: {} };
sandbox.window.btoa = global.btoa;
sandbox.window.atob = global.atob;
sandbox.window.localStorage = undefined;
sandbox.window.location = { hash: '' };
vm.createContext(sandbox);

[
  'assets/js/data/figures-cn.js',
  'assets/js/data/figures-world.js',
  'assets/js/data/questions.js',
  'assets/js/core/matching.js',
  'assets/js/core/store.js'
].forEach((rel) => vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel }));

const M = sandbox.window.Matching;
const figures = sandbox.window.FIGURE_PACKS.flatMap((p) => p.figures);
const bank = sandbox.window.QUESTIONS;
const extra = bank.extra || [];
const combined = { list: bank.list.concat(extra), config: bank.config };
const boundsMain = M.computeBounds(bank);
const boundsFull = M.computeBounds(combined);

const N = Number(process.argv[2]) || 4000;
const SEED = 20261024;

// ---------------- 可复现随机 ----------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rng = mulberry32(SEED);

// ---------------- 用户建模 ----------------
/** 真实人群的六维分布：围绕中位，但有明显极化（sd=22，截断到 3~97） */
function sampleProfile() {
  const p = {};
  M.DIMS.forEach((d) => { p[d] = clamp(Math.round(50 + gauss(rng) * 22), 3, 97); });
  return p;
}

function alignment(delta, profile) {
  return M.DIMS.reduce((s, d) => s + ((profile[d] - 50) / 50) * (delta[d] || 0), 0);
}

/**
 * 按人格作答。consistency 表示「按自己的倾向作答」的概率，
 * 其余情况下随机选——用它来模拟不同程度的认真。
 */
function answer(q, profile, consistency) {
  if (q.type === 'slider') {
    const target = clamp(Math.round((profile[q.dim] - 50) / 5), -10, 10);
    if (rng() < consistency) return clamp(target + Math.round(gauss(rng) * 1.5), -10, 10);
    return Math.floor(rng() * 21) - 10;
  }
  if (q.type === 'rank') {
    return q.items
      .map((it, i) => ({ i, s: alignment(it.d, profile) + (1 - consistency) * gauss(rng) * 8 }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.i);
  }
  if (rng() < consistency) {
    let best = 0, bestScore = -Infinity;
    q.options.forEach((o, i) => {
      const s = alignment(o.d || {}, profile) + gauss(rng) * 1.5;
      if (s > bestScore) { bestScore = s; best = i; }
    });
    return best;
  }
  return Math.floor(rng() * q.options.length);
}

function answerBank(list, profile, consistency) {
  const a = {};
  list.forEach((q) => { a[q.id] = answer(q, profile, consistency); });
  return a;
}

/** 混合人群：真实流量的构成假设 */
const GROUPS = [
  { key: 'careful', name: '认真作答', consistency: 0.92, weight: 0.35, desc: '按自己的倾向稳定作答' },
  { key: 'normal', name: '一般作答', consistency: 0.65, weight: 0.50, desc: '大致认真，偶有随意' },
  { key: 'careless', name: '乱点作答', consistency: 0.00, weight: 0.15, desc: '完全不读题，随机点选' }
];

function pickGroup() {
  const r = rng();
  let acc = 0;
  for (const g of GROUPS) { acc += g.weight; if (r < acc) return g; }
  return GROUPS[GROUPS.length - 1];
}

/** 一次完整作答：先跑主题库判断是否平局，再跑合并库得到最终结果（与线上流程一致） */
function takeQuiz(profile, consistency) {
  const mainAnswers = answerBank(bank.list, profile, consistency);
  const main = M.evaluate(bank, figures, mainAnswers, boundsMain);

  const all = Object.assign({}, mainAnswers);
  if (main.needTieBreak && extra.length) {
    Object.assign(all, answerBank(extra, profile, consistency));
  }
  const final = M.evaluate(combined, figures, all, boundsFull);
  return { main, final, answers: all };
}

// ---------------- 采集 ----------------
const tally = {};                 // 全体 Top1
const tallyByGroup = {};          // 各人群 Top1
GROUPS.forEach((g) => { tallyByGroup[g.key] = {}; });

const coordSamples = {};          // 各维度坐标样本（用于分布与区分度）
M.DIMS.forEach((d) => { coordSamples[d] = []; });

const displayValues = [];         // 展示匹配度
const adjustedValues = [];        // 平衡调优后的原始分（诊断展示口径用）
const rawSamples = {};            // 各维度原始分样本（用于经验标定）
M.DIMS.forEach((d) => { rawSamples[d] = []; });
const credibilityByGroup = {};    // 各人群的可信度标签分布
GROUPS.forEach((g) => { credibilityByGroup[g.key] = {}; });

const optionCounts = {};          // 每题各选项被选次数（检测诱导性选项）
bank.list.concat(extra).forEach((q) => {
  if (q.options) optionCounts[q.id] = q.options.map(() => 0);
});

let tieBreaks = 0;
let specialEndings = 0;

for (let i = 0; i < N; i++) {
  const group = pickGroup();
  const profile = sampleProfile();
  const { main, final, answers } = takeQuiz(profile, group.consistency);

  const id = final.top.figure.id;
  tally[id] = (tally[id] || 0) + 1;
  tallyByGroup[group.key][id] = (tallyByGroup[group.key][id] || 0) + 1;

  M.DIMS.forEach((d) => coordSamples[d].push(final.coords[d]));
  displayValues.push(final.top.display);
  adjustedValues.push(final.top.adjusted);
  M.DIMS.forEach((d) => rawSamples[d].push(final.raw[d]));

  const level = final.credibilityLabel.level;
  credibilityByGroup[group.key][level] = (credibilityByGroup[group.key][level] || 0) + 1;

  if (main.needTieBreak) tieBreaks += 1;
  if (final.isUnrecorded) specialEndings += 1;

  Object.keys(answers).forEach((qid) => {
    if (!optionCounts[qid]) return;
    const v = answers[qid];
    if (typeof v === 'number' && v >= 0 && v < optionCounts[qid].length) optionCounts[qid][v] += 1;
  });
}

// ---------------- 重测信度 ----------------
// 同一人格、两次独立作答，Top1 是否稳定 —— 这是「结论能不能信」的核心指标。
// 注意：这里用 consistency = 1.0（完全按倾向作答，仅保留选项间的犹豫噪声），
// 测的是「系统对作答噪声的鲁棒性」。若掺入随机作答，测到的就变成了用户本身的不稳定，
// 而不是系统的稳定性——那是两件事，不能混在一个指标里。
const RETEST = 600;
let retestSame = 0;
let retestTop3 = 0;
for (let i = 0; i < RETEST; i++) {
  const profile = sampleProfile();
  const a = takeQuiz(profile, 1.0);
  const b = takeQuiz(profile, 1.0);
  if (a.final.top.figure.id === b.final.top.figure.id) retestSame += 1;
  const top3a = a.final.ranked.slice(0, 3).map((x) => x.figure.id);
  if (top3a.indexOf(b.final.top.figure.id) >= 0) retestTop3 += 1;
}

// ---------------- 指标计算 ----------------
function hist(values, bins, min, max) {
  const out = new Array(bins).fill(0);
  const step = (max - min) / bins;
  values.forEach((v) => {
    let i = Math.floor((v - min) / step);
    if (i < 0) i = 0;
    if (i >= bins) i = bins - 1;
    out[i] += 1;
  });
  return out;
}
function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
function sd(a) { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) * (v - m)))); }

const total = N;
const distItems = figures.map((f) => {
  const c = tally[f.id] || 0;
  return { id: f.id, name: f.name, era: f.era, count: c, share: c / total };
}).sort((a, b) => b.share - a.share);

const hhi = distItems.reduce((s, x) => s + x.share * x.share, 0);
const coverage = distItems.filter((x) => x.count > 0).length / figures.length;
const maxShare = distItems[0].share;
// 理论均匀分布下的最大占比，用来判断「最热人物」到底有多热
const evenShare = 1 / figures.length;

const dimStats = M.DIMS.map((d) => {
  const arr = coordSamples[d];
  const meta = M.DIM_META.filter((m) => m.key === d)[0];
  return {
    dim: d, name: meta.name, neg: meta.neg, pos: meta.pos,
    mean: +mean(arr).toFixed(1),
    sd: +sd(arr).toFixed(1),
    min: Math.round(Math.min.apply(null, arr)),
    max: Math.round(Math.max.apply(null, arr)),
    histogram: hist(arr, 10, 0, 100)
  };
});

const displaySorted = displayValues.slice().sort((a, b) => a - b);
const pct = (p) => displaySorted[Math.min(displaySorted.length - 1, Math.floor(p * displaySorted.length))];

// 乱答识别：乱点组被判为非「稳定」的比例；误伤：认真组被判为「随性」的比例
function levelCount(groupKey, level) { return credibilityByGroup[groupKey][level] || 0; }
function groupTotal(groupKey) {
  return Object.keys(credibilityByGroup[groupKey]).reduce((s, k) => s + credibilityByGroup[groupKey][k], 0);
}
const carelessTotal = groupTotal('careless');
const carefulTotal = groupTotal('careful');
const carelessFlagged = (levelCount('careless', 'low') + levelCount('careless', 'mid')) / (carelessTotal || 1);
const carefulFlagged = levelCount('careful', 'low') / (carefulTotal || 1);

// 选项诱导：任一题的某个选项被选率过高，说明这题存在「标准答案」
const optionSpread = Object.keys(optionCounts).map((qid) => {
  const counts = optionCounts[qid];
  const sum = counts.reduce((a, b) => a + b, 0) || 1;
  const shares = counts.map((c) => c / sum);
  return { id: qid, maxShare: Math.max.apply(null, shares), shares: shares.map((s) => +s.toFixed(3)) };
}).sort((a, b) => b.maxShare - a.maxShare);

// ---------------- 判据 ----------------
function verdict(key, label, value, threshold, pass, unit, note) {
  return { key, label, value, threshold, pass, unit: unit || '', note };
}

const verdicts = [
  verdict('coverage', '人物覆盖率', +(coverage * 100).toFixed(1), 70, coverage >= 0.70, '%',
    '36 位人物中有多少位至少被匹配到过一次。过低说明大量人物坐标过于边缘，形同虚设。'),
  verdict('maxShare', '最热人物占比', +(maxShare * 100).toFixed(1), 12, maxShare <= 0.12, '%',
    '单个人物占据 Top1 的最大比例。均匀分布的基准是 ' + (evenShare * 100).toFixed(1) + '%，显著高于它说明存在「总是同一个人」。'),
  verdict('hhi', '结果集中度 HHI', +hhi.toFixed(4), 0.06, hhi <= 0.06, '',
    '各人物占比的平方和，衡量结果是否过度集中。均匀分布为 ' + (1 / figures.length).toFixed(4) + '，越大越集中。'),
  verdict('retest', '重测信度', +((retestSame / RETEST) * 100).toFixed(1), 70, retestSame / RETEST >= 0.70, '%',
    '同一人格在两次独立作答中得到同一位人物的比例。这是「结果是否稳定可复现」的核心证据。'),
  verdict('retestTop3', '重测 Top3 命中', +((retestTop3 / RETEST) * 100).toFixed(1), 90, retestTop3 / RETEST >= 0.90, '%',
    '第二次作答的结果仍落在第一次前三名之内的比例。比 Top1 一致率更宽容，衡量结果的稳定区间。'),
  verdict('dimSd', '最弱维度区分度', +Math.min.apply(null, dimStats.map((d) => d.sd)).toFixed(1), 12,
    Math.min.apply(null, dimStats.map((d) => d.sd)) >= 12, '',
    '六维中标准差最小的一维。标准差越大说明该维度越能把人区分开，过小则这一维形同虚设。'),
  verdict('carelessDetect', '乱答识别率', +(carelessFlagged * 100).toFixed(1), 60, carelessFlagged >= 0.60, '%',
    '随机乱点的用户中，被一致性检测判为「摇摆」或「随性」的比例。'),
  verdict('falseFlag', '认真用户误伤率', +(carefulFlagged * 100).toFixed(1), 10, carefulFlagged <= 0.10, '%',
    '认真作答的用户中，被误判为「随性」的比例。过高说明反向题设计有问题。'),
  verdict('optionBias', '最强选项倾向', +(optionSpread[0].maxShare * 100).toFixed(1), 60,
    optionSpread[0].maxShare <= 0.60, '%',
    '所有题目中最受青睐的那个选项的选择率。过高说明该选项看起来像「正确答案」，会扭曲结果。'),
  verdict('displayRange', '匹配度落在 70–95', +((displayValues.filter((v) => v >= 70 && v <= 95).length / total) * 100).toFixed(1),
    80, displayValues.filter((v) => v >= 70 && v <= 95).length / total >= 0.80, '%',
    '展示匹配度落在舒适区间的比例。过低会让用户看到「37% 匹配」这类挫败数字。')
];

const passed = verdicts.filter((v) => v.pass).length;
const overall = passed === verdicts.length ? 'pass' : (passed >= verdicts.length - 2 ? 'warn' : 'fail');

const data = {
  meta: {
    generatedAt: new Date().toISOString().slice(0, 10),
    sampleSize: N,
    retestPairs: RETEST,
    seed: SEED,
    figureCount: figures.length,
    questionCount: bank.list.length,
    extraCount: extra.length
  },
  overall: overall,
  passedCount: passed,
  totalChecks: verdicts.length,
  verdicts: verdicts,
  distribution: {
    items: distItems,
    hhi: +hhi.toFixed(4),
    coverage: +coverage.toFixed(3),
    maxShare: +maxShare.toFixed(4),
    evenShare: +(1 / figures.length).toFixed(4),
    byGroup: GROUPS.map((g) => ({
      key: g.key, name: g.name, desc: g.desc,
      items: figures.map((f) => ({
        id: f.id, name: f.name,
        share: (tallyByGroup[g.key][f.id] || 0) / (groupTotal(g.key) || 1)
      })).sort((a, b) => b.share - a.share).slice(0, 8)
    }))
  },
  dims: dimStats,
  display: {
    histogram: hist(displayValues, 12, 40, 100),
    min: displaySorted[0],
    max: displaySorted[displaySorted.length - 1],
    p10: pct(0.10), p50: pct(0.50), p90: pct(0.90),
    mean: +mean(displayValues).toFixed(1)
  },
  credibility: GROUPS.map((g) => ({
    key: g.key, name: g.name,
    total: groupTotal(g.key),
    levels: ['high', 'mid', 'low'].map((lv) => ({
      level: lv,
      label: { high: '自洽', mid: '摇摆', low: '随性' }[lv],
      share: levelCount(g.key, lv) / (groupTotal(g.key) || 1)
    }))
  })),
  retest: {
    pairs: RETEST,
    sameTop1: retestSame,
    sameTop1Rate: retestSame / RETEST,
    sameTop3: retestTop3,
    sameTop3Rate: retestTop3 / RETEST
  },
  optionSpread: optionSpread.slice(0, 6),
  rates: {
    tieBreak: tieBreaks / N,
    specialEnding: specialEndings / N
  }
};

const out = '/* 由 node tools/analyze.js 自动生成，请勿手改 */\n'
  + 'window.ANALYSIS_DATA = ' + JSON.stringify(data, null, 1) + ';\n';
fs.writeFileSync(path.join(root, 'assets/js/data/analysis.js'), out, 'utf8');

// ---------------- 命令行摘要 ----------------
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - String(s).length));
console.log('样本 ' + N + ' 份 · 重测 ' + RETEST + ' 对 · 种子 ' + SEED);
console.log('\n体检结论 (' + passed + '/' + verdicts.length + ' 项通过):');
verdicts.forEach((v) => {
  console.log('  ' + (v.pass ? '通过  ' : '未过  ')
    + pad(v.label, 16) + pad(v.value + v.unit, 10) + '阈值 ' + v.threshold + v.unit);
});
console.log('\nTop1 分布（前 10 / 共 ' + distItems.filter((x) => x.count > 0).length + ' 人被命中）:');
distItems.slice(0, 10).forEach((x) => {
  const bar = '█'.repeat(Math.round(x.share * 120));
  console.log('  ' + pad(x.name, 6) + pad((x.share * 100).toFixed(1) + '%', 8) + bar);
});
const adjSorted = adjustedValues.slice().sort((a, b) => a - b);
const ap = (p) => adjSorted[Math.min(adjSorted.length - 1, Math.floor(p * adjSorted.length))].toFixed(1);
console.log('\n原始分 adjusted: min ' + adjSorted[0].toFixed(1)
  + ' / p10 ' + ap(0.10) + ' / p50 ' + ap(0.50) + ' / p90 ' + ap(0.90)
  + ' / max ' + adjSorted[adjSorted.length - 1].toFixed(1));
console.log('展示匹配度 display: min ' + displaySorted[0]
  + ' / p10 ' + pct(0.10) + ' / p50 ' + pct(0.50) + ' / p90 ' + pct(0.90)
  + ' / max ' + displaySorted[displaySorted.length - 1]);
// 经验标定建议：理论极值远宽于真实作答范围，会把坐标压扁到中段，
// 导致「谁都差不多像」。改用实测分位数可让坐标真正舒展。
function quantile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))];
}
console.log('\n标定建议（经验分位数 vs 理论极值）:');
M.DIMS.forEach((d) => {
  const s = rawSamples[d].slice().sort((a, b) => a - b);
  console.log('  ' + pad(d, 4)
    + ' p1=' + pad(quantile(s, 0.01).toFixed(1), 8)
    + ' p5=' + pad(quantile(s, 0.05).toFixed(1), 8)
    + ' p95=' + pad(quantile(s, 0.95).toFixed(1), 8)
    + ' p99=' + pad(quantile(s, 0.99).toFixed(1), 8)
    + ' 理论极值=' + boundsFull[d].min.toFixed(1) + '~' + boundsFull[d].max.toFixed(1));
});

console.log('\n各维度区分度:');
dimStats.forEach((d) => console.log('  ' + pad(d.name, 6) + '均值 ' + pad(d.mean, 6) + '标准差 ' + d.sd));
console.log('\n产出: assets/js/data/analysis.js');
