/**
 * 答题页：单题呈现、进度与幕次、断点续答、平局决胜、完成即跳转结果页
 *
 * 题型：sjt 情境判断 / rank 排序 / slider 滑杆 / flip 反向自检 / fun 趣味轻量
 * 流程：24 道主题 → 评估 → 若前两名差距过小则追加决胜题 → 再次评估 → 结果页
 */
(function (global) {
  'use strict';

  var ACT_META = {
    ice: { name: '第一幕 · 破冰', note: '先不必想太多，凭直觉选。' },
    core: { name: '第二幕 · 核心', note: '从这里开始，每一题都会左右你的坐标。' },
    final: { name: '第三幕 · 收束', note: '最后几题，它们决定你落在哪一侧。' },
  };

  var state = { index: 0, answers: {} };

  var bank = null;
  var figures = null;

  function el(id) { return document.getElementById(id); }

  function currentQuestion() { return bank.list[state.index]; }
  function bag() { return state.answers; }

  // ---------------- 各题型渲染 ----------------

  function bindOptions(host, onPick) {
    host.querySelectorAll('.option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        onPick(parseInt(btn.getAttribute('data-v'), 10));
      });
    });
  }

  function renderSJT(q, host) {
    host.innerHTML = q.options.map(function (o, i) {
      var on = bag()[q.id] === i ? ' is-on' : '';
      return '<button class="option' + on + '" data-v="' + i + '">' +
        '<span class="option-key">' + '甲乙丙丁'.charAt(i) + '</span>' +
        '<span>' + o.t + '</span></button>';
    }).join('');
    bindOptions(host, function (v) {
      bag()[q.id] = v;
      renderQuestion();
    });
  }

  function renderSlider(q, host) {
    // 未作答时初始化为中位（0），避免用户不动滑杆就卡住无法前进
    if (typeof bag()[q.id] !== 'number') bag()[q.id] = 0;
    var v = bag()[q.id];
    host.innerHTML =
      '<div class="slider-row">' +
      '<div class="muted">当前：<strong id="sliderVal">' + v + '</strong> · 拖动到你认可的位置</div>' +
      '<input type="range" min="-10" max="10" step="1" value="' + v + '" id="sliderInput" aria-label="' + q.dim + '">' +
      '<div class="slider-ends"><span>' + q.left + '</span><span>' + q.right + '</span></div>' +
      '</div>';
    var input = el('sliderInput');
    input.addEventListener('input', function () {
      bag()[q.id] = parseInt(input.value, 10);
      var lab = el('sliderVal');
      if (lab) lab.textContent = input.value;
      persist();
    });
  }

  function renderRank(q, host) {
    var b = bag();
    if (!Array.isArray(b[q.id]) || b[q.id].length !== q.items.length) {
      b[q.id] = q.items.map(function (_, i) { return i; });
    }
    var arr = b[q.id];
    host.innerHTML =
      '<div class="muted">' + (q.hint || '把最重要的一件排在最上面，可用右侧箭头调整。') + '</div>' +
      '<div class="rank-list" id="rankList"></div>';
    var list = el('rankList');

    function move(from, to) {
      if (to < 0 || to >= arr.length) return;
      var t = arr.splice(from, 1)[0];
      arr.splice(to, 0, t);
      paint();
      persist();
    }

    function paint() {
      list.innerHTML = arr.map(function (idx, pos) {
        return '<div class="rank-item" draggable="true" data-pos="' + pos + '">' +
          '<span class="rank-no">' + (pos + 1) + '</span>' +
          '<span>' + q.items[idx].t + '</span>' +
          '<span class="rank-ctrl">' +
          '<button data-act="up" aria-label="上移">↑</button>' +
          '<button data-act="down" aria-label="下移">↓</button>' +
          '</span></div>';
      }).join('');

      list.querySelectorAll('.rank-item').forEach(function (item) {
        var pos = parseInt(item.getAttribute('data-pos'), 10);
        item.querySelectorAll('button').forEach(function (b) {
          b.addEventListener('click', function () {
            move(pos, b.getAttribute('data-act') === 'up' ? pos - 1 : pos + 1);
          });
        });
        item.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/plain', String(pos));
        });
        item.addEventListener('dragover', function (e) { e.preventDefault(); });
        item.addEventListener('drop', function (e) {
          e.preventDefault();
          var from = parseInt(e.dataTransfer.getData('text/plain'), 10);
          if (isNaN(from)) return;
          move(from, pos);
        });
      });
    }

    paint();
  }

  function renderQuestion() {
    var q = currentQuestion();
    if (!q) return;

    var total = bank.list.length;
    var act = ACT_META[q.act] || ACT_META.core;
    el('actName').textContent = act.name;
    el('actNote').textContent = act.note;
    el('progressBar').style.width = (state.index / total * 100) + '%';

    var kind = q.type === 'rank' ? ' · 排序题' : q.type === 'slider' ? ' · 滑杆题' : '';
    el('qCount').textContent = '第 ' + (state.index + 1) + ' / ' + total + ' 题' + kind;
    el('qStem').textContent = q.stem;

    var host = el('qBody');
    if (q.type === 'rank') renderRank(q, host);
    else if (q.type === 'slider') renderSlider(q, host);
    else renderSJT(q, host);

    el('btnPrev').disabled = state.index === 0;
    el('btnNext').textContent = state.index === total - 1 ? '看看我是谁' : '下一题';

    persist();
  }

  function answered(q) {
    var a = bag()[q.id];
    if (a === undefined || a === null) return false;
    if (q.type === 'rank') return Array.isArray(a) && a.length === q.items.length;
    return true;
  }

  function persist() { global.Store.saveDraft(state); }

  // ---------------- 流转 ----------------

  function next() {
    var q = currentQuestion();
    if (!q) return;
    if (!answered(q)) { flash(); return; }

    if (state.index < bank.list.length - 1) {
      state.index += 1;
      renderQuestion();
      return;
    }
    finish();
  }

  function prev() {
    if (state.index > 0) { state.index -= 1; renderQuestion(); }
  }

  /** 全部答完 → 评估 → 跳结果页 */
  function finish() {
    var result = global.Matching.evaluate(bank, figures, state.answers, global.App.bounds);
    var tags = collectTags();
    var token = global.Store.encodeResult(result, tags);

    global.Store.clearDraft();
    global.Store.bumpStats(result.top.figure.id);
    try { global.localStorage.setItem('hzp.last', token); } catch (e) { /* ignore */ }

    global.location.href = 'result.html#r=' + encodeURIComponent(token);
  }

  function collectTags() {
    var tags = [];
    bank.list.forEach(function (q) {
      if (q.type !== 'fun') return;
      var o = q.options[state.answers[q.id]];
      if (o && o.tags) tags = tags.concat(o.tags);
    });
    return tags.slice(0, 3);
  }

  function flash() {
    var card = document.querySelector('.q-card');
    if (!card || !card.animate) return;
    card.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
       { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
      { duration: 220 }
    );
  }

  // ---------------- 初始化 ----------------

  function init() {
    bank = global.App.bank;
    figures = global.App.figures;

    var draft = global.Store.loadDraft();
    if (draft && draft.state) {
      state.answers = draft.state.answers || {};
      state.index = Math.max(0, Math.min(draft.state.index || 0, bank.list.length - 1));
    }

    el('btnNext').addEventListener('click', next);
    el('btnPrev').addEventListener('click', prev);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target && e.target.tagName !== 'BUTTON') { next(); return; }
      if (e.key >= '1' && e.key <= '4') {
        var q = currentQuestion();
        if (q && (q.type === 'sjt' || q.type === 'flip' || q.type === 'fun')) {
          bag()[q.id] = parseInt(e.key, 10) - 1;
          renderQuestion();
        }
      }
    });

    renderQuestion();
  }

  global.Pages = global.Pages || {};
  global.Pages.quiz = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
