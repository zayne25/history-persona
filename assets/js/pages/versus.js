/**
 * 好友对决：把两份结果坐标放在一起比对
 * 关系判定：距离 → 同盟 / 宿敌 / 互补
 */
(function (global) {
  'use strict';

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function coordsOf(payload) {
    var c = {};
    global.Matching.DIMS.forEach(function (d, i) { c[d] = payload.c[i]; });
    return c;
  }

  function relation(a, b) {
    var dist = 0, wsum = 0;
    global.Matching.DIMS.forEach(function (d) {
      var w = global.Matching.WEIGHTS[d];
      var x = a[d] - b[d];
      dist += w * x * x;
      wsum += w;
    });
    var d = Math.sqrt(dist / wsum);            // 0 ~ 100
    // 余弦是去中心化的：null 表示某一方轮廓过于平坦，形状无从比较
    var cos = global.Matching.cosineSim(a, b);
    var shapeAlike = cos !== null && cos > 0.6;
    var label, text;
    if (d < 18) { label = '同盟'; text = '你们几乎站在同一个位置上。好事是彼此一看就懂，坏事是撞起墙来也一起撞。'; }
    else if (d > 55) { label = '宿敌'; text = '你们的分歧不是误会，是根本路线的分歧——互相看不惯，也互相离不开。'; }
    else if (shapeAlike) { label = '互补'; text = '你们的形状很像，只是强弱分布不同。放在一起刚好补上对方的缺口。'; }
    else { label = '同行'; text = '你们不算一路人，但方向大致相同，可以搭伴走一段。'; }
    return { label: label, text: text, distance: Math.round(d) };
  }

  function paint(payloadA, payloadB) {
    var ca = coordsOf(payloadA), cb = coordsOf(payloadB);
    var fa = global.App.getFigure(payloadA.t) || { name: '—', tagline: '' };
    var fb = global.App.getFigure(payloadB.t) || { name: '—', tagline: '' };
    var r = relation(ca, cb);

    el('versusResult').innerHTML =
      '<div class="versus-box">' +
      '<div><canvas id="vsPortraitA"></canvas><h3>' + esc(fa.name) + '</h3>' +
      '<p class="muted">' + esc(fa.tagline) + '</p></div>' +
      '<div class="versus-mid">' + esc(r.label) + '</div>' +
      '<div><canvas id="vsPortraitB"></canvas><h3>' + esc(fb.name) + '</h3>' +
      '<p class="muted">' + esc(fb.tagline) + '</p></div>' +
      '</div>' +
      '<p style="margin-top:18px">' + esc(r.text) + '</p>' +
      '<p class="muted" style="margin-top:10px">六维距离 ' + r.distance + ' / 100（数值越小越像）</p>';

    global.Portrait.draw(el('vsPortraitA'), fa, { size: 150, seal: false });
    global.Portrait.draw(el('vsPortraitB'), fb, { size: 150, seal: false });

    global.UI.drawRadar(el('versusRadar'), ca, cb, { size: 340 });

    var pa = global.Matching.describeProfile(ca), pb = global.Matching.describeProfile(cb);
    el('versusTable').innerHTML =
      '<table class="data"><thead><tr><th>维度</th><th>' + esc(fa.name) + '</th><th>' + esc(fb.name) + '</th></tr></thead><tbody>' +
      pa.map(function (x, i) {
        return '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.label) + '（' + x.value + '）</td><td>' +
          esc(pb[i].label) + '（' + pb[i].value + '）</td></tr>';
      }).join('') +
      '</tbody></table>';
  }

  function init() {
    var me = null, other = null;
    try { me = global.Store.decodeResult(global.localStorage.getItem('hzp.last')); } catch (e) { me = null; }

    var hash = global.location.hash || '';
    var m = /me=([\w.%=-]+)/.exec(hash);
    if (m) me = global.Store.decodeResult(decodeURIComponent(m[1])) || me;

    el('btnCompare').addEventListener('click', function () {
      var token = el('tokenInput').value.trim();
      if (token.indexOf('#r=') >= 0) token = token.split('#r=')[1];
      var p = global.Store.decodeResult(token);
      if (!p) { el('versusHint').textContent = '这个链接读不出来，检查一下有没有复制全。'; return; }
      if (!me) { el('versusHint').textContent = '你还没有自己的结果，先去测一次吧。'; return; }
      el('versusHint').textContent = '';
      paint(me, p);
    });

    el('btnGoQuiz').addEventListener('click', function () { global.location.href = 'quiz.html'; });

    if (me) {
      var f = global.App.getFigure(me.t);
      el('meHint').textContent = f ? ('你的结果是：' + f.name + '。把朋友的链接粘进来试试。') : '';
    } else {
      el('meHint').textContent = '你还没有测过，先去测一次再来比。';
    }
  }

  global.Pages = global.Pages || {};
  global.Pages.versus = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
