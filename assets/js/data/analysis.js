/* 由 node tools/analyze.js 自动生成，请勿手改 */
window.ANALYSIS_DATA = {
 "meta": {
  "generatedAt": "2026-10-24",
  "sampleSize": 4000,
  "retestPairs": 600,
  "seed": 20261024,
  "figureCount": 36,
  "questionCount": 27,
  "extraCount": 0
 },
 "overall": "warn",
 "passedCount": 9,
 "totalChecks": 10,
 "verdicts": [
  {
   "key": "coverage",
   "label": "人物覆盖率",
   "value": 97.2,
   "threshold": 70,
   "pass": true,
   "unit": "%",
   "note": "36 位人物中有多少位至少被匹配到过一次。过低说明大量人物坐标过于边缘，形同虚设。"
  },
  {
   "key": "maxShare",
   "label": "最热人物占比",
   "value": 11.2,
   "threshold": 12,
   "pass": true,
   "unit": "%",
   "note": "单个人物占据 Top1 的最大比例。均匀分布的基准是 2.8%，显著高于它说明存在「总是同一个人」。"
  },
  {
   "key": "hhi",
   "label": "结果集中度 HHI",
   "value": 0.0486,
   "threshold": 0.06,
   "pass": true,
   "unit": "",
   "note": "各人物占比的平方和，衡量结果是否过度集中。均匀分布为 0.0278，越大越集中。"
  },
  {
   "key": "retest",
   "label": "重测信度",
   "value": 64.5,
   "threshold": 70,
   "pass": false,
   "unit": "%",
   "note": "同一人格在两次独立作答中得到同一位人物的比例。这是「结果是否稳定可复现」的核心证据。"
  },
  {
   "key": "retestTop3",
   "label": "重测 Top3 命中",
   "value": 90,
   "threshold": 90,
   "pass": true,
   "unit": "%",
   "note": "第二次作答的结果仍落在第一次前三名之内的比例。比 Top1 一致率更宽容，衡量结果的稳定区间。"
  },
  {
   "key": "dimSd",
   "label": "最弱维度区分度",
   "value": 22.5,
   "threshold": 12,
   "pass": true,
   "unit": "",
   "note": "六维中标准差最小的一维。标准差越大说明该维度越能把人区分开，过小则这一维形同虚设。"
  },
  {
   "key": "carelessDetect",
   "label": "乱答识别率",
   "value": 65.8,
   "threshold": 60,
   "pass": true,
   "unit": "%",
   "note": "随机乱点的用户中，被一致性检测判为「摇摆」或「随性」的比例。"
  },
  {
   "key": "falseFlag",
   "label": "认真用户误伤率",
   "value": 2.6,
   "threshold": 10,
   "pass": true,
   "unit": "%",
   "note": "认真作答的用户中，被误判为「随性」的比例。过高说明反向题设计有问题。"
  },
  {
   "key": "optionBias",
   "label": "最强选项倾向",
   "value": 34.3,
   "threshold": 60,
   "pass": true,
   "unit": "%",
   "note": "所有题目中最受青睐的那个选项的选择率。过高说明该选项看起来像「正确答案」，会扭曲结果。"
  },
  {
   "key": "displayRange",
   "label": "匹配度落在 70–95",
   "value": 90.9,
   "threshold": 80,
   "pass": true,
   "unit": "%",
   "note": "展示匹配度落在舒适区间的比例。过低会让用户看到「37% 匹配」这类挫败数字。"
  }
 ],
 "distribution": {
  "items": [
   {
    "id": "qinshihuang",
    "name": "秦始皇",
    "era": "秦",
    "count": 449,
    "share": 0.11225
   },
   {
    "id": "zhangheng",
    "name": "张衡",
    "era": "东汉",
    "count": 306,
    "share": 0.0765
   },
   {
    "id": "curie",
    "name": "玛丽·居里",
    "era": "近代",
    "count": 259,
    "share": 0.06475
   },
   {
    "id": "darwin",
    "name": "达尔文",
    "era": "近代",
    "count": 250,
    "share": 0.0625
   },
   {
    "id": "huangdaopo",
    "name": "黄道婆",
    "era": "元",
    "count": 213,
    "share": 0.05325
   },
   {
    "id": "zhugeliang",
    "name": "诸葛亮",
    "era": "三国",
    "count": 194,
    "share": 0.0485
   },
   {
    "id": "banzhao",
    "name": "班昭",
    "era": "东汉",
    "count": 185,
    "share": 0.04625
   },
   {
    "id": "shangyang",
    "name": "商鞅",
    "era": "战国",
    "count": 180,
    "share": 0.045
   },
   {
    "id": "wangzhenyi",
    "name": "王贞仪",
    "era": "清",
    "count": 173,
    "share": 0.04325
   },
   {
    "id": "zhenghe",
    "name": "郑和",
    "era": "明",
    "count": 169,
    "share": 0.04225
   },
   {
    "id": "dafinci",
    "name": "达·芬奇",
    "era": "文艺复兴",
    "count": 154,
    "share": 0.0385
   },
   {
    "id": "galileo",
    "name": "伽利略",
    "era": "文艺复兴",
    "count": 143,
    "share": 0.03575
   },
   {
    "id": "zhuangzi",
    "name": "庄子",
    "era": "战国",
    "count": 119,
    "share": 0.02975
   },
   {
    "id": "wangxizhi",
    "name": "王羲之",
    "era": "东晋",
    "count": 108,
    "share": 0.027
   },
   {
    "id": "nightingale",
    "name": "南丁格尔",
    "era": "近代",
    "count": 91,
    "share": 0.02275
   },
   {
    "id": "quyuan",
    "name": "屈原",
    "era": "战国",
    "count": 89,
    "share": 0.02225
   },
   {
    "id": "xuanzang",
    "name": "玄奘",
    "era": "唐",
    "count": 83,
    "share": 0.02075
   },
   {
    "id": "dufu",
    "name": "杜甫",
    "era": "唐",
    "count": 83,
    "share": 0.02075
   },
   {
    "id": "socrates",
    "name": "苏格拉底",
    "era": "古希腊",
    "count": 81,
    "share": 0.02025
   },
   {
    "id": "zhuxi",
    "name": "朱熹",
    "era": "南宋",
    "count": 80,
    "share": 0.02
   },
   {
    "id": "simaqian",
    "name": "司马迁",
    "era": "西汉",
    "count": 79,
    "share": 0.01975
   },
   {
    "id": "kongzi",
    "name": "孔子",
    "era": "春秋",
    "count": 77,
    "share": 0.01925
   },
   {
    "id": "aurelius",
    "name": "马可·奥勒留",
    "era": "罗马",
    "count": 76,
    "share": 0.019
   },
   {
    "id": "taoyuanming",
    "name": "陶渊明",
    "era": "东晋",
    "count": 68,
    "share": 0.017
   },
   {
    "id": "xianfuren",
    "name": "冼夫人",
    "era": "南北朝—隋",
    "count": 49,
    "share": 0.01225
   },
   {
    "id": "beethoven",
    "name": "贝多芬",
    "era": "古典—浪漫之交",
    "count": 41,
    "share": 0.01025
   },
   {
    "id": "wuzetian",
    "name": "武则天",
    "era": "唐",
    "count": 34,
    "share": 0.0085
   },
   {
    "id": "liqingzhao",
    "name": "李清照",
    "era": "两宋之际",
    "count": 34,
    "share": 0.0085
   },
   {
    "id": "alexander",
    "name": "亚历山大",
    "era": "马其顿",
    "count": 34,
    "share": 0.0085
   },
   {
    "id": "joan",
    "name": "圣女贞德",
    "era": "中世纪",
    "count": 33,
    "share": 0.00825
   },
   {
    "id": "sushi",
    "name": "苏轼",
    "era": "北宋",
    "count": 23,
    "share": 0.00575
   },
   {
    "id": "shakespeare",
    "name": "莎士比亚",
    "era": "英国文艺复兴",
    "count": 23,
    "share": 0.00575
   },
   {
    "id": "caocao",
    "name": "曹操",
    "era": "三国",
    "count": 12,
    "share": 0.003
   },
   {
    "id": "genghis",
    "name": "成吉思汗",
    "era": "蒙古",
    "count": 6,
    "share": 0.0015
   },
   {
    "id": "vangogh",
    "name": "梵高",
    "era": "近代",
    "count": 2,
    "share": 0.0005
   },
   {
    "id": "libai",
    "name": "李白",
    "era": "唐",
    "count": 0,
    "share": 0
   }
  ],
  "hhi": 0.0486,
  "coverage": 0.972,
  "maxShare": 0.1123,
  "evenShare": 0.0278,
  "byGroup": [
   {
    "key": "careful",
    "name": "认真作答",
    "desc": "按自己的倾向稳定作答",
    "items": [
     {
      "id": "qinshihuang",
      "name": "秦始皇",
      "share": 0.1496649292628444
     },
     {
      "id": "darwin",
      "name": "达尔文",
      "share": 0.06701414743112435
     },
     {
      "id": "zhangheng",
      "name": "张衡",
      "share": 0.06478034251675353
     },
     {
      "id": "banzhao",
      "name": "班昭",
      "share": 0.06031273268801191
     },
     {
      "id": "zhenghe",
      "name": "郑和",
      "share": 0.04839910647803425
     },
     {
      "id": "huangdaopo",
      "name": "黄道婆",
      "share": 0.04616530156366344
     },
     {
      "id": "zhugeliang",
      "name": "诸葛亮",
      "share": 0.044676098287416234
     },
     {
      "id": "shangyang",
      "name": "商鞅",
      "share": 0.04393149664929263
     }
    ]
   },
   {
    "key": "normal",
    "name": "一般作答",
    "desc": "大致认真，偶有随意",
    "items": [
     {
      "id": "qinshihuang",
      "name": "秦始皇",
      "share": 0.11159631246967491
     },
     {
      "id": "zhangheng",
      "name": "张衡",
      "share": 0.0732654051431344
     },
     {
      "id": "darwin",
      "name": "达尔文",
      "share": 0.061620572537603106
     },
     {
      "id": "huangdaopo",
      "name": "黄道婆",
      "share": 0.05967976710334789
     },
     {
      "id": "shangyang",
      "name": "商鞅",
      "share": 0.05240174672489083
     },
     {
      "id": "curie",
      "name": "玛丽·居里",
      "share": 0.048520135856380396
     },
     {
      "id": "zhugeliang",
      "name": "诸葛亮",
      "share": 0.04754973313925279
     },
     {
      "id": "wangzhenyi",
      "name": "王贞仪",
      "share": 0.04754973313925279
     }
    ]
   },
   {
    "key": "careless",
    "name": "乱点作答",
    "desc": "完全不读题，随机点选",
    "items": [
     {
      "id": "curie",
      "name": "玛丽·居里",
      "share": 0.21476510067114093
     },
     {
      "id": "zhangheng",
      "name": "张衡",
      "share": 0.11409395973154363
     },
     {
      "id": "dafinci",
      "name": "达·芬奇",
      "share": 0.08557046979865772
     },
     {
      "id": "zhugeliang",
      "name": "诸葛亮",
      "share": 0.06040268456375839
     },
     {
      "id": "darwin",
      "name": "达尔文",
      "share": 0.05536912751677853
     },
     {
      "id": "wangzhenyi",
      "name": "王贞仪",
      "share": 0.053691275167785234
     },
     {
      "id": "huangdaopo",
      "name": "黄道婆",
      "share": 0.04697986577181208
     },
     {
      "id": "galileo",
      "name": "伽利略",
      "share": 0.04194630872483222
     }
    ]
   }
  ]
 },
 "dims": [
  {
   "dim": "D1",
   "name": "义利观",
   "neg": "守义",
   "pos": "图功",
   "mean": 46.6,
   "sd": 22.5,
   "min": 0,
   "max": 100,
   "histogram": [
    192,
    291,
    495,
    638,
    691,
    606,
    453,
    291,
    209,
    134
   ]
  },
  {
   "dim": "D2",
   "name": "行动力",
   "neg": "静水",
   "pos": "雷霆",
   "mean": 48.1,
   "sd": 22.8,
   "min": 0,
   "max": 100,
   "histogram": [
    193,
    290,
    433,
    573,
    635,
    611,
    551,
    367,
    213,
    134
   ]
  },
  {
   "dim": "D3",
   "name": "人际取向",
   "neg": "独行",
   "pos": "群策",
   "mean": 42.5,
   "sd": 23.4,
   "min": 0,
   "max": 100,
   "histogram": [
    289,
    468,
    590,
    602,
    600,
    503,
    398,
    265,
    162,
    123
   ]
  },
  {
   "dim": "D4",
   "name": "思维方式",
   "neg": "建制",
   "pos": "权变",
   "mean": 45.4,
   "sd": 22.9,
   "min": 0,
   "max": 100,
   "histogram": [
    209,
    355,
    538,
    624,
    632,
    603,
    429,
    285,
    192,
    133
   ]
  },
  {
   "dim": "D5",
   "name": "情感驱动",
   "neg": "冷澈",
   "pos": "深情",
   "mean": 51.5,
   "sd": 23.4,
   "min": 0,
   "max": 100,
   "histogram": [
    182,
    246,
    385,
    423,
    598,
    671,
    560,
    470,
    275,
    190
   ]
  },
  {
   "dim": "D6",
   "name": "表达形态",
   "neg": "立功",
   "pos": "立言",
   "mean": 49.9,
   "sd": 23.5,
   "min": 0,
   "max": 100,
   "histogram": [
    195,
    270,
    405,
    509,
    614,
    608,
    549,
    409,
    265,
    176
   ]
  }
 ],
 "display": {
  "histogram": [
   0,
   0,
   1,
   18,
   97,
   249,
   411,
   664,
   869,
   1000,
   670,
   21
  ],
  "min": 54,
  "max": 95,
  "p10": 70,
  "p50": 83,
  "p90": 91,
  "mean": 81.7
 },
 "credibility": [
  {
   "key": "careful",
   "name": "认真作答",
   "total": 1343,
   "levels": [
    {
     "level": "high",
     "label": "自洽",
     "share": 0.7021593447505584
    },
    {
     "level": "mid",
     "label": "摇摆",
     "share": 0.2717795979151154
    },
    {
     "level": "low",
     "label": "随性",
     "share": 0.026061057334326135
    }
   ]
  },
  {
   "key": "normal",
   "name": "一般作答",
   "total": 2061,
   "levels": [
    {
     "level": "high",
     "label": "自洽",
     "share": 0.519650655021834
    },
    {
     "level": "mid",
     "label": "摇摆",
     "share": 0.40950994662785056
    },
    {
     "level": "low",
     "label": "随性",
     "share": 0.07083939835031539
    }
   ]
  },
  {
   "key": "careless",
   "name": "乱点作答",
   "total": 596,
   "levels": [
    {
     "level": "high",
     "label": "自洽",
     "share": 0.3422818791946309
    },
    {
     "level": "mid",
     "label": "摇摆",
     "share": 0.5302013422818792
    },
    {
     "level": "low",
     "label": "随性",
     "share": 0.12751677852348994
    }
   ]
  }
 ],
 "retest": {
  "pairs": 600,
  "sameTop1": 387,
  "sameTop1Rate": 0.645,
  "sameTop3": 540,
  "sameTop3Rate": 0.9
 },
 "optionSpread": [
  {
   "id": "q19",
   "maxShare": 0.3425,
   "shares": [
    0.343,
    0.227,
    0.18,
    0.251
   ]
  },
  {
   "id": "q18",
   "maxShare": 0.32725,
   "shares": [
    0.327,
    0.257,
    0.216,
    0.2
   ]
  },
  {
   "id": "q15b",
   "maxShare": 0.323,
   "shares": [
    0.323,
    0.295,
    0.168,
    0.213
   ]
  },
  {
   "id": "q09",
   "maxShare": 0.32025,
   "shares": [
    0.221,
    0.237,
    0.32,
    0.222
   ]
  },
  {
   "id": "q15",
   "maxShare": 0.31775,
   "shares": [
    0.318,
    0.287,
    0.172,
    0.223
   ]
  },
  {
   "id": "q10",
   "maxShare": 0.316,
   "shares": [
    0.213,
    0.316,
    0.176,
    0.294
   ]
  }
 ],
 "rates": {
  "tieBreak": 0.5465,
  "specialEnding": 0.00525
 }
};
