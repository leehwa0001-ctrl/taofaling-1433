// 武術家技能的「借勢」（2026-10-09 作者：武術家所有技能 ★3 可以選的變化多一個「借勢」）
// - 借勢：傷害、效果、範圍、持續時間 −25%，但冷卻一好就自動施放（魔力、冷卻照原本，都是 100%）。
// - 在技能書每一張武術家技能卡片下面的「變化」多一顆（skillvar.js 的 R.SKILL_VARIANTS、R.skillVariants）。
// - 自動施放：在遺跡裡、這一格的冷卻好了、魔力夠、16 公尺內有遺跡生物，就朝最近的那一隻放（放的那一下準心轉過去，放完轉回來）。
//   沒有遺跡生物的時候先等著，不會對著空氣放掉。
// 放在 skillvar.js、skillbook.js 後面。
(function (R) {
  const W = () => R.W, VAR = R.SKILL_VARIANTS, LIB = R.SKILL_LIB || {}; if (!VAR || !R.skillVariants) return;
  const M = 0.75, DIST = 16;
  const scale = p => {
    if (p.k) p.k *= M;                                                        // 傷害
    ['r', 'range', 'len', 'width', 'hitR', 'reach'].forEach(k => { if (typeof p[k] === 'number') p[k] *= M; });   // 範圍
    // 揮砍的角度不改（轉一圈的招還是一整圈），範圍照半徑、距離縮
    ['t', 'stun', 'slow', 'root', 'curse', 'freeze'].forEach(k => { if (typeof p[k] === 'number' && p[k] > 0) p[k] *= M; });   // 持續時間（含控制的秒數）
    if (p.dmg > 1) p.dmg = 1 + (p.dmg - 1) * M; if (p.crit) p.crit *= M; if (p.def > 0) p.def *= M; if (p.speed > 1) p.speed = 1 + (p.speed - 1) * M;   // 效果
    ['regen', 'vamp', 'pct', 'allies', 'shield', 'allyShield', 'kb'].forEach(k => { if (typeof p[k] === 'number') p[k] *= M; });
    if (p.end && typeof p.end === 'object') { p.end = Object.assign({}, p.end); scale(p.end); }   // 落地那一下（複製一份，不改到原本的技能）
    // 組合技（combo）的每一段會用同一個技能編號再過一次變化（skillvar.js），這裡不再改，免得 −25% 算兩次
  };
  VAR.borrow = { n: '借勢', d: '傷害、效果、範圍、持續時間 −25%，但冷卻一好就自動施放（魔力、冷卻照原本）', ok: () => true, f: p => { scale(p); } };
  const isMonk = id => { const L = LIB[id]; return !!(L && L.cls === 'monk'); };
  const sv0 = R.skillVariants;
  R.skillVariants = id => { const v = sv0(id) || []; return isMonk(id) && !v.includes('borrow') ? v.concat(['borrow']) : v; };
  // ---------- 自動施放 ----------
  const cdOf = (P, i) => (i === 0 ? P.skillCd || 0 : (P.skCd && P.skCd[i]) || 0);
  const mpOf = id => { const L = LIB[id], S2 = R.SKILLS && R.SKILLS[id]; return (L && L.mp) || (S2 && S2.mp) || 0; };
  let busy = false;
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt);
    try {
      const w = W(), P = w.P; if (busy || !P || P.cls !== 'monk' || !w.run || w.run.done || w.paused || P.dead || !R.castSlot || !R.slotSkill) return r;
      for (let i = 0; i < (R.SKILL_UNLOCK || [1, 3, 6]).length; i++) {
        const id = R.slotSkill(P, i); if (!id || R.skillVarOf(id) !== 'borrow' || cdOf(P, i) > 0 || (P.mp || 0) < mpOf(id)) continue;
        const tg = (w.enemies || []).filter(e => !e.dead && !e.under && !e.fake && Math.hypot(e.x - P.x, e.z - P.z) < DIST).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
        if (!tg) break;
        const a0 = P.aimA, x0 = P.aimX, z0 = P.aimZ;
        P.aimA = Math.atan2(tg.x - P.x, tg.z - P.z); P.aimX = tg.x; P.aimZ = tg.z;
        busy = true; try { R.castSlot(i); } finally { busy = false; P.aimA = a0; P.aimX = x0; P.aimZ = z0; }
        break;   // 一格一格來（下一格等下一個畫面）
      }
    } catch (e) { busy = false; }
    return r;
  };
})(window.R);
