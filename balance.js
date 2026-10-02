// 討伐令 1433：遺跡生物全部加強、後期壓住玩家的強度；領主體多幾種攻擊（作者：玩家到後面都太強了）
// - 所有遺跡生物：照分級和深度（作者：前期太難、難度要和深度掛鉤）。淺層、低分級比較溫和，越往下越強：
//   生命 = 分級的底（哈米莉亞・阿彌勒 0.8、摩爾斯 1.0、克森特 1.25、卡索 1.45）× (1 + 0.2 × 深度)；傷害的底 0.6／0.62／0.9／1.1／1.25 × (1 + 0.15 × 深度)（2026-10-02 作者：越深越強，從 0.12、0.1 加大）；
//   2026-10-03 遺跡加深（deeper.js）：第 4 層以後每層改成生命 +10%、傷害 +7%。
//   深度從第 1 層算起（有第 0 層的遺跡，第 0 層是休息區）。克森特級以上跑快一點。
// - 跟著玩家變強：職業等級超過這個分級該有的等級（哈米莉亞 4、阿彌勒 10、摩爾斯 17、克森特 25），每多一級生命 +6%、傷害 +4%（最多 +150%／+100%）；
//   身上的裝備等級比這一層的寶箱高，每多一級再 +3%（最多 +45%）。
// - 領主體：巢織蛛多了卵雨、蛛網陣、狂亂；地出巨骸多了骨雨、地底的手、咆哮的震波；千節蟲會鑽地、蜷身衝撞、吐酸、放腳刺；
//   佩特拉核心多了翼肢的掃擊。血越少，招式越密。
// 這個檔案要在 monsters2.js 前面載入（鐵齒鼠成群生出來的那幾隻才會一起加強）。
(function (R) {
  const W = () => R.W, rnd = Math.random, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const EXP = { 1: 4, 2: 10, 3: 17, 4: 25, 5: 32 };
  const BASE_H = { 1: 0.8, 2: 0.8, 3: 1.0, 4: 1.25, 5: 1.45 }, BASE_D = { 1: 0.6, 2: 0.62, 3: 0.9, 4: 1.1, 5: 1.25 };

  // ---------- 全部加強 ----------
  const gearLv = () => { const S = R.S; if (!S || !R.equipped) return 0; const eq = R.equipped(S.cls), its = R.GEAR_KEYS.map(k => eq[k]).filter(Boolean); return its.length ? its.reduce((a, it) => a + it.ilvl, 0) / its.length : 0; };
  const se = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se(id, x, z, room, o), run = W().run; if (!e || !run) return e;
    const g = run.grade.lv || 1, f = run.floor || 0, S = R.S, lv = S && S.classes[S.cls] ? S.classes[S.cls].lv : 1;
    const over = Math.max(0, lv - (EXP[g] || 10)), gearOver = Math.max(0, gearLv() - (g * 2 + f));
    const dep = Math.max(0, f - (run.grade.floor0 ? 1 : 0)), d4 = Math.min(dep, 4), dx = Math.max(0, dep - 4);   // 第 4 層以後放緩（deeper.js 把遺跡加深了）
    const hpK = (BASE_H[g] || 1.45) * (1 + 0.2 * d4 + 0.1 * dx) * (1 + Math.min(1.5, over * 0.06)) * (1 + Math.min(0.45, gearOver * 0.03));
    const dmgK = (BASE_D[g] || 1.25) * (1 + 0.15 * d4 + 0.07 * dx) * (1 + Math.min(1, over * 0.04)) * (1 + Math.min(0.45, gearOver * 0.03));
    e.hp *= hpK; e.hpMax *= hpK; e.dmg *= dmgK; if (g >= 4) e.speed *= 1.06;
    return e;
  };

  // ---------- 招式的小工具 ----------
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const targets = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed)).filter(t => t && !t.dead); };
  const hit = (t, dmg, e, o) => (t.ally ? R.hurtAlly(t, dmg, e) : R.hurtPlayer(dmg, e, o));
  const floor = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  // 地上先出現圈，t 秒後炸開
  const booms = (e, pts, r, t, k, col) => { pts.forEach(([x, z]) => R.fx('mark', x, 0, z, { r, t })); later(() => { if (e.dead) return; pts.forEach(([x, z]) => { R.fx('boom', x, 0.3, z, { r, color: col }); targets().forEach(tg => { if (Math.hypot(tg.x - x, tg.z - z) < r) hit(tg, e.dmg * k, e, { knock: 0.3 }); }); }); R.shake(0.25); }, t * 1000); };
  // 從身上往目標一路炸過去
  const march = (e, a, n, step, gap, r, k, col) => { for (let i = 1; i <= n; i++) { const [x, z] = floor(e.x + Math.sin(a) * step * i, e.z + Math.cos(a) * step * i); later(() => { if (e.dead) return; R.fx('mark', x, 0, z, { r, t: 0.35 }); later(() => { if (e.dead) return; R.fx('boom', x, 0.3, z, { r, color: col }); targets().forEach(tg => { if (Math.hypot(tg.x - x, tg.z - z) < r) hit(tg, e.dmg * k, e); }); }, 350); }, i * gap * 1000); } };
  // 往外擴的震波：翻滾、跳起來的時候躲得掉
  const wave = (e, maxR, speed, k, col) => {
    const w = W(), run = w.run, done = new Set(); let r = 0.8; R.fx('ring', e.x, 0.1, e.z, { r: maxR, color: col }); R.shake(0.3);
    const x0 = e.x, z0 = e.z;
    w.dyn.push(dt => { if (w.run !== run) return false; r += dt * speed; targets().forEach(t => { if (done.has(t)) return; const dd = Math.hypot(t.x - x0, t.z - z0); if (Math.abs(dd - r) < 0.55 && !(t.iframe > 0) && !(t.air > 0)) { done.add(t); hit(t, e.dmg * k, e, { knock: 0.5 }); } }); return r < maxR; });
  };
  const radial = (e, n, kind, speed, k, off) => { for (let i = 0; i < n; i++) R.fire({ kind, owner: 'e', x: e.x, z: e.z, a: i / n * Math.PI * 2 + (off || 0), speed, dmg: e.dmg * k, life: 2.6, src: e }); };
  const around = (P, n, rr) => Array.from({ length: n }, (_, i) => { const a = rnd() * Math.PI * 2, d = i === 0 ? 0 : 1.5 + rnd() * rr; return floor(P.x + Math.sin(a) * d, P.z + Math.cos(a) * d); });
  const hurt = e => 1 - e.hp / e.hpMax;
  const nextPat = (e, base) => { e.xpat = base - hurt(e) * base * 0.45 + rnd() * 1.2; };

  // ---------- 巢織蛛（R.aiLord） ----------
  const lord0 = R.aiLord;
  R.aiLord = (e, d, a, sp, dt, walk) => {
    lord0(e, d, a, sp, dt, walk);
    const P = e.tgt || W().P; if (e.xpat == null) nextPat(e, 7);
    e.xpat -= dt; if (e.xpat > 0 || e.leap) return; nextPat(e, 7);
    const r = rnd();
    if (r < 0.38) { booms(e, around(P, 5, 3.5), 1.6, 1.05, 1.1, '#E8E0CC'); R.toast('天花板上掉下了卵囊'); }
    else if (r < 0.7) { around(P, 4, 4).forEach(([x, z]) => R.webZone(x, z)); for (let i = -2; i <= 2; i++) R.fire({ kind: 'web', owner: 'e', x: e.x, z: e.z, a: a + i * 0.22, speed: 11, dmg: e.dmg * 0.55, life: 1.8, src: e }); }
    else if (hurt(e) > 0.5) { radial(e, 16, 'web', 8, 0.5, e.t); R.fx('ring', e.x, 0.1, e.z, { r: 3, color: '#E8E8E8' }); R.toast('巢織蛛發狂了'); }
    else booms(e, around(P, 3, 2), 2, 0.9, 1.2, '#5A4A3E');
  };

  // ---------- 地出巨骸（R.aiGiant） ----------
  const giant0 = R.aiGiant;
  R.aiGiant = (e, d, a, sp, dt, walk) => {
    giant0(e, d, a, sp, dt, walk);
    const P = e.tgt || W().P; if (e.xpat == null) nextPat(e, 8);
    e.xpat -= dt; if (e.xpat > 0 || e.act) return; nextPat(e, 8);
    const r = rnd(), rm = R.roomOf ? R.roomOf(e) : null;
    if (r < 0.36 && rm) { const pts = Array.from({ length: 8 }, () => R.roomPoint(rm)); pts.push([P.x, P.z]); booms(e, pts, 1.8, 1.25, 1.3, '#E8E0CC'); R.toast('頭頂上落下了白骨'); }
    else if (r < 0.7) { march(e, a, 9, 1.6, 0.16, 1.3, 1.2, '#C8C0AC'); }
    else wave(e, 10, 7, 1.1, '#C8C0AC');
  };

  // ---------- 千節蟲（combat.js 原本只會追著咬：整個換成 AI_X.centipede） ----------
  const AI = R.AI_X = R.AI_X || {};
  AI.centipede = (e, P, d, a, sp, dt, walk, H) => {
    // 鑽地：看不見、打不到（combat.js 看 e.invuln），從你腳下鑽出來
    if (e.dig) {
      e.dig.t -= dt; if (e.dig.t <= 0 && !e.dig.up) { e.dig.up = 1; const [x, z] = [e.dig.x, e.dig.z]; e.x = x; e.z = z; e.m.g.position.set(x, 0, z); e.m.g.visible = true; e.invuln = false; R.fx('boom', x, 0.3, z, { r: 2.2, color: '#7A6A4A' }); R.shake(0.4); targets().forEach(t => { if (Math.hypot(t.x - x, t.z - z) < 2.2) H.hurtT(t, e.dmg * 1.5, e, { knock: 0.5 }); }); e.dig = null; e.cd = 1.2; }
      return false;
    }
    // 蜷身衝撞：先拉一條線，再一口氣衝過去
    if (e.coil) {
      e.yaw = e.coil.a; e.coil.t -= dt;
      if (e.coil.t <= 0) { e.coil.run = (e.coil.run || 0) + dt; H.move(e, e.coil.a, 13, dt); if (!e.coil.hit && d < 1.6) { e.coil.hit = 1; H.hurtT(P, e.dmg * 1.4, e, { knock: 0.7 }); } if (e.coil.run > 0.75) { e.coil = null; e.cd = 1; } return true; }
      return false;
    }
    let mv = false;
    if (walk) { H.move(e, a + Math.sin(e.t) * 0.6, sp * (1 + hurt(e)), dt); mv = true; }
    if (d < 1.6 && e.cd <= 0) { e.cd = 1; H.hurtT(P, e.dmg, e); }
    e.yaw = a;
    // 血少了：走過的地方留下酸
    if (hurt(e) > 0.5) { e.acidT = (e.acidT || 0) - dt; if (e.acidT <= 0) { e.acidT = 0.45; const zn = R.addZone({ kind: 'lava', x: e.x, z: e.z, r: 1, life: 3, dmg: e.dmg * 0.35 }); if (zn && zn.mesh) zn.mesh.material.color.set('#8AE04A'); } }
    if (e.xpat == null) nextPat(e, 5.5);
    e.xpat -= dt;
    if (e.xpat <= 0) {
      nextPat(e, 5.5); const r = rnd();
      if (r < 0.34) { e.dig = { t: 1.3, x: P.x, z: P.z }; e.invuln = true; e.m.g.visible = false; R.fx('poof', e.x, 0.5, e.z, { color: '#7A6A4A', n: 12 }); R.fx('mark', P.x, 0, P.z, { r: 2.2, t: 1.3 }); }
      else if (r < 0.68) { e.coil = { a, t: 0.75 }; R.fx('aim', e.x, 0.3, e.z, { a, len: 10, t: 0.75 }); }
      else radial(e, 12, 'ering', 7.5, 0.7, e.t);
    }
    return mv;
  };

  // ---------- 佩特拉核心：翼肢掃擊 ----------
  const core0 = R.aiCore;
  if (core0) R.aiCore = (e, d, a, dt) => {
    core0(e, d, a, dt);
    const P = e.tgt || W().P; if (e.xpat == null) nextPat(e, 9);
    if (e.sweep) { e.sweep.t -= dt; if (e.sweep.t <= 0) { const s = e.sweep; e.sweep = null; R.fx('swing', e.x, 0, e.z, { a: s.a, arc: 2.6, range: 9, color: '#FF8AAA' }); targets().forEach(t => { const dd = Math.hypot(t.x - e.x, t.z - e.z), aa = Math.atan2(t.x - e.x, t.z - e.z); if (dd < 9.2 && Math.abs(wrap(aa - s.a)) < 1.3) hit(t, e.dmg * 1.5, e, { knock: 0.7 }); }); R.shake(0.4); } return; }
    e.xpat -= dt; if (e.xpat > 0) return; nextPat(e, 9);
    e.sweep = { a, t: 1.0 }; R.fx('sector', e.x, 0, e.z, { a, arc: 2.6, range: 9, t: 1.0 });
  };
})(window.R);
