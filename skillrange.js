// 射程加成也算到技能（2026-10-04 作者：攻擊距離增加目前只有增加普通攻擊距離而已，感覺技能類的也可以加？）
// - 被動（鷹眼……）、種族（精靈、巨人……）的「射程 +%」原本只乘在武器的射程上（R.calcPlayer 的 P.ws.range）。
// - 現在算出 P.rangeMult（你的射程 ÷ 這把武器本身的射程），放技能的時候：
//   技能的射程（range）、長度（len、reach、jump）照這個倍率拉長；範圍半徑（r、hitR、radius、splash、width）也照射程倍率一起放大。
// - 包 skillbook.js 的每一種技能的「型」（R.SKILL_TYPES）；combat.js 原本的技能不經過這裡，不受影響。
// 放在 skillbook.js、skillbook2.js、adv2more.js 後面（所有加技能型的檔案後面）。
(function (R) {
  const W = () => R.W;
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try { const base = P.item && R.weaponStats ? R.weaponStats(P.item).range : 0; P.rangeMult = base && P.ws && P.ws.range ? Math.max(1, Math.min(2, P.ws.range / base)) : 1; } catch (e) { P.rangeMult = 1; }
    return P;
  };
  const LEN = ['range', 'len', 'reach', 'jump'], RAD = ['r', 'hitR', 'radius', 'splash', 'width'];
  const scale = (s, P) => {
    const m = P && P.rangeMult || 1; if (m <= 1.001 || !s) return s;
    const o = Object.assign({}, s);
    LEN.forEach(k => { if (typeof o[k] === 'number' && o[k] > 0.2) o[k] *= m; });   // range 0.1 這種是「在腳下」，不拉
    RAD.forEach(k => { if (typeof o[k] === 'number') o[k] *= m; });
    if (o.end && typeof o.end === 'object') { o.end = Object.assign({}, o.end); if (typeof o.end.r === 'number') o.end.r *= m; }
    return o;
  };
  const T = R.SKILL_TYPES || {};
  Object.keys(T).forEach(k => { const f = T[k]; if (typeof f !== 'function' || f.__ranged) return; const g = (s, P, w, pw) => f(scale(s, P), P, w, pw); g.__ranged = 1; T[k] = g; });
})(window.R);
