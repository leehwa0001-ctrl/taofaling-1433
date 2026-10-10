// 遺跡的存檔點（作者 2026-10-04：5 層或每 8 層有個存檔點）——每 5 層一個。
// - 第 5、10、15……層的入口房間有一塊公會的記錄碑（發藍光的石柱）。走過去按空白鍵「記下這一層」：
//   存在 R.S.waypoints[遺跡 id]（記最深的那一層）、R.S.waypointList[遺跡 id]＝記過的每一層。
// - 下一次進同一座遺跡，入口那一層（第 0 層休息區，沒有的話是第 1 層）多一個「存檔點：直接到第 N 層」，一下子就到記下的那一層。
//   委託照算（巡查的層數、時間從那裡開始算）；觀光遺跡、狩獵場沒有。
// - 2026-10-05 作者：打倒領主體後記錄當前深度，該深度「以淺」的存檔點（含目前這一層）全部可用——
//   中間忘了按記錄碑也不會卡。R.unlockSaveDepth(遺跡 id, 畫面層數, run) 給 lordfloor.js 用。
// - 從存檔點傳送：R.loadFloor(f, { warp: 1 })，委託板的「運送補給」不把傳送算進去。
// - 2026-10-11 作者：哈米莉亞級、阿彌勒級的第 0 層只剩一個大房間（hub）。營火旁紫色的轉送碑拿掉，改成房間前方（北邊）一整排往下的樓梯：
//   這座遺跡每個存檔點一座（不管記過沒有，深的在左），最右邊多一座「第 1 層」（從頭走）；每座樓梯後面一塊記錄碑——記過＝綠、沒記過＝紅，
//   碑的上方標著從那裡下去會到第幾層。走記過的樓梯直接到那一層；走沒記過的樓梯，會被傳回入口的樓梯前。碰記錄碑可以選記過的任一層。
//   回歸水晶移到房間右邊（原本在北邊正中間，會擋到那一排）。dungeon.js 的擺設避開 F.keepOut。
// 放在 restfloor.js、ruinvar.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, EVERY = 5;
  const has0 = run => !!run.f0;
  const shown = run => has0(run) ? run.floor : run.floor + 1;   // 畫面上的「第幾層」
  const floorOf = (run, n) => has0(run) ? n : n - 1;
  const ok = run => run && run.site && run.site.id !== 'kanko' && run.grade && run.grade.id !== 'hunt' && !run.site.outdoor;
  const wp = () => { const s = S(); s.waypoints = s.waypoints || {}; return s.waypoints; };
  // 記過的每一層（2026-10-04 作者：存檔點可以選擇紀錄過的層數）。R.S.waypointList[遺跡 id] = [5, 10, 15……]；以前只記最深那一層的存檔也算進去
  const wl = id => { const s = S(); s.waypointList = s.waypointList || {}; const L = s.waypointList[id] = s.waypointList[id] || []; const b = wp()[id]; if (b && !L.includes(b)) L.push(b); L.sort((a, c) => a - c); return L; };
  // 記到 depth（畫面「第幾層」）：目前這一層 + 該深度以淺的所有存檔點間隔層（每 saveEvery 一層）都可用
  R.unlockSaveDepth = (id, depth, run) => {
    if (!id || !(depth > 0)) return [];
    const every = (run && R.saveEvery) ? R.saveEvery(run) : EVERY, m = wp(), L = wl(id), added = [];
    const add = n => { if (n >= 3 && !L.includes(n)) { L.push(n); added.push(n); } };
    if (every > 0) for (let n = every; n <= depth; n += every) add(n);
    L.sort((a, c) => a - c);
    const deepest = every > 0 ? Math.floor(depth / every) * every : 0; if (deepest >= 3 && deepest > (m[id] || 0)) m[id] = deepest;
    if (added.length) R.save && R.save();
    return added;
  };
  const free = (x, z) => { const F = W().F, t = F && F.tile; if (t) { const tx = t.tX(x), tz = t.tZ(z); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (t.T[t.id(tx + dx, tz + dz)] !== 1) return false; } return !(R.pointBlocked && R.pointBlocked(x, z)); };
  const placeNear = (r, prefer) => { for (const [dx, dz] of prefer) { const x = r.x + dx, z = r.z + dz; if (free(x, z)) return [x, z]; } return R.roomPoint ? R.roomPoint(r, {}) : [r.x, r.z]; };
  const SPOTS = [[-3.6, -2.4], [3.6, -2.4], [-3.6, 2.6], [3.6, 2.6], [0, -3.4], [-5, 0], [5, 0], [0, 3.6]];
  const WARP_SPOTS = [[4.6, -3.6], [-4.6, -3.6], [5.4, 0.6], [-5.4, 0.6], [3, -5], [-3, -5], [0, -4.6]];   // 第 0 層休息區的營火、勇者在房間中間，離遠一點

  // ---------- 第 0 層只有一個大房間（哈米莉亞級、阿彌勒級） ----------
  const hubOn = run => ok(run) && !!(run.grade && run.grade.floor0) && (run.grade.id === 'hamilia' || run.grade.id === 'amile');
  // 這座遺跡所有的存檔點（畫面上的第幾層）：每 saveEvery 層一個（跟 build() 放記錄碑的規則一樣）
  const allSaves = run => { const every = R.saveEvery ? R.saveEvery(run) : EVERY, L = []; if (every > 0) for (let n = every; floorOf(run, n) < run.floors; n += every) if (n >= 3) L.push(n); return L; };
  const gfH = R.genFloor;
  R.genFloor = (run, f) => {
    const F = gfH(run, f);
    if (f !== 0 || !hubOn(run) || !F.rooms || !F.rooms[0]) return F;
    const st = F.rooms[0];
    Object.assign(st, { i: 0, gx: 0, gy: 0, links: {}, x: 0, z: 0, hx: 18, hz: 14, shape: 'hall', type: 'start', rest: 1, cleared: true, visited: false, dist: 0 }); delete st.big;
    st.w = st.hx * 2; st.h = st.hz * 2;
    const H = Object.assign({}, F, { rooms: [st], hub: true, rest: true, links: undefined, tile: undefined });
    // 那一排：深的在左，最右邊是第 1 層
    const saves = allSaves(run), list = saves.slice().reverse().map(n => ({ n, save: true })).concat([{ n: 1, save: false }]);
    const cnt = list.length, sp = Math.min(5.6, (st.hx * 2 - 6) / cnt), zS = st.z - st.hz + 6.2, zT = st.z - st.hz + 2.4;
    list.forEach((it, i) => { it.x = st.x - (cnt - 1) / 2 * sp + i * sp; it.zS = zS; it.zT = zT; it.f = floorOf(run, it.n); });
    H.hubRow = list;
    H.keepOut = []; list.forEach(it => { H.keepOut.push([it.x, it.zS, 2.4]); if (it.save) H.keepOut.push([it.x, it.zT, 1.4]); });
    R.carve(H, run);
    return H;
  };
  // 回歸水晶：第 0 層大房間裡移到右邊（不擋那一排）
  const ac0 = R.addCrystal;
  R.addCrystal = (group, F, x, z, room) => {
    if (F && F.hub && F.f === 0 && F.rooms && F.rooms[0] && F.tile) { const r = F.rooms[0]; [x, z] = R.nearestFloorLocal ? R.nearestFloorLocal(F.tile, r.x + r.hx - 4.5, r.z + 2) : [r.x + r.hx - 4.5, r.z + 2]; }
    return ac0(group, F, x, z, room);
  };

  const build = () => {
    const w = W(), run = w.run, F = w.F; if (!ok(run) || !F || !F.group || !F.rooms || !F.rooms[0]) return;
    F.save = null; F.warp = null;
    const TH = THREE, r = F.rooms[0], n = shown(run);
    // 記錄碑：灰色的石碑，正面刻著發光的符文（和回歸水晶的浮空水晶分得出來）
    const stone = (x, z, col) => {
      const g = new TH.Group(), m = new TH.Mesh(new TH.BoxGeometry(1.1, 1.9, 0.4), new TH.MeshLambertMaterial({ color: '#7A8090' })); m.position.y = 0.95; m.castShadow = true; g.add(m);
      const cap = new TH.Mesh(new TH.BoxGeometry(1.3, 0.2, 0.55), new TH.MeshLambertMaterial({ color: '#5A6070' })); cap.position.y = 1.98; g.add(cap);
      const top = new TH.Mesh(new TH.PlaneGeometry(0.62, 1.1), new TH.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 })); top.position.set(0, 1.05, 0.205); g.add(top);
      const ring = new TH.Mesh(new TH.RingGeometry(0.8, 1.0, 20), new TH.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5, depthWrite: false, side: TH.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
      const L = new TH.PointLight(col, 0.8, 8, 1.6); L.position.set(0, 1.4, 0.6); g.add(L);
      g.position.set(x, 0, z); F.group.add(g); R.addBox(x - 0.6, x + 0.6, z - 0.25, z + 0.25, 'deco');
      return { g, top, ring, x, z };
    };
    // 每 5 層：記錄碑
    const every = R.saveEvery ? R.saveEvery(run) : EVERY;   // depth.js：層數少的 3 層一個、多的 8 層一個
    if (n > 0 && n % every === 0) { const [x, z] = placeNear(r, SPOTS); F.save = Object.assign(stone(x, z, '#7AC8FF'), { n }); setTimeout(() => { if (W().F === F && R.toast) R.toast('這一層有存檔點：入口房間發藍光的記錄碑，走過去按空白鍵記下。', '#7AC8FF'); }, 1600); }
    else if (run.floor === 0 && every > 0) setTimeout(() => { if (W().F === F && R.toast) R.toast('這座遺跡每 ' + every + ' 層有一個存檔點（第 ' + every + ' 層的入口房間）。', '#7AC8FF'); }, 2600);
    // 入口那一層：轉送到記下的那一層
    const raw = wl(run.site.id), list = raw.filter(n => n >= 3 && n % every === 0 && floorOf(run, n) < run.floors), entry = 0;
    if (list.length !== raw.length) { const store = S().waypointList[run.site.id]; store.splice(0, store.length, ...list); wp()[run.site.id] = list.length ? list[list.length - 1] : 0; R.save && R.save(); }
    if (run.floor === entry && list.length && !F.hub) { const [x, z] = placeNear(r, WARP_SPOTS); F.warp = Object.assign(stone(x, z, '#B88AFF'), { n: list[list.length - 1], list }); }
    if (F.hub && F.hubRow) buildRow(F, run, stone, list);
  };
  // 一排樓梯＋記錄碑＋層數的牌子
  const label = (txt, col) => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
    g.font = '900 44px "Segoe UI","Microsoft JhengHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = '#0A0806'; g.strokeText(txt, 64, 34); g.fillStyle = col; g.fillText(txt, 64, 34);
    const t = new THREE.CanvasTexture(c), m = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
    m.scale.set(2.2, 1.1, 1); return m;
  };
  const GREEN = '#5AE88A', RED = '#E85A5A';
  const buildRow = (F, run, stone, rec) => {
    const TH = THREE, th = R.theme ? R.theme(run) : { wall: '#6A6A6A', accent: '#FFE08A' };
    F.hubRow.forEach(it => {
      it.open = !it.save || rec.includes(it.n);
      const col = !it.save ? '#F4E9CD' : it.open ? GREEN : RED;
      // 樓梯：黑洞＋往下的台階＋發光的框（記過綠、沒記過紅、第 1 層照遺跡的顏色）
      const g = new TH.Group();
      const hole = new TH.Mesh(new TH.BoxGeometry(3.2, 0.05, 3.2), new TH.MeshBasicMaterial({ color: '#05030A' })); hole.position.y = 0.02; g.add(hole);
      for (let i = 0; i < 4; i++) { const s = new TH.Mesh(new TH.BoxGeometry(2.6 - i * 0.4, 0.06, 0.5), new TH.MeshLambertMaterial({ color: th.wall })); s.position.set(0, 0.05 - i * 0.01, -1 + i * 0.58); g.add(s); }
      const ec = it.save ? col : th.accent, edge = new TH.Mesh(new TH.TorusGeometry(1.95, 0.07, 4, 4), new TH.MeshLambertMaterial({ color: ec, emissive: ec, emissiveIntensity: 0.8 }));
      edge.rotation.set(Math.PI / 2, 0, Math.PI / 4); edge.position.y = 0.1; g.add(edge);
      g.position.set(it.x, 0, it.zS); F.group.add(g); it.g = g;
      // 記錄碑（存檔點才有）、上方的層數
      if (it.save) it.stone = stone(it.x, it.zT, col);
      const lb = label(String(it.n), col); lb.position.set(it.x, it.save ? 3.1 : 1.9, it.save ? it.zT : it.zS - 2.2); F.group.add(lb);
    });
  };
  let hubLock = 0;
  const hubGo = fn => { const t = performance.now(); if (t < hubLock || (R.stairBusy && R.stairBusy())) return; hubLock = t + 60000; R.fade(() => { try { fn(); } finally { hubLock = performance.now() + 700; } }); };
  const hubStair = it => {
    const run = W().run; if (!run) return;
    if (!it.save) { hubGo(() => R.loadFloor(1)); return; }
    if (it.open) { hubGo(() => { R.loadFloor(it.f, { warp: 1 }); R.banner(R.floorLabel ? R.floorLabel(W().run) : '第 ' + it.n + ' 層', '從存檔點的樓梯下來了'); }); return; }
    // 沒記過：被傳回入口的樓梯前
    hubGo(() => {
      const P = W().P, F = W().F; if (!P || !F) return;
      const up = F.up || { x: F.rooms[0].x, z: F.rooms[0].z + F.rooms[0].hz - 2.6 };
      [P.x, P.z] = R.nearestFloor(up.x, up.z - 3); P.y = 0; P.yaw = Math.PI;
      (W().allies || []).forEach((a, i) => { if (!a.downed) { [a.x, a.z] = R.nearestFloor(up.x + (i % 2 ? 1.6 : -1.6), up.z - 3.5); if (a.h && a.h.g) a.h.g.position.set(a.x, 0, a.z); } });
      if (R.placeCam) R.placeCam(null);
      R.toast('第 ' + it.n + ' 層的存檔點還沒記過——樓梯把你送回了入口。', RED);
    });
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf0(f, o); try { build(); } catch (e) { console.warn('[savepoint]', e); } return r; };

  const record = () => {
    const run = W().run, F = W().F; if (!F || !F.save) return;
    const m = wp(), id = run.site.id, n = F.save.n, was = m[id] || 0, L = wl(id), fresh = !L.includes(n);
    if (n > was) m[id] = n; if (fresh) { L.push(n); L.sort((a, c) => a - c); } R.save();
    R.sfx && R.sfx('magic'); if (R.fx) R.fx('spawn', F.save.x, 0.1, F.save.z, { color: '#7AC8FF' });
    R.toast(fresh ? '存檔點：記下了第 ' + n + ' 層。下次進「' + run.site.name + '」，入口可以選這一層直接過去。' : '這一層之前記過了（記過：第 ' + L.join('、') + ' 層）。', '#7AC8FF');
  };
  const warp = L => {
    const run = W().run, F = W().F; if (!F || (!F.warp && !L)) return;
    const list = L || F.warp.list || [F.warp.n];
    if (!list.length) { R.toast('這座遺跡還沒有記過的存檔點。走到存檔點那一層，按記錄碑記下來。', '#7AC8FF'); return; }
    R.sheet('<p class="kicker">公會的轉送陣</p><h2>存檔點：選一層過去</h2><p>記錄碑記得你在這座遺跡記過的樓層。要從哪一層開始？</p><p class="note">中間的樓層就不會經過了（寶箱、經驗也一樣）。</p>'
      + '<div class="row sp-list">' + list.slice().reverse().map((n, i) => '<button type="button" class="btn' + (i ? '' : ' pri') + '" data-spgo="' + n + '">第 ' + n + ' 層</button>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn" id="sp-no">從頭走</button></div>');
    document.getElementById('sp-no').onclick = R.closeSheet;
    document.querySelectorAll('[data-spgo]').forEach(b => { b.onclick = () => { const n = +b.dataset.spgo, f = floorOf(run, n); R.closeSheet(); if (R.stairBusy && R.stairBusy()) return; R.fade(() => { R.loadFloor(f, { warp: 1 }); R.banner(R.floorLabel ? R.floorLabel(W().run) : '第 ' + n + ' 層', '從存檔點過來了'); }); }; });
  };
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => {
    const best = ni0(), P = W().P, F = W().F; if (!P || !F) return best;
    let bd = best ? Math.hypot(best.x - P.x, best.z - P.z) : 1e9, mine = null;
    if (F.save) { const d = Math.hypot(F.save.x - P.x, F.save.z - P.z); if (d < 2 && (d < bd || d < 1.6)) { bd = d; mine = { x: F.save.x, z: F.save.z, r: 2, label: '存檔點（公會的記錄碑）：記下第 ' + F.save.n + ' 層', act: record }; } }
    if (F.warp) { const d = Math.hypot(F.warp.x - P.x, F.warp.z - P.z); if (d < 2 && (d < bd || d < 1.6)) { bd = d; mine = { x: F.warp.x, z: F.warp.z, r: 2, label: '存檔點：選一層直接過去（記過 ' + (F.warp.list || [F.warp.n]).length + ' 層）', act: () => warp() }; } }
    // 第 0 層那一排：樓梯、記錄碑
    if (F.hub && F.hubRow) F.hubRow.forEach(it => {
      const ds = Math.hypot(it.x - P.x, it.zS - P.z);
      if (ds < 2.3 && ds < bd) { bd = ds; mine = { x: it.x, z: it.zS, r: 2.3, label: !it.save ? '走下樓層通道（第 1 層，從頭走）' : it.open ? '往下：直接到第 ' + it.n + ' 層（存檔點記過了）' : '往下：第 ' + it.n + ' 層（存檔點還沒記過，會被送回入口）', act: () => hubStair(it) }; }
      if (!it.save) return;
      const dt = Math.hypot(it.x - P.x, it.zT + 0.9 - P.z);
      if (dt < 1.9 && dt < bd) { bd = dt; const L = wl(W().run.site.id).filter(n => F.hubRow.some(o => o.save && o.n === n)); mine = { x: it.x, z: it.zT + 0.9, r: 1.9, label: '記錄碑（第 ' + it.n + ' 層' + (it.open ? '，記過了' : '，還沒記過') + '）：選一層直接過去', act: () => warp(L) }; }
    });
    return mine || best;
  };
  // 符文一亮一暗
  const st0 = R.step;
  R.step = dt => { st0(dt); const F = W().F; if (!F) return; [F.save, F.warp].concat(F.hubRow ? F.hubRow.map(it => it.stone) : []).forEach(o => { if (!o) return; const k = 0.6 + 0.3 * Math.sin(performance.now() / 400); o.top.material.opacity = k; o.ring.material.opacity = k * 0.6; }); };
})(window.R);
