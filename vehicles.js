// 討伐令 1433：腳踏車和開車（作者：是不是沒有像 GTA 啊）
// - 腳踏車：站前廣場的租車亭（今天 8 費拉）或德克斯凡中古車行買一台（120 費拉）。B 鍵（手機：「騎車」鈕）上下車；
//   騎著的時候比跑步快，停在哪裡就在哪裡，要走回去才能再騎。
// - 汽車：德克斯凡中古車行買（輕型貨車、小轎車、跑車「疾風」）。停在車行前面（有家就停家門口）。
//   開車：W／↑ 油門、S／↓ 煞車和倒車、A D 轉彎（跟鏡頭的方向無關）；B 或空白鍵（停下來的時候）下車。鏡頭會拉遠。
//   撞到房子會彈回來；撞到路人的話，路人會被撞開，開太快的話衛兵會追你。
// - 搶車：路上停下來的德克斯凡貨車，可以把司機拉下來搶走（犯罪：通緝兩顆星）。
// 被通緝的時候開車，巡邏車和路障在 pursuit.js。
(function (R) {
  const W = R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const C = R.CITY, toS = v => v / C.S + 500, toW = s => (s - 500) * C.S;
  const S = () => R.S, P = () => W.P, tw = () => W.town;
  const MODELS = {
    van: { name: '輕型貨車', price: 600, max: 11, acc: 7, turn: 1.9, col: '#E8E8EC', len: 4.4, low: 0 },
    sedan: { name: '小轎車', price: 900, max: 14, acc: 9, turn: 2.2, col: '#3A5A8A', len: 4.2, low: 0 },
    sport: { name: '跑車「疾風」', price: 2400, max: 19, acc: 13, turn: 2.5, col: '#C8282A', len: 4.0, low: 1 },
    dex: { name: '德克斯凡的貨車', price: 0, max: 10, acc: 6, turn: 1.7, col: '#4A6A8A', len: 5.2, low: 0 }
  };
  const BIKE = { max: 0, mul: 1.5 };
  const V = { cur: null, list: [], zoom0: null, speed0: null, hitT: 0 };
  R.VEH = V;

  // ---------- 車子、腳踏車的樣子 ----------
  const lam = (c, o) => { const TH = THREE, m = new TH.MeshLambertMaterial({ color: c }); if (o && o.em) { m.emissive = new TH.Color(o.em); m.emissiveIntensity = o.ei || 1; } return m; };
  const box = (g, w, h, d, m, x, y, z) => { const TH = THREE, o = new TH.Mesh(new TH.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const carMesh = (model, col) => {
    const TH = THREE, M = MODELS[model], g = new TH.Group(), body = lam(col || M.col), dark = lam('#1A1A20'), glass = lam('#9AC8E8', { em: '#203040', ei: 0.4 });
    const L = M.len, lowH = M.low ? 0.15 : 0;
    if (model === 'van' || model === 'dex') { box(g, 2.0, 1.6, L * 0.62, body, 0, 1.2, L * 0.17); box(g, 1.95, 1.3, L * 0.38, body, 0, 1.05, -L * 0.31); box(g, 1.7, 0.55, 0.05, glass, 0, 1.45, -L * 0.5 - 0.01); }
    else { box(g, 2.0, 0.75 - lowH, L, body, 0, 0.7 - lowH / 2, 0); box(g, 1.75, 0.62 - lowH, L * 0.5, body, 0, 1.38 - lowH * 1.5, 0.15); box(g, 1.6, 0.48 - lowH, 0.05, glass, 0, 1.38 - lowH * 1.5, -L * 0.1 + 0.02); box(g, 1.6, 0.44 - lowH, 0.05, glass, 0, 1.38 - lowH * 1.5, L * 0.4 - 0.02); [-1, 1].forEach(s => box(g, 0.05, 0.4 - lowH, L * 0.4, glass, s * 0.88, 1.4 - lowH * 1.5, 0.15)); }
    if (model === 'sport') box(g, 2.0, 0.08, 0.4, dark, 0, 1.15, L * 0.48);   // 尾翼
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const w = new TH.Mesh(new TH.CylinderGeometry(0.38, 0.38, 0.3, 10), dark); w.rotation.z = Math.PI / 2; w.position.set(sx * 0.98, 0.38, sz * L * 0.33); g.add(w); });
    [-0.65, 0.65].forEach(x => { box(g, 0.4, 0.18, 0.05, lam('#FFF4C8', { em: '#FFE8A0', ei: 1 }), x, 0.85, -L / 2 - 0.02); box(g, 0.4, 0.16, 0.05, lam('#C8282A', { em: '#FF2A2A', ei: 0.8 }), x, 0.85, L / 2 + 0.02); });
    box(g, 1.7, 0.06, L * 0.4, lam('#F2F6F8'), 0, model === 'van' || model === 'dex' ? 2.03 : 1.72 - lowH * 1.5, 0.15);   // 車頂的雪
    return g;
  };
  const bikeMesh = col => {
    const TH = THREE, g = new TH.Group(), fr = lam(col || '#3A6ACF'), dk = lam('#1A1A20'), chrome = lam('#C8C8D0');
    [-0.55, 0.55].forEach(z => { const w = new TH.Mesh(new TH.TorusGeometry(0.33, 0.05, 6, 14), dk); w.rotation.y = Math.PI / 2; w.position.set(0, 0.36, z); g.add(w); });
    box(g, 0.07, 0.07, 1.0, fr, 0, 0.62, 0); box(g, 0.07, 0.42, 0.07, fr, 0, 0.5, 0.18); box(g, 0.07, 0.36, 0.07, fr, 0, 0.6, -0.5);
    box(g, 0.22, 0.06, 0.3, dk, 0, 0.74, 0.18); box(g, 0.56, 0.05, 0.05, chrome, 0, 0.82, -0.5); box(g, 0.34, 0.22, 0.26, lam('#8A8A92'), 0, 0.78, -0.72);   // 座墊、手把、菜籃
    return g;
  };

  V.carMesh = carMesh; V.MODELS = MODELS; V.box = box; V.lam = lam;   // 巡邏車、路障（pursuit.js）也用

  // ---------- 停著的車 ----------
  const blocked = (x, z, r) => R.col.list.some(b => b.on !== false && b.tag !== 'deco' && b.tag !== 'veh' && x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r);
  const freeNear = (x, z, r) => { for (let d = 0; d <= 10; d += 0.5) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, nx = x + Math.sin(a) * d, nz = z + Math.cos(a) * d; if (!blocked(nx, nz, r)) return [nx, nz]; } return null; };
  const park = (type, model, x, z, yaw, o) => {
    const t = tw(); if (!t) return null; const p = freeNear(x, z, type === 'car' ? 1.6 : 0.6) || [x, z];
    const g = type === 'car' ? carMesh(model, o && o.col) : bikeMesh(o && o.col); g.position.set(p[0], 0, p[1]); g.rotation.y = yaw || 0; t.group.add(g);
    const v = Object.assign({ type, model, g, x: p[0], z: p[1], yaw: yaw || 0, v: 0 }, o || {}); V.list.push(v);
    v.it = { get x() { return v.x; }, get z() { return v.z; }, r: type === 'car' ? 3 : 1.8, get label() { return type === 'car' ? (v.own ? '上車（開車）' : '開這台車') : '騎上腳踏車'; }, when: () => !V.cur && V.list.includes(v), act: () => mount(v) };
    solid(v); t.inter.push(v.it); return v;
  };
  const solid = v => { if (v.box) v.box.on = false; if (v.type !== 'car') return; const M = MODELS[v.model] || MODELS.sedan, c = Math.abs(Math.cos(v.yaw)), sn = Math.abs(Math.sin(v.yaw)), hx = c * 1.0 + sn * M.len / 2, hz = sn * 1.0 + c * M.len / 2; v.box = R.addBox(v.x - hx, v.x + hx, v.z - hz, v.z + hz, 'veh'); };
  const unpark = v => { if (v.box) v.box.on = false; const t = tw(); V.list = V.list.filter(o => o !== v); if (t && v.it) { const i = t.inter.indexOf(v.it); if (i >= 0) t.inter.splice(i, 1); } };

  // ---------- 上車、下車 ----------
  const exitIt = { get x() { return P() ? P().x : 0; }, get z() { return P() ? P().z : 0; }, r: 99, get label() { return V.cur && V.cur.type === 'car' ? '下車' : '下腳踏車'; }, when: () => !!V.cur && Math.abs(V.cur.v || 0) < 2.5, act: () => dismount() };
  const mount = v => {
    const Pl = P(), t = tw(); if (!Pl || !t || V.cur) return;
    unpark(v); V.cur = v; Pl.sit = false;
    if (v.type === 'car') { Pl.busy = true; Pl.h.g.visible = false; Pl.x = v.x; Pl.z = v.z; V.zoom0 = W.cam.zoomT; W.cam.zoomT = Math.max(W.cam.zoomT || 1, 1.55); (t.allies || []).forEach(a => { a.h.g.visible = false; }); R.toast('W／↑ 油門、S／↓ 煞車、A D 轉彎。停下來按 B 或空白鍵下車。'); }
    else { V.speed0 = Pl.speed; Pl.h.sit = true; v.yaw = Pl.yaw; R.toast('騎上腳踏車了。B 鍵下車。'); }
    if (!t.inter.includes(exitIt)) t.inter.push(exitIt);
    R.sfx && R.sfx(v.type === 'car' ? 'mine' : 'pick');
  };
  const dismount = () => {
    const v = V.cur, Pl = P(), t = tw(); if (!v || !Pl) return; V.cur = null;
    const i = t ? t.inter.indexOf(exitIt) : -1; if (i >= 0) t.inter.splice(i, 1);
    if (v.type === 'car') {
      const sx = Math.cos(v.yaw), sz = -Math.sin(v.yaw), p = freeNear(v.x + sx * 1.8, v.z + sz * 1.8, 0.45) || [v.x + sx * 1.8, v.z + sz * 1.8];
      Pl.x = p[0]; Pl.z = p[1]; Pl.busy = false; Pl.h.g.visible = true; Pl.h.g.position.set(Pl.x, 0, Pl.z); if (V.zoom0 != null) W.cam.zoomT = V.zoom0;
      (t.allies || []).forEach((a, k) => { a.x = Pl.x + (k ? 1 : -1); a.z = Pl.z + 0.8; a.h.g.visible = true; a.h.g.position.set(a.x, 0, a.z); });
      if (v.own && S()) { S().carPos = { x: v.x, z: v.z, yaw: v.yaw }; R.save && R.save(); }
    } else { Pl.h.sit = false; if (V.speed0) Pl.speed = V.speed0; Pl.h.g.position.y = 0; if (v.own && S()) { S().bikePos = { x: v.x, z: v.z }; } }
    v.v = 0; V.list.push(v); solid(v); if (t && v.it) t.inter.push(v.it);
  };
  R.inVehicle = () => V.cur;
  R.dismountVehicle = () => { if (V.cur) { V.cur.v = 0; dismount(); } };

  // ---------- 開車 ----------
  let hitMsgT = 0;
  const drive = (v, dt) => {
    const Pl = P(), I = R.input, M = MODELS[v.model] || MODELS.sedan, t = tw();
    let f = 0, s = 0;
    if (I.keys.w || I.keys.arrowup) f += 1; if (I.keys.s || I.keys.arrowdown) f -= 1; if (I.keys.a || I.keys.arrowleft) s -= 1; if (I.keys.d || I.keys.arrowright) s += 1;
    if (I.moveStick) { f -= I.moveStick.y; s += I.moveStick.x; }
    f = Math.max(-1, Math.min(1, f)); s = Math.max(-1, Math.min(1, s));
    const max = M.max * (R.carBoost || 1);
    if (f > 0) v.v += (v.v < 0 ? 16 : M.acc) * f * dt; else if (f < 0) v.v += (v.v > 0 ? -16 : -M.acc * 0.6) * -f * dt; else v.v *= Math.max(0, 1 - 1.2 * dt);
    v.v = Math.max(-max * 0.35, Math.min(max, v.v)); if (Math.abs(v.v) < 0.05 && !f) v.v = 0;
    v.yaw -= s * M.turn * dt * Math.max(-1, Math.min(1, v.v / 5));
    const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw), ox = v.x, oz = v.z;
    v.x += fx * v.v * dt; v.z += fz * v.v * dt;
    // 撞牆：前後兩個圓
    let bump = 0; const L = (M.len / 2 - 1.0);
    [L, -L].forEach(k => { const o = { x: v.x + fx * k, z: v.z + fz * k }, x0 = o.x, z0 = o.z; R.collide(o, 1.05); const px = o.x - x0, pz = o.z - z0; if (px || pz) { v.x += px; v.z += pz; bump = Math.max(bump, Math.hypot(px, pz)); } });
    if (bump > 0.02 && Math.abs(v.v) > 3) { v.v *= -0.25; if (hitMsgT <= 0) { R.sfx && R.sfx('mine'); hitMsgT = 0.6; } }
    // 路上的貨車
    (t.cars || []).forEach(c => { const d = Math.hypot(c.x - v.x, c.z - v.z); if (d < 3.1 && d > 0.01) { const k = (3.1 - d); v.x -= (c.x - v.x) / d * k; v.z -= (c.z - v.z) / d * k; if (Math.abs(v.v) > 3) { v.v *= -0.3; if (hitMsgT <= 0) { R.sfx && R.sfx('mine'); hitMsgT = 0.6; } } c.v = 0; } });
    // 路人：被撞開
    t.npcs.forEach(n => {
      if (n.off || !n.h.g.visible || n.chase) return; const dx = n.x - v.x, dz = n.z - v.z, al = dx * fx + dz * fz, sd = dx * -fz + dz * fx;
      if (Math.abs(al) < M.len / 2 + 0.6 && Math.abs(sd) < 1.5) {
        const side = sd >= 0 ? 1 : -1; n.x += -fz * side * 1.4; n.z += fx * side * 1.4; if (n.h) n.h.g.position.set(n.x, 0, n.z); if (n.walk) { n.flee = 2; n.tx = n.x - fz * side * 6; n.tz = n.z + fx * side * 6; }
        if (Math.abs(v.v) > 6 && !n.guard) { v.v *= 0.7; V.hitT = (V.hitT || 0); if (V.hitT <= 0) { V.hitT = 4; const Cr = R.crime; if (Cr) { Cr.heat = Math.min(3, Math.max(Cr.heat, 0) + 1); Cr.lostT = 0; if (R.alertGuards) R.alertGuards(v.x, v.z, 60); } R.banner('撞到人了！', '路人被撞倒在雪地上——衛兵往這裡來了（通緝 ' + '★'.repeat(R.crime ? R.crime.heat : 1) + '）'); R.sfx && R.sfx('swing'); } }
        else if (Math.abs(v.v) > 2 && hitMsgT <= 0) { hitMsgT = 1.5; R.toast('「哇！看路啊！」'); }
      }
    });
    hitMsgT -= dt; V.hitT -= dt;
    v.g.position.set(v.x, 0, v.z); v.g.rotation.y = v.yaw; v.g.rotation.z = -s * Math.min(1, Math.abs(v.v) / max) * 0.04;
    Pl.x = v.x; Pl.z = v.z; Pl.yaw = v.yaw + Math.PI; Pl.h.g.position.set(v.x, 0, v.z);
    // 速度表
    const el = document.getElementById('vh-spd'); if (el) el.textContent = Math.round(Math.abs(v.v) * 3.6) + ' km/h';
  };
  const ride = (v, dt) => {
    const Pl = P(); if (V.speed0) Pl.speed = V.speed0 * BIKE.mul;
    const mv = Math.hypot(Pl.x - v.x, Pl.z - v.z); if (mv > 0.01) v.yaw = Math.atan2(Pl.x - v.x, Pl.z - v.z) + Math.PI;
    v.x = Pl.x; v.z = Pl.z; v.g.position.set(v.x, 0, v.z); v.g.rotation.y = v.yaw; v.v = mv / Math.max(dt, 1e-3);
    Pl.h.sit = true; Pl.h.g.position.set(Pl.x, 0.42, Pl.z); Pl.h.g.rotation.y = v.yaw + Math.PI;
    v.g.children.slice(0, 2).forEach(w => { w.rotation.x += mv * 3; });
    const el = document.getElementById('vh-spd'); if (el) el.textContent = Math.round(v.v * 3.6) + ' km/h';
  };

  // ---------- 租車亭、中古車行 ----------
  const shopSheet = () => {
    const s = S(), rows = ['van', 'sedan', 'sport'].map(k => { const M = MODELS[k]; return '<div class="row ka-song"><b>' + M.name + '</b><small>最高 ' + Math.round(M.max * 3.6) + ' km/h・' + (s.car && s.car.model === k ? '你的車' : M.price + ' 費拉') + '</small>' + (s.car && s.car.model === k ? '' : '<button type="button" class="mini gold" data-car="' + k + '">買這台</button>') + '</div>'; }).join('');
    R.sheet('<p class="kicker">新商區</p><h2>德克斯凡中古車行</h2><p class="note">「德克斯凡的魔導引擎，冬天也發得動。」' + (s.car ? '（換車的話，舊車折價一半）' : '') + '</p>' + rows
      + '<div class="row ka-song"><b>腳踏車（媽媽車）</b><small>' + (s.ownBike ? '你有一台了' : '120 費拉') + '</small>' + (s.ownBike ? '' : '<button type="button" class="mini gold" data-car="bike">買這台</button>') + '</div>',
      '<div class="row"><button type="button" class="btn" id="cs-x">看看就好</button></div>');
    document.getElementById('cs-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-car]').forEach(b => b.onclick = () => {
      const k = b.dataset.car, s2 = S();
      if (k === 'bike') { if (s2.gold < 120) { R.toast('錢不夠。'); return; } s2.gold -= 120; s2.ownBike = true; s2.bikePos = null; R.save(); R.closeSheet(); const Pl = P(); const bk = park('bike', 'bike', Pl.x + 1.5, Pl.z + 1, 0, { own: true, col: '#3A8A5A' }); R.townTalk('德克斯凡中古車行', ['「這台媽媽車，前面的籃子可以放東西。」', '（買了腳踏車。停在旁邊；B 鍵騎。）']); return; }
      const M = MODELS[k], trade = s2.car ? Math.floor((MODELS[s2.car.model] || { price: 0 }).price / 2) : 0, cost = M.price - trade;
      if (s2.gold < cost) { R.toast('錢不夠（要 ' + cost + ' 費拉）。'); return; }
      s2.gold -= cost; s2.car = { model: k, col: M.col }; s2.carPos = null; R.save(); R.closeSheet();
      V.list.filter(v => v.own && v.type === 'car').forEach(v => { unpark(v); v.g.parent && v.g.parent.remove(v.g); });
      spawnOwnCar(); R.townTalk('德克斯凡中古車行', ['「鑰匙給你。」', '（買了' + M.name + '。停在車行門口。）']);
    });
  };
  const rentSheet = () => {
    const s = S(), has = s.bikeDay === s.day;
    R.sheet('<p class="kicker">站前廣場</p><h2>租腳踏車</h2><p>「一天 8 費拉，晚上還回來不用，明天自己會回到這裡。」</p>', '<div class="row"><button type="button" class="btn pri" id="rt-go"' + (has ? ' disabled' : '') + '>' + (has ? '今天已經租了' : '租一台（8 費拉）') + '</button><button type="button" class="btn" id="rt-x">不用了</button></div>');
    document.getElementById('rt-x').onclick = R.closeSheet;
    const go = document.getElementById('rt-go'); if (go) go.onclick = () => { if (s.gold < 8) { R.toast('錢不夠。'); return; } s.gold -= 8; s.bikeDay = s.day; R.save(); R.closeSheet(); const Pl = P(), bk = park('bike', 'bike', Pl.x + 1.2, Pl.z, 0, { rent: true, col: '#C8B040' }); if (bk) mount(bk); };
  };
  const spawnOwnCar = () => {
    const s = S(); if (!s || !s.car) return; const F = C.FAC.dexTrade, home = R.homeParking ? R.homeParking() : null;
    const p = s.carPos || (home ? { x: home[0], z: home[1], yaw: home[2] || 0 } : { x: toW(F[0]), z: toW(F[1] + 16), yaw: Math.PI / 2 });
    park('car', s.car.model, p.x, p.z, p.yaw, { own: true, col: s.car.col });
  };

  // ---------- 建城的時候：停車、租車亭、車行的招牌、可以搶的貨車 ----------
  const build = t => {
    V.list = []; V.cur = null; const s = S(); if (!s) return;
    spawnOwnCar();
    if (s.ownBike) { const b = s.bikePos || { x: toW(604), z: toW(300) }; park('bike', 'bike', b.x, b.z, 0, { own: true, col: '#3A8A5A' }); }
    // 租車亭（站前廣場西側）
    { const p = freeNear(toW(C.PLAZA[0] + 22), toW(C.PLAZA[1] + 14), 1.2); if (p) { const g = new THREE.Group(); box(g, 2.0, 1.0, 1.0, lam('#3A6A8A'), 0, 0.5, 0); box(g, 2.4, 0.1, 1.4, lam('#2A3A4A'), 0, 2.3, 0); [-0.9, 0.9].forEach(x => box(g, 0.08, 1.3, 0.08, lam('#2A2A30'), x, 1.65, -0.4)); for (let i = 0; i < 3; i++) { const b = bikeMesh('#C8B040'); b.position.set(-1.6 + i * 0.7 - 1.2, 0, 1.2); b.rotation.y = Math.PI / 2; g.add(b); } g.position.set(p[0], 0, p[1]); t.group.add(g); R.addBox(p[0] - 1.0, p[0] + 1.0, p[1] - 0.5, p[1] + 0.5, 'deco'); t.inter.push({ x: p[0], z: p[1] + 1.2, r: 2, label: '租腳踏車（今天 8 費拉）', act: rentSheet }); } }
    // 中古車行（德克斯凡商行的前庭）
    { const F = C.FAC.dexTrade; if (F) { const p = freeNear(toW(F[0] + 12), toW(F[1] + 12), 1.0); if (p) { t.inter.push({ x: p[0], z: p[1], r: 2.2, label: '德克斯凡中古車行（看車）', act: shopSheet }); const demo = carMesh('sport'); demo.position.set(p[0] + 3.5, 0, p[1]); demo.rotation.y = Math.PI / 2; t.group.add(demo); R.addBox(p[0] + 1.5, p[0] + 5.5, p[1] - 1, p[1] + 1, 'veh'); } } }
    // 路上的貨車：停下來的時候可以搶
    (t.cars || []).forEach(c => { t.inter.push({ get x() { return c.x; }, get z() { return c.z; }, r: 3, label: '把司機拉下來搶車（犯罪）', when: () => !V.cur && (c.v || 0) < 1.5 && (t.cars || []).includes(c), act: () => carjack(c) }); });
  };
  const carjack = c => {
    const t = tw(); t.cars = t.cars.filter(o => o !== c);
    const v = { type: 'car', model: 'dex', g: c.g, x: c.x, z: c.z, yaw: c.g.rotation.y, v: 0, stolen: true };
    const Cr = R.crime; if (Cr) { Cr.heat = Math.min(3, Cr.heat + 2); Cr.lostT = 0; if (R.alertGuards) R.alertGuards(c.x, c.z, 70); }
    R.banner('搶車！', '司機摔在雪地上大喊：「有人搶車——！」（通緝 ' + '★'.repeat(R.crime ? R.crime.heat : 2) + '）');
    mount(v);
  };

  // ---------- 每一格 ----------
  const step0 = R.townStep;
  R.townStep = dt => {
    const v = V.cur;
    if (v && v.type === 'car' && P()) P().busy = true;
    step0(dt);
    if (!V.cur || !P() || W.inside) return;
    if (R.sheetOpen && R.sheetOpen()) return;
    if (V.cur.type === 'car') drive(V.cur, dt); else ride(V.cur, dt);
  };
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => {
    if (V.cur && P()) { P().busy = false; if (P().h) { P().h.g.visible = true; P().h.sit = false; } if (V.speed0) P().speed = V.speed0; }
    V.cur = null; enter0(from, at); const t = tw(); if (t) { try { build(t); } catch (e) { console.warn('[vehicles]', e); } }
  };
  // 進建築物前先下車
  const ei0 = R.enterInterior;
  if (ei0) R.enterInterior = (k, o) => { if (V.cur) { V.cur.v = 0; dismount(); } return ei0(k, o); };
  // B 鍵：上下車（旁邊有車）
  window.addEventListener('keydown', e => {
    if (e.code !== 'KeyB' || e.repeat) return; const t = tw(); if (!t || W.inside || W.run || W.paused || (R.sheetOpen && R.sheetOpen())) return;
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (V.cur) { if (Math.abs(V.cur.v || 0) < 2.5 || V.cur.type === 'bike') { V.cur.v = 0; dismount(); } else R.toast('先停下來。'); return; }
    const Pl = P(), near = V.list.filter(v => Math.hypot(v.x - Pl.x, v.z - Pl.z) < (v.type === 'car' ? 3.2 : 2)).sort((a, b) => Math.hypot(a.x - Pl.x, a.z - Pl.z) - Math.hypot(b.x - Pl.x, b.z - Pl.z))[0];
    if (near) mount(near);
  });
  // 速度表（開車、騎車的時候）
  const hud0 = R.townHud;
  if (hud0) R.townHud = (force, dt) => {
    hud0(force, dt);
    let el = document.getElementById('vh-spd'); if (!el) { el = document.createElement('div'); el.id = 'vh-spd'; el.className = 'hud glass town-only'; const run = document.getElementById('run'); if (run) run.appendChild(el); }
    el.hidden = !V.cur || !!W.inside;
  };
  R.vehDebug = { V, mount, dismount, park, MODELS, carjack, spawnOwnCar };
})(window.R);
