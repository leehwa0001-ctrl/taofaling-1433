// 精緻城市的交通（2026-10-09 作者：其他城市也要有東鶴有的那些功能）
// 東鶴的 vehicles.js（腳踏車、開車、搶車）、pursuit.js（巡邏車、路障）、sidejobs.js（送包裹、開計程車）、traffic.js（車禍受傷、
// 人走的地方才罰）接到精緻城市：
// - 路網：照道路（D.roads 的車道）自動建，每條路一串點、路口互相連起來（W.town.nav）；R.CK.navPath(x0, z0, x1, z1) 用 A* 找路。
// - 目的地：R.setWaypoint／R.clearWaypoint 在精緻城市記在 R.S.ckWaypoint（哪一座城、哪裡）；小地圖畫箭頭和導航線，
//   大地圖畫標記，點一下地圖就設目的地（再點一次標記取消）；目的地有一道光柱。
// - 車：站前的租車亭（腳踏車一天 8 費拉）、租車行（魔導車一天 40 費拉；城的設定 rent: { bike: [x, z], car: [x, z] }）；
//   路上的車停下來可以搶（犯罪）。自己的車、腳踏車停在東鶴（這裡沒有）。
// - 打工：郵局（城的設定 jobs.post）、計程車行（jobs.taxi；沒寫就在廣場的兩邊）。開計程車要先租車。
// 放在 citykit*.js、ckcrime.js、cklife.js、vehicles.js、pursuit.js、sidejobs.js、traffic.js 後面。
(function (R) {
  const CK = R.CK, W = R.W; if (!CK) return;
  const S = () => R.S, $ = id => document.getElementById(id);
  const inR = (x, z, r, m) => x > r[0] - (m || 0) && x < r[2] + (m || 0) && z > r[1] - (m || 0) && z < r[3] + (m || 0);
  // ---------- 路網 ----------
  const buildNav = D => {
    const nodes = [], adj = [], roadOf = [];
    const roads = (D.roads || []).filter(rd => rd.kind !== 'alley');
    roads.forEach((rd, ri) => {
      const r = rd.r, w = r[2] - r[0], d = r[3] - r[1], ax = w >= d, L = ax ? w : d, n = Math.max(1, Math.round(L / 10)), base = nodes.length;
      for (let i = 0; i <= n; i++) { const t = i / n; nodes.push(ax ? [r[0] + w * t, (r[1] + r[3]) / 2] : [(r[0] + r[2]) / 2, r[1] + d * t]); adj.push([]); roadOf.push(ri); if (i) { adj[base + i].push(base + i - 1); adj[base + i - 1].push(base + i); } }
    });
    // 路口：一條路上的點落在另一條路的車道裡，就連到那條路最近的點
    nodes.forEach((p, i) => roads.forEach((rd, rj) => {
      if (rj === roadOf[i] || !inR(p[0], p[1], rd.r, 1)) return;
      let best = -1, bd = 1e9; nodes.forEach((q, k) => { if (roadOf[k] !== rj) return; const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < bd) { bd = dd; best = k; } });
      if (best >= 0 && bd < 14 && !adj[i].includes(best)) { adj[i].push(best); adj[best].push(i); }
    }));
    return { nodes, adj };
  };
  const nearest = (nav, x, z) => { let b = -1, bd = 1e9; nav.nodes.forEach((p, i) => { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < bd) { bd = d; b = i; } }); return b; };
  CK.navPath = (x0, z0, x1, z1) => {
    const tw = W.town, nav = tw && tw.nav; if (!nav || !nav.nodes.length) return null;
    const a = nearest(nav, x0, z0), b = nearest(nav, x1, z1); if (a < 0 || b < 0) return null;
    const N = nav.nodes, g = new Map([[a, 0]]), f = [[Math.hypot(N[a][0] - N[b][0], N[a][1] - N[b][1]), a]], from = new Map(), done = new Set();
    while (f.length) {
      f.sort((p, q) => p[0] - q[0]); const [, cur] = f.shift(); if (cur === b) break; if (done.has(cur)) continue; done.add(cur);
      nav.adj[cur].forEach(nb => { const ng = g.get(cur) + Math.hypot(N[cur][0] - N[nb][0], N[cur][1] - N[nb][1]); if (ng < (g.has(nb) ? g.get(nb) : 1e9)) { g.set(nb, ng); from.set(nb, cur); f.push([ng + Math.hypot(N[nb][0] - N[b][0], N[nb][1] - N[b][1]), nb]); } });
    }
    if (a !== b && !from.has(b)) return null;
    const path = []; let c = b; while (c != null) { path.unshift(N[c]); c = c === a ? null : from.get(c); }
    return path;
  };
  // ---------- 目的地 ----------
  const wp = () => { const s = S(), w = s && s.ckWaypoint; return w && W.town && w.city === W.town.ck ? w : null; };
  const sw0 = R.setWaypoint, cw0 = R.clearWaypoint;
  R.setWaypoint = (sx, sy, name) => { const tw = W.town; if (tw && tw.ck) { S().ckWaypoint = { city: tw.ck, x: sx, z: sy, name: name || '標記的地點' }; R.save && R.save(); route.key = ''; beacon(); return; } if (sw0) sw0(sx, sy, name); };
  R.clearWaypoint = () => { const tw = W.town; if (tw && tw.ck) { if (S()) S().ckWaypoint = null; R.save && R.save(); route.key = ''; beacon(); return; } if (cw0) cw0(); };
  const route = { key: '', pts: null, t: 0 };
  const updRoute = dt => { const w = wp(), P = W.P; if (!w || !P) { route.pts = null; return; } route.t -= dt; const key = w.x + ',' + w.z; if (route.key === key && route.t > 0) return; route.key = key; route.t = 1.2; const p = CK.navPath(P.x, P.z, w.x, w.z); route.pts = p ? [[P.x, P.z]].concat(p, [[w.x, w.z]]) : [[P.x, P.z], [w.x, w.z]]; };
  // 光柱
  const beacon = () => {
    const tw = W.town; if (!tw || !tw.group) return; const w = wp();
    if (tw.wpBeam) { tw.wpBeam.visible = !!w; if (w) tw.wpBeam.position.set(w.x, CK.heightAt(w.x, w.z) + 30, w.z); }
    else if (w) { const TH = THREE, m = new TH.Mesh(new TH.CylinderGeometry(0.9, 0.9, 60, 12, 1, true), new TH.MeshBasicMaterial({ color: '#FFD84A', transparent: true, opacity: 0.32, blending: TH.AdditiveBlending, depthWrite: false, side: TH.DoubleSide, toneMapped: false })); m.position.set(w.x, CK.heightAt(w.x, w.z) + 30, w.z); tw.group.add(m); tw.wpBeam = m; }
  };
  (CK.mapHooks = CK.mapHooks || []).push((x, pt, kind, o) => {
    const w = wp();
    if (w && route.pts) { x.save(); x.strokeStyle = 'rgba(255,216,74,.85)'; x.lineWidth = kind === 'big' ? 3 : 2.5; x.setLineDash(kind === 'big' ? [6, 4] : [4, 3]); x.beginPath(); route.pts.forEach((p, i) => { const m = pt(p[0], p[1]); if (i) x.lineTo(m[0], m[1]); else x.moveTo(m[0], m[1]); }); x.stroke(); x.restore(); }
    if (w) {
      let m = pt(w.x, w.z);
      if (kind === 'mini') { const s = o.s, c = s / 2, dx = m[0] - c, dy = m[1] - c, d = Math.hypot(dx, dy), lim = c - 7; if (d > lim) m = [c + dx / d * lim, c + dy / d * lim]; }
      x.fillStyle = '#FFD84A'; x.strokeStyle = '#1A1410'; x.lineWidth = 2; x.beginPath(); x.moveTo(m[0], m[1] - 8); x.lineTo(m[0] + 6, m[1]); x.lineTo(m[0], m[1] + 8); x.lineTo(m[0] - 6, m[1]); x.closePath(); x.fill(); x.stroke();
      if (kind === 'big') { x.font = 'bold 12px sans-serif'; x.textAlign = 'left'; x.fillStyle = '#FFE08A'; x.strokeStyle = '#1A1410'; x.lineWidth = 3; x.strokeText(w.name, m[0] + 10, m[1]); x.fillText(w.name, m[0] + 10, m[1]); }
    }
    if (kind === 'big' && o.canvas && !o.canvas.dataset.wp) {
      o.canvas.dataset.wp = 1; o.canvas.style.cursor = 'crosshair';
      const tip = document.createElement('p'); tip.className = 'note'; tip.textContent = '點地圖上的一個地方設成目的地（小地圖會畫路線）；再點一次標記就取消。'; o.canvas.insertAdjacentElement('afterend', tip);
      o.canvas.addEventListener('click', e => { const rc = o.canvas.getBoundingClientRect(), px = (e.clientX - rc.left) * o.canvas.width / rc.width, py = (e.clientY - rc.top) * o.canvas.height / rc.height, [wx, wz] = o.inv(px, py), cur = wp(); if (cur) { const m2 = pt(cur.x, cur.z); if (Math.hypot(m2[0] - px, m2[1] - py) < 12) { R.clearWaypoint(); setTimeout(o.redraw, 20); return; } } R.setWaypoint(wx, wz, '標記的地點'); updRoute(9); setTimeout(o.redraw, 20); });
    }
  });
  // ---------- 人走的地方（traffic.js）：車道內、離路口遠的地方才是車道 ----------
  const pz0 = R.pedZone;
  R.pedZone = (x, z) => {
    const tw = W.town; if (!tw || !tw.ck) return pz0 ? pz0(x, z) : true;
    const roads = (tw.D && tw.D.roads) || [], on = roads.filter(rd => rd.kind !== 'alley' && inR(x, z, rd.r));
    if (!on.length) return true;
    return roads.some(rd => !on.includes(rd) && rd.kind !== 'alley' && inR(x, z, rd.r, 4.5));   // 路口附近（斑馬線）
  };
  // ---------- 進城：路網、租車、搶車、打工 ----------
  const setup = B => {
    const tw = W.town, D = B.D; if (!tw || !tw.ck || tw.room) return;
    tw.nav = buildNav(D); route.key = ''; tw.wpBeam = null; beacon();
    if (R.vehReset) R.vehReset();
    if (R.pursuitDebug) { const PU = R.pursuitDebug.PU; PU.cars = []; PU.blocks = []; PU.bustT = 0; PU.spawnT = 4; PU.blockT = 8; }
    if (R.sideJobReset) R.sideJobReset();
    const inj = R.injuryNow && R.injuryNow(); if (inj && W.P && !W.P.injSlow) { W.P.speed *= 1 - inj.spd; W.P.injSlow = 1; }   // 車禍的傷（traffic.js）：走路變慢
    const city = tw.city, plaza = city.plaza || [city.spawn[0], city.spawn[1] - 6], rent = city.rent || {}, jobs = city.jobs || {}, V = R.vehDebug;
    const free = (x, z, r) => { for (let d = 0; d <= 10; d += 0.5) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, nx = x + Math.sin(a) * d, nz = z + Math.cos(a) * d, o = { x: nx, z: nz }; R.collide(o, r || 0.6); if (Math.hypot(o.x - nx, o.z - nz) < 0.05) return [nx, nz]; } return null; };
    const kiosk = (p, col, label, act) => { const TH = THREE, g = new TH.Group(), m = c => CK.mat('kiosk|' + c, { tex: 'paint', col: c }); const bx = (w, h, d, mt, x, y, z) => { const o = new TH.Mesh(new TH.BoxGeometry(w, h, d), mt); o.position.set(x, y, z); o.castShadow = true; g.add(o); }; bx(2.0, 1.0, 1.0, m(col), 0, 0.5, 0); bx(2.4, 0.1, 1.4, m('#2A3A4A'), 0, 2.3, 0); [-0.9, 0.9].forEach(xx => bx(0.08, 1.3, 0.08, m('#2A2A30'), xx, 1.65, 0)); g.position.set(p[0], CK.heightAt(p[0], p[1]), p[1]); tw.group.add(g); R.addBox(p[0] - 1, p[0] + 1, p[1] - 0.5, p[1] + 0.5, 'deco'); tw.inter.push({ x: p[0], z: p[1] + 1.4, r: 2, label, act, icon: '#5AA8E8' }); };
    if (V) {
      // 租的車：今天租過的，再進城也停在原來的地方
      const key = () => tw.ck + ':' + S().day;
      const parkBike = p => { const v = V.park('bike', 'bike', p[0], p[1], 0, { rent: true, col: '#C8B040' }); if (v) v.g.position.y = CK.heightAt(v.x, v.z); return v; };
      const parkCar = p => { const q = free(p[0], p[1], 1.8) || p, v = V.park('car', 'sedan', q[0], q[1], p[2] == null ? Math.PI / 2 : p[2], { rent: true, col: '#E8E4DC' }); if (v) { const g = CK.makeCar('#E8E4DC', 'car'); g.position.set(v.x, CK.heightAt(v.x, v.z), v.z); g.rotation.y = v.yaw; v.g.parent.remove(v.g); tw.group.add(g); v.g = g; } return v; };
      const has = (k, at, fn) => V.V.list.some(v => v.rent && v.type === k) || (V.V.cur && V.V.cur.rent && V.V.cur.type === k) ? R.toast('今天已經租了。' + (k === 'car' ? '車' : '腳踏車') + '就在旁邊。') : fn(at);
      const rentBike = at => { const s = S(); if (s.ckBike === key()) return has('bike', at, parkBike); if (s.gold < 8) { R.toast('錢不夠。'); return; } s.gold -= 8; s.ckBike = key(); R.save(); parkBike(at); R.toast('租了一台腳踏車（今天都可以騎）。B 鍵騎上去。'); };
      const rentCar = at => { const s = S(); if (s.ckCar === key()) return has('car', at, parkCar); if (s.gold < 40) { R.toast('錢不夠。'); return; } s.gold -= 40; s.ckCar = key(); R.save(); parkCar(at); R.toast('租了一台魔導車（今天都可以開）。B 鍵上車；W／S 油門煞車、A／D 轉彎。'); };
      CK.rentCar = rentCar;   // 城自己的租車行（例如吉山的魔導懸浮車行）：R.CK.rentCar([停車的 x, z, 車頭的方向])
      const pb = free(...(rent.bike || [plaza[0] + 20, plaza[1] - 4]), 1.2), pbAt = pb && [pb[0] + 1.6, pb[1] + 1.4];
      if (pb) { kiosk(pb, '#3A6A8A', '租腳踏車（一天 8 費拉）', () => rentBike(pbAt)); if (S().ckBike === key()) parkBike(pbAt); }
      const pc = rent.car === false ? null : free(...(rent.car || [plaza[0] - 22, plaza[1] - 4]), 1.2), pcAt = pc && [pc[0] - 4, pc[1] + 3];
      if (pc) kiosk(pc, '#8A3A3A', '租魔導車（一天 40 費拉）', () => rentCar(pcAt));
      const carAt = rent.carAt || pcAt; if (carAt && S().ckCar === key()) parkCar(carAt);
      // 路上的車：停下來的時候可以搶（精緻城市的車也是車頭朝 -z，跟 vehicles.js 一樣）
      (tw.cars || []).forEach(c => tw.inter.push({ get x() { return c.x; }, get z() { return c.z; }, r: 3, label: '把司機拉下來搶車（犯罪）', when: () => !R.inVehicle() && (c.v || 0) < 1.5 && (tw.cars || []).includes(c), act: () => {
        tw.cars = tw.cars.filter(o => o !== c);
        const Cr = R.crime; if (Cr) { Cr.heat = Math.min(3, Cr.heat + 2); Cr.lostT = 0; if (R.alertGuards) R.alertGuards(c.x, c.z, 70); }
        R.banner('搶車！', '司機摔在路上大喊：「有人搶車——！」（通緝 ' + '★'.repeat(Cr ? Cr.heat : 2) + '）');
        const v = { type: 'car', model: c.g.userData.kind === 'truck' ? 'van' : 'sedan', g: c.g, x: c.x, z: c.z, yaw: c.g.rotation.y, v: 0, stolen: true }; V.mount(v);
      } }));
    }
    // 打工
    const SJ = R.sideJobDebug;
    if (SJ) {
      const pp = free(...(jobs.post || [plaza[0] - 30, plaza[1] + 6]), 1); if (pp) tw.inter.push({ x: pp[0], z: pp[1], r: 2, label: '郵局：送包裹的打工', when: () => !SJ.J, act: SJ.startPost, icon: '#E8A04A' });
      const pt2 = free(...(jobs.taxi || [plaza[0] + 30, plaza[1] + 6]), 1); if (pt2) tw.inter.push({ x: pt2[0], z: pt2[1], r: 2.2, label: '計程車行：開計程車的打工', when: () => !SJ.J, act: SJ.startTaxi, icon: '#E8A04A' });
    }
  };
  const sl0 = CK.spawnLife;
  CK.spawnLife = B => { sl0(B); try { setup(B); } catch (e) { console.warn('[ckmove]', e); } };
  // 進店之前先下車（店門口的「走進○○」）
  const er0 = CK.enterRoom;
  CK.enterRoom = (id, door) => { if (R.inVehicle && R.inVehicle()) { const v = R.inVehicle(); if (v.type === 'car' && Math.abs(v.v || 0) > 2.5) { R.toast('先停下來。'); return; } R.dismountVehicle(); } return er0(id, door); };
  // ---------- 每一格 ----------
  const step = dt => {
    const tw = W.town, P = W.P; if (!tw || !tw.ck || tw.room || !P || W.paused) return;
    if (R.sheetOpen && R.sheetOpen()) return;
    const V = R.VEH;
    if (V && V.cur && V.cur.type === 'car') P.busy = true;
    if (R.vehTick) R.vehTick(dt);
    // 高度（vehicles.js 放在 y＝0）
    if (V) { if (V.cur) { V.cur.g.position.y = CK.heightAt(V.cur.x, V.cur.z); if (V.cur.type === 'bike') P.h.g.position.y = CK.heightAt(P.x, P.z) + 0.42; } }
    const sp = $('vh-spd'); if (sp) sp.hidden = !(V && V.cur);   // 速度表（東鶴的 R.townHud 在這裡不會跑）
    if (R.crashTick) R.crashTick(dt);
    if (R.pursuitDebug) { R.pursuitDebug.step(dt); const PU = R.pursuitDebug.PU; PU.cars.forEach(pc => { pc.g.position.y = CK.heightAt(pc.x, pc.z); }); }
    if (R.sideJobTick) R.sideJobTick(dt);
    const SJ = R.sideJobDebug, J = SJ && SJ.J; if (J && J.npc) J.npc.h.g.position.y = CK.heightAt(J.npc.x, J.npc.z);
    updRoute(dt);
    if (tw.wpBeam && tw.wpBeam.visible) { const w = wp(); if (w && Math.hypot(P.x - w.x, P.z - w.z) < 4 && !/^打工：/.test(w.name)) { R.clearWaypoint(); R.toast('到了：' + w.name); } }
  };
  const ts0 = R.townStep;
  R.townStep = dt => { ts0(dt); try { step(dt); } catch (e) { console.warn('[ckmove]', e); } };
})(window.R);
