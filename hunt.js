// 狩獵考核、狩獵委託（照作者的《公會簡章》與〈浮標〉）
// - 《公會簡章》：新人段升冒險段的「公會段位考核」有兩次狩獵任務，平均 70% 以上合格。〈浮標〉：狩獵考核的目標是指定的野獸——
//   蓑背熊（背上的毛會把樹枝捲住）、土鎧豬（額頭有厚甲），公會的專員在旁邊記錄，不出手、不救人。
// - 地點：湯山村後山的狩獵場（山腳、山腰兩段）。白天的雪地山林，不是遺跡：沒有佩特拉的注意、寶箱、房門的膜、謎題、其他隊伍，也不暗。
//   野獸不是遺跡生物：體內沒有魔力水晶；打倒了拿得到毛皮、額甲、肉（素材，可以做飾品、賣給公會）。
// - 蓑背熊：背上的毛捲著樹枝，從背後打傷害減半。土鎧豬：額頭的厚甲，從正面打只有兩成五——要繞到側面或背後。
// - 考核用五軌制打分（guildtask.js）：目標是蓑背熊 1 頭、土鎧豬 3 頭；多殺的獵物扣環境分（生態）。合格兩次拿稱號「獵人」，之後公會開放狩獵委託（可以一直接）。
// - 存檔：R.S.hunt = { passed, tries }；任務成績上 t.exam。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s), rnd = Math.random;
  const ID = 'yuyama-hunt', NEED = { minobear: 1, yoroiboar: 3 }, PASS = 70;
  const hs = () => { const s = S(); s.hunt = s.hunt || { passed: 0, tries: 0 }; return s.hunt; };
  const outdoor = () => { const run = W().run; return !!(run && run.site && run.site.outdoor); };

  // ---------- 分級、主題、地點 ----------
  if (!R.gradeById('hunt')) R.GRADES.push({ id: 'hunt', name: '狩獵場', letter: 'D', zone: '湯山村後山', floors: 2, lv: 2, loot: 0, floor0: 0, crystal: 'start', pool: [], boss: null, desc: '湯山村後山的山林。不是遺跡：沒有佩特拉核心，野獸也不是遺跡生物。' });
  R.THEMES.hunt = { floor: '#D2DAE0', wall: '#34503A', top: '#EEF4F6', light: '#FFF6E8', fog: '#C8D4DC', accent: '#7FE08A' };
  R.GRADE_COLOR.hunt = '#5A8A4A';
  // 山林：用迷宮型的生成（圓的空地、彎彎曲曲的獸徑、牆上有樹根），名字換掉
  R.TYPES.forest = Object.assign({}, R.TYPES.maze, { name: '山林', floors: 0, favor: {}, desc: '密林圍出來的空地，中間是獸徑。' });
  if (R.FORM) R.FORM.forest = Object.assign({}, R.FORM.maze);
  if (!R.SITES.find(s => s.id === ID)) R.SITES.push({ id: ID, kind: 'hunt', outdoor: 1, grade: 'hunt', type: 'forest', name: '湯山村後山・狩獵場', src: '〈浮標〉', desc: '湯山村後面的山林，冬天野獸會下山找吃的。公會的狩獵考核在這裡辦。', status: 'open' });

  // ---------- 野獸 ----------
  const pad = (rows, w) => rows.map(r => r.padEnd(w, '.').slice(0, w));
  const BEAR_TOP = ['........b.....b', '.......b.b...b.b', '......b.ssbsssb.s', '.....sssaaaaaaasss', '....aaaaaaaaaaaaaaa..ll', '...aaaaaaaaaaaaaaaaaallll', '..aaaaaaaaaaaaaaaaaaaaaeaa', '..aaaaaaaaaaaaaaaaaaaaaaan', '..aaaaaaaaaaaaaaaaaaaaaaa', '..daaaaaaaaaaaaaaaaaaaaa', '..ddaaaaaaaaaaaaaaaaaaa', '...dddaaaaaaaaaaaaaaaa'];
  const BOAR_TOP = ['.....dd..dd', '...aaaaaaaaaaa.pp', '..aaaaaaaaaaaapppp', '.aaaaaaaaaaaaapppp', 'daaaaaaaaaaaaaapppe', '.aaaaaaaaaaaaaaapann', '.aaaaaaaaaaaaaaaat', '..aaaaaaaaaaaaaa'];
  const ART = R.BEAST_ART;
  if (ART) {
    ART.minobear = { pal: { a: '#5A4232', d: '#3A2A20', l: '#6A5040', b: '#8A6A44', s: '#EEF2F4', e: '#F0D060', n: '#1A1410' }, a: pad(BEAR_TOP.concat(['...aaa..aaa....aaa..aaa', '...aaa..aaa....aaa..aaa', '...aaa..aaa....aaa..aaa', '...ddd..ddd....ddd..ddd']), 26), b: pad(BEAR_TOP.concat(['....aaa..aaa..aaa..aaa', '...aaa....aaa..aaa..aaa', '..aaa......aaa..aaa..aaa', '..ddd......ddd..ddd..ddd']), 26) };
    ART.yoroiboar = { pal: { a: '#6A5040', d: '#4A3428', p: '#8C8A80', e: '#F0D060', n: '#C88A7A', t: '#F2ECDC' }, a: pad(BOAR_TOP.concat(['..aa..aa....aa..aa', '..aa..aa....aa..aa', '..dd..dd....dd..dd']), 20), b: pad(BOAR_TOP.concat(['...aa..aa..aa..aa', '..aa....aa..aa..aa', '..dd....dd..dd..dd']), 20) };
  }
  Object.assign(R.ENEMIES, {
    minobear: { name: '蓑背熊', ref: '〈浮標〉', hp: 900, dmg: 26, speed: 3.2, xp: 60, size: 1.6, ai: 'chase', color: '#5A4232', eye: '#F0D060', wild: 1, noDex: 1, desc: '背上的毛又長又亂，會把樹枝捲進去，遠看像披著蓑衣。從背後打，刀會卡在樹枝和毛裡。' },
    yoroiboar: { name: '土鎧豬', ref: '〈浮標〉', hp: 260, dmg: 18, speed: 3.4, xp: 22, size: 1.0, ai: 'charge', color: '#6A5040', eye: '#F0D060', wild: 1, noDex: 1, desc: '額頭上長著一塊厚厚的甲，低頭衝過來的時候正面打不動。從側面或背後下手。' }
  });
  Object.assign(R.MATS, {
    bearfur: { name: '蓑背熊的毛皮', color: '#5A4232', value: 45, desc: '又厚又暖，裡面還纏著幾根樹枝。' },
    boarplate: { name: '土鎧豬的額甲', color: '#8C8A80', value: 30, desc: '土鎧豬額頭上的硬甲，敲起來像石頭。' },
    meat: { name: '野獸肉', color: '#B85A4A', value: 6, desc: '冬天的野獸肉，湯山村的人拿來燉鍋。' }
  });
  if (R.ACC_RECIPES) R.ACC_RECIPES.push(
    { name: '鎧豬額甲的胸針', kind: 'acc', base: 'brooch', ilvl: 4, mats: { boarplate: 2, thread: 1 }, gold: 60, weights: [10, 50, 35, 5, 0, 0], extra: 'tough', note: '土鎧豬的額甲磨成的胸針，很硬。' },
    { name: '熊皮腕輪', kind: 'acc', base: 'bracelet', ilvl: 5, mats: { bearfur: 1, leather: 1, thread: 1 }, gold: 80, weights: [0, 45, 45, 10, 0, 0], extra: 'vital', note: '蓑背熊的毛皮縫的腕輪，戴著很暖。' }
  );
  if (R.addTitle) R.addTitle(['hunter', '獵人', '狩獵考核合格兩次', '傷害 +3%、暴擊率 +2%', { dmg: 0.03, crit: 0.02 }]);

  // 蓑背熊背後、土鎧豬正面：傷害打折
  const ed0 = R.enemyDefend;
  R.enemyDefend = (e, dmg, o, crit) => {
    dmg = ed0 ? ed0(e, dmg, o, crit) : dmg;
    const P = W().P; if (!P || !e || !e.def || !e.def.wild || (o && o.fromBehind === false)) return dmg;
    const a = Math.atan2(P.x - e.x, P.z - e.z), off = Math.abs(Math.atan2(Math.sin(a - e.yaw), Math.cos(a - e.yaw)));
    if (e.id === 'yoroiboar' && off < 0.9) { if (rnd() < 0.4) R.num(e.x, 1.8 * e.def.size + 0.9, e.z, '額甲', ''); R.fx('block', e.x + Math.sin(e.yaw) * 0.6, 0.8, e.z + Math.cos(e.yaw) * 0.6); return dmg * 0.25; }
    if (e.id === 'minobear' && off > 2.2) { if (rnd() < 0.4) R.num(e.x, 1.8 * e.def.size + 0.9, e.z, '卡在樹枝裡', ''); return dmg * 0.5; }
    return dmg;
  };
  // 野獸沒有魔力水晶：打倒時掉毛皮、額甲、肉
  let wildKill = false;
  const dm0 = R.dropMat;
  R.dropMat = (mat, n, x, z) => { if (wildKill && ['crystal', 'core', 'purecry', 'frostcry', 'flamecry', 'sandcry', 'tidecry'].includes(mat)) return; return dm0(mat, n, x, z); };
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, wild = was && e.def && e.def.wild; wildKill = !!wild;
    let r; try { r = ke0(e, by); } finally { wildKill = false; }
    if (wild && e.dead) {
      const run = W().run; if (run) { run.huntKills = run.huntKills || {}; run.huntKills[e.id] = (run.huntKills[e.id] || 0) + 1; }
      if (e.id === 'minobear') { R.dropMat('bearfur', 1, e.x, e.z); R.dropMat('meat', 2, e.x + 0.6, e.z); } else if (e.id === 'yoroiboar') { R.dropMat('boarplate', 1, e.x, e.z); R.dropMat('meat', 1, e.x + 0.6, e.z); } else if (e.def.wildDrop) e.def.wildDrop(e);   /* 雪蛛（huntspider.js）之類的：自己的掉落 */
      if (run && run.exam && NEED[e.id]) setTimeout(() => R.toast && R.toast('專員：「' + e.def.name + '，一頭。」他在本子上記了一筆。', '#C8D4DC'), 600);
    }
    return r;
  };

  // ---------- 狩獵場：不是遺跡 ----------
  const gf0 = R.genFloor;
  R.genFloor = (run, f) => {
    const F = gf0(run, f);
    if (run && run.site && run.site.outdoor) {
      F.calm = true; F.zone = null;
      F.rooms.forEach(r => { if (r.type === 'start' || r.type === 'stairs') return; r.type = 'fight'; r.cleared = true; r.calm = 1; r.traps = 0; r.puzzle = null; });
    }
    return F;
  };
  // 空地周圍：遺跡的磚牆換成一圈一圈的松樹。牆的碰撞留著（還是走不進去），只是看不到；牆底下鋪雪地
  let woodsF = null;
  const woods = F => {
    const t = F.tile; woodsF = null; if (!t || !F.wallMeshes) return;
    F.wallMeshes.concat(F.ghosts || []).forEach(m => { m.visible = false; });
    const TH = THREE, { nx, nz, T: TT, TS } = t, N = nx * nz;
    const snow = new TH.Mesh(new TH.PlaneGeometry(nx * TS + 60, nz * TS + 60), new TH.MeshLambertMaterial({ color: '#E4ECF0' }));
    snow.rotation.x = -Math.PI / 2; snow.position.set(t.X0 + nx * TS / 2, -0.06, t.Z0 + nz * TS / 2); snow.receiveShadow = true; F.group.add(snow);
    // 每一格牆離空地幾格（1 是貼著空地的那一圈）
    const d = new Uint8Array(N); let q = [];
    for (let k = 0; k < N; k++) if (TT[k] === 1) q.push(k);
    for (let step = 1; step <= 4 && q.length; step++) {
      const nq = [];
      q.forEach(k => { const tx = k % nx, tz = (k - tx) / nx; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const x = tx + dx, z = tz + dz; if (x < 0 || z < 0 || x >= nx || z >= nz) continue; const m = z * nx + x; if (TT[m] === 2 && !d[m]) { d[m] = step; nq.push(m); } } });
      q = nq;
    }
    // 越靠空地越密；再外面稀稀落落的，從上面看還是一片林子
    const list = [];
    for (let k = 0; k < N; k++) {
      if (TT[k] !== 2) continue;
      const n = d[k] === 1 ? 2 : d[k] === 2 ? 2 : d[k] === 3 ? (rnd() < 0.8 ? 1 : 2) : d[k] === 4 ? (rnd() < 0.7 ? 1 : 0) : (rnd() < 0.35 ? 1 : 0);
      const tx = k % nx, tz = (k - tx) / nx;
      for (let i = 0; i < n; i++) list.push({ x: t.cX(tx) + (rnd() - 0.5) * TS * 0.8, z: t.cZ(tz) + (rnd() - 0.5) * TS * 0.8, s: d[k] && d[k] <= 2 ? 0.95 + rnd() * 0.4 : 0.85 + rnd() * 0.5, near: d[k] && d[k] <= 3 });
    }
    // 遠的先畫、近的後畫（同一種大小的樹是一批）
    list.sort((a, b) => a.z - b.z);
    woodsF = { F, list, near: list.filter(x => x.near), field: R.treeField(list, F.group) };
  };
  // 擋在鏡頭和人物中間的樹先藏起來（跟遺跡的牆變矮一樣）
  const woodsStep = () => {
    const w = woodsF, P = W().P; if (!w || W().F !== w.F || !P) return;
    const yaw = W().cam ? W().cam.yaw : 0, cy = Math.sin(yaw), cz = Math.cos(yaw); let dirty = false;
    w.near.forEach(tr => {
      const wx = tr.x - P.x, wz = tr.z - P.z, along = wx * cy + wz * cz, side = Math.abs(wx * cz - wz * cy);
      const hide = along > -0.5 && along < 6.5 && side < 1.8 - along * 0.05;
      if (!!tr.hide !== hide) { tr.hide = hide; dirty = true; }
    });
    w.field.update(yaw, dirty);
  };

  // 蓋好之後：拿掉寶箱和打得壞的東西（遺跡裡才有），種松樹
  const dress = F => {
    (F.chests || []).forEach(c => { if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh); if (c.col) c.col.on = false; }); F.chests = [];
    (F.props || []).forEach(p => { p.alive = false; if (p.col) p.col.on = false; if (p.mesh && p.mesh.parent) p.mesh.parent.remove(p.mesh); }); F.props = [];
    if (!F.group) return;
    woods(F);
    F.rooms.forEach((r, i) => { if (!i) return; const n = 3 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const x = r.x + (rnd() - 0.5) * 2 * Math.max(1, r.hx - 1.5), z = r.z + (rnd() - 0.5) * 2 * Math.max(1, r.hz - 1.5); if (Math.hypot(x - r.x, z - r.z) < 2.5 || (R.pointBlocked && R.pointBlocked(x, z))) continue; const sp = R.pineSprite(0.9 + rnd() * 0.4); sp.position.set(x, 0, z); F.group.add(sp); R.addBox(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 'tree'); } });
  };
  const fl0 = R.floorLabel;
  R.floorLabel = run => (run && run.site && run.site.outdoor ? ['山腳', '山腰', '山頂'][run.floor] || '山裡' : fl0 ? fl0(run) : '');
  const aw0 = R.addAware;
  R.addAware = (v, why) => (outdoor() ? undefined : aw0(v, why));   // 沒有佩特拉核心
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const r = lf0(f, o), run = W().run, F = W().F; if (!run || !run.site || !run.site.outdoor || !F) return r;
    if (run.exam == null) { run.exam = pending !== 'job'; if (run.exam) hs().tries++; pending = null; }   // 第一層是在 startRun 裡面載入的，這時就要知道是不是考核
    const ab = $('r-aware-box'); if (ab) ab.hidden = true;   // 山裡沒有佩特拉核心
    dress(F);
    // 遺跡生物不會在山裡（福影童、預言犢那種「每層一成五會出現」的也不行）
    W().enemies.forEach(e => { if (!e.dead && !(e.def && e.def.wild)) { e.dead = true; if (e.m && e.m.g && e.m.g.parent) e.m.g.parent.remove(e.m.g); } });
    // 白天的雪地：亮一點、霧是白的
    const sc = W().scene; if (sc) { sc.children.forEach(c => { if (c.isHemisphereLight) c.intensity = 0.85; }); if (sc.fog) { sc.fog.color.set('#C8D4DC'); sc.fog.density = 0.012; } if (sc.background && sc.background.isColor) sc.background.set('#C8D4DC'); }
    if (W().moon) W().moon.intensity = 0.75; if (W().torch) W().torch.intensity = 0.3;
    // 野獸：山腳四頭土鎧豬；山腰一頭蓑背熊（最遠的地方）、一頭土鎧豬
    const rooms = F.rooms.filter((x, i) => i > 0 && x.type !== 'stairs').sort((a, b) => (b.dist || 0) - (a.dist || 0));
    const put = (id, room) => { if (!room) return; const [x, z] = R.roomPoint ? R.roomPoint(room, {}) : [room.x, room.z]; R.spawnEnemy(id, x, z, room.i, { quiet: true }); };
    if (run.floor === 0) rooms.slice(0, 4).forEach(rm => put('yoroiboar', rm));
    else { put('minobear', rooms[0]); put('yoroiboar', rooms[1] || rooms[0]); }
    // 公會的專員：跟在後面記錄，不出手
    if (run.exam) {
      const P = W().P, h = R.makeHero('gunner', 'pistol', { lite: 1, weapon: 'pistol', shield: false, top: '#2A2E38', cloak: '#1E222A', hair: '#2A2420' });
      h.g.position.set(P.x - 2, 0, P.z + 1); F.group.add(h.g); run.agent = { h, x: P.x - 2, z: P.z + 1 };
      if (run.floor === 0) setTimeout(() => R.banner && R.banner('公會的專員跟著你', '「我只負責記錄。你倒下了，我也不會出手。」'), 2600);
    }
    return r;
  };
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    if (outdoor()) woodsStep();
    const run = W().run, a = run && run.agent, P = W().P; if (!a || !P) return;
    const dx = P.x - a.x, dz = P.z - a.z, d = Math.hypot(dx, dz), sp = d > 4 && !P.dead ? Math.min(P.speed || 6, (d - 3) * 3) : 0;
    if (sp) { a.x += dx / d * sp * dt; a.z += dz / d * sp * dt; }
    a.h.g.position.set(a.x, 0, a.z); a.h.g.rotation.y = Math.atan2(dx, dz); if (R.animHero) R.animHero(a.h, sp, dt, false);
  };

  // ---------- 委託書、考核 ----------
  let pending = null;   // 'exam' 或 'job'：從公會按下去的是哪一種
  const ts0 = R.taskSpec;
  R.taskSpec = site => {
    if (!site || site.grade !== 'hunt') return ts0(site);
    const h = hs(), exam = pending !== 'job';
    return { kind: 'hunt', need: 4, limitH: 8, letter: 'D', floors: 2, lines: exam
      ? ['公會段位考核：狩獵考核（冒險段考核的兩次狩獵任務之一）', '目標：蓑背熊 1 頭、土鎧豬 3 頭（湯山村後山）', '公會的專員會跟著你記錄，不出手，也不救人。', '時限：8 小時。五軌成績平均 ' + PASS + '% 以上算合格（已經合格 ' + h.passed + '／2 次）。多殺的獵物扣環境分。', '提示：土鎧豬額頭有厚甲，正面打不動；蓑背熊背上的毛捲著樹枝，從背後打傷害減半。']
      : ['任務分級：D 級（野獸狩獵，湯山村的民眾委託）', '目標：蓑背熊 1 頭、土鎧豬 3 頭', '時限：8 小時。多殺的獵物扣環境分。'] };
  };
  const sr0 = R.startRun;
  R.startRun = id => { const ab = $('r-aware-box'); if (ab) ab.hidden = false; const r = sr0(id), run = W().run; if (run && run.site && run.site.id === ID) pending = null; return r; };
  // 回到地面：完成度只算指定的獵物；多殺的扣環境分
  const ex0 = R.extract;
  R.extract = how => {
    const run = W().run, s = S(); if (!run || run.done || !run.site || run.site.id !== ID) return ex0(how);
    const k = run.huntKills || {}, got = Math.min(k.minobear || 0, NEED.minobear) + Math.min(k.yoroiboar || 0, NEED.yoroiboar), extra = Math.max(0, (k.minobear || 0) - NEED.minobear) + Math.max(0, (k.yoroiboar || 0) - NEED.yoroiboar);
    run.kills = got; const r = ex0(how);
    const t = s.tasks && s.tasks[s.tasks.length - 1]; if (t && t.day === s.day && !t.hunt) { t.hunt = 1; t.exam = run.exam ? 1 : 0; t.site = run.exam ? '狩獵考核' : '狩獵委託'; if (extra) t.s[3] = Math.max(1, t.s[3] - 12 * extra); R.save(); }
    return r;
  };
  const pd0 = R.onPlayerDown;
  R.onPlayerDown = () => { const run = W().run; if (run && run.site && run.site.id === ID && !run.done) { const k = run.huntKills || {}; run.kills = Math.min(k.minobear || 0, 1) + Math.min(k.yoroiboar || 0, 3); } const r = pd0(); const s = S(), t = s.tasks && s.tasks[s.tasks.length - 1]; if (run && run.site && run.site.id === ID && t && !t.hunt) { t.hunt = 1; t.exam = run.exam ? 1 : 0; t.site = run.exam ? '狩獵考核' : '狩獵委託'; } return r; };
  // 成績登錄之後：考核合格了沒
  const nd0 = R.onNewDay;
  R.onNewDay = () => {
    nd0(); const s = S(); if (!s || !s.tasks) return;
    s.tasks.forEach(t => {
      if (!t.exam || t.avg == null || t.examDone) return; t.examDone = 1; const h = hs();
      if (t.avg >= PASS && h.passed < 2) { h.passed++; setTimeout(() => R.banner && R.banner('狩獵考核：合格（' + h.passed + '／2）', '成績 ' + t.avg + '%' + (h.passed >= 2 ? '。公會開放了狩獵委託。' : '。再合格一次就完成狩獵考核。')), 2000); if (h.passed >= 2 && R.awardTitle) R.awardTitle('hunter'); }
      else if (t.avg < PASS) setTimeout(() => R.toast && R.toast('狩獵考核：不合格（' + t.avg + '%，要 ' + PASS + '%）', '#FF9A6A'), 2000);
    });
    R.save();
  };

  // ---------- 公會：委託告示板上的狩獵、勇者證上的考核 ----------
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'); if (!body) return; const h = hs();
    const qs = body.querySelector('.quests');
    if (qs) {
      const card = document.createElement('div'); card.className = 'quest'; card.style.setProperty('--c', R.GRADE_COLOR.hunt);
      card.innerHTML = '<b>湯山村後山・狩獵場</b><small>D 級・' + (h.passed >= 2 ? '狩獵委託（蓑背熊、土鎧豬）' : '狩獵考核（合格 ' + h.passed + '／2）') + '</small>'
        + (h.passed >= 2 ? '<button type="button" class="btn pri" data-hunt="job">接狩獵委託</button>' : '<button type="button" class="btn pri" data-hunt="exam">接受狩獵考核</button>');
      qs.insertBefore(card, qs.querySelector('[data-map]') || null);
      card.querySelector('[data-hunt]').onclick = b => { pending = card.querySelector('[data-hunt]').dataset.hunt; R.startRun(ID); };
    }
    const hc = body.querySelector('.hero-card > div'); if (hc && (h.passed || h.tries)) { const el = document.createElement('small'); el.textContent = '狩獵考核：' + (h.passed >= 2 ? '合格' : '合格 ' + h.passed + '／2'); hc.appendChild(el); }
  };
})(window.R);
