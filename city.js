// 討伐令 1433：東鶴的都市計畫（照 1990 年代日本地方都市的樣子）
// 道路分三級：主幹道（四線道、中央線、人行道、行道樹、紅綠燈、天橋）→ 副幹道（雙線道、T 字路口、錯開的路口）→ 巷子（窄、會轉彎、有死巷）。
// 舊城（城牆、城門、外濠）在中間；北邊是鐵路、東鶴站、站前廣場、拱廊商店街、百貨公司；東邊是官廳街、新商區、選礦廠；
// 西邊、南邊是住宅區（公寓、錢湯、寺、小學）；西河岸對面是河西；南渠外是田。房子最高六層樓，沒有高樓大廈。
// 座標：示意圖的 1 單位＝0.44 公尺（整張 440 公尺見方）。town.js、suburbs.js、civic.js 都照這一份擺東西。
// 這個檔案只有資料（不碰 three.js）：道路、水、鐵路、分區、每一塊地（自動沿著路排）、路人走的路網、車的路線、紅綠燈、小地圖。
(function (R) {
  const S = 0.44, WX = sx => (sx - 500) * S, WZ = sy => (sy - 500) * S, HALF = 500 * S;
  let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const C = R.CITY = { S, WX, WZ, HALF };

  // ---------- 地形 ----------
  C.stream = [[0, 152], [130, 144], [260, 158], [400, 142], [520, 136], [640, 126], [780, 120], [900, 112], [1000, 106]];   // 霜溪（西 → 東）
  C.river = [[200, 100], [203, 300], [197, 450], [201, 600], [207, 760], [203, 900], [209, 1000]];                      // 西河岸的河（北 → 南）
  C.water = [
    { kind: 'stream', pts: C.stream, w: 22 },
    { kind: 'river', pts: C.river, w: 50 },
    { kind: 'canal', pts: [[230, 946], [1000, 946]], w: 22 },          // 南渠
    { kind: 'moat', pts: [[400, 453], [740, 453]], w: 18 }               // 外濠（舊城北邊的護城河，剩下的一段）
  ];
  C.OLD = [400, 470, 740, 770];                                          // 舊城的城牆
  C.GATES = { n: [620], s: [560], w: [640], e: [596] };                  // 北門對著站前大通；南門往西錯開（城下町的鍵の手）
  C.GW = 22;

  // ---------- 鐵路、車站 ----------
  C.RAIL = { y: 232, t: [222, 242], y0: 212, y1: 252, fn: 209, fs: 255 };
  C.BRIDGE = [170, 232];                                                 // 鐵橋（過西河岸）
  C.PLAT = [550, 227, 700, 237];                                         // 島式月台
  C.STATION = [575, 262, 665, 290];                                      // 站房（門朝南）
  C.PLAZA = [530, 294, 710, 350];                                        // 站前廣場（公車、計程車的圓環）

  // ---------- 道路 ----------
  // kind：main 主幹道、sub 副幹道、lane 巷子、old 舊城的石板路、olane 舊城的小路、arcade 拱廊商店街（只能走路）、dirt 城外的泥土路
  const RW = { main: 48, sub: 28, lane: 11, old: 18, olane: 10, arcade: 18, dirt: 16 };
  C.RW = RW;
  C.roads = [];
  const road = (kind, pts, name, o) => { const r = Object.assign({ kind, pts, w: RW[kind], name: name || '' }, o || {}); C.roads.push(r); return r; };
  // 主幹道
  road('main', [[0, 410], [150, 410], [250, 410], [400, 412], [770, 412], [1000, 648]], '國道一號');   // 西邊過河（新大橋）、沿著外濠、出了舊城東北角斜向東南（往皇嶺）
  road('main', [[620, 350], [620, 412]], '站前大通');
  // 副幹道
  road('sub', [[470, 168], [470, 412]], '站西通');                       // 北口 → 平交道 → 國道
  road('sub', [[800, 255], [800, 412]], '站東通');
  road('sub', [[800, 324], [1000, 324]], '站前東通');
  road('sub', [[878, 168], [876, 412], [882, 560], [866, 760], [872, 946]], '東通');
  road('sub', [[320, 412], [316, 560], [326, 700], [320, 848], [324, 935]], '學校通');
  road('sub', [[244, 412], [246, 600], [250, 760], [248, 935]], '河岸通');
  road('sub', [[244, 848], [400, 846], [560, 852], [700, 842], [872, 848], [1000, 840]], '寺町通');
  road('sub', [[320, 640], [400, 640]], '西門通');
  road('sub', [[740, 596], [876, 596]], '東門通');
  road('sub', [[560, 770], [560, 946]], '南門通');   // 接到南渠中間：才會蓋南橋（和東通的東南橋一樣）
  road('sub', [[560, 957], [560, 1000]], '南官道');
  road('sub', [[872, 957], [872, 1000]], '東南的農道');
  road('sub', [[90, 412], [90, 935]], '河西通');
  road('sub', [[0, 640], [90, 640], [174, 640]], '西橋通', { broken: [174, 228] });   // 西橋整修中
  road('sub', [[228, 640], [244, 640]], '');
  // 舊城：石板路（北門 → 西市口 → 錯開 → 南門；西門 → 西市口 → 東門）
  road('old', [[620, 436], [620, 470], [620, 574]], '本町通');
  road('old', [[560, 650], [560, 770]], '本町通');
  road('old', [[400, 640], [548, 640]], '西市街');
  road('old', [[636, 604], [740, 596]], '西市街');
  road('olane', [[620, 520], [470, 520], [440, 532]], '參道');
  road('olane', [[404, 572], [532, 572]], '後巷');
  road('olane', [[470, 520], [470, 572]], '');
  road('olane', [[660, 604], [662, 690]], '');
  road('olane', [[620, 690], [740, 686]], '鍛冶町');
  road('olane', [[404, 758], [736, 758]], '城牆下');
  road('olane', [[500, 640], [496, 700], [520, 730], [560, 728]], '');
  road('olane', [[600, 650], [604, 690], [620, 690]], '');
  // 拱廊商店街（站前廣場往西）
  road('arcade', [[300, 322], [530, 322]], '站前商店街');
  // 巷子（住宅區）：故意不排成格子——轉彎、錯開、有的走到一半就沒路了
  [
    [[246, 470], [320, 476]], [[320, 482], [360, 480], [396, 476]], [[246, 530], [318, 526]], [[318, 590], [396, 594]],
    [[246, 560], [280, 562], [282, 600]], [[322, 520], [358, 520], [360, 560]], [[246, 700], [326, 704]], [[326, 720], [396, 716]],
    [[360, 640], [356, 700], [370, 760]], [[246, 790], [322, 786]], [[322, 800], [400, 806], [480, 800]], [[480, 800], [560, 806]],
    [[560, 800], [660, 796], [740, 792]], [[740, 790], [800, 786], [868, 790]], [[440, 852], [436, 900], [440, 935]],
    [[640, 846], [648, 935]], [[760, 844], [756, 900]], [[960, 842], [962, 935]], [[324, 900], [440, 896], [560, 900]],
    [[560, 896], [700, 900], [872, 896]], [[872, 902], [1000, 898]], [[740, 680], [800, 678], [876, 676]], [[800, 596], [800, 676]],
    [[740, 720], [790, 722]], [[876, 700], [940, 704], [1000, 702]], [[930, 704], [934, 840]], [[876, 790], [1000, 794]],
    [[800, 384], [876, 384]], [[876, 450], [930, 448]], [[930, 448], [960, 520]], [[470, 360], [540, 362]],
    [[90, 500], [174, 500]], [[0, 580], [90, 580]], [[90, 700], [174, 700]], [[0, 760], [90, 760]], [[90, 820], [174, 824]], [[0, 880], [90, 878]],
    [[470, 200], [380, 196]], [[470, 186], [560, 190]], [[876, 200], [960, 196]]
  ].forEach(p => road('lane', p));
  // 城外的泥土路：往遺跡、湯山村
  road('dirt', [[470, 168], [470, 126], [500, 92], [560, 62]], '往北山礦坑');
  road('dirt', [[500, 92], [650, 86], [800, 76]], '往霜溪石窟');
  road('dirt', [[470, 126], [350, 112], [200, 84], [130, 62]], '往湯山村');
  road('dirt', [[90, 412], [90, 396]], '');

  // ---------- 海：東鶴靠海（作者）。海岸線在示意圖 x = 975，以東是海（coast.js 蓋海、防波堤、漁港、燈塔、海水浴場）----------
  // 伸進海裡的路、河、渠都切在海岸線上；國道一號的盡頭就是漁港
  C.COAST = 975;
  const clipX = (pts, X) => {
    const runs = []; let cur = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], inP = p[0] <= X;
      if (i > 0) { const q = pts[i - 1], inQ = q[0] <= X; if (inQ !== inP) { const t = (X - q[0]) / (p[0] - q[0]), m = [X, q[1] + (p[1] - q[1]) * t]; if (inQ) { cur.push(m); runs.push(cur); cur = []; } else cur = [m]; } }
      if (inP) cur.push(p);
    }
    if (cur.length) runs.push(cur);
    return runs.sort((a, b) => b.length - a.length)[0] || [];
  };
  C.roads.forEach(r => { r.pts = clipX(r.pts, C.COAST - 3); });
  C.roads = C.roads.filter(r => r.pts.length >= 2 && Math.hypot(r.pts[r.pts.length - 1][0] - r.pts[0][0], r.pts[r.pts.length - 1][1] - r.pts[0][1]) > 6);
  C.water.forEach(w => { w.pts = clipX(w.pts, C.COAST); });

  // ---------- 幾何 ----------
  const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)); return Math.hypot(px - (ax + dx * t), py - (ay + dy * t)); };
  const lineDist = (px, py, pts) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; };
  const segX = (a, b, c, d) => {
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6 ? [a[0] + r[0] * t, a[1] + r[1] * t, Math.atan2(r[1], r[0]), t, u] : null;
  };
  C.segDist = segDist; C.lineDist = lineDist; C.segX = segX;
  // 這個點在不在車道上（人行道不算；拱廊商店街、泥土路不算）：路燈、電線桿、樹、反射鏡、腳踏車擺之前先問
  C.inCarriage = (sx, sy, pad) => C.roads.some(rd => rd.kind !== 'dirt' && rd.kind !== 'arcade' && lineDist(sx, sy, rd.pts) < rd.w / 2 - (rd.kind === 'main' ? 4 : rd.kind === 'sub' ? 3 : 0.5) - (pad || 0));
  // 折線往旁邊平移（o > 0：往行進方向的右手邊）
  const offsetLine = (pts, o) => pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [p[0] - dy / L * o, p[1] + dx / L * o];
  });
  C.offsetLine = offsetLine;

  // ---------- 橋：路和水交叉的地方 ----------
  C.bridges = [];
  C.roads.forEach(rd => {
    if (rd.kind === 'arcade') return;
    for (let i = 0; i < rd.pts.length - 1; i++) C.water.forEach(wt => { for (let j = 0; j < wt.pts.length - 1; j++) { const h = segX(rd.pts[i], rd.pts[i + 1], wt.pts[j], wt.pts[j + 1]); if (h && !C.bridges.some(b => Math.hypot(b.sx - h[0], b.sy - h[1]) < 20)) C.bridges.push({ sx: h[0], sy: h[1], ang: h[2], len: wt.w + 10, wid: rd.w - (rd.kind === 'main' ? 4 : 0), ok: true, kind: wt.kind, road: rd }); } });
  });
  // 西橋：路斷在河上（整修中）
  C.bridges.push({ sx: 201, sy: 640, ang: 0, len: 60, wid: 24, ok: false, kind: 'river', name: '西橋' });
  C.bridges.forEach(b => { if (b.kind === 'river' && b.ok) b.name = b.sy < 500 ? '新大橋' : '河西橋'; if (b.kind === 'canal') b.name = b.sx < 700 ? '南橋' : '東南橋'; if (b.kind === 'moat') b.name = '北門橋'; if (b.kind === 'stream') b.name = '霜溪橋'; });

  // ---------- 平交道 ----------
  C.CROSS = [];
  C.roads.forEach(rd => { if (rd.kind === 'arcade') return; for (let i = 0; i < rd.pts.length - 1; i++) { const [ax, ay] = rd.pts[i], [bx, by] = rd.pts[i + 1]; if ((ay - C.RAIL.y) * (by - C.RAIL.y) < 0) C.CROSS.push(ax + (bx - ax) * (C.RAIL.y - ay) / (by - ay)); } });
  // 站西通、東通：北邊那一段是另外畫的（中間是軌道）——補上連起來的一段
  road('sub', [[470, 168], [470, 255]], ''); road('sub', [[878, 168], [878, 255]], '');
  C.CROSS = [470, 878];

  // ---------- 分區 ----------
  // res 住宅、com 商業（站前）、old 舊城、civic 官廳街、ind 工業、farm 田、kasai 河西（住宅）
  C.ZONES = [
    { k: 'farm', r: [0, 0, 1000, 209] },
    { k: 'com', r: [252, 255, 800, 440] },
    { k: 'ind', r: [800, 255, 1000, 440] },
    { k: 'old', r: C.OLD },
    { k: 'civic', r: [740, 440, 1000, 700] },
    { k: 'res', r: [0, 440, 1000, 946] },
    { k: 'farm', r: [0, 956, 1000, 1000] }
  ];
  const zoneAt = (x, y) => { for (const z of C.ZONES) if (x >= z.r[0] && x < z.r[2] && y >= z.r[1] && y < z.r[3]) return z.k; return 'res'; };
  C.zoneAt = zoneAt;

  // ---------- 設施的位置（門朝南，除了另外註明的） ----------
  // [x, y]：建築物中心（示意圖座標）；town.js、civic.js、suburbs.js 照這裡蓋
  C.FAC = {
    guild: [575, 550], board: [544, 592], news: [612, 588], store: [522, 552], pharmacy: [470, 616], tavern: [430, 610],
    exchange: [546, 672], shrine: [500, 494], smith: [690, 578], suga: [628, 664], dojo: [650, 700, 730, 750],
    stalls: [[676, 676], [702, 676], [728, 676]], park: [520, 706], alley: [404, 532, 572],
    coach: [700, 372], firetower: [770, 818], clock: [905, 470], factory: [948, 286], farmhouse: [764, 182],
    dexTrade: [826, 298], dexParts: [847, 299], cafe: [838, 364],
    fishMarket: [952, 872], beachHut: [958, 168],   // coast.js：魚市場、海水浴場的小屋
    // civic.js
    pref: [808, 540], guardHQ: [790, 652], bank: [560, 370], hospital: [818, 792], post: [942, 776], paper: [942, 690], theater: [680, 878], dept: [748, 324],
    // 站前（suburbs.js）
    koban: [525, 340], busStop: [[672, 346], [694, 346]], clockPillar: [590, 330],
    // 新的：錢湯、寺、公寓（公團住宅）、旅館、柏青哥、電玩店、卡拉 OK、喫茶店、書店
    bath: [362, 676], temple: [470, 906], danchi: [[280, 470], [280, 500]], hotel: [404, 372], pachinko: [512, 368], game: [356, 372]
  };
  // 河西的特別區域（suburbs.js）
  C.Z = { ruins: [16, 268, 176, 396], school: [12, 512, 76, 632], park: [104, 512, 170, 572], grove: [104, 772, 170, 812], grave: [12, 772, 76, 870], market: [104, 886, 176, 935] };
  // 特別的空地：西市口廣場、站前廣場、外濠公園、縣廳前廣場、小學的操場……（不蓋一般的房子）
  C.SQUARE = [592, 612, 26, 22];   // 西市口（橢圓：寬 23 公尺、深 19 公尺）
  C.PARKS = [[490, 682, 552, 744], [404, 464, 736, 468], [776, 562, 842, 576], [940, 410, 990, 452]];

  // ---------- 佔用的格子：路、水、鐵路、城牆、設施（2 單位一格）----------
  const GS = 2, GN = 500, occ = new Uint8Array(GN * GN);
  const setR = (x0, y0, x1, y1, v) => { for (let gy = Math.max(0, Math.floor(y0 / GS)); gy <= Math.min(GN - 1, Math.floor((y1 - 0.01) / GS)); gy++) for (let gx = Math.max(0, Math.floor(x0 / GS)); gx <= Math.min(GN - 1, Math.floor((x1 - 0.01) / GS)); gx++) occ[gy * GN + gx] = v; };
  const freeR = (x0, y0, x1, y1) => { if (x0 < 2 || y0 < 2 || x1 > 998 || y1 > 998) return false; for (let gy = Math.floor(y0 / GS); gy <= Math.floor((y1 - 0.01) / GS); gy++) for (let gx = Math.floor(x0 / GS); gx <= Math.floor((x1 - 0.01) / GS); gx++) if (occ[gy * GN + gx]) return false; return true; };
  const stamp = (pts, half, v) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.ceil(L / 1.5);
      for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; for (let gy = Math.floor((y - half) / GS); gy <= Math.floor((y + half) / GS); gy++) for (let gx = Math.floor((x - half) / GS); gx <= Math.floor((x + half) / GS); gx++) { if (gx < 0 || gy < 0 || gx >= GN || gy >= GN) continue; if (Math.hypot(gx * GS + 1 - x, gy * GS + 1 - y) <= half + 1) occ[gy * GN + gx] = v; } }
    }
  };
  C.water.forEach(w => stamp(w.pts, w.w / 2 + 6, 2));
  C.roads.forEach(r => stamp(r.pts, r.w / 2 + (r.kind === 'main' ? 3 : 2), 1));
  setR(0, C.RAIL.fn - 6, 1000, C.RAIL.fs + 6, 3);
  { const [x0, y0, x1, y1] = C.OLD; setR(x0 - 4, y0 - 4, x1 + 4, y0 + 4, 3); setR(x0 - 4, y1 - 4, x1 + 4, y1 + 4, 3); setR(x0 - 4, y0, x0 + 4, y1, 3); setR(x1 - 4, y0, x1 + 4, y1, 3); }
  setR(...C.STATION, 3); setR(C.PLAZA[0], C.PLAZA[1], C.PLAZA[2], C.PLAZA[3], 3); setR(C.PLAT[0] - 4, C.PLAT[1], C.PLAT[2] + 4, C.PLAT[3], 3);
  { const [cx, cy, rx, ry] = C.SQUARE; setR(cx - rx - 4, cy - ry - 4, cx + rx + 4, cy + ry + 4, 3); }
  C.PARKS.forEach(r => setR(...r, 3));
  Object.values(C.Z).forEach(r => setR(r[0] - 2, r[1] - 2, r[2] + 2, r[3] + 2, 3));
  // 設施的地（size：寬、深，示意圖單位；門朝南）
  const FS = {
    guild: [32, 24], board: [8, 4], news: [8, 4], store: [18, 16], pharmacy: [18, 14], tavern: [22, 19], exchange: [8, 7], shrine: [30, 34], smith: [42, 30], suga: [14, 10],
    coach: [40, 24], firetower: [8, 8], clock: [12, 12], factory: [44, 46], farmhouse: [18, 14], dexTrade: [20, 16], dexParts: [16, 14], cafe: [22, 16], fishMarket: [28, 22], beachHut: [10, 8],
    pref: [70, 44], guardHQ: [34, 26], bank: [48, 34], hospital: [62, 40], post: [30, 22], paper: [30, 24], theater: [40, 30], dept: [70, 56],
    koban: [8, 8], clockPillar: [18, 8], bath: [30, 26], temple: [56, 44], hotel: [38, 30], pachinko: [40, 30], game: [32, 28]
  };
  C.FS = FS; C._occ = occ; C._freeR = freeR;
  setR(C.COAST - 1, 0, 1000, 1000, 2); setR(948, 110, C.COAST, 206, 3);   // 海、海水浴場的沙灘：不蓋房子
  Object.keys(FS).forEach(k => { const p = C.FAC[k]; if (!p) return; const [w, d] = FS[k]; setR(p[0] - w / 2 - 2, p[1] - d / 2 - 2, p[0] + w / 2 + 2, p[1] + d / 2 + 4, 3); });
  C.FAC.stalls.forEach(([x, y]) => setR(x - 9, y - 8, x + 9, y + 12, 3));
  { const [x0, y0, x1, y1] = C.FAC.dojo; setR(x0 - 2, y0 - 2, x1 + 2, y1 + 2, 3); }
  C.FAC.danchi.forEach(([x, y]) => setR(x - 22, y - 12, x + 22, y + 12, 3));
  C.FAC.busStop.forEach(([x, y]) => setR(x - 6, y - 3, x + 6, y + 3, 3));
  // 巷子不能從設施底下穿過：碰到設施（含公團住宅）的那一段切掉，巷子走到設施前就斷（不然路面、電線桿、電線都會穿過建築）
  {
    const facR = Object.keys(FS).filter(k => C.FAC[k]).map(k => { const p = C.FAC[k], [w, d] = FS[k]; return [p[0] - w / 2 - 3, p[1] - d / 2 - 3, p[0] + w / 2 + 3, p[1] + d / 2 + 5]; })
      .concat(C.FAC.danchi.map(([x, y]) => [x - 26, y - 15, x + 26, y + 15]), [[C.FAC.dojo[0] - 3, C.FAC.dojo[1] - 3, C.FAC.dojo[2] + 3, C.FAC.dojo[3] + 3]]);
    const inside = (x, y) => facR.some(r => x > r[0] && x < r[2] && y > r[1] && y < r[3]);
    // 取樣後只留轉彎的點（點太多的話，找路口的時候會很慢）
    const simplify = pts => pts.filter((p, i) => i === 0 || i === pts.length - 1 || Math.abs((p[0] - pts[i - 1][0]) * (pts[i + 1][1] - p[1]) - (p[1] - pts[i - 1][1]) * (pts[i + 1][0] - p[0])) > 0.01);
    const kept = [];
    C.roads.forEach(rd => {
      if (rd.kind !== 'lane' && rd.kind !== 'olane') { kept.push(rd); return; }
      let cur = [];
      const flush = () => { let L = 0; for (let i = 0; i < cur.length - 1; i++) L += Math.hypot(cur[i + 1][0] - cur[i][0], cur[i + 1][1] - cur[i][1]); if (L > 10) kept.push(Object.assign({}, rd, { pts: simplify(cur) })); cur = []; };
      for (let i = 0; i < rd.pts.length - 1; i++) { const [ax, ay] = rd.pts[i], [bx, by] = rd.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2)); for (let k = i ? 1 : 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; if (inside(x, y)) flush(); else cur.push([x, y]); } }
      flush();
    });
    C.roads = kept;
  }
  // 田（北郊、南渠外）
  C.FIELDS = [[520, 160, 760, 205], [780, 150, 990, 205], [240, 166, 440, 205], [240, 962, 540, 1000], [580, 962, 860, 1000], [886, 962, 1000, 1000]];
  C.FIELDS = C.FIELDS.map(r => [r[0], r[1], Math.min(r[2], r[1] < 300 ? 944 : C.COAST - 2), r[3]]).filter(r => r[2] - r[0] > 10);   // 田不要伸進沙灘、海裡
  C.FIELDS.forEach(r => setR(...r, 3));
  C.GREENS = [[640, 164, 700, 200]];

  // ---------- 用地：沿著路一塊一塊排房子（門朝路） ----------
  // f：門朝哪邊（0 南、1 北、2 西、3 東）
  C.lots = [];
  const lot = o => { C.lots.push(o); setR(o.r[0] - 1, o.r[1] - 1, o.r[2] + 1, o.r[3] + 1, 4); return o; };
  const WALLS = ['#E8E2D4', '#D8D2C4', '#C8CCD0', '#E0D6C0', '#B8BCC2', '#D4C8B4', '#F0ECE4', '#C4B8A4', '#D8C8B8', '#B8C4C8'];
  const OLDC = ['#B8A688', '#A89478', '#C8BCA2', '#8E7A62', '#D0C4AA', '#9A9286'];
  // 站前、商店街的店名（拱廊裡、大馬路邊）
  const SHOPS = [['甘味處・和菓子', '#8A2A24', 'wagashi'], ['東鶴書房', '#2E4A3A', 'book'], ['理髮店', '#2E3A5A', 'barber'], ['定食屋・小町', '#5A3A1E', 'diner'], ['時計・眼鏡', '#3A3A44', 'watch'], ['八百屋', '#3E5A2E'], ['寫真館', '#4A3A2E', 'photo'],
    ['魚屋', '#2E4A6A'], ['德克斯凡家電', '#1E3A5A', 'dex'], ['酒屋', '#5A2A2A'], ['金物店', '#4A4A40'], ['布團店', '#5A4A6A'], ['麵包坊', '#7A4A2A'], ['花屋', '#3A5A4A'], ['唱片行', '#3A2A4A', 'record'], ['藥妝店', '#2E5A6A'], ['文具店', '#4A5A2E'], ['洋服店', '#5A3A4A'], ['拉麵・龍', '#8A2A1E', 'ramen'], ['喫茶・星', '#4A3424', 'kissa']];
  let shopI = 0;
  const lotKind = (zone, w, d, rd) => {
    const r0 = rnd();
    if (zone === 'old') return r0 < 0.12 ? { type: 'kura' } : { type: 'oldhouse', shop: r0 < 0.55, floors: r0 < 0.75 ? 2 : 1 };
    if (zone === 'com') {
      if (rd.kind === 'arcade') { const s = SHOPS[shopI++ % SHOPS.length]; return { type: 'shop', name: s[0], sc: s[1], kind: s[2], low: false, awn: pick(['#C83A3A', '#3A6A8A', '#E8A03A', '#3E7A48', '#8A3A6A']) }; }
      if (r0 < 0.42) return { type: 'midrise', floors: 3 + Math.floor(rnd() * 4) };        // 雜居大樓：3～6 層
      if (r0 < 0.58) { const s = SHOPS[shopI++ % SHOPS.length]; return { type: 'shop', name: s[0], sc: s[1], kind: s[2], awn: pick(['#C83A3A', '#3A6A8A', '#E8A03A', '#3E7A48']) }; }
      if (r0 < 0.66) return { type: 'conbini' };
      if (r0 < 0.76) return { type: 'parking', big: 1 };
      return { type: 'office', floors: 3 + Math.floor(rnd() * 3) };
    }
    if (zone === 'civic') return r0 < 0.55 ? { type: 'office', floors: 3 + Math.floor(rnd() * 3) } : r0 < 0.72 ? { type: 'midrise', floors: 3 + Math.floor(rnd() * 3) } : r0 < 0.85 ? { type: 'parking', big: 1 } : { type: 'house', floors: 2 };
    if (zone === 'ind') return r0 < 0.6 ? { type: 'warehouse' } : r0 < 0.8 ? { type: 'factory' } : { type: 'parking', big: 1 };
    if (zone === 'farm') return r0 < 0.6 ? { type: 'farm' } : r0 < 0.8 ? { type: 'warehouse' } : { type: 'garden' };
    // 住宅區
    if (rd.kind === 'main') return r0 < 0.35 ? { type: 'midrise', floors: 3 + Math.floor(rnd() * 3) } : r0 < 0.55 ? { type: 'shop', name: (() => { const s = SHOPS[shopI++ % SHOPS.length]; return s[0]; })(), sc: '#3A3A44', awn: pick(['#C83A3A', '#3A6A8A']) } : r0 < 0.7 ? { type: 'conbini' } : r0 < 0.85 ? { type: 'apt', floors: 3 } : { type: 'parking', big: 1 };
    if (r0 < 0.06) return { type: 'parking' };
    if (r0 < 0.11) return { type: 'garden' };
    if (r0 < 0.14) return { type: 'vacant' };
    if (r0 < 0.24 && w > 34) return { type: 'apt', floors: rnd() < 0.6 ? 2 : 3 };
    if (r0 < 0.28 && rd.kind === 'sub') { const s = SHOPS[shopI++ % SHOPS.length]; return { type: 'shop', name: s[0], sc: s[1], kind: s[2], low: true, awn: pick(['#C83A3A', '#3A6A8A', '#E8A03A']) }; }
    if (r0 < 0.3 && rd.kind === 'sub') return { type: 'conbini' };
    if (r0 < 0.3 && rnd() < 0.25) return { type: 'clinic' };
    return { type: 'house', floors: rnd() < 0.85 ? 2 : 1 };
  };
  // 塞滿街區：每一種分區的房子大小（示意圖單位：寬 × 深）、房子之間的空隙
  const SIZES = {
    old: [[14, 22], [12, 18], [16, 24], [12, 14], [10, 12]],
    com: [[26, 30], [22, 26], [18, 24], [14, 20], [12, 14]],
    civic: [[40, 30], [32, 26], [24, 22], [16, 16]],
    ind: [[52, 36], [40, 30], [28, 24], [18, 16]],
    res: [[22, 22], [20, 24], [24, 18], [18, 20], [16, 16], [12, 14]],
    farm: [[28, 22], [22, 18]]
  };
  const GAP = { old: 0.2, com: 0.3, civic: 2, ind: 2, res: 1.2, farm: 8 };
  // 一塊地往四個方向看，最近的路在哪一邊（0 南、1 北、2 西、3 東）、離多遠
  const roadSide = r => {
    const cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2, best = [1e9, 0];
    const cellAt = (x, y) => { const gx = Math.floor(x / GS), gy = Math.floor(y / GS); return gx >= 0 && gy >= 0 && gx < GN && gy < GN ? occ[gy * GN + gx] : 9; };
    const dirs = [[0, 1, r[3], 0], [0, -1, r[1], 1], [-1, 0, r[0], 2], [1, 0, r[2], 3]];
    dirs.forEach(([dx, dy, edge, f]) => {
      for (let s = 1; s < 30; s += 1.5) {
        const v = dx ? [-0.3, 0, 0.3].map(k => cellAt(edge + dx * s, cy + (r[3] - r[1]) * k)) : [-0.3, 0, 0.3].map(k => cellAt(cx + (r[2] - r[0]) * k, edge + dy * s));
        if (v.includes(1)) { if (s < best[0]) { best[0] = s; best[1] = f; } break; }
        if (v.some(c => c >= 3)) break;   // 先碰到別的房子、設施：這一邊不是門口
      }
    });
    return best;
  };
  const nearRoad = (x, y) => { let b = null, bd = 1e9; C.roads.forEach(rd => { const d = lineDist(x, y, rd.pts) - rd.w / 2; if (d < bd) { bd = d; b = rd; } }); return b; };
  seed = 20361;
  for (let gy = 0; gy < GN; gy++) for (let gx = 0; gx < GN; gx++) {
    if (occ[gy * GN + gx]) continue;
    const x = gx * GS, y = gy * GS, zone = zoneAt(x + 4, y + 4); if (y < 70 || (zone === 'farm' && rnd() < 0.97)) continue;
    if (rnd() < 0.015) continue;   // 偶爾留一點空地
    const gap = GAP[zone] || 1, list = SIZES[zone] || SIZES.res;
    let placed = null;
    for (let k = 0; k < list.length && !placed; k++) {
      const [w0, d0] = list[k], jw = w0 * (0.92 + rnd() * 0.16), jd = d0 * (0.92 + rnd() * 0.16);
      for (const [w, d] of rnd() < 0.5 ? [[jw, jd], [jd, jw]] : [[jd, jw], [jw, jd]]) { const r = [x + gap, y + gap, x + gap + w, y + gap + d]; if (freeR(r[0] - gap, r[1] - gap, r[2] + gap, r[3] + gap)) { placed = r; break; } }
    }
    if (!placed) continue;
    const [dist, f] = roadSide(placed), mid = f === 0 ? [(placed[0] + placed[2]) / 2, placed[3] + dist] : f === 1 ? [(placed[0] + placed[2]) / 2, placed[1] - dist] : f === 2 ? [placed[0] - dist, (placed[1] + placed[3]) / 2] : [placed[2] + dist, (placed[1] + placed[3]) / 2];
    const rd = dist < 1e8 ? nearRoad(mid[0], mid[1]) : null, back = !rd || dist > 14;
    const k = lotKind(zone, placed[2] - placed[0], placed[3] - placed[1], rd || { kind: 'lane' });
    if (back && (k.type === 'shop' || k.type === 'conbini' || k.type === 'clinic')) { k.type = zone === 'old' ? 'oldhouse' : zone === 'com' ? 'midrise' : 'house'; k.floors = k.floors || (k.type === 'midrise' ? 3 : 2); }   // 改成住家要補層數（不然高度是 NaN）
    lot(Object.assign({ r: placed, f: back ? (rnd() < 0.5 ? 0 : 1) : f, zone, col: zone === 'old' ? pick(OLDC) : pick(WALLS), yard: rnd(), road: rd ? rd.kind : null, back }, k));
  }

  // ---------- 路人走的路網：大路走兩邊的人行道、小路走中間 ----------
  C.nodes = []; C.adj = [];
  const hash = new Map(), hk = (x, y) => Math.floor(x / 20) + ',' + Math.floor(y / 20);
  const addNode = (x, y) => { const i = C.nodes.length; C.nodes.push([x, y]); C.adj.push([]); const k = hk(x, y); if (!hash.has(k)) hash.set(k, []); hash.get(k).push(i); return i; };
  const link = (a, b) => { if (a === b || C.adj[a].includes(b)) return; C.adj[a].push(b); C.adj[b].push(a); };
  const chains = [];
  C.roads.forEach(rd => {
    if (rd.kind === 'dirt') return;
    const offs = rd.kind === 'main' ? [-(rd.w / 2 - 4), rd.w / 2 - 4] : rd.kind === 'sub' ? [-(rd.w / 2 - 3), rd.w / 2 - 3] : [0];
    offs.forEach(o => {
      const pts = o ? offsetLine(rd.pts, o) : rd.pts, ids = [];
      for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / 18)); for (let k = i ? 1 : 0; k <= n; k++) ids.push(addNode(ax + (bx - ax) * k / n, ay + (by - ay) * k / n)); }
      for (let i = 0; i < ids.length - 1; i++) link(ids[i], ids[i + 1]);
      chains.push(ids);
    });
  });
  // 路口：不同的路靠得很近的點連起來
  C.nodes.forEach(([x, y], i) => { const gx = Math.floor(x / 20), gy = Math.floor(y / 20); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) (hash.get((gx + dx) + ',' + (gy + dy)) || []).forEach(j => { if (j > i && Math.hypot(C.nodes[j][0] - x, C.nodes[j][1] - y) < 16 && !C.adj[i].includes(j)) link(i, j); }); });
  // 鐵路：只能從平交道過——跨過軌道的連線拿掉（平交道那裡的保留）
  C.adj.forEach((nb, i) => { C.adj[i] = nb.filter(j => { const a = C.nodes[i], b = C.nodes[j]; if ((a[1] - C.RAIL.y) * (b[1] - C.RAIL.y) >= 0) return true; return C.CROSS.some(cx => Math.abs((a[0] + b[0]) / 2 - cx) < 16); }); });

  // ---------- 車：靠左行駛（主幹道、副幹道），到頭就迴轉 ----------
  C.carRoutes = [];
  C.roads.filter(r => (r.kind === 'main' || r.kind === 'sub') && r.name && !r.broken).forEach(rd => {
    let L = 0; for (let i = 0; i < rd.pts.length - 1; i++) L += Math.hypot(rd.pts[i + 1][0] - rd.pts[i][0], rd.pts[i + 1][1] - rd.pts[i][1]);
    if (L < 120) return;
    const lane = rd.kind === 'main' ? 9 : 4, fw = offsetLine(rd.pts, -lane), bw = offsetLine(rd.pts.slice().reverse(), -lane);
    C.carRoutes.push({ name: rd.name, path: fw.concat(bw), n: rd.kind === 'main' ? 3 : L > 400 ? 2 : 1, main: rd.kind === 'main' });
  });

  // ---------- 路口：紅綠燈（主幹道和別的路交叉）、斑馬線 ----------
  C.junctions = [];
  for (let i = 0; i < C.roads.length; i++) for (let j = i + 1; j < C.roads.length; j++) {
    const a = C.roads[i], b = C.roads[j]; if (a.kind === 'dirt' || b.kind === 'dirt' || a.kind === 'arcade' || b.kind === 'arcade') continue;
    for (let p = 0; p < a.pts.length - 1; p++) for (let q = 0; q < b.pts.length - 1; q++) {
      const h = segX(a.pts[p], a.pts[p + 1], b.pts[q], b.pts[q + 1]); if (!h) continue;
      if (C.junctions.some(J => Math.hypot(J.x - h[0], J.y - h[1]) < 14)) continue;
      const ang2 = Math.atan2(b.pts[q + 1][1] - b.pts[q][1], b.pts[q + 1][0] - b.pts[q][0]);
      C.junctions.push({ x: h[0], y: h[1], a, b, angA: h[2], angB: ang2, signal: (a.kind === 'main' && (b.kind === 'main' || b.kind === 'sub')) || (b.kind === 'main' && a.kind === 'sub') });
    }
  }

  // ---------- 地名 ----------
  C.DISTRICTS = [
    { n: '西市口', x: 592, y: 612, r: 56 }, { n: '公會東鶴分館前', x: 575, y: 572, r: 22 }, { n: '東鶴神社', x: 500, y: 500, r: 34 }, { n: '後巷', x: 470, y: 572, r: 40 },
    { n: '白藤堂前', x: 470, y: 634, r: 18 }, { n: '赤提燈前', x: 430, y: 630, r: 18 }, { n: '望月家道場', x: 690, y: 728, r: 46 }, { n: '本町通', x: 620, y: 520, r: 40 },
    { n: '西市街', x: 690, y: 600, r: 50 }, { n: '鍛冶町', x: 690, y: 676, r: 30 }, { n: '城牆下', x: 560, y: 758, r: 60 }, { n: '舊城', x: 570, y: 620, r: 200 },
    { n: '東鶴站', x: 620, y: 250, r: 50 }, { n: '站前廣場', x: 620, y: 322, r: 46 }, { n: '站前商店街', x: 415, y: 322, r: 120 }, { n: '站前大通', x: 620, y: 384, r: 30 },
    { n: '德克斯凡百貨', x: 748, y: 330, r: 40 }, { n: '國道一號', x: 560, y: 412, r: 40 }, { n: '外濠公園', x: 570, y: 455, r: 70 }, { n: '北口', x: 470, y: 190, r: 50 },
    { n: '官廳街', x: 812, y: 600, r: 80 }, { n: '新商區', x: 850, y: 330, r: 80 }, { n: '德克斯凡選礦廠', x: 948, y: 286, r: 50 }, { n: '城西', x: 320, y: 620, r: 140 },
    { n: '寺町', x: 520, y: 880, r: 140 }, { n: '城東', x: 940, y: 760, r: 120 }, { n: '城南', x: 760, y: 880, r: 160 }, { n: '河西', x: 90, y: 700, r: 260 },
    { n: '河西小學', x: 44, y: 572, r: 50 }, { n: '河西兒童公園', x: 137, y: 542, r: 30 }, { n: '河西超市', x: 140, y: 910, r: 40 }, { n: '南渠・南橋', x: 560, y: 946, r: 40 },
    { n: '新大橋', x: 201, y: 410, r: 40 }, { n: '平交道', x: 470, y: 232, r: 20 }
  ];
  C.AREAS = [
    { n: '霜溪', x: 620, y: 130, r: 90 }, { n: '霜溪石窟', x: 800, y: 70, r: 60 }, { n: '北山礦坑', x: 560, y: 52, r: 70 }, { n: '湯山村', x: 130, y: 60, r: 80 },
    { n: '北郊的田', x: 640, y: 182, r: 140 }, { n: '城西遺跡・公會調查點', x: 96, y: 332, r: 80 }, { n: '鐵橋', x: 201, y: 232, r: 30 }, { n: '西河岸', x: 201, y: 700, r: 40 }, { n: '南渠外的田', x: 700, y: 980, r: 300 }
  ];
  C.inCity = (sx, sy) => sy > 209 && sy < 960;
  C.areaName = (sx, sy) => {
    const near = list => list.filter(v => Math.hypot(v.x - sx, v.y - sy) < v.r).sort((p, q) => Math.hypot(p.x - sx, p.y - sy) / p.r - Math.hypot(q.x - sx, q.y - sy) / q.r)[0];
    const d = near(C.DISTRICTS); if (d && C.inCity(sx, sy)) return '東鶴・' + d.n;
    const a = near(C.AREAS); return a ? a.n : C.inCity(sx, sy) ? '東鶴' : '東鶴近郊';
  };
  // 劇情人物、委託人的位置（people.js、jobs.js）
  C.SPOTS = {
    nanbashi: [548, 930, 0], dojo: [690, 728, Math.PI], dojoGate: [700, 756, 0], plaza: [600, 640, 0], plazaW: [570, 614, 0], market: [700, 690, Math.PI],
    northGate: [626, 430, 0], wallN: [560, 466, 0], survey: [150, 392, Math.PI * 0.8], survey2: [160, 400, Math.PI], survey3: [128, 400, Math.PI * 0.5],
    alley: [440, 576, 0], alley2: [500, 576, Math.PI], sugaSide: [646, 676, 0]
  };
  C.TARGET = { '湯山村': [140, 74], '北郊農舍': [700, 210], '驛站': [700, 392], '神社': [500, 516], '調查點': [150, 400] };
  C.gatherSpot = [500, 578];

  // ---------- 小地圖：畫一張示意的地圖（只給小地圖、大地圖用） ----------
  C.paintMap = N => {
    N = N || 1024; const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), k = N / 1000;
    const rect = (r, col) => { g.fillStyle = col; g.fillRect(r[0] * k, r[1] * k, (r[2] - r[0]) * k, (r[3] - r[1]) * k); };
    const poly = (pts, w, col, cap) => { g.strokeStyle = col; g.lineWidth = w * k; g.lineCap = cap || 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.stroke(); };
    g.fillStyle = '#E2E9EE'; g.fillRect(0, 0, N, N);
    rect([0, 0, 1000, 40], '#B8C0C8');
    C.FIELDS.forEach(r => rect(r, '#D2D4C2')); C.GREENS.forEach(r => rect(r, '#C8D8D0'));
    rect([C.OLD[0], C.OLD[1], C.OLD[2], C.OLD[3]], '#C8BFAE');
    C.PARKS.forEach(r => rect(r, '#C8D4C0'));
    Object.entries(C.Z).forEach(([k2, r]) => rect(r, k2 === 'ruins' ? '#B8AE9C' : k2 === 'grave' ? '#B4B0A8' : k2 === 'market' ? '#8A8C92' : '#CFD8C4'));
    C.water.forEach(w => { poly(w.pts, w.w + 4, '#E6F2F6', 'butt'); poly(w.pts, w.w, '#6E9AAE', 'butt'); });
    rect([0, C.RAIL.y0, 1000, C.RAIL.y1], '#9A968E'); C.RAIL.t.forEach(t => rect([0, t - 1, 1000, t + 1], '#5A5A62'));
    const col = { main: '#4A4C52', sub: '#6A6C72', lane: '#8E8C88', old: '#8E8676', olane: '#9A9284', arcade: '#B89A7A', dirt: '#9C8670' };
    ['dirt', 'lane', 'olane', 'old', 'arcade', 'sub', 'main'].forEach(kind => C.roads.filter(r => r.kind === kind).forEach(r => { if (kind === 'main' || kind === 'sub') poly(r.pts, r.w + 2, '#A8A49C', 'butt'); poly(r.pts, kind === 'main' ? r.w - 14 : kind === 'sub' ? r.w - 10 : r.w, col[kind], kind === 'dirt' ? 'round' : 'butt'); }));
    { const [cx, cy, rx, ry] = C.SQUARE; g.fillStyle = '#A49C8C'; g.beginPath(); g.ellipse(cx * k, cy * k, rx * k, ry * k, 0, 0, 7); g.fill(); }
    rect(C.PLAZA, '#ABA79F'); rect(C.PLAT, '#B4B0A6');
    C.bridges.forEach(b => { g.save(); g.translate(b.sx * k, b.sy * k); g.rotate(b.ang); g.fillStyle = b.ok ? '#8A7A64' : '#7A3A2A'; g.fillRect(-b.len / 2 * k, -b.wid / 2 * k, b.len * k, b.wid * k); g.restore(); });
    // 房子（屋頂的顏色）
    C.lots.forEach(l => { const t = l.type; if (t === 'parking' || t === 'vacant') rect(l.r, '#7E8086'); else if (t === 'garden') rect(l.r, '#B8A890'); else rect(l.r, t === 'midrise' || t === 'office' ? '#6E7078' : t === 'oldhouse' || t === 'kura' ? '#5E5650' : t === 'apt' ? '#7A7C82' : t === 'shop' ? '#6A5A50' : t === 'warehouse' || t === 'factory' ? '#7A7E84' : '#5A5456'); });
    Object.keys(C.FS).forEach(k2 => { const p = C.FAC[k2]; if (!p) return; const [w, d] = C.FS[k2]; rect([p[0] - w / 2, p[1] - d / 2, p[0] + w / 2, p[1] + d / 2], '#4E4A48'); });
    rect(C.STATION, '#5A5C62');
    // 城牆
    { const [x0, y0, x1, y1] = C.OLD; g.strokeStyle = '#6E6A60'; g.lineWidth = 3 * k; g.strokeRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k); }
    return c;
  };
})(window.R);
