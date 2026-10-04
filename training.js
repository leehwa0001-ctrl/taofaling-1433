// 公會的訓練場（2026-10-05 作者：可以在公會新增訓練場，可以自己測試技能）
// - 公會一樓往二樓的樓梯腳下（西北角，2026-10-05 從南牆出口左邊搬過來）立著一個稻草木樁：「公會後院・訓練場」。走過去按空白就進去，出來回到公會一樓。
// - 裡面：一片空地、幾個訓練木樁（不動、不還手、打不死）。畫面上方一塊面板：
//   最近 5 秒的每秒傷害、總傷害、最大的一下、上一招（放技能之後打出去的總傷害）。可以換「1 隻／5 隻一群」、「技能不冷卻（魔力、大招也滿）」。
// - 不算一趟遺跡：不花時間、不會受傷；裡面用掉的藥水、炸藥、卷軸、錢，練到的技能熟練度、武器熟練度、經驗，出來的時候全部還原（不能拿來練功）。
// - 場地借狩獵場的分級（R.GRADES 的 hunt）和「戶外」：佩特拉的注意、存檔點、出口的守衛、地形、樓層效果、黑暗這些遺跡的東西都會自己跳過。
//   hunt.js 的戶外處理（生野獸、考核）看 site.kind，不套到這裡。
// 放在所有包 R.hurtEnemy、R.loadFloor、R.startRun、R.onPlayerDown 的檔案後面（index.html 裡 net.js 前面）。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const ID = 'guild-train', DOOR = { x: -11.2, z: -3.4 };   // 2026-10-05 作者：稻草人放在樓梯底下，不然大家不知道訓練場在哪（原本在南牆出口左邊 -4, 7.6）
  const isTrain = run => !!(run && run.site && run.site.id === ID);
  const here = () => { const run = W().run; return isTrain(run) && !run.done ? run : null; };

  // ---------- 場地、木樁 ----------
  if (!R.SITES.find(s => s.id === ID)) R.SITES.push({ id: ID, kind: 'train', outdoor: 1, grade: 'hunt', type: 'forest', name: '公會後院・訓練場', desc: '公會後院的空地，立著幾個稻草木樁。' });
  R.ENEMIES.tdummy = { name: '訓練木樁', hp: 1e9, dmg: 0, speed: 0, xp: 0, size: 0.9, ai: 'dummy', color: '#C8A868', eye: '#3A2A1C', wild: 1, noDex: 1, armor: 0, desc: '公會後院的稻草木樁。怎麼打都不會倒。' };
  if (R.BEAST_ART) {
    const rows = ['.....hhhh.....', '....hhhhhh....', '....hkhhkh....', '....hhhhhh....', '.....hhhh.....', '......pp......', 'aaaaaaaaaaaaaa', 'aaaaaaaaaaaaaa', '....ssssss....', '...ssrsssrs...', '...ssssssss...', '...ssrsssrs...', '....ssssss....', '......pp......', '......pp......', '......pp......', '......pp......', '....dddddd....'];
    R.BEAST_ART.tdummy = { pal: { h: '#D8C49A', k: '#3A2A1C', p: '#7A5A3A', a: '#8A6A44', s: '#D8B860', r: '#8A3A2A', d: '#5A4232' }, a: rows, b: rows };
  }

  // ---------- 進去之前記下來，出來的時候還原（不能拿來練功） ----------
  const KEEP = ['gold', 'potions', 'bombs', 'bombsHi', 'bombsCore', 'scrolls', 'mats', 'prof', 'san', 'stats', 'tut', 'day', 'hour', 'xpBooks'];
  let snap = null;
  const take = () => { const s = S(), st = s.classes[s.cls], o = { cls: s.cls, keys: {}, st: JSON.parse(JSON.stringify({ sp: st.sp || null, xp: st.xp, lv: st.lv, spBonus: st.spBonus })) }; KEEP.forEach(k => { o.keys[k] = s[k] === undefined ? undefined : JSON.parse(JSON.stringify(s[k])); }); snap = o; };
  const restore = () => {
    const s = S(), o = snap; snap = null; if (!s || !o) return;
    KEEP.forEach(k => { if (o.keys[k] === undefined) delete s[k]; else s[k] = o.keys[k]; });
    const st = s.classes[o.cls]; if (st) { if (o.st.sp) st.sp = o.st.sp; else delete st.sp; st.xp = o.st.xp; st.lv = o.st.lv; if (o.st.spBonus === undefined) delete st.spBonus; else st.spBonus = o.st.spBonus; }
    R.save && R.save();
  };

  // ---------- 面板 ----------
  const T = { n: 1, nocd: false, log: [], total: 0, max: 0, hits: 0, last: null, t: 0 };
  let panel = null;
  const ensurePanel = () => {
    if (panel) return panel;
    panel = document.createElement('div'); panel.id = 'tr-panel'; panel.hidden = true;
    panel.innerHTML = '<b>公會後院・訓練場</b><div class="tr-num" id="tr-num"></div><div class="tr-row">'
      + '<button type="button" class="mini" id="tr-n"></button><button type="button" class="mini" id="tr-cd"></button><button type="button" class="mini" id="tr-reset">重置數字</button><button type="button" class="mini gold" id="tr-out">離開訓練場</button></div>';
    document.body.appendChild(panel);
    $('tr-n').onclick = () => { T.n = T.n === 1 ? 5 : 1; place(); reset(); label(); };
    $('tr-cd').onclick = () => { T.nocd = !T.nocd; label(); };
    $('tr-reset').onclick = () => { reset(); };
    $('tr-out').onclick = () => leave();
    panel.addEventListener('pointerdown', e => e.stopPropagation());
    return panel;
  };
  const label = () => { if (!panel) return; $('tr-n').textContent = '木樁：' + (T.n === 1 ? '1 隻' : '5 隻一群'); $('tr-cd').textContent = '技能冷卻：' + (T.nocd ? '不冷卻' : '照常'); };
  const reset = () => { T.log = []; T.total = 0; T.max = 0; T.hits = 0; T.last = null; show(); };
  const fmt = v => Math.round(v).toLocaleString('en-US');
  const show = () => {
    const el = $('tr-num'); if (!el) return;
    const now = T.t, rec = T.log.filter(x => now - x[0] <= 5), first = T.log.length ? T.log[0][0] : now, span = Math.max(1, Math.min(5, now - first));
    const dps = rec.reduce((a, x) => a + x[1], 0) / span;
    el.innerHTML = '<span>每秒傷害（最近 5 秒）<em>' + fmt(dps) + '</em></span><span>總傷害 <em>' + fmt(T.total) + '</em></span><span>最大一下 <em>' + fmt(T.max) + '</em></span><span>打中 <em>' + T.hits + '</em> 下</span>'
      + '<span>上一招 <em>' + (T.last ? esc(T.last.name) + '：' + fmt(T.last.dmg) : '—') + '</em></span>';
  };

  // ---------- 木樁 ----------
  let dummies = [];
  const place = () => {
    const w = W(), P = w.P; if (!here() || !P) return;
    dummies.forEach(e => { e.dead = true; if (e.m && e.m.g && e.m.g.parent) e.m.g.parent.remove(e.m.g); }); w.enemies = w.enemies.filter(e => !e.tdummy);
    const spots = T.n === 1 ? [[0, 0]] : [[0, 0], [1.6, 0.4], [-1.6, 0.4], [0.9, -1.4], [-0.9, -1.4]];
    // 2026-10-05 作者回報（截圖）：木樁卡在牆裡——原本固定放在前方 4.5 公尺、沒看那裡是不是牆。
    // 現在：前方、斜前方、兩旁、後面、近一點遠一點輪流試，挑一個每根木樁都站在空地上、跟你之間沒隔著牆的地方。
    const open = (x, z) => R.isFloor(x, z) && !R.pointBlocked(x, z) && ![[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].some(([u, v]) => R.pointBlocked(x + u, z + v));
    const seen = (x, z) => { const n = Math.ceil(Math.hypot(x - P.x, z - P.z) / 0.3); for (let i = 1; i < n; i++) { const k = i / n, px = P.x + (x - P.x) * k, pz = P.z + (z - P.z) * k; if (!R.isFloor(px, pz) || R.pointBlocked(px, pz)) return false; } return true; };
    let a = Math.PI, cx = P.x, cz = P.z - 4.5, fz = -1;
    find: for (const dd of [4.5, 3.5, 5.5, 2.8]) for (const da of [0, 0.5, -0.5, 1.2, -1.2, Math.PI / 2, -Math.PI / 2, 2.2, -2.2, Math.PI]) {
      const aa = Math.PI + da, x0 = P.x + Math.sin(aa) * dd, z0 = P.z + Math.cos(aa) * dd, f = Math.cos(aa) < 0 ? -1 : 1;
      if (spots.every(([dx, dz]) => open(x0 + dx, z0 + dz * f) && seen(x0 + dx, z0 + dz * f))) { a = aa; cx = x0; cz = z0; fz = f; break find; }
    }
    dummies = spots.map(([dx, dz]) => {
      const x = cx + dx, z = cz + dz * fz, e = R.spawnEnemy('tdummy', x, z, -1, { quiet: true });
      e.tdummy = 1; e.home = [x, z]; e.hp = e.hpMax = 1e9; e.dmg = 0; e.speed = 0; e.dormant = true; e.aggro = false; e.yaw = 0; return e;
    });
  };
  const keep = () => dummies.forEach(e => {
    e.dead = false; e.dormant = true; e.aggro = false; e.dmg = 0; e.kx = 0; e.kz = 0; if (e.home) { e.x = e.home[0]; e.z = e.home[1]; }
    if (e.hp < e.hpMax) { add(e.hpMax - e.hp); e.hp = e.hpMax; }   // 沒經過 R.hurtEnemy 直接扣的血也算
  });
  const add = d => { if (!(d > 0)) return; T.log.push([T.t, d]); T.total += d; T.hits++; if (d > T.max) T.max = d; if (T.last) T.last.dmg += d; };

  // ---------- 進出 ----------
  R.trainEnter = () => {
    if (here()) return;
    take(); T.n = T.n || 1; reset();
    R.startRun(ID);
  };
  const leave = () => {
    const w = W(), run = w.run; if (!isTrain(run)) return;
    run.done = true; if (panel) panel.hidden = true;
    w.allies = []; R.ensureRoster && R.ensureRoster(true);
    if (w.scene && w.P) w.scene.remove(w.P.h.g); if (w.scene && R.disposeScene) R.disposeScene(w.scene);
    w.run = null; w.P = null; w.scene = null; dummies = [];
    restore();
    R.enterTown();
    let n = 0; const back = () => { const t = W(); if (t.town && t.P && !t.inside) { R.enterInterior('guild', { x: DOOR.x, z: DOOR.z + 0.8, yaw: 0 }); return; } if (++n < 80) setTimeout(back, 100); };
    setTimeout(back, 100);
  };
  R.trainLeave = leave;

  const sr0 = R.startRun;
  R.startRun = id => {
    const r = sr0(id), run = W().run;
    if (isTrain(run)) { run.pact = null; run.train = 1; run.grade = Object.assign({}, run.grade, { name: '訓練場', letter: '—', passive: 1 }); run.floors = 1; }
    return r;
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const r = lf0(f, o), w = W(), run = w.run, F = w.F; if (!isTrain(run) || !F) return r;
    // 寶箱、打得壞的東西、遺跡生物（含特殊的）都拿掉
    (F.chests || []).forEach(c => { if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh); if (c.col) c.col.on = false; }); F.chests = [];
    (F.props || []).forEach(p => { p.alive = false; if (p.col) p.col.on = false; if (p.mesh && p.mesh.parent) p.mesh.parent.remove(p.mesh); }); F.props = [];
    w.enemies.forEach(e => { e.dead = true; if (e.m && e.m.g && e.m.g.parent) e.m.g.parent.remove(e.m.g); }); w.enemies = [];
    // 白天、亮一點
    const sc = w.scene; if (sc) { sc.children.forEach(c => { if (c.isHemisphereLight) c.intensity = 0.85; }); if (sc.fog) { sc.fog.color.set('#C8D4DC'); sc.fog.density = 0.01; } if (sc.background && sc.background.isColor) sc.background.set('#C8D4DC'); }
    if (w.moon) w.moon.intensity = 0.75;
    // 站到最大的那片空地
    const P = w.P, big = F.rooms.slice().sort((a, b) => (b.hx * b.hz || 0) - (a.hx * a.hz || 0))[0];
    if (P && big) { [P.x, P.z] = R.nearestFloor ? R.nearestFloor(big.x, big.z + 2.5) : [big.x, big.z + 2.5]; P.yaw = Math.PI; P.h.g.position.set(P.x, 0, P.z); R.placeCam && R.placeCam(null); }
    const ab = $('r-aware-box'); if (ab) ab.hidden = true;
    place(); ensurePanel().hidden = false; label(); show();
    setTimeout(() => R.banner && R.banner('公會後院・訓練場', '木樁不會還手、打不倒；不花時間，出來時用掉的東西會還你'), 300);
    return r;
  };
  const fl0 = R.floorLabel;
  R.floorLabel = run => (isTrain(run) ? '訓練場' : fl0 ? fl0(run) : '');
  // 不會受傷、不會倒下；回歸水晶、上下樓都是「離開」
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => (here() ? undefined : hp0(raw, src, o));
  const pd0 = R.onPlayerDown;
  R.onPlayerDown = (...a) => { if (here()) { const P = W().P; if (P) { P.hp = Math.max(1, P.hp || 1); P.dead = false; } leave(); return; } return pd0(...a); };
  const ax0 = R.askExtract;
  R.askExtract = (...a) => (here() ? leave() : ax0(...a));
  const ex0 = R.extract;
  R.extract = (...a) => (here() ? leave() : ex0(...a));
  const de0 = R.descend;
  R.descend = (...a) => (here() ? R.toast && R.toast('這裡是訓練場：要出去按上面的「離開訓練場」。') : de0(...a));

  // ---------- 傷害、上一招 ----------
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const d = he0(e, raw, o);
    if (e && e.tdummy && here()) { add(d > 0 ? d : 0); e.hp = e.hpMax; e.dead = false; }
    return d;
  };
  const nameOf = id => (id && R.SKILLS[id] ? R.SKILLS[id].name : '技能');
  const us0 = R.useSkill;
  R.useSkill = (...a) => { const P = W().P, b = P && P.skillCd, m = P && P.mp, r = us0(...a); if (here() && P && (P.skillCd > (b || 0) + 0.01 || P.mp < m)) T.last = { name: nameOf(P.skill), dmg: 0 }; return r; };
  const cs0 = R.castSlot;
  R.castSlot = i => { const P = W().P, b = P && P.skCd ? P.skCd[i] || 0 : 0, m = P && P.mp, r = cs0(i); if (here() && P && i > 0 && ((P.skCd && (P.skCd[i] || 0) > b + 0.01) || P.mp < m)) T.last = { name: nameOf(R.slotSkill ? R.slotSkill(P, i) : null), dmg: 0 }; return r; };

  // ---------- 每一格 ----------
  let showT = 0;
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), run = here(), P = W().P;
    if (!run || !P) { if (panel && !panel.hidden && !here()) panel.hidden = true; return r; }
    T.t += dt; keep();
    if (T.nocd) { P.skillCd = 0; if (P.skCd) P.skCd = P.skCd.map(() => 0); P.mp = P.mpMax; P.ult = 100; }
    P.hp = P.hpMax;
    T.log = T.log.filter(x => T.t - x[0] <= 6);
    showT -= dt; if (showT <= 0) { showT = 0.25; show(); }
    return r;
  };

  // ---------- 公會一樓的入口：往二樓的樓梯腳下（西北角） ----------
  const pp0 = R.placePeople;
  R.placePeople = (kind, api) => {
    const r = pp0 ? pp0(kind, api) : undefined;
    try {
      if (kind === 'guild' && api && api.ins && api.inter) {
        const m = R.makeBeast('tdummy'); m.g.position.set(DOOR.x, 0, DOOR.z - 1.2); api.ins.group.add(m.g);   // 往二樓的樓梯（西北角）腳下、樓梯的東邊
        api.inter(DOOR.x, DOOR.z, 1.7, '公會後院・訓練場（打木樁，試試技能）', () => R.trainEnter());
      }
    } catch (e) { console.warn('[training]', e); }
    return r;
  };

  const css = document.createElement('style');
  css.textContent = '#tr-panel{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:30;background:rgba(20,16,12,.86);border:1px solid #C9A13A;border-radius:10px;padding:6px 12px;color:#F1E9DA;font-size:13px;max-width:min(680px,calc(100vw - 32px));text-align:center}'
    + '#tr-panel>b{color:#E8C04A}.tr-num{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 14px;margin:4px 0}.tr-num em{font-style:normal;font-weight:bold;color:#FFE08A;margin-left:4px}.tr-row{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}';
  document.head.appendChild(css);
})(window.R);
