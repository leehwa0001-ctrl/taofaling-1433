// 討伐令 1433：資料（職業、武器、詞綴、素材、遺跡生物、遺跡分級與形式）
// 設定依據：《艾菲爾斯特——公會特殊討伐令-遺跡》
window.R = window.R || {};
(function (R) {
  // ---------- 稀有度 ----------
  R.RARITY = [
    { name: '普通', color: '#B9BEC7', affix: 0, mult: 1, known: 0.5 },
    { name: '精良', color: '#62CB7E', affix: 1, mult: 1.12, known: 0.3 },
    { name: '稀有', color: '#5BA8F2', affix: 2, mult: 1.26, known: 0.15 },
    { name: '史詩', color: '#B87EF0', affix: 3, mult: 1.42, known: 0.05 },
    { name: '傳說', color: '#F2B64C', affix: 3, mult: 1.62, known: 0 }
  ];

  // ---------- 職業 ----------
  // skill：基礎職業的技能；上位職業會換成自己的技能，並多一個被動
  R.CLASSES = {
    gunner: { name: '槍手', hp: 92, mp: 40, speed: 6.2, skill: 'roll', color: '#4A6A8A', desc: '手槍、步槍、霰彈槍。彈匣打空要換彈。', look: { top: '#3E4E62', hair: '#2A2420', cloak: '#6E5A44' } },
    archer: { name: '弓箭手', hp: 94, mp: 50, speed: 6.4, skill: 'volley', color: '#4E7A48', desc: '短弓、長弓、弩。長弓可以按住蓄力。', look: { top: '#4A6A3E', hair: '#8A5A2E', cloak: '#3E5A36' } },
    warrior: { name: '戰士', hp: 132, mp: 30, speed: 5.7, skill: 'whirl', color: '#8A4A3A', desc: '大劍、戰斧、長劍。一刀掃一片。', look: { top: '#7A3E30', hair: '#3A2A1E', cloak: '#4A3A30' } },
    mage: { name: '術士', hp: 76, mp: 110, speed: 5.9, skill: 'fireball', color: '#5A4A8A', desc: '法杖、法球。施法消耗魔力。', look: { top: '#4A3E7A', hair: '#D8D2C4', cloak: '#2E2A4A' } },
    priest: { name: '牧師', hp: 96, mp: 95, speed: 5.9, skill: 'heal', color: '#C9B77A', desc: '聖杖、戰錘。會治療自己。', look: { top: '#E6DEC6', hair: '#6A4A2E', cloak: '#B89A4A' } },
    blade: { name: '刀客', hp: 112, mp: 45, speed: 6.7, skill: 'flash', color: '#3A3A44', desc: '刀、雙刀。快、準，穿過敵人。', look: { top: '#2E2E38', hair: '#101014', cloak: '#6A2A2A' } },
    knight: { name: '騎士', hp: 152, mp: 35, speed: 5.4, skill: 'charge', color: '#6A7A8A', desc: '長劍、長槍、戰錘，帶盾。正面受到的傷害減少。', look: { top: '#8A96A3', hair: '#C99B55', cloak: '#2F4A6E' }, shield: 1 },
    // 2026-10-04 作者：加一個武術家，把內修派用到那裡
    monk: { name: '武術家', hp: 118, mp: 50, speed: 6.6, skill: 'm_flurry', color: '#B8642E', desc: '拳套、長棍。赤手空拳近身連打，或用長棍掃開一片。', look: { top: '#C86A2E', hair: '#2A1E16', cloak: '#5A3A22' } }
  };
  R.CLASS_IDS = Object.keys(R.CLASSES);
  // 上位職業：每個基礎職業三條路——強化原本打法／換個玩法／昭旭與遺跡的路線（作者定案，2026-09-30）
  R.ADV = {
    gunner: [
      { id: 'sniper', name: '狙擊手', path: '強化', skill: 'snipe', desc: '技能「穿心」：蓄力後射出貫穿一切的子彈。被動：暴擊率 +5%、攻擊射程 +30%。' },
      { id: 'magigun', name: '魔導槍手', path: '變化', skill: 'element', desc: '技能「元素彈匣」：接下來 12 發子彈輪流帶火、冰、雷。被動：25% 的子彈附帶隨機元素。' },
      { id: 'bomber', name: '爆破手', path: '昭旭・遺跡', skill: 'grenade', desc: '技能「爆裂核心」：丟出礦坑用的爆裂核心，大範圍爆炸。被動：爆炸傷害 +40%，但每次爆炸都讓佩特拉的注意上升。' }],
    archer: [
      { id: 'arcane', name: '魔弓手', path: '強化', skill: 'homing', desc: '技能「追跡箭雨」：一口氣射出 8 支追蹤箭。被動：箭會稍微追蹤敵人。' },
      { id: 'ranger', name: '遊俠', path: '變化', skill: 'trap', desc: '技能「捕獸夾」：丟出陷阱，踩到的敵人被定住。被動：移動 +10%，翻滾冷卻 −30%。' },
      { id: 'hama', name: '破魔弓手', path: '昭旭・遺跡', skill: 'hamaya', desc: '技能「破魔矢」：一箭射穿直線上的所有遺跡生物，喚群燈、游焰一擊就散。被動：對遺跡生物傷害 +20%。' }],
    warrior: [
      { id: 'berserker', name: '狂戰士', path: '強化', skill: 'rage', desc: '技能「狂怒」：6 秒內傷害 +50%、攻速 +30%、吸血。被動：生命越低傷害越高（最多 +40%）。' },
      { id: 'gladiator', name: '劍鬥士', path: '變化', skill: 'combo', desc: '技能「迴旋連斬」：連續三次環形斬擊並擊退。被動：攻速 +20%。' },
      { id: 'onimusha', name: '鬼武者', path: '昭旭・遺跡', skill: 'on_rend', desc: '戴上遺跡裡撿到的鬼面，把佩特拉的惡意變成力氣。技能「鬼斬」：往前大範圍斬擊，打中的敵人被嚇得愣住。被動：生命低於一半時，受到的傷害 −20%、傷害 +15%。' },
      // 內修者搬到武術家（2026-10-04）；之前就轉成內修者的戰士照舊（legacy：轉職畫面不再出現）
      { id: 'inner', name: '內修者', path: '昭旭・遺跡', skill: 'qijin', legacy: 1, desc: '透過吐納吸收遺跡裡的殘存魔力質。技能「氣勁」：蓄氣一掌震退周圍敵人，打中的行壁直接碎裂。被動：站著不動時回復生命與魔力；攻擊不會讓佩特拉的注意上升。' }],
    mage: [
      { id: 'elementalist', name: '元素師', path: '強化', skill: 'meteor', desc: '技能「隕石」：在準心處落下隕石，大範圍傷害並燃燒。被動：命中時 20% 機率燃燒或減速。' },
      { id: 'hexer', name: '咒術師', path: '變化', skill: 'hex', desc: '技能「咒縛」：詛咒一片範圍的敵人：受到的傷害 +30%、移動變慢。被動：被詛咒的敵人死掉時，詛咒會傳給旁邊的敵人。' },
      // 式神使搬到召喚師（2026-10-04 作者：式神使可以歸類在召喚媒介裡）：已經是式神使的術士照舊，新轉職不再列出（legacy）
      { id: 'shikigami', legacy: 1, name: '式神使', path: '昭旭・遺跡', skill: 'shiki', desc: '技能「式神」：放出三隻紙式神環繞你並自動攻擊 10 秒。被動：常駐一隻式神。' },
      // 外修派「東方派」（《法術統整》第五章：華爾納蘭特帝國的「氣道」）——施法的派系：體外一層魔力罩當矛也當盾，不用咒語、施法快；魔力外放，很容易被感知
      { id: 'waixiu', name: '外修者', path: '外修派', skill: 'wx_burst', desc: '外修派（東方派）的氣道：體外常駐一層無形的魔力罩，不用咒語就能快速施法。技能「氣爆」：把魔力罩一口氣炸開，震飛周圍的敵人。被動：魔力罩會自己慢慢長回來（最多擋生命的 15%）、技能冷卻 −15%；但魔力外放像黑夜裡的燈火，佩特拉的注意上升 +20%。' }],
    priest: [
      { id: 'bishop', name: '主教', path: '強化', skill: 'sanctuary', desc: '技能「聖域」：展開 6 秒的聖域，回復生命並灼傷敵人。被動：治療 +30%。' },
      { id: 'druid', name: '德魯伊', path: '變化', skill: 'wild', desc: '技能「蔓生」：藤蔓纏住周圍敵人並持續回復。被動：每秒回復 1% 生命。' },
      { id: 'shinkan', name: '神官', path: '昭旭・遺跡', skill: 'kekkai', desc: '技能「結界」：張開結界，擋下所有投射物 5 秒，範圍內的遺跡生物會變弱。被動：佩特拉的注意上升 −40%。' }],
    blade: [
      { id: 'kensei', name: '劍豪', path: '強化', skill: 'iai', desc: '技能「居合」：短暫架勢後一刀斬出一直線，必定暴擊。被動：暴擊傷害 +50%。' },
      { id: 'shadow', name: '影刃', path: '變化', skill: 'shadowstep', desc: '技能「影步」：瞬移到最近的敵人背後重擊並隱身 2 秒。被動：從背後攻擊 +50%。' },
      { id: 'yoto', name: '妖刀使', path: '昭旭・遺跡', skill: 'yotoRelease', desc: '刀會吸遺跡生物的魔力質：這一趟每擊倒一隻，傷害 +1%（最多 +60%）。技能「妖刀解放」：消耗累積的魔力質，斬出一道大範圍的斬擊。' }],
    knight: [
      { id: 'templar', name: '殿堂騎士', path: '強化', skill: 'fortress', desc: '技能「堡壘」：5 秒內受到的傷害 −70%，並反彈 30%。被動：受到傷害 −15%。' },
      { id: 'paladin', name: '聖騎士', path: '變化', skill: 'holycharge', desc: '技能「聖光衝鋒」：衝鋒並放出聖光震波，回復自己。被動：擋下攻擊時回復生命。' },
      { id: 'dragoon', name: '龍騎士', path: '昭旭・遺跡', skill: 'jump', desc: '技能「龍躍」：高高跳起，落在準心處震飛周圍敵人，跳在空中時不會受傷。被動：長槍的攻擊距離 +25%。' }],
    monk: [
      { id: 'fistsaint', name: '拳聖', path: '強化', skill: 'fs_hundred', desc: '技能「百裂拳」：一口氣打出八拳。被動：攻速 +20%、暴擊率 +5%。' },
      { id: 'staffmonk', name: '棍僧', path: '變化', skill: 'sm_wheel', desc: '技能「風車棍」：長棍掄四圈，掃開身邊所有敵人。被動：攻擊範圍 +20%，受到的傷害 −10%。' },
      // 內修派（《法術統整》第五章）：魔力注進全身的細胞強化肉體，不往體外施法
      { id: 'inner', name: '內修者', path: '昭旭・遺跡', skill: 'qijin', desc: '內修派：把魔力質注進全身的細胞，強化肉體和五感。技能「氣勁」：蓄氣一掌震退周圍敵人，打中的行壁直接碎裂。被動：站著不動時回復生命與魔力；攻擊不會讓佩特拉的注意上升。' },
      // 外修者搬到術士（2026-10-04 作者：外修派是法師）；之前就轉成外修者的武術家照舊
      { id: 'waixiu', legacy: 1, name: '外修者', path: '變化', skill: 'wx_burst', desc: '外修派（東方派）的氣道：體外常駐一層無形的魔力罩。技能「氣爆」：把魔力罩一口氣炸開，震飛周圍的敵人。被動：魔力罩會自己慢慢長回來（最多擋生命的 15%）、技能冷卻 −15%；但魔力外放像黑夜裡的燈火，佩特拉的注意上升 +20%。' , legacy: 1 }]
  };
  R.PROMOTE_LV = 15;   // 轉職：職業等級 15（2026-10-04 作者：調高、還要條件；原本 8），段位、轉職試煉、一顆魔力核心見 promote.js
  // 硬核：升級要的經驗值多（同一條公式延到 100 級；整體放慢的倍率在 kaso.js，不做末期加陡——2026-10-06 作者）
  R.xpNeed = lv => 60 + lv * 55;

  R.SKILLS = {
    roll: { name: '翻滾射擊', cd: 6, mp: 8, desc: '朝準心反方向翻滾、瞬間換好彈匣，接下來三發必定暴擊。' },
    volley: { name: '箭雨', cd: 8, mp: 14, desc: '在準心處降下三波箭雨。' },
    whirl: { name: '旋風斬', cd: 8, mp: 10, desc: '原地旋轉 1.2 秒，砍到身邊所有敵人。' },
    fireball: { name: '火球', cd: 5, mp: 18, desc: '射出會爆炸的火球，燒到的敵人持續燃燒。' },
    heal: { name: '治癒之光', cd: 10, mp: 22, desc: '回復 35% 生命，並得到 4 秒護盾。' },
    flash: { name: '瞬斬', cd: 6, mp: 10, desc: '往前衝刺並斬過路上的敵人，衝刺中不會受傷。' },
    charge: { name: '盾牌衝鋒', cd: 7, mp: 10, desc: '往前衝鋒，撞到的敵人被擊退並暈眩。' },
    snipe: { name: '穿心', cd: 7, mp: 12, desc: '蓄力 0.5 秒後射出貫穿一切的子彈，傷害五倍。' },
    element: { name: '元素彈匣', cd: 10, mp: 16, desc: '接下來 12 發子彈輪流帶火、冰、雷，並立刻換好彈匣。' },
    trap: { name: '捕獸夾', cd: 6, mp: 10, desc: '往準心丟出陷阱，踩到的敵人被定住 3 秒並受傷。' },
    homing: { name: '追跡箭雨', cd: 8, mp: 16, desc: '射出 8 支會追蹤敵人的箭。' },
    rage: { name: '狂怒', cd: 14, mp: 12, desc: '6 秒內傷害 +50%、攻速 +30%、吸血 2.5%。' },
    combo: { name: '迴旋連斬', cd: 7, mp: 12, desc: '連續三次環形斬擊並擊退敵人。' },
    meteor: { name: '隕石', cd: 9, mp: 30, desc: '0.8 秒後在準心處落下隕石。' },
    sanctuary: { name: '聖域', cd: 14, mp: 30, desc: '展開 6 秒聖域：每秒回復 5% 生命並灼傷敵人。' },
    wild: { name: '蔓生', cd: 12, mp: 24, desc: '藤蔓纏住周圍敵人 2.5 秒，並持續回復生命。' },
    iai: { name: '居合', cd: 8, mp: 14, desc: '架勢 0.4 秒後一刀斬出一直線，必定暴擊、四倍傷害。' },
    shadowstep: { name: '影步', cd: 7, mp: 12, desc: '瞬移到最近敵人的背後重擊，隱身 2 秒。' },
    holycharge: { name: '聖光衝鋒', cd: 8, mp: 14, desc: '衝鋒並放出聖光震波，回復 15% 生命。' },
    fortress: { name: '堡壘', cd: 15, mp: 14, desc: '5 秒內受到的傷害 −70%，並反彈 30%。' },
    grenade: { name: '爆裂核心', cd: 7, mp: 12, desc: '丟出爆裂核心，落地後大範圍爆炸。' },
    hamaya: { name: '破魔矢', cd: 6, mp: 12, desc: '射穿直線上所有遺跡生物的破魔之箭。' },
    qijin: { name: '氣勁', cd: 7, mp: 10, desc: '蓄氣 0.3 秒後一掌震退周圍敵人，行壁直接碎裂。' },
    hex: { name: '咒縛', cd: 9, mp: 22, desc: '詛咒準心附近的敵人：受到的傷害 +30%、移動變慢 5 秒。' },
    shiki: { name: '式神', cd: 14, mp: 30, desc: '三隻紙式神環繞你並自動攻擊 10 秒。' },
    kekkai: { name: '結界', cd: 13, mp: 26, desc: '張開 5 秒的結界：擋下投射物，範圍內的遺跡生物變弱。' },
    yotoRelease: { name: '妖刀解放', cd: 10, mp: 16, desc: '消耗吸收的魔力質，斬出大範圍的斬擊。' },
    jump: { name: '龍躍', cd: 8, mp: 14, desc: '跳起並落在準心處，震飛周圍敵人。' }
  };

  // ---------- 武器 ----------
  // kind：gun 槍、bow 弓、magic 魔法、melee 揮砍、thrust 突刺
  // 2026-10-03 職業平衡（作者：弓箭手、刀客比較弱）：弓 +20%（短弓 11→13、長弓 25→30、弩 19→23）、聖杖 11→13；弓箭手生命 86→94、刀客 102→112
  R.WEAPONS = {
    pistol: { name: '手槍', cls: ['gunner'], kind: 'gun', dmg: 9, rate: 4.2, speed: 28, range: 14, mag: 12, reload: 1, spread: 0.04 },
    rifle: { name: '步槍', cls: ['gunner'], kind: 'gun', dmg: 3.25, rate: 9, speed: 32, range: 16, mag: 30, reload: 3.2, spread: 0.08 },
    shotgun: { name: '霰彈槍', cls: ['gunner'], kind: 'gun', dmg: 5.5, pellets: 6, rate: 1.3, speed: 24, range: 7, mag: 6, reload: 1.5, spread: 0.45 },
    shortbow: { name: '短弓', cls: ['archer'], kind: 'bow', dmg: 13, rate: 3, speed: 24, range: 15 },
    longbow: { name: '長弓', cls: ['archer'], kind: 'bow', dmg: 30, rate: 1.1, speed: 30, range: 20, pierce: 1, charge: 1 },
    crossbow: { name: '弩', cls: ['archer'], kind: 'bow', dmg: 23, rate: 1.6, speed: 36, range: 17, pierce: 1 },
    greatsword: { name: '大劍', cls: ['warrior'], kind: 'melee', dmg: 28, rate: 1, range: 2.9, arc: 2.4, kb: 3 },
    axe: { name: '戰斧', cls: ['warrior'], kind: 'melee', dmg: 21, rate: 1.4, range: 2.5, arc: 1.9, kb: 2 },
    sword: { name: '長劍', cls: ['warrior', 'knight'], kind: 'melee', dmg: 14, rate: 2.3, range: 2.3, arc: 1.8, kb: 1 },
    staff: { name: '法杖', cls: ['mage'], kind: 'magic', dmg: 15, rate: 2.2, speed: 17, range: 14, mp: 2, splash: 1.3 },
    orb: { name: '法球', cls: ['mage'], kind: 'magic', dmg: 6.5, pellets: 3, rate: 1.8, speed: 15, range: 13, mp: 3, homing: 1, spread: 0.3 },
    holystaff: { name: '聖杖', cls: ['priest'], kind: 'magic', dmg: 13, rate: 2.1, speed: 18, range: 13, mp: 1.5, holy: 1 },
    mace: { name: '戰錘', cls: ['priest', 'knight'], kind: 'melee', dmg: 19, rate: 1.5, range: 2.2, arc: 1.7, kb: 2, stun: 0.15 },
    katana: { name: '刀', cls: ['blade'], kind: 'melee', dmg: 15, rate: 2.7, range: 2.6, arc: 1.6, kb: 1 },
    dualblades: { name: '雙刀', cls: ['blade'], kind: 'melee', dmg: 8.5, hits: 2, rate: 3.4, range: 2, arc: 1.4 },
    spear: { name: '長槍', cls: ['knight'], kind: 'thrust', dmg: 17, rate: 1.9, range: 3.7, width: 0.9, kb: 1.5 },
    gauntlet: { name: '拳套', cls: ['monk'], kind: 'melee', dmg: 7, hits: 2, rate: 3.5, range: 1.8, arc: 1.5, kb: 0.6 },
    staffpole: { name: '長棍', cls: ['monk'], kind: 'melee', dmg: 12, rate: 2.3, range: 3, arc: 2.6, kb: 1.6 }
  };
  R.STARTER = { gunner: 'pistol', archer: 'shortbow', warrior: 'sword', mage: 'staff', priest: 'holystaff', blade: 'katana', knight: 'sword', monk: 'gauntlet' };
  // 登記武器：勇者證上寫的是主要武器，公會照它的類別派委託（類別就是職業）。騎士是「武器＋盾」
  R.REG = [
    { cls: 'gunner', group: '槍械', list: [['pistol', '手槍類（包含雙持），單發準、換彈快。'], ['rifle', '連射，彈匣大。'], ['shotgun', '近距離一發打一片。'], ['sniperrifle', '狙擊槍，射得慢但射程遠、單發重。']] },
    { cls: 'archer', group: '弓', list: [['shortbow', '射得快。'], ['longbow', '按住蓄力，射得遠又痛。'], ['crossbow', '一箭貫穿。']] },
    { cls: 'warrior', group: '重兵器', list: [['sword', '平衡，揮得快。'], ['greatsword', '慢，一刀掃一大片。'], ['axe', '重，把敵人打退。']] },
    { cls: 'mage', group: '魔導具', list: [['staff', '會爆炸的法彈。'], ['orb', '三發會追蹤的法彈。']] },
    { cls: 'priest', group: '聖具', list: [['holystaff', '法彈打中會回一點生命。'], ['mace', '近身打，有機會把敵人打暈。']] },
    { cls: 'blade', group: '刀', list: [['katana', '快、準。'], ['dualblades', '一次砍兩下。']] },
    { cls: 'knight', group: '武器＋盾', list: [['sword', '平衡；正面的傷害減少。'], ['spear', '刺得遠；正面的傷害減少。'], ['mace', '會把敵人打暈；正面的傷害減少。']] },
    { cls: 'monk', group: '拳術', list: [['gauntlet', '近身連打，一次兩拳。'], ['staffpole', '長棍掃一大片，把敵人推開。']] }
  ];
  R.regGroup = cls => R.REG.find(g => g.cls === cls);
  R.regName = (cls, base) => R.WEAPONS[base].name + (cls === 'knight' ? '＋盾' : '');
  R.weaponsFor = cls => Object.keys(R.WEAPONS).filter(k => R.WEAPONS[k].cls.includes(cls));
  R.TIER_NAME = ['鐵製', '魔晶', '核心'];
  R.tierOf = ilvl => (ilvl >= 6 ? 2 : ilvl >= 3 ? 1 : 0);

  // 傳說武器：以三納神與舊太陽神命名（《遺跡》第二章）
  R.LEGENDS = [
    { id: 'retio', name: '瑞提歐的低語', base: 'orb', fx: 'confuse', desc: '思維之神的名字。命中的敵人有機率陷入混亂、攻擊同伴。' },
    { id: 'spetim', name: '斯佩提姆之弦', base: 'longbow', fx: 'blink', desc: '空間之神的名字。箭會在敵人身邊直接出現。' },
    { id: 'vivi', name: '薇薇菲卡提歐的新芽', base: 'holystaff', fx: 'bloom', desc: '創生之神的名字。擊倒敵人時回復生命。' },
    { id: 'kasoon', name: '卡索．昂的殘陽', base: 'greatsword', fx: 'sun', desc: '舊太陽神的名字。揮劍時留下灼熱的軌跡。' },
    { id: 'rift', name: '空間裂隙', base: 'katana', fx: 'blink', desc: '斬擊會在稍遠處再出現一次。' },
    { id: 'petra', name: '佩特拉之瞳', base: 'pistol', fx: 'gaze', desc: '從核心摘下的東西。子彈會凝視目標、自動轉向。' }
  ];

  // ---------- 詞綴 ----------
  R.W_AFFIX = [
    { id: 'sharp', name: '鋒利', roll: [8, 30], txt: v => '傷害 +' + v + '%' },
    { id: 'swift', name: '迅捷', roll: [8, 25], txt: v => '攻擊速度 +' + v + '%' },
    { id: 'crit', name: '致命', roll: [4, 14], txt: v => '暴擊率 +' + v + '%' },
    { id: 'vamp', name: '嗜血', roll: [1, 3], txt: v => '吸血 ' + v + '%' },
    { id: 'fire', name: '焚燒', roll: [15, 40], txt: v => v + '% 機率讓敵人燃燒' },
    { id: 'frost', name: '霜寒', roll: [15, 40], txt: v => v + '% 機率讓敵人減速' },
    { id: 'shock', name: '雷鳴', roll: [10, 30], txt: v => v + '% 機率放出連鎖閃電（跳到附近最多 5 隻）' },
    { id: 'pierce', name: '貫穿', roll: [1, 1], ranged: 1, txt: () => '投射物多貫穿 1 個敵人' },
    { id: 'multi', name: '多重', roll: [1, 1], ranged: 1, txt: () => '每次多射出 1 發' },
    { id: 'heavy', name: '沉重', roll: [30, 80], txt: v => '擊退 +' + v + '%' },
    { id: 'cursed', name: '詛咒', roll: [25, 40], curse: 1, txt: v => '傷害 +' + v + '%，最大生命 −15%' },
    { id: 'pen', name: '穿透', roll: [10, 35], txt: v => '無視敵人 ' + v + '% 的護甲' }   // 2026-10-04 作者：新增穿透
  ];
  R.A_AFFIX = [
    { id: 'tough', name: '堅固', roll: [2, 8], txt: v => '防禦 +' + v },
    { id: 'vital', name: '活力', roll: [10, 40], txt: v => '最大生命 +' + v },
    { id: 'spirit', name: '靈氣', roll: [10, 35], txt: v => '最大魔力 +' + v },
    { id: 'evade', name: '靈巧', roll: [10, 30], txt: v => '翻滾冷卻 −' + v + '%' },
    { id: 'regen', name: '回復', roll: [3, 12], txt: v => '每秒回復 ' + (v / 10) + ' 生命' },
    { id: 'focus', name: '專注', roll: [8, 25], txt: v => '技能冷卻 −' + v + '%' },
    { id: 'calm', name: '靜默', roll: [10, 35], txt: v => '佩特拉的注意上升 −' + v + '%' },
    { id: 'greed', name: '貪婪', roll: [15, 50], txt: v => '委託報酬 +' + v + '%' },
    { id: 'mpregen', name: '回魔', roll: [3, 12], txt: v => '每秒回復 ' + (v / 10) + ' 魔力' }   // 2026-10-04 作者：新增回魔
  ];
  // 防具分四個部位；每個部位有輕、中、重三種（w）。斗笠和草鞋是昭旭的東西
  R.SLOTS = [{ id: 'head', name: '帽子' }, { id: 'body', name: '上衣' }, { id: 'legs', name: '褲子' }, { id: 'feet', name: '鞋子' }];
  R.GEAR_KEYS = ['weapon', 'head', 'body', 'legs', 'feet', 'charm'];
  R.GEAR_NAME = { weapon: '武器', head: '帽子', body: '上衣', legs: '褲子', feet: '鞋子', charm: '護符' };
  R.ARMOR = {
    head_light: { slot: 'head', w: 'light', name: '斗笠', def: 0.6, spd: 0 },
    head_medium: { slot: 'head', w: 'medium', name: '鎖頭巾', def: 1.2, spd: 0 },
    head_heavy: { slot: 'head', w: 'heavy', name: '鐵兜', def: 2, spd: -0.01 },
    body_light: { slot: 'body', w: 'light', name: '皮衣', def: 1.6, spd: 0 },
    body_medium: { slot: 'body', w: 'medium', name: '鎖甲', def: 3.2, spd: -0.02 },
    body_heavy: { slot: 'body', w: 'heavy', name: '板甲', def: 5.2, spd: -0.04 },
    legs_light: { slot: 'legs', w: 'light', name: '布褲', def: 0.9, spd: 0 },
    legs_medium: { slot: 'legs', w: 'medium', name: '鎖腿甲', def: 1.8, spd: -0.01 },
    legs_heavy: { slot: 'legs', w: 'heavy', name: '板腿甲', def: 2.9, spd: -0.02 },
    feet_light: { slot: 'feet', w: 'light', name: '草鞋', def: 0.4, spd: 0.03 },
    feet_medium: { slot: 'feet', w: 'medium', name: '皮靴', def: 0.8, spd: 0.01 },
    feet_heavy: { slot: 'feet', w: 'heavy', name: '鐵靴', def: 1.4, spd: -0.01 }
  };

  // ---------- 素材 ----------
  // 能帶出遺跡的：寶箱開出的東西、遺跡生物體內的魔力水晶與魔力核心、礦殼背上的礦石（《遺跡》第一章第五節）
  R.MATS = {
    branch: { name: '樹枝', color: '#8A6A44', value: 1, desc: '哈米莉亞級的寶箱最常開出來的東西。' },
    herb: { name: '藥草', color: '#6FB36A', value: 3, desc: '三株可以在鐵匠鋪旁的藥櫃換一瓶回復藥水。' },
    iron: { name: '鐵礦', color: '#A3ACB6', value: 6, desc: '從礦殼背上掘下來的礦石。' },
    shell: { name: '甲殼', color: '#7A6552', value: 5, desc: '礦殼的外殼。' },
    manaore: { name: '魔晶礦', color: '#8A74FF', value: 14, desc: '含著魔力質的礦石，礦殼背上偶爾會長。' },
    crystal: { name: '魔力水晶', color: '#5FE0FF', value: 10, desc: '遺跡生物體內的魔力結晶。' },
    core: { name: '魔力核心', color: '#FF6AA8', value: 60, desc: '強大個體體內的核心。轉職也要用。' },
    wing: { name: '翼肢碎片', color: '#F0D9A0', value: 120, desc: '佩特拉核心兩側「翼肢」的碎片。' }
  };

  // ---------- 遺跡生物 ----------
  // 高階的佩特拉核心能生成遺跡生物；低階遺跡裡的，多半是被魔力質吸引、變得異常暴躁的生物（《遺跡》第一章第一項、第二章第一項）。
  // 名字是公會東鶴分館的圖鑑取的（看牠們的樣子和習性），不用民間傳說的名字。「礦殼」「佩特拉核心」是公會正式文件裡的名字（《遺跡》第一章第五節）。
  R.ENEMIES = {
    kousaku: { name: '礦殼', ref: '公會文件', hp: 50, dmg: 10, speed: 2.5, xp: 7, size: 0.85, ai: 'chase', armor: 0.35, ore: 1, color: '#6E5A4A', eye: '#FFD24A',
      desc: '背上長著水晶或礦石的類甲蟲生物，會群聚成礦脈的樣子。殺死之後可以「掘礦」。' },
    kamaitachi: { name: '三連貂', ref: '', hp: 20, dmg: 7, speed: 6.4, xp: 5, size: 0.55, ai: 'trio', color: '#C9D6E0', eye: '#7FE0FF',
      desc: '三隻一組出現：第一隻把人絆倒，第二隻用前肢的鐮刀劃開傷口，第三隻替同伴療傷。先打第三隻。' },
    onibi: { name: '游焰', ref: '', hp: 16, dmg: 9, speed: 3.2, xp: 6, size: 0.5, ai: 'kite', shoot: 0.55, fly: 1, color: '#7FD8FF', eye: '#FFFFFF',
      desc: '火團一樣的遺跡生物，會和人保持距離，吐出帶著魔力質的火球。怕水。' },
    nurikabe: { name: '行壁', ref: '', hp: 110, dmg: 18, speed: 1.8, xp: 13, size: 1.3, ai: 'wall', armor: 0.3, coreChance: 0.05, color: '#8A8476', eye: '#FF6A4A',
      desc: '會走路的牆。佩特拉用來堵住受損通道的東西，擋在路中間時只能從旁邊繞，或是打碎它。' },
    okuriinu: { name: '尾隨犬', ref: '', hp: 30, dmg: 10, speed: 6.3, xp: 7, size: 0.65, ai: 'stalk', color: '#4A4458', eye: '#E05AFF',
      desc: '成群跟在人後面，不會先動手。一旦有人跌倒、翻滾或受傷，就整群撲上來。' },
    kasa: { name: '獨腳傘', ref: '', hp: 24, dmg: 8, speed: 4, xp: 6, size: 0.7, ai: 'hop', color: '#C8503A', eye: '#FFE08A',
      desc: '一條腿跳著走的破傘。轉起來會把雨滴一樣的魔力彈灑向四周。' },
    chochin: { name: '喚群燈', ref: '', hp: 14, dmg: 0, speed: 2, xp: 5, size: 0.6, ai: 'alarm', fly: 1, color: '#F2B45A', eye: '#2A1A10',
      desc: '一看到人就張嘴大叫，把整區的遺跡生物都叫過來，佩特拉的注意也會跟著上升。先打掉它。' },
    gaki: { name: '填隙肉芽', ref: '', hp: 14, dmg: 6, speed: 4.8, xp: 3, size: 0.5, ai: 'chase', color: '#9A6A6A', eye: '#FFE0A0',
      desc: '生物型反應時，從牆裡長出來的肉體組織。一群一群的，永遠吃不飽。' },
    wanyudo: { name: '焰輪', ref: '', hp: 70, dmg: 16, speed: 7, xp: 11, size: 1, ai: 'roll', env: 'volcano', color: '#3A2A22', eye: '#FF8A3A',
      desc: '只在火山環境出現。帶著火的車輪直線衝撞，撞牆會暈一下。' },
    sunakake: { name: '砂幕者', ref: '', hp: 34, dmg: 8, speed: 3.4, xp: 8, size: 0.7, ai: 'kite', blind: 1, env: 'desert', color: '#B89A6A', eye: '#FFFFFF',
      desc: '只在沙漠環境出現。裹著粗布的人形，朝人拋出一整片砂幕，被撒中會看不清楚。' },
    isonade: { name: '鉤尾鯊', ref: '', hp: 60, dmg: 14, speed: 3, xp: 10, size: 1.1, ai: 'ambush', env: 'deep', color: '#2E5A6A', eye: '#9AFFE0',
      desc: '只在深海環境出現。躲在地面下，用尾巴上的倒鉤把人勾過去。' },
    yukionna: { name: '霜衣', ref: '', hp: 40, dmg: 10, speed: 3.6, xp: 9, size: 0.75, ai: 'kite', freeze: 1, env: 'snow', color: '#E8F2F8', eye: '#5FB8FF',
      desc: '北州的遺跡才看得到。白衣、黑長髮的人形，吐出的寒氣會讓人動作變慢。' },
    tsuchigumo: { name: '領主體・巢織蛛', ref: '', hp: 520, dmg: 20, speed: 3, xp: 70, size: 2.2, ai: 'lord', armor: 0.2, color: '#3A3430', eye: '#FF5A3A', boss: 1,
      desc: '克森特級遺跡的「領主體」：支配一區的巨型個體。吐出的蛛網會黏住人，還會把幼體從天花板放下來。' },
    omukade: { name: '領主體・千節蟲', ref: '', hp: 640, dmg: 22, speed: 4.4, xp: 80, size: 2, ai: 'centipede', armor: 0.25, color: '#6A2A1E', eye: '#FFD04A', boss: 1,
      desc: '克森特級遺跡的「領主體」。身體一節一節的，只有頭會受傷。繞著房間爬，越打越快。' },
    hyakume: { name: '群瞳', ref: '', hp: 150, dmg: 11, speed: 3.2, xp: 24, size: 1.25, ai: 'eye', fly: 1, color: '#E8D8D0', eye: '#9A2A3A', coreChance: 0.15, modelScale: 0.7,
      desc: '全身長滿眼睛的遺跡生物。被它看見的時候，佩特拉的注意會一直往上升。會瞬移、放出凝視的光線。先打掉它。' },
    // ---- v14 新增 ----
    kodama: { name: '根童', ref: '', hp: 18, dmg: 5, speed: 3.6, xp: 4, size: 0.45, ai: 'skitter', color: '#E8EEE0', eye: '#1A1A1A',
      desc: '小小的白色樹靈，成群在樹根之間晃，頭會喀啦喀啦地轉。被打了會四散逃開，過一會兒又圍回來吐種子。' },
    ittan: { name: '纏身布', ref: '', hp: 26, dmg: 9, speed: 4.2, xp: 7, size: 0.7, ai: 'swoop', fly: 1, color: '#F2F0E8', eye: '#2A2A2A',
      desc: '一長條白布在空中飄。地上拉出一條紅線之後，會沿著那條線直直衝過來；被纏住就動不了。' },
    kappa: { name: '盤頂蛙', ref: '', hp: 44, dmg: 11, speed: 3.4, xp: 9, size: 0.75, ai: 'grapple', color: '#5A8A5A', eye: '#FFE08A',
      desc: '頭頂盛著水的盤子。抓住人就往後摔。一下打得夠重，盤子裡的水灑出來，牠就會呆住，這時打牠特別痛。' },
    nozuchi: { name: '鑽口蛇', ref: '', hp: 50, dmg: 14, speed: 3.2, xp: 10, size: 0.8, ai: 'burrow', color: '#7A6A4A', eye: '#2A1A10',
      desc: '沒有眼睛、只有嘴巴的粗蛇。在地底下鑽的時候打不到；腳下冒出紅圈就快跑。鑽出來之後會在外面待一下，那時候才打得到。' },
    bakeneko: { name: '影撲貓', ref: '', hp: 34, dmg: 12, speed: 5.6, xp: 10, size: 0.6, ai: 'pounce', color: '#2E2A30', eye: '#9AFF6A',
      desc: '比狗還大的黑貓。在旁邊繞圈子，壓低身子就是要撲過來了——看地上的圈。撲完會隱身一下。' },
    honemusha: { name: '守墓骨兵', ref: '', hp: 60, dmg: 13, speed: 2.8, xp: 11, size: 0.8, ai: 'guard', armor: 0.1, color: '#E8E0CC', eye: '#FF5A3A',
      desc: '陵墓裡守墓的骸骨，舉著圓盾。正面幾乎打不動；等牠揮完刀、盾放下來的時候，或繞到背後再打。' },
    karasu: { name: '三羽鴉', ref: '', hp: 32, dmg: 9, speed: 4.6, xp: 10, size: 0.7, ai: 'kite', shoot: 0.5, fan: 3, fly: 1, color: '#2A2A34', eye: '#FFD04A',
      desc: '烏鴉頭、人的身形，披著破舊的長衣。飛在半空，一次射出三根羽毛，會飛過深淵。' },
    ushioni: { name: '蛛身牛', ref: '', hp: 220, dmg: 20, speed: 3, xp: 30, size: 1.5, ai: 'charge', armor: 0.15, elite: 1, color: '#3A2E3A', eye: '#FF3A3A', coreChance: 0.2,
      desc: '牛的頭、蛛的身子。低頭刨地就是要衝過來了——閃到旁邊，讓牠撞牆暈過去。靠太近會被踩。摩爾斯級以上才看得到。' },
    gashadokuro: { name: '領主體・地出巨骸', ref: '', hp: 760, dmg: 24, speed: 1.6, xp: 90, size: 2.6, ai: 'giant', armor: 0.2, color: '#E8E0CC', eye: '#FF5A3A', boss: 1,
      desc: '克森特級遺跡的「領主體」。從地底探出上半身的巨大骸骨。揮手掃過一大片、拍地，還會叫守墓骨兵出來。' },
    // ---- 人（遺跡裡的壞人、私人賞金獵人）：不是遺跡生物，不放進圖鑑 ----
    rogue: { name: '惡質的勇者', ref: '', human: 1, hp: 105, dmg: 13, speed: 5.4, xp: 16, size: 0.7, ai: 'chase', color: '#5A4A3A', eye: '#FFFFFF', desc: '' },
    rogue_shot: { name: '惡質的勇者', ref: '', human: 1, hp: 80, dmg: 11, speed: 5.0, xp: 16, size: 0.7, ai: 'kite', shoot: 0.6, shot: 'bullet', color: '#5A4A3A', eye: '#FFFFFF', desc: '' },
    hunter: { name: '私人賞金獵人', ref: '', human: 1, hp: 165, dmg: 17, speed: 5.8, xp: 28, size: 0.7, ai: 'chase', armor: 0.1, color: '#3A3A44', eye: '#FFFFFF', desc: '' },
    petra: { name: '佩特拉核心', ref: '公會文件', hp: 3000, dmg: 18, speed: 0, xp: 320, size: 4.6, ai: 'core', fly: 1, color: '#EDE0D6', eye: '#8A1A2A', boss: 1,
      desc: '懸浮在最深處的巨大眼球，有瞳孔、血管與翼肢。周圍五到十公尺是「異常狀態力場」。' }
  };
  // 目目連：佩特拉的注意升高時，牆上會一個一個張開眼睛（只是畫面效果，不是敵人）
  R.MOKUMOKUREN = '牆瞳：牆上張開的眼睛越多，代表佩特拉越注意你。';

  // ---------- 遺跡：二區六級 ----------
  R.GRADES = [
    // 分級的內容照《遺跡》第二章第二項：防衛機制從阿彌勒級開始，組織狩獵從摩爾斯級開始，極端環境與領主體是克森特級的
    { id: 'hamilia', name: '哈米莉亞級', letter: 'F', zone: '保留區', floors: 2, lv: 1, loot: 0, floor0: 1, crystal: 'start', pool: ['kousaku', 'onibi', 'kasa', 'kodama'], boss: null, passive: 1,
      desc: '威脅最低，一般民眾登記後也能進入。遺跡生物雖然暴躁，但不會主動攻擊人，也沒有防衛機制。寶箱只開得出藥草和樹枝，戰利品多半靠自己採集、掘礦。' },
    { id: 'amile', name: '阿彌勒級', letter: 'E～D', zone: '保留區', floors: 4, lv: 2, loot: 1, floor0: 1, crystal: 'start', pool: ['kousaku', 'onibi', 'kasa', 'nurikabe', 'chochin', 'hyakume', 'kodama', 'ittan', 'kappa', 'nozuchi'], boss: null, traps: 'some',
      desc: '數量最多的分級，只有公會勇者能進入。有明顯的防衛機制（房間門口的膜），遺跡生物會主動攻擊，部分區域有陷阱。最深處看得到佩特拉核心，但保留區的核心受公會保護，不能攻擊。', unlock: 'hamilia' },
    { id: 'mors', name: '摩爾斯級', letter: 'C～A', zone: '保留區', floors: 5, lv: 3, loot: 2, floor0: 0, crystal: 'stairs', pool: ['kousaku', 'onibi', 'kamaitachi', 'nurikabe', 'okuriinu', 'chochin', 'kasa', 'hyakume', 'ittan', 'kappa', 'nozuchi', 'bakeneko', 'honemusha', 'karasu', 'ushioni'], boss: null, traps: 'rooms', nest: 1,
      desc: '沒有「第 0 層」：回歸水晶只在每層的樓層通道旁。生物有領地意識，會成群協作、組織狩獵（三連貂三隻一組、尾隨犬成群）。常有獨立的陷阱區；最深處是尾隨犬的巢。', unlock: 'amile' },
    { id: 'kesent', name: '克森特級', letter: 'AA～SS', zone: '討伐區', floors: 5, lv: 4, loot: 3, floor0: 0, crystal: 'stairs', sealed0: 1, pool: ['kousaku', 'onibi', 'kamaitachi', 'nurikabe', 'okuriinu', 'chochin', 'hyakume', 'ittan', 'nozuchi', 'bakeneko', 'honemusha', 'karasu', 'ushioni'], boss: 'petra', lords: ['tsuchigumo', 'omukade', 'gashadokuro'], env: 1, traps: 'set',
      desc: '入口會自我閉合，只能靠傳送水晶投送進去；公會在每一層的樓層通道旁、第一層的落點投放了回歸水晶。內部有深海、沙漠、火山、凍原等極端環境；生物會設陷阱；各區有「領主體」支配。最深處是佩特拉核心本體。', unlock: 'mors' },
    { id: 'kaso', name: '卡索級', letter: 'SSS～G', zone: '討伐區', locked: '公會明文禁止任何個人單獨進入卡索級遺跡。約 1500 年間只出現過 7 次。' },
    { id: 'kansait', name: '坎賽特級', letter: '特別殲滅指定', zone: '討伐區', locked: '發現即通報、撤離。所有已確認的個體，都已由公會會長親自討伐。相關檔案列為最高機密。' }
  ];
  R.gradeById = id => R.GRADES.find(g => g.id === id);
  // 遺跡的形式：分層（垂直）與分區（水平）
  R.TYPES = {
    tower: { name: '高塔型', floors: 1, rooms: () => 5, favor: { karasu: 2, ittan: 2, onibi: 1 }, desc: '分層多、分區少，像一座往下長的塔。' },
    city: { name: '城區型', floors: 0, rooms: () => 8, favor: { kasa: 2, chochin: 1, kappa: 1 }, desc: '分層與分區數量相近，方正得像一座城鎮。' },
    maze: { name: '迷宮型', floors: -1, rooms: () => 11, favor: { kodama: 3, nozuchi: 2, okuriinu: 1 }, desc: '分區多、分層少，像迷宮一樣繞。' },
    tomb: { name: '陵墓型', floors: 0, rooms: f => Math.min(16, 4 + f * 2), favor: { honemusha: 4, onibi: 1, chochin: 1 }, lord: 'gashadokuro', desc: '頂部分區少、底部分區多，越往下越寬，像一座倒過來的金字塔。' },
    island: { name: '浮島型', floors: 0, rooms: () => 7, favor: { kappa: 3, karasu: 2 }, desc: '只出現在海上。分區多，形成島狀，島上還有偽裝成高塔型的遺跡。' }
  };
  // 佩特拉核心的自衛與修復行為（《遺跡》第一章第三節）
  R.REACTIONS = {
    squeeze: { name: '擠壓型', desc: '牆壁向內擠壓，填滿受損處。' },
    collapse: { name: '崩塌型', desc: '引發局部崩塌，石壁剝落下來當作填充物。' },
    bio: { name: '生物型', desc: '長出大型肉體組織，填補破損。' },
    tail: { name: '斷尾型', desc: '把受損的那一區切掉：房間的出入口前後都會封死。快離開那個房間！' },
    expel: { name: '驅逐型', desc: '核心離受損的地方夠近時，會親自過來驅趕破壞者（逼近、把人推開）。太遠過不來，但會記住你：走得越深，它越快找上你。' }
  };
  // 克森特級的極端環境
  R.ENVS = {
    volcano: { name: '火山', floor: '#2A1C18', wall: '#3A2A24', light: '#FF7A3A', fog: '#2A140E', desc: '熔岩會燙傷人。' },
    desert: { name: '沙漠', floor: '#B89A6A', wall: '#8A7050', light: '#FFD9A0', fog: '#6A5A40', desc: '沙地走不快，沙暴來時看不遠。' },
    deep: { name: '深海', floor: '#1E3A48', wall: '#1A2E3A', light: '#5FC8E0', fog: '#0A1C26', desc: '水壓讓人和子彈都變慢。' },
    snow: { name: '凍原', floor: '#C8D4DE', wall: '#8A98A6', light: '#DDEEFF', fog: '#1A2430', desc: '地面結冰會滑，寒氣讓體力慢慢流失。' }
  };
  R.THEMES = {
    hamilia: { floor: '#8A8A6E', wall: '#9C9478', top: '#CEC6A4', light: '#FFF0C8', fog: '#46564A', accent: '#9AE08A' },   // 2026-10-04 回饋：哈米莉亞級太壓抑——亮一點、暖一點（原本 #4A5A44／#5E6A56／#8A9A7A／#A8E09A／#101A12）
    amile: { floor: '#5E4E3A', wall: '#6E5A42', top: '#A08A64', light: '#FFD08A', fog: '#16110A', accent: '#FFC45A' },
    mors: { floor: '#2E2A38', wall: '#3A3448', top: '#5A5070', light: '#B89AFF', fog: '#0C0A14', accent: '#B07AFF' },
    kesent: { floor: '#2A2A30', wall: '#3A3A44', top: '#5A5A66', light: '#FFFFFF', fog: '#0A0A10', accent: '#FF5A7A' }
  };

  // ---------- 昭旭聯合王國的地圖 ----------
  // 國界來自作者 wiki 的世界地圖模型。三座島：北州、天宮（本土）、納瓦（作者命名）。首都皇嶺、陪都東鶴是設定。
  // 時間點：公元 2836 年（和《公會館員日誌》同一年）。
  // src：設定＝作者的設定；館員＝《公會館員日誌》；東鶴＝《東鶴初心》；遊戲＝這款遊戲新增。
  R.NATION = { name: '昭旭聯合王國', capital: '皇嶺', gov: '阿德勒－君主立憲制', pop: '約一億三千萬', year: 2836 };
  R.ISLANDS = [{ name: '北州', x: 36.62, z: -26.2 }, { name: '天宮', x: 36.6, z: -23.28, onLand: 1 }, { name: '納瓦', x: 38.95, z: -19.72 }];
  R.SRC = { 設定: '出自設定', 館員: '出自《公會館員日誌》', 東鶴: '出自《東鶴初心》', 遊戲: '遊戲新增的地點' };
  R.SITES = [
    // 全國地圖（x、z：模型座標）
    { id: 'huangling', map: 'nation', x: 35.02, z: -22.5, kind: 'capital', name: '皇嶺', src: '設定', desc: '昭旭聯合王國的首都，建在天宮島中央的山嶺上。象徵意義比實際價值更濃：山嶺都城、碉堡、城堡，是昭旭皇室的象徵與昭皇居所；即使現代化，仍偏向觀光與政治中心。主要設施：公會昭旭分館、世界央行昭旭分館、昭皇大學（附設魔力學院分院）、昭旭城古蹟、皇城、向日塔；子設施含觀光地、山嶺國際機場、遊樂場、山城、神社。', hubCity: 1 },
    { id: 'donghe', map: 'nation', x: 35.98, z: -22.3, kind: 'city', name: '東鶴', src: '設定', desc: '陪都。公會東鶴分館（西市口的綠旗石樓）、老岩的鐵匠鋪都在這裡。從遺跡帶回來的東西，在這裡鑑定、製作。', zoom: 'donghe' },
    // 其他城市：照作者給的天宮、北州、納瓦的城市圖與《昭旭重要城市》；陪都東鶴、吉山、奉主；多數城市可從東鶴站搭電車前往（azukicities.js）
    // lx、ly：名字的位置（預設寫在記號下面；附近有遺跡的名字時改寫在左邊、右邊或上面）
    { id: 'jishan', map: 'nation', x: 34.63, z: -22.22, kind: 'city', name: '吉山', src: '設定', desc: '陪都。奉主淪陷後昭旭人口第一大都、第一大工業城：原材料、重工業、機械與科技（賽博＋和式）。德克斯凡入股後第一個開發的城市。設施含各家公司、重工廠、科技／機器人／礦場／煉油／兵工廠／魔導具／外骨骼／股票、世界央行吉山分館、公會分館、地下賭場；子設施有租車、魔導懸浮車公司。', lx: -30, ly: 6, hubCity: 1 },
    { id: 'fengzhu', map: 'nation', x: 35.40, z: -21.52, kind: 'city', name: '奉主', src: '設定', desc: '陪都。在天宮島南部的中央、東鶴的西南。可從東鶴站搭魔導電車前往（獨立 3D 城場景）。' },
    { id: 'futing', map: 'nation', x: 35.50, z: -22.26, kind: 'city', name: '府廳', src: '設定', desc: '軍事重鎮：培養皇武軍等中央軍，大部分為軍事用地。因境內出現遺跡蹤跡，開放公會有限定駐紮。主要設施：軍營、軍部、戰爭公園、小住宅區、分會特劃區；子設施有神社。', hubCity: 1 },
    { id: 'bannan', map: 'nation', x: 35.80, z: -23.43, kind: 'city', name: '板南', src: '設定', desc: '天宮島中部觀光城，與板北對標的姊妹都。橫山林立的建築與碉堡曾是昭光帝國北方防禦線。設施：板南城、通天道、仰天寺、公會板南分館、舊陸軍營地、妖物寺、機場、中樞鐵路；子設施有日下森電器、森川重工。', lx: 26, ly: 6, hubCity: 1 },
    { id: 'banbei', map: 'nation', x: 36.20, z: -24.04, kind: 'city', name: '板北', src: '設定', desc: '天宮島北方、連結北州的橋樑。會戰後曾被外國長期駐紮，兩板中較為開放也較有限制。設施：艾美利亞造車廠、英尼爾斯製藥廠、國際機場、夜店、紅燈區、渡輪港、公會板北分館、世界央行板北分館、朝日科技；子設施有酒店、地下賭場。', lx: -26, ly: 6, hubCity: 1 },
    { id: 'zhengyuan', map: 'nation', x: 34.80, z: -23.50, kind: 'city', name: '征遠', src: '設定', desc: '西北海軍重鎮與國內最大造船場。曾造出戰列艦「武聖號」；第二次大陸會戰後以商業、民用船為主。設施：公會征遠分館、造船廠、鋼鐵廠、軍艦博物館、大型海港、軍港、海軍訓練所、船屋、舊艦遺址；子設施有英尼爾斯領事館。', lx: -30, ly: 6, hubCity: 1 },
    { id: 'xijian', map: 'nation', x: 34.54, z: -21.34, kind: 'city', name: '西見', src: '設定', desc: '港都。曾是昭旭與殖民地聯繫的第一港，第二次大陸會戰後遭艾美利亞轟炸與封鎖，如今為對外貿易港。設施：公會西見分館、西見海洋大學（魔力學院分院與水下訓練營）、港口、漁港、西見遠督機場；子設施有海灘公園、艾美利亞領事館、造船廠、軍艦停靠處。', hubCity: 1 },
    { id: 'nanlong', map: 'nation', x: 35.57, z: -20.41, kind: 'city', name: '南瀧', src: '設定', desc: '國際港都（西見沒落後的第二港，第一為東鶴）。面向大洋的深海港，曾創下三年裝卸貨量最大；因遠離首都圈發展慢於東鶴。清晨川湍急、夜晚霧朦朧，川派「瀧」勝出得名。設施：公會南瀧分館、世界央行南瀧分館、湍遊國際大學、卸貨第一雕像、貨輪港、造船廠、商業區；子設施有德克斯凡領事館、外貿公司。', hubCity: 1 },
    { id: 'yuebei', map: 'nation', x: 35.57, z: -25.59, kind: 'city', name: '岳北', src: '設定', desc: '北州觀光重鎮：山、礦、洋一體的美食都城。名物「翠晶粉條」「土鎧大烤肉」「藍殼蟹膏拌飯」。設施：公會岳北分館、漁港、獵人營地、礦山、食品大樓、老字號、國際機場、國際酒店；子設施有德克斯凡美食盟會、蘭斯－波旁觀光局。', lx: -26, ly: 6, hubCity: 1 },
    { id: 'gusen', map: 'nation', x: 37.08, z: -24.89, kind: 'city', name: '古森', src: '設定', desc: '北州自然城市：人文與生態調和，可見大古森木。設施：公會古森分館、自然保護協會、植樹場、生態平衡公司、古森精靈部落、古森木開發、梯田、茶廠；子設施有老街巷、動物園、古森木造公司。', lx: 26, ly: 6, hubCity: 1 },
    { id: 'woqi', map: 'nation', x: 37.09, z: -20.60, kind: 'city', name: '渦旗', src: '設定', desc: '連接納瓦與天宮的漁港。秋季銀旗魚順渦流海灣下大洋繁衍，漁民出海捕魚的時機因而得名。設施：公會渦旗分館、漁港、海魚市集、漁業會館、壽司店、開發中地區、物流公司；子設施有華爾納外貿協會、法蘭克漁業公司。', lx: -26, ly: 6, hubCity: 1 },
    { id: 'kanko', map: 'nation', x: 35.72, z: -20.72, kind: 'ruin', grade: 'hamilia', type: 'city', name: '皇嶺南郊・觀光遺跡', src: '遊戲', desc: '經公會評估開放觀光的哈米莉亞級遺跡。入口有賣票的攤子。', status: 'open', ly: -22 },
    { id: 'seigan', map: 'nation', x: 34.28, z: -21.72, kind: 'ruin', grade: 'amile', type: 'city', name: '西岸・城區遺跡', src: '遊戲', desc: '面對海峽的城區型遺跡，分區和分層差不多多。', status: 'open', lx: -76, ly: 6 },
    { id: 'js-factory', map: 'nation', x: 34.48, z: -22.05, kind: 'ruin', grade: 'amile', type: 'city', name: '吉山近郊・工廠遺跡', src: '遊戲', desc: '德克斯凡合資工廠區底下長出來的城區型遺跡。輸送帶與魔導管線還在空轉，礦殼與機械種特別多。從吉山公會分館可接委託。', status: 'open', lx: -40, ly: -18 },
    { id: 'ft-camp', map: 'nation', x: 35.62, z: -22.10, kind: 'ruin', grade: 'mors', type: 'tomb', name: '府廳・舊兵營遺跡', src: '遊戲', desc: '軍事用地邊緣被遺跡吞掉的舊兵營。公會特劃區只開放討伐段以上進駐；內部是陵墓型，越往下越像地下指揮所。', status: 'lock', ly: -22 },
    { id: 'xj-under', map: 'nation', x: 34.40, z: -21.10, kind: 'ruin', grade: 'amile', type: 'maze', env: 'deep', name: '西見港・水下迷宮', src: '遊戲', desc: '西見海洋大學水下訓練營附近發現的迷宮型遺跡。海水滲進去，走廊像水族館——只是水族館不會回頭咬人。', status: 'open', lx: -50, ly: 8 },
    { id: 'zy-wreck', map: 'nation', x: 34.95, z: -23.70, kind: 'ruin', grade: 'mors', type: 'island', env: 'deep', name: '征遠・舊艦遺址', src: '遊戲', desc: '軍港外擱淺的舊戰列艦殘骸被遺跡吃進去，變成浮島型遺構。甲板層層疊疊，有時還聽得到不存在的汽笛。', status: 'lock', lx: -36, ly: -18 },
    { id: 'bn-army', map: 'nation', x: 35.95, z: -23.60, kind: 'ruin', grade: 'mors', type: 'maze', name: '板南・舊陸軍營地遺跡', src: '遊戲', desc: '板南舊陸軍營地封鎖區長出的迷宮。碉堡、壕溝與妖物寺的香火味道混在一起。', status: 'lock', lx: 30, ly: -18 },
    { id: 'gs-root', map: 'nation', x: 37.25, z: -24.70, kind: 'ruin', grade: 'amile', type: 'maze', name: '古森・樹根迷宮', src: '遊戲', desc: '大古森木根底下的迷宮型遺跡。自然保護協會與公會古森分館共同監管；精靈部落稱它為「還在呼吸的洞」。', status: 'open', lx: 28, ly: -18 },
    { id: 'yb-mine', map: 'nation', x: 35.40, z: -25.40, kind: 'ruin', grade: 'mors', type: 'tomb', env: 'snow', name: '岳北・礦山陵墓', src: '遊戲', desc: '岳北礦山巷道挖穿的陵墓型遺跡。冬天礦口結霜，獵人營地的人說裡面的腳步聲比礦車還整齐。', status: 'lock', lx: -40, ly: 8 },
    { id: 'wq-eddy', map: 'nation', x: 37.25, z: -20.40, kind: 'ruin', grade: 'amile', type: 'island', env: 'deep', name: '渦旗・渦流灣遺跡', src: '遊戲', desc: '秋季渦流帶出的浮島型遺跡，漁民說銀旗魚會繞著它游。公會渦旗分館在漁汛前後特別忙。', status: 'open', lx: 26, ly: 8 },
    { id: 'hokuroku', map: 'nation', x: 35.36, z: -23.52, kind: 'ruin', grade: 'mors', type: 'tomb', name: '皇嶺北麓・陵墓遺跡', src: '遊戲', desc: '長在山腳地下的陵墓型遺跡：越往下越寬。沒有第 0 層。', status: 'lock', ly: -22 },
    { id: 'toudo', map: 'nation', x: 35.86, z: -25.44, kind: 'ruin', grade: 'kesent', type: 'tower', env: 'snow', name: '北州・凍原遺跡', src: '遊戲', desc: '北州雪原底下的高塔型遺跡。內部是一整片凍原——克森特級才有的極端環境。霜衣在這裡出沒。', status: 'lock' },
    { id: 'tougrei', map: 'nation', x: 36.9, z: -24.2, kind: 'ruin', grade: 'mors', type: 'maze', name: '天宮・東嶺迷宮遺跡', src: '遊戲', desc: '天宮東邊山嶺裡的迷宮型遺跡。尾隨犬在這裡成群狩獵，常有獨立的陷阱區。', status: 'lock', ly: -22 },
    { id: 'kazan', map: 'nation', x: 37.62, z: -20.38, kind: 'ruin', grade: 'kesent', type: 'tower', env: 'volcano', name: '納瓦・火山遺跡', src: '遊戲', desc: '整座納瓦火山的內部都被遺跡吃掉了。入口不斷閉合，只能用傳送水晶投送。', status: 'lock' },
    { id: 'ukishima', map: 'nation', x: 38.72, z: -22.62, kind: 'ruin', grade: 'kesent', type: 'island', env: 'deep', name: '外海・浮島遺跡', src: '遊戲', desc: '只會出現在海上的浮島型遺跡，島上還長著好幾座偽裝成高塔型的遺跡。', status: 'lock' },
    { id: 'kaso', map: 'nation', x: 39.45, z: -25.85, kind: 'forbidden', grade: 'kaso', name: '封鎖海域', src: '遊戲', desc: '公會明文禁止任何個人單獨進入卡索級遺跡。航海圖上這一塊，是用紅筆整片塗掉的。', status: 'forbidden' },
    // 東鶴近郊（x、y：0～100 的示意座標）
    { id: 'dh-town', map: 'donghe', x: 57, y: 62, kind: 'city', name: '東鶴', src: '設定', desc: '公會東鶴分館、鐵匠鋪、白藤堂、倉庫。遺跡回來的第一站。', hub: 1 },
    { id: 'dh-sokkutsu', map: 'donghe', x: 80, y: 7, kind: 'ruin', grade: 'hamilia', type: 'maze', name: '霜溪石窟', src: '遊戲', desc: '霜溪上游的哈米莉亞級遺跡。一般民眾經登記也能進去採藥草。第一次下遺跡就從這裡開始。', status: 'open' },
    { id: 'dh-josai', map: 'donghe', x: 10, y: 32, kind: 'ruin', grade: 'amile', type: 'maze', name: '城西遺跡', src: '館員', desc: '公會在入口設了調查點，調查點主任真壁每天派人把報告送回分館。最近遺跡裡的魔力濃度一直往上升，外圍第一層已經標出了十二處危險點。', status: 'open' },
    { id: 'dh-kouzan', map: 'donghe', x: 56, y: 5, kind: 'ruin', grade: 'amile', type: 'city', name: '北山礦坑・深層', src: '遊戲', desc: '德克斯凡礦務公司的北山礦坑，往下挖穿了一座遺跡。礦殼成群，整面牆都是礦脈。入口仍留著礦務公司的運輸軌道。', status: 'open' },
    { id: 'dh-yuyama', map: 'donghe', x: 13, y: 6, kind: 'village', name: '湯山村', src: '東鶴', desc: '矮丘山口另一邊的溫泉村。' },
    { id: 'dh-farm', map: 'donghe', x: 76, y: 18, kind: 'village', name: '北郊農舍', src: '東鶴', desc: '冬天常被冰鼬騷擾的農家。' }
  ];
  R.GRADE_COLOR = { hamilia: '#4E9A5A', amile: '#C98A2E', mors: '#7A4FC8', kesent: '#C8323A', kaso: '#1A1A1A' };

  // 寶箱開出的稀有度（依分級）
  R.LOOT_WEIGHTS = [[80, 20, 0, 0, 0], [45, 35, 17, 3, 0], [18, 35, 31, 14, 2], [5, 24, 36, 27, 8]];
  // 鐵匠鋪：製作
  R.RECIPES = [
    { tier: 0, name: '鐵製', ilvl: 2, mats: { iron: 4, shell: 1 }, gold: 40, weights: [60, 35, 5, 0, 0] },
    { tier: 1, name: '魔晶', ilvl: 4, mats: { manaore: 4, crystal: 3 }, gold: 120, weights: [0, 40, 45, 15, 0] },
    { tier: 2, name: '核心', ilvl: 6, mats: { manaore: 6, crystal: 4, core: 1 }, gold: 300, weights: [0, 0, 40, 50, 10] }
  ];
  R.idPrice = it => 12 + it.ilvl * 12;
  R.sellPrice = it => Math.round((6 + it.ilvl * 5) * (it.identified ? [1, 1.6, 2.6, 4.2, 7, 12][it.rarity] : 1.3));
  R.upgradePrice = it => ({ gold: 30 * (it.plus + 1), crystal: it.plus + 1 });
})(window.R);
