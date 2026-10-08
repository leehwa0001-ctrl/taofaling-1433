// 討伐令 1433：遺跡改版——第 0 層休息區、層數變多、哈米莉亞前幾層是平民的地方（作者）
// - 保留區常見的「第 0 層」（哈米莉亞級、阿彌勒級；摩爾斯級以上照設定沒有）：多出來的一層，沒有遺跡生物。
//   入口那一間是休息區：營火（在旁邊休息，生命魔力回滿、倒下的隊友扶起來）、公會調查點的職員（補給回復藥、魔力藥）、
//   告示板（這座遺跡有幾層、知道的反應）、在休息的其他勇者（聊天）、帳篷和木箱。回歸水晶照舊在入口。
// - 層數變多：哈米莉亞 2→4、阿彌勒 4→6、摩爾斯 5→7、克森特 5→7、卡索 6→8（另外照遺跡形式加減）。
// - 哈米莉亞級：前一半的樓層沒有遺跡生物，會遇到登記進來的平民（採藥、撿樹枝、寫生、觀光、公會巡查）；後一半才開始出現（照分級還是不主動攻擊）。
// - 樓層的名字：有第 0 層的遺跡，第 0 層叫「休息區」，下面從第 1 層數起（R.floorLabel）。
// 難度和深度掛鉤在 balance.js（深度從第 1 層算）。
(function (R) {
  const W = R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const MORE = { hamilia: 4, amile: 6, mors: 7, kesent: 7, kaso: 8 };
  Object.keys(MORE).forEach(id => { const g = R.gradeById && R.gradeById(id); if (g) g.floors = MORE[id]; });
  const has0 = run => !!(run && run.grade && run.grade.floor0);
  // 哈米莉亞的平靜樓層：第 1 層到一半
  const calmFloor = (run, f) => run && run.grade.id === 'hamilia' && f >= 1 && f <= Math.max(1, Math.floor((run.floors - 1) / 2));
  R.floorLabel = run => { if (!run) return ''; const f = run.floor; if (has0(run)) return f === 0 ? '第 0 層・休息區' : '第 ' + f + '／' + (run.floors - 1) + ' 層'; return '第 ' + (f + 1) + '／' + run.floors + ' 層'; };

  // ---------- 第 0 層：多一層；平靜樓層：房間都是安全的 ----------
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const run = W.run; if (run && f === 0 && has0(run) && !run.f0) { run.f0 = true; run.floors += 1; } return lf0(f, o); };
  const gf0 = R.genFloor;
  R.genFloor = (run, f) => {
    const F = gf0(run, f);
    if (has0(run) && f === 0) {
      F.rest = true;
      const st = F.rooms[0]; st.hx = Math.max(st.hx, 12.5); st.hz = Math.max(st.hz, 10); st.w = st.hx * 2; st.h = st.hz * 2; st.rest = 1;
      F.rooms.forEach(r => { if (r.type === 'start' || r.type === 'stairs') return; if (r.type !== 'ore') r.type = 'fight'; r.cleared = true; r.calm = 1; r.traps = 0; });
    } else if (calmFloor(run, f)) {
      F.calm = true;
      F.rooms.forEach(r => { if (r.type === 'fight' || r.type === 'trap' || r.type === 'chest') { if (r.type === 'trap') r.type = 'fight'; r.cleared = true; r.calm = 1; r.traps = 0; } });
    }
    return F;
  };
  const pf0 = R.populateFloor;
  R.populateFloor = () => { const F = W.F; if (F && (F.rest || F.calm)) return; return pf0(); };
  const sr0 = R.spawnRivals;
  if (sr0) R.spawnRivals = () => { const F = W.F; if (F && (F.rest || F.calm)) { W.rivalParty = null; W.rivals = []; return; } return sr0(); };

  // ---------- 人（休息的勇者、職員、平民） ----------
  const TOPS = ['#3A4A5A', '#5A3A3A', '#3A5A4A', '#6A5A3A', '#4A3A5A', '#7A6A5A', '#8A4A3A', '#C8A888'], HAIRS = ['#1A1410', '#2A2420', '#4A3424', '#6A4A2E', '#8A8A88', '#C8C0B0'];
  const npc = (x, z, look, o) => {
    const F = W.F, h = R.makeHero(o && o.cls || 'warrior', o && o.weapon || null, Object.assign({ pool: 'rp_' + (o && o.pool || 'x'), lite: 1, weapon: o && o.weapon || null, shield: false }, look));
    h.g.position.set(x, 0, z); h.g.rotation.y = rnd() * 6.28; F.group.add(h.g);
    const n = Object.assign({ h, x, z, room: null, tx: x, tz: z, wait: rnd() * 3 }, o || {}); (F.rpNpcs = F.rpNpcs || []).push(n); return n;
  };
  const say = (who, lines) => R.townTalk ? R.townTalk(who, lines) : R.toast(lines[0]);
  const ADV = [['休息的勇者', ['「阿彌勒級會封門。我都先把藥放在拿得到的地方，免得進去才翻包。」', '「入口有回歸水晶。藥用完了就回來，別等走不動才想起它。」', '「寶箱拿完記得關上，過一陣子才會再長東西。旁邊人多，就等得更久。」', '「我搭檔還在城裡問評分的事。說好早上來，我都等餓了。」']],
    ['烤火的勇者', ['「營火旁邊烤一下，手指才拿得住刀。」', '「聽說克森特級的入口會自己關起來。我才不去。」', '「上次在下面看到會發光的蛞蝓，一整排，像路燈。」']]];
  const CIV = [['採藥的大嬸', '#8A5A4A', ['「登記過就能進來採藥。這一層沒有遺跡生物，安心啦。」', '「凍耳是霜溪的，這裡長的是苔。拿去白藤堂換錢。」', '「再往下就不行了，那裡有東西在走。」']],
    ['撿樹枝的老伯', '#6A6A5A', ['「這些樹枝滿直的，我挑幾根帶回去，看看能不能編個籃子。」', '「年輕人，下面要小心。」']],
    ['寫生的學生', '#3A4A7A', ['「學府的作業，要畫遺跡的牆。這些凹痕到底是什麼字啊？」', '「不好意思，借過一下，我要看你後面那塊。快畫完了。」']],
    ['觀光客', '#C8A888', ['「哇，這就是遺跡啊！跟繪葉書上一模一樣。」', '「導遊叫我們在這裡等。有人去找他了，你有看見嗎？」']],
    ['公會的巡查員', '#3E5A4A', ['「登記過的民眾可以在這層活動。你要往下？先把勇者證拿給我看一下。」', '「採集要照規矩，不要越界。」']]];
  const build = () => {
    const F = W.F, run = W.run; if (!F || !run) return;
    F.rpNpcs = []; F.rpInter = [];
    if (F.rest || F.calm) W.enemies = (W.enemies || []).filter(e => { if (e.dead || ['luck', 'prophet'].includes(e.def && e.def.ai)) return true; if (e.m && e.m.g && e.m.g.parent) e.m.g.parent.remove(e.m.g); e.dead = true; return false; });   // 休息區、平靜樓層：不留會攻擊的生物（福影童、預言犢沒關係）
    const TH = THREE;
    if (F.rest) {
      const r = F.rooms[0], cx = r.x, cz = r.z + 1.5;
      // 營火
      const g = new TH.Group();
      for (let i = 0; i < 6; i++) { const lg = new TH.Mesh(new TH.CylinderGeometry(0.09, 0.09, 1.1, 5), new TH.MeshLambertMaterial({ color: '#5A3A24' })); lg.rotation.z = Math.PI / 2; lg.rotation.y = i / 6 * Math.PI; lg.position.y = 0.12; g.add(lg); }
      for (let i = 0; i < 8; i++) { const st = new TH.Mesh(new TH.DodecahedronGeometry(0.16, 0), new TH.MeshLambertMaterial({ color: '#6A6458' })); const a = i / 8 * Math.PI * 2; st.position.set(Math.cos(a) * 0.65, 0.1, Math.sin(a) * 0.65); g.add(st); }
      const fl = new TH.Mesh(new TH.ConeGeometry(0.3, 0.8, 6), new TH.MeshBasicMaterial({ color: '#FF9A3A' })); fl.position.y = 0.5; g.add(fl); const fl2 = new TH.Mesh(new TH.ConeGeometry(0.16, 0.5, 6), new TH.MeshBasicMaterial({ color: '#FFE08A' })); fl2.position.y = 0.45; g.add(fl2);
      const L = new TH.PointLight('#FFB060', 1.4, 14, 1.6); L.position.set(0, 1.4, 0); g.add(L);
      g.position.set(cx, 0, cz); F.group.add(g); F.fire = { fl, fl2, L }; R.addBox(cx - 0.6, cx + 0.6, cz - 0.6, cz + 0.6, 'deco');
      // 帳篷、木箱、長椅（圓木）
      const tent = (x, z, col) => { const t = new TH.Mesh(new TH.ConeGeometry(1.5, 1.8, 4), new TH.MeshLambertMaterial({ color: col })); t.rotation.y = Math.PI / 4; t.position.set(x, 0.9, z); t.castShadow = true; F.group.add(t); R.addBox(x - 1.1, x + 1.1, z - 1.1, z + 1.1, 'deco'); };
      // 擺東西之前先看那裡是不是地板：房間小、形狀不規則的時候，照固定的距離擺會擺進牆裡（作者 2026-10-04：安全區的專員會在牆裡）。
      // 不是地板（或已經有東西）就往房間中心一點一點挪。
      const t = F.tile, okAt = (x, z, rad) => { if (!t) return true; const n = Math.ceil((rad || 1) / 2); const tx = t.tX(x), tz = t.tZ(z); for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) { const k = t.id(tx + dx, tz + dz); if (t.T[k] !== 1) return false; } return !(R.pointBlocked && R.pointBlocked(x, z)); };
      const fit = (x, z, rad) => { let px = x, pz = z; for (let i = 0; i < 16 && !okAt(px, pz, rad); i++) { px += (r.x - px) * 0.2; pz += (cz - pz) * 0.2; } return [px, pz]; };
      tent(...fit(cx - 7, cz - 4, 1.6), '#6A7A5A'); tent(...fit(cx + 7, cz - 4.5, 1.6), '#7A5A4A');
      [[cx - 2.4, cz + 0.4, 0], [cx + 2.4, cz + 0.4, 0], [cx, cz + 2.6, Math.PI / 2]].forEach(([x, z, ry]) => { const lgm = new TH.Mesh(new TH.CylinderGeometry(0.25, 0.25, 1.8, 7), new TH.MeshLambertMaterial({ color: '#6A4A30' })); lgm.rotation.z = Math.PI / 2; lgm.rotation.y = ry + Math.PI / 2; lgm.position.set(x, 0.25, z); F.group.add(lgm); });
      const [bx0, bz0] = fit(cx + 6.45, cz + 3, 1.2);
      for (let i = 0; i < 4; i++) { const b = new TH.Mesh(new TH.BoxGeometry(0.8, 0.6, 0.8), new TH.MeshLambertMaterial({ color: '#8A6A44' })); b.position.set(bx0 - 0.45 + (i % 2) * 0.9, 0.3 + Math.floor(i / 2) * 0.6, bz0); b.castShadow = true; F.group.add(b); }
      R.addBox(bx0 - 0.85, bx0 + 0.95, bz0 - 0.4, bz0 + 0.4, 'deco');
      // 調查點的桌子和告示板
      const [dx0, dz0] = fit(cx - 6, cz + 2.6, 2), [gx0, gz0] = fit(cx + 3, cz - 5.5, 1);   // 桌子和職員（職員站在桌子北邊）、告示板
      const desk = new TH.Mesh(new TH.BoxGeometry(2.2, 0.8, 0.9), new TH.MeshLambertMaterial({ color: '#7A5A3A' })); desk.position.set(dx0, 0.4, dz0 + 0.4); F.group.add(desk); R.addBox(dx0 - 1.1, dx0 + 1.1, dz0 - 0.05, dz0 + 0.85, 'deco');
      const board = new TH.Mesh(new TH.BoxGeometry(1.8, 1.2, 0.1), new TH.MeshLambertMaterial({ color: '#E8DCC0' })); board.position.set(gx0, 1.3, gz0); F.group.add(board); const pole = new TH.Mesh(new TH.BoxGeometry(0.12, 1.3, 0.12), new TH.MeshLambertMaterial({ color: '#4A3424' })); pole.position.set(gx0, 0.65, gz0); F.group.add(pole);
      const clerk = npc(dx0, dz0 - 0.5, { top: '#3E5A4A', hair: '#2A2420', cloak: '#2E4A3A' }, { pool: 'clerk', still: true, rot: 0 });
      F.rpInter.push({ x: dx0, z: dz0 - 1.3, r: 2, label: '公會調查點的職員（補給）', act: supply });
      F.rpInter.push({ x: gx0, z: gz0 + 0.9, r: 1.8, label: '看告示板', act: () => say('第 0 層・告示板', ['「' + run.site.name + '」：' + run.grade.name + '，第 0 層以下共 ' + (run.floors - 1) + ' 層。', run.grade.desc || '', run.reactionKnown ? '已知的反應：' + R.REACTIONS[run.reaction].name : '「佩特拉的反應：未確認。請回報。」——調查點'].filter(Boolean)) });
      F.rpInter.push({ x: cx, z: cz + 1.2, r: 2.2, label: '在營火旁休息（回復）', act: rest });
      // 休息的勇者
      ADV.forEach(([nm, lines], i) => { const a = (i + 0.5) * Math.PI, n = npc(cx + Math.cos(a) * 2.4, cz + Math.sin(a) * 1.2 + 0.4, { top: pick(TOPS), hair: pick(HAIRS), cloak: pick(TOPS) }, { pool: 'adv' + i, still: true, sit: true, weapon: i ? 'spear' : 'sword' }); n.h.sit = true; n.h.g.rotation.y = Math.atan2(cx - n.x, cz - n.z); F.rpInter.push({ x: n.x, z: n.z + 0.9, r: 1.5, label: '和' + nm + '說話', act: () => say(nm, [pick(lines)]) }); });
    }
    if (F.calm) {
      const rooms = F.rooms.filter(r => r.type !== 'start' && r.type !== 'stairs');
      const n = Math.min(rooms.length, 3 + Math.floor(rnd() * 3));
      for (let i = 0; i < n; i++) {
        const r = rooms[i % rooms.length], [x, z] = R.roomPoint(r, {}), [nm, top, lines] = pick(CIV), c = npc(x, z, { top, hair: pick(HAIRS), cloak: pick(TOPS) }, { pool: 'civ' + i, room: r, speed: 1.1 + rnd() * 0.5 });
        F.rpInter.push({ get x() { return c.x; }, get z() { return c.z; }, r: 1.6, label: '和' + nm + '說話', act: () => say(nm, [pick(lines)]) });
      }
      if (!F.zoo) R.banner(R.floorLabel(run), '這一層開放給登記的民眾，沒有遺跡生物。再往下才會遇到。');   // 動物園（zoo.js）另外講
    }
  };
  const lf1 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf1(f, o); try { build(); } catch (e) { console.warn('[ruinplus]', e); } return r; };
  // 營火：回滿、扶起隊友
  const rest = () => {
    const P = W.P; if (!P) return; P.hp = P.hpMax; P.mp = P.mpMax;
    (W.allies || []).forEach(a => { if (a.downed) { a.downed = false; if (R.setDown) R.setDown(a.h, false); } a.hp = a.hpMax || a.hp; });
    const san = W.F && !W.F.sanRest && R.sanAdd; if (san) { W.F.sanRest = 1; R.sanAdd(8); }   // 2026-10-08 作者：營火回一點理智（約 8；一層一次）
    R.sfx && R.sfx('drink'); R.toast('在營火旁坐了一會兒。手腳暖了，傷也包紮好了。（生命、魔力回滿' + (san ? '、理智 +8' : '') + '）');
  };
  const supply = () => {
    const S = R.S, ph = 24, pm = 24;
    R.sheet('<p class="kicker">第 0 層・公會調查點</p><h2>補給</h2><p>「遺跡裡的價錢，比城裡貴一點。搬下來很累的。」</p><p class="note">回復藥 ' + (S.potions.hp || 0) + ' 瓶、魔力藥 ' + (S.potions.mp || 0) + ' 瓶。身上 ' + S.gold + ' 費拉。</p>',
      '<div class="row"><button type="button" class="btn pri" id="rp-hp">回復藥（' + ph + ' 費拉）</button><button type="button" class="btn" id="rp-mp">魔力藥（' + pm + ' 費拉）</button><button type="button" class="btn" id="rp-x">不用了</button></div>');
    const buy = (k, p) => () => { if (S.gold < p) { R.toast('錢不夠。'); return; } S.gold -= p; S.potions[k] = (S.potions[k] || 0) + 1; R.save && R.save(); R.closeSheet(); supply(); };
    document.getElementById('rp-hp').onclick = buy('hp', ph); document.getElementById('rp-mp').onclick = buy('mp', pm); document.getElementById('rp-x').onclick = R.closeSheet;
  };
  // 互動
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => {
    const best = ni0(), P = W.P, F = W.F; if (!F || !F.rpInter || !F.rpInter.length || !P) return best;
    let b2 = best, bd = best ? Math.hypot(best.x - P.x, best.z - P.z) : 1e9;
    F.rpInter.forEach(it => { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < bd) { bd = d; b2 = it; } });
    return b2;
  };
  // 每一格：營火搖晃、平民走來走去
  const step0 = R.step;
  R.step = dt => {
    step0(dt);
    const F = W.F; if (!F || !W.run) return;
    if (F.fire) { const k = 1 + Math.sin(performance.now() / 90) * 0.12 + Math.sin(performance.now() / 37) * 0.06; F.fire.fl.scale.set(1, k, 1); F.fire.fl2.scale.set(1, 2 - k, 1); F.fire.L.intensity = 1.2 + (k - 1) * 2; }
    (F.rpNpcs || []).forEach(n => {
      if (n.still || !n.room) { R.animHero(n.h, 0, dt, false); return; }
      n.wait -= dt; const d = Math.hypot(n.tx - n.x, n.tz - n.z);
      if (d < 0.3) { R.animHero(n.h, 0, dt, false); if (n.wait <= 0) { n.wait = 2 + rnd() * 4; [n.tx, n.tz] = R.roomPoint(n.room, {}); } return; }
      const a = Math.atan2(n.tx - n.x, n.tz - n.z), sp = n.speed || 1.2; n.x += Math.sin(a) * sp * dt; n.z += Math.cos(a) * sp * dt; const o = { x: n.x, z: n.z }; R.collide(o, 0.35); n.x = o.x; n.z = o.z;
      n.h.g.position.set(n.x, 0, n.z); n.h.g.rotation.y = a; R.animHero(n.h, sp, dt, false);
    });
  };
  R.ruinPlusDebug = { calmFloor, has0 };
})(window.R);
