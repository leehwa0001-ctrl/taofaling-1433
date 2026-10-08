// 討伐令 1433：職業的被動技能（作者：每個職業都有被動，可以習得、可以更換）
// - 每個基本職業八種專屬被動：職業等級到了自動學會。八種共通被動：到公會的訓練場花費拉學（每個存檔學一次，所有職業都能用）。
// - 被動欄：職業等級 1 一格、5 兩格、10 三格、16 四格。城裡（暫停選單、公會）可以換，進了遺跡就不能換。
// - 上位職業原本的被動照舊（combat.js），另外算。
// 效果：數值的在 R.calcPlayer 套上；擊倒、命中、受傷、翻滾、治療的在各自的函式包一層。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const SLOT_LV = [1, 4, 8, 12, 16, 20];   // 2026-10-04 作者：被動格子多一點（原本 1、5、10、16 四格）
  const D = (id, cls, lv, name, desc, fx, cost) => ({ id, cls, lv, name, desc, fx, cost });
  const LIST = [
    D('gu1', 'gunner', 1, '快速裝填', '換彈快 25%。', { reload: 0.25 }), D('gu2', 'gunner', 3, '擴充彈匣', '彈匣多 30%。', { mag: 0.3 }), D('gu3', 'gunner', 5, '穩定射擊', '暴擊率 +8%。', { crit: 0.08 }), D('gu4', 'gunner', 7, '連射', '攻速 +12%。', { rate: 0.12 }),
    D('gu5', 'gunner', 9, '精準要害', '暴擊傷害 +30%。', { critMult: 0.3 }), D('gu6', 'gunner', 12, '狙擊本能', '8 公尺外的目標傷害 +20%，攻擊射程 +15%。', { far: 0.2, range: 0.15 }), D('gu7', 'gunner', 15, '彈殼回收', '擊倒遺跡生物，彈匣立刻補 3 發。', { killAmmo: 3 }), D('gu8', 'gunner', 18, '背水射擊', '生命低於 30% 時傷害 +30%。', { low: 0.3 }),
    D('ar1', 'archer', 1, '鷹眼', '射程 +20%、暴擊率 +4%。', { range: 0.2, crit: 0.04 }), D('ar2', 'archer', 3, '速射', '攻速 +14%。', { rate: 0.14 }), D('ar3', 'archer', 5, '輕裝', '翻滾冷卻 −20%。', { dodge: 0.2 }), D('ar4', 'archer', 7, '狩獵本能', '8 公尺外的目標傷害 +20%。', { far: 0.2 }),
    D('ar5', 'archer', 9, '麻痺箭', '18% 機率讓目標變慢。', { slow: 0.18 }), D('ar6', 'archer', 12, '貫穿', '箭多穿過一隻；遠程傷害 +6%。', { pierce: 1, ranged: 0.06 }), D('ar7', 'archer', 15, '獵人的耐心', '翻滾後 1.5 秒內的下一擊 +40%。', { dodgeHit: 0.4 }), D('ar8', 'archer', 18, '風之加護', '移動 +10%。', { speed: 0.1 }),
    D('wa1', 'warrior', 1, '重擊', '近戰傷害 +12%。', { melee: 0.12 }), D('wa2', 'warrior', 3, '鐵骨', '防禦 +4。', { def: 4 }), D('wa3', 'warrior', 5, '旋風', '揮砍的範圍 +25%。', { arc: 0.25 }), D('wa4', 'warrior', 7, '戰吼', '擊倒遺跡生物後 3 秒內傷害 +20%。', { rage: 0.2 }),
    D('wa5', 'warrior', 9, '嗜戰', '造成傷害的 2% 回復成生命。', { leech: 0.02 }), D('wa6', 'warrior', 12, '背水', '生命低於 30% 時傷害 +35%。', { low: 0.35 }), D('wa7', 'warrior', 15, '巨力', '近戰傷害 +10%；8% 機率把目標打暈。', { melee: 0.1, stun: 0.08 }), D('wa8', 'warrior', 18, '不屈', '每一層一次：受到致命傷時留下 1 點生命。', { last: 1 }),
    D('ma1', 'mage', 1, '法力增幅', '法術傷害 +12%。', { magic: 0.12 }), D('ma2', 'mage', 3, '冥想', '魔力 +30%。', { mp: 0.3 }), D('ma3', 'mage', 5, '爆裂', '法彈爆炸範圍 +30%。', { splash: 0.3 }), D('ma4', 'mage', 7, '法術迴響', '技能冷卻 −15%。', { skillCd: 0.15 }),
    D('ma5', 'mage', 9, '寒冰', '20% 機率讓目標變慢。', { slow: 0.2 }), D('ma6', 'mage', 12, '魔力轉換', '擊倒遺跡生物回復 8 點魔力。', { killMp: 8 }), D('ma7', 'mage', 15, '灼熱', '15% 機率讓目標燃燒。', { burn: 0.15 }), D('ma8', 'mage', 18, '秘法精通', '法術傷害 +10%、暴擊率 +6%。', { magic: 0.1, crit: 0.06 }),
    D('pr1', 'priest', 1, '神恩', '治療效果 +25%。', { heal: 0.25 }), D('pr2', 'priest', 3, '庇護', '防禦 +3、生命 +8%。', { def: 3, hp: 0.08 }), D('pr3', 'priest', 5, '祈禱', '每秒回復生命 0.8。', { regen: 0.8 }), D('pr4', 'priest', 7, '堅信', '佩特拉的注意 −15%。', { calm: 0.15 }),
    D('pr5', 'priest', 9, '懲戒', '12% 機率把目標打暈。', { stun: 0.12 }), D('pr6', 'priest', 12, '聖光', '傷害 +10%。', { dmg: 0.1 }), D('pr7', 'priest', 15, '生命之泉', '擊倒遺跡生物回復 3% 生命。', { killHeal: 0.03 }), D('pr8', 'priest', 18, '殉道', '每一層一次：受到致命傷時留下 1 點生命。', { last: 1 }),
    D('bl1', 'blade', 1, '疾風', '移動 +8%。', { speed: 0.08 }), D('bl2', 'blade', 3, '見切', '翻滾冷卻 −25%。', { dodge: 0.25 }), D('bl3', 'blade', 5, '一閃', '暴擊率 +10%。', { crit: 0.1 }), D('bl4', 'blade', 7, '殘心', '翻滾後 1.5 秒內的下一擊 +50%。', { dodgeHit: 0.5 }),
    D('bl5', 'blade', 9, '連斬', '攻速 +12%。', { rate: 0.12 }), D('bl6', 'blade', 12, '斬鐵', '暴擊傷害 +35%。', { critMult: 0.35 }), D('bl7', 'blade', 15, '血祭', '擊倒遺跡生物回復 2.5% 生命，3 秒內傷害 +15%。', { killHeal: 0.025, rage: 0.15 }), D('bl8', 'blade', 18, '無我', '生命低於 30% 時傷害 +30%；翻滾冷卻 −10%。', { low: 0.3, dodge: 0.1 }),
    D('kn1', 'knight', 1, '堅守', '防禦 +5。', { def: 5 }), D('kn2', 'knight', 3, '重裝', '生命 +15%，移動 −4%。', { hp: 0.15, speed: -0.04 }), D('kn3', 'knight', 5, '荊棘', '被打的時候，把 20% 的傷害還給打你的生物。', { thorns: 0.2 }), D('kn4', 'knight', 7, '衝鋒號令', '技能冷卻 −15%。', { skillCd: 0.15 }),
    D('kn5', 'knight', 9, '盾擊', '10% 機率把目標打暈。', { stun: 0.1 }), D('kn6', 'knight', 12, '鋼鐵意志', '佩特拉的注意 −10%、防禦 +3。', { calm: 0.1, def: 3 }), D('kn7', 'knight', 15, '守護', '每秒回復生命 0.6、生命 +8%。', { regen: 0.6, hp: 0.08 }), D('kn8', 'knight', 18, '不倒', '每一層一次：受到致命傷時留下 1 點生命。', { last: 1 }),
    D('mo1', 'monk', 1, '馬步', '防禦 +3、生命 +6%。', { def: 3, hp: 0.06 }), D('mo2', 'monk', 3, '連打', '攻速 +12%。', { rate: 0.12 }), D('mo3', 'monk', 5, '身法', '翻滾冷卻 −25%。', { dodge: 0.25 }), D('mo4', 'monk', 7, '點穴', '10% 機率把目標打暈。', { stun: 0.1 }),
    D('mo5', 'monk', 9, '剛拳', '近戰傷害 +12%。', { melee: 0.12 }), D('mo6', 'monk', 12, '寸勁', '暴擊傷害 +30%。', { critMult: 0.3 }), D('mo7', 'monk', 15, '氣血', '造成傷害的 2% 回復成生命。', { leech: 0.02 }),
    // 2026-10-04：新職業的被動、每個職業多三個高等級的被動（18、22、26 級）
    D('bd1', 'bard', 1, '絕對音感', '技能冷卻 −8%。', { skillCd: 0.08 }), D('bd2', 'bard', 3, '餘音', '法術傷害 +12%。', { magic: 0.12 }), D('bd3', 'bard', 5, '和聲', '治療 +25%。', { heal: 0.25 }), D('bd4', 'bard', 7, '舞台步', '翻滾冷卻 −20%。', { dodge: 0.2 }), D('bd5', 'bard', 9, '安可', '擊倒遺跡生物回復 6 點魔力。', { killMp: 6 }), D('bd6', 'bard', 12, '催眠旋律', '15% 機率讓目標變慢。', { slow: 0.15 }), D('bd7', 'bard', 15, '巡迴', '魔力 +25%、移動 +5%。', { mp: 0.25, speed: 0.05 }),
    D('sn1', 'summoner', 1, '執念', '魔力 +20%。', { mp: 0.2 }), D('sn2', 'summoner', 3, '靈魂穩定', '技能冷卻 −10%。', { skillCd: 0.1 }), D('sn3', 'summoner', 5, '泥土的味道', '生命 +10%。', { hp: 0.1 }), D('sn4', 'summoner', 7, '意念', '法術傷害 +12%。', { magic: 0.12 }), D('sn5', 'summoner', 9, '回收', '擊倒遺跡生物回復 8 點魔力。', { killMp: 8 }), D('sn6', 'summoner', 12, '精神力', '每秒回復生命 0.6。', { regen: 0.6 }), D('sn7', 'summoner', 15, '百獸之主', '傷害 +10%。', { dmg: 0.1 }),
    D('ry1', 'arraymage', 1, '幾何學', '法術傷害 +10%。', { magic: 0.1 }), D('ry2', 'arraymage', 3, '抑制圈', '技能冷卻 −10%。', { skillCd: 0.1 }), D('ry3', 'arraymage', 5, '閉環', '法彈爆炸範圍 +30%。', { splash: 0.3 }), D('ry4', 'arraymage', 7, '定點', '12% 機率把目標打暈。', { stun: 0.12 }), D('ry5', 'arraymage', 9, '游離魔力', '擊倒遺跡生物回復 8 點魔力。', { killMp: 8 }), D('ry6', 'arraymage', 12, '陣地', '防禦 +4。', { def: 4 }), D('ry7', 'arraymage', 15, '大成', '傷害 +10%、魔力 +15%。', { dmg: 0.1, mp: 0.15 }),
    D('en1', 'enchanter', 1, '金屬親和', '近戰傷害 +10%。', { melee: 0.1 }), D('en2', 'enchanter', 3, '精準刻印', '暴擊率 +6%。', { crit: 0.06 }), D('en3', 'enchanter', 5, '恩特安的博弈', '暴擊傷害 +30%。', { critMult: 0.3 }), D('en4', 'enchanter', 7, '雙重介質', '法術傷害 +12%、近戰傷害 +6%。', { magic: 0.12, melee: 0.06 }), D('en5', 'enchanter', 9, '低能耗', '擊倒遺跡生物回復 6 點魔力。', { killMp: 6 }), D('en6', 'enchanter', 12, '淬火', '攻速 +12%。', { rate: 0.12 }), D('en7', 'enchanter', 15, '千年不損', '防禦 +4、生命 +8%。', { def: 4, hp: 0.08 }),
    D('sc1', 'scroll', 1, '牛皮紙', '魔力 +20%。', { mp: 0.2 }), D('sc2', 'scroll', 3, '零前搖', '技能冷卻 −10%。', { skillCd: 0.1 }), D('sc3', 'scroll', 5, '飽和攻擊', '攻速 +12%。', { rate: 0.12 }), D('sc4', 'scroll', 7, '底火', '法術傷害 +12%。', { magic: 0.12 }), D('sc5', 'scroll', 9, '備用卷軸', '擊倒遺跡生物回復 8 點魔力。', { killMp: 8 }), D('sc6', 'scroll', 12, '戰術疊加', '暴擊率 +8%。', { crit: 0.08 }), D('sc7', 'scroll', 15, '抄寫員', '傷害 +10%、翻滾冷卻 −15%。', { dmg: 0.1, dodge: 0.15 }),
    D('gu11', 'gunner', 20, '彈道學', '暴擊傷害 +25%。', { critMult: 0.25 }), D('gu9', 'gunner', 23, '老練', '傷害 +8%。', { dmg: 0.08 }), D('gu10', 'gunner', 26, '神槍手', '暴擊率 +8%、攻速 +8%。', { crit: 0.08, rate: 0.08 }),
    D('ar11', 'archer', 20, '風之眼', '暴擊傷害 +25%。', { critMult: 0.25 }), D('ar9', 'archer', 23, '獵人的直覺', '傷害 +8%。', { dmg: 0.08 }), D('ar10', 'archer', 26, '百步穿楊', '暴擊率 +8%、移動 +5%。', { crit: 0.08, speed: 0.05 }),
    D('wa11', 'warrior', 20, '不撓', '生命 +12%。', { hp: 0.12 }), D('wa9', 'warrior', 23, '劈山', '近戰傷害 +10%。', { melee: 0.1 }), D('wa10', 'warrior', 26, '戰神', '傷害 +8%、防禦 +3。', { dmg: 0.08, def: 3 }),
    D('ma11', 'mage', 20, '魔力泉', '魔力 +30%。', { mp: 0.3 }), D('ma9', 'mage', 23, '詠唱縮短', '技能冷卻 −10%。', { skillCd: 0.1 }), D('ma10', 'mage', 26, '大魔導', '法術傷害 +15%。', { magic: 0.15 }),
    D('pr11', 'priest', 20, '慈悲', '治療 +20%。', { heal: 0.2 }), D('pr9', 'priest', 23, '信仰之盾', '防禦 +4。', { def: 4 }), D('pr10', 'priest', 26, '聖者', '每秒回復生命 1、魔力 +15%。', { regen: 1, mp: 0.15 }),
    D('bl11', 'blade', 20, '刀意', '暴擊傷害 +25%。', { critMult: 0.25 }), D('bl9', 'blade', 23, '無念', '翻滾冷卻 −15%。', { dodge: 0.15 }), D('bl10', 'blade', 26, '劍聖', '傷害 +10%。', { dmg: 0.1 }),
    D('kn11', 'knight', 20, '城壁', '防禦 +5。', { def: 5 }), D('kn9', 'knight', 23, '騎士道', '生命 +12%。', { hp: 0.12 }), D('kn10', 'knight', 26, '守護者', '傷害 +6%、防禦 +3。', { dmg: 0.06, def: 3 }),
    D('mo8', 'monk', 18, '金剛', '防禦 +4、生命 +8%。', { def: 4, hp: 0.08 }), D('mo9', 'monk', 22, '無影腳', '攻速 +10%。', { rate: 0.1 }), D('mo10', 'monk', 26, '宗師', '傷害 +10%。', { dmg: 0.1 }),
    D('bd8', 'bard', 18, '名曲', '法術傷害 +12%。', { magic: 0.12 }), D('bd9', 'bard', 22, '返場', '技能冷卻 −8%。', { skillCd: 0.08 }), D('bd10', 'bard', 26, '傳奇樂手', '傷害 +10%、治療 +15%。', { dmg: 0.1, heal: 0.15 }),
    D('sn8', 'summoner', 18, '深層執念', '魔力 +20%。', { mp: 0.2 }), D('sn9', 'summoner', 22, '靈魂共鳴', '技能冷卻 −8%。', { skillCd: 0.08 }), D('sn10', 'summoner', 26, '霍克的傳承', '傷害 +10%、生命 +8%。', { dmg: 0.1, hp: 0.08 }),
    D('ry8', 'arraymage', 18, '複合結構', '法術傷害 +12%。', { magic: 0.12 }), D('ry9', 'arraymage', 22, '永續陣', '技能冷卻 −8%。', { skillCd: 0.08 }), D('ry10', 'arraymage', 26, '艾達諾拉', '傷害 +10%、防禦 +3。', { dmg: 0.1, def: 3 }),
    D('en8', 'enchanter', 18, '魔力中毒', '暴擊率 +6%。', { crit: 0.06 }), D('en9', 'enchanter', 22, '臨界點', '暴擊傷害 +25%。', { critMult: 0.25 }), D('en10', 'enchanter', 26, '附魔之父', '傷害 +10%。', { dmg: 0.1 }),
    D('sc8', 'scroll', 18, '高級牛皮紙', '魔力 +25%。', { mp: 0.25 }), D('sc9', 'scroll', 22, '預載邏輯', '技能冷卻 −8%。', { skillCd: 0.08 }), D('sc10', 'scroll', 26, '諾克斯伯爵', '傷害 +10%、法術傷害 +8%。', { dmg: 0.1, magic: 0.08 }),
    D('co1', '*', 1, '強韌', '生命 +10%。', { hp: 0.1 }, 200), D('co2', '*', 1, '輕足', '移動 +6%。', { speed: 0.06 }, 200), D('co3', '*', 1, '魔力湧泉', '魔力 +20%。', { mp: 0.2 }, 200), D('co4', '*', 1, '鐵壁', '防禦 +3。', { def: 3 }, 250),
    D('co5', '*', 1, '專注', '技能冷卻 −10%。', { skillCd: 0.1 }, 300), D('co6', '*', 1, '屏息', '佩特拉的注意 −12%。', { calm: 0.12 }, 300), D('co7', '*', 1, '嗜血', '擊倒遺跡生物回復 0.5% 最大生命；每擊倒一隻，回復量 +1%（最多 +100%，也就是一次 1%），換樓層重新疊。', { killHealUp: 0.005 }, 400), D('co8', '*', 1, '背水之陣', '生命低於 30% 時傷害 +20%。', { low: 0.2 }, 400)
  ];
  // 2026-10-04 作者：被動技能越後面的應該要比越前面強——照解鎖等級放大數值（1 級照舊，26 級約兩倍），說明裡的數字跟著改。
  // （同一時間也修了：每個職業多三個被動的時候，有七個職業的新被動和原本的第八個用了同一個代號，裝一個兩個都算。）
  const KEEP = new Set(['last', 'pierce']), INT = new Set(['def', 'killAmmo', 'killMp']);
  const fmt = v => String(+(+v).toFixed(2));
  LIST.forEach(p => {
    if (p.cls === '*' || p.lv <= 1 || !p.fx) return;
    const k = 1 + (p.lv - 1) / 25;
    Object.keys(p.fx).forEach(key => {
      const v = p.fx[key]; if (typeof v !== 'number' || KEEP.has(key) || v === 0) return;
      const nv = INT.has(key) ? Math.round(v * k) : key === 'regen' ? Math.round(v * k * 10) / 10 : Math.round(v * k * 100) / 100;   // 百分比取整數
      // 說明：先找百分比（0.12 → 12%），再找數字本身（防禦 4、回復 0.8）
      const pct = fmt(Math.abs(v) * 100) + '%', npct = fmt(Math.abs(nv) * 100) + '%';
      if (!INT.has(key) && Math.abs(v) < 1 && p.desc.includes(pct)) p.desc = p.desc.replace(pct, npct);
      else { const re = new RegExp('(^|[^0-9.])' + fmt(Math.abs(v)).replace('.', '\\.') + '(?![0-9.])'); p.desc = p.desc.replace(re, (m, pre) => pre + fmt(Math.abs(nv))); }
      p.fx[key] = nv;
    });
  });
  const BY = {}; LIST.forEach(p => { BY[p.id] = p; });
  R.PASSIVES = BY; R.PASSIVE_LIST = LIST;   // adv2plus.js 加二轉的被動（p.adv2：選了哪一個二轉才學得會；p.adv：限哪一條轉職路線）

  // ---------- 學會、裝上 ----------
  const st = cls => R.S.classes[cls];
  const slots = cls => SLOT_LV.filter(l => (st(cls) ? st(cls).lv : 1) >= l).length;
  const learned = (cls, id) => { const p = BY[id], S = R.S; if (!p) return false; if (p.cls === '*') return (S.pvBought || []).includes(id); return p.cls === cls && (st(cls) ? st(cls).lv : 1) >= p.lv && (!p.adv2 || !!(st(cls) && st(cls).adv2 === p.adv2 && (!p.adv || p.adv === st(cls).adv))); };
  R.passivesOf = cls => {
    const S = R.S; S.pvEquip = S.pvEquip || {};
    let eq = (S.pvEquip[cls] || []).filter(id => learned(cls, id)).slice(0, slots(cls));
    if (!S.pvEquip[cls]) { const first = LIST.find(p => p.cls === cls && learned(cls, p.id)); eq = first ? [first.id] : []; S.pvEquip[cls] = eq; }
    return eq;
  };
  const merged = cls => { const fx = {}; R.passivesOf(cls).forEach(id => { const f = BY[id].fx; Object.keys(f).forEach(k => { fx[k] = (fx[k] || 0) + f[k]; }); }); return fx; };

  // ---------- 數值 ----------
  const cp = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp(cls); if (!R.S) return P;
    const f = merged(cls), ws = P.ws || {}, k = ws.kind;
    if (f.hp) P.hpMax = Math.round(P.hpMax * (1 + f.hp)); if (f.mp) P.mpMax = Math.round(P.mpMax * (1 + f.mp)); if (f.def) P.def += f.def; if (f.speed) P.speed *= 1 + f.speed; if (f.dmg) P.dmgMult *= 1 + f.dmg;
    if (f.melee && (k === 'melee' || k === 'thrust')) ws.dmg *= 1 + f.melee; if (f.magic && k === 'magic') ws.dmg *= 1 + f.magic; if (f.ranged && (k === 'gun' || k === 'bow')) ws.dmg *= 1 + f.ranged;
    if (f.crit) ws.crit = (ws.crit || 0) + f.crit; if (f.critMult) P.critMult += f.critMult; if (f.rate && ws.rate) ws.rate *= 1 + f.rate;
    if (f.reload && ws.reload) ws.reload *= 1 - f.reload; if (f.mag && ws.mag) ws.mag = Math.round(ws.mag * (1 + f.mag)); if (f.range && ws.range) ws.range *= 1 + f.range;
    if (f.arc && ws.arc) ws.arc *= 1 + f.arc; if (f.splash && ws.splash) ws.splash *= 1 + f.splash; if (f.pierce && ws.pierce) ws.pierce += f.pierce;
    if (f.dodge) P.dodgeCdMax *= 1 - f.dodge; if (f.skillCd) P.skillCdMult *= 1 - f.skillCd; if (f.regen) P.regen = (P.regen || 0) + f.regen; if (f.calm) P.calm = (P.calm || 0) + f.calm;
    P.pv = f;
    return P;
  };

  // ---------- 命中、擊倒、受傷、翻滾、治療 ----------
  const he = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P, f = P && P.pv; o = o || {};
    if (f && e && !e.dead) {
      if (f.low && P.hp < P.hpMax * 0.3) raw *= 1 + f.low;
      if (f.far && Math.hypot(e.x - P.x, e.z - P.z) > 8) raw *= 1 + f.far;
      if (f.rage && P.pvRage > 0) raw *= 1 + f.rage;
      if (f.dodgeHit && P.pvDodge > 0 && o.primary) { raw *= 1 + f.dodgeHit; P.pvDodge = 0; }
    }
    const d = he(e, raw, o);
    if (f && d > 0 && e) {
      if (f.leech && !R.vampProc) R.healP(d * f.leech, true);   // vampproc.js 接手：被動的吸血算進吸血系數
      if (o.primary && !e.dead && e.st) { if (f.slow && Math.random() < f.slow) e.st.slow = Math.max(e.st.slow, 2); if (f.stun && Math.random() < f.stun) e.st.stun = Math.max(e.st.stun, 0.8); if (f.burn && Math.random() < f.burn) e.st.burn = Math.max(e.st.burn, 3); }
    }
    return d;
  };
  const ke = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke(e, by), P = W().P, f = P && P.pv;
    if (was && e.dead && f && !(by && by.rival) && !(R._reflectKill > 0) && !(R._vampBlock > 0)) {   // 反擊／荊棘／_vampBlock：不算擊倒回血
      if (f.killHeal) {   // 遞減（作者 2026-10-05）：每次生效，之後的回復少 1%，最多少 50%，換樓層重算
        const fl = (W().run && W().run.floor) || 0; if (P._khFloor !== fl) { P._khFloor = fl; P._khN = 0; }
        R.healP(P.hpMax * (P.cls === 'gunner' ? Math.min(0.01, f.killHeal) : f.killHeal) * (1 - Math.min(0.5, 0.01 * (P._khN || 0))), true); P._khN = (P._khN || 0) + 1;
      }
      if (f.killHealUp) {   // 嗜血（2026-10-08）：0.5% 起跳，每擊倒一隻 +1%（最多 +100%），每層重置
        const fl = (W().run && W().run.floor) || 0; if (P._kuFloor !== fl) { P._kuFloor = fl; P._kuN = 0; }
        R.healP(P.hpMax * f.killHealUp * (1 + Math.min(1, 0.01 * (P._kuN || 0))), true); P._kuN = (P._kuN || 0) + 1;
      }
      if (f.killMp) P.mp = Math.min(P.mpMax, P.mp + f.killMp);
      if (f.killAmmo && P.ws && P.ws.mag) P.ammo = Math.min(P.ws.mag, (P.ammo || 0) + f.killAmmo);
      if (f.rage) P.pvRage = 3;
    }
    return r;
  };
  const hp = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const P = W().P, f = P && P.pv;
    // 不屈／殉道（fx.last）：真的倒下的時候才算——改在 unyield.js（原本這裡看扣護甲之前的傷害，死不了的攻擊也會觸發）
    const r = hp(raw, src, o);
    if (f && f.thorns && src && src.def && !src.dead && raw > 0 && Math.hypot((src.x || 0) - P.x, (src.z || 0) - P.z) <= 5) R.hurtEnemy(src, raw * f.thorns, R.markNoVamp ? R.markNoVamp({ thorns: 1, fromBehind: false }) : { thorns: 1, reflect: true, noVamp: true, fromBehind: false });   // 走 markNoVamp 單一閘門
    return r;
  };
  const hl = R.healP;
  if (hl) R.healP = (v, quiet) => { const P = W().P, f = P && P.pv; return hl(f && f.heal ? v * (1 + f.heal) : v, quiet); };
  const dg = R.dodge;
  if (dg) R.dodge = (...a) => { const P = W().P, c0 = P && P.dodgeCd; const r = dg(...a); if (P && P.dodgeCd > (c0 || 0)) P.pvDodge = 1.5; return r; };
  const step0 = R.step;
  if (step0) R.step = dt => { step0(dt); const P = W().P; if (P) { if (P.pvRage > 0) P.pvRage -= dt; if (P.pvDodge > 0) P.pvDodge -= dt; } };
  // 換樓層：不屈又可以用一次
  const lf = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf(f, o), P = W().P; if (P) P.pvLast = 0; return r; };

  // ---------- 升級：學會新的被動 ----------
  const gx = R.gainXp;
  R.gainXp = v => {
    const S = R.S, cls = S.cls, s = st(cls), lv0 = s.lv; gx(v);
    if (s.lv === lv0) return;
    const got = LIST.filter(p => p.cls === cls && p.lv > lv0 && p.lv <= s.lv && learned(cls, p.id)), slot = SLOT_LV.some(l => l > lv0 && l <= s.lv);
    if (got.length || slot) setTimeout(() => R.banner(got.length ? '學會新的被動：' + got.map(p => p.name).join('、') : '被動欄多了一格', '回到城裡，在暫停選單或公會的「被動技能」換上去'), 5200);
  };

  // ---------- 被動技能的畫面 ----------
  const sheet = (host, where, close) => {
    const S = R.S, cls = S.cls, s = st(cls), eq = R.passivesOf(cls), n = slots(cls), atGuild = where === 'hub';
    const mine = LIST.filter(p => p.cls === cls && (!p.adv || p.adv === s.adv)), common = LIST.filter(p => p.cls === '*');
    const card = p => {
      const ok = learned(cls, p.id), on = eq.includes(p.id);
      const btn = ok ? '<button type="button" class="btn' + (on ? '' : ' pri') + '" data-pv="' + p.id + '"' + (!on && eq.length >= n ? ' disabled' : '') + '>' + (on ? '卸下' : '裝上') + '</button>'
        : p.cls === '*' ? '<button type="button" class="btn" data-learn="' + p.id + '"' + (!atGuild || S.gold < p.cost ? ' disabled' : '') + '>學（' + p.cost + ' 費拉）</button>' : '<span class="note">' + esc(p.need || '職業等級 ' + p.lv + ' 學會') + '</span>';
      return '<div class="recipe pv-card' + (on ? ' on' : '') + (ok ? '' : ' lock') + '"><b>' + esc(p.name) + '</b><small>' + esc(p.desc) + '</small>' + btn + '</div>';
    };
    host.innerHTML = '<h2>被動技能・' + esc(R.clsName(cls)) + ' Lv ' + s.lv + '</h2><p class="note">被動欄 ' + eq.length + '／' + n + '（職業等級 ' + SLOT_LV.join('、') + ' 各開一格）。職業的被動照等級自動學會；共通的被動要在公會的訓練場花錢學，學一次每個職業都能用。進了遺跡就不能換。</p>'
      + '<div class="row pv-slots">' + SLOT_LV.map((l, i) => '<span class="chip' + (eq[i] ? ' on' : '') + '">' + (i < n ? (eq[i] ? esc(BY[eq[i]].name) : '（空）') : 'Lv ' + l) + '</span>').join('') + '</div>'
      + '<h3>' + esc(R.CLASSES[cls].name) + '的被動</h3><div class="recipes">' + mine.map(card).join('') + '</div>'
      + '<h3>共通的被動' + (atGuild ? '（公會的訓練場）' : '（到公會的訓練場學）') + '</h3><div class="recipes">' + common.map(card).join('') + '</div>'
      + '<div class="row"><button type="button" class="btn pri" data-close="1">好了</button></div>';
    host.querySelectorAll('[data-pv]').forEach(b => { b.onclick = () => { const id = b.dataset.pv, cur = R.passivesOf(cls).slice(), i = cur.indexOf(id); if (i >= 0) cur.splice(i, 1); else if (cur.length < n) cur.push(id); S.pvEquip[cls] = cur; R.save(); sheet(host, where, close); }; });
    host.querySelectorAll('[data-learn]').forEach(b => { b.onclick = () => { const p = BY[b.dataset.learn]; if (!atGuild || S.gold < p.cost) return; S.gold -= p.cost; S.pvBought = (S.pvBought || []).concat(p.id); R.save(); if (R.say) R.say('學會了「' + p.name + '」'); sheet(host, where, close); }; });
    host.querySelector('[data-close]').onclick = close;
  };
  R.passiveSheet = where => {
    if (W().run && !W().run.train && !(R.inTraining && R.inTraining())) { R.toast('遺跡裡不能換被動。'); return; }   // 訓練場可以換（2026-10-08）
    if (W().run) { R.sheet('<div id="pv-host"></div>'); sheet($('pv-host'), 'town', () => { R.closeSheet(); if (R.trainRefresh) R.trainRefresh(); }); return; }
    if (where === 'hub') { const host = $('hub-sheet'), el = $('hub-modal'); el.hidden = false; sheet(host, 'hub', () => { el.hidden = true; R.hub(); }); host.scrollTop = 0; return; }
    R.sheet('<div id="pv-host"></div>'); sheet($('pv-host'), 'town', () => R.closeSheet());
  };
  // 城裡的暫停選單、公會的武器登記：多一個按鈕
  const tm0 = R.townMenu;
  if (tm0) R.townMenu = (...a) => { const r = tm0(...a); const row = document.querySelector('#r-sheet .row'); if (row && !row.querySelector('#pv-open')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'pv-open'; b.textContent = '被動技能'; b.onclick = () => R.passiveSheet('town'); row.insertBefore(b, row.children[2] || null); } return r; };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'); if (!body) return;
    const h = [...body.querySelectorAll('h3')].find(e => e.textContent === '武器登記'); if (!h) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn pri'; b.textContent = '被動技能：訓練場（' + R.clsName(R.S.cls) + '）'; b.onclick = () => R.passiveSheet('hub');
    const p = document.createElement('div'); p.className = 'row'; p.appendChild(b); h.after(p);
  };
})(window.R);
