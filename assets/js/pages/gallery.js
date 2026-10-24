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
      return '<article class="figure-card" data-id="' + f.id + '">' +
        '<canvas data-portrait="' + f.id + '"></canvas>' +
        '<h4>' + esc(f.name) + '</h4>' +
        '<div class="fc-era">' + esc(f.era) + '</div>' +
        '<div class="fc-tag">「' + esc(f.tagline) + '」</div>' +
        '</article>';
    }).join('');

    host.querySelectorAll('canvas[data-portrait]').forEach(function (c) {
      global.UI.drawPortrait(c, global.App.getFigure(c.getAttribute('data-portrait')), { size: 128 });
    });

    host.querySelectorAll('.figure-card').forEach(function (card) {
      card.addEventListener('click', function () {
        openDetail(card.getAttribute('data-id'));
      });
    });

    el('galleryCount').textContent = '共 ' + list.length + ' 位';
  }

  function openDetail(id) {
    var f = global.App.getFigure(id);
    if (!f) return;
    var labels = global.UI.FIELD_LABELS;
    var box = el('detailModal');
    box.hidden = false;
    box.innerHTML =
      '<div class="modal-mask" data-close="1"></div>' +
      '<div class="modal-body panel">' +
      '<button class="modal-close" data-close="1" aria-label="关闭">×</button>' +
      '<div class="modal-head"><canvas id="modalPortrait"></canvas>' +
      '<div><h3>' + esc(f.name) + '</h3>' +
      '<p class="muted">' + esc(f.lifespan) + ' · ' + esc(f.era) + ' · ' +
      f.fields.map(function (x) { return esc(labels[x] || x); }).join(' / ') + '</p>' +
      '<p class="muted">别称：' + (f.alias || []).map(esc).join('、') + '</p></div></div>' +
      '<p style="margin-top:18px">' + esc(f.summary) + '</p>' +
      '<p style="margin-top:12px">' + esc(f.deep) + '</p>' +
      '<h4 style="margin-top:20px;font-family:var(--serif)">行事年表</h4>' +
      '<ul>' + (f.milestones || []).map(function (m) {
        return '<li><strong>' + esc(m.y) + '</strong> · ' + esc(m.t) + '</li>';
      }).join('') + '</ul>' +
      '<h4 style="margin-top:20px;font-family:var(--serif)">性格关键词</h4>' +
      '<div class="tags">' + (f.traits || []).map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join('') + '</div>' +
      '<h4 style="margin-top:20px;font-family:var(--serif)">延伸阅读</h4>' +
      '<ul>' + (f.further || []).map(function (x) {
        return '<li>' + esc(x.t) + '</li>';
      }).join('') + '</ul>' +
      '</div>';

    global.UI.drawPortrait(el('modalPortrait'), f, { size: 140 });

    box.querySelectorAll('[data-close]').forEach(function (n) {
      n.addEventListener('click', function () { box.hidden = true; });
    });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { box.hidden = true; document.removeEventListener('keydown', onEsc); }
    });
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
