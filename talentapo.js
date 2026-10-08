// 奧義・天啟點滿：天啟狀態（2026-10-08 作者：重製天啟點滿後的效果）
// - 魔力填滿（100%）的那一刻進入「天啟」（增益，畫面下方的狀態格看得到），一直留著到放出下一招技能。
// - 天啟狀態放出去的下一招：額外消耗最大魔力的 50%；如果「這一招的魔力＋50%」超過手上的魔力，就只扣放完之後剩下的。
//   每額外消耗 1 點魔力，那一招的傷害、持續時間、攻擊範圍、效果各 +1%（例：最大魔力 200 → 多扣 100 → 全部 +100%）。
//   · 範圍、持續時間、效果：照那一招的參數放大（技能書的招式、連段的每一段都算）。
//   · 傷害：放出去之後 2.5 秒（加上衝刺、旋轉這類動作的時間）內，技能打出去的傷害都乘上去；這段時間又放了別的招就提早結束。
// - 點滿的另一個效果：每秒額外回復 3% 最大魔力。
// - 無念的「再施放一次」不算（不會再扣、也不會觸發）。
// 放在 talentcap.js、skillbook*.js、skillvar.js 後面（包 R.castSlot、R.useSkill、R.SKILL_TYPES、R.hurtEnemy、R.step 外面）。
(function (R) {
  const W = () => R.W, now = () => performance.now() / 1000;
  const on = P => !!(P && W().run && P.ttCaps && P.ttCaps.C2);
  const cdOf = (P, i) => (i === 0 ? P.skillCd || 0 : (P.skCd && P.skCd[i]) || 0);
  const slotId = (P, i) => (i === 0 ? P.skill : R.slotSkill ? R.slotSkill(P, i) : null);
  const castTime = P => Math.max(P.dashT || 0, P.stance || 0, P.air || 0, P.jump ? Math.max(0, (P.jump.dur || 0.6) - (P.jump.t || 0)) : 0, P.buff && P.buff.whirl > 0 ? P.buff.whirl : 0, P.castT || 0);
  const extraOf = (P, cost) => Math.max(0, Math.min(P.mpMax * 0.5, (P.mp || 0) - (cost || 0)));
  let cur = 1;   // 正在施放的那一招的倍率（R.SKILL_TYPES 用）

  // ---------- 招式的參數放大 ----------
  const DUR = ['t', 'life', 'stun', 'slow', 'root', 'curse', 'invis', 'iframe', 'burnT'];
  const RANGE = ['r', 'range', 'len', 'width', 'scatter', 'hitR'];
  const EFF = ['pct', 'allies', 'shield', 'allyShield', 'mp', 'regen', 'vamp', 'crit', 'heal'];
  const scale = (p, K) => {
    if (!p || typeof p !== 'object') return p;
    const s = Object.assign({}, p, { _apo: 1 });
    DUR.forEach(k => { if (typeof s[k] === 'number' && s[k] > 0) s[k] *= K; });
    RANGE.forEach(k => { if (typeof s[k] === 'number' && s[k] > 0) s[k] *= K; });
    if (typeof s.arc === 'number' && s.arc > 0) s.arc = Math.min(6.28, s.arc * K);
    EFF.forEach(k => { if (typeof s[k] === 'number' && s[k] > 0) s[k] *= K; });
    ['dmg', 'speed', 'rate'].forEach(k => { if (typeof s[k] === 'number' && s[k] > 1) s[k] = 1 + (s[k] - 1) * K; });
    if (typeof s.def === 'number' && s.def > 0) s.def = Math.min(0.9, s.def * K);
    if (Array.isArray(s.parts)) s.parts = s.parts.map(x => (Array.isArray(x) ? [x[0], scale(x[1], K)].concat(x.slice(2)) : x));
    ['end', 'then', 'nova', 'buff'].forEach(k => { if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) s[k] = scale(s[k], K); });
    return s;
  };
  const T = R.SKILL_TYPES;
  if (T) Object.keys(T).forEach(k => { const f = T[k]; T[k] = (s, P, w, pw) => (cur > 1 && s && !s._apo ? f(scale(s, cur), P, w, pw) : f(s, P, w, pw)); });

  // ---------- 施放 ----------
  let depth = 0;   // 技能一（castSlot(0)）裡面會再叫 useSkill：只算外面那一層
  const wrapCast = (f, slotOf) => (...a) => {
    const P = W().P; if (!P || !on(P) || P._apEcho || depth > 0) return f(...a);
    depth++; try { return cast(f, slotOf, a, P); } finally { depth--; }
  };
  const cast = (f, slotOf, a, P) => {
    const i = slotOf(a), c0 = cdOf(P, i);
    if (!P.apo) { const r0 = f(...a); if (cdOf(P, i) > c0 + 0.01) P._apoDmg = null; return r0; }   // 放了別的招：上一招的天啟傷害結束
    const prevWin = P._apoDmg, id = slotId(P, i), sk = id && R.SKILLS && R.SKILLS[id];
    const extra = extraOf(P, sk ? sk.mp : 0), K = 1 + extra / 100;
    P._apoDmg = { k: K, until: now() + 3 }; cur = K;
    let ret; try { ret = f(...a); } finally { cur = 1; }
    if (cdOf(P, i) > c0 + 0.01) {
      P.apo = false; P.mp = Math.max(0, (P.mp || 0) - extra);
      P._apoDmg = { k: K, until: now() + 2.5 + castTime(P) };
      R.num && R.num(P.x, 3, P.z, '天啟 +' + Math.round(extra) + '%', 'crit');
      R.fx && R.fx('pillar', P.x, 0, P.z, { r: 1.2, color: '#FFE08A' });
    } else P._apoDmg = prevWin && prevWin.until > now() ? prevWin : null;   // 沒放出去：照舊
    return ret;
  };
  if (R.castSlot) R.castSlot = wrapCast(R.castSlot, a => a[0] || 0);
  if (R.useSkill) R.useSkill = wrapCast(R.useSkill, () => 0);

  // ---------- 傷害：放出去之後那一段時間，技能的傷害乘上去 ----------
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P, d = P && P._apoDmg;
    if (d && e && !e.dead && !(o && (o.primary || o.reflect || o.thorns || o.dot))) { if (now() < d.until) raw *= d.k; else P._apoDmg = null; }
    return he0(e, raw, o);
  };

  // ---------- 進入天啟、每秒回 3% 魔力 ----------
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), w = W(), P = w.P;
    try {
      if (!P || !w.run) return r;
      if (!on(P)) { P.apo = false; return r; }
      if (!w.paused && !P.dead) {
        P.mp = Math.min(P.mpMax, (P.mp || 0) + P.mpMax * 0.03 * (dt || 0));
        if (!P.apo && P.mp >= P.mpMax - 0.01) { P.apo = true; R.num && R.num(P.x, 2.8, P.z, '天啟', 'crit'); R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 1.8, color: '#FFE08A' }); }
      }
    } catch (e) { }
    return r;
  };

  // ---------- 狀態格 ----------
  (R.STATUS_EXTRA = R.STATUS_EXTRA || []).push((P, run, add) => {
    if (!P || !on(P)) return;
    if (P.apo) { const x = Math.round(extraOf(P, 0)); add('apo', '天啟', 'spark', '#FFE08A', ['下一招額外消耗最大魔力的 50%（現在最多 ' + x + ' 點，扣掉那一招的魔力之後算）', '每多消耗 1 點魔力：那一招的傷害、持續時間、範圍、效果 +1%'], null, null, false); }
    const d = P._apoDmg, t = d ? d.until - now() : 0;
    if (d && t > 0) add('apo-on', '天啟・發動中', 'spark', '#FFC84A', ['技能的傷害 ×' + d.k.toFixed(2)], t, 2.5, false);
  });
  R.apoDebug = { scale, extraOf };
})(window.R);
