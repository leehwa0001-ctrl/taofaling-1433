// 精緻城市的街頭生活（2026-10-09 作者：其他城市也要有東鶴有的那些功能）
// 東鶴的 townlife.js（腳踏車、貓、狗、鴿子、烏鴉）和 streetlife.js（長椅上的人、路邊聊天、街頭藝人、晚上的屋台、玩雪的學生）接到精緻城市：
// - 動物、腳踏車的動作照 townlife.js（R.lifeStep：按鈴、貓被嚇跑、狗對通緝的你狂叫、鳥被靠近飛走）；這裡只負責放：
//   腳踏車沿著路人路線來回騎；貓、拴著的狗在房子門口（D.foot 的建築）；散步的狗跟著路人；鴿子在廣場（城的設定 plaza，沒寫就出生點）、烏鴉在草地。
// - 長椅（B.bench 的位置）：白天一部分坐著人（可以說話），其他的可以坐一下。
// - 路邊聊天的兩個人：沿著人行道找空的地方；偷聽得到這座城的傳聞（城的設定 gossip）。
// - 街頭藝人（早上十點到晚上九點，投 1 費拉聽一段三味線）、屋台（晚上六點到半夜：拉麵、關東煮；吃了當天下遺跡有加成）在廣場。
// - 玩雪的學生：最大的那塊草地（白天、不是暴風雪），偶爾一顆雪球打在你背上。
// 放在 citykit*.js、ckcrime.js 後面。
(function (R) {
  const CK = R.CK, W = R.W; if (!CK) return;
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const hour = () => (R.hourNow ? ((R.hourNow() % 24) + 24) % 24 : 12);
  const TOPS = ['#3A4A5A', '#5A3A3A', '#3A5A4A', '#6A5A3A', '#4A3A5A', '#7A6A5A', '#2E2E38', '#8A4A3A', '#3A6A8A', '#C8B8A0'], HAIRS = ['#1A1410', '#2A2420', '#4A3424', '#6A4A2E', '#8A8A88', '#C8C0B0'], HS = ['short', 'long', 'ponytail', 'bun', 'bob', 'crop', 'spiky'];
  const ROLES = {
    old: { name: '老人家', hair: ['#C8C0B0', '#8A8A88'], lines: ['「年輕的時候，這條街還沒有魔導路燈，晚上黑漆漆的。」', '「冬天曬太陽最舒服。」', '「我孫子也想當勇者……我叫他去念書。」', '「這張長椅我坐了三十年。換過兩次油漆。」'] },
    student: { name: '學生', top: ['#2E3A5A', '#1E2A3A'], lines: ['「明天要考試……可是好想去遊樂場。」', '「勇者證要十六歲才能考。再等兩年。」', '「聽說遺跡的入口晚上會發光。」'] },
    salary: { name: '上班族', top: ['#2E2E38', '#3A3A48'], lines: ['「午休只剩十分鐘……」', '「德克斯凡的新機器，課長說要學會操作。」', '「最近竊案很多，公司的保險箱多加了一道鎖。」'] },
    mama: { name: '主婦', top: ['#8A4A5A', '#6A5A3A', '#C8A888'], lines: ['「市場的白蘿蔔今天特價。」', '「孩子的學費又漲了。」', '「下雪天晾不了衣服，煩死了。」'] }
  };
  const GOSSIP0 = ['「聽說公會的委託板最近貼滿了遺跡的委託。」', '「德克斯凡的人又來收購土地了。」', '「魔導電車今天又誤點了。」', '「有個勇者在遺跡裡撿到會說話的劍——騙人的吧。」', '「議會選舉快到了，四個黨的海報貼得到處都是。」'];
  // ---------- 蓋城的工具：記下長椅的位置 ----------
  const eb0 = CK.extendBuilder;
  CK.extendBuilder = B => { eb0(B); B.D.benches = []; const b0 = B.bench; B.bench = (x, z, ry) => { b0(x, z, ry); const [wx, wz] = B.toWorld(x, z); B.D.benches.push([wx, wz, (ry || 0) + B.yaw(), B.Bt.yOff || 0]); }; };
  const mkNpc = (tw, x, z, rot, role, extra) => {
    const r = ROLES[role] || {}, v = Math.floor(rnd() * 4), top = r.top ? r.top[v % r.top.length] : TOPS[(v * 3 + role.length) % TOPS.length], hair = r.hair ? r.hair[v % r.hair.length] : HAIRS[v % HAIRS.length];
    const h = R.makeHero('warrior', null, { pool: 'ckl_' + role + v, lite: 1, top, hair, cloak: TOPS[(v + 5) % TOPS.length], hs: HS[(v * 2 + role.length) % HS.length], acc: role === 'old' && v < 2 ? 'glasses' : role === 'mama' && v === 1 ? 'scarf' : null, accCol: '#8A3A2E', weapon: null, shield: false });
    h.g.position.set(x, CK.heightAt(x, z), z); h.g.rotation.y = rot; tw.group.add(h.g);
    const n = Object.assign({ h, x, z, rot, name: null, life: 1, role }, extra || {}); tw.npcs.push(n); return n;
  };
  const len = pts => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  const setup = B => {
    const tw = W.town, D = B.D; if (!tw || !tw.ck || tw.room || !R.makeBeastSprite) return;
    const city = tw.city, wk = city.walk, E = R.eventsToday ? R.eventsToday() : {};
    const inWalk = (x, z) => x > wk[0] + 1 && x < wk[2] - 1 && z > wk[1] + 1 && z < wk[3] - 1;
    const free = (x, z, r) => { if (!inWalk(x, z)) return false; const o = { x, z }; R.collide(o, r || 0.3); return Math.hypot(o.x - x, o.z - z) < 0.05; };
    const L = tw.life = { bikes: [], pets: [], birds: [], t: 0 }, S2 = tw.slife = { sit: [], pairs: [], kids: [], busk: null, carts: [], t: 0, ballT: 20 };
    const add = (id, x, z) => { const m = R.makeBeastSprite(id); m.g.position.set(x, CK.heightAt(x, z), z); tw.group.add(m.g); return m; };
    // ---- 腳踏車：沿著路人路線來回騎（在人行道的外側） ----
    const paths = (D.walks || []).map(w => w.pts).filter(p => p.length >= 2 && len(p) > 30);
    const nB = !paths.length ? 0 : E.martial ? 3 : E.blizzard ? 4 : Math.min(16, paths.length * 2);
    for (let i = 0; i < nB; i++) {
      const path = paths[i % paths.length], side = rnd() < 0.5 ? 1 : -1, k0 = Math.floor(rnd() * path.length), id = 'cyc' + (i % 10);
      const off = (p, q) => { const a = Math.atan2(q[0] - p[0], q[1] - p[1]); return [Math.cos(a) * 1.3 * side, -Math.sin(a) * 1.3 * side]; };
      const b = { m: add(id, path[k0][0], path[k0][1]), id, x: path[k0][0], z: path[k0][1], tx: path[k0][0], tz: path[k0][1], sp: 3.4 + rnd() * 1.8, v: 0, t: rnd() * 10, rank: (i * 0.618) % 1, bell: 0, path, k: k0, dir: k0 >= path.length - 1 ? -1 : 1 };
      b.next = bb => { bb.k += bb.dir; if (bb.k >= bb.path.length) { bb.dir = -1; bb.k = bb.path.length - 2; } if (bb.k < 0) { bb.dir = 1; bb.k = Math.min(1, bb.path.length - 1); } const p = bb.path[bb.k], q = bb.path[Math.max(0, Math.min(bb.path.length - 1, bb.k - bb.dir))], o = off(q, p); bb.tx = p[0] + o[0] * bb.dir; bb.tz = p[1] + o[1] * bb.dir; };
      b.next(b); L.bikes.push(b);
    }
    // ---- 貓、拴著的狗：房子門口 ----
    const homes = (D.foot || []).filter(f => f.r && /house|machiya|wafu|apt/.test(f.kind || ''));
    const doorstep = () => { const f = pick(homes), r = f.r, e = Math.floor(rnd() * 4), t = 0.2 + rnd() * 0.6; return e === 0 ? [r[0] + (r[2] - r[0]) * t, r[3] + 1.6] : e === 1 ? [r[0] + (r[2] - r[0]) * t, r[1] - 1.6] : e === 2 ? [r[2] + 1.6, r[1] + (r[3] - r[1]) * t] : [r[0] - 1.6, r[1] + (r[3] - r[1]) * t]; };
    const spot = (fn, tries) => { for (let k = 0; k < (tries || 14); k++) { const p = fn(); if (p && free(p[0], p[1])) return p; } return null; };
    if (homes.length) {
      for (let i = 0; i < (E.blizzard ? 4 : 10); i++) { const p = spot(doorstep); if (!p) continue; const id = 'cat' + (i % 4); L.pets.push({ kind: 'cat', m: add(id, p[0], p[1]), id, x: p[0], z: p[1], hx: p[0], hz: p[1], st: 'sit', t: rnd() * 6, rot: rnd() * 6.28 }); }
      for (let i = 0; i < 4; i++) { const p = spot(doorstep); if (!p) continue; const id = 'dog' + ((i + 1) % 4); L.pets.push({ kind: 'dog', mode: 'chain', m: add(id, p[0], p[1]), id, x: p[0], z: p[1], hx: p[0], hz: p[1], st: 'sit', t: rnd() * 4, rot: rnd() * 6.28, barkT: 0 }); }
      for (let i = 0; i < 2; i++) { const p = spot(doorstep); if (!p) continue; L.pets.push({ kind: 'dog', mode: 'stray', m: add('dog' + (i ? 1 : 3), p[0], p[1]), id: 'dog' + (i ? 1 : 3), x: p[0], z: p[1], hx: p[0], hz: p[1], st: 'sit', t: rnd() * 4, rot: rnd() * 6.28, barkT: 0 }); }
    }
    // ---- 散步的狗：跟著路人 ----
    const walkers = (tw.walkers || []).filter(n => !n.guard);
    for (let i = 0; i < Math.min(E.blizzard ? 2 : 6, walkers.length); i++) { const o = walkers[Math.floor(i * walkers.length / 6)], id = 'dog' + (i % 4); L.pets.push({ kind: 'dog', mode: 'walk', owner: o, m: add(id, o.x, o.z), id, x: o.x, z: o.z, st: 'walk', t: 0, rot: 0, barkT: 0 }); }
    // ---- 鳥：鴿子在廣場、烏鴉在草地 ----
    const plaza = city.plaza || [city.spawn[0], city.spawn[1] - 6];
    const flock = (kind, cx, cz, n, spread) => { for (let i = 0; i < n; i++) { const p = spot(() => [cx + (rnd() - 0.5) * spread, cz + (rnd() - 0.5) * spread], 6); if (!p) continue; L.birds.push({ kind, m: add(kind, p[0], p[1]), id: kind, x: p[0], z: p[1], y: 0, hx: p[0], hz: p[1], st: 'ground', t: rnd() * 2, rot: rnd() * 6.28 }); } };
    const grass = (D.zones || []).filter(z => z.mat === 'grass').map(z => { const xs = z.poly.map(p => p[0]), zs = z.poly.map(p => p[1]); return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; }).filter(r => inWalk((r[0] + r[2]) / 2, (r[1] + r[3]) / 2) && (r[2] - r[0]) * (r[3] - r[1]) < 40000).sort((a, b) => (b[2] - b[0]) * (b[3] - b[1]) - (a[2] - a[0]) * (a[3] - a[1]));
    if (!E.blizzard) { flock('pigeon', plaza[0], plaza[1], 8, 26); grass.slice(0, 3).forEach(r => flock('crow', (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, 3, Math.min(16, r[2] - r[0]))); }
    // 摸摸貓、狗（townNear 會把跟著動的互動點 z 加 1.1，這裡先扣掉）
    L.pets.forEach(a => { const f = { get x() { return a.x; }, get z() { return a.z - 1.1; } }; tw.inter.push({ x: a.x, z: a.z, r: 1.5, follow: f, label: a.kind === 'cat' ? '摸摸貓' : a.mode === 'walk' ? '摸摸散步的狗' : '摸摸狗', when: () => a.st !== 'flee' && a.m.g.visible, act: () => R.lifePet && R.lifePet(a) }); });
    // ---- 長椅：白天一部分坐著人，其他的可以坐 ----
    const benches = (D.benches || []).filter(b => inWalk(b[0], b[1]));
    benches.forEach((b, i) => {
      const [x, z, ry] = b, ax = Math.cos(ry), az = -Math.sin(ry), y = CK.heightAt(x, z);
      const seat = k => [x + ax * k * 0.45 + Math.sin(ry) * 0.05, z + az * k * 0.45 + Math.cos(ry) * 0.05];
      const sitter = rnd() < 0.55 && i < 14;
      if (sitter) { const role = pick(Object.keys(ROLES)), [sx, sz] = seat(1), n = mkNpc(tw, sx, sz, ry, role); n.h.sit = true; n.h.g.position.y = y; S2.sit.push(n); tw.inter.push({ follow: n, x: n.x, z: n.z, r: 1.6, label: '和長椅上的' + ROLES[role].name + '說話', when: () => n.h.g.visible, act: () => R.townTalk(ROLES[role].name, [pick(ROLES[role].lines)]) }); }
      const [px, pz] = seat(sitter ? -1 : 0);
      tw.inter.push({ x: px + Math.sin(ry) * 0.9, z: pz + Math.cos(ry) * 0.9, r: 1.3, label: '坐一下', act: () => { if (!R.sitDown) return; R.sitDown(px, pz); const P = W.P; P.yaw = ry; P.h.g.rotation.y = ry; P.h.g.position.y = y; } });
    });
    // ---- 路邊聊天的兩個人 ----
    const gossip = city.gossip || GOSSIP0;
    for (let i = 0, tries = 0; i < 6 && tries < 60 && paths.length; tries++) {
      const path = pick(paths), k = Math.floor(rnd() * (path.length - 1)), p = path[k], q = path[k + 1], t = 0.15 + rnd() * 0.7, a = Math.atan2(q[0] - p[0], q[1] - p[1]), side = rnd() < 0.5 ? 1 : -1;
      const x = p[0] + (q[0] - p[0]) * t + Math.cos(a) * 1.9 * side, z = p[1] + (q[1] - p[1]) * t - Math.sin(a) * 1.9 * side, x2 = x + Math.sin(a) * 1.1, z2 = z + Math.cos(a) * 1.1;
      if (!free(x, z, 0.4) || !free(x2, z2, 0.4)) continue;
      const A = mkNpc(tw, x, z, a, pick(['salary', 'mama', 'student', 'old'])), Bn = mkNpc(tw, x2, z2, a + Math.PI, pick(['salary', 'mama', 'student', 'old']));
      tw.inter.push({ follow: A, x: A.x, z: A.z, r: 2.2, label: '偷聽他們聊天', when: () => A.h.g.visible, act: () => R.townTalk('路邊聊天的人', [pick(gossip), '（說完，兩個人看了你一眼，換了一個話題。）']) });
      S2.pairs.push([A, Bn]); i++;
    }
    // ---- 玩雪的學生（最大的草地） ----
    if (grass[0]) { const r = grass[0], cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2, rr = Math.min(r[2] - r[0], r[3] - r[1]) * 0.3; for (let i = 0; i < 3; i++) { const k = mkNpc(tw, cx, cz, 0, 'student', { walk: 1, kid: 1, cx, cz, rr: rr * (0.6 + i * 0.25), ph: i * 2.1, sp: 0.5 + rnd() * 0.3 }); S2.kids.push(k); } }
    // ---- 街頭藝人、屋台（廣場） ----
    { const p = spot(() => [plaza[0] + 7 + (rnd() - 0.5) * 4, plaza[1] + (rnd() - 0.5) * 4], 10); if (p) { const n = mkNpc(tw, p[0], p[1], Math.PI, 'old'); S2.busk = n; tw.inter.push({ follow: n, x: n.x, z: n.z, r: 2.2, label: '聽街頭藝人彈三味線（投 1 費拉）', when: () => n.h.g.visible, act: () => { if (R.S.gold < 1) { R.townTalk('街頭藝人', ['（他朝你點點頭，繼續彈。）']); return; } R.S.gold -= 1; R.save(); if (R.SL && R.SL.shamisen) R.SL.shamisen(); R.townTalk('街頭藝人', [pick(['「謝謝。這一段是〈雪路〉。」', '「天冷，手指不太聽話。再聽一段？」', '「這把三味線是我師父留下來的。」'])]); } }); } }
    const cart = (x, z, name, col, menu) => {
      if (!free(x, z, 1.4)) return; const TH = THREE, g = new TH.Group(), lam = c2 => CK.mat('yatai|' + c2, { tex: 'wood', col: c2 });
      const box = (w, h, d, m, ox, oy, oz) => { const o = new TH.Mesh(new TH.BoxGeometry(w, h, d), m); o.position.set(ox, oy, oz); o.castShadow = true; g.add(o); return o; };
      box(2.4, 1.0, 1.0, lam('#6A4A30'), 0, 0.5, 0); box(2.6, 0.08, 1.3, lam('#8A6A44'), 0, 1.04, 0.1); [-1.15, 1.15].forEach(o => box(0.08, 1.3, 0.08, lam('#4A3424'), o, 1.65, 0.45)); box(2.7, 0.08, 0.7, lam('#3A2A1C'), 0, 2.3, 0.4);
      const cl = CK.mat('noren|' + col, { tex: 'paint', col, rough: 0.9 }); [-0.9, -0.3, 0.3, 0.9].forEach(o => box(0.56, 0.42, 0.03, cl, o, 2.04, 0.76));
      const ln = box(0.4, 0.42, 0.4, CK.mat('chochinRed', { col: '#E8503A', em: '#FF6A3A', ei: 0, lamp: true, snow: 0 }), 1.32, 1.95, 0.76);
      g.position.set(x, CK.heightAt(x, z), z); tw.group.add(g); tw.lamps.push([x, z + 0.8]); const bx = R.addBox(x - 1.3, x + 1.3, z - 0.6, z + 0.6, 'deco');
      const v = mkNpc(tw, x, z - 0.9, 0, 'salary'); v.h.g.visible = false;
      tw.inter.push({ x, z: z + 1.4, r: 2, label: name, when: () => g.visible, act: () => menu() });
      S2.carts.push({ g, b: bx, v }); void ln;
    };
    const eat = (who, food, price, buff, lines) => () => { if (R.S.gold < price) { R.toast('錢不夠。'); return; } R.S.gold -= price; R.S.buff = { kind: 'yatai', b: buff, until: R.S.day }; R.save(); R.townTalk(who, lines.concat(['（今天下遺跡有加成）'])); };
    // 長椅上的人、聊天的人也看得到你（ckcrime.js 的視線條）
    if (tw.watchers) S2.sit.concat(...S2.pairs).forEach(n => { n.watch = { range: 6, fov: 1.1, civ: 1 }; tw.watchers.push(n); });
    cart(plaza[0] - 12, plaza[1] + 2, '屋台拉麵（一碗 8 費拉）', '#C83A3A', eat('拉麵屋台的老闆', '拉麵', 8, { hp: 0.05 }, ['「醬油拉麵一碗——來了！」', '你喝了幾口湯，老闆把小碟推過來，叫你小心燙。']));
    cart(plaza[0] + 14, plaza[1] + 2, '屋台關東煮（一份 6 費拉）', '#E8C04A', eat('關東煮屋台的阿婆', '關東煮', 6, { mp: 0.06 }, ['「白蘿蔔、蛋、竹輪，再來一塊豆腐？」', '湯頭是昆布熬的，很清甜。']));
  };
  const sl0 = CK.spawnLife;
  CK.spawnLife = B => { sl0(B); try { setup(B); } catch (e) { console.warn('[cklife]', e); } };
  // ---------- 每一格 ----------
  const step = dt => {
    const tw = W.town, P = W.P; if (!tw || !tw.ck || tw.room || !P || W.paused) return;
    if (tw.life && R.lifeStep) R.lifeStep(dt);
    // townlife 把東西放在 y＝0：照地面的高度補上（台地、橋上）
    if (tw.life) { tw.life.bikes.forEach(b => { if (b.m.g.visible) b.m.g.position.y = CK.heightAt(b.x, b.z); }); tw.life.pets.forEach(a => { if (a.m.g.visible) a.m.g.position.y = CK.heightAt(a.x, a.z); }); tw.life.birds.forEach(b => { if (b.m.g.visible) b.m.g.position.y = CK.heightAt(b.x, b.z) + (b.y || 0); }); }
    const L = tw.slife; if (!L) return; L.t += dt;
    const h = hour(), E = R.eventsToday ? R.eventsToday() : {}, bad = E.blizzard || /大雪|雨/.test(E.weather || '');
    const day = h >= 7 && h < 19 && !bad, eve = h >= 10 && h < 21 && !E.blizzard, night = h >= 18 || h < 1;
    L.sit.forEach(n => { n.h.g.visible = day; });
    L.pairs.forEach(([a, b], i) => { const on = h >= 8 && h < 21 && !E.blizzard; a.h.g.visible = b.h.g.visible = on; if (on && !a.lookA) a.h.g.rotation.y = Math.sin(L.t * 0.9 + i) > 0.97 ? a.rot + 0.3 : a.rot; });
    L.kids.forEach(k => { k.h.g.visible = day; if (!day) return; const a = L.t * k.sp + k.ph, x = k.cx + Math.sin(a) * k.rr, z = k.cz + Math.cos(a * 1.3) * k.rr * 0.7, yaw = Math.atan2(x - k.x, z - k.z); k.x = x; k.z = z; k.h.g.position.set(x, CK.heightAt(x, z), z); k.h.g.rotation.y = yaw; R.animHero(k.h, 2.4, dt, false); });
    if (day && L.kids.length) { L.ballT -= dt; if (L.ballT <= 0) { L.ballT = 25 + rnd() * 30; if (L.kids.some(k => Math.hypot(k.x - P.x, k.z - P.z) < 9)) R.toast(pick(['一顆雪球打在你背上。學生們笑著跑開了。', '「對不起——！」雪球從你頭上飛過去。'])); } }
    if (L.busk) L.busk.h.g.visible = eve;
    L.carts.forEach(c => { c.g.visible = night; c.v.h.g.visible = night; c.b.on = night; });
    // 坐著的時候：面向、高度
    if (P.sit) { P.h.g.rotation.y = P.yaw; P.h.g.position.y = CK.heightAt(P.x, P.z); }
  };
  const ts0 = R.townStep;
  R.townStep = dt => { ts0(dt); try { step(dt); } catch (e) { console.warn('[cklife]', e); } };
})(window.R);
