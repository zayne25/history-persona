/**
 * 人物画像的视觉特征（与史料内容分离，便于单独调整）
 *
 * 由 assets/js/core/portrait.js 读取并绘制。字段取值：
 *
 *   robe  服饰  hanfu 交领右衽 / yuanling 圆领袍 / armor 甲胄
 *               drape 古希腊罗马披袍 / western 西式外衣 / pao 长袍僧衣
 *   head  冠巾  jin 巾 / guan 冠 / mian 冕 / helmet 盔 / zan 簪髻
 *               none 无 / laurel 桂冠 / hat 宽檐帽
 *   prop  手持器物（辨识度的关键，尽量取该人物最具标志性的那件）
 *   beard 须髯
 *   pose  姿态 sit 坐 / stand 立
 *
 * 设计原则：不追求照片级写实，追求「看一眼就知道是谁」——
 * 冠巾定身份，器物定事迹，服饰定时代，须发与眉眼定气质。
 */
window.FIGURE_PORTRAITS = {
  // ---- 中国史 ----
  kongzi: { robe: 'hanfu', head: 'jin', prop: 'scroll', beard: true, pose: 'sit' },
  zhuangzi: { robe: 'hanfu', head: 'jin', prop: 'butterfly', beard: true, pose: 'stand' },
  quyuan: { robe: 'hanfu', head: 'guan', prop: 'scroll', beard: true, pose: 'stand' },
  shangyang: { robe: 'hanfu', head: 'guan', prop: 'sword', beard: true, pose: 'stand' },
  qinshihuang: { robe: 'hanfu', head: 'mian', prop: 'seal', beard: true, pose: 'sit' },
  simaqian: { robe: 'hanfu', head: 'jin', prop: 'brush', beard: true, pose: 'sit' },
  caocao: { robe: 'hanfu', head: 'guan', prop: 'sword', beard: true, pose: 'stand' },
  zhugeliang: { robe: 'hanfu', head: 'jin', prop: 'fan', beard: true, pose: 'sit' },
  taoyuanming: { robe: 'hanfu', head: 'jin', prop: 'flower', beard: true, pose: 'stand' },
  wangxizhi: { robe: 'hanfu', head: 'jin', prop: 'brush', beard: true, pose: 'sit' },
  zhangheng: { robe: 'hanfu', head: 'guan', prop: 'armillary', beard: true, pose: 'sit' },
  banzhao: { robe: 'hanfu', head: 'zan', prop: 'brush', beard: false, pose: 'sit' },
  xianfuren: { robe: 'armor', head: 'helmet', prop: 'sword', beard: false, pose: 'stand' },
  xuanzang: { robe: 'pao', head: 'none', prop: 'staff', beard: false, pose: 'stand' },
  wuzetian: { robe: 'hanfu', head: 'mian', prop: 'mirror', beard: false, pose: 'sit' },
  libai: { robe: 'yuanling', head: 'jin', prop: 'moon', beard: true, pose: 'stand' },
  dufu: { robe: 'yuanling', head: 'jin', prop: 'scroll', beard: true, pose: 'stand' },
  sushi: { robe: 'yuanling', head: 'jin', prop: 'cup', beard: true, pose: 'stand' },
  liqingzhao: { robe: 'hanfu', head: 'zan', prop: 'scroll', beard: false, pose: 'stand' },
  zhuxi: { robe: 'hanfu', head: 'jin', prop: 'scroll', beard: true, pose: 'sit' },
  genghis: { robe: 'armor', head: 'helmet', prop: 'bow', beard: true, pose: 'stand' },
  huangdaopo: { robe: 'hanfu', head: 'zan', prop: 'loom', beard: false, pose: 'sit' },
  zhenghe: { robe: 'yuanling', head: 'guan', prop: 'ship', beard: true, pose: 'stand' },
  wangzhenyi: { robe: 'hanfu', head: 'zan', prop: 'armillary', beard: false, pose: 'sit' },

  // ---- 世界史 ----
  socrates: { robe: 'drape', head: 'none', prop: 'cup', beard: true, pose: 'stand' },
  alexander: { robe: 'armor', head: 'helmet', prop: 'sword', beard: false, pose: 'stand' },
  aurelius: { robe: 'drape', head: 'laurel', prop: 'scroll', beard: true, pose: 'sit' },
  dafinci: { robe: 'western', head: 'hat', prop: 'brush', beard: true, pose: 'sit' },
  galileo: { robe: 'western', head: 'none', prop: 'telescope', beard: true, pose: 'stand' },
  shakespeare: { robe: 'western', head: 'none', prop: 'mask', beard: true, pose: 'stand' },
  beethoven: { robe: 'western', head: 'none', prop: 'score', beard: true, pose: 'sit' },
  curie: { robe: 'western', head: 'zan', prop: 'flask', beard: false, pose: 'sit' },
  nightingale: { robe: 'western', head: 'zan', prop: 'lamp', beard: false, pose: 'stand' },
  darwin: { robe: 'western', head: 'none', prop: 'lens', beard: true, pose: 'sit' },
  vangogh: { robe: 'western', head: 'none', prop: 'sunflower', beard: true, pose: 'stand' },
  joan: { robe: 'armor', head: 'none', prop: 'banner', beard: false, pose: 'stand' }
};
