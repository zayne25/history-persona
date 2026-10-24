/**
 * 轻量统计图表（Canvas）
 * 只做分析报告需要的三种图：横向条形、直方图、堆叠对比条。
 * 刻意不引第三方库——这个项目是零依赖的，且这三种图足够把结论讲清楚。
 */
(function (global) {
  'use strict';

  var C = {
    ink: '#1C1A17', faint: '#8A8172', line: '#D9D2C4',
    red: '#C4442F', blue: '#2E5668', gold: '#C39A3B', green: '#4A7A5A'
  };

  function ctxOf(canvas, w, h) {
    var dpr = global.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = 'middle';
    ctx.font = '12px "Noto Sans SC", "Microsoft YaHei", sans-serif';
    return ctx;
  }

  function text(ctx, s, x, y, color, align, font) {
    ctx.fillStyle = color || C.faint;
    ctx.textAlign = align || 'left';
    if (font) ctx.font = font;
    ctx.fillText(s, x, y);
    ctx.font = '12px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  }

  /**
   * 横向条形图 —— 适合看排名与占比，36 人也不会挤
   * @param {object} opts {items:[{label,value,color}], max, threshold, thresholdLabel, format, padL, width}
   */
  function hbar(canvas, opts) {
    var items = opts.items || [];
    var padL = opts.padL || 64, padR = opts.padR || 52, padT = 16, padB = 14;
    var rowH = opts.rowH || 19;
    var w = opts.width || 720;
    var h = padT + items.length * rowH + padB;
    var ctx = ctxOf(canvas, w, h);
    var vals = items.map(function (i) { return i.value; });
    var max = opts.max || Math.max.apply(null, vals.concat([1]));
    var plotW = w - padL - padR;

    // 阈值参考线（先画，让条形压在上面）
    if (opts.threshold !== undefined && opts.threshold <= max) {
      var tx = padL + (opts.threshold / max) * plotW;
      ctx.save();
      ctx.strokeStyle = C.red;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, padT - 6);
      ctx.lineTo(tx, h - padB + 4);
      ctx.stroke();
      ctx.restore();
      text(ctx, opts.thresholdLabel || ('阈值 ' + opts.threshold), tx + 5, padT - 2, C.red);
    }

    items.forEach(function (it, i) {
      var y = padT + i * rowH;
      text(ctx, it.label, padL - 8, y + rowH / 2, C.ink, 'right');
      var bw = Math.max(0, it.value / max) * plotW;
      ctx.fillStyle = it.color || C.blue;
      ctx.fillRect(padL, y + 3.5, bw, rowH - 7);
      var s = opts.format ? opts.format(it.value) : String(it.value);
      text(ctx, s, padL + bw + 6, y + rowH / 2, C.ink);
    });

    ctx.strokeStyle = C.line;
    ctx.beginPath();
    ctx.moveTo(padL, padT - 6);
    ctx.lineTo(padL, h - padB + 4);
    ctx.stroke();
  }

  /**
   * 直方图 —— 看分布形态，可高亮「舒适区间」
   * @param {object} opts {bins, min, max, band:[lo,hi], bandLabel, xLabel, height}
   */
  function histogram(canvas, opts) {
    var bins = opts.bins || [];
    var w = opts.width || 720, h = opts.height || 190;
    var padL = 34, padR = 14, padT = 18, padB = 34;
    var ctx = ctxOf(canvas, w, h);
    var max = opts.yMax || Math.max.apply(null, bins.concat([1]));
    var plotW = w - padL - padR, plotH = h - padT - padB;
    var bw = plotW / bins.length;

    if (opts.band) {
      var x0 = padL + (opts.band[0] - opts.min) / (opts.max - opts.min) * plotW;
      var x1 = padL + (opts.band[1] - opts.min) / (opts.max - opts.min) * plotW;
      ctx.fillStyle = 'rgba(74,122,90,0.10)';
      ctx.fillRect(x0, padT, x1 - x0, plotH);
      if (opts.bandLabel) text(ctx, opts.bandLabel, (x0 + x1) / 2, padT + 8, C.green, 'center');
    }

    bins.forEach(function (n, i) {
      var bh = (n / max) * plotH;
      var x = padL + i * bw;
      ctx.fillStyle = C.blue;
      ctx.fillRect(x + 1, padT + plotH - bh, Math.max(1, bw - 2), bh);
    });

    ctx.strokeStyle = C.line;
    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    for (var k = 0; k <= 4; k++) {
      var v = opts.min + (opts.max - opts.min) * (k / 4);
      text(ctx, String(Math.round(v)), padL + plotW * (k / 4), h - padB + 14, C.faint, 'center');
    }
    if (opts.xLabel) text(ctx, opts.xLabel, padL + plotW / 2, h - 8, C.faint, 'center');
  }

  /**
   * 堆叠对比条 —— 看构成比例，适合「三类人群 × 三种可信度」
   * @param {object} opts {groups:[{label, parts:[{value,color}]}], legend:[{label,color}]}
   */
  function stacked(canvas, opts) {
    var groups = opts.groups || [];
    var w = opts.width || 720, h = opts.height || 150;
    var padL = 64, padR = 14, padT = 14, padB = 40;
    var ctx = ctxOf(canvas, w, h);
    var plotW = w - padL - padR;
    var rowH = (h - padT - padB) / groups.length;

    groups.forEach(function (g, i) {
      var y = padT + i * rowH + rowH * 0.22;
      var bh = rowH * 0.56;
      text(ctx, g.label, padL - 8, y + bh / 2, C.ink, 'right');
      var x = padL;
      var total = g.parts.reduce(function (s, p) { return s + p.value; }, 0) || 1;
      g.parts.forEach(function (p) {
        var seg = (p.value / total) * plotW;
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y, seg, bh);
        if (seg > 38) text(ctx, Math.round((p.value / total) * 100) + '%', x + seg / 2, y + bh / 2, '#FFFFFF', 'center');
        x += seg;
      });
    });

    var lx = padL;
    (opts.legend || []).forEach(function (l) {
      ctx.fillStyle = l.color;
      ctx.fillRect(lx, h - padB + 16, 10, 10);
      text(ctx, l.label, lx + 15, h - padB + 21, C.faint);
      lx += 16 + ctx.measureText(l.label).width + 18;
    });
  }

  global.Charts = { hbar: hbar, histogram: histogram, stacked: stacked, COLORS: C };
})(typeof window !== 'undefined' ? window : globalThis);
