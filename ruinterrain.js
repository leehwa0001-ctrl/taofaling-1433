// 遺跡的「牆」換成地形（2026-10-04 作者：遺跡的多樣性還是沒有很多，有些層牆壁應該可以改成丘陵或者樹林）
// 蓋好一層之後，照這一層的景色（biome.js）或特殊環境，把磚牆換成：
//   密林：一片林子（矮土丘上一棵一棵的闊葉樹、松樹）；平原：起伏的草丘（有時候丘上長幾棵樹）；
//   洞窟：粗糙的岩塊（偶爾冒出發光的大蘑菇）；晶洞：岩塊＋晶柱；岩漿海：焦黑的岩塊＋枯樹；
//   古代遺構：磚牆照舊，有時候牆頂長出樹（荒廢的遺構）。
//   特殊環境：凍原＝積雪的松林、沙漠＝沙丘＋仙人掌、深海＝礁岩＋珊瑚、火山＝焦岩。
// 牆的碰撞不變（還是走不進去）；擋住人物、遺跡生物時一樣變半透明（dungeon.js 的 updateCutaway，樹也跟著藏起來）。
// 城區型（房子、窗戶）的古代遺構不換。
// 放在 biome.js、hunt.js、tidy2.js 後面（包 R.loadFloor、R.updateCutaway 最外面）。
(function (R) {
  const W = () => R.W, T = () => THREE;
  const hash = (...a) => { let h = 2166136261; for (const c of a.join(',')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

  // ---------- 點陣的樹（畫在小畫布上，再當看板） ----------
  const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const outline = (c, col) => {
    const x = c.getContext('2d'), w = c.width, h = c.height, a = x.getImageData(0, 0, w, h).data, out = x.getImageData(0, 0, w, h), o = out.data;
    const on = (i, j) => i >= 0 && j >= 0 && i < w && j < h && a[(j * w + i) * 4 + 3] > 0, rgb = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = (j * w + i) * 4; if (a[k + 3]) continue; if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) { o[k] = rgb[0]; o[k + 1] = rgb[1]; o[k + 2] = rgb[2]; o[k + 3] = 255; } }
    x.putImageData(out, 0, 0);
  };
  const ART = {};
  const art = (kind, n) => {
    const key = kind + n; if (ART[key]) return ART[key];
    let s = 97 + n * 31 + kind.length * 7; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    let c, x, P;
    const mk = (w, h) => { c = cvs(w, h); x = c.getContext('2d'); P = (a, b, ww, hh, col) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); }; };
    const blob = (cx, cy, rx, ry, pal) => { for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) { const d = (i * i) / (rx * rx) + (j * j) / (ry * ry); if (d > 1 + (r() - 0.5) * 0.25) continue; const lit = (-i * 0.6 - j) / (rx + ry) + (r() - 0.5) * 0.35; P(cx + i, cy + j, 1, 1, lit > 0.35 ? pal[3] : lit > 0 ? pal[2] : lit > -0.4 ? pal[1] : pal[0]); } };
    if (kind === 'broad' || kind === 'jungle') {
      const pal = kind === 'broad' ? ['#244A26', '#326A30', '#4A8A3E', '#7AB85A'] : ['#1A3A22', '#24502A', '#346A34', '#5A9A4A'];
      const rw = 8 + n * 2, w = rw * 2 + 6, h = 30 + n * 6; mk(w, h); const cx = Math.floor(w / 2);
      P(cx - 1, h - 12, 3, 12, '#4A3424'); P(cx - 1, h - 12, 1, 12, '#6A4A34'); P(cx - 3, h - 2, 7, 2, '#3A2A1C');
      blob(cx, Math.floor(h * 0.42), rw, Math.floor(rw * 0.85), pal); blob(cx - Math.floor(rw * 0.55), Math.floor(h * 0.5), Math.floor(rw * 0.55), Math.floor(rw * 0.5), pal); blob(cx + Math.floor(rw * 0.55), Math.floor(h * 0.48), Math.floor(rw * 0.55), Math.floor(rw * 0.5), pal);
    } else if (kind === 'pine' || kind === 'snowpine') {
      const L = 3 + n, hw = Math.ceil(3 + (L - 1) * 1.8), w = hw * 2 + 4, h = L * 5 + 9, cx = w / 2; mk(w, h);
      for (let i = 0; i < L; i++) { const y0 = 3 + i * 5, half = 3 + i * 1.8, l = Math.round(cx - half), ww = Math.round(half * 2); P(l, y0 + 2, ww, 4, '#2E5A3A'); P(l, y0 + 5, ww, 1, '#1E4A2A'); P(l + 1, y0 + 2, Math.max(1, ww - 3), 1, kind === 'snowpine' ? '#F4F8FA' : '#4A7A4A'); if (kind === 'snowpine') P(l + 2, y0 + 3, Math.max(1, ww - 6), 1, '#DDE8EE'); }
      P(cx - 1, 1, 2, 3, kind === 'snowpine' ? '#F4F8FA' : '#3E6A44'); P(cx - 2, h - 6, 4, 5, '#4A3424'); P(cx - 2, h - 6, 1, 5, '#6A4A34');
    } else if (kind === 'dead') {
      const w = 22 + n * 4, h = 30 + n * 6; mk(w, h); const cx = Math.floor(w / 2);
      P(cx - 1, h - 14, 3, 14, '#2A201C'); P(cx - 1, h - 14, 1, 14, '#4A3A30');
      const br = (bx, by, dx, len, dp) => { let px = bx, py = by; for (let i = 0; i < len; i++) { px += dx * (r() < 0.7 ? 1 : 0); py -= 1; P(Math.round(px), py, 1, 1, '#2A201C'); if (r() < 0.08) P(Math.round(px), py, 1, 1, '#FF7A3A'); if (dp < 2 && r() < 0.18) br(px, py, -dx || 1, Math.floor(len * 0.5), dp + 1); } };
      for (let i = 0; i < 4 + n; i++) br(cx + (r() - 0.5) * 2, h - 12 - Math.floor(r() * 8), r() < 0.5 ? -1 : 1, 7 + Math.floor(r() * (6 + n * 2)), 0);
    } else if (kind === 'mushroom') {
      const w = 18 + n * 6, h = 22 + n * 6; mk(w, h); const cx = Math.floor(w / 2), cap = ['#1E6A6A', '#2A8A8A', '#4AC8C0', '#9AF0E0'];
      P(cx - 2, Math.floor(h * 0.4), 4, h - Math.floor(h * 0.4), '#D8D0C0'); P(cx - 2, Math.floor(h * 0.4), 1, h - Math.floor(h * 0.4), '#F2ECE0');
      blob(cx, Math.floor(h * 0.32), Math.floor(w / 2) - 1, Math.floor(h * 0.22), cap); for (let i = 0; i < 5; i++) P(cx - 6 + Math.floor(r() * 12), Math.floor(h * 0.18) + Math.floor(r() * 6), 1, 1, '#E8FFF8');
    } else if (kind === 'crystal') {
      const w = 14 + n * 4, h = 26 + n * 8; mk(w, h); const pal = ['#4A3A8A', '#6A5AC8', '#9A8AF0', '#E0D8FF'];
      const shard = (bx, ht, wd) => { for (let j = 0; j < ht; j++) { const ww = Math.max(1, Math.round(wd * (1 - j / ht))); for (let i = 0; i < ww; i++) P(bx + i - Math.floor(ww / 2), h - 1 - j, 1, 1, i === 0 ? pal[3] : i < ww / 2 ? pal[2] : i < ww - 1 ? pal[1] : pal[0]); } };
      shard(Math.floor(w / 2), h - 2, 5 + n); shard(Math.floor(w / 2) - 4, Math.floor(h * 0.55), 3 + n); shard(Math.floor(w / 2) + 4, Math.floor(h * 0.45), 3);
    } else if (kind === 'coral') {
      const w = 20 + n * 4, h = 20 + n * 5; mk(w, h); const col = n % 2 ? ['#C84A6A', '#F07A8A'] : ['#E8883A', '#FFB86A'];
      const br = (bx, by, dx, len, dp) => { let px = bx, py = by; for (let i = 0; i < len; i++) { px += dx * (r() < 0.5 ? 1 : 0); py -= 1; P(Math.round(px), py, 2, 1, col[0]); P(Math.round(px), py, 1, 1, col[1]); if (dp < 2 && r() < 0.22) br(px, py, -dx || 1, Math.floor(len * 0.6), dp + 1); } };
      for (let i = 0; i < 3 + n; i++) br(Math.floor(w / 2) + (r() - 0.5) * 6, h - 1, r() < 0.5 ? -1 : 1, 8 + Math.floor(r() * (6 + n * 2)), 0);
    } else if (kind === 'cactus') {
      const w = 14 + n * 2, h = 22 + n * 6; mk(w, h); const cx = Math.floor(w / 2);
      P(cx - 2, 3, 5, h - 3, '#4A8A3E'); P(cx - 2, 3, 1, h - 3, '#7AB85A'); P(cx - 1, 2, 3, 1, '#4A8A3E');
      P(cx - 6, Math.floor(h * 0.4), 4, 2, '#4A8A3E'); P(cx - 6, Math.floor(h * 0.25), 2, Math.floor(h * 0.17), '#4A8A3E'); P(cx + 3, Math.floor(h * 0.55), 4, 2, '#4A8A3E'); P(cx + 5, Math.floor(h * 0.38), 2, Math.floor(h * 0.19), '#4A8A3E');
    }
    outline(c, '#141A16');
    return (ART[key] = c);
  };

  // ---------- 一片樹（同一種、同一個大小的樹共用一份形狀、材質；每棵樹記得自己長在哪一格牆上） ----------
  const field = (list, group) => {
    const TH = T(), PX = R.PIX.PX, TILT = R.PIX.TILT, groups = {}, dummy = new TH.Object3D(), out = [];
    list.forEach(t => { const k = t.kind + t.n; (groups[k] = groups[k] || []).push(t); });
    Object.keys(groups).forEach(k => {
      const L = groups[k], c = art(L[0].kind, L[0].n), tex = new TH.CanvasTexture(c); tex.magFilter = tex.minFilter = TH.NearestFilter; tex.generateMipmaps = false; tex.encoding = TH.sRGBEncoding;
      const Wm = c.width * PX, Hm = c.height * PX * TILT, geo = new TH.PlaneGeometry(Wm, Hm); geo.translate(0, Hm / 2 - PX * TILT, 0);
      const mat = new TH.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: TH.DoubleSide, emissive: L[0].kind === 'mushroom' || L[0].kind === 'crystal' ? '#3A3A5A' : '#000000' });
      const im = new TH.InstancedMesh(geo, mat, L.length); im.frustumCulled = false; im.renderOrder = 1; group.add(im); out.push({ im, L });
    });
    let lastYaw = null;
    const update = (yaw, force) => {
      if (yaw === lastYaw && !force) return; lastYaw = yaw;
      out.forEach(({ im, L }) => { L.forEach((t, i) => { dummy.position.set(t.x, t.hide ? -60 : t.y, t.z); dummy.rotation.set(0, yaw, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); im.instanceMatrix.needsUpdate = true; });
    };
    update(W().cam ? W().cam.yaw : 0, true);
    return { update, out, list };
  };

  // ---------- 地形的種類 ----------
  // geo：牆的形狀（單位大小，y 從 −0.5 到 0.5，dungeon.js 的 updateCutaway 照 (TS, 高, TS) 縮放）；h：看得到的高度；occ：擋視線的高度（樹林是樹的高度）
  const GEO = {};
  // 每種形狀做三個不一樣的（頂點照位置亂推一點，岩塊、土丘才不會一模一樣）
  const jitter = (g, amt, seed) => {
    const pa = g.attributes.position, v = new (T().Vector3)();
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); const k = 1 + (hash(seed, v.x.toFixed(3), v.y.toFixed(3), v.z.toFixed(3)) - 0.5) * amt; pa.setXYZ(i, v.x * k, v.y < -0.49 ? v.y : v.y * k, v.z * k); }
    g.computeVertexNormals(); return g;
  };
  const geoOf = (k, n) => {
    const key = k + (n || 0); if (GEO[key]) return GEO[key]; const TH = T(); let g;
    if (k === 'dome') { g = new TH.SphereGeometry(0.5, 9 + (n || 0), 5, 0, Math.PI * 2, 0, Math.PI / 2); g = g.toNonIndexed(); g.scale(1.38, 2, 1.38); g.translate(0, -0.5, 0); jitter(g, 0.22, key); }
    else if (k === 'rock') { g = (n === 1 ? new TH.IcosahedronGeometry(0.62, 0) : n === 2 ? new TH.OctahedronGeometry(0.66, 1) : new TH.DodecahedronGeometry(0.64, 0)).toNonIndexed(); g.scale(1, 0.78, 1); jitter(g, 0.35, key); }
    else { g = new TH.BoxGeometry(1, 1, 1); }
    g.userData.shared = true; return (GEO[key] = g);
  };
  const STYLE = {
    trees: { geo: 'dome', tex: 'ground', col: ['#2E4A2A', '#34522E', '#2A4426'], base: '#24381F', h: () => 0.55 + Math.random() * 0.35, occ: 4.4, trees: e => (e ? 2 : Math.random() < 0.75 ? 1 : 0), kinds: ['broad', 'broad', 'broad', 'jungle', 'pine'] },
    hill: { geo: 'dome', tex: 'ground', col: ['#6A8A44', '#7A9A4E', '#5E7E3E', '#86A458'], base: '#4E6A34', h: (e, nz) => (e ? 1.1 : 1.6) + nz * 1.6, trees: e => (!e && Math.random() < 0.06 ? 1 : 0), kinds: ['broad'] },
    hilltrees: { geo: 'dome', tex: 'ground', col: ['#5E7E3E', '#6A8A44', '#567638'], base: '#46602E', h: (e, nz) => (e ? 0.9 : 1.3) + nz * 1.2, occ: 4.2, trees: e => (Math.random() < (e ? 0.45 : 0.3) ? 1 : 0), kinds: ['broad', 'pine'] },
    rock: { geo: 'rock', tex: 'stone', col: ['#5A5248', '#4E463E', '#665C50', '#4A4440'], base: '#2E2A26', h: (e, nz, h0) => h0 * (0.8 + nz * 0.5), trees: e => (e && Math.random() < 0.05 ? 1 : 0), kinds: ['mushroom'] },
    crystalrock: { geo: 'rock', tex: 'stone', col: ['#3A3450', '#2E2A44', '#46405E'], base: '#1E1A2C', h: (e, nz, h0) => h0 * (0.8 + nz * 0.5), trees: e => (e && Math.random() < 0.2 ? 1 : 0), kinds: ['crystal'] },
    lavarock: { geo: 'rock', tex: 'stone', col: ['#3A2620', '#2E201C', '#46302A'], base: '#1A100C', h: (e, nz, h0) => h0 * (0.8 + nz * 0.5), trees: e => (e && Math.random() < 0.05 ? 1 : 0), kinds: ['dead'] },
    snowpine: { geo: 'dome', tex: 'ground', col: ['#E4ECF0', '#D8E2EA', '#EEF2F6'], base: '#C8D4DE', h: () => 0.5 + Math.random() * 0.3, occ: 4.4, trees: e => (e ? 2 : Math.random() < 0.7 ? 1 : 0), kinds: ['snowpine'] },
    dune: { geo: 'dome', tex: 'ground', col: ['#C8A870', '#D4B47A', '#BC9C64'], base: '#A88A58', h: (e, nz) => (e ? 1 : 1.4) + nz * 1.4, trees: e => (e && Math.random() < 0.06 ? 1 : 0), kinds: ['cactus'] },
    coral: { geo: 'rock', tex: 'stone', col: ['#2A4A58', '#244050', '#30566A'], base: '#14303C', h: (e, nz, h0) => h0 * (0.75 + nz * 0.5), trees: e => (e && Math.random() < 0.18 ? 1 : 0), kinds: ['coral'] },
    overgrown: { keep: 1, trees: e => (Math.random() < (e ? 0.12 : 0.18) ? 1 : 0), kinds: ['broad', 'jungle'], onTop: 1 }
  };
  const NAME = { trees: '這一層的牆是一片樹林。', hill: '這一層是起伏的草丘。', hilltrees: '草丘上長著樹。', rock: '', crystalrock: '', lavarock: '', snowpine: '', dune: '', coral: '', overgrown: '荒廢的遺構，牆頂長出了樹。' };
  const styleOf = run => {
    if (!run || !run.site || run.site.outdoor || run.site.id === 'kanko' || !run.grade || run.grade.id === 'hunt') return null;
    const h = hash(run.site.id, run.floor);
    if (run.env) return { snow: 'snowpine', desert: 'dune', deep: 'coral', volcano: 'lavarock' }[run.env] || null;
    const b = run.biome;
    if (b === 'forest') return h < 0.8 ? 'trees' : 'hilltrees';
    if (b === 'plain') return h < 0.55 ? 'hill' : 'hilltrees';
    if (b === 'cave') return 'rock';
    if (b === 'crystal') return 'crystalrock';
    if (b === 'lava') return 'lavarock';
    if ((b === 'ruin' || !b) && run.type !== 'city') return h < 0.3 ? 'overgrown' : h < 0.42 ? 'rock' : null;
    return null;
  };

  // ---------- 換上去 ----------
  const restyle = (F, run, style) => {
    const cfg = STYLE[style], t = F.tile; if (!cfg || !t || !F.wallH || !F.wallH.length || !F.group) return;
    const TH = T(), TS = t.TS, n = F.wallH.length, group = F.group, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const isFloor = (x, z) => x >= 0 && z >= 0 && x < t.nx && z < t.nz && t.T[z * t.nx + x] === 1;
    const edgeOf = i => { const k = F.wallTile[i], tx = k % t.nx, tz = (k - tx) / t.nx; return N4.some(([dx, dz]) => isFloor(tx + dx, tz + dz)); };
    const nz = (x, z) => { const a = Math.sin(x * 0.37 + 1.3) * Math.cos(z * 0.29 + 0.7), b = Math.sin(x * 0.11 - z * 0.13); return Math.max(0, Math.min(1, 0.5 + a * 0.3 + b * 0.25)); };
    const trees = [];
    if (!cfg.keep) {
      F.wallMeshes.concat(F.ghosts || []).forEach(m => group.remove(m));
      if (F.winMesh) { group.remove(F.winMesh); F.winMesh = null; F.wins = []; }
      const pix = R.pixelOn && R.pixelOn(), mat = pix && R.pixMat ? R.pixMat(cfg.tex) : new TH.MeshLambertMaterial({ color: '#FFFFFF' }); mat.flatShading = cfg.geo === 'rock';
      const gm = new TH.MeshLambertMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.2, depthWrite: false });
      // 2026-10-10：每種形狀只放選到它的那幾格（以前三個 mesh 都放滿、沒選到的縮成 0——縮成 0 一樣要算頂點，草丘一層 50 幾萬個三角形）
      F.wallPick = new Uint8Array(n); F.wallRotY = new Float32Array(n); F.wallSX = new Float32Array(n); F.wallSlot = new Int32Array(n);
      const cnt = [0, 0, 0]; for (let i = 0; i < n; i++) { const k = F.wallTile[i], tx = k % t.nx, tz = (k - tx) / t.nx, pk = Math.floor(hash('p', tx, tz) * 3) % 3; F.wallSlot[i] = cnt[pk]++; }
      const bodies = [0, 1, 2].map(v => new TH.InstancedMesh(geoOf(cfg.geo, v), mat, Math.max(1, cnt[v]))), ghosts = [0, 1, 2].map(v => new TH.InstancedMesh(geoOf(cfg.geo, v), gm, Math.max(1, cnt[v])));
      bodies.forEach((b, j) => { b.count = cnt[j]; }); ghosts.forEach(g => { g.count = 0; g.visible = false; });
      const base = new TH.InstancedMesh(geoOf('box'), pix && R.pixMat ? R.pixMat(cfg.tex) : new TH.MeshLambertMaterial({ color: '#FFFFFF' }), n);
      const m4 = new TH.Matrix4(), q = new TH.Quaternion(), p = new TH.Vector3(), sc = new TH.Vector3(), col = new TH.Color(), zero = new TH.Matrix4().makeScale(0, 0, 0);
      F.wallVisH = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const k = F.wallTile[i], tx = k % t.nx, tz = (k - tx) / t.nx, x = t.cX(tx), z = t.cZ(tz), e = edgeOf(i), v = nz(tx, tz);
        const h = Math.max(0.35, cfg.h(e, v, F.wallH[i]));
        F.wallVisH[i] = h; F.wallH[i] = Math.max(h, cfg.occ || 0);
        const pk = Math.floor(hash('p', tx, tz) * 3) % 3, ry = hash('r', tx, tz) * Math.PI * 2, sx = 0.92 + hash('s', tx, tz) * 0.22;
        F.wallPick[i] = pk; F.wallRotY[i] = ry; F.wallSX[i] = sx; q.setFromAxisAngle(new TH.Vector3(0, 1, 0), ry);
        p.set(x, h / 2, z); sc.set(TS * sx, h, TS * sx); m4.compose(p, q, sc); q.identity();
        col.set(cfg.col[Math.floor(hash(tx, tz) * cfg.col.length)]).offsetHSL(0, 0, (v - 0.5) * 0.08);
        bodies[pk].setMatrixAt(F.wallSlot[i], m4); bodies[pk].setColorAt(F.wallSlot[i], col); ghosts[pk].setColorAt(F.wallSlot[i], col);
        p.set(x, 0.04, z); sc.set(TS, 0.08, TS); m4.compose(p, q, sc); base.setMatrixAt(i, m4); base.setColorAt(i, col.set(cfg.base));
        const nt = cfg.trees ? cfg.trees(e) : 0;
        for (let j = 0; j < nt; j++) trees.push({ i, x: x + (Math.random() - 0.5) * TS * 0.7, z: z + (Math.random() - 0.5) * TS * 0.7, y: h * 0.55, kind: cfg.kinds[Math.floor(Math.random() * cfg.kinds.length)], n: 1 + Math.floor(Math.random() * 3) });
      }
      bodies.concat([base]).forEach(m => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m); }); ghosts.forEach(g => { g.frustumCulled = false; group.add(g); });
      F.wallMeshes = bodies; F.ghosts = ghosts;
      if (F.cut) F.cut.clear();
    } else {
      // 磚牆照舊，牆頂長樹（樹的根在牆頂）
      for (let i = 0; i < n; i++) {
        const k = F.wallTile[i], tx = k % t.nx, tz = (k - tx) / t.nx, x = t.cX(tx), z = t.cZ(tz), e = edgeOf(i), nt = cfg.trees(e);
        for (let j = 0; j < nt; j++) trees.push({ i, x: x + (Math.random() - 0.5) * TS * 0.5, z: z + (Math.random() - 0.5) * TS * 0.5, y: F.wallH[i] + 0.1, kind: cfg.kinds[Math.floor(Math.random() * cfg.kinds.length)], n: 1 + Math.floor(Math.random() * 2) });
        if (nt) F.wallH[i] += 3.6;   // 擋視線的高度算到樹頂（牆本身看得到的高度不變）
      }
      if (!F.wallVisH) { F.wallVisH = new Float32Array(n); for (let i = 0; i < n; i++) F.wallVisH[i] = F.wallH[i] - (trees.some(tr => tr.i === i) ? 3.6 : 0); }
    }
    trees.sort((a, b) => a.z - b.z);
    F.terrain = { style, field: trees.length ? field(trees, group) : null };
    const msg = NAME[style]; if (msg) setTimeout(() => { if (W().F === F && R.toast) R.toast(msg, '#B8E08A'); }, 2200);
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const r = lf0(f, o);
    try { const w = W(), run = w.run, F = w.F, st = styleOf(run); if (F) F.terrain = null; if (st && F && !F.terrainDone) { F.terrainDone = 1; restyle(F, run, st); } } catch (e) { console.warn('[ruinterrain]', e); }
    return r;
  };
  // 擋住的牆變半透明的時候，那一格牆上的樹也藏起來；鏡頭轉了就重新轉向
  const uc0 = R.updateCutaway;
  R.updateCutaway = dt => {
    const r = uc0(dt), F = W().F, tf = F && F.terrain && F.terrain.field; if (!tf) return r;
    let dirty = false; tf.list.forEach(tr => { const hide = F.cut.has(tr.i); if (!!tr.hide !== hide) { tr.hide = hide; dirty = true; } });
    tf.update(W().cam ? W().cam.yaw : 0, dirty);
    return r;
  };
  R.terrainStyle = () => (W().F && W().F.terrain ? W().F.terrain.style : null);   // 測試用
})(window.R);
