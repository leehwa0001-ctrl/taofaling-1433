// 特效的形狀重做（2026-10-10 作者：特效還是有點簡陋）
// 原本的爆炸是一個平的圓環＋半透明球、光柱是一根實心圓柱、斬擊是一片白色長方形、閃現是紫色球——都是純色的幾何形狀。
// 這裡改用一張特效貼圖集（柔光、衝擊波、厚波、法陣、光束、刀光、煙、火焰、星芒、月牙、冰晶、旋風、十字、音符、放射光、圓點，16 格）
// 貼在面片上：貼地的（衝擊波、法陣、焦痕）、面向鏡頭的（閃光、煙、星芒）、直立的（光束、火焰）。
// 全部面片塞進兩個每格重建的網格（加亮一個、一般一個）：整個畫面的這些特效只要 2 次繪製，不管同時有幾個。
// 提供 R.FXQ：fx1010.js 的 R.addFx 拿來畫爆炸、光環、光柱、斬擊、閃現、煙、火花、槍口火光、你的技能落點（取代原本的純色形狀）。
// 子彈身上加一圈光暈（每格一片面片）。畫質「低」面片數照樣、只少一點煙。
// 放在 fx1010.js 前面（fx1010.js 用它）。
(function (R) {
  const W = R.W, rnd = Math.random, TAU = Math.PI * 2;
  const hexc = h => { const n = parseInt(String(h || '#FFFFFF').replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const C = { glow: 0, ring: 1, wave: 2, rune: 3, beam: 4, streak: 5, puff: 6, flame: 7, star: 8, crescent: 9, shard: 10, swirl: 11, cross: 12, note: 13, burst: 14, dot: 15 };
  // ---------- 貼圖集（白色＋透明度，顏色照面片的頂點色） ----------
  let TEX = null;
  const atlas = () => {
    if (TEX) return TEX;
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S * 4; const g = cv.getContext('2d');
    const cell = (i, f) => { g.save(); g.translate((i % 4) * S, Math.floor(i / 4) * S); g.beginPath(); g.rect(0, 0, S, S); g.clip(); f(S / 2, S / 2, S / 2); g.restore(); };
    const radial = (cx, cy, stops, r) => { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); stops.forEach(([o, a]) => gr.addColorStop(o, 'rgba(255,255,255,' + a + ')')); g.fillStyle = gr; g.fillRect(0, 0, S, S); };
    g.strokeStyle = '#FFF'; g.fillStyle = '#FFF';
    cell(C.glow, (x, y, r) => radial(x, y, [[0, 1], [0.25, 0.75], [0.6, 0.22], [1, 0]], r));
    cell(C.ring, (x, y, r) => radial(x, y, [[0, 0], [0.74, 0], [0.86, 1], [0.93, 0.5], [1, 0]], r));
    cell(C.wave, (x, y, r) => radial(x, y, [[0, 0], [0.35, 0.05], [0.72, 0.85], [0.84, 0.35], [1, 0]], r));
    cell(C.rune, (x, y, r) => {
      g.shadowColor = '#FFF'; g.shadowBlur = 10; g.lineWidth = 7; g.beginPath(); g.arc(x, y, r * 0.9, 0, TAU); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.arc(x, y, r * 0.74, 0, TAU); g.stroke();
      for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i <= 3; i++) { const a = -Math.PI / 2 + k * Math.PI / 3 + i * TAU / 3, px = x + Math.cos(a) * r * 0.74, py = y + Math.sin(a) * r * 0.74; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke(); }
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.lineWidth = i % 3 ? 2 : 4; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.76, y + Math.sin(a) * r * 0.76); g.lineTo(x + Math.cos(a) * r * (i % 3 ? 0.83 : 0.88), y + Math.sin(a) * r * (i % 3 ? 0.83 : 0.88)); g.stroke(); }
      g.beginPath(); g.arc(x, y, r * 0.16, 0, TAU); g.stroke();
    });
    cell(C.beam, (x, y, r) => { const im = g.createImageData(S, S); for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const u = (i - x) / r, v = j / S, a = Math.exp(-u * u * 3) * (0.06 + 0.94 * Math.pow(v, 0.8)) + Math.exp(-u * u * 30) * 0.6 * (0.3 + 0.7 * v); const k = (j * S + i) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = 255; im.data[k + 3] = Math.min(255, a * 255); } g.putImageData(im, (C.beam % 4) * S, Math.floor(C.beam / 4) * S); });
    cell(C.streak, (x, y, r) => { const im = g.createImageData(S, S); for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const u = (i - x) / r, v = (j - y) / r, taper = Math.max(0, 1 - u * u), a = taper * Math.exp(-(v * v) / Math.max(0.002, 0.03 * taper)) + taper * taper * Math.exp(-v * v * 400) * 0.6; const k = (j * S + i) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = 255; im.data[k + 3] = Math.min(255, a * 255); } g.putImageData(im, (C.streak % 4) * S, Math.floor(C.streak / 4) * S); });
    cell(C.puff, (x, y, r) => { let s = 7; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let i = 0; i < 14; i++) { const a = rr() * TAU, d = rr() * r * 0.4, cr = r * (0.3 + rr() * 0.3), gr = g.createRadialGradient(x + Math.cos(a) * d, y + Math.sin(a) * d, 0, x + Math.cos(a) * d, y + Math.sin(a) * d, cr); gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); } });
    cell(C.flame, (x, y, r) => {
      const path = (sc) => { g.beginPath(); g.moveTo(x, y - r * 0.95 * sc); g.bezierCurveTo(x + r * 0.15 * sc, y - r * 0.5 * sc, x + r * 0.6 * sc, y - r * 0.05 * sc, x + r * 0.5 * sc, y + r * 0.45 * sc); g.bezierCurveTo(x + r * 0.4 * sc, y + r * 0.85 * sc, x - r * 0.4 * sc, y + r * 0.85 * sc, x - r * 0.5 * sc, y + r * 0.45 * sc); g.bezierCurveTo(x - r * 0.6 * sc, y - r * 0.05 * sc, x - r * 0.15 * sc, y - r * 0.5 * sc, x, y - r * 0.95 * sc); };
      const gr = g.createLinearGradient(0, y - r, 0, y + r); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0.95)'); g.fillStyle = gr; path(1); g.fill();
      const gi = g.createLinearGradient(0, y - r * 0.4, 0, y + r * 0.8); gi.addColorStop(0, 'rgba(255,255,255,0)'); gi.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gi; path(0.55); g.fill();
    });
    cell(C.star, (x, y, r) => { radial(x, y, [[0, 0.9], [0.15, 0.4], [0.4, 0]], r); g.beginPath(); [[1, 0.08], [0.08, 1]].forEach(([a, b]) => { g.moveTo(x - r * a, y); g.lineTo(x, y - r * b); g.lineTo(x + r * a, y); g.lineTo(x, y + r * b); g.closePath(); }); g.fill(); });
    cell(C.crescent, (x, y, r) => { g.beginPath(); g.arc(x, y, r * 0.9, Math.PI * 1.1, Math.PI * 1.9); g.arc(x, y + r * 0.25, r * 0.78, Math.PI * 1.85, Math.PI * 1.15, true); g.closePath(); const gr = g.createLinearGradient(0, y - r, 0, y); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0.2)'); g.fillStyle = gr; g.fill(); });
    cell(C.shard, (x, y, r) => { g.beginPath(); g.moveTo(x, y - r * 0.95); g.lineTo(x + r * 0.28, y); g.lineTo(x, y + r * 0.95); g.lineTo(x - r * 0.28, y); g.closePath(); const gr = g.createLinearGradient(x - r * 0.3, 0, x + r * 0.3, 0); gr.addColorStop(0, 'rgba(255,255,255,0.45)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0.6)'); g.fillStyle = gr; g.fill(); });
    cell(C.swirl, (x, y, r) => { g.lineCap = 'round'; for (let k = 0; k < 3; k++) { g.lineWidth = 10; g.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40, a = k * TAU / 3 + t * 4.2, d = r * (0.15 + t * 0.78); const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; g.globalAlpha = 0.25 + t * 0.75; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke(); } g.globalAlpha = 1; });
    cell(C.cross, (x, y, r) => { radial(x, y, [[0, 0.5], [0.5, 0]], r); g.fillRect(x - r * 0.14, y - r * 0.6, r * 0.28, r * 1.2); g.fillRect(x - r * 0.6, y - r * 0.14, r * 1.2, r * 0.28); });
    cell(C.note, (x, y, r) => { g.font = 'bold ' + Math.round(r * 1.5) + 'px "Segoe UI Symbol","Noto Sans Symbols",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#FFF'; g.shadowBlur = 12; g.fillText('♪', x, y + r * 0.05); });
    cell(C.burst, (x, y, r) => { radial(x, y, [[0, 1], [0.2, 0.5], [0.5, 0]], r); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + (i % 2) * 0.1, L = r * (i % 2 ? 0.6 : 0.95), w = r * 0.07; g.beginPath(); g.moveTo(x + Math.cos(a + 1.57) * w, y + Math.sin(a + 1.57) * w); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.lineTo(x + Math.cos(a - 1.57) * w, y + Math.sin(a - 1.57) * w); g.closePath(); g.fill(); } });
    cell(C.dot, (x, y, r) => radial(x, y, [[0, 1], [0.5, 1], [0.62, 0], [1, 0]], r));
    TEX = new THREE.CanvasTexture(cv); TEX.userData.shared = true;
    return TEX;
  };
  // ---------- 兩個每格重建的網格 ----------
  const MAXQ = 700, QS = [];
  const VS = 'attribute vec4 pc; varying vec4 vC; varying vec2 vU; void main(){ vC = pc; vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const FS = 'uniform sampler2D map; varying vec4 vC; varying vec2 vU; void main(){ vec4 t = texture2D(map, vU); float a = t.a * vC.a; if (a < 0.01) discard; gl_FragColor = vec4(vC.rgb * t.rgb, a); }';
  let MA = null, MN = null;
  const mk = add => {
    const TH = THREE, g = new TH.BufferGeometry();
    g.setAttribute('position', new TH.BufferAttribute(new Float32Array(MAXQ * 18), 3)); g.setAttribute('uv', new TH.BufferAttribute(new Float32Array(MAXQ * 12), 2)); g.setAttribute('pc', new TH.BufferAttribute(new Float32Array(MAXQ * 24), 4)); g.setDrawRange(0, 0);
    const m = new TH.ShaderMaterial({ uniforms: { map: { value: atlas() } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: TH.DoubleSide, blending: add ? TH.AdditiveBlending : TH.NormalBlending });
    const mesh = new TH.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = add ? 6 : 3; return mesh;
  };
  const ensure = () => {
    if (!window.THREE || !W.scene) return false;
    if (!MA) { MA = mk(true); MN = mk(false); }
    [MA, MN].forEach(m => { if (m.parent !== W.scene) { if (m.parent) m.parent.remove(m); W.scene.add(m); } });
    return true;
  };
  // 面片：{ c 格子, m 'ground'|'bill'|'vert', x y z, s0 s1（大小；寬高不一樣用 w0 h0 w1 h1）, rot rv（轉速）, vx vy vz grav, life, col, a, fi（淡入比例）, add }
  // 有顏色的加亮面片底下墊一片一般混合、顏色深一點的（亮的地板上加亮會被洗白：這樣暗處會發光、亮處也看得出形狀和顏色）
  const sat = c => { const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]); return mx ? (mx - mn) / mx : 0; };
  const add = o => {
    if (QS.length >= MAXQ) QS.shift(); o.t = 0; o.col = typeof o.col === 'string' ? hexc(o.col) : (o.col || [1, 1, 1]); if (o.a == null) o.a = 1; if (o.fi == null) o.fi = 0.12;
    if (o.add !== false && o.dual !== false && o.c !== C.glow && sat(o.col) > 0.22 && QS.length < MAXQ - 1) { const sh = Object.assign({}, o, { add: false, col: o.col.map(v => v * 0.62), a: o.a * 0.6, dual: false }); QS.push(sh); }
    QS.push(o); return o;
  };
  const ease = k => 1 - (1 - k) * (1 - k);
  const build = dt => {
    if (!MA) return;
    const cam = W.camera; if (!cam) return; cam.updateMatrixWorld(); const e = cam.matrixWorld.elements, rx = e[0], ry = e[1], rz = e[2], ux = e[4], uy = e[5], uz = e[6], cxp = cam.position.x, czp = cam.position.z;
    const bufs = [[MA, 0], [MN, 0]];
    for (const o of QS) {
      const k = Math.min(1, o.t / o.life), es = ease(k);
      o.x += (o.vx || 0) * dt; o.y += (o.vy || 0) * dt; o.z += (o.vz || 0) * dt; if (o.grav) o.vy -= o.grav * dt; o.rot = (o.rot || 0) + (o.rv || 0) * dt;
      const al = o.a * (k < o.fi ? k / o.fi : o.hold ? (k < o.hold ? 1 : 1 - (k - o.hold) / (1 - o.hold)) : 1 - (k - o.fi) / (1 - o.fi)) * (o.pulse ? 0.7 + 0.3 * Math.sin(o.t * o.pulse) : 1);
      if (al <= 0.003) continue;
      const w = o.w0 != null ? o.w0 + (o.w1 - o.w0) * es : o.s0 + (o.s1 - o.s0) * es, h = o.h0 != null ? o.h0 + (o.h1 - o.h0) * es : w;
      const B = o.add === false ? bufs[1] : bufs[0], mesh = B[0], n = B[1]; if (n >= MAXQ) continue;
      const P = mesh.geometry.attributes.position.array, U = mesh.geometry.attributes.uv.array, Cc = mesh.geometry.attributes.pc.array;
      const cs = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0); let ax, ay, az, bx, by, bz, ox = o.x, oy = o.y, oz = o.z;
      if (o.m === 'ground') { ax = cs * w / 2; ay = 0; az = -sn * w / 2; bx = sn * h / 2; by = 0; bz = cs * h / 2; }
      else if (o.m === 'vert') { let hx = o.x - cxp, hz = o.z - czp; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl; ax = -hz * w / 2; ay = 0; az = hx * w / 2; bx = 0; by = h / 2; bz = 0; oy = o.y + h / 2; }
      else { ax = (rx * cs + ux * sn) * w / 2; ay = (ry * cs + uy * sn) * w / 2; az = (rz * cs + uz * sn) * w / 2; bx = (ux * cs - rx * sn) * h / 2; by = (uy * cs - ry * sn) * h / 2; bz = (uz * cs - rz * sn) * h / 2; }
      const p0 = [ox - ax - bx, oy - ay - by, oz - az - bz], p1 = [ox + ax - bx, oy + ay - by, oz + az - bz], p2 = [ox + ax + bx, oy + ay + by, oz + az + bz], p3 = [ox - ax + bx, oy - ay + by, oz - az + bz];
      const u0 = (o.c % 4) / 4, u1 = u0 + 0.25, v1 = 1 - Math.floor(o.c / 4) / 4, v0 = v1 - 0.25, du = 0.002;
      const V = [p0, p1, p2, p0, p2, p3], UV = [[u0 + du, v0 + du], [u1 - du, v0 + du], [u1 - du, v1 - du], [u0 + du, v0 + du], [u1 - du, v1 - du], [u0 + du, v1 - du]];
      const col = o.col2 ? mix(o.col, o.col2, k) : o.col, cr = col[0] * (o.add === false ? 1 : al), cg = col[1] * (o.add === false ? 1 : al), cb = col[2] * (o.add === false ? 1 : al);
      for (let j = 0; j < 6; j++) { const q = n * 6 + j; P[q * 3] = V[j][0]; P[q * 3 + 1] = V[j][1]; P[q * 3 + 2] = V[j][2]; U[q * 2] = UV[j][0]; U[q * 2 + 1] = UV[j][1]; Cc[q * 4] = cr; Cc[q * 4 + 1] = cg; Cc[q * 4 + 2] = cb; Cc[q * 4 + 3] = al; }
      B[1] = n + 1;
    }
    for (let i = QS.length - 1; i >= 0; i--) { const o = QS[i]; o.t += dt; if (o.t >= o.life) QS.splice(i, 1); }   // 先畫再過期（子彈的光暈只活一格）
    bufs.forEach(([m, n]) => { const g = m.geometry; g.setDrawRange(0, n * 6); g.attributes.position.needsUpdate = true; g.attributes.uv.needsUpdate = true; g.attributes.pc.needsUpdate = true; });
  };
  // ---------- 特效 ----------
  const lowQ = () => !!(R.CK && R.CK.quality && R.CK.quality() === 0);
  const bright = c => mix(hexc(c), [1, 1, 1], 0.45);
  const FIRE = ['#FF9A3A', '#FFD04A', '#FF6A2A'];
  const flames = (x, z, r, n, cols) => { for (let i = 0; i < n; i++) { const a = rnd() * TAU, d = rnd() * r * 0.7, sz = 0.5 + rnd() * 0.5; add({ c: C.flame, m: 'vert', x: x + Math.cos(a) * d, y: 0, z: z + Math.sin(a) * d, w0: sz * 0.8, w1: sz * 0.4, h0: sz * 1.6, h1: sz * 2.4, vy: 0.9 + rnd(), life: 0.45 + rnd() * 0.3, col: cols[i % cols.length], fi: 0.15 }); } };
  const smoke = (x, y, z, r, n, col, a) => { for (let i = 0; i < (lowQ() ? Math.ceil(n / 2) : n); i++) { const ang = rnd() * TAU, d = rnd() * r * 0.5; add({ c: C.puff, m: 'bill', x: x + Math.cos(ang) * d, y: y + rnd() * 0.5, z: z + Math.sin(ang) * d, s0: r * 0.6, s1: r * (1.4 + rnd() * 0.6), rot: rnd() * TAU, rv: (rnd() - 0.5) * 1.5, vx: Math.cos(ang) * 0.6, vy: 0.8 + rnd() * 0.6, vz: Math.sin(ang) * 0.6, life: 0.9 + rnd() * 0.5, col: col || '#5A524A', a: a == null ? 0.55 : a, add: false, fi: 0.1 }); } };
  const FX = {
    boom(x, y, z, o, el) {
      const r = Math.min(7, o.r || 2), c = o.color || (el === 'fire' || !el ? '#FFB45A' : '#FFFFFF'), bc = bright(c);
      add({ c: C.glow, m: 'bill', x, y: 0.9, z, s0: r * 1.8, s1: r * 2.8, life: 0.2, col: bc, a: 1, fi: 0.05 });
      add({ c: C.burst, m: 'bill', x, y: 0.9, z, s0: r * 1.6, s1: r * 2.6, rot: rnd() * TAU, life: 0.22, col: c, a: 0.95, fi: 0.05 });
      add({ c: C.ring, m: 'ground', x, y: 0.12, z, s0: r * 0.6, s1: r * 2.7, life: 0.32, col: bc, a: 1, fi: 0.02 });
      add({ c: C.wave, m: 'ground', x, y: 0.1, z, s0: r * 0.4, s1: r * 2.2, life: 0.5, col: c, a: 0.75, fi: 0.04 });
      add({ c: C.glow, m: 'ground', x, y: 0.06, z, s0: r * 1.9, s1: r * 2.1, life: 1.6, col: '#140C08', a: 0.45, add: false, fi: 0.05, hold: 0.5 });   // 焦痕
      if (!el || el === 'fire') flames(x, z, r, Math.round(4 + r * 1.5), FIRE);
      smoke(x, 0.6, z, r, Math.round(3 + r), el === 'ice' ? '#C8E0F0' : el === 'holy' ? '#E8DCB0' : '#4A4440', el === 'ice' || el === 'holy' ? 0.35 : 0.55);
    },
    ring(x, y, z, o, el) {
      const r = Math.min(9, o.r || 2), c = o.color || '#FFFFFF', bc = bright(c);
      add({ c: C.wave, m: 'ground', x, y: 0.1, z, s0: r * 0.5, s1: r * 2.1, life: 0.45, col: c, a: 0.8, fi: 0.05 });
      add({ c: C.ring, m: 'ground', x, y: 0.13, z, s0: r * 0.3, s1: r * 2, life: 0.38, col: bc, a: 1, fi: 0.04 });
      add({ c: C.glow, m: 'ground', x, y: 0.08, z, s0: r * 1.2, s1: r * 1.6, life: 0.35, col: c, a: 0.45, fi: 0.1 });
    },
    pillar(x, y, z, o, el) {
      const r = Math.min(4, o.r || 1), c = o.color || '#FFE8A0', bc = bright(c);
      add({ c: C.beam, m: 'vert', x, y: 0, z, w0: r * 2.4, w1: r * 1.2, h0: 11, h1: 11, life: 0.5, col: c, a: 0.95, fi: 0.06 });
      add({ c: C.beam, m: 'vert', x, y: 0, z, w0: r * 0.9, w1: r * 0.3, h0: 11, h1: 11, life: 0.4, col: [1, 1, 1], a: 0.9, fi: 0.05 });
      add({ c: C.glow, m: 'ground', x, y: 0.08, z, s0: r * 3, s1: r * 4, life: 0.55, col: bc, a: 0.8, fi: 0.05 });
      add({ c: C.ring, m: 'ground', x, y: 0.12, z, s0: r * 1, s1: r * 4.5, life: 0.4, col: bc, a: 0.9, fi: 0.03 });
    },
    slash(x, y, z, o, el) {
      const a = o.a || 0, len = o.len || 4, c = o.color || '#E8F0FF', mx = x + Math.sin(a) * len / 2, mz = z + Math.cos(a) * len / 2;
      add({ c: C.streak, m: 'ground', x: mx, y: 0.88, z: mz, w0: len * 1.05, w1: len * 1.15, h0: 2.8, h1: 1, rot: a - Math.PI / 2, life: 0.26, col: '#1A2030', a: 0.45, add: false, fi: 0.05 });   // 深色的影子（亮的地板上也看得到）
      add({ c: C.streak, m: 'ground', x: mx, y: 0.9, z: mz, w0: len * 1.05, w1: len * 1.15, h0: 2.6, h1: 0.8, rot: a - Math.PI / 2, life: 0.26, col: c, a: 1, fi: 0.05 });
      add({ c: C.streak, m: 'ground', x: mx, y: 0.92, z: mz, w0: len, w1: len * 1.1, h0: 1.1, h1: 0.3, rot: a - Math.PI / 2, life: 0.2, col: [1, 1, 1], a: 1, fi: 0.05 });
      add({ c: C.star, m: 'bill', x: x + Math.sin(a) * len, y: 0.9, z: z + Math.cos(a) * len, s0: 1.6, s1: 0.4, rot: rnd(), life: 0.2, col: [1, 1, 1], a: 1, fi: 0.05 });
    },
    blink(x, y, z, o, el) {
      const c = o.color || '#B89AFF';
      add({ c: C.glow, m: 'bill', x, y: y || 1, z, s0: 2.6, s1: 1, life: 0.3, col: c, a: 0.9, fi: 0.05 });
      add({ c: C.star, m: 'bill', x, y: y || 1, z, s0: 2.4, s1: 0.6, rot: rnd(), rv: 4, life: 0.3, col: bright(c), a: 1, fi: 0.05 });
      add({ c: C.ring, m: 'ground', x, y: 0.12, z, s0: 0.6, s1: 2.6, life: 0.3, col: c, a: 0.8, fi: 0.05 });
    },
    poof(x, y, z, o, el) { const c = o.color || '#FFFFFF', h = hexc(c), dark = h[0] + h[1] + h[2] < 1.4; smoke(x, (y || 0.6) - 0.3, z, 1.2, Math.min(4, Math.ceil((o.n || 8) / 4)), c, dark ? 0.6 : 0.4); add({ c: C.glow, m: 'bill', x, y: y || 0.8, z, s0: 1.4, s1: 2, life: 0.2, col: c, a: dark ? 0.2 : 0.6, fi: 0.1 }); },
    spark(x, y, z, o) { add({ c: o.crit ? C.burst : C.star, m: 'bill', x, y, z, s0: o.crit ? 2.4 : 1.1, s1: o.crit ? 1 : 0.4, rot: rnd() * TAU, life: o.crit ? 0.2 : 0.12, col: o.crit ? '#FFE8A0' : '#FFF8E0', a: 1, fi: 0.05 }); if (o.crit) add({ c: C.ring, m: 'bill', x, y, z, s0: 0.5, s1: 2.6, life: 0.2, col: [1, 1, 1], a: 0.9, fi: 0.02 }); },
    muzzle(x, y, z, o) { const c = o.color || '#FFE9A8'; add({ c: C.star, m: 'bill', x, y, z, s0: 1.3, s1: 0.6, rot: rnd() * TAU, life: 0.08, col: c, a: 1, fi: 0.05 }); add({ c: C.glow, m: 'bill', x, y, z, s0: 1.2, s1: 0.9, life: 0.08, col: c, a: 0.8, fi: 0.05 }); },
    mark(x, y, z, o) { const r = o.r || 2, c = o.color || '#FFFFFF', t = Math.max(0.2, o.t || 0.4); add({ c: C.rune, m: 'ground', x, y: 0.1, z, s0: r * 2.25, s1: r * 2, rot: rnd() * TAU, rv: 1.6, life: t + 0.1, col: c, a: 0.95, fi: 0.15, hold: 0.85, pulse: 12 }); add({ c: C.glow, m: 'ground', x, y: 0.07, z, s0: r * 1.6, s1: r * 2.2, life: t + 0.1, col: c, a: 0.35, fi: 0.3, hold: 0.85 }); }
  };
  // 元素多加的面片
  const EL = {
    fire(x, z, r) { flames(x, z, r, Math.round(3 + r), FIRE); },
    ice(x, z, r) { for (let i = 0; i < 8; i++) { const a = rnd() * TAU, sp = 2 + rnd() * 3; add({ c: C.shard, m: 'bill', x, y: 0.6, z, s0: 0.9, s1: 0.6, rot: rnd() * TAU, rv: (rnd() - 0.5) * 6, vx: Math.cos(a) * sp, vy: 3 + rnd() * 2, vz: Math.sin(a) * sp, grav: 12, life: 0.6, col: i % 2 ? '#DDF4FF' : '#9AD8FF', a: 1, fi: 0.05 }); } add({ c: C.glow, m: 'ground', x, y: 0.07, z, s0: r * 2, s1: r * 2.4, life: 1.2, col: '#CFE8FA', a: 0.4, add: false, fi: 0.05, hold: 0.5 }); },
    holy(x, z, r) { add({ c: C.beam, m: 'vert', x, y: 0, z, w0: r * 1.4, w1: r * 0.6, h0: 7, h1: 8, life: 0.5, col: '#FFE8A0', a: 0.7, fi: 0.08 }); for (let i = 0; i < 4; i++) { const a = rnd() * TAU, d = rnd() * r * 0.6; add({ c: C.cross, m: 'bill', x: x + Math.cos(a) * d, y: 0.6, z: z + Math.sin(a) * d, s0: 0.7, s1: 0.4, vy: 1.6 + rnd(), life: 0.8, col: '#FFE8A0', a: 0.9, fi: 0.1 }); } },
    shadow(x, z, r) { smoke(x, 0.5, z, r, 4 + Math.round(r), '#2A1A3A', 0.7); add({ c: C.swirl, m: 'ground', x, y: 0.09, z, s0: r * 2.2, s1: r * 1.2, rot: 0, rv: -5, life: 0.6, col: '#8A4AC8', a: 0.85, fi: 0.08 }); },
    poison(x, z, r) { smoke(x, 0.4, z, r, 3 + Math.round(r), '#5A8A2A', 0.55); },
    wind(x, z, r) { add({ c: C.swirl, m: 'ground', x, y: 0.15, z, s0: r * 1.2, s1: r * 2.6, rot: 0, rv: 8, life: 0.5, col: '#E8FFF0', a: 0.9, fi: 0.05 }); add({ c: C.swirl, m: 'ground', x, y: 0.5, z, s0: r * 0.8, s1: r * 1.8, rot: 1, rv: 10, life: 0.45, col: '#BFF0D0', a: 0.7, fi: 0.05 }); },
    earth(x, z, r) { smoke(x, 0.3, z, r * 1.2, 4 + Math.round(r), '#8A7A64', 0.6); add({ c: C.glow, m: 'ground', x, y: 0.06, z, s0: r * 2, s1: r * 2.3, life: 1.5, col: '#2A2018', a: 0.45, add: false, fi: 0.05, hold: 0.5 }); },
    sound(x, z, r) { for (let i = 0; i < 3; i++) add({ c: C.ring, m: 'ground', x, y: 0.15 + i * 0.05, z, s0: r * 0.3, s1: r * (1.6 + i * 0.5), life: 0.45 + i * 0.12, col: i % 2 ? '#FFE0F4' : '#FFB8E0', a: 0.9, fi: 0.05 }); for (let i = 0; i < 3; i++) { const a = rnd() * TAU; add({ c: C.note, m: 'bill', x: x + Math.cos(a) * r * 0.5, y: 0.8, z: z + Math.sin(a) * r * 0.5, s0: 0.9, s1: 0.7, vy: 1.4, vx: Math.cos(a) * 0.5, vz: Math.sin(a) * 0.5, life: 0.8, col: '#FFB8E0', a: 1, fi: 0.1 }); } },
    water(x, z, r) { add({ c: C.wave, m: 'ground', x, y: 0.1, z, s0: r * 0.5, s1: r * 2.4, life: 0.6, col: '#9AD0FF', a: 0.8, fi: 0.05 }); },
    thunder(x, z, r) { add({ c: C.burst, m: 'ground', x, y: 0.1, z, s0: r * 1.6, s1: r * 2.2, rot: rnd() * TAU, life: 0.25, col: '#E8F6FF', a: 1, fi: 0.03 }); add({ c: C.glow, m: 'ground', x, y: 0.06, z, s0: r * 1.4, s1: r * 1.6, life: 1.2, col: '#1A1A24', a: 0.4, add: false, fi: 0.05, hold: 0.5 }); }
  };
  // ---------- 每一格：子彈的光暈、畫 ----------
  const shotGlow = () => {
    (W.shots || []).forEach(s => {
      if (s.dead || !s.mesh || s.owner !== 'p') return;
      const m = s.mesh.material, c = m && m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1];
      add({ c: C.glow, m: 'bill', x: s.x, y: s.y || 1, z: s.z, s0: 1.3, s1: 1.3, life: 0.001, col: mix(c, [1, 1, 1], 0.3), a: 0.75, fi: 0 });
    });
  };
  const pix = () => !!(W.scene && W.scene.userData.pix);
  const step = dt => { if (!MA || !pix()) return; shotGlow(); build(dt); };
  const st0 = R.step; R.step = dt => { const r = st0(dt); try { step(dt); } catch (e) { } return r; };
  const ts0 = R.townStep; R.townStep = dt => { const r = ts0(dt); try { if (W.town && !W.town.ck) step(dt); } catch (e) { } return r; };
  const lf0 = R.loadFloor; if (lf0) R.loadFloor = (...a) => { QS.length = 0; return lf0(...a); };
  const KINDS = new Set(Object.keys(FX));
  R.FXQ = { C, add, ensure, handles: k => KINDS.has(k) && pix() && ensure(), fx: (k, x, y, z, o, el) => FX[k](x, y, z, o || {}, el), el: (el, x, z, r) => { if (EL[el] && ensure()) EL[el](x, z, r); }, count: () => QS.length };
})(window.R);
