// 站北新市街（作者 2026-10-04：城市還是太小了 → 選「站北新市街」：鐵路北邊的田蓋一整區新的街道，原本的東鶴不動）
// 鐵路北邊、霜溪南邊原本是田。這裡在 city.js 排完整座城之後，另外蓋一區：
// - 北口通（沿著鐵路，從河西一路過河、經過站西通和東通的平交道，到海邊）、北口商店街（拱廊，兩邊是小店）、北口橋通過霜溪接到往霜溪石窟的路。
//   霜溪北邊是北山的遠山和往遺跡的路，蓋不下街，所以不蓋。
// - 地塊照 city.js 的做法塞滿（商業區的尺寸），但用自己的亂數——不然 city.js 共用的亂數會被打亂，原本整座城的房子都會變。
// - 田讓出來；北郊農舍搬到西邊剩下的那一小塊田旁邊（河岸邊）。
// - 橋、路人走的路網、路口的斑馬線都照 city.js 的資料結構補上。
// 這個檔案要緊接在 roadfix.js 後面（gtamap.js、town.js 進城蓋路之前）。
(function (R) {
  const C = R.CITY; if (!C || !C._occ || !C.roads || !C.RW) return;
  const GS = 2, GN = 500, occ = C._occ;
  let seed = 41433; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }, pick = a => a[Math.floor(rnd() * a.length)];
  const cellR = (x0, y0, x1, y1, fn) => { for (let gy = Math.max(0, Math.floor(y0 / GS)); gy <= Math.min(GN - 1, Math.floor((y1 - 0.01) / GS)); gy++) for (let gx = Math.max(0, Math.floor(x0 / GS)); gx <= Math.min(GN - 1, Math.floor((x1 - 0.01) / GS)); gx++) fn(gy * GN + gx); };
  const setR = (x0, y0, x1, y1, v) => cellR(x0, y0, x1, y1, i => { if (!occ[i]) occ[i] = v; });
  const clearR = (x0, y0, x1, y1, only) => cellR(x0, y0, x1, y1, i => { if (only == null || occ[i] === only) occ[i] = 0; });
  const stamp = (pts, half, v) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.ceil(L / 1.5); for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; setR(x - half, y - half, x + half, y + half, v); } } };
  // 霜溪北邊是北山（town.js 的遠山一直蓋到示意圖 y≈50）和往遺跡的路，蓋不下街；所以只蓋霜溪和鐵路之間：東段（站北）和西段（原本的西邊的田）
  const AREA = [480, 126, 946, 206], AREAW = [16, 150, 478, 206];
  const inA = r => [AREA, AREAW].some(A => r[0] < A[2] && r[2] > A[0] && r[1] < A[3] && r[3] > A[1]);

  // ---------- 田、農舍讓出來 ----------
  const fields = C.FIELDS.filter(inA);
  fields.forEach(r => clearR(r[0], r[1], r[2], r[3], 3));
  C.FIELDS = C.FIELDS.filter(r => !inA(r));
  // 西段的田留一小塊在最西邊（河岸旁）
  C.FIELDS.push([244, 166, 266, 205]); setR(244, 166, 266, 205, 3);
  if (C.FAC.farmhouse && C.FS.farmhouse) { const [fx, fy] = C.FAC.farmhouse, [w, d] = C.FS.farmhouse; if (fy < AREA[3] && fy > AREA[1]) { clearR(fx - w / 2 - 14, fy - d / 2 - 14, fx + w / 2 + 14, fy + d / 2 + 14, 3); C.FAC.farmhouse = [278, 182]; setR(278 - w / 2, 182 - d / 2, 278 + w / 2, 182 + d / 2 + 12, 3); } }
  // 遺跡的入口（往北山礦坑、霜溪石窟的路盡頭）前面留空地
  setR(538, 40, 582, 84, 3); setR(776, 52, 824, 100, 3);
  // 跟新的北口通疊在一起的舊巷子拿掉
  C.roads = C.roads.filter(r => !(r.kind === 'lane' && r.pts.length === 2 && Math.abs(r.pts[0][0] - 470) < 2 && (Math.abs(r.pts[0][1] - 186) < 2 || Math.abs(r.pts[0][1] - 200) < 2)));

  // ---------- 路 ----------
  const NEW = [];
  const road = (kind, pts, name) => { const r = { kind, pts, w: C.RW[kind], name: name || '', north: 1 }; C.roads.push(r); NEW.push(r); stamp(pts, r.w / 2 + 2, 1); return r; };
  road('lane', [[20, 198], [944, 198]], '北口通');   // 西邊過河（自動蓋橋），東邊到海邊
  road('arcade', [[566, 160], [860, 160]], '北口商店街');
  road('lane', [[620, 198], [620, 140], [622, 96]], '北口橋通');
  road('lane', [[760, 198], [760, 150]]);
  // 原本的路（例如東通往北的最後一段）在格子上標得比路面窄；新市街範圍裡補滿，房子才不會壓到路
  C.roads.forEach(rd => { if (rd.north) return; const h = rd.w / 2 + 2; for (let i = 0; i < rd.pts.length - 1; i++) { const [ax, ay] = rd.pts[i], [bx, by] = rd.pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 1.5); for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; if (inA([x - h, y - h, x + h, y + h])) setR(x - h, y - h, x + h, y + h, 1); } } });
  // 橋：路和霜溪交叉的地方
  NEW.forEach(rd => { if (rd.kind === 'arcade') return; for (let i = 0; i < rd.pts.length - 1; i++) C.water.forEach(wt => { for (let j = 0; j < wt.pts.length - 1; j++) { const h = C.segX(rd.pts[i], rd.pts[i + 1], wt.pts[j], wt.pts[j + 1]); if (h && !C.bridges.some(b => Math.hypot(b.sx - h[0], b.sy - h[1]) < 20)) C.bridges.push({ sx: h[0], sy: h[1], ang: h[2], len: wt.w + 10, wid: rd.w, ok: true, kind: wt.kind, road: rd, name: '北口橋' }); } }); });

  // ---------- 地塊 ----------
  const WALLS = ['#E8E2D4', '#D8D2C4', '#C8CCD0', '#E0D6C0', '#B8BCC2', '#D4C8B4', '#F0ECE4', '#C4B8A4', '#D8C8B8', '#B8C4C8'];
  const SHOPS = [['北口書房', '#2E4A3A', 'book'], ['雪見甘味', '#8A2A24'], ['古道具・北斗', '#4A3A2E'], ['北口寫真館', '#4A3A2E', 'photo'], ['玩具屋・兔', '#C83A3A'], ['和服・椿', '#5A2A4A'], ['洋菓子・鈴蘭', '#C87A8A'], ['北口理髮', '#2E3A5A', 'barber'],
    ['花屋・雪割', '#3A5A4A'], ['眼鏡・時計 北斗', '#3A3A44', 'watch'], ['乾貨・海鶴', '#2E4A6A'], ['文具・燕', '#4A5A2E'], ['茶葉・霜溪', '#3E5A2E'], ['毛線・雪兔', '#8A6A8A'], ['魔導零件・北口', '#3A4A6A'], ['唱片・夜曲', '#3A2A4A', 'record']];
  let shopI = 0;
  const SIZES = [[26, 30], [22, 26], [18, 24], [14, 20], [12, 14]], GAP = 0.3, SIZES_RES = [[22, 22], [20, 24], [24, 18], [18, 20], [16, 16], [12, 14]];
  const kindFor = (rd, w, d, res) => {
    const r0 = rnd();
    if (res) { if (r0 < 0.08) return { type: 'garden' }; if (r0 < 0.12) return { type: 'vacant' }; if (r0 < 0.26 && w > 24) return { type: 'apt', floors: rnd() < 0.6 ? 2 : 3 }; if (r0 < 0.3 && rd) { const s = SHOPS[shopI++ % SHOPS.length]; return { type: 'shop', name: s[0], sc: s[1], kind: s[2], low: true, awn: pick(['#C83A3A', '#3A6A8A']) }; } return { type: 'house', floors: rnd() < 0.8 ? 2 : 1 }; }
    if (rd && rd.kind === 'arcade') { const s = SHOPS[shopI++ % SHOPS.length]; return { type: 'shop', name: s[0], sc: s[1], kind: s[2], low: false, awn: pick(['#C83A3A', '#3A6A8A', '#E8A03A', '#3E7A48', '#8A3A6A']) }; }
    if (r0 < 0.38) return { type: 'midrise', floors: 3 + Math.floor(rnd() * 3) };
    if (r0 < 0.6) { const s = SHOPS[shopI++ % SHOPS.length]; return { type: 'shop', name: s[0], sc: s[1], kind: s[2], awn: pick(['#C83A3A', '#3A6A8A', '#E8A03A', '#3E7A48']) }; }
    if (r0 < 0.66) return { type: 'conbini' };
    if (r0 < 0.76 && w > 24) return { type: 'apt', floors: rnd() < 0.5 ? 2 : 3 };
    return { type: 'house', floors: rnd() < 0.85 ? 2 : 1 };
  };
  const cellAt = (x, y) => { const gx = Math.floor(x / GS), gy = Math.floor(y / GS); return gx >= 0 && gy >= 0 && gx < GN && gy < GN ? occ[gy * GN + gx] : 9; };
  const roadSide = r => { const cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2, best = [1e9, 0]; [[0, 1, r[3], 0], [0, -1, r[1], 1], [-1, 0, r[0], 2], [1, 0, r[2], 3]].forEach(([dx, dy, edge, f]) => { for (let s = 1; s < 30; s += 1.5) { const v = dx ? [-0.3, 0, 0.3].map(k => cellAt(edge + dx * s, cy + (r[3] - r[1]) * k)) : [-0.3, 0, 0.3].map(k => cellAt(cx + (r[2] - r[0]) * k, edge + dy * s)); if (v.includes(1)) { if (s < best[0]) { best[0] = s; best[1] = f; } break; } if (v.some(c => c >= 3)) break; } }); return best; };
  const nearRoad = (x, y) => { let b = null, bd = 1e9; C.roads.forEach(rd => { const dd = C.lineDist(x, y, rd.pts) - rd.w / 2; if (dd < bd) { bd = dd; b = rd; } }); return b; };
  let made = 0;
  const fill = (A, sizes, gap, res) => {
    for (let gy = Math.floor(A[1] / GS); gy < Math.ceil(A[3] / GS); gy++) for (let gx = Math.floor(A[0] / GS); gx < Math.ceil(A[2] / GS); gx++) {
      if (occ[gy * GN + gx]) continue;
      const x = gx * GS, y = gy * GS; let placed = null;
      for (let k = 0; k < sizes.length && !placed; k++) { const [w0, d0] = sizes[k], jw = w0 * (0.92 + rnd() * 0.16), jd = d0 * (0.92 + rnd() * 0.16); for (const [w, d] of rnd() < 0.5 ? [[jw, jd], [jd, jw]] : [[jd, jw], [jw, jd]]) { const r = [x + gap, y + gap, x + gap + w, y + gap + d]; if (r[2] < A[2] + 4 && r[3] < A[3] && C._freeR(r[0] - gap, r[1] - gap, r[2] + gap, r[3] + gap)) { placed = r; break; } } }
      if (!placed) continue;
      const [dist, f] = roadSide(placed), mid = f === 0 ? [(placed[0] + placed[2]) / 2, placed[3] + dist] : f === 1 ? [(placed[0] + placed[2]) / 2, placed[1] - dist] : f === 2 ? [placed[0] - dist, (placed[1] + placed[3]) / 2] : [placed[2] + dist, (placed[1] + placed[3]) / 2];
      const rd = dist < 1e8 ? nearRoad(mid[0], mid[1]) : null, back = !rd || dist > 14;
      if (res && back && rnd() < 0.6) continue;   // 住宅街：離路太遠的不蓋（留田、空地）
      const k = kindFor(back ? null : rd, placed[2] - placed[0], placed[3] - placed[1], res);
      if (back && (k.type === 'shop' || k.type === 'conbini')) { k.type = res ? 'house' : 'midrise'; k.floors = res ? 2 : 3; }
      C.lots.push(Object.assign({ r: placed, f: back ? (rnd() < 0.5 ? 0 : 1) : f, zone: res ? 'res' : 'com', col: pick(WALLS), yard: rnd(), road: rd ? rd.kind : null, back, north: 1 }, k));
      setR(placed[0] - 1, placed[1] - 1, placed[2] + 1, placed[3] + 1, 4); made++;
    }
  };
  fill(AREA, SIZES, GAP, false);
  fill(AREAW, SIZES, GAP, false);

  // ---------- 路人的路網、路口 ----------
  if (C.nodes && C.adj) {
    const link = (a, b) => { if (a === b || C.adj[a].includes(b)) return; C.adj[a].push(b); C.adj[b].push(a); };
    const base = C.nodes.length;
    NEW.forEach(rd => { const ids = []; for (let i = 0; i < rd.pts.length - 1; i++) { const [ax, ay] = rd.pts[i], [bx, by] = rd.pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / 18)); for (let k = i ? 1 : 0; k <= n; k++) { C.nodes.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); C.adj.push([]); ids.push(C.nodes.length - 1); } } for (let i = 0; i < ids.length - 1; i++) link(ids[i], ids[i + 1]); });
    for (let i = base; i < C.nodes.length; i++) { const [x, y] = C.nodes[i]; for (let j = 0; j < C.nodes.length; j++) { if (j === i) continue; if (Math.hypot(C.nodes[j][0] - x, C.nodes[j][1] - y) < 14) link(i, j); } }
  }
  if (C.junctions) NEW.forEach(a => { if (a.kind === 'arcade') return; C.roads.forEach(b => { if (b === a || b.kind === 'dirt' || b.kind === 'arcade') return; for (let p = 0; p < a.pts.length - 1; p++) for (let q = 0; q < b.pts.length - 1; q++) { const h = C.segX(a.pts[p], a.pts[p + 1], b.pts[q], b.pts[q + 1]); if (!h || C.junctions.some(J => Math.hypot(J.x - h[0], J.y - h[1]) < 14)) continue; C.junctions.push({ x: h[0], y: h[1], a, b, angA: h[2], angB: Math.atan2(b.pts[q + 1][1] - b.pts[q][1], b.pts[q + 1][0] - b.pts[q][0]), signal: false }); } }); });
  if (C.DISTRICTS) C.DISTRICTS.unshift({ n: '北口商店街', x: 700, y: 160, r: 90 }, { n: '站北新市街', x: 600, y: 180, r: 300 });
  R.CITY_NORTH = { lots: made, roads: NEW.length };
})(window.R);
