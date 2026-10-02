// 討伐令 1433：街頭的隨機事件（作者：小巷可以新增小偷和強盜、街頭隨機事件）
// 走在城裡（不在屋裡、沒被通緝）每隔一兩分鐘可能遇到一件事，同時只會有一件：
// - 扒手盯上你（白天、人多的地方）：有人撞你一下，錢包少了一截；追上去撞倒他（貼近一下子）就拿得回來。
// - 搶包包（白天到晚上）：附近的路人被搶，「小偷！」；追上去撞倒小偷，把東西還給失主，拿謝禮、名聲 +1。
// - 小巷的強盜（晚上八點到清晨四點，走在巷子裡）：「把錢包留下。」可以交錢、打倒他們（看準時機出手的小遊戲）、
//   或逃跑（被追上就得交錢）。打倒了叫衛兵來，領賞金、名聲 +1。
// - 醉漢打架（晚上、站前和赤提燈那一帶）：勸架。
// - 迷路的小孩（白天）：帶他去找媽媽（地圖上會標出來，小孩跟在你後面）。
// - 在雪地裡跌倒的老人家（下雪天）：扶起來。
// 追逐的時候上面有計時和距離、目標頭上有紅色箭頭、雷達上是紅點。
(function (R) {
  const W = R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const C = R.CITY, toS = v => v / C.S + 500, toW = s => (s - 500) * C.S;
  const TOPS = ['#3A4A5A', '#5A3A3A', '#3A5A4A', '#6A5A3A', '#4A3A5A', '#7A6A5A', '#2E2E38', '#8A4A3A'], HAIRS = ['#1A1410', '#2A2420', '#4A3424', '#6A4A2E', '#8A8A88'];
  const hour = () => (R.hourNow ? ((R.hourNow() % 24) + 24) % 24 : 12);
  const S = () => R.S, P = () => W.P, tw = () => W.town;
  const runSp = () => (P() ? P().speed * 1.65 : 9);
  let ev = null, cd = 50 + rnd() * 40, hud = null, arrow = null;

  // ---------- 小工具 ----------
  const mk = (x, z, look, o) => {
    const t = tw(), h = R.makeHero('warrior', null, Object.assign({ pool: 'se_' + (o && o.pool || 'x'), lite: o && o.full ? 0 : 1, weapon: null, shield: false }, look));
    h.g.position.set(x, 0, z); t.group.add(h.g); const n = { h, x, z, rot: 0, off: true, se: true, name: null }; t.npcs.push(n); return n;
  };
  const rm = n => { const t = tw(); if (!n || !t) return; t.group.remove(n.h.g); const i = t.npcs.indexOf(n); if (i >= 0) t.npcs.splice(i, 1); };
  const blocked = (x, z) => R.col.list.some(b => b.on !== false && b.tag !== 'deco' && x > b.x0 - 0.4 && x < b.x1 + 0.4 && z > b.z0 - 0.4 && z < b.z1 + 0.4);
  const freeNear = (x, z) => { for (let r = 0; r <= 8; r += 0.5) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, nx = x + Math.sin(a) * r, nz = z + Math.cos(a) * r; if (!blocked(nx, nz)) return [nx, nz]; } return null; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  // 走：照路網（被房子卡住就找路），回傳離目標多遠
  const moveTo = (n, tx, tz, sp, dt) => {
    if (n.path) { const q = n.path[n.pi]; if (q && Math.hypot(q[0] - n.x, q[1] - n.z) < 1.4) n.pi++; if (n.pi < n.path.length) { tx = n.path[n.pi][0]; tz = n.path[n.pi][1]; } else n.path = null; }
    const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz);
    if (d < 0.25) { R.animHero(n.h, 0, dt, false); return d; }
    const st = Math.min(d, sp * dt), ox = n.x, oz = n.z; n.x += dx / d * st; n.z += dz / d * st; const o = { x: n.x, z: n.z }; R.collide(o, 0.35); n.x = o.x; n.z = o.z;
    const moved = Math.hypot(n.x - ox, n.z - oz); n.stuck = moved < st * 0.35 ? (n.stuck || 0) + dt : Math.max(0, (n.stuck || 0) - dt);
    if (n.stuck > 0.4 && !n.path && R.navPath) { n.stuck = 0; const p = R.navPath(toS(n.x), toS(n.z), toS(n.gx != null ? n.gx : tx), toS(n.gz != null ? n.gz : tz)); if (p && p.length > 1) { n.path = p.map(([a, b]) => [toW(a), toW(b)]); n.pi = 0; } }
    n.rot = Math.atan2(dx, dz); n.h.g.position.set(n.x, 0, n.z); n.h.g.rotation.y = n.rot; R.animHero(n.h, sp, dt, false);
    return d;
  };
  // 逃：往離你遠的路口跑（照路網）
  const fleeTarget = n => {
    const Pl = P(), nodes = R.NAV && R.NAV.nodes; if (!nodes) return;
    const ax = n.x - Pl.x, az = n.z - Pl.z, al = Math.hypot(ax, az) || 1, cand = [];
    for (let k = 0; k < 40; k++) { const q = pick(nodes), wx = toW(q[0]), wz = toW(q[1]), dx = wx - n.x, dz = wz - n.z, d = Math.hypot(dx, dz); if (d < 30 || d > 70) continue; if ((dx * ax + dz * az) / (d * al) < 0.2) continue; cand.push([wx, wz]); }
    const t = cand[0] || [n.x + ax / al * 30, n.z + az / al * 30]; n.gx = t[0]; n.gz = t[1];
    const p = R.navPath && R.navPath(toS(n.x), toS(n.z), toS(t[0]), toS(t[1])); n.path = p && p.length > 1 ? p.map(([a, b]) => [toW(a), toW(b)]) : null; n.pi = 0;
  };
  const say = (who, lines) => R.townTalk(who, lines);
  const rep = v => { const s = S(); s.rep = (s.rep || 0) + v; };
  const gold = v => { const s = S(); s.gold = Math.max(0, s.gold + v); R.save && R.save(); };

  // ---------- 畫面：上面的計時、目標頭上的紅箭頭 ----------
  const showHud = txt => { if (!hud) { hud = document.createElement('div'); hud.className = 'hud se-hud'; const run = document.getElementById('run'); (run || document.body).appendChild(hud); } hud.hidden = !txt; if (txt && hud.innerHTML !== txt) hud.innerHTML = txt; };
  const showArrow = n => {
    const t = tw(); if (!t) return;
    if (!arrow) { const TH = THREE; arrow = new TH.Mesh(new TH.ConeGeometry(0.28, 0.6, 4), new TH.MeshBasicMaterial({ color: '#FF3A3A' })); arrow.rotation.x = Math.PI; }
    if (arrow.parent !== t.group) t.group.add(arrow);
    arrow.visible = !!n; if (n) arrow.position.set(n.x, 2.6 + Math.sin(performance.now() / 160) * 0.15, n.z);
  };
  const end = (msg) => { if (ev) { (ev.npcs || []).forEach(n => rm(n)); if (ev.victim) { ev.victim.h.g.visible = true; ev.victim.off = false; } const t = tw(); if (ev.it && t) { const i = t.inter.indexOf(ev.it); if (i >= 0) t.inter.splice(i, 1); } } ev = null; cd = 70 + rnd() * 80; showHud(''); showArrow(null); if (msg) R.toast(msg); };

  // ---------- 追逐（扒手、搶包包、逃跑時的強盜反過來追你） ----------
  const chaseStep = (dt, thief, onCatch, onLose, label) => {
    const Pl = P(); ev.t += dt;
    const tired = ev.t > 14 ? 0.78 : 1, sp = runSp() * (ev.speed || 0.9) * tired;
    if (!thief.path || (thief.gx != null && Math.hypot(thief.gx - thief.x, thief.gz - thief.z) < 2)) fleeTarget(thief);
    moveTo(thief, thief.gx, thief.gz, sp, dt);
    const d = dist(thief, Pl);
    if (d < 1.1) { ev.touch = (ev.touch || 0) + dt; if (ev.touch > 0.15) { onCatch(); return; } } else ev.touch = 0;
    if (d > 48 || ev.t > (ev.limit || 40)) { onLose(); return; }
    showArrow(thief); showHud('<b>' + label + '</b><span>' + Math.round(d) + ' 公尺・剩 ' + Math.max(0, Math.ceil((ev.limit || 40) - ev.t)) + ' 秒</span><small>按住 Shift 跑步，撞上去就抓到了</small>');
  };

  // ---------- 事件 ----------
  const KINDS = {
    // 扒手盯上你
    pick: {
      ok: h => h >= 9 && h < 21 && tw().npcs.filter(n => n.walk && !n.off && Math.hypot(n.x - P().x, n.z - P().z) < 36).length >= 2 && S().gold >= 20,
      start: () => {
        const Pl = P(), a = Pl.yaw + Math.PI + (rnd() - 0.5), p = freeNear(Pl.x + Math.sin(a) * 9, Pl.z + Math.cos(a) * 9); if (!p) return false;
        const t = mk(p[0], p[1], { top: '#2E2E38', hair: '#1A1410', cloak: '#2A2A30', acc: 'scarf', accCol: '#3A3A44' }, { pool: 'thief', full: 1 });
        ev = { kind: 'pick', st: 'approach', t: 0, npcs: [t], thief: t };
        return true;
      },
      step: dt => {
        const Pl = P(), t = ev.thief; ev.t += dt;
        if (ev.st === 'approach') {
          const d = moveTo(t, Pl.x, Pl.z, 3.6, dt);
          if (d < 0.9) {
            const s = S(), amt = Math.max(5, Math.min(s.gold, 60, Math.round(s.gold * 0.07 + 10 + rnd() * 30))); gold(-amt); ev.amt = amt; ev.st = 'flee'; ev.t = 0; ev.speed = 0.9; ev.limit = 35; t.path = null;
            R.toast('有人撞了你一下……錢包少了 ' + amt + ' 費拉！是剛剛那個人！', '#E8323A'); R.sfx && R.sfx('swing');
          } else if (ev.t > 25) end();
          return;
        }
        chaseStep(dt, t, () => { gold(ev.amt + 5); R.sfx && R.sfx('pick'); const amt = ev.amt; say('扒手', ['「哎唷！放手放手——還你就是了！」', '（拿回 ' + amt + ' 費拉，還多搜出 5 費拉。扒手一溜煙跑了。）']); end(); },
          () => end('扒手跑掉了。錢包裡少了 ' + ev.amt + ' 費拉……'), '追扒手！');
      }
    },
    // 搶包包
    snatch: {
      ok: h => h >= 8 && h < 22,
      start: () => {
        const Pl = P(), vs = tw().npcs.filter(n => n.walk && !n.off && !n.guard && !n.patrol && !n.name && n.h.g.visible).map(n => [n, dist(n, Pl)]).filter(([, d]) => d > 8 && d < 36).sort((a, b) => a[1] - b[1]);
        if (!vs.length) return false; const v = vs[0][0];
        const p = freeNear(v.x + 2, v.z + 2); if (!p) return false;
        const t = mk(p[0], p[1], { top: '#3A3A44', hair: '#2A2420', cloak: '#1E1E26' }, { pool: 'snatch', full: 1 });
        // 失主停下來（換成我們自己的人站在原地，原本的路人藏起來）
        v.h.g.visible = false; v.off = true; ev = { kind: 'snatch', st: 'grab', t: 0, npcs: [t], thief: t, victim: v };
        const vic = mk(v.x, v.z, { top: pick(['#8A4A5A', '#C8A888', '#6A5A3A']), hair: pick(HAIRS) }, { pool: 'victim' }); ev.npcs.push(vic); ev.vic = vic; vic.h.g.rotation.y = Math.atan2(t.x - vic.x, t.z - vic.z);
        return true;
      },
      step: dt => {
        const t = ev.thief; ev.t += dt;
        if (ev.st === 'grab') { const d = moveTo(t, ev.vic.x, ev.vic.z, 4.5, dt); if (d < 0.9 || ev.t > 4) { ev.st = 'flee'; ev.t = 0; ev.speed = 0.88; ev.limit = 40; t.path = null; R.toast('「小偷！誰來幫幫我——！」有人的包包被搶了！', '#E8323A'); R.sfx && R.sfx('crossing'); } return; }
        if (ev.st === 'flee') {
          chaseStep(dt, t, () => { ev.st = 'return'; R.setDown && R.setDown(t.h, true); ev.downT = 0; R.toast('抓到了！把包包拿回去還給失主吧。'); R.sfx && R.sfx('pick'); showArrow(ev.vic); showHud('<b>把包包還給失主</b><small>回到剛剛被搶的人那裡</small>'); },
            () => { const v = ev.victim; v.h.g.visible = true; v.off = false; end('小偷跑掉了。'); }, '追小偷！');
          return;
        }
        if (ev.st === 'return') {
          ev.downT += dt; R.animHero(t.h, 0, dt, false); if (ev.downT > 2.5 && t.h.g.visible) { t.h.g.visible = false; }
          const d = dist(ev.vic, P()); showArrow(ev.vic); showHud('<b>把包包還給失主</b><span>' + Math.round(d) + ' 公尺</span>');
          if (d < 2.2) { const r = 20 + Math.floor(rnd() * 31); gold(r); rep(1); R.sfx && R.sfx('coin'); say('被搶的路人', ['「我的包包！謝謝你、真的謝謝你……」', '「這一點心意，請收下。」', '（拿到 ' + r + ' 費拉。名聲 +1）']); const v = ev.victim; v.h.g.visible = true; v.off = false; end(); }
          else if (ev.t > 120) { const v = ev.victim; v.h.g.visible = true; v.off = false; end(); }
        }
      }
    },
    // 小巷的強盜
    rob: {
      ok: h => (h >= 20 || h < 4) && inAlley(),
      start: () => {
        const Pl = P(), n = rnd() < 0.5 ? 1 : 2, out = [];
        for (let i = 0; i < n; i++) { const a = Pl.yaw + (i ? Math.PI : 0) + (rnd() - 0.5) * 0.6, p = freeNear(Pl.x + Math.sin(a) * 8, Pl.z + Math.cos(a) * 8); if (!p) continue; out.push(mk(p[0], p[1], { top: pick(['#2A2A30', '#3A2E2A', '#2E3A30']), hair: pick(['#1A1410', '#3A2A1C']), cloak: '#1A1A20', acc: 'headband', accCol: '#5A1A1A' }, { pool: 'rob' + i, full: 1 })); }
        if (!out.length) return false;
        ev = { kind: 'rob', st: 'approach', t: 0, npcs: out, robbers: out };
        return true;
      },
      step: dt => {
        const Pl = P(); ev.t += dt;
        if (ev.st === 'approach') {
          let near = true; ev.robbers.forEach((r, i) => { const a = Math.atan2(r.x - Pl.x, r.z - Pl.z), d = moveTo(r, Pl.x + Math.sin(a) * 1.6, Pl.z + Math.cos(a) * 1.6, 3.4, dt); if (d > 0.6) near = false; });
          showArrow(ev.robbers[0]); showHud('<b>巷子裡有人擋住了路</b>');
          if (near || ev.t > 6) { ev.st = 'talk'; robSheet(); }
          return;
        }
        if (ev.st === 'chase') {   // 你逃跑：他們追你
          ev.ct += dt; let caught = false; ev.robbers.forEach(r => { moveTo(r, Pl.x, Pl.z, runSp() * 0.9, dt); if (dist(r, Pl) < 1.0) caught = true; });
          const d = Math.min(...ev.robbers.map(r => dist(r, Pl)));
          showHud('<b>逃！</b><span>' + Math.round(d) + ' 公尺・撐 ' + Math.max(0, Math.ceil(10 - ev.ct)) + ' 秒</span><small>按住 Shift 跑步</small>'); showArrow(null);
          if (caught) { const amt = Math.min(300, Math.round(S().gold * 0.3)); gold(-amt); say('強盜', ['「跑什麼跑。」', '（被抓住了。錢包被搶走 ' + amt + ' 費拉。）']); end(); }
          else if (ev.ct > 10 || d > 26) end('甩掉了。心臟還在狂跳。');
          return;
        }
        if (ev.st === 'down') { ev.robbers.forEach(r => R.animHero(r.h, 0, dt, false)); ev.dt2 = (ev.dt2 || 0) + dt; if (ev.dt2 > 60 || dist(ev.robbers[0], Pl) > 40) end(); }
      }
    },
    // 醉漢打架
    brawl: {
      ok: h => h >= 19 || h < 1,
      start: () => {
        const Pl = P(), spots = [[600, 330], [C.FAC.tavern && C.FAC.tavern[0], C.FAC.tavern && C.FAC.tavern[1] + 16]].filter(s => s[0] != null).map(([sx, sy]) => [toW(sx), toW(sy)]).filter(([x, z]) => Math.hypot(x - Pl.x, z - Pl.z) < 40);
        const b = spots[0] ? freeNear(spots[0][0], spots[0][1]) : freeNear(Pl.x + Math.sin(Pl.yaw) * 10, Pl.z + Math.cos(Pl.yaw) * 10); if (!b) return false;
        const a = mk(b[0], b[1], { top: '#5A3A3A', hair: '#2A2420' }, { pool: 'drunk0' }), c = mk(b[0] + 1.2, b[1], { top: '#3A4A5A', hair: '#6A4A2E' }, { pool: 'drunk1' });
        ev = { kind: 'brawl', st: 'fight', t: 0, npcs: [a, c], a, c };
        tw().inter.push(ev.it = { follow: a, x: a.x, z: a.z, r: 2.4, label: '勸架', when: () => ev && ev.kind === 'brawl' && ev.st === 'fight', act: () => brawlSheet() });
        R.toast('前面有人在吵架……好像要打起來了。');
        return true;
      },
      step: dt => {
        ev.t += dt; const { a, c } = ev;
        if (ev.st === 'fight') { a.h.g.rotation.y = Math.PI / 2 + Math.sin(ev.t * 9) * 0.25; c.h.g.rotation.y = -Math.PI / 2 + Math.cos(ev.t * 8) * 0.25; a.h.g.position.x = a.x + Math.sin(ev.t * 6) * 0.15; R.animHero(a.h, 2, dt, false); R.animHero(c.h, 2, dt, false); showArrow(a); if (dist(a, P()) > 45 || ev.t > 150) end(); }
        else { ev.t2 = (ev.t2 || 0) + dt; moveTo(a, a.x - 20, a.z, 2, dt); moveTo(c, c.x + 20, c.z, 2, dt); if (ev.t2 > 6) end(); }
      }
    },
    // 迷路的小孩
    lost: {
      ok: h => h >= 9 && h < 17,
      start: () => {
        const Pl = P(), a = Pl.yaw + (rnd() - 0.5) * 1.2, p = freeNear(Pl.x + Math.sin(a) * 7, Pl.z + Math.cos(a) * 7); if (!p) return false;
        const kid = mk(p[0], p[1], { top: '#E8A03A', hair: '#2A2420', hs: 'bob' }, { pool: 'kid' }); kid.h.g.scale.setScalar(0.78);
        ev = { kind: 'lost', st: 'cry', t: 0, npcs: [kid], kid };
        tw().inter.push(ev.it = { follow: kid, x: kid.x, z: kid.z, r: 1.8, label: '和哭著的小孩說話', when: () => ev && ev.kind === 'lost' && ev.st === 'cry', act: () => lostSheet() });
        R.toast('附近有小孩在哭。');
        return true;
      },
      step: dt => {
        ev.t += dt; const Pl = P(), k = ev.kid;
        if (ev.st === 'cry') { R.animHero(k.h, 0, dt, false); showArrow(k); if (dist(k, Pl) > 40 || ev.t > 120) end(); return; }
        if (ev.st === 'follow') {
          const d = dist(k, Pl); if (d > 1.6) moveTo(k, Pl.x - Math.sin(Pl.yaw) * 1.2, Pl.z - Math.cos(Pl.yaw) * 1.2, Math.min(runSp(), Math.max(2, d * 1.6)), dt); else R.animHero(k.h, 0, dt, false);
          if (d > 25) { k.x = Pl.x - 1; k.z = Pl.z; k.path = null; }
          const m = ev.mom, dm = dist(m, Pl); showArrow(m); showHud('<b>帶小孩去找媽媽</b><span>' + Math.round(dm) + ' 公尺</span><small>地圖上標出來了</small>');
          m.h.g.rotation.y = Math.atan2(Pl.x - m.x, Pl.z - m.z); R.animHero(m.h, 0, dt, false);
          if (dm < 3) { const r = 15 + Math.floor(rnd() * 16); gold(r); rep(1); if (R.addGift && rnd() < 0.5) R.addGift('rose', 1); R.sfx && R.sfx('chest'); say('小孩的媽媽', ['「小翼！你跑去哪裡了——」', '「真是太謝謝你了。一點點心意。」', '（拿到 ' + r + ' 費拉。名聲 +1）']); if (R.clearWaypoint && S().waypoint && S().waypoint.name === '小孩的媽媽') R.clearWaypoint(); end(); }
          else if (ev.t > 300) end('小孩說他想起路了，自己跑走了。');
        }
      }
    },
    // 雪地裡跌倒的老人家
    fall: {
      ok: h => h >= 7 && h < 18 && (() => { const E = R.eventsToday ? R.eventsToday() : {}; return E.heavySnow || E.blizzard || /雪/.test(E.weather || '') || rnd() < 0.4; })(),
      start: () => {
        const Pl = P(), a = Pl.yaw + (rnd() - 0.5), p = freeNear(Pl.x + Math.sin(a) * 8, Pl.z + Math.cos(a) * 8); if (!p) return false;
        const o = mk(p[0], p[1], { top: '#6A5A4A', hair: '#C8C0B0', acc: 'glasses', accCol: '#2A2420' }, { pool: 'old', full: 1 }); R.setDown && R.setDown(o.h, true);
        ev = { kind: 'fall', st: 'down', t: 0, npcs: [o], o };
        tw().inter.push(ev.it = { follow: o, x: o.x, z: o.z, r: 1.8, label: '扶跌倒的老人家起來', when: () => ev && ev.kind === 'fall' && ev.st === 'down', act: () => { ev.st = 'up'; ev.t = 0; R.setDown && R.setDown(o.h, false); rep(1); const g = rnd() < 0.5; if (g && R.addGift) R.addGift('tea', 1); say('老人家', ['「哎呀……路太滑了。謝謝你，年輕人。」', g ? '「這包茶葉你拿去，天冷，泡來喝。」（拿到熱茶葉。名聲 +1）' : '「現在這麼好心的人不多了。」（名聲 +1）']); } });
        R.toast('有位老人家在雪地上滑倒了。');
        return true;
      },
      step: dt => { ev.t += dt; const o = ev.o; if (ev.st === 'down') { R.animHero(o.h, 0, dt, false); showArrow(o); if (dist(o, P()) > 40 || ev.t > 120) end(); } else { showArrow(null); moveTo(o, o.x + 10, o.z, 1.2, dt); if (ev.t > 6) end(); } }
    }
  };

  // ---------- 巷子：離最近的路是窄巷，而且不在大路旁邊 ----------
  const segD = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L)) : 0; return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t); };
  const inAlley = () => {
    const Pl = P(); if (!Pl || !C.roads) return false; const sx = toS(Pl.x), sy = toS(Pl.z); let lane = 1e9, big = 1e9;
    C.roads.forEach(r => { let d = 1e9; for (let i = 1; i < r.pts.length; i++) d = Math.min(d, segD(sx, sy, r.pts[i - 1], r.pts[i])); if (r.kind === 'lane' || r.kind === 'olane') lane = Math.min(lane, d - r.w / 2); else if (r.kind === 'main' || r.kind === 'sub' || r.kind === 'arcade') big = Math.min(big, d - r.w / 2); });
    return lane < 3 && big > 18;
  };

  // ---------- 強盜：交錢、打、逃 ----------
  const robSheet = () => {
    const s = S(), n = ev.robbers.length, pay = Math.min(200, Math.round(s.gold * 0.2));
    R.sheet('<p class="kicker">深夜的巷子</p><h2>' + (n > 1 ? '兩個' : '一個') + '蒙面的人擋住了路</h2><p>「站住。把錢包留下，就讓你走。」</p><p class="note">手上拿著棍子。' + (n > 1 ? '後面也有一個。' : '') + '</p>',
      '<div class="row"><button type="button" class="btn" id="rb-pay">交出錢（' + pay + ' 費拉）</button><button type="button" class="btn pri" id="rb-fight">打倒他們</button><button type="button" class="btn" id="rb-run">逃跑</button></div>');
    document.getElementById('rb-pay').onclick = () => { gold(-pay); R.closeSheet(); say('強盜', ['「識相。」', '（交出 ' + pay + ' 費拉。兩個人消失在巷子裡。）']); end(); };
    document.getElementById('rb-run').onclick = () => { R.closeSheet(); ev.st = 'chase'; ev.ct = 0; R.toast('快跑！'); };
    document.getElementById('rb-fight').onclick = () => fightSheet();
  };
  // 打：游標來回跑，在亮的那一段裡按「出手」；打中 3 下（兩個人 4 下）就贏，揮空 2 次就輸
  let fight = null;
  const fightSheet = () => {
    const s = S(), lv = (s.classes && s.classes[s.cls] && s.classes[s.cls].lv) || 1, need = ev.robbers.length > 1 ? 4 : 3, zone = Math.min(0.4, 0.16 + lv * 0.007);
    R.sheet('<p class="kicker">深夜的巷子</p><h2>打倒強盜</h2><p class="note">游標跑到亮的那一段的時候出手（空白鍵或按鈕）。打中 ' + need + ' 下就贏，揮空 2 次就輸。</p>'
      + '<div class="se-qte"><div class="se-bar"><i id="qt-zone"></i><b id="qt-mark"></b></div><p id="qt-msg">　</p><div class="se-pips" id="qt-pips"></div></div>',
      '<div class="row"><button type="button" class="btn pri" id="qt-hit">出手</button></div>');
    fight = { pos: 0, dir: 1, sp: 0.95 + rnd() * 0.3, zone, z0: 0.15 + rnd() * (0.7 - zone), hits: 0, miss: 0, need, done: false, lock: 0 };
    const $ = id => document.getElementById(id), zEl = $('qt-zone'); zEl.style.left = fight.z0 * 100 + '%'; zEl.style.width = fight.zone * 100 + '%';
    const pips = () => { $('qt-pips').innerHTML = Array.from({ length: need }, (_, i) => '<i class="' + (i < fight.hits ? 'on' : '') + '"></i>').join('') + '<span>揮空 ' + fight.miss + '／2</span>'; };
    pips();
    const hit = () => {
      const f = fight; if (!f || f.done || f.lock > 0) return; f.lock = 0.25;
      if (f.pos >= f.z0 && f.pos <= f.z0 + f.zone) { f.hits++; $('qt-msg').textContent = pick(['打中了！', '一記重擊！', '對方踉蹌了一下！']); R.sfx && R.sfx('swing'); f.sp *= 1.12; f.z0 = 0.1 + rnd() * (0.8 - f.zone); zEl.style.left = f.z0 * 100 + '%'; }
      else { f.miss++; $('qt-msg').textContent = pick(['揮空了！', '被閃開了！', '對方的棍子掃過來！']); R.sfx && R.sfx('bow'); }
      pips();
      if (f.hits >= f.need) { f.done = true; setTimeout(() => winFight(), 500); }
      else if (f.miss >= 2) { f.done = true; setTimeout(() => loseFight(), 500); }
    };
    $('qt-hit').onclick = hit;
    const key = e => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); hit(); } };
    window.addEventListener('keydown', key, true);
    let last = performance.now();
    const loop = now => {
      if (!fight || !document.getElementById('qt-mark') || !R.sheetOpen()) { window.removeEventListener('keydown', key, true); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; stepFight(dt); requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    fight.hit = hit;
  };
  const stepFight = dt => { const f = fight; if (!f || f.done) return; f.lock -= dt; f.pos += f.dir * f.sp * dt; if (f.pos > 1) { f.pos = 1; f.dir = -1; } if (f.pos < 0) { f.pos = 0; f.dir = 1; } const m = document.getElementById('qt-mark'); if (m) m.style.left = f.pos * 100 + '%'; };
  const winFight = () => {
    fight = null; ev.st = 'down'; ev.robbers.forEach(r => R.setDown && R.setDown(r.h, true)); R.sfx && R.sfx('chest');
    const s = S(); s.stats = s.stats || {}; s.stats.robbers = (s.stats.robbers || 0) + ev.robbers.length;
    R.sheet('<p class="kicker">深夜的巷子</p><h2>打倒了</h2><p>' + (ev.robbers.length > 1 ? '兩個人' : '那個人') + '躺在雪地上呻吟。</p>', '<div class="row"><button type="button" class="btn pri" id="rb-guard">吹哨叫衛兵來（領賞金）</button><button type="button" class="btn" id="rb-leave">放他們走</button></div>');
    document.getElementById('rb-guard').onclick = () => { const r = 30 + Math.floor(rnd() * 31) + (ev.robbers.length - 1) * 30; gold(r); rep(1); R.closeSheet(); say('東鶴的衛兵', ['「又是這兩個……最近巷子裡的搶案就是他們幹的。」', '「辛苦了。這是懸賞的獎金。」', '（拿到 ' + r + ' 費拉。名聲 +1）']); end(); };
    document.getElementById('rb-leave').onclick = () => { R.closeSheet(); R.toast('他們連滾帶爬地跑了。'); end(); };
  };
  const loseFight = () => {
    fight = null; const amt = Math.min(300, Math.round(S().gold * 0.3)); gold(-amt); R.closeSheet();
    say('強盜', ['棍子打在肩膀上，你跪倒在雪裡。', '「早點交出來不就好了。」', '（錢包被搶走 ' + amt + ' 費拉。）']); end();
  };
  // ---------- 勸架、小孩 ----------
  const brawlSheet = () => {
    R.sheet('<p class="kicker">深夜的街上</p><h2>兩個醉漢在吵架</h2><p>「你再說一次看看！」「說就說！你們公會的都是——」</p>',
      '<div class="row"><button type="button" class="btn pri" id="bw-calm">「兩位，冷靜一點。」</button><button type="button" class="btn" id="bw-firm">「再鬧我就叫衛兵了。」</button><button type="button" class="btn" id="bw-x">不管他們</button></div>');
    const done = (ok, lines) => { R.closeSheet(); ev.st = 'leave'; ev.t2 = 0; if (ok) rep(1); say('醉漢', lines); };
    document.getElementById('bw-calm').onclick = () => rnd() < 0.65 ? done(true, ['「……算了算了，今天就放過你。」', '兩個人各自搖搖晃晃地走了。（名聲 +1）']) : done(false, ['「關你什麼事！」', '其中一個推了你一把，然後兩個人一起罵著你走掉了。……至少不打了。']);
    document.getElementById('bw-firm').onclick = () => rnd() < 0.8 ? done(true, ['「衛、衛兵？……喂，走了走了。」', '兩個人一下子酒醒了一半。（名聲 +1）']) : done(false, ['「叫啊！叫啊！」', '……然後兩個人還是走了。']);
    document.getElementById('bw-x').onclick = R.closeSheet;
  };
  const lostSheet = () => {
    R.sheet('<p class="kicker">街上</p><h2>哭著的小孩</h2><p>「嗚……找不到媽媽了……」</p><p class="note">大概六、七歲，手套掉了一隻。</p>',
      '<div class="row"><button type="button" class="btn pri" id="lk-yes">「我帶你去找。」</button><button type="button" class="btn" id="lk-no">「在這裡等，別亂跑。」</button></div>');
    document.getElementById('lk-yes').onclick = () => {
      R.closeSheet(); const Pl = P(), nodes = R.NAV.nodes; let m = null;
      for (let k = 0; k < 60 && !m; k++) { const q = pick(nodes), wx = toW(q[0]), wz = toW(q[1]), d = Math.hypot(wx - Pl.x, wz - Pl.z); if (d > 40 && d < 90) { const p = freeNear(wx, wz); if (p) m = p; } }
      if (!m) { end('小孩突然指著遠處：「啊，媽媽！」然後跑走了。'); return; }
      const mom = mk(m[0], m[1], { top: '#C8A888', hair: '#2A2420' }, { pool: 'mom' }); ev.npcs.push(mom); ev.mom = mom; ev.st = 'follow'; ev.t = 0;
      if (R.setWaypoint) R.setWaypoint(toS(m[0]), toS(m[1]), '小孩的媽媽');
      say('迷路的小孩', ['「……嗯。」', '（小孩抓著你的衣角。他說媽媽穿米色的大衣。地圖上標出了大概的地方。）']);
    };
    document.getElementById('lk-no').onclick = () => { R.closeSheet(); R.toast('小孩點點頭，蹲在路邊等。'); };
  };

  // ---------- 每一格 ----------
  const tryStart = () => {
    const h = hour(), heat = R.crime ? R.crime.heat : 0; if (heat > 0) return;
    const order = Object.keys(KINDS).sort(() => rnd() - 0.5);
    // 晚上在巷子裡優先遇到強盜
    if ((h >= 20 || h < 4) && inAlley() && rnd() < 0.7) order.unshift('rob');
    for (const k of order) { try { if (KINDS[k].ok(h) && KINDS[k].start()) return; } catch (e) { console.warn('[streetevents]', k, e); ev = null; } }
  };
  const step0 = R.townStep;
  R.townStep = dt => {
    step0(dt);
    const t = tw(); if (!t || !P() || !R.S) return;
    if (W.inside) { if (ev) end(); return; }
    if (R.sheetOpen && R.sheetOpen()) return;
    if (ev) { try { KINDS[ev.kind].step(dt); } catch (e) { console.warn('[streetevents]', e); end(); } return; }
    cd -= dt; if (cd <= 0) { cd = 20 + rnd() * 20; tryStart(); }
  };
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => { ev = null; arrow = null; showHud(''); enter0(from, at); cd = 50 + rnd() * 40; };
  // 雷達：追的對象是紅點
  const radar0 = R.drawTownMinimap;
  if (radar0) R.drawTownMinimap = (x, s) => {
    radar0(x, s); if (!ev || W.inside) return; const Pl = P(); if (!Pl) return;
    const tgt = ev.st === 'flee' ? ev.thief : ev.st === 'return' ? ev.vic : ev.st === 'follow' ? ev.mom : ev.kind === 'rob' && ev.robbers ? ev.robbers[0] : ev.npcs && ev.npcs[0]; if (!tgt) return;
    const yaw = W.cam.yaw, ppm = s / 150, c = Math.cos(yaw), sn = Math.sin(yaw), dx = (tgt.x - Pl.x) * ppm, dz = (tgt.z - Pl.z) * ppm;
    let px = s / 2 + dx * c - dz * sn, py = s / 2 + dx * sn + dz * c; const r = s / 2 - 5, ox = px - s / 2, oy = py - s / 2, d = Math.hypot(ox, oy); if (d > r) { px = s / 2 + ox / d * r; py = s / 2 + oy / d * r; }
    x.fillStyle = '#FF3A3A'; x.strokeStyle = '#FFFFFF'; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, Math.max(3, s / 40), 0, 7); x.fill(); x.stroke();
  };
  R.streetEventDebug = { get ev() { return ev; }, start: k => { if (ev) end(); return KINDS[k].start(); }, KINDS, inAlley, end, get fight() { return fight; }, stepFight, set cd(v) { cd = v; } };
})(window.R);
