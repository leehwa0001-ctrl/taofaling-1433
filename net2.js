// 多人連線第二階段（2026-10-05 作者定案；做法寫在 連線報告.md 第六節）
// 1. 房主決定遺跡生物＋打怪同步：
//    - 房主每生一隻（R.spawnEnemy）就給編號 e.nid，人數加成在這裡乘（每多一人生命 +50%），下一次送訊息時把「生出來了」送出去。
//    - 隊員自己生的都是「替身」：馬上從 W.enemies、場景拿掉；收到房主的資料再找同一種、同一間房（或 4 公尺內）的替身接手（別的地方拿著的參照才會對），
//      找不到就照原本的方法生一隻。這些叫「鏡像」（e.mirror）：不跑 AI，位置、血量照房主每 0.1 秒的快照內插。
//    - 隊員打到鏡像：自己的加成、暴擊、傷害數字照算，把實際扣的血、暈眩／緩速／燃燒／定身／詛咒、擊退送給房主；房主直接扣血（不再呼叫 R.hurtEnemy）。
//    - 打倒：鏡像的血到 0 先留 1，等房主送「倒下了」才跑自己的 R.killEnemy——經驗、魔力水晶、掉落在自己的遊戲裡算（戰利品各自拿）。
//    - 房主的遺跡生物也會打別人：R.pickTarget 把別人的人物（net.js 的 N.remotes）當目標；打到別人送 { 原始傷害 } 過去，那個人自己跑 R.hurtPlayer。
//    - 遺跡生物的子彈、房主 R.updateEnemies 裡的預警特效（R.fx）原樣轉送；隊員那邊的子彈只打得到自己。
//    - 隊員走進房間（R.enterRoom）、吵醒房間（R.wakeRoom）轉給房主跑；剛到一層向房主要一次整層的遺跡生物。
// 2. 寶箱：誰開都一樣——開了就送出去，別人那邊的同一個寶箱也打開，內容各自抽（掉在自己的畫面上）。
// 3. 倒下：還有隊友站著的時候，倒下不會馬上結束，躺著等隊友扶（走過去按空白鍵）；45 秒沒人扶、或大家都倒了，才真的倒下。
// 4. 換房主、斷線：房主離開或斷線，伺服器換下一個人當房主——那個人的鏡像變成自己的遺跡生物，繼續跑；
//    斷線的人 30 秒內連回來（net.js）就照新房主的資料重來。房主的分頁在背景時，用 Worker 的計時器繼續跑遊戲（瀏覽器在背景不跑畫面）。
// - 訊息都每 0.1 秒打包成一則（伺服器每條連線每秒最多 40 則）：房主 { k: 'h' }、隊員 { k: 'g' }，都帶 rid（run.coop.seed）、f、n（第幾次換樓層），對不上的丟掉。
// 放在 net.js 後面（所有包 R.spawnEnemy、R.hurtEnemy、R.killEnemy、R.updateEnemies、R.allyHit、R.onPlayerDown 的檔案後面）。
(function (R) {
  const W = () => R.W, N = R.net; if (!N) return;
  const run0 = () => { const run = W().run; return run && run.coop && !run.coop.solo && !run.done && N.room ? run : null; };
  const host = () => { const r = run0(); return r && r.coop.host ? r : null; };
  const guest = () => { const r = run0(); return r && !r.coop.host ? r : null; };
  const tag = run => ({ rid: run.coop.seed, f: run.floor, n: run.coop.n });
  const r1 = v => Math.round((+v || 0) * 10) / 10;
  const nameOf = id => { const m = (N.members || []).find(x => x.id === id); return m ? m.name : '隊友'; };
  const hpK = () => 1 + 0.5 * Math.max(0, (N.members || []).length - 1);   // 每多一人生命 +50%
  const STK = ['stun', 'slow', 'burn', 'root', 'curse'];

  // 這一層的編號表：房主是自己的遺跡生物，隊員是鏡像
  const M = { map: new Map(), seq: 0 };
  const H = { fresh: [], sent: new Set(), last: new Map(), q: null, t: 0, fullT: 0, inUE: false };
  const G = { standins: [], future: [], q: null, t: 0, needT: 0, need: false, adopting: false, sentRoom: new Set(), sentWake: new Set(), applyChest: false, orphanT: 0 };
  const newHQ = () => ({ s: [], d: [], sh: [], fx: [], dm: [] });
  const newGQ = () => ({ h: [], rm: [], wk: [] });
  H.q = newHQ(); G.q = newGQ();
  const resetFloor = () => { M.map = new Map(); M.seq = 0; H.fresh = []; H.sent = new Set(); H.last = new Map(); H.q = newHQ(); H.fullT = 0; G.standins = []; G.q = newGQ(); G.sentRoom = new Set(); G.sentWake = new Set(); G.need = true; G.needT = 0; G.orphanT = 3; };

  // ---------- 生出來 ----------
  const jsonOk = v => { try { return v != null && JSON.stringify(v).length < 2000; } catch (e) { return false; } };
  const info = e => ({ i: e.nid, id: e.id, x: r1(e.x), z: r1(e.z), y: r1(e.yaw), r: e.room == null ? -1 : e.room, ro: e.role || 0, hu: e.netHuman || 0, hp: Math.round(e.hp), hm: Math.round(e.hpMax), dm: r1(e.dmg), sp: r1(e.speed), ld: e.leader ? 1 : 0, dr: e.dormant ? 1 : 0, ag: e.aggro ? 1 : 0, nm: (e.def && e.def.name) || '' });
  const detach = e => { const w = W(), i = w.enemies.indexOf(e); if (i >= 0) w.enemies.splice(i, 1); if (e.m && e.m.g && e.m.g.parent) e.m.g.parent.remove(e.m.g); };
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const run = run0();
    if (!run || G.adopting) return se0(id, x, z, room, o);
    const e = se0(id, x, z, room, o); if (!e) return e;
    if (run.coop.host) {
      e.nid = ++M.seq; M.map.set(e.nid, e); H.fresh.push(e);
      if (o && jsonOk(o.human)) e.netHuman = o.human;
      const k = hpK(); if (k > 1) { e.hp *= k; e.hpMax *= k; }
    } else { detach(e); e.standin = true; G.standins.push(e); }   // 隊員：替身
    return e;
  };
  const setFrom = (e, s, first) => {
    e.hp = Math.max(1, s.hp); e.hpMax = s.hm; e.dmg = s.dm; e.speed = s.sp; e.room = s.r; e.leader = !!s.ld; e.dormant = !!s.dr; e.aggro = !!s.ag;
    e.tx = s.x; e.tz = s.z; e.tyaw = s.y || 0;   // 已經有的（例如重新連線後要的整層資料）：往房主的位置走
    if (first) { e.x = s.x; e.z = s.z; e.yaw = e.tyaw; if (e.m && e.m.g) e.m.g.position.set(e.x, 0, e.z); }
    if (s.nm && e.def && e.def.name !== s.nm) e.netName = s.nm;
  };
  const adopt = s => {
    const w = W(); if (!w.scene || !s || !R.ENEMIES[s.id]) return;
    let e = M.map.get(s.i);
    if (e && !e.dead) { setFrom(e, s); return; }
    let bi = -1, bd = 1e9;
    G.standins.forEach((x, k) => { if (x.id !== s.id || x.dead) return; const d = Math.hypot(x.x - s.x, x.z - s.z); if (((s.r >= 0 && x.room === s.r) || d < 4) && d < bd) { bd = d; bi = k; } });
    if (bi >= 0) { e = G.standins[bi]; G.standins.splice(bi, 1); }
    else {
      G.adopting = true;
      try { e = R.spawnEnemy(s.id, s.x, s.z, s.r, { quiet: true, role: s.ro || undefined, human: s.hu || undefined }); } catch (err) { console.warn('[net2] adopt', s.id, err); } finally { G.adopting = false; }
      if (!e) return;
    }
    e.standin = false; e.mirror = true; e.nid = s.i; e.dead = false; e.netDie = false; e.st = e.st || { burn: 0, slow: 0, stun: 0, root: 0, curse: 0 };
    setFrom(e, s, true);
    if (!w.enemies.includes(e)) w.enemies.push(e);
    if (e.m && e.m.g && !e.m.g.parent) w.scene.add(e.m.g);
    M.map.set(s.i, e);
  };

  // ---------- 房主：快照、送出去 ----------
  const snapOf = e => [e.nid, Math.round(e.x * 10), Math.round(e.z * 10), Math.round((e.yaw || 0) * 100), Math.max(0, Math.round(e.hp)), Math.round(((e.m && e.m.g && e.m.g.position.y) || 0) * 10),
    (e.under ? 2 : 0) | (e.invuln ? 8 : 0) | (e.dormant ? 16 : 0) | (e.m && e.m.g && e.m.g.visible === false ? 32 : 0)];
  const flushHost = run => {
    const q = H.q, msg = Object.assign({ k: 'h' }, tag(run));
    // 漏網的：不是經過 R.spawnEnemy 最外層生的（例如 monsters2.js 成群的那幾隻用內層的生），也補編號、照樣乘人數加成
    W().enemies.forEach(e => { if (e.dead || e.nid) return; e.nid = ++M.seq; M.map.set(e.nid, e); H.fresh.push(e); const k = hpK(); if (k > 1) { e.hp *= k; e.hpMax *= k; } });
    H.fresh.forEach(e => { if (!e.dead && e.nid) q.s.push(e); }); H.fresh = [];
    if (q.s.length) { msg.s = q.s.splice(0, 120).filter(e => !e.dead).map(e => { H.sent.add(e.nid); return info(e); }); if (!msg.s.length) delete msg.s; }
    H.fullT -= 0.1; const full = H.fullT <= 0; if (full) H.fullT = 2;
    const ss = [];
    M.map.forEach((e, nid) => {
      if (e.dead) { M.map.delete(nid); return; }
      if (!H.sent.has(nid)) return;
      const s = snapOf(e), key = s.join(','); if (!full && H.last.get(nid) === key) return; H.last.set(nid, key); ss.push(s);
    });
    if (ss.length) msg.ss = ss;
    if (q.d.length) msg.d = q.d.splice(0);
    if (q.sh.length) msg.sh = q.sh.splice(0, 60);
    if (q.fx.length) msg.fx = q.fx.splice(0, 40);
    if (q.dm.length) msg.dm = q.dm.splice(0);
    if (full) msg.al = [...M.map.keys()].filter(nid => H.sent.has(nid));
    if (Object.keys(msg).length > 4) N.send(msg);
  };
  const dump = (run, to) => {
    const all = [...M.map.values()].filter(e => !e.dead);
    for (let i = 0; i < all.length || i === 0; i += 100) { const part = all.slice(i, i + 100); part.forEach(e => H.sent.add(e.nid)); N.send(Object.assign({ k: 'hd' }, tag(run), { s: part.map(info), last: i + 100 >= all.length ? 1 : 0 }), to); if (!all.length) break; }
  };
  // 房主那邊的遺跡生物倒下：告訴大家
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const g = guest();
    if (g && e && e.mirror && !e.netDie) return;   // 隊員：等房主說倒下了（血留 1 是 hitOut 在算完傷害之後做的）
    const was = e && !e.dead, r = ke0(e, by);
    if (was && e.dead && e.nid && host() && M.map.get(e.nid) === e) { H.q.d.push(e.nid); M.map.delete(e.nid); }
    return r;
  };
  // 子彈、預警特效
  const fi0 = R.fire;
  R.fire = o => {
    const s = fi0(o);
    if (o && o.owner === 'e' && host()) H.q.sh.push({ kind: o.kind, x: r1(o.x), z: r1(o.z), a: Math.round((o.a || 0) * 1000) / 1000, speed: r1(o.speed), dmg: r1(o.dmg), life: r1(o.life || 1.5), y: o.y != null ? r1(o.y) : undefined, grav: o.grav ? 1 : undefined, vy: o.vy != null ? r1(o.vy) : undefined, splash: o.splash || undefined, radius: o.radius || undefined, src: o.src && o.src.nid || undefined });
    return s;
  };
  const fxArgs = o => { if (!o || typeof o !== 'object') return {}; const out = {}; Object.keys(o).forEach(k => { const v = o[k]; if (v == null || typeof v === 'function') return; if (typeof v === 'object') { if (v.nid) out[k + 'N'] = v.nid; else if (Array.isArray(v) && v.length < 20 && v.every(x => typeof x === 'number')) out[k] = v; return; } out[k] = v; }); return out; };
  const fx0 = R.fx;
  R.fx = (kind, x, y, z, o) => {
    if (H.inUE && host() && kind !== 'spawn' && kind !== 'poof' && H.q.fx.length < 80) H.q.fx.push([kind, r1(x), r1(y), r1(z), fxArgs(o)]);
    return fx0(kind, x, y, z, o);
  };

  // ---------- 房主：遺跡生物也打別人 ----------
  const RT = new Map();   // 別人的人物當目標：{ ally, remote, x, z, ... }
  const syncRT = () => {
    const seen = new Set(), rm = N.remotes || new Map();
    rm.forEach((r, id) => {
      seen.add(id); let t = RT.get(id);
      if (!t) { t = { ally: true, remote: id, buff: {}, st: { def: 0 }, hp: 100, hpMax: 100, taunt: 0, invis: 0, iframe: 0, name: nameOf(id) }; RT.set(id, t); }
      t.x = r.x; t.z = r.z; t.y = r.y || 0; t.h = r.h; t.downed = t.dead = !!(r.h && r.h.down);
    });
    RT.forEach((t, id) => { if (!seen.has(id)) { t.downed = t.dead = true; RT.delete(id); } });
  };
  R.farFromAll = (e, d) => { const P = W().P; if (P && Math.abs(e.x - P.x) + Math.abs(e.z - P.z) <= d) return false; for (const t of RT.values()) if (!t.dead && Math.abs(e.x - t.x) + Math.abs(e.z - t.z) <= d) return false; return true; };
  // 地上畫圈的範圍招（各檔案自己的 targets()）也要打得到別人（2026-10-05 作者：讓範圍招也打得到其他玩家）：房主這邊把別人的人物交出去，
  //   打到的時候那些檔案照樣呼叫 R.hurtAlly（下面那段把傷害送給那個人）。隊員那邊是空的（遺跡生物的招由房主算）。
  R.netTargets = () => (host() ? [...RT.values()].filter(t => !t.downed && !t.dead) : []);
  const pt0 = R.pickTarget;
  R.pickTarget = e => {
    const best = pt0 ? pt0(e) : W().P; if (!host() || !RT.size) return best;
    const P = W().P; let b = best, bd = best && !best.dead && !best.downed ? Math.hypot(best.x - e.x, best.z - e.z) * (best === P ? 0.9 : 1) : 1e9;
    if (best && best.taunt > 0 && bd < 9) return best;
    RT.forEach(t => { if (t.downed) return; const d = Math.hypot(t.x - e.x, t.z - e.z); if (d < bd) { bd = d; b = t; } });
    return b;
  };
  const ha0 = R.hurtAlly;
  R.hurtAlly = (a, raw, src) => {
    if (a && a.remote != null) { if (host() && raw > 0 && !a.downed) H.q.dm.push([a.remote, r1(raw), src && src.nid || 0]); return; }
    return ha0 ? ha0(a, raw, src) : undefined;
  };
  const ue0 = R.updateEnemies;
  R.updateEnemies = dt => {
    const run = run0();
    if (run && run.coop.host) { H.inUE = true; try { return ue0(dt); } finally { H.inUE = false; } }
    if (!run) return ue0(dt);
    // 隊員：鏡像不跑 AI，照快照動；自己這邊冒出來的（不是鏡像）一律當替身拿掉，等房主的
    const w = W(), mir = w.enemies.filter(e => e.mirror && !e.dead);
    w.enemies.forEach(e => { if (!e.mirror && !e.dead) { if (e.m && e.m.g && e.m.g.parent) e.m.g.parent.remove(e.m.g); e.standin = true; G.standins.push(e); } });
    w.enemies = [];
    try { ue0(dt); } finally { w.enemies = w.enemies.concat(mir.filter(e => !e.dead && !w.enemies.includes(e))); }
    const k = 1 - Math.exp(-dt * 10);
    mir.forEach(e => {
      if (e.dead || !e.m || !e.m.g) return;
      e.t = (e.t || 0) + dt; e.flash = Math.max(0, (e.flash || 0) - dt); R.flash(e.m, e.flash);
      for (const s in e.st) e.st[s] = Math.max(0, e.st[s] - dt);
      const ox = e.x, oz = e.z;
      if (e.tx != null) { if (Math.hypot(e.tx - e.x, e.tz - e.z) > 6) { e.x = e.tx; e.z = e.tz; } else { e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k; } }
      if (e.tyaw != null) { const d = Math.atan2(Math.sin(e.tyaw - e.yaw), Math.cos(e.tyaw - e.yaw)); e.yaw += d * k; }
      const moving = Math.hypot(e.x - ox, e.z - oz) > 0.3 * dt;
      e.m.g.position.x = e.x; e.m.g.position.z = e.z; e.m.g.rotation.y = e.yaw; if (e.ty != null) e.m.g.position.y = e.ty;
      e.m.g.visible = !e.hidden;
      if (e.def.human) R.animHero(e.m, moving ? e.speed : 0, dt, e.def.ai === 'kite'); else R.animBeast(e.m, e.id, e.t, moving);
    });
  };

  // ---------- 房主收到隊員的：打到、進房間、吵醒、要整層 ----------
  const applyHit = (from, h) => {
    const e = M.map.get(h[0]); if (!e || e.dead) return;
    const d = +h[1] || 0;
    if (d > 0) { e.hp -= d; e.flash = 0.12; R.num && R.num(e.x, 1.8 * e.def.size + 0.6, e.z, Math.round(d), 'ally'); }
    e.aggro = true; e.provoked = true; e.st = e.st || {};
    STK.forEach((s, i) => { const v = +h[2 + i] || 0; if (v > (e.st[s] || 0)) e.st[s] = v; });
    if (h[7] || h[8]) { e.kx = (e.kx || 0) + (+h[7] || 0); e.kz = (e.kz || 0) + (+h[8] || 0); }
    if (e.dormant && R.wakeRoom) R.wakeRoom(e.room, e);
    if (e.hp <= 0) R.killEnemy(e, { remote: from });
  };
  const fromGuest = (from, d) => {
    const run = host(); if (!run || d.rid !== run.coop.seed || d.n !== run.coop.n) return;
    (d.h || []).forEach(h => applyHit(from, h));
    const F = W().F;
    (d.rm || []).forEach(i => { const r = F && F.rooms[i]; if (r && R.enterRoom) try { R.enterRoom(r); } catch (e) { console.warn('[net2] room', e); } });
    (d.wk || []).forEach(i => { if (!(i >= 0) || !R.wakeRoom) return; const by = W().enemies.find(e => !e.dead && e.room === i); if (by) R.wakeRoom(i, by); });
    if (d.nd) dump(run, from);
  };

  // ---------- 隊員：打到鏡像、進房間、吵醒 ----------
  const hitOut = (e, hp0, st0, kx0, kz0) => {
    const dealt = Math.max(0, hp0 - e.hp), st = STK.map(s => { const v = (e.st && e.st[s]) || 0; return v > (st0[s] || 0) + 0.01 ? r1(v) : 0; }), kx = r1((e.kx || 0) - kx0), kz = r1((e.kz || 0) - kz0);
    if (dealt > 0 || st.some(Boolean) || kx || kz) G.q.h.push([e.nid, Math.round(dealt * 10) / 10].concat(st, [kx, kz]));
    if (e.hp <= 0) e.hp = 1;
  };
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    if (!e || !e.mirror || e.dead || !guest()) return he0(e, raw, o);
    const hp0 = e.hp, st0 = Object.assign({}, e.st), kx0 = e.kx || 0, kz0 = e.kz || 0, d = he0(e, raw, o);
    hitOut(e, hp0, st0, kx0, kz0); return d;
  };
  const ah0 = R.allyHit;
  R.allyHit = (e, dmg, by) => {
    if (!e || !e.mirror || e.dead || !guest()) return ah0(e, dmg, by);
    const hp0 = e.hp, st0 = Object.assign({}, e.st), kx0 = e.kx || 0, kz0 = e.kz || 0, d = ah0(e, dmg, by);
    hitOut(e, hp0, st0, kx0, kz0); return d;
  };
  const er0 = R.enterRoom;
  R.enterRoom = r => { const res = er0(r); if (r && r.i != null && guest() && !G.sentRoom.has(r.i)) { G.sentRoom.add(r.i); G.q.rm.push(r.i); } return res; };
  const wr0 = R.wakeRoom;
  R.wakeRoom = (ri, by) => { const res = wr0(ri, by); if (ri >= 0 && guest() && !G.sentWake.has(ri)) { G.sentWake.add(ri); G.q.wk.push(ri); } return res; };
  const flushGuest = run => {
    const q = G.q, msg = Object.assign({ k: 'g' }, tag(run));
    if (q.h.length) msg.h = q.h.splice(0, 300);
    if (q.rm.length) msg.rm = q.rm.splice(0);
    if (q.wk.length) msg.wk = q.wk.splice(0);
    if (G.need && G.needT <= 0) { msg.nd = 1; G.need = false; G.needT = 2; }
    if (Object.keys(msg).length > 4 && N.host != null) N.send(msg, N.host);
  };

  // ---------- 隊員收到房主的 ----------
  const applySnap = a => {
    const e = M.map.get(a[0]); if (!e || e.dead) { G.need = true; return; }
    e.tx = a[1] / 10; e.tz = a[2] / 10; e.tyaw = a[3] / 100; if (a[4] > 0) e.hp = Math.max(1, Math.min(e.hpMax || a[4], a[4])); e.ty = a[5] / 10;
    const f = a[6] | 0; e.under = !!(f & 2); e.invuln = !!(f & 8); e.dormant = !!(f & 16); e.hidden = !!(f & 32);
  };
  const die = nid => { const e = M.map.get(nid); if (!e) return; M.map.delete(nid); if (e.dead) return; if (e.tx != null) { e.x = e.tx; e.z = e.tz; } e.netDie = true; e.hp = 0; try { R.killEnemy(e); } catch (err) { console.warn('[net2] die', err); } };
  const vanish = e => { e.dead = true; detach(e); };
  const prune = al => { const s = new Set(al); M.map.forEach((e, nid) => { if (!s.has(nid)) { M.map.delete(nid); vanish(e); } }); al.forEach(nid => { if (!M.map.has(nid)) G.need = true; }); };
  const shotIn = o => { const src = o.src ? M.map.get(o.src) : null; const p = Object.assign({}, o, { owner: 'e', src: src || null }); Object.keys(p).forEach(k => { if (p[k] === undefined) delete p[k]; }); try { R.fire(p); } catch (e) { } };
  const fxIn = f => { const o = Object.assign({}, f[4] || {}); for (const k of Object.keys(o)) { if (k.length > 1 && k.endsWith('N') && typeof o[k] === 'number') { const t = M.map.get(o[k]); if (!t) return; o[k.slice(0, -1)] = t; delete o[k]; } } try { R.fx(f[0], f[1], f[2], f[3], o); } catch (e) { } };
  const takeDmg = dm => { if (dm[0] !== N.me) return; const P = W().P; if (!P || P.dead) return; R.hurtPlayer(+dm[1] || 0, (dm[2] && M.map.get(dm[2])) || null); };
  const fromHost = (from, d) => {
    if (from !== N.host) return;
    const run = guest(); if (!run || d.rid !== run.coop.seed) return;
    if (d.n > run.coop.n) { G.future.push(d); if (G.future.length > 80) G.future.shift(); return; }
    if (d.n < run.coop.n || !W().F) return;
    (d.s || []).forEach(adopt);
    (d.ss || []).forEach(applySnap);
    (d.d || []).forEach(die);
    (d.sh || []).forEach(shotIn);
    (d.fx || []).forEach(fxIn);
    (d.dm || []).forEach(takeDmg);
    if (d.al) prune(d.al);
    if (d.k === 'hd' && d.last) G.orphanT = Math.min(G.orphanT, 1.5);
  };

  // ---------- 2. 寶箱：開了就大家都開了，內容各自抽 ----------
  const chestKey = c => Math.round(c.x * 2) + ',' + Math.round(c.z * 2);
  const uc0 = R.useChest;
  R.useChest = c => {
    const was = c && c.state, r = uc0(c), run = run0();
    if (run && c && was === 'closed' && c.state === 'open' && !G.applyChest) N.send(Object.assign({ k: 'ch' }, tag(run), { key: chestKey(c) }));
    return r;
  };
  const chestIn = (from, d) => {
    const run = run0(), F = W().F; if (!run || !F || d.rid !== run.coop.seed || d.n !== run.coop.n) return;
    const c = (F.chests || []).find(x => x.state === 'closed' && chestKey(x) === d.key); if (!c) return;
    G.applyChest = true; c.searched = 1;
    try { R.useChest(c); } finally { G.applyChest = false; }
    R.toast && R.toast(nameOf(from) + ' 開了寶箱：你也拿到自己的一份（掉在寶箱前面）。', '#E8C04A');
  };

  // ---------- 3. 倒下、扶起 ----------
  const upMates = () => { let n = 0; (N.remotes || new Map()).forEach(r => { if (r.h && !r.h.down) n++; }); return n; };
  const pd0 = R.onPlayerDown;
  let realDown = false;
  R.onPlayerDown = (...a) => {
    const run = run0(), P = W().P;
    const saves = P && ((P.pv && P.pv.last && !P.pvLast) || P.reviveCharge > 0);   // 不屈、神佑、主教的復活先用
    if (run && P && !realDown && !saves && !P.netDown && upMates() > 0) {
      P.dead = true; P.hp = 0; P.netDown = { t: 45, lone: 0, show: 0 }; P.dashT = 0; if (P.h) P.h.roll = 0; R.setDown && R.setDown(P.h, true);
      R.banner && R.banner('倒下了', '等隊友過來扶你（45 秒內）'); R.sfx && R.sfx('hurt');
      return;
    }
    return pd0(...a);
  };
  const bleedOut = P => { P.netDown = null; P.dead = false; P.hp = 0; realDown = true; try { R.onPlayerDown(); } finally { realDown = false; } };
  const revived = from => {
    const P = W().P; if (!P || !P.netDown) return;
    P.netDown = null; P.dead = false; P.hp = Math.max(1, Math.round(P.hpMax * 0.35)); P.iframe = 2; R.setDown && R.setDown(P.h, false);
    R.banner && R.banner('被扶起來了', nameOf(from) + ' 把你拉了起來'); R.sfx && R.sfx('levelup');
  };
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => {
    const it = ni0(), run = run0(), P = W().P; if (!run || !P || P.dead) return it;
    let best = null, bd = 1.9;
    (N.remotes || new Map()).forEach((r, id) => { if (!r.h || !r.h.down) return; const d = Math.hypot(r.x - P.x, r.z - P.z); if (d < bd) { bd = d; best = { x: r.x, z: r.z, r: 1.9, label: '扶起 ' + nameOf(id), act: () => { N.send(Object.assign({ k: 'rv' }, tag(run)), id); R.toast && R.toast('扶起了 ' + nameOf(id) + '。', '#7FE0FF'); } }; } });
    if (!best) return it; if (!it) return best;
    return Math.hypot(it.x - P.x, it.z - P.z) <= bd ? it : best;
  };

  // ---------- 4. 換房主、斷線回來 ----------
  const promote = run => {
    run.coop.host = true;
    M.map.forEach(e => { e.mirror = false; e.netDie = false; if (e.tx != null) { e.x = e.tx; e.z = e.tz; } });
    M.seq = Math.max(0, ...M.map.keys()); H.sent = new Set(M.map.keys()); H.last = new Map(); H.fullT = 0; H.fresh = []; H.q = newHQ();
    G.standins = []; G.future = [];
    W().enemies.forEach(e => { if (!e.dead && !e.nid) { e.nid = ++M.seq; M.map.set(e.nid, e); H.fresh.push(e); } });
    R.banner && R.banner('你成為房主', '遺跡生物、樓層照你這邊的走');
  };
  const demote = run => {
    run.coop.host = false;
    W().enemies.forEach(e => { if (e.dead) return; if (e.nid && M.map.get(e.nid) === e) e.mirror = true; else vanish(e); });
    G.need = true; G.needT = 0; G.future = [];
  };
  N.onServer2 = o => {
    const run = run0(); if (!run) return;
    if (o.t === 'host') { if (o.id === N.me && !run.coop.host) promote(run); else if (o.id !== N.me && run.coop.host) demote(run); }
  };
  N.onRoom = (o, back) => {
    const run = run0(); if (!back || !run) return;
    if (run.coop.host && o.host !== N.me) demote(run);
    else if (!run.coop.host) { G.need = true; G.needT = 0; }
  };
  N.onMsg2 = (from, d) => {
    if (!d || typeof d !== 'object') return;
    try {
      if (d.k === 'h' || d.k === 'hd') fromHost(from, d);
      else if (d.k === 'g') fromGuest(from, d);
      else if (d.k === 'ch') chestIn(from, d);
      else if (d.k === 'rv') { const run = run0(); if (run && d.rid === run.coop.seed) revived(from); }
    } catch (e) { console.warn('[net2]', d.k, e); }
  };

  // ---------- 換樓層 ----------
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    if (W().run && W().run.coop) resetFloor();
    const r = lf0(f, o), run = run0();
    if (run && !run.coop.host) {
      const fut = G.future.filter(d => d.rid === run.coop.seed && d.n === run.coop.n); G.future = G.future.filter(d => d.rid === run.coop.seed && d.n > run.coop.n);
      fut.forEach(d => fromHost(N.host, d));
    }
    const P = W().P; if (P && P.netDown) { P.netDown = null; P.dead = false; P.hp = Math.max(1, Math.round(P.hpMax * 0.2)); R.setDown && R.setDown(P.h, false); }   // 換層的時候還躺著：跟著站起來
    return r;
  };

  // ---------- 每一格 ----------
  let ticker = null, lastTick = 0;
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), run = run0(), P = W().P;
    if (P && P.netDown) {
      const nd = P.netDown; nd.t -= dt; nd.lone = !run || upMates() === 0 ? nd.lone + dt : 0;
      nd.show -= dt; if (nd.show <= 0) { nd.show = 5; if (nd.t > 0 && R.toast) R.toast('倒下了：等隊友扶（還有 ' + Math.ceil(nd.t) + ' 秒）', '#FF9A6A'); }
      if (nd.t <= 0 || nd.lone > 3) bleedOut(P);
    }
    if (!run || !run.coop.host) RT.clear();
    if (!run) return r;
    if (run.coop.host) {
      if (!ticker) startTicker();   // 房主：分頁切到背景時接著跑（onTick 只在背景的時候動）
      syncRT();
      H.t += dt; if (H.t >= 0.1) { H.t = 0; try { flushHost(run); } catch (e) { console.warn('[net2] flush', e); } }
    } else {
      G.needT -= dt; G.t += dt;
      if (G.orphanT > 0) { G.orphanT -= dt; if (G.orphanT <= 0) { G.standins.forEach(e => { e.dead = true; }); G.standins = []; } }   // 一直沒接手的替身：當作沒有（守門的那群才不會卡住）
      if (G.t >= 0.1) { G.t = 0; flushGuest(run); }
    }
    return r;
  };

  // ---------- 房主的分頁在背景：用 Worker 的計時器繼續跑（瀏覽器在背景不跑畫面，大家會卡住） ----------
  const onTick = () => {
    if (!document.hidden || !host()) { lastTick = 0; return; }
    const now = performance.now(), dt = lastTick ? Math.min(0.25, (now - lastTick) / 1000) : 0.1; lastTick = now;
    try { R.step(dt); } catch (e) { console.warn('[net2] tick', e); }
  };
  const startTicker = () => {
    if (ticker) return;
    try { const url = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},100)'], { type: 'text/javascript' })); ticker = new Worker(url); ticker.onmessage = onTick; }
    catch (e) { ticker = { iv: setInterval(onTick, 100) }; }
  };
  document.addEventListener('visibilitychange', () => { lastTick = 0; if (document.hidden && host()) startTicker(); });
  R.net2 = { M, H, G, RT };   // 除錯用
})(window.R);
