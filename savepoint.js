// 遺跡的存檔點（作者 2026-10-04：5 層或每 8 層有個存檔點）——每 5 層一個。
// - 第 5、10、15……層的入口房間有一塊公會的記錄碑（發藍光的石柱）。走過去按空白鍵「記下這一層」：
//   存在 R.S.waypoints[遺跡 id]（記最深的那一層）。
// - 下一次進同一座遺跡，入口那一層（第 0 層休息區，沒有的話是第 1 層）多一個「存檔點：直接到第 N 層」，一下子就到記下的那一層。
//   委託照算（巡查的層數、時間從那裡開始算）；觀光遺跡、狩獵場沒有。
// 放在 restfloor.js、ruinvar.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, EVERY = 5;
  const has0 = run => !!run.f0;
  const shown = run => has0(run) ? run.floor : run.floor + 1;   // 畫面上的「第幾層」
  const floorOf = (run, n) => has0(run) ? n : n - 1;
  const ok = run => run && run.site && run.site.id !== 'kanko' && run.grade && run.grade.id !== 'hunt' && !run.site.outdoor;
  const wp = () => { const s = S(); s.waypoints = s.waypoints || {}; return s.waypoints; };
  const free = (x, z) => { const F = W().F, t = F && F.tile; if (t) { const tx = t.tX(x), tz = t.tZ(z); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (t.T[t.id(tx + dx, tz + dz)] !== 1) return false; } return !(R.pointBlocked && R.pointBlocked(x, z)); };
  const placeNear = (r, prefer) => { for (const [dx, dz] of prefer) { const x = r.x + dx, z = r.z + dz; if (free(x, z)) return [x, z]; } return R.roomPoint ? R.roomPoint(r, {}) : [r.x, r.z]; };
  const SPOTS = [[-3.6, -2.4], [3.6, -2.4], [-3.6, 2.6], [3.6, 2.6], [0, -3.4], [-5, 0], [5, 0], [0, 3.6]];
  const WARP_SPOTS = [[4.6, -3.6], [-4.6, -3.6], [5.4, 0.6], [-5.4, 0.6], [3, -5], [-3, -5], [0, -4.6]];   // 第 0 層休息區的營火、勇者在房間中間，離遠一點

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
    const best = wp()[run.site.id] || 0, entry = has0(run) ? 0 : 0;
    if (run.floor === entry && best >= 3 && floorOf(run, best) < run.floors) { const [x, z] = placeNear(r, WARP_SPOTS); F.warp = Object.assign(stone(x, z, '#B88AFF'), { n: best }); }
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf0(f, o); try { build(); } catch (e) { console.warn('[savepoint]', e); } return r; };

  const record = () => {
    const run = W().run, F = W().F; if (!F || !F.save) return;
    const m = wp(), id = run.site.id, n = F.save.n, was = m[id] || 0;
    if (n > was) { m[id] = n; R.save(); }
    R.sfx && R.sfx('magic'); if (R.fx) R.fx('spawn', F.save.x, 0.1, F.save.z, { color: '#7AC8FF' });
    R.toast(n > was ? '存檔點：記下了第 ' + n + ' 層。下次進「' + run.site.name + '」，入口可以直接到這一層。' : '這一層之前記過了（記到第 ' + was + ' 層）。', '#7AC8FF');
  };
  const warp = () => {
    const run = W().run, F = W().F; if (!F || !F.warp) return;
    const n = F.warp.n, f = floorOf(run, n);
    R.sheet('<p class="kicker">公會的轉送陣</p><h2>存檔點：第 ' + n + ' 層</h2><p>記錄碑記得你走到過第 ' + n + ' 層。要直接過去嗎？</p><p class="note">中間的樓層就不會經過了（寶箱、經驗也一樣）。</p>',
      '<div class="row"><button type="button" class="btn pri" id="sp-go">直接到第 ' + n + ' 層</button><button type="button" class="btn" id="sp-no">從頭走</button></div>');
    document.getElementById('sp-no').onclick = R.closeSheet;
    document.getElementById('sp-go').onclick = () => { R.closeSheet(); if (R.stairBusy && R.stairBusy()) return; R.fade(() => { R.loadFloor(f); R.banner(R.floorLabel ? R.floorLabel(W().run) : '第 ' + n + ' 層', '從存檔點過來了'); }); };
  };
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => {
    const best = ni0(), P = W().P, F = W().F; if (!P || !F) return best;
    let bd = best ? Math.hypot(best.x - P.x, best.z - P.z) : 1e9, mine = null;
    if (F.save) { const d = Math.hypot(F.save.x - P.x, F.save.z - P.z); if (d < 2 && (d < bd || d < 1.6)) { bd = d; mine = { x: F.save.x, z: F.save.z, r: 2, label: '存檔點（公會的記錄碑）：記下第 ' + F.save.n + ' 層', act: record }; } }
    if (F.warp) { const d = Math.hypot(F.warp.x - P.x, F.warp.z - P.z); if (d < 2 && (d < bd || d < 1.6)) { bd = d; mine = { x: F.warp.x, z: F.warp.z, r: 2, label: '存檔點：直接到第 ' + F.warp.n + ' 層', act: warp }; } }
    return mine || best;
  };
  // 符文一亮一暗
  const st0 = R.step;
  R.step = dt => { st0(dt); const F = W().F; if (!F) return; [F.save, F.warp].forEach(o => { if (!o) return; const k = 0.6 + 0.3 * Math.sin(performance.now() / 400); o.top.material.opacity = k; o.ring.material.opacity = k * 0.6; }); };
})(window.R);
