// 討伐令 1433：大空洞——沒有門膜的超大空間，遺跡生物在那一區自然生成（作者）
// - 一般的戰鬥樓層有四成五的機會出現一個大空洞：把格子上相鄰的 2×2（不行就 2×1）幾間房連同中間的空地整片打通，
//   邊緣不規則、中間散著岩塊。裡面的房間不會封門（沒有膜）。
// - 走進大空洞：遺跡生物會從地面湧出來（離你十三到二十六公尺的地方），一直補到一定的數量；一層最多湧出 30＋10×分級 隻。
// - 不出現在：第 0 層、哈米莉亞的平靜樓層、高塔型和浮島型（懸空的橋）。
(function (R) {
  const W = R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const FLOOR = 1, WALL = 2, VOID = 0, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const CW = 38, CH = 32, BAD = ['start', 'stairs', 'boss', 'deep', 'lord', 'chest', 'puzzle'];
  const carve0 = R.carve;
  R.carve = (F, run) => {
    carve0(F, run);
    try {
      const RP = R.ruinPlusDebug, f = F.f;
      if (run.type === 'tower' || run.type === 'island') return;
      if (RP && ((RP.has0(run) && f === 0) || RP.calmFloor(run, f))) return;
      if (rnd() > 0.45) return;
      openZone(F, run);
    } catch (e) { console.warn('[zones]', e); }
  };
  const openZone = (F, run) => {
    const rooms = F.rooms, at = new Map(); rooms.forEach(r => at.set(r.gx + ',' + r.gy, r));
    // 找一塊 2×2（或 2×1、1×2）：格子裡沒有不能動的房間，至少兩間可以打通的
    const blocks = [];
    rooms.forEach(r => [[2, 2], [2, 1], [1, 2]].forEach(([w, h]) => {
      const cells = []; for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cells.push([r.gx + dx, r.gy + dy]);
      const rs = cells.map(([x, y]) => at.get(x + ',' + y)).filter(Boolean);
      if (rs.some(o => BAD.includes(o.type) || o.big)) return; if (rs.length < 2) return;
      blocks.push({ gx: r.gx, gy: r.gy, w, h, rs, score: w * h * 10 + rs.length });
    }));
    if (!blocks.length) return;
    blocks.sort((a, b) => b.score - a.score); const top = blocks.filter(b => b.score === blocks[0].score), B = pick(top);
    const t = F.tile, { nx, nz, T, RM, id, tX, tZ, cX, cZ } = t;
    const x0 = B.gx * CW - CW / 2 + 3, x1 = (B.gx + B.w - 1) * CW + CW / 2 - 3, z0 = B.gy * CH - CH / 2 + 3, z1 = (B.gy + B.h - 1) * CH + CH / 2 - 3;
    const was = new Set(), inZone = [], zli = (F.links || []).findIndex(L => B.rs.some(o => o.i === L.a || o.i === L.b));   // 小地圖：打通的地方算在連到這幾間房的通道上
    const seed = rnd() * 100, noise = (x, z) => Math.sin(x * 0.31 + seed) * Math.cos(z * 0.27 - seed) + Math.sin((x + z) * 0.13 + seed * 2) * 0.6;
    for (let tz = tZ(z0); tz <= tZ(z1); tz++) for (let tx = tX(x0); tx <= tX(x1); tx++) {
      if (tx < 1 || tz < 1 || tx >= nx - 1 || tz >= nz - 1) continue;
      const x = cX(tx), z = cZ(tz), edge = Math.min(x - x0, x1 - x, z - z0, z1 - z); const k = id(tx, tz);
      if (T[k] === FLOOR) { was.add(k); inZone.push(k); continue; }
      if (edge < 2.5 + (noise(x, z) + 1.6) * 1.4) continue;   // 邊緣不規則
      T[k] = FLOOR; RM[k] = -1; if (zli >= 0) t.CR[k] = zli; inZone.push(k);
    }
    // 岩塊：只放在新打出來的地方（原本的通道、房間不擋），放完要還是連通
    const zs = new Set(inZone), rocks = new Set();
    for (let n = 0; n < 10 + Math.floor(rnd() * 6); n++) {
      const k = pick(inZone); if (was.has(k)) continue; const tx = k % nx, tz = (k - tx) / nx, w = 1 + Math.floor(rnd() * 2), h = 1 + Math.floor(rnd() * 2), blob = [];
      let ok = true; for (let dz = -1; dz <= h; dz++) for (let dx = -1; dx <= w; dx++) { const m = id(tx + dx, tz + dz); if (!zs.has(m) || was.has(m) || rocks.has(m)) ok = false; }
      if (!ok) continue; for (let dz = 0; dz < h; dz++) for (let dx = 0; dx < w; dx++) blob.push(id(tx + dx, tz + dz));
      blob.forEach(m => rocks.add(m));
      const rest = inZone.filter(m => !rocks.has(m)), seen = new Set([rest[0]]), st = [rest[0]];
      while (st.length) { const m = st.pop(), mx = m % nx, mz = (m - mx) / nx; N4.forEach(([dx, dz]) => { const q = id(mx + dx, mz + dz); if (zs.has(q) && !rocks.has(q) && !seen.has(q)) { seen.add(q); st.push(q); } }); }
      if (seen.size !== rest.length) blob.forEach(m => rocks.delete(m));
    }
    rocks.forEach(m => { T[m] = WALL; RM[m] = -1; });
    // 牆：打出來的地板旁邊的空格
    for (let tz = Math.max(0, tZ(z0) - 2); tz <= Math.min(nz - 1, tZ(z1) + 2); tz++) for (let tx = Math.max(0, tX(x0) - 2); tx <= Math.min(nx - 1, tX(x1) + 2); tx++) {
      const k = id(tx, tz); if (T[k] !== VOID) continue;
      let near = false; for (let dz = -1; dz <= 1 && !near; dz++) for (let dx = -1; dx <= 1; dx++) { const x = tx + dx, z = tz + dz; if (x < 0 || z < 0 || x >= nx || z >= nz) continue; if (T[id(x, z)] === FLOOR) { near = true; break; } }
      if (near) T[k] = WALL;
    }
    B.rs.forEach(r => { r.cleared = true; r.open = 1; r.traps = 0; r.doors = []; if (r.type === 'trap') r.type = 'fight'; });
    F.zone = { x0, x1, z0, z1, tiles: inZone.filter(k => T[k] === FLOOR), cap: 7 + 2 * run.grade.lv, left: 30 + 10 * run.grade.lv, t: 2, entered: false };
  };
  // 一開始先放一半的量在裡面走動
  const spawnOne = (F, run, P, near) => {
    const Z = F.zone, t = F.tile; if (!Z || Z.left <= 0) return null;
    for (let i = 0; i < 30; i++) {
      const k = pick(Z.tiles), tx = k % t.nx, tz = (k - tx) / t.nx, x = t.cX(tx), z = t.cZ(tz), d = P ? Math.hypot(x - P.x, z - P.z) : 99;
      if (near ? (d < 13 || d > 26) : d < 14) continue;
      const id = R.pickEnemyId ? R.pickEnemyId(run.grade.pool, run) : pick(run.grade.pool); if (!R.ENEMIES[id] || R.ENEMIES[id].boss) continue;
      const e = R.spawnEnemy(id, x, z, -1, { quiet: !near }); if (!e) return null; e.zone = true; Z.left--; if (near) R.fx && R.fx('spawn', x, 0.1, z, { color: '#6A4A8A' }); return e;
    }
    return null;
  };
  const pf0 = R.populateFloor;
  R.populateFloor = () => {
    const r = pf0(); const F = W.F, run = W.run;
    if (F && F.zone && run) { const n = Math.ceil(F.zone.cap / 2); for (let i = 0; i < n; i++) spawnOne(F, run, W.P, false); }
    return r;
  };
  const step0 = R.step;
  R.step = dt => {
    step0(dt);
    const F = W.F, run = W.run, P = W.P; if (!F || !F.zone || !run || !P || run.done) return;
    const Z = F.zone, inside = P.x > Z.x0 - 4 && P.x < Z.x1 + 4 && P.z > Z.z0 - 4 && P.z < Z.z1 + 4;
    if (!inside) return;
    if (!Z.entered) { Z.entered = true; R.banner('大空洞', '這一區沒有房門的膜，遺跡生物會從地面一直湧出來——別待太久。'); }
    Z.t -= dt; if (Z.t > 0) return; Z.t = 2.5 + rnd() * 2.5;
    const alive = (W.enemies || []).filter(e => e.zone && !e.dead).length;
    if (alive < Z.cap) { const e = spawnOne(F, run, P, true); if (e) e.aggro = Math.hypot(e.x - P.x, e.z - P.z) < 18; }
  };
  R.zoneDebug = { openZone };
})(window.R);
