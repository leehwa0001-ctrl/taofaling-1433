// 遺跡生物的新動作（作者 2026-10-02：有些新怪的行為和攻擊邏輯跟舊怪一樣，要新做動作；怪物的邏輯太單調，有些怪應該可以一起對玩家打 combo）
// 一、各自的動作（R.AI_X；變種「荒、獰、淵」跟著本體一起換）——第一批：本來只會走過來咬的（chase）
//   - 鐵齒鼠：一群先散開把你圍住，再輪流衝進來咬。
//   - 苔團：平常慢慢晃；你靠近或打到牠，縮成一團朝你直直滾過來（先亮出路線）。
//   - 石蝸：你一靠近就縮進殼裡（兩秒內傷害只吃一成五），出來的時候吐一團黏液（打中會變慢）。
//   - 泥偶：把泥巴拋過來（落點先亮），砸到會變慢；貼近了才揮手。小泥偶還是追著咬。
//   - 鈴蟲：一跳一跳繞著你；附近有三隻以上會一起鳴叫，聲波一圈圈（打中會踉蹌）。
//   - 熒光蛞蝓：爬過的地方留下發光的黏液（踩到變慢）；貼近時突然一亮，看不清楚。
//   - 遺跡鼠：地上有魔力水晶就跑去吃（吃了變強、變快，要搶先撿起來）；平常咬一口就跑。
// 一之二、第二批：本來只會邊退邊射的（kite）——作者：可以設計比較賭爛的攻擊方式
//   - 杓靈：潑水落地變冰水窪；站在水窪裡又被潑到就凍住一秒。
//   - 飛卷：五張紙片甩出去，半秒後全部飛回來（來回都會打到）。
//   - 骨鳥：你一靠近就飛上去（打不到），落在你背後再射三根骨羽。
//   - 灰燼鴉：繞著你飛、一路掉火星（地上燒）；打倒時火星散一地。
//   - 審判之眼：眼睛張開兩秒，這時候你一動就挨一記；閉上才射七發扇形光彈。
//   - 嶺婆：衝過來搶一瓶回復藥就跑（沒藥就砍一刀）；打倒她才拿得回來。
//   - 雪粒童：你靠近就鑽進雪裡（打不到），從別的地方冒出來連丟三顆雪球。
//   - 捧盤童：丟豆腐（落點先亮），砸到手黏黏的、下一次出手慢一秒多。
//   - 怨角面：五道會追人的怨火；生命剩一半以下會和你換位置（先亮記號）。
//   - 掌眼人：看不見，只往你上一次出手、翻滾的地方射。
//   - 骨琴師：拉琴的時候，附近的遺跡生物快三成、兇兩成（先打牠）。
//   - 星紋蛛：噴絲；你被黏住（變慢）時把你拉過去咬。
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

  // ======== 第二批：本來只會邊退邊射的（kite）——作者：可以設計比較賭爛的攻擊方式 ========
  // 會轉彎的子彈（飛卷的紙片會飛回來、怨角面的怨火會追）
  let steer = [];
  const fireAt = (e, kind, a, o) => R.fire(Object.assign({ kind, owner: 'e', x: e.x, z: e.z, a, speed: 8, dmg: e.dmg, life: 2.2, src: e }, o || {}));
  // 你上一次出聲的地方（出手、翻滾）：掌眼人看不見，只聽得到
  const noise = () => { const w = W(); return w.noise && w.run && w.run.t - w.noise.t < 3 ? w.noise : null; };
  // 把人拉過去（翻滾、跳在空中的時候拉不動）
  const pull = (t, x, z, dur) => { const w = W(), P = w.P; if (t !== P || P.iframe > 0 || P.air > 0) return; let left = dur; P.knockT = Math.max(P.knockT || 0, dur); w.dyn.push(dt => { left -= dt; if (left <= 0 || P.dead) return false; const a = Math.atan2(x - P.x, z - P.z), dd = Math.hypot(x - P.x, z - P.z); if (dd < 1) return false; P.x += Math.sin(a) * Math.min(dd, 9 * dt); P.z += Math.cos(a) * Math.min(dd, 9 * dt); R.collide(P, 0.42); return true; }); };
  const lob = (x, z, ms, r, col, f) => { R.fx('mark', x, 0, z, { r, t: ms / 1000, color: col }); later(f, ms); };
  const kiteMove = (e, a, d, sp, dt, H, near, far) => { const want = d < near ? a + Math.PI : d > far ? a : a + Math.PI / 2 * (e.side || (e.side = rnd() < 0.5 ? 1 : -1)); H.move(e, want, sp * (d > near && d < far ? 0.5 : 1), dt); return true; };
  const inPuddle = t => goo.some(g => g.cold && Math.hypot(t.x - g.x, t.z - g.z) < g.r);

  // 杓靈：潑水（落地變成冰水窪）；站在水窪裡又被潑到就凍住
  AI.ladle = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.cd <= 0 && d < 10) {
      e.cd = 2.2; const [x, z] = floorAt(P.x, P.z), dmg = e.dmg;
      lob(x, z, 700, 1.3, '#7FC8FF', () => {
        R.fx('poof', x, 0.3, z, { color: '#BFE8FF', n: 10 });
        targets().forEach(t => {
          if (Math.hypot(t.x - x, t.z - z) >= 1.5) return;
          const frozen = inPuddle(t); hit(H, t, dmg, e, { slow: 2 });
          if (frozen && t === W().P) { t.knockT = Math.max(t.knockT || 0, 1.1); R.fx('ring', t.x, 0.3, t.z, { r: 0.9, color: '#BFE8FF' }); R.toast && R.toast('凍住了！（站在冰水窪裡又被潑到）', '#7FC8FF'); }
        });
        addGoo(x, z, 1.4, 6, '#5AA8E0'); goo[goo.length - 1].cold = true;
      });
    }
    return walk ? kiteMove(e, a, d, sp, dt, H, 5, 8) : false;
  };
  // 飛卷：五張紙片甩出去，半秒後全部飛回來
  AI.scroll = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.cd <= 0 && d < 12) { e.cd = 2.8; for (let i = 0; i < 5; i++) { const s = fireAt(e, 'spirit', a + (i - 2) * 0.28, { speed: 10, life: 0.6 }); steer.push({ s, kind: 'back', e, t: 0.55 }); } }
    return walk ? kiteMove(e, a, d, sp, dt, H, 5, 9) : false;
  };
  // 骨鳥：你一靠近就飛上去（打不到），落在你背後再射
  AI.bonebird = (e, P, d, a, sp, dt, walk, H) => {
    if (e.fly) {
      const f = e.fly; f.t += dt; const k = Math.min(1, f.t / f.dur); e.x = f.x0 + (f.x - f.x0) * k; e.z = f.z0 + (f.z - f.z0) * k; e.liftY = Math.sin(k * Math.PI) * 3.2;
      if (k >= 1) { e.fly = null; e.under = false; e.invuln = false; e.liftY = null; e.m.g.position.y = 0; const a2 = angTo(e, P); for (let i = -1; i <= 1; i++) fireAt(e, 'feather', a2 + i * 0.22, { speed: 12 }); e.cd = 1.6; }
      return false;
    }
    e.yaw = a;
    if (d < 3.5 && e.cd <= 0) { const fa = angTo(e, P), [x, z] = floorAt(P.x + Math.sin(fa) * 4.5, P.z + Math.cos(fa) * 4.5); e.fly = { x0: e.x, z0: e.z, x, z, t: 0, dur: 0.9 }; e.under = true; e.invuln = true; return false; }
    if (e.cd <= 0 && d < 12) { e.cd = 1.4; fireAt(e, 'feather', a, { speed: 12 }); }
    return walk ? kiteMove(e, a, d, sp, dt, H, 4, 8) : false;
  };
  // 灰燼鴉：繞著你飛、一路掉火星（地上燒起來）
  AI.ember = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; e.dropT = (e.dropT || 0) - dt;
    if (e.dropT <= 0 && d < 12) { e.dropT = 1.1; R.addZone({ kind: 'lava', x: e.x, z: e.z, r: 0.85, life: 3.5, dmg: e.dmg * 0.5 }); }
    if (e.cd <= 0 && d < 11) { e.cd = 2.4; for (let i = -1; i <= 1; i++) fireAt(e, 'fire', a + i * 0.25, { speed: 9 }); }
    if (walk) { e.orb = (e.orb == null ? angTo(P, e) : e.orb) + dt * 0.8 * (e.side || (e.side = rnd() < 0.5 ? 1 : -1)); const tx = P.x + Math.sin(e.orb) * 5, tz = P.z + Math.cos(e.orb) * 5; H.move(e, Math.atan2(tx - e.x, tz - e.z), sp, dt); return true; }
    return false;
  };
  // 審判之眼：眼睛張開的時候你一動就挨打；閉上才射扇形的光彈
  AI.judge = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.watch) {
      const w = e.watch; w.t -= dt;
      if (w.t < w.dur - 0.5 && P.still === 0 && !w.hit) { w.hit = true; R.fx('aim', e.x, 1.4, e.z, { a: angTo(e, P), len: dist(e, P), t: 0.2 }); hit(H, P, e.dmg * 1.6, e, { knock: 0.3 }); R.toast && R.toast('審判之眼：「我看見你動了。」', '#FFE070'); }
      if (w.t <= 0) { e.watch = null; e.cd = 3.5; for (let i = 0; i < 7; i++) fireAt(e, 'ering', a + (i - 3) * 0.2, { speed: 9 }); }
      return false;
    }
    if (e.cd <= 0 && d < 12) { e.watch = { t: 2, dur: 2, hit: false }; R.fx('mark', P.x, 0, P.z, { r: 1.1, t: 2, color: '#FFE070' }); R.num && R.num(e.x, 2.4, e.z, '眼睛張開了', ''); return false; }
    return walk ? kiteMove(e, a, d, sp, dt, H, 6, 10) : false;
  };
  // 嶺婆：衝過來搶一瓶回復藥就跑（打倒她才拿得回來）
  AI.snatch = (e, P, d, a, sp, dt, walk, H) => {
    const S = R.S;
    if (e.flee > 0) { e.flee -= dt; e.yaw = a + Math.PI; if (e.cd <= 0) { e.cd = 1; fireAt(e, 'feather', a, { speed: 11 }); } if (walk) { H.move(e, a + Math.PI, sp * 1.35, dt); return true; } return false; }
    e.yaw = a; if (e.grab > 0) e.grab -= dt;
    if (d < e.def.size + 0.9 && !(e.grab > 0)) {
      e.grab = 6;
      if (S && S.potions && S.potions.hp > 0 && P === W().P) { S.potions.hp--; e.stole = (e.stole || 0) + 1; R.toast && R.toast('嶺婆搶走了一瓶回復藥！（打倒她拿回來）', '#FF9A6A'); R.fx('poof', e.x, 1, e.z, { color: '#E07A7A', n: 6 }); }
      else hit(H, P, e.dmg, e);
      e.flee = 3.5; return false;
    }
    if (e.cd <= 0 && d > 3 && d < 10) { e.cd = 1.3; for (let i = -1; i <= 1; i += 2) fireAt(e, 'feather', a + i * 0.12, { speed: 11 }); }
    if (walk) { H.move(e, a, sp * 1.15, dt); return true; }
    return false;
  };
  // 雪粒童：鑽進雪裡（打不到），從別的地方冒出來丟三顆雪球
  AI.snowhide = (e, P, d, a, sp, dt, walk, H) => {
    if (e.hide > 0) {
      e.hide -= dt; e.liftY = -1.2;
      if (e.hide <= 0) {
        const ang = rnd() * Math.PI * 2, [x, z] = floorAt(P.x + Math.sin(ang) * 6, P.z + Math.cos(ang) * 6);
        e.x = x; e.z = z; e.liftY = null; e.m.g.position.set(x, 0, z); e.under = false; e.invuln = false; R.fx('poof', x, 0.3, z, { color: '#F2F6F8', n: 10 });
        [0, 180, 360].forEach(ms => later(() => { if (!e.dead) fireAt(e, 'cold', angTo(e, W().P), { speed: 10 }); }, 250 + ms)); e.cd = 2.5;
      }
      return false;
    }
    e.yaw = a;
    if (d < 4 && e.cd <= 0) { e.hide = 1.2; e.under = true; e.invuln = true; R.fx('poof', e.x, 0.3, e.z, { color: '#F2F6F8', n: 10 }); return false; }
    if (e.cd <= 0 && d < 10) { e.cd = 1.8; fireAt(e, 'cold', a, { speed: 9 }); }
    return walk ? kiteMove(e, a, d, sp, dt, H, 5, 8) : false;
  };
  // 捧盤童：丟豆腐（落點先亮）；砸到手黏黏的，下一次出手慢一秒多
  AI.tofu = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.cd <= 0 && d < 9) {
      e.cd = 2.4; const [x, z] = floorAt(P.x, P.z), dmg = e.dmg;
      lob(x, z, 750, 1.1, '#F2ECDC', () => {
        R.fx('poof', x, 0.3, z, { color: '#F2ECDC', n: 8 });
        targets().forEach(t => { if (Math.hypot(t.x - x, t.z - z) < 1.3) { hit(H, t, dmg, e, { slow: 1.5 }); if (t === W().P) { t.atkCd = Math.max(t.atkCd || 0, 1.3); R.num && R.num(t.x, 2.4, t.z, '手黏黏的', ''); } } });
      });
    }
    return walk ? kiteMove(e, a, d, sp, dt, H, 4, 7) : false;
  };
  // 怨角面：會追人的怨火；生命剩一半以下會和你換位置
  AI.grudge = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.swapT > 0) {
      e.swapT -= dt;
      if (e.swapT <= 0 && P === W().P && !P.dead && !(P.air > 0)) { const px = P.x, pz = P.z; P.x = e.x; P.z = e.z; e.x = px; e.z = pz; e.m.g.position.x = e.x; e.m.g.position.z = e.z; R.fx('blink', P.x, 1, P.z); R.fx('blink', e.x, 1, e.z); R.toast && R.toast('怨角面和你換了位置！', '#C8A0FF'); }
      return false;
    }
    if (e.hp < e.hpMax * 0.5 && !(e.swapCd > 0) && d < 10) { e.swapCd = 8; e.swapT = 1; R.fx('mark', P.x, 0, P.z, { r: 0.9, t: 1, color: '#C8A0FF' }); R.fx('mark', e.x, 0, e.z, { r: 0.9, t: 1, color: '#C8A0FF' }); return false; }
    if (e.swapCd > 0) e.swapCd -= dt;
    if (e.cd <= 0 && d < 12) { e.cd = 2.2; for (let i = 0; i < 5; i++) { const s = fireAt(e, 'spirit', a + (i - 2) * 0.3, { speed: 6.5, life: 3 }); steer.push({ s, kind: 'home', e, t: 1.6 }); } }
    return walk ? kiteMove(e, a, d, sp, dt, H, 5, 9) : false;
  };
  // 掌眼人：看不見，只往你上一次出聲的地方射（出手、翻滾的地方）
  AI.palmeye = (e, P, d, a, sp, dt, walk, H) => {
    const n = noise();
    if (n) e.yaw = Math.atan2(n.x - e.x, n.z - e.z);
    if (e.cd <= 0 && n && Math.hypot(n.x - e.x, n.z - e.z) < 13) { e.cd = 1.6; const aa = Math.atan2(n.x - e.x, n.z - e.z); fireAt(e, 'ering', aa - 0.08, { speed: 13 }); fireAt(e, 'ering', aa + 0.08, { speed: 13 }); }
    if (walk) { e.wan = (e.wan == null ? rnd() * 6 : e.wan) + (rnd() - 0.5) * dt * 6; H.move(e, n && d > 7 ? a : e.wan, sp * 0.7, dt); return true; }
    return false;
  };
  // 骨琴師：拉琴的時候，附近的遺跡生物變快、變兇（先打牠）
  AI.fiddle = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; e.playing = d < 14;
    if (e.cd <= 0 && d < 12) { e.cd = 2.6; for (let i = -1; i <= 1; i++) fireAt(e, 'spirit', a + i * 0.3, { speed: 8 }); }
    if (e.playing) { e.noteT = (e.noteT || 0) - dt; if (e.noteT <= 0) { e.noteT = 1.2; R.fx('ring', e.x, 0.4, e.z, { r: 7, color: '#C8A0FF' }); } }
    return walk ? kiteMove(e, a, d, sp, dt, H, 6, 10) : false;
  };
  // 星紋蛛：噴絲；你被絲黏住（變慢）的時候把你拉過去咬
  AI.reel = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; if (e.cd2 > 0) e.cd2 -= dt;
    if (P.slowT > 0 && d < 9 && d > 2 && !(e.cd2 > 0)) { e.cd2 = 5; R.fx('aim', e.x, 1, e.z, { a, len: d, t: 0.3 }); pull(P, e.x, e.z, 0.6); later(() => { if (!e.dead && dist(e, W().P) < 2.2) hit(H, W().P, e.dmg * 1.3, e); }, 650); return false; }
    if (e.cd <= 0 && d < 11) { e.cd = 2.2; fireAt(e, 'web', a - 0.12, { speed: 9 }); fireAt(e, 'web', a + 0.12, { speed: 9 }); }
    return walk ? kiteMove(e, a, d, sp, dt, H, 4, 8) : false;
  };
  [['funa', 'ladle'], ['kyorinrin', 'scroll'], ['bonebird', 'bonebird'], ['ashcrow', 'ember'], ['judgeeye', 'judge'], ['mineba', 'snatch'], ['yukiko', 'snowhide'], ['tofuko', 'tofu'], ['hannya', 'grudge'], ['tenome', 'palmeye'], ['bonefiddler', 'fiddle'], ['starspider', 'reel']].forEach(([id, ai]) => setAi(id, ai));
  // 嶺婆被打倒：搶走的藥還回來；灰燼鴉被打倒：火星散一地
  const ke6 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke6(e, by);
    if (was && e.dead) {
      if (e.stole && R.S && R.S.potions) { R.S.potions.hp += e.stole; R.toast && R.toast('拿回了被嶺婆搶走的回復藥 ×' + e.stole, '#7AE0A0'); e.stole = 0; }
      if (e.def.ai === 'ember') for (let i = 0; i < 3; i++) { const ang = i * 2.1, [x, z] = floorAt(e.x + Math.sin(ang) * 1.2, e.z + Math.cos(ang) * 1.2); R.addZone({ kind: 'lava', x, z, r: 0.8, life: 3, dmg: e.dmg * 0.5 }); }
    }
    return r;
  };
  // 出聲：出手、翻滾
  const at6 = R.attack;
  R.attack = (...a) => { const P = W().P, cd = P ? P.atkCd : 0, r = at6(...a); if (P && W().run && P.atkCd > cd + 0.001) W().noise = { x: P.x, z: P.z, t: W().run.t }; return r; };
  const dg6 = R.dodge;
  R.dodge = (...a) => { const P = W().P, r = dg6(...a); if (P && W().run) W().noise = { x: P.x, z: P.z, t: W().run.t }; return r; };
  // 每一格：轉彎的子彈、骨琴師的加成
  const stepB = dt => {
    const w = W(), P = w.P;
    // 飛上去、鑽進雪裡：遺跡生物的位置每一格會重設，高度在這裡再蓋一次
    (w.enemies || []).forEach(e => { if (e.liftY != null && e.m && e.m.g) { if (e.dead) e.liftY = null; else e.m.g.position.y = e.liftY; } });
    steer = steer.filter(c => {
      const s = c.s; if (s.dead || !w.shots.includes(s)) return false;
      c.t -= dt;
      if (c.kind === 'back' && c.t <= 0) { if (c.e.dead) return false; const a = Math.atan2(c.e.x - s.x, c.e.z - s.z), v = Math.hypot(s.vx, s.vz); s.vx = Math.sin(a) * v; s.vz = Math.cos(a) * v; s.life = 0.7; s.mesh.rotation.y = a; return false; }
      if (c.kind === 'home') { if (c.t <= 0 || !P) return false; const cur = Math.atan2(s.vx, s.vz), want = Math.atan2(P.x - s.x, P.z - s.z), da = wrap(want - cur), turn = Math.max(-1.6 * dt, Math.min(1.6 * dt, da)), v = Math.hypot(s.vx, s.vz); s.vx = Math.sin(cur + turn) * v; s.vz = Math.cos(cur + turn) * v; s.mesh.rotation.y = cur + turn; }
      return true;
    });
    const fids = (w.enemies || []).filter(e => !e.dead && e.def.ai === 'fiddle' && e.playing);
    (w.enemies || []).forEach(e => {
      if (e.dead || e.def.ai === 'fiddle') return;
      const on = fids.some(f => dist(f, e) < 7);
      if (on && !e.fidOn) { e.fidOn = true; e.speed *= 1.3; e.dmg *= 1.2; }
      else if (!on && e.fidOn) { e.fidOn = false; e.speed /= 1.3; e.dmg /= 1.2; }
    });
  };

  // ---------- 一起打 combo ----------
  const MELEE = new Set(['chase', 'gnaw', 'pounce', 'charge', 'guard', 'skitter', 'stalk', 'hop', 'roll', 'grapple', 'mudthrow', 'crystalrat', 'chirp', 'mossroll']);
  const RANGED = new Set(['kite', 'shell', 'turret', 'mortar', 'laser', 'zap', 'ladle', 'scroll', 'bonebird', 'ember', 'judge', 'snowhide', 'tofu', 'grudge', 'palmeye', 'fiddle', 'reel']);
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
    stepB(dt);
    if (!w.paused) director(dt);
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (...a) => { clearGoo(); steer = []; comboT = 5; return lf0(...a); };
})(window.R);
