// 精緻城市的犯罪（2026-10-09 作者：其他城市也要有東鶴有的那些功能）
// 東鶴的那一套原封不動地接到精緻城市（citykit）：props.js（視線條、偷東西、通緝、衛兵追、被抓）、streetcrime.js（扒錢包）、
// vigilance.js（街坊警戒、哨音、路人大喊、增援、和路人說話）、punish.js（罰金、拘留、停權）。
// - 看得到你的人：路人（tw.walkers，6 公尺）、站著說話的人＝店員、攤販（8 公尺）、衛兵（11～12 公尺）。店裡（CK.defineRoom）也算：店員看得到。
// - 衛兵：城的設定 guards: [[x, z, rot], …]（站崗）、patrols: [[[x, z], …], …]（巡邏）；也可以在 build 裡用 B.guardPost(x, z, rot)、B.patrol(pts)。
//   沒寫的話：出生點（車站前）兩個站崗，沿著最長的兩條路人路線各一個巡邏。增援從站崗的地方派出來（vigilance.js 的 tw.guardPosts）。
// - 可以偷的東西：B.steal(x, z, label, owner, loot, o)（loot＝() => ({ gold }／{ gift, n }／{ mat, n }／{ potion })；店裡也可以用）。
// - 被抓：punish.js 的懲罰照舊；放出來的地方是這座城的衛兵崗位（不是東鶴）。
// - 路人被嚇跑（被扒、通緝中看到你）：跑開幾秒，再走回原本的路線。
// 放在 citykit*.js、所有的 city_*.js 後面。
(function (R) {
  const CK = R.CK, W = R.W; if (!CK) return;
  const LOOK = { top: '#3E4A5A', hair: '#2A2420', cloak: '#2E3A48', shield: true, weapon: 'spear' };
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  // ---------- 蓋城的工具 ----------
  const eb0 = CK.extendBuilder;
  CK.extendBuilder = B => {
    eb0(B);
    const D = B.D; D.steals = []; D.guards = []; D.patrols = [];
    B.steal = (x, z, label, owner, loot, o) => { const [wx, wz] = B.toWorld(x, z); D.steals.push(Object.assign({ x: wx, z: wz, r: 1.6, label, owner: owner || 'shop', time: 1.4, loot, max: 2 }, o || {})); };
    B.guardPost = (x, z, rot, lines) => { const [wx, wz] = B.toWorld(x, z); D.guards.push([wx, wz, (rot || 0) + B.yaw(), lines]); };
    B.patrol = pts => D.patrols.push(pts.map(p => B.toWorld(p[0], p[1])));
  };
  const guardName = tw => ((tw.city && tw.city.name ? tw.city.name.split('・')[0] : '城') + '的衛兵');
  const mkGuard = (tw, x, z, rot, o) => {
    const h = R.makeHero('knight', 'spear', LOOK); h.g.position.set(x, CK.heightAt(x, z), z); h.g.rotation.y = rot || 0; tw.group.add(h.g);
    const n = Object.assign({ h, x, z, rot: rot || 0, name: guardName(tw), guard: true, watch: { range: 11, fov: 1.0, guard: 1 } }, o || {});
    tw.npcs.push(n); tw.watchers.push(n); return n;
  };
  const LINES = tw => [['「' + (tw.city ? tw.city.name : '') + '的治安還算好。扒手倒是有。」', '「錢包放前面的口袋。」'], ['「有什麼事？」', '「通緝犯的告示貼在衛兵所門口。」'], ['「站崗站了一整天，腳都凍僵了。」']];
  // ---------- 蓋好之後：看守的人、衛兵、可以偷的東西、扒錢包、和路人說話 ----------
  const setup = B => {
    const tw = W.town, D = B.D; if (!tw || !tw.ck) return;
    tw.watchers = tw.watchers || []; tw.steals = [];
    // 可以偷的東西
    D.steals.forEach(o => { const st = R.addSteal ? R.addSteal(o, tw.steals) : null; if (st) tw.inter.push(R.stealInter(st)); });
    // 站著說話的人＝店員、攤販
    tw.npcs.forEach(n => { if (n.near && !n.watch) { n.watch = { range: 8, fov: 1.2 }; tw.watchers.push(n); } });
    // 路人
    (tw.walkers || []).forEach(n => {
      n.watch = { range: 6, fov: 1.0, civ: 1 }; tw.watchers.push(n);
      if (R.pickInter) tw.inter.push(R.pickInter(n));
      if (R.vigChat) tw.inter.push({ get x() { return n.x; }, get z() { return n.z; }, r: 1.4, label: '和路人說話', when: () => !n.off && n.h.g.visible && !(n.flee > 0) && Math.abs(wrap(Math.atan2(W.P.x - n.x, W.P.z - n.z) - n.h.g.rotation.y)) < 1.9, act: () => R.vigChat(n) });
    });
    if (tw.room) return;   // 店裡沒有衛兵
    // 衛兵：站崗、巡邏
    const city = tw.city, posts = D.guards.length ? D.guards : (city.guards || null), sp = city.spawn || [0, 0, 0];
    const P0 = posts || [[sp[0] - 4, sp[1] - 2, sp[2] || 0], [sp[0] + 4, sp[1] - 2, sp[2] || 0]];
    tw.guardPosts = [];
    P0.forEach((p, i) => { const g = mkGuard(tw, p[0], p[1], p[2], { vg: null }); g.post = [p[0], p[1], p[2] || 0]; tw.guardPosts.push([p[0], p[1]]); const L = p[3] || LINES(tw)[i % 3]; tw.inter.push({ get x() { return g.x; }, get z() { return g.z; }, r: 1.8, label: '和衛兵說話', act: () => R.townTalk(g.name, L) }); });
    let routes = D.patrols.length ? D.patrols : (city.patrols || null);
    if (!routes) routes = (D.walks || []).map(w => w.pts).filter(p => p.length >= 2).sort((a, b) => len(b) - len(a)).slice(0, 2);
    routes.forEach(pts => { const route = pts.length > 2 ? pts.concat(pts.slice(1, -1).reverse()) : pts.slice(); const g = mkGuard(tw, route[0][0], route[0][1], 0, { name: '巡邏的' + guardName(tw), walk: true, patrol: route, pi: 0, speed: 2.2, watch: { range: 12, fov: 1.1, guard: 1 } }); g.patrolGuard = true; });
    if (R.pickReset) R.pickReset();
    if (R.crime) { R.crime.ch = null; R.crime.seen = 0; }
    tw.cones = [];
  };
  const len = pts => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  const sl0 = CK.spawnLife;
  CK.spawnLife = B => { sl0(B); try { setup(B); } catch (e) { console.warn('[ckcrime]', e); } };

  // ---------- 每一格 ----------
  const moveTo = (n, tx, tz, sp, dt) => { const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz); if (d < 0.3) { R.animHero(n.h, 0, dt, false); return d; } const st = Math.min(d, sp * dt); n.x += dx / d * st; n.z += dz / d * st; const o = { x: n.x, z: n.z }; R.collide(o, 0.35); n.x = o.x; n.z = o.z; n.h.g.position.set(n.x, CK.heightAt(n.x, n.z), n.z); n.h.g.rotation.y = Math.atan2(dx, dz); R.animHero(n.h, sp, dt, false); return d; };
  const step = dt => {
    const tw = W.town, P = W.P; if (!tw || !tw.ck || !P || W.paused) return;
    if (tw.room) { if (R.crimeStep) R.crimeStep(dt, tw.watchers, tw); return; }   // 店裡：店員看得到你；通緝中躲在店裡，看不到你的時間一久星星就退
    if (R.crimeStep) R.crimeStep(dt, tw.watchers, tw);
    if (R.pickStep) R.pickStep(dt);
    if (R.vigTick) R.vigTick(dt, tw, P);
    // 衛兵：沒在追的時候，巡邏的照路線走、站崗的回崗位（vigilance.js 的 goHome 只管有 V.home 的）
    tw.watchers.forEach(n => {
      if (!n.guard || n.off) return;
      if (!n.chase && !n.vg) {
        if (n.patrol) { const q = n.patrol[n.pi]; if (moveTo(n, q[0], q[1], n.speed || 2.2, dt) < 0.5) n.pi = (n.pi + 1) % n.patrol.length; }
        else if (n.post) { if (moveTo(n, n.post[0], n.post[1], 2.6, dt) < 0.4) { n.h.g.rotation.y = n.post[2]; } }
        else R.animHero(n.h, 0, dt, false);
      }
      n.h.g.position.y = CK.heightAt(n.x, n.z);
    });
    // 路人：嚇跑（往外跑幾秒）→ 走回原本的路線
    (tw.walkers || []).forEach(n => {
      if (n.flee > 0) { n.flee -= dt; if (n.tx != null) moveTo(n, n.tx, n.tz, 4.2, dt); if (n.flee <= 0) n.back = true; return; }
      if (n.back) { const [x, z] = CK.along(n.path, n.acc, n.L, n.s, false); if (moveTo(n, x, z, 2.2, dt) < 0.5) n.back = false; }
    });
  };
  const ts0 = R.townStep;
  R.townStep = dt => { ts0(dt); try { step(dt); } catch (e) { console.warn('[ckcrime]', e); } };
  // ---------- 被抓：從這座城的衛兵崗位出來（不是東鶴） ----------
  const ap0 = R.arrestPunish;
  if (ap0) R.arrestPunish = (heat, g) => {
    const tw = W.town, ck = tw && tw.ck, inRoom = tw && tw.room;
    ap0(heat, g);
    if (!ck) return;
    const b = document.getElementById('pn-x'); if (!b) return;
    const city = (inRoom ? tw.outer.town : tw), post = (city.guardPosts && city.guardPosts[0]) || [city.city.spawn[0], city.city.spawn[1]];
    b.onclick = () => { R.closeSheet(); R.S.pendingHour = 9; R.S.hour = 9; CK.enter(ck, { at: [post[0], post[1] + 2, 0] }); R.toast('早上九點。衛兵所的門在背後關上了。'); };
  };
})(window.R);
