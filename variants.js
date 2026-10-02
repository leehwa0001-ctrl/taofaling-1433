// 討伐令 1433：同一種遺跡生物，分級越高越兇（作者：阿彌勒級和哈米莉亞級同地區的會有相似性，但攻擊性徵截然不同；
//   出個同類型的怪，照難度外觀越來越可怕的版本）
// 每一種「本來是低分級」的遺跡生物，到更高分級的遺跡會變成變種（照原本的點陣圖自動改）：
//   荒（高一級）：顏色變暗偏紅、眼睛發紅、背上長出短刺。
//   獰（高兩級）：更暗、刺更長、露出獠牙，身體大一成。
//   淵（高三級以上）：幾乎全黑帶紫、眼睛發紫光、一圈紫色的光邊，身體大兩成。
// 數值只多一點（生命 +15／30／45%、傷害 +10／20／30%，跑快一點）——分級本來就有加強。
// 出現的機率七成（同一層也看得到原本的樣子，看得出是同一種）。圖鑑不另外列（noDex），打倒的次數算在原本那一種上。
// 有特別寫法的不變（三連貂、福影童、預言犢、分裂膠、喚群燈、行壁、礦殼的礦脈房……）。
(function (R) {
  const W = R.W, rnd = Math.random, ART = R.BEAST_ART;
  const TIER = [null, { pre: '荒', hp: 1.15, dmg: 1.1, sp: 1.04, sc: 1.0, eye: '#FF5A2A', spike: '#3A2A24' }, { pre: '獰', hp: 1.3, dmg: 1.2, sp: 1.08, sc: 1.1, eye: '#FF2A2A', spike: '#24160F' }, { pre: '淵', hp: 1.45, dmg: 1.3, sp: 1.12, sc: 1.2, eye: '#C88AFF', spike: '#180A22' }];
  const SKIP_AI = ['trio', 'luck', 'prophet', 'core', 'lord', 'split', 'alarm', 'wall', 'giant'], SKIP_ID = ['kamaitachi', 'kudan', 'fukudo', 'splitgel', 'splitgel_s', 'chochin', 'nurikabe', 'petra', 'muddoll_s', 'kitsune_ghost'];
  const hex = c => { const n = parseInt(String(c).slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shade = (c, t) => {
    if (!/^#[0-9a-fA-F]{6}/.test(c)) return c; let [r, g, b] = hex(c); const L = (r * 0.3 + g * 0.59 + b * 0.11);
    if (t === 1) return toHex([r * 0.82 + 22, g * 0.72, b * 0.7]);
    if (t === 2) return toHex([L * 0.25 + r * 0.45 + 18, L * 0.25 + g * 0.35, L * 0.2 + b * 0.35]);
    return toHex([L * 0.22 + 26, L * 0.12 + 10, L * 0.3 + 40]);
  };
  const FREE = 'ZYQXVUWT'.split('');
  const mkArt = (base, t) => {
    const A = ART[base]; if (!A || !A.a) return null;
    const used = new Set(Object.keys(A.pal)); const ch = FREE.filter(c => !used.has(c)); if (ch.length < 3) return null;
    const [SP, FG, AU] = ch, T = TIER[t], pal = {};
    Object.keys(A.pal).forEach(k => { pal[k] = k === 'e' ? T.eye : shade(A.pal[k], t); });
    pal[SP] = T.spike; pal[FG] = '#F2F0E8'; pal[AU] = '#8A4AE8';
    const frame = rows => {
      const w = Math.max(...rows.map(r => r.length)), g = [Array(w).fill('.'), Array(w).fill('.')].concat(rows.map(r => (r + '.'.repeat(w)).slice(0, w).split('')));
      const H = g.length, solid = (y, x) => y >= 0 && y < H && x >= 0 && x < w && g[y][x] !== '.';
      // 背上的刺：每一欄最上面的那一格往上長
      const step = t === 1 ? 3 : 2;
      for (let x = 1; x < w - 1; x++) { if (x % step) continue; let y = 0; while (y < H && !solid(y, x)) y++; if (y >= H || y < 1) continue; g[y - 1][x] = SP; if (t >= 2 && x % 4 === 0 && y >= 2) g[y - 2][x] = SP; }
      // 獠牙：眼睛下面兩格是身體的話，點一顆白的
      if (t >= 2) for (let y = 0; y < H - 2; y++) for (let x = 0; x < w; x++) if (g[y][x] === 'e' && solid(y + 2, x) && g[y + 2][x] !== 'e') g[y + 2][x] = FG;
      // 淵：一圈紫色的光邊
      if (t >= 3) { const edge = []; for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => solid(y + dy, x + dx) && g[y + dy][x + dx] !== SP)) edge.push([y, x]); edge.forEach(([y, x]) => { g[y][x] = AU; }); }
      return g.map(r => r.join(''));
    };
    return { pal, a: frame(A.a), b: frame(A.b || A.a) };
  };
  // 每一種生物「本來」在哪一級（最低出現的分級）
  const home = {};
  const order = ['hamilia', 'amile', 'mors', 'kesent'];
  order.forEach((gid, i) => { const g = R.gradeById(gid); (g && g.pool || []).forEach(id => { if (home[id] == null) home[id] = i + 1; }); });
  const VAR = {};
  Object.keys(home).forEach(id => {
    const d = R.ENEMIES[id]; if (!d || d.boss || d.elite || d.env || d.noDex || SKIP_ID.includes(id) || SKIP_AI.includes(d.ai) || home[id] > 3) return;
    for (let t = 1; t <= 3; t++) {
      const art = mkArt(id, t); if (!art) continue; const vid = id + '_v' + t, T = TIER[t];
      ART[vid] = art;
      R.ENEMIES[vid] = Object.assign({}, d, { name: T.pre + d.name, hp: Math.round(d.hp * T.hp), dmg: Math.round(d.dmg * T.dmg * 10) / 10, speed: d.speed * T.sp, xp: Math.round(d.xp * (1 + 0.15 * t)), size: d.size * T.sc, noDex: 1, vbase: id, vtier: t, desc: (d.desc || '') + '（' + T.pre + '：更高分級的遺跡裡長出來的變種）' });
      (VAR[id] = VAR[id] || [])[t] = vid;
    }
  });
  R.VARIANTS = VAR;
  // 生出來的時候換成變種
  const se = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const run = W.run, h = home[id];
    if (run && VAR[id] && h && !(o && (o.human || o.role)) && rnd() < 0.7) { const diff = Math.min(3, (run.grade.lv || 1) - h); if (diff >= 1 && VAR[id][diff]) { const e = se(VAR[id][diff], x, z, room, o); if (e) { e.vbase = id; const k = TIER[diff].sc; if (k !== 1 && e.m && e.m.g) e.m.g.scale.multiplyScalar(k); } return e; } }
    return se(id, x, z, room, o);
  };
  // 打倒的次數也算在原本那一種上（圖鑑、之後的寵物）
  const k0 = R.killEnemy;
  R.killEnemy = (e, by) => { const r = k0(e, by); const run = W.run; if (e && e.vbase && run) { run.killIds = run.killIds || {}; run.killIds[e.vbase] = (run.killIds[e.vbase] || 0) + 1; } return r; };
  R.variantDebug = { home, VAR, mkArt };
})(window.R);
