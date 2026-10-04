// 技能點・天賦的新畫面（2026-10-04 作者畫的草圖：左邊「技能」一列一列〔圖示、名字、★、熟練度〕；中間是天賦樹的圖
//   〔上面根基三個 → 線分到三條道 □—□—□ → 每條道分兩支 → 奧義，最下面一條★歷練★〕；右邊是點到的那一格：大圖示、0／5、說明。
//   「技能那邊可以多個技能圖標，奧義也是」）
// - 資料、規則都不變：點數照 skillpoints.js，天賦樹的規則照 talenttree.js（R.TALENT_TREE、R.talentWhy、R.talentAdd），技能的圖示用快捷欄那一套（hud2.js 的 R.skillIconURL）。
// - 這裡只把畫面換掉：包 R.skillPoints，原本畫好以後整個換成三欄；下面那一排按鈕（重新分配、關上）原封不動搬過來。
// - 點樹上的一格 → 右邊顯示那一格，「+1」在右邊；點左邊的技能 → 右邊顯示技能（冷卻、魔力、熟練度）。
// - 窄的畫面（手機）：樹在上、說明卡黏在下面、技能在最後。
// 放在 talenttree.js、hud2.js 後面。
(function (R) {
  const S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  let sel = null;   // { k: 'tal' | 'skill', id }

  // ---------- 天賦的圖示（16×16 點陣，放大不糊） ----------
  const cache = {};
  const tIcon = id => {
    if (cache[id]) return cache[id];
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
    const P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const ln = (x0, y0, x1, y1, col, w) => { x.strokeStyle = col; x.lineWidth = w || 1.5; x.lineCap = 'square'; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
    const circ = (a, b, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
    const ring = (a, b, r, col, w, s0, s1) => { x.strokeStyle = col; x.lineWidth = w || 1.5; x.beginPath(); x.arc(a, b, r, s0 || 0, s1 == null ? 7 : s1); x.stroke(); };
    const poly = (pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
    const heart = (col, hi) => { circ(5.5, 6, 3, col); circ(10.5, 6, 3, col); poly([[2.6, 7.2], [13.4, 7.2], [8, 13.6]], col); P(4, 4, 2, 1, hi); };
    const shield = (col, rim) => { poly([[3, 3], [13, 3], [13, 8], [8, 14], [3, 8]], rim); poly([[4.5, 4.5], [11.5, 4.5], [11.5, 7.8], [8, 12], [4.5, 7.8]], col); };
    const orb = (a, b) => { circ(8, 8, 5.5, a); circ(8, 8, 3.6, b); P(5, 5, 2, 2, '#E8F0FF'); };
    const star = (cx, cy, r, col) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } poly(pts, col); };
    const up = (y, col) => { ln(4, y + 3, 8, y - 1, col, 2); ln(8, y - 1, 12, y + 3, col, 2); };
    switch (id) {
      case 'T_vit': heart('#D84A4A', '#FF9A9A'); break;
      case 'T_vit2': heart('#B83A3A', '#FF8A8A'); P(10, 1, 2, 6, '#FFFFFF'); P(8, 3, 6, 2, '#FFFFFF'); break;
      case 'T_str': P(4, 6, 8, 7, '#E0A070'); [5, 7, 9].forEach(a => P(a, 5, 2, 3, '#F0B880')); P(4, 9, 8, 1, '#A86A40'); P(3, 8, 2, 4, '#E0A070'); P(5, 13, 6, 2, '#8A4A2A'); break;
      case 'T_wis': orb('#3A6ADA', '#6A9AFF'); break;
      case 'T_reach': ln(3, 13, 11, 5, '#C8CCD4', 2); P(2, 12, 3, 3, '#8A5A2A'); poly([[15, 1], [9, 3], [13, 7]], '#E8C04A'); ln(5, 6, 3, 8, '#E8C04A', 1); ln(10, 11, 8, 13, '#E8C04A', 1); break;   // 伸展：劍往前伸、金色的箭頭
      case 'T_acc': ring(8, 8, 5, '#FF6A5A', 1.5); ln(8, 1, 8, 5, '#FF6A5A', 1.5); ln(8, 11, 8, 15, '#FF6A5A', 1.5); ln(1, 8, 5, 8, '#FF6A5A', 1.5); ln(11, 8, 15, 8, '#FF6A5A', 1.5); P(7, 7, 2, 2, '#FFE0A0'); break;
      case 'T_fat': star(8, 8, 7, '#FF4A3A'); circ(8, 8, 2, '#FFF0C0'); break;
      case 'T_pen': P(9, 2, 3, 12, '#8A8E96'); P(10, 2, 1, 12, '#B8BCC4'); ln(1, 8, 14, 8, '#E8D8B0', 1.5); poly([[15, 8], [12, 5.5], [12, 10.5]], '#E8E0D0'); ln(1, 6.5, 3, 8, '#C84A3A', 1); ln(1, 9.5, 3, 8, '#C84A3A', 1); break;
      case 'T_spd': ln(2, 5, 11, 5, '#BFF0FF', 1.5); ring(11, 7, 2, '#BFF0FF', 1.5, -Math.PI / 2, Math.PI / 2); ln(4, 9, 13, 9, '#8AD8F0', 1.5); ln(2, 12.5, 9, 12.5, '#BFF0FF', 1.5); break;
      case 'T_eva': [3, 7, 11].forEach((a, i) => { ln(a, 4, a + 3, 8, i === 2 ? '#FFFFFF' : '#7AC8E0', 2); ln(a + 3, 8, a, 12, i === 2 ? '#FFFFFF' : '#7AC8E0', 2); }); break;
      case 'T_capA1': [-0.9, -0.45, 0, 0.45, 0.9].forEach(a => { ln(8, 14, 8 + Math.sin(a) * 11, 14 - Math.cos(a) * 11, '#D8DEE6', 1.5); P(Math.round(8 + Math.sin(a) * 11) - 1, Math.round(14 - Math.cos(a) * 11) - 1, 2, 2, '#FFD27A'); }); P(6, 13, 4, 3, '#8A5A2A'); break;
      case 'T_str2': ln(4, 13, 10, 7, '#8A5A34', 2); P(7, 2, 7, 6, '#8A8E96'); P(7, 2, 7, 2, '#B8BCC4'); break;
      case 'T_brk': shield('#8A8E96', '#4A4E56'); ln(8, 3, 6.5, 7, '#1A1A1E', 1.5); ln(6.5, 7, 9.5, 9, '#1A1A1E', 1.5); ln(9.5, 9, 8, 14, '#1A1A1E', 1.5); break;
      case 'T_capA2': P(2, 6, 12, 4, '#6A6E76'); P(2, 6, 12, 1, '#9A9EA6'); ln(2, 15, 14, 1, '#FFFFFF', 2); ln(3, 15, 15, 1, '#FFD27A', 1); P(7, 6, 2, 4, '#1A1A1E'); break;
      case 'T_tou': shield('#4A7ACA', '#C8D0DC'); P(7, 5, 2, 6, '#C8D0DC'); break;
      case 'T_rec': ring(8, 8, 5, '#7AE08A', 1.5, 0.3, 5.2); ring(8, 8, 2.5, '#BFF0C8', 1.5, 2, 6.6); P(12, 3, 2, 2, '#7AE08A'); break;
      case 'T_def': for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) P(1 + k * 5 + (r % 2 ? 2 : 0), 2 + r * 3.3, 4, 2.6, r % 2 ? '#7A7E86' : '#9A9EA6'); break;
      case 'T_tou2': shield('#2A4A7A', '#C8D0DC'); up(7, '#FFD27A'); up(10, '#FFD27A'); break;
      case 'T_capB1': poly([[1, 14], [8, 2], [15, 14]], '#5A6A8A'); poly([[5.5, 8], [8, 2], [10.5, 8], [9, 7], [8, 8.5], [7, 7]], '#F0F4FA'); poly([[9, 14], [12, 8], [15, 14]], '#4A5874'); break;
      case 'T_rec2': P(6, 2, 4, 12, '#5AD06A'); P(2, 6, 12, 4, '#5AD06A'); P(7, 3, 2, 10, '#BFF0C8'); break;
      case 'T_hp3': ln(8, 15, 8, 7, '#5A9A3A', 1.5); poly([[8, 9], [3, 5], [2, 9]], '#7AC84A'); poly([[8, 7], [13, 3], [14, 7]], '#9AE06A'); circ(8, 5, 1.5, '#FFE08A'); break;
      case 'T_capB2': ring(8, 5, 3, '#FFD27A', 2); P(7, 8, 2, 7, '#FFD27A'); P(3, 9, 10, 2, '#FFD27A'); break;
      case 'T_med': ring(8, 6, 6, '#B88AFF', 1.5, 0.5, Math.PI - 0.5); [4, 8, 12].forEach(a => ln(a, 11, a + (a - 8) * 0.25, 13.5, '#B88AFF', 1)); P(7, 3, 2, 2, '#E8D8FF'); break;
      case 'T_mpr': poly([[8, 1.5], [12.5, 9], [3.5, 9]], '#4A8AFF'); circ(8, 10, 4.5, '#4A8AFF'); P(6, 8, 2, 3, '#BFD8FF'); break;
      case 'T_amp': circ(8, 8, 1.8, '#E8D8FF'); ring(8, 8, 4, '#B88AFF', 1.2); ring(8, 8, 6.5, '#8A5AD8', 1.2); break;
      case 'T_med2': poly([[3, 2], [13, 2], [8, 8]], '#B88AFF'); poly([[3, 14], [13, 14], [8, 8]], '#8A5AD8'); P(2, 1, 12, 1.5, '#E8D8FF'); P(2, 13.5, 12, 1.5, '#E8D8FF'); P(7, 10, 2, 3, '#FFE08A'); break;
      case 'T_mpr2': P(3, 11, 10, 4, '#3A5A9A'); P(2, 10, 12, 1.5, '#6A8ACA'); ln(8, 10, 8, 3, '#8AC8FF', 2); circ(5, 5, 1.2, '#BFE0FF'); circ(11, 5, 1.2, '#BFE0FF'); circ(8, 2, 1.3, '#FFFFFF'); break;
      case 'T_capC1': ring(8, 8, 5.5, '#F0EEE8', 3, 0.6, 5.9); P(11, 3, 2, 2, '#1A1A1E'); break;
      case 'T_wis2': circ(8, 8, 6, '#3A1A5A'); circ(8, 8, 4, '#6A2AAA'); circ(8, 8, 1.8, '#E0B8FF'); ring(8, 8, 6.5, '#B88AFF', 1); break;
      case 'T_amp2': up(5, '#D8B8FF'); up(9, '#B88AFF'); up(13, '#8A5AD8'); break;
      case 'T_capC2': poly([[1, 8], [8, 3], [15, 8], [8, 13]], '#F0E6C8'); circ(8, 8, 3, '#C88A2A'); circ(8, 8, 1.4, '#1A1A1E'); [[8, 0], [2, 2], [14, 2]].forEach(([a, b]) => ln(8, 3, a, b, '#FFD27A', 1)); break;
      case 'T_xp': star(8, 8.5, 7, '#E8C04A'); star(8, 8.5, 3.5, '#FFF0B0'); break;
      case 'T_trA1': case 'T_trA2': case 'T_trB1': case 'T_trB2': case 'T_trC1': case 'T_trC2': {   // 增益減益參半：天秤，左邊綠、右邊紅
        const c = { A: '#FF8A7A', B: '#8AC0FF', C: '#C8A8FF' }[id[4]]; ln(8, 2, 8, 13, '#C8C0B0', 1.5); ln(2, 4, 14, 4, c, 1.5); P(5, 13, 6, 2, '#8A8070');
        ln(2, 4, 1, 9, '#7AE07A', 1); ln(2, 4, 4, 9, '#7AE07A', 1); P(0, 9, 5, 2, '#7AE07A'); ln(14, 4, 12, 9, '#FF6A5A', 1); ln(14, 4, 15, 9, '#FF6A5A', 1); P(11, 9, 5, 2, '#FF6A5A'); break; }
      default: star(8, 8, 6, '#C8C0B0');
    }
    return (cache[id] = c.toDataURL());
  };

  // ---------- 樹的位置（x：寬度的百分比；y：第幾列） ----------
  const ROW = 62, XPAD = 8.333;
  const layout = T => {
    const out = [], lines = [], colX = [100 / 6, 50, 500 / 6];
    // 分支的格數（2026-10-04 多了增益減益參半的一格）：奧義、歷練跟著往下
    const M = Math.max(2, ...T.PATHS.map(p => Math.max(...p.subs.map(s => s.nodes.length)))), capY = 5.45 + M, xpY = capY + 1.1;   // 兩格時：奧義 7.45、歷練 8.55（原本的位置）
    T.ROOT.forEach((n, i) => out.push({ n, x: 50 + (i - (T.ROOT.length - 1) / 2) * 15, y: 0.55, col: '#E8C04A', where: '根基' }));
    const hub = [50, 1.35];
    T.ROOT.forEach((n, i) => lines.push({ a: [50 + (i - (T.ROOT.length - 1) / 2) * 15, 0.55], b: hub, to: null, root: 1 }));
    T.PATHS.forEach((p, pi) => {
      const px = colX[pi];
      p.nodes.forEach((n, i) => { out.push({ n, x: px, y: 2.1 + i, col: p.c, where: p.n }); lines.push(i ? { a: [px, 1.1 + i], b: [px, 2.1 + i], to: n } : { a: hub, b: [px, 2.1], to: n }); });
      const split = [px, 4.65];
      p.subs.forEach((s, si) => {
        const sx = px + (si ? XPAD : -XPAD);
        s.nodes.forEach((n, i) => { out.push({ n, x: sx, y: 5.3 + i, col: p.c, where: p.n + '・' + s.n }); lines.push(i ? { a: [sx, 4.3 + i], b: [sx, 5.3 + i], to: n } : { a: [px, 4.1], b: split, to: n, half: 1 }, ...(i ? [] : [{ a: split, b: [sx, 5.3], to: n }])); });
        out.push({ n: s.cap, x: sx, y: capY, col: p.c, where: p.n + '・' + s.n, cap: 1 }); lines.push({ a: [sx, 4.3 + s.nodes.length], b: [sx, capY], to: s.cap });
        lines.push({ a: [sx, capY], b: [sx, xpY], to: T.XP, faint: 1 });
      });
    });
    return { nodes: out, lines, h: xpY + 0.65, xpY };
  };

  // ---------- 畫面 ----------
  const stOf = () => S().classes[S().cls];
  const tree = T => { const t = {}; [T.ROOT, ...T.PATHS.map(p => p.nodes.concat(...p.subs.map(s => s.nodes.concat([s.cap])))), [T.XP]].forEach(a => a.forEach(n => { t[n.id] = n; })); return t; };
  // 奧義只能學一個：學了一個，別的奧義不管分支開了沒都標成 off（外框暗、打 X）
  const capIds = () => (R.TALENT_TREE ? R.TALENT_TREE.PATHS.flatMap(p => p.subs.map(sb => sb.cap.id)) : []);
  const capTaken = n => { const ids = capIds(); return ids.includes(n.id) && ids.some(id => id !== n.id && R.talentLv(id) > 0); };
  const stateOf = n => { const v = R.talentLv(n.id), w = R.talentWhy(n.id), full = v >= n.mx; return { v, w, full, cls: (v ? ' on' : '') + (full ? ' full' : '') + (!w && !full ? ' open' : '') + (w && !full ? ' lock' : '') + ((w && w.indexOf('奧義只能學一個') >= 0) || (!v && capTaken(n)) ? ' off' : '') }; };
  const skillGroups = () => {
    const cls = S().cls, st = stOf(), list = R.skillsLearned ? R.skillsLearned(cls) : [];
    return [null, st.adv].filter((v, i) => i === 0 || v).map(adv => {
      const ids = list.filter(id => { const L = R.SKILL_LIB && R.SKILL_LIB[id], a = L ? L.adv || null : ((R.ADV[cls] || []).some(x => x.skill === id) ? st.adv : null); return a === adv; });
      const an = adv && (R.ADV[cls] || []).find(x => x.id === adv);
      return { name: adv ? '轉職・' + (an ? an.name : adv) : '基本・' + R.CLASSES[cls].name, ids };
    }).filter(g => g.ids.length);
  };
  const profOf = id => { const PROF = R.SKILL_PROF || [20, 60, 140, 260, 450], r = R.skillRank ? R.skillRank(id) : 0, u = R.skillProf ? R.skillProf(id) : 0, lo = r ? PROF[r - 1] : 0, hi = PROF[Math.min(r, PROF.length - 1)]; return { r, u, hi, k: r >= 5 ? 1 : Math.max(0, Math.min(1, (u - lo) / (hi - lo))) }; };
  const stars = r => '<span class="tu-st">' + '★'.repeat(r) + '<i>' + '☆'.repeat(5 - r) + '</i></span>';
  const skillsHtml = () => '<h3>技能</h3>' + skillGroups().map(g => '<p class="tu-g">' + esc(g.name) + '</p>' + g.ids.map(id => {
    const sk = R.SKILLS[id], f = profOf(id), ic = R.skillIconURL ? R.skillIconURL(id) : '';
    return '<button type="button" class="tu-sk' + (sel && sel.k === 'skill' && sel.id === id ? ' sel' : '') + '" data-tus="' + id + '"><img src="' + ic + '" alt=""><b>' + esc(sk.name) + '</b>' + stars(f.r) + '<span class="tu-bar"><i style="width:' + Math.round(f.k * 100) + '%"></i></span></button>';
  }).join('')).join('');
  const treeHtml = T => {
    const L = layout(T), H = Math.round(L.h * ROW), vb = L.h * 10;
    const lit = n => { if (!n) return true; const s = stateOf(n); return s.v > 0 || !s.w || s.full; };
    const svg = '<svg class="tu-lines" viewBox="0 0 100 ' + vb + '" preserveAspectRatio="none" aria-hidden="true">' + L.lines.map(l => '<line x1="' + l.a[0] + '" y1="' + l.a[1] * 10 + '" x2="' + l.b[0] + '" y2="' + l.b[1] * 10 + '" class="' + (lit(l.to) ? 'lit' : '') + (l.faint ? ' faint' : '') + '"/>').join('') + '</svg>';
    const nodes = L.nodes.map(o => { const s = stateOf(o.n); return '<button type="button" class="tu-n' + s.cls + (o.cap ? ' cap' : '') + (o.n.tr ? ' tr' : '') + (sel && sel.k === 'tal' && sel.id === o.n.id ? ' sel' : '') + '" data-tun="' + o.n.id + '" style="left:' + o.x + '%;top:' + Math.round(o.y * ROW) + 'px;--tc:' + o.col + '" title="' + esc(o.n.n) + '"><img src="' + tIcon(o.n.id) + '" alt=""><i>' + s.v + (o.n.mx > 99 ? '' : '/' + o.n.mx) + '</i></button>'; }).join('');
    const xs = stateOf(T.XP);
    const xp = '<button type="button" class="tu-xp' + xs.cls + (sel && sel.id === T.XP.id ? ' sel' : '') + '" data-tun="' + T.XP.id + '" style="top:' + Math.round(L.xpY * ROW) + 'px"><span>★</span><b>歷練</b><em>' + xs.v + '</em><small>' + esc(T.XP.d) + '／級</small><span>★</span></button>';
    return '<div class="tu-hd"><b>根基</b></div><div class="tu-canvas" style="height:' + (H + 30) + 'px">' + svg + nodes + xp
      + T.PATHS.map((p, i) => '<span class="tu-pl" style="left:' + [100 / 6, 50, 500 / 6][i] + '%;top:' + Math.round(1.55 * ROW) + 'px;--tc:' + p.c + '">' + esc(p.n) + '</span>' + p.subs.map((s, si) => '<span class="tu-sl" style="left:' + ([100 / 6, 50, 500 / 6][i] + (si ? XPAD : -XPAD)) + '%;top:' + Math.round(4.85 * ROW) + 'px;--tc:' + p.c + '">' + esc(s.n) + '</span>').join('')).join('')
      + '</div>';
  };
  const detailHtml = (T, BY) => {
    const st = stOf(), free = R.spFree(st);
    if (sel && sel.k === 'skill' && R.SKILLS[sel.id]) {
      const sk = R.SKILLS[sel.id], f = profOf(sel.id), lib = !!(R.SKILL_LIB && R.SKILL_LIB[sel.id]);
      return '<div class="tu-dt" style="--tc:#E8C04A"><div class="tu-big"><img src="' + (R.skillIconURL ? R.skillIconURL(sel.id) : '') + '" alt=""></div><h4>' + esc(sk.name) + '</h4><div class="tu-lv">' + stars(f.r) + '</div><hr>'
        + '<p>' + esc(sk.desc || '') + '</p><p class="tu-meta">冷卻 ' + (sk.cd || 0) + ' 秒・魔力 ' + (sk.mp || 0) + '</p>'
        + '<p class="tu-meta">熟練度 ' + f.u + (f.r >= 5 ? '（滿星）' : '／' + f.hi + ' 次升到 ★' + (f.r + 1)) + '</p>'
        + '<p class="tu-meta">' + (f.r ? '現在：冷卻 −' + 5 * f.r + '%' + (lib ? '、傷害 +' + 12 * f.r + '%' : '') : '還沒熟練') + '（每一星冷卻 −5%' + (lib ? '、傷害 +12%' : '') + '；技能是用越多越熟練，不花點數）</p></div>';
    }
    const n = BY[sel && sel.id] || T.ROOT[0], s = stateOf(n), o = layout(T).nodes.find(q => q.n === n), col = o ? o.col : '#E8C04A';
    return '<div class="tu-dt' + (o && o.cap ? ' cap' : '') + '" style="--tc:' + col + '"><div class="tu-big"><img src="' + tIcon(n.id) + '" alt=""></div><h4>' + esc(n.n) + '</h4><div class="tu-lv">' + s.v + (n.mx > 99 ? ' 級' : ' ／ ' + n.mx) + '</div><hr>'
      + (n.tr ? '<p>每級：<span class="tu-pos">' + esc(n.d.split('｜')[0]) + '</span><br><span class="tu-neg">代價：' + esc(n.d.split('｜')[1] || '') + '</span></p>' : '<p>每級：' + esc(n.d) + '</p>') + '<p class="tu-meta">' + esc(o ? o.where : '歷練') + (o && o.cap ? '・奧義只能學一個' : '') + '</p>'
      + (s.full ? '<p class="tu-ok">滿級</p>' : s.w ? '<p class="tu-why">' + esc(s.w) + '</p>' : '<button type="button" class="btn pri" data-tuadd="' + n.id + '"' + (free > 0 ? '' : ' disabled') + '>+1' + (free > 0 ? '' : '（沒有點數）') + '</button>')
      + '</div>';
  };
  const build = (where, host) => {
    const T = R.TALENT_TREE; if (!T || !host) return;
    const BY = tree(T), st = stOf(), cls = S().cls, free = R.spFree(st);
    if (!sel || (sel.k === 'tal' && !BY[sel.id]) || (sel.k === 'skill' && !R.SKILLS[sel.id])) { const first = [T.ROOT, ...T.PATHS.map(p => p.nodes)].flat().find(n => !R.talentWhy(n.id) && R.talentLv(n.id) < n.mx); sel = { k: 'tal', id: (first || T.ROOT[0]).id }; }
    const cb = host.querySelector('[data-close]'), row = cb && cb.closest('.row'); if (row) row.remove();
    const used = R.spTotal(st) - free;
    host.innerHTML = '<div class="tu-root"><div class="tu-head"><h2>技能點・天賦・' + esc(R.clsName(cls)) + ' Lv ' + st.lv + '</h2><span class="tu-pts">可用 <b>' + free + '</b> 點<small>（共 ' + R.spTotal(st) + '，用掉 ' + used + '）</small></span></div>'
      + '<details class="tu-help"><summary>怎麼點</summary><p class="note">等級幾級就有幾點（每升一級 +1）' + (st.lv >= R.LV_CAP ? '；滿級之後每攢滿一級的經驗再 1 點' : '') + '，全部用在天賦；每個武器類別的點數分開算。技能不花點數：用越多越熟練，每一星冷卻 −5%（技能書的技能傷害再 +12%）。</p>'
      + '<p class="note">天賦樹：根基投滿 ' + T.NEED_PATH + ' 點開三條道；一條道投滿 ' + T.NEED_SUB + ' 點開它的兩個分支；分支投滿 ' + T.NEED_CAP + ' 點開它的奧義。道和分支都可以點好幾條，<b>奧義只能學一個</b>。學的那個奧義點滿以後，多的點數可以放進最下面的「歷練」。要重新分配，到公會的武器登記那裡。</p></details>'
      + '<div class="tu-cols"><section class="tu-skills">' + skillsHtml() + '</section><section class="tu-tree">' + treeHtml(T) + '</section><section class="tu-side">' + detailHtml(T, BY) + '</section></div></div>';
    if (row) host.appendChild(row);
    const again = () => R.skillPoints(where, true);
    host.querySelectorAll('[data-tun]').forEach(b => { b.onclick = () => { sel = { k: 'tal', id: b.dataset.tun }; again(); }; });
    host.querySelectorAll('[data-tus]').forEach(b => { b.onclick = () => { sel = { k: 'skill', id: b.dataset.tus }; again(); }; });
    host.querySelectorAll('[data-tuadd]').forEach(b => { b.onclick = () => { if (R.talentAdd(b.dataset.tuadd)) { R.sfx && R.sfx('pick'); again(); } }; });
  };
  const scrolls = () => [$('hub-sheet'), $('r-sheet'), document.scrollingElement].filter(Boolean).map(el => [el, el.scrollTop]);
  const sp0 = R.skillPoints;
  // 2026-10-04 作者：滑桿直接加在技能那一側，天賦樹跟細節欄位置固定——寬的畫面：技能那一欄的高度跟天賦樹一樣、自己捲（整頁不用捲）
  const fitSkills = () => { const sk = document.querySelector('.tu-skills'), tr = document.querySelector('.tu-tree'); if (!sk || !tr) return; if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) { sk.style.maxHeight = ''; return; } sk.style.maxHeight = tr.offsetHeight + 'px'; };
  R.skillPoints = (where, keep) => {
    const sc = keep && scrolls(), sk0 = document.querySelector('.tu-skills'), skY = keep && sk0 ? sk0.scrollTop : 0, r = sp0(where, keep);
    try { if (S() && !(R.W && R.W.run)) build(where === 'hub' ? 'hub' : 'town', where === 'hub' ? $('hub-sheet') : $('sp-host')); fitSkills(); const sk = document.querySelector('.tu-skills'); if (sk) sk.scrollTop = skY; } catch (e) { console.warn('[talentui]', e); }
    if (sc) sc.forEach(([el, y]) => { el.scrollTop = y; });
    return r;
  };
  window.addEventListener('resize', fitSkills);

  const css = document.createElement('style');
  css.textContent = [
    '#r-sheet:has(.tu-root),#hub-sheet:has(.tu-root){width:min(1180px,100%);max-height:min(92dvh,900px)}',
    '.tu-head{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}.tu-head h2{margin:0}.tu-pts{margin-left:auto;color:var(--dim)}.tu-pts b{font-size:20px;color:var(--gold)}.tu-pts small{margin-left:4px}',
    '.tu-help summary{cursor:pointer;color:var(--dim);font-size:13px;margin:4px 0}',
    '.tu-cols{display:grid;grid-template-columns:250px minmax(330px,1fr) 250px;gap:10px;align-items:start;margin:8px 0}',
    '.tu-cols>section{background:rgba(0,0,0,.18);border:1px solid var(--line);border-radius:10px;padding:8px}',
    '.tu-skills h3{margin:0 0 4px}.tu-g{margin:8px 0 4px;font-size:12px;color:var(--dim)}',
    '.tu-sk{display:grid;grid-template-columns:34px 1fr auto;grid-template-rows:auto auto;gap:2px 8px;align-items:center;width:100%;text-align:left;background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:5px 7px;margin-bottom:5px;color:inherit;cursor:pointer;font:inherit}',
    '.tu-sk img{grid-row:1/3;width:32px;height:32px;image-rendering:pixelated;background:#0E0C12;border:1px solid #4A4450;border-radius:6px}',
    '.tu-sk b{font-size:13px}.tu-sk .tu-st{font-size:11px}.tu-sk .tu-bar{grid-column:2/4}.tu-sk.sel,.tu-sk:hover{border-color:var(--gold)}',
    '.tu-st{color:#E8C04A;letter-spacing:1px}.tu-st i{font-style:normal;color:#5A5260}',
    '.tu-bar{display:block;height:5px;background:#2A2430;border-radius:3px;overflow:hidden}.tu-bar i{display:block;height:100%;background:linear-gradient(90deg,#B8902A,#F0D070)}',
    '.tu-tree{position:sticky;top:0;overflow:hidden}.tu-hd{text-align:center;font-family:var(--serif);color:#E8C04A;font-size:13px}',
    '.tu-canvas{position:relative;margin:0 4px}',
    '.tu-lines{position:absolute;inset:0;width:100%;height:calc(100% - 30px);pointer-events:none}',
    '.tu-lines line{stroke:#3A3440;stroke-width:3;vector-effect:non-scaling-stroke}.tu-lines line.lit{stroke:#C8A040}.tu-lines line.faint{stroke-dasharray:3 4;opacity:.6}',
    '.tu-n{position:absolute;transform:translate(-50%,-50%);width:46px;height:46px;padding:0;border-radius:8px;background:#141018;border:2px solid #4A4450;cursor:pointer;display:grid;place-items:center;z-index:1}',
    '.tu-n img{width:32px;height:32px;image-rendering:pixelated;filter:grayscale(.8) brightness(.6)}',
    '.tu-n i{position:absolute;right:-6px;bottom:-8px;font-style:normal;font-size:10px;font-weight:700;background:#141018;border:1px solid #4A4450;border-radius:6px;padding:0 3px;color:var(--dim)}',
    '.tu-n.open{border-color:var(--tc);box-shadow:0 0 10px -2px var(--tc)}.tu-n.open img,.tu-n.on img{filter:none}',
    '.tu-n.on{border-color:var(--tc);background:color-mix(in srgb,var(--tc) 22%,#141018)}.tu-n.on i{color:var(--tc);border-color:var(--tc)}',
    '.tu-n.full{border-color:#E8C04A;box-shadow:0 0 0 2px rgba(232,192,74,.25)}.tu-n.full i{color:#E8C04A;border-color:#E8C04A}',
    '.tu-n.cap{width:52px;height:52px;border-radius:50%;border-width:3px;border-color:color-mix(in srgb,var(--tc) 60%,#E8C04A)}.tu-n.cap img{width:34px;height:34px}',
    '.tu-n.tr{border-style:dashed}.tu-n.tr::before{content:"±";position:absolute;left:-6px;top:-8px;font-size:10px;font-weight:700;line-height:13px;color:#FF9A6A;background:#141018;border:1px solid #6A4A40;border-radius:6px;padding:0 3px;z-index:1}.tu-pos{color:#9AE07A}.tu-neg{color:#FF8A6A}',
    // 奧義只能學一個：學了一個以後，別的奧義外框暗下去、打一個 X（2026-10-04 作者）
    '.tu-n.off{opacity:1!important;border-color:#3A3440!important;box-shadow:none!important;background:#100C12!important}.tu-n.off img{filter:grayscale(1) brightness(.35)!important}.tu-n.off i{opacity:.45}.tu-n.off::after{content:"✕";position:absolute;inset:0;display:grid;place-items:center;font:900 26px/1 sans-serif;color:#E0604A;text-shadow:0 0 3px #000,0 0 6px #000;pointer-events:none}',
    '.tu-skills{overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}',
    '.tu-n.sel{outline:3px solid #FFF0C0;outline-offset:3px}.tu-n:hover{transform:translate(-50%,-50%) scale(1.07)}',
    '.tu-pl,.tu-sl{position:absolute;transform:translate(-50%,-50%);font-family:var(--serif);font-weight:700;font-size:12.5px;color:var(--tc);background:var(--bg2);padding:0 6px;border-radius:6px;white-space:nowrap;z-index:1}.tu-sl{font-size:11px;font-weight:400}',
    '.tu-xp{position:absolute;left:2%;right:2%;transform:translateY(-50%);display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:9px;background:#18141C;border:2px solid #4A4450;color:var(--dim);cursor:pointer;font:inherit}',
    '.tu-xp span{color:#E8C04A;font-size:16px}.tu-xp b{font-family:var(--serif);color:var(--ink)}.tu-xp em{font-style:normal;font-weight:700;color:#E8C04A}.tu-xp small{margin-left:auto;margin-right:auto;font-size:11px}',
    '.tu-xp.open{border-color:#E8C04A;box-shadow:0 0 10px -2px #E8C04A}.tu-xp.sel{outline:3px solid #FFF0C0;outline-offset:2px}',
    '.tu-side{position:sticky;top:0}',
    '.tu-dt{display:grid;gap:6px;justify-items:center;text-align:center}.tu-dt h4{margin:2px 0 0;font-family:var(--serif);font-size:17px;color:var(--tc)}',
    '.tu-big{width:96px;height:96px;display:grid;place-items:center;border:3px double var(--tc);border-radius:12px;background:#0E0C12}.tu-dt.cap .tu-big{border-radius:50%}',
    '.tu-big img{width:64px;height:64px;image-rendering:pixelated}',
    '.tu-lv{font-size:22px;font-weight:700;color:var(--tc)}.tu-dt hr{width:100%;border:0;border-top:1px solid var(--line);margin:2px 0}',
    '.tu-dt p{margin:0;font-size:13px}.tu-meta{color:var(--dim);font-size:12px!important}.tu-why{color:#C8A07A}.tu-ok{color:#E8C04A}',
    '@media (max-width:900px){.tu-cols{grid-template-columns:1fr}.tu-tree{order:1;position:relative}.tu-cols>.tu-side{order:2;position:sticky;bottom:-18px;top:auto;z-index:3;background:var(--bg2);box-shadow:0 -10px 24px rgba(0,0,0,.6);max-height:42dvh;overflow:auto}.tu-skills{order:3}',
    '.tu-dt{grid-template-columns:72px 1fr;justify-items:start;text-align:left;column-gap:10px;row-gap:3px}.tu-dt>*{grid-column:2}.tu-big{grid-column:1;grid-row:1/8;align-self:start;width:68px;height:68px}.tu-big img{width:48px;height:48px}.tu-dt hr{display:none}.tu-dt h4{font-size:15px}.tu-lv{font-size:15px}',
    '.tu-n{width:40px;height:40px}.tu-n img{width:28px;height:28px}.tu-n.cap{width:46px;height:46px}}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
