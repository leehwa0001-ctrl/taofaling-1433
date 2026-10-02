// 遺跡生物的新動作（作者 2026-10-02：有些新怪的行為和攻擊邏輯跟舊怪一樣，要新做動作；怪物的邏輯太單調，有些怪應該可以一起對玩家打 combo）
// 一、各自的動作（R.AI_X；變種「荒、獰、淵」跟著本體一起換）——第一批：本來只會走過來咬的（chase）
//   - 鐵齒鼠：一群先散開把你圍住，再輪流衝進來咬。
//   - 苔團：平常慢慢晃；你靠近或打到牠，縮成一團朝你直直滾過來（先亮出路線）。
//   - 石蝸：你一靠近就縮進殼裡（兩秒內傷害只吃一成五），出來的時候吐一團黏液（打中會變慢）。
//   - 泥偶：把泥巴拋過來（落點先亮），砸到會變慢；貼近了才揮手。小泥偶還是追著咬。
//   - 鈴蟲：一跳一跳繞著你；附近有三隻以上會一起鳴叫，聲波一圈圈（打中會踉蹌）。
//   - 熒光蛞蝓：爬過的地方留下發光的黏液（踩到變慢）；貼近時突然一亮，看不清楚。
//   - 遺跡鼠：地上有魔力水晶就跑去吃（吃了變強、變快，要搶先撿起來）；平常咬一口就跑。
// 二、一起打 combo（每一層有一個「指揮」，看附近有誰，先亮出記號再出手，翻滾躲得掉）：
//   - 牽制→突擊：會遠攻的先射一發黏網（變慢），近戰的接著衝過來。
//   - 夾擊：兩隻近戰的，一隻繞到你背後，兩邊一起砍。
//   - 圍殺：三隻以上近戰的散開圍成一圈，地上亮一圈，一起撲下來。
//   同一層的 combo 有共用的冷卻（6～9 秒），領主體、人不參加。
// 放在 variants.js 後面。
(function (R) {
  const W = () => R.W, rnd = Math.random, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const AI = R.AI_X = R.AI_X || {};
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const floorAt = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  const hit = (H, t, dmg, src, o) => H.hurtT(t, dmg, src, o);
  const targets = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed)).filter(t => t && !t.dead); };
  const setAi = (id, ai) => Object.keys(R.ENEMIES).forEach(k => { const d = R.ENEMIES[k]; if (k === id || d.vbase === id || k.indexOf(id + '_v') === 0) d.ai = ai; });

  // ---------- 地上的黏液（自己管：踩到變慢） ----------
  let goo = [];
  const addGoo = (x, z, r, life, col) => {
    const TH = THREE, m = new TH.Mesh(new TH.CircleGeometry(r, 14), new TH.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z); W().scene.add(m); goo.push({ x, z, r, life, max: life, m });
  };
  const clearGoo = () => { goo.forEach(g => { if (g.m.parent) g.m.parent.remove(g.m); g.m.geometry.dispose(); g.m.material.dispose(); }); goo = []; };

  // ---------- 鐵齒鼠：圍住、輪流咬 ----------
  AI.gnaw = (e, P, d, a, sp, dt, walk, H) => {
    const pack = W().enemies.filter(o => !o.dead && o.def.ai === 'gnaw' && dist(o, P) < 9);
    const i = pack.indexOf(e), n = Math.max(1, pack.length);
    if (e.dart) {   // 衝進去咬一口，再退回圈上
      e.dart.t -= dt; e.yaw = e.dart.a; H.move(e, e.dart.a, sp * 2.2, dt);
      if (!e.dart.bit && d < e.def.size + 0.8) { e.dart.bit = true; hit(H, P, e.dmg, e); }
      if (e.dart.t <= 0) e.dart = null; return true;
    }
    const slot = (W().run.t * 0.4 + i / n * Math.PI * 2), tx = P.x + Math.sin(slot) * 2.6, tz = P.z + Math.cos(slot) * 2.6, dd = Math.hypot(tx - e.x, tz - e.z);
    e.yaw = a;
    // 輪到的那一隻衝進去（一次一隻）
    const turn = n > 1 ? Math.floor(W().run.t / 0.9) % n === i : true;
    if (turn && e.cd <= 0 && d < 4) { e.cd = 1.4; e.dart = { a, t: 0.35 }; return true; }
    if (walk && dd > 0.3) { H.move(e, Math.atan2(tx - e.x, tz - e.z), sp, dt); return true; }
    return false;
  };
  // ---------- 苔團：被惹了才滾過來 ----------
  AI.mossroll = (e, P, d, a, sp, dt, walk, H) => {
    if (e.roll) {
      const r = e.roll; r.t -= dt; e.yaw = r.a;
      if (r.wind > 0) { r.wind -= dt; return false; }
      const ox = e.x, oz = e.z; H.move(e, r.a, sp * 4.5, dt); R.collide(e, e.def.size * 0.5);
      if (Math.hypot(e.x - ox, e.z - oz) < sp * 4.5 * dt * 0.3) r.t = 0;   // 撞牆就停
      targets().forEach(t => { if (!r.done.has(t) && dist(e, t) < e.def.size + 0.5) { r.done.add(t); hit(H, t, e.dmg * 1.4, e, { knock: 0.3 }); } });
      if (r.t <= 0) { e.roll = null; e.cd = 3.5; } return true;
    }
    e.yaw = a;
    if ((e.flash > 0 || d < 5) && e.cd <= 0 && d < 9) { e.roll = { a, t: 1.1, wind: 0.5, done: new Set() }; R.fx('aim', e.x, 0.3, e.z, { a, len: 8, t: 0.5 }); return false; }
    if (walk) { e.wan = (e.wan || rnd() * 6) + dt * 0.7; H.move(e, e.wan, sp * 0.4, dt); return true; }
    return false;
  };
  // ---------- 石蝸：縮殼、吐黏液 ----------
  AI.shell = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.shellT > 0) {
      e.shellT -= dt; if (e.m && e.m.g) e.m.g.scale.y = 0.75;
      if (e.shellT <= 0) { if (e.m && e.m.g) e.m.g.scale.y = 1; e.cd = 0.6; e.spit = true; }
      return false;
    }
    if (e.spit && e.cd <= 0) { e.spit = false; e.cd = 2.8; R.fire({ kind: 'web', owner: 'e', x: e.x, z: e.z, a, speed: 6, dmg: e.dmg, life: 2.2, src: e }); return false; }
    if (d < 2.6 && !e.shellCd) { e.shellT = 2; e.shellCd = 5; R.fx('ring', e.x, 0.1, e.z, { r: 1, color: '#C8B898' }); return false; }
    if (e.shellCd) e.shellCd = Math.max(0, e.shellCd - dt) || 0;
    if (e.cd <= 0 && d < 7) { e.cd = 3.2; R.fire({ kind: 'web', owner: 'e', x: e.x, z: e.z, a, speed: 6, dmg: e.dmg, life: 2.2, src: e }); }
    if (walk && d > 3.5) { H.move(e, a, sp, dt); return true; }
    return false;
  };
  // ---------- 泥偶：拋泥巴 ----------
  AI.mudthrow = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (d < e.def.size + 1 && e.cd <= 0) { e.cd = 1.3; R.fx('swing', e.x, 1, e.z, { a, range: 1.6, arc: 1.2 }); hit(H, P, e.dmg, e); return false; }
    if (e.cd <= 0 && d < 10 && d > 3) {
      e.cd = 2.6; const [x, z] = floorAt(P.x + (P.vx || 0) * 0.4, P.z + (P.vz || 0) * 0.4), dmg = e.dmg * 1.2;
      R.fx('mark', x, 0, z, { r: 1.4, t: 0.85, color: '#8A6A3A' });
      later(() => { R.fx('poof', x, 0.3, z, { color: '#7A5A3A', n: 8 }); addGoo(x, z, 1.3, 3, '#6A4A2A'); targets().forEach(t => { if (Math.hypot(t.x - x, t.z - z) < 1.6) hit(H, t, dmg, e, { slow: 1.5 }); }); }, 850);
    }
    if (walk && d > 2.4) { H.move(e, a, sp * (d < 6 ? 0.5 : 1), dt); return true; }
    return false;
  };
  // ---------- 鈴蟲：跳、一起鳴叫 ----------
  AI.chirp = (e, P, d, a, sp, dt, walk, H) => {
    if (e.leap) { e.leap.t -= dt; H.move(e, e.leap.a, sp * 2.4, dt); if (e.m && e.m.g) e.m.g.position.y = Math.sin(Math.max(0, e.leap.t) / 0.35 * Math.PI) * 0.6; if (!e.leap.bit && d < 1) { e.leap.bit = true; hit(H, P, e.dmg, e); } if (e.leap.t <= 0) e.leap = null; return true; }
    e.yaw = a;
    const mates = W().enemies.filter(o => !o.dead && o.def.ai === 'chirp' && dist(o, e) < 6);
    if (mates.length >= 3 && !W().chirpT && d < 9) {   // 一起叫：聲波一圈圈
      W().chirpT = 6; const c = mates.reduce((s, o) => [s[0] + o.x / mates.length, s[1] + o.z / mates.length], [0, 0]);
      mates.forEach(o => R.fx('ring', o.x, 0.6, o.z, { r: 1.2, color: '#E8D86A' }));
      [0, 450, 900].forEach((ms, k) => later(() => { R.fx('ring', c[0], 0.2, c[1], { r: 3 + k * 1.6, color: '#E8D86A' }); targets().forEach(t => { const dd = Math.hypot(t.x - c[0], t.z - c[1]); if (dd < 3.4 + k * 1.6 && dd > 1.6 + k * 1.6) hit(H, t, e.dmg * 0.8, e, { knock: 0.25 }); }); }, ms));
      return false;
    }
    if (e.cd <= 0 && walk) { e.cd = 0.9 + rnd() * 0.5; const side = (rnd() < 0.5 ? 1 : -1) * (d < 2.5 ? 1.2 : 0.5); e.leap = { a: d < 2.5 && rnd() < 0.5 ? a : a + side, t: 0.35 }; return true; }
    return false;
  };
  // ---------- 熒光蛞蝓：黏液路、閃光 ----------
  AI.glow = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; e.gooT = (e.gooT || 0) - dt;
    if (e.gooT <= 0) { e.gooT = 0.9; addGoo(e.x, e.z, 0.9, 6, '#7AE0B0'); }
    if (e.flashT > 0) { e.flashT -= dt; if (e.flashT <= 0) { R.fx('boom', e.x, 0.6, e.z, { r: 3, color: '#D8FFE8' }); targets().forEach(t => { if (dist(e, t) < 3.2) hit(H, t, e.dmg * 0.5, e, { blind: 2 }); }); e.cd = 5; } return false; }
    if (d < 3 && e.cd <= 0) { e.flashT = 0.6; R.fx('mark', e.x, 0, e.z, { r: 3, t: 0.6, color: '#D8FFE8' }); return false; }
    if (walk && d > 1.2) { H.move(e, a, sp, dt); return true; }
    return false;
  };
  // ---------- 遺跡鼠：吃水晶、咬了就跑 ----------
  const CRY = ['crystal', 'purecry', 'frostcry', 'flamecry', 'sandcry', 'tidecry'];
  AI.crystalrat = (e, P, d, a, sp, dt, walk, H) => {
    const w = W(), food = (w.drops || []).filter(o => o.mat && CRY.includes(o.mat) && !o.gone && o.mesh && o.mesh.parent).sort((p, q) => dist(e, p) - dist(e, q))[0];
    if (food && dist(e, food) < 12) {
      const fa = angTo(e, food); e.yaw = fa;
      if (dist(e, food) < 0.7) {
        food.gone = true; if (food.mesh.parent) food.mesh.parent.remove(food.mesh); const k = w.drops.indexOf(food); if (k >= 0) w.drops.splice(k, 1);
        e.ate = (e.ate || 0) + 1; e.hpMax *= 1.25; e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.4); e.dmg *= 1.15; e.speed *= 1.08;
        R.fx('ring', e.x, 0.3, e.z, { r: 1, color: '#8A74FF' }); R.num && R.num(e.x, 1.4, e.z, '吃掉水晶', '');
      } else if (walk) { H.move(e, fa, sp * 1.3, dt); return true; }
      return false;
    }
    if (e.flee > 0) { e.flee -= dt; e.yaw = a + Math.PI; if (walk) { H.move(e, a + Math.PI, sp, dt); return true; } return false; }
    e.yaw = a;
    if (d < e.def.size + 0.7 && e.cd <= 0) { e.cd = 1.1; hit(H, P, e.dmg, e); e.flee = 0.8; return false; }
    if (walk) { H.move(e, a, sp, dt); return true; }
    return false;
  };
  [['tesso', 'gnaw'], ['mossball', 'mossroll'], ['stonesnail', 'shell'], ['muddoll', 'mudthrow'], ['bellcricket', 'chirp'], ['glowslug', 'glow'], ['ruinrat', 'crystalrat']].forEach(([id, ai]) => setAi(id, ai));
  // 石蝸縮在殼裡：傷害只吃一成五
  const ed0 = R.enemyDefend;
  R.enemyDefend = (e, dmg, o, crit) => { dmg = ed0 ? ed0(e, dmg, o, crit) : dmg; if (e && e.shellT > 0) { if (rnd() < 0.3) R.num(e.x, 1.6, e.z, '縮殼', ''); return dmg * 0.15; } return dmg; };

  // ---------- 一起打 combo ----------
  const MELEE = new Set(['chase', 'gnaw', 'pounce', 'charge', 'guard', 'skitter', 'stalk', 'hop', 'roll', 'grapple', 'mudthrow', 'crystalrat', 'chirp', 'mossroll']);
  const RANGED = new Set(['kite', 'shell', 'turret', 'mortar', 'laser', 'zap']);
  const able = e => !e.dead && !e.dormant && e.aggro && !e.def.boss && !e.def.human && e.id !== 'petra' && !(e.st && (e.st.stun > 0)) && !e.combo;
  // 讓一隻在 t 秒內走到 (x, z)（這段時間牠自己的 AI 先停腳）
  const glide = (e, x, z, t) => { const [fx, fz] = floorAt(x, z); e.combo = { x0: e.x, z0: e.z, x: fx, z: fz, t: 0, dur: t }; if (e.st) e.st.root = Math.max(e.st.root || 0, t); };
  const lunge = (e, P, delay, mult) => later(() => { if (e.dead) return; const a = angTo(e, P), [x, z] = floorAt(P.x - Math.sin(a) * 0.8, P.z - Math.cos(a) * 0.8); R.fx('aim', e.x, 0.3, e.z, { a, len: dist(e, P), t: 0.3 }); later(() => { if (e.dead) return; glide(e, x, z, 0.2); later(() => { if (!e.dead && dist(e, P) < e.def.size + 1.3) R.hurtPlayer(e.dmg * mult, e); }, 200); }, 300); }, delay);
  let comboT = 4, told = false;
  const director = dt => {
    const w = W(), P = w.P, run = w.run; if (!P || P.dead || !run || run.done || (run.grade && run.grade.passive)) return;
    comboT -= dt; if (comboT > 0) return;
    const near = w.enemies.filter(e => able(e) && dist(e, P) < 9);
    const melee = near.filter(e => MELEE.has(e.def.ai)), ranged = near.filter(e => RANGED.has(e.def.ai) || e.def.shoot);
    let did = '';
    if (melee.length >= 3 && rnd() < 0.5) {   // 圍殺
      const team = melee.slice(0, 4), cx = P.x, cz = P.z, rr = 2.2;
      team.forEach((e, i) => { const ang = i / team.length * Math.PI * 2 + rnd(); glide(e, cx + Math.sin(ang) * rr, cz + Math.cos(ang) * rr, 0.6); });
      R.fx('mark', cx, 0, cz, { r: 1.8, t: 1.1, color: '#FF4A3A' });
      const dmg = team.reduce((s, e) => s + e.dmg, 0) / team.length * 1.6;
      later(() => { R.fx('boom', cx, 0.3, cz, { r: 1.8, color: '#FF6A4A' }); R.shake && R.shake(0.2); if (Math.hypot(P.x - cx, P.z - cz) < 1.9) R.hurtPlayer(dmg, team[0], { knock: 0.3 }); }, 1100);
      did = '圍殺';
    } else if (ranged.length && melee.length) {   // 牽制→突擊
      const s = ranged[0], a = angTo(s, P);
      R.fx('aim', s.x, 0.3, s.z, { a, len: dist(s, P) + 1, t: 0.5 });
      later(() => { if (!s.dead) R.fire({ kind: 'web', owner: 'e', x: s.x, z: s.z, a: angTo(s, P), speed: 12, dmg: s.dmg * 0.6, life: 1.6, src: s }); }, 500);
      melee.slice(0, 2).forEach((e, i) => lunge(e, P, 900 + i * 250, 1.2));
      did = '牽制';
    } else if (melee.length >= 2) {   // 夾擊
      const [f, b] = melee, fa = P.aimA != null ? P.aimA : P.yaw || 0;
      glide(b, P.x - Math.sin(fa) * 1.8, P.z - Math.cos(fa) * 1.8, 0.7);
      R.fx('mark', P.x - Math.sin(fa) * 1.8, 0, P.z - Math.cos(fa) * 1.8, { r: 0.8, t: 0.7, color: '#FF4A3A' });
      [f, b].forEach(e => lunge(e, P, 800, 1.15));
      did = '夾擊';
    }
    if (did) { comboT = 6 + rnd() * 3; if (!told) { told = true; R.toast && R.toast('遺跡生物在互相配合（' + did + '）——看到紅色的記號就翻滾。', '#FF9A6A'); } }
    else comboT = 1;
  };

  // ---------- 每一格：滑步、黏液、鳴叫的冷卻、combo ----------
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(), P = w.P; if (!w.run || !P) return;
    if (w.chirpT) w.chirpT = Math.max(0, w.chirpT - dt);
    (w.enemies || []).forEach(e => {
      const c = e.combo; if (!c) return; if (e.dead) { e.combo = null; return; }
      c.t += dt; const k = Math.min(1, c.t / c.dur); e.x = c.x0 + (c.x - c.x0) * k; e.z = c.z0 + (c.z - c.z0) * k; e.yaw = angTo(e, P);
      if (e.m && e.m.g) { e.m.g.position.x = e.x; e.m.g.position.z = e.z; }
      if (k >= 1) e.combo = null;
    });
    goo = goo.filter(g => { g.life -= dt; g.m.material.opacity = 0.45 * Math.min(1, g.life / 1.5); if (Math.hypot(P.x - g.x, P.z - g.z) < g.r && !(P.air > 0)) P.slowT = Math.max(P.slowT || 0, 0.4); if (g.life <= 0) { if (g.m.parent) g.m.parent.remove(g.m); g.m.geometry.dispose(); g.m.material.dispose(); return false; } return true; });
    if (!w.paused) director(dt);
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (...a) => { clearGoo(); comboT = 5; return lf0(...a); };
})(window.R);
