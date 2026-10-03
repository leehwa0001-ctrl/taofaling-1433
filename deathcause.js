// 玩家的死因（作者 2026-10-04：玩家死因可以加上）
// - 記下最後打到你的是什麼：遺跡生物（名字含〔特性〕）、地上的熔岩／毒霧／鐵菱、遺跡崩塌、不知道哪來的爆炸……
// - 倒下的結算畫面多一行「死因」；R.S.deathLog 記最近 20 次（哪一天、哪座遺跡、第幾層、死因）。
// 放在 combat.js、monsters*.js、zonefx.js 後面。
(function (R) {
  const W = () => R.W, esc = s => R.esc(s);
  const ZONE = { lava: '地上的熔岩（火焰）', caltrop: '地上的毒霧、鐵菱', web: '蛛網', trap: '陷阱' };
  let ctx = null;   // 正在處理地上效果的時候：這一下是哪一種
  const uz0 = R.updateZones;
  R.updateZones = dt => {
    const w = W(), P = w.P, hp0 = P ? P.hp : 0;
    let kind = null; if (P) for (const z of (w.zones || [])) if (z.kind !== 'sanct' && z.own !== 'p' && Math.hypot(P.x - z.x, P.z - z.z) < z.r + 0.5) { kind = z.kind; break; }
    ctx = kind ? ZONE[kind] || '地上的東西' : null;
    try { return uz0(dt); } finally { ctx = null; }
  };
  const nameOf = (src, dmg) => {
    if (dmg >= 9999) return '遺跡崩塌（核心倒下之後沒來得及回到回歸水晶）';
    if (src && src.def) return (src.def.human ? '' : '遺跡生物') + '「' + src.def.name + '」' + (src.leader ? '（群的頭目）' : '');
    if (src && src.name) return src.name;
    return ctx || '爆炸、或看不見的攻擊';
  };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (dmg, src, o) => {
    // 先記下來再扣血：扣到零的那一下會直接叫 R.onPlayerDown（那時候就要知道是誰）；沒打到（閃掉、無敵）再改回去
    const w = W(), P = w.P, run = w.run, before = P ? P.hp : 0, prev = run && run.lastHit;
    if (run && P && !P.dead && dmg > 0) run.lastHit = { who: nameOf(src, dmg), dmg: Math.round(Math.min(dmg, before)), t: run.t || 0, hp: before };
    const r = hp0(dmg, src, o);
    if (run && P && !P.dead && P.hp >= before) run.lastHit = prev; else if (run && P && run.lastHit && P.hp < before) run.lastHit.dmg = Math.round(before - Math.max(0, P.hp));
    return r;
  };
  const pd0 = R.onPlayerDown;
  R.onPlayerDown = (...a) => {
    const run = W().run, s = R.S;
    if (run && !run.done && run.lastHit) {
      const h = run.lastHit; run.deathCause = h.who + (h.dmg < 9999 ? '：最後一下 ' + h.dmg + ' 點傷害' : '');
      if (s) { s.deathLog = (s.deathLog || []).concat([{ day: s.day, site: run.site.name, floor: R.floorLabel ? R.floorLabel(run) : '第 ' + (run.floor + 1) + ' 層', cause: h.who }]).slice(-20); }
    }
    return pd0(...a);
  };
  const rs0 = R.results;
  R.results = (ok, full, lost) => {
    const r = rs0(ok, full, lost), run = W().run, box = document.getElementById('r-sheet');
    if (!ok && run && run.deathCause && box && !box.querySelector('.death-cause')) {
      const p = document.createElement('p'); p.className = 'death-cause'; p.innerHTML = '<b style="color:#FF7A6A">死因</b>：' + esc(run.deathCause);
      const h2 = box.querySelector('h2'); if (h2) h2.after(p); else box.prepend(p);
    }
    return r;
  };
})(window.R);
