// 討伐令 1433：隊友（在公會邀請同行的勇者、城裡認識的人，一起下遺跡）
// 最多兩個人同行。隊友會跟著你、照自己的職業打：近戰的衝上去、遠程的保持距離、牧師會補血、騎士會挑釁。
// 可以指揮（C 鍵或「指揮」按鈕）：跟隨、集火（打你瞄準的那隻）、待命（守在原地）、自由行動、撤退（全部回到你身邊）。
// 隊友倒下時，靠近按空白鍵扶起來；沒扶起來就換樓層的話，巡查隊會把人帶回地面。
// 設定：「寶箱的自動刷新，會因為周圍人數越多而刷新越慢」——人越多，寶箱刷新越慢。
(function (R) {
  const T = () => THREE;
  const W = R.W;
  const $ = id => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const LINES = ['「別走太快，我會跟上。」', '「寶箱我不搶，核心也不碰。」', '「上次在城西遺跡差點回不來……這次拜託了。」', '「我顧後面，你顧前面。」', '「報酬照公會的規矩分就好。」', '「佩特拉的注意升太高的話，我們就撤。」', '「尾隨犬的群首，我想親眼看看。」', '「別擔心，倒下了我會喊你。」',
    '「我剛從大陸過來，東鶴的路還不熟。」', '「錢要先講清楚。……好，公會的規矩，我接受。」', '「我在找一把會說話的刀。你沒見過吧？」', '「上一個隊伍解散了。人還活著，只是不想下去了。」', '「遺跡裡的東西，我只帶得出來的。」', '「我老家的人都說我太愛冒險。」', '「打完了請我吃一串糰子就好。」', '「牆上的眼睛一張開，我就會很緊張。」'];
  const TOPS = ['#3E4E62', '#4A6A3E', '#7A3E30', '#4A3E7A', '#E6DEC6', '#2E2E38', '#8A96A3', '#6E5A44', '#2F4A6E', '#5A3A5A', '#8A6A3A', '#3A5A5A'];
  R.PARTY_MAX = 2;
  R.PARTY_SHARE = 0.15;   // 每個隊友分走的委託報酬

  // ---------- 公會大廳裡的勇者（各種種族、各國來的人） ----------
  R.makeRecruit = () => {
    const S = R.S, lv0 = S ? S.classes[S.cls].lv : 1, cls = pick(R.CLASS_IDS), race = R.randomRace ? R.randomRace() : 'human', rc = R.RACES ? R.RACES[race] : null;
    const lv = Math.max(1, Math.min(20, lv0 + Math.floor(rnd(-2, 2))));
    const m = { id: 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), name: R.randomName ? R.randomName(race) : '勇者', race, cls, lv, fee: 40 + lv * 25, line: pick(LINES),
      look: { top: pick(TOPS), cloak: pick(TOPS), hair: rc && rc.hairs ? pick(rc.hairs) : pick(['#2A2420', '#6A4A2E', '#1A1714', '#8A5A2E', '#C99B55', '#D8D2C4']), skin: rc ? pick(rc.skins) : undefined, race, hs: pick(['short', 'long', 'ponytail', 'bun', 'spiky', 'bob', 'braid', 'crop']), acc: Math.random() < 0.3 ? pick(['scarf', 'glasses', 'headband', 'earring']) : null, accCol: pick(['#C8323A', '#2E5A8A', '#3E7A48', '#C9A13A']) } };
    // 東鶴排外：魔族不太有人肯同行；其他種族偶爾也有人只跟同族的走
    const x = R.xenoLevel ? R.xenoLevel() : 0;
    if (x >= 3) { if (Math.random() < 0.75) { m.refuse = true; m.line = pick(['「……抱歉。我不跟魔族一起下遺跡。」', '（對方看了你的角一眼，轉身走了。）', '「公會說你是受監視對象。……我不想惹麻煩。」']); } else { m.fee *= 2; m.line = '「我不在乎你是什麼。錢給夠就好。」'; } }
    else if (x === 2 && Math.random() < 0.15) { m.refuse = true; m.line = '「……我習慣跟同鄉的人一起。」'; }
    return m;
  };
  R.ensureRoster = force => { const S = R.S; if (!S) return; S.party = S.party || []; if (force || !S.roster || S.roster.length < 3 || S.roster.some(m => !m.look)) S.roster = [0, 1, 2, 3].map(() => R.makeRecruit()); };
  R.hire = i => { const S = R.S, m = S.roster[i]; if (!m || m.refuse || S.party.length >= R.PARTY_MAX || S.gold < m.fee) return false; S.gold -= m.fee; S.party.push(m); S.roster.splice(i, 1); R.save(); return true; };
  R.dismiss = i => { const S = R.S; S.party.splice(i, 1); R.save(); };

  // ---------- 隊友的數值 ----------
  const weaponOf = m => (m.weapon && R.WEAPONS[m.weapon] && R.WEAPONS[m.weapon].cls.includes(m.cls) ? m.weapon : R.STARTER[m.cls]);
  R.allyStats = m => {
    const c = R.CLASSES[m.cls], base = weaponOf(m), w = R.WEAPONS[base], lv = m.lv;
    return { base, kind: w.kind, hpMax: Math.round(c.hp * (1 + 0.035 * (lv - 1)) * 1.1), dmg: w.dmg * (1 + 0.1 * Math.min(lv, 10) + 0.03 * Math.max(0, lv - 10)) * 0.85 * (w.hits || 1), rate: w.rate * 0.75, range: w.range, pellets: w.pellets || 1, speed: c.speed * 0.95,
      def: m.cls === 'knight' ? 9 : m.cls === 'warrior' ? 6 : 3 };
  };
  const bodyOf = cls => ({ body: { base: cls === 'knight' ? 'body_heavy' : cls === 'warrior' ? 'body_medium' : 'body_light' }, feet: { base: 'feet_medium' } });
  const makeModel = m => {
    const TH = T(), base = weaponOf(m), h = R.makeHero(m.cls, base, Object.assign({ weapon: base, shield: !!R.CLASSES[m.cls].shield }, m.look || {})); R.dressHero(h, bodyOf(m.cls));
    const ring = new TH.Mesh(new TH.TorusGeometry(0.55, 0.05, 4, 20), new TH.MeshBasicMaterial({ color: m.story ? '#FFB0C8' : '#7FC8FF' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; h.g.add(ring);
    return h;
  };
  R.allyModel = makeModel;

  // ---------- 下遺跡：每一層開始時跟在你旁邊 ----------
  // 劇情人物有自己的事（受傷、任務、只去哈米莉亞級）：那一趟不來
  R.startParty = run => {
    const out = [];
    (R.S.party || []).forEach(m => { const ok = R.partyAvailable ? R.partyAvailable(m, run.site) : true; if (ok === true) out.push({ m, hpFrac: 1, gone: false }); else R.toast(ok); });
    run.party = out; run.order = { mode: 'follow' };
  };
  R.spawnAllies = () => {
    const run = W.run, P = W.P; W.allies = [];
    (run.party || []).forEach((pm, i) => {
      if (pm.gone) return;
      const st = R.allyStats(pm.m), h = makeModel(pm.m), [x, z] = R.nearestFloor(P.x + (i ? 1.6 : -1.6), P.z + 1.4);
      const a = { pm, m: pm.m, name: pm.m.name, cls: pm.m.cls, st, h, x, z, hp: st.hpMax * pm.hpFrac, hpMax: st.hpMax, cd: 0.5, skillCd: 3 + Math.random() * 3, iframe: 0, ally: true, stumble: 0, invis: 0, buff: {}, dead: false, air: 0, downed: false, taunt: 0, stuckT: 0, yaw: Math.PI };
      h.g.position.set(x, 0, z); W.scene.add(h.g); W.allies.push(a);
    });
  };
  // 換樓層前：記下血量；倒下沒扶起來的人，巡查隊會帶回地面；臨時的隊友（別的隊伍）分走東西離開
  R.stashAllies = () => {
    if (R.rivalsLeave) R.rivalsLeave();
    (W.allies || []).forEach(a => { if (a.rival) return; a.pm.hpFrac = Math.max(0.2, a.hp / a.hpMax); if (a.downed) { a.pm.gone = true; R.toast(a.name + '被留在這一層了，巡查隊會把人帶回地面。'); } });
    W.allies = [];
  };
  R.alliesUp = () => (W.allies || []).filter(a => !a.downed);

  // ---------- 敵人挑誰打：最近的人；有騎士在挑釁的話先打騎士 ----------
  R.pickTarget = e => {
    const P = W.P, list = [];
    if (P && !P.dead) list.push(P);
    (W.allies || []).forEach(a => { if (!a.downed) list.push(a); });
    const taunt = list.find(o => o.taunt > 0 && Math.hypot(o.x - e.x, o.z - e.z) < 9);
    if (taunt) return taunt;
    let best = P, bd = 1e9;
    list.forEach(o => { const d = Math.hypot(o.x - e.x, o.z - e.z) * (o === P ? 0.9 : 1); if (d < bd) { bd = d; best = o; } });
    return best;
  };
  // 隊友被打
  R.hurtAlly = (a, raw, src) => {
    if (!a || a.downed || a.iframe > 0) return;
    const dmg = Math.round(raw * (1 - a.st.def / (a.st.def + 30)));
    if (dmg <= 0) return;
    a.hp -= dmg; a.iframe = 0.35; R.num(a.x, 2.2, a.z, dmg, 'hurt');
    if (a.hp <= 0) { a.hp = 0; a.downed = true; a.taunt = 0; R.setDown(a.h, true); R.toast(a.name + '倒下了！靠近按空白鍵扶起來'); }
  };
  // 隊友（或別的隊伍）打到遺跡生物（不吃你的加成）；by：誰打的（別的隊伍打倒的，經驗不算你的）
  R.allyHit = (e, dmg, by) => {
    if (!e || e.dead || e.invuln || e.under) return;
    let d = dmg * (e.def.armor ? 1 - e.def.armor : 1); const crit = Math.random() < 0.08; if (crit) d *= 1.6;
    d = Math.max(1, Math.round(d)); e.hp -= d; e.flash = 0.12; e.aggro = true; e.provoked = true;
    if (e.dormant && R.wakeRoom) R.wakeRoom(e.room, e);
    R.num(e.x, 1.8 * e.def.size + 0.6, e.z, d, crit ? 'crit ally' : 'ally');
    if (e.hp <= 0) R.killEnemy(e, by);
  };
  // 扶起倒下的隊友：站在旁邊 1.5 秒
  R.startRevive = a => { W.P.revive = { a, t: 0 }; R.toast('扶起' + a.name + '……'); };

  // ---------- 指揮 ----------
  const ORDERS = [['follow', '跟隨', '跟在身邊，打靠近你的'], ['focus', '集火', '一起打你瞄準的那隻'], ['hold', '待命', '守在現在的位置'], ['free', '自由', '自己去打看得到的'], ['retreat', '撤退', '不打了，全部回到你身邊']];
  R.ORDERS = ORDERS;
  let menuOpen = false;
  R.orderOpen = () => menuOpen;
  R.orderMenu = () => {
    if (!W.run || !(W.allies || []).length) { R.toast('沒有隊友可以指揮。'); return; }
    menuOpen = !menuOpen; const el = $('r-orders'); el.hidden = !menuOpen;
    if (menuOpen) el.innerHTML = '<b>指揮隊友</b>' + ORDERS.map(([k, n, d], i) => '<button type="button" class="ord' + (W.run.order.mode === k ? ' on' : '') + '" data-ord="' + k + '"><kbd>' + (i + 1) + '</kbd>' + n + '<small>' + d + '</small></button>').join('');
    el.querySelectorAll('[data-ord]').forEach(b => { b.onclick = () => R.setOrder(b.dataset.ord); });
  };
  R.pickOrder = i => { const o = ORDERS[i - 1]; if (o) R.setOrder(o[0]); };
  R.setOrder = mode => {
    const run = W.run, P = W.P; if (!run) return;
    const o = { mode };
    if (mode === 'focus') { const ax = P.aimX != null ? P.aimX : P.x, az = P.aimZ != null ? P.aimZ : P.z; let best = null, bd = 12; W.enemies.forEach(e => { if (e.dead || e.under) return; const d = Math.hypot(e.x - ax, e.z - az); if (d < bd) { bd = d; best = e; } }); if (!best) best = R.nearestEnemy(P.x, P.z, 14); if (!best) { R.toast('附近沒有目標。'); return; } o.tg = best; R.fx('ring', best.x, 0.1, best.z, { r: 1.4, color: '#FF3A3A' }); }
    if (mode === 'hold') (W.allies || []).forEach(a => { a.holdX = a.x; a.holdZ = a.z; });
    run.order = o; menuOpen = false; $('r-orders').hidden = true;
    const n = ORDERS.find(v => v[0] === mode)[1];
    R.toast('指揮：' + n + (mode === 'focus' ? '（' + o.tg.def.name + '）' : ''));
    (W.allies || []).forEach(a => { if (!a.downed && Math.random() < 0.6) R.num(a.x, 2.6, a.z, { follow: '收到', focus: '了解！', hold: '守住', free: '交給我', retreat: '撤！' }[mode], 'heal'); });
  };

  // ---------- 隊友的行動 ----------
  const shotKind = { gun: 'bullet', bow: 'arrow', magic: 'orb' };
  R.updateAllies = dt => {
    const P = W.P, run = W.run; if (!W.allies || !W.allies.length) return;
    const ord = (run && run.order) || { mode: 'follow' };
    if (ord.mode === 'focus' && (!ord.tg || ord.tg.dead)) { run.order = { mode: 'follow' }; R.toast('目標倒下了。隊友回到「跟隨」。'); }
    if (ord.mode === 'focus' && ord.tg && !ord.tg.dead) { ord.mt = (ord.mt || 0) - dt; if (ord.mt <= 0) { ord.mt = 1; R.fx('ring', ord.tg.x, 0.1, ord.tg.z, { r: 1.2 + ord.tg.def.size * 0.4, color: '#FF3A3A' }); } }
    // 扶人
    if (P.revive) { const rv = P.revive; if (!rv.a.downed || Math.hypot(rv.a.x - P.x, rv.a.z - P.z) > 2.2 || P.dead) P.revive = null; else { rv.t += dt; if (rv.t >= 1.5) { rv.a.downed = false; rv.a.hp = rv.a.hpMax * 0.35; R.setDown(rv.a.h, false); R.toast(rv.a.name + '站起來了'); P.revive = null; } } }
    W.allies.forEach((a, idx) => {
      a.iframe = Math.max(0, a.iframe - dt); a.cd -= dt; a.skillCd -= dt; a.taunt = Math.max(0, a.taunt - dt);
      if (a.downed) return;
      const dp = Math.hypot(P.x - a.x, P.z - a.z), melee = a.st.kind === 'melee' || a.st.kind === 'thrust', mode = (run.order || ord).mode;
      let tg = null;
      if (mode === 'focus' && run.order.tg && !run.order.tg.dead) tg = run.order.tg;
      else if (mode === 'hold') tg = R.nearestEnemy(a.x, a.z, melee ? 3.6 : 12);
      else if (mode === 'free') tg = !P.dead ? R.nearestEnemy(a.x, a.z, 16) : null;
      else if (mode === 'follow') { tg = !P.dead && dp < 18 ? R.nearestEnemy(a.x, a.z, 14) : null; if (tg && Math.hypot(tg.x - P.x, tg.z - P.z) > 11) tg = null; }
      let mx = 0, mz = 0, face = null;
      if (tg) {
        const d = Math.hypot(tg.x - a.x, tg.z - a.z), ang = Math.atan2(tg.x - a.x, tg.z - a.z), want = melee ? Math.max(1.2, a.st.range * 0.75) : 7;
        face = ang;
        if (d > want + tg.def.size * 0.4) { mx = Math.sin(ang); mz = Math.cos(ang); } else if (!melee && d < want - 2.5) { mx = -Math.sin(ang); mz = -Math.cos(ang); }
        if (mode === 'hold') { const hd = Math.hypot(a.holdX - (a.x + mx), a.holdZ - (a.z + mz)); if (hd > 1.6) { mx = 0; mz = 0; } }
        if (a.cd <= 0 && d < (melee ? a.st.range + tg.def.size * 0.6 : 13)) {
          a.cd = 1 / a.st.rate;
          if (melee) { a.h.swing = 0.25; R.fx('swing', a.x, 1.1, a.z, { a: ang, range: a.st.range, arc: 1.7, color: '#BFE8FF' }); W.enemies.forEach(e => { if (e.dead) return; const dd = Math.hypot(e.x - a.x, e.z - a.z), da = Math.abs(Math.atan2(Math.sin(Math.atan2(e.x - a.x, e.z - a.z) - ang), Math.cos(Math.atan2(e.x - a.x, e.z - a.z) - ang))); if (dd < a.st.range + e.def.size * 0.5 && da < 1) R.allyHit(e, a.st.dmg, a); }); }
          else { a.h.recoil = 1; for (let i = 0; i < a.st.pellets; i++) R.fire({ kind: a.st.base === 'holystaff' ? 'holy' : shotKind[a.st.kind] || 'bullet', owner: 'p', ally: true, by: a, x: a.x, z: a.z, a: ang + (a.st.pellets > 1 ? (i - (a.st.pellets - 1) / 2) * 0.12 : (Math.random() - 0.5) * 0.06), speed: 20, dmg: a.st.dmg, life: 0.8 }); }
        }
      } else if (mode === 'hold') {
        const hd = Math.hypot(a.holdX - a.x, a.holdZ - a.z); if (hd > 0.5) { mx = (a.holdX - a.x) / hd; mz = (a.holdZ - a.z) / hd; }
      } else if (dp > (mode === 'retreat' ? 1.4 : 2.2)) {
        // 沒有敵人（或撤退）：跟在你身後（兩個人分左右）
        const r2 = mode === 'retreat' ? 1.6 : 2.4, slot = (P.yaw || 0) + Math.PI + (idx ? 0.75 : -0.75), sx = P.x + Math.sin(slot) * r2, sz = P.z + Math.cos(slot) * r2, ds = Math.hypot(sx - a.x, sz - a.z);
        if (ds > 0.5) { mx = (sx - a.x) / ds; mz = (sz - a.z) / ds; if (ds < 1.4) { mx *= 0.5; mz *= 0.5; } }
      }
      // 職業的技能（撤退的時候不用）
      if (a.skillCd <= 0 && mode !== 'retreat') {
        const near = W.enemies.filter(e => !e.dead && Math.hypot(e.x - a.x, e.z - a.z) < 4);
        if (a.cls === 'priest') { const hurt = [P, ...R.alliesUp()].filter(o => !o.dead && o.hp / o.hpMax < 0.6).sort((p, q) => p.hp / p.hpMax - q.hp / q.hpMax)[0]; if (hurt) { a.skillCd = 8; const v = hurt.hpMax * 0.22; if (hurt === P) R.healP(v); else { hurt.hp = Math.min(hurt.hpMax, hurt.hp + v); R.num(hurt.x, 2.2, hurt.z, '+' + Math.round(v), 'heal'); } R.fx('ring', hurt.x, 0.1, hurt.z, { r: 1.6, color: '#FFE8A0' }); } }
        else if (a.cls === 'knight' && near.length) { a.skillCd = 12; a.taunt = 4; R.fx('ring', a.x, 0.1, a.z, { r: 4, color: '#C9A13A' }); R.toast(a.name + '：「往這裡來！」'); }
        else if (a.cls === 'warrior' && near.length >= 2) { a.skillCd = 9; R.fx('ring', a.x, 0.1, a.z, { r: 3, color: '#FF8A6A' }); near.forEach(e => R.allyHit(e, a.st.dmg * 1.6, a)); }
        else if (a.cls === 'mage' && tg) { a.skillCd = 10; const x = tg.x, z = tg.z, run0 = W.run; R.fx('mark', x, 0, z, { r: 2.6, t: 0.7 }); setTimeout(() => { if (W.run !== run0) return; R.fx('boom', x, 0.6, z, { r: 2.6, color: '#FF7A3A' }); W.enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < 2.6 + e.def.size * 0.4) R.allyHit(e, a.st.dmg * 2.4, a); }); }, 700); }
        else if ((a.cls === 'archer' || a.cls === 'gunner') && tg) { a.skillCd = 8; const ang = Math.atan2(tg.x - a.x, tg.z - a.z); for (let i = -2; i <= 2; i++) R.fire({ kind: a.cls === 'archer' ? 'arrow' : 'bullet', owner: 'p', ally: true, by: a, x: a.x, z: a.z, a: ang + i * 0.12, speed: 22, dmg: a.st.dmg, life: 0.8 }); }
        else if (a.cls === 'blade' && tg) { a.skillCd = 7; const ang = Math.atan2(tg.x - a.x, tg.z - a.z); a.x += Math.sin(ang) * 3; a.z += Math.cos(ang) * 3; R.collide(a, 0.4); R.fx('slash', a.x, 1, a.z, { a: ang, len: 3 }); R.allyHit(tg, a.st.dmg * 2.2, a); }
        else a.skillCd = 1.5;
      }
      // 移動、卡住或走散時直接跟上
      const sp = a.st.speed * (dp > 9 || mode === 'retreat' ? 1.3 : 1), ox = a.x, oz = a.z;
      a.x += mx * sp * dt; a.z += mz * sp * dt; R.collide(a, 0.4);
      const moved = Math.hypot(a.x - ox, a.z - oz), trying = Math.hypot(mx, mz) > 0.3;
      a.stuckT = trying && moved < sp * dt * 0.25 ? a.stuckT + dt : 0;
      if (mode !== 'hold' && (dp > 22 || (a.stuckT > 1.4 && dp > 5))) { [a.x, a.z] = R.nearestFloor(P.x + rnd(-1.5, 1.5), P.z + rnd(0.8, 2)); a.stuckT = 0; R.fx('blink', a.x, 1, a.z); }
      if (face == null && trying) face = Math.atan2(mx, mz);
      if (face != null) a.yaw = face;
      a.h.g.position.set(a.x, 0, a.z); a.h.g.rotation.y = a.yaw;
      R.animHero(a.h, trying ? sp : 0, dt, !!tg && !melee);
    });
  };

  // ---------- 在東鶴：隊友跟在身邊走 ----------
  R.spawnTownAllies = () => {
    const tw = W.town, P = W.P; tw.allies = [];
    (R.S.party || []).forEach((m, i) => { const h = makeModel(m), a = { m, h, x: P.x + (i ? 1.5 : -1.5), z: P.z + 1.5, yaw: Math.PI }; h.g.position.set(a.x, 0, a.z); W.scene.add(h.g); tw.allies.push(a); });
  };
  R.townAllies = dt => {
    const tw = W.town, P = W.P; if (!tw || !tw.allies) return;
    tw.allies.forEach((a, idx) => {
      const slot = (P.yaw || 0) + Math.PI + (idx ? 0.75 : -0.75), sx = P.x + Math.sin(slot) * 2.2, sz = P.z + Math.cos(slot) * 2.2, ds = Math.hypot(sx - a.x, sz - a.z);
      let sp = 0;
      if (ds > 0.4) { sp = Math.min(P.speed * 1.8, ds * 2.5); const ang = Math.atan2(sx - a.x, sz - a.z); a.x += Math.sin(ang) * sp * dt; a.z += Math.cos(ang) * sp * dt; a.yaw = ang; R.collide(a, 0.4); }
      if (ds > 16) { a.x = sx; a.z = sz; }
      a.h.g.position.set(a.x, 0, a.z); a.h.g.rotation.y = a.yaw; R.animHero(a.h, sp, dt, false);
    });
  };

  // ---------- 狀態列：隊友的血量、現在的指揮 ----------
  R.partyHud = () => {
    const el = document.getElementById('r-party'); if (!el) return;
    const list = W.run ? (W.allies || []) : [];
    const gone = W.run ? (W.run.party || []).filter(pm => pm.gone) : [];
    el.hidden = !list.length && !gone.length;
    const ord = W.run && W.run.order ? ORDERS.find(v => v[0] === W.run.order.mode) : null;
    el.innerHTML = (list.length && ord ? '<div class="ordnow">指揮：<b>' + ord[1] + '</b><small>' + (R.touch ? '「指揮」按鈕' : 'C 鍵') + '換</small></div>' : '')
      + list.map(a => '<div class="pm' + (a.downed ? ' down' : '') + '"><span>' + R.esc(a.name) + (a.rival ? '（臨時）' : '') + '</span><small>' + R.esc(R.CLASSES[a.cls].name) + ' Lv ' + a.m.lv + '</small><div class="meter"><i style="width:' + Math.max(0, a.hp / a.hpMax * 100) + '%"></i></div>' + (a.downed ? '<b>倒下了</b>' : '') + '</div>').join('')
      + gone.map(pm => '<div class="pm down"><span>' + R.esc(pm.m.name) + '</span><small>被帶回地面了</small></div>').join('');
  };
})(window.R);
