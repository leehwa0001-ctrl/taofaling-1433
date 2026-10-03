// 往下的路不只一條（作者 2026-10-03：遺跡不一定只有一個下去的入口，可以是複數的）
// - 最後一層以外，分區 6 個以上的樓層多一條樓層通道，11 個以上多兩條。挑離入口遠、最好是死路的戰鬥區，
//   那一區照樣有遺跡生物（不像原本的樓層通道區是空的），門口一樣有鳥居、地圖上一樣是 ▼。
// - 每一條都記在 F.stairsAll；F.stairs 隨時指向離你最近的那一條（互動、往下走、斷尾封路都照原本的寫法）。
// - 擺設是照「一條樓層通道」避開的，所以多出來那幾條上面的小擺設和它們的碰撞拿掉。
// 這個檔案要在 puzzle.js、lords.js 後面載入（謎題只鎖原本那一條）。
(function (R) {
  const W = () => R.W;
  const skip = run => !run || !run.site || run.site.id === 'kanko' || run.grade.id === 'hunt';
  const gf = R.genFloor;
  R.genFloor = (run, f) => {
    const F = gf(run, f);
    if (skip(run) || F.last || f >= run.floors - 1) return F;
    const n = F.rooms.length, want = n >= 11 ? 2 : n >= 6 ? 1 : 0; if (!want) return F;
    const main = F.rooms.find(r => r.type === 'stairs'); if (!main) return F;
    const near = r => Object.values(r.links).includes(main.i) || r === main;
    const cand = F.rooms.filter(r => r.type === 'fight' && r.dist >= 2 && !near(r) && !r.puzzle)
      .sort((a, b) => (Object.keys(a.links).length === 1 ? -10 : 0) - (Object.keys(b.links).length === 1 ? -10 : 0) + b.dist - a.dist);
    const took = [];
    for (const r of cand) { if (took.length >= want) break; if (took.some(t => Object.values(t.links).includes(r.i))) continue; r.type = 'stairs'; r.alt = 1; took.push(r); }
    return F;
  };
  // 每一條都記下來；多出來的那幾條，自己的模型記住（等一下清擺設不要清到）
  // 多出來的那幾條是一般的戰鬥區改的，房間中間可能已經有柱子、隔牆（dungeon.js 先擺結構才輪到這裡）：
  // 找一塊四周 3×3 格都是這一區的地板、附近沒有柱子的地方再放（作者 2026-10-04 回報：樓梯插在牆裡）
  // 從入口走得到的地板（作者 2026-10-04 回報：浮空樓梯——高塔型的房間中間是坑，樓梯擺在坑上走不過去）
  const reachSet = F => {
    if (F._reach) return F._reach; const t = F.tile, st = F.rooms[0], seen = new Uint8Array(t.nx * t.nz), k0 = t.id(t.tX(st.x), t.tZ(st.z)), q = [k0]; let n = 0;
    if (k0 < 0 || t.T[k0] !== 1) return (F._reach = null); seen[k0] = 1;
    while (q.length) { const k = q.pop(), tx = k % t.nx, tz = (k - tx) / t.nx; n++; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const m = t.id(tx + dx, tz + dz); if (m < 0 || seen[m] || t.T[m] !== 1) continue; seen[m] = 1; q.push(m); } }
    return (F._reach = n > 20 ? seen : null);
  };
  // 原本那一條（房間正中間）：中間是坑、四周不是地板、或走不到，就照多出來的那幾條一樣找空地
  const fine = (F, x, z) => { const t = F.tile; if (!t) return true; const tx = t.tX(x), tz = t.tZ(z), rs = reachSet(F); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (t.T[t.id(tx + dx, tz + dz)] !== 1) return false; return !rs || !!rs[t.id(tx, tz)]; };
  const clearSpot = (F, r, x, z) => {
    const t = F.tile; if (!t || !r.tiles) return [x, z];
    const rs = reachSet(F);
    const ok = (k, R2) => { if (rs && !rs[k]) return false; const tx = k % t.nx, tz = (k - tx) / t.nx; for (let dz = -R2; dz <= R2; dz++) for (let dx = -R2; dx <= R2; dx++) { const m = t.id(tx + dx, tz + dz); if (t.T[m] !== 1 || t.RM[m] !== r.i) return false; } const cx = t.cX(tx), cz = t.cZ(tz); for (const c of (R.boxesNear ? R.boxesNear(cx, cz) : [])) if (c.on && c.x1 > cx - 2.8 && c.x0 < cx + 2.8 && c.z1 > cz - 2.8 && c.z0 < cz + 2.8 && (c.tag === 'pillar' || c.tag === 'wall' || c.tag === 'block')) return false; return true; };
    // 5×5 格都是地板的找不到（高塔型的環形房間，地板帶比較窄）：放寬到 3×3、再放寬到 1 格——一定要從入口走得到
    let pickd = []; for (const R2 of [2, 1, 0]) { pickd = r.tiles.filter(k => ok(k, R2)); if (pickd.length) break; }
    if (!pickd.length) pickd = r.tiles.filter(k => t.T[k] === 1 && (!rs || rs[k]));
    const best = pickd.map(k => { const tx = k % t.nx, tz = (k - tx) / t.nx, cx = t.cX(tx), cz = t.cZ(tz); return [cx, cz, Math.hypot(cx - x, cz - z)]; }).sort((a, b) => a[2] - b[2])[0];
    return best ? [best[0], best[1]] : [x, z];
  };
  const as0 = R.addStairs;
  R.addStairs = (group, F, x, z, room, th) => {
    const r = F.rooms && F.rooms[room]; if (r && (r.alt || !fine(F, x, z))) [x, z] = clearSpot(F, r, x, z);
    const n0 = group.children.length; as0(group, F, x, z, room, th);
    const s = F.stairs; s.own = group.children.slice(n0);
    (F.stairsAll = F.stairsAll || []).push(s);
  };
  const clearAround = F => {
    (F.stairsAll || []).forEach(s => {
      if (s === F.stairsAll[F.stairsAll.length - 1]) return;   // 最後加的那一條，擺設本來就避開了
      const rr = 2.6, own = new Set(s.own || []);
      R.col.list.forEach(c => { if (!c.on || c.tag === 'wall') return; const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2; if (Math.hypot(cx - s.x, cz - s.z) < rr && (c.x1 - c.x0) < 3 && (c.z1 - c.z0) < 3) c.on = false; });
      (F.group ? F.group.children : []).forEach(m => {
        if (own.has(m) || !m.visible) return; const p = m.position; if (Math.hypot(p.x - s.x, p.z - s.z) > rr) return;
        const g = m.geometry; if (g && !g.boundingSphere) g.computeBoundingSphere && g.computeBoundingSphere();
        const rad = g && g.boundingSphere ? g.boundingSphere.radius * Math.max(m.scale.x, m.scale.y, m.scale.z) : 0.5;
        if (rad < 1.6) m.visible = false;
      });
    });
  };
  // 離你最近的那一條
  const nearest = () => {
    const F = W().F, P = W().P; if (!F || !F.stairsAll || F.stairsAll.length < 2 || !P) return;
    let best = F.stairs, bd = 1e9; F.stairsAll.forEach(s => { const d = Math.hypot(s.x - P.x, s.z - P.z); if (d < bd) { bd = d; best = s; } }); F.stairs = best;
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf0(f, o), F = W().F; if (F && F.stairsAll && F.stairsAll.length > 1) { try { clearAround(F); } catch (e) { console.warn('[stairs2]', e); } nearest(); } return r; };
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => { nearest(); return ni0(); };
  const de0 = R.descend;
  R.descend = () => { nearest(); return de0(); };
  let t = 0;
  const st0 = R.step;
  R.step = dt => { st0(dt); t -= dt; if (t <= 0) { t = 0.25; if (W().run) nearest(); } };
})(window.R);
