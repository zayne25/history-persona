/**
 * 数据自检脚本（Node 环境运行，不参与页面运行）
 * 用法：node tools/validate-data.js
 * 校验项：Schema 完整性、id 唯一、对立面引用有效、维度覆盖、题项赋分合法。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = { window: {} };
vm.createContext(sandbox);

['assets/js/data/figures-cn.js', 'assets/js/data/figures-world.js', 'assets/js/data/questions.js'].forEach((rel) => {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
});

const packs = sandbox.window.FIGURE_PACKS || [];
const bank = sandbox.window.QUESTIONS;

const errors = [];
const warns = [];
const DIMS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];
const MOTIFS = ['mountain', 'water', 'cloud', 'moon', 'star', 'sword', 'flame', 'seed', 'brush', 'ship', 'mirror', 'butterfly', 'spark'];

// ---------- 人物库 ----------
const figures = packs.flatMap((p) => p.figures.map((f) => Object.assign({ _pack: p.id }, f)));
const idCount = new Map();
figures.forEach((f) => idCount.set(f.id, (idCount.get(f.id) || 0) + 1));
idCount.forEach((n, id) => { if (n > 1) errors.push(`人物 id 重复: ${id} (${n} 次)`); });

figures.forEach((f) => {
  const tag = `人物[${f.id}]`;
  ['name', 'lifespan', 'era', 'region', 'tagline', 'quote', 'summary', 'deep', 'glyph', 'motif'].forEach((k) => {
    if (!f[k]) errors.push(`${tag} 缺少字段 ${k}`);
  });
  if (!Array.isArray(f.fields) || !f.fields.length) errors.push(`${tag} fields 无效`);
  if (!['male', 'female'].includes(f.gender)) errors.push(`${tag} gender 无效: ${f.gender}`);
  if (!MOTIFS.includes(f.motif)) errors.push(`${tag} motif 未实现绘制: ${f.motif}`);
  DIMS.forEach((d) => {
    const v = f.vector && f.vector[d];
    if (typeof v !== 'number' || v < 0 || v > 100) errors.push(`${tag} vector.${d} 非法: ${v}`);
  });
  DIMS.forEach((d) => { if (!f.evidence || !f.evidence[d]) warns.push(`${tag} 缺 D 依据 ${d}`); });
  if (!Array.isArray(f.milestones) || f.milestones.length < 3) errors.push(`${tag} milestones 少于 3 条`);
  if (!Array.isArray(f.whatIf) || f.whatIf.length < 3) errors.push(`${tag} whatIf 少于 3 条`);
  if (!figures.some((x) => x.id === f.counterpart)) errors.push(`${tag} counterpart 引用不存在: ${f.counterpart}`);
  if (f.id === f.counterpart) errors.push(`${tag} counterpart 指向自身`);
});

// 均衡性巡检
const total = figures.length;
const female = figures.filter((f) => f.gender === 'female').length;
if (female / total < 0.25) warns.push(`女性占比 ${(female / total * 100).toFixed(0)}% < 25%`);
const fieldCount = {};
figures.forEach((f) => f.fields.forEach((x) => { fieldCount[x] = (fieldCount[x] || 0) + 1; }));
const politics = (fieldCount.politics || 0) + (fieldCount.military || 0);
if (politics / total > 0.6) warns.push(`政军占比 ${(politics / total * 100).toFixed(0)}% > 60%`);

// ---------- 题库 ----------
if (!bank || !Array.isArray(bank.list)) {
  errors.push('题库缺失或格式错误');
} else {
  const qIds = new Set();
  bank.list.forEach((q) => {
    const tag = `题目[${q.id}]`;
    if (qIds.has(q.id)) errors.push(`题目 id 重复: ${q.id}`);
    qIds.add(q.id);
    if (!q.stem) errors.push(`${tag} 缺少 stem`);
    if (!['sjt', 'rank', 'slider', 'flip', 'fun'].includes(q.type)) errors.push(`${tag} type 未知: ${q.type}`);
    if (!['ice', 'core', 'final'].includes(q.act)) errors.push(`${tag} act 无效: ${q.act}`);
    if (q.type === 'sjt' || q.type === 'flip' || q.type === 'fun') {
      if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${tag} 需 4 个选项`);
      (q.options || []).forEach((o, i) => {
        if (!o.t) errors.push(`${tag} 选项${i} 缺文案`);
        if (q.type === 'fun') {
          if (!Array.isArray(o.tags) || !o.tags.length) warns.push(`${tag} 选项${i} 缺 tags`);
          return;
        }
        const keys = Object.keys(o.d || {});
        if (!keys.length) errors.push(`${tag} 选项${i} 无维度赋分`);
        keys.forEach((d) => { if (!DIMS.includes(d)) errors.push(`${tag} 选项${i} 维度非法 ${d}`); });
      });
    }
    if (q.type === 'rank') {
      if (!Array.isArray(q.items) || q.items.length !== 4) errors.push(`${tag} 排序题需 4 项`);
      (q.items || []).forEach((it, i) => {
        if (!it.t) errors.push(`${tag} 排序项${i} 缺文案`);
        if (!it.d || !Object.keys(it.d).length) errors.push(`${tag} 排序项${i} 无赋分`);
      });
    }
    if (q.type === 'slider') {
      if (!DIMS.includes(q.dim)) errors.push(`${tag} slider 维度非法: ${q.dim}`);
    }
    if (q.type === 'flip') {
      if (!figures || !q.pair) errors.push(`${tag} 反向题缺少 pair`);
      else if (!bank.list.some((x) => x.id === q.pair)) errors.push(`${tag} pair 引用不存在: ${q.pair}`);
    }
  });

  // 幕次配比检查
  const actCount = {};
  bank.list.forEach((q) => { actCount[q.act] = (actCount[q.act] || 0) + 1; });
  ['ice', 'core', 'final'].forEach((a) => {
    if (!actCount[a]) errors.push(`题库缺少幕次 ${a}`);
  });
  console.log('幕次分布:', JSON.stringify(actCount));

  // 维度覆盖检查
  const cover = {};
  DIMS.forEach((d) => { cover[d] = 0; });
  bank.list.forEach((q) => {
    const deltas = [].concat(q.options || [], q.items || []);
    if (q.type === 'slider') cover[q.dim] += 1;
    deltas.forEach((o) => { Object.keys(o.d || {}).forEach((d) => { cover[d] += 1; }); });
  });
  DIMS.forEach((d) => { if (cover[d] < 6) warns.push(`维度 ${d} 仅被 ${cover[d]} 次赋分，建议 >= 6`); });
}

// ---------- 输出 ----------
console.log('人物包:', packs.map((p) => `${p.id}(${p.figures.length}人)`).join(' + '));
console.log('人物总数:', total, '| 女性:', female);
console.log('题库题数:', bank ? bank.list.length : 0);
console.log('领域分布:', JSON.stringify(fieldCount));
console.log('');
if (warns.length) { console.log('[警告 ' + warns.length + ']'); warns.forEach((w) => console.log('  - ' + w)); }
if (errors.length) { console.log('[错误 ' + errors.length + ']'); errors.forEach((e) => console.log('  - ' + e)); process.exit(1); }
console.log('数据校验通过');
