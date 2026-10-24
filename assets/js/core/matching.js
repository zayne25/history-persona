/**
 * 匹配算法核心
 * 纯函数、无 DOM 依赖，可在浏览器与 Node 中同时运行（自检脚本即复用此文件）。
 *
 * 流程：
 *   1. 原始分   raw_d = Σ w_q · Δ(q,d)
 *   2. 标准化   按题库理论极值做 min-max 归一 → 0~100
 *   3. 相似度   S = 100 · (α·S_cos + (1−α)·S_dist)
 *   4. 平衡调优 S' = S − λ·(热度 − 0.5)
 *   5. 排序     Top1 / Top2 / Top3 / 最远 1 人
 *   6. 口径     对外展示值做单调分段再标定
 */
(function (global) {
  'use strict';

  var DIMS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];

  /** 六维定义：负极(0) —— 正极(100) */
  var DIM_META = [
    { key: 'D1', name: '义利观', neg: '守义', pos: '图功', weight: 1.3,
      desc: '道德两难时的取舍：是守住内心的规矩，还是先把事情做成。' },
    { key: 'D2', name: '行动力', neg: '静水', pos: '雷霆', weight: 1.3,
      desc: '信息不全时的出手时机：谋定后动，还是先干再说。' },
    { key: 'D3', name: '人际取向', neg: '独行', pos: '群策', weight: 1.0,
      desc: '能量来源：一个人拿主意，还是把人攒起来一起干。' },
    { key: 'D4', name: '思维方式', neg: '建制', pos: '权变', weight: 1.0,
      desc: '解决问题的默认路径：先立规矩与系统，还是因势而变、临场破局。' },
    { key: 'D5', name: '情感驱动', neg: '冷澈', pos: '深情', weight: 0.9,
      desc: '情绪在判断中的权重：让不让心情影响决定。' },
    { key: 'D6', name: '表达形态', neg: '立功', pos: '立言', weight: 0.9,
      desc: '自我实现的出口：在事情上证明，还是在文辞上留下。' }
  ];

  /** 可调参数：支持热更新 / A-B 实验 */
  var MATCH_CONFIG = {
    alpha: 0.35,               // 余弦(形状)相似度权重；调高=重「形似」
    lambda: 3,                 // 稀有度微调强度
    lowScoreThreshold: 55,     // 低于此值触发特殊结局
    tieGap: 4,                 // Top1/Top2 分差小于此值 → 追加决胜题（原为 2，实测信度不足）
    flatThreshold: 10,         // 用户轮廓离散度低于此值时，余弦不可靠，退化为距离口径
    sliderRange: 10,           // 滑杆取值 ±10
    rankWeights: [3, 2, 1, 0]  // 排序题位次权重
  };

  /** 对外展示口径：原始分 → 展示匹配度（单调分段线性，永不 100%） */
  /**
   * 对外展示口径：原始分 → 展示匹配度（单调分段线性，永不 100%）
   * 锚点由体检结果标定：让中位数落在 84 附近，八成用户落在 70–95 的舒适区间。
   */
  var DISPLAY_MAP = [
    [0, 38], [40, 48], [55, 60], [68, 71], [82, 84], [90, 92], [97, 96]
  ];

  var WEIGHTS = {};
  DIM_META.forEach(function (m) { WEIGHTS[m.key] = m.weight; });

  function zeroVec() {
    var v = {};
    DIMS.forEach(function (d) { v[d] = 0; });
    return v;
  }

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  function permute(arr) {
    if (arr.length <= 1) return [arr];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var rest = arr.slice(0, i).concat(arr.slice(i + 1));
      permute(rest).forEach(function (p) { out.push([arr[i]].concat(p)); });
    }
    return out;
  }

  /**
   * 单个题目的增量贡献
   * @param {object} q 题目
   * @param {*} ans 作答：单选为索引；排序为索引数组；滑杆为数值
   * @returns {{dims:object, tags:string[]}}
   */
  function answerDelta(q, ans) {
    var dims = zeroVec();
    var tags = [];
    var i;
    if (q.type === 'sjt' || q.type === 'flip') {
      var opt = q.options[ans];
      if (opt && opt.d) { for (i in opt.d) dims[i] += opt.d[i]; }
      return { dims: dims, tags: tags };
    }
    if (q.type === 'fun') {
      var of = q.options[ans];
      if (of && of.tags) tags = tags.concat(of.tags);
      return { dims: dims, tags: tags };
    }
    if (q.type === 'rank') {
      var order = Array.isArray(ans) ? ans : [];
      var w = MATCH_CONFIG.rankWeights;
      for (var pos = 0; pos < order.length; pos++) {
        var item = q.items[order[pos]];
        if (!item || !item.d) continue;
        for (i in item.d) dims[i] += item.d[i] * w[pos] / w[0];
      }
      return { dims: dims, tags: tags };
    }
    if (q.type === 'slider') {
      var v = typeof ans === 'number' ? ans : 0;
      v = clamp(v, -MATCH_CONFIG.sliderRange, MATCH_CONFIG.sliderRange);
      dims[q.dim] += v;
      return { dims: dims, tags: tags };
    }
    return { dims: dims, tags: tags };
  }

  /** 枚举某题在某一维度上的理论最小/最大值 */
  function questionBounds(q, d) {
    var min = Infinity, max = -Infinity, i, k;
    if (q.type === 'sjt' || q.type === 'flip') {
      q.options.forEach(function (o) {
        var v = (o.d && o.d[d]) || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      });
      return { min: min, max: max };
    }
    if (q.type === 'slider') {
      if (q.dim === d) return { min: -MATCH_CONFIG.sliderRange, max: MATCH_CONFIG.sliderRange };
      return { min: 0, max: 0 };
    }
    if (q.type === 'rank') {
      var idx = q.items.map(function (_, ix) { return ix; });
      permute(idx).forEach(function (p) {
        var sum = 0, w = MATCH_CONFIG.rankWeights;
        for (var pos = 0; pos < p.length; pos++) {
          var it = q.items[p[pos]];
          sum += ((it.d && it.d[d]) || 0) * w[pos] / w[0];
        }
        if (sum < min) min = sum;
        if (sum > max) max = sum;
      });
      return { min: min, max: max };
    }
    return { min: 0, max: 0 };
  }

  /** 预计算全题库在六维上的理论极值（用于跨会话可比的标准化） */
  /**
   * 归一化所需的极值
   * 优先使用题库自带的经验标定 config.calib；没有时才退回理论极值。
   * @see questions.js config.calib 的注释，说明了为什么两者差异很大。
   */
  function computeBounds(bank) {
    if (bank && bank.config && bank.config.calib) return bank.config.calib;
    var bounds = {};
    DIMS.forEach(function (d) {
      var lo = 0, hi = 0;
      bank.list.forEach(function (q) {
        if (q.type === 'fun') return;
        var b = questionBounds(q, d);
        var w = typeof q.weight === 'number' ? q.weight : 1;
        lo += b.min * w;
        hi += b.max * w;
      });
      bounds[d] = { min: lo, max: hi };
    });
    return bounds;
  }

  /** 累加原始分 */
  function rawScores(bank, answers) {
    var raw = zeroVec();
    bank.list.forEach(function (q) {
      if (q.type === 'fun') return;
      if (!answers || answers[q.id] === undefined || answers[q.id] === null) return;
      var delta = answerDelta(q, answers[q.id]);
      var w = typeof q.weight === 'number' ? q.weight : 1;
      DIMS.forEach(function (d) { raw[d] += delta.dims[d] * w; });
    });
    return raw;
  }

  /** 标准化 → 0~100 坐标 */
  function normalize(raw, bounds) {
    var t = zeroVec();
    DIMS.forEach(function (d) {
      var lo = bounds[d].min, hi = bounds[d].max;
      var span = hi - lo;
      t[d] = span <= 0 ? 50 : clamp((raw[d] - lo) / span * 100, 0, 100);
    });
    return t;
  }

  /** 加权欧氏距离 → 距离相似度 */
  function distanceSim(a, b) {
    var acc = 0, wsum = 0;
    DIMS.forEach(function (d) {
      var w = WEIGHTS[d];
      var diff = a[d] - b[d];
      acc += w * diff * diff;
      wsum += w;
    });
    var dist = Math.sqrt(acc / wsum) / 100;
    return 1 - dist;
  }

  /**
   * 加权余弦相似度（去中心 / 皮尔逊式）
   *
   * 直接用原始坐标算余弦会退化：六维坐标全为正，任意两人的余弦都趋近 1，
   * 结果是「谁都相似」，分数被整体抬到 89 附近，人人显示 97% 匹配——数字失去意义。
   * 因此先减去中位 50 再算余弦，衡量的是「轮廓起伏是否同形」，而非绝对位置高低。
   *
   * @returns {number|null} null 表示用户轮廓过于平坦，形状无法判定，调用方应退化为距离口径
   */
  function cosineSim(a, b) {
    var dot = 0, na = 0, nb = 0;
    DIMS.forEach(function (d) {
      var w = WEIGHTS[d];
      var x = a[d] - 50, y = b[d] - 50;
      dot += w * x * y;
      na += w * x * x;
      nb += w * y * y;
    });
    if (na <= 0 || nb <= 0) return null;

    // 用户轮廓若过于平坦（各维都贴着中位），去中心后的向量太短，余弦不可靠
    var wsum = 0;
    DIMS.forEach(function (d) { wsum += WEIGHTS[d]; });
    if (Math.sqrt(na / wsum) < MATCH_CONFIG.flatThreshold) return null;

    return dot / Math.sqrt(na * nb);
  }

  /** 融合相似度：形状(余弦) × α + 强度(距离) × (1−α) */
  function similarity(a, b) {
    var dis = distanceSim(a, b);
    var c = cosineSim(a, b);
    var cos = (c === null) ? dis : c;      // 平坦轮廓退化为距离口径，避免出现假高分
    var s = 100 * (MATCH_CONFIG.alpha * cos + (1 - MATCH_CONFIG.alpha) * dis);
    return { cos: cos, dist: dis, score: s, flat: c === null };
  }

  /** 展示口径再标定：单调分段线性插值 */
  function displayScale(x) {
    var m = DISPLAY_MAP;
    if (x <= m[0][0]) return m[0][1];
    for (var i = 1; i < m.length; i++) {
      if (x <= m[i][0]) {
        var x0 = m[i - 1][0], y0 = m[i - 1][1], x1 = m[i][0], y1 = m[i][1];
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      }
    }
    return m[m.length - 1][1];
  }

  /**
   * 反向题一致性检测
   * 取每对 flip 题在其主维度上的贡献，若两题方向相反则记为一次矛盾。
   */
  function consistency(bank, answers) {
    var conflicts = 0, pairs = 0, details = [];
    bank.list.forEach(function (q) {
      if (q.type !== 'flip' || !q.reverse) return;      // 只遍历「反向」那一半，避免重复
      var other = bank.list.filter(function (x) { return x.id === q.pair; })[0];
      if (!other) return;
      if (answers[q.id] === undefined || answers[other.id] === undefined) return;

      // 约定：同一组的两道题，其 d 都写成「该维度真实方向上的贡献」，
      // 即使题目是反向表述（如「最让你想抽身的」），赋分也已完成取反。
      // 因此一致性判定直接比对两个贡献的符号即可。
      var dA = answerDelta(other, answers[other.id]).dims;
      var dB = answerDelta(q, answers[q.id]).dims;

      // 找出该对题目覆盖的所有维度
      var dims = {};
      Object.keys(dA).concat(Object.keys(dB)).forEach(function (d) { dims[d] = true; });
      Object.keys(dims).forEach(function (d) {
        var va = dA[d], vb = dB[d];
        if (va === 0 || vb === 0) return;
        pairs += 1;
        if (va * vb < 0) { conflicts += 1; details.push(d); }
      });
    });
    return { pairs: pairs, conflicts: conflicts, dims: details };
  }

  /** 可信度标签 */
  function credibilityLabel(c) {
    if (!c.pairs) return { level: 'unknown', label: '未检测', note: '' };
    var ratio = c.conflicts / c.pairs;
    // 必须至少有 2 处矛盾才判「随性」：只有 1 处时属于正常摇摆。
    // 早期版本用 ratio ≥ 0.5 判定，在只有 2 组反向题时等价于「1 处矛盾即随性」，
    // 实测把 30% 的认真用户误判为随性，因此改为绝对数量门槛。
    if (c.conflicts >= 2 && ratio >= 0.34) {
      return { level: 'low', label: '随性', note: '你的几处回答前后矛盾——这本身就挺有性格。' };
    }
    if (ratio > 0) {
      return { level: 'mid', label: '大致一致', note: '基本自洽，中间有几处摇摆。' };
    }
    return { level: 'high', label: '相当自洽', note: '前后一致，对自己的判断心里有数。' };
  }

  /**
   * 主入口：由作答得到完整结果
   * @param {object} bank  题库
   * @param {object[]} figures 人物列表
   * @param {object} answers 作答 {qid: value}
   * @param {object=} bounds 预计算的极值（可选，缺省时自动计算）
   */
  /**
   * 由坐标直接得到排序结果（用于结果页复现：只需令牌，无需原始作答）
   */
  function evaluateCoords(coords, figures) {
    var scored = figures.map(function (f) {
      var sim = similarity(coords, f.vector);
      var adjusted = sim.score - MATCH_CONFIG.lambda * ((f.popularity || 0.5) - 0.5);
      return {
        figure: f,
        cos: sim.cos,
        dist: sim.dist,
        score: sim.score,
        adjusted: adjusted,
        display: Math.round(displayScale(adjusted))
      };
    });

    scored.sort(function (x, y) { return y.adjusted - x.adjusted; });

    var top = scored[0];
    var runnerUp = scored[1];
    var gap = runnerUp ? top.adjusted - runnerUp.adjusted : 99;

    return {
      coords: coords,
      ranked: scored,
      top: top,
      runnerUps: scored.slice(1, 3),
      opposite: scored[scored.length - 1],
      gap: gap,
      needTieBreak: gap < MATCH_CONFIG.tieGap,
      isUnrecorded: top.adjusted < MATCH_CONFIG.lowScoreThreshold
    };
  }

  function evaluate(bank, figures, answers, bounds) {
    var b = bounds || computeBounds(bank);
    var raw = rawScores(bank, answers);
    var t = normalize(raw, b);
    var cred = consistency(bank, answers);

    var rankedResult = evaluateCoords(t, figures);
    rankedResult.raw = raw;
    rankedResult.credibility = cred;
    rankedResult.credibilityLabel = credibilityLabel(cred);
    rankedResult.tieBreakPool = bank.config ? bank.config.tieBreakPool : [];
    return rankedResult;
  }

  /** 生成坐标的文字画像（用于结果页与分享卡） */
  function describeProfile(t) {
    return DIM_META.map(function (m) {
      var v = t[m.key];
      var pole, text;
      if (v < 40) { pole = 'neg'; text = m.neg; }
      else if (v > 60) { pole = 'pos'; text = m.pos; }
      else { pole = 'mid'; text = '居中'; }
      return { key: m.key, name: m.name, value: Math.round(v), pole: pole, label: text };
    });
  }

  var api = {
    DIMS: DIMS,
    DIM_META: DIM_META,
    MATCH_CONFIG: MATCH_CONFIG,
    WEIGHTS: WEIGHTS,
    answerDelta: answerDelta,
    questionBounds: questionBounds,
    computeBounds: computeBounds,
    rawScores: rawScores,
    normalize: normalize,
    distanceSim: distanceSim,
    cosineSim: cosineSim,
    similarity: similarity,
    displayScale: displayScale,
    consistency: consistency,
    credibilityLabel: credibilityLabel,
    evaluateCoords: evaluateCoords,
    evaluate: evaluate,
    describeProfile: describeProfile
  };

  global.Matching = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
