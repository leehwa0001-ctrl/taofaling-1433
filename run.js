// 討伐令 1433：下一趟遺跡（進場、樓層、房間、寶箱、掘礦、回歸水晶、倒下）與主迴圈、操作
(function (R) {
  const T = () => THREE;
  const $ = id => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const W = R.W = { enemies: [], shots: [], drops: [], zones: [], fxs: [], dyn: [], nums: [] };
  R.BAG_MAX = 16;

  // ---------- 3D 環境（只建一次） ----------
  R.initGL = () => {
    if (W.renderer) return;
    const TH = T();
    W.renderer = new TH.WebGLRenderer({ canvas: $('gl'), antialias: !R.touch, powerPreference: 'high-performance' });
    W.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, R.touch ? 1.3 : 1.75));
    W.renderer.shadowMap.enabled = true; W.renderer.shadowMap.type = TH.PCFSoftShadowMap;
    W.renderer.outputEncoding = TH.sRGBEncoding;
    W.camera = new TH.PerspectiveCamera(44, 1, 0.1, 200);
    W.clock = new TH.Clock();
    W.ray = new TH.Raycaster(); W.plane = new TH.Plane(new TH.Vector3(0, 1, 0), -1);
    const z0 = (R.S && R.S.opts && R.S.opts.zoom) || 1;
    W.cam = { yaw: 0, yawT: 0, zoom: z0, zoomT: z0 };
    // 分頁在背景時視窗大小是 0：先跳過，等看得到了再補設定
    let lastW = 0, lastH = 0;
    const resize = () => { const w = window.innerWidth, h = window.innerHeight; if (!w || !h) return; lastW = w; lastH = h; W.renderer.setSize(w, h, false); W.camera.aspect = w / h; W.camera.updateProjectionMatrix(); };
    window.addEventListener('resize', resize); resize();
    R.bindInput();
    const loop = () => { requestAnimationFrame(loop); if (window.innerWidth !== lastW || window.innerHeight !== lastH) resize(); const dt = Math.min(0.05, W.clock.getDelta()); if (!W.paused) { if (W.run) R.step(dt); else if (W.town) R.townStep(dt); } if (W.scene && (W.run || W.town) && !$('run').hidden) R.renderFrame(lastW, lastH); };
    loop();
  };

  // ---------- 開始一趟 ----------
  R.startRun = siteId => {
    if (R.leaveTown) R.leaveTown();
    const site = R.SITES.find(s => s.id === siteId), grade = R.gradeById(site.grade), cls = R.S.cls;
    const type = site.type || 'city';
    const floors = R.floorsFor ? R.floorsFor(site) : Math.max(2, grade.floors + (R.TYPES[type] ? R.TYPES[type].floors : 0));   // depth.js：每座遺跡的層數
    const reactions = Object.keys(R.REACTIONS).filter(k => !(grade.crystal === 'none' && k === 'tail'));
    W.run = { site, grade, type, env: site.env || (grade.env ? ['volcano', 'desert', 'deep'][Math.floor(Math.random() * 3)] : null), floors, floor: 0, bag: [], mats: {}, gold: 0, kills: 0, aware: 0, reaction: reactions[Math.floor(Math.random() * reactions.length)], reactionKnown: false, reactCount: 0, done: false, t: 0, startLv: R.S.classes[cls].lv };
    R.S.stats.runs = (R.S.stats.runs || 0) + 1; R.save();
    W.run.killIds = {};
    { const E = R.eventsToday ? R.eventsToday() : {}, dd = R.today ? R.today() : null; W.run.tide = (E.manaTide ? 1.15 : 1) * (site.id === 'dh-josai' && dd && dd.abs >= R.absOf(2836, 10, 18) && dd.abs <= R.absOf(2836, 10, 22) ? 1.12 : 1); }
    if (R.syncStoryLv) R.syncStoryLv();
    R.startParty(W.run); W.allies = [];
    R.initGL();
    R.showScreen('run');
    document.getElementById('r-modal').hidden = true; W.paused = false; R.input.keys = {}; R.input.fire = false;
    R.loadFloor(0, { fresh: true });
  };
  R.loadFloor = (f, o) => {
    o = o || {};
    if (!o.fresh) R.stashAllies();
    const TH = T(), run = W.run;
    run.floor = f; run.aware = Math.max(0, run.aware * 0.4); run.t = 0;
    // 換新的場景（上一層掉在地上的東西、打破的東西都留在上面了）；上一層用不到的東西丟掉
    if (W.scene && R.disposeScene) R.disposeScene(W.scene, [W.P && W.P.h && W.P.h.g]);
    W.scene = R.markScene(new TH.Scene());
    const th = R.theme(run);
    W.scene.background = new TH.Color(th.fog); W.scene.fog = new TH.FogExp2(th.fog, 0.026);
    W.scene.add(new TH.HemisphereLight('#B8C4E0', '#2A2230', 0.42));
    const moon = new TH.DirectionalLight(th.light, 0.55); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
    const sc = moon.shadow.camera; sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 80; moon.shadow.bias = -0.001;
    W.scene.add(moon); W.scene.add(moon.target); W.moon = moon;
    W.torch = new TH.PointLight('#FFC88A', 1.3, 17, 1.4); W.scene.add(W.torch);
    // 光源池：牆上的火把、營火、蠟燭，離你最近的幾支真的發光
    W.pool = []; for (let i = 0; i < (R.touch ? 3 : 6); i++) { const l = new TH.PointLight('#FFB060', 0, 9, 1.7); W.scene.add(l); W.pool.push(l); }
    W.enemies = []; W.shots = []; W.drops = []; W.zones = []; W.fxs = []; W.dyn = []; R.clearNums();
    W.F = R.genFloor(run, f); W.F.ores = []; W.F.crystals = []; W.F.saved = false;
    R.buildFloor(W.scene, run, W.F);
    // 玩家
    const cls = R.S.cls;
    if (!W.P || o.fresh || W.P.hpMax == null) {
      const P = R.calcPlayer(cls);
      Object.assign(P, { hp: P.hpMax, mp: P.mpMax, ammo: P.ws.mag || 0, reloadT: 0, atkCd: 0, skillCd: 0, dodgeCd: 0, iframe: 0, dashT: 0, buff: {}, shield: 0, stumble: 0, slowT: 0, blindT: 0, knockT: 0, stance: 0, charge: 0, atkHold: 0, stacks: 0, orbit: 0, still: 0, crits: 0, elemShots: 0 });
      P.h = R.makePlayerHero(cls, P.item.base, R.equipped(cls));
      W.P = P;
    }
    // 中途切換了像素風：從這一層開始換成對應的樣子
    const P = W.P, start = W.F.rooms[0];
    // 往上走回來的時候，站在這一層（已經變了樣）的樓層通道旁
    const arrive = o.up && W.F.stairs ? W.F.rooms[W.F.stairs.room] : start;
    [P.x, P.z] = o.up && W.F.stairs ? R.nearestFloor(W.F.stairs.x, W.F.stairs.z + 3.2) : R.nearestFloor(start.x, start.z + 2); P.y = 0; P.yaw = Math.PI; P.dead = false; P.jump = null; P.air = 0;
    W.scene.add(P.h.g);
    R.spawnAllies();
    R.populateFloor();
    if (R.spawnRivals) R.spawnRivals();
    if (P.adv === 'shikigami') { P.orbitN = Math.max(1, P.orbitN || 1); }
    W.orbs = [];
    R.lockBarriers = [];
    arrive.visited = true;
    R.hudFloor(); R.hudTick(1);
    R.banner(run.site.name, (R.floorLabel ? R.floorLabel(run) : '第 ' + (f + 1) + ' 層／共 ' + run.floors + ' 層') + (run.env ? '・' + R.ENVS[run.env].name + '環境' : ''));
    R.placeCam(null);
    if (f === 0 && (R.S.stats.runs || 0) <= 1 && !R.S.stats.helped) { R.S.stats.helped = 1; R.save(); setTimeout(() => R.helpSheet && R.helpSheet(), 600); }
  };

  // ---------- 房間 ----------
  // 抽一種生物：遺跡的形式偏好的多抽幾次；精英很少見
  const pickId = (pool, run, not) => {
    const fav = Object.assign({}, (R.TYPES[run.type] && R.TYPES[run.type].favor) || {}, R.biomeFavor ? R.biomeFavor(run) : null), list = [];   // biome.js：這一帶的景色常見的生物多抽幾次
    pool.forEach(id => { if (not && not.includes(id)) return; list.push([id, R.ENEMIES[id].elite ? 0.35 : 1 + (fav[id] || 0)]); });
    let s = list.reduce((a, b) => a + b[1], 0) * Math.random();
    for (const [id, w] of list) { s -= w; if (s <= 0) return id; }
    return list[list.length - 1][0];
  };
  R.pickEnemyId = pickId;
  // 一間房裡放多少、放什麼（dormant：還沒醒，在房裡慢慢晃，走進來才醒）
  const fillRoom = (r, dormant) => {
    const run = W.run, g = run.grade, f = run.floor, pool = g.pool;
    let cnt = 0, cap = 4 + 2 * g.lv + R.alliesUp().length;   // 一間房最多幾隻
    const put = (id, o) => { const [x, z] = R.roomPoint(r, { away: W.P, min: 5 }); const e = R.spawnEnemy(id, x, z, r.i, Object.assign({ quiet: dormant }, o)); cnt++; if (dormant) { e.dormant = true; e.aggro = false; } return e; };
    let n = r.type === 'ore' ? 2 : r.type === 'chest' || r.type === 'trap' ? 2 : 3 + g.lv + Math.floor(f / 2) + Math.floor(Math.random() * 3) + R.alliesUp().length;   // 隊友越多，怪也越多
    if (run.type === 'maze') n = Math.round(n * 0.8);   // 迷宮型的房間多，每間少放一點
    if (r.big) { n = Math.round(n * 1.6); cap += 4; }   // 跨兩格的大廳
    if (r.type === 'ore') for (let i = 0; i < 2 + g.lv; i++) put('kousaku');
    let lantern = false, elite = false, guard = 0;
    while (n > 0 && guard++ < 80 && cnt < cap) {
      const id = pickId(pool, run);
      if (id === 'chochin') { if (lantern || Math.random() < 0.5) continue; lantern = true; }
      if (R.ENEMIES[id].elite) { if (elite || r.type !== 'fight' || n < 3) continue; elite = true; put(id); n -= 3; continue; }   // 精英（牛鬼）一間最多一隻，抵三隻
      if (id === 'kamaitachi') { if (n < 3) continue; ['trip', 'cut', 'heal'].forEach(role => put('kamaitachi', { role })); n -= 3; continue; }
      if (id === 'okuriinu') { const k = Math.min(n, 3); for (let i = 0; i < k; i++) put('okuriinu'); n -= k; continue; }
      if (id === 'kodama') { const k = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < k; i++) put('kodama'); n -= Math.ceil(k / 2); continue; }   // 木魂成群，兩隻算一隻
      put(id); n--;
    }
    if (run.env) { const envs = Object.keys(R.ENEMIES).filter(k => R.ENEMIES[k].env === run.env), envId = envs[Math.floor(Math.random() * envs.length)]; if (envId && Math.random() < 0.7) put(envId); }   // 同一種環境可能有好幾種生物
  };
  // 一層開始時：房間裡本來就有遺跡生物在活動；通道裡也有在遊蕩的
  R.populateFloor = () => {
    const F = W.F, run = W.run, g = run.grade;
    F.rooms.forEach(r => {
      if (r.cleared || r.type === 'boss' || r.type === 'lord' || (r.type === 'deep' && r.nest)) return;
      if (r.type === 'chest' && Math.random() < 0.55) { r.cleared = true; return; }
      fillRoom(r, true); r.populated = true;
    });
    const t = F.tile, start = F.rooms[0], cands = [];
    for (let k = 0; k < t.nx * t.nz; k++) { if (t.T[k] !== 1 || t.RM[k] >= 0) continue; const tx = k % t.nx, tz = (k - tx) / t.nx, x = t.cX(tx), z = t.cZ(tz); if (Math.hypot(x - start.x, z - start.z) < 16) continue; cands.push([x, z]); }
    const groups = Math.min(cands.length >> 3, 2 + Math.min(2, g.lv));
    for (let i = 0; i < groups; i++) {
      const [x, z] = cands[Math.floor(Math.random() * cands.length)];
      if (g.lv >= 2 && i === 0 && Math.random() < 0.35 && g.pool.includes('nurikabe')) { R.spawnEnemy('nurikabe', x, z, -1, { quiet: true }); continue; }   // 塗壁：堵在通道正中間
      const id = pickId(g.pool, run, ['chochin', 'nurikabe', 'hyakume', 'ushioni', 'kamaitachi']), k = id === 'okuriinu' || id === 'kodama' ? 3 : 1 + Math.floor(Math.random() * 2);
      for (let j = 0; j < k; j++) R.spawnEnemy(id, x + (Math.random() - 0.5) * 1.5, z + (Math.random() - 0.5) * 1.5, -1, { quiet: true });
    }
  };
  // 從外面打到還沒醒的生物：哈米莉亞級只有被打的那隻會還手；其他分級整間都醒過來，跑出來找你（這間房就不會鎖門了）
  R.wakeRoom = (ri, by) => {
    const run = W.run; if (!run) return;
    if (run.grade.passive || ri < 0) { by.dormant = false; return; }
    const r = W.F.rooms[ri], outside = !r.locked;
    W.enemies.forEach(e => { if (e.room !== ri || e.dead) return; e.dormant = false; e.aggro = true; if (outside) e.room = -1; });
    if (outside) r.cleared = true;
  };
  R.roomAt = (x, z) => { const i = R.roomIndexAt(x, z); return i >= 0 ? W.F.rooms[i] : null; };
  const enemiesIn = r => W.enemies.filter(e => !e.dead && e.room === r.i).length;
  R.enterRoom = r => {
    if (!r.visited) { r.visited = true; R.drawMinimap(true); }
    if (r.cleared || r.locked) return;
    const run = W.run, g = run.grade, pool = g.pool.slice(), f = run.floor;
    if (r.type === 'chest' && !r.populated && Math.random() < 0.55) { r.cleared = true; return; }
    const put = (id, o) => { const [x, z] = R.roomPoint(r, { away: W.P, min: 5 }); return R.spawnEnemy(id, x, z, r.i, o); };
    if (r.type === 'boss') {
      if (r.coreOut || W.enemies.some(e => e.id === g.boss && !e.dead)) { r.cleared = true; return; }   // 驅逐型：核心已經自己過來了
      const bp = R.nearestFloor(r.x, r.z - 3); R.spawnEnemy(g.boss, bp[0], bp[1], r.i, { aggro: true });
      R.bossRoom = r; R.banner(R.ENEMIES[g.boss].name, '遺跡的核心。周圍是異常狀態力場');
    } else if (r.type === 'lord') {
      // 克森特級：領主體，這一區的支配者
      const tl = R.TYPES[run.type] && R.TYPES[run.type].lord, id = tl && g.lords.includes(tl) && Math.random() < 0.7 ? tl : g.lords[Math.floor(Math.random() * g.lords.length)], bp = R.nearestFloor(r.x, r.z - 2); R.spawnEnemy(id, bp[0], bp[1], r.i, { aggro: true, hpMul: 0.7 });
      R.banner(R.ENEMIES[id].name, '這一區的支配者');
    } else if (r.type === 'deep' && r.nest) {
      // 摩爾斯級最深處：送犬的巢——群首帶著整群送犬組織狩獵
      const lead = put('okuriinu', { aggro: true, hpMul: 4 }); lead.leader = true; if (lead.m.isSprite) R.beastVariant(lead.m, 'okuriinu', 'leader'); else lead.m.g.scale.setScalar(1.6);
      for (let i = 0; i < 4; i++) put('okuriinu', { aggro: true });
      ['trip', 'cut', 'heal'].forEach(role => put('kamaitachi', { role, aggro: true }));
      R.banner('尾隨犬的巢', '特殊生態區：群首帶著整群尾隨犬');
    } else if (r.populated) {
      // 房間裡本來就在的生物醒過來了；先前被引出房間的不算這一間的
      W.enemies.forEach(e => { if (e.room !== r.i) return; if (e.dormant) { e.dormant = false; if (!g.passive) e.aggro = true; } if (R.roomIndexAt(e.x, e.z) !== r.i) e.room = -1; });
    } else fillRoom(r, false);
    // 哈米莉亞級沒有防衛機制：不會張膜鎖門
    if (g.passive) r.cleared = true; else R.lockRoom(r, true);
  };
  // 門口的膜：房間裡的遺跡生物清光之前出不去
  R.lockRoom = (r, on) => {
    const TH = T();
    if (on) {
      if (r.locked) return; r.locked = true; r.barriers = [];
      // 通道接進房間的每一格都張一片膜
      const t = W.F.tile, TS = t.TS, mat = new TH.MeshBasicMaterial({ color: R.theme(W.run).accent, transparent: true, opacity: 0.35, depthWrite: false });
      (r.doors || []).forEach(k => {
        const tx = k % t.nx, tz = (k - tx) / t.nx, x = t.cX(tx), z = t.cZ(tz);
        const m = new TH.Mesh(new TH.BoxGeometry(TS, 2.4, TS), mat); m.position.set(x, 1.2, z); W.F.group.add(m);
        const c = R.addBox(x - TS / 2, x + TS / 2, z - TS / 2, z + TS / 2, 'door');
        r.barriers.push({ m, c });
      });
    } else {
      if (!r.locked) return; r.locked = false;
      (r.barriers || []).forEach(b => { W.F.group.remove(b.m); b.c.on = false; }); r.barriers = [];
    }
  };
  R.onBossDown = e => {
    const r = R.roomOf(e), run = W.run, isCore = e.id === run.grade.boss;
    if (isCore) run.bossDown = true;
    R.banner(isCore ? '佩特拉核心停止了搏動' : e.def.name + '倒下了', isCore ? '遺跡開始崩塌：40 秒內回到回歸水晶' : '牠體內的魔力核心掉了出來');
    // 打倒核心、領主：那一區放金寶箱和回歸水晶（克森特級 2026-10-04 起每一層本來就有投放的水晶）
    setTimeout(() => { if (!W.run || W.run !== run) return; const cp = R.nearestFloor(r.x, r.z + 2); R.addChest(W.F.group, W.F, cp[0], cp[1], 2, r.i); if ((isCore || run.grade.crystal !== 'none') && !W.F.crystals.some(c => c.room === r.i)) { const xp = R.nearestFloor(r.x, r.z - r.hz + 3); R.addCrystal(W.F.group, W.F, xp[0], xp[1], r.i); } }, 800);
    if (e.id === 'petra') { run.collapseT = 40; }
  };
  R.sealStairs = () => { const s = W.F.stairs; if (!s) return; s.edge.material = new (T().MeshBasicMaterial)({ color: '#8A1A2A' }); const m = new (T().Mesh)(new (T().BoxGeometry)(4.2, 0.4, 4.2), new (T().MeshLambertMaterial)({ color: '#9A4A5A' })); m.position.set(s.x, 0.2, s.z); W.F.group.add(m); };

  // ---------- 互動 ----------
  R.nearestInteract = () => {
    const P = W.P, list = [];
    W.F.chests.forEach(c => list.push({ x: c.x, z: c.z, r: 2, label: c.state === 'closed' ? '開寶箱' : c.state === 'open' ? '關上寶箱（會開始刷新）' : '打開寶箱（刷新中，會暫停）', act: () => R.useChest(c) }));
    W.F.crystals.forEach(c => list.push({ x: c.x, z: c.z, r: 2.2, label: '回歸水晶：回到地面', act: R.askExtract }));
    if (W.F.stairs) list.push({ x: W.F.stairs.x, z: W.F.stairs.z, r: 2.6, label: W.F.stairs.sealed ? '樓層通道被封住了' : '走下樓層通道', act: R.descend });
    if (W.F.up) list.push({ x: W.F.up.x, z: W.F.up.z, r: 2.4, label: W.F.up.exit ? '從入口走出遺跡（回到地面）' : '走上樓層通道（回上一層：路已經變了樣）', act: R.ascend });
    if (W.F.coreView) list.push({ x: W.F.coreView.x, z: W.F.coreView.z + 3, r: 2.6, label: '看著佩特拉核心', act: R.coreSheet });
    W.F.ores.forEach(o => { if (o.left > 0) list.push({ x: o.x, z: o.z, r: 1.8, label: '掘礦', act: () => R.mine(o) }); });
    (W.allies || []).forEach(a => { if (a.downed) list.push({ x: a.x, z: a.z, r: 1.9, label: '扶起' + a.name + '（用一瓶回復藥，站在旁邊一下）', act: () => R.startRevive(a) }); });
    let best = null, bd = 1e9; for (const it of list) { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < bd) { bd = d; best = it; } }
    return best;
  };
  R.interact = () => { if (W.P.dead) return; const it = R.nearestInteract(); if (it) it.act(); };
  // 寶箱：關上後會「刷新」重新凝聚東西；人在同一個房間時刷新比較慢；刷新中打開會暫停
  R.useChest = c => {
    const run = W.run;
    if (c.state === 'closed') {
      c.state = 'open'; c.lid.rotation.x = -1.9; R.sfx && R.sfx('chest');
      const tier = Math.max(0, c.tier - c.opened);
      const loot = c.opened >= 2 ? [{ mat: Math.random() < 0.5 ? 'branch' : 'herb', n: 1 }] : R.rollChest(run.grade.lv - 1, run.floor, R.S.cls, tier);
      loot.forEach((l, i) => setTimeout(() => { if (l.item) R.dropItem(l.item, c.x, c.z + 0.8); else R.dropMat(l.mat, l.n, c.x, c.z + 0.8); }, i * 120));
      c.opened++; c.refresh = 0;
    } else if (c.state === 'open') { c.state = 'refresh'; c.lid.rotation.x = 0; R.toast('寶箱關上了。它開始「刷新」……人離開這個房間會快一點。'); }
    else { c.state = 'open'; c.lid.rotation.x = -1.9; R.toast('裡面是空的。刷新暫停了。'); }
  };
  R.updateChests = dt => {
    const P = W.P, here = R.roomAt(P.x, P.z);
    // 周圍人數越多，刷新越慢（玩家＋隊友）
    const people = [P, ...R.alliesUp()].map(o => R.roomIndexAt(o.x, o.z));
    W.F.chests.forEach(c => { if (c.state !== 'refresh') return; const n = people.filter(i => i === c.room).length; c.refresh += dt / 45 * (n ? 0.3 / n : 1); if (c.refresh >= 1) { c.state = 'closed'; c.refresh = 0; } c.lid.rotation.x = c.state === 'refresh' ? -Math.sin(c.refresh * Math.PI) * 0.08 : c.lid.rotation.x; });
  };
  R.mine = o => {
    o.left = 0; W.F.group.remove(o.mesh);
    const g = W.run.grade.lv;
    R.dropMat('iron', Math.random() < 0.3 ? 2 : 1, o.x, o.z); if (Math.random() < 0.5) R.dropMat('shell', 1, o.x, o.z);
    if (g >= 2 && Math.random() < 0.45) R.dropMat('manaore', 1, o.x, o.z);
    R.sfx && R.sfx('mine'); R.toast('掘礦：背上的礦石敲下來了');
  };
  // 換層的時候鎖住樓梯：淡出那一下連按空白鍵，原本會排好幾次「下一層」，一口氣連下好幾層（作者 2026-10-04 回報）。
  // 到了新的一層再等 0.7 秒才能再用樓梯（一直按著才不會又走回去）。
  let stairLock = 0;
  const stairBusy = () => performance.now() < stairLock;
  const stairGo = f => { stairLock = performance.now() + 60000; R.fade(() => { try { f(); } finally { stairLock = performance.now() + 700; } }); };
  R.stairBusy = stairBusy;
  R.descend = () => {
    const s = W.F.stairs, run = W.run; if (stairBusy()) return;
    if (s.sealed) { R.toast('斷尾：佩特拉封住了往下的路。這一層只能回去了。'); return; }
    stairGo(() => R.loadFloor(run.floor + 1));
  };
  // 往上走：遺跡一直在長，回去的路和來的時候不一樣（上一層重新長過）
  R.ascend = () => {
    const run = W.run, up = W.F.up; if (!up || stairBusy()) return;
    if (up.sealed) { R.toast('往回的路被斷尾封死了'); return; }
    if (up.exit) { R.askLeave(); return; }
    stairGo(() => { R.loadFloor(run.floor - 1, { up: true }); R.banner('回去的路變了樣', '遺跡一直在長：上一層已經不是來的時候的樣子'); });
  };
  R.askLeave = () => {
    R.sheet('<h2>從入口走出去？</h2><p>外面的光從入口照進來。走出去就回到地面，身上的東西都帶得走。</p>', '<div class="row"><button type="button" class="btn pri" id="lv-yes">走出去</button><button type="button" class="btn" id="lv-no">再逛逛</button></div>');
    $('lv-yes').onclick = () => { R.closeSheet(); R.extract('exit'); }; $('lv-no').onclick = R.closeSheet;
  };
  R.coreSheet = () => {
    R.sheet('<p class="kicker">保留區・最深處</p><h2>佩特拉核心</h2><p>懸浮在最深處的巨大眼球：有瞳孔和血管，兩側長著翼肢，表面規律地搏動。周圍一圈是異常狀態力場，靠近了會頭暈、看不清楚、搞不清方向。</p><p class="note">保留區的核心受公會保護——遺跡還要繼續產出資源，所以不准攻擊。走到這裡，這座遺跡就算走完了。</p>', '<div class="row"><button type="button" class="btn pri" id="cv-x">好</button></div>');
    $('cv-x').onclick = R.closeSheet;
  };
  R.askExtract = () => {
    const run = W.run;
    R.sheet('<h2>回到地面？</h2><p>用回歸水晶回到東鶴。背包裡的東西和素材都會帶回去。</p>'
      + '<p class="note">背包 ' + run.bag.length + ' 件・素材 ' + Object.values(run.mats).reduce((a, b) => a + b, 0) + ' 個。回去後公會會付委託報酬。</p>'
      + (run.floor < run.floors - 1 ? '<p class="note">還有 ' + (run.floors - 1 - run.floor) + ' 層沒走。越深，寶箱越好。</p>' : '')
      + '<div class="row"><button type="button" class="btn pri" id="ex-yes">回去</button><button type="button" class="btn" id="ex-no">再逛逛</button></div>');
    $('ex-yes').onclick = () => { R.closeSheet(); R.extract(); }; $('ex-no').onclick = R.closeSheet;
  };
  // 帶著東西回來
  R.extract = how => {
    const run = W.run; if (!run || run.done) return; run.done = true; run.how = how || 'crystal';
    if (R.rivalsLeave) R.rivalsLeave();
    const S = R.S;
    run.bag.forEach(it => S.stash.push(it));
    Object.keys(run.mats).forEach(k => { S.mats[k] = (S.mats[k] || 0) + run.mats[k]; });
    // 走完：到了最後一層，而且打倒了核心（保留區：走到最深處、看到核心；摩爾斯級還要清掉送犬的巢）
    const full = run.floor === run.floors - 1 && (run.grade.boss ? !!run.bossDown : W.F.rooms.some(r => r.type === 'deep' && r.visited && r.cleared));
    // 公會的委託報酬：看分級、走到第幾層、擊倒幾隻、有沒有走完
    const lv = run.grade.lv, greed = R.calcPlayer(S.cls).greed || 0;
    run.reward = Math.round(([30, 90, 220, 520, 1100][lv - 1] + [12, 30, 70, 160, 320][lv - 1] * run.floor + run.kills * (1 + lv)) * (full ? 1.6 : 1) * (1 + greed));
    // 隊友照公會規矩分走報酬
    const alive = (run.party || []).filter(pm => !pm.gone).length; run.share = Math.round(run.reward * R.PARTY_SHARE * alive);
    S.gold += run.reward - run.share;
    if (full) { S.cleared[run.grade.id] = (S.cleared[run.grade.id] || 0) + 1; }
    S.stats.extracted = (S.stats.extracted || 0) + 1;
    R.save();
    R.results(true, full);
  };
  R.onPlayerDown = () => {
    const run = W.run, P = W.P; if (run.done) return;
    P.dead = true; run.done = true; R.setDown(P.h, true); P.dashT = 0; P.h.roll = 0;
    R.S.stats.deaths = (R.S.stats.deaths || 0) + 1; R.save();
    setTimeout(() => { if (W.run === run) R.results(false, false); }, 1400);
  };
  R.results = (ok, full, lost) => {
    const run = W.run, S = R.S, cls = S.cls, st = S.classes[cls];
    const items = run.bag.map(it => '<li style="color:' + R.rarityColor(it) + '">' + R.esc(R.itemName(it)) + '</li>').join('') || '<li class="note">（沒有撿到裝備）</li>';
    const mats = Object.keys(run.mats).map(k => R.MATS[k].name + ' ×' + run.mats[k]).join('、') || '沒有';
    R.sheet(ok
      ? '<p class="kicker">' + (run.how === 'exit' ? '遺跡入口' : '回歸水晶') + '</p><h2>' + (full ? '走完了這座遺跡' : '回到地面') + '</h2><p>' + R.esc(run.site.name) + '・走到第 ' + (run.floor + 1) + ' 層・擊倒 ' + run.kills + ' 隻</p>'
        + '<h3>帶回來的東西</h3><ul class="loot">' + items + '</ul><p>素材：' + mats + '<br>公會的委託報酬：' + run.reward + ' 費拉' + (run.share ? '（隊友分走 ' + run.share + '）' : '') + '</p>'
        + (run.bag.some(it => !it.identified) ? '<p class="hand">未鑑定的東西，拿去老岩的鐵匠鋪看看。</p>' : '')
        + (full && run.grade.id === 'amile' && S.cleared.amile === 1 ? '<p class="hand">公會發來新的委託：摩爾斯級遺跡。</p>' : '')
        + '<p class="note">' + R.esc(R.clsName(cls)) + ' Lv ' + st.lv + (st.lv > run.startLv ? '（升了 ' + (st.lv - run.startLv) + ' 級）' : '') + '</p>'
      : '<p class="kicker">倒下</p><h2>你倒在了第 ' + (run.floor + 1) + ' 層</h2><p>公會的巡查隊把你從入口拖了出來。</p>'
        + '<h3>沒能帶回來的東西</h3><ul class="loot">' + items + '</ul><p>素材：' + mats + '<br>委託失敗：沒有報酬</p><p class="note">身上的裝備還在。經驗值也還在。</p>',
      '<div class="row"><button type="button" class="btn pri" id="rs-ok">回東鶴</button></div>');
    $('rs-ok').onclick = () => { R.closeSheet(); R.endRun(); };
  };
  // 回到地面：走回東鶴近郊（東鶴附近的遺跡，就站在那座遺跡的入口前）
  // 回到地面：一趟花一天（走到第 4 層以後兩天；倒下的話多躺一天）
  R.endRun = () => { const run0 = W.run, from = run0 && run0.site.id, days = run0 ? 1 + (run0.floor >= 3 ? 1 : 0) + (run0.how ? 0 : 1) : 1; if (run0 && R.jobsOnRun) R.jobsOnRun(run0); if (R.advanceDays) R.advanceDays(days); R.dayMsg = '這一趟花了 ' + days + ' 天'; W.allies = []; R.ensureRoster(true); if (W.scene && W.P) W.scene.remove(W.P.h.g); if (W.scene && R.disposeScene) R.disposeScene(W.scene); W.run = null; W.P = null; W.scene = null; R.enterTown(from); };

  // ---------- 撿東西 ----------
  R.updateDrops = dt => {
    const P = W.P, run = W.run;
    W.drops.forEach(d => {
      if (d.gone) return;
      d.t += dt; d.mesh.position.y = 0.5 + Math.sin(d.t * 3) * 0.12; d.mesh.rotation.y += dt * 1.5;
      const dd = Math.hypot(d.x - P.x, d.z - P.z);
      if (d.type !== 'item' && dd < 3.5 && dd > 0.3) { d.x += (P.x - d.x) * dt * 4; d.z += (P.z - d.z) * dt * 4; d.mesh.position.x = d.x; d.mesh.position.z = d.z; }
      if (dd < 1.1 && !P.dead) {
        if (d.type === 'gold') { run.gold += d.n; R.sfx && R.sfx('coin'); }
        else if (d.type === 'mat') { run.mats[d.mat] = (run.mats[d.mat] || 0) + d.n; R.toast('＋' + R.MATS[d.mat].name + ' ×' + d.n); }
        else if (d.type === 'fruit') { R.healP(P.hpMax * 0.15); }
        else { if (run.bag.length >= R.BAG_MAX) { if (!d.warned) { d.warned = true; R.toast('背包滿了（' + R.BAG_MAX + ' 件）。打開背包，丟掉一些再撿。'); } return; } run.bag.push(d.item); R.toast('撿到：' + R.itemName(d.item), R.rarityColor(d.item)); R.sfx && R.sfx('pick'); }
        d.gone = true; W.scene.remove(d.mesh); R.disposeObj(d.mesh);
      }
    });
    W.drops = W.drops.filter(d => !d.gone);
  };

  // ---------- 主迴圈 ----------
  R.step = dt => {
    const run = W.run, P = W.P, I = R.input;
    if (!run || !P) return;
    run.t += dt;
    // 計時：待越久，佩特拉越注意你
    // 佩特拉的注意隨時間慢慢降（作者 2026-10-04；原本是每 5 秒升 1）：每 4 秒 −1，反應進行中不降
    run.awareT = (run.awareT || 0) + dt; if (run.awareT > 4) { run.awareT = 0; if (!run.reacting && run.aware > 0) run.aware = Math.max(0, run.aware - 1); }
    if (run.collapseT != null) { run.collapseT -= dt; if (run.collapseT <= 0 && !run.done) { run.collapseT = null; R.hurtPlayer(9999, null); } }
    // 冷卻
    ['atkCd', 'skillCd', 'dodgeCd', 'iframe', 'stumble', 'slowT', 'blindT', 'knockT', 'stance', 'atkHold', 'invis', 'hurtT'].forEach(k => { if (P[k] > 0) P[k] = Math.max(0, P[k] - dt); });
    Object.keys(P.buff).forEach(k => { P.buff[k] = Math.max(0, P.buff[k] - dt); });
    if (P.buff.shieldT <= 0) P.shield = 0;
    if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { P.reloadT = 0; P.ammo = P.ws.mag; } }
    if (!P.dead) {
      P.mp = Math.min(P.mpMax, P.mp + dt * ((P.cls === 'mage' || P.cls === 'priest' ? 3.5 : 2) + (P.mpRegen || 0)));   // 回魔詞綴   // 魔力回得慢：技能要省著用
      if (P.regen) R.healP(P.regen * dt, true);
      if (P.adv === 'druid' || P.buff.regen > 0) R.healP(P.hpMax * (P.buff.regen > 0 ? 0.03 : 0.01) * dt, true);
    }
    // 瞄準（滑鼠射線打在地面上；觸控用右搖桿）
    // 按鍵與搖桿都是「畫面方向」：轉了視角之後，W 仍然是畫面的上方
    const cy = Math.cos(W.cam.yaw), sy = Math.sin(W.cam.yaw), toWorld = (x, y) => [x * cy + y * sy, -x * sy + y * cy];
    if (I.aimStick && (Math.abs(I.aimStick.x) + Math.abs(I.aimStick.y) > 0.2)) { const [ax, az] = toWorld(I.aimStick.x, I.aimStick.y); P.aimA = Math.atan2(ax, az); P.aimX = P.x + Math.sin(P.aimA) * 6; P.aimZ = P.z + Math.cos(P.aimA) * 6; }
    else if (I.mouseNDC) { W.ray.setFromCamera(I.mouseNDC, W.camera); const hit = new (T().Vector3)(); if (W.ray.ray.intersectPlane(W.plane, hit)) { P.aimX = hit.x; P.aimZ = hit.z; P.aimA = Math.atan2(hit.x - P.x, hit.z - P.z); } }
    if (P.aimA == null) { P.aimA = Math.PI; P.aimX = P.x; P.aimZ = P.z - 4; }
    // F：像《飢荒》一樣，自動打最近的敵人
    if (I.keys.f) { const tg = R.nearestEnemy(P.x, P.z, 12); if (tg) { P.aimA = Math.atan2(tg.x - P.x, tg.z - P.z); P.aimX = tg.x; P.aimZ = tg.z; } }
    // 移動
    let mx = 0, mz = 0;
    if (!P.dead && P.knockT <= 0 && P.stance <= 0 && !P.jump) {
      if (I.keys.w || I.keys.arrowup) mz -= 1; if (I.keys.s || I.keys.arrowdown) mz += 1; if (I.keys.a || I.keys.arrowleft) mx -= 1; if (I.keys.d || I.keys.arrowright) mx += 1;
      if (I.moveStick) { mx += I.moveStick.x; mz += I.moveStick.y; }
    }
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    [mx, mz] = toWorld(mx, mz);
    // 異常狀態力場：靠近佩特拉核心時「方向感異常」，走路會歪
    const coreNear = W.enemies.find(e => e.id === 'petra' && !e.dead) || W.F.coreView;
    if (coreNear && ml > 0.1) { const dc = Math.hypot(coreNear.x - P.x, coreNear.z - P.z); if (dc < 10) { const wob = Math.sin(run.t * 1.7) * 0.9 * (1 - dc / 10), cw = Math.cos(wob), sw = Math.sin(wob); [mx, mz] = [mx * cw + mz * sw, -mx * sw + mz * cw]; } }
    P.moveA = ml > 0.1 ? Math.atan2(mx, mz) : null;
    const sprint = R.running() && ml > 0.1 && !P.charging && P.stance <= 0;
    // 跑步：不能攻擊、放技能、翻滾，所以要夠快（2026-10-04 回饋：跑步跟走路沒什麼差；1.42→2）
    let sp = P.speed * (sprint ? 2 : 1) * (P.slowT > 0 ? 0.6 : 1) * (P.buff.whirl > 0 ? 0.7 : 1) * (P.charging ? 0.55 : 1) * (P.buff.fortress > 0 ? 0.4 : 1) * (run.env === 'desert' || run.env === 'deep' ? 0.88 : 1);
    if (P.dashT > 0) {
      const ease = P.dashEase ? 0.45 + 1.1 * Math.max(0, P.dashT / P.dashEase) : 1; P.dashT -= dt; const ox = P.x, oz = P.z; P.x += Math.sin(P.dashA) * P.dashSp * ease * dt; P.z += Math.cos(P.dashA) * P.dashSp * ease * dt;
      if (P.dashHit) W.enemies.forEach(e => { if (!e.dead && !P.dashHit.done.has(e) && Math.hypot(e.x - P.x, e.z - P.z) < 1.2 + e.def.size * 0.5) { P.dashHit.done.add(e); R.hurtEnemy(e, P.dashHit.dmg, { stun: P.dashHit.stun, kb: P.dashHit.kb }); } });
      if (P.dashT <= 0) { P.dashEase = 0; if (P.dashEnd) { const f = P.dashEnd; P.dashEnd = null; f(); } }
    } else if (P.jump) {
      const J = P.jump; J.t += dt; const k = Math.min(1, J.t / J.dur); P.x = J.x0 + (J.x1 - J.x0) * k; P.z = J.z0 + (J.z1 - J.z0) * k; P.y = Math.sin(k * Math.PI) * 3.5; P.air = 0.1;
      if (k >= 1) { P.jump = null; P.y = 0; P.air = 0; [P.x, P.z] = R.nearestFloor(P.x, P.z); R.fx('boom', P.x, 0.3, P.z, { r: 3.2, color: '#9AB0D0' }); R.aoe(P.x, P.z, 3.2, P.ws.dmg * 2.2, { kb: 3 }); R.shake(0.4); }
    } else { P.x += mx * sp * dt; P.z += mz * sp * dt; }
    P.still = ml > 0.1 ? 0 : P.still + dt;
    if (P.adv === 'inner' && P.still > 0.6 && !P.dead) { R.healP(P.hpMax * 0.02 * dt, true); P.mp = Math.min(P.mpMax, P.mp + 3 * dt); }
    const pinched = R.collide(P, 0.42);
    if (pinched && W.dyn.length && P.iframe <= 0) { R.hurtPlayer(P.hpMax * 0.12, null); P.iframe = 0.5; }   // 被擠壓的牆夾住：很痛，快逃
    P.yaw = sprint && P.moveA != null ? P.moveA : P.aimA;
    P.h.g.position.set(P.x, P.y || 0, P.z); P.h.g.rotation.y = P.yaw;
    P.h.g.visible = !(P.invis > 0 && Math.floor(run.t * 10) % 2 === 0);
    R.animHero(P.h, P.dashT > 0 ? 8 : ml * sp, dt, !sprint);
    // 攻擊、蓄力
    if (!P.dead) {
      if ((I.fire || I.keys.f) && !sprint) R.attack();
      if (P.charging) { P.charge += dt; if (!I.fire && !I.keys.f) R.releaseBow(); }
      if (P.buff.whirl > 0) { P.whirlT = (P.whirlT || 0) - dt; if (P.whirlT <= 0) { P.whirlT = 0.2; R.melee(0, 3, Math.PI * 2, P.ws.dmg * 0.55); P.h.g.rotation.y = run.t * 20; } }
    }
    // 式神（式神使）：繞著你轉，自動攻擊
    const nOrb = (P.adv === 'shikigami' ? 1 : 0) + (P.orbit > 0 ? P.orbitN : 0);
    if (P.orbit > 0) P.orbit -= dt;
    R.updateOrbs(nOrb, dt);
    // 房間
    const room = R.roomAt(P.x, P.z);
    if (room) R.enterRoom(room);
    W.F.rooms.forEach(r => { if (r.locked && enemiesIn(r) === 0) { R.lockRoom(r, false); r.cleared = true; if (R.rivalsRoomClear) R.rivalsRoomClear(); if (r.type !== 'boss') R.toast('這一區清乾淨了'); R.drawMinimap(true); } });
    R.updateEnemies(dt); R.updateAllies(dt); if (R.rivalsStep) R.rivalsStep(dt); R.updateShots(dt); R.updateZones(dt); R.updateDrops(dt); R.updateChests(dt);
    // 陷阱：釘板一陣一陣地刺出來（刺出來之前會先發紅）
    W.F.traps.forEach(tp => {
      const ph = (run.t + tp.phase) % tp.period, up = ph > tp.period - 0.7, warn = !up && ph > tp.period - 1.3;
      tp.sp.position.y += ((up ? 0 : -0.7) - tp.sp.position.y) * Math.min(1, dt * 18);
      tp.plate.material.emissive.setHex(warn ? 0x6A1A10 : up ? 0x3A0A08 : 0x000000);
      if (up && tp.sp.position.y > -0.25) {
        tp.hitT -= dt;
        if (Math.abs(P.x - tp.x) < 1 && Math.abs(P.z - tp.z) < 1 && tp.hitT <= 0 && !P.air) { tp.hitT = 0.7; R.hurtPlayer(10 + run.grade.lv * 6, null); }
        W.enemies.forEach(e => { if (!e.dead && !e.def.fly && Math.abs(e.x - tp.x) < 1 && Math.abs(e.z - tp.z) < 1 && (e.trapT || 0) <= run.t) { e.trapT = run.t + 0.7; R.hurtEnemy(e, 10, {}); } });
      } else tp.hitT = 0;
    });
    // 克森特級的生物會設陷阱：在路上撒撒菱
    if (run.grade.traps === 'set') { run.calT = (run.calT == null ? 6 : run.calT) - dt; if (run.calT <= 0) { run.calT = 5 + Math.random() * 4; const c = W.enemies.find(e => !e.dead && e.aggro && !e.def.fly && !e.def.boss && Math.hypot(e.x - P.x, e.z - P.z) < 12); if (c) { R.addZone({ kind: 'caltrop', x: c.x, z: c.z, r: 1, life: 16, dmg: 6 + run.grade.lv * 2 }); R.toast(c.def.name + '在地上撒了撒菱'); } } }
    // 保留區最深處的核心：浮著、看著你
    if (W.F.coreView) { const cv = W.F.coreView; cv.m.g.position.y = (cv.m.isSprite ? 1.2 : 3.2) + Math.sin(run.t * 1.2) * 0.25; cv.m.g.rotation.y = Math.atan2(P.x - cv.x, P.z - cv.z); R.animBeast(cv.m, 'petra', run.t, false); cv.field.material.opacity = 0.08 + Math.sin(run.t * 2) * 0.03; }
    W.dyn = W.dyn.filter(f => f(dt) !== false);
    R.updateFx(dt);
    // 目目連
    const open = Math.floor(run.aware / 100 * W.F.eyes.length);
    W.F.eyes.forEach((e, i) => { const want = i < open; if (want) { e.mesh.visible = true; e.mesh.scale.y = Math.min(1, e.mesh.scale.y + dt * 2); e.iris.position.x = Math.max(-0.12, Math.min(0.12, ((P.x - e.x) * Math.cos(e.rot) - (P.z - e.z) * Math.sin(e.rot)) * 0.02)); } else if (e.mesh.visible) { e.mesh.scale.y = Math.max(0.02, e.mesh.scale.y - dt * 2); if (e.mesh.scale.y <= 0.03) e.mesh.visible = false; } });
    // 鏡頭與光：鏡頭永遠以人物為中心，不跟著滑鼠偏過去
    const sh = W.shakeT > 0 ? (W.shakeT -= dt, W.shakeA * W.shakeT) : 0;
    R.placeCam(dt, sh);
    R.updateCutaway(dt);
    // 佩特拉的脈絡：注意越高越亮，一明一暗
    if (W.F.veinMat) W.F.veinMat.opacity = 0.12 + run.aware / 100 * 0.55 + Math.sin(run.t * (2 + run.aware / 25)) * 0.06;
    if (W.F.pitGlow) W.F.pitGlow.material.opacity = (run.type === 'tower' ? 0.26 : 0.12) + Math.sin(run.t * 1.3) * 0.05 + run.aware / 100 * 0.12;
    W.torch.position.set(P.x, 3, P.z);
    R.updateLights(dt);
    W.moon.position.set(P.x - 8, 22, P.z + 10); W.moon.target.position.set(P.x, 0, P.z);
    R.hudTick(dt);
  };
  R.shake = a => { W.shakeT = 0.3; W.shakeA = a * 3; };
  // 鏡頭：以人物為中心。像《飢荒》一樣每次轉 45 度（Z／C），滾輪拉近拉遠
  // 2026-10-04 作者：仿《飢荒》——鏡頭放低到 45 度左右（原本 h 19、back 12.5，56.7 度），人物看起來比較站得起來
  // 俯角：原本的（57 度，h 19、back 12.5）或 45 度；選單的「鏡頭」換（記在瀏覽器裡，換了要重新整理，因為人物、牆的點陣是照俯角畫的）
  const PITCH45 = (() => { try { return localStorage.getItem('tfl-pitch') === '45'; } catch (e) { return false; } })();
  R.CAM = PITCH45 ? { h: 16.1, back: 16.1, zMin: 0.65, zMax: 1.45 } : { h: 19, back: 12.5, zMin: 0.65, zMax: 1.45 };
  R.placeCam = (dt, shake) => {
    const c = W.cam, P = W.P;
    if (dt == null) { c.yaw = c.yawT; c.zoom = c.zoomT; }
    else {
      const turning = Math.abs(c.yawT - c.yaw) > 0.002;
      c.yaw += (c.yawT - c.yaw) * Math.min(1, dt * 10); c.zoom += (c.zoomT - c.zoom) * Math.min(1, dt * 8);
      if (turning) R.drawMinimap();
      if (Math.abs(c.yawT) > 40) { const k = Math.round(c.yawT / (Math.PI * 2)) * Math.PI * 2; c.yaw -= k; c.yawT -= k; }
    }
    // 直立的手機畫面很窄：鏡頭拉遠一點，左右才看得到東西
    const tall = W.camera.aspect > 0 && W.camera.aspect < 1 ? 1 + (1 - W.camera.aspect) * 0.7 : 1;
    const sx = shake ? (Math.random() - 0.5) * shake : 0, sz = shake ? (Math.random() - 0.5) * shake : 0, b = R.CAM.back * c.zoom * tall;
    W.camera.position.set(P.x + Math.sin(c.yaw) * b + sx, R.CAM.h * c.zoom * tall, P.z + Math.cos(c.yaw) * b + sz);
    // 像素風：看的高度讓腳底落在像素格線上（走路時人物不會上下跳一格）
    W.camera.lookAt(P.x + sx, W.scene && W.scene.userData.pix ? R.PIX.LOOKY : 0.5, P.z + sz);
  };
  R.rotateCam = d => { if (W.cam) W.cam.yawT += d * Math.PI / 4; };
  R.zoomCam = z => { if (!W.cam) return; W.cam.zoomT = Math.max(R.CAM.zMin, Math.min(R.CAM.zMax, z)); if (R.S) { R.S.opts = R.S.opts || {}; R.S.opts.zoom = Math.round(W.cam.zoomT * 1000) / 1000; } };
  // 觸控的「遠近」：近、普通、遠三段輪流
  R.cycleZoom = () => { const L = [0.8, 1, 1.3], i = L.findIndex(v => v > W.cam.zoomT + 0.05); R.zoomCam(i < 0 ? L[0] : L[i]); };
  // 畫面上的按鈕（觸控與滑鼠共用）
  R.tact = a => {
    if (a === 'run') { R.input.run = !R.input.run; document.querySelectorAll('[data-tact="run"]').forEach(b => b.classList.toggle('on', R.input.run)); return; }
    if (W.town) { const t = { use: R.townInteract, pause: R.townMenu, bag: () => R.openHub('stash'), rotl: () => R.rotateCam(-1), rotr: () => R.rotateCam(1), zoom: R.cycleZoom }[a]; if (t) t(); return; }
    if (!W.run) return; const f = { order: R.orderMenu, skill: R.useSkill, dodge: R.dodge, use: R.interact, hp: () => R.drink('hp'), bag: R.bagSheet, pause: R.pauseSheet, rotl: () => R.rotateCam(-1), rotr: () => R.rotateCam(1), zoom: R.cycleZoom }[a]; if (f) f(); };
  R.fade = f => { const el = $('fade'); el.hidden = false; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); setTimeout(() => { f(); setTimeout(() => { el.hidden = true; }, 400); }, 380); };

  // 式神
  R.updateOrbs = (n, dt) => {
    const TH = T(), P = W.P;
    while (W.orbs.length < n) { const m = new TH.Mesh(new TH.BoxGeometry(0.35, 0.5, 0.04), new TH.MeshBasicMaterial({ color: '#F4ECDC' })); W.scene.add(m); W.orbs.push({ m, cd: Math.random() * 0.6 }); }
    while (W.orbs.length > n) { const o = W.orbs.pop(); W.scene.remove(o.m); }
    W.orbs.forEach((o, i) => {
      const a = W.run.t * 2.4 + i / Math.max(1, n) * Math.PI * 2; o.x = P.x + Math.sin(a) * 1.8; o.z = P.z + Math.cos(a) * 1.8;
      o.m.position.set(o.x, 1.6 + Math.sin(a * 2) * 0.2, o.z); o.m.rotation.y = a;
      o.cd -= dt; if (o.cd <= 0) { const tg = R.nearestEnemy(o.x, o.z, 9); if (tg) { o.cd = 0.6; R.fire({ kind: 'spirit', owner: 'p', x: o.x, z: o.z, a: Math.atan2(tg.x - o.x, tg.z - o.z), speed: 18, dmg: P.ws.dmg * 0.45, life: 0.8 }); } else o.cd = 0.3; }
    });
  };

  // ---------- 操作 ----------
  R.touch = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  R.input = { keys: {}, fire: false, mouseNDC: null, moveStick: null, aimStick: null, run: false, shiftAt: 0 };
  R.running = () => { const I = R.input; return I.run || (!!I.keys.shift && (W.town || performance.now() - (I.shiftAt || 0) >= 200)); };
  R.bindInput = () => {
    const I = R.input, cv = $('gl');
    const inRun = () => (!!W.run || !!W.town) && !$('run').hidden;
    window.addEventListener('keydown', e => {
      if (!inRun()) return;
      const k = e.key.toLowerCase();
      if (R.sheetOpen()) { if (k === 'escape' || k === 'tab') { e.preventDefault(); R.closeSheet(); } return; }
      if (k === 'shift' && !I.keys.shift) I.shiftAt = performance.now();
      I.keys[k] = true;
      // 按鍵照《飢荒》：Q／E 轉視角、空白鍵互動、F 攻擊最近的敵人、Tab 地圖、Esc 暫停
      if (W.town) { if (k === 'h' && R.toggleHood) R.toggleHood(); if (k === ' ') { e.preventDefault(); R.townInteract(); } if (k === 'q') R.rotateCam(-1); if (k === 'e') R.rotateCam(1); if (k === 'escape') R.townMenu(); if (k === 'tab') { e.preventDefault(); R.bigMap(); } return; }
      if (R.orderOpen && R.orderOpen() && /^[1-5]$/.test(k)) { R.pickOrder(+k); return; }
      if (k === 'c') R.orderMenu();
      if (k === 'h' && R.toggleHood) R.toggleHood();
      if (k === ' ') { e.preventDefault(); R.interact(); }
      if (k === 'shift') e.preventDefault();
      if (k === 'q') R.rotateCam(-1);
      if (k === 'e') R.rotateCam(1);
      if (k === 'r') R.useSkill();
      if (k === 'x') R.reload();
      if (k === '1') R.drink('hp');
      if (k === '2') R.drink('mp');
      if (k === 'i') R.bagSheet();
      if (k === 'tab') { e.preventDefault(); R.bigMap(); }
      if (k === 'escape') R.pauseSheet();
    });
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase(); I.keys[k] = false;
      // 點一下 Shift（不到 0.2 秒）是翻滾；按住是跑步
      if (k === 'shift') { const held = performance.now() - (I.shiftAt || 0); I.shiftAt = 0; if (held < 200 && W.run && !W.town && inRun() && !R.sheetOpen() && !W.paused) R.dodge(); }
    });
    window.addEventListener('blur', () => { I.keys = {}; I.fire = false; });
    cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); I.mouseNDC = { x: (e.clientX - r.left) / r.width * 2 - 1, y: -((e.clientY - r.top) / r.height * 2 - 1) }; });
    cv.addEventListener('mousedown', e => { if (!inRun() || R.sheetOpen() || !W.run) return; if (e.button === 0) I.fire = true; if (e.button === 2) R.useSkill(); });
    window.addEventListener('mouseup', e => { if (e.button === 0) I.fire = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { if (!inRun() || R.sheetOpen()) return; e.preventDefault(); R.zoomCam(W.cam.zoomT * (e.deltaY > 0 ? 1.1 : 1 / 1.1)); }, { passive: false });
    // 觸控：左搖桿移動、右搖桿瞄準並自動攻擊
    const stick = (el, knob, set) => {
      let id = null;
      const upd = t => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = t.clientX - cx, dy = t.clientY - cy; const d = Math.hypot(dx, dy), m = r.width / 2 - 8; if (d > m) { dx = dx / d * m; dy = dy / d * m; } knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; set({ x: dx / m, y: dy / m }); };
      el.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; id = t.identifier; upd(t); }, { passive: false });
      el.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === id) upd(t); }, { passive: false });
      const end = e => { for (const t of e.changedTouches) if (t.identifier === id) { id = null; knob.style.transform = ''; set(null); } };
      el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
    };
    stick($('joy-l'), $('knob-l'), v => { I.moveStick = v; });
    stick($('joy-r'), $('knob-r'), v => { I.aimStick = v; I.fire = !!v && Math.hypot(v.x, v.y) > 0.35; });
    document.querySelectorAll('[data-tact]').forEach(b => b.addEventListener('touchstart', e => { e.preventDefault(); R.tact(b.dataset.tact); }, { passive: false }));
  };
  R.drink = k => {
    const P = W.P, S = R.S; if (!P || P.dead) return;
    if (!(S.potions[k] > 0)) { R.toast(k === 'hp' ? '沒有回復藥了' : '沒有魔力藥了'); return; }
    S.potions[k]--; if (k === 'hp') R.healP(P.hpMax * 0.35); else P.mp = Math.min(P.mpMax, P.mp + P.mpMax * 0.5);
    R.sfx && R.sfx('drink');
  };
  R.gainXp = v => {
    const st = R.S.classes[R.S.cls]; st.xp += v;
    while (st.xp >= R.xpNeed(st.lv)) {
      st.xp -= R.xpNeed(st.lv); st.lv++;
      R.banner('升級：' + R.clsName(R.S.cls) + ' Lv ' + st.lv, st.lv === R.PROMOTE_LV ? '轉職的等級到了：到公會看轉職條件（段位、轉職試煉、魔力核心）' : '');
      if (W.P) { const ratio = W.P.hp / W.P.hpMax, fresh = R.calcPlayer(R.S.cls); ['hpMax', 'mpMax', 'dmgMult', 'lv'].forEach(k => { W.P[k] = fresh[k]; }); W.P.hp = W.P.hpMax * ratio; }
    }
  };
})(window.R);
