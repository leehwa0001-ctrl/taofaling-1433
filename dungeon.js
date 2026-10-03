// 討伐令 1433：遺跡的一層（分區的配置、方格地形、3D 場景、碰撞）
// 「層」＝佩特拉核心垂直長出來的空間；「區」＝水平長出來的房間（《遺跡》第一章第二項）
// 五種形式長得不一樣：高塔型是圓形的塔室與懸在深淵上的橋；城區型是街道、房子與廣場；
// 迷宮型是彎來彎去、長滿樹根的窄道；陵墓型是一排排石柱與石棺；浮島型是浮在海上的島與吊橋。
(function (R) {
  const CW = 38, CH = 32, TS = 2, DOOR = 4.4;
  const VOID = 0, FLOOR = 1, WALL = 2, PIT = 3;
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const DIRS = [[0, -1, 'n'], [1, 0, 'e'], [0, 1, 's'], [-1, 0, 'w']];
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  // ---------- 五種形式 ----------
  // shapes：一般房間的形狀；calm：入口、寶箱、通道房；boss：最深處；corr：通道的樣子；pit：深淵的顏色
  R.FORM = {
    tower: { shapes: ['circle', 'ring', 'octagon', 'gear', 'twin', 'hexagon', 'moat', 'ring'],   /* 2026-10-04 作者：高塔型的房間太像——多了齒輪、雙圓、六角、中央平台 */ calm: ['circle', 'octagon', 'hexagon', 'gear'], boss: 'circle', corr: 'bridge', corrW: 2, wallH: [3.6, 4.6], pit: '#2A1640' },
    city: { shapes: ['plaza', 'rect', 'plaza'], calm: 'rect', boss: 'plaza', corr: 'street', corrW: 3, wallH: [3.6, 5.6], facade: 1, big: 1.1, pit: '#08070A' },
    maze: { shapes: ['blob', 'blob', 'circle'], calm: 'blob', boss: 'blob', corr: 'wind', corrW: 2, wallH: [3.0, 4.2], roots: 1, pit: '#08070A' },
    tomb: { shapes: ['hall', 'cross', 'hall'], calm: 'octagon', boss: 'octagon', corr: 'straight', corrW: 2, wallH: [2.9, 3.2], stepped: 1, pit: '#08070A' },
    island: { shapes: ['blob', 'circle', 'blob'], calm: 'circle', boss: 'circle', corr: 'bridge', corrW: 2, edge: 'pit', pit: '#1C5A7A' }
  };
  const inShape = (s, dx, dz, hx, hz, seed) => {
    const nx = dx / hx, nz = dz / hz, ax = Math.abs(nx), az = Math.abs(nz);
    if (s === 'rect') return ax <= 1 && az <= 1 && ax + az <= 1.72;
    if (s === 'octagon') return ax <= 1 && az <= 1 && ax + az <= 1.42;
    if (s === 'circle' || s === 'ring' || s === 'moat') return nx * nx + nz * nz <= 1;
    if (s === 'hexagon') return az <= 0.9 && ax + az * 0.55 <= 1;
    if (s === 'gear') { const r = Math.cos(8 * Math.atan2(nz, nx)) > -0.25 ? 1 : 0.8; return nx * nx + nz * nz <= r * r; }   // 齒輪：一凹一凸（正四個方向是凸的，門接得到）
    if (s === 'twin') { const u = seed % 2 < 1 ? nx : nz, v = seed % 2 < 1 ? nz : nx; return (u - 0.42) * (u - 0.42) + v * v <= 0.38 || (u + 0.42) * (u + 0.42) + v * v <= 0.38; }   // 兩個圓接在一起
    if (s === 'cross') return (ax <= 1 && az <= 0.46) || (ax <= 0.46 && az <= 1);
    if (s === 'hall') return ax <= 1 && az <= 1;
    const a = Math.atan2(nz, nx);
    if (s === 'plaza') { const r = 1.18 + 0.1 * Math.sin(3 * a + seed); return ax <= 1 && az <= 1 && nx * nx + nz * nz <= r * r; }
    const r = 0.84 + 0.12 * Math.sin(3 * a + seed) + 0.07 * Math.sin(5 * a + seed * 2.3);   // blob
    return nx * nx + nz * nz <= r * r;
  };

  // ---------- 配置 ----------
  R.genFloor = (run, f) => {
    const g = run.grade, type = R.TYPES[run.type], form = R.FORM[run.type] || R.FORM.city;
    const last = f === run.floors - 1;
    const n = Math.max(4, Math.min(15, type.rooms(f + 1) + g.lv));
    const rooms = [], at = new Map(), K = (x, y) => x + ',' + y;
    const add = (gx, gy, from) => { const r = { i: rooms.length, gx, gy, links: {}, type: 'fight' }; rooms.push(r); at.set(K(gx, gy), r); if (from) { const d = DIRS.find(d => from.gx + d[0] === gx && from.gy + d[1] === gy); from.links[d[2]] = r.i; r.links[{ n: 's', s: 'n', e: 'w', w: 'e' }[d[2]]] = from.i; } return r; };
    add(0, 0, null);
    let guard = 0;
    while (rooms.length < n && guard++ < 2000) {
      // 迷宮型往尾端長，其他形式隨便長
      const base = run.type === 'maze' && Math.random() < 0.7 ? rooms[rooms.length - 1 - Math.floor(Math.random() * Math.min(3, rooms.length))] : rooms[Math.floor(Math.random() * rooms.length)];
      const d = DIRS[Math.floor(Math.random() * 4)], nx = base.gx + d[0], ny = base.gy + d[1];
      if (at.has(K(nx, ny))) continue;
      const crowd = DIRS.filter(e => at.has(K(nx + e[0], ny + e[1]))).length;
      if (crowd > 1 && Math.random() < 0.8) continue;
      add(nx, ny, base);
    }
    // 偶爾多開一條通道，形成迴圈
    rooms.forEach(r => DIRS.forEach(d => { const o = at.get(K(r.gx + d[0], r.gy + d[1])); if (o && !r.links[d[2]] && Math.random() < (run.type === 'tower' ? 0.12 : 0.24)) { r.links[d[2]] = o.i; o.links[{ n: 's', s: 'n', e: 'w', w: 'e' }[d[2]]] = r.i; } }));
    // 從入口算距離
    const dist = rooms.map(() => 1e9); dist[0] = 0; const q = [0];
    while (q.length) { const i = q.shift(); Object.values(rooms[i].links).forEach(j => { if (dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; q.push(j); } }); }
    rooms.forEach((r, i) => { r.dist = dist[i]; });
    const far = rooms.slice(1).sort((a, b) => b.dist - a.dist);
    rooms[0].type = 'start';
    const end = far[0];
    end.type = last ? (g.boss ? 'boss' : 'deep') : 'stairs';
    const deadEnds = far.filter(r => r !== end && Object.keys(r.links).length === 1);
    const others = far.filter(r => r !== end);
    const nChest = n >= 9 ? 2 : 1;
    (deadEnds.length ? deadEnds : others).slice(0, nChest).forEach(r => { r.type = 'chest'; });
    if (g.pool.includes('kousaku')) { const o = others.find(r => r.type === 'fight'); if (o && n >= 5) o.type = 'ore'; }
    // 克森特級：有「領主體」支配的區（最後一層以外的奇數層）
    if (g.lords && !last && f % 2 === 1) { const o = others.find(r => r.type === 'fight' && r.dist >= 2); if (o) o.type = 'lord'; }
    // 摩爾斯級：獨立的陷阱區；阿彌勒級：部分區域有陷阱
    if (g.traps === 'rooms') others.filter(r => r.type === 'fight').slice(1, f % 2 ? 3 : 2).forEach(r => { r.type = 'trap'; });
    if (g.traps === 'some') rooms.forEach(r => { if (r.type === 'fight' && Math.random() < 0.3) r.traps = 1; });
    // 摩爾斯級最深處：送犬的巢（特殊生態區）
    if (g.nest && last) end.nest = 1;
    // 尺寸、形狀、位置（hx、hz：半寬、半深）
    rooms.forEach(r => {
      const hs = r.type === 'boss' ? [15, 12] : r.type === 'lord' ? [13.5, 11] : r.type === 'start' ? [8, 7] : r.type === 'chest' ? [7.5, 6.5] : r.type === 'deep' ? (r.nest ? [12.5, 10] : [10, 8]) : r.type === 'stairs' ? [9.5, 8] : [rnd(10.5, 15), rnd(8.5, 12)];
      const big = form.big || 1;
      r.hx = Math.min(16.5, hs[0] * big); r.hz = Math.min(13, hs[1] * big);
      r.shape = r.type === 'boss' || r.type === 'lord' ? form.boss : ['start', 'chest', 'stairs', 'deep', 'trap'].includes(r.type) ? (Array.isArray(form.calm) ? pick(form.calm) : form.calm) : pick(form.shapes);
      r.seed = Math.random() * 10;
      r.x = r.gx * CW; r.z = r.gy * CH; r.w = r.hx * 2; r.h = r.hz * 2;
      r.cleared = r.type === 'start' || r.type === 'stairs' || (r.type === 'deep' && !r.nest); r.visited = false;
    });
    // 大廳：有些房間往旁邊空著的格子長出去，變成跨兩格的大空間（高塔型的塔室不長）
    if (run.type !== 'tower') {
      const taken = new Set(), nBig = n >= 8 ? 2 : 1;
      rooms.filter(r => r.type === 'fight' || r.type === 'trap' || r.type === 'ore').sort(() => Math.random() - 0.5).slice(0, nBig).forEach(r => {
        const free = DIRS.filter(d => { const k = K(r.gx + d[0], r.gy + d[1]); return !at.has(k) && !taken.has(k); }); if (!free.length) return;
        const d = pick(free); taken.add(K(r.gx + d[0], r.gy + d[1])); r.big = 1;
        if (d[0]) { r.x += d[0] * CW / 2; r.hx = CW / 2 + rnd(10, 13); r.hz = rnd(10.5, 13); } else { r.z += d[1] * CH / 2; r.hz = CH / 2 + rnd(8, 10.5); r.hx = rnd(12, 15.5); }
        r.shape = pick(['hall', 'plaza', 'rect', 'octagon']); r.w = r.hx * 2; r.h = r.hz * 2;
      });
    }
    const F = { f, rooms, last };
    R.carve(F, run);
    return F;
  };

  // ---------- 方格地形：地板、通道、牆、深淵 ----------
  R.carve = (F, run) => {
    const form = R.FORM[run.type] || R.FORM.city, rooms = F.rooms;
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    rooms.forEach(r => { minX = Math.min(minX, r.x - CW / 2); maxX = Math.max(maxX, r.x + CW / 2); minZ = Math.min(minZ, r.z - CH / 2); maxZ = Math.max(maxZ, r.z + CH / 2); });
    const X0 = Math.floor((minX - 6) / TS) * TS, Z0 = Math.floor((minZ - 6) / TS) * TS;
    const nx = Math.ceil((maxX + 6 - X0) / TS), nz = Math.ceil((maxZ + 6 - Z0) / TS), N = nx * nz;
    const T = new Uint8Array(N), RM = new Int16Array(N).fill(-1), CR = new Int16Array(N).fill(-1);
    const id = (tx, tz) => tz * nx + tx, tX = x => Math.floor((x - X0) / TS), tZ = z => Math.floor((z - Z0) / TS);
    const cX = tx => X0 + (tx + 0.5) * TS, cZ = tz => Z0 + (tz + 0.5) * TS;
    const inside = (tx, tz) => tx >= 1 && tz >= 1 && tx < nx - 1 && tz < nz - 1;
    // 房間
    rooms.forEach(r => {
      r.tiles = [];
      for (let tz = tZ(r.z - r.hz) - 1; tz <= tZ(r.z + r.hz) + 1; tz++) for (let tx = tX(r.x - r.hx) - 1; tx <= tX(r.x + r.hx) + 1; tx++) {
        if (!inside(tx, tz) || !inShape(r.shape, cX(tx) - r.x, cZ(tz) - r.z, r.hx, r.hz, r.seed)) continue;
        const k = id(tx, tz); T[k] = FLOOR; RM[k] = r.i; r.tiles.push(k);
      }
    });
    // 通道：高塔、浮島是懸空的橋；城區是街道；迷宮會轉彎、有死路；陵墓是直的
    const links = []; rooms.forEach(a => ['e', 's'].forEach(d => { const j = a.links[d]; if (j !== undefined) links.push({ a: a.i, b: j, dir: d, bridge: form.corr === 'bridge' }); }));
    const setC = (tx, tz, li) => { if (!inside(tx, tz)) return; const k = id(tx, tz); if (T[k] === FLOOR && RM[k] >= 0) return; T[k] = FLOOR; RM[k] = -1; CR[k] = li; };
    const seg = (x0, z0, x1, z1, w, li) => {
      const lo = -Math.floor(w / 2), hi = lo + w - 1;
      if (z0 === z1) { for (let tx = Math.min(x0, x1); tx <= Math.max(x0, x1); tx++) for (let o = lo; o <= hi; o++) setC(tx, z0 + o, li); }
      else for (let tz = Math.min(z0, z1); tz <= Math.max(z0, z1); tz++) for (let o = lo; o <= hi; o++) setC(x0 + o, tz, li);
    };
    links.forEach((L, li) => {
      const a = rooms[L.a], b = rooms[L.b], w = form.corrW;
      // 兩間房重疊的範圍裡挑一條路（拐彎時兩頭各挑一條）
      const span = (p, q, hp, hq) => { const lo = Math.max(p - hp, q - hq) + 3, hi = Math.min(p + hp, q + hq) - 3; return hi > lo ? [lo, hi] : [p, p]; };
      const jog = form.corr !== 'wind' && form.corr !== 'straight' && Math.random() < 0.45;
      if (L.dir === 'e') {
        const [lo0, hi0] = span(a.z, b.z, a.hz, b.hz), r1 = tZ(form.corr === 'wind' ? (lo0 + hi0) / 2 : rnd(lo0, hi0)), r2 = jog ? tZ(rnd(lo0, hi0)) : r1, row = r1, x0 = tX(a.x), x1 = tX(b.x);
        if (form.corr !== 'wind' && r1 !== r2) { const mx = Math.round((tX(a.x + a.hx) + tX(b.x - b.hx)) / 2); seg(x0, r1, mx, r1, w, li); seg(mx, r1, mx, r2, w, li); seg(mx, r2, x1, r2, w, li); }
        else if (form.corr === 'wind') {
          const lo = tX(a.x + a.hx) + 1, hi = tX(b.x - b.hx) - 2, mid = hi > lo ? rint(lo, hi) : Math.round((x0 + x1) / 2), off = pick([-3, -2, 2, 3]);
          seg(x0, row, mid, row, w, li); seg(mid, row, mid, row + off, w, li); seg(mid, row + off, x1, row + off, w, li); seg(x1, row + off, x1, row, w, li);
          if (Math.random() < 0.45) seg(mid, row, mid, row - Math.sign(off) * rint(3, 4), w, li);
        } else seg(x0, row, x1, row, w, li);
      } else {
        const [lo0, hi0] = span(a.x, b.x, a.hx, b.hx), c1 = tX(form.corr === 'wind' ? (lo0 + hi0) / 2 : rnd(lo0, hi0)), c2 = jog ? tX(rnd(lo0, hi0)) : c1, col = c1, z0 = tZ(a.z), z1 = tZ(b.z);
        if (form.corr !== 'wind' && c1 !== c2) { const mz = Math.round((tZ(a.z + a.hz) + tZ(b.z - b.hz)) / 2); seg(c1, z0, c1, mz, w, li); seg(c1, mz, c2, mz, w, li); seg(c2, mz, c2, z1, w, li); }
        else if (form.corr === 'wind') {
          const lo = tZ(a.z + a.hz) + 1, hi = tZ(b.z - b.hz) - 2, mid = hi > lo ? rint(lo, hi) : Math.round((z0 + z1) / 2), off = pick([-3, -2, 2, 3]);
          seg(col, z0, col, mid, w, li); seg(col, mid, col + off, mid, w, li); seg(col + off, mid, col + off, z1, w, li); seg(col + off, z1, col, z1, w, li);
          if (Math.random() < 0.45) seg(col, mid, col - Math.sign(off) * rint(3, 4), mid, w, li);
        } else seg(col, z0, col, z1, w, li);
      }
    });
    // 岔道：通道旁邊多出一條死路，盡頭是一個小室（高塔、浮島的橋不長）
    if (form.corr !== 'bridge') links.forEach((L, li) => {
      if (Math.random() > 0.35) return;
      const cs = []; for (let k = 0; k < N; k++) if (CR[k] === li) cs.push(k); if (cs.length < 3) return;
      const k0 = cs[Math.floor(cs.length / 2)], tx0 = k0 % nx, tz0 = (k0 - tx0) / nx, dirs = L.dir === 'e' ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]], dd = pick(dirs), dx = dd[0], dz = dd[1], len = rint(3, 6);
      const path = []; for (let i = 2; i <= len + 2; i++) path.push([tx0 + dx * i, tz0 + dz * i]);
      const ex = path[path.length - 1][0], ez = path[path.length - 1][1], room2 = []; for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) room2.push([ex + ox, ez + oz]);
      const clear = path.concat(room2).every(([x, z]) => { for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) { const xx = x + ox, zz = z + oz; if (!inside(xx, zz)) return false; const m = id(xx, zz); if (T[m] !== VOID && CR[m] !== li) return false; } return true; });
      if (!clear) return;
      path.concat(room2).forEach(([x, z]) => setC(x, z, li));
    });
    // 房間裡的結構：柱子、有缺口的隔牆、石塊、L 形的牆（入口、寶箱、樓梯、最深處、領主、核心的房間不放）
    // 只放在離房間邊緣三格以上的地方（門口和繞一圈的路都留著），放完確認整間還是連通的，不通就拿掉
    rooms.forEach(r => {
      if ((run.type === 'tower' && (!['circle', 'octagon', 'hexagon'].includes(r.shape) || Math.random() < 0.5)) || !['fight', 'trap', 'ore'].includes(r.type) || (!r.big && Math.random() < 0.3)) return;   // 高塔：圓、八角、六角的房間一半立柱子
      const set = new Set(r.tiles), depth = new Map(), q = [];
      r.tiles.forEach(k => { const tx = k % nx, tz = (k - tx) / nx; if (N4.some(([dx, dz]) => !set.has(id(tx + dx, tz + dz)))) { depth.set(k, 0); q.push(k); } });
      for (let i = 0; i < q.length; i++) { const k = q[i], tx = k % nx, tz = (k - tx) / nx; N4.forEach(([dx, dz]) => { const m = id(tx + dx, tz + dz); if (set.has(m) && !depth.has(m)) { depth.set(m, depth.get(k) + 1); q.push(m); } }); }
      const ok = (tx, tz) => { const m = id(tx, tz); return set.has(m) && depth.get(m) >= 3; };
      const cx = tX(r.x), cz = tZ(r.z), wall = new Set(), put = (tx, tz) => { if (ok(tx, tz)) wall.add(id(tx, tz)); };
      const kind = run.type === 'tower' ? 'pillars' : run.type === 'tomb' ? pick(['pillars', 'partition']) : run.type === 'city' ? pick(['blocks', 'partition', 'blocks']) : run.type === 'maze' ? pick(['ell', 'ell', 'blocks']) : pick(['pillars', 'blocks', 'ell', 'partition']);
      const kinds = r.big ? [kind, pick(['blocks', 'ell', 'pillars'])] : [kind];
      kinds.forEach(kd => {
        if (kd === 'pillars') { const step = rint(3, 4); for (let tz = cz - 12; tz <= cz + 12; tz += step) for (let tx = cx - 16; tx <= cx + 16; tx += step) if (Math.abs(tx - cx) + Math.abs(tz - cz) > 2) put(tx, tz); }
        else if (kd === 'partition') { const alongX = r.hx >= r.hz, off = rint(-2, 2), gaps = [rint(-6, -2), rint(2, 6)]; for (let i = -18; i <= 18; i++) { if (gaps.some(g2 => Math.abs(i - g2) <= 1)) continue; if (alongX) put(cx + off, cz + i); else put(cx + i, cz + off); } }
        else if (kd === 'blocks') { for (let n2 = 0; n2 < rint(2, 4); n2++) { const bx = cx + rint(-8, 8), bz = cz + rint(-6, 6), w2 = rint(2, 3), h2 = rint(2, 4); for (let z = 0; z < h2; z++) for (let x = 0; x < w2; x++) put(bx + x, bz + z); } }
        else { for (let n2 = 0; n2 < rint(2, 3); n2++) { const bx = cx + rint(-7, 7), bz = cz + rint(-5, 5), sx = pick([-1, 1]), sz = pick([-1, 1]), l1 = rint(3, 5), l2 = rint(2, 4); for (let i = 0; i < l1; i++) put(bx + sx * i, bz); for (let i = 1; i < l2; i++) put(bx, bz + sz * i); } }
      });
      if (!wall.size) return;
      // 連通檢查
      const rest = r.tiles.filter(k => !wall.has(k)); if (!rest.length) return;
      const seen = new Set([rest[0]]), st = [rest[0]];
      while (st.length) { const k = st.pop(), tx = k % nx, tz = (k - tx) / nx; N4.forEach(([dx, dz]) => { const m = id(tx + dx, tz + dz); if (set.has(m) && !wall.has(m) && !seen.has(m)) { seen.add(m); st.push(m); } }); }
      if (seen.size !== rest.length) return;
      const solid = form.edge === 'pit' ? PIT : WALL;
      wall.forEach(k => { T[k] = solid; RM[k] = -1; }); r.tiles = rest; r.inner = wall.size;
    });
    // 高塔的塔室：中間是往下看得到深淵的井；中央平台（moat）：一圈深淵，十字形的四條橋通到中間
    rooms.forEach(r => {
      if (r.shape !== 'ring' && r.shape !== 'moat') return;
      const pit = (dx, dz) => { const d2 = dx * dx + dz * dz; return r.shape === 'ring' ? d2 < 0.17 : d2 > 0.1 && d2 < 0.36 && Math.abs(dx) > 0.17 && Math.abs(dz) > 0.17; /* 橋寬：最小的房間也有一格以上（格子 2 公尺） */ };
      r.tiles = r.tiles.filter(k => { const tx = k % nx, tz = (k - tx) / nx, dx = (cX(tx) - r.x) / r.hx, dz = (cZ(tz) - r.z) / r.hz; if (pit(dx, dz)) { T[k] = PIT; RM[k] = -1; return false; } return true; });
    });
    // 牆與深淵：地板旁邊的空格，一般是牆；橋的兩邊、浮島的邊緣是深淵
    for (let tz = 0; tz < nz; tz++) for (let tx = 0; tx < nx; tx++) {
      const k = id(tx, tz); if (T[k] !== VOID) continue;
      let room = false, corr = false, bridge = false;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue; const x = tx + dx, z = tz + dz; if (x < 0 || z < 0 || x >= nx || z >= nz) continue;
        const m = id(x, z); if (T[m] !== FLOOR) continue;
        if (RM[m] >= 0) room = true; else if (links[CR[m]] && links[CR[m]].bridge) bridge = true; else corr = true;
      }
      if (!room && !corr && !bridge) continue;
      T[k] = form.edge === 'pit' || (bridge && !room && !corr) ? PIT : WALL;
    }
    // 每個房間的門口（通道接進房間的那幾格）：鎖門時在這裡張膜
    rooms.forEach(r => {
      const doors = new Set();
      r.tiles.forEach(k => { const tx = k % nx, tz = (k - tx) / nx; N4.forEach(([dx, dz]) => { const m = id(tx + dx, tz + dz); if (T[m] === FLOOR && RM[m] < 0) doors.add(m); }); });
      r.doors = [...doors];
    });
    F.links = links;
    F.tile = { X0, Z0, nx, nz, TS, T, RM, CR, id, tX, tZ, cX, cZ };
  };

  // ---------- 方格查詢 ----------
  const TL = () => R.W && R.W.F && R.W.F.tile;
  R.tileKind = (x, z) => { const t = TL(); if (!t) return FLOOR; const tx = Math.floor((x - t.X0) / TS), tz = Math.floor((z - t.Z0) / TS); if (tx < 0 || tz < 0 || tx >= t.nx || tz >= t.nz) return VOID; return t.T[tz * t.nx + tx]; };
  R.isFloor = (x, z) => R.tileKind(x, z) === FLOOR;
  R.roomIndexAt = (x, z) => { const t = TL(); if (!t) return -1; const tx = Math.floor((x - t.X0) / TS), tz = Math.floor((z - t.Z0) / TS); if (tx < 0 || tz < 0 || tx >= t.nx || tz >= t.nz) return -1; const k = tz * t.nx + tx; return t.T[k] === FLOOR ? t.RM[k] : -1; };
  // 最近的一格地板（跳躍、瞬移、掉落物用）
  R.nearestFloor = (x, z) => {
    const t = TL(); if (!t || R.isFloor(x, z)) return [x, z];
    const tx0 = Math.floor((x - t.X0) / TS), tz0 = Math.floor((z - t.Z0) / TS);
    for (let rad = 1; rad <= 8; rad++) {
      let best = null, bd = 1e9;
      for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== rad) continue;
        const tx = tx0 + dx, tz = tz0 + dz; if (tx < 0 || tz < 0 || tx >= t.nx || tz >= t.nz || t.T[tz * t.nx + tx] !== FLOOR) continue;
        const cx = t.cX(tx), cz = t.cZ(tz), d = Math.hypot(cx - x, cz - z); if (d < bd) { bd = d; best = [cx, cz]; }
      }
      if (best) return best;
    }
    return [x, z];
  };
  // 房間裡隨機的一個點：edge＝靠牆；away＋min＝離某個東西遠一點
  R.roomPoint = (r, o) => {
    o = o || {}; const t = TL();
    if (!t || !r.tiles || !r.tiles.length) return [r.x, r.z];
    for (let i = 0; i < 60; i++) {
      const k = pick(r.tiles), tx = k % t.nx, tz = (k - tx) / t.nx;
      if (o.edge && !N4.some(([dx, dz]) => t.T[t.id(tx + dx, tz + dz)] !== FLOOR)) continue;
      if (!o.edge && i < 40 && N4.some(([dx, dz]) => t.T[t.id(tx + dx, tz + dz)] !== FLOOR)) continue;
      const x = t.cX(tx) + rnd(-0.4, 0.4), z = t.cZ(tz) + rnd(-0.4, 0.4);
      if (o.away && Math.hypot(x - o.away.x, z - o.away.z) < (o.min || 5)) continue;
      if (R.pointBlocked(x, z)) continue;
      return [x, z];
    }
    return R.nearestFloor(r.x, r.z);
  };
  // 房間邊緣的格子（往房間中心推的時候用）
  R.roomEdgeTiles = r => { const t = TL(); return r.tiles.filter(k => { const tx = k % t.nx, tz = (k - tx) / t.nx; return N4.some(([dx, dz]) => t.T[t.id(tx + dx, tz + dz)] === WALL || t.T[t.id(tx + dx, tz + dz)] === PIT); }).map(k => { const tx = k % t.nx, tz = (k - tx) / t.nx; return [t.cX(tx), t.cZ(tz)]; }); };

  // ---------- 碰撞 ----------
  const GRID = 12;
  R.col = { list: [], cells: new Map() };
  R.addBox = (x0, x1, z0, z1, tag, ref) => {
    const c = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), tag, ref, on: true };
    R.col.list.push(c);
    for (let gx = Math.floor(c.x0 / GRID); gx <= Math.floor(c.x1 / GRID); gx++) for (let gz = Math.floor(c.z0 / GRID); gz <= Math.floor(c.z1 / GRID); gz++) {
      const k = gx + ',' + gz; if (!R.col.cells.has(k)) R.col.cells.set(k, []); R.col.cells.get(k).push(c);
    }
    return c;
  };
  R.boxesNear = (x, z) => {
    const out = new Set();
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) (R.col.cells.get((Math.floor(x / GRID) + dx) + ',' + (Math.floor(z / GRID) + dz)) || []).forEach(c => { if (c.on) out.add(c); });
    return out;
  };
  // 圓（半徑 r）推出方塊；回傳是否被夾住（推不出去）
  R.collide = (p, r) => {
    let pinched = false;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const c of R.boxesNear(p.x, p.z)) {
        const cx = Math.max(c.x0, Math.min(p.x, c.x1)), cz = Math.max(c.z0, Math.min(p.z, c.z1));
        const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        moved = true;
        if (d2 > 1e-8) { const d = Math.sqrt(d2), push = r - d; p.x += dx / d * push; p.z += dz / d * push; }
        else { const o = [[p.x - c.x0 + r, -1, 0], [c.x1 - p.x + r, 1, 0], [p.z - c.z0 + r, 0, -1], [c.z1 - p.z + r, 0, 1]].sort((a, b) => a[0] - b[0])[0]; p.x += o[1] * o[0]; p.z += o[2] * o[0]; }
      }
      if (!moved) break;
      if (pass === 2) pinched = true;
    }
    return pinched;
  };
  // 擋得住子彈的東西（深淵擋人不擋子彈）
  R.pointBlocked = (x, z) => { for (const c of R.boxesNear(x, z)) if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && c.tag !== 'prop-low' && c.tag !== 'pit') return c; return null; };

  // ---------- 3D 場景 ----------
  const T = () => THREE;
  const mats = {};
  const lam = (c, o) => { const k = c + JSON.stringify(o || {}); if (!mats[k]) { mats[k] = new (T().MeshLambertMaterial)(Object.assign({ color: c }, o || {})); mats[k].userData.shared = true; } return mats[k]; };
  R.theme = run => { const base = Object.assign({}, R.THEMES[run.grade.id]); if (run.env) { const e = R.ENVS[run.env]; Object.assign(base, { floor: e.floor, wall: e.wall, top: e.wall, light: e.light, fog: e.fog, accent: e.light }); } return base; };
  R.buildFloor = (scene, run, F) => {
    const TH = T(), th = R.theme(run), form = R.FORM[run.type] || R.FORM.city, group = new TH.Group(), env = run.env;
    R.col = { list: [], cells: new Map() };
    F.props = []; F.chests = []; F.eyes = []; F.fx = []; F.traps = []; F.up = null; F.coreView = null;
    const t = F.tile, { nx, nz, T: TT, RM, CR, id, cX, cZ } = t, N = nx * nz;
    const unit = new TH.BoxGeometry(1, 1, 1), m4 = new TH.Matrix4(), q0 = new TH.Quaternion(), pos = new TH.Vector3(), scl = new TH.Vector3(), col = new TH.Color();
    const place = (mesh, i, x, y, z, sx, sy, sz, c) => { pos.set(x, y, z); scl.set(sx, sy, sz); m4.compose(pos, q0, scl); mesh.setMatrixAt(i, m4); if (c) mesh.setColorAt(i, c); };
    const bx = (w, h, d, m, x, y, z, parent) => { const o = new TH.Mesh(new TH.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; (parent || group).add(o); return o; };
    const kxz = k => { const tx = k % nx; return [tx, (k - tx) / nx]; };
    const is = (tx, tz, kind) => tx >= 0 && tz >= 0 && tx < nx && tz < nz && TT[id(tx, tz)] === kind;
    const isBridge = k => CR[k] >= 0 && F.links[CR[k]] && F.links[CR[k]].bridge;

    // --- 地板（靠深淵的格子做成懸崖，看得出高度） ---
    const floors = [];
    for (let k = 0; k < N; k++) if (TT[k] === FLOOR) floors.push(k);
    const base = new TH.Color(th.floor), moss = new TH.Color('#3E5A34'), snowC = new TH.Color('#EEF4FA'), ash = new TH.Color('#4A2418'), wood = new TH.Color('#6A4A2E');
    const floorMesh = new TH.InstancedMesh(unit, lam('#FFFFFF'), floors.length);
    floors.forEach((k, i) => {
      const [tx, tz] = kxz(k), cliff = N4.some(([dx, dz]) => is(tx + dx, tz + dz, PIT)), ri = RM[k];
      col.copy(base);
      if (isBridge(k)) col.copy(wood).offsetHSL(0, 0, ((form.corr === 'bridge' && (F.links[CR[k]].dir === 'e' ? tx : tz) % 2) ? 0.03 : -0.02) + (hash(tx, tz) - 0.5) * 0.04);
      else if (form.corr === 'street' && ri < 0) col.offsetHSL(0, -0.06, -0.07 + (hash(tx, tz) - 0.5) * 0.05);
      else if (run.type === 'tomb') col.offsetHSL(0, 0, ((tx + tz) % 2 ? 0.035 : -0.03) + (hash(tx, tz) - 0.5) * 0.02);
      else if (run.type === 'tower' && ri >= 0) { const r = F.rooms[ri], d = Math.hypot(cX(tx) - r.x, cZ(tz) - r.z); col.offsetHSL(0, 0, Math.floor(d / 2.6) % 2 ? 0.04 : -0.02); }
      else if (run.type === 'maze') { col.lerp(moss, Math.max(0, noise(tx * 0.3, tz * 0.3) - 0.5) * 1.3); col.offsetHSL(0, 0, (hash(tx, tz) - 0.5) * 0.05); }
      else col.offsetHSL(0, 0, (hash(tx, tz) - 0.5) * 0.06);
      if (env === 'snow' && noise(tx * 0.25 + 3, tz * 0.25) > 0.6) col.lerp(snowC, 0.55);
      if (env === 'volcano' && noise(tx * 0.3, tz * 0.3 + 5) > 0.66) col.lerp(ash, 0.6);
      place(floorMesh, i, cX(tx), cliff ? -3.5 : -0.2, cZ(tz), TS, cliff ? 7 : 0.4, TS, col);
    });
    if (R.pixelOn && R.pixelOn()) floorMesh.material = R.pixMat('floor');
    floorMesh.receiveShadow = true; group.add(floorMesh);

    // --- 深淵（高塔的井、橋下、浮島外面的海；火山是熔岩） ---
    const pitCol = env === 'volcano' ? '#FF5A1A' : env === 'deep' ? '#0E2A3A' : form.pit;
    const abyss = new TH.Mesh(new TH.PlaneGeometry(nx * TS + 60, nz * TS + 60), new TH.MeshBasicMaterial({ color: pitCol }));
    abyss.rotation.x = -Math.PI / 2; abyss.position.set(t.X0 + nx * TS / 2, -9, t.Z0 + nz * TS / 2); group.add(abyss);
    if (run.type === 'island' || run.type === 'tower' || env === 'volcano') {
      // 深淵底下的光：浮島是海面的反光，高塔是佩特拉的光，火山是熔岩
      const glow = new TH.Mesh(new TH.PlaneGeometry(nx * TS + 60, nz * TS + 60), new TH.MeshBasicMaterial({ color: env === 'volcano' ? '#FFB050' : run.type === 'island' ? '#5FC8E0' : th.accent, transparent: true, opacity: run.type === 'tower' ? 0.3 : 0.14, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(abyss.position.x, -6, abyss.position.z); group.add(glow); F.pitGlow = glow;
    }

    // --- 牆（城區是一排排房子，陵墓是階梯狀的頂） ---
    const walls = []; for (let k = 0; k < N; k++) if (TT[k] === WALL) walls.push(k);
    const body = new TH.InstancedMesh(unit, lam('#FFFFFF'), walls.length), cap = new TH.InstancedMesh(unit, lam('#FFFFFF'), walls.length);
    const cap2 = form.stepped ? new TH.InstancedMesh(unit, lam('#FFFFFF'), walls.length) : null;
    const wins = []; const wallC = new TH.Color(th.wall), topC = new TH.Color(th.top), plaster = new TH.Color('#D8CBAE'), timber = new TH.Color('#7A5236'), roofs = ['#3A3440', '#5A2A24', '#2E3A48'].map(c => new TH.Color(c));
    F.wallAt = new Int32Array(N).fill(-1); F.wallH = new Float32Array(walls.length); F.wallFacade = new Uint8Array(walls.length); F.wallTile = new Int32Array(walls.length);
    walls.forEach((k, i) => {
      const [tx, tz] = kxz(k);
      const street = form.facade && N4.some(([dx, dz]) => { const m = id(tx + dx, tz + dz); return is(tx + dx, tz + dz, FLOOR) && RM[m] < 0; });
      const plaza = form.facade && !street && N4.some(([dx, dz]) => is(tx + dx, tz + dz, FLOOR));
      let h = form.wallH[0] + (form.wallH[1] - form.wallH[0]) * noise(tx * 0.35, tz * 0.35);
      if (street || plaza) h += Math.floor(hash(Math.floor(tx / 2), Math.floor(tz / 2)) * 3) * 0.6;   // 房子高高低低
      F.wallAt[k] = i; F.wallTile[i] = k; F.wallH[i] = h; F.wallFacade[i] = street || plaza ? 1 : 0;
      if (street || plaza) col.copy(hash(Math.floor(tx / 2) + 7, Math.floor(tz / 2)) < 0.35 ? timber : plaster).offsetHSL(0, 0, (hash(tx, tz) - 0.5) * 0.06);
      else { col.copy(wallC).offsetHSL(0, 0, (hash(tx, tz) - 0.5) * 0.07); if (form.roots) col.lerp(moss, Math.max(0, noise(tx * 0.4 + 9, tz * 0.4) - 0.55)); }
      place(body, i, cX(tx), h / 2, cZ(tz), TS, h, TS, col);
      if (street || plaza) place(cap, i, cX(tx), h + 0.2, cZ(tz), TS + 0.5, 0.4, TS + 0.5, roofs[Math.floor(hash(Math.floor(tx / 3), Math.floor(tz / 3)) * 3)]);
      else place(cap, i, cX(tx), h + 0.09, cZ(tz), TS + 0.12, 0.18, TS + 0.12, col.copy(topC).offsetHSL(0, 0, (hash(tz, tx) - 0.5) * 0.05));
      if (cap2) place(cap2, i, cX(tx), h + 0.36, cZ(tz), TS - 0.5, 0.36, TS - 0.5, col.copy(topC).offsetHSL(0, 0, -0.04));
      // 城區：朝街道的那一面有亮著的窗
      if (street) N4.forEach(([dx, dz]) => { const m = id(tx + dx, tz + dz); if (is(tx + dx, tz + dz, FLOOR) && RM[m] < 0 && hash(tx * 3 + dx, tz * 3 + dz) < 0.55) wins.push({ i, x: cX(tx) + dx * (TS / 2 + 0.04), z: cZ(tz) + dz * (TS / 2 + 0.04), y: Math.min(h - 0.8, 2.3), rot: dx ? Math.PI / 2 : 0 }); });
    });
    if (R.pixelOn && R.pixelOn()) { body.material = R.pixMat('wall'); cap.material = R.pixMat('cap'); if (cap2) cap2.material = cap.material; }
    [body, cap, cap2].forEach(m => { if (!m) return; m.castShadow = true; m.receiveShadow = true; group.add(m); });
    F.wallMeshes = [body, cap, cap2].filter(Boolean);
    // 擋住人物時換上的半透明牆（平常縮成 0）
    const ghostMat = new TH.MeshLambertMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.2, depthWrite: false }), zeroM = new TH.Matrix4().makeScale(0, 0, 0);
    F.ghosts = F.wallMeshes.map(src => { const gm = new TH.InstancedMesh(unit, ghostMat, src.count); for (let i = 0; i < src.count; i++) { gm.setMatrixAt(i, zeroM); if (src.instanceColor) { src.getColorAt(i, col); gm.setColorAt(i, col); } } gm.frustumCulled = false; group.add(gm); return gm; });
    [floorMesh, ...F.wallMeshes].forEach(m => { m.frustumCulled = false; });
    if (wins.length) {
      const wm = new TH.InstancedMesh(new TH.BoxGeometry(0.8, 0.9, 0.06), new TH.MeshBasicMaterial({ color: '#FFD08A' }), wins.length);
      const e = new TH.Euler();
      wins.forEach((w, j) => { e.set(0, w.rot, 0); pos.set(w.x, w.y, w.z); scl.set(1, 1, 1); m4.compose(pos, new TH.Quaternion().setFromEuler(e), scl); wm.setMatrixAt(j, m4); });
      group.add(wm); F.winMesh = wm; F.wins = wins;
    }

    // --- 碰撞：同一列連在一起的牆、深淵合成一個方塊 ---
    for (let tz = 0; tz < nz; tz++) {
      let tx = 0;
      while (tx < nx) {
        const kind = TT[id(tx, tz)];
        if (kind !== WALL && kind !== PIT) { tx++; continue; }
        let e = tx; while (e + 1 < nx && TT[id(e + 1, tz)] === kind) e++;
        R.addBox(t.X0 + tx * TS, t.X0 + (e + 1) * TS, t.Z0 + tz * TS, t.Z0 + (tz + 1) * TS, kind === WALL ? 'wall' : 'pit');
        tx = e + 1;
      }
    }

    // --- 目目連：牆上朝房間那一面的眼睛 ---
    const eyeSpots = [];
    walls.forEach(k => { const [tx, tz] = kxz(k); N4.forEach(([dx, dz]) => { const m = id(tx + dx, tz + dz); if (is(tx + dx, tz + dz, FLOOR) && RM[m] >= 0) eyeSpots.push({ x: cX(tx) + dx * (TS / 2 + 0.06), z: cZ(tz) + dz * (TS / 2 + 0.06), rot: Math.atan2(dx, dz) }); }); });
    eyeSpots.sort(() => Math.random() - 0.5).slice(0, Math.min(36, Math.ceil(eyeSpots.length * 0.12))).forEach(e => F.eyes.push(e));
    const eyeMat = new TH.MeshBasicMaterial({ color: '#F4E9DC' }), irisMat = new TH.MeshBasicMaterial({ color: '#8A1A2A' });
    F.eyes.forEach(e => {
      const g2 = new TH.Group(); const white = new TH.Mesh(new TH.SphereGeometry(0.34, 10, 6), eyeMat); white.scale.set(1.5, 1, 0.3); g2.add(white);
      const iris = new TH.Mesh(new TH.SphereGeometry(0.17, 8, 6), irisMat); iris.position.z = 0.08; iris.scale.z = 0.3; g2.add(iris);
      g2.position.set(e.x, 1.1 + Math.random() * 1.2, e.z); g2.rotation.y = e.rot;
      g2.scale.y = 0.02; g2.visible = false; e.mesh = g2; e.iris = iris; group.add(g2);
    });

    // --- 裝飾：昭旭的東西與佩特拉的痕跡 ---
    const M = { stone: lam('#8C8A82'), stoneD: lam('#5C5A54'), red: lam('#C23A30'), black: lam('#1E1818'), straw: lam('#C8A860'), white: lam('#F4F0E6'), wood: lam('#6A4A2E'), woodD: lam('#4A3222'),
      glow: lam('#FFD9A0', { emissive: '#FFB050', emissiveIntensity: 0.9 }), paper: lam('#E04A3A', { emissive: '#A02818', emissiveIntensity: 0.7 }), root: lam('#4A3424'), bib: lam('#C8323A') };
    F.veinMat = new TH.MeshBasicMaterial({ color: th.accent, transparent: true, opacity: 0.2, depthWrite: false });
    const block = (x, z, r, tag) => R.addBox(x - r, x + r, z - r, z + r, tag || 'deco');
    const toro = (x, z) => {   // 石燈籠
      const g = new TH.Group(); bx(0.8, 0.25, 0.8, M.stone, 0, 0.125, 0, g); bx(0.3, 0.9, 0.3, M.stone, 0, 0.7, 0, g); bx(0.72, 0.16, 0.72, M.stone, 0, 1.22, 0, g); bx(0.46, 0.42, 0.46, M.glow, 0, 1.5, 0, g);
      const roof = new TH.Mesh(new TH.ConeGeometry(0.62, 0.42, 4), M.stoneD); roof.position.y = 1.92; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof); bx(0.12, 0.16, 0.12, M.stoneD, 0, 2.2, 0, g);
      g.position.set(x, 0, z); group.add(g); block(x, z, 0.4);
    };
    const torii = (x, z, alongX, wid) => {   // 鳥居：柱子立在通道兩側
      const g = new TH.Group(), hw = wid / 2 + 0.25;
      [-hw, hw].forEach(o => { const p = new TH.Mesh(new TH.CylinderGeometry(0.17, 0.21, 3.5, 8), M.red); p.position.set(o, 1.75, 0); p.castShadow = true; g.add(p); });
      bx(wid + 2, 0.24, 0.36, M.black, 0, 3.62, 0, g); bx(wid + 1.6, 0.22, 0.3, M.red, 0, 3.4, 0, g); bx(wid + 0.9, 0.16, 0.22, M.red, 0, 2.86, 0, g); bx(0.16, 0.4, 0.16, M.red, 0, 3.12, 0, g);
      g.position.set(x, 0, z); g.rotation.y = alongX ? Math.PI / 2 : 0; group.add(g);
      [-hw, hw].forEach(o => { const px = alongX ? x : x + o, pz = alongX ? z + o : z; block(px, pz, 0.25); });
    };
    const shimenawa = (x, z, alongX, wid, y) => {   // 注連繩與紙垂
      const g = new TH.Group(), rope = new TH.Mesh(new TH.CylinderGeometry(0.13, 0.13, wid + 0.6, 8), M.straw); rope.rotation.z = Math.PI / 2; g.add(rope);
      for (let i = 0; i < 4; i++) { const sx = -wid / 2 + (i + 0.5) * wid / 4; for (let j = 0; j < 3; j++) bx(0.16, 0.2, 0.02, M.white, sx + (j % 2 ? 0.08 : -0.02), -0.25 - j * 0.2, 0, g); }
      g.position.set(x, y || 3.1, z); g.rotation.y = alongX ? Math.PI / 2 : 0; group.add(g);
    };
    const jizo = (x, z) => {   // 地藏
      const g = new TH.Group(), b = new TH.Mesh(new TH.CylinderGeometry(0.24, 0.3, 0.7, 8), M.stone); b.position.y = 0.35; b.castShadow = true; g.add(b);
      const hd = new TH.Mesh(new TH.SphereGeometry(0.2, 8, 6), M.stone); hd.position.y = 0.86; g.add(hd); bx(0.4, 0.22, 0.1, M.bib, 0, 0.58, 0.22, g);
      g.position.set(x, 0, z); g.rotation.y = Math.random() * Math.PI; group.add(g); block(x, z, 0.3);
    };
    const lantern = (x, z) => {   // 街上的紅提燈
      bx(0.12, 2.8, 0.12, M.woodD, x, 1.4, z); bx(0.9, 0.08, 0.08, M.woodD, x + 0.4, 2.7, z);
      const l = new TH.Mesh(new TH.CylinderGeometry(0.26, 0.26, 0.5, 10), M.paper); l.position.set(x + 0.75, 2.3, z); group.add(l); block(x, z, 0.12);
    };
    const coffin = (x, z, alongX) => { const w = alongX ? 2.4 : 1.2, d = alongX ? 1.2 : 2.4; bx(w, 0.8, d, M.stone, x, 0.4, z); bx(w + 0.15, 0.18, d + 0.15, M.stoneD, x, 0.89, z); R.addBox(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'deco'); };
    const pillar = (x, z, round) => {
      if (round) { const p = new TH.Mesh(new TH.CylinderGeometry(0.55, 0.6, 3.2, 10), lam(th.wall)); p.position.set(x, 1.6, z); p.castShadow = true; p.receiveShadow = true; group.add(p); bx(1.4, 0.3, 1.4, lam(th.top), x, 3.25, z); }
      else { bx(1.4, 3, 1.4, lam(th.wall), x, 1.5, z); bx(1.7, 0.3, 1.7, lam(th.top), x, 3.05, z); }
      R.addBox(x - 0.7, x + 0.7, z - 0.7, z + 0.7, 'pillar');
    };
    const root = (x, z, rot) => {   // 迷宮牆上垂下來的樹根
      const pts = []; for (let i = 0; i < 5; i++) pts.push(new TH.Vector3(Math.sin(i * 1.3) * 0.3, 3.4 - i * 0.8, -0.2 + i * 0.35));
      const m = new TH.Mesh(new TH.TubeGeometry(new TH.CatmullRomCurve3(pts), 12, 0.12, 5, false), M.root); m.position.set(x, 0, z); m.rotation.y = rot; m.castShadow = true; group.add(m);
    };
    const rock = (x, z, s) => { const m = new TH.Mesh(new TH.DodecahedronGeometry(s, 0), lam(th.wall)); m.position.set(x, s * 0.5, z); m.rotation.set(Math.random(), Math.random(), 0); m.castShadow = true; group.add(m); block(x, z, s * 0.7); };
    const vein = (x, z, a, len) => { const m = new TH.Mesh(new TH.BoxGeometry(0.14, 0.02, len), F.veinMat); m.position.set(x + Math.sin(a) * len / 2, 0.02, z + Math.cos(a) * len / 2); m.rotation.y = a; group.add(m); };
    const sigil = (x, z) => {   // 最深處地上的眼睛紋樣
      const m = F.veinMat, g = new TH.Group();
      const ring = new TH.Mesh(new TH.RingGeometry(4.2, 4.5, 48), m); ring.rotation.x = -Math.PI / 2; g.add(ring);
      const iris = new TH.Mesh(new TH.RingGeometry(1.2, 1.6, 32), m); iris.rotation.x = -Math.PI / 2; g.add(iris);
      const lid = new TH.Mesh(new TH.RingGeometry(3.2, 3.4, 40, 1, 0.35, Math.PI - 0.7), m); lid.rotation.x = -Math.PI / 2; g.add(lid);
      const lid2 = lid.clone(); lid2.rotation.z = Math.PI; g.add(lid2);
      g.position.set(x, 0.03, z); group.add(g);
    };
    const doorOf = (r, li) => { const L = F.links[li], ks = r.doors.filter(k => CR[k] === li); if (!ks.length) return null; let sx = 0, sz = 0; ks.forEach(k => { const [tx, tz] = kxz(k); sx += cX(tx); sz += cZ(tz); }); return { x: sx / ks.length, z: sz / ks.length, alongX: L.dir === 'e', n: ks.length }; };
    const linkIdx = (r, o) => F.links.findIndex(L => (L.a === r.i && L.b === o) || (L.b === r.i && L.a === o));
    const freeAt = (x, z, rad) => R.isFloorLocal(t, x, z) && ![...R.boxesNear(x, z)].some(c => x + rad > c.x0 && x - rad < c.x1 && z + rad > c.z0 && z - rad < c.z1);
    const spot = (r, o) => {   // 房間裡放東西的位置
      o = o || {};
      for (let i = 0; i < 50; i++) {
        const k = pick(r.tiles), [tx, tz] = kxz(k), nearWall = N4.some(([dx, dz]) => !is(tx + dx, tz + dz, FLOOR));
        if (o.wall && !nearWall) continue; if (!o.wall && nearWall && i < 35) continue;
        const x = cX(tx) + rnd(-0.3, 0.3), z = cZ(tz) + rnd(-0.3, 0.3);
        if (Math.hypot(x - r.x, z - r.z) < (o.clear || 3)) continue;
        if (r.doors.some(d => { const [dx2, dz2] = kxz(d); return Math.hypot(cX(dx2) - x, cZ(dz2) - z) < 3; })) continue;
        if (!freeAt(x, z, o.rad || 0.6)) continue;
        return [x, z];
      }
      return null;
    };

    F.rooms.forEach(r => {
      // 佩特拉的脈絡：從房間中心往外長的發光紋路，注意越高越亮
      const nv = run.grade.lv >= 3 ? 7 : 4;
      for (let i = 0; i < nv; i++) { const a = Math.random() * Math.PI * 2, d0 = rnd(1.5, 3), len = rnd(2.5, Math.min(r.hx, r.hz) - d0); if (len > 1) vein(r.x + Math.sin(a) * d0, r.z + Math.cos(a) * d0, a + rnd(-0.3, 0.3), len); }
      // 鳥居：最深處與樓層通道的房間，每個門口一座
      if (r.type === 'boss' || r.type === 'stairs' || r.type === 'deep') Object.values(r.links).forEach(o => { const d = doorOf(r, linkIdx(r, o)); if (!d) return; const sx = d.alongX ? Math.sign(r.x - d.x) : 0, sz = d.alongX ? 0 : Math.sign(r.z - d.z); torii(d.x + sx * 1.6, d.z + sz * 1.6, d.alongX, form.corrW * TS); });
      // 注連繩：寶箱房的門口
      if (r.type === 'chest') Object.values(r.links).forEach(o => { const d = doorOf(r, linkIdx(r, o)); if (d) shimenawa(d.x, d.z, d.alongX, form.corrW * TS); });
      if (r.type === 'boss') sigil(r.x, r.z);
      // 石燈籠、地藏
      const nToro = r.type === 'start' ? 2 : r.type === 'boss' ? 4 : Math.random() < 0.5 ? 1 : 0;
      for (let i = 0; i < nToro; i++) { const s = spot(r, { wall: true, rad: 0.5 }); if (s) toro(s[0], s[1]); }
      if ((r.type === 'start' || r.type === 'chest') && run.grade.lv <= 2) { const s = spot(r, { wall: true, rad: 0.4 }); if (s) jizo(s[0], s[1]); }
      // 形式特有的東西
      if (run.type === 'tomb' && (r.shape === 'hall' || r.type === 'boss')) {
        const alongX = r.hx >= r.hz, len = alongX ? r.hx : r.hz, side = (alongX ? r.hz : r.hx) * 0.5;
        for (let s = -len + 3.5; s <= len - 3.5; s += 4.5) [-side, side].forEach(o => { const x = alongX ? r.x + s : r.x + o, z = alongX ? r.z + o : r.z + s; if (freeAt(x, z, 0.8)) pillar(x, z, true); });
        for (let i = 0; i < 2 + rint(0, 2); i++) { const s = spot(r, { wall: true, rad: 1.3 }); if (s) coffin(s[0], s[1], Math.random() < 0.5); }
      } else if ((r.type === 'fight' || r.type === 'ore') && run.type !== 'island' && Math.random() < 0.6) {
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const px = r.x + sx * r.hx * 0.45, pz = r.z + sz * r.hz * 0.45; if (Math.random() < 0.8 && freeAt(px, pz, 0.9)) pillar(px, pz, run.type === 'tower'); });
      }
      if (run.type === 'maze') for (let i = 0; i < rint(2, 5); i++) { const s = spot(r, { wall: true, rad: 0.3 }); if (s) { const [tx, tz] = [t.tX(s[0]), t.tZ(s[1])], w = N4.find(([dx, dz]) => !is(tx + dx, tz + dz, FLOOR)); if (w) root(s[0] + w[0] * 0.6, s[1] + w[1] * 0.6, Math.atan2(-w[0], -w[1])); } }
      if (run.type === 'island') for (let i = 0; i < rint(2, 4); i++) { const s = spot(r, { wall: true, rad: 0.8 }); if (s) rock(s[0], s[1], rnd(0.5, 0.9)); }
      if (run.type === 'city' && r.type !== 'boss' && Math.random() < 0.5 && freeAt(r.x, r.z + 3, 1.2)) { const w = new TH.Mesh(new TH.CylinderGeometry(1, 1.05, 0.8, 14), M.stone); w.position.set(r.x, 0.4, r.z + 3); w.castShadow = true; group.add(w); const wt = new TH.Mesh(new TH.CircleGeometry(0.85, 14), lam('#1A2A3A')); wt.rotation.x = -Math.PI / 2; wt.position.set(r.x, 0.81, r.z + 3); group.add(wt); block(r.x, r.z + 3, 1); }
      // 極端環境
      if (env === 'snow') for (let i = 0; i < 3; i++) { const s = spot(r, { wall: true, rad: 0.7 }); if (s) { const m = new TH.Mesh(new TH.SphereGeometry(rnd(0.7, 1.1), 8, 6), lam('#EEF4FA')); m.scale.y = 0.45; m.position.set(s[0], 0, s[1]); group.add(m); } }
      if (env === 'volcano') for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2, d0 = rnd(2, 5); const m = new TH.Mesh(new TH.BoxGeometry(0.18, 0.03, rnd(2, 4)), lam('#FF7A2A', { emissive: '#FF5A1A', emissiveIntensity: 1 })); m.position.set(r.x + Math.sin(a) * d0, 0.02, r.z + Math.cos(a) * d0); m.rotation.y = Math.random() * Math.PI; group.add(m); }
      if (env === 'desert') for (let i = 0; i < 3; i++) { const s = spot(r, { wall: true, rad: 0.8 }); if (s) { const m = new TH.Mesh(new TH.SphereGeometry(rnd(0.9, 1.4), 8, 6), lam('#C8AA78')); m.scale.y = 0.3; m.position.set(s[0], 0, s[1]); group.add(m); } }
      if (env === 'deep') for (let i = 0; i < 4; i++) { const s = spot(r, { wall: true, rad: 0.3 }); if (s) for (let j = 0; j < 3; j++) { const k2 = new TH.Mesh(new TH.BoxGeometry(0.08, rnd(1.2, 2.2), 0.08), lam('#2E7A5A')); k2.position.set(s[0] + rnd(-0.3, 0.3), 0.8, s[1] + rnd(-0.3, 0.3)); k2.rotation.z = rnd(-0.3, 0.3); group.add(k2); } }
    });
    // 城區的街道：路邊的紅提燈
    if (run.type === 'city') for (let k = 0; k < N; k++) {
      if (TT[k] !== FLOOR || RM[k] >= 0) continue; const [tx, tz] = kxz(k);
      if ((tx + tz * 3) % 5 !== 0) continue;
      const w = N4.find(([dx, dz]) => is(tx + dx, tz + dz, WALL)); if (!w) continue;
      lantern(cX(tx) + w[0] * 0.6, cZ(tz) + w[1] * 0.6);
    }
    // 橋：欄杆的木樁
    const posts = [];
    for (let k = 0; k < N; k++) { if (TT[k] !== FLOOR || !isBridge(k)) continue; const [tx, tz] = kxz(k); N4.forEach(([dx, dz]) => { if (is(tx + dx, tz + dz, PIT) && (tx + tz) % 2 === 0) posts.push([cX(tx) + dx * 0.85, cZ(tz) + dz * 0.85]); }); }
    if (posts.length) { const pm = new TH.InstancedMesh(new TH.BoxGeometry(0.16, 1.1, 0.16), lam('#4A3222'), posts.length); posts.forEach(([x, z], i) => place(pm, i, x, 0.55, z, 1, 1, 1)); pm.castShadow = true; group.add(pm); }

    // --- 陷阱：釘板，一陣一陣地刺出來 ---
    const spikeGeo = new TH.ConeGeometry(0.17, 0.62, 4), plateGeo = new TH.BoxGeometry(TS - 0.3, 0.06, TS - 0.3);
    const spikes = (r, dense) => {
      const ok = r.tiles.filter(k => { const [tx, tz] = kxz(k), x = cX(tx), z = cZ(tz); if (Math.hypot(x - r.x, z - r.z) < 2.5) return false; if (r.doors.some(d => { const [a, b] = kxz(d); return Math.hypot(cX(a) - x, cZ(b) - z) < 3.2; })) return false; if (!freeAt(x, z, 0.9)) return false; return dense ? (tx + tz) % 3 === 0 : true; });
      (dense ? ok : ok.sort(() => Math.random() - 0.5).slice(0, rint(2, 4))).forEach(k => {
        const [tx, tz] = kxz(k), x = cX(tx), z = cZ(tz), g2 = new TH.Group();
        const plate = new TH.Mesh(plateGeo, new TH.MeshLambertMaterial({ color: '#3A3A40' })); plate.position.y = 0.03; plate.receiveShadow = true; g2.add(plate);
        const sp = new TH.Group(); [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45], [0, 0]].forEach(([a, b]) => { const c = new TH.Mesh(spikeGeo, lam('#B8C0C8')); c.position.set(a, 0.31, b); sp.add(c); }); sp.position.y = -0.7; g2.add(sp);
        g2.position.set(x, 0, z); group.add(g2);
        F.traps.push({ x, z, sp, plate, phase: dense ? (tx % 4) * 0.55 : Math.random() * 2.4, period: 2.4, hitT: 0 });
      });
    };
    // --- 保留區最深處：看得到佩特拉核心，但受公會保護不能打 ---
    const coreView = r => {
      const [x, z] = R.nearestFloorLocal(t, r.x, r.z - r.hz + 3.6);
      const m = R.makeBeast('petra', 'small'); if (!m.isSprite) m.g.scale.setScalar(0.55); m.g.position.set(x, m.isSprite ? 1.2 : 3.2, z); group.add(m.g);
      const field = new TH.Mesh(new TH.SphereGeometry(3.4, 20, 14), new TH.MeshBasicMaterial({ color: th.accent, transparent: true, opacity: 0.1, depthWrite: false })); field.position.set(x, 3, z); group.add(field);
      R.addBox(x - 2.4, x + 2.4, z - 2.4, z + 2.4, 'core');
      F.coreView = { x, z, m, field };
    };
    // --- 往上的樓層通道：第一層的是遺跡入口（克森特級的入口已經閉合） ---
    const upstairs = r => {
      if (F.f === 0 && (run.grade.crystal === 'none' || run.grade.sealed0)) return; /* sealed0：克森特級的入口閉合（2026-10-04 起改成有投放的回歸水晶） */
      const [x, z] = R.nearestFloorLocal(t, r.x, r.z + r.hz - 2.6), g2 = new TH.Group();
      for (let i = 0; i < 4; i++) bx(3 - i * 0.35, 0.28 + i * 0.28, 0.7, lam(th.top), 0, (0.28 + i * 0.28) / 2, -0.6 + i * 0.55, g2);
      if (F.f === 0) { const glow = new TH.Mesh(new TH.PlaneGeometry(3, 3.2), new TH.MeshBasicMaterial({ color: '#FFF1D0', transparent: true, opacity: 0.6, side: TH.DoubleSide, depthWrite: false })); glow.position.set(0, 1.9, 1.5); g2.add(glow); [-1.7, 1.7].forEach(o => bx(0.5, 3.6, 0.5, lam(th.wall), o, 1.8, 1.5, g2)); bx(4, 0.5, 0.6, lam(th.wall), 0, 3.75, 1.5, g2); }
      else { const ring = new TH.Mesh(new TH.TorusGeometry(1.8, 0.06, 4, 4), lam(th.accent, { emissive: th.accent, emissiveIntensity: 0.6 })); ring.rotation.set(Math.PI / 2, 0, Math.PI / 4); ring.position.y = 0.08; g2.add(ring); }
      g2.position.set(x, 0, z); group.add(g2);
      F.up = { x, z, exit: F.f === 0 };
    };
    // --- 房間裡可以打破的東西、寶箱、水晶、樓層通道 ---
    F.rooms.forEach(r => {
      if (r.type !== 'start' && r.type !== 'boss' && r.type !== 'puzzle') {   /* 解謎房間不擺罈子、木箱（2026-10-04 作者回報：石頭被擋住、踩不到） */
        const nb = r.type === 'chest' ? 3 : rint(3, 7);
        for (let k = 0; k < nb; k++) { const s = spot(r, { wall: Math.random() < 0.7, rad: 0.7 }); if (!s) continue; const kind = Math.random() < 0.45 ? 'jar' : Math.random() < 0.6 ? 'crate' : 'crystal'; R.addProp(group, F, kind, s[0], s[1], th, r.i); }
      }
      const near = (x, z) => { const [px, pz] = R.nearestFloorLocal(t, x, z); return [px, pz]; };
      if (r.type === 'trap' || r.traps) spikes(r, r.type === 'trap');
      if (r.type === 'start') upstairs(r);
      if (r.type === 'deep' && run.grade.zone === '保留區') coreView(r);
      if (r.type === 'chest' || r.type === 'deep') { const [x, z] = near(r.x, r.z + (r.type === 'deep' ? 1 : 0)); R.addChest(group, F, x, z, run.grade.lv >= 2 && Math.random() < 0.35 ? 2 : run.grade.lv >= 1 ? 1 : 0, r.i); }
      if (r.type === 'start' && (run.grade.crystal === 'start' || (run.grade.crystal === 'stairs' && F.f === (run.f0 ? 1 : 0)))) { /* 第一層的落點也有（作者 2026-10-04） */ const [x, z] = near(r.x, r.z - r.hz + 2.8); R.addCrystal(group, F, x, z, r.i); }
      if (r.type === 'stairs') { R.addStairs(group, F, r.x, r.z, r.i, th); if (run.grade.crystal === 'stairs') { const [x, z] = near(r.x - 5, r.z - r.hz + 3); R.addCrystal(group, F, x, z, r.i); } }
      if (r.type === 'deep') { const [x, z] = near(r.x, r.z + r.hz - 3); R.addCrystal(group, F, x, z, r.i); }
      if (r.type === 'ore') for (let k = 0; k < 6; k++) { const s = spot(r, { wall: true, rad: 0.4 }); if (!s) continue; const c = new TH.Mesh(new TH.OctahedronGeometry(0.5 + Math.random() * 0.4, 0), lam(Math.random() < 0.5 ? '#8A74FF' : '#A3ACB6', { emissive: '#1A1030' })); c.position.set(s[0], 0.6 + Math.random(), s[1]); c.rotation.set(Math.random(), Math.random(), Math.random()); group.add(c); }
    });
    // ===== 房間的主題擺設、牆上的火把、地上的痕跡（v14） =====
    // 靜態的小東西合併成一個 mesh（同一種材質一個），省掉很多 draw call
    const BAT = new Map(), eu = new TH.Euler(), qq = new TH.Quaternion();
    const bat = (geo, mat, x, y, z, ry, sx, sy, sz, rx, rz) => {
      eu.set(rx || 0, ry || 0, rz || 0); qq.setFromEuler(eu); pos.set(x, y, z); scl.set(sx, sy == null ? sx : sy, sz == null ? sx : sz); m4.compose(pos, qq, scl);
      const g2 = geo.index ? geo.toNonIndexed() : geo.clone(); g2.applyMatrix4(m4); if (!BAT.has(mat)) BAT.set(mat, []); BAT.get(mat).push(g2);
    };
    const flushBat = () => {
      BAT.forEach((list, mat) => {
        const n = list.reduce((a, g) => a + g.attributes.position.count, 0), P2 = new Float32Array(n * 3), N2 = new Float32Array(n * 3), U2 = new Float32Array(n * 2); let o = 0;
        list.forEach(g => { P2.set(g.attributes.position.array, o * 3); N2.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U2.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); });
        const geo = new TH.BufferGeometry(); geo.setAttribute('position', new TH.BufferAttribute(P2, 3)); geo.setAttribute('normal', new TH.BufferAttribute(N2, 3)); geo.setAttribute('uv', new TH.BufferAttribute(U2, 2));
        const m = new TH.Mesh(geo, mat); m.castShadow = !mat.userData.flat; m.receiveShadow = true; m.frustumCulled = false; group.add(m);
      });
      BAT.clear();
    };
    const BOX = new TH.BoxGeometry(1, 1, 1), CYL = new TH.CylinderGeometry(0.5, 0.5, 1, 8), SPH = new TH.SphereGeometry(0.5, 8, 6), CONE = new TH.ConeGeometry(0.5, 1, 6), ROCK = new TH.DodecahedronGeometry(0.5, 0), DISC = new TH.CircleGeometry(0.5, 10).rotateX(-Math.PI / 2);
    const flatM = c => { const m = new TH.MeshLambertMaterial({ color: c }); m.userData.flat = 1; return m; };
    const MM = { iron: lam('#3A3A40'), cloth: lam('#C8B898'), tent: lam('#A89878'), guild: lam('#3E7A48'), gold: lam('#C9A13A'), bone: lam('#E0D8C4'), boneD: lam('#B8B09C'), skull: lam('#EAE2CE'),
      green: lam('#3E6A3A'), greenL: lam('#5A8A4A'), moss: flatM('#3E5A30'), stain: flatM('#1E1A18'), crack: flatM('#14100E'), water: lam('#2A5A7A', { emissive: '#0A2A3A', emissiveIntensity: 0.6 }), reed: lam('#6A7A3A'),
      shroom: lam('#7FE0C0', { emissive: '#3AA08A', emissiveIntensity: 0.9 }), candle: lam('#F4ECDC'), ember: lam('#FF7A2A', { emissive: '#FF4A10', emissiveIntensity: 1 }), web: lam('#DADADA', { transparent: true, opacity: 0.35, side: TH.DoubleSide, depthWrite: false }), sack: lam('#A08A60'), rope: lam('#8A7A50'), paperW: lam('#F4F0E6') };
    MM.web.userData.flat = 1; MM.water.userData.flat = 1;
    const BOOKS = ['#8A3A2E', '#2E5A7A', '#5A4A2E', '#3E6A3A', '#6A4A8A', '#7A6A4A', '#4A3A2A'].map(c => lam(c));
    const flameMat = new TH.MeshBasicMaterial({ color: '#FFB050' }), flameGeo = new TH.ConeGeometry(0.12, 0.38, 5);
    F.lights = []; F.flames = [];
    // 不能蓋住的地方：寶箱、水晶、樓層通道、出口、核心
    const keep = [];
    F.chests.forEach(c => keep.push([c.x, c.z, 2.2])); F.crystals.forEach(c => keep.push([c.x, c.z, 2.4]));
    if (F.stairs) keep.push([F.stairs.x, F.stairs.z, 3.4]); if (F.up) keep.push([F.up.x, F.up.z, 3.2]); if (F.coreView) keep.push([F.coreView.x, F.coreView.z, 4]);
    const kept = (x, z, rad) => keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr + rad);
    const sp2 = (r, o) => { for (let i = 0; i < 6; i++) { const s = spot(r, o); if (s && !kept(s[0], s[1], (o && o.rad) || 0.6)) return s; } return null; };
    // 靠牆的位置：回傳那一格的中心、牆在哪一邊、朝房間裡的方向
    const wallSpot = (r, rad) => { const s = sp2(r, { wall: true, rad: rad || 0.5 }); if (!s) return null; const tx = t.tX(s[0]), tz = t.tZ(s[1]), w = N4.find(([dx, dz]) => is(tx + dx, tz + dz, WALL)); if (!w) return null; const off = TS / 2 - 0.35; return { x: cX(tx) + w[0] * off, z: cZ(tz) + w[1] * off, dx: w[0], dz: w[1], rot: Math.atan2(-w[0], -w[1]) }; };
    const L = (ws, lx, lz) => [ws.x + Math.cos(ws.rot) * lx + Math.sin(ws.rot) * lz, ws.z - Math.sin(ws.rot) * lx + Math.cos(ws.rot) * lz];
    const colAlong = (ws, half, depth) => (ws.dx ? R.addBox(ws.x - depth, ws.x + depth, ws.z - half, ws.z + half, 'deco') : R.addBox(ws.x - half, ws.x + half, ws.z - depth, ws.z + depth, 'deco'));
    // 牆上的火把：鐵架＋火苗；光由「光源池」負責（只有離你最近的幾支會真的發光）
    const torch = (x, z, dx, dz, col) => {
      const px = x + dx * (TS / 2 - 0.1), pz = z + dz * (TS / 2 - 0.1), ry = Math.atan2(-dx, -dz);
      bat(BOX, MM.iron, px, 2.0, pz, ry, 0.12, 0.55, 0.12); bat(BOX, MM.iron, px - dx * 0.16, 2.28, pz - dz * 0.16, ry, 0.1, 0.06, 0.34); bat(CYL, MM.iron, px - dx * 0.3, 2.34, pz - dz * 0.3, 0, 0.2, 0.14, 0.2);
      const fl = new TH.Mesh(flameGeo, flameMat); fl.position.set(px - dx * 0.3, 2.58, pz - dz * 0.3); group.add(fl); F.flames.push(fl);
      F.lights.push({ x: px - dx * 0.7, y: 2.7, z: pz - dz * 0.7, col: col || '#FFB060', I: 1.15, flick: Math.random() * 10 });
    };
    const torchesIn = r => { const n = r.type === 'boss' ? 6 : r.type === 'start' ? 3 : rint(2, 4); for (let i = 0; i < n; i++) { const s = sp2(r, { wall: true, rad: 0.3 }); if (!s) continue; const tx = t.tX(s[0]), tz = t.tZ(s[1]), w = N4.find(([dx, dz]) => is(tx + dx, tz + dz, WALL)); if (w) torch(cX(tx), cZ(tz), w[0], w[1], env === 'deep' ? '#7FD8FF' : env === 'snow' ? '#CFE6FF' : null); } };
    // 地上的痕跡：裂縫、污漬、碎石
    const decals = r => {
      for (let i = 0; i < rint(3, 6); i++) { const s = spot(r, { rad: 0.2, clear: 1 }); if (!s) continue; const a = Math.random() * Math.PI; for (let k = 0; k < 3; k++) bat(BOX, MM.crack, s[0] + Math.sin(a) * k * 0.5, 0.012, s[1] + Math.cos(a) * k * 0.5, a + rnd(-0.6, 0.6), 0.06, 0.01, rnd(0.5, 0.9)); }
      for (let i = 0; i < rint(1, 3); i++) { const s = spot(r, { rad: 0.2, clear: 1 }); if (s) bat(DISC, MM.stain, s[0], 0.011, s[1], 0, rnd(1, 2.2), 1, rnd(0.8, 1.6)); }
      for (let i = 0; i < rint(3, 7); i++) { const s = spot(r, { wall: Math.random() < 0.7, rad: 0.2 }); if (s) bat(ROCK, lam(th.wall), s[0] + rnd(-0.4, 0.4), 0.08, s[1] + rnd(-0.4, 0.4), Math.random() * 3, rnd(0.15, 0.35), rnd(0.12, 0.25), rnd(0.15, 0.35)); }
      if (run.type === 'maze' || run.type === 'island' || env === 'deep') for (let i = 0; i < rint(2, 4); i++) { const s = spot(r, { rad: 0.2, clear: 1 }); if (s) bat(DISC, MM.moss, s[0], 0.013, s[1], Math.random() * 3, rnd(1.2, 2.6), 1, rnd(1, 2)); }
    };
    // ---- 主題 ----
    const DRESS = {
      // 書庫：靠牆的書架、地上散落的卷軸、看書的桌子和蠟燭
      library: r => {
        for (let i = 0; i < rint(2, 4); i++) { const ws = wallSpot(r, 0.9); if (!ws) continue; bat(BOX, M.woodD, ws.x, 1.1, ws.z, ws.rot, 1.7, 2.2, 0.55);
          for (let s = 0; s < 3; s++) { const [bx2, bz2] = L(ws, 0, 0.18); bat(BOX, M.wood, bx2, 0.32 + s * 0.65, bz2, ws.rot, 1.66, 0.05, 0.42); for (let k = 0; k < 7; k++) { if (Math.random() < 0.15) continue; const h = rnd(0.34, 0.52), [px, pz] = L(ws, -0.66 + k * 0.22, 0.2); bat(BOX, pick(BOOKS), px, 0.34 + s * 0.65 + h / 2, pz, ws.rot + rnd(-0.05, 0.05), 0.16, h, 0.36); } }
          colAlong(ws, 0.85, 0.32); }
        for (let i = 0; i < rint(3, 6); i++) { const s = spot(r, { rad: 0.3, clear: 1.5 }); if (s) bat(CYL, MM.paperW, s[0], 0.06, s[1], Math.random() * 3, 0.12, 0.6, 0.12, Math.PI / 2); }
        const d = sp2(r, { rad: 0.9 }); if (d) { bat(BOX, M.wood, d[0], 0.75, d[1], 0, 1.6, 0.1, 0.9); [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]].forEach(([a, b]) => bat(BOX, M.woodD, d[0] + a, 0.36, d[1] + b, 0, 0.1, 0.72, 0.1)); bat(BOX, MM.paperW, d[0] - 0.2, 0.82, d[1], 0.3, 0.5, 0.03, 0.36); bat(CYL, MM.candle, d[0] + 0.5, 0.92, d[1] - 0.2, 0, 0.1, 0.25, 0.1); const fl = new TH.Mesh(flameGeo, flameMat); fl.scale.setScalar(0.5); fl.position.set(d[0] + 0.5, 1.12, d[1] - 0.2); group.add(fl); F.flames.push(fl); F.lights.push({ x: d[0] + 0.5, y: 1.6, z: d[1] - 0.2, col: '#FFD08A', I: 0.7, flick: Math.random() * 10 }); R.addBox(d[0] - 0.85, d[0] + 0.85, d[1] - 0.5, d[1] + 0.5, 'deco'); }
      },
      // 祭壇：石台、供品、蠟燭、牆上的符紙
      shrine: r => {
        const ws = wallSpot(r, 1.3); if (ws) { const [ax, az] = L(ws, 0, 0.2); bat(BOX, M.stone, ax, 0.45, az, ws.rot, 2.2, 0.9, 1.0); bat(BOX, M.stoneD, ax, 0.95, az, ws.rot, 2.4, 0.12, 1.15);
          [[-0.7, 0], [0.7, 0]].forEach(([lx]) => { const [px, pz] = L(ws, lx, 0.25); bat(CYL, MM.candle, px, 1.15, pz, 0, 0.12, 0.3, 0.12); const fl = new TH.Mesh(flameGeo, flameMat); fl.scale.setScalar(0.5); fl.position.set(px, 1.4, pz); group.add(fl); F.flames.push(fl); });
          const [ox, oz] = L(ws, 0, 0.3); bat(SPH, M.white, ox - 0.15, 1.08, oz, 0, 0.26, 0.18, 0.26); bat(SPH, M.white, ox + 0.15, 1.08, oz, 0, 0.26, 0.18, 0.26); bat(CYL, M.black, ox + 0.45, 1.15, oz - 0.1, 0, 0.12, 0.3, 0.12);
          const [sx, sz] = L(ws, 0, -0.2); bat(BOX, M.stone, sx, 1.7, sz, ws.rot, 0.7, 1.4, 0.25); bat(BOX, M.stoneD, sx, 2.45, sz, ws.rot, 0.9, 0.12, 0.35);
          F.lights.push({ x: ax - ws.dx * 0.8, y: 1.6, z: az - ws.dz * 0.8, col: '#FFC870', I: 0.8, flick: Math.random() * 10 }); colAlong(ws, 1.2, 0.6); }
        for (let i = 0; i < rint(4, 8); i++) { const s = sp2(r, { wall: true, rad: 0.2 }); if (!s) continue; const tx = t.tX(s[0]), tz = t.tZ(s[1]), w = N4.find(([dx, dz]) => is(tx + dx, tz + dz, WALL)); if (!w) continue; const px = cX(tx) + w[0] * (TS / 2 - 0.02), pz = cZ(tz) + w[1] * (TS / 2 - 0.02); bat(BOX, M.white, px, rnd(1.2, 2.4), pz, Math.atan2(-w[0], -w[1]) + rnd(-0.15, 0.15), 0.22, 0.5, 0.02); }
      },
      // 倉庫：疊起來的木箱、酒桶、布袋、壞掉的推車
      storage: r => {
        for (let i = 0; i < rint(2, 4); i++) { const s = sp2(r, { wall: true, rad: 1 }); if (!s) continue; const n = rint(1, 3); for (let k = 0; k < n; k++) bat(BOX, k % 2 ? M.wood : M.woodD, s[0] + rnd(-0.1, 0.1), 0.45 + k * 0.9, s[1] + rnd(-0.1, 0.1), rnd(-0.3, 0.3), 0.9, 0.9, 0.9); R.addBox(s[0] - 0.55, s[0] + 0.55, s[1] - 0.55, s[1] + 0.55, 'deco'); }
        for (let i = 0; i < rint(2, 4); i++) { const s = sp2(r, { wall: true, rad: 0.6 }); if (!s) continue; bat(CYL, M.wood, s[0], 0.5, s[1], 0, 0.8, 1, 0.8); bat(CYL, MM.iron, s[0], 0.25, s[1], 0, 0.84, 0.06, 0.84); bat(CYL, MM.iron, s[0], 0.75, s[1], 0, 0.84, 0.06, 0.84); R.addBox(s[0] - 0.42, s[0] + 0.42, s[1] - 0.42, s[1] + 0.42, 'deco'); }
        for (let i = 0; i < rint(2, 4); i++) { const s = sp2(r, { wall: true, rad: 0.4 }); if (s) bat(SPH, MM.sack, s[0], 0.3, s[1], Math.random() * 3, 0.75, 0.6, 0.6); }
        const c = sp2(r, { rad: 1.2 }); if (c) { const a = Math.random() * 3; bat(BOX, M.wood, c[0], 0.6, c[1], a, 1.2, 0.5, 2, 0, 0.25); bat(CYL, M.woodD, c[0] + Math.cos(a) * 0.7, 0.4, c[1] - Math.sin(a) * 0.7, a, 0.8, 0.12, 0.8, 0, Math.PI / 2); R.addBox(c[0] - 0.9, c[0] + 0.9, c[1] - 0.9, c[1] + 0.9, 'deco'); }
      },
      // 以前的勇者留下的營地：睡墊、熄了一半的營火、背包、公會的綠旗
      camp: r => {
        const f = sp2(r, { rad: 1, clear: 2.5 }); if (f) { for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; bat(ROCK, M.stoneD, f[0] + Math.sin(a) * 0.6, 0.1, f[1] + Math.cos(a) * 0.6, a, 0.28, 0.2, 0.28); } bat(BOX, M.woodD, f[0], 0.1, f[1], 0.5, 0.9, 0.12, 0.14); bat(BOX, M.woodD, f[0], 0.12, f[1], -0.6, 0.9, 0.12, 0.14); bat(SPH, MM.ember, f[0], 0.08, f[1], 0, 0.5, 0.15, 0.5);
          const fl = new TH.Mesh(flameGeo, flameMat); fl.scale.setScalar(1.6); fl.position.set(f[0], 0.4, f[1]); group.add(fl); F.flames.push(fl); F.lights.push({ x: f[0], y: 1.2, z: f[1], col: '#FF9A40', I: 1.4, flick: Math.random() * 10 }); R.addBox(f[0] - 0.7, f[0] + 0.7, f[1] - 0.7, f[1] + 0.7, 'deco'); }
        for (let i = 0; i < 2; i++) { const s = sp2(r, { wall: true, rad: 0.9 }); if (s) { const a = Math.random() * 3; bat(BOX, MM.cloth, s[0], 0.05, s[1], a, 0.9, 0.1, 1.9); bat(CYL, MM.tent, s[0] + Math.sin(a) * 0.7, 0.15, s[1] + Math.cos(a) * 0.7, a, 0.3, 0.9, 0.3, 0, Math.PI / 2); } }
        const b = sp2(r, { wall: true, rad: 0.5 }); if (b) { bat(BOX, MM.sack, b[0], 0.35, b[1], 0.4, 0.55, 0.7, 0.4); bat(BOX, M.woodD, b[0], 0.75, b[1], 0.4, 0.5, 0.1, 0.36); }
        const p = sp2(r, { wall: true, rad: 0.4 }); if (p) { bat(CYL, M.woodD, p[0], 1.4, p[1], 0, 0.1, 2.8, 0.1); bat(BOX, MM.guild, p[0] + 0.45, 2.3, p[1], 0, 0.8, 0.6, 0.04); bat(BOX, MM.gold, p[0] + 0.45, 2.3, p[1] + 0.03, 0, 0.18, 0.18, 0.05, 0, Math.PI / 4); R.addBox(p[0] - 0.15, p[0] + 0.15, p[1] - 0.15, p[1] + 0.15, 'deco'); }
      },
      // 兵器庫：武器架、鎧甲架、牆上的盾
      armory: r => {
        for (let i = 0; i < rint(1, 3); i++) { const ws = wallSpot(r, 0.9); if (!ws) continue; const [bx2, bz2] = L(ws, 0, -0.1); bat(BOX, M.woodD, bx2, 1.0, bz2, ws.rot, 1.7, 0.1, 0.2); bat(BOX, M.woodD, bx2, 0.4, bz2, ws.rot, 1.7, 0.1, 0.4);
          for (let k = 0; k < 5; k++) { const [px, pz] = L(ws, -0.64 + k * 0.32, 0.05), spear = k % 2 === 0; bat(BOX, spear ? M.wood : lam('#B8C0C8'), px, spear ? 1.25 : 0.95, pz, ws.rot, 0.06, spear ? 2.3 : 1.2, 0.06); if (spear) bat(CONE, lam('#B8C0C8'), px, 2.5, pz, 0, 0.12, 0.3, 0.12); }
          colAlong(ws, 0.85, 0.3); }
        for (let i = 0; i < rint(1, 2); i++) { const s = sp2(r, { wall: true, rad: 0.6 }); if (!s) continue; bat(BOX, M.woodD, s[0], 0.7, s[1], 0, 0.1, 1.4, 0.1); bat(BOX, MM.iron, s[0], 1.25, s[1], 0, 0.6, 0.7, 0.34); bat(SPH, MM.iron, s[0], 1.8, s[1], 0, 0.36, 0.3, 0.36); bat(BOX, M.red, s[0], 1.05, s[1], 0, 0.62, 0.12, 0.36); R.addBox(s[0] - 0.4, s[0] + 0.4, s[1] - 0.4, s[1] + 0.4, 'deco'); }
        for (let i = 0; i < rint(2, 3); i++) { const s = sp2(r, { wall: true, rad: 0.2 }); if (!s) continue; const tx = t.tX(s[0]), tz = t.tZ(s[1]), w = N4.find(([dx, dz]) => is(tx + dx, tz + dz, WALL)); if (!w) continue; bat(CYL, pick([M.red, MM.iron, M.wood]), cX(tx) + w[0] * (TS / 2 - 0.05), 1.7, cZ(tz) + w[1] * (TS / 2 - 0.05), Math.atan2(-w[0], -w[1]), 0.8, 0.08, 0.8, Math.PI / 2); }
      },
      // 崩塌的大廳：碎石堆、倒下的柱子、天花板掉下來的大石塊
      collapsed: r => {
        for (let i = 0; i < rint(2, 4); i++) { const s = sp2(r, { rad: 1.1, clear: 2 }); if (!s) continue; for (let k = 0; k < rint(4, 7); k++) bat(ROCK, lam(th.wall), s[0] + rnd(-0.8, 0.8), rnd(0.15, 0.5), s[1] + rnd(-0.8, 0.8), Math.random() * 3, rnd(0.4, 0.9), rnd(0.3, 0.7), rnd(0.4, 0.9)); R.addBox(s[0] - 0.8, s[0] + 0.8, s[1] - 0.8, s[1] + 0.8, 'deco'); }
        const c = sp2(r, { rad: 1.5, clear: 2 }); if (c) { const a = Math.random() * 3, along = Math.abs(Math.cos(a)) > 0.7; bat(CYL, lam(th.wall), c[0], 0.5, c[1], along ? 0 : Math.PI / 2, 1, 3.6, 1, 0, Math.PI / 2); bat(BOX, lam(th.top), c[0] + (along ? 1.9 : 0), 0.4, c[1] + (along ? 0 : 1.9), 0, 1.3, 0.8, 1.3); R.addBox(c[0] - (along ? 2.4 : 0.6), c[0] + (along ? 2.4 : 0.6), c[1] - (along ? 0.6 : 2.4), c[1] + (along ? 0.6 : 2.4), 'deco'); }
      },
      // 長滿苔的庭園：草叢、會發光的菇、老樹
      garden: r => {
        for (let i = 0; i < rint(3, 6); i++) { const s = sp2(r, { wall: Math.random() < 0.6, rad: 0.6 }); if (!s) continue; bat(SPH, pick([MM.green, MM.greenL]), s[0], 0.3, s[1], 0, rnd(0.8, 1.3), rnd(0.5, 0.8), rnd(0.8, 1.3)); }
        for (let i = 0; i < rint(4, 9); i++) { const s = spot(r, { wall: true, rad: 0.15 }); if (!s) continue; const h = rnd(0.2, 0.45); bat(CYL, MM.candle, s[0], h / 2, s[1], 0, 0.06, h, 0.06); bat(SPH, MM.shroom, s[0], h, s[1], 0, rnd(0.25, 0.4), 0.14, rnd(0.25, 0.4)); if (i < 2) F.lights.push({ x: s[0], y: 0.8, z: s[1], col: '#7FE0C0', I: 0.6, flick: 0 }); }
        const tr = sp2(r, { rad: 1, clear: 2.5 }); if (tr) { bat(CYL, M.root, tr[0], 1.4, tr[1], 0, 0.6, 2.8, 0.6); [[0.8, 2.6, 0.5], [-0.7, 2.3, 2.2], [0.1, 3, 4]].forEach(([dx, y, a]) => bat(CYL, M.root, tr[0] + dx * 0.6, y, tr[1] + Math.cos(a) * 0.3, a, 0.25, 1.6, 0.25, 0, dx > 0 ? -0.8 : 0.8)); bat(SPH, MM.green, tr[0], 3.1, tr[1], 0, 2.2, 1.2, 2.0); R.addBox(tr[0] - 0.45, tr[0] + 0.45, tr[1] - 0.45, tr[1] + 0.45, 'deco'); }
      },
      // 水池：石頭圍起來的水、蘆葦
      pool: r => {
        const c = sp2(r, { rad: 1.8, clear: 1 }); if (c) { const rx = rnd(1.3, 1.8), rz = rnd(1, 1.5); bat(CYL, MM.water, c[0], 0.03, c[1], 0, rx * 2, 0.04, rz * 2); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; bat(ROCK, M.stone, c[0] + Math.sin(a) * rx, 0.12, c[1] + Math.cos(a) * rz, a, 0.5, 0.3, 0.4); }
          for (let k = 0; k < 8; k++) { const a = Math.random() * Math.PI * 2; bat(BOX, MM.reed, c[0] + Math.sin(a) * (rx + 0.1), 0.5, c[1] + Math.cos(a) * (rz + 0.1), 0, 0.04, rnd(0.6, 1.1), 0.04, rnd(-0.2, 0.2)); }
          R.addBox(c[0] - rx + 0.2, c[0] + rx - 0.2, c[1] - rz + 0.2, c[1] + rz - 0.2, 'pit'); }
      },
      // 骨堆：散落的骨頭、頭骨、角落的蜘蛛網
      bones: r => {
        for (let i = 0; i < rint(3, 6); i++) { const s = spot(r, { rad: 0.4, clear: 1.5 }); if (!s) continue; for (let k = 0; k < rint(3, 6); k++) bat(BOX, Math.random() < 0.5 ? MM.bone : MM.boneD, s[0] + rnd(-0.5, 0.5), 0.05, s[1] + rnd(-0.5, 0.5), Math.random() * 3, 0.08, 0.08, rnd(0.4, 0.8)); if (Math.random() < 0.7) bat(SPH, MM.skull, s[0] + rnd(-0.3, 0.3), 0.16, s[1] + rnd(-0.3, 0.3), 0, 0.32, 0.28, 0.36); }
        r.tiles.forEach(k => { const [tx, tz] = kxz(k); const wx = N4.filter(([dx, dz]) => is(tx + dx, tz + dz, WALL)); if (wx.length >= 2 && Math.random() < 0.5) { const [a, b] = wx; const cx2 = cX(tx) + (a[0] + b[0]) * (TS / 2 - 0.05), cz2 = cZ(tz) + (a[1] + b[1]) * (TS / 2 - 0.05); bat(CONE, MM.web, cx2, 2.8, cz2, Math.atan2(a[0] + b[0], a[1] + b[1]), 1.4, 0.9, 1.4, Math.PI); } });
      }
    };
    const THEMES_BY = { city: ['storage', 'shrine', 'camp', 'armory', 'library', 'collapsed'], maze: ['garden', 'collapsed', 'camp', 'pool', 'bones', 'garden'], tomb: ['shrine', 'bones', 'library', 'collapsed', 'bones'], tower: ['library', 'shrine', 'collapsed', 'armory'], island: ['pool', 'camp', 'garden', 'collapsed'] };
    F.rooms.forEach(r => {
      let theme = r.type === 'start' ? 'camp' : r.type === 'stairs' ? 'shrine' : r.type === 'trap' ? 'bones' : r.type === 'boss' || r.type === 'deep' || r.type === 'lord' || r.type === 'puzzle' ? null : pick(THEMES_BY[run.type] || THEMES_BY.city);   /* 解謎房間：不擺倒下的柱子、樹叢這些 */
      if (r.type === 'ore') theme = 'collapsed';
      r.theme = theme; if (theme) DRESS[theme](r);
      torchesIn(r); decals(r);
    });
    // 通道：牆上偶爾一支火把、蜘蛛網、碎石
    for (let k = 0; k < N; k++) {
      if (TT[k] !== FLOOR || RM[k] >= 0 || isBridge(k)) continue; const [tx, tz] = kxz(k), w = N4.find(([dx, dz]) => is(tx + dx, tz + dz, WALL)); if (!w) continue;
      const h2 = hash(tx * 7 + 3, tz * 5 + 1);
      if (h2 < 0.07) torch(cX(tx), cZ(tz), w[0], w[1], env === 'deep' ? '#7FD8FF' : null);
      else if (h2 < 0.2) bat(ROCK, lam(th.wall), cX(tx) + w[0] * 0.6 + rnd(-0.3, 0.3), 0.08, cZ(tz) + w[1] * 0.6 + rnd(-0.3, 0.3), Math.random() * 3, rnd(0.2, 0.4), rnd(0.15, 0.3), rnd(0.2, 0.4));
      else if (h2 < 0.26 && (run.type === 'tomb' || run.type === 'maze')) bat(CONE, MM.web, cX(tx) + w[0] * (TS / 2 - 0.05), 2.9, cZ(tz) + w[1] * (TS / 2 - 0.05), Math.atan2(w[0], w[1]), 1.2, 0.8, 1.2, Math.PI);
    }
    flushBat();
    // 空氣中的粒子：灰塵（一般）、雪、火星、沙、氣泡
    { const kind = env === 'snow' ? 'snow' : env === 'volcano' ? 'ember' : env === 'desert' ? 'sand' : env === 'deep' ? 'bubble' : 'dust', NP = kind === 'dust' ? 170 : 280, arr = new Float32Array(NP * 3);
      for (let i = 0; i < NP; i++) { arr[i * 3] = rnd(-14, 14); arr[i * 3 + 1] = rnd(0, 7); arr[i * 3 + 2] = rnd(-12, 12); }
      const pg = new TH.BufferGeometry(); pg.setAttribute('position', new TH.BufferAttribute(arr, 3));
      const pixOn = !!(R.pixelOn && R.pixelOn()), pm = new TH.PointsMaterial({ color: { dust: th.light, snow: '#F4F8FF', ember: '#FF9A3A', sand: '#E8D0A0', bubble: '#9AE0FF' }[kind], size: pixOn ? (kind === 'dust' ? 1 : 2) : kind === 'dust' ? 0.06 : 0.11, sizeAttenuation: !pixOn, transparent: true, opacity: kind === 'dust' ? 0.45 : 0.85, depthWrite: false });
      const pts = new TH.Points(pg, pm); pts.frustumCulled = false; group.add(pts); F.motes = { pts, kind, arr, NP }; }
    F.eyes.sort(() => Math.random() - 0.5);
    F.cut = new Map();
    scene.add(group);
    F.group = group;
    return group;
  };
  // 建場景時 W.F 還不是這一層，所以用傳進來的 tile 查
  R.isFloorLocal = (t, x, z) => { const tx = Math.floor((x - t.X0) / TS), tz = Math.floor((z - t.Z0) / TS); return tx >= 0 && tz >= 0 && tx < t.nx && tz < t.nz && t.T[tz * t.nx + tx] === FLOOR; };
  R.nearestFloorLocal = (t, x, z) => {
    if (R.isFloorLocal(t, x, z)) return [x, z];
    const tx0 = Math.floor((x - t.X0) / TS), tz0 = Math.floor((z - t.Z0) / TS);
    for (let rad = 1; rad <= 8; rad++) for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
      const tx = tx0 + dx, tz = tz0 + dz; if (tx < 0 || tz < 0 || tx >= t.nx || tz >= t.nz) continue;
      if (t.T[tz * t.nx + tx] === FLOOR) return [t.cX(tx), t.cZ(tz)];
    }
    return [x, z];
  };

  // ---------- 擋住人物的牆會暫時變矮（轉視角也看得到自己） ----------
  const cutM = () => new (T().Matrix4)(), cutQ = () => new (T().Quaternion)();
  let _m, _q, _p, _s, _zero;
  R.updateCutaway = dt => {
    const W = R.W, F = W.F, P = W.P; if (!F || !F.wallMeshes || !P) return;
    if (!_m) { _m = cutM(); _q = cutQ(); _p = new (T().Vector3)(); _s = new (T().Vector3)(); }
    const t = F.tile, cy = Math.sin(W.cam.yaw), cz = Math.cos(W.cam.yaw), want = new Set();
    const ptx = Math.floor((P.x - t.X0) / TS), ptz = Math.floor((P.z - t.Z0) / TS);
    for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
      const tx = ptx + dx, tz = ptz + dz; if (tx < 0 || tz < 0 || tx >= t.nx || tz >= t.nz) continue;
      const i = F.wallAt[tz * t.nx + tx]; if (i < 0) continue;
      const wx = t.cX(tx) - P.x, wz = t.cZ(tz) - P.z, along = wx * cy + wz * cz, side = Math.abs(wx * cz - wz * cy);
      if (along > -0.6 && along < 7.5 && side < 3.4 - along * 0.15) want.add(i);
    }
    // 擋住的牆：本體縮成 0，換上同樣大小的半透明幽靈牆
    if (!_zero) _zero = new (T().Matrix4)().makeScale(0, 0, 0);
    const full = (j, i) => {
      const h = F.wallH[i], fac = F.wallFacade[i], tk = F.wallTile[i], tx = tk % t.nx, tz = (tk - tx) / t.nx, x = t.cX(tx), z = t.cZ(tz);
      if (j === 0) { _p.set(x, h / 2, z); _s.set(TS, h, TS); }
      else if (j === 1) { if (fac) { _p.set(x, h + 0.2, z); _s.set(TS + 0.5, 0.4, TS + 0.5); } else { _p.set(x, h + 0.09, z); _s.set(TS + 0.12, 0.18, TS + 0.12); } }
      else { _p.set(x, h + 0.36, z); _s.set(TS - 0.5, 0.36, TS - 0.5); }
      _q.identity(); return _m.compose(_p, _q, _s);
    };
    let dirty = false;
    const swap = (i, ghost) => { F.wallMeshes.forEach((solid, j) => { solid.setMatrixAt(i, ghost ? _zero : full(j, i)); F.ghosts[j].setMatrixAt(i, ghost ? full(j, i) : _zero); }); dirty = true; };
    F.cut.forEach((v, i) => { if (!want.has(i)) { swap(i, false); F.cut.delete(i); } });
    want.forEach(i => { if (!F.cut.has(i)) { swap(i, true); F.cut.set(i, 1); } });
    if (dirty) { F.wallMeshes.forEach(m => { m.instanceMatrix.needsUpdate = true; }); F.ghosts.forEach(m => { m.instanceMatrix.needsUpdate = true; }); }
    if (F.winMesh && dirty) { let wd = false; F.wins.forEach((w, j) => { const show = !F.cut.has(w.i); if (w.hidden === !show) return; w.hidden = !show; _p.set(w.x, show ? w.y : -20, w.z); _s.set(1, 1, 1); _q.setFromAxisAngle(new (T().Vector3)(0, 1, 0), w.rot); _m.compose(_p, _q, _s); F.winMesh.setMatrixAt(j, _m); _q.identity(); wd = true; }); if (wd) F.winMesh.instanceMatrix.needsUpdate = true; }
  };

  // ---------- 光源池：離你最近的幾支火把才真的發光（光的數量固定，不會讓材質重新編譯）；火苗跳動；空氣中的粒子 ----------
  R.updateLights = dt => {
    const W = R.W, F = W.F, P = W.P, run = W.run; if (!F || !P || !run) return;
    const t = run.t;
    if (W.pool && F.lights) {
      F.lightSort = (F.lightSort || 0) - dt;
      if (F.lightSort <= 0) { F.lightSort = 0.25; F.near = F.lights.map(L => [L, (L.x - P.x) * (L.x - P.x) + (L.z - P.z) * (L.z - P.z)]).filter(a => a[1] < 24 * 24).sort((a, b) => a[1] - b[1]).slice(0, W.pool.length).map(a => a[0]); }
      W.pool.forEach((l, i) => { const L = F.near && F.near[i]; if (!L) { l.intensity = 0; return; } l.position.set(L.x, L.y, L.z); l.color.set(L.col); l.intensity = L.I * (L.flick ? 0.86 + Math.sin(t * 11 + L.flick) * 0.08 + Math.sin(t * 23 + L.flick * 2) * 0.05 : 1); });
    }
    if (F.flames) F.flames.forEach((f, i) => { const s = f.userData.s || (f.userData.s = f.scale.x); f.scale.set(s * (0.9 + Math.sin(t * 9 + i * 2) * 0.1), s * (0.8 + Math.sin(t * 12 + i) * 0.2), s * (0.9 + Math.sin(t * 9 + i * 2) * 0.1)); });
    if (F.motes) {
      const m = F.motes, a = m.arr, k = m.kind;
      for (let i = 0; i < m.NP; i++) {
        const j = i * 3;
        if (k === 'snow') { a[j + 1] -= dt * 1.2; a[j] += Math.sin(t + i) * dt * 0.3; }
        else if (k === 'ember') { a[j + 1] += dt * (0.8 + (i % 5) * 0.2); a[j] += Math.sin(t * 2 + i) * dt * 0.4; }
        else if (k === 'sand') { a[j] += dt * 3; a[j + 1] += Math.sin(t * 3 + i) * dt * 0.2; }
        else if (k === 'bubble') { a[j + 1] += dt * 0.9; a[j] += Math.sin(t * 2 + i) * dt * 0.2; }
        else { a[j] += Math.sin(t * 0.3 + i) * dt * 0.15; a[j + 1] += Math.sin(t * 0.5 + i * 1.7) * dt * 0.1; a[j + 2] += Math.cos(t * 0.4 + i) * dt * 0.15; }
        if (a[j + 1] < 0) a[j + 1] += 7; if (a[j + 1] > 7) a[j + 1] -= 7; if (a[j] > 14) a[j] -= 28; if (a[j] < -14) a[j] += 28; if (a[j + 2] > 12) a[j + 2] -= 24; if (a[j + 2] < -12) a[j + 2] += 24;
      }
      m.pts.geometry.attributes.position.needsUpdate = true; m.pts.position.set(P.x, 0, P.z);
    }
  };
  // 可以打破的東西：甕、木箱、水晶簇
  R.addProp = (group, F, kind, x, z, th, room) => {
    const TH = T();
    let m;
    if (kind === 'jar') { m = new TH.Mesh(new TH.CylinderGeometry(0.42, 0.34, 1, 8), lam('#8A6A52')); m.position.set(x, 0.5, z); }
    else if (kind === 'crate') { m = new TH.Mesh(new TH.BoxGeometry(1.1, 1.1, 1.1), lam('#7A5A3A')); m.position.set(x, 0.55, z); m.rotation.y = Math.random(); }
    else { m = new TH.Mesh(new TH.OctahedronGeometry(0.62, 0), lam(th.accent, { emissive: th.accent, emissiveIntensity: 0.35 })); m.position.set(x, 0.7, z); m.scale.y = 1.5; }
    m.castShadow = true; group.add(m);
    const c = R.addBox(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 'prop');
    const p = { kind, x, z, hp: kind === 'crystal' ? 30 : 12, mesh: m, col: c, room, alive: true };
    c.ref = p; F.props.push(p);
    return p;
  };
  // 寶箱：tier 0 木、1 銅、2 金
  R.addChest = (group, F, x, z, tier, room) => {
    const TH = T(), col = ['#7A5A3A', '#9A6A3A', '#C9A13A'][tier], trim = ['#4A3A2A', '#5A3A1E', '#8A6A1E'][tier];
    const g2 = new TH.Group();
    const base = new TH.Mesh(new TH.BoxGeometry(1.6, 0.9, 1.1), lam(col)); base.position.y = 0.45; base.castShadow = true; g2.add(base);
    const band = new TH.Mesh(new TH.BoxGeometry(1.64, 0.14, 1.14), lam(trim)); band.position.y = 0.7; g2.add(band);
    const lidPivot = new TH.Group(); lidPivot.position.set(0, 0.9, -0.55); g2.add(lidPivot);
    const lid = new TH.Mesh(new TH.BoxGeometry(1.6, 0.4, 1.1), lam(col)); lid.position.set(0, 0.2, 0.55); lid.castShadow = true; lidPivot.add(lid);
    const lock = new TH.Mesh(new TH.BoxGeometry(0.22, 0.26, 0.08), lam('#E8C860', { emissive: '#3A2A00' })); lock.position.set(0, 0.8, 0.58); g2.add(lock);
    g2.position.set(x, 0, z); group.add(g2);
    const c = R.addBox(x - 0.8, x + 0.8, z - 0.55, z + 0.55, 'chest');
    const ch = { x, z, tier, room, mesh: g2, lid: lidPivot, state: 'closed', refresh: 0, opened: 0, col: c };
    F.chests.push(ch);
    return ch;
  };
  // 回歸水晶：帶著東西回到地面
  R.addCrystal = (group, F, x, z, room) => {
    const TH = T();
    const c = new TH.Mesh(new TH.OctahedronGeometry(0.9, 0), lam('#7FE8FF', { emissive: '#2A9ABF', emissiveIntensity: 0.9, transparent: true, opacity: 0.9 }));
    c.scale.y = 1.8; c.position.set(x, 1.9, z); group.add(c);
    const ring = new TH.Mesh(new TH.TorusGeometry(1.3, 0.08, 6, 24), lam('#BFF4FF', { emissive: '#4AC8E8' })); ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.2, z); group.add(ring);
    const L = new TH.PointLight('#6FD8FF', 1.2, 12, 1.6); L.position.set(x, 2.5, z); group.add(L);
    R.addBox(x - 0.7, x + 0.7, z - 0.7, z + 0.7, 'crystal');
    (F.crystals = F.crystals || []).push({ x, z, room, mesh: c, ring });
  };
  // 樓層通道：往下一層
  R.addStairs = (group, F, x, z, room, th) => {
    const TH = T();
    const hole = new TH.Mesh(new TH.BoxGeometry(4, 0.05, 4), new TH.MeshBasicMaterial({ color: '#05030A' })); hole.position.set(x, 0.02, z); group.add(hole);
    for (let i = 0; i < 4; i++) { const s = new TH.Mesh(new TH.BoxGeometry(3.2 - i * 0.5, 0.06, 0.6), lam(th.wall)); s.position.set(x, 0.05 - i * 0.01, z - 1.2 + i * 0.7); group.add(s); }
    const edge = new TH.Mesh(new TH.TorusGeometry(2.4, 0.07, 4, 4), lam(th.accent, { emissive: th.accent, emissiveIntensity: 0.8 })); edge.rotation.set(Math.PI / 2, 0, Math.PI / 4); edge.position.set(x, 0.1, z); group.add(edge);
    F.stairs = { x, z, room, edge, sealed: false };
  };
  R.CELL = { CW, CH, DOOR, TS };
  R.TILE = { VOID, FLOOR, WALL, PIT };
})(window.R);
