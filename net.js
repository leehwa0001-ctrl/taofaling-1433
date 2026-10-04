// 多人連線（第一階段，2026-10-02 作者要的：自己架伺服器、一起下遺跡、一間房最多 4 個人）
// - 伺服器在 server/（只轉送訊息）。網址：網址列 ?server=wss://… 會記住；本機開的時候用 ws://localhost:8787；線上版用 PROD。
// - 公會登記處（同行的勇者下面）：開房、輸入房號加入、離開。
// - 房主在告示板選遺跡出發：房裡的人一起進去（委託書自動接下）。樓層用同一個種子長（net-rng.js 的 R.withSeed），
//   上下樓跟著房主走；房主回到地面之後，其他人自己碰回歸水晶回去。
// - 看得到彼此：位置、方向、出手、翻滾、倒下（每秒 10 次）；頭上有名字。
// - 第一階段還沒做：遺跡生物、寶箱、掉落各算各的（第二階段改成房主決定遺跡生物）。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const PROD = 'wss://taofaling-1433.1433.workers.dev';   // Cloudflare（server-cf/，2026-10-05 上線）
  const LS = 'tf-net-server';
  const PROTOCOL = '1433-net-2';
  // https://… 也收（Render 給的網址是 https）：換成 wss://
  const wsOf = u => String(u || '').trim().replace(/^http(s?):\/\//, 'ws$1://').replace(/\/+$/, '');
  const serverUrl = () => wsOf(serverUrl0());
  const serverUrl0 = () => {
    try { const q = new URLSearchParams(location.search).get('server'); if (q) localStorage.setItem(LS, q); const v = localStorage.getItem(LS); if (v) return v; } catch (e) { }
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'ws://localhost:8787' : PROD;
  };

  const N = R.net = { ws: null, room: null, me: null, host: null, members: [], busy: '' };
  const isHost = () => !!N.room && N.me === N.host;
  const nameOf = id => { const m = N.members.find(x => x.id === id); return m ? m.name : '有人'; };
  N.isHost = isHost; N.inRoom = () => !!N.room;
  const raw = o => { if (N.ws && N.ws.readyState === 1) N.ws.send(JSON.stringify(o)); };
  N.send = (d, to) => raw({ t: 'msg', d, to });
  const coop = () => { const run = W().run; return run && run.coop && !run.coop.solo && !run.done ? run : null; };

  // 自己的名片：名字、職業、武器、長相、身上的護甲（別人畫你用）
  const myCard = () => {
    const s = S(), P = W().P, cls = s.cls, eq = R.equipped ? R.equipped(cls) : null, slim = {};
    if (eq) ['body', 'head', 'feet'].forEach(k => { if (eq[k] && eq[k].base) slim[k] = { base: eq[k].base }; });
    let weapon = P && P.item && P.item.base; if (!weapon) { try { weapon = R.calcPlayer(cls).item.base; } catch (e) { weapon = 'sword'; } }
    return { name: s.name || '無名的勇者', look: { cls, weapon, look: R.playerLook ? R.playerLook() : null, eq: slim } };
  };

  // ---------- 連線 ----------
  // 一次只允許一個開房／加入請求；舊 socket 的事件不能動到新連線。
  let connecting = null, cancelConnect = null, request = null, requestTimer = null;
  const finishRequest = () => { request = null; clearTimeout(requestTimer); requestTimer = null; };
  const disconnect = why => {
    const ws = N.ws; N.ws = null;
    if (cancelConnect) cancelConnect(new Error(why || '已取消連線。'));
    connecting = null; cancelConnect = null; finishRequest();
    if (ws) try { ws.close(); } catch (e) { }
    drop(why);
  };
  const connect = () => {
    if (N.ws && N.ws.readyState === 1) return Promise.resolve(N.ws);
    if (connecting) return connecting;
    const url = serverUrl();
    if (!url) return Promise.reject(new Error('尚未設定連線網址，請在「換伺服器」填入《討伐令 1433》的伺服器網址。'));
    let ws; try { ws = new WebSocket(url); } catch (e) { return Promise.reject(new Error('伺服器網址不對：' + url)); }
    N.ws = ws; N.busy = '連線中……'; refresh();
    let opened = false, settled = false, resolve, reject;
    const promise = new Promise((ok, no) => { resolve = ok; reject = no; });
    connecting = promise;
    const settle = err => {
      if (settled) return; settled = true; clearTimeout(wake); clearTimeout(giveUp);
      if (connecting === promise) { connecting = null; cancelConnect = null; }
      if (err) reject(err); else resolve(ws);
    };
    cancelConnect = settle;
    const wake = setTimeout(() => { if (N.ws === ws && !opened) { N.busy = '伺服器仍在連線中，請稍候……'; refresh(); } }, 3000);
    const giveUp = setTimeout(() => { if (N.ws === ws && !opened) disconnect('伺服器一直沒有回應（' + url + '）。'); }, 75000);
    ws.onopen = () => { if (N.ws !== ws) { ws.close(); return; } opened = true; settle(); };
    ws.onerror = () => { if (N.ws === ws && !opened) disconnect('連不上伺服器（' + url + '）。'); };
    ws.onclose = () => {
      if (N.ws !== ws) return;
      N.ws = null; settle(new Error('伺服器在連線完成前關閉了連線。')); finishRequest();
      drop(opened && N.room ? '和伺服器斷線了。' : '');
    };
    ws.onmessage = ev => {
      if (N.ws !== ws) return;
      let o; try { o = JSON.parse(ev.data); } catch (e) { return; }
      if (o && typeof o === 'object' && !Array.isArray(o)) onServer(o);
    };
    return promise;
  };
  const act = o => {
    if (request) return request.promise;
    const token = {}; request = token;
    token.promise = connect().then(ws => {
      if (request !== token || N.ws !== ws || ws.readyState !== 1) return;
      N.busy = o.t === 'create' ? '正在開房……' : '正在加入房間……'; refresh();
      requestTimer = setTimeout(() => { if (request === token) { disconnect('伺服器沒有回覆房間請求。'); R.toast('伺服器沒有回覆房間請求，請重新連線。', '#FF9A6A'); } }, 10000);
      ws.send(JSON.stringify(Object.assign(o, myCard(), { v: PROTOCOL })));
    }, e => { if (request === token || !request) { finishRequest(); N.busy = ''; R.toast(e.message, '#FF9A6A'); refresh(); } });
    return token.promise;
  };
  N.create = () => act({ t: 'create' });
  N.join = code => { code = String(code || '').trim().toUpperCase(); if (!/^[A-Z]{4}$/.test(code)) { R.toast('房號是 4 個英文字母。'); return; } return act({ t: 'join', code }); };
  N.leave = () => disconnect('離開了房間。');
  N.setServer = value => {
    const url = wsOf(value);
    if (url) { try { const u = new URL(url); if (!['ws:', 'wss:'].includes(u.protocol) || u.username || u.password || u.hash || (location.protocol === 'https:' && u.protocol !== 'wss:')) throw Error(); } catch (e) { R.toast('請填有效的連線網址；線上版需要 wss:// 或 https://。'); return false; } }
    try {
      if (url) localStorage.setItem(LS, url); else localStorage.removeItem(LS);
      // 分享網址的舊參數不能每次又蓋回玩家剛改的設定。
      const page = new URL(location.href); page.searchParams.delete('server'); history.replaceState(null, '', page.href);
    } catch (e) { R.toast('瀏覽器無法儲存伺服器設定。'); return false; }
    disconnect('已更換伺服器，請重新開房或加入。'); refresh(); return true;
  };

  // 離開房間（自己離開、房主走了、斷線）：遺跡裡的人變回一個人，樓層不再跟著別人
  const drop = why => {
    const had = !!N.room; finishRequest();
    N.room = null; N.me = null; N.host = null; N.members = []; N.busy = '';
    clearRemotes(); const run = W().run; if (run && run.coop) run.coop.solo = true;
    pending = null; lastFloor = null; guestGo = false; cks.mine = {}; cks.host = {};
    if (had && why) R.toast(why, '#FFB45A');
    refresh();
  };

  const onServer = o => {
    // 別的遊戲的伺服器（例如 TOD 格鬥遊戲的房間伺服器會先送 { type: 'connected' }）：講清楚、斷線
    if (o && o.type && !o.t) { N.busy = ''; R.toast('這個網址是別的遊戲的伺服器，不是討伐令 1433 的（' + serverUrl() + '）。', '#FF9A6A'); try { N.ws.close(); } catch (e) { } return; }
    if (o.t === 'room') {
      if (o.v !== PROTOCOL) { disconnect('伺服器版本不相容。'); R.toast('伺服器版本不相容，請更新伺服器和遊戲。', '#FF9A6A'); return; }
      finishRequest();
      N.room = o.code; N.me = o.you; N.host = o.host; N.members = o.members || []; N.busy = '';
      R.toast(isHost() ? '開好房間了：房號 ' + o.code + '。把房號告訴朋友。' : '加入了 ' + nameOf(N.host) + ' 的房間。', '#7FE0FF');
    } else if (o.t === 'join') {
      N.members.push(o.member); R.toast(o.member.name + ' 加入了房間。', '#7FE0FF');
      if (isHost() && coop()) N.send({ k: 'busy' }, o.member.id);   // 房主已經在遺跡裡：下一趟再一起
    } else if (o.t === 'leave') {
      R.toast(nameOf(o.id) + ' 離開了房間。', '#FFB45A'); N.members = N.members.filter(m => m.id !== o.id); dropRemote(o.id);
    } else if (o.t === 'closed') drop(o.why);
    else if (o.t === 'err') { finishRequest(); N.busy = ''; R.toast(o.msg, '#FF9A6A'); }
    else if (o.t === 'msg') onMsg(o.from, o.d || {});
    refresh();
  };

  // ---------- 一起出發 ----------
  let pending = null, guestGo = false, lastFloor = null;
  const sr0 = R.startRun;
  R.startRun = id => {
    const site = R.SITES.find(s => s.id === id);
    if (N.room && !isHost() && !guestGo && site && (site.kind === 'ruin' || site.kind === 'hunt')) { R.toast('你在 ' + nameOf(N.host) + ' 的房間裡：由房主選遺跡出發（或先在登記處離開房間）。'); return; }
    return sr0(id);
  };
  // 房主選好遺跡：房裡的人收到之後自己出發（委託書直接接下）
  const guestStart = d => {
    if (W().run && !W().run.done) { R.toast(nameOf(N.host) + ' 出發去了' + d.name + '，你還在遺跡裡。', '#FFB45A'); return; }
    pending = d; guestGo = true; lastFloor = null; cks.mine = {}; cks.host = {};
    R.toast(nameOf(N.host) + ' 出發去了' + d.name + '，跟上！', '#7FE0FF');
    if (R.closeSheet) try { R.closeSheet(); } catch (e) { }
    const hm = $('hub-modal'); if (hm) hm.hidden = true;
    R.startRun(d.site);
    let tries = 0; const accept = () => { const b = $('tk-go'); if (b && b.offsetParent) { b.click(); return; } if (++tries < 20 && guestGo && pending === d) setTimeout(accept, 100); };
    setTimeout(accept, 0);
    setTimeout(() => { if (pending === d) { pending = null; guestGo = false; R.toast('未能跟隨出發，請確認委託條件後重新組隊。'); } }, 6000);
  };
  // 真的開始了（W.run 剛建好、還沒長第一層）：房主記下種子告訴大家；其他人照房主的設定
  const sp0 = R.startParty;
  R.startParty = run => {
    const result = sp0(run);
    if (N.room && isHost()) {
      cks.mine = {}; cks.host = {}; lastFloor = null;
      run.coop = { seed: (R.nativeRandom() * 4294967296) >>> 0, n: 0, host: true };
      N.send({ k: 'run', site: run.site.id, name: run.site.name, seed: run.coop.seed, cfg: { env: run.env, reaction: run.reaction, floors: run.floors, tide: run.tide, pact: run.pact } });
    } else if (N.room && pending && pending.site === run.site.id) {
      Object.assign(run, pending.cfg); run.coop = { seed: pending.seed, n: 0, host: false }; pending = null; guestGo = false;
    }
    return result;
  };

  // ---------- 同一個種子長同一層 ----------
  const seedOf = (run, salt) => (run.coop.seed ^ Math.imul(run.coop.n + 1, 0x9E3779B1) ^ Math.imul(salt, 0x85EBCA77)) >>> 0;
  const gf0 = R.genFloor;
  R.genFloor = (run, f) => run && run.coop ? R.withSeed(seedOf(run, 1), () => gf0(run, f)) : gf0(run, f);
  const bf0 = R.buildFloor;
  R.buildFloor = (sc, run, F) => run && run.coop ? R.withSeed(seedOf(run, 2), () => bf0(sc, run, F)) : bf0(sc, run, F);
  // 這一層長得一不一樣（地形和寶箱的位置）：房主的和自己的對不上就在 console 留話，方便查
  const checksum = F => { let h = 2166136261; const T = F.tile && F.tile.T; if (T) for (let i = 0; i < T.length; i++) h = Math.imul(h ^ T[i], 16777619); (F.chests || []).forEach(c => { h = Math.imul(h ^ Math.round((c.x || 0) * 10) ^ Math.round((c.z || 0) * 10) << 8, 16777619); }); return h >>> 0; };
  const cks = { mine: {}, host: {} };
  const compare = n => { const a = cks.mine[n], b = cks.host[n]; if (a == null || b == null) return; if (a !== b) { console.warn('[net] 這一層和房主的不一樣', n, a, b); N.leave(); R.banner('地圖不同步，已離開連線房間', '請所有人重新整理遊戲後再組隊；這一趟改為單人'); } delete cks.mine[n]; delete cks.host[n]; };

  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    o = o || {}; const run = W().run;
    if (run && run.coop && !run.coop.solo && !run.coop.host && !o.fresh && !o.netFollow) { R.toast('多人連線：由房主選擇樓層。'); return; }
    clearRemotes();   // 換場景：別人的人物跟著舊場景丟掉，收到位置再畫
    if (run && run.coop && !run.coop.solo) {
      if (run.coop.host) run.coop.n++;
      else if (o.fresh) run.coop.n = 1;
    }
    const r = lf0(f, o);
    if (run && run.coop && !run.coop.solo && W().F) {
      const ck = checksum(W().F); cks.mine[run.coop.n] = ck; if (!run.coop.host) compare(run.coop.n);
      if (run.coop.host) N.send({ k: 'floor', rid: run.coop.seed, f, up: !!o.up, n: run.coop.n, ck });
      else if (o.fresh && lastFloor && lastFloor.rid === run.coop.seed && lastFloor.n > 1) setTimeout(() => follow(lastFloor), 300);   // 房主已經往下走了：追上去
    }
    return r;
  };
  const follow = d => {
    const run = coop(); if (!run || run.coop.host || run.coop.seed !== d.rid || run.coop.n >= d.n) return;
    R.fade(() => { const r2 = coop(); if (!r2 || r2.coop.n >= d.n) return; r2.coop.n = d.n; R.loadFloor(d.f, { up: !!d.up, netFollow: true }); if (d.up) R.banner('跟著房主往回走', '遺跡一直在長：上一層已經不是來的時候的樣子'); });
  };
  // 上下樓跟著房主走（從入口走出去可以）
  const de0 = R.descend;
  R.descend = () => { const run = coop(); if (run && !run.coop.host) { R.toast('多人連線：上下樓跟著房主走。'); return; } return de0(); };
  const as0 = R.ascend;
  R.ascend = () => { const run = coop(), up = W().F && W().F.up; if (run && !run.coop.host && !(up && up.exit)) { R.toast('多人連線：上下樓跟著房主走。'); return; } return as0(); };
  // 回到地面
  const ex0 = R.extract;
  R.extract = how => {
    const run = coop(); if (run) N.send({ k: run.coop.host ? 'end' : 'bye', rid: run.coop.seed });
    return ex0(how);
  };
  const er0 = R.endRun;
  R.endRun = (...a) => { const run = W().run; if (run && run.coop && !run.coop.solo && !run.done) N.send({ k: 'bye', rid: run.coop.seed }); clearRemotes(); return er0(...a); };

  // ---------- 收到房裡的人的訊息 ----------
  const onMsg = (from, d) => {
    if (!d || typeof d !== 'object' || !N.members.some(m => m.id === from)) return;
    if (d.k === 'run' && from === N.host && Number.isInteger(d.seed) && R.SITES.some(s => s.id === d.site)) guestStart(d);
    else if (d.k === 'busy' && from === N.host) R.toast(nameOf(N.host) + ' 正在遺跡裡。等房主回到地面，下一趟一起出發。', '#FFB45A');
    else if (d.k === 'floor' && from === N.host) {
      const expected = coop() ? coop().coop.seed : pending && pending.seed;
      if (d.rid !== expected || !Number.isInteger(d.n) || d.n < 1 || !Number.isInteger(d.f) || d.f < 0 || d.f >= (coop() ? coop().floors : pending.cfg.floors)) return;
      lastFloor = d; cks.host[d.n] = d.ck; compare(d.n);
      const run = coop(); if (run && !run.coop.host && run.coop.seed === d.rid) follow(d);
    }
    else if (d.k === 'end' && from === N.host) { const run = coop(); if (run && !run.coop.host && run.coop.seed === d.rid) { run.coop.solo = true; clearRemotes(); R.banner(nameOf(N.host) + ' 回到地面了', '剩下的路自己走：碰回歸水晶就能回去'); } }
    else if (d.k === 'bye' && coop() && d.rid === coop().coop.seed) dropRemote(from);
    else if (d.k === 'p') presence(from, d);
  };

  // ---------- 看得到彼此 ----------
  const remotes = new Map();   // id → { h, x, z, tx, tz, yaw, sp, t, seq }
  // 頭上的名字：用 HTML 疊在畫面上（像素畫面縮小之後，畫在 3D 裡的字看不清楚）；樣式借 monlabel.js 的 .mtag
  const tagEl = name => {
    let layer = $('r-ptags'); if (!layer) { layer = document.createElement('div'); layer.id = 'r-ptags'; layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2'; const nums = $('r-nums'); nums.parentNode.insertBefore(layer, nums); }
    const el = document.createElement('div'); el.className = 'mtag'; el.innerHTML = '<b style="color:#FFE08A">' + esc(name) + '</b>'; layer.appendChild(el); return el;
  };
  let v3 = null;
  const placeTag = r => {
    if (!W().camera) return; v3 = v3 || new THREE.Vector3(); v3.set(r.x, r.y + 2.5, r.z).project(W().camera);
    if (v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.2) { r.tag.style.display = 'none'; return; }
    r.tag.style.display = ''; r.tag.style.transform = 'translate(' + Math.round((v3.x + 1) / 2 * innerWidth) + 'px,' + Math.round((1 - v3.y) / 2 * innerHeight) + 'px) translate(-50%,-100%)';
  };
  const makeRemote = (id, d) => {
    const TH = THREE, m = N.members.find(x => x.id === id) || {}, L = m.look || {}, cls = R.CLASSES[L.cls] ? L.cls : 'warrior', wp = L.weapon || 'sword';
    const h = R.makeHero(cls, wp, Object.assign({}, L.look || {}, { weapon: wp, shield: !!R.CLASSES[cls].shield }));
    if (L.eq && Object.keys(L.eq).length && R.dressHero) R.dressHero(h, L.eq);
    const ring = new TH.Mesh(new TH.TorusGeometry(0.55, 0.06, 4, 20), new TH.MeshBasicMaterial({ color: '#FFD24A' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; h.g.add(ring);
    h.g.position.set(d.x, d.y || 0, d.z); W().scene.add(h.g);
    return { h, tag: tagEl(m.name || '勇者'), x: d.x, z: d.z, tx: d.x, tz: d.z, y: d.y || 0, yaw: d.yaw || 0, sp: 0, t: 0, seq: d.a ? d.a[2] : 0 };
  };
  const dropRemote = id => { const r = remotes.get(id); if (!r) return; if (r.h.g.parent) r.h.g.parent.remove(r.h.g); r.tag.remove(); remotes.delete(id); };
  function clearRemotes() { [...remotes.keys()].forEach(dropRemote); }
  const presence = (from, d) => {
    const run = coop(); if (!run || d.rid !== run.coop.seed || d.f !== run.floor || d.n !== run.coop.n || !W().scene) { dropRemote(from); return; }
    if (![d.x, d.z, d.yaw].every(Number.isFinite) || (d.y != null && !Number.isFinite(d.y))) return;
    let r = remotes.get(from); if (!r) { r = makeRemote(from, d); remotes.set(from, r); }
    r.tx = d.x; r.tz = d.z; r.y = d.y || 0; r.yaw = d.yaw; r.sp = d.sp || 0; r.t = 0;
    if (d.a && d.a[2] !== r.seq) { r.seq = d.a[2]; R.swingAnim(r.h, d.a[0], d.a[1]); }
    if (d.r && !(r.h.roll > 0) && R.startRoll) R.startRoll(r.h, d.yaw, 0.32);
    if (!!d.d !== !!r.h.down) R.setDown(r.h, !!d.d);
  };
  // 每一幀：別人的人物往收到的位置滑過去；自己的位置每 0.1 秒送一次
  let sendT = 0, atkSeq = 0, lastAtk = null;
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const run = coop(); if (!run || !N.room) return;
    const k = 1 - Math.exp(-dt * 12);
    remotes.forEach((r, id) => {
      r.t += dt; if (r.t > 4) { dropRemote(id); return; }
      r.x += (r.tx - r.x) * k; r.z += (r.tz - r.z) * k;
      r.h.g.position.set(r.x, r.y, r.z); r.h.g.rotation.y = r.yaw; R.animHero(r.h, r.sp, dt, false); placeTag(r);
    });
    const P = W().P; if (!P || !P.h) return;
    if (P.h.atk && P.h.atk !== lastAtk) atkSeq++; lastAtk = P.h.atk;
    sendT -= dt; if (sendT > 0) return; sendT = 0.1;
    N.send({ k: 'p', rid: run.coop.seed, f: run.floor, n: run.coop.n, x: +P.x.toFixed(2), z: +P.z.toFixed(2), y: +(P.y || 0).toFixed(2), yaw: +P.h.g.rotation.y.toFixed(2), sp: P.still > 0 ? 0 : +(P.speed || 0).toFixed(1), a: P.h.atk ? [P.h.atk.wind, P.h.atk.dur, atkSeq] : null, r: P.h.roll > 0 ? 1 : 0, d: P.dead ? 1 : 0 });
  };

  // ---------- 公會登記處：多人連線 ----------
  const box = () => {
    const url = serverUrl();
    let h = '<h3>多人連線（測試中）</h3><p class="note">最多四個人一起下同一趟遺跡。房主在委託告示板選遺跡出發，房裡的人會跟著進去；上下樓跟著房主走。現在是第一階段：看得到彼此，遺跡生物、寶箱、掉落還是各算各的。</p>';
    if (N.busy) h += '<p class="note">' + esc(N.busy) + '</p>';
    if (!N.room) h += '<div class="row"><button type="button" class="btn pri" data-net="create">開房</button><input id="net-code" maxlength="4" placeholder="房號" autocomplete="off" style="width:5.5em;text-transform:uppercase;letter-spacing:.15em"><button type="button" class="btn" data-net="join">加入</button></div>';
    else h += '<p>房號 <b style="font-size:1.5em;letter-spacing:.2em">' + esc(N.room) + '</b>　' + (isHost() ? '你是房主' : '房主：' + esc(nameOf(N.host))) + '</p><ul class="loot">' + N.members.map(m => '<li>' + esc(m.name) + (m.look && R.CLASSES[m.look.cls] ? '・' + esc(R.CLASSES[m.look.cls].name) : '') + (m.id === N.host ? '（房主）' : '') + (m.id === N.me ? '（你）' : '') + '</li>').join('') + '</ul><div class="row"><button type="button" class="btn" data-net="leave">離開房間</button></div>';
    h += '<p class="note">伺服器：' + esc(url || '還沒有設定') + '　<button type="button" class="mini" data-net="server">換伺服器</button></p>';
    return h;
  };
  const bindBox = el => el.querySelectorAll('[data-net]').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.net;
      if (k === 'create') N.create();
      else if (k === 'join') N.join(($('net-code') || {}).value);
      else if (k === 'leave') N.leave();
      else if (k === 'server') { const v = prompt('連線伺服器的網址（wss://…；空白＝預設）', serverUrl()); if (v == null) return; N.setServer(v); }
    };
  });
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'); if (!body) return;
    const h3 = [...body.querySelectorAll('h3')].find(x => x.textContent === '同行的勇者'); if (!h3) return;
    let at = h3.nextElementSibling; while (at && at.tagName !== 'H3') at = at.nextElementSibling;   // 「同行的勇者」那一段的後面
    const sec = document.createElement('div'); sec.className = 'net-box'; sec.innerHTML = box(); bindBox(sec);
    h3.parentNode.insertBefore(sec, at);
    const inp = $('net-code'); if (inp) inp.onkeydown = e => { if (e.key === 'Enter') N.join(inp.value); };
  };
  // 房間的狀態變了：登記處開著的話重畫
  function refresh() { const b = $('hub-body'), sec = b && b.querySelector('.net-box'); if (sec) { sec.innerHTML = box(); bindBox(sec); const inp = $('net-code'); if (inp) inp.onkeydown = e => { if (e.key === 'Enter') N.join(inp.value); }; } }
})(window.R);
