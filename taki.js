// 望月瀧下遺跡：特攻段（2836 年，作者定的）——比一般的隊友強很多。
// - 數值：生命、傷害、出手速度、移動都比同等級的刀客高；等級跟著你但多 12 級（至少 15、最多她本來的 40）。
// - 步法：被打的時候三成五躲開（「閃」），躲不開的傷害也少三成。
// - 居合・一閃：身邊 4.6 公尺內有遺跡生物，每 5.5 秒拔刀一次，砍到身邊全部的敵人。
(function (R) {
  const W = () => R.W;
  const isTaki = m => m && m.story === 'taki';
  const as0 = R.allyStats;
  R.allyStats = m => {
    const st = as0(m); if (!isTaki(m)) return st;
    return Object.assign(st, { hpMax: Math.round(st.hpMax * 1.9), dmg: st.dmg * 2.3, rate: st.rate * 1.35, range: st.range + 0.4, speed: st.speed * 1.2, def: st.def + 9, taki: true });
  };
  const ha0 = R.hurtAlly;
  R.hurtAlly = (a, raw, src) => {
    if (a && isTaki(a.m) && !a.downed && !(a.iframe > 0)) {
      if (Math.random() < 0.35) { a.iframe = 0.3; R.num(a.x, 2.2, a.z, '閃', 'heal'); return; }
      raw *= 0.7;
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
      const near = (w.enemies || []).filter(e => !e.dead && Math.hypot(e.x - a.x, e.z - a.z) < 4.6 + (e.def ? e.def.size * 0.4 : 0));
      if (!near.length) { a.iai = 0.4; return; }
      a.iai = 5.5; a.h.swing = 0.3;
      R.fx('ring', a.x, 0.1, a.z, { r: 4.6, color: '#BFE8FF' });
      near.forEach(e => { R.fx('slash', e.x, 1, e.z, { a: Math.atan2(e.x - a.x, e.z - a.z), len: 2 }); R.allyHit(e, a.st.dmg * 2.6, a); });
      R.num(a.x, 2.6, a.z, '一閃', 'heal');
      R.sfx && R.sfx('swing');
    });
  };
})(window.R);
