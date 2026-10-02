// 討伐令 1433：追車和路障（作者：路障、追車）
// 被通緝的時候開車：
// - 巡邏車：通緝幾顆星就最多幾台（最多三台），從你後面的路口開出來，照路網追你；看得到你就直接衝過來，會撞你。
//   有巡邏車在 40 公尺內看得到你，星星就不會退。巡邏車貼著你、你又停下來（時速 7 公里以下）超過一秒半：被逮捕。
//   有鳴笛聲（WebAudio 合成，越近越大聲）。
// - 路障：兩顆星以上，前面的路口會擺出路障（兩台巡邏車＋紅白柵欄＋衛兵），留一條窄縫；在路障旁邊停下來也會被逮捕。
// 星星退光了：巡邏車開走、路障收掉。下車用走的：巡邏車停下來，靠太近一樣會被抓。
(function (R) {
  const W = R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const C = R.CITY, toS = v => v / C.S + 500, toW = s => (s - 500) * C.S;
  const P = () => W.P, tw = () => W.town, V = () => R.VEH;
  const PU = { cars: [], blocks: [], spawnT: 4, blockT: 8, bustT: 0, sirenT: 0, msgT: 0 };

  const policeMesh = () => {
    const v = V(), g = v.carMesh('sedan', '#F2F2F4'), TH = THREE;
    v.box(g, 2.02, 0.4, 1.8, v.lam('#1A1A22'), 0, 0.72, 0);   // 黑色的車門
    const red = v.box(g, 0.6, 0.18, 0.4, v.lam('#FF2A2A', { em: '#FF2A2A', ei: 1 }), -0.35, 1.78, 0.15), blue = v.box(g, 0.6, 0.18, 0.4, v.lam('#2A6AFF', { em: '#2A6AFF', ei: 1 }), 0.35, 1.78, 0.15);
    g.userData.lights = [red, blue]; return g;
  };
  const sees = (a, b) => { const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(L / 1.5); for (let i = 1; i < n; i++) { const x = a.x + (b.x - a.x) * i / n, z = a.z + (b.z - a.z) * i / n; for (const c of R.boxesNear(x, z)) if (c.on !== false && (c.tag === 'house' || c.tag === 'wall') && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return false; } return true; };
  const nodeNear = (fn) => { const nodes = R.NAV && R.NAV.nodes; if (!nodes) return null; const Pl = P(); let best = null; for (let k = 0; k < 80; k++) { const q = pick(nodes), x = toW(q[0]), z = toW(q[1]); if (fn(x, z, Math.hypot(x - Pl.x, z - Pl.z))) { best = [x, z, q]; break; } } return best; };

  // ---------- 巡邏車 ----------
  const spawnCar = () => {
    const t = tw(), car = V().cur, Pl = P(); if (!t || !car) return;
    const fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw);
    const n = nodeNear((x, z, d) => d > 45 && d < 80 && ((x - Pl.x) * fx + (z - Pl.z) * fz) / d < 0.2 && !R.col.list.some(b => b.on !== false && b.tag === 'house' && x > b.x0 - 1.5 && x < b.x1 + 1.5 && z > b.z0 - 1.5 && z < b.z1 + 1.5)); if (!n) return;
    const g = policeMesh(); g.position.set(n[0], 0, n[1]); t.group.add(g);
    const pc = { g, x: n[0], z: n[1], yaw: Math.atan2(-(Pl.x - n[0]), -(Pl.z - n[1])), v: 0, path: null, pi: 0, pathT: 0, stuck: 0, rev: 0 }; PU.cars.push(pc);
    if (PU.msgT <= 0) { R.toast('巡邏車追上來了！', '#E8323A'); PU.msgT = 8; }
  };
  const driveCar = (pc, dt) => {
    const Pl = P(), car = V().cur, tgt = car || Pl, maxV = Math.max(11, (car ? (V().MODELS[car.model] || { max: 14 }).max : 12) * 0.93);
    const d = Math.hypot(tgt.x - pc.x, tgt.z - pc.z), see = d < 22 && sees(pc, tgt);
    let tx = tgt.x, tz = tgt.z;
    if (!see) {
      pc.pathT -= dt; if (!pc.path || pc.pathT <= 0) { pc.pathT = 1.2; const p = R.navPath && R.navPath(toS(pc.x), toS(pc.z), toS(tgt.x), toS(tgt.z)); pc.path = p && p.length > 1 ? p.map(([a, b]) => [toW(a), toW(b)]) : null; pc.pi = 0; }
      if (pc.path) { let q = pc.path[pc.pi]; while (q && Math.hypot(q[0] - pc.x, q[1] - pc.z) < 3 && pc.pi < pc.path.length - 1) { pc.pi++; q = pc.path[pc.pi]; } if (q) { tx = q[0]; tz = q[1]; } }
    }
    if (!car && d < 6) { pc.v *= Math.max(0, 1 - 4 * dt); }   // 你下車了：巡邏車停在旁邊
    else {
      const want = Math.atan2(-(tx - pc.x), -(tz - pc.z)); let da = Math.atan2(Math.sin(want - pc.yaw), Math.cos(want - pc.yaw));
      if (pc.rev > 0) { pc.rev -= dt; pc.v = Math.max(-5, pc.v - 12 * dt); da = -da; }
      else { const slow = Math.abs(da) > 1.2 ? 0.45 : 1; pc.v += ((maxV * slow) - pc.v > 0 ? 10 : -14) * dt; pc.v = Math.min(maxV, pc.v); }
      pc.yaw += Math.max(-1, Math.min(1, da * 2)) * 2.6 * dt * Math.max(0.3, Math.min(1, Math.abs(pc.v) / 4));
    }
    const fx = -Math.sin(pc.yaw), fz = -Math.cos(pc.yaw), ox = pc.x, oz = pc.z; pc.x += fx * pc.v * dt; pc.z += fz * pc.v * dt;
    let bump = 0; [1.1, -1.1].forEach(k => { const o = { x: pc.x + fx * k, z: pc.z + fz * k }, x0 = o.x, z0 = o.z; R.collide(o, 1.05); if (o.x !== x0 || o.z !== z0) { pc.x += o.x - x0; pc.z += o.z - z0; bump = Math.max(bump, Math.hypot(o.x - x0, o.z - z0)); } });
    const moved = Math.hypot(pc.x - ox, pc.z - oz); pc.stuck = moved < Math.abs(pc.v) * dt * 0.3 && Math.abs(pc.v) > 1 ? pc.stuck + dt : Math.max(0, pc.stuck - dt);
    if (pc.stuck > 0.8) { pc.stuck = 0; pc.rev = 0.7; pc.path = null; }
    // 撞你的車
    if (car) { const dd = Math.hypot(car.x - pc.x, car.z - pc.z); if (dd < 2.8 && dd > 0.01) { const k = (2.8 - dd) / 2, ux = (car.x - pc.x) / dd, uz = (car.z - pc.z) / dd; car.x += ux * k; car.z += uz * k; pc.x -= ux * k; pc.z -= uz * k; if (Math.abs(pc.v) > 4) { car.v *= 0.6; pc.v *= 0.4; R.sfx && R.sfx('mine'); } } }
    // 和別台巡邏車
    PU.cars.forEach(o => { if (o === pc) return; const dd = Math.hypot(o.x - pc.x, o.z - pc.z); if (dd < 2.6 && dd > 0.01) { const k = (2.6 - dd) / 2; pc.x -= (o.x - pc.x) / dd * k; pc.z -= (o.z - pc.z) / dd * k; } });
    pc.g.position.set(pc.x, 0, pc.z); pc.g.rotation.y = pc.yaw;
    const L = pc.g.userData.lights, on = Math.floor(performance.now() / 180) % 2; if (L) { L[0].material.emissiveIntensity = on ? 1.4 : 0.2; L[1].material.emissiveIntensity = on ? 0.2 : 1.4; }
    return { d, see };
  };
  const removeCar = pc => { if (pc.g.parent) pc.g.parent.remove(pc.g); PU.cars = PU.cars.filter(o => o !== pc); };

  // ---------- 路障 ----------
  const placeBlock = () => {
    const t = tw(), car = V().cur, Pl = P(); if (!t || !car || !R.NAV) return;
    const fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw), nodes = R.NAV.nodes, adj = R.NAV.adj;
    let pickI = -1; for (let k = 0; k < 120; k++) { const i = Math.floor(rnd() * nodes.length), x = toW(nodes[i][0]), z = toW(nodes[i][1]), d = Math.hypot(x - Pl.x, z - Pl.z); if (d < 35 || d > 65) continue; if (((x - Pl.x) * fx + (z - Pl.z) * fz) / d < 0.7) continue; if (!adj[i] || !adj[i].length) continue; if (PU.blocks.some(b => Math.hypot(b.x - x, b.z - z) < 30)) continue; if (C.RAIL && Math.abs(nodes[i][1] - C.RAIL.y) < 22) continue; pickI = i; break; }
    if (pickI < 0) return;
    const [sx, sy] = nodes[pickI], nb = nodes[adj[pickI][0]], x = toW(sx), z = toW(sy), ra = Math.atan2(toW(nb[0]) - x, toW(nb[1]) - z), px = Math.cos(ra), pz = -Math.sin(ra);   // 路的方向 ra，柵欄沿著垂直方向 (px, pz)
    const g = new THREE.Group(), v = V(), boxes = [], guards = [];
    // 兩台巡邏車（斜停）＋中間的柵欄，旁邊留一條縫
    [-3.2, 1.0].forEach((o, k) => { const m = policeMesh(); m.position.set(x + px * o, 0, z + pz * o); m.rotation.y = ra + Math.PI / 2 + (k ? 0.25 : -0.25); g.add(m); boxes.push(R.addBox(x + px * o - 1.6, x + px * o + 1.6, z + pz * o - 1.6, z + pz * o + 1.6, 'veh')); });
    for (let i = 0; i < 3; i++) { const o = 3.6 + i * 1.0, b = v.box(g, 0.9, 0.7, 0.2, v.lam(i % 2 ? '#F2F2F2' : '#D82A2A'), x + px * o, 0.6, z + pz * o); b.rotation.y = ra + Math.PI / 2; [-0.35, 0.35].forEach(l => v.box(g, 0.08, 0.6, 0.08, v.lam('#2A2A30'), x + px * o + Math.sin(ra + Math.PI / 2) * l, 0.3, z + pz * o + Math.cos(ra + Math.PI / 2) * l)); }
    boxes.push(R.addBox(Math.min(x + px * 3.1, x + px * 6.1) - 0.3, Math.max(x + px * 3.1, x + px * 6.1) + 0.3, Math.min(z + pz * 3.1, z + pz * 6.1) - 0.3, Math.max(z + pz * 3.1, z + pz * 6.1) + 0.3, 'veh'));
    t.group.add(g);
    [[-1.5, 1.6], [2.4, 1.6]].forEach(([o, back]) => { const gx = x + px * o - Math.sin(ra) * back, gz = z + pz * o - Math.cos(ra) * back, h = R.makeHero('knight', 'spear', { pool: 'pu_guard', lite: 1, top: '#3E4A5A', hair: '#2A2420', cloak: '#2E3A48', shield: true, weapon: 'spear' }); h.g.position.set(gx, 0, gz); h.g.rotation.y = ra + Math.PI; t.group.add(h.g); guards.push({ h, x: gx, z: gz }); });
    PU.blocks.push({ g, x, z, boxes, guards });
    R.toast('前面有路障！', '#E8323A');
  };
  const removeBlock = b => { if (b.g.parent) b.g.parent.remove(b.g); b.boxes.forEach(x => { x.on = false; }); b.guards.forEach(gd => gd.h.g.parent && gd.h.g.parent.remove(gd.h.g)); PU.blocks = PU.blocks.filter(o => o !== b); };

  // ---------- 鳴笛 ----------
  const siren = d => {
    const A = R.AUDIO, ac = A && A.ctx; if (!ac || (R.isMuted && R.isMuted()) || ac.state !== 'running') return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), v = Math.min(0.08, 2.2 / Math.max(6, d)) * ((A.VOL && A.VOL.sfx) || 0.8);
    o.type = 'square'; o.frequency.setValueAtTime(760, t); o.frequency.setValueAtTime(980, t + 0.3); g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + 0.55); g.gain.linearRampToValueAtTime(0, t + 0.6);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200; o.connect(f); f.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.62);
  };

  // ---------- 每一格 ----------
  const bust = why => {
    PU.bustT = 0; if (R.dismountVehicle) R.dismountVehicle();
    PU.cars.slice().forEach(removeCar); PU.blocks.slice().forEach(removeBlock);
    R.banner('被逮捕了', why);
    if (R.crimeArrest) R.crimeArrest(null);
  };
  const step = dt => {
    const t = tw(), Pl = P(), Cr = R.crime; if (!t || !Pl || !Cr) return;
    PU.msgT -= dt;
    const car = R.inVehicle && R.inVehicle(), driving = car && car.type === 'car', heat = Cr.heat || 0;
    if (heat > 0 && driving) {
      PU.spawnT -= dt; if (PU.spawnT <= 0) { PU.spawnT = 9; if (PU.cars.length < Math.min(3, heat)) spawnCar(); }
      if (heat >= 2) { PU.blockT -= dt; if (PU.blockT <= 0) { PU.blockT = 14; if (PU.blocks.length < 2) placeBlock(); } }
    }
    let spotted = false, close = false, nearest = 1e9;
    PU.cars.slice().forEach(pc => {
      if (heat <= 0) { pc.leaveT = (pc.leaveT || 0) + dt; pc.v *= Math.max(0, 1 - dt); pc.g.position.set(pc.x, 0, pc.z); if (pc.leaveT > 6 || Math.hypot(pc.x - Pl.x, pc.z - Pl.z) > 70) removeCar(pc); return; }
      const r = driveCar(pc, dt); nearest = Math.min(nearest, r.d);
      if (r.d < 40 && sees(pc, Pl)) spotted = true;
      if (r.d < (car ? 3.4 : 2.4)) close = true;
      if (r.d > 140) removeCar(pc);
    });
    PU.blocks.slice().forEach(b => {
      const d = Math.hypot(b.x - Pl.x, b.z - Pl.z); if (heat <= 0 || d > 95) { removeBlock(b); return; }
      if (d < 30) spotted = true; if (d < 7) close = true;
      b.guards.forEach(gd => { gd.h.g.rotation.y = Math.atan2(Pl.x - gd.x, Pl.z - gd.z); R.animHero(gd.h, 0, dt, false); });
    });
    if (spotted && heat > 0) Cr.lostT = 0;
    // 逮捕：被圍住又停下來
    const slow = car ? Math.abs(car.v || 0) < 2 : true;
    if (heat > 0 && close && slow) { PU.bustT += dt; if (PU.bustT > (car ? 1.5 : 0.6)) bust(car ? '被巡邏車逼停了。' : '衛兵從巡邏車上跳下來，把你按在雪地上。'); }
    else PU.bustT = Math.max(0, PU.bustT - dt);
    if (PU.cars.length && heat > 0) { PU.sirenT -= dt; if (PU.sirenT <= 0) { PU.sirenT = 0.62; siren(nearest); } }
    // 上面的提示
    let el = document.getElementById('pu-hud');
    if (!el) { el = document.createElement('div'); el.id = 'pu-hud'; el.className = 'hud se-hud'; const run = document.getElementById('run'); if (run) run.appendChild(el); }
    const show = heat > 0 && (PU.cars.length || PU.blocks.length);
    el.hidden = !show; if (show) { const h = '<b>' + '★'.repeat(heat) + ' 被追捕中</b><span>巡邏車 ' + PU.cars.length + (PU.blocks.length ? '・路障 ' + PU.blocks.length : '') + (PU.bustT > 0.2 ? '・<b style="color:#FF6A5A">快被逼停了！</b>' : '') + '</span><small>甩開巡邏車的視線，星星才會退</small>'; if (el.innerHTML !== h) el.innerHTML = h; }
  };
  const step0 = R.townStep;
  R.townStep = dt => { step0(dt); if (W.inside || (R.sheetOpen && R.sheetOpen())) return; try { step(dt); } catch (e) { console.warn('[pursuit]', e); } };
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => { PU.cars = []; PU.blocks = []; PU.bustT = 0; PU.spawnT = 4; PU.blockT = 8; enter0(from, at); };
  R.pursuitDebug = { PU, spawnCar, placeBlock, step };
})(window.R);
