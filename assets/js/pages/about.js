/**
 * 方法说明页：算法透明、维度定义、人物选取规则、隐私与免责
 * 这一页是产品可信度的护城河，不是附属品。
 */
(function (global) {
  'use strict';

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function init() {
    var M = global.Matching;

    // 维度表
    el('aboutDims').innerHTML =
      '<table class="data"><thead><tr><th>维度</th><th>负极 0</th><th>正极 100</th><th>权重</th></tr></thead><tbody>' +
      M.DIM_META.map(function (m) {
        return '<tr><td>' + esc(m.name) + '</td><td>' + esc(m.neg) + '</td><td>' + esc(m.pos) +
          '</td><td>' + m.weight + '</td></tr>';
      }).join('') + '</tbody></table>';

    // 当前参数
    el('aboutConfig').innerHTML =
      '<table class="data"><tbody>' +
      '<tr><td>余弦（形状）权重 α</td><td>' + M.MATCH_CONFIG.alpha + '</td></tr>' +
      '<tr><td>稀有度微调 λ</td><td>' + M.MATCH_CONFIG.lambda + '</td></tr>' +
      '<tr><td>特殊结局阈值</td><td>' + M.MATCH_CONFIG.lowScoreThreshold + '</td></tr>' +
      '<tr><td>平局判定阈值</td><td>' + M.MATCH_CONFIG.tieGap + '</td></tr>' +
      '<tr><td>排序题位次权重</td><td>' + M.MATCH_CONFIG.rankWeights.join(' / ') + '</td></tr>' +
      '</tbody></table>';

    // 题型配比
    var bank = global.App.bank;
    var byType = {}, byAct = {};
    bank.list.forEach(function (q) {
      byType[q.type] = (byType[q.type] || 0) + 1;
      byAct[q.act] = (byAct[q.act] || 0) + 1;
    });
    var typeName = { sjt: '情境判断', rank: '优先级排序', slider: '价值滑杆', flip: '反向自检', fun: '趣味轻量' };
    var actName = { ice: '破冰', core: '核心', final: '收束' };
    el('aboutBank').innerHTML =
      '<table class="data"><thead><tr><th>题型</th><th>题数</th><th>作用</th></tr></thead><tbody>' +
      Object.keys(typeName).map(function (k) {
        var note = {
          sjt: '主力计分，每题刻画 2–3 个维度',
          rank: '拉开强度差，比单选信息量大得多',
          slider: '直接校准某一维度的强度',
          flip: '前后一致性检测，生成可信度标签',
          fun: '不计入坐标，生成结果关键词'
        }[k];
        return '<tr><td>' + esc(typeName[k]) + '</td><td>' + (byType[k] || 0) + '</td><td>' + esc(note) + '</td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<p class="muted" style="margin-top:10px">幕次分布：' +
      Object.keys(actName).map(function (k) { return esc(actName[k]) + ' ' + (byAct[k] || 0) + ' 题'; }).join(' · ') +
      '</p>';
  }

  global.Pages = global.Pages || {};
  global.Pages.about = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
