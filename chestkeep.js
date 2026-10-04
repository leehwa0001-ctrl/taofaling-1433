// 回到同一層，寶箱照舊（2026-10-04 作者：避免玩家一直上下來回層數刷到比較近有寶箱的地形——寶箱的位置是不會更改的，但地形會）
// 遺跡一直在長，往回走、再下來，那一層的地形會重新長過（run.js 的 R.ascend）；原本寶箱也跟著重新放、重新裝滿，
// 所以可以上下來回刷，刷到寶箱離樓梯很近、或再開一次新的寶箱。
// 現在一趟遺跡裡每一層的寶箱記下來（離開那一層的時候：位置、等級、開過幾次、開著還是關著、是不是偽箱）：
//   再回到那一層，地形照樣重新長，新長出來的寶箱拿掉，換成記下來的那幾個，放回原本的位置（那裡變成牆或外面的話，找最近一塊放得下的房間地板）。
//   開過的照樣是開過的（刷新的規則照舊）；被咬過的偽箱不會再出現。
// 多人連線的遺跡不管（各自的電腦上寶箱要一樣）。
// 放在所有包 R.loadFloor、會加寶箱的檔案後面（ruinvar.js 的寶藏、colony.js……）。
(function (R) {
  const W = () => R.W;
  // 放得下一個寶箱（1.6×1.1）的地方：四個角和中間都是地板、沒有被擋住
  const fits = (x, z) => [[0, 0], [-0.9, -0.65], [0.9, -0.65], [-0.9, 0.65], [0.9, 0.65]].every(([dx, dz]) => R.isFloor(x + dx, z + dz) && !R.pointBlocked(x + dx, z + dz));
  const spotNear = (x, z) => {
    if (fits(x, z)) return [x, z];
    for (let rad = 0.6; rad <= 8; rad += 0.6) for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, px = x + Math.sin(a) * rad, pz = z + Math.cos(a) * rad; if (fits(px, pz)) return [px, pz]; }
    // 附近都沒有（新長出來的地形整片換了位置）：整層找離原本位置最近、放得下的那一格
    const t = W().F && W().F.tile; let best = null, bd = 1e9;
    if (t) for (let k = 0; k < t.T.length; k++) { if (t.T[k] !== 1 || (t.RM && t.RM[k] < 0)) continue; const tx = k % t.nx, tz = (k - tx) / t.nx, px = t.cX(tx), pz = t.cZ(tz), d = Math.hypot(px - x, pz - z); if (d < bd && fits(px, pz)) { bd = d; best = [px, pz]; } }
    return best || (R.openFloorNear ? R.openFloorNear(x, z) : [x, z]);
  };
  const snap = F => F.chests.map(c => ({ x: c.homeX != null ? c.homeX : c.x, z: c.homeZ != null ? c.homeZ : c.z, tier: c.tier, opened: c.opened || 0, state: c.state, refresh: c.refresh || 0, mimic: !!c.mimic }));
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const w = W(), run = w.run;
    if (run && !run.coop && w.F && w.F.keepRun === run && w.F.chests) { run.chestMemo = run.chestMemo || {}; run.chestMemo[w.F.keepFloor] = snap(w.F); }
    const r = lf0(f, o), F = W().F;
    try {
      if (run && F && W().run === run && !run.coop) {
        F.keepRun = run; F.keepFloor = run.floor;
        const memo = run.chestMemo && run.chestMemo[run.floor];
        if (memo && F.group && R.addChest) {
          (F.chests || []).forEach(c => { if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh); if (c.col) c.col.on = false; });
          F.chests = [];
          memo.forEach(m => {
            const [x, z] = spotNear(m.x, m.z), room = R.roomIndexAt ? R.roomIndexAt(x, z) : -1, c = R.addChest(F.group, F, x, z, m.tier, room);
            c.opened = m.opened; c.mimic = m.mimic; c.refresh = m.refresh; c.homeX = m.x; c.homeZ = m.z;   // 記原本的位置：來回幾次都從原本的位置找，不會越挪越遠
            if (m.state !== 'closed') { c.state = m.state; c.lid.rotation.x = m.state === 'open' ? -1.9 : 0; }
          });
        }
      }
    } catch (e) { console.warn('[chestkeep]', e); }
    return r;
  };
})(window.R);
