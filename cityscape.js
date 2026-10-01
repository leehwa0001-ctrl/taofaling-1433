// 討伐令 1433：東鶴的街景（3D）——地面、水、橋、道路、標線、斑馬線、紅綠燈、天橋、路燈、電線桿、行道樹、護欄、販賣機、電話亭……
// 照 city.js 的資料蓋。地面不是一張大貼圖，而是一塊一塊的路面（點陣材質照世界座標貼），城市放大也不吃記憶體。
// 合併繪製（R.Batch）會照位置分區塊，畫面外的區塊不畫。
(function (R) {
  R.buildCityscape = api => {
    const { group, lam, SB, HB, G3, block, inter, talk, tw, E, lampPost, vending, bike, sign } = api;
    const TH = THREE, C = R.CITY, S = C.S, WX = C.WX, WZ = C.WZ, HALF = C.HALF;
    let seed = 515; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const GB = R.Batch();
    const M = {
      field: lam('#DCE0D4', { tex: 'ground' }), furrow: lam('#B4AA94', { tex: 0 }),
      asphalt: lam('#55575D', { tex: 'asphalt' }), walk: lam('#B0ACA4', { tex: 'paving' }), curb: lam('#D2CEC6', { tex: 'cap' }),
      old: lam('#A49C8E', { tex: 'stone' }), olane: lam('#ACA494', { tex: 'stone' }), arcade: lam('#C4B094', { tex: 'paving' }), dirt: lam('#A08A72', { tex: 'gravel' }),
      white: lam('#ECE8DC', { tex: 0 }), yellow: lam('#E8B83A', { tex: 0 }), snowbank: lam('#F2F6F8', { tex: 'ground' }),
      water: lam('#5A88A0', { tex: 0 }), ice: lam('#DDEBF0', { tex: 'ground' }), bank: lam('#8C8A82', { tex: 'cap' }),
      ballast: lam('#8E8A84', { tex: 'gravel' }), sleeper: lam('#5A4A3C', { tex: 'planks' }), plaza: lam('#BDB7AB', { tex: 'paving' }), square: lam('#A69E8E', { tex: 'stone' }),
      grass: lam('#D0DACA', { tex: 'ground' }), soil: lam('#8A7A62', { tex: 'gravel' }), yard: lam('#CBBF9F', { tex: 'gravel' }), deck: lam('#3E3E46', { tex: 'planks' }),
      metal: lam('#3A3C42', { tex: 0 }), pole: lam('#6A6A70', { tex: 0 }), wire: lam('#1E1A18', { tex: 0 }), rail: lam('#E8E8EC', { tex: 0 }), orange: lam('#E8803A', { tex: 0 }), red: lam('#C8323A', { tex: 0 })
    };
    const ang = (ax, ay, bx, by) => Math.atan2(WZ(by) - WZ(ay), WX(bx) - WX(ax));
    // 平的長條：沿著折線、寬 w 公尺、高度 y（每一段一個薄盒子；round：轉角補一個圓）
    const strip = (pts, w, mat, y, round) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const ax = WX(pts[i][0]), az = WZ(pts[i][1]), bx = WX(pts[i + 1][0]), bz = WZ(pts[i + 1][1]), L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue;
        GB.add(G3.box, mat, (ax + bx) / 2, y, (az + bz) / 2, L, 0.02, w, 0, -Math.atan2(bz - az, bx - ax), 0);
      }
      if (round) pts.forEach((p, i) => { if (round === 'all' || (i > 0 && i < pts.length - 1)) GB.add(G3.cyl, mat, WX(p[0]), y, WZ(p[1]), w, 0.02, w); });
    };
    const rectG = (r, mat, y) => GB.add(G3.box, mat, WX((r[0] + r[2]) / 2), y, WZ((r[1] + r[3]) / 2), (r[2] - r[0]) * S, 0.02, (r[3] - r[1]) * S);
    // 沿著折線每隔 step 單位做一件事（cb(x, y, ux, uy, 第幾個)），x、y 是示意圖座標
    const along = (pts, step, start, cb) => { let k = 0, acc = start || 0; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay); if (L < 0.01) continue; const ux = (bx - ax) / L, uy = (by - ay) / L; while (acc <= L) { cb(ax + ux * acc, ay + uy * acc, ux, uy, k++); acc += step; } acc -= L; } };
    const nearJ = (x, y, m) => C.junctions.some(J => Math.hypot(J.x - x, J.y - y) < m);
    const jFor = (x, y) => C.junctions.filter(J => Math.hypot(J.x - x, J.y - y) < 40);

    // ---------- 舊城、站前的地面 ----------
    rectG(C.OLD, lam('#CEC8BA', { tex: 'gravel' }), 0.004);
    rectG([252, 258, 800, 386], lam('#C2BEB6', { tex: 'paving' }), 0.004);
    // ---------- 田、空地、公園 ----------
    C.FIELDS.forEach(r => { rectG(r, M.field, 0.008); for (let y = r[1] + 6; y < r[3] - 2; y += 8) GB.add(G3.box, M.furrow, WX((r[0] + r[2]) / 2), 0.012, WZ(y), (r[2] - r[0] - 4) * S, 0.02, 0.28); });
    C.PARKS.forEach(r => rectG(r, M.grass, 0.01));
    { const Z = C.Z; rectG(Z.ruins, M.dirt, 0.01); rectG(Z.school, M.yard, 0.01); rectG(Z.park, M.grass, 0.01); rectG(Z.grove, M.yard, 0.01); rectG(Z.grave, M.yard, 0.01); rectG(Z.market, M.asphalt, 0.012);
      for (let x = Z.market[0] + 8; x < Z.market[2] - 4; x += 11) GB.add(G3.box, M.white, WX(x), 0.024, WZ(Z.market[3] - 12), 0.12, 0.02, 4.4); }
    // 西市口廣場：橢圓的石板，中間一圈花崗岩
    { const [cx, cy, rx, ry] = C.SQUARE; GB.add(G3.cyl, M.square, WX(cx), 0.026, WZ(cy), rx * 2 * S, 0.02, ry * 2 * S);
      const ringM = lam('#8E8676', { tex: 0 }); [0.35, 0.6, 0.85].forEach(k => { for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; GB.add(G3.box, ringM, WX(cx + Math.cos(a) * rx * k), 0.03, WZ(cy + Math.sin(a) * ry * k), 0.5, 0.02, 0.18, 0, -a + Math.PI / 2, 0); } });
      GB.add(G3.cyl, lam('#8A8478', { tex: 'stone' }), WX(cx), 0.034, WZ(cy), 7, 0.02, 6); }
    // 站前廣場：鋪磚、公車和計程車的環道
    { const P0 = C.PLAZA; rectG(P0, M.plaza, 0.02); const lp = [[P0[0] + 14, P0[3] - 12], [P0[2] - 14, P0[3] - 12], [P0[2] - 14, P0[1] + 30], [P0[0] + 14, P0[1] + 30], [P0[0] + 14, P0[3] - 12]]; strip(lp, 6, M.asphalt, 0.024, 'all'); along(lp, 10, 3, (x, y, ux, uy) => GB.add(G3.box, M.white, WX(x), 0.03, WZ(y), Math.abs(ux) > 0.5 ? 2 : 0.12, 0.02, Math.abs(ux) > 0.5 ? 0.12 : 2)); }

    // ---------- 水 ----------
    C.water.forEach(w => { strip(w.pts, (w.w + 5) * S, M.ice, 0.006, 'all'); strip(w.pts, w.w * S, M.water, 0.009, 'all'); if (w.kind === 'canal' || w.kind === 'moat') [-1, 1].forEach(sd => strip(C.offsetLine(w.pts, sd * (w.w / 2 + 1)), 0.5, M.bank, 0.14)); });
    // 水擋住人（橋上可以過）
    const okBridge = (sx, sy) => C.bridges.some(b => b.ok && Math.hypot(b.sx - sx, b.sy - sy) < b.wid / 2 + 2);
    C.water.forEach(w => {
      for (let i = 0; i < w.pts.length - 1; i++) {
        const [ax, ay] = w.pts[i], [bx, by] = w.pts[i + 1], len = Math.hypot(bx - ax, by - ay), n = Math.ceil(len / 4), vert = Math.abs(by - ay) > Math.abs(bx - ax);
        for (let k = 0; k <= n; k++) { const sx = ax + (bx - ax) * k / n, sy = ay + (by - ay) * k / n; if (okBridge(sx, sy)) continue; const x = WX(sx), z = WZ(sy), hw = w.w * S / 2, ht = 3 * S; if (vert) block(x - hw, x + hw, z - ht, z + ht, 'water'); else block(x - ht, x + ht, z - hw, z + hw, 'water'); }
      }
    });
    // 橋：橋面、欄杆；西橋整修中（擋住）
    C.bridges.forEach(b => {
      const x = WX(b.sx), z = WZ(b.sy), len = b.len * S, wid = b.wid * S, gB = R.Batch(); gB.at(x, z, -b.ang);
      const big = b.kind === 'river' || b.kind === 'canal';
      gB.add(G3.box, lam(b.ok ? (big ? '#8A8884' : '#8A6A44') : '#6A4A34', { tex: big ? 'cap' : 'planks' }), 0, 0.15, 0, len, 0.3, wid);
      [-1, 1].forEach(o => { gB.add(G3.box, lam(big ? '#B8B4AC' : '#5A3E26', { tex: big ? 'cap' : 'planks' }), 0, 0.9, o * (wid / 2 - 0.1), len, big ? 0.6 : 0.12, big ? 0.25 : 0.12); if (!big) for (let p = -len / 2; p <= len / 2 + 0.01; p += len / 4) gB.add(G3.box, lam('#5A3E26', { tex: 'planks' }), p, 0.45, o * (wid / 2 - 0.05), 0.18, 0.9, 0.18); });
      if (!b.ok) { gB.add(G3.box, lam('#B8322A', { tex: 0 }), -len / 2 + 0.5, 0.6, 0, 0.3, 1.2, wid); gB.add(G3.box, lam('#B8322A', { tex: 0 }), len / 2 - 0.5, 0.6, 0, 0.3, 1.2, wid); }
      gB.flush(group);
      if (!b.ok) block(x - len / 2, x + len / 2, z - wid / 2, z + wid / 2, 'water');
      if (b.name && big) sign(x + Math.cos(-b.ang) * (len / 2 + 0.6) - Math.sin(-b.ang) * (wid / 2 + 0.4), 1.4, z - Math.sin(-b.ang) * (len / 2 + 0.6) - Math.cos(-b.ang) * (wid / 2 + 0.4), -b.ang, b.name + (b.ok ? '' : '（整修中）'), '#3A3A44', 1.6);
    });

    // ---------- 鐵路的道碴、枕木（軌道、圍籬、平交道在 suburbs.js） ----------
    { const RL = C.RAIL, [b0, b1] = C.BRIDGE;
      [[0, b0], [b1, 1000]].forEach(([x0, x1]) => { rectG([x0, RL.y0, x1, RL.y1], M.ballast, 0.012); RL.t.forEach(ty => { for (let x = x0 + 1; x < x1; x += 2.8) GB.add(G3.box, M.sleeper, WX(x), 0.03, WZ(ty), 0.3, 0.06, 2.4); }); });
      RL.t.forEach(ty => GB.add(G3.box, M.deck, WX((b0 + b1) / 2), 0.32, WZ(ty), (b1 - b0) * S, 0.2, 3));
      C.CROSS.forEach(cx => { rectG([cx - 13, RL.y0, cx + 13, RL.y1], M.asphalt, 0.04); [-13, 13].forEach(o => GB.add(G3.box, M.yellow, WX(cx + o), 0.05, WZ(RL.y), 0.3, 0.02, (RL.y1 - RL.y0) * S)); }); }

    // ---------- 路面 ----------
    const SW = { main: 8, sub: 6 };   // 人行道的寬（示意圖單位）
    const Y = { dirt: 0.012, lane: 0.017, olane: 0.016, old: 0.018, arcade: 0.018, sub: 0.02, main: 0.022 };
    ['dirt', 'lane', 'olane', 'old', 'arcade', 'sub', 'main'].forEach(kind => C.roads.filter(r => r.kind === kind).forEach(rd => {
      const pts = rd.pts, w = rd.w * S;
      if (kind === 'main' || kind === 'sub') {
        strip(pts, w, M.walk, kind === 'main' ? 0.0145 : 0.014, 'mid');
        const cw = (rd.w - SW[kind] * 2) * S; strip(pts, cw, M.asphalt, Y[kind], 'mid');
        [-1, 1].forEach(sd => strip(C.offsetLine(pts, sd * (rd.w / 2 - SW[kind])), 0.22, M.curb, Y[kind] + 0.002));
      } else strip(pts, w, kind === 'lane' ? M.asphalt : M[kind], Y[kind], 'mid');
      if (rd.broken) return;
      // 標線：主幹道中央兩條黃線＋車道的白色虛線；副幹道中央白色虛線；巷子兩邊白線
      const jm = J => (J.a === rd ? J.b.w : J.a.w) / 2 + 4;
      const clear = (x, y) => !C.junctions.some(J => (J.a === rd || J.b === rd) && Math.hypot(J.x - x, J.y - y) < jm(J));
      if (kind === 'main') {
        along(pts, 1.5, 0, (x, y, ux, uy) => { if (!clear(x, y)) return; [-0.4, 0.4].forEach(o => GB.add(G3.box, M.yellow, WX(x - uy * o), 0.026, WZ(y + ux * o), 0.7, 0.02, 0.12, 0, -Math.atan2(uy, ux), 0)); });
        [-8, 8].forEach(o => along(C.offsetLine(pts, o), 12, 2, (x, y, ux, uy) => { if (clear(x, y)) GB.add(G3.box, M.white, WX(x), 0.026, WZ(y), 3, 0.02, 0.14, 0, -Math.atan2(uy, ux), 0); }));
      } else if (kind === 'sub') along(pts, 11, 3, (x, y, ux, uy) => { if (clear(x, y)) GB.add(G3.box, M.white, WX(x), 0.026, WZ(y), 2.6, 0.02, 0.14, 0, -Math.atan2(uy, ux), 0); });
      else if (kind === 'lane') [-1, 1].forEach(sd => along(C.offsetLine(pts, sd * (rd.w / 2 - 1)), 2, 0, (x, y, ux, uy) => { if (clear(x, y)) GB.add(G3.box, M.white, WX(x), 0.022, WZ(y), 0.9, 0.02, 0.1, 0, -Math.atan2(uy, ux), 0); }));
    }));
    // 斑馬線：主幹道、副幹道進路口的地方
    C.junctions.forEach(J => {
      [J.a, J.b].forEach(rd => {
        if (rd.kind !== 'main' && rd.kind !== 'sub') return;
        const other = rd === J.a ? J.b : J.a, a = rd === J.a ? J.angA : J.angB, ux = Math.cos(a), uy = Math.sin(a), off = other.w / 2 + 5, cw = rd.w - (rd.kind === 'main' ? 16 : 12);
        [-1, 1].forEach(sd => {
          const cx = J.x + ux * off * sd, cy = J.y + uy * off * sd;
          if (C.lineDist(cx, cy, rd.pts) > 2) return;
          for (let o = -cw / 2 + 1.5; o <= cw / 2 - 1.5; o += 2.6) GB.add(G3.box, M.white, WX(cx - uy * o), 0.028, WZ(cy + ux * o), 2.8, 0.02, 0.5, 0, -a, 0);
        });
      });
    });
    // 巷子的路口：路面寫「止まれ」的停止線、紅色的倒三角標誌
    C.junctions.forEach(J => {
      const lane = [J.a, J.b].find(r => r.kind === 'lane'), big = [J.a, J.b].find(r => r.kind === 'sub' || r.kind === 'main');
      if (!lane || !big) return;
      const end = [lane.pts[0], lane.pts[lane.pts.length - 1]].sort((p, q) => Math.hypot(p[0] - J.x, p[1] - J.y) - Math.hypot(q[0] - J.x, q[1] - J.y))[0], nx = lane.pts[lane.pts[0] === end ? 1 : lane.pts.length - 2];
      const L = Math.hypot(nx[0] - end[0], nx[1] - end[1]) || 1, ux = (nx[0] - end[0]) / L, uy = (nx[1] - end[1]) / L, d0 = big.w / 2 + 3;
      const sx = J.x + ux * d0, sy = J.y + uy * d0; GB.add(G3.box, M.white, WX(sx), 0.03, WZ(sy), 0.3, 0.02, lane.w * S - 0.8, 0, -Math.atan2(uy, ux), 0);
      const px = J.x + ux * (d0 + 1) - uy * (lane.w / 2 + 1.5), py = J.y + uy * (d0 + 1) + ux * (lane.w / 2 + 1.5);
      if (!C.inCarriage(px, py)) SB.add(G3.box, M.metal, WX(px), 1.1, WZ(py), 0.08, 2.2, 0.08); SB.add(G3.cone, M.red, WX(px), 2.2, WZ(py), 0.7, 0.06, 0.7, Math.PI / 2, -Math.atan2(uy, ux) + Math.PI / 2, 0); block(WX(px) - 0.1, WX(px) + 0.1, WZ(py) - 0.1, WZ(py) + 0.1, 'deco');
      // 轉角的反射鏡（橘色的柱子、圓鏡）
      // （原本往大路裡面退了 2，鏡子會立在大馬路中間；改成站在巷口那一角的人行道上）
      if (rnd() < 0.5) { const mx = J.x + ux * (d0 - 1) + uy * (lane.w / 2 + 2), my = J.y + uy * (d0 - 1) - ux * (lane.w / 2 + 2); if (C.inCarriage(mx, my)) return; SB.add(G3.box, M.orange, WX(mx), 1.4, WZ(my), 0.1, 2.8, 0.1); SB.add(G3.cyl, lam('#BFD8E8', { em: '#5A7A8A', ei: 0.3 }), WX(mx), 2.9, WZ(my), 0.7, 0.06, 0.7, Math.PI / 2, -Math.atan2(uy, ux), 0); SB.add(G3.cyl, M.orange, WX(mx), 2.9, WZ(my), 0.78, 0.04, 0.78, Math.PI / 2, -Math.atan2(uy, ux), 0); block(WX(mx) - 0.1, WX(mx) + 0.1, WZ(my) - 0.1, WZ(my) + 0.1, 'deco'); }
    });

    // ---------- 地面上的停車場、菜園、空地 ----------
    C.lots.forEach(l => {
      if (l.type === 'parking') { rectG([l.r[0] + 1, l.r[1] + 1, l.r[2] - 1, l.r[3] - 1], M.asphalt, 0.013); const horiz = l.f < 2; if (horiz) for (let x = l.r[0] + 3; x < l.r[2] - 3; x += 6) GB.add(G3.box, M.white, WX(x), 0.026, WZ(l.f === 0 ? l.r[1] + 6 : l.r[3] - 6), 0.12, 0.02, 4.4); else for (let y = l.r[1] + 3; y < l.r[3] - 3; y += 6) GB.add(G3.box, M.white, WX(l.f === 2 ? l.r[2] - 6 : l.r[0] + 6), 0.026, WZ(y), 4.4, 0.02, 0.12); }
      else if (l.type === 'garden') { rectG([l.r[0] + 2, l.r[1] + 2, l.r[2] - 2, l.r[3] - 2], M.soil, 0.012); for (let y = l.r[1] + 5; y < l.r[3] - 3; y += 4) GB.add(G3.box, M.snowbank, WX((l.r[0] + l.r[2]) / 2), 0.02, WZ(y), (l.r[2] - l.r[0] - 5) * S, 0.03, 0.4); }
      else if (l.type === 'vacant') { rectG(l.r, M.yard, 0.011); }
    });

    // ---------- 路燈、行道樹、護欄、電線桿 ----------
    const trees = [];
    C.roads.forEach(rd => {
      if (rd.kind === 'main' || rd.kind === 'sub') {
        const off = rd.w / 2 - 2.6;
        [-1, 1].forEach(sd => along(C.offsetLine(rd.pts, sd * off), rd.kind === 'main' ? 34 : 46, sd < 0 ? 8 : 25, (x, y) => { if (nearJ(x, y, 16) || !C.inCity(x, y) || C.bridges.some(b => Math.hypot(b.sx - x, b.sy - y) < b.len / 2 + 4)) return; lampPost(WX(x), WZ(y)); }));
      }
      if (rd.kind === 'main') {
        const off = rd.w / 2 - 5.5;
        [-1, 1].forEach(sd => along(C.offsetLine(rd.pts, sd * off), 22, 12, (x, y) => { if (nearJ(x, y, 22) || C.bridges.some(b => Math.hypot(b.sx - x, b.sy - y) < b.len / 2 + 6)) return; if (C.inCarriage(x, y)) return; trees.push({ x: WX(x), z: WZ(y), s: 0.9 + rnd() * 0.4, bare: 1 }); block(WX(x) - 0.3, WX(x) + 0.3, WZ(y) - 0.3, WZ(y) + 0.3, 'tree'); }));
        // 護欄：人行道和車道中間（路口留開）
        [-1, 1].forEach(sd => along(C.offsetLine(rd.pts, sd * (rd.w / 2 - 8.6)), 4.5, 0, (x, y, ux, uy) => { if (nearJ(x, y, 26) || C.bridges.some(b => Math.hypot(b.sx - x, b.sy - y) < b.len / 2)) return; const a = -Math.atan2(uy, ux); SB.add(G3.box, M.rail, WX(x), 0.7, WZ(y), 4.5 * S, 0.22, 0.06, 0, a, 0); SB.add(G3.box, M.rail, WX(x), 0.38, WZ(y), 0.07, 0.76, 0.07); }));
      }
      // 電線桿和電線：副幹道、巷子的一邊（每隔一段）
      if (rd.kind === 'sub' || rd.kind === 'lane' || rd.kind === 'olane') {
        const off = rd.kind === 'sub' ? rd.w / 2 - 1.2 : rd.w / 2 + 1.6; let prev = null;
        along(C.offsetLine(rd.pts, off), rd.kind === 'olane' ? 34 : 40, 6, (x, y, ux, uy) => {
          if (!C.inCity(x, y) || nearJ(x, y, 9) || C.bridges.some(b => Math.hypot(b.sx - x, b.sy - y) < b.len / 2 + 4) || C.lots.some(l => x > l.r[0] - 0.5 && x < l.r[2] + 0.5 && y > l.r[1] - 0.5 && y < l.r[3] + 0.5) || C.inCarriage(x, y)) { prev = null; return; }
          const px = WX(x), pz = WZ(y);
          SB.add(G3.cyl, M.pole, px, 3.6, pz, 0.24, 7.2, 0.24); SB.add(G3.box, M.pole, px, 6.6, pz, 1.5, 0.1, 0.12, 0, -Math.atan2(uy, ux) + Math.PI / 2, 0);
          if (rnd() < 0.3) SB.add(G3.cyl, lam('#8A8C92', { tex: 0 }), px + 0.32, 5.6, pz, 0.55, 0.75, 0.55);
          if (rnd() < 0.25) SB.add(G3.box, lam('#E8E4D8', { tex: 0 }), px, 2.2, pz + 0.13, 0.32, 0.9, 0.02);   // 電線桿上的廣告
          block(px - 0.15, px + 0.15, pz - 0.15, pz + 0.15, 'deco');
          if (prev) { const mx = (prev[0] + px) / 2, mz = (prev[1] + pz) / 2, len = Math.hypot(px - prev[0], pz - prev[1]), a = Math.atan2(px - prev[0], pz - prev[1]); [-0.55, 0, 0.55].forEach(o => SB.add(G3.box, M.wire, mx + Math.cos(a) * o, 6.45 - Math.abs(o) * 0.2, mz - Math.sin(a) * o, 0.03, 0.03, len, 0, a, 0)); }
          prev = [px, pz];
        });
      }
    });
    // 公園、外濠、神社旁的松樹
    // 公園的樹也要擋人（原本沒有碰撞框，人會直接穿過樹幹）
    const parkTree = (x, z, s) => { trees.push({ x, z, s }); block(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 'tree'); };
    C.PARKS.forEach(r => { for (let x = r[0] + 6; x < r[2] - 4; x += 16 + rnd() * 10) { if (r[3] - r[1] < 12) { if (rnd() < 0.5) parkTree(WX(x), WZ((r[1] + r[3]) / 2), 0.8 + rnd() * 0.3); continue; } parkTree(WX(x), WZ(r[1] + 4 + rnd() * (r[3] - r[1] - 8)), 0.9 + rnd() * 0.4); } });
    // 城外的松樹（避開路、水、房子、田）；湯山村那些不在地塊裡的房子，直接看碰撞框
    const houseAt = (x, z, r) => (R.col.cells.get(Math.floor(x / 12) + ',' + Math.floor(z / 12)) || []).some(c => c.on && c.tag === 'house' && x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1);
    for (let i = 0, n = 0; i < 2400 && n < 260; i++) {
      const sx = rnd() * 1000, sy = rnd() * 1000;
      if (houseAt(WX(sx), WZ(sy), 1.5)) continue;
      if (C.inCity(sx, sy) && !(sx < 176 && sy > 255 && sy < 420)) continue;
      if (C.roads.some(rd => C.lineDist(sx, sy, rd.pts) < rd.w / 2 + 8) || C.water.some(w => C.lineDist(sx, sy, w.pts) < w.w / 2 + 10)) continue;
      if (C.FIELDS.some(r => sx > r[0] - 6 && sx < r[2] + 6 && sy > r[1] - 6 && sy < r[3] + 6) || C.lots.some(l => sx > l.r[0] - 8 && sx < l.r[2] + 8 && sy > l.r[1] - 8 && sy < l.r[3] + 8)) continue;
      if (Math.abs(sy - C.RAIL.y) < 30 || sy < 30) continue;
      if (C.AREAS.slice(1, 4).some(a => Math.hypot(a.x - sx, a.y - sy) < 40)) continue;
      trees.push({ x: WX(sx), z: WZ(sy), s: 0.8 + rnd() * 0.6 }); block(WX(sx) - 0.45, WX(sx) + 0.45, WZ(sy) - 0.45, WZ(sy) + 0.45, 'tree'); n++;
    }
    tw.trees = R.treeField(trees, group);

    // ---------- 紅綠燈（主幹道的路口）----------
    tw.signals = [];
    C.junctions.filter(J => J.signal).forEach(J => {
      const heads = [];
      [[J.a, J.angA, 'A'], [J.b, J.angB, 'B']].forEach(([rd, a, axis]) => {
        const other = rd === J.a ? J.b : J.a, ux = Math.cos(a), uy = Math.sin(a), off = other.w / 2 + 2;
        [-1, 1].forEach(sd => {
          // 對著開過來的車：放在路口的另一邊、車道的左邊（靠左行駛）
          const px = J.x + ux * off * sd + (-uy) * (rd.w / 2 - 3) * -sd, py = J.y + uy * off * sd + ux * (rd.w / 2 - 3) * -sd;
          if (C.lineDist(px, py, rd.pts) > rd.w) return;
          const x = WX(px), z = WZ(py), face = -Math.atan2(uy * sd, ux * sd);
          SB.add(G3.cyl, M.metal, x, 2.4, z, 0.22, 4.8, 0.22); block(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 'deco');
          const hb = R.Batch(); hb.at(x, z, face); hb.add(G3.box, M.metal, 0, 4.5, 0, 0.3, 0.12, 2.6); hb.add(G3.box, lam('#2A2C32', { tex: 0 }), 0, 4.5, 1.2, 0.4, 0.5, 1.4); hb.flush(group);
          const lamps = ['#3AE07A', '#E8C03A', '#FF3A2A'].map((c, i) => { const m = new TH.Mesh(new TH.CircleGeometry(0.17, 10), new TH.MeshBasicMaterial({ color: c })); m.position.set(x + Math.cos(face) * 0.21 + Math.sin(face) * (0.75 + i * 0.45), 4.5, z - Math.sin(face) * 0.21 + Math.cos(face) * (0.75 + i * 0.45)); m.rotation.y = face + Math.PI / 2; group.add(m); return m; });
          heads.push({ axis, lamps });
        });
      });
      tw.signals.push({ x: WX(J.x), z: WZ(J.y), J, heads });
    });
    // 號誌的週期：A 綠 7 秒、黃 2 秒、全紅 1 秒；B 一樣
    R.signalState = (t, axis) => { const p = t % 20, q = axis === 'A' ? p : (p + 10) % 20; return q < 7 ? 'g' : q < 9 ? 'y' : 'r'; };

    // ---------- 天橋（國道上，站前商店街那一頭） ----------
    { const bx = 540, by = 412, w = C.roads[0].w, z0 = WZ(by - w / 2 + 2), z1 = WZ(by + w / 2 - 2), x = WX(bx), H = 5.4, dk = lam('#4A6A8A', { tex: 0 });
      HB.add(G3.box, dk, x, H, (z0 + z1) / 2, 2.2, 0.35, z1 - z0); [-1, 1].forEach(o => HB.add(G3.box, M.rail, x + o * 1.05, H + 0.55, (z0 + z1) / 2, 0.08, 0.9, z1 - z0));
      [z0, z1].forEach((zz, i) => { const sd = i ? 1 : -1; HB.add(G3.box, dk, x - 1.8, H / 2, zz, 0.35, H, 0.35); HB.add(G3.box, dk, x + 1.8, H / 2, zz, 0.35, H, 0.35); block(x - 2.1, x - 1.5, zz - 0.2, zz + 0.2, 'deco'); block(x + 1.5, x + 2.1, zz - 0.2, zz + 0.2, 'deco');
        HB.add(G3.box, dk, x + 3.0, H / 2, zz + sd * 0.6, 1.6, 0.25, 8.6, Math.atan2(H, 8) * -sd, 0, 0); });
      sign(x, H + 1.3, (z0 + z1) / 2 + 0.01, 0, '站前天橋', '#2E4A6A', 2.0); sign(x, H + 1.3, (z0 + z1) / 2 - 0.01, Math.PI, '國道一號', '#2E4A6A', 2.0); }

    // ---------- 街角的小東西：販賣機、電話亭、郵筒、腳踏車、雪堆 ----------
    const spots = [];
    const inLot = (x, y) => { const v = C._occ[Math.floor(y / 2) * 500 + Math.floor(x / 2)]; return v >= 3; };
    C.roads.filter(r => r.kind === 'sub' || r.kind === 'lane' || r.kind === 'olane').forEach(rd => [-1, 1].forEach(sd => along(C.offsetLine(rd.pts, sd * (rd.w / 2 + 2.5)), 30, 10 + rnd() * 20, (x, y, ux, uy) => { if (C.inCity(x, y) && !nearJ(x, y, 10) && !inLot(x, y) && !inLot(x, y + 4) && !inLot(x, y + 2) && !C.inCarriage(x, y, -1.5)) spots.push([x, y, ux, uy, sd]); })));
    let vend = 0, phone = 0, post = 0;
    spots.forEach(([x, y, ux, uy, sd]) => {
      const r0 = rnd(), px = WX(x), pz = WZ(y);
      if (r0 < 0.07 && vend < 26) { vending(px, pz); vend++; }
      else if (r0 < 0.1 && phone < 6) { phone++; SB.add(G3.box, lam('#3E7A48', { tex: 0 }), px, 1.2, pz, 1.0, 2.4, 1.0); SB.add(G3.box, lam('#BFD8E8', { em: '#4A6A7A', ei: 0.4 }), px, 1.3, pz + 0.51, 0.8, 1.6, 0.02); SB.add(G3.box, M.snowbank, px, 2.44, pz, 1.0, 0.08, 1.0); block(px - 0.5, px + 0.5, pz - 0.5, pz + 0.5, 'deco'); inter(px, pz + 1.1, 1.4, '公共電話', () => R.townToast('綠色的公共電話。投一枚銅板，聽見嘟——的聲音。')); }
      else if (r0 < 0.13 && post < 6) { post++; SB.add(G3.cyl, M.red, px, 0.65, pz, 0.6, 1.3, 0.6); SB.add(G3.cyl, M.red, px, 1.36, pz, 0.66, 0.12, 0.66); SB.add(G3.box, M.snowbank, px, 1.45, pz, 0.6, 0.06, 0.6); block(px - 0.3, px + 0.3, pz - 0.3, pz + 0.3, 'deco'); inter(px, pz + 0.9, 1.3, '紅色的郵筒', () => R.townToast('郵筒上寫著「東鶴郵局　收件：每天兩次」。')); }
      else if (r0 < 0.22) bike(px, pz, -Math.atan2(uy, ux) + Math.PI / 2);
      else if (r0 < 0.4) SB.add(G3.sph, M.snowbank, px, 0, pz, 1.4 + rnd(), 0.5, 0.8 + rnd() * 0.5);
    });
    // 人孔蓋
    C.roads.filter(r => r.kind === 'main' || r.kind === 'sub').forEach(rd => along(rd.pts, 70, 30, (x, y) => { if (!nearJ(x, y, 20)) GB.add(G3.cyl, lam('#3A3C42', { tex: 'cap' }), WX(x + 3), 0.031, WZ(y), 0.9, 0.02, 0.9); }));

    GB.flush(group, true);
  };

  // 每一格：紅綠燈換燈號
  R.cityscapeStep = (dt, tw) => {
    (tw.signals || []).forEach(sg => sg.heads.forEach(h => { const s = R.signalState(tw.t, h.axis); h.lamps.forEach((m, i) => { const on = (i === 0 && s === 'g') || (i === 1 && s === 'y') || (i === 2 && s === 'r'); m.material.color.set(on ? ['#5AFF9A', '#FFD84A', '#FF4A3A'][i] : '#2A2C30'); }); }));
  };
})(window.R);
