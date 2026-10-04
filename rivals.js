// 討伐令 1433：遺跡裡的其他勇者
// 有時候同一層會有別的隊伍。走近了可以：一起行動（他們會分走這一層三成的素材，他們打倒的生物經驗也歸他們）、各走各的（他們會去開別的寶箱）、看他們的勇者證。
// 有的人是壞人：合作時等你殘血、或清完一間房你還沒回過氣，就從背後偷襲；拒絕了也可能一路跟著，等你虛弱的時候出手。
// 勇者證的號碼在公會的註銷名單上（HR-2819-7302 遺失、HR-2824-0517 持有人殉職、HR-2833-2208 停權）——那就是冒用的。
// 被私人委託騙進遺跡的，會遇到埋伏。魔族沒戴兜帽的話，私人賞金獵人會來找你（公會不受理針對智慧種的懸賞：這是非法的）。
(function (R) {
  const $ = id => document.getElementById(id);
  const esc = s => R.esc(s);
  const W = R.W;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const REVOKED = ['HR-2819-7302', 'HR-2824-0517', 'HR-2833-2208'];
  const RANKS = ['新人段・榮心階', '冒險段・青銅階', '冒險段・灰鐵階', '冒險段・白銀階', '討伐段・黑狼階'];
  const TOPS = ['#5A4A3A', '#3E5A6E', '#6A3A2E', '#4A5A3A', '#3A3A44', '#5A3A5A', '#7A6A4A'], HS = ['short', 'crop', 'spiky', 'long', 'ponytail', 'bob'];
  const RANGED = { gunner: 1, archer: 1, mage: 1, priest: 1 };

  // 段位照遺跡的分級（2026-10-04 回報：克森特級跑出新人段的勇者，而且證件是真的）——公會照段位發委託，能進這一級的才會在這裡
  const BAND = { 0: [[0, 1], [0, 2], [1, 0]], 1: [[0, 2], [1, 0], [1, 1], [1, 2]], 2: [[1, 2], [1, 3], [1, 4], [2, 0], [2, 1]], 3: [[2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [3, 0], [3, 1]], 4: [[3, 0], [3, 1], [3, 2], [3, 3], [4, 0]] };
  const rankFor = () => { const D = R.RANK_DANS, lv = W.run && W.run.grade ? W.run.grade.lv : 1, b = BAND[Math.max(0, Math.min(4, lv - 1))];   /* 分級的 lv：哈米莉亞 1 … 卡索 5 */ if (!D || !b) return pick(RANKS); const [d, t] = pick(b); return D[d].name + '・' + D[d].tiers[t]; };
  const claimFor = () => { const D = R.RANK_DANS, lv = W.run && W.run.grade ? W.run.grade.lv : 1; if (!D) return '討伐段・紅獅階'; const d = Math.min(4, Math.max(2, lv - 1)); return D[d].name + '・' + D[d].tiers[D[d].tiers.length - 1]; };   // 冒用的人自稱的段位：比這一級還高一點
  const member = (lv0, traitor) => {
    const race = R.randomRace(), rc = R.RACES[race], cls = pick(R.CLASS_IDS), revoked = traitor && Math.random() < 0.55, rank = rankFor();
    return { name: R.randomName(race), race, cls, lv: Math.max(1, lv0 + Math.floor(Math.random() * 4) - 1), rank, claim: traitor && !revoked && Math.random() < 0.5 ? claimFor() : rank,
      card: revoked ? pick(REVOKED) : 'HR-' + (2826 + Math.floor(Math.random() * 10)) + '-' + String(1000 + Math.floor(Math.random() * 8999)), revoked,
      look: { top: pick(TOPS), hair: rc.hairs ? pick(rc.hairs) : pick(['#2A2420', '#6A4A2E', '#1A1714', '#8A5A2E']), cloak: pick(TOPS), race, skin: pick(rc.skins), hs: pick(HS) } };
  };
  // 每一層開始時：這一層有沒有別的隊伍
  R.spawnRivals = () => {
    const run = W.run, F = W.F; W.rivalParty = null; W.rivals = [];
    if (!run || !F) return;
    const ambush = R.jobAmbush && run.floor >= 1 ? R.jobAmbush(run.site) : null;
    const hunted = R.isDemon && R.isDemon() && !(R.hoodOn && R.hoodOn());
    let mode = null;
    if (ambush) { mode = 'ambush'; ambush.sprung = true; }
    else if (hunted && run.floor >= 1 && Math.random() < 0.35) mode = 'hunter';
    else if (Math.random() < 0.22 + run.grade.lv * 0.04) mode = 'party';
    if (!mode) return;
    const rooms = F.rooms.filter((r, i) => i > 0 && r.type !== 'boss' && r.type !== 'lord' && !(r.type === 'deep' && r.nest)); if (!rooms.length) return;
    const room = rooms[Math.floor(Math.random() * rooms.length)], lv0 = R.S.classes[R.S.cls].lv;
    const traitor = mode !== 'party' || Math.random() < 0.28, n = mode === 'party' ? 1 + Math.floor(Math.random() * 3) : 2 + (Math.random() < 0.5 ? 1 : 0);
    const party = { mode, traitor, state: mode === 'party' ? 'neutral' : 'hostile', room, members: [], lootT: 18 + Math.random() * 14, stolen: {} };
    for (let i = 0; i < n; i++) party.members.push(member(lv0 + (mode === 'hunter' ? 2 : 0), traitor));
    W.rivalParty = party;
    party.members.forEach(m => { const [x, z] = R.roomPoint(room, { min: 2 }); if (party.state === 'hostile') hostile(m, x, z, room.i, mode === 'hunter'); else neutral(m, x, z, room.i); });
    if (mode === 'ambush') R.banner('這一層有人在等你', '私人委託是陷阱');
  };
  // 不是敵人：在自己的房間附近打遺跡生物、去開別的寶箱
  const neutral = (m, x, z, room) => {
    const st = R.allyStats(m), h = R.makeHero(m.cls, R.STARTER[m.cls], Object.assign({ weapon: R.STARTER[m.cls], shield: !!R.CLASSES[m.cls].shield }, m.look));
    const ring = new (THREE.Mesh)(new (THREE.TorusGeometry)(0.55, 0.05, 4, 20), new (THREE.MeshBasicMaterial)({ color: '#E8C04A' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; h.g.add(ring);
    h.g.position.set(x, 0, z); W.scene.add(h.g);
    W.rivals.push({ m, st, h, x, z, hp: st.hpMax, hpMax: st.hpMax, cd: 1, home: [x, z], room, rival: true, yaw: 0 });
  };
  // 敵人：用人的樣子
  const hostile = (m, x, z, room, hunter) => {
    const type = hunter ? 'hunter' : RANGED[m.cls] ? 'rogue_shot' : 'rogue';
    const e = R.spawnEnemy(type, x, z, room, { aggro: true, human: m });
    e.title = (hunter ? '賞金獵人・' : '') + m.name; e.member = m;
    return e;
  };
  R.humanModel = m => R.makeHero(m.cls, R.STARTER[m.cls], Object.assign({ weapon: R.STARTER[m.cls], shield: !!R.CLASSES[m.cls].shield }, m.look));

  // ---------- 每一格 ----------
  R.rivalsStep = dt => {
    const pa = W.rivalParty, P = W.P, run = W.run; if (!pa || !P || !run) return;
    // 不是敵人的隊伍：打附近的生物（經驗歸他們）、偶爾去別的房間開寶箱
    W.rivals.forEach(a => {
      a.cd -= dt;
      const tg = R.nearestEnemy(a.x, a.z, 9);
      let mx = 0, mz = 0;
      if (tg) {
        const d = Math.hypot(tg.x - a.x, tg.z - a.z), ang = Math.atan2(tg.x - a.x, tg.z - a.z), melee = a.st.kind === 'melee' || a.st.kind === 'thrust';
        a.yaw = ang; if (d > (melee ? 1.4 : 6)) { mx = Math.sin(ang); mz = Math.cos(ang); }
        if (a.cd <= 0 && d < (melee ? a.st.range + tg.def.size * 0.6 : 11)) { a.cd = 1 / a.st.rate; if (melee) { a.h.swing = 0.25; R.allyHit(tg, a.st.dmg, a); } else { a.h.recoil = 1; R.fire({ kind: a.st.kind === 'bow' ? 'arrow' : a.st.kind === 'magic' ? 'orb' : 'bullet', owner: 'p', ally: true, by: a, x: a.x, z: a.z, a: ang, speed: 20, dmg: a.st.dmg, life: 0.8 }); } }
      } else { const [hx, hz] = a.home, d = Math.hypot(hx - a.x, hz - a.z); if (d > 1) { mx = (hx - a.x) / d; mz = (hz - a.z) / d; a.yaw = Math.atan2(mx, mz); } }
      a.x += mx * a.st.speed * 0.8 * dt; a.z += mz * a.st.speed * 0.8 * dt; R.collide(a, 0.4);
      a.h.g.position.set(a.x, 0, a.z); a.h.g.rotation.y = a.yaw; R.animHero(a.h, Math.hypot(mx, mz) * a.st.speed, dt, !!tg);
      // 被遺跡生物打
      if (!a.dead) W.enemies.forEach(e => { if (!e.dead && !e.def.human && Math.hypot(e.x - a.x, e.z - a.z) < e.def.size + 0.6 && Math.random() < dt * 0.6) { a.hp -= e.dmg * 0.4; if (a.hp <= 0) { a.dead = true; R.setDown(a.h, true); R.toast(a.m.name + '倒下了。'); } } });
    });
    W.rivals = W.rivals.filter(a => !a.dead || (a.h.g.parent && true));
    if (pa.state === 'neutral') {
      // 去開別的寶箱：拿走東西
      pa.lootT -= dt;
      if (pa.lootT <= 0) { pa.lootT = 22 + Math.random() * 18; const here = R.roomIndexAt(P.x, P.z), c = W.F.chests.find(ch => ch.state === 'closed' && ch.room !== here); if (c) { c.state = 'open'; c.opened = (c.opened || 0) + 2; c.lid.rotation.x = -1.9; R.toast('遠處傳來寶箱被打開的聲音。'); } }
      // 走近：遇到了
      if (!pa.met && W.rivals.some(a => !a.dead && Math.hypot(a.x - P.x, a.z - P.z) < 7)) { pa.met = true; meetSheet(pa); }
      // 拒絕了的壞人：等你虛弱的時候出手
      if (pa.declined && pa.traitor && P.hp < P.hpMax * 0.35 && !P.dead && W.rivals.some(a => !a.dead && Math.hypot(a.x - P.x, a.z - P.z) < 22)) betray(pa, '他們一直跟在後面——趁你虛弱的時候出手了！');
    }
    if (pa.state === 'coop' && pa.traitor && !P.dead) {
      if (P.hp < P.hpMax * 0.35) betray(pa, '背叛！他們趁你殘血的時候偷襲！');
      else if (pa.roomClear && P.hp < P.hpMax * 0.6 && Math.random() < 0.5) betray(pa, '背叛！一清完房間，他們就從背後出手！');
      pa.roomClear = false;
    }
  };
  // 清完一間房（run.js 呼叫）
  R.rivalsRoomClear = () => { const pa = W.rivalParty; if (pa && pa.state === 'coop') pa.roomClear = true; };

  // ---------- 遇到 ----------
  const meetSheet = pa => {
    const lead = pa.members[0], P = W.P;
    R.sheet('<p class="kicker">遇到了別的勇者</p><h2>' + esc(lead.name) + '的隊伍（' + pa.members.length + ' 人）</h2>'
      + '<p>帶頭的是' + esc(R.RACES[lead.race].name + '的' + R.CLASSES[lead.cls].name) + '，自稱「' + esc(lead.claim) + '」。</p>'
      + '<p>「你也是來開寶箱的？這一層一起走吧。東西照比例分——我們拿三成就好。」</p>'
      + '<p class="note">一起行動：他們會跟著你、聽你的指揮；這一層結束時分走這一層三成的素材，他們打倒的遺跡生物，經驗也歸他們。<br>各走各的：他們會去開別的寶箱。</p>'
      + '<div id="rv-card"></div>',
      '<div class="row"><button type="button" class="btn pri" id="rv-co">一起行動</button><button type="button" class="btn" id="rv-no">各走各的</button><button type="button" class="btn" id="rv-card-b">看他們的勇者證</button></div>');
    $('rv-card-b').onclick = () => { $('rv-card').innerHTML = '<h3>勇者證</h3><ul class="loot">' + pa.members.map(m => '<li>' + esc(m.name) + '　<b>' + esc(m.card) + '</b>　' + esc(m.rank) + '・' + esc(R.RACES[m.race].name) + '</li>').join('') + '</ul><p class="hand">（公會的註銷名單：HR-2819-7302、HR-2824-0517、HR-2833-2208）</p>'; $('rv-card-b').disabled = true; };
    $('rv-co').onclick = () => { R.closeSheet(); coop(pa); };
    $('rv-no').onclick = () => { R.closeSheet(); pa.declined = true; R.toast('「那就各走各的。」'); };
  };
  // 一起行動：變成臨時的隊友（用隊友的程式），記下現在的素材
  const coop = pa => {
    pa.state = 'coop'; pa.matsAt = Object.assign({}, W.run.mats);
    W.rivals.forEach((a, i) => {
      if (a.dead) return;
      const pm = { m: Object.assign({ fee: 0 }, a.m), hpFrac: a.hp / a.hpMax, gone: false, rival: true };
      W.allies.push({ pm, m: pm.m, name: a.m.name, cls: a.m.cls, st: a.st, h: a.h, x: a.x, z: a.z, hp: a.hp, hpMax: a.hpMax, cd: 0.5, skillCd: 4 + Math.random() * 3, iframe: 0, ally: true, rival: true, stumble: 0, invis: 0, buff: {}, dead: false, air: 0, downed: false, taunt: 0, stuckT: 0, yaw: a.yaw, member: a.m });
    });
    W.rivals = [];
    R.toast('「走吧。」臨時的隊友跟上來了。');
  };
  // 背叛：變成敵人，先偷襲一下
  const betray = (pa, msg) => {
    if (pa.state === 'hostile') return;
    const P = W.P, list = pa.state === 'coop' ? W.allies.filter(a => a.rival && !a.downed) : W.rivals.filter(a => !a.dead);
    pa.state = 'hostile';
    R.banner('背叛！', msg);
    list.forEach(a => {
      if (a.h.g.parent) a.h.g.parent.remove(a.h.g);
      const e = hostile(a.m || a.member, a.x, a.z, R.roomIndexAt(a.x, a.z), false); e.hp = e.hpMax * Math.max(0.4, a.hp / a.hpMax);
      if (Math.hypot(a.x - P.x, a.z - P.z) < 6) { P.iframe = 0; R.hurtPlayer(e.dmg * 1.4, e); }
    });
    W.allies = W.allies.filter(a => !a.rival); W.rivals = [];
    R.shake(0.5);
  };
  // 換樓層、回地面：臨時隊友離開，分走這一層三成的素材
  R.rivalsLeave = () => {
    const pa = W.rivalParty; if (!pa || pa.state !== 'coop' || !W.run) { W.allies = (W.allies || []).filter(a => !a.rival); return; }
    const run = W.run, took = [];
    Object.keys(run.mats).forEach(k => { const d = run.mats[k] - (pa.matsAt[k] || 0), t = Math.floor(d * 0.3); if (t > 0) { run.mats[k] -= t; took.push(R.MATS[k].name + ' ×' + t); } });
    W.allies.filter(a => a.rival).forEach(a => { if (a.h.g.parent) a.h.g.parent.remove(a.h.g); });
    W.allies = W.allies.filter(a => !a.rival);
    R.toast(pa.members[0].name + '的隊伍走了' + (took.length ? '，分走了：' + took.join('、') : '。'));
    pa.state = 'gone';
  };
  // 倒下的壞人：掉錢、掉勇者證（拿回公會可以領獎金）
  R.humanDown = e => {
    const m = e.member; if (!m) return;
    R.dropGold(10 + Math.floor(Math.random() * 30) + m.lv * 2, e.x, e.z);
    R.S.cards = R.S.cards || []; R.S.cards.push({ no: m.card, name: m.name, revoked: m.revoked, day: R.S.day, hunter: e.id === 'hunter' });
    R.toast('撿到' + m.name + '的勇者證（' + m.card + '）。拿回公會。');
  };
})(window.R);
