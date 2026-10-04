// 遺跡生物不穿牆（作者 2026-10-04：兵工廠的敵人會穿牆跑出去）
// 原因：R.collide 只會把圓推出方塊、往最近的那一邊推。跑得快的（三連貂衝刺一秒十幾公尺、無主大鎧的突進）、被打飛的、
//   畫面卡的時候一格走太遠，越過牆的一半就被推到牆的另一邊，跑進隔壁房間或地圖外面；站在門口的時候房門的膜關起來，
//   也會被往旁邊推進牆裡。
// 做法：
// - 包 R.updateEnemies 最外面：記下每一隻這一格開始的位置，更新完如果站進牆裡、地圖外，或這一步穿過了牆，就退回原位
//   （擊退、衝刺也停掉）。貼著牆走照舊會滑（那種一步不會穿過牆）。
// - 包 R.step：別的地方也會推遺跡生物（技能的拉、場地的暗流、輸送帶……），一格結束時還站在牆裡、地圖外的，放回上一次站得好好的地方。
// - 跳起來的（領主體的跳躍）不管；本來就卡在牆裡、又沒有站好過的放它出來。
// 放在 region.js 後面（所有遺跡生物的 AI 後面）。
(function (R) {
  const W = () => R.W;
  const crossed = (x0, z0, x1, z1) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25); for (let i = 1; i < n; i++) { const k = i / n; if (!R.isFloor(x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)) return true; } return false; };
  const air = e => e.leap || (e.m && e.m.g && e.m.g.position.y > 0.8);
  const put = (e, x, z) => { e.x = x; e.z = z; e.kx = e.kz = 0; if (e.dashT > 0) e.dashT = 0; if (e.dash) e.dash = null; if (e.m && e.m.g) { e.m.g.position.x = x; e.m.g.position.z = z; } };
  const live = w => w && w.run && w.F && w.F.tile && w.enemies;
  const ue0 = R.updateEnemies;
  R.updateEnemies = dt => {
    const w = W(); if (!live(w)) return ue0(dt);
    const before = w.enemies.map(e => [e, e.x, e.z]);
    const r = ue0(dt);
    for (const [e, x0, z0] of before) {
      if (e.dead || (e.x === x0 && e.z === z0) || air(e) || !R.isFloor(x0, z0)) continue;
      // 原本就在方塊裡（關起來的房門裡）：留在地板上就好；原本好好的：不能走進方塊
      if (R.isFloor(e.x, e.z) && !crossed(x0, z0, e.x, e.z) && (R.pointBlocked(x0, z0) || !R.pointBlocked(e.x, e.z))) continue;
      put(e, x0, z0);
    }
    return r;
  };
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), w = W(); if (!live(w)) return r;
    for (const e of w.enemies) {
      if (e.dead || air(e)) continue;
      if (!R.isFloor(e.x, e.z)) { if (e.wgx != null) put(e, e.wgx, e.wgz); }
      else if (!R.pointBlocked(e.x, e.z)) { e.wgx = e.x; e.wgz = e.z; }
    }
    return r;
  };
})(window.R);
