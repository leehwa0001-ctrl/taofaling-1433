// 職業平衡（作者 2026-10-03：戰士、騎士和技能、種族的搭配比較好，弓箭手、刀客和其他職業的搭配沒那麼強）
// - 基本數值在 data.js 改：弓 +20%、聖杖 +20%、弓箭手生命 86→94、刀客 102→112。
// - 種族加成照職業換算（races.js 已經加過一次，這裡再補，戰士、騎士不變）：
//   弓箭手、槍手：種族的「近戰傷害」也算在弓和槍上；暴擊率、暴擊傷害、翻滾冷卻的加成再多五成。
//   刀客：暴擊率、暴擊傷害、翻滾冷卻的加成再多五成；移動加成也變成攻擊速度。
//   術士、牧師：法術傷害的加成再多五成；生命的加成也加在魔力上。
// - 刀客的連斬：2 秒內接著打中，每一下傷害 +5%，最多 +25%（停手 2 秒就歸零）。
// 放在 prof.js 後面（包住 R.calcPlayer、R.hurtEnemy）。
(function (R) {
  const W = () => R.W;
  const RANGED = ['archer', 'gunner'], MAGIC = ['mage', 'priest'];
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls), r = R.raceOf && R.raceOf(); if (!r || !r.b) return P;
    try {
      const b = r.b, k = P.ws && P.ws.kind;
      if (RANGED.includes(cls)) {
        if (b.melee && (k === 'gun' || k === 'bow')) P.ws.dmg *= 1 + b.melee;
        if (b.crit) P.ws.crit += b.crit * 0.5; if (b.critMult) P.critMult += b.critMult * 0.5; if (b.dodge) P.dodgeCdMax *= 1 - b.dodge * 0.5;
      } else if (cls === 'blade') {
        if (b.crit) P.ws.crit += b.crit * 0.5; if (b.critMult) P.critMult += b.critMult * 0.5; if (b.dodge) P.dodgeCdMax *= 1 - b.dodge * 0.5;
        if (b.speed > 0) P.ws.rate *= 1 + b.speed;
      } else if (MAGIC.includes(cls)) {
        if (b.magic && k === 'magic') P.ws.dmg *= 1 + b.magic * 0.5;
        if (b.hp > 0) P.mpMax = Math.round(P.mpMax * (1 + b.hp));
      }
    } catch (e) { }
    return P;
  };
  // 刀客的連斬
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P, run = W().run;
    if (P && run && P.cls === 'blade' && o && o.primary && e && !e.dead) {
      const c = P.chain = P.chain || { n: 0, t: -9 };
      if (run.t - c.t > 2) c.n = 0;
      raw *= 1 + 0.05 * Math.min(5, c.n);
      if (run.t - c.t > 0.05) c.n = Math.min(5, c.n + 1);   // 同一刀砍到好幾隻只算一下
      c.t = run.t;
    }
    return he0(e, raw, o);
  };
})(window.R);
