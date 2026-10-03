// 武術家的大招、光的顏色、外修者的魔力罩（2026-10-04 新職業；職業、武器、技能、被動在 data.js、skillbook.js、passives.js）
// 大招「天崩拳」：一步一步閃到附近的遺跡生物面前各打一拳，最後一拳打在地上，震飛周圍。
// 放在 ult.js 後面。
(function (R) {
  const W = () => R.W;
  if (R.CLASS_GLOW) R.CLASS_GLOW.monk = '#FFB45A';
  const later = (f, ms) => { const run = W().run; setTimeout(() => { const w = W(); if (w.run === run && w.P && !w.P.dead && run && !run.done) f(); }, ms); };
  const base = P => { const ws = P.ws || {}; return (ws.dmg || 10) * (ws.hits || 1) * (P.dmgMult || 1); };
  if (R.ULTS) R.ULTS.monk = {
    name: '天崩拳', sub: '武術家的大招：閃到附近的遺跡生物面前各打一拳，最後一拳打在地上',
    go: P => {
      const b = base(P), w = W(); P.iframe = Math.max(P.iframe || 0, 2.2);
      const tg = (w.enemies || []).filter(e => !e.dead && !e.under && Math.hypot(e.x - P.x, e.z - P.z) < 12).sort((p, q) => Math.hypot(p.x - P.x, p.z - P.z) - Math.hypot(q.x - P.x, q.z - P.z)).slice(0, 6);
      tg.forEach((e, i) => later(() => {
        if (e.dead) return; const a = Math.atan2(e.x - P.x, e.z - P.z), d = Math.max(0, Math.hypot(e.x - P.x, e.z - P.z) - 1.1);
        R.fx('blink', P.x, 1, P.z); let nx = P.x + Math.sin(a) * d, nz = P.z + Math.cos(a) * d; if (R.nearestFloor) [nx, nz] = R.nearestFloor(nx, nz); P.x = nx; P.z = nz; if (R.collide) R.collide(P, 0.42);
        R.hurtEnemy(e, b * 3, { crit: true, kb: 3 }); R.fx('ring', e.x, 0.6, e.z, { r: 1.4, color: '#FFB45A' }); R.shake && R.shake(0.2);
      }, 150 + i * 160));
      later(() => { R.fx('boom', P.x, 0.3, P.z, { r: 5, color: '#FFB45A' }); R.fx('ring', P.x, 0.1, P.z, { r: 6, color: '#FFE0A0' }); R.aoe(P.x, P.z, 5, b * 6, { kb: 5 }); R.shake && R.shake(0.7); }, 300 + tg.length * 160);
    }
  };
  // 外修者的魔力罩：沒被打的時候慢慢長回來（最多擋生命的 15%）
  const st0 = R.step;
  if (st0) R.step = dt => {
    const r = st0(dt), P = W().P;
    try { if (P && P.wxShield && !P.dead && W().run) { const cap = P.hpMax * P.wxShield; if ((P.shield || 0) < cap && (P.hurtT || 0) <= 0) P.shield = Math.min(cap, (P.shield || 0) + cap * dt / 10); } } catch (e) { }
    return r;
  };
})(window.R);
