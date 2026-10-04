// 遺跡裡殺勇者、藏屍體、搜刮（2026-10-04 作者：在遺跡裡遇到勇者可以殺掉，並放到草叢藏起來屍體，可以搜刮屍體獲得偷來的東西）
// 接在 rivals.js（遺跡裡的其他勇者）上面：
// - 走近不是敵人的勇者（各走各的、一起行動中的），可以「對他們動手」（會先問一次）——整隊變成敵人。
// - 倒下的勇者都會留下屍體：你殺的、背叛你的、賞金獵人、被遺跡生物打死的。
//   搜刮：身上的錢、一點素材；他們這一層開走的寶箱（「遠處傳來寶箱被打開的聲音」），東西在他們身上。
//   搜刮完可以拖著走（走路變慢），拖到草叢旁邊藏進去（雪地是雪堆、火山和沙漠是碎石堆、深淵是岩縫）。每一層放 3～5 叢。
// - 你殺的是老實的勇者（不是壞人、不是賞金獵人）：屍體沒藏好就離開那一層，回到城裡公會會調查——
//   每一具六成機率查到你：罰金、拘留、勇者證停權、前科（和 punish.js 一樣算）。藏好了就沒人知道。
//   老實勇者的勇者證不會掉（拿回公會等於自首）。
// 放在 rivals.js、run.js、punish.js、san.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s), rnd = Math.random;
  const RANGED = { gunner: 1, archer: 1, mage: 1, priest: 1 };
  const HIDE = env => /snow/.test(env || '') ? ['雪堆', '#E8EEF2', '#C8D8E0', 0] : /volcano|lava|desert|sand|forge/.test(env || '') ? ['碎石堆', '#8A7A6A', '#6A5A4A', 1] : /deep/.test(env || '') ? ['岩縫', '#4A4A58', '#34343E', 1] : ['草叢', '#4A7A3A', '#5E9A48', 0];
  const hk = () => { const F = W().F; if (!F) return null; return F.hk || (F.hk = { bushes: [], bodies: [], prev: new Map(), byP: new Set(), done: false }); };
  // ---------- 草叢 ----------
  const bushMesh = (x, z, h) => {
    const T = window.THREE, g = new T.Group(), a = new T.MeshLambertMaterial({ color: h[1], flatShading: !!h[3] }), b = new T.MeshLambertMaterial({ color: h[2], flatShading: !!h[3] });
    [[0, 0, 0.75], [0.55, 0.2, 0.55], [-0.5, 0.25, 0.6], [0.1, -0.5, 0.5]].forEach(([dx, dz, r], i) => { const s = new T.Mesh(h[3] ? new T.DodecahedronGeometry(r, 0) : new T.SphereGeometry(r, 8, 6), i % 2 ? b : a); s.position.set(dx, r * 0.6, dz); s.scale.y = 0.75; g.add(s); });
    g.position.set(x, 0, z); return g;
  };
  const placeBushes = () => {
    const w = W(), F = w.F, run = w.run, H = hk(); if (!F || !run || !F.rooms || !R.roomPoint) return;
    const h = HIDE(run.env), rooms = F.rooms.filter((r, i) => i > 0 && r.type !== 'boss' && r.type !== 'lord' && r.type !== 'puzzle'); if (!rooms.length) return;
    const want = rooms.slice().sort(() => rnd() - 0.5).slice(0, 3 + Math.floor(rnd() * 3));
    if (w.rivalParty && w.rivalParty.room && !want.includes(w.rivalParty.room)) want.push(w.rivalParty.room);   // 有別的隊伍的那間一定有一叢
    want.forEach(r => { try { const [x, z] = R.roomPoint(r, { min: 1.5 }); const m = bushMesh(x, z, h); (F.group || w.scene).add(m); H.bushes.push({ x, z, m, name: h[0], wig: 0 }); } catch (e) { } });
  };
  // ---------- 屍體 ----------
  const partyOf = m => { const pa = W().rivalParty; return pa && pa.members && pa.members.includes(m) ? pa : null; };
  const makeBody = (x, z, m, o) => {
    const w = W(), H = hk(); if (!H || !m) return;
    let h = o.h; if (!h) { try { h = R.humanModel(m); } catch (e) { return; } }
    h.g.position.set(x, 0, z); if (!h.g.parent) (w.F.group || w.scene).add(h.g); R.setDown && R.setDown(h, true);
    H.bodies.push({ x, z, h, m, innocent: !!o.innocent, pa: o.pa || partyOf(m), looted: false, hidden: false, carried: false });
  };
  const hd0 = R.humanDown;
  R.humanDown = e => {
    const m = e && e.member;
    if (m && e.innocent) R.dropGold(10 + Math.floor(rnd() * 30) + m.lv * 2, e.x, e.z);   // 老實勇者：不掉勇者證
    else if (hd0) hd0(e);
    try { if (m) makeBody(e.x, e.z, m, { innocent: e.innocent, pa: e.pa }); } catch (err) { console.warn('[herokill]', err); }
  };
  // ---------- 搜刮 ----------
  const search = b => {
    const run = W().run; if (!run || b.looted) return; b.looted = true;
    const got = [], m = b.m, x = b.x, z = b.z + 0.6;
    const gold = 15 + Math.floor(rnd() * 30) + (m.lv || 1) * 3; R.dropGold(gold, x, z); got.push(gold + ' 費拉');
    const mats = ['herb', 'branch', 'crystal', 'bone', 'silk'].filter(k => R.MATS[k]);
    for (let i = 0; i < 1 + (rnd() < 0.5 ? 1 : 0); i++) { const k = mats[Math.floor(rnd() * mats.length)]; R.dropMat(k, 1, x + rnd() - 0.5, z); got.push(R.MATS[k].name); }
    const pa = b.pa, tiers = pa && pa.stolenTiers && pa.stolenTiers.length ? pa.stolenTiers.splice(0) : rnd() < 0.3 ? [0] : [];
    let n = 0;
    tiers.forEach(t => (R.rollChest(run.grade.lv - 1, run.floor, S().cls, t) || []).forEach(l => { n++; setTimeout(() => { if (W().run !== run) return; if (l.item) R.dropItem(l.item, x + rnd() - 0.5, z + rnd() * 0.6); else R.dropMat(l.mat, l.n, x, z); }, 150 * n); }));
    R.sfx && R.sfx('chest');
    R.toast('搜了' + m.name + '的身上：' + got.join('、') + (n ? '，還有 ' + n + ' 樣' + (pa && tiers.length && pa.stolenTiers ? '從寶箱拿走的東西' : '東西') : '') + '。' + (b.innocent ? '你翻到一張勇者證。照片和名字都還清楚，沒有拿走。' : ''), '#E8C04A');
  };
  // ---------- 拖著走、藏起來 ----------
  const carried = () => { const H = hk(); return H ? H.bodies.find(b => b.carried) : null; };
  const nearBush = P => { const H = hk(); if (!H) return null; let best = null, bd = 2.4; H.bushes.forEach(u => { const d = Math.hypot(u.x - P.x, u.z - P.z); if (d < bd) { bd = d; best = u; } }); return best; };
  const hide = (b, u) => {
    b.carried = false; b.hidden = true; if (b.h.g.parent) b.h.g.parent.remove(b.h.g); u.wig = 0.8;
    R.sfx && R.sfx('pick'); R.toast(b.m.name + '的屍體藏進' + u.name + '裡了。' + (b.innocent ? '從通道這邊已經看不見屍體了。' : ''), '#9AC88A');
  };
  // ---------- 對勇者動手 ----------
  const askAttack = (pa, who) => {
    R.sheet('<p class="kicker">遺跡裡的其他勇者</p><h2>對' + esc(who) + '的隊伍動手？</h2><p>他們是公會登記的勇者' + (pa.state === 'coop' ? '，現在和你一起行動' : '') + '。動了手，整隊都會變成敵人。</p><p class="note">殺了老實的勇者，屍體要藏好（拖到草叢裡）——沒藏好就離開這一層，回城以後公會會調查。</p>',
      '<div class="row"><button type="button" class="btn" id="hk-yes" style="color:#F06A6A">動手</button><button type="button" class="btn pri" id="hk-no">算了</button></div>');
    $('hk-no').onclick = R.closeSheet;
    $('hk-yes').onclick = () => { R.closeSheet(); attack(pa); };
  };
  const attack = pa => {
    const w = W(), P = w.P; if (!pa || pa.state === 'hostile' || pa.state === 'gone') return;
    const list = pa.state === 'coop' ? (w.allies || []).filter(a => a.rival && !a.downed) : (w.rivals || []).filter(a => !a.dead);
    pa.state = 'hostile'; pa.byYou = true;
    list.forEach(a => {
      if (a.h && a.h.g.parent) a.h.g.parent.remove(a.h.g);
      const m = a.m || a.member, e = R.spawnEnemy(RANGED[m.cls] ? 'rogue_shot' : 'rogue', a.x, a.z, R.roomIndexAt(a.x, a.z), { aggro: true, human: m });
      e.title = m.name; e.member = m; e.innocent = !pa.traitor; e.pa = pa; e.hp = e.hpMax * Math.max(0.4, a.hp / a.hpMax);
    });
    w.allies = (w.allies || []).filter(a => !a.rival); w.rivals = [];
    R.banner('你對勇者動手了', pa.traitor ? '「……被發現了嗎！」' : '「你瘋了嗎！」');
    R.shake && R.shake(0.3);
  };
  // ---------- 互動 ----------
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => {
    const base = ni0(), w = W(), P = w.P, H = hk(); if (!P || !H || !w.run) return base;
    const list = [], c = carried();
    if (c) { const u = nearBush(P); list.push(u ? { x: u.x, z: u.z, r: 2.4, label: '把' + c.m.name + '的屍體藏進' + u.name, act: () => hide(c, u) } : { x: P.x, z: P.z, r: 1, label: '放下' + c.m.name + '的屍體', act: () => { c.carried = false; }, low: 1 }); }
    else H.bodies.forEach(b => { if (!b.hidden) list.push({ x: b.x, z: b.z, r: 1.8, label: b.looted ? '拖著' + b.m.name + '的屍體走' : '搜刮' + b.m.name + '的屍體', act: () => { if (!b.looted) search(b); else { b.carried = true; R.toast('拖著' + b.m.name + '走（走路會變慢）。找' + (H.bushes[0] ? H.bushes[0].name : '草叢') + '藏起來。'); } } }); });
    const pa = w.rivalParty;
    if (pa && (pa.state === 'neutral' || pa.state === 'coop')) {
      const ppl = pa.state === 'coop' ? (w.allies || []).filter(a => a.rival && !a.downed) : (w.rivals || []).filter(a => !a.dead);
      ppl.forEach(a => list.push({ x: a.x, z: a.z, r: 1.8, label: '對' + (a.m || a.member).name + '動手', act: () => askAttack(pa, pa.members[0].name), low: 1 }));
    }
    let best = null, bd = 1e9;
    for (const it of list) { if (it.low && (base || best)) continue; const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < bd) { bd = d; best = it; } }
    if (!best) return base; if (!base) return best;
    return Math.hypot(base.x - P.x, base.z - P.z) <= bd ? base : best;
  };
  const uc0 = R.useChest;
  R.useChest = c => { const H = hk(); if (H) H.byP.add(c); return uc0(c); };
  // ---------- 每一格 ----------
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(), run = w.run, P = w.P, H = hk(); if (!run || !H || !P) return;
    // 別的隊伍開走的寶箱
    (w.F.chests || []).forEach(c => { const was = H.prev.get(c); if (was === 'closed' && c.state !== 'closed') { if (H.byP.has(c)) H.byP.delete(c); else if (w.rivalParty) { const pa = w.rivalParty; (pa.stolenTiers = pa.stolenTiers || []).push(Math.max(0, (c.tier || 0) - Math.max(0, (c.opened || 2) - 2))); } } H.prev.set(c, c.state); });
    // 被遺跡生物打死的勇者：留下屍體
    if (w.rivals && w.rivals.some(a => a.dead)) { w.rivals.forEach(a => { if (a.dead && !a.bodied) { a.bodied = true; makeBody(a.x, a.z, a.m, { h: a.h, pa: w.rivalParty }); } }); w.rivals = w.rivals.filter(a => !a.dead); }
    // 拖著走
    const c = H.bodies.find(b => b.carried);
    if (c) { if (P.dead) c.carried = false; else { const d = Math.hypot(P.x - c.x, P.z - c.z); if (d > 1) { c.x += (P.x - c.x) * (1 - 1 / d); c.z += (P.z - c.z) * (1 - 1 / d); } c.h.g.position.set(c.x, 0, c.z); P.slowT = Math.max(P.slowT || 0, 0.12); } }
    H.bodies.forEach(b => { if (!b.hidden && R.animHero) R.animHero(b.h, 0, dt, false); });
    H.bushes.forEach(u => { if (u.wig > 0) { u.wig -= dt; const k = 1 + Math.sin(u.wig * 30) * 0.08 * u.wig; u.m.scale.set(k, 1 / k, k); if (u.wig <= 0) u.m.scale.set(1, 1, 1); } });
  };
  // ---------- 離開這一層：沒藏好的屍體 ----------
  const leaveFloor = () => {
    const H = W().F && W().F.hk; if (!H || H.done) return; H.done = true;
    const left = H.bodies.filter(b => b.innocent && !b.hidden); if (!left.length) return;
    const s = S(); s.bodyPending = (s.bodyPending || []).concat(left.map(b => b.m.name));
    R.toast('（屍體還留在原處，沒有遮掩。）', '#F06A6A');
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { try { if (W().run) leaveFloor(); } catch (e) { } const r = lf0(f, o); try { if (W().run && f > 0) placeBushes(); } catch (e) { console.warn('[herokill]', e); } return r; };
  // ---------- 回到城裡：公會調查 ----------
  const er0 = R.endRun;
  R.endRun = (...a) => {
    try { leaveFloor(); } catch (e) { }
    const r = er0(...a), s = S(), names = s && s.bodyPending || [];
    if (names.length) { s.bodyPending = []; setTimeout(() => investigate(names), 3000); }
    return r;
  };
  const investigate = names => {
    const s = S(); if (!s) return; const n = names.length, traced = rnd() < 1 - Math.pow(0.4, n);
    if (!traced) { R.addDeed && R.addDeed('遺跡裡發現了 ' + n + ' 具勇者的遺體（' + names.join('、') + '）。公會東鶴分館正在調查。'); R.banner('公會在遺跡裡發現了勇者的遺體', '正在調查……還沒有查到你。'); R.save(); return; }
    const prior = s.caughtN || 0, fine = Math.min(s.gold, 300 * n), days = Math.min(7, 2 + n + prior), ban = Math.min(30, 5 * n + 3 * prior);
    s.gold -= fine; s.caughtN = prior + 1; s.rep = (s.rep || 0) - 15 * n; s.shameUntil = Math.max(s.shameUntil || 0, s.day + 7); s.banUntil = Math.max(s.banUntil || 0, s.day + days + ban);
    const left = (s.party || []).filter(m => !m.story).map(m => m.name); s.party = (s.party || []).filter(m => m.story);
    if (R.advanceDays) R.advanceDays(days);
    R.addDeed && R.addDeed('公會東鶴分館懲戒委員會：一名勇者在遺跡內殺害同行勇者（' + names.join('、') + '），勇者證停權 ' + ban + ' 日。');
    const lines = ['遺跡裡沒藏好的屍體被下一隊勇者發現了。公會查到了你。', '罰金 ' + fine + ' 費拉。', '在拘留所待了 ' + days + ' 天。', '勇者證停權 ' + ban + ' 天——不能接委託，也不能下遺跡。', '前科 ' + (prior + 1) + ' 次。名聲大降；這幾天向店家購物，價格提高三成。'];
    if (left.length) lines.push(left.join('、') + '離開了隊伍：「我不跟殺過勇者的人一起下遺跡。」');
    R.sheet('<p class="kicker">公會東鶴分館・懲戒委員會</p><h2>被查到了</h2><ul class="loot">' + lines.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>', '<div class="row"><button type="button" class="btn pri" id="hk-out">走出來</button></div>');
    $('hk-out').onclick = () => { R.closeSheet(); const tw = W().town; s.pendingHour = 9; if (tw && R.enterTownNow) R.enterTownNow(tw.from); };
    R.save();
  };
  R.herokillDebug = { hk, attack, search, makeBody, placeBushes, investigate };
})(window.R);
