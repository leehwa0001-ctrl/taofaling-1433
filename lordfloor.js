// 領主體的樓層（2026-10-04 作者：克森特級裡領主級太常出現，應該每 3～5 層出現一隻；也許可以參考第 20 章的內容——場地的部分）
// - 有領主體的遺跡（克森特級、卡索級）：每 3～5 層才有一隻（原本 dungeon.js 單數層一間、lords.js 每層再加一到兩間）。
// - 照《第 20 章》：領主體守在通往樓層通道的路上；牠倒下之前，樓層通道被牠的力量封著。
//   打倒以後，那一區照舊放金寶箱；記下當前深度，該深度以淺的存檔點（含這一層）全部可用——中間忘了按碑也不會卡。
// - 領主區佈置成城堡的大廳：兩側一排柱子（可以躲在後面）、地上的金色邊線、中間的舞池、頭上的水晶吊燈。
// - 新的領主體「棘背狼」（第 20 章的黑色巨狼）：背上、肚子都是刺——近戰打牠會被刺傷；毛又硬又尖，細碎的攻擊（比你平常一下弱很多的）只剩四成；
//   怕火（火屬性 ×2，燒起來以後受到的傷害 +30%）；會預判，看到投射物飛過來會往旁邊一跳；越打越兇（每 12 秒移動、傷害 +8%，最多 +60%）；
//   吼一聲背上的刺變長、往四周射出去。
// 放在 lords.js、lordplus.js、savepoint.js、stairguard.js、run.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, rnd = Math.random, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  // ---------- 哪幾層有領主體 ----------
  const lordFloors = run => {
    if (run.lordFloors) return run.lordFloors;
    const L = []; let k = 3 + Math.floor(rnd() * 3); while (k < (run.floors || 0) - 1) { L.push(k); k += 3 + Math.floor(rnd() * 3); }
    return (run.lordFloors = L);
  };
  R.lordFloorsOf = lordFloors;
  const mainPath = F => {
    const rooms = F.rooms, end = rooms.find(r => r.type === 'stairs' || r.type === 'boss' || r.type === 'deep'); if (!end) return [];
    const prev = rooms.map(() => -1), seen = rooms.map(() => false), q = [0]; seen[0] = true;
    while (q.length) { const i = q.shift(); Object.values(rooms[i].links || {}).forEach(j => { if (!seen[j]) { seen[j] = true; prev[j] = i; q.push(j); } }); }
    const path = []; for (let i = end.i; i >= 0; i = prev[i]) { path.unshift(i); if (i === 0) break; }
    return path;
  };
  const gf = R.genFloor;
  R.genFloor = (run, f) => {
    const g = run.grade; if (!g || !g.lords) return gf(run, f);
    const want = lordFloors(run).includes(f), keep = g.lords;
    if (!want) g.lords = null;   // 這一層沒有領主：dungeon.js、lords.js 都不會放
    let F; try { F = gf(run, f); } finally { if (!want) g.lords = keep; }
    if (!g.lords.includes('spikewolf')) g.lords.push('spikewolf', 'spikewolf');   // lords.js 每層會重排 g.lords
    if (!want || F.last) { F.rooms.forEach(r => { if (r.type === 'lord') r.type = 'fight'; }); return F; }
    // 只留一間：通往樓層通道的路上、越靠近終點越好（守門）
    // 大空洞打通的房間（zones.js 的 r.zone）不行：那幾間算清空過，走進去領主體不會出現，樓層通道就一直封著（2026-10-04 作者：領主房間跟大空洞混在一起時，領主直接沒出現）
    const path = mainPath(F), onPath = path.slice(1, -1).reverse().map(i => F.rooms[i]).filter(r => (r.type === 'fight' || r.type === 'lord') && !r.zone);
    const pickR = onPath.find(r => r.type === 'lord') || onPath.find(r => r.big) || onPath[0] || F.rooms.find(r => r.type === 'lord' && !r.zone) || F.rooms.find(r => r.type === 'fight' && !r.zone && r.i > 0);
    F.rooms.forEach(r => { if (r.type === 'lord' && r !== pickR) r.type = 'fight'; });
    if (pickR) { pickR.type = 'lord'; F.lordGate = { room: pickR.i, down: false }; }
    else { const L = lordFloors(run); if (f + 1 < (run.floors || 0) - 1 && !L.includes(f + 1)) { L.push(f + 1); L.sort((a, b) => a - b); } }   // 這一層放不下：挪到下一層
    return F;
  };
  // ---------- 守門：牠倒下之前樓層通道封著 ----------
  const de0 = R.descend;
  R.descend = () => { const F = W().F; if (F && F.lordGate && !F.lordGate.down && F.stairs) { R.toast('這一層的領主體還在。牠倒下之前，樓層通道被牠的力量封著。', '#FF9A6A'); return; } return de0(); };
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => { const it = ni0(), F = W().F; if (it && F && F.lordGate && !F.lordGate.down && F.stairs && it.act === R.descend) return Object.assign({}, it, { label: '樓層通道被領主體的力量封著' }); return it; };
  const bd0 = R.onBossDown;
  R.onBossDown = e => {
    const r = bd0 ? bd0(e) : undefined, w = W(), F = w.F, run = w.run;
    try {
      if (F && F.lordGate && !F.lordGate.down && e && /^領主體/.test(e.def.name || '')) {
        F.lordGate.down = true;
        // 記下當前深度：這一層 + 以淺的存檔點全部可用（savepoint.js 的 R.unlockSaveDepth）
        const id = run.site.id, n = run.f0 ? run.floor : run.floor + 1;
        const added = R.unlockSaveDepth ? R.unlockSaveDepth(id, n, run) : [];
        const shallow = (S().waypointList && S().waypointList[id] || []).filter(x => x <= n);
        setTimeout(() => {
          if (W().F !== F) return;
          const extra = shallow.filter(x => x !== n);
          R.banner && R.banner('通往下一層的路打開了', extra.length
            ? ('第 ' + n + ' 層記成存檔點；第 ' + extra.join('、') + ' 層的存檔點也一併可用')
            : ('這一層記成了存檔點（第 ' + n + ' 層）'));
        }, 2600);
      }
    } catch (err) { console.warn('[lordfloor]', err); }
    return r;
  };
  // ---------- 城堡的大廳 ----------
  const hall = (F, r) => {
    const T = THREE, t = F.tile, g = new T.Group(), gold = new T.MeshLambertMaterial({ color: '#C8A040', emissive: '#6A4A10', emissiveIntensity: 0.5 }), white = new T.MeshLambertMaterial({ color: '#E8E4DA' });
    const floorAt = (x, z) => { const tx = t.tX(x), tz = t.tZ(z); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const k = t.id(tx + dx, tz + dz); if (t.T[k] !== 1 || t.RM[k] !== r.i) return false; } return true; };
    const doors = (r.doors || []).map(k => { const tx = k % t.nx, tz = (k - tx) / t.nx; return [t.cX(tx), t.cZ(tz)]; }), nearDoor = (x, z) => doors.some(([a, b]) => Math.hypot(a - x, b - z) < 3.2);
    // 一圈柱子（白色、金色的線）：沿著房間的橢圓排（第 20 章：圓形的客廳、兩側數十根柱子）
    const hx = Math.max(3, (r.hx || 6) - 2.6), hz = Math.max(3, (r.hz || 5) - 2.4), N = Math.max(6, Math.min(12, Math.round((hx + hz) * 0.55)));   // 柱子少一點、拉開（原本最多 16 根，窄的那兩邊擠在一起，斜斜看下來一根疊一根）
    // 2026-10-04 作者回報：柱子疊在一起——外圈放不夠的時候，原本外圈的柱子留著、再加一圈內圈（小的大廳兩圈只差半公尺，柱子一公尺粗），
    //   也沒看那裡是不是已經有別的東西；一圈最多 16 根，窄的兩邊擠在一起。現在：每根柱子要那一塊是空的、離別根柱子 2.4 公尺以上，一圈 6～12 根；外圈放不夠，就看外圈、內圈哪一圈放得多，只放那一圈。
    const clear = (x, z) => ![...R.boxesNear(x, z)].some(c => x + 0.6 > c.x0 && x - 0.6 < c.x1 && z + 0.6 > c.z0 && z - 0.6 < c.z1);
    const plan = k => { const ring = []; for (let i = 0; i < N; i++) { const a = (i + 0.5) / N * Math.PI * 2, x = r.x + Math.sin(a) * hx * k, z = r.z + Math.cos(a) * hz * k; if (floorAt(x, z) && !nearDoor(x, z) && clear(x, z) && !ring.some(o => Math.hypot(o.x - x, o.z - z) < 2.4)) ring.push({ x, z }); } return ring; };
    const outer = plan(0.78), cols = outer.length >= N * 0.5 ? outer : [outer, plan(0.62)].sort((p1, p2) => p2.length - p1.length)[0];
    // 2026-10-08 領主長廊（lordwing.js）的大廳：柱子沿著長邊排兩排，每 4.5 公尺一根（第 20 章：兩側數十根柱子）
    if (r.wingHall) { cols.length = 0; const along = r.hx >= r.hz, Lh = (along ? r.hx : r.hz) - 4, Wd = (along ? r.hz : r.hx) * 0.62; for (let u = -Lh; u <= Lh + 0.01; u += 4.5) [-1, 1].forEach(sd => { const x = r.x + (along ? u : sd * Wd), z = r.z + (along ? sd * Wd : u); if (floorAt(x, z) && !nearDoor(x, z) && clear(x, z)) cols.push({ x, z }); }); }   // 外圈放不夠（房間的形狀不規則）就看內圈，放得比較多的那一圈（只放一圈）
    cols.forEach(({ x, z }) => {
      const p = new T.Mesh(new T.CylinderGeometry(0.42, 0.5, 4.2, 10), white); p.position.set(x, 2.1, z); p.castShadow = true; g.add(p);
      [0.25, 2.1, 3.95].forEach(y => { const b = new T.Mesh(new T.CylinderGeometry(0.54, 0.54, 0.16, 10), gold); b.position.set(x, y, z); g.add(b); });
      R.addBox(x - 0.48, x + 0.48, z - 0.48, z + 0.48, 'deco');
    });
    // 中間的舞池：淺色的圓、金色的邊
    const mid = floorAt(r.x, r.z);   // 環形的房間中間是深淵（看得到底下的井）：不放舞池和吊燈的光
    const rr = Math.max(2.5, Math.min(hx, hz) - 1.2), disc = new T.Mesh(new T.CircleGeometry(rr, 36), new T.MeshLambertMaterial({ color: '#D8D2C4' })); disc.rotation.x = -Math.PI / 2; disc.position.set(r.x, 0.025, r.z); disc.receiveShadow = true; if (mid) g.add(disc);
    const ring = new T.Mesh(new T.RingGeometry(rr, rr + 0.18, 48), new T.MeshBasicMaterial({ color: '#E8C060' })); ring.rotation.x = -Math.PI / 2; ring.position.set(r.x, 0.035, r.z); if (mid) g.add(ring);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, ln = new T.Mesh(new T.BoxGeometry(0.08, 0.01, rr * 0.9), new T.MeshBasicMaterial({ color: '#C8A040' })); ln.position.set(r.x + Math.sin(a) * rr * 0.45, 0.04, r.z + Math.cos(a) * rr * 0.45); ln.rotation.y = a; if (mid) g.add(ln); }   // 植物般的金線紋理
    // 水晶吊燈
    const ch = new T.Group(), cry = new T.MeshLambertMaterial({ color: '#DDF2FF', emissive: '#9AD8FF', emissiveIntensity: 0.9, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, c = new T.Mesh(new T.OctahedronGeometry(0.22, 0), cry); c.position.set(Math.sin(a) * 1.3, -0.3 - (i % 2) * 0.3, Math.cos(a) * 1.3); ch.add(c); }
    const hub = new T.Mesh(new T.ConeGeometry(0.6, 1, 8), gold); hub.rotation.x = Math.PI; ch.add(hub); const rim = new T.Mesh(new T.TorusGeometry(1.3, 0.06, 6, 24), gold); rim.rotation.x = Math.PI / 2; ch.add(rim);
    ch.position.set(r.x, 6.2, r.z); g.add(ch); F.lights && F.lights.push({ x: r.x, y: 5, z: r.z, col: '#CFE8FF', I: 1.6, flick: 0 });
    if (r.wingHall) { const along = r.hx >= r.hz, off = (along ? r.hx : r.hz) * 0.55; [-1, 1].forEach(sd => { const c2 = ch.clone(), x = r.x + (along ? sd * off : 0), z = r.z + (along ? 0 : sd * off); c2.position.set(x, 6.2, z); g.add(c2); F.lights && F.lights.push({ x, y: 5, z, col: '#CFE8FF', I: 1.3, flick: 0 }); }); }   // 長廊的大廳：多兩盞吊燈
    F.group.add(g); F.hall = { g, ch };
  };
  const bf0 = R.buildFloor;
  R.buildFloor = (scene, run, F) => { const out = bf0(scene, run, F); try { F.rooms.filter(r => r.type === 'lord').forEach(r => hall(F, r)); } catch (e) { console.warn('[lordfloor]', e); } return out; };
  // ---------- 新的領主體：棘背狼 ----------
  R.ENEMIES.spikewolf = { name: '領主體・棘背狼', ref: '', boss: 1, hp: 1600, dmg: 32, speed: 4.6, size: 2.3, xp: 130, ai: 'l_spikewolf', armor: 0.3, mres: 0.25, color: '#1A1A20', eye: '#FF3A3A', lordPlus: 1,
    desc: '克森特級遺跡裡的領主體。三公尺長的黑色巨狼，背上、肚子都長滿尖刺，毛又硬又尖——拳頭、細碎的攻擊幾乎打不穿，近戰打牠會被刺傷。會預判飛過來的東西往旁邊跳開，越打越兇。怕火：燒焦的地方露出底下的血肉。' };
  if (R.BEAST_ART) {
    const G = (w, h) => { const g = Array.from({ length: h }, () => Array(w).fill('.')); const o = { p(x, y, c) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c; }, rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) o.p(x + i, y + j, c); }, line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) o.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); }, ell(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.05) o.p(x, y, c); }, rows: () => g.map(r => r.join('')) }; return o; };
    const draw = (g, fr) => {
      g.ell(15, 15, 10, 4.5, 'b'); g.ell(14, 14, 9, 3.5, 'a'); g.ell(26, 12, 4.5, 3.5, 'a'); g.line(29, 13, 33, 14, 'a'); g.line(29, 15, 33, 15, 'b'); g.p(27, 11, 'e'); g.p(28, 11, 'e'); for (let x = 30; x <= 33; x++) g.p(x, 16, 'w');
      g.line(24, 9, 23, 6, 'a'); g.line(27, 9, 27, 6, 'a');
      for (let x = 7; x <= 24; x += 2) { const hgt = 3 + ((x * 7) % 3); g.line(x, 11, x - 1, 11 - hgt - (fr ? 1 : 0), 's'); g.p(x - 1, 11 - hgt - (fr ? 1 : 0), 'S'); }   // 背上的刺
      for (let x = 9; x <= 21; x += 3) g.p(x, 19, 's');   // 肚子的刺
      g.line(5, 14, fr ? 0 : 1, fr ? 10 : 12, 'b'); g.p(fr ? 0 : 1, fr ? 9 : 11, 's');
      (fr ? [8, 12, 18, 22] : [9, 11, 19, 21]).forEach(x => { g.rect(x, 18, 2, 4, 'b'); g.p(x, 22, 'k'); g.p(x + 1, 22, 'k'); });
    };
    const fr = [0, 1].map(f => { const g = G(35, 23); draw(g, f); return g.rows(); });
    R.BEAST_ART.spikewolf = { pal: { a: '#2A2A32', b: '#16161C', s: '#8A8A96', S: '#E8E8F0', e: '#FF3A3A', w: '#F0E8E0', k: '#0A0A0E' }, a: fr[0], b: fr[1] };
  }
  if (R.LORD_GEAR) R.LORD_GEAR.spikewolf = ['棘背狼皮甲', 'body_medium', { def: 5, critMult: 0.2 }, '物防 +5、暴擊傷害 +20%'];
  const AI = R.AI_X = R.AI_X || {};
  const targets = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed), R.netTargets ? R.netTargets() : []).filter(t => t && !t.dead); };   // 多人連線：房主這邊也算別人（net2.js）
  const hitT = (t, dmg, e, o) => (t.ally ? R.hurtAlly(t, dmg, e, o) : R.hurtPlayer(dmg, e, o));
  AI.l_spikewolf = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; e.rageT = (e.rageT || 0) + dt;
    if (e.rageT > 12) { e.rageT = 0; e.fero = Math.min(1.6, (e.fero || 1) + 0.08); e.speed = (e.def.speed || 4.6) * e.fero * (e.lpRage ? 1.2 : 1); R.num && R.num(e.x, 3, e.z, '越來越兇', 'hurt'); }
    const fk = e.fero || 1;
    if (e.leap) { const s = e.leap; s.t += dt; const k = Math.min(1, s.t / 0.55); e.x = s.x0 + (s.x1 - s.x0) * k; e.z = s.z0 + (s.z1 - s.z0) * k; e.m.g.position.y = Math.sin(k * Math.PI) * 2.2; if (k >= 1) { e.leap = null; e.m.g.position.y = 0; R.fx('boom', e.x, 0.3, e.z, { r: 2.4, color: '#3A3A44' }); R.shake && R.shake(0.35); targets().forEach(t => { if (Math.hypot(t.x - e.x, t.z - e.z) < 2.4) hitT(t, e.dmg * 1.5 * fk, e, { knock: 0.6 }); }); } return true; }
    if (e.busy > 0) { e.busy -= dt; return false; }
    let mv = false; if (walk && sp > 0 && d > 2.8) { H.move(e, a, sp, dt); mv = true; }
    e.bite = (e.bite || 0) - dt; if (d < 2.9 && e.bite <= 0) { e.bite = 1.1 / fk; hitT(P, e.dmg * fk, e, { knock: 0.4 }); R.fx('swing', e.x, 0, e.z, { a, arc: 1.7, range: 2.9, color: '#E8E0CC' }); }
    e.pat = (e.pat == null ? 2.2 : e.pat) - dt;
    if (e.pat <= 0) {
      e.pat = (3.2 - (1 - e.hp / e.hpMax) * 1.2) / fk + rnd() * 0.6; const k = Math.floor(rnd() * 4);
      if (k === 0) { R.fx('mark', P.x, 0, P.z, { r: 2.4, t: 0.7 }); e.busy = 0.75; const x1 = P.x, z1 = P.z; later(() => { if (!e.dead) e.leap = { t: 0, x0: e.x, z0: e.z, x1, z1 }; }, 700); }   // 飛撲
      else if (k === 1) { e.busy = 1.2; [0, 450].forEach((ms, i) => later(() => { if (e.dead) return; const Pl = W().P, aa = Math.atan2(Pl.x - e.x, Pl.z - e.z); R.fx('sector', e.x, 0, e.z, { a: aa, arc: 2, range: 4, t: 0.3 }); later(() => { if (e.dead) return; R.fx('swing', e.x, 0, e.z, { a: aa, arc: 2, range: 4, color: '#E8E0CC' }); targets().forEach(t => { const dd = Math.hypot(t.x - e.x, t.z - e.z), a2 = Math.atan2(t.x - e.x, t.z - e.z); if (dd < 4.2 && Math.abs(wrap(a2 - aa)) < 1.1) hitT(t, e.dmg * 1.1 * fk, e); }); }, 300); }, ms)); }   // 兩下爪擊
      else if (k === 2) { e.busy = 0.9; R.fx('mark', e.x, 0, e.z, { r: 4.2, t: 0.6 }); later(() => { if (e.dead) return; R.fx('ring', e.x, 0.1, e.z, { r: 4.2, color: '#8A8A96' }); targets().forEach(t => { if (Math.hypot(t.x - e.x, t.z - e.z) < 4.2) hitT(t, e.dmg * 1.2 * fk, e, { knock: 0.9 }); }); }, 600); }   // 甩尾
      else { e.busy = 1; e.howl = 6; R.banner && R.banner('棘背狼吼了一聲', '背上的刺變長了——近戰會被刺得更深'); later(() => { if (e.dead) return; for (let i = 0; i < 14; i++) R.fire({ kind: 'arrow', owner: 'e', x: e.x, z: e.z, a: i / 14 * Math.PI * 2 + rnd() * 0.2, speed: 11, dmg: e.dmg * 0.7 * fk, life: 1.4, src: e }); }, 500); }   // 吼：刺變長、往四周射
    }
    if (e.howl > 0) e.howl -= dt;
    // 預判：投射物飛過來就往旁邊跳開
    e.dodgeCd = (e.dodgeCd || 0) - dt;
    if (e.dodgeCd <= 0 && !e.leap) {
      const s = (W().shots || []).find(s => s.owner === 'p' && !s.dead && Math.hypot(s.x - e.x, s.z - e.z) < 5.5 && ((e.x - s.x) * (s.vx || 0) + (e.z - s.z) * (s.vz || 0)) > 0);
      if (s && rnd() < 0.45) { e.dodgeCd = 2.6; const side = rnd() < 0.5 ? 1 : -1, sa = Math.atan2(s.vx || 0, s.vz || 0) + side * Math.PI / 2, [x, z] = R.nearestFloor ? R.nearestFloor(e.x + Math.sin(sa) * 3, e.z + Math.cos(sa) * 3) : [e.x + Math.sin(sa) * 3, e.z + Math.cos(sa) * 3]; R.fx('poof', e.x, 0.5, e.z, { color: '#3A3A44', n: 8 }); e.x = x; e.z = z; e.m.g.position.set(x, 0, z); }
      else if (s) e.dodgeCd = 0.6;
    }
    return mv;
  };
  // 刺、毛、怕火
  let thornCd = 0;
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    if (!e || e.id !== 'spikewolf' || e.dead) return he0(e, raw, o);
    o = o || {}; const P = W().P, hit = R.playerHitEstimate ? R.playerHitEstimate() : 0;
    let k = 1;
    if (hit && raw * (P ? P.dmgMult || 1 : 1) < hit * 0.6 && o.elem !== 'fire') k *= 0.4;   // 細碎的攻擊被毛擋掉
    if (o.elem === 'fire' || o.burn) k *= 2; if (e.st && e.st.burn > 0) k *= 1.3;
    const r = he0(e, raw * k, o);
    if (P && o.primary && P.ws && (P.ws.kind === 'melee' || P.ws.kind === 'thrust') && Math.hypot(P.x - e.x, P.z - e.z) < (e.BR || 1.5) + 2.5 && thornCd <= 0) { thornCd = 0.5; R.hurtPlayer(e.dmg * (e.howl > 0 ? 0.5 : 0.25), e); R.num && R.num(P.x, 2.8, P.z, '被刺到了', 'hurt'); }
    return r;
  };
  const st0 = R.step;
  R.step = dt => { st0(dt); if (thornCd > 0) thornCd -= dt; };
})(window.R);
