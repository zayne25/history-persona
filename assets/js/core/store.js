/**
 * 本地存储层
 * - 答题草稿（7 天内可续答）
 * - 结果令牌编码 / 解码 / 签名（无需服务端即可复现结果）
 * - 本地统计（参与次数、人物热度种子）
 *
 * 隐私原则：默认不上传任何作答数据，仅在本地保留。
 */
(function (global) {
  'use strict';

  var DRAFT_KEY = 'hzp.draft.v1';
  var STATS_KEY = 'hzp.stats.v1';
  var DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
  var TOKEN_VERSION = 'r1';

  function safeGet(key) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function safeSet(key, val) {
    try { global.localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  // ---------------- 草稿 ----------------

  function saveDraft(state) {
    return safeSet(DRAFT_KEY, { t: Date.now(), state: state });
  }

  function loadDraft() {
    var d = safeGet(DRAFT_KEY);
    if (!d || !d.t) return null;
    if (Date.now() - d.t > DRAFT_TTL) { clearDraft(); return null; }
    return d;
  }

  function clearDraft() {
    try { global.localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
  }

  // ---------------- 统计 ----------------

  function bumpStats(figureId) {
    var s = safeGet(STATS_KEY) || { plays: 0, figures: {}, last: null };
    s.plays = (s.plays || 0) + 1;
    s.last = figureId;
    if (figureId) s.figures[figureId] = (s.figures[figureId] || 0) + 1;
    safeSet(STATS_KEY, s);
    return s;
  }

  function getStats() {
    return safeGet(STATS_KEY) || { plays: 0, figures: {}, last: null };
  }

  // ---------------- 结果令牌 ----------------

  /** 轻量字符串哈希（同步、无依赖，用于防手改 URL） */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h.toString(36);
  }

  function toBase64Url(str) {
    var b64 = global.btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromBase64Url(s) {
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return decodeURIComponent(escape(global.atob(b64)));
  }

  /**
   * 编码结果令牌
   * @param {object} result evaluate() 的返回
   * @param {string[]} tags 趣味题关键词
   */
  var DIMS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];

  function encodeResult(result, tags) {
    var payload = {
      v: TOKEN_VERSION,
      c: DIMS.map(function (d) { return Math.round(result.coords[d]); }),
      t: result.top.figure.id,
      r: result.runnerUps.map(function (x) { return x.figure.id; }),
      o: result.opposite.figure.id,
      g: tags || []
    };
    var body = toBase64Url(JSON.stringify(payload));
    var sig = hash(body + TOKEN_VERSION);
    return body + '.' + sig;
  }

  /** 解码；签名不符返回 null */
  function decodeResult(token) {
    if (!token) return null;
    var parts = String(token).split('.');
    if (parts.length !== 2) return null;
    if (hash(parts[0] + TOKEN_VERSION) !== parts[1]) return null;
    try {
      var p = JSON.parse(fromBase64Url(parts[0]));
      if (p.v !== TOKEN_VERSION) return null;
      return p;
    } catch (e) { return null; }
  }

  /** 把令牌写进地址栏哈希，刷新/分享都不会丢 */
  function writeTokenToUrl(token) {
    try { global.location.hash = 'r=' + token; } catch (e) { /* ignore */ }
  }

  function readTokenFromUrl() {
    try {
      var m = /r=([\w.-]+)/.exec(global.location.hash || '');
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  global.Store = {
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    clearDraft: clearDraft,
    bumpStats: bumpStats,
    getStats: getStats,
    encodeResult: encodeResult,
    decodeResult: decodeResult,
    writeTokenToUrl: writeTokenToUrl,
    readTokenFromUrl: readTokenFromUrl
  };
})(typeof window !== 'undefined' ? window : globalThis);
