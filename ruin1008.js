// 2026-10-08 作者回饋（遺跡）
// - 卡索級：待在裡面理智會一直掉——每 10 秒 −1。
// - 武器附魔：霜寒（冰）＝遺跡生物受到的擊退減半（近戰不會一直把敵人推走）；疾風（風）＝攻擊範圍 +30%、擊退加倍。
//   照武器身上有沒有那一種附魔（ws.frost、ws.wind，elements1008.js）。附魔的說明也加上這一句。
// 放在 elements1008.js、san.js 後面。
(function (R) {
  const W = () => R.W;
  // ---------- 卡索級的理智 ----------
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), run = W().run;
    if (run && !run.done && run.grade && run.grade.id === 'kaso' && R.sanAdd && !W().paused) {
      run._sanT = (run._sanT || 0) + dt;
      while (run._sanT >= 10) { run._sanT -= 10; R.sanAdd(-1); }
    }
    return r;
  };
  // ---------- 擊退：冰減半、風加倍 ----------
  const kbK = () => { const P = W().P, ws = P && P.ws; if (!ws) return 1; return ((ws.frost || 0) > 0 ? 0.5 : 1) * ((ws.wind || 0) > 0 ? 2 : 1); };
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    if (!e || e.dead || (o && o.dot)) return he0(e, raw, o);
    const kx = e.kx || 0, kz = e.kz || 0, r = he0(e, raw, o), k = kbK();
    if (k !== 1 && !e.dead) { e.kx = kx + ((e.kx || 0) - kx) * k; e.kz = kz + ((e.kz || 0) - kz) * k; }
    return r;
  };
  // ---------- 風：攻擊範圍 +30% ----------
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try { const ws = P && P.ws; if (ws && (ws.wind || 0) > 0) { ws.range = (ws.range || 2) * 1.3; if (ws.arc) ws.arc *= 1.3; } } catch (e) { }
    return P;
  };
  // ---------- 說明 ----------
  const fix = () => { (R.W_AFFIX || []).forEach(a => { if (!a || a._1008) return; if (a.id === 'frost') { const t0 = a.txt; a.txt = v => t0(v) + '；遺跡生物受到的擊退減半'; a._1008 = 1; } if (a.id === 'wind') { const t0 = a.txt; a.txt = v => t0(v) + '；攻擊範圍 +30%、擊退加倍'; a._1008 = 1; } }); };
  fix(); setTimeout(fix, 0);
})(window.R);
