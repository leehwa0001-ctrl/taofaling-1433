// 餐廳（作者 2026-10-03：好像都沒有餐廳）
// - 商店街原本就有「拉麵・龍」「喫茶・星」的招牌，但走不進去；這裡讓它們走得進去，
//   再把重複的店面（第二家八百屋、魚屋、酒屋……）改成四家新的餐廳：洋食屋・鈴蘭、蕎麥・霜溪庵、壽司・海鶴、燒肉・炭火。
// - 每一家都有自己的店內（櫃台、桌椅、老闆、客人）和菜單；吃了之後當天下遺跡有加成（和定食屋、屋台同一套 R.S.buff，一天算最後吃的那一餐）。
// - 地圖上是「食」的圖示（gtamap.js）。
// 這個檔案要在 city.js、interiors2.js 後面、tidy.js 前面載入。
(function (R) {
  const PL = R.INTERIOR_PLACES, FN = R.INTERIOR_FURNISH = R.INTERIOR_FURNISH || {}, C = R.CITY; if (!PL || !C) return;
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)], K = () => R.INTERIOR_KIT, esc = s => R.esc(s);
  // 菜單：[名字, 費拉, 說明, 加成]（加成：hp、mp 是比例；dmg 傷害；skillCd 冷卻；regen 回復；aware 佩特拉的注意上升變慢）
  const SHOPS = {
    ramen: { name: '拉麵・龍', wall: '#E8D8B8', cap: '#8A2A1E', floor: '#4A3A2E', chef: '拉麵・龍的老闆', look: { top: '#F0ECE2', hair: '#1A1410', hs: 'crop' }, hint: '豚骨湯頭的味道飄到街上',
      menu: [['醬油拉麵', 9, '清澈的醬油湯，叉燒兩片', { hp: 0.06 }], ['味噌奶油拉麵', 12, '北州的吃法：味噌湯底加一塊奶油、玉米', { hp: 0.05, regen: 0.2 }], ['激辛地獄拉麵', 15, '紅得發黑的湯。吃完全身發燙', { dmg: 0.05 }]],
      say: ['「加麵免費！」', '「下遺跡前吃激辛的？好膽量。」', '「湯熬了十八個鐘頭。」'], guest: ['吃拉麵的上班族', ['「這家的醬油拉麵，從我學生時代就沒變過。」', '「週休三日的第一天，一定要來一碗。」']], style: 'counter' },
    kissa: { name: '喫茶・星', wall: '#C8B098', cap: '#4A3424', floor: '#3A2A20', chef: '喫茶・星的老闆', look: { top: '#2E2E38', hair: '#8A8A88', acc: 'glasses' }, hint: '虹吸壺咕嘟咕嘟地響',
      menu: [['特調咖啡', 6, '深焙的豆子，用虹吸壺煮', { skillCd: 0.04 }], ['拿坡里義大利麵', 11, '番茄醬炒的，鐵盤端上來還在滋滋響', { hp: 0.04, mp: 0.06 }], ['布丁', 7, '硬一點的老派布丁，焦糖很苦', { mp: 0.08 }]],
      say: ['「歡迎光臨。」', '「唱片是老闆自己挑的。」', '「靠窗的位子看得到商店街的拱廊。」'], guest: ['看報紙的老先生', ['「每天早上一杯咖啡、一份東鶴日報。」', '「這家店的牆上掛著東鶴三十年前的照片。」']], style: 'cafe' },
    western: { name: '洋食屋・鈴蘭', wall: '#F0E6D2', cap: '#5A4A2A', floor: '#6A4A30', chef: '鈴蘭的主廚', look: { top: '#F4F0E8', hair: '#4A3424' }, hint: '奶油和多蜜醬汁的香味',
      menu: [['蛋包飯', 12, '半熟的蛋皮切開，流下來蓋住番茄炒飯', { hp: 0.07 }], ['漢堡排', 16, '炭烤的漢堡排淋上多蜜醬汁', { dmg: 0.04, hp: 0.04 }], ['奶油燉菜', 10, '雪天限定，大塊的蔬菜和雞肉', { regen: 0.3 }]],
      say: ['「今天的推薦是漢堡排。」', '「醬汁是開店時傳下來的老滷。」'], guest: ['約會的兩個人', ['「我們第一次約會也是在這裡吃的。」', '「蛋包飯上的字是主廚寫的。」']], style: 'tables' },
    soba: { name: '蕎麥・霜溪庵', wall: '#D8CCB0', cap: '#3A4A2A', floor: '#5A4A34', chef: '霜溪庵的老闆', look: { top: '#3A4A3A', hair: '#2A2420', hs: 'bun' }, hint: '剛擀好的蕎麥麵',
      menu: [['笊蕎麥', 8, '冰涼的蕎麥麵沾醬吃，最後倒蕎麥湯', { mp: 0.06 }], ['天婦羅蕎麥', 13, '霜溪的河蝦天婦羅', { hp: 0.05, mp: 0.05 }], ['鴨南蠻', 15, '熱湯裡有鴨肉和烤蔥', { regen: 0.25, hp: 0.04 }]],
      say: ['「麵是早上用霜溪的水擀的。」', '「吃完記得喝蕎麥湯。」'], guest: ['吃蕎麥的老人家', ['「年越蕎麥一定要在這裡吃。」', '「這裡的老闆從小就在擀麵了。」']], style: 'tatami' },
    sushi: { name: '壽司・海鶴', wall: '#E8E2D4', cap: '#2E4A6A', floor: '#4A4034', chef: '海鶴的師傅', look: { top: '#F4F4F0', hair: '#1A1410', hs: 'crop' }, hint: '醋飯和海的味道',
      menu: [['霜背鮒手卷', 9, '東鶴近海的霜背鮒', { aware: 0.1 }], ['鮭魚親子丼', 14, '鮭魚和鮭魚卵滿到碗外面', { hp: 0.06, mp: 0.04 }], ['上握壽司', 24, '今天早上魚市場進的貨，十貫', { hp: 0.08, regen: 0.2 }]],
      say: ['「今天的魚是早上在魚市場挑的。」', '「山葵要嗎？」'], guest: ['吃壽司的漁夫', ['「我早上捕的魚，中午就在這裡吃到了。」', '「冬天的魚最肥。」']], style: 'counter' },
    yakiniku: { name: '燒肉・炭火', wall: '#5A4A40', cap: '#4A2A1A', floor: '#2E2622', chef: '炭火的老闆', look: { top: '#2A2A2E', hair: '#3A2A1C' }, hint: '炭火和烤肉的煙',
      menu: [['燒肉定食', 15, '醬汁醃過的五花，附白飯和湯', { dmg: 0.05 }], ['石鍋拌飯', 12, '鍋巴焦得剛好', { hp: 0.06 }], ['霜降拼盤', 30, '昭旭和牛的霜降，四人份', { dmg: 0.08, hp: 0.05 }]],
      say: ['「炭是北山的。」', '「下遺跡回來的勇者都點霜降。」'], guest: ['慶功的勇者小隊', ['「乾杯！今天三個人都活著回來了！」', '「下一趟去摩爾斯級。」']], style: 'grill' }
  };
  R.DINING = SHOPS;
  // ---------- 招牌：重複的店面改成新的餐廳 ----------
  { const seen = new Set(), next = ['western', 'soba', 'sushi', 'yakiniku'];
    (C.lots || []).forEach(l => {
      if (l.type !== 'shop' || !l.name) return;
      if (seen.has(l.name) && next.length) { const k = l.name === '魚屋' && next.includes('sushi') ? 'sushi' : next[0]; next.splice(next.indexOf(k), 1); const s = SHOPS[k]; l.name = s.name; l.kind = k; l.sc = s.cap; return; }
      seen.add(l.name);
    });
  }
  // ---------- 菜單 ----------
  const BN = { hp: '生命', mp: '魔力', dmg: '傷害', skillCd: '技能冷卻', regen: '回復', aware: '佩特拉的注意' };
  const buffTxt = b => Object.keys(b).map(k => BN[k] + (k === 'aware' ? '上升變慢' : k === 'skillCd' ? ' −' + Math.round(b[k] * 100) + '%' : k === 'regen' ? '慢慢回復' : ' +' + Math.round(b[k] * 100) + '%')).join('、');
  const menuSheet = k => {
    const s = SHOPS[k], S = R.S;
    R.sheet('<p class="kicker">' + esc(s.name) + '</p><h2>菜單</h2><p class="note">吃了之後，今天下遺跡有加成（一天算最後吃的那一餐）。' + (S.buff && S.buff.until === S.day ? '現在：已經吃過了。' : '') + '</p><div class="dn-menu">'
      + s.menu.map((m, i) => '<button type="button" class="dn-item" data-dn="' + i + '"' + (S.gold < m[1] ? ' disabled' : '') + '><b>' + esc(m[0]) + '</b><span>' + m[1] + ' 費拉</span><small>' + esc(m[2]) + '</small><i>下一趟遺跡：' + esc(buffTxt(m[3])) + '</i></button>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn" id="dn-x">不吃了</button></div>');
    document.getElementById('dn-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-dn]').forEach(b => { b.onclick = () => {
      const m = s.menu[+b.dataset.dn]; if (S.gold < m[1]) return; S.gold -= m[1]; S.buff = { kind: 'food', b: m[3], until: S.day }; R.save(); R.sfx && R.sfx('coin');
      R.closeSheet(); R.townTalk ? R.townTalk(s.chef, ['「' + m[0] + '，久等了！」', '（' + m[2] + '。）', '（今天下遺跡：' + buffTxt(m[3]) + '）']) : R.toast('吃了' + m[0]);
    }; });
  };
  // ---------- 店內 ----------
  const look = o => Object.assign({ top: pick(['#3A4A5A', '#5A3A3A', '#3A5A4A', '#6A5A3A', '#4A3A5A']), hair: pick(['#1A1410', '#2A2420', '#4A3424', '#8A8A88']), cloak: '#3A3A44' }, o || {});
  Object.keys(SHOPS).forEach(k => {
    const s = SHOPS[k];
    PL[k] = { name: s.name, sub: '店內', hint: s.hint, w: 16, d: 11, wall: s.wall, cap: s.cap, floor: [s.floor, 'floor'], zoom: 0.82, h: 3.6, out: '出去（回到街上）' };
    FN[k] = c => {
      const { HW, HD, bx, block, lamp, flame } = c, kit = K();
      // 櫃台（後面是廚房）、老闆、菜單
      bx(8, 1.0, 0.9, '#6A4A30', -1, 0.5, -HD + 2.4); bx(8.2, 0.1, 1.1, '#8A6A44', -1, 1.05, -HD + 2.4); block(-5, 3, -HD + 1.9, -HD + 2.9, 'counter');
      bx(4, 0.9, 0.7, '#3A3230', -2, 0.45, -HD + 0.6); flame(-3, 1.0, -HD + 0.8, 0.5); flame(-1, 1.0, -HD + 0.8, 0.45);
      for (let i = 0; i < 5; i++) c.bx(0.7, 0.9, 0.04, '#F0E8D0', -HW + 1.2 + i * 0.9, 2.4, -HD + 0.33, c.NW && c.NW.g);   // 牆上的菜單木牌
      c.npc(-1, -HD + 1.4, 0, { name: s.chef, look: s.look });
      c.inter(-1, -HD + 3.6, 2.2, '點菜（' + s.name + '的菜單）', () => menuSheet(k));
      c.inter(1.6, -HD + 3.6, 1.6, '和' + s.chef + '說話', () => kit.talk(s.chef, [pick(s.say)]));
      if (s.style === 'counter' || s.style === 'cafe') for (let i = 0; i < 6; i++) kit.stoolAt(c, -4.5 + i * 1.4, -HD + 3.4);
      const spots = s.style === 'tatami' ? [[-4, 2.4], [0, 2.4], [4, 2.4]] : [[-4.5, 1.6], [0, 1.6], [4.5, 1.6], [4.5, -1.2]];
      spots.forEach(([x, z]) => { kit.tableAt(c, x, z, s.style === 'tatami' ? 1.8 : 1.4, 1.0); if (s.style === 'grill') { bx(0.5, 0.12, 0.5, '#2A2A2A', x, 0.95, z); flame(x, 1.05, z, 0.35); } kit.stoolAt(c, x - 1.0, z); kit.stoolAt(c, x + 1.0, z); });
      if (s.style === 'tatami') bx(14, 0.18, 4.2, '#C8B878', 0, 0.09, 2.4);
      if (s.style === 'cafe') { kit.plantAt(c, HW - 0.8, -HD + 0.8); kit.plantAt(c, -HW + 0.8, HD - 1.2); bx(1.0, 1.0, 0.6, '#3A2A1C', HW - 1.2, 0.5, 0.5); bx(0.7, 0.08, 0.7, '#1A1A1A', HW - 1.2, 1.05, 0.5); }   // 唱片機
      // 客人
      const g = c.npc(0, 2.4, Math.PI, { name: s.guest[0], look: look() }); c.inter(0, 3.3, 1.6, '和' + s.guest[0] + '說話', () => kit.talk(s.guest[0], [pick(s.guest[1])]));
      if (rnd() < 0.7) c.npc(-4.5, 1.6 + 0.9, Math.PI, { name: '客人', look: look() });
      lamp(-2, 3.0, -1, s.style === 'grill' ? '#FFB070' : '#FFE0B0', 0.9, 12); lamp(3, 3.0, 2, '#FFE0B0', 0.6, 10);
      return g;
    };
  });
  // ---------- 街上：門口 ----------
  const ROT = [0, Math.PI, -Math.PI / 2, Math.PI / 2];
  const door = l => { const x = C.WX((l.r[0] + l.r[2]) / 2), z = C.WZ((l.r[1] + l.r[3]) / 2), ax = (l.r[2] - l.r[0]) * C.S, az = (l.r[3] - l.r[1]) * C.S, f = l.f || 0, d = f < 2 ? az : ax, ry = ROT[f]; return [x + Math.sin(ry) * (d / 2 + 1.6), z + Math.cos(ry) * (d / 2 + 1.6)]; };
  const en0 = R.enterTownNow;
  R.enterTownNow = (from, at) => {
    en0(from, at);
    const tw = R.W.town; if (!tw) return;
    (C.lots || []).forEach(l => {
      if (l.type !== 'shop' || !SHOPS[l.kind]) return;
      if (tw.inter.some(it => it.dnKind === l.kind && Math.abs(it.lotX - l.r[0]) < 0.1)) return;
      const [x, z] = door(l), k = l.kind;
      tw.inter.push({ x, z, r: 2.0, label: '走進' + SHOPS[k].name, act: () => R.enterInterior(k), door: 1, entered: 1, dnKind: k, lotX: l.r[0] });
    });
  };
  const css = document.createElement('style');
  css.textContent = '.dn-menu{display:grid;gap:6px;margin:8px 0}.dn-item{display:grid;grid-template-columns:1fr auto;gap:2px 10px;text-align:left;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:inherit;font:inherit;cursor:pointer}'
    + '.dn-item b{font-size:1.05em}.dn-item span{color:var(--gold,#C9A13A)}.dn-item small,.dn-item i{grid-column:1/-1;opacity:.85;font-style:normal;font-size:.9em}.dn-item i{color:#9AE08A}.dn-item:hover:not([disabled]){border-color:var(--gold,#C9A13A)}.dn-item[disabled]{opacity:.5;cursor:default}';
  document.head.appendChild(css);
})(window.R);
