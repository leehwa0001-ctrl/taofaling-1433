// 精緻城市（六）：和風的建築和城（2026-10-08 作者給了「建設中的皇嶺」的概念圖：照完工的樣子蓋）
// 概念圖：層層石垣的台地上一座大天守、密密麻麻的多層和風高樓（每層一圈瓦的屋簷、白牆、木柱、亮著的障子窗）、
//   外圍很高的斜面石牆、雪頂的火山、紅日＋山＋浪的旗、木的燈籠柱、四周的杉林。
// 全部掛在 B 上（CK.extendBuilder 之後再加）：
//   B.bld({ style: 'wafu', … })  和風高樓：外牆用 citykit.js 的 FACADES.wafu；每層一圈屋簷，幾層往內縮一次，頂上入母屋（高的加望樓、鯱）
//   B.ishigaki(x0, z0, x1, z1, y0, y1, o)  石垣：上面那一圈＝給的框，往下越來越往外撒（扇勾配）；o.top＝頂面的材質、o.sides＝哪幾面要做
//   B.dobei(x0, z0, x1, z1, y, o)  城的土塀（白牆、黑腰、瓦的壓頂），沿著框的四邊；o.gaps＝缺口
//   B.yagura(x, z, y0, n, s, o)  櫓（n 層）；B.tenshu(x, z, y0, o) 天守（天守台＋六層、五重的屋頂、千鳥破風、鯱）
//   B.yaguraGate(x, z, ry, w, h, o)  櫓門（石垣的缺口上架一棟櫓）
//   B.nobori(x, z, ry, o)  旗桿＋大旗（昭旭的紋：紅日、雪頂的藍山、三道浪；下面藍色）；B.hata(x, y, z, ry, w, h)  掛在牆上的旗
//   B.chochin(x, z, ry, o)  木的燈籠柱（晚上亮）
//   B.forest(rect, n, o)  城外的杉林（便宜的圓錐）
//   CK.volcano(B, x, z, o)  雪頂的火山（山頂冒煙）
//   CK.hipGeo(w, d, o)  少頂點的寄棟屋頂；o.ring＝只做一圈屋簷（和風高樓、櫓的每一層）
// 放在 citykit5.js 後面。
(function (R) {
  const CK = R.CK, W = R.W, T = () => THREE; if (!CK) return;

  // ---------- 少頂點的屋頂 ----------
  // w、d：裡面那一圈（牆、或上一層的牆）的大小；o.o：從裡面那一圈到屋簷的水平距離；o.h：屋簷到頂的高度（ring：到裡面那一圈的高度）
  // 屋簷在 y＝0；回傳 { top, under, edge, H, slope }
  const HIP = new Map();
  CK.hipGeo = (w, d, o) => {
    o = o || {}; const ov = o.o == null ? 0.8 : o.o, ring = !!o.ring, sori = o.sori || 0, th = o.th || 0.16, fine = !!o.fine;
    const Wh = w / 2 + ov, Dh = d / 2 + ov, H = o.h == null ? (ring ? ov * 0.5 : Dh * 0.5) : o.h, rl = Math.max(0, Wh - Dh) * (ring ? 0 : 1);
    const key = [w, d, ov, H, sori, th, ring ? 1 : 0, fine ? 1 : 0].map(v => (+v).toFixed(2)).join('|'); if (HIP.has(key)) return HIP.get(key);
    const TH = T(); let S = fine ? [0, 0.04, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 0.96, 1] : [0, 0.1, 0.5, 0.9, 1], TT = ring ? [0, 1] : fine ? [0, 0.3, 0.62, 1] : [0, 0.5, 1];
    const sag = ring ? 0 : H * 0.07, reach = ov * 1.8 + 0.8;
    // 四面：屋簷那一邊（e0→e1）、上面那一邊（t0→t1）
    const iw = w / 2, id = d / 2;
    const F = [
      { e0: [-Wh, Dh], e1: [Wh, Dh], t0: ring ? [-iw, id] : [-rl, 0], t1: ring ? [iw, id] : [rl, 0], out: [0, 1] },
      { e0: [Wh, -Dh], e1: [-Wh, -Dh], t0: ring ? [iw, -id] : [rl, 0], t1: ring ? [-iw, -id] : [-rl, 0], out: [0, -1] },
      { e0: [Wh, Dh], e1: [Wh, -Dh], t0: ring ? [iw, id] : [rl, 0], t1: ring ? [iw, -id] : [rl, 0], out: [1, 0] },
      { e0: [-Wh, -Dh], e1: [-Wh, Dh], t0: ring ? [-iw, -id] : [-rl, 0], t1: ring ? [-iw, id] : [-rl, 0], out: [-1, 0] }
    ];
    const lift = (s, L) => { const m = Math.min(s, 1 - s) * L, k = Math.max(0, 1 - m / reach); return sori * k * k; };
    const mk = (dy, down) => {
      const pos = [], uv = [], idx = [];
      F.forEach(f => {
        const L = Math.hypot(f.e1[0] - f.e0[0], f.e1[1] - f.e0[1]), base = pos.length / 3;
        TT.forEach(t => S.forEach(s => {
          const ex = f.e0[0] + (f.e1[0] - f.e0[0]) * s, ez = f.e0[1] + (f.e1[1] - f.e0[1]) * s, tx = f.t0[0] + (f.t1[0] - f.t0[0]) * s, tz = f.t0[1] + (f.t1[1] - f.t0[1]) * s;
          const x = ex + (tx - ex) * t, z = ez + (tz - ez) * t, y = H * t - sag * Math.sin(Math.PI * t) + lift(s, L) * (1 - t) * (1 - t) + dy;
          pos.push(x, y, z); uv.push(s * L, t * Math.hypot(Dh, H));
        }));
        const n = S.length;
        for (let j = 0; j < TT.length - 1; j++) for (let i = 0; i < n - 1; i++) { const a = base + j * n + i, b = a + 1, c = a + n, e = c + 1; idx.push(a, b, c, b, e, c); }
      });
      // 朝向：上面那片朝上、下面那片朝下（每個三角形自己檢查）
      for (let k = 0; k < idx.length; k += 3) {
        const A = idx[k] * 3, B2 = idx[k + 1] * 3, C = idx[k + 2] * 3;
        const ux = pos[B2] - pos[A], uy = pos[B2 + 1] - pos[A + 1], uz = pos[B2 + 2] - pos[A + 2], vx = pos[C] - pos[A], vy = pos[C + 1] - pos[A + 1], vz = pos[C + 2] - pos[A + 2];
        const ny = uz * vx - ux * vz; if ((ny < 0) !== down) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
      }
      const g = new TH.BufferGeometry(); g.setAttribute('position', new TH.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new TH.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
    };
    const top = mk(0, false), SF = S, TF = TT; S = [0, 0.1, 0.5, 0.9, 1]; TT = ring ? [0, 1] : [0, 0.5, 1]; const under = mk(-th, true); S = SF; TT = TF;   // 底面粗一點（2026-10-09：三角形少很多；保留角的起翹、中間的下凹，才不會穿出屋頂）
    // 屋簷的邊（往外）
    const ep = [], eu = [], ei = [];
    F.forEach(f => {
      const L = Math.hypot(f.e1[0] - f.e0[0], f.e1[1] - f.e0[1]), base = ep.length / 3;
      S.forEach(s => { const x = f.e0[0] + (f.e1[0] - f.e0[0]) * s, z = f.e0[1] + (f.e1[1] - f.e0[1]) * s, y = lift(s, L); ep.push(x, y, z, x, y - th, z); eu.push(s * L, 0, s * L, th); });
      for (let i = 0; i < S.length - 1; i++) {
        const a = base + i * 2, b = a + 2;
        // 三角形 (a, a+1, b) 的法線（水平的部分）要朝外（f.out）
        const ux = ep[(a + 1) * 3] - ep[a * 3], uy = ep[(a + 1) * 3 + 1] - ep[a * 3 + 1], uz = ep[(a + 1) * 3 + 2] - ep[a * 3 + 2], vx = ep[b * 3] - ep[a * 3], vy = ep[b * 3 + 1] - ep[a * 3 + 1], vz = ep[b * 3 + 2] - ep[a * 3 + 2];
        const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
        if (nx * f.out[0] + nz * f.out[1] >= 0) ei.push(a, a + 1, b, b, a + 1, b + 1); else ei.push(a, b, a + 1, b, b + 1, a + 1);
      }
    });
    const edge = new TH.BufferGeometry(); edge.setAttribute('position', new TH.Float32BufferAttribute(ep, 3)); edge.setAttribute('uv', new TH.Float32BufferAttribute(eu, 2)); edge.setIndex(ei); edge.computeVertexNormals();
    const out = { top, under, edge, H, slope: H / (ring ? ov : Dh), Wh, Dh, rl };
    [top, under, edge].forEach(g => { g.userData.shared = true; });
    HIP.set(key, out); return out;
  };

  // ---------- 石垣（扇勾配） ----------
  const ISHI = new Map();
  CK.ishiGeo = (w, d, hgt, o) => {
    o = o || {}; const bt = o.batter == null ? 0.3 : o.batter, pw = o.pw || 1.8, rows = 6, sides = o.sides || 'nesw';
    const key = [w, d, hgt, bt, pw, sides].join('|'); if (ISHI.has(key)) return ISHI.get(key);
    const TH = T(), b = hgt * bt, pos = [], idx = [];
    const SD = { s: [[-1, 1], [1, 1], [0, 1]], n: [[1, -1], [-1, -1], [0, -1]], e: [[1, 1], [1, -1], [1, 0]], w: [[-1, -1], [-1, 1], [-1, 0]] };
    [...sides].forEach(sd => {
      const D = SD[sd]; if (!D) return; const base = pos.length / 3;
      for (let j = 0; j <= rows; j++) {
        const t = j / rows, y = hgt * (1 - t), off = b * Math.pow(t, pw);
        [D[0], D[1]].forEach(([sx, sz]) => pos.push(sx * (w / 2 + off), y, sz * (d / 2 + off)));
      }
      for (let j = 0; j < rows; j++) { const a = base + j * 2, c = a + 2; idx.push(a, a + 1, c, a + 1, c + 1, c); }
      // 朝外
      const A = idx.length - 6;
      { const p = pos, i0 = idx[A] * 3, i1 = idx[A + 1] * 3, i2 = idx[A + 2] * 3, ux = p[i1] - p[i0], uz = p[i1 + 2] - p[i0 + 2], uy = p[i1 + 1] - p[i0 + 1], vx = p[i2] - p[i0], vy = p[i2 + 1] - p[i0 + 1], vz = p[i2 + 2] - p[i0 + 2], nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
        if (nx * D[2][0] + nz * D[2][1] < 0) for (let k = idx.length - rows * 6; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; } }
    });
    const g = new TH.BufferGeometry(); g.setAttribute('position', new TH.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.userData.shared = true;
    ISHI.set(key, g); return g;
  };

  // ---------- 旗的紋（昭旭：紅日、雪頂的藍山、三道浪；下面藍色、燕尾） ----------
  let BANNER = null;
  const bannerMat = () => {
    if (BANNER) return BANNER;
    // 2026-10-09 作者給了正式的昭旭紋章：白底；紅日＋細長的光芒（上半圈和兩側，下面被山擋住）；深藍的山（中間一座高的、兩邊各一座小的，
    //   中間那座蓋住太陽的下緣）；下面三道浪，最上面那道兩端捲起來。旗：上面白底畫紋章，下面深藍、燕尾。
    const TH = T(), c = document.createElement('canvas'); c.width = 256; c.height = 640; const g = c.getContext('2d');
    const NAVY = '#0B3463', RED = '#C8202A';
    g.fillStyle = '#F6F4EE'; g.fillRect(0, 0, 256, 640);
    // 紋章（照原圖 1448×1086 的座標畫，再縮放）：寬 205～1245、高 155～865
    const sc = 252 / 1040; g.save(); g.translate(2 - 205 * sc, 96 - 155 * sc); g.scale(sc, sc);
    const SX = 728, SY = 452;
    // 光芒：角度（度，往上為正）、長度
    g.fillStyle = RED;
    [[90, 296], [115, 276], [65, 276], [138, 278], [42, 278], [162, 274], [18, 274], [185, 286], [-5, 286], [208, 267], [-28, 267]].forEach(([deg, L]) => {
      const t = deg * Math.PI / 180, r0 = 140, hw = 0.085, p = (r, an) => [SX + Math.cos(an) * r, SY - Math.sin(an) * r];
      const [x1, y1] = p(r0, t - hw), [x2, y2] = p(r0, t + hw), [x3, y3] = p(L, t);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x3, y3); g.lineTo(x2, y2); g.closePath(); g.fill();
    });
    g.beginPath(); g.arc(SX, SY, 122, 0, Math.PI * 2); g.fill();
    // 山：三座峰，下緣是一道浪
    g.fillStyle = NAVY; g.beginPath();
    g.moveTo(402, 668); g.quadraticCurveTo(470, 630, 535, 575); g.lineTo(575, 604); g.quadraticCurveTo(620, 568, 655, 528); g.lineTo(661, 536); g.lineTo(728, 462);
    g.lineTo(795, 536); g.lineTo(801, 528); g.quadraticCurveTo(836, 568, 885, 604); g.lineTo(920, 575); g.quadraticCurveTo(985, 630, 1050, 668);
    g.quadraticCurveTo(980, 700, 900, 690); g.quadraticCurveTo(810, 676, 728, 656); g.quadraticCurveTo(640, 676, 560, 690); g.quadraticCurveTo(470, 700, 402, 668); g.closePath(); g.fill();
    // 浪：沿著中線、兩端變細的帶子
    const band = (x0, x1, yf, w) => { const N = 48, up = [], dn = []; for (let i = 0; i <= N; i++) { const x = x0 + (x1 - x0) * i / N, y = yf(x), k = Math.sin(Math.PI * i / N) ** 0.6 * w / 2; up.push([x, y - k]); dn.push([x, y + k]); } g.beginPath(); up.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); dn.reverse().forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fill(); };
    band(340, 1115, x => 726 - 20 * Math.cos(2 * Math.PI * (x - 730) / 380), 46);
    band(205, 1245, x => 796 - 34 * Math.cos(2 * Math.PI * (x - 300) / 900), 48);
    band(530, 880, x => 862 - 46 * Math.sin(Math.PI * (x - 530) / 350), 36);
    // 兩端的捲
    g.strokeStyle = NAVY; g.lineCap = 'round';
    [[352, 676, 1], [1104, 676, -1]].forEach(([cx, cy, sd]) => { g.lineWidth = 26; g.beginPath(); if (sd > 0) g.arc(cx, cy, 38, Math.PI * 0.4, Math.PI * 1.72, false); else g.arc(cx, cy, 38, Math.PI * 0.6, Math.PI * -0.72, true); g.stroke(); g.lineWidth = 10; g.beginPath(); g.arc(cx + sd * 15, cy + 3, 9, 0, Math.PI * 2); g.stroke(); });
    g.restore();
    // 下面深藍、上緣微彎、燕尾
    g.fillStyle = NAVY; g.beginPath(); g.moveTo(0, 400); g.quadraticCurveTo(128, 372, 256, 392); g.lineTo(256, 640); g.lineTo(0, 640); g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(66, 642); g.lineTo(128, 578); g.lineTo(190, 642); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over';
    const t = new TH.CanvasTexture(c); t.encoding = TH.sRGBEncoding; t.anisotropy = 4; t.userData.shared = true;
    const m = new TH.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: 0, side: TH.DoubleSide, alphaTest: 0.5 });
    // 風：旗的下半部跟著時間飄（上面綁著不動）
    m.onBeforeCompile = sh => { sh.uniforms.uTime = CK.U.uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  float fl_ = 1.0 - uv.y; transformed += objectNormal * sin(uTime * 2.1 + position.x * 0.31 + position.z * 0.27 + uv.y * 5.0) * 0.22 * fl_;'); };
    m.customProgramCacheKey = () => 'tflBanner';
    m.userData.shared = true; m.userData.tile = [1, 1];
    CK.mats['banner|zhaoxu'] = m;
    return (BANNER = m);
  };
  CK.bannerMat = bannerMat;

  const WCOL = ['#F4F0E6', '#ECE6D8', '#E6DECE'];   // 外牆的顏色（少幾種：每一種是一個材質，太多會多很多次繪製）
  let TREE = null;
  const treeGeo = TH => {
    if (TREE) return TREE;
    const P2 = [], N2 = [], U2 = [];
    [[0.18, 0.5, 1], [0.42, 0.42, 0.76], [0.64, 0.36, 0.5]].forEach(([yy, hh, rk]) => { const c = new TH.ConeGeometry(0.5 * rk, hh, 6, 1, true).translate(0, yy + hh / 2, 0).toNonIndexed(); P2.push(...c.attributes.position.array); N2.push(...c.attributes.normal.array); U2.push(...c.attributes.uv.array); });
    TREE = new TH.BufferGeometry(); TREE.setAttribute('position', new TH.Float32BufferAttribute(P2, 3)); TREE.setAttribute('normal', new TH.Float32BufferAttribute(N2, 3)); TREE.setAttribute('uv', new TH.Float32BufferAttribute(U2, 2)); TREE.userData.shared = true;
    return TREE;
  };

  const eb0 = CK.extendBuilder;
  CK.extendBuilder = B => {
    eb0(B);
    const TH = B.TH, g = B.g, M = CK.M, P = B.part, BOX = B.box, rnd = B.rnd, rr = B.rr, pk = B.pk;
    const facMat = CK.facMat;
    const kawaraD = () => M('kawara', { col: '#767C88' });
    const LAMP = () => CK.mat('chochinLamp', { col: '#FFF0D8', em: '#FFC27A', ei: 0, lamp: true, snow: 0 });
    const RED = () => CK.mat('chochinRed', { col: '#E8503A', em: '#FF6A3A', ei: 0, lamp: true, snow: 0 });
    // 屋頂（用 CK.hipGeo）：x、z＝中心，y＝屋簷高，ry；mat；o.edge、o.under
    const hip = (x, y, z, w, d, ry, mat, o) => {
      o = o || {}; const rf = CK.hipGeo(w, d, o), tile = mat.userData.tile || [2.4, 1.8];
      P(rf.top, mat, x, y, z, 1, 1, 1, 0, ry || 0, 0, { uv: 'keep', us: 1 / tile[0], vs: 1 / tile[1] });
      P(rf.under, M(o.under || 'woodD'), x, y, z, 1, 1, 1, 0, ry || 0, 0, { uv: 'keep', us: 0.6, vs: 0.6 });
      P(rf.edge, M(o.edge || o.under || 'woodD'), x, y, z, 1, 1, 1, 0, ry || 0, 0, { uv: 'keep', us: 0.6, vs: 3 });
      return rf;
    };
    B.hip = hip;
    // 屋頂的脊、鯱、入母屋的山牆（三角形）：在 hip 的上面
    const ridge = (x, y, z, rf, ry, o) => {
      o = o || {}; const c = Math.cos(ry || 0), s = Math.sin(ry || 0), L = rf.rl * 2 + 0.5;
      if (rf.rl > 0.05) P(g.box, M('black'), x, y + rf.H + 0.1, z, L, 0.3, 0.36, 0, ry || 0, 0, { noFac: true });
      if (o.gable) [-1, 1].forEach(sd => { const gx = x + c * sd * (rf.rl + 0.25), gz = z - s * sd * (rf.rl + 0.25), gw = rf.Dh * 0.62, gh = rf.H * 0.42; P(g.prism, M(o.gableMat || 'white'), gx, y + rf.H - gh + 0.02, gz, gw, gh, 0.14, 0, (ry || 0) + Math.PI / 2, 0); });
      if (o.shachi) [-1, 1].forEach(sd => { const ex = x + c * sd * (rf.rl + 0.2), ez = z - s * sd * (rf.rl + 0.2); P(g.cone8, M('gold'), ex, y + rf.H + 0.75, ez, 0.42 * o.shachi, 1.0 * o.shachi, 0.42 * o.shachi, sd * 0.35, ry || 0, 0); });
    };
    B.ridge = ridge;

    // ---------- 和風高樓 ----------
    const FACEOF = (f, x0, z0, x1, z1) => ({ s: [z1, x0, x1], n: [z0, x0, x1], e: [x1, z0, z1], w: [x0, z0, z1] })[f];
    const wafu = o => {
      const [x0, z0, x1, z1] = o.r, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, f = o.face || 's';
      const Ht = Math.max(8, o.h || 24), col = o.col || pk(WCOL), RM = o.roofMat ? M(o.roofMat) : rnd() < 0.82 ? kawaraD() : M('copper'), acc = o.accent === undefined ? (rnd() < 0.3 ? 'verm' : null) : o.accent;
      const wall = facMat('wafu', col), G1 = 3.6, FL = 3.6, ry = w >= d ? 0 : Math.PI / 2;
      BOX(M('concD'), x0 - 0.1, 0, z0 - 0.1, x1 + 0.1, 0.4, z1 + 0.1);
      BOX(M('woodB'), x0, 0.4, z0, x1, G1, z1);
      // 一樓的正面：亮著的格子／店面、暖簾、紅燈籠
      const fd = FACEOF(f, x0, z0, x1, z1), along = f === 's' || f === 'n', sg = f === 's' || f === 'e' ? 1 : -1, c0 = fd[0], L0 = fd[1], L1 = fd[2], mid = (L0 + L1) / 2;
      const onF = (a, b, y0, y1, dz, mat) => { if (along) BOX(mat, a, y0, Math.min(c0, c0 + sg * dz), b, y1, Math.max(c0, c0 + sg * dz)); else BOX(mat, Math.min(c0, c0 + sg * dz), y0, a, Math.max(c0, c0 + sg * dz), y1, b); };
      onF(L0 + 0.5, L1 - 0.5, 0.5, G1 - 0.9, 0.04, M(o.name || rnd() < 0.6 ? 'shopLit' : 'lattice'));
      onF(L0 + 0.3, L1 - 0.3, G1 - 0.9, G1 - 0.6, 0.08, M('woodB'));
      if (o.name) {
        B.sign(o.name, f, c0 + sg * 0.1, mid, G1 - 0.32, { size: Math.min(0.62, (L1 - L0 - 1) / ([...o.name].length + 0.5)), bg: '#2A1E16', fg: '#F4E2B0', lit: 1 });
        const nm = CK.mat('noren|' + (o.noren || '#2A3A5A'), { tex: 'paint', col: o.noren || '#2A3A5A', rough: 0.9 }); onF(mid - 1.2, mid + 1.2, G1 - 1.7, G1 - 0.92, 0.1, nm);
      }
      [L0 + 0.7, L1 - 0.7].forEach(a => { const [lx, lz] = along ? [a, c0 + sg * 0.45] : [c0 + sg * 0.45, a]; P(g.cyl8, RED(), lx, G1 - 1.25, lz, 0.42, 0.6, 0.42); P(g.cyl8, M('black'), lx, G1 - 0.9, lz, 0.3, 0.08, 0.3); });
      // 一樓上面的屋簷（比較寬）
      hip(cx, G1 - 1.2 * 0.5 + 0.02, cz, w, d, 0, RM, { o: 1.2, ring: true, h: 0.6, sori: 0.25 });
      // 樓層：幾層往內縮一次
      const nF = Math.max(1, Math.round((Ht - G1) / FL)), step = o.step || (rnd() < 0.5 ? 3 : 4), sb = rr(0.5, 0.85);
      let y = G1, ins = 0, segY = G1;
      for (let i = 0; i < nF; i++) {
        const last = i === nF - 1, nextIns = !last && (i + 1) % step === 0 && Math.min(w, d) - 2 * (ins + sb) > 5.5 ? ins + sb : ins;
        if (nextIns !== ins || last) { BOX(wall, x0 + ins, segY, z0 + ins, x1 - ins, y + FL, z1 - ins); segY = y + FL; }
        if (acc && i % 2 === 0) BOX(M(acc), x0 + ins - 0.06, y + FL - 0.62, z0 + ins - 0.06, x1 - ins + 0.06, y + FL - 0.5, z1 - ins + 0.06);
        if (!last) { const ov = 0.75, run = (nextIns - ins) + ov; hip(cx, y + FL - ov * 0.5 + 0.03, cz, w - 2 * nextIns, d - 2 * nextIns, 0, RM, { o: run, ring: true, h: run * 0.5, sori: 0.22 }); }
        y += FL; ins = nextIns;
      }
      // 頂：入母屋（高的加望樓）
      const tw = w - 2 * ins, td = d - 2 * ins, tall = nF >= 7 && Math.min(tw, td) > 6.5;
      const top = (bw, bd, by, s) => { const ov = 1.0 * s, rf = CK.hipGeo(Math.max(bw, bd), Math.min(bw, bd), { o: ov, h: (Math.min(bw, bd) / 2 + ov) * 0.62, sori: 0.45 * s }); const ye = by - rf.slope * ov + 0.05; hip(cx, ye, cz, Math.max(bw, bd), Math.min(bw, bd), ry, RM, { o: ov, h: rf.H, sori: 0.45 * s }); ridge(cx, ye, cz, rf, ry, { gable: true, shachi: s >= 1 && Ht > 26 ? 1 : 0 }); return ye + rf.H; };
      let topY;
      if (tall) {
        const ow = tw * 0.55, od = td * 0.55;
        hip(cx, y - 0.45, cz, ow, od, 0, RM, { o: (tw - ow) / 2 + 0.8, ring: true, h: ((tw - ow) / 2 + 0.8) * 0.45, sori: 0.3 });
        BOX(wall, cx - ow / 2, y, cz - od / 2, cx + ow / 2, y + 3.2, cz + od / 2);
        topY = top(ow, od, y + 3.2, 0.8);
      } else topY = top(tw, td, y, 1);
      B.solid(x0, z0, x1, z1, 'house'); B.foot([x0, z0, x1, z1], 'wafu', topY);
      if (o.vsign) { const a = rnd() < 0.5 ? L0 + 0.8 : L1 - 0.8, [bx, bz] = along ? [a, c0 + sg * 0.5] : [c0 + sg * 0.5, a]; B.blade(o.vsign, bx, Math.min(y - 2, 6.4 + [...o.vsign].length * 0.32), bz, (along ? (f === 's' ? 0 : Math.PI) : (f === 'e' ? Math.PI / 2 : -Math.PI / 2)) + Math.PI / 2, { bg: pk(['#8A1A1A', '#1A2A4A', '#F4E8C8']), fg: pk(['#FFF4D8', '#FFE24A', '#2A1A10']), lit: 1, size: 0.6 }); }
      return { r: o.r, h: topY };
    };
    const bld0 = B.bld;
    B.bld = o => (o && o.style === 'wafu' ? wafu(o) : bld0(o));

    // ---------- 石垣 ----------
    B.ishigaki = (x0, z0, x1, z1, y0, y1, o) => {
      o = o || {}; const w = x1 - x0, d = z1 - z0, hgt = y1 - y0; if (hgt <= 0.05) return;
      const geo = CK.ishiGeo(+w.toFixed(2), +d.toFixed(2), +hgt.toFixed(2), o);
      P(geo, M(o.mat || 'ishi'), (x0 + x1) / 2, y0, (z0 + z1) / 2, 1, 1, 1, 0, 0, 0);
      if (o.top) P(g.plane, M(o.top, { ground: 1 }), (x0 + x1) / 2, y1 + 0.02, (z0 + z1) / 2, w, d, 1, -Math.PI / 2, 0, 0);
      if (o.solid) B.solid(x0 - hgt * (o.batter == null ? 0.3 : o.batter), z0 - hgt * 0.3, x1 + hgt * 0.3, z1 + hgt * 0.3, 'wall');
    };
    // ---------- 土塀 ----------
    B.dobei = (x0, z0, x1, z1, y, o) => {
      o = o || {}; const h = o.h || 2.0, t = 0.45, k = o.ins == null ? 0.5 : o.ins;
      let segs = [];
      const sd = o.sides || 'nesw';
      if (sd.includes('n')) segs.push([x0 + k, z0 + k, x1 - k, z0 + k + t]);
      if (sd.includes('s')) segs.push([x0 + k, z1 - k - t, x1 - k, z1 - k]);
      if (sd.includes('w')) segs.push([x0 + k, z0 + k, x0 + k + t, z1 - k]);
      if (sd.includes('e')) segs.push([x1 - k - t, z0 + k, x1 - k, z1 - k]);
      if (o.gaps && o.gaps.length) segs = CK.util.subAll(segs, o.gaps);
      segs.forEach(q => {
        if (q[2] - q[0] < 0.2 || q[3] - q[1] < 0.2) return;
        BOX(M('white'), q[0], y, q[1], q[2], y + h, q[3]);
        BOX(M('black'), q[0] - 0.03, y, q[1] - 0.03, q[2] + 0.03, y + 0.6, q[3] + 0.03);
        const ax = q[2] - q[0] > q[3] - q[1];
        BOX(M('kawara', { col: '#767C88' }), q[0] - (ax ? 0.1 : 0.32), y + h, q[1] - (ax ? 0.32 : 0.1), q[2] + (ax ? 0.1 : 0.32), y + h + 0.2, q[3] + (ax ? 0.32 : 0.1));
        BOX(M('black'), q[0] + (ax ? 0 : 0.12), y + h + 0.2, q[1] + (ax ? 0.12 : 0), q[2] - (ax ? 0 : 0.12), y + h + 0.36, q[3] - (ax ? 0.12 : 0));
        if (o.solid) B.solid(q[0], q[1], q[2], q[3], 'wall');
      });
    };
    // ---------- 櫓 ----------
    B.yagura = (x, z, y0, n, s, o) => {
      o = o || {}; s = s || 1; let y = y0, w = (o.w || 8) * s, d = (o.d || 7) * s; const wall = facMat('shiro', '#F6F4EE'), RM = o.roofMat ? M(o.roofMat) : kawaraD(), ry = w >= d ? 0 : Math.PI / 2;
      for (let i = 0; i < n; i++) {
        const hh = (i === 0 ? 3.6 : 3.2) * s, last = i === n - 1;
        BOX(wall, x - w / 2, y, z - d / 2, x + w / 2, y + hh, z + d / 2);
        if (i === 0) BOX(M('black'), x - w / 2 - 0.03, y, z - d / 2 - 0.03, x + w / 2 + 0.03, y + 0.7 * s, z + d / 2 + 0.03);
        if (!last) { const nw = w - 1.6 * s, nd = d - 1.4 * s, ov = 0.9 * s, run = 0.8 * s + ov; hip(x, y + hh - ov * 0.55, z, nw, nd, 0, RM, { o: run, ring: true, h: run * 0.55, sori: 0.35 * s, fine: s > 1.2, edge: 'white', under: 'white' }); w = nw; d = nd; }
        else { const ov = 1.0 * s, rf = CK.hipGeo(Math.max(w, d), Math.min(w, d), { o: ov, h: (Math.min(w, d) / 2 + ov) * 0.6, sori: 0.5 * s, fine: true }); const ye = y + hh - rf.slope * ov + 0.04; hip(x, ye, z, Math.max(w, d), Math.min(w, d), ry, RM, { o: ov, h: rf.H, sori: 0.5 * s, fine: true, edge: 'white', under: 'white' }); ridge(x, ye, z, rf, ry, { gable: true, shachi: o.shachi === false ? 0 : 0.8 * s }); }
        y += hh;
      }
      return y;
    };
    // ---------- 櫓門：石垣的缺口上面架一棟長的櫓 ----------
    B.yaguraGate = (x, z, ry, w, h, o) => {
      o = o || {}; const dp = o.d || 9, RM = kawaraD();
      B.frame(x, z, ry, () => {
        const wall = facMat('shiro', '#F6F4EE'), gw = w + 6, H2 = 5.2;
        BOX(wall, -gw / 2, h, -dp / 2, gw / 2, h + H2, dp / 2); BOX(M('black'), -gw / 2 - 0.03, h, -dp / 2 - 0.03, gw / 2 + 0.03, h + 0.9, dp / 2 + 0.03);
        BOX(M('woodB'), -w / 2, h - 1.0, -dp / 2, w / 2, h, dp / 2);   // 門的上樑
        [-1, 1].forEach(sd => { BOX(M('woodB'), sd * w / 2 - 0.5, 0, -0.5, sd * w / 2 + 0.5, h - 1, 0.5); });   // 門柱
        if (o.doors) { BOX(M('woodB'), -w / 2 + 0.5, 0, -0.15, -0.05, h - 1, 0.15); BOX(M('woodB'), 0.05, 0, -0.15, w / 2 - 0.5, h - 1, 0.15); for (let i = 0; i < 5; i++) [-w / 4, w / 4].forEach(a => P(g.sph, M('bronze'), a, 1.2 + i * (h - 2.6) / 4, 0.2, 0.18, 0.18, 0.08)); }
        const ov = 1.2, rf = CK.hipGeo(gw, dp, { o: ov, h: (dp / 2 + ov) * 0.55, sori: 0.55, fine: true }); const ye = h + H2 - rf.slope * ov + 0.04;
        hip(0, ye, 0, gw, dp, 0, RM, { o: ov, h: rf.H, sori: 0.55, fine: true, edge: 'white', under: 'white' }); ridge(0, ye, 0, rf, 0, { gable: true, shachi: 0.9 });
        if (o.name) B.sign(o.name, 's', dp / 2 + 0.06, 0, h + 3.2, { size: 0.8, bg: '#2A1E16', fg: '#F4E2B0' });
      });
    };
    // ---------- 天守：天守台＋六層、五重的屋頂（每一層都比下面小）、千鳥破風、最上面的入母屋和金鯱 ----------
    B.tenshu = (x, z, y0, o) => {
      o = o || {}; const k = o.s || 1, W0 = o.w || 26, D0 = o.d || 20, base = o.base || 6, floors = o.floors || 6, RM = o.roofMat ? M(o.roofMat) : kawaraD(), wall = facMat('shiro', '#F8F6F0');
      B.ishigaki(x - W0 / 2 - 0.8, z - D0 / 2 - 0.8, x + W0 / 2 + 0.8, z + D0 / 2 + 0.8, y0, y0 + base, { batter: 0.32 });
      let y = y0 + base, w = W0, d = D0;
      for (let i = 0; i < floors; i++) {
        const hh = (i === 0 ? 5.2 : 4.2) * k, last = i === floors - 1;
        BOX(wall, x - w / 2, y, z - d / 2, x + w / 2, y + hh, z + d / 2);
        if (i === 0) BOX(M('black'), x - w / 2 - 0.04, y, z - d / 2 - 0.04, x + w / 2 + 0.04, y + 1.0 * k, z + d / 2 + 0.04);
        if (!last) {
          const shr = (i < 2 ? 2.0 : 1.5) * k, nw = w - 2 * shr, nd = d - 2 * shr, ov = 1.6 * k, run = shr + ov;
          hip(x, y + hh - ov * 0.55, z, nw, nd, 0, RM, { o: run, ring: true, h: run * 0.55, sori: 0.75, fine: true, edge: 'white', under: 'white' });
          // 千鳥破風（正面、背面；側面錯開）
          if (i < floors - 2) [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([ax, az], k) => {
            if ((k + i) % 2) return; const fw = Math.min(8, (ax ? d : w) * 0.36), px = x + ax * (w / 2 + ov * 0.35), pz = z + az * (d / 2 + ov * 0.35), r2 = ax ? Math.PI / 2 : 0;
            P(g.prism, M('white'), px, y + hh + 0.15, pz, fw, 2.2, 0.3, 0, r2, 0);
            B.roof(px, pz, 2.6, fw + 0.6, { type: 'gable', y: y + hh + 0.15, h: 2.3, o: 0.35, ry: r2 + Math.PI / 2, mat: 'kawara', sori: 0.1, gableWall: false, ridge: false, under: 'white', edge: 'white' });
          });
          w = nw; d = nd;
        } else {
          const ov = 1.8 * k, ry = w >= d ? 0 : Math.PI / 2, rf = CK.hipGeo(Math.max(w, d), Math.min(w, d), { o: ov, h: (Math.min(w, d) / 2 + ov) * 0.62, sori: 0.9, fine: true }), ye = y + hh - rf.slope * ov + 0.05;
          hip(x, ye, z, Math.max(w, d), Math.min(w, d), ry, RM, { o: ov, h: rf.H, sori: 0.9, fine: true, edge: 'white', under: 'white' });
          ridge(x, ye, z, rf, ry, { gable: true, shachi: 1.8 });
          y = ye + rf.H;
        }
        if (!last) y += hh;
      }
      B.foot([x - W0 / 2, z - D0 / 2, x + W0 / 2, z + D0 / 2], 'castle', y);
      return y;
    };
    // ---------- 旗 ----------
    B.nobori = (x, z, ry, o) => {
      o = o || {}; const h = o.h || 9, bw = o.w || 1.8, bh = o.bh || 4.6, c = Math.cos(ry || 0), s = Math.sin(ry || 0), side = o.side || 1;
      P(g.cyl8, M('woodB'), x, h / 2, z, 0.22, h, 0.22);
      P(g.sph, M('woodB'), x, h + 0.12, z, 0.3, 0.3, 0.3);
      const ax = x + c * side * (bw / 2 + 0.25), az = z - s * side * (bw / 2 + 0.25);
      P(g.box, M('woodB'), ax, h - 0.25, az, bw + 0.9, 0.14, 0.14, 0, ry || 0, 0);
      P(g.plane, bannerMat(), ax, h - 0.35 - bh / 2, az, bw, bh, 1, 0, ry || 0, 0, { uv: 'keep' });
      if (o.solid !== false) B.solid(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 'deco');
    };
    B.hata = (x, y, z, ry, w, h) => { P(g.box, M('woodB'), x, y + h / 2 + 0.1, z, w + 0.4, 0.12, 0.12, 0, ry || 0, 0); P(g.plane, bannerMat(), x, y, z, w, h, 1, 0, ry || 0, 0, { uv: 'keep' }); };
    // ---------- 木的燈籠柱 ----------
    B.chochin = (x, z, ry, o) => {
      o = o || {}; const h = o.h || 3.9, a = ry || 0, ax = x + Math.sin(a) * 0.75, az = z + Math.cos(a) * 0.75;
      P(g.box, M('woodB'), x, h / 2, z, 0.2, h, 0.2);
      P(g.box, M('woodB'), (x + ax) / 2, h - 0.12, (z + az) / 2, 0.12, 0.12, 0.95, 0, a, 0);
      P(g.box, M('black'), ax, h - 0.42, az, 0.6, 0.08, 0.6, 0, a, 0); P(g.box, LAMP(), ax, h - 0.8, az, 0.46, 0.66, 0.46, 0, a, 0); P(g.box, M('black'), ax, h - 1.17, az, 0.56, 0.08, 0.56, 0, a, 0);
      P(g.cyl8, M('black'), ax, h - 0.27, az, 0.04, 0.28, 0.04);
      B.lampAt(ax, az);
      if (o.solid !== false) B.solid(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 'deco');
    };
    // ---------- 城外的杉林：一整片用 InstancedMesh（一次畫完；每棵大小、方向、顏色有一點不一樣） ----------
    B.forest = (rect, n, o) => {
      o = o || {}; const [x0, z0, x1, z1] = rect, TH = B.TH, mats = [], base = new TH.Color(o.col || '#3A5440'), tmp = new TH.Color();
      for (let i = 0; i < n; i++) {
        const x = rr(x0, x1), z = rr(z0, z1); if (o.skip && o.skip(x, z)) continue;
        const h = rr(10, 18) * (o.s || 1), r = h * rr(0.24, 0.3), m4 = new TH.Matrix4().compose(new TH.Vector3(x, o.y != null ? o.y : CK.heightAt(x, z), z), new TH.Quaternion().setFromAxisAngle(new TH.Vector3(0, 1, 0), rr(0, 6.28)), new TH.Vector3(r * 2, h, r * 2));
        mats.push([m4, rr(0.78, 1.12)]);
      }
      if (!mats.length) return;
      // 分區塊：每一塊自己的外接球（看不到的區塊不畫；倒影裡遠的區塊也不畫）
      const CH = 480, chunks = new Map(), p = new TH.Vector3();   // 2026-10-10：160 → 480（一塊才幾棵，繪製次數太多）
      mats.forEach(q => { p.setFromMatrixPosition(q[0]); const k = Math.floor(p.x / CH) + ',' + Math.floor(p.z / CH); let c = chunks.get(k); if (!c) chunks.set(k, c = []); c.push(q); });
      const mat = CK.mat('forestTree', { tex: 'grass', col: '#FFFFFF', rough: 0.95, snow: 1.3 });
      chunks.forEach((list, k) => {
        const [ix, iz] = k.split(',').map(Number), geo = treeGeo(TH).clone(); geo.boundingSphere = new TH.Sphere(new TH.Vector3((ix + 0.5) * CH, 12, (iz + 0.5) * CH), CH * 0.72 + 12);
        const mesh = new TH.InstancedMesh(geo, mat, list.length);
        list.forEach(([m4, kk], i) => { mesh.setMatrixAt(i, m4); mesh.setColorAt(i, tmp.copy(base).multiplyScalar(kk)); });
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = false; mesh.receiveShadow = true; mesh.userData.forest = true; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); B.group.add(mesh);
      });
    };
  };

  // ---------- 火山：雪頂、山頂的火口、冒煙 ----------
  CK.volcano = (B, x, z, o) => {
    o = o || {}; const TH = T(), Rb = o.r || 620, H = o.h || 700, rc = o.crater || 46, NA = 120, NR = 36, seed = o.seed || 21;
    const pos = [], col = [], idx = [];
    const hAt = (a, r) => {
      const k = Math.min(1, r / Rb), cone = H * Math.pow(1 - k, 1.45), u = a / (Math.PI * 2), gul = 1 - Math.abs(2 * CK.fbm(u * 24, r / 60, seed, [24, 999], 2) - 1);
      let h = cone * (1 - 0.08 * gul * Math.min(1, r / 120)) + CK.fbm(u * 36, r / 90, seed + 3, [36, 999], 3) * 18 * Math.min(1, r / 150);
      if (r < rc) h = H * Math.pow(1 - rc / Rb, 1.45) - (rc - r) * 0.45;
      return h;
    };
    for (let j = 0; j <= NR; j++) {
      const r = Rb * Math.pow(j / NR, 1.25);
      for (let i = 0; i <= NA; i++) {
        const a = i / NA * Math.PI * 2, h = hAt(a % (Math.PI * 2), r);
        pos.push(x + Math.cos(a) * r, h - 4, z + Math.sin(a) * r);
      }
    }
    for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const geo = new TH.BufferGeometry(); geo.setAttribute('position', new TH.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const nrm = geo.attributes.normal.array;
    for (let k = 0; k < pos.length; k += 3) {
      const y = pos[k + 1] + 4, ny = nrm[k + 1], nz = CK.fbm(pos[k] / 70, pos[k + 2] / 70, seed + 9, 999, 3), r = Math.hypot(pos[k] - x, pos[k + 2] - z);
      let c = [0.018 + nz * 0.015, 0.03 + nz * 0.018, 0.028 + nz * 0.012];                                   // 山腳的杉林
      const rock = Math.min(1, Math.max(0, (y - H * 0.28 + nz * 60) / 120)); c = c.map((v, i) => v + ([0.06, 0.056, 0.06][i] - v) * rock);   // 上面是火山岩
      const snow = Math.min(1, Math.max(0, (y - H * (o.snow || 0.5) + nz * 90 + Math.sin(Math.atan2(pos[k + 2] - z, pos[k] - x) * 14) * 30) / 60)) * Math.min(1, Math.max(0, (ny - 0.25) * 4));
      c = c.map((v, i) => v + ([0.90, 0.92, 0.96][i] - v) * snow);
      if (r < rc * 1.1) c = c.map(v => v * 0.55);
      const hz = o.haze == null ? 0.1 : o.haze; c = c.map((v, i) => v + ([0.3, 0.38, 0.5][i] - v) * hz);   // 一點遠山的藍
      col.push(c[0], c[1], c[2]);
    }
    geo.setAttribute('color', new TH.Float32BufferAttribute(col, 3));
    const m = new TH.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, envMapIntensity: 0.35 }); m.userData.shared = false;
    // 霧只吃兩成（概念圖裡的火山很清楚；完全不吃霧的話，前面的遠山有霧、火山沒有，看起來像浮著）
    m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', '#ifdef USE_FOG\n  #ifdef FOG_EXP2\n    float fogF_ = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth * 0.2 );\n  #else\n    float fogF_ = smoothstep( fogNear, fogFar, vFogDepth ) * 0.45;\n  #endif\n  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogF_ );\n#endif'); };
    m.customProgramCacheKey = () => 'tflVolcano';
    const mesh = new TH.Mesh(geo, m); B.group.add(mesh);
    // 煙：幾團柔和的白煙，從火口慢慢往上、往東飄，越高越淡
    if (o.smoke !== false) {
      const c = document.createElement('canvas'); c.width = c.height = 64; const g2 = c.getContext('2d'), gr = g2.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.55, 'rgba(240,240,244,0.45)'); gr.addColorStop(1, 'rgba(230,230,236,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
      const tex = new TH.CanvasTexture(c), top = hAt(0, rc) - 4, puffs = [];
      for (let i = 0; i < 9; i++) { const sm = new TH.SpriteMaterial({ map: tex, color: '#E8E8EE', transparent: true, depthWrite: false, opacity: 0.6, fog: true }); const sp = new TH.Sprite(sm); sp.userData.k = i / 9; B.group.add(sp); puffs.push(sp); }
      const tw = W.town; if (tw && tw.anim) tw.anim.push((dt, t) => { puffs.forEach(sp => { const k = ((t / 70 + sp.userData.k) % 1), s = 60 + k * 260; sp.position.set(x + k * 260 + Math.sin(k * 9 + sp.userData.k * 20) * 20, top + 30 + k * 300, z + k * 60); sp.scale.set(s, s * 0.8, 1); sp.material.opacity = 0.55 * Math.sin(Math.min(1, k * 4) * Math.PI / 2) * (1 - k); }); });
    }
    return hAt;
  };
})(window.R);
