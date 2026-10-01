// 討伐令 1433：陸地上的東鶴與近郊（可以走的地圖）
// 公元 2836 年的東鶴：和德克斯凡技術交流十幾年，城裡鋪了柏油大馬路、立了魔導路燈，東邊是德克斯凡的新商區和選礦廠；
// 老街、西市口的攤子、望月家道場、神社還在。出了城，沿著大路、崙腳可以走到各個遺跡的入口。
// 地形照「東鶴近郊」的示意圖：霜溪由西往東流、西河岸的河由北往南，北橋可以過河，西橋在整修；城南外是南渠和南橋。季節是冬天。
// 座標：示意圖的 1 單位＝遊戲裡的 0.44 公尺（WX、WZ 換算）；整座城的規劃在 city.js（R.CITY）。
(function (R) {
  const T = () => THREE;
  const $ = id => document.getElementById(id);
  const W = R.W;
  const C = R.CITY, S = C.S;
  const WX = sx => (sx - 500) * S, WZ = sy => (sy - 500) * S;
  const HALF = 500 * S;
  let seed = 7; const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  R.townXY = (sx, sy) => [WX(sx), WZ(sy)];

  // ---------- 地形資料：city.js ----------
  const G = { town: C.OLD };
  const AREAS = C.AREAS, DISTRICTS = C.DISTRICTS;
  R.TOWN_G = G; R.TOWN_AREAS = AREAS; R.TOWN_DISTRICTS = DISTRICTS;

  // ---------- 材質：顏色照寫的色碼顯示；點陣花紋照世界座標貼 ----------
  // see：建築用的材質（擋在人物前面時挖成點陣洞）
  const mats = {};
  const lam = (c, o) => {
    o = o || {}; const k = c + '|' + JSON.stringify(o);
    if (mats[k]) return mats[k];
    const m = new (T().MeshLambertMaterial)({ color: c });
    m.color.convertSRGBToLinear();
    if (o.em) { m.emissive.set(o.em); m.emissive.convertSRGBToLinear(); m.emissiveIntensity = o.ei == null ? 0.9 : o.ei; }
    if (o.side) m.side = T().DoubleSide;
    if (!o.em && o.tex !== 0) { m.map = R.pixTex(o.tex || 'plaster'); R.worldUV(m, m.map.image.width); }
    if (o.see) R.seeThrough(m);
    m.userData.shared = true;
    return (mats[k] = m);
  };
  const B_ = (c, o) => lam(c, Object.assign({ see: 1 }, o));   // 建築
  const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)); return Math.hypot(px - (ax + dx * t), pz - (az + dz * t)); };
  const lineDist = (px, pz, pts) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; };
  const segX = (a, b, c, d) => {
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + r[0] * t, a[1] + r[1] * t, Math.atan2(r[1], r[0])] : null;
  };
  const inTown = (sx, sy, pad) => sx > G.town[0] - (pad || 0) && sx < G.town[2] + (pad || 0) && sy > G.town[1] - (pad || 0) && sy < G.town[3] + (pad || 0);

  // ---------- 小地圖的底圖（只畫一次） ----------
  let mapCanvas = null;

  // ---------- 合併繪製：同一種材質的零件合成一個 mesh（幾百個 draw call 變成幾十個） ----------
  const CH = 40;   // 區塊大小（公尺）
  const Batch = () => {
    const TH = T(), map = new Map(), m4 = new TH.Matrix4(), nm = new TH.Matrix3(), q = new TH.Quaternion(), e = new TH.Euler(), p = new TH.Vector3(), s = new TH.Vector3();
    let parent = null;
    // 每個基本形狀只拆一次（非索引的頂點陣列）
    const base = geo => geo.userData.ni || (geo.userData.ni = (() => { const g = geo.index ? geo.toNonIndexed() : geo; return { P: g.attributes.position.array, N: g.attributes.normal.array, U: g.attributes.uv.array, n: g.attributes.position.count }; })());
    return {
      // 之後加的零件都放在 (x, z)、轉 ry
      at(x, z, ry) { parent = x == null ? null : new TH.Matrix4().compose(new TH.Vector3(x, 0, z), new TH.Quaternion().setFromEuler(new TH.Euler(0, ry || 0, 0)), new TH.Vector3(1, 1, 1)); },
      add(geo, mat, x, y, z, sx, sy, sz, rx, ry, rz) {
        e.set(rx || 0, ry || 0, rz || 0); q.setFromEuler(e); p.set(x, y, z); s.set(sx, sy, sz); m4.compose(p, q, s); if (parent) m4.premultiply(parent);
        nm.getNormalMatrix(m4);
        const b = base(geo), me = m4.elements, ne = nm.elements, ck = parent ? parent.elements : me;
        const key = Math.floor((ck[12] + 400) / CH) * 1000 + Math.floor((ck[14] + 400) / CH);
        let bucket = map.get(mat); if (!bucket) map.set(mat, bucket = new Map());
        let A = bucket.get(key); if (!A) bucket.set(key, A = { P: [], N: [], U: [] });
        const BP = b.P, BN = b.N, BU = b.U, P2 = A.P, N2 = A.N, U2 = A.U;
        for (let i = 0; i < b.n; i++) {
          const i3 = i * 3, px = BP[i3], py = BP[i3 + 1], pz = BP[i3 + 2];
          P2.push(me[0] * px + me[4] * py + me[8] * pz + me[12], me[1] * px + me[5] * py + me[9] * pz + me[13], me[2] * px + me[6] * py + me[10] * pz + me[14]);
          const nx = BN[i3], ny = BN[i3 + 1], nz = BN[i3 + 2], ox = ne[0] * nx + ne[3] * ny + ne[6] * nz, oy = ne[1] * nx + ne[4] * ny + ne[7] * nz, oz = ne[2] * nx + ne[5] * ny + ne[8] * nz, l = Math.hypot(ox, oy, oz) || 1;
          N2.push(ox / l, oy / l, oz / l); U2.push(BU[i * 2], BU[i * 2 + 1]);
        }
      },
      flush(par, noShadow) {
        map.forEach((bucket, mat) => bucket.forEach(A => {
          const geo = new TH.BufferGeometry(); geo.setAttribute('position', new TH.BufferAttribute(new Float32Array(A.P), 3)); geo.setAttribute('normal', new TH.BufferAttribute(new Float32Array(A.N), 3)); geo.setAttribute('uv', new TH.BufferAttribute(new Float32Array(A.U), 2)); geo.computeBoundingSphere();
          const mesh = new TH.Mesh(geo, mat); mesh.castShadow = !noShadow && !(mat.emissive && mat.emissive.getHex()); mesh.receiveShadow = true; par.add(mesh);
        }));
        map.clear(); parent = null;
      }
    };
  };
  R.Batch = Batch;

  // 招牌、旗子的貼圖：用點陣（一個點陣像素＝1/12 公尺）
  const pixCanvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new (T().CanvasTexture)(c); t.magFilter = t.minFilter = T().NearestFilter; t.generateMipmaps = false; t.encoding = T().sRGBEncoding; t.userData.canvas = c; return t; };
  R.pixCanvasTex = pixCanvasTex;
  // 公會的徽章（作者提供的圖）：先載入，旗子畫好之後再補上
  const emblem = R.emblemImg || (R.emblemImg = (() => { const im = new Image(); im.src = 'emblem.png'; return im; })());
  R.onEmblem = f => { if (emblem.complete && emblem.naturalWidth) f(); else emblem.addEventListener('load', f, { once: true }); };
  // 綠底、中間是徽章的旗子（pw×ph 個點陣像素）
  R.guildFlagTex = (pw, ph, banner) => {
    const t = pixCanvasTex(pw, ph, (g, W0, H0) => { g.fillStyle = '#2E6A3E'; g.fillRect(0, 0, W0, H0); g.fillStyle = '#C9A13A'; g.fillRect(0, 0, W0, 1); g.fillRect(0, H0 - 1, W0, 1); if (banner) { g.fillRect(0, 0, 1, H0); g.fillRect(W0 - 1, 0, 1, H0); } });
    R.onEmblem(() => { const c = t.userData.canvas, g = c.getContext('2d'), eh = Math.round(c.height * 0.82), ew = Math.round(eh * emblem.naturalWidth / emblem.naturalHeight); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(emblem, Math.round((c.width - ew) / 2), Math.round((c.height - eh) / 2), ew, eh); t.needsUpdate = true; });
    return t;
  };

  // ---------- 直立的點陣看板（和人物一樣只轉向鏡頭）：掛在人頭上的東西用看板，就不會和人互相穿過去 ----------
  const wagasa = () => {
    const c = document.createElement('canvas'); c.width = 34; c.height = 46; const g = c.getContext('2d'), P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    for (let y = 2; y < 14; y++) { const t = (y - 2) / 11, half = Math.round(4 + t * 13); P(17 - half, y, half * 2, 1, y > 11 ? '#8A1E24' : '#C8323A'); }
    for (let i = -3; i <= 3; i++) P(17 + i * 4, 8 + Math.round(Math.abs(i) * 0.7), 1, 5, '#8A1E24');
    P(10, 5, 6, 1, '#E8606A'); P(15, 0, 4, 2, '#E8E0D0'); P(1, 13, 32, 1, '#5A1418');
    P(16, 14, 2, 32, '#5A3E26'); P(16, 14, 1, 32, '#7A5A36'); P(13, 44, 8, 2, '#3A2A1C');
    return c;
  };
  const propSprite = (canvas, x, z, group) => {
    const TH = T(), t = new TH.CanvasTexture(canvas); t.magFilter = t.minFilter = TH.NearestFilter; t.generateMipmaps = false; t.encoding = TH.sRGBEncoding;
    const PX = R.PIX.PX, TILT = R.PIX.TILT, W0 = canvas.width * PX, H0 = canvas.height * PX * TILT, geo = new TH.PlaneGeometry(W0, H0); geo.translate(0, H0 / 2, 0);
    const m = new TH.Mesh(geo, new TH.MeshLambertMaterial({ map: t, alphaTest: 0.5, emissive: '#FFFFFF', emissiveMap: t, emissiveIntensity: 0.22 })); m.renderOrder = 1;
    m.onBeforeRender = function () { const cam = R.W.cam ? R.W.cam.yaw : 0; if (this.rotation.y !== cam) { this.rotation.y = cam; this.updateMatrix(); this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix); } };
    m.position.set(x, 0, z); group.add(m); return m;
  };

  // ---------- 建立場景 ----------
  R.buildTown = scene => {
    const TH = T(), group = new TH.Group(), tw = W.town; seed = 7;
    R.col = { list: [], cells: new Map() };
    tw.inter = []; tw.npcs = []; tw.fx = []; tw.smokes = []; tw.lamps = []; tw.walkNodes = []; tw.steals = []; tw.watchers = [];
    const dd = R.today ? R.today() : null, E = R.eventsToday ? R.eventsToday() : {};
    const SB = Batch(), HB = Batch();   // 街上的小東西、房子
    const G3 = { box: new TH.BoxGeometry(1, 1, 1), cyl: new TH.CylinderGeometry(0.5, 0.5, 1, 10), sph: new TH.SphereGeometry(0.5, 10, 7), cone: new TH.ConeGeometry(0.5, 1, 8), tri: new TH.ShapeGeometry(new TH.Shape([new TH.Vector2(-1, 0), new TH.Vector2(1, 0), new TH.Vector2(0, 1)])) };
    const bx = (w, h, d, m, x, y, z, par) => { const o = new TH.Mesh(new TH.BoxGeometry(w, h, d), typeof m === 'string' ? lam(m) : m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; (par || group).add(o); return o; };
    const block = (x0, x1, z0, z1, tag, ref) => R.addBox(x0, x1, z0, z1, tag || 'town', ref);
    const inter = (x, z, r, label, act, o) => { const it = Object.assign({ x, z, r, label, act }, o || {}); tw.inter.push(it); return it; };
    const talk = R.townTalk;

    // --- 地面：雪地（路面、水、橋在 cityscape.js） ---
    if (!mapCanvas) mapCanvas = C.paintMap(1024);
    tw.groundCanvas = mapCanvas;
    const snowG = new TH.Mesh(new TH.PlaneGeometry(HALF * 2, HALF * 2), lam('#E6ECEF', { tex: 'ground' })); snowG.rotation.x = -Math.PI / 2; snowG.receiveShadow = true; group.add(snowG);
    const outer = new TH.Mesh(new TH.PlaneGeometry(HALF * 6, HALF * 6), lam('#D6DEE2', { tex: 'ground' })); outer.rotation.x = -Math.PI / 2; outer.position.y = -0.05; group.add(outer);
    block(-HALF - 5, -HALF, -HALF - 5, HALF + 5, 'edge'); block(HALF, HALF + 5, -HALF - 5, HALF + 5, 'edge'); block(-HALF - 5, HALF + 5, -HALF - 5, -HALF, 'edge'); block(-HALF - 5, HALF + 5, HALF, HALF + 5, 'edge');

    // --- 城牆與城門 ---
    const [tx0, ty0, tx1, ty1] = [WX(G.town[0]), WZ(G.town[1]), WX(G.town[2]), WZ(G.town[3])];
    const wallM = B_('#8E8A80', { tex: 'wall' }), capM = B_('#EEF2F4', { tex: 'cap' });
    const wallRun = (x0, z0, x1, z1) => { const w = Math.abs(x1 - x0) || 1.4, d = Math.abs(z1 - z0) || 1.4, x = (x0 + x1) / 2, z = (z0 + z1) / 2; HB.add(G3.box, wallM, x, 1.6, z, w, 3.2, d); HB.add(G3.box, capM, x, 3.35, z, w + 0.2, 0.3, d + 0.2); block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'wall'); };
    const gates = C.GATES, GW = C.GW;
    const side = (fixed, from, to, horiz, list) => { let a = from; list.slice().sort((p, q) => p - q).forEach(gp => { if (horiz) wallRun(WX(a), fixed, WX(gp - GW / 2), fixed); else wallRun(fixed, WZ(a), fixed, WZ(gp - GW / 2)); a = gp + GW / 2; }); if (horiz) wallRun(WX(a), fixed, WX(to), fixed); else wallRun(fixed, WZ(a), fixed, WZ(to)); };
    side(ty0, G.town[0], G.town[2], true, gates.n); side(ty1, G.town[0], G.town[2], true, gates.s); side(tx0, G.town[1], G.town[3], false, gates.w); side(tx1, G.town[1], G.town[3], false, gates.e);
    const gw = GW * S / 2;
    const gateHouse = (x, z, rot) => { HB.at(x, z, rot); [-gw - 0.4, gw + 0.4].forEach(o => HB.add(G3.box, wallM, o, 2.6, 0, 1.5, 5.2, 2.0)); HB.add(G3.box, B_('#5A3E2E', { tex: 'planks' }), 0, 5.3, 0, gw * 2 + 2.4, 1, 2.2); HB.add(G3.box, B_('#3A3A44', { tex: 'cap' }), 0, 6.2, 0, gw * 2 + 3.4, 0.5, 3); HB.add(G3.box, capM, 0, 6.55, 0, gw * 2 + 3.2, 0.2, 2.8); HB.at(null); };
    gates.n.forEach(gx => gateHouse(WX(gx), ty0, 0)); gates.s.forEach(gx => gateHouse(WX(gx), ty1, 0)); gates.w.forEach(gy => gateHouse(tx0, WZ(gy), Math.PI / 2)); gates.e.forEach(gy => gateHouse(tx1, WZ(gy), Math.PI / 2));

    // ---------- 房子 ----------
    const ROOFS = ['#3A3A44', '#4A3A34', '#2E3A48', '#44403A', '#5A3A2E', '#3A4A44'];
    const houseCols = ['#B8A688', '#A89478', '#C8BCA2', '#8E7A62', '#D0C4AA', '#9A9286'];
    // 雙坡屋頂（積雪）：屋脊順著長邊，屋簷伸出去一點；兩端是三角形的山牆
    const gableB = (B, w, d, h, oz, wallC) => {
      const alongX = w >= d, span = (alongX ? d : w) / 2 + 0.45, len = (alongX ? w : d) + 0.7, rise = Math.min(2.2, span * 0.72), a = Math.atan2(rise, span), sl = Math.hypot(span, rise) + 0.1;
      const roofM = B_(ROOFS[Math.floor(srand() * ROOFS.length)], { tex: 'cap' }), snowM = B_('#F2F6F8', { tex: 'ground' });
      [-1, 1].forEach(sd => {
        const c = sd * span / 2, cy = h + rise / 2;
        // 雪往屋脊那邊堆（屋簷那一段的瓦片露出來）
        const k = 0.5 + srand() * 0.35, sl2 = sl * k, sh = (sl - sl2) / 2, up = Math.sin(a) * sh, inw = Math.cos(a) * sh;
        if (alongX) { B.add(G3.box, roofM, 0, cy, oz + c, len, 0.16, sl, sd * a, 0, 0); B.add(G3.box, snowM, 0, cy + 0.12 + up, oz + c - sd * inw, len - 0.3 - srand() * 0.6, 0.1, sl2, sd * a, 0, 0); }
        else { B.add(G3.box, roofM, c, cy, oz, sl, 0.16, len, 0, 0, -sd * a); B.add(G3.box, snowM, c - sd * inw, cy + 0.12 + up, oz, sl2, 0.1, len - 0.3 - srand() * 0.6, 0, 0, -sd * a); }
      });
      const triM = B_(wallC, { side: 1 });
      [-1, 1].forEach(sd => { if (alongX) B.add(G3.tri, triM, sd * (w / 2 - 0.02), h, oz, d / 2, rise, 1, 0, Math.PI / 2, 0); else B.add(G3.tri, triM, 0, h, oz + sd * (d / 2 - 0.02), w / 2, rise, 1); });
      B.add(G3.box, B_('#2A2A30', { tex: 0 }), 0, h + rise + 0.02, oz, alongX ? len : 0.22, 0.16, alongX ? 0.22 : len);
    };
    const glowW = B_('#FFD08A', { em: '#FFB050', ei: 0.85 }), darkW = B_('#2A2A30', { tex: 0 }), woodM = B_('#4A3424', { tex: 'planks' });
    // 一般的房子：face 0 門朝南、Math.PI 門朝北
    // 有的是店家（暖簾、看板、提燈）、土藏（白牆黑腰）、兩層樓（有下屋）；有的有煙囪
    const house = (sx, sy, w, d, h, col, face, o) => {
      o = o || {};
      const x = WX(sx), z = WZ(sy), B = HB; B.at(x, z, face || 0);
      const two = o.floors ? o.floors > 1 : o.two != null ? o.two : w > 5.2 && srand() < 0.45, store = !two && !o.shop && o.shop !== false && srand() < 0.18, shop = o.shop || (o.shop !== false && !store && srand() < 0.35), wallC = store ? '#EEEAE0' : col;
      B.add(G3.box, B_(store ? '#2E2A2A' : '#6E6A62', { tex: 'wall' }), 0, 0.25, 0, w + 0.12, 0.5, d + 0.12);
      B.add(G3.box, B_(wallC), 0, (h + 0.5) / 2, 0, w, h - 0.5, d);
      if (!store) { [-1, 1].forEach(a => [-1, 1].forEach(b2 => B.add(G3.box, woodM, a * (w / 2 - 0.06), h / 2, b2 * (d / 2 - 0.06), 0.18, h, 0.18))); B.add(G3.box, woodM, 0, h - 0.08, d / 2 + 0.02, w + 0.02, 0.16, 0.06); B.add(G3.box, woodM, 0, 1.45, d / 2 + 0.02, w + 0.02, 0.1, 0.05); }
      else B.add(G3.box, B_('#2E2A2A', { tex: 0 }), 0, 1.2, d / 2 + 0.02, w + 0.02, 0.1, 0.05);
      const doorX = o.doorX != null ? o.doorX : (srand() - 0.5) * Math.max(0, w - 2.6);
      B.add(G3.box, B_(store ? '#3A3232' : '#5A3E26', { tex: 'planks' }), doorX, 1.15, d / 2 + 0.04, store ? 1.2 : 1.0, 1.7, 0.08);
      if (shop) {
        const nc = o.noren || ['#2E4A6A', '#8A2A24', '#3E5A3A', '#5A3A6A'][Math.floor(srand() * 4)];
        for (let i = 0; i < 3; i++) B.add(G3.box, B_(nc, { tex: 0 }), doorX - 0.34 + i * 0.34, 1.78, d / 2 + 0.12, 0.3, 0.55, 0.03);
        B.add(G3.box, woodM, doorX, 2.08, d / 2 + 0.12, 1.2, 0.06, 0.06);
        if (!o.noLantern) B.add(G3.cyl, B_('#E04A3A', { em: '#A02818', ei: 0.7 }), doorX - 1.0, 2.15, d / 2 + 0.3, 0.32, 0.46, 0.32);
        if (w > 3.4 && srand() < 0.7) { const sc = ['#2E2A2A', '#5A1E1C', '#1E3A2A', '#2E3A5A'][Math.floor(srand() * 4)]; B.add(G3.box, B_(sc, { tex: 0 }), w / 2 - 0.35, 2.9, d / 2 + 0.35, 0.12, 1.6, 0.5); B.add(G3.box, B_('#E8D8B0', { tex: 0 }), w / 2 - 0.28, 2.9, d / 2 + 0.35, 0.02, 1.3, 0.34); }
      }
      const winRow = (y, ww, zz) => {
        const n = Math.max(1, Math.floor((ww - 1.2) / 1.5));
        for (let i = 0; i < n; i++) {
          const wx = n === 1 ? (doorX > 0 ? -ww / 4 : ww / 4) : -ww / 2 + 0.9 + i * (ww - 1.8) / (n - 1); if (y < 2.4 && Math.abs(wx - doorX) < 1.0) continue;
          B.add(G3.box, srand() < 0.55 ? glowW : darkW, wx, y, zz + 0.03, store ? 0.5 : 0.8, store ? 0.5 : 0.7, 0.05);
          if (!store) { B.add(G3.box, woodM, wx, y, zz + 0.06, 0.06, 0.7, 0.04); B.add(G3.box, woodM, wx, y, zz + 0.06, 0.8, 0.06, 0.04); }
        }
      };
      winRow(store ? h * 0.8 : h * 0.62, w, d / 2);
      if (two) {
        const up = (o.floors || 2) - 1, w2 = w - 0.6, d2 = d - 1.4, h2 = h + 2.2 * up, oz = -0.4;
        for (let f = 0; f < up; f++) { B.add(G3.box, B_(wallC), 0, h + 1.1 + f * 2.2, oz, w2, 2.2, d2); [-1, 1].forEach(a => B.add(G3.box, woodM, a * (w2 / 2 - 0.06), h + 1.1 + f * 2.2, oz + d2 / 2 - 0.06, 0.16, 2.2, 0.16)); winRow(h + 1.2 + f * 2.2, w2, oz + d2 / 2); if (f) B.add(G3.box, woodM, 0, h + f * 2.2, oz + d2 / 2 + 0.03, w2 + 0.04, 0.12, 0.06); }
        B.add(G3.box, B_(ROOFS[0], { tex: 'cap' }), 0, h + 0.15, d / 2 - 0.15, w + 0.3, 0.12, 1.3, 0.38, 0, 0); B.add(G3.box, B_('#F2F6F8', { tex: 'ground' }), 0, h + 0.24, d / 2 - 0.15, w + 0.2, 0.07, 1.2, 0.38, 0, 0);
        gableB(B, w2, d2, h2, oz, wallC);
      } else gableB(B, w, d, h, 0, wallC);
      const f = face ? -1 : 1;
      if (o.chimney || srand() < 0.4) { const cx = (srand() - 0.5) * w * 0.5, top = (two ? h + 2.2 * ((o.floors || 2) - 1) : h) + 1.7; B.add(G3.box, B_('#6A6460', { tex: 'wall' }), cx, top - 0.5, -d * 0.15, 0.6, 1.8, 0.6); B.add(G3.box, B_('#F2F6F8', { tex: 'ground' }), cx, top + 0.42, -d * 0.15, 0.66, 0.08, 0.66); tw.smokes.push({ x: x + cx * f, y: top + 0.6, z: z - d * 0.15 * f }); }
      B.at(null);
      const side90 = Math.abs(Math.sin(face || 0)) > 0.5, bw = side90 ? d : w, bd = side90 ? w : d;
      block(x - bw / 2, x + bw / 2, z - bd / 2, z + bd / 2, 'house');
      const c0 = Math.cos(face || 0), s0 = Math.sin(face || 0), sx2 = -w / 2 + 0.6 + srand() * (w - 1.2), sz2 = d / 2 + 0.4;
      SB.add(G3.sph, lam('#F2F6F8', { tex: 'ground' }), x + c0 * sx2 + s0 * sz2, 0, z - s0 * sx2 + c0 * sz2, 1.1 + srand() * 0.8, 0.3, 0.5, 0, face || 0, 0);
      return { x, z, w, d, doorX: x + c0 * doorX + s0 * (d / 2 + 0.9), doorZ: z - s0 * doorX + c0 * (d / 2 + 0.9) };
    };
    const reserve = () => {};   // 舊的保留區（現在由 city.js 的格子處理）
    const FAC = C.FAC, at2 = k => [WX(FAC[k][0]), WZ(FAC[k][1])];

    // ---------- 設施 ----------
    const sign = (x, y, z, rotY, txt, col, w) => {   // 招牌（點陣字）
      const ww = w || 2.6, t = pixCanvasTex(Math.round(ww * 12) * 4, 32, (g, W0, H0) => { g.fillStyle = col || '#3A2A1C'; g.fillRect(0, 0, W0, H0); g.strokeStyle = '#C9A13A'; g.lineWidth = 3; g.strokeRect(2, 2, W0 - 4, H0 - 4); g.fillStyle = '#F4E9CD'; g.font = 'bold 20px "Noto Serif TC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W0 / 2, H0 / 2 + 1); });
      const m = new TH.Mesh(new TH.PlaneGeometry(ww, 0.65), R.seeThrough(new TH.MeshBasicMaterial({ map: t }))); m.position.set(x, y, z); m.rotation.y = rotY || 0; group.add(m); return m;
    };
    const lampPost = (x, z) => {   // 魔導路燈（德克斯凡的）
      SB.add(G3.box, lam('#2E3036', { tex: 0 }), x, 1.9, z, 0.16, 3.8, 0.16); SB.add(G3.box, lam('#2E3036', { tex: 0 }), x, 3.8, z, 0.7, 0.1, 0.12);
      SB.add(G3.box, lam('#FFF4D8', { em: '#FFE0A0', ei: 1 }), x + 0.3, 3.62, z, 0.28, 0.28, 0.28); SB.add(G3.box, lam('#3A3C42', { tex: 0 }), x, 0.1, z, 0.4, 0.2, 0.4);
      block(x - 0.12, x + 0.12, z - 0.12, z + 0.12, 'deco'); tw.lamps.push([x, z]);
    };
    const stoneLantern = (x, z) => { SB.add(G3.box, lam('#8C8A82', { tex: 'wall' }), x, 0.1, z, 0.7, 0.2, 0.7); SB.add(G3.box, lam('#8C8A82', { tex: 'wall' }), x, 0.65, z, 0.26, 0.9, 0.26); SB.add(G3.box, lam('#FFD9A0', { em: '#FFB050', ei: 0.9 }), x, 1.3, z, 0.44, 0.4, 0.44); SB.add(G3.cone, lam('#EEF2F4', { tex: 'ground' }), x, 1.68, z, 1.1, 0.36, 1.1, 0, Math.PI / 4, 0); block(x - 0.35, x + 0.35, z - 0.35, z + 0.35, 'deco'); };
    const propBox = (x, z, r2) => block(x - r2, x + r2, z - r2, z + r2, 'deco');

    // 公會東鶴分館：西市口的三層石樓、綠旗、門口銅牌（《東鶴初心》）；旗子上是公會的徽章
    { const [x, z] = at2('guild'), w = 13, d = 9.5, fh = 3.3, B = HB; B.at(x, z, 0);
      const stone = B_('#9C978D', { tex: 'wall' }), ledge = B_('#EEF2F4', { tex: 'cap' });
      for (let f = 0; f < 3; f++) { B.add(G3.box, stone, 0, f * fh + fh / 2, 0, w - f * 0.4, fh, d - f * 0.4); B.add(G3.box, ledge, 0, (f + 1) * fh + 0.05, 0, w - f * 0.4 + 0.3, 0.16, d - f * 0.4 + 0.3); }
      B.add(G3.box, B_('#34383F', { tex: 'cap' }), 0, 3 * fh + 0.55, 0, w - 0.6, 0.8, d - 0.6); B.add(G3.box, B_('#F2F6F8', { tex: 'ground' }), 0, 3 * fh + 1.0, 0, w - 0.8, 0.12, d - 0.8);
      B.add(G3.box, B_('#3A2A1C', { tex: 'planks' }), 0, 1.5, d / 2 + 0.04, 2.4, 3, 0.1); B.add(G3.box, stone, 0, 3.2, d / 2 + 0.1, 3.2, 0.5, 0.25);
      B.add(G3.box, B_('#7A766C', { tex: 'cap' }), 0, 0.1, d / 2 + 0.7, 4, 0.2, 1.2); B.add(G3.box, B_('#C9A13A', { em: '#5A4010', ei: 0.4 }), 1.7, 1.6, d / 2 + 0.06, 0.6, 0.45, 0.04);
      for (let f = 0; f < 3; f++) [-5, -3.4, 3.4, 5].forEach(o => { B.add(G3.box, f === 0 || srand() < 0.7 ? glowW : darkW, o * (1 - f * 0.03), f * fh + 1.9, d / 2 - f * 0.2 + 0.03, 0.9, 1.1, 0.06); });
      [-5.6, 5.6].forEach(o => B.add(G3.box, B_('#5A4A3A', { tex: 0 }), o, 6.2, d / 2 + 0.5, 0.14, 7.4, 0.14));
      B.at(null);
      block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'house');
      [-5.6, 5.6].forEach(o => { const fl = new TH.Mesh(new TH.PlaneGeometry(1.7, 1.2), R.seeThrough(new TH.MeshLambertMaterial({ map: R.guildFlagTex(20, 14), side: TH.DoubleSide }))); fl.position.set(x + o + (o < 0 ? -0.9 : 0.9), 9.2, z + d / 2 + 0.5); group.add(fl); tw.fx.push({ kind: 'flag', m: fl, ph: o }); });
      const banner = new TH.Mesh(new TH.PlaneGeometry(2.4, 3.4), R.seeThrough(new TH.MeshLambertMaterial({ map: R.guildFlagTex(29, 41, 1) }))); banner.position.set(x, 6.6, z + d / 2 + 0.06); group.add(banner);
      sign(x, 3.9, z + d / 2 + 0.26, 0, '公會東鶴分館', '#2E4A34', 3.2);
      inter(x, z + d / 2 + 1.4, 2.6, '走進公會東鶴分館', () => R.enterInterior('guild'), { door: 1 });
    }
    // 委託的告示板、瓦版（東鶴日報）
    { const [x, z] = at2('board'); SB.add(G3.box, lam('#5A3E26', { tex: 'planks' }), x - 1.1, 1.1, z, 0.2, 2.2, 0.2); SB.add(G3.box, lam('#5A3E26', { tex: 'planks' }), x + 1.1, 1.1, z, 0.2, 2.2, 0.2); SB.add(G3.box, lam('#8A6A44', { tex: 'planks' }), x, 1.7, z, 2.6, 1.3, 0.12);
      for (let i = 0; i < 5; i++) SB.add(G3.box, lam('#F4E9CD', { tex: 0 }), x - 0.9 + i * 0.45, 1.7 + (i % 2 ? 0.2 : -0.2), z + 0.08, 0.5, 0.55, 0.02); block(x - 1.3, x + 1.3, z - 0.2, z + 0.2); inter(x, z + 1, 2, '看公會的委託', () => R.openHub('guild', 'quests')); }
    { const [x, z] = at2('news'); SB.add(G3.box, lam('#3A2A1C', { tex: 'planks' }), x, 1.2, z, 2.4, 2.4, 0.16); SB.add(G3.box, lam('#EDE4CC', { tex: 0 }), x, 1.35, z + 0.09, 2.1, 1.6, 0.02); SB.add(G3.box, lam('#3A3A44', { tex: 'cap' }), x, 2.5, z + 0.1, 2.7, 0.14, 0.5, 0.3, 0, 0);
      for (let i = 0; i < 6; i++) SB.add(G3.box, lam('#5A5040', { tex: 0 }), x - 0.8 + (i % 3) * 0.8, 1.7 - Math.floor(i / 3) * 0.6, z + 0.1, 0.6, 0.04, 0.01);
      block(x - 1.2, x + 1.2, z - 0.15, z + 0.15); inter(x, z + 1.1, 2.1, '看瓦版（東鶴日報：今天的新聞）', () => R.newsSheet && R.newsSheet()); }
    // 老岩的鐵匠鋪：煙囪冒煙、門口有鐵砧；旁邊停著老岩的礦車（可以偷礦石——學徒看著）
    { const [x, z] = at2('smith'), B = HB; B.at(x, z, 0);
      B.add(G3.box, B_('#6A5040', { tex: 'wall' }), 0, 1.8, 0, 8, 3.6, 6); gableB(B, 8, 6, 3.6, 0, '#6A5040');
      B.add(G3.box, B_('#5A5652', { tex: 'wall' }), 2.6, 5, -1.2, 1, 3.4, 1); B.add(G3.box, B_('#FF8A3A', { em: '#FF5A1A', ei: 1 }), -1.8, 1.2, 3.03, 2.4, 1.6, 0.1);
      B.add(G3.box, B_('#3A2A1C', { tex: 'planks' }), 1.2, 1.2, 3.04, 1.2, 2.2, 0.08);
      B.at(null); block(x - 4, x + 4, z - 3, z + 3, 'house');
      SB.add(G3.box, lam('#3A3A40', { tex: 0 }), x - 2.8, 0.7, z + 4.2, 1, 0.6, 0.5); SB.add(G3.box, lam('#3A3A40', { tex: 0 }), x - 2.8, 0.2, z + 4.2, 0.5, 0.4, 0.4); block(x - 3.3, x - 2.3, z + 3.9, z + 4.5, 'deco');
      tw.smoke = { x: x + 2.6, y: 6.8, z: z - 1.2 }; sign(x - 0.4, 3.0, z + 3.12, 0, '老岩的鐵匠鋪');
      inter(x + 1.2, z + 4.3, 2.4, '走進老岩的鐵匠鋪（鑑定、製作、強化）', () => R.enterInterior('smith'), { door: 1 });
      const ap = npc(x - 1.6, z + 5.4, { top: '#6A5A48', hair: '#3A2A1C', cloak: '#4A3A30' }, '鐵匠鋪的學徒', 0.4);
      ap.watch = { range: 9, fov: 1.15 }; tw.watchers.push(ap);
      inter(x - 1.6, z + 6.4, 1.6, '和鐵匠鋪的學徒說話', () => talk('鐵匠鋪的學徒', ['「師父在裡面打鐵，直接進去就好。」', '「礦車是師父的，別亂碰。……我可是一直看著的喔。」']));
      { const cx = x + 5.6, cz = z + 3.4; SB.add(G3.box, lam('#5A4A3A', { tex: 'planks' }), cx, 0.65, cz, 1.4, 0.8, 1.9); SB.add(G3.box, lam('#7A7068', { tex: 0 }), cx, 1.08, cz, 1.2, 0.2, 1.7);
        [[-0.25, -0.35], [0.3, 0.3], [-0.1, 0.4]].forEach(([a, b2], i) => SB.add(G3.box, i === 1 ? lam('#9A7AFF', { em: '#3A2A8A', ei: 0.5 }) : lam('#A3ACB6', { tex: 0 }), cx + a, 1.3, cz + b2, 0.36, 0.3, 0.36, 0.6, i, 0.3));
        [-0.6, 0.6].forEach(o => SB.add(G3.cyl, lam('#2A2A30', { tex: 0 }), cx + o * 1.12, 0.3, cz, 0.6, 0.12, 0.6, 0, 0, Math.PI / 2));
        block(cx - 0.75, cx + 0.75, cz - 1, cz + 1, 'deco');
        if (R.addSteal) R.addSteal({ x: cx, z: cz + 1.4, r: 1.9, label: '偷老岩礦車裡的礦石', owner: 'smith', time: 1.4, loot: () => (Math.random() < 0.3 ? { mat: 'manaore', n: 1 } : { mat: 'iron', n: 1 + (Math.random() < 0.4 ? 1 : 0) }), max: 3 }); }
    }
    // 白藤堂：城西的藥鋪，屋簷掛著白色的藤花
    { const [x, z] = at2('pharmacy'), B = HB; B.at(x, z, 0); B.add(G3.box, B_('#E6E0D2'), 0, 1.7, 0, 7, 3.4, 5.5); gableB(B, 7, 5.5, 3.4, 0, '#E6E0D2');
      for (let i = 0; i < 9; i++) B.add(G3.box, B_('#F4F0FF', { tex: 0 }), -3 + i * 0.75, 2.9, 3, 0.22, 0.6 + (i % 3) * 0.2, 0.22);
      B.add(G3.box, B_('#5A3E26', { tex: 'planks' }), 0, 1.15, 2.79, 1.2, 1.9, 0.08); [-2.2, 2.2].forEach(o => B.add(G3.box, glowW, o, 1.7, 2.78, 1.1, 0.8, 0.05));
      B.at(null); block(x - 3.5, x + 3.5, z - 2.75, z + 2.75, 'house');
      sign(x, 3.0, z + 2.85, 0, '白藤堂', '#4A3A5A'); inter(x, z + 3.9, 2.4, '走進白藤堂（藥鋪）', () => R.enterInterior('pharmacy'), { door: 1 }); }
    // 赤提燈：居酒屋（樓上是宿屋），門口一排紅提燈
    { const [x, z] = at2('tavern'); house(FAC.tavern[0], FAC.tavern[1], 9, 7.5, 3.4, '#8E7A62', 0, { two: true, shop: true, noren: '#8A2A24', doorX: 0, noLantern: true, chimney: true });
      for (let i = 0; i < 5; i++) SB.add(G3.cyl, lam('#E04A3A', { em: '#C02818', ei: 0.95 }), x - 3.2 + i * 1.6, 2.6, z + 3.95, 0.42, 0.6, 0.42);
      SB.add(G3.box, lam('#3A2A1C', { tex: 'planks' }), x, 2.95, z + 3.95, 8.2, 0.06, 0.06);
      sign(x, 3.6, z + 3.9, 0, '赤提燈', '#5A1E1C'); inter(x, z + 4.9, 2.4, '走進赤提燈（居酒屋・宿屋）', () => R.enterInterior('tavern'), { door: 1 }); }
    // 倉庫：白牆黑瓦的土藏
    { const [x, z] = at2('store'), B = HB; B.at(x, z, 0); B.add(G3.box, B_('#F0ECE2'), 0, 2.2, 0, 7, 4.4, 6); B.add(G3.box, B_('#2E2A2A', { tex: 0 }), 0, 0.6, 0, 7.1, 1.2, 6.1); gableB(B, 7, 6, 4.4, 0, '#F0ECE2');
      B.add(G3.box, B_('#3A3232', { tex: 'planks' }), 0, 1.2, 3.03, 1.8, 2.4, 0.1); B.at(null); block(x - 3.5, x + 3.5, z - 3, z + 3, 'house');
      sign(x, 3.0, z + 3.1, 0, '倉庫', '#2E2A2A'); inter(x, z + 4.2, 2.4, '走進倉庫（換裝備）', () => R.enterInterior('store'), { door: 1 }); }
    // 驛站：馬車、德克斯凡的貨車，往全國的遺跡
    { const [x, z] = at2('coach'), B = HB; B.at(x, z, 0); B.add(G3.box, B_('#8A6A4A', { tex: 'planks' }), 0, 1.6, 0, 9, 3.2, 6); gableB(B, 9, 6, 3.2, 0, '#8A6A4A');
      B.add(G3.box, B_('#5A3E26', { tex: 'planks' }), 0, 1.2, 3.03, 1.6, 2.2, 0.08); [-3, 3].forEach(o => B.add(G3.box, glowW, o, 1.8, 3.02, 1.2, 0.8, 0.05)); B.at(null);
      block(x - 4.5, x + 4.5, z - 3, z + 3, 'house'); sign(x, 3.0, z + 3.1, 0, '驛站', '#3A2A1C');
      inter(x, z + 4.2, 2.4, '走進驛站（馬車、貨車：昭旭全國的遺跡）', () => R.enterInterior('station'), { door: 1 });
      cart(x - 7.5, z + 1.5, 0.2); truck(x + 6.4, z + 2.2, 0); crates(x - 6.2, z - 1.8); }
    // 東鶴神社：鳥居、參道、石燈籠、拜殿、籤筒
    { const [x, z] = at2('shrine'), B = HB; B.at(x, z, 0);
      B.add(G3.box, B_('#E6E0D2'), 0, 1.6, 0, 6, 3.2, 4.6); B.add(G3.box, B_('#8A2A24', { tex: 'planks' }), 0, 1.6, 2.32, 6, 3.2, 0.06);
      gableB(B, 6, 4.6, 3.2, 0, '#E6E0D2'); B.add(G3.box, B_('#C9A13A', { em: '#5A4010', ei: 0.3 }), 0, 2.6, 2.4, 0.5, 0.5, 0.05); B.add(G3.box, B_('#6A6462', { tex: 'wall' }), 0, 0.2, 2.9, 3, 0.4, 1);
      B.at(null); block(x - 3, x + 3, z - 2.3, z + 2.3, 'house');
      const tz = z + 8.4; [-1.7, 1.7].forEach(o => SB.add(G3.cyl, lam('#C8322A', { tex: 0 }), x + o, 1.7, tz, 0.34, 3.4, 0.34)); SB.add(G3.box, lam('#1A1A1A', { tex: 0 }), x, 3.55, tz, 5.2, 0.32, 0.4); SB.add(G3.box, lam('#C8322A', { tex: 0 }), x, 3.0, tz, 4.2, 0.22, 0.3); SB.add(G3.box, lam('#F2F6F8', { tex: 'ground' }), x, 3.75, tz, 5.0, 0.08, 0.36);
      [-1.7, 1.7].forEach(o => block(x + o - 0.2, x + o + 0.2, tz - 0.2, tz + 0.2, 'deco'));
      [[-2.4, 3.4], [2.4, 3.4], [-2.4, 6.4], [2.4, 6.4]].forEach(([a, b2]) => stoneLantern(x + a, z + b2));
      inter(x, z + 3.6, 2.2, '參拜（投一點香油錢）', () => R.shrinePray && R.shrinePray());
      SB.add(G3.box, lam('#6A4A2E', { tex: 'planks' }), x + 3.8, 0.6, z + 3.4, 0.7, 1.2, 0.5); SB.add(G3.box, lam('#F4E9CD', { tex: 0 }), x + 3.8, 1.25, z + 3.4, 0.5, 0.1, 0.3); block(x + 3.4, x + 4.2, z + 3.1, z + 3.7, 'deco');
      inter(x + 3.8, z + 4.4, 1.8, '抽籤（5 費拉）', () => R.omikuji && R.omikuji());
      for (let i = 0; i < 5; i++) pineAt(x - 6 + (i % 2) * 12, z - 3 + i * 1.6, 0.9);
    }
    // 西市兌換所：廣場西南角的小亭子（換錢、驗貨幣）
    { const [x, z] = at2('exchange'); SB.add(G3.box, lam('#6A5040', { tex: 'planks' }), x, 1.2, z, 2.6, 2.4, 2); SB.add(G3.box, lam('#3A3A44', { tex: 'cap' }), x, 2.55, z, 3.2, 0.2, 2.6); SB.add(G3.box, lam('#F2F6F8', { tex: 'ground' }), x, 2.7, z, 3.0, 0.1, 2.4);
      SB.add(G3.box, lam('#FFE0A0', { em: '#FFB050', ei: 0.7 }), x, 1.5, z - 1.02, 1.6, 0.8, 0.05); block(x - 1.3, x + 1.3, z - 1, z + 1, 'deco');
      sign(x, 2.95, z - 1.32, Math.PI, '西市兌換所', '#2E3A48', 2.2);
      inter(x, z - 2.0, 2.0, '西市兌換所（驗貨幣、換錢）', () => R.exchangeSheet ? R.exchangeSheet() : talk('西市兌換所', ['「赤金要看鳴文：紅色的漩渦才是真的。」', '「昭旭的舊銅錢，這個月又跌了。」'])); }
    // 望月家道場：圍牆、正門、庭院（練習用的木樁）、主屋
    { const x0 = WX(FAC.dojo[0]), x1 = WX(FAC.dojo[2]), z0 = WZ(FAC.dojo[1]), z1 = WZ(FAC.dojo[3]), cx = (x0 + x1) / 2;
      const fence = B_('#D8D0BE'), roofE = B_('#3A3A44', { tex: 'cap' });
      const fenceRun = (ax, az, bx2, bz) => { const w = Math.abs(bx2 - ax) || 0.4, d = Math.abs(bz - az) || 0.4, mx = (ax + bx2) / 2, mz = (az + bz) / 2; HB.add(G3.box, fence, mx, 1.0, mz, w, 2, d); HB.add(G3.box, roofE, mx, 2.1, mz, w + 0.3, 0.2, d + 0.3); block(mx - w / 2, mx + w / 2, mz - d / 2, mz + d / 2, 'wall'); };
      fenceRun(x0, z0, x1, z0); fenceRun(x0, z0, x0, z1); fenceRun(x1, z0, x1, z1); fenceRun(x0, z1, cx - 1.6, z1); fenceRun(cx + 1.6, z1, x1, z1);
      HB.at(cx, z1, 0); [-1.7, 1.7].forEach(o => HB.add(G3.box, woodM, o, 1.5, 0, 0.3, 3, 0.3)); HB.add(G3.box, roofE, 0, 3.1, 0, 4.4, 0.3, 1.2); HB.add(G3.box, B_('#F2F6F8', { tex: 'ground' }), 0, 3.3, 0, 4.2, 0.1, 1.1); HB.at(null);
      sign(cx, 2.5, z1 + 0.25, 0, '望月家道場', '#3A2A1C', 2.2);
      house((FAC.dojo[0] + FAC.dojo[2]) / 2, FAC.dojo[1] + 12, 12, 6, 3.4, '#CFC2A8', 0, { two: false, shop: false, doorX: 0, chimney: true });
      [-3.5, -1.5, 2].forEach(a => { const pz = z1 - 4; SB.add(G3.cyl, lam('#8A6A44', { tex: 'planks' }), cx + a, 0.8, pz, 0.3, 1.6, 0.3); SB.add(G3.box, lam('#D8C8A0', { tex: 0 }), cx + a, 1.2, pz, 0.42, 0.3, 0.42); block(cx + a - 0.2, cx + a + 0.2, pz - 0.2, pz + 0.2, 'deco'); });
      inter(cx, z1 + 1.4, 2.4, '望月家道場的大門', () => (R.dojoGate ? R.dojoGate() : talk('望月家道場', ['門裡傳來木刀相擊的聲音。', '門口掛著「望月」的木牌。'])));
      tw.dojo = { x: cx, z: z1 - 3, z1 };
    }
    // 新商區：德克斯凡的店（玻璃櫥窗、發亮的招牌）；門口的自動販賣機
    const dexShop = (sx, sy, w, d, name, col, glow) => {
      const x = WX(sx), z = WZ(sy), B = HB; B.at(x, z, 0);
      B.add(G3.box, B_('#C8C8C4', { tex: 'wall' }), 0, 2.2, 0, w, 4.4, d); B.add(G3.box, B_('#5A5C62', { tex: 'cap' }), 0, 4.5, 0, w + 0.3, 0.2, d + 0.3); B.add(G3.box, B_('#F2F6F8', { tex: 'ground' }), 0, 4.65, 0, w + 0.1, 0.1, d + 0.1);
      B.add(G3.box, B_('#9AC8E8', { em: glow || '#3A6A9A', ei: 0.7 }), -w / 4, 1.5, d / 2 + 0.03, w / 2 - 0.4, 2, 0.06); B.add(G3.box, B_('#3A3C42', { tex: 0 }), w / 4, 1.3, d / 2 + 0.04, 1.4, 2.4, 0.08);
      B.add(G3.box, B_(col, { em: col, ei: 0.6 }), 0, 3.5, d / 2 + 0.06, w - 0.6, 0.7, 0.06);
      B.at(null); block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'house'); sign(x, 3.5, z + d / 2 + 0.1, 0, name, '#1E2A3A', Math.min(w - 0.8, 3.4));
      return { x, z, door: [x + w / 4, z + d / 2 + 1] };
    };
    { const a = dexShop(FAC.dexTrade[0], FAC.dexTrade[1], 8, 6, '德克斯凡商行', '#3A8ACF'), b = dexShop(FAC.dexParts[0], FAC.dexParts[1], 6, 5.5, '魔導燈具・零件', '#E8A03A', '#8A6A2A');
      inter(a.door[0], a.door[1], 2.0, '德克斯凡商行', () => R.dexShop ? R.dexShop('trade') : talk('德克斯凡商行', ['門上貼著公告：「本店經理遇害，暫停營業。」']));
      inter(b.door[0], b.door[1], 2.0, '魔導燈具・零件行（機油、零件、溫室玫瑰）', () => (R.dexShop ? R.dexShop('parts') : null));
      vending(a.door[0] - 3.2, a.door[1] - 0.2);
      const clerk = npc(b.door[0] - 1.8, b.door[1] + 0.4, { top: '#2E3A4A', hair: '#E9D8A6', cloak: '#3A4A5A' }, '零件行的店員', 0.3); clerk.watch = { range: 8, fov: 1.1 }; tw.watchers.push(clerk);
      SB.add(G3.box, lam('#6A7A8A', { tex: 0 }), b.door[0] + 1.8, 0.5, b.door[1] - 0.2, 1, 1, 0.8); block(b.door[0] + 1.3, b.door[0] + 2.3, b.door[1] - 0.6, b.door[1] + 0.2, 'deco');
      if (R.addSteal) R.addSteal({ x: b.door[0] + 1.8, z: b.door[1] + 0.8, r: 1.6, label: '順手拿走門口箱子裡的零件', owner: 'parts', time: 1.1, loot: () => ({ gift: 'parts', n: 1 }), max: 2 });
    }
    { const p = dexShop(FAC.cafe[0], FAC.cafe[1], 9, 6, '德克斯凡咖啡館', '#C83A6A', '#8A2A4A'); inter(p.door[0], p.door[1], 2.0, '德克斯凡咖啡館（熱飲：下一趟遺跡的加成）', () => (R.cafeSheet ? R.cafeSheet() : null)); }
    // 德克斯凡礦務公司・東鶴選礦廠：鋸齒屋頂、兩根大煙囪、圍起來的貨場
    { const [x, z] = at2('factory'), w = 16, d = 9, B = HB; B.at(x, z, 0);
      B.add(G3.box, B_('#8A5A44', { tex: 'wall' }), 0, 2.8, 0, w, 5.6, d);
      for (let i = 0; i < 4; i++) { const ox = -w / 2 + 2 + i * 4; B.add(G3.box, B_('#4A4C52', { tex: 'cap' }), ox, 6.6, 0, 4, 0.2, d + 0.3, 0, 0, -0.45); B.add(G3.box, B_('#9AC8E8', { em: '#3A5A6A', ei: 0.4 }), ox + 1.8, 6.7, 0, 0.1, 1.6, d - 0.4); B.add(G3.box, B_('#F2F6F8', { tex: 'ground' }), ox, 6.75, 0, 3.6, 0.08, d, 0, 0, -0.45); }
      [-5, 4].forEach(o => { B.add(G3.cyl, B_('#6A4A3A', { tex: 'wall' }), o, 8, -2.6, 1.3, 10, 1.3); B.add(G3.cyl, B_('#3A3A40', { tex: 0 }), o, 13.1, -2.6, 1.45, 0.4, 1.45); tw.smokes.push({ x: x + o, y: 13.6, z: z - 2.6, big: 1 }); });
      B.add(G3.box, B_('#3A3C42', { tex: 0 }), -3, 1.8, d / 2 + 0.04, 3.6, 3.6, 0.1); [2, 5].forEach(o => B.add(G3.box, glowW, o, 3.2, d / 2 + 0.03, 1.6, 1, 0.05));
      B.at(null); block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'house');
      sign(x + 1, 4.8, z + d / 2 + 0.1, 0, '德克斯凡礦務・東鶴選礦廠', '#2E3A48', 4.4);
      truck(x - 4.6, z + 7.2, 0.15);
      [[3.5, 7.2], [5, 7.6], [6.2, 6.9]].forEach(([a, b2], i) => { SB.add(G3.box, lam('#6A4A2E', { tex: 'planks' }), x + a, 0.45, z + b2, 0.9, 0.9, 0.9, 0, i * 0.3, 0); SB.add(G3.box, lam('#8A74FF', { em: '#3A2A8A', ei: 0.6 }), x + a, 0.95, z + b2, 0.3, 0.2, 0.3); block(x + a - 0.5, x + a + 0.5, z + b2 - 0.5, z + b2 + 0.5, 'deco'); });
      if (R.addSteal) R.addSteal({ x: x + 5, z: z + 8.8, r: 2, label: '撬開選礦廠的木箱（魔晶礦）', owner: 'factory', time: 1.8, loot: () => ({ mat: 'manaore', n: 1 + (Math.random() < 0.3 ? 1 : 0) }), max: 3 });
      const g2 = npc(x + 2, z + 10.6, { top: '#3A4A5A', hair: '#2A2420', cloak: '#2E3A48' }, '選礦廠的警衛', Math.PI * 0.85, 'rifle', 'gunner'); g2.watch = { range: 12, fov: 1.0, guard: 1 }; tw.watchers.push(g2);
      inter(x + 2, z + 11.6, 1.8, '和選礦廠的警衛說話', () => talk('選礦廠的警衛', ['「這裡是德克斯凡礦務公司的地。閒人別靠近貨場。」', R.today && R.today().abs >= R.absOf(2836, 10, 19) ? '「……上面在查爆裂核心的數量。少了幾顆，大家都被問了一輪。」' : '「北山礦坑挖出來的礦，都在這裡選。」']));
    }
    // 後巷：堆著木箱、垃圾桶；賣斗篷的人、算命的人、私人委託的木板（jobs.js、props.js）
    { const ay = WZ(FAC.alley[2]); [[412, 0], [452, 1], [522, 0]].forEach(([sx, s2]) => crates(WX(sx), ay + (s2 ? 1.6 : -1.6)));
      [[432, 1.7], [508, -1.7]].forEach(([sx, o]) => { const x = WX(sx), z = ay + o; SB.add(G3.cyl, lam('#4A4A50', { tex: 0 }), x, 0.45, z, 0.7, 0.9, 0.7); SB.add(G3.cyl, lam('#3A3A40', { tex: 0 }), x, 0.92, z, 0.74, 0.06, 0.74); propBox(x, z, 0.4); inter(x, z + (o > 0 ? -1 : 1), 1.4, '翻垃圾桶', () => (R.searchTrash ? R.searchTrash(sx) : null)); });
      tw.alley = { x: WX(466), z: ay };
      const board = [WX(484), ay - 2.2]; SB.add(G3.box, lam('#5A4A3A', { tex: 'planks' }), board[0], 1.5, board[1], 2.2, 1.4, 0.1); for (let i = 0; i < 4; i++) SB.add(G3.box, lam('#E8DCC0', { tex: 0 }), board[0] - 0.7 + i * 0.48, 1.5 + (i % 2 ? 0.15 : -0.15), board[1] + 0.06, 0.4, 0.5, 0.02);
      inter(board[0], board[1] + 1.1, 1.8, '私人委託的木板（不是公會的委託）', () => (R.privateBoard ? R.privateBoard() : talk('私人委託', ['木板上貼著幾張手寫的紙。', '最上面一張用紅筆寫著：「公會不保障私人委託。被騙了別哭。」'])));
    }
    // 菅婆婆的糰子攤：烤爐在前面，菅婆婆站在後面，紅傘插在她後面（從鏡頭看不會擋住人）
    { const [x, z] = at2('suga');
      SB.add(G3.box, lam('#6A4A2E', { tex: 'planks' }), x, 0.5, z, 2.2, 1, 0.8); SB.add(G3.box, lam('#2A2A2A', { tex: 0 }), x - 0.3, 1.02, z, 1.2, 0.08, 0.6); SB.add(G3.box, lam('#FF8A3A', { em: '#C04A10', ei: 0.9 }), x - 0.3, 1.08, z, 1.0, 0.04, 0.4);
      for (let i = 0; i < 4; i++) SB.add(G3.box, lam('#E8D8B0', { tex: 0 }), x - 0.7 + i * 0.28, 1.14, z, 0.06, 0.06, 0.5);
      propSprite(wagasa(), x + 0.7, z - 1.7, group);
      SB.add(G3.box, lam('#8A2A24', { tex: 0 }), x + 1.9, 0.45, z + 0.3, 1.6, 0.12, 0.6); [-0.6, 0.6].forEach(o => SB.add(G3.box, lam('#5A3E26', { tex: 0 }), x + 1.9 + o, 0.2, z + 0.3, 0.1, 0.4, 0.5));
      block(x - 1.1, x + 1.1, z - 0.4, z + 0.4); block(x + 1.1, x + 2.7, z, z + 0.6, 'deco');
      const suga = npc(x - 0.3, z - 0.9, { top: '#6A5A7A', hair: '#D8D2C4', cloak: '#5A4A6A', hs: 'bun' }, '菅婆婆', 0);
      suga.watch = { range: 7, fov: 1.4, kind: 'suga' }; tw.watchers.push(suga);
      inter(x, z + 1.2, 2.2, '菅婆婆的糰子攤', () => (R.sugaSheet ? R.sugaSheet() : talk('菅婆婆', ['糰子一串兩費拉。今天冷，吃熱的。'])));
      if (R.addSteal) R.addSteal({ x: x - 0.9, z: z + 1.0, r: 1.2, label: '偷一串糰子', owner: 'suga', time: 0.9, loot: () => ({ gift: 'dango', n: 1 }), max: 2 }); }
    // 西市街的攤子：櫃台在前、攤販在中間、遮雨棚在後面（從鏡頭看，棚子在人的上面，不會穿過去）
    const stall = (sx, sy, cloth, goods, who, look, lines, steal) => {
      const x = WX(sx), z = WZ(sy);
      SB.add(G3.box, lam('#6A4A2E', { tex: 'planks' }), x, 0.5, z, 2.6, 1.0, 1.0); SB.add(G3.box, lam('#8A6A44', { tex: 'planks' }), x, 1.03, z, 2.8, 0.08, 1.2);
      [[-1.3, -2.1], [1.3, -2.1]].forEach(([a, b2]) => SB.add(G3.box, lam('#5A3E26', { tex: 0 }), x + a, 1.6, z + b2, 0.1, 3.2, 0.1));
      for (let i = 0; i < 5; i++) SB.add(G3.box, lam(i % 2 ? cloth : '#F0ECE2', { tex: 0 }), x - 1.2 + i * 0.6, 3.15, z - 1.5, 0.6, 0.08, 1.5, -0.35, 0, 0);
      goods.forEach(([col, kind], i) => { const gx = x - 1 + i * 0.5, gz = z + 0.15 * (i % 2 ? 1 : -1); if (kind === 'ball') SB.add(G3.sph, lam(col, { tex: 0 }), gx, 1.2, gz, 0.3, 0.26, 0.3); else if (kind === 'fish') SB.add(G3.box, lam(col, { tex: 0 }), gx, 1.12, gz, 0.42, 0.08, 0.14, 0, 0.3, 0); else SB.add(G3.cyl, lam(col, { tex: 0 }), gx, 1.22, gz, 0.26, 0.34, 0.26); });
      block(x - 1.4, x + 1.4, z - 0.5, z + 0.5, 'stall');
      const n = npc(x, z - 1.0, look, who, 0); n.watch = { range: 8, fov: 1.2 }; tw.watchers.push(n);
      inter(x, z + 1.3, 2.2, '和' + who + '說話', () => (R.stallSheet ? R.stallSheet(who, lines) : talk(who, lines)));
      if (steal && R.addSteal) R.addSteal(Object.assign({ x: x + 1.1, z: z + 1.0, r: 1.3, time: 1.0, owner: who, max: 2 }, steal));
    };
    stall(FAC.stalls[0][0], FAC.stalls[0][1], '#2E4A6A', [['#A8B8C8', 'fish'], ['#C8D0D8', 'fish'], ['#9AA8B8', 'fish'], ['#B8C4D0', 'fish'], ['#A8B8C8', 'fish']], '魚販', { top: '#3E5A6E', hair: '#2A2420', cloak: '#2E4A5A' }, ['「霜溪今天結了薄冰，魚倒是肥的。」', '「霜背鮒最便宜，一條五費拉。」'], { label: '摸走一條魚', loot: () => ({ gift: 'fish', n: 1 }) });
    stall(FAC.stalls[1][0], FAC.stalls[1][1], '#3E5A3A', [['#F0ECE2', 'ball'], ['#E8823A', 'ball'], ['#5A8A4A', 'ball'], ['#C8323A', 'ball'], ['#F0ECE2', 'ball']], '菜攤的大叔', { top: '#6A5A3A', hair: '#8A6A4A', cloak: '#4A3A2A' }, ['「冬天的蘿蔔最甜。」', '「北郊的農家說冰鼬又來偷雞了，菜倒是沒偷。」']);
    stall(FAC.stalls[2][0], FAC.stalls[2][1], '#8A2A24', [['#8A6A4A', 'pot'], ['#5A4A3A', 'pot'], ['#C8B898', 'pot'], ['#7A5A3A', 'pot'], ['#9A8A6A', 'pot']], '雜貨店的老闆', { top: '#5A3A5A', hair: '#D8D2C4', cloak: '#4A2A4A' }, ['「繩子、火石、燈油，下遺跡的都會買。」', '「記事本、三味線的弦、釣具，要的話這裡也有。」'], { label: '順手拿一本記事本', loot: () => ({ gift: 'notebook', n: 1 }) });

    // --- 街景：水井、長椅、雪人、路牌、木箱、推車、自行車（路燈、電線桿在 cityscape.js） ---
    function well(x, z) { SB.add(G3.cyl, lam('#8C8A82', { tex: 'wall' }), x, 0.4, z, 1.8, 0.8, 1.8); SB.add(G3.cyl, lam('#1A2A3A', { tex: 0 }), x, 0.81, z, 1.5, 0.02, 1.5); [-0.95, 0.95].forEach(o => SB.add(G3.box, lam('#5A3E26', { tex: 0 }), x + o, 1.2, z, 0.14, 2.4, 0.14)); SB.add(G3.box, lam('#4A3A34', { tex: 'cap' }), x, 2.5, z, 2.6, 0.12, 1.6, 0.2, 0, 0); SB.add(G3.box, lam('#F2F6F8', { tex: 'ground' }), x, 2.6, z, 2.5, 0.08, 1.5, 0.2, 0, 0); SB.add(G3.box, lam('#6A4A2E', { tex: 0 }), x, 1.6, z, 0.3, 0.3, 0.3); propBox(x, z, 1); inter(x, z + 1.6, 1.6, '打一桶井水來喝', () => R.townToast('井水冰得刺骨。精神好多了。')); }
    function bench(x, z, rotY) { const c = Math.cos(rotY), s = Math.sin(rotY); SB.add(G3.box, lam('#6A4A2E', { tex: 'planks' }), x, 0.48, z, 2.2, 0.1, 0.5, 0, rotY, 0); [-0.9, 0.9].forEach(o => SB.add(G3.box, lam('#4A3424', { tex: 0 }), x + c * o, 0.24, z - s * o, 0.12, 0.48, 0.4, 0, rotY, 0)); SB.add(G3.box, lam('#F2F6F8', { tex: 'ground' }), x, 0.55, z, 2.0, 0.05, 0.4, 0, rotY, 0); block(x - 1.1, x + 1.1, z - 0.3, z + 0.3, 'deco'); inter(x, z + 0.8, 1.4, '坐一下', () => R.sitDown && R.sitDown(x, z + 0.32)); }
    function snowman(x, z) { const sw = lam('#F4F8FA', { tex: 'ground' }); SB.add(G3.sph, sw, x, 0.55, z, 1.1, 1.0, 1.1); SB.add(G3.sph, sw, x, 1.3, z, 0.78, 0.74, 0.78); SB.add(G3.sph, sw, x, 1.85, z, 0.52, 0.5, 0.52); SB.add(G3.cyl, lam('#3A3A40', { tex: 0 }), x, 2.17, z, 0.42, 0.3, 0.42); SB.add(G3.cone, lam('#E8823A', { tex: 0 }), x, 1.85, z + 0.3, 0.1, 0.3, 0.1, Math.PI / 2, 0, 0); [-0.1, 0.1].forEach(o => SB.add(G3.sph, lam('#1A1A1A', { tex: 0 }), x + o, 1.92, z + 0.23, 0.07, 0.07, 0.07)); SB.add(G3.box, lam('#C8323A', { tex: 0 }), x, 1.6, z, 0.62, 0.12, 0.62); propBox(x, z, 0.55); inter(x, z + 1.1, 1.4, '雪人', () => R.townToast('不知道是誰堆的雪人。圍巾是紅的。')); }
    function signpost(x, z, lines) { SB.add(G3.box, lam('#5A3E26', { tex: 0 }), x, 1.2, z, 0.14, 2.4, 0.14); SB.add(G3.box, lam('#8A6A44', { tex: 'planks' }), x + 0.45, 2.0, z, 0.9, 0.24, 0.06); SB.add(G3.box, lam('#8A6A44', { tex: 'planks' }), x - 0.35, 1.6, z, 0.8, 0.22, 0.06, 0, 0.5, 0); SB.add(G3.box, lam('#F2F6F8', { tex: 'ground' }), x, 2.42, z, 0.2, 0.06, 0.2); propBox(x, z, 0.15); if (lines) inter(x, z + 0.9, 1.4, '看路牌', () => talk('路牌', lines)); }
    function crates(x, z) { SB.add(G3.box, lam('#7A5A3A', { tex: 'planks' }), x, 0.45, z, 0.9, 0.9, 0.9, 0, 0.2, 0); SB.add(G3.box, lam('#6A4A2E', { tex: 'planks' }), x + 0.2, 1.25, z - 0.1, 0.7, 0.7, 0.7, 0, -0.3, 0); SB.add(G3.box, lam('#F2F6F8', { tex: 'ground' }), x + 0.2, 1.62, z - 0.1, 0.66, 0.05, 0.66, 0, -0.3, 0); propBox(x, z, 0.55); }
    function cart(x, z, rotY) { const c = Math.cos(rotY), s = Math.sin(rotY); SB.add(G3.box, lam('#7A5A3A', { tex: 'planks' }), x, 0.85, z, 1.4, 0.5, 2.2, 0, rotY, 0); [-1, 1].forEach(sd => SB.add(G3.cyl, lam('#3A2A1C', { tex: 0 }), x + c * sd * 0.8, 0.55, z - s * sd * 0.8, 1.1, 0.12, 1.1, 0, rotY, Math.PI / 2)); SB.add(G3.box, lam('#F2F6F8', { tex: 'ground' }), x, 1.12, z, 1.3, 0.06, 2.0, 0, rotY, 0); block(x - 1.2, x + 1.2, z - 1.2, z + 1.2, 'deco'); }
    function truck(x, z, rotY) {   // 德克斯凡的貨車
      const tb = Batch(); tb.at(x, z, rotY || 0);
      tb.add(G3.box, lam('#4A6A8A', { tex: 0 }), 0, 1.4, 0.6, 2.2, 1.8, 3.6); tb.add(G3.box, lam('#3A5A7A', { tex: 0 }), 0, 1.25, -1.9, 2.1, 1.5, 1.6); tb.add(G3.box, lam('#BFD8E8', { em: '#203040', ei: 0.3 }), 0, 1.55, -2.72, 1.8, 0.6, 0.05);
      tb.add(G3.box, lam('#F2F6F8', { tex: 'ground' }), 0, 2.33, 0.6, 2.1, 0.08, 3.5);
      [[-1.1, -1.8], [1.1, -1.8], [-1.1, 1.4], [1.1, 1.4]].forEach(([a, b2]) => tb.add(G3.cyl, lam('#1E1E22', { tex: 0 }), a, 0.42, b2, 0.84, 0.3, 0.84, 0, 0, Math.PI / 2));
      tb.add(G3.box, lam('#FFF4D8', { em: '#FFE0A0', ei: 1 }), -0.7, 0.9, -2.72, 0.3, 0.2, 0.05); tb.add(G3.box, lam('#FFF4D8', { em: '#FFE0A0', ei: 1 }), 0.7, 0.9, -2.72, 0.3, 0.2, 0.05);
      tb.flush(group); const c = Math.cos(rotY || 0), s = Math.sin(rotY || 0), hw = Math.abs(c) * 1.2 + Math.abs(s) * 2.8, hd = Math.abs(s) * 1.2 + Math.abs(c) * 2.8; block(x - hw, x + hw, z - hd, z + hd, 'deco');
    }
    function vending(x, z) { SB.add(G3.box, lam('#C83A3A', { tex: 0 }), x, 1.0, z, 1, 2, 0.8); SB.add(G3.box, lam('#BFD8E8', { em: '#3A6A8A', ei: 0.8 }), x, 1.3, z + 0.41, 0.8, 0.9, 0.02); SB.add(G3.box, lam('#2A2A30', { tex: 0 }), x, 0.4, z + 0.41, 0.6, 0.2, 0.02); propBox(x, z, 0.5); inter(x, z + 1.2, 1.5, '德克斯凡的自動販賣機（熱飲 6 費拉）', () => (R.vendingBuy ? R.vendingBuy() : null)); }
    function bike(x, z, rotY) { const c = Math.cos(rotY), s = Math.sin(rotY); [-0.55, 0.55].forEach(o => SB.add(G3.cyl, lam('#1E1E22', { tex: 0 }), x + s * o, 0.36, z + c * o, 0.72, 0.06, 0.72, 0, rotY, Math.PI / 2)); SB.add(G3.box, lam('#3A6A4A', { tex: 0 }), x, 0.62, z, 0.06, 0.06, 1.0, 0, rotY, 0); SB.add(G3.box, lam('#2A2A2A', { tex: 0 }), x, 0.82, z, 0.4, 0.06, 0.06, 0, rotY, 0); propBox(x, z, 0.3); }
    function pineAt(x, z, s) { const sp = R.pineSprite(s); sp.position.set(x, 0, z); group.add(sp); block(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 'tree'); }
    // 舊城裡的小公園：水井、長椅、雪人；外濠邊的長椅
    { const [px, py] = FAC.park; well(WX(px - 8), WZ(py - 10)); bench(WX(px + 8), WZ(py + 14), 0); snowman(WX(px - 14), WZ(py + 22)); }
    bench(WX(520), WZ(465.5), 0); bench(WX(690), WZ(465.5), 0); snowman(WX(636), WZ(650));
    signpost(WX(630), WZ(482), ['北門外：外濠、國道一號，再往北是站前大通和東鶴站。', '站西通過了平交道是北口，再往北過霜溪是北山礦坑、霜溪石窟。更遠的遺跡，到東鶴站搭魔導電車，或到國道邊的驛站搭車。']);
    signpost(WX(572), WZ(760), ['南門外：南門通、寺町。過了南渠的南橋，是往皇嶺的南官道。']);
    signpost(WX(410), WZ(652), ['西門外：城西的住宅區。西橋整修中，暫停通行。', '往河西、城西遺跡：走國道一號過新大橋。']);
    signpost(WX(730), WZ(608), ['東門外：官廳街（縣廳、郵局、醫院）。往皇嶺的國道一號在北邊。']);
    bike(WX(548), WZ(586), 0.2); bike(WX(818), WZ(312), 1.5);

    // --- 陪都的設施：縣廳、銀行、醫院、郵局、百貨……（civic.js） ---
    if (R.buildCivic) R.buildCivic({ group, npc, inter, block, talk, lam, SB, HB, G3, B_, glowW, darkW, woodM, gableB, house, sign, lampPost, pineAt, bench, vending, bike, reserve, WX, WZ, tw, E, dexBuilding });
    // 德克斯凡的磚造大樓：平屋頂、女兒牆、整排的窗、屋頂的水塔、直立的霓虹招牌
    function dexBuilding(sx, sy, w, d, floors, face) {
      const x = WX(sx), z = WZ(sy), B = HB, fh = 3.0, H = floors * fh; B.at(x, z, face || 0);
      const brick = B_(pick2(['#8A5A44', '#7A6A5A', '#9A8A7A', '#6A5A5A', '#A89A88']), { tex: 'wall' }), trim = B_('#C8C4BC', { tex: 'cap' });
      B.add(G3.box, brick, 0, H / 2, 0, w, H, d);
      for (let f = 0; f < floors; f++) { B.add(G3.box, trim, 0, (f + 1) * fh - 0.08, d / 2 + 0.03, w + 0.06, 0.16, 0.06); const n = Math.max(1, Math.floor(w / 1.6)); for (let i = 0; i < n; i++) { const wx = -w / 2 + (i + 0.5) * w / n; if (f === 0 && Math.abs(wx) < 0.9) continue; B.add(G3.box, srand() < 0.6 ? glowW : darkW, wx, f * fh + 1.7, d / 2 + 0.03, Math.min(1.0, w / n - 0.5), 1.2, 0.05); } }
      B.add(G3.box, B_('#3A3C42', { tex: 0 }), 0, 1.2, d / 2 + 0.05, 1.3, 2.4, 0.06);
      // 女兒牆（四邊）、柏油屋頂、幾塊積雪
      const par = B_('#7A7C82', { tex: 'cap' }), roofT = B_('#4A4C52', { tex: 'cap' }), snowT = B_('#F2F6F8', { tex: 'ground' });
      B.add(G3.box, roofT, 0, H + 0.05, 0, w - 0.1, 0.1, d - 0.1);
      [[0, d / 2, w + 0.2, 0.25], [0, -d / 2, w + 0.2, 0.25]].forEach(([px, pz, pw, pd]) => B.add(G3.box, par, px, H + 0.4, pz, pw, 0.8, pd)); [[w / 2, 0], [-w / 2, 0]].forEach(([px, pz]) => B.add(G3.box, par, px, H + 0.4, pz, 0.25, 0.8, d + 0.2));
      for (let i = 0; i < 3; i++) B.add(G3.box, snowT, (srand() - 0.5) * (w - 2), H + 0.12, (srand() - 0.5) * (d - 2), 0.8 + srand() * (w * 0.4), 0.06, 0.6 + srand() * (d * 0.35));
      if (srand() < 0.5) { B.add(G3.box, B_('#6A6A70', { tex: 'wall' }), -w * 0.25, H + 1.1, d * 0.15, 1.6, 2.2, 1.8); B.add(G3.box, B_('#3A3C42', { tex: 0 }), -w * 0.25, H + 0.9, d * 0.15 + 0.92, 0.8, 1.6, 0.05); }
      if (srand() < 0.5) { B.add(G3.box, B_('#2A2A30', { tex: 0 }), w * 0.35, H + 2.2, -d * 0.3, 0.08, 4.4, 0.08); B.add(G3.box, B_('#2A2A30', { tex: 0 }), w * 0.35, H + 3.6, -d * 0.3, 1.2, 0.06, 0.06); }
      if (srand() < 0.35) { const nc = ['#3A8ACF', '#C83A6A', '#E8A03A'][Math.floor(srand() * 3)]; B.add(G3.box, B_('#2A2A30', { tex: 0 }), 0, H + 1.0, d / 2 - 0.3, w * 0.7, 0.1, 0.1); B.add(G3.box, B_(nc, { em: nc, ei: 0.7 }), 0, H + 2.0, d / 2 - 0.3, w * 0.7, 1.6, 0.12); }
      if (srand() < 0.6) { B.add(G3.cyl, B_('#6A6A70', { tex: 0 }), w * 0.2, H + 1.6, -d * 0.2, 1.4, 1.6, 1.4); B.add(G3.box, B_('#4A4A50', { tex: 0 }), w * 0.2, H + 0.75, -d * 0.2, 1.2, 0.8, 1.2); }
      if (srand() < 0.7) { const nc = pick2(['#3A8ACF', '#C83A6A', '#E8A03A', '#5AC88A']); B.add(G3.box, B_(nc, { em: nc, ei: 0.8 }), w / 2 - 0.4, H * 0.55, d / 2 + 0.35, 0.18, H * 0.5, 0.6); }
      B.at(null); const side90 = Math.abs(Math.sin(face || 0)) > 0.5; block(x - (side90 ? d : w) / 2, x + (side90 ? d : w) / 2, z - (side90 ? w : d) / 2, z + (side90 ? w : d) / 2, 'house');
    }
    function pick2(a) { return a[Math.floor(srand() * a.length)]; }
    // 鐘樓（新商區的地標）：時鐘會走
    { const [x, z] = at2('clock'), B = HB; B.at(x, z, 0);
      B.add(G3.box, B_('#8A6A5A', { tex: 'wall' }), 0, 7, 0, 3.6, 14, 3.6); B.add(G3.box, B_('#C8C4BC', { tex: 'cap' }), 0, 14.3, 0, 4.2, 0.6, 4.2);
      B.add(G3.cone, B_('#3A4A5A', { tex: 'cap' }), 0, 16.2, 0, 4.4, 3.2, 4.4, 0, Math.PI / 4, 0); B.add(G3.box, B_('#3A3C42', { tex: 0 }), 0, 1.3, 1.82, 1.4, 2.6, 0.06);
      B.at(null); block(x - 1.8, x + 1.8, z - 1.8, z + 1.8, 'house');
      const face = new TH.Mesh(new TH.CircleGeometry(1.2, 20), R.seeThrough(new TH.MeshLambertMaterial({ color: '#F4ECD8', emissive: '#FFE8B0', emissiveIntensity: 0.5 }))); face.position.set(x, 11.6, z + 1.83); group.add(face);
      const hand = (len, wid) => { const m = new TH.Mesh(new TH.BoxGeometry(wid, len, 0.04), new TH.MeshBasicMaterial({ color: '#1A1414' })); m.geometry.translate(0, len / 2, 0); m.position.set(x, 11.6, z + 1.87); group.add(m); return m; };
      tw.clock = { h: hand(0.6, 0.1), m: hand(0.95, 0.07) };
      inter(x, z + 3, 1.8, '鐘樓', () => R.townToast('德克斯凡的工程師蓋的鐘樓。整點會響。'));
    }
    // 火之見櫓（城南的住宅區）：木頭的瞭望台，頂上掛著鐘
    { const [x, z] = at2('firetower'), B = HB; B.at(x, z, 0);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b2]) => B.add(G3.box, woodM, a * 0.9, 4.5, b2 * 0.9, 0.22, 9, 0.22)); for (let i = 1; i < 4; i++) B.add(G3.box, woodM, 0, i * 2.2, 0, 2.0, 0.12, 2.0);
      B.add(G3.box, B_('#5A3E26', { tex: 'planks' }), 0, 9.1, 0, 2.6, 0.2, 2.6); B.add(G3.cone, B_('#3A3A44', { tex: 'cap' }), 0, 10.4, 0, 3.0, 1.4, 3.0, 0, Math.PI / 4, 0); B.add(G3.cyl, B_('#8A6A2A', { tex: 0 }), 0, 9.6, 0, 0.5, 0.6, 0.5);
      B.at(null); block(x - 1.1, x + 1.1, z - 1.1, z + 1.1, 'deco'); }

    // --- 城外 ---
    for (let i = 0; i < 42; i++) { const sx = i * 25 + srand() * 10, sy = 4 + srand() * 22, h = 18 + srand() * 14; const m = new TH.Mesh(new TH.ConeGeometry(12 + srand() * 6, h, 7), lam('#7A8088', { tex: 'wall' })); m.position.set(WX(sx), h / 2, WZ(sy) - 8); m.castShadow = true; group.add(m); const cap = new TH.Mesh(new TH.ConeGeometry(5.4, h * 0.34, 7), lam('#F4F8FA', { tex: 'ground' })); cap.position.set(m.position.x, h - h * 0.17 + 0.2, m.position.z); group.add(cap); }
    block(-HALF, HALF, -HALF, WZ(26), 'edge');
    for (let i = 0; i < 7; i++) { const sx = 250 + i * 26, sy = 82 + (srand() - 0.5) * 16; const m = new TH.Mesh(new TH.SphereGeometry(5 + srand() * 2, 10, 6), lam('#E6ECEE', { tex: 'ground' })); m.scale.y = 0.45; m.position.set(WX(sx), 0, WZ(sy)); group.add(m); block(WX(sx) - 3.4, WX(sx) + 3.4, WZ(sy) - 3.4, WZ(sy) + 3.4, 'hill'); }
    // --- 遺跡的入口 ---
    const eyeMark = (x, z, y, col) => { const r = new TH.Mesh(new TH.TorusGeometry(0.9, 0.08, 6, 24), new TH.MeshBasicMaterial({ color: col })); r.position.set(x, y, z); group.add(r); const p = new TH.Mesh(new TH.SphereGeometry(0.34, 10, 8), new TH.MeshBasicMaterial({ color: col })); p.position.set(x, y, z); group.add(p); tw.fx.push({ kind: 'bob', m: r, y }); tw.fx.push({ kind: 'bob', m: p, y }); };
    const ruinGate = (siteId, sx, sy, build) => {
      const s = R.SITES.find(v => v.id === siteId), x = WX(sx), z = WZ(sy), col = R.GRADE_COLOR[s.grade];
      build(x, z);
      eyeMark(x, z + 0.5, 5.2, col);
      SB.add(G3.box, lam('#5A3E26', { tex: 0 }), x + 3.6, 0.8, z + 2.6, 0.12, 1.6, 0.12); sign(x + 3.6, 1.9, z + 2.62, 0, R.gradeById(s.grade).name, '#2A2418');
      inter(x, z + 2.8, 3, '進入' + s.name, () => askRuin(s));
      tw.gates = tw.gates || {}; tw.gates[siteId] = [x, z + 4];
    };
    ruinGate('dh-sokkutsu', 800, 62, (x, z) => { for (let i = 0; i < 7; i++) { const r = new TH.Mesh(new TH.DodecahedronGeometry(2 + srand() * 1.6, 0), lam('#7A7E84', { tex: 'wall' })); r.position.set(x + (i - 3) * 2.2, 1.2 + srand(), z - 1.5 - srand() * 1.5); r.castShadow = true; group.add(r); } bx(3.2, 3, 0.4, lam('#0A080C', { tex: 0 }), x, 1.5, z + 0.3); block(x - 8, x + 8, z - 4, z + 0.4, 'rock'); });
    ruinGate('dh-josai', 96, 318, (x, z) => { bx(1.2, 4.4, 1.2, lam('#6E6A60', { tex: 'wall' }), x - 2.4, 2.2, z); bx(1.2, 4.4, 1.2, lam('#6E6A60', { tex: 'wall' }), x + 2.4, 2.2, z); bx(6.4, 1, 1.4, lam('#5E5A52', { tex: 'wall' }), x, 4.6, z); bx(3.6, 3.8, 0.3, lam('#0A080C', { tex: 0 }), x, 1.9, z - 0.3); block(x - 3, x + 3, z - 0.8, z + 0.6, 'rock');
      const tent = new TH.Mesh(new TH.CylinderGeometry(0.05, 3, 2.6, 4, 1), lam('#C8B888', { tex: 0 })); tent.rotation.y = Math.PI / 4; tent.position.set(x + 7, 1.3, z + 3); tent.castShadow = true; group.add(tent); block(x + 5, x + 9, z + 1, z + 5);
      bx(0.1, 4, 0.1, lam('#5A4A3A', { tex: 0 }), x + 9.5, 2, z + 5.5); const sf = new TH.Mesh(new TH.PlaneGeometry(1.3, 0.9), new TH.MeshLambertMaterial({ map: R.guildFlagTex(16, 11), side: TH.DoubleSide })); sf.position.set(x + 10.2, 3.5, z + 5.5); group.add(sf);
      npc(x + 6, z + 6, { top: '#3E5A48', hair: '#2A2420', cloak: '#3E5A48' }, '真壁', Math.PI * 0.8); inter(x + 6, z + 7, 2.4, '和調查點主任真壁說話', () => talk('真壁', R.eventsToday && R.eventsToday().josaiSealed ? ['「封鎖中。總部的調查委員會還在裡面。」', '「……那天的事，我會一直記著。」'] : ['城西遺跡裡的魔力濃度，這幾天又往上升了。', '外圍第一層標出了十二處危險點。進去的話，別逞強。', '報告每天都要送回分館。……你要進去就去吧，我會記下來。']));
      tw.survey = { x: x + 3, z: z + 8 }; });
    ruinGate('dh-kouzan', 560, 46, (x, z) => { bx(0.5, 4, 0.5, lam('#5A3E26', { tex: 'planks' }), x - 2.2, 2, z); bx(0.5, 4, 0.5, lam('#5A3E26', { tex: 'planks' }), x + 2.2, 2, z); bx(5.2, 0.6, 0.6, lam('#5A3E26', { tex: 'planks' }), x, 4.1, z); bx(3.8, 3.6, 0.3, lam('#0A080C', { tex: 0 }), x, 1.8, z - 0.3); bx(10, 6, 3, lam('#7A8088', { tex: 'wall' }), x, 3, z - 2.2); block(x - 5, x + 5, z - 3.7, z + 0.2, 'rock');
      [-0.6, 0.6].forEach(o => bx(0.12, 0.08, 9, lam('#6A6A70', { tex: 0 }), x + o, 0.05, z + 4.5)); bx(1.4, 0.9, 2, lam('#5A4A3A', { tex: 'planks' }), x, 0.6, z + 6); block(x - 0.8, x + 0.8, z + 5, z + 7); });
    { const x = WX(150), z = WZ(66); for (let i = 0; i < 4; i++) house(70 + i * 26, 34 + (i % 2) * 6, 5, 4, 3, '#A8927A', 0, { two: false, shop: i === 1 });
      block(x - 5.6, x + 5.6, z - 3.2, z + 3.2, 'water'); tw.steam = { x, z }; inter(x, z + 4.2, 3, '泡一下溫泉', () => (R.eventsToday && R.eventsToday().blizzard ? talk('湯山村', ['暴風雪。矮丘山口封了，今天到不了。']) : (R.onsen ? R.onsen() : talk('湯山村', ['熱水從腳趾一路暖到頭頂。'])))); }
    { const [fx, fy] = FAC.farmhouse, p = house(fx, fy, 6, 4.5, 3.2, '#9A7A5A', 0, { two: false, shop: false });
      for (let i = 0; i < 14; i++) SB.add(G3.box, lam('#6A4A2E', { tex: 0 }), WX(fx + 14) + i * 2.1, 0.45, WZ(fy + 14), 0.15, 0.9, 0.15);
      inter(p.doorX, p.doorZ, 2.6, '敲北郊農舍的門', () => talk('北郊農舍', ['「冰鼬又來偷雞了……」屋裡的人嘆了一口氣。'])); }
    // 南渠、南橋：橋下可以釣魚（瀧常在這裡）
    tw.fishSpot = [WX(540), WZ(932)];
    inter(tw.fishSpot[0], tw.fishSpot[1], 1.8, '在南橋下釣魚', () => (R.fishing ? R.fishing() : R.townToast('南渠結了一層薄冰。')));

    // --- 城門的衛兵、巡邏的衛兵 ---
    const guard = (x, z, rot, lines, patrol) => {
      const n = npc(x, z, { top: '#3E4A5A', hair: '#2A2420', cloak: '#2E3A48', shield: true }, '東鶴的衛兵', rot, 'spear', 'knight');
      n.watch = { range: 11, fov: 1.0, guard: 1 }; tw.watchers.push(n); n.guard = true;
      if (patrol) { n.walk = true; n.patrol = patrol; n.pi = 0; n.tx = n.x; n.tz = n.z; n.speed = 2.2; if (n.box) n.box.on = false; }
      if (lines) inter(x, z, 1.8, '和衛兵說話', () => talk('東鶴的衛兵', typeof lines === 'function' ? lines() : lines), { follow: n });
      return n;
    };
    guard(WX(gates.n[0]) - 3.4, ty0 + 2.4, 0, () => (E.martial ? ['「今天是退位大典，全城戒嚴。出入城門要查勇者證。」'] : ['「出了北門是國道，再往北是東鶴站。去北山礦坑、霜溪石窟，走站西通過平交道、過霜溪。」', '「霜溪石窟是哈米莉亞級，裡面的生物不會主動攻擊人。第一次下遺跡，就從那裡開始吧。」']));
    guard(WX(gates.n[0]) + 3.4, ty0 + 2.4, 0, null);
    guard(WX(gates.s[0]) - 3.4, ty1 - 2.4, Math.PI, ['「南門外過了南橋，是往皇嶺的南官道，沒有遺跡。」', '「要去遠一點的遺跡，到東鶴站搭電車，或到國道邊的驛站搭車。」']);
    guard(WX(gates.s[0]) + 3.4, ty1 - 2.4, Math.PI, null);
    guard(tx0 + 2.4, WZ(gates.w[0]) - 3.4, Math.PI / 2, ['「西門。往城西遺跡，走國道過新大橋到河西。」']);
    guard(WX(628), WZ(500), 0, null, [[WX(628), WZ(484)], [WX(628), WZ(566)]]);
    guard(WX(420), WZ(648), 0, null, [[WX(420), WZ(648)], [WX(540), WZ(648)]]);
    guard(WX(720), WZ(424), 0, null, [[WX(420), WZ(424)], [WX(760), WZ(424)]]);
    if (E.martial) { guard(WX(570), WZ(650), 0, ['「戒嚴中。不要在街上逗留。」']); guard(WX(616), WZ(576), Math.PI, null); guard(WX(500), WZ(646), 0, null, [[WX(420), WZ(646)], [WX(540), WZ(646)]]); guard(WX(620), WZ(380), 0, null, [[WX(620), WZ(356)], [WX(620), WZ(430)]]); }
    // --- 在街上走的人（各種種族） ---
    C.nodes.forEach(([sx, sy]) => { if (sy > 280 && sy < 900) tw.walkNodes.push([WX(sx), WZ(sy)]); });
    const nextNode = n => { const nb = C.adj[n.ni]; if (nb && nb.length) { let k = nb[Math.floor(Math.random() * nb.length)]; if (nb.length > 1 && k === n.prev) k = nb[Math.floor(Math.random() * nb.length)]; n.prev = n.ni; n.ni = k; } const [sx, sy] = C.nodes[n.ni]; return [WX(sx + (Math.random() - 0.5) * 3), WZ(sy + (Math.random() - 0.5) * 3)]; };
    const busy = C.nodes.map((p, i) => i).filter(i => { const [sx, sy] = C.nodes[i]; return sy > 280 && sy < 900 && sx > 230; });
    const nWalk = R.walkerCount ? R.walkerCount(E, dd) : E.martial ? 16 : E.blizzard ? 12 : dd && dd.rest ? 90 : 72;   // daytime.js 依時間讓一部分人回家
    for (let i = 0; i < nWalk; i++) {
      const ni = busy[Math.floor(srand() * busy.length)], x = WX(C.nodes[ni][0]), z = WZ(C.nodes[ni][1]), race = R.randomRace ? R.randomRace() : 'human', rc = R.RACES ? R.RACES[race] : null;
      const pi = Math.floor(srand() * 24), look = { pool: 'walker' + pi, lite: 1, top: houseCols.concat(['#3E5A6E', '#7A5A6A', '#8A3A2E', '#2E4A6A', '#5A6A4A'])[Math.floor(srand() * 11)], hair: rc && rc.hairs ? rc.hairs[0] : ['#2A2420', '#6A4A2E', '#1A1714', '#8A5A2E', '#D8D2C4'][Math.floor(srand() * 5)], cloak: ['#4A3A30', '#3A3A44', '#5A4A3A', '#2E3A48'][Math.floor(srand() * 4)], race, skin: rc ? rc.skins[Math.floor(srand() * rc.skins.length)] : undefined, hs: ['short', 'long', 'ponytail', 'bun', 'bob', 'crop', 'spiky'][Math.floor(srand() * 7)], acc: srand() < 0.25 ? ['scarf', 'glasses', 'headband'][Math.floor(srand() * 3)] : null, accCol: ['#C8323A', '#2E5A8A', '#3E7A48'][Math.floor(srand() * 3)] };
      const n = npc(x, z, look, null, 0); n.walk = true; n.ni = ni; n.next = nextNode; [n.tx, n.tz] = nextNode(n); n.speed = 1.6 + srand() * 0.6; n.watch = { range: 6, fov: 1.0, civ: 1 }; tw.watchers.push(n);
    }
    // 會開的德克斯凡貨車：沿著兩條大馬路來回開（前面有人就停）
    tw.cars = [];
    const car = (path, col) => { const g = new TH.Group(), cb = Batch(); cb.add(G3.box, lam(col, { tex: 0 }), 0, 1.4, 0.6, 2.2, 1.8, 3.6); cb.add(G3.box, lam(col, { tex: 0 }), 0, 1.25, -1.9, 2.1, 1.5, 1.6); cb.add(G3.box, lam('#BFD8E8', { em: '#203040', ei: 0.3 }), 0, 1.55, -2.72, 1.8, 0.6, 0.05); cb.add(G3.box, lam('#F2F6F8', { tex: 'ground' }), 0, 2.33, 0.6, 2.1, 0.08, 3.5); [[-1.1, -1.8], [1.1, -1.8], [-1.1, 1.4], [1.1, 1.4]].forEach(([a, b2]) => cb.add(G3.cyl, lam('#1E1E22', { tex: 0 }), a, 0.42, b2, 0.84, 0.3, 0.84, 0, 0, Math.PI / 2)); cb.add(G3.box, lam('#FFF4D8', { em: '#FFE0A0', ei: 1 }), -0.7, 0.9, -2.72, 0.3, 0.2, 0.05); cb.add(G3.box, lam('#FFF4D8', { em: '#FFE0A0', ei: 1 }), 0.7, 0.9, -2.72, 0.3, 0.2, 0.05); cb.flush(g); group.add(g);
      const c = { g, path: path.map(([a, b2]) => [WX(a), WZ(b2)]), i: 0, t: 0, x: 0, z: 0 }; c.x = c.path[0][0]; c.z = c.path[0][1]; g.position.set(c.x, 0, c.z); tw.cars.push(c); return c; };
    { const CC = ['#4A6A8A', '#8A4A3A', '#3A5A4A', '#E8E8EC', '#C8B040', '#2A2A30', '#6A4A7A'];
      const k = E.martial ? 0 : E.blizzard ? 0.4 : 1;
      C.carRoutes.forEach(rt => { const n = Math.round(rt.n * k); for (let i = 0; i < n; i++) { const c = car(rt.path, CC[Math.floor(srand() * CC.length)]); const j = Math.floor(srand() * (rt.path.length - 1)); c.i = j; c.x = WX(rt.path[j][0]); c.z = WZ(rt.path[j][1]); c.g.position.set(c.x, 0, c.z); } }); }
    // 劇情人物、固定日期出現的人、私人委託的委託人（people.js、jobs.js）
    const api = { group, npc, inter, block, talk, lam, SB, G3, WX, WZ, spot: (sx, sy) => [WX(sx), WZ(sy)] };
    if (R.placePeople) R.placePeople('town', api);
    if (R.placeJobs) R.placeJobs('town', api);

    // 街景：路面、標線、紅綠燈、路燈、電線桿、行道樹（cityscape.js）
    if (R.buildCityscape) R.buildCityscape(Object.assign({}, api, { HB, B_, glowW, darkW, woodM, lampPost, vending, bike, sign, pineAt, tw, E }));
    // 每一塊地的房子、鐵路、東鶴站（suburbs.js）
    if (R.buildSuburbs) R.buildSuburbs(Object.assign({}, api, { HB, B_, glowW, darkW, woodM, gableB, house, sign, lampPost, pineAt, bench, vending, bike, crates, truck, well, snowman, signpost, stoneLantern, propSprite, dexBuilding, houseCols, ROOFS, srand, tw, E }));

    // 雪（暴風雪那天特別多）
    const flakes = R.flakeCount ? R.flakeCount(E) : E.blizzard ? 2200 : E.heavySnow ? 1300 : 700, geo = new TH.BufferGeometry(), arr = new Float32Array(flakes * 3);
    for (let i = 0; i < flakes; i++) { arr[i * 3] = (Math.random() - 0.5) * 60; arr[i * 3 + 1] = Math.random() * 18; arr[i * 3 + 2] = (Math.random() - 0.5) * 60; }
    geo.setAttribute('position', new TH.BufferAttribute(arr, 3));
    tw.snow = new TH.Points(geo, new TH.PointsMaterial({ color: '#FFFFFF', size: 1, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false })); tw.snow.frustumCulled = false; tw.snow.userData.wind = E.blizzard ? 6 : 0.3; group.add(tw.snow);

    SB.flush(group); HB.flush(group);
    scene.add(group); tw.group = group;

    function npc(x, z, look, name, rot, weapon, cls) {
      const h = R.makeHero(cls || 'warrior', weapon || null, Object.assign({ weapon: weapon || null, shield: false }, look || {}));
      h.g.position.set(x, 0, z); h.g.rotation.y = rot || 0; group.add(h.g);
      const n = { h, x, z, name, rot: rot || 0 }; tw.npcs.push(n); if (name) { n.box = block(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 'npc'); n.near = 1; }
      return n;
    }
  };

  // ---------- 對話、遺跡入口 ----------
  R.townTalk = (who, lines) => { R.sheet('<p class="kicker">' + R.esc(who) + '</p>' + lines.filter(Boolean).map(l => '<p>' + R.esc(l) + '</p>').join(''), '<div class="row"><button type="button" class="btn pri" id="tk-x">好</button></div>'); $('tk-x').onclick = R.closeSheet; };
  R.townToast = t => R.toast(t);
  const askRuin = s => {
    R.syncStatus(); if (R.applyEvents) R.applyEvents();
    if (s.sealed) { R.townTalk(s.name, [s.sealed]); return; }
    if (s.status !== 'open') { const g = R.gradeById(s.grade), u = g.unlock ? R.gradeById(g.unlock) : null; R.townTalk(s.name, ['入口有公會的封條。', u ? '要先從' + u.name + '遺跡的最深處活著回來，公會才會發這一級的委託。' : '']); return; }
    const g = R.gradeById(s.grade);
    R.sheet('<p class="kicker">' + R.esc(g.name) + '・' + R.esc(R.TYPES[s.type].name) + '</p><h2>' + R.esc(s.name) + '</h2><p>' + R.esc(s.desc) + '</p><p class="note">' + R.esc(R.clsName(R.S.cls)) + ' Lv ' + R.S.classes[R.S.cls].lv + '・回復藥 ' + R.S.potions.hp + '・魔力藥 ' + R.S.potions.mp + (R.today ? '・' + R.esc(R.shortDate()) : '') + '</p>' + (R.runNote ? R.runNote(s) : ''),
      '<div class="row"><button type="button" class="btn pri" id="rg-go">進去</button><button type="button" class="btn" id="rg-no">再準備一下</button></div>');
    $('rg-go').onclick = () => { R.closeSheet(); R.startRun(s.id); }; $('rg-no').onclick = R.closeSheet;
  };

  // ---------- 進城、離開 ----------
  // 換掉舊的場景時，把只屬於它的形狀、材質、貼圖丟掉（共用的不丟）
  // at：站在哪裡（世界座標 [x, z]）
  R.enterTownNow = (from, at) => {
    const TH = T();
    R.initGL();
    if (W.town && !W.run) R.disposeScene(W.inside ? (W.outside && W.outside.scene) : W.scene);
    else if (W.run && W.scene) R.disposeScene(W.scene);
    W.run = null; W.enemies = []; W.shots = []; W.drops = []; W.zones = []; W.fxs = []; W.dyn = []; W.F = null;
    W.inside = null; W.outside = null;
    if (R.ensureWorld) R.ensureWorld(); if (R.applyEvents) R.applyEvents();
    W.town = { t: 0, from }; R.clearNums();
    W.scene = R.markScene(new TH.Scene());
    const E = R.eventsToday ? R.eventsToday() : {}, sky = new TH.Color(E.blizzard ? '#9AA6B0' : '#B4C2CC').convertSRGBToLinear();
    W.scene.background = sky; W.scene.fog = new TH.FogExp2(sky, E.blizzard ? 0.03 : 0.009);
    W.scene.add(new TH.HemisphereLight(new TH.Color('#DCE6EE').convertSRGBToLinear(), new TH.Color('#6A6052').convertSRGBToLinear(), 0.95));
    const sun = new TH.DirectionalLight(new TH.Color('#FFE6C8').convertSRGBToLinear(), E.blizzard ? 0.6 : 1.15); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 110; sun.shadow.bias = -0.0012;
    W.scene.add(sun); W.scene.add(sun.target); W.moon = sun; W.torch = null;
    R.buildTown(W.scene);
    const cls = R.S.cls, eq = R.equipped(cls), P = { cls, speed: R.CLASSES[cls].speed * 1.05, h: R.makePlayerHero(cls, eq.weapon ? eq.weapon.base : R.STARTER[cls], eq), aimA: Math.PI, yaw: Math.PI };
    W.P = P; W.scene.add(P.h.g);
    const spot = at || (from && W.town.gates && W.town.gates[from] ? W.town.gates[from] : [WX(592), WZ(656)]);
    P.x = spot[0]; P.z = spot[1];
    R.spawnTownAllies();
    R.showScreen('run'); document.getElementById('run').classList.add('town'); W.paused = false;
    R.placeCam(null);
    try { W.renderer.compile(W.scene, W.camera); } catch (e) { }
    R.townHud(true);
    if (!at) R.banner('東鶴', (R.today ? R.dateLabel() : '') + (from ? '・從遺跡回來了' + (R.dayMsg ? '（' + R.dayMsg + '）' : '') : '')); R.dayMsg = '';
    if (R.crimeReset) R.crimeReset();
  };
  R.enterTown = (from, at) => R.three.then(() => R.enterTownNow(from, at));
  R.leaveTown = () => { document.getElementById('run').classList.remove('town'); W.town = null; W.inside = null; W.outside = null; if (R.updateSee) R.updateSee(false); };
  // 打開公會、鐵匠鋪……（全螢幕的店面），關掉後回到原來的地方
  R.openHub = (tab, focus) => { W.paused = true; R.input.keys = {}; R.showScreen('hub'); const b = $('h-street'); if (b) b.textContent = W.inside ? (W.inside.kind === 'guild' ? '回到大廳' : '回到店裡') : '回到街上'; R.hub(tab, focus); };
  R.backToTown = () => {
    if (!W.town) { R.enterTown(); return; }
    if (W.inside) { R.refreshInterior(); R.showScreen('run'); W.paused = false; R.interiorHud(true); return; }
    (W.town.allies || []).forEach(a => W.scene.remove(a.h.g)); R.spawnTownAllies();
    R.showScreen('run'); W.paused = false; R.townHud(true);
  };

  // ---------- 每一格 ----------
  const smokeGeo = () => smokeGeo.g || (smokeGeo.g = (() => { const g = new (T().SphereGeometry)(0.35, 6, 5); g.userData.shared = true; return g; })());
  R.townStep = dt => {
    if (W.inside) { R.interiorStep(dt); return; }   // 在建築物裡面
    const tw = W.town, P = W.P, I = R.input; if (!tw || !P) return;
    tw.t += dt;
    let mx = 0, mz = 0;
    if (!P.busy) {
      if (I.keys.w || I.keys.arrowup) mz -= 1; if (I.keys.s || I.keys.arrowdown) mz += 1; if (I.keys.a || I.keys.arrowleft) mx -= 1; if (I.keys.d || I.keys.arrowright) mx += 1;
      if (I.moveStick) { mx += I.moveStick.x; mz += I.moveStick.y; }
    }
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    if (P.sit) { if (ml > 0.1) { P.sit = false; P.h.sit = false; } else { mx = mz = 0; } }
    const cy = Math.cos(W.cam.yaw), sy = Math.sin(W.cam.yaw), wx = mx * cy + mz * sy, wz = -mx * sy + mz * cy;
    const run = R.running() ? 1.65 : 1; P.x += wx * P.speed * run * dt; P.z += wz * P.speed * run * dt;
    if (!P.sit) R.collide(P, 0.42);
    if (ml > 0.1) P.yaw = Math.atan2(wx, wz);
    P.aimA = P.yaw;
    P.h.g.position.set(P.x, 0, P.z); P.h.g.rotation.y = P.yaw; R.animHero(P.h, ml * P.speed * run, dt, false);
    R.townAllies(dt);
    // 路人在街上走；衛兵巡邏；站著的人看著你
    tw.npcs.forEach(n => {
      if (n.chase || n.off) return;   // 正在追你的衛兵（props.js）；回家了的路人（daytime.js）
      if (!n.walk) { if (n.near && !n.watch) { const d = Math.hypot(P.x - n.x, P.z - n.z); n.h.g.rotation.y = d < 3.5 ? Math.atan2(P.x - n.x, P.z - n.z) : n.rot; } R.animHero(n.h, 0, dt, false); return; }
      const d = Math.hypot(n.tx - n.x, n.tz - n.z);
      if (d < 0.5) { if (n.patrol) { n.pi = (n.pi + 1) % n.patrol.length; [n.tx, n.tz] = n.patrol[n.pi]; } else { const t = n.next ? n.next(n) : tw.walkNodes[Math.floor(Math.random() * tw.walkNodes.length)]; n.tx = t[0]; n.tz = t[1]; } return; }
      const a = Math.atan2(n.tx - n.x, n.tz - n.z), sp = n.flee > 0 ? 4.2 : n.speed || 1.8; n.x += Math.sin(a) * sp * dt; n.z += Math.cos(a) * sp * dt; if (n.flee > 0) n.flee -= dt;
      const o = { x: n.x, z: n.z }; R.collide(o, 0.35); if (Math.hypot(o.x - n.x, o.z - n.z) > 0.01) { n.tx = n.x; n.tz = n.z; } n.x = o.x; n.z = o.z;
      n.rot = a; n.h.g.position.set(n.x, 0, n.z); n.h.g.rotation.y = a; R.animHero(n.h, sp, dt, false);
    });
    if (R.crimeStep) R.crimeStep(dt, tw.watchers, tw);
    if (R.peopleStep) R.peopleStep(dt);
    // 貨車：照路線開，前面有人就停
    (tw.cars || []).forEach(c => {
      const [tx, tz] = c.path[(c.i + 1) % c.path.length], dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz); if (d < 0.5) { c.i = (c.i + 1) % c.path.length; return; }
      const ux = dx / d, uz = dz / d;
      let stop = [P].concat(tw.npcs.filter(n => n.walk && !n.off), tw.cars.filter(o => o !== c).map(o => ({ x: o.x, z: o.z }))).some(o => { const ox = o.x - c.x, oz = o.z - c.z, al = ox * ux + oz * uz, sd = Math.abs(ox * uz - oz * ux); return al > 0.5 && al < 6.5 && sd < 1.6; });
      // 紅燈：開往路口、還沒進路口
      if (!stop) stop = (tw.signals || []).some(sg => { const ox = sg.x - c.x, oz = sg.z - c.z, al = ox * ux + oz * uz, sd = Math.abs(ox * uz - oz * ux); if (al < 6 || al > 16 || sd > 9) return false; const a = Math.atan2(-uz, -ux), dA = Math.abs(Math.sin(a + sg.J.angA)), axis = dA < 0.5 ? 'A' : 'B'; return R.signalState(tw.t, axis) !== 'g'; });
      // 平交道的柵欄放下來了
      if (!stop) stop = (tw.crossings || []).some(cr => { if (cr.k < 0.1) return false; const ox = cr.x - c.x, oz = (tw.railZ || 0) - c.z, al = ox * ux + oz * uz; return al > 4 && al < 16 && Math.abs(ox * uz - oz * ux) < 6; });
      c.v = Math.max(0, Math.min(7, (c.v || 0) + (stop ? -14 : 4) * dt)); c.x += ux * c.v * dt; c.z += uz * c.v * dt;
      c.g.position.set(c.x, 0, c.z); c.g.rotation.y = Math.atan2(-ux, -uz);
    });
    if (R.cityscapeStep) R.cityscapeStep(dt, tw);
    if (tw.trees) tw.trees.update(W.cam.yaw);
    if (R.suburbStep) R.suburbStep(dt, tw, P);
    if (tw.clock) { const now = new Date(), hh = now.getHours() % 12 + now.getMinutes() / 60, mm = now.getMinutes() + now.getSeconds() / 60; tw.clock.h.rotation.z = -hh / 12 * Math.PI * 2; tw.clock.m.rotation.z = -mm / 60 * Math.PI * 2; }
    // 煙（重複使用，不會一直做新的）、溫泉的蒸氣、旗子、漂浮的眼睛記號
    tw.puff = (tw.puff || 0) - dt; tw.pool = tw.pool || [];
    const spawnPuff = (x, y, z, col, big) => { let m = tw.pool.pop(); if (!m) { m = new (T().Mesh)(smokeGeo(), new (T().MeshBasicMaterial)({ color: col, transparent: true, opacity: 0.5, depthWrite: false })); tw.group.add(m); } m.visible = true; m.material.color.set(col); m.position.set(x, y, z); m.scale.setScalar(big ? 2 : 1); tw.fx.push({ kind: 'puff', m, life: 3, big }); };
    if (tw.puff <= 0) {
      tw.puff = 0.35;
      if (tw.smokes.length) for (let k = 0; k < 2; k++) { const s = tw.smokes[Math.floor(Math.random() * tw.smokes.length)]; if (Math.abs(s.x - P.x) + Math.abs(s.z - P.z) < 60) spawnPuff(s.x + (Math.random() - 0.5) * 0.3, s.y, s.z, s.big ? '#6A6A70' : '#9A9AA0', s.big); }
      if (tw.smoke) spawnPuff(tw.smoke.x, tw.smoke.y, tw.smoke.z, '#8A8A90');
      if (tw.steam && Math.abs(tw.steam.x - P.x) + Math.abs(tw.steam.z - P.z) < 60) spawnPuff(tw.steam.x + (Math.random() - 0.5) * 6, 0.4, tw.steam.z + (Math.random() - 0.5) * 3, '#F4F8FA');
    }
    tw.fx = tw.fx.filter(f => {
      if (f.kind === 'bob') { f.m.position.y = f.y + Math.sin(tw.t * 1.6) * 0.2; f.m.rotation.y += dt; return true; }
      if (f.kind === 'flag') { f.m.rotation.y = Math.sin(tw.t * 1.3 + f.ph) * 0.25; return true; }
      if (f.kind === 'spin') { f.m.rotation.z += dt * (f.sp || 0.3); return true; }
      f.life -= dt; f.m.position.y += dt * (f.big ? 2 : 1.2); f.m.scale.multiplyScalar(1 + dt * 0.5); f.m.material.opacity = Math.max(0, f.life / 3 * 0.55);
      if (f.life <= 0) { f.m.visible = false; tw.pool.push(f.m); return false; } return true;
    });
    // 雪花跟著人物
    const pos = tw.snow.geometry.attributes.position, arr = pos.array, wind = tw.snow.userData.wind;
    for (let i = 0; i < arr.length; i += 3) { arr[i + 1] -= dt * (1.4 + (i % 7) * 0.1 + wind * 0.3) * (tw.snow.userData.fall || 1); arr[i] += (Math.sin(tw.t + i) * 0.3 + wind) * dt; if (arr[i + 1] < 0) { arr[i + 1] += 18; if (wind > 1) arr[i] = (Math.random() - 0.5) * 60; } }
    pos.needsUpdate = true; tw.snow.position.set(P.x, 0, P.z);
    // 鏡頭、陰影、擋住人的建築（材質裡挖洞）
    R.placeCam(dt, 0);
    W.moon.position.set(P.x - 14, 30, P.z + 12); W.moon.target.position.set(P.x, 0, P.z);
    R.updateSee(true, P, W.camera);
    R.townHud(false, dt);
  };
  // 坐在長椅上（動一下就站起來）
  R.sitDown = (x, z) => { const P = W.P; P.x = x; P.z = z; P.yaw = 0; P.sit = true; P.h.sit = true; P.h.g.position.set(x, 0, z); R.toast('坐下來歇一會兒。動一下就會站起來。'); };
  // 附近可以互動的東西
  R.townNear = () => { const P = W.P; let best = null, bd = 1e9; W.town.inter.forEach(it => { const ix = it.follow ? it.follow.x : it.x, iz = it.follow ? it.follow.z + 1.1 : it.z; const d = Math.hypot(ix - P.x, iz - P.z); if (d < it.r && d < bd && (!it.when || it.when())) { bd = d; best = it; } }); return best; };
  R.townInteract = () => { if (W.P && W.P.sit) { W.P.sit = false; W.P.h.sit = false; return; } const it = W.inside ? R.interiorNear() : R.townNear(); if (it) it.act(); };
  R.townMenu = () => {
    R.sheet('<h2>東鶴</h2><p class="note">' + (R.today ? R.esc(R.dateLabel()) : '') + '</p><p class="note">' + (R.touch ? '左搖桿移動・「跑步」開關・右上角的箭頭轉動視角・靠近門口或人點提示就能互動' : 'WASD 移動・按住 Shift 跑步・空白鍵進門或說話・Q／E 轉視角・滾輪拉近拉遠・Tab 地圖') + '</p><p class="note">舊城的北門外是外濠和國道一號；站前大通往北是東鶴站、站前廣場、拱廊商店街和德克斯凡百貨。站西通過了平交道是北口，再往北過霜溪是北山礦坑、霜溪石窟。國道往西過新大橋是河西和城西遺跡；東邊是官廳街、新商區。更遠的遺跡，到東鶴站搭魔導電車，或到國道邊的驛站搭車。</p>',
      '<div class="row"><button type="button" class="btn pri" id="tm-x">繼續</button>' + (R.questLog ? '<button type="button" class="btn" id="tm-log">手上的委託</button>' : '') + (R.newsSheet ? '<button type="button" class="btn" id="tm-news">瓦版</button>' : '') + (R.S.hood ? '<button type="button" class="btn" id="tm-hood">' + (R.S.hoodOn ? '拿下兜帽' : '戴上兜帽') + '</button>' : '') + '<button type="button" class="btn" id="tm-map">攤開地圖</button><button type="button" class="btn" id="tm-title">存檔，回到標題</button></div>');
    $('tm-x').onclick = R.closeSheet; $('tm-map').onclick = () => { R.closeSheet(); W.paused = true; R.openMap('donghe', 'dh-town'); };
    if ($('tm-log')) $('tm-log').onclick = () => R.questLog(); if ($('tm-hood')) $('tm-hood').onclick = () => { R.toggleHood(); R.townMenu(); }; if ($('tm-news')) $('tm-news').onclick = () => R.newsSheet();
    $('tm-title').onclick = () => { R.save(); R.closeSheet(); R.leaveTown(); if (R.goTitle) R.goTitle(); };
  };

  // ---------- 狀態列 ----------
  let slow = 0, lastArea = '';
  R.townArea = () => {
    const P = W.outside || W.P, sx = P.x / S + 500, sy = P.z / S + 500;
    return C.areaName(sx, sy);
  };
  R.townHud = (force, dt) => {
    slow += dt || 0; if (!force && slow < 0.2) return; slow = 0;
    const name = R.townArea(), date = R.today ? R.shortDate() : '公元 2836 年・冬';
    if (name + date !== lastArea || force) { lastArea = name + date; $('r-where').innerHTML = '<b>' + R.esc(name) + '</b><small>' + R.esc(date) + '　' + R.esc(R.clsName(R.S.cls)) + ' Lv ' + R.S.classes[R.S.cls].lv + '</small>'; }
    $('r-town').innerHTML = '<span>費拉 <b>' + R.S.gold + '</b></span><span>回復藥 <b>' + R.S.potions.hp + '</b></span><span>魔力藥 <b>' + R.S.potions.mp + '</b></span>' + (R.crimeHud ? R.crimeHud() : '');
    const it = R.townNear();
    $('r-prompt').hidden = !it; if (it) $('r-prompt').innerHTML = '<kbd>' + (R.touch ? '互動' : '空白') + '</kbd>' + R.esc(it.label);
    R.drawMinimap();
  };
  // Tab 大地圖：整張東鶴近郊
  R.drawTownBig = (x, s) => {
    const tw = W.town, P = W.outside || W.P, k = s / (HALF * 2), pt = (wx, wz) => [(wx + HALF) * k, (wz + HALF) * k];
    x.imageSmoothingEnabled = true; x.drawImage(tw.groundCanvas, 0, 0, s, s);
    x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'bottom';
    const tag = (m, txt, col) => { x.fillStyle = 'rgba(244,233,205,.9)'; const w2 = x.measureText(txt).width + 8; x.fillRect(m[0] - w2 / 2, m[1] - 24, w2, 16); x.fillStyle = col || '#1A1410'; x.fillText(txt, m[0], m[1] - 10); };
    Object.entries(tw.gates || {}).forEach(([id, [gx, gz]]) => { const m = pt(gx, gz), site = R.SITES.find(v => v.id === id); x.fillStyle = R.GRADE_COLOR[site.grade]; x.beginPath(); x.arc(m[0], m[1], 6, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#FFF'; x.lineWidth = 2; x.stroke(); tag(m, site.name); });
    tw.inter.filter(v => v.door).forEach(it => { const m = pt(it.x, it.z); x.fillStyle = '#3E7A48'; x.fillRect(m[0] - 4, m[1] - 4, 8, 8); });
    const m = pt(P.x, P.z); x.fillStyle = '#FFE08A'; x.strokeStyle = '#1A1410'; x.lineWidth = 2; x.beginPath(); x.arc(m[0], m[1], 6, 0, Math.PI * 2); x.fill(); x.stroke();
  };
  // 小地圖：把地面的畫布轉一轉、縮一縮
  R.drawTownMinimap = (x, s) => {
    const P = W.P, tw = W.town, yaw = W.cam.yaw, N = tw.groundCanvas.width, k = N / (HALF * 2), zoom = 0.9;
    x.save(); x.translate(s / 2, s / 2); x.rotate(yaw); x.scale(zoom / k * 1.4, zoom / k * 1.4); x.translate(-(P.x + HALF) * k, -(P.z + HALF) * k);
    x.imageSmoothingEnabled = false; x.drawImage(tw.groundCanvas, 0, 0); x.restore();
    const pt = (wx, wz) => { const dx = (wx - P.x) * zoom * 1.4, dz = (wz - P.z) * zoom * 1.4, c = Math.cos(yaw), sn = Math.sin(yaw); return [s / 2 + dx * c - dz * sn, s / 2 + dx * sn + dz * c]; };
    Object.entries(tw.gates || {}).forEach(([id, [gx, gz]]) => { const m = pt(gx, gz), site = R.SITES.find(v => v.id === id); x.fillStyle = R.GRADE_COLOR[site.grade]; x.beginPath(); x.arc(m[0], m[1], 4.5, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#FFF'; x.lineWidth = 1.5; x.stroke(); });
    tw.inter.filter(v => v.door).forEach(it => { const m = pt(it.x, it.z); x.fillStyle = '#3E7A48'; x.fillRect(m[0] - 3, m[1] - 3, 6, 6); });
    if (R.crimeMinimap) R.crimeMinimap(x, pt);
  };
})(window.R);
