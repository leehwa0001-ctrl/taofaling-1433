// 奉主（陪都）的 3D 城——精緻城市版（2026-10-09 作者：做完吉山後重做東鶴和奉主）
// 照 hosu.js 的地圖重蓋（座標一樣，北是 -z）：
//   北：奉主站（站房在高架底下，月台在高架上）、站前廣場、公會奉主分館（廣場西側的石樓，hosubranch.js 的櫃台）；
//       高架的「奉主環狀線」繞一圈，橘色的電車一直在跑。
//   中：千燈通商店街（拱廊，小吃、柏青哥、電器、藥妝、書店）、新堂町商務區的大樓、奉主百貨；
//       燈籠堀（運河）兩岸的霓虹和紅燈籠、大章魚、招福橋邊「奉主製菓」揮手的大看板、遊覽船。
//   西：奉主城（護城河、石垣、櫓門、綠瓦的天守閣）和公園的松林。
//   南：長屋町、新町和奉主塔；最南邊是臨海工業區（奉主製鐵所、魔導機關工廠、奉主港）。
// 觀光章、小吃、天守閣、奉主塔、回東鶴用 hosu.js 的（R.hosuApi：存檔的 hosuSights、稱號「奉主通」都照舊）。
// 搭電車來（R.goHosu）、從奉主分館出發的遺跡回來（R.hosuEnter）都進這裡；舊的 hosu.js 場景留著不用（R.hosuApi.enterOld）。
// 放在 citykit*.js、hosu.js、hosubranch.js、azukicities.js 後面。
(function (R) {
  const CK = R.CK, W = R.W, S = () => R.S; if (!CK) return;
  const H = () => R.hosuApi || {}, esc = s => R.esc(s), $ = id => document.getElementById(id);
  const DECK = 10, FARE = 60;
  const LOOP = [[-166, -105], [155, -105], [155, 72], [-166, 72]];
  const HALL = [-45, -112, 45, -94], PLAZA = [-50, -94, 50, -72], CANAL = [-114, 22, 160, 34], QUAY = 104, SEA_X = 160;
  const PARK = [-172, -56, -101, 52], CASTLE = { x: -134, z: -6, hw: 16, moat: 7 };
  const ROADS = [[-150, -68, 155, -56, '北通'], [-101, -11, 155, 1, '中通'], [-150, 52, 155, 64, '南通'], [-10, -68, 10, 64, '奉主大通'], [-101, -68, -89, 64, '西大通'], [79, -68, 91, 64, '東大通']];
  const inR = (x, z, r, m) => x > r[0] - (m || 0) && x < r[2] + (m || 0) && z > r[1] - (m || 0) && z < r[3] + (m || 0);
  const onRoad = (x, z, m) => ROADS.some(r => inR(x, z, r, m || 0));
  const SHOPS = ['拉麵・赤鬼', '居酒屋・笑福', '烏龍麵・千燈', '壽司・港鮨', '燒肉・鐵火', '珈琲・夜曲', '藥妝・千燈', '二手衣・古着屋', '遊樂場・星光', '卡拉OK・歌聲', '螃蟹料理・蟹宴', '河豚・福壽', '當舖', '眼鏡・光', '鞋店・步', '和菓子・月', '書店・積善堂', '金券行', '牛丼・快', '旅館・奉主屋', '湯屋・千代之湯', '彈珠台', '將棋道場', '立食蕎麥', '餃子・王將軍', '鯛魚燒', '魔導零件行', '五金・鐵太郎', '印章・篆', '花店・浪', '服飾・千日', '茶葉・宇治丸', '理髮・剪', '洋菓子・白鳩', '炸豬排・勝'];
  const SIGN_COL = [['#C8202A', '#FFF4D8'], ['#1A2A6A', '#FFE24A'], ['#0E0E14', '#FF5AB8'], ['#0E0E14', '#5AE8FF'], ['#F4E8C8', '#8A1A1A'], ['#2A6A3A', '#FFFFFF'], ['#E8A020', '#1A1410'], ['#5A1A6A', '#FFE8FF'], ['#0E0E14', '#FFD24A']];
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ---------- 車票：回東鶴（錢不夠也讓你上車，跟以前一樣）、轉往他城 ----------
  const ticket = () => {
    const s = S();
    R.sheet('<p class="kicker">奉主站・售票口</p><h2>要搭到哪裡？</h2><p>「往東鶴的魔導電車，單程 ' + FARE + ' 費拉、四個鐘頭。往皇嶺、吉山和別的城，在這裡轉乘城際。」</p><p class="note">費拉 ' + s.gold + (s.gold < FARE ? '・錢不夠：站務員看了你的勇者證，「勇者先上車，下次補票。」' : '') + '</p>',
      '<div class="row"><button type="button" class="btn pri" id="hz-home">回東鶴（' + FARE + ' 費拉）</button><button type="button" class="btn" id="hz-other">轉往他城</button><button type="button" class="btn" id="hz-tt">看時刻表</button><button type="button" class="btn" id="hz-x">再逛逛</button></div>');
    $('hz-x').onclick = R.closeSheet;
    $('hz-tt').onclick = () => R.townTalk('奉主站的時刻表', ['往東鶴：每天四班（早、午、傍晚、晚上）', '往皇嶺：每小時一班', '往吉山：每天六班', '環狀線：五分鐘一班']);
    $('hz-other').onclick = () => R.azukiTicket && R.azukiTicket('hosu');
    $('hz-home').onclick = () => { s.gold = Math.max(0, s.gold - FARE); R.save(); R.closeSheet(); R.fade(() => { if (H().backToDonghe) H().backToDonghe(); }); };
  };
  const sight = (B, x, z, id, label) => { const it = B.inter(x, z, 2.6, '觀光景點：' + label + '（觀光章）', () => H().visit && H().visit(id), '#E8C04A'); it.sight = id; return it; };
  const food = (B, x, z, id, label) => B.inter(x, z, 2.1, label + '（買來吃）', () => H().eat && H().eat(id), '#E8A03A');

  CK.define({
    id: 'hosu', name: '奉主', seed: 2836, stationName: '奉主站', fog: 1.3,
    land: [[-700, -700], [700, -700], [700, 700], [-700, 700]],
    walk: [-172, -136, 160, 104], spawn: [0, -88.5, 0], camYaw: 0,
    banner: '昭旭的陪都・魔導電車坐了四個鐘頭',
    plaza: [0, -80], plazaName: '站前廣場',
    ft: [['公會奉主分館', -41, -84.2], ['千燈通商店街', -50, -30], ['招福橋', 0, 19], ['奉主城', -134, 19], ['奉主塔', 46, 52.5], ['奉主港', 110, 100]],   // 快速移動（ckextra.js）
    brawl: [[-30, 19], [58, 37], [-50, 2], [0, -80]],
    gossip: ['「港區又一個外國商人被刺了……這個月第三個。」', '「環狀線一圈四十分鐘，睡過站就再繞一圈。」', '「千燈通的章魚燒，阿八那家最好吃。」', '「奉主塔的燈今天是白的，明天會放晴。」', '「製鐵所說要辦轉職訓練……訓練完還有沒有位子，誰知道。」', '「德克斯凡的魔導計算機進來以後，課裡從十二個人變成四個。」', '「招福橋上大家都在學那個人偶舉手。」'],
    guards: [[-13.6, -76, Math.PI], [13.6, -76, Math.PI], [-12.6, -16, 0], [-12.6, 18, 0]],
    patrols: [[[-12, -60], [-12, 48]], [[-140, -53.6], [150, -53.6]], [[-50, -52], [-50, 14]], [[-85, 19], [150, 19]]],
    firstTip: '第一次來奉主：Tab 看地圖。觀光景點有章可以蓋；公會奉主分館在站前廣場西側；回東鶴到北邊的奉主站買票。',
    mapNote: '北邊是奉主站，中間是千燈通商店街和燈籠堀，西邊是奉主城，南邊是臨海工業區和奉主港。',
    ads: ['奉主啤酒', '天宮海運', '昭旭鐵道', '白藤堂製藥', '魔導燈具工業', '德克斯凡商會', '奉主重工', '東鶴電力', '千日製菓', '德克斯凡礦務'],
    vendLines: ['奉主啤酒的罐裝茶。', '熱的混合果汁，奉主的喫茶店口味。', '冰的彈珠汽水——冬天也有在賣。'],
    carCols: ['#E8E4DC', '#2A2A30', '#8A2A24', '#3A5A8A', '#C8C0B0', '#16161C', '#5A6A4A', '#E8A03A'],
    stampDone: it => !!(it.sight && (S().hosuSights || {})[it.sight]),
    build(B) {
      const M = CK.M, rnd = B.rnd, rr = B.rr, pk = B.pk;
      // ---------- 道路 ----------
      ROADS.forEach(([x0, z0, x1, z1, name]) => B.road(x0, z0, x1, z1, { sw: 4, name, line: name === '奉主大通' ? 'y' : 'w' }));
      // ---------- 海、燈籠堀（一個水面：運河從西邊流到海） ----------
      B.water([[SEA_X, -40], [600, -40], [600, 600], [-600, 600], [-600, QUAY], [SEA_X, QUAY], [SEA_X, CANAL[3]], [CANAL[0], CANAL[3]], [CANAL[0], CANAL[1]], [SEA_X, CANAL[1]]], { level: -1.6, bank: 'conc', name: '燈籠堀' });
      [[-105, -85, '西橋'], [-14, 14, '招福橋'], [75, 95, '東橋']].forEach(([a, b]) => B.bridge(a, CANAL[1], b, CANAL[3], { road: true, axis: 'z', mat: 'asph', railMat: 'conc', deck: 0.12 }));
      [[-53, -47, '千燈橋'], [44, 50, '新町橋']].forEach(([a, b]) => B.bridge(a, CANAL[1] - 0.6, b, CANAL[3] + 0.6, { axis: 'z', rise: 0.9, mat: 'woodD', railMat: 'verm' }));
      // 岸邊的散步道（北岸、南岸）
      [[-85, -14], [14, 75], [95, 155]].forEach(([a, b]) => { B.plaza(a, 16, b, 22, 'gran', { noCurb: true }); B.plaza(a, 34, b, 40, 'gran', { noCurb: true }); }); B.plaza(-114, 34, -105, 40, 'gran', { noCurb: true });
      station(B); plaza(B); loopLine(B); arcade(B); downtown(B); canal(B); southBank(B); tower(B); castle(B); industry(B); street(B); people(B);
      // 地名（狀態列）
      [['奉主站', HALL], ['站前廣場', PLAZA], ['千燈通商店街', [-55, -56, -45, 16]], ['奉主城', [-158, -30, -110, 18]], ['奉主城公園', PARK], ['新堂町商務區', [10, -56, 79, -11]], ['奉主百貨前', [91, -56, 160, -11]], ['燈籠堀・招福橋', [-12, 14, 12, 42]], ['燈籠堀', [-114, 14, 200, 42]],
        ['長屋町', [-89, 40, -10, 52]], ['新町・奉主塔', [10, 40, 160, 52]], ['奉主製鐵所', [-172, 64, -26, 110]], ['魔導機關工廠', [-26, 64, 60, 110]], ['奉主港', [60, 64, 200, 140]], ['站北', [-172, -140, 160, -94]], ['北通', [-172, -72, 160, -52]], ['中通', [-101, -15, 160, 5]], ['南通', [-172, 48, 160, 68]], ['奉主大通', [-14, -68, 14, 64]]].forEach(([n, r]) => B.area(n, r));
      [['奉主站', 0, -103, 1], ['千燈通商店街', -50, -34], ['新堂町', 44, -34], ['奉主百貨', 112, -34], ['燈籠堀', 60, 28], ['奉主城', -134, -6, 1], ['長屋町', -50, 45], ['新町・奉主塔', 46, 45], ['奉主製鐵所', -100, 90], ['魔導機關工廠', 12, 90], ['奉主港', 110, 90, 1]].forEach(([t, x, z, big]) => B.label(t, x, z, big));
      void M; void rnd; void rr; void pk;
    }
  });

  // ---------- 奉主站、站前廣場、公會奉主分館 ----------
  function station(B) {
    const M = CK.M, P = B.part, g = B.g, [x0, z0, x1, z1] = HALL, h = DECK - 1.6;
    B.box(M('conc'), x0, 0, z0, x1, h, z1); B.solid(x0, z0, x1, z1, 'house'); B.foot(HALL, 'hall', h);
    B.box(M('curb'), x0 - 0.2, h, z0 - 0.2, x1 + 0.2, h + 0.3, z1 + 0.2);
    B.box(M('shopLit'), -42, 0.3, z1 - 0.02, 42, 5, z1 + 0.05);   // 正面：整片亮著的玻璃
    for (let x = -42; x <= 42; x += 4) B.box(M('steelD'), x - 0.1, 0.3, z1 + 0.03, x + 0.1, 5.2, z1 + 0.2);
    B.box(M('steelD'), -43, 5, z1, 43, 5.35, z1 + 0.25);
    B.box(M('glassL'), -24, 4.5, z1, 24, 4.62, z1 + 3.4); B.box(M('steelD'), -24, 4.35, z1 + 3.3, 24, 4.7, z1 + 3.5);   // 雨棚
    [-23, -8, 8, 23].forEach(x => B.box(M('steelD'), x - 0.1, 0, z1 + 3.2, x + 0.1, 4.5, z1 + 3.4));
    B.sign('奉主站', 's', z1, 0, 6.7, { size: 1.3, bg: '#1A2A5A', fg: '#FFFFFF', box: 1, lit: 1 });
    B.sign('魔導電車・環狀線・港區貨運線', 's', z1 + 3.55, 0, 4.0, { size: 0.42, bg: '#0E0E14', fg: '#FFE24A' });
    // 月台的雨棚（高架上）
    B.box(M('roofG'), -40, DECK + 3.6, -110, 40, DECK + 3.9, -100);
    for (let x = -38; x <= 38; x += 8) [-109.6, -100.4].forEach(z => B.box(M('steelD'), x - 0.12, DECK + 0.6, z - 0.12, x + 0.12, DECK + 3.6, z + 0.12));
    B.inter(0, -92.2, 2.6, '奉主站：售票口（回東鶴、轉往他城）', ticket, '#3E7A48');
    // 站房兩邊的大樓（高架北邊）
    B.bld({ r: [-46, -136, -18, -114], h: 34, style: 'brick', face: 's', col: '#C8BCA8', ad: true });
    B.bld({ r: [18, -136, 46, -114], h: 46, style: 'glass', face: 's', col: '#8E969E' });
    void P; void g;
  }
  function plaza(B) {
    const M = CK.M, P = B.part, g = B.g;
    B.plaza(PLAZA[0], PLAZA[1], PLAZA[2], PLAZA[3], 'gran');
    // 時鐘柱
    P(g.box, M('steelD'), 0, 2.3, -82, 0.4, 4.6, 0.4); P(g.cyl24, M('white'), 0, 4.9, -82, 1.5, 0.3, 1.5, Math.PI / 2, 0, 0);
    [-1, 1].forEach(sd => { P(g.box, M('black'), 0, 5.15, -82 + sd * 0.17, 0.06, 0.55, 0.02); P(g.box, M('black'), 0.18, 4.9, -82 + sd * 0.17, 0.4, 0.05, 0.02); });
    B.solid(-0.4, -82.4, 0.4, -81.6, 'deco');
    sight(B, 0, -80.6, 'station', '奉主站（站前的時鐘）');
    B.busStop(-32, -75, 0, '環狀線・港區'); B.busStop(32, -75, 0, '奉主城・新町');
    // 計程車招呼站
    for (let i = 0; i < 4; i++) { const c = CK.makeCar('#16161C', 'taxi'); c.position.set(16 + i * 6, 0.12, -88); c.rotation.y = Math.PI / 2; B.group.add(c); B.solid(16 + i * 6 - 2.2, -89, 16 + i * 6 + 2.2, -87, 'deco'); }
    B.talker(18, -85.6, Math.PI, '計程車的司機', ['「去哪？港區、奉主城、新町都去。今天塞車，走南通比較快。」', '「計程車行在東大通那邊，想開車打工去問問。」', '「奉主人坐上車第一句話都是：快一點。」']);
    // 豬肉包・福滿
    B.bld({ r: [36, -94, 47, -89], h: 4.4, style: 'shop', face: 's', name: '豬肉包・福滿', signCol: ['#C8202A', '#FFF4D8'], top: false, roof: 'flat' });
    food(B, 41.5, -87.4, 'buta', '豬肉包・福滿');
    // 公會奉主分館（三層的石樓、綠旗；hosubranch.js 的櫃台）
    const BX = (R.hosuBranch && R.hosuBranch.BOX) || [-47, -94, -35, -86], cx = (BX[0] + BX[2]) / 2;
    B.bld({ r: BX, h: 10.5, style: 'brick', face: 's', col: '#9A968C', top: false });
    B.box(M('woodB'), cx - 1.3, 0, BX[3] - 0.05, cx + 1.3, 2.8, BX[3] + 0.08);
    B.box(M('ashlar'), cx - 2.1, 0, BX[3], cx + 2.1, 0.24, BX[3] + 1.4);
    B.sign('公會奉主分館', 's', BX[3], cx, 3.6, { size: 0.85, bg: '#1E3A28', fg: '#F4E9CD', box: 1, lit: 1 });
    B.flag(BX[2] + 0.6, BX[3] + 0.6, 9, '#3E7A48');
    B.inter(cx, BX[3] + 1.6, 2.4, '公會奉主分館', () => (R.hosuBranch ? R.hosuBranch.enter() : R.openHub && R.openHub('guild')), '#3E7A48');
    // 站前的旅館、大樓（北通北邊）
    B.row('s', -72, -150, -54, 22, { style: 'apt' }, 16, 26, i => (i % 2 ? { style: 'office', h: rr2(B, 18, 34), name: pk2(B, ['旅館・奉主屋', '商務旅館・港', '飯店・北濱', '膠囊旅館', '居酒屋・笑福']) } : { h: 2.9 * Math.round(rr2(B, 6, 11)) }));
    B.row('s', -72, 54, 150, 22, { style: 'office' }, 16, 26, i => (i % 2 ? { h: rr2(B, 18, 34), name: pk2(B, ['商務旅館・港', '飯店・環狀', '牛丼・快', '珈琲・夜曲']) } : { style: 'glass', h: rr2(B, 20, 36) }));
    // 高架北邊的大樓（背景）
    B.row('s', -114, -158, -50, 18, { style: 'glass' }, 14, 24, () => ({ h: rr2(B, 30, 60), style: B.rnd() < 0.5 ? 'glass' : 'office' }));
    B.row('s', -114, 50, 150, 18, { style: 'office' }, 14, 24, () => ({ h: rr2(B, 30, 60), style: B.rnd() < 0.5 ? 'glass' : 'office' }));
    [-40, -22, 22, 40].forEach(x => B.tree(x, -74.5, 'round', 1.05));
  }
  const rr2 = (B, a, b) => B.rr(a, b), pk2 = (B, a) => B.pk(a);

  // ---------- 高架的環狀線 ----------
  function loopLine(B) {
    const e = 3.5, segs = [[[-166 - e, -105], [155 + e, -105]], [[155, -105 - e], [155, 72 + e]], [[155 + e, 72], [-166 - e, 72]], [[-166, 72 + e], [-166, -105 - e]]];
    const { x: cx, z: cz, hw, moat } = CASTLE, o = hw + moat;
    const skip = (x, z) => onRoad(x, z, 1.5) || inR(x, z, HALL, 1.5) || inR(x, z, CANAL, 1) || x > SEA_X - 1 || z > QUAY - 1 || inR(x, z, [cx - o, cz - o, cx + o, cz + o], 2);
    segs.forEach(p => B.viaduct(p, DECK, { w: 7, step: 15, skip }));
    B.rail(LOOP, { loop: true, y: DECK, col: '#E8782A', stripe: '#F4F0E6', cars: 4, v: 15 });
    B.rail(LOOP, { loop: true, y: DECK, col: '#E8782A', stripe: '#F4F0E6', cars: 4, v: 15, noTrack: true });
  }

  // ---------- 千燈通商店街（拱廊） ----------
  function arcade(B) {
    const M = CK.M, ARC = [['章魚燒・阿八', 'tako'], ['串炸・二度禁止', 'kushi'], ['奉主燒・鐵板屋', 'okono'], ['喫茶・青鳥', 'kissa'], ['柏青哥・大當', 'pachi'], ['魔導電器・德克斯凡', 'denki'], ['藥妝・千燈', 'drug'], ['書店・積善堂', 'books']];
    let ai = 0;
    const each = side => (i, r) => {
      const sp = ARC[ai++], name = sp ? sp[0] : B.pk(SHOPS), o = { name, h: B.rr(7, 12), vsign: B.rnd() < 0.5 ? name.split('・')[0] : null, signCol: B.pk(SIGN_COL), awning: false, roof: 'flat' };
      if (sp) {
        const cx = side === 'e' ? r[2] + 1.6 : r[0] - 1.6, cz = (r[1] + r[3]) / 2, k = sp[1];
        if (H().FOOD && H().FOOD[k]) food(B, cx, cz, k, H().FOOD[k].name);
        else if (k === 'pachi') B.inter(cx, cz, 2, '柏青哥・大當（進去玩）', () => (R.pachinko ? R.pachinko() : R.toast('今天公休。')), '#C83A3A');
        else if (k === 'denki') B.inter(cx, cz, 2, '魔導電器・德克斯凡（看看）', () => R.townTalk('魔導電器・德克斯凡', ['店裡擺滿德克斯凡製的魔導冰箱、魔導洗衣機、會自己掃地的圓盤。', pick(['「這台能洗一大桶，床單也放得下。我阿嬤來看過，嫌它用水太多。」', '「零件都是德克斯凡來的，壞了要寄回去修，等三個月。」', '「工廠買了新的魔導機，我表哥就被調去顧倉庫了。」'])]));
        else if (k === 'drug') B.inter(cx, cz, 2, '藥妝・千燈（看看）', () => R.townTalk('藥妝・千燈', ['白藤堂的驅寒茶、德克斯凡的藥膏、眼藥水、成堆的口罩。', pick(['「白藤堂的藥在奉主賣得比東鶴便宜一點。」', '「港區的人常來買喉糖。工廠的煙很嗆。」'])]));
        else if (k === 'books') B.inter(cx, cz, 2, '書店・積善堂（看看）', () => R.townTalk('書店・積善堂', ['舊書堆到天花板。', pick(['架上有一本《昭光帝國戰史》，書背燒焦了一角。', '「議會選舉的政見手冊，免費拿。四個黨都有。」', '有一本《遺跡生物圖鑑・奉主版》，跟東鶴分館的不太一樣。'])]));
      }
      return o;
    };
    B.row('e', -55, -52, -15, 12, { style: 'shop' }, 5, 8, each('e'));
    B.row('w', -45, -52, -15, 12, { style: 'shop' }, 5, 8, each('w'));
    B.row('e', -55, 5, 16, 10, { style: 'shop' }, 5, 6, each('e'));
    B.row('w', -45, 5, 16, 10, { style: 'shop' }, 5, 6, each('w'));
    // 拱廊：地面、屋頂、柱子、吊牌、入口
    const roofM = CK.mat('arcadeRoof', { col: '#D8E6EE', op: 0.32, side: 1, rough: 0.2, snow: 0 });
    [[-56, -15], [1, 16]].forEach(([za, zb]) => {
      B.plaza(-55, Math.max(za, -52), -45, zb, 'pav', { noCurb: true });
      B.box(roofM, -55, 7, za, -45, 7.15, zb);
      for (let z = za; z <= zb; z += 6) [-54.8, -45.2].forEach(x => B.box(M('steelD'), x - 0.1, 0, z - 0.1, x + 0.1, 7.2, z + 0.1));
      for (let z = za + 3; z < zb; z += 6) B.box(M('steelD'), -55, 6.95, z - 0.08, -45, 7.05, z + 0.08);
      for (let z = za + 4; z < zb - 2; z += 9) B.blade(B.pk(SHOPS).split('・')[0], -50, 5.4, z, 0, { bg: '#F4ECD8', fg: '#8A1A1A', size: 0.5 });
    });
    [-56, 16].forEach(z => { B.box(M('steelD'), -55.2, 7.2, z - 0.3, -44.8, 8.5, z + 0.3); B.sign('千燈通商店街', z < 0 ? 'n' : 's', z + (z < 0 ? -0.3 : 0.3), -50, 7.85, { size: 0.9, bg: '#8A1A1A', fg: '#FFE8B0', box: 1, lit: 1 }); });
    B.talker(-47.6, -30, -Math.PI / 2, '商店街的阿姨', ['「這家的價錢可以談，你別一開口就答應。先問問買兩個算多少。」', '「你要走到拱廊另一頭？還有一大段。我每次走到一半就忍不住買東西。」', '「章魚燒去阿八，串炸去二度禁止。其他的？看心情。」']);
    B.talker(-48, 10, Math.PI, '賣報紙的老伯', ['「號外！港區又一個外國商人被刺了……這個月第三個。」', '「四個黨都有登廣告，你要看政見翻後面。別把整疊都拿走，一份就有了。」', '「天宮海運的股票又跌了。德克斯凡的船比較快嘛。」']);
    B.steal(-46.6, -40, '摸走藥妝店門口的試用品', 'drug', () => ({ gold: 2 + Math.floor(Math.random() * 6) }), { time: 0.9 });
  }

  // ---------- 千燈通兩側、新堂町、奉主百貨 ----------
  function downtown(B) {
    const M = CK.M, sh = (o) => Object.assign({ name: B.pk(SHOPS), signCol: B.pk(SIGN_COL) }, o || {});
    B.row('n', -52, -85, -67, 10, { style: 'shop' }, 5, 9, () => sh({ h: B.rr(8, 14), vsign: B.rnd() < 0.4 ? B.pk(SHOPS).split('・')[0] : null, ad: B.rnd() < 0.4, roof: 'flat' }));
    B.row('s', -15, -85, -67, 10, { style: 'shop' }, 5, 9, () => sh({ h: B.rr(8, 13), roof: 'flat' }));
    B.row('w', -85, -42, -25, 10, { style: 'shop' }, 6, 9, () => (B.rnd() < 0.6 ? sh({ h: B.rr(7, 12), roof: 'flat' }) : { h: B.rr(7, 12), roof: 'flat' }));
    B.bld({ r: [-75, -42, -67, -25], h: 6, style: 'house', face: 's', roof: 'flat' });
    B.row('n', -52, -33, -14, 10, { style: 'shop' }, 5, 9, () => sh({ h: B.rr(10, 16), ad: B.rnd() < 0.4, roof: 'flat' }));
    B.row('s', -15, -33, -14, 10, { style: 'shop' }, 5, 9, () => sh({ h: B.rr(9, 14), roof: 'flat' }));
    B.row('e', -14, -42, -25, 10, { style: 'shop' }, 6, 9, () => (B.rnd() < 0.7 ? sh({ h: B.rr(9, 14), roof: 'flat' }) : { h: B.rr(9, 14), roof: 'flat' }));
    B.bld({ r: [-33, -42, -24, -25], h: 6, style: 'house', face: 's', roof: 'flat' });
    B.row('w', -85, 5, 16, 10, { style: 'shop' }, 5, 8, () => sh({ h: B.rr(8, 12), vsign: B.pk(SHOPS).split('・')[0], neon: 1, roof: 'flat' }));
    B.bld({ r: [-75, 5, -65, 16], h: 7, style: 'shop', face: 's', name: B.pk(SHOPS), neon: 1, roof: 'flat' });
    // 新堂町商務區
    B.row('n', -52, 14, 75, 16, { style: 'office' }, 14, 22, () => ({ h: B.rr(22, 40), style: B.rnd() < 0.5 ? 'glass' : 'office' }));
    B.row('s', -15, 14, 75, 16, { style: 'office' }, 14, 22, () => ({ h: B.rr(18, 30), style: B.rnd() < 0.4 ? 'glass' : 'office' }));
    B.bld({ r: [14, -36, 75, -31], h: 4, style: 'office', face: 's', top: false });
    ['德克斯凡商會・奉主分行', '奉主重工・本社', '昭旭鐵道・南部本部', '天宮海運'].forEach((n, i) => { const x = i % 2 ? 58 : 30, z = i < 2 ? -15 : -52; B.sign(n, i < 2 ? 's' : 'n', z, x, 3.2, { size: 0.55, bg: '#1A2030', fg: '#E8E4DA', box: 1, lit: 1 }); });
    B.talker(30, -11.7, Math.PI, '商務區的職員', ['「德克斯凡的魔導計算機進來以後，我們課從十二個人變成四個人。」', '「我們總公司在皇嶺，文件送來送去。都蓋好章了，那邊才說要改。」', '「午休只有四十五分鐘。千燈通的立食蕎麥，站著吃最快。」']);
    // 奉主百貨
    B.bld({ r: [95, -52, 128, -15], h: 26, style: 'brick', face: 's', col: '#C8BCA8', top: false });
    B.sign('奉主百貨', 's', -15, 111.5, 6.4, { size: 1.25, bg: '#5A1A2A', fg: '#FFE8B0', box: 1, lit: 1 });
    B.box(M('shopLit'), 96.5, 0.4, -15.02, 126.5, 3.4, -14.94); B.box(M('steelD'), 96, 3.4, -15, 127, 3.65, -13);
    [100, 106, 117, 123].forEach(x => B.flag(x, -14.6, 5.2, B.pk(['#C8202A', '#E8C04A', '#2E5A9A'])));
    B.talker(118, -14.4, 0, '百貨公司的店員', ['「歡迎光臨奉主百貨！地下一樓是美食街。」', '「要看德克斯凡的魔導家電嗎？今天打九折，我帶您過去。」', '「頂樓有小小的遊樂場，小孩子最喜歡。」']);
    B.bld({ r: [131, -52, 150, -15], h: 40, style: 'glass', face: 's', col: '#7A8088' });
    B.screen(130.9, 18, -34, -Math.PI / 2, 8, 12, { ads: [['奉主啤酒', '#6A3A0A', '#FFE24A', '冰的最好喝'], ['千日製菓', '#1A4AA8', '#FFFFFF', '奉主的味道'], ['天宮海運', '#0A2A4A', '#8AE0FF', '連接昭旭和世界']] });
  }

  // ---------- 燈籠堀：北岸的霓虹、大章魚、大看板、燈籠、遊覽船 ----------
  function canal(B) {
    const M = CK.M, P = B.part, g = B.g, tw = W.town, TH = THREE;
    let tako = null;
    B.row('s', 16, -35, -14, 11, { style: 'shop' }, 5, 8, (i, r) => {
      if (i === 0) { tako = r; return { name: '章魚燒・阿八', signCol: ['#C8202A', '#FFF4D8'], vsign: '章魚燒', neon: 1, h: B.rr(9, 13), roof: 'flat' }; }
      return { name: B.pk(SHOPS), signCol: B.pk(SIGN_COL), vsign: B.rnd() < 0.7 ? B.pk(SHOPS).split('・')[0] : null, neon: 1, ad: B.rnd() < 0.5, h: B.rr(9, 15), roof: 'flat' };
    });
    B.row('s', 16, 14, 75, 11, { style: 'shop' }, 5, 9, (i) => (i === 0 ? { name: '千日製菓・直營店', h: 12, signCol: ['#1A4AA8', '#FFFFFF'], roof: 'flat' } : { name: B.pk(SHOPS), signCol: B.pk(SIGN_COL), vsign: B.rnd() < 0.7 ? B.pk(SHOPS).split('・')[0] : null, neon: 1, ad: B.rnd() < 0.5, h: B.rr(10, 16), roof: 'flat' }));
    B.row('s', 16, 95, 150, 11, { style: 'shop' }, 5, 9, () => ({ name: B.pk(SHOPS), signCol: B.pk(SIGN_COL), vsign: B.rnd() < 0.6 ? B.pk(SHOPS).split('・')[0] : null, neon: 1, ad: B.rnd() < 0.5, h: B.rr(9, 15), roof: 'flat' }));
    // 霓虹的直立招牌（北岸的店面上）
    for (let x = -32; x < 150; x += 7) { if (x > -15 && x < 15 || x > 74 && x < 96) continue; B.neonSign(B.pk(SHOPS).split('・')[0], x, 6 + B.rr(0, 3), 16.6, 0, { size: 0.65 }); }
    // 大章魚（章魚燒・阿八的招牌，腳會動）
    if (tako) {
      const og = new TH.Group(), red = CK.mat('octoRed', { col: '#D83A2A', rough: 0.55, snow: 0 }), wht = CK.mat('octoEye', { col: '#FFFFFF', rough: 0.4, snow: 0 }), blk = CK.mat('octoPup', { col: '#1A1410', rough: 0.4, snow: 0 });
      const head = new TH.Mesh(g.sph, red); head.scale.set(2.4, 2.2, 1.8); head.position.y = 1.1; head.castShadow = true; og.add(head);
      [-0.45, 0.45].forEach(dx => { const e = new TH.Mesh(g.sph, wht); e.scale.setScalar(0.5); e.position.set(dx, 1.0, 0.82); og.add(e); const p = new TH.Mesh(g.sph, blk); p.scale.setScalar(0.22); p.position.set(dx, 1.0, 1.05); og.add(p); });
      const band = new TH.Mesh(g.torus, CK.mat('octoBand', { col: '#F4F0E6', rough: 0.8, snow: 0 })); band.scale.set(2.5, 2.5, 6); band.rotation.x = Math.PI / 2; band.position.y = 1.9; og.add(band);
      const legs = []; for (let k = 0; k < 6; k++) { const a = -1.2 + k * 0.48, l = new TH.Group(), c = new TH.Mesh(g.cyl, red); c.scale.set(0.38, 1.9, 0.38); c.position.y = -0.95; l.add(c); l.position.set(Math.sin(a) * 1.0, 0.25, 0.5); l.rotation.z = a * 0.8; og.add(l); legs.push(l); }
      og.position.set(tako[2] - 2.6, 5.6, 16.6); B.group.add(og);
      tw.anim.push((dt, t) => legs.forEach((l, k) => { l.rotation.x = Math.sin(t * 2 + k) * 0.35; }));
      food(B, (tako[0] + tako[2]) / 2, 17.6, 'tako', '章魚燒・阿八（燈籠堀店）');
    }
    // 招福橋邊的大看板：「奉主製菓」揮手的魔導人偶（兩張圖輪流）
    {
      const art = up => { const c = document.createElement('canvas'); c.width = 128; c.height = 96; const x = c.getContext('2d'), k = 2; x.imageSmoothingEnabled = false;
        const grd = x.createLinearGradient(0, 0, 0, 96); grd.addColorStop(0, '#1A4AA8'); grd.addColorStop(1, '#3AA8E8'); x.fillStyle = grd; x.fillRect(0, 0, 128, 96);
        x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 128, 4); x.fillRect(0, 92, 128, 4);
        const cx = 20, Pp = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px * k, py * k, w * k, h * k); };
        Pp(cx - 3, 10, 6, 6, '#F2D6B8'); Pp(cx - 3, 9, 6, 2, '#1A1410'); Pp(cx - 4, 16, 8, 10, '#E8E8E8'); Pp(cx - 4, 26, 3, 9, '#2A2A3A'); Pp(cx + 1, 26, 3, 9, '#2A2A3A');
        if (up) { Pp(cx - 8, 6, 3, 11, '#E8E8E8'); Pp(cx + 5, 6, 3, 11, '#E8E8E8'); Pp(cx - 8, 4, 3, 3, '#F2D6B8'); Pp(cx + 5, 4, 3, 3, '#F2D6B8'); }
        else { Pp(cx - 8, 16, 3, 9, '#E8E8E8'); Pp(cx + 5, 6, 3, 11, '#E8E8E8'); Pp(cx + 5, 4, 3, 3, '#F2D6B8'); Pp(cx - 8, 25, 3, 2, '#F2D6B8'); }
        Pp(cx - 5, 36, 4, 2, '#C8202A'); Pp(cx + 1, 36, 4, 2, '#C8202A');
        x.fillStyle = '#FFE24A'; x.font = 'bold 18px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('奉主製菓', 88, 32);
        x.fillStyle = '#FFFFFF'; x.font = 'bold 12px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; x.fillText('一粒三百公尺', 88, 58);
        const t = new TH.CanvasTexture(c); t.magFilter = TH.NearestFilter; t.encoding = TH.sRGBEncoding; return t; };
      const t1 = art(true), t2 = art(false), m = new TH.MeshBasicMaterial({ map: t1, toneMapped: false });
      B.box(M('steelD'), 13.6, 4.0, 15.9, 23.4, 4.3, 16.5); [14.4, 22.6].forEach(x => B.box(M('steelD'), x - 0.15, 0, 16.0, x + 0.15, 4.2, 16.3));
      const p = new TH.Mesh(new TH.PlaneGeometry(9.4, 5.6), m); p.position.set(18.5, 7.1, 16.45); B.group.add(p);
      B.box(M('steelD'), 13.6, 4.2, 16.0, 23.4, 9.95, 16.4);
      let kk = 0; tw.anim.push((dt, t) => { const k = Math.floor(t / 0.7) % 2; if (k !== kk) { kk = k; m.map = k ? t2 : t1; m.needsUpdate = true; } });
      sight(B, 18.5, 19, 'billboard', '招福橋的大看板');
    }
    // 兩岸的紅燈籠
    const lanM = CK.mat('chochinRed', { col: '#E8503A', em: '#FF6A3A', ei: 0, lamp: true, snow: 0 });   // 晚上亮（跟吉山的燈籠同一個材質）
    for (let x = -95; x < 156; x += 6) { if ([[-105, -85], [-53, -47], [-14, 14], [44, 50], [75, 95]].some(([a, b]) => x > a - 1 && x < b + 1)) continue; [21.4, 34.6].forEach(z => { P(g.box, M('steelD'), x, 1.4, z, 0.1, 2.8, 0.1); P(g.sph, lanM, x, 2.65, z, 0.55, 0.72, 0.55); B.lampAt(x, z); }); }
    sight(B, -30, 19.4, 'canal', '燈籠堀');
    B.talker(13.4, 17.8, -Math.PI / 2, '招福橋上的觀光客', ['「來奉主一定要在這裡學那個人偶舉手！」', '「燈籠堀晚上比白天漂亮十倍。」', '「我從吉山來的，吉山沒有這麼吵。」']);
    // 遊覽船：兩艘，各在兩座橋之間來回（不從橋底下過）
    const hullM = CK.mat('boatHull', { col: '#E8E4DC', rough: 0.6, snow: 0 }), cabM = CK.mat('boatCab', { col: '#3A5A8A', rough: 0.5, snow: 0 }), lampM = CK.mat('boatLamp', { col: '#FFE8B0', em: '#FFD88A', ei: 1.2, snow: 0 });
    const mk = () => { const bt = new TH.Group(), h = new TH.Mesh(g.box, hullM); h.scale.set(9, 0.9, 3); h.position.y = 0.3; bt.add(h); const c = new TH.Mesh(g.box, cabM); c.scale.set(5, 1.2, 2.4); c.position.y = 1.35; bt.add(c); for (let i = -3; i <= 3; i += 2) { const l = new TH.Mesh(g.sph, lampM); l.scale.setScalar(0.35); l.position.set(i, 2.2, 0); bt.add(l); } bt.traverse(o => { o.castShadow = true; }); return bt; };
    [[-85, -53], [95, SEA_X - 2]].forEach(([a, b], i) => { const bt = { g: mk(), lo: a + 5.5, hi: b - 5.5, x: i ? b - 6 : a + 6, d: i ? -1 : 1 }; B.group.add(bt.g); tw.anim.push((dt, t) => { bt.x += bt.d * 3 * dt; if (bt.x > bt.hi) { bt.x = bt.hi; bt.d = -1; } else if (bt.x < bt.lo) { bt.x = bt.lo; bt.d = 1; } bt.g.position.set(bt.x, -1.6 + 0.1 + Math.sin(t * 1.4 + i) * 0.05, 28); bt.g.rotation.y = bt.d > 0 ? 0 : Math.PI; }); });
    B.steal(-26.6, 17.2, '摸走章魚燒攤子上的零錢罐', 'stall', () => ({ gold: 5 + Math.floor(Math.random() * 14) }), { time: 1.3, max: 1 });
  }

  // ---------- 燈籠堀南岸：長屋町、新町 ----------
  function southBank(B) {
    B.row('n', 40, -85, -14, 8, { style: 'machiya', h: 6.2 }, 4.5, 6.5, () => (B.rnd() < 0.25 ? { name: B.pk(['豆腐店', '雜貨・丸', '酒屋', '理髮・剪', '駄菓子']) } : {}));
    B.row('n', 40, 14, 36, 8, { style: 'shop' }, 5, 8, () => ({ name: B.pk(SHOPS), signCol: B.pk(SIGN_COL), vsign: B.pk(SHOPS).split('・')[0], h: B.rr(8, 12), roof: 'flat' }));
    B.row('n', 40, 56, 75, 8, { style: 'shop' }, 5, 8, i => (i === 0 ? { name: '串炸・二度禁止', vsign: '串炸', signCol: ['#E8A020', '#1A1410'], h: 9, roof: 'flat' } : { name: B.pk(SHOPS), signCol: B.pk(SIGN_COL), vsign: B.pk(SHOPS).split('・')[0], h: B.rr(8, 12), roof: 'flat' }));
    food(B, 58.5, 38.6, 'kushi', '串炸・二度禁止（新町本店）');
    B.row('n', 40, 95, 150, 8, { style: 'shop' }, 5, 9, () => ({ name: B.pk(SHOPS), signCol: B.pk(SIGN_COL), vsign: B.rnd() < 0.7 ? B.pk(SHOPS).split('・')[0] : null, h: B.rr(8, 13), roof: 'flat' }));
    B.talker(-40, 48.6, Math.PI, '長屋町的小孩', ['「章魚燒要趁熱吃，可是會燙到舌頭！」', '「我長大要開環狀線的電車！」', '「媽媽說不能去港口那邊玩。」']);
    B.talker(56, 48.6, Math.PI, '新町的老先生', ['「奉主塔是第二代。第一代在本土城市戰的時候燒掉了。」', '「塔頂的燈白的明天晴，橘的陰，藍的下雨。比氣象台還準。」', '「將棋道場在塔的後面。要不要下一盤？」']);
    B.steal(66.6, 38.8, '偷拿串炸店門口的一串（換點零錢）', 'stall', () => ({ gold: 2 + Math.floor(Math.random() * 5) }), { time: 0.9 });
  }

  // ---------- 奉主塔：四隻腳跨在新町通上，鐵架一路收到塔頂的燈 ----------
  function tower(B) {
    const M = CK.M, P = B.part, g = B.g, cx = 46, cz = 44, h0 = 8, st = CK.mat('towerSteel', { col: '#8A9098', metal: 0.5, rough: 0.5 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { P(g.box, st, cx + sx * 5.1, h0 / 2, cz + sz * 5.1, 1.2, h0, 1.2, sz * 0.04, 0, -sx * 0.04); B.solid(cx + sx * 5.1 - 0.7, cz + sz * 5.1 - 0.7, cx + sx * 5.1 + 0.7, cz + sz * 5.1 + 0.7, 'deco'); });
    B.box(st, cx - 6, h0, cz - 6, cx + 6, h0 + 1, cz + 6);
    for (let y = h0 + 1; y < 60; y += 4) { const k = Math.max(2, 5.5 - (y - h0) * 0.06); [[-k, -k, k, -k + 0.5], [-k, k - 0.5, k, k], [-k, -k, -k + 0.5, k], [k - 0.5, -k, k, k]].forEach(q => B.box(st, cx + q[0], y, cz + q[1], cx + q[2], y + 0.5, cz + q[3])); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => P(g.box, st, cx + sx * k, y + 2, cz + sz * k, 0.4, 4, 0.4)); }
    B.box(CK.mat('towerDeck', { col: '#D8DCE0', rough: 0.4 }), cx - 5, 40, cz - 5, cx + 5, 44, cz + 5); B.box(M('shopLit'), cx - 5.05, 41, cz - 5.05, cx + 5.05, 43, cz + 5.05);   // 展望台
    const topM = CK.mat('towerTop', { col: '#FFFFFF', em: '#FFF4E0', ei: 2.2, neon: true, snow: 0 }); P(g.sph, topM, cx, 61.5, cz, 3, 3, 3); P(g.box, st, cx, 64, cz, 0.3, 5, 0.3);
    B.sign('奉主塔', 's', cz + 6.1, cx, h0 - 0.9, { size: 1.2, bg: '#0E0E14', fg: '#FFE24A', box: 1, lit: 1 }); B.sign('奉主塔', 'n', cz - 6.1, cx, h0 - 0.9, { size: 1.2, bg: '#0E0E14', fg: '#FFE24A', box: 1, lit: 1 });
    B.neon(cx - 6, h0 - 0.1, cz + 6, cx + 6, h0 + 0.05, cz + 6.1, '#FFE24A'); B.neon(cx - 6, h0 - 0.1, cz - 6.1, cx + 6, h0 + 0.05, cz - 6, '#FFE24A');
    B.foot([cx - 6, cz - 6, cx + 6, cz + 6], 'tower', 60);
    sight(B, cx - 3, cz + 7.5, 'tower', '奉主塔');
    B.inter(cx + 3, cz + 7.5, 2.2, '上奉主塔的展望台（5 費拉）', () => H().towerTop && H().towerTop(), '#E8C04A');
  }

  // ---------- 奉主城：護城河（南邊是土橋）、石垣的島、白牆的土塀、櫓門、綠瓦的天守閣 ----------
  function castle(B) {
    const M = CK.M, { x: cx, z: cz, hw, moat } = CASTLE, o = hw + moat, y1 = 4.2, gx0 = cx - 4, gx1 = cx + 4;
    // 公園的草地、城外圍的碎石（繞過護城河，不蓋到水面上）
    const q0 = cx - o - 3, q1 = cz - o - 3, q2 = cx + o + 3, q3 = cz + o + 3, pk0 = [PARK[0], PARK[1] + 4, PARK[2] - 4, PARK[3] - 4];
    [[pk0[0], pk0[1], pk0[2], q1], [pk0[0], q3, pk0[2], pk0[3]], [pk0[0], q1, q0, q3], [q2, q1, pk0[2], q3]].forEach(r => B.zone(r, 'grass', 0.02));
    [[q0, q1, q2, cz - o], [q0, cz + o, gx0, q3], [gx1, cz + o, q2, q3], [q0, cz - o, cx - o, cz + o], [cx + o, cz - o, q2, cz + o]].forEach(r => B.zone(r, 'gravel', 0.025));
    // 護城河：一個 C 字形的水面，南邊中間留土橋
    B.water([[cx - o, cz - o], [cx + o, cz - o], [cx + o, cz + o], [gx1, cz + o], [gx1, cz + hw], [cx + hw, cz + hw], [cx + hw, cz - hw], [cx - hw, cz - hw], [cx - hw, cz + hw], [gx0, cz + hw], [gx0, cz + o], [cx - o, cz + o]], { level: -1.4, bank: 'ishi', name: '奉主城的護城河' });
    // 島：石垣、土塀、四個角的櫓
    B.terrace(cx - hw, cz - hw, cx + hw, cz + hw, y1, { wall: 'ishi', top: 'gravel', open: [[gx0, cz + hw - 0.4, gx1, cz + hw + 0.4]] });
    B.ishigaki(cx - hw, cz - hw, cx + hw, cz + hw, -1.4, y1, { batter: 0.24 });
    B.dobei(cx - hw, cz - hw, cx + hw, cz + hw, y1, { gaps: [[gx0 - 0.5, cz + hw - 3, gx1 + 0.5, cz + hw + 1]] });
    [[cx - hw + 3, cz - hw + 3], [cx + hw - 3, cz - hw + 3], [cx - hw + 3, cz + hw - 3], [cx + hw - 3, cz + hw - 3]].forEach(([x, z]) => B.yagura(x, z, y1, 2, 0.75));
    // 土橋＋石階（從公園走上島）
    B.plaza(gx0, cz + hw, gx1, cz + o + 2, 'gran', { noCurb: true });
    B.stairs(gx0, cz + hw - 3, gx1, cz + hw + 3.5, 'n', 0.12, y1, { mat: 'ashlar' });
    B.Bt.yOff = y1; B.yaguraGate(cx, cz + hw - 4.5, 0, 7, 4, { d: 6, name: '大手門' }); B.Bt.yOff = 0;
    // 天守閣（綠瓦）
    B.tenshu(cx, cz - 6, y1, { w: 18, d: 14, base: 3, floors: 5, s: 0.85, roofMat: 'verdigris' });
    sight(B, cx, cz + o + 4, 'castle', '奉主城（大手門）');
    B.inter(cx, cz + 3.5, 2.4, '登上天守閣（5 費拉）', () => H().castleTop && H().castleTop(), '#E8C04A');
    B.talker(cx - 7, cz + o + 3.5, Math.PI, '城門的導覽員', ['「奉主城的石垣，最大的一塊石頭叫『章石』，一百多噸重。」', '「天守閣可以上去，五費拉。天氣好看得到奉主港。」', '「本土城市戰的時候燒掉了一半，戰後照舊圖重建的。」']);
    // 公園：松林、小路、長椅
    B.zone([cx - 2.5, cz + o + 2, cx + 2.5, 19], 'gravel', 0.03); B.zone([-140, 17, -105, 21], 'gravel', 0.03);
    B.trees([PARK[0] + 2, PARK[1] + 6, PARK[2] - 6, PARK[3] - 6], 70, () => (B.rnd() < 0.75 ? 'pine' : 'round'), 1.1, (x, z) => inR(x, z, [cx - o - 4, cz - o - 4, cx + o + 4, cz + o + 6]) || Math.abs(x + 166) < 6 || inR(x, z, [-142, 15, -103, 23]) || inR(x, z, [cx - 4, cz + o, cx + 4, 22]));
    [[-120, 19, 0], [-112, 19, 0], [-150, 30, Math.PI / 2]].forEach(([x, z, ry]) => B.bench(x, z, ry));
    B.talker(-106, 44, Math.PI / 2, '公園的老人', ['「奉主城燒掉的那年我還沒出生。我爺爺說，整片天都是紅的。」', '「天守閣重建的時候，全城的人都捐了錢。我家捐了一個月的米錢。」', '「松樹是重建那年種的，跟我差不多老。」']);
  }

  // ---------- 臨海工業區：奉主製鐵所、魔導機關工廠、奉主港 ----------
  function industry(B) {
    const M = CK.M, P = B.part, g = B.g;
    B.plaza(-172, 68, 160, 104, 'asph', { noCurb: true });
    for (let x = -170; x < SEA_X; x += 12) B.box(M('lineY'), x, 0.125, 77, x + 0.4, 0.135, QUAY - 1);
    // 奉主製鐵所
    B.bld({ r: [-148, 80, -102, 101], h: 14, style: 'factory', face: 'n', col: '#6A6E74', top: false });
    B.bld({ r: [-96, 80, -60, 99], h: 13, style: 'factory', face: 'n', col: '#727680', top: false });
    [[-148, 80, -102, 101, 14], [-96, 80, -60, 99, 13]].forEach(([x0, z0, x1, z1, h]) => { for (let x = x0 + 3; x < x1 - 2; x += 6) P(g.prism, M('corr'), x, h, (z0 + z1) / 2, 5.6, 2.2, z1 - z0, 0, 0, 0); });
    B.sign('奉主製鐵所・第一工場', 'n', 80, -125, 9, { size: 0.9, bg: '#E8E4DA', fg: '#2A3A6A', box: 1 }); B.sign('壓延工場', 'n', 80, -78, 8.5, { size: 0.9, bg: '#E8E4DA', fg: '#2A3A6A', box: 1 });
    B.furnace(-34, 90, { h: 30 });
    [[-138, 102], [-122, 102], [-70, 101], [-48, 101]].forEach(([x, z]) => B.chimney(x, z, 36, { r: 1.3 }));
    B.smoke(-125, 15, 88, { s: 6, rise: 30 }); B.smoke(-75, 14, 86, { s: 5, rise: 26 });
    B.box(M('steelD'), -100, 0, 74.6, -98, 3.2, 75.4); B.box(M('steelD'), -60, 0, 74.6, -58, 3.2, 75.4); B.sign('奉主製鐵所', 's', 75.4, -99, 3.6, { size: 0.42, bg: '#E8E4DA', fg: '#2A3A6A' });
    B.talker(-99, 70, 0, '製鐵所的工人', ['「德克斯凡的新爐子，一座頂我們十個人。廠裡說要辦『轉職訓練』……訓練完還有沒有位子，誰知道。」', '「三班制，一天二十四小時爐火不能停。」', '「港區那邊的人說，外國商人一個接一個被刺。我們這裡只怕爐子。」']);
    // 魔導機關工廠（德克斯凡合資）：白色的廠房、屋頂發藍光的魔導管線、球形槽
    B.bld({ r: [-8, 80, 38, 100], h: 11, style: 'factory', face: 'n', col: '#D8DCE0', top: false });
    for (let z = 83; z < 99; z += 5) B.neon(-6, 11.05, z, 36, 11.55, z + 0.5, '#5AC8FF');
    for (let x = -4; x < 36; x += 8) B.neon(x, 0.4, 79.85, x + 0.5, 10.6, 79.95, '#5AC8FF');
    B.sign('魔導機關工廠', 'n', 80, 15, 8, { size: 1.0, bg: '#1A2A4A', fg: '#8AE0FF', box: 1, lit: 1 }); B.sign('德克斯凡・奉主重工合資', 'n', 80, 15, 6.4, { size: 0.5, bg: '#1A2A4A', fg: '#E8E4DA' });
    [[48, 86, 6], [48, 99, 5]].forEach(([x, z, r]) => { P(g.sph, M('white'), x, r + 1, z, r * 2, r * 2, r * 2); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => P(g.box, M('steelD'), x + a * r * 0.6, (r + 1) / 2, z + b * r * 0.6, 0.4, r + 1, 0.4)); B.solid(x - r, z - r, x + r, z + r, 'house'); });
    B.chimney(10, 96, 22, { r: 1.0, smokeCol: '#A8C8E8' });
    B.talker(12, 74, 0, '工廠的技師', ['「魔導機關的核心零件還是要從德克斯凡進口，我們只能組裝。」', '「藍色的管子裡跑的是魔力，摸了會麻。別摸。」', '「合資工廠的老闆一半是德克斯凡人，開會要帶翻譯。」']);
    // 奉主港：貨櫃、起重機、貨船、岸壁
    const CC = ['#B8402A', '#2E5A8A', '#3A7A4A', '#C8A040', '#6A6A72', '#8A4A6A', '#2E7A7A'];
    for (let x = 64; x < 150; x += 13.5) for (let z = 79; z < 96; z += 3.2) { if (B.rnd() < 0.15) continue; const n = 1 + Math.floor(B.rnd() * 3); for (let k = 0; k < n; k++) P(g.box, M('corr', { col: B.pk(CC) }), x + 6, 0.12 + 1.3 + k * 2.6, z + 1.25, 12, 2.5, 2.4); B.solid(x, z, x + 12, z + 2.5, 'deco'); }
    [84, 110, 136].forEach(x => {
      [[-5, 97.5], [5, 97.5], [-5, 102.5], [5, 102.5]].forEach(([dx, z]) => { P(g.box, M('red'), x + dx, 13, z, 0.9, 26, 0.9); B.solid(x + dx - 0.5, z - 0.5, x + dx + 0.5, z + 0.5, 'deco'); });
      B.box(M('red'), x - 5.5, 24, 97, x + 5.5, 26, 103); B.box(M('red'), x - 1, 25, 92, x + 1, 26.2, 130); B.box(M('white'), x - 2, 26, 98, x + 2, 29, 102);
      P(g.box, M('steelD'), x, 18, 118, 0.1, 14, 0.1);
    });
    sight(B, 110, 100.6, 'port', '奉主港（起重機）');
    { const sx = 78, sz = 112; B.box(M('paint', { col: '#2A2A34' }), sx, -1.6, sz, sx + 72, 5, sz + 13); B.box(M('paint', { col: '#8A2A24' }), sx, -1.6, sz, sx + 72, 0.2, sz + 13); B.box(M('white'), sx + 58, 5, sz + 2, sx + 70, 13, sz + 11); B.box(M('glass'), sx + 58.5, 10.5, sz + 1.9, sx + 69.5, 12, sz + 11.1);
      for (let k = 0; k < 8; k++) P(g.box, M('corr', { col: B.pk(CC) }), sx + 6 + k * 6.4, 6.3, sz + 6.5, 6, 2.6, 9);
      B.chimney(sx + 64, sz + 6.5, 18, { r: 0.9 }); }
    B.box(M('concD'), -172, -0.4, QUAY - 0.5, SEA_X, 0.12, QUAY);
    for (let x = -168; x < SEA_X; x += 10) P(g.cyl8, M('black'), x, 0.4, QUAY - 1, 0.5, 0.6, 0.5);
    B.talker(100, 74, 0, '港口的工人', ['「從這裡出港的船，一半開往德克斯凡。」', '「這櫃重量對不上，先別吊。把單子拿來，我再核一次。」', '「起重機的駕駛座離地二十五公尺，冬天的風會把人吹透。」']);
    B.steal(66.4, 77.6, '從貨櫃的縫裡摸走一包零件', 'parts', () => ({ gift: 'parts', n: 1 }), { time: 1.6, max: 1 });
  }

  // ---------- 街上的東西：路樹、路燈、販賣機、說話的人 ----------
  function street(B) {
    for (let z = -48; z < 50; z += 8) { if (z > -16 && z < 4 || z > 12 && z < 42) continue; [-13.4, 13.4].forEach(x => B.tree(x, z, 'round', 1.0)); }
    [[-140, 150, -55.4, Math.PI], [-140, 150, -68.6, 0], [-88, 150, -11.6, 0], [-88, 150, 1.6, Math.PI], [-140, 150, 51.4, 0], [-140, 150, 64.6, Math.PI]].forEach(([a, b, z, ry]) => { for (let x = a; x < b; x += 22) { if (ROADS.some(r => r[2] - r[0] < r[3] - r[1] && x > r[0] - 6 && x < r[2] + 6) || inR(x, z, [-56, -60, -44, 20])) continue; B.lamp(x, z, ry); } });
    for (let z = -48; z < 48; z += 9) { const x = (z / 9) % 2 ? 10.6 : -10.6; if (z > 14 && z < 42 || ROADS.some(r => r[4] !== "奉主大通" && inR(x, z, r, 4.5))) continue; B.lamp(x, z, x < 0 ? Math.PI / 2 : -Math.PI / 2); }
    [[-60, -52.6, Math.PI], [-40, 4.4, Math.PI], [20, -52.6, Math.PI], [100, 4.4, Math.PI], [-30, 48.6, 0], [70, 48.6, 0], [-13.2, -80, Math.PI / 2]].forEach(([x, z, ry]) => B.vend(x, z, ry, B.pk(['#C83A3A', '#2E5A8A', '#E8E4DC', '#3A7A4A'])));
    B.mailbox(-13, -40); B.mailbox(13, 30);
    B.talker(-3, -86, Math.PI, '趕車的上班族', ['「奉主人走路快。電扶梯站右邊，左邊是給趕時間的人走的。」', '「環狀線一圈四十分鐘。我上次睡過站，醒來又回到奉主站。」', '「東鶴的鐘慢三分鐘？難怪東鶴人都不急。」']);
  }

  // ---------- 路人、車 ----------
  function people(B) {
    [[[-140, -70.5], [140, -70.5]], [[-140, -53.8], [-14, -53.8]], [[14, -53.8], [150, -53.8]], [[-87, -13.5], [-14, -13.5]], [[14, -13.5], [150, -13.5]], [[-87, 3.2], [-14, 3.2]], [[14, 3.2], [150, 3.2]],
      [[-12.2, -66], [-12.2, 48]], [[12.2, -66], [12.2, 48]], [[-50, -54], [-50, 15]], [[-95, 19], [150, 19]], [[-85, 37], [150, 37]], [[-140, 50.2], [150, 50.2]], [[-140, 66], [150, 66]],
      [[-30, -90], [30, -90]], [[-45, -78], [45, -78]], [[-87, -54], [-87, 50]], [[77, -54], [77, 50]], [[93, -54], [93, 50]], [[-103, -60], [-103, 18]]].forEach(p => B.walk(p, Math.max(2, Math.round(Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) / 22))));
    B.route([[-4, -62], [-4, 58], [82, 58], [82, -62]], 4);
    B.route([[4, -59], [4, 55], [-95, 55], [-95, -59]], 4);
    B.route([[-95, -8], [150, -8], [150, -2], [-95, -2]], 3);
    B.route([[-145, -65], [150, -65], [150, -59], [-145, -59]], 3);
    B.route([[-145, 55], [150, 55], [150, 61], [-145, 61]], 3, { kinds: ['truck', 'truck', 'car'] });
  }

  // ---------- 接上：搭電車來、從奉主分館出發的遺跡回來 ----------
  R.goHosu = () => { const s = S(); s.gold = Math.max(0, s.gold - FARE); s.hosuVisits = (s.hosuVisits || 0) + 1; R.save(); R.closeSheet(); R.fade(() => CK.enter('hosu')); };
  R.hosuEnter = () => CK.enter('hosu');
  R.inHosu = () => !!(W.town && (W.town.hosu || W.town.ck === 'hosu'));
  // 暫停選單：多一顆「奉主觀光手冊」（hosu.js 的）
  const sh0 = R.sheet;
  R.sheet = (...a) => {
    const r = sh0(...a);
    if (W.town && W.town.ck === 'hosu' && !W.town.room && $('ck-book') && !$('hz-book')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'hz-book'; b.textContent = '奉主觀光手冊'; b.onclick = () => H().book && H().book(); $('ck-book').insertAdjacentElement('beforebegin', b); }
    return r;
  };
  void esc;
})(window.R);
