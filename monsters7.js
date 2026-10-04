// 遺跡生物的新動作・第三批（作者 2026-10-03：怪物的邏輯還是有重複的，大同小異，要做更不一樣的區分）
// 原本同一種行為（俯衝、撲擊、衝撞、閃現、舉盾、鑽地、翻滾、埋伏……）底下掛了好幾種生物；
// 這裡每一組留一種當「原型」（纏身布、影撲貓、蛛身牛、無面影、守墓骨兵、鑽口蛇、滾土球、黑泥巨口……），其他的各自換成自己的打法。
// 變種（荒、獰、淵）跟著本體一起換。招式都會先在地上亮出範圍或記號（翻滾躲得掉）。
// 另外（作者：引魂燈在幫怪物補血的時候，大型怪或其他怪會優先保護補血的小燈籠）：
//   引魂燈附近最大隻的兩、三隻生物變成「護衛」（受到的傷害少兩成五）：平常站在引魂燈和你之間；
//   你要去打引魂燈（走近、瞄著牠、打到牠）時，護衛衝到你面前擋住；引魂燈被打的時候，旁邊的護衛替牠擋下六成。
// 放在 monsters6.js 後面。
(function (R) {
  const W = () => R.W, rnd = Math.random, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const AI = R.AI_X = R.AI_X || {};
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const floorAt = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  const targets = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed)).filter(t => t && !t.dead); };
  const hurtAny = (t, dmg, e, o) => (t.ally ? R.hurtAlly(t, dmg, e) : R.hurtPlayer(dmg, e, o));
  const near = (x, z, r) => targets().filter(t => Math.hypot(t.x - x, t.z - z) < r);
  const setAi = (id, ai) => Object.keys(R.ENEMIES).forEach(k => { const d = R.ENEMIES[k]; if (k === id || d.vbase === id || k.indexOf(id + '_v') === 0) d.ai = ai; });
  const side = e => e.side || (e.side = rnd() < 0.5 ? 1 : -1);
  const orbit = (e, d, a, lo, hi) => (d > hi ? a : d < lo ? a + Math.PI : a + Math.PI / 2 * side(e));
  const slowP = (t, s) => { if (t && !t.ally) t.slowT = Math.max(t.slowT || 0, s); };
  const blindP = (t, s) => { if (t && !t.ally) t.blindT = Math.max(t.blindT || 0, s); };
  const pushP = (t, a, k) => { if (!t || t.ally) return; t.x += Math.sin(a) * k; t.z += Math.cos(a) * k; R.collide && R.collide(t, 0.42); };
  // 地上先亮圈，t 秒後炸開
  const boom = (e, x, z, r, t, k, col, after) => { R.fx('mark', x, 0, z, { r, t }); later(() => { if (e.dead) return; R.fx('boom', x, 0.3, z, { r, color: col }); near(x, z, r).forEach(tg => { if (!(tg.iframe > 0)) { hurtAny(tg, e.dmg * k, e); if (after) after(tg); } }); }, t * 1000); };
  // 扇形
  const cone = (e, a, arc, range, t, k, col, after) => { R.fx('sector', e.x, 0, e.z, { a, arc, range, t }); later(() => { if (e.dead) return; R.fx('swing', e.x, 0, e.z, { a, arc, range, color: col }); targets().forEach(tg => { const dd = Math.hypot(tg.x - e.x, tg.z - e.z), aa = Math.atan2(tg.x - e.x, tg.z - e.z); if (dd < range && Math.abs(wrap(aa - a)) < arc / 2 && !(tg.iframe > 0)) { hurtAny(tg, e.dmg * k, e, { knock: 0.3 }); if (after) after(tg, aa); } }); }, t * 1000); };
  // 直線（寬 w）
  const lineHit = (e, x0, z0, a, len, w, t, k, after) => { R.fx('aim', x0, 0.3, z0, { a, len, t }); later(() => { if (e.dead) return; R.fx('slash', x0, 1.0, z0, { a, len }); targets().forEach(tg => { const dx = tg.x - x0, dz = tg.z - z0, al = dx * Math.sin(a) + dz * Math.cos(a), pe = Math.abs(dx * Math.cos(a) - dz * Math.sin(a)); if (al > 0 && al < len && pe < w && !(tg.iframe > 0)) { hurtAny(tg, e.dmg * k, e); if (after) after(tg); } }); }, t * 1000); };
  // 往外擴的震波（翻滾、跳起來躲得掉）
  const wave = (e, maxR, speed, k, col, onHit) => { const w = W(), run = w.run, done = new Set(), x0 = e.x, z0 = e.z; let r = 0.8; R.fx('ring', x0, 0.1, z0, { r: maxR, color: col }); w.dyn.push(dt => { if (w.run !== run) return false; r += dt * speed; targets().forEach(t => { if (done.has(t)) return; const dd = Math.hypot(t.x - x0, t.z - z0); if (Math.abs(dd - r) < 0.55 && !(t.iframe > 0) && !(t.air > 0)) { done.add(t); hurtAny(t, e.dmg * k, e); if (onHit) onHit(t); } }); return r < maxR; }); };
  const zone = (x, z, r, life, dmg, kind, col) => { const zn = R.addZone({ kind: kind || 'lava', x, z, r, life, dmg }); if (zn && zn.mesh && col) zn.mesh.material.color.set(col); return zn; };
  // 直線衝刺：先畫線 tw 秒，再衝 len 公尺；回傳這一格是不是在衝
  const lunge = (e, a, len, tw, speed, k, o) => { e.ln = Object.assign({ a, len, tw, speed, k, hit: false }, o || {}); R.fx('aim', e.x, 0.3, e.z, { a, len, t: tw }); };
  const lungeStep = (e, P, dt, H) => {
    const L = e.ln; if (!L) return false; e.yaw = L.a;
    if (L.tw > 0) { L.tw -= dt; return true; }
    const k = L.speed * dt, ox = e.x, oz = e.z; e.x += Math.sin(L.a) * k; e.z += Math.cos(L.a) * k; L.len -= k;
    if (!L.hit && dist(e, P) < (L.r || 1.2)) { L.hit = true; H.hurtT(P, e.dmg * L.k, e, { knock: L.knock || 0.4 }); if (L.onHit) L.onHit(P); }
    if (L.trail) { L.tt = (L.tt || 0) - dt; if (L.tt <= 0) { L.tt = 0.18; L.trail(e.x, e.z); } }
    const blocked = R.pointBlocked(e.x, e.z); if (blocked) { e.x = ox; e.z = oz; }
    if (L.len <= 0 || blocked) { e.ln = null; if (L.end) L.end(blocked); }
    return true;
  };
  // 跳：0.45 秒落到 (x1, z1)
  const leapTo = (e, x1, z1, dur, onLand) => { e.lp = { t: 0, dur: dur || 0.45, x0: e.x, z0: e.z, x1, z1, onLand }; };
  const leapStep = (e, dt) => { const L = e.lp; if (!L) return false; L.t += dt; const k = Math.min(1, L.t / L.dur); e.x = L.x0 + (L.x1 - L.x0) * k; e.z = L.z0 + (L.z1 - L.z0) * k; e.m.g.position.y = Math.sin(k * Math.PI) * 1.6; e.yaw = Math.atan2(L.x1 - L.x0, L.z1 - L.z0); if (k >= 1) { e.m.g.position.y = 0; e.lp = null; if (L.onLand) L.onLand(); } return true; };
  const melee = (e, P, d, H, reach, cd, k) => { if (d < reach && e.cd <= 0) { e.cd = cd; H.hurtT(P, e.dmg * (k || 1), e); R.fx('swing', e.x, 0, e.z, { a: e.yaw, arc: 1.4, range: reach, color: '#E8E0CC' }); return true; } return false; };
  const fan = (e, a, n, spread, kind, speed, k, life) => { for (let i = 0; i < n; i++) R.fire({ kind, owner: 'e', x: e.x, z: e.z, a: a + (i - (n - 1) / 2) * spread, speed, dmg: e.dmg * k, life: life || 2.2, src: e }); };
  const radial = (e, n, kind, speed, k, off) => { for (let i = 0; i < n; i++) R.fire({ kind, owner: 'e', x: e.x, z: e.z, a: i / n * Math.PI * 2 + (off || 0), speed, dmg: e.dmg * k, life: 2.4, src: e }); };
  const alpha = (e, a) => R.setBeastAlpha && R.setBeastAlpha(e.m, a);
  const say = (e, t) => R.num && R.num(e.x, 1.8 * (e.def.size || 1) + 0.9, e.z, t, '');

  // ================= 俯衝（原型：纏身布） =================
  // 燈蛾：繞著你轉、灑發光的鱗粉（踩到看不清楚），偶爾短短地衝一下
  setAi('lampmoth', 'mothlight');
  AI.mothlight = (e, P, d, a, sp, dt, walk, H) => {
    if (lungeStep(e, P, dt, H)) return true;
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 3, 5), sp * 1.15, dt); mv = true; } e.yaw = a;
    e.dust = (e.dust == null ? 1.5 : e.dust) - dt;
    if (e.dust <= 0 && d < 7) { e.dust = 3.6; const [x, z] = floorAt(P.x, P.z); R.fx('mark', x, 0, z, { r: 1.6, t: 0.7 }); later(() => { R.fx('poof', x, 0.6, z, { color: '#FFE08A', n: 14 }); near(x, z, 1.7).forEach(t => blindP(t, 1.6)); }, 700); }
    if (e.cd <= 0 && d < 5.5) { e.cd = 3 + rnd(); lunge(e, a, d + 2, 0.4, 13, 1); }
    return mv;
  };
  // 回音蝠：發出回音（一圈），被照到的人「被標記」三秒——附近的回音蝠輪流衝過去；沒標記時亂飛
  setAi('echobat', 'echo');
  AI.echo = (e, P, d, a, sp, dt, walk, H) => {
    if (lungeStep(e, P, dt, H)) return true;
    const w = W(), mark = P.echoMark > w.run.t; let mv = false;
    if (walk) { e.jit = (e.jit || 0) - dt; if (e.jit <= 0) { e.jit = 0.3 + rnd() * 0.3; e.ja = rnd() * Math.PI * 2; } H.move(e, d > 8 ? a : d < 4 ? a + Math.PI : e.ja, sp, dt); mv = true; }
    e.yaw = a;
    if (!mark && e.cd <= 0 && d < 9) { e.cd = 4 + rnd(); R.fx('ring', e.x, 0.6, e.z, { r: 7, color: '#B8A8FF' }); say(e, '回音'); if (d < 7) { P.echoMark = w.run.t + 3; R.toast && R.toast('被回音標記了：蝙蝠會輪流衝過來', '#B8A8FF'); } }
    if (mark && (e.dv == null || e.dv <= 0)) { const bats = w.enemies.filter(o => !o.dead && o.def.ai === 'echo' && dist(o, P) < 12), i = bats.indexOf(e); e.dv = 0.5 + Math.max(0, i) * 0.55; }
    if (mark && e.dv > 0) { e.dv -= dt; if (e.dv <= 0) { e.dv = 9; lunge(e, a, d + 2, 0.3, 15, 1); } }
    if (!mark) e.dv = null;
    return mv;
  };
  // 抱嬰鳥：繞圈；「哭聲」一圈（被碰到會踉蹌、變慢），接著俯衝到被哭聲碰到的人
  setAi('ubume', 'cradle');
  AI.cradle = (e, P, d, a, sp, dt, walk, H) => {
    if (lungeStep(e, P, dt, H)) return true;
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 4, 6.5), sp, dt); mv = true; } e.yaw = a;
    if (e.cry > 0) { e.cry -= dt; if (e.cry <= 0) { wave(e, 6, 6, 0.4, '#E8D8F0', t => { slowP(t, 1.5); t.stumble = Math.max(t.stumble || 0, 0.4); e.cryHit = 1; }); later(() => { if (!e.dead && e.cryHit) { e.cryHit = 0; const Q = W().P; lunge(e, angTo(e, Q), dist(e, Q) + 2, 0.25, 16, 1.3); } }, 900); } }
    else if (e.cd <= 0 && d < 7) { e.cd = 4.5 + rnd(); e.cry = 1.0; say(e, '哭聲……'); R.fx('mark', e.x, 0, e.z, { r: 6, t: 1.0 }); }
    return mv;
  };
  // 水母燈：慢慢飄到你頭上，垂下三條觸手（三個圈，電一下會變慢）；碰到牠的傘也會被電
  setAi('jellylamp', 'jelly');
  AI.jelly = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk && d > 1.5) { H.move(e, a, sp * 0.7, dt); mv = true; } e.yaw = a;
    e.zt = (e.zt || 0) - dt; if (d < 1.3 && e.zt <= 0) { e.zt = 1; H.hurtT(P, e.dmg * 0.5, e); slowP(P, 0.8); R.fx('ring', e.x, 0.3, e.z, { r: 1.3, color: '#7AD8FF' }); }
    if (e.cd <= 0 && d < 6) { e.cd = 3.2 + rnd(); for (let i = 0; i < 3; i++) { const an = rnd() * Math.PI * 2, rr = i ? 1.2 + rnd() * 1.4 : 0, [x, z] = floorAt(P.x + Math.sin(an) * rr, P.z + Math.cos(an) * rr); boom(e, x, z, 1.1, 0.9 + i * 0.15, 0.8, '#7AD8FF', t => slowP(t, 1.2)); } }
    return mv;
  };
  // 深淵鰩：大圈大圈地滑翔、身後留下一條會電人的水痕；經過你身邊時甩尾（身後一片扇形）
  setAi('abyssray', 'ray');
  AI.ray = (e, P, d, a, sp, dt, walk, H) => {
    e.ga = (e.ga == null ? a : e.ga); const want = d > 9 ? a : a + Math.PI / 2 * side(e) * 0.85, turn = wrap(want - e.ga); e.ga += Math.max(-1.6 * dt, Math.min(1.6 * dt, turn));
    let mv = false; if (walk) { const ox = e.x, oz = e.z; H.move(e, e.ga, sp * 1.3, dt); mv = true; if (Math.hypot(e.x - ox, e.z - oz) < sp * dt * 0.3) { e.ga += Math.PI * 0.7; e.side = -side(e); } }
    e.yaw = e.ga; e.wk = (e.wk || 0) - dt; if (e.wk <= 0) { e.wk = 0.35; zone(e.x, e.z, 0.8, 2.2, e.dmg * 0.2, 'caltrop', '#5AA8FF'); }
    if (e.cd <= 0 && d < 3.5) { e.cd = 2.6; cone(e, e.ga + Math.PI, 1.6, 4, 0.35, 1.1, '#5AA8FF', t => slowP(t, 1)); }
    return mv;
  };

  // ================= 撲擊（原型：影撲貓） =================
  // 影蜥：停下來的時候幾乎看不見；之字形快跑三段衝過來咬一口，再退回暗處
  setAi('shadelizard', 'lurk');
  AI.lurk = (e, P, d, a, sp, dt, walk, H) => {
    if (e.zz) { const Z = e.zz; Z.t -= dt; alpha(e, 0.9); const ang = a + Z.off; if (walk) H.move(e, ang, sp * 2.6, dt); if (Z.t <= 0) { Z.n--; Z.off = -Z.off; Z.t = 0.28; if (Z.n <= 0 || d < 1.3) { e.zz = null; if (d < 1.6) { H.hurtT(P, e.dmg * 1.3, e); R.fx('swing', e.x, 0, e.z, { a, arc: 1.2, range: 1.6, color: '#2A2A34' }); } e.back = 1.2; } } e.yaw = ang; return true; }
    if (e.back > 0) { e.back -= dt; if (walk) H.move(e, a + Math.PI, sp * 1.4, dt); e.yaw = a; alpha(e, 0.5); return true; }
    alpha(e, 0.15); e.yaw = a;
    let mv = false; if (walk && d > 6) { H.move(e, a, sp * 0.6, dt); mv = true; }
    if (e.cd <= 0 && d < 7) { e.cd = 3.2 + rnd(); e.zz = { n: 3, t: 0.28, off: 0.7 * side(e) }; R.fx('mark', P.x, 0, P.z, { r: 1.2, t: 0.8 }); }
    return mv;
  };
  // 蝕骨犬：兩隻的時候一隻在前面吠（引開），另一隻繞到背後撲；一隻的時候連咬三口
  setAi('bonehound', 'packhound');
  AI.packhound = (e, P, d, a, sp, dt, walk, H) => {
    if (leapStep(e, dt)) return true;
    const w = W(), mates = w.enemies.filter(o => !o.dead && o.def.ai === 'packhound' && dist(o, e) < 12), lead = mates[0] === e;
    let mv = false;
    if (mates.length >= 2 && lead) { if (walk) { H.move(e, orbit(e, d, a, 3, 4.5), sp, dt); mv = true; } e.yaw = a; e.bark = (e.bark || 0) - dt; if (e.bark <= 0) { e.bark = 1.6; say(e, '吠！'); R.fx('ring', e.x, 0.3, e.z, { r: 2, color: '#E8E0CC' }); } return mv; }
    if (mates.length >= 2) { const back = (P.yaw != null ? P.yaw : a) + Math.PI, [bx, bz] = floorAt(P.x + Math.sin(back) * 3, P.z + Math.cos(back) * 3), db = Math.hypot(bx - e.x, bz - e.z); if (db > 1 && walk) { H.move(e, Math.atan2(bx - e.x, bz - e.z), sp * 1.3, dt); mv = true; } e.yaw = a; if (db < 1.5 && e.cd <= 0) { e.cd = 2.6; R.fx('mark', P.x, 0, P.z, { r: 1.2, t: 0.4 }); const tx = P.x, tz = P.z; later(() => { if (!e.dead) leapTo(e, tx, tz, 0.35, () => { if (dist(e, W().P) < 1.4) hurtAny(W().P, e.dmg * 1.4, e); }); }, 400); } return mv; }
    if (d > 1.6) { if (walk) { H.move(e, a, sp * 1.1, dt); mv = true; } } else if (e.cd <= 0) { e.cd = 2; [0, 260, 520].forEach(ms => later(() => { if (!e.dead && dist(e, W().P) < 1.9) { hurtAny(W().P, e.dmg * 0.6, e); R.fx('swing', e.x, 0, e.z, { a: angTo(e, W().P), arc: 1, range: 1.8, color: '#E8E0CC' }); } }, ms)); }
    e.yaw = a; return mv;
  };
  // 雙生影：兩個連在一起；打其中一個，另一個會閃到你背後；一個倒下，另一個發狂（更快、更痛）
  setAi('twinshade', 'twins');
  AI.twins = (e, P, d, a, sp, dt, walk, H) => {
    const w = W();
    if (e.twin === undefined) { const o = w.enemies.find(x => !x.dead && x !== e && x.def.ai === 'twins' && !x.twin && dist(x, e) < 14); e.twin = o || null; if (o) o.twin = e; }
    if (e.twin && e.twin.dead && !e.mad) { e.mad = 1; e.speed *= 1.5; e.dmg *= 1.4; say(e, '發狂'); R.fx('ring', e.x, 0.2, e.z, { r: 2, color: '#8A3AE8' }); }
    if (leapStep(e, dt)) return true;
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 2.5, 4.5), sp * (e.mad ? 1.2 : 1), dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 6) { e.cd = (e.mad ? 1.6 : 2.6) + rnd(); R.fx('mark', P.x, 0, P.z, { r: 1.2, t: 0.5 }); const tx = P.x, tz = P.z; later(() => { if (!e.dead) leapTo(e, tx, tz, 0.35, () => { if (dist(e, W().P) < 1.3) hurtAny(W().P, e.dmg * 1.2, e); }); }, 500); }
    return mv;
  };
  // 狂猿：連跳兩三下逼近（每次落地震一下）；遠的時候搬石頭砸；捶胸大吼（附近的人踉蹌）
  setAi('hihi', 'ape');
  AI.ape = (e, P, d, a, sp, dt, walk, H) => {
    if (leapStep(e, dt)) return true;
    let mv = false; e.yaw = a;
    if (e.hops > 0 && e.cd2 <= 0) { e.hops--; e.cd2 = 0.25; const k = Math.min(d - 1, 4.5), [x, z] = floorAt(e.x + Math.sin(a) * k, e.z + Math.cos(a) * k); R.fx('mark', x, 0, z, { r: 2, t: 0.45 }); leapTo(e, x, z, 0.45, () => { R.fx('boom', e.x, 0.3, e.z, { r: 2, color: '#8A6A4A' }); R.shake && R.shake(0.3); near(e.x, e.z, 2).forEach(t => { if (!(t.iframe > 0)) hurtAny(t, e.dmg * 0.9, e, { knock: 0.4 }); }); }); return true; }
    e.cd2 = (e.cd2 || 0) - dt;
    if (walk && d > 2.4) { H.move(e, a, sp * 0.8, dt); mv = true; }
    if (e.cd <= 0) {
      const r = rnd(); e.cd = 3 + rnd();
      if (d > 7 && r < 0.5) { R.fx('mark', P.x, 0, P.z, { r: 1.6, t: 1 }); boom(e, P.x, P.z, 1.6, 1, 1.2, '#8A7A6A'); say(e, '丟石頭'); }
      else if (d < 4 && r < 0.4) { say(e, '吼！'); wave(e, 5, 7, 0.5, '#C8A060', t => { t.stumble = Math.max(t.stumble || 0, 0.6); }); }
      else { e.hops = 2 + (rnd() < 0.5 ? 1 : 0); e.cd2 = 0; }
    }
    if (d < 2 && melee(e, P, d, H, 2.2, 1.4, 1)) return mv;
    return mv;
  };
  // 晶刃螳螂：舉刀不動（架式）；你走進三公尺半就交叉斬（兩條線）；架式中被打會格開、馬上反斬
  setAi('crystmantis', 'mantis');
  AI.mantis = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; let mv = false;
    if (e.recover > 0) { e.recover -= dt; e.stance = false; if (walk && d > 4) { H.move(e, a, sp * 0.8, dt); mv = true; } return mv; }
    if (d > 5.5) { e.stance = false; if (walk) { H.move(e, a, sp * 0.7, dt); mv = true; } return mv; }
    e.stance = true;
    if ((d < 3.5 || e.riposte) && e.cd <= 0) { e.riposte = 0; e.cd = 1.8; e.recover = 1.2; [0.35, -0.35].forEach((o, i) => lineHit(e, e.x - Math.sin(a + o) * 0.5, e.z - Math.cos(a + o) * 0.5, a + o * 0.2 + (i ? 0.25 : -0.25), 4.5, 0.6, 0.35 + i * 0.12, 1.1)); say(e, '斬'); }
    return mv;
  };
  // 雙首犬：一顆頭對你噴火（扇形），另一顆頭咬你的隊友（沒有隊友就咬你）
  setAi('twinhound', 'twohead');
  AI.twohead = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk && d > 3) { H.move(e, a, sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 7) { e.cd = 3 + rnd(); cone(e, a, 1.0, 6, 0.6, 1, '#FF7A3A', t => zone(t.x, t.z, 0.9, 2.5, e.dmg * 0.25, 'lava')); say(e, '噴火'); }
    e.bt = (e.bt || 1.5) - dt;
    if (e.bt <= 0) { e.bt = 1.6; const allies = (W().allies || []).filter(x => !x.downed && dist(x, e) < 3.2), tg = allies[0] || (d < 2.6 ? P : null); if (tg) { hurtAny(tg, e.dmg * 0.8, e); R.fx('swing', e.x, 0, e.z, { a: angTo(e, tg), arc: 1.2, range: 2.6, color: '#3A2A2A' }); } }
    return mv;
  };

  // ================= 衝撞（原型：蛛身牛；土鎧豬是狩獵場的野獸，照舊） =================
  // 鏡魔像：胸口的鏡子反光（扇形，看不清楚），趁你看不清楚的時候慢慢衝過來；正面打牠會被鏡子擋掉一些
  setAi('mirrorgolem', 'mirror');
  AI.mirror = (e, P, d, a, sp, dt, walk, H) => {
    if (lungeStep(e, P, dt, H)) return true;
    e.frontK = 0.6; let mv = false; if (walk && d > 3) { H.move(e, a, sp * 0.8, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 9) { e.cd = 4 + rnd(); cone(e, a, 1.1, 9, 0.7, 0.3, '#E8F0FF', t => blindP(t, 2)); say(e, '反光'); later(() => { if (!e.dead && W().P.blindT > 0) { const Q = W().P; lunge(e, angTo(e, Q), dist(e, Q) + 2, 0.5, 11, 1.4, { knock: 0.6, end: b => { if (b) e.st.stun = 1.5; } }); } }, 900); }
    melee(e, P, d, H, 2.2, 1.6, 1);
    return mv;
  };
  // 白骨百足：扭著身子爬，爬過的地方豎起骨刺；每隔一陣子全身的骨頭射出去一圈
  setAi('bonecentipede', 'bonesnake');
  AI.bonesnake = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; const ang = a + Math.sin(e.t * 3) * 0.8; if (walk && d > 1.6) { H.move(e, ang, sp, dt); mv = true; } e.yaw = ang;
    e.sp2 = (e.sp2 || 0) - dt; if (e.sp2 <= 0 && mv) { e.sp2 = 0.45; zone(e.x, e.z, 0.7, 4, e.dmg * 0.25, 'caltrop', '#E8E0CC'); }
    if (e.cd <= 0 && d < 8) { e.cd = 5; R.fx('mark', e.x, 0, e.z, { r: 2.5, t: 0.6 }); later(() => { if (!e.dead) { radial(e, 14, 'bone', 9, 0.7, rnd()); R.fx('ring', e.x, 0.2, e.z, { r: 2.5, color: '#E8E0CC' }); } }, 600); }
    melee(e, P, d, H, 1.9, 1.1, 1);
    return mv;
  };
  // 蟹甲僧：橫著走，硬殼一直對著你（正面幾乎打不動，繞到後面）；夾兩下、噴泡泡（打中變慢）
  setAi('kanibo', 'crab');
  AI.crab = (e, P, d, a, sp, dt, walk, H) => {
    e.frontK = 0.2; e.yaw = a; let mv = false;
    if (walk) { const want = d > 3 ? a + 0.6 * side(e) : a + Math.PI / 2 * side(e); e.sw = (e.sw || 2) - dt; if (e.sw <= 0) { e.sw = 1.6 + rnd(); e.side = -side(e); } H.move(e, want, sp * 0.9, dt); mv = true; }
    if (e.cd <= 0) { if (d < 2.4) { e.cd = 2; [0, 350].forEach(ms => cone(e, a, 1.3, 2.4, 0.3 + ms / 1000, 0.8, '#C86A4A')); } else if (d < 7) { e.cd = 3.5; fan(e, a, 5, 0.2, 'eorb', 6, 0.4, 1.6); R.fx('poof', e.x, 0.8, e.z, { color: '#C8E8FF', n: 10 }); later(() => near(e.x, e.z, 7).forEach(t => slowP(t, 0.6)), 400); } }
    return mv;
  };
  // 瀝青獸：走過的地方留下瀝青（踩到變慢）；丟瀝青團；你被黏住（變慢）的時候才衝過來
  setAi('tarbeast', 'tar');
  AI.tar = (e, P, d, a, sp, dt, walk, H) => {
    if (lungeStep(e, P, dt, H)) return true;
    let mv = false; if (walk && d > 2.2) { H.move(e, a, sp * 0.8, dt); mv = true; } e.yaw = a;
    e.tp = (e.tp || 0) - dt; if (e.tp <= 0 && mv) { e.tp = 0.6; zone(e.x, e.z, 1.0, 6, 0, 'web', '#2A2420'); }
    if (e.cd <= 0) {
      if ((P.slowT || 0) > 0.2 && d < 10) { e.cd = 3; lunge(e, a, d + 2, 0.5, 12, 1.4, { knock: 0.5 }); say(e, '衝！'); }
      else if (d < 9) { e.cd = 2.6; const [x, z] = floorAt(P.x, P.z); boom(e, x, z, 1.4, 1.0, 0.6, '#2A2420', t => slowP(t, 2)); later(() => zone(x, z, 1.4, 6, 0, 'web', '#2A2420'), 1000); }
    }
    melee(e, P, d, H, 2, 1.4, 1);
    return mv;
  };
  // 時計騎士：一秒走一步（滴答）；每四聲「噹」就直衝一次；三次「噹」之後讓周圍的時間變慢，一口氣連刺三下
  setAi('clockknight', 'clock');
  AI.clock = (e, P, d, a, sp, dt, walk, H) => {
    if (lungeStep(e, P, dt, H)) return true;
    e.tick = (e.tick == null ? 1 : e.tick) - dt; e.yaw = a; let mv = false;
    if (e.stepT > 0) { e.stepT -= dt; if (walk) { H.move(e, a, sp * 2.2, dt); mv = true; } }
    if (e.tick <= 0) {
      e.tick = 1; e.n = (e.n || 0) + 1; e.stepT = 0.25; say(e, e.n % 4 ? '滴答' : '噹');
      if (e.n % 4 === 0) {
        e.chimes = (e.chimes || 0) + 1;
        if (e.chimes % 3 === 0) { R.fx('ring', e.x, 0.1, e.z, { r: 8, color: '#E8C04A' }); near(e.x, e.z, 8).forEach(t => slowP(t, 2.2)); R.toast && R.toast('時間變慢了', '#E8C04A'); [300, 800, 1300].forEach(ms => later(() => { if (!e.dead) { const Q = W().P; lineHit(e, e.x, e.z, angTo(e, Q), 5, 0.6, 0.3, 0.9); } }, ms)); }
        else lunge(e, a, Math.min(14, d + 3), 0.45, 14, 1.3, { knock: 0.6 });
      }
    }
    return mv;
  };

  // ================= 閃現（原型：無面影） =================
  // 霧燈靈：在附近亂跳，留下一團一團的霧（看不清楚）；提燈一照（扇形）
  setAi('mistwisp', 'wisplure');
  AI.wisplure = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; e.hop = (e.hop == null ? 1.5 : e.hop) - dt;
    if (e.hop <= 0) { e.hop = 2.2 + rnd(); zone(e.x, e.z, 1.6, 5, 0, 'web', '#D8E0E8'); near(e.x, e.z, 1.8).forEach(t => blindP(t, 1.2)); const an = rnd() * Math.PI * 2, rr = 3.5 + rnd() * 2, [x, z] = floorAt(P.x + Math.sin(an) * rr, P.z + Math.cos(an) * rr); R.fx('blink', e.x, 1, e.z); e.x = x; e.z = z; R.fx('blink', x, 1, z); }
    if (e.cd <= 0 && d < 6) { e.cd = 2.8 + rnd(); cone(e, a, 0.9, 6, 0.5, 0.9, '#F0F4FF', t => blindP(t, 0.8)); }
    return false;
  };
  // 虛空行者：在地上開一個虛空洞（把人吸過去、待在裡面會受傷）；從洞口伸出虛空的刺（直線）
  setAi('voidwalker', 'void');
  AI.void = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk && d > 3) { H.move(e, a, sp * 0.8, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 10) {
      e.cd = 5 + rnd(); const [x, z] = floorAt(P.x + (rnd() - 0.5) * 2, P.z + (rnd() - 0.5) * 2), w = W(), run = w.run; let t = 3.5;
      R.fx('mark', x, 0, z, { r: 2.6, t: 0.6 }); say(e, '虛空');
      later(() => { if (e.dead) return; const zn = zone(x, z, 2.6, 3.5, e.dmg * 0.3, 'lava', '#3A1A5A'); w.dyn.push(dt2 => { if (w.run !== run) return false; t -= dt2; const Q = w.P, dd = Math.hypot(Q.x - x, Q.z - z); if (dd < 6 && dd > 0.4 && !(Q.iframe > 0)) pushP(Q, Math.atan2(x - Q.x, z - Q.z), 2.2 * dt2); return t > 0 && !zn.dead; }); for (let i = 0; i < 3; i++) later(() => { if (!e.dead) { const Q = W().P; lineHit(e, x, z, Math.atan2(Q.x - x, Q.z - z), 7, 0.5, 0.45, 0.8); } }, 500 + i * 900); }, 600);
    }
    melee(e, P, d, H, 2.4, 1.5, 1.1);
    return mv;
  };
  // 青目僧：念經——在你周圍畫一個封印圈，圈還在的時候站在裡面就被定住；身邊繞著兩團青火
  setAi('aobo', 'monk');
  AI.monk = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 4, 6), sp * 0.7, dt); mv = true; } e.yaw = a;
    e.orb = (e.orb || 0) + dt * 2.4; for (let i = 0; i < 2; i++) { const oa = e.orb + i * Math.PI, ox = e.x + Math.sin(oa) * 1.6, oz = e.z + Math.cos(oa) * 1.6; if (Math.hypot(P.x - ox, P.z - oz) < 0.7 && !(P.iframe > 0)) { e.ot = (e.ot || 0) - dt; if (e.ot <= 0) { e.ot = 0.8; H.hurtT(P, e.dmg * 0.6, e); } } if (rnd() < 0.15) R.fx('poof', ox, 1, oz, { color: '#4A8AFF', n: 1 }); }
    if (e.cd <= 0 && d < 9) { e.cd = 5 + rnd(); const x = P.x, z = P.z; say(e, '念經'); R.fx('ring', x, 0.1, z, { r: 3, color: '#4A8AFF' }); R.fx('mark', x, 0, z, { r: 3, t: 1.5 }); later(() => { if (e.dead) return; R.fx('ring', x, 0.1, z, { r: 3, color: '#2A5AFF' }); near(x, z, 3).forEach(t => { if (!(t.iframe > 0)) { slowP(t, 2.5); hurtAny(t, e.dmg * 0.6, e); } }); }, 1500); }
    return mv;
  };
  // 回聲影：照你兩秒前走過的路跟著你（你的腳步聲）；每隔一陣子，在你一秒半前站的地方踩一下
  setAi('echoshade', 'footsteps');
  AI.footsteps = (e, P, d, a, sp, dt, walk, H) => {
    const run = W().run; e.tr = e.tr || []; e.rt = (e.rt || 0) - dt; if (e.rt <= 0) { e.rt = 0.15; e.tr.push([P.x, P.z, run.t]); if (e.tr.length > 30) e.tr.shift(); }
    const old = e.tr.find(p => run.t - p[2] <= 2.0) || e.tr[0]; let mv = false;
    if (old && walk) { const dd = Math.hypot(old[0] - e.x, old[1] - e.z); if (dd > 0.3) { H.move(e, Math.atan2(old[0] - e.x, old[1] - e.z), Math.min(sp * 1.6, dd / dt), dt); mv = true; } }
    e.yaw = a; alpha(e, 0.55);
    if (e.cd <= 0) { const p = e.tr.find(q => run.t - q[2] <= 1.5); if (p) { e.cd = 2.4; boom(e, p[0], p[1], 1.4, 0.4, 1, '#5A5A6A'); } }
    melee(e, P, d, H, 1.6, 1.2, 1);
    return mv;
  };

  // ================= 舉盾（原型：守墓骨兵） =================
  // 鏽甲兵：慢慢逼近、用盾撞人；被打會掉鏽屑（一團，踩到變慢）；血剩一半以下盔甲裂開——丟掉盾，變快、變兇
  setAi('rustknight', 'rust');
  AI.rust = (e, P, d, a, sp, dt, walk, H) => {
    if (!e.broke && e.hp < e.hpMax * 0.5) { e.broke = 1; e.frontK = null; e.speed *= 1.7; e.dmg *= 1.3; say(e, '盔甲裂開'); R.fx('boom', e.x, 0.6, e.z, { r: 1.5, color: '#8A5A3A' }); if (e.m.shield) e.m.shield.visible = false; }
    if (!e.broke) e.frontK = 0.25;
    let mv = false; if (walk && d > 1.8) { H.move(e, a, sp * (e.broke ? 1.2 : 0.8), dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 2.2) { e.cd = e.broke ? 0.9 : 1.8; if (e.broke) melee(e, P, d, H, 2.2, 0.9, 1); else { H.hurtT(P, e.dmg * 0.8, e, { knock: 0.5 }); pushP(P, a, 1.2); R.fx('block', e.x + Math.sin(a), 1, e.z + Math.cos(a)); } }
    return mv;
  };
  // 冰棺守：守在原地（正面打不動）；冰錐一路刺過來；你貼近時把自己封進冰裡（打不動），接著炸出一圈寒氣（變慢）
  setAi('icewarden', 'icecoffin');
  AI.icecoffin = (e, P, d, a, sp, dt, walk, H) => {
    e.home = e.home || [e.x, e.z]; e.frontK = 0.15; e.yaw = a; let mv = false;
    if (e.seal > 0) { e.seal -= dt; e.invuln = true; if (e.seal <= 0) { e.invuln = false; wave(e, 5, 8, 0.9, '#BFE8FF', t => slowP(t, 2.5)); } return false; }
    const dh = Math.hypot(e.home[0] - e.x, e.home[1] - e.z); if (walk && dh > 1) { H.move(e, Math.atan2(e.home[0] - e.x, e.home[1] - e.z), sp, dt); mv = true; }
    if (e.cd <= 0) { if (d < 2.6) { e.cd = 4; e.seal = 1.2; say(e, '封冰'); R.fx('mark', e.x, 0, e.z, { r: 5, t: 1.2 }); } else if (d < 11) { e.cd = 2.6; for (let i = 1; i <= 6; i++) { const [x, z] = floorAt(e.x + Math.sin(a) * i * 1.6, e.z + Math.cos(a) * i * 1.6); later(() => boom(e, x, z, 0.9, 0.35, 0.7, '#BFE8FF', t => slowP(t, 1)), i * 110); } } }
    return mv;
  };
  // 陶片將：把盤子丟過來（落地碎成一地陶片，踩到會痛）；被打到快散掉的時候整個垮下來，過兩秒重新拼起來（回一點血）
  setAi('setosho', 'shard');
  AI.shard = (e, P, d, a, sp, dt, walk, H) => {
    if (e.fall > 0) { e.fall -= dt; e.invuln = true; e.m.g.position.y = -0.4; if (e.fall <= 0) { e.invuln = false; e.m.g.position.y = 0; e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.2); say(e, '拼回來了'); radial(e, 8, 'bone', 8, 0.5, rnd()); } return false; }
    if (!e.fell && e.hp < e.hpMax * 0.35) { e.fell = 1; e.fall = 2; say(e, '散掉了'); R.fx('poof', e.x, 0.5, e.z, { color: '#E8E0D0', n: 18 }); return false; }
    e.frontK = 0.3; let mv = false; if (walk) { H.move(e, orbit(e, d, a, 3, 6), sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 9) { e.cd = 2.4 + rnd(); const [x, z] = floorAt(P.x, P.z); boom(e, x, z, 1.2, 0.8, 0.8, '#E8E0D0'); later(() => zone(x, z, 1.3, 5, e.dmg * 0.25, 'caltrop', '#E8E0D0'), 800); }
    return mv;
  };
  // 熔岩龜：縮進殼裡、像陀螺一樣在房間裡彈來彈去（撞牆反彈，留下岩漿）；出來的時候背後最好打
  setAi('magmaturtle', 'magmashell');
  AI.magmashell = (e, P, d, a, sp, dt, walk, H) => {
    if (e.spin) {
      const S = e.spin; S.t -= dt; e.dmgK = 0.2; const ox = e.x, oz = e.z, k = 9 * dt; e.x += Math.sin(S.a) * k; e.z += Math.cos(S.a) * k; e.yaw += dt * 12;
      if (R.pointBlocked(e.x, e.z)) { e.x = ox; e.z = oz; S.a = S.a + Math.PI + (rnd() - 0.5) * 1.4; S.b++; R.shake && R.shake(0.2); }
      S.tr -= dt; if (S.tr <= 0) { S.tr = 0.3; zone(e.x, e.z, 0.9, 3, e.dmg * 0.25, 'lava'); }
      if (d < 1.6 && !(P.iframe > 0)) { S.hc = (S.hc || 0) - dt; if (S.hc <= 0) { S.hc = 0.6; H.hurtT(P, e.dmg, e, { knock: 0.6 }); } }
      if (S.t <= 0 || S.b > 5) { e.spin = null; e.dmgK = null; e.st.stun = 1.4; say(e, '頭暈'); }
      return true;
    }
    e.frontK = 0.15; e.dmgK = null; let mv = false; if (walk && d > 2.2) { H.move(e, a, sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 10) { e.cd = 7; say(e, '縮殼'); R.fx('mark', e.x, 0, e.z, { r: 1.6, t: 0.6 }); later(() => { if (!e.dead) e.spin = { a: angTo(e, W().P), t: 4.5, b: 0, tr: 0 }; }, 600); }
    melee(e, P, d, H, 2.4, 1.8, 1.1);
    return mv;
  };

  // ================= 鑽地（原型：鑽口蛇） =================
  // 沙沉蟲：在你腳下挖一個流沙坑（把人往中間拉），自己在坑底張嘴等
  setAi('sandsinker', 'sinkhole');
  AI.sinkhole = (e, P, d, a, sp, dt, walk, H) => {
    if (e.pit) { const T = e.pit; T.t -= dt; e.invuln = false; e.x = T.x; e.z = T.z; e.m.g.position.y = -0.3; const dd = Math.hypot(P.x - T.x, P.z - T.z); if (dd < 4 && dd > 0.3 && !(P.iframe > 0)) pushP(P, Math.atan2(T.x - P.x, T.z - P.z), 1.8 * dt); if (dd < 1.3) { T.b = (T.b || 0) - dt; if (T.b <= 0) { T.b = 0.8; H.hurtT(P, e.dmg, e); } } if (T.t <= 0) { e.pit = null; e.cd = 2.5; } e.yaw = a; return false; }
    e.invuln = true; e.m.g.position.y = -1.4; let mv = false; if (walk) { H.move(e, a, sp * 1.3, dt); mv = true; e.rp = (e.rp || 0) - dt; if (e.rp <= 0) { e.rp = 0.3; R.fx('poof', e.x, 0.1, e.z, { color: '#D8B880', n: 3 }); } }
    if (d < 2.5 && e.cd <= 0) { const [x, z] = floorAt(P.x, P.z); R.fx('mark', x, 0, z, { r: 4, t: 0.8 }); e.cd = 99; later(() => { if (!e.dead) { e.pit = { x, z, t: 4 }; zone(x, z, 4, 4, 0, 'web', '#D8B880'); } }, 800); }
    e.yaw = a; return mv;
  };
  // 井底骸：自己不出來，從地下伸出一隻一隻的白骨手抓你的腳（一輪三隻，地上先亮圈）。
  // - 被抓到：它從你旁邊爬出來砍你 2.2 秒（這時打得到）。
  // - 三隻都躲掉（作者 2026-10-04：井底骸到底要怎麼打）：它在最後一隻手那裡爬出來喘氣 2.5 秒，不會還手，可以白打。
  // - 在地下時打不到；高度用 e.liftY（monsters6.js 每一格套上，不然會被重設回地面，看得到卻打不到）。
  setAi('kyokotsu', 'wellhand');
  AI.wellhand = (e, P, d, a, sp, dt, walk, H) => {
    if (e.out > 0) {
      e.out -= dt; e.invuln = false; e.under = false; e.liftY = null; e.m.g.position.y = 0;
      if (!e.tired) { melee(e, P, d, H, 2.2, 0.8, 1.2); e.yaw = a; }
      if (e.out <= 0) { e.cd = 1.5; e.tired = false; }
      return false;
    }
    e.invuln = true; e.under = true; e.liftY = -1.4; let mv = false; if (walk && d > 4) { H.move(e, a, sp, dt); mv = true; }
    if (e.cd <= 0 && d < 9) {
      e.cd = 3.5; const vol = e.vol = { hit: false, x: e.x, z: e.z };
      const surface = (x, z, tired) => { e.out = tired ? 2.5 : 2.2; e.tired = tired; e.x = x; e.z = z; e.invuln = false; e.under = false; e.liftY = null; if (e.m && e.m.g) e.m.g.position.set(x, 0, z); R.fx('boom', e.x, 0.3, e.z, { r: 1.2, color: '#5A4A3A' }); R.fx('ring', e.x, 0.5, e.z, { r: 1.4, color: '#7FD8FF' }); R.num && R.num(e.x, 2.6, e.z, tired ? '喘氣中——快打' : '爬出來了', ''); };
      for (let i = 0; i < 3; i++) later(() => { if (e.dead) return; const Q = W().P, [x, z] = floorAt(Q.x, Q.z); vol.x = x; vol.z = z; boom(e, x, z, 1.0, 0.5, 0.5, '#E8E0CC', t => { slowP(t, 1.3); vol.hit = true; if (!(e.out > 0)) surface(x + 1, z, false); }); }, i * 600);
      later(() => { if (e.dead || vol.hit || e.out > 0 || e.vol !== vol) return; surface(vol.x, vol.z, true); }, 2 * 600 + 650);   // 三隻都躲掉
    }
    e.yaw = a; return mv;
  };
  // 砂蠕蟲：從沙裡整條躍出、劃過你上方（一條長線），落進另一邊的沙裡；身後留下隆起的沙堆（變慢）
  setAi('dunewyrm', 'wyrm');
  AI.wyrm = (e, P, d, a, sp, dt, walk, H) => {
    if (e.br) { const B = e.br; B.t += dt; const k = Math.min(1, B.t / 0.8); e.x = B.x0 + (B.x1 - B.x0) * k; e.z = B.z0 + (B.z1 - B.z0) * k; e.m.g.position.y = Math.sin(k * Math.PI) * 3; e.invuln = false; e.yaw = B.a; if (!B.hit && dist(e, P) < 2 && e.m.g.position.y < 2.2) { B.hit = 1; H.hurtT(P, e.dmg * 1.3, e, { knock: 0.5 }); } if (k >= 1) { e.br = null; e.cd = 3; zone(e.x, e.z, 1.6, 5, 0, 'web', '#C8A870'); R.fx('boom', e.x, 0.3, e.z, { r: 2, color: '#C8A870' }); } return true; }
    e.invuln = true; e.m.g.position.y = -1.6; let mv = false; if (walk) { H.move(e, orbit(e, d, a, 5, 8), sp * 1.2, dt); mv = true; }
    if (e.cd <= 0 && d < 9) { const len = d + 6, [x1, z1] = floorAt(e.x + Math.sin(a) * len, e.z + Math.cos(a) * len); R.fx('aim', e.x, 0.3, e.z, { a, len, t: 0.9 }); e.cd = 99; const x0 = e.x, z0 = e.z; later(() => { if (!e.dead) e.br = { t: 0, x0, z0, x1, z1, a }; }, 900); }
    e.yaw = a; return mv;
  };

  // ================= 翻滾（原型：滾土球） =================
  // 焰輪：撞牆不會暈，會反彈（最多三次），一路留下火
  setAi('wanyudo', 'firewheel');
  AI.firewheel = (e, P, d, a, sp, dt, walk, H) => {
    if (e.wh) { const S = e.wh, ox = e.x, oz = e.z, k = 13 * dt; e.x += Math.sin(S.a) * k; e.z += Math.cos(S.a) * k; e.yaw = S.a; S.tr -= dt; if (S.tr <= 0) { S.tr = 0.15; zone(e.x, e.z, 0.8, 2.5, e.dmg * 0.3, 'lava'); } if (!S.hit && d < 1.3) { S.hit = 1; H.hurtT(P, e.dmg, e, { knock: 0.5 }); } if (R.pointBlocked(e.x, e.z)) { e.x = ox; e.z = oz; S.b++; S.hit = 0; const Q = W().P; S.a = S.b < 3 ? angTo(e, Q) + (rnd() - 0.5) * 0.5 : S.a + Math.PI; R.fx('boom', e.x, 0.4, e.z, { r: 1, color: '#FF7A3A' }); if (S.b >= 3) { e.wh = null; e.st.stun = 1.2; e.cd = 3; } } S.t -= dt; if (S.t <= 0) { e.wh = null; e.cd = 2.5; } return true; }
    e.yaw = a; if (e.cd <= 0 && d < 14) { R.fx('aim', e.x, 0.3, e.z, { a, len: 10, t: 0.6 }); e.cd = 99; later(() => { if (!e.dead) e.wh = { a: angTo(e, W().P), b: 0, tr: 0, t: 5 }; }, 600); }
    return false;
  };
  // 焚車貓：拉著火車繞著你兜圈子，身後一路掉燒著的木片；繞夠了才甩尾衝進來
  setAi('kasha', 'kasha');
  AI.kasha = (e, P, d, a, sp, dt, walk, H) => {
    if (lungeStep(e, P, dt, H)) return true;
    let mv = false; e.lap = (e.lap || 0) + dt;
    if (walk) { H.move(e, a + Math.PI / 2 * side(e) * (d < 5 ? 1.2 : d > 7 ? 0.6 : 1), sp * 1.1, dt); mv = true; }
    e.yaw = a + Math.PI / 2 * side(e); e.db = (e.db || 0) - dt; if (e.db <= 0) { e.db = 0.5; zone(e.x, e.z, 0.8, 3, e.dmg * 0.3, 'lava'); }
    if (e.lap > 4 && d < 9) { e.lap = 0; lunge(e, a, d + 3, 0.5, 14, 1.3, { knock: 0.6, trail: (x, z) => zone(x, z, 0.8, 2, e.dmg * 0.3, 'lava') }); }
    return mv;
  };
  // 霧牛車：放出濃霧消失在房間的另一邊，從霧裡連衝三次（每次從不同方向，先亮出路線）
  setAi('oboro', 'oxcart');
  AI.oxcart = (e, P, d, a, sp, dt, walk, H) => {
    if (lungeStep(e, P, dt, H)) return true;
    alpha(e, e.fog ? 0.35 : 1);
    if (e.fog > 0) { e.fog--; const an = rnd() * Math.PI * 2, [x, z] = floorAt(P.x + Math.sin(an) * 9, P.z + Math.cos(an) * 9); e.x = x; e.z = z; R.fx('poof', x, 1, z, { color: '#D8E0E8', n: 16 }); lunge(e, angTo(e, P), 18, 0.8, 16, 1.4, { knock: 0.7, r: 1.8 }); return true; }
    let mv = false; if (walk && d > 3) { H.move(e, a, sp * 0.5, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0) { e.cd = 8; e.fog = 3; say(e, '霧……'); R.fx('poof', e.x, 1, e.z, { color: '#D8E0E8', n: 30 }); near(e.x, e.z, 6).forEach(t => blindP(t, 1.2)); }
    melee(e, P, d, H, 2.6, 1.6, 1.2);
    return mv;
  };

  // ================= 埋伏（原型：黑泥巨口） =================
  // 鉤尾鯊：在地底下繞著你游（只看得到一道水痕），從五公尺外用尾鉤把你勾過去，再浮上來咬一口
  setAi('isonade', 'hooktail');
  AI.hooktail = (e, P, d, a, sp, dt, walk, H) => {
    if (e.up > 0) { e.up -= dt; e.invuln = false; e.m.g.position.y = 0; melee(e, P, d, H, 2, 0.7, 1.2); e.yaw = a; return false; }
    e.invuln = true; e.m.g.position.y = -0.9; let mv = false; if (walk) { H.move(e, orbit(e, d, a, 4, 6), sp * 1.3, dt); mv = true; e.rp = (e.rp || 0) - dt; if (e.rp <= 0) { e.rp = 0.25; R.fx('poof', e.x, 0.1, e.z, { color: '#4A7AAA', n: 2 }); } }
    if (e.cd <= 0 && d < 6.5) { e.cd = 4; lineHit(e, e.x, e.z, a, d + 0.8, 0.6, 0.6, 0.5, t => { if (!t.ally) { pushP(t, Math.atan2(e.x - t.x, e.z - t.z), Math.max(0, dist(e, t) - 1.2)); } e.up = 1.6; }); }
    e.yaw = a; return mv;
  };
  // 墜桶：吊在天花板上跟著你（打不到），腳下出現影子就是要掉下來了；砸完要慢慢爬回去（這時候打）
  setAi('tsurube', 'dropper');
  AI.dropper = (e, P, d, a, sp, dt, walk, H) => {
    if (e.climb > 0) { e.climb -= dt; e.invuln = false; e.m.g.position.y = Math.max(0, (1.8 - e.climb) * 2.5); e.dmgK = 1.3; return false; }
    e.dmgK = null;
    if (e.drop > 0) { e.drop -= dt; e.invuln = true; if (e.drop <= 0) { e.m.g.position.y = 0; R.fx('boom', e.x, 0.3, e.z, { r: 1.6, color: '#5A4A3A' }); R.shake && R.shake(0.4); near(e.x, e.z, 1.6).forEach(t => { if (!(t.iframe > 0)) hurtAny(t, e.dmg * 1.6, e, { knock: 0.4 }); }); e.climb = 1.8; e.cd = 2; } return false; }
    e.invuln = true; e.m.g.position.y = 4.5; let mv = false; if (walk && d > 0.6) { H.move(e, a, sp * 1.5, dt); mv = true; }
    if (e.cd <= 0 && d < 1.8) { e.drop = 0.8; R.fx('mark', e.x, 0, e.z, { r: 1.6, t: 0.8 }); say(e, '上面！'); }
    e.yaw = a; return mv;
  };

  // ================= 伸長（原型：伸頸） =================
  // 長舌穢：舌頭橫掃一大片（扇形）；舔過的地上留下髒污（站在上面會一直掉血）
  setAi('akane', 'licker');
  AI.licker = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 2.5, 4), sp, dt); mv = true; } e.yaw = a;
    e.lk = (e.lk || 0) - dt; if (e.lk <= 0 && mv) { e.lk = 1.2; zone(e.x, e.z, 1.0, 5, e.dmg * 0.2, 'caltrop', '#6A7A3A'); }
    if (e.cd <= 0 && d < 5) { e.cd = 2.6 + rnd(); cone(e, a, 2.2, 4.6, 0.55, 1, '#C86A8A', t => slowP(t, 0.8)); }
    return mv;
  };
  // 舐梁影：舌頭從天花板上一下一下舔下來，連續三次追著你的位置
  setAi('tenjo', 'ceiling');
  AI.ceiling = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk && d > 5) { H.move(e, a, sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 9) { e.cd = 4 + rnd(); for (let i = 0; i < 3; i++) later(() => { if (e.dead) return; const Q = W().P, [x, z] = floorAt(Q.x, Q.z); boom(e, x, z, 1.0, 0.55, 0.9, '#3A2A4A', t => slowP(t, 0.6)); }, i * 650); }
    return mv;
  };

  // ================= 煙（原型：纏煙） =================
  // 撲粉嫗：丟粉包（落點一團白粉，看不清楚）；被打到身上的粉會噴開一圈
  setAi('oshiroi', 'powder');
  AI.powder = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 3, 6), sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 8) { e.cd = 2.8 + rnd(); const [x, z] = floorAt(P.x, P.z); boom(e, x, z, 1.8, 0.9, 0.4, '#F4F0F0', t => blindP(t, 2)); later(() => zone(x, z, 1.8, 4, 0, 'web', '#F4F0F0'), 900); }
    melee(e, P, d, H, 1.6, 1.2, 1);
    return mv;
  };
  // 虛空蛾：灑下星空色的鱗粉（一塊一塊）；踩進去的人會被傳送到附近隨便一個地方
  setAi('voidmoth', 'starscale');
  AI.starscale = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 4, 7), sp, dt); mv = true; } e.yaw = a;
    e.ss = (e.ss || 0) - dt;
    if (e.ss <= 0 && d < 9) { e.ss = 3.2; const [x, z] = floorAt(P.x + (rnd() - 0.5) * 3, P.z + (rnd() - 0.5) * 3), w = W(), run = w.run; let t = 6; zone(x, z, 1.4, 6, 0, 'web', '#6A4AC8'); w.dyn.push(dt2 => { if (w.run !== run) return false; t -= dt2; const Q = w.P; if (Math.hypot(Q.x - x, Q.z - z) < 1.3 && !(Q.iframe > 0)) { const an = rnd() * Math.PI * 2, [nx, nz] = floorAt(Q.x + Math.sin(an) * 5, Q.z + Math.cos(an) * 5); R.fx('blink', Q.x, 1, Q.z); Q.x = nx; Q.z = nz; R.fx('blink', nx, 1, nz); R.toast && R.toast('被鱗粉傳送了', '#8A6AE8'); return false; } return t > 0; }); }
    if (e.cd <= 0 && d < 8) { e.cd = 2.4; fan(e, a, 3, 0.25, 'eorb', 7, 0.6); }
    return mv;
  };

  // ================= 固定砲台（原型：面果樹） =================
  // 深淵觸手：慢慢地橫掃半圈（扇形）；你靠太近就捲起來摔；偶爾縮回裂縫，從你附近另一道裂縫冒出來
  setAi('abyssarm', 'tentacle');
  AI.tentacle = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; if (e.gone > 0) { e.gone -= dt; e.invuln = true; e.m.g.position.y = -2; if (e.gone <= 0) { const [x, z] = floorAt(P.x + (rnd() - 0.5) * 6, P.z + (rnd() - 0.5) * 6); e.x = x; e.z = z; e.invuln = false; e.m.g.position.y = 0; R.fx('boom', x, 0.3, z, { r: 1.4, color: '#5A2A4A' }); near(x, z, 1.4).forEach(t => hurtAny(t, e.dmg, e)); } return false; }
    if (e.cd <= 0) { const r = rnd(); e.cd = 3 + rnd(); if (d < 2.4) { R.fx('mark', P.x, 0, P.z, { r: 1, t: 0.5 }); later(() => { if (!e.dead && dist(e, W().P) < 2.6) { hurtAny(W().P, e.dmg * 1.3, e, { knock: 0.5 }); pushP(W().P, angTo(e, W().P), 2.5); } }, 500); } else if (r < 0.3) { e.gone = 1.5; R.fx('poof', e.x, 0.5, e.z, { color: '#2A1A2A', n: 10 }); } else if (d < 6) cone(e, a, 3.1, 6, 0.9, 1, '#5A2A4A'); }
    return false;
  };
  // 齒輪哨兵：一邊轉一邊連射鐵釘（掃一圈）；射完會過熱冒煙，這兩秒受到的傷害加倍
  setAi('gearsentry', 'sentry');
  AI.sentry = (e, P, d, a, sp, dt, walk, H) => {
    if (e.hot > 0) { e.hot -= dt; e.dmgK = 2; if (rnd() < 0.3) R.fx('poof', e.x, 1.2, e.z, { color: '#8A8A8A', n: 1 }); if (e.hot <= 0) e.dmgK = null; return false; }
    if (e.sw) { const S = e.sw; S.t -= dt; S.a += S.dir * (Math.PI * 2 / 2.4) * dt; e.yaw = S.a; S.f -= dt; if (S.f <= 0) { S.f = 0.09; R.fire({ kind: 'bullet', owner: 'e', x: e.x, z: e.z, a: S.a, speed: 16, dmg: e.dmg * 0.45, life: 1.4, src: e }); } if (S.t <= 0) { e.sw = null; e.hot = 2; e.cd = 3; say(e, '過熱'); } return false; }
    e.yaw = a; if (e.cd <= 0 && d < 12) {
      e.mode = !e.mode;   // 兩招輪流（作者 2026-10-04：齒輪哨兵可以 360 度射擊）
      if (e.mode) { e.dir = -(e.dir || 1); e.sw = { t: 2.75, a, dir: e.dir, f: 0.35 }; R.fx('mark', e.x, 0, e.z, { r: 10, t: 0.4 }); say(e, '轉起來了'); }   // 原地轉一整圈掃射：預警 0.35 秒，之後 2.4 秒轉滿 360 度
      else { e.cd = 3.6; R.fx('ring', e.x, 0.2, e.z, { r: 1.6, color: '#FF5A3A' }); [0, 0.45, 0.9].forEach((ms, k) => later(() => { if (e.dead) return; for (let i = 0; i < 12; i++) R.fire({ kind: 'bullet', owner: 'e', x: e.x, z: e.z, a: i / 12 * Math.PI * 2 + k * Math.PI / 12, speed: 13, dmg: e.dmg * 0.55, life: 1.3, src: e }); }, 500 + ms * 1000)); }   // 全方位齊射：三輪、每輪錯開半格
    }
    return false;
  };

  // ================= 重壓（原型：懸首） =================
  // 黑潮僧：壓下來的地方湧出一圈一圈的浪（震波，會把人推開）；召來一道橫越房間的大浪
  setAi('umiso', 'tide');
  AI.tide = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk && d > 2) { H.move(e, a, sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0) { e.cd = 4.5 + rnd();
      if (rnd() < 0.5) { const [x, z] = floorAt(P.x, P.z); R.fx('mark', x, 0, z, { r: 2.6, t: 1 }); later(() => { if (e.dead) return; e.x = x; e.z = z; R.fx('boom', x, 0.3, z, { r: 2.6, color: '#2A4A7A' }); near(x, z, 2.6).forEach(t => hurtAny(t, e.dmg * 1.2, e)); wave(e, 7, 6, 0.5, '#4A7AAA', t => pushP(t, angTo(e, t), 2)); }, 1000); }
      else { const ang = a + Math.PI / 2, [sx, sz] = floorAt(P.x - Math.sin(ang) * 8, P.z - Math.cos(ang) * 8); say(e, '大浪'); for (let i = -2; i <= 2; i++) lineHit(e, sx + Math.sin(a) * i * 1.2, sz + Math.cos(a) * i * 1.2, ang, 16, 0.7, 1.1, 0.8, t => pushP(t, ang, 1.5)); } }
    return mv;
  };
  // 霜岩像：壓下來的時候四周冒出冰柱（一圈，變慢）；丟冰塊，落地結一片冰
  setAi('frostgolem', 'frostgolem');
  AI.frostgolem = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk && d > 2.4) { H.move(e, a, sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0) { e.cd = 4 + rnd();
      if (d < 4) { R.fx('mark', e.x, 0, e.z, { r: 3.5, t: 0.9 }); later(() => { if (e.dead) return; R.fx('boom', e.x, 0.3, e.z, { r: 3.5, color: '#BFE8FF' }); near(e.x, e.z, 3.5).forEach(t => { hurtAny(t, e.dmg * 1.2, e); slowP(t, 2); }); for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2, [x, z] = floorAt(e.x + Math.sin(an) * 4.2, e.z + Math.cos(an) * 4.2); zone(x, z, 0.8, 4, e.dmg * 0.2, 'caltrop', '#BFE8FF'); } }, 900); }
      else if (d < 12) { const [x, z] = floorAt(P.x, P.z); boom(e, x, z, 1.6, 1.1, 1, '#BFE8FF', t => slowP(t, 1.5)); later(() => zone(x, z, 1.8, 5, 0, 'web', '#BFE8FF'), 1100); } }
    return mv;
  };

  // ================= 尾隨（原型：尾隨犬） =================
  // 附犬靈：跟在後面；你翻滾或受傷的時候撲上來咬住不放（三秒，一直掉血），再翻滾一次就甩得掉
  setAi('inugami', 'possess');
  AI.possess = (e, P, d, a, sp, dt, walk, H) => {
    if (e.bite > 0) { e.bite -= dt; e.x = P.x - Math.sin(a) * 0.6; e.z = P.z - Math.cos(a) * 0.6; e.yaw = a; e.bt = (e.bt || 0) - dt; if (e.bt <= 0) { e.bt = 0.5; H.hurtT(P, e.dmg * 0.35, e); } slowP(P, 0.3); if ((P.iframe > 0 && e.bite < 2.6) || e.bite <= 0) { e.bite = 0; e.cd = 3; pushP(e, angTo(P, e), 2.5); say(e, '甩掉了'); } return true; }
    let mv = false; const want = d > 4 ? a : a + Math.PI / 2 * side(e); if (walk) { H.move(e, want, sp * (d > 4 ? 1 : 0.4), dt); mv = true; } e.yaw = a; alpha(e, 0.7);
    const trigger = (P.iframe > 0) || (P.hp < (e.lastHp || P.hp) - 1); e.lastHp = P.hp;
    if (trigger && e.cd <= 0 && d < 5) { e.bite = 3; R.toast && R.toast('附犬靈咬住你了：翻滾甩掉牠', '#E8E0F0'); }
    return mv;
  };
  // ================= 單腳跳（原型：獨腳傘） =================
  // 獨足鍛：一跳一跳逼近，每次落地震一下；揮鐵鎚的時候火花往前噴（扇形的小火球）
  setAi('datara', 'smith');
  AI.smith = (e, P, d, a, sp, dt, walk, H) => {
    if (leapStep(e, dt)) return true;
    e.yaw = a; e.hopT = (e.hopT || 0) - dt;
    if (e.hopT <= 0 && d > 2.2) { e.hopT = 1.1; const k = Math.min(d - 1.5, 3), [x, z] = floorAt(e.x + Math.sin(a) * k, e.z + Math.cos(a) * k); leapTo(e, x, z, 0.4, () => { R.fx('ring', e.x, 0.1, e.z, { r: 1.8, color: '#C88A4A' }); near(e.x, e.z, 1.8).forEach(t => { if (!(t.iframe > 0) && !(t.air > 0)) { hurtAny(t, e.dmg * 0.6, e); t.stumble = Math.max(t.stumble || 0, 0.3); } }); }); return true; }
    if (e.cd <= 0 && d < 5) { e.cd = 2.6; cone(e, a, 1.2, 3, 0.45, 1.2, '#FF9A3A'); later(() => { if (!e.dead) fan(e, a, 6, 0.16, 'fire', 9, 0.4, 1); }, 450); }
    return false;
  };
  // ================= 鑽來鑽去（原型：根童） =================
  // 礫甲蟎：一窩衝過來黏在你身上（每黏一隻慢一點、一直被啃），翻滾就全部甩掉
  setAi('pebblemite', 'mite');
  AI.mite = (e, P, d, a, sp, dt, walk, H) => {
    if (e.cling > 0) { e.cling -= dt; e.ca = (e.ca == null ? rnd() * 6 : e.ca) + dt * 3; e.x = P.x + Math.sin(e.ca) * 0.5; e.z = P.z + Math.cos(e.ca) * 0.5; const n = W().enemies.filter(o => o.cling > 0 && !o.dead).length; slowP(P, 0.2); P.slowT = Math.max(P.slowT || 0, 0.2); e.nb = (e.nb || 0) - dt; if (e.nb <= 0) { e.nb = 1; H.hurtT(P, e.dmg * 0.4, e); } if (P.iframe > 0 || e.cling <= 0) { e.cling = 0; e.cd = 2.5; pushP(e, angTo(P, e), 2.5); } if (n >= 3 && rnd() < 0.01) say(e, '好重'); return true; }
    let mv = false; if (walk) { H.move(e, a + Math.sin(e.t * 9) * 0.5, sp * 1.1, dt); mv = true; } e.yaw = a;
    if (d < 1.1 && e.cd <= 0) { e.cling = 4; }
    return mv;
  };
  // ================= 電（原型：紫電鼬） =================
  // 雷晶蛛：在房間裡拉電網（兩點之間一條電線，五秒）；吐出會分岔的電球
  setAi('thunderspider', 'thunderweb');
  AI.thunderweb = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 4, 7), sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 10) { e.cd = 4 + rnd();
      if (rnd() < 0.6) { const an = rnd() * Math.PI, [x0, z0] = floorAt(P.x - Math.sin(an) * 4, P.z - Math.cos(an) * 4), w = W(), run = w.run; let t = 5, tick = 0; R.fx('aim', x0, 0.3, z0, { a: an, len: 8, t: 0.7 }); later(() => { w.dyn.push(dt2 => { if (w.run !== run || e.dead) return false; t -= dt2; tick -= dt2; if (tick <= 0) { tick = 0.5; R.fx('slash', x0, 0.6, z0, { a: an, len: 8 }); targets().forEach(tg => { const dx = tg.x - x0, dz = tg.z - z0, al = dx * Math.sin(an) + dz * Math.cos(an), pe = Math.abs(dx * Math.cos(an) - dz * Math.sin(an)); if (al > 0 && al < 8 && pe < 0.5 && !(tg.iframe > 0)) { hurtAny(tg, e.dmg * 0.5, e); slowP(tg, 0.6); } }); } return t > 0; }); }, 700); }
      else { fan(e, a, 3, 0.4, 'eorb', 8, 0.7); later(() => { if (!e.dead) fan(e, a, 5, 0.3, 'eorb', 8, 0.5); }, 350); } }
    return mv;
  };
  // ================= 換位置（原型：翻枕影） =================
  // 鏡魂：變出兩個鏡像（打到假的會碎開噴一圈碎片），三個一起繞著你轉
  setAi('mirrorwraith', 'mirrorclone');
  AI.mirrorclone = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 3, 5), sp, dt); mv = true; } e.yaw = a;
    if (!e.fake && e.cd <= 0 && d < 9) { e.cd = 7; say(e, '分身'); for (let i = 0; i < 2; i++) { const an = rnd() * Math.PI * 2, [x, z] = floorAt(e.x + Math.sin(an) * 2, e.z + Math.cos(an) * 2), c = R.spawnEnemy(e.id, x, z, e.room, { aggro: true, hpMul: 0.05 }); if (c) { c.fake = 1; c.xpZero = 1; c.dmg *= 0.3; R.fx('blink', x, 1, z); } } }
    if (e.fake) { e.life = (e.life == null ? 8 : e.life) - dt; if (e.life <= 0) { e.dead = true; e.hp = 0; R.killEnemy ? R.killEnemy(e, null) : null; } }
    melee(e, P, d, H, 1.6, 1.3, 1);
    return mv;
  };
  // ================= 震波（原型：鼓腹狸） =================
  // 熔岩龜（踏焰龜）：跺腳的時候三道地裂往外竄（直線），裂開的地方冒岩漿
  setAi('lavaturtle', 'stompheat');
  if (R.ENEMIES.lavaturtle) R.ENEMIES.lavaturtle.name = '踏焰龜';   // 和熔岩龜（magmaturtle）同名，改一個
  AI.stompheat = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk && d > 3) { H.move(e, a, sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 10) { e.cd = 3.8 + rnd(); R.fx('mark', e.x, 0, e.z, { r: 1.6, t: 0.6 }); say(e, '跺腳'); later(() => { if (e.dead) return; R.shake && R.shake(0.3); [-0.5, 0, 0.5].forEach(o => { for (let i = 1; i <= 6; i++) { const [x, z] = floorAt(e.x + Math.sin(a + o) * i * 1.4, e.z + Math.cos(a + o) * i * 1.4); later(() => { R.fx('boom', x, 0.2, z, { r: 0.9, color: '#FF7A3A' }); near(x, z, 0.9).forEach(t => { if (!(t.iframe > 0)) hurtAny(t, e.dmg * 0.6, e); }); if (i % 2) zone(x, z, 0.8, 3, e.dmg * 0.25, 'lava'); }, i * 90); } }); }, 600); }
    return mv;
  };
  // ================= 拉人（原型：巨蟾） =================
  // 濕鱗女：用尾巴在你周圍圈一個圈，圈慢慢收緊（待在圈上會被勒住）；濕頭髮甩過來（直線）
  setAi('nureo', 'coil');
  AI.coil = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 3, 5), sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 8) { e.cd = 5 + rnd();
      if (rnd() < 0.55) { const x = P.x, z = P.z, w = W(), run = w.run; let r = 4.5; say(e, '纏住'); w.dyn.push(dt2 => { if (w.run !== run || e.dead) return false; r -= dt2 * 1.2; R.fx('ring', x, 0.1, z, { r: Math.max(0.5, r), color: '#4A7A6A' }); const Q = w.P, dd = Math.hypot(Q.x - x, Q.z - z); if (Math.abs(dd - r) < 0.5 && !(Q.iframe > 0)) { e.sq = (e.sq || 0) - dt2; if (e.sq <= 0) { e.sq = 0.6; hurtAny(Q, e.dmg * 0.6, e); slowP(Q, 0.8); } } return r > 0.6; }); }
      else lineHit(e, e.x, e.z, a, 6, 0.7, 0.5, 1.1, t => pushP(t, a + Math.PI, 1.5)); }
    return mv;
  };
  // ================= 叫人（原型：喚群燈） =================
  // 淘豆聲：被看到就逃，邊跑邊撒豆子（地上一片，踩到會痛、變慢）；四秒內沒打掉就大叫，叫醒附近的遺跡生物
  setAi('azuki', 'bean');
  AI.bean = (e, P, d, a, sp, dt, walk, H) => {
    e.seen = (e.seen || 0) + dt; let mv = false; if (walk) { H.move(e, a + Math.PI + Math.sin(e.t * 4) * 0.4, sp * 1.3, dt); mv = true; } e.yaw = a + Math.PI;
    e.bn = (e.bn || 0) - dt; if (e.bn <= 0) { e.bn = 0.7; zone(e.x, e.z, 1.1, 6, e.dmg * 0.0 + 2, 'caltrop', '#8A4A2A'); }
    if (e.seen > 4 && !e.yelled) { e.yelled = 1; say(e, '有人來了！'); R.fx('ring', e.x, 0.2, e.z, { r: 12, color: '#FF5A5A' }); W().enemies.forEach(o => { if (!o.dead && dist(o, e) < 12) { o.dormant = false; o.aggro = true; } }); if (R.addAware) R.addAware(15); }
    return mv;
  };
  // ================= 落雷（原型：夜鳴獸） =================
  // 晶核獸：在附近長出三根晶柱，晶柱之間互相放電（連成三角形）；血少的時候體內的核心過載爆開一圈
  setAi('corebeast', 'crystalcore');
  AI.crystalcore = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk && d > 2.6) { H.move(e, a, sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 10) { e.cd = 6; const pts = [0, 1, 2].map(i => floorAt(P.x + Math.sin(i * 2.09 + rnd()) * 3.2, P.z + Math.cos(i * 2.09 + rnd()) * 3.2)); pts.forEach(([x, z]) => { R.fx('pillar', x, 0, z, { r: 0.5, color: '#FF8AC8' }); zone(x, z, 0.7, 4, e.dmg * 0.2, 'caltrop', '#FF8AC8'); }); say(e, '晶柱');
      for (let k = 0; k < 3; k++) later(() => { if (e.dead) return; pts.forEach((p, i) => { const q = pts[(i + 1) % 3], an = Math.atan2(q[0] - p[0], q[1] - p[1]), len = Math.hypot(q[0] - p[0], q[1] - p[1]); lineHit(e, p[0], p[1], an, len, 0.45, 0.25, 0.5); }); }, 600 + k * 1100); }
    if (!e.ovl && e.hp < e.hpMax * 0.35) { e.ovl = 1; R.fx('mark', e.x, 0, e.z, { r: 5, t: 1.2 }); say(e, '核心過載'); later(() => { if (!e.dead) { radial(e, 18, 'eorb', 9, 0.7, 0); R.fx('boom', e.x, 0.4, e.z, { r: 5, color: '#FF8AC8' }); near(e.x, e.z, 5).forEach(t => hurtAny(t, e.dmg * 1.2, e)); } }, 1200); }
    melee(e, P, d, H, 2.6, 1.5, 1);
    return mv;
  };
  // ================= 多頭（原型：八首蟒） =================
  // 荊棘女王：用荊棘在你周圍圍出一個籠子（一圈，碰到會痛、變慢）；藤鞭把人拉過去；身邊的玫瑰幫她回血
  setAi('thornqueen', 'thorn');
  AI.thorn = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk && d > 3) { H.move(e, a, sp, dt); mv = true; } e.yaw = a;
    e.rose = (e.rose || 4) - dt; if (e.rose <= 0) { e.rose = 4; if (e.hp < e.hpMax) { e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.03); R.fx('poof', e.x, 1, e.z, { color: '#FF6A8A', n: 6 }); } }
    if (e.cd <= 0 && d < 10) { e.cd = 5 + rnd();
      if (rnd() < 0.5) { const x = P.x, z = P.z; say(e, '荊棘籠'); R.fx('mark', x, 0, z, { r: 3.6, t: 0.8 }); later(() => { for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; zone(x + Math.sin(an) * 3.4, z + Math.cos(an) * 3.4, 0.8, 5, e.dmg * 0.3, 'caltrop', '#3A6A2A'); } }, 800); }
      else lineHit(e, e.x, e.z, a, 8, 0.6, 0.55, 0.8, t => pushP(t, Math.atan2(e.x - t.x, e.z - t.z), Math.max(0, dist(e, t) - 2))); }
    melee(e, P, d, H, 2.4, 1.4, 1);
    return mv;
  };
  // ================= 追著咬（原型：遺跡鼠、苔團……都已經換過） =================
  // 礦殼：被重擊就縮成一顆礦球（受到的傷害很少），一會兒之後朝你滾過來
  setAi('kousaku', 'oreshell');
  AI.oreshell = (e, P, d, a, sp, dt, walk, H) => {
    if (lungeStep(e, P, dt, H)) return true;
    if (e.ball > 0) { e.ball -= dt; e.dmgK = 0.25; e.yaw += dt * 6; if (e.ball <= 0) { e.dmgK = null; lunge(e, a, d + 2, 0.4, 11, 1.2, { knock: 0.5 }); } return false; }
    e.dmgK = null; let mv = false; if (walk && d > 1.5) { H.move(e, a, sp, dt); mv = true; } e.yaw = a;
    melee(e, P, d, H, 1.6, 1.1, 1);
    return mv;
  };
  // 填隙肉芽：一群一群的；兩團碰在一起就合成一團更大的（生命加起來）；咬到人會長大一點
  setAi('gaki', 'flesh');
  AI.flesh = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk && d > 1) { H.move(e, a + Math.sin(e.t * 5) * 0.3, sp, dt); mv = true; } e.yaw = a;
    if (d < 1.2 && e.cd <= 0) { e.cd = 0.9; H.hurtT(P, e.dmg, e); e.hp = Math.min(e.hpMax * 1.5, e.hp + e.dmg); e.hpMax = Math.max(e.hpMax, e.hp); }
    e.mg = (e.mg || 0) - dt;
    if (e.mg <= 0) { e.mg = 0.5; const o = W().enemies.find(x => x !== e && !x.dead && x.def.ai === 'flesh' && dist(x, e) < 0.9 && !x.merged); if (o && (e.grown || 1) < 4) { o.merged = 1; o.dead = true; o.hp = 0; if (o.m && o.m.g) o.m.g.visible = false; e.hpMax += o.hpMax; e.hp += o.hp; e.dmg *= 1.25; e.grown = (e.grown || 1) + 1; const s = 1 + 0.25 * (e.grown - 1); if (e.m && e.m.g) e.m.g.scale.setScalar(s * (e.m.base || 1)); say(e, '合體'); R.fx('poof', e.x, 0.5, e.z, { color: '#C86A6A', n: 10 }); } }
    return mv;
  };
  // ================= 邊退邊射（原型：游焰） =================
  // 砂幕者：在你和牠之間撒一道砂幕（一排，穿過去會看不清楚），躲在後面丟石子
  setAi('sunakake', 'sandveil');
  AI.sandveil = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 6, 9), sp, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 12) { e.cd = 5; say(e, '砂幕'); const pa = a + Math.PI / 2, mx = (e.x + P.x) / 2, mz = (e.z + P.z) / 2; for (let i = -3; i <= 3; i++) { const [x, z] = floorAt(mx + Math.sin(pa) * i * 1.2, mz + Math.cos(pa) * i * 1.2); zone(x, z, 0.9, 5, 0, 'web', '#D8B880'); } const w = W(), run = w.run; let t = 5; w.dyn.push(dt2 => { if (w.run !== run) return false; t -= dt2; const Q = w.P; if (Math.abs((Q.x - mx) * Math.sin(a) + (Q.z - mz) * Math.cos(a)) < 0.8 && Math.abs((Q.x - mx) * Math.cos(a) - (Q.z - mz) * Math.sin(a)) < 4.2) blindP(Q, 1.2); return t > 0; }); }
    e.pb = (e.pb || 0) - dt; if (e.pb <= 0 && d < 12) { e.pb = 1.2; fan(e, a, 2, 0.15, 'sand', 11, 0.5, 1.6); }
    return mv;
  };
  // 霜衣：吐出一口寒氣（扇形，越吐越長，連三口）；在霧裡消失、從你旁邊出來
  setAi('yukionna', 'frostbreath');
  AI.frostbreath = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk) { H.move(e, orbit(e, d, a, 3, 5), sp * 0.8, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 7) { e.cd = 4.5 + rnd(); [0, 500, 1000].forEach((ms, i) => later(() => { if (!e.dead) { const Q = W().P; cone(e, angTo(e, Q), 0.8, 3 + i * 1.5, 0.35, 0.6, '#BFE8FF', t => slowP(t, 1.5)); } }, ms)); }
    e.fg = (e.fg || 5) - dt; if (e.fg <= 0 && d < 9) { e.fg = 6 + rnd() * 2; R.fx('poof', e.x, 1, e.z, { color: '#F0F8FF', n: 18 }); const an = angTo(P, e) + (rnd() < 0.5 ? 1.4 : -1.4), [x, z] = floorAt(P.x + Math.sin(an) * 2.5, P.z + Math.cos(an) * 2.5); e.x = x; e.z = z; R.fx('poof', x, 1, z, { color: '#F0F8FF', n: 12 }); e.cd = Math.min(e.cd, 0.4); }
    return mv;
  };
  // 三羽鴉：在你周圍六公尺繞成一圈飛，每轉一段就往圈裡射羽毛；被打到會散成一團羽毛，從你背後出來
  setAi('karasu', 'crowring');
  AI.crowring = (e, P, d, a, sp, dt, walk, H) => {
    let mv = false; if (walk) { H.move(e, d > 6.8 ? a : d < 5.2 ? a + Math.PI : a + Math.PI / 2 * side(e), sp * 1.1, dt); mv = true; } e.yaw = a;
    if (e.cd <= 0 && d < 9) { e.cd = 1.6 + rnd() * 0.6; fan(e, a, 3, 0.18, 'feather', 12, 0.7); }
    if (e.scat) { e.scat = 0; const back = (P.yaw != null ? P.yaw : a) + Math.PI, [x, z] = floorAt(P.x + Math.sin(back) * 3, P.z + Math.cos(back) * 3); R.fx('poof', e.x, 1, e.z, { color: '#2A2A34', n: 14 }); e.x = x; e.z = z; R.fx('poof', x, 1, z, { color: '#2A2A34', n: 8 }); }
    return mv;
  };

  // ---------- 受到傷害：正面硬殼、全身減傷、各自的反應 ----------
  const ed0 = R.enemyDefend;
  R.enemyDefend = (e, dmg, o, crit) => {
    dmg = ed0 ? ed0(e, dmg, o, crit) : dmg; if (!e || !e.def) return dmg;
    const P = W().P, ai = e.def.ai; o = o || {};
    if (e.frontK != null && P && o.fromBehind !== false && Math.abs(wrap(angTo(e, P) - e.yaw)) < 1.1) { if (rnd() < 0.4) say(e, '格擋'); R.fx('block', e.x + Math.sin(e.yaw) * 0.5, 1, e.z + Math.cos(e.yaw) * 0.5); dmg *= e.frontK; }
    if (e.dmgK != null) dmg *= e.dmgK;
    if (e.guardOf && !e.guardOf.dead) dmg *= 0.75;
    if (ai === 'mantis' && e.stance && !e.recover && P && dist(e, P) < 6) { dmg *= 0.3; say(e, '格開'); e.riposte = 1; e.cd = 0; }
    if (ai === 'oreshell' && !(e.ball > 0) && (crit || dmg > e.hpMax * 0.12)) { e.ball = 1.4; say(e, '縮成礦球'); }
    if (ai === 'twins' && e.twin && !e.twin.dead && P && !e.twin.lp && rnd() < 0.5) { const tw = e.twin, back = (P.yaw != null ? P.yaw : 0) + Math.PI, [x, z] = floorAt(P.x + Math.sin(back) * 2, P.z + Math.cos(back) * 2); R.fx('blink', tw.x, 1, tw.z); tw.x = x; tw.z = z; R.fx('blink', x, 1, z); tw.cd = Math.min(tw.cd, 0.3); }
    if (ai === 'crowring' && rnd() < 0.35) e.scat = 1;
    if (ai === 'healer' && W().run) {   // 有人要打引魂燈：旁邊的護衛擋下六成
      e.threat = W().run.t + 3;
      const Pl = W().P, between = x => { if (!Pl) return false; const L = dist(Pl, e), a0 = angTo(Pl, e), dx = x.x - Pl.x, dz = x.z - Pl.z, al = dx * Math.sin(a0) + dz * Math.cos(a0), pe = Math.abs(dx * Math.cos(a0) - dz * Math.sin(a0)); return al > 0 && al < L && pe < 1.3; };
      const g = W().enemies.filter(x => x.guardOf === e && !x.dead && (dist(x, e) < 2.6 || between(x))).sort((p, q) => dist(p, e) - dist(q, e))[0];
      if (g && dmg > 0) { R.hurtEnemy(g, dmg * 0.6, {}); say(g, '擋下'); R.fx('block', g.x, 1 + (g.def.size || 1) * 0.4, g.z); dmg *= 0.4; }
    }
    if (ai === 'mirrorclone' && e.fake) { R.fx('poof', e.x, 1, e.z, { color: '#E8F0FF', n: 14 }); radial(e, 8, 'eorb', 7, 0.4, 0); }
    return dmg;
  };
  // 鏡像不給經驗
  const ke0 = R.killEnemy;
  if (ke0) R.killEnemy = (e, by) => { if (e && e.fake) { e.def = Object.assign({}, e.def, { xp: 0 }); } return ke0(e, by); };

  // ---------- 保護引魂燈（作者：補血的小燈籠，大型怪或其他怪會優先保護） ----------
  const hl0 = AI.healer;
  if (hl0) AI.healer = (e, P, d, a, sp, dt, walk, H) => { const c0 = e.cd, r = hl0(e, P, d, a, sp, dt, walk, H); if (e.cd > c0 + 1) e.healT = 3; if (e.healT > 0) e.healT -= dt; return r; };
  const protect = dt => {
    const w = W(), P = w.P; if (!w.run || !P || !w.enemies) return;
    const healers = w.enemies.filter(e => !e.dead && e.def.ai === 'healer' && e.aggro);
    w.enemies.forEach(e => { if (e.guardOf && (e.guardOf.dead || !healers.includes(e.guardOf) || e.dead)) { e.guardOf = null; } });
    healers.forEach(h => {
      const want = h.healT > 0 ? 3 : 2;
      let gs = w.enemies.filter(o => o.guardOf === h && !o.dead);
      if (gs.length < want) {
        w.enemies.filter(o => !o.dead && !o.guardOf && o !== h && !o.def.boss && !o.def.human && o.def.ai !== 'healer' && !o.fake && !o.dormant && o.aggro && (o.def.speed || 0) > 0 && !o.invuln && dist(o, h) < 12)
          .sort((p, q) => (q.def.size || 1) * q.hpMax - (p.def.size || 1) * p.hpMax).slice(0, want - gs.length)
          .forEach(o => { o.guardOf = h; say(o, '護衛'); R.fx('block', o.x, 1 + (o.def.size || 1) * 0.4, o.z); });
        gs = w.enemies.filter(o => o.guardOf === h && !o.dead);
      }
      const ah = angTo(h, P), dh = dist(h, P), pa = angTo(P, h);
      // 你要去打引魂燈（靠近、瞄著牠、或已經打到牠）：護衛衝到你和引魂燈中間擋住
      const aim = P.aimA != null ? P.aimA : P.yaw, threat = (h.threat > w.run.t) || (dh < 8 && aim != null && Math.abs(wrap(aim - pa)) < 0.5) || dh < 5;
      if (threat && !h.warned) { h.warned = 1; if (gs[0]) say(gs[0], '保護引魂燈！'); }
      gs.forEach((o, i) => {
        if (o.st.stun > 0 || o.st.root > 0 || o.ln || o.lp) return;
        const off = (i - (gs.length - 1) / 2) * 0.9;
        let gx, gz, spd;
        if (threat) { const k = Math.min(1.4, Math.max(0.8, dh - 1)); gx = P.x + Math.sin(pa + off * 0.6) * k; gz = P.z + Math.cos(pa + off * 0.6) * k; spd = 2.4; if (dist(o, P) < 1.5 && Math.abs(wrap(angTo(P, o) - pa)) < 0.9) return; }   // 已經擋在你前面：照原本的打法打你
        else { if (dist(o, P) < 2.2) return; gx = h.x + Math.sin(ah + off) * 1.9; gz = h.z + Math.cos(ah + off) * 1.9; spd = 1.7; }
        const dg = Math.hypot(gx - o.x, gz - o.z);
        if (dg > 0.3) { const k = Math.min(dg, (o.speed || 3) * spd * dt); o.x += (gx - o.x) / dg * k; o.z += (gz - o.z) / dg * k; o.yaw = angTo(o, P); R.collide && R.collide(o, (o.def.size || 1) * 0.5); }
      });
    });
  };
  let pt = 0;
  const st0 = R.step;
  R.step = dt => { st0(dt); pt -= dt; if (pt <= 0) { pt = 0; try { protect(dt); } catch (err) { console.warn('[monsters7]', err); } } };
})(window.R);
