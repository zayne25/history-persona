/**
 * 画像预览（调试工具）：在 Node 里模拟 Canvas，把线描降采样成 ASCII 轮廓
 *
 *   用法：node tools/preview-portrait.js [人物id ...]
 *   例：  node tools/preview-portrait.js kongzi zhugeliang curie
 *
 * 为什么需要它：画像是纯绘制代码，不看渲染结果无法判断构图是否合理。
 * 这里不引第三方图形库，只把 stroke 路径光栅化后降采样成字符画，
 * 足以检查「头身比例、冠巾位置、器物落点、有没有画出界」。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const W = 260, H = 260;

// ---------------- 极简 Canvas 模拟 ----------------
function mat(a, b, c, d, e, f) { return { a, b, c, d, e, f }; }
function mul(m, n) {
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f
  };
}

function createCtx(px, w, h) {
  let tf = mat(1, 0, 0, 1, 0, 0);
  const stack = [];
  let subs = [];          // 当前路径：子路径数组
  let cur = null;
  let alpha = 1;

  const T = (x, y) => [tf.a * x + tf.c * y + tf.e, tf.b * x + tf.d * y + tf.f];

  function push(pt) { if (!cur) { cur = [pt]; subs.push(cur); } else cur.push(pt); }

  function dot(x, y) {
    const ix = Math.round(x), iy = Math.round(y);
    if (ix >= 0 && ix < w && iy >= 0 && iy < h) px[iy * w + ix] = alpha < 0.6 ? 2 : 1;
  }

  function seg(x0, y0, x1, y1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    }
  }

  function strokeSub(points, closed) {
    for (let i = 1; i < points.length; i++) seg(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    if (closed && points.length > 2) {
      const a = points[points.length - 1], b = points[0];
      seg(a[0], a[1], b[0], b[1]);
    }
  }

  function arcPts(cx, cy, rx, ry, rot, a0, a1, ccw) {
    let da = a1 - a0;
    if (ccw) { while (da < 0) da += Math.PI * 2; } else { while (da > 0) da -= Math.PI * 2; }
    const n = Math.max(6, Math.ceil(Math.abs(da) / (Math.PI / 16)));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + da * (i / n);
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return out;
  }

  const ctx = {
    lineWidth: 1, strokeStyle: '#000', fillStyle: '#000',
    lineCap: 'butt', lineJoin: 'miter', font: '',
    textAlign: 'left', textBaseline: 'top',
    get globalAlpha() { return alpha; },
    set globalAlpha(v) { alpha = v; },

    setTransform(a, b, c, d, e, f) { tf = mat(a, b, c, d, e, f); },
    // 真实 canvas 的 save/restore 会一并保存 globalAlpha，这里必须照做，
    // 否则背景圆环的透明度会泄漏到后续所有笔画，预览就失真了
    save() { stack.push({ tf: Object.assign({}, tf), alpha: alpha }); },
    restore() {
      const s = stack.pop();
      if (s) { tf = s.tf; alpha = s.alpha; }
    },
    translate(x, y) { tf = mul(tf, mat(1, 0, 0, 1, x, y)); },
    rotate(r) { tf = mul(tf, mat(Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0)); },
    clearRect() { },
    fillRect() { },          // 纸底与印章的填充不影响轮廓
    fillText() { },          // 文字不参与轮廓预览

    beginPath() { subs = []; cur = null; },
    moveTo(x, y) { cur = [T(x, y)]; subs.push(cur); },
    lineTo(x, y) { if (!cur) { cur = []; subs.push(cur); } cur.push(T(x, y)); },
    closePath() { if (cur && cur.length) cur.closed = true; },

    arc(cx, cy, r, a0, a1, ccw) {
      const pts = arcPts(cx, cy, r, r, 0, a0, a1, !!ccw).map((p) => T(p[0], p[1]));
      subs.push(pts);
    },
    ellipse(cx, cy, rx, ry, rot, a0, a1, ccw) {
      const pts = arcPts(cx, cy, rx, ry, rot || 0, a0, a1, !!ccw).map((p) => T(p[0], p[1]));
      subs.push(pts);
    },
    quadraticCurveTo(cpx, cpy, x, y) {
      if (!cur || !cur.length) { cur = []; subs.push(cur); }
      const p0 = cur[cur.length - 1];
      const p1 = T(cpx, cpy), p2 = T(x, y);
      for (let i = 1; i <= 14; i++) {
        const t = i / 14, u = 1 - t;
        cur.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                  u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
      }
    },
    rect(x, y, ww, hh) {
      const a = T(x, y), b = T(x + ww, y), c = T(x + ww, y + hh), d = T(x, y + hh);
      subs.push([a, b, c, d]);
      subs[subs.length - 1].closed = true;
    },
    fill() { },
    stroke() { subs.forEach((s) => strokeSub(s, s.closed)); },
    measureText() { return { width: 10 }; }
  };
  return ctx;
}

// ---------------- 装载数据 ----------------
const sandbox = { window: {}, console, navigator: {} };
sandbox.devicePixelRatio = 1;
vm.createContext(sandbox);
['assets/js/data/figures-cn.js', 'assets/js/data/figures-world.js',
 'assets/js/data/portraits.js', 'assets/js/core/portrait.js']
  .forEach((rel) => vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel }));

const PORTRAITS = sandbox.window.FIGURE_PORTRAITS;
const figures = sandbox.window.FIGURE_PACKS.flatMap((p) => p.figures);
figures.forEach((f) => { f.portrait = PORTRAITS[f.id] || {}; });

// ---------------- ASCII 输出 ----------------
const COLS = 62, ROWS = 31;
function render(figure) {
  const px = new Uint8Array(W * H);
  const canvas = { width: 0, height: 0, style: {}, getContext: () => createCtx(px, W, H) };
  sandbox.window.Portrait.draw(canvas, figure, { size: W });

  let out = '';
  for (let r = 0; r < ROWS; r++) {
    let line = '';
    for (let c = 0; c < COLS; c++) {
      const x0 = Math.floor((c / COLS) * W), x1 = Math.floor(((c + 1) / COLS) * W);
      const y0 = Math.floor((r / ROWS) * H), y1 = Math.floor(((r + 1) / ROWS) * H);
      let solid = 0, faint = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const v = px[y * W + x];
          if (v === 1) solid++; else if (v === 2) faint++;
        }
      }
      line += solid > 0 ? '#' : (faint > 1 ? '.' : ' ');
    }
    out += line.replace(/\s+$/, '') + '\n';
  }
  return out;
}

// --check：遍历全部人物，逐个绘制并捕获异常。
// 某个器物的绘制函数一旦写错，页面会直接白屏，所以每次改画像后都应跑一遍。
if (process.argv.indexOf('--check') >= 0) {
  let bad = 0;
  figures.forEach((f) => {
    const px = new Uint8Array(W * H);
    const canvas = { width: 0, height: 0, style: {}, getContext: () => createCtx(px, W, H) };
    try {
      sandbox.window.Portrait.draw(canvas, f, { size: W });
    } catch (e) {
      bad++;
      console.log('  绘制失败 ' + f.id + '：' + e.message);
    }
  });
  console.log(bad ? '画像自检：' + bad + ' 位人物绘制失败' : '画像自检：全部 ' + figures.length + ' 位绘制正常');
  process.exit(bad ? 1 : 0);
}

const ids = process.argv.slice(2);
const picked = ids.length
  ? ids.map((id) => figures.filter((f) => f.id === id)[0]).filter(Boolean)
  : figures.slice(0, 4);

if (!picked.length) {
  console.log('未找到指定人物。可用 id：' + figures.map((f) => f.id).join(', '));
  process.exit(1);
}

picked.forEach((f) => {
  const p = f.portrait;
  console.log('\n' + '═'.repeat(62));
  console.log(f.name + '  ' + f.era + '   [' + p.robe + '/' + p.head + '/' + p.prop
    + '/' + (p.beard ? '须' : '无须') + '/' + p.pose + ']');
  console.log('═'.repeat(62));
  console.log(render(f));
});
