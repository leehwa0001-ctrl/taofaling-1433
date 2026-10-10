// 技能特效照元素重做（2026-10-10 作者：特效也要優化，有些特效不符合說明，所有特效過於簡陋，但也不能太耗能）
// - 放技能時記住這一招的元素（技能名字、說明裡的雷、火、冰、聖、影、毒、風、土、音、水；火冰雷輪流的照每一下的顏色），
//   連延遲的那幾下（setTimeout）、持續的（W.dyn）、射出去的子彈都帶著。
// - 有元素的時候，爆炸、光柱、光環、地上的震波加上那個元素的樣子：
//   雷：天上劈下來的鋸齒閃電（取代一般光柱）＋電花；火：往上飄的火星＋黑煙；冰：往外噴、落下的冰屑＋寒霧；
//   聖：往上升的金色光點＋光環；影：往上冒的紫黑煙＋往中間吸的光點；毒：綠色氣泡；風：旋轉的氣流；
//   土：往上噴、落下的碎石＋塵土；音：一圈一圈擴散的音波；水：水花＋漣漪。
// - 子彈帶元素的，飛的時候身後掉那個元素的粒子；連鎖閃電改成鋸齒狀（白芯＋外光），一次畫完。
// - 你的範圍技能落點不再用遺跡生物攻擊預警的紅圈，改成技能顏色的圈。
// - 火花、煙塵、冒出來的特效原本是一顆一顆小方塊（一顆一次繪製），改成粒子。
// 效能：粒子是兩組 Points（加亮、一般各一組，自己的著色器，圓的、可以淡出），閃電和拖尾全部塞進一個每格重建的網格——
// 整個畫面的特效大概 3～4 次繪製；畫質「低」粒子數減半。只在遺跡（像素風的場景）裡用。
// 放在 hud.js、fxplus.js、elements1008.js、skillbook*.js、bal1010.js 後面（最外層）。
(function (R) {
  const W = R.W, LIB = R.SKILL_LIB || {}, T = R.SKILL_TYPES; if (!T || !R.addFx) return;
  const rnd = Math.random, TAU = Math.PI * 2;
  const SZ = 1.8;   // 像素風的鏡頭拉得遠：粒子大一點才看得到（只佔畫面一點點，幾乎不加負擔）
  const Q = () => (R.CK && R.CK.quality && R.CK.quality() === 0 ? 0.5 : 1);
  const hexc = h => { const n = parseInt(String(h || '#FFFFFF').replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  // ---------- 元素 ----------
  const RX = [['thunder', /雷|電|閃電|霹靂/], ['fire', /火|焰|炎|燃燒|熔岩|灼|隕石|流星|爆裂核心|魂火/], ['ice', /冰|霜|凍|雪|寒/], ['poison', /毒/],
    ['holy', /聖|光柱|光彈|天使|天罰|神恩|祈禱|光之|光環|聖光/], ['shadow', /影|暗|闇|怨|魂|詛咒|咒縛|咒殺|萬咒|鬼|靈/], ['wind', /風|旋風|龍捲|颶|迴旋/],
    ['earth', /岩|石|土|大地|震|地裂|泥|劈山|山/], ['sound', /音|樂|曲|歌|鼓|奏|頻|旋律|弦|鳴/], ['water', /水|潮|浪/]];
  const MULTI = /(火|焰).*(冰|霜).*(雷)|(焰).*(霜).*(雷)/;
  const elemOf = L => {
    if (L._fxEl !== undefined) return L._fxEl;
    const desc = String(L.desc || '').replace(/^（[^）]*）/, ''), name = String(L.name || '');
    let el = null; if (MULTI.test(desc)) el = 'multi'; else { const hit = RX.find(([, re]) => re.test(name)) || RX.find(([, re]) => re.test(desc)); el = hit ? hit[0] : null; }
    return (L._fxEl = el);
  };
  // 火冰雷輪流的招：照這一下的顏色
  const byColor = c => { const [r, g, b] = hexc(c); if (r > 0.85 && g < 0.65 && b < 0.5) return 'fire'; if (b > 0.85 && r < 0.8) return 'ice'; if (r > 0.8 && g > 0.75 && b < 0.65) return 'thunder'; return null; };
  const PAL = { thunder: ['#FFF6B0', '#BFE8FF'], fire: ['#FF8A3A', '#FFD04A'], ice: ['#DDF4FF', '#9AD8FF'], holy: ['#FFE8A0', '#FFF8D8'], shadow: ['#8A4AC8', '#3A2050'], poison: ['#8ACF3A', '#4E8A2A'], wind: ['#E8FFF0', '#BFF0D0'], earth: ['#A08A6A', '#6A5A48'], sound: ['#FFB8E0', '#FFE0F4'], water: ['#7AC8FF', '#DDF0FF'] };

  // ---------- 放技能的時候記住元素（延遲、持續的、子彈都帶著） ----------
  let CUR = null;
  const bind = (ctx, f) => function (...a) { const p = CUR; CUR = ctx; try { return f.apply(this, a); } finally { CUR = p; } };
  // 在某個元素底下跑 f（延遲、持續的回呼也帶著）；大招（ultfx.js）也用
  const runCtx = (ctx, f) => {
    if (CUR || !ctx) return f();
    const w = W, st0 = window.setTimeout, dyn = w.dyn, had = !!dyn && Object.prototype.hasOwnProperty.call(dyn, 'push'), dp0 = dyn && dyn.push;
    window.setTimeout = function (cb, ms, ...a) { return st0.call(this, typeof cb === 'function' ? bind(ctx, cb) : cb, ms, ...a); };
    if (dyn) dyn.push = function (...fs) { return dp0.apply(this, fs.map(g => (typeof g === 'function' ? bind(ctx, g) : g))); };
    CUR = ctx;
    try { return f(); }
    finally { CUR = null; window.setTimeout = st0; if (dyn) { if (had) dyn.push = dp0; else delete dyn.push; } }
  };
  Object.keys(T).forEach(k => {
    const f0 = T[k]; if (typeof f0 !== 'function') return;
    T[k] = function (s, P, w, pw) {
      if (CUR) return f0.call(this, s, P, w, pw);
      const id = s && s._id ? String(s._id).split(':')[0] : null, L = id && LIB[id];
      if (!L || !w) return f0.call(this, s, P, w, pw);
      const ctx = { el: elemOf(L), adv: L.adv || null, col: (s && s.color) || (L.p && L.p.color) || null, fall: L._fxFall != null ? L._fxFall : (L._fxFall = /隕石|流星|落下|砸向|天降|墜|落雷/.test(String(L.name) + String(L.desc))) };
      return runCtx(ctx, () => f0.call(this, s, P, w, pw));
    };
  });
  const fire0 = R.fire;
  if (fire0) R.fire = o => { const s = fire0(o); try { if (s && CUR && CUR.el && o && o.owner === 'p') s.fxEl = CUR.el === 'multi' ? byColor(o.color) : CUR.el; } catch (e) { } return s; };

  // ---------- 粒子（加亮、一般兩組；自己的著色器：圓的、每顆自己的大小和透明度） ----------
  const VS = 'attribute vec4 pc; attribute float ps; varying vec4 vC; void main(){ vC = pc; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = ps; }';
  const FS = 'varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; float a = 1.0 - smoothstep(0.2, 0.5, r); gl_FragColor = vec4(vC.rgb, vC.a * a); }';
  const mkSys = (N, add) => {
    const TH = THREE, g = new TH.BufferGeometry(), pos = new Float32Array(N * 3), pc = new Float32Array(N * 4), ps = new Float32Array(N);
    for (let i = 0; i < N; i++) pos[i * 3 + 1] = -999;
    g.setAttribute('position', new TH.BufferAttribute(pos, 3)); g.setAttribute('pc', new TH.BufferAttribute(pc, 4)); g.setAttribute('ps', new TH.BufferAttribute(ps, 1));
    const m = new TH.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: add ? TH.AdditiveBlending : TH.NormalBlending });
    const pts = new TH.Points(g, m); pts.frustumCulled = false; pts.renderOrder = add ? 4 : 3;
    return { pts, pos, pc, ps, N, head: 0, life: new Float32Array(N), max: new Float32Array(N), v: new Float32Array(N * 3), c: new Float32Array(N * 3), a0: new Float32Array(N), s0: new Float32Array(N), s1: new Float32Array(N), grav: new Float32Array(N), drag: new Float32Array(N), live: 0 };
  };
  let A = null, N = null;
  const sys = () => {
    if (!A) { A = mkSys(1100, true); N = mkSys(360, false); }
    [A, N].forEach(s => { if (W.scene && s.pts.parent !== W.scene) { if (s.pts.parent) s.pts.parent.remove(s.pts); W.scene.add(s.pts); } });
  };
  // o：{ size 開始的大小（像素）, size1 結束的大小, a 透明度, grav 重力（負的往上飄）, drag 阻力 }
  const emit = (s, x, y, z, vx, vy, vz, life, col, o) => {
    o = o || {}; const i = s.head; s.head = (s.head + 1) % s.N; const c = typeof col === 'string' ? hexc(col) : col;
    s.pos[i * 3] = x; s.pos[i * 3 + 1] = y; s.pos[i * 3 + 2] = z; s.v[i * 3] = vx; s.v[i * 3 + 1] = vy; s.v[i * 3 + 2] = vz;
    s.life[i] = life; s.max[i] = life; s.c[i * 3] = c[0]; s.c[i * 3 + 1] = c[1]; s.c[i * 3 + 2] = c[2];
    s.a0[i] = o.a == null ? 1 : o.a; s.s0[i] = (o.size || 3) * SZ; s.s1[i] = (o.size1 == null ? (o.size || 3) * 0.5 : o.size1) * SZ; s.grav[i] = o.grav || 0; s.drag[i] = o.drag || 0;
  };
  const stepSys = (s, dt) => {
    let live = 0;
    for (let i = 0; i < s.N; i++) {
      const i3 = i * 3, i4 = i * 4;
      if (s.life[i] <= 0) { if (s.pos[i3 + 1] > -900) { s.pos[i3 + 1] = -999; s.pc[i4 + 3] = 0; } continue; }
      live++; s.life[i] -= dt; const k = Math.max(0, s.life[i] / s.max[i]), dr = 1 - Math.min(0.9, s.drag[i] * dt);
      s.v[i3] *= dr; s.v[i3 + 2] *= dr; s.v[i3 + 1] = s.v[i3 + 1] * dr - s.grav[i] * dt;
      s.pos[i3] += s.v[i3] * dt; s.pos[i3 + 1] += s.v[i3 + 1] * dt; s.pos[i3 + 2] += s.v[i3 + 2] * dt;
      if (s.pos[i3 + 1] < 0.05 && s.v[i3 + 1] < 0) { s.pos[i3 + 1] = 0.05; s.v[i3 + 1] *= -0.25; s.v[i3] *= 0.6; s.v[i3 + 2] *= 0.6; }
      s.pc[i4] = s.c[i3]; s.pc[i4 + 1] = s.c[i3 + 1]; s.pc[i4 + 2] = s.c[i3 + 2]; s.pc[i4 + 3] = s.a0[i] * Math.min(1, k * 2.5);
      s.ps[i] = s.s1[i] + (s.s0[i] - s.s1[i]) * k;
    }
    s.live = live;
    const g = s.pts.geometry; g.attributes.position.needsUpdate = true; g.attributes.pc.needsUpdate = true; g.attributes.ps.needsUpdate = true;
  };
  const n = k => Math.max(1, Math.round(k * Q()));
  const burst = (s, x, y, z, cnt, sp, life, cols, o) => { o = o || {}; for (let i = 0; i < n(cnt); i++) { const a = rnd() * TAU, u = sp * (0.4 + rnd() * 0.6); emit(s, x, y, z, Math.cos(a) * u, (o.up || 0) * (0.5 + rnd() * 0.5), Math.sin(a) * u, life * (0.6 + rnd() * 0.4), cols[i % cols.length], o); } };
  const ring = (s, x, y, z, cnt, sp, life, col, o) => { for (let i = 0; i < n(cnt); i++) { const a = i / n(cnt) * TAU; emit(s, x, y, z, Math.cos(a) * sp, 0, Math.sin(a) * sp, life, col, o); } };

  // ---------- 拖尾、閃電：全部塞進一個每格重建的網格（一次畫完） ----------
  const RIB = [], MAXQ = 700;
  let ribMesh = null;
  const ribInit = () => {
    if (ribMesh) { if (W.scene && ribMesh.parent !== W.scene) { if (ribMesh.parent) ribMesh.parent.remove(ribMesh); W.scene.add(ribMesh); } return; }
    const TH = THREE, g = new TH.BufferGeometry();
    g.setAttribute('position', new TH.BufferAttribute(new Float32Array(MAXQ * 6 * 3), 3)); g.setAttribute('pc', new TH.BufferAttribute(new Float32Array(MAXQ * 6 * 4), 4)); g.setDrawRange(0, 0);
    const m = new TH.ShaderMaterial({ vertexShader: 'attribute vec4 pc; varying vec4 vC; void main(){ vC = pc; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'varying vec4 vC; void main(){ gl_FragColor = vC; }', transparent: true, depthWrite: false, blending: TH.AdditiveBlending, side: TH.DoubleSide });
    ribMesh = new TH.Mesh(g, m); ribMesh.frustumCulled = false; ribMesh.renderOrder = 5; if (W.scene) W.scene.add(ribMesh);
  };
  // pts：[[x,y,z],...]；w 寬（公尺）；flick 每格隨機閃
  const ribbon = (pts, w, col, life, o) => { o = o || {}; RIB.push({ pts, w, c: typeof col === 'string' ? hexc(col) : col, life, max: life, flick: !!o.flick, a: o.a == null ? 1 : o.a }); };
  const jag = (x0, y0, z0, x1, y1, z1, segs, amp) => { const p = []; for (let i = 0; i <= segs; i++) { const k = i / segs, j = i === 0 || i === segs ? 0 : amp; p.push([x0 + (x1 - x0) * k + (rnd() - 0.5) * j, y0 + (y1 - y0) * k + (rnd() - 0.5) * j * 0.6, z0 + (z1 - z0) * k + (rnd() - 0.5) * j]); } return p; };
  const lightning = (x0, y0, z0, x1, y1, z1, col, life, branch) => {
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0), segs = Math.max(3, Math.min(10, Math.round(len / 1.1))), main = jag(x0, y0, z0, x1, y1, z1, segs, Math.min(1.2, len * 0.14));
    ribbon(main, 0.5, col || '#9AD8FF', life, { flick: true, a: 0.8 }); ribbon(main, 0.13, '#FFFFFF', life, { flick: true });
    for (let b = 0; b < (branch || 0); b++) { const k = 1 + Math.floor(rnd() * (main.length - 2)), p = main[k], q = [p[0] + (rnd() - 0.5) * 2.4, Math.max(0.2, p[1] - 0.8 - rnd() * 1.6), p[2] + (rnd() - 0.5) * 2.4]; ribbon(jag(p[0], p[1], p[2], q[0], q[1], q[2], 3, 0.5), 0.09, '#E8F6FF', life * 0.8, { flick: true }); }
  };
  const _v = { x: 0, y: 0, z: 0 };
  const ribBuild = dt => {
    if (!ribMesh) return; const cam = W.camera; if (!cam) return;
    const g = ribMesh.geometry, P = g.attributes.position.array, C = g.attributes.pc.array; let q = 0;
    for (let r = RIB.length - 1; r >= 0; r--) { const o = RIB[r]; o.life -= dt; if (o.life <= 0) RIB.splice(r, 1); }
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
    for (const o of RIB) {
      const k = o.life / o.max, al = o.a * (o.flick ? (rnd() < 0.25 ? 0.35 : 1) : 1) * Math.min(1, k * 2.2);
      for (let i = 0; i + 1 < o.pts.length && q < MAXQ; i++) {
        const a = o.pts[i], b = o.pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const vx = cx - (a[0] + b[0]) / 2, vy = cy - (a[1] + b[1]) / 2, vz = cz - (a[2] + b[2]) / 2;
        let sx = dy * vz - dz * vy, sy = dz * vx - dx * vz, sz = dx * vy - dy * vx; const sl = Math.hypot(sx, sy, sz) || 1; sx *= o.w / 2 / sl; sy *= o.w / 2 / sl; sz *= o.w / 2 / sl;
        const V = [a[0] - sx, a[1] - sy, a[2] - sz, a[0] + sx, a[1] + sy, a[2] + sz, b[0] + sx, b[1] + sy, b[2] + sz, a[0] - sx, a[1] - sy, a[2] - sz, b[0] + sx, b[1] + sy, b[2] + sz, b[0] - sx, b[1] - sy, b[2] - sz];
        for (let j = 0; j < 18; j++) P[q * 18 + j] = V[j];
        for (let j = 0; j < 6; j++) { const c4 = (q * 6 + j) * 4; C[c4] = o.c[0] * al; C[c4 + 1] = o.c[1] * al; C[c4 + 2] = o.c[2] * al; C[c4 + 3] = al; }
        q++;
      }
    }
    void _v; g.setDrawRange(0, q * 6); g.attributes.position.needsUpdate = true; g.attributes.pc.needsUpdate = true;
  };

  // ---------- 元素的樣子 ----------
  const flash = (x, y, z, col, size) => emit(A, x, y, z, 0, 0, 0, 0.12, col, { size: size || 18, size1: (size || 18) * 1.4, a: 0.9 });
  const EL = {
    thunder(x, z, r, kind) {
      if (kind !== 'ring') lightning(x + (rnd() - 0.5) * 0.8, 9, z + (rnd() - 0.5) * 0.8, x, 0.1, z, '#9AD8FF', 0.22, 2);
      flash(x, 0.6, z, '#E8F6FF', 16); burst(A, x, 0.4, z, 12, 5 + r, 0.35, PAL.thunder, { up: 4, grav: 10, size: 3, size1: 1 });
    },
    fire(x, z, r) {
      flash(x, 0.6, z, '#FFB060', 14 + r * 2);
      burst(A, x, 0.3, z, 14 + r * 3, 1.2 + r * 0.6, 0.9, PAL.fire, { up: 3.2, grav: -1.5, drag: 1.5, size: 3, size1: 1 });
      burst(N, x, 0.6, z, 5 + r, 0.6 + r * 0.3, 1.1, ['#3A3430', '#4A4440'], { up: 1.6, grav: -0.6, drag: 1, size: 5, size1: 11, a: 0.6 });
      burst(N, x, 0.4, z, 10 + r * 3, 2 + r * 0.7, 0.7, ['#E8501A', '#F09030', '#D83A1A'], { up: 3.5, grav: -0.5, drag: 1.2, size: 3.5, size1: 1, a: 0.95 });
    },
    ice(x, z, r) {
      flash(x, 0.5, z, '#E8F8FF', 12 + r * 2);
      burst(A, x, 0.4, z, 14 + r * 3, 3 + r, 0.7, PAL.ice, { up: 4, grav: 12, size: 3, size1: 2 });
      burst(N, x, 0.5, z, 8 + r * 2, 3 + r, 0.8, ['#6AA8E0', '#9AD0F4'], { up: 4.5, grav: 12, size: 2.5, size1: 2, a: 0.9 });
      burst(N, x, 0.3, z, 5 + r, 0.8 + r * 0.4, 0.9, ['#CFE8FA'], { up: 0.3, drag: 2, size: 6, size1: 12, a: 0.45 });
    },
    holy(x, z, r) {
      ring(A, x, 0.2, z, 18 + r * 2, 2.5 + r, 0.45, '#FFE8A0', { size: 3, size1: 1 });
      for (let i = 0; i < n(6 + r); i++) { const a = rnd() * TAU, d = rnd() * r * 0.6; emit(N, x + Math.cos(a) * d, 0.3, z + Math.sin(a) * d, 0, 1.5 + rnd() * 3, 0, 0.9, '#D8A830', { size: 2.5, size1: 1, a: 0.85, drag: 0.5 }); }
      for (let i = 0; i < n(14 + r * 2); i++) { const a = rnd() * TAU, d = rnd() * r * 0.7; emit(A, x + Math.cos(a) * d, 0.2, z + Math.sin(a) * d, 0, 2 + rnd() * 4, 0, 0.9, PAL.holy[i % 2], { size: 3, size1: 1, drag: 0.5 }); }
    },
    shadow(x, z, r) {
      burst(N, x, 0.4, z, 9 + r * 2, 0.7 + r * 0.4, 1.2, ['#2A1A3A', '#4A2A5A', '#5A3070'], { up: 1.4, grav: -0.5, drag: 1, size: 7, size1: 16, a: 0.8 });
      for (let i = 0; i < n(10 + r * 2); i++) { const a = rnd() * TAU, d = r * (0.8 + rnd() * 0.4); emit(N, x + Math.cos(a) * d, 0.5 + rnd(), z + Math.sin(a) * d, -Math.cos(a) * d * 1.6, 0.4, -Math.sin(a) * d * 1.6, 0.6, rnd() < 0.5 ? '#8A4AC8' : '#6A2AA0', { size: 3, size1: 1.5, a: 0.95 }); }
    },
    poison(x, z, r) {
      burst(N, x, 0.3, z, 10 + r * 2, 0.5 + r * 0.4, 1.2, ['#7ABF2A', '#4E8A1A', '#A8E050'], { up: 1.2, grav: -0.8, drag: 1.2, size: 4, size1: 2, a: 0.95 });
      burst(A, x, 0.4, z, 5 + r, 0.4 + r * 0.3, 0.8, PAL.poison, { up: 1, grav: -0.6, size: 3, size1: 1 });
      burst(N, x, 0.4, z, 5 + r, 0.5 + r * 0.3, 1, ['#5A8A3A', '#78A848'], { up: 0.8, drag: 1, size: 6, size1: 11, a: 0.55 });
    },
    wind(x, z, r) {
      for (let i = 0; i < n(16 + r * 2); i++) { const a = i / 16 * TAU, d = 0.4 + rnd() * r * 0.5, t = 3 + r; emit(A, x + Math.cos(a) * d, 0.3 + rnd() * 0.8, z + Math.sin(a) * d, -Math.sin(a) * t + Math.cos(a) * 1.5, 1.5 + rnd() * 1.5, Math.cos(a) * t + Math.sin(a) * 1.5, 0.55, PAL.wind[i % 2], { size: 2.5, size1: 1, drag: 1 }); }
    },
    earth(x, z, r) {
      burst(N, x, 0.3, z, 12 + r * 2, 2 + r * 0.8, 0.85, ['#6A5A44', '#4A3A2A', '#8A7A5A'], { up: 6.5, grav: 18, size: 4.5, size1: 3.5, a: 1 });
      ring(N, x, 0.2, z, 12 + r * 2, 2 + r, 0.7, '#9A9080', { size: 6, size1: 10, a: 0.4, drag: 2 });
    },
    sound(x, z, r) {
      [0.55, 0.8, 1.05].forEach((k, j) => ring(N, x, 0.4, z, 16 + r * 2, (2.4 + r) * k, 0.5, j % 2 ? '#E888C8' : '#C858A8', { size: 2.5, size1: 1.5, a: 0.9 }));
    },
    water(x, z, r) {
      burst(A, x, 0.3, z, 12 + r * 2, 2 + r * 0.5, 0.7, PAL.water, { up: 5, grav: 14, size: 3, size1: 2 });
      ring(A, x, 0.12, z, 18, 2 + r, 0.5, '#BFE6FF', { size: 2, size1: 1 });
    }
  };
  // 子彈身後掉的粒子
  const TRAIL = {
    thunder: s => emit(A, s.x + (rnd() - 0.5) * 0.3, s.y, s.z + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 2, (rnd() - 0.5) * 2, (rnd() - 0.5) * 2, 0.15, PAL.thunder[0], { size: 2.5, size1: 1 }),
    fire: s => emit(A, s.x, s.y, s.z, (rnd() - 0.5) * 0.6, 0.8 + rnd(), (rnd() - 0.5) * 0.6, 0.4, PAL.fire[rnd() < 0.5 ? 0 : 1], { size: 3, size1: 1 }),
    ice: s => emit(A, s.x, s.y, s.z, 0, -0.5, 0, 0.35, PAL.ice[rnd() < 0.5 ? 0 : 1], { size: 2.5, size1: 1 }),
    holy: s => emit(A, s.x, s.y, s.z, 0, 0.6, 0, 0.4, PAL.holy[0], { size: 2.5, size1: 1 }),
    shadow: s => emit(N, s.x, s.y, s.z, 0, 0.4, 0, 0.5, '#3A2050', { size: 4, size1: 7, a: 0.5 }),
    poison: s => emit(A, s.x, s.y, s.z, 0, 0.5, 0, 0.5, PAL.poison[0], { size: 3, size1: 1 }),
    wind: s => emit(A, s.x, s.y, s.z, (rnd() - 0.5), 0.3, (rnd() - 0.5), 0.3, PAL.wind[0], { size: 2, size1: 1 }),
    earth: s => emit(N, s.x, s.y, s.z, 0, -0.5, 0, 0.4, '#8A7A64', { size: 3, size1: 2, a: 0.8, grav: 6 }),
    sound: s => emit(A, s.x, s.y, s.z, 0, 0.3, 0, 0.45, PAL.sound[rnd() < 0.5 ? 0 : 1], { size: 2.5, size1: 1 }),
    water: s => emit(A, s.x, s.y, s.z, 0, -0.3, 0, 0.35, PAL.water[0], { size: 2.5, size1: 1 })
  };

  // ---------- 你的範圍技能落點：技能顏色的圈（不用遺跡生物的紅色預警） ----------
  const MARKS = [];
  const markFx = (x, z, r, t, col) => {
    const TH = THREE; const c = col || '#FFFFFF';
    const g = MARKS.g || (MARKS.g = new TH.RingGeometry(0.9, 1, 40)); g.userData.shared = true;
    const m = new TH.Mesh(g, new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthWrite: false, side: TH.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.09, z); m.scale.set(r, r, 1); m.renderOrder = 2; W.scene.add(m);
    MARKS.push({ m, t: 0, life: Math.max(0.15, t || 0.3), r, x, z, c });
  };
  const markStep = dt => {
    for (let i = MARKS.length - 1; i >= 0; i--) {
      const k = MARKS[i]; k.t += dt; const u = k.t / k.life;
      if (u >= 1 || k.m.parent !== W.scene) { if (k.m.parent) k.m.parent.remove(k.m); k.m.material.dispose(); MARKS.splice(i, 1); continue; }
      k.m.material.opacity = 0.5 + 0.4 * Math.sin(k.t * 14); const s = k.r * (1.15 - 0.15 * u); k.m.scale.set(s, s, 1);
      if (A && rnd() < 0.5) { const a = rnd() * TAU; emit(A, k.x + Math.cos(a) * k.r, 0.15, k.z + Math.sin(a) * k.r, 0, 0.8, 0, 0.35, k.c, { size: 2.5, size1: 1 }); }
    }
  };

  // ---------- 接上 R.addFx（最外層） ----------
  const pix = () => !!(W.scene && W.scene.userData.pix);
  const fx0 = R.addFx;
  R.addFx = (kind, x, y, z, o) => {
    o = o || {};
    if (!window.THREE || !W.scene || !pix()) return fx0(kind, x, y, z, o);
    try {
      sys(); ribInit();
      const ctx = CUR, el0 = ctx && ctx.el, el = el0 === 'multi' ? byColor(o.color || ctx.col) : el0, r = o.r || 2, FQ = R.FXQ && R.FXQ.handles(kind) ? R.FXQ : null;   // FQ：fx1011.js 的貼圖面片（取代原本純色的形狀）
      // 原本一顆一顆小方塊的：改成粒子
      if (kind === 'spark') { const cols = o.crit ? ['#FFE28A', '#FFFFFF'] : ['#FFF6D8', '#FFE8B0']; for (let i = 0; i < n(o.crit ? 12 : 7); i++) { const an = (o.a || 0) + (rnd() - 0.5) * 1.8, sp = 3 + rnd() * (o.crit ? 7 : 5); emit(A, x, y, z, Math.sin(an) * sp, 1 + rnd() * 3, Math.cos(an) * sp, o.crit ? 0.3 : 0.22, cols[i % 2], { size: o.crit ? 3.5 : 2.5, size1: 1, grav: 10 }); } if (o.crit) { ring(A, x, y, z, 14, 6, 0.16, '#FFFFFF', { size: 3, size1: 1 }); flash(x, y, z, '#FFF0C0', 12); } if (FQ) FQ.fx('spark', x, y, z, o, el); return; }
      if (kind === 'poof' || kind === 'spawn') { const c = o.color || (el && PAL[el] ? PAL[el][0] : '#FFFFFF'); for (let i = 0; i < n(o.n || 10); i++) emit(A, x, y, z, (rnd() - 0.5) * 6, rnd() * 5 + (kind === 'spawn' ? 2 : 0), (rnd() - 0.5) * 6, 0.6, c, { size: 3.5, size1: 1.5, grav: 6, drag: 1.5 }); if (el && EL[el] && kind === 'poof' && (o.n || 10) >= 6) EL[el](x, z, 1.2, kind); if (FQ && kind === 'poof') FQ.fx('poof', x, y, z, Object.assign({}, o, { color: o.color || (el && PAL[el] ? PAL[el][0] : null) }), el); return; }
      if (kind === 'dust') { for (let i = 0; i < n(o.n || 6); i++) emit(N, x, y, z, (rnd() - 0.5) * 3, rnd() * 1.5, (rnd() - 0.5) * 3, 0.5, '#B8B0A0', { size: 4, size1: 8, a: 0.45, drag: 2 }); return; }
      // 連鎖閃電：鋸齒（白芯＋外光），一次畫完
      if (kind === 'bolt' && o.to) { lightning(x, y || 1.1, z, o.to.x, o.to.y != null ? o.to.y : 1.1, o.to.z, o.color || '#7FC8FF', 0.25, 1); emit(A, o.to.x, 1.1, o.to.z, 0, 0, 0, 0.1, '#E8F6FF', { size: 10, size1: 14, a: 0.8 }); return; }
      // 你的範圍技能落點
      if (kind === 'mark' && ctx) { const mc = ctx.col || (el && PAL[el] ? PAL[el][0] : '#FFFFFF'); if (FQ) FQ.fx('mark', x, y, z, { r, t: o.t, color: mc }); else markFx(x, z, r, o.t, mc); return; }
      // 雷的光柱：換成劈下來的閃電
      if (kind === 'pillar' && el === 'thunder') { EL.thunder(x, z, o.r || 1, kind); if (R.FXQ) R.FXQ.el('thunder', x, z, o.r || 1); return; }
      if (FQ && kind !== 'mark') FQ.fx(kind, x, y, z, Object.assign({}, o, { color: o.color || (ctx && ctx.col) || (el && PAL[el] ? PAL[el][0] : undefined) }), el); else fx0(kind, x, y, z, o);
      // 從天上落下來的（隕石、流星……）：落地那一下多一道劃下來的光
      if (ctx && ctx.fall && el !== 'thunder' && (kind === 'boom' || kind === 'pillar')) { const c = el && PAL[el] ? PAL[el][0] : (o.color || '#FFFFFF'), sx = x + 2.2, sz = z - 1.4; ribbon([[sx, 11, sz], [x + 1.1, 5.5, z - 0.7], [x, 0.4, z]], 0.55, c, 0.16, { a: 0.9 }); ribbon([[sx, 11, sz], [x, 0.4, z]], 0.16, '#FFFFFF', 0.12, {}); }
      // 轉職路線的大招：落地、擊中的那一下跳出路線徽記（fx1011.js；2026-10-10 作者：只有大招顯示徽記，一般技能不用）
      if (ctx && ctx.adv && ctx.ult && !ctx.motifDone && R.FXQ && R.FXQ.motif && /^(boom|ring|pillar|groundwave|slash|rain)$/.test(kind) && !(ctx.motifAfter && W.run && W.run.t < ctx.motifAfter)) { const sx = kind === 'slash' && o.len ? x + Math.sin(o.a || 0) * o.len * 0.6 : x, sz = kind === 'slash' && o.len ? z + Math.cos(o.a || 0) * o.len * 0.6 : z; if (R.FXQ.motif(ctx.adv, sx, sz, (o.r || 2) * 1.3)) ctx.motifDone = 1; }
      // 光環類（aura）每 0.2 秒就一圈：同一招的光環 0.3 秒最多加一次元素
      const rt = W.run ? W.run.t : 0, okRing = kind !== 'ring' || !ctx || !(ctx.ringT > rt); if (kind === 'ring' && ctx && okRing) ctx.ringT = rt + 0.3;
      if (el && EL[el] && okRing && (kind === 'boom' || kind === 'ring' || kind === 'pillar' || kind === 'groundwave' || kind === 'rain')) { EL[el](x, z, Math.min(5, kind === 'pillar' ? (o.r || 1) * 1.5 : r), kind); if (R.FXQ) R.FXQ.el(el, x, z, Math.min(5, kind === 'pillar' ? (o.r || 1) * 1.5 : r)); }
      else if (kind === 'slash' && o.len) { const a = o.a || 0, c = (el && PAL[el] ? PAL[el][0] : null) || o.color || '#FFFFFF'; for (let i = 0; i < n(10); i++) { const d = rnd() * o.len; emit(A, x + Math.sin(a) * d, 0.6 + rnd() * 0.6, z + Math.cos(a) * d, (rnd() - 0.5) * 1.5, 1 + rnd() * 2, (rnd() - 0.5) * 1.5, 0.35, c, { size: 3, size1: 1 }); } if (!FQ) ribbon([[x, 0.9, z], [x + Math.sin(a) * o.len, 0.9, z + Math.cos(a) * o.len]], 0.25, c, 0.18, { a: 0.8 }); }
      else if (kind === 'blink' && el && PAL[el]) burst(A, x, y || 1, z, 12, 4, 0.3, PAL[el], { size: 3, size1: 1 });
    } catch (e) { return fx0(kind, x, y, z, o); }
  };
  // 從天上落下來的：隕石、流星（fx 是 boom、元素是火、在 at／storm 裡）——落地前拉一道火光
  const aoe0 = R.aoe;
  // ---------- 每一格 ----------
  let trailT = 0;
  const step = dt => {
    if (!A || !pix()) return;
    trailT -= dt; const doTrail = trailT <= 0; if (doTrail) trailT = Q() < 1 ? 0.06 : 0.03;
    if (doTrail) (W.shots || []).forEach(s => { if (!s.dead && s.fxEl && TRAIL[s.fxEl]) TRAIL[s.fxEl](s); });
    stepSys(A, dt); stepSys(N, dt); ribBuild(dt); markStep(dt);
  };
  const st0 = R.step; R.step = dt => { const r = st0(dt); try { step(dt); } catch (e) { } return r; };
  const ts0 = R.townStep; R.townStep = dt => { const r = ts0(dt); try { if (W.town && !W.town.ck) step(dt); } catch (e) { } return r; };
  // 換樓層：清掉
  const lf0 = R.loadFloor; if (lf0) R.loadFloor = (...a) => { RIB.length = 0; MARKS.splice(0).forEach(k => { if (k.m.parent) k.m.parent.remove(k.m); k.m.material.dispose(); }); [A, N].forEach(s => { if (s) s.life.fill(0); }); return lf0(...a); };
  void aoe0;
  R.fx1010 = { elemOf, EL, PAL, lightning, ribbon, emit, ring, burst, flash, runCtx, ensure: () => { if (window.THREE && W.scene) { sys(); ribInit(); } return !!A; }, sys: () => [A, N], ribs: RIB, cur: () => CUR };
})(window.R);
