// 精緻城市：斜的、彎的路（2026-10-09 作者：先讓引擎會蓋斜路，再照東鶴的地圖原樣重蓋）
// B.street(pts, o)：沿著一串點（世界座標，公尺）的路。
//   o.w 車道（或路面）寬、o.sw 兩邊人行道寬（0＝沒有人行道，像巷子那樣人車共用）、o.kind（main 主幹道、sub 副幹道、lane 巷子、old 石板路、
//   olane 舊城小路、arcade 拱廊（只能走路）、dirt 泥土路……）、o.name、o.line（'w' 白線、'y' 黃線、'none'；車道 6 公尺以上才畫）、o.zebra（路口的斑馬線）、
//   o.mat（路面的材質；預設：main/sub/lane 柏油、old/olane 石板、arcade 鋪面、dirt 泥土）、o.round（轉角是圓的）。
// 蓋地面的時候（citykit2.js finishGround 的 CK.groundHooks）用 Clipper（多邊形的聯集、差集、外擴，跟 three.js 一樣從 jsdelivr 載入）：
//   路面：同一種材質的路合成一塊（柏油 > 石板 > 泥土 > 鋪面，前面的蓋過後面的）；
//   人行道：每條路往外擴 w/2＋sw 的聯集，扣掉所有路面、水（橋除外）、廣場、台地 → 高 0.12 的鋪面＋路緣石（每一邊一塊立面）；
//   標線：中線（虛線）、路邊的白線，進路口前 4.5 公尺斷開；主幹道、副幹道互相交會的路口畫斑馬線。
//   地面切成 96 公尺一塊（跟合併繪製的區塊一樣），看不到的不畫。高度（人行道 0.12）寫進 CK.HG，大小地圖也畫（CK.mapBake）。
// 路網（ckmove.js）、人走的地方（R.pedZone）也照這些路。CK.streetDist(x, z) 回傳 [最近的路, 到中心線的距離]。
// 放在 citykit7.js 後面。
(function (R) {
  const CK = R.CK, W = R.W; if (!CK) return;
  CK.clipperReady = new Promise(ok => { if (window.ClipperLib) { ok(); return; } const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/clipper-lib@6.4.2/clipper.js'; sc.onload = () => ok(); sc.onerror = () => { console.warn('[citykit8] Clipper 載入失敗：斜的路只畫路面、人行道不切'); ok(); }; document.head.appendChild(sc); });
  const KMAT = { main: 'asph', sub: 'asph', lane: 'asph', road: 'asph', old: 'gran', olane: 'gran', dirt: 'soil', arcade: 'pav' };
  const PRI = ['asph', 'gran', 'soil', 'pav'];
  const SC = 100, CHUNK = 96;
  const L = () => window.ClipperLib;
  const toC = pts => pts.map(p => ({ X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) }));
  // ---------- 幾何的小工具 ----------
  const segD = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], LL = dx * dx + dz * dz, t = LL ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / LL)) : 0; return Math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t); };
  const lineD = (ln, x, z) => { if (x < ln.bb[0] - 60 || x > ln.bb[2] + 60 || z < ln.bb[1] - 60 || z > ln.bb[3] + 60) return 1e9; let d = 1e9; for (let i = 1; i < ln.pts.length; i++) d = Math.min(d, segD(x, z, ln.pts[i - 1], ln.pts[i])); return d; };
  const bbOf = pts => [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
  CK.streetDist = (x, z, lines) => { lines = lines || (W.town && W.town.D && W.town.D.lines) || []; let best = null, bd = 1e9; lines.forEach(ln => { const d = lineD(ln, x, z); if (d < bd) { bd = d; best = ln; } }); return [best, bd]; };
  // 沿著折線走：每 step 公尺一個點 [x, z, ux, uz, s]
  const walkLine = (pts, step) => { const out = []; let s = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 1e-6) continue; const ux = dx / len, uz = dz / len; for (let t = (i === 1 ? 0 : step - ((s) % step || step)); t <= len; t += step) out.push([a[0] + ux * t, a[1] + uz * t, ux, uz, s + t]); s += len; } return out; };

  // ---------- B.street ----------
  const eb0 = CK.extendBuilder;
  CK.extendBuilder = B => {
    if (eb0) eb0(B);
    B.D.lines = B.D.lines || [];
    B.street = (pts, o) => {
      o = o || {}; const kind = o.kind || 'road', ln = { pts: pts.map(p => B.toWorld(p[0], p[1])), w: o.w || 7, sw: o.sw == null ? 3 : o.sw, kind, name: o.name || '', line: o.line || (o.sw ? 'w' : 'none'), zebra: o.zebra !== false && (kind === 'main' || kind === 'sub'), mat: o.mat || KMAT[kind] || 'asph', round: !!o.round, cars: o.cars !== false && kind !== 'arcade' && kind !== 'olane' };
      ln.bb = bbOf(ln.pts); B.D.lines.push(ln); return ln;
    };
  };

  // ---------- 多邊形 → 形狀、高度、立面 ----------
  const exOf = tree => (tree ? L().JS.PolyTreeToExPolygons(tree) : []);
  const op = (subj, clip, type) => { const C = L(), c = new C.Clipper(); if (subj && subj.length) c.AddPaths(subj, C.PolyType.ptSubject, true); if (clip && clip.length) c.AddPaths(clip, C.PolyType.ptClip, true); const t = new C.PolyTree(); c.Execute(type, t, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero); return t; };
  const pathsOfTree = tree => { const C = L(); return C.Clipper.PolyTreeToPaths(tree); };
  const offOpen = (pts, d, round) => { const C = L(), co = new C.ClipperOffset(2, 12); co.AddPath(toC(pts), round ? C.JoinType.jtRound : C.JoinType.jtMiter, C.EndType.etOpenButt); const out = new C.Paths(); co.Execute(out, d * SC); return out; };
  const rectP = r => [[{ X: r[0] * SC, Y: r[1] * SC }, { X: r[2] * SC, Y: r[1] * SC }, { X: r[2] * SC, Y: r[3] * SC }, { X: r[0] * SC, Y: r[3] * SC }]];
  const polyP = poly => [toC(poly)];
  const pip = (x, z, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a.Y > z) !== (b.Y > z) && x < (b.X - a.X) * (z - a.Y) / (b.Y - a.Y) + a.X) c = !c; } return c; };
  const inEx = (ex, x, z) => { x *= SC; z *= SC; return ex.some(e => pip(x, z, e.outer) && !e.holes.some(h => pip(x, z, h))); };
  const exBB = e => { let x0 = 1e18, z0 = 1e18, x1 = -1e18, z1 = -1e18; e.outer.forEach(p => { x0 = Math.min(x0, p.X); z0 = Math.min(z0, p.Y); x1 = Math.max(x1, p.X); z1 = Math.max(z1, p.Y); }); return [x0 / SC, z0 / SC, x1 / SC, z1 / SC]; };
  // 一塊（外圈＋洞）→ ShapeGeometry（以 (cx, cz) 為原點），加進合併繪製
  const addShape = (Bt, e, mat, y, cx, cz) => {
    const TH = THREE, sh = new TH.Shape(e.outer.map(p => new TH.Vector2(p.X / SC - cx, -(p.Y / SC - cz))));
    e.holes.forEach(h => sh.holes.push(new TH.Path(h.map(p => new TH.Vector2(p.X / SC - cx, -(p.Y / SC - cz))))));
    Bt.add(new TH.ShapeGeometry(sh), mat, cx, y, cz, 1, 1, 1, -Math.PI / 2, 0, 0);
  };
  // 立面（路緣石）：每一條邊從 0 到 h 的一塊，法線朝外（外圈逆時針 → 外面在右手邊；洞反過來）
  const addCurbs = (Bt, ex, mat, h, cx, cz) => {
    const TH = THREE, P = [], N = [];
    // sign＝+1：法線在走向的右手邊 (dz, -dx)；三角形 (a, b, b上) 的正面在左手邊，所以 +1 的時候反過來排
    const ring = (pts, sign) => { const n = pts.length; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], ax = a.X / SC - cx, az = a.Y / SC - cz, bx = b.X / SC - cx, bz = b.Y / SC - cz, dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz); if (len < 0.02) continue; const nx = dz / len * sign, nz = -dx / len * sign; if (sign > 0) P.push(bx, 0, bz, ax, 0, az, ax, h, az, bx, 0, bz, ax, h, az, bx, h, bz); else P.push(ax, 0, az, bx, 0, bz, bx, h, bz, ax, 0, az, bx, h, bz, ax, h, az); for (let k = 0; k < 6; k++) N.push(nx, 0, nz); } };
    const area = pts => { let A = 0; for (let i = 0, n = pts.length; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; A += a.X * b.Y - b.X * a.Y; } return A; };
    // 立面朝人行道的外面：外圈 sign＝面積的正負；洞（裡面是路）反過來
    ex.forEach(e => { ring(e.outer, area(e.outer) > 0 ? 1 : -1); e.holes.forEach(hh => ring(hh, area(hh) > 0 ? -1 : 1)); });
    if (!P.length) return;
    const geo = new TH.BufferGeometry(); geo.setAttribute('position', new TH.BufferAttribute(new Float32Array(P), 3)); geo.setAttribute('normal', new TH.BufferAttribute(new Float32Array(N), 3));
    Bt.add(geo, mat, cx, 0, cz, 1, 1, 1, 0, 0, 0);
  };
  // 照 96 公尺的區塊切開再加（看不到的區塊不畫）
  const addTiled = (Bt, ex, cb) => {
    if (!ex.length) return; const bb = ex.map(exBB).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
    const paths = []; ex.forEach(e => { paths.push(e.outer); e.holes.forEach(h => paths.push(h)); });
    for (let tx = Math.floor((bb[0] + 2000) / CHUNK); tx <= Math.floor((bb[2] + 2000) / CHUNK); tx++) for (let tz = Math.floor((bb[1] + 2000) / CHUNK); tz <= Math.floor((bb[3] + 2000) / CHUNK); tz++) {
      const r = [tx * CHUNK - 2000, tz * CHUNK - 2000, (tx + 1) * CHUNK - 2000, (tz + 1) * CHUNK - 2000], piece = exOf(op(paths, rectP(r), L().ClipType.ctIntersection));
      if (piece.length) cb(piece, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2);
    }
  };
  // 掃描線：一塊（外圈＋洞，奇偶規則）蓋到的高度格子
  const fillEx = (e, f) => {
    const H = CK.HG; if (!H.a) return; const rings = [e.outer].concat(e.holes), bb = exBB(e);
    const j0 = Math.max(0, Math.floor((bb[1] - H.z0) / H.cs)), j1 = Math.min(H.nz - 1, Math.ceil((bb[3] - H.z0) / H.cs));
    for (let j = j0; j <= j1; j++) {
      const z = (H.z0 + (j + 0.5) * H.cs) * SC, xs = [];
      rings.forEach(r => { for (let i = 0, n = r.length, k = n - 1; i < n; k = i++) { const a = r[i], b = r[k]; if ((a.Y > z) !== (b.Y > z)) xs.push(((b.X - a.X) * (z - a.Y) / (b.Y - a.Y) + a.X) / SC); } });
      xs.sort((p, q) => p - q);
      for (let t = 0; t + 1 < xs.length; t += 2) { const i0 = Math.max(0, Math.ceil((xs[t] - H.x0) / H.cs - 0.5)), i1 = Math.min(H.nx - 1, Math.floor((xs[t + 1] - H.x0) / H.cs - 0.5)); for (let i = i0; i <= i1; i++) { const k = j * H.nx + i; H.a[k] = f(k, H.a[k]); } }
    }
  };
  const hgSet = (bb, f) => { const H = CK.HG; if (!H.a) return; const i0 = Math.max(0, Math.floor((bb[0] - H.x0) / H.cs)), i1 = Math.min(H.nx - 1, Math.ceil((bb[2] - H.x0) / H.cs)), j0 = Math.max(0, Math.floor((bb[1] - H.z0) / H.cs)), j1 = Math.min(H.nz - 1, Math.ceil((bb[3] - H.z0) / H.cs)); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = H.x0 + (i + 0.5) * H.cs, z = H.z0 + (j + 0.5) * H.cs, k = j * H.nx + i, v = f(x, z, H.a[k]); if (v != null) H.a[k] = v; } };

  // ---------- 蓋地面（finishGround 裡、人行道的高度之後） ----------
  (CK.groundHooks = CK.groundHooks || []).push(B => {
    const D = B.D, lines = D.lines || []; if (!lines.length) return;
    const Bt = B.Bt, M = CK.M, g = B.g;
    if (!L()) { lines.forEach(ln => { const ws = walkLine(ln.pts, 1); ws.forEach(([x, z, ux, uz]) => Bt.add(g.box, M(ln.mat, { ground: 1 }), x, 0.004, z, ln.w + ln.sw * 2, 0.01, 1.05, 0, Math.atan2(-uz, ux), 0)); }); return; }
    const C = L(), CT = C.ClipType;
    lines.forEach(ln => { ln.cw = offOpen(ln.pts, ln.w / 2, ln.round); ln.cwEx = exOf(op(ln.cw, null, CT.ctUnion)); });
    // 路面：每一種材質合一塊，前面的蓋過後面的
    const surf = {}, all = []; let done = [];
    PRI.concat([...new Set(lines.map(l => l.mat))].filter(m => !PRI.includes(m))).forEach(mat => {
      const ps = []; lines.filter(l => l.mat === mat).forEach(l => l.cw.forEach(p => ps.push(p))); if (!ps.length) return;
      const u = pathsOfTree(op(ps, null, CT.ctUnion)), reg = exOf(op(u, done, CT.ctDifference)); surf[mat] = reg; u.forEach(p => all.push(p)); done = pathsOfTree(op(done.concat(u), null, CT.ctUnion));
    });
    const roadU = done;
    // 人行道：外擴的聯集 − 路面 − 水（橋除外）− 廣場 − 台地
    const outer = []; lines.filter(l => l.sw > 0).forEach(l => offOpen(l.pts, l.w / 2 + l.sw, true).forEach(p => outer.push(p)));
    let cut = roadU.slice(); const water = []; D.water.forEach(w => polyP(w.poly).forEach(p => water.push(p)));
    const bridges = []; D.bridges.forEach(b => rectP(b.r).forEach(p => bridges.push(p)));
    const wet = water.length ? pathsOfTree(op(water, bridges, CT.ctDifference)) : [];
    D.slabs.forEach(s => rectP(s.r).forEach(p => cut.push(p))); D.terr.forEach(t => rectP(t.r).forEach(p => cut.push(p))); wet.forEach(p => cut.push(p));
    (D.walkways || []).forEach(r => rectP(r).forEach(p => cut.push(p)));
    const side = outer.length ? exOf(op(pathsOfTree(op(outer, null, CT.ctUnion)), cut, CT.ctDifference)) : [];
    // 畫
    Object.keys(surf).forEach((mat, i) => addTiled(Bt, surf[mat], (pc, cx, cz) => pc.forEach(e => addShape(Bt, e, M(mat, { ground: 1 }), 0.006 + i * 0.002, cx, cz))));
    const SH = 0.12;
    addTiled(Bt, side, (pc, cx, cz) => { pc.forEach(e => addShape(Bt, e, M('pav', { ground: 1 }), SH + 0.004, cx, cz)); addCurbs(Bt, pc, M('kerb', { side: 1 }), SH + 0.004, cx, cz); });
    // 高度：人行道 0.12（路面 0；橋、台地之後自己會蓋過）
    addTiled(Bt, side, pc => pc.forEach(e => fillEx(e, (k, v) => Math.max(v, SH))));
    D.sideEx = side; D.roadEx = Object.values(surf).reduce((a, b) => a.concat(b), []);
    // 標線、斑馬線
    const carL = lines.filter(l => l.cars), big = l => l.kind === 'main' || l.kind === 'sub';
    lines.forEach(ln => {
      if (ln.w < 6 || ln.line === 'none') return;
      const others = carL.filter(o => o !== ln), samp = walkLine(ln.pts, 0.5);
      const near = (x, z, m) => others.some(o => lineD(o, x, z) < o.w / 2 + m);
      const cm = M(ln.line === 'y' ? 'lineY' : 'lineW'), wm = M('lineW');
      samp.forEach(([x, z, ux, uz, s], k) => {
        if (near(x, z, 4.5)) return;
        const ry = Math.atan2(-uz, ux), nx = -uz, nz = ux;
        if (Math.floor(s / 3) % 2 === 0) Bt.add(g.box, cm, x, 0.014, z, 0.52, 0.004, 0.15, 0, ry, 0);
        [-1, 1].forEach(sd => { const o = sd * (ln.w / 2 - 0.35); Bt.add(g.box, wm, x + nx * o, 0.014, z + nz * o, 0.52, 0.004, 0.12, 0, ry, 0); });
        void k;
      });
      if (!ln.zebra) return;
      // 斑馬線：從別條大路的車道出來 0.6～3.6 公尺
      others.filter(big).forEach(o => {
        let prev = null;
        samp.forEach(p => { const inside = lineD(o, p[0], p[1]) < o.w / 2; if (prev && inside !== prev.inside) { const sd = inside ? -1 : 1, bx = p[0], bz = p[1], ux = p[2], uz = p[3], nx = -uz, nz = ux, ry = Math.atan2(-uz, ux); const cx = bx + ux * sd * 2.1, cz = bz + uz * sd * 2.1; for (let t = -ln.w / 2 + 0.6; t <= ln.w / 2 - 0.6; t += 1.1) Bt.add(g.box, wm, cx + nx * t, 0.015, cz + nz * t, 3.0, 0.004, 0.5, 0, ry, 0); } prev = { inside }; });
      });
    });
  });

  // ---------- 大小地圖 ----------
  (CK.mapBake = CK.mapBake || []).push((x, X, Z, D) => {
    if (!D.lines || !D.lines.length) return;
    const fill = (ex, col) => { x.fillStyle = col; (ex || []).forEach(e => { x.beginPath(); [e.outer].concat(e.holes).forEach(r => r.forEach((p, i) => (i ? x.lineTo(X(p.X / SC), Z(p.Y / SC)) : x.moveTo(X(p.X / SC), Z(p.Y / SC))))); x.fill('evenodd'); }); };
    if (D.sideEx) { fill(D.sideEx, '#DEDAD2'); fill(D.roadEx, '#55585E'); }
    else D.lines.forEach(ln => { x.strokeStyle = '#55585E'; x.lineWidth = ln.w * (X(1) - X(0)); x.lineJoin = 'round'; x.beginPath(); ln.pts.forEach((p, i) => (i ? x.lineTo(X(p[0]), Z(p[1])) : x.moveTo(X(p[0]), Z(p[1])))); x.stroke(); });
    x.strokeStyle = 'rgba(240,236,220,.55)'; x.lineWidth = 1; D.lines.filter(l => l.w >= 6 && l.line !== 'none').forEach(ln => { x.beginPath(); ln.pts.forEach((p, i) => (i ? x.lineTo(X(p[0]), Z(p[1])) : x.moveTo(X(p[0]), Z(p[1])))); x.stroke(); });
  });
})(window.R);
