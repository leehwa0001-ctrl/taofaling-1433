// 精緻城市（二）：地面、道路、人行道、水、高度、碰撞，進城、每一格、狀態列、地圖、選單、搭車（作者 2026-10-08）
// 城市的檔案用 R.CK.define({ id, name, walk: [x0, z0, x1, z1], land, spawn, build(B) { … } })；B 是這裡的「蓋城」工具：
//   B.road(x0, z0, x1, z1, { sw, name, line })   車道（軸對齊的長方形）；sw＝兩邊人行道的寬（自動扣掉跟別的路重疊的部分、路口畫斑馬線）
//   B.plaza(x0, z0, x1, z1, mat)                  高 0.12 的廣場（跟人行道一樣高）
//   B.zone(poly, mat, y)                           平的地面（草地、砂石、沙灘、泥土）
//   B.water(poly, { level, bank })                水（地面挖洞、水面、護岸、碰撞；橋下不擋）
//   B.bridge(x0, z0, x1, z1, { deck, rise, axis }) 走得上去的橋（拱橋：中間高）
//   B.terrace(x0, z0, x1, z1, h, { wall, open })   台地（擋土牆、碰撞；open 是留給階梯的缺口）；B.stairs(…) 階梯
//   B.solid(x0, z0, x1, z1)                        擋人的方塊（在 B.frame 裡會跟著轉：旋轉的方塊另外算）
//   B.inter(x, z, r, label, act, icon)、B.walk(pts, n)、B.route(pts, n)、B.lamp(x, z)、B.area(name, rect)、B.label(text, x, z)
// 建築、屋頂、樹、街上的東西、人、車在 citykit3.js（也掛在 B 上）。
// 防穿模：R.cityCheck() 會走一遍整張地圖（0.5 公尺一格），列出走不到的互動、蓋在路上的房子、穿過東西的路人和車。
(function (R) {
  const W = R.W, T = () => THREE, CK = R.CK, $ = id => document.getElementById(id), esc = s => R.esc(s), S = () => R.S;
  const CITIES = CK.cities = {};
  CK.define = def => { CITIES[def.id] = def; };
  R.inCity3D = () => !!(W.town && W.town.ck && !W.inside);   // 2026-10-10：在舊的室內（interior.js，東鶴的店）的時候交給原本的那一套
  const inR = (x, z, r, m) => x > r[0] - (m || 0) && x < r[2] + (m || 0) && z > r[1] - (m || 0) && z < r[3] + (m || 0);
  const pip = (x, z, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const rectPoly = r => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
  const overlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  // a 扣掉 b（都是 [x0, z0, x1, z1]）→ 最多四塊
  const sub = (a, b) => {
    if (!overlap(a, b)) return [a];
    const out = [];
    if (b[1] > a[1]) out.push([a[0], a[1], a[2], b[1]]);
    if (b[3] < a[3]) out.push([a[0], b[3], a[2], a[3]]);
    const z0 = Math.max(a[1], b[1]), z1 = Math.min(a[3], b[3]);
    if (b[0] > a[0]) out.push([a[0], z0, b[0], z1]);
    if (b[2] < a[2]) out.push([b[2], z0, a[2], z1]);
    return out.filter(r => r[2] - r[0] > 0.05 && r[3] - r[1] > 0.05);
  };
  const subAll = (list, cuts) => { let L = list; cuts.forEach(c => { L = [].concat(...L.map(a => sub(a, c))); }); return L; };
  CK.util = { inR, pip, rectPoly, overlap, sub, subAll };

  // ---------- 高度（0.5 公尺一格） ----------
  const HG = CK.HG = { cs: 0.5, a: null };
  const hgInit = b => { HG.x0 = b[0] - 30; HG.z0 = b[1] - 30; HG.nx = Math.ceil((b[2] - b[0] + 60) / HG.cs); HG.nz = Math.ceil((b[3] - b[1] + 60) / HG.cs); HG.a = new Float32Array(HG.nx * HG.nz); };
  const hgEach = (r, f) => {
    if (!HG.a) return; const cs = HG.cs, i0 = Math.max(0, Math.floor((r[0] - HG.x0) / cs)), i1 = Math.min(HG.nx - 1, Math.ceil((r[2] - HG.x0) / cs)), j0 = Math.max(0, Math.floor((r[1] - HG.z0) / cs)), j1 = Math.min(HG.nz - 1, Math.ceil((r[3] - HG.z0) / cs));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = HG.x0 + (i + 0.5) * cs, z = HG.z0 + (j + 0.5) * cs; if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) { const k = j * HG.nx + i, v = f(x, z, HG.a[k]); if (v != null) HG.a[k] = v; } }
  };
  CK.heightAt = (x, z) => { if (!HG.a) return 0; const i = Math.floor((x - HG.x0) / HG.cs), j = Math.floor((z - HG.z0) / HG.cs); if (i < 0 || j < 0 || i >= HG.nx || j >= HG.nz) return 0; return HG.a[j * HG.nx + i]; };

  // ---------- 材質表 ----------
  const MDEF = {
    land: { tex: 'yard', col: '#C4C0B8', snow: 0.7, ground: 1 }, asph: { tex: 'asphalt', snow: 0.12, nk: 1.2, ground: 1 }, lineW: { col: '#E8E6DE', rough: 0.55, snow: 0.08, ground: 1 }, lineY: { col: '#E0B030', rough: 0.55, snow: 0.08, ground: 1 }, kerb: { tex: 'concrete', col: '#DCDAD4', snow: 0.4, ground: 1 },
    curb: { tex: 'concrete', col: '#DCDAD4', snow: 0.4 }, pav: { tex: 'pavers', snow: 0.3, ground: 1 }, gran: { tex: 'granite', snow: 0.3, ground: 1 }, grass: { tex: 'grass', snow: 1.15, col: '#C8D0B8', ground: 1 }, gravel: { tex: 'gravel', snow: 1, ground: 1 }, sand: { tex: 'sand', snow: 0.9, ground: 1 }, soil: { tex: 'soil', snow: 1, ground: 1 },
    ishi: { tex: 'ishigaki', col: '#E6E2DA', snow: 0.6 }, ashlar: { tex: 'ashlar', col: '#E4E0D8' }, conc: { tex: 'concrete' }, concD: { tex: 'concrete', col: '#A8A6A2' }, brick: { tex: 'brick' }, plaster: { tex: 'plaster', col: '#F4F0E8' },
    wood: { tex: 'wood', col: '#C8A888' }, woodD: { tex: 'wood', col: '#6E5848' }, woodB: { tex: 'wood', col: '#4A3A30' }, planks: { tex: 'planks' }, lattice: { tex: 'lattice' },
    kawara: { tex: 'kawara', col: '#9AA0A8', snow: 1.1, nk: 1.6 }, copper: { tex: 'copper', snow: 1.25 }, roofG: { tex: 'yard', col: '#8C8C8E', snow: 1.2 }, corr: { tex: 'corrugated', col: '#C8CCD0', snow: 1.1 },
    metal: { tex: 'metal', col: '#B8BCC2', metal: 0.85, rough: 0.38 }, steel: { tex: 'metal', col: '#5A5E66', metal: 0.7, rough: 0.5 }, steelD: { tex: 'metal', col: '#2E3036', metal: 0.6, rough: 0.55 }, black: { col: '#1A1A1E', rough: 0.6 },
    glass: { col: '#3A4A58', rough: 0.04, metal: 0.2, env: 1.6, snow: 0 }, glassL: { col: '#A8C0D0', rough: 0.05, metal: 0.1, env: 1.3, op: 0.45, snow: 0 },
    verm: { tex: 'paint', col: '#C83A22' }, white: { tex: 'paint', col: '#F2F0EA' }, cream: { tex: 'paint', col: '#E8DEC8' }, gold: { col: '#D8A840', metal: 1, rough: 0.28, env: 1.4 }, bronze: { col: '#7A6040', metal: 0.9, rough: 0.45 }, verdigris: { tex: 'copper', col: '#B8D8C8' },
    rail: { col: '#5A5452', metal: 0.8, rough: 0.4 }, sleeper: { tex: 'wood', col: '#5A4A40' }, ballast: { tex: 'gravel', col: '#9A968E' },
    lamp: { col: '#FFF4DC', em: '#FFE2B0', ei: 0, lamp: true, snow: 0 }, shopLit: { col: '#FFF6E8', em: '#FFE6BC', ei: 1.1, snow: 0 }, winLit: { col: '#FFF0D0', em: '#FFE0A8', ei: 1.4, snow: 0 },
    leafPine: { tex: 'grass', col: '#6E8C66', rough: 0.95, snow: 1.3 }, leafCedar: { tex: 'grass', col: '#5E7A58', rough: 0.95, snow: 1.3 }, leafGreen: { tex: 'grass', col: '#8AA076', rough: 0.95, snow: 1.3 }, hedge: { tex: 'grass', col: '#7E9870', snow: 1.2 }, bark: { tex: 'wood', col: '#7A6A5E' }, barkD: { tex: 'wood', col: '#54463E' },
    rubber: { col: '#202022', rough: 0.9 }, tatami: { tex: 'tatami', snow: 0, ground: 1 }, wfloor: { tex: 'planks', col: '#D8B48A', rough: 0.45, snow: 0, ground: 1 }, marble: { tex: 'granite', col: '#F4F0EA', rough: 0.2, snow: 0, ground: 1, env: 1.2 }, carpet: { tex: 'paint', col: '#8A2A2A', rough: 0.95, snow: 0, ground: 1 }, tile: { tex: 'pavers', col: '#E8E4DC', rough: 0.35, snow: 0, ground: 1 }, red: { tex: 'paint', col: '#B82E2A' }, blue: { tex: 'paint', col: '#2E5A9A' }, green: { tex: 'paint', col: '#3E7A52' }, yellow: { tex: 'paint', col: '#E8B830' }
  };
  CK.M = (name, o) => CK.mat(o ? name + '|' + JSON.stringify(o) : name, Object.assign({}, MDEF[name] || {}, o || {}));
  CK.MDEF = MDEF;
  // 水：法線貼圖慢慢流動、天空的反光
  let waterMat = null;
  CK.waterMat = () => {
    if (waterMat) return waterMat;
    const TH = T(), t = CK.tex('water');
    waterMat = new TH.MeshStandardMaterial({ color: new TH.Color('#1C343A').convertSRGBToLinear(), roughness: 0.14, metalness: 0.0, normalMap: t.normalMap, normalScale: new TH.Vector2(0.45, 0.45), transparent: false, envMapIntensity: 0.7 });
    waterMat.userData.tile = [9, 9]; waterMat.userData.shared = true; waterMat.userData.noShadow = true;
    return waterMat;
  };

  // ---------- 蓋城的工具 ----------
  const makeBuilder = (city, group) => {
    const TH = T(), g = CK.geo(), Bt = CK.batch(), tw = W.town;
    const D = { roads: [], slabs: [], zones: [], water: [], bridges: [], terr: [], foot: [], labels: [], areas: [], walks: [], routes: [], lamps: [], rails: [], cuts: [], solids: [], seaY: city.seaY };
    tw.D = D;
    const B = { D, g, Bt, group, city, TH };
    B.M = CK.M;
    B.part = (geo, mat, x, y, z, sx, sy, sz, rx, ry, rz, o) => Bt.add(geo, mat, x, y, z, sx, sy, sz, rx, ry, rz, o);
    B.box = (mat, x0, y0, z0, x1, y1, z1, o) => Bt.add(g.box, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 0, 0, 0, o);
    B.frame = (cx, cz, a, fn) => { const old = Bt.getFrame(); Bt.setFrame(cx, cz, a); try { fn(); } finally { if (old) Bt.setFrame(old.x, old.z, old.a); else Bt.setFrame(null); } };
    B.toWorld = (x, z) => Bt.toWorld(x, z);
    B.yaw = () => { const f = Bt.getFrame(); return f ? f.a : 0; };
    // 擋人的方塊：沒有轉的框 → 一般碰撞；轉過的框 → 旋轉方塊（CK.obb）
    B.solid = (x0, z0, x1, z1, tag) => {
      const f = Bt.getFrame(), a0 = Math.min(x0, x1), a1 = Math.max(x0, x1), b0 = Math.min(z0, z1), b1 = Math.max(z0, z1);
      if (!f || Math.abs(Math.sin(f.a * 2)) < 1e-6) {
        const p = [B.toWorld(a0, b0), B.toWorld(a1, b1)], r = [Math.min(p[0][0], p[1][0]), Math.min(p[0][1], p[1][1]), Math.max(p[0][0], p[1][0]), Math.max(p[0][1], p[1][1])];
        D.solids.push(r); return R.addBox(r[0], r[2], r[1], r[3], tag || 'house');
      }
      const [cx, cz] = B.toWorld((a0 + a1) / 2, (b0 + b1) / 2); return CK.addObb(cx, cz, (a1 - a0) / 2, (b1 - b0) / 2, f.a, tag);
    };
    // 互動（在框裡也照世界座標放）
    B.inter = (x, z, r, label, act, icon) => { const [wx, wz] = B.toWorld(x, z); const it = { x: wx, z: wz, r, label, act, icon }; tw.inter.push(it); return it; };
    B.area = (name, r) => D.areas.push([name, r]);
    B.label = (t, x, z, big) => D.labels.push([t, x, z, big]);
    B.foot = (r, kind, h) => D.foot.push({ r, kind, h, poly: r.length === 4 && typeof r[0] === 'number' ? null : r });

    // ---- 路 ----
    B.road = (x0, z0, x1, z1, o) => { o = o || {}; const r = [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]; const rd = { r, sw: o.sw == null ? 3.5 : o.sw, name: o.name || '', line: o.line || 'w', kind: o.kind || 'road', zebra: o.zebra !== false }; D.roads.push(rd); bandsOf(rd, D.roads.map(q => q.r)).forEach(b => hgEach(b, (x, z, v) => Math.max(v, 0.12))); hgEach(r, () => 0); return r; };
    B.plaza = (x0, z0, x1, z1, mat, o) => { const r = [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]; const h = (o && o.h) || 0.12; D.slabs.push({ r, mat: mat || 'gran', curb: !(o && o.noCurb), h }); hgEach(r, (x, z, v) => Math.max(v, h)); return r; };
    B.zone = (poly, mat, y) => { if (poly.length === 4 && typeof poly[0] === 'number') poly = rectPoly(poly); D.zones.push({ poly, mat: mat || 'grass', y: y == null ? 0.02 : y }); };
    B.water = (poly, o) => { if (poly.length === 4 && typeof poly[0] === 'number') poly = rectPoly(poly); o = o || {}; D.water.push({ poly, level: o.level == null ? -1.2 : o.level, bank: o.bank || 'ishi', fence: !!o.fence, name: o.name || '' }); };
    B.bridge = (x0, z0, x1, z1, o) => { o = o || {}; const r = [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]; const b = Object.assign({ r, deck: 0.12, rise: 0, axis: (r[2] - r[0]) > (r[3] - r[1]) ? 'x' : 'z', rail: true, mat: 'gran', railMat: 'ashlar' }, o, { r }); D.bridges.push(b); bridgeH(b); return r; };
    // 台地：h 高；open＝[[x0, z0, x1, z1], …] 擋土牆留的缺口（接階梯）
    B.terrace = (x0, z0, x1, z1, h, o) => { o = o || {}; const r = [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]; D.terr.push({ r, h, wall: o.wall || 'ishi', top: o.top || 'gravel', open: o.open || [], batter: o.batter == null ? 0.12 : o.batter, rail: o.rail }); hgEach(r, () => h); return r; };
    // 階梯：dir＝往哪邊爬上去（'n'、's'、'e'、'w'），h0→h1
    B.stairs = (x0, z0, x1, z1, dir, h0, h1, o) => { o = o || {}; const r = [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]; const t = { r, stairs: dir, h0, h1, mat: o.mat || 'gran', side: o.side || 'ishi', ramp: !!o.ramp }; D.terr.push(t); stairsH(t); return r; };
    B.walk = (pts, n, o) => D.walks.push({ pts, n: n || 3, o: o || {} });
    B.route = (pts, n, o) => D.routes.push({ pts, n: n || 2, o: o || {} });
    B.rail = (pts, o) => D.rails.push(Object.assign({ pts, y: 0 }, o || {}));
    B.lampAt = (x, z) => { const [wx, wz] = B.toWorld(x, z); D.lamps.push([wx, wz]); tw.lamps.push([wx, wz]); };
    return B;
  };

  // 一條路的人行道（扣掉 cuts 裡的車道、橋）
  const bandsOf = (rd, cuts) => { if (!rd.sw) return []; const r = rd.r, s = rd.sw; return subAll([[r[0] - s, r[1] - s, r[2] + s, r[1]], [r[0] - s, r[3], r[2] + s, r[3] + s], [r[0] - s, r[1], r[0], r[3]], [r[2], r[1], r[2] + s, r[3]]], cuts); };
  const bridgeY = (b, x, z) => { const r = b.r, ax = b.axis === 'x', L = ax ? r[2] - r[0] : r[3] - r[1], t = ((ax ? x : z) - (ax ? r[0] : r[1])) / L; return b.deck + b.rise * Math.sin(Math.PI * clamp01(t)); };
  const bridgeH = b => hgEach(b.r, (x, z) => bridgeY(b, x, z));
  const stairsAt = (t, x, z) => { const r = t.r, along = t.stairs === 'n' || t.stairs === 's' ? 'z' : 'x', L = along === 'z' ? r[3] - r[1] : r[2] - r[0], up = t.stairs === 's' || t.stairs === 'e' ? 1 : -1, n = t.ramp ? 1 : Math.max(2, Math.round((t.h1 - t.h0) / 0.16)), v = along === 'z' ? z : x; const k = clamp01(up > 0 ? (v - (along === 'z' ? r[1] : r[0])) / L : ((along === 'z' ? r[3] : r[2]) - v) / L); return t.h0 + (t.h1 - t.h0) * (t.ramp ? k : Math.min(1, Math.floor(k * n + 0.5) / n)); };
  const stairsH = t => hgEach(t.r, (x, z) => stairsAt(t, x, z));
  // ---------- 把地面、路、水、台地蓋出來（城市的 build 跑完以後） ----------
  const finishGround = B => {
    const TH = T(), D = B.D, g = B.g, Bt = B.Bt, city = B.city, M = CK.M;
    const walk = city.walk, land = city.land || rectPoly([walk[0] - 160, walk[1] - 160, walk[2] + 160, walk[3] + 160]);
    // 高度：人行道、廣場、橋、台地
    const roadRects = D.roads.map(r => r.r);
    // 人行道：每條路外面一圈 sw 寬，扣掉所有車道、扣掉水
    D.walkways = [];
    D.roads.forEach(rd => bandsOf(rd, roadRects.concat(D.bridges.filter(b => b.road).map(b => b.r))).forEach(b => D.walkways.push(b)));
    hgInit(walk);   // 高度整個重算一次（照最後的路）
    const slabs = D.walkways.map(r => ({ r, mat: 'pav', curb: true, h: 0.12 })).concat(D.slabs);
    // 地面（扣掉水）
    const shape = new TH.Shape(land.map(p => new TH.Vector2(p[0], -p[1])));
    D.water.forEach(w => shape.holes.push(new TH.Path(w.poly.map(p => new TH.Vector2(p[0], -p[1])))));
    if (!city.noLand) { const lg = new TH.ShapeGeometry(shape); Bt.add(lg, M('land'), 0, 0, 0, 1, 1, 1, -Math.PI / 2, 0, 0); }
    // 平的地面
    D.zones.forEach(z => { const sh = new TH.Shape(z.poly.map(p => new TH.Vector2(p[0], -p[1]))); Bt.add(new TH.ShapeGeometry(sh), M(z.mat, { ground: 1 }), 0, z.y, 0, 1, 1, 1, -Math.PI / 2, 0, 0); });
    // 車道：柏油、標線（路口裡不畫）、斑馬線
    const inter = (a, b) => overlap(a, b) ? [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])] : null;
    D.roads.forEach(rd => {
      const r = rd.r, ew = r[2] - r[0] >= r[3] - r[1], w = ew ? r[3] - r[1] : r[2] - r[0];
      Bt.add(g.plane, M('asph'), (r[0] + r[2]) / 2, 0.006, (r[1] + r[3]) / 2, r[2] - r[0], r[3] - r[1], 1, -Math.PI / 2, 0, 0);
      const xs = D.roads.filter(o => o !== rd).map(o => inter(r, o.r)).filter(Boolean);
      const L0 = ew ? r[0] : r[1], L1 = ew ? r[2] : r[3], cut = xs.map(q => ew ? [q[0] - 4.5, q[2] + 4.5] : [q[1] - 4.5, q[3] + 4.5]);
      const free = (a, b) => !cut.some(c => a < c[1] && b > c[0]);
      const strip = (a, b, off, wd, mat) => { const c = (a + b) / 2, len = b - a; if (ew) Bt.add(g.plane, mat, c, 0.012, (r[1] + r[3]) / 2 + off, len, wd, 1, -Math.PI / 2, 0, 0); else Bt.add(g.plane, mat, (r[0] + r[2]) / 2 + off, 0.012, c, wd, len, 1, -Math.PI / 2, 0, 0); };
      if (w >= 6 && rd.line !== 'none') {
        const cm = rd.line === 'y' ? M('lineY') : M('lineW');
        for (let a = L0 + 1; a < L1 - 1; a += 6) { const b = Math.min(a + 3, L1 - 1); if (free(a, b)) strip(a, b, 0, 0.15, cm); }
        // 路邊的白線（路口斷開）
        [-1, 1].forEach(sd => { let a = L0; const ends = cut.map(c => [Math.max(L0, c[0]), Math.min(L1, c[1])]).sort((p, q) => p[0] - q[0]); ends.forEach(([c0, c1]) => { if (c0 > a + 0.5) strip(a, c0, sd * (w / 2 - 0.35), 0.12, M('lineW')); a = Math.max(a, c1); }); if (L1 > a + 0.5) strip(a, L1, sd * (w / 2 - 0.35), 0.12, M('lineW')); });
      }
      // 斑馬線：路口的每一邊
      if (rd.zebra) xs.forEach(q => {
        const sides = ew ? [[q[0] - 3.6, q[0] - 0.6], [q[2] + 0.6, q[2] + 3.6]] : [[q[1] - 3.6, q[1] - 0.6], [q[3] + 0.6, q[3] + 3.6]];
        sides.forEach(([a, b]) => { if (a < L0 + 0.5 || b > L1 - 0.5) return; for (let t = (ew ? r[1] : r[0]) + 0.6; t < (ew ? r[3] : r[2]) - 0.6; t += 1.1) { if (ew) Bt.add(g.plane, M('lineW'), (a + b) / 2, 0.013, t + 0.25, b - a, 0.5, 1, -Math.PI / 2, 0, 0); else Bt.add(g.plane, M('lineW'), t + 0.25, 0.013, (a + b) / 2, 0.5, b - a, 1, -Math.PI / 2, 0, 0); } });
      });
    });
    // 人行道、廣場：路緣石＋鋪面（高 0.12）
    slabs.forEach(s => {
      const r = s.r, h = s.h || 0.12; if (r[2] - r[0] < 0.1 || r[3] - r[1] < 0.1) return;
      Bt.add(g.box, M('kerb'), (r[0] + r[2]) / 2, h / 2 - 0.01, (r[1] + r[3]) / 2, r[2] - r[0], h + 0.02, r[3] - r[1]);
      const k = s.curb && r[2] - r[0] > 0.8 && r[3] - r[1] > 0.8 ? 0.16 : 0;
      Bt.add(g.plane, M(s.mat || 'pav'), (r[0] + r[2]) / 2, h + 0.004, (r[1] + r[3]) / 2, r[2] - r[0] - k * 2, r[3] - r[1] - k * 2, 1, -Math.PI / 2, 0, 0);
      hgEach(r, (x, z, v) => Math.max(v, h));
    });
    (CK.groundHooks || []).forEach(f => { try { f(B); } catch (e) { console.error('[groundHooks]', e); } });   // 斜的、彎的路（citykit8.js）
    // 水：水面、護岸、岸邊的壓頂石；碰撞（橋下不擋）
    D.water.forEach(w => {
      const sh = new TH.Shape(w.poly.map(p => new TH.Vector2(p[0], -p[1])));
      Bt.add(new TH.ShapeGeometry(sh), CK.waterMat(), 0, w.level, 0, 1, 1, 1, -Math.PI / 2, 0, 0);
      // 水底（深色，從水面看下去）
      Bt.add(new TH.ShapeGeometry(sh), CK.mat('waterBed', { col: '#1E2E30', rough: 1, snow: 0 }), 0, w.level - 1.4, 0, 1, 1, 1, -Math.PI / 2, 0, 0);
      const P = w.poly, n = P.length;
      for (let i = 0; i < n; i++) {
        const a = P[i], b = P[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.05) continue;
        const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, nx = -dz / L, nz = dx / L, inside = pip(mx + nx * 0.2, mz + nz * 0.2, P), sgn = inside ? 1 : -1;
        const yaw = Math.atan2(nx * sgn, nz * sgn);   // 牆面朝水
        Bt.add(g.plane, M(w.bank), mx, (w.level - 1.5) / 2, mz, L + 0.02, 1.5 - w.level, 1, 0, yaw, 0, { noFac: true });
        Bt.add(g.box, M('kerb'), mx - nx * sgn * 0.2, 0.05, mz - nz * sgn * 0.2, L + 0.4, 0.1, 0.45, 0, Math.atan2(dx, dz) + Math.PI / 2, 0);   // 比橋面、人行道低（0.1）：橋頭不會凸出來
        if (w.fence) { const fy = Math.atan2(dx, dz) + Math.PI / 2; Bt.add(g.box, M('steelD'), mx - nx * sgn * 0.25, 1.0, mz - nz * sgn * 0.25, L, 0.05, 0.05, 0, fy, 0); for (let t = 0; t < L; t += 2) { const px = a[0] + dx * t / L - nx * sgn * 0.25, pz = a[1] + dz * t / L - nz * sgn * 0.25; Bt.add(g.box, M('steelD'), px, 0.5, pz, 0.05, 1, 0.05); } }
      }
    });
    // 水的碰撞：0.5 公尺一格、一列一列合併；橋、走得過去的地方不擋
    const cs = 0.5;
    D.water.forEach(w => {
      const xs = w.poly.map(p => p[0]), zs = w.poly.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
      for (let z = z0; z < z1; z += cs) {
        let run = null;
        for (let x = x0; x <= x1 + cs; x += cs) {
          const cx = x + cs / 2, cz = z + cs / 2, wet = x <= x1 && pip(cx, cz, w.poly) && !D.bridges.some(b => inR(cx, cz, b.r, 0.05));
          if (wet && run == null) run = x; else if (!wet && run != null) { R.addBox(run, x, z, z + cs, 'water'); run = null; }
        }
      }
    });
    // 橋：橋面（拱的就分段）、欄杆、橋墩
    D.bridges.forEach(b => {
      const r = b.r, ax = b.axis === 'x', L = ax ? r[2] - r[0] : r[3] - r[1], Wd = ax ? r[3] - r[1] : r[2] - r[0], n = b.rise ? Math.max(8, Math.round(L / 1.2)) : 1;
      const yAt = t => b.deck + b.rise * Math.sin(Math.PI * clamp01(t));
      bridgeH(b);
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, y0 = yAt(t0), y1 = yAt(t1), a = (ax ? r[0] : r[1]) + L * t0, c = L / n, slope = Math.atan2(y1 - y0, c);
        const cx = ax ? a + c / 2 : (r[0] + r[2]) / 2, cz = ax ? (r[1] + r[3]) / 2 : a + c / 2, len = Math.hypot(c, y1 - y0) + 0.02;
        const dm = M(b.mat, { ground: 1 }); if (ax) Bt.add(g.box, dm, cx, (y0 + y1) / 2 - 0.25, cz, len, 0.5, Wd, 0, 0, slope); else Bt.add(g.box, dm, cx, (y0 + y1) / 2 - 0.25, cz, Wd, 0.5, len, -slope, 0, 0);
        if (b.rail) [-1, 1].forEach(sd => { const o = sd * (Wd / 2 - 0.15); if (ax) Bt.add(g.box, M(b.railMat), cx, (y0 + y1) / 2 + 0.45, cz + o, len, 0.9, 0.3, 0, 0, slope); else Bt.add(g.box, M(b.railMat), cx + o, (y0 + y1) / 2 + 0.45, cz, 0.3, 0.9, len, -slope, 0, 0); });
      }
      if (b.rail) [-1, 1].forEach(sd => { const o = sd * (Wd / 2 - 0.15); if (ax) R.addBox(r[0] + 0.3, r[2] - 0.3, (r[1] + r[3]) / 2 + o - 0.15, (r[1] + r[3]) / 2 + o + 0.15, 'rail'); else R.addBox((r[0] + r[2]) / 2 + o - 0.15, (r[0] + r[2]) / 2 + o + 0.15, r[1] + 0.3, r[3] - 0.3, 'rail'); });
      // 橋墩：每 12 公尺一個（拱橋沒有）
      if (!b.rise) for (let t = (ax ? r[0] : r[1]) + 6; t < (ax ? r[2] : r[3]) - 4; t += 12) { if (ax) Bt.add(g.box, M('concD'), t, -1.4, (r[1] + r[3]) / 2, 1.2, 2.6, Wd * 0.7); else Bt.add(g.box, M('concD'), (r[0] + r[2]) / 2, -1.4, t, Wd * 0.7, 2.6, 1.2); }
    });
    // 台地、階梯
    D.terr.forEach(t => {
      const r = t.r;
      if (t.stairs) {
        const dir = t.stairs, along = dir === 'n' || dir === 's' ? 'z' : 'x', L = along === 'z' ? r[3] - r[1] : r[2] - r[0], up = dir === 's' || dir === 'e' ? 1 : -1, n = t.ramp ? 1 : Math.max(2, Math.round((t.h1 - t.h0) / 0.16));
        stairsH(t);
        if (t.ramp) { const sl = Math.atan2(t.h1 - t.h0, L), cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2, ym = (t.h0 + t.h1) / 2; if (along === 'z') Bt.add(g.box, M(t.mat), cx, ym - 0.2, cz, r[2] - r[0], 0.4, Math.hypot(L, t.h1 - t.h0), sl * -up, 0, 0); else Bt.add(g.box, M(t.mat), cx, ym - 0.2, cz, Math.hypot(L, t.h1 - t.h0), 0.4, r[3] - r[1], 0, 0, sl * up); }
        else for (let i = 0; i < n; i++) {
          const k0 = i / n, k1 = (i + 1) / n, y = t.h0 + (t.h1 - t.h0) * (i + 1) / n;
          const a = up > 0 ? (along === 'z' ? r[1] : r[0]) + L * k0 : (along === 'z' ? r[3] : r[2]) - L * k1, b = a + L / n;
          const sm = M(t.mat, { ground: 1 }); if (along === 'z') Bt.add(g.box, sm, (r[0] + r[2]) / 2, y / 2, (a + b) / 2, r[2] - r[0], Math.max(0.02, y), b - a + 0.01); else Bt.add(g.box, sm, (a + b) / 2, y / 2, (r[1] + r[3]) / 2, b - a + 0.01, Math.max(0.02, y), r[3] - r[1]);
        }
        return;
      }
      hgEach(r, () => t.h);
      // 擋土牆（往外斜一點）、頂面、碰撞（缺口不擋）
      Bt.add(g.box, M(t.wall), (r[0] + r[2]) / 2, t.h / 2 - 0.02, (r[1] + r[3]) / 2, r[2] - r[0], t.h + 0.04, r[3] - r[1], 0, 0, 0, { noFac: true });
      Bt.add(g.plane, M(t.top, { ground: 1 }), (r[0] + r[2]) / 2, t.h + 0.006, (r[1] + r[3]) / 2, r[2] - r[0] - 0.3, r[3] - r[1] - 0.3, 1, -Math.PI / 2, 0, 0);
      Bt.add(g.box, M('kerb'), (r[0] + r[2]) / 2, t.h + 0.06, r[1] + 0.15, r[2] - r[0], 0.12, 0.3); Bt.add(g.box, M('kerb'), (r[0] + r[2]) / 2, t.h + 0.06, r[3] - 0.15, r[2] - r[0], 0.12, 0.3);
      Bt.add(g.box, M('kerb'), r[0] + 0.15, t.h + 0.06, (r[1] + r[3]) / 2, 0.3, 0.12, r[3] - r[1]); Bt.add(g.box, M('kerb'), r[2] - 0.15, t.h + 0.06, (r[1] + r[3]) / 2, 0.3, 0.12, r[3] - r[1]);
      // 牆的碰撞：四邊各 0.6 公尺厚的帶子（從外面擋著上不去，從上面也掉不下來），缺口扣掉
      const k = 0.3, edges = [[r[0] - k, r[1] - k, r[2] + k, r[1] + k], [r[0] - k, r[3] - k, r[2] + k, r[3] + k], [r[0] - k, r[1], r[0] + k, r[3]], [r[2] - k, r[1], r[2] + k, r[3]]];
      subAll(edges, t.open.map(o => [o[0] - 0.05, o[1] - 0.05, o[2] + 0.05, o[3] + 0.05])).forEach(e => R.addBox(e[0], e[2], e[1], e[3], 'wall'));
    });
    // 走得到的範圍的邊界（看不到的牆）
    const b = walk; R.addBox(b[0] - 400, b[0], b[1] - 400, b[3] + 400, 'bound'); R.addBox(b[2], b[2] + 400, b[1] - 400, b[3] + 400, 'bound'); R.addBox(b[0], b[2], b[1] - 400, b[1], 'bound'); R.addBox(b[0], b[2], b[3], b[3] + 400, 'bound');
    // 海：整片（地面以外的地方）
    if (city.sea) { const sm = CK.waterMat(); Bt.add(g.plane, sm, (walk[0] + walk[2]) / 2, D.seaY == null ? -1.2 : D.seaY, (walk[1] + walk[3]) / 2, 3000, 3000, 1, -Math.PI / 2, 0, 0); }
  };
  const clamp01 = v => Math.max(0, Math.min(1, v));

  // ---------- 旋轉的方塊（碰撞） ----------
  const OBB = { list: [], cells: new Map() };
  const OG = 12;
  CK.addObb = (cx, cz, hx, hz, a, tag) => {
    const c = { cx, cz, hx, hz, ca: Math.cos(a), sa: Math.sin(a), tag, on: true }, ex = Math.abs(hx * c.ca) + Math.abs(hz * c.sa), ez = Math.abs(hx * c.sa) + Math.abs(hz * c.ca);
    c.r = [cx - ex, cz - ez, cx + ex, cz + ez]; OBB.list.push(c);
    for (let gx = Math.floor(c.r[0] / OG); gx <= Math.floor(c.r[2] / OG); gx++) for (let gz = Math.floor(c.r[1] / OG); gz <= Math.floor(c.r[3] / OG); gz++) { const k = gx + ',' + gz; if (!OBB.cells.has(k)) OBB.cells.set(k, []); OBB.cells.get(k).push(c); }
    return c;
  };
  const obbReset = () => { OBB.list = []; OBB.cells = new Map(); };
  // 圓推出旋轉的方塊：換到方塊自己的座標算
  const obbPush = (p, r) => {
    const seen = new Set();
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) (OBB.cells.get((Math.floor(p.x / OG) + dx) + ',' + (Math.floor(p.z / OG) + dz)) || []).forEach(c => {
      if (seen.has(c) || !c.on) return; seen.add(c);
      // 世界 → 方塊（繞 y 轉 -a）：three 的 rotation.y = a：world = (x c + z s, -x s + z c)
      const wx = p.x - c.cx, wz = p.z - c.cz, lx = wx * c.ca - wz * c.sa, lz = wx * c.sa + wz * c.ca;
      const qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz)), ddx = lx - qx, ddz = lz - qz, d2 = ddx * ddx + ddz * ddz;
      if (d2 >= r * r) return;
      let nx, nz;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), push = r - d; nx = lx + ddx / d * push; nz = lz + ddz / d * push; }
      else { const o = [[lx + c.hx + r, -1, 0], [c.hx - lx + r, 1, 0], [lz + c.hz + r, 0, -1], [c.hz - lz + r, 0, 1]].sort((u, v) => u[0] - v[0])[0]; nx = lx + o[1] * o[0]; nz = lz + o[2] * o[0]; }
      p.x = c.cx + nx * c.ca + nz * c.sa; p.z = c.cz - nx * c.sa + nz * c.ca;
    });
  };
  CK.obbHit = (x, z, r) => { const p = { x, z }; obbPush(p, r || 0.01); return Math.hypot(p.x - x, p.z - z) > 1e-4; };
  const noclip = () => { const c = document.getElementById('adm-clip'); return !!(c && c.checked && R.S && R.S.admin); };
  const col0 = R.collide;
  R.collide = (p, r) => { const out = col0(p, r); if (R.inCity3D() && !noclip()) { obbPush(p, r); col0(p, r); } return out; };

  // ---------- 天空、光線、天氣 ----------
  const setupSky = (sc, city) => {
    const TH = T(), tw = W.town;
    const skyM = CK.skyMat(), sky = new TH.Mesh(new TH.SphereGeometry(3800, 48, 24), skyM); sky.frustumCulled = false; sky.renderOrder = -10; sc.add(sky);
    const envSc = new TH.Scene(), envM = new TH.ShaderMaterial({ uniforms: skyM.uniforms, vertexShader: skyM.vertexShader, fragmentShader: skyM.fragmentShader, side: TH.BackSide, depthWrite: false }); envSc.add(new TH.Mesh(new TH.SphereGeometry(100, 32, 16), envM));
    const hemi = new TH.HemisphereLight(0xffffff, 0x444444, 0.6); sc.add(hemi);
    const sun = new TH.DirectionalLight(0xffffff, 2); const q = CK.quality();
    sun.castShadow = q > 0; sun.shadow.mapSize.set(q >= 2 ? 4096 : 2048, q >= 2 ? 4096 : 2048);
    const scam = sun.shadow.camera; scam.left = -75; scam.right = 75; scam.top = 75; scam.bottom = -75; scam.near = 1; scam.far = 400; sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.05;
    sc.add(sun); sc.add(sun.target); W.moon = sun; W.torch = null;
    sc.fog = new TH.FogExp2(0xffffff, 0.0008);
    const pts = []; const np = R.touch ? 4 : 8; for (let i = 0; i < np; i++) { const p = new TH.PointLight(new TH.Color('#FFD8A8').convertSRGBToLinear(), 0, 18, 1.8); p.position.set(0, -50, 0); sc.add(p); pts.push(p); }
    CK.lampLights = (L0, qq) => { const n = qq >= 2 ? L0.length : qq === 1 ? Math.min(L0.length, 4) : 0; L0.forEach((p, i) => { p.visible = i < n; }); };   // 2026-10-10：路燈照地的光——低畫質不開（每個像素都要算每一盞）、中 4 盞、高 8 盞
    CK.lampLights(pts, q);
    tw.L = { sky, skyM, envSc, hemi, sun, pts, pm: new TH.PMREMGenerator(W.renderer), env: null, envKey: '', lastH: -1 };
    // 雪（或雨）：在鏡頭附近的一個盒子裡循環，頂點著色器自己算位置
    const N = 9000, pos = new Float32Array(N * 3), rr = CK.rng(9); for (let i = 0; i < N; i++) { pos[i * 3] = rr() * 80 - 40; pos[i * 3 + 1] = rr() * 34; pos[i * 3 + 2] = rr() * 80 - 40; }
    const pg = new TH.BufferGeometry(); pg.setAttribute('position', new TH.BufferAttribute(pos, 3)); pg.setDrawRange(0, 0);
    const pm = new TH.ShaderMaterial({
      uniforms: { t: { value: 0 }, c: { value: new TH.Vector3() }, fall: { value: 1.6 }, wind: { value: new TH.Vector2(0.4, 0.15) }, size: { value: 2.6 }, rain: { value: 0 }, col: { value: new TH.Color(1, 1, 1) } },
      vertexShader: 'uniform float t; uniform vec3 c; uniform float fall; uniform vec2 wind; uniform float size; uniform float rain; varying float vA; void main(){ vec3 p = position + vec3(wind.x * t + sin(t * 0.7 + position.y) * 0.6 * (1.0 - rain), -fall * t, wind.y * t); p.xz = mod(p.xz - c.xz + 40.0, 80.0) - 40.0 + c.xz; p.y = mod(p.y, 34.0) + c.y; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * (220.0 / -mv.z); vA = clamp(1.0 - (-mv.z) / 70.0, 0.0, 1.0); }',
      fragmentShader: 'uniform float rain; uniform vec3 col; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = rain > 0.5 ? (1.0 - smoothstep(0.02, 0.06, abs(d.x))) * (1.0 - smoothstep(0.3, 0.5, abs(d.y))) * 0.5 : 1.0 - smoothstep(0.2, 0.5, length(d)); if (a < 0.02) discard; gl_FragColor = vec4(col, a * vA * 0.9); }',
      transparent: true, depthWrite: false, fog: false
    });
    const snow = new TH.Points(pg, pm); snow.frustumCulled = false; sc.add(snow); tw.L.snow = snow;
  };
  const applyTime = force => {
    const tw = W.town, L = tw && tw.L; if (!L) return;
    const h = R.hourNow ? R.hourNow() : 12, wn = R.weatherNow ? R.weatherNow() : '晴', city = tw.city, k = CK.lightFor(h + (city.hourShift || 0), wn), TH = T(), lc = a => new TH.Color(a[0], a[1], a[2]);
    const u = L.skyM.uniforms; u.top.value.copy(lc(k.top)).convertSRGBToLinear(); u.hor.value.copy(lc(k.hor)).convertSRGBToLinear(); u.gnd.value.copy(lc(k.gnd)).convertSRGBToLinear(); u.sunCol.value.copy(lc(k.sunC)).convertSRGBToLinear(); u.sunDir.value.set(k.s.dir[0], k.s.dir[1], k.s.dir[2]); u.cloud.value = k.wx.cloud; u.night.value = k.night;
    W.scene.fog.color.copy(u.hor.value); const fogK = k.wx.fog * (city.fog || 1); W.scene.fog.density = 0.0006 * fogK * (k.night > 0.5 ? 1.3 : 1);
    L.sun.color.copy(u.sunCol.value); L.sun.intensity = k.sunI; L.sunDir = k.s.dir;
    L.hemi.color.copy(u.top.value).lerp(new TH.Color(1, 1, 1), 0.35); L.hemi.groundColor.copy(lc([0.34, 0.31, 0.28])).convertSRGBToLinear(); L.hemi.intensity = k.hemiI * (k.night > 0.5 ? 0.6 : 1);
    // 環境反光：時間、天氣變了才重算
    // 2026-10-09 作者：調低畫質還是會卡——環境反光每 15 分鐘（遊戲時間，現實約 11 秒）重算一次會頓一下：改成每小時；低畫質不用環境反光（環境光調亮補回來）
    const lowQ = CK.quality() === 0; if (u.oct) u.oct.value = CK.quality() >= 2 ? 6 : CK.quality() === 1 ? 4 : 2;
    const key = (lowQ ? 'low' : Math.round(h)) + '|' + wn; if (force || key !== L.envKey) { L.envKey = key; const old = L.env; if (lowQ) { L.env = null; W.scene.environment = null; } else { L.env = L.pm.fromScene(L.envSc, 0.02); W.scene.environment = L.env.texture; } if (old) old.dispose(); }
    if (lowQ) L.hemi.intensity *= 1.7;
    // 窗戶、路燈、霓虹
    Object.values(CK.mats).forEach(m => {
      if (m.userData.win) m.emissiveIntensity = 0.05 + k.winK * 2.2;
      else if (m.userData.lamp) m.emissiveIntensity = 0.3 + k.lampK * 6;
      else if (m.userData.neon) m.emissiveIntensity = (m.userData.ei0 || 1.6) * (0.55 + k.lampK * 1.2);
      if (!m.isMeshBasicMaterial && m.envMapIntensity != null && m.userData.env0 == null) m.userData.env0 = m.envMapIntensity;
      if (m.userData.env0 != null) m.envMapIntensity = m.userData.env0 * k.envI;
    });
    if (waterMat) waterMat.envMapIntensity = 0.7 * k.envI;
    CK.U.uSnow.value = k.wx.snow * (city.snow == null ? 1 : city.snow); CK.U.uWet.value = k.wx.wet;
    const P = CK.post; P.expo = k.night > 0.5 ? 1.25 : 0.86; P.bloom = k.night > 0.5 ? 0.85 : 0.35; P.th = k.night > 0.5 ? 0.85 : 1.3; P.sat = k.night > 0.5 ? 1.0 : 1.15;
    L.lampK = k.lampK;
    // 雪、雨
    const sn = L.snow, sm = sn.material.uniforms, wx = k.wx, n = Math.round(Math.min(9000, wx.flakes * (R.touch ? 0.5 : 1)));
    sn.geometry.setDrawRange(0, n); sn.visible = n > 0; sm.rain.value = wx.rain ? 1 : 0; sm.fall.value = wx.rain ? 16 : 1.4 + (wx.wind || 0) * 0.2; sm.wind.value.set(wx.rain ? 1 : 0.5 + (wx.wind || 0) * 2.2, wx.rain ? 0.2 : 0.2 + (wx.wind || 0) * 0.6); sm.size.value = wx.rain ? 4 : 2.4; sm.col.value.set(wx.rain ? '#9AB0C8' : '#FFFFFF');
  };
  CK.applyTime = applyTime;

  // ---------- 進城 ----------
  const build = (city, sc) => {
    const TH = T(), group = new TH.Group(), tw = W.town;
    R.col = { list: [], cells: new Map() }; obbReset();
    hgInit(city.walk);
    const B = makeBuilder(city, group);
    if (CK.extendBuilder) CK.extendBuilder(B);
    try { city.build(B); } catch (e) { console.error('[city ' + city.id + ']', e); }
    finishGround(B);
    B.Bt.flush(group);
    if (B.after) B.after.forEach(f => { try { f(); } catch (e) { console.error(e); } });
    sc.add(group); tw.group = group;
    tw.mapCanvas = drawMap(city, B.D);
    if (CK.spawnLife) CK.spawnLife(B);
    return B;
  };
  CK.enter = (id, o) => {
    const city = CITIES[id], TH = T(); if (!city) return;
    o = o || {};
    R.initGL();
    if (W.inside) { try { R.disposeScene(W.scene); } catch (e) { } if (W.outside) try { R.disposeScene(W.outside.scene); } catch (e) { } }
    else if (W.scene) R.disposeScene(W.scene);
    if (W.town && W.town.L) { try { W.town.L.pm.dispose(); if (W.town.L.env) W.town.L.env.dispose(); } catch (e) { } }
    W.run = null; W.enemies = []; W.shots = []; W.drops = []; W.zones = []; W.fxs = []; W.dyn = []; W.F = null; W.inside = null; W.outside = null;
    W.town = { t: 0, ck: id, city, from: null, inter: [], npcs: [], cars: [], trains: [], fx: [], smokes: [], neon: [], pool: [], foot: [], steals: [], watchers: [], lamps: [], walkNodes: [], anim: [], boats: [] };
    R.clearNums && R.clearNums();
    const sc = new TH.Scene(); sc.userData.hq = true; W.scene = sc;
    setupSky(sc, city);
    const t0 = performance.now(); build(city, sc); W.town.buildMs = Math.round(performance.now() - t0);
    const cls = S().cls, eq = R.equipped(cls), P = { cls, speed: R.CLASSES[cls].speed * 1.2, h: R.makePlayerHero(cls, eq.weapon ? eq.weapon.base : R.STARTER[cls], eq), aimA: 0, yaw: 0 };
    W.P = P; sc.add(P.h.g); const sp = o.at || city.spawn; P.x = sp[0]; P.z = sp[1]; P.yaw = sp[2] || 0; P.yv = CK.heightAt(P.x, P.z);
    R.spawnTownAllies();
    R.showScreen('run'); $('run').classList.add('town'); W.paused = false;
    if (R.SEE) R.SEE.r.value = 3.2;
    W.cam.yawT = city.camYaw || 0; R.placeCam(null); fixCam(0); CK.fixSprites();
    applyTime(true);
    try { W.renderer.compile(W.scene, W.camera); } catch (e) { }
    hud(true);
    ['r-hurt', 'r-blind', 'r-field'].forEach(k => { const v = $(k); if (v) v.style.opacity = 0; });
    const s = S(); s.ck = s.ck || {}; const first = !s.ck[id]; s.ck[id] = (s.ck[id] || 0) + 1; R.save();
    R.banner(city.name, city.banner || '');
    if (first && city.firstTip) setTimeout(() => R.toast(city.firstTip, '#E8C04A'), 3600);
  };

  // ---------- 鏡頭：跟著地面的高度（台階、橋上） ----------
  // 鏡頭（2026-10-08 作者給了一部影片：「把場景做成像這樣、一樣的精緻度」）：
  //   漫遊（預設）：低角度的第三人稱，看得到地平線、天空、遠山、水面的倒影；滾輪拉近拉遠＝高低（近的時候更低）。
  //   俯瞰：原本那種從上面斜看（視角收窄、往後退）。暫停選單切換，存在瀏覽器（tfl-citycam）。
  const FOV = 30, BASE_FOV = 44;
  CK.camMode = () => { try { return localStorage.getItem('tfl-citycam') || 'low'; } catch (e) { return 'low'; } };
  CK.setCamMode = m => { try { localStorage.setItem('tfl-citycam', m); } catch (e) { } };
  CK.camPitch = () => (W.town && W.town.room ? 54 * Math.PI / 180 : CK.camMode() === 'top' ? Math.atan2(R.CAM.h, R.CAM.back) : (14 + ((W.cam ? W.cam.zoom : 1) - 0.65) / 0.8 * 22) * Math.PI / 180);
  const fixCam = dt => {
    const P = W.P, c = W.camera, y = CK.heightAt(P.x, P.z);
    P.yv = dt ? P.yv + (y - P.yv) * Math.min(1, dt * 6) : y;
    if (CK.camMode() === 'top') {
      const k = Math.tan(BASE_FOV / 2 * Math.PI / 180) / Math.tan(FOV / 2 * Math.PI / 180), tx = P.x, ty = 0.6, tz = P.z;
      c.position.set(tx + (c.position.x - tx) * k, ty + (c.position.y - ty) * k + P.yv, tz + (c.position.z - tz) * k);
      if (c.fov !== FOV) { c.fov = FOV; c.updateProjectionMatrix(); }
      c.lookAt(tx, P.yv + ty, tz);
      return;
    }
    const z = W.cam.zoom, pitch = CK.camPitch(), dist = W.town.room ? 12 + (z - 0.65) / 0.8 * 8 : 7 + (z - 0.65) / 0.8 * 11, yaw = W.cam.yaw, tx = P.x, ty = P.yv + 1.5, tz = P.z;
    let cx = tx + Math.sin(yaw) * Math.cos(pitch) * dist, cy = ty + Math.sin(pitch) * dist, cz = tz + Math.cos(yaw) * Math.cos(pitch) * dist;
    cy = Math.max(cy, CK.heightAt(cx, cz) + 1.2);   // 鏡頭不鑽進地面、台階裡
    c.position.set(cx, cy, cz);
    const fv = W.town.room ? 46 : 52; if (c.fov !== fv) { c.fov = fv; c.updateProjectionMatrix(); }
    c.lookAt(tx, ty + 0.4, tz);
  };
  // 人物的看板：照鏡頭的俯角補高度（sprites.js 的 TILT 是照原本 57 度的鏡頭算的）
  const tiltK = () => (1 / Math.cos(CK.camPitch())) / (R.PIX ? R.PIX.TILT : 1);
  CK.fixSprites = () => { const tw = W.town, k = tiltK(); if (!tw) return; const set = h => { if (h && h.g && h.g.scale.y !== k) h.g.scale.y = k; }; set(W.P && W.P.h); (tw.npcs || []).forEach(n => set(n.h)); (tw.allies || []).forEach(a => set(a.h)); };

  // ---------- 每一格 ----------
  const step = dt => {
    const tw = W.town, P = W.P, I = R.input; if (!tw || !P) return;
    tw.t += dt; CK.U.uTime.value = tw.t;
    if (R.S && !tw.rolling) { R.S.hour = (R.S.hour == null ? 9 : R.S.hour) + dt / 45; if (R.S.hour >= 24) rollOver(); }
    let mx = 0, mz = 0;
    if (!P.busy) { if (I.keys.w || I.keys.arrowup) mz -= 1; if (I.keys.s || I.keys.arrowdown) mz += 1; if (I.keys.a || I.keys.arrowleft) mx -= 1; if (I.keys.d || I.keys.arrowright) mx += 1; if (I.moveStick) { mx += I.moveStick.x; mz += I.moveStick.y; } }
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    if (P.sit) { if (ml > 0.1) { P.sit = false; P.h.sit = false; } else { mx = mz = 0; } }
    const cy = Math.cos(W.cam.yaw), sy = Math.sin(W.cam.yaw), wx = mx * cy + mz * sy, wz = -mx * sy + mz * cy, run = R.running() ? 2.2 : 1;
    const ox = P.x, oz = P.z, y0 = CK.heightAt(P.x, P.z);
    P.x += wx * P.speed * run * dt; P.z += wz * P.speed * run * dt; R.collide(P, 0.42);
    // 太高的地方上不去（台地的邊、沒有階梯的地方）：一步最多 0.45 公尺
    if (CK.heightAt(P.x, P.z) - y0 > Math.max(0.45, Math.hypot(P.x - ox, P.z - oz) * 1.1)) { P.x = ox; P.z = oz; }   // 陡的石階：一格跨兩階也上得去（掉幀的時候）；牆照樣上不去
    if (ml > 0.1) P.yaw = Math.atan2(wx, wz); P.aimA = P.yaw;
    const py = CK.heightAt(P.x, P.z);
    P.h.g.position.set(P.x, py, P.z); P.h.g.rotation.y = P.yaw; R.animHero(P.h, ml * P.speed * run, dt, false);
    try { R.townAllies(dt); (tw.allies || []).forEach(a => { a.h.g.position.y = CK.heightAt(a.x, a.z); }); } catch (e) { }
    if (CK.stepLife) CK.stepLife(dt, tw, P);
    if (tw.city.tick) try { tw.city.tick(dt, tw, P); } catch (e) { console.warn(e); }
    (tw.anim || []).forEach(f => f(dt, tw.t, P));
    // 水在流
    const wt = CK.tex('water').normalMap; wt.offset.x = (tw.t * 0.006) % 1; wt.offset.y = (tw.t * 0.004) % 1;
    const L = tw.L;
    tw.lt = (tw.lt || 0) - dt; if (tw.lt <= 0) { tw.lt = 0.3; applyTime(false); lampLights(P); }
    if (L) {
      const d = L.sunDir || [0.3, 0.8, 0.4], ahead = CK.camMode && CK.camMode() !== 'top' ? 45 : 0, fx = P.x - Math.sin(W.cam.yaw) * ahead, fz = P.z - Math.cos(W.cam.yaw) * ahead; L.sun.position.set(fx + d[0] * 200, d[1] * 200, fz + d[2] * 200); L.sun.target.position.set(fx, 0, fz);
      // 陰影貼圖的格子對齊（走路時陰影的邊不會閃）
      const sc = L.sun.shadow.camera, texel = (sc.right - sc.left) / L.sun.shadow.mapSize.x; L.sun.target.position.x = Math.round(L.sun.target.position.x / texel) * texel; L.sun.target.position.z = Math.round(L.sun.target.position.z / texel) * texel;
      L.sun.position.x = L.sun.target.position.x + d[0] * 200; L.sun.position.z = L.sun.target.position.z + d[2] * 200;
      L.sky.position.copy(W.camera.position);
      const su = L.snow.material.uniforms; su.t.value = tw.t; su.c.value.set(P.x, 0, P.z); L.skyM.uniforms.time.value = tw.t;
    }
    R.placeCam(dt, 0); fixCam(dt); CK.fixSprites();
    R.updateSee(true, { x: P.x, z: P.z }, W.camera); if (R.SEE && R.SEE.p.value) R.SEE.p.value.y = P.yv + 1.5;
    hud(false, dt);
    R.drawMinimap();
  };
  const lampLights = P => {
    const tw = W.town, L = tw.L; if (!L) return;
    const on = (L.lampK || 0) > 0.05, list = on ? tw.lamps.map(p => [p, (p[0] - P.x) ** 2 + (p[1] - P.z) ** 2]).filter(q => q[1] < 2500).sort((p, q) => p[1] - q[1]).slice(0, L.pts.length) : [];
    L.pts.forEach((p, i) => { const q = list[i]; if (q) { p.position.set(q[0][0], CK.heightAt(q[0][0], q[0][1]) + 4.6, q[0][1]); p.intensity = 2.4 * L.lampK; } else { p.intensity = 0; p.position.y = -50; } });
  };
  const rollOver = () => {
    const tw = W.town, P = W.P; if (!tw || !P) return;
    tw.rolling = true; R.S.pendingHour = null;
    const at = tw.outer ? [tw.outer.P.x, tw.outer.P.z, tw.outer.P.yaw] : [P.x, P.z, P.yaw];
    R.fade(() => { R.advanceDays(1); R.S.hour = 6; CK.enter(tw.ck, { at }); const E = R.eventsToday ? R.eventsToday() : {}; R.banner(R.shortDate ? R.shortDate() : '', '在街上待到天亮了。' + (E.weather ? '今天的天氣：' + E.weather + '。' : '')); });
  };

  // ---------- 狀態列 ----------
  let slowT = 0, lastLbl = '';
  const areaAt = (x, z) => { const tw = W.town; const a = (tw.D.areas || []).find(q => inR(x, z, q[1])); return a ? a[0] : tw.city.name; };
  CK.areaAt = areaAt;
  function hud(force, dt) {
    slowT += dt || 0; if (!force && slowT < 0.2) return; slowT = 0;
    const P = W.P, s = S(), tw = W.town, name = areaAt(P.x, P.z), date = R.shortDate ? R.shortDate() : '', clk = (R.timeLabel ? R.timeLabel() : '') + '・' + (R.weatherNow ? R.weatherNow() : '');
    if (name + date + clk !== lastLbl || force) { lastLbl = name + date + clk; $('r-where').innerHTML = '<b>' + esc(tw.city.name) + (name !== tw.city.name ? '・' + esc(name) : '') + '</b><small>' + esc(date) + '　' + esc(R.clsName(s.cls)) + ' Lv ' + s.classes[s.cls].lv + '</small><small id="r-clock">' + esc(clk) + '</small>'; }
    $('r-town').innerHTML = '<span>費拉 <b>' + s.gold + '</b></span><span>回復藥 <b>' + s.potions.hp + '</b></span><span>魔力藥 <b>' + s.potions.mp + '</b></span>' + (R.crimeHud ? R.crimeHud() : '');   // 通緝、視線條、警戒（props.js、vigilance.js；ckcrime.js 接上）
    const it = R.townNear(); $('r-prompt').hidden = !it; if (it) $('r-prompt').innerHTML = '<kbd>' + (R.touch ? '互動' : '空白') + '</kbd>' + esc(it.label);
    const wp = $('r-wp'); if (wp) wp.hidden = true;
  }

  // ---------- 地圖（小地圖、大地圖共用一張畫布：每公尺 2 像素） ----------
  const MPPM = 2;
  const FOOTC = { office: '#8A929C', glass: '#7A8EA0', apt: '#A8A49C', house: '#9A8C80', shop: '#A89480', machiya: '#6A5A4E', brick: '#A86A54', factory: '#8A8E92', temple: '#5A4A3E', castle: '#E8E4DC', station: '#6A7A8A', tower: '#C84A3A', civic: '#B8B0A0' };
  function drawMap(city, D) {
    const b = city.walk, m = 24, x0 = b[0] - m, z0 = b[1] - m, w = (b[2] - b[0] + m * 2) * MPPM, h = (b[3] - b[1] + m * 2) * MPPM;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), X = x => (x - x0) * MPPM, Z = z => (z - z0) * MPPM;
    const poly = (P, col) => { g.fillStyle = col; g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1])))); g.closePath(); g.fill(); };
    const rect = (r, col) => { g.fillStyle = col; g.fillRect(X(r[0]), Z(r[1]), (r[2] - r[0]) * MPPM, (r[3] - r[1]) * MPPM); };
    g.fillStyle = city.sea ? '#3A5E78' : '#BDB8AE'; g.fillRect(0, 0, w, h);
    if (city.land) poly(city.land, '#C8C2B6'); else rect([x0, z0, b[2] + m, b[3] + m], '#C8C2B6');
    const ZC = { grass: '#93A878', gravel: '#D8D2C2', sand: '#E2D2A6', soil: '#A89276', yard: '#C2BCB0' };
    D.zones.forEach(z => poly(z.poly, ZC[z.mat] || '#B8B4A8'));
    D.water.forEach(wt => poly(wt.poly, '#4E7C96'));
    D.terr.forEach(t => rect(t.r, t.stairs ? '#D8D0C0' : '#C0B49C'));
    (D.walkways || []).forEach(r => rect(r, '#DEDAD2')); D.slabs.forEach(s => rect(s.r, '#E2DCD0'));
    (CK.mapBake || []).forEach(f => { try { f(g, X, Z, D); } catch (e) { console.warn('[mapBake]', e); } });   // 斜的、彎的路（citykit8.js）
    D.roads.forEach(r => rect(r.r, '#55585E'));
    D.roads.forEach(rd => { const r = rd.r, ew = r[2] - r[0] >= r[3] - r[1]; g.fillStyle = 'rgba(240,236,220,.55)'; if (ew) g.fillRect(X(r[0]), Z((r[1] + r[3]) / 2) - 0.5, (r[2] - r[0]) * MPPM, 1); else g.fillRect(X((r[0] + r[2]) / 2) - 0.5, Z(r[1]), 1, (r[3] - r[1]) * MPPM); });
    D.bridges.forEach(br => rect(br.r, '#B0A898'));
    D.rails.forEach(rl => { g.strokeStyle = '#3A3A40'; g.lineWidth = 2.6 * MPPM; g.beginPath(); rl.pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1])))); g.stroke(); g.strokeStyle = '#E8E4DA'; g.lineWidth = 1; g.setLineDash([4, 4]); g.stroke(); g.setLineDash([]); });
    D.foot.forEach(f => { const col = FOOTC[f.kind] || '#9A9088'; if (f.poly) { poly(f.poly, col); g.strokeStyle = 'rgba(40,30,24,.5)'; g.lineWidth = 1; g.stroke(); } else { rect(f.r, col); g.strokeStyle = 'rgba(40,30,24,.45)'; g.lineWidth = 1; g.strokeRect(X(f.r[0]) + 0.5, Z(f.r[1]) + 0.5, (f.r[2] - f.r[0]) * MPPM - 1, (f.r[3] - f.r[1]) * MPPM - 1); } });
    c.userData = { x0, z0 };
    return c;
  }
  const drawMini = (x, s) => {
    const P = W.P, tw = W.town, yaw = W.cam.yaw, zoom = 1.25, mc = tw.mapCanvas; if (!mc) return;
    x.save(); x.translate(s / 2, s / 2); x.rotate(yaw); x.scale(zoom / MPPM, zoom / MPPM); x.translate(-(P.x - mc.userData.x0) * MPPM, -(P.z - mc.userData.z0) * MPPM);
    x.imageSmoothingEnabled = true; x.drawImage(mc, 0, 0); x.restore();
    const pt = (wx, wz) => { const dx = (wx - P.x) * zoom, dz = (wz - P.z) * zoom, c = Math.cos(yaw), sn = Math.sin(yaw); return [s / 2 + dx * c - dz * sn, s / 2 + dx * sn + dz * c]; };
    tw.inter.forEach(it => { if (!it.icon) return; const m = pt(it.x, it.z); if (m[0] < 4 || m[1] < 4 || m[0] > s - 4 || m[1] > s - 4) return; x.fillStyle = it.icon; x.strokeStyle = '#141018'; x.lineWidth = 1.5; x.beginPath(); x.arc(m[0], m[1], 4, 0, Math.PI * 2); x.fill(); x.stroke(); });
    if (R.crimeMinimap) R.crimeMinimap(x, pt);   // 通緝中：衛兵的位置
    (CK.mapHooks || []).forEach(f => { try { f(x, pt, 'mini', { s }); } catch (e) { } });   // 目的地、導航線（ckmove.js）
  };
  const stampDone = (city, it) => { if (city.stampDone) return city.stampDone(it); const g = S().cityHub, sid = it.sight; return !!(sid && g && g.stamps && g.stamps[city.id + ':' + sid]); };
  const bigMap = () => {
    if (R.sheetOpen && R.sheetOpen()) { R.closeSheet(); return; }
    const tw = W.town, P = W.P, mc = tw.mapCanvas, city = tw.city, wpx = Math.max(300, Math.min(860, Math.floor(window.innerWidth * 0.86))), sc = wpx / mc.width, hpx = Math.round(mc.height * sc);
    R.sheet('<h2>' + esc(city.name) + '</h2><canvas id="ck-big" width="' + wpx + '" height="' + hpx + '" style="width:100%;max-width:' + wpx + 'px;border-radius:8px;display:block;margin:0 auto"></canvas><p class="note">黃點是你；金色是觀光景點（蓋過章的變綠）、綠色是公會分館、橘色是吃的、藍色是車站。' + esc(city.mapNote || '') + '</p>',
      '<div class="row"><button type="button" class="btn pri" id="ck-bx">關上（Tab）</button></div>');
    $('ck-bx').onclick = R.closeSheet;
    const x = $('ck-big').getContext('2d'), pt = (wx, wz) => [(wx - mc.userData.x0) * MPPM * sc, (wz - mc.userData.z0) * MPPM * sc];
    x.imageSmoothingEnabled = true; x.drawImage(mc, 0, 0, wpx, hpx);
    tw.inter.forEach(it => { if (!it.icon) return; const m = pt(it.x, it.z); x.fillStyle = stampDone(city, it) ? '#5AC87A' : it.icon; x.strokeStyle = '#141018'; x.lineWidth = 1.5; x.beginPath(); x.arc(m[0], m[1], 4.5, 0, Math.PI * 2); x.fill(); x.stroke(); });
    x.textAlign = 'center'; x.textBaseline = 'middle';
    tw.D.labels.forEach(([t, wx, wz, big]) => { const m = pt(wx, wz); x.font = 'bold ' + (big ? 14 : 11) + 'px sans-serif'; const w = x.measureText(t).width + 8; x.fillStyle = 'rgba(244,233,205,.9)'; x.fillRect(m[0] - w / 2, m[1] - 8, w, 16); x.fillStyle = '#1A1410'; x.fillText(t, m[0], m[1]); });
    const m = pt(P.x, P.z); x.fillStyle = '#FFE08A'; x.strokeStyle = '#1A1410'; x.lineWidth = 2; x.beginPath(); x.arc(m[0], m[1], 6, 0, Math.PI * 2); x.fill(); x.stroke();
    (CK.mapHooks || []).forEach(f => { try { f(x, pt, 'big', { canvas: $('ck-big'), inv: (px, py) => [px / (MPPM * sc) + mc.userData.x0, py / (MPPM * sc) + mc.userData.z0], redraw: bigMap }); } catch (e) { } });   // 目的地、導航線；點地圖設目的地（ckmove.js）
  };
  const QN = ['低', '中', '高'];
  const menu = () => {
    const tw = W.town, city = tw.city;
    R.sheet('<h2>' + esc(city.name) + '</h2><p class="note">' + (R.dateLabel ? esc(R.dateLabel()) : '') + '</p><p class="note">' + (R.touch ? '左搖桿移動・靠近人或店按「互動」' : 'WASD 移動・Shift 跑步・空白鍵互動・Q／E 轉視角・Tab 地圖') + '。' + (city.id === 'donghe' ? '去別的城：到東鶴站買票。' : '回東鶴或去別的城：到' + esc(city.stationName || '車站') + '買票。') + '</p>'
      + '<p class="note">畫質：' + QN[CK.quality()] + '（高：反鋸齒、泛光、清楚的陰影；手機建議中或低）</p>',
      '<div class="row"><button type="button" class="btn pri" id="ck-x">繼續</button><button type="button" class="btn" id="ck-map">' + esc(city.name) + '地圖</button><button type="button" class="btn" id="ck-book">昭旭觀光手冊</button><button type="button" class="btn" id="ck-q">畫質：' + QN[CK.quality()] + '</button><button type="button" class="btn" id="ck-cam">鏡頭：' + (CK.camMode() === 'top' ? '俯瞰' : '漫遊（低角度）') + '</button>' + (R.reportClip ? '<button type="button" class="btn" id="ck-clip">回報穿模</button>' : '') + '<button type="button" class="btn" id="ck-title">回到標題</button></div>');
    $('ck-x').onclick = R.closeSheet; $('ck-map').onclick = () => { R.closeSheet(); setTimeout(bigMap, 30); }; $('ck-book').onclick = () => R.azukiBook && R.azukiBook();
    $('ck-q').onclick = () => { CK.setQuality((CK.quality() + 1) % 3); const L = W.town.L; if (L) { const q = CK.quality(); L.sun.castShadow = q > 0; L.sun.shadow.mapSize.set(q >= 2 ? 4096 : 2048, q >= 2 ? 4096 : 2048); if (L.sun.shadow.map) { L.sun.shadow.map.dispose(); L.sun.shadow.map = null; } } menu(); };
    $('ck-cam').onclick = () => { CK.setCamMode(CK.camMode() === 'top' ? 'low' : 'top'); menu(); };
    if ($('ck-clip')) $('ck-clip').onclick = () => { R.closeSheet(); setTimeout(R.reportClip, 50); };
    $('ck-title').onclick = () => { R.save(); R.closeSheet(); R.leaveTown(); if (R.goTitle) R.goTitle(); };
  };

  // ---------- 車站：回東鶴、轉往他城 ----------
  CK.ticket = () => {
    const tw = W.town, city = tw.city, az = (R.AZUKI_CITIES || []).find(c => c.id === city.id) || { fare: 60, days: 1 }, s = S();
    R.sheet('<p class="kicker">' + esc(city.stationName || city.name + '站') + '・售票口</p><h2>要搭到哪裡？</h2><p>「往東鶴的' + (az.island ? '渡輪和魔導電車' : '魔導電車') + '，單程 ' + az.fare + ' 費拉、' + az.days + ' 天。」</p><p class="note">費拉 ' + s.gold + '</p>',
      '<div class="row"><button type="button" class="btn pri" id="ck-home">回東鶴（' + az.fare + ' 費拉）</button><button type="button" class="btn" id="ck-other">轉往他城</button><button type="button" class="btn" id="ck-no">不搭了</button></div>');
    $('ck-no').onclick = R.closeSheet;
    $('ck-other').onclick = () => R.azukiTicket && R.azukiTicket(city.id);
    $('ck-home').onclick = () => {
      if (s.gold < az.fare) { R.toast('錢不夠（要 ' + az.fare + ' 費拉）。'); return; }
      s.gold -= az.fare; R.closeSheet();
      R.fade(() => {
        R.advanceDays(az.days); R.save();
        R.enterTownNow(null, [0, 0]);
        const t2 = W.town, P = W.P, st = t2 && t2.inter.find(it => typeof it.label === 'string' && /東鶴站/.test(it.label));
        if (st && P) { P.x = st.x; P.z = st.z + 1.2; R.collide(P, 0.42); P.h.g.position.set(P.x, 0, P.z); R.placeCam(null); }
        R.banner('東鶴', '從' + city.name + '回來了');
      });
    };
  };

  // ---------- 接上：在精緻城市的時候換成這個檔案的 ----------
  const ts0 = R.townStep; R.townStep = dt => (R.inCity3D() ? step(dt) : ts0(dt));
  const th0 = R.townHud; R.townHud = (f, dt) => (R.inCity3D() ? hud(f, dt) : th0(f, dt));
  const tm0 = R.townMenu; R.townMenu = (...a) => (R.inCity3D() ? menu() : tm0(...a));
  const bm0 = R.bigMap; R.bigMap = (...a) => (R.inCity3D() && !W.run ? bigMap() : bm0(...a));
  const dm0 = R.drawTownMinimap; R.drawTownMinimap = (x, s) => (R.inCity3D() ? drawMini(x, s) : dm0(x, s));
  const db0 = R.drawTownBig; if (db0) R.drawTownBig = (x, s) => (R.inCity3D() ? null : db0(x, s));
  const ta0 = R.townArea; R.townArea = () => (R.inCity3D() ? W.town.city.name + '・' + areaAt(W.P.x, W.P.z) : ta0());
  const en0 = R.enterTownNow; R.enterTownNow = (...a) => { if (W.town && W.town.L) { try { W.town.L.pm.dispose(); if (W.town.L.env) W.town.L.env.dispose(); } catch (e) { } } if (R.SEE) R.SEE.r.value = 2.5; return en0(...a); };
  const gh0 = R.goHosu; if (gh0) R.goHosu = (...a) => gh0(...a);

  CK._int = { makeBuilder, finishGround, hgInit, obbReset, OBB, drawMap, hud: f => hud(f), fixCam: dt => fixCam(dt) };

  // ---------- 防穿模的檢查（開發用）：R.cityCheck() ----------
  R.cityCheck = () => {
    const tw = W.town; if (!R.inCity3D()) return '不在精緻城市裡';
    const D = tw.D, city = tw.city, b = city.walk, cs = 0.5, nx = Math.ceil((b[2] - b[0]) / cs), nz = Math.ceil((b[3] - b[1]) / cs), free = new Uint8Array(nx * nz), hy = new Float32Array(nx * nz);
    const probe = (x, z, r) => { const p = { x, z }; R.collide(p, r); return Math.hypot(p.x - x, p.z - z) < 0.02; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = b[0] + (i + 0.5) * cs, z = b[1] + (j + 0.5) * cs; free[j * nx + i] = probe(x, z, 0.42) ? 1 : 0; hy[j * nx + i] = CK.heightAt(x, z); }
    // 從出生點走得到哪裡（高低差一步 0.45 以內）
    const seen = new Uint8Array(nx * nz), q = [], si = Math.floor((city.spawn[0] - b[0]) / cs), sj = Math.floor((city.spawn[1] - b[1]) / cs), s0 = sj * nx + si;
    if (free[s0]) { seen[s0] = 1; q.push(s0); }
    while (q.length) { const k = q.pop(), i = k % nx, j = (k - i) / nx; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { const a = i + dx, c = j + dz; if (a < 0 || c < 0 || a >= nx || c >= nz) return; const k2 = c * nx + a; if (seen[k2] || !free[k2] || Math.abs(hy[k2] - hy[k]) > 0.6) return; seen[k2] = 1; q.push(k2); }); }
    const reach = (x, z, r) => { for (let dz = -r; dz <= r; dz += cs) for (let dx = -r; dx <= r; dx += cs) { if (dx * dx + dz * dz > r * r) continue; const i = Math.floor((x + dx - b[0]) / cs), j = Math.floor((z + dz - b[1]) / cs); if (i >= 0 && j >= 0 && i < nx && j < nz && seen[j * nx + i]) return true; } return false; };
    const out = { 走得到的格數: seen.reduce((a, v) => a + v, 0), 空地格數: free.reduce((a, v) => a + v, 0), 走不到的互動: [], 互動點在東西裡面: [], 房子壓到路: [], 房子互相重疊: [], 路人穿過東西: [], 車穿過東西: [], 蓋城用了幾毫秒: tw.buildMs };
    tw.inter.forEach(it => { if (!reach(it.x, it.z, Math.max(1, it.r - 0.3))) out.走不到的互動.push(it.label + ' @' + it.x.toFixed(1) + ',' + it.z.toFixed(1)); });
    const roads = D.roads.map(r => r.r);
    D.foot.forEach((f, i) => { if (f.poly || f.kind === 'skip') return; roads.forEach(r => { if (overlap(f.r, r)) out.房子壓到路.push(f.kind + ' ' + f.r.map(v => v.toFixed(1)).join(',')); }); D.foot.forEach((o, k) => { if (k <= i || o.poly) return; const a = f.r, c = o.r; const ov = Math.min(a[2], c[2]) - Math.max(a[0], c[0]), oz = Math.min(a[3], c[3]) - Math.max(a[1], c[1]); if (ov > 0.15 && oz > 0.15) out.房子互相重疊.push(f.kind + '×' + o.kind + ' @' + ((Math.max(a[0], c[0]) + Math.min(a[2], c[2])) / 2).toFixed(1) + ',' + ((Math.max(a[1], c[1]) + Math.min(a[3], c[3])) / 2).toFixed(1)); }); });
    (tw.walkers || []).forEach((w, wi) => { const P = w.path; for (let k = 0; k < P.length - 1; k++) { const a = P[k], c = P[k + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]); for (let t = 0; t <= L; t += 0.5) { const x = a[0] + (c[0] - a[0]) * t / L, z = a[1] + (c[1] - a[1]) * t / L; if (!probe(x, z, 0.25)) { out.路人穿過東西.push('路線 ' + wi + ' @' + x.toFixed(1) + ',' + z.toFixed(1)); return; } } } });
    (tw.routes || []).forEach((rt, ri) => { const P = rt.pts; for (let k = 0; k < P.length; k++) { const a = P[k], c = P[(k + 1) % P.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); for (let t = 0; t <= L; t += 1) { const x = a[0] + (c[0] - a[0]) * t / L, z = a[1] + (c[1] - a[1]) * t / L; const blk = R.col.list.some(cb => cb.on && cb.tag !== 'bound' && x > cb.x0 + 0.1 && x < cb.x1 - 0.1 && z > cb.z0 + 0.1 && z < cb.z1 - 0.1) || CK.obbHit(x, z, 0.05); if (blk) { out.車穿過東西.push('車道 ' + ri + ' @' + x.toFixed(1) + ',' + z.toFixed(1)); return; } } } });
    return out;
  };
})(window.R);
