/**
 * 首页：概念传达 + 示例结果卡轮播 + 草稿续答提示
 */
(function (global) {
  'use strict';

  var SAMPLE_IDS = ['libai', 'wuzetian', 'socrates', 'zhuangzi', 'sushi'];
  var current = 0;
  var timer = null;

  function renderSample() {
    var host = document.getElementById('sampleCard');
    if (!host) return;
    var f = global.App.getFigure(SAMPLE_IDS[current]);
    if (!f) return;
    host.innerHTML =
      '<div class="sample-card fade-in" key="' + f.id + '">' +
      '<canvas id="samplePortrait"></canvas>' +
      '<div class="sample-name">' + f.name + '</div>' +
      '<div class="sample-era">' + f.era + ' · ' + f.lifespan + '</div>' +
      '<div class="sample-tag">「' + f.tagline + '」</div>' +
      '</div>';
    var canvas = document.getElementById('samplePortrait');
    if (canvas) global.UI.drawPortrait(canvas, f, { size: 240 });

    var dots = document.getElementById('sampleDots');
    if (dots) {
      dots.innerHTML = SAMPLE_IDS.map(function (id, i) {
        return '<button class="' + (i === current ? 'is-on' : '') + '" data-i="' + i + '" aria-label="第' + (i + 1) + '张"></button>';
      }).join('');
    }
  }

  function go(i) {
    current = (i + SAMPLE_IDS.length) % SAMPLE_IDS.length;
    renderSample();
  }

  function startAuto() {
    stopAuto();
    timer = global.setInterval(function () { go(current + 1); }, 3600);
  }

  function stopAuto() {
    if (timer) { global.clearInterval(timer); timer = null; }
  }

  function renderResume() {
    var box = document.getElementById('resumeBox');
    if (!box) return;
    var d = global.Store.loadDraft();
    if (!d || !d.state) return;
    var answered = Object.keys(d.state.answers || {}).length;
    if (!answered) return;
    box.hidden = false;
    box.innerHTML =
      '<div class="card">' +
      '<p class="muted">你上次答到了第 <strong>' + (d.state.index + 1) + '</strong> 题，共答了 ' + answered + ' 题。</p>' +
      '<div class="hero-actions"><a class="btn" href="quiz.html">继续答题</a>' +
      '<button class="btn btn-ghost" id="dropDraft">重新开始</button></div>' +
      '</div>';
    var btn = document.getElementById('dropDraft');
    if (btn) btn.addEventListener('click', function () {
      global.Store.clearDraft();
      box.hidden = true;
    });
  }

  function renderStats() {
    var host = document.getElementById('homeStats');
    if (!host) return;
    var s = global.Store.getStats();
    host.innerHTML =
      '<div><strong>' + global.App.figures.length + '</strong><span>位历史人物</span></div>' +
      '<div><strong>' + global.App.bank.list.length + '</strong><span>道情境题</span></div>' +
      '<div><strong>' + (s.plays || 0) + '</strong><span>次本地作答</span></div>';
  }

  function renderDims() {
    var host = document.getElementById('homeDims');
    if (!host) return;
    host.innerHTML = global.Matching.DIM_META.map(function (m) {
      return '<div class="dim-card">' +
        '<h4>' + m.name + '</h4>' +
        '<div class="poles">' + m.neg + ' ←→ ' + m.pos + '</div>' +
        '<p>' + m.desc + '</p></div>';
    }).join('');
  }

  global.Pages = global.Pages || {};
  global.Pages.home = {
    init: function () {
      renderSample();
      renderResume();
      renderStats();
      renderDims();

      var dots = document.getElementById('sampleDots');
      if (dots) {
        dots.addEventListener('click', function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          go(parseInt(b.getAttribute('data-i'), 10));
          startAuto();
        });
      }
      var frame = document.querySelector('.sample-frame');
      if (frame) {
        frame.addEventListener('mouseenter', stopAuto);
        frame.addEventListener('mouseleave', startAuto);
      }
      startAuto();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
