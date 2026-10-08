// 精緻城市（七）：賽博和式、重工業（吉山，2026-10-08）
// 作者《昭旭重要城市》：吉山＝陪都、第一大工業城；德克斯凡入股後第一個開發——「賽博霓虹底下仍是和式町屋」；高爐夜景、礦場吊橋（晚上亮藍燈）。
// 全部掛在 B 上（CK.extendBuilder 之後再加）：
//   B.neon(x0, y0, z0, x1, y1, z1, col)        霓虹燈條（白天也亮，晚上更亮）
//   B.neonSign(txt, x, y, z, ry, o)            直立的霓虹招牌（兩面有字）
//   B.screen(x, y, z, ry, w, h, o)             大螢幕：o.ads＝幾張輪播的廣告（[字, 底色, 字色]）、o.ticker＝跑馬燈（股票）
//   B.holo(x, y, z, ry, w, h, txt, col)        全像廣告（半透明、會閃）
//   B.tower(o)                                 玻璃摩天樓：o.r、o.h、o.col、o.neon（角的光條、頂上的冠）、o.crown（頂上的字）
//   B.furnace(x, z, o)                         高爐（爐身、熱風爐、管子、出鐵口的橘光、煙）
//   B.chimney(x, z, h, o)                      紅白的煙囪（冒煙）
//   B.smoke(x, y, z, o)                        一團一團往上飄的煙
//   B.viaduct(pts, y, o)                       高架橋（橋面、橋墩、護欄）；電車另外用 B.rail(pts, { y })
//   B.suspension(x0, x1, z, deckY, o)          東西向的吊橋：主塔、主纜、吊索、晚上亮的藍燈（橋面另外用 B.bridge）
//   B.hover(pts, o)                            懸浮車：沿著路線在空中飄
//   B.drone(cx, cz, r, y)                      繞圈的無人機
// 放在 citykit6.js 後面。
(function (R) {
  const CK = R.CK, W = R.W, T = () => THREE; if (!CK) return;
  const NEON = (col, ei) => { const m = CK.mat('neon|' + col + '|' + (ei || 2.4), { col, em: col, ei: ei || 2.4, neon: true, snow: 0 }); m.userData.ei0 = ei || 2.4; return m; };
  CK.neonMat = NEON;
  // 煙的貼圖（共用）
  let SMK = null;
  const smokeTex = () => {
    if (SMK) return SMK;
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.5, 'rgba(235,235,240,0.4)'); gr.addColorStop(1, 'rgba(230,230,236,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    SMK = new (T().CanvasTexture)(c); SMK.userData.shared = true; return SMK;
  };
  // 廣告的畫布：底色漸層、字、幾個裝飾
  const FONT = '"Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif';
  const adCanvas = (txt, bg, fg, vert, sub) => {
    const c = document.createElement('canvas'), W0 = vert ? 128 : 320, H0 = vert ? 320 : 128; c.width = W0; c.height = H0; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, W0, H0); gr.addColorStop(0, bg); gr.addColorStop(1, '#0A0A14'); g.fillStyle = gr; g.fillRect(0, 0, W0, H0);
    g.globalAlpha = 0.25; for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? fg : '#FFFFFF'; g.beginPath(); g.arc(Math.random() * W0, Math.random() * H0, 10 + Math.random() * 40, 0, 7); g.fill(); } g.globalAlpha = 1;
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = fg; g.shadowBlur = 12;
    const ch = [...txt];
    if (vert) { const s = Math.min(78, (H0 - 30) / ch.length); g.font = 'bold ' + Math.round(s * 0.9) + 'px ' + FONT; ch.forEach((t, i) => g.fillText(t, W0 / 2, 18 + s * i + s / 2)); }
    else { const s = Math.min(84, (W0 - 24) / ch.length); g.font = 'bold ' + Math.round(s * 0.92) + 'px ' + FONT; g.fillText(txt, W0 / 2, sub ? H0 * 0.42 : H0 / 2); if (sub) { g.shadowBlur = 0; g.font = '22px ' + FONT; g.fillStyle = '#FFFFFF'; g.fillText(sub, W0 / 2, H0 * 0.8); } }
    return c;
  };
  const tickerCanvas = items => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#05060A'; g.fillRect(0, 0, 1024, 64); g.font = 'bold 34px ' + FONT; g.textBaseline = 'middle';
    let x = 10; items.forEach(([n, v]) => { g.fillStyle = '#FFE8A0'; g.fillText(n, x, 32); x += g.measureText(n).width + 10; const up = v >= 0; g.fillStyle = up ? '#FF4A4A' : '#3AE87A'; const t = (up ? '▲' : '▼') + Math.abs(v).toFixed(2); g.fillText(t, x, 32); x += g.measureText(t).width + 36; });
    return c;
  };
  const tex = c => { const TH = T(), t = new TH.CanvasTexture(c); t.encoding = TH.sRGBEncoding; t.anisotropy = 4; return t; };

  const eb0 = CK.extendBuilder;
  CK.extendBuilder = B => {
    eb0(B);
    const g = B.g, M = CK.M, P = B.part, BOX = B.box, rnd = B.rnd, rr = B.rr, pk = B.pk, TH = B.TH, tw = W.town;
    const anim = f => { if (tw && tw.anim) tw.anim.push(f); };
    // ---------- 霓虹 ----------
    B.neon = (x0, y0, z0, x1, y1, z1, col) => BOX(NEON(col || '#FF3A8A'), x0, y0, z0, x1, y1, z1, { noFac: true });
    B.neonSign = (txt, x, y, z, ry, o) => { o = o || {}; B.blade(txt, x, y, z, ry, { bg: o.bg || '#0A0A12', fg: o.fg || pk(['#FF4A9A', '#4AE8FF', '#FFE24A', '#8AFF6A', '#C86AFF']), neon: 1, size: o.size || 0.7, frame: o.frame }); };
    // ---------- 大螢幕 ----------
    B.screen = (x, y, z, ry, w, h, o) => {
      o = o || {}; const vert = h > w * 1.3, geo = new TH.PlaneGeometry(w, h);
      // 外框
      P(g.box, M('steelD'), x - Math.sin(ry) * 0.18, y, z - Math.cos(ry) * 0.18, w + 0.5, h + 0.5, 0.3, 0, ry, 0);
      let mat;
      if (o.ticker) {
        const t = tex(tickerCanvas(o.ticker)); t.wrapS = TH.RepeatWrapping; t.repeat.set(Math.max(0.15, w / h / 16), 1);
        mat = new TH.MeshBasicMaterial({ map: t, toneMapped: false });
        anim((dt, tt) => { t.offset.x = (tt * (o.speed || 0.04)) % 1; });
      } else {
        const ads = (o.ads || [['德克斯凡', '#2A1A6A', '#4AE8FF']]).map(a => tex(adCanvas(a[0], a[1], a[2], vert, a[3])));
        mat = new TH.MeshBasicMaterial({ map: ads[0], toneMapped: false, color: new TH.Color(o.dim || 0.92, o.dim || 0.92, o.dim || 0.92) });
        if (ads.length > 1) { const k0 = rnd() * 10; anim((dt, tt) => { const i = Math.floor((tt + k0) / (o.every || 6)) % ads.length; if (mat.map !== ads[i]) { mat.map = ads[i]; } }); }
      }
      const m = new TH.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; B.group.add(m);
      if (o.light !== false) B.lampAt(x + Math.sin(ry) * 3, z + Math.cos(ry) * 3);
      return m;
    };
    // ---------- 全像廣告 ----------
    B.holo = (x, y, z, ry, w, h, txt, col) => {
      const t = tex(adCanvas(txt, '#000000', col || '#4AE8FF', h > w * 1.3)), m = new TH.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, blending: TH.AdditiveBlending, depthWrite: false, side: TH.DoubleSide, toneMapped: false });
      const ms = new TH.Mesh(new TH.PlaneGeometry(w, h), m); ms.position.set(x, y, z); ms.rotation.y = ry; B.group.add(ms);
      const k0 = rnd() * 9; anim((dt, tt) => { const gl = Math.sin(tt * 23 + k0) > 0.96 ? 0.15 : 0; m.opacity = 0.42 + 0.12 * Math.sin(tt * 2.3 + k0) - gl; ms.position.y = y + Math.sin(tt * 0.9 + k0) * 0.15; });
      return ms;
    };
    // ---------- 玻璃摩天樓 ----------
    B.tower = o => {
      const [x0, z0, x1, z1] = o.r, H = o.h || 80, col = o.col || pk(['#9AB0C0', '#A8B8C8', '#8AA0B4', '#B8C4CC']), neon = o.neon || pk(['#4AE8FF', '#FF4A9A', '#C86AFF', '#8AFF6A']);
      const segs = o.segs || (H > 70 ? 3 : 2), sb = o.setback || 1.8, wall = CK.facMat('glass', col);
      BOX(M('concD'), x0 - 0.2, 0, z0 - 0.2, x1 + 0.2, 0.5, z1 + 0.2);
      let y = 0, k = 0;
      for (let s = 0; s < segs; s++) {
        const sh = s === segs - 1 ? H - y : Math.round((H / segs) * (s === 0 ? 1.15 : 0.9) / 3.6) * 3.6, a0 = x0 + k, b0 = z0 + k, a1 = x1 - k, b1 = z1 - k;
        BOX(wall, a0, y, b0, a1, y + sh, b1);
        // 角的光條、每段頂的燈帶
        [[a0, b0], [a1, b0], [a0, b1], [a1, b1]].forEach(([px, pz]) => BOX(NEON(neon, 1.8), px - 0.12, y + 0.5, pz - 0.12, px + 0.12, y + sh, pz + 0.12));
        BOX(M('steelD'), a0 - 0.15, y + sh - 0.5, b0 - 0.15, a1 + 0.15, y + sh, b1 + 0.15);
        y += sh; k += sb; if (Math.min(x1 - x0, z1 - z0) - 2 * k < 6) k -= sb;
      }
      // 頂：冠（一圈霓虹）、天線、閃燈
      const a0 = x0 + k, b0 = z0 + k, a1 = x1 - k, b1 = z1 - k, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      BOX(M('steel'), a0 + 1, y, b0 + 1, a1 - 1, y + 3.2, b1 - 1);
      [[a0 + 0.8, b0 + 0.8, a1 - 0.8, b0 + 1.0], [a0 + 0.8, b1 - 1.0, a1 - 0.8, b1 - 0.8], [a0 + 0.8, b0 + 0.8, a0 + 1.0, b1 - 0.8], [a1 - 1.0, b0 + 0.8, a1 - 0.8, b1 - 0.8]].forEach(q => BOX(NEON(neon, 2.2), q[0], y + 2.6, q[1], q[2], y + 3.0, q[3]));
      P(g.cyl8, M('steelD'), cx, y + 3.2 + (o.mast || 10) / 2, cz, 0.35, o.mast || 10, 0.35);
      const bc = new TH.Mesh(g.sph, CK.mat('beacon', { col: '#FF2A1A', em: '#FF2A1A', ei: 3, snow: 0 })); bc.position.set(cx, y + 3.4 + (o.mast || 10), cz); bc.scale.setScalar(0.7); B.group.add(bc); anim((dt, tt) => { bc.visible = Math.sin(tt * 3 + cx) > 0; });
      if (o.crown) { const f = o.face || 's', c = { s: b1 - 1, n: b0 + 1, e: a1 - 1, w: a0 + 1 }[f], al = f === 's' || f === 'n' ? cx : cz; B.sign(o.crown, f, c, al, y + 1.6, { size: Math.min(2.2, ((f === 's' || f === 'n' ? a1 - a0 : b1 - b0) - 3) / [...o.crown].length), bg: '#0A0A14', fg: neon, neon: 1 }); }
      B.solid(x0, z0, x1, z1, 'house'); B.foot([x0, z0, x1, z1], 'glass', y + 3.2);
      // 一樓：亮著的大廳
      const f = o.face || 's', fz = { s: z1, n: z0 }[f], fx = { e: x1, w: x0 }[f];
      if (fz != null) BOX(M('shopLit'), x0 + 1, 0.5, Math.min(fz, fz + (f === 's' ? 0.06 : -0.06)), x1 - 1, 4.2, Math.max(fz, fz + (f === 's' ? 0.06 : -0.06)));
      if (fx != null) BOX(M('shopLit'), Math.min(fx, fx + (f === 'e' ? 0.06 : -0.06)), 0.5, z0 + 1, Math.max(fx, fx + (f === 'e' ? 0.06 : -0.06)), 4.2, z1 - 1);
      return { r: o.r, h: y + 3.2 };
    };
    // ---------- 煙 ----------
    B.smoke = (x, y, z, o) => {
      o = o || {}; const n = o.n || 6, puffs = [], col = o.col || '#C8C8CC', s0 = o.s || 6, rise = o.rise || 40, drift = o.drift || 12, per = o.per || 14;
      for (let i = 0; i < n; i++) { const sp = new TH.Sprite(new TH.SpriteMaterial({ map: smokeTex(), color: col, transparent: true, depthWrite: false, opacity: 0.5 })); sp.userData.k = i / n; B.group.add(sp); puffs.push(sp); }
      const c0 = new TH.Color(col), ce = new TH.Color('#FF8A4A');
      anim((dt, t) => { if (o.ember) { const nk = Math.min(1, ((W.town && W.town.L && W.town.L.lampK) || 0)); puffs.forEach(sp => sp.material.color.copy(c0).lerp(ce, nk * 0.75)); } puffs.forEach(sp => { const k = ((t / per + sp.userData.k) % 1), s = s0 * (1 + k * 3); sp.position.set(x + k * drift, y + k * rise, z + k * drift * 0.3); sp.scale.set(s, s, 1); sp.material.opacity = (o.op || 0.5) * Math.sin(Math.min(1, k * 5) * Math.PI / 2) * (1 - k); }); });
    };
    // ---------- 煙囪 ----------
    B.chimney = (x, z, h, o) => {
      o = o || {}; const r0 = o.r || 2.2, n = Math.max(3, Math.round(h / 6));
      P(g.cyl24, M('concD'), x, 1.5, z, r0 * 2.8, 3, r0 * 2.8);
      for (let i = 0; i < n; i++) { const y0 = 3 + (h - 3) * i / n, hh = (h - 3) / n, r = r0 * (1 - 0.25 * (i / n)); P(g.cyl24, M(i % 2 ? 'white' : 'red'), x, y0 + hh / 2, z, r * 2, hh, r * 2); }
      P(g.torus, M('black'), x, h, z, r0 * 1.6, r0 * 1.6, r0 * 1.6, Math.PI / 2, 0, 0);
      const lamp = CK.mat('chimneyRed', { col: '#FF3A2A', em: '#FF2A1A', ei: 2.5, neon: true, snow: 0 }); lamp.userData.ei0 = 2.5;
      [0, 2.1, 4.2].forEach(a => P(g.sph, lamp, x + Math.sin(a) * r0 * 0.8, h - 1, z + Math.cos(a) * r0 * 0.8, 0.4, 0.4, 0.4));
      B.solid(x - r0 * 1.4, z - r0 * 1.4, x + r0 * 1.4, z + r0 * 1.4, 'house');
      if (o.smoke !== false) B.smoke(x, h + 2, z, { s: r0 * 2.6, rise: 60, drift: 20, n: 7, col: o.smokeCol || '#B8B8BE', per: 16 });
    };
    // ---------- 高爐 ----------
    B.furnace = (x, z, o) => {
      o = o || {}; const H = o.h || 46, glow = CK.mat('furnaceGlow', { col: '#FFB060', em: '#FF7A1A', ei: 3, neon: true, snow: 0 }); glow.userData.ei0 = 3;
      // 爐身：下粗上細，幾圈平台
      P(g.cyl24, M('concD'), x, 2, z, 22, 4, 22);
      [[16, 12, 4], [14, 12, 16], [11, 10, 28], [8, H - 38, 38]].forEach(([d, hh, y0]) => P(g.cyl24, M('steel'), x, y0 + hh / 2, z, d, hh, d));
      P(g.cone, M('steelD'), x, H + 2, z, 8.4, 4, 8.4);
      [12, 22, 32].forEach(y => { P(g.torus, M('steelD'), x, y, z, 10 + (32 - y) * 0.25, 10 + (32 - y) * 0.25, 10 + (32 - y) * 0.25, Math.PI / 2, 0, 0); P(g.cyl24, M('steelD'), x, y - 0.1, z, 9 + (32 - y) * 0.25, 0.25, 9 + (32 - y) * 0.25); });
      // 上面的管子（往外彎下來）
      [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(a => { const px = x + Math.sin(a) * 3, pz = z + Math.cos(a) * 3; P(g.cyl8, M('steel'), px, H + 6, pz, 1.2, 10, 1.2); P(g.cyl8, M('steel'), px + Math.sin(a) * 4, H + 10.5, pz + Math.cos(a) * 4, 1.1, 8.5, 1.1, Math.cos(a) * 1.57, 0, -Math.sin(a) * 1.57); });
      P(g.cyl8, M('steel'), x + 9, (H + 10) / 2, z + 9, 1.8, H + 10, 1.8);
      // 熱風爐（旁邊一排高的圓柱、圓頂）
      for (let i = 0; i < 3; i++) { const sx = x - 16, sz = z - 9 + i * 9; P(g.cyl24, M('steel'), sx, 17, sz, 7, 34, 7); P(g.hemi, M('steel'), sx, 34, sz, 7, 4, 7); P(g.cyl8, M('steelD'), (sx + x) / 2, 30, sz, 0.9, 16, 0.9, 0, 0, Math.PI / 2); }
      // 出鐵口：鑄造房的橘光
      BOX(M('corr', { col: '#7A6A60' }), x + 9, 0, z - 8, x + 24, 10, z + 8);
      BOX(glow, x + 9.05, 0.4, z - 3, x + 9.15, 5, z + 3);
      BOX(glow, x + 6, 0.05, z - 1, x + 24, 0.15, z + 1);   // 鐵水的溝
      B.lampAt(x + 7, z); B.lampAt(x + 14, z);
      P(g.torus, glow, x, 5, z, 9, 9, 9, Math.PI / 2, 0, 0);
      // 火光（加法混色的光暈）：白天淡、晚上亮；最上面一大片讓夜空變橘色（作者：「整片天空被燒成橘色，這才是吉山的月亮」）
      const halo = (px, py, pz, sx, sy, col) => { const sp = new TH.Sprite(new TH.SpriteMaterial({ map: smokeTex(), color: col, transparent: true, depthWrite: false, blending: TH.AdditiveBlending, opacity: 0, fog: false })); sp.position.set(px, py, pz); sp.scale.set(sx, sy, 1); B.group.add(sp); return sp; };
      const h1 = halo(x + 10, 6, z, 36, 22, '#FF7A2A'), h2 = halo(x, H * 0.55, z, 70, 70, '#FF6A1A'), h3 = halo(x, H + 50, z, 340, 210, '#FF5A10');
      anim((dt, t) => { const nk = Math.min(1, ((W.town && W.town.L && W.town.L.lampK) || 0)), fl = 0.88 + 0.12 * Math.sin(t * 3.1 + x) * Math.sin(t * 1.7); h1.material.opacity = (0.2 + 0.6 * nk) * fl; h2.material.opacity = 0.32 * nk * fl; h3.material.opacity = 0.3 * nk; });
      B.solid(x - 20, z - 13, x + 24, z + 13, 'house'); B.foot([x - 20, z - 13, x + 24, z + 13], 'factory', H);
      if (o.smoke !== false) { B.smoke(x, H + 6, z, { s: 9, rise: 70, drift: 26, n: 8, col: '#D8D0C8', per: 18, ember: true }); B.smoke(x + 16, 11, z, { s: 4, rise: 18, drift: 6, n: 4, col: '#FFC8A0', per: 6, op: 0.35 }); }
    };
    // ---------- 高架橋 ----------
    B.viaduct = (pts, y, o) => {
      o = o || {}; const wd = o.w || 7, step = o.step || 18;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[0] - a[0], b[1] - a[1]), cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, c = Math.cos(ang), s = Math.sin(ang);
        P(g.box, M('conc'), cx, y - 0.7, cz, wd, 1.4, L, 0, ang, 0);
        [-1, 1].forEach(sd => P(g.box, M('conc'), cx + c * sd * (wd / 2 - 0.15), y + 0.55, cz - s * sd * (wd / 2 - 0.15), 0.3, 1.1, L, 0, ang, 0));
        if (o.neon) [-1, 1].forEach(sd => P(g.box, NEON(o.neon, 1.6), cx + c * sd * (wd / 2 + 0.02), y - 0.9, cz - s * sd * (wd / 2 + 0.02), 0.06, 0.12, L, 0, ang, 0));
        for (let t = step / 2; t < L; t += step) {
          const px = a[0] + (b[0] - a[0]) * t / L, pz = a[1] + (b[1] - a[1]) * t / L; if (o.skip && o.skip(px, pz)) continue;
          P(g.box, M('concD'), px, (y - 1.4) / 2, pz, 1.8, y - 1.4, 2.6, 0, ang, 0); P(g.box, M('concD'), px, y - 1.7, pz, wd * 0.8, 0.8, 2.8, 0, ang, 0);
          if (o.solid !== false) B.solid(px - 1.3, pz - 1.3, px + 1.3, pz + 1.3, 'deco');
        }
      }
    };
    // ---------- 吊橋（東西向） ----------
    B.suspension = (x0, x1, z, deckY, o) => {
      o = o || {}; const wd = o.w || 6, Ht = o.h || 22, t0 = x0 + 3, t1 = x1 - 3, blue = CK.mat('bridgeBlue', { col: '#A8E8FF', em: '#3AA8FF', ei: 2.4, neon: true, snow: 0 }); blue.userData.ei0 = 2.4;
      // 主塔（兩根腳＋橫樑）
      [t0, t1].forEach(tx => { [-1, 1].forEach(sd => P(g.box, M('steelD'), tx, deckY - 6 + (Ht + 6) / 2, z + sd * (wd / 2 + 0.6), 1.2, Ht + 6, 1.2)); [Ht * 0.55, Ht - 0.6].forEach(hy => P(g.box, M('steelD'), tx, deckY + hy, z, 1.0, 1.0, wd + 2.4)); P(g.sph, blue, tx, deckY + Ht + 0.6, z, 0.9, 0.9, 0.9); });
      // 主纜（兩邊）：塔頂之間垂下來
      const sag = y => deckY + 1.6 + (Ht - 1.6) * y;
      const n = Math.max(8, Math.round((t1 - t0) / 3));
      [-1, 1].forEach(sd => {
        const zz = z + sd * (wd / 2 + 0.6);
        for (let i = 0; i < n; i++) {
          const ta = i / n, tb = (i + 1) / n, xa = t0 + (t1 - t0) * ta, xb = t0 + (t1 - t0) * tb, ya = sag(Math.pow(2 * ta - 1, 2)), yb = sag(Math.pow(2 * tb - 1, 2)), L = Math.hypot(xb - xa, yb - ya), an = Math.atan2(yb - ya, xb - xa);
          P(g.cyl8, M('steelD'), (xa + xb) / 2, (ya + yb) / 2, zz, 0.28, L, 0.28, 0, 0, an - Math.PI / 2);
          if (i > 0) { P(g.cyl8, M('steel'), xa, (ya + deckY + 1.2) / 2, zz, 0.08, ya - deckY - 1.2, 0.08); P(g.sph, blue, xa, ya + 0.1, zz, 0.32, 0.32, 0.32); }
        }
        // 後拉的纜（塔頂到兩端的錨）
        [[t0, x0 - 6], [t1, x1 + 6]].forEach(([tx, ax]) => { const L = Math.hypot(tx - ax, Ht - 1), an = Math.atan2(Ht - 1, tx - ax); P(g.cyl8, M('steelD'), (tx + ax) / 2, deckY + 1 + (Ht - 1) / 2, zz, 0.28, L, 0.28, 0, 0, an - Math.PI / 2); });
      });
      // 橋面兩側的藍色燈條
      [-1, 1].forEach(sd => P(g.box, blue, (x0 + x1) / 2, deckY + 0.95, z + sd * (wd / 2 - 0.05), x1 - x0, 0.08, 0.08));
      B.lampAt((x0 + x1) / 2, z); B.lampAt(t0, z); B.lampAt(t1, z);
    };
    // ---------- 懸浮車 ----------
    B.hover = (pts, o) => {
      o = o || {}; const n = o.n || 4, y = o.y || 7, loop = o.loop !== false, { acc, L } = CK.accOf(pts, loop), cars = [], under = NEON(o.glow || '#4AE8FF', 2.6);
      for (let i = 0; i < n; i++) {
        const grp = new TH.Group(), col = pk(['#E8E4DC', '#1A1A20', '#C83A3A', '#2E4A8A', '#E8B830']), body = CK.mat('paint|' + col, { tex: 'paint', col, rough: 0.35, metal: 0.4 });
        const add = (geo, mat, px, py, pz, sx, sy, sz) => { const m = new TH.Mesh(geo, mat); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.castShadow = true; grp.add(m); };
        add(g.box, body, 0, 0.55, 0, 1.9, 0.7, 4.4); add(g.box, M('glass'), 0, 1.05, -0.2, 1.6, 0.55, 2.2); add(g.box, under, 0, 0.12, 0, 1.5, 0.06, 3.8);
        add(g.box, NEON('#FF3A3A', 2), 0, 0.6, 2.21, 1.6, 0.12, 0.02); add(g.box, NEON('#FFFFFF', 2), 0, 0.6, -2.21, 1.6, 0.12, 0.02);
        B.group.add(grp); cars.push({ grp, s: L * i / n + rr(0, 10), v: o.v || rr(9, 14), k: rnd() * 9 });
      }
      anim((dt, t) => { cars.forEach(c => { c.s += c.v * dt; const [px, pz, a] = CK.along(pts, acc, L, c.s, loop); c.grp.position.set(px, y + Math.sin(t * 1.7 + c.k) * 0.25, pz); c.grp.rotation.set(0, a + Math.PI, Math.sin(t * 1.1 + c.k) * 0.04); }); });
      return cars;
    };
    // 停著的懸浮車（車行裡）
    B.hoverParked = (x, z, ry, col) => {
      const grp = new TH.Group(), body = CK.mat('paint|' + col, { tex: 'paint', col, rough: 0.35, metal: 0.4 }), under = NEON('#4AE8FF', 2.6);
      const add = (geo, mat, px, py, pz, sx, sy, sz) => { const m = new TH.Mesh(geo, mat); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.castShadow = true; grp.add(m); };
      add(g.box, body, 0, 0.55, 0, 1.9, 0.7, 4.4); add(g.box, M('glass'), 0, 1.05, -0.2, 1.6, 0.55, 2.2); add(g.box, under, 0, 0.12, 0, 1.5, 0.06, 3.8);
      grp.position.set(x, 0.6, z); grp.rotation.y = ry; B.group.add(grp); const k = rnd() * 9; anim((dt, t) => { grp.position.y = 0.6 + Math.sin(t * 2 + k) * 0.12; });
      B.solid(x - 1.2, z - 1.2, x + 1.2, z + 1.2, 'deco');
    };
    // ---------- 無人機 ----------
    B.drone = (cx, cz, r, y) => {
      const grp = new TH.Group(), add = (geo, mat, px, py, pz, sx, sy, sz) => { const m = new TH.Mesh(geo, mat); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); grp.add(m); };
      add(g.box, M('steelD'), 0, 0, 0, 0.8, 0.25, 0.8); [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].forEach(([a, b]) => add(g.cyl8, M('black'), a, 0.15, b, 0.7, 0.03, 0.7)); add(g.sph, NEON('#4AFF8A', 3), 0, -0.2, 0, 0.18, 0.18, 0.18);
      B.group.add(grp); const k = rnd() * 6.28; anim((dt, t) => { const a = t * 0.35 + k; grp.position.set(cx + Math.cos(a) * r, y + Math.sin(t * 1.3 + k) * 0.6, cz + Math.sin(a) * r); grp.rotation.y = -a; });
    };
  };
})(window.R);
