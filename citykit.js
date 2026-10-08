// 精緻城市的工具（作者 2026-10-08：「城市的需求不用太像素化了，可以精緻化……建築物和地圖直接上最高規格做」）
// 給《昭旭重要城市》的十一座城（皇嶺、吉山、府廳、西見、南瀧、渦旗、征遠、板北、板南、古森、岳北）用；之後東鶴也照這一套重做。
// 這個檔案是「底」：貼圖、材質、合併繪製、畫面（不走像素風：全解析度、反鋸齒、泛光、電影色調）、天空和光線、天氣。
// citykit2.js 是蓋東西的工具（地面、道路、水、建築、屋頂、樹、街上的小東西、人、車）和進城、每一格、地圖；
// 每一座城一個檔案（city_皇嶺.js……），用 R.CK.define({ … }) 登記。
// 規矩：
// - 世界座標是公尺，北是 -z（跟奉主一樣）。地面的高度看 heightAt（人行道、廣場高 0.12，橋、台階另外算）。
// - 所有貼圖都是程式畫的（沒有圖檔），第一次用到才畫，畫好留著（userData.shared，換場景不丟）。
// - 材質用 MeshStandardMaterial（金屬度、粗糙度、法線貼圖、天空的反光）；人物（點陣的看板）照舊。
// 放在 hosu.js、azukicities.js 後面。
(function (R) {
  const W = R.W, T = () => THREE;
  const CK = R.CK = R.CK || {};

  // ---------- 貼圖的產生器 ----------
  // 2026-10-08：第一次進城要畫三十張貼圖，在主執行緒畫要十幾秒（畫面整個卡住）。
  // 改成：LIB 整個變成字串丟進背景的 Worker 畫（OffscreenCanvas），畫好傳回 ImageBitmap；遊戲一開就先在背景畫（CK.warm）。
  // 還沒畫好的時候材質先用白色、平的替身，畫好自動換上（城一進去就看得到，貼圖晚一點浮出來）。
  // 不支援 Worker／OffscreenCanvas 的瀏覽器：在主執行緒一張一張畫（每畫一張讓畫面喘口氣）。
  // 貼圖 256×256（約每公尺 100 像素，鏡頭的距離看起來夠細）。噪聲的週期都是整數：重複的接縫看不出來。
  // LIB 裡面不能用到外面的變數（會被轉成字串）。
  function LIB(OUT) {
    const hash2 = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const smooth = t => t * t * (3 - 2 * t);
    // 可以無縫重複的值雜訊（per：一張圖幾格；[px, py] 可以橫直不同）
    const vnoise = (x, y, s, px, py) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, mx = v => ((v % px) + px) % px, my = v => ((v % py) + py) % py;
      const a = hash2(mx(xi), my(yi), s), b = hash2(mx(xi + 1), my(yi), s), c = hash2(mx(xi), my(yi + 1), s), d = hash2(mx(xi + 1), my(yi + 1), s), u = smooth(xf), v = smooth(yf);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    const fbm = (x, y, s, per, oct) => { const px = Array.isArray(per) ? per[0] : per, py = Array.isArray(per) ? per[1] : per; let v = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < (oct || 4); i++) { v += a * vnoise(x * f, y * f, s + i * 17, Math.max(1, Math.round(px * f)), Math.max(1, Math.round(py * f))); n += a; a *= 0.5; f *= 2; } return v / n; };
    const rng = s => { let q = (s >>> 0) || 1; return () => { q = (q + 0x6D2B79F5) >>> 0; let t = q; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const canvas = (w, h) => { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h || w); const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; };
    // 高度 → 法線貼圖（Sobel）
    const normalFrom = (hgt, N, k) => {
      const c = canvas(N), g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data, at = (x, y) => hgt[((y + N) % N) * N + ((x + N) % N)];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const dx = (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) - at(x + 1, y - 1) - 2 * at(x + 1, y) - at(x + 1, y + 1)) * k;
        const dy = (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) - at(x - 1, y + 1) - 2 * at(x, y + 1) - at(x + 1, y + 1)) * k;
        const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
        d[i] = (dx / l * 0.5 + 0.5) * 255; d[i + 1] = (-dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
      }
      g.putImageData(im, 0, 0); return c;
    };
    // 一張圖：f(x, y) 照「N×N」的座標畫（每個像素回傳 [r, g, b, 高度, 粗糙度]）；實際輸出 OUT×OUT（隔幾格取一點）
    const paint = (N, f) => {
      const n = Math.min(N, OUT), s = N / n;
      const c = canvas(n), g = c.getContext('2d'), im = g.createImageData(n, n), d = im.data, hgt = new Float32Array(n * n), rc = canvas(n), rg = rc.getContext('2d'), rim = rg.createImageData(n, n), rd = rim.data;
      let rough = false;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const o = f(x * s, y * s), i = (y * n + x) * 4; d[i] = clamp(o[0], 0, 255); d[i + 1] = clamp(o[1], 0, 255); d[i + 2] = clamp(o[2], 0, 255); d[i + 3] = 255; hgt[y * n + x] = o[3] || 0;
        if (o[4] != null) { rough = true; const r = clamp(o[4], 0, 1) * 255; rd[i] = r; rd[i + 1] = r; rd[i + 2] = r; rd[i + 3] = 255; }
      }
      g.putImageData(im, 0, 0); if (rough) rg.putImageData(rim, 0, 0);
      return { c, hgt, rc: rough ? rc : null, N: n, k: s };
    };
    const tint = (base, v, k) => [base[0] * (1 + (v - 0.5) * k), base[1] * (1 + (v - 0.5) * k), base[2] * (1 + (v - 0.5) * k)];
    // 每一種貼圖代表幾公尺（[寬, 高]）
    const SIZE = { asphalt: [6, 6], pavers: [2.4, 2.4], granite: [2.4, 2.4], plaster: [3, 3], concrete: [7.2, 7.2], brick: [1.8, 1.4], ashlar: [4.2, 3], ishigaki: [5, 5], kawara: [2.4, 1.8], copper: [2.7, 2.7], planks: [2, 2], lattice: [1.8, 1.8], corrugated: [2.4, 2.4], grass: [6, 6], gravel: [3, 3], sand: [5, 5], soil: [4, 4], yard: [5, 5], water: [9, 9], wood: [1.6, 1.6], paint: [2, 2], metal: [1, 1], tatami: [1.8, 1.8] };
    // nk＝法線的強度
    const GEN = {
      asphalt: () => Object.assign(paint(512, (x, y) => { const n = fbm(x / 64, y / 64, 3, 8, 4), sp = hash2(x, y, 9), b = 58 + (n - 0.5) * 26 + (sp > 0.93 ? 22 : sp < 0.05 ? -14 : 0); return [b, b + 1, b + 4, sp > 0.93 ? 0.6 : n * 0.4, 0.82 + (sp > 0.93 ? -0.25 : 0)]; }), { nk: 2.2 }),
      // 人行道：30 公分的方磚（淺灰、米色交錯），磚縫低
      pavers: () => { const N = 512, n = 8; return Object.assign(paint(N, (x, y) => { const cx = Math.floor(x / (N / n)), cy = Math.floor(y / (N / n)), fx = (x % (N / n)) / (N / n), fy = (y % (N / n)) / (N / n), gr = fx < 0.04 || fy < 0.04, t = hash2(cx, cy, 4), nz = fbm(x / 32, y / 32, 5, 16, 3), base = t < 0.25 ? [176, 168, 154] : t < 0.5 ? [160, 158, 152] : [186, 182, 172]; const c = gr ? [96, 94, 90] : tint(base, nz, 0.22); return [c[0], c[1], c[2], gr ? 0 : 0.6 + nz * 0.15, gr ? 0.95 : 0.7]; }), { nk: 3 }); },
      // 廣場：60 公分的花崗岩板，錯縫
      granite: () => { const N = 512, n = 4; return Object.assign(paint(N, (x, y) => { const row = Math.floor(y / (N / n)), xs = x + (row % 2) * (N / n / 2), cx = Math.floor(xs / (N / n)), fx = (xs % (N / n)) / (N / n), fy = (y % (N / n)) / (N / n), gr = fx < 0.025 || fy < 0.025, t = hash2(cx % n, row, 6), sp = hash2(x, y, 2), nz = fbm(x / 32, y / 32, 7, 16, 3); const b = 150 + t * 30 + (sp > 0.9 ? 18 : sp < 0.08 ? -16 : 0) + (nz - 0.5) * 20; return gr ? [92, 90, 86, 0, 0.9] : [b, b - 2, b - 6, 0.7, 0.55 + nz * 0.2]; }), { nk: 2.4 }); },
      plaster: () => Object.assign(paint(256, (x, y) => { const n = fbm(x / 32, y / 32, 11, 8, 4), st = fbm(x / 64, y / 16, 12, [4, 16], 2); const b = 222 + (n - 0.5) * 20 - Math.max(0, st - 0.62) * 50; return [b, b - 3, b - 9, n * 0.4, 0.9]; }), { nk: 1.2 }),
      // 清水混凝土：1.8×0.9 公尺的模板縫、模板孔
      concrete: () => { const N = 512; return Object.assign(paint(N, (x, y) => { const u = x / N * 4, v = y / N * 8, fu = u % 1, fv = v % 1, seam = fu < 0.008 || fv < 0.012, hole = [0.17, 0.5, 0.83].some(a => Math.hypot((fu - a) * 1.8, (fv - 0.5) * 0.9) < 0.022), n = fbm(x / 64, y / 64, 13, 8, 4), sp = hash2(x, y, 5); const b = 168 + (n - 0.5) * 26 + (sp > 0.97 ? -16 : 0) - (hole ? 50 : 0) - (seam ? 22 : 0); return [b, b + 1, b + 2, hole ? 0 : seam ? 0.3 : 0.6 + n * 0.1, 0.75]; }), { nk: 1.8 }); },
      brick: () => { const N = 512, bw = 8, bh = 21; return Object.assign(paint(N, (x, y) => { const row = Math.floor(y / (N / bh)), xs = x + (row % 2) * (N / bw / 2), cx = Math.floor(xs / (N / bw)) % bw, fx = (xs % (N / bw)) / (N / bw), fy = (y % (N / bh)) / (N / bh), m = fx < 0.05 || fy < 0.16, t = hash2(cx, row, 8), n = fbm(x / 16, y / 16, 3, 32, 3); const c = m ? [178, 172, 160] : [150 + t * 40 + (n - 0.5) * 24, 70 + t * 22 + (n - 0.5) * 12, 52 + t * 14]; return [c[0], c[1], c[2], m ? 0 : 0.7 + n * 0.2, m ? 0.95 : 0.85]; }), { nk: 3 }); },
      // 切石（官廳、銀行的牆基、護岸）
      ashlar: () => { const N = 512, n = 6; return Object.assign(paint(N, (x, y) => { const row = Math.floor(y / (N / n)), sh = Math.floor(hash2(row, 0, 21) * 3) * N / 6, xs = x + sh, w = N / 3, cx = Math.floor(xs / w) % 3, fx = (xs % w) / w, fy = (y % (N / n)) / (N / n), gr = fx < 0.02 || fy < 0.03, t = hash2(cx, row, 22), nz = fbm(x / 32, y / 32, 9, 16, 4); const b = 158 + t * 26 + (nz - 0.5) * 34; const edge = Math.min(fx, 1 - fx, fy * 2, (1 - fy) * 2); return gr ? [84, 82, 78, 0, 1] : [b, b - 3, b - 10, 0.5 + Math.min(edge * 6, 0.4) + nz * 0.2, 0.8]; }), { nk: 3 }); },
      // 石垣：大小不一的石塊（城、台地的擋土牆）
      ishigaki: () => {
        const N = 512, pts = [], r = rng(77); for (let i = 0; i < 90; i++) pts.push([r() * N, r() * N, 0.6 + r() * 0.8]);
        return Object.assign(paint(N, (x, y) => {
          let d1 = 1e9, d2 = 1e9, id = 0;
          for (let i = 0; i < pts.length; i++) { const p = pts[i]; let dx = Math.abs(x - p[0]), dy = Math.abs(y - p[1]); dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy) * 1.25; const d = Math.hypot(dx, dy) / p[2]; if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d; }
          const e = d2 - d1, gr = e < 3.5, t = hash2(id, 0, 31), nz = fbm(x / 16, y / 16, 33, 32, 4), b = 132 + t * 40 + (nz - 0.5) * 40;
          return gr ? [56, 54, 50, 0, 1] : [b, b - 4, b - 12, Math.min(1, e / 22) + nz * 0.25, 0.85];
        }), { nk: 4 });
      },
      // 瓦（本瓦葺）：u 是橫的、v 是順著屋頂往下；一條一條的圓瓦
      kawara: () => { const N = 256, n = 8; return Object.assign(paint(N, (x, y) => { const u = (x / N * n) % 1, v = (y / N * 6) % 1, ridge = Math.sin(u * Math.PI), lap = v < 0.12 ? 0.45 : 1, row = Math.floor(y / N * 6), t = hash2(Math.floor(x / N * n), row, 41), nz = fbm(x / 16, y / 16, 42, 16, 3); const b = (62 + t * 14 + ridge * 30) * lap + (nz - 0.5) * 10; return [b, b + 4, b + 12, ridge * 0.8 + (v < 0.12 ? -0.3 : 0), 0.45 + (1 - ridge) * 0.3]; }), { nk: 3 }); },
      // 銅板瓦（綠青）：直的接縫
      copper: () => { const N = 256; return Object.assign(paint(N, (x, y) => { const u = (x / N * 6) % 1, seam = u < 0.06, nz = fbm(x / 32, y / 32, 51, 8, 4), st = fbm(x / 64, y / 8, 52, [4, 32], 3); const c = [70 + nz * 40 - st * 20, 140 + nz * 34 - st * 30, 118 + nz * 26 - st * 26]; return [c[0], c[1], c[2], seam ? 1 : 0.2 + nz * 0.2, 0.55]; }), { nk: 2.5 }); },
      // 直的木板（町家、倉庫）
      planks: () => { const N = 256; return Object.assign(paint(N, (x, y) => { const u = x / N * 10, b = Math.floor(u), fu = u % 1, gap = fu < 0.05, t = hash2(b, 0, 61), gr = fbm(x / 8, y / 64, 62 + b, [32, 4], 3), c = [92 + t * 26 + (gr - 0.5) * 30, 66 + t * 18 + (gr - 0.5) * 22, 44 + t * 10 + (gr - 0.5) * 14]; return gap ? [34, 26, 20, 0, 1] : [c[0], c[1], c[2], 0.6 + gr * 0.3, 0.8]; }), { nk: 2 }); },
      // 格子（町家一樓的千本格子）：深色的木條、後面是暗的
      lattice: () => { const N = 256; return Object.assign(paint(N, (x, y) => { const u = (x / N * 12) % 1, v = (y / N * 2) % 1, bar = u < 0.45, rail = v < 0.04, gr = fbm(x / 4, y / 32, 71, [64, 8], 3); if (bar || rail) { const b = 70 + gr * 26; return [b, b * 0.72, b * 0.5, 0.8, 0.75]; } return [18, 16, 14, 0, 0.9]; }), { nk: 2.5 }); },
      corrugated: () => { const N = 256; return Object.assign(paint(N, (x, y) => { const u = x / N * 16, rib = 0.5 + 0.5 * Math.cos(u * Math.PI * 2), nz = fbm(x / 32, y / 32, 81, 8, 3), rust = Math.max(0, fbm(x / 64, y / 16, 82, [4, 16], 3) - 0.6) * 2.4; const b = 150 + rib * 40 + (nz - 0.5) * 20; return [b + rust * 40, b - rust * 30, b - rust * 50 + 8, rib, 0.45 + rust * 0.4]; }), { nk: 2 }); },
      grass: () => Object.assign(paint(512, (x, y) => { const n = fbm(x / 64, y / 64, 91, 8, 4), bl = hash2(x, Math.floor(y / 3), 92), d = fbm(x / 16, y / 16, 93, 32, 2); const c = [70 + n * 40 + bl * 18 - d * 20, 98 + n * 46 + bl * 26, 52 + n * 20]; return [c[0], c[1], c[2], bl * 0.6 + n * 0.4, 0.9]; }), { nk: 1.6 }),
      // 砂石（神社的參道、公園的步道）
      gravel: () => Object.assign(paint(512, (x, y) => { const g = hash2(Math.floor(x / 3), Math.floor(y / 3), 101), s = hash2(x, y, 102), n = fbm(x / 64, y / 64, 103, 8, 3), b = 182 + (g - 0.5) * 50 + (s - 0.5) * 12 + (n - 0.5) * 16; return [b, b - 3, b - 10, g, 0.9]; }), { nk: 2.5 }),
      sand: () => Object.assign(paint(256, (x, y) => { const n = fbm(x / 32, y / 32, 111, 8, 4), r = Math.sin((x + n * 40) / 256 * Math.PI * 2 * 28) * 0.5 + 0.5, b = 210 + (n - 0.5) * 24; return [b, b - 14, b - 44, r * 0.4 + n * 0.3, 0.95]; }), { nk: 1.2 }),
      soil: () => Object.assign(paint(256, (x, y) => { const n = fbm(x / 32, y / 32, 121, 8, 4), s = hash2(x, y, 122), b = 120 + (n - 0.5) * 40 + (s > 0.92 ? 20 : 0); return [b, b * 0.85, b * 0.66, n + (s > 0.92 ? 0.5 : 0), 0.95]; }), { nk: 1.8 }),
      // 鋪地的碎石混凝土（空地、房子後面）
      yard: () => Object.assign(paint(256, (x, y) => { const n = fbm(x / 32, y / 32, 131, 8, 4), s = hash2(x, y, 132), b = 128 + (n - 0.5) * 30 + (s > 0.9 ? 16 : s < 0.06 ? -14 : 0); return [b, b - 2, b - 4, n * 0.5 + (s > 0.9 ? 0.3 : 0), 0.9]; }), { nk: 1.5 }),
      // 水面的法線（波紋）
      water: () => { const N = Math.min(256, OUT), hgt = new Float32Array(N * N), s = 256 / N; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) hgt[y * N + x] = fbm(x * s / 32, y * s / 32, 141, 8, 4) * 0.7 + fbm(x * s / 8, y * s / 8, 142, 32, 2) * 0.3; return { c: null, hgt, N, k: s, nk: 5 }; },
      // 木頭（神社、城的柱子；深色、木紋）
      wood: () => Object.assign(paint(256, (x, y) => { const g = fbm(x / 4, y / 64, 151, [64, 4], 3), k = fbm(x / 32, y / 32, 152, 8, 2), b = 84 + (g - 0.5) * 40 + (k - 0.5) * 16; return [b, b * 0.7, b * 0.48, g, 0.7]; }), { nk: 1.4 }),
      // 塗料（朱漆、白漆）：只有一點點不平
      paint: () => Object.assign(paint(128, (x, y) => { const n = fbm(x / 32, y / 32, 161, 4, 3), b = 235 + (n - 0.5) * 18; return [b, b, b, n * 0.3, 0.55]; }), { nk: 0.6 }),
      // 榻榻米：兩張並排（0.9 公尺寬），長邊有深色的布邊，藺草一條一條
      tatami: () => { const N = 256; return Object.assign(paint(N, (x, y) => { const m = Math.floor(x / (N / 2)), fx = (x % (N / 2)) / (N / 2), edge = fx < 0.05 || fx > 0.95, straw = 0.5 + 0.5 * Math.sin(x / N * Math.PI * 2 * 64), n = fbm(x / 32, y / 32, 181 + m, 8, 3); if (edge) return [46, 58, 52, 0.7, 0.8]; const b = 0.82 + (straw - 0.5) * 0.12 + (n - 0.5) * 0.1; return [184 * b, 182 * b, 128 * b, straw * 0.5, 0.85]; }), { nk: 1.4 }); },
      // 金屬（拉絲）
      metal: () => Object.assign(paint(128, (x, y) => { const s = fbm(x / 64, y / 2, 171, [2, 64], 2), b = 200 + (s - 0.5) * 30; return [b, b, b + 4, s * 0.3, 0.35 + s * 0.2]; }), { nk: 0.5 })
    };
    const tex = name => { const o = GEN[name](); return { map: o.c, normalMap: normalFrom(o.hgt, o.N, o.nk / (o.k || 1)), roughnessMap: o.rc }; };

    // ---------- 外牆（有窗戶；晚上的燈用 emissiveMap 畫，哪幾扇亮是亂數） ----------
    // 一張圖代表 bays × floors 個「間」；tw＝一間寬幾公尺、th＝一層高幾公尺；貼的時候照每一面牆置中（窗戶不會被牆角切到）
    const FACADES = {
      // 玻璃帷幕（商務大樓）：深藍灰的玻璃、細的鋁框、樓板的窗間牆
      glass: { tw: 3, th: 3.6, bays: 6, floors: 6, draw: (g, e, r, x, y, w, h, R2) => {
        const lit = R2() < 0.42, tone = R2();
        g.fillStyle = '#9AA4AC'; g.fillRect(x, y, w, h);
        const sp = h * 0.2; g.fillStyle = '#56606A'; g.fillRect(x, y + h - sp, w, sp);
        const gx = x + w * 0.03, gy = y + h * 0.04, gw = w * 0.94, gh = h - sp - h * 0.06;
        const gr = g.createLinearGradient(gx, gy, gx + gw * 0.4, gy + gh); gr.addColorStop(0, 'rgb(' + (52 + tone * 20) + ',' + (72 + tone * 20) + ',' + (92 + tone * 16) + ')'); gr.addColorStop(1, 'rgb(' + (30 + tone * 10) + ',' + (40 + tone * 10) + ',' + (54 + tone * 10) + ')');
        g.fillStyle = gr; g.fillRect(gx, gy, gw, gh); g.fillStyle = '#8A949C'; g.fillRect(x + w / 2 - w * 0.012, gy, w * 0.024, gh);
        r.fillStyle = '#E0E0E0'; r.fillRect(x, y, w, h); r.fillStyle = '#101010'; r.fillRect(gx, gy, gw, gh);
        if (lit) { e.fillStyle = tone < 0.7 ? '#DCE8F0' : '#F2DCA8'; e.fillRect(gx, gy, gw, gh * 0.82); e.fillStyle = 'rgba(0,0,0,.5)'; for (let k = 0; k < 3; k++) if (R2() < 0.5) e.fillRect(gx + R2() * gw * 0.8, gy + gh * 0.4, gw * 0.12, gh * 0.42); }
      } },
      // 打孔窗的混凝土外牆（官廳、舊的辦公大樓）
      office: { tw: 3, th: 3.5, bays: 6, floors: 6, draw: (g, e, r, x, y, w, h, R2) => {
        const lit = R2() < 0.38, ww = w * 0.62, wh = h * 0.5, wx = x + (w - ww) / 2, wy = y + h * 0.24;
        g.fillStyle = '#26303A'; g.fillRect(wx, wy, ww, wh); g.fillStyle = 'rgba(160,190,210,.18)'; g.fillRect(wx, wy, ww * 0.5, wh);
        g.fillStyle = '#C8C4BC'; g.fillRect(wx - 2, wy - 2, ww + 4, 2); g.fillRect(wx - 3, wy + wh, ww + 6, 3);
        g.fillStyle = '#8A8E92'; g.fillRect(wx + ww / 2 - 1, wy, 2, wh); g.fillRect(wx, wy + wh * 0.35, ww, 2);
        r.fillStyle = '#121212'; r.fillRect(wx, wy, ww, wh);
        if (lit) { e.fillStyle = R2() < 0.6 ? '#F2E2B8' : '#DDEAF2'; e.fillRect(wx, wy, ww, wh); e.fillStyle = 'rgba(0,0,0,.55)'; if (R2() < 0.5) e.fillRect(wx, wy, ww * (0.2 + R2() * 0.3), wh); }
      }, wall: true },
      // 公寓：窗戶加一扇陽台門；陽台另外蓋
      apt: { tw: 3.6, th: 2.9, bays: 6, floors: 8, draw: (g, e, r, x, y, w, h, R2) => {
        const lit = R2() < 0.5, dw = w * 0.34, dh = h * 0.7, dx = x + w * 0.08, dy = y + h * 0.18, ww = w * 0.36, wh = h * 0.42, wx = x + w * 0.54, wy = y + h * 0.26;
        [[dx, dy, dw, dh], [wx, wy, ww, wh]].forEach(([a, b, c, d]) => { g.fillStyle = '#2A3440'; g.fillRect(a, b, c, d); g.fillStyle = 'rgba(180,200,215,.2)'; g.fillRect(a, b, c * 0.45, d); g.fillStyle = '#B8B8B4'; g.fillRect(a + c / 2 - 1, b, 2, d); r.fillStyle = '#121212'; r.fillRect(a, b, c, d); });
        g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y + h * 0.96, w, h * 0.04);
        if (lit) { const col = R2() < 0.7 ? '#F4D8A0' : '#E8EEF4'; e.fillStyle = col; e.fillRect(dx, dy, dw, dh); if (R2() < 0.7) e.fillRect(wx, wy, ww, wh); e.fillStyle = 'rgba(0,0,0,.4)'; e.fillRect(dx, dy, dw * (0.3 + R2() * 0.4), dh); }
      }, wall: true },
      // 小店、住家的二樓以上：小窗、拉門的毛玻璃
      house: { tw: 2.7, th: 3.0, bays: 6, floors: 6, draw: (g, e, r, x, y, w, h, R2) => {
        if (R2() < 0.25) return;
        const lit = R2() < 0.42, ww = w * (0.48 + R2() * 0.14), wh = h * 0.44, wx = x + (w - ww) / 2, wy = y + h * 0.28;
        g.fillStyle = '#30363C'; g.fillRect(wx, wy, ww, wh); g.fillStyle = '#E8E6E0'; g.fillRect(wx + 2, wy + 2, ww / 2 - 3, wh - 4); g.globalAlpha = 0.65; g.fillRect(wx + ww / 2 + 1, wy + 2, ww / 2 - 3, wh - 4); g.globalAlpha = 1;
        g.fillStyle = '#7A7E82'; g.fillRect(wx - 2, wy - 2, ww + 4, 2); g.fillRect(wx - 2, wy + wh, ww + 4, 2);
        r.fillStyle = '#383838'; r.fillRect(wx, wy, ww, wh);
        if (lit) { e.fillStyle = '#F6D69C'; e.fillRect(wx + 2, wy + 2, ww - 4, wh - 4); }
      }, wall: true },
      // 西式的磚造（銀行、領事館、大學）：拱形窗、石的窗框
      brickArch: { tw: 3.4, th: 4.2, bays: 4, floors: 4, draw: (g, e, r, x, y, w, h, R2) => {
        const lit = R2() < 0.35, ww = w * 0.42, wh = h * 0.52, wx = x + (w - ww) / 2, wy = y + h * 0.26;
        g.fillStyle = '#D8D0C0'; g.beginPath(); g.moveTo(wx - 4, wy + wh + 4); g.lineTo(wx - 4, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2 + 4, Math.PI, 0); g.lineTo(wx + ww + 4, wy + wh + 4); g.closePath(); g.fill();
        const path = c => { c.beginPath(); c.moveTo(wx, wy + wh); c.lineTo(wx, wy + ww / 2); c.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); c.lineTo(wx + ww, wy + wh); c.closePath(); };
        path(g); g.fillStyle = '#28323C'; g.fill(); g.fillStyle = '#C8C0B0'; g.fillRect(wx + ww / 2 - 1, wy + 2, 2, wh); g.fillRect(wx, wy + wh * 0.55, ww, 2);
        g.fillStyle = '#C8C0B0'; g.fillRect(x, y + h - 4, w, 4);
        path(r); r.fillStyle = '#121212'; r.fill();
        if (lit) { path(e); e.fillStyle = '#F2D8A0'; e.fill(); }
      }, wall: true, base: 'brick' },
      // 工廠：上面一排窗、浪板
      factory: { tw: 4, th: 6, bays: 4, floors: 2, draw: (g, e, r, x, y, w, h, R2) => {
        const lit = R2() < 0.5, wy = y + h * 0.12, wh = h * 0.2;
        g.fillStyle = '#3A4650'; g.fillRect(x + 3, wy, w - 6, wh); for (let k = 1; k < 4; k++) { g.fillStyle = '#9AA0A4'; g.fillRect(x + 3 + (w - 6) * k / 4 - 1, wy, 2, wh); }
        r.fillStyle = '#202020'; r.fillRect(x + 3, wy, w - 6, wh);
        if (lit) { e.fillStyle = '#E8F0E8'; e.fillRect(x + 3, wy, w - 6, wh); }
      }, wall: true, base: 'corrugated' },
      // 和風高樓（皇嶺，2026-10-08）：白漆喰、深色的木柱和橫樑、障子窗（晚上透出暖黃的光）；有的格子是小的蟲籠窗
      wafu: { tw: 3.0, th: 3.6, bays: 6, floors: 6, draw: (g, e, r, x, y, w, h, R2) => {
        // 2026-10-09 作者：窗戶太多——格子加寬；大約四成障子窗、兩成小的蟲籠窗、四成白牆（中間一條木的橫樑）
        const kind = R2(), lit = R2() < 0.5, pw = Math.max(2, w * 0.07);
        g.fillStyle = '#3A2A20'; g.fillRect(x, y, pw, h); g.fillRect(x, y + h * 0.86, w, h * 0.14); g.fillRect(x, y, w, h * 0.05);
        r.fillStyle = '#A8A8A8'; r.fillRect(x, y, pw, h); r.fillRect(x, y + h * 0.86, w, h * 0.14);
        if (kind >= 0.6) { g.fillStyle = '#4A382C'; g.fillRect(x, y + h * 0.44, w, h * 0.035); return; }
        const small = kind >= 0.4, wx = x + pw + w * (small ? 0.3 : 0.14), ww = w - pw - w * (small ? 0.6 : 0.28), wy = y + h * (small ? 0.3 : 0.2), wh = h * (small ? 0.28 : 0.5), nv = small ? 6 : 4;
        g.fillStyle = '#4A382C'; g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4); g.fillStyle = '#E4D8C0'; g.fillRect(wx, wy, ww, wh);
        const lines = c => { c.fillStyle = '#4A382C'; for (let k = 1; k < nv; k++) c.fillRect(wx + ww * k / nv - 1, wy, 2, wh); if (!small) for (let k = 1; k < 4; k++) c.fillRect(wx, wy + wh * k / 4 - 1, ww, 2); };
        lines(g); r.fillStyle = '#C0C0C0'; r.fillRect(wx, wy, ww, wh);
        if (lit) { e.fillStyle = R2() < 0.8 ? '#F8C478' : '#FFE0A8'; e.fillRect(wx, wy, ww, wh); e.fillStyle = '#000'; for (let k = 1; k < nv; k++) e.fillRect(wx + ww * k / nv - 1, wy, 2, wh); }
      }, wall: true },
      // 城（天守、櫓）：白漆喰、黑色的格子窗（晚上幾格亮著）
      shiro: { tw: 2.6, th: 4, bays: 6, floors: 4, draw: (g, e, r, x, y, w, h, R2) => {
        const lit = R2() < 0.3, ww = w * 0.46, wh = h * 0.3, wx = x + (w - ww) / 2, wy = y + h * 0.3;
        g.fillStyle = '#1E1C1E'; g.fillRect(wx, wy, ww, wh); g.fillStyle = '#5A5458'; for (let k = 1; k < 5; k++) g.fillRect(wx + ww * k / 5 - 1, wy, 2, wh);
        g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, y + h * 0.9, w, h * 0.1);
        r.fillStyle = '#606060'; r.fillRect(wx, wy, ww, wh);
        if (lit) { e.fillStyle = '#F2C070'; e.fillRect(wx, wy, ww, wh); e.fillStyle = '#000'; for (let k = 1; k < 5; k++) e.fillRect(wx + ww * k / 5 - 1, wy, 3, wh); }
      }, wall: true }
    };
    const PX = 64, FMETA = {};
    Object.keys(FACADES).forEach(k => { const F = FACADES[k]; FMETA[k] = { tw: F.tw, th: F.th, bays: F.bays, floors: F.floors }; });
    // 一張外牆圖：底（牆的材質）＋窗；顏色是白的，材質的 color 再上色（同一張圖可以做不同顏色的樓）
    const facade = name => {
      const F = FACADES[name], Wd = F.bays * PX, ch = Math.round(PX * F.th / F.tw), Ht = F.floors * ch;
      const c = canvas(Wd, Ht), e = canvas(Wd, Ht), rc = canvas(Wd, Ht), g = c.getContext('2d'), eg = e.getContext('2d'), rg = rc.getContext('2d'), R2 = rng(name.length * 977 + 13);
      eg.fillStyle = '#000'; eg.fillRect(0, 0, Wd, Ht); rg.fillStyle = '#D0D0D0'; rg.fillRect(0, 0, Wd, Ht);
      if (F.wall) {
        const im = g.createImageData(Wd, Ht), d = im.data, py = Math.max(1, Math.round(Ht / 32)), py2 = Math.max(1, Math.round(Ht / 16));
        for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
          const i = (y * Wd + x) * 4; let v;
          if (F.base === 'brick') { const bh = 6, row = Math.floor(y / bh), xs = x + (row % 2) * 8, m = (xs % 16) < 2 || (y % bh) < 1.5, t = hash2(Math.floor(xs / 16), row, 3); v = m ? [220, 214, 204] : [196 + t * 40, 112 + t * 26, 92 + t * 18]; }
          else if (F.base === 'corrugated') { const rib = 0.5 + 0.5 * Math.cos(x / 4 * Math.PI); v = [200 + rib * 40, 204 + rib * 40, 208 + rib * 40]; }
          else { const n = fbm(x / 32, y / 32, 7, [Wd / 32, py], 3), st = Math.max(0, fbm(x / 96, y / 16, 8, [Wd / 96, py2], 2) - 0.6); const b = 236 + (n - 0.5) * 16 - st * 60; v = [b, b, b]; }
          d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255;
        }
        g.putImageData(im, 0, 0);
      }
      const cw = PX;
      for (let fy = 0; fy < F.floors; fy++) for (let fx = 0; fx < F.bays; fx++) F.draw(g, eg, rg, fx * cw, Ht - (fy + 1) * ch, cw, ch, R2);
      return { map: c, emissiveMap: e, roughnessMap: rc };
    };
    return { hash2, fbm, rng, tex, facade, SIZE, FMETA, names: Object.keys(GEN), facs: Object.keys(FACADES) };
  }
  const OUT = R.touch ? 128 : 256;
  const L0 = LIB(OUT), { hash2, fbm, rng } = L0;
  CK.rng = rng; CK.hash2 = hash2; CK.fbm = fbm;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hexRGB = h => { const n = parseInt(String(h).replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  CK.hexRGB = hexRGB;

  // ---------- 貼圖：先用替身，畫好換上 ----------
  const TEX = {}, FAC = {}, READY = {}, PEND = {}, ASKED = new Set();
  const aniso = () => (W.renderer ? Math.min(8, W.renderer.capabilities.getMaxAnisotropy()) : 4);
  const PH = {};
  const phImg = kind => PH[kind] || (PH[kind] = (() => { const c = document.createElement('canvas'); c.width = c.height = 2; const g = c.getContext('2d'); g.fillStyle = { map: '#FFFFFF', normalMap: '#8080FF', roughnessMap: '#D8D8D8', emissiveMap: '#000000' }[kind]; g.fillRect(0, 0, 2, 2); return c; })());
  const mkTex = (kind, srgb) => { const TH = T(), t = new TH.Texture(phImg(kind)); t.wrapS = t.wrapT = TH.RepeatWrapping; t.anisotropy = aniso(); if (srgb) t.encoding = TH.sRGBEncoding; t.needsUpdate = true; t.userData.shared = true; t.userData.ph = true; return t; };
  // 畫好的圖放進貼圖（Worker 傳回來的 ImageBitmap 已經上下翻過，flipY 要關掉）
  const apply = (set, res) => { Object.keys(res).forEach(k => { const t = set[k], im = res[k]; if (!t || !im) return; t.image = im; t.flipY = !(typeof ImageBitmap !== 'undefined' && im instanceof ImageBitmap); t.userData.ph = false; t.needsUpdate = true; }); };
  let worker = null, wfail = false, mainQ = [], mainBusy = false;
  const done = (key, res) => { READY[key] = res; (PEND[key] || []).forEach(set => apply(set, res)); delete PEND[key]; };
  const mainGen = key => { mainQ.push(key); if (mainBusy) return; mainBusy = true; const next = () => { const k = mainQ.shift(); if (!k) { mainBusy = false; return; } const [kind, name] = k.split(':'); try { done(k, kind === 'fac' ? L0.facade(name) : L0.tex(name)); } catch (e) { console.warn('[citykit tex]', name, e); } setTimeout(next, 16); }; setTimeout(next, 0); };
  const getWorker = () => {
    if (worker || wfail) return worker;
    try {
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') throw new Error('no worker');
      const src = 'const L = (' + LIB.toString() + ')(' + OUT + ');\n'
        + 'onmessage = async e => { const { kind, name } = e.data; try { const r = kind === "fac" ? L.facade(name) : L.tex(name), out = {}, tr = []; for (const k in r) { const c = r[k]; if (!c) continue; const bm = await createImageBitmap(c, { imageOrientation: "flipY" }); out[k] = bm; tr.push(bm); } postMessage({ kind, name, out }, tr); } catch (err) { postMessage({ kind, name, err: String(err && err.stack || err) }); } };';
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = e => { const { kind, name, out, err } = e.data, key = kind + ':' + name; if (err) { console.warn('[citykit tex worker]', name, err); mainGen(key); return; } done(key, out); };
      worker.onerror = e => { console.warn('[citykit tex worker]', e.message); wfail = true; worker = null; Object.keys(PEND).forEach(mainGen); };
    } catch (e) { wfail = true; worker = null; }
    return worker;
  };
  const ask = key => { if (ASKED.has(key)) return; ASKED.add(key); const w = getWorker(), [kind, name] = key.split(':'); if (w) w.postMessage({ kind, name }); else mainGen(key); };
  const want = (key, set) => { if (READY[key]) { apply(set, READY[key]); return; } (PEND[key] = PEND[key] || []).push(set); ask(key); };
  // 遊戲一開就先在背景畫（常用的先畫）
  CK.warm = () => { ['asphalt', 'pavers', 'granite', 'yard', 'concrete', 'grass', 'gravel', 'kawara', 'paint', 'metal', 'wood', 'plaster', 'ishigaki', 'ashlar', 'brick', 'copper', 'water', 'planks', 'lattice', 'corrugated', 'sand', 'soil', 'tatami'].forEach(n => ask('tex:' + n)); L0.facs.forEach(n => ask('fac:' + n)); };
  CK.texReady = () => L0.names.every(n => READY['tex:' + n]) && L0.facs.every(n => READY['fac:' + n]);
  window.addEventListener('load', () => setTimeout(() => { try { CK.warm(); } catch (e) { } }, 6000));
  // 取貼圖：{ map, normalMap, roughnessMap, size }（替身先頂著）
  CK.tex = name => {
    if (TEX[name]) return TEX[name];
    const hasMap = name !== 'water', set = { size: L0.SIZE[name] || [4, 4], map: hasMap ? mkTex('map', true) : null, normalMap: mkTex('normalMap', false), roughnessMap: hasMap ? mkTex('roughnessMap', false) : null };
    TEX[name] = set; want('tex:' + name, set); return set;
  };
  // 外牆：{ map, emissiveMap, roughnessMap, tile, bay, floor }
  CK.facade = name => {
    if (FAC[name]) return FAC[name];
    const F = L0.FMETA[name], set = { map: mkTex('map', true), emissiveMap: mkTex('emissiveMap', true), roughnessMap: mkTex('roughnessMap', false), tile: [F.tw * F.bays, F.th * F.floors], bay: F.tw, floor: F.th };
    FAC[name] = set; want('fac:' + name, set); return set;
  };

  // ---------- 材質 ----------
  // 雪、濕（天氣）：所有城市材質共用的 uniform；朝上的面在下雪天變白、下雨天變暗變亮滑
  const U = CK.U = { uSnow: { value: 0 }, uWet: { value: 0 }, uTime: { value: 0 } };
  const MATS = {};
  const patch = (m, snowK) => {
    m.userData.snowK = { value: snowK == null ? 1 : snowK };
    m.onBeforeCompile = sh => {
      sh.uniforms.uSnow = U.uSnow; sh.uniforms.uWet = U.uWet; sh.uniforms.uSnowK = m.userData.snowK;
      // 世界座標（跟 pixel.js 的 seeThrough 同一個名字：它看到已經有了就不再加）、世界的法線
      sh.vertexShader = 'varying vec3 vWPos;\nvarying vec3 vWN;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vec4 swp = vec4( transformed, 1.0 );\n  #ifdef USE_INSTANCING\n  swp = instanceMatrix * swp;\n  #endif\n  vWPos = ( modelMatrix * swp ).xyz;\n  vWN = normalize( mat3( modelMatrix ) * objectNormal );');
      sh.fragmentShader = 'varying vec3 vWPos;\nvarying vec3 vWN;\nuniform float uSnow;\nuniform float uWet;\nuniform float uSnowK;\nfloat ckH(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\nfloat ckN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(ckH(i), ckH(i + vec2(1.0, 0.0)), f.x), mix(ckH(i + vec2(0.0, 1.0)), ckH(i + vec2(1.0, 1.0)), f.x), f.y); }\n' + sh.fragmentShader
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  float ckUp = smoothstep(0.45, 0.85, vWN.y);\n  float ckS = ckUp * uSnow * uSnowK * smoothstep(0.25, 0.65, ckN(vWPos.xz * 0.9) * 0.6 + ckN(vWPos.xz * 3.7) * 0.4 + uSnow * 0.5);\n  diffuseColor.rgb *= mix(1.0, mix(0.55, 1.0, smoothstep(0.0, 2.4, vWPos.y)), step(abs(vWN.y), 0.5));\n  diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - 0.35 * uWet * ckUp), vec3(0.86, 0.89, 0.93), ckS);\n  roughnessFactor = mix(mix(roughnessFactor, roughnessFactor * 0.35, uWet * ckUp), 0.75, ckS);');
    };
    m.customProgramCacheKey = () => 'ck';
    return m;
  };
  // o：{ col, tex, rough, metal, em, ei, op, side, nk, snow, see, fac, flat, env }
  CK.mat = (key, o) => {
    if (MATS[key]) return MATS[key];
    const TH = T(); o = o || {};
    const p = { color: new TH.Color(o.col || '#FFFFFF').convertSRGBToLinear(), roughness: o.rough == null ? 0.85 : o.rough, metalness: o.metal || 0 };
    if (o.fac) {
      const F = CK.facade(o.fac); p.map = F.map; p.emissiveMap = F.emissiveMap; p.roughnessMap = F.roughnessMap; p.emissive = new TH.Color('#FFFFFF'); p.emissiveIntensity = 0; p.roughness = 1;
    } else if (o.tex) {
      const t = CK.tex(o.tex); if (t.map) p.map = t.map; p.normalMap = t.normalMap; if (t.roughnessMap && o.rough == null) { p.roughnessMap = t.roughnessMap; p.roughness = 1; }
      p.normalScale = new TH.Vector2(o.nk || 1, o.nk || 1);
    }
    if (o.em) { p.emissive = new TH.Color(o.em).convertSRGBToLinear(); p.emissiveIntensity = o.ei == null ? 1 : o.ei; }
    if (o.op != null) { p.transparent = true; p.opacity = o.op; p.depthWrite = false; }
    if (o.side) p.side = TH.DoubleSide;
    if (o.alphaTest) p.alphaTest = o.alphaTest;
    const m = o.basic ? new TH.MeshBasicMaterial({ color: p.color, map: p.map, transparent: p.transparent, opacity: p.opacity, side: p.side, depthWrite: p.depthWrite, toneMapped: false }) : new TH.MeshStandardMaterial(p);
    if (o.env != null && !o.basic) m.envMapIntensity = o.env;
    // 貼圖的大小（公尺）：合併繪製的時候照這個算 uv
    m.userData.tile = o.fac ? CK.facade(o.fac).tile : o.tex ? CK.tex(o.tex).size : [o.tile || 4, o.tile || 4];
    m.userData.fac = !!o.fac; if (o.fac) m.userData.bay = CK.facade(o.fac).bay; m.userData.shared = true; m.userData.win = !!o.fac; m.userData.neon = !!o.neon; m.userData.lamp = !!o.lamp;
    if (!o.basic) patch(m, o.snow);
    if (!o.basic && (o.see || (o.see == null && !o.ground)) && R.seeThrough) R.seeThrough(m);
    return (MATS[key] = m);
  };
  CK.mats = MATS;

  // ---------- 合併繪製（照材質、照 96 公尺的區塊合起來（2026-10-08：48 → 96，繪製次數少很多）；uv 照公尺算，外牆照每一面置中） ----------
  const CHUNK = 96;
  CK.batch = () => {
    const TH = T(), map = new Map(), m4 = new TH.Matrix4(), nm = new TH.Matrix3(), q = new TH.Quaternion(), e = new TH.Euler(), p = new TH.Vector3(), s = new TH.Vector3();
    const base = geo => geo.userData.ni || (geo.userData.ni = (() => { const g = geo.index ? geo.toNonIndexed() : geo; return { P: g.attributes.position.array, N: g.attributes.normal.array, U: g.attributes.uv ? g.attributes.uv.array : null, n: g.attributes.position.count, box: !!geo.userData.box }; })());
    let frame = null;   // { x, z, a, c, s }：之後加的零件都在這個框裡（landmark 照自己的座標蓋）
    const B = {
      count: 0, yOff: 0,
      setFrame(x, z, a) { frame = x == null ? null : { x, z, a: a || 0, c: Math.cos(a || 0), s: Math.sin(a || 0) }; },
      getFrame() { return frame; },
      // 框裡的點 → 世界
      toWorld(x, z) { if (!frame) return [x, z]; return [frame.x + x * frame.c + z * frame.s, frame.z - x * frame.s + z * frame.c]; },
      // geo：基本形狀；mat；位置、大小、轉動；o.uv＝'keep' 用形狀自己的 uv
      add(geo, mat, x, y, z, sx, sy, sz, rx, ry, rz, o) {
        if (!mat) return;
        let yaw = ry || 0, wx = x, wz = z;
        if (frame) { [wx, wz] = B.toWorld(x, z); yaw += frame.a; }
        e.set(rx || 0, yaw, rz || 0); q.setFromEuler(e); p.set(wx, y + B.yOff, wz); s.set(sx, sy, sz); m4.compose(p, q, s); nm.getNormalMatrix(m4);
        const b = base(geo), me = m4.elements, ne = nm.elements, ckey = Math.floor((wx + 2000) / CHUNK) * 10000 + Math.floor((wz + 2000) / CHUNK);
        let bucket = map.get(mat); if (!bucket) map.set(mat, bucket = new Map());
        let A = bucket.get(ckey); if (!A) bucket.set(ckey, A = { P: [], N: [], U: [] });
        const tile = mat.userData.tile || [4, 4], fac = mat.userData.fac && b.box && !rx && !rz && !(o && o.noFac), keep = o && o.uv === 'keep', ca = Math.cos(-yaw), sa = Math.sin(-yaw);
        const BP = b.P, BN = b.N, BU = b.U;
        for (let i = 0; i < b.n; i++) {
          const i3 = i * 3, px = BP[i3], py = BP[i3 + 1], pz = BP[i3 + 2];
          const X = me[0] * px + me[4] * py + me[8] * pz + me[12], Y = me[1] * px + me[5] * py + me[9] * pz + me[13], Z = me[2] * px + me[6] * py + me[10] * pz + me[14];
          A.P.push(X, Y, Z);
          const nx = BN[i3], ny = BN[i3 + 1], nz = BN[i3 + 2], ox = ne[0] * nx + ne[3] * ny + ne[6] * nz, oy = ne[1] * nx + ne[4] * ny + ne[7] * nz, oz = ne[2] * nx + ne[5] * ny + ne[8] * nz, l = Math.hypot(ox, oy, oz) || 1;
          A.N.push(ox / l, oy / l, oz / l);
          if (keep && BU) { A.U.push(BU[i * 2] * (o.us || 1), BU[i * 2 + 1] * (o.vs || 1)); continue; }
          if (fac && Math.abs(ny) < 0.5) {
            // 外牆：沿著這一面從左邊量起、置中；高度用世界的 y（每一層對齊地面）
            const alongX = Math.abs(nz) > Math.abs(nx), L = alongX ? sx : sz, lp = (alongX ? px * sx : pz * sz) * (alongX ? (nz > 0 ? 1 : -1) : (nx > 0 ? -1 : 1)) + L / 2, bay = mat.userData.bay || 3;
            const off = (L - Math.floor(L / bay + 1e-6) * bay) / 2;
            A.U.push((lp - off) / tile[0], Y / tile[1]);
            continue;
          }
          // 一般：在零件自己的方向上，照朝向投影（公尺 → 貼圖）
          const fx = X * ca + Z * sa, fz = -X * sa + Z * ca, fnx = (ox * ca + oz * sa) / l, fnz = (-ox * sa + oz * ca) / l, fny = oy / l;   // 世界 → 零件自己的方向（繞 y 轉 -yaw）
          if (Math.abs(fny) > 0.6) A.U.push(fx / tile[0], fz / tile[1]);
          else if (Math.abs(fnx) > Math.abs(fnz)) A.U.push(fz * (fnx > 0 ? -1 : 1) / tile[0], Y / tile[1]);
          else A.U.push(fx * (fnz > 0 ? 1 : -1) / tile[0], Y / tile[1]);
        }
        B.count += b.n;
      },
      flush(par, o) {
        o = o || {};
        map.forEach((bucket, mat) => bucket.forEach(A => {
          if (!A.P.length) return;
          const geo = new TH.BufferGeometry(); geo.setAttribute('position', new TH.BufferAttribute(new Float32Array(A.P), 3)); geo.setAttribute('normal', new TH.BufferAttribute(new Float32Array(A.N), 3)); geo.setAttribute('uv', new TH.BufferAttribute(new Float32Array(A.U), 2)); geo.computeBoundingSphere();
          const mesh = new TH.Mesh(geo, mat); mesh.castShadow = !o.noShadow && !mat.userData.noShadow && !mat.transparent && !(mat.emissive && mat.emissiveIntensity > 0 && !mat.userData.win); mesh.receiveShadow = !mat.userData.noReceive; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); par.add(mesh);
        }));
        map.clear();
      }
    };
    return B;
  };

  // ---------- 基本形狀（共用、不丟） ----------
  const G = {};
  CK.geo = () => {
    if (G.box) return G;
    const TH = T();
    G.box = new TH.BoxGeometry(1, 1, 1); G.box.userData.box = true;
    G.cyl = new TH.CylinderGeometry(0.5, 0.5, 1, 16); G.cyl8 = new TH.CylinderGeometry(0.5, 0.5, 1, 8); G.cyl24 = new TH.CylinderGeometry(0.5, 0.5, 1, 28);
    G.cone = new TH.ConeGeometry(0.5, 1, 16); G.cone8 = new TH.ConeGeometry(0.5, 1, 8); G.sph = new TH.SphereGeometry(0.5, 16, 10); G.ico = new TH.IcosahedronGeometry(0.5, 1); G.ico0 = new TH.IcosahedronGeometry(0.5, 0);
    G.hemi = new TH.SphereGeometry(0.5, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    G.torus = new TH.TorusGeometry(0.5, 0.06, 6, 28);
    const sh = new TH.Shape([new TH.Vector2(-0.5, 0), new TH.Vector2(0.5, 0), new TH.Vector2(0, 1)]); G.prism = new TH.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); G.prism.translate(0, 0, -0.5);
    G.plane = new TH.PlaneGeometry(1, 1);
    // 截角的方柱（石燈籠、橋柱）
    G.frustum = new TH.CylinderGeometry(0.35, 0.5, 1, 4, 1); G.frustum.rotateY(Math.PI / 4);
    Object.values(G).forEach(g => { g.userData.shared = true; });
    return G;
  };

  // ---------- 畫面：全解析度、多重取樣、泛光、ACES 色調、暗角 ----------
  const HQ = { q: (() => { try { return +(localStorage.getItem('tfl-cityq') || (R.touch ? 1 : 2)); } catch (e) { return 2; } })() };
  CK.quality = () => HQ.q;   // 0 低（沒有泛光、陰影小）、1 中、2 高
  CK.setQuality = q => { HQ.q = q; try { localStorage.setItem('tfl-cityq', String(q)); } catch (e) { } if (HQ.rt) { HQ.rt.dispose(); HQ.rt = null; } HQ.w = 0; if (CK.onQuality) CK.onQuality(q); };
  const quadVS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const hqInit = () => {
    const TH = T();
    HQ.scene = new TH.Scene(); HQ.cam = new TH.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    HQ.quad = new TH.Mesh(new TH.PlaneGeometry(2, 2)); HQ.quad.frustumCulled = false; HQ.scene.add(HQ.quad);
    const sm = (fs, u, add) => new TH.ShaderMaterial({ uniforms: u, vertexShader: quadVS, fragmentShader: fs, depthTest: false, depthWrite: false, blending: add ? TH.AdditiveBlending : TH.NoBlending });
    HQ.bright = sm('uniform sampler2D t; uniform float th; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb; float b = max(c.r, max(c.g, c.b)); float k = 0.5; float s = clamp(b - th + k, 0.0, 2.0 * k); s = s * s / (4.0 * k + 1e-4); float w = max(s, b - th) / max(b, 1e-4); gl_FragColor = vec4(min(c * w, vec3(30.0)), 1.0); }', { t: { value: null }, th: { value: 1.0 } });
    HQ.down = sm('uniform sampler2D t; uniform vec2 px; varying vec2 vUv; void main(){ vec3 s = texture2D(t, vUv).rgb * 4.0; s += texture2D(t, vUv + px * vec2(-1.0, -1.0)).rgb; s += texture2D(t, vUv + px * vec2(1.0, -1.0)).rgb; s += texture2D(t, vUv + px * vec2(-1.0, 1.0)).rgb; s += texture2D(t, vUv + px * vec2(1.0, 1.0)).rgb; gl_FragColor = vec4(s / 8.0, 1.0); }', { t: { value: null }, px: { value: new TH.Vector2() } });
    HQ.up = sm('uniform sampler2D t; uniform vec2 px; uniform float k; varying vec2 vUv; void main(){ vec3 s = texture2D(t, vUv + px * vec2(-2.0, 0.0)).rgb; s += texture2D(t, vUv + px * vec2(2.0, 0.0)).rgb; s += texture2D(t, vUv + px * vec2(0.0, -2.0)).rgb; s += texture2D(t, vUv + px * vec2(0.0, 2.0)).rgb; s += 2.0 * texture2D(t, vUv + px * vec2(-1.0, -1.0)).rgb; s += 2.0 * texture2D(t, vUv + px * vec2(1.0, -1.0)).rgb; s += 2.0 * texture2D(t, vUv + px * vec2(-1.0, 1.0)).rgb; s += 2.0 * texture2D(t, vUv + px * vec2(1.0, 1.0)).rgb; gl_FragColor = vec4(s / 12.0 * k, 1.0); }', { t: { value: null }, px: { value: new TH.Vector2() }, k: { value: 1 } }, true);
    HQ.comp = sm([
      'uniform sampler2D tC; uniform sampler2D tB; uniform float bloom; uniform float expo; uniform float vig; uniform float time; uniform vec3 grade; uniform float sat; varying vec2 vUv;',
      'vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }',
      'vec3 aces(vec3 c){ const mat3 IM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777)); const mat3 OM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602)); c *= 1.0 / 0.6; c = IM * c; c = rrt(c); c = OM * c; return clamp(c, 0.0, 1.0); }',
      'vec3 srgb(vec3 c){ return mix(c * 12.92, pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055, step(vec3(0.0031308), c)); }',
      'void main(){ vec3 c = texture2D(tC, vUv).rgb + texture2D(tB, vUv).rgb * bloom; c *= expo * grade; c = aces(c); float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat); c = srgb(c);',
      '  vec2 d = vUv - 0.5; c *= 1.0 - vig * dot(d, d) * 1.6;',
      '  c += (fract(sin(dot(gl_FragCoord.xy + time, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;',
      '  gl_FragColor = vec4(c, 1.0); }'
    ].join('\n'), { tC: { value: null }, tB: { value: null }, bloom: { value: 0.6 }, expo: { value: 1 }, vig: { value: 0.35 }, time: { value: 0 }, grade: { value: new TH.Vector3(1, 1, 1) }, sat: { value: 1.05 } });
    HQ.b = [];
  };
  const pass = (mat, target) => { HQ.quad.material = mat; W.renderer.setRenderTarget(target); W.renderer.render(HQ.scene, HQ.cam); };
  CK.post = { bloom: 0.45, expo: 0.88, vig: 0.32, th: 1.2, grade: [1, 1, 1], sat: 1.15 };
  const size = () => { const v = new (T().Vector2)(); W.renderer.getDrawingBufferSize(v); return v; };
  const hqResize = (w, h) => {
    const TH = T(), r = W.renderer, ms = r.capabilities.isWebGL2 && HQ.q >= 2 ? 4 : 0;
    if (!HQ.rt || HQ.rt.samples !== ms) { if (HQ.rt) HQ.rt.dispose(); HQ.rt = new TH.WebGLRenderTarget(w, h, { type: TH.HalfFloatType, samples: ms }); }
    HQ.rt.setSize(w, h);
    let bw = Math.max(2, w >> 1), bh = Math.max(2, h >> 1);
    for (let i = 0; i < 6; i++) { if (!HQ.b[i]) HQ.b[i] = new TH.WebGLRenderTarget(bw, bh, { type: TH.HalfFloatType, depthBuffer: false }); else HQ.b[i].setSize(bw, bh); bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1); }
    HQ.w = w; HQ.h = h;
  };
  // 畫一格（W.scene.userData.hq 的場景走這裡）
  CK.render = () => {
    const r = W.renderer, TH = T(); if (!HQ.scene) hqInit();
    // 用一般的透視鏡頭（像素風的窄角鏡頭不用）
    const cam = W.pcam || W.camera; if (W.camera !== cam) { cam.position.copy(W.camera.position); cam.quaternion.copy(W.camera.quaternion); W.camera = cam; }
    const dpr = window.devicePixelRatio || 1, pr = HQ.q >= 2 ? Math.min(dpr, 1.25) : HQ.q === 1 ? Math.min(dpr, 1.0) : 0.8;   // 2026-10-09 作者：皇嶺很卡——高 DPI 的螢幕像素太多（1.5 → 1.25）
    if (Math.abs(r.getPixelRatio() - pr) > 0.01) r.setPixelRatio(pr);
    const sz = size(), w = sz.x, h = sz.y; if (w < 4 || h < 4) return;
    const far = CK.far || 4200; if (cam.far !== far || cam.near !== 0.8 || Math.abs(cam.aspect - w / h) > 1e-3) { cam.far = far; cam.near = 0.8; cam.aspect = w / h; cam.updateProjectionMatrix(); }
    if (!HQ.rt || HQ.w !== w || HQ.h !== h) hqResize(w, h);
    const ac = r.autoClear;
    (CK.pre || []).forEach(f => { try { f(cam, w, h); } catch (e) { console.warn('[citykit pre]', e); } });
    r.setRenderTarget(HQ.rt); r.clear(); r.render(W.scene, cam);
    const P = CK.post, bl = HQ.q > 0 ? P.bloom : 0;
    if (bl > 0) {
      HQ.bright.uniforms.t.value = HQ.rt.texture; HQ.bright.uniforms.th.value = P.th; pass(HQ.bright, HQ.b[0]);
      for (let i = 0; i < 5; i++) { HQ.down.uniforms.t.value = HQ.b[i].texture; HQ.down.uniforms.px.value.set(1 / HQ.b[i].width, 1 / HQ.b[i].height); pass(HQ.down, HQ.b[i + 1]); }
      r.autoClear = false;
      for (let i = 5; i > 0; i--) { HQ.up.uniforms.t.value = HQ.b[i].texture; HQ.up.uniforms.px.value.set(0.5 / HQ.b[i].width, 0.5 / HQ.b[i].height); HQ.up.uniforms.k.value = 1; pass(HQ.up, HQ.b[i - 1]); }
      r.autoClear = ac;
    }
    const c = HQ.comp.uniforms; c.tC.value = HQ.rt.texture; c.tB.value = HQ.b[0] ? HQ.b[0].texture : HQ.rt.texture; c.bloom.value = bl; c.expo.value = P.expo; c.vig.value = P.vig; c.time.value = (c.time.value + 1.37) % 100; c.grade.value.set(P.grade[0], P.grade[1], P.grade[2]); c.sat.value = P.sat;
    pass(HQ.comp, null);
    void TH;
  };
  // 接上：精緻的場景走 CK.render，其他照舊（像素風）
  const rf0 = R.renderFrame;
  R.renderFrame = (w, h) => (W.scene && W.scene.userData.hq ? CK.render(w, h) : rf0(w, h));

  // ---------- 天空（漸層、太陽、雲；也拿來做環境反光） ----------
  const SKY_VS = 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.99999; }';
  const SKY_FS = [
    'uniform vec3 top; uniform vec3 hor; uniform vec3 gnd; uniform vec3 sunDir; uniform vec3 sunCol; uniform float cloud; uniform float time; uniform float night; varying vec3 vDir;',
    'float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }',
    'float fb(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 6; i++){ v += a * n2(p); p = m * p; a *= 0.5; } return v; }',
    'void main(){ vec3 d = normalize(vDir); float y = d.y; vec3 sd3 = normalize(sunDir); float sd = max(dot(d, sd3), 0.0);',
    '  vec3 c = y > 0.0 ? mix(hor, top, pow(clamp(y, 0.0, 1.0), 0.48)) : mix(hor, gnd, clamp(-y * 5.0, 0.0, 1.0));',
    '  c += sunCol * (pow(sd, 6.0) * 0.22 + pow(sd, 48.0) * 0.35) * (1.0 - night * 0.7) * (1.0 - cloud * 0.5);',
    '  c += sunCol * smoothstep(0.99955, 0.99985, sd) * 18.0 * (1.0 - night) * (1.0 - cloud * 0.85);',
    '  if (y > 0.0) {',
    '    vec2 uv = d.xz / (y + 0.08) * 0.9 + vec2(time * 0.004, time * 0.0015);',
    '    vec2 q = vec2(fb(uv + vec2(1.7, 9.2)), fb(uv + vec2(8.3, 2.8)));',
    '    float den = fb(uv * 1.3 + q * 1.6);',
    '    float cov = smoothstep(0.62 - cloud * 0.42, 0.86 - cloud * 0.3, den);',
    '    float den2 = fb(uv * 1.3 + q * 1.6 + sd3.xz * 0.18);',
    '    float lit = clamp(0.55 + (den - den2) * 4.0, 0.0, 1.0);',
    '    vec3 shade = mix(hor * 0.78, vec3(0.42, 0.44, 0.50), 0.35) * (1.0 - night * 0.85);',
    '    vec3 bright = (sunCol * 1.15 + hor * 0.35) * (1.0 - night * 0.8) + vec3(0.02, 0.025, 0.04) * night;',
    '    vec3 cc = mix(shade, bright, lit * (1.0 - cloud * 0.55));',
    '    cc += sunCol * pow(sd, 10.0) * (1.0 - cov) * 0.9 * (1.0 - night);',
    '    float fade = smoothstep(0.0, 0.22, y);',
    '    c = mix(c, cc, cov * fade * 0.96);',
    '    c = mix(c, hor * 1.02, (1.0 - smoothstep(0.0, 0.08, y)) * 0.55);',
    '  }',
    '  if (night > 0.5 && y > 0.05) { vec2 st = d.xz / (y + 0.3) * 140.0; float s = step(0.9978, h1(floor(st))); c += vec3(s) * (night - 0.5) * 2.0 * (1.0 - cloud) * 0.9; }',
    '  gl_FragColor = vec4(c, 1.0); }'
  ].join('\n');
  CK.skyMat = () => new (T().ShaderMaterial)({ uniforms: { top: { value: new (T().Color)() }, hor: { value: new (T().Color)() }, gnd: { value: new (T().Color)() }, sunDir: { value: new (T().Vector3)(0, 1, 0) }, sunCol: { value: new (T().Color)() }, cloud: { value: 0.3 }, time: { value: 0 }, night: { value: 0 } }, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: T().BackSide, depthWrite: false, fog: false });

  // ---------- 光線（照遊戲裡的時間、天氣） ----------
  // 太陽高度 → 天空、太陽的顏色；跟 daytime.js 一樣：早上 6 點日出、傍晚 18 點半日落
  const WX = { '晴': { cloud: 0.18, sun: 1, fog: 1, snow: 0.18, wet: 0, flakes: 0 }, '陰': { cloud: 0.75, sun: 0.35, fog: 1.4, snow: 0.28, wet: 0, flakes: 0 }, '小雪': { cloud: 0.7, sun: 0.4, fog: 1.6, snow: 0.6, wet: 0, flakes: 2500 }, '大雪': { cloud: 0.9, sun: 0.25, fog: 2.4, snow: 0.9, wet: 0, flakes: 6000 }, '暴風雪': { cloud: 1, sun: 0.15, fog: 4, snow: 1, wet: 0, flakes: 9000, wind: 6 }, '雨': { cloud: 0.85, sun: 0.25, fog: 1.8, snow: 0.1, wet: 1, flakes: 5000, rain: 1 } };
  CK.WX = WX;
  const sunAt = h => {
    const day = h >= 6 && h <= 18.5, t = day ? (h - 6) / 12.5 : ((h + 24 - 18.5) % 24) / 11.5;
    const az = Math.PI * (0.15 + 0.7 * t), el = day ? Math.sin(Math.PI * t) * 0.95 : Math.sin(Math.PI * t) * 0.7;
    return { day, t, az, el, dir: [-Math.cos(az) * Math.cos(Math.max(0.06, el)), Math.sin(Math.max(0.06, el)), 0.45 - Math.sin(az) * 0.25] };
  };
  const mixC = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const lin = c => c.map(v => Math.pow(v, 2.2));
  CK.lightFor = (h, weather) => {
    const s = sunAt(((h % 24) + 24) % 24), wx = WX[weather] || WX['小雪'];
    const e = s.day ? Math.max(0, s.el) : 0, low = 1 - Math.min(1, e / 0.45), dusk = s.day ? Math.max(0, 1 - e / 0.18) : 0;
    const night = s.day ? Math.max(0, 1 - e / 0.07) * 0.6 : 1;
    let top = mixC([0.24, 0.42, 0.72], [0.30, 0.34, 0.52], low), hor = mixC([0.70, 0.80, 0.90], [0.98, 0.66, 0.44], dusk);
    let sunC = mixC([1.0, 0.95, 0.86], [1.0, 0.58, 0.32], low);
    if (night > 0.5) { top = mixC(top, [0.02, 0.035, 0.08], night); hor = mixC(hor, [0.06, 0.08, 0.14], night); sunC = [0.55, 0.65, 0.9]; }
    const grey = Math.min(1, wx.cloud * 1.05), g0 = night > 0.5 ? [0.05, 0.06, 0.08] : [0.62, 0.64, 0.67];
    top = mixC(top, g0, grey * 0.75); hor = mixC(hor, mixC(g0, hor, 0.3), grey * 0.6);
    const sunI = night > 0.5 ? 0.22 * (1 - wx.cloud * 0.6) : (0.6 + 2.6 * Math.min(1, e / 0.5)) * wx.sun;
    const hemiI = night > 0.5 ? 0.35 : 0.55 + 0.6 * Math.min(1, e / 0.4);
    const lampK = clamp(1 - e / 0.12, 0, 1) * (s.day ? 1 : 1), winK = clamp(1 - e / 0.3, 0.12, 1);
    return { s, wx, night, top, hor, sunC, sunI, hemiI, lampK: s.day ? lampK * (e < 0.12 ? 1 : 0) : 1, winK: s.day ? winK : 1, gnd: mixC(hor, [0.2, 0.2, 0.22], 0.5), envI: night > 0.5 ? 0.25 : 0.55 + 0.45 * Math.min(1, e / 0.4) };
  };
  CK.lin = lin;
})(window.R);
