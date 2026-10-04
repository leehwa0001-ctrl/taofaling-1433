// 討伐令 1433：領主體多七種（作者：領主體太少），總共十種；克森特級每一層（最後一層以外）都有領主區，大樓層有機會兩個。
// - 環境專屬：霜冠鹿（凍原）、熔顎蜥（火山）、沙暴鯨（沙漠）、深淵王蛸（深海）——那個環境的克森特級遺跡優先出現。
// - 遺跡形式：萬面樹（迷宮型）、朽翼龍（高塔型）、雷鳴猿（城區型）。
// - 每一種有四套招式，血越少出招越密；招式都會先在地上畫出範圍（圈、扇形、直線）。
(function (R) {
  const W = () => R.W, ART = R.BEAST_ART, rnd = Math.random, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const targets = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed)).filter(t => t && !t.dead); };
  const hitT = (t, dmg, e, o) => (t.ally ? R.hurtAlly(t, dmg, e) : R.hurtPlayer(dmg, e, o));
  const floor = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);

  // ---------- 資料 ----------
  const L = (o) => Object.assign({ ref: '', boss: 1, xp: 85 }, o);
  const NEW = {
    frostdeer: L({ name: '領主體・霜冠鹿', hp: 700, dmg: 22, speed: 3.4, size: 2.2, ai: 'l_frost', armor: 0.2, env: 'snow', color: '#CFE6FF', eye: '#3A8AFF', desc: '凍原的克森特級遺跡裡的領主體。冰做的大角，走過的地方結霜。會射出一排排冰槍、吹起暴風雪、低頭衝撞，還會叫冰棺守出來。' }),
    lavajaw: L({ name: '領主體・熔顎蜥', hp: 760, dmg: 24, speed: 2.8, size: 2.3, ai: 'l_lava', armor: 0.3, env: 'volcano', color: '#3A2420', eye: '#FFD04A', desc: '火山的克森特級遺跡裡的領主體。張嘴噴出扇形的火、讓熔岩從天上落下、甩尾掃一圈，地上會留下燒人的熔岩。' }),
    sandwhale: L({ name: '領主體・沙暴鯨', hp: 820, dmg: 22, speed: 3, size: 2.6, ai: 'l_sand', armor: 0.15, env: 'desert', color: '#B89A6A', eye: '#1A1410', desc: '沙漠的克森特級遺跡裡的領主體。在沙子底下游，從腳下衝出來；捲起會追人的沙暴，噴出遮眼的沙。' }),
    kraken: L({ name: '領主體・深淵王蛸', hp: 780, dmg: 22, speed: 1.8, size: 2.4, ai: 'l_kraken', armor: 0.15, env: 'deep', color: '#5A2A4A', eye: '#FFD04A', desc: '深海的克森特級遺跡裡的領主體。好幾條觸手一起砸下來，噴墨讓人看不清楚，還會捲起漩渦把人拉過去。' }),
    faceforest: L({ name: '領主體・萬面樹', hp: 900, dmg: 20, speed: 0, size: 2.6, ai: 'l_tree', armor: 0.25, color: '#3A5A2E', eye: '#F2E6C8', desc: '迷宮型的克森特級遺跡最常見的領主體。不會移動；樹根一路竄過來、種子灑滿整間房、從腳下纏住人，還會結出根童。' }),
    bonewyvern: L({ name: '領主體・朽翼龍', hp: 720, dmg: 24, speed: 4, size: 2.4, ai: 'l_wyvern', fly: 1, armor: 0.1, color: '#D8D0C0', eye: '#7FD8FF', desc: '高塔型的克森特級遺跡最常見的領主體。只剩骨頭的飛龍，從高處俯衝、吐出直線的骨焰、搧翅膀把人吹開。' }),
    thunderape: L({ name: '領主體・雷鳴猿', hp: 760, dmg: 24, speed: 3.8, size: 2.2, ai: 'l_ape', armor: 0.15, color: '#4A4A7A', eye: '#FFE04A', desc: '城區型的克森特級遺跡最常見的領主體。跳起來砸地、叫雷落下、連續揮拳，吼一聲就是一圈震波。' })
  };
  Object.keys(NEW).forEach(id => { R.ENEMIES[id] = NEW[id]; });

  // ---------- 點陣圖 ----------
  const grid = (w, h) => {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    const o = {
      p(x, y, c) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c; },
      rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) o.p(x + i, y + j, c); },
      line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) o.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
      thick(x0, y0, x1, y1, c, w) { for (let k = -w; k <= w; k++) o.line(x0, y0 + k, x1, y1 + k, c); },
      ell(cx, cy, rx, ry, c, f) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const k = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (k <= 1.05 && (!f || f(x, y))) o.p(x, y, c); } },
      disc(cx, cy, r, c) { o.ell(cx, cy, r, r, c); },
      rows: () => g.map(r => r.join(''))
    };
    return o;
  };
  const add = (id, pal, w, h, draw) => { const fr = [0, 1].map(f => { const G = grid(w, h); draw(G, f); return G.rows(); }); ART[id] = { pal, a: fr[0], b: fr[1] }; };

  add('frostdeer', { a: '#CFE6FF', A: '#9AC0E8', d: '#5A78A0', w: '#F4FAFF', e: '#3A8AFF', k: '#1A2A3A' }, 32, 30, (G, fr) => {
    G.ell(14, 17, 9, 5, 'A'); G.ell(13, 16, 8, 4, 'a'); G.thick(21, 14, 25, 9, 'a', 1); G.ell(26, 8, 3.5, 2.6, 'a'); G.p(27, 7, 'e'); G.p(29, 9, 'k');
    [[24, 6, 21, 1], [24, 6, 27, 0], [27, 6, 31, 2], [22, 3, 19, 2], [28, 3, 30, 0]].forEach(([x0, y0, x1, y1]) => G.line(x0, y0, x1, y1, 'w'));
    G.line(5, 15, 3, 12, 'A'); (fr ? [8, 11, 17, 20] : [9, 10, 18, 19]).forEach((x, i) => { G.rect(x, 20, 2, 8, 'd'); G.p(x, 28 + (i % 2 ? fr : 1 - fr), 'k'); }); G.p(10, 14, 'w'); G.p(15, 13, 'w');
  });
  add('lavajaw', { s: '#3A2420', S: '#5A3428', l: '#FF7A3A', L: '#FFD04A', e: '#FFD04A', w: '#F0E0C0', k: '#1A0E0A' }, 34, 22, (G, fr) => {
    G.thick(1, 12, 9, 13, 's', 1); G.ell(15, 13, 8, 4.5, 'S'); G.line(9, 10, 20, 9, 'l'); G.line(11, 15, 19, 16, 'l'); G.p(14, 12, 'L');
    G.ell(26, 11, 6, 3.5, 's'); G.ell(29, fr ? 15 : 14, 4, fr ? 2.5 : 1.5, 'k'); for (let x = 25; x <= 32; x += 2) { G.p(x, 13, 'w'); G.p(x, fr ? 17 : 15, 'w'); } G.p(26, 9, 'e'); G.p(30, 8, 'l'); G.p(31, 9, 'L');
    (fr ? [9, 13, 18, 22] : [10, 12, 19, 21]).forEach(x => G.rect(x, 17, 2, 4, 'S'));
  });
  add('sandwhale', { s: '#C8A870', S: '#A88850', b: '#E8D8B0', k: '#3A2A18', e: '#1A1410', w: '#F0E0C0' }, 36, 20, (G, fr) => {
    G.ell(18, 11, 15, 6.5, 'S'); G.ell(18, 13, 13, 3.5, 'b'); G.thick(2, fr ? 6 : 9, 6, 10, 'S', 1); G.line(0, fr ? 3 : 7, 3, fr ? 6 : 9, 'S'); G.line(0, fr ? 9 : 12, 3, 10, 'S');
    G.p(28, 9, 'e'); G.line(26, 14, 33, 14, 'k'); for (let x = 27; x <= 33; x += 2) G.p(x, 15, 'w'); [10, 15, 20].forEach(x => G.line(x, 6, x + 1, 9, 'b')); for (let x = 3; x < 34; x += 3) G.p(x, 19, 's');
  });
  add('kraken', { a: '#5A2A4A', A: '#7A3A6A', s: '#C88AB0', e: '#FFD04A', k: '#1A0E18' }, 32, 30, (G, fr) => {
    G.ell(16, 9, 9, 8, 'a'); G.ell(14, 6, 4, 3, 'A'); G.disc(12, 12, 2, 'e'); G.disc(20, 12, 2, 'e'); G.p(12, 12, 'k'); G.p(20, 12, 'k');
    for (let i = 0; i < 6; i++) { const x0 = 8 + i * 3.2, sw = (i % 2 === fr ? 1 : -1) * 2; G.thick(x0, 16, x0 + sw, 23, 'A', 0); G.line(x0 + 1, 16, x0 + 1 + sw, 23, 'a'); G.line(x0 + sw, 23, x0 - sw, 29, 'A'); G.p(x0 + sw * 0.5 + 1, 20, 's'); }
  });
  add('faceforest', { t: '#5A3E26', T: '#3E2A18', g: '#3A5A2E', G: '#2A4420', f: '#F2E6C8', e: '#2A1A10', r: '#C83A3A' }, 34, 34, (G, fr) => {
    G.rect(13, 18, 8, 14, 't'); G.rect(13, 18, 2, 14, 'T'); [[13, 31, 7, 33], [20, 31, 27, 33], [16, 32, 16, 34]].forEach(([a, b, c, d]) => G.thick(a, b, c, d, 't', 0));
    const o = fr ? 1 : 0; G.ell(17 + o, 11, 16, 10, 'g'); G.ell(11 + o, 7, 7, 5, 'G'); G.ell(25 + o, 8, 6, 4, 'G');
    [[8, 10], [16, 6], [24, 11], [13, 15], [21, 15]].forEach(([x, y], i) => { G.rect(x - 1 + o, y - 1, 3, 3, 'f'); G.p(x - 1 + o, y - 1, 'e'); G.p(x + 1 + o, y - 1, 'e'); G.p(x + o, y + ((i + fr) % 2), i % 2 ? 'r' : 'e'); });
    G.rect(15, 22, 4, 3, 'f'); G.p(15, 22, 'e'); G.p(18, 22, 'e'); G.line(15, 24, 18, 24, 'r');
  });
  add('bonewyvern', { b: '#E8E0CC', B: '#B8AE98', k: '#2A2420', e: '#7FD8FF', m: '#7A7068' }, 36, 26, (G, fr) => {
    const wy = fr ? 20 : 2; for (let i = 0; i < 5; i++) { G.line(14, 11, 2 + i * 2.5, wy + (fr ? -i : i), 'B'); } G.line(14, 11, 1, wy, 'b'); G.line(1, wy, 12, fr ? 22 : 3, 'm');
    G.thick(8, 13, 22, 12, 'b', 1); for (let x = 12; x <= 20; x += 2) G.line(x, 12, x, 16, 'B'); G.line(8, 13, 2, 16, 'b'); G.line(2, 16, 0, 19, 'B');
    G.thick(22, 12, 27, 8, 'b', 0); G.ell(30, 7, 3.5, 2.4, 'b'); G.line(30, 9, 35, 9, 'B'); G.p(30, 6, 'e'); G.line(28, 4, 26, 1, 'B'); G.line(16, 16, 15, 23, 'B'); G.line(20, 16, 21, 23, 'B'); G.p(14, 24, 'k'); G.p(22, 24, 'k');
  });
  add('thunderape', { a: '#4A4A7A', A: '#34345A', s: '#C8B0A0', y: '#FFE04A', e: '#FFE04A', k: '#1A1428' }, 30, 30, (G, fr) => {
    G.ell(14, 15, 8, 8, 'a'); G.disc(16, 6, 4.5, 'A'); G.ell(17.5, 7, 3, 2.5, 's'); G.p(16, 6, 'e'); G.p(19, 6, 'e'); G.line(16, 9, 20, 9, 'k');
    G.thick(7, 11, 3, fr ? 24 : 22, 'A', 1); G.thick(21, 11, 26, fr ? 22 : 24, 'A', 1); G.disc(3, fr ? 25 : 23, 2, 'a'); G.disc(26, fr ? 23 : 25, 2, 'a');
    [[11, 3, 9, 0], [13, 2, 13, 0], [9, 5, 6, 3]].forEach(([a, b, c, d]) => G.line(a, b, c, d, 'y')); G.line(4, 14, 1, 10, 'y'); G.line(1, 10, 3, 9, 'y');
    (fr ? [9, 18] : [10, 17]).forEach(x => G.rect(x, 22, 3, 7, 'A'));
  });

  // ---------- 招式的小工具 ----------
  const booms = (e, pts, r, t, k, col, after) => { pts.forEach(([x, z]) => R.fx('mark', x, 0, z, { r, t })); later(() => { if (e.dead) return; pts.forEach(([x, z]) => { R.fx('boom', x, 0.3, z, { r, color: col }); targets().forEach(tg => { if (Math.hypot(tg.x - x, tg.z - z) < r) hitT(tg, e.dmg * k, e, { knock: 0.3 }); }); if (after) after(x, z); }); R.shake(0.25); }, t * 1000); };
  const march = (e, a, n, step, gap, r, k, col, after) => { for (let i = 1; i <= n; i++) { const [x, z] = floor(e.x + Math.sin(a) * step * i, e.z + Math.cos(a) * step * i); later(() => { if (e.dead) return; R.fx('mark', x, 0, z, { r, t: 0.35 }); later(() => { if (e.dead) return; R.fx('boom', x, 0.3, z, { r, color: col }); targets().forEach(tg => { if (Math.hypot(tg.x - x, tg.z - z) < r) hitT(tg, e.dmg * k, e); }); if (after) after(x, z); }, 350); }, i * gap * 1000); } };
  const wave = (e, maxR, speed, k, col, onHit) => {
    const w = W(), run = w.run, done = new Set(), x0 = e.x, z0 = e.z; let r = 0.8; R.fx('ring', x0, 0.1, z0, { r: maxR, color: col }); R.shake(0.3);
    w.dyn.push(dt => { if (w.run !== run) return false; r += dt * speed; targets().forEach(t => { if (done.has(t)) return; const dd = Math.hypot(t.x - x0, t.z - z0); if (Math.abs(dd - r) < 0.55 && !(t.iframe > 0) && !(t.air > 0)) { done.add(t); hitT(t, e.dmg * k, e, { knock: 0.5 }); if (onHit) onHit(t); } }); return r < maxR; });
  };
  const radial = (e, n, kind, speed, k, off, o) => { for (let i = 0; i < n; i++) R.fire(Object.assign({ kind, owner: 'e', x: e.x, z: e.z, a: i / n * Math.PI * 2 + (off || 0), speed, dmg: e.dmg * k, life: 2.6, src: e }, o || {})); };
  const fan = (e, a, n, spread, kind, speed, k) => { for (let i = 0; i < n; i++) R.fire({ kind, owner: 'e', x: e.x, z: e.z, a: a + (i - (n - 1) / 2) * spread, speed, dmg: e.dmg * k, life: 2.4, src: e }); };
  const cone = (e, a, arc, range, t, k, col, after) => { R.fx('sector', e.x, 0, e.z, { a, arc, range, t }); later(() => { if (e.dead) return; R.fx('swing', e.x, 0, e.z, { a, arc, range, color: col }); targets().forEach(tg => { const dd = Math.hypot(tg.x - e.x, tg.z - e.z), aa = Math.atan2(tg.x - e.x, tg.z - e.z); if (dd < range + 0.2 && Math.abs(wrap(aa - a)) < arc / 2 + 0.1) hitT(tg, e.dmg * k, e, { knock: 0.5 }); }); if (after) after(); R.shake(0.3); }, t * 1000); };
  const line = (e, a, len, t, k, after) => { R.fx('aim', e.x, 0.3, e.z, { a, len, t }); later(() => { if (e.dead) return; R.fx('slash', e.x, 1.2, e.z, { a, len }); targets().forEach(tg => { const dx = tg.x - e.x, dz = tg.z - e.z, al = dx * Math.sin(a) + dz * Math.cos(a), sd = Math.abs(dx * Math.cos(a) - dz * Math.sin(a)); if (al > 0 && al < len && sd < 1.1) { hitT(tg, e.dmg * k, e); if (after) after(tg); } }); }, t * 1000); };
  const zone = (x, z, r, life, dmg, col, kind) => { const zn = R.addZone({ kind: kind || 'lava', x, z, r, life, dmg }); if (zn && zn.mesh && col) zn.mesh.material.color.set(col); return zn; };
  const summon = (e, id, n, hpMul) => { const rm = R.roomOf ? R.roomOf(e) : null; for (let i = 0; i < n; i++) { const [x, z] = rm ? R.roomPoint(rm) : floor(e.x + rnd() * 4 - 2, e.z + rnd() * 4 - 2); R.spawnEnemy(id, x, z, e.room, { aggro: true, hpMul: hpMul || 0.6 }); } };
  const around = (P, n, rr) => Array.from({ length: n }, (_, i) => { const a = rnd() * Math.PI * 2, d = i === 0 ? 0 : 1.5 + rnd() * rr; return floor(P.x + Math.sin(a) * d, P.z + Math.cos(a) * d); });
  const hurt = e => 1 - e.hp / e.hpMax;
  // 共通的骨架：移動方式（靠近／保持距離／不動）、貼身攻擊、每隔一段時間挑一套招式
  const lordAI = (e, P, d, a, sp, dt, walk, H, cfg) => {
    e.yaw = a;
    if (e.busy > 0) { e.busy -= dt; if (cfg.busyMove) return cfg.busyMove(e, P, d, a, sp, dt, H); return false; }
    let mv = false;
    if (cfg.keep) { const want = d < cfg.keep[0] ? a + Math.PI : d > cfg.keep[1] ? a : null; if (want != null && walk && sp > 0) { H.move(e, want, sp, dt); mv = true; } }
    else if (walk && sp > 0 && d > (cfg.reach || 2.6)) { H.move(e, a, sp, dt); mv = true; }
    e.bite = (e.bite || 0) - dt; if (cfg.reach && d < cfg.reach && e.bite <= 0) { e.bite = 1.2; H.hurtT(P, e.dmg, e, { knock: 0.4 }); R.fx('swing', e.x, 0, e.z, { a, arc: 1.6, range: cfg.reach, color: '#E8E0CC' }); }
    e.pat = (e.pat == null ? 2 : e.pat) - dt;
    if (e.pat <= 0) { e.pat = cfg.every - hurt(e) * cfg.every * 0.45 + rnd(); const list = cfg.moves, k = Math.floor(rnd() * list.length); list[k](e, P, d, a); }
    return mv;
  };
  const AI = R.AI_X = R.AI_X || {};

  // 霜冠鹿：冰槍（三排）、暴風雪（震波＋變慢）、衝撞、叫冰棺守
  AI.l_frost = (e, P, d, a, sp, dt, walk, H) => lordAI(e, P, d, a, sp, dt, walk, H, { reach: 3, every: 3.4,
    busyMove: (e2, P2, d2, a2, sp2, dt2, H2) => { if (e2.dash) { H2.move(e2, e2.dash.a, 12, dt2); if (!e2.dash.hit && Math.hypot(P2.x - e2.x, P2.z - e2.z) < 2) { e2.dash.hit = 1; H2.hurtT(P2, e2.dmg * 1.4, e2, { knock: 0.7 }); } return true; } return false; },
    moves: [
      (e2, P2, d2, a2) => { [-0.35, 0, 0.35].forEach(o => march(e2, a2 + o, 7, 1.7, 0.12, 1.1, 1.1, '#CFE6FF')); },
      (e2) => { wave(e2, 10, 7, 1, '#CFE6FF', t => { if (t === W().P) t.slowT = Math.max(t.slowT || 0, 2.5); }); },
      (e2, P2, d2, a2) => { e2.busy = 1.4; R.fx('aim', e2.x, 0.3, e2.z, { a: a2, len: 12, t: 0.6 }); later(() => { e2.dash = { a: a2 }; later(() => { e2.dash = null; }, 800); }, 600); },
      (e2) => { summon(e2, 'icewarden', 2, 0.5); R.toast('冰棺守從冰裡站了起來'); }
    ] });
  // 熔顎蜥：噴火（扇形＋熔岩）、熔岩雨、甩尾（一圈）、熔岩衝撞
  AI.l_lava = (e, P, d, a, sp, dt, walk, H) => lordAI(e, P, d, a, sp, dt, walk, H, { reach: 3.2, every: 3.6,
    moves: [
      (e2, P2, d2, a2) => { e2.busy = 1.1; cone(e2, a2, 1.4, 8, 1.0, 1.4, '#FF7A3A', () => { for (let i = 2; i <= 7; i += 2.5) { const [x, z] = floor(e2.x + Math.sin(a2) * i, e2.z + Math.cos(a2) * i); zone(x, z, 1.2, 4, e2.dmg * 0.3); } }); },
      (e2, P2) => { booms(e2, around(P2, 7, 4), 1.6, 1.15, 1.2, '#FF7A3A', (x, z) => zone(x, z, 1.1, 3.5, e2.dmg * 0.3)); R.toast('天花板上落下了熔岩'); },
      (e2) => { e2.busy = 0.9; R.fx('mark', e2.x, 0, e2.z, { r: 4.2, t: 0.8 }); later(() => { if (e2.dead) return; R.fx('ring', e2.x, 0.1, e2.z, { r: 4.2, color: '#FF7A3A' }); targets().forEach(t => { if (Math.hypot(t.x - e2.x, t.z - e2.z) < 4.2) hitT(t, e2.dmg * 1.2, e2, { knock: 0.6 }); }); R.shake(0.35); }, 800); },
      (e2, P2) => { fan(e2, Math.atan2(P2.x - e2.x, P2.z - e2.z), 7, 0.18, 'fire', 9, 0.7); }
    ] });
  // 沙暴鯨：潛沙（從腳下衝出）、追人的沙暴、噴沙（遮眼）、尾巴拍地（一排）
  AI.l_sand = (e, P, d, a, sp, dt, walk, H) => {
    if (e.dive) { e.dive.t -= dt; if (e.dive.t <= 0) { const v = e.dive; e.dive = null; e.x = v.x; e.z = v.z; e.m.g.position.set(v.x, 0, v.z); e.m.g.visible = true; e.invuln = false; R.fx('boom', v.x, 0.3, v.z, { r: 3, color: '#C8A870' }); R.shake(0.5); targets().forEach(t => { if (Math.hypot(t.x - v.x, t.z - v.z) < 3) hitT(t, e.dmg * 1.6, e, { knock: 0.7 }); }); e.pat = 1.5; } return false; }
    return lordAI(e, P, d, a, sp, dt, walk, H, { reach: 3.4, every: 3.8,
      moves: [
        (e2, P2) => { e2.dive = { t: 1.4, x: P2.x, z: P2.z }; e2.invuln = true; e2.m.g.visible = false; R.fx('poof', e2.x, 0.5, e2.z, { color: '#C8A870', n: 16 }); R.fx('mark', P2.x, 0, P2.z, { r: 3, t: 1.4 }); },
        (e2) => { const w = W(), run = w.run; for (let i = 0; i < 3; i++) { const [x, z] = floor(e2.x + rnd() * 6 - 3, e2.z + rnd() * 6 - 3), zn = zone(x, z, 1.4, 7, e2.dmg * 0.35, '#D8B880', 'caltrop'); if (!zn) continue; const sp2 = 1.6 + rnd(); w.dyn.push(dt => { if (w.run !== run || zn.dead) return false; const Pl = w.P, aa = Math.atan2(Pl.x - zn.x, Pl.z - zn.z); zn.x += Math.sin(aa) * sp2 * dt; zn.z += Math.cos(aa) * sp2 * dt; zn.mesh.position.set(zn.x, 0.06, zn.z); return true; }); } R.toast('捲起了會追人的沙暴'); },
        (e2, P2, d2, a2) => { fan(e2, a2, 9, 0.14, 'sand', 10, 0.6); },
        (e2, P2, d2, a2) => { march(e2, a2, 8, 1.8, 0.14, 1.4, 1.2, '#C8A870'); }
      ] });
  };
  // 深淵王蛸：觸手砸（好幾條直線）、噴墨（看不清楚）、叫深淵觸手、漩渦（把人拉過去）
  AI.l_kraken = (e, P, d, a, sp, dt, walk, H) => lordAI(e, P, d, a, sp, dt, walk, H, { reach: 3, every: 3.5, keep: [4, 9],
    moves: [
      (e2, P2, d2, a2) => { [-0.5, -0.17, 0.17, 0.5].forEach(o => line(e2, a2 + o, 11, 0.8, 1.2)); },
      (e2, P2) => { around(P2, 4, 3).forEach(([x, z]) => zone(x, z, 1.8, 5, 0, '#2A1A2A', 'web')); const Pl = W().P; if (Math.hypot(Pl.x - e2.x, Pl.z - e2.z) < 12) Pl.blindT = Math.max(Pl.blindT || 0, 2.5); R.fx('poof', e2.x, 1, e2.z, { color: '#1A0E18', n: 24 }); },
      (e2) => { summon(e2, 'abyssarm', 2, 0.55); R.toast('地板裂開，伸出了觸手'); },
      (e2) => { const w = W(), run = w.run; let t = 2.2; R.fx('ring', e2.x, 0.1, e2.z, { r: 10, color: '#5A2A4A' }); R.toast('漩渦把人往王蛸那裡拉'); w.dyn.push(dt => { if (w.run !== run || e2.dead) return false; t -= dt; const Pl = w.P, dd = Math.hypot(Pl.x - e2.x, Pl.z - e2.z); if (dd > 2 && dd < 12 && !(Pl.iframe > 0)) { const aa = Math.atan2(e2.x - Pl.x, e2.z - Pl.z); Pl.x += Math.sin(aa) * 2.6 * dt; Pl.z += Math.cos(aa) * 2.6 * dt; R.collide(Pl, 0.42); } return t > 0; }); }
    ] });
  // 萬面樹：樹根竄過來（兩排）、種子雨（一圈）、腳下纏住、結出根童
  AI.l_tree = (e, P, d, a, sp, dt, walk, H) => lordAI(e, P, d, a, sp, dt, walk, H, { every: 3,
    moves: [
      (e2, P2, d2, a2) => { [-0.25, 0.25].forEach(o => march(e2, a2 + o, 9, 1.6, 0.15, 1.2, 1.1, '#5A3E26')); },
      (e2) => { radial(e2, 20, 'seed', 8, 0.6, e2.t); later(() => { if (!e2.dead) radial(e2, 20, 'seed', 8, 0.6, e2.t + 0.16); }, 500); },
      (e2, P2) => { booms(e2, around(P2, 3, 2), 1.4, 0.9, 0.8, '#3A5A2E', (x, z) => { const Pl = W().P; if (Math.hypot(Pl.x - x, Pl.z - z) < 1.4) Pl.slowT = Math.max(Pl.slowT || 0, 2.2); }); },
      (e2) => { summon(e2, 'kodama', 3, 0.8); R.toast('果實落地，變成了根童'); }
    ] });
  // 朽翼龍：俯衝（落點有大圈）、骨焰（直線）、搧翅膀（羽毛＋把人吹開）、咆哮
  AI.l_wyvern = (e, P, d, a, sp, dt, walk, H) => lordAI(e, P, d, a, sp, dt, walk, H, { reach: 3, every: 3.4, keep: [3, 8],
    busyMove: (e2, P2, d2, a2, sp2, dt2, H2) => { if (e2.swoop) { const s = e2.swoop, dx = s.x - e2.x, dz = s.z - e2.z, dd = Math.hypot(dx, dz); if (dd > 0.3) { const k = Math.min(dd, 16 * dt2); e2.x += dx / dd * k; e2.z += dz / dd * k; } return true; } return false; },
    moves: [
      (e2, P2) => { const x = P2.x, z = P2.z; e2.busy = 1.3; R.fx('mark', x, 0, z, { r: 2.8, t: 1.1 }); later(() => { e2.swoop = { x, z }; later(() => { e2.swoop = null; if (e2.dead) return; R.fx('boom', e2.x, 0.3, e2.z, { r: 2.8, color: '#D8D0C0' }); R.shake(0.5); targets().forEach(t => { if (Math.hypot(t.x - e2.x, t.z - e2.z) < 2.8) hitT(t, e2.dmg * 1.5, e2, { knock: 0.6 }); }); }, 450); }, 700); },
      (e2, P2, d2, a2) => { e2.busy = 1; line(e2, a2, 14, 0.9, 1.5); },
      (e2, P2, d2, a2) => { fan(e2, a2, 7, 0.2, 'feather', 12, 0.6); const Pl = W().P, dd = Math.hypot(Pl.x - e2.x, Pl.z - e2.z); if (dd < 7 && !(Pl.iframe > 0)) { const aa = Math.atan2(Pl.x - e2.x, Pl.z - e2.z); Pl.x += Math.sin(aa) * 3; Pl.z += Math.cos(aa) * 3; R.collide(Pl, 0.42); } },
      (e2) => wave(e2, 9, 7, 1, '#D8D0C0')
    ] });
  // 雷鳴猿：跳起來砸（落地一圈落雷）、落雷陣、連續揮拳（三次扇形）、咆哮
  AI.l_ape = (e, P, d, a, sp, dt, walk, H) => {
    if (e.leapA) { const s = e.leapA; s.t += dt; const k = Math.min(1, s.t / 0.8); e.x = s.x0 + (s.x1 - s.x0) * k; e.z = s.z0 + (s.z1 - s.z0) * k; e.m.g.position.y = Math.sin(k * Math.PI) * 4; if (k >= 1) { e.leapA = null; e.m.g.position.y = 0; R.fx('boom', e.x, 0.3, e.z, { r: 3.2, color: '#4A4A7A' }); R.shake(0.5); targets().forEach(t => { if (Math.hypot(t.x - e.x, t.z - e.z) < 3.2) hitT(t, e.dmg * 1.4, e, { knock: 0.6 }); }); const pts = Array.from({ length: 6 }, (_, i) => floor(e.x + Math.sin(i / 6 * 6.28) * 4.5, e.z + Math.cos(i / 6 * 6.28) * 4.5)); booms(e, pts, 1.3, 0.6, 1, '#C8B4FF'); } return true; }
    return lordAI(e, P, d, a, sp, dt, walk, H, { reach: 3, every: 3.2,
      moves: [
        (e2, P2) => { R.fx('mark', P2.x, 0, P2.z, { r: 3.2, t: 0.8 }); e2.leapA = { t: 0, x0: e2.x, z0: e2.z, x1: P2.x, z1: P2.z }; },
        (e2, P2) => { const pts = around(P2, 6, 4); pts.forEach(([x, z]) => R.fx('mark', x, 0, z, { r: 1.6, t: 0.9 })); later(() => { if (e2.dead) return; pts.forEach(([x, z]) => { R.fx('pillar', x, 0, z, { r: 0.8, color: '#C8B4FF' }); targets().forEach(t => { if (Math.hypot(t.x - x, t.z - z) < 1.6) hitT(t, e2.dmg * 1.2, e2); }); }); }, 900); },
        (e2, P2, d2, a2) => { e2.busy = 1.8; [0, 550, 1100].forEach(ms => later(() => { if (e2.dead) return; const Pl = W().P, aa = Math.atan2(Pl.x - e2.x, Pl.z - e2.z); cone(e2, aa, 1.6, 4, 0.4, 1, '#FFE04A'); }, ms)); },
        (e2) => wave(e2, 9, 7.5, 1.1, '#FFE04A')
      ] });
  };

  // ---------- 克森特級：領主區更多、照環境和遺跡形式挑 ----------
  const ENV_LORD = { snow: 'frostdeer', volcano: 'lavajaw', desert: 'sandwhale', deep: 'kraken' };
  const TYPE_LORD = { maze: 'faceforest', tower: 'bonewyvern', city: 'thunderape' };
  const kes = R.GRADES.find(g => g.id === 'kesent'), BASE = kes ? (kes.lords || []).slice() : [];
  if (kes) kes.lords = BASE.concat(['faceforest', 'bonewyvern', 'thunderape']);
  Object.keys(TYPE_LORD).forEach(t => { if (R.TYPES[t] && !R.TYPES[t].lord) R.TYPES[t].lord = TYPE_LORD[t]; });
  const gf = R.genFloor;
  R.genFloor = (run, f) => {
    const g = run.grade;
    if (g.lords) { const envL = ENV_LORD[run.env]; g.lords = envL ? [envL, envL, envL].concat(BASE, ['faceforest', 'bonewyvern', 'thunderape']) : BASE.concat(['faceforest', 'bonewyvern', 'thunderape']); }
    const F = gf(run, f);
    if (g.lords && !F.last) {
      const have = F.rooms.filter(r => r.type === 'lord').length, cand = F.rooms.filter(r => r.type === 'fight' && r.dist >= 2 && !r.big && !r.zone);   // 大空洞打通的房間不行（zones.js；算清空過，領主不會出現）
      const want = F.rooms.length >= 10 && rnd() < 0.4 ? 2 : 1;
      for (let i = have; i < want && cand.length; i++) { const r = cand.splice(Math.floor(rnd() * cand.length), 1)[0]; r.type = 'lord'; }
    }
    return F;
  };
})(window.R);
