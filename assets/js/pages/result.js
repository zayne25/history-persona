/**
 * 结果页：主卡（印章头像 + 匹配度）→ 坐标雷达图 → 关键词
 *        → 「如果你是 TA」翻牌 → 深度解读 → 成就年表
 *        → 次级推荐 / 历史对立面 → 分享与邀请
 *
 * 结果完全由 URL 中的令牌复现，无需服务端、无需重新答题。
 */
(function (global) {
  'use strict';

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function countUp(node, to) {
    var dur = 900, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = String(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function init() {
    var token = global.Store.readTokenFromUrl();
    if (!token) {
      try { token = global.localStorage.getItem('hzp.last'); } catch (e) { token = null; }
    }
    var payload = global.Store.decodeResult(token);
    if (!payload) {
      el('resultRoot').innerHTML =
        '<div class="panel"><h3>此卷已残</h3>' +
        '<p>我们没有找到对应的结果。可能是链接被截断了，也可能是换了设备。</p>' +
        '<p style="margin-top:16px"><a class="btn" href="quiz.html">重新测一次</a></p></div>';
      return;
    }

    var coords = {};
    global.Matching.DIMS.forEach(function (d, i) { coords[d] = payload.c[i]; });

    var result = global.Matching.evaluateCoords(coords, global.App.figures);
    var f = result.top.figure;
    var labels = global.UI.FIELD_LABELS;

    document.title = '你是' + f.name + ' · 你在历史中的名字';

    // --- 主卡 ---
    el('resultRoot').innerHTML =
      '<section class="result-hero">' +
      '<div><canvas id="resultPortrait"></canvas></div>' +
      '<div>' +
      '<div class="match-label">契 合 度</div>' +
      '<div class="match-number count-up" id="matchNum">0</div>' +
      '<h1 class="result-name">' + esc(f.name) + '</h1>' +
      '<div class="result-era">' + esc(f.era) + ' · ' + esc(f.lifespan) + ' · ' +
      f.fields.map(function (x) { return esc(labels[x] || x); }).join(' / ') + '</div>' +
      '<div class="result-tagline">「' + esc(f.tagline) + '」</div>' +
      '<div class="result-quote">' + esc(f.quote) + '<br><span class="muted">— ' + esc(f.quoteSource) + '</span></div>' +
      '<div class="tags" id="resultTags"></div>' +
      '</div></section>';

    global.UI.drawPortrait(el('resultPortrait'), f, { size: 260 });

    // 关键词：人物特质 + 趣味题结果
    var tags = (f.traits || []).slice(0, 3).concat(payload.g || []).slice(0, 6);
    el('resultTags').innerHTML = tags.map(function (t) {
      return '<span class="tag">' + esc(t) + '</span>';
    }).join('');

    countUp(el('matchNum'), result.top.display);

    // --- 雷达图 ---
    global.UI.drawRadar(el('radarCanvas'), coords, f.vector, { size: 340 });

    var profile = global.Matching.describeProfile(coords);
    el('radarLabels').innerHTML = profile.map(function (p) {
      return '<div class="dim-card"><h4>' + esc(p.name) + '</h4>' +
        '<div class="poles">' + esc(p.label) + ' · ' + p.value + '</div></div>';
    }).join('');

    // --- 如果你是 TA ---
    el('whatIfGrid').innerHTML = (f.whatIf || []).map(function (w, i) {
      return '<div class="flip" data-i="' + i + '"><div class="flip-inner">' +
        '<div class="flip-face flip-front"><div class="flip-q">' + esc(w.s) + '</div>' +
        '<div class="flip-hint">点一下，看你会怎么做</div></div>' +
        '<div class="flip-face flip-back"><div class="flip-a">' + esc(w.r) + '</div></div>' +
        '</div></div>';
    }).join('');

    el('whatIfGrid').querySelectorAll('.flip').forEach(function (card) {
      card.addEventListener('click', function () {
        card.classList.toggle('is-flipped');
      });
    });

    // --- 深度解读 ---
    el('deepRead').textContent = f.deep;
    el('figureSummary').textContent = f.summary;

    el('milestoneList').innerHTML = (f.milestones || []).map(function (m) {
      return '<li><strong>' + esc(m.y) + '</strong> · ' + esc(m.t) + '</li>';
    }).join('');

    // --- 次级推荐 ---
    el('runnerUpList').innerHTML = result.runnerUps.map(function (x) {
      return '<div class="figure-card" data-goto="' + x.figure.id + '">' +
        '<h4>' + esc(x.figure.name) + '</h4>' +
        '<div class="fc-era">' + esc(x.figure.era) + '</div>' +
        '<div class="fc-tag">契合 ' + x.display + '%</div></div>';
    }).join('');

    // --- 对立面 ---
    var opp = result.opposite.figure;
    el('oppositeBox').innerHTML =
      '<div class="versus-box">' +
      '<div><h3>' + esc(f.name) + '</h3><p class="muted">' + esc(f.tagline) + '</p></div>' +
      '<div class="versus-mid">对</div>' +
      '<div><h3>' + esc(opp.name) + '</h3><p class="muted">' + esc(opp.tagline) + '</p></div>' +
      '</div>';

    // --- 标定依据 ---
    el('evidenceList').innerHTML = global.Matching.DIM_META.map(function (m) {
      return '<li><strong>' + esc(m.name) + '</strong>：' + esc(f.evidence[m.key] || '') + '</li>';
    }).join('');

    // --- 分享 ---
    var shareUrl = global.location.href;
    el('btnCopyLink').addEventListener('click', function () {
      var ok = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl);
          ok = true;
        }
      } catch (e) { ok = false; }
      el('shareHint').textContent = ok ? '链接已复制，去粘给朋友吧' : '复制失败，请手动复制地址栏链接';
    });

    el('btnSaveCard').addEventListener('click', function () {
      var url = global.UI.makeShareCard(f, result, payload.g || []);
      var a = document.createElement('a');
      a.href = url;
      a.download = '历史人格-' + f.name + '.png';
      a.click();
      el('shareHint').textContent = '分享卡已生成';
    });

    el('btnVersus').addEventListener('click', function () {
      global.location.href = 'versus.html#me=' + encodeURIComponent(token);
    });

    el('linkFigure').setAttribute('href', 'gallery.html?s=' + encodeURIComponent(f.id));
    el('btnRetry').addEventListener('click', function () {
      global.Store.clearDraft();
      global.location.href = 'quiz.html';
    });

    // 特殊结局
    if (result.isUnrecorded) {
      var banner = el('specialBanner');
      banner.hidden = false;
      banner.textContent = '你的坐标离所有已知人物都很远——你大概是史书漏掉的那一个。';
    }
  }

  global.Pages = global.Pages || {};
  global.Pages.result = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
