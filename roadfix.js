// 城市的路：拿掉不合理的斷頭路（作者 2026-10-03：城市地圖有很多穿模和不合理的地方）
// city.js 先排設施、再拉巷子，巷子碰到設施就被切斷，留下兩種怪東西：
// - 兩頭都沒接到別的路的巷子、很短的一小截柏油（郵局、報社旁邊那幾段）→ 拿掉（通到地圖邊的出口不算）。
// - 一頭接著路、另一頭撞進設施的後面或側面（例如錢湯「松之湯」的後牆）→ 短的整條拿掉，長的退到離設施十單位的地方。
//   通到設施正門的不動（那是門口的車道）。
// 這個檔案要緊接在 city.js 後面（town.js 進城蓋路之前）。
(function (R) {
  const C = R.CITY; if (!C || !C.roads || !C.footR || !C.FS) return;
  const len = r => { let s = 0; for (let k = 0; k < r.pts.length - 1; k++) s += Math.hypot(r.pts[k + 1][0] - r.pts[k][0], r.pts[k + 1][1] - r.pts[k][1]); return s; };
  const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0; return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)); };
  const touches = (p, self) => C.roads.some(r => r !== self && r.pts.some((q, k) => k < r.pts.length - 1 && segD(p, q, r.pts[k + 1]) < r.w / 2 + 3));
  const foot = Object.keys(C.FS).map(k => { try { const p = C.FAC[k]; if (!p || typeof p[0] !== 'number') return null; return { k, f: C.footR(k), a: (C.FACE && C.FACE[k]) || 0 }; } catch (e) { return null; } }).filter(Boolean);
  const facAt = p => foot.find(({ f }) => p[0] > f[0] - 14 && p[0] < f[2] + 14 && p[1] > f[1] - 14 && p[1] < f[3] + 14);
  const atFront = (p, F) => { const cx = (F.f[0] + F.f[2]) / 2, cy = (F.f[1] + F.f[3]) / 2, dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy) || 1; return (dx * Math.sin(F.a) + dy * Math.cos(F.a)) / d > 0.5; };
  const gone = [], cut = [];
  // 一、浮在那裡的路：兩頭都沒接到別的路（通到地圖邊的出口不算）；巷子不管多長都拿掉，大一點的路短於 25 才拿
  const edge = p => p[0] < 5 || p[0] > 965 || p[1] < 5 || p[1] > 930;
  // 整條路上每隔 3 單位看一次：哪裡都沒碰到別的路，才算浮在那裡（中間和別的路交叉的不算）
  const floating = r => { const a = r.pts[0], b = r.pts[r.pts.length - 1]; if (edge(a) || edge(b)) return false; for (let k = 0; k < r.pts.length - 1; k++) { const p = r.pts[k], q = r.pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 3)); for (let i = 0; i <= n; i++) if (touches([p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n], r)) return false; } return true; };
  const LANES = ['lane', 'olane', 'old', 'dirt'];
  C.roads = C.roads.filter(r => { if (r.kind === 'main' || r.kind === 'arcade') return true; if (floating(r) && (LANES.includes(r.kind) || len(r) < 25)) { gone.push(r); return false; } return true; });
  // 二、撞進設施後面、側面的斷頭巷子
  C.roads = C.roads.filter(r => {
    if (r.kind === 'main' || r.kind === 'sub') return true;
    for (const end of [0, 1]) {
      const p = end ? r.pts[r.pts.length - 1] : r.pts[0]; if (touches(p, r)) continue;
      const F = facAt(p); if (!F || atFront(p, F)) continue;
      if (len(r) < 30) { gone.push(r); return false; }
      // 退回去：最後一段縮短，讓端點離設施的地十單位
      const pts = end ? r.pts : r.pts.slice().reverse(), q = pts[pts.length - 2], f = F.f;
      for (let t = 1; t >= 0; t -= 0.05) { const x = q[0] + (p[0] - q[0]) * t, y = q[1] + (p[1] - q[1]) * t; if (x < f[0] - 10 || x > f[2] + 10 || y < f[1] - 10 || y > f[3] + 10) { pts[pts.length - 1] = [x, y]; break; } }
      r.pts = end ? pts : pts.reverse(); cut.push(r);
    }
    return true;
  });
  // 三、路人的路網、路口（city.js 照原本的路算好的）：拿掉的那幾段上的點斷開，只剩一條路經過的路口拿掉
  const dl = (x, y, pts) => { let m = 1e9; for (let k = 0; k < pts.length - 1; k++) m = Math.min(m, segD([x, y], pts[k], pts[k + 1])); return m; };
  if (gone.length || cut.length) {
    const live = C.roads.filter(r => r.kind !== 'dirt');
    if (C.nodes && C.adj) C.nodes.forEach(([x, y], i) => { if (live.some(r => dl(x, y, r.pts) < r.w / 2 + 6)) return; C.adj[i].forEach(j => { C.adj[j] = C.adj[j].filter(k => k !== i); }); C.adj[i] = []; });
    if (C.junctions) C.junctions = C.junctions.filter(J => live.filter(r => dl(J.x, J.y, r.pts) < r.w / 2 + 2).length >= 2);
  }
  R.ROADFIX = { gone: gone.length, cut: cut.length, list: gone.map(r => r.kind + ' ' + r.pts[0].map(Math.round) + '→' + r.pts[r.pts.length - 1].map(Math.round)) };   // 測試時看拿掉了哪些
})(window.R);
