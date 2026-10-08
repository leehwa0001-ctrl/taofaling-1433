// 技能圖示：發光的手遊風格（2026-10-08 作者給了兩張參考圖：「幫我把技能圖示做的像這樣」）
// 參考圖的樣子：底是同色系的放射漸層（中間亮、四周暗到快黑）、從中間射出的光芒、繞著主題的能量弧線、細小的光點，
// 主題本身很亮（白芯＋技能的顏色），外面一圈光暈、底下一點陰影，整張四周壓暗；外框細細一圈。
// - 畫什麼照原本的（skillicons.js 的 R.skillIconInfo：每一招的種類、顏色、段數、徽章、轉職／二轉／覺醒），只換畫法。
// - 96×96（原本 32×32 的像素圖），顯示的地方不再用 image-rendering:pixelated（會鋸齒）。
// - 元素類的種類（火球、治療、冰、雷、吸血、復活……）用固定的元素色，其他照技能自己的顏色。
// - 徽章改成角落的小圓章；段數改成上緣發光的小菱形。
// - 手機的技能鈕也顯示圖示（原本只有字）：圖示當底、名字壓在下面。
// 放在 skillicons.js 後面。
(function (R) {
  const N = 96, U = N / 24, cache = {};
  const hex = c => { const r = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(String(c || '')); if (r) return [+r[1], +r[2], +r[3]]; const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '')); const n = m ? parseInt(m[1], 16) : 0xC8C0B0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')'; };
  const rgba = (c, a) => { const A = hex(c); return 'rgba(' + A.join(',') + ',' + a + ')'; };
  // 太灰的顏色拉鮮豔一點（參考圖每一張都很飽和）
  const vivid = c => { let [r, g, b] = hex(c); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 40) return mix(c, '#E8C060', 0.35); const k = 1.25, avg = (r + g + b) / 3; [r, g, b] = [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(avg + (v - avg) * k)))); return 'rgb(' + r + ',' + g + ',' + b + ')'; };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const KIND_COL = { fireball: '#FF6A1A', rage: '#FF3A1A', meteor: '#FF7A2A', heal: '#46D86A', frost: '#5FC0FF', bolt: '#4A8CFF', storm: '#4A7CFF', drain: '#E8203A', fang: '#E8203A', revive: '#FFC83A', ghost: '#8A6AE8', breath: '#FF7A2A' };
  const cv = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c; };
  const rr = (x, a, b, w, h, r) => { x.beginPath(); if (x.roundRect) x.roundRect(a, b, w, h, r); else x.rect(a, b, w, h); };

  // ---------- 主題（座標 24×24，跟原本一樣，放大 4 倍畫）----------
  const motif = (o, base) => {
    const g = cv(), y = g.getContext('2d'); y.scale(U, U); y.lineJoin = 'round';
    const col = mix(base, '#FFFFFF', 0.08), lt = mix(base, '#FFFFFF', 0.62), dk = mix(base, '#000000', 0.35), mid = mix(base, '#FFFFFF', 0.38), W = '#FFFFFF';
    const P = (a, b, w, h, cc) => { y.fillStyle = cc; y.fillRect(a, b, w, h); };
    const ln = (x0, y0, x1, y1, cc, w) => { y.strokeStyle = cc; y.lineWidth = w || 2; y.lineCap = 'round'; y.beginPath(); y.moveTo(x0, y0); y.lineTo(x1, y1); y.stroke(); };
    const circ = (a, b, r, cc) => { y.fillStyle = cc; y.beginPath(); y.arc(a, b, r, 0, 7); y.fill(); };
    const arc = (a, b, r, s0, s1, cc, w) => { y.strokeStyle = cc; y.lineWidth = w || 2; y.lineCap = 'round'; y.beginPath(); y.arc(a, b, r, s0, s1); y.stroke(); };
    const poly = (pts, cc) => { y.fillStyle = cc; y.beginPath(); pts.forEach(([a, b], i) => (i ? y.lineTo(a, b) : y.moveTo(a, b))); y.closePath(); y.fill(); };
    const star = (cx, cy, r, cc) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.42 : r; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } poly(pts, cc); };
    const bolt = (s, ox, oy, cc) => poly([[13 * s + ox, 2 * s + oy], [5 * s + ox, 12 * s + oy], [11 * s + ox, 12 * s + oy], [8 * s + ox, 21 * s + oy], [18 * s + ox, 9 * s + oy], [12 * s + ox, 9 * s + oy]], cc);
    // 月牙刀光：中間厚、兩端尖
    const crescent = (cx, cy, r, a0, a1, th, cc) => { y.fillStyle = cc; y.beginPath(); y.arc(cx, cy, r, a0, a1); const m = (a0 + a1) / 2; y.quadraticCurveTo(cx + Math.cos(m) * (r - th * 2), cy + Math.sin(m) * (r - th * 2), cx + Math.cos(a0) * r, cy + Math.sin(a0) * r); y.fill(); };
    switch (o.kind) {
      case 'slash': crescent(4, 20, 17, -1.5, 0, 3, col); crescent(4, 20, 14, -1.4, -0.1, 2, lt); crescent(4, 20, 11.5, -1.3, -0.2, 1, W); break;
      case 'xslash': crescent(2, 22, 22, -1.35, -0.2, 2.2, lt); crescent(22, 22, 22, -2.95, -1.8, 2.2, col); ln(6, 6, 18, 18, W, 1); break;
      case 'spin': crescent(12, 12, 9.5, 0.2, 5.4, 2.6, col); crescent(12, 12, 6.5, 2.4, 7.4, 2, lt); circ(12, 12, 2, W); break;
      case 'thrust': ln(3, 21, 17, 7, mix(base, '#8A6A44', 0.4), 2.2); poly([[22.5, 1.5], [13.5, 5], [19, 10.5]], lt); ln(16, 8, 21, 3, W, 1); ln(1, 19, 9, 11, rgba(lt, 0.5), 1); break;
      case 'slashwave': crescent(0, 24, 20, -1.45, -0.15, 3, col); crescent(6, 24, 14, -1.45, -0.15, 2.2, lt); crescent(11, 24, 9, -1.4, -0.2, 1.4, W); break;
      case 'shot': ln(2, 22, 14, 10, rgba(lt, 0.7), 2.5); ln(4, 22, 14, 12, rgba(col, 0.6), 1.2); poly([[22, 2], [13, 6.5], [17.5, 11]], lt); circ(17, 7, 3, col); circ(17.5, 6.5, 1.5, W); break;
      case 'snipe': arc(12, 12, 8.5, 0, 7, lt, 1.8); arc(12, 12, 4.5, 0, 7, col, 1.2); ln(12, 1, 12, 8, lt, 1.4); ln(12, 16, 12, 23, lt, 1.4); ln(1, 12, 8, 12, lt, 1.4); ln(16, 12, 23, 12, lt, 1.4); circ(12, 12, 2, '#FF5A4A'); circ(11.5, 11.5, 0.8, W); break;
      case 'arrow': ln(3, 21, 18, 6, mix(base, '#C8A06A', 0.4), 2); poly([[22.5, 1.5], [13.5, 4], [20, 10.5]], lt); poly([[3, 21], [2.5, 14.5], [6.5, 17.5]], col); poly([[3, 21], [9.5, 21.5], [6.5, 17.5]], col); ln(6, 18, 18, 6, W, 0.8); break;
      case 'orb': circ(14, 10, 7, col); circ(14, 10, 4.5, lt); circ(12.5, 8.5, 1.8, W); ln(2, 22, 9, 15, mid, 2.2); ln(5, 23, 10, 18, rgba(col, 0.7), 1.5); break;
      case 'note': circ(8, 17.5, 3.8, lt); circ(17, 15.5, 3.8, lt); ln(11.3, 17.5, 11.3, 4, lt, 2); ln(20.3, 15.5, 20.3, 3, lt, 2); poly([[11.3, 3], [20.3, 2], [20.3, 5.5], [11.3, 6.5]], col); circ(7, 16.5, 1.2, W); break;
      case 'scroll': P(5, 4, 14, 16, mix(base, '#F4EEDC', 0.75)); P(3.5, 2.5, 17, 3.5, col); P(3.5, 18, 17, 3.5, col); ln(8, 9, 16, 9, dk, 1); ln(8, 12, 15, 12, dk, 1); ln(8, 15, 13, 15, dk, 1); break;
      case 'fireball': poly([[8, 7], [0, 22], [10, 16], [4, 23], [13, 17]], rgba('#FF8A3A', 0.9)); circ(14, 10, 7.5, '#FF5A1A'); circ(14, 10, 5, '#FFB03A'); circ(14.5, 9.5, 2.8, '#FFF2C0'); break;
      case 'boom': for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + 0.3; poly([[12 + Math.cos(a - 0.18) * 5, 13 + Math.sin(a - 0.18) * 5], [12 + Math.cos(a) * (i % 2 ? 9 : 11.5), 13 + Math.sin(a) * (i % 2 ? 9 : 11.5)], [12 + Math.cos(a + 0.18) * 5, 13 + Math.sin(a + 0.18) * 5]], i % 2 ? col : lt); } circ(12, 13, 5.5, lt); circ(12, 13, 3, W); break;
      case 'nova': for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; poly([[12 + Math.cos(a - 0.2) * 3.5, 12 + Math.sin(a - 0.2) * 3.5], [12 + Math.cos(a) * (i % 2 ? 8 : 11), 12 + Math.sin(a) * (i % 2 ? 8 : 11)], [12 + Math.cos(a + 0.2) * 3.5, 12 + Math.sin(a + 0.2) * 3.5]], i % 2 ? col : lt); } circ(12, 12, 3.8, W); break;
      case 'quake': poly([[1, 17], [23, 17], [23, 22], [1, 22]], dk); ln(3, 17, 8, 11, lt, 2); ln(8, 11, 12, 16, lt, 2); ln(12, 16, 16, 9, lt, 2); ln(16, 9, 21, 17, lt, 2); poly([[9.5, 1], [14.5, 1], [12, 8]], col); [[4, 13], [19, 12], [12, 20]].forEach(([a, b]) => circ(a, b, 1, W)); break;
      case 'pillar': y.globalAlpha = 0.8; circ(12, 20, 8, mid); y.globalAlpha = 1; poly([[8.5, 0], [15.5, 0], [14.5, 20], [9.5, 20]], col); poly([[10.5, 0], [13.5, 0], [13, 20], [11, 20]], lt); P(11.5, 0, 1, 20, W); arc(12, 20, 8.5, Math.PI, 2 * Math.PI, lt, 1.5); break;
      case 'meteor': [[5, 2], [12, 0], [18, 4]].forEach(([a, b], i) => { ln(a - 4, b - 4, a + 3, b + 7, rgba(i === 1 ? lt : col, 0.8), i === 1 ? 3 : 2); circ(a + 4, b + 9, i === 1 ? 3.4 : 2.6, i === 1 ? '#FFF2C0' : lt); }); poly([[1, 20], [23, 20], [23, 23], [1, 23]], dk); break;
      case 'zone': y.save(); y.scale(1, 0.55); circ(12, 28, 10.5, rgba(col, 0.55)); arc(12, 28, 10.5, 0, 7, lt, 2); arc(12, 28, 6.5, 0, 7, col, 1.5); y.restore(); [[7, 7], [13, 3], [18, 9], [10, 11]].forEach(([a, b]) => star(a, b, 1.8, lt)); break;
      case 'mark': arc(12, 12, 8.5, 0, 7, col, 2.2); arc(12, 12, 4.5, 0, 7, lt, 2); [[12, 0.5, 12, 5], [12, 19, 12, 23.5], [0.5, 12, 5, 12], [19, 12, 23.5, 12]].forEach(([a, b, c2, d2]) => ln(a, b, c2, d2, lt, 2)); circ(12, 12, 1.6, W); break;
      case 'vortex': for (let i = 0; i < 4; i++) arc(12, 12, 2.5 + i * 2.6, i * 1.3, i * 1.3 + 4.4, i % 2 ? lt : col, 2); circ(12, 12, 2, W); break;
      case 'dash': ln(1, 7, 10, 7, rgba(mid, 0.8), 2); ln(0, 12, 12, 12, lt, 2.4); ln(2, 17, 10, 17, rgba(mid, 0.8), 2); poly([[12, 4], [23, 12], [12, 20], [15.5, 12]], lt); poly([[14, 8], [20, 12], [14, 16], [16, 12]], W); break;
      case 'blink': [[12, 1], [12, 23], [1, 12], [23, 12]].forEach(([a, b]) => ln(12, 12, a, b, col, 2.2)); [[5, 5], [19, 19], [19, 5], [5, 19]].forEach(([a, b]) => ln(12, 12, a, b, mid, 1.2)); circ(12, 12, 4, lt); circ(12, 12, 2.2, W); break;
      case 'buff': poly([[12, 1.5], [21.5, 11], [16, 11], [16, 22], [8, 22], [8, 11], [2.5, 11]], lt); poly([[12, 5], [17.5, 10], [14.3, 10], [14.3, 20], [9.7, 20], [9.7, 10], [6.5, 10]], col); P(11.3, 8, 1.4, 11, W); break;
      case 'rage': poly([[12, 0.5], [17, 8.5], [21.5, 5], [19.5, 22], [4.5, 22], [2.5, 5], [7, 8.5]], '#FF3A1A'); poly([[12, 6.5], [15.5, 12], [17.5, 9.5], [16.5, 20], [7.5, 20], [6.5, 9.5], [8.5, 12]], '#FFB03A'); poly([[12, 12], [14, 16], [12, 19.5], [10, 16]], '#FFF2C0'); break;
      case 'horn': poly([[2, 8.5], [9, 8.5], [18, 2], [18, 22], [9, 15.5], [2, 15.5]], lt); poly([[4, 10.5], [9, 10.5], [16, 5.5], [16, 18.5], [9, 13.5], [4, 13.5]], col); [0, 1, 2].forEach(i => arc(18, 12, 3.5 + i * 2.6, -0.8, 0.8, i === 1 ? lt : col, 1.5)); break;
      case 'wing': poly([[2, 19], [7, 6], [12, 2.5], [10.5, 9.5], [17, 5], [13.5, 12.5], [22.5, 10], [12, 19]], lt); poly([[5, 17], [9, 9], [11, 7], [10, 12], [14, 10], [12, 14], [17, 13], [11, 17]], col); ln(2, 19, 14, 16.5, W, 1); break;
      case 'eye': y.save(); y.scale(1, 0.6); circ(12, 20, 10, lt); y.restore(); circ(12, 12, 4.5, col); circ(12, 12, 2.3, '#140F1A'); circ(10.6, 10.6, 1.1, W); break;
      case 'fang': poly([[4, 2], [20, 2], [18, 8], [6, 8]], lt); poly([[6.5, 8], [9.5, 8], [8, 18.5]], W); poly([[14.5, 8], [17.5, 8], [16, 18.5]], W); circ(16, 20.5, 2.2, '#FF2A4A'); break;
      case 'ghost': y.globalAlpha = 0.9; poly([[4.5, 22], [4.5, 10], [8, 3.5], [16, 3.5], [19.5, 10], [19.5, 22], [16, 18.5], [12, 22], [8, 18.5]], lt); y.globalAlpha = 1; circ(9.5, 11, 1.7, '#2A1A44'); circ(14.5, 11, 1.7, '#2A1A44'); break;
      case 'heal': poly([[9, 2.5], [15, 2.5], [15, 9], [21.5, 9], [21.5, 15], [15, 15], [15, 21.5], [9, 21.5], [9, 15], [2.5, 15], [2.5, 9], [9, 9]], '#5AE07A'); poly([[10.3, 4], [13.7, 4], [13.7, 10.3], [20, 10.3], [20, 13.7], [13.7, 13.7], [13.7, 20], [10.3, 20], [10.3, 13.7], [4, 13.7], [4, 10.3], [10.3, 10.3]], '#D8FFE0'); break;
      case 'guard': poly([[2.5, 2.5], [21.5, 2.5], [21.5, 11], [12, 22.5], [2.5, 11]], lt); poly([[5.5, 5.5], [18.5, 5.5], [18.5, 11], [12, 19], [5.5, 11]], col); P(11, 6, 2, 12, lt); P(6, 10, 12, 2, lt); circ(12, 11, 1.4, W); break;
      case 'parry': ln(3, 3, 19, 19, lt, 2.6); ln(21, 3, 5, 19, lt, 2.6); P(2.5, 17.5, 5, 5, col); P(16.5, 17.5, 5, 5, col); star(12, 11, 3.5, W); break;
      case 'drain': circ(8, 9, 4.3, '#E8203A'); circ(15, 9, 4.3, '#E8203A'); poly([[3.9, 10.8], [19.1, 10.8], [11.5, 20]], '#E8203A'); circ(8, 8, 1.5, '#FFB0B8'); ln(23, 1, 13, 11, lt, 2); poly([[13, 11], [13, 5.5], [17.5, 10]], lt); break;
      case 'orbit': arc(12, 12, 8.5, 0, 7, rgba(mid, 0.8), 1.2); circ(12, 12, 3.5, col); circ(12, 12, 1.6, W); [0, 2.1, 4.2].forEach(a => { circ(12 + Math.cos(a) * 8.5, 12 + Math.sin(a) * 8.5, 2.6, lt); circ(12 + Math.cos(a) * 8.5 - 0.6, 12 + Math.sin(a) * 8.5 - 0.6, 1, W); }); break;
      case 'turret': P(4, 15, 16, 7, '#5A5C66'); P(6.5, 7.5, 11, 8, col); P(16, 9.5, 7.5, 3.5, '#3A3C46'); circ(12, 11, 2, lt); circ(23, 11, 1.4, W); break;
      case 'hook': arc(13, 15, 5.2, 0, Math.PI * 1.15, lt, 2.6); ln(18.2, 15, 18.2, 2.5, lt, 2.6); ln(2, 6, 18, 2.5, mix(base, '#8A6A44', 0.4), 1.6); circ(8, 18, 1.3, W); break;
      case 'bolt': bolt(1.05, -0.5, 0.5, '#FFE87A'); bolt(0.72, 8.5, 6, lt); bolt(0.45, 2.5, 3, W); break;
      case 'storm': circ(8, 7, 5, mid); circ(14, 5.5, 5.5, lt); circ(18.5, 8.5, 4, mid); P(4, 8, 17, 4.5, lt); poly([[12.5, 11.5], [8, 18.5], [11, 18.5], [9, 23.5], [16, 15.5], [12.8, 15.5]], '#FFE87A'); break;
      case 'wave': [5, 11.5, 18].forEach((b, i) => { y.strokeStyle = i === 1 ? lt : col; y.lineWidth = i === 1 ? 2.6 : 2; y.beginPath(); for (let a = 0; a <= 22; a++) y.lineTo(1 + a, b + Math.sin(a * 0.6 + i) * 2.4); y.stroke(); }); break;
      case 'boomer': crescent(12, 14, 10, -2.7, -0.4, 2.6, lt); crescent(12, 14, 8, -2.6, -0.5, 1.2, col); circ(12, 14, 1.6, W); break;
      case 'jump': poly([[12, 1], [20, 10], [4, 10]], lt); P(9.8, 10, 4.4, 7.5, lt); poly([[2, 19], [22, 19], [22, 22.5], [2, 22.5]], col); ln(4.5, 17, 1, 21.5, mid, 1.5); ln(19.5, 17, 23, 21.5, mid, 1.5); break;
      case 'beam': ln(1, 22, 23, 2, rgba(col, 0.85), 7); ln(1, 22, 23, 2, lt, 3.6); ln(1, 22, 23, 2, W, 1.4); circ(2.5, 20.5, 3.5, lt); circ(2.5, 20.5, 1.8, W); break;
      case 'breath': poly([[2, 12], [23, 1.5], [23, 22.5]], col); poly([[2, 12], [23, 6], [23, 18]], lt); poly([[2, 12], [23, 10], [23, 14]], W); circ(3.5, 12, 3, W); break;
      case 'aura': y.globalAlpha = 0.45; circ(12, 12, 10.5, col); y.globalAlpha = 1; arc(12, 12, 10.5, 0, 7, lt, 1.6); arc(12, 12, 6.5, 0, 7, col, 1.6); circ(12, 12, 3, lt); circ(12, 12, 1.5, W); break;
      case 'dance': y.strokeStyle = lt; y.lineWidth = 2.4; y.beginPath(); for (let a = 0; a <= 21; a++) y.lineTo(1.5 + a, 12 + Math.sin(a * 0.5) * 7.5); y.stroke(); y.strokeStyle = col; y.lineWidth = 1.8; y.beginPath(); for (let a = 0; a <= 21; a++) y.lineTo(1.5 + a, 12 - Math.sin(a * 0.5) * 5.5); y.stroke(); break;
      case 'paw': circ(12, 15.5, 5.5, lt); [[5.5, 9], [9.8, 5.5], [14.2, 5.5], [18.5, 9]].forEach(([a, b]) => circ(a, b, 2.5, lt)); circ(12, 15.5, 2.8, col); break;
      case 'revive': arc(12, 6.5, 4.2, 0, 7, '#FFD27A', 2.6); P(10.7, 10, 2.6, 13, '#FFD27A'); P(5.5, 13, 13, 2.6, '#FFD27A'); P(11.5, 10, 1, 12, W); break;
      case 'infuse': poly([[12, 0.5], [15.2, 8.8], [23.5, 12], [15.2, 15.2], [12, 23.5], [8.8, 15.2], [0.5, 12], [8.8, 8.8]], lt); circ(12, 12, 3.2, col); circ(12, 12, 1.4, W); break;
      case 'trap': P(1.5, 17, 21, 3.5, '#8A8A96'); for (let i = 0; i < 6; i++) poly([[2.5 + i * 3.3, 17], [4.15 + i * 3.3, 7], [5.8 + i * 3.3, 17]], '#E8E8F0'); break;
      case 'frost': [0, 1, 2].forEach(i => { const a = i * Math.PI / 3; ln(12 - Math.cos(a) * 10.5, 12 - Math.sin(a) * 10.5, 12 + Math.cos(a) * 10.5, 12 + Math.sin(a) * 10.5, '#CFF0FF', 2.6); [-1, 1].forEach(sg => { const ex = 12 + Math.cos(a) * 7 * sg, ey = 12 + Math.sin(a) * 7 * sg; ln(ex, ey, ex + Math.cos(a + 2.2 * sg) * 2.5, ey + Math.sin(a + 2.2 * sg) * 2.5, '#CFF0FF', 1.4); ln(ex, ey, ex + Math.cos(a - 2.2 * sg) * 2.5, ey + Math.sin(a - 2.2 * sg) * 2.5, '#CFF0FF', 1.4); }); }); circ(12, 12, 2.8, W); break;
      case 'fist': y.fillStyle = lt; rr(y, 4, 5, 16, 14, 4.5); y.fill(); P(7, 18, 10, 4.5, col); [8, 12, 16].forEach(a => ln(a, 6, a, 12.5, dk, 1.2)); [6, 10, 14, 18].forEach(a => circ(a, 7.2, 1.3, W)); poly([[4, 13], [15, 12.5], [15.5, 16], [5, 17.5]], col); [9, 13, 17].forEach(b => ln(0, b, 3, b, mid, 1.3)); break;
      case 'palm': poly([[7, 20], [5, 12], [7, 6], [12, 4], [17, 6], [19, 12], [17, 20], [12, 18]], lt); poly([[8, 18], [7, 12], [9, 8], [12, 6], [15, 8], [17, 12], [16, 18], [12, 16]], col); circ(12, 12, 2.6, W); arc(12, 12, 7.5, -2.2, -0.6, mid, 1.5); arc(12, 12, 10, -2.0, -0.8, lt, 1.2); break;
      case 'qi': for (let i = 0; i < 3; i++) arc(12, 12, 3 + i * 2.9, i * 1.4, i * 1.4 + 4.2, i === 1 ? lt : col, 2.2); circ(12, 12, 3, W); circ(12, 12, 1.3, col); [0, 2, 4].forEach(i => { const a = i * Math.PI / 3; circ(12 + Math.cos(a) * 9.5, 12 + Math.sin(a) * 9.5, 1.4, lt); }); break;
      case 'kick': poly([[4, 16], [8, 8], [12, 6], [14, 10], [10, 14]], lt); poly([[10, 12], [14, 8], [20, 6], [22, 9], [18, 12], [12, 14]], col); poly([[18, 8], [23, 5], [23, 10], [20, 11]], lt); arc(8, 18, 4.5, -0.5, 2.2, mid, 1.6); break;
      case 'pole': ln(3, 21, 21, 3, mix(base, '#8A6A44', 0.4), 3.2); ln(3, 21, 21, 3, lt, 1.4); circ(3, 21, 2.4, col); circ(21, 3, 2.4, col); circ(12, 12, 1.7, W); break;
      default: star(12, 12, 10, lt); star(12, 12, 5.5, col); circ(12, 12, 1.8, W);
    }
    // 光澤：上亮下暗
    y.setTransform(1, 0, 0, 1, 0, 0); y.globalCompositeOperation = 'source-atop';
    const gl = y.createLinearGradient(0, 0, N * 0.6, N); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,.18)');
    y.fillStyle = gl; y.fillRect(0, 0, N, N); y.globalCompositeOperation = 'source-over';
    return g;
  };

  // ---------- 角落的小圓章 ----------
  const BADGE_COL = { burn: '#FF6A1A', frost: '#5FC0FF', shock: '#FFD84A', stun: '#FFD84A', curse: '#9A4ACF', vamp: '#E8203A', root: '#5AB04A', crit: '#FFE07A', ghost: '#B8C0E0', taunt: '#FF6A4A', pierce: '#D8D0C0' };
  const badge = (x, k, a, b) => {
    const r = 11, c = BADGE_COL[k] || '#FFFFFF';
    x.save(); const g = x.createRadialGradient(a - 3, b - 3, 1, a, b, r); g.addColorStop(0, mix(c, '#FFFFFF', 0.6)); g.addColorStop(0.6, c); g.addColorStop(1, mix(c, '#000000', 0.55));
    x.fillStyle = g; x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 4; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); x.shadowBlur = 0;
    x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 1.5; x.stroke();
    x.fillStyle = '#FFFFFF'; x.strokeStyle = '#FFFFFF'; x.lineWidth = 2; x.lineCap = 'round';
    const s = 1.4;
    if (k === 'burn') { x.beginPath(); x.moveTo(a, b - 7 * s / 1.4); x.quadraticCurveTo(a + 6, b, a, b + 6); x.quadraticCurveTo(a - 6, b, a, b - 7); x.fill(); }
    else if (k === 'frost') [0, 1, 2].forEach(i => { const t = i * Math.PI / 3; x.beginPath(); x.moveTo(a - Math.cos(t) * 6, b - Math.sin(t) * 6); x.lineTo(a + Math.cos(t) * 6, b + Math.sin(t) * 6); x.stroke(); });
    else if (k === 'shock' || k === 'stun') { x.beginPath(); [[1.5, -7], [-4, 1], [0, 1], [-1.5, 7], [4.5, -1.5], [0.5, -1.5]].forEach(([u, v], i) => (i ? x.lineTo(a + u, b + v) : x.moveTo(a + u, b + v))); x.closePath(); x.fill(); }
    else if (k === 'vamp') { x.beginPath(); x.moveTo(a, b - 7); x.lineTo(a + 4.5, b + 1); x.arc(a, b + 2, 4.5, 0, Math.PI); x.closePath(); x.fill(); }
    else if (k === 'crit') { x.beginPath(); for (let i = 0; i < 8; i++) { const t = -Math.PI / 2 + i * Math.PI / 4, q = i % 2 ? 2.2 : 7; x.lineTo(a + Math.cos(t) * q, b + Math.sin(t) * q); } x.closePath(); x.fill(); }
    else if (k === 'curse') { x.beginPath(); x.ellipse(a, b, 6, 3.6, 0, 0, 7); x.fill(); x.fillStyle = mix(c, '#000000', 0.4); x.beginPath(); x.arc(a, b, 2, 0, 7); x.fill(); }
    else if (k === 'root') { x.beginPath(); x.moveTo(a - 6, b + 6); x.quadraticCurveTo(a - 1, b - 2, a + 6, b - 5); x.stroke(); x.beginPath(); x.arc(a + 2, b - 2, 2.2, 0, 7); x.fill(); }
    else if (k === 'pierce') { x.beginPath(); x.moveTo(a - 6, b + 6); x.lineTo(a + 5, b - 5); x.stroke(); x.beginPath(); x.moveTo(a + 7, b - 7); x.lineTo(a + 1, b - 5); x.lineTo(a + 5, b - 1); x.fill(); }
    else if (k === 'ghost') { x.beginPath(); x.arc(a, b - 1, 5, Math.PI, 0); x.lineTo(a + 5, b + 6); x.lineTo(a, b + 3); x.lineTo(a - 5, b + 6); x.closePath(); x.fill(); }
    else if (k === 'taunt') { x.fillRect(a - 1.3, b - 7, 2.6, 9); x.fillRect(a - 1.3, b + 4, 2.6, 2.6); }
    x.restore();
  };

  // ---------- 整張 ----------
  const draw = o => {
    const c = cv(), x = c.getContext('2d'), rnd = rng(hash(o.key));
    const base = vivid(KIND_COL[o.kind] || o.color), bright = mix(base, '#FFFFFF', 0.55);
    x.save(); rr(x, 0, 0, N, N, 13); x.clip();
    // 底：放射漸層
    const fx = N * (0.42 + rnd() * 0.16), fy = N * (0.36 + rnd() * 0.18);
    let g = x.createRadialGradient(fx, fy, 1, N / 2, N / 2, N * 0.78);
    g.addColorStop(0, mix(base, '#FFFFFF', 0.42)); g.addColorStop(0.2, mix(base, '#FFFFFF', 0.08)); g.addColorStop(0.5, mix(base, '#000000', 0.18)); g.addColorStop(0.8, mix(base, '#000000', 0.66)); g.addColorStop(1, mix(base, '#05030A', 0.92));
    x.fillStyle = g; x.fillRect(0, 0, N, N);
    x.globalCompositeOperation = 'lighter';
    // 光芒
    const nr = 7 + Math.floor(rnd() * 5);
    for (let i = 0; i < nr; i++) {
      const a = rnd() * Math.PI * 2, w = 0.04 + rnd() * 0.12, L = N * (0.7 + rnd() * 0.5);
      const rg = x.createRadialGradient(fx, fy, 0, fx, fy, L); rg.addColorStop(0, rgba(bright, 0.26)); rg.addColorStop(1, rgba(bright, 0));
      x.fillStyle = rg; x.globalAlpha = 0.35 + rnd() * 0.5; x.beginPath(); x.moveTo(fx, fy); x.arc(fx, fy, L, a - w, a + w); x.closePath(); x.fill();
    }
    x.globalAlpha = 1;
    // 能量弧線
    const na = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < na; i++) {
      const r = N * (0.28 + rnd() * 0.22), a0 = rnd() * Math.PI * 2, sw = 1.2 + rnd() * 1.6, wdt = 2 + rnd() * 5;
      const p0 = [N / 2 + Math.cos(a0) * r, N / 2 + Math.sin(a0) * r], p1 = [N / 2 + Math.cos(a0 + sw) * r, N / 2 + Math.sin(a0 + sw) * r];
      const lg = x.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); lg.addColorStop(0, rgba(bright, 0)); lg.addColorStop(0.6, rgba(bright, 0.75)); lg.addColorStop(1, rgba('#FFFFFF', 0.95));
      x.strokeStyle = lg; x.lineWidth = wdt; x.lineCap = 'round'; x.beginPath(); x.arc(N / 2, N / 2, r, a0, a0 + sw); x.stroke();
      x.lineWidth = Math.max(1, wdt * 0.3); x.strokeStyle = rgba('#FFFFFF', 0.6); x.beginPath(); x.arc(N / 2, N / 2, r, a0 + sw * 0.5, a0 + sw); x.stroke();
    }
    // 光點
    for (let i = 0; i < 16; i++) { const px = rnd() * N, py = rnd() * N, rad = 0.6 + rnd() * 1.6; x.fillStyle = rgba(i % 3 ? bright : '#FFFFFF', 0.5 + rnd() * 0.5); x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill(); }
    for (let i = 0; i < 3; i++) { const px = N * (0.1 + rnd() * 0.8), py = N * (0.1 + rnd() * 0.8), s = 3 + rnd() * 4; x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.moveTo(px, py - s); x.lineTo(px + s * 0.22, py - s * 0.22); x.lineTo(px + s, py); x.lineTo(px + s * 0.22, py + s * 0.22); x.lineTo(px, py + s); x.lineTo(px - s * 0.22, py + s * 0.22); x.lineTo(px - s, py); x.lineTo(px - s * 0.22, py - s * 0.22); x.closePath(); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    // 主題：陰影 → 光暈 → 本體
    const m = motif(o, base);
    // 會動的招（箭、子彈、刺、衝刺、火球、隕石……）：後面拖一道殘影
    const TRAIL = { arrow: [-1, 1], shot: [-1, 1], thrust: [-1, 1], beam: [-1, 1], fireball: [-1, 1], meteor: [-1, -1], dash: [-1, 0], kick: [-1, 0.4], fist: [-1, 0.3], slash: [-0.7, 0.7], xslash: [0, 1], slashwave: [-0.7, 0.7], boomer: [-1, 0], orb: [-1, 1], note: [-1, 0.5], snipe: [0, 0] }[o.kind];
    if (TRAIL && (TRAIL[0] || TRAIL[1])) { x.save(); x.globalCompositeOperation = 'lighter'; for (let i = 4; i >= 1; i--) { x.globalAlpha = 0.09 * (5 - i); x.drawImage(m, TRAIL[0] * i * 4, TRAIL[1] * i * 4); } x.restore(); }
    x.save(); x.globalCompositeOperation = 'lighter'; x.shadowColor = base; x.shadowBlur = 20; x.globalAlpha = 0.45; x.drawImage(m, 0, 0); x.restore();
    x.save(); x.shadowColor = 'rgba(0,0,0,.85)'; x.shadowBlur = 5; x.drawImage(m, 0, 0); x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 10; x.shadowOffsetX = 2; x.shadowOffsetY = 3; x.drawImage(m, 0, 0); x.restore();
    x.save(); x.globalCompositeOperation = 'lighter'; x.shadowColor = bright; x.shadowBlur = 6; x.globalAlpha = 0.25; x.drawImage(m, 0, 0); x.restore();
    x.drawImage(m, 0, 0);
    // 四周壓暗
    g = x.createRadialGradient(N / 2, N / 2, N * 0.32, N / 2, N / 2, N * 0.74); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = g; x.fillRect(0, 0, N, N);
    // 段數：上緣發光的小菱形
    if (o.n > 1) for (let i = 0; i < o.n; i++) { const px = N / 2 + (i - (o.n - 1) / 2) * 11, py = 9; x.save(); x.shadowColor = '#FFE8A0'; x.shadowBlur = 6; x.fillStyle = '#FFF2C0'; x.beginPath(); x.moveTo(px, py - 4); x.lineTo(px + 3.5, py); x.lineTo(px, py + 4); x.lineTo(px - 3.5, py); x.closePath(); x.fill(); x.restore(); }
    // 徽章
    [[N - 14, N - 14], [14, N - 14]].forEach(([a, b], i) => { const k = o.badges[i]; if (k) badge(x, k, a, b); });
    x.restore();
    // 外框
    rr(x, 1, 1, N - 2, N - 2, 12.5); x.lineWidth = 3; x.strokeStyle = 'rgba(8,6,12,.9)'; x.stroke();
    const fc = o.tier === 'aw' ? ['#FFF2B0', '#E8B83A', '#8A5A10'] : o.tier === 'sp' ? ['#F0D8FF', '#B07AFF', '#4A2A8A'] : o.tier === 'adv' ? ['#FFFFFF', '#B8C4D4', '#5A6270'] : [mix(base, '#FFFFFF', 0.7), mix(base, '#FFFFFF', 0.15), mix(base, '#000000', 0.5)];
    g = x.createLinearGradient(0, 0, N, N); g.addColorStop(0, fc[0]); g.addColorStop(0.45, fc[1]); g.addColorStop(1, fc[2]);
    rr(x, 2.5, 2.5, N - 5, N - 5, 11); x.lineWidth = o.tier ? 2.6 : 1.6; x.strokeStyle = g; x.stroke();
    if (o.tier === 'aw') { x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = '#FFF6D0'; const px = N - 13, py = 13, s = 7; x.beginPath(); x.moveTo(px, py - s); x.lineTo(px + 1.6, py - 1.6); x.lineTo(px + s, py); x.lineTo(px + 1.6, py + 1.6); x.lineTo(px, py + s); x.lineTo(px - 1.6, py + 1.6); x.lineTo(px - s, py); x.lineTo(px - 1.6, py - 1.6); x.closePath(); x.fill(); x.restore(); }
    return c.toDataURL();
  };

  const info = R.skillIconInfo; if (!info) return;
  R.skillIconURL = id => { if (!id) return ''; const o = info(id); return cache[o.key] || (cache[o.key] = draw(o)); };
  // 顯示的地方不要再用像素放大（會鋸齒）；手機的技能鈕也放圖示
  const css = document.createElement('style');
  css.textContent = '#r-br .h2-ic,.h2-badge .h2-core img,.tu-sk img,.tu-n img,.tu-big img,.sb-card .sb-ico{image-rendering:auto!important;border-radius:9px}'
    + '#r-br .h2-ic{filter:none!important}'
    // 手機：技能鈕的圖示當底（圓的），名字壓在上面；不能放的時候暗一點；還沒開的格子不放
    + 'body.touch #r-br .act .h2-ic{display:block!important;position:absolute;left:3px;top:3px;width:calc(100% - 6px);height:calc(100% - 6px);transform:none;border-radius:50%;object-fit:cover;z-index:0;pointer-events:none;opacity:.5;filter:saturate(.7)!important}'
    + 'body.touch #r-br .act.lit .h2-ic{opacity:1;filter:none!important}body.touch #r-br .act.none .h2-ic,body.touch #r-br .act.locked .h2-ic{display:none!important}'
    + 'body.touch #r-br .act > span,body.touch #r-br .act .cd{position:relative;z-index:1}body.touch #r-br .act .cd{position:absolute}body.touch #r-br .act:has(.h2-ic) > span{text-shadow:0 1px 2px #000,0 0 4px #000,0 0 2px #000;color:#fff}';
  document.head.appendChild(css);
})(window.R);
