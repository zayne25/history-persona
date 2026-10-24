/**
 * 全站引导层
 * - 装载人物包与题库（内容即数据，零构建）
 * - 提供人物检索、领域标签、包切换等公共能力
 * - 注入页头导航与页脚，统一全站框架
 */
(function (global) {
  'use strict';

  var packs = global.FIGURE_PACKS || [];
  var bank = global.QUESTIONS;

  var portraits = global.FIGURE_PORTRAITS || {};

  var figures = [];
  var byId = {};
  packs.forEach(function (p) {
    p.figures.forEach(function (f) {
      f._pack = p.id;
      // 画像的视觉特征单独存放，这里合并进来；缺则用规则兜底，避免画不出来
      f.portrait = portraits[f.id] || {
        robe: f.region === 'china' ? 'hanfu' : 'western',
        head: f.gender === 'female' ? 'zan' : 'jin',
        prop: 'none',
        beard: f.gender === 'male',
        pose: 'stand'
      };
      figures.push(f);
      byId[f.id] = f;
    });
  });

  var bounds = global.Matching ? global.Matching.computeBounds(bank) : null;

  function getFigure(id) { return byId[id] || null; }
  function getPack(id) { return packs.filter(function (p) { return p.id === id; })[0] || null; }
  function listFigures(packId) {
    return packId ? figures.filter(function (f) { return f._pack === packId; }) : figures.slice();
  }

  /** 简单中文/拼音首字母匹配，便于长廊搜索 */
  function searchFigures(kw) {
    var k = String(kw || '').trim().toLowerCase();
    if (!k) return figures.slice();
    return figures.filter(function (f) {
      if (f.name.indexOf(k) >= 0) return true;
      if (f.era.indexOf(k) >= 0) return true;
      if (String(f.region).indexOf(k) >= 0) return true;
      return (f.alias || []).some(function (a) { return String(a).toLowerCase().indexOf(k) >= 0; })
        || (f.traits || []).some(function (t) { return String(t).indexOf(k) >= 0; });
    });
  }

  var NAV = [
    { href: 'index.html', label: '首页' },
    { href: 'quiz.html', label: '开始测试' },
    { href: 'gallery.html', label: '人物长廊' },
    { href: 'versus.html', label: '好友对决' },
    { href: 'analysis.html', label: '数据分析' },
    { href: 'about.html', label: '方法与说明' }
  ];

  function mountShell(active) {
    var header = document.querySelector('[data-shell="header"]');
    if (header) {
      header.innerHTML =
        '<a class="brand" href="index.html">' +
        '<span class="brand-seal">史</span>' +
        '<span class="brand-text">你在历史中的名字</span></a>' +
        '<nav class="nav">' +
        NAV.map(function (n) {
          var cls = n.href === active ? 'is-active' : '';
          return '<a class="' + cls + '" href="' + n.href + '">' + n.label + '</a>';
        }).join('') +
        '</nav>';
    }
    var footer = document.querySelector('[data-shell="footer"]');
    if (footer) {
      footer.innerHTML =
        '<p>共收录 <strong>' + figures.length + '</strong> 位历史人物 · 题库 <strong>' +
        (bank ? bank.list.length : 0) + '</strong> 题</p>' +
        '<p class="muted">本产品为文化娱乐向内容，不是心理诊断工具。所有人物描述均为基于史料倾向的娱乐化概括。</p>';
    }
  }

  global.App = {
    packs: packs,
    figures: figures,
    bank: bank,
    bounds: bounds,
    getFigure: getFigure,
    getPack: getPack,
    listFigures: listFigures,
    searchFigures: searchFigures,
    mountShell: mountShell,
    fieldLabels: global.UI ? global.UI.FIELD_LABELS : {}
  };

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-page') || '';
    mountShell(page + '.html');
    if (global.Pages && global.Pages[page]) {
      try { global.Pages[page].init(); }
      catch (e) { console.error('页面初始化失败:', page, e); }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
