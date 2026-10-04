// 討伐令 1433：像素美術（像素風）
// 原則：
// 1. 全部同一個像素密度：1 像素＝1/12 公尺（PX）。人物、遺跡生物、地板、牆的點陣大小一致，不會有大小不一的像素。
// 2. 人物是「直立的看板」：只轉向鏡頭的水平方向，高度補上鏡頭俯角造成的壓扁（TILT），不會往後倒進牆裡。
// 3. 看板用受光的材質：火把、水晶、熔岩的光都照得到人物。
// 4. 地板和牆的點陣材質照「世界座標」貼：牆多高，磚塊都一樣大，不會被拉長。
// 5. 畫面用整數倍放大（pixel.js），每個點陣像素在螢幕上一樣大。
(function (R) {
  const T = () => THREE;
  // PX：人物、牆面的一個像素；TOP：地面、牆頂的一個像素（鏡頭斜著看，地面在畫面上會縮成 PX 那麼高）
  // LOOKY：鏡頭看的高度，讓腳底剛好落在畫面像素的格線上（走路時人物不會上下跳一格）
  // 俯角跟著鏡頭（run.js 的 R.CAM）：TILT 補直立的東西被壓扁的部分，TOP 讓地面的一格在畫面上剛好是一個像素
  const PITCH = Math.atan2(R.CAM.h, R.CAM.back), PX = 1 / 12, TILT = 1 / Math.cos(PITCH), TOP = PX / Math.sin(PITCH);
  R.PIX = { PX, TILT, TOP, LOOKY: 3 * PX * TILT };
  const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // 種族特徵換色：原本那一格比原本的基準色亮多少、暗多少，就把指定的顏色調亮、調暗多少
  const lum = h => { const [r, g, b] = rgb(h); return 0.3 * r + 0.59 * g + 0.11 * b; };
  const tint = (c, base, ref) => (base ? shade(base, Math.max(-0.85, Math.min(0.85, (lum(c) - lum(ref || c)) / 255 * 1.4))) : c);
  const shade = (h, k) => '#' + rgb(h).map(v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))))).map(v => v.toString(16).padStart(2, '0')).join('');
  const OUT = '#1A1418';
  let seed = 1; const srnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const blit = (x, rows, pal, ox, oy) => rows.forEach((row, y) => { for (let i = 0; i < row.length; i++) { const col = pal[row[i]]; if (!col) continue; x.fillStyle = col; x.fillRect(ox + i, oy + y, 1, 1); } });
  // 一圈深色外框（只在外面，不蓋到裡面）
  const outline = (c, col) => {
    const x = c.getContext('2d'), w = c.width, h = c.height, a = x.getImageData(0, 0, w, h).data, out = x.getImageData(0, 0, w, h), o = out.data, [r, g, b] = rgb(col || OUT);
    const on = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && a[(yy * w + xx) * 4 + 3] > 0;
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) { const k = (y * w + i) * 4; if (a[k + 3]) continue; if (on(i - 1, y) || on(i + 1, y) || on(i, y - 1) || on(i, y + 1)) { o[k] = r; o[k + 1] = g; o[k + 2] = b; o[k + 3] = 255; } }
    x.putImageData(out, 0, 0);
  };
  // 點陣圖是 sRGB 顏色；地板、牆的灰階花紋是直接乘上去的倍數（linear）
  const tex = (c, repeat) => { const t = new (T().CanvasTexture)(c); t.magFilter = T().NearestFilter; t.minFilter = T().NearestFilter; t.generateMipmaps = false; if (repeat) { t.wrapS = t.wrapT = T().RepeatWrapping; t.encoding = T().LinearEncoding; } else t.encoding = T().sRGBEncoding; return t; };

  // ---------- 看板（直立、受光、朝向鏡頭） ----------
  // fw、fh：這一格的像素大小；pad：腳底下留的空白像素
  const billboard = (canvas, cols, rows, fw, fh, pad) => {
    const t = tex(canvas); t.repeat.set(1 / cols, 1 / rows);
    const W0 = fw * PX, H0 = fh * PX * TILT, geo = new (T().PlaneGeometry)(W0, H0); geo.translate(0, H0 / 2 - (pad || 0) * PX * TILT, 0);
    const mat = new (T().MeshLambertMaterial)({ map: t, alphaTest: 0.5, emissive: '#FFFFFF', emissiveMap: t, emissiveIntensity: 0.22 });
    const m = new (T().Mesh)(geo, mat); m.renderOrder = 1;
    return { m, t, cols, rows, mat, hc: H0 / 2 - (pad || 0) * PX * TILT };
  };
  const setFrame = (sp, col, row) => { sp.t.offset.set(col / sp.cols, 1 - (row + 1) / sp.rows); };
  const face = (g, spMesh) => { const cam = R.W && R.W.cam ? R.W.cam.yaw : 0; spMesh.rotation.set(0, Math.abs(g.rotation.x) > 0.5 ? 0 : cam - g.rotation.y, 0); };
  const addShadow = (g, r) => { const m = new (T().Mesh)(new (T().CircleGeometry)(r, 12), new (T().MeshBasicMaterial)({ color: '#000000', transparent: true, opacity: 0.32, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; g.add(m); return m; };
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

  // ---------- 人物：24×30 一格；身體在中間 16×24 ----------
  // 一張圖 6 欄 × 7 列：
  //  0 正面、1 背面、2 朝右、3 朝左（每一列：站著、走 1、走 2、出手（砍下）、舉起、收招）
  //  近戰武器的出手是三格：舉起 → 砍下 → 收招；槍、弓、法杖三格都是舉起瞄準的樣子
  //  4 翻滾（往右滾，身體縮成一團轉一圈）、5 翻滾（往左）
  //  6 倒下（躺著，頭朝左、頭朝右）、坐著（正面、背面）
  const FW = 24, FH = 30, BX = 4, BY = 5, ROWS = 7, COLS = 6;
  // 種族的長相（耳朵、角、翅膀、尾巴、膚色……）在 races.js 的 R.raceLook
  const heroLook = o => {
    const w = k => (o.eq && o.eq[k] && R.ARMOR[o.eq[k].base] ? R.ARMOR[o.eq[k].base].w : null), body = w('body');
    const rc = (R.raceLook && o.race ? R.raceLook(o.race) : null) || {}, hood = !!o.hood || (rc.hood && !o.noRaceHood);
    const helm = w('head');
    return {
      skin: o.skin || (rc.skins ? rc.skins[0] : '#E8C2A0'), hair: rc.hairCol || o.hair, eye: o.eye || rc.eye || '#1A1714', belt: '#3A2A1C',
      cloak: o.hood ? '#3A322C' : o.cloak,
      top: body === 'heavy' ? '#AEB6C0' : body === 'medium' ? '#7E8894' : o.top, plate: body === 'heavy', chain: body === 'medium',
      pants: { heavy: '#8E969F', medium: '#5F6873', light: '#6A5A48' }[w('legs')] || o.pants || '#3A3D48',
      shoe: { heavy: '#7F868E', medium: '#5A3A22', light: '#C8A860' }[w('feet')] || o.shoe || '#2A231D',
      head: hood ? null : helm, headBase: hood || !helm ? null : o.eq.head.base, weapon: o.weapon, shield: o.shield,   // headBase：每一種帽子自己的畫法（headgear.js 的 R.HEAD_DRAW）
      hs: rc.bald ? 'bald' : o.hs || 'short', acc: o.acc || null, accCol: o.accCol || '#C8323A',
      hood: hood ? (o.hood ? '#3A322C' : rc.hoodCol || '#C8A870') : null,
      ears: hood || helm ? null : (rc.ears && o.ears ? o.ears : rc.ears), horns: hood ? null : (rc.horns && o.horns ? o.horns : rc.horns), wings: o.hood ? null : (rc.wings && o.wings ? o.wings : rc.wings), halo: o.hood ? null : rc.halo, tail: o.hood ? null : (rc.tail && o.tail ? o.tail : rc.tail),
      earCol: rc.ears ? o.earCol || null : null, hornCol: rc.horns ? o.hornCol || null : null, wingCol: rc.wings ? o.wingCol || null : null, tailCol: rc.tail ? o.tailCol || null : null, ext: o,
      fin: hood ? null : rc.fin, flame: hood || helm ? null : rc.flame, leaves: hood || helm ? null : rc.leaves, gem: hood ? null : rc.gem, cracks: rc.cracks, rock: rc.rock, scales: rc.scales,
      eyes4: rc.eyes4, beard: rc.beard, whisk: rc.whisk && !hood, crest: rc.crest && !hood && !helm, fangs: rc.fangs, wisp: rc.wisp,
      sig: hood || helm ? null : o.sig   // 劇情人物自己的衣服、髮型細節（storylooks.js 的 R.HERO_SIG）
    };
  };
  const drawHero = (x, ox, oy, dir, fr, L, pose) => {
    const p = (a, b, w, h, c) => { if (w <= 0 || h <= 0 || !c) return; x.fillStyle = c; x.fillRect(ox + a, oy + b, w, h); };
    const dk = c => shade(c, -0.24), lt = c => shade(c, 0.2);
    const side = dir === 2, back = dir === 1, atk = fr >= 3, sit = pose === 'sit';
    // 近戰的三格：wind 舉起、strike 砍下、follow 收招（遠程武器是 null：維持舉起瞄準）
    const wk = L.weapon && R.WEAPONS[L.weapon] ? R.WEAPONS[L.weapon].kind : null;
    const swingP = atk && (wk === 'melee' || wk === 'thrust') ? (fr === 4 ? 'wind' : fr === 5 ? 'follow' : 'strike') : null;
    // ---- 身體後面的東西：翅膀、尾巴（正面看在身體後面；背面看蓋在披風上，最後畫） ----
    const wings = () => {
      if (!L.wings) return;
      const demon = L.wings === 'demon', WR = demon ? '#2A2030' : '#F2F0EA', WC = c => tint(c, L.wingCol, WR), a = WC(demon ? '#2A2030' : '#F2F0EA'), b = WC(demon ? '#5A4A6A' : '#C8C4BC'), e = WC(demon ? '#140E18' : '#A8A49C');
      if (side) { p(0, 7, 4, 2, b); p(0, 9, 5, 4, a); p(1, 13, 3, 2, a); p(0, 13, 1, 3, e); p(2, 15, 1, 1, e); return; }
      const one = (wx, s) => { p(wx, 7, 3, 1, b); p(wx + (s < 0 ? -1 : 1), 8, 3, 5, a); p(wx + (s < 0 ? -2 : 2), 9, 2, 5, a); p(wx + (s < 0 ? -2 : 3), 14, 1, 2, e); if (demon) { p(wx + (s < 0 ? -2 : 3), 8, 1, 1, e); p(wx, 10, 1, 4, e); } else p(wx + (s < 0 ? -1 : 2), 12, 2, 1, b); };
      one(back ? 3 : 1, -1); one(back ? 10 : 12, 1);
    };
    const tail = () => {
      const t = L.tail; if (!t) return;
      const c = L.tailCol || (t === 'dragon' ? L.skin : t === 'fox' ? L.hair : t === 'cat' ? L.hair : dk(L.hair)), tip = t === 'fox' ? '#F2EEE6' : lt(c);
      if (side) {
        if (t === 'cat') { p(2, 13, 2, 1, c); p(1, 10, 1, 3, c); p(1, 9, 1, 1, tip); }
        else if (t === 'fox') { p(0, 12, 4, 3, c); p(1, 11, 2, 1, c); p(0, 12, 1, 2, tip); }
        else if (t === 'dragon') { p(1, 15, 4, 2, c); p(0, 16, 1, 1, dk(c)); p(2, 15, 1, 1, dk(c)); }
        else { p(1, 13, 3, 2, c); p(0, 14, 1, 1, tip); }
      } else if (back) {
        if (t === 'cat') { p(7, 15, 1, 4, c); p(8, 13, 1, 2, c); }
        else if (t === 'fox') { p(6, 15, 4, 4, c); p(7, 19, 2, 1, tip); }
        else if (t === 'dragon') { p(7, 15, 2, 5, c); p(7, 20, 1, 1, dk(c)); }
        else { p(7, 15, 2, 3, c); p(7, 18, 1, 1, tip); }
      } else if (t === 'fox') { p(12, 15, 3, 3, c); p(14, 15, 1, 2, tip); }
      else if (t === 'dragon') p(12, 18, 2, 2, c);
    };
    if (!back) { wings(); tail(); }
    if (!side) {
      // 腿：走路時一隻腳抬起兩格；坐著時是膝蓋和小腿
      const lu = fr === 1 ? 2 : 0, ru = fr === 2 ? 2 : 0;
      const leg = (lx, up) => { p(lx, 16, 3, 5 - up, L.pants); p(lx + 2, 16, 1, 5 - up, dk(L.pants)); p(lx, 21 - up, 3, 2, L.shoe); p(lx, 22 - up, 3, 1, dk(L.shoe)); };
      if (sit) { if (!back) { p(4, 16, 8, 3, L.pants); p(4, 18, 8, 1, dk(L.pants)); p(5, 19, 2, 3, L.pants); p(9, 19, 2, 3, L.pants); p(5, 22, 2, 1, L.shoe); p(9, 22, 2, 1, L.shoe); } }
      else if (atk) { leg(4, 0); leg(9, 0); } else { leg(5, lu); leg(8, ru); }
      // 身體
      const body = back ? L.cloak : L.top;
      p(4, 9, 8, 7, body); p(4, 9, 1, 7, lt(body)); p(11, 9, 1, 7, dk(body)); p(5, 9, 6, 1, lt(body));
      if (!back && L.chain) for (let yy = 10; yy < 15; yy++) for (let xx = 5 + (yy % 2); xx < 11; xx += 2) p(xx, yy, 1, 1, dk(L.top));
      if (!back && L.plate) { p(6, 11, 4, 1, lt(L.top)); p(5, 13, 6, 1, dk(L.top)); p(7, 10, 2, 5, shade(L.top, 0.1)); }
      if (back) p(7, 10, 1, 6, dk(L.cloak));
      p(4, 15, 8, 1, L.belt); if (!back) p(7, 15, 2, 1, '#C9A13A');
      // 手臂：走路時前後擺（正面看是上下動）；攻擊時右手舉起
      const sw = fr === 1 ? 1 : fr === 2 ? -1 : 0;
      const arm = (ax, dy) => { p(ax, 9 + dy, 2, 5, L.top); p(ax + (ax < 8 ? 0 : 1), 9 + dy, 1, 5, dk(L.top)); p(ax, 14 + dy, 2, 1, L.skin); if (L.cracks) p(ax, 12 + dy, 1, 1, '#FF7A2A'); };
      if (swingP === 'strike') { arm(2, 0); p(9, 10, 4, 2, L.top); p(9, 11, 4, 1, dk(L.top)); p(8, 10, 1, 2, L.skin); }        // 右手橫過身體
      else if (swingP === 'follow') { arm(2, 0); p(6, 12, 6, 2, L.top); p(6, 13, 6, 1, dk(L.top)); p(5, 12, 1, 2, L.skin); }   // 右手垂在左下
      else if (atk) { arm(2, 0); p(12, 5, 2, 5, L.top); p(13, 5, 1, 5, dk(L.top)); p(12, 4, 2, 1, L.skin); }                    // 右手高舉
      else { arm(2, Math.max(0, sw)); arm(12, Math.max(0, -sw)); }
      if (L.plate) { p(2, 8, 3, 2, lt(L.top)); p(11, 8, 3, 2, lt(L.top)); p(2, 9, 3, 1, dk(L.top)); p(11, 9, 3, 1, dk(L.top)); }
      if (back) { wings(); tail(); }
      // 頭
      if (back) { p(4, 2, 8, 7, L.hs === 'bald' ? L.skin : L.hair); if (L.hs !== 'bald') { p(4, 7, 8, 2, dk(L.hair)); p(5, 2, 3, 1, lt(L.hair)); } }
      else {
        p(4, 2, 8, 7, L.skin); p(11, 3, 1, 5, dk(L.skin)); p(7, 7, 2, 1, dk(L.skin));
        if (L.rock) { p(5, 3, 1, 1, dk(L.skin)); p(9, 7, 2, 1, dk(L.skin)); p(10, 3, 1, 1, lt(L.skin)); }
        if (L.scales) { p(4, 4, 1, 1, dk(L.skin)); p(11, 6, 1, 1, lt(L.skin)); p(5, 7, 1, 1, dk(L.skin)); p(10, 2, 1, 1, dk(L.skin)); }
        if (L.cracks) { p(5, 3, 1, 2, '#FF7A2A'); p(10, 6, 1, 2, '#FF9A3A'); p(8, 3, 1, 1, '#FF7A2A'); }
        p(6, 5, 1, 2, L.eye); p(9, 5, 1, 2, L.eye);
        if (L.eyes4) { p(6, 3, 1, 1, L.eye); p(9, 3, 1, 1, L.eye); }
        if (L.fangs) { p(7, 8, 1, 1, '#F4F0EA'); p(8, 8, 1, 1, '#F4F0EA'); }   // 吸血人族的小尖牙
        if (L.beard) { p(5, 7, 6, 2, L.hair); p(6, 9, 4, 1, L.hair); }
        if (L.whisk) { p(3, 6, 1, 1, '#F4EEE6'); p(12, 6, 1, 1, '#F4EEE6'); }
      }
      hairTop(p, L, back ? 'back' : 'front');
    } else {
      // 側面（朝右）：跨步時兩腳分開；坐著沒有側面
      const leg = (lx, c, sh) => { p(lx, 16, 3, 5, c); p(lx, 21, 4, 2, sh); p(lx, 22, 4, 1, dk(sh)); };
      if (fr === 0) leg(6, L.pants, L.shoe);
      else if (atk) { leg(4, dk(L.pants), dk(L.shoe)); leg(9, L.pants, L.shoe); }
      else { const f = fr === 1; leg(f ? 4 : 9, dk(L.pants), dk(L.shoe)); leg(f ? 9 : 4, L.pants, L.shoe); }
      p(4, 9, 2, 8, L.cloak); p(4, 9, 1, 8, dk(L.cloak));
      p(5, 9, 6, 7, L.top); p(5, 9, 6, 1, lt(L.top)); p(5, 10, 1, 6, dk(L.top)); p(5, 15, 6, 1, L.belt);
      if (L.chain) for (let yy = 10; yy < 15; yy++) for (let xx = 6 + (yy % 2); xx < 11; xx += 2) p(xx, yy, 1, 1, dk(L.top));
      if (L.plate) { p(6, 8, 4, 2, lt(L.top)); p(8, 11, 3, 1, lt(L.top)); }
      if (swingP === 'wind' && wk !== 'thrust') { p(2, 3, 2, 7, L.top); p(2, 3, 1, 7, dk(L.top)); p(2, 2, 2, 1, L.skin); }
      else if (swingP === 'follow' && wk !== 'thrust') { p(8, 11, 2, 4, L.top); p(8, 11, 1, 4, dk(L.top)); p(9, 15, 2, 1, L.skin); }
      else if (atk) { p(8, 10, 3, 2, L.top); p(8, 11, 3, 1, dk(L.top)); p(11, 10, 1, 2, L.skin); }
      else { const sw = fr === 1 ? 2 : fr === 2 ? -2 : 0; p(7 + sw, 10, 2, 5, L.top); p(7 + sw, 10, 1, 5, dk(L.top)); p(7 + sw, 15, 2, 1, L.skin); }
      p(5, 2, 7, 7, L.skin); p(12, 5, 1, 1, L.skin); p(5, 7, 2, 2, dk(L.skin));
      if (L.rock) { p(8, 3, 1, 1, dk(L.skin)); p(6, 6, 1, 1, lt(L.skin)); }
      if (L.scales) { p(6, 3, 1, 1, dk(L.skin)); p(9, 7, 1, 1, dk(L.skin)); }
      if (L.cracks) { p(7, 3, 1, 2, '#FF7A2A'); p(9, 6, 1, 1, '#FF9A3A'); }
      p(10, 5, 1, 2, L.eye); if (L.eyes4) p(10, 3, 1, 1, L.eye); p(9, 8, 2, 1, dk(L.skin));
      if (L.beard) { p(8, 7, 4, 2, L.hair); p(9, 9, 2, 1, L.hair); }
      hairTop(p, L, 'side');
    }
    // 劇情人物的細節（storylooks.js）
    if (R.HERO_EXTRA) R.HERO_EXTRA(p, side ? 'side' : back ? 'back' : 'front', fr, L, { sit, atk, shade, clr: (a, b, w, h) => x.clearRect(ox + a, oy + b, w, h) });
    if (L.sig && R.HERO_SIG && R.HERO_SIG[L.sig]) R.HERO_SIG[L.sig](p, side ? 'side' : back ? 'back' : 'front', fr, L, sit, shade);
    // 暗影族：身邊飄著幾縷影子
    if (L.wisp && !sit) { const wc = 'rgba(36,28,58,0.85)'; (side ? [[3, 9], [12, 11], [2, 16], [13, 18], [4, 22]] : [[2, 9], [13, 10], [1, 14], [14, 15], [3, 21], [12, 22]]).forEach(([u, v]) => p(u, v, 1, 1, wc)); }
    // 帽子
    if (L.headBase && R.HEAD_DRAW && R.HEAD_DRAW[L.headBase]) R.HEAD_DRAW[L.headBase](p, { side, back, lt, dk });
    else if (L.head === 'light') { const s = '#C8A860'; p(1, 2, 14, 1, s); p(2, 1, 12, 1, lt(s)); p(4, 0, 8, 1, s); p(6, -1, 4, 1, dk(s)); p(1, 3, 14, 1, dk(dk(s))); p(9, 0, 3, 1, dk(s)); }
    else if (L.head === 'medium') { const s = '#7E8894'; p(3, 1, 10, 2, s); p(4, 1, 4, 1, lt(s)); p(3, 2, 2, 7, s); p(11, 2, 2, 7, dk(s)); if (back || side) { p(4, 2, 8, 7, s); for (let yy = 3; yy < 8; yy++) for (let xx = 4 + (yy % 2); xx < 12; xx += 2) p(xx, yy, 1, 1, dk(s)); } }
    else if (L.head === 'heavy') { const s = '#B8C0C8'; p(3, 0, 10, 4, s); p(3, 0, 10, 1, lt(s)); p(11, 1, 2, 3, dk(s)); p(7, -2, 2, 2, '#B8322A'); p(7, -2, 1, 1, lt('#B8322A')); if (!back) p(4, 4, side ? 3 : 8, 1, dk(dk(s))); }
    // 光環（浮在頭上）
    if (L.halo) { const g = '#FFE89A', d = '#D8B84A'; p(6, -5, 4, 1, g); p(4, -4, 2, 1, g); p(10, -4, 2, 1, d); p(6, -3, 4, 1, d); }
    if (sit) return;
    // 盾（騎士）
    if (L.shield && !side) { const sx = back ? 12 : 0, s = '#5E6E80'; p(sx, 10, 4, 6, s); p(sx, 10, 4, 1, lt(s)); p(sx + 3, 11, 1, 5, dk(s)); p(sx + 1, 11, 2, 4, '#C9A13A'); p(sx + 1, 12, 1, 2, lt('#C9A13A')); }
    // 武器（不能超出這一格：寬 24）
    const wp = L.weapon; if (!wp) return;
    const k = R.WEAPONS[wp] ? R.WEAPONS[wp].kind : 'melee', metal = '#D8DEE6', wood = '#7A5A36', dark = '#3A3A44';
    const hx = side ? (atk && k !== 'gun' && k !== 'bow' && k !== 'magic' ? 11 : 8) : 12, hy = side ? (atk ? 11 : 15) : atk ? 5 : 14;
    // 揮出去的刀身：從 (x0, y0) 往 (sx, sy) 一格一格畫 n 格，回傳尾端
    const ray = (x0, y0, sx, sy, n, col, w) => { let ex = x0, ey = y0; for (let i = 0; i < n; i++) { ex = Math.round(x0 + sx * i); ey = Math.round(y0 + sy * i); p(ex, ey, w || 1, 1, col); } return [ex, ey]; };
    // 掘礦的十字鎬（mining.js 掘礦時換上）：4 舉過頭、3 敲下去、5 敲進地裡；其他格拿在身邊
    if (wp === 'pickaxe') {
      const st = '#9AA2AC', hd = (x0, y0, n) => { p(x0, y0, n, 1, st); p(x0 - 1, y0 + 1, 1, 1, dk(st)); p(x0 + n, y0 + 1, 1, 1, dk(st)); p(x0 + 1, y0, n - 2, 1, lt(st)); };
      if (side) {
        if (fr === 4) { ray(9, 9, -0.45, -1, 10, wood); hd(1, -1, 9); }
        else if (fr === 3) { ray(10, 9, 1, 0.4, 8, wood); p(18, 8, 1, 10, st); p(17, 8, 1, 1, dk(st)); p(19, 17, 1, 1, dk(st)); }
        else if (fr === 5) { ray(10, 12, 0.9, 0.75, 7, wood); hd(12, 18, 7); }
        else { p(9, 7, 1, 9, wood); hd(6, 6, 7); }
      } else {
        if (fr === 4) { p(12, -3, 1, 9, wood); hd(8, -4, 9); }
        else if (fr === 3) { p(7, 10, 1, 6, wood); hd(4, 16, 7); }
        else if (fr === 5) { p(7, 12, 1, 6, wood); hd(4, 18, 7); }
        else { p(13, 6, 1, 9, wood); hd(10, 5, 7); }
      }
      return;
    }
    // 武術家（2026-10-04）：拳套是兩個拳頭、長棍是一根長木棍
    if (wp === 'gauntlet') {
      const gl = '#B8862E', gh = '#E8C87A', f = (x0, y0) => { p(x0, y0, 3, 3, gl); p(x0, y0, 3, 1, gh); };
      if (side) f(atk ? hx + 3 : hx, hy - 1); else { f(atk && fr === 3 ? 7 : hx, atk && fr === 3 ? hy + 6 : hy); f(1, atk && fr !== 3 ? hy + 5 : hy); }
      return;
    }
    if (wp === 'staffpole') {
      if (swingP) { if (side) ray(hx - 6, hy + 2, 1, -0.35, 14, wood); else ray(1, 12, 1, 0.25, 15, wood); }
      else if (side && atk) p(hx - 4, hy, 12, 1, wood);
      else { p(hx + 1, hy - 10, 1, 14, wood); p(hx + 1, hy - 10, 1, 1, '#C9A13A'); p(hx + 1, hy + 3, 1, 1, '#C9A13A'); }
      return;
    }
    // 新職業的武器（2026-10-04 classes2.js）：拿在手上的小東西（2026-10-04 作者：武器的大小統一一點——原本 3～4 格，放大到 5～7 格）
    const HELD = { lute: 1, flute: 1, tome: 1, bell: 1, chalk: 1, disc: 1, scrollb: 1, talisman: 1 };
    if (HELD[wp]) {
      const x0 = side ? hx : hx - 1, y0 = side ? hy - 2 : hy - 3;
      if (wp === 'lute') { p(x0 - 2, y0, 5, 5, '#A8743A'); p(x0 - 1, y0 + 1, 3, 3, '#3A2A1C'); p(x0 + 1, y0 - 7, 1, 7, '#6A4A2A'); p(x0, y0 - 8, 3, 1, '#4A3020'); }
      else if (wp === 'flute') { p(x0 + 1, y0 - 6, 1, 10, '#D8C8A8'); p(x0 + 1, y0 - 4, 1, 1, '#3A2A1C'); p(x0 + 1, y0 - 1, 1, 1, '#3A2A1C'); }
      else if (wp === 'tome') { p(x0 - 2, y0 - 1, 5, 6, '#6A2A3A'); p(x0 - 2, y0 - 1, 5, 1, '#E8D8A8'); p(x0 + 2, y0 - 1, 1, 6, '#C9A13A'); p(x0 - 1, y0 + 1, 2, 2, '#9AE8FF'); }
      else if (wp === 'bell') { p(x0 - 1, y0, 5, 4, '#E8C04A'); p(x0 - 1, y0, 1, 2, '#FFF0A0'); p(x0, y0 + 4, 3, 1, '#C89A2A'); p(x0 + 1, y0 - 3, 1, 3, '#8A6A2A'); }
      else if (wp === 'chalk') { p(x0 + 1, y0 - 7, 1, 9, '#F2EEE4'); p(x0 + 1, y0 - 8, 1, 1, '#7AC8E8'); }
      else if (wp === 'disc') { p(x0 - 2, y0 - 1, 6, 6, '#4A8AA8'); p(x0 - 1, y0, 4, 4, '#2E5A70'); p(x0, y0 + 1, 2, 2, '#BFF0FF'); }
      else if (wp === 'scrollb') { p(x0 - 2, y0 - 2, 5, 7, '#F2E8D0'); p(x0 - 2, y0 - 2, 5, 1, '#8A6A3A'); p(x0 - 2, y0 + 4, 5, 1, '#8A6A3A'); p(x0 - 1, y0 + 1, 3, 1, '#C83A3A'); }
      else if (wp === 'talisman') { p(x0 - 1, y0 - 3, 3, 7, '#F2E6A0'); p(x0, y0 - 2, 1, 1, '#C83A3A'); p(x0 - 1, y0, 3, 1, '#C83A3A'); p(x0, y0 + 2, 1, 1, '#C83A3A'); }
      return;
    }
    if (swingP && wp === 'spear') {
      // 長槍：舉起＝往後收、砍下＝刺到最遠、收招＝收回一點；正面看槍尖朝著鏡頭（縮短）
      if (side) { const back2 = swingP === 'wind' ? -6 : swingP === 'follow' ? -3 : -1, n = swingP === 'wind' ? 9 : 8; p(hx + back2, hy, n, 1, wood); p(hx + back2 + n, hy - 1, 2, 3, metal); return; }
      if (swingP !== 'wind') { const [ex, ey] = ray(7, 12, -0.5, 1, swingP === 'strike' ? 6 : 5, wood); p(ex - 1, ey + 1, 2, 2, metal); p(ex - 1, ey + 3, 1, 1, metal); return; }
    } else if (swingP && k === 'melee' && (side ? swingP !== 'strike' : swingP !== 'wind')) {
      const len = { greatsword: 10, axe: 9, sword: 9, katana: 9, dualblades: 7, mace: 8 }[wp] || 8, bw = wp === 'greatsword' ? 2 : 1, head = wp === 'axe' || wp === 'mace';
      const blade = (x0, y0, sx, sy, n) => {
        const [ex, ey] = ray(x0, y0, sx, sy, n, head ? wood : '#FFFFFF');
        if (bw === 2) ray(x0 + 1, y0, sx, sy, n, metal);
        if (!head) { p(ex, ey, 1, 1, metal); if (bw === 2) p(ex + 1, ey, 1, 1, metal); }
        if (wp === 'axe') { p(ex - 1, ey - 1, 3, 3, metal); p(ex + 1, ey - 1, 1, 3, dk(metal)); }
        if (wp === 'mace') { p(ex - 1, ey - 1, 3, 3, '#8A8A92'); p(ex - 1, ey - 1, 1, 1, lt('#8A8A92')); }
      };
      const gold = '#C9A13A';
      if (side && swingP === 'wind') { p(1, 2, 3, 1, gold); blade(2, 1, -0.55, -1, Math.min(len, 7)); }
      else if (side) { p(10, 15, 1, 2, gold); blade(11, 16, 1, 0.75, Math.min(len, 7)); }
      else if (swingP === 'strike') { p(7, 11, 1, 1, gold); p(8, 12, 1, 1, gold); blade(7, 12, -1, 1, Math.min(len, 8)); if (wp === 'dualblades') ray(3, 15, 0.4, 1, 4, '#FFFFFF'); }
      else { p(4, 13, 1, 1, gold); p(5, 14, 1, 1, gold); blade(4, 14, -0.7, 1, Math.min(len, 7)); if (wp === 'dualblades') ray(2, 15, -0.5, 1, 4, '#FFFFFF'); }
      return;
    }
    if (k === 'gun') { const len = wp === 'rifle' ? 7 : wp === 'shotgun' ? 6 : 5; if (side) { p(hx, hy - 1, len, 2, dark); p(hx, hy - 1, len, 1, lt(dark)); p(hx, hy + 1, 2, 2, wood); } else { p(hx, hy - 3, 2, len, dark); p(hx, hy - 3, 1, len, lt(dark)); } }
    else if (k === 'bow') { const h2 = wp === 'longbow' ? 10 : 9, top = side ? hy - Math.floor(h2 / 2) : hy - h2 + 2; p(hx + 1, top, 1, h2, wp === 'crossbow' ? dark : wood); p(hx + 2, top + 1, 1, 1, wood); p(hx + 2, top + h2 - 2, 1, 1, wood); p(hx, top + 1, 1, h2 - 2, '#E8E0D0'); }
    else if (k === 'magic') { const orb = wp === 'holystaff' ? '#FFE08A' : '#9A7AFF'; if (wp === 'orb') { p(hx, hy - 3, 3, 3, orb); p(hx, hy - 3, 1, 1, '#FFFFFF'); } else { p(hx + 1, hy - 11, 1, 13, wp === 'holystaff' ? '#E6DEC6' : wood); p(hx, hy - 13, 3, 3, orb); p(hx, hy - 13, 1, 1, '#FFFFFF'); } }
    else if (wp === 'spear') { if (side && atk) { p(hx, hy, 6, 1, wood); p(hx + 6, hy - 1, 2, 3, metal); } else { p(hx + 1, hy - 11, 1, 13, wood); p(hx, hy - 13, 3, 2, metal); p(hx + 1, hy - 14, 1, 1, metal); } }
    else {
      const len = { greatsword: 10, axe: 9, sword: 9, katana: 9, dualblades: 7, mace: 8 }[wp] || 8, bw = wp === 'greatsword' ? 2 : 1, blade = wp === 'mace' ? '#8A8A92' : metal;
      if (side && atk) { p(hx, hy, Math.min(len, 8), bw, blade); p(hx, hy, Math.min(len, 8), 1, '#FFFFFF'); p(hx - 1, hy - 1, 1, 3, '#C9A13A'); }
      else {
        p(hx + 1, hy - len, bw, len, wp === 'axe' || wp === 'mace' ? wood : blade); if (wp !== 'axe' && wp !== 'mace') p(hx + 1, hy - len, 1, len, '#FFFFFF');
        p(hx, hy, 3, 1, '#C9A13A'); p(hx + 1, hy + 1, 1, 2, '#3A2A1C');
        if (wp === 'axe') { p(hx + 1, hy - len, 3, 3, metal); p(hx + 3, hy - len, 1, 3, dk(metal)); }
        if (wp === 'mace') { p(hx, hy - len - 1, 3, 3, blade); p(hx, hy - len - 1, 1, 1, lt(blade)); }
        if (wp === 'katana') p(hx + 2, hy - len, 1, 2, blade);
      }
      if (wp === 'dualblades' && !side) p(1, hy - len, 1, len, metal);
    }
  };
  // 頭髮、耳朵、角、配件、兜帽（正面 front、背面 back、側面 side）
  const hairTop = (p, L, v) => {
    const EH = L.earCol || L.hair, EC = c => tint(c, L.earCol, L.ears === 'antenna' ? '#2A2A2A' : '#5A9A9A'), HC = c => tint(c, L.hornCol, ({ small: '#3A2A4A', dragon: '#E8D8B0', antler: '#C8A878', goat: '#D8D0C0', demon: '#141018' })[L.horns] || '#C8B890');
    const H = L.hair, dk = c => shade(c, -0.24), lt = c => shade(c, 0.2), hs = L.hs, bald = hs === 'bald';
    if (v === 'side') {
      if (!bald) {
        p(4, 1, 7, 2, H); p(4, 2, 3, 6, H); p(7, 3, 1, 1, H); p(5, 1, 3, 1, lt(H)); p(4, 6, 2, 2, dk(H));
        if (hs === 'long') { p(3, 3, 3, 8, H); p(3, 9, 2, 2, dk(H)); }
        else if (hs === 'ponytail') { p(2, 2, 2, 2, H); p(1, 4, 2, 5, H); p(1, 8, 1, 1, dk(H)); }
        else if (hs === 'bun') { p(3, 0, 3, 3, H); p(3, 0, 1, 1, lt(H)); }
        else if (hs === 'spiky') { p(5, 0, 1, 1, H); p(7, -1, 1, 2, H); p(9, 0, 1, 1, H); p(3, 2, 1, 2, H); }
        else if (hs === 'bob') { p(4, 2, 3, 7, H); p(3, 4, 1, 4, H); }
        else if (hs === 'braid') { p(3, 3, 2, 3, H); p(3, 6, 1, 6, H); p(3, 8, 1, 1, dk(H)); p(3, 11, 1, 1, dk(H)); }
        else if (hs === 'crop') { p(4, 3, 3, 4, L.skin); p(4, 1, 7, 1, H); p(4, 2, 2, 2, H); }
      } else if (L.crest) { p(6, 1, 5, 1, dk(L.skin)); p(5, 2, 1, 1, dk(L.skin)); }
      if (L.ears === 'cat' || L.ears === 'wolf') { p(6, 0, 2, 1, EH); p(6, -1, 1, 1, EH); if (L.ears === 'wolf') p(6, -2, 1, 1, EH); }
      else if (L.ears === 'fox') { p(5, 0, 3, 1, EH); p(5, -1, 2, 1, EH); p(5, -2, 1, 1, EH); p(6, 0, 1, 1, EC('#F0E6DA')); }
      else if (L.ears === 'dog') { p(5, 2, 2, 6, dk(EH)); p(5, 8, 1, 1, dk(EH)); }
      else if (L.ears === 'elf') { p(6, 4, 1, 2, L.skin); p(5, 3, 1, 1, L.skin); }
      else if (L.ears === 'fin') { p(4, 3, 3, 3, EC('#5A9A9A')); p(3, 4, 1, 2, EC('#7ABAB4')); }
      else if (L.ears === 'round') { p(6, -1, 2, 2, EH); }
      else if (L.ears === 'rabbit') { p(6, -5, 2, 5, EH); p(6, -4, 1, 3, EC('#F0C0C8')); }
      else if (L.ears === 'antenna') { p(7, -3, 1, 3, EC('#2A2A2A')); p(8, -4, 1, 1, EC('#2A2A2A')); }
      if (L.horns === 'small') { p(8, 0, 1, 2, HC('#3A2A4A')); }
      else if (L.horns === 'antler') { p(6, -1, 1, 2, HC('#C8A878')); p(5, -3, 1, 2, HC('#C8A878')); p(4, -3, 1, 1, HC('#C8A878')); p(6, -4, 1, 1, HC('#C8A878')); }
      else if (L.horns === 'goat') { p(6, 0, 1, 1, HC('#D8D0C0')); p(5, -1, 2, 1, HC('#D8D0C0')); p(4, 0, 1, 2, HC('#B8B0A0')); }
      else if (L.horns === 'dragon') { p(6, 0, 1, 2, HC('#E8D8B0')); p(5, -1, 1, 1, HC('#E8D8B0')); }
      else if (L.horns === 'demon') { p(7, 0, 1, 2, HC('#141018')); p(6, -1, 1, 2, HC('#141018')); p(5, -3, 1, 2, HC('#141018')); p(5, -4, 1, 1, HC('#4A3A5A')); }
      if (L.fin) { p(6, -1, 4, 2, '#5A9A9A'); p(7, -2, 2, 1, '#7ABAB4'); }
      if (L.leaves) { p(5, 0, 2, 1, '#5A8A3A'); p(8, -1, 2, 1, '#7AAA4A'); p(4, 2, 1, 1, '#4A7A2E'); }
      if (L.flame) { p(5, 0, 1, 1, '#FFB84A'); p(7, -1, 1, 2, '#FFD27A'); p(9, 0, 1, 1, '#FFB84A'); p(4, 1, 1, 2, '#FF8A3A'); }
      if (L.gem) p(10, 2, 1, 2, '#B07AFF');
      if (L.acc === 'glasses') { p(9, 5, 2, 2, '#BFD6E2'); p(10, 5, 1, 2, L.eye); p(5, 4, 5, 1, '#3A3030'); }
      else if (L.acc === 'headband') { p(4, 3, 8, 1, L.accCol); p(3, 4, 1, 3, L.accCol); }
      else if (L.acc === 'eyepatch') { p(9, 4, 2, 3, '#141414'); p(5, 3, 4, 1, '#141414'); }
      else if (L.acc === 'earring') p(7, 7, 1, 1, '#E8C04A');
      else if (L.acc === 'flower') { p(5, 1, 2, 2, '#F2A0B8'); p(5, 1, 1, 1, '#FFFFFF'); }
      else if (L.acc === 'scarf') { p(5, 8, 6, 2, L.accCol); p(2, 9, 3, 2, L.accCol); p(1, 11, 2, 2, dk(L.accCol)); }
      if (L.hood) { const c = L.hood; p(4, 0, 8, 3, c); p(4, 3, 4, 6, c); p(3, 2, 1, 7, dk(c)); p(4, 0, 6, 1, lt(c)); p(8, 3, 3, 1, dk(L.skin)); }
      return;
    }
    const front = v === 'front';
    if (!bald) {
      p(4, 1, 8, 2, H); p(3, 2, 1, 5, H); p(12, 2, 1, 5, dk(H)); p(5, 1, 3, 1, lt(H));
      if (front && hs !== 'crop') { p(4, 3, 2, 1, H); p(10, 3, 2, 1, H); }
      if (hs === 'long') { p(3, 2, 1, 9, H); p(12, 2, 1, 9, dk(H)); if (!front) p(4, 8, 8, 4, H); }
      else if (hs === 'ponytail') { if (front) p(7, 0, 2, 1, dk(H)); else { p(7, 8, 2, 6, H); p(7, 13, 1, 1, dk(H)); } }
      else if (hs === 'bun') { p(6, -1, 4, 2, H); p(7, -2, 2, 1, H); p(6, -1, 1, 1, lt(H)); }
      else if (hs === 'spiky') { p(4, 0, 1, 1, H); p(6, -1, 1, 2, H); p(8, -1, 1, 2, H); p(10, -1, 1, 2, H); p(11, 0, 1, 1, H); if (front) { p(5, 3, 1, 2, H); p(8, 3, 1, 1, H); } }
      else if (hs === 'bob') { p(3, 2, 1, 7, H); p(12, 2, 1, 7, dk(H)); if (front) { p(4, 7, 1, 2, H); p(11, 7, 1, 2, dk(H)); } else p(4, 8, 8, 1, dk(H)); }
      else if (hs === 'braid') { if (front) { p(12, 6, 1, 6, H); p(12, 8, 1, 1, dk(H)); p(12, 11, 1, 1, dk(H)); } else { p(3, 6, 1, 6, H); p(3, 9, 1, 1, dk(H)); } }
      else if (hs === 'crop') { p(3, 2, 1, 2, H); p(12, 2, 1, 2, dk(H)); if (front) { p(3, 4, 1, 3, L.skin); p(12, 4, 1, 3, dk(L.skin)); } }
    } else if (L.crest) { p(5, 1, 6, 1, dk(L.skin)); p(7, 0, 2, 1, dk(L.skin)); }
    else if (!front) p(4, 2, 8, 1, lt(L.skin));
    // 耳朵（畫在頭髮之後）
    const E = L.ears;
    if (E === 'elf') { p(2, 4, 2, 1, L.skin); p(1, 3, 1, 1, L.skin); p(12, 4, 2, 1, dk(L.skin)); p(14, 3, 1, 1, dk(L.skin)); }
    else if (E === 'cat') { p(4, 0, 3, 1, EH); p(4, -1, 2, 1, EH); p(4, -2, 1, 1, EH); p(9, 0, 3, 1, EH); p(10, -1, 2, 1, EH); p(11, -2, 1, 1, EH); if (front) { p(5, 0, 1, 1, EC('#E8A0A8')); p(10, 0, 1, 1, EC('#E8A0A8')); } }
    else if (E === 'fox') { p(3, 0, 4, 1, EH); p(3, -1, 3, 1, EH); p(3, -2, 2, 1, EH); p(3, -3, 1, 1, EH); p(9, 0, 4, 1, EH); p(10, -1, 3, 1, EH); p(11, -2, 2, 1, EH); p(12, -3, 1, 1, EH); if (front) { p(4, 0, 2, 1, EC('#F0E6DA')); p(10, 0, 2, 1, EC('#F0E6DA')); } }
    else if (E === 'wolf') { p(4, 0, 3, 1, EH); p(4, -1, 2, 1, EH); p(4, -2, 2, 1, EH); p(4, -3, 1, 1, EH); p(9, 0, 3, 1, EH); p(10, -1, 2, 1, EH); p(10, -2, 2, 1, EH); p(11, -3, 1, 1, EH); }
    else if (E === 'dog') { p(2, 2, 2, 5, dk(EH)); p(2, 7, 1, 1, dk(EH)); p(12, 2, 2, 5, dk(EH)); p(13, 7, 1, 1, dk(EH)); }
    else if (E === 'fin') { p(1, 3, 2, 4, EC('#5A9A9A')); p(0, 4, 1, 2, EC('#7ABAB4')); p(13, 3, 2, 4, EC('#5A9A9A')); p(15, 4, 1, 2, EC('#7ABAB4')); }
    else if (E === 'round') { p(3, -1, 3, 2, EH); p(10, -1, 3, 2, EH); if (front) { p(4, 0, 1, 1, EC('#E8B0A0')); p(11, 0, 1, 1, EC('#E8B0A0')); } }
    else if (E === 'rabbit') { p(5, -5, 2, 6, EH); p(9, -5, 2, 6, EH); if (front) { p(5, -4, 1, 4, EC('#F0C0C8')); p(10, -4, 1, 4, EC('#F0C0C8')); } }
    else if (E === 'antenna') { p(5, -3, 1, 3, EC('#2A2A2A')); p(4, -4, 1, 1, EC('#2A2A2A')); p(10, -3, 1, 3, EC('#2A2A2A')); p(11, -4, 1, 1, EC('#2A2A2A')); }
    if (L.horns === 'small') { p(5, 0, 1, 1, HC('#3A2A4A')); p(5, -1, 1, 1, HC('#5A4A6A')); p(10, 0, 1, 1, HC('#3A2A4A')); p(10, -1, 1, 1, HC('#5A4A6A')); }
    else if (L.horns === 'dragon') { p(4, 0, 1, 2, HC('#E8D8B0')); p(3, -1, 1, 1, HC('#E8D8B0')); p(11, 0, 1, 2, HC('#C8B890')); p(12, -1, 1, 1, HC('#C8B890')); }
    else if (L.horns === 'antler') { p(4, -1, 1, 2, HC('#C8A878')); p(3, -3, 1, 2, HC('#C8A878')); p(2, -3, 1, 1, HC('#C8A878')); p(4, -4, 1, 1, HC('#C8A878')); p(11, -1, 1, 2, HC('#C8A878')); p(12, -3, 1, 2, HC('#C8A878')); p(13, -3, 1, 1, HC('#C8A878')); p(11, -4, 1, 1, HC('#C8A878')); }
    else if (L.horns === 'goat') { p(4, 0, 1, 1, HC('#D8D0C0')); p(3, -1, 2, 1, HC('#D8D0C0')); p(2, 0, 1, 2, HC('#B8B0A0')); p(11, 0, 1, 1, HC('#D8D0C0')); p(11, -1, 2, 1, HC('#D8D0C0')); p(13, 0, 1, 2, HC('#B8B0A0')); }
    else if (L.horns === 'demon') { p(4, 0, 1, 2, HC('#141018')); p(3, -1, 1, 2, HC('#141018')); p(2, -3, 1, 2, HC('#141018')); p(3, -4, 1, 1, HC('#4A3A5A')); p(11, 0, 1, 2, HC('#141018')); p(12, -1, 1, 2, HC('#141018')); p(13, -3, 1, 2, HC('#141018')); p(12, -4, 1, 1, HC('#4A3A5A')); }
    if (L.fin) { p(7, -1, 2, 2, '#5A9A9A'); p(7, -2, 1, 1, '#7ABAB4'); }
    if (L.leaves) { p(5, 0, 2, 1, '#5A8A3A'); p(6, -1, 1, 1, '#7AAA4A'); p(9, 0, 2, 1, '#4A7A2E'); p(10, -1, 1, 1, '#7AAA4A'); }
    if (L.flame) { p(5, 0, 1, 1, '#FFB84A'); p(7, -1, 1, 2, '#FFD27A'); p(9, 0, 1, 1, '#FFB84A'); p(11, 0, 1, 1, '#FF8A3A'); p(4, -1, 1, 1, '#FF8A3A'); }
    if (front) {
      if (L.gem) { p(7, 2, 2, 2, '#B07AFF'); p(7, 2, 1, 1, '#E0C8FF'); }
      if (L.acc === 'glasses') { p(5, 4, 6, 1, '#3A3030'); p(5, 5, 2, 2, '#BFD6E2'); p(9, 5, 2, 2, '#BFD6E2'); p(6, 5, 1, 2, L.eye); p(9, 5, 1, 2, L.eye); p(7, 5, 2, 1, '#3A3030'); }
      else if (L.acc === 'eyepatch') { p(9, 4, 2, 3, '#141414'); p(4, 3, 5, 1, '#141414'); p(11, 3, 1, 1, '#141414'); }
      else if (L.acc === 'earring') p(12, 7, 1, 1, '#E8C04A');
    }
    if (L.acc === 'headband') { p(4, 3, 8, 1, L.accCol); if (!front) { p(7, 4, 2, 3, L.accCol); p(7, 7, 1, 1, dk(L.accCol)); } }
    else if (L.acc === 'flower') { p(front ? 10 : 4, 1, 2, 2, '#F2A0B8'); p(front ? 10 : 4, 1, 1, 1, '#FFFFFF'); }
    else if (L.acc === 'scarf') { p(4, 8, 8, 2, L.accCol); if (front) { p(9, 10, 2, 3, L.accCol); p(9, 12, 2, 1, dk(L.accCol)); } else { p(6, 10, 2, 4, L.accCol); p(8, 10, 1, 3, dk(L.accCol)); } }
    if (L.hood) {
      const c = L.hood;
      if (front) { p(3, 0, 10, 3, c); p(3, 3, 2, 6, c); p(11, 3, 2, 6, dk(c)); p(4, 0, 6, 1, lt(c)); p(5, 3, 6, 1, dk(L.skin)); }
      else { p(3, 0, 10, 10, c); p(4, 0, 6, 1, lt(c)); p(3, 8, 10, 2, dk(c)); }
    }
  };
  // 翻滾的一格：身體縮成一團，頭髮、披風、鞋子跟著轉（a：轉了幾分之一圈）
  const drawRoll = (x, ox, oy, a, L) => {
    const cx = 12, cy = 21.5, r = 6.6, th = a * Math.PI * 2;
    for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
      const dx = i + 0.5 - cx, dy = j + 0.5 - cy, d = Math.hypot(dx, dy); if (d > r) continue;
      let ang = Math.atan2(dy, dx) - th; ang = Math.atan2(Math.sin(ang), Math.cos(ang));
      // 上方（ang≈-90°）是頭、下方是腳、前面（右）是胸口、後面（左）是披風
      let c = Math.abs(ang + Math.PI / 2) < 0.75 ? (d < r * 0.42 ? L.skin : L.hs === 'bald' ? L.skin : L.hair) : Math.abs(ang - Math.PI / 2) < 0.6 ? (d > r * 0.62 ? L.shoe : L.pants) : Math.abs(ang) < Math.PI / 2 ? L.top : L.cloak;
      if (L.hood && Math.abs(ang + Math.PI / 2) < 0.75) c = L.hood;
      if (dx + dy < -r * 0.55) c = shade(c, 0.18); else if (dx + dy > r * 0.5) c = shade(c, -0.25);
      x.fillStyle = c; x.fillRect(ox + i, oy + j, 1, 1);
    }
    // 轉動的線條：腰帶
    const bx = Math.round(cx + Math.cos(th) * 3.2 - 0.5), by = Math.round(cy + Math.sin(th) * 3.2 - 0.5);
    x.fillStyle = L.belt; x.fillRect(ox + bx, oy + by, 2, 1);
  };
  // 刀光殘影：圓心 (cx, cy)、半徑 r，從 a0 度掃到 a1 度（y 往下為正）；mirror：朝左那一列（左右相反）
  const smear = (x, ox, oy, cx, cy, r, a0, a1, mirror) => {
    x.save(); x.globalCompositeOperation = 'destination-over';
    [[r, 'rgba(255,255,255,0.9)'], [r - 1, 'rgba(214,228,255,0.62)']].forEach(([rr, col]) => {
      x.fillStyle = col; const n = Math.ceil(Math.abs(a1 - a0) / 5);
      for (let i = 0; i <= n; i++) {
        const t = (a0 + (a1 - a0) * i / n) * Math.PI / 180, u = Math.round(cx + Math.cos(t) * rr), v = Math.round(cy + Math.sin(t) * rr), a = mirror ? 15 - u : u;
        if (a >= -4 && a <= 19 && v >= -5 && v <= 24) x.fillRect(ox + a, oy + v, 1, 1);
      }
    });
    x.restore();
  };
  const heroSheet = o => {
    const L = heroLook(o), c = cvs(FW * COLS, FH * ROWS), x = c.getContext('2d');
    const NF = o.lite ? 3 : COLS;
    for (let dir = 0; dir < 3; dir++) for (let fr = 0; fr < NF; fr++) drawHero(x, fr * FW + BX, dir * FH + BY, dir, fr, L);
    // 朝左＝朝右的鏡像
    const mirror = (sx, sy, dx, dy) => { x.save(); x.translate(dx + FW, dy); x.scale(-1, 1); x.drawImage(c, sx, sy, FW, FH, 0, 0, FW, FH); x.restore(); };
    for (let fr = 0; fr < NF; fr++) mirror(fr * FW, 2 * FH, fr * FW, 3 * FH);
    if (o.lite) { outline(c); return c; }
    // 翻滾：往右滾四格，往左是鏡像
    for (let fr = 0; fr < 4; fr++) drawRoll(x, fr * FW, 4 * FH, fr / 4, L);
    for (let fr = 0; fr < 4; fr++) mirror(fr * FW, 4 * FH, fr * FW, 5 * FH);
    // 倒下：側面（不拿武器）轉 90 度躺在地上，臉朝上
    const tmp = cvs(FW, FH), tx = tmp.getContext('2d'), Ld = Object.assign({}, L, { weapon: null, shield: false, wings: null, halo: null });
    drawHero(tx, BX, BY, 2, 0, Ld);
    x.save(); x.translate(-5, FH * 6 + 36); x.rotate(-Math.PI / 2); x.drawImage(tmp, 0, 0); x.restore();
    mirror(0, 6 * FH, FW, 6 * FH);
    // 坐著：正面、背面（往下挪四格，膝蓋朝前）
    drawHero(x, 2 * FW + BX, 6 * FH + BY + 4, 0, 0, L, 'sit');
    drawHero(x, 3 * FW + BX, 6 * FH + BY + 4, 1, 0, L, 'sit');
    outline(c);
    // 砍下那一格：刀子劃過的殘影（畫在外框之後才不會被描黑邊；只畫在空白的地方，不蓋到身體）
    if (L.weapon && R.WEAPONS[L.weapon] && R.WEAPONS[L.weapon].kind === 'melee') {
      smear(x, 3 * FW + BX, BY, 10, 8, 9, -80, 125); smear(x, 3 * FW + BX, FH + BY, 10, 8, 9, -80, 125);
      smear(x, 3 * FW + BX, 2 * FH + BY, 8, 10, 9, -150, 0); smear(x, 3 * FW + BX, 3 * FH + BY, 8, 10, 9, -150, 0, true);
    }
    // 黑色剪影：還沒見過的人只看得到輪廓
    if (o.sil) { const d = x.getImageData(0, 0, c.width, c.height), a = d.data; for (let i = 0; i < a.length; i += 4) if (a[i + 3]) { a[i] = 8; a[i + 1] = 7; a[i + 2] = 12; } x.putImageData(d, 0, 0); }
    return c;
  };
  R.heroSheetCanvas = o => heroSheet(o);
  R.HERO_FRAME = { FW, FH, ROWS, COLS };
  const dummy = () => new (T().Group)();
  const litePool = {};
  R.makeHeroSprite = (cls, weaponBase, look) => {
    const c = R.CLASSES[cls], o = Object.assign({ top: c.look.top, hair: c.look.hair, cloak: c.look.cloak, weapon: weaponBase, shield: !!c.shield, eq: null }, look || {});
    const sheetC = o.pool ? (litePool[o.pool] || (litePool[o.pool] = heroSheet(o))) : heroSheet(o);
    const g = new (T().Group)(), sp = billboard(sheetC, COLS, ROWS, FW, FH, FH - (BY + 23) - 1); g.add(sp.m); addShadow(g, 0.45);
    return { g, sp, spr: sp.m, opt: o, isSprite: true, hip: dummy(), legL: dummy(), legR: dummy(), armL: dummy(), armR: dummy(), head: dummy(), hand: dummy(), offhand: dummy(), phase: 0, swing: 0, recoil: 0, roll: 0, kind: R.WEAPONS[weaponBase] ? R.WEAPONS[weaponBase].kind : 'melee', base: weaponBase, dress: null };
  };
  const rebuildHero = h => { h.sp.t.image = heroSheet(h.opt); h.sp.t.needsUpdate = true; };
  R.spriteLook = (h, look) => { Object.assign(h.opt, look); rebuildHero(h); };
  R.animHeroSprite = (h, speed, dt, aim) => {
    const cam = R.W.cam ? R.W.cam.yaw : 0, rel = wrap(h.g.rotation.y - cam);
    h.spr.position.set(0, 0, 0); h.spr.rotation.z = 0;
    // 倒下：躺著（頭朝哪邊看倒下前面向哪邊）
    if (h.down) { setFrame(h.sp, h.downL ? 1 : 0, 6); face(h.g, h.spr); return; }
    if (h.sit) { setFrame(h.sp, Math.abs(rel) > Math.PI / 2 ? 3 : 2, 6); face(h.g, h.spr); return; }
    // 翻滾：縮成一團滾過去（往畫面的哪一邊滾，就用哪一列）
    if (h.roll > 0) {
      h.roll = Math.max(0, h.roll - dt);
      const k = 1 - h.roll / (h.rollDur || 0.32), fr = Math.min(3, Math.floor(k * 4));
      setFrame(h.sp, fr, h.rollRight ? 4 : 5); face(h.g, h.spr);
      h.spr.position.y = Math.sin(k * Math.PI) * 0.1;
      return;
    }
    h.phase += dt * (3 + speed * 1.3);
    let fr = speed > 0.5 ? (Math.floor(h.phase / Math.PI) % 2 ? 1 : 2) : 0;
    if (h.swing > 0) { h.swing = Math.max(0, h.swing - dt); fr = 3; }
    // 近戰三格：舉起（很短）→ 砍下 → 收招
    if (h.atk) { const A = h.atk; A.t += dt; if (A.t >= A.dur) h.atk = null; else fr = A.t < A.wind ? 4 : A.t < A.wind + (A.dur - A.wind) * 0.42 ? 3 : 5; }
    if (h.recoil > 0) { h.recoil = Math.max(0, h.recoil - dt * 6); if (h.recoil > 0.3) fr = 3; }
    if (aim && (h.kind === 'gun' || h.kind === 'bow' || h.kind === 'magic') && fr === 0) fr = 3;
    const dir = Math.abs(rel) < Math.PI / 4 ? 0 : Math.abs(rel) > Math.PI * 3 / 4 ? 1 : rel > 0 ? 2 : 3;
    setFrame(h.sp, fr, dir); face(h.g, h.spr);
  };
  // 近戰出手：wind 秒舉起，總共 dur 秒
  R.swingAnim = (h, wind, dur) => { if (h) h.atk = { t: 0, wind, dur }; };
  // 開始翻滾：記下往畫面的左邊還是右邊滾
  R.startRoll = (h, yaw, dur) => { const cam = R.W.cam ? R.W.cam.yaw : 0, s = Math.sin(wrap(yaw - cam)); h.rollRight = Math.abs(s) > 0.2 ? s > 0 : h.rollRight != null ? h.rollRight : true; h.roll = dur; h.rollDur = dur; };
  // 倒下、站起來
  R.setDown = (h, on) => { if (!h) return; const cam = R.W.cam ? R.W.cam.yaw : 0; h.down = !!on; if (on) h.downL = Math.sin(wrap(h.g.rotation.y - cam)) < 0; h.g.rotation.x = 0; h.g.position.y = 0; };


  // ---------- 遺跡生物（字串點陣，朝右；朝左用鏡像）----------
  const ART = {
    kousaku: { pal: { a: '#6E5A4A', b: '#8A7462', d: '#4A3A2E', c: '#8A74FF', C: '#C8B4FF', g: '#A3ACB6', G: '#E0E6EC', l: '#3A2E26', e: '#FFD24A' },
      a: ['........C.....G.......', '.......cC....gG..C....', '......ccc...ggg.cC....', '.....bbbbbbbbbbbbcc...', '....bbaaaaaaaaaaabb...', '...baaaaaaaaaaaaaaab..', '..baaaaaaaaaaaaaaaaab.', '..daaaaaaaaaaaaaaaaaae', '..ddaaaaaaaaaaaaaaaadd', '...dddddddddddddddddd.', '...l..l..l...l..l..l..', '..l..l..l...l..l..l...'],
      b: ['........C.....G.......', '.......cC....gG..C....', '......ccc...ggg.cC....', '.....bbbbbbbbbbbbcc...', '....bbaaaaaaaaaaabb...', '...baaaaaaaaaaaaaaab..', '..baaaaaaaaaaaaaaaaab.', '..daaaaaaaaaaaaaaaaaae', '..ddaaaaaaaaaaaaaaaadd', '...dddddddddddddddddd.', '....l..l..l...l..l..l.', '...l..l..l...l..l..l..'] },
    kamaitachi: { pal: { a: '#C9D6E0', b: '#EEF4F8', d: '#8A9AA6', k: '#DDE6EE', K: '#FFFFFF', e: '#1A6A8A', n: '#2A2A30', s: '#C8323A' },
      a: ['..............aa..', '.............abae.', 'd...........aaaaan', 'dd.........ssaaa..', '.dd..aaaaaaaasa...', '..daaaaaaaaaaaa.kK', '...aaaaaaaaaaaakK.', '....ddddddddd.kK..', '....a.a....a.a....', '...a...a..a...a...'],
      b: ['..............aa..', '.............abae.', 'd...........aaaaan', 'dd.........ssaaa..', '.dd..aaaaaaaasa...', '..daaaaaaaaaaaa.kK', '...aaaaaaaaaaaakK.', '....ddddddddd.kK..', '.....a.a..a.a.....', '.....a.a..a.a.....'] },
    onibi: { pal: { d: '#3A8ACF', f: '#7FD8FF', F: '#E6F8FF', e: '#FFFFFF', p: '#1A3A5A' },
      a: ['.....d......', '.....fd.....', '....dff.....', '....fFfd....', '...dfFFf.d..', '..dfFFFFfd..', '.dfFFFFFFfd.', '.fFFeFFeFFf.', 'dfFFpFFpFFfd', 'dfFFFFFFFFfd', 'dfFFFFFFFFfd', '.dfFFFFFFfd.', '..dfFFFFfd..', '...ddffdd...'],
      b: ['......d.....', '.....df.....', '.....ffd....', '....dfFf....', '..d.fFFfd...', '..dfFFFFfd..', '.dfFFFFFFfd.', '.fFFeFFeFFf.', 'dfFFpFFpFFfd', 'dfFFFFFFFFfd', 'dfFFFFFFFFfd', '.dfFFFFFFfd.', '..dfFFFFfd..', '...ddffdd...'] },
    okuriinu: { pal: { a: '#4A4458', b: '#6A6478', d: '#2E2A38', e: '#E05AFF', n: '#1A1420' },
      a: ['...............b.b..', '..............aa.aa.', 'd.............aaaae.', 'dd...........aaaaaan', '.dd..........aaaa...', '..aaaaaaaaaaaaaa....', '.baaaaaaaaaaaaaa....', '.aaaaaaaaaaaaaad....', '..dddddddddddddd....', '..a..a......a..a....', '.a...a.....a...a....', '.a....a....a....a...'],
      b: ['...............b.b..', '..............aa.aa.', 'd.............aaaae.', 'dd...........aaaaaan', '.dd..........aaaa...', '..aaaaaaaaaaaaaa....', '.baaaaaaaaaaaaaa....', '.aaaaaaaaaaaaaad....', '..dddddddddddddd....', '...a.a.......aa.....', '...a.a.......aa.....', '..a..a......a..a....'] },
    kasa: { pal: { d: '#8A2A1E', r: '#C8503A', R: '#E88A6A', e: '#FFFFFF', p: '#140A0A', t: '#E0323A', w: '#6A4A2E', W: '#8A6A4A' },
      a: ['.......dd.......', '......drrd......', '.....drRrrd.....', '....drRrrrrd....', '...drRreeerrd...', '..drRreepperrd..', '.drRrreepperrrd.', 'drRrrrreeerrrrrd', 'dddrdddrddrdddrd', 'd..d..dwtd..d..d', '.......wtt......', '.......wt.......', '.......w........', '.......w........', '.......w........', '.......w........', '.......w........', '.......w........', '......WwW.......', '.....WWwWW......'] },
    chochin: { pal: { d: '#6A3A1A', o: '#F2B45A', O: '#FFE0A0', e: '#FFFFFF', p: '#2A1A10', m: '#8A1A1A', M: '#E04A3A' },
      a: ['...dddddd...', '..dddddddd..', '.oOOOOOOOOo.', 'oOOOOOOOOOOo', 'dddddddddddd', 'oOOeeOOeeOOo', 'oOOepOOepOOo', 'dddddddddddd', 'oOOOOOOOOOOo', 'oOmmmmmmmmOo', 'dmMMMMMMMMmd', 'oOmmmmmmmmOo', 'oOOOOOOOOOOo', 'dddddddddddd', '.oOOOOOOOOo.', '..dddddddd..', '...dddddd...'],
      b: ['...dddddd...', '..dddddddd..', '.oOOOOOOOOo.', 'oOOOOOOOOOOo', 'dddddddddddd', 'oOOeeOOeeOOo', 'oOOepOOepOOo', 'dddddddddddd', 'oOOOOOOOOOOo', 'oOOOOOOOOOOo', 'ddmmmmmmmmdd', 'oOOOOOOOOOOo', 'oOOOOOOOOOOo', 'dddddddddddd', '.oOOOOOOOOo.', '..dddddddd..', '...dddddd...'] },
    gaki: { pal: { a: '#9A6A6A', b: '#B88A8A', d: '#6A4A4A', e: '#FFE0A0', p: '#2A1010' },
      a: ['....aaaa....', '...aaaaaa...', '...aeaaea...', '...apaapa...', '....aaaa....', '..a.aaaa.a..', '.a.bbbbbb.a.', 'a..bbbbbbb.a', '...bbbbbbb..', '....bbbbb...', '....d...d...', '....d...d...', '...dd...dd..'],
      b: ['....aaaa....', '...aaaaaa...', '...aeaaea...', '...apaapa...', '....aaaa....', '.a..aaaa..a.', 'a..bbbbbb..a', '...bbbbbbb..', '...bbbbbbb..', '....bbbbb...', '....d..d....', '...d....d...', '..dd....dd..'] },
    sunakake: { pal: { h: '#E8E0D0', s: '#D8B890', e: '#2A1A10', r: '#B89A6A', R: '#D8BA8A', d: '#8A6A3A' },
      a: ['....hhhhh.....', '...hhhhhhh....', '...hsssssh....', '...ssesess....', '....sssss.....', '...rrrrrrr.dd.', '..rRRrrrrrrddd', '..rRrrrrrrrddd', '.rRrrrrrrrr.d.', '.rRrrrrrrrr...', '.rRrrrrrrrr...', 'rRrrrrrrrrrr..', 'rRrrrrrrrrrr..', 'rrrrrrrrrrrr..', '.dd.....dd....'] },
    isonade: { pal: { a: '#2E5A6A', b: '#4A7A8A', B: '#9ACAD8', d: '#1A3A48', e: '#9AFFE0', h: '#DDEEFF' },
      a: ['...........dd.............', '..........ddd.............', 'h........aaaaaaaaaa.......', 'hh.....aaabbbbbbbbaaaa....', '.hh..aaabbbbbbbbbbbbaaaa..', '..hdaaabbbbbbbbbbbbbbbeaa.', '..ddaaaaaaaaaaaaaaaaaaaaaa', '.hdaaaBBBBBBBBBBBBBBBaaaa.', 'hh...aaaBBBBBBBBBBBBaaa...', 'h.......aaaaaaaaaaaaa.....', '..........d.....d.........'] },
    yukionna: { pal: { h: '#101014', s: '#F4F8FA', e: '#5FB8FF', w: '#DDE8F0', W: '#FFFFFF', b: '#9AC0E0', o: '#8AB8E8' },
      a: ['....hhhhh.....', '...hhhhhhh....', '...hsssssh....', '...hsesesh....', '...hssssshh...', '...hhsssshh...', '..hhhwwwwhhh..', '..hwwwWWwwwh..', '.hwwWWWWWwwwh.', '.hwwWWWWWwwwh.', '.hwwoooooowwh.', '..wwWWWWWwww..', '..wwWWbWWwww..', '..wwWWWWbwww..', '..wwWbWWWwww..', '.wwwWWWWWwwww.', '.wwwWWWbWwwww.', '.wwWWbWWWWwww.', 'wwwWWWWWWWwwww', 'wwwwwwwwwwwwww'] },
    kodama: { pal: { w: '#F2F4EC', g: '#C8CCC0', d: '#9A9E92', k: '#141414' },
      a: ['....wwww....', '..wwwwwwgg..', '.wwwwwwwwwg.', '.wwkkwwkkwg.', 'wwwkkwwkkwwg', 'wwwwwwwwwwwg', 'wwwwwkkwwwwg', '.wwwwkkwwwg.', '.gwwwwwwwgg.', '..ggggggg...', '....wwww....', '...wwwwwwg..', '...gwwwwg...', '...w.gg.w...', '...ww..ww...'],
      b: ['.....wwww...', '...wwwwwwgg.', '..wwwwwwwwwg', '..wwkkwwkkwg', '.wwwkkwwkkwg', '.wwwwwwwwwwg', '.wwwwwkkwwwg', '..wwwwkkwwg.', '..gwwwwwwgg.', '...ggggggg..', '....wwww....', '...wwwwwwg..', '...gwwwwg...', '....wggw....', '...ww..ww...'] },
    ittan: { pal: { w: '#F2F0E8', g: '#CCC8BC', d: '#A09C90', k: '#1A1A1A' },
      a: ['..........................', '...................wwwwww.', '..ggg.............wwkwkww.', '.gwwwgg.........wwwwwwwww.', 'gwwwwwwgg.....wwwwwwwwwg..', '.ggwwwwwwgggwwwwwwwgggg...', '...ggwwwwwwwwwwwgggg......', '.....ggggwwwwggg..........', '.........gggg.............', '..........................'],
      b: ['..........................', '...................wwwwww.', '..................wwkwkww.', 'gg..............wwwwwwwww.', 'gwwgg.........wwwwwwwwwg..', '.gwwwwggg...wwwwwwwgggg...', '..ggwwwwwwwwwwwgggg.......', '....gggwwwwwwgg...........', '.......gggggg.............', '..........................'] },
    kappa: { pal: { g: '#5A8A5A', G: '#7EAE6E', d: '#3A6A3A', y: '#E8C04A', b: '#BFE0F0', B: '#8AB8D0', s: '#7A5A3A', S: '#5A3E26', w: '#FFFFFF', k: '#141414' },
      a: ['.....BBBBBB.....', '....BbbbbbbB....', '....dBBBBBBd....', '...ddggggggdd...', '...dgggggwwgg...', '..ssggggggwkgy..', '.sSsgggggggggyy.', '.sSsggggggggyy..', '.sSsgGGGgggg....', '.sSsgGGGgggg.g..', '.sSsgGGGggggg...', '.sSsgGGGgggg....', '..ssgGGGgggg....', '...sgGGggggg....', '....gggggg......', '....gg..gg......', '....gg..gg......', '...ggg..ggg.....', '................'],
      b: ['.....BBBBBB.....', '....BbbbbbbB....', '....dBBBBBBd....', '...ddggggggdd...', '...dgggggwwgg...', '..ssggggggwkgy..', '.sSsgggggggggyy.', '.sSsggggggggyy..', '.sSsgGGGgggg....', '.sSsgGGGgggg.g..', '.sSsgGGGggggg...', '.sSsgGGGgggg....', '..ssgGGGgggg....', '...sgGGggggg....', '....gggggg......', '....gg...gg.....', '...gg.....gg....', '..ggg.....ggg...', '................'] },
    nozuchi: { pal: { a: '#7A6A4A', b: '#A08E66', d: '#5A4A32', m: '#3A1A10', p: '#C86A5A', t: '#E8E0D0' },
      a: ['........................', '.......dddddddddd.......', '.....ddaaaaaaaaaadd.....', '....daaaaaaaaaaaaaadmm..', '..ddaaaaaaaaaaaaaaamttm.', '.daaaaaaaaaaaaaaaaamppm.', 'daaaabbbbbbbbbbbbbampp..', '.ddabbbbbbbbbbbbbbamttm.', '...ddbbbbbbbbbbbbbbmmm..', '.....dddbbbbbbbbbbdd....', '........dddddddddd......', '........................'],
      b: ['........................', '........dddddddddd......', '......ddaaaaaaaaaadd....', '.....daaaaaaaaaaaaaad...', '...ddaaaaaaaaaaaaaaaam..', '..daaaaaaaaaaaaaaaaaamm.', '.daaaabbbbbbbbbbbbbaam..', 'd.dabbbbbbbbbbbbbbbaamm.', '...ddbbbbbbbbbbbbbbbmm..', '.....dddbbbbbbbbbbdd....', '........dddddddddd......', '........................'] },
    bakeneko: { pal: { a: '#2E2A30', b: '#4A4450', d: '#18141A', e: '#9AFF6A', n: '#E87A9A' },
      a: ['....................', '.d..d...............', '.ad.ad.........a..a.', '.aa.aa.........aa.aa', '..aa.aa........aaaaa', '...aaaa.......aaeaea', '....aaa.......aaaaan', '.....aaaaaaaaaaaaaa.', '.....abbbbbbbbbaaa..', '.....aaaaaaaaaaaaa..', '......a.a.....a.a...', '......a.a.....a.a...', '.....dd.dd...dd.dd..'],
      b: ['....................', '..d..d..............', '..ad.ad........a..a.', '..aa.aa........aa.aa', '..aa.aa........aaaaa', '...aaaa.......aaeaea', '....aaa.......aaaaan', '.....aaaaaaaaaaaaaa.', '.....abbbbbbbbbaaa..', '.....aaaaaaaaaaaaa..', '.....a...a...a...a..', '....a.....a.a.....a.', '....dd....dddd....dd'] }
  };
  // 大一點的用程式畫（同樣的像素密度，所以畫大張一點）
  const procArt = (id, fr, role) => {
    seed = id.length * 97 + 13;
    const mk = (w, h) => { const c = cvs(w, h); return { c, x: c.getContext('2d') }; };
    const P = (x, a, b, col) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), 1, 1); };
    const disk = (x, cx, cy, rx, ry, fn) => { for (let yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++) for (let xx = Math.floor(cx - rx); xx <= Math.ceil(cx + rx); xx++) { const nx = (xx - cx) / rx, ny = (yy - cy) / ry, d = nx * nx + ny * ny; if (d <= 1) { const col = fn(nx, ny, d, xx, yy); if (col) P(x, xx, yy, col); } } };
    const line = (x, x0, y0, x1, y1, col, th) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) { const a = x0 + (x1 - x0) * i / n, b = y0 + (y1 - y0) * i / n; for (let t = 0; t < (th || 1); t++) P(x, a, b + t, col); } };
    if (id === 'nurikabe') {
      const { c, x } = mk(30, 34), fb = fr ? 1 : 0;
      for (let yy = 0; yy < 28; yy++) for (let xx = 1; xx < 29; xx++) { let col = (xx + yy * 3) % 11 === 0 ? '#7E786A' : '#8A8476'; if (yy === 0 || xx === 1) col = '#A8A294'; if (xx === 28 || yy === 27) col = '#5E584C'; if (srnd() < 0.05) col = '#9A9486'; P(x, xx, yy, col); }
      [[4, 3, 10, 8], [20, 2, 26, 9], [6, 19, 3, 25], [22, 20, 26, 25], [14, 22, 17, 26]].forEach(([a, b, cc, d]) => line(x, a, b, cc, d, '#5E584C'));
      [[7, 10], [19, 10]].forEach(([ex, ey], i) => { for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 5; xx++) P(x, ex + xx, ey + yy, '#FFF4DC'); P(x, ex + 2, ey + 1, '#FF6A4A'); P(x, ex + 3, ey + 1, '#FF6A4A'); P(x, ex + 2, ey + 2, '#B83A2A'); line(x, ex - 1, ey - 2 + (i ? 1 : 0), ex + 5, ey - 2 + (i ? 0 : 1), '#3A2A22'); });
      for (let xx = 9; xx < 21; xx++) { P(x, xx, 18, '#3A2A22'); P(x, xx, 19, xx % 3 ? '#3A2A22' : '#E8E0D0'); }
      [[5, 28], [19, 28]].forEach(([fx, fy], i) => { const up = fb && i === 0 ? 1 : 0; for (let yy = 0; yy < 4 - up; yy++) for (let xx = 0; xx < 6; xx++) P(x, fx + xx, fy + yy, xx === 5 ? '#4A4438' : '#6A6458'); });
      return c;
    }
    if (id === 'wanyudo') {
      const { c, x } = mk(26, 26), cx = 12.5, cy = 12.5;
      for (let yy = 0; yy < 26; yy++) for (let xx = 0; xx < 26; xx++) { const dx = xx - cx, dy = yy - cy, d = Math.hypot(dx, dy) / 12.5, a = Math.atan2(dy, dx) + (fr ? 0.39 : 0); let col = null;
        if (d > 0.84 && d <= 1) col = Math.sin(a * 7) > 0.2 ? '#FFC04A' : Math.sin(a * 7) > -0.4 ? '#FF7A2A' : null; else if (d > 0.66 && d <= 0.84) col = dy < -3 ? '#5A4636' : '#3A2A22'; else if (d > 0.44 && d <= 0.66) col = Math.abs(Math.sin(a * 2)) < 0.22 ? '#5A4A3A' : null; else if (d <= 0.44) col = dy > 2 ? '#A8764E' : '#C98E66';
        if (col) P(x, xx, yy, col); }
      P(x, 10, 11, '#1A0A0A'); P(x, 10, 12, '#1A0A0A'); P(x, 15, 11, '#1A0A0A'); P(x, 15, 12, '#1A0A0A'); P(x, 9, 10, '#FFE08A'); P(x, 14, 10, '#FFE08A'); line(x, 10, 15, 15, 15, '#6A1A1A'); line(x, 9, 9, 11, 10, '#3A1A10'); line(x, 14, 10, 16, 9, '#3A1A10');
      return c;
    }
    if (id === 'hyakume') {
      const { c, x } = mk(28, 28);
      disk(x, 13.5, 13.5, 13, 13, (nx, ny, d) => (d > 0.86 ? '#8A5A58' : nx + ny > 0.9 ? '#A87A70' : nx + ny < -0.9 ? '#E0B8AE' : '#C89A90'));
      [[6, 6], [13, 3], [20, 7], [4, 13], [11, 11], [19, 14], [6, 20], [14, 19], [21, 21], [16, 25], [9, 25]].forEach(([ex, ey], i) => { if (Math.hypot(ex + 2 - 13.5, ey + 1 - 13.5) > 11) return; line(x, ex, ey - 1, ex + 4, ey - 1, '#5A2A2A'); if (fr && i % 3 === 0) { line(x, ex, ey + 1, ex + 4, ey + 1, '#5A2A2A'); return; } for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 5; xx++) P(x, ex + xx, ey + yy, '#FFFFFF'); P(x, ex + 2, ey + 1, '#B81A2A'); P(x, ex + 1, ey + 1, '#E86A7A'); P(x, ex + 2, ey + 2, '#6A0A18'); });
      return c;
    }
    if (id === 'tsuchigumo') {
      const { c, x } = mk(64, 42), k = fr ? 2 : 0;
      [[14, 24, 2, 38 + k], [20, 25, 10, 40 - k], [28, 26, 22, 40 + k], [36, 26, 32, 40 - k], [42, 25, 44, 40 + k], [48, 24, 58, 38 - k], [18, 20, 4, 6 - k], [46, 20, 62, 8 + k]].forEach(([a, b, cc, d]) => { const mx = (a + cc) / 2, my = Math.min(b, d) - 7; line(x, a, b, mx, my, '#2A2420', 2); line(x, mx, my, cc, d, '#2A2420', 2); P(x, mx, my, '#4A423C'); });
      disk(x, 20, 20, 17, 13, (nx, ny, d) => (d > 0.9 ? '#221C18' : ny < -0.5 && nx < 0 ? '#5A5048' : (Math.round((nx + 1) * 6) + Math.round((ny + 1) * 4)) % 5 === 0 ? '#6A5A48' : '#3A3430'));
      disk(x, 45, 22, 11, 9, (nx, ny, d) => (d > 0.85 ? '#221C18' : ny < -0.4 ? '#5A524A' : '#4A423C'));
      [[50, 16], [53, 17], [55, 20], [52, 20], [48, 18], [56, 23]].forEach(([ex, ey]) => { P(x, ex, ey, '#FF5A3A'); P(x, ex + 1, ey, '#FF5A3A'); P(x, ex, ey + 1, '#B82A1A'); P(x, ex + 1, ey + 1, '#B82A1A'); });
      line(x, 55, 27, 57, 31, '#E8E0D0'); line(x, 58, 26, 60, 30, '#E8E0D0');
      return c;
    }
    if (id === 'omukade') {
      const { c, x } = mk(72, 26);
      for (let s = 0; s < 9; s++) { const cx = 6 + s * 6.2, cy = 13 + Math.sin(s * 0.9 + (fr ? 1.2 : 0)) * 2; disk(x, cx, cy, 4.6, 4.6, (nx, ny) => (ny < -0.45 ? '#9A4A36' : ny > 0.5 ? '#4A1A12' : s % 2 ? '#6A2A1E' : '#5A2218')); const lo = fr ? 1 : 0; line(x, cx - 2, cy + 4, cx - 3, cy + 8 - lo, '#E8C860'); line(x, cx + 2, cy + 4, cx + 3, cy + 7 + lo, '#E8C860'); }
      disk(x, 64, 11, 6.5, 6, (nx, ny) => (ny < -0.4 ? '#9A3E2E' : '#7A2E22')); P(x, 66, 8, '#FFD04A'); P(x, 67, 8, '#FFD04A'); P(x, 66, 9, '#B8901A'); line(x, 68, 5, 71, 0, '#E8C860'); line(x, 66, 5, 67, 0, '#E8C860'); line(x, 69, 14, 71, 17, '#E8C860'); line(x, 68, 16, 69, 19, '#E8C860');
      return c;
    }
    if (id === 'petra') {
      // 小的（保留區裡遠遠看到的）用同樣的像素密度重畫，不是整張縮小
      const q = role === 'small' ? 0.6 : 1, Wd = Math.round(116 * q), Hd = Math.round(84 * q), { c, x } = mk(Wd, Hd), up = (fr ? 2 : 0) * q, cx = Wd / 2, cy = 46 * q;
      [-1, 1].forEach(sg => { for (let k2 = 0; k2 < 5; k2++) { const bx0 = cx + sg * (26 + k2 * 2) * q, by0 = cy + (k2 * 3 - 6) * q, bx1 = cx + sg * (40 + k2 * 5) * q, by1 = (6 + k2 * 7) * q - up;
        if (k2 < 4) { const nx1 = cx + sg * (40 + (k2 + 1) * 5) * q, ny1 = (6 + (k2 + 1) * 7) * q - up; for (let t = 0.2; t <= 1; t += 0.04) for (let s2 = 0; s2 <= 1; s2 += 0.07) { const ax = bx0 + (bx1 - bx0) * t, ay = by0 + (by1 - by0) * t, bxx = bx0 + (nx1 - bx0) * t, byy = by0 + 3 * q + (ny1 - by0 - 3 * q) * t; P(x, ax + (bxx - ax) * s2, ay + (byy - ay) * s2, '#B8A89E'); } }
        for (let t = 0; t <= 1; t += 0.02) { const px = bx0 + (bx1 - bx0) * t, py = by0 + (by1 - by0) * t; P(x, px, py, '#E8DCCE'); P(x, px + sg, py, '#C8B8AA'); } } });
      disk(x, cx, cy, 28 * q, 28 * q, (nx, ny, d) => (d > 0.93 ? '#A89890' : ny > 0.55 ? '#CDBFB6' : nx < -0.4 && ny < -0.3 ? '#F8F0EA' : '#EDE0D6'));
      for (let v = 0; v < 12; v++) { let a = v / 12 * Math.PI * 2, r = 27 * q; for (let s2 = 0; s2 < 16; s2++) { a += (srnd() - 0.5) * 0.4; r -= 0.9 * q; if (r < 15 * q) break; P(x, cx + Math.cos(a) * r, cy + Math.sin(a) * r, '#B8322A'); } }
      disk(x, cx, cy + 2 * q, 13 * q, 13 * q, (nx, ny, d) => (d < 0.21 ? '#0A0406' : d > 0.8 ? '#5A0A18' : d > 0.5 ? '#7A1424' : '#9A2230'));
      const hs = q < 1 ? 2 : 3; for (let yy = 0; yy < hs; yy++) for (let xx = 0; xx < hs; xx++) P(x, cx - 6 * q + xx, cy - 4 * q + yy, '#FFFFFF');
      return c;
    }
    if (id === 'honemusha') {
      const { c, x } = mk(22, 28), st = fr ? 1 : 0, bone = '#E8E0CC', sh = '#B8B09C', dk = '#7A725E', R2 = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
      R2(8, 20, 2, 6, bone); R2(12 + st, 20, 2, 6, bone); R2(7, 26, 3, 1, sh); R2(12 + st, 26, 3, 1, sh);
      R2(8, 18, 6, 2, sh); R2(10, 10, 2, 8, bone); for (let i = 0; i < 4; i++) R2(7, 10 + i * 2, 8, 1, i % 2 ? sh : bone);
      R2(8, 4, 6, 6, bone); R2(9, 9, 4, 1, sh); R2(12, 6, 1, 1, '#FF5A3A'); R2(10, 6, 1, 1, '#1A1414'); R2(13, 8, 1, 1, dk);
      R2(7, 2, 8, 3, '#3A3A44'); R2(6, 4, 2, 2, '#3A3A44'); R2(10, 0, 2, 2, '#C9A13A'); R2(7, 2, 8, 1, '#5A5A66');
      R2(4, 5 - st, 1, 9, '#C8CED6'); R2(3, 14 - st, 3, 1, '#C9A13A'); R2(4, 15 - st, 1, 2, '#3A2A1C'); R2(5, 11, 3, 1, bone);
      disk(x, 16, 14, 4.5, 5.5, (nx, ny, dd) => (dd > 0.7 ? '#5A3E26' : nx < -0.3 && ny < -0.2 ? '#A8845A' : '#8A6A3A')); R2(15, 13, 2, 2, '#C9A13A');
      return c;
    }
    if (id === 'karasu') {
      const { c, x } = mk(24, 22), R2 = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
      for (let i = 0; i < 9; i++) { const y0 = fr ? 9 + i * 0.9 : 9 - i * 0.9, len = 7 - Math.abs(i - 4) * 0.5; line(x, 10 - i, y0, 10 - i, y0 + len, i % 3 === 0 ? '#3A3A4A' : '#1E1E26'); }
      R2(10, 9, 6, 8, '#E8E4D8'); R2(10, 9, 1, 8, '#C8C4B8'); R2(10, 13, 6, 1, '#1E1E26'); R2(12, 10, 1, 1, '#C8323A'); R2(14, 10, 1, 1, '#C8323A');
      R2(11, 17, 1, 3, '#4A3A2A'); R2(14, 17, 1, 3, '#4A3A2A'); R2(10, 20, 3, 1, '#E8C04A'); R2(13, 20, 3, 1, '#E8C04A');
      disk(x, 15, 5.5, 3.2, 3.2, (nx, ny) => (ny < -0.4 && nx < 0 ? '#3A3A4A' : '#1E1E26'));
      R2(18, 5, 3, 2, '#E8C04A'); R2(21, 6, 2, 1, '#C8A03A'); R2(16, 4, 1, 1, '#FFD04A'); R2(13, 1, 4, 2, '#1E1E26'); R2(14, 0, 2, 1, '#1E1E26');
      return c;
    }
    if (id === 'ushioni') {
      const { c, x } = mk(40, 28), k = fr ? 2 : 0;
      [[8, 16, 1, 27 - k], [13, 18, 7, 25 + k], [18, 18, 15, 27 - k], [22, 18, 25, 25 + k], [26, 17, 32, 27 - k], [30, 16, 38, 26]].forEach(([a, b, cc, dd]) => { const mx = (a + cc) / 2, my = Math.min(b, dd) - 5; line(x, a, b, mx, my, '#2A1E2A', 2); line(x, mx, my, cc, dd, '#2A1E2A', 2); P(x, mx, my, '#4A3A4A'); });
      disk(x, 15, 14, 11, 7.5, (nx, ny, dd) => (dd > 0.9 ? '#1E161E' : ny < -0.45 && nx < 0.2 ? '#5A4A5A' : (Math.round((nx + 1) * 5) + Math.round((ny + 1) * 3)) % 4 === 0 ? '#4A3A4A' : '#3A2E3A'));
      disk(x, 30, 11, 6.5, 5.5, (nx, ny, dd) => (dd > 0.88 ? '#1E161E' : ny < -0.35 ? '#5A4A5A' : '#3A2E3A'));
      for (let yy = 10; yy < 16; yy++) for (let xx = 34; xx < 39; xx++) P(x, xx, yy, yy > 13 ? '#2A1E2A' : '#4A3A4A');
      P(x, 37, 12, '#1A1014'); P(x, 37, 14, '#1A1014');
      line(x, 27, 6, 22, 1, '#E8E0D0', 2); line(x, 22, 1, 20, 2, '#E8E0D0'); line(x, 32, 6, 35, 1, '#E8E0D0', 2); line(x, 35, 1, 37, 1, '#E8E0D0');
      P(x, 31, 9, '#FF3A3A'); P(x, 32, 9, '#FF3A3A'); P(x, 31, 10, '#B81A1A'); P(x, 32, 10, '#B81A1A');
      return c;
    }
    if (id === 'gashadokuro') {
      const { c, x } = mk(76, 64), bone = '#E8E0CC', sh = '#B8B09C', dk = '#7A725E', k = fr ? 2 : 0;
      disk(x, 38, 60, 30, 3.5, (nx, ny, dd) => (dd > 0.7 ? '#2A2020' : '#140C0C'));
      for (let yy = 30; yy < 60; yy++) { P(x, 37, yy, bone); P(x, 38, yy, sh); }
      for (let i = 0; i < 6; i++) { const y = 33 + i * 4, w = 15 - i; for (let xx = -w; xx <= w; xx++) P(x, 38 + xx, y + Math.round(Math.abs(xx) * 0.25), Math.abs(xx) > w - 2 ? sh : bone); }
      const arm = (sx, sy, ex, ey, hx, hy, th2) => { line(x, sx, sy, ex, ey, bone, th2); line(x, ex, ey, hx, hy, bone, th2 - 1); P(x, ex, ey, sh); for (let f = 0; f < 4; f++) line(x, hx, hy, hx + 5, hy - 2 + f * 2, f % 2 ? sh : bone); };
      arm(24, 34, 14, 46 - k, 22, 54 - k, 3); arm(52, 34, 62, 44 + k, 66, 52 + k, 3);
      disk(x, 40, 18, 15, 14, (nx, ny, dd) => (dd > 0.92 ? sh : ny > 0.55 ? sh : nx < -0.45 && ny < -0.2 ? '#F8F2E4' : bone));
      [[33, 16], [46, 16]].forEach(([ex, ey]) => { disk(x, ex, ey, 4, 4.5, () => '#1A0A0A'); P(x, ex, ey, '#FF5A3A'); P(x, ex + 1, ey, '#FF5A3A'); P(x, ex, ey + 1, '#B83A2A'); });
      for (let yy = 22; yy < 26; yy++) { P(x, 39, yy, '#1A0A0A'); P(x, 40, yy, '#1A0A0A'); }
      for (let xx = 30; xx < 51; xx++) { P(x, xx, 28, '#1A0A0A'); if (xx % 3) P(x, xx, 29 + k / 2, bone); P(x, xx, 30 + k, '#1A0A0A'); }
      line(x, 28, 8, 34, 12, dk); line(x, 50, 6, 46, 11, dk);
      return c;
    }
    return null;
  };
  const beastSheets = {};
  R.BEAST_ART = ART;   // 別的檔案可以加自己的點陣圖（townlife.js 的腳踏車、貓狗、鳥）
  const beastSheet = (id, role) => {
    const key = id + (role || ''); if (beastSheets[key]) return beastSheets[key];
    let frames = [];
    if (ART[id]) { const art = ART[id], pal = Object.assign({}, art.pal); if (id === 'kamaitachi') pal.s = { trip: '#3A6ACF', cut: '#C8323A', heal: '#3E9A5A' }[role] || '#C8323A';
      // 帶頭的（送犬的頭目）：毛色更深、眼睛是紅的
      if (role === 'leader') { ['a', 'b', 'd'].forEach(k => { if (pal[k]) pal[k] = shade(pal[k], -0.38); }); pal.e = '#FF4A3A'; }
      const w = Math.max(...art.a.map(r => r.length)), hh = art.a.length; [art.a, art.b || art.a].forEach(rows => { const c = cvs(w, hh); blit(c.getContext('2d'), rows, pal, 0, 0); frames.push(c); }); }
    else { const A = procArt(id, 0, role), B = procArt(id, 1, role); if (!A) return beastSheet('gaki'); frames = [A, B]; }
    const fw = frames[0].width + 2, fh = frames[0].height + 2, c = cvs(fw * 2, fh * 2), x = c.getContext('2d');
    frames.forEach((f, i) => { x.drawImage(f, i * fw + 1, 1); x.save(); x.translate(i * fw + fw, fh); x.scale(-1, 1); x.drawImage(f, 1, 1); x.restore(); });
    outline(c);
    return (beastSheets[key] = { c, fw, fh });
  };
  R.makeBeastSprite = (id, role) => {
    const sh = beastSheet(id, role), g = new (T().Group)(), sp = billboard(sh.c, 2, 2, sh.fw, sh.fh, 1);
    g.add(sp.m); addShadow(g, Math.min(2.6, sh.fw * PX * 0.36)); setFrame(sp, 0, 0);
    return { g, sp, spr: sp.m, isSprite: true, flashMat: null };
  };
  R.animBeastSprite = (m, id, t, moving) => {
    const fr = Math.floor(t * (moving ? 6 : 2.5)) % 2, cam = R.W.cam ? R.W.cam.yaw : 0, rel = wrap(m.g.rotation.y - cam);
    setFrame(m.sp, fr, Math.sin(rel) >= 0 ? 0 : 1); face(m.g, m.spr);
  };
  // 換一套顏色（同樣大小的圖）
  R.beastVariant = (m, id, role) => { if (!m.isSprite) return; m.sp.t.image = beastSheet(id, role).c; m.sp.t.needsUpdate = true; };
  R.beastSheetOf = beastSheet;   // 怪物頭上的名牌、圖鑑的小圖示（monlabel.js）
  R.fadeSprite = (m, a) => { m.sp.mat.transparent = a < 1; m.sp.mat.opacity = a; m.sp.mat.alphaTest = a < 1 ? 0.05 : 0.5; m.sp.mat.depthWrite = a >= 1; };
  R.flashSprite = (m, t) => { m.sp.mat.emissive.setRGB(1, t > 0 ? 0.35 : 1, t > 0 ? 0.3 : 1); m.sp.mat.emissiveIntensity = t > 0 ? 0.9 : 0.22; };

  // ---------- 點陣材質：灰階花紋（乘上去的倍數），照世界座標貼 ----------
  // 地面、牆頂：一個像素 0.1 公尺，地城一格（2 公尺）剛好 20 像素；
  // 牆面：橫的一個像素 PX、直的 PX×TILT，鏡頭斜著看下來，在畫面上剛好都是一格。
  const texCache = {};
  R.pixTex = kind => {
    if (texCache[kind]) return texCache[kind];
    seed = { floor: 11, wall: 23, cap: 37, plaster: 51, ground: 67, planks: 83, asphalt: 97, paving: 101, stone: 113, gravel: 127 }[kind] || 5;
    const size = kind === 'floor' || kind === 'stone' ? 80 : kind === 'cap' || kind === 'ground' || kind === 'paving' ? 40 : kind === 'gravel' ? 32 : 48, c = cvs(size, size), x = c.getContext('2d');
    // 平均大約 0.9 倍，接縫暗一點（不會讓整個場景變暗）
    const P = (a, b, v) => { v = Math.max(0, Math.min(255, Math.round(v * 1.12))); x.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; x.fillRect(a, b, 1, 1); };
    if (kind === 'floor') {
      // 4×4 塊石磚，每塊 20 像素＝地城的一格；每塊明暗不同，有裂縫和缺角
      const B = 20;
      for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
        const base = 196 + (srnd() - 0.5) * 26;
        for (let yy = 0; yy < B; yy++) for (let xx = 0; xx < B; xx++) { let v = base + (srnd() - 0.5) * 12; if (xx === 0 || yy === 0) v = 138; else if (xx === 1 || yy === 1) v = base + 14; else if (xx === B - 1 || yy === B - 1) v = base - 18; P(tx * B + xx, ty * B + yy, v); }
        if (srnd() < 0.5) { let px = tx * B + 4 + srnd() * 10, py = ty * B + 4 + srnd() * 10; for (let k = 0; k < 7; k++) { px += srnd() < 0.5 ? 1 : 0; py += srnd() < 0.6 ? 1 : 0; P(Math.floor(px), Math.floor(py), 150); } }
        if (srnd() < 0.3) { P(tx * B + B - 2, ty * B + 2, 150); P(tx * B + B - 3, ty * B + 2, 160); }
      }
    } else if (kind === 'wall' || kind === 'plaster') {
      // 磚：高 6 像素、寬 12 像素（一公尺），一排錯開半塊
      for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) {
        const row = Math.floor(yy / 6), off = row % 2 ? 6 : 0, brick = Math.floor((xx + off) / 12);
        let v = kind === 'plaster' ? 214 + (srnd() - 0.5) * 16 : 200 + ((row * 7 + brick * 13) % 5) * 5 + (srnd() - 0.5) * 12;
        if (kind === 'wall') { if (yy % 6 === 5 || (xx + off) % 12 === 0) v = 132; else if (yy % 6 === 0) v += 16; else if ((xx + off) % 12 === 11) v -= 14; }
        else if (srnd() < 0.02) v -= 30;
        P(xx, yy, v);
      }
    } else if (kind === 'cap') { for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) P(xx, yy, (xx % 20 === 0 || yy % 20 === 0) ? 160 : 212 + (srnd() - 0.5) * 16); }
    else if (kind === 'asphalt') {
      // 柏油：細細的碎石點、幾條補過的痕跡
      for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) { let v = 206 + (srnd() - 0.5) * 18; const r = srnd(); if (r < 0.06) v -= 34; else if (r < 0.1) v += 22; P(xx, yy, v); }
      for (let k = 0; k < 3; k++) { let px = Math.floor(srnd() * size), py = Math.floor(srnd() * size); for (let s = 0; s < 14; s++) { P((px + size) % size, (py + size) % size, 168); px += srnd() < 0.7 ? 1 : 0; py += srnd() < 0.4 ? 1 : srnd() < 0.2 ? -1 : 0; } }
    } else if (kind === 'paving') {
      // 人行道的磚：50 公分一塊（5 像素），一排錯開半塊
      for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) { const row = Math.floor(yy / 5), off = row % 2 ? 2 : 0, b = Math.floor((xx + off) / 5); let v = 208 + ((row * 7 + b * 3) % 4) * 5 + (srnd() - 0.5) * 8; if (yy % 5 === 4 || (xx + off) % 5 === 4) v = 160; P(xx, yy, v); }
    } else if (kind === 'stone') {
      // 舊城的石板：大小不一的長方形石塊、深色的縫
      for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) P(xx, yy, 150);
      for (let yy = 0; yy < size;) { const h = 3 + Math.floor(srnd() * 4); let xx = Math.floor(srnd() * 6); while (xx < size + 10) { const w = 4 + Math.floor(srnd() * 6), base = 192 + (srnd() - 0.5) * 34; for (let j = 1; j < h && yy + j < size; j++) for (let i = 1; i < w; i++) { const px = (xx + i) % size; P(px, yy + j, base + (srnd() - 0.5) * 10 + (j === 1 || i === 1 ? 12 : 0)); } xx += w; } yy += h; }
    } else if (kind === 'gravel') {
      for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) { const r = srnd(); P(xx, yy, r < 0.3 ? 160 + srnd() * 20 : r < 0.6 ? 200 + srnd() * 20 : 225 + srnd() * 20); }
    }
    else if (kind === 'planks') { for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) { const plank = Math.floor(yy / 8); let v = 196 + ((plank * 5) % 3) * 8 + (srnd() - 0.5) * 12; if (yy % 8 === 7) v = 120; if ((xx + plank * 17) % 48 === 0) v = 140; if ((xx * 3 + yy) % 13 === 0) v -= 10; P(xx, yy, v); } }
    else { for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) P(xx, yy, 212 + (srnd() - 0.5) * 26 + (srnd() < 0.04 ? -36 : 0)); }   // ground：雪地、草地的細節
    const tt = tex(c, true); tt.userData.shared = true; return (texCache[kind] = tt);
  };
  // 讓材質照世界座標取樣（牆多高、東西多大，像素都一樣大）
  R.worldUV = (mat, texPx) => {
    mat.userData.wuv = texPx;
    mat.onBeforeCompile = sh => {
      sh.uniforms.wuvTop = { value: 1 / (texPx * TOP) };
      sh.uniforms.wuvSide = { value: new (T().Vector2)(1 / (texPx * PX), 1 / (texPx * PX * TILT)) };
      sh.vertexShader = 'varying vec3 vWPos;\nvarying vec3 vWNrm;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vec4 wp4 = vec4( transformed, 1.0 );\n  vec3 wn3 = objectNormal;\n  #ifdef USE_INSTANCING\n  wp4 = instanceMatrix * wp4;\n  wn3 = mat3( instanceMatrix ) * wn3;\n  #endif\n  wp4 = modelMatrix * wp4;\n  vWPos = wp4.xyz;\n  vWNrm = normalize( mat3( modelMatrix ) * wn3 );');
      sh.fragmentShader = 'uniform float wuvTop;\nuniform vec2 wuvSide;\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\n' + sh.fragmentShader.replace('#include <map_fragment>', 'vec3 wan = abs( vWNrm );\n  vec2 wuv = wan.y > 0.5 ? vWPos.xz * wuvTop : ( wan.x > wan.z ? vWPos.zy : vWPos.xy ) * wuvSide;\n  vec4 sampledDiffuseColor = texture2D( map, wuv );\n  diffuseColor *= sampledDiffuseColor;');
    };
    mat.customProgramCacheKey = () => 'wuv';
    return mat;
  };
  R.pixMat = (kind, opts) => R.worldUV(new (T().MeshLambertMaterial)(Object.assign({ map: R.pixTex(kind) }, opts || {})), R.pixTex(kind).image.width);
  // 複製材質時把世界座標貼圖也帶過去（three.js 的 clone 不會複製 onBeforeCompile）
  R.cloneMat = m => { const c = m.clone(); if (m.userData && m.userData.wuv) R.worldUV(c, m.userData.wuv); return c; };
  // 地面：原本畫好的地圖顏色 × 細節點陣（照世界座標，一個像素 0.1 公尺）
  R.groundDetail = (mat, kind) => {
    const dt = R.pixTex(kind || 'ground'), sc = 1 / (dt.image.width * TOP);
    mat.onBeforeCompile = sh => {
      sh.uniforms.detailMap = { value: dt }; sh.uniforms.wuvScale = { value: sc };
      sh.vertexShader = 'varying vec3 vWPos;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      sh.fragmentShader = 'uniform sampler2D detailMap;\nuniform float wuvScale;\nvarying vec3 vWPos;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb *= texture2D( detailMap, vWPos.xz * wuvScale ).rgb;');
    };
    mat.customProgramCacheKey = () => 'gdetail';
    return mat;
  };

  // ---------- 人物、遺跡生物一律是點陣圖（像素版） ----------
  R.makeHero = (cls, base, look) => R.makeHeroSprite(cls, base, look);
  R.animHero = (h, speed, dt, aim) => R.animHeroSprite(h, speed, dt, aim);
  R.dressHero = (h, eq) => { h.opt.eq = eq; rebuildHero(h); };
  R.setHeroWeapon = (h, base) => { h.opt.weapon = base; h.base = base; h.kind = R.WEAPONS[base] ? R.WEAPONS[base].kind : 'melee'; rebuildHero(h); };
  R.makeBeast = (id, role) => R.makeBeastSprite(id, role);
  R.animBeast = (m, id, t, moving) => R.animBeastSprite(m, id, t, moving);
  R.flash = (m, t) => R.flashSprite(m, t);
  // 玩家自己：捏角的外觀＋種族＋（有戴的話）兜帽
  R.makePlayerHero = (cls, base, eq) => { const h = R.makeHeroSprite(cls, base, R.playerLook ? R.playerLook() : null); if (eq) R.dressHero(h, eq); return h; };

  // ---------- 城外的松樹（點陣看板）：三種大小是分別畫的，不是放大縮小，像素密度一樣 ----------
  const pineCs = {};
  const pineCanvas = n => {   // n：幾層枝葉
    if (pineCs[n]) return pineCs[n];
    const hw = Math.ceil(3 + (n - 1) * 1.8), w = hw * 2 + 4, h = n * 5 + 9, cx = w / 2;
    const c = cvs(w, h), x = c.getContext('2d'), P = (a, b, ww, hh, col) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); };
    for (let i = 0; i < n; i++) { const y0 = 3 + i * 5, half = 3 + i * 1.8, l = Math.round(cx - half), ww = Math.round(half * 2); P(l, y0 + 2, ww, 4, '#3E5A48'); P(l, y0 + 5, ww, 1, '#2E4A3A'); P(l + 1, y0 + 2, Math.max(1, ww - 3), 1, '#F4F8FA'); P(l + 2, y0 + 3, Math.max(1, ww - 6), 1, '#DDE8EE'); P(Math.round(cx - half / 2), y0 + 1, Math.round(half), 1, '#4E6A58'); }
    P(cx - 1, 1, 2, 3, '#F4F8FA'); P(cx - 2, h - 6, 4, 5, '#4A3424'); P(cx - 2, h - 6, 1, 5, '#6A4A34');
    outline(c, '#1E2A24');
    return (pineCs[n] = c);
  };
  // 同一種大小的松樹共用一份形狀、材質、影子（幾百棵樹不會有幾百張貼圖）
  const pineKit = {};
  R.pineSprite = s => {
    const n = s == null ? 5 : s < 0.95 ? 4 : s < 1.2 ? 5 : 6;
    if (!pineKit[n]) {
      const c = pineCanvas(n), sp = billboard(c, 1, 1, c.width, c.height, 1);
      sp.m.geometry.userData.shared = true; sp.mat.userData.shared = true; sp.t.userData.shared = true;
      const sg = new (T().CircleGeometry)(0.45 + n * 0.1, 12), sm = new (T().MeshBasicMaterial)({ color: '#000000', transparent: true, opacity: 0.32, depthWrite: false }); sg.userData.shared = true; sm.userData.shared = true;
      pineKit[n] = { geo: sp.m.geometry, mat: sp.mat, sg, sm };
    }
    const K = pineKit[n], g = new (T().Group)(), m = new (T().Mesh)(K.geo, K.mat); m.renderOrder = 1; g.add(m);
    const sh = new (T().Mesh)(K.sg, K.sm); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
    // 每次畫之前轉向鏡頭（松樹不會動，也不用每一幀另外處理）
    m.onBeforeRender = function () { const cam = R.W.cam ? R.W.cam.yaw : 0; if (this.rotation.y !== cam) { this.rotation.y = cam; this.updateMatrix(); this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix); } };
    g.userData.bb = m; return g;
  };
  // 冬天的行道樹（落葉的樹，枝上積雪）
  const bareCs = {};
  const bareCanvas = n => {
    if (bareCs[n]) return bareCs[n];
    const w = 22 + n * 4, h = 34 + n * 6, c = cvs(w, h), x = c.getContext('2d'), P = (a, b, ww, hh, col) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); }, cx = Math.floor(w / 2);
    let s = 31 + n; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    P(cx - 1, h - 14, 3, 14, '#4A3A2E'); P(cx - 1, h - 14, 1, 14, '#6A5240');
    const branch = (bx, by, dx, len, depth) => { let px = bx, py = by; for (let i = 0; i < len; i++) { px += dx * (r() < 0.7 ? 1 : 0); py -= 1; P(Math.round(px), py, 1, 1, '#4A3A2E'); if (r() < 0.25) P(Math.round(px), py - 1, 1, 1, '#F2F6F8'); if (depth < 2 && r() < 0.18) branch(px, py, -dx || 1, Math.floor(len * 0.5), depth + 1); } P(Math.round(px), py - 1, 1, 1, '#F2F6F8'); };
    for (let i = 0; i < 5 + n; i++) branch(cx + (r() - 0.5) * 2, h - 12 - Math.floor(r() * 8), r() < 0.5 ? -1 : 1, 8 + Math.floor(r() * (8 + n * 2)), 0);
    P(cx - 4, h - 2, 9, 2, '#F2F6F8');
    outline(c); return (bareCs[n] = c);
  };
  // list：[{ x, z, s, bare }]；回傳 { update(yaw) }
  R.treeField = (list, group) => {
    const TH = T(), groups = {}, dummy = new TH.Object3D(), out = [];
    list.forEach(t => { const n = t.bare ? 'b' + (t.s < 0.9 ? 1 : t.s < 1.15 ? 2 : 3) : 'p' + (t.s == null ? 5 : t.s < 0.95 ? 4 : t.s < 1.2 ? 5 : 6); (groups[n] = groups[n] || []).push(t); });
    Object.keys(groups).forEach(n => {
      const L = groups[n], c = n[0] === 'b' ? bareCanvas(+n.slice(1)) : pineCanvas(+n.slice(1)), sp = billboard(c, 1, 1, c.width, c.height, 1);
      const im = new TH.InstancedMesh(sp.m.geometry, sp.mat, L.length); im.renderOrder = 1; im.frustumCulled = false;
      const sg = new TH.CircleGeometry(0.3 + c.width * 0.012, 10), sh = new TH.InstancedMesh(sg, new TH.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.3, depthWrite: false }), L.length);
      L.forEach((t, i) => { dummy.position.set(t.x, 0.03, t.z); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.updateMatrix(); sh.setMatrixAt(i, dummy.matrix); });
      group.add(im); group.add(sh); out.push({ im, L, sh });
    });
    let last = null;
    // force：清單裡的 hide 改了，鏡頭沒轉也重排一次（hide 的樹移到地底下）
    const update = (yaw, force) => { if (yaw === last && !force) return; last = yaw; out.forEach(({ im, L }) => { L.forEach((t, i) => { dummy.position.set(t.x, t.hide ? -50 : 0, t.z); dummy.rotation.set(0, yaw, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); im.instanceMatrix.needsUpdate = true; }); };
    update(R.W.cam ? R.W.cam.yaw : 0);
    return { update, out };   // out：tidy2.js 收牆邊的樹用（t.hide、影子 sh）
  };
  // 換場景：把只屬於舊場景的形狀、材質、貼圖丟掉（共用的、keep 裡的不丟）
  R.disposeScene = (sc, keep) => {
    if (!sc) return;
    const skip = new Set(); (keep || []).forEach(o => o && o.traverse(c => skip.add(c)));
    sc.traverse(o => {
      if (skip.has(o) || !(o.isMesh || o.isPoints || o.isLine)) return;
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!m || m.userData.shared) return; ['map', 'emissiveMap'].forEach(k => { const t = m[k]; if (t && !t.userData.shared && !texCacheHas(t)) t.dispose(); }); m.dispose(); });
    });
  };
  const texCacheHas = t => Object.values(texCache).includes(t);
})(window.R);
