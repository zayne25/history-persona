/**
 * 人物详情页：完整解读一位人物
 *
 * 与长廊的弹窗不同，这里是独立页面：能放下史料依据、逐维对比与情境问答，
 * 且链接可分享（figure.html?id=xxx）。
 *
 * 若本地存有答题结果，会额外给出「你与 TA 的逐维差距」——这是用户点进来的主要动机。
 */
(function (global) {
  'use strict';

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** 读取本地最近一次结果，用于逐维对比 */
  function myCoords() {
    try {
      var token = global.localStorage.getItem('hzp.last');
      var p = global.Store.decodeResult(token);
      if (!p || !p.c) return null;
      var c = {};
      global.Matching.DIMS.forEach(function (d, i) { c[d] = p.c[i]; });
      return c;
    } catch (e) { return null; }
  }

  /** 逐维差距的措辞：越靠哪一端 */
  function gapText(dim, meta, mine, theirs) {
    var diff = mine - theirs;
    var abs = Math.abs(diff);
    if (abs < 8) return '与 TA 几乎重合';
    var toward = diff > 0 ? meta.pos : meta.neg;
    var level = abs > 30 ? '明显更' : (abs > 16 ? '更' : '略更');
    return '你' + level + '偏向「' + toward + '」（' + (diff > 0 ? '+' : '') + Math.round(diff) + '）';
  }

  function init() {
    var id = /[?&]id=([^&]+)/.exec(global.location.search);
    var f = id ? global.App.getFigure(decodeURIComponent(id[1])) : null;

    if (!f) {
      el('figureRoot').innerHTML =
        '<div class="panel"><h3>查无此人</h3>' +
        '<p>没有找到对应的人物。可能是链接不完整。</p>' +
        '<p style="margin-top:16px"><a class="btn" href="gallery.html">回到人物长廊</a></p></div>';
      return;
    }

    var M = global.Matching;
    var labels = global.UI.FIELD_LABELS;
    var mine = myCoords();

    document.title = f.name + ' · 你在历史中的名字';

    var html = '<section class="figure-hero">' +
      '<div><canvas id="figPortrait"></canvas></div>' +
      '<div><h1 class="result-name">' + esc(f.name) + '</h1>' +
      '<div class="result-era">' + esc(f.era) + ' · ' + esc(f.lifespan) + ' · ' +
      f.fields.map(function (x) { return esc(labels[x] || x); }).join(' / ') + '</div>' +
      '<div class="result-tagline">「' + esc(f.tagline) + '」</div>' +
      '<div class="result-quote">' + esc(f.quote) + '<br><span class="muted">— ' + esc(f.quoteSource) + '</span></div>' +
      '<div class="tags">' + (f.traits || []).map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join('') + '</div>' +
      '<p class="muted" style="margin-top:14px">别称：' + (f.alias || []).map(esc).join('、') + '</p>' +
      '</div></section>';

    // 六维坐标（有结果则对比，无结果则只展示人物）
    html += '<section class="panel" style="margin-top:28px">' +
      '<h3 style="font-size:19px">六维坐标' + (mine ? ' · 与你的对比' : '') + '</h3>' +
      '<div class="radar-wrap"><canvas id="figRadar"></canvas>' +
      '<div id="figGap" class="gap-list"></div></div>' +
      (mine ? '' : '<p class="muted" style="margin-top:12px">' +
        '<a href="quiz.html">测一次</a>，这里会显示你与 TA 的逐维差距。</p>') +
      '</section>';

    // 史料依据
    html += '<section class="panel" style="margin-top:20px">' +
      '<h3 style="font-size:19px">为什么这样标定</h3>' +
      '<p class="muted">每一维都附上史料依据，便于核对——这也是本项目的可信度来源。</p>' +
      '<dl class="evidence-list">' +
      M.DIMS.map(function (d, i) {
        var meta = M.DIM_META[i];
        return '<div class="evidence-item"><dt>' + esc(meta.name) +
          ' <span class="muted">' + esc(meta.neg) + ' — ' + esc(meta.pos) + '</span>' +
          '<span class="ev-num">' + f.vector[d] + '</span></dt>' +
          '<dd>' + esc((f.evidence || {})[d] || '（暂无）') + '</dd></div>';
      }).join('') +
      '</dl></section>';

    // 解读
    html += '<section class="panel" style="margin-top:20px">' +
      '<h3 style="font-size:19px">这个人</h3>' +
      '<p style="margin-top:12px">' + esc(f.summary) + '</p>' +
      '<p style="margin-top:12px">' + esc(f.deep) + '</p></section>';

    // 年表
    html += '<section class="panel" style="margin-top:20px">' +
      '<h3 style="font-size:19px">行事年表</h3><ul style="margin-top:12px">' +
      (f.milestones || []).map(function (m) {
        return '<li><strong>' + esc(m.y) + '</strong> · ' + esc(m.t) + '</li>';
      }).join('') + '</ul></section>';

    // 情境问答
    html += '<section class="panel" style="margin-top:20px">' +
      '<h3 style="font-size:19px">如果你是 TA</h3>' +
      (f.whatIf || []).map(function (w) {
        return '<div class="whatif-item"><p class="whatif-q">' + esc(w.s) + '</p>' +
          '<p class="whatif-a">' + esc(w.r) + '</p></div>';
      }).join('') + '</section>';

    // 对立面与延伸阅读
    var opp = f.counterpart ? global.App.getFigure(f.counterpart) : null;
    html += '<section class="panel" style="margin-top:20px">' +
      '<h3 style="font-size:19px">历史对立面</h3>' +
      (opp
        ? '<p style="margin-top:12px"><a href="figure.html?id=' + opp.id + '">' + esc(opp.name) +
          '</a> —— ' + esc(opp.tagline) + '</p>'
        : '<p class="muted" style="margin-top:12px">（未设置）</p>') +
      '<h3 style="font-size:19px;margin-top:22px">延伸阅读</h3><ul style="margin-top:12px">' +
      (f.further || []).map(function (x) {
        return '<li>' + esc(x.t) + '</li>';
      }).join('') + '</ul></section>';

    html += '<p style="margin-top:24px">' +
      '<a class="btn" href="quiz.html">我也测一次</a> ' +
      '<a class="btn btn-ghost" href="gallery.html">回到长廊</a></p>';

    el('figureRoot').innerHTML = html;

    global.Portrait.draw(el('figPortrait'), f, { size: 240 });
    el('figPortrait').classList.add('seal-in');
    global.UI.drawRadar(el('figRadar'), mine || f.vector, f.vector, { size: 300 });

    if (mine) {
      el('figGap').innerHTML = M.DIMS.map(function (d, i) {
        var meta = M.DIM_META[i];
        return '<div class="gap-row"><span class="gap-name">' + esc(meta.name) + '</span>' +
          '<span class="gap-text">' + esc(gapText(d, meta, mine[d], f.vector[d])) + '</span></div>';
      }).join('');
    }
  }

  global.Pages = global.Pages || {};
  global.Pages.figure = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
