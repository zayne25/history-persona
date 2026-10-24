/**
 * 人物长廊：按包 / 领域 / 时代筛选与搜索，点击查看详情
 */
(function (global) {
  'use strict';

  var filter = { pack: '', field: '' };
  var keyword = '';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(id) { return document.getElementById(id); }

  function matched(list) {
    return list.filter(function (f) {
      if (filter.pack && f._pack !== filter.pack) return false;
      if (filter.field && (f.fields || []).indexOf(filter.field) < 0) return false;
      return true;
    });
  }

  function paint() {
    var list = matched(keyword ? global.App.searchFigures(keyword) : global.App.figures);
    var host = el('galleryGrid');
    if (!list.length) {
      host.innerHTML = '<p class="muted">没有匹配的人物，换个词试试。</p>';
      return;
    }
    host.innerHTML = list.map(function (f) {
      return '<a class="figure-card" href="figure.html?id=' + f.id + '">' +
        '<canvas data-portrait="' + f.id + '"></canvas>' +
        '<h4>' + esc(f.name) + '</h4>' +
        '<div class="fc-era">' + esc(f.era) + '</div>' +
        '<div class="fc-tag">「' + esc(f.tagline) + '」</div>' +
        '</a>';
    }).join('');

    // 长廊里画 36 张小图，落印会糊成一团，这里不盖章
    host.querySelectorAll('canvas[data-portrait]').forEach(function (c) {
      global.Portrait.draw(c, global.App.getFigure(c.getAttribute('data-portrait')),
        { size: 128, seal: false });
    });

    el('galleryCount').textContent = '共 ' + list.length + ' 位';
  }

  /** 详情改由 figure.html 独立承载——史料依据与逐维对比放进弹窗太挤，且独立页可分享 */
  function openDetail(id) {
    global.location.href = 'figure.html?id=' + encodeURIComponent(id);
  }

  function buildFilters() {
    var packBox = el('packFilter');
    packBox.innerHTML =
      '<button class="chip is-on" data-pack="">全部</button>' +
      global.App.packs.map(function (p) {
        return '<button class="chip" data-pack="' + p.id + '">' + esc(p.title) + '</button>';
      }).join('');
    packBox.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      filter.pack = b.getAttribute('data-pack');
      packBox.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
      paint();
    });

    var fieldBox = el('fieldFilter');
    var keys = Object.keys(global.UI.FIELD_LABELS);
    fieldBox.innerHTML =
      '<button class="chip is-on" data-field="">不限领域</button>' +
      keys.map(function (k) {
        return '<button class="chip" data-field="' + k + '">' + esc(global.UI.FIELD_LABELS[k]) + '</button>';
      }).join('');
    fieldBox.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      filter.field = b.getAttribute('data-field');
      fieldBox.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
      paint();
    });

    var search = el('gallerySearch');
    search.addEventListener('input', function () {
      keyword = search.value;
      paint();
    });
  }

  function init() {
    buildFilters();
    paint();
    var s = /[?&]s=([^&]+)/.exec(global.location.search);
    if (s) { openDetail(decodeURIComponent(s[1])); }
  }

  global.Pages = global.Pages || {};
  global.Pages.gallery = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
