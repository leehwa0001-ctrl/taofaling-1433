// 路人不要走在車道上（作者 2026-10-04）
// city.js 的路人路網（C.nodes、C.adj）：大路走兩邊的人行道、小路走中間；可是
//  - 巷子、副幹道的線一路伸進主幹道、副幹道的車道裡（點落在車道上）；
//  - 路口「不同的路靠得很近的點連起來」，路人就斜斜地穿過車道。
// 這裡在城的資料產生之後整理一次（town.js 蓋路人之前）：
//  1. 落在車道上的點，挪到那條路最近一邊的人行道中間；
//  2. 會穿過車道的連線拿掉；
//  3. 斑馬線（cityscape.js 畫的位置）兩頭各一個點連起來——過馬路只走斑馬線，再接到附近的人行道；
//  4. 整理完沒有任何連線的點，接到最近、不用穿過車道的點。
// 車道＝主幹道、副幹道扣掉兩邊人行道（traffic.js 的 R.pedZone 一樣）；巷子沒有人行道，人車共用，照舊走中間。
// 放在 citynorth.js 後面、town.js 前面。
(function (R) {
  const C = R.CITY; if (!C || !C.nodes || !C.adj || !C.roads) return;
  const SW = { main: 8, sub: 6 };
  const big = C.roads.filter(rd => (rd.kind === 'main' || rd.kind === 'sub') && !rd.broken);
  const carOf = (x, y) => big.find(rd => C.lineDist(x, y, rd.pts) < rd.w / 2 - SW[rd.kind]);
  // 斑馬線：[中心 x, y, 沿著路的方向 ux, uy, 路]
  const CW = [];
  (C.junctions || []).forEach(J => [J.a, J.b].forEach(rd => {
    if (rd.kind !== 'main' && rd.kind !== 'sub') return;
    const other = rd === J.a ? J.b : J.a, a = rd === J.a ? J.angA : J.angB, ux = Math.cos(a), uy = Math.sin(a), off = other.w / 2 + 5;
    [-1, 1].forEach(sd => { const cx = J.x + ux * off * sd, cy = J.y + uy * off * sd; if (C.lineDist(cx, cy, rd.pts) <= 2) CW.push([cx, cy, ux, uy, rd]); });
  }));
  const onCW = (x, y) => CW.some(([cx, cy, ux, uy, rd]) => { const dx = x - cx, dy = y - cy; return Math.abs(dx * ux + dy * uy) < 3.5 && Math.abs(-dx * uy + dy * ux) < rd.w / 2 + 1; });
  // 車道、斑馬線先畫成一張格子表（每格 2 單位）：1＝車道、2＝斑馬線。查表很快（城裡每半秒要問很多次）
  const GS = 2, O = 80, GN = Math.ceil((1200 + O) / GS), grid = new Uint8Array(GN * GN);
  const cellsNear = (x0, y0, x1, y1, f) => { for (let gy = Math.max(0, Math.floor((y0 + O) / GS)); gy <= Math.min(GN - 1, Math.floor((y1 + O) / GS)); gy++) for (let gx = Math.max(0, Math.floor((x0 + O) / GS)); gx <= Math.min(GN - 1, Math.floor((x1 + O) / GS)); gx++) f(gy * GN + gx, gx * GS - O + GS / 2, gy * GS - O + GS / 2); };
  big.forEach(rd => { const h = rd.w / 2 - SW[rd.kind]; for (let i = 0; i < rd.pts.length - 1; i++) { const a = rd.pts[i], b = rd.pts[i + 1]; cellsNear(Math.min(a[0], b[0]) - h, Math.min(a[1], b[1]) - h, Math.max(a[0], b[0]) + h, Math.max(a[1], b[1]) + h, (k, x, y) => { if (C.segDist(x, y, a[0], a[1], b[0], b[1]) < h) grid[k] = 1; }); } });
  CW.forEach(([cx, cy, ux, uy, rd]) => { const r = rd.w / 2 + 5; cellsNear(cx - r, cy - r, cx + r, cy + r, (k, x, y) => { const dx = x - cx, dy = y - cy; if (grid[k] === 1 && Math.abs(dx * ux + dy * uy) < 3.5 && Math.abs(-dx * uy + dy * ux) < rd.w / 2 + 1) grid[k] = 2; }); });
  const bad = (x, y) => { const gx = Math.floor((x + O) / GS), gy = Math.floor((y + O) / GS); return gx >= 0 && gy >= 0 && gx < GN && gy < GN && grid[gy * GN + gx] === 1; };
  // 線段有沒有穿過車道（斑馬線上不算）
  const crosses = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 1.5)); for (let k = 0; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; if (bad(x, y)) return true; } return false; };
  // 點到路的最近點、在路的哪一邊
  const foot = (x, y, pts) => { let best = null; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), fx = ax + dx * t, fy = ay + dy * t, d = Math.hypot(x - fx, y - fy); if (!best || d < best.d) { const L = Math.sqrt(L2); best = { d, fx, fy, nx: -dy / L, ny: dx / L, side: ((x - ax) * -dy + (y - ay) * dx) >= 0 ? 1 : -1 }; } } return best; };

  // 1. 車道上的點挪到人行道
  let moved = 0;
  C.nodes.forEach((p, i) => {
    for (let k = 0; k < 3; k++) {
      const rd = carOf(p[0], p[1]); if (!rd || onCW(p[0], p[1])) break;
      const f = foot(p[0], p[1], rd.pts), o = rd.w / 2 - SW[rd.kind] / 2;
      p[0] = f.fx + f.nx * o * f.side; p[1] = f.fy + f.ny * o * f.side; moved++;
    }
  });
  // 2. 穿過車道的連線拿掉
  let cut = 0;
  C.adj.forEach((nb, i) => { C.adj[i] = nb.filter(j => { const ok = !crosses(C.nodes[i], C.nodes[j]); if (!ok) cut++; return ok; }); });
  const link = (a, b) => { if (a === b || C.adj[a].includes(b)) return; C.adj[a].push(b); C.adj[b].push(a); };
  const nearGood = (x, y, maxD, not) => { let best = -1, bd = maxD; C.nodes.forEach((q, j) => { if (j === not || bad(q[0], q[1])) return; const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd && !crosses([x, y], q)) { bd = d; best = j; } }); return best; };
  // 3. 斑馬線
  let walks = 0;
  CW.forEach(([cx, cy, ux, uy, rd]) => {
    const o = rd.w / 2 - SW[rd.kind] / 2, ends = [1, -1].map(s => [cx - uy * o * s, cy + ux * o * s]);
    if (ends.some(([x, y]) => bad(x, y))) return;
    const ids = ends.map(([x, y]) => { C.nodes.push([x, y]); C.adj.push([]); return C.nodes.length - 1; });
    link(ids[0], ids[1]); walks++;
    ids.forEach(id => { const [x, y] = C.nodes[id]; let n = 0; C.nodes.map((q, j) => [j, Math.hypot(q[0] - x, q[1] - y)]).filter(([j, d]) => j !== id && d < 22 && !ids.includes(j)).sort((a, b) => a[1] - b[1]).forEach(([j]) => { if (n < 3 && !crosses(C.nodes[id], C.nodes[j])) { link(id, j); n++; } }); });
  });
  // 4. 沒有連線的點：接到最近的
  let fixed = 0;
  C.adj.forEach((nb, i) => { if (nb.length) return; const [x, y] = C.nodes[i], j = nearGood(x, y, 40, i); if (j >= 0) { link(i, j); fixed++; } });
  R.PED_PATHS = { moved, cut, walks, fixed };
  // 執行中用（traffic.js）：示意圖座標的線段會不會穿過車道、離 (x, y) 最近又不用穿過車道的點
  R.pedCross = crosses;
  R.pedNearest = (x, y) => nearGood(x, y, 60, -1);
})(window.R);
