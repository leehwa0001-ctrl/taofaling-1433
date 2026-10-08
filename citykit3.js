// 精緻城市（三）：建築、屋頂（瓦、反り）、樹（冬天：落葉樹是光禿禿的枝、松和杉是綠的）、街上的東西、招牌、人、車、電車（作者 2026-10-08）
// 全部掛在 B（citykit2.js 的蓋城工具）上：
//   B.bld({ r, h, style, face, col, roof, name, … })  一棟樓（style：office、glass、apt、house、shop、machiya、kura、brick、factory）
//   B.roof(x, z, w, d, { type, h, o, sori, mat, ry, y })  屋頂（gable 切妻、hip 寄棟、pyramid 方形、irimoya 入母屋）
//   B.tree(x, z, kind, s)  kind：pine、cedar、round、bare、shrub、bamboo
//   B.lamp、B.lantern、B.vend、B.bench、B.poles、B.torii、B.sign、B.flag、B.hedge、B.fence、B.bollard、B.busStop
//   B.person、B.talker；人、車、電車的移動在 CK.stepLife
(function (R) {
  const W = R.W, T = () => THREE, CK = R.CK, S = () => R.S;
  const { inR } = CK.util;

  // ---------- 屋頂 ----------
  // 回傳 { top, under, edge }（三個 BufferGeometry，座標是屋頂自己的：脊沿著 x，中心在原點，屋簷在 y＝0）
  const ROOFS = new Map();
  CK.roofGeo = (w, d, o) => {
    o = o || {}; const type = o.type || 'hip', ov = o.o == null ? 0.6 : o.o, H = o.h == null ? d * 0.35 : o.h, sori = o.sori || 0, th = o.th || 0.18;
    const key = [type, w, d, ov, H, sori, th].map(v => typeof v === 'number' ? v.toFixed(2) : v).join('|'); if (ROOFS.has(key)) return ROOFS.get(key);
    const TH = T(), Wh = w / 2 + ov, Dh = d / 2 + ov, k = H / Dh, rl = type === 'gable' ? Wh : Math.max(0, Wh - Dh);
    const lift = (x, z) => { if (!sori) return 0; const ex = Wh - Math.abs(x), ez = Dh - Math.abs(z), e = Math.min(ez, type === 'gable' ? 1e9 : ex), a = Math.max(0, 1 - e / (Dh * 0.55)), c = type === 'gable' ? 0 : Math.max(0, 1 - Math.max(ex, ez) / (Dh * 0.9)); return sori * (a * a + c * c * 1.6); };
    const yOf = (x, z, t) => H * t + lift(x, z);
    const faces = [];
    // 前後（z>0、z<0）：屋簷 → 脊
    [1, -1].forEach(sd => faces.push({ n: 10, m: 5, p: (s, t) => { const xe = -Wh + 2 * Wh * s, xr = -rl + 2 * rl * s, x = xe + (xr - xe) * t, z = sd * Dh * (1 - t); return [x, yOf(x, z, t), z, x, (1 - t) * Math.hypot(Dh, H)]; }, flip: sd < 0 }));
    // 左右（寄棟、方形、入母屋）：三角形
    if (type !== 'gable') [1, -1].forEach(sd => faces.push({ n: 8, m: 5, p: (s, t) => { const ze = -Dh + 2 * Dh * s, x = sd * (Wh + (rl - Wh) * t), z = ze * (1 - t); return [x, yOf(x, z, t), z, z, (1 - t) * Math.hypot(Dh, H)]; }, flip: sd > 0 }));
    const build = (dy, flipAll) => {
      const pos = [], uv = [], idx = []; let base = 0;
      faces.forEach(F => {
        for (let j = 0; j <= F.m; j++) for (let i = 0; i <= F.n; i++) { const q = F.p(i / F.n, j / F.m); pos.push(q[0], q[1] + dy, q[2]); uv.push(q[3], q[4]); }
        for (let j = 0; j < F.m; j++) for (let i = 0; i < F.n; i++) { const a = base + j * (F.n + 1) + i, b = a + 1, c = a + F.n + 1, d2 = c + 1; const f = F.flip !== flipAll; if (f) idx.push(a, c, b, b, c, d2); else idx.push(a, b, c, b, d2, c); }
        base += (F.n + 1) * (F.m + 1);
      });
      const g = new TH.BufferGeometry(); g.setAttribute('position', new TH.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new TH.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
    };
    const top = build(0, false), under = build(-th, true);
    // 屋簷的邊（上下兩層之間）
    const ep = [], eu = [], ei = [], perim = [];
    const N = 24; for (let i = 0; i <= N; i++) perim.push([-Wh + 2 * Wh * i / N, Dh]); for (let i = 1; i <= N; i++) perim.push([Wh, Dh - 2 * Dh * i / N]); for (let i = 1; i <= N; i++) perim.push([Wh - 2 * Wh * i / N, -Dh]); for (let i = 1; i < N; i++) perim.push([-Wh, -Dh + 2 * Dh * i / N]);
    const ridgeY = (x, z) => { if (type !== 'gable' || Math.abs(Math.abs(x) - Wh) > 1e-6) return 0; return H * (1 - Math.abs(z) / Dh); };   // 切妻的山牆那一邊：邊是斜的
    perim.forEach((p, i) => { const y = lift(p[0], p[1]) + ridgeY(p[0], p[1]); ep.push(p[0], y, p[1], p[0], y - th, p[1]); eu.push(i * 0.5, 0, i * 0.5, th); });
    for (let i = 0; i < perim.length; i++) { const a = i * 2, b = ((i + 1) % perim.length) * 2; ei.push(a, a + 1, b, b, a + 1, b + 1); }
    const edge = new TH.BufferGeometry(); edge.setAttribute('position', new TH.Float32BufferAttribute(ep, 3)); edge.setAttribute('uv', new TH.Float32BufferAttribute(eu, 2)); edge.setIndex(ei); edge.computeVertexNormals();
    const out = { top, under, edge, H, Wh, Dh, rl };
    ROOFS.set(key, out); return out;
  };

  // ---------- 招牌（畫在畫布上的字） ----------
  const SIGNS = new Map();
  const FONT = '"Noto Serif TC","Noto Sans TC","Microsoft JhengHei","PingFang TC",serif';
  CK.signMat = (txt, o) => {
    o = o || {}; const key = [txt, o.bg, o.fg, o.vert ? 1 : 0, o.neon ? 1 : 0, o.frame || ''].join('|'); if (SIGNS.has(key)) return SIGNS.get(key);
    const TH = T(), ch = [...txt], n = ch.length, cw = 64, pad = 14, vert = !!o.vert;
    const c = document.createElement('canvas'); c.width = vert ? cw + pad * 2 : n * cw + pad * 2; c.height = vert ? n * cw + pad * 2 : cw + pad * 2;
    const g = c.getContext('2d');
    g.fillStyle = o.bg || '#1A1A20'; g.fillRect(0, 0, c.width, c.height);
    if (o.frame) { g.strokeStyle = o.frame; g.lineWidth = 4; g.strokeRect(5, 5, c.width - 10, c.height - 10); }
    g.fillStyle = o.fg || '#F4ECD8'; g.font = (o.weight || 'bold') + ' ' + Math.round(cw * 0.82) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (o.neon) { g.shadowColor = o.fg || '#FFF'; g.shadowBlur = 10; }
    ch.forEach((t, i) => vert ? g.fillText(t, c.width / 2, pad + cw * i + cw / 2 + 2) : g.fillText(t, pad + cw * i + cw / 2, c.height / 2 + 2));
    const t = new TH.CanvasTexture(c); t.encoding = TH.sRGBEncoding; t.anisotropy = 4; t.userData.shared = true;
    const m = new TH.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0 });
    if (o.neon || o.lit) { m.emissive = new TH.Color('#FFFFFF'); m.emissiveMap = t; m.emissiveIntensity = o.neon ? 1.6 : 0.6; m.userData.neon = true; m.userData.ei0 = m.emissiveIntensity; }
    m.userData.shared = true; m.userData.tile = [1, 1]; m.userData.aspect = c.width / c.height;
    CK.mats['sign|' + key] = m;
    SIGNS.set(key, m); return m;
  };

  // ---------- 材質的捷徑：外牆（每種外牆 × 幾種顏色） ----------
  const FAC_COL = {
    office: ['#D8D4CC', '#C8C4BA', '#B8BCC0', '#E2DCD0', '#A8A49C', '#CEC6B8'],
    glass: ['#C0CCD4', '#A8B8C4', '#D0D4D8', '#98A8B4'],
    apt: ['#E8E2D6', '#DCD6CA', '#D4D8DA', '#E6DCCC', '#C8C8C4'],
    house: ['#E4DCCC', '#D8D0C0', '#C8C0B4', '#E8E0D4', '#B8B0A4', '#D0C4B0'],
    brickArch: ['#FFFFFF', '#F0E8E0'],
    factory: ['#C8CCD0', '#B8C0C4', '#D0CCC4']
  };
  const facMat = (style, col) => CK.mat('fac|' + style + '|' + col, { fac: style, col, see: 1 });
  CK.facMat = facMat;

  // ---------- 加到 B 上 ----------
  CK.extendBuilder = B => {
    const TH = B.TH, g = B.g, M = CK.M, P = B.part, BOX = B.box, D = B.D, tw = W.town, city = B.city;
    const rnd = CK.rng(city.seed || 2836), rr = (a, b) => a + (b - a) * rnd(), pk = a => a[Math.floor(rnd() * a.length)];
    B.rnd = rnd; B.rr = rr; B.pk = pk;
    // 一面牆上的點：f＝'s'（朝 +z）、'n'、'e'（朝 +x）、'w'
    const FACE = { s: [0, 0, 1], n: [Math.PI, 0, -1], e: [Math.PI / 2, 1, 0], w: [-Math.PI / 2, -1, 0] };
    B.FACE = FACE;
    const onFace = (f, c, a, off) => (f === 's' || f === 'n' ? [a, c + FACE[f][2] * off] : [c + FACE[f][1] * off, a]);
    // 招牌：貼在牆上（txt、f、c＝牆的位置、a＝沿著牆的中心、y＝中心高度）
    B.sign = (txt, f, c, a, y, o) => {
      o = o || {}; const m = CK.signMat(txt, o), hgt = o.size || 0.7, n = [...txt].length, w = o.vert ? hgt * 1.2 : hgt * m.userData.aspect, h = o.vert ? hgt * 1.2 / m.userData.aspect : hgt;
      const [x, z] = onFace(f, c, a, o.off == null ? 0.06 : o.off);
      if (o.box) { const d = 0.25, [bx, bz] = onFace(f, c, a, (o.off || 0.06) + d / 2 - 0.02); P(g.box, M('steelD'), bx, y, bz, f === 's' || f === 'n' ? w + 0.1 : d, h + 0.1, f === 's' || f === 'n' ? d : w + 0.1); const [x2, z2] = onFace(f, c, a, (o.off || 0.06) + d + 0.005); P(g.plane, m, x2, y, z2, w, h, 1, 0, FACE[f][0], 0, { uv: 'keep' }); return; }
      P(g.plane, m, x, y, z, w, h, 1, 0, FACE[f][0], 0, { uv: 'keep' }); void n;
    };
    // 兩面都有字的立牌（吊牌、突出的招牌）：x、z、ry（板子面向 ry 的方向）
    B.blade = (txt, x, y, z, ry, o) => { o = Object.assign({ vert: 1 }, o || {}); const m = CK.signMat(txt, o), hgt = o.size || 0.55, w = hgt * 1.25, h = w / m.userData.aspect; P(g.box, M('steelD'), x, y, z, 0.12, h + 0.12, w + 0.12, 0, ry, 0); [1, -1].forEach(sd => { const ox = Math.cos(ry) * 0.065 * sd, oz = -Math.sin(ry) * 0.065 * sd; P(g.plane, m, x + ox, y, z + oz, w, h, 1, 0, ry + (sd > 0 ? Math.PI / 2 : -Math.PI / 2), 0, { uv: 'keep' }); }); };

    // ---- 屋頂 ----
    B.roof = (x, z, w, d, o) => {
      o = o || {}; const rf = CK.roofGeo(w, d, o), y = o.y || 0, ry = o.ry || 0, mat = M(o.mat || 'kawara'), tile = mat.userData.tile;
      P(rf.top, mat, x, y, z, 1, 1, 1, 0, ry, 0, { uv: 'keep', us: 1 / tile[0], vs: 1 / tile[1] });
      P(rf.under, M(o.under || 'woodD'), x, y, z, 1, 1, 1, 0, ry, 0, { uv: 'keep', us: 0.6, vs: 0.6 });
      P(rf.edge, M(o.edge || o.under || 'woodD'), x, y, z, 1, 1, 1, 0, ry, 0, { uv: 'keep', us: 0.6, vs: 3 });
      // 脊（大棟）：沿著 x
      if (rf.rl > 0.05 && o.ridge !== false) { const [cx, cz] = [x, z]; P(g.box, M(o.ridgeMat || 'black'), cx, y + rf.H + 0.12, cz, rf.rl * 2 + 0.4, 0.34, 0.42, 0, ry, 0, { noFac: true }); [-1, 1].forEach(sd => { const ex = cx + Math.cos(ry) * sd * (rf.rl + 0.25), ez = cz - Math.sin(ry) * sd * (rf.rl + 0.25); P(g.box, M(o.ridgeMat || 'black'), ex, y + rf.H + 0.32, ez, 0.4, 0.7, 0.5, 0, ry, 0); if (o.shachi) P(g.cone8, M('gold'), ex, y + rf.H + 1.0, ez, 0.45, 0.9, 0.45, sd * 0.4, ry, 0); }); }
      if (o.type === 'gable' && o.gableWall !== false) { [-1, 1].forEach(sd => { const ex = x + Math.cos(ry) * sd * (w / 2), ez = z - Math.sin(ry) * sd * (w / 2); P(g.prism, M(o.gableMat || 'plaster'), ex, y, ez, d, rf.H * (d / 2) / (d / 2 + (o.o == null ? 0.6 : o.o)), 0.2, 0, ry + Math.PI / 2, 0); }); }
      return rf;
    };

    // ---- 建築 ----
    // r：[x0, z0, x1, z1]（在框裡）；h：高；style；face：正面朝哪；col；roof：'flat'、'gable'、'hip'；name：店名（一樓是店面）
    B.bld = (o) => {
      const [x0, z0, x1, z1] = o.r, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, st = o.style || 'office', f = o.face || 's';
      const h = o.h || 12, col = o.col || pk(FAC_COL[st === 'shop' ? 'house' : st === 'kura' || st === 'machiya' ? 'house' : st === 'brick' ? 'brickArch' : st] || FAC_COL.office);
      const solid = () => B.solid(x0, z0, x1, z1, 'house');
      const foot = kind => { const p = [B.toWorld(x0, z0), B.toWorld(x1, z0), B.toWorld(x1, z1), B.toWorld(x0, z1)], a = B.yaw(); if (Math.abs(Math.sin(a * 2)) < 1e-6) D.foot.push({ r: [Math.min(...p.map(q => q[0])), Math.min(...p.map(q => q[1])), Math.max(...p.map(q => q[0])), Math.max(...p.map(q => q[1]))], kind, h }); else D.foot.push({ poly: p, kind, h }); };
      // 面的資料：[朝向, 牆的位置, 沿著牆的起點, 終點]
      const faces = [['s', z1, x0, x1], ['n', z0, x0, x1], ['e', x1, z0, z1], ['w', x0, z0, z1]];
      const fd = faces.find(q => q[0] === f);
      if (st === 'machiya') return machiya(o, col);
      if (st === 'kura') return kura(o, col);
      const fstyle = st === 'shop' ? 'house' : st === 'brick' ? 'brickArch' : st;
      const wm = facMat(fstyle, col);
      // 台基
      BOX(M(st === 'brick' ? 'ashlar' : 'concD'), x0 - 0.06, 0, z0 - 0.06, x1 + 0.06, st === 'brick' ? 1.3 : 0.4, z1 + 0.06);
      // 主體（店面的那一層另外做）
      const shopH = o.name || o.shop ? 3.6 : 0;
      BOX(wm, x0, 0, z0, x1, h, z1);
      solid(); foot(st);
      // 每層的線腳（辦公、公寓）
      if (st === 'office' || st === 'apt') { const fl = st === 'apt' ? 2.9 : 3.5; for (let y = fl; y < h - 1; y += fl) { BOX(M('curb'), x0 - 0.08, y - 0.06, z0 - 0.08, x1 + 0.08, y + 0.06, z1 + 0.08); } }
      if (st === 'glass') { const n = Math.max(2, Math.round(w / 3)); for (let i = 0; i <= n; i++) { const x = x0 + w * i / n; BOX(M('metal'), x - 0.06, 0.4, z1, x + 0.06, h, z1 + 0.3); BOX(M('metal'), x - 0.06, 0.4, z0 - 0.3, x + 0.06, h, z0); } }
      // 公寓的陽台（正面那一邊）
      if (st === 'apt' && fd) {
        const fl = 2.9, along = f === 's' || f === 'n', L0 = fd[2], L1 = fd[3], sg = FACE[f][2] || FACE[f][1], c = fd[1];
        for (let y = fl; y < h - 1; y += fl) {
          const dep = 1.1; if (along) { BOX(M('concrete' in {} ? 'conc' : 'curb'), L0 + 0.2, y - 0.12, Math.min(c, c + sg * dep), L1 - 0.2, y + 0.06, Math.max(c, c + sg * dep)); BOX(M('curb'), L0 + 0.2, y + 0.06, c + sg * dep - 0.08 * sg - 0.04, L1 - 0.2, y + 1.05, c + sg * dep - 0.08 * sg + 0.04); for (let a = L0 + 3.6; a < L1 - 1; a += 3.6) BOX(M('curb'), a - 0.04, y + 0.06, Math.min(c, c + sg * dep), a + 0.04, y + 2.2, Math.max(c, c + sg * dep)); }
          else { BOX(M('curb'), Math.min(c, c + sg * dep), y - 0.12, L0 + 0.2, Math.max(c, c + sg * dep), y + 0.06, L1 - 0.2); BOX(M('curb'), c + sg * dep - 0.08 * sg - 0.04, y + 0.06, L0 + 0.2, c + sg * dep - 0.08 * sg + 0.04, y + 1.05, L1 - 0.2); for (let a = L0 + 3.6; a < L1 - 1; a += 3.6) BOX(M('curb'), Math.min(c, c + sg * dep), y + 0.06, a - 0.04, Math.max(c, c + sg * dep), y + 2.2, a + 0.04); }
        }
      }
      // 店面：一樓亮著的玻璃、門框、雨遮、招牌
      if (shopH && fd) shopfront(fd, o, shopH);
      // 屋頂
      const roof = o.roof || (st === 'house' || st === 'shop' ? (w * d < 140 ? pk(['gable', 'hip', 'flat']) : 'flat') : 'flat');
      if (roof === 'flat') {
        [[x0 - 0.18, z0 - 0.18, x1 + 0.18, z0 + 0.3], [x0 - 0.18, z1 - 0.3, x1 + 0.18, z1 + 0.18], [x0 - 0.18, z0 + 0.3, x0 + 0.3, z1 - 0.3], [x1 - 0.3, z0 + 0.3, x1 + 0.18, z1 - 0.3]].forEach(q => BOX(M('curb'), q[0], h - 0.05, q[1], q[2], h + 0.28, q[3]));   // 簷口（一圈）
        BOX(M('roofG'), x0 + 0.25, h + 0.28, z0 + 0.25, x1 - 0.25, h + 0.32, z1 - 0.25);
        BOX(wm, x0, h + 0.28, z0, x1, h + 1.0, z0 + 0.25, { noFac: true }); BOX(wm, x0, h + 0.28, z1 - 0.25, x1, h + 1.0, z1, { noFac: true }); BOX(wm, x0, h + 0.28, z0, x0 + 0.25, h + 1.0, z1, { noFac: true }); BOX(wm, x1 - 0.25, h + 0.28, z0, x1, h + 1.0, z1, { noFac: true });
        [[x0 - 0.04, z0 - 0.04, x1 + 0.04, z0 + 0.29], [x0 - 0.04, z1 - 0.29, x1 + 0.04, z1 + 0.04], [x0 - 0.04, z0 + 0.29, x0 + 0.29, z1 - 0.29], [x1 - 0.29, z0 + 0.29, x1 + 0.04, z1 - 0.29]].forEach(q => BOX(M('curb'), q[0], h + 1.0, q[1], q[2], h + 1.08, q[3]));   // 女兒牆的壓頂（一圈）
        if (o.top !== false && w > 5 && d > 5) rooftop(x0, z0, x1, z1, h + 0.3, o);
      } else {
        const ridgeX = w >= d, rw = ridgeX ? w : d, rd = ridgeX ? d : w;
        B.roof(cx, cz, rw, rd, { type: roof, y: h, ry: ridgeX ? 0 : Math.PI / 2, h: rd * 0.32, o: 0.55, mat: o.roofMat || (rnd() < 0.6 ? 'kawara' : 'corr'), sori: 0.05 });
      }
      if (o.vsign && fd) { const L0 = fd[2], L1 = fd[3], a = rnd() < 0.5 ? L0 + 0.9 : L1 - 0.9, [bx, bz] = onFace(f, fd[1], a, 0.5); B.blade(o.vsign, bx, Math.min(h - 1.5, 4.2 + [...o.vsign].length * 0.32), bz, FACE[f][0] + Math.PI / 2, { bg: pk(['#C8202A', '#1A2A6A', '#0E0E14', '#F4E8C8']), fg: pk(['#FFF4D8', '#FFE24A', '#FFFFFF']), neon: o.neon, size: 0.6 }); }
      return { r: o.r, h };
    };
    const shopfront = (fd, o, sh) => {
      const [f, c, L0, L1] = fd, along = f === 's' || f === 'n', sg = FACE[f][2] || FACE[f][1], len = L1 - L0, mid = (L0 + L1) / 2;
      const gx = (a, b, y0, y1, dz, mat) => { if (along) BOX(mat, a, y0, c + sg * dz - 0.03, b, y1, c + sg * dz + 0.03); else BOX(mat, c + sg * dz - 0.03, y0, a, c + sg * dz + 0.03, y1, b); };
      gx(L0 + 0.25, L1 - 0.25, 0.15, sh - 0.6, 0.02, M('shopLit'));
      gx(L0 + 0.15, L1 - 0.15, sh - 0.6, sh, 0.05, M(o.bandMat || 'steelD'));
      for (let a = L0 + 0.2; a <= L1 - 0.1; a += Math.max(1.4, len / Math.max(1, Math.round(len / 2)))) gx(a - 0.04, a + 0.04, 0.15, sh - 0.6, 0.06, M('steelD'));
      // 雨遮
      if (o.awning !== false) { const am = CK.mat('awn|' + (o.awnCol || 'r'), { tex: 'paint', col: o.awnCol || pk(['#9A2A2A', '#2A4A6A', '#3E6A48', '#7A5A3A', '#5A4A6A', '#B88A3A']), rough: 0.8 }); if (along) P(g.box, am, mid, sh + 0.05, c + sg * 0.75, len - 0.3, 0.08, 1.5, sg * 0.22, 0, 0); else P(g.box, am, c + sg * 0.75, sh + 0.05, mid, 1.5, 0.08, len - 0.3, 0, 0, -sg * 0.22); }
      if (o.name) B.sign(o.name, f, c, mid, sh + 0.65, { bg: (o.signCol && o.signCol[0]) || pk(['#F4ECD8', '#1A1A20', '#8A1A1A', '#1A2A4A', '#2A4A2E']), fg: (o.signCol && o.signCol[1]) || pk(['#2A1A10', '#F4ECD8', '#FFE8B0']), size: Math.min(0.75, (len - 0.6) / ([...o.name].length + 0.6)), box: 1, lit: 1 });
    };
    const rooftop = (x0, z0, x1, z1, y, o) => {
      const w = x1 - x0, d = z1 - z0, n = Math.floor(rr(1, 4 + w * d / 120));
      for (let i = 0; i < n; i++) { const ax = rr(x0 + 1.4, x1 - 1.4), az = rr(z0 + 1.4, z1 - 1.4); BOX(M('metal'), ax - 0.6, y, az - 0.45, ax + 0.6, y + 0.9, az + 0.45); P(g.cyl, M('steelD'), ax, y + 0.92, az, 0.7, 0.04, 0.7); }
      if (rnd() < 0.45 && w > 8 && d > 8) { const tx = rr(x0 + 2.5, x1 - 2.5), tz = rr(z0 + 2.5, z1 - 2.5); [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([a, b]) => BOX(M('steel'), tx + a - 0.06, y, tz + b - 0.06, tx + a + 0.06, y + 1.6, tz + b + 0.06)); P(g.cyl, M('metal'), tx, y + 2.6, tz, 2.4, 2.0, 2.4); }
      if (rnd() < 0.5 && w > 7 && d > 7) { const px = rr(x0 + 2, x1 - 4), pz = rr(z0 + 2, z1 - 4); BOX(facMat('house', '#D8D4CC'), px, y, pz, px + 2.6, y + 2.6, pz + 2.2, { noFac: true }); BOX(M('curb'), px - 0.1, y + 2.6, pz - 0.1, px + 2.7, y + 2.75, pz + 2.3); }
      if (o.ad && w > 8) { const ad = o.ad === true ? pk(city.ads || ['昭旭鐵道']) : o.ad, f = o.face || 's', fd = { s: z1 - 0.8, n: z0 + 0.8 }[f]; if (fd != null) { const L = Math.min(w - 1.5, [...ad].length * 1.3 + 1); [-L / 2 + 0.3, L / 2 - 0.3].forEach(dx => BOX(M('steel'), (x0 + x1) / 2 + dx - 0.07, y, fd - 0.07, (x0 + x1) / 2 + dx + 0.07, y + 2.4, fd + 0.07)); B.sign(ad, f, fd, (x0 + x1) / 2, y + 2.6, { size: Math.min(1.2, (L - 0.4) / [...ad].length), bg: pk(['#F4F0E6', '#1A2A5A', '#B8202A', '#0E0E14']), fg: pk(['#B8202A', '#FFFFFF', '#FFE24A']), box: 1, lit: 1 }); } }
    };
    // 町家：一樓千本格子、出格子、小屋根（庇）、二樓蟲籠窗、切妻瓦屋頂；正面朝 f
    const machiya = (o, col) => {
      const [x0, z0, x1, z1] = o.r, f = o.face || 's', h1 = 3.2, h = o.h || 6.4;
      // 轉成「門朝南」來蓋：只支援 s / n（街道兩邊）；e / w 用框轉
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[f], ew = f === 'e' || f === 'w', w = ew ? z1 - z0 : x1 - x0, d = ew ? x1 - x0 : z1 - z0;
      const fr0 = B.Bt.getFrame(); const [wcx, wcz] = B.toWorld(cx, cz), a0 = (fr0 ? fr0.a : 0) + rot;
      B.Bt.setFrame(wcx, wcz, a0);
      const X0 = -w / 2, X1 = w / 2, Z0 = -d / 2, Z1 = d / 2;
      BOX(M('concD'), X0 - 0.05, 0, Z0 - 0.05, X1 + 0.05, 0.35, Z1 + 0.05);
      BOX(M('plaster', { col }), X0, 0, Z0, X1, h, Z1 - 0.9);                      // 後面的主體
      BOX(M('woodB'), X0, 0, Z1 - 0.9, X0 + 0.25, h1, Z1); BOX(M('woodB'), X1 - 0.25, 0, Z1 - 0.9, X1, h1, Z1);   // 一樓的柱
      BOX(M('lattice'), X0 + 0.25, 0.35, Z1 - 0.12, X1 - 0.25, h1 - 0.35, Z1 - 0.02);   // 千本格子
      BOX(M('woodB'), X0, h1 - 0.35, Z1 - 0.2, X1, h1, Z1);                         // 鴨居
      if (o.lit !== false && rnd() < 0.6) BOX(M('shopLit'), X0 + 0.3, 0.4, Z1 - 0.3, X1 - 0.3, h1 - 0.4, Z1 - 0.2);
      // 暖簾（店）
      if (o.name) { const nm = CK.mat('noren|' + (o.noren || '#2A3A5A'), { tex: 'paint', col: o.noren || pk(['#2A3A5A', '#5A2A2A', '#2E2E2E', '#4A5A3A']), rough: 0.9 }); P(g.box, nm, 0, h1 - 0.85, Z1 + 0.06, Math.min(2.4, w - 1), 0.9, 0.03); B.sign(o.name, 's', Z1 + 0.08, 0, h1 - 0.8, { size: 0.42, bg: o.noren || '#2A3A5A', fg: '#F4ECD8' }); }
      // 庇（一樓的小屋頂）
      B.roof(0, Z1 - 0.2, w, 1.4, { type: 'gable', y: h1 + 0.05, h: 0.45, o: 0.3, ry: 0, mat: 'kawara', ridge: false, gableWall: false });
      // 二樓：蟲籠窗
      BOX(M('plaster', { col }), X0, h1, Z1 - 1.1, X1, h, Z1 - 0.9);
      for (let x = X0 + 0.8; x < X1 - 0.8; x += 1.6) { BOX(M('woodB'), x - 0.45, h1 + 1.0, Z1 - 0.89, x + 0.45, h1 + 1.9, Z1 - 0.86); }
      // 屋頂：切妻、平入（脊和街平行）
      B.roof(0, (Z0 + Z1 - 0.9) / 2, w, d - 0.9, { type: 'gable', y: h, h: (d - 0.9) * 0.28, o: 0.5, mat: 'kawara', sori: 0.04 });
      if (o.vsign) B.blade(o.vsign, X1 - 0.6, h1 + 1.4, Z1 + 0.4, Math.PI / 2, { bg: '#F4ECD8', fg: '#2A1A10', size: 0.5 });
      B.solid(X0, Z0, X1, Z1, 'house');
      const pts = [[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1]].map(p => B.toWorld(p[0], p[1]));
      D.foot.push(Math.abs(Math.sin(a0 * 2)) < 1e-6 ? { r: [Math.min(...pts.map(q => q[0])), Math.min(...pts.map(q => q[1])), Math.max(...pts.map(q => q[0])), Math.max(...pts.map(q => q[1]))], kind: 'machiya', h } : { poly: pts, kind: 'machiya', h });
      if (fr0) B.Bt.setFrame(fr0.x, fr0.z, fr0.a); else B.Bt.setFrame(null);
      return { r: o.r, h };
    };
    // 土藏：白牆、黑色的腰（なまこ壁）、瓦
    const kura = (o) => {
      const [x0, z0, x1, z1] = o.r, w = x1 - x0, d = z1 - z0, h = o.h || 6;
      BOX(M('concD'), x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 0.5, z1 + 0.05);
      BOX(M('black'), x0, 0.5, z0, x1, 1.6, z1); BOX(M('white'), x0, 1.6, z0, x1, h, z1);
      B.roof((x0 + x1) / 2, (z0 + z1) / 2, Math.max(w, d), Math.min(w, d), { type: 'gable', y: h, ry: w >= d ? 0 : Math.PI / 2, h: Math.min(w, d) * 0.32, o: 0.4, mat: 'kawara', sori: 0.03, gableMat: 'white' });
      B.solid(x0, z0, x1, z1, 'house'); B.foot([x0, z0, x1, z1], 'house', h);
      return { r: o.r, h };
    };
    // 一排地塊：沿著 a0→a1 切成寬 w0～w1，深 dd；正面朝 f（c 是正面那條線）；each(i, r) 回傳那一棟的設定（null＝空地）
    B.row = (f, c, a0, a1, dd, base, w0, w1, each) => {
      const out = []; let a = a0, i = 0;
      while (a1 - a > 0.5) {
        let w = rr(w0, w1); if (a1 - a - w < w0) w = a1 - a;
        const b = Math.min(a + w, a1), r = f === 's' ? [a, c - dd, b, c] : f === 'n' ? [a, c, b, c + dd] : f === 'e' ? [c - dd, a, c, b] : [c, a, c + dd, b];
        const o = each ? each(i++, r) : {}; if (o !== null) { const sp = Object.assign({}, base, o, { r: o.r || r, face: f }); if (sp.gap) { const k = sp.gap; sp.r = [sp.r[0] + (f === 'e' || f === 'w' ? 0 : k), sp.r[1] + (f === 's' || f === 'n' ? 0 : k), sp.r[2] - (f === 'e' || f === 'w' ? 0 : k), sp.r[3] - (f === 's' || f === 'n' ? 0 : k)]; } out.push(B.bld(sp)); }
        a = b;
      }
      return out;
    };

    // ---- 樹（冬天） ----
    const branch = (x0, y0, z0, len, th, yaw, pitch, depth, mat) => {
      const dx = Math.sin(pitch) * Math.sin(yaw), dy = Math.cos(pitch), dz = Math.sin(pitch) * Math.cos(yaw), x1 = x0 + dx * len, y1 = y0 + dy * len, z1 = z0 + dz * len;
      P(g.cyl8, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, th, len, th, pitch * Math.cos(yaw), 0, -pitch * Math.sin(yaw));
      if (depth > 0) { const n = depth > 1 ? 3 : 2; for (let i = 0; i < n; i++) branch(x1, y1, z1, len * rr(0.55, 0.75), th * 0.62, yaw + (i - (n - 1) / 2) * rr(1.4, 2.4) + rr(-0.4, 0.4), Math.min(1.25, pitch + rr(0.25, 0.55)), depth - 1, mat); }
    };
    B.tree = (x, z, kind, s) => {
      s = s || 1; const [wx, wz] = B.toWorld(x, z), y = CK.heightAt(wx, wz); kind = kind || 'bare';
      B.Bt.setFrame(null);
      if (kind === 'pine') {
        let px = wx, pz = wz, py = y; const lean = rr(0, 6.28), segs = 3;
        for (let i = 0; i < segs; i++) { const L = 1.6 * s, tilt = (i + 1) * 0.12, nx = px + Math.sin(lean) * Math.sin(tilt) * L, nz = pz + Math.cos(lean) * Math.sin(tilt) * L, ny = py + Math.cos(tilt) * L; P(g.cyl8, M('barkD'), (px + nx) / 2, (py + ny) / 2, (pz + nz) / 2, 0.32 * s * (1 - i * 0.18), L * 1.02, 0.32 * s * (1 - i * 0.18), tilt * Math.cos(lean), 0, -tilt * Math.sin(lean)); px = nx; pz = nz; py = ny; }
        const pads = 4 + Math.floor(rnd() * 3); for (let i = 0; i < pads; i++) { const a = rr(0, 6.28), r = rr(0.6, 2.2) * s, hy = py - rr(0, 2.2) * s + i * 0.25 * s; P(g.ico, M('leafPine'), px + Math.sin(a) * r, hy, pz + Math.cos(a) * r, rr(2.0, 3.0) * s, rr(0.7, 1.0) * s, rr(2.0, 3.0) * s, 0, a, 0); }
        P(g.ico, M('leafPine'), px, py + 0.3 * s, pz, 2.2 * s, 0.9 * s, 2.2 * s);
      } else if (kind === 'cedar') {
        P(g.cyl8, M('bark'), wx, y + 3 * s, wz, 0.45 * s, 6 * s, 0.45 * s);
        for (let i = 0; i < 5; i++) P(g.cone8, M('leafCedar'), wx, y + (3.2 + i * 1.7) * s, wz, (3.6 - i * 0.55) * s, 3.2 * s, (3.6 - i * 0.55) * s, 0, i * 0.7, 0);
      } else if (kind === 'round') {
        P(g.cyl8, M('bark'), wx, y + 1.3 * s, wz, 0.34 * s, 2.6 * s, 0.34 * s);
        for (let i = 0; i < 6; i++) { const a = i * 1.1 + rr(0, 0.6), r = i ? rr(0.8, 1.5) * s : 0; P(g.ico, M('leafGreen'), wx + Math.sin(a) * r, y + (3.2 + rr(-0.3, 0.9)) * s, wz + Math.cos(a) * r, rr(2.0, 2.8) * s, rr(1.7, 2.3) * s, rr(2.0, 2.8) * s, 0, a, 0); }
      } else if (kind === 'shrub') {
        P(g.ico, M('hedge'), wx, y + 0.45 * s, wz, 1.4 * s, 0.95 * s, 1.4 * s);
      } else if (kind === 'bamboo') {
        for (let i = 0; i < 7; i++) { const a = rr(0, 6.28), r = rr(0, 0.9) * s, hh = rr(5, 8) * s; P(g.cyl8, M('green'), wx + Math.sin(a) * r, y + hh / 2, wz + Math.cos(a) * r, 0.1, hh, 0.1, rr(-0.05, 0.05), 0, rr(-0.05, 0.05)); P(g.ico, M('leafGreen'), wx + Math.sin(a) * r, y + hh, wz + Math.cos(a) * r, 1.2, 1.6, 1.2); }
      } else {
        // 落葉樹（冬天）：主幹＋三層的枝
        const th = 0.36 * s; P(g.cyl8, M('bark'), wx, y + 1.3 * s, wz, th, 2.6 * s, th);
        const n = 4; for (let i = 0; i < n; i++) branch(wx, y + 2.5 * s, wz, 1.9 * s, th * 0.6, i / n * 6.28 + rr(0, 1), rr(0.35, 0.6), 2, M('bark'));
      }
      if (kind !== 'shrub') R.addBox(wx - 0.3 * s, wx + 0.3 * s, wz - 0.3 * s, wz + 0.3 * s, 'tree');
      if (B._fr) B.Bt.setFrame(B._fr.x, B._fr.z, B._fr.a);
    };
    // 樹的 frame 處理：B.tree 會清掉框，蓋完要還原（呼叫前記住）
    const tree0 = B.tree; B.tree = (...a) => { B._fr = B.Bt.getFrame(); tree0(...a); B._fr = null; };
    B.trees = (rect, n, kind, s, avoid) => { for (let i = 0; i < n; i++) { const x = rr(rect[0], rect[2]), z = rr(rect[1], rect[3]); if (avoid && avoid(x, z)) continue; B.tree(x, z, typeof kind === 'function' ? kind() : kind, s ? s * rr(0.8, 1.2) : rr(0.85, 1.2)); } };

    // ---- 街上的東西 ----
    B.lamp = (x, z, ry, o) => { o = o || {}; P(g.cyl8, M('steelD'), x, 2.6, z, 0.16, 5.2, 0.16); const ax = x + Math.sin(ry || 0) * 0.8, az = z + Math.cos(ry || 0) * 0.8; P(g.box, M('steelD'), (x + ax) / 2, 5.15, (z + az) / 2, 0.08, 0.08, 1.6, 0, ry || 0, 0); P(g.box, M('lamp'), ax, 5.0, az, 0.5, 0.12, 0.8, 0, ry || 0, 0); P(g.box, M('steelD'), ax, 5.12, az, 0.56, 0.12, 0.86, 0, ry || 0, 0); B.lampAt(ax, az); B.solid(x - 0.15, z - 0.15, x + 0.15, z + 0.15, 'deco'); void o; };
    B.lampRow = (x0, z0, x1, z1, step, ry) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.floor(L / step)); for (let i = 0; i <= n; i++) B.lamp(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, ry); };
    // 石燈籠
    B.lantern = (x, z, s, ry) => { s = s || 1; P(g.frustum, M('ashlar'), x, 0.25 * s, z, 0.9 * s, 0.5 * s, 0.9 * s); P(g.cyl8, M('ashlar'), x, 0.95 * s, z, 0.3 * s, 0.9 * s, 0.3 * s); P(g.box, M('ashlar'), x, 1.45 * s, z, 0.75 * s, 0.14 * s, 0.75 * s, 0, ry || 0, 0); P(g.box, M('lamp'), x, 1.75 * s, z, 0.42 * s, 0.46 * s, 0.42 * s, 0, ry || 0, 0); P(g.cone8, M('ashlar'), x, 2.2 * s, z, 1.0 * s, 0.45 * s, 1.0 * s, 0, Math.PI / 8 + (ry || 0), 0); P(g.sph, M('ashlar'), x, 2.5 * s, z, 0.18 * s, 0.22 * s, 0.18 * s); B.lampAt(x, z); B.solid(x - 0.45 * s, z - 0.45 * s, x + 0.45 * s, z + 0.45 * s, 'deco'); };
    // 自動販賣機（面向 ry）
    B.vend = (x, z, ry, col) => { const c = col || pk(['#C83A3A', '#2E5A9A', '#E8E4DC', '#3A7A4A']); P(g.box, M('paint', { col: c }), x, 0.92, z, 0.95, 1.84, 0.8, 0, ry, 0); const fx = x + Math.sin(ry) * 0.41, fz = z + Math.cos(ry) * 0.41; P(g.box, M('shopLit'), fx, 1.25, fz, 0.78, 0.8, 0.02, 0, ry, 0); P(g.box, M('black'), fx, 0.5, fz, 0.6, 0.18, 0.03, 0, ry, 0); const [wx, wz] = B.toWorld(x, z); void wx; void wz; B.solid(x - 0.5, z - 0.45, x + 0.5, z + 0.45, 'deco'); return B.inter(x + Math.sin(ry) * 1.0, z + Math.cos(ry) * 1.0, 1.3, '自動販賣機（熱飲 2 費拉）', () => { const s = S(); if (s.gold < 2) { R.toast('錢不夠。'); return; } s.gold -= 2; R.save(); R.sfx && R.sfx('coin'); R.toast(pk(city.vendLines || ['罐裝熱咖啡。手暖起來了。', '熱的玉米濃湯。最後幾顆玉米粒倒不出來。', '熱的麥茶。']), '#C8B88A'); }); };
    B.bench = (x, z, ry) => { P(g.box, M('wood'), x, 0.45, z, 1.8, 0.07, 0.45, 0, ry, 0); P(g.box, M('wood'), x - Math.cos(ry) * 0 + Math.sin(ry) * -0.2, 0.75, z + Math.cos(ry) * -0.2, 1.8, 0.4, 0.05, 0, ry, 0); [-0.75, 0.75].forEach(k => P(g.box, M('steelD'), x + Math.cos(ry) * k, 0.22, z - Math.sin(ry) * k, 0.06, 0.45, 0.45, 0, ry, 0)); B.solid(x - 0.5, z - 0.5, x + 0.5, z + 0.5, 'deco'); };
    B.bollard = (x, z) => { P(g.cyl8, M('steelD'), x, 0.45, z, 0.18, 0.9, 0.18); };
    B.hedge = (x0, z0, x1, z1, h) => { const hh = h || 0.9; P(g.box, M('hedge'), (x0 + x1) / 2, hh / 2, (z0 + z1) / 2, Math.abs(x1 - x0), hh, Math.abs(z1 - z0)); B.solid(x0, z0, x1, z1, 'deco'); };
    B.fence = (x0, z0, x1, z1, h, mat) => { const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0); P(g.box, M(mat || 'steelD'), (x0 + x1) / 2, (h || 1.1) - 0.05, (z0 + z1) / 2, 0.05, 0.06, L, 0, a, 0); P(g.box, M(mat || 'steelD'), (x0 + x1) / 2, (h || 1.1) * 0.45, (z0 + z1) / 2, 0.04, 0.05, L, 0, a, 0); for (let t = 0; t <= L; t += 1.5) P(g.box, M(mat || 'steelD'), x0 + (x1 - x0) * t / L, (h || 1.1) / 2, z0 + (z1 - z0) * t / L, 0.06, h || 1.1, 0.06); };
    // 電線桿＋電線（pts：一串點）
    B.poles = (pts, o) => {
      o = o || {}; const H = 8.5; let prev = null;
      pts.forEach((p, i) => {
        const [x, z] = p; P(g.cyl8, M('concD'), x, H / 2, z, 0.3, H, 0.3); P(g.box, M('steelD'), x, H - 0.6, z, 1.8, 0.1, 0.1, 0, o.ry || 0, 0); P(g.cyl8, M('steelD'), x + 0.3, H - 1.6, z, 0.5, 0.7, 0.5);
        B.solid(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 'deco');
        if (prev) [-0.75, 0, 0.75].forEach(k => { const ox = Math.cos(o.ry || 0) * k, oz = -Math.sin(o.ry || 0) * k, ax = prev[0] + ox, az = prev[1] + oz, bx = x + ox, bz = z + oz, L = Math.hypot(bx - ax, bz - az), a = Math.atan2(bx - ax, bz - az), sag = L * 0.025; [[0, 0.5], [0.5, 1]].forEach(([t0, t1]) => { const y0 = H - 0.55 - sag * Math.sin(Math.PI * t0), y1 = H - 0.55 - sag * Math.sin(Math.PI * t1), pitch = Math.atan2(y1 - y0, L / 2); P(g.box, M('black'), ax + (bx - ax) * (t0 + t1) / 2, (y0 + y1) / 2, az + (bz - az) * (t0 + t1) / 2, 0.025, 0.025, L / 2 + 0.05, -pitch, a, 0); }); });
        prev = p; void i;
      });
    };
    // 鳥居（ry：面向）
    B.torii = (x, z, ry, w, h, mat) => {
      w = w || 4; h = h || 4.6; const m = M(mat || 'verm'), ca = Math.cos(ry), sa = Math.sin(ry);
      [-1, 1].forEach(sd => { const px = x + ca * sd * w / 2, pz = z - sa * sd * w / 2; P(g.cyl, m, px, h / 2, pz, 0.36 * w / 4, h, 0.36 * w / 4); P(g.cyl, M('black'), px, 0.25, pz, 0.46 * w / 4, 0.5, 0.46 * w / 4); B.solid(px - 0.25, pz - 0.25, px + 0.25, pz + 0.25, 'deco'); });
      P(g.box, m, x, h * 0.78, z, w + 0.5, 0.26, 0.22, 0, ry, 0);                   // 貫
      P(g.box, m, x, h + 0.05, z, w + 1.6, 0.32, 0.42, 0, ry, 0);                    // 島木
      P(g.box, M('black'), x, h + 0.32, z, w + 2.0, 0.26, 0.5, 0, ry, 0);            // 笠木
      [-1, 1].forEach(sd => P(g.box, M('black'), x + ca * sd * (w / 2 + 0.95), h + 0.42, z - sa * sd * (w / 2 + 0.95), 0.5, 0.2, 0.5, 0, ry, sd * 0.18));   // 兩端往上翹
      P(g.box, m, x, (h * 0.78 + h) / 2 + 0.05, z, 0.25, h * 0.2, 0.2, 0, ry, 0);   // 額束
    };
    // 旗子（會飄）：x、z、桿高、顏色
    B.flag = (x, z, hgt, col, o) => {
      o = o || {}; P(g.cyl8, M('metal'), x, hgt / 2, z, 0.08, hgt, 0.08); B.solid(x - 0.1, z - 0.1, x + 0.1, z + 0.1, 'deco');
      const [wx, wz] = B.toWorld(x, z), geo = new TH.PlaneGeometry(1.8, 1.1, 10, 1), m = o.mat || CK.mat('flag|' + col, { tex: 'paint', col, side: 1, rough: 0.9 }), mesh = new TH.Mesh(geo, m);
      mesh.position.set(wx + 0.95, hgt - 0.6, wz); mesh.castShadow = true; B.group.add(mesh);
      const base = geo.attributes.position.array.slice(), ph = rnd() * 6;
      tw.anim.push((dt, t, Pl) => { if (Math.abs(Pl.x - wx) + Math.abs(Pl.z - wz) > 80) return; const a = geo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const u = (base[i] + 0.9) / 1.8; a[i + 2] = Math.sin(t * 4 + u * 5 + ph) * 0.18 * u; } geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); });
      return mesh;
    };
    B.busStop = (x, z, ry, name) => { P(g.box, M('metal'), x, 2.5, z, 3.2, 0.08, 1.4, 0, ry, 0); [-1.4, 1.4].forEach(k => P(g.box, M('metal'), x + Math.cos(ry) * k, 1.25, z - Math.sin(ry) * k, 0.08, 2.5, 0.08, 0, ry, 0)); P(g.box, M('glassL'), x - Math.sin(ry) * 0.6, 1.4, z - Math.cos(ry) * 0.6, 3.0, 1.8, 0.04, 0, ry, 0); B.bench(x, z - 0.2, ry); if (name) B.blade(name, x + Math.cos(ry) * 1.9, 2.3, z - Math.sin(ry) * 1.9, ry, { vert: 0, bg: '#1A3A6A', fg: '#FFFFFF', size: 0.32 }); };
    B.mailbox = (x, z) => { P(g.cyl, M('red'), x, 0.65, z, 0.45, 1.1, 0.45); P(g.hemi, M('red'), x, 1.2, z, 0.45, 0.25, 0.45); B.solid(x - 0.25, z - 0.25, x + 0.25, z + 0.25, 'deco'); };
    B.manhole = (x, z) => { P(g.cyl24, M('steelD'), x, 0.015, z, 0.7, 0.02, 0.7); };

    // 這些小東西照放的位置的地面高度抬高（台地、石階、人行道上）
    const onGround = name => { const f = B[name]; B[name] = (x, z, ...a) => { const [wx, wz] = B.toWorld(x, z), y0 = B.Bt.yOff; B.Bt.yOff = y0 + CK.heightAt(wx, wz); try { return f(x, z, ...a); } finally { B.Bt.yOff = y0; } }; };
    ['lamp', 'lantern', 'vend', 'bench', 'bollard', 'torii', 'busStop', 'mailbox', 'manhole'].forEach(onGround);
    // ---- 走不到的外圍：一圈簡單的房子、公寓、樹（城不會停在一片空地上） ----
    // o：{ band（往外幾公尺）、cell（一格幾公尺）、skip(x, z)、tall（公寓的比例） }
    B.outskirts = o => {
      o = o || {}; const wk = city.walk, band = o.band || 150, cell = o.cell || 22, q = v => Math.max(6, Math.round(v / 2) * 2);
      const wet = (x, z) => D.water.some(w => CK.util.pip(x, z, w.poly)), onRoad = r => D.roads.some(rd => CK.util.overlap(r, [rd.r[0] - 4, rd.r[1] - 4, rd.r[2] + 4, rd.r[3] + 4]));
      for (let x = wk[0] - band; x < wk[2] + band; x += cell) for (let z = wk[1] - band; z < wk[3] + band; z += cell) {
        if (x > wk[0] - 10 && x < wk[2] + 10 - cell && z > wk[1] - 10 && z < wk[3] + 10 - cell) continue;
        if (rnd() < 0.18) { B.tree(x + rr(2, cell - 2), z + rr(2, cell - 2), rnd() < 0.5 ? 'round' : 'bare', rr(1, 1.4)); continue; }
        const tall = rnd() < (o.tall || 0.2), w = q(rr(8, tall ? 18 : 13)), d = q(rr(8, tall ? 14 : 12)), x0 = x + rr(1, cell - w - 1), z0 = z + rr(1, cell - d - 1), r = [x0, z0, x0 + w, z0 + d];
        if (o.skip && o.skip((r[0] + r[2]) / 2, (r[1] + r[3]) / 2)) continue;
        if (wet(r[0], r[1]) || wet(r[2], r[3]) || wet(r[0], r[3]) || wet(r[2], r[1]) || onRoad(r)) continue;
        const h = tall ? 3 * Math.round(rr(4, 7)) : rnd() < 0.5 ? 6 : 8.5, st = tall ? pk(['apt', 'office']) : 'house', col = pk(FAC_COL[st]);
        BOX(facMat(st, col), r[0], 0, r[1], r[2], h, r[3]);
        if (tall) BOX(M('roofG'), r[0], h, r[1], r[2], h + 0.5, r[3]);
        else B.roof((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, Math.max(w, d), Math.min(w, d), { type: rnd() < 0.5 ? 'gable' : 'hip', y: h, ry: w >= d ? 0 : Math.PI / 2, h: Math.min(w, d) * 0.3, o: 0.5, mat: rnd() < 0.7 ? 'kawara' : 'corr', sori: 0.04 });
      }
    };
    // ---- 人 ----
    const TOPS = ['#2E2E38', '#3A3A48', '#4A3A5A', '#7A5A6A', '#8A3A2E', '#2E4A6A', '#5A6A4A', '#C8A040', '#E8E4DC', '#6A5A3A', '#3A5A4A', '#5A2A2A'], HAIRS = ['#1A1410', '#2A2420', '#4A3424', '#6A4A2E', '#8A8A88', '#C8C0B0'], HS = ['short', 'long', 'ponytail', 'bun', 'bob', 'crop', 'spiky'];
    let pv = 0;
    B.person = (x, z, rot, o) => {
      o = o || {}; const v = pv++ % 24, top = o.top || TOPS[v % TOPS.length];
      const h = R.makeHero('warrior', null, { pool: 'ck_' + (o.pool || '') + v, lite: 1, top, hair: o.hair || HAIRS[(v * 5) % HAIRS.length], cloak: o.cloak || TOPS[(v * 7 + 3) % TOPS.length], hs: HS[(v * 3) % HS.length], acc: o.acc || null, accCol: '#C8A040', weapon: null, shield: false });
      const [wx, wz] = B.toWorld(x, z); h.g.position.set(wx, CK.heightAt(wx, wz), wz); h.g.rotation.y = (rot || 0) + B.yaw(); B.group.add(h.g);
      const n = Object.assign({ h, x: wx, z: wz, rot: (rot || 0) + B.yaw() }, o.extra || {}); tw.npcs.push(n); return n;
    };
    B.talker = (x, z, rot, name, lines, o) => { const n = B.person(x, z, rot, o); n.near = 1; B.solid(x - 0.35, z - 0.35, x + 0.35, z + 0.35, 'npc'); B.inter(x, z, 2, '和' + name + '說話', () => R.townTalk(name, [Array.isArray(lines) ? lines[Math.floor(Math.random() * lines.length)] : lines])); return n; };
  };

  // ---------- 會動的：路人、車、電車 ----------
  const carMats = () => ({ glass: CK.M('glass'), tire: CK.M('rubber'), head: CK.mat('carHead', { col: '#FFF8E8', em: '#FFF4D8', ei: 0, lamp: true, snow: 0 }), tail: CK.mat('carTail', { col: '#8A1A1A', em: '#FF2A1A', ei: 0.6, neon: true, snow: 0 }), chrome: CK.M('metal') });
  const paint = c => CK.mat('carPaint|' + c, { col: c, rough: 0.28, metal: 0.55, env: 1.2, snow: 0.8 });
  CK.makeCar = (col, kind) => {
    const TH = T(), g = CK.geo(), grp = new TH.Group(), m = carMats(), body = paint(col), add = (geo, mat, x, y, z, sx, sy, sz, rx) => { const o = new TH.Mesh(geo, mat); o.position.set(x, y, z); o.scale.set(sx, sy, sz); if (rx) o.rotation.x = rx; o.castShadow = true; grp.add(o); return o; };
    if (kind === 'truck') {
      add(g.box, body, 0, 1.0, -1.5, 1.95, 1.5, 1.6); add(g.box, m.glass, 0, 1.35, -2.31, 1.8, 0.7, 0.04); add(g.box, CK.M('white'), 0, 1.45, 0.9, 2.1, 2.2, 3.6); add(g.box, m.chrome, 0, 0.42, 0, 2.0, 0.2, 5.0);
    } else if (kind === 'taxi' || kind === 'car' || !kind) {
      add(g.box, body, 0, 0.62, 0, 1.72, 0.55, 4.3); add(g.box, body, 0, 1.08, 0.15, 1.6, 0.45, 2.2); add(g.box, m.glass, 0, 1.1, -0.98, 1.5, 0.4, 0.08, -0.5); add(g.box, m.glass, 0, 1.1, 1.28, 1.5, 0.38, 0.08, 0.5); add(g.box, m.glass, 0.81, 1.1, 0.15, 0.02, 0.36, 1.9); add(g.box, m.glass, -0.81, 1.1, 0.15, 0.02, 0.36, 1.9);
      add(g.box, m.chrome, 0, 0.42, -2.16, 1.74, 0.16, 0.08); add(g.box, m.chrome, 0, 0.42, 2.16, 1.74, 0.16, 0.08);
      if (kind === 'taxi') { add(g.box, CK.mat('taxiSign', { col: '#FFD84A', em: '#FFC830', ei: 0.4, neon: true }), 0, 1.4, 0.1, 0.5, 0.2, 0.3); }
    }
    [[-0.78, -1.4], [0.78, -1.4], [-0.78, 1.4], [0.78, 1.4]].forEach(([x, z]) => add(g.cyl, m.tire, x, 0.33, z, 0.66, 0.24, 0.66).rotation.z = Math.PI / 2);
    [[-0.6, -2.18], [0.6, -2.18]].forEach(([x, z]) => add(g.box, m.head, x, 0.7, z, 0.36, 0.14, 0.04));
    [[-0.65, 2.18], [0.65, 2.18]].forEach(([x, z]) => add(g.box, m.tail, x, 0.72, z, 0.3, 0.14, 0.04));
    grp.userData.kind = kind || 'car';   // 搶車的時候看（ckmove.js）
    return grp;
  };
  CK.makeTrain = (col, n, o) => {
    o = o || {}; const TH = T(), g = CK.geo(), cars = [], body = paint(col || '#E8E4DC'), stripe = paint(o.stripe || '#2E5A9A');
    for (let k = 0; k < (n || 4); k++) {
      const grp = new TH.Group(), add = (geo, mat, x, y, z, sx, sy, sz) => { const ob = new TH.Mesh(geo, mat); ob.position.set(x, y, z); ob.scale.set(sx, sy, sz); ob.castShadow = true; grp.add(ob); return ob; };
      add(g.box, body, 0, 1.75, 0, 2.9, 2.9, 17.6); add(g.box, stripe, 0, 1.0, 0, 2.94, 0.35, 17.62); add(g.box, CK.M('glass'), 0, 2.15, 0, 2.95, 0.9, 16); add(g.box, CK.mat('trainWin', { col: '#FFF0D0', em: '#FFE8C0', ei: 0, lamp: true }), 0, 2.15, 0, 2.92, 0.85, 15.9);
      add(g.box, CK.M('steelD'), 0, 3.3, 0, 2.6, 0.3, 17); add(g.box, CK.M('black'), 0, 0.35, 0, 2.4, 0.5, 15);
      if (k === 0) { add(g.box, CK.M('glass'), 0, 2.3, -8.82, 2.5, 1.0, 0.06); add(g.box, CK.mat('carHead', {}), 0, 1.3, -8.82, 1.6, 0.2, 0.05); }
      cars.push(grp);
    }
    return cars;
  };
  // 一條折線上的位置（loop：繞圈；不是就來回）
  const along = (pts, acc, L, s, loop) => {
    if (loop) s = ((s % L) + L) % L; else { const p = ((s % (2 * L)) + 2 * L) % (2 * L); s = p > L ? 2 * L - p : p; }
    let i = 0; while (i < acc.length - 2 && acc[i + 1] <= s) i++;
    const a = pts[i % pts.length], b = pts[(i + 1) % pts.length], seg = acc[i + 1] - acc[i] || 1, t = (s - acc[i]) / seg;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[0] - a[0], b[1] - a[1])];
  };
  const accOf = (pts, loop) => { const acc = [0]; let L = 0; const n = loop ? pts.length : pts.length - 1; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); acc.push(L); } return { acc, L }; };
  CK.along = along; CK.accOf = accOf;
  CK.spawnLife = B => {
    const tw = W.town, D = B.D, TH = T();
    tw.walkers = []; tw.routes = [];
    // 路人：沿著折線來回走
    D.walks.forEach(wk => {
      const { acc, L } = accOf(wk.pts, false); if (L < 2) return;
      for (let k = 0; k < wk.n; k++) { const n = B.person(wk.pts[0][0], wk.pts[0][1], 0, { extra: { walk: 1 } }); n.path = wk.pts; n.acc = acc; n.L = L; n.s = B.rnd() * L * 2; n.sp = B.rr(1.2, 1.9); n.lane = B.rr(-0.6, 0.6); /* 走在路線的左右（n.off 是「別的檔案接手了、不要動」） */ tw.walkers.push(n); }
    });
    // 車
    const CC = B.city.carCols || ['#E8E4DC', '#2A2A30', '#8A2A24', '#3A5A8A', '#C8C0B0', '#5A6A4A', '#B8BCC2', '#1E3A2A'];
    D.routes.forEach((rt, ri) => {
      const { acc, L } = accOf(rt.pts, true); tw.routes.push({ pts: rt.pts, acc, L });
      for (let k = 0; k < rt.n; k++) { const kind = rt.o.kinds ? B.pk(rt.o.kinds) : B.rnd() < 0.15 ? 'truck' : B.rnd() < 0.2 ? 'taxi' : 'car', col = kind === 'taxi' ? '#E8C040' : B.pk(CC), g = CK.makeCar(col, kind); B.group.add(g); tw.cars.push({ g, route: ri, s: L * k / rt.n + B.rr(0, 8), v: 0, vmax: rt.o.v || 8 }); }
    });
    // 電車
    D.rails.forEach(rl => {
      const loop = !!rl.loop, { acc, L } = accOf(rl.pts, loop), cars = CK.makeTrain(rl.col, rl.cars || 4, rl);
      cars.forEach(c => B.group.add(c)); tw.trains.push({ pts: rl.pts, acc, L, loop, cars, s: B.rr(0, L), v: rl.v || 12, y: rl.y || 0 });
      // 軌道（地面上的）
      if (!rl.noTrack) for (let i = 0; i < rl.pts.length - (loop ? 0 : 1); i++) { const a = rl.pts[i], b = rl.pts[(i + 1) % rl.pts.length], Ln = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[0] - a[0], b[1] - a[1]), cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2; B.part(B.g.box, CK.M('ballast'), cx, (rl.y || 0) + 0.12, cz, 3.4, 0.24, Ln, 0, ang, 0); [-0.72, 0.72].forEach(o => B.part(B.g.box, CK.M('rail'), cx + Math.cos(ang) * o, (rl.y || 0) + 0.3, cz - Math.sin(ang) * o, 0.08, 0.14, Ln, 0, ang, 0)); for (let t = 0.3; t < Ln; t += 0.65) B.part(B.g.box, CK.M('sleeper'), a[0] + (b[0] - a[0]) * t / Ln, (rl.y || 0) + 0.24, a[1] + (b[1] - a[1]) * t / Ln, 2.4, 0.12, 0.24, 0, ang, 0); }
    });
    void TH;
    B.Bt.flush(B.group);   // 軌道
  };
  CK.stepLife = (dt, tw, P) => {
    // 路人
    tw.npcs.forEach(n => {
      if (n.walk || n.guard || n.off) return;   // 衛兵（ckcrime.js 自己動）
      if (n.near) { const d = Math.hypot(P.x - n.x, P.z - n.z); n.h.g.rotation.y = d < 3.5 ? Math.atan2(P.x - n.x, P.z - n.z) : n.rot; }
      if (Math.abs(n.x - P.x) + Math.abs(n.z - P.z) < 70) R.animHero(n.h, 0, dt, false);
    });
    (tw.walkers || []).forEach(n => {
      if (n.off || n.flee > 0 || n.back) return;   // 嚇跑中、走回路上（ckcrime.js 自己動）
      const far = Math.abs(n.x - P.x) + Math.abs(n.z - P.z) > 90;
      const [x, z, ang] = along(n.path, n.acc, n.L, n.s, false), dir = (((n.s % (2 * n.L)) + 2 * n.L) % (2 * n.L)) > n.L ? -1 : 1;
      const blocked = !far && Math.hypot(P.x - n.x, P.z - n.z) < 1.1 && ((P.x - n.x) * Math.sin(ang) + (P.z - n.z) * Math.cos(ang)) * dir > 0;
      if (!blocked) n.s += n.sp * dt;
      const ox = Math.cos(ang) * n.lane * dir, oz = -Math.sin(ang) * n.lane * dir;
      n.x = x + ox; n.z = z + oz; n.h.g.visible = !far;
      if (far) return;
      n.h.g.position.set(n.x, CK.heightAt(n.x, n.z), n.z); n.h.g.rotation.y = dir > 0 ? ang : ang + Math.PI; R.animHero(n.h, blocked ? 0 : n.sp, dt, false);
    });
    // 車：前面有人或車就停
    tw.cars.forEach(c => {
      const rt = tw.routes[c.route]; if (!rt) return;
      const [x, z, ang] = along(rt.pts, rt.acc, rt.L, c.s, true), ux = Math.sin(ang), uz = Math.cos(ang);
      // 前面有人、同方向的車就停；交叉的車：編號小的先走（不會兩台互相卡死）
      const ahead = (ox, oz, far, wide) => { const al = ox * ux + oz * uz, sd = Math.abs(ox * uz - oz * ux); return al > 0.5 && al < far && sd < wide; };
      let stop = ahead(P.x - x, P.z - z, 7, 1.9);
      if (!stop) tw.cars.forEach((o, k) => { if (stop || o === c || o.x == null) return; const same = Math.sin(o.ang) * ux + Math.cos(o.ang) * uz; if (same > 0.6) stop = ahead(o.x - x, o.z - z, 8.5, 1.9); else if (k < tw.cars.indexOf(c)) stop = ahead(o.x - x, o.z - z, 6.5, 2.6); });
      c.v = Math.max(0, Math.min(c.vmax, c.v + (stop ? -18 : 4) * dt)); c.s += c.v * dt; c.x = x; c.z = z; c.ang = ang;
      c.g.position.set(x, CK.heightAt(x, z) > 0.3 ? CK.heightAt(x, z) : 0, z); c.g.rotation.y = ang + Math.PI;   // 車頭朝 -z
    });
    // 電車
    tw.trains.forEach(tr => {
      tr.s += tr.v * dt;
      tr.cars.forEach((g, k) => { const f = along(tr.pts, tr.acc, tr.L, tr.s - k * 18.2, tr.loop), b = along(tr.pts, tr.acc, tr.L, tr.s - k * 18.2 - 17, tr.loop); g.position.set((f[0] + b[0]) / 2, tr.y + 0.2, (f[1] + b[1]) / 2); g.rotation.y = Math.atan2(f[0] - b[0], f[1] - b[1]) + Math.PI; });
    });
    // 車燈、電車的窗：晚上亮
    const L = tw.L; if (L && tw.lk !== L.lampK) { tw.lk = L.lampK; const h = CK.mats.carHead; if (h) h.emissiveIntensity = (L.lampK || 0) * 4; const tw2 = CK.mats.trainWin; if (tw2) tw2.emissiveIntensity = 0.4 + (L.lampK || 0) * 2.5; }
  };
})(window.R);
