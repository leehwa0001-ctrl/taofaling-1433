// 天賦樹的奧義點滿之後的效果（2026-10-06 平衡版）
(function (R) {
  const W = () => R.W, rnd = Math.random;
  const caps = () => { const P = W().P; if (!P || !W().run) return null; return P.ttCaps || (P.ttCap ? { [P.ttCap]: 1 } : null); };
  const has = k => { const c = caps(); return !!(c && c[k]); };

  // 千刃、斬鐵、不動如山：都在實際造成傷害後結算。
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const c = caps(), P = W().P, run = W().run; if (!c || !e || e.dead) return he0(e, raw, o);
    if (c.A2 && e.def && (e.def.elite || e.def.boss)) raw *= 1.25;
    const h0 = e.hp, r = he0(e, raw, o), dealt = Math.max(0, h0 - Math.max(0, e.hp));
    if (dealt > 0 && c.B1 && P && run && (run.t || 0) >= (P.ttMountainAt || 0)) {
      P.ttMountainAt = (run.t || 0) + 8;
      P.shield = Math.min(P.hpMax * 0.5, (P.shield || 0) + P.hpMax * 0.12);
      P.buff = P.buff || {}; P.buff.shieldT = Math.max(P.buff.shieldT || 0, 8);
      R.num && R.num(P.x, 2.7, P.z, '山盾', 'heal');
    }
    if (dealt > 0 && c.A1 && o && o.primary && !o.ttEcho) {
      P.ttN = (P.ttN || 0) + 1;
      if (P.ttN % 5 === 0) { const rr = run, crit = Math.max(0, (P.ws && P.ws.crit) || 0); setTimeout(() => { if (W().run === rr && !e.dead) { R.fx && R.fx('slash', e.x, 1.1, e.z, { a: Math.random() * 6, len: 1.6 }); R.num && R.num(e.x, 2.4, e.z, '千刃', 'crit'); R.hurtEnemy(e, raw * (1.01 + crit), Object.assign({}, o, { ttEcho: true, crit: true })); } }, 90); }
    }
    return r;
  };

  // 不動如山取消擊退；不死身在半血以上讓現有護盾更耐打。保命進 CD 後效果減半。
  let hit = null;
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const P = W().P, run = W().run;
    if (has('B1') && o && o.knock) o = Object.assign({}, o, { knock: 0 });
    let shieldAmp = 1;
    if (P && run && P.ttUndyingLv && P.hp >= P.hpMax * 0.5 && (P.shield || 0) > 0) {
      const half = (run.t || 0) < (run.ttUndying || 0) ? 0.5 : 1;
      shieldAmp = 1 + 0.05 * P.ttUndyingLv * half;
    }
    const shield0 = P ? (P.shield || 0) : 0, h0 = P ? P.hp + shield0 : 0, prev = hit; hit = { raw, src }; let r;
    try { if (P && shieldAmp > 1) P.shield = shield0 * shieldAmp; r = hp0(raw, src, o); }
    finally { if (P && shieldAmp > 1 && P.shield > 0) P.shield /= shieldAmp; hit = prev; }
    try { if (P && P.ttReflect > 0 && src && src.def && !src.dead && !src.ally && src.hp > 0 && !src.invuln) { const took = h0 - (P.hp + (P.shield || 0)); if (took > 0) reflect(P, src, took * P.ttReflect); } } catch (e) { console.warn('[talentcap]', e); }
    return r;
  };
  const reflect = (P, e, v) => {
    let m = P.dmgMult || 1; if (has('B3')) { m *= 4; v += (P.hpMax || 0) * 0.1; }
    if (P.sb) Object.values(P.sb).forEach(b => { if (b && b.left > 0 && b.dmg) m *= b.dmg; });
    const dmg = Math.max(1, Math.round(v * m)), h0 = e.hp;
    R.hurtEnemy(e, dmg / Math.max(0.001, P.dmgMult || 1), R.markNoVamp ? R.markNoVamp({ fromBehind: false }) : { noVamp: true, reflect: true, fromBehind: false });
    if (h0 > e.hp) R.num && R.num(e.x, 2.2 * ((e.def && e.def.size) || 1) + 0.4, e.z, '反擊', 'crit');
  };

  const pd0 = R.onPlayerDown;
  R.onPlayerDown = (...a) => {
    const w = W(), P = w.P, run = w.run, forced = hit && !hit.src && hit.raw >= 9999;
    if (P && run && !run.done && has('B2') && hit && !forced && (run.t || 0) >= (run.ttUndying || 0)) {
      run.ttUndying = (run.t || 0) + 90; P.dead = false; P.hp = 1; P.iframe = 3; P.unyGuard = Math.max(P.unyGuard || 0, 3);
      R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 4, color: '#6AB0FF' }); R.banner && R.banner('奧義・不死身', '3 秒內不會受傷；90 秒冷卻期間恢復／護盾加成減半');
      return;
    }
    return pd0(...a);
  };
  const st0 = R.step;
  R.step = dt => { const r = st0(dt), P = W().P, run = W().run; if (P && run && P.ttUndyingLv && !P.dead && P.hp > 0 && P.hp < P.hpMax * 0.5) { const half = (run.t || 0) < (run.ttUndying || 0) ? 0.5 : 1; R.healP(P.hpMax * 0.016 * P.ttUndyingLv * half * dt, true); } return r; };

  // 無念 + 天啟。天啟免費重放不消耗魔力、不保留新冷卻，也不增加熟練度；最多連鎖五次，避免極端亂數鎖死遊戲。
  const cdOf = (P, i) => i === 0 ? P.skillCd || 0 : (P.skCd && P.skCd[i]) || 0;
  const setCd = (P, i, v) => { if (i === 0) P.skillCd = v; else if (P.skCd) P.skCd[i] = v; };
  let busy = 0;
  const wrapCast = (f, slotOf) => (...a) => {
    const P = W().P; if (!P || busy) return f(...a);
    const i = slotOf(a), c0 = cdOf(P, i), mp0 = P.mp, ret = f(...a), casted = cdOf(P, i) > c0 + 0.01;
    if (!casted) return ret;
    let finalCd = cdOf(P, i);
    if (has('C1') && rnd() < 0.25) { finalCd = 0; R.num && R.num(P.x, 2.8, P.z, '無念', 'heal'); }
    if (has('C2')) {
      let n = 0; while (n < 5 && rnd() < 0.20) {
        n++; const keepCd = finalCd; busy++; P._apEcho = (P._apEcho || 0) + 1;
        try { setCd(P, i, 0); P.mp = P.mpMax; f(...a); R.num && R.num(P.x, 2.8 + n * 0.12, P.z, '天啟', 'crit'); }
        finally { P._apEcho--; busy--; P.mp = mp0; setCd(P, i, keepCd); }
      }
    }
    P.mp = mp0; setCd(P, i, finalCd); return ret;
  };
  if (R.castSlot) R.castSlot = wrapCast(R.castSlot, a => a[0] || 0);
  if (R.useSkill) R.useSkill = wrapCast(R.useSkill, () => 0);
})(window.R);
