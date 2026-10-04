// 奉主・兵工廠遺跡的環境「熔爐」（作者 2026-10-04：兵工廠遺跡長得完全不像兵工廠；場地效果跟火山太類似了，
//   可以改成地上出現絞肉機、地刺之類的陷阱）
// 原本是火山換顏色（噴發的熔鐵、鐵水攤、焦岩的牆、城區的房子和窗戶）。現在是自己的環境 R.ENVS.forge：
// - 長相：鋼板地板（接縫、鉚釘、防滑紋）、鋼板牆和牆頂；黃黑的警示條只在熔爐前、工字鋼柱底下、輸送帶兩邊、絞肉機一圈；房間是方方正正的廠房（不是城區的房子和窗戶），走道寬；
//   擺的是武器架、彈藥箱、砲彈堆、躺著的砲管、熔爐（爐口發光）、鐵砧和工作台、工字鋼柱、油桶、空的盔甲架，天花板垂下吊鉤；走道上有鐵軌。
// - 場地效果「兵工廠的機關」（越深越多、越兇，k 1～2；人和遺跡生物都會中，可以把遺跡生物引過去）：
//   地刺：地上一塊一塊有孔的鐵板。踩上去「喀」一聲、鐵板變紅，半秒後尖刺冒出來，站在上面的都會受傷；過一秒縮回去。
//   絞肉機：房間地上的圓形鐵柵，底下兩片刀在轉。轉的時候靠近會被吸過去、站在上面一直受傷；轉一陣停一陣（要轉之前會冒火星）。
//   輸送帶：走道上一條帶子，箭頭往哪邊流就把人往哪邊送，逆著走很慢。
// 放在 kesentfx.js 後面、region.js 前面（region.js 加兵工廠的時候要先有 R.ENVS.forge；包 R.loadFloor、R.step）。
(function (R) {
  const W = () => R.W, rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  R.ENVS.forge = { name: '熔爐', floor: '#3A3C42', wall: '#4C5058', light: '#FFB070', fog: '#16120E', desc: '兵工廠的機關還在動：地刺、絞肉機、輸送帶。' };
  const on = run => run && run.env === 'forge' && !run.done;
  const deep = run => 1 + Math.min(1, (run.floor || 0) / Math.max(1, run.floors - 1));
  // 廠房：方正的大房間、寬走道，沒有城區的房子和窗戶
  const FORM = { shapes: ['hall', 'rect', 'hall', 'cross'], calm: 'rect', boss: 'hall', corr: 'street', corrW: 3, wallH: [4.8, 6.4], facade: 0, big: 1.15, pit: '#1A0E08' };

  // ---------- 鋼板的點陣材質（灰階，乘上顏色；照世界座標貼，跟 sprites.js 的 R.pixTex 一樣） ----------
  const texCache = {};
  const pixTex = kind => {
    if (texCache[kind]) return texCache[kind];
    const size = kind === 'floor' ? 80 : kind === 'hazard' ? 40 : 48, c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'), P = (a, b, v) => { v = Math.max(0, Math.min(255, Math.round(v))); x.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; x.fillRect(a, b, 1, 1); };
    let sd = kind.length * 977; const sr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    if (kind === 'floor') {
      // 4×4 塊鋼板，一塊 20 像素＝地城的一格（2 公尺）；四角有鉚釘，有些是防滑紋
      for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
        const base = 200 + (sr() - 0.5) * 22, tread = sr() < 0.45;
        for (let yy = 0; yy < 20; yy++) for (let xx = 0; xx < 20; xx++) {
          let v = base + (sr() - 0.5) * 6;
          if (xx === 0 || yy === 0) v = 120; else if (xx === 1 || yy === 1) v = base + 18; else if (xx === 19 || yy === 19) v = base - 22;
          else if (tread && (xx + yy * 2) % 5 === 0 && (yy % 4 === 2 || (xx * 3 + yy) % 7 === 0)) v = base + 26;
          P(tx * 20 + xx, ty * 20 + yy, v);
        }
        [[3, 3], [16, 3], [3, 16], [16, 16]].forEach(([a, b]) => { P(tx * 20 + a, ty * 20 + b, 245); P(tx * 20 + a + 1, ty * 20 + b + 1, 130); });
        if (sr() < 0.3) for (let k = 0; k < 6; k++) P(tx * 20 + 5 + Math.floor(sr() * 10), ty * 20 + 5 + Math.floor(sr() * 10), 150);   // 鏽斑
      }
    } else if (kind === 'wall') {
      // 直的鋼板：一片寬 12 像素（一公尺），橫的接縫每 24 像素，接縫兩邊一排鉚釘
      for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) {
        const panel = Math.floor(xx / 12) + Math.floor(yy / 24) * 3; let v = 196 + (panel % 3) * 8 + (sr() - 0.5) * 8;
        if (xx % 12 === 0 || yy % 24 === 23) v = 118; else if (xx % 12 === 1 || yy % 24 === 0) v += 18; else if (xx % 12 === 11) v -= 16;
        if ((yy % 24 === 3 || yy % 24 === 20) && xx % 4 === 2) v = 240;
        P(xx, yy, v);
      }
    } else {
      // 警示條：斜的黃黑條紋（乘上黃色）
      for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) P(xx, yy, (Math.floor((xx + yy) / 5) % 2) ? 70 : 235);
    }
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.userData.shared = true;
    return (texCache[kind] = t);
  };
  const matCache = {};
  const pixMat = kind => { if (matCache[kind]) return matCache[kind]; const t = pixTex(kind), m = R.worldUV(new THREE.MeshLambertMaterial({ map: t, color: kind === 'hazard' ? '#E0B83A' : '#FFFFFF' }), t.image.width); m.userData.shared = true; return (matCache[kind] = m); };   // 警示條：灰階乘上黃色
  const lamC = {};
  const lam = (c, em, k) => { const key = c + (em || '') + (k || ''); if (lamC[key]) return lamC[key]; const m = new THREE.MeshLambertMaterial({ color: c }); if (em) { m.emissive = new THREE.Color(em); m.emissiveIntensity = k || 0.9; } m.userData.shared = true; return (lamC[key] = m); };
  let G = null;
  const geo = () => G || (G = (() => { const TH = THREE, g = { box: new TH.BoxGeometry(1, 1, 1), cyl: new TH.CylinderGeometry(0.5, 0.5, 1, 10), cone: new TH.ConeGeometry(0.5, 1, 8), sph: new TH.SphereGeometry(0.5, 8, 6), disc: new TH.CircleGeometry(0.5, 20), ring: new TH.RingGeometry(0.86, 1, 28), arrow: new TH.ShapeGeometry(new TH.Shape([new TH.Vector2(-0.4, -0.3), new TH.Vector2(0, 0.3), new TH.Vector2(0.4, -0.3), new TH.Vector2(0, -0.1)])) }; Object.values(g).forEach(x => { x.userData.shared = true; }); return g; })());

  // ---------- 換材質：鋼板地板、鋼板牆、牆頂警示條 ----------
  const restyle = F => {
    if (!R.pixTex || !R.worldUV) return;
    const fl = R.pixTex('floor'), wa = R.pixTex('wall'), ca = R.pixTex('cap'), top = new THREE.Color('#5E626A');
    F.group.children.forEach(m => {
      if (!m.isMesh || !m.material || Array.isArray(m.material)) return;
      const mp = m.material.map;
      if (mp === fl) m.material = pixMat('floor');
      else if (mp === wa) m.material = pixMat('wall');
      else if (mp === ca && m.isInstancedMesh) { m.material = pixMat('floor'); for (let i = 0; i < m.count; i++) m.setColorAt(i, top); if (m.instanceColor) m.instanceColor.needsUpdate = true; }   // 牆頂：鋼板（整圈警示條太黃了）
    });
  };

  // ---------- 擺東西 ----------
  const dress = (run, F) => {
    if (!F || !F.group || !F.rooms || !R.Batch || !R.roomPoint) return;
    const g = geo(), Bt = R.Batch(), t = F.tile;
    const add = (gm, m, x, y, z, sx, sy, sz, rx, ry, rz) => Bt.add(gm, m, x, y, z, sx, sy, sz, rx || 0, ry || 0, rz || 0);
    const avoid = []; [F.stairs, F.up, F.save, F.warp, F.camp].concat(F.stairsAll || [], F.crystals || [], F.chests || []).forEach(o => { if (o && o.x != null) avoid.push([o.x, o.z]); });
    const free = (x, z, r) => avoid.every(([ax, az]) => Math.hypot(ax - x, az - z) > (r || 3.2)) && !(R.pointBlocked && R.pointBlocked(x, z));
    const block = (x, z, hx, hz) => R.addBox(x - hx, x + hx, z - hz, z + hz, 'deco');
    const STEEL = '#5A5E66', DARK = '#2E3036', WOOD = '#6A5434', BRASS = '#C8A040';
    F.rooms.forEach(r => {
      if (r.type === 'puzzle' || r.spec || r.rest || (r.type === 'start' && run.floor === 0)) return;
      const fight = r.type === 'boss' || r.type === 'lord', area = (r.hx || 8) * (r.hz || 8), n = fight ? 3 : Math.round(Math.min(18, area / 8));
      let furnace = 0;
      // 天花板垂下來的吊鉤（只是畫面）
      for (let i = 0; i < 2; i++) { const [x, z] = R.roomPoint(r, {}); add(g.cyl, lam('#3A3C42'), x, 4.6, z, 0.06, 3.6, 0.06); add(g.box, lam('#6A6E76'), x, 2.75, z, 0.08, 0.3, 0.32); add(g.cone, lam('#8A8E96'), x, 2.45, z + 0.12, 0.14, 0.3, 0.14, Math.PI, 0, 0); }
      for (let i = 0; i < n; i++) {
        const edge = Math.random() < 0.7, [x, z] = R.roomPoint(r, { edge }); if (!free(x, z)) continue;
        const k = fight ? 0.5 + Math.random() * 0.5 : Math.random(), ang = Math.floor(Math.random() * 4) * Math.PI / 2, along = Math.abs(Math.sin(ang)) > 0.5;
        const hx = (a, b) => (along ? b : a), hz = (a, b) => (along ? a : b);
        Bt.frame(x, z, ang);
        if (k < 0.16) {   // 武器架：兩根柱子、一根橫桿，靠著幾把長槍
          add(g.box, lam(WOOD), x - 0.85, 0.8, z, 0.12, 1.6, 0.12); add(g.box, lam(WOOD), x + 0.85, 0.8, z, 0.12, 1.6, 0.12); add(g.box, lam(WOOD), x, 1.45, z, 1.9, 0.1, 0.1); add(g.box, lam(WOOD), x, 0.35, z, 1.9, 0.08, 0.3);
          for (let j = 0; j < 5; j++) { const sx = x - 0.7 + j * 0.35; add(g.cyl, lam('#4A3A2A'), sx, 1.0, z + 0.12, 0.05, 2.0, 0.05, 0.12, 0, 0); add(g.cone, lam('#B8BCC4'), sx, 2.08, z + 0.25, 0.09, 0.32, 0.09, 0.12, 0, 0); }
          block(x, z, hx(1, 0.3), hz(1, 0.3));
        } else if (k < 0.34) {   // 彈藥箱：疊起來的木箱、黑色的帶子，有時候一箱打開著（黃銅的彈殼）
          const m = 2 + Math.floor(Math.random() * 3);
          for (let j = 0; j < m; j++) { const top = j >= 2, cx = x + (top ? -0.45 + (j - 2) * 0.9 : -0.45 + j * 0.9), cy = top ? 0.9 : 0.3; add(g.box, lam(j % 2 ? '#5A462A' : WOOD), cx, cy, z, 0.86, 0.6, 0.62); add(g.box, lam('#2A2420'), cx, cy, z, 0.88, 0.12, 0.64); }
          if (Math.random() < 0.4) for (let j = 0; j < 6; j++) add(g.cyl, lam(BRASS, '#5A4010', 0.3), x - 0.6 + (j % 3) * 0.12, 0.66, z - 0.1 + Math.floor(j / 3) * 0.14, 0.1, 0.16, 0.1);
          block(x, z, hx(0.95, 0.35), hz(0.95, 0.35));
        } else if (k < 0.46) {   // 砲彈堆：木棧板上躺著一排一排的砲彈
          add(g.box, lam('#4A3A28'), x, 0.08, z, 1.6, 0.16, 1.0);
          [[3, 0.33], [2, 0.6], [1, 0.87]].forEach(([c, y], row) => { for (let j = 0; j < c; j++) { const sx = x - (c - 1) * 0.15 + j * 0.3; add(g.cyl, lam(BRASS), sx, y, z - 0.1, 0.26, 0.9, 0.26, Math.PI / 2, 0, 0); add(g.cone, lam(DARK), sx, y, z + 0.47, 0.26, 0.26, 0.26, Math.PI / 2, 0, 0); } });
          block(x, z, hx(0.8, 0.55), hz(0.8, 0.55));
        } else if (k < 0.56) {   // 躺著的砲管：兩個木架、砲口一圈
          add(g.box, lam(WOOD), x - 0.9, 0.25, z, 0.3, 0.5, 0.8); add(g.box, lam(WOOD), x + 0.9, 0.25, z, 0.3, 0.5, 0.8);
          add(g.cyl, lam(DARK), x, 0.62, z, 0.62, 3.0, 0.62, 0, 0, Math.PI / 2); add(g.cyl, lam('#3A3C42'), x + 1.5, 0.62, z, 0.78, 0.18, 0.78, 0, 0, Math.PI / 2); add(g.cyl, lam('#3A3C42'), x - 1.3, 0.62, z, 0.86, 0.3, 0.86, 0, 0, Math.PI / 2);
          block(x, z, hx(1.6, 0.45), hz(1.6, 0.45));
        } else if (k < 0.63 && !furnace && !fight && area > 60) {   // 熔爐：爐身、煙囪、發光的爐口，地上一圈警示
          furnace = 1;
          add(g.box, lam('#3A3430'), x, 1.2, z, 2.2, 2.4, 1.8); add(g.box, lam('#4A4440'), x, 2.5, z, 2.4, 0.2, 2.0); add(g.cyl, lam('#2E2A28'), x + 0.5, 4.2, z - 0.3, 0.6, 3.4, 0.6);
          add(g.box, lam('#FF7A2A', '#FF5A0A', 1.2), x, 0.75, z + 0.91, 1.0, 0.8, 0.04); add(g.disc, lam('#FF8A3A', '#FF5A0A', 0.6), x, 0.014, z + 1.5, 1.8, 1.0, 1, -Math.PI / 2, 0, 0);
          add(g.box, pixMat('hazard'), x, 0.011, z + 2.1, 2.6, 0.02, 0.2);
          block(x, z, hx(1.15, 0.95), hz(1.15, 0.95)); avoid.push([x, z]);
        } else if (k < 0.72) {   // 鐵砧、工作台、一把鐵鎚
          add(g.box, lam('#2A2A2E'), x - 0.6, 0.3, z, 0.4, 0.6, 0.4); add(g.box, lam('#3A3C42'), x - 0.6, 0.68, z, 0.8, 0.18, 0.34); add(g.cone, lam('#3A3C42'), x - 1.1, 0.68, z, 0.16, 0.36, 0.16, 0, 0, Math.PI / 2);
          add(g.box, lam(WOOD), x + 0.6, 0.8, z, 1.2, 0.08, 0.7); [[-0.5, -0.28], [0.5, -0.28], [-0.5, 0.28], [0.5, 0.28]].forEach(([a, b]) => add(g.box, lam('#4A3A28'), x + 0.6 + a, 0.38, z + b, 0.08, 0.76, 0.08));
          add(g.cyl, lam('#4A3A2A'), x + 0.6, 0.88, z, 0.05, 0.6, 0.05, 0, 0, Math.PI / 2); add(g.box, lam('#5A5E66'), x + 0.85, 0.88, z, 0.12, 0.14, 0.24);
          block(x, z, hx(1.25, 0.4), hz(1.25, 0.4));
        } else if (k < 0.82) {   // 工字鋼柱：底下一圈警示條
          add(g.box, lam(STEEL), x, 3, z, 0.16, 6, 0.5); add(g.box, lam(STEEL), x, 3, z - 0.22, 0.5, 6, 0.06); add(g.box, lam(STEEL), x, 3, z + 0.22, 0.5, 6, 0.06);
          add(g.box, pixMat('hazard'), x, 0.3, z, 0.62, 0.6, 0.62);
          block(x, z, 0.32, 0.32);
        } else if (k < 0.92) {   // 油桶
          const m = 2 + Math.floor(Math.random() * 2), cs = ['#6A2A22', '#3A4A2E', '#2E3A4A'];
          for (let j = 0; j < m; j++) { const bx = x - 0.4 + (j % 2) * 0.75, bz = z + (j > 1 ? 0.7 : 0), c = pick(cs); add(g.cyl, lam(c), bx, 0.45, bz, 0.7, 0.9, 0.7); add(g.cyl, lam('#2A2A2E'), bx, 0.62, bz, 0.72, 0.05, 0.72); add(g.cyl, lam('#2A2A2E'), bx, 0.28, bz, 0.72, 0.05, 0.72); }
          block(x + 0.1, z + 0.2, 0.75, 0.65);
        } else {   // 空的盔甲架：一根柱子掛著胴丸、肩甲、頭盔
          add(g.box, lam('#4A3A28'), x, 0.04, z, 0.7, 0.08, 0.7); add(g.cyl, lam('#4A3A28'), x, 0.8, z, 0.08, 1.6, 0.08);
          add(g.box, lam('#4A4038'), x, 1.15, z, 0.7, 0.75, 0.4); [0.95, 1.15, 1.35].forEach(y => add(g.box, lam('#6A5E52'), x, y, z, 0.72, 0.06, 0.42)); add(g.box, lam('#8A2A2A'), x, 1.15, z + 0.21, 0.06, 0.7, 0.02);
          add(g.box, lam('#5A524A'), x - 0.48, 1.42, z, 0.3, 0.3, 0.44, 0, 0, 0.3); add(g.box, lam('#5A524A'), x + 0.48, 1.42, z, 0.3, 0.3, 0.44, 0, 0, -0.3);
          add(g.sph, lam('#3A3430'), x, 1.78, z, 0.5, 0.36, 0.5); add(g.cyl, lam('#3A3430'), x, 1.66, z, 0.8, 0.06, 0.8);
          block(x, z, 0.35, 0.3);
        }
        Bt.frame();
      }
    });
    // 走道上的鐵軌（沒有輸送帶的直線段）
    if (t) {
      let rails = 0;
      for (let tries = 0; tries < 60 && rails < 4; tries++) {
        const run0 = straightRun(t, 4); if (!run0) continue;
        const { tiles, ax } = run0; if (tiles.some(k => S && S.used && S.used.has(k))) continue;
        const [x0, z0] = [t.cX(tiles[0] % t.nx), t.cZ(Math.floor(tiles[0] / t.nx))], [x1, z1] = [t.cX(tiles[tiles.length - 1] % t.nx), t.cZ(Math.floor(tiles[tiles.length - 1] / t.nx))];
        const L = Math.hypot(x1 - x0, z1 - z0) + t.TS, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        [-0.45, 0.45].forEach(o => add(g.box, lam('#7A7E86'), cx + (ax ? 0 : o), 0.04, cz + (ax ? o : 0), ax ? L : 0.08, 0.06, ax ? 0.08 : L));
        for (let s = -L / 2 + 0.4; s < L / 2; s += 0.8) add(g.box, lam('#3A2E24'), cx + (ax ? s : 0), 0.015, cz + (ax ? 0 : s), ax ? 0.22 : 1.3, 0.03, ax ? 1.3 : 0.22);
        tiles.forEach(k => usedRail.add(k)); rails++;
      }
    }
    Bt.flush(F.group);
  };
  const usedRail = new Set();
  // 走道上一段直的：從一格走道往兩邊延伸（ax：沿著 x）
  const straightRun = (t, minLen) => {
    const cand = []; for (let k = 0; k < t.T.length; k++) if (t.T[k] === 1 && t.RM[k] < 0) cand.push(k);
    if (!cand.length) return null;
    const k0 = pick(cand), tx = k0 % t.nx, tz = (k0 - tx) / t.nx, ok = (x, z) => x >= 0 && z >= 0 && x < t.nx && z < t.nz && t.T[z * t.nx + x] === 1 && t.RM[z * t.nx + x] < 0;
    const ax = ok(tx - 1, tz) && ok(tx + 1, tz) ? true : ok(tx, tz - 1) && ok(tx, tz + 1) ? false : null; if (ax == null) return null;
    const tiles = [k0]; for (let d = 1; d < 6 && ok(tx + (ax ? d : 0), tz + (ax ? 0 : d)); d++) tiles.push((tz + (ax ? 0 : d)) * t.nx + tx + (ax ? d : 0));
    for (let d = 1; d < 6 && ok(tx - (ax ? d : 0), tz - (ax ? 0 : d)); d++) tiles.unshift((tz - (ax ? 0 : d)) * t.nx + tx - (ax ? d : 0));
    return tiles.length >= minLen ? { tiles, ax } : null;
  };

  // ---------- 機關 ----------
  let S = null;
  const say = (k, txt) => { if (S && !S.said[k]) { S.said[k] = 1; R.toast && R.toast(txt, '#FFB45A'); } };
  const bodies = w => { const out = []; const P = w.P; if (P && !P.dead && !(P.air > 0)) out.push(P); (w.allies || []).forEach(a => { if (!a.downed && !a.dead) out.push(a); }); w.enemies.forEach(e => { if (!e.dead && !e.under && !e.def.fly) out.push(e); }); return out; };
  const hit = (o, fracP, flatE, name) => {
    const w = W();
    if (o === w.P) { R.hurtPlayer(o.hpMax * fracP + 6, { name }); o.slowT = Math.max(o.slowT || 0, 0.6); }
    else if (o.ally) { if (R.hurtAlly) R.hurtAlly(o, (o.hpMax || 100) * fracP * 0.7, null); }
    else R.hurtEnemy(o, flatE + (o.hpMax || 0) * 0.05, {});
  };
  const push = (o, dx, dz) => { o.x += dx; o.z += dz; if (R.collide) R.collide(o, o === W().P ? 0.42 : o.ally ? 0.4 : (o.def.size || 1) * 0.5); };
  const setup = (run, F) => {
    const w = W(), t = F.tile, TH = THREE, g = geo(), P = w.P; if (!t) return;
    const k = deep(run);
    S = { k, spikes: [], grinders: [], belts: [], said: {}, used: new Set() };
    const avoid = []; [F.stairs, F.up, F.save, F.warp, F.camp].concat(F.stairsAll || [], F.crystals || [], F.chests || []).forEach(o => { if (o && o.x != null) avoid.push([o.x, o.z]); });
    if (P) avoid.push([P.x, P.z]);
    const clear = (x, z, r) => avoid.every(([ax, az]) => Math.hypot(ax - x, az - z) > r) && !R.pointBlocked(x, z) && R.isFloor(x, z);
    const rooms = F.rooms.filter(r => !r.rest && r.type !== 'puzzle' && r.type !== 'boss' && r.type !== 'lord' && r.type !== 'start' && !r.spec);
    // 輸送帶：走道上直的一段
    const beltM = lam('#24262A'), arrowM = new TH.MeshBasicMaterial({ color: '#FFD04A', transparent: true, opacity: 0.85, depthWrite: false, side: TH.DoubleSide });
    for (let tries = 0, n = Math.round(2 + 2 * k); tries < 40 && S.belts.length < n; tries++) {
      const sr = straightRun(t, 3); if (!sr) continue;
      const tiles = sr.tiles.slice(0, 6); if (tiles.some(kk => S.used.has(kk) || usedRail.has(kk))) continue;
      const pts = tiles.map(kk => [t.cX(kk % t.nx), t.cZ(Math.floor(kk / t.nx))]); if (!pts.every(([x, z]) => clear(x, z, 3))) continue;
      tiles.forEach(kk => S.used.add(kk));
      const ax = sr.ax, dir = Math.random() < 0.5 ? 1 : -1, cx = (pts[0][0] + pts[pts.length - 1][0]) / 2, cz = (pts[0][1] + pts[pts.length - 1][1]) / 2, L = tiles.length * t.TS, half = t.TS * 0.45;
      const base = new TH.Mesh(g.box, beltM); base.scale.set(ax ? L : t.TS * 0.9, 0.06, ax ? t.TS * 0.9 : L); base.position.set(cx, 0.03, cz); F.group.add(base);
      [-1, 1].forEach(s => { const rail = new TH.Mesh(g.box, pixMat('hazard')); rail.scale.set(ax ? L : 0.14, 0.1, ax ? 0.14 : L); rail.position.set(cx + (ax ? 0 : s * half), 0.05, cz + (ax ? s * half : 0)); F.group.add(rail); });
      const arrows = []; for (let i = 0; i < tiles.length * 2; i++) { const m = new TH.Mesh(g.arrow, arrowM); m.rotation.x = -Math.PI / 2; m.rotation.z = ax ? (dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (dir > 0 ? Math.PI : 0); F.group.add(m); arrows.push(m); }
      S.belts.push({ cx, cz, ax, dir, L, half, arrows, ph: Math.random() });
    }
    // 地刺：房間裡、走道上一塊一塊（對齊地板的格子）
    const holes = (() => { const c = document.createElement('canvas'); c.width = c.height = 12; const x = c.getContext('2d'); x.fillStyle = '#8A8E96'; x.fillRect(0, 0, 12, 12); x.fillStyle = '#5A5E66'; x.fillRect(0, 0, 12, 1); x.fillRect(0, 0, 1, 12); x.fillStyle = '#121214'; [2, 5, 8].forEach(a => [2, 5, 8].forEach(b => x.fillRect(a, b, 2, 2))); const tx = new TH.CanvasTexture(c); tx.magFilter = tx.minFilter = TH.NearestFilter; return tx; })();
    const spikeM = lam('#C8CCD4');
    for (let tries = 0, n = Math.round(5 + 5 * k); tries < 80 && S.spikes.length < n; tries++) {
      let x, z;
      if (Math.random() < 0.3) { const sr = straightRun(t, 3); if (!sr) continue; const kk = pick(sr.tiles); if (S.used.has(kk)) continue; x = t.cX(kk % t.nx); z = t.cZ(Math.floor(kk / t.nx)); }
      else { const r = pick(rooms); if (!r) break; [x, z] = R.roomPoint(r, {}); x = t.cX(t.tX(x)); z = t.cZ(t.tZ(z)); }
      const kk = t.id(t.tX(x), t.tZ(z)); if (S.used.has(kk) || !clear(x, z, 3.2)) continue; S.used.add(kk);
      const mat = new TH.MeshLambertMaterial({ map: holes, emissive: new TH.Color('#FF2A1A'), emissiveIntensity: 0 });
      const plate = new TH.Mesh(g.box, mat); plate.scale.set(t.TS * 0.92, 0.05, t.TS * 0.92); plate.position.set(x, 0.025, z); F.group.add(plate);
      const sp = new TH.Group(); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const c = new TH.Mesh(g.cone, spikeM); c.scale.set(0.16, 0.7, 0.16); c.position.set(a * 0.5, 0.35, b * 0.5); sp.add(c); }
      sp.position.set(x, -0.75, z); F.group.add(sp);
      S.spikes.push({ x, z, h: t.TS * 0.46, plate, mat, sp, st: 'idle', t: 0, done: new Set() });
    }
    // 絞肉機：房間裡的圓形鐵柵，底下兩片刀
    const big = rooms.filter(r => (r.hx || 0) * (r.hz || 0) > 40);
    for (let tries = 0, n = Math.round(1 + 1.5 * k); tries < 40 && S.grinders.length < n && big.length; tries++) {
      const r = pick(big), [x, z] = R.roomPoint(r, {}), rad = 1.7;
      if (!clear(x, z, 4.5) || S.grinders.some(o => Math.hypot(o.x - x, o.z - z) < 7) || S.spikes.some(o => Math.hypot(o.x - x, o.z - z) < 3)) continue;
      if (![0, 1, 2, 3, 4, 5, 6, 7].every(i => R.isFloor(x + Math.sin(i * 0.785) * (rad + 0.4), z + Math.cos(i * 0.785) * (rad + 0.4)))) continue;
      const pit = new TH.Mesh(g.disc, lam('#0E0E10')); pit.scale.set(rad * 2, rad * 2, 1); pit.rotation.x = -Math.PI / 2; pit.position.set(x, 0.012, z); F.group.add(pit);
      const rim = new TH.Mesh(g.ring, pixMat('hazard')); rim.scale.set(rad + 0.3, rad + 0.3, 1); rim.rotation.x = -Math.PI / 2; rim.position.set(x, 0.02, z); F.group.add(rim);
      const blades = new TH.Group(); [0, Math.PI / 2].forEach(a => { const b = new TH.Mesh(g.box, lam('#B8BCC4')); b.scale.set(rad * 1.9, 0.06, 0.28); b.rotation.y = a; blades.add(b); [-1, 1].forEach(s => { const tooth = new TH.Mesh(g.cone, lam('#D8DCE4')); tooth.scale.set(0.16, 0.3, 0.16); tooth.position.set(Math.cos(a) * s * rad * 0.8, 0.08, -Math.sin(a) * s * rad * 0.8); blades.add(tooth); }); });
      blades.position.set(x, 0.05, z); F.group.add(blades);
      for (let i = -2; i <= 2; i++) { const bar = new TH.Mesh(g.box, lam('#4A4E56')); const l = 2 * Math.sqrt(Math.max(0, rad * rad - (i * 0.65) * (i * 0.65))); bar.scale.set(l, 0.05, 0.1); bar.position.set(x, 0.2, z + i * 0.65); F.group.add(bar); }
      S.grinders.push({ x, z, r: rad, blades, on: Math.random() < 0.5, t: rnd(1, 4), warn: 0, tick: 0, spin: 0 });
    }
  };
  const tick = dt => {
    const w = W(), run = w.run, P = w.P; if (!S || !on(run) || !P) return;
    const k = S.k, B = bodies(w);
    // 輸送帶
    S.belts.forEach(b => {
      b.ph = (b.ph + dt * 0.9) % 1; const n = b.arrows.length;
      b.arrows.forEach((m, i) => { const u = ((b.ph + i / n) % 1 - 0.5) * b.dir; m.position.set(b.cx + (b.ax ? u * b.L : 0), 0.08, b.cz + (b.ax ? 0 : u * b.L)); });
      B.forEach(o => {
        const dx = o.x - b.cx, dz = o.z - b.cz, along = b.ax ? dx : dz, across = b.ax ? dz : dx; if (Math.abs(along) > b.L / 2 || Math.abs(across) > b.half) return;
        if (!o.ally && o !== P && o.def.boss) return;
        const sp = (o === P ? 3.2 : 2.6) * Math.sqrt(k) * dt * b.dir; push(o, b.ax ? sp : 0, b.ax ? 0 : sp);
        if (o === P) say('belt', '輸送帶！黃色箭頭往哪邊流，就把人往哪邊送——逆著走很慢。也可以拿來把遺跡生物送走。');
      });
    });
    // 地刺
    S.spikes.forEach(s => {
      const onIt = o => Math.abs(o.x - s.x) < s.h && Math.abs(o.z - s.z) < s.h;
      if (s.st === 'idle') { if (B.some(onIt)) { s.st = 'arm'; s.t = 0.5; s.mat.emissiveIntensity = 0.8; R.sfx && R.sfx('lock'); if (onIt(P)) say('spike', '地刺！踩到有孔的鐵板會「喀」一聲變紅，半秒後尖刺冒出來——快離開那塊板子。遺跡生物踩到也會中。'); } }
      else if (s.st === 'arm') { s.t -= dt; s.mat.emissiveIntensity = 0.5 + 0.4 * Math.sin(s.t * 40); if (s.t <= 0) { s.st = 'up'; s.t = 1.0; s.done.clear(); R.sfx && R.sfx('hit'); R.fx('spark', s.x, 0.4, s.z, { color: '#D8DCE4' }); } }
      else if (s.st === 'up') { s.t -= dt; s.sp.position.y = Math.min(0, s.sp.position.y + dt * 12); s.mat.emissiveIntensity = 0.3; B.forEach(o => { if (!s.done.has(o) && onIt(o)) { s.done.add(o); hit(o, 0.22 * k, 30 * k, '地刺'); } }); if (s.t <= 0) { s.st = 'cool'; s.t = 1.4; } }
      else { s.t -= dt; s.sp.position.y = Math.max(-0.75, s.sp.position.y - dt * 3); s.mat.emissiveIntensity = 0; if (s.t <= 0) s.st = 'idle'; }
    });
    // 絞肉機：轉 5～6 秒、停 3 秒（要轉之前一秒冒火星）
    S.grinders.forEach(gr => {
      gr.t -= dt;
      if (!gr.on && gr.t < 1 && Math.random() < dt * 12) R.fx('spark', gr.x + rnd(-1, 1), 0.3, gr.z + rnd(-1, 1), { color: '#FFD04A' });
      if (gr.t <= 0) { gr.on = !gr.on; gr.t = gr.on ? rnd(5, 6.5) : 3; if (gr.on && Math.hypot(P.x - gr.x, P.z - gr.z) < 12) R.sfx && R.sfx('alarm'); }
      gr.spin += ((gr.on ? 9 : 0) - gr.spin) * Math.min(1, dt * 3); gr.blades.rotation.y += gr.spin * dt;
      if (!gr.on) return;
      gr.tick -= dt; const bite = gr.tick <= 0; if (bite) gr.tick = 0.35;
      B.forEach(o => {
        const dx = gr.x - o.x, dz = gr.z - o.z, d = Math.hypot(dx, dz); if (d > gr.r + 1.4) return;
        if (!(!o.ally && o !== P && o.def.boss) && d > 0.05) { const pull = (d < gr.r ? 1.6 : 1.0) * (o === P ? 1 : 1.2) * dt; push(o, dx / d * Math.min(pull, d), dz / d * Math.min(pull, d)); }
        if (d < gr.r && bite) { hit(o, 0.07 * k, 14 * k, '絞肉機'); if (Math.random() < 0.6) R.fx('spark', o.x, 0.5, o.z, { color: '#FFB04A' }); }
        if (o === P && d < gr.r + 1.4) say('grinder', '絞肉機！圓形鐵柵底下的刀在轉的時候會把人吸過去、站在上面一直受傷——轉一陣會停一陣，停下來才走過去。');
      });
    });
  };

  // ---------- 接上 ----------
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const run = W().run, is = run && run.env === 'forge', key = is && R.FORM[run.type] ? run.type : null, keep = key && R.FORM[key];
    if (keep) R.FORM[key] = Object.assign({}, keep, FORM);
    let r; try { r = lf0(f, o); } finally { if (keep) R.FORM[key] = keep; }
    S = null; usedRail.clear();
    if (is) { const F = W().F; try { restyle(F); setup(run, F); dress(run, F); } catch (e) { console.warn('[forge]', e); } }
    return r;
  };
  const st0 = R.step;
  R.step = dt => { const r = st0(dt); try { tick(dt); } catch (e) { console.warn('[forge]', e); } return r; };
  R.forgeFx = () => S;   // 測試用
})(window.R);
