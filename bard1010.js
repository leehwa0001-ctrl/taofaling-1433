// 吟遊詩人的樂句：前期普攻也算一個音（2026-10-10 作者：那個職業特效初期超級沒用，根本疊不到 3 個技能）
// 技能欄 1～2 級只有 1 格、3～5 級 2 格，最早的兩首曲子（進行曲 攻守攻、安魂曲 攻攻治）都要兩種以上的技能，前期幾乎湊不出來。
// 所以：職業等級 20 以前，普攻打中也算一個「攻」（每 2 秒最多一個，打中一群也只算一個）。20 級以後技能欄滿了，照原本只算技能。
// 例：普攻 → 激昂之歌（守）→ 普攻 ＝ 進行曲；普攻 → 普攻 → 安魂曲（治）＝ 安魂曲。
// 放在 classcore2.js、bard1009.js 後面（包住 R.hurtEnemy、CORE.bard.help）。
(function (R) {
  const C = R.CORE && R.CORE.bard, W = R.W; if (!C || !C.onCast || !R.hurtEnemy) return;
  const LV = 20, GAP = 2;
  R.BARD_BASIC_LV = LV;
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, d, o, ...rest) => {
    const r = he0(e, d, o, ...rest);
    try {
      const P = W.P, run = W.run;
      if (o && o.primary && P && P.cls === 'bard' && (P.lv || 1) < LV && run && !run.done && !P.dead) {
        const t = R.coreTime ? R.coreTime() : run.t || 0;
        if (t - (P._bnT == null ? -99 : P._bnT) >= GAP) { P._bnT = t; C.onCast(P, -1, '__basic'); if (R.num) R.num(P.x, 2.3, P.z, '♪', 'heal'); }
      }
    } catch (err) { }
    return r;
  };
  const h0 = C.help;
  if (h0) C.help = P => h0(P) + ((P && (P.lv || 1) < LV) ? ' ' + LV + ' 級以前：普攻打中也算一個「攻」（每 ' + GAP + ' 秒最多一個）。' : '');
})(window.R);
