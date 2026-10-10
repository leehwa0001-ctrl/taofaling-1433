// 人物素材的測試版（2026-10-11 作者：這個能套用我們的人物嗎？缺的之後會補，先做個測試版看能不能塞）
// - 資料：charkit-data.js（tools/charkit-convert.js 從作者的人物編輯器匯出檔轉的；45×45 一格，四個方向，站立、移動、單手揮擊、雙手揮擊）。
// - 開關：暫停選單「人物：素材版（測試）」，存在瀏覽器（tfl-charkit）；預設關，玩家看到的照舊。
// - 怎麼畫：照原本人物圖的排法（6 欄 × 7 列，sprites.js），前四列（正面、背面、朝右、朝左 × 站、走 1、走 2、砍下、舉起、收招）換成素材；
//   翻滾、倒下、坐著素材還沒有，沿用原本的圖。圖放大成 3 倍（一格 72×90），素材畫成 2 倍、腳底對齊——人物在畫面上一樣高，只是畫得比較細。
//   顏色照每個人的外觀：身體＝膚色、衣服＝上衣（條紋＝披風色）、褲子＝披風色、頭髮、眼睛；髮型照原本的 hs 對到素材的七種。
//   武器、盾、兜帽、種族特徵（耳朵、角、翅膀……）素材還沒有：兜帽的人不畫頭髮；剪影（還沒認識的人）照舊用原本的圖。
// 放在 sprites.js、lookplus.js、gearmore.js 後面（最外層的 R.makeHeroSprite、R.spriteLook）。
(function (R) {
  const K = R.CHARKIT; if (!K || !R.makeHeroSprite) return;
  const G = K.grid || 45, FW = 24, FH = 30, COLS = 6, ROWS = 7, S = 3, KS = 2, CW = FW * S, CH = FH * S;
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } return null; };
  const on = () => LS('tfl-charkit') === '1';
  R.charkitOn = on;
  // ---------- 解碼（a～j＝0～9，後面的數字＝連續幾格） ----------
  const DEC = new Map();
  const decFull = str => { const a = new Uint8Array(G * G); let i = 0, p = 0; while (p < str.length) { const v = str.charCodeAt(p++) - 97; let n = 0; while (p < str.length && str[p] >= '0' && str[p] <= '9') n = n * 10 + (str.charCodeAt(p++) - 48); n = n || 1; a.fill(v, i, i + n); i += n; } return a; };
  // 只留有顏色的格子：{ i: 第幾格, v: 規則 }（一張圖大約只有四分之一有東西，畫的時候只走這些）
  const dec = str => { let d = DEC.get(str); if (d) return d; const a = decFull(str), I = [], V = []; for (let k = 0; k < a.length; k++) if (a[k]) { I.push(k); V.push(a[k]); } d = { i: Int16Array.from(I), v: Uint8Array.from(V), full: a }; DEC.set(str, d); return d; };
  // ---------- 顏色 ----------
  const hex = c => { c = String(c || '#888888'); if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; const n = parseInt(c.slice(1, 7), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (c, t, k) => c.map((v, i) => Math.round(v + (t[i] - v) * k));
  const css = (c, a) => { const A = Math.round(255 * (a == null ? 1 : a)); return [c[0], c[1], c[2], A, ((A << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0]; };   // 直接寫進像素陣列（最後一個是 Uint32）
  const BLACK = [20, 16, 24], WHITE = [255, 255, 255];
  // 一層的上色規則 → 顏色（base＝這一層的顏色，alt＝「隨機色」那幾格用的第二個顏色）
  const paint = (base, alt) => { const b = hex(base), a = hex(alt || base); return [null, css(BLACK), css(b), css(mix(b, BLACK, 0.45)), css(mix(b, BLACK, 0.7)), css(a), css(mix(b, BLACK, 0.78)), css(b, 0.5), css(WHITE), css(mix(b, WHITE, 0.45))]; };
  // ---------- 外觀 → 素材的選擇 ----------
  const HAIR = { short: '短髮', long: '長髮', ponytail: '狼尾', bun: '包頭', bob: '公主切', crop: '三七分', spiky: '爆炸頭' };
  const hashOf = s => { let h = 7; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const pick = (layer, name, seed) => { const L = K.layers[layer]; if (!L) return null; if (name && L[name]) return L[name]; const ks = Object.keys(L); return L[ks[seed % ks.length]]; };
  const lookOf = o => {
    const rc = (R.raceLook && o.race ? R.raceLook(o.race) : null) || {}, seed = hashOf((o.top || '') + (o.hair || '') + (o.hs || '') + (o.cloak || ''));
    return {
      skin: o.skin || (rc.skins ? rc.skins[0] : '#E8C2A0'), hair: rc.hairCol || o.hair || '#2A2420', top: o.top || '#6A5A48', cloak: o.cloak || '#3A3440', eye: o.eye || rc.eye || '#1A1714',
      hairV: o.hs === 'bald' || o.hood || (rc.hood && !o.noRaceHood) ? null : pick('髮型', HAIR[o.hs], seed), eyeV: pick('眼睛', o.eyeStyle || '大眼', seed), browV: pick('眉毛', o.browStyle || '細眉', seed),
      glasses: o.acc === 'glasses' || o.glasses ? pick('眼鏡', null, 0) : null
    };
  };
  // ---------- 一格：身體＋圖層 ----------
  const layerFrame = (by, act, i) => { if (!by) return null; const fr = by[act] || by.stand || by[Object.keys(by)[0]]; return fr && fr.length ? fr[Math.min(i, fr.length - 1)] : null; };
  let FOOT = null;   // 素材的腳底在第幾列（站立正面的最下面一列）
  const footRow = () => { if (FOOT != null) return FOOT; const a = dec(K.body.stand[0].front).full; FOOT = 0; for (let y = G - 1; y >= 0 && !FOOT; y--) for (let x = 0; x < G; x++) if (a[y * G + x]) { FOOT = y; break; } return FOOT; };
  let TMP = null;
  const drawCell = (g, ox, oy, frames) => {
    if (!TMP) { const c = document.createElement('canvas'); c.width = c.height = G; const x = c.getContext('2d'); TMP = { c, x, img: x.createImageData(G, G) }; TMP.u = new Uint32Array(TMP.img.data.buffer); }
    const U = TMP.u, B = TMP.img.data; U.fill(0);
    frames.forEach(([str, pal]) => { if (!str) return; const d = dec(str), I = d.i, V = d.v; for (let n = 0; n < I.length; n++) { const c = pal[V[n]]; if (!c) continue; const k = I[n]; if (c[3] >= 255) U[k] = c[4]; else { const al = c[3] / 255, q = k * 4; B[q] = B[q] * (1 - al) + c[0] * al; B[q + 1] = B[q + 1] * (1 - al) + c[1] * al; B[q + 2] = B[q + 2] * (1 - al) + c[2] * al; B[q + 3] = Math.max(B[q + 3], c[3]); } } });
    TMP.x.putImageData(TMP.img, 0, 0);
    const dy = oy + (FH - 1) * S - (footRow() + 1) * KS, dx = ox + CW / 2 - G * KS / 2;
    g.save(); g.beginPath(); g.rect(ox, oy, CW, CH); g.clip(); g.drawImage(TMP.c, dx, dy, G * KS, G * KS); g.restore();
  };

  // 原本的排法：欄 0 站、1 走 1、2 走 2、3 砍下、4 舉起、5 收招；列 0 正面、1 背面、2 朝右、3 朝左
  const COLMAP = [['stand', 0], ['move', 0], ['move', 2], ['swing', 1], ['swing', 0], ['swing', 2]];
  const DIRMAP = ['front', 'back', 'right', 'left'];   // 素材的 right＝臉朝右、left＝臉朝左（2026-10-11 作者：原本對反了，人物左右是反的）
  // 素材那四列照外觀快取（城裡兩百多人，很多人長得一樣）；每個人只把原本圖的翻滾、倒下、坐著貼過來
  const CACHE = new Map();
  const kitRows = o => {
    const L = lookOf(o), two = /^(greatsword|axe|hammer|halberd|spear|zanbato)/.test(String(o.weapon || '')), sw = two && K.body.swing2 ? 'swing2' : 'swing1';
    const key = JSON.stringify([L.skin, L.hair, L.top, L.cloak, L.eye, o.hs, !!L.hairV, o.eyeStyle, o.browStyle, !!L.glasses, sw]);
    let c = CACHE.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = CW * COLS; c.height = CH * 4; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const P = { body: paint(L.skin), pants: paint(L.cloak), shoes: paint('#3A2A20'), top: paint(L.top, L.cloak), eye: paint(L.eye), brow: paint(L.hair), hair: paint(L.hair), glass: paint('#2A2A34') };
    const first = n => { const Ly = K.layers[n]; return Ly && Ly[Object.keys(Ly)[0]]; }, LY = { pants: first('褲子'), shoes: first('鞋子'), top: first('衣服') };
    DIRMAP.forEach((d, row) => COLMAP.forEach(([act0, i], col) => {
      const act = act0 === 'swing' ? sw : act0, bf = K.body[act] || K.body.stand, b = bf[Math.min(i, bf.length - 1)];
      const pickF = by => { const f = layerFrame(by, act, i); return f ? f[d] : null; };
      drawCell(g, col * CW, row * CH, [[b[d], P.body], [pickF(LY.pants), P.pants], [pickF(LY.shoes), P.shoes], [pickF(LY.top), P.top], [pickF(L.eyeV), P.eye], [pickF(L.browV), P.brow], [pickF(L.hairV), P.hair], [pickF(L.glasses), P.glass]]);
    }));
    if (CACHE.size > 300) CACHE.clear(); CACHE.set(key, c);
    return c;
  };
  const POOL = new Map();
  const sheetFor = (o, orig) => {
    if (o.pool && POOL.has(o.pool)) return POOL.get(o.pool);
    const k = kitRows(o), c = document.createElement('canvas'); c.width = CW * COLS; c.height = CH * ROWS; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (orig) g.drawImage(orig, 0, orig.height * 4 / ROWS, orig.width, orig.height * 3 / ROWS, 0, CH * 4, c.width, CH * 3);   // 翻滾、倒下、坐著先用原本的
    g.drawImage(k, 0, 0); if (o.pool) POOL.set(o.pool, c); return c;
  };
  // ---------- 接上：做人物的時候換成素材的圖 ----------
  const apply = h => {
    try {
      if (!h || !h.sp || !h.sp.t || !h.opt || h.opt.sil) return h;
      const t = h.sp.t; if (!h.sp._ckOrig) h.sp._ckOrig = t.image;
      if (!on()) { if (t.image !== h.sp._ckOrig) { t.image = h.sp._ckOrig; t.needsUpdate = true; } return h; }
      t.image = sheetFor(h.opt, h.sp._ckOrig); t.needsUpdate = true;
    } catch (e) { console.warn('[charkit]', e); }
    return h;
  };
  const mk0 = R.makeHeroSprite;
  R.makeHeroSprite = (...a) => { const h = mk0(...a); return on() ? apply(h) : h; };
  const sl0 = R.spriteLook;
  if (sl0) R.spriteLook = (h, look) => { const r = sl0(h, look); if (h && h.sp) { h.sp._ckOrig = null; apply(h); } return r; };
  const dr0 = R.dressHero;
  if (dr0) R.dressHero = (h, ...a) => { const r = dr0(h, ...a); if (h && h.sp && on()) { h.sp._ckOrig = null; apply(h); } return r; };
  // 換開關的時候，畫面上的人一起換
  const refresh = () => { const W = R.W, all = []; if (W.P && W.P.h) all.push(W.P.h); [W.town && W.town.npcs, W.town && W.town.allies, W.inside && W.inside.npcs, W.allies].forEach(L => (L || []).forEach(n => { if (n && n.h) all.push(n.h); })); all.forEach(apply); };
  R.charkitRefresh = refresh;
  const addBtn = () => {
    const row = document.querySelector('#r-sheet .row'); if (!row || row.querySelector('#ck-kit')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'ck-kit';
    b.textContent = '人物：' + (on() ? '素材版（測試）' : '原本');
    b.title = '用人物編輯器的素材畫人物（測試中：翻滾、倒下、坐著、武器、種族特徵還沒有）';
    b.onclick = () => { LS('tfl-charkit', on() ? null : '1'); refresh(); b.textContent = '人物：' + (on() ? '素材版（測試）' : '原本'); };
    row.appendChild(b);
  };
  const ps = R.pauseSheet; if (ps) R.pauseSheet = (...a) => { const r = ps(...a); try { addBtn(); } catch (e) { } return r; };
  const tm = R.townMenu; if (tm) R.townMenu = (...a) => { const r = tm(...a); try { addBtn(); } catch (e) { } return r; };
})(window.R);
