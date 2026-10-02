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
  const as0 = R.addStairs;
  R.addStairs = (group, F, x, z, room, th) => {
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
