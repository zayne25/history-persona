/**
 * 冒烟测试
 * 用法：node tools/smoke.js
 *
 * 两组模拟：
 *   A 随机作答（乱点）    —— 预期向中心聚集，只作观测，不作为通过条件
 *   B 一致性人格作答      —— 模拟真实用户，这才是结果分布是否健康的判据
 * 同时校验：令牌往返、篡改拦截、坐标与展示值范围。
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
const S = sandbox.window.Store;
const figures = sandbox.window.FIGURE_PACKS.flatMap((p) => p.figures);
const bank = sandbox.window.QUESTIONS;
const bounds = M.computeBounds(bank);
const extra = bank.extra || [];

/** 选项与目标人格的一致性得分 */
function alignment(delta, profile) {
  return M.DIMS.reduce((sum, d) => sum + ((profile[d] - 50) / 50) * (delta[d] || 0), 0);
}

function flipOrSjtAnswer(q, profile) {
  let best = 0, bestScore = -Infinity;
  q.options.forEach((o, i) => {
    const s = alignment(o.d || {}, profile);
    if (s > bestScore) { bestScore = s; best = i; }
  });
  return best;
}

/** @param {boolean=} skipExtra 只答主题库（用于模拟进入决胜前的状态） */
function personaAnswers(profile, skipExtra) {
  const answers = {};
  (skipExtra ? bank.list : bank.list.concat(extra)).forEach((q) => {
    if (q.type === 'slider') {
      answers[q.id] = Math.max(-10, Math.min(10, Math.round((profile[q.dim] - 50) / 5)));
    } else if (q.type === 'rank') {
      answers[q.id] = q.items
        .map((it, i) => ({ i, s: alignment(it.d, profile) }))
        .sort((a, b) => b.s - a.s)
        .map((x) => x.i);
    } else {
      answers[q.id] = flipOrSjtAnswer(q, profile);
    }
  });
  return answers;
}

function randomAnswers() {
  const answers = {};
  bank.list.forEach((q) => {
    if (q.type === 'slider') answers[q.id] = Math.floor(Math.random() * 21) - 10;
    else if (q.type === 'rank') {
      const idx = q.items.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
    }
      answers[q.id] = idx;
    } else answers[q.id] = Math.floor(Math.random() * q.options.length);
  });
  return answers;
}

function run(label, answers) {
  const r = M.evaluate(bank, figures, answers, bounds);
  return r;
}

// ---------------- A 随机作答 ----------------
const tallyRandom = {};
for (let i = 0; i < 300; i++) {
  const r = run('random', randomAnswers());
  tallyRandom[r.top.figure.id] = (tallyRandom[r.top.figure.id] || 0) + 1;
}
const topRandom = Object.entries(tallyRandom).sort((a, b) => b[1] - a[1]);
console.log('A 随机作答 · Top1 分布（前 8）:');
topRandom.slice(0, 8).forEach(([id, c]) => console.log('  ' + id.padEnd(12) + (c / 3).toFixed(1) + '%'));
console.log('  命中人物种类:', topRandom.length, '/', figures.length);

// ---------------- B 一致性人格 ----------------
const tallyPersona = {};
let integrityIssues = 0;
for (let i = 0; i < 300; i++) {
  const profile = {};
  M.DIMS.forEach((d) => { profile[d] = Math.round(Math.random() * 80 + 10); });
  const r = run('persona', personaAnswers(profile));

  M.DIMS.forEach((d) => {
    const v = r.coords[d];
    if (!(v >= 0 && v <= 100)) integrityIssues += 1;
  });
  if (r.top.display < 40 || r.top.display > 99) integrityIssues += 1;

  tallyPersona[r.top.figure.id] = (tallyPersona[r.top.figure.id] || 0) + 1;
}
const topPersona = Object.entries(tallyPersona).sort((a, b) => b[1] - a[1]);
console.log('\nB 一致性人格作答 · Top1 分布（前 8）:');
topPersona.slice(0, 8).forEach(([id, c]) => console.log('  ' + id.padEnd(12) + (c / 3).toFixed(1) + '%'));
console.log('  命中人物种类:', topPersona.length, '/', figures.length);
console.log('  最高占比:', (topPersona[0][1] / 3).toFixed(1) + '%');

// ---------------- C 决胜题路径 ----------------
const combined = { list: bank.list.concat(extra), config: bank.config };
const boundsFull = M.computeBounds(combined);
console.log('\n决胜题库题数:', extra.length);
console.log('  主题库 D1 极值', bounds.D1.min.toFixed(1), '~', bounds.D1.max.toFixed(1));
console.log('  合并后 D1 极值', boundsFull.D1.min.toFixed(1), '~', boundsFull.D1.max.toFixed(1));

// 决胜题必须是主题库之外的新题，否则等于把答过的题再问一遍
const mainIds = new Set(bank.list.map((q) => q.id));
const dup = extra.filter((q) => mainIds.has(q.id)).map((q) => q.id);
if (dup.length) { ok = false; console.error('  决胜题与主题库重复:', dup.join(',')); }
else if (!extra.length) { console.log('  （无决胜题，平局将直接并列展示）'); }
else { console.log('  决胜题独立性: OK'); }

let tieResolved = 0;
for (let n = 0; n < 200; n++) {
  const profile = {};
  M.DIMS.forEach((d) => { profile[d] = Math.round(Math.random() * 80 + 10); });
  const answers = personaAnswers(profile, true);
  extra.forEach((q) => {
    if (q.type === 'slider') {
      answers[q.id] = Math.max(-10, Math.min(10, Math.round((profile[q.dim] - 50) / 5)));
    } else {
      answers[q.id] = flipOrSjtAnswer(q, profile);
    }
  });
  const r = M.evaluate(combined, figures, answers, boundsFull);
  if (r.top && r.top.display >= 40 && r.top.display <= 99) tieResolved += 1;
}
console.log('  决胜路径可用结果:', tieResolved, '/ 200');

// ---------------- 令牌 ----------------
let tokenOk = true;
const sample = run('persona', personaAnswers({ D1: 70, D2: 40, D3: 60, D4: 30, D5: 80, D6: 55 }));
const token = S.encodeResult(sample, []);
const back = S.decodeResult(token);
if (!back || back.t !== sample.top.figure.id) { tokenOk = false; console.error('  令牌往返失败'); }
if (S.decodeResult(token + 'x')) { tokenOk = false; console.error('  篡改未拦截'); }
if (S.decodeResult('notatoken')) { tokenOk = false; console.error('  非法输入未拦截'); }
console.log('\n令牌校验:', tokenOk ? 'OK' : 'FAIL');

const ok = integrityIssues === 0 && tokenOk;
console.log(ok ? '\n冒烟测试通过' : '\n冒烟测试失败');
process.exit(ok ? 0 : 1);
