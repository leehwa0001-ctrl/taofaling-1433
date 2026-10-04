// 奉主（作者 2026-10-04：奉主對標的是現實的大阪，比較工業化現代的城市）
// 昭旭聯合王國的陪都之一（作者的《國家簡介》：首都皇嶺，陪都東鶴、吉山、奉主），在主島南部中央、東鶴的西南。
// 在東鶴站的售票口買車票（單程 60 費拉）搭魔導電車過來；回去在奉主站買。錢不夠也讓你上車（勇者先上車、下次補票）。
// 奉主是另外一個場景（不用 city.js 的東鶴地圖）：
//   北邊：奉主站（終點站，月台在高架上）、站前廣場；高架的「奉主環狀線」繞著城，橘色的電車一直在跑。
//   中間：千燈通商店街（有拱廊）、新堂町商務區的大樓、奉主百貨；燈籠堀（運河）兩岸是霓虹招牌、紅燈籠、大章魚、
//         招福橋邊「奉主製菓」揮手的魔導人偶大看板；運河上有遊覽船。
//   西邊：奉主城（護城河、石垣、城門、天守閣）和公園；南邊：長屋町、新町和奉主塔。
//   最南邊：臨海工業區——奉主製鐵所（廠房、高爐、煙囪）、魔導機關工廠（德克斯凡合資，藍色的魔導管線、球形槽）、奉主港（貨櫃、起重機、貨船）。
// 走路、鏡頭、互動、隊友用城裡（town.js）的那一套：W.town.hosu 標記是奉主；townStep、townHud、小地圖、大地圖、選單在奉主的時候換成這個檔案的
// （東鶴的那些包裝——路人、車、犯罪、導航——都不會在奉主跑）。
// 觀光章六個（蓋齊：800 費拉、稱號「奉主通」）；小吃（章魚燒、串炸、奉主燒、喫茶、豬肉包）和東鶴的餐廳一樣，吃了當天下遺跡有加成（R.S.buff）。
// 這個檔案要放在 index.html 的最後面（所有包住 townStep、townHud、townMenu、bigMap 的檔案之後）。
(function (R) {
  const W = R.W, T = () => THREE, $ = id => document.getElementById(id), esc = s => R.esc(s), S = () => R.S;
  const FARE = 60;
  let seed = 2836;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const rr = (a, b) => a + (b - a) * rnd(), pk = a => a[Math.floor(rnd() * a.length)], pick = a => a[Math.floor(Math.random() * a.length)];

  // ---------- 地圖（世界座標，公尺；北是 -z） ----------
  const X0 = -172, X1 = 160, Z0 = -136, Z1 = 104;        // 走得到的範圍
  const GX0 = -200, GX1 = 200, GZ0 = -170, GZ1 = 170, PPM = 3;   // 地面的畫布：每公尺 3 個像素
  const ROADS = [[-150, -68, 158, -56, '北通'], [-101, -11, 158, 1, '中通'], [-150, 52, 158, 64, '南通'], [-10, -68, 10, 64, '奉主大通'], [-101, -68, -89, 64, '西大通'], [79, -68, 91, 64, '東大通']];
  const CANAL = [-114, 22, 200, 34];   // 燈籠堀：西邊從護城河出來，東邊流進海
  const BRIDGES = [[-101, -85, '西橋', 1], [-53, -47, '千燈橋'], [-14, 14, '招福橋', 1], [44, 50, '新町橋'], [75, 95, '東橋', 1]];   // 車道的橋連人行道一起
  const PARK = [-172, -56, -101, 52];
  const CASTLE = { x: -134, z: -6, wall: 16, moat: 7 };   // 城牆（正方形，半邊 wall）、護城河寬
  const PLAZA = [-50, -94, 50, -68];
  const HALL = [-45, -112, 45, -94];   // 奉主站的站房（月台在上面的高架）
  const ARCADE = [-55, -56, -45, 16];
  const QUAY = 104, SEA_X = 160;
  const LOOP = [[-166, -105], [155, -105], [155, 72], [-166, 72]];   // 奉主環狀線（高架，繞一圈）
  const DECK = 9;   // 高架的高度
  const inR = (x, z, r, m) => x > r[0] - (m || 0) && x < r[2] + (m || 0) && z > r[1] - (m || 0) && z < r[3] + (m || 0);
  const onRoad = (x, z, m) => ROADS.some(r => inR(x, z, r, m || 0));

  // 地名（狀態列、大地圖）
  const AREAS = [
    ['奉主站', HALL], ['站前廣場', PLAZA], ['千燈通商店街', ARCADE], ['奉主城', [-158, -30, -110, 18]], ['奉主城公園', PARK],
    ['新堂町商務區', [10, -56, 79, -11]], ['奉主百貨前', [91, -56, 160, -11]], ['燈籠堀・招福橋', [-12, 14, 12, 42]], ['燈籠堀', [-114, 14, 200, 42]],
    ['長屋町', [-89, 42, -10, 52]], ['新町・奉主塔', [10, 42, 160, 52]], ['奉主製鐵所', [-172, 64, -26, 110]], ['魔導機關工廠', [-26, 64, 60, 110]], ['奉主港', [60, 64, 200, 140]],
    ['站北', [-172, -140, 160, -94]], ['北通', [-172, -72, 160, -52]], ['中通', [-101, -15, 160, 5]], ['南通', [-172, 48, 160, 68]], ['奉主大通', [-14, -68, 14, 64]]
  ];
  const areaAt = (x, z) => (AREAS.find(a => inR(x, z, a[1])) || ['奉主'])[0];

  // ---------- 觀光章 ----------
  const SIGHTS = [
    ['station', '奉主站', '站前廣場', '昭旭南部最大的車站。魔導電車、環狀線、往港區的貨運線都在這裡交會，一天進出的人比整個東鶴的人還多。站前的鐘一分不差——奉主人說，東鶴的鐘慢三分鐘，是因為東鶴人不趕時間。'],
    ['castle', '奉主城', '奉主城公園', '昭光帝國時代的城。2646 年本土被登陸、打城市戰的時候燒掉了一半，天守閣是戰後照舊圖重建的。石垣的大石頭是從北邊的山裡一塊一塊運來的，最大的一塊有一百多噸。'],
    ['billboard', '招福橋的大看板', '燈籠堀・招福橋', '「奉主製菓」揮手的魔導人偶，從戰後掛到現在，燈換過五次。來奉主的人都要在招福橋上學它舉手。'],
    ['canal', '燈籠堀', '燈籠堀', '兩岸掛滿紅燈籠和霓虹招牌的運河。白天是運貨的小船，晚上是遊覽船；掉進河裡的東西，據說隔天會在港口撈到。'],
    ['tower', '奉主塔', '新町', '新町的鐵塔，戰後重建的第二代。塔頂的燈照明天的天氣變顏色：白是晴、橘是陰、藍是雨。塔底下的串炸店，醬汁禁止沾兩次。'],
    ['port', '奉主港', '臨海工業區', '昭旭南部最大的港。一半的船開往德克斯凡，載回來的是魔導機關的零件，運出去的是鋼材和昭旭的米。起重機日夜不停。']
  ];
  R.HOSU_SIGHTS = SIGHTS;
  R.addTitle && R.addTitle(['hosutsu', '奉主通', '在奉主的每一個觀光景點蓋了觀光章', '委託報酬 +2%', { pay: 0.02 }]);
  const stamps = () => { const s = S(); s.hosuSights = s.hosuSights || {}; return s.hosuSights; };
  const visit = id => {
    const sg = SIGHTS.find(v => v[0] === id), g = stamps(), first = !g[id], n0 = Object.keys(g).length;
    if (first) { g[id] = S().day || 1; R.save(); R.sfx && R.sfx('pick'); }
    const n = Object.keys(g).length;
    R.sheet('<p class="kicker">奉主・' + esc(sg[2]) + '</p><h2>' + esc(sg[1]) + '</h2><p>' + esc(sg[3]) + '</p><p class="note">' + (first ? '在奉主觀光手冊上蓋了章。' : '這裡的章已經蓋過了。') + '（' + n + '／' + SIGHTS.length + '）</p>',
      '<div class="row"><button type="button" class="btn pri" id="hv-x">好</button><button type="button" class="btn" id="hv-book">奉主觀光手冊</button></div>');
    $('hv-x').onclick = R.closeSheet; $('hv-book').onclick = book;
    if (first && n >= SIGHTS.length && n0 < SIGHTS.length) { S().gold += 800; R.save(); R.awardTitle && R.awardTitle('hosutsu'); setTimeout(() => R.banner && R.banner('奉主的觀光章蓋齊了！', '奉主觀光局送來 800 費拉和稱號「奉主通」。'), 600); }
  };
  const book = () => {
    const g = stamps();
    R.sheet('<p class="kicker">奉主觀光局</p><h2>奉主觀光手冊</h2><p class="note">走到景點按空白鍵就能蓋章。蓋齊 ' + SIGHTS.length + ' 個：800 費拉和稱號「奉主通」。</p><ul class="sg-list">'
      + SIGHTS.map(sg => '<li class="' + (g[sg[0]] ? 'ok' : '') + '"><b>' + (g[sg[0]] ? '✓ ' : '・') + esc(sg[1]) + '</b><small>' + esc(sg[2]) + '</small></li>').join('') + '</ul>',
      '<div class="row"><button type="button" class="btn pri" id="hb-x">關上</button></div>');
    $('hb-x').onclick = R.closeSheet;
  };

  // ---------- 小吃（和東鶴的餐廳同一套加成） ----------
  const FOOD = {
    tako: { name: '章魚燒・阿八', say: '「剛起鍋的，小心燙！」', menu: [['章魚燒（八顆）', 8, '外皮微脆，裡面的麵糊還很燙，咬之前最好先吹一下', { hp: 0.05 }], ['高湯章魚燒', 10, '軟軟的，沾著昆布高湯吃', { mp: 0.05, hp: 0.03 }]] },
    kushi: { name: '串炸・二度禁止', say: '「醬汁只能沾一次！要多沾，用高麗菜舀。」', menu: [['串炸拼盤（十串）', 14, '牛肉、蓮藕、鵪鶉蛋、紅薑……', { dmg: 0.05 }], ['土手燒', 9, '味噌燉牛筋，燉了一整天', { hp: 0.04, regen: 0.15 }]] },
    okono: { name: '奉主燒・鐵板屋', say: '「翻面的時候要一口氣！」', menu: [['豬肉奉主燒', 13, '高麗菜和麵糊在鐵板上煎成大圓餅，刷醬、撒柴魚', { hp: 0.07 }], ['炒麵奉主燒', 15, '中間夾一層炒麵，分量加倍', { hp: 0.06, regen: 0.2 }]] },
    kissa: { name: '喫茶・青鳥', say: '「早上十一點以前，吐司套餐附水煮蛋。」', menu: [['混合果汁', 6, '香蕉、蘋果、牛奶打的，奉主的喫茶店一定有', { mp: 0.06 }], ['厚片吐司套餐', 9, '奶油厚片配熱咖啡', { skillCd: 0.04 }]] },
    buta: { name: '豬肉包・福滿', say: '「兩個一盒！冷了用蒸的最好吃。」', menu: [['豬肉包（兩個）', 7, '站前排隊的那一家，皮甜、餡多', { hp: 0.04, mp: 0.03 }]] }
  };
  const eat = id => {
    const f = FOOD[id], s = S();
    R.sheet('<p class="kicker">奉主的小吃</p><h2>' + esc(f.name) + '</h2><p>' + esc(f.say) + '</p><p class="note">吃了之後，今天下遺跡有加成（和東鶴的餐廳一樣，一天算最後吃的那一餐）。費拉 ' + s.gold + '</p><div class="dn-menu">'
      + f.menu.map((m, i) => '<button type="button" class="btn" data-hf="' + i + '"' + (s.gold < m[1] ? ' disabled' : '') + '><b>' + esc(m[0]) + '</b>　' + m[1] + ' 費拉<br><small>' + esc(m[2]) + '</small></button>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn pri" id="hf-x">不吃了</button></div>');
    $('hf-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-hf]').forEach(b => { b.onclick = () => { const m = f.menu[+b.dataset.hf]; if (s.gold < m[1]) return; s.gold -= m[1]; s.buff = { kind: 'food', b: m[3], until: s.day }; R.save(); R.sfx && R.sfx('coin'); R.closeSheet(); R.toast('吃了' + m[0] + '。今天下遺跡有加成。', '#E8C04A'); }; });
  };

  // ---------- 材質、貼圖 ----------
  const mats = {}, texs = {};
  const lam = (c, o) => {
    o = o || {}; const k = c + '|' + JSON.stringify(o); if (mats[k]) return mats[k];
    const TH = T(), m = new TH.MeshLambertMaterial({ color: c }); m.color.convertSRGBToLinear();
    if (o.em) { m.emissive.set(o.em); m.emissive.convertSRGBToLinear(); m.emissiveIntensity = o.ei == null ? 0.9 : o.ei; }
    if (o.op) { m.transparent = true; m.opacity = o.op; m.depthWrite = false; }
    if (!o.em && o.tex) { m.map = R.pixTex(o.tex); R.worldUV(m, m.map.image.width); }
    if (o.see) R.seeThrough(m);
    m.userData.shared = true;
    return (mats[k] = m);
  };
  // 招牌的字（一個字 24 個點陣像素）：vert 直的
  const signTex = (txt, bg, fg, vert) => {
    const k = txt + '|' + bg + '|' + fg + '|' + (vert ? 1 : 0); if (texs[k]) return texs[k];
    const ch = [...txt], n = ch.length, cw = 24;
    const t = R.pixCanvasTex(vert ? cw + 8 : n * cw + 12, vert ? n * cw + 10 : cw + 10, (g, W0, H0) => {
      g.fillStyle = bg; g.fillRect(0, 0, W0, H0); g.strokeStyle = fg; g.globalAlpha = 0.55; g.lineWidth = 2; g.strokeRect(2, 2, W0 - 4, H0 - 4); g.globalAlpha = 1;
      g.fillStyle = fg; g.font = 'bold 20px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      ch.forEach((c, i) => vert ? g.fillText(c, W0 / 2, 5 + cw * i + cw / 2 + 1) : g.fillText(c, 6 + cw * i + cw / 2, H0 / 2 + 1));
    });
    t.minFilter = T().LinearFilter; t.userData.shared = true; return (texs[k] = t);
  };
  const signMat = (txt, bg, fg, vert) => { const k = 'sm|' + txt + bg + fg + (vert ? 1 : 0); if (mats[k]) return mats[k]; const m = new (T().MeshBasicMaterial)({ map: signTex(txt, bg, fg, vert) }); m.userData.shared = true; return (mats[k] = m); };

  // ---------- 名字 ----------
  const SHOPS = ['拉麵・赤鬼', '居酒屋・笑福', '烏龍麵・千燈', '壽司・港鮨', '燒肉・鐵火', '珈琲・夜曲', '藥妝・千燈', '二手衣・古着屋', '遊樂場・星光', '卡拉OK・歌聲', '螃蟹料理・蟹宴', '河豚・福壽', '當舖', '眼鏡・光', '鞋店・步', '和菓子・月', '書店・積善堂', '金券行', '牛丼・快', '旅館・奉主屋', '湯屋・千代之湯', '彈珠台', '將棋道場', '立食蕎麥', '餃子・王將軍', '鯛魚燒', '魔導零件行', '五金・鐵太郎', '印章・篆', '花店・浪', '服飾・千日', '茶葉・宇治丸', '理髮・剪', '洋菓子・白鳩', '炸豬排・勝'];
  const ADS = ['奉主啤酒', '天宮海運', '昭旭鐵道', '白藤堂製藥', '魔導燈具工業', '德克斯凡商會', '奉主重工', '東鶴電力', '千日製菓', '德克斯凡礦務'];
  const SIGN_COL = [['#C8202A', '#FFF4D8'], ['#1A2A6A', '#FFE24A'], ['#0E0E14', '#FF5AB8'], ['#0E0E14', '#5AE8FF'], ['#F4E8C8', '#8A1A1A'], ['#2A6A3A', '#FFFFFF'], ['#E8A020', '#1A1410'], ['#5A1A6A', '#FFE8FF'], ['#0E0E14', '#FFD24A']];
  const WALL = { shop: ['#C8B8A0', '#B0A898', '#D8CCB4', '#A89480', '#C0B0A8', '#9AA0A8', '#D4C4A8'], neon: ['#3A3A44', '#4A4248', '#5A5048', '#2E3440', '#6A5A50'], office: ['#8A9098', '#9AA4AE', '#7A8088', '#A8ACB0', '#6E7882'], hotel: ['#B8B0A4', '#A0A4A8', '#C8C0B4', '#8C9094'], tall: ['#7A8088', '#8E969E', '#6A727A', '#A0A6AC'], old: ['#5A4434', '#6A5040', '#4E3C2E'], retro: ['#8A6A5A', '#6A5A6A', '#5A6A6A', '#9A7A5A'], dept: ['#C8BCA8'] };
  const LIT = { shop: 0.35, neon: 0.55, office: 0.4, hotel: 0.5, tall: 0.45, old: 0.4, retro: 0.5, dept: 0.6 };

  // ---------- 蓋 ----------
  const G = {};
  const geos = () => {
    if (G.box) return G; const TH = T();
    G.box = new TH.BoxGeometry(1, 1, 1); G.cyl = new TH.CylinderGeometry(0.5, 0.5, 1, 10); G.sph = new TH.SphereGeometry(0.5, 10, 7); G.cone = new TH.ConeGeometry(0.5, 1, 8);
    const sh = new TH.Shape([new TH.Vector2(-0.5, 0), new TH.Vector2(0.5, 0), new TH.Vector2(0, 1)]), pr = new TH.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); pr.translate(0, 0, -0.5); G.prism = pr;
    Object.values(G).forEach(g => { g.userData.shared = true; });
    return G;
  };

  const build = scene => {
    const TH = T(), g3 = geos(), group = new TH.Group(), tw = W.town; seed = 2836;
    R.col = { list: [], cells: new Map() };
    Object.assign(tw, { inter: [], npcs: [], cars: [], trains: [], fx: [], smokes: [], neon: [], pool: [], foot: [] });
    const B = R.Batch();
    const add = (geo, m, x, y, z, sx, sy, sz, rx, ry, rz) => B.add(geo, m, x, y, z, sx, sy, sz, rx, ry, rz);
    const cube = (m, x0, y0, z0, x1, y1, z1) => add(g3.box, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    const block = (x0, x1, z0, z1, tag) => R.addBox(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1), tag || 'house');
    const inter = (x, z, r, label, act, icon) => { const it = { x, z, r, label, act, icon }; tw.inter.push(it); return it; };
    const plane = (m, w, h, x, y, z, ry) => { const p = new TH.Mesh(new TH.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = ry || 0; group.add(p); return p; };
    // 面向：s 朝南（+z）、n 朝北、e 朝東（+x）、w 朝西
    const FACE = { s: [0, 0, 1], n: [Math.PI, 0, -1], e: [Math.PI / 2, 1, 0], w: [-Math.PI / 2, -1, 0] };
    const onFace = (f, c, a, off) => f === 's' || f === 'n' ? [a, c + FACE[f][2] * off] : [c + FACE[f][1] * off, a];
    const sign = (txt, f, c, a, y, o) => {   // 貼在牆面上的招牌
      o = o || {}; const col = o.col || pk(SIGN_COL), vert = !!o.vert, n = [...txt].length, ch = o.ch || 0.7;
      const w = vert ? ch + 0.2 : n * ch + 0.3, h = vert ? n * ch + 0.25 : ch + 0.25, [px, pz] = onFace(f, c, a, 0.07);
      const m = signMat(txt, col[0], col[1], vert), p = plane(m, w, h, px, y, pz, FACE[f][0]);
      if (o.flicker) tw.neon.push({ m: p, ph: rnd() * 10 });
      return p;
    };
    const M = {
      glass: lam('#2E3A48', { tex: 0 }), litW: lam('#F2DCA0', { em: '#F2DCA0', ei: 0.55 }), litC: lam('#BFE0F0', { em: '#BFE0F0', ei: 0.45 }), shopLit: lam('#FFE8B8', { em: '#FFE0A0', ei: 0.7 }),
      roof: lam('#5A5A60', { tex: 'cap', see: 1 }), roofL: lam('#7A7A80', { tex: 'cap', see: 1 }), ac: lam('#C8CCD0', { tex: 0 }), tank: lam('#8A9AA8', { tex: 0 }),
      steel: lam('#4A4E56', { tex: 0 }), steelL: lam('#7A8088', { tex: 0 }), conc: lam('#9A968E', { tex: 'cap', see: 1 }), concD: lam('#7E7A72', { tex: 'cap' }),
      rail: lam('#2A2A30', { tex: 0 }), wood: lam('#5A4030', { tex: 'planks' }), stone: lam('#8A8478', { tex: 'stone', see: 1 }), white: lam('#EDE8DC', { tex: 'plaster', see: 1 }),
      green: lam('#4E7A6A', { tex: 0, see: 1 }), gold: lam('#E8C04A', { em: '#8A6A1A', ei: 0.4 }), tile: lam('#3A3E48', { tex: 0, see: 1 }), trunk: lam('#4A3828', { tex: 0 }),
      ginkgo: lam('#E8C048', { tex: 0 }), pine: lam('#3E5A3E', { tex: 0 }), lamp: lam('#2E3036', { tex: 0 }), lampH: lam('#FFF0C8', { em: '#FFF0C8', ei: 1 }),
      lantern: lam('#FF5A3A', { em: '#FF4A2A', ei: 0.9 }), fence: lam('#5A5E66', { tex: 0 }), water: lam('#4A7A98', { op: 0.5 }), arcadeRoof: lam('#D8E6EE', { op: 0.35, see: 1 }),
      orange: lam('#E8782A', { tex: 0, see: 1 }), roofs: ['#6A6A70', '#7A7468', '#5E6670', '#8A8478', '#6E6258', '#585C62', '#7E8A86'].map(c => lam(c, { tex: 'cap', see: 1 })), awning: ['#C83A3A', '#3A6A8A', '#E8A03A', '#3E7A48', '#8A3A6A', '#E8E4DC'].map(c => lam(c, { tex: 0 })),
      blue: lam('#5AC8FF', { em: '#3AA8FF', ei: 1 }), rust: lam('#7A4A36', { tex: 0 }), fire: lam('#FF8A3A', { em: '#FF6A1A', ei: 1 }), red: lam('#C8402A', { tex: 0 }), whiteP: lam('#E8E8E4', { tex: 0 })
    };

    // ---------- 建築 ----------
    // r：[x0, z0, x1, z1]；f：正面朝哪；st：風格；o.name 有店名就掛招牌、亮店面
    const bld = (r, h, st, f, o) => {
      o = o || {}; const [x0, z0, x1, z1] = r, wcol = o.col || pk(WALL[st] || WALL.shop);
      const wm = lam(wcol, { tex: st === 'old' ? 'planks' : st === 'office' || st === 'tall' || st === 'hotel' ? 'cap' : 'plaster', see: 1 });
      if (st === 'old') { cube(wm, x0, 0, z0, x1, h, z1); const ew = f === 'n' || f === 's'; add(g3.prism, M.tile, (x0 + x1) / 2, h, (z0 + z1) / 2, (ew ? z1 - z0 : x1 - x0) + 0.8, 2.2, (ew ? x1 - x0 : z1 - z0) + 0.2, 0, ew ? Math.PI / 2 : 0, 0); }
      else cube(wm, x0, 0, z0, x1, h, z1);
      block(x0, x1, z0, z1);
      tw.foot.push([x0, z0, x1, z1, st]);
      // 窗：大樓一層一條，小樓一個一個（24 公尺以上看不到，不做）
      const fl = st === 'old' ? 2.8 : 3.6, top = Math.min(h - 1, 24), band = /office|tall|hotel|dept/.test(st);
      [['s', z1, x0, x1], ['n', z0, x0, x1], ['e', x1, z0, z1], ['w', x0, z0, z1]].forEach(([fc, c, a0, a1]) => {
        const len = a1 - a0; if (len < 2.5) return;
        const shopF = o.name && fc === f, start = shopF || st === 'shop' || st === 'neon' || st === 'retro' ? 1 : 0;
        for (let i = start; 1.6 + i * fl + 1.4 < top; i++) {
          const y = 1.6 + i * fl + 0.8;
          if (band) { const m = rnd() < LIT[st] ? (rnd() < 0.6 ? M.litW : M.litC) : M.glass; if (fc === 's' || fc === 'n') add(g3.box, m, (a0 + a1) / 2, y, c + (fc === 's' ? 0.05 : -0.05), len - 1, fl * 0.55, 0.1); else add(g3.box, m, c + (fc === 'e' ? 0.05 : -0.05), y, (a0 + a1) / 2, 0.1, fl * 0.55, len - 1); }
          else { const n = Math.max(1, Math.floor(len / 3.2)); for (let k = 0; k < n; k++) { const a = a0 + (k + 0.5) * len / n, m = rnd() < LIT[st] ? M.litW : M.glass; if (fc === 's' || fc === 'n') add(g3.box, m, a, y, c + (fc === 's' ? 0.05 : -0.05), 1.3, 1.3, 0.1); else add(g3.box, m, c + (fc === 'e' ? 0.05 : -0.05), y, a, 0.1, 1.3, 1.3); } }
        }
      });
      // 屋頂：女兒牆、冷氣、水塔、廣告看板
      if (st !== 'old') {
        cube(pk(M.roofs), x0 + 0.3, h, z0 + 0.3, x1 - 0.3, h + 0.08, z1 - 0.3);
        const pm = h > 20 ? M.roofL : M.roof; cube(pm, x0, h, z0, x1, h + 0.6, z0 + 0.3); cube(pm, x0, h, z1 - 0.3, x1, h + 0.6, z1); cube(pm, x0, h, z0, x0 + 0.3, h + 0.6, z1); cube(pm, x1 - 0.3, h, z0, x1, h + 0.6, z1);
        const na = Math.floor(rr(0, 3.5)); if (x1 - x0 > 4 && z1 - z0 > 4) for (let i = 0; i < na; i++) add(g3.box, M.ac, rr(x0 + 1.5, x1 - 1.5), h + 0.5, rr(z0 + 1.5, z1 - 1.5), 1.4, 1, 1);
        if (rnd() < 0.3 && x1 - x0 > 6) add(g3.cyl, M.tank, rr(x0 + 2, x1 - 2), h + 1.6, rr(z0 + 2, z1 - 2), 2, 3.2, 2);
        if (o.ad && h < 16 && f === 's') { const ad = pk(ADS), w = Math.min(x1 - x0 - 1, [...ad].length * 1.1 + 1); cube(M.steel, (x0 + x1) / 2 - w / 2, h, z1 - 1.2, (x0 + x1) / 2 + w / 2, h + 0.3, z1 - 0.9); sign(ad, 's', z1 - 1.0, (x0 + x1) / 2, h + 1.6, { ch: Math.min(1.1, (w - 0.3) / [...ad].length), flicker: rnd() < 0.3 }); }
      }
      // 店面：一樓亮著的玻璃、雨遮、招牌；直立的霓虹招牌
      if (o.name) {
        const fc = f, c = fc === 's' ? z1 : fc === 'n' ? z0 : fc === 'e' ? x1 : x0, a0 = fc === 's' || fc === 'n' ? x0 : z0, a1 = fc === 's' || fc === 'n' ? x1 : z1, len = a1 - a0, mid = (a0 + a1) / 2, sgn = fc === 's' || fc === 'e' ? 1 : -1;
        if (fc === 's' || fc === 'n') { add(g3.box, M.shopLit, mid, 1.4, c + sgn * 0.05, len - 1, 2.4, 0.1); add(g3.box, pk(M.awning), mid, 2.95, c + sgn * 0.6, len - 0.4, 0.15, 1.2, sgn * 0.18, 0, 0); }
        else { add(g3.box, M.shopLit, c + sgn * 0.05, 1.4, mid, 0.1, 2.4, len - 1); add(g3.box, pk(M.awning), c + sgn * 0.6, 2.95, mid, 1.2, 0.15, len - 0.4, 0, 0, -sgn * 0.18); }
        const nm = o.name, chs = Math.min(0.72, (len - 0.6) / ([...nm].length + 0.4));
        sign(nm, fc, c, mid, 3.75, { ch: chs, col: o.col2, flicker: st === 'neon' && rnd() < 0.25 });
        if (o.vsign && h > 7) sign(o.vsign, fc, c, a1 - (fc === 's' || fc === 'w' ? 0.7 : len - 0.7), 4.6 + [...o.vsign].length * 0.32, { vert: 1, ch: 0.6, flicker: rnd() < 0.35 });
        // 拱廊裡：掛在走道上、朝南北的吊牌（鏡頭看得到）
        if (o.hang) { const hx = c + sgn * 1.6; [0, Math.PI].forEach(r => { const m = signMat(nm, '#F4ECD8', '#8A1A1A', 1), n2 = [...nm].length, p = plane(m, 0.62, n2 * 0.45 + 0.3, hx, 5.6 - n2 * 0.12, mid + (r ? -0.03 : 0.03), r); p.scale.y = 1; }); cube(M.steel, hx - 0.03, 5.6 + 0.2, mid - 0.03, hx + 0.03, 6.8, mid + 0.03); }
      }
      return { r, h, f };
    };
    // 一排地塊：沿著 a0→a1 切成寬 w0～w1 的地塊，深 d，正面朝 f（c 是正面那條線）
    const row = (f, c, a0, a1, d, st, hs, w0, w1, each) => {
      const out = []; let a = a0;
      while (a1 - a > 0.5) {
        let w = rr(w0, w1); if (a1 - a - w < w0) w = a1 - a;
        const b = Math.min(a + w, a1), r = f === 's' ? [a, c - d, b, c] : f === 'n' ? [a, c, b, c + d] : f === 'e' ? [c - d, a, c, b] : [c, a, c + d, b];
        const o = each ? each(out.length, r) : {}; if (o !== null) out.push(bld(r, o.h || rr(hs[0], hs[1]), st, f, o));
        a = b;
      }
      return out;
    };

    // ---------- 站房、站前廣場 ----------
    { const [x0, z0, x1, z1] = HALL; cube(M.conc, x0, 0, z0, x1, 8, z1); block(x0, x1, z0, z1); tw.foot.push([x0, z0, x1, z1, 'hall']);
      add(g3.box, M.litC, 0, 2.6, z1 + 0.05, 84, 4.4, 0.1); for (let x = -42; x <= 42; x += 4) add(g3.box, M.steel, x, 2.6, z1 + 0.12, 0.2, 4.6, 0.2); add(g3.box, M.steel, 0, 4.9, z1 + 0.12, 86, 0.3, 0.25);
      cube(lam('#C8DCE8', { op: 0.45, see: 1 }), -24, 4.5, z1, 24, 4.65, z1 + 3.4); cube(M.steel, -24, 4.35, z1 + 3.3, 24, 4.7, z1 + 3.5); [-23, -8, 8, 23].forEach(x => add(g3.box, M.steel, x, 2.25, z1 + 3.3, 0.2, 4.5, 0.2));
      sign('奉主站', 's', z1, 0, 6.1, { ch: 1.25, col: ['#1A2A5A', '#FFFFFF'] });
      sign('魔導電車・環狀線・港區貨運線', 's', z1 + 3.55, 0, 4.1, { ch: 0.4, col: ['#0E0E14', '#FFE24A'] });
      // 站房兩邊的大樓（高架北邊）
      bld([-46, -136, -18, -114], 34, 'dept', 's', { col: '#C8BCA8' }); bld([18, -136, 46, -114], 46, 'hotel', 's');
    }
    // 站前：時鐘柱、公車亭、計程車、豬肉包的店
    add(g3.box, M.steel, 0, 2.2, -82, 0.4, 4.4, 0.4); add(g3.box, M.whiteP, 0, 4.7, -82, 1.4, 1.4, 0.4); block(-0.4, 0.4, -82.4, -81.6, 'deco');
    inter(0, -81, 2.4, '觀光景點：奉主站（站前的時鐘・觀光章）', () => visit('station'), '#E8C04A');
    [[-32, -75], [32, -75]].forEach(([x, z]) => { cube(M.steel, x - 3, 2.6, z - 0.9, x + 3, 2.8, z + 0.9); [-2.8, 2.8].forEach(d => add(g3.box, M.steel, x + d, 1.3, z - 0.7, 0.12, 2.6, 0.12)); cube(M.litC, x - 2.8, 0.4, z - 0.85, x + 2.8, 2.5, z - 0.75); block(x - 3, x + 3, z - 0.95, z - 0.65, 'deco'); });
    for (let i = 0; i < 4; i++) { const x = 16 + i * 6; car(x, -88, Math.PI / 2, '#16161C', true); }
    bld([36, -94, 47, -89], 4.2, 'shop', 's', { name: '豬肉包・福滿', col2: ['#C8202A', '#FFF4D8'] }); inter(41.5, -87.6, 2.2, '豬肉包・福滿（買來吃）', () => eat('buta'), '#E8A03A');
    inter(0, -92.4, 3.2, '奉主站：搭魔導電車回東鶴（' + FARE + ' 費拉）', ticketBack, '#3E7A48');
    R.electionBoard && R.electionBoard(group, -40, -71, 0) && inter(-40, -70.5, 2.2, '看競選海報（議會選舉）', R.electionSheet);

    // ---------- 高架的環狀線 ----------
    const loopLen = [];
    { let L = 0; for (let i = 0; i < LOOP.length; i++) { const a = LOOP[i], b = LOOP[(i + 1) % LOOP.length]; loopLen.push(L); L += Math.hypot(b[0] - a[0], b[1] - a[1]); } tw.loopL = L; tw.loopAcc = loopLen; }
    for (let i = 0; i < LOOP.length; i++) {
      const a = LOOP[i], b = LOOP[(i + 1) % LOOP.length], ew = a[1] === b[1], lo = Math.min(ew ? a[0] : a[1], ew ? b[0] : b[1]) - 3.5, hi = Math.max(ew ? a[0] : a[1], ew ? b[0] : b[1]) + 3.5, c = ew ? a[1] : a[0];
      if (ew) { cube(M.conc, lo, DECK - 0.6, c - 3.5, hi, DECK + 0.6, c + 3.5); cube(M.conc, lo, DECK + 0.6, c - 3.5, hi, DECK + 1.3, c - 3.2); cube(M.conc, lo, DECK + 0.6, c + 3.2, hi, DECK + 1.3, c + 3.5); [-1.6, 1.6].forEach(d => cube(M.rail, lo, DECK + 0.6, c + d - 0.08, hi, DECK + 0.75, c + d + 0.08)); }
      else { cube(M.conc, c - 3.5, DECK - 0.6, lo, c + 3.5, DECK + 0.6, hi); cube(M.conc, c - 3.5, DECK + 0.6, lo, c - 3.2, DECK + 1.3, hi); cube(M.conc, c + 3.2, DECK + 0.6, lo, c + 3.5, DECK + 1.3, hi); [-1.6, 1.6].forEach(d => cube(M.rail, c + d - 0.08, DECK + 0.6, lo, c + d + 0.08, DECK + 0.75, hi)); }
      for (let s = lo + 3.5; s <= hi - 3.5; s += 15) {
        const x = ew ? s : c, z = ew ? c : s;
        if (onRoad(x, z, 1) || inR(x, z, HALL, 1) || inR(x, z, CANAL, 0) || x > SEA_X || z > QUAY) continue;
        add(g3.box, M.concD, x, (DECK - 0.6) / 2, z, 1.4, DECK - 0.6, 1.4); cube(M.concD, x - (ew ? 0.9 : 3.2), DECK - 1.4, z - (ew ? 3.2 : 0.9), x + (ew ? 0.9 : 3.2), DECK - 0.6, z + (ew ? 3.2 : 0.9)); block(x - 0.8, x + 0.8, z - 0.8, z + 0.8, 'deco');
      }
    }
    // 奉主站的月台（高架上的雨棚）
    cube(M.roofL, -40, DECK + 3.6, -110, 40, DECK + 3.9, -100); for (let x = -38; x <= 38; x += 8) [-109.6, -100.4].forEach(z => add(g3.box, M.steel, x, DECK + 2.3, z, 0.25, 2.6, 0.25));
    // 電車（橘色，四節）
    const trainMat = M.orange, winMat = lam('#2A3440', { tex: 0, see: 1 }), roofMat = lam('#9A9EA4', { tex: 0, see: 1 });
    [0, 0.5].forEach(ph => { const cars = []; for (let k = 0; k < 4; k++) { const g = new TH.Group(); const b = new TH.Mesh(g3.box, trainMat); b.scale.set(2.9, 2.6, 14); b.position.y = 1.3; const wb = new TH.Mesh(g3.box, winMat); wb.scale.set(2.95, 0.9, 12.6); wb.position.y = 1.75; const rf = new TH.Mesh(g3.box, roofMat); rf.scale.set(2.7, 0.3, 13.6); rf.position.y = 2.75; g.add(b, wb, rf); b.castShadow = true; group.add(g); cars.push(g); } tw.trains.push({ s: ph * tw.loopL, cars }); });

    // ---------- 千燈通商店街（拱廊） ----------
    const ARC_SHOPS = [['章魚燒・阿八', 'tako'], ['串炸・二度禁止', 'kushi'], ['奉主燒・鐵板屋', 'okono'], ['喫茶・青鳥', 'kissa'], ['柏青哥・大當', 'pachi'], ['魔導電器・德克斯凡', 'denki'], ['藥妝・千燈', 'drug'], ['書店・積善堂', 'books']];
    let ai = 0;
    const arcadeEach = side => (i, r) => {
      const sp = ARC_SHOPS[ai++]; const name = sp ? sp[0] : pk(SHOPS), o = { name, hang: 1, vsign: rnd() < 0.5 ? name.split('・')[0] : null };
      if (sp) { const cx = side === 'e' ? r[2] + 1.6 : r[0] - 1.6, cz = (r[1] + r[3]) / 2, k = sp[1];
        if (FOOD[k]) inter(cx, cz, 2, FOOD[k].name + '（買來吃）', () => eat(k), '#E8A03A');
        else if (k === 'pachi') inter(cx, cz, 2, '柏青哥・大當（進去玩）', () => R.pachinko ? R.pachinko() : R.toast('今天公休。'), '#C83A3A');
        else if (k === 'denki') inter(cx, cz, 2, '魔導電器・德克斯凡（看看）', () => R.townTalk('魔導電器・德克斯凡', ['店裡擺滿德克斯凡製的魔導冰箱、魔導洗衣機、會自己掃地的圓盤。', pick(['「這台能洗一大桶，床單也放得下。我阿嬤來看過，嫌它用水太多。」', '「零件都是德克斯凡來的，壞了要寄回去修，等三個月。」', '「工廠買了新的魔導機，我表哥就被調去顧倉庫了。」'])]));
        else if (k === 'drug') inter(cx, cz, 2, '藥妝・千燈（看看）', () => R.townTalk('藥妝・千燈', ['白藤堂的驅寒茶、德克斯凡的藥膏、眼藥水、成堆的口罩。', pick(['「白藤堂的藥在奉主賣得比東鶴便宜一點。」', '「港區的人常來買喉糖。工廠的煙很嗆。」'])]));
        else if (k === 'books') inter(cx, cz, 2, '書店・積善堂（看看）', () => R.townTalk('書店・積善堂', ['舊書堆到天花板。', pick(['架上有一本《昭光帝國戰史》，書背燒焦了一角。', '「議會選舉的政見手冊，免費拿。四個黨都有。」', '有一本《遺跡生物圖鑑・奉主版》，跟東鶴分館的不太一樣。'])]));
      }
      return o;
    };
    // 西側、東側的店（正面朝拱廊）
    row('e', -55, -52, -15, 12, 'shop', [7, 12], 5, 8, arcadeEach('e'));
    row('w', -45, -52, -15, 12, 'shop', [7, 12], 5, 8, arcadeEach('w'));
    row('e', -55, 5, 16, 10, 'shop', [7, 10], 5, 6, arcadeEach('e'));
    row('w', -45, 5, 16, 10, 'shop', [7, 10], 5, 6, arcadeEach('w'));
    // 拱廊的屋頂、柱子、入口的門
    [[-56, -15], [1, 16]].forEach(([za, zb]) => { cube(M.arcadeRoof, -55, 7, za, -45, 7.2, zb); for (let z = za; z <= zb; z += 6) [-54.8, -45.2].forEach(x => add(g3.box, M.steel, x, 3.6, z, 0.2, 7.2, 0.2)); });
    [-56, 16].forEach(z => { cube(M.steel, -55.2, 7.2, z - 0.3, -44.8, 8.4, z + 0.3); sign('千燈通商店街', z < 0 ? 'n' : 's', z + (z < 0 ? -0.3 : 0.3), -50, 7.8, { ch: 0.9, col: ['#8A1A1A', '#FFE8B0'] }); });
    // 商店街外側的其他房子（北通、中通、西大通那一面）
    row('n', -52, -85, -67, 10, 'shop', [8, 14], 5, 9, () => ({ name: pk(SHOPS), vsign: rnd() < 0.4 ? pk(SHOPS).split('・')[0] : null, ad: rnd() < 0.4 }));
    row('s', -15, -85, -67, 10, 'shop', [8, 13], 5, 9, () => ({ name: pk(SHOPS) }));
    row('w', -85, -42, -25, 10, 'shop', [7, 12], 6, 9, () => ({ name: rnd() < 0.6 ? pk(SHOPS) : null }));
    bld([-75, -42, -67, -25], 6, 'shop', 's');
    row('n', -52, -33, -14, 10, 'shop', [10, 16], 5, 9, () => ({ name: pk(SHOPS), ad: rnd() < 0.4 }));
    row('s', -15, -33, -14, 10, 'shop', [9, 14], 5, 9, () => ({ name: pk(SHOPS) }));
    row('e', -14, -42, -25, 10, 'shop', [9, 14], 6, 9, () => ({ name: rnd() < 0.7 ? pk(SHOPS) : null }));
    bld([-33, -42, -24, -25], 6, 'shop', 's');
    row('w', -85, 5, 16, 10, 'neon', [8, 12], 5, 8, () => ({ name: pk(SHOPS), vsign: pk(SHOPS).split('・')[0] }));
    bld([-75, 5, -65, 16], 7, 'neon', 's', { name: pk(SHOPS) });

    // ---------- 新堂町商務區、奉主百貨、站前的大樓 ----------
    row('n', -52, 14, 75, 16, 'office', [22, 40], 14, 22, () => ({}));
    row('s', -15, 14, 75, 16, 'office', [18, 30], 14, 22, () => ({}));
    [[14, -36, 75, -31]].forEach(r => { cube(M.conc, r[0], 0, r[1], r[2], 4, r[3]); block(r[0], r[2], r[1], r[3]); tw.foot.push([...r, 'office']); });
    bld([95, -52, 128, -15], 26, 'dept', 's', { col: '#C8BCA8' }); sign('奉主百貨', 's', -15, 111, 6.2, { ch: 1.2, col: ['#5A1A2A', '#FFE8B0'] }); add(g3.box, M.shopLit, 111, 1.6, -14.95, 30, 2.8, 0.1); cube(M.steel, 96, 3.4, -15, 127, 3.6, -13);
    bld([131, -52, 150, -15], 40, 'tall', 's');
    { // 銀行、公司的招牌（一樓）
      const names = ['德克斯凡商會・奉主分行', '奉主重工・本社', '昭旭鐵道・南部本部', '天宮海運'];
      [[30, -15], [58, -15], [30, -52], [58, -52]].forEach(([x, z], i) => sign(names[i], z > -30 ? 's' : 'n', z, x, 3.2, { ch: 0.55, col: ['#1A2030', '#E8E4DA'] }));
    }
    // 站前的旅館、大樓（北通北邊）
    row('s', -72, -150, -54, 22, 'hotel', [18, 34], 16, 26, (i) => (i % 2 ? { name: pk(['旅館・奉主屋', '商務旅館・港', '飯店・北濱', '膠囊旅館', '居酒屋・笑福']), ad: 0 } : {}));
    row('s', -72, 54, 150, 22, 'hotel', [18, 34], 16, 26, (i) => (i % 2 ? { name: pk(['商務旅館・港', '飯店・環狀', '牛丼・快', '珈琲・夜曲']) } : {}));
    // 高架北邊的大樓（背景）
    row('s', -114, -158, -50, 18, 'tall', [30, 60], 14, 24, () => ({}));
    row('s', -114, 50, 150, 18, 'tall', [30, 60], 14, 24, () => ({}));

    // ---------- 燈籠堀北岸（霓虹、大章魚、大看板） ----------
    let tako = null;
    row('s', 16, -35, -14, 11, 'neon', [9, 15], 5, 8, (i, r) => {
      if (i === 0) { tako = r; return { name: '章魚燒・阿八', col2: ['#C8202A', '#FFF4D8'], vsign: '章魚燒' }; }
      return { name: pk(SHOPS), vsign: rnd() < 0.7 ? pk(SHOPS).split('・')[0] : null, ad: rnd() < 0.5 };
    });
    if (tako) { const cx = (tako[0] + tako[2]) / 2; inter(cx, 17.5, 2.2, '章魚燒・阿八（燈籠堀店，買來吃）', () => eat('tako'), '#E8A03A');
      const og = new TH.Group(), red = lam('#D83A2A', { tex: 0 }), head = new TH.Mesh(g3.sph, red); head.scale.set(2.4, 2.2, 1.8); head.position.y = 1.1; og.add(head);
      [-0.45, 0.45].forEach(dx => { const e = new TH.Mesh(g3.sph, lam('#FFFFFF', { tex: 0 })); e.scale.setScalar(0.45); e.position.set(dx, 1.0, 0.85); og.add(e); const p = new TH.Mesh(g3.sph, lam('#1A1410', { tex: 0 })); p.scale.setScalar(0.2); p.position.set(dx, 1.0, 1.08); og.add(p); });
      const legs = []; for (let k = 0; k < 6; k++) { const a = -1.2 + k * 0.48, l = new TH.Group(), c = new TH.Mesh(g3.cyl, red); c.scale.set(0.35, 1.8, 0.35); c.position.y = -0.9; l.add(c); l.position.set(Math.sin(a) * 1.0, 0.2, 0.5); l.rotation.z = a * 0.8; og.add(l); legs.push(l); }
      og.position.set(tako[2] - 2.6, 5.4, 16.3); group.add(og); tw.octo = { legs };
    }
    row('s', 16, 14, 75, 11, 'neon', [10, 16], 5, 9, (i, r) => i === 0 ? { name: '千日製菓・直營店', h: 12 } : { name: pk(SHOPS), vsign: rnd() < 0.7 ? pk(SHOPS).split('・')[0] : null, ad: rnd() < 0.5 });
    row('s', 16, 95, 150, 11, 'neon', [9, 15], 5, 9, () => ({ name: pk(SHOPS), vsign: rnd() < 0.6 ? pk(SHOPS).split('・')[0] : null, ad: rnd() < 0.5 }));
    // 招福橋邊的大看板：「奉主製菓」揮手的魔導人偶（兩張圖輪流）
    { const art = up => R.pixCanvasTex(64, 48, (g, W0, H0) => {
        const grd = g.createLinearGradient(0, 0, 0, H0); grd.addColorStop(0, '#1A4AA8'); grd.addColorStop(1, '#3AA8E8'); g.fillStyle = grd; g.fillRect(0, 0, W0, H0);
        g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W0, 2); g.fillRect(0, H0 - 2, W0, 2);
        const cx = 20, P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
        P(cx - 3, 10, 6, 6, '#F2D6B8'); P(cx - 3, 9, 6, 2, '#1A1410'); P(cx - 4, 16, 8, 10, '#E8E8E8'); P(cx - 4, 26, 3, 9, '#2A2A3A'); P(cx + 1, 26, 3, 9, '#2A2A3A');
        if (up) { P(cx - 8, 6, 3, 11, '#E8E8E8'); P(cx + 5, 6, 3, 11, '#E8E8E8'); P(cx - 8, 4, 3, 3, '#F2D6B8'); P(cx + 5, 4, 3, 3, '#F2D6B8'); }
        else { P(cx - 8, 16, 3, 9, '#E8E8E8'); P(cx + 5, 6, 3, 11, '#E8E8E8'); P(cx + 5, 4, 3, 3, '#F2D6B8'); P(cx - 8, 25, 3, 2, '#F2D6B8'); }
        P(cx - 5, 36, 4, 2, '#C8202A'); P(cx + 1, 36, 4, 2, '#C8202A');
        g.fillStyle = '#FFE24A'; g.font = 'bold 9px "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('奉主製菓', 46, 16); g.fillStyle = '#FFFFFF'; g.font = 'bold 7px "Noto Sans TC", sans-serif'; g.fillText('牛奶糖', 46, 27); g.fillText('一顆就有力氣', 46, 37);
      });
      const t1 = art(true), t2 = art(false), m = new TH.MeshBasicMaterial({ map: t1 }); m.userData.shared = false;
      cube(M.steel, 13.6, 4.2, 16.0, 23.4, 4.5, 16.4);
      const p = plane(m, 9.4, 5.6, 18.5, 7.1, 16.2, 0); tw.bb = { m, t1, t2, k: 0 };
      inter(18.5, 19, 2.6, '觀光景點：招福橋的大看板（觀光章）', () => visit('billboard'), '#E8C04A');
    }

    // ---------- 燈籠堀（水、護欄、橋、燈籠、遊覽船） ----------
    { const [cx0, cz0, cx1, cz1] = CANAL; const wm = M.water; add(g3.box, wm, (cx0 + cx1) / 2, 0.04, (cz0 + cz1) / 2, cx1 - cx0, 0.04, cz1 - cz0);
      let x = cx0; BRIDGES.slice().sort((a, b) => a[0] - b[0]).concat([[cx1 + 1, cx1 + 1]]).forEach(([b0, b1, name, road]) => {
        if (b0 > x) { block(x, b0, cz0 + 0.3, cz1 - 0.3, 'water'); if (x > -101) [cz0, cz1].forEach(z => { cube(M.fence, x, 0, z - 0.06, Math.min(b0, SEA_X), 1.0, z + 0.06); }); }
        if (b1 < cx1) { cube(road ? M.concD : M.wood, b0, 0.05, cz0 - 0.5, b1, 0.3, cz1 + 0.5); [b0, b1].forEach(bx => cube(M.fence, bx - 0.1, 0.3, cz0, bx + 0.1, 1.3, cz1)); if (name) sign(name, 's', cz1 + 0.3, (b0 + b1) / 2, 1.0, { ch: 0.35, col: ['#3A3A40', '#E8E4DA'] }); }
        x = Math.max(x, b1);
      });
      for (let x2 = -95; x2 < 158; x2 += 6) { if (BRIDGES.some(b => x2 > b[0] - 1 && x2 < b[1] + 1)) continue; [21.4, 34.6].forEach(z => { add(g3.box, M.lamp, x2, 1.4, z, 0.1, 2.8, 0.1); add(g3.sph, M.lantern, x2, 2.6, z, 0.55, 0.7, 0.55); }); }
      inter(-30, 19.5, 2.4, '觀光景點：燈籠堀（觀光章）', () => visit('canal'), '#E8C04A');
      const boat = new TH.Group(), hull = new TH.Mesh(g3.box, lam('#E8E4DC', { tex: 0 })); hull.scale.set(9, 0.9, 3); hull.position.y = 0.3; const cab = new TH.Mesh(g3.box, lam('#3A5A8A', { tex: 0 })); cab.scale.set(5, 1.2, 2.4); cab.position.set(-0.5, 1.3, 0); const rf = new TH.Mesh(g3.box, lam('#C83A3A', { tex: 0 })); rf.scale.set(5.6, 0.15, 2.8); rf.position.set(-0.5, 2.0, 0); boat.add(hull, cab, rf); group.add(boat); tw.boat = { g: boat, x: -80, d: 1 };
    }

    // ---------- 燈籠堀南岸：長屋町、新町、奉主塔 ----------
    row('n', 40, -85, -14, 8, 'old', [5, 6.5], 4.5, 6.5, () => (rnd() < 0.25 ? { name: pk(['豆腐店', '雜貨・丸', '酒屋', '理髮・剪', '駄菓子']) } : {}));
    row('n', 40, 14, 36, 8, 'retro', [8, 12], 5, 8, () => ({ name: pk(SHOPS), vsign: pk(SHOPS).split('・')[0] }));
    row('n', 40, 56, 75, 8, 'retro', [8, 12], 5, 8, (i) => i === 0 ? { name: '串炸・二度禁止', vsign: '串炸', col2: ['#E8A020', '#1A1410'] } : { name: pk(SHOPS), vsign: pk(SHOPS).split('・')[0] });
    inter(58, 38.8, 2.2, '串炸・二度禁止（新町本店，買來吃）', () => eat('kushi'), '#E8A03A');
    row('n', 40, 95, 150, 8, 'retro', [8, 13], 5, 9, () => ({ name: pk(SHOPS), vsign: rnd() < 0.7 ? pk(SHOPS).split('・')[0] : null }));
    { // 奉主塔：四隻腳跨在新町通上，腳下的拱門有霓虹字
      const cx = 46, cz = 45, h0 = 8, stl = lam('#7A8088', { tex: 0, see: 1 }); [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([dx, dz]) => { add(g3.box, stl, cx + dx * 0.85, h0 / 2, cz + dz * 0.85, 1.2, h0, 1.2, dz * 0.04, 0, -dx * 0.04); block(cx + dx * 0.85 - 0.7, cx + dx * 0.85 + 0.7, cz + dz * 0.85 - 0.7, cz + dz * 0.85 + 0.7, 'deco'); });
      cube(stl, cx - 6, h0, cz - 6, cx + 6, h0 + 1, cz + 6); for (let y = h0 + 1; y < 60; y += 4) { const k = Math.max(2, 5.5 - (y - h0) * 0.06); cube(stl, cx - k, y, cz - k, cx + k, y + 0.5, cz - k + 0.5); cube(stl, cx - k, y, cz + k - 0.5, cx + k, y + 0.5, cz + k); [-k, k - 0.4].forEach(dx => [-k, k - 0.4].forEach(dz => add(g3.box, stl, cx + dx + 0.2, y + 2, cz + dz + 0.2, 0.4, 4, 0.4))); }
      sign('奉主塔', 's', cz + 6.1, cx, h0 - 0.8, { ch: 1.2, col: ['#0E0E14', '#FFE24A'], flicker: 1 }); sign('奉主塔', 'n', cz - 6.1, cx, h0 - 0.8, { ch: 1.2, col: ['#0E0E14', '#FFE24A'] });
      tw.foot.push([cx - 6, cz - 6, cx + 6, cz + 6, 'tower']);
      inter(cx - 3, cz + 5.5, 2.2, '觀光景點：奉主塔（觀光章）', () => visit('tower'), '#E8C04A');
      inter(cx + 3, cz + 5.5, 2.2, '上奉主塔的展望台（5 費拉）', towerTop);
    }

    // ---------- 奉主城 ----------
    { const { x: cx, z: cz, wall: hw, moat } = CASTLE;
      // 護城河（四邊），南邊有橋和城門
      const o = hw + moat; [[cx - o, cz - o, cx + o, cz - hw], [cx - o, cz + hw, cx - 4, cz + o], [cx + 4, cz + hw, cx + o, cz + o], [cx - o, cz - hw, cx - hw, cz + hw], [cx + hw, cz - hw, cx + o, cz + hw]].forEach(r => { add(g3.box, M.water, (r[0] + r[2]) / 2, 0.04, (r[1] + r[3]) / 2, r[2] - r[0], 0.04, r[3] - r[1]); block(r[0], r[2], r[1], r[3], 'water'); });
      add(g3.box, M.water, cx + o - 3, 0.04, (cz + o + 22) / 2 + 1, 6, 0.04, 22 - cz - o + 2); block(cx + o - 6, cx + o, cz + o, 22, 'water');
      cube(M.wood, cx - 4, 0.05, cz + hw, cx + 4, 0.35, cz + o); [cx - 4, cx + 4].forEach(x => cube(M.wood, x - 0.12, 0.35, cz + hw, x + 0.12, 1.2, cz + o));
      // 石垣（外圈的牆，南邊開門）
      const wh = 4.2, t = 2.4; cube(M.stone, cx - hw, 0, cz - hw, cx + hw, wh, cz - hw + t); cube(M.stone, cx - hw, 0, cz - hw, cx - hw + t, wh, cz + hw); cube(M.stone, cx + hw - t, 0, cz - hw, cx + hw, wh, cz + hw);
      cube(M.stone, cx - hw, 0, cz + hw - t, cx - 3.5, wh, cz + hw); cube(M.stone, cx + 3.5, 0, cz + hw - t, cx + hw, wh, cz + hw);
      [[cx - hw, cz - hw, cx + hw, cz - hw + t], [cx - hw, cz - hw, cx - hw + t, cz + hw], [cx + hw - t, cz - hw, cx + hw, cz + hw], [cx - hw, cz + hw - t, cx - 3.5, cz + hw], [cx + 3.5, cz + hw - t, cx + hw, cz + hw]].forEach(r => block(r[0], r[2], r[1], r[3]));
      // 城門（白牆、綠瓦）
      cube(M.white, cx - 4.5, wh, cz + hw - t, cx + 4.5, wh + 2.4, cz + hw); add(g3.prism, M.green, cx, wh + 2.4, cz + hw - t / 2, t + 1.2, 1.6, 10.6, 0, Math.PI / 2, 0);
      // 天守閣：石台＋五層（白牆、綠瓦、金色的屋脊）
      const kx = cx, kz = cz - 3; cube(M.stone, kx - 9, 0, kz - 7, kx + 9, 3, kz + 7); block(kx - 9, kx + 9, kz - 7, kz + 7); tw.foot.push([kx - 9, kz - 7, kx + 9, kz + 7, 'castle']);
      let y = 3; for (let i = 0; i < 5; i++) { const a = 8 - i * 1.4, b = 6 - i * 1.05, hh = 2.6; cube(M.white, kx - a, y, kz - b, kx + a, y + hh, kz + b); for (let k = -a + 1.2; k < a - 0.6; k += 1.8) add(g3.box, M.tile, kx + k, y + hh * 0.55, kz + b + 0.05, 0.7, 0.9, 0.1); cube(M.green, kx - a - 0.9, y + hh, kz - b - 0.9, kx + a + 0.9, y + hh + 0.35, kz + b + 0.9); add(g3.prism, M.green, kx, y + hh + 0.35, kz + b + 0.4, 3.2, 1.2, 1.2, 0, 0, 0); y += hh + 0.6; }
      add(g3.prism, M.green, kx, y, kz, 2 * (8 - 5 * 1.4) + 1.4, 2, 2 * (6 - 5 * 1.05) + 1.2, 0, Math.PI / 2, 0); [-1.6, 1.6].forEach(dx => add(g3.box, M.gold, kx + dx, y + 1.9, kz, 0.4, 0.7, 0.3));
      inter(cx, cz + hw + 3, 2.6, '觀光景點：奉主城（城門・觀光章）', () => visit('castle'), '#E8C04A');
      inter(kx, kz + 8.5, 2.4, '登上天守閣（5 費拉）', castleTop, '#E8C04A');
      // 公園的松樹
      for (let i = 0; i < 70; i++) { const x = rr(PARK[0] + 2, PARK[2] - 2), z = rr(PARK[1] + 2, PARK[3] - 2); if (inR(x, z, [cx - o - 3, cz - o - 3, cx + o + 3, cz + o + 3]) || Math.abs(x - LOOP[0][0]) < 5 || inR(x, z, [cx + o - 8, cz + o - 2, cx + o + 2, 36])) continue; pine(x, z); }
    }

    // ---------- 臨海工業區 ----------
    { // 奉主製鐵所：兩棟大廠房（鋸齒屋頂）、高爐、煙囪
      const shed = (x0, z0, x1, z1, h, name) => { cube(lam('#6A6E74', { tex: 'cap', see: 1 }), x0, 0, z0, x1, h, z1); block(x0, x1, z0, z1); tw.foot.push([x0, z0, x1, z1, 'shed']); for (let x = x0 + 3; x < x1 - 2; x += 6) add(g3.prism, M.roofL, x, h, (z0 + z1) / 2, 6, 2.2, z1 - z0, 0, 0, 0); add(g3.box, M.litW, (x0 + x1) / 2, h - 2.4, z0 - 0.05, x1 - x0 - 4, 1.2, 0.1); for (let x = x0 + 6; x < x1 - 4; x += 14) cube(lam('#2A2A30', { tex: 0 }), x, 0, z0 - 0.06, x + 5, 6, z0); sign(name, 'n', z0, (x0 + x1) / 2, h - 4.6, { ch: 1.0, col: ['#E8E4DA', '#2A3A6A'] }); };
      shed(-148, 80, -102, 101, 14, '奉主製鐵所・第一工場'); shed(-96, 80, -54, 99, 13, '奉主製鐵所・壓延工場');
      tw.smokes.push({ x: -125, y: 15, z: 88, big: 1 }, { x: -110, y: 15, z: 92 }, { x: -75, y: 14, z: 86 });
      { const fx = -36, fz = 90; add(g3.cyl, M.rust, fx, 9, fz, 11, 18, 11); add(g3.cone, M.rust, fx, 19.5, fz, 9, 3, 9); add(g3.box, M.fire, fx, 1.2, fz + 5.4, 3, 2, 0.6); block(fx - 5.5, fx + 5.5, fz - 5.5, fz + 5.5); tw.foot.push([fx - 5.5, fz - 5.5, fx + 5.5, fz + 5.5, 'shed']); add(g3.box, M.rust, fx + 7, 12, fz - 3, 1.2, 1.2, 14, 0.6, 0, 0); tw.smokes.push({ x: fx, y: 12, z: fz + 5, big: 1 }); tw.glow = { x: fx, z: fz + 6 }; }
      [[-138, 102], [-122, 102], [-70, 101], [-48, 101]].forEach(([x, z]) => { for (let k = 0; k < 9; k++) add(g3.cyl, k % 2 ? M.whiteP : M.red, x, k * 4 + 2, z, 2.6, 4, 2.6); block(x - 1.3, x + 1.3, z - 1.3, z + 1.3); });
      // 魔導機關工廠（德克斯凡合資）：白色的廠房、屋頂上發藍光的魔導管線、球形槽
      cube(lam('#D8DCE0', { tex: 'cap', see: 1 }), -14, 0, 80, 38, 11, 100); block(-14, 38, 80, 100); tw.foot.push([-14, 80, 38, 100, 'shed']);
      for (let z = 83; z < 99; z += 5) cube(M.blue, -12, 11, z, 36, 11.5, z + 0.5); for (let x = -10; x < 36; x += 9) cube(M.blue, x, 0.4, 79.9, x + 0.5, 10.6, 80);
      sign('魔導機關工廠', 'n', 80, 12, 8, { ch: 1.0, col: ['#1A2A4A', '#8AE0FF'], flicker: 1 }); sign('德克斯凡・奉主重工合資', 'n', 80, 12, 6.4, { ch: 0.5, col: ['#1A2A4A', '#E8E4DA'] });
      [[48, 86, 6], [48, 99, 5]].forEach(([x, z, r]) => { add(g3.sph, M.whiteP, x, r + 1, z, r * 2, r * 2, r * 2); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => add(g3.box, M.steel, x + a * r * 0.6, (r + 1) / 2, z + b * r * 0.6, 0.4, r + 1, 0.4)); block(x - r, x + r, z - r, z + r); });
      tw.smokes.push({ x: 10, y: 11.5, z: 96 });
      // 工廠的大門口：工人
      cube(M.steel, -100, 0, 74.6, -98, 3.2, 75.4); cube(M.steel, -60, 0, 74.6, -58, 3.2, 75.4); sign('奉主製鐵所', 's', 75.4, -99, 3.6, { ch: 0.4, col: ['#E8E4DA', '#2A3A6A'] });
      // 奉主港：貨櫃、起重機、貨船
      const CC = ['#B8402A', '#2E5A8A', '#3A7A4A', '#C8A040', '#6A6A72', '#8A4A6A', '#2E7A7A'];
      for (let x = 64; x < 150; x += 13.5) for (let z = 79; z < 96; z += 3.2) { if (rnd() < 0.15) continue; const n = 1 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) add(g3.box, lam(pk(CC), { tex: 0 }), x + 6, 1.3 + k * 2.6, z + 1.25, 12, 2.5, 2.5); block(x, x + 12, z, z + 2.5); }
      [84, 110, 136].forEach(x => { [[-5, 98], [5, 98], [-5, 103], [5, 103]].forEach(([dx, z]) => { add(g3.box, M.red, x + dx, 13, z, 0.9, 26, 0.9); block(x + dx - 0.5, x + dx + 0.5, z - 0.5, z + 0.5, 'deco'); }); cube(M.red, x - 5.5, 24, 92, x + 5.5, 26, 128); });
      inter(110, 100.5, 2.6, '觀光景點：奉主港（起重機・觀光章）', () => visit('port'), '#E8C04A');
      { const sx = 78, sz = 112; cube(lam('#2A2A34', { tex: 0 }), sx, 0, sz, sx + 72, 5, sz + 13); cube(lam('#8A2A24', { tex: 0 }), sx, 0, sz, sx + 72, 1.4, sz + 13); cube(lam('#EDE8DC', { tex: 0 }), sx + 58, 5, sz + 2, sx + 70, 13, sz + 11); add(g3.cyl, lam('#C8A040', { tex: 0 }), sx + 64, 15, sz + 6.5, 2.4, 4, 2.4); for (let x = sx + 4; x < sx + 54; x += 13) for (let k = 0; k < 2; k++) add(g3.box, lam(pk(CC), { tex: 0 }), x + 6, 6.3 + k * 2.6, sz + 6.5, 12, 2.5, 9); }
      // 岸壁
      cube(M.concD, -172, 0, QUAY - 0.4, SEA_X + 40, 0.5, QUAY + 0.4);
    }

    // ---------- 路樹、路燈、販賣機、腳踏車 ----------
    function pine(x, z) { add(g3.cyl, M.trunk, x, 1.2, z, 0.4, 2.4, 0.4); add(g3.cone, M.pine, x, 3, z, 3.2, 2.6, 3.2); add(g3.cone, M.pine, x, 4.6, z, 2.2, 2.2, 2.2); block(x - 0.35, x + 0.35, z - 0.35, z + 0.35, 'tree'); }
    const ginkgo = (x, z) => { add(g3.cyl, M.trunk, x, 1.7, z, 0.35, 3.4, 0.35); add(g3.cone, M.ginkgo, x, 4.6, z, 2.6, 4, 2.6); block(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 'tree'); };
    for (let z = -48; z < 50; z += 8) { if (z > -14 && z < 4 || z > 12 && z < 42) continue; [-11, 11].forEach(x => ginkgo(x, z)); }   // 不要種在北通、中通、南通的車道上
    for (let x = -48; x <= 48; x += 12) if (Math.abs(x) > 14) ginkgo(x, -69.5);
    const lamp = (x, z, dz) => { add(g3.box, M.lamp, x, 3, z, 0.15, 6, 0.15); add(g3.box, M.lamp, x, 6, z + dz * 0.7, 0.12, 0.12, 1.4); add(g3.box, M.lampH, x, 5.85, z + dz * 1.3, 0.3, 0.15, 0.5); block(x - 0.12, x + 0.12, z - 0.12, z + 0.12, 'deco'); };
    [[-140, 150, -55.4, -1], [-140, 150, -68.6, 1], [-88, 150, -11.6, 1], [-88, 150, 1.6, -1], [-140, 150, 51.4, 1], [-140, 150, 64.6, -1]].forEach(([a, b, z, dz]) => { for (let x = a; x < b; x += 22) if (!ROADS.some(r => r[4] !== '北通' && r[4] !== '中通' && r[4] !== '南通' && x > r[0] - 2 && x < r[2] + 2) && !inR(x, z, ARCADE, 1) && !inR(x, z, PLAZA, 0)) lamp(x, z, dz); });
    const vend = (x, z, f) => { const c = pk(['#C83A3A', '#2E5A8A', '#E8E4DC', '#3A7A4A']); add(g3.box, lam(c, { tex: 0 }), x, 0.95, z, f ? 0.8 : 1.0, 1.9, f ? 1.0 : 0.8); add(g3.box, M.shopLit, x + (f ? 0.42 : 0), 1.2, z + (f ? 0 : 0.42), f ? 0.05 : 0.8, 1.1, f ? 0.8 : 0.05); block(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 'deco'); inter(x, z + (f ? 0 : 1), 1.4, '自動販賣機（熱咖啡 2 費拉）', () => { if (S().gold < 2) { R.toast('錢不夠。'); return; } S().gold -= 2; R.save(); R.sfx && R.sfx('coin'); R.toast(pick(['罐裝熱咖啡。手暖起來了。', '熱的玉米濃湯。最後幾顆玉米粒倒不出來。', '奉主限定的混合果汁。']), '#C8B88A'); }); };
    [[-60, -54.6], [-40, 3.6], [20, -54.6], [100, 3.6], [-30, 49.8], [70, 49.8], [-12.6, -80]].forEach(([x, z]) => vend(x, z, false));
    for (let i = 0; i < 26; i++) { const x = rr(-140, 150), z = pk([-54.2, 2.6, 49.6]); if (onRoad(x, z) || inR(x, z, ARCADE, 1) || Math.abs(x) < 14) continue; const c = pk(['#C83A3A', '#3A6A8A', '#2A2A30', '#E8E4DC']); add(g3.box, lam(c, { tex: 0 }), x, 0.55, z, 0.12, 0.5, 1.6); add(g3.cyl, M.rail, x, 0.4, z - 0.6, 0.7, 0.06, 0.7, 0, 0, Math.PI / 2); add(g3.cyl, M.rail, x, 0.4, z + 0.6, 0.7, 0.06, 0.7, 0, 0, Math.PI / 2); }
    // 選舉海報（其他地方）
    [[40, -53.4], [-70, 3.4], [30, 49.6]].forEach(([x, z]) => { if (R.electionBoard) { R.electionBoard(group, x, z, 0); inter(x, z + 1.6, 2, '看競選海報（議會選舉）', R.electionSheet); } });

    // ---------- 路上的人 ----------
    const TOPS = ['#2E2E38', '#3A3A48', '#4A3A5A', '#7A5A6A', '#8A3A2E', '#2E4A6A', '#5A6A4A', '#C8A040', '#E8E4DC', '#6A5A3A', '#3A5A4A'], HAIRS = ['#1A1410', '#2A2420', '#4A3424', '#6A4A2E', '#8A8A88', '#C8C0B0'], HS = ['short', 'long', 'ponytail', 'bun', 'bob', 'crop', 'spiky'];
    let pv = 0;
    const person = (x, z, rot, o) => {
      o = o || {}; const v = pv++ % 24, top = o.top || TOPS[v % TOPS.length];
      const h = R.makeHero('warrior', null, { pool: 'hosu_' + (o.pool || '') + v, lite: 1, top, hair: o.hair || HAIRS[(v * 5) % HAIRS.length], cloak: o.cloak || TOPS[(v * 7 + 3) % TOPS.length], hs: HS[(v * 3) % HS.length], acc: o.acc || null, accCol: '#C8A040', weapon: null, shield: false });
      h.g.position.set(x, 0, z); h.g.rotation.y = rot || 0; group.add(h.g);
      const n = Object.assign({ h, x, z, rot: rot || 0 }, o.extra || {}); tw.npcs.push(n); return n;
    };
    const talker = (x, z, rot, name, lines, o) => { const n = person(x, z, rot, o); n.near = 1; n.box = block(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 'npc'); inter(x, z, 2, '和' + name + '說話', () => R.townTalk(name, [pick(lines)])); return n; };
    const WALKS = [[[-140, -70], [140, -70]], [[-140, -54], [-14, -54]], [[14, -54], [150, -54]], [[-87, -13], [-14, -13]], [[14, -13], [150, -13]], [[-87, 3], [-14, 3]], [[14, 3], [150, 3]],
      [[-12.6, -66], [-12.6, 48]], [[12.6, -66], [12.6, 48]], [[-50, -54], [-50, 16]], [[-95, 19], [150, 19]], [[-85, 37], [150, 37]], [[-140, 50], [150, 50]], [[-140, 66], [150, 66]],
      [[-30, -90], [30, -90]], [[-45, -78], [45, -78]], [[-87, -54], [-87, 50]], [[77, -54], [77, 50]], [[93, -54], [93, 50]], [[-104, -60], [-104, 18]]];
    WALKS.forEach((p, wi) => { const n = Math.max(2, Math.round(Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]) / 22)); for (let k = 0; k < n; k++) { const t = rnd(), x = p[0][0] + (p[1][0] - p[0][0]) * t, z = p[0][1] + (p[1][1] - p[0][1]) * t, d = rnd() < 0.5 ? 1 : -1; person(x, z, 0, { extra: { walk: 1, path: p, d, t, sp: rr(1.3, 2.1), off: rr(-0.8, 0.8) } }); } });
    // 說話的人
    talker(-3, -86, Math.PI, '趕車的上班族', ['「奉主人走路快。電扶梯站右邊，左邊是給趕時間的人走的。」', '「環狀線一圈四十分鐘。我上次睡過站，醒來又回到奉主站。」', '「東鶴來的？那邊的鐘慢三分鐘對吧。」']);
    talker(-47.6, -30, -Math.PI / 2, '商店街的阿姨', ['「這家的價錢可以談，你別一開口就答應。先問問買兩個算多少。」', '「你要走到拱廊另一頭？還有一大段。我每次走到一半就忍不住買東西。」', '「章魚燒要配啤酒啦，年輕人。」']);
    talker(-48, 10, Math.PI, '賣報紙的老伯', ['「號外！港區又一個外國商人被刺了……這個月第三個。」', '「四個黨都有登廣告，你要看政見翻後面。別把整疊都拿走，一份就有了。」', '「以前只有大人物會被暗殺，現在連開店的都要小心。這是什麼世道。」']);
    talker(30, -13, 0, '商務區的職員', ['「德克斯凡的魔導計算機進來以後，我們課從十二個人變成四個人。」', '「我們總公司在皇嶺，文件送來送去。都蓋好章了，那邊才說要改。」', '「中午只有十五分鐘吃飯，所以站著吃蕎麥。」']);
    talker(4, 20, Math.PI, '招福橋上的觀光客', ['「來奉主一定要在這裡學那個人偶舉手！」', '「燈籠堀晚上比白天漂亮十倍。」', '「我從吉山來的，吉山沒有這麼吵。」']);
    talker(-106, 44, Math.PI / 2, '公園的老人', ['「奉主城燒掉的那年我還沒出生。我爺爺說，整片天都是紅的。」', '「天守閣重建的時候，全城的人都捐了錢。我家捐了一個月的米錢。」', '「公園裡的松樹，是戰後一棵一棵種回來的。」']);
    talker(-99, 70, 0, '製鐵所的工人', ['「德克斯凡的新爐子，一座頂我們十個人。廠裡說要辦『轉職訓練』……訓練完還有沒有位子，誰知道。」', '「三班制，一天二十四小時爐火不能停。」', '「鋼材一半出口，一半給皇嶺蓋大樓。」']);
    talker(12, 74, 0, '工廠的技師', ['「魔導機關的核心零件還是要從德克斯凡進口，我們只能組裝。」', '「藍色的管子裡跑的是魔力，摸了會麻。別摸。」', '「合資工廠的老闆一半是德克斯凡人，開會要講兩種話。」']);
    talker(100, 74, 0, '港口的工人', ['「從這裡出港的船，一半開往德克斯凡。」', '「這櫃重量對不上，先別吊。把單子拿來，我再核一次。」', '「起重機的駕駛座離地二十五公尺，冬天風一吹，整台都在搖。」']);
    talker(55, 50.4, Math.PI, '新町的老先生', ['「奉主塔是第二代。第一代在本土城市戰的時候燒掉了。」', '「塔頂的燈白的明天晴，橘的陰，藍的下雨。比氣象台還準。」', '「將棋道場在塔的後面，我天天去，天天輸。」']);
    talker(-40, 50, Math.PI, '長屋町的小孩', ['「章魚燒要趁熱吃，可是會燙到舌頭！」', '「我長大要開環狀線的電車！」', '「媽媽說不能去港口那邊玩。」']);
    talker(118, -13, 0, '百貨公司的店員', ['「歡迎光臨奉主百貨！地下一樓是美食街。」', '「要看德克斯凡的魔導家電嗎？今天打九折，我帶您過去。」']);
    talker(-141, 19.5, Math.PI, '城門的導覽員', ['「奉主城的石垣，最大的一塊石頭叫『章石』，一百多噸重。」', '「天守閣可以上去，五費拉。天氣好看得到奉主港。」', '「導覽等一下還會講到奉主當陪都的事。要一起聽嗎？在城門那邊集合。」']);

    // ---------- 車（照路線繞圈，前面有人就停） ----------
    function car(x, z, ry, col, park) {
      const g = new TH.Group(), b = new TH.Mesh(g3.box, lam(col, { tex: 0 })); b.scale.set(1.8, 0.9, 4.2); b.position.y = 0.75; const cab = new TH.Mesh(g3.box, lam('#2A3440', { tex: 0 })); cab.scale.set(1.6, 0.75, 2.2); cab.position.set(0, 1.5, -0.2); g.add(b, cab); b.castShadow = true;
      if (col === '#16161C') { const l = new TH.Mesh(g3.box, lam('#FFD24A', { em: '#FFD24A', ei: 0.8 })); l.scale.set(0.5, 0.25, 0.3); l.position.set(0, 2.0, -0.2); g.add(l); }
      g.position.set(x, 0, z); g.rotation.y = ry; group.add(g); if (park) block(x - 2.2, x + 2.2, z - 1, z + 1, 'deco'); return g;
    }
    const ROUTES = [[[-94, -59], [84, -59], [84, -8], [-94, -8]], [[-5, -60], [-5, 58], [86, 58], [86, -60]], [[-97, -2], [-97, 57], [5, 57], [5, -2]], [[-145, -65], [150, -65], [150, -62.5], [-145, -62.5]], [[-145, 61.5], [150, 61.5], [150, 59.5], [-145, 59.5]]];
    const CARC = ['#E8E4DC', '#2A2A30', '#8A2A24', '#3A5A8A', '#C8C0B0', '#16161C', '#5A6A4A', '#E8A03A'];
    ROUTES.forEach((rt, ri) => { const n = ri < 2 ? 3 : 2; for (let k = 0; k < n; k++) { const i = (k * 2) % rt.length, [x, z] = rt[i]; const truck = rnd() < 0.2; const g = car(x, z, 0, truck ? '#E8E4DC' : pk(CARC)); if (truck) { const box = new TH.Mesh(g3.box, lam('#B8BCC0', { tex: 0 })); box.scale.set(2, 2, 3.6); box.position.set(0, 1.6, 0.9); g.add(box); } tw.cars.push({ g, x, z, path: rt, i, v: 0, route: ri }); } });

    // ---------- 地面、邊界 ----------
    const cv = paintGround(tw.foot);
    const gt = new TH.CanvasTexture(cv); gt.magFilter = TH.NearestFilter; gt.minFilter = TH.LinearFilter; gt.generateMipmaps = false; gt.encoding = TH.sRGBEncoding;
    const gm = new TH.MeshLambertMaterial({ map: gt }); if (R.groundDetail) R.groundDetail(gm, 'asphalt');
    const ground = new TH.Mesh(new TH.PlaneGeometry(GX1 - GX0, GZ1 - GZ0), gm); ground.rotation.x = -Math.PI / 2; ground.position.set((GX0 + GX1) / 2, 0, (GZ0 + GZ1) / 2); ground.receiveShadow = true; group.add(ground);
    tw.groundCanvas = cv;
    block(-260, X0, -260, 260, 'wall'); block(X0, 260, -260, Z0, 'wall'); block(-260, 260, QUAY + 0.3, 260, 'water'); block(SEA_X, 260, -40, QUAY + 1, 'water'); block(SEA_X, 260, -260, -40, 'wall');
    // 遠方的大樓（看起來城市還很大）
    for (let i = 0; i < 40; i++) { const side = i % 2, x = side ? rr(-200, X0 - 6) : rr(-200, 200), z = side ? rr(-170, 60) : rr(-175, Z0 - 6), w = rr(10, 24), d = rr(10, 24); cube(lam(pk(WALL.tall), { tex: 'cap' }), x - w / 2, 0, z - d / 2, x + w / 2, rr(20, 60), z + d / 2); }

    B.flush(group);
    scene.add(group); tw.group = group;
  };

  // ---------- 地面的畫布（也是小地圖） ----------
  function paintGround(foot) {
    const c = document.createElement('canvas'); c.width = (GX1 - GX0) * PPM; c.height = (GZ1 - GZ0) * PPM;
    const g = c.getContext('2d'), px = x => (x - GX0) * PPM, pz = z => (z - GZ0) * PPM;
    const rect = (r, col) => { g.fillStyle = col; g.fillRect(px(r[0]), pz(r[1]), (r[2] - r[0]) * PPM, (r[3] - r[1]) * PPM); };
    rect([GX0, GZ0, GX1, GZ1], '#ABA79E');
    // 人行道的磚縫
    g.fillStyle = 'rgba(0,0,0,.05)'; for (let x = GX0; x < GX1; x += 1) g.fillRect(px(x), 0, 1, c.height); for (let z = GZ0; z < GZ1; z += 1) g.fillRect(0, pz(z), c.width, 1);
    rect([GX0, 66, GX1, QUAY], '#8E8A82'); rect([-172, 68, GX1, 76], '#9A968C');
    for (let x = -170; x < SEA_X; x += 12) rect([x, 77, x + 0.4, QUAY - 1], '#C8A840');
    rect(PARK, '#6E7652'); rect([PARK[0], PARK[1], PARK[2], PARK[1] + 3], '#B8AC90');
    const { x: cx, z: cz, wall: hw, moat } = CASTLE, o = hw + moat; rect([cx - o - 3, cz - o - 3, cx + o + 3, cz + o + 3], '#C2B696'); rect([cx - o, cz - o, cx + o, cz + o], '#3E5E66'); rect([cx - hw, cz - hw, cx + hw, cz + hw], '#B8AE98'); rect([cx - 4, cz + hw, cx + 4, cz + o], '#7A5A40'); rect([cx + o - 6, cz + o, cx + o, 23], '#3E5E66');
    rect([-114, 15.5, 200, 40.5], '#B0A48E'); rect(CANAL, '#36546A');
    rect([GX0, QUAY, GX1, GZ1], '#2E4A62'); rect([SEA_X, -40, GX1, GZ1], '#2E4A62');
    // 水面的波紋
    let ws = 7; const wr = () => { ws = (ws * 16807) % 2147483647; return (ws - 1) / 2147483646; };
    [[CANAL, 260], [[GX0, QUAY, GX1, GZ1], 900], [[SEA_X, -40, GX1, QUAY], 300], [[CASTLE.x - 23, CASTLE.z - 23, CASTLE.x + 23, CASTLE.z + 23], 120]].forEach(([r, n]) => { for (let i = 0; i < n; i++) { const x = r[0] + wr() * (r[2] - r[0]), z = r[1] + wr() * (r[3] - r[1]); if (r === CANAL || !inR(x, z, [CASTLE.x - 16, CASTLE.z - 16, CASTLE.x + 16, CASTLE.z + 16])) { g.fillStyle = wr() < 0.5 ? 'rgba(200,225,240,.28)' : 'rgba(20,40,60,.25)'; g.fillRect(px(x), pz(z), (1 + wr() * 2.5) * PPM, 1); } } });
    rect(PLAZA, '#B9B3A8'); g.fillStyle = 'rgba(120,110,96,.16)'; for (let x = PLAZA[0]; x < PLAZA[2]; x += 4) g.fillRect(px(x), pz(PLAZA[1]), 1, (PLAZA[3] - PLAZA[1]) * PPM); for (let z = PLAZA[1]; z < PLAZA[3]; z += 4) g.fillRect(px(PLAZA[0]), pz(z), (PLAZA[2] - PLAZA[0]) * PPM, 1);
    rect(ARCADE, '#C8B48E');
    ROADS.forEach(r => rect(r, '#45474D'));
    ROADS.forEach(r => { const ew = r[2] - r[0] > r[3] - r[1]; g.fillStyle = '#E8E4D8'; if (ew) { const z = (r[1] + r[3]) / 2; for (let x = r[0]; x < r[2]; x += 6) g.fillRect(px(x), pz(z) - 1, 3 * PPM, 2); g.fillRect(px(r[0]), pz(r[1] + 0.4), (r[2] - r[0]) * PPM, 1); g.fillRect(px(r[0]), pz(r[3] - 0.4), (r[2] - r[0]) * PPM, 1); } else { const x = (r[0] + r[2]) / 2; g.fillStyle = r[4] === '奉主大通' ? '#E8C048' : '#E8E4D8'; g.fillRect(px(x) - 1, pz(r[1]), 2, (r[3] - r[1]) * PPM); g.fillStyle = '#E8E4D8'; g.fillRect(px(r[0] + 0.4), pz(r[1]), 1, (r[3] - r[1]) * PPM); g.fillRect(px(r[2] - 0.4), pz(r[1]), 1, (r[3] - r[1]) * PPM); } });
    // 路口：先把路口的線蓋掉，再畫斑馬線
    ROADS.filter(r => r[2] - r[0] < r[3] - r[1]).forEach(v => ROADS.filter(r => r[2] - r[0] > r[3] - r[1]).forEach(h => { if (v[0] >= h[2] || v[2] <= h[0] || h[1] >= v[3] || h[3] <= v[1]) return; const x0 = v[0], x1 = v[2], z0 = h[1], z1 = h[3]; rect([x0, z0, x1, z1], '#45474D'); g.fillStyle = '#E8E4D8';
      for (let x = x0 + 0.5; x < x1 - 0.5; x += 1.2) { g.fillRect(px(x), pz(z0 - 3.2), 0.6 * PPM, 2.6 * PPM); g.fillRect(px(x), pz(z1 + 0.6), 0.6 * PPM, 2.6 * PPM); }
      for (let z = z0 + 0.5; z < z1 - 0.5; z += 1.2) { if (x0 > -100) g.fillRect(px(x0 - 3.2), pz(z), 2.6 * PPM, 0.6 * PPM); g.fillRect(px(x1 + 0.6), pz(z), 2.6 * PPM, 0.6 * PPM); } }));
    BRIDGES.forEach(([b0, b1, , road]) => rect([b0, 22, b1, 34], road ? '#5A5A60' : '#8A6A4A'));
    // 房子的屋頂（小地圖用）
    const FC = { hall: '#5A6A7A', shed: '#6A6E74', castle: '#E8E4DA', tower: '#9A968C', office: '#7A828C', tall: '#6E747C', hotel: '#8A8680', dept: '#9A8A78', old: '#4A3A30', retro: '#7A6058', neon: '#4A4450', shop: '#8A7A6A' };
    foot.forEach(f => rect(f, FC[f[4]] || '#7A7470'));
    // 環狀線（在高架下面，地上看不到；小地圖、大地圖看得到）
    g.strokeStyle = '#E8782A'; g.lineWidth = 2.4 * PPM; g.lineJoin = 'round'; g.beginPath(); LOOP.forEach(([x, z], i) => i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))); g.closePath(); g.stroke();
    return c;
  }

  // ---------- 車票 ----------
  function ticketBack() {
    const s = S();
    R.sheet('<p class="kicker">奉主站・售票口</p><h2>往東鶴的魔導電車</h2><p>單程 ' + FARE + ' 費拉，四個鐘頭。到東鶴站。</p><p class="note">費拉 ' + s.gold + (s.gold < FARE ? '・錢不夠：站務員看了看你的勇者證：「要回東鶴？這趟先讓你搭，票錢不用付。」' : '') + '</p>',
      '<div class="row"><button type="button" class="btn pri" id="ht-go">買票，回東鶴</button><button type="button" class="btn" id="ht-tt">看時刻表</button><button type="button" class="btn" id="ht-x">再逛逛</button></div>');
    $('ht-x').onclick = R.closeSheet;
    $('ht-tt').onclick = () => R.townTalk('奉主站的時刻表', ['往東鶴：每天四班（早、午、傍晚、晚上）', '往皇嶺：每小時一班', '往吉山：每天六班', '環狀線：五分鐘一班']);
    $('ht-go').onclick = () => { s.gold = Math.max(0, s.gold - FARE); R.save(); R.closeSheet(); R.fade(backToDonghe); };
  }
  function castleTop() {
    const s = S(); if (s.gold < 5) { R.toast('要 5 費拉。'); return; }
    s.gold -= 5; R.save(); R.sfx && R.sfx('coin');
    R.townTalk('奉主城・天守閣', ['爬了五層的木樓梯，到了最上面的望樓。', '北邊是奉主站和繞著城的高架，橘色的環狀線一班接一班地跑；', '南邊的燈籠堀一路亮到海邊，再過去是製鐵所的煙囪、港口的起重機和停在外海的大貨船。', '西南邊很遠的地方，看得到皇嶺方向的山。']);
  }
  function towerTop() {
    const s = S(); if (s.gold < 5) { R.toast('要 5 費拉。'); return; }
    s.gold -= 5; R.save(); R.sfx && R.sfx('coin');
    R.townTalk('奉主塔・展望台', ['電梯晃了一下，停在離地九十公尺的展望台。', '腳下是新町的屋頂和霓虹，北邊燈籠堀的紅燈籠連成一條線；', '再過去是新堂町的大樓、奉主站，和像腰帶一樣繞著城的環狀線。', '塔頂的燈今天是' + pick(['白的——明天會放晴。', '橘的——明天是陰天。', '藍的——明天要下雨，記得帶傘。'])]);
  }
  const backToDonghe = () => {
    R.enterTownNow(null, [0, 0]);
    const tw = W.town, P = W.P, st = tw && tw.inter.find(it => typeof it.label === 'string' && /東鶴站/.test(it.label));
    if (st && P) { P.x = st.x; P.z = st.z + 1.2; R.collide(P, 0.42); P.h.g.position.set(P.x, 0, P.z); R.placeCam(null); }
    R.banner('東鶴', '搭魔導電車從奉主回來了');
  };

  // ---------- 進奉主 ----------
  const enter = () => {
    const TH = T();
    R.initGL();
    if (W.inside) { try { R.disposeScene(W.scene); } catch (e) { } if (W.outside) try { R.disposeScene(W.outside.scene); } catch (e) { } }
    else if (W.scene) R.disposeScene(W.scene);
    W.run = null; W.enemies = []; W.shots = []; W.drops = []; W.zones = []; W.fxs = []; W.dyn = []; W.F = null; W.inside = null; W.outside = null;
    W.town = { t: 0, hosu: 1, from: null }; R.clearNums && R.clearNums();
    W.scene = R.markScene(new TH.Scene());
    const sky = new TH.Color('#8E9CB4').convertSRGBToLinear(); W.scene.background = sky; W.scene.fog = new TH.FogExp2(sky, 0.008);
    W.scene.add(new TH.HemisphereLight(new TH.Color('#DCE2EE').convertSRGBToLinear(), new TH.Color('#5A5048').convertSRGBToLinear(), 0.9));
    const sun = new TH.DirectionalLight(new TH.Color('#FFD8B0').convertSRGBToLinear(), 1.05); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 110; sun.shadow.bias = -0.0012;
    W.scene.add(sun); W.scene.add(sun.target); W.moon = sun; W.torch = null;
    build(W.scene);
    const cls = S().cls, eq = R.equipped(cls), P = { cls, speed: R.CLASSES[cls].speed * 1.2, h: R.makePlayerHero(cls, eq.weapon ? eq.weapon.base : R.STARTER[cls], eq), aimA: 0, yaw: 0 };
    W.P = P; W.scene.add(P.h.g); P.x = 0; P.z = -88.5;
    R.spawnTownAllies();
    R.showScreen('run'); $('run').classList.add('town'); W.paused = false;
    if (R.SEE) R.SEE.r.value = 3.6;
    W.cam.yawT = 0; R.placeCam(null);
    try { W.renderer.compile(W.scene, W.camera); } catch (e) { }
    hud(true);
    ['r-hurt', 'r-blind', 'r-field'].forEach(id => { const v = $(id); if (v) v.style.opacity = 0; });
    const s = S(), first = !s.hosuVisits; s.hosuVisits = (s.hosuVisits || 0) + 1; R.save();
    R.banner('奉主', '昭旭的陪都・魔導電車坐了四個鐘頭');
    if (first) setTimeout(() => R.toast('第一次來奉主：Tab 看地圖。觀光景點有章可以蓋；回東鶴到北邊的奉主站買票。', '#E8C04A'), 3800);
  };
  R.goHosu = () => { const s = S(); s.gold = Math.max(0, s.gold - FARE); R.save(); R.closeSheet(); R.fade(enter); };
  R.inHosu = () => !!(W.town && W.town.hosu);
  R.hosuEnter = enter;   // 不收車錢、直接進奉主（hosubranch.js：從奉主分館出發的遺跡回來）

  // ---------- 每一格 ----------
  const smokeGeo = () => smokeGeo.g || (smokeGeo.g = (() => { const g = new (T().SphereGeometry)(0.45, 6, 5); g.userData.shared = true; return g; })());
  const pathPos = (tw, s) => { const L = tw.loopL; s = ((s % L) + L) % L; let i = LOOP.length - 1; for (let k = 0; k < LOOP.length; k++) if (tw.loopAcc[k] <= s) i = k; const a = LOOP[i], b = LOOP[(i + 1) % LOOP.length], seg = Math.hypot(b[0] - a[0], b[1] - a[1]), t = (s - tw.loopAcc[i]) / seg; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  const step = dt => {
    const tw = W.town, P = W.P, I = R.input; if (!tw || !P) return;
    tw.t += dt;
    let mx = 0, mz = 0;
    if (!P.busy) { if (I.keys.w || I.keys.arrowup) mz -= 1; if (I.keys.s || I.keys.arrowdown) mz += 1; if (I.keys.a || I.keys.arrowleft) mx -= 1; if (I.keys.d || I.keys.arrowright) mx += 1; if (I.moveStick) { mx += I.moveStick.x; mz += I.moveStick.y; } }
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    if (P.sit) { if (ml > 0.1) { P.sit = false; P.h.sit = false; } else { mx = mz = 0; } }
    const cy = Math.cos(W.cam.yaw), sy = Math.sin(W.cam.yaw), wx = mx * cy + mz * sy, wz = -mx * sy + mz * cy, run = R.running() ? 2.2 : 1;
    P.x += wx * P.speed * run * dt; P.z += wz * P.speed * run * dt; R.collide(P, 0.42);
    if (ml > 0.1) P.yaw = Math.atan2(wx, wz); P.aimA = P.yaw;
    P.h.g.position.set(P.x, 0, P.z); P.h.g.rotation.y = P.yaw; R.animHero(P.h, ml * P.speed * run, dt, false);
    try { R.townAllies(dt); } catch (e) { }
    // 路人：沿著人行道來回走；說話的人看著你
    tw.npcs.forEach(n => {
      if (!n.walk) { if (n.near) { const d = Math.hypot(P.x - n.x, P.z - n.z); n.h.g.rotation.y = d < 3.5 ? Math.atan2(P.x - n.x, P.z - n.z) : n.rot; } R.animHero(n.h, 0, dt, false); return; }
      if (Math.abs(n.x - P.x) > 60 || Math.abs(n.z - P.z) > 60) { n.t += n.d * n.sp * dt / Math.hypot(n.path[1][0] - n.path[0][0], n.path[1][1] - n.path[0][1]); if (n.t > 1 || n.t < 0) { n.d *= -1; n.t = Math.max(0, Math.min(1, n.t)); } return; }
      const [a, b] = n.path, L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      const blocked = Math.hypot(P.x - n.x, P.z - n.z) < 1.1 && ((P.x - n.x) * ux + (P.z - n.z) * uz) * n.d > 0;
      if (!blocked) n.t += n.d * n.sp * dt / L; if (n.t > 1 || n.t < 0) { n.d *= -1; n.t = Math.max(0, Math.min(1, n.t)); }
      n.x = a[0] + (b[0] - a[0]) * n.t - uz * n.off * n.d; n.z = a[1] + (b[1] - a[1]) * n.t + ux * n.off * n.d;
      const ang = Math.atan2(ux * n.d, uz * n.d); n.h.g.position.set(n.x, 0, n.z); n.h.g.rotation.y = ang; R.animHero(n.h, blocked ? 0 : n.sp, dt, false);
    });
    // 車
    tw.cars.forEach(c => {
      const [tx, tz] = c.path[(c.i + 1) % c.path.length], dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz); if (d < 0.6) { c.i = (c.i + 1) % c.path.length; return; }
      const ux = dx / d, uz = dz / d;
      const stop = [P].concat(tw.cars.filter(o => o !== c && o.route === c.route)).some(o => { const ox = o.x - c.x, oz = o.z - c.z, al = ox * ux + oz * uz, sd = Math.abs(ox * uz - oz * ux); return al > 0.5 && al < (o === P ? 6.5 : 8) && sd < 1.8; });
      c.v = Math.max(0, Math.min(9, (c.v || 0) + (stop ? -16 : 4) * dt)); c.x += ux * c.v * dt; c.z += uz * c.v * dt;
      c.g.position.set(c.x, 0, c.z); c.g.rotation.y = Math.atan2(-ux, -uz);   // 車頭朝 -z（駕駛座在前面）
    });
    // 環狀線的電車
    tw.trains.forEach(tr => { tr.s += 15 * dt; tr.cars.forEach((g, k) => { const f = pathPos(tw, tr.s - k * 14.8), b = pathPos(tw, tr.s - k * 14.8 - 13.6); g.position.set((f[0] + b[0]) / 2, DECK + 0.75, (f[1] + b[1]) / 2); g.rotation.y = Math.atan2(f[0] - b[0], f[1] - b[1]); }); });
    // 遊覽船、大章魚、大看板、霓虹
    if (tw.boat) { const bt = tw.boat; bt.x += bt.d * 3 * dt; if (bt.x > 150 || bt.x < -95) bt.d *= -1; bt.g.position.set(bt.x, 0.1 + Math.sin(tw.t * 1.4) * 0.05, 28); bt.g.rotation.y = bt.d > 0 ? Math.PI / 2 : -Math.PI / 2; }
    if (tw.octo) tw.octo.legs.forEach((l, k) => { l.rotation.x = Math.sin(tw.t * 2 + k) * 0.35; });
    if (tw.bb) { const k = Math.floor(tw.t / 0.7) % 2; if (k !== tw.bb.k) { tw.bb.k = k; tw.bb.m.map = k ? tw.bb.t2 : tw.bb.t1; tw.bb.m.needsUpdate = true; } }
    tw.neonT = (tw.neonT || 0) - dt; if (tw.neonT <= 0) { tw.neonT = 0.12; tw.neon.forEach(n => { const on = Math.sin(tw.t * 3 + n.ph) > -0.92 || Math.random() < 0.5; n.m.visible = on; }); }
    // 煙
    tw.puff = (tw.puff || 0) - dt;
    if (tw.puff <= 0) { tw.puff = 0.3; tw.smokes.forEach(s => { if (Math.abs(s.x - P.x) + Math.abs(s.z - P.z) > 70) return; let m = tw.pool.pop(); if (!m) { m = new (T().Mesh)(smokeGeo(), new (T().MeshBasicMaterial)({ color: '#8A8A90', transparent: true, opacity: 0.5, depthWrite: false })); tw.group.add(m); } m.visible = true; m.material.color.set(s.big ? '#6A6A70' : '#A0A0A8'); m.position.set(s.x + (Math.random() - 0.5), s.y, s.z + (Math.random() - 0.5)); m.scale.setScalar(s.big ? 2 : 1.2); tw.fx.push({ m, life: 3.2, big: s.big }); }); }
    tw.fx = tw.fx.filter(f => { f.life -= dt; f.m.position.y += dt * 1.6; f.m.position.x += dt * 0.8; f.m.scale.multiplyScalar(1 + dt * 0.45); f.m.material.opacity = Math.max(0, f.life / 3.2 * 0.5); if (f.life <= 0) { f.m.visible = false; tw.pool.push(f.m); return false; } return true; });
    R.placeCam(dt, 0);
    W.moon.position.set(P.x - 16, 30, P.z + 10); W.moon.target.position.set(P.x, 0, P.z);
    R.updateSee(true, P, W.camera);
    hud(false, dt);
    R.drawMinimap();
  };

  // ---------- 狀態列、小地圖、大地圖、選單 ----------
  let slowT = 0, lastLbl = '';
  function hud(force, dt) {
    slowT += dt || 0; if (!force && slowT < 0.2) return; slowT = 0;
    const P = W.P, s = S(), name = areaAt(P.x, P.z), date = R.today ? R.shortDate() : '公元 2836 年・冬';
    if (name + date !== lastLbl || force) { lastLbl = name + date; $('r-where').innerHTML = '<b>奉主・' + esc(name) + '</b><small>' + esc(date) + '　' + esc(R.clsName(s.cls)) + ' Lv ' + s.classes[s.cls].lv + '</small>'; }
    $('r-town').innerHTML = '<span>費拉 <b>' + s.gold + '</b></span><span>回復藥 <b>' + s.potions.hp + '</b></span><span>魔力藥 <b>' + s.potions.mp + '</b></span>';
    const it = R.townNear(); $('r-prompt').hidden = !it; if (it) $('r-prompt').innerHTML = '<kbd>' + (R.touch ? '互動' : '空白') + '</kbd>' + esc(it.label);
    const wp = $('r-wp'); if (wp) wp.hidden = true;
  }
  const drawMini = (x, s) => {
    const P = W.P, tw = W.town, yaw = W.cam.yaw, zoom = 0.9, k = PPM;
    x.save(); x.translate(s / 2, s / 2); x.rotate(yaw); x.scale(zoom / k * 1.4, zoom / k * 1.4); x.translate(-(P.x - GX0) * k, -(P.z - GZ0) * k);
    x.imageSmoothingEnabled = false; x.drawImage(tw.groundCanvas, 0, 0); x.restore();
    const pt = (wx, wz) => { const dx = (wx - P.x) * zoom * 1.4, dz = (wz - P.z) * zoom * 1.4, c = Math.cos(yaw), sn = Math.sin(yaw); return [s / 2 + dx * c - dz * sn, s / 2 + dx * sn + dz * c]; };
    tw.inter.forEach(it => { if (!it.icon) return; const m = pt(it.x, it.z); if (m[0] < 4 || m[1] < 4 || m[0] > s - 4 || m[1] > s - 4) return; x.fillStyle = it.icon; x.strokeStyle = '#141018'; x.lineWidth = 1.5; x.beginPath(); x.arc(m[0], m[1], 4, 0, Math.PI * 2); x.fill(); x.stroke(); });
  };
  const LABELS = [['奉主站', 0, -103], ['千燈通商店街', -50, -34], ['新堂町', 44, -34], ['奉主百貨', 120, -34], ['燈籠堀', 60, 28], ['奉主城', -134, -6], ['長屋町', -50, 45], ['新町・奉主塔', 46, 45], ['奉主製鐵所', -100, 90], ['魔導機關工廠', 12, 90], ['奉主港', 110, 112], ['環狀線', -166, -40]];
  const bigMap = () => {
    if (R.sheetOpen && R.sheetOpen()) { R.closeSheet(); return; }
    const tw = W.town, P = W.P, vb = [X0 - 4, Z0 - 4, X1 + 30, Z1 + 26], ww = vb[2] - vb[0], wh = vb[3] - vb[1], wpx = Math.max(300, Math.min(820, Math.floor(window.innerWidth * 0.84))), sc = wpx / ww, hpx = Math.round(wh * sc);
    R.sheet('<h2>奉主</h2><canvas id="hs-big" width="' + wpx + '" height="' + hpx + '" style="width:100%;max-width:' + wpx + 'px;border-radius:8px;display:block;margin:0 auto"></canvas><p class="note">黃點是你；金色的點是觀光景點（蓋過章的變綠）、橘色是小吃。回東鶴：到北邊的奉主站。</p>',
      '<div class="row"><button type="button" class="btn pri" id="hs-bx">關上（Tab）</button></div>');
    $('hs-bx').onclick = R.closeSheet;
    const x = $('hs-big').getContext('2d'), pt = (wx, wz) => [(wx - vb[0]) * sc, (wz - vb[1]) * sc];
    x.imageSmoothingEnabled = true; x.drawImage(tw.groundCanvas, (vb[0] - GX0) * PPM, (vb[1] - GZ0) * PPM, ww * PPM, wh * PPM, 0, 0, wpx, hpx);
    const g = stamps();
    tw.inter.forEach(it => { if (!it.icon) return; const m = pt(it.x, it.z), sid = (/觀光景點：([^（]*)/.exec(it.label) || [])[1], done = sid && SIGHTS.some(v => v[1] === sid && g[v[0]]); x.fillStyle = done ? '#5AC87A' : it.icon; x.strokeStyle = '#141018'; x.lineWidth = 1.5; x.beginPath(); x.arc(m[0], m[1], 4.5, 0, Math.PI * 2); x.fill(); x.stroke(); });
    x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    LABELS.forEach(([t, wx, wz]) => { const m = pt(wx, wz), w = x.measureText(t).width + 8; x.fillStyle = 'rgba(244,233,205,.88)'; x.fillRect(m[0] - w / 2, m[1] - 8, w, 16); x.fillStyle = '#1A1410'; x.fillText(t, m[0], m[1]); });
    const m = pt(P.x, P.z); x.fillStyle = '#FFE08A'; x.strokeStyle = '#1A1410'; x.lineWidth = 2; x.beginPath(); x.arc(m[0], m[1], 6, 0, Math.PI * 2); x.fill(); x.stroke();
  };
  const menu = () => {
    R.sheet('<h2>奉主</h2><p class="note">' + (R.today ? esc(R.dateLabel()) : '') + '</p><p class="note">' + (R.touch ? '左搖桿移動・靠近人或店按「互動」' : 'WASD 移動・Shift 跑步・空白鍵互動・Q／E 轉視角・Tab 地圖') + '。回東鶴：到北邊的奉主站買票（' + FARE + ' 費拉）。</p>',
      '<div class="row"><button type="button" class="btn pri" id="hm-x">繼續</button><button type="button" class="btn" id="hm-map">奉主地圖</button><button type="button" class="btn" id="hm-book">奉主觀光手冊</button>' + (R.reportClip ? '<button type="button" class="btn" id="hm-clip">回報穿模</button>' : '') + '<button type="button" class="btn" id="hm-title">回到標題</button></div>');
    $('hm-x').onclick = R.closeSheet; $('hm-map').onclick = () => { R.closeSheet(); setTimeout(bigMap, 30); }; $('hm-book').onclick = book;
    if ($('hm-clip')) $('hm-clip').onclick = () => { R.closeSheet(); setTimeout(R.reportClip, 50); };
    $('hm-title').onclick = () => { R.save(); R.closeSheet(); R.leaveTown(); if (R.goTitle) R.goTitle(); };
  };

  // ---------- 接上：在奉主的時候換成這個檔案的 ----------
  const ts0 = R.townStep; R.townStep = dt => (W.town && W.town.hosu ? step(dt) : ts0(dt));
  const th0 = R.townHud; R.townHud = (f, dt) => (W.town && W.town.hosu ? hud(f, dt) : th0(f, dt));
  const tm0 = R.townMenu; R.townMenu = (...a) => (W.town && W.town.hosu ? menu() : tm0(...a));
  const bm0 = R.bigMap; R.bigMap = (...a) => (W.town && W.town.hosu && !W.run ? bigMap() : bm0(...a));
  const dm0 = R.drawTownMinimap; R.drawTownMinimap = (x, s) => (W.town && W.town.hosu ? drawMini(x, s) : dm0(x, s));
  const db0 = R.drawTownBig; R.drawTownBig = (x, s) => (W.town && W.town.hosu ? null : db0(x, s));
  const ta0 = R.townArea; R.townArea = () => (W.town && W.town.hosu ? '奉主・' + areaAt(W.P.x, W.P.z) : ta0());
  const en0 = R.enterTownNow; R.enterTownNow = (...a) => { if (R.SEE) R.SEE.r.value = 2.5; return en0(...a); };

  // ---------- 東鶴站的售票口：多一個「到奉主」 ----------
  const ih0 = R.interiorHud;
  R.interiorHud = (force, dt) => {
    ih0(force, dt);
    const ins = W.inside; if (!ins || ins.kind !== 'trainst' || ins.hosuHooked) return; ins.hosuHooked = 1;
    const it = ins.inter.find(v => /售票口/.test(v.label)); if (!it) return;
    const orig = it.act;
    it.label = '售票口：搭魔導電車（奉主、遠方的遺跡）';
    it.act = () => {
      R.sheet('<p class="kicker">東鶴站・售票口</p><h2>要搭到哪裡？</h2><p>「往奉主的魔導電車，單程 ' + FARE + ' 費拉，四個鐘頭。往南到奉主。要買幾張？」</p><p class="note">費拉 ' + S().gold + '</p>',
        '<div class="row"><button type="button" class="btn pri" id="hs-go">到奉主（' + FARE + ' 費拉）</button><button type="button" class="btn" id="hs-ruin">到遠方的遺跡</button><button type="button" class="btn" id="hs-no">不搭了</button></div>');
      $('hs-go').onclick = () => { if (S().gold < FARE) { R.toast('錢不夠（要 ' + FARE + ' 費拉）。'); return; } R.goHosu(); };
      $('hs-ruin').onclick = () => { R.closeSheet(); orig(); }; $('hs-no').onclick = R.closeSheet;
    };
  };
  const css = document.createElement('style');
  css.textContent = '.dn-menu{display:grid;gap:6px}.dn-menu .btn{text-align:left;white-space:normal}';
  document.head.appendChild(css);
})(window.R);
