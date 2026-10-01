// 討伐令 1433：東鶴的城外——像日本郊區那樣的城市
// 東鶴是陪都：城牆裡是舊城，城市一路長到城牆外。
// 鐵路（德克斯凡技術的魔導電車、平交道、鐵橋）與東鶴站、站前廣場、站前商店街、站東的住宅區；
// 河西住宅區（小學、兒童公園、鎮守的小祠、墓地、超市）；城南沿著城牆的住宅、南渠外的田；北郊的倉庫、農家、溫室；
// 地圖外看得到的遠方街景（走不到）。
// 房子、路先在這裡排好（固定的亂數種子）：地面（town.js 的 paintGround 呼叫 R.paintSuburbs）和 3D（R.buildSuburbs）照同一份。
// 座標和 town.js 一樣：示意圖的 1 單位＝0.22 公尺。
(function (R) {
  const S = 0.22, WX = sx => (sx - 500) * S, WZ = sy => (sy - 500) * S, HALF = 500 * S;
  let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const hit = (a, b, m) => { m = m || 0; return a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m; };
  // 一塊地離一條路（折線）近不近
  const nearLine = (r, pts, m) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3); for (let j = 0; j <= n; j++) { const x = ax + (bx - ax) * j / n, y = ay + (by - ay) * j / n; if (x > r[0] - m && x < r[2] + m && y > r[1] - m && y < r[3] + m) return true; } } return false; };

  // ---------- 鐵路、車站 ----------
  const G0 = R.TOWN_G;
  const RAIL = { y: 305, y0: 286, y1: 324, t: [294, 316], fn: 283, fs: 327 };   // 道碴的範圍、兩條軌道、南北兩道圍籬
  const PLAT = [612, 300, 752, 310], STATION = [632, 329, 724, 353], PLAZA = [608, 355, 772, 396];
  const BRIDGE = [304, 357];
  // 平交道：路和鐵路交叉的地方（大路、崙腳）
  const CROSS = [];
  G0.roads.forEach(rd => { for (let i = 0; i < rd.length - 1; i++) { const [ax, ay] = rd[i], [bx, by] = rd[i + 1]; if ((ay - RAIL.y) * (by - RAIL.y) < 0) CROSS.push(ax + (bx - ax) * (RAIL.y - ay) / (by - ay)); } });
  const NB_RD = [[302, 399], [260, 420], [244, 424]];   // 北橋 → 城西遺跡（河西的那一段）

  // ---------- 河西：巷子的格子與特別的區域 ----------
  const KX = [30, 105, 180, 255], KY = [335, 420, 505, 590, 675, 760, 845, 930];
  const Z = { ruins: [112, 393, 248, 500], school: [37, 511, 173, 669], park: [187, 511, 248, 584], grove: [187, 766, 248, 839], grave: [261, 766, 303, 839], market: [111, 851, 248, 924] };
  const ZL = Object.values(Z);
  const PADDY = [[345, 941, 588, 996], [612, 941, 1000, 996]], FIELD_N = [455, 160, 560, 232], GREEN_N = [640, 168, 700, 205], GREEN_S = [700, 950, 790, 990];

  // ---------- 規劃 ----------
  const plan = { lots: [], streets: [], nodes: [], adj: [] };
  const street = (pts, w, kind) => plan.streets.push({ pts, w, kind: kind || 'lane' });
  const WALLS = ['#E8E2D4', '#D8D2C4', '#C8CCD0', '#E0D6C0', '#B8BCC2', '#D4C8B4', '#F0ECE4', '#C4B8A4'];
  const lot = o => { plan.lots.push(o); return o; };
  seed = 20361;
  street([[600, 400], [600, 283]], 14, 'main');
  street([[600, 283], [620, 262], [620, 238]], 13, 'main');
  street([[390, 480], [378, 380], [366, 300], [361, 280]], 12, 'main');
  street([[372, 366], [593, 366]], 18, 'main'); street([[772, 366], [962, 366]], 18, 'main');   // 站前大街（中間是廣場）
  street([[372, 332], [594, 332]], 8); street([[776, 332], [962, 332]], 8);
  street([[372, 891], [962, 891]], 10);
  street([[968, 398], [968, 884]], 8);
  street(NB_RD, 12, 'main');
  // 河西的巷子：碰到小學、公園、遺跡這些區域就斷開
  const cutRun = (horiz, c, a0, a1, w) => {
    let s = a0; const segs = [];
    ZL.filter(z => (horiz ? c > z[1] && c < z[3] : c > z[0] && c < z[2])).map(z => (horiz ? [z[0], z[2]] : [z[1], z[3]])).sort((p, q) => p[0] - q[0])
      .forEach(([u0, u1]) => { if (u0 > s) segs.push([s, Math.min(u0, a1)]); s = Math.max(s, u1); });
    if (s < a1) segs.push([s, a1]);
    segs.forEach(([u0, u1]) => { if (u1 - u0 > 8) street(horiz ? [[u0, c], [u1, c]] : [[c, u0], [c, u1]], w); });
    return segs;
  };
  const runsH = KY.map(y => [y, cutRun(true, y, 18, 304, 12)]), runsV = KX.map(x => [x, cutRun(false, x, 329, 996, 12)]);

  // 一般的房子（一塊地裡）：f 門朝哪邊（0 南、1 北、2 西、3 東）
  // tight：地很淺（城牆外那一排）——房子貼著路蓋
  const houseLot = (L, f, tight, one) => {
    const horiz = f < 2, front = horiz ? L[2] - L[0] : L[3] - L[1], depth = horiz ? L[3] - L[1] : L[2] - L[0];
    const r0 = rnd();
    if (r0 < 0.05 && front > 26) { lot({ type: 'parking', r: L.slice(), f }); return; }   // 月租停車場
    if (r0 < 0.09 && !tight) { lot({ type: 'garden', r: L.slice(), f }); return; }       // 家庭菜園
    const w = Math.min(front - 6, 21 + rnd() * 6), d = tight ? depth - 5 : Math.min(depth - 10, 19 + rnd() * 5), set = tight ? 3 : 6 + rnd() * 2, m = 2 + rnd() * Math.max(0, front - w - 4);
    let r;
    if (f === 0) r = [L[0] + m, L[3] - set - d, L[0] + m + w, L[3] - set];
    else if (f === 1) r = [L[0] + m, L[1] + set, L[0] + m + w, L[1] + set + d];
    else if (f === 2) r = [L[0] + set, L[1] + m, L[0] + set + d, L[1] + m + w];
    else r = [L[2] - set - d, L[1] + m, L[2] - set, L[1] + m + w];
    // 房子靠一邊蓋，另一邊空著的地停車或種樹（spot：那塊空地的中心）
    const free = horiz ? L[2] - r[2] : L[3] - r[3], spot = horiz ? [r[2] + free / 2, f === 0 ? r[3] - 7 : r[1] + 7] : [f === 2 ? r[0] + 7 : r[2] - 7, r[3] + free / 2];
    lot({ type: 'house', r, f, lot: L.slice(), floors: one ? 1 : rnd() < 0.85 ? 2 : 1, col: pick(WALLS), car: free > 12 && rnd() < 0.6, spot: free > 9 ? spot : null, yard: rnd(), tight });
  };
  // 河西的街區
  const XB = [[36, 99], [111, 174], [186, 249], [261, 303]], YB = [[341, 414], [426, 499], [511, 584], [596, 669], [681, 754], [766, 839], [851, 924], [936, 992]];
  XB.forEach(([x0, x1]) => YB.forEach(([y0, y1]) => {
    const mid = (y0 + y1) / 2;
    [[y0, mid, 1], [mid, y1, 0]].forEach(([ra, rb, north]) => {
      const rowR = [x0, ra, x1, rb];
      if (ZL.some(z => hit(rowR, z, 1))) { // 有一部分在特別的區域：一塊一塊看
        const n = Math.max(1, Math.round((x1 - x0) / 31)), lw = (x1 - x0) / n;
        for (let i = 0; i < n; i++) { const L = [x0 + i * lw, ra, x0 + (i + 1) * lw, rb]; if (!ZL.some(z => hit(L, z, 1)) && !nearLine(L, NB_RD, 8)) houseLot(L, north ? 1 : 0); }
        return;
      }
      if (x1 - x0 > 55 && rnd() < 0.16 && !nearLine(rowR, NB_RD, 8)) {   // 公寓（整排）
        const d = 24, r = north ? [x0 + 4, ra + 6, x1 - 4, ra + 6 + d] : [x0 + 4, rb - 6 - d, x1 - 4, rb - 6];
        lot({ type: 'apt', r, f: north ? 1 : 0, floors: rnd() < 0.5 ? 3 : 2, col: pick(['#D8D2C4', '#C8CCD0', '#E0D6C0', '#B8A898']) }); return;
      }
      const n = Math.max(1, Math.round((x1 - x0) / 31)), lw = (x1 - x0) / n;
      for (let i = 0; i < n; i++) { const L = [x0 + i * lw, ra, x0 + (i + 1) * lw, rb]; if (!nearLine(L, NB_RD, 8)) houseLot(L, north ? 1 : 0); }
    });
  }));
  // 城東：沿著城牆外的小路，房子門朝西
  for (let y = 402; y < 878; y += 30) { if (y > 626 && y < 668) continue; houseLot([973, y, 1000, y + 29], 2, true); }
  // 城南：城牆和南渠中間，門朝北（南橋一帶留空：瀧在那裡釣魚）
  for (let x = 401; x < 956; x += 30) { if (x > 528 && x < 668) continue; houseLot([x, 897, Math.min(x + 29, 958), 925], 1, true); }
  // 站前：商店街（西）、住宅區（東）；北排門朝南、南排門朝北
  const SHOPS = [['甘味處・和菓子', '#8A2A24', 'wagashi'], ['東鶴書房', '#2E4A3A', 'book'], ['理髮店', '#2E3A5A', 'barber'], ['定食屋・小町', '#5A3A1E', 'diner'], ['時計・眼鏡', '#3A3A44', 'watch'], ['八百屋', '#3E5A2E'], ['寫真館', '#4A3A5A', 'photo'],
    ['魚屋', '#2E4A6A'], ['德克斯凡家電', '#1E3A5A', 'dex'], ['酒屋', '#5A2A2A'], ['金物店', '#4A4A40'], ['布團店', '#5A4A6A'], ['麵包坊', '#7A4A2A'], ['花屋', '#3A5A4A']];
  let si = 0;
  // 南排（門朝北）背對鏡頭：一層樓、平屋頂，街才看得到
  [[337, 356, 0], [376, 395, 1]].forEach(([ya, yb, f]) => {
    let x = 398;
    while (x < 586) { const w = Math.min(586 - x, 26 + Math.floor(rnd() * 9)); if (w < 18) break; const s = SHOPS[si++ % SHOPS.length]; lot({ type: 'shop', r: [x + 1, ya + (f ? 0 : 1), x + w - 1, yb - (f ? 1 : 0)], f, name: s[0], sc: s[1], kind: s[2], low: f === 1, col: pick(['#D8D2C4', '#C8C0B0', '#E4DCCC', '#B8B0A4', '#D0C8BC']), awn: pick(['#8A2A24', '#2E5A3A', '#2E4A6A', '#C8823A', '#5A3A6A']) }); x += w; }
  });
  lot({ type: 'conbini', r: [779, 377, 822, 395], f: 1 });
  lot({ type: 'parking', r: [778, 337, 830, 356], f: 0, big: 1 });
  lot({ type: 'apt', r: [864, 377, 914, 395], f: 1, floors: 2, col: '#D8D2C4' });
  lot({ type: 'clinic', r: [832, 337, 862, 356], f: 0 });
  for (let x = 864; x < 956; x += 31) houseLot([x, 335, Math.min(x + 30, 960), 357], 0, true);
  houseLot([824, 376, 862, 396], 1, true, true); houseLot([916, 376, 958, 396], 1, true, true);
  // 北郊：鐵路北邊的倉庫、農家；霜溪北邊的農家、溫室
  lot({ type: 'warehouse', r: [632, 270, 690, 282], f: 1 }); lot({ type: 'warehouse', r: [706, 270, 760, 282], f: 1 });
  lot({ type: 'farm', r: [506, 202, 534, 224], f: 0 }); lot({ type: 'farm', r: [676, 214, 700, 232], f: 0 });
  lot({ type: 'farm', r: [446, 954, 476, 980], f: 1 }); lot({ type: 'farm', r: [836, 954, 866, 980], f: 1 });
  lot({ type: 'greens', r: GREEN_N.slice() }); lot({ type: 'greens', r: GREEN_S.slice() });

  // 路人走的路線（巷子的交叉點連成網）
  const nodeAt = (x, y) => { let i = plan.nodes.findIndex(([a, b]) => Math.abs(a - x) < 1 && Math.abs(b - y) < 1); if (i < 0) { i = plan.nodes.length; plan.nodes.push([x, y]); plan.adj.push([]); } return i; };
  const linkRun = pts => { for (let i = 0; i < pts.length - 1; i++) { const a = nodeAt(...pts[i]), b = nodeAt(...pts[i + 1]); if (a !== b && !plan.adj[a].includes(b)) { plan.adj[a].push(b); plan.adj[b].push(a); } } };
  runsH.forEach(([y, segs]) => segs.forEach(([u0, u1]) => { const xs = [u0 + 4].concat(KX.filter(x => x > u0 && x < u1)).concat([u1 - 4]); linkRun(xs.map(x => [x, y])); }));
  runsV.forEach(([x, segs]) => segs.forEach(([u0, u1]) => { const ys = [u0 + 4].concat(KY.filter(y => y > u0 && y < u1)).concat([u1 - 4]); linkRun(ys.map(y => [x, y])); }));
  const KASAI_N = plan.nodes.length;
  const lineNodes = (ax, ay, bx, by, step) => { const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step)), pts = []; for (let i = 0; i <= n; i++) pts.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n]); linkRun(pts); };
  lineNodes(380, 366, 955, 366, 26);               // 站前大街
  lineNodes(600, 396, 600, 366, 16); lineNodes(678, 366, 678, 358, 4); // 北門、車站門口
  lineNodes(401, 891, 955, 891, 28); lineNodes(968, 402, 968, 880, 28);

  // 松樹別種在這些地方
  R.suburbBusy = (sx, sy) => (sy > 274 && sy < 404 && sx > 352) || (sx < 316 && sy > 274) || sy > 876 || (sx > 955 && sy > 395) || Math.abs(sy - RAIL.y) < 26
    || plan.lots.some(l => sx > l.r[0] - 14 && sx < l.r[2] + 14 && sy > l.r[1] - 14 && sy < l.r[3] + 14) || hit([sx, sy, sx, sy], FIELD_N, 12);

  // ---------- 地面 ----------
  R.paintSuburbs = (g, k) => {
    seed = 777;
    const rect = (x0, y0, x1, y1, col) => { g.fillStyle = col; g.fillRect(Math.round(x0 * k), Math.round(y0 * k), Math.max(1, Math.round((x1 - x0) * k)), Math.max(1, Math.round((y1 - y0) * k))); };
    const poly = (pts, w, col, cap) => { g.strokeStyle = col; g.lineWidth = w * k; g.lineCap = cap || 'butt'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.stroke(); };
    const speckle = (r, n, cols) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.fillRect(Math.floor((r[0] + rnd() * (r[2] - r[0])) * k), Math.floor((r[1] + rnd() * (r[3] - r[1])) * k), 1 + Math.floor(rnd() * 2), 1); } };
    // 田：雪下的一格一格水田，田埂
    const paddy = (r, cell) => { rect(...r, '#DCE2E2'); for (let x = r[0]; x <= r[2]; x += cell) rect(x - 0.8, r[1], x + 0.8, r[3], '#B4AA98'); for (let y = r[1]; y <= r[3]; y += cell * 0.7) rect(r[0], y - 0.8, r[2], y + 0.8, '#B4AA98'); speckle(r, 400, ['rgba(150,160,130,.5)', 'rgba(240,246,248,.9)']); };
    PADDY.forEach(r => paddy(r, 36)); paddy(FIELD_N, 26);
    // 特別的區域
    rect(...Z.ruins, '#B8AE9C'); speckle(Z.ruins, 500, ['rgba(120,110,96,.6)', 'rgba(236,240,242,.8)']);
    { const r = Z.school; rect(...r, '#CEC4AC'); rect(r[0], r[1], r[2], r[1] + 26, '#A8A49C'); g.strokeStyle = '#F4F0E6'; g.lineWidth = 2; g.beginPath(); g.ellipse((r[0] + r[2]) / 2 * k, (r[1] + 40 + r[3]) / 2 * k, (r[2] - r[0]) / 2.6 * k, (r[3] - r[1] - 40) / 2.6 * k, 0, 0, 7); g.stroke(); speckle(r, 300, ['rgba(240,246,248,.9)']); }
    rect(...Z.park, '#D2D8C8'); rect(Z.park[0] + 8, Z.park[1] + 8, Z.park[0] + 24, Z.park[1] + 22, '#D8C8A0');
    rect(...Z.grove, '#C8C0AE'); rect((Z.grove[0] + Z.grove[2]) / 2 - 4, Z.grove[1] + 10, (Z.grove[0] + Z.grove[2]) / 2 + 4, Z.grove[3], '#A8A090');
    rect(...Z.grave, '#B4B0A8');
    { const r = Z.market; rect(...r, '#5A5C62'); for (let x = r[0] + 6; x < r[2] - 40; x += 11) rect(x, r[1] + 30, x + 0.8, r[3] - 4, '#E8E4D8'); }
    // 車站前的廣場、月台
    rect(...PLAZA, '#ABA79F'); for (let y = PLAZA[1]; y < PLAZA[3]; y += 5) for (let x = PLAZA[0] + ((y / 5) % 2) * 2.5; x < PLAZA[2]; x += 5) { const v = 160 + rnd() * 20 | 0; rect(x, y, x + 4.4, y + 4.4, 'rgb(' + v + ',' + (v - 4) + ',' + (v - 10) + ')'); }
    rect(PLAZA[0], PLAZA[1], PLAZA[2], PLAZA[1] + 8, '#55575C'); for (let x = PLAZA[0] + 6; x < PLAZA[2]; x += 14) rect(x, PLAZA[1] + 3.6, x + 7, PLAZA[1] + 4.4, '#E8E4D8');
    g.fillStyle = '#9A968C'; g.beginPath(); g.ellipse(690 * k, 381 * k, 18 * k, 8 * k, 0, 0, 7); g.fill();
    // 停車場、菜園、工地的地面
    plan.lots.forEach(l => {
      if (l.type === 'parking') { rect(...l.r, '#5E6066'); for (let x = l.r[0] + 3; x < l.r[2] - 3; x += 10) rect(x, l.r[1] + 2, x + 0.7, l.r[3] - 2, '#E8E4D8'); }
      else if (l.type === 'garden') { rect(l.r[0] + 3, l.r[1] + 3, l.r[2] - 3, l.r[3] - 3, '#8A7A62'); for (let y = l.r[1] + 6; y < l.r[3] - 3; y += 4) rect(l.r[0] + 4, y, l.r[2] - 4, y + 1.2, '#E8EEF0'); }
      else if (l.type === 'house' && l.lot) { const L = l.lot, r = l.r; // 車道、門前的水泥地
        if (l.f === 0) rect(r[0] + 2, r[3], r[0] + 10, L[3], '#A8A69E'); else if (l.f === 1) rect(r[0] + 2, L[1], r[0] + 10, r[1], '#A8A69E'); else if (l.f === 2) rect(L[0], r[1] + 2, r[0], r[1] + 10, '#A8A69E'); else rect(r[2], r[1] + 2, L[2], r[1] + 10, '#A8A69E'); }
      else if (l.type === 'conbini' || l.type === 'clinic') rect(l.r[0] - 2, l.r[1] - 2, l.r[2] + 2, l.r[3] + 2, '#9A989A');
    });
    // 街道：柏油、人行道邊緣；大街畫中線，小巷畫兩邊的白線
    plan.streets.forEach(s => poly(s.pts, s.w + 3, '#9A968E', 'square'));
    plan.streets.forEach(s => poly(s.pts, s.w, '#4E5056', 'square'));
    for (let i = 0; i < 6000; i++) { const s = plan.streets[Math.floor(rnd() * plan.streets.length)], j = Math.floor(rnd() * (s.pts.length - 1)), [ax, ay] = s.pts[j], [bx, by] = s.pts[j + 1], t = rnd(), L = Math.hypot(bx - ax, by - ay) || 1, o = (rnd() - 0.5) * s.w; const x = ax + (bx - ax) * t - (by - ay) / L * o, y = ay + (by - ay) * t + (bx - ax) / L * o, v = 66 + rnd() * 24 | 0; g.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 6) + ')'; g.fillRect(Math.floor(x * k), Math.floor(y * k), 1, 1); }
    plan.streets.forEach(s => { for (let i = 0; i < s.pts.length - 1; i++) { const [ax, ay] = s.pts[i], [bx, by] = s.pts[i + 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
      if (s.kind === 'main') { for (let t = 4; t < L - 4; t += 12) poly([[ax + ux * t, ay + uy * t], [ax + ux * (t + 6), ay + uy * (t + 6)]], 0.8, '#E8E4D8'); }
      else [-1, 1].forEach(sd => poly([[ax + nx * sd * (s.w / 2 - 1.2), ay + ny * sd * (s.w / 2 - 1.2)], [bx + nx * sd * (s.w / 2 - 1.2), by + ny * sd * (s.w / 2 - 1.2)]], 0.6, '#D8D4C8'));
    } });
    // 河西的十字路口：路面寫著「停」
    g.fillStyle = '#E8E4D8'; g.font = 'bold ' + Math.round(7 * k) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    runsV.forEach(([x, segs]) => segs.forEach(([u0, u1]) => KY.forEach(y => { if (y > u0 + 10 && y < u1 - 10 && rnd() < 0.5) g.fillText('停', x * k, (y - 11) * k); })));
    // 鐵路：道碴、枕木、鐵軌；過河的地方是鐵橋
    const [r0, r1] = [RAIL.y0, RAIL.y1];
    [[0, BRIDGE[0]], [BRIDGE[1], 1000]].forEach(([x0, x1]) => { rect(x0, r0, x1, r1, '#8E8A84'); speckle([x0, r0, x1, r1], 2600, ['#7A7670', '#A29E98', '#6E6A66']); });
    rect(BRIDGE[0], r0 + 3, BRIDGE[1], r1 - 3, '#3E3E46'); for (let x = BRIDGE[0]; x < BRIDGE[1]; x += 6) rect(x, r0 + 3, x + 1, r1 - 3, '#2A2A30');
    RAIL.t.forEach(ty => { for (let x = 0; x < 1000; x += 3) rect(x, ty - 4.6, x + 1.3, ty + 4.6, x > BRIDGE[0] && x < BRIDGE[1] ? '#2A2420' : '#5A4A3C'); [-2.45, 2.45].forEach(o => rect(0, ty + o - 0.45, 1000, ty + o + 0.45, '#5A5A62')); [-2.45, 2.45].forEach(o => rect(0, ty + o - 0.45, 1000, ty + o - 0.1, '#A8A8B0')); });
    // 平交道：路面鋪過軌道
    CROSS.forEach(cx => { rect(cx - 7, r0, cx + 7, r1, '#4E5056'); rect(cx - 7.5, r0, cx - 6.5, r1, '#E8C03A'); rect(cx + 6.5, r0, cx + 7.5, r1, '#E8C03A'); RAIL.t.forEach(ty => [-2.45, 2.45].forEach(o => rect(cx - 7, ty + o - 0.45, cx + 7, ty + o + 0.45, '#8A8A92'))); });
    // 月台
    rect(...PLAT, '#B4B0A6'); rect(PLAT[0], PLAT[1], PLAT[2], PLAT[1] + 1, '#E8C040'); rect(PLAT[0], PLAT[3] - 1, PLAT[2], PLAT[3], '#E8C040');
    // 房子的屋頂（小地圖、大地圖上看得到房子）
    plan.lots.forEach(l => { if (['house', 'apt', 'shop', 'conbini', 'clinic', 'warehouse', 'farm'].includes(l.type)) rect(...l.r, l.type === 'shop' ? '#6A5A50' : l.type === 'apt' ? '#7A7C82' : '#5A5456'); });
    rect(...STATION, '#6A6C72');
  };

  // ---------- 3D ----------
  R.buildSuburbs = api => {
    const { group, npc, inter, block, talk, lam, SB, HB, G3, B_, glowW, darkW, woodM, gableB, sign, lampPost, pineAt, bench, vending, bike, tw, E } = api;
    const TH = THREE; seed = 99;
    const ROT = [0, Math.PI, -Math.PI / 2, Math.PI / 2];
    const bigSign = (x, y, z, ry, txt, bg, fg, w, h) => { const t = R.pixCanvasTex(Math.round(w * 24), Math.round(h * 24), (g, W0, H0) => { g.fillStyle = bg; g.fillRect(0, 0, W0, H0); g.fillStyle = fg; g.font = 'bold ' + Math.round(H0 * 0.66) + 'px "Noto Serif TC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W0 / 2, H0 / 2 + 1); }); const m = new TH.Mesh(new TH.PlaneGeometry(w, h), R.seeThrough(new TH.MeshBasicMaterial({ map: t }))); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m; };
    const snowM = B_('#F2F6F8', { tex: 'ground' }), snowL = lam('#F2F6F8', { tex: 'ground' }), metal = lam('#3A3C42', { tex: 0 }), concrete = lam('#A8A49A', { tex: 'wall' }), capL = lam('#C8C4BC', { tex: 'cap' });
    // 方塊地（示意圖座標）→ 世界座標的中心、寬深（w：門那一面的寬）
    const frame = (r, f) => { const x = WX((r[0] + r[2]) / 2), z = WZ((r[1] + r[3]) / 2), ax = (r[2] - r[0]) * S, az = (r[3] - r[1]) * S; return f < 2 ? { x, z, w: ax, d: az, ry: ROT[f] } : { x, z, w: az, d: ax, ry: ROT[f] }; };
    const rblock = (r, tag) => block(WX(r[0]), WX(r[2]), WZ(r[1]), WZ(r[3]), tag || 'house');
    // 本地座標（門在 +z）→ 世界座標
    const toW = (fr, lx, lz) => [fr.x + Math.cos(fr.ry) * lx + Math.sin(fr.ry) * lz, fr.z - Math.sin(fr.ry) * lx + Math.cos(fr.ry) * lz];
    const winRow = (B, y, w, z, n, size) => { for (let i = 0; i < n; i++) { const wx = n === 1 ? 0 : -w / 2 + 0.9 + i * (w - 1.8) / (n - 1); B.add(G3.box, rnd() < 0.5 ? glowW : darkW, wx, y, z, size || 0.9, 0.8, 0.05); } };
    // 輕型車（停在路邊、家門口、停車場）
    const CARS = ['#E8E8EC', '#C83A3A', '#3A5A8A', '#2A2A30', '#D8C890', '#6A8A6A'];
    const carAt = (x, z, ry, col) => {
      const cb = R.Batch(); cb.at(x, z, ry); const body = lam(col || pick(CARS), { tex: 0 });
      cb.add(G3.box, body, 0, 0.7, 0, 1.5, 0.6, 3.2); cb.add(G3.box, body, 0, 1.25, -0.2, 1.4, 0.55, 2.0); cb.add(G3.box, lam('#9AB4C8', { em: '#203040', ei: 0.25 }), 0, 1.27, -0.2, 1.42, 0.4, 1.9);
      cb.add(G3.box, snowL, 0, 1.55, -0.2, 1.3, 0.06, 1.8); [[-0.75, -1.05], [0.75, -1.05], [-0.75, 1.05], [0.75, 1.05]].forEach(([a, b]) => cb.add(G3.cyl, metal, a, 0.3, b, 0.6, 0.2, 0.6, 0, 0, Math.PI / 2));
      cb.flush(group); const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)), hw = c * 0.8 + s * 1.65, hd = s * 0.8 + c * 1.65; block(x - hw, x + hw, z - hd, z + hd, 'deco');
    };

    // ---------- 獨棟的房子：兩層、雙坡屋頂（積雪）、二樓陽台、門口的雨遮、前面的水泥磚牆 ----------
    const jhouse = l => {
      const fr = frame(l.r, l.f), B = HB, { w, d } = fr, H = 2.7 * l.floors + 0.3, wallM = B_(l.col);
      B.at(fr.x, fr.z, fr.ry);
      B.add(G3.box, B_('#7A7670', { tex: 'wall' }), 0, 0.2, 0, w + 0.1, 0.4, d + 0.1);
      B.add(G3.box, wallM, 0, (H + 0.4) / 2, 0, w, H - 0.4, d);
      gableB(B, w, d, H, 0, l.col);
      const doorX = (rnd() - 0.5) * Math.max(0, w - 2.4);
      B.add(G3.box, B_('#4A3A2E', { tex: 'planks' }), doorX, 1.35, d / 2 + 0.03, 0.9, 1.9, 0.06);
      B.add(G3.box, B_('#5A5C62', { tex: 'cap' }), doorX, 2.5, d / 2 + 0.4, 1.5, 0.08, 0.8); B.add(G3.box, snowM, doorX, 2.56, d / 2 + 0.4, 1.4, 0.05, 0.7);
      for (let f = 0; f < l.floors; f++) { const n = Math.max(1, Math.floor((w - 1) / 2.2)); for (let i = 0; i < n; i++) { const wx = n === 1 ? (doorX > 0 ? -w / 4 : w / 4) : -w / 2 + 1 + i * (w - 2) / (n - 1); if (f === 0 && Math.abs(wx - doorX) < 1) continue; B.add(G3.box, rnd() < 0.5 ? glowW : darkW, wx, 1.6 + f * 2.7, d / 2 + 0.03, 0.9, 0.8, 0.05); } [-1, 1].forEach(sd => B.add(G3.box, rnd() < 0.4 ? glowW : darkW, sd * (w / 2 + 0.03), 1.6 + f * 2.7, (rnd() - 0.5) * d * 0.5, 0.05, 0.7, 0.8)); }
      if (l.floors > 1 && rnd() < 0.6) {
        const bw = Math.min(w - 1, 2.6 + rnd()), bx = (rnd() - 0.5) * (w - bw);
        B.add(G3.box, B_('#8A8C92', { tex: 'cap' }), bx, 2.95, d / 2 + 0.45, bw, 0.12, 0.9); B.add(G3.box, B_('#C8CCD0', { tex: 0 }), bx, 3.4, d / 2 + 0.88, bw, 0.8, 0.06);
        if (rnd() < 0.55) { B.add(G3.box, B_('#5A5C62', { tex: 0 }), bx, 4.35, d / 2 + 0.6, bw, 0.04, 0.04); for (let i = 0; i < 3; i++) B.add(G3.box, B_(pick(['#E8E4D8', '#7A9AC8', '#C87A7A', '#E8D07A']), { tex: 0 }), bx - bw / 3 + i * bw / 3, 4.0, d / 2 + 0.6, 0.45, 0.6, 0.03); }
      }
      B.add(G3.box, B_('#D8DCE0', { tex: 0 }), w / 2 + 0.22, 0.65, -d / 4, 0.35, 0.55, 0.7);
      B.at(null); rblock(l.r);
      // 前面的水泥磚牆，留一個門口；門口有信箱
      if (l.lot) {
        const L = l.lot, m = 1.2, wallH = 1.1, horiz = l.f < 2;
        const [gx, gz] = toW(fr, doorX, 0), gs = horiz ? gx / S + 500 : gz / S + 500;   // 門口在臨路那一邊的位置
        const run = (a0, a1, fixed) => { if (a1 - a0 < 2) return; const c = (a0 + a1) / 2, len = (a1 - a0) * S; if (horiz) { SB.add(G3.box, concrete, WX(c), wallH / 2, WZ(fixed), len, wallH, 0.15); SB.add(G3.box, capL, WX(c), wallH + 0.04, WZ(fixed), len + 0.04, 0.08, 0.22); block(WX(a0), WX(a1), WZ(fixed) - 0.1, WZ(fixed) + 0.1, 'deco'); } else { SB.add(G3.box, concrete, WX(fixed), wallH / 2, WZ(c), 0.15, wallH, len); SB.add(G3.box, capL, WX(fixed), wallH + 0.04, WZ(c), 0.22, 0.08, len + 0.04); block(WX(fixed) - 0.1, WX(fixed) + 0.1, WZ(a0), WZ(a1), 'deco'); } };
        // 前面的牆：門口留空；停車的那一邊也留空（車要開進來）
        if (l.yard < 0.8 && !l.tight) {
          const fixed = horiz ? (l.f === 0 ? L[3] - m : L[1] + m) : (l.f === 2 ? L[0] + m : L[2] - m), a0 = horiz ? L[0] + 1 : L[1] + 1, a1 = horiz ? L[2] - 1 : L[3] - 1;
          run(a0, gs - 6, fixed); run(gs + 6, l.car ? (horiz ? l.r[2] + 1 : l.r[3] + 1) : a1, fixed);
        }
        const [mx, mz] = toW(fr, doorX + 0.8, d / 2 + 0.16); SB.add(G3.box, lam('#C8323A', { tex: 0 }), mx, 1.05, mz, 0.3, 0.3, 0.2, 0, fr.ry, 0);   // 信箱
        if (l.spot) { const cx = WX(l.spot[0]), cz = WZ(l.spot[1]); if (l.car) carAt(cx, cz, horiz ? 0 : Math.PI / 2); else if (l.yard > 0.4) pineAt(cx, cz, 0.55); }
        if (l.yard < 0.3) { const [bx2, bz2] = toW(fr, doorX - 1.3, d / 2 + 0.9); bike(bx2, bz2, fr.ry + Math.PI / 2); }
        if (l.yard > 0.85) { const [sx2, sz2] = toW(fr, doorX + 1.2, d / 2 + 1.3); SB.add(G3.cyl, lam('#8A5A3A', { tex: 0 }), sx2, 0.25, sz2, 0.5, 0.5, 0.5); SB.add(G3.sph, lam('#4A6A3A', { tex: 0 }), sx2, 0.7, sz2, 0.6, 0.5, 0.6); }
      }
    };
    // ---------- 公寓：外走廊、樓梯、一排門 ----------
    const apt = l => {
      const fr = frame(l.r, l.f), B = HB, { w, d } = fr, fh = 2.8, fl = l.floors, H = fl * fh, wallM = B_(l.col), rail = B_('#E8E8EC', { tex: 0 }), slab = B_('#8A8C92', { tex: 'cap' });
      B.at(fr.x, fr.z, fr.ry);
      // 本體往後退 1.2 公尺（前面是外走廊），東邊是樓梯間
      const bw = w - 1.2, bx0 = -0.6, front = d / 2 - 1.2;
      B.add(G3.box, wallM, bx0, H / 2, -0.6, bw, H, d - 1.2);
      for (let f = 0; f < fl; f++) {
        if (f > 0) { B.add(G3.box, slab, bx0, f * fh, d / 2 - 0.6, bw, 0.16, 1.2); B.add(G3.box, rail, bx0, f * fh + 0.55, d / 2 - 0.02, bw, 0.9, 0.06); }
        const n = Math.max(2, Math.floor((bw - 1) / 2.6)); for (let i = 0; i < n; i++) { const dx = bx0 - bw / 2 + 1.0 + i * (bw - 2.6) / (n - 1); B.add(G3.box, B_('#6A5A4A', { tex: 'planks' }), dx, f * fh + 1.05, front + 0.03, 0.8, 1.9, 0.05); B.add(G3.box, rnd() < 0.5 ? glowW : darkW, dx + 0.9, f * fh + 1.6, front + 0.03, 0.6, 0.5, 0.05); }
        for (let i = 0; i < n; i++) B.add(G3.box, rnd() < 0.5 ? glowW : darkW, bx0 - bw / 2 + 1.0 + i * (bw - 2) / Math.max(1, n - 1), f * fh + 1.6, -d / 2 - 0.02, 1.1, 0.8, 0.05);
      }
      B.add(G3.box, B_('#9A9CA2', { tex: 'wall' }), w / 2 - 0.6, H / 2 + 0.2, 0, 1.2, H + 0.4, d);   // 樓梯間
      B.add(G3.box, slab, -0.4, H + 0.1, -0.3, w - 0.6, 0.2, d - 0.4); B.add(G3.box, snowM, -0.4, H + 0.22, -0.3, w - 1.2, 0.06, d - 1);
      B.add(G3.box, B_('#7A7C82', { tex: 'cap' }), -0.4, H + 0.5, d / 2 - 0.5, w - 0.6, 0.6, 0.15);
      B.at(null); rblock(l.r);
      if (rnd() < 0.7) { const [bx2, bz2] = toW(fr, -w / 2 + 1, d / 2 + 0.8); for (let i = 0; i < 3; i++) bike(bx2 + Math.cos(fr.ry) * i * 0.7, bz2 - Math.sin(fr.ry) * i * 0.7, fr.ry + Math.PI / 2); }
    };
    // ---------- 商店街的店：一樓的店面（玻璃或鐵捲門）、遮雨棚、招牌，二樓住人 ----------
    const shop = l => {
      const fr = frame(l.r, l.f), B = HB, { w, d } = fr, H = l.low ? 3.3 : 5.8, aw = l.low ? 2.3 : 2.6;
      B.at(fr.x, fr.z, fr.ry);
      B.add(G3.box, B_(l.col), 0, H / 2, 0, w, H, d);
      const closed = rnd() < 0.15;
      B.add(G3.box, closed ? B_('#8A8C90', { tex: 'cap' }) : B_('#E8D8B0', { em: '#B8803A', ei: 0.75 }), 0, 1.25, d / 2 + 0.03, w - 0.7, 2.1, 0.05);
      if (!closed) for (let i = 0; i < 3; i++) B.add(G3.box, B_(pick(['#C83A3A', '#3A6A8A', '#E8C03A', '#5A8A4A', '#F0ECE2']), { tex: 0 }), -w / 3 + i * w / 3, 0.5, d / 2 + 0.45, 0.8, 0.5, 0.6);
      B.add(G3.box, B_(l.awn, { tex: 0 }), 0, aw, d / 2 + 0.55, w - 0.2, 0.08, 1.15, 0.32, 0, 0);
      for (let i = 0; i < 4; i++) B.add(G3.box, B_('#F0ECE2', { tex: 0 }), -w / 2 + 0.4 + i * (w - 0.8) / 3, aw + 0.02, d / 2 + 0.55, 0.3, 0.085, 1.16, 0.32, 0, 0);
      B.add(G3.box, snowM, 0, aw + 0.12, d / 2 + 0.5, w - 0.4, 0.05, 1.0, 0.32, 0, 0);
      if (!l.low) winRow(B, 4.2, w, d / 2 + 0.03, Math.max(1, Math.floor(w / 2.2)));
      if (l.low || rnd() < 0.5) { B.add(G3.box, B_('#4A4C52', { tex: 'cap' }), 0, H + 0.08, 0, w + 0.2, 0.16, d + 0.2); B.add(G3.box, snowM, 0, H + 0.2, 0, w - 0.3, 0.06, d - 0.3); B.add(G3.box, B_('#6A6C72', { tex: 'cap' }), 0, H + 0.45, d / 2, w + 0.2, 0.7, 0.14); }
      else gableB(B, w, d, H, 0, l.col);
      if (l.kind === 'barber') { B.add(G3.cyl, B_('#E8E4E0', { tex: 0 }), w / 2 - 0.4, 1.4, d / 2 + 0.3, 0.26, 1.2, 0.26); [0.95, 1.4, 1.85].forEach((y, i) => B.add(G3.cyl, B_(i === 1 ? '#2E4A8A' : '#C8323A', { tex: 0 }), w / 2 - 0.4, y, d / 2 + 0.3, 0.27, 0.16, 0.27)); }
      if (rnd() < 0.45) { B.add(G3.box, metal, -w / 2 + 0.3, 1.3, d / 2 + 1.0, 0.05, 2.6, 0.05); B.add(G3.box, B_(pick(['#C83A3A', '#E8C03A', '#3A6A8A', '#F0ECE2']), { tex: 0 }), -w / 2 + 0.55, 1.5, d / 2 + 1.0, 0.45, 1.8, 0.03); }   // のぼり
      B.at(null); rblock(l.r);
      const [sx, sz] = toW(fr, 0, d / 2 + 0.1); sign(sx, l.low ? 2.85 : 3.35, sz, fr.ry, l.name, l.sc, Math.min(w - 0.6, 3.0));
      const [ix, iz] = toW(fr, 0, d / 2 + 1.6);
      const said = { book: ['「冬天就是要窩著看書。」', '「《公會館員日誌》？那是館員自己寫的，不賣喔。」'], barber: ['「下遺跡前剪短一點？頭髮卡在頭盔裡很難受的。」'], diner: ['「今天的定食是霜背鮒的味噌煮。」', '「下遺跡的勇者都吃大碗的。」'], watch: ['「德克斯凡的機芯，走得準。」', '「鐘樓那個鐘也是我們修的。」'], photo: ['「勇者證的照片？公會分館裡就能拍。」', '「櫥窗裡掛著好幾張穿禮服的合照。」'], dex: ['「魔導暖爐、魔導燈，德克斯凡來的新貨。」', '「最近大家都在買收音機，聽退位大典的轉播。」'] }[l.kind];
      if (l.kind === 'wagashi') inter(ix, iz, 2.0, '甘味處・和菓子（銅鑼燒、糰子）', () => (R.stallSheet ? R.stallSheet('和菓子店的老闆娘', ['「銅鑼燒剛蒸好。」', '「下遺跡的孩子，帶兩個在路上吃。」']) : null));
      else if (said) inter(ix, iz, 1.8, l.name, () => talk(l.name, said));
    };
    // 便利商店、診所
    const conbini = l => {
      const fr = frame(l.r, l.f), B = HB, { w, d } = fr, H = 3.6; B.at(fr.x, fr.z, fr.ry);
      B.add(G3.box, B_('#E8ECEE'), 0, H / 2, 0, w, H, d); B.add(G3.box, B_('#D8ECF4', { em: '#6A9AB8', ei: 0.8 }), -0.6, 1.3, d / 2 + 0.03, w - 2.4, 2.2, 0.05);
      [['#3A8A5A', 2.9], ['#E8A03A', 3.2], ['#3A6AAE', 3.45]].forEach(([c, y]) => B.add(G3.box, B_(c, { em: c, ei: 0.6 }), 0, y, d / 2 + 0.05, w + 0.02, 0.22, 0.04));
      B.add(G3.box, B_('#5A5C62', { tex: 'cap' }), 0, H + 0.08, 0, w + 0.2, 0.16, d + 0.2); B.add(G3.box, snowM, 0, H + 0.2, 0, w - 0.4, 0.06, d - 0.4);
      B.at(null); rblock(l.r);
      const [sx, sz] = toW(fr, 0, d / 2 + 0.1); sign(sx, 4.2, sz, fr.ry, '德克斯凡便利商店', '#1E3A2E', Math.min(w - 0.5, 3.4));
      const [vx, vz] = toW(fr, w / 2 - 0.7, d / 2 + 0.9); vending(vx, vz);
      const [ix, iz] = toW(fr, -0.6, d / 2 + 1.5); inter(ix, iz, 2.0, '德克斯凡便利商店（熱飲 6 費拉）', () => (R.vendingBuy ? R.vendingBuy() : null));
    };
    const clinic = l => {
      const fr = frame(l.r, l.f), B = HB, { w, d } = fr, H = 6; B.at(fr.x, fr.z, fr.ry);
      B.add(G3.box, B_('#F0F0EC'), 0, H / 2, 0, w, H, d); B.add(G3.box, B_('#BFD8E8', { em: '#5A7A8A', ei: 0.5 }), 0, 1.2, d / 2 + 0.03, 1.4, 2.0, 0.05); winRow(B, 1.6, w, d / 2 + 0.03, 3); winRow(B, 4.3, w, d / 2 + 0.03, 3);
      B.add(G3.box, B_('#5A5C62', { tex: 'cap' }), 0, H + 0.08, 0, w + 0.2, 0.16, d + 0.2); B.add(G3.box, snowM, 0, H + 0.2, 0, w - 0.4, 0.06, d - 0.4); B.add(G3.box, B_('#3A8A5A', { em: '#2A6A3A', ei: 0.6 }), w / 2 - 0.5, 4.4, d / 2 + 0.3, 0.6, 0.6, 0.1);
      B.at(null); rblock(l.r); const [sx, sz] = toW(fr, -0.8, d / 2 + 0.1); sign(sx, 3.0, sz, fr.ry, '內科診所', '#2E4A3A', 2.2);
      const [ix, iz] = toW(fr, 0, d / 2 + 1.4); inter(ix, iz, 1.8, '內科診所', () => talk('內科診所', ['門上貼著：「看診時間：上午、傍晚。遺跡的外傷請到白藤堂或東鶴醫院。」']));
    };
    // 倉庫、農家、溫室
    const warehouse = l => { const fr = frame(l.r, l.f), B = HB, { w, d } = fr, H = 4.2; B.at(fr.x, fr.z, fr.ry); B.add(G3.box, B_('#8A8E94', { tex: 'cap' }), 0, H / 2, 0, w, H, d); B.add(G3.box, B_('#5A5C62', { tex: 'cap' }), -w / 4, 1.6, d / 2 + 0.03, w / 3, 3.2, 0.06); gableB(B, w, d, H, 0, '#8A8E94'); B.at(null); rblock(l.r); };
    const farm = l => { const fr = frame(l.r, l.f), B = HB, { w, d } = fr, H = 3.2; B.at(fr.x, fr.z, fr.ry); B.add(G3.box, B_('#9A7A5A', { tex: 'planks' }), 0, H / 2, 0, w, H, d); B.add(G3.box, B_('#5A3E26', { tex: 'planks' }), 0, 1.1, d / 2 + 0.03, 1.2, 2.0, 0.06); winRow(B, 1.7, w, d / 2 + 0.03, 2); gableB(B, w, d, H, 0, '#9A7A5A'); B.at(null); rblock(l.r);
      const [cx, cz] = toW(fr, w / 2 + 1.6, 0.5); SB.add(G3.box, lam('#6A4A2E', { tex: 'planks' }), cx, 0.9, cz, 1.6, 1.8, 2.2); SB.add(G3.box, snowL, cx, 1.85, cz, 1.7, 0.1, 2.3); block(cx - 0.8, cx + 0.8, cz - 1.1, cz + 1.1, 'deco');
      const [ix, iz] = toW(fr, 0, d / 2 + 1.3); inter(ix, iz, 1.8, '敲農家的門', () => talk('農家', [pick(['「田都被雪蓋住了，春天才忙。」', '「冰鼬又來偷雞了。」', '「電車經過的時候，屋子都在晃。」'])])); };
    const greens = l => { const r = l.r, n = Math.max(2, Math.floor((r[2] - r[0]) / 18)), len = (r[3] - r[1]) * S, gm = B_('#E8F0F0', { em: '#9AB0B0', ei: 0.25, side: 1 }); for (let i = 0; i < n; i++) { const x = WX(r[0] + 9 + i * (r[2] - r[0] - 18) / Math.max(1, n - 1)), z = WZ((r[1] + r[3]) / 2); HB.add(G3.cyl, gm, x, 0, z, 3.0, len, 3.0, Math.PI / 2, 0, 0); HB.add(G3.box, snowM, x, 1.48, z, 1.4, 0.08, len - 0.2); block(x - 1.5, x + 1.5, z - len / 2, z + len / 2, 'deco'); } };
    // 停車場、菜園
    const parking = l => { const r = l.r, n = Math.floor((r[2] - r[0] - 6) / 10); for (let i = 0; i < n; i++) if (rnd() < (l.big ? 0.7 : 0.5)) carAt(WX(r[0] + 8 + i * 10), WZ((r[1] + r[3]) / 2), l.f === 1 ? Math.PI : 0); };
    const garden = l => { const r = l.r; [[r[0] + 2, r[1] + 2, r[2] - 2, r[1] + 2], [r[0] + 2, r[3] - 2, r[2] - 2, r[3] - 2]].forEach(([a, b, c]) => { SB.add(G3.box, woodM, WX((a + c) / 2), 0.5, WZ(b), (c - a) * S, 0.06, 0.06); }); for (let x = r[0] + 2; x <= r[2] - 2; x += 8) [r[1] + 2, r[3] - 2].forEach(y => SB.add(G3.box, woodM, WX(x), 0.4, WZ(y), 0.08, 0.8, 0.08)); };

    plan.lots.forEach(l => ({ house: jhouse, apt, shop, conbini, clinic, warehouse, farm, greens, parking, garden })[l.type](l));

    // ---------- 鐵路 ----------
    const railM = lam('#8A8A94', { tex: 0 }), fenceM = lam('#4A6A52', { tex: 0 });
    RAIL.t.forEach(ty => [-2.45, 2.45].forEach(o => SB.add(G3.box, railM, 0, 0.06, WZ(ty + o), HALF * 2, 0.12, 0.08)));
    // 圍籬：只能從平交道過鐵路
    const gaps = CROSS.map(c => [c - 9, c + 9]).concat([BRIDGE]).sort((a, b) => a[0] - b[0]);
    [RAIL.fn, RAIL.fs].forEach(fy => {
      let a = 0; const runs = []; gaps.forEach(([g0, g1]) => { if (g0 > a) runs.push([a, g0]); a = g1; }); runs.push([a, 1000]);
      runs.forEach(([x0, x1]) => { const z = WZ(fy); SB.add(G3.box, fenceM, WX((x0 + x1) / 2), 0.85, z, (x1 - x0) * S, 0.06, 0.06); SB.add(G3.box, fenceM, WX((x0 + x1) / 2), 0.45, z, (x1 - x0) * S, 0.05, 0.05); for (let x = x0; x <= x1; x += 9) SB.add(G3.box, fenceM, WX(x), 0.5, z, 0.07, 1.0, 0.07); block(WX(x0), WX(x1), z - 0.12, z + 0.12, 'wall'); });
    });
    // 鐵橋：兩邊的桁架
    { const x0 = WX(BRIDGE[0]), x1 = WX(BRIDGE[1]), len = x1 - x0, cx = (x0 + x1) / 2; [RAIL.y0 + 3, RAIL.y1 - 3].forEach(y => { const z = WZ(y); SB.add(G3.box, lam('#5A6A7A', { tex: 0 }), cx, 1.6, z, len, 0.14, 0.14); SB.add(G3.box, lam('#5A6A7A', { tex: 0 }), cx, 0.1, z, len, 0.2, 0.2); for (let i = 0; i <= 8; i++) SB.add(G3.box, lam('#5A6A7A', { tex: 0 }), x0 + i * len / 8, 0.85, z, 0.1, 1.6, 0.1, 0, 0, i % 2 ? 0.6 : -0.6); }); }
    // 架線：北邊的電線桿、橫桿，兩條軌道上面的線
    for (let x = 20; x < 1000; x += 64) { if (x > BRIDGE[0] - 6 && x < BRIDGE[1] + 6) continue; if (CROSS.some(c => Math.abs(c - x) < 14)) continue; const px = WX(x), pz = WZ(RAIL.y0 - 1); SB.add(G3.box, metal, px, 3, pz, 0.18, 6, 0.18); SB.add(G3.box, metal, px, 5.6, WZ((RAIL.y0 + RAIL.y1) / 2) - 0.2, 0.1, 0.1, (RAIL.y1 - RAIL.y0 + 2) * S); block(px - 0.15, px + 0.15, pz - 0.15, pz + 0.15, 'deco'); }
    RAIL.t.forEach(ty => SB.add(G3.box, metal, 0, 5.0, WZ(ty), HALF * 2, 0.03, 0.03));

    // ---------- 平交道：柵欄、紅燈、叉叉的標誌 ----------
    tw.crossings = [];
    const armM = lam('#F2D21A', { tex: 0 });
    CROSS.forEach(cxs => {
      const x = WX(cxs), hw = 7.5 * S, c = { x, k: 0, arms: [], lamps: [], boxes: [] };
      [[x + hw + 0.35, WZ(RAIL.fs + 1), 1], [x - hw - 0.35, WZ(RAIL.fn - 1), -1]].forEach(([px, pz, sd]) => {
        SB.add(G3.box, metal, px, 1.6, pz, 0.14, 3.2, 0.14); [0.6, -0.6].forEach(a => SB.add(G3.box, armM, px, 2.95, pz, 0.95, 0.12, 0.04, 0, 0, a)); SB.add(G3.box, metal, px, 0.35, pz, 0.4, 0.7, 0.4);
        [-0.22, 0.22].forEach(o => { const lm = new TH.Mesh(new TH.BoxGeometry(0.22, 0.22, 0.1), new TH.MeshLambertMaterial({ color: '#4A1A18', emissive: '#FF2A1A', emissiveIntensity: 0 })); lm.position.set(px + o, 2.35, pz + sd * 0.1); group.add(lm); c.lamps.push(lm); });
        const piv = new TH.Group(); piv.position.set(px, 1.0, pz); group.add(piv);
        const arm = new TH.Mesh(new TH.BoxGeometry(hw * 2 + 0.3, 0.1, 0.1), armM); arm.position.x = -sd * (hw + 0.15); piv.add(arm);
        for (let i = 0; i < 3; i++) { const st = new TH.Mesh(new TH.BoxGeometry(0.3, 0.11, 0.11), metal); st.position.x = -sd * (0.6 + i * 1.0); piv.add(st); }
        piv.rotation.z = -sd * Math.PI / 2; c.arms.push({ piv, sd });
        const bxo = block(x - hw, x + hw, pz - 0.15, pz + 0.15, 'deco'); bxo.on = false; c.boxes.push(bxo);
        block(px - 0.2, px + 0.2, pz - 0.2, pz + 0.2, 'deco');
      });
      tw.crossings.push(c);
    });

    // ---------- 東鶴站：站房、月台、跨線橋 ----------
    { const r = STATION, x0 = WX(r[0]), x1 = WX(r[2]), z0 = WZ(r[1]), z1 = WZ(r[3]), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, B = HB;
      const wall = B_('#D8D4CA', { tex: 'wall' }), dk = B_('#3A3C42', { tex: 'cap' });
      B.at(cx, cz, 0);
      B.add(G3.box, wall, 0, 1.8, 0, w, 3.6, d); B.add(G3.box, B_('#BFD8E8', { em: '#4A7A9A', ei: 0.7 }), 0, 1.35, d / 2 + 0.03, 5, 2.6, 0.06);
      [-6.5, -4.2, 4.2, 6.5].forEach(o => B.add(G3.box, glowW, o, 1.7, d / 2 + 0.03, 1.4, 1.2, 0.05));
      B.add(G3.box, dk, 0, 3.0, d / 2 + 1.1, 8, 0.16, 2.2); B.add(G3.box, snowM, 0, 3.1, d / 2 + 0.6, 7.6, 0.06, 0.9); [-3.8, 3.8].forEach(o => B.add(G3.box, dk, o, 1.5, d / 2 + 2.0, 0.16, 3.0, 0.16));
      B.add(G3.box, dk, 0, 3.7, 0, w + 0.3, 0.2, d + 0.3); B.add(G3.box, snowM, 0, 3.82, 0, w - 0.4, 0.06, d - 0.4);
      B.add(G3.box, wall, 2, 5.3, -0.5, w * 0.62, 3.0, d - 1.2); winRow(B, 5.3, w * 0.62 - 0.6, d / 2 - 1.1 + 0.03, 6, 1.0); B.add(G3.box, dk, 2, 6.9, -0.5, w * 0.62 + 0.3, 0.2, d - 0.9); B.add(G3.box, snowM, 2, 7.02, -0.5, w * 0.62 - 0.3, 0.06, d - 1.4);
      [-1.2, 1.2].forEach(o => B.add(G3.box, B_('#2E5A8A', { em: '#1E3A6A', ei: 0.5 }), -5.5 + o * 0.7, 0.85, d / 2 + 0.45, 0.6, 1.7, 0.5));
      // 跨線橋：從二樓過軌道到月台，月台上一段樓梯
      const bz0 = WZ(RAIL.fs) - cz, bz1 = WZ((PLAT[1] + PLAT[3]) / 2) - cz, bx = 6.5;
      B.add(G3.box, B_('#C8CCD0', { tex: 'wall' }), bx, 6.4, (bz0 + bz1) / 2 - 0.6, 2.2, 2.4, Math.abs(bz1 - bz0) + 1.2); B.add(G3.box, dk, bx, 7.7, (bz0 + bz1) / 2 - 0.6, 2.5, 0.16, Math.abs(bz1 - bz0) + 1.4); B.add(G3.box, snowM, bx, 7.8, (bz0 + bz1) / 2 - 0.6, 2.2, 0.06, Math.abs(bz1 - bz0) + 1.1);
      for (let i = 0; i < 3; i++) B.add(G3.box, glowW, bx + 1.12, 6.5, bz0 + (bz1 - bz0) * (i + 0.5) / 3, 0.05, 0.8, 1.0);
      B.add(G3.box, B_('#B8BCC2', { tex: 'cap' }), bx - 3.4, 3.4, bz1, 6.8, 0.25, 1.4, 0, 0, -0.72);
      B.at(null); block(x0, x1, z0, z1, 'house'); [-3.8, 3.8].forEach(o => block(cx + o - 0.15, cx + o + 0.15, z1 + 1.85, z1 + 2.15, 'deco'));
      bigSign(cx - 0.6, 5.5, z1 - 1.1 + 0.08, 0, '東鶴站', '#1E2E48', '#F4F0E6', 5.4, 1.4); bigSign(cx, 3.3, z1 + 2.21, 0, '東鶴站　售票口・候車室', '#2E3A48', '#F4E9CD', 7.6, 0.5);
      const face = new TH.Mesh(new TH.CircleGeometry(0.75, 20), R.seeThrough(new TH.MeshLambertMaterial({ color: '#F4ECD8', emissive: '#FFE8B0', emissiveIntensity: 0.5 }))); face.position.set(cx + 6.8, 5.4, z1 - 1.1 + 0.06); group.add(face);
      [[0.5, 0.06, 0.6], [0.35, 0.08, -0.9]].forEach(([len, wd, a]) => { const h = new TH.Mesh(new TH.BoxGeometry(wd, len, 0.03), new TH.MeshBasicMaterial({ color: '#1A1414' })); h.geometry.translate(0, len / 2, 0); h.position.set(cx + 6.8, 5.4, z1 - 1.04); h.rotation.z = a; group.add(h); });
      inter(cx, z1 + 2.6, 2.6, '東鶴站・售票口（搭魔導電車到昭旭全國的遺跡）', () => (E.martial ? talk('東鶴站', ['售票口的窗簾拉下來了：「退位大典，全線停駛。」']) : R.openMapPaused ? R.openMapPaused('nation') : R.openMap('nation')));
      inter(cx - 6.5, z1 + 1.2, 1.8, '看東鶴站的時刻表', () => talk('東鶴站的時刻表', [R.today ? R.dateLabel() : '', '上行・往皇嶺：每天四班（其中兩班是特急）。', '下行・往吉山、奉主：每天三班。', E.martial ? '本日退位大典：全線停駛。' : E.blizzard ? '暴風雪：全線誤點。' : '本日正常行駛。']));
      const staff = npc(cx + 3.2, z1 + 1.4, { top: '#2E3A48', hair: '#2A2420', cloak: '#2E3A48', hs: 'crop', acc: 'glasses' }, '站務員', 0);
      inter(cx + 3.2, z1 + 2.4, 1.8, '和站務員說話', () => talk('站務員', [pick(['「魔導電車是德克斯凡的技術。剛通車那年，整個東鶴的人都跑來看。」', '「平交道的柵欄放下來的時候，千萬別鑽過去。」', '「往皇嶺的特急，這幾天因為大典，票都賣光了。」'])]), { follow: staff });
      // 月台：島式月台、雨棚、站名牌、長椅
      const px0 = WX(PLAT[0]), px1 = WX(PLAT[2]), pz0 = WZ(PLAT[1]), pz1 = WZ(PLAT[3]), pcx = (px0 + px1) / 2, pcz = (pz0 + pz1) / 2, pw = px1 - px0, pd = pz1 - pz0;
      HB.add(G3.box, B_('#B4B0A6', { tex: 'cap' }), pcx, 0.45, pcz, pw, 0.9, pd); [pz0 + 0.1, pz1 - 0.1].forEach(z => HB.add(G3.box, B_('#E8C040', { tex: 0 }), pcx, 0.91, z, pw, 0.02, 0.2));
      for (let x = px0 + 4; x < px0 + 24; x += 4) HB.add(G3.box, dk, x, 2.2, pcz, 0.16, 2.6, 0.16);
      HB.add(G3.box, dk, px0 + 14, 3.55, pcz, 22, 0.14, pd + 0.2); HB.add(G3.box, snowM, px0 + 14, 3.66, pcz, 21.6, 0.06, pd - 0.1);
      [px0 + 8, px0 + 18].forEach(x => { HB.add(G3.box, woodM, x, 1.3, pcz, 1.8, 0.1, 0.5); HB.add(G3.box, dk, x, 1.1, pcz, 1.6, 0.4, 0.3); });
      HB.add(G3.box, dk, px1 - 3, 1.8, pcz, 0.1, 1.8, 0.1); block(px0, px1, pz0, pz1, 'wall');
      sign(px1 - 3, 2.5, pcz + 0.08, 0, '東鶴', '#2E3A48', 1.6);
    }

    // ---------- 站前廣場：計程車、公車站、花壇、腳踏車、崗亭 ----------
    { const P0 = PLAZA;
      carAt(WX(640), WZ(358.5), Math.PI / 2, '#E8C03A'); carAt(WX(656), WZ(358.5), Math.PI / 2, '#E8C03A');
      const shelter = (sx, sy) => { const x = WX(sx), z = WZ(sy); HB.add(G3.box, B_('#BFD8E8', { em: '#5A7A8A', ei: 0.25 }), x, 1.2, z - 0.7, 3, 1.8, 0.06); HB.add(G3.box, B_('#3A3C42', { tex: 'cap' }), x, 2.5, z, 3.4, 0.12, 1.8); HB.add(G3.box, snowM, x, 2.58, z, 3.2, 0.05, 1.6); [-1.5, 1.5].forEach(o => HB.add(G3.box, metal, x + o, 1.25, z - 0.7, 0.08, 2.5, 0.08)); HB.add(G3.box, woodM, x, 0.45, z - 0.4, 2.4, 0.1, 0.4); block(x - 1.6, x + 1.6, z - 0.8, z - 0.6, 'deco'); };
      shelter(735, 360); shelter(756, 360);
      SB.add(G3.box, metal, WX(746), 1.3, WZ(357.5), 0.08, 2.6, 0.08); SB.add(G3.box, lam('#2E5A8A', { tex: 0 }), WX(746), 2.5, WZ(357.5), 0.6, 0.6, 0.04);
      inter(WX(746), WZ(364), 1.8, '公車站的站牌', () => talk('公車站', ['環城線：北門 → 西市口 → 南門 → 河西。', '往皇嶺的長途巴士：每天一班。']));
      // 花壇與時鐘柱
      { const x = WX(690), z = WZ(381); SB.add(G3.cyl, concrete, x, 0.3, z, 7.6, 0.6, 3.4); SB.add(G3.cyl, snowL, x, 0.62, z, 7.2, 0.06, 3.0); pineAt(x - 1.8, z, 0.8); pineAt(x + 1.8, z, 0.7); SB.add(G3.box, metal, x, 2.2, z, 0.16, 4.4, 0.16); SB.add(G3.box, lam('#F4ECD8', { em: '#FFE8B0', ei: 0.5 }), x, 4.4, z, 0.7, 0.7, 0.7); block(x - 3.6, x + 3.6, z - 1.5, z + 1.5, 'deco'); inter(x, z + 2.2, 1.8, '站前的時鐘柱', () => R.townToast('時鐘柱底下刻著：「魔導電車東鶴站 開業紀念」。')); }
      for (let i = 0; i < 6; i++) bike(WX(764), WZ(368 + i * 4), Math.PI / 2);
      vending(WX(636), WZ(369)); vending(WX(641), WZ(369));
      bench(WX(660), WZ(392), 0); bench(WX(716), WZ(392), 0);
      [[612, 360], [612, 392], [770, 392], [728, 372]].forEach(([sx, sy]) => lampPost(WX(sx), WZ(sy)));
      // 衛兵的崗亭
      { const x = WX(618), z = WZ(378); HB.add(G3.box, B_('#C8C4BC', { tex: 'wall' }), x, 1.3, z, 1.8, 2.6, 1.8); HB.add(G3.box, glowW, x + 0.92, 1.6, z, 0.05, 0.8, 1.2); HB.add(G3.box, B_('#3A3C42', { tex: 'cap' }), x, 2.7, z, 2.2, 0.16, 2.2); HB.add(G3.box, snowM, x, 2.8, z, 2, 0.06, 2); block(x - 0.9, x + 0.9, z - 0.9, z + 0.9, 'house');
        const gd = npc(x + 1.6, z + 0.6, { top: '#3E4A5A', hair: '#2A2420', cloak: '#2E3A48', shield: true }, '站前崗亭的衛兵', Math.PI / 2, 'spear', 'knight'); gd.watch = { range: 11, fov: 1.0, guard: 1 }; tw.watchers.push(gd); gd.guard = true;
        inter(x + 1.6, z + 1.4, 1.8, '和崗亭的衛兵說話', () => talk('站前崗亭的衛兵', [E.martial ? '「戒嚴中。電車停駛，車站也不讓人進。」' : pick(['「從皇嶺來的人越來越多，車站前要有人顧著。」', '「平交道別亂闖。上個月有個醉漢差點被電車撞。」'])]), { follow: gd }); }
      // 商店街的牌樓（兩頭）
      [398, 588].forEach(sx => { const x = WX(sx), za = WZ(356.5), zb = WZ(375.5); [za, zb].forEach(z => { HB.add(G3.box, B_('#8A2A24', { tex: 0 }), x, 2.2, z, 0.3, 4.4, 0.3); block(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 'deco'); }); HB.add(G3.box, B_('#3A2A1C', { tex: 'planks' }), x, 4.5, (za + zb) / 2, 0.3, 0.6, zb - za + 0.6); HB.add(G3.box, snowM, x, 4.84, (za + zb) / 2, 0.36, 0.08, zb - za + 0.5); sign(x + (sx < 500 ? -0.18 : 0.18), 3.75, (za + zb) / 2, sx < 500 ? -Math.PI / 2 : Math.PI / 2, '站前商店街', '#5A1E1C', 2.8); });
      // 商店街、站前大街的路燈
      for (let sx = 412; sx < 960; sx += 34) { if (sx > 566 && sx < 776) continue; lampPost(WX(sx), WZ(357.6)); lampPost(WX(sx + 17), WZ(374.4)); }
    }

    // ---------- 河西：特別的區域 ----------
    // 城西遺跡・公會調查點：圍起來（東邊留一個入口給路）
    { const r = Z.ruins, fm = lam('#8A7A5A', { tex: 'planks' });
      const fence = (ax, ay, bx2, by) => { const x0 = WX(Math.min(ax, bx2)), x1 = WX(Math.max(ax, bx2)), z0 = WZ(Math.min(ay, by)), z1 = WZ(Math.max(ay, by)), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, wx = Math.max(0.1, x1 - x0), wz = Math.max(0.1, z1 - z0); SB.add(G3.box, fm, cx, 0.9, cz, wx, 0.1, wz); SB.add(G3.box, fm, cx, 0.5, cz, wx, 0.1, wz); const n = Math.max(1, Math.round(Math.max(wx, wz) / 1.6)); for (let i = 0; i <= n; i++) SB.add(G3.box, fm, x0 + (x1 - x0) * i / n, 0.55, z0 + (z1 - z0) * i / n, 0.1, 1.1, 0.1); block(x0 - 0.06, x1 + 0.06, z0 - 0.06, z1 + 0.06, 'wall'); };
      fence(r[0], r[1], r[2], r[1]); fence(r[0], r[3], r[2], r[3]); fence(r[0], r[1], r[0], r[3]); fence(r[2], r[1], r[2], 412); fence(r[2], 436, r[2], r[3]);
      sign(WX(r[2]) + 0.3, 1.6, WZ(424), Math.PI / 2, '公會調查點・閒人勿入', '#2E4A34', 2.6);
      for (let i = 0; i < 5; i++) pineAt(WX(r[0] + 8 + i * 6), WZ(r[3] - 8 - (i % 2) * 6), 0.8); }
    // 河西小學：校舍、體育館、操場、校門
    { const r = Z.school, B = HB, cx = WX((r[0] + r[2]) / 2), bz = WZ(r[1] + 13), w = (r[2] - r[0] - 30) * S;
      B.at(cx + 3, bz, 0); B.add(G3.box, B_('#E8E2D4'), 0, 4.2, 0, w, 8.4, 4.8); for (let f = 0; f < 3; f++) winRow(B, 1.6 + f * 2.8, w - 1, 2.43, Math.floor(w / 1.8), 1.2); B.add(G3.box, B_('#5A5C62', { tex: 'cap' }), 0, 8.5, 0, w + 0.3, 0.2, 5.1); B.add(G3.box, snowM, 0, 8.62, 0, w - 0.3, 0.06, 4.5);
      B.add(G3.box, B_('#E8E2D4'), w / 2 - 3, 9.6, 0, 2.4, 2.2, 2.4); B.add(G3.box, B_('#F4ECD8', { em: '#FFE8B0', ei: 0.4 }), w / 2 - 3, 9.8, 1.22, 1.0, 1.0, 0.05); B.at(null);
      block(cx + 3 - w / 2, cx + 3 + w / 2, bz - 2.4, bz + 2.4, 'house');
      const gx = WX(r[0] + 14), gz = WZ(r[1] + 40); B.at(gx, gz, 0); B.add(G3.box, B_('#B8BCC2', { tex: 'cap' }), 0, 2.6, 0, 5, 5.2, 7); gableB(B, 5, 7, 5.2, 0, '#B8BCC2'); B.at(null); block(gx - 2.5, gx + 2.5, gz - 3.5, gz + 3.5, 'house');
      sign(cx + 3, 3.6, bz + 2.5, 0, '河西小學', '#2E4A3A', 2.4);
      // 圍牆、校門（東邊）
      const fz0 = WZ(r[1] + 1), fz1 = WZ(r[3] - 1), fx0 = WX(r[0] + 1), fx1 = WX(r[2] - 1);
      [[fx0, fz1, fx1, fz1], [fx0, fz0, fx0, fz1]].forEach(([a, b2, c, e]) => { const wx = Math.max(0.15, c - a), wz = Math.max(0.15, e - b2); SB.add(G3.box, concrete, (a + c) / 2, 0.6, (b2 + e) / 2, wx, 1.2, wz); block(a - 0.08, c + 0.08, b2 - 0.08, e + 0.08, 'wall'); });
      const gm = WZ(590); [[fz0 + 5.6, gm - 1.4], [gm + 1.4, fz1]].forEach(([a, b2]) => { SB.add(G3.box, concrete, fx1, 0.6, (a + b2) / 2, 0.15, 1.2, b2 - a); block(fx1 - 0.08, fx1 + 0.08, a, b2, 'wall'); });
      [gm - 1.5, gm + 1.5].forEach(z => SB.add(G3.box, concrete, fx1, 0.9, z, 0.4, 1.8, 0.4));
      inter(fx1 + 1, gm, 2.2, '河西小學的校門', () => talk('河西小學', ['寒假中，校門鎖著。', '操場上有人堆了一整排雪人。']));
      for (let i = 0; i < 5; i++) { const x = WX(r[0] + 50 + i * 16), z = WZ(r[3] - 22); SB.add(G3.sph, snowL, x, 0.5, z, 0.9, 0.9, 0.9); SB.add(G3.sph, snowL, x, 1.15, z, 0.6, 0.6, 0.6); } }
    // 兒童公園：鞦韆、溜滑梯、沙坑、長椅
    { const r = Z.park, x = WX(r[0]), z = WZ(r[1]);
      const sw = x + 8, sz = z + 4; [-1.2, 1.2].forEach(o => SB.add(G3.box, lam('#C83A3A', { tex: 0 }), sw + o, 1.2, sz, 0.1, 2.4, 0.1)); SB.add(G3.box, lam('#C83A3A', { tex: 0 }), sw, 2.4, sz, 2.6, 0.1, 0.1); [-0.6, 0.6].forEach(o => { SB.add(G3.box, metal, sw + o, 1.5, sz, 0.03, 1.8, 0.03); SB.add(G3.box, woodM, sw + o, 0.55, sz, 0.5, 0.06, 0.25); }); block(sw - 1.3, sw + 1.3, sz - 0.3, sz + 0.3, 'deco');
      inter(sw, sz + 1.2, 1.6, '盪鞦韆', () => R.townToast('盪了兩下鞦韆。鐵鍊冰得黏手。'));
      const slx = x + 8, slz = z + 11; SB.add(G3.box, lam('#3A6AAE', { tex: 0 }), slx - 1, 1, slz, 0.8, 2, 0.8); SB.add(G3.box, lam('#E8C03A', { tex: 0 }), slx + 0.6, 1, slz, 2.6, 0.1, 0.7, 0, 0, -0.6); block(slx - 1.4, slx + 1.8, slz - 0.4, slz + 0.4, 'deco');
      bench(x + 4, z + 14, 0); pineAt(x + 11, z + 2, 0.9); pineAt(x + 12, z + 13, 0.8); sign(x + 7, 1.8, z + 15.6, 0, '河西兒童公園', '#3E5A3A', 2.2); }
    // 鎮守的小祠：小鳥居、小拜殿、石燈籠、樹
    { const r = Z.grove, cx = WX((r[0] + r[2]) / 2), z0 = WZ(r[1]), B = HB; B.at(cx, z0 + 3.5, 0); B.add(G3.box, B_('#E6E0D2'), 0, 1.3, 0, 3.4, 2.6, 2.6); B.add(G3.box, B_('#8A2A24', { tex: 'planks' }), 0, 1.3, 1.32, 3.4, 2.6, 0.06); gableB(B, 3.4, 2.6, 2.6, 0, '#E6E0D2'); B.at(null); block(cx - 1.7, cx + 1.7, z0 + 2.2, z0 + 4.8, 'house');
      const tz = WZ(r[3] - 3); [-1.1, 1.1].forEach(o => { SB.add(G3.cyl, lam('#C8322A', { tex: 0 }), cx + o, 1.2, tz, 0.26, 2.4, 0.26); block(cx + o - 0.15, cx + o + 0.15, tz - 0.15, tz + 0.15, 'deco'); }); SB.add(G3.box, lam('#1A1A1A', { tex: 0 }), cx, 2.5, tz, 3.4, 0.24, 0.3); SB.add(G3.box, snowL, cx, 2.66, tz, 3.3, 0.06, 0.28);
      for (let i = 0; i < 8; i++) pineAt(WX(r[0] + 4 + (i % 2) * (r[2] - r[0] - 8)), WZ(r[1] + 6 + Math.floor(i / 2) * 15), 0.9 + rnd() * 0.3);
      inter(cx, z0 + 6.5, 2, '向鎮守的小祠合掌', () => R.townToast('小祠前供著一個橘子，上面積了一點雪。')); }
    // 墓地：一排排的墓碑
    { const r = Z.grave; for (let y = r[1] + 6; y < r[3] - 4; y += 9) for (let x = r[0] + 5; x < r[2] - 3; x += 8) { const gx = WX(x), gz = WZ(y); SB.add(G3.box, lam('#8C8A84', { tex: 'wall' }), gx, 0.2, gz, 1.1, 0.4, 0.8); SB.add(G3.box, lam('#9C9A94', { tex: 'wall' }), gx, 0.85, gz, 0.5, 0.9, 0.3); SB.add(G3.box, snowL, gx, 1.32, gz, 0.52, 0.05, 0.32); block(gx - 0.5, gx + 0.5, gz - 0.4, gz + 0.4, 'deco'); }
      inter(WX(r[0] + 2), WZ((r[1] + r[3]) / 2), 2.2, '墓地', () => R.townToast('一排排的墓碑，有幾座放著新的花。')); }
    // 河西超市：大賣場、停車場
    { const r = Z.market, B = HB, w = 15, d = 7, x = WX(r[2] - 36), z = WZ(r[1] + 16); B.at(x, z, 0); B.add(G3.box, B_('#E8E4DC'), 0, 2.6, 0, w, 5.2, d); B.add(G3.box, B_('#D8ECF4', { em: '#6A9AB8', ei: 0.6 }), 0, 1.3, d / 2 + 0.03, w - 4, 2.2, 0.05); B.add(G3.box, B_('#C83A3A', { em: '#8A1A1A', ei: 0.5 }), 0, 4.2, d / 2 + 0.05, w + 0.02, 0.9, 0.05); B.add(G3.box, B_('#5A5C62', { tex: 'cap' }), 0, 5.3, 0, w + 0.3, 0.2, d + 0.3); B.add(G3.box, snowM, 0, 5.42, 0, w - 0.4, 0.06, d - 0.4); B.at(null); block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'house');
      sign(x, 4.2, z + d / 2 + 0.1, 0, '河西超市', '#8A1A1A', 3.0);
      for (let i = 0; i < 9; i++) if (rnd() < 0.6) carAt(WX(r[0] + 11 + i * 11), WZ(r[3] - 14), Math.PI);
      inter(x, z + d / 2 + 1.4, 2, '河西超市', () => talk('河西超市', [pick(['「冬天的白菜一顆三費拉，便宜喔！」', '「年底大特價，德克斯凡的罐頭買三送一。」'])])); }

    // ---------- 電線桿（河西、城南、城東、站東）----------
    { const PM = lam('#6A6A70', { tex: 0 }), WM = lam('#1E1A18', { tex: 0 });
      const poleRun = (ax, ay, bx2, by, off) => { const L = Math.hypot(bx2 - ax, by - ay), n = Math.max(1, Math.round(L / 42)), ux = (bx2 - ax) / L, uy = (by - ay) / L; let prev = null;
        for (let i = 0; i <= n; i++) { const sx = ax + ux * L * i / n - uy * off, sy = ay + uy * L * i / n + ux * off; if (plan.lots.some(l => sx > l.r[0] - 1 && sx < l.r[2] + 1 && sy > l.r[1] - 1 && sy < l.r[3] + 1) || ZL.some(z => sx > z[0] && sx < z[2] && sy > z[1] && sy < z[3])) { prev = null; continue; } const x = WX(sx), z = WZ(sy);
          SB.add(G3.cyl, PM, x, 3.4, z, 0.22, 6.8, 0.22); SB.add(G3.box, PM, x, 6.3, z, 1.4, 0.1, 0.12, 0, -Math.atan2(uy, ux), 0); if (i % 3 === 1) SB.add(G3.cyl, lam('#8A8C92', { tex: 0 }), x + 0.3, 5.4, z, 0.5, 0.7, 0.5); block(x - 0.14, x + 0.14, z - 0.14, z + 0.14, 'deco');
          if (prev) { const mx = (prev[0] + x) / 2, mz = (prev[1] + z) / 2, len = Math.hypot(x - prev[0], z - prev[1]), a = Math.atan2(x - prev[0], z - prev[1]); [-0.5, 0.5].forEach(o => SB.add(G3.box, WM, mx + Math.cos(a) * o, 6.15, mz - Math.sin(a) * o, 0.03, 0.03, len, 0, a, 0)); }
          prev = [x, z]; } };
      runsH.forEach(([y, segs]) => segs.forEach(([u0, u1]) => poleRun(u0, y, u1, y, 7.5)));
      runsV.forEach(([x, segs]) => segs.forEach(([u0, u1]) => poleRun(x, u0, x, u1, 7.5)));
      poleRun(401, 891, 958, 891, 6.2); poleRun(971, 400, 971, 882, -6.2); poleRun(776, 332, 960, 332, -5); poleRun(380, 332, 592, 332, -5); }

    // ---------- 地圖外：遠方的街景（走不到，只是看得到；東邊往新市街，有幾棟高樓）----------
    { const farHouse = (sx, sy, w, d, h) => { const x = WX(sx), z = WZ(sy), col = pick(WALLS); HB.at(x, z, 0); HB.add(G3.box, B_(col), 0, h / 2, 0, w, h, d); winRow(HB, h * 0.6, w, d / 2 + 0.03, Math.max(1, Math.floor(w / 2.2))); gableB(HB, w, d, h, 0, col); HB.at(null); };
      const tower = (sx, sy, w, d, fl) => { const x = WX(sx), z = WZ(sy), H = fl * 3; HB.at(x, z, 0); HB.add(G3.box, B_(pick(['#8A8C92', '#9A8A7A', '#7A7C82', '#A8A49C'])), 0, H / 2, 0, w, H, d); for (let f = 0; f < fl; f++) winRow(HB, f * 3 + 1.7, w, d / 2 + 0.03, Math.max(2, Math.floor(w / 1.8)), 1.0); HB.add(G3.box, snowM, 0, H + 0.06, 0, w - 0.3, 0.1, d - 0.3); HB.at(null); };
      for (let sy = 300; sy < 1080; sy += 28) { farHouse(1014 + rnd() * 4, sy, 5 + rnd() * 1.5, 5, 5.6); farHouse(1046 + rnd() * 6, sy + 12, 5.5, 5, 5.6); if (rnd() < 0.3) tower(1080 + rnd() * 30, sy, 8, 8, 5 + Math.floor(rnd() * 6)); }
      for (let sx = 340; sx < 1000; sx += 30) { farHouse(sx, 1014 + rnd() * 4, 5.5, 5, 5.6); farHouse(sx + 14, 1044 + rnd() * 6, 5, 5, 5.6); }
      for (let sy = 330; sy < 1080; sy += 30) { farHouse(-14 - rnd() * 4, sy, 5, 5.5, 5.6); farHouse(-44 - rnd() * 6, sy + 14, 5.5, 5, 5.6); } }

    // ---------- 路人 ----------
    const looks = () => { const race = R.randomRace ? R.randomRace() : 'human', rc = R.RACES ? R.RACES[race] : null; return { top: pick(['#B8A688', '#3E5A6E', '#7A5A6A', '#8A3A2E', '#2E4A6A', '#5A6A4A', '#C8BCA2', '#6A6A70']), hair: rc && rc.hairs ? rc.hairs[0] : pick(['#2A2420', '#6A4A2E', '#1A1714', '#8A5A2E', '#D8D2C4']), cloak: pick(['#4A3A30', '#3A3A44', '#5A4A3A', '#2E3A48']), race, skin: rc ? rc.skins[Math.floor(rnd() * rc.skins.length)] : undefined, hs: pick(['short', 'long', 'ponytail', 'bun', 'bob', 'crop', 'spiky']), acc: rnd() < 0.25 ? pick(['scarf', 'glasses', 'headband']) : null, accCol: pick(['#C8323A', '#2E5A8A', '#3E7A48']) }; };
    const nextNode = n => { const nb = plan.adj[n.ni]; if (nb && nb.length) n.ni = nb[Math.floor(Math.random() * nb.length)]; const [sx, sy] = plan.nodes[n.ni]; return [WX(sx + (Math.random() - 0.5) * 6), WZ(sy + (Math.random() - 0.5) * 6)]; };
    const walker = ni => { const [sx, sy] = plan.nodes[ni], n = npc(WX(sx), WZ(sy), looks(), null, 0); n.walk = true; n.ni = ni; n.next = nextNode; [n.tx, n.tz] = nextNode(n); n.speed = 1.5 + rnd() * 0.6; n.watch = { range: 6, fov: 1.0, civ: 1 }; tw.watchers.push(n); return n; };
    const many = E.martial ? 0.3 : E.blizzard ? 0.25 : 1;
    for (let i = 0; i < Math.round(16 * many); i++) walker(Math.floor(rnd() * KASAI_N));
    for (let i = 0; i < Math.round(18 * many); i++) walker(KASAI_N + Math.floor(rnd() * (plan.nodes.length - KASAI_N)));
    // 站在車站前、公車站等車的人
    [[732, 362, '等公車的上班族', ['「德克斯凡的公司早上八點半就要打卡。」', '「下雪天，公車永遠都遲到。」']], [700, 361, '剛下電車的旅客', ['「從皇嶺來的。大典那邊人擠人，還是東鶴安靜。」']], [470, 366, '商店街的會長', ['「站前商店街，從電車通車那年就熱鬧起來了。」', '「年底的福引抽獎，頭獎是德克斯凡的魔導暖爐。」']]].forEach(([sx, sy, nm, lines], i) => { const n = npc(WX(sx), WZ(sy), looks(), nm, i === 2 ? 0 : Math.PI); n.watch = { range: 6, fov: 1.0, civ: 1 }; tw.watchers.push(n); inter(WX(sx), WZ(sy) + 1, 1.6, '和' + nm + '說話', () => talk(nm, lines), { follow: n }); });

    // ---------- 魔導電車 ----------
    { const g = new TH.Group(), CL = 8.6, GAP = 0.5, N = 3, len = N * CL + (N - 1) * GAP, cb = R.Batch();
      const body = lam('#E4E8EC', { tex: 0 }), stripe = lam('#2E6AAE', { tex: 0 }), stripe2 = lam('#C8A03A', { tex: 0 }), roofM = lam('#8A8E94', { tex: 'cap' }), win = lam('#BFD8E8', { em: '#3A5A7A', ei: 0.6 }), dark = lam('#2A2C32', { tex: 0 }), light = lam('#FFF4D8', { em: '#FFE0A0', ei: 1 }), dest = lam('#FFB04A', { em: '#C86A10', ei: 0.9 });
      for (let i = 0; i < N; i++) {
        const cx = -len / 2 + CL / 2 + i * (CL + GAP);
        cb.add(G3.box, body, cx, 2.0, 0, CL, 2.9, 2.5); cb.add(G3.box, stripe, cx, 1.45, 0, CL + 0.02, 0.28, 2.52); cb.add(G3.box, stripe2, cx, 1.24, 0, CL + 0.02, 0.08, 2.52);
        for (let j = 0; j < 4; j++) { const wx = cx - CL / 2 + 1.1 + j * 2.1; [-1, 1].forEach(sd => cb.add(G3.box, win, wx, 2.4, sd * 1.26, 1.3, 0.8, 0.04)); }
        [-1, 1].forEach(sd => [cx - 2.15, cx + 2.15].forEach(dx => cb.add(G3.box, dark, dx, 1.9, sd * 1.265, 0.85, 1.9, 0.03)));
        cb.add(G3.box, roofM, cx, 3.5, 0, CL - 0.1, 0.14, 2.4); cb.add(G3.box, snowL, cx, 3.6, 0, CL - 0.9, 0.05, 1.9);
        [cx - CL / 2 + 1.6, cx + CL / 2 - 1.6].forEach(bx => cb.add(G3.box, dark, bx, 0.38, 0, 2.0, 0.5, 2.0));
        if (i === 1) { cb.add(G3.box, dark, cx, 4.1, 0, 0.07, 1.0, 0.07, 0, 0, 0.7); cb.add(G3.box, dark, cx, 4.55, 0, 1.6, 0.06, 0.06); }
        if (i < N - 1) cb.add(G3.box, dark, cx + CL / 2 + GAP / 2, 2.0, 0, GAP + 0.1, 2.2, 1.6);
      }
      [-1, 1].forEach(sd => { const ex = sd * (len / 2 + 0.01); cb.add(G3.box, win, ex, 2.55, 0, 0.04, 0.9, 2.0); cb.add(G3.box, dest, ex, 3.2, 0, 0.04, 0.3, 1.2); [-0.75, 0.75].forEach(o => cb.add(G3.box, light, ex, 1.25, o, 0.05, 0.22, 0.3)); });
      cb.flush(g); g.visible = false; group.add(g);
      tw.train = { g, len, x: 0, z: 0, dir: -1, v: 0, mode: E.martial ? 'off' : 'wait', t: 3 + Math.random() * 6, served: false, cruise: E.blizzard ? 8 : 13 };
      tw.trainStop = WX((PLAT[0] + PLAT[2]) / 2); }

    // 城牆裡的空地補上小東西（civic.js）
    if (R.fillTown) R.fillTown(api);

    // ---------- 地名 ----------
    const A = R.TOWN_AREAS;
    if (A && !A.some(a => a.n === '東鶴站')) A.push({ n: '東鶴站', x: 678, y: 330, r: 55 }, { n: '站前廣場', x: 690, y: 376, r: 45 }, { n: '站前商店街', x: 492, y: 363, r: 100 }, { n: '站東的住宅區', x: 868, y: 360, r: 95 }, { n: '平交道', x: 600, y: 305, r: 16 }, { n: '鐵橋', x: 330, y: 305, r: 30 },
      { n: '河西住宅區', x: 160, y: 690, r: 340 }, { n: '河西小學', x: 105, y: 590, r: 70 }, { n: '河西兒童公園', x: 218, y: 548, r: 40 }, { n: '鎮守的小祠', x: 218, y: 802, r: 40 }, { n: '河西超市', x: 180, y: 888, r: 55 },
      { n: '城南', x: 760, y: 905, r: 220 }, { n: '南渠外的田', x: 790, y: 968, r: 230 }, { n: '城東', x: 980, y: 640, r: 250 }, { n: '霜溪邊的溫室', x: 670, y: 186, r: 45 }, { n: '北郊的倉庫', x: 700, y: 276, r: 40 });
  };

  // ---------- 每一格：電車、平交道 ----------
  let bellT = 0, warnT = 0;
  R.suburbStep = (dt, tw, P) => {
    const T0 = tw.train; if (!T0) return;
    if (T0.mode === 'wait') { T0.t -= dt; if (T0.t <= 0) { T0.dir = -T0.dir; T0.x = T0.dir > 0 ? -HALF - T0.len : HALF + T0.len; T0.z = WZ(T0.dir > 0 ? RAIL.t[1] : RAIL.t[0]); T0.v = T0.cruise; T0.served = false; T0.mode = 'run'; T0.g.visible = true; } }
    else if (T0.mode === 'stop') { T0.t -= dt; if (T0.t <= 0) T0.mode = 'run'; }
    else if (T0.mode === 'run') {
      const dist = (tw.trainStop - T0.x) * T0.dir;
      if (!T0.served && dist > 0) { T0.v = Math.min(T0.cruise, Math.sqrt(2 * 2.6 * dist) + 0.4); if (dist < 0.08) { T0.x = tw.trainStop; T0.v = 0; T0.mode = 'stop'; T0.t = 6; T0.served = true; } }
      else { T0.served = true; T0.v = Math.min(T0.cruise, T0.v + 2.4 * dt); }
      T0.x += T0.v * T0.dir * dt;
      if (Math.abs(T0.x) > HALF + T0.len + 2) { T0.mode = 'wait'; T0.t = 14 + Math.random() * 14; T0.g.visible = false; }
    }
    if (T0.g.visible) { T0.g.position.set(T0.x, 0, T0.z); }
    // 平交道：電車快到了（或正在經過）就放下柵欄、紅燈一閃一閃、噹噹響
    let ringing = false;
    (tw.crossings || []).forEach(c => {
      let on = false;
      if (T0.mode === 'run' || T0.mode === 'stop') { const a = T0.x - T0.len / 2, b = T0.x + T0.len / 2, d = c.x < a ? a - c.x : c.x > b ? c.x - b : 0, ahead = (c.x - T0.x) * T0.dir > 0; on = d < 1.5 || (T0.mode === 'run' && ahead && d < 40); }
      c.k = Math.max(0, Math.min(1, c.k + (on ? dt : -dt) / 1.4));
      c.arms.forEach(({ piv, sd }) => { piv.rotation.z = -sd * Math.PI / 2 * (1 - c.k); });
      const blink = on && Math.floor(tw.t * 2.4) % 2;
      c.lamps.forEach((lm, i) => { lm.material.emissiveIntensity = on ? ((i % 2 === 0) === !!blink ? 1.4 : 0.05) : 0; });
      c.boxes.forEach(b => { b.on = c.k > 0.6; });
      if (on && Math.abs(P.x - c.x) + Math.abs(P.z - WZ(RAIL.y)) < 45) ringing = true;
    });
    bellT -= dt; if (ringing && bellT <= 0) { bellT = 0.55; R.sfx && R.sfx('crossing'); }
    // 站在軌道上：電車把你推開
    if (T0.g.visible && Math.abs(P.z - T0.z) < 1.7 && P.x > T0.x - T0.len / 2 - 0.4 && P.x < T0.x + T0.len / 2 + 0.4) {
      const sd = P.z >= T0.z ? 1 : -1; P.z = T0.z + sd * 1.8; warnT -= dt;
      if (warnT <= 0) { warnT = 3; R.toast('電車經過！差點被撞到。'); R.shake && R.shake(0.3); }
    }
  };
})(window.R);
