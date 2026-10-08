// 武術家的職業特效：四種「法」（2026-10-08 作者：武術家比較注重一招一式；把附魔師那套搬過來——拳法、掌法、步法、腿法，
// 不同的「法」各有特色，可以頻繁切換接招，也可以維持同一種法；每次攻擊累積能量，能量滿了強化下次切換的那一法）
// 取代原本的「連段」（classcore.js 的 CORE.monk）。X 依序換：拳法 → 掌法 → 步法 → 腿法。
// - 拳法：攻速 +30%。強化（能量滿的時候換過來）：4 秒內攻速 +100%。
// - 掌法：擊退 +50%。強化：下一次普攻擊退 +200%；被打飛的敵人撞到牆會暈眩 1.5 秒，你多拿 30 能量。
// - 步法：攻速 −25%；每次普攻往準心移動 2 公尺（前面有敵人就停在牠面前；距離跟著攻擊範圍的加成變長）。
//   強化：下一次普攻直接瞬移到前方 3 倍距離內的敵人面前，接下來 3 次普攻傷害 +25%（換成別的法也算），3 下打完能量才歸 0。
// - 腿法：攻速 −40%、普攻傷害 +100%、攻擊範圍 +30%。強化：下一次普攻連踢兩下、每下傷害再 ×2、暈眩。
// - 能量：每次普攻 +10（打中才算），最多 100；強化用掉就歸 0。
// - 路線：拳聖＝拳法攻速再 +15%（強化 +130%）；棍僧＝腿法範圍 +60%、掌法擊退 +100%；內修者＝能量多 50%；外修者＝步法不減攻速。
// - 傳說：千手＝能量累積快一倍；不動明王棍＝腿法不減攻速。
// 放在 classcore.js、classcore2.js、buildfx.js 後面。
(function (R) {
  const W = () => R.W, CORE = R.CORE; if (!CORE) return;
  const CT = () => (R.coreTime ? R.coreTime() : performance.now() / 1000);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const adv = P => P.adv || '', leg = P => (R.legOf ? R.legOf(P) : null);
  const say = (P, t, c) => R.num && R.num(P.x, 2.8, P.z, t, c || 'crit');
  const live = () => { const w = W(); return !!(w.run && !w.run.done && w.P && !w.P.dead); };
  const ORDER = ['fist', 'palm', 'step', 'leg'];
  const FA = { fist: ['拳法', '#FF8A5A'], palm: ['掌法', '#7AC8FF'], step: ['步法', '#8AE07A'], leg: ['腿法', '#E8C04A'] };
  // 現在這一法的攻速、範圍倍率
  const rateOf = P => { const s = P._fa || 'fist', b = P._faBoost && P._faBoost.s === s ? P._faBoost : null;
    if (s === 'fist') { const up = adv(P) === 'fistsaint' ? 0.15 : 0; return 1 + (b && CT() < b.until ? 1.0 + up * 2 : 0.3 + up); }
    if (s === 'step') return adv(P) === 'waixiu' ? 1 : 0.75;
    if (s === 'leg') return leg(P) === 'lg_immovable' ? 1 : 0.6;
    return 1; };
  const rangeOf = P => (P._fa === 'leg' ? (adv(P) === 'staffmonk' ? 1.6 : 1.3) : 1);
  // 把倍率套在武器上（相對的：別的效果乘上去的照樣留著；換武器、重算數值後重新套）
  const apply = P => {
    const ws = P.ws; if (!ws) return;
    if (P._faWs !== ws) { P._faWs = ws; P._faR = 1; P._faG = 1; }
    const r = rateOf(P), g = rangeOf(P);
    if (Math.abs(r - P._faR) > 1e-4) { ws.rate *= r / P._faR; P._faR = r; }
    if (Math.abs(g - P._faG) > 1e-4) { ws.range = (ws.range || 2) * g / P._faG; if (ws.arc) ws.arc *= g / P._faG; P._faG = g; }
  };
  const gain = (P, n) => { const k = (adv(P) === 'inner' ? 1.5 : 1) * (leg(P) === 'lg_thousand' ? 2 : 1); P._faEn = Math.min(100, (P._faEn || 0) + n * k); };
  const baseRange = P => { const wd = P.item && R.WEAPONS[P.item.base]; return (wd && wd.range) || 2; };
  // 步法：往準心移動（前面有敵人就停在牠面前）
  const stepMove = (P, boosted) => {
    const a = P.aimA != null ? P.aimA : P.yaw, k = Math.max(0.5, ((P.ws && P.ws.range) || 2) / baseRange(P) / rangeOf(P)), far = 2 * k * (boosted ? 3 : 1);
    const tgt = (W().enemies || []).filter(e => !e.dead && !e.under && dist(e, P) < far + (e.def.size || 1) * 0.5 + 0.8 && Math.abs(wrap(angTo(P, e) - a)) < 0.6).sort((p, q) => dist(p, P) - dist(q, P))[0];
    let len = far; if (tgt) len = Math.max(0, dist(tgt, P) - (tgt.def.size || 1) * 0.5 - 0.7);
    if (len < 0.2) return;
    if (boosted) {
      let x = P.x + Math.sin(a) * len, z = P.z + Math.cos(a) * len;
      if (R.lineOpen && !R.lineOpen(P.x, P.z, x, z)) { const p = R.openFloorNear ? R.openFloorNear(x, z, [P.x, P.z]) : [P.x, P.z]; x = p[0]; z = p[1]; }
      R.fx && R.fx('blink', P.x, 1, P.z); P.x = x; P.z = z; R.collide(P, 0.42); R.fx && R.fx('blink', P.x, 1, P.z);
    } else if (R.dash) R.dash(a, len, 0.14, {});
  };
  CORE.monk = {
    name: '四法', col: '#FFB45A',
    help: P => 'X 換「法」（拳法 → 掌法 → 步法 → 腿法），可以頻繁切換接招，也可以一直用同一種。拳法：攻速 +30%；掌法：擊退 +50%；步法：攻速 −25%，每次普攻往準心移動 2 公尺（前面有敵人就停在牠面前）；腿法：攻速 −40%、普攻傷害 +100%、範圍 +30%。'
      + '每次普攻打中 +10 能量；能量滿了換「法」，換過去的那一法會強化：拳法 4 秒攻速 +100%；掌法下一擊擊退 +200%（撞牆暈眩、多 30 能量）；步法瞬移到敵人面前，之後 3 下傷害 +25%（換法也算）；腿法下一擊連踢兩下、傷害再 ×2、暈眩。'
      + ({ fistsaint: '拳聖：拳法攻速再 +15%（強化 +130%）。', staffmonk: '棍僧：腿法範圍 +60%、掌法擊退 +100%。', inner: '內修者：能量多 50%。', waixiu: '外修者：步法不減攻速。' }[adv(P)] || ''),
    floor: P => { P._fa = P._fa || 'fist'; apply(P); },
    step(dt, P) {
      P._fa = P._fa || 'fist'; apply(P);
      const b = P._faBoost; if (b && b.s === 'fist' && CT() >= b.until) { P._faBoost = null; P._faEn = 0; }
      // 掌法強化打飛的敵人：撞牆 → 暈眩、多拿能量
      (W().enemies || []).forEach(e => {
        if (!e._palmT || e.dead) return; if (CT() > e._palmT) { e._palmT = 0; return; }
        const sp = Math.hypot(e.kx || 0, e.kz || 0); if (sp < 1) return;
        const ux = e.kx / sp, uz = e.kz / sp, r = (e.def.size || 1) * 0.5 + 0.35, x = e.x + ux * r, z = e.z + uz * r;
        const wall = (R.isFloor && !R.isFloor(x, z)) || (R.pointBlocked && R.pointBlocked(x, z));
        if (wall) { e._palmT = 0; e.kx = e.kz = 0; e.st.stun = Math.max(e.st.stun || 0, 1.5); gain(P, 30); say(e, '撞牆！', 'crit'); R.shake && R.shake(0.18); R.fx && R.fx('ring', e.x, 0.3, e.z, { r: 1.2, color: '#7AC8FF' }); }
      });
    },
    // 每一下普攻：傷害、擊退、強化
    mod(e, raw, o, P) {
      if (!o.primary || o.reflect) return raw;
      const s = P._fa || 'fist', b = P._faBoost;
      let r = raw, o2 = o;
      if (s === 'leg') r *= 2;
      if (P._faStepHits > 0) r *= 1.25;                                                     // 步法強化：3 下傷害 +25%（換法也算）
      if (s === 'palm') { const ws = P.ws || {}, kb0 = o.kb != null ? o.kb : ws.kb || 1, up = (adv(P) === 'staffmonk' ? 1.0 : 0.5) + (b && b.s === 'palm' ? 2.0 : 0); o2 = Object.assign({}, o, { kb: kb0 * (1 + up) }); if (b && b.s === 'palm') e._palmT = CT() + 0.8; }
      if (s === 'leg' && b && b.s === 'leg') { r *= 2; o2 = Object.assign({}, o2, { stun: Math.max(o2.stun || 0, 1.2) }); const r2 = r, ee = e; setTimeout(() => { if (!ee.dead && live()) { R.coreHit(ee, r2, { stun: 1.2 }); R.fx && R.fx('swing', ee.x, 1, ee.z, { a: P.aimA, range: 1.6, arc: 1.2, color: '#E8C04A' }); } }, 140); }
      P._faHitT = CT();
      return o2 === o ? r : { raw: r, o: o2 };
    },
    act(P) {
      const i = ORDER.indexOf(P._fa || 'fist'), next = ORDER[(i + 1) % ORDER.length], full = (P._faEn || 0) >= 100 && !(P._faStepHits > 0);   // 步法強化的 3 下還沒打完：不再強化
      if (CT() - (P._faSw || 0) < 0.2) return; P._faSw = CT();
      P._fa = next; apply(P);
      if (full) { P._faBoost = { s: next, until: CT() + 4, n: next === 'step' ? 1 : 1 }; say(P, FA[next][0] + '・強化', 'crit'); R.fx && R.fx('ring', P.x, 0.2, P.z, { r: 2.2, color: FA[next][1] }); apply(P); }
      else say(P, FA[next][0], 'heal');
    },
    gauge(P) {
      const s = P._fa || 'fist', en = Math.round(P._faEn || 0), b = P._faBoost;
      const T = { fist: '攻速 +30%', palm: '擊退 +50%', step: '普攻往前衝 2 公尺', leg: '傷害 +100%、範圍 +30%' }[s];
      return { name: FA[s][0] + (b && b.s === s ? '・強化' : ''), col: FA[s][1], v: en, max: 100, full: en >= 100, text: T + (P._faStepHits > 0 ? '・傷害 +25%（' + P._faStepHits + ' 下）' : ''), x: en >= 100 && !(P._faStepHits > 0) ? 'X 換法：強化' : 'X 換法' };
    }
  };
  // 普攻真的出手了（攻擊冷卻變長）：能量、步法的移動、強化用掉
  const at0 = R.attack;
  if (at0) R.attack = (...a) => {
    const P = W().P, mk = P && P.cls === 'monk' && live() && CORE.monk;
    const c0 = P ? P.atkCd || 0 : 0, h0 = P ? P._faHitT || 0 : 0, r = at0(...a);
    if (!mk || (P.atkCd || 0) <= c0 + 0.01) return r;
    const s = P._fa || 'fist', b = P._faBoost;
    if (s === 'step') stepMove(P, !!(b && b.s === 'step'));
    setTimeout(() => {   // 這一下的傷害結算完（近戰有一點延遲）再算能量、用掉強化
      if (!live() || W().P !== P) return;
      const hit = (P._faHitT || 0) > h0;
      if (P._faStepHits > 0) { P._faStepHits--; if (P._faStepHits === 0) P._faEn = 0; }
      if (b && b.s === s && s !== 'fist' && (hit || s === 'step')) {   // 掌法、腿法的強化：打中才用掉（揮空留著）
        P._faBoost = null;
        if (s === 'step') P._faStepHits = 3; else P._faEn = 0;
      }
      if (hit && !(P._faStepHits > 0) && !(P._faBoost)) gain(P, 10);
    }, 260);
    return r;
  };
  // 傳說武器的說明（原本是連段的）
  (R.LEGENDS || []).forEach(l => { if (l.id === 'lg_thousand') l.desc = '「四法」的能量累積快一倍。'; if (l.id === 'lg_immovable') l.desc = '腿法不減攻速。'; });
})(window.R);
