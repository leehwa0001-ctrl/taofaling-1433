// 東鶴的街頭生活：騎腳踏車的人、貓、狗（散步的、拴在門口的、流浪的）、烏鴉、鴿子
// 點陣圖用 sprites.js 的遺跡生物同一套（R.BEAST_ART：朝右畫，朝左自動鏡像）。
// 腳踏車走路人的路網（city.js 的 C.nodes／C.adj），前面有人會按鈴、放慢；鳥被靠近會飛走，過一陣子飛回來。
(function (R) {
  const W = () => R.W, ART = R.BEAST_ART;
  if (!ART) return;
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * (1 + k)))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join(''); };

  // ---------- 點陣圖：用線和圓畫出來，再轉成字串 ----------
  const grid = (w, h) => {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    const o = {
      p(x, y, c) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c; },
      line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) o.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
      ring(cx, cy, r, c) { for (let a = 0; a < 48; a++) o.p(cx + Math.cos(a / 48 * Math.PI * 2) * r, cy + Math.sin(a / 48 * Math.PI * 2) * r, c); },
      disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 0.6) o.p(cx + x, cy + y, c); },
      rows: () => g.map(r => r.join(''))
    };
    return o;
  };
  // 騎媽媽車的人（側面，朝右）：兩格踩踏板
  const cyclistRows = fr => {
    const G = grid(26, 27), RW = [5, 21], FW = [20, 21], CR = [12, 21];
    [RW, FW].forEach(([x, y]) => { G.ring(x, y, 4.5, 'w'); if (fr) { G.line(x - 3, y - 3, x + 3, y + 3, 'W'); G.line(x - 3, y + 3, x + 3, y - 3, 'W'); } else { G.line(x - 4, y, x + 4, y, 'W'); G.line(x, y - 4, x, y + 4, 'W'); } G.p(x, y, 'g'); });
    G.line(RW[0], RW[1], CR[0], CR[1], 'f'); G.line(CR[0], CR[1], 9, 14, 'f'); G.line(9, 14, RW[0], RW[1], 'f');
    G.line(CR[0], CR[1], 15, 17, 'f'); G.line(15, 17, 17, 14, 'f'); G.line(17, 13, FW[0], FW[1], 'f');
    G.line(17, 13, 17, 11, 'f'); G.line(16, 11, 18, 11, 'g'); G.line(8, 13, 10, 13, 'g');
    // 腳：遠的那隻顏色深一點
    const near = fr ? [12, 18.5] : [14.5, 21], far = fr ? [12, 23.5] : [9.5, 21], knee = (pd, f) => fr ? (f ? [11, 17] : [14, 14]) : (f ? [11.5, 16] : [13, 15]);
    G.line(9, 12, knee(far, 1)[0], knee(far, 1)[1], 'P'); G.line(knee(far, 1)[0], knee(far, 1)[1], far[0], far[1], 'P'); G.p(far[0], far[1], 'k');
    for (let dx = -1; dx <= 1; dx++) G.line(9 + dx, 12, 12 + dx, 6, 't');
    G.line(9, 12, knee(near, 0)[0], knee(near, 0)[1], 'p'); G.line(9, 11, knee(near, 0)[0], knee(near, 0)[1] - 1, 'p'); G.line(knee(near, 0)[0], knee(near, 0)[1], near[0], near[1], 'p'); G.p(near[0], near[1], 'k'); G.p(near[0] + 1, near[1], 'k');
    G.line(12, 7, 15, 10, 't'); G.p(16, 10, 's');
    G.disc(13, 3, 2, 's'); [[11, 1], [12, 1], [13, 1], [14, 1], [11, 2], [12, 2], [11, 3], [12, 3], [11, 4], [12, 0], [13, 0], [14, 0]].forEach(([x, y]) => G.p(x, y, 'h')); G.p(14, 3, 'e');
    for (let y = 10; y <= 13; y++) for (let x = 19; x <= 23; x++) G.p(x, y, (y === 10 || y === 13 || x === 19 || x === 23) ? 'b' : (x + y) % 2 ? 'b' : '.');
    return G.rows();
  };
  const CYC = { a: cyclistRows(0), b: cyclistRows(1) };
  const FRAMES = ['#B8BCC4', '#B83A3A', '#3A5A9A', '#2A2A2E', '#3E7A48', '#E8E4DC'];
  const TOPS = ['#1A1E2E', '#3E5A6E', '#7A5A6A', '#8A3A2E', '#2E4A6A', '#5A6A4A', '#C8A040', '#E8E4DC'];
  const PANTS = ['#2E3A5A', '#3A3A44', '#5A4A3A', '#1A1E2E', '#6A5A4A'];
  const SKINS = ['#F2D6B8', '#E8C29A', '#D6A57A', '#B8845A'], HAIRS = ['#2A2420', '#1A1714', '#6A4A2E', '#8A8478', '#D8D2C4'];
  const NCYC = 10;
  for (let i = 0; i < NCYC; i++) {
    const p = PANTS[i % PANTS.length];
    ART['cyc' + i] = { pal: { w: '#26262C', W: '#9A9AA6', g: '#18181C', f: FRAMES[i % FRAMES.length], b: '#C8C8D0', t: TOPS[(i * 3) % TOPS.length], s: SKINS[i % SKINS.length], h: HAIRS[(i * 2) % HAIRS.length], e: '#1A1714', p, P: shade(p, -0.35), k: '#141414' }, a: CYC.a, b: CYC.b };
  }
  // 貓（坐著／走路）
  const CAT = {
    a: ['.........a.a', 'd........aaa', 'd........eae', '.d.aaaaaaaan', '..aaaaaaaaa.', '..aaaaaaaa..', '..a.a..a.a..', '..a.a..a.a..'],
    b: ['.........a.a', '.d.......aaa', '.d.......eae', '..daaaaaaaan', '..aaaaaaaaa.', '..aaaaaaaa..', '...a.a.a.a..', '..a...a...a.']
  };
  [['#2A2420', '#1A1410'], ['#D8843A', '#A85A1E'], ['#E8E4DC', '#B8B0A0'], ['#8A8478', '#5A544A']].forEach(([a, d], i) => { ART['cat' + i] = { pal: { a, d, e: i === 0 ? '#E8D040' : '#2A5A2A', n: '#E87A8A' }, a: CAT.a, b: CAT.b }; });
  // 狗（柴犬的樣子）
  const DOG = {
    a: ['...........a.a.', '..........aaaa.', 'c.........aeaaa', 'cc.......aaaaan', '.cccaaaaaaaaww.', '..aaaaaaaaaaww.', '..aaaaaaaaaaa..', '..wwwwwwwwwww..', '..a.a.....a.a..', '..a.a.....a.a..'],
    b: ['...........a.a.', '..........aaaa.', 'c.........aeaaa', 'cc.......aaaaan', '.cccaaaaaaaaww.', '..aaaaaaaaaaww.', '..aaaaaaaaaaa..', '..wwwwwwwwwww..', '...a.a...a.a...', '..a...a.a...a..']
  };
  [['#C8803A', '#F0E6D6'], ['#2A2420', '#C8A880'], ['#E8E4DC', '#FFFFFF'], ['#8A5A3A', '#D8C8A8']].forEach(([a, w], i) => { ART['dog' + i] = { pal: { a, c: shade(a, 0.15), w, e: '#141414', n: '#141414' }, a: DOG.a, b: DOG.b }; });
  // 鳥：地上（啄地）、飛（拍翅）；四張圖一樣大，才能用 R.beastVariant 換
  const BIRD = {
    a: ['.........', '.....kkk.', '....kkekb', 'kk.kkkkk.', '.kkkkkkk.', '..kkkkk..', '....k.k..', '...kk.kk.'],
    b: ['.........', '.........', '.........', 'kk.kkkk..', '.kkkkkkkk', '..kkkkkeb', '....k.k..', '...kk.kk.']
  };
  const FLY = {
    a: ['k.......k', 'kk.....kk', '.kk.k.kk.', '..kkkkkeb', '...kkk...', '.........', '.........', '.........'],
    b: ['.........', '.........', '...kkkkeb', '..kkkkk..', '.kk...kk.', 'k.......k', '.........', '.........']
  };
  ART.crow = { pal: { k: '#1A1A22', e: '#5A5A6A', b: '#2A2A30' }, a: BIRD.a, b: BIRD.b };
  ART.crowfly = { pal: ART.crow.pal, a: FLY.a, b: FLY.b };
  ART.pigeon = { pal: { k: '#8A8E9A', e: '#3A7A6A', b: '#D8A0A0' }, a: BIRD.a, b: BIRD.b };
  ART.pigeonfly = { pal: ART.pigeon.pal, a: FLY.a, b: FLY.b };

  // ---------- 蓋：進城的時候放上去 ----------
  const setup = () => {
    const w = W(), tw = w.town, C = R.CITY; if (!tw || !C || !tw.group) return;
    const S = C.S, WX = sx => (sx - 500) * S, WZ = WX, E = R.eventsToday ? R.eventsToday() : {};
    const L = tw.life = { bikes: [], pets: [], birds: [], t: 0 };
    const add = (id, x, z) => { const m = R.makeBeastSprite(id); m.g.position.set(x, 0, z); tw.group.add(m.g); return m; };
    // 腳踏車
    const busy = C.nodes.map((p, i) => i).filter(i => { const [sx, sy] = C.nodes[i]; return sy > 280 && sy < 900 && sx > 230; });
    const nextNode = b => { const nb = C.adj[b.ni]; if (nb && nb.length) { let k = pick(nb); if (nb.length > 1 && k === b.prev) k = pick(nb); b.prev = b.ni; b.ni = k; } const [sx, sy] = C.nodes[b.ni]; b.tx = WX(sx + (rnd() - 0.5) * 3); b.tz = WZ(sy + (rnd() - 0.5) * 3); };
    const nB = E.martial ? 3 : E.blizzard ? 4 : 18;
    for (let i = 0; i < nB; i++) {
      const ni = pick(busy), id = 'cyc' + (i % NCYC), x = WX(C.nodes[ni][0]), z = WZ(C.nodes[ni][1]);
      const b = { m: add(id, x, z), id, x, z, ni, prev: -1, tx: x, tz: z, sp: 3.4 + rnd() * 1.8, v: 0, t: rnd() * 10, rank: (i * 0.618) % 1, bell: 0 };
      nextNode(b); L.bikes.push(b);
    }
    // 貓：住宅區的房子門口、舊城、巷子
    const homes = C.lots.filter(l => /house|oldhouse|kura/.test(l.type) && l.type !== 'warehouse');
    const at = l => [WX((l.r[0] + l.r[2]) / 2 + (rnd() - 0.5) * 6), WZ(l.f === 0 ? l.r[3] + 3 : l.f === 2 ? l.r[1] - 3 : (l.r[1] + l.r[3]) / 2)];
    const free = (x, z) => { const o = { x, z }; R.collide(o, 0.3); return Math.hypot(o.x - x, o.z - z) < 0.05; };
    const spot = (fn, tries) => { for (let k = 0; k < (tries || 12); k++) { const p = fn(); if (p && free(p[0], p[1])) return p; } return null; };
    const nCat = E.blizzard ? 4 : 12;
    for (let i = 0; i < nCat; i++) { const p = spot(() => at(pick(homes))); if (!p) continue; const id = 'cat' + (i % 4); L.pets.push({ kind: 'cat', m: add(id, p[0], p[1]), id, x: p[0], z: p[1], hx: p[0], hz: p[1], st: 'sit', t: rnd() * 6, rot: rnd() * 6.28, sp: 0 }); }
    // 狗：一部分跟著散步的人；幾隻拴在家門口（有狗屋）；幾隻流浪狗在巷子
    const walkers = tw.npcs.filter(n => n.walk && !n.patrol && !n.name && !n.guard && !(n.watch && n.watch.guard));
    for (let i = 0; i < Math.min(E.blizzard ? 2 : 7, walkers.length); i++) { const o = walkers[Math.floor(i * walkers.length / 7)]; const id = 'dog' + (i % 4); L.pets.push({ kind: 'dog', mode: 'walk', owner: o, m: add(id, o.x, o.z), id, x: o.x, z: o.z, st: 'walk', t: 0, rot: 0 }); }
    for (let i = 0; i < 5; i++) {
      const p = spot(() => at(pick(homes))); if (!p) continue; const id = 'dog' + ((i + 1) % 4);
      L.pets.push({ kind: 'dog', mode: 'chain', m: add(id, p[0], p[1]), id, x: p[0], z: p[1], hx: p[0], hz: p[1], st: 'sit', t: rnd() * 4, rot: rnd() * 6.28, barkT: 0 });
    }
    if (C.FAC.alley) for (let i = 0; i < 2; i++) { const A = C.FAC.alley, p = spot(() => [WX((A[0] + A[1]) / 2 + (rnd() - 0.5) * (A[1] - A[0])), WZ(A[2] + (rnd() - 0.5) * 8)]); if (!p) continue; L.pets.push({ kind: 'dog', mode: 'stray', m: add('dog' + (i ? 1 : 3), p[0], p[1]), id: 'dog' + (i ? 1 : 3), x: p[0], z: p[1], hx: p[0], hz: p[1], st: 'sit', t: rnd() * 4, rot: 0, barkT: 0 }); }
    // 鳥：鴿子在車站前、神社、廣場；烏鴉在公園、寺、垃圾集中處附近
    const flock = (kind, sx, sy, n, spread) => { for (let i = 0; i < n; i++) { const p = spot(() => [WX(sx + (rnd() - 0.5) * spread), WZ(sy + (rnd() - 0.5) * spread)], 6); if (!p) continue; const id = kind; L.birds.push({ kind, m: add(id, p[0], p[1]), id, x: p[0], z: p[1], y: 0, hx: p[0], hz: p[1], st: 'ground', t: rnd() * 3, rot: rnd() * 6.28, vx: 0, vz: 0, vy: 0, away: 0 }); } };
    const F = C.FAC;
    if (!E.blizzard) {
      flock('pigeon', (C.PLAZA[0] + C.PLAZA[2]) / 2, (C.PLAZA[1] + C.PLAZA[3]) / 2, 8, 40);
      if (F.shrine) flock('pigeon', F.shrine[0], F.shrine[1] + 14, 4, 14);
      flock('pigeon', C.SQUARE[0], C.SQUARE[1], 4, 20);
      (C.PARKS || []).slice(0, 2).forEach(r => flock('crow', (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, 3, 16));
      if (F.temple) flock('crow', F.temple[0], F.temple[1] - 16, 3, 16);
      if (F.park) flock('crow', F.park[0], F.park[1], 3, 14);
    }
    // 摸摸貓、狗（跟著動物走的互動點；town.js 的 follow 會把 z 加 1.1，這裡先扣掉）
    L.pets.forEach(a => {
      const f = { get x() { return a.x; }, get z() { return a.z - 1.1; } };
      tw.inter.push({ x: a.x, z: a.z, r: 1.5, follow: f, label: a.kind === 'cat' ? '摸摸貓' : a.mode === 'walk' ? '摸摸散步的狗' : '摸摸狗', when: () => a.st !== 'flee' && a.m.g.visible, act: () => pet(a) });
    });
  };
  const pet = a => {
    const xeno = R.xenoLevel ? R.xenoLevel() : 0, heat = R.crime ? R.crime.heat : 0;
    let line;
    if (a.kind === 'cat') line = xeno >= 3 ? '貓盯著你的角看了一下，尾巴炸開，跑掉了。' : pick(['貓瞇起眼睛，喉嚨咕嚕咕嚕地響。', '貓聞了聞你的手指，轉頭走了。', '貓翻過來露出肚子——一摸就被抓了一下。', '貓用頭頂你的手，要你再摸一下。']);
    else if (heat > 0) line = '狗對著你低吼。牠好像知道你剛剛做了什麼。';
    else if (a.mode === 'walk') line = pick(['「牠很親人，摸吧。」狗搖著尾巴。', '狗舔了舔你的手。牽著牠的人笑了一下。', '「別餵牠吃的喔。」狗在你腳邊轉了一圈。']);
    else line = pick(['狗搖著尾巴，把頭靠過來。', '狗翻過身，要你摸肚子。', '狗聞了聞你身上遺跡的味道，打了個噴嚏。']);
    if (a.kind === 'cat' && (xeno >= 3 || rnd() < 0.25)) { a.st = 'flee'; a.t = 1.6; }
    R.sfx && R.sfx(a.kind === 'cat' ? 'meow' : 'bark');
    R.townToast(line);
  };

  // ---------- 每一格 ----------
  const near = (o, P, r) => Math.abs(o.x - P.x) < r && Math.abs(o.z - P.z) < r;
  const step = dt => {
    const w = W(), tw = w.town, P = w.P, L = tw && tw.life; if (!L || !P || w.inside) return;
    L.t += dt;
    const h = R.hourNow ? ((R.hourNow() % 24) + 24) % 24 : 12, dayK = h < 5 ? 0.08 : h < 7 ? 0.4 : h < 19.5 ? 1 : h < 22 ? 0.5 : 0.15;
    const running = R.running && R.running(), heat = R.crime ? R.crime.heat : 0;
    // 腳踏車
    L.bikes.forEach(b => {
      const vis = b.rank < dayK && near(b, P, 70); b.m.g.visible = vis;
      if (b.rank >= dayK) return;
      const dx = b.tx - b.x, dz = b.tz - b.z, d = Math.hypot(dx, dz);
      if (d < 0.6) { const C = R.CITY, nb = C.adj[b.ni]; if (nb && nb.length) { let k = pick(nb); if (nb.length > 1 && k === b.prev) k = pick(nb); b.prev = b.ni; b.ni = k; } const [sx, sy] = C.nodes[b.ni]; b.tx = (sx + (rnd() - 0.5) * 3 - 500) * C.S; b.tz = (sy + (rnd() - 0.5) * 3 - 500) * C.S; return; }
      const ux = dx / d, uz = dz / d;
      let want = b.sp;
      if (vis) {
        // 前面有人（你或路人）：按鈴、放慢；太近就停
        const ahead = o => { const ox = o.x - b.x, oz = o.z - b.z, al = ox * ux + oz * uz, sd = Math.abs(ox * uz - oz * ux); return al > 0.3 && al < 4 && sd < 0.9 ? al : 0; };
        // 路人停著不動：等一下就從旁邊繞過去（你擋著就一直等）
        let blk = ahead(P); if (!blk && !(b.pass > 0)) for (const n of tw.npcs) { if (n.off || !n.h.g.visible) continue; const a = ahead(n); if (a) { blk = a; break; } }
        b.pass = (b.pass || 0) - dt; b.wait = blk && blk < 1.4 ? (b.wait || 0) + dt : 0; if (b.wait > 1.5 && blk !== ahead(P)) { b.pass = 1.5; b.wait = 0; blk = 0; }
        if (blk) { want = blk < 1.4 ? 0 : 1.2; if (blk < 3 && b.bell <= 0 && blk === ahead(P)) { b.bell = 4; R.sfx && R.sfx('bell'); R.townToast('鈴鈴——腳踏車在你後面按鈴。'); } }
      }
      b.bell -= dt; b.v += (want - b.v) * Math.min(1, dt * 3);
      b.x += ux * b.v * dt; b.z += uz * b.v * dt; b.t += dt * (b.v > 0.3 ? 1 : 0);
      if (vis) { b.m.g.position.set(b.x, 0, b.z); b.m.g.rotation.y = Math.atan2(ux, uz); R.animBeastSprite(b.m, b.id, b.t, b.v > 0.3); }
    });
    // 貓、狗
    L.pets.forEach(a => {
      if (a.mode === 'walk') {
        const o = a.owner, show = !o.off && o.h.g.visible; a.m.g.visible = show && near(a, P, 70); if (!show) { a.x = o.x; a.z = o.z; return; }
        const r = o.h.g.rotation.y, tx = o.x - Math.sin(r) * 1.1 + Math.cos(r) * 0.5, tz = o.z - Math.cos(r) * 1.1 - Math.sin(r) * 0.5, dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
        if (d > 6) { a.x = tx; a.z = tz; } else if (d > 0.15) { const sp = Math.min(d * 3, 5); a.x += dx / d * sp * dt; a.z += dz / d * sp * dt; a.rot = Math.atan2(dx, dz); }
        a.t += dt; a.m.g.position.set(a.x, 0, a.z); a.m.g.rotation.y = a.rot; R.animBeastSprite(a.m, a.id, d > 0.3 ? a.t : 0, d > 0.3);
        barkAt(a, P, heat, dt); return;
      }
      const vis = near(a, P, 60); a.m.g.visible = vis; if (!vis) return;
      const pd = Math.hypot(P.x - a.x, P.z - a.z);
      a.t -= dt;
      if (a.kind === 'cat' && a.st !== 'flee' && (pd < 1.2 && running || pd < 3.5 && running || heat > 0 && pd < 4)) { a.st = 'flee'; a.t = 1.4 + rnd(); }
      if (a.st === 'flee') {
        const ang = Math.atan2(a.x - P.x, a.z - P.z); a.rot = ang; const o = { x: a.x + Math.sin(ang) * 5.5 * dt, z: a.z + Math.cos(ang) * 5.5 * dt }; R.collide(o, 0.3); a.x = o.x; a.z = o.z;
        if (a.t <= 0) { a.st = 'sit'; a.t = 3 + rnd() * 5; }
      } else if (a.st === 'go') {
        const dx = a.gx - a.x, dz = a.gz - a.z, d = Math.hypot(dx, dz);
        if (d < 0.2 || a.t <= 0) { a.st = 'sit'; a.t = 2 + rnd() * 6; }
        else { const sp = a.kind === 'cat' ? 0.9 : 1.3, o = { x: a.x + dx / d * sp * dt, z: a.z + dz / d * sp * dt }; R.collide(o, 0.3); if (Math.hypot(o.x - a.x, o.z - a.z) < sp * dt * 0.3) a.t = 0; a.x = o.x; a.z = o.z; a.rot = Math.atan2(dx, dz); }
      } else if (a.t <= 0) {
        // 拴著的狗只在家門口附近走動；貓、流浪狗走遠一點，但不離開家太遠
        const R0 = a.mode === 'chain' ? 1.2 : a.kind === 'cat' ? 5 : 7, ang = rnd() * 6.28, hx = a.hx, hz = a.hz;
        a.gx = hx + Math.sin(ang) * R0 * rnd(); a.gz = hz + Math.cos(ang) * R0 * rnd(); a.st = 'go'; a.t = 6;
      }
      if (a.kind === 'dog') barkAt(a, P, heat, dt);
      a.m.g.position.set(a.x, 0, a.z); a.m.g.rotation.y = a.rot; const mv = a.st === 'go' || a.st === 'flee'; R.animBeastSprite(a.m, a.id, mv ? L.t : 0, mv);
    });
    // 鳥
    L.birds.forEach(b => {
      const vis = near(b, P, 60) && b.st !== 'gone'; b.m.g.visible = vis;
      if (b.st === 'gone') { b.t -= dt; if (b.t <= 0 && Math.hypot(P.x - b.hx, P.z - b.hz) > 16) { b.st = 'ground'; b.x = b.hx; b.z = b.hz; b.y = 0; R.beastVariant(b.m, b.id); } return; }
      const pd = Math.hypot(P.x - b.x, P.z - b.z);
      if (b.st === 'ground') {
        if (pd < (running ? 6 : 3)) {
          // 一隻飛，附近的也跟著飛
          const fly = q => { if (q.st !== 'ground') return; q.st = 'fly'; q.t = 0; const a = Math.atan2(q.x - P.x, q.z - P.z) + (rnd() - 0.5) * 0.8, sp = 4 + rnd() * 2; q.vx = Math.sin(a) * sp; q.vz = Math.cos(a) * sp; q.vy = 3 + rnd() * 1.5; R.beastVariant(q.m, q.id + 'fly'); };
          fly(b); L.birds.forEach(q => { if (q !== b && Math.hypot(q.x - b.x, q.z - b.z) < 6) fly(q); }); if (b.kind === 'crow' && R.playSfx) R.playSfx('caw', 2000);
        } else {
          b.t -= dt; if (b.t <= 0) { b.t = 0.6 + rnd() * 2.2; if (rnd() < 0.5) { const a = rnd() * 6.28; b.rot = a; b.hop = 0.25; } }
          if (b.hop > 0) { b.hop -= dt; const o = { x: b.x + Math.sin(b.rot) * 1.4 * dt, z: b.z + Math.cos(b.rot) * 1.4 * dt }; if (Math.hypot(o.x - b.hx, o.z - b.hz) < 4) { b.x = o.x; b.z = o.z; } }
        }
      } else if (b.st === 'fly') {
        b.t += dt; b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt; b.vy = Math.max(0.6, b.vy - dt * 0.8);
        if (b.t > 4) { b.st = 'gone'; b.t = 20 + rnd() * 25; }
      }
      if (vis) {
        b.m.g.position.set(b.x, b.y, b.z); b.m.g.rotation.y = b.st === 'fly' ? Math.atan2(b.vx, b.vz) : b.rot;
        const sh = b.m.g.children[1]; if (sh) sh.position.y = 0.03 - b.y;
        R.animBeastSprite(b.m, b.id, b.st === 'fly' ? b.t * 2.2 : (L.t + b.hx) * 0.3, b.st === 'fly');
      }
    });
  };
  // 狗叫：被通緝的時候看到你就叫，附近的衛兵會聽到
  const barkAt = (a, P, heat, dt) => {
    a.barkT = (a.barkT || 0) - dt;
    const d = Math.hypot(P.x - a.x, P.z - a.z);
    if (a.barkT > 0) return;
    if (heat > 0 && d < 8) { a.barkT = 3; R.sfx && R.sfx('bark'); R.townToast('汪！汪汪！——狗對著你狂叫。'); if (R.alertGuards) R.alertGuards(P.x, P.z, 30, '狗叫'); }
    else if (a.mode === 'chain' && d < 3 && rnd() < 0.5) { a.barkT = 12; R.sfx && R.sfx('bark'); R.townToast('汪！拴在門口的狗叫了兩聲。'); }
    else if (d < 3) a.barkT = 8;
  };

  const etn = R.enterTownNow;
  R.enterTownNow = (from, at) => { etn(from, at); try { setup(); } catch (e) { console.warn('townlife', e); } };
  const ts = R.townStep;
  R.townStep = dt => { ts(dt); step(dt); };
})(window.R);
