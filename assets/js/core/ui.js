/**
 * 视觉渲染层（Canvas）
 * - 印章头像：几何化版画风，按人物 id 播种生成，零外部素材
 * - 雷达图：用户坐标 vs 人物坐标叠加
 * - 分享卡：竖版 3:4 长图
 *
 * 统一画风是刻意选择：36 位人物共用一套母题与配色，才有「同一套产品」的质感。
 */
(function (global) {
  'use strict';

  var INK = '#1C1A17';
  var PAPER = '#F3ECDC';
  var RED = '#C4442F';
  var BLUE = '#2E5668';
  var GOLD = '#C39A3B';

  // ---------------- 工具 ----------------

  /** 由字符串得到稳定整数种子 */
  function seedFrom(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  /** 线性同余伪随机（保证同一人物每次渲染一致） */
  function makeRandom(seed) {
    var s = seed || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function setCanvasSize(canvas, w, h) {
    var dpr = global.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  /** 纸纹：极淡噪点，避免大色块发死 */
  function drawPaper(ctx, w, h, rand, alpha) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    var a = typeof alpha === 'number' ? alpha : 0.05;
    for (var i = 0; i < Math.floor(w * h / 260); i++) {
      var x = rand() * w, y = rand() * h;
      ctx.fillStyle = 'rgba(28,26,23,' + (a * rand()).toFixed(3) + ')';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // ---------------- 母题绘制 ----------------

  var MOTIFS = {
    mountain: function (ctx, r, rand) {
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.45);
      ctx.lineTo(-r * 0.35, -r * 0.35);
      ctx.lineTo(-r * 0.05, r * 0.1);
      ctx.lineTo(r * 0.3, -r * 0.55);
      ctx.lineTo(r * 0.62, r * 0.2);
      ctx.lineTo(r, r * 0.45);
      ctx.stroke();
    },
    water: function (ctx, r, rand) {
      for (var i = 0; i < 4; i++) {
        var y = -r * 0.5 + i * r * 0.35;
        ctx.beginPath();
        ctx.moveTo(-r * 0.85, y);
        ctx.bezierCurveTo(-r * 0.3, y - r * 0.22, r * 0.25, y + r * 0.22, r * 0.85, y);
        ctx.stroke();
      }
    },
    cloud: function (ctx, r, rand) {
      for (var i = 0; i < 3; i++) {
        var rad = r * (0.42 + rand() * 0.2);
        var cx = -r * 0.55 + i * r * 0.5;
        var cy = -r * 0.15 + rand() * r * 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, Math.PI * 0.15, Math.PI * 1.25);
        ctx.stroke();
      }
    },
    moon: function (ctx, r, rand) {
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 0.66, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.3, -r * 0.32, r * 0.58, 0, Math.PI * 2);
      ctx.fillStyle = PAPER;
      ctx.fill();
      ctx.stroke();
    },
    star: function (ctx, r, rand) {
      for (var i = 0; i < 7; i++) {
        var a = rand() * Math.PI * 2, d = rand() * r * 0.85;
        var x = Math.cos(a) * d, y = Math.sin(a) * d, s = 1 + rand() * 2.5;
        ctx.fillStyle = i % 3 === 0 ? BLUE : INK;
        ctx.fillRect(x, y, s, s);
      }
    },
    sword: function (ctx, r, rand) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, r * 0.75);
      ctx.lineTo(r * 0.55, -r * 0.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, r * 0.3);
      ctx.lineTo(r * 0.3, r * 0.05);
      ctx.stroke();
    },
    flame: function (ctx, r, rand) {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.8);
      ctx.bezierCurveTo(-r * 0.7, r * 0.2, -r * 0.25, -r * 0.5, 0, -r * 0.85);
      ctx.bezierCurveTo(r * 0.25, -r * 0.5, r * 0.7, r * 0.2, 0, r * 0.8);
      ctx.stroke();
    },
    seed: function (ctx, r, rand) {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.8);
      ctx.lineTo(0, -r * 0.2);
      ctx.stroke();
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI / 2 + (i - 2) * 0.42;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.2);
        ctx.quadraticCurveTo(Math.cos(a) * r * 0.5, -r * 0.2 + Math.sin(a) * r * 0.5, Math.cos(a) * r * 0.62, -r * 0.2 + Math.sin(a) * r * 0.62);
        ctx.stroke();
      }
    },
    brush: function (ctx, r, rand) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, r * 0.7);
      ctx.quadraticCurveTo(0, -r * 0.1, r * 0.72, -r * 0.78);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.6, r * 0.6, r * 0.16, 0, Math.PI * 2);
      ctx.stroke();
    },
    ship: function (ctx, r, rand) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, r * 0.45);
      ctx.lineTo(r * 0.85, r * 0.45);
      ctx.lineTo(r * 0.5, r * 0.8);
      ctx.lineTo(-r * 0.5, r * 0.8);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, r * 0.45);
      ctx.lineTo(0, -r * 0.8);
      ctx.lineTo(r * 0.6, -r * 0.15);
      ctx.closePath();
      ctx.stroke();
    },
    mirror: function (ctx, r, rand) {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    },
    butterfly: function (ctx, r, rand) {
      for (var s = -1; s <= 1; s += 2) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * r * 0.85, -r * 0.6, s * r * 0.45, r * 0.15);
        ctx.quadraticCurveTo(s * r * 0.5, r * 0.7, 0, 0);
        ctx.stroke();
      }
    },
    spark: function (ctx, r, rand) {
      for (var i = 0; i < 9; i++) {
        var a = (i / 9) * Math.PI * 2, d = r * (0.25 + rand() * 0.6);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1);
        ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
        ctx.stroke();
      }
    }
  };

  /**
   * 绘制印章头像
   * @param {HTMLCanvasElement} canvas
   * @param {object} figure 人物
   * @param {object=} opts {size, accent}
   */
  function drawPortrait(canvas, figure, opts) {
    var o = opts || {};
    var size = o.size || 220;
    var ctx = setCanvasSize(canvas, size, size);
    var rand = makeRandom(seedFrom(figure.id));
    var cx = size / 2, cy = size / 2;

    drawPaper(ctx, size, size, rand, 0.045);

    // 外圈：两道同心圆，模拟印章边界
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.40, 0, Math.PI * 2);
    ctx.stroke();

    // 母题：置于圆环内下部，作为人物的核心符号
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = o.accent === 'blue' ? BLUE : RED;
    ctx.lineWidth = 2.2;
    var fn = MOTIFS[figure.motif] || MOTIFS.star;
    fn(ctx, size * 0.26, rand);
    ctx.restore();

    // 主字：大号衬线，压在母题之上
    ctx.fillStyle = INK;
    ctx.font = '700 ' + Math.round(size * 0.34) + 'px "Noto Serif SC","Source Han Serif SC",serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(figure.glyph, cx, cy - size * 0.02);

    // 朱砂方章：右下角落印
    var s = size * 0.13;
    var x = size - s - size * 0.09;
    var y = size - s - size * 0.09;
    ctx.fillStyle = RED;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x, y, s, s);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAPER;
    ctx.font = '700 ' + Math.round(s * 0.5) + 'px "Noto Serif SC",serif';
    ctx.fillText(figure.era.slice(0, 2), x + s / 2, y + s / 2 + 1);
  }

  /**
   * 绘制雷达图：用户坐标与人物坐标叠加
   * @param {HTMLCanvasElement} canvas
   * @param {object} userCoords {D1..D6}
   * @param {object} figureCoords
   * @param {object=} opts {size}
   */
  function drawRadar(canvas, userCoords, figureCoords, opts) {
    var o = opts || {};
    var size = o.size || 320;
    var ctx = setCanvasSize(canvas, size, size);
    var cx = size / 2, cy = size / 2 + 4;
    var R = size * 0.34;
    var dims = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];
    var labels = ['义利观', '行动力', '人际取向', '思维方式', '情感驱动', '表达形态'];
    var i, a, x, y;

    ctx.clearRect(0, 0, size, size);

    function pt(idx, val) {
      var ang = -Math.PI / 2 + idx * (Math.PI * 2 / dims.length);
      var rr = R * (val / 100);
      return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr];
    }

    // 网格
    ctx.strokeStyle = 'rgba(28,26,23,0.18)';
    ctx.lineWidth = 1;
    for (var ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      for (i = 0; i <= dims.length; i++) {
        var p = pt(i % dims.length, ring * 25);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }
    for (i = 0; i < dims.length; i++) {
      var q = pt(i, 100);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
    }

    // 人物轮廓（虚线，先画在下层）
    ctx.beginPath();
    for (i = 0; i <= dims.length; i++) {
      var fp = pt(i % dims.length, figureCoords[dims[i % dims.length]]);
      if (i === 0) ctx.moveTo(fp[0], fp[1]); else ctx.lineTo(fp[0], fp[1]);
    }
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.setLineDash([]);

    // 用户轮廓（实线 + 半透明填充）
    ctx.beginPath();
    for (i = 0; i <= dims.length; i++) {
      var up = pt(i % dims.length, userCoords[dims[i % dims.length]]);
      if (i === 0) ctx.moveTo(up[0], up[1]); else ctx.lineTo(up[0], up[1]);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(196,68,47,0.16)';
    ctx.fill();
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 顶点与标签
    ctx.fillStyle = RED;
    for (i = 0; i < dims.length; i++) {
      var vp = pt(i, userCoords[dims[i]]);
      ctx.beginPath();
      ctx.arc(vp[0], vp[1], 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = '500 11px system-ui,"Microsoft YaHei",sans-serif';
    ctx.fillStyle = 'rgba(28,26,23,0.72)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < dims.length; i++) {
      a = -Math.PI / 2 + i * (Math.PI * 2 / dims.length);
      x = cx + Math.cos(a) * (R + 20);
      y = cy + Math.sin(a) * (R + 16);
      ctx.fillText(labels[i], x, y);
    }
  }

  /**
   * 生成竖版 3:4 分享卡
   * @returns {string} dataURL
   */
  function makeShareCard(figure, result, tags) {
    var W = 900, H = 1200;
    var canvas = document.createElement('canvas');
    var ctx = setCanvasSize(canvas, W, H);
    var rand = makeRandom(seedFrom(figure.id));

    drawPaper(ctx, W, H, rand, 0.04);

    // 顶部：标题与印章头像
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '500 26px "Noto Serif SC",serif';
    ctx.fillText('你在历史中的名字', 70, 100);

    // 分享卡用画像而非印章：分享出去的图要让人一眼认出是哪位人物
    var pcanvas = document.createElement('canvas');
    if (global.Portrait) global.Portrait.draw(pcanvas, figure, { size: 320 });
    else drawPortrait(pcanvas, figure, { size: 320 });
    ctx.drawImage(pcanvas, W / 2 - 160, 140, 320, 320);

    // 中部：姓名与判词
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.font = '700 84px "Noto Serif SC",serif';
    ctx.fillText(figure.name, W / 2, 560);

    ctx.fillStyle = 'rgba(28,26,23,0.6)';
    ctx.font = '400 24px "Noto Serif SC",serif';
    ctx.fillText(figure.era + ' · ' + figure.fields.map(function (f) { return FIELD_LABELS[f] || f; }).join(' / '), W / 2, 600);

    ctx.fillStyle = RED;
    ctx.font = '500 40px "Noto Serif SC",serif';
    ctx.fillText('「' + figure.tagline + '」', W / 2, 670);

    // 匹配度
    ctx.fillStyle = INK;
    ctx.font = '700 130px "Noto Serif SC",serif';
    ctx.fillText(String(result.top.display), W / 2, 790);
    ctx.font = '400 24px system-ui,sans-serif';
    ctx.fillStyle = 'rgba(28,26,23,0.6)';
    ctx.fillText('% 契合', W / 2, 826);

    // 关键词
    var allTags = (figure.traits || []).slice(0, 3).concat(tags || []).slice(0, 5);
    ctx.font = '400 22px system-ui,sans-serif';
    var totalW = 0, widths = allTags.map(function (t) { var w = ctx.measureText(t).width + 34; totalW += w; return w; });
    var cx = (W - totalW) / 2;
    allTags.forEach(function (t, i) {
      var bw = widths[i];
      ctx.strokeStyle = 'rgba(46,86,104,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, 880, bw - 12, 40);
      ctx.fillStyle = BLUE;
      ctx.fillText(t, cx + (bw - 12) / 2, 906);
      cx += bw;
    });

    // 底部：对立面 + 落款
    ctx.fillStyle = 'rgba(28,26,23,0.55)';
    ctx.font = '400 22px "Noto Serif SC",serif';
    ctx.fillText('你的历史对立面：' + result.opposite.figure.name, W / 2, 990);

    ctx.strokeStyle = 'rgba(28,26,23,0.2)';
    ctx.beginPath();
    ctx.moveTo(120, 1050);
    ctx.lineTo(W - 120, 1050);
    ctx.stroke();

    ctx.fillStyle = 'rgba(28,26,23,0.45)';
    ctx.font = '400 20px "Noto Serif SC",serif';
    ctx.fillText('基于史料倾向的娱乐化概括 · 非心理诊断', W / 2, 1100);

    // 装饰：四角细线
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    [[50, 50, 1, 1], [W - 50, 50, -1, 1], [50, H - 50, 1, -1], [W - 50, H - 50, -1, -1]].forEach(function (c) {
      ctx.beginPath();
      ctx.moveTo(c[0], c[1] + 18 * c[3]);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(c[0] + 18 * c[2], c[1]);
      ctx.stroke();
    });

    return canvas.toDataURL('image/png');
  }

  var FIELD_LABELS = {
    politics: '政治', military: '军事', thought: '思想', literature: '文学',
    art: '艺术', science: '科学', exploration: '探索', social: '社会事业', history: '史学'
  };

  global.UI = {
    drawPortrait: drawPortrait,
    drawRadar: drawRadar,
    makeShareCard: makeShareCard,
    FIELD_LABELS: FIELD_LABELS
  };
})(typeof window !== 'undefined' ? window : globalThis);
