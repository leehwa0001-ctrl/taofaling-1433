// 遺跡的機關變狠（2026-10-05 作者：遺跡裡的機關的傷害太低，效果也不夠極端）
// 原本：地上的釘板一下 10＋分級×6（16～40 點，對幾百的生命不痛不癢）；克森特級生物撒的撒菱一下 6＋分級×2；兵工廠的地刺、絞肉機也偏輕。
// 現在：
// - 釘板（run.js 呼叫 R.trapHit）：一下＝生命上限的 14%＋分級×3%，再加分級×8（哈米莉亞級 17%、卡索級 29%）；
//   刺穿腳底：重傷 5 秒（受到的治療 −60%，debuff.js）、腳步慢 1.2 秒；機關房（整間都是釘板）的再加破防 4 秒。
//   遺跡生物踩到：生命上限的 15%＋20、定住 1 秒。
// - 撒菱：一下＝生命上限的 5%＋分級×4，踩到慢 1.5 秒，留 24 秒（原本 16 秒）。
// - 兵工廠（forge.js 改數字）：地刺 13%→22%×深度、絞肉機每一下 4.5%→7%×深度。
// 斗笠（headgear.js）照樣擋三成。
// 放在 run.js、debuff.js 後面。
(function (R) {
  const W = () => R.W;
  const glv = () => { const run = W().run; return (run && run.grade && run.grade.lv) || 1; };
  R.trapHit = (kind, o, tp) => {
    const w = W(), P = w.P, lv = glv();
    if (kind !== 'spike') return;
    if (o === P) {
      if (P.dead) return;
      R.hurtPlayer(P.hpMax * (0.14 + 0.03 * lv) + 8 * lv, null);
      P.slowT = Math.max(P.slowT || 0, 1.2);
      if (R.playerDebuff) { R.playerDebuff('heal', 5); const r = R.roomAt ? R.roomAt(tp.x, tp.z) : null; if (r && r.type === 'trap') R.playerDebuff('armor', 4); }
      R.fx && R.fx('spark', P.x, 0.4, P.z, { color: '#C83A3A' }); R.shake && R.shake(0.12);
    } else if (o && !o.dead) {
      R.hurtEnemy(o, (o.hpMax || 0) * 0.15 + 20, {});
      if (o.st) o.st.root = Math.max(o.st.root || 0, 1);
    }
  };
  // 撒菱：更痛、更慢、留更久
  const az0 = R.addZone;
  R.addZone = z => {
    if (z && z.kind === 'caltrop' && !z.own && W().run) { const P = W().P; z.dmg = Math.max(z.dmg || 0, (P ? P.hpMax * 0.05 : 0) + glv() * 4); z.life = Math.max(z.life || 0, 24); z.tp = 1; }
    return az0(z);
  };
  const uz0 = R.updateZones;
  R.updateZones = dt => {
    const r = uz0(dt), w = W(), P = w.P;
    if (P && !P.dead && !P.air && w.zones) for (const z of w.zones) if (!z.dead && z.kind === 'caltrop' && z.tp && Math.hypot(P.x - z.x, P.z - z.z) < z.r) { P.slowT = Math.max(P.slowT || 0, 1.5); break; }
    return r;
  };
})(window.R);
