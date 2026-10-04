// 討伐令 1433：捏角的新選項（作者 2026-10-04：種族特徵可以調樣式＋顏色、照種族只開放有的部位；臉（眉毛、瞳孔、表情）和體型（身高、體格）；
//   更多髮型、上衣／褲子／鞋子分開選款式和顏色）
// - 畫法：sprites.js 的 drawHero 畫完身體和頭髮以後呼叫 R.HERO_EXTRA，這裡照 L.ext（存檔的 look）把新的東西疊上去：
//   眉毛、瞳孔、表情、上衣款式（長袍、背心、大衣、帽T、和服）、褲子款式（短褲、裙子、袴）、鞋子款式（靴子、涼鞋）、新髮型。
//   沒選的欄位（舊存檔、路人）什麼都不畫，長相跟原本一樣。
// - 種族特徵（耳朵、角、翅膀、尾巴）的樣式和顏色在 sprites.js 的 heroLook 處理（只有種族本來就有的部位才換）。
// - 身高、體格：人物那張圖的寬、高縮放（矮 0.92、高 1.08；纖細 0.9、壯碩 1.1）。
// - R.LOOK_OPTS：捏角畫面（creator.js）用的選項清單。
(function (R) {
  const BROW = [['', '原本'], ['thin', '細'], ['thick', '粗'], ['angry', '倒八字'], ['sad', '八字'], ['none', '看不見']];
  const PUPIL = [['', '原本'], ['big', '大眼'], ['shine', '亮晶晶'], ['slit', '豎瞳'], ['sharp', '細長'], ['closed', '瞇眼']];
  const MOUTH = [['', '原本'], ['smile', '微笑'], ['grin', '露齒笑'], ['frown', '撇嘴'], ['open', '張嘴'], ['flat', '一字']];
  const HEIGHT = [['', '普通'], ['short', '矮'], ['tall', '高']];
  const BUILD = [['', '普通'], ['slim', '纖細'], ['broad', '壯碩']];
  const TOP = [['', '短上衣'], ['robe', '長袍'], ['vest', '背心'], ['coat', '大衣'], ['hoodie', '帽T'], ['kimono', '和服']];
  const PANTS = [['', '長褲'], ['shorts', '短褲'], ['skirt', '裙子'], ['hakama', '袴']];
  const SHOES = [['', '鞋子'], ['boots', '長靴'], ['sandals', '涼鞋']];
  const HAIR_NEW = [['twin', '雙馬尾'], ['wavy', '波浪長髮'], ['hime', '公主切'], ['sidepart', '側分'], ['mohawk', '莫霍克'], ['messy', '亂髮'], ['highpony', '高馬尾']];
  const SHOE_COL = ['#2A231D', '#4A3424', '#6A4A2E', '#1C1C24', '#E8E0D0', '#8A2A2A', '#3E4E62', '#C8A860'];
  // 種族特徵：同一類的樣式可以互換（獸耳之間、角之間……），顏色另外選
  const FEAT = {
    ears: { n: '耳朵', groups: [['cat', 'wolf', 'fox', 'dog', 'round', 'rabbit'], ['elf'], ['fin'], ['antenna']], names: { cat: '貓耳', wolf: '狼耳', fox: '狐耳', dog: '垂耳', round: '圓耳', rabbit: '兔耳', elf: '尖耳', fin: '鰭耳', antenna: '觸角' } },
    horns: { n: '角', groups: [['small', 'goat', 'antler', 'dragon', 'demon']], names: { small: '小角', goat: '羊角', antler: '鹿角', dragon: '龍角', demon: '魔角' } },
    wings: { n: '翅膀', groups: [['feather', 'demon']], names: { feather: '羽翼', demon: '蝠翼' } },
    tail: { n: '尾巴', groups: [['cat', 'fox', 'dragon', 'wolf', 'dog']], names: { cat: '貓尾', fox: '狐尾', dragon: '龍尾', wolf: '狼尾', dog: '狗尾' } }
  };
  const FEAT_COL = ['#1A1714', '#4A3424', '#8A5A2E', '#C99B55', '#E9D8A6', '#F2F0EA', '#D8D2C4', '#7A2E1F', '#D2692A', '#2E3A5A', '#3E5A3E', '#6A4A7A', '#5A9A9A', '#C8323A', '#E8A0C8', '#141018'];
  { const css = document.createElement('style'); css.textContent = '.cr-sub{margin:6px 0 2px;font-size:12px;opacity:.8}'; document.head.appendChild(css); }
  R.LOOK_OPTS = { BROW, PUPIL, MOUTH, HEIGHT, BUILD, TOP, PANTS, SHOES, HAIR_NEW, SHOE_COL, FEAT, FEAT_COL };
  R.raceFeatureOpts = race => {
    const rc = R.raceLook ? R.raceLook(race) : null; if (!rc) return [];
    return Object.keys(FEAT).filter(k => rc[k]).map(k => { const f = FEAT[k], g = f.groups.find(gr => gr.includes(rc[k])) || [rc[k]]; return { key: k, n: f.n, def: rc[k], styles: g.map(v => [v, f.names[v] || v]) }; });
  };

  // ---------- 畫 ----------
  R.HERO_EXTRA = (p, v, fr, L, o) => {
    const e = L.ext || {}, sh = o.shade, dk = c => sh(c, -0.24), lt = c => sh(c, 0.2);
    const front = v === 'front', side = v === 'side', back = v === 'back';
    // ---- 褲子、鞋子（坐著不換） ----
    if (!o.sit) {
      const legsF = () => o.atk ? [[4, 0], [9, 0]] : [[5, fr === 1 ? 2 : 0], [8, fr === 2 ? 2 : 0]];
      const legsS = () => fr === 0 ? [[6, 0]] : o.atk ? [[4, 0], [9, 0]] : [[4, 0], [9, 0]];
      const legs = side ? legsS() : legsF(), lw = side ? 3 : 3;
      if (e.pantsStyle === 'shorts' || e.pantsStyle === 'skirt') legs.forEach(([lx, up]) => { p(lx, 19 - up, lw, 2, L.skin); p(lx + lw - 1, 19 - up, 1, 2, dk(L.skin)); });
      if (e.pantsStyle === 'skirt') {
        if (side) { p(4, 15, 7, 3, L.pants); p(3, 17, 8, 1, dk(L.pants)); }
        else { p(4, 15, 8, 3, L.pants); p(3, 17, 10, 1, L.pants); p(3, 18, 10, 1, dk(L.pants)); p(5, 16, 1, 2, lt(L.pants)); }
      } else if (e.pantsStyle === 'hakama') {
        if (side) { p(4, 16, 7, 5, L.pants); p(4, 16, 1, 5, dk(L.pants)); p(7, 17, 1, 4, dk(L.pants)); }
        else { p(4, 16, 8, 5, L.pants); p(7, 17, 1, 4, dk(L.pants)); p(11, 16, 1, 5, dk(L.pants)); p(5, 17, 1, 3, lt(L.pants)); }
      }
      if (e.shoeStyle === 'boots') legs.forEach(([lx, up]) => { p(lx, 19 - up, lw, 2, L.shoe); p(lx + lw - 1, 19 - up, 1, 2, dk(L.shoe)); p(lx, 19 - up, lw, 1, lt(L.shoe)); });
      else if (e.shoeStyle === 'sandals') legs.forEach(([lx, up]) => { p(lx, 21 - up, side ? 4 : 3, 1, L.skin); p(lx, 22 - up, side ? 4 : 3, 1, L.shoe); p(lx + 1, 21 - up, 1, 1, L.shoe); });
    }
    // ---- 上衣款式 ----
    const T = L.top, T2 = e.top2 || '#E8E4DA';
    if (e.topStyle === 'robe' && !o.sit) {
      if (side) { p(5, 16, 6, 5, T); p(5, 16, 1, 5, dk(T)); p(5, 20, 6, 1, dk(T)); }
      else { const c = back ? L.cloak : T; p(4, 16, 8, 5, c); p(4, 16, 1, 5, lt(c)); p(11, 16, 1, 5, dk(c)); p(4, 20, 8, 1, dk(c)); if (front) p(7, 16, 2, 5, dk(c)); }
    } else if (e.topStyle === 'vest') {
      if (front) { p(6, 9, 4, 6, T2); p(7, 10, 2, 1, dk(T2)); p(4, 9, 2, 6, dk(T)); p(10, 9, 2, 6, dk(T)); p(7, 12, 1, 1, '#C9A13A'); }
      else if (side) { p(8, 9, 3, 6, T2); p(5, 9, 3, 6, dk(T)); }
    } else if (e.topStyle === 'coat') {
      if (front) { p(4, 9, 1, 12, dk(T)); p(11, 9, 1, 12, dk(T)); p(4, 16, 2, 5, T); p(10, 16, 2, 5, T); p(6, 9, 4, 6, T2); p(7, 9, 2, 1, dk(T2)); }
      else if (side) { p(4, 9, 3, 12, T); p(4, 9, 1, 12, dk(T)); }
      else { p(4, 16, 8, 5, L.cloak); p(7, 16, 1, 5, dk(L.cloak)); }
    } else if (e.topStyle === 'hoodie') {
      if (front) { p(4, 8, 8, 1, dk(T)); p(6, 12, 4, 2, dk(T)); p(6, 9, 1, 3, lt(T)); p(9, 9, 1, 3, lt(T)); }
      else if (back) { p(5, 8, 6, 3, dk(T)); p(6, 8, 4, 1, sh(T, -0.4)); }
      else { p(4, 8, 3, 3, dk(T)); }
    } else if (e.topStyle === 'kimono') {
      if (front) { for (let i = 0; i < 4; i++) { p(6 + i, 9 + i, 1, 1, '#F4F0EA'); p(9 - i, 9 + i, 1, 1, dk(T)); } p(4, 14, 8, 2, e.top2 ? dk(T2) : '#B8322A'); p(7, 14, 2, 2, '#C9A13A'); }
      else if (side) { p(9, 9, 1, 3, '#F4F0EA'); p(5, 14, 6, 2, e.top2 ? dk(T2) : '#B8322A'); }
      else p(4, 14, 8, 2, e.top2 ? dk(T2) : '#B8322A');
    }
    // ---- 新髮型（帽子、兜帽戴著就不畫） ----
    const H = L.hair, hs = L.hs;
    if (!L.hood && !L.head && hs && HAIR_NEW.some(h => h[0] === hs)) {
      if (hs === 'twin') {
        if (front) { p(1, 3, 2, 7, H); p(13, 3, 2, 7, dk(H)); p(2, 2, 1, 1, L.accCol || '#C8323A'); p(13, 2, 1, 1, L.accCol || '#C8323A'); p(1, 9, 1, 1, dk(H)); p(14, 9, 1, 1, dk(H)); }
        else if (back) { p(1, 3, 3, 8, H); p(12, 3, 3, 8, H); p(2, 10, 1, 1, dk(H)); p(13, 10, 1, 1, dk(H)); }
        else { p(2, 2, 2, 8, H); p(2, 9, 1, 1, dk(H)); }
      } else if (hs === 'wavy') {
        if (front) { p(3, 2, 1, 10, H); p(12, 2, 1, 10, dk(H)); p(2, 5, 1, 2, H); p(2, 9, 1, 2, H); p(13, 4, 1, 2, dk(H)); p(13, 8, 1, 2, dk(H)); }
        else if (back) { p(4, 8, 8, 5, H); p(3, 4, 1, 8, H); p(12, 4, 1, 8, H); [4, 6, 8, 10].forEach((x, i) => p(x, 13, 1, 1, i % 2 ? dk(H) : H)); }
        else { p(3, 3, 3, 9, H); p(2, 6, 1, 2, H); p(2, 10, 1, 2, dk(H)); }
      } else if (hs === 'hime') {
        if (front) { p(4, 3, 8, 1, H); p(3, 2, 1, 9, H); p(12, 2, 1, 9, dk(H)); p(4, 6, 1, 4, H); p(11, 6, 1, 4, dk(H)); p(4, 9, 1, 1, dk(H)); }
        else if (back) { p(4, 8, 8, 6, H); p(4, 13, 8, 1, dk(H)); }
        else { p(4, 3, 3, 9, H); p(7, 3, 4, 1, H); p(4, 11, 3, 1, dk(H)); }
      } else if (hs === 'sidepart') {
        if (front) { p(4, 3, 4, 1, H); p(4, 4, 2, 1, H); p(8, 2, 1, 1, dk(H)); }
        else if (side) { p(7, 3, 4, 1, H); p(9, 4, 2, 1, H); }
      } else if (hs === 'mohawk') {
        const sk = L.skin;
        if (front) { p(3, 2, 1, 5, sk); p(12, 2, 1, 5, dk(sk)); p(4, 1, 2, 2, sk); p(10, 1, 2, 2, dk(sk)); p(4, 3, 2, 1, sk); p(10, 3, 2, 1, sk); p(6, -2, 4, 3, H); p(7, -3, 2, 1, H); p(6, -2, 1, 1, lt(H)); }
        else if (back) { p(4, 2, 2, 7, sk); p(10, 2, 2, 7, dk(sk)); p(6, -2, 4, 10, H); }
        else { p(4, 2, 3, 6, sk); p(5, 3, 2, 4, sk); p(5, -2, 6, 3, H); p(6, -3, 3, 1, H); }
      } else if (hs === 'messy') {
        [[3, 1], [12, 1], [5, 0], [9, 0], [10, 0], [2, 4], [13, 3], [7, -1]].forEach(([a, b], i) => p(a, b, 1, 1, i % 3 ? H : dk(H)));
        if (front) { p(6, 3, 1, 2, H); p(9, 3, 1, 1, H); }
      } else if (hs === 'highpony') {
        if (front) { p(7, -1, 2, 2, H); p(7, -1, 1, 1, lt(H)); p(6, 0, 1, 1, L.accCol || '#C8323A'); }
        else if (back) { p(7, -1, 2, 2, H); p(7, 1, 2, 12, H); p(7, 12, 1, 2, dk(H)); p(6, 0, 4, 1, L.accCol || '#C8323A'); }
        else { p(3, -1, 2, 2, H); p(1, 1, 2, 10, H); p(1, 10, 1, 1, dk(H)); p(4, 0, 1, 1, L.accCol || '#C8323A'); }
      }
    }
    // ---- 臉：瞳孔、眉毛、表情（背面看不到） ----
    if (back) return;
    const eye = L.eye, sk = L.skin, ink = sh(sk, -0.55);
    if (e.pupil && L.acc !== 'glasses' && L.acc !== 'eyepatch') {
      const E2 = side ? [[10, 5]] : [[6, 5], [9, 5]];
      E2.forEach(([ex, ey], i) => {
        if (e.pupil === 'big') { const bx = side ? ex : (i ? ex : ex - 1); p(bx, ey, 2, 2, eye); p(bx + (i || side ? 0 : 1), ey, 1, 1, '#FFFFFF'); }
        else if (e.pupil === 'shine') { p(ex, ey, 1, 2, eye); p(ex, ey, 1, 1, sh(eye, 0.75)); }
        else if (e.pupil === 'slit') { const bx = side ? ex : (i ? ex : ex - 1); p(bx, ey, 2, 2, sh(eye, 0.25)); p(side ? ex : (i ? ex : ex), ey, 1, 2, '#141018'); }
        else if (e.pupil === 'sharp') { p(ex, ey, 1, 1, sk); p(ex, ey + 1, 1, 1, eye); p(side ? ex - 1 : (i ? ex : ex - 1), ey, 2, 1, ink); }
        else if (e.pupil === 'closed') { p(ex, ey, 1, 2, sk); p(side ? ex - 1 : (i ? ex : ex - 1), ey + 1, 1, 1, ink); p(side ? ex : (i ? ex + 1 : ex), ey, 1, 1, ink); }
      });
    }
    if (e.brow && e.brow !== 'none' && !L.head) {
      const bc = e.browCol || sh(L.hs === 'bald' ? sk : L.hair, -0.25);
      if (side) {
        if (e.brow === 'thin') p(10, 4, 1, 1, bc); else if (e.brow === 'thick') p(9, 4, 2, 1, bc), p(10, 3, 1, 1, bc);
        else if (e.brow === 'angry') { p(9, 3, 1, 1, bc); p(10, 4, 1, 1, bc); } else if (e.brow === 'sad') { p(9, 4, 1, 1, bc); p(10, 3, 1, 1, bc); }
      } else {
        if (e.brow === 'thin') { p(6, 4, 1, 1, bc); p(9, 4, 1, 1, bc); }
        else if (e.brow === 'thick') { p(5, 4, 2, 1, bc); p(9, 4, 2, 1, bc); p(6, 3, 1, 1, bc); p(9, 3, 1, 1, bc); }
        else if (e.brow === 'angry') { p(5, 3, 1, 1, bc); p(6, 4, 1, 1, bc); p(10, 3, 1, 1, bc); p(9, 4, 1, 1, bc); }
        else if (e.brow === 'sad') { p(5, 4, 1, 1, bc); p(6, 3, 1, 1, bc); p(9, 3, 1, 1, bc); p(10, 4, 1, 1, bc); }
      }
    }
    if (e.mouth && !L.beard) {
      if (side) {
        p(9, 8, 2, 1, sk);
        if (e.mouth === 'smile') { p(9, 8, 1, 1, ink); p(10, 7, 1, 1, ink); } else if (e.mouth === 'grin') { p(9, 8, 2, 1, '#F4F0EA'); p(11, 8, 1, 1, ink); }
        else if (e.mouth === 'frown') { p(9, 8, 1, 1, ink); p(10, 9, 1, 1, ink); } else if (e.mouth === 'open') p(9, 8, 2, 1, '#6A2A2A'); else p(9, 8, 2, 1, ink);
      } else {
        p(7, 7, 2, 1, sk);
        if (e.mouth === 'smile') { p(6, 7, 1, 1, ink); p(7, 8, 2, 1, ink); p(9, 7, 1, 1, ink); }
        else if (e.mouth === 'grin') { p(6, 7, 4, 1, ink); p(7, 7, 2, 1, '#F4F0EA'); }
        else if (e.mouth === 'frown') { p(7, 7, 2, 1, ink); p(6, 8, 1, 1, ink); p(9, 8, 1, 1, ink); }
        else if (e.mouth === 'open') { p(7, 7, 2, 2, '#6A2A2A'); p(7, 8, 2, 1, '#B8505A'); }
        else if (e.mouth === 'flat') p(6, 7, 4, 1, ink);
      }
    }
  };

  // ---------- 身高、體格：圖的寬、高 ----------
  const SC = { h: { short: 0.92, tall: 1.08 }, b: { slim: 0.9, broad: 1.1 } };
  const scaleOf = look => ({ x: (look && SC.b[look.build]) || 1, y: (look && SC.h[look.height]) || 1 });
  R.lookScale = scaleOf;
  const apply = h => { if (!h || !h.spr) return h; const k = scaleOf(h.opt); h.spr.scale.set(k.x, k.y, 1); return h; };
  const mh0 = R.makeHeroSprite;
  if (mh0) R.makeHeroSprite = (...a) => apply(mh0(...a));
  const sl0 = R.spriteLook;
  if (sl0) R.spriteLook = (h, look) => { const r = sl0(h, look); apply(h); return r; };
})(window.R);
