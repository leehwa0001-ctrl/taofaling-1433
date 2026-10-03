// 討伐令 1433：GTA 那樣的地圖介面——圓形雷達、可以拖曳縮放的大地圖、目的地標記、沿著路的導航線、城裡的光柱
// 雷達：電腦版在左下角（手機版左下角是搖桿，留在右上角），跟著視角轉；重要設施、遺跡入口、劇情人物、委託都有圖示；
//  目的地、劇情人物、委託、討伐委託的遺跡在雷達外面時，圖示貼在雷達的邊上指出方向。點一下雷達打開大地圖。
// 大地圖（Tab 或 M）：拖曳移動、滾輪（手機兩指）縮放、點一下設目的地，再點一次標記就取消；重要設施一直標名字，商店放大才標；
//  旁邊是圖例和目的地清單。
// 導航：沿著路走（只能從平交道過鐵路；西橋整修中過不去），城裡在目的地立一根光柱，走到就自動清掉。
(function (R) {
  const W = R.W, $ = id => document.getElementById(id), C = R.CITY, S = C.S, WX = C.WX, WZ = C.WZ, HALF = C.HALF;
  const T = () => THREE;
  const toS = (x, z) => [x / S + 500, z / S + 500];   // 世界座標 → 示意圖座標

  // ---------- 導航用的路網：每一條路（含拱廊、城外的泥土路）的中心線 ----------
  const NAV = { nodes: [], adj: [] };
  {
    const hash = new Map(), hk = (x, y) => Math.floor(x / 16) + ',' + Math.floor(y / 16);
    const add = (x, y) => { const i = NAV.nodes.length; NAV.nodes.push([x, y]); NAV.adj.push([]); const k = hk(x, y); if (!hash.has(k)) hash.set(k, []); hash.get(k).push(i); return i; };
    const link = (a, b) => { if (a === b || NAV.adj[a].includes(b)) return; NAV.adj[a].push(b); NAV.adj[b].push(a); };
    const roadOf = [], wOf = [], ends = [];
    C.roads.forEach((rd, ri) => { const ids = []; for (let i = 0; i < rd.pts.length - 1; i++) { const [ax, ay] = rd.pts[i], [bx, by] = rd.pts[i + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 12)); for (let k = i ? 1 : 0; k <= n; k++) { const id = add(ax + (bx - ax) * k / n, ay + (by - ay) * k / n); roadOf[id] = ri; wOf[id] = rd.w; ids.push(id); } } for (let i = 0; i < ids.length - 1; i++) link(ids[i], ids[i + 1]); if (ids.length) ends.push(ids[0], ids[ids.length - 1]); });
    const around = (x, y, rr, fn) => { const gx = Math.floor(x / 16), gy = Math.floor(y / 16); for (let dx = -rr; dx <= rr; dx++) for (let dy = -rr; dy <= rr; dy++) (hash.get((gx + dx) + ',' + (gy + dy)) || []).forEach(fn); };
    // 路口：不同的路靠得很近的點連起來（整修中的西橋兩頭離很遠，不會連上）
    NAV.nodes.forEach(([x, y], i) => around(x, y, 1, j => { if (j > i && Math.hypot(NAV.nodes[j][0] - x, NAV.nodes[j][1] - y) < 13) link(i, j); }));
    // 丁字路口：窄路的盡頭接在寬路的路邊（例如北門橋的本町通接國道一號）
    ends.forEach(i => { const [x, y] = NAV.nodes[i]; let best = -1, bd = 1e9; around(x, y, 2, j => { if (roadOf[j] === roadOf[i]) return; const d = Math.hypot(NAV.nodes[j][0] - x, NAV.nodes[j][1] - y); if (d < wOf[j] / 2 + 6 && d < bd) { bd = d; best = j; } }); if (best >= 0) link(i, best); });
    // 廣場：路在廣場邊上斷開，從廣場中間連起來（西市口的橢圓廣場、站前廣場）
    { const [cx, cy, rx, ry] = C.SQUARE, hub = add(cx, cy); ends.forEach(i => { if (Math.hypot((NAV.nodes[i][0] - cx) / rx, (NAV.nodes[i][1] - cy) / ry) < 2.3) link(hub, i); }); }
    { const [x0, y0, x1, y1] = C.PLAZA, hub = add((x0 + x1) / 2, (y0 + y1) / 2); ends.forEach(i => { const [x, y] = NAV.nodes[i]; if (x > x0 - 16 && x < x1 + 16 && y > y0 - 16 && y < y1 + 16) link(hub, i); }); }
    // 還是死路的路頭：接到 34 單位內別條路的點（不穿過城牆、水；鐵路下面另外擋）
    const cross = (a, b, c, d) => { const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]); if (!den) return null; const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den, u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : null; };
    const [ox0, oy0, ox1, oy1] = C.OLD, gate = (h, axis, list) => list.some(g => Math.abs(h[axis] - g) < C.GW / 2);
    const blocked = (a, b) => {
      for (const [p, q, axis, list] of [[[ox0, oy0], [ox1, oy0], 0, C.GATES.n], [[ox0, oy1], [ox1, oy1], 0, C.GATES.s], [[ox0, oy0], [ox0, oy1], 1, C.GATES.w], [[ox1, oy0], [ox1, oy1], 1, C.GATES.e]]) { const h = cross(a, b, p, q); if (h && !gate(h, axis, list)) return true; }
      return C.water.some(wt => wt.pts.some((p, j) => { if (!j) return false; const h = cross(a, b, wt.pts[j - 1], p); return h && !C.bridges.some(br => br.ok && Math.hypot(br.sx - h[0], br.sy - h[1]) < br.len / 2 + 4); }));
    };
    ends.forEach(i => { if (NAV.adj[i].length > 1) return; const a = NAV.nodes[i]; let best = -1, bd = 34; around(a[0], a[1], 3, j => { if (roadOf[j] === roadOf[i]) return; const d = Math.hypot(NAV.nodes[j][0] - a[0], NAV.nodes[j][1] - a[1]); if (d < bd && !blocked(a, NAV.nodes[j])) { bd = d; best = j; } }); if (best >= 0) link(i, best); });
    // 鐵路只能從平交道過
    NAV.adj.forEach((nb, i) => { NAV.adj[i] = nb.filter(j => { const a = NAV.nodes[i], b = NAV.nodes[j]; if ((a[1] - C.RAIL.y) * (b[1] - C.RAIL.y) >= 0) return true; return C.CROSS.some(cx => Math.abs((a[0] + b[0]) / 2 - cx) < 16); }); });
  }
  const nearestNode = (sx, sy) => { let b = -1, bd = 1e9; NAV.nodes.forEach(([x, y], i) => { const d = (x - sx) ** 2 + (y - sy) ** 2; if (d < bd) { bd = d; b = i; } }); return b; };
  // A*：從路網的 a 點走到 b 點
  const findPath = (a, b) => {
    const n = NAV.nodes.length, g = new Float64Array(n).fill(Infinity), f = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), shut = new Uint8Array(n), inOpen = new Uint8Array(n), open = [a];
    const h = i => Math.hypot(NAV.nodes[i][0] - NAV.nodes[b][0], NAV.nodes[i][1] - NAV.nodes[b][1]);
    g[a] = 0; f[a] = h(a); inOpen[a] = 1;
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop(); inOpen[cur] = 0; if (cur === b) break; shut[cur] = 1;
      for (const nb of NAV.adj[cur]) { if (shut[nb]) continue; const t = g[cur] + Math.hypot(NAV.nodes[nb][0] - NAV.nodes[cur][0], NAV.nodes[nb][1] - NAV.nodes[cur][1]); if (t < g[nb]) { g[nb] = t; f[nb] = t + h(nb); prev[nb] = cur; if (!inOpen[nb]) { inOpen[nb] = 1; open.push(nb); } } }
    }
    if (a !== b && prev[b] < 0) return null;
    const out = []; for (let i = b; i >= 0; i = prev[i]) { out.push(NAV.nodes[i]); if (i === a) break; }
    return out.reverse();
  };
  R.navPath = (sx0, sy0, sx1, sy1) => findPath(nearestNode(sx0, sy0), nearestNode(sx1, sy1));   // 之後開車、追逐也會用到
  R.NAV = NAV;

  // ---------- 目的地 ----------
  let route = null, routeKey = '', beacon = null;
  R.setWaypoint = (sx, sy, name) => { if (!R.S) return; R.S.waypoint = { sx, sy, name: name || '標記的地點' }; route = null; routeKey = ''; R.save && R.save(); makeBeacon(); };
  R.clearWaypoint = () => { if (!R.S) return; R.S.waypoint = null; route = null; routeKey = ''; R.save && R.save(); makeBeacon(); };
  const wpPos = () => { const wp = R.S && R.S.waypoint; return wp ? [WX(wp.sx), WZ(wp.sy)] : null; };
  const here = () => W.outside || W.P;
  // 導航線：玩家 → 最近的路 → 沿著路 → 目的地
  const updateRoute = () => {
    const wp = R.S && R.S.waypoint, P = here(); if (!wp || !P) { route = null; return; }
    const [px, py] = toS(P.x, P.z), a = nearestNode(px, py), b = nearestNode(wp.sx, wp.sy), key = a + '>' + b;
    if (key === routeKey && route) { route[0] = [px, py]; return; } routeKey = key;
    const path = findPath(a, b);
    route = [[px, py]].concat(path || [], [[wp.sx, wp.sy]]);
  };
  const routeLen = () => { let L = 0; if (route) for (let i = 1; i < route.length; i++) L += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]); return L; };
  // 城裡的光柱（目的地）
  const makeBeacon = () => {
    if (beacon) { if (beacon.parent) beacon.parent.remove(beacon); beacon.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    beacon = null; const p = wpPos(), tw = W.town; if (!p || !tw || !tw.group || !window.THREE) return;
    const TH = T(), g = new TH.Group();
    const beam = new TH.Mesh(new TH.CylinderGeometry(0.55, 0.55, 40, 12, 1, true), new TH.MeshBasicMaterial({ color: '#FFD84A', transparent: true, opacity: 0.32, depthWrite: false, side: TH.DoubleSide, fog: false })); beam.position.y = 20; g.add(beam);
    const ring = new TH.Mesh(new TH.RingGeometry(1.0, 1.4, 24), new TH.MeshBasicMaterial({ color: '#FFD84A', transparent: true, opacity: 0.8, depthWrite: false, side: TH.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; g.add(ring);
    g.position.set(p[0], 0, p[1]); g.renderOrder = 5; tw.group.add(g); beacon = g;
  };

  // ---------- 地圖上的圖示 ----------
  // [標籤裡的字, 圖示字, 顏色, 圖例的名字, 重要（大地圖一直標名字）]（照順序比對；商店放在最後）
  const KINDS = [
    [/^觀光景點/, '景', '#2E9AB8', '觀光景點', 1], [/拉麵・|喫茶・|洋食屋・|蕎麥・|壽司・|燒肉・|定食屋|屋台/, '食', '#D8643A', '餐廳', 1],   // sights.js、dining.js（2026-10-03）
    [/公會/, '公', '#3E7A48', '勇者公會', 1], [/東鶴站|售票|搭電車/, '站', '#2E5A8A', '東鶴站', 1], [/赤提燈|旅館|住一晚|旅店/, '宿', '#B8423A', '旅館', 1],
    [/白藤堂|藥鋪|藥局/, '藥', '#6A5A9A', '藥鋪', 1], [/鐵匠|老岩/, '鐵', '#8A5A3A', '鐵匠鋪', 1], [/倉庫/, '倉', '#5A5A62', '倉庫', 1],
    [/醫院|診所/, '醫', '#3A8A5A', '醫院・診所', 1], [/銀行/, '銀', '#A88A3A', '銀行', 1], [/郵局/, '郵', '#C83A3A', '郵局', 1],
    [/驛站/, '車', '#8A6A3A', '驛站', 1], [/縣廳/, '縣', '#3A4A6A', '縣廳', 1], [/詰所|崗亭/, '衛', '#3A4A5A', '衛兵', 1],
    [/日報|報社/, '報', '#4A4A52', '報社', 0], [/東鶴座|劇場|戲院/, '劇', '#8A2A3A', '劇場', 0], [/錢湯|溫泉|澡堂/, '湯', '#3A7AAE', '錢湯・溫泉', 0],
    [/寺/, '寺', '#6A5A3A', '寺', 0], [/神社|參拜/, '社', '#B8323A', '神社', 0], [/道場/, '道', '#5A3A2A', '道場', 0], [/兌換所/, '兌', '#7A6A2A', '兌換所', 0],
    [/學校|學堂|小學/, '學', '#4A6A8A', '學校', 0], [/私人委託的木板/, '委', '#9A5AD8', '私人委託的木板', 1], [/百貨/, '百', '#D8823A', '百貨公司', 1],
    [/雀莊/, '麻', '#2E6A4A', '雀莊（麻將）', 1], [/卡拉/, '歌', '#C83AA8', '卡拉 OK', 1], [/回家|管理員室/, '家', '#4A7AAE', '自己的家', 1], [/中古車行/, '車', '#3A5A8A', '中古車行', 1], [/租腳踏車/, '輪', '#B8A030', '租腳踏車', 0], [/計程車行/, '計', '#C8A020', '計程車行', 0], [/屋台/, '台', '#C83A3A', '屋台', 0],
    [/商行|零件|便利|和菓子|甘味|咖啡|超市|雜貨|書店|書房|柏青哥|遊樂|商店|食堂|定食|拉麵|居酒屋|酒館|茶屋|家電|寫真|理髮|眼鏡|時計/, '店', '#C8823A', '商店', 0]
  ];
  const SKIP = /路牌|垃圾|雪人|坐一下|井水|鞦韆|郵筒|販賣機|公共電話|翻|偷|撬|摸走|順手|釣|抽籤|看|告示|地圖|長椅|鐘樓|時鐘|站牌/;
  const NAMES = { '參拜': '東鶴神社' };
  const clean = l => { const s = String(l || '').replace(/^(走進|進入|進|和|敲|向|在|泡一下|去)/, '').replace(/（.*?）|\(.*?\)/g, '').replace(/(說話|的門|合掌|看看)$/, '').replace(/(的服務台|的大門|的校門|的老闆|的大叔|・售票口)$/, '').trim(); return NAMES[s] || s; };
  let iconCache = null, iconTown = null;
  const facilities = () => {
    const tw = W.town; if (!tw) return [];
    if (iconTown !== tw) {
      iconTown = tw; const list = [];
      tw.inter.forEach(it => {
        if (it.follow || !it.label || typeof it.label !== 'string') return; const lab = it.label, base = lab.replace(/（.*?）|\(.*?\)/g, ''); if (SKIP.test(base) && !it.door) return;
        const k = KINDS.find(([re]) => re.test(base)); if (!k) return;
        if (list.some(o => o.g === k[1] && Math.hypot(o.x - it.x, o.z - it.z) < 10)) return;
        list.push({ x: it.x, z: it.z, g: k[1], col: k[2], kind: k[3], key: k[4], name: clean(lab) || k[3] });
      });
      Object.entries(tw.gates || {}).forEach(([id, [gx, gz]]) => { const site = R.SITES.find(v => v.id === id); if (site) list.push({ x: gx, z: gz, g: '遺', col: R.GRADE_COLOR[site.grade] || '#B8322A', kind: '遺跡入口', key: 2, name: site.name, gate: id }); });
      iconCache = list;
    }
    return iconCache;
  };
  const icons = () => {
    const tw = W.town; if (!tw || !R.S) return [];
    const out = facilities().map(o => Object.assign({}, o));
    // 討伐委託：遺跡入口加星號、貼邊
    const hunts = (R.S.jobs || []).filter(j => j.kind === 'hunt' && j.site).map(j => j.site);
    out.forEach(o => { if (o.gate && hunts.includes(o.gate)) { o.edge = true; o.star = true; } });
    // 劇情人物（!）、送貨收購的委託人（★）：會走動，每次重新看位置
    tw.inter.forEach(it => {
      if (!it.follow) return; const f = it.follow, lab = it.label || '';
      if (it.person) out.push({ x: f.x, z: f.z, g: '!', col: '#F2C84A', ink: '#1A1410', kind: '今天在城裡的人', key: 3, name: clean(lab), edge: true, moving: 1 });
      else if (/^把.*交給/.test(lab)) out.push({ x: f.x, z: f.z, g: '★', col: '#9A5AD8', kind: '私人委託', key: 3, name: '委託：' + clean(lab), edge: true, moving: 1 });
    });
    return out;
  };
  const glyph = (x, mx, my, ic, r) => {
    x.beginPath(); x.arc(mx, my, r, 0, Math.PI * 2); x.fillStyle = ic.col; x.fill(); x.lineWidth = Math.max(1.5, r * 0.22); x.strokeStyle = '#141018'; x.stroke();
    x.fillStyle = ic.ink || '#FFFFFF'; x.font = 'bold ' + Math.round(r * 1.25) + 'px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ic.g, mx, my + r * 0.08);
    if (ic.star) { x.fillStyle = '#C89AFF'; x.strokeStyle = '#141018'; x.lineWidth = 2; x.font = 'bold ' + Math.round(r * 1.1) + 'px sans-serif'; x.strokeText('★', mx + r * 0.95, my - r * 0.9); x.fillText('★', mx + r * 0.95, my - r * 0.9); }
  };
  const pin = (x, mx, my, r) => {   // 目的地：黃色的大頭針（尖端在目的地上）
    x.beginPath(); x.moveTo(mx, my); x.arc(mx, my - r * 1.6, r, Math.PI * 0.8, Math.PI * 2.2); x.closePath(); x.fillStyle = '#FFD84A'; x.fill(); x.lineWidth = 2; x.strokeStyle = '#141018'; x.stroke();
    x.beginPath(); x.arc(mx, my - r * 1.6, r * 0.4, 0, Math.PI * 2); x.fillStyle = '#141018'; x.fill();
  };
  const drawRoute = (x, pt, w) => {
    if (!route || route.length < 2) return;
    x.lineJoin = 'round'; x.lineCap = 'round';
    [[w + 3, 'rgba(20,16,24,.85)'], [w, '#F2C84A']].forEach(([lw, col]) => { x.beginPath(); route.forEach(([sx, sy], i) => { const [mx, my] = pt(WX(sx), WZ(sy)); if (i) x.lineTo(mx, my); else x.moveTo(mx, my); }); x.lineWidth = lw; x.strokeStyle = col; x.stroke(); });
  };

  // ---------- 雷達（城裡的小地圖） ----------
  const RADAR_M = 150;   // 雷達的直徑代表幾公尺
  R.drawTownMinimap = (x, s) => {
    const P = W.P, tw = W.town; if (!tw || !P) return;
    const yaw = W.cam.yaw, N = tw.groundCanvas.width, k = tw.mapK || N / (HALF * 2), ppm = s / RADAR_M;   // mapK：底圖往東接了港區（harbor.js），寬度不再等於 2×HALF
    x.save(); x.translate(s / 2, s / 2); x.rotate(yaw); x.scale(ppm / k, ppm / k); x.translate(-(P.x + HALF) * k, -(P.z + HALF) * k);
    x.imageSmoothingEnabled = false; x.drawImage(tw.groundCanvas, 0, 0); x.restore();
    const c = Math.cos(yaw), sn = Math.sin(yaw), pt = (wx, wz) => { const dx = (wx - P.x) * ppm, dz = (wz - P.z) * ppm; return [s / 2 + dx * c - dz * sn, s / 2 + dx * sn + dz * c]; };
    if (!W.inside) drawRoute(x, pt, Math.max(2, s / 70));
    const rim = s / 2 - 9, r = Math.max(5.5, s / 26);
    const edge = (mx, my) => { const dx = mx - s / 2, dy = my - s / 2, d = Math.hypot(dx, dy); return d > rim ? [s / 2 + dx / d * rim, s / 2 + dy / d * rim, 1] : [mx, my, 0]; };
    // 商店之類（不重要的）只畫附近的、小一點
    icons().forEach(ic => { if (!ic.key && Math.hypot(ic.x - P.x, ic.z - P.z) > 45) return; const [mx, my, out] = edge(...pt(ic.x, ic.z)); if (out && !ic.edge) return; glyph(x, mx, my, ic, out ? r * 0.85 : ic.key ? r : r * 0.8); });
    const wp = wpPos(); if (wp) { const [mx, my] = edge(...pt(wp[0], wp[1])); pin(x, mx, my, r * 0.75); }
    if (R.crimeMinimap) R.crimeMinimap(x, pt);
  };
  // 雷達中間的自己：大一點的箭頭（原本的小箭頭在遺跡裡照舊）
  const mini0 = R.drawMinimap;
  R.drawMinimap = (...args) => {
    mini0(...args);
    const P = W.P, cv = $('r-map'); if (!W.town || W.run || W.inside || !P || !cv) return;
    const x = cv.getContext('2d'), s = cv.width, a = (P.aimA || 0) - W.cam.yaw, fx = Math.sin(a), fz = Math.cos(a), L = s / 18, c = s / 2;
    x.beginPath(); x.moveTo(c + fx * L * 1.3, c + fz * L * 1.3); x.lineTo(c - fx * L * 0.7 - fz * L * 0.8, c - fz * L * 0.7 + fx * L * 0.8); x.lineTo(c - fx * L * 0.25, c - fz * L * 0.25); x.lineTo(c - fx * L * 0.7 + fz * L * 0.8, c - fz * L * 0.7 - fx * L * 0.8); x.closePath();
    x.fillStyle = '#FFE08A'; x.fill(); x.lineWidth = 2; x.strokeStyle = '#141018'; x.stroke();
  };

  // ---------- 大地圖（城裡：拖曳、縮放、點一下設目的地） ----------
  const view = { cx: 0, cz: 0, ppm: 1.4 };
  let cvBig = null;
  const drawBig = () => {
    const cv = cvBig, tw = W.town; if (!cv || !cv.isConnected || !tw) return;
    const g = cv.getContext('2d'), cw = cv.width, ch = cv.height, P = here(), N = tw.groundCanvas.width, k = tw.mapK || N / (HALF * 2);
    g.fillStyle = '#0E0C12'; g.fillRect(0, 0, cw, ch);
    g.save(); g.translate(cw / 2, ch / 2); g.scale(view.ppm / k, view.ppm / k); g.translate(-(view.cx + HALF) * k, -(view.cz + HALF) * k); g.imageSmoothingEnabled = view.ppm < 2.6; g.drawImage(tw.groundCanvas, 0, 0); g.restore();
    const pt = (wx, wz) => [cw / 2 + (wx - view.cx) * view.ppm, ch / 2 + (wz - view.cz) * view.ppm];
    drawRoute(g, pt, Math.max(3, Math.min(7, view.ppm * 1.6)));
    // 圖示；名字照重要的順序標，標不下（會疊在一起）就不標
    const r = Math.max(8, Math.min(13, view.ppm * 4.5)), zoomed = view.ppm > 2.6, list = icons(), dots = [];
    list.forEach(ic => { const [mx, my] = pt(ic.x, ic.z); if (mx < -20 || my < -20 || mx > cw + 20 || my > ch + 20) return; glyph(g, mx, my, ic, r); dots.push([mx - r, my - r, mx + r, my + r, ic]); });
    const wp = wpPos(); if (wp) { const [mx, my] = pt(wp[0], wp[1]); pin(g, mx, my, r); }
    g.font = 'bold 12px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    // 名字放在圖示的下、上、右、左，哪裡空就放哪裡（不蓋住別的名字、別的圖示）
    const tags = [], hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    list.slice().sort((a, b) => (b.key || 0) - (a.key || 0)).forEach(ic => {
      if (!ic.key && !zoomed) return; const [mx, my] = pt(ic.x, ic.z); if (mx < 0 || my < 0 || mx > cw || my > ch) return;
      const w2 = g.measureText(ic.name).width + 8;
      const spots = [[mx - w2 / 2, my + r + 2], [mx - w2 / 2, my - r - 18], [mx + r + 3, my - 8], [mx - r - 3 - w2, my - 8]].map(([x0, y0]) => [x0, y0, x0 + w2, y0 + 16]);
      const bx = spots.find(b => !tags.some(o => hit(o, b)) && !dots.some(d => d[4] !== ic && hit(d, b))); if (!bx) return; tags.push(bx);
      g.fillStyle = 'rgba(20,16,24,.8)'; g.fillRect(bx[0], bx[1], w2, 16); g.fillStyle = ic.g === '遺' ? '#FFD0C0' : ic.g === '!' ? '#FFE08A' : '#F4E9CD'; g.fillText(ic.name, (bx[0] + bx[2]) / 2, bx[1] + 8.5);
    });
    // 自己：黃色的箭頭（朝向）
    const [mx, my] = pt(P.x, P.z), a = P.aimA || 0;
    g.save(); g.translate(mx, my); g.rotate(Math.PI - a); g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 8); g.lineTo(0, 4); g.lineTo(-8, 8); g.closePath(); g.fillStyle = '#FFE08A'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#141018'; g.stroke(); g.restore();
    // 北方、比例尺
    g.fillStyle = 'rgba(184,50,42,.95)'; g.beginPath(); g.arc(cw - 22, 22, 13, 0, Math.PI * 2); g.fill(); g.fillStyle = '#FFF'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('北', cw - 22, 23);
    const bar = view.ppm * 50; g.fillStyle = 'rgba(20,16,24,.8)'; g.fillRect(10, ch - 26, bar + 60, 18); g.fillStyle = '#F4E9CD'; g.fillRect(16, ch - 18, bar, 3); g.font = '11px sans-serif'; g.textAlign = 'left'; g.fillText('50 公尺', 22 + bar, ch - 16);
    const info = $('gmap-info'); if (info) { const w = R.S.waypoint; info.textContent = w ? '目的地：' + w.name + (route ? '（沿著路約 ' + Math.round(routeLen() * S) + ' 公尺）' : '') : '點地圖上的任何地方設目的地；再點一次標記就取消。'; }
  };
  const openBig = () => {
    const tw = W.town, P = here(); if (!tw || !P) return;
    const side = window.innerWidth > 820, cw = Math.max(260, Math.round(Math.min(window.innerWidth - 72 - (side ? 292 : 0), 1040))), ch = Math.max(240, Math.round(Math.min(window.innerHeight * (side ? 0.74 : 0.52), side ? 780 : cw)));
    view.cx = P.x; view.cz = P.z; view.ppm = 2.2;
    const fac = facilities(), kinds = KINDS.filter(k => fac.some(o => o.g === k[1]));
    const dests = fac.slice().sort((a, b) => (a.gate ? 1 : 0) - (b.gate ? 1 : 0) || KINDS.findIndex(k => k[1] === a.g) - KINDS.findIndex(k => k[1] === b.g));
    const legend = kinds.map(k => '<span class="gl"><b style="background:' + k[2] + '">' + k[1] + '</b>' + R.esc(k[3]) + '</span>').join('')
      + '<span class="gl"><b style="background:#B8322A">遺</b>遺跡入口</span><span class="gl"><b style="background:#F2C84A;color:#1A1410">!</b>今天在城裡的人</span><span class="gl"><b style="background:#9A5AD8">★</b>私人委託</span>';
    R.sheet('<h2>東鶴 地圖</h2><div class="gmap"><canvas id="gmap-cv" width="' + cw + '" height="' + ch + '"></canvas><div class="gmap-side"><p class="note" id="gmap-info"></p>'
      + '<h3>圖例</h3><div class="glegend">' + legend + '</div><h3>目的地</h3><div class="chips">'
      + dests.map((o, i) => '<button type="button" class="chip" data-dest="' + i + '"><b style="color:' + o.col + '">' + R.esc(o.g) + '</b> ' + R.esc(o.name) + '</button>').join('') + '</div>'
      + '<p class="note">拖曳移動、滾輪縮放（手機兩指）。黃線是路線，黃色的光柱是目的地。只能從平交道過鐵路；西橋整修中。</p></div></div>',
      '<div class="row"><button type="button" class="btn pri" id="gm-x">關上（Tab）</button><button type="button" class="btn" id="gm-me">回到自己的位置</button><button type="button" class="btn" id="gm-all">整張東鶴</button><button type="button" class="btn" id="gm-clear">清除目的地</button></div>');
    $('r-sheet').classList.add('wide');
    cvBig = $('gmap-cv');
    $('gm-x').onclick = R.closeSheet; $('gm-me').onclick = () => { view.cx = P.x; view.cz = P.z; view.ppm = 2.2; drawBig(); };
    $('gm-all').onclick = () => { view.cx = tw.mapCx || 0; view.cz = 0; view.ppm = Math.min(cw / ((tw.mapW || HALF * 2) + 20), ch / (HALF * 2 + 20)); drawBig(); };
    $('gm-clear').onclick = () => { R.clearWaypoint(); drawBig(); };
    document.querySelectorAll('[data-dest]').forEach(b => { b.onclick = () => { const o = dests[+b.dataset.dest], [sx, sy] = toS(o.x, o.z); R.setWaypoint(sx, sy, o.name); updateRoute(); view.cx = (P.x + o.x) / 2; view.cz = (P.z + o.z) / 2; drawBig(); }; });
    // 拖曳、縮放、點一下
    const pts = new Map(); let moved = 0, pinch = 0;
    const toWorld = (ex, ey) => { const rc = cvBig.getBoundingClientRect(), u = (ex - rc.left) / rc.width * cvBig.width, v = (ey - rc.top) / rc.height * cvBig.height; return [view.cx + (u - cvBig.width / 2) / view.ppm, view.cz + (v - cvBig.height / 2) / view.ppm, u, v]; };
    const zoomAt = (u, v, f) => { const wx = view.cx + (u - cvBig.width / 2) / view.ppm, wz = view.cz + (v - cvBig.height / 2) / view.ppm; view.ppm = Math.max(0.5, Math.min(8, view.ppm * f)); view.cx = wx - (u - cvBig.width / 2) / view.ppm; view.cz = wz - (v - cvBig.height / 2) / view.ppm; };
    cvBig.addEventListener('pointerdown', e => { cvBig.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 1) moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    cvBig.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; const [ox, oy] = pts.get(e.pointerId), rc = cvBig.getBoundingClientRect(), sc = cvBig.width / rc.width;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) { const u = ((a[0] + b[0]) / 2 - rc.left) * sc, v = ((a[1] + b[1]) / 2 - rc.top) * sc; zoomAt(u, v, d / pinch); } pinch = d; moved += 10; drawBig(); return; }
      const dx = (e.clientX - ox) * sc, dy = (e.clientY - oy) * sc; moved += Math.abs(dx) + Math.abs(dy); view.cx -= dx / view.ppm; view.cz -= dy / view.ppm; drawBig();
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (pts.size) return;
      if (moved > 6) return;
      const [wx, wz, u, v] = toWorld(e.clientX, e.clientY), cur = wpPos();
      if (cur) { const mx = cvBig.width / 2 + (cur[0] - view.cx) * view.ppm, my = cvBig.height / 2 + (cur[1] - view.cz) * view.ppm; if (Math.hypot(mx - u, my - v + 14) < 18 || Math.hypot(mx - u, my - v) < 12) { R.clearWaypoint(); drawBig(); return; } }
      if (wx < -HALF || wx > (W.town.mapX1 || HALF) || Math.abs(wz) > HALF) return;
      // 點在圖示上（或很近）：目的地就是那個設施
      const near = facilities().map(o => [o, Math.hypot(o.x - wx, o.z - wz) * view.ppm]).sort((a, b) => a[1] - b[1])[0];
      if (near && near[1] < 16) { const [sx, sy] = toS(near[0].x, near[0].z); R.setWaypoint(sx, sy, near[0].name); }
      else { const [sx, sy] = toS(wx, wz); R.setWaypoint(sx, sy, '標記的地點（' + C.areaName(sx, sy) + '）'); }
      updateRoute(); drawBig();
    };
    cvBig.addEventListener('pointerup', up); cvBig.addEventListener('pointercancel', e => { pts.delete(e.pointerId); moved = 99; });
    cvBig.addEventListener('wheel', e => { e.preventDefault(); const [, , u, v] = toWorld(e.clientX, e.clientY); zoomAt(u, v, e.deltaY > 0 ? 1 / 1.18 : 1.18); drawBig(); }, { passive: false });
    updateRoute(); drawBig();
  };
  const big0 = R.bigMap;
  R.bigMap = () => { if (W.town && !W.run) { if (R.sheetOpen && R.sheetOpen()) { R.closeSheet(); return; } openBig(); } else big0(); };
  // 別的紙本打開時，把大地圖的寬版拿掉
  const sheet0 = R.sheet;
  R.sheet = (html, foot) => { const sh = $('r-sheet'); if (sh) sh.classList.remove('wide'); cvBig = null; sheet0(html, foot); };
  // M 也能打開大地圖（城裡）
  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'm' || !W.town || W.run || !$('run') || $('run').hidden || e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (R.sheetOpen && R.sheetOpen()) { if (cvBig && cvBig.isConnected) R.closeSheet(); return; }
    R.bigMap();
  });

  // ---------- 雷達的大小、位置 ----------
  // 城裡：電腦版 220 像素（CSS 放在左下角、圓形）；遺跡裡照原本的 160 像素
  const sizeRadar = town => { const cv = $('r-map'); if (!cv) return; cv.classList.toggle('radar', !!town); const n = town && !R.touch ? 220 : 160; if (cv.width !== n) { cv.width = n; cv.height = n; } };
  const hookRadar = () => { const cv = $('r-map'); if (!cv || cv.dataset.gta) return; cv.dataset.gta = 1; cv.addEventListener('click', () => { if (W.town && !W.run && !(R.sheetOpen && R.sheetOpen())) R.bigMap(); }); };

  // ---------- 每一格：導航線、到了沒、光柱 ----------
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => { enter0(from, at); iconTown = null; route = null; routeKey = ''; sizeRadar(true); hookRadar(); makeBeacon(); };
  let navT = 0;
  const step0 = R.townStep;
  R.townStep = dt => {
    step0(dt);
    const tw = W.town, P = W.P; if (!tw || !P || W.inside) return;
    R.drawMinimap();   // 雷達每一格都畫（原本 0.2 秒一次，轉視角的時候會跳）
    if (beacon) { beacon.children[0].material.opacity = 0.24 + 0.12 * Math.sin(tw.t * 3); beacon.children[1].scale.setScalar(1 + 0.15 * Math.sin(tw.t * 3)); }
    navT -= dt; if (navT > 0) return; navT = 0.35;
    const wp = wpPos(); if (!wp) return;
    if (Math.hypot(wp[0] - P.x, wp[1] - P.z) < 4.5) { const nm = R.S.waypoint.name; R.clearWaypoint(); R.toast('到了：' + nm); R.sfx && R.sfx('pick'); return; }
    updateRoute();
  };
  // 雷達旁邊：目的地和距離
  const hud0 = R.townHud;
  R.townHud = (force, dt) => {
    hud0(force, dt);
    let el = $('r-wp'); const map = $('r-map');
    if (!el && map) { el = document.createElement('div'); el.id = 'r-wp'; el.className = 'glass'; map.insertAdjacentElement('afterend', el); }
    if (!el) return; const wp = R.S && R.S.waypoint;
    el.hidden = !wp || !!W.run; if (wp) el.textContent = '◆ ' + wp.name + (route ? '・' + Math.round(routeLen() * S) + ' 公尺' : '');
  };
  // 下遺跡：雷達換回原本的方形小地圖，不顯示目的地
  const sr0 = R.startRun;
  R.startRun = id => { const el = $('r-wp'); if (el) el.hidden = true; sizeRadar(false); return sr0(id); };
})(window.R);
