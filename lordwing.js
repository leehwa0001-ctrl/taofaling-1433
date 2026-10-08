// 領主體的樓層改成一條長廊（2026-10-08 作者：照第 20 章——領主體房間加大；是一條長廊，中間幾間房間放小怪，讓玩家沒辦法滿狀態打領主體；
//   打完領主體才看得到樓梯、傳送水晶、寶箱）
// - 有領主體的那一層：從離入口最遠的那一區往外接出一條直的「領主長廊」：
//   小怪房 ×2～3（分區 9 個以上 3 間）→ 領主大廳（佔兩格，兩側一排柱子）→ 出口（樓梯、傳送水晶）。
//   原本最遠那一區不再是樓梯，改成一般的戰鬥區；這一層別的樓層通道（stairs2.js 多出來的）也拿掉——只能從領主大廳後面下去。
// - 出口的門被領主體的力量封著（白底金邊的大門）；裡面的樓梯、水晶、寶箱都看不到，地圖上也不標。領主體倒下：門沉進地板，東西一起出現。
// - 打倒領主體的金寶箱放在出口（原本放在領主大廳）。
// - 長廊接不出去（四個方向都被別的房間擋住）就照舊：領主體守在通往樓梯的路上（lordfloor.js）。
// 放在 dungeon.js、zones.js、lordfloor.js、kasoplus.js 後面（包 R.carve、R.genFloor、R.buildFloor、R.onBossDown 最外面）。
(function (R) {
  const W = () => R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const C = R.CELL || { CW: 38, CH: 32, TS: 2 }, CW = C.CW, CH = C.CH;
  const DIRS = [[0, -1, 'n'], [1, 0, 'e'], [0, 1, 's'], [-1, 0, 'w']], OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
  const want = (run, F) => {
    const g = run && run.grade; if (!g || !g.lords || !F || F.last || g.id === 'hunt' || (run.site && run.site.id === 'kanko') || !R.lordFloorsOf) return false;
    return R.lordFloorsOf(run).includes(F.f);
  };
  const boxOf = r => [r.x - r.hx, r.x + r.hx, r.z - r.hz, r.z + r.hz];
  const clash = (b, rooms, pad) => rooms.some(o => { const c = boxOf(o); return b[0] < c[1] + pad && b[1] > c[0] - pad && b[2] < c[3] + pad && b[3] > c[2] - pad; });

  // ---------- 配置：在挖地形之前接上長廊 ----------
  const plan = (F, run) => {
    const rooms = F.rooms, form = R.FORM[run.type] || R.FORM.city, calm = () => (Array.isArray(form.calm) ? pick(form.calm) : form.calm);
    const k = rooms.length >= 9 ? 3 : 2;
    const ends = rooms.filter(r => r.i > 0).sort((a, b) => (b.type === 'stairs') - (a.type === 'stairs') || b.dist - a.dist).slice(0, 5);
    for (const E of ends) {
      for (const d of DIRS.slice().sort(() => rnd() - 0.5)) {
        const horiz = !!d[0], cell = i => [E.gx + d[0] * i, E.gy + d[1] * i], at = i => { const [gx, gy] = cell(i); return [gx * CW, gy * CH]; };
        const L = [];
        for (let i = 1; i <= k; i++) { const [x, z] = at(i), hx = horiz ? 9.5 : 10.5, hz = horiz ? 8.5 : 8; L.push({ role: 'mob', gx: cell(i)[0], gy: cell(i)[1], x, z, hx: hx + rnd() * 1.5, hz: hz + rnd() * 1, shape: run.type === 'tower' || run.type === 'island' ? 'circle' : pick(['rect', 'hall', 'octagon']) }); }
        { const [x1, z1] = at(k + 1), [x2, z2] = at(k + 2); L.push({ role: 'hall', gx: cell(k + 1)[0], gy: cell(k + 1)[1], x: (x1 + x2) / 2, z: (z1 + z2) / 2, hx: horiz ? CW / 2 + 11 : 16.5, hz: horiz ? 14.5 : CH / 2 + 10, shape: form.boss }); }
        { const [x, z] = at(k + 3); L.push({ role: 'exit', gx: cell(k + 3)[0], gy: cell(k + 3)[1], x, z, hx: 9.5, hz: 8, shape: calm() }); }
        if (L.some(o => clash(boxOf(o), rooms, 5))) continue;
        // 接上
        let prev = E;
        L.forEach((o, j) => {
          const r = Object.assign({ i: rooms.length, links: {}, seed: rnd() * 10, dist: E.dist + j + 1, visited: false, cleared: false, wing: 1 }, o);
          r.w = r.hx * 2; r.h = r.hz * 2; delete r.role;
          if (o.role === 'mob') { r.type = 'wing'; r.big = 1; }   // big：大空洞（zones.js）不會打通這幾間；挖完地形就拿掉
          else if (o.role === 'hall') { r.type = 'lord'; r.wingHall = 1; }
          else { r.type = 'stairs'; r.cleared = true; r.wingExit = 1; r.wingHide = true; }
          prev.links[d[2]] = r.i; r.links[OPP[d[2]]] = prev.i; rooms.push(r); prev = r;
        });
        if (E.type === 'stairs') { E.type = 'fight'; E.cleared = false; E.alt = 0; }
        const n = rooms.length;
        F.wing = { E: E.i, M: rooms.filter(r => r.wing && r.type === 'wing').map(r => r.i), H: n - 2, X: n - 1, dir: d[2] };
        return true;
      }
    }
    return false;
  };
  const cv0 = R.carve;
  R.carve = (F, run) => {
    let made = false;
    try { if (!F.wing && want(run, F)) made = plan(F, run); } catch (e) { console.warn('[lordwing]', e); }
    const out = cv0(F, run);
    if (made) F.rooms.forEach(r => { if (r.wing && r.type === 'wing') delete r.big; });
    return out;
  };
  // ---------- 別的檔案挑完房間以後：只留長廊裡那一個領主、出口那一條樓梯 ----------
  const gf0 = R.genFloor;
  R.genFloor = (run, f) => {
    const F = gf0(run, f), w = F && F.wing; if (!w) return F;
    F.rooms.forEach(r => {
      if (r.type === 'wing') r.type = 'fight';
      else if (r.type === 'lord' && r.i !== w.H) r.type = 'fight';
      else if (r.type === 'stairs' && r.i !== w.X) { r.type = 'fight'; r.alt = 0; r.cleared = false; }
    });
    F.rooms[w.H].type = 'lord'; F.rooms[w.X].type = 'stairs';
    F.lordGate = { room: w.H, down: false };
    return F;
  };

  // ---------- 蓋：出口裡的東西藏起來、門封著 ----------
  const bf0 = R.buildFloor;
  R.buildFloor = (scene, run, F) => {
    const w = F && F.wing; if (!w || !window.THREE) return bf0(scene, run, F);
    const X = F.rooms[w.X], t = F.tile, doors = new Set(X.doors || []);
    const inX = (x, z) => { const tx = t.tX(x), tz = t.tZ(z); if (tx < 0 || tz < 0 || tx >= t.nx || tz >= t.nz) return false; const k = t.id(tx, tz); return t.RM[k] === X.i || doors.has(k); };
    const O = THREE.Object3D.prototype, add0 = O.add, hid = [];
    O.add = function (...objs) { objs.forEach(o => { if (o && o.position && inX(o.position.x, o.position.z)) hid.push(o); }); return add0.apply(this, objs); };
    let out; try { out = bf0(scene, run, F); } finally { O.add = add0; }
    try {
      hid.forEach(o => { o.visible = false; });
      F.wingHid = hid; X.wingHide = true;
      // 封住出口的大門：每一格門口一塊（白色、金邊，跟大廳的柱子一樣）
      const TS = t.TS, white = new THREE.MeshLambertMaterial({ color: '#E8E4DA' }), gold = new THREE.MeshLambertMaterial({ color: '#C8A040', emissive: '#6A4A10', emissiveIntensity: 0.5 }), seal = new THREE.MeshBasicMaterial({ color: '#C83A3A', transparent: true, opacity: 0.55 });
      F.wingGate = (X.doors || []).map(k => {
        const tx = k % t.nx, tz = (k - tx) / t.nx, x = t.cX(tx), z = t.cZ(tz), g = new THREE.Group();
        const slab = new THREE.Mesh(new THREE.BoxGeometry(TS, 3.6, TS), white); slab.position.y = 1.8; g.add(slab);
        [0.3, 3.3].forEach(y => { const b = new THREE.Mesh(new THREE.BoxGeometry(TS + 0.1, 0.18, TS + 0.1), gold); b.position.y = y; g.add(b); });
        const rune = new THREE.Mesh(new THREE.BoxGeometry(TS + 0.12, 0.5, TS + 0.12), seal); rune.position.y = 1.9; g.add(rune);
        g.position.set(x, 0, z); add0.call(F.group, g);
        return { g, c: R.addBox(x - TS / 2, x + TS / 2, z - TS / 2, z + TS / 2, 'door') };
      });
    } catch (e) { console.warn('[lordwing]', e); }
    return out;
  };
  // 互動：靠近封著的門
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => {
    const it = ni0(), F = W().F, P = W().P;
    if (!it && F && F.wingGate && F.wingGate.length && P) { const g = F.wingGate.find(o => Math.hypot(o.g.position.x - P.x, o.g.position.z - P.z) < 2.6); if (g) return { x: g.g.position.x, z: g.g.position.z, r: 2.6, label: '門被領主體的力量封著', act: () => R.toast && R.toast('領主體倒下之前，這扇門打不開。', '#FF9A6A') }; }
    return it;
  };
  // ---------- 領主體倒下：門沉下去，樓梯、水晶、寶箱出現 ----------
  const open = F => {
    if (!F || !F.wing || F.wingOpen) return; F.wingOpen = true;
    const X = F.rooms[F.wing.X], run = W().run;
    (F.wingGate || []).forEach(o => { if (o.c) o.c.on = false; });
    let t = 0; const gates = F.wingGate || [];
    if (W().dyn) W().dyn.push(dt => { if (W().F !== F) return false; t += dt; const k = Math.min(1, t / 1.4); gates.forEach(o => { o.g.position.y = -3.8 * k; }); if (k >= 1) { gates.forEach(o => F.group.remove(o.g)); return false; } return true; });
    setTimeout(() => {
      if (W().F !== F || W().run !== run) return;
      (F.wingHid || []).forEach(o => { o.visible = true; }); X.wingHide = false;
      R.fx && R.fx('pillar', X.x, 0, X.z, { r: 2.4, color: '#FFE8A0' }); R.fx && R.fx('ring', X.x, 0.1, X.z, { r: 6, color: '#FFE8A0' });
      R.drawMinimap && R.drawMinimap(true);
    }, 900);
  };
  const bd0 = R.onBossDown;
  R.onBossDown = e => {
    const F = W().F, w = F && F.wing, lord = e && e.def && /^領主體/.test(e.def.name || '');
    if (!w || !lord) return bd0 ? bd0(e) : undefined;
    // 金寶箱、回歸水晶放在出口（run.js 照 R.roomOf 放）
    const ro0 = R.roomOf, X = F.rooms[w.X];
    R.roomOf = q => (q === e ? X : ro0(q));
    let r; try { r = bd0 ? bd0(e) : undefined; } finally { R.roomOf = ro0; }
    if (F.lordGate && F.lordGate.down) open(F);
    return r;
  };
  R.lordWingDebug = { want, open };
})(window.R);
