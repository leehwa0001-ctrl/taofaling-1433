// 後期遺跡生物的傷害保底（2026-10-05 作者：感覺後期的怪物血量很厚但傷害都不高，連領主也是）
// 原因：遺跡生物的生命有保底（difficulty.js：照你一下普攻打多少，普通 4～10 下、領主體 120～240 下，沒有上限），
//   傷害卻只照分級、深度、等級差（最多 +100%）、裝備差（最多 +45%）加——你的生命、防禦、減傷越堆越高，牠們跟不上。
// 現在傷害也有保底，跟生命的保底對稱：照「你的坦度」算，遺跡生物一下（招式的基本傷害）至少打掉你生命的：
//   一般 6%→14%、精英 10%→22%、領主體 18%→35%、佩特拉核心 12%→25%（照走到第幾成，越深越多）；
//   摩爾斯級 ×0.7、克森特級 ×1、卡索級 ×1.1（卡索級的生物、異變的領主體另外再乘它們自己的倍率）。
//   你的坦度＝生命上限，扣掉物防（魔法攻擊看魔防）、天賦的減傷、套裝、飾品的守護、天賦點的堅韌之後的「等效生命」——
//   堆得越硬，牠們打得越重；本來就打得比這個痛的不變（保底只往上拉）。暫時的增益（要塞、結界、技能書）不算。
//   同一種類裡照原本的強弱分：原本傷害高的生物保底也高（0.6～1.6 倍）；召喚出來的小隻（生命倍率不到 1）照比例少一點。
// 放在 deepbonus.js 後面、lordvariant.js 和 kasoplus.js 前面（異變、卡索級的倍率乘在保底上面）。
(function (R) {
  const W = () => R.W, isLord = d => !!(d && /^領主體/.test(d.name || ''));
  const GK = { 3: 0.7, 4: 1, 5: 1.1 };
  const REF = { n: 11, elite: 20, boss: 32 };
  const kindOf = e => (e.id === 'petra' ? 'petra' : e.def.boss || isLord(e.def) ? 'boss' : e.def.elite ? 'elite' : 'n');
  const FRAC = { n: [0.06, 0.08], elite: [0.10, 0.12], boss: [0.18, 0.17], petra: [0.12, 0.13] };
  // 你的等效生命（這種攻擊要打多少「原始傷害」才扣得完）
  const effHp = (P, mag) => {
    const a = Math.max(0, (mag ? P.mdef : P.def) || 0);
    let k = 1 - a / (a + 30);
    k *= 1 - Math.max(0, Math.min(0.5, P.ttGuard || 0));
    k *= 1 - Math.max(0, Math.min(0.5, P.talGuard || 0));
    k *= 1 - Math.max(0, Math.min(0.5, P.setGuard || 0));
    k *= 1 - Math.max(0, Math.min(0.5, P.accGuard || 0));
    return (P.hpMax || 0) / Math.max(0.05, k);
  };
  R.dmgFloor = (e, o) => {
    const w = W(), run = w.run, P = w.P;
    if (!e || !e.def || !run || !run.grade || !P || !P.hpMax || run.done) return 0;
    const g = run.grade.lv || 1, gk = GK[Math.min(5, g)]; if (!gk || !(e.def.dmg > 0)) return 0;
    if (e.def.human || e.def.wild || e.fake || e.mirror || (run.site && (run.site.outdoor || run.site.kind === 'train'))) return 0;
    const t = Math.max(0, Math.min(1, (run.floor || 0) / Math.max(1, (run.floors || 1) - 1)));
    const kd = kindOf(e), f = FRAC[kd], ref = REF[kd] || REF.boss;
    const sp = Math.max(0.6, Math.min(1.6, e.def.dmg / ref));
    const small = o && o.hpMul && o.hpMul < 1 ? Math.sqrt(o.hpMul) : 1;
    const mag = !!(R.enemyDmgInfo && R.enemyDmgInfo(e.def).mag);
    return (f[0] + f[1] * t) * gk * sp * small * effHp(P, mag);
  };
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se0(id, x, z, room, o);
    try { if (e && !e.dfloor) { const v = R.dmgFloor(e, o); if (v > e.dmg) { e.dfloor = Math.round(v / Math.max(1, e.dmg) * 100) / 100; e.dmg = v; } } } catch (err) { console.warn('[dmgfloor]', err); }
    return e;
  };
})(window.R);
