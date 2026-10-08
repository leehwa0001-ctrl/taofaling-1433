// 遺跡裡不會跑到牆外（2026-10-08 作者回報：三羽鴉一直瞬移出牆外；被領主體踢出牆外、在牆外被暴風雪凍死）
// - 遺跡生物的瞬移（monsters6～8.js 的 floorAt）改成 R.openFloorNear：要是空地（不在牆、柱子的碰撞裡），
//   落點離你 12 公尺以內的話，還要從你那裡直線看得到（不會隔著牆跑到另一邊）。
// - 保險：每一格檢查你、隊友、遺跡生物的位置——落在牆裡、地圖外（VOID、WALL 的格子）就拉回最近的空地
//   （被擊退、被踢飛、瞬移都算）。深淵（PIT）照舊（掉下去是遊戲的一部分）。連線的時候，遺跡生物只由房主拉回。
// 放在 monsters*.js、lords.js 後面。
(function (R) {
  const W = () => R.W;
  const T = R.TILE || { VOID: 0, FLOOR: 1, WALL: 2, PIT: 3 };
  const bad = (x, z) => { if (!R.tileKind || !W().F) return false; const k = R.tileKind(x, z); return k === T.VOID || k === T.WALL; };
  // 拉回：先找附近的空地；離地板太遠（找不到）就回到上一個安全的位置（每一格記著 o._safe）
  const back = (o, from) => { let p = R.openFloorNear ? R.openFloorNear(o.x, o.z, from) : R.nearestFloor(o.x, o.z); if (!p || bad(p[0], p[1])) p = o._safe; if (!p || bad(p[0], p[1])) return false; o.x = p[0]; o.z = p[1]; return true; };
  const mark = o => { if (!bad(o.x, o.z)) o._safe = [o.x, o.z]; };
  // 給 monsters*.js 用的落點
  R.safeLand = (x, z) => {
    const P = W().P; if (!R.openFloorNear) return R.nearestFloor ? R.nearestFloor(x, z) : [x, z];
    const near = P && W().run && Math.hypot(P.x - x, P.z - z) < 12;
    const p = R.openFloorNear(x, z, near ? [P.x, P.z] : null);
    return p && !bad(p[0], p[1]) ? p : (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  };
  const coopGuest = () => { const run = W().run; return !!(R.net && R.net.inRoom && R.net.inRoom() && run && run.coop && !run.coop.solo && !run.coop.host); };
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), w = W(), run = w.run, P = w.P;
    if (!run || run.done || !w.F) return r;
    try {
      if (P && !P.dead) mark(P);
      (w.enemies || []).forEach(e => { if (e && !e.dead) mark(e); });
      if (P && !P.dead && bad(P.x, P.z)) { if (back(P)) { P.kx = 0; P.kz = 0; P.knockT = 0; if (P.h && P.h.g) P.h.g.position.set(P.x, P.h.g.position.y, P.z); } }
      (w.allies || []).forEach(a => { if (a && !a.dead && bad(a.x, a.z) && back(a) && a.h && a.h.g) a.h.g.position.set(a.x, a.h.g.position.y, a.z); });
      if (!coopGuest()) (w.enemies || []).forEach(e => { if (!e || e.dead || e.tdummy) return; if (bad(e.x, e.z) && back(e, P && Math.hypot(P.x - e.x, P.z - e.z) < 12 ? [P.x, P.z] : null)) { e.kx = 0; e.kz = 0; if (e.m && e.m.g) e.m.g.position.set(e.x, e.m.g.position.y, e.z); } });
    } catch (err) { console.warn('[ruinsafe]', err); }
    return r;
  };
})(window.R);
