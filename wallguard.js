// 遺跡生物不穿牆（作者 2026-10-04：兵工廠的敵人會穿牆跑出去）
// 原因：R.collide 只會把圓推出方塊、往最近的那一邊推。跑得快的（三連貂衝刺一秒十幾公尺、無主大鎧的突進）、被打飛的、
//   畫面卡的時候一格走太遠，越過牆的一半就被推到牆的另一邊，跑進隔壁房間或地圖外面；站在門口的時候房門的膜關起來，
//   也會被往旁邊推進牆裡。
// 做法：
// - 包 R.updateEnemies 最外面：記下每一隻這一格開始的位置，更新完如果站進牆裡、地圖外，或這一步穿過了牆，就退回原位
//   （擊退、衝刺也停掉）。貼著牆走照舊會滑（那種一步不會穿過牆）。
// - 包 R.step：別的地方也會推遺跡生物（技能的拉、場地的暗流、輸送帶……），一格結束時還站在牆裡、地圖外的，放回上一次站得好好的地方。
// - 跳起來的（領主體的跳躍）不管；本來就卡在牆裡、又沒有站好過的放它出來。
// - 2026-10-05 作者又回報怪物會穿牆：原本「身體離地 0.8 公尺以上」的都不管，撲擊、跳著走、吊在天花板的生物跳一下就越過牆；
//   在 R.updateEnemies 以外移動的（延遲的撲擊、拉、換位）只看停下來的地方，沒看路上有沒有穿過牆。
//   現在只有領主體、遺跡核心的跳躍不管；R.step 結束時也看「從上一次站好的地方到現在」有沒有穿過牆，穿過就放回去。
//   會飛的照設定飛得過深淵（深淵不算牆），牆照樣擋。
// - 2026-10-05 作者：幻尾狐會這樣——幻影是在狐狸身邊亂數 ±2 公尺再找「最近的地板」，狐狸靠牆的時候最近的地板在牆後面，
//   幻影就從牆後面冒出來。所有「生物生出生物」（幻影、分身、分裂、叫小兵）都一樣：生的地方跟生的那隻中間隔著牆，就改生在那隻身上。
//   在 R.updateEnemies 裡生的，看離生的地方最近的那隻（6 公尺內）；死掉分裂的，看死掉的那隻。
// 放在 region.js 後面（所有遺跡生物的 AI 後面）。
(function (R) {
  const W = () => R.W;
  // 牆、地圖外擋；深淵只擋不會飛的
  const ok = (e, x, z) => { if (R.isFloor(x, z)) return true; const k = R.tileKind(x, z); return k === 3 && !!(e && e.def && e.def.fly); };
  const crossed = (x0, z0, x1, z1, e) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25); for (let i = 1; i < n; i++) { const k = i / n; if (!ok(e, x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)) return true; } return false; };
  const air = e => !!(e.leap && e.def && (e.def.boss || /^領主體/.test(e.def.name || '')));   // 只有領主體、核心的跳躍可以越過去
  const put = (e, x, z) => { e.x = x; e.z = z; e.kx = e.kz = 0; if (e.dashT > 0) e.dashT = 0; if (e.dash) e.dash = null; if (e.m && e.m.g) { e.m.g.position.x = x; e.m.g.position.z = z; } };
  const live = w => w && w.run && w.F && w.F.tile && w.enemies;
  // 生物生出來的生物：不生在牆後面
  let src = null, inAI = false;
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const w = W();
    if ((inAI || src) && live(w) && typeof x === 'number' && typeof z === 'number') {
      let from = src && !src.fake ? src : null;
      if (!from) { let bd = 6; for (const q of w.enemies) { if (q.dead) continue; const d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; from = q; } } }
      if (from && Math.hypot(from.x - x, from.z - z) < 6 && ok(from, from.x, from.z) && crossed(from.x, from.z, x, z, null)) { x = from.x; z = from.z; }   // 遠的（遺跡的反應在別處叫出來的）不管
    }
    return se0(id, x, z, room, o);
  };
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => { const s0 = src; src = e; try { return ke0(e, by); } finally { src = s0; } };
  const ue0 = R.updateEnemies;
  R.updateEnemies = dt => {
    const w = W(); if (!live(w)) return ue0(dt);
    const before = w.enemies.map(e => [e, e.x, e.z]);
    let r; inAI = true; try { r = ue0(dt); } finally { inAI = false; }
    for (const [e, x0, z0] of before) {
      if (e.dead || (e.x === x0 && e.z === z0) || air(e) || !ok(e, x0, z0)) continue;
      // 原本就在方塊裡（關起來的房門裡）：留在地板上就好；原本好好的：不能走進方塊
      if (ok(e, e.x, e.z) && !crossed(x0, z0, e.x, e.z, e) && (R.pointBlocked(x0, z0) || !R.pointBlocked(e.x, e.z))) continue;
      put(e, x0, z0);
    }
    return r;
  };
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), w = W(); if (!live(w)) return r;
    for (const e of w.enemies) {
      if (e.dead || air(e)) continue;
      if (!ok(e, e.x, e.z) || (e.wgx != null && (e.x !== e.wgx || e.z !== e.wgz) && crossed(e.wgx, e.wgz, e.x, e.z, e))) { if (e.wgx != null) put(e, e.wgx, e.wgz); }
      else if (!R.pointBlocked(e.x, e.z)) { e.wgx = e.x; e.wgz = e.z; }
    }
    return r;
  };
})(window.R);
