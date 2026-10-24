/**
 * 数据分析页：把 tools/analyze.js 的体检结果讲清楚
 *
 * 编排原则：先给结论，再给证据，最后交代方法与局限。
 * 每个指标都必须带「阈值」和「为什么是这个阈值」，否则数字本身没有说服力。
 */
(function (global) {
  'use strict';

  var D = global.ANALYSIS_DATA;

  /** 本轮实测修复记录：这些数字全部来自同一套模拟，可复现 */
  var FIXES = [
    {
      title: '余弦相似度退化，匹配度虚高',
      before: '展示匹配度中位数 97%',
      after: '中位数 82%',
      why: '六维坐标全为正，任意两人的余弦都趋近 1，等于「谁都相似」。改为先减去中位再算余弦（皮尔逊式），衡量的才是轮廓形状。'
    },
    {
      title: '坐标被理论极值压扁',
      before: '最热人物占 18.8%，区分度 14.9',
      after: '最热人物占 11.2%，区分度 22.5',
      why: '「遍历所有可能作答」得到的理论极值远宽于真实作答范围，min-max 后坐标全挤在中段。改用 4000 份模拟的 p1/p99 实测分位数标定。'
    },
    {
      title: '认真用户被误判为「随性」',
      before: '误伤率 30.1%',
      after: '误伤率 2.6%',
      why: '只有 2 组反向题时，用「矛盾比例 ≥ 0.5」判定等价于 1 处矛盾即随性。改为必须至少 2 处矛盾才判随性。'
    },
    {
      title: '展示口径没有标定',
      before: '仅 10.6% 的匹配度落在 70–95',
      after: '90.9% 落在 70–95',
      why: '分段映射的锚点最初是拍脑袋定的，与实测分数分布对不上。按体检得到的分位数重新标定锚点。'
    },
    {
      title: '决胜题只在平局时出现，反而损害稳定性',
      before: '重测信度 63.7%',
      after: '重测信度 64.5%，且流程更简单',
      why: '两次作答一次触发加试、一次没触发，结果必然不同。把 3 道决胜题并入常规题库（24 → 27 题），消除这个不确定性。'
    }
  ];

  var LIMITS = [
    '模拟用户不等于真实用户。这里的人格由「六维正态分布 + 按倾向作答」生成，真实人群的分布形态、作答时的犹豫程度都只能近似，因此所有指标应视为<strong>量级参考</strong>，而非精确预测。',
    '重测信度是<strong>保守下界</strong>。模拟中假设用户两次作答时在两难选项间完全独立地重新犹豫；真实重测往往更稳定（人对自己倾向明确的题不会改口）。因此真实信度大概率高于报告值。',
    '「最热人物占比」与「HHI」受人群分布假设影响最大。若真实用户比模拟更极化，集中度会进一步下降；反之若真实用户更中庸，则中心人物会继续偏热。',
    '人物六维坐标是基于史料的<strong>倾向性概括</strong>，不是学术结论。体检能验证「分布是否健康」，无法验证「标定是否准确」——后者只能靠史料依据与人工复核（见人物长廊中每位人物的标定依据）。',
    '本报告只覆盖匹配算法与题库，不覆盖界面可用性、加载性能与分享转化，这些需要真实流量数据。',
    '<strong>重测信度 64.5% 未达 70% 的目标</strong>，这是当前唯一的未达标项。提升路径只有两条：继续增加题目（信噪比与题数的平方根成正比，推算需约 33 题才能到 70%），或降低单题噪声敏感度——即重写选项让各选项的维度差异更悬殊。前者会把答题时长推到 7 分钟以上，超出 4–6 分钟的设计目标，因此暂未采纳。',
    '<strong>乱答识别率 65.8% 属于勉强达标</strong>。只有 2 组反向题时，随机乱点仍有约三分之一概率「恰好不矛盾」。增加到 3 组反向题可把识别率提到约 80%，代价是多 2 道题；考虑到「随性」标签只是结果页的文案彩蛋、不影响匹配结果本身，当前选择了保住答题时长。'
  ];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(id) { return document.getElementById(id); }

  /** 容器可用宽度，用于让图表在窄屏上自适应 */
  function widthOf(host, cap) {
    var w = host.clientWidth || cap;
    return Math.max(280, Math.min(cap || 720, w - 4));
  }

  function addCanvas(host, cap) {
    var c = document.createElement('canvas');
    host.appendChild(c);
    return { canvas: c, width: widthOf(host, cap) };
  }

  // ---------------- 结论横幅 ----------------
  function renderBanner() {
    var tone = D.overall === 'pass' ? 'pass' : (D.overall === 'warn' ? 'warn' : 'fail');
    var title = { pass: '全部指标通过', warn: '基本健康，个别指标需关注', fail: '存在明显缺陷' }[tone];
    var lead = D.overall === 'pass'
      ? '十项体检全部通过。'
      : (D.totalChecks - D.passedCount) + ' 项未达标，已在下方明确标注原因与改进方向。';

    el('verdictBanner').innerHTML =
      '<div class="verdict-banner is-' + tone + '">' +
      '<div class="verdict-score"><strong>' + D.passedCount + '</strong><span>/ ' + D.totalChecks + '</span></div>' +
      '<div><h3>' + esc(title) + '</h3><p>' + esc(lead) + '</p>' +
      '<p class="muted">样本 ' + D.meta.sampleSize + ' 份 · 重测 ' + D.meta.retestPairs +
      ' 对 · 随机种子 ' + D.meta.seed + ' · 生成于 ' + D.meta.generatedAt + '</p></div>' +
      '</div>';
  }

  // ---------------- 指标卡 ----------------
  function renderVerdicts() {
    el('verdictGrid').innerHTML = D.verdicts.map(function (v) {
      return '<div class="metric-card ' + (v.pass ? 'is-pass' : 'is-fail') + '">' +
        '<div class="metric-head">' +
        '<span class="metric-state">' + (v.pass ? '通过' : '未达标') + '</span>' +
        '<span class="metric-label">' + esc(v.label) + '</span>' +
        '</div>' +
        '<div class="metric-value">' + v.value + '<span class="metric-unit">' + esc(v.unit) + '</span></div>' +
        '<div class="metric-threshold">判据：' + (v.pass ? '≥' : '≥') + ' ' + v.threshold + esc(v.unit) + '</div>' +
        '<p class="metric-note">' + esc(v.note) + '</p>' +
        '</div>';
    }).join('');
  }

  // ---------------- 图表 ----------------
  function renderDist() {
    var host = el('chartDist');
    var m = addCanvas(host, 720);
    global.Charts.hbar(m.canvas, {
      items: D.distribution.items.map(function (x) {
        return {
          label: x.name,
          value: x.share,
          color: x.share > 0.12 ? global.Charts.COLORS.red : global.Charts.COLORS.blue
        };
      }),
      max: Math.max(0.14, D.distribution.items[0].share * 1.1),
      threshold: 0.12,
      thresholdLabel: '集中度上限 12%',
      width: m.width,
      padL: 66,
      rowH: 18,
      format: function (v) { return (v * 100).toFixed(1) + '%'; }
    });
    host.insertAdjacentHTML('beforeend',
      '<p class="muted" style="margin-top:10px">共 ' +
      D.distribution.items.filter(function (x) { return x.count > 0; }).length +
      ' / ' + D.meta.figureCount + ' 位人物被命中；均匀分布的基准是 ' +
      (D.distribution.evenShare * 100).toFixed(1) + '%。</p>');
  }

  function renderCareful() {
    var host = el('chartCareful');
    var g = D.distribution.byGroup.filter(function (x) { return x.key === 'careful'; })[0];
    if (!g) return;
    var m = addCanvas(host, 720);
    global.Charts.hbar(m.canvas, {
      items: g.items.slice(0, 12).map(function (x) {
        return { label: x.name, value: x.share, color: global.Charts.COLORS.blue };
      }),
      width: m.width,
      padL: 66,
      rowH: 18,
      format: function (v) { return (v * 100).toFixed(1) + '%'; }
    });
  }

  function renderDimCharts() {
    var host = el('dimCharts');
    D.dims.forEach(function (d) {
      var box = document.createElement('div');
      box.innerHTML = '<h4 style="font-family:var(--serif);font-size:15px">' +
        esc(d.name) + ' <span class="muted">' + esc(d.neg) + ' — ' + esc(d.pos) + '</span></h4>';
      host.appendChild(box);
      var c = document.createElement('canvas');
      box.appendChild(c);
      global.Charts.histogram(c, {
        bins: d.histogram, min: 0, max: 100,
        width: widthOf(box, 340), height: 150,
        xLabel: '0（' + d.neg + '） → 100（' + d.pos + '）'
      });
      box.insertAdjacentHTML('beforeend',
        '<p class="muted">均值 ' + d.mean + ' · 标准差 ' + d.sd + ' · 实际范围 ' + d.min + '–' + d.max + '</p>');
    });
  }

  function renderDimSd() {
    var host = el('chartDimSd');
    var m = addCanvas(host, 720);
    global.Charts.hbar(m.canvas, {
      items: D.dims.map(function (d) {
        return {
          label: d.name,
          value: d.sd,
          color: d.sd < 12 ? global.Charts.COLORS.red : global.Charts.COLORS.blue
        };
      }),
      max: 30, threshold: 12, thresholdLabel: '区分度下限 12',
      width: m.width, padL: 66, rowH: 22
    });
  }

  function renderDisplay() {
    var host = el('chartDisplay');
    var m = addCanvas(host, 720);
    global.Charts.histogram(m.canvas, {
      bins: D.display.histogram, min: 40, max: 100,
      band: [70, 95], bandLabel: '设计目标区间',
      width: m.width, height: 210,
      xLabel: '对外展示的匹配度'
    });
    host.insertAdjacentHTML('beforeend',
      '<p class="muted" style="margin-top:10px">最低 ' + D.display.min + '% · 第 10 百分位 ' + D.display.p10 +
      '% · 中位数 ' + D.display.p50 + '% · 第 90 百分位 ' + D.display.p90 + '% · 最高 ' + D.display.max + '%</p>');
  }

  function renderCredibility() {
    var host = el('chartCredibility');
    var colorOf = { high: global.Charts.COLORS.green, mid: global.Charts.COLORS.gold, low: global.Charts.COLORS.red };
    var m = addCanvas(host, 720);
    global.Charts.stacked(m.canvas, {
      groups: D.credibility.map(function (g) {
        return {
          label: g.name,
          parts: g.levels.map(function (lv) { return { value: lv.share, color: colorOf[lv.level] }; })
        };
      }),
      legend: [
        { label: '自洽', color: colorOf.high },
        { label: '摇摆', color: colorOf.mid },
        { label: '随性', color: colorOf.low }
      ],
      width: m.width, height: 140
    });
  }

  // ---------------- 说明区块 ----------------
  function renderFixes() {
    el('fixList').innerHTML = FIXES.map(function (f) {
      return '<div class="fix-row">' +
        '<div class="fix-title">' + esc(f.title) + '</div>' +
        '<div class="fix-numbers"><span class="fix-before">' + esc(f.before) + '</span>' +
        '<span class="fix-arrow">→</span>' +
        '<span class="fix-after">' + esc(f.after) + '</span></div>' +
        '<p class="muted">' + esc(f.why) + '</p>' +
        '</div>';
    }).join('');
  }

  function renderMethod() {
    el('methodBox').innerHTML =
      '<table class="data"><tbody>' +
      '<tr><td>样本量</td><td>' + D.meta.sampleSize + ' 份完整作答</td></tr>' +
      '<tr><td>重测对数</td><td>' + D.meta.retestPairs + ' 对</td></tr>' +
      '<tr><td>随机种子</td><td>' + D.meta.seed + '（固定，结果可复现）</td></tr>' +
      '<tr><td>人群构成</td><td>认真作答 35% · 一般作答 50% · 乱点作答 15%</td></tr>' +
      '<tr><td>人格生成</td><td>六维独立正态，均值 50、标准差 22，截断至 3–97</td></tr>' +
      '<tr><td>作答建模</td><td>按人格倾向选择最一致的选项；「一致性」参数控制随机作答的比例</td></tr>' +
      '<tr><td>重测定义</td><td>同一人格两次独立作答（一致性 1.0，仅保留选项间犹豫噪声），比较 Top1 是否相同</td></tr>' +
      '<tr><td>复现方式</td><td><code>node tools/analyze.js</code></td></tr>' +
      '</tbody></table>';
  }

  function renderLimits() {
    el('limitsBox').innerHTML = '<ol class="limit-list">' +
      LIMITS.map(function (s) { return '<li>' + s + '</li>'; }).join('') +
      '</ol>';
  }

  function init() {
    if (!D) {
      el('verdictBanner').innerHTML =
        '<div class="verdict-banner is-fail"><div><h3>缺少分析数据</h3>' +
        '<p>请先在项目根目录执行 <code>node tools/analyze.js</code> 生成体检数据。</p></div></div>';
      return;
    }
    renderBanner();
    renderVerdicts();
    renderDist();
    renderCareful();
    renderDimCharts();
    renderDimSd();
    renderDisplay();
    renderCredibility();
    renderFixes();
    renderMethod();
    renderLimits();

    var onResize = null;
    global.addEventListener('resize', function () {
      if (onResize) global.clearTimeout(onResize);
      onResize = global.setTimeout(function () {
        ['chartDist', 'chartCareful', 'dimCharts', 'chartDimSd', 'chartDisplay', 'chartCredibility']
          .forEach(function (id) { var h = el(id); if (h) h.innerHTML = ''; });
        renderDist(); renderCareful(); renderDimCharts(); renderDimSd(); renderDisplay(); renderCredibility();
      }, 220);
    });
  }

  global.Pages = global.Pages || {};
  global.Pages.analysis = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
