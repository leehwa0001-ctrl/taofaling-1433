// 武術家的攻速（2026-10-09 作者）：
// 武術家不吃裝備、天賦的攻速（只吃自己的「法」和被動、路線、技能的攻速）；裝備、天賦每 1% 攻速轉成普攻傷害 +0.5%（減攻速的也照比例減傷害）。
// 裝備、天賦的攻速在套用的地方記帳：items.js（武器的迅捷、沉重：ws.rateGear）、crafting.js（急速：P.rateGear）、gearplus.js（太重的護甲：P.rateGear）、
// talenttree.js（天賦樹：P.rateTal）、skillpoints.js（舊的天賦點：P.rateTal）。這裡在數值算完的最後把它們除掉，記成 P.monkRateDmg。
// 放在所有包 R.calcPlayer 的檔案後面（ruin1008.js 之後）。
(function (R) {
  const W = R.W;
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      if (cls === 'monk' && P && P.ws && P.ws.rate) {
        const g = (P.ws.rateGear || 1) * (P.rateGear || 1) * (P.rateTal || 1);
        P.monkRateDmg = 0;
        if (Math.abs(g - 1) > 1e-6) { P.ws.rate /= g; P.monkRateDmg = (g - 1) * 0.5; }
      }
    } catch (e) { console.warn('[monkspeed]', e); }
    return P;
  };
  // 普攻傷害
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { const P = W.P; return he0(e, P && P.cls === 'monk' && P.monkRateDmg && o && o.primary && !o.reflect ? raw * Math.max(0.1, 1 + P.monkRateDmg) : raw, o); };
  // 四法的說明多一句（X 鍵旁邊的說明、職業介紹）
  const C = R.CORE && R.CORE.monk;
  if (C && C.help) { const h0 = C.help; C.help = P => h0(P) + '裝備、天賦的攻速對武術家無效：每 1% 轉成普攻傷害 +0.5%' + (P && P.monkRateDmg ? '（現在 ' + (P.monkRateDmg > 0 ? '+' : '') + Math.round(P.monkRateDmg * 1000) / 10 + '%）' : '') + '。'; }
})(window.R);
