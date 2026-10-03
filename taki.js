// 望月瀧下遺跡：特攻段（2836 年，作者定的）——比一般的隊友強很多。
// - 數值：生命、傷害、出手速度、移動都比同等級的刀客高很多；等級跟著你但多 15 級（至少 20、最多她本來的 40）。
// - 步法：被打的時候四成五躲開（「閃」），躲不開的傷害也少四成。
// - 居合・一閃：身邊 5.2 公尺內有遺跡生物，每 4 秒拔刀一次，砍到身邊全部的敵人。
// - 2026-10-04 作者：瀧太弱了，可以加狠一點，而且有刀客沒有的特殊技能（戀人之後可以教玩家，takiteach.js）：
//   瀧落（每 11 秒：躍起，落進最密的那群遺跡生物裡，重傷、暈眩）、三圈一結（每 14 秒，身邊 3 隻以上：迴旋三刀，最後定住）、
//   靜水（生命剩四成以下：2 秒閃開所有攻擊、回復兩成五；30 秒一次）。
(function (R) {
  const W = () => R.W;
  const isTaki = m => m && m.story === 'taki';
  const as0 = R.allyStats;
  R.allyStats = m => {
    const st = as0(m); if (!isTaki(m)) return st;
    return Object.assign(st, { hpMax: Math.round(st.hpMax * 2.6), dmg: st.dmg * 3.2, rate: st.rate * 1.5, range: st.range + 0.5, speed: st.speed * 1.25, def: st.def + 14, taki: true });
  };
  const ha0 = R.hurtAlly;
  R.hurtAlly = (a, raw, src) => {
    if (a && isTaki(a.m) && !a.downed && !(a.iframe > 0)) {
      if (Math.random() < 0.45) { a.iframe = 0.3; R.num(a.x, 2.2, a.z, '閃', 'heal'); return; }
      raw *= 0.6;
    }
    ha0(a, raw, src);
  };
  const ua0 = R.updateAllies;
  R.updateAllies = dt => {
    ua0(dt);
    const w = W(); if (!w.run || w.paused) return;
    (w.allies || []).forEach(a => {
      if (!isTaki(a.m) || a.downed || a.dead) return;
      a.iai = (a.iai == null ? 2 : a.iai) - dt; if (a.iai > 0) return;
      const near = (w.enemies || []).filter(e => !e.dead && Math.hypot(e.x - a.x, e.z - a.z) < 5.2 + (e.def ? e.def.size * 0.4 : 0));
      if (!near.length) { a.iai = 0.4; return; }
      a.iai = 4; a.h.swing = 0.3;
      R.fx('ring', a.x, 0.1, a.z, { r: 5.2, color: '#BFE8FF' });
      near.forEach(e => { R.fx('slash', e.x, 1, e.z, { a: Math.atan2(e.x - a.x, e.z - a.z), len: 2 }); R.allyHit(e, a.st.dmg * 3.2, a); });
      R.num(a.x, 2.6, a.z, '一閃', 'heal');
      R.sfx && R.sfx('swing');
    });
    (w.allies || []).forEach(a => { if (isTaki(a.m) && !a.downed && !a.dead) special(a, w, dt); });
  };
  // ---------- 瀧落、三圈一結、靜水 ----------
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const foes = (w, x, z, r) => (w.enemies || []).filter(e => !e.dead && Math.hypot(e.x - x, e.z - z) < r + (e.def ? e.def.size * 0.4 : 0));
  const special = (a, w, dt) => {
    a.tkFall = (a.tkFall == null ? 4 : a.tkFall) - dt; a.tkKnot = (a.tkKnot == null ? 7 : a.tkKnot) - dt; a.tkStill = (a.tkStill || 0) - dt;
    // 靜水：快倒的時候
    if (a.tkStill <= 0 && a.hp < a.hpMax * 0.4) { a.tkStill = 30; a.iframe = 2; a.hp = Math.min(a.hpMax, a.hp + a.hpMax * 0.25); R.fx('ring', a.x, 0.1, a.z, { r: 2, color: '#BFE8FF' }); R.num(a.x, 2.6, a.z, '靜水', 'heal'); }
    // 三圈一結：被圍住的時候
    if (a.tkKnot <= 0) { const n = foes(w, a.x, a.z, 4); if (n.length >= 3) { a.tkKnot = 14; R.num(a.x, 2.6, a.z, '三圈一結', 'heal');
      for (let i = 0; i < 3; i++) later(() => { a.h.swing = 0.25; R.fx('ring', a.x, 0.1, a.z, { r: 4, color: '#9AD8FF' }); foes(w, a.x, a.z, 4).forEach(e => R.allyHit(e, a.st.dmg * 1.4, a)); }, i * 200);
      later(() => { R.fx('ring', a.x, 0.1, a.z, { r: 4.2, color: '#FFFFFF' }); foes(w, a.x, a.z, 4.2).forEach(e => { e.st.root = Math.max(e.st.root || 0, 2); R.allyHit(e, a.st.dmg * 1.2, a); }); }, 700); } else a.tkKnot = 1; }
    // 瀧落：落進最密的那一群
    if (a.tkFall <= 0) {
      const cand = foes(w, a.x, a.z, 10); if (!cand.length) { a.tkFall = 1; return; }
      const tg = cand.map(e => [e, foes(w, e.x, e.z, 3.5).length]).sort((p, q) => q[1] - p[1])[0][0]; a.tkFall = 11;
      R.num(a.x, 2.6, a.z, '瀧落', 'heal'); R.fx('mark', tg.x, 0, tg.z, { r: 3.5, t: 0.35 });
      later(() => { const [x, z] = R.nearestFloor ? R.nearestFloor(tg.x, tg.z) : [tg.x, tg.z]; a.x = x; a.z = z; a.iframe = Math.max(a.iframe || 0, 0.4); a.h.swing = 0.3;
        R.fx('boom', x, 0.3, z, { r: 3.5, color: '#BFE8FF' }); R.shake && R.shake(0.3); foes(w, x, z, 3.5).forEach(e => { e.st.stun = Math.max(e.st.stun || 0, 1); R.allyHit(e, a.st.dmg * 3.6, a); }); }, 350);
    }
  };
})(window.R);
