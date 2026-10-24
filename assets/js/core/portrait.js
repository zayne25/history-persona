/**
 * 人物画像绘制引擎（Canvas 白描）
 *
 * 不用外部图片：一是保持零依赖、断网可用，二是避免 36 张来源不一的图破坏视觉统一，
 * 三是规避版权。全部由代码现画，风格与印章、宣纸一致。
 *
 * 构图：半身像，冠巾定身份、器物定事迹、服饰定时代、眉眼须发定气质。
 * 神态由六维坐标微调（如行动力高则眉上扬），因此同一套部件不会画出千人一面。
 */
(function (global) {
  'use strict';

  var INK = '#1C1A17', RED = '#C4442F', PAPER = '#F3ECDC';

  function seedFrom(s) {
    var h = 2166136261;
    s = String(s || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeRandom(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function setup(canvas, w, h) {
    var dpr = global.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = Math.max(1.3, w / 130);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    return ctx;
  }

  function paper(ctx, w, h, rand) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(28,26,23,0.05)';
    for (var i = 0; i < 260; i++) ctx.fillRect(rand() * w, rand() * h, 1, 1);
  }

  // ---------------- 冠巾 ----------------
  // 坐标系：以脸中心为原点，rx / ry 为脸的半宽与半高
  var HEAD = {
    /** 无冠无巾：补两笔鬓发，否则只有一条发弧，看着像光头 */
    none: function (ctx, rx, ry) {
      [-1, 1].forEach(function (k) {
        ctx.beginPath();
        ctx.moveTo(k * rx * 0.97, -ry * 0.14);
        ctx.quadraticCurveTo(k * rx * 1.10, ry * 0.10, k * rx * 0.88, ry * 0.42);
        ctx.stroke();
      });
    },

    /** 软巾：覆顶，两侧垂带 */
    jin: function (ctx, rx, ry) {
      ctx.beginPath();
      ctx.moveTo(-rx * 1.06, -ry * 0.60);
      ctx.quadraticCurveTo(0, -ry * 1.66, rx * 1.06, -ry * 0.60);
      ctx.stroke();
      [-1, 1].forEach(function (k) {
        ctx.beginPath();
        ctx.moveTo(k * rx * 1.0, -ry * 0.64);
        ctx.quadraticCurveTo(k * rx * 1.42, -ry * 0.05, k * rx * 1.18, ry * 0.42);
        ctx.stroke();
      });
    },

    /** 冠：前低后高的梯形 */
    guan: function (ctx, rx, ry) {
      ctx.beginPath();
      ctx.moveTo(-rx * 1.02, -ry * 0.66);
      ctx.lineTo(-rx * 0.86, -ry * 1.30);
      ctx.lineTo(rx * 0.86, -ry * 1.30);
      ctx.lineTo(rx * 1.02, -ry * 0.66);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-rx * 0.62, -ry * 1.02);
      ctx.lineTo(rx * 0.62, -ry * 1.02);
      ctx.stroke();
    },

    /** 冕：冠 + 顶部綖板 + 垂旒 */
    mian: function (ctx, rx, ry) {
      ctx.beginPath();
      ctx.moveTo(-rx * 1.05, -ry * 0.70);
      ctx.lineTo(-rx * 0.88, -ry * 1.24);
      ctx.lineTo(rx * 0.88, -ry * 1.24);
      ctx.lineTo(rx * 1.05, -ry * 0.70);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-rx * 1.42, -ry * 1.30);
      ctx.lineTo(rx * 1.42, -ry * 1.30);
      ctx.stroke();
      for (var i = -2; i <= 2; i++) {
        if (!i) continue;
        ctx.beginPath();
        ctx.moveTo(i * rx * 0.5, -ry * 1.30);
        ctx.lineTo(i * rx * 0.5, -ry * 0.86);
        ctx.stroke();
      }
    },

    /** 盔：半球 + 顶饰 */
    helmet: function (ctx, rx, ry) {
      ctx.beginPath();
      ctx.arc(0, -ry * 0.62, rx * 1.16, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-rx * 1.16, -ry * 0.62);
      ctx.lineTo(rx * 1.16, -ry * 0.62);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -ry * 1.78);
      ctx.lineTo(0, -ry * 1.28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-rx * 0.5, -ry * 1.72);
      ctx.lineTo(0, -ry * 2.02);
      ctx.lineTo(rx * 0.5, -ry * 1.72);
      ctx.stroke();
    },

    /** 簪髻：高髻 + 斜插的簪 */
    zan: function (ctx, rx, ry) {
      ctx.beginPath();
      ctx.moveTo(-rx * 1.02, -ry * 0.62);
      ctx.quadraticCurveTo(0, -ry * 1.62, rx * 1.02, -ry * 0.62);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -ry * 1.28, rx * 0.72, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-rx * 0.9, -ry * 1.52);
      ctx.lineTo(rx * 1.34, -ry * 0.72);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rx * 1.42, -ry * 0.66, rx * 0.13, 0, Math.PI * 2);
      ctx.stroke();
    },

    /** 桂冠：两侧枝叶 */
    laurel: function (ctx, rx, ry) {
      [-1, 1].forEach(function (k) {
        ctx.beginPath();
        ctx.arc(0, -ry * 0.5, rx * 1.18, k > 0 ? -Math.PI * 0.92 : Math.PI * 0.08,
          k > 0 ? -Math.PI * 0.22 : Math.PI * 0.78);
        ctx.stroke();
        for (var i = 0; i < 3; i++) {
          var a = (k > 0 ? -0.85 : 0.15) + (k > 0 ? 1 : -1) * 0 + i * 0.24 * k;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * rx * 1.2, -ry * 0.5 + Math.sin(a) * rx * 1.2,
            rx * 0.16, rx * 0.09, a, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    },

    /** 宽檐帽 */
    hat: function (ctx, rx, ry) {
      ctx.beginPath();
      ctx.ellipse(0, -ry * 0.72, rx * 1.72, ry * 0.30, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-rx * 0.92, -ry * 0.74);
      ctx.quadraticCurveTo(-rx * 0.86, -ry * 1.58, 0, -ry * 1.62);
      ctx.quadraticCurveTo(rx * 0.86, -ry * 1.58, rx * 0.92, -ry * 0.74);
      ctx.stroke();
    }
  };

  // ---------------- 服饰 ----------------
  // 只画领口与衣纹，肩袖轮廓由 drawBody 统一绘制
  var ROBE = {
    /** 交领右衽：y 形交叠 */
    hanfu: function (ctx, cx, sy, s) {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.082, sy);
      ctx.lineTo(cx - s * 0.012, sy + s * 0.105);
      ctx.moveTo(cx + s * 0.088, sy);
      ctx.lineTo(cx - s * 0.012, sy + s * 0.105);
      ctx.lineTo(cx + s * 0.030, sy + s * 0.165);
      ctx.stroke();
    },

    /** 圆领袍 */
    yuanling: function (ctx, cx, sy, s) {
      ctx.beginPath();
      ctx.arc(cx, sy + s * 0.018, s * 0.058, Math.PI * 0.06, Math.PI * 0.94);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, sy + s * 0.076);
      ctx.lineTo(cx, sy + s * 0.135);
      ctx.stroke();
    },

    /** 甲胄：护领 + 甲片 */
    armor: function (ctx, cx, sy, s, hw) {
      ctx.beginPath();
      ctx.arc(cx, sy + s * 0.016, s * 0.052, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
      for (var i = 1; i <= 3; i++) {
        var y = sy + s * (0.08 + i * 0.055);
        ctx.beginPath();
        ctx.moveTo(cx - hw * (0.72 - i * 0.06), y);
        ctx.lineTo(cx + hw * (0.72 - i * 0.06), y);
        ctx.stroke();
      }
    },

    /** 古希腊罗马披袍：斜向披裹 */
    drape: function (ctx, cx, sy, s, hw) {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.085, sy);
      ctx.quadraticCurveTo(cx + s * 0.02, sy + s * 0.13, cx + hw * 0.62, sy + s * 0.20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - hw * 0.30, sy + s * 0.03);
      ctx.quadraticCurveTo(cx - hw * 0.05, sy + s * 0.16, cx - hw * 0.16, sy + s * 0.28);
      ctx.stroke();
    },

    /** 西式外衣：翻领 */
    western: function (ctx, cx, sy, s) {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.088, sy);
      ctx.lineTo(cx - s * 0.018, sy + s * 0.125);
      ctx.lineTo(cx - s * 0.062, sy + s * 0.175);
      ctx.moveTo(cx + s * 0.088, sy);
      ctx.lineTo(cx + s * 0.018, sy + s * 0.125);
      ctx.lineTo(cx + s * 0.062, sy + s * 0.175);
      ctx.stroke();
    },

    /** 长袍僧衣：竖领 + 斜襟 */
    pao: function (ctx, cx, sy, s) {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.055, sy - s * 0.012);
      ctx.lineTo(cx - s * 0.055, sy + s * 0.04);
      ctx.moveTo(cx + s * 0.055, sy - s * 0.012);
      ctx.lineTo(cx + s * 0.055, sy + s * 0.04);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.055, sy + s * 0.04);
      ctx.lineTo(cx + s * 0.075, sy + s * 0.155);
      ctx.stroke();
    }
  };

  // ---------------- 手持器物（辨识度的关键） ----------------
  // 坐标系：以器物中心为原点，s 为基准尺寸
  var PROP = {
    none: function () { },

    /** 简册 / 卷轴 */
    scroll: function (ctx, s) {
      var w = s * 1.05, h = s * 0.44;
      ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.stroke();
      for (var i = 1; i < 4; i++) {
        var x = -w / 2 + (w * i) / 4;
        ctx.beginPath(); ctx.moveTo(x, -h / 2); ctx.lineTo(x, h / 2); ctx.stroke();
      }
    },

    /** 毛笔 */
    brush: function (ctx, s) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.30, -s * 0.62);
      ctx.lineTo(s * 0.14, s * 0.10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.14, s * 0.10);
      ctx.lineTo(s * 0.20, s * 0.56);
      ctx.lineTo(s * 0.40, s * 0.14);
      ctx.closePath();
      ctx.stroke();
    },

    /** 剑 */
    sword: function (ctx, s) {
      ctx.beginPath(); ctx.moveTo(0, -s * 0.74); ctx.lineTo(0, s * 0.24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.17, s * 0.24); ctx.lineTo(s * 0.17, s * 0.24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.24); ctx.lineTo(0, s * 0.62); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, s * 0.70, s * 0.075, 0, Math.PI * 2); ctx.stroke();
    },

    /** 羽扇 */
    fan: function (ctx, s) {
      ctx.beginPath(); ctx.moveTo(0, s * 0.06); ctx.lineTo(0, s * 0.66); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, s * 0.06);
      ctx.arc(0, s * 0.06, s * 0.66, -Math.PI * 0.86, -Math.PI * 0.14);
      ctx.closePath();
      ctx.stroke();
      for (var i = 1; i < 4; i++) {
        var a = -Math.PI * (0.86 - 0.24 * i);
        ctx.beginPath();
        ctx.moveTo(0, s * 0.06);
        ctx.lineTo(Math.cos(a) * s * 0.66, s * 0.06 + Math.sin(a) * s * 0.66);
        ctx.stroke();
      }
    },

    /** 浑天仪 */
    armillary: function (ctx, s) {
      var r = s * 0.52;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.40, r, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.40, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(0, r * 1.34); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.48, r * 1.34); ctx.lineTo(r * 0.48, r * 1.34); ctx.stroke();
    },

    /** 印玺 */
    seal: function (ctx, s) {
      var w = s * 0.72;
      ctx.beginPath(); ctx.rect(-w / 2, -s * 0.06, w, s * 0.72); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -s * 0.18, s * 0.17, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-w / 2, s * 0.24); ctx.lineTo(w / 2, s * 0.24); ctx.stroke();
    },

    /** 菊 */
    flower: function (ctx, s) {
      ctx.beginPath(); ctx.arc(0, -s * 0.15, s * 0.20, 0, Math.PI * 2); ctx.stroke();
      for (var i = 0; i < 9; i++) {
        var a = (i / 9) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s * 0.24, Math.sin(a) * s * 0.24 - s * 0.15);
        ctx.lineTo(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62 - s * 0.15);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, s * 0.18);
      ctx.quadraticCurveTo(s * 0.12, s * 0.55, -s * 0.04, s * 0.92);
      ctx.stroke();
    },

    /** 锡杖 */
    staff: function (ctx, s) {
      ctx.beginPath(); ctx.moveTo(-s * 0.10, s * 0.88); ctx.lineTo(s * 0.12, -s * 0.46); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.15, -s * 0.60, s * 0.17, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.02, -s * 0.72); ctx.lineTo(s * 0.28, -s * 0.72); ctx.stroke();
    },

    /** 镜 */
    mirror: function (ctx, s) {
      ctx.beginPath(); ctx.arc(0, -s * 0.22, s * 0.48, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -s * 0.22, s * 0.36, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.26); ctx.lineTo(0, s * 0.82); ctx.stroke();
    },

    /** 月 */
    moon: function (ctx, s) {
      var r = s * 0.56;
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI * 0.34, Math.PI * 1.66, false);
      ctx.arc(r * 0.40, 0, r * 0.94, Math.PI * 1.56, Math.PI * 0.44, true);
      ctx.closePath();
      ctx.stroke();
    },

    /** 杯 */
    cup: function (ctx, s) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.44, -s * 0.22);
      ctx.quadraticCurveTo(0, s * 0.52, s * 0.44, -s * 0.22);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.20, s * 0.40); ctx.lineTo(s * 0.20, s * 0.40); ctx.stroke();
    },

    /** 弓 */
    bow: function (ctx, s) {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.72, -Math.PI * 0.40, Math.PI * 0.40, false); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(Math.cos(-Math.PI * 0.40) * s * 0.72, Math.sin(-Math.PI * 0.40) * s * 0.72);
      ctx.lineTo(Math.cos(Math.PI * 0.40) * s * 0.72, Math.sin(Math.PI * 0.40) * s * 0.72);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(Math.cos(-Math.PI * 0.40) * s * 0.72, Math.sin(-Math.PI * 0.40) * s * 0.72);
      ctx.lineTo(Math.cos(Math.PI * 0.40) * s * 0.72, Math.sin(Math.PI * 0.40) * s * 0.72);
      ctx.stroke();
    },

    /** 纺轮 */
    loom: function (ctx, s) {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.50, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.13, 0, Math.PI * 2); ctx.stroke();
      [0, 1, 2, 3].forEach(function (i) {
        var a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s * 0.16, Math.sin(a) * s * 0.16);
        ctx.lineTo(Math.cos(a) * s * 0.48, Math.sin(a) * s * 0.48);
        ctx.stroke();
      });
    },

    /** 宝船 */
    ship: function (ctx, s) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.64, s * 0.28);
      ctx.lineTo(s * 0.64, s * 0.28);
      ctx.lineTo(s * 0.42, s * 0.60);
      ctx.lineTo(-s * 0.42, s * 0.60);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.28); ctx.lineTo(0, -s * 0.68); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.62);
      ctx.quadraticCurveTo(s * 0.54, -s * 0.30, 0, s * 0.02);
      ctx.stroke();
    },

    /** 望远镜 */
    telescope: function (ctx, s) {
      ctx.save();
      ctx.rotate(-0.52);
      ctx.beginPath(); ctx.rect(-s * 0.15, -s * 0.76, s * 0.30, s * 0.92); ctx.stroke();
      ctx.beginPath(); ctx.rect(-s * 0.23, -s * 0.02, s * 0.46, s * 0.52); ctx.stroke();
      ctx.restore();
    },

    /** 戏剧面具 */
    mask: function (ctx, s) {
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.56, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-s * 0.16, -s * 0.14, s * 0.10, s * 0.07, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s * 0.16, -s * 0.14, s * 0.10, s * 0.07, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, s * 0.26, s * 0.15, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
    },

    /** 乐谱 */
    score: function (ctx, s) {
      var w = s * 0.82, h = s * 0.96;
      ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.stroke();
      for (var i = 1; i < 5; i++) {
        var y = -h / 2 + (h * i) / 5;
        ctx.beginPath(); ctx.moveTo(-w / 2 + 2, y); ctx.lineTo(w / 2 - 2, y); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(-s * 0.12, s * 0.22, s * 0.085, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.035, s * 0.22); ctx.lineTo(-s * 0.035, -s * 0.12); ctx.stroke();
    },

    /** 烧瓶 */
    flask: function (ctx, s) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.13, -s * 0.62);
      ctx.lineTo(s * 0.13, -s * 0.62);
      ctx.lineTo(s * 0.13, -s * 0.20);
      ctx.lineTo(s * 0.50, s * 0.56);
      ctx.lineTo(-s * 0.50, s * 0.56);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.19, -s * 0.62); ctx.lineTo(s * 0.19, -s * 0.62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.31, s * 0.20); ctx.lineTo(s * 0.31, s * 0.20); ctx.stroke();
      ctx.beginPath(); ctx.arc(-s * 0.08, s * 0.38, s * 0.05, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.13, s * 0.44, s * 0.035, 0, Math.PI * 2); ctx.stroke();
    },

    /** 提灯 */
    lamp: function (ctx, s) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.38, s * 0.56);
      ctx.lineTo(s * 0.38, s * 0.56);
      ctx.lineTo(s * 0.22, s * 0.06);
      ctx.lineTo(-s * 0.22, s * 0.06);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, s * 0.06); ctx.lineTo(0, s * 0.62); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.02);
      ctx.quadraticCurveTo(s * 0.24, -s * 0.42, 0, -s * 0.74);
      ctx.quadraticCurveTo(-s * 0.24, -s * 0.42, 0, -s * 0.02);
      ctx.stroke();
    },

    /** 放大镜 */
    lens: function (ctx, s) {
      ctx.beginPath(); ctx.arc(0, -s * 0.24, s * 0.42, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -s * 0.24, s * 0.32, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.30, s * 0.10); ctx.lineTo(s * 0.54, s * 0.74); ctx.stroke();
    },

    /** 向日葵 */
    sunflower: function (ctx, s) {
      ctx.beginPath(); ctx.arc(0, -s * 0.24, s * 0.26, 0, Math.PI * 2); ctx.stroke();
      for (var i = 0; i < 11; i++) {
        var a = (i / 11) * Math.PI * 2;
        var x0 = Math.cos(a) * s * 0.28, y0 = Math.sin(a) * s * 0.28 - s * 0.24;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(x0 * 1.9, y0 * 1.6 + s * 0.16, x0 * 1.45, y0 * 2.1 + s * 0.30);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, s * 0.02); ctx.lineTo(0, s * 0.88); ctx.stroke();
    },

    /** 旗帜 */
    banner: function (ctx, s) {
      ctx.beginPath(); ctx.moveTo(0, -s * 0.82); ctx.lineTo(0, s * 0.86); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.76);
      ctx.lineTo(s * 0.70, -s * 0.56);
      ctx.lineTo(s * 0.70, s * 0.10);
      ctx.lineTo(0, s * 0.02);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.22, -s * 0.62); ctx.lineTo(s * 0.22, -s * 0.06); ctx.stroke();
    },

    /** 蝶 */
    butterfly: function (ctx, s) {
      [-1, 1].forEach(function (k) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(k * s * 0.74, -s * 0.62, k * s * 0.52, s * 0.06);
        ctx.quadraticCurveTo(k * s * 0.66, s * 0.52, 0, 0);
        ctx.stroke();
      });
      ctx.beginPath(); ctx.moveTo(0, -s * 0.20); ctx.lineTo(0, s * 0.34); ctx.stroke();
    }
  };

  /**
   * 肩袖与衣身轮廓（各服饰共用）
   * 关键在于「有袖」：肩线下行后先外扩成袖、再收向身侧，
   * 否则画出来只是两条直线，看着像个方框而不是一个人。
   */
  function drawBody(ctx, cx, sy, hw, bot, s) {
    [-1, 1].forEach(function (k) {
      ctx.beginPath();
      ctx.moveTo(cx + k * s * 0.052, sy);                              // 颈侧
      ctx.quadraticCurveTo(cx + k * hw * 0.52, sy + s * 0.014,
        cx + k * hw, sy + s * 0.072);                                  // 肩
      ctx.quadraticCurveTo(cx + k * hw * 1.16, sy + s * 0.155,
        cx + k * hw * 1.06, sy + s * 0.285);                           // 袖外缘
      ctx.lineTo(cx + k * hw * 0.70, sy + s * 0.325);                  // 袖口内收
      ctx.lineTo(cx + k * hw * 0.78, bot);                             // 衣身下摆
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(cx - hw * 0.78, bot);
    ctx.lineTo(cx + hw * 0.78, bot);
    ctx.stroke();
    // 衣襟：只画领口下的一小段，贯穿到底会像把身体劈成两半
    ctx.beginPath();
    ctx.moveTo(cx, sy + s * 0.175);
    ctx.lineTo(cx, sy + s * 0.30);
    ctx.stroke();
  }

  /** 朱砂方章 */
  function drawSeal(ctx, size, figure) {
    var s = size * 0.125;
    var x = size - s - size * 0.075;
    var y = size - s - size * 0.075;
    ctx.fillStyle = RED;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x, y, s, s);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAPER;
    ctx.font = '700 ' + Math.round(s * 0.48) + 'px "Noto Serif SC","Source Han Serif SC",serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(figure.era || '').slice(0, 2), x + s / 2, y + s / 2 + 1);
    ctx.fillStyle = INK;
  }

  /**
   * 绘制人物画像
   * @param {HTMLCanvasElement} canvas
   * @param {object} figure 人物（需带 portrait 特征）
   * @param {object=} opts {size, seal}
   */
  function draw(canvas, figure, opts) {
    var o = opts || {};
    var size = o.size || 260;
    var ctx = setup(canvas, size, size);
    var rand = makeRandom(seedFrom(figure.id));
    var p = figure.portrait || {};
    var robe = ROBE[p.robe] ? p.robe : 'hanfu';
    var head = HEAD[p.head] ? p.head : 'none';
    var prop = PROP[p.prop] ? p.prop : 'none';
    var sit = p.pose === 'sit';
    var v = figure.vector || {};

    // 头要够大，五官才放得开——初版头偏小，眉眼鼻口全挤成一团黑
    var cx = size * 0.5;
    var rx = size * 0.125, ry = size * 0.148;
    var faceY = size * (sit ? 0.300 : 0.286);
    var shoulderY = faceY + ry * 0.90 + size * (sit ? 0.048 : 0.068);
    var hw = size * 0.222;
    var bot = size * (sit ? 0.945 : 0.962);

    paper(ctx, size, size, rand);

    // 背景：淡色双环，呼应印章的视觉母题
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.arc(cx, size * 0.46, size * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, size * 0.46, size * 0.385, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // 衣身
    drawBody(ctx, cx, shoulderY, hw, bot, size);
    ROBE[robe](ctx, cx, shoulderY, size, hw);

    // 颈
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.030, faceY + ry * 0.82);
    ctx.lineTo(cx - size * 0.036, shoulderY + size * 0.004);
    ctx.moveTo(cx + size * 0.030, faceY + ry * 0.82);
    ctx.lineTo(cx + size * 0.036, shoulderY + size * 0.004);
    ctx.stroke();

    // 脸
    ctx.beginPath();
    ctx.ellipse(cx, faceY, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 耳
    [-1, 1].forEach(function (k) {
      ctx.beginPath();
      ctx.arc(cx + k * rx, faceY, rx * 0.20, k > 0 ? -Math.PI * 0.5 : Math.PI * 0.5,
        k > 0 ? Math.PI * 0.5 : Math.PI * 1.5);
      ctx.stroke();
    });

    // 发（贴合额顶即可：拱得太高会和眉毛挤在同一区域，整张脸就脏了）
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.99, faceY - ry * 0.16);
    ctx.quadraticCurveTo(cx, faceY - ry * 1.12, cx + rx * 0.99, faceY - ry * 0.16);
    ctx.stroke();

    // 冠巾
    ctx.save();
    ctx.translate(cx, faceY);
    HEAD[head](ctx, rx, ry);
    ctx.restore();

    // 眉：行动力越高越上扬
    var brow = ((v.D2 || 50) - 50) / 50 * 0.30;
    [-1, 1].forEach(function (k) {
      ctx.beginPath();
      ctx.moveTo(cx + k * rx * 0.16, faceY - ry * 0.30);
      ctx.lineTo(cx + k * rx * 0.62, faceY - ry * (0.30 - brow * k * -1));
      ctx.stroke();
    });

    // 眼：情感驱动高则偏柔和的弧，否则短线
    var soft = (v.D5 || 50) > 50;
    [-1, 1].forEach(function (k) {
      var ex = cx + k * rx * 0.38, ey = faceY - ry * 0.04;
      if (soft) {
        ctx.beginPath();
        ctx.moveTo(ex - rx * 0.17, ey);
        ctx.quadraticCurveTo(ex, ey + ry * 0.09, ex + rx * 0.17, ey);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(ex - rx * 0.16, ey);
        ctx.lineTo(ex + rx * 0.16, ey);
        ctx.stroke();
      }
    });

    // 口（不画鼻：这个尺寸下鼻梁那一竖只会让脸更脏）
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.17, faceY + ry * 0.54);
    ctx.quadraticCurveTo(cx, faceY + ry * 0.62, cx + rx * 0.17, faceY + ry * 0.54);
    ctx.stroke();

    // 须髯
    if (p.beard) {
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.30, faceY + ry * 0.44);
      ctx.lineTo(cx - rx * 0.22, faceY + ry * 0.78);
      ctx.moveTo(cx + rx * 0.30, faceY + ry * 0.44);
      ctx.lineTo(cx + rx * 0.22, faceY + ry * 0.78);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.46, faceY + ry * 0.82);
      ctx.quadraticCurveTo(cx, faceY + ry * 1.20, cx + rx * 0.46, faceY + ry * 0.82);
      ctx.stroke();
    }

    // 手（扶在身前）
    ctx.beginPath();
    ctx.arc(cx - size * 0.115, shoulderY + size * 0.145, size * 0.028, 0, Math.PI * 2);
    ctx.stroke();

    // 器物
    if (prop !== 'none') {
      ctx.save();
      ctx.translate(cx + size * 0.255, size * (sit ? 0.66 : 0.68));
      PROP[prop](ctx, size * 0.155);
      ctx.restore();
    }

    if (o.seal !== false) drawSeal(ctx, size, figure);
  }

  global.Portrait = { draw: draw };
})(typeof window !== 'undefined' ? window : globalThis);
