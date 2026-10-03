// 討伐令 1433：裝備的圖示、裝備欄的數值、紅色的「神話」級
// - 圖示：每一種武器、護具、護符各畫一張 16×16 的點陣圖（先用線和形狀畫，再把半透明的邊變成實心、描一圈深色邊，和人物的點陣一樣）；
//   材質照物品等級：鐵製（灰）、魔晶（藍紫）、核心（金紅）。外框顏色是稀有度（CSS 的 --c）。
// - 裝備欄（倉庫）：每一格顯示圖示、名字、稀有度、主要數值和詞綴；倉庫的卡片、遺跡的背包也有圖示。
// - 神話（紅色）：第六個稀有度，四個詞綴、數值 ×1.85；武器帶傳說的效果。只在摩爾斯級（很少）、克森特級掉，拆了給兩顆魔力核心。
(function (R) {
  const esc = s => R.esc(s);

  // ---------- 神話 ----------
  if (R.RARITY.length < 6) R.RARITY.push({ name: '神話', color: '#FF4A4A', affix: 4, mult: 1.85, known: 0 });
  if (R.LOOT_WEIGHTS) R.LOOT_WEIGHTS.forEach((w, g) => { if (w.length < 6) w.push([0, 0, 0.2, 1.2][g] || 0); });
  const sv = R.salvage;
  if (sv) R.salvage = it => { const got = sv(it); if (it && it.identified && it.rarity >= 5) got.core = (got.core || 0) + 1; return got; };

  // ---------- 點陣圖示 ----------
  const MAT = [['#D4D8E0', '#8A909A', '#5A606A'], ['#B8C8FF', '#7A8AE0', '#4A4A9A'], ['#FFE08A', '#E09A3A', '#9A4A1E']];
  const WOOD = ['#A87A4A', '#7A5230'], LEATHER = ['#9A6A44', '#6A4A2E'], CLOTH = ['#7A8AA8', '#4E5A78'];
  const GEM = ['#9AF0FF', '#C8A0FF', '#FF8A6A'];
  const draw = (base, tier) => {
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'), m = MAT[tier] || MAT[0];
    const ln = (x0, y0, x1, y1, col, w) => { x.strokeStyle = col; x.lineWidth = w || 1; x.lineCap = 'square'; x.beginPath(); x.moveTo(x0 + 0.5, y0 + 0.5); x.lineTo(x1 + 0.5, y1 + 0.5); x.stroke(); };
    const rc = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const poly = (pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
    const circ = (a, b, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
    const arc = (a, b, r, s0, s1, col, w) => { x.strokeStyle = col; x.lineWidth = w || 1.4; x.beginPath(); x.arc(a, b, r, s0, s1); x.stroke(); };
    switch (base) {
      case 'sword': ln(13, 2, 6, 9, m[0], 2); ln(13, 2, 7, 8, m[1], 1); ln(3, 8, 7, 12, m[2], 2); ln(5, 10, 2, 13, WOOD[1], 2); rc(1, 13, 2, 2, m[1]); break;
      case 'greatsword': ln(14, 1, 6, 9, m[0], 3); ln(14, 1, 7, 8, m[1], 1); ln(2, 7, 8, 13, m[2], 2); ln(5, 10, 2, 13, WOOD[1], 2); rc(1, 13, 2, 2, m[1]); break;
      case 'katana': ln(14, 2, 10, 5, m[0], 2); ln(10, 5, 6, 9, m[0], 2); ln(13, 2, 9, 5, m[1], 1); rc(4, 9, 3, 3, m[2]); ln(5, 11, 2, 14, '#2A2420', 2); break;
      case 'dualblades': ln(13, 2, 5, 10, m[0], 2); ln(3, 2, 11, 10, m[0], 2); ln(4, 9, 2, 12, WOOD[1], 2); ln(12, 9, 14, 12, WOOD[1], 2); rc(5, 9, 2, 2, m[2]); rc(9, 9, 2, 2, m[2]); break;
      case 'axe': ln(3, 14, 11, 4, WOOD[0], 2); poly([[9, 1], [15, 4], [14, 9], [10, 7]], m[0]); ln(14, 4, 14, 8, m[1], 1); break;
      case 'mace': ln(3, 14, 10, 6, WOOD[0], 2); circ(11.5, 4.5, 3.4, m[1]); circ(11, 4, 2, m[0]); rc(11, 0, 1, 2, m[2]); rc(15, 4, 1, 1, m[2]); rc(7, 4, 1, 1, m[2]); rc(11, 8, 1, 1, m[2]); break;
      case 'gauntlet': rc(4, 4, 8, 7, m[1]); rc(4, 4, 8, 2, m[0]); rc(5, 11, 6, 4, LEATHER[0]); rc(6, 6, 1, 1, m[2]); rc(9, 6, 1, 1, m[2]); break;
      case 'staffpole': ln(2, 14, 14, 2, WOOD[0], 2); rc(13, 1, 2, 2, m[1]); rc(1, 13, 2, 2, m[1]); break;
      case 'spear': ln(1, 15, 11, 5, WOOD[0], 2); poly([[10, 3], [15, 0], [13, 6]], m[0]); rc(10, 5, 2, 2, m[2]); break;
      case 'staff': ln(3, 15, 11, 5, WOOD[0], 2); ln(10, 6, 14, 2, WOOD[1], 2); circ(12, 3.5, 2.4, GEM[tier] || GEM[0]); rc(12, 2, 1, 1, '#FFFFFF'); break;
      case 'orb': circ(8, 7, 5.2, GEM[tier] || GEM[0]); circ(6.5, 5.5, 1.6, '#FFFFFF'); poly([[4, 13], [12, 13], [10, 11], [6, 11]], m[2]); rc(3, 13, 10, 2, m[1]); break;
      case 'holystaff': ln(4, 15, 10, 6, WOOD[0], 2); arc(11.5, 4.5, 3, 0, 7, m[0], 1.6); ln(11, 0, 11, 9, m[0], 1); ln(8, 4, 15, 4, m[0], 1); break;
      case 'pistol': rc(3, 5, 10, 3, m[1]); rc(3, 5, 10, 1, m[0]); poly([[4, 8], [7, 8], [6, 13], [3, 13]], WOOD[1]); rc(8, 8, 2, 2, m[2]); break;
      case 'rifle': rc(1, 6, 14, 2, m[1]); rc(1, 6, 14, 1, m[0]); poly([[1, 8], [6, 8], [5, 11], [1, 12]], WOOD[0]); rc(8, 8, 2, 3, m[2]); rc(12, 5, 2, 1, m[2]); break;
      case 'shotgun': rc(3, 5, 12, 2, m[1]); rc(3, 7, 12, 1, m[2]); rc(3, 5, 12, 1, m[0]); poly([[2, 7], [7, 7], [5, 12], [1, 12]], WOOD[0]); break;
      case 'shortbow': arc(4, 8, 7, -1.2, 1.2, WOOD[0], 2); ln(6, 2, 6, 14, '#E8E0CC', 1); break;
      case 'longbow': arc(2, 8, 10, -0.95, 0.95, WOOD[0], 2); ln(8, 0, 8, 15, '#E8E0CC', 1); break;
      case 'crossbow': arc(8, 9, 6, Math.PI * 1.1, Math.PI * 1.9, WOOD[0], 2); ln(3, 5, 13, 5, '#E8E0CC', 1); ln(8, 3, 8, 15, WOOD[1], 2); rc(7, 9, 3, 2, m[1]); break;
      case 'head_light': poly([[1, 10], [8, 3], [15, 10]], '#C8A86A'); rc(1, 10, 15, 2, '#9A7A44'); ln(5, 12, 5, 15, '#6A4A2E', 1); ln(11, 12, 11, 15, '#6A4A2E', 1); break;
      case 'head_medium': circ(8, 8, 6, m[1]); rc(2, 8, 12, 7, m[1]); rc(5, 7, 6, 6, '#2A2430'); for (let i = 3; i < 14; i += 2) rc(i, 3 + (i % 4 ? 0 : 1), 1, 1, m[0]); break;
      case 'head_heavy': circ(8, 8, 6, m[1]); rc(2, 8, 12, 6, m[1]); rc(3, 9, 10, 1, '#1A1620'); rc(7, 2, 2, 12, m[0]); rc(5, 4, 1, 3, m[0]); break;
      case 'body_light': poly([[4, 2], [12, 2], [15, 6], [13, 8], [12, 15], [4, 15], [3, 8], [1, 6]], LEATHER[0]); rc(7, 2, 2, 13, LEATHER[1]); break;
      case 'body_medium': poly([[4, 2], [12, 2], [15, 6], [13, 8], [12, 15], [4, 15], [3, 8], [1, 6]], m[1]); for (let a = 4; a < 13; a += 2) for (let b = 4; b < 15; b += 2) rc(a + (b % 4 ? 1 : 0), b, 1, 1, m[0]); break;
      case 'body_heavy': poly([[4, 2], [12, 2], [15, 6], [13, 8], [12, 15], [4, 15], [3, 8], [1, 6]], m[1]); poly([[5, 4], [11, 4], [11, 10], [8, 13], [5, 10]], m[0]); rc(7, 4, 2, 9, m[2]); break;
      case 'legs_light': poly([[3, 2], [13, 2], [14, 15], [9, 15], [8, 7], [7, 15], [2, 15]], CLOTH[0]); rc(3, 2, 10, 2, CLOTH[1]); break;
      case 'legs_medium': poly([[3, 2], [13, 2], [14, 15], [9, 15], [8, 7], [7, 15], [2, 15]], m[1]); for (let b = 5; b < 15; b += 2) { rc(3, b, 4, 1, m[0]); rc(10, b, 4, 1, m[0]); } rc(3, 2, 10, 2, LEATHER[1]); break;
      case 'legs_heavy': poly([[3, 2], [13, 2], [14, 15], [9, 15], [8, 7], [7, 15], [2, 15]], m[1]); rc(3, 6, 4, 3, m[0]); rc(10, 6, 4, 3, m[0]); rc(3, 2, 10, 2, m[2]); break;
      case 'feet_light': rc(2, 9, 5, 4, '#C8A86A'); rc(1, 13, 7, 2, '#9A7A44'); rc(9, 9, 5, 4, '#C8A86A'); rc(8, 13, 7, 2, '#9A7A44'); break;
      case 'feet_medium': rc(2, 5, 4, 8, LEATHER[0]); rc(2, 12, 6, 3, LEATHER[1]); rc(9, 5, 4, 8, LEATHER[0]); rc(9, 12, 6, 3, LEATHER[1]); break;
      case 'feet_heavy': rc(2, 5, 4, 8, m[1]); rc(2, 12, 6, 3, m[2]); rc(2, 6, 4, 1, m[0]); rc(9, 5, 4, 8, m[1]); rc(9, 12, 6, 3, m[2]); rc(9, 6, 4, 1, m[0]); break;
      default: arc(8, 6, 4.5, Math.PI * 1.05, Math.PI * 1.95, '#C8B89A', 1); poly([[8, 7], [12, 11], [8, 15], [4, 11]], GEM[tier] || GEM[0]); rc(7, 9, 1, 2, '#FFFFFF');
    }
    // 半透明的邊變實心；描一圈深色邊
    const img = x.getImageData(0, 0, 16, 16), d = img.data, solid = new Uint8Array(256);
    for (let i = 0; i < 256; i++) { if (d[i * 4 + 3] >= 110) { d[i * 4 + 3] = 255; solid[i] = 1; } else d[i * 4 + 3] = 0; }
    for (let i = 0; i < 256; i++) { if (solid[i]) continue; const px = i % 16, py = (i - px) / 16; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const qx = px + a, qy = py + b; return qx >= 0 && qy >= 0 && qx < 16 && qy < 16 && solid[qy * 16 + qx]; })) { d[i * 4] = 20; d[i * 4 + 1] = 16; d[i * 4 + 2] = 24; d[i * 4 + 3] = 255; } }
    x.putImageData(img, 0, 0);
    return c;
  };
  const cache = {};
  R.itemIconURL = (it, k) => {
    k = k || 3; const tier = it.kind === 'charm' ? Math.min(2, Math.floor((it.rarity || 0) / 2)) : R.tierOf(it.ilvl), key = it.base + ':' + tier + ':' + k;
    if (cache[key]) return cache[key];
    const src = draw(it.kind === 'charm' ? 'charm' : it.base, tier), c = document.createElement('canvas'); c.width = c.height = 16 * k;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, 16 * k, 16 * k);
    return (cache[key] = c.toDataURL());
  };
  R.itemIconTag = (it, cls) => '<span class="gicon' + (cls ? ' ' + cls : '') + (it.identified && it.rarity >= 5 ? ' myth' : '') + '" style="--c:' + R.rarityColor(it) + '"><img src="' + R.itemIconURL(it, 3) + '" alt=""></span>';

  // ---------- 裝備欄：圖示＋數值 ----------
  R.gearSlot = (k, it) => {
    if (!it) return '<div class="slot gslot empty"><span class="gicon"><b>' + esc(R.GEAR_NAME[k].slice(0, 1)) + '</b></span><div><small>' + R.GEAR_NAME[k] + '</small><span class="note">（空）</span></div></div>';
    const L = R.itemLines(it).filter(l => !/用$|^物品等級/.test(l));
    return '<div class="slot gslot" style="--c:' + R.rarityColor(it) + '">' + R.itemIconTag(it) + '<div><small>' + R.GEAR_NAME[k] + '・' + (it.identified ? R.RARITY[it.rarity].name : '未鑑定') + '・等級 ' + it.ilvl + '</small>'
      + '<b style="color:' + R.rarityColor(it) + '">' + esc(R.itemName(it)) + '</b><ul>' + L.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>'
      + (k !== 'weapon' ? '<button type="button" class="mini" data-unequip="' + k + '">脫下</button>' : '') + '</div></div>';
  };
})(window.R);
