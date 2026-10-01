// 東鶴的警戒：偷得越多，整座城越提防你；衛兵不再那麼容易甩掉。
// - 街坊的警戒（R.S.wary.v，0～12）：偷東西、扒錢包、被抓包都會加；每過一天慢慢退。
//   警戒越高：路人看得越遠、越常東張西望、視線條漲得越快、下手要越久；警戒 4 以上衛兵加派巡邏。
//   被衛兵抓過、幾天內沒戴兜帽，路人和衛兵認得你的臉。
// - 衛兵（props.js 追人的那一段交給 R.guardMove）：跑得和你一樣快（通緝越高越快）、看不到你就往你跑的方向找、
//   用哨音通知附近的衛兵、被房子擋住就照路走（gtamap.js 的 R.navPath）；兩顆星以上從詰所派人來；追完回崗位。
// - 路人看到通緝中的你會大喊，衛兵就知道你在哪裡；狗也會叫（townlife.js）。
// - 和路人說話：說的話照你偷過多少、有沒有被抓過、天氣和時間而不同。
(function (R) {
  const W = () => R.W, C = R.crime, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  if (!C) return;
  const wary = () => { const S = R.S; if (!S) return null; S.wary = S.wary || { v: 0, stolen: (S.stats && S.stats.stolen) || 0, picked: (S.stats && S.stats.picked) || 0 }; return S.wary; };
  const level = () => { const w = wary(); return w ? Math.min(12, w.v) : 0; };
  const recognized = () => { const S = R.S; return !!S && S.caughtDay != null && S.day - S.caughtDay <= 4 && !(R.hoodOn && R.hoodOn()); };
  const NOTES = [[2, '（城裡的人好像開始提防小偷了。）', '西市口一帶竊案頻傳，店家提高警覺。'], [4, '（衛兵加派了巡邏。）', '東鶴衛兵所因竊案增加，加派街頭巡邏。'], [7, '（整條街都在談竊案。大家都盯著陌生人的手。）', '東鶴連日竊案，縣廳要求衛兵所限期破案。']];
  const bump = k => { const w = wary(); if (!w) return; const v0 = w.v; w.v = Math.min(12, w.v + k); NOTES.forEach(([t, msg, deed]) => { if (v0 < t && w.v >= t) { setTimeout(() => R.toast(msg), 2200); if (R.addDeed) R.addDeed(deed); } }); };

  // ---------- 難度倍數：props.js、streetcrime.js 讀 R.crimeK ----------
  const updateK = () => {
    const w = level(), rec = recognized() ? 1 : 0;
    R.crimeK = { range: 1 + 0.045 * w + 0.15 * rec, fov: 1 + 0.035 * w + 0.1 * rec, seen: 1.35 * (1 + 0.09 * w) * (1 + 0.3 * rec), time: 1.25 * (1 + 0.05 * w), look: 1 + 0.1 * w, turn: 1.5 * (1 + 0.08 * w), lost: 1.8 + 0.08 * w };
  };
  // 每過一天，警戒退一點
  const nd = R.onNewDay;
  R.onNewDay = () => { nd(); const w = wary(); if (w) w.v = Math.max(0, w.v * 0.85 - 0.3); };
  R.onArrest = () => { const S = R.S; S.caughtDay = S.day; S.caughtN = (S.caughtN || 0) + 1; bump(2); };

  // ---------- 衛兵 ----------
  let lastHeat = 0, civT = 0, radioT = 0, reinfT = 0;
  const playerRun = () => { const P = W().P; return P ? P.speed * 1.65 : 9; };
  const toS = v => v / R.CITY.S + 500, toW = s => (s - 500) * R.CITY.S;
  const pv = { x: 0, z: 0, px: 0, pz: 0 };
  const moveTo = (g, V, tx, tz, sp, dt) => {
    // 照路走（之前被房子卡住過）
    if (V.path) { const q = V.path[V.pi]; if (q && Math.hypot(q[0] - g.x, q[1] - g.z) < 1.4) V.pi++; if (V.pi < V.path.length) { tx = V.path[V.pi][0]; tz = V.path[V.pi][1]; } else V.path = null; }
    const dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
    if (d < 0.3) { R.animHero(g.h, 0, dt, false); return d; }
    const st = Math.min(d, sp * dt), ox = g.x, oz = g.z;
    g.x += dx / d * st; g.z += dz / d * st; const o = { x: g.x, z: g.z }; R.collide(o, 0.35); g.x = o.x; g.z = o.z;
    const moved = Math.hypot(g.x - ox, g.z - oz);
    V.stuck = moved < st * 0.35 ? (V.stuck || 0) + dt : Math.max(0, (V.stuck || 0) - dt);
    if (V.stuck > 0.4 && !V.path && R.navPath) { V.stuck = 0; const p = R.navPath(toS(g.x), toS(g.z), toS(V.gx), toS(V.gz)); if (p && p.length > 1) { V.path = p.map(([a, b]) => [toW(a), toW(b)]); V.pi = 0; } }
    g.rot = Math.atan2(dx, dz); g.h.g.position.set(g.x, 0, g.z); g.h.g.rotation.y = g.rot; R.animHero(g.h, sp, dt, false);
    return d;
  };
  R.guardMove = (g, P, sees, dt) => {
    if (g.box) g.box.on = false;
    const V = g.vg || (g.vg = { mode: 'chase', home: g.patrol ? null : [g.x, g.z, g.rot] });
    const heat = Math.max(1, C.heat), run = Math.max(6.2, playerRun() * (0.93 + 0.06 * heat));
    if (sees) { V.mode = 'chase'; V.path = null; g.lastX = P.x; g.lastZ = P.z; R.vigSpotted = true; }
    if (V.mode === 'chase') {
      V.gx = g.lastX; V.gz = g.lastZ;
      const d = moveTo(g, V, g.lastX, g.lastZ, run, dt);
      // 跑到最後看到你的地方還是沒看到：往你剛剛跑的方向找
      if (!sees && d < 0.8 && !V.path) { const k = Math.min(6, Math.hypot(pv.x, pv.z) * 0.8), a = Math.atan2(pv.x, pv.z); V.mode = 'search'; V.sx = g.x + (k > 0.5 ? Math.sin(a) * k : 0); V.sz = g.z + (k > 0.5 ? Math.cos(a) * k : 0); V.t = 0; V.gx = V.sx; V.gz = V.sz; }
    } else {
      V.t = (V.t || 0) + dt;
      const d = moveTo(g, V, V.gx, V.gz, run * 0.62, dt);
      if (d < 0.8 || V.retarget <= 0) { const r = Math.min(14, 4 + V.t * 0.5), a = rnd() * 6.28; V.gx = V.sx + Math.sin(a) * r * rnd(); V.gz = V.sz + Math.cos(a) * r * rnd(); V.retarget = 3; V.path = null; }
      V.retarget = (V.retarget == null ? 3 : V.retarget) - dt;
    }
  };
  // 通知附近的衛兵：你在 (x, z)
  R.alertGuards = (x, z, radius) => {
    const tw = W().town; if (!tw || C.heat <= 0) return;
    C.lostT = 0;
    (tw.watchers || []).forEach(g => { if (!g.watch || !g.watch.guard || g.off) return; if (Math.hypot(g.x - x, g.z - z) > radius) return; g.chase = true; g.lastX = x; g.lastZ = z; if (g.vg) { g.vg.mode = 'chase'; g.vg.path = null; } });
  };
  // 增援：從衛兵詰所、崗亭、城門派人來
  const spawnGuard = (tw, P) => {
    const C2 = R.CITY, F = C2.FAC, posts = [F.guardHQ, F.koban].filter(Boolean).map(([sx, sy]) => [toW(sx), toW(sy)]).concat((tw.watchers || []).filter(g => g.guard && g.vg && g.vg.home).map(g => [g.vg.home[0], g.vg.home[1]]));
    const far = posts.filter(p => Math.hypot(p[0] - P.x, p[1] - P.z) > 22).sort((a, b) => Math.hypot(a[0] - P.x, a[1] - P.z) - Math.hypot(b[0] - P.x, b[1] - P.z));
    const p = far[0]; if (!p) return;
    const h = R.makeHero('knight', 'spear', { top: '#3E4A5A', hair: '#2A2420', cloak: '#2E3A48', shield: true, weapon: 'spear' });
    h.g.position.set(p[0], 0, p[1]); tw.group.add(h.g);
    const n = { h, x: p[0], z: p[1], rot: 0, name: '東鶴的衛兵', guard: true, extra: true, watch: { range: 13, fov: 1.2, guard: 1 }, chase: true, lastX: P.x, lastZ: P.z };
    tw.npcs.push(n); tw.watchers.push(n);
  };
  // 追完了：衛兵走回崗位；增援的人走掉
  const goHome = (tw, P, dt) => {
    for (let i = tw.npcs.length - 1; i >= 0; i--) {
      const g = tw.npcs[i], V = g.vg; if (!V || g.chase) continue;
      if (g.extra) {
        V.away = (V.away || 0) + dt;
        if (V.away > 18 || Math.hypot(g.x - P.x, g.z - P.z) > 45) { g.h.g.visible = false; g.off = true; tw.npcs.splice(i, 1); const k = tw.watchers.indexOf(g); if (k >= 0) tw.watchers.splice(k, 1); continue; }
        if (!V.leave) { const a = Math.atan2(g.x - P.x, g.z - P.z); V.leave = [g.x + Math.sin(a) * 40, g.z + Math.cos(a) * 40]; V.gx = V.leave[0]; V.gz = V.leave[1]; }
        moveTo(g, V, V.leave[0], V.leave[1], 2.6, dt); g.rot = g.h.g.rotation.y; continue;
      }
      if (!V.home) { g.vg = null; continue; }
      V.gx = V.home[0]; V.gz = V.home[1];
      const d = moveTo(g, V, V.home[0], V.home[1], 2.6, dt);
      if (d < 0.4) { g.x = V.home[0]; g.z = V.home[1]; g.rot = V.home[2]; g.h.g.position.set(g.x, 0, g.z); g.h.g.rotation.y = g.rot; if (g.box) g.box.on = true; g.vg = null; }
    }
  };
  // 警戒高：進城時多幾隊巡邏（沿著路走來回）
  const addPatrols = tw => {
    const n0 = Math.min(4, Math.floor((level() - 2) / 2)); if (n0 <= 0) return;
    const C2 = R.CITY, busy = C2.nodes.map((p, i) => i).filter(i => { const [sx, sy] = C2.nodes[i]; return sy > 300 && sy < 800 && sx > 380 && sx < 860; });
    for (let k = 0; k < n0; k++) {
      let ni = pick(busy), prev = -1; const pts = [];
      for (let s = 0; s < 7; s++) { const [sx, sy] = C2.nodes[ni]; pts.push([toW(sx), toW(sy)]); const nb = (C2.adj[ni] || []).filter(j => j !== prev); if (!nb.length) break; prev = ni; ni = pick(nb); }
      if (pts.length < 3) continue;
      const route = pts.concat(pts.slice(1, -1).reverse());
      const h = R.makeHero('knight', 'spear', { top: '#3E4A5A', hair: '#2A2420', cloak: '#2E3A48', shield: true, weapon: 'spear' });
      h.g.position.set(route[0][0], 0, route[0][1]); tw.group.add(h.g);
      const n = { h, x: route[0][0], z: route[0][1], rot: 0, name: '巡邏的衛兵', guard: true, walk: true, patrol: route, pi: 0, tx: route[0][0], tz: route[0][1], speed: 2.2, watch: { range: 12, fov: 1.1, guard: 1 } };
      tw.npcs.push(n); tw.watchers.push(n);
    }
  };

  // ---------- 和路人說話 ----------
  const behind = (n, P) => Math.abs(wrap(Math.atan2(P.x - n.x, P.z - n.z) - (n.h ? n.h.g.rotation.y : n.rot))) > 1.9;
  const ROLES = ['上班族', '學生', '店員', '工人', '老人家', '主婦', '路人'];
  const chat = n => {
    const S = R.S, P = W().P, w = level(), E = R.eventsToday ? R.eventsToday() : {}, h = R.hourNow ? ((R.hourNow() % 24) + 24) % 24 : 12, xeno = R.xenoLevel ? R.xenoLevel() : 0;
    const rc = n.h && n.h.opt && n.h.opt.race && R.RACES && R.RACES[n.h.opt.race], who = n.role || (n.role = (rc ? rc.name + '的' : '') + pick(ROLES));
    const flee = () => { n.flee = 2.5; const a = Math.atan2(n.x - P.x, n.z - P.z); n.tx = n.x + Math.sin(a) * 8; n.tz = n.z + Math.cos(a) * 8; };
    if (C.heat > 0) { R.townTalk(who, ['「……衛兵！衛兵！小偷在這裡！」', '（對方一邊喊一邊往後退。）']); R.alertGuards(P.x, P.z, 40 + 10 * C.heat); flee(); return; }
    if (n.picked === S.day) { R.townTalk(who, [pick(['「我的錢包不見了……你剛剛有沒有看到可疑的人？」', '「錢包……剛剛明明還在的。這附近有扒手嗎？」'])]); return; }
    if (recognized()) { R.townTalk(who, [pick(['「……你不是前幾天被衛兵押走的那個人嗎？」', '「我記得你的臉。衛兵押著你走過西市口。」']), '（對方把錢包換到另一邊的口袋，快步走開了。）']); flee(); return; }
    if (xeno >= 3) { R.townTalk(who, ['（對方看到你，臉色一變，加快腳步走開了。）']); flee(); return; }
    const daily = ['「今天也好冷。早上水管又凍住了。」', '「站前的德克斯凡百貨在打折，頂樓的摩天輪排了好長的隊。」', '「聽說北山那邊又開了新的遺跡入口。勇者真辛苦。」', '「魔導電車今天又誤點了。」', '「松之湯的老闆說，泡完一定要喝冰牛奶。」', '「公會門口的告示板，今天貼了好多張委託。」', '「柏青哥『銀河』昨天有人連開了三次大當，整條街都聽到了。」', '「我家的貓又跑出去了。你有沒有看到一隻三花的？」'];
    if (E.blizzard || /雪/.test(E.weather || '')) daily.push('「這種天氣還要出門，真是的。」', '「下這麼大的雪，鏟都鏟不完。」');
    if (/雨/.test(E.weather || '')) daily.push('「冬天下雨最討厭了，路上全是冰。」');
    if (h >= 20 || h < 5) daily.push('「這麼晚了，還不回家？」', '「晚上的西市口不太安全，小心點。」');
    if (h >= 6 && h < 9) daily.push('「要遲到了、要遲到了——」', '「早安。今天的瓦版看了沒？」');
    const rumor = w < 1 ? [] : w < 4 ? ['「最近西市口好像有小偷，錢包要收好。」', '「隔壁的雜貨店說，門口的箱子被人撬開了。」', '「我現在出門都把錢包放在前面的口袋。」']
      : w < 7 ? ['「衛兵加派了巡邏，聽說是因為竊案。」', '「聽說小偷是個勇者。公會不管管嗎？」', '「店家都在說，要多盯著客人的手。」', '（對方上下打量了你一下，把包包抱緊了。）']
      : ['「公會的告示板上貼了竊盜的告示……畫得有點像你。」', '「這陣子的小偷，聽說連衛兵都追不上。縣廳要派人來了。」', '（對方看了你一眼，往旁邊讓開，跟你保持距離。）', '「……離我遠一點。」'];
    const line = rumor.length && rnd() < Math.min(0.85, 0.35 + w * 0.06) ? pick(rumor) : pick(daily);
    R.townTalk(who, [line]);
  };
  // 衛兵、店家說的話：照警戒加一句
  const tt = R.townTalk;
  R.townTalk = (who, lines) => {
    const w = level();
    if (/衛兵/.test(who) && C.heat <= 0) {
      if (recognized()) lines = ['「……我記得你的臉。前幾天才押過你。」', '「最好別讓我再看到你在店門口晃。」'];
      else if (w >= 3) lines = [pick(['「最近竊案變多了，我們加派了人手。」', '「西市口的店家天天來報案。你有看到可疑的人就說。」'])].concat(lines);
    } else if (/婆婆|店|攤|掌櫃|老闆|商|堂/.test(who) && w >= 4 && rnd() < 0.6) lines = [pick(['（店主的眼睛一直跟著你的手。）', '（櫃台上的東西被收到了後面。）', '（店員站到了你和貨架中間。）'])].concat(lines);
    tt(who, lines);
  };

  // ---------- 接上城裡 ----------
  const etn = R.enterTownNow;
  R.enterTownNow = (from, at) => {
    etn(from, at);
    const tw = W().town, P = W().P; if (!tw) return;
    lastHeat = C.heat; R.vigSpotted = false;
    addPatrols(tw);
    tw.npcs.forEach(n => { if (n.walk && !n.patrol && !n.guard && !n.name && !n.person) tw.inter.push({ get x() { return n.x; }, get z() { return n.z; }, r: 1.4, label: '和路人說話', when: () => !n.off && n.h.g.visible && !behind(n, W().P) && !(n.flee > 0), act: () => chat(n) }); });
    if (P) { pv.px = P.x; pv.pz = P.z; }
  };
  const ts = R.townStep;
  R.townStep = dt => {
    updateK();
    ts(dt);
    const w0 = W(), tw = w0.town, P = w0.P, S = R.S; if (!tw || !P || !S || w0.inside) return;
    // 偷到了、扒到了、被看見了：街坊的警戒往上
    const wv = wary(), st = (S.stats && S.stats.stolen) || 0, pk = (S.stats && S.stats.picked) || 0;
    if (st > wv.stolen) { bump((st - wv.stolen) * 1); wv.stolen = st; }
    if (pk > wv.picked) { bump((pk - wv.picked) * 0.7); wv.picked = pk; }
    if (C.heat > lastHeat) bump(1.2);
    lastHeat = C.heat;
    // 你跑的方向（衛兵找人用）
    if (dt > 0) { pv.x = pv.x * 0.8 + (P.x - pv.px) / dt * 0.2; pv.z = pv.z * 0.8 + (P.z - pv.pz) / dt * 0.2; } pv.px = P.x; pv.pz = P.z;
    // 衛兵的眼睛：通緝中看得更遠、更寬
    (tw.watchers || []).forEach(g => { if (!g.watch || !g.watch.guard) return; if (g.watch.r0 == null) { g.watch.r0 = g.watch.range; g.watch.f0 = g.watch.fov; } g.watch.range = g.watch.r0 * (C.heat > 0 ? 1.3 : 1); g.watch.fov = g.watch.f0 * (C.heat > 0 ? 1.5 : 1); });
    if (C.heat > 0) {
      // 哨音：有人看到你，附近的衛兵一起過來（每 0.8 秒一次）
      radioT -= dt;
      if (R.vigSpotted && radioT <= 0) { radioT = 0.8; R.alertGuards(P.x, P.z, 30 + 15 * C.heat); }
      R.vigSpotted = false;
      // 路人看到你：大喊
      civT -= dt;
      if (civT <= 0) for (const n of tw.watchers) { if (!n.watch || n.watch.guard || n.off || n.flee > 0) continue; if (Math.abs(n.x - P.x) > 12 || Math.abs(n.z - P.z) > 12) continue; if ((R.crimeSees ? R.crimeSees(n, P) : 0) > 0.35) { civT = 5; R.toast('路人指著你大喊：「小偷在這裡！」'); R.alertGuards(P.x, P.z, 35 + 10 * C.heat); n.flee = 2; break; } }
      // 兩顆星以上：從詰所派人
      reinfT -= dt;
      const extras = tw.npcs.filter(n => n.extra && !n.off).length;
      if (C.heat >= 2 && extras < Math.min(4, 2 * (C.heat - 1)) && reinfT <= 0) { reinfT = 6; spawnGuard(tw, P); if (extras === 0) R.toast('遠處響起哨音——衛兵詰所派人來了。'); }
    } else goHome(tw, P, dt);
  };
  // 狀態列：街坊警戒
  const ch = R.crimeHud;
  if (ch) R.crimeHud = () => { const w = level(), s = ch(); return s + (w >= 2 ? '<span class="seen" title="偷得越多，大家越提防你；每過一天會退一點">街坊警戒 <b>' + '●'.repeat(Math.min(5, Math.ceil(w / 2.4))) + '○'.repeat(5 - Math.min(5, Math.ceil(w / 2.4))) + '</b></span>' : ''); };
  updateK();
})(window.R);
