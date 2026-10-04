// 天賦樹的奧義點滿之後的效果（2026-10-05 作者：天賦樹的奧義數值感覺可以強一點，不然都沒有奧義的感覺）
// 奧義的數值在 talenttree.js（大約是原本的兩倍半），點滿 5 級的那一個會設 P.ttCap，這裡做點滿的效果：
// - 千刃（A1）：每第五下普攻（打中的那一下）多砍一下，同樣的傷害。
// - 斬鐵（A2）：對精英、領主體的傷害 +25%。
// - 不動如山（B1）：不會被擊退（被打的時候不會往後退、不會愣住）。
// - 不死身（B2）：受到致命傷時留 1 點生命、3 秒不會受傷；90 秒一次（遺跡崩塌照樣會死）。比不屈、神佑先觸發。
// - 無念（C1）：放技能有 25% 不進冷卻（頭上跳「無念」）。
// - 天啟（C2）：技能（不是普攻）的暴擊率 +15%。
// 放在 talenttree.js、skillbook.js、unyield.js 後面。
(function (R) {
  const W = () => R.W, rnd = Math.random;
  const cap = () => { const P = W().P; return P && W().run ? P.ttCap || null : null; };
  // ---------- 千刃、斬鐵、天啟 ----------
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const c = cap(), P = W().P; if (!c || !e || e.dead) return he0(e, raw, o);
    if (c === 'A2' && e.def && (e.def.elite || e.def.boss)) raw *= 1.25;
    if (c === 'C2' && !(o && o.primary) && rnd() < 0.15) o = Object.assign({}, o, { crit: true });
    const r = he0(e, raw, o);
    if (c === 'A1' && o && o.primary && !o.ttEcho) {
      P.ttN = (P.ttN || 0) + 1;
      if (P.ttN % 5 === 0) { const run = W().run; setTimeout(() => { if (W().run === run && !e.dead) { R.fx && R.fx('slash', e.x, 1.1, e.z, { a: Math.random() * 6, len: 1.6 }); R.num && R.num(e.x, 2.4, e.z, '千刃', 'crit'); R.hurtEnemy(e, raw, Object.assign({}, o, { ttEcho: true })); } }, 90); }
    }
    return r;
  };
  // ---------- 不動如山 ----------
  let hit = null;
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    if (cap() === 'B1' && o && o.knock) o = Object.assign({}, o, { knock: 0 });
    const prev = hit; hit = { raw, src }; try { return hp0(raw, src, o); } finally { hit = prev; }
  };
  // ---------- 不死身 ----------
  const pd0 = R.onPlayerDown;
  R.onPlayerDown = (...a) => {
    const w = W(), P = w.P, run = w.run;
    const forced = hit && !hit.src && hit.raw >= 9999;   // 遺跡崩塌
    if (P && run && !run.done && cap() === 'B2' && hit && !forced && (run.t || 0) >= (run.ttUndying || 0)) {
      run.ttUndying = (run.t || 0) + 90; P.dead = false; P.hp = 1; P.iframe = 3; P.unyGuard = Math.max(P.unyGuard || 0, 3);
      R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 4, color: '#6AB0FF' }); R.fx && R.fx('boom', P.x, 0.6, P.z, { r: 2.2, color: '#9AD8FF' }); R.shake && R.shake(0.4);
      R.banner && R.banner('奧義・不死身', '3 秒內不會受傷——快退開'); R.sfx && R.sfx('levelup');
      return;
    }
    return pd0(...a);
  };
  // ---------- 無念 ----------
  const cdOf = (P, i) => (i === 0 ? P.skillCd || 0 : (P.skCd && P.skCd[i]) || 0);
  const free = (P, i) => { if (i === 0) P.skillCd = 0; else if (P.skCd) P.skCd[i] = 0; R.num && R.num(P.x, 2.8, P.z, '無念', 'heal'); };
  let busy = false;
  const wrapCast = (f, slotOf) => (...a) => {
    const P = W().P; if (busy || cap() !== 'C1' || !P) return f(...a);
    const i = slotOf(a), c0 = cdOf(P, i); busy = true;
    try { return f(...a); } finally { busy = false; if (cdOf(P, i) > c0 + 0.01 && rnd() < 0.25) free(P, i); }
  };
  if (R.castSlot) R.castSlot = wrapCast(R.castSlot, a => a[0] || 0);
  if (R.useSkill) R.useSkill = wrapCast(R.useSkill, () => 0);
})(window.R);
