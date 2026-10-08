// 吉山（陪都）的 3D 城（作者《昭旭重要城市》：奉主淪陷後的人口第一大都、第一大工業城；德克斯凡入股後第一個開發的城市——
//   賽博霓虹底下仍是和式町屋。設施：公會吉山分館（夾在兩棟玻璃大樓中間）、世界央行吉山分館、重工廠展望廊、朝日科技展示廳、
//   礦場吊橋（晚上亮藍燈）、地下賭場（後巷的鐵門）、魔導懸浮車行。觀光：霓虹十字路口、高爐夜景、股票交易所大廳。）
// 2026-10-08：大小約三分之二個東鶴（跟皇嶺一樣）；零件在 citykit6.js（和風高樓）、citykit7.js（霓虹、螢幕、摩天樓、高爐、吊橋、懸浮車）。
// 地圖（北是 -z）：
//   中央：霓虹十字路口（吉山大通 × 朝日通，斜的斑馬線），四個角是大螢幕
//   西北：商務區（公會吉山分館夾在兩棟玻璃大樓中間、朝日科技展示廳、懸浮車行）
//   東北：金融區（股票交易所、世界央行吉山分館、德克斯凡大樓）
//   西南：機械町（町家的巷子、霓虹招牌、機械町拉麵、後巷的鐵門＝地下賭場）
//   東南：霓虹商店街（膠囊旅館、遊樂中心、霓虹橫丁的小攤）
//   東：重工業區（兩座高爐、煙囪、倉庫、展望廊）；最東邊是峽谷，吊橋過去是礦場
//   北：吉山神社（山腳的台地）、山上的「吉山」霓虹大字；西：吉川（運河）和住宅；南：吉山站、高架電車
(function (R) {
  const CK = R.CK, W = R.W, S = () => R.S; if (!CK) return;
  const az = () => R.azuki;

  CK.define({
    id: 'jishan', name: '吉山', seed: 2207, stationName: '吉山站', fog: 1.5,
    land: [[-1000, -980], [1000, -980], [1000, 980], [-1000, 980]],
    walk: [-180, -165, 200, 165], spawn: [0, 116, 0], camYaw: 0,
    banner: '陪都・賽博霓虹與町屋',
    firstTip: '第一次來吉山：Tab 看地圖。霓虹十字路口、高爐夜景（東邊的展望廊）、股票交易所都有觀光章；公會吉山分館在朝日通北邊，兩棟玻璃大樓中間；回東鶴到南邊的吉山站。',
    mapNote: '北邊是吉山神社，南邊是吉山站，東邊是工業區和礦場。',
    ads: ['德克斯凡', '朝日科技', '機械町拉麵', '能量罐', '吉山證券', '魔導懸浮車', '昭旭鐵道'],
    vendLines: ['德克斯凡的能量罐，藍色的那種。', '熱的機械町咖啡，有一點鐵的味道。', '罐裝的焙茶。吉山的自動販賣機會跟你說謝謝。'],
    carCols: ['#1A1A20', '#E8E4DC', '#C83A3A', '#2E4A8A', '#3A3A44', '#E8B830', '#5A5A62'],
    build(B) {
      const M = CK.M, g = B.g, P = B.part, BOX = B.box, rr = B.rr, pk = B.pk, rnd = B.rnd;
      // ---------- 道路 ----------
      B.road(-136, -100, 120, -92, { sw: 4, name: '北通' });
      B.road(-8, -100, 8, 96, { sw: 5, name: '吉山大通', line: 'y' });
      B.road(-136, -8, 120, 8, { sw: 5, name: '朝日通' });
      B.road(-136, 96, 120, 104, { sw: 4, name: '站前通' });
      B.road(-100, -100, -92, 104, { sw: 3.5, name: '西通' });
      B.road(92, -100, 100, 104, { sw: 3.5, name: '東通' });
      // 十字路口的斜斑馬線（兩條對角線）
      [1, -1].forEach(sd => { for (let t = -9.5; t <= 9.5; t += 1.15) { const x = t * 0.7071, z = sd * x; P(g.box, M('lineW'), x, 0.02, z, 0.55, 0.02, 3.2, 0, sd * Math.PI / 4 + Math.PI / 2, 0); } });
      B.area('霓虹十字路口', [-13, -13, 13, 13]);
      // ---------- 吉川（運河，西邊） ----------
      B.water([[-150, -260], [-138, -260], [-138, 260], [-150, 260]], { level: -1.6, bank: 'ishi', name: '吉川' });
      B.plaza(-136, -165, -134, 165, 'gran', { noCurb: true }); B.plaza(-154, -165, -152, 165, 'gran', { noCurb: true });
      [-50, 50].forEach(z => B.bridge(-152, z - 2.5, -136, z + 2.5, { rise: 1.1, deck: 0.12, mat: 'woodD', railMat: 'verm', rail: true }));
      // ---------- 北：吉山神社（台地）、住宅 ----------
      B.row('s', -104, -134, -10, 12, { style: 'wafu', h: 14 }, 9, 13, () => (rnd() < 0.3 ? { style: 'mega', h: 2.9 * Math.round(rr(5, 9)), board: false } : { h: rr(10, 22) }));
      B.row('s', -104, 10, 88, 12, { style: 'wafu', h: 14 }, 9, 13, () => (rnd() < 0.35 ? { style: 'mega', h: 2.9 * Math.round(rr(6, 10)) } : { h: rr(12, 26) }));
      B.plaza(-6, -122, 6, -104, 'gran');
      B.terrace(-34, -163, 34, -128, 5, { wall: 'ishi', top: 'gravel', open: [[-4, -128.4, 4, -127.6]] });
      B.ishigaki(-34, -163, 34, -128, 0, 5, { batter: 0.2, sides: 'nwe' });
      B.stairs(-4, -128, 4, -122, 'n', 0.12, 5, { mat: 'gran' });
      B.torii(0, -119, 0, 5, 4.6, 'verm');
      shrine(B);
      B.area('吉山神社', [-36, -165, 36, -104]); B.label('吉山神社', 0, -146);
      // ---------- 西北：商務區 ----------
      B.cylTower({ r: [-76, -44, -54, -13], h: 70, neon: '#4AE8FF', tint: '#2E3A48', spire: 18 });
      guild(B, [-51, -40, -35, -13]);
      B.pagodaTower({ r: [-32, -44, -13, -13], h: 72, face: 's', neon: '#FF4A9A', col: '#A8B8C8' });   // 賽博和式：玻璃塔頂上的和風塔頂
      asahi(B, [-44, -86, -13, -52]);
      rental(B, [-88.5, -86, -48, -47]);
      B.row('w', -88.5, -44, -13, 10, { style: 'mega', h: 30 }, 10, 16, () => ({ h: 2.9 * Math.round(rr(8, 12)), board: false }));
      B.area('商務區', [-90, -90, -12, -12]); B.label('公會吉山分館', -43, -27); B.label('朝日科技', -28, -69);
      // ---------- 東北：金融區 ----------
      stock(B, [18, -52, 62, -13]);
      bank(B, [13, -88, 40, -56]);
      B.tower({ r: [60, -88, 88.5, -56], h: 128, face: 's', neon: '#4AE8FF', crown: '德克斯凡', segs: 4, col: '#7A98B0' });
      B.twistTower({ r: [64, -52, 88.5, -13], h: 58, segs: 6, neon: '#C86AFF', twist: 0.32 });
      B.slantTower({ r: [42, -88, 58, -56], h: 40, tint: '#B89A70', neon: '#FFE24A' });
      B.area('金融區', [12, -90, 90, -12]); B.label('股票交易所', 40, -32); B.label('德克斯凡大樓', 74, -72);
      // ---------- 西南：機械町 ----------
      machi(B);
      B.area('機械町', [-90, 12, -12, 93]); B.label('機械町', -50, 52);
      // ---------- 東南：霓虹商店街 ----------
      neonStreet(B);
      B.area('霓虹商店街', [12, 12, 90, 93]); B.label('霓虹橫丁', 52, 52);
      // ---------- 西：吉川兩岸的住宅 ----------
      [[-88, -13], [13, 92]].forEach(([a, b]) => { B.row('e', -103.5, a, b, 14, { style: 'wafu', h: 18 }, 10, 15, () => ({ h: rr(12, 30) })); B.row('w', -134, a, b, 12, { style: 'apt', h: 17.4 }, 12, 16, () => (rnd() < 0.4 ? { style: 'mega', h: 2.9 * Math.round(rr(7, 11)), board: false } : { h: 2.9 * Math.round(rr(4, 8)) })); });
      B.row('e', -154, -160, 160, 12, { style: 'machiya', h: 6.4 }, 6, 8, () => ({}));
      B.area('吉川', [-156, -165, -132, 165]); B.label('吉川', -144, 0);
      // ---------- 東：重工業區、峽谷、礦場 ----------
      industry(B);
      B.area('重工業區', [103, -165, 176, 165]); B.label('高爐', 140, -42); B.label('礦場吊橋', 187, -37);
      // ---------- 南：吉山站、高架電車 ----------
      station(B, [-50, 126, 50, 150]);
      B.plaza(-55, 108, 55, 126, 'gran');
      B.plaza(-122, 108, -62, 150, 'asph');   // 巴士總站
      [-110, -96, -82].forEach(x => B.busStop(x, 112, 0, pk(['往礦場', '往工業區', '往吉山神社'])));
      B.inter(-96, 114, 2.4, '巴士總站的時刻表', () => R.townTalk('吉山巴士總站', ['往礦場：每十五分鐘一班（工人專車優先）', '往工業區：二十四小時', '往吉山神社：白天每小時一班', '「夜班車上睡著的人，司機會叫醒你。」']), '#5A8AC8');
      B.twinTower({ r: [62, 112, 88, 150], h: 66, face: 'n', neon: '#FFE24A', crown: '吉山酒店', col: '#B89A70', gap: 9 });
      B.row('n', 108, -134, -124, 14, { style: 'wafu', h: 16 }, 9, 10, () => ({}));
      B.viaduct([[-700, 158], [700, 158]], 10, { neon: '#4AE8FF', skip: (x, z) => Math.abs(x) < 52 });
      B.rail([[-700, 158], [700, 158]], { y: 10, col: '#1A1A22', stripe: '#4AE8FF', cars: 6, v: 18 });
      B.area('吉山站', [-56, 106, 56, 152]); B.area('巴士總站', [-124, 106, -60, 152]);
      B.label('吉山站', 0, 138, 1);
      // ---------- 十字路口：大螢幕、全像廣告、無人機、懸浮車 ----------
      B.screen(-12.85, 22, -28, Math.PI / 2, 14, 8, { ads: [['德克斯凡', '#1A2A6A', '#4AE8FF', '讓明天提早到來'], ['能量罐', '#0A4A6A', '#8AFFE8', '一罐撐到下班'], ['機械町拉麵', '#6A1A0A', '#FFD84A', '工廠下班就來']] });
      B.screen(-22, 30, -12.85, 0, 16, 9, { ads: [['朝日科技', '#3A1A5A', '#FF8AE8', '外骨骼・試穿預約中'], ['吉山證券', '#0A2A1A', '#7AFF8A', '開盤鈴響了嗎'], ['魔導懸浮車', '#1A1A1A', '#FFE24A', '特別駕照考試報名']] });
      B.screen(12.85, 17, 23.5, -Math.PI / 2, 9, 16, { ads: [['德克斯凡', '#1A0A3A', '#C86AFF'], ['昭旭鐵道', '#0A1A3A', '#4AE8FF']] });
      B.holo(26, 34, 24, -Math.PI / 4, 10, 10, '吉', '#FF4A9A');
      B.holo(-24, 48, -24, Math.PI / 4, 8, 8, '山', '#4AE8FF');
      B.drone(0, 0, 18, 26); B.drone(30, -40, 22, 38); B.drone(-40, 40, 16, 22);
      B.hover([[-4, 90], [-4, -90], [-90, -90], [-90, 90]], { n: 4, y: 15, glow: '#4AE8FF' });
      B.hover([[4, -90], [4, 90], [90, 90], [90, -90]], { n: 4, y: 19, glow: '#FF4A9A' });
      B.inter(11, 11, 2.6, '觀光景點：霓虹十字路口（觀光章）', () => az().stamp('jishan', 'js_neon'), '#E8C04A').sight = 'js_neon';
      // ---------- 街上的東西 ----------
      for (let z = -84; z <= 84; z += 14) { if (Math.abs(z) < 16) continue; B.lamp(-8.6, z, Math.PI / 2); B.lamp(8.6, z + 7, -Math.PI / 2); }
      for (let x = -124; x <= 112; x += 16) { if (Math.abs(x) < 16 || Math.abs(x - 96) < 8 || Math.abs(x + 96) < 8) continue; B.lamp(x, -8.6, 0); B.lamp(x + 8, 8.6, Math.PI); }
      [[-12.4, -50, Math.PI / 2], [12.4, 40, -Math.PI / 2], [-12.4, 70, Math.PI / 2], [30, 12.4, Math.PI], [-40, -12.4, 0], [-20, 107.4, Math.PI], [24, 107.4, Math.PI]].forEach(([x, z, ry]) => B.vend(x, z, ry, pk(['#2E5A9A', '#1A1A20', '#E8E4DC'])));
      B.inter(-12.4 + 1.3, -50, 1.8, '自動販賣機（能量罐、拉麵券）', () => az().food('jishan'), '#4AE8FF');
      B.mailbox(-12.4, 30); B.mailbox(12.6, -36);
      B.poles([[-89, 20], [-89, 48], [-89, 76]], { ry: Math.PI / 2 });
      // ---------- 路人、車 ----------
      [[-10.5, -88, -10.5, 92], [10.5, -88, 10.5, 92], [-132, -10.5, 116, -10.5], [-132, 10.5, 116, 10.5], [-132, -90, 116, -90], [-132, 94, 116, 94], [-132, 106, 116, 106], [-90.2, -88, -90.2, 92], [90.2, -88, 90.2, 92], [-40, 116, 40, 116], [-135, -150, -135, 150]].forEach(([a, b, c, d]) => B.walk([[a, b], [c, d]], Math.max(2, Math.round(Math.hypot(c - a, d - b) / 22))));
      B.walk([[-86, 39], [-15, 39]], 4); B.walk([[-15, 67], [-79.5, 67]], 3);
      B.route([[-4, 98], [-4, -94], [-94, -94], [-94, 98]], 4);
      B.route([[4, -94], [4, 98], [94, 98], [94, -94]], 4);
      B.route([[-94, -4], [94, -4], [94, -94], [-94, -94]], 2, { kinds: ['truck'] });
      // ---------- 說話的人 ----------
      B.talker(-3, 120, Math.PI, '剛下車的旅客', ['「吉山的空氣有鐵的味道。聞久了會習慣。」', '「十字路口的螢幕比我家還大。」', '「我是來看高爐夜景的。聽說晚上整片天是橘色的。」']);
      B.talker(18, 118, Math.PI, '懸浮車的司機', ['「懸浮車要特別駕照。我考了三次。」', '「大通上面那一層是懸浮車道，地上是魔導車。」', '「去礦場？走東通，過了高爐就是峽谷。」']);
      B.talker(-12.3, -14.6, Math.PI / 4, '十字路口的警衛', ['「綠燈的時候四個方向一起走，斜的也可以。」', '「德克斯凡的廣告機器人會跟你鞠躬。不用回禮。」', '「晚上這裡比白天還亮。」']);
      B.talker(-36.5, -11.4, Math.PI, '公會分館的館員', ['「吉山分館的委託，一半是工廠區的。」', '「礦場最近挖到一條奇怪的礦脈，說是有魔力的反應。」', '「兩邊的玻璃大樓？一邊是德克斯凡的，一邊是朝日科技的。我們夾在中間。」']);
      B.talker(-11.2, -60, Math.PI / 2, '朝日科技的接待員', ['「外骨骼試穿要預約。今天排到晚上了。」', '「魔導具櫃檯的隊伍排到門外，請見諒。」', '「朝日科技的總部在吉山，板北有一間實驗所。」']);
      B.talker(11.2, -70, -Math.PI / 2, '銀行前的職員', ['「股票開盤的時候，交易所那邊會傳來鈴聲。」', '「德克斯凡的票子在這裡最好換。」']);
      B.talker(-60, 37.5, Math.PI, '機械町的老師傅', ['「這條巷子的町屋，比工廠還老。」', '「霓虹是德克斯凡來了以後才掛上去的。屋簷還是我們的屋簷。」', '「齒輪壞了拿來，我修得比工廠快。」']);
      B.talker(-81.6, 68.8, -Math.PI / 2, '後巷的門衛', ['「……會員制。」', '「勇者證？看一下。今天的籌碼換現金。」', '「你什麼都沒看到。」']);
      B.talker(56, 52, 0, '小攤的老闆', ['「烤機械町雞串，十費拉三串。」', '「這條橫丁晚上才熱鬧。白天大家都在工廠。」']);
      B.talker(101.8, -12, Math.PI / 2, '下班的工人', ['「高爐一天二十四小時都在燒。」', '「整片天空被燒成橘色。這才是吉山的月亮。」', '「下班先去機械町吃一碗拉麵，再回家。」']);
      B.talker(172, -37, -Math.PI / 2, '礦場的守衛', ['「吊橋晚上會亮藍燈。工人說是給山上的人看的。」', '「礦坑裡面不開放。勇者證也不行。」', '「原材料從這裡送進市區。」']);
      B.talker(4, -116, Math.PI, '神社的神職', ['「吉山這個名字，是從這座山來的。山上的字是德克斯凡捐的霓虹。」', '「抽個籤吧？工人都來求平安。」']);
      // ---------- 遠景 ----------
      [[-1000, -980, 1000, -360], [-1000, 360, 1000, 980], [-1000, -360, -360, 360], [360, -360, 1000, 360]].forEach(r => B.zone(r, 'grass', 0.01));
      CK.mountains(B, { r0: 520, r1: 2600, h: 460, seed: 23, low: [[Math.PI * 0.35, Math.PI * 0.65, 0.2]], snow: 300 });
      bigSign(B);
      B.forest([-640, -520, -200, -230], 320, { skip: (x, z) => Math.hypot(x, z) > 520 });
      B.forest([330, -520, 640, 520], 380, { skip: (x, z) => Math.hypot(x, z) > 520 });
    },
    tick() { }
  });

  // ================= 地標 =================
  // ---- 吉山神社：台地上的拜殿、鳥居、燈籠、繪馬 ----
  function shrine(B) {
    const M = CK.M, g = B.g, P = B.part, h = 5;
    B.Bt.yOff = h;
    B.roof(0, -146, 16, 10, { type: 'hip', y: 5, h: 3, o: 1.4, sori: 0.4, mat: 'copper' });
    B.box(M('woodB'), -7.4, 0, -150.4, 7.4, 5, -141.6); B.box(M('shopLit'), -5, 0.6, -141.62, 5, 4, -141.55);
    [-5, 5].forEach(x => { B.lantern(x, -136, 1); });
    B.torii(0, -133, 0, 4.4, 4.2, 'verm');
    P(g.box, M('woodD'), 6, 1.2, -138, 3, 1.2, 0.2);
    B.Bt.yOff = 0;
    B.solid(-7.8, -151, 7.8, -141, 'house');
    B.inter(0, -139, 2.4, '吉山神社（參拜、抽籤 1 費拉）', () => { const s = S(); if (s.gold < 1) { R.toast('錢不夠。'); return; } s.gold -= 1; R.save(); const L = [['大吉', '「爐火不熄，平安下班。」'], ['吉', '「齒輪咬得剛好。」'], ['中吉', '「慢慢來，礦脈跑不掉。」'], ['小吉', '「先吃碗拉麵再說。」'], ['末吉', '「現在不順，之後會好。」'], ['凶', '「把籤綁在架子上，壞運氣就留在山上。」']], o = L[Math.floor(Math.random() * L.length)]; R.townTalk('吉山神社・籤', ['抽到了「' + o[0] + '」。', o[1]]); }, '#E8C04A');
    for (let i = 0; i < 10; i++) { const x = (i % 2 ? 1 : -1) * B.rr(12, 30), z = B.rr(-160, -132); B.tree(x, z, 'cedar', B.rr(1.1, 1.5)); }   // 樹照台地的高度放（heightAt），不用再抬
  }
  // ---- 山上的「吉山」霓虹大字（鋼架） ----
  function bigSign(B) {
    const M = CK.M, x = -40, z = -330, y = 70;
    const m = CK.signMat('吉山', { bg: '#0A0A12', fg: '#FF4A6A', neon: 1 }), w = 90, h = w / m.userData.aspect;
    for (let i = -3; i <= 3; i++) B.part(B.g.box, M('steelD'), x + i * 13, y / 2, z + 1.5, 0.8, y + h / 2, 0.8);
    B.part(B.g.box, M('steelD'), x, y - h / 2 - 1, z + 1.2, w + 4, 0.8, 0.8);
    B.part(B.g.plane, m, x, y, z, w, h, 1, 0, 0, 0, { uv: 'keep' });
  }
  // ---- 公會吉山分館：夾在兩棟玻璃大樓中間的石造三層（正面朝南） ----
  function guild(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, cx = (x0 + x1) / 2;
    B.bld({ r, h: 14, style: 'brick', face: 's', col: '#D8D0C0', top: false });
    B.box(M('ashlar'), cx - 4.2, 0, z1, cx + 4.2, 0.4, z1 + 1.6);
    [cx - 3.4, cx + 3.4].forEach(x => P(g.cyl, M('ashlar'), x, 2.4, z1 + 1.2, 0.7, 4.4, 0.7));
    B.box(M('ashlar'), cx - 4.4, 4.6, z1, cx + 4.4, 5.2, z1 + 1.8);
    B.flag(x0 + 1.2, z1 + 1.0, 12, '#2E6A3E');
    B.sign('公會吉山分館', 's', z1 + 1.8, cx, 5.9, { size: 0.62, bg: '#2E5A3A', fg: '#F4ECD8', box: 1, lit: 1 });
    B.solid(cx - 4.4, z1, cx - 2.9, z1 + 1.8, 'deco'); B.solid(cx + 2.9, z1, cx + 4.4, z1 + 1.8, 'deco');
    CK.door(B, cx, z1 + 2.3, 'js_guild', '走進公會吉山分館（地方委託）', '#3E9A5A', 0);
  }
  // ---- 朝日科技展示廳：白色的未來感大樓、整片玻璃、櫥窗裡的外骨骼（正面朝東） ----
  function asahi(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, cz = (z0 + z1) / 2;
    B.bld({ r: [x0, z0, x1 - 4, z1], h: 22, style: 'glass', face: 'e', col: '#E8ECF0', top: false });
    B.box(M('white'), x1 - 4, 9, z0, x1, 10.2, z1);   // 大的雨遮
    B.box(M('glassL'), x1 - 3.9, 0.3, z0 + 1, x1 - 3.8, 9, z1 - 1);
    B.box(M('marble'), x1 - 4, 0, z0, x1, 0.3, z1);
    B.neon(x1 - 0.1, 10.2, z0, x1, 10.4, z1, '#FF8AE8');
    // 櫥窗裡的外骨骼
    const ex = x1 - 2, ez = cz + 6, steel = M('steel'), gl = CK.neonMat('#4AE8FF', 2);
    [[0, 2.4, 0, 1.4, 1.6, 0.9], [0, 3.5, 0, 0.7, 0.6, 0.7], [-0.9, 2.4, 0, 0.35, 1.5, 0.35], [0.9, 2.4, 0, 0.35, 1.5, 0.35], [-0.4, 0.9, 0, 0.45, 1.6, 0.45], [0.4, 0.9, 0, 0.45, 1.6, 0.45]].forEach(([a, b, c, sx, sy, sz]) => P(g.box, steel, ex + c, b, ez + a, sz, sy, sx));
    P(g.box, gl, ex + 0.36, 3.55, ez, 0.05, 0.12, 0.5);
    P(g.cyl24, M('marble'), ex, 0.15, ez, 3, 0.3, 3);
    B.sign('朝日科技', 'e', x1 - 4 + 0.06, cz, 15, { size: 2.4, bg: '#F4F4F8', fg: '#C8202A', box: 1, lit: 1 });
    B.solid(ex - 1.5, ez - 1.5, ex + 1.5, ez + 1.5, 'deco');
    CK.door(B, x1 + 1.4, cz - 4, 'js_asahi', '走進朝日科技展示廳（外骨骼、魔導具）', '#FF8AE8', Math.PI / 2);
  }
  // ---- 懸浮車行：小的辦公室、停著的懸浮車 ----
  function rental(B, r) {
    const M = CK.M, [x0, z0, x1, z1] = r;
    B.plaza(x0 + 0.5, z0, x1 - 2, z0 + 24, 'pav', { noCurb: true });
    B.bld({ r: [x0 + 0.5, z0 + 26, x0 + 20, z1], h: 7.2, style: 'glass', face: 'e', col: '#C8D4DC', name: '魔導懸浮車行', top: false });
    [['#C83A3A', 0], ['#E8E4DC', 1], ['#2E4A8A', 2], ['#E8B830', 3]].forEach(([c, i]) => B.hoverParked(x0 + 8 + i * 7.5, z0 + 12, 0, c));
    B.neon(x0 + 0.5, 0.02, z0 + 4, x1 - 2, 0.06, z0 + 4.15, '#4AE8FF'); B.neon(x0 + 0.5, 0.02, z0 + 20, x1 - 2, 0.06, z0 + 20.15, '#4AE8FF');
    B.inter(x0 + 21.5, z0 + 31, 2.4, '魔導懸浮車行（租車）', () => az().fac('jishan', 'rent'), '#4AE8FF');
    void M;
  }
  // ---- 股票交易所：古典的石造大廳、柱子、整面的跑馬燈（正面朝南，對著朝日通） ----
  function stock(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, cx = (x0 + x1) / 2;
    B.bld({ r: [x0, z0, x1, z1 - 4], h: 24, style: 'brick', face: 's', col: '#E8E4DC', top: false });
    B.box(M('ashlar'), x0 + 2, 0, z1 - 4, x1 - 2, 0.3, z1);
    for (let i = 0; i < 8; i++) { const x = x0 + 4 + i * (x1 - x0 - 8) / 7; P(g.cyl24, M('white'), x, 0.3 + 6.35, z1 - 2, 1.3, 12.7, 1.3); }
    B.box(M('white'), x0 + 2, 13, z1 - 4, x1 - 2, 14.4, z1);
    B.screen(cx, 17.4, z1 - 3.9, 0, x1 - x0 - 6, 3.2, { ticker: [['德克斯凡', 2.31], ['朝日科技', 1.12], ['吉山重工', -0.84], ['昭旭鐵道', 0.22], ['東鶴冒險用品', 3.05], ['天宮海運', -1.47], ['白藤堂製藥', 0.65], ['吉山礦業', 4.12], ['奉主重建債', -2.2]], speed: 0.03 });
    B.screen(cx, 21.2, z1 - 3.9, 0, 18, 3.4, { ads: [['吉山證券交易所', '#0A1A0A', '#7AFF8A'], ['開盤 09:00', '#0A1A2A', '#FFE24A']], every: 5 });
    B.solid(x0 + 2, z1 - 4, x1 - 2, z1 - 1.4, 'house');
    CK.door(B, cx, z1 + 0.8, 'js_stock', '走進股票交易所大廳', '#7AFF8A', 0);
  }
  // ---- 世界央行吉山分館（正面朝西，對著大通） ----
  function bank(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, cz = (z0 + z1) / 2;
    B.bld({ r: [x0 + 3, z0, x1, z1], h: 18, style: 'brick', face: 'w', col: '#E8E0D4', top: false });
    B.box(M('ashlar'), x0, 0, z0 + 3, x0 + 3, 0.8, z1 - 3);
    for (let i = 0; i < 4; i++) P(g.cyl24, M('white'), x0 + 1.5, 0.8 + 4.5, z0 + 6 + i * (z1 - z0 - 12) / 3, 1.0, 9, 1.0);
    B.box(M('white'), x0, 9.8, z0 + 3, x0 + 3, 10.8, z1 - 3);
    B.sign('世界中央銀行・吉山分館', 'w', x0, cz, 11.6, { size: 0.55, bg: '#F2F0EA', fg: '#3A2E20' });
    B.solid(x0, z0 + 3, x0 + 3, z1 - 3, 'house');
    CK.door(B, x0 - 1.2, cz, 'js_bank', '走進世界央行吉山分館（存款、股票）', '#C8A040', -Math.PI / 2);
  }
  // ---- 機械町：兩條巷子、町家、霓虹招牌、拉麵、後巷的鐵門 ----
  function machi(B) {
    const M = CK.M, g = B.g, P = B.part, pk = B.pk, rnd = B.rnd;
    B.plaza(-88.5, 36, -13, 42, 'gran'); B.plaza(-84, 64, -13, 70, 'gran');
    B.bld({ r: [-88.5, 64, -84, 70], h: 7, style: 'house', face: 'e', top: false, roof: 'flat' });   // 巷子 B 的西邊封起來（後巷）
    const NM = ['機械町拉麵', '齒輪修理', '中古魔導具', '居酒屋・鐵', '烤雞串・爐', '當舖', '電器・閃', '咖哩・機', '理髮', '湯屋・蒸氣', '工具・匠', '小鋼珠'];
    let k = 0;
    const shop = side => (i, r) => { if (rnd() < 0.55) { const nm = NM[k++ % NM.length]; return { name: nm, vsign: nm.split('・')[0], neon: 1 }; } return {}; };
    const r0 = B.row('n', 13, -88.5, -13, 10, { style: 'machiya', h: 6.4 }, 6, 8, shop('n'));
    const rA = B.row('s', 36, -88.5, -13, 12, { style: 'machiya', h: 6.4 }, 6, 8, shop('s'));
    const rB = B.row('n', 42, -88.5, -13, 10, { style: 'machiya', h: 6.4 }, 6, 8, shop('n'));
    const rC = B.row('s', 64, -88.5, -13, 11, { style: 'machiya', h: 6.4 }, 6, 8, shop('s'));
    const rD = B.row('n', 70, -88.5, -13, 10, { style: 'machiya', h: 6.4 }, 6, 8, shop('n'));
    // 賽博霓虹底下的町屋：每一間屋簷下一條霓虹、一半掛霓虹招牌
    const NC = ['#FF4A9A', '#4AE8FF', '#FFE24A', '#8AFF6A', '#C86AFF', '#FF6A3A'], NW = ['拉麵', '修理', '酒', '湯', '雞串', '當', '電器', '遊', '藥', '鐵', '機', '咖哩', '理髮', '茶'];
    const glow = (lots, f) => lots.forEach(L => { const [x0, z0, x1, z1] = L.r, c = f === 's' ? z1 : z0, sg = f === 's' ? 1 : -1; if (rnd() < 0.8) B.neon(x0 + 0.4, 3.32, Math.min(c + sg * 0.5, c + sg * 0.62), x1 - 0.4, 3.42, Math.max(c + sg * 0.5, c + sg * 0.62), pk(NC)); if (rnd() < 0.55) B.neonSign(pk(NW), x0 + 0.7, 5.0, c + sg * 0.75, Math.PI / 2, { size: 0.72 }); });
    glow(r0, 'n'); glow(rA, 's'); glow(rB, 'n'); glow(rC, 's'); glow(rD, 'n');
    B.row('s', 92, -88.5, -13, 11, { style: 'wafu', h: 14 }, 8, 12, () => ({ h: rr2(10, 20) }));
    // 機械町拉麵（巷子 A 北邊那一排的第二間）
    { const r = rA[1].r, cx = (r[0] + r[2]) / 2; CK.door(B, cx, 37.2, 'js_ramen', '走進機械町拉麵', '#FFD84A', 0); B.neonSign('拉麵', r[2] - 0.6, 5.2, 36.6, Math.PI / 2, { fg: '#FFD84A' }); }
    // 巷子上空：電線、霓虹招牌、蒸氣管、燈籠
    [[36, 42], [64, 70]].forEach(([a, b]) => {
      for (let x = -84; x < -16; x += 9) {
        P(g.box, M('black'), x, 5.6 + rnd(), (a + b) / 2, 0.04, 0.04, b - a + 2);
        if (rnd() < 0.7) B.neonSign(pk(['拉麵', '修理', '酒', '湯', '雞串', '當', '電器', '遊']), x + 3, 4.8, a + 0.4, Math.PI / 2, { size: 0.55 });
        if (rnd() < 0.6) { P(g.cyl8, M('steel'), x + 4.5, 3.3, b - 0.25, 0.22, 7, 0.22, 0, 0, Math.PI / 2); }
        P(g.sph, CK.mat('chochinRed', { col: '#E8503A', em: '#FF6A3A', ei: 0, lamp: true, snow: 0 }), x + 6, 3.6, a + 0.5, 0.5, 0.65, 0.5); B.lampAt(x + 6, (a + b) / 2);
      }
    });
    B.smoke(-40, 5.5, 69.5, { s: 1.6, rise: 6, drift: 1.5, n: 4, col: '#F4F4F4', per: 5, op: 0.35 });
    B.smoke(-70, 5.5, 41.5, { s: 1.4, rise: 5, drift: 1.2, n: 4, col: '#F4F4F4', per: 5, op: 0.35 });
    // 後巷的鐵門（巷子 B 的西邊盡頭）
    B.box(M('steelD'), -84, 0, 65.4, -83.7, 3.0, 68.6); B.box(M('steel'), -83.7, 0.2, 65.8, -83.6, 2.7, 68.2);
    P(g.sph, CK.neonMat('#FF2A2A', 3), -83.5, 3.2, 67, 0.25, 0.25, 0.25);
    CK.door(B, -82.4, 67, 'js_casino', '後巷的鐵門（敲門）', '#FF4A4A', -Math.PI / 2);
    B.inter(-82.4, 65.0, 1.6, '鐵門上的告示', () => az().fac('jishan', 'casino'), '#FF4A4A');
    function rr2(a, b) { return a + (b - a) * rnd(); }
  }
  // ---- 霓虹商店街：轉角的大螢幕樓、膠囊旅館、遊樂中心、霓虹橫丁（中庭的小攤） ----
  function neonStreet(B) {
    const M = CK.M, g = B.g, P = B.part, pk = B.pk, rnd = B.rnd;
    // 十字路口東南角：整面大螢幕的樓
    B.bld({ r: [13, 13, 40, 34], h: 26, style: 'glass', face: 'n', col: '#2A3440', top: false });
    B.screen(26.5, 16, 12.85, Math.PI, 22, 12, { ads: [['德克斯凡', '#1A0A4A', '#4AE8FF', '讓明天提早到來'], ['吉山重工', '#4A1A0A', '#FFB04A', '爐火不熄'], ['朝日科技', '#3A0A3A', '#FF8AE8', '外骨骼新型號'], ['昭旭鐵道', '#0A2A4A', '#FFFFFF', '吉山—皇嶺 一天四班']], every: 5 });
    // 沿著朝日通（南邊，面朝北）：和風高樓＋霓虹
    const neonT = () => { const k = rnd(); if (k < 0.28) return { style: 'mega', h: 2.9 * Math.round(rr2(7, 12)) }; if (k < 0.42) return { style: 'neonTower', h: 3.6 * Math.round(rr2(8, 13)), neon: pk(['#4AE8FF', '#FF4A9A', '#C86AFF', '#FFE24A']) }; return { h: 3.6 * Math.round(4 + rnd() * 5), vsign: pk(['遊戲中心', '卡拉OK', '居酒屋', '藥妝', '網咖', '柏青哥', '烤肉', '咖啡']), neon: 1 }; };
    function rr2(a, b) { return a + (b - a) * rnd(); }
    B.row('n', 13, 42, 52, 16, { style: 'wafu', h: 22 }, 10, 10, () => neonT());
    B.row('n', 13, 62, 88.5, 16, { style: 'wafu', h: 22 }, 10, 14, () => neonT());
    // 沿著大通（東邊，面朝西）
    const inn = B.row('w', 13, 36, 92, 16, { style: 'wafu', h: 22 }, 11, 15, i => (i === 0 ? { h: 25.2, name: '膠囊旅館・巢', vsign: '旅館', accent: 'verm' } : neonT()));
    { const r = inn[0].r; CK.door(B, 11.8, (r[1] + r[3]) / 2, 'js_inn', '走進膠囊旅館・巢（住宿）', '#7AC8E8', -Math.PI / 2); }
    // 沿著站前通（北邊，面朝南）
    B.row('s', 92, 31, 88.5, 14, { style: 'wafu', h: 22 }, 10, 14, () => neonT());
    // 沿著東通（西邊，面朝東）
    B.row('e', 88.5, 31, 76, 15, { style: 'wafu', h: 26 }, 10, 14, () => neonT());
    // 中庭：霓虹橫丁（從朝日通的缺口走進去）
    B.plaza(31, 29, 72, 78, 'pav', { noCurb: true });
    for (let i = 0; i < 6; i++) {
      const x = 36 + (i % 3) * 13, z = i < 3 ? 40 : 64, col = pk(['#C83A3A', '#2E4A8A', '#E8B830', '#3E7A52']);
      B.box(CK.mat('awn|' + col, { tex: 'paint', col, rough: 0.8 }), x - 2.2, 2.4, z - 1.6, x + 2.2, 2.55, z + 1.6);
      [[-2, -1.4], [2, -1.4], [-2, 1.4], [2, 1.4]].forEach(([a, b]) => P(g.box, M('woodD'), x + a, 1.2, z + b, 0.12, 2.4, 0.12));
      B.box(M('woodD'), x - 1.8, 0, z - 1.2, x + 1.8, 1.0, z - 0.6);
      B.neonSign(pk(['串燒', '關東煮', '烤魷魚', '章魚燒', '拉麵', '糖葫蘆']), x, 3.2, z - 1.7, 0, { size: 0.5 });
      B.solid(x - 2.1, z - 1.6, x + 2.1, z - 0.5, 'deco'); B.lampAt(x, z);
    }
    B.inter(49, 46, 2.4, '霓虹橫丁的小攤（吃點東西）', () => az().food('jishan'), '#FFD84A');
    for (let x = 34; x < 70; x += 6) { P(g.box, M('black'), x, 6, 53, 0.03, 0.03, 50); P(g.sph, CK.mat('chochinRed', { col: '#E8503A', em: '#FF6A3A', ei: 0, lamp: true, snow: 0 }), x, 5.4, 53 + (x % 12 ? 8 : -8), 0.5, 0.65, 0.5); }
    B.holo(52, 9, 53, 0, 5, 5, '橫丁', '#FFD84A');
    B.walk([[57, 14], [57, 74], [44, 74], [44, 30]], 4);
  }
  // ---- 重工業區：高爐、煙囪、倉庫、展望廊；峽谷、吊橋、礦場 ----
  function industry(B) {
    const M = CK.M, g = B.g, P = B.part;
    B.zone([103.5, -165, 176, 165], 'gravel', 0.02);
    B.furnace(140, -72, { h: 48 }); B.furnace(140, -16, { h: 44 });
    B.chimney(170, -112, 58); B.chimney(118, -118, 46); B.chimney(168, 34, 52);
    B.bld({ r: [106, 12, 150, 40], h: 12, style: 'factory', face: 'w', top: false });
    B.bld({ r: [106, 48, 150, 86], h: 14, style: 'factory', face: 'w', top: false });
    B.bld({ r: [106, 110, 150, 140], h: 11, style: 'factory', face: 'w', top: false });
    // 運輸帶（倉庫到高爐）
    for (let z = -2; z < 12; z += 4) P(g.box, M('steelD'), 156, 4, z, 0.4, 8, 0.4);
    P(g.box, M('steel'), 156, 8.4, 5, 2.4, 0.8, 16, -0.25, 0, 0);
    // 展望廊（台地＋玻璃欄杆）：從南邊的樓梯上去
    B.terrace(104, -60, 114, -22, 6, { wall: 'ashlar', top: 'pav', open: [[104.5, -22.4, 113.5, -21.6]] });
    B.stairs(104.5, -22, 113.5, -14, 'n', 0.12, 6, { mat: 'gran' });
    B.box(M('glassL'), 113.6, 6, -59.5, 113.8, 7.2, -22.5); B.box(M('steelD'), 113.5, 7.2, -59.5, 113.9, 7.35, -22.5);
    B.solid(113.4, -60, 114, -22, 'wall');
    B.Bt.yOff = 6; B.box(M('steelD'), 104.2, 0, -59.8, 104.6, 1.2, -22.2); B.bench(108, -40, Math.PI / 2); B.bench(108, -30, Math.PI / 2); B.Bt.yOff = 0;
    B.inter(111, -40, 2.4, '重工廠展望廊（看看）', () => az().fac('jishan', 'factory'), '#FFB04A');
    B.inter(111, -50, 2.4, '觀光景點：高爐夜景（觀光章）', () => az().stamp('jishan', 'js_furnace'), '#E8C04A').sight = 'js_furnace';
    B.label('展望廊', 109, -45);
    // 峽谷（x 178～196）、吊橋（z -40～-34）、對岸的礦場
    B.water([[178, -400], [196, -400], [196, 400], [178, 400]], { level: -7, bank: 'ishi', name: '吉山峽谷' });
    B.bridge(176, -40, 197.5, -34, { deck: 0.3, rise: 0, mat: 'planks', rail: true, railMat: 'steelD' });
    B.suspension(176, 197.5, -37, 0.3, { w: 6, h: 20 });
    B.inter(186, -37, 2.4, '礦場吊橋（看看）', () => az().fac('jishan', 'mine'), '#4AE8FF');
    B.plaza(197.5, -46, 200, -28, 'gravel', { noCurb: true });
    // 對岸的山壁、礦坑口
    B.ishigaki(210.2, -300, 330, 300, 0, 34, { batter: 0.3, mat: 'ishi', top: 'grass' });   // 對岸的岩壁（斜的、灰褐色的石頭）
    B.forest([214, -300, 330, 300], 240, { y: 34, skip: (x, z) => Math.hypot(x - 236, z + 60) < 26 });
    B.box(M('black'), 199.6, 0, -41, 202.5, 6.2, -33); B.box(M('woodB'), 199.2, 6.2, -42, 200.6, 7, -32); [-41.5, -32.5].forEach(z => B.box(M('woodB'), 199.2, 0, z - 0.5, 200.6, 6.2, z + 0.5));
    B.sign('吉山礦場', 'w', 199.2, -37, 8, { size: 0.8, bg: '#1A1A20', fg: '#4AE8FF', neon: 1 });
    // 山上的豎坑架（輪子會轉）
    const hx = 236, hz = -60, hy = 34;
    [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(([a, b]) => P(g.box, M('steelD'), hx + a * 0.6, hy + 11, hz + b * 0.6, 0.6, 22, 0.6, a * 0.03, 0, -b * 0.03));
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(3, 0.3, 6, 24), M('steel')); wheel.position.set(hx, hy + 23, hz); B.group.add(wheel); W.town.anim.push((dt, t) => { wheel.rotation.z = t * 0.6; });
    B.box(M('corr', { col: '#6A6A70' }), hx - 14, hy, hz + 8, hx + 2, hy + 9, hz + 26);
    void g;
  }
  // ---- 吉山站：玻璃的大廳、霓虹站名 ----
  function station(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, cx = (x0 + x1) / 2;
    B.bld({ r: [x0, z0 + 2, x1, z1], h: 16, style: 'glass', face: 'n', col: '#9AB0C0', top: false });
    B.box(M('glass'), cx - 18, 0.3, z0 + 1.9, cx + 18, 15, z0 + 2.0);
    for (let x = cx - 18; x <= cx + 18.01; x += 3) B.box(M('metal'), x - 0.1, 0.3, z0 + 1.8, x + 0.1, 15, z0 + 2.1);
    B.box(M('shopLit'), cx - 17.8, 0.3, z0 + 2.05, cx + 17.8, 3.6, z0 + 2.1);
    B.box(M('metal'), cx - 22, 4.6, z0 - 5, cx + 22, 4.9, z0 + 2); [-20, -10, 0, 10, 20].forEach(dx => { P(g.cyl8, M('metal'), cx + dx, 2.3, z0 - 4.4, 0.3, 4.6, 0.3); B.solid(cx + dx - 0.2, z0 - 4.6, cx + dx + 0.2, z0 - 4.2, 'deco'); });
    B.neon(cx - 22, 4.5, z0 - 5.05, cx + 22, 4.6, z0 - 4.95, '#4AE8FF');
    B.sign('吉山站', 'n', z0 + 1.8, cx, 17.6, { size: 2.2, bg: '#0A0A14', fg: '#4AE8FF', neon: 1 });
    CK.door(B, cx, z0 - 1.2, 'js_station', '走進吉山站（售票口：回東鶴、轉往他城）', '#5A8AC8', Math.PI);
    B.inter(cx - 10, z0 - 1.2, 2.4, '吉山站的時刻表', () => R.townTalk('吉山站的時刻表', ['往東鶴：每天四班（魔導電車，一天）', '往皇嶺：每天四班', '往奉主、府廳：每天兩班', '市內環狀線：高架，五分鐘一班']));
  }

  // ================= 走得進去的店、空間 =================
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const eatMenu = (title, say, menu) => {
    const s = S();
    R.sheet('<p class="kicker">吉山</p><h2>' + R.esc(title) + '</h2><p>' + R.esc(say) + '</p><p class="note">吃了之後，今天下遺跡有加成（一天算最後吃的那一餐）。費拉 ' + s.gold + '</p><div class="dn-menu">'
      + menu.map((m, i) => '<button type="button" class="btn" data-jsf="' + i + '"' + (s.gold < m[1] ? ' disabled' : '') + '><b>' + R.esc(m[0]) + '</b>　' + m[1] + ' 費拉<br><small>' + R.esc(m[2]) + '</small></button>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn pri" id="jsf-x">不吃了</button></div>');
    document.getElementById('jsf-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-jsf]').forEach(b => { b.onclick = () => { const m = menu[+b.dataset.jsf]; if (s.gold < m[1]) return; s.gold -= m[1]; s.buff = { kind: 'food', b: m[3], until: s.day }; R.save(); R.sfx && R.sfx('coin'); R.closeSheet(); R.toast('吃了' + m[0] + '。今天下遺跡有加成。', '#E8C04A'); }; });
  };
  // 公會吉山分館
  CK.defineRoom({ id: 'js_guild', name: '公會吉山分館', hint: '委託板上一半是工廠區、礦場的委託', w: 16, d: 12, h: 4.4, floor: 'gran', wall: 'plaster', wain: 'woodD', build(B, K) {
    K.counter(0, -3.6, 8, 0.9, { mat: 'woodB', top: 'wood' }); K.register(-2.6, -3.6);
    K.wallSign('公會吉山分館', 'n', 0, 3.3, { size: 0.65, bg: '#2E5A3A', fg: '#F4ECD8' });
    K.board(-5.6, -5.9, 3); K.board(5.6, -5.9, 3);
    B.inter(0, -2.5, 2.2, '櫃台：今日地方委託', () => R.azuki.quest('jishan'), '#3E9A5A');
    B.inter(-5.6, -4.9, 2, '委託板（看看）', () => R.townTalk('公會吉山分館・委託板', [pick(['高爐區巡邏：夜班的時候，爐渣堆那邊有東西在動。', '礦場護送：新礦脈的樣本送到朝日科技，路上要兩個人。', '尋物：機械町的老師傅掉了一顆祖傳的齒輪。', '急件：峽谷的吊橋晚上藍燈不亮了，要人去看看是不是有東西咬了電線。'])]));
    B.talker(2.4, -4.6, 0, '分館的館員', ['「吉山分館的委託，一半是工廠區的。」', '「礦場最近挖到一條奇怪的礦脈，說是有魔力的反應。」', '「隔壁兩棟大樓的冷氣都吹到我們這邊來。」']);
    B.talker(-4.6, 2, Math.PI / 2, '休息的勇者', ['「工廠的委託報酬好，可是會弄得一身黑。」', '「晚上去十字路口看看，螢幕亮起來跟白天一樣。」']);
    K.bench(-5.4, 0.5, 3, Math.PI / 2); K.bench(5.4, 0.5, 3, -Math.PI / 2);
    K.plant(-7.2, 4.8); K.plant(7.2, 4.8); K.rug(0, 1.5, 4, 6, '#2E5A3A');
    K.lamp(-3.5, 0); K.lamp(3.5, 0);
  } });
  // 世界中央銀行・吉山分館
  CK.defineRoom({ id: 'js_bank', name: '世界中央銀行・吉山分館', hint: '大理石的大廳，牆上的螢幕跳著匯率', w: 18, d: 12, h: 5.2, floor: 'marble', wall: 'plaster', wain: 'ashlar', trim: 'gold', amb: 0.9, build(B, K) {
    K.counter(0, -3, 13, 0.8, { mat: 'woodB', top: 'marble', h: 1.1 });
    K.wallSign('世界中央銀行', 'n', 0, 3.6, { size: 0.62, bg: '#F2F0EA', fg: '#3A2E20' });
    K.wallSign('費拉 1.00　德克斯凡幣 0.87', 'n', 0, 2.6, { size: 0.36, bg: '#0A0A14', fg: '#7AFF8A', lit: 1 });
    B.inter(-3, -1.9, 2.2, '存款・借款窗口', () => R.bankSheet ? R.bankSheet() : R.toast('今天窗口休息。'), '#C8A040');
    B.inter(3, -1.9, 2.2, '股票窗口', () => R.stockSheet ? R.stockSheet() : R.toast('今天不開盤。'), '#C8A040');
    B.talker(-3, -4, 0, '存款窗口的行員', ['「吉山的工人領薪水那天，隊伍排到外面。」', '「德克斯凡的票子在這裡最好換。」']);
    B.talker(3, -4, 0, '股票窗口的行員', ['「吉山礦業今天又漲了。新礦脈的消息。」', '「交易所就在隔壁，下單在這裡也可以。」']);
    K.bench(-6, 3.8, 3.5, 0); K.bench(1, 3.8, 3.5, 0);
    K.plant(-8, -5, 1.2); K.plant(8, -5, 1.2); K.lamp(-4, 0); K.lamp(4, 0);
  } });
  // 股票交易所大廳
  CK.defineRoom({ id: 'js_stock', name: '吉山證券交易所・大廳', hint: '整面牆的報價板，數字一直在跳', w: 24, d: 16, h: 8, floor: 'marble', wall: 'conc', wain: 'woodB', trim: 'gold', amb: 1.0, build(B, K) {
    K.wallSign('吉山證券交易所', 'n', 0, 6.6, { size: 0.9, bg: '#0A0A14', fg: '#7AFF8A', lit: 1 });
    K.wallSign('德克斯凡 ▲2.31　朝日科技 ▲1.12　吉山重工 ▼0.84　吉山礦業 ▲4.12', 'n', 0, 5.2, { size: 0.5, bg: '#05060A', fg: '#FFE8A0', lit: 1 });
    K.wallSign('東鶴冒險用品 ▲3.05　天宮海運 ▼1.47　奉主重建債 ▼2.20', 'n', 0, 4.3, { size: 0.5, bg: '#05060A', fg: '#FFE8A0', lit: 1 });
    [-6, 0, 6].forEach(x => { K.counter(x, -1, 4, 1.6, { mat: 'woodB', top: 'woodD' }); });
    B.inter(0, 1.4, 2.6, '觀光景點：股票交易所大廳（觀光章）', () => az().stamp('jishan', 'js_stock'), '#E8C04A').sight = 'js_stock';
    B.inter(6, 1.4, 2.2, '下單（股票）', () => R.stockSheet ? R.stockSheet() : R.toast('今天不開盤。'), '#7AFF8A');
    B.talker(-6, -2.6, 0, '喊價的交易員', ['「買！買！吉山礦業全部買進！」', '「開盤鈴一響，整層樓像遺跡反應一樣吵。」']);
    B.talker(0, -2.6, 0, '交易所的導覽員', ['「這裡是昭旭最大的交易所。奉主那間沒了以後，就剩這裡。」', '「二樓的玻璃後面可以參觀。下單請到右邊的窗口。」']);
    B.talker(-9, 4, Math.PI / 2, '輸了錢的商人', ['「德克斯凡一進來，什麼都漲。只有我的股票跌。」']);
    K.bench(-8, 6, 4, 0); K.bench(8, 6, 4, 0); K.plant(-11, -7, 1.3); K.plant(11, -7, 1.3);
    K.lamp(-6, 2); K.lamp(6, 2); K.lamp(0, 5);
  } });
  // 機械町拉麵
  CK.defineRoom({ id: 'js_ramen', name: '機械町拉麵', hint: '湯頭的蒸氣、工廠下班的人擠滿吧台', w: 10, d: 7, h: 3.2, floor: 'tile', wall: 'plaster', wain: 'woodB', build(B, K) {
    K.counter(0, -1.8, 7, 0.6, { mat: 'woodB', top: 'woodD' });
    K.shelf(0, -3.2, 6, 0, { h: 1.6, cols: ['#C8C0B0', '#8A5A3A', '#E8E4DC'] });
    K.wallSign('機械町拉麵', 'n', 0, 2.5, { size: 0.5, bg: '#1A1A20', fg: '#FFD84A', lit: 1 });
    B.inter(0, -0.8, 2.2, '點拉麵', () => eatMenu('機械町拉麵', '「醬油、味噌，還是吉山限定的鐵板炒麵？」', [['機械町醬油拉麵', 10, '豬骨醬油湯頭，叉燒厚到像齒輪', { hp: 0.05, dmg: 0.03 }], ['味噌奶油拉麵', 12, '加了玉米和奶油，下班最需要的熱量', { hp: 0.07, regen: 0.1 }], ['鐵板炒麵（吉山限定）', 9, '在高爐鐵板上炒的，焦香', { dmg: 0.04, mp: 0.03 }]]), '#FFD84A');
    B.talker(0, -2.6, 0, '拉麵店的老闆', ['「工廠下班的人潮一來，吧台就坐滿了。」', '「湯頭熬了兩天，跟高爐一樣不熄火。」']);
    B.talker(-3, 0.4, Math.PI, '下班的工人', ['「這碗吃完，明天又能顧爐子了。」', '「你是勇者？礦場那邊最近怪怪的。」']);
    K.lamp(-2, -0.5); K.lamp(2, -0.5);
  } });
  // 朝日科技展示廳
  CK.defineRoom({ id: 'js_asahi', name: '朝日科技展示廳', hint: '白色的地板、展示台上的外骨骼，魔導具櫃檯排著長長的隊', w: 20, d: 14, h: 6, floor: 'marble', wall: 'plaster', wain: 'metal', trim: 'steelD', amb: 1.1, build(B, K) {
    K.wallSign('朝日科技', 'n', 0, 4.6, { size: 1.0, bg: '#F4F4F8', fg: '#C8202A' });
    // 展示台＋外骨骼
    [-5, 5].forEach(x => { B.part(B.g.cyl24, CK.M('marble'), x, 0.2, -2.5, 3.2, 0.4, 3.2); [[0, 2.4, 1.4, 1.6, 0.9], [0, 3.5, 0.7, 0.6, 0.7], [-0.9, 2.4, 0.35, 1.5, 0.35], [0.9, 2.4, 0.35, 1.5, 0.35], [-0.4, 0.95, 0.45, 1.5, 0.45], [0.4, 0.95, 0.45, 1.5, 0.45]].forEach(([a, b, sx, sy, sz]) => B.part(B.g.box, CK.M('steel'), x + a, b + 0.2, -2.5, sx, sy, sz)); B.solid(x - 1.6, -4.1, x + 1.6, -0.9, 'deco'); });
    K.counter(0, 4, 8, 0.8, { mat: 'white', top: 'marble' });
    B.inter(-5, -0.4, 2.4, '外骨骼試穿（預約）', () => az().fac('jishan', 'tech'), '#FF8AE8');
    B.inter(0, 2.9, 2.4, '魔導具櫃檯（看看）', () => R.townTalk('朝日科技・魔導具櫃檯', [pick(['展示的是「魔力電池」：把遺跡生物的核心磨成粉壓進去，能撐一整天。標價很嚇人。', '「這是試作的外骨骼手套，力氣變三倍。勇者證討伐段以上才能預約。」', '「板北的實驗所正在做魔力義肢。明年發表。」'])]), '#FF8AE8');
    B.talker(5, -0.6, Math.PI, '展示廳的工程師', ['「外骨骼的關節用的是礦場挖出來的魔力鋼。」', '「德克斯凡想買我們的專利。老闆不肯。」']);
    B.talker(0, 5, Math.PI, '排隊的客人', ['「我排了三個小時，就為了一個魔導打火機。」']);
    K.plant(-9, -6, 1.2); K.plant(9, -6, 1.2); K.lamp(-5, 0); K.lamp(5, 0); K.lamp(0, 3.5);
  } });
  // 地下賭場（後巷的鐵門）
  CK.defineRoom({ id: 'js_casino', name: '地下賭場', hint: '昏暗的燈光、紅色的地毯，骰子的聲音', w: 16, d: 12, h: 3.4, floor: 'carpet', wall: 'plaster', wain: 'woodB', trim: 'gold', amb: 0.55, build(B, K) {
    K.wallSign('會員制', 'n', 0, 2.6, { size: 0.5, bg: '#1A0A0A', fg: '#FF4A4A', lit: 1 });
    [[-4, -1.5], [4, -1.5], [0, 2.5]].forEach(([x, z]) => { B.part(B.g.cyl24, CK.M('green'), x, 0.85, z, 3.4, 0.1, 2.2); B.part(B.g.cyl24, CK.M('woodB'), x, 0.4, z, 3.2, 0.8, 2.0); B.solid(x - 1.6, z - 1, x + 1.6, z + 1, 'deco'); });
    B.inter(-4, -0.2, 2.4, '小賭一場（20 費拉）', () => az().act('jishan'), '#FF4A4A');
    B.talker(-4, -3, 0, '莊家', ['「下注吧。籌碼換現金，今天的規矩。」', '「贏了高興，輸了當買教訓。」']);
    B.talker(4, -3, 0, '戴墨鏡的客人', ['「……別看我。」', '「這裡的錢，一半是從工廠流過來的。」']);
    B.talker(6, 4, Math.PI, '門口的保鑣', ['「鬧事的，從鐵門丟出去。」']);
    K.lamp(-4, -1.5); K.lamp(4, -1.5);
  } });
  // 膠囊旅館・巢
  CK.defineRoom({ id: 'js_inn', name: '膠囊旅館・巢', hint: '一排一排的膠囊床位，霓虹從窗戶透進來', w: 14, d: 10, h: 3.4, floor: 'tile', wall: 'plaster', wain: 'metal', build(B, K) {
    K.counter(-3.5, 2.6, 4, 0.8, { mat: 'white', top: 'marble' });
    for (let i = 0; i < 5; i++) [0, 1.15].forEach(y => { B.box(CK.M('white'), -6.6 + i * 2.2, y, -4.6, -4.6 + i * 2.2, y + 1.1, -2.4); B.box(CK.M('black'), -6.4 + i * 2.2, y + 0.15, -2.42, -4.8 + i * 2.2, y + 0.95, -2.38); B.box(CK.neonMat('#4AE8FF', 1.4), -6.4 + i * 2.2, y + 1.0, -2.39, -4.8 + i * 2.2, y + 1.04, -2.37); });
    B.solid(-6.6, -4.6, 4.4, -2.4, 'wall');
    B.inter(-3.5, 3.6, 2.2, '住一晚（25 費拉）', () => { const d = W.town.outer && W.town.outer.P; CK.innStay('jishan', 25, d || { x: 11.8, z: 44, yaw: -Math.PI / 2 }); }, '#7AC8E8');
    B.talker(-3.5, 1.6, 0, '巢的櫃台', ['「一晚二十五費拉。行李放在置物櫃。」', '「膠囊裡有小螢幕，可以看十字路口的轉播。」', '「工廠夜班的人白天來睡，安靜一點喔。」']);
    K.bench(3, 3.4, 3, 0); K.plant(6, 4); K.lamp(-3.5, 2.5); K.lamp(3, 0);
  } });
  // 吉山站・大廳
  CK.defineRoom({ id: 'js_station', name: '吉山站・大廳', hint: '「環狀線，即將進站——」頭頂是高架電車的聲音', w: 24, d: 14, h: 7, floor: 'gran', wall: 'conc', wain: 'metal', trim: 'steelD', amb: 1.0, build(B, K) {
    K.gates(0, -3.5, 7, 1.5);
    B.box(CK.M('steelD'), -12, 0, -3.6, -5.6, 1.1, -3.4); B.box(CK.M('steelD'), 5.6, 0, -3.6, 12, 1.1, -3.4); B.solid(-12, -3.6, -5.6, -3.4, 'wall'); B.solid(5.6, -3.6, 12, -3.4, 'wall'); B.solid(-5.6, -4.2, 5.6, -2.8, 'wall');
    K.counter(-8, 1.0, 5, 0.9, { mat: 'steelD', top: 'marble' });
    K.wallSign('吉山站', 'n', 0, 5.6, { size: 1.2, bg: '#0A0A14', fg: '#4AE8FF', lit: 1 });
    K.wallSign('東鶴　皇嶺　奉主　府廳　板北', 'n', 0, 4.4, { size: 0.45, bg: '#0E0E14', fg: '#FFD84A', lit: 1 });
    B.inter(-8, 2.2, 2.4, '售票口（回東鶴、轉往他城）', () => CK.ticket(), '#5A8AC8');
    B.talker(-8, 0, 0, '售票口的站務員', ['「往東鶴的票嗎？」', '「環狀線不用買票，刷勇者證就好——開玩笑的，要買。」']);
    K.shelf(9, 2, 4, -Math.PI / 2, { cols: ['#2E5A9A', '#E8E4DC', '#E8B830', '#C83A3A'] });
    B.inter(7.6, 2, 2, '車站的小賣店（能量罐）', () => R.azuki.food('jishan'), '#4AE8FF');
    K.bench(-3, 4.5, 4, 0); K.bench(3, 4.5, 4, 0);
    B.talker(0, 2.5, Math.PI, '等車的工人', ['「夜班的電車最擠。」', '「皇嶺？那邊的人走路都很慢。」']);
    K.lamp(-8, 0); K.lamp(0, 2); K.lamp(8, 0);
  } });
})(window.R);
