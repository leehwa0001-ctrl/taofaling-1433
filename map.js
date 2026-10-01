// 討伐令 1433：昭旭聯合王國的地圖（全國、東鶴近郊）
// 全國圖的海岸線與國界來自作者 wiki 的世界地圖模型；東鶴近郊是示意圖，沿用《東鶴初心》的地理。
(function (R) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const f1 = v => v.toFixed(1);
  // 封閉的 Catmull-Rom 曲線 → SVG 路徑
  const smoothPath = pts => {
    const n = pts.length; let d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += 'C' + f1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
    }
    return d + 'Z';
  };
  const openPath = pts => {
    let d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += 'C' + f1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
    }
    return d;
  };
  const polyPath = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  // 海岸線加一點手繪的抖動（只用在昭旭：島國沒有和別人共用的陸界）
  const organic = (loop, seed, amp) => {
    const r = rng(seed), out = [];
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1, nx = -dz / len, nz = dx / len;
      const steps = Math.max(1, Math.round(len / 0.11));
      for (let s = 0; s < steps; s++) { const t = s / steps, j = s === 0 ? 0 : (r() - 0.5) * amp; out.push([a[0] + dx * t + nx * j, a[1] + dz * t + nz * j]); }
    }
    return out;
  };
  const inside = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if (((a[1] > p[1]) !== (b[1] > p[1])) && (p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; };

  // ---------- 圖例用的符號 ----------
  const INK = '#4A3A28', PAPER = '#F4E9CD', SEA = '#C4D6D6', SEALINE = '#7FA0A6', RED = '#B8322A', GREEN = '#3E7A48', GOLD = '#C9A13A';
  const mountain = (x, y, s, snow) => '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s.toFixed(2) + ')"><path d="M-13 8L-1 -12L13 8Z" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.5" stroke-linejoin="round"/>'
    + (snow ? '<path d="M-5.2 -3.6L-1 -12L3.4 -4.8L1 -3.2L-1.6 -5.2Z" fill="#FFFFFF" stroke="' + INK + '" stroke-width=".8"/>' : '')
    + '<path d="M-1 -12L2 -3L0 -1L4 8M3 -5L9 6M5 -1L11 7" fill="none" stroke="' + INK + '" stroke-width=".8" opacity=".75"/></g>';
  const tree = (x, y, s) => '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s.toFixed(2) + ')"><path d="M0 5V9" stroke="' + INK + '" stroke-width="1.2"/><path d="M-5 5C-7 1 -4 -5 0 -6C4 -5 7 1 5 5Z" fill="#9DB08A" stroke="' + INK + '" stroke-width="1"/></g>';
  const volcano = (x, y, s) => '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s.toFixed(2) + ')"><path d="M-16 10L-4 -10H4L16 10Z" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/><path d="M-4 -10H4" stroke="' + RED + '" stroke-width="2.4"/><path d="M-1 -9L-3 0M2 -9L4 2" stroke="' + RED + '" stroke-width="1.2"/>'
    + '<path d="M0 -12C-6 -16 2 -20 -3 -26C3 -24 8 -28 6 -34" fill="none" stroke="#8A7A6A" stroke-width="1.6" stroke-linecap="round" opacity=".8"/></g>';
  const eye = (grade, locked) => { const c = R.GRADE_COLOR[grade] || INK; return '<path d="M-15 0Q0 -12 15 0Q0 12 -15 0Z" fill="' + PAPER + '" stroke="' + c + '" stroke-width="2.4"' + (locked ? ' stroke-dasharray="3 2"' : '') + '/><circle r="5.6" fill="' + c + '"/><circle r="2.2" fill="#1A1410"/><circle cx="1.6" cy="-1.8" r="1" fill="#FFFFFF"/>'; };
  const marker = s => {
    const locked = s.status === 'lock';
    let g = '';
    if (s.kind === 'capital') g = '<circle r="13" fill="' + PAPER + '" stroke="' + RED + '" stroke-width="2"/><circle r="9" fill="' + RED + '"/><path d="M0 -6L1.8 -1.8L6.2 -1.8L2.6 1L4 5.4L0 2.8L-4 5.4L-2.6 1L-6.2 -1.8L-1.8 -1.8Z" fill="' + GOLD + '"/>';
    else if (s.kind === 'city') g = '<circle r="11" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/><circle r="6.5" fill="none" stroke="' + INK + '" stroke-width="1.6"/><circle r="3" fill="' + RED + '"/>';
    else if (s.kind === 'village') g = '<circle r="6" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.8"/><circle r="2" fill="' + INK + '"/>';
    else if (s.kind === 'ruin') g = (locked ? '' : '<circle class="pulse" r="18" fill="none" stroke="' + R.GRADE_COLOR[s.grade] + '" stroke-width="1.5"/>') + eye(s.grade, locked);
    else if (s.kind === 'forbidden') g = '<circle r="46" fill="url(#hatch-red)" stroke="' + RED + '" stroke-width="2" stroke-dasharray="8 5"/><path d="M-11 9L0 -11L11 9Z" fill="' + PAPER + '" stroke="' + RED + '" stroke-width="2.2" stroke-linejoin="round"/><path d="M0 -4V3M0 5.6V6.4" stroke="' + RED + '" stroke-width="2.4" stroke-linecap="round"/>';
    return g;
  };

  // ---------- 全國地圖 ----------
  const FR = { x0: 30.3, x1: 41.7, z0: -27.2, z1: -17.4 }, K = 100;
  const NX = x => (x - FR.x0) * K, NY = z => (z - FR.z0) * K;
  const NW = (FR.x1 - FR.x0) * K, NH = (FR.z1 - FR.z0) * K;
  R.drawNation = () => {
    const M = R.MAPDATA, zx = M['昭旭聯合王國'];
    const isl = zx.loops.map((l, i) => organic(l, 1433 + i * 7, 0.05).map(p => [NX(p[0]), NY(p[1])]));
    const islD = isl.map(smoothPath).join('');
    const neigh = Object.entries(M).filter(([n]) => n !== '昭旭聯合王國');
    const neighD = neigh.map(([n, v]) => v.loops.map(l => polyPath(l.map(p => [NX(p[0]), NY(p[1])]))).join('')).join('');
    let s = '<svg id="nation-svg" class="map-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + NW + ' ' + NH + '" role="img" aria-label="昭旭聯合王國遺跡分布圖">';
    s += '<defs>'
      + '<pattern id="waves" width="46" height="14" patternUnits="userSpaceOnUse"><path d="M0 7Q5.75 3 11.5 7T23 7T34.5 7T46 7" fill="none" stroke="' + SEALINE + '" stroke-width=".8" opacity=".35"/></pattern>'
      + '<pattern id="hatch-red" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 3.5H7" stroke="' + RED + '" stroke-width="1.1" opacity=".45"/></pattern>'
      + '<pattern id="hatch-ink" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 3H6" stroke="' + INK + '" stroke-width=".7" opacity=".22"/></pattern>'
      + '<clipPath id="zx-clip"><path d="' + islD + '"/></clipPath>'
      + '<filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .18  0 0 0 .09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>'
      + '<radialGradient id="vig" cx="50%" cy="50%" r="70%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#3A2A14" stop-opacity=".28"/></radialGradient>'
      + '</defs>';
    // 海
    s += '<rect width="' + NW + '" height="' + NH + '" fill="' + SEA + '"/><rect width="' + NW + '" height="' + NH + '" fill="url(#waves)"/>';
    // 海岸的等距線（銅版地圖的畫法）
    const all = neighD + islD;
    [[34, .22], [22, .3], [12, .42]].forEach(([d, o]) => { s += '<path d="' + all + '" fill="none" stroke="' + SEALINE + '" stroke-width="' + (2 * d) + '" stroke-linejoin="round" opacity="' + o + '"/><path d="' + all + '" fill="none" stroke="' + SEA + '" stroke-width="' + (2 * d - 2.4) + '" stroke-linejoin="round"/>'; });
    // 鄰國（淡色）
    s += '<path d="' + neighD + '" fill="#E4DAC2" stroke="#E4DAC2" stroke-width="2.5" stroke-linejoin="round"/><path d="' + neighD + '" fill="url(#hatch-ink)"/>';
    s += neigh.map(([n, v]) => v.loops.map(l => '<path d="' + polyPath(l.map(p => [NX(p[0]), NY(p[1])])) + '" fill="none" stroke="#9A8A6E" stroke-width="1.3" stroke-dasharray="7 3 1.5 3"/>').join('')).join('');
    s += '<path d="' + neighD + '" fill="none" stroke="#7A6A50" stroke-width="0" />';
    // 昭旭
    s += '<path d="' + islD + '" fill="' + PAPER + '"/>';
    s += '<g clip-path="url(#zx-clip)"><path d="' + islD + '" fill="none" stroke="' + RED + '" stroke-width="16" opacity=".16"/></g>';
    s += '<path d="' + islD + '" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>';
    // 地形：皇嶺山脈、北州的雪山、納瓦的火山、森林、河
    const main = isl[0], R0 = rng(28), onLand = (x, y) => isl.some(l => inside([x, y], l));
    const ridge = [[35.05, -23.62], [34.98, -23.2], [35.12, -22.82], [34.86, -22.35], [35.05, -21.95], [35.26, -21.5], [35.18, -21.1]];
    let terr = '';
    ridge.forEach((p, i) => { const x = NX(p[0]) + (R0() - 0.5) * 12, y = NY(p[1]) + (R0() - 0.5) * 10; terr += mountain(x, y, 1.1 + (i === 3 ? 0.55 : R0() * 0.4), false); });
    [[35.7, -25.62], [36.05, -25.3], [37.35, -24.95], [37.5, -24.35]].forEach(p => { terr += mountain(NX(p[0]), NY(p[1]), 0.95 + R0() * 0.3, true); });
    terr += volcano(NX(37.72), NY(-20.62), 1.25);
    const forests = [[34.45, -22.9, 5], [35.55, -21.05, 6], [36.62, -23.72, 4], [35.6, -23.95, 4], [37.05, -24.45, 3]];
    forests.forEach(([x, z, n]) => { for (let i = 0; i < n; i++) { const tx = NX(x) + (R0() - 0.5) * 46, ty = NY(z) + (R0() - 0.5) * 30; if (onLand(tx, ty)) terr += tree(tx, ty, 0.9 + R0() * 0.4); } });
    const rivers = [[[35.0, -22.95], [34.72, -22.8], [34.5, -22.72], [34.3, -22.62]], [[35.18, -22.05], [35.55, -22.12], [35.9, -22.2], [36.22, -22.3]], [[35.22, -21.35], [35.55, -21.25], [35.85, -21.15], [36.35, -21.1]]];
    rivers.forEach(rv => { terr += '<path d="' + openPath(rv.map(p => [NX(p[0]), NY(p[1])])) + '" fill="none" stroke="#5E8FA8" stroke-width="2.2" stroke-linecap="round"/>'; });
    s += '<g class="terrain">' + terr + '</g>';
    // 道路與航路
    const road = pts => '<path d="' + openPath(pts.map(p => [NX(p[0]), NY(p[1])])) + '" fill="none" stroke="#8A5A32" stroke-width="2.2" stroke-dasharray="7 4" stroke-linecap="round"/>';
    const sea = pts => '<path d="' + openPath(pts.map(p => [NX(p[0]), NY(p[1])])) + '" fill="none" stroke="#3E6A7A" stroke-width="1.6" stroke-dasharray="2 5" stroke-linecap="round"/>';
    s += road([[35.98, -22.3], [35.62, -22.45], [35.3, -22.52], [35.02, -22.5]]) + road([[35.02, -22.5], [34.7, -22.1], [34.28, -21.72]]) + road([[35.02, -22.5], [35.2, -23.0], [35.36, -23.52]]) + road([[35.98, -22.3], [35.95, -21.6], [35.8, -21.05], [35.72, -20.72]]);
    s += sea([[36.3, -22.62], [36.55, -23.4], [36.4, -24.6], [36.05, -25.05]]) + sea([[36.3, -22.1], [36.9, -21.6], [37.4, -20.95]]) + sea([[36.35, -22.3], [37.4, -22.5], [38.55, -22.6]]);
    // 島名
    s += R.ISLANDS.map(i => '<text x="' + f1(NX(i.x)) + '" y="' + f1(NY(i.z)) + '" class="island-name' + (i.onLand ? ' on-land' : '') + '">' + esc(i.name) + '</text>').join('');
    // 國名（直書，放在東邊的海上）
    s += '<text x="' + NX(39.55) + '" y="' + NY(-24.35) + '" class="nation-name" writing-mode="tb">昭旭聯合王國</text>';
    // 鄰國名稱
    s += neigh.map(([n, v]) => { let x = NX(v.c[0]), y = NY(v.c[1]); x = Math.max(60, Math.min(NW - 60, x)); y = Math.max(24, Math.min(NH - 14, y)); return '<text x="' + f1(x) + '" y="' + f1(y) + '" class="neigh-name">' + esc(n) + '</text>'; }).join('');
    // 地點
    s += R.SITES.filter(x => x.map === 'nation').map(x => '<g class="site k-' + x.kind + (x.status === 'lock' ? ' locked' : '') + '" data-site="' + x.id + '" transform="translate(' + f1(NX(x.x)) + ' ' + f1(NY(x.z)) + ')" tabindex="0" role="button" aria-label="' + esc(x.name) + '"><g class="mk">' + marker(x) + '</g>'
      + '<text class="site-name" y="' + (x.kind === 'forbidden' ? 62 : x.kind === 'capital' ? 30 : 28) + '">' + esc(x.name) + '</text></g>').join('');
    s += '<rect width="' + NW + '" height="' + NH + '" fill="url(#vig)" pointer-events="none"/><rect width="' + NW + '" height="' + NH + '" filter="url(#paper)" pointer-events="none"/>';
    return s + '</svg>';
  };

  // ---------- 東鶴近郊（示意圖） ----------
  R.drawDonghe = () => {
    const Z = 10, P = (x, y) => [x * Z, y * Z];
    let s = '<svg id="donghe-svg" class="map-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" role="img" aria-label="東鶴近郊">';
    s += '<defs><pattern id="field" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 5H10" stroke="#8A9A6A" stroke-width="1" opacity=".6"/></pattern>'
      + '<filter id="paper2" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .18  0 0 0 .09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>'
      + '<pattern id="hatch-red2" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 3.5H7" stroke="' + RED + '" stroke-width="1.1" opacity=".5"/></pattern></defs>';
    s += '<rect width="1000" height="1000" fill="#EFE3C4"/>';
    // 北山與矮丘
    const R1 = rng(5);
    for (let i = 0; i < 16; i++) s += mountain(420 + i * 38 + (R1() - 0.5) * 16, 60 + (R1() - 0.5) * 40, 1.2 + R1() * 0.6, true);
    for (let i = 0; i < 9; i++) s += '<path d="M' + (180 + i * 34) + ' ' + (190 + (R1() - 0.5) * 30) + 'q18 -26 36 0" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.6"/>';
    s += '<text x="330" y="245" class="area-name">矮丘</text><text x="610" y="130" class="area-name">北山</text>';
    // 霜溪（由西往東）與紅樁子保育區
    const stream = [[0, 272], [120, 262], [250, 280], [380, 262], [500, 258], [620, 244], [760, 232], [880, 226], [1000, 214]];
    s += '<path d="' + openPath(stream) + '" fill="none" stroke="#7FA8C0" stroke-width="16" stroke-linecap="round" opacity=".75"/><path d="' + openPath(stream) + '" fill="none" stroke="#5E8FA8" stroke-width="2"/>';
    s += '<path d="M318 266L340 262" stroke="#DDEFFA" stroke-width="12" stroke-linecap="round"/><text x="300" y="300" class="note-name">薄冰</text>';
    [[455, 262, 38], [620, 246, 44]].forEach(([x, y, r]) => { s += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#hatch-red2)" stroke="' + RED + '" stroke-width="2" stroke-dasharray="4 4"/>'; });
    s += '<text x="540" y="318" class="area-name small">霜溪・紅樁子保育區</text>';
    // 西河岸（南北向的河）與橋
    s += '<path d="M330 300C340 420 318 560 336 700S330 900 340 1000" fill="none" stroke="#7FA8C0" stroke-width="44" opacity=".8"/><path d="M330 300C340 420 318 560 336 700S330 900 340 1000" fill="none" stroke="#5E8FA8" stroke-width="2"/>';
    s += '<text x="262" y="860" class="area-name small" writing-mode="tb">西河岸</text>';
    s += '<rect x="298" y="392" width="72" height="14" fill="#8A6A44" stroke="' + INK + '" stroke-width="1.4"/><text x="334" y="385" class="note-name">北橋</text>';
    s += '<rect x="298" y="612" width="72" height="14" fill="#8A6A44" stroke="' + INK + '" stroke-width="1.4"/><path d="M320 606l28 26M348 606l-28 26" stroke="' + RED + '" stroke-width="3"/><text x="334" y="655" class="note-name">西橋（整修，封路）</text>';
    // 東鶴：城牆、北門、北渠、街道
    s += '<rect x="420" y="440" width="360" height="400" fill="#E6D8B6" stroke="' + INK + '" stroke-width="3"/>';
    for (let x = 460; x < 780; x += 50) s += '<path d="M' + x + ' 440V840" stroke="#B8A47E" stroke-width="1.2"/>';
    for (let y = 480; y < 840; y += 50) s += '<path d="M420 ' + y + 'H780" stroke="#B8A47E" stroke-width="1.2"/>';
    s += '<path d="M420 520H780" stroke="#5E8FA8" stroke-width="7"/><text x="772" y="512" class="note-name end">北渠</text>';
    s += '<path d="M600 440V840M420 660H780" stroke="#8A6A44" stroke-width="5"/><rect x="578" y="428" width="44" height="22" fill="' + INK + '"/><text x="600" y="418" class="note-name">北門</text>';
    s += '<rect x="570" y="582" width="60" height="30" fill="#9C978D" stroke="' + INK + '" stroke-width="1.5"/><path d="M586 582V560M614 582V560" stroke="' + INK + '" stroke-width="1.5"/><path d="M586 560h14v8h-14zM614 560h14v8h-14z" fill="' + GREEN + '"/>';
    s += '<text x="600" y="636" class="note-name">公會東鶴分館</text>';
    // 道路：大路、崙腳、往城西遺跡、往北山礦坑
    const road = pts => '<path d="' + openPath(pts) + '" fill="none" stroke="#8A5A32" stroke-width="3" stroke-dasharray="9 5" stroke-linecap="round"/>';
    s += road([[600, 440], [650, 330], [620, 220], [520, 150], [380, 110], [210, 95]]) + '<text x="690" y="350" class="note-name">大路</text>';
    s += road([[430, 470], [390, 380], [340, 300], [325, 262], [330, 190], [220, 100]]) + '<text x="398" y="330" class="note-name">崙腳</text>';
    s += road([[334, 399], [260, 420], [175, 440]]) + road([[650, 330], [600, 200], [580, 110]]);
    // 北郊的田
    s += '<rect x="790" y="300" width="130" height="80" fill="url(#field)" stroke="#8A9A6A" stroke-width="1.5"/>';
    // 湯山村的溫泉
    s += '<ellipse cx="200" cy="110" rx="26" ry="14" fill="#9CC3C8" stroke="' + INK + '" stroke-width="1.4"/><path d="M188 96q-6 -12 2 -20M204 94q-6 -12 2 -20" fill="none" stroke="#8A7A6A" stroke-width="1.6" stroke-linecap="round"/>';
    // 地點
    s += R.SITES.filter(x => x.map === 'donghe').map(x => { const [px, py] = P(x.x, x.y); return '<g class="site k-' + x.kind + (x.status === 'lock' ? ' locked' : '') + '" data-site="' + x.id + '" transform="translate(' + px + ' ' + py + ')" tabindex="0" role="button" aria-label="' + esc(x.name) + '"><g class="mk">' + marker(x) + '</g><text class="site-name" y="30">' + esc(x.name) + '</text></g>'; }).join('');
    s += '<rect width="1000" height="1000" filter="url(#paper2)" pointer-events="none"/>';
    return s + '</svg>';
  };

  // ---------- 拖曳、縮放 ----------
  R.panZoom = (svg, onPick) => {
    const vb0 = svg.viewBox.baseVal, W0 = vb0.width, H0 = vb0.height;
    const v = { x: 0, y: 0, w: W0, h: H0 };
    const apply = () => { v.w = Math.min(W0, Math.max(W0 / 5, v.w)); v.h = v.w * H0 / W0; v.x = Math.max(-W0 * 0.1, Math.min(W0 * 1.1 - v.w, v.x)); v.y = Math.max(-H0 * 0.1, Math.min(H0 * 1.1 - v.h, v.y)); svg.setAttribute('viewBox', v.x.toFixed(1) + ' ' + v.y.toFixed(1) + ' ' + v.w.toFixed(1) + ' ' + v.h.toFixed(1)); };
    const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(), sc = Math.max(v.w / r.width, v.h / r.height), ox = (r.width * sc - v.w) / 2, oy = (r.height * sc - v.h) / 2; return [v.x + (cx - r.left) * sc - ox, v.y + (cy - r.top) * sc - oy]; };
    const zoomAt = (cx, cy, f) => { const [px, py] = toSvg(cx, cy); const nw = Math.min(W0, Math.max(W0 / 5, v.w * f)), k = nw / v.w; v.x = px - (px - v.x) * k; v.y = py - (py - v.y) * k; v.w = nw; apply(); };
    svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    const pts = new Map(); let moved = 0, pinch = 0;
    svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    svg.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId), now = [e.clientX, e.clientY]; pts.set(e.pointerId, now);
      if (pts.size === 1) { const r = svg.getBoundingClientRect(), sc = Math.max(v.w / r.width, v.h / r.height); v.x -= (now[0] - prev[0]) * sc; v.y -= (now[1] - prev[1]) * sc; moved += Math.abs(now[0] - prev[0]) + Math.abs(now[1] - prev[1]); apply(); }
      else if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch / d); pinch = d; moved = 99; }
    });
    const up = e => {
      const was = pts.has(e.pointerId); pts.delete(e.pointerId); if (pts.size < 2) pinch = 0;
      if (was && moved < 6 && e.type === 'pointerup') { const el = document.elementFromPoint(e.clientX, e.clientY), site = el && el.closest ? el.closest('[data-site]') : null; if (site) onPick(site.dataset.site); }
    };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('keydown', e => { const site = e.target.closest && e.target.closest('[data-site]'); if (site && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(site.dataset.site); } });
    return { zoom: f => { const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }, reset: () => { v.x = 0; v.y = 0; v.w = W0; apply(); }, focus: (x, y, w) => { v.w = w; v.x = x - w / 2; v.y = y - v.w * H0 / W0 / 2; apply(); } };
  };
  R.nationXY = s => [NX(s.x), NY(s.z)];
})(window.R);
