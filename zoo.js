// 討伐令 1433：觀光遺跡的動物園、家園的小同伴（作者：觀光遺跡是動物園；哈米莉亞級像花園、農園，可以撫摸；
//   在阿彌勒級打敗某種怪物 50 次，家園裡多一隻相似外觀但無害的小寵物，可以帶出門幫忙）
// - 皇嶺南郊・觀光遺跡（kanko）：入口收門票 10 費拉。每一層都是展示區：每間房圍著柵欄，裡面養著一種遺跡生物，柵欄前有說明牌
//   （看了記在 R.S.zooSeen）。第 1 層有一間「觸摸廣場」，溫馴的小生物可以摸。到處有遊客、飼育員。第 0 層有紀念品店（娃娃）。
// - 小同伴：同一種遺跡生物打倒 50 次（R.S.dexKills，變種也算），家裡（公團住宅 302 室→中庭的小花園）就多一隻牠的小同伴：
//   顏色比較淡、眼睛圓圓的。可以摸；也可以帶一隻出門（R.S.petOut）：在城裡、遺跡裡跟著你，遺跡裡每隔幾秒撲上去咬一口附近的敵人。
// - 哈米莉亞級的平靜樓層：會有幾隻溫馴的小生物在走，可以摸。
(function (R) {
  const W = R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)], ART = R.BEAST_ART;
  const NEED = 50, S = () => R.S;
  // ---------- 淡色、圓眼的小同伴圖 ----------
  const lighten = (c, k) => { if (!/^#[0-9a-fA-F]{6}/.test(c)) return c; const n = parseInt(c.slice(1, 7), 16), m = v => Math.round(v + (255 - v) * k); return '#' + [m(n >> 16 & 255), m(n >> 8 & 255), m(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); };
  const petArt = id => { const pid = id + '_pet'; if (!ART[pid] && ART[id]) { const A = ART[id], pal = {}; Object.keys(A.pal).forEach(k => { pal[k] = k === 'e' ? '#1A1410' : lighten(A.pal[k], 0.38); }); ART[pid] = { pal, a: A.a, b: A.b || A.a }; } return ART[pid] ? pid : id; };
  const OK = id => { const d = R.ENEMIES[id]; return d && !d.boss && !d.human && !d.lord && !d.vbase && !/_s$|_pet$/.test(id) && d.ai !== 'core'; };
  const nameOf = id => (R.ENEMIES[id] ? R.ENEMIES[id].name : id);
  const critter = (id, parent, x, z, scale, pet) => { const vid = pet ? petArt(id) : id, m = R.makeBeast(vid); m.g.position.set(x, 0, z); if (scale) m.g.scale.setScalar(scale); parent.add(m.g); return { m, id, vid, x, z, tx: x, tz: z, t: rnd() * 5, wait: rnd() * 2 }; };
  const hearts = (x, z) => { if (R.fx) for (let i = 0; i < 3; i++) setTimeout(() => R.fx('poof', x + (rnd() - 0.5) * 0.6, 1.2, z + (rnd() - 0.5) * 0.6, { color: '#FF7AA8', n: 4 }), i * 120); };
  const PETLINES = ['牠瞇起眼睛，往你的手心蹭了蹭。', '牠翻過來，露出肚子。', '牠發出小小的、咕嚕咕嚕的聲音。', '牠用頭頂你的手，還要。', '牠打了一個呵欠，靠在你腳邊。'];
  const petIt = (c, who) => { hearts(c.x, c.z); R.toast((who || nameOf(c.id)) + '：' + pick(PETLINES), '#FF7AA8'); R.sfx && R.sfx('pick'); };
  const move = (c, dt, bounds, sp) => {
    c.t += dt; const d = Math.hypot(c.tx - c.x, c.tz - c.z);
    if (d < 0.25) { c.wait -= dt; if (c.wait <= 0) { c.wait = 1 + rnd() * 3; c.tx = bounds[0] + rnd() * (bounds[1] - bounds[0]); c.tz = bounds[2] + rnd() * (bounds[3] - bounds[2]); } R.animBeast(c.m, c.vid, c.t, false); return; }
    const a = Math.atan2(c.tx - c.x, c.tz - c.z), s = sp || 1; c.x += Math.sin(a) * s * dt; c.z += Math.cos(a) * s * dt; c.m.g.position.set(c.x, 0, c.z); c.m.g.rotation.y = a; R.animBeast(c.m, c.vid, c.t, true);
  };

  // ---------- 小同伴：解鎖 ----------
  const checkPets = () => {
    const s = S(); if (!s) return; s.pets = s.pets || {}; const k = s.dexKills || {}, got = [];
    Object.keys(k).forEach(id => { if (k[id] >= NEED && !s.pets[id] && OK(id)) { s.pets[id] = { day: s.day || 0, love: 0 }; got.push(id); } });
    if (got.length) { R.save && R.save(); setTimeout(() => R.toast('家裡的小花園多了' + got.map(id => '小' + nameOf(id)).join('、') + '！（打倒 ' + NEED + ' 次）', '#FF7AA8'), 1800); }
  };
  const et0 = R.enterTownNow;
  R.enterTownNow = (from, at) => { et0(from, at); try { checkPets(); } catch (e) { } follow.m = null; };

  // ---------- 家裡的中庭小花園 ----------
  const PL = R.INTERIOR_PLACES, FN = R.INTERIOR_FURNISH = R.INTERIOR_FURNISH || {};
  if (PL) {
    PL.garden = { name: '中庭的小花園', sub: '公團住宅 1 號棟', hint: '晒衣竿下面，小同伴們在曬太陽', w: 14, d: 11, h: 2.4, wall: '#C8C0A8', cap: '#8A8068', floor: ['#6A8A4A', 'floor'], zoom: 0.78, out: '出去（回到街上）' };
    FN.garden = c => {
      const { bx, inter, lamp, mesh, TH, HW, HD, ins } = c, s = S(); s.pets = s.pets || {};
      // 花圃、小池塘、長椅、晒衣竿
      [[-HW + 1.5, -HD + 1, '#E86A8A'], [-HW + 4, -HD + 1, '#F2D24A'], [HW - 1.5, -HD + 1, '#8A6AE8'], [HW - 4, -HD + 1, '#F2F2F2']].forEach(([x, z, col]) => { bx(2.2, 0.35, 0.9, '#6A4A30', x, 0.18, z); for (let i = 0; i < 5; i++) mesh(new TH.SphereGeometry(0.14, 6, 5), col, x - 0.8 + i * 0.4, 0.45, z + (i % 2 ? 0.15 : -0.15)); });
      const pond = bx(3, 0.04, 2, new TH.MeshLambertMaterial({ color: '#4A8ACF' }), HW - 3, 0.03, 2.5); pond.castShadow = false; c.block(HW - 4.5, HW - 1.5, 1.5, 3.5, 'deco');
      bx(2.2, 0.45, 0.5, '#7A5A3A', -HW + 2.5, 0.23, HD - 1.4); [-2, 2].forEach(o => bx(0.08, 1.8, 0.08, '#8A8A92', o, 0.9, -1)); bx(4.1, 0.05, 0.05, '#8A8A92', 0, 1.78, -1);
      lamp(0, 2.2, 0, '#FFF4DC', 0.9, 14);
      const ids = Object.keys(s.pets).filter(OK), crit = [];
      ids.forEach((id, i) => { const cr = critter(id, ins.group, -HW + 2 + (i % 5) * 2.2, -1 + Math.floor(i / 5) * 2, 0.6, true); crit.push(cr); inter(0, 0, 1.6, '摸摸小' + nameOf(id), () => { petIt(cr, '小' + nameOf(id)); s.pets[id].love = (s.pets[id].love || 0) + 1; R.save && R.save(); }); const it = ins.inter[ins.inter.length - 1]; Object.defineProperty(it, 'x', { get: () => cr.x }); Object.defineProperty(it, 'z', { get: () => cr.z }); });
      ins.pets = { crit, bounds: [-HW + 1, HW - 1, -HD + 2.2, HD - 1.5] };
      inter(-HW + 1.2, 0, 1.6, ids.length ? '選一隻帶出門' : '看看花園的告示', () => petSheet());
      inter(HW - 1.4, HD - 1.4, 1.5, '回 302 室', () => (R.changeFloor ? R.changeFloor('home') : R.enterInterior('home')));
    };
    // 302 室：多一個去花園的門
    const fh = FN.home; if (fh) FN.home = c => { fh(c); c.inter(-c.HW + 0.9, c.HD - 1.2, 1.4, '去中庭的小花園', () => (R.changeFloor ? R.changeFloor('garden') : R.enterInterior('garden'))); };
  }
  const petSheet = () => {
    const s = S(), ids = Object.keys(s.pets || {}).filter(OK), k = s.dexKills || {};
    const near = Object.keys(k).filter(id => OK(id) && !(s.pets || {})[id]).sort((a, b) => k[b] - k[a]).slice(0, 5);
    R.sheet('<p class="kicker">中庭的小花園</p><h2>小同伴</h2><p class="note">同一種遺跡生物打倒 ' + NEED + ' 次，牠的小同伴就會出現在這裡。可以帶一隻出門：跟著你，遺跡裡會幫忙咬敵人。</p>'
      + (ids.length ? ids.map(id => '<div class="row ka-song"><b>小' + nameOf(id) + '</b><small>' + (s.petOut === id ? '現在跟著你' : '在家') + '・親密 ' + ((s.pets[id] && s.pets[id].love) || 0) + '</small><button type="button" class="mini gold" data-pet="' + id + '">' + (s.petOut === id ? '讓牠在家' : '帶出門') + '</button></div>').join('') : '<p>還沒有小同伴。</p>')
      + (near.length ? '<h3>快要出現的</h3>' + near.map(id => '<div class="row ka-song"><b>' + nameOf(id) + '</b><small>' + k[id] + '／' + NEED + '</small></div>').join('') : ''),
      '<div class="row"><button type="button" class="btn" id="pt-x">好</button></div>');
    document.getElementById('pt-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-pet]').forEach(b => b.onclick = () => { const id = b.dataset.pet; s.petOut = s.petOut === id ? null : id; R.save && R.save(); follow.m = null; R.closeSheet(); R.toast(s.petOut ? '小' + nameOf(id) + '跟上來了。' : '小' + nameOf(id) + '留在家裡。'); });
  };
  const is0 = R.interiorStep;
  R.interiorStep = dt => { is0(dt); const ins = W.inside; if (ins && ins.pets) ins.pets.crit.forEach(c => move(c, dt, ins.pets.bounds, 0.8)); };

  // ---------- 跟著你的小同伴 ----------
  const follow = { m: null, scene: null, id: null, t: 0, bite: 4, x: 0, z: 0 };
  const ensureFollow = (parent, P) => {
    const s = S(), id = s && s.petOut; if (!id || !OK(id)) { if (follow.m && follow.m.g.parent) follow.m.g.parent.remove(follow.m.g); follow.m = null; return null; }
    if (!follow.m || follow.id !== id || follow.m.g.parent !== parent) { if (follow.m && follow.m.g.parent) follow.m.g.parent.remove(follow.m.g); const vid = petArt(id); follow.m = R.makeBeast(vid); follow.m.g.scale.setScalar(0.55); follow.id = id; follow.vid = vid; follow.x = P.x - 1; follow.z = P.z + 1; parent.add(follow.m.g); }
    return follow;
  };
  const stepFollow = (dt, P, parent, fight) => {
    const f = ensureFollow(parent, P); if (!f) return;
    f.t += dt; const bx = P.x - Math.sin(P.yaw || 0) * 1.3 + 0.6, bz = P.z - Math.cos(P.yaw || 0) * 1.3, d = Math.hypot(bx - f.x, bz - f.z), moving = d > 0.35;
    if (d > 14) { f.x = bx; f.z = bz; }
    else if (moving) { const sp = Math.min(9, d * 3), a = Math.atan2(bx - f.x, bz - f.z); f.x += Math.sin(a) * sp * dt; f.z += Math.cos(a) * sp * dt; f.m.g.rotation.y = a; }
    f.m.g.position.set(f.x, 0, f.z); R.animBeast(f.m, f.vid, f.t, moving);
    if (fight) { f.bite -= dt; if (f.bite <= 0) { f.bite = 4.5; const e = (W.enemies || []).filter(o => !o.dead && !o.invuln && Math.hypot(o.x - P.x, o.z - P.z) < 7).sort((a, b) => Math.hypot(a.x - f.x, a.z - f.z) - Math.hypot(b.x - f.x, b.z - f.z))[0]; if (e) { f.x = e.x + (f.x - e.x) * 0.3; f.z = e.z + (f.z - e.z) * 0.3; R.fx && R.fx('spark', e.x, 0.9, e.z, { a: 0 }); R.hurtEnemy(e, Math.max(3, (P.ws ? P.ws.dmg : 10) * 0.35), {}); } } }
  };
  const ts0 = R.townStep;
  R.townStep = dt => { ts0(dt); const t = W.town, P = W.P; if (!t || !P || W.inside) return; try { stepFollow(dt, P, t.group, false); } catch (e) { } };

  // ---------- 遺跡：動物園、溫馴的小生物 ----------
  const isZoo = run => run && run.site && run.site.id === 'kanko';
  const sr0 = R.startRun;
  R.startRun = id => { if (id === 'kanko' && S()) { if (S().gold < 10) { R.say ? R.say('門票 10 費拉，錢不夠。') : R.toast('錢不夠。'); return; } S().gold -= 10; R.save && R.save(); setTimeout(() => R.toast('買了門票（10 費拉）。「歡迎光臨皇嶺南郊遺跡動物園！」'), 2600); } return sr0(id); };
  const gf0 = R.genFloor;
  R.genFloor = (run, f) => {
    const F = gf0(run, f);
    if (isZoo(run) && f >= 1) { F.calm = true; F.zoo = true; F.zone = null; F.rooms.forEach(r => { if (['start', 'stairs', 'boss', 'deep'].includes(r.type)) return; if (r.type !== 'ore') r.type = 'fight'; r.cleared = true; r.calm = 1; r.traps = 0; }); }
    return F;
  };
  const SPECIES = () => Object.keys(R.ENEMIES).filter(id => OK(id) && !R.ENEMIES[id].noDex && ART[id]);
  const buildRun = () => {
    const F = W.F, run = W.run; if (!F || !run) return;
    F.critters = []; F.rpInter = F.rpInter || []; const TH = THREE;
    if (isZoo(run) && F.rest) {
      const r = F.rooms[0];
      F.rpInter.push({ x: r.x - 8, z: r.z - 3, r: 2, label: '紀念品店（娃娃）', act: shopSheet });
      const kiosk = new TH.Mesh(new TH.BoxGeometry(2, 1, 1), new TH.MeshLambertMaterial({ color: '#E86A8A' })); kiosk.position.set(r.x - 8, 0.5, r.z - 4); F.group.add(kiosk); const roof = new TH.Mesh(new TH.BoxGeometry(2.4, 0.1, 1.6), new TH.MeshLambertMaterial({ color: '#F2E8C8' })); roof.position.set(r.x - 8, 2, r.z - 4); F.group.add(roof); R.addBox(r.x - 9, r.x - 7, r.z - 4.5, r.z - 3.5, 'deco');
    }
    if (F.zoo) {
      const rooms = F.rooms.filter(r => !['start', 'stairs', 'boss', 'deep'].includes(r.type));
      const pool = SPECIES().sort(() => rnd() - 0.5); let pi = 0;
      rooms.forEach((r, ri) => {
        const touch = ri === 0 && run.floor === 1, hx = Math.min(r.hx, 14) - 4, hz = Math.min(r.hz, 11) - 4; if (hx < 2.5 || hz < 2.5) return;
        const id = pool[pi++ % pool.length], x0 = r.x - hx, x1 = r.x + hx, z0 = r.z - hz, z1 = r.z + hz;
        if (!touch) {
          // 2026-10-04 回饋：怪物旁邊的圍欄可以刪掉——展示區改成放養區：不圍柵欄，生物在自己那一區走，每一隻都溫馴、可以摸
          const post = new TH.MeshLambertMaterial({ color: '#8A6A44' });
          const n = 2 + Math.floor(rnd() * 2); for (let i = 0; i < n; i++) { const c = critter(id, F.group, r.x + (rnd() - 0.5) * hx, r.z + (rnd() - 0.5) * hz, 0); c.bounds = [x0 + 0.8, x1 - 0.8, z0 + 0.8, z1 - 0.8]; c.tame = true; F.critters.push(c); F.rpInter.push({ get x() { return c.x; }, get z() { return c.z; }, r: 1.5, label: '摸摸' + nameOf(id), act: () => petIt(c, nameOf(id)) }); }
          // 說明牌（柵欄的南邊外面）
          const sign = new TH.Mesh(new TH.BoxGeometry(1.2, 0.7, 0.08), new TH.MeshLambertMaterial({ color: '#F2E8C8' })); sign.position.set(r.x, 1.1, z1 + 0.6); F.group.add(sign); const sp = new TH.Mesh(new TH.BoxGeometry(0.1, 0.9, 0.1), post); sp.position.set(r.x, 0.45, z1 + 0.6); F.group.add(sp);
          F.rpInter.push({ x: r.x, z: z1 + 1.4, r: 1.8, label: '看說明牌：' + nameOf(id), act: () => plaque(id) });
        } else {
          // 觸摸廣場：沒有柵欄，溫馴的小生物在走
          const ids = SPECIES().filter(i => R.ENEMIES[i].size < 0.9).sort(() => rnd() - 0.5).slice(0, 4);
          ids.forEach(i2 => { const c = critter(i2, F.group, r.x + (rnd() - 0.5) * hx, r.z + (rnd() - 0.5) * hz, 0.7, true); c.bounds = [x0, x1, z0, z1]; c.tame = true; F.critters.push(c); F.rpInter.push({ get x() { return c.x; }, get z() { return c.z; }, r: 1.5, label: '摸摸溫馴的' + nameOf(i2), act: () => petIt(c, '溫馴的' + nameOf(i2)) }); });
          R.banner('觸摸廣場', '這裡的小生物很溫馴，可以摸摸看。');
        }
      });
      // 飼育員
      const rr = rooms[0]; if (rr) { const h = R.makeHero('warrior', null, { pool: 'zoo_keeper', lite: 1, top: '#4A6A3A', hair: '#2A2420', cloak: '#3A5A2A', weapon: null, shield: false }); h.g.position.set(rr.x + 3, 0, rr.z + rr.hz - 1.5); F.group.add(h.g); F.rpInter.push({ x: rr.x + 3, z: rr.z + rr.hz - 0.6, r: 1.6, label: '和飼育員說話', act: () => R.townTalk('動物園的飼育員', [pick(['「這座遺跡的核心很安靜，生物都不太兇。公會評估過才開放的。」', '「餵食時間是下午三點。……開玩笑的，牠們不太吃東西，吸的是魔力。」', '「請不要敲柵欄，牠們會緊張。」', '「每一隻都有名字喔。那隻叫小麻糬。」'])]) }); }
    }
    // 哈米莉亞的平靜樓層：溫馴的小生物（不在動物園也有）
    if (F.calm && !F.zoo && run.grade.id === 'hamilia') {
      const k = (S() && S().dexKills) || {}, known = Object.keys(k).filter(id => OK(id) && ART[id] && k[id] >= 5), base = known.length ? known : (run.grade.pool || []).filter(id => OK(id) && ART[id]);
      const rooms = F.rooms.filter(r => r.type !== 'start' && r.type !== 'stairs');
      for (let i = 0; i < Math.min(4, rooms.length); i++) { const r = rooms[i], id = pick(base); if (!id) break; const [x, z] = R.roomPoint(r, {}), c = critter(id, F.group, x, z, 0.65, true); c.bounds = [r.x - r.hx + 2, r.x + r.hx - 2, r.z - r.hz + 2, r.z + r.hz - 2]; c.tame = true; F.critters.push(c); F.rpInter.push({ get x() { return c.x; }, get z() { return c.z; }, r: 1.5, label: '摸摸溫馴的' + nameOf(id), act: () => petIt(c, '溫馴的' + nameOf(id)) }); }
    }
  };
  const plaque = id => { const d = R.ENEMIES[id], s = S(); s.zooSeen = s.zooSeen || {}; s.zooSeen[id] = 1; R.save && R.save(); const k = (s.dexKills || {})[id] || 0; R.townTalk('說明牌', ['【' + d.name + '】', d.desc || '', '大小：' + (d.size >= 1.4 ? '大型' : d.size >= 0.9 ? '中型' : '小型') + '・' + (d.fly ? '會飛' : '在地上活動'), k ? '（你打倒過 ' + k + ' 隻。）' : '（還沒打倒過。）']); };
  const shopSheet = () => {
    const s = S(), G = R.GIFTS || {}, plush = Object.keys(G).filter(k => /^plush_/.test(k)), P = 12;
    R.sheet('<p class="kicker">觀光遺跡・紀念品店</p><h2>紀念品店</h2><p class="note">一隻 ' + P + ' 費拉。娃娃可以送人。</p>' + plush.map(k => '<div class="row ka-song"><b>' + G[k].name + '</b><small>' + (G[k].desc || '') + '</small><button type="button" class="mini gold" data-plush="' + k + '">買</button></div>').join(''), '<div class="row"><button type="button" class="btn" id="zs-x">不用了</button></div>');
    document.getElementById('zs-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-plush]').forEach(b => b.onclick = () => { if (s.gold < P) { R.toast('錢不夠。'); return; } s.gold -= P; if (R.addGift) R.addGift(b.dataset.plush, 1); R.save && R.save(); R.toast('買了' + G[b.dataset.plush].name + '。'); });
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf0(f, o); try { buildRun(); } catch (e) { console.warn('[zoo]', e); } follow.m = null; return r; };
  const st0 = R.step;
  R.step = dt => { st0(dt); const F = W.F, P = W.P; if (!F || !W.run) return; (F.critters || []).forEach(c => move(c, dt, c.bounds, c.tame ? 0.9 : 0.7)); if (P && !P.dead) { try { stepFollow(dt, P, F.group, true); } catch (e) { } } };
  R.zooDebug = { checkPets, petArt, follow, petSheet };
})(window.R);
