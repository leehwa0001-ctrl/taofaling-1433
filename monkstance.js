// 武術家的職業特效：四種「法」（2026-10-08 作者：武術家比較注重一招一式；把附魔師那套搬過來——拳法、掌法、步法、腿法，
// 不同的「法」各有特色，可以頻繁切換接招，也可以維持同一種法；每次攻擊累積能量，能量滿了強化下次切換的那一法）
// 取代原本的「連段」（classcore.js 的 CORE.monk）。X 依序換：拳法 → 掌法 → 步法 → 腿法 → 拳法。
// 2026-10-09 作者調整：
// - 能量改叫「勢」（每次普攻打中 +10，最多 100）；勢滿了換過去的那一法會「X勢爆發」（拳勢爆發、掌勢爆發、步勢爆發、腿勢爆發）。
//   爆發都是增益，畫面下方的狀態格看得到（還剩幾秒、幾下）。
// - 拿長棍的時候四法改叫：連棍（拳法）、甩棍（掌法）、跳棍（步法）、怒棍（腿法），效果一樣；爆發叫連勢爆發、甩勢爆發、跳勢爆發、怒勢爆發。
// - 拳法：攻速 +30%。拳勢爆發（從腿法換成拳法時勢滿：勢清空才進入）：5 秒內每一下普攻多揮一下（不再加攻速）；換成別的法照樣有。
// - 掌法：擊退 +100%。掌勢爆發（從拳法換成掌法時勢滿）：強化下一次普攻——範圍 +100%、擊退再 +2000%，打中的敵人 6 秒內受到的傷害 +20%；
//   被打飛的敵人撞到牆會暈眩 1.5 秒，你的勢馬上回滿。揮出這一下才用掉勢；揮之前換成別的法，爆發取消、勢留著。
// - 步法：攻速 −25%；每次揮拳往前跨一步（往準心 2 公尺，前面有敵人就停在牠面前）。
//   步勢爆發（從掌法換成步法時勢滿）：強化接下來 3 下普攻——每下傷害 +25%，跨步的距離 3 倍、而且是瞬間到（揮拳的那一刻就閃過去）：
//   準心方向 45 度內有敵人就閃到牠面前；沒有就往準心閃到最遠（也可以拿來逃跑）。3 下打完才清空勢。
//   換成別的法：閃的效果沒了，傷害 +25% 留著（剩幾下照算）。
// - 腿法：攻速 −40%、普攻傷害 +100%、範圍 +30%。腿勢爆發（從步法換成腿法時勢滿：勢馬上歸 0）：
//   下兩次普攻傷害再 ×2（跟其他加成相乘）、範圍 +50%、攻速 +25%、暈眩 1 秒；打倒敵人回 50 勢。換成拳法的時候腿勢爆發直接消失（步勢爆發沒用完的照樣留著）。
// - 路線：拳聖＝拳法攻速再 +15%；棍僧＝腿法範圍 +60%（原本 +30%）、掌法擊退再 +50%；內修者＝勢多 50%；外修者＝步法不減攻速。
// - 傳說：千手＝勢累積快一倍；不動明王棍＝腿法不減攻速。
// 放在 classcore.js、classcore2.js、buildfx.js 後面。
(function (R) {
  const W = () => R.W, CORE = R.CORE; if (!CORE) return;
  const CT = () => (R.coreTime ? R.coreTime() : performance.now() / 1000);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const adv = P => P.adv || '', leg = P => (R.legOf ? R.legOf(P) : null);
  const say = (P, t, c) => R.num && R.num(P.x, 2.8, P.z, t, c || 'crit');
  const live = () => { const w = W(); return !!(w.run && !w.run.done && w.P && !w.P.dead); };
  const ORDER = ['fist', 'palm', 'step', 'leg'];
  const COL = { fist: '#FF8A5A', palm: '#7AC8FF', step: '#8AE07A', leg: '#E8C04A' };
  const NAME = { fist: '拳法', palm: '掌法', step: '步法', leg: '腿法' }, STAFF = { fist: '連棍', palm: '甩棍', step: '跳棍', leg: '怒棍' };
  const isStaff = P => { const b = P && P.item && P.item.base; return b === 'staffpole' || !!(R.WEAPON_LOOK && R.WEAPON_LOOK[b] === 'staffpole'); };
  const nm = (P, s) => (isStaff(P) ? STAFF : NAME)[s];
  const burstNm = (P, s) => nm(P, s)[0] + '勢爆發';
  const PALM_K = 20, STEP_N = 3, LEG_N = 2, FIST_T = 5, VULN_T = 6;
  // ---------- 攻速、範圍 ----------
  const rateOf = P => {
    const s = P._fa || 'fist';
    if (s === 'fist') return 1.3 + (adv(P) === 'fistsaint' ? 0.15 : 0);
    if (s === 'step') return adv(P) === 'waixiu' ? 1 : 0.75;
    if (s === 'leg') return (leg(P) === 'lg_immovable' ? 1 : 0.6) * (P._legB ? 1.25 : 1);
    return 1;
  };
  const rangeOf = P => {
    const s = P._fa || 'fist';
    if (s === 'leg') return (adv(P) === 'staffmonk' ? 1.6 : 1.3) * (P._legB ? 1.5 : 1);
    if (s === 'palm' && P._palmB) return 2;
    return 1;
  };
  // 把倍率套在武器上（相對的：別的效果乘上去的照樣留著；換武器、重算數值後重新套）
  const apply = P => {
    const ws = P.ws; if (!ws) return;
    if (P._faWs !== ws) { P._faWs = ws; P._faR = 1; P._faG = 1; }
    const r = rateOf(P), g = rangeOf(P);
    if (Math.abs(r - P._faR) > 1e-4) { ws.rate *= r / P._faR; P._faR = r; }
    if (Math.abs(g - P._faG) > 1e-4) { ws.range = (ws.range || 2) * g / P._faG; if (ws.arc) ws.arc = Math.min(6.28, ws.arc * g / P._faG); P._faG = g; }
  };
  const gain = (P, n) => { const k = (adv(P) === 'inner' ? 1.5 : 1) * (leg(P) === 'lg_thousand' ? 2 : 1); P._faEn = Math.min(100, (P._faEn || 0) + n * k); };
  const baseRange = P => { const wd = P.item && R.WEAPONS[P.item.base]; return (wd && wd.range) || 2; };
  // ---------- 步法：每次揮拳往前跨一步；步勢爆發＝瞬間閃 3 倍距離（45 度內有敵人就到牠面前） ----------
  const stepMove = (P, boosted) => {
    const a = P.aimA != null ? P.aimA : P.yaw, k = Math.max(0.5, ((P.ws && P.ws.range) || 2) / baseRange(P) / rangeOf(P)), far = 2 * k * (boosted ? 3 : 1), cone = boosted ? Math.PI / 8 : 0.6;
    const tgt = (W().enemies || []).filter(e => !e.dead && !e.under && dist(e, P) < far + (e.def.size || 1) * 0.5 + 0.8 && Math.abs(wrap(angTo(P, e) - a)) < cone).sort((p, q) => dist(p, P) - dist(q, P))[0];
    let len = far, dir = a; if (tgt) { dir = angTo(P, tgt); len = Math.max(0, dist(tgt, P) - (tgt.def.size || 1) * 0.5 - 0.7); }
    if (len < 0.2) return;
    if (boosted) {
      let x = P.x + Math.sin(dir) * len, z = P.z + Math.cos(dir) * len;
      if (R.lineOpen && !R.lineOpen(P.x, P.z, x, z)) { const p = R.openFloorNear ? R.openFloorNear(x, z, [P.x, P.z]) : [P.x, P.z]; x = p[0]; z = p[1]; }
      R.fx && R.fx('blink', P.x, 1, P.z); P.x = x; P.z = z; R.collide(P, 0.42); R.fx && R.fx('blink', P.x, 1, P.z);
      if (tgt) P.aimA = angTo(P, tgt);
    } else if (R.dash) R.dash(a, len, 0.14, {});
  };
  const baseTxt = (P, s) => ({ fist: '攻速 +30%', palm: '擊退 +100%', step: '每次揮拳往前跨一步', leg: '攻速 −40%、傷害 +100%、範圍 +30%' })[s];
  CORE.monk = {
    name: '四法', col: '#FFB45A',
    help: P => {
      const n = s => nm(P, s), b = s => burstNm(P, s);
      return 'X 換「法」（' + ORDER.map(n).join(' → ') + '），可以頻繁切換接招，也可以一直用同一種。'
        + n('fist') + '：攻速 +30%；' + n('palm') + '：擊退 +100%；' + n('step') + '：攻速 −25%，每次揮拳往前跨一步（往準心 2 公尺，前面有敵人就停在牠面前）；' + n('leg') + '：攻速 −40%、普攻傷害 +100%、範圍 +30%。'
        + '每次普攻打中 +10「勢」；勢滿了換「法」，換過去的那一法會爆發（都是增益，畫面下方看得到）：'
        + b('palm') + '（' + n('fist') + '→' + n('palm') + '）下一次普攻範圍 +100%、擊退 +2000%，打中的敵人 6 秒內受到的傷害 +20%，撞牆暈眩、勢馬上回滿（揮出這一下才用掉勢）；'
        + b('step') + '（' + n('palm') + '→' + n('step') + '）接下來 3 下傷害 +25%，跨步 3 倍距離、瞬間閃到準心 45 度內的敵人面前（沒有就閃到最遠），換別的法閃的效果沒了、傷害照算，3 下打完才清空勢；'
        + b('leg') + '（' + n('step') + '→' + n('leg') + '，勢馬上歸 0）下兩次普攻傷害 ×2、範圍 +50%、攻速 +25%、暈眩 1 秒，打倒敵人回 50 勢，換成' + n('fist') + '就消失；'
        + b('fist') + '（' + n('leg') + '→' + n('fist') + '，勢清空）5 秒內每一下普攻多揮一下，換別的法也有。'
        + ({ fistsaint: '拳聖：' + n('fist') + '攻速再 +15%。', staffmonk: '棍僧：' + n('leg') + '範圍 +60%、' + n('palm') + '擊退再 +50%。', inner: '內修者：勢多 50%。', waixiu: '外修者：' + n('step') + '不減攻速。' }[adv(P)] || '');
    },
    floor: P => { P._fa = P._fa || 'fist'; apply(P); },
    step(dt, P) {
      P._fa = P._fa || 'fist'; apply(P);
      if (P._fistB && CT() >= P._fistB.until) P._fistB = null;
      // 掌勢爆發打飛的敵人：撞牆 → 暈眩、勢回滿
      (W().enemies || []).forEach(e => {
        if (!e._palmT || e.dead) return; if (CT() > e._palmT) { e._palmT = 0; return; }
        const sp = Math.hypot(e.kx || 0, e.kz || 0); if (sp < 1) return;
        const ux = e.kx / sp, uz = e.kz / sp, r = (e.def.size || 1) * 0.5 + 0.35, x = e.x + ux * r, z = e.z + uz * r;
        const wall = (R.isFloor && !R.isFloor(x, z)) || (R.pointBlocked && R.pointBlocked(x, z));
        if (wall) { e._palmT = 0; e.kx = e.kz = 0; e.st.stun = Math.max(e.st.stun || 0, 1.5); P._faEn = 100; say(e, '撞牆！', 'crit'); say(P, '勢 回滿', 'heal'); R.shake && R.shake(0.22); R.fx && R.fx('ring', e.x, 0.3, e.z, { r: 1.2, color: COL.palm }); }
      });
    },
    // 每一下普攻：傷害、擊退、強化
    mod(e, raw, o, P) {
      if (!o.primary || o.reflect) return raw;
      const s = P._fa || 'fist';
      let r = raw, o2 = o;
      if (s === 'leg') r *= 2;
      if (P._stepB && P._stepB.n > 0) r *= 1.25;                                             // 步勢爆發：傷害 +25%（換法也算）
      if (s === 'palm') {
        const ws = P.ws || {}, kb0 = o.kb != null ? o.kb : ws.kb || 1, up = 1 + (adv(P) === 'staffmonk' ? 0.5 : 0) + (P._palmB ? PALM_K : 0);
        o2 = Object.assign({}, o, { kb: kb0 * (1 + up) });
        if (P._palmB) { e._palmT = CT() + 1.2; e._palmVuln = CT() + VULN_T; }
      }
      if (s === 'leg' && P._legB) { r *= 2; o2 = Object.assign({}, o2, { stun: Math.max(o2.stun || 0, 1) }); e._legMark = CT(); }
      P._faHitT = CT();
      return o2 === o ? r : { raw: r, o: o2 };
    },
    act(P) {
      if (CT() - (P._faSw || 0) < 0.2) return; P._faSw = CT();
      const from = P._fa || 'fist', next = ORDER[(ORDER.indexOf(from) + 1) % ORDER.length], full = (P._faEn || 0) >= 100;
      if (from === 'leg') P._legB = null;            // 腿勢爆發：換成拳法直接消失
      if (from === 'palm') P._palmB = false;         // 掌勢爆發還沒揮出去就換：取消（勢留著）
      P._fa = next;
      let burst = false;
      if (full) {
        burst = true;
        if (next === 'palm') P._palmB = true;
        else if (next === 'step') P._stepB = { n: STEP_N, held: true };
        else if (next === 'leg') { P._legB = { n: LEG_N }; P._faEn = 0; if (P._stepB) P._stepB.held = false; }
        else { P._fistB = { until: CT() + FIST_T }; P._faEn = 0; if (P._stepB) P._stepB.held = false; }
      }
      apply(P);
      if (burst) { say(P, burstNm(P, next), 'crit'); R.fx && R.fx('ring', P.x, 0.2, P.z, { r: 2.2, color: COL[next] }); R.fx && R.fx('pillar', P.x, 0, P.z, { r: 0.9, color: COL[next] }); }
      else say(P, nm(P, next), 'heal');
    },
    gauge(P) {
      const s = P._fa || 'fist', en = Math.round(P._faEn || 0), next = ORDER[(ORDER.indexOf(s) + 1) % ORDER.length];
      const on = [P._fistB && burstNm(P, 'fist'), P._palmB && burstNm(P, 'palm'), P._stepB && burstNm(P, 'step') + '（' + P._stepB.n + ' 下）', P._legB && burstNm(P, 'leg') + '（' + P._legB.n + ' 下）'].filter(Boolean);
      return { name: nm(P, s), col: COL[s], v: en, max: 100, full: en >= 100, text: '勢 ' + en + '／100', sub: baseTxt(P, s) + (on.length ? '・' + on.join('、') : ''), x: en >= 100 ? '換法（' + burstNm(P, next) + '）' : '換法' };
    }
  };
  // ---------- 普攻真的出手了（攻擊冷卻變長）：步法跨步、掌勢爆發用掉勢、拳勢爆發多揮一下、算勢 ----------
  const at0 = R.attack;
  if (at0) R.attack = (...a) => {
    const P = W().P, mk = P && P.cls === 'monk' && live() && CORE.monk;
    const c0 = P ? P.atkCd || 0 : 0, h0 = P ? P._faHitT || 0 : 0, r = at0(...a);
    if (!mk || (P.atkCd || 0) <= c0 + 0.01) return r;
    const s = P._fa || 'fist', palm = s === 'palm' && P._palmB, step = P._stepB && P._stepB.n > 0, legB = s === 'leg' && P._legB;
    if (s === 'step') stepMove(P, step);                           // 步勢爆發的瞬間閃只在步法
    if (palm) P._faEn = 0;                                         // 揮出掌勢爆發的那一下就用掉勢（撞牆回滿在這之後）
    if (P._fistB && CT() < P._fistB.until) setTimeout(() => {      // 拳勢爆發：多揮一下
      if (!live() || W().P !== P) return; const rem = P.atkCd || 0; P.atkCd = 0; P._faExtra = 1;
      try { at0(...a); } finally { P._faExtra = 0; P.atkCd = rem; }
    }, 120);
    setTimeout(() => {   // 這一下的傷害結算完（近戰有一點延遲）再算勢、用掉強化
      if (!live() || W().P !== P) return;
      const hit = (P._faHitT || 0) > h0;
      if (palm) { P._palmB = false; apply(P); }
      const held = !!(P._stepB && P._stepB.held);                  // 步勢爆發還壓著勢：這幾下（含最後一下）不加勢
      if (step && P._stepB) { P._stepB.n--; if (P._stepB.n <= 0) { if (P._stepB.held) P._faEn = 0; P._stepB = null; } }
      if (legB && P._legB) { P._legB.n--; if (P._legB.n <= 0) P._legB = null; apply(P); }
      if (hit && !held) gain(P, 10);
    }, 260);
    return r;
  };
  // 掌勢爆發打中的敵人：受到的傷害 +20%
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => (e && !e.dead && e._palmVuln > CT() && !(o && o.reflect) ? he0(e, raw * 1.2, o) : he0(e, raw, o));
  // 腿勢爆發打倒敵人：回 50 勢
  const ke0 = R.killEnemy;
  if (ke0) R.killEnemy = (e, by) => { const was = e && !e.dead, r = ke0(e, by), P = W().P; if (was && e && e._legMark && CT() - e._legMark < 0.6 && P && P.cls === 'monk' && !e.fake) { gain(P, 50); say(P, '勢 +50', 'heal'); } return r; };
  // ---------- 狀態格（畫面下方的小方格） ----------
  (R.STATUS_EXTRA = R.STATUS_EXTRA || []).push((P, run, add) => {
    if (!P || P.cls !== 'monk') return;
    if (P._fistB) { const t = P._fistB.until - CT(); if (t > 0) add('mk-fist', burstNm(P, 'fist'), 'flame', COL.fist, ['每一下普攻多揮一下（換別的法也有）'], t, FIST_T, false); }
    if (P._palmB && P._fa === 'palm') add('mk-palm', burstNm(P, 'palm'), 'swirl', COL.palm, ['下一次普攻：範圍 +100%、擊退 +2000%', '打中的敵人 6 秒內受到的傷害 +20%', '撞到牆：暈眩 1.5 秒、勢馬上回滿', '揮出去才用掉勢；換別的法就取消'], null, null, false);
    if (P._stepB) add('mk-step', burstNm(P, 'step'), 'speed', COL.step, ['剩 ' + P._stepB.n + ' 下：普攻傷害 +25%'].concat(P._fa === 'step' ? ['揮拳時瞬間閃 3 倍距離：準心 45 度內有敵人就到牠面前，沒有就閃到最遠'] : ['（換成別的法：閃的效果沒了，傷害照算）']), null, null, false);
    if (P._legB && P._fa === 'leg') add('mk-leg', burstNm(P, 'leg'), 'spark', COL.leg, ['剩 ' + P._legB.n + ' 下：傷害再 ×2、範圍 +50%、攻速 +25%、暈眩 1 秒', '打倒敵人回 50 勢', '換成' + nm(P, 'fist') + '就消失'], null, null, false);
  });
  // 傳說武器的說明
  (R.LEGENDS || []).forEach(l => { if (l.id === 'lg_thousand') l.desc = '「四法」的勢累積快一倍。'; if (l.id === 'lg_immovable') l.desc = '腿法（怒棍）不減攻速。'; });
  R.monkDebug = { apply, stepMove, isStaff, nm, burstNm };
})(window.R);
