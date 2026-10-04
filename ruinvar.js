// 遺跡的變化（作者 2026-10-04：遺跡也是沒有多樣化）
// 一、樓層的狀態：第 1 層以後，四成五的樓層有一種狀態，進去的時候大字告訴你，左上角也一直寫著：
//   濃霧（看不遠）、寶藏（多兩個寶箱）、巢穴（遺跡生物多五成，經驗 +30%）、寂靜（遺跡生物少一半，剩下的都帶特性）、
//   結晶（到處是可以掘的魔晶礦）、崩落（天花板一直掉石頭，看地上的圈）、魔力潮（技能冷卻 −30%，遺跡生物傷害 +15%）、迷途（小地圖看不到）。
// 二、特別的房間：最後一層以外、分區六個以上的樓層，一半有一間：
//   祭壇（三選一的祝福，有的是交換條件，這一趟有效）、行商（別的勇者擺攤，賣藥水和一件裝備，貴）、
//   泉水（一次回滿生命魔力）、試煉之間（門關上，撐過三波，給金寶箱）。
//   另外第 2 層以後的寶箱有一成是「偽箱」：打開的瞬間咬上來，打倒了寶箱裡的東西照拿。
// 狩獵場、觀光遺跡沒有；哈米莉亞級只有不危險的狀態（濃霧、寶藏、結晶），沒有試煉之間和偽箱。
// 放在 restfloor.js、monsters8.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)], $ = id => document.getElementById(id), esc = s => R.esc(s);
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const floorAt = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  const MODS = {
    fog: { n: '濃霧', d: '霧很濃，只看得清楚身邊和準心方向的扇形，其他地方只看得到影子。', safe: 1 }, treasure: { n: '寶藏', d: '這一層多了兩個寶箱。', safe: 1 }, crystal: { n: '結晶', d: '牆邊長滿可以掘的魔晶礦。', safe: 1 },
    nest: { n: '巢穴', d: '遺跡生物多五成，經驗 +30%。' }, silent: { n: '寂靜', d: '遺跡生物少一半，剩下的都帶著特性。' }, rockfall: { n: '崩落', d: '天花板一直掉石頭——看地上的圈。' },
    mana: { n: '魔力潮', d: '技能冷卻 −30%，遺跡生物的傷害 +15%。' }, lost: { n: '迷途', d: '小地圖看不到，只能靠自己記路。' }
  };
  R.FLOOR_MODS = MODS;
  const ok = run => run && run.site && run.site.id !== 'kanko' && run.grade && run.grade.id !== 'hunt';
  const passive = run => !!run.grade.passive;

  // ---------- 偽箱 ----------
  R.ENEMIES.mimic = { name: '偽箱', ref: '', hp: 150, dmg: 16, speed: 3.6, xp: 40, size: 0.9, ai: 'pounce', color: '#8A6A44', eye: '#FF3A3A', desc: '長得和寶箱一模一樣的遺跡生物。打開的瞬間就咬上來；打倒了，寶箱裡的東西照拿。' };
  if (R.BEAST_ART) {
    const draw = fr => { const g = Array.from({ length: 20 }, () => Array(24).fill('.')); const P = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (y + j >= 0 && y + j < 20 && x + i >= 0 && x + i < 24) g[y + j][x + i] = c; };
      const o = fr ? 3 : 1; P(3, 9, 18, 9, 'w'); P(3, 9, 18, 2, 'W'); P(3, 17, 18, 1, 'k'); P(11, 11, 2, 3, 'y');   // 箱身
      P(3, 9 - o - 5, 18, 5, 'w'); P(3, 9 - o - 5, 18, 1, 'W'); P(11, 9 - o - 2, 2, 2, 'y');   // 蓋子（張開）
      P(4, 9 - o, 16, o + 1, 'm'); for (let i = 0; i < 8; i++) { P(4 + i * 2, 9 - o, 1, 1, 't'); P(5 + i * 2, 9, 1, 1, 't'); }   // 嘴、牙
      P(7, 9 - o - 3, 2, 1, 'e'); P(15, 9 - o - 3, 2, 1, 'e'); P(5, 18, 3, 2, 'k'); P(16, 18, 3, 2, 'k');
      return g.map(r => r.join('')); };
    R.BEAST_ART.mimic = { pal: { w: '#8A6A44', W: '#A8845A', k: '#3A2A1C', y: '#E8C04A', m: '#5A1020', t: '#F4F0E8', e: '#FF3A3A' }, a: draw(0), b: draw(1) };
  }

  // ---------- 特別的房間：生成樓層的時候挑 ----------
  const gf0 = R.genFloor;
  R.genFloor = (run, f) => {
    const F = gf0(run, f); if (!ok(run)) return F;
    const last = F.last || f >= run.floors - 1;
    if (!last && F.rooms.length >= 6 && f >= 1 && rnd() < 0.5) {
      const cand = F.rooms.filter(r => r.type === 'fight' && r.dist >= 2 && !r.alt && !r.big);
      if (cand.length) { const r = pick(cand), kinds = passive(run) ? ['shrine', 'merchant', 'spring'] : ['shrine', 'merchant', 'spring', 'trial', 'trial']; r.spec = pick(kinds); if (r.spec !== 'trial') { r.cleared = true; r.calm = 1; r.traps = 0; } else r.trial = 1; }
    }
    // 樓層的狀態
    F.mod = null; if (f >= 1 && rnd() < 0.45) { const ks = Object.keys(MODS).filter(k => !passive(run) || MODS[k].safe); F.mod = pick(ks); }
    return F;
  };

  // ---------- 蓋東西 ----------
  const altar = (F, r) => { const TH = THREE, g = new TH.Group(); const st = new TH.Mesh(new TH.BoxGeometry(1.6, 0.9, 1.0), new TH.MeshLambertMaterial({ color: '#6A6458' })); st.position.y = 0.45; g.add(st); const orb = new TH.Mesh(new TH.SphereGeometry(0.32, 12, 10), new TH.MeshBasicMaterial({ color: '#E8C04A' })); orb.position.y = 1.25; g.add(orb); const L = new TH.PointLight('#FFE08A', 1.0, 9, 1.6); L.position.y = 1.6; g.add(L); g.position.set(r.x, 0, r.z); F.group.add(g); R.addBox(r.x - 0.8, r.x + 0.8, r.z - 0.5, r.z + 0.5, 'deco'); return { g, orb, L }; };
  const fountain = (F, r) => { const TH = THREE, g = new TH.Group(); const b = new TH.Mesh(new TH.CylinderGeometry(1.3, 1.5, 0.5, 16), new TH.MeshLambertMaterial({ color: '#8A8C92' })); b.position.y = 0.25; g.add(b); const w = new TH.Mesh(new TH.CylinderGeometry(1.1, 1.1, 0.06, 16), new TH.MeshBasicMaterial({ color: '#7AC8FF', transparent: true, opacity: 0.8 })); w.position.y = 0.48; g.add(w); const L = new TH.PointLight('#7AC8FF', 0.9, 8, 1.6); L.position.y = 1.2; g.add(L); g.position.set(r.x, 0, r.z); F.group.add(g); R.addBox(r.x - 1.4, r.x + 1.4, r.z - 1.4, r.z + 1.4, 'deco'); return { g, w, L }; };
  const build = () => {
    const w = W(), run = w.run, F = w.F; if (!ok(run) || !F || !F.group) return;
    F.specs = [];
    F.rooms.forEach(r => {
      if (!r.spec) return;
      if (r.spec === 'shrine') { const a = altar(F, r); F.specs.push({ r, kind: 'shrine', x: r.x, z: r.z + 1.2, a, used: false }); }
      else if (r.spec === 'spring') { const a = fountain(F, r); F.specs.push({ r, kind: 'spring', x: r.x, z: r.z + 1.8, a, used: false }); }
      else if (r.spec === 'merchant') { let h = null; try { h = R.makeHero('warrior', null, { lite: 1, weapon: null, shield: false, top: '#6A5A3A', cloak: '#4A3A2A', hair: '#2A2420' }); h.g.position.set(r.x, 0, r.z - 0.6); F.group.add(h.g); R.addBox(r.x - 0.4, r.x + 0.4, r.z - 1.0, r.z - 0.2, 'npc'); } catch (e) { } const TH = THREE, mat = new TH.Mesh(new TH.BoxGeometry(2.2, 0.06, 1.2), new TH.MeshLambertMaterial({ color: '#7A2A2A' })); mat.position.set(r.x, 0.03, r.z + 0.5); F.group.add(mat); F.specs.push({ r, kind: 'merchant', h, x: r.x, z: r.z + 0.9, stock: null }); }
    });
    // 樓層的狀態
    const m = F.mod; if (m) {
      later(() => { if (W().F === F) R.banner && R.banner('樓層的狀態：' + MODS[m].n, MODS[m].d); }, 1600);
      if (m === 'treasure') { const rooms = F.rooms.filter(r => r.type === 'fight'); for (let i = 0; i < 2 && rooms.length; i++) { const r = rooms.splice(Math.floor(rnd() * rooms.length), 1)[0], [x, z] = R.roomPoint ? R.roomPoint(r, {}) : [r.x, r.z]; R.addChest(F.group, F, x, z, (run.grade.lv || 1) >= 2 ? 2 : 1, r.i); } }
      if (m === 'crystal' && R.addOre) { const rooms = F.rooms.filter(r => r.type !== 'start'); for (let i = 0; i < 8; i++) { const r = pick(rooms), [x, z] = R.roomPoint ? R.roomPoint(r, {}) : [r.x, r.z]; R.addOre(x, z); } }
      if (m === 'fog') F.fogMin = 0.07;
    }
    document.body.classList.toggle('rv-lost', m === 'lost');
    // 偽箱
    if (!passive(run) && run.floor >= 2) (F.chests || []).forEach(c => { if (rnd() < 0.1) c.mimic = true; });
    chip();
  };
  const chip = () => { const tl = $('r-tl'); if (!tl) return; let el = $('rv-mod'); const m = W().F && W().F.mod; if (!m) { if (el) el.hidden = true; return; } if (!el) { el = document.createElement('div'); el.id = 'rv-mod'; el.className = 'glass dungeon-only r-misc'; tl.appendChild(el); } el.hidden = false; el.innerHTML = '<span>樓層：<b>' + esc(MODS[m].n) + '</b></span><small>' + esc(MODS[m].d) + '</small>'; };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf0(f, o); try { build(); } catch (e) { console.warn('[ruinvar]', e); } return r; };

  // ---------- 生成遺跡生物：巢穴多、寂靜少而且都帶特性、魔力潮更痛 ----------
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se0(id, x, z, room, o), F = W().F, run = W().run; if (!e || !F || !F.mod || !ok(run) || e.def.boss || e.def.human || (o && o.noAffix) || e.id === 'mimic') return e;
    if (F.mod === 'mana') e.dmg *= 1.15;
    if (F.mod === 'silent' && !(o && o.rvKeep)) { if (rnd() < 0.5) { e.dead = true; e.hp = 0; if (e.m && e.m.g && e.m.g.parent) e.m.g.parent.remove(e.m.g); return e; } if (R.applyMonAffix) R.applyMonAffix(e); }
    return e;
  };
  const er0 = R.enterRoom;
  R.enterRoom = r => {
    const was = r.cleared || r.locked; er0(r); const F = W().F, run = W().run; if (was || !F || !ok(run)) return;
    if (F.mod === 'nest' && r.locked) { const n = 2 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) { const [x, z] = R.roomPoint(r, { away: W().P, min: 4 }); R.spawnEnemy(R.pickEnemyId(run.grade.pool, run), x, z, r.i, { aggro: true }); } }
    if (r.trial && r.locked) { r.wave = 1; R.banner && R.banner('試煉之間', '門關上了：撐過三波遺跡生物，就有金寶箱。'); }
    if (r.spec && r.spec !== 'trial' && !r.specSaid) { r.specSaid = 1; R.toast && R.toast({ shrine: '這一區有一座發光的祭壇。', merchant: '有個勇者在這裡擺攤做生意。', spring: '這一區有一座泉水。' }[r.spec], '#E8C04A'); }
  };
  const gx0 = R.gainXp;
  R.gainXp = v => gx0(W().F && W().F.mod === 'nest' && W().run ? v * 1.3 : v);
  // 魔力潮：技能冷卻
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => { const P = cp0(cls); if (W().run && W().F && W().F.mod === 'mana') R.cdMul(P, 0.7); return P; };   // 場地效果：照舊乘，不算技能急速（haste.js）
  // 試煉之間：清完一波再來一波
  const lr0 = R.lockRoom;
  R.lockRoom = (r, on) => {
    if (on || !r.trial || !r.locked || r.wave >= 3 || !W().run) { if (!on && r.trial && r.locked && r.wave >= 3) { lr0(r, on); r.trial = 0; const [x, z] = floorAt(r.x, r.z); R.addChest(W().F.group, W().F, x, z, 2, r.i); R.banner && R.banner('試煉完成', '金寶箱出現在房間中間。'); return; } return lr0(r, on); }
    r.wave++; const run = W().run, n = 3 + (run.grade.lv || 1) + r.wave; R.banner && R.banner('第 ' + r.wave + '／3 波', '更多的遺跡生物從牆裡爬出來。');
    for (let i = 0; i < n; i++) { const [x, z] = R.roomPoint(r, { edge: true, away: W().P, min: 3 }); const e = R.spawnEnemy(R.pickEnemyId(run.grade.pool, run), x, z, r.i, { aggro: true, rvKeep: true }); if (e) R.fx('spawn', x, 0.1, z, { color: '#FF5A4A' }); if (r.wave === 3 && i === 0 && R.applyMonAffix) R.applyMonAffix(e); }   // 馬上生出來：不然下一格又算成清空了
  };

  // ---------- 互動：祭壇、泉水、行商 ----------
  const BLESS = [
    ['力之祝福', '傷害 +15%', P => { P.dmgMult *= 1.15; }], ['守之祝福', '防禦 +6', P => { P.def += 6; }], ['迅之祝福', '移動 +12%', P => { P.speed *= 1.12; }],
    ['泉之祝福', '每秒回復 0.8 生命', P => { P.regen += 0.8; }], ['靈之祝福', '技能冷卻 −15%', P => { P.skillCdMult *= 0.85; }],
    ['血之契約', '傷害 +35%，生命上限 −20%', P => { P.dmgMult *= 1.35; P.hpMax = Math.round(P.hpMax * 0.8); P.hp = Math.min(P.hp, P.hpMax); }],
    ['貪婪的契約', '這一趟的委託報酬加倍，受到的傷害 +15%', P => { P.greed = (P.greed || 0) + 1; P.frail = (P.frail || 0) + 0.15; }],
    ['捨身的契約', '暴擊傷害 +60%，防禦 −5', P => { P.critMult = (P.critMult || 1.5) + 0.6; P.def -= 5; }]
  ];
  const shrine = s => {
    if (s.used) { R.toast('祭壇的光已經熄了。'); return; }
    const opts = BLESS.slice().sort(() => rnd() - 0.5).slice(0, 3);
    R.sheet('<p class="kicker">遺跡的祭壇</p><h2>三選一</h2><p>祭壇上的光球慢慢轉著，三道光照在地上。只能選一道——這一趟遺跡有效。</p><div class="rv-opts">' + opts.map((b, i) => '<button type="button" class="rv-opt" data-bl="' + i + '"><b>' + esc(b[0]) + '</b><small>' + esc(b[1]) + '</small></button>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn" id="rv-x">不選了</button></div>');
    document.querySelectorAll('[data-bl]').forEach(el => { el.onclick = () => { const b = opts[+el.dataset.bl], P = W().P; s.used = true; b[2](P); (W().run.bless = W().run.bless || []).push(b[0]); s.a.orb.material.color.set('#5A5A5A'); s.a.L.intensity = 0.2; R.closeSheet(); R.banner && R.banner(b[0], b[1] + '（這一趟遺跡有效）'); R.sfx && R.sfx('chest'); }; });
    $('rv-x').onclick = R.closeSheet;
  };
  const spring = s => {
    if (s.used) { R.toast('泉水已經乾了。'); return; }
    const P = W().P; s.used = true; P.hp = P.hpMax; P.mp = P.mpMax; if (P.st) Object.keys(P.st).forEach(k => { P.st[k] = 0; }); P.slowT = 0; P.blindT = 0;
    s.a.w.material.opacity = 0.2; s.a.L.intensity = 0.2; R.fx('ring', P.x, 0.1, P.z, { r: 2, color: '#7AC8FF' }); R.toast('喝了泉水：生命、魔力回滿。', '#7AC8FF'); R.sfx && R.sfx('drink');
  };
  const merchant = s => {
    const run = W().run, lv = run.grade.lv || 1, st = S();
    if (!s.stock) { const l = R.rollChest ? R.rollChest(lv - 1, run.floor, st.cls, 1).find(q => q.item) : null; s.stock = [{ k: 'hp', n: '回復藥', p: 40 + 10 * lv }, { k: 'mp', n: '魔力藥', p: 40 + 10 * lv }]; if (l) s.stock.push({ item: l.item, n: R.itemName(l.item), p: Math.round((R.sellPrice ? R.sellPrice(l.item) : 100) * 3.5) }); }
    R.sheet('<p class="kicker">遺跡裡的行商</p><h2>擺攤的勇者</h2><p>「比城裡貴一點，我得自己搬下來。你先看，要買再叫我。」</p><div class="rv-opts">' + s.stock.map((x, i) => '<button type="button" class="rv-opt" data-mc="' + i + '"' + (x.sold || st.gold < x.p ? ' disabled' : '') + '><b>' + esc(x.n) + '</b><small>' + (x.sold ? '賣完了' : x.p + ' 費拉') + '</small></button>').join('') + '</div><p class="note">身上 ' + st.gold + ' 費拉。</p>',
      '<div class="row"><button type="button" class="btn" id="rv-x">不買了</button></div>');
    document.querySelectorAll('[data-mc]').forEach(el => { el.onclick = () => { const x = s.stock[+el.dataset.mc]; if (x.sold || st.gold < x.p) return; st.gold -= x.p; if (x.item) { x.sold = true; const P = W().P; R.dropItem(x.item, P.x + 1, P.z); } else { st.potions[x.k] = (st.potions[x.k] || 0) + 1; } R.save(); R.sfx && R.sfx('coin'); merchant(s); }; });
    $('rv-x').onclick = R.closeSheet;
  };
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => {
    const best = ni0(), w = W(), P = w.P, F = w.F; if (!F || !F.specs || !P) return best;
    let mine = null, md = 1e9;
    F.specs.forEach(s => { const d = Math.hypot(s.x - P.x, s.z - P.z); if (d < 2.2 && d < md) { md = d; mine = { x: s.x, z: s.z, r: 2.2, label: s.kind === 'shrine' ? (s.used ? '祭壇（光熄了）' : '在祭壇前祈禱（三選一的祝福）') : s.kind === 'spring' ? (s.used ? '泉水（乾了）' : '喝泉水（回滿生命魔力）') : '和擺攤的勇者說話（買東西）', act: () => (s.kind === 'shrine' ? shrine(s) : s.kind === 'spring' ? spring(s) : merchant(s)) }; } });
    if (!mine) return best; if (!best) return mine; return Math.hypot(best.x - P.x, best.z - P.z) < md ? best : mine;
  };
  // 貪婪的契約：受到的傷害
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (dmg, src, o) => { const P = W().P; return hp0(P && P.frail ? dmg * (1 + P.frail) : dmg, src, o); };

  // ---------- 偽箱：打開就咬 ----------
  const uc0 = R.useChest;
  R.useChest = c => {
    if (!c || !c.mimic || c.state !== 'closed' || !W().run) return uc0(c);
    c.mimic = false; c.state = 'open'; if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh); if (c.col) c.col.on = false; if (W().F) W().F.chests = W().F.chests.filter(x => x !== c);
    const e = R.spawnEnemy('mimic', c.x, c.z, c.room, { aggro: true, noAffix: true }); if (e) { e.mimicChest = c; R.fx('boom', c.x, 0.4, c.z, { r: 1.4, color: '#8A6A44' }); R.shake && R.shake(0.4); R.banner && R.banner('偽箱！', '寶箱咬上來了——打倒牠，裡面的東西照拿。'); }
    return;
  };
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => { const was = e && !e.dead, r = ke0(e, by); if (was && e.id === 'mimic' && W().run) { const run = W().run, loot = R.rollChest ? R.rollChest((run.grade.lv || 1) - 1, run.floor, S().cls, 1) : []; loot.forEach((l, i) => later(() => { if (l.item) R.dropItem(l.item, e.x, e.z + 0.6); else R.dropMat(l.mat, l.n, e.x, e.z + 0.6); }, i * 120)); } return r; };

  // ---------- 每一格：濃霧、崩落 ----------
  let rf = 3;
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(), run = w.run, F = w.F, P = w.P; if (!run || run.done || !F || !P) return;
    if (F.fogMin && w.scene && w.scene.fog && w.scene.fog.density < F.fogMin) w.scene.fog.density = F.fogMin;
    // 擺攤的勇者：點陣人物要每一格更新才畫得出來（作者 2026-10-04：擺攤勇者沒人顧攤）；看著走近的人
    (F.specs || []).forEach(s => { if (!s.h) return; const d = Math.hypot(P.x - s.h.g.position.x, P.z - s.h.g.position.z); if (d < 5) s.h.g.rotation.y = Math.atan2(P.x - s.h.g.position.x, P.z - s.h.g.position.z); R.animHero(s.h, 0, dt, false); });
    if (F.mod === 'rockfall') { rf -= dt; if (rf <= 0) { rf = 3.5 + rnd() * 2.5; for (let i = 0; i < 2; i++) { const a = rnd() * Math.PI * 2, d = i ? 1 + rnd() * 3 : 0, [x, z] = floorAt(P.x + Math.sin(a) * d, P.z + Math.cos(a) * d); R.fx('mark', x, 0, z, { r: 1.5, t: 1.1 }); later(() => { R.fx('boom', x, 0.6, z, { r: 1.5, color: '#8A7A6A' }); R.shake && R.shake(0.2); const Q = W().P; if (Q && !Q.dead && Math.hypot(Q.x - x, Q.z - z) < 1.5 && !(Q.iframe > 0)) R.hurtPlayer(Q.hpMax * 0.1, null); }, 1100); } } }
  };
  const css = document.createElement('style');
  css.textContent = 'body.rv-lost #r-map,body.rv-lost #r-minimap,body.rv-lost .gta-radar{visibility:hidden}#rv-mod small{display:block;opacity:.8;font-size:11px}'
    + '.rv-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:8px 0}.rv-opt{display:grid;gap:4px;text-align:left;padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg2);color:inherit;font:inherit;cursor:pointer}.rv-opt b{color:var(--gold,#C9A13A)}.rv-opt:hover:not([disabled]){border-color:var(--gold,#C9A13A)}.rv-opt[disabled]{opacity:.5;cursor:default}';
  document.head.appendChild(css);
})(window.R);
