// 吟遊詩人：增益照魔力上限變強（2026-10-08 作者：吟遊詩人的技能所有增益（治療、護盾等）都要隨魔力上限提升）
// - 吟遊詩人放的治療（自己、隊友的生命％）、護盾、強化（傷害、防禦、暴擊、移動、回血）、聖域地帶 × 魔力倍率。
// - 魔力倍率＝魔力上限 ÷ 100（最少 ×1、最多 ×3）：1 級大約 85 魔力＝×1；30 級 160 魔力＝×1.6；再加魔力的裝備、被動會更高。
// - 強化的「+%」部分才乘（傷害 ×1.15 → 1＋0.15×倍率）；秒數不變。生命％最多回到 100%。
// - 技能說明後面多一句「（效果隨魔力上限變強）」；角色資料看得到目前的倍率（charsheet.js 每秒回魔下面）。
// 放在所有加技能的「型」的檔案後面（skillbook*.js、adv*.js、classes2b.js、elements1008.js）。
(function (R) {
  const W = () => R.W, T = R.SKILL_TYPES, L = R.SKILL_LIB; if (!T || !L) return;
  R.bardMpK = P => (P && P.cls === 'bard' ? Math.max(1, Math.min(3, (P.mpMax || 0) / 100)) : 1);
  const PCT = ['pct', 'allies', 'shield', 'allyShield', 'heal', 'regen', 'selfHeal'], ADD = ['crit', 'def'], MUL = ['dmg', 'speed', 'rate'];
  const SUP = new Set(['heal', 'buff', 'guard', 'zone', 'aura', 'combo']);
  const scale = (s, k, type) => {
    s = Object.assign({}, s);
    PCT.forEach(key => { if (typeof s[key] === 'number') s[key] = key === 'pct' || key === 'allies' ? Math.min(1, s[key] * k) : s[key] * k; });
    if (type === 'buff' || type === 'aura') { ADD.forEach(key => { if (typeof s[key] === 'number') s[key] *= k; }); MUL.forEach(key => { if (typeof s[key] === 'number' && s[key] > 1) s[key] = 1 + (s[key] - 1) * k; }); }
    if (type === 'zone' && s.zone === 'sanct' && typeof s.k === 'number') s.k *= k;   // 聖域：站在裡面回的生命跟著 k
    return s;
  };
  Object.keys(T).forEach(type => {
    if (!SUP.has(type) || type === 'combo') return;
    const f = T[type]; if (typeof f !== 'function') return;
    T[type] = function (s, P, w, pw, ...a) {
      const k = R.bardMpK(P); if (k === 1 || !s || typeof s !== 'object') return f.call(this, s, P, w, pw, ...a);
      return f.call(this, scale(s, k, type), P, w, pw, ...a);
    };
  });
  // 說明：吟遊詩人的輔助技能
  const isSup = l => l && l.cls === 'bard' && (SUP.has(l.type) && (l.type !== 'combo' || (l.p && Array.isArray(l.p.parts) && l.p.parts.some(x => ['heal', 'buff', 'guard'].includes(x[0])))) && !(l.type === 'zone' && !(l.p && l.p.zone === 'sanct')) && !(l.type === 'aura' && !(l.p && (l.p.heal || l.p.regen || l.p.dmg))));
  const TAG = '（效果隨魔力上限變強）';
  const tag = () => Object.values(L).forEach(l => { if (isSup(l) && R.SKILLS[l.id] && !String(R.SKILLS[l.id].desc || '').includes(TAG)) R.SKILLS[l.id].desc = (R.SKILLS[l.id].desc || '') + TAG; });
  tag(); setTimeout(tag, 0);
})(window.R);
