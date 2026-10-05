// 技能圖示改版（作者 2026-10-05：幫我優化技能圖示；同日再調亮；同日再依職業改武器圖示；同日再調亮一次、二轉覺醒也照職業）
// 原本（hud2.js）照技能的「型」只有三十種 16×16 圖示，六百多招共用，劈砍、斬首、撕裂長得一模一樣。現在每一招自己畫一張 24×24：
// - 底：圓角方塊，顏色照技能自己的顏色（沒有就用職業的顏色），左上亮、右下暗，像一般 RPG 的技能格。
// - 中間：照技能做的事畫（斬、刺、射、爆、落雷、法陣、增益、治療、盾、衝刺、瞬移、鎖鏈、光束、砲台、波、鉤、跳、召喚、環繞、標記、吸、
//   吸取、風暴、吐息、舞、復活、十字斬、迴旋刃、架勢、拳、掌、氣、踢、棍……），顏色也照技能。
// - 職業覆寫：武術家（拳／掌／氣／踢／棍）不再用長槍、劍弧；槍手直線技改畫光束，不再長槍。
// - 角落的小徽章：燃燒、冰凍／減速、雷、暈眩、詛咒、吸血、定身、暴擊、隱身、挑釁、貫穿。
// - 上緣的小點：打幾下（段數、波數、連發）。
// - 外框：轉職技銀框、二轉技紫框、覺醒技金框＋閃光。
// 快捷欄（hud2.js 改一行）、技能點畫面（talentui.js）都用 R.skillIconURL。
// 放在 hud2.js、talentui.js 後面。
(function (R) {
  const SZ = 24, RES = 32, K = RES / SZ, cache = {};   // 畫的座標用 24，實際 32×32（快捷欄顯示 32px，不會糊）
  const hex = c => { const r = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(String(c || '')); if (r) return [+r[1], +r[2], +r[3]]; const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '')); const n = m ? parseInt(m[1], 16) : 0xC8C0B0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')'; };
  // 技能 → 畫什麼
  const BASE_KIND = { roll: 'dash', volley: 'arrow', whirl: 'spin', fireball: 'fireball', heal: 'heal', flash: 'xslash', charge: 'dash', snipe: 'snipe', element: 'shot', grenade: 'boom', homing: 'shot', trap: 'trap', hamaya: 'arrow', rage: 'rage', combo: 'spin', qijin: 'palm', meteor: 'meteor',
    flashbang: 'boom', barrage: 'shot', pin: 'arrow', leap: 'jump', quake: 'quake', warcry: 'horn', frostnova: 'frost', chain: 'bolt', smite: 'pillar', ward: 'guard', flurry: 'xslash', parry: 'parry', shieldbash: 'guard', guard: 'guard' };
  const TYPE_KIND = { shots: 'shot', shotx: 'shot', line: 'thrust', at: 'pillar', zone: 'zone', mark: 'mark', dash: 'dash', arc: 'slash', nova: 'nova', pull: 'vortex', blink: 'blink', heal: 'heal', parry: 'parry', drain: 'drain', orbit: 'orbit', reload: 'shot', turret: 'turret', hook: 'hook',
    chainx: 'bolt', wave: 'wave', storm: 'storm', boomer: 'boomer', jumpx: 'jump', beam: 'beam', breath: 'breath', aura: 'aura', xslash: 'xslash', dance: 'dance', pet: 'paw', guard: 'guard', revive: 'revive', infuse: 'infuse', buff: 'buff' };
  const SHOT_BY_CLS = { archer: 'arrow', gunner: 'shot', mage: 'orb', priest: 'orb', bard: 'note', summoner: 'orb', arraymage: 'orb', scroll: 'scroll', enchanter: 'slashwave', monk: 'qi' };
  const info = id => {
    const L = R.SKILL_LIB && R.SKILL_LIB[id], sk = R.SKILLS && R.SKILLS[id], cls = (L && L.cls) || (sk && sk.cls) || (R.S && R.S.cls) || 'warrior';
    let type = L ? L.type : null, p = L ? L.p || {} : {};
    if (type === 'combo' && p.parts && p.parts.length) { const parts = p.parts; p = Object.assign({}, ...parts.map(x => x[1] || {})); type = (parts.find(x => !['buff', 'guard'].includes(x[0])) || parts[0])[0]; }
    let kind = L ? TYPE_KIND[type] || 'star' : BASE_KIND[id] || 'star';
    if (kind === 'shot') kind = SHOT_BY_CLS[cls] || 'shot';
    if (type === 'heal' && (p.allyShield || p.shield) && !(p.pct > 0) && !(p.allies > 0)) kind = 'guard';
    if (type === 'buff') kind = p.def > 0 ? 'guard' : p.invis ? 'ghost' : p.vamp ? 'fang' : p.speed > 1 && !(p.dmg > 1) ? 'wing' : p.crit && !(p.dmg > 1) ? 'eye' : 'buff';
    if (type === 'arc' && p.arc >= 6) kind = 'spin';
    if (type === 'at' && p.waves > 1) kind = 'meteor';
    if (type === 'line' && p.width > 1.2) kind = 'beam';
    const color = p.color || (R.CLASS_GLOW && R.CLASS_GLOW[cls]) || (R.CLASSES[cls] && R.CLASSES[cls].color) || '#C8A86A';
    const n = Math.max(p.hits || 1, p.waves || 1, p.burst || 1, type === 'shots' && p.n ? Math.min(p.n, 5) : 1);
    const badges = [];
    if (p.burn || p.elem === 'fire') badges.push('burn');
    if (p.frost || p.slow || p.slowAura) badges.push('frost');
    if (p.shock) badges.push('shock');
    if (p.stun) badges.push('stun');
    if (p.curse) badges.push('curse');
    if (p.vamp || p.heal && type === 'drain') badges.push('vamp');
    if (p.root) badges.push('root');
    if (p.crit || p.crits) badges.push('crit');
    if (p.invis) badges.push('ghost');
    if (p.taunt) badges.push('taunt');
    if (p.pierce) badges.push('pierce');
    const tier = /_aw$/.test(id) ? 'aw' : /^sp2_|^a2_/.test(id) ? 'sp' : L && L.adv ? 'adv' : '';
    // 依技能 ID／職業改圖：武術家不該出現長槍、劍；槍手直線是光束不是刺
    const ID_KIND = {
      // 武術家基礎
      m_flurry: 'fist', m_step: 'dash', m_palm: 'palm', m_kick: 'kick', m_focus: 'qi', m_counter: 'parry',
      m_wave: 'qi', m_stomp: 'quake', m_breathe: 'heal', m_meteor: 'kick',
      m_dragon: 'palm', m_iron: 'guard', m_storm: 'fist', m_leap: 'kick', m_final: 'qi',
      // 拳聖
      fs_hundred: 'fist', fs_rising: 'fist', fs_iron: 'guard', fs_tiger: 'fist', fs_thousand: 'fist', fs_heaven: 'fist',
      // 棍僧
      sm_wheel: 'pole', sm_vault: 'pole', sm_sweep: 'pole', sm_pole: 'pole', sm_dragon: 'pole', sm_mountain: 'pole',
      // 內修者
      in_breath: 'heal', in_palm: 'palm', in_wave: 'qi', in_iron: 'guard', in_burst: 'nova', qijin: 'palm',
      // 外修者（術士路線，隔空掌用氣／掌）
      wx_burst: 'nova', wx_palm: 'palm', wx_shell: 'guard',
      // 二轉、覺醒（2026-10-05 作者：快捷欄上還有長槍、槍的圖——破山拳、寸勁原本畫成光束，看起來像長槍）
      sp2_monk_0: 'fist', sp2_monk_1: 'kick', sp2_monk_2: 'guard',
      a2_monk_fistsaint_0: 'fist', a2_monk_fistsaint_1: 'kick', a2_monk_staffmonk_0: 'pole', a2_monk_staffmonk_1: 'pole',
      a2_monk_inner_0: 'palm', a2_monk_inner_1: 'heal', a2_monk_waixiu_0: 'qi', a2_monk_waixiu_1: 'guard'
    };
    const bid = id.replace(/_aw$/, '');   // 覺醒技跟原本那招同一種圖（外框另外是金的）
    if (ID_KIND[id] || ID_KIND[bid]) kind = ID_KIND[id] || ID_KIND[bid];
    else if (cls === 'monk' || (R.S && R.S.cls === 'monk' && !(L && L.cls && L.cls !== 'monk'))) {
      if (['thrust', 'slash', 'xslash', 'slashwave', 'beam', 'dance', 'pillar', 'spin'].includes(kind)) kind = 'fist';
      else if (['shot', 'orb', 'arrow', 'snipe', 'wave', 'aura', 'breath'].includes(kind)) kind = 'qi';
    } else if ((cls === 'gunner' || cls === 'archer') && kind === 'thrust') kind = 'beam';
    // 現在的職業是武術家、快捷欄放的是別的職業的技能（技能書學來的）：一樣不畫長槍、槍、箭，改成拳／氣
    if (R.S && R.S.cls === 'monk' && !ID_KIND[id] && !ID_KIND[bid]) { if (['thrust', 'beam', 'slash', 'xslash', 'slashwave'].includes(kind)) kind = 'fist'; else if (['shot', 'arrow', 'snipe', 'orb'].includes(kind)) kind = 'qi'; }
    return { kind, color, n: Math.min(5, n), badges: badges.slice(0, 2), tier, key: [kind, color, n, badges.slice(0, 2).join('+'), tier].join('|') };
  };

  const draw = o => {
    const c = document.createElement('canvas'); c.width = c.height = RES; const x = c.getContext('2d'); x.scale(K, K);
    const col = mix(o.color, '#FFFFFF', 0.18), lt = mix(o.color, '#FFFFFF', 0.82), dk = mix(o.color, '#000000', 0.3), mid = mix(o.color, '#FFFFFF', 0.5);
    // 底（作者 2026-10-05：圖示太暗——底色少摻黑、中間圖案加亮；同日第二次：還是太暗，底色再亮、圖案的主色也先摻一點白）
    const bg = x.createLinearGradient(0, 0, SZ, SZ); bg.addColorStop(0, mix(o.color, '#FFFFFF', 0.22)); bg.addColorStop(0.55, mix(o.color, '#4A4258', 0.22)); bg.addColorStop(1, mix(o.color, '#2A2434', 0.4));   // 2026-10-05 作者：職業技能圖要比種族技亮
    x.fillStyle = bg; x.beginPath(); x.roundRect ? x.roundRect(0.5, 0.5, SZ - 1, SZ - 1, 4) : x.rect(0.5, 0.5, SZ - 1, SZ - 1); x.fill();
    x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(2, 2, SZ - 4, 1); x.fillRect(2, 2, 1, SZ - 4);
    x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(3, SZ - 3, SZ - 5, 1); x.fillRect(SZ - 3, 3, 1, SZ - 5);
    // 中間的圖：畫在另一張上，描邊再貼回來
    const g = document.createElement('canvas'); g.width = g.height = RES; const y = g.getContext('2d'); y.scale(K, K);
    const P = (a, b, w, h, cc) => { y.fillStyle = cc; y.fillRect(a, b, w, h); };
    const ln = (x0, y0, x1, y1, cc, w) => { y.strokeStyle = cc; y.lineWidth = w || 2; y.lineCap = 'round'; y.beginPath(); y.moveTo(x0, y0); y.lineTo(x1, y1); y.stroke(); };
    const circ = (a, b, r, cc) => { y.fillStyle = cc; y.beginPath(); y.arc(a, b, r, 0, 7); y.fill(); };
    const arc = (a, b, r, s0, s1, cc, w) => { y.strokeStyle = cc; y.lineWidth = w || 2; y.lineCap = 'round'; y.beginPath(); y.arc(a, b, r, s0, s1); y.stroke(); };
    const poly = (pts, cc) => { y.fillStyle = cc; y.beginPath(); pts.forEach(([a, b], i) => (i ? y.lineTo(a, b) : y.moveTo(a, b))); y.closePath(); y.fill(); };
    const star = (cx, cy, r, cc) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } poly(pts, cc); };
    const bolt = (s, ox, oy, cc) => poly([[13 * s + ox, 2 * s + oy], [5 * s + ox, 12 * s + oy], [11 * s + ox, 12 * s + oy], [8 * s + ox, 21 * s + oy], [18 * s + ox, 9 * s + oy], [12 * s + ox, 9 * s + oy]], cc);
    switch (o.kind) {
      case 'slash': arc(5, 19, 15, -1.45, -0.05, lt, 3); arc(5, 19, 11, -1.35, -0.15, col, 2); arc(5, 19, 7.5, -1.2, -0.3, dk, 1.5); break;
      case 'xslash': ln(5, 5, 19, 19, lt, 3); ln(19, 5, 5, 19, col, 3); ln(6, 6, 18, 18, '#FFFFFF', 1); break;
      case 'spin': arc(12, 12, 8, 0.4, 5.6, lt, 3); arc(12, 12, 5, 2.2, 7.6, col, 2); poly([[19, 8], [22, 14], [15, 13]], lt); break;
      case 'thrust': ln(3, 21, 18, 6, mix(col, '#8A6A44', 0.6), 2.5); poly([[22, 2], [14, 5], [19, 10]], lt); ln(16, 8, 20, 4, '#FFFFFF', 1); break;
      case 'slashwave': arc(2, 22, 18, -1.3, -0.25, lt, 3); arc(8, 22, 12, -1.3, -0.25, col, 2); break;
      case 'shot': ln(3, 21, 15, 9, mix(col, '#FFFFFF', 0.3), 1.5); poly([[21, 3], [13, 7], [17, 11]], lt); circ(17, 7, 2.5, col); [[6, 14], [9, 18], [4, 18]].forEach(([a, b]) => P(a, b, 1.5, 1.5, mid)); break;
      case 'snipe': circ(12, 12, 8.5, dk); arc(12, 12, 8, 0, 7, lt, 1.5); ln(12, 2, 12, 22, lt, 1.2); ln(2, 12, 22, 12, lt, 1.2); circ(12, 12, 2, '#FF6A5A'); break;
      case 'arrow': ln(3, 21, 18, 6, mix(col, '#C8A06A', 0.5), 2); poly([[22, 2], [14, 4], [20, 10]], lt); poly([[3, 21], [3, 15], [6, 18]], col); poly([[3, 21], [9, 21], [6, 18]], col); break;
      case 'orb': circ(14, 10, 6, col); circ(14, 10, 3.5, lt); circ(12, 8, 1.3, '#FFFFFF'); ln(3, 21, 9, 15, mid, 2); ln(6, 22, 10, 18, dk, 1.5); break;
      case 'note': circ(8, 17, 3.5, lt); circ(17, 15, 3.5, lt); ln(11, 17, 11, 4, lt, 2); ln(20, 15, 20, 3, lt, 2); ln(11, 4, 20, 3, col, 3); break;
      case 'scroll': P(5, 4, 14, 16, mix(col, '#F4EEDC', 0.7)); P(4, 3, 16, 3, col); P(4, 18, 16, 3, col); ln(8, 9, 16, 9, dk, 1); ln(8, 12, 15, 12, dk, 1); ln(8, 15, 13, 15, dk, 1); break;
      case 'fireball': circ(13, 11, 6.5, '#FF6A2A'); circ(13, 11, 4, '#FFD06A'); poly([[7, 8], [1, 20], [9, 15]], '#FF8A3A'); circ(14, 10, 1.6, '#FFFFFF'); break;
      case 'boom': circ(12, 13, 8, col); circ(12, 13, 5.5, lt); circ(12, 13, 3, '#FFFFFF'); [0, 1, 2, 3, 4, 5].forEach(i => { const a = i * Math.PI / 3; ln(12 + Math.cos(a) * 9, 13 + Math.sin(a) * 9, 12 + Math.cos(a) * 11.5, 13 + Math.sin(a) * 11.5, lt, 1.5); }); break;
      case 'nova': [0, 1, 2, 3, 4, 5, 6, 7].forEach(i => { const a = i * Math.PI / 4; ln(12 + Math.cos(a) * 4.5, 12 + Math.sin(a) * 4.5, 12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, i % 2 ? col : lt, 2); }); circ(12, 12, 3.5, '#FFFFFF'); break;
      case 'quake': P(2, 16, 20, 4, dk); ln(4, 16, 9, 11, lt, 2); ln(9, 11, 13, 16, lt, 2); ln(13, 16, 17, 9, lt, 2); ln(17, 9, 20, 16, lt, 2); poly([[10, 2], [14, 2], [12, 8]], col); break;
      case 'pillar': P(9, 0, 6, 20, col); P(11, 0, 2, 20, lt); y.globalAlpha = 0.7; circ(12, 20, 7, mid); y.globalAlpha = 1; arc(12, 20, 8, Math.PI, 2 * Math.PI, lt, 1.5); break;
      case 'meteor': [[6, 3], [12, 1], [17, 5]].forEach(([a, b], i) => { ln(a - 3, b - 3, a + 3, b + 7, i === 1 ? lt : col, 2); circ(a + 4, b + 9, 2.5, i === 1 ? '#FFFFFF' : lt); }); P(2, 20, 20, 2, dk); break;
      case 'zone': y.save(); y.scale(1, 0.55); circ(12, 28, 10, mix(col, '#000000', 0.3)); arc(12, 28, 10, 0, 7, lt, 2); arc(12, 28, 6, 0, 7, col, 1.5); y.restore(); [[8, 8], [14, 5], [17, 10]].forEach(([a, b]) => P(a, b, 2, 2, lt)); break;
      case 'mark': arc(12, 12, 8, 0, 7, col, 2); arc(12, 12, 4, 0, 7, lt, 2); [[12, 1, 12, 5], [12, 19, 12, 23], [1, 12, 5, 12], [19, 12, 23, 12]].forEach(([a, b, c2, d2]) => ln(a, b, c2, d2, lt, 2)); break;
      case 'vortex': for (let i = 0; i < 3; i++) arc(12, 12, 3 + i * 3, i * 1.2, i * 1.2 + 4.2, i === 1 ? lt : col, 2); circ(12, 12, 1.8, '#FFFFFF'); break;
      case 'dash': ln(2, 7, 10, 7, mid, 2); ln(1, 12, 11, 12, lt, 2); ln(3, 17, 10, 17, mid, 2); poly([[12, 5], [22, 12], [12, 19], [15, 12]], lt); break;
      case 'blink': [[12, 2], [12, 22], [2, 12], [22, 12]].forEach(([a, b]) => ln(12, 12, a, b, col, 2)); [[5, 5], [19, 19], [19, 5], [5, 19]].forEach(([a, b]) => ln(12, 12, a, b, mid, 1)); circ(12, 12, 3.5, '#FFFFFF'); break;
      case 'buff': poly([[12, 2], [21, 11], [16, 11], [16, 21], [8, 21], [8, 11], [3, 11]], lt); poly([[12, 5], [17, 10], [14, 10], [14, 19], [10, 19], [10, 10], [7, 10]], col); break;
      case 'rage': poly([[12, 1], [17, 9], [21, 6], [19, 21], [5, 21], [3, 6], [7, 9]], '#E83A2A'); poly([[12, 7], [15, 12], [17, 10], [16, 19], [8, 19], [7, 10], [9, 12]], '#FFB04A'); break;
      case 'horn': poly([[3, 9], [9, 9], [17, 3], [17, 21], [9, 15], [3, 15]], lt); [0, 1].forEach(i => arc(17, 12, 4 + i * 3, -0.8, 0.8, col, 1.5)); break;
      case 'wing': poly([[3, 18], [8, 6], [12, 4], [10, 10], [16, 6], [13, 13], [21, 11], [12, 18]], lt); ln(3, 18, 14, 16, col, 1.5); break;
      case 'eye': y.save(); y.scale(1, 0.6); circ(12, 20, 9, lt); y.restore(); circ(12, 12, 4, col); circ(12, 12, 2, '#1A1A1E'); P(10, 10, 1.5, 1.5, '#FFFFFF'); break;
      case 'fang': poly([[5, 3], [19, 3], [17, 8], [7, 8]], lt); poly([[7, 8], [9, 8], [8, 17]], '#FFFFFF'); poly([[15, 8], [17, 8], [16, 17]], '#FFFFFF'); circ(16, 19, 2, '#C8203A'); break;
      case 'ghost': y.globalAlpha = 0.85; poly([[5, 21], [5, 10], [8, 4], [16, 4], [19, 10], [19, 21], [16, 18], [12, 21], [8, 18]], lt); y.globalAlpha = 1; circ(9.5, 11, 1.5, dk); circ(14.5, 11, 1.5, dk); break;
      case 'heal': P(9, 3, 6, 18, '#5AD06A'); P(3, 9, 18, 6, '#5AD06A'); P(10, 4, 4, 16, '#BFF0C8'); P(4, 10, 16, 4, '#BFF0C8'); break;
      case 'guard': poly([[3, 3], [21, 3], [21, 11], [12, 22], [3, 11]], lt); poly([[6, 6], [18, 6], [18, 11], [12, 18], [6, 11]], col); P(11, 6, 2, 12, lt); P(6, 10, 12, 2, lt); break;
      case 'parry': ln(3, 3, 19, 19, lt, 2.5); ln(21, 3, 5, 19, lt, 2.5); P(3, 18, 4, 4, col); P(17, 18, 4, 4, col); circ(12, 11, 2, '#FFFFFF'); break;
      case 'drain': circ(8, 9, 4, '#C8203A'); circ(15, 9, 4, '#C8203A'); poly([[4.3, 10.5], [18.7, 10.5], [11.5, 19]], '#C8203A'); ln(22, 2, 13, 11, lt, 2); poly([[13, 11], [13, 6], [17, 10]], lt); break;
      case 'orbit': arc(12, 12, 8, 0, 7, mid, 1); circ(12, 12, 3, col); [0, 2.1, 4.2].forEach(a => circ(12 + Math.cos(a) * 8, 12 + Math.sin(a) * 8, 2.3, lt)); break;
      case 'turret': P(5, 15, 14, 6, '#5A5C62'); P(7, 8, 10, 7, col); P(16, 10, 7, 3, '#3A3C42'); circ(12, 11, 1.8, lt); break;
      case 'hook': arc(13, 15, 5, 0, Math.PI * 1.15, lt, 2.5); ln(18, 15, 18, 3, lt, 2.5); ln(3, 6, 18, 3, mix(col, '#8A6A44', 0.5), 1.5); break;
      case 'bolt': bolt(1, 0, 1, lt); bolt(0.7, 9, 6, col); break;
      case 'storm': circ(8, 7, 4.5, mid); circ(14, 6, 5, lt); circ(18, 9, 3.5, mid); P(5, 8, 15, 4, lt); poly([[12, 12], [8, 18], [11, 18], [9, 23], [15, 16], [12, 16]], '#FFE070'); break;
      case 'wave': [6, 12, 18].forEach((b, i) => { y.strokeStyle = i === 1 ? lt : col; y.lineWidth = 2; y.beginPath(); for (let a = 0; a <= 22; a++) y.lineTo(1 + a, b + Math.sin(a * 0.6) * 2.2); y.stroke(); }); break;
      case 'boomer': arc(12, 14, 9, -2.6, -0.5, lt, 3.5); arc(12, 14, 9, -2.6, -0.5, col, 1.5); circ(12, 14, 1.5, '#FFFFFF'); break;
      case 'jump': poly([[12, 2], [19, 10], [5, 10]], lt); P(10, 10, 4, 7, lt); P(3, 19, 18, 3, col); ln(5, 17, 2, 21, mid, 1.5); ln(19, 17, 22, 21, mid, 1.5); break;
      case 'beam': ln(2, 21, 22, 3, col, 6); ln(2, 21, 22, 3, lt, 3); ln(2, 21, 22, 3, '#FFFFFF', 1); circ(3, 20, 3, lt); break;
      case 'breath': poly([[3, 12], [22, 3], [22, 21]], col); poly([[3, 12], [22, 7], [22, 17]], lt); circ(4, 12, 2.5, '#FFFFFF'); break;
      case 'aura': y.globalAlpha = 0.5; circ(12, 12, 10, col); y.globalAlpha = 1; arc(12, 12, 10, 0, 7, lt, 1.5); arc(12, 12, 6, 0, 7, col, 1.5); circ(12, 12, 2.5, '#FFFFFF'); break;
      case 'dance': y.strokeStyle = lt; y.lineWidth = 2; y.beginPath(); for (let a = 0; a <= 20; a++) y.lineTo(2 + a, 12 + Math.sin(a * 0.5) * 7); y.stroke(); y.strokeStyle = col; y.beginPath(); for (let a = 0; a <= 20; a++) y.lineTo(2 + a, 12 - Math.sin(a * 0.5) * 5); y.stroke(); break;
      case 'paw': circ(12, 15, 5, lt); [[6, 9], [10, 6], [14, 6], [18, 9]].forEach(([a, b]) => circ(a, b, 2.3, lt)); circ(12, 15, 2.5, col); break;
      case 'revive': arc(12, 7, 4, 0, 7, '#FFD27A', 2.5); P(11, 10, 2.5, 12, '#FFD27A'); P(6, 13, 12, 2.5, '#FFD27A'); break;
      case 'infuse': poly([[12, 1], [15, 9], [23, 12], [15, 15], [12, 23], [9, 15], [1, 12], [9, 9]], lt); circ(12, 12, 3, col); break;
      case 'trap': P(2, 17, 20, 3, '#8A8A92'); for (let i = 0; i < 6; i++) poly([[3 + i * 3.2, 17], [4.6 + i * 3.2, 8], [6.2 + i * 3.2, 17]], '#D8D8E0'); break;
      case 'frost': [0, 1, 2].forEach(i => { const a = i * Math.PI / 3; ln(12 - Math.cos(a) * 10, 12 - Math.sin(a) * 10, 12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, '#BFE6FF', 2.5); }); circ(12, 12, 2.5, '#FFFFFF'); break;
      // 武術家：拳、掌、氣、踢、棍（不要長槍／劍）
      case 'fist':
        // 正面的拳頭（2026-10-05 再改：原本的太小、看不出是拳頭）——四根指節一排、拇指橫在下面、手腕
        y.fillStyle = lt; y.beginPath(); y.roundRect ? y.roundRect(4, 5, 16, 14, 4) : y.rect(4, 5, 16, 14); y.fill();
        P(7, 18, 10, 4, col);
        [8, 12, 16].forEach(a => ln(a, 6, a, 12.5, dk, 1.2));
        [6, 10, 14, 18].forEach(a => circ(a, 7.2, 1.3, '#FFFFFF'));
        poly([[4, 13], [15, 12.5], [15.5, 16], [5, 17.5]], col); ln(5, 13, 15, 12.6, dk, 1);
        ln(1, 9, 3, 9, mid, 1.2); ln(0.5, 13, 3, 13, mid, 1.2); ln(1, 17, 3, 17, mid, 1.2); break;
      case 'palm':
        // 推掌：掌心朝外＋氣紋
        poly([[7, 20], [5, 12], [7, 6], [12, 4], [17, 6], [19, 12], [17, 20], [12, 18]], lt);
        poly([[8, 18], [7, 12], [9, 8], [12, 6], [15, 8], [17, 12], [16, 18], [12, 16]], col);
        circ(12, 12, 2.5, '#FFFFFF');
        arc(12, 12, 7, -2.2, -0.6, mid, 1.5); arc(12, 12, 9.5, -2.0, -0.8, lt, 1.2); break;
      case 'qi':
        // 氣團：漩渦＋外圈光
        for (let i = 0; i < 3; i++) arc(12, 12, 3 + i * 2.8, i * 1.4, i * 1.4 + 4, i === 1 ? lt : col, 2);
        circ(12, 12, 2.8, '#FFFFFF'); circ(12, 12, 1.2, col);
        [0, 2, 4].forEach(i => { const a = i * Math.PI / 3; circ(12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, 1.4, mid); }); break;
      case 'kick':
        // 側踢：大腿＋小腿＋腳掌
        poly([[4, 16], [8, 8], [12, 6], [14, 10], [10, 14]], lt);
        poly([[10, 12], [14, 8], [20, 6], [22, 9], [18, 12], [12, 14]], col);
        poly([[18, 8], [23, 5], [23, 10], [20, 11]], lt);
        arc(8, 18, 4, -0.5, 2.2, mid, 1.5); break;
      case 'pole':
        // 長棍（不是槍頭）：兩端圓頭＋棍身
        ln(4, 20, 20, 4, mix(col, '#8A6A44', 0.45), 3);
        ln(4, 20, 20, 4, lt, 1.5);
        circ(4, 20, 2.2, col); circ(20, 4, 2.2, col);
        circ(12, 12, 1.6, '#FFFFFF'); break;
      default: star(12, 12, 9, lt); star(12, 12, 5, col);
    }
    // 描邊（1 格深色）
    const N2 = RES, img = y.getImageData(0, 0, N2, N2), d = img.data, s = new Uint8Array(N2 * N2);
    for (let i = 0; i < N2 * N2; i++) { if (d[i * 4 + 3] >= 90) { d[i * 4 + 3] = 255; s[i] = 1; } else d[i * 4 + 3] = 0; }
    for (let i = 0; i < N2 * N2; i++) { if (s[i]) continue; const px = i % N2, py = (i - px) / N2; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const qx = px + a, qy = py + b; return qx >= 0 && qy >= 0 && qx < N2 && qy < N2 && s[qy * N2 + qx]; })) { d[i * 4] = 16; d[i * 4 + 1] = 12; d[i * 4 + 2] = 18; d[i * 4 + 3] = 235; } }
    y.putImageData(img, 0, 0); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(g, 0, 0); x.restore();
    // 段數：上緣的小點
    if (o.n > 1) for (let i = 0; i < o.n; i++) { x.fillStyle = '#10101A'; x.fillRect(3 + i * 3, 2, 3, 3); x.fillStyle = '#FFE8A0'; x.fillRect(4 + i * 3, 3, 1.5, 1.5); }
    // 角落的徽章
    const BADGE = {
      burn: (a, b) => { x.fillStyle = '#FF6A2A'; x.beginPath(); x.moveTo(a + 3, b); x.quadraticCurveTo(a + 7, b + 4, a + 3, b + 7); x.quadraticCurveTo(a - 1, b + 4, a + 3, b); x.fill(); x.fillStyle = '#FFD06A'; x.fillRect(a + 2, b + 4, 2, 2); },
      frost: (a, b) => { x.strokeStyle = '#BFE6FF'; x.lineWidth = 1.2; [0, 1, 2].forEach(i => { const t = i * Math.PI / 3; x.beginPath(); x.moveTo(a + 3.5 - Math.cos(t) * 3.5, b + 3.5 - Math.sin(t) * 3.5); x.lineTo(a + 3.5 + Math.cos(t) * 3.5, b + 3.5 + Math.sin(t) * 3.5); x.stroke(); }); },
      shock: (a, b) => { x.fillStyle = '#FFE070'; x.beginPath(); [[4, 0], [1, 4], [3.5, 4], [2.5, 7], [6, 3], [3.5, 3]].forEach(([u, v], i) => (i ? x.lineTo(a + u, b + v) : x.moveTo(a + u, b + v))); x.fill(); },
      stun: (a, b) => { x.fillStyle = '#FFE070'; [[1, 1], [5, 2], [3, 5]].forEach(([u, v]) => { x.fillRect(a + u, b + v - 1, 1, 3); x.fillRect(a + u - 1, b + v, 3, 1); }); },
      curse: (a, b) => { x.fillStyle = '#9A4ACF'; x.beginPath(); x.ellipse(a + 3.5, b + 3.5, 3.5, 2.2, 0, 0, 7); x.fill(); x.fillStyle = '#F2E8FF'; x.fillRect(a + 2.5, b + 2.5, 2, 2); },
      vamp: (a, b) => { x.fillStyle = '#C8203A'; x.beginPath(); x.moveTo(a + 3.5, b); x.lineTo(a + 6, b + 4); x.arc(a + 3.5, b + 4.5, 2.5, 0, Math.PI); x.closePath(); x.fill(); },
      root: (a, b) => { x.strokeStyle = '#6FB36A'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(a, b + 7); x.quadraticCurveTo(a + 3, b + 2, a + 7, b + 1); x.stroke(); x.fillStyle = '#9AE07A'; x.fillRect(a + 4, b + 2, 2, 2); },
      crit: (a, b) => { x.fillStyle = '#FFF0A0'; x.fillRect(a + 3, b, 1, 7); x.fillRect(a, b + 3, 7, 1); x.fillRect(a + 2, b + 2, 3, 3); },
      ghost: (a, b) => { x.fillStyle = 'rgba(220,230,240,.9)'; x.fillRect(a + 1, b + 1, 5, 6); x.fillStyle = '#1A1A1E'; x.fillRect(a + 2, b + 3, 1, 1); x.fillRect(a + 4, b + 3, 1, 1); },
      taunt: (a, b) => { x.fillStyle = '#FF6A4A'; x.fillRect(a + 3, b, 2, 5); x.fillRect(a + 3, b + 6, 2, 1.5); },
      pierce: (a, b) => { x.strokeStyle = '#E8E0D0'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(a, b + 7); x.lineTo(a + 7, b); x.stroke(); x.fillStyle = '#E8E0D0'; x.fillRect(a + 5, b, 2, 2); }
    };
    [[SZ - 9, SZ - 9], [2, SZ - 9]].forEach(([a, b], i) => { const k = o.badges[i]; if (!k || !BADGE[k]) return; x.fillStyle = 'rgba(10,8,14,.85)'; x.fillRect(a - 1, b - 1, 9, 9); BADGE[k](a, b); });
    // 外框
    const fc = o.tier === 'aw' ? '#E8C04A' : o.tier === 'sp' ? '#B88AFF' : o.tier === 'adv' ? '#B8C0CC' : mix(col, '#000000', 0.3);
    x.strokeStyle = fc; x.lineWidth = o.tier ? 1.5 : 1; x.beginPath(); x.roundRect ? x.roundRect(0.75, 0.75, SZ - 1.5, SZ - 1.5, 4) : x.rect(0.75, 0.75, SZ - 1.5, SZ - 1.5); x.stroke();
    if (o.tier === 'aw') { x.fillStyle = '#FFF0B0'; x.fillRect(SZ - 5, 2, 1, 3); x.fillRect(SZ - 6, 3, 3, 1); }
    return c.toDataURL();
  };

  R.skillIconURL = id => {
    if (!id) return '';
    const o = info(id); return cache[o.key] || (cache[o.key] = draw(o));
  };
  R.skillIconInfo = info;   // 測試用
})(window.R);
