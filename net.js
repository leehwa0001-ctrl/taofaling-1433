// 多人連線（第一階段，2026-10-02 作者要的：自己架伺服器、一起下遺跡、一間房最多 4 個人）
// - 伺服器在 server/（只轉送訊息）。網址：網址列 ?server=wss://… 會記住；本機開的時候用 ws://localhost:8787；線上版用 PROD。
// - 公會登記處（同行的勇者下面）：開房、輸入房號加入、離開。
// - 房主在告示板選遺跡出發：房裡的人一起進去（委託書自動接下）。樓層用同一個種子長（net-rng.js 的 R.withSeed），
//   上下樓跟著房主走；房主回到地面之後，其他人自己碰回歸水晶回去。
// - 看得到彼此：位置、方向、出手、翻滾、倒下（每秒 10 次）；頭上有名字。
// - 第一階段還沒做：遺跡生物、寶箱、掉落各算各的（第二階段改成房主決定遺跡生物）。
// - 第二階段（net2.js）：遺跡生物、寶箱、倒下都同步；這個檔多了：別人的位置表 N.remotes、不認得的訊息交給 N.onMsg2／N.onServer2、
//   斷線 180 秒內自動重新連線回原本的座位（指數退避；伺服器有 caps 才會）、房主換人（伺服器送 { t: 'host', id }）；用戶端心跳＋Worker 保活（換層卡住主線程也能 ping）。
//   換層加固：載入前後 ping、樓層訊息重送、校驗失敗先重同步再踢人、wantFloor 順便 dump。
//   連線優化：出站優先佇列（控制訊息立刻送、位置／狀態合併）、無 pong 主動重連、換層時暫緩位置包。
//   換層斷線專修（2026-10-05）：換層中不因校驗／無 pong 踢人；載入保活更密；換層中斷線靜默重連；dump／樓層訊息更穩。
//   房主權威地圖（2026-10-05）：房主推 fd 樓層資料；隊友套用、不再各自長出不同地圖；校驗不一致強制套用房主圖。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const PROD = 'wss://taofaling-1433.1433.workers.dev';   // Cloudflare（server-cf/，2026-10-05 上線）
  const LS = 'tf-net-server';
  const PROTOCOL = '1433-net-2';
  const HOLD_MS = 180000;   // 與伺服器座位保留時間一致（短暫斷線 3 分鐘內可重連）
  const BEAT_MS = 6000;     // 用戶端心跳：送文字 ping（CF／Node 都回 pong）
  const BEAT_BUSY_MS = 1500;// 換層載入中加快心跳（主因：換層斷線）
  const PONG_DEAD_MS = 90000; // 太久沒收到 pong：主動斷線走重連（換層卡住主線程時放寬）
  // https://… 也收（Render 給的網址是 https）：換成 wss://
  const wsOf = u => String(u || '').trim().replace(/^http(s?):\/\//, 'ws$1://').replace(/\/+$/, '');
  const serverUrl = () => wsOf(serverUrl0());
  const serverUrl0 = () => {
    try { const q = new URLSearchParams(location.search).get('server'); if (q) localStorage.setItem(LS, q); const v = localStorage.getItem(LS); if (v) return v; } catch (e) { }
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'ws://localhost:8787' : PROD;
  };

  const N = R.net = { ws: null, room: null, me: null, host: null, members: [], busy: '' };
  let floorBusy = false, floorGraceTimer = null;
  const markFloorBusy = on => {
    floorBusy = !!on;
    if (floorGraceTimer) { clearTimeout(floorGraceTimer); floorGraceTimer = null; }
  };
  // 換層載入結束後再寬限數秒：校驗／dump 仍視為換層中，不踢人、不因無 pong 關線
  const endFloorBusySoon = (ms) => {
    floorBusy = true;
    if (floorGraceTimer) clearTimeout(floorGraceTimer);
    floorGraceTimer = setTimeout(() => { floorBusy = false; floorGraceTimer = null; scheduleOut(); }, ms || 2500);
  };
  const isHost = () => !!N.room && N.me === N.host;
  const nameOf = id => { const m = N.members.find(x => x.id === id); return m ? m.name : '有人'; };
  N.isHost = isHost; N.inRoom = () => !!N.room;
  const raw = o => { if (N.ws && N.ws.readyState === 1) try { N.ws.send(JSON.stringify(o)); } catch (e) { } };
  // 出站優先：控制訊息立刻送；位置／狀態合併最新一則；戰鬥訊息排隊，避免換層瞬間塞爆
  const CTRL_K = new Set(['floor', 'run', 'end', 'busy', 'wantFloor', 'hd', 'bye', 'fd']);
  const HIGH_K = new Set(['h', 'g', 'hd', 'rv', 'aid', 'ch']);
  let outP = null, outPs = null, outQ = [], outTimer = null, outBurst = 0, outBurstAt = 0;
  const flushOut = () => {
    outTimer = null;
    if (!N.ws || N.ws.readyState !== 1) { outP = null; outPs = null; outQ = []; return; }
    const busy = floorBusy;
    const now = Date.now();
    if (now - outBurstAt > 1000) { outBurst = 0; outBurstAt = now; }
    // 每秒最多送 ~40 則非控制包（伺服器令牌桶 96；留給戰鬥／控制）
    const budget = 40;
    if (outP && !busy) { raw({ t: 'msg', d: outP }); outP = null; outBurst++; }
    if (outPs && !busy && outBurst < budget) { raw({ t: 'msg', d: outPs }); outPs = null; outBurst++; }
    while (outQ.length && outBurst < budget) {
      const item = outQ.shift();
      raw({ t: 'msg', d: item.d, to: item.to });
      outBurst++;
    }
    if (outQ.length || outP || outPs) outTimer = setTimeout(flushOut, 50);
  };
  const scheduleOut = () => { if (!outTimer) outTimer = setTimeout(flushOut, 0); };
  N.send = (d, to) => {
    if (!d || typeof d !== 'object' || typeof d.k !== 'string') return;
    if (CTRL_K.has(d.k)) { raw({ t: 'msg', d, to }); return; }   // 控制：立刻
    if (d.k === 'p' && to == null) { if (floorBusy) return; outP = d; scheduleOut(); return; }
    if (d.k === 'ps' && to == null) { if (floorBusy) return; outPs = d; scheduleOut(); return; }
    const pri = HIGH_K.has(d.k) ? 1 : 0;
    if (pri) outQ.unshift({ d, to }); else outQ.push({ d, to });
    if (outQ.length > 80) outQ.length = 80;   // 防爆：丟掉最舊的一般包
    scheduleOut();
  };
  const coop = () => { const run = W().run; return run && run.coop && !run.coop.solo && !run.done ? run : null; };

  // 自己的名片：名字、職業、武器、長相、身上的護甲（別人畫你用）
  const myCard = () => {
    const s = S(), P = W().P, cls = s.cls, eq = R.equipped ? R.equipped(cls) : null, slim = {};
    if (eq) ['body', 'head', 'feet'].forEach(k => { if (eq[k] && eq[k].base && !(R.gearHidden && R.gearHidden(k))) slim[k] = { base: eq[k].base }; });   // gearlook.js：設定成不顯示的不送
    let weapon = P && P.item && P.item.base; if (!weapon) { try { weapon = R.calcPlayer(cls).item.base; } catch (e) { weapon = 'sword'; } }
    return { name: s.name || '無名的勇者', look: { cls, weapon, look: R.playerLook ? R.playerLook() : null, eq: slim } };
  };

  // ---------- 連線 ----------
  // 一次只允許一個開房／加入請求；舊 socket 的事件不能動到新連線。
  let connecting = null, cancelConnect = null, request = null, requestTimer = null, rejoining = false, beatTimer = null, beatWorker = null, rejoinAttempt = 0, lastPongAt = 0, lastCloseWhy = '', rejoinGen = 0, silentRejoin = false;
  const finishRequest = () => { request = null; clearTimeout(requestTimer); requestTimer = null; };
  const stopBeat = () => {
    if (beatTimer) { clearTimeout(beatTimer); beatTimer = null; }
    if (beatWorker) { try { beatWorker.terminate(); } catch (e) { } beatWorker = null; }
  };
  const doPing = () => {
    const ws = N.ws; if (!ws || ws.readyState !== 1) return;
    try { ws.send('ping'); } catch (e) { }
    // 換層卡住主線程時 onmessage 收不到 pong——不要當成死線關掉（這是換層斷線主因之一）
    if (floorBusy || rejoining) return;
    const limit = PONG_DEAD_MS;
    if (N.room && lastPongAt && Date.now() - lastPongAt > limit) {
      lastCloseWhy = '心跳逾時，重新連線中……';
      try { ws.close(4000, 'pong-timeout'); } catch (e) { try { ws.close(); } catch (e2) { } }
    }
  };
  const startBeat = () => {
    stopBeat();
    lastPongAt = Date.now();
    const schedule = () => {
      beatTimer = setTimeout(() => {
        beatTimer = null; doPing();
        if (N.ws && N.ws.readyState === 1) schedule();
      }, floorBusy ? BEAT_BUSY_MS : BEAT_MS);
    };
    schedule();
    // Worker：換層卡住主線程時仍能 ping（和 net2 背景 ticker 同思路）
    try {
      const url = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},1200)'], { type: 'text/javascript' }));
      beatWorker = new Worker(url);
      beatWorker.onmessage = () => {
        if (!N.room) return;
        // 換層中：只送 ping、不檢查死線（主線程可能卡在 loadFloor）
        if (floorBusy) { const ws = N.ws; if (ws && ws.readyState === 1) try { ws.send('ping'); } catch (e) { } return; }
        doPing();
      };
    } catch (e) { }
  };
  const disconnect = why => {
    const ws = N.ws; N.ws = null; stopBeat();
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
    ws.onopen = () => { if (N.ws !== ws) { ws.close(); return; } opened = true; startBeat(); settle(); };
    ws.onerror = () => { if (N.ws === ws && !opened) { if (rejoining) { N.ws = null; settle(new Error('rejoin')); return; } disconnect('連不上伺服器（' + url + '）。'); } };
    ws.onclose = ev => {
      if (N.ws !== ws) return;
      N.ws = null; stopBeat(); settle(new Error('伺服器在連線完成前關閉了連線。')); finishRequest();
      const code = ev && ev.code, reason = (ev && ev.reason) || lastCloseWhy || '';
      lastCloseWhy = '';
      if (rejoining) return;   // 重新連線中：rejoin() 自己再試
      if (opened && N.room && N.token && N.caps) {
        // 換層中斷線：靜默重連（少彈 toast 洗版），座位仍在
        if (floorBusy) silentRejoin = true;
        else if (reason) console.warn('[net] close', code, reason);
        rejoin(code, reason);
        return;
      }
      const tip = reason || (code && code !== 1000 && code !== 1005 ? '（碼 ' + code + '）' : '');
      drop(opened && N.room ? ('和伺服器斷線了' + (tip ? '：' + tip : '。')) : '');
    };
    ws.onmessage = ev => {
      if (N.ws !== ws) return;
      if (ev.data === 'pong' || ev.data === 'ping') { lastPongAt = Date.now(); return; }   // 心跳，不當 JSON
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
  // 斷線：HOLD_MS 內指數退避＋抖動重連回原本座位（伺服器認 id＋token）
  // 換層中斷線走靜默重連（silentRejoin）：少 toast、更快重試
  const rejoin = (closeCode, closeReason) => {
    if (rejoining) return;
    const code = N.room, me = N.me, token = N.token, t0 = Date.now();
    const quiet = silentRejoin; silentRejoin = false;
    rejoining = true; rejoinAttempt = 0; const gen = ++rejoinGen;
    N.busy = quiet ? '換層連線恢復中……' : '重新連線中……'; refresh();
    if (!quiet) {
      const tip = closeReason || (closeCode && closeCode !== 1000 && closeCode !== 1005 ? '碼 ' + closeCode : '');
      R.toast('和伺服器斷線了：重新連線中' + (tip ? '（' + tip + '）' : '') + '……', '#FFB45A');
    }
    if (N.onAway) try { N.onAway(true); } catch (e) { }
    // 換層靜默：0.15s 起跳、上限 3s；平常 0.25s → ~6s，加抖動避免同時重連撞車
    const delayOf = n => {
      const base = quiet
        ? Math.min(3000, Math.round(150 * Math.pow(1.5, Math.max(0, n))))
        : Math.min(6000, Math.round(250 * Math.pow(1.6, Math.max(0, n))));
      return base + Math.floor(Math.random() * (quiet ? 120 : 280));
    };
    const once = () => {
      if (!rejoining || rejoinGen !== gen || N.room !== code || N.token !== token) return;
      if (Date.now() - t0 > HOLD_MS) { rejoining = false; drop('重新連線失敗，這一趟變回一個人。'); return; }
      rejoinAttempt++;
      const waitReply = quiet ? Math.min(8000, 4000 + rejoinAttempt * 400) : Math.min(12000, 6000 + rejoinAttempt * 400);
      connect().then(ws => {
        if (!rejoining || rejoinGen !== gen || N.ws !== ws || ws.readyState !== 1) return;
        try { ws.send(JSON.stringify(Object.assign({ t: 'join', code, rejoin: { id: me, token } }, myCard(), { v: PROTOCOL }))); } catch (e) { }
        setTimeout(() => {
          if (rejoining && rejoinGen === gen && N.ws === ws) {
            try { ws.close(4001, 'rejoin-retry'); } catch (e) { try { ws.close(); } catch (e2) { } }
            N.ws = null; stopBeat();
            setTimeout(once, delayOf(rejoinAttempt));
          }
        }, waitReply);
      }, () => setTimeout(once, delayOf(rejoinAttempt)));
    };
    setTimeout(once, quiet ? 80 : 200);
  };
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
    const had = !!N.room; finishRequest(); rejoining = false; rejoinAttempt = 0; rejoinGen++; silentRejoin = false; stopBeat(); N.token = null; if (N.onDrop) try { N.onDrop(why); } catch (e) { }
    N.room = null; N.me = null; N.host = null; N.members = []; N.busy = '';
    outP = null; outPs = null; outQ = []; if (outTimer) { clearTimeout(outTimer); outTimer = null; }
    if (floorGraceTimer) { clearTimeout(floorGraceTimer); floorGraceTimer = null; } floorBusy = false;
    clearRemotes(); const run = W().run; if (run && run.coop) run.coop.solo = true;
    pending = null; lastFloor = null; guestGo = false; cks.mine = {}; cks.host = {}; Object.keys(hostLayouts).forEach(k => delete hostLayouts[k]); Object.keys(fdBuf).forEach(k => delete fdBuf[k]); pendingHostLayout = null;
    if (had && why) R.toast(why, '#FFB45A');
    refresh();
  };

  const onServer = o => {
    // 別的遊戲的伺服器（例如 TOD 格鬥遊戲的房間伺服器會先送 { type: 'connected' }）：講清楚、斷線
    if (o && o.type && !o.t) { N.busy = ''; R.toast('這個網址是別的遊戲的伺服器，不是討伐令 1433 的（' + serverUrl() + '）。', '#FF9A6A'); try { N.ws.close(); } catch (e) { } return; }
    if (o.t === 'room') {
      if (o.v !== PROTOCOL) { disconnect('伺服器版本不相容。'); R.toast('伺服器版本不相容，請更新伺服器和遊戲。', '#FF9A6A'); return; }
      finishRequest();
      const back = rejoining; rejoining = false; rejoinGen++; const wasQuiet = floorBusy;
      N.room = o.code; N.me = o.you; N.host = o.host; N.members = o.members || []; N.busy = ''; N.token = o.token || null; N.caps = o.caps || 0;
      if (back && coop()) clearRemotes();   // 重連：清掉舊的隊友模型，等位置包／樓層同步後重畫
      if (!(back && wasQuiet)) R.toast(back ? '重新連上了。' : isHost() ? '開好房間了：房號 ' + o.code + '。把房號告訴朋友。' : '加入了 ' + nameOf(N.host) + ' 的房間。', '#7FE0FF');
      else console.info('[net] 換層中靜默重連成功');
      if (back && isHost() && coop()) {
        pushFloor(); pushFloorDump();
        setTimeout(() => { try { if (isHost() && coop()) { pushFloor(); pushFloorDump(); } } catch (e) { } }, 800);
        setTimeout(() => { try { if (isHost() && coop()) { pushFloor(); pushFloorDump(); if (N.onWantFloor) N.onWantFloor(null); } } catch (e) { } }, 2000);
      }
      if (back && !isHost() && coop()) {
        try { N.send({ k: 'wantFloor', rid: coop().coop.seed }, N.host); } catch (e) { }
        setTimeout(() => { try { const r = coop(); if (r && !r.coop.host && N.host) N.send({ k: 'wantFloor', rid: r.coop.seed }, N.host); } catch (e) { } }, 900);
        setTimeout(() => { try { const r = coop(); if (r && !r.coop.host && N.host) N.send({ k: 'wantFloor', rid: r.coop.seed }, N.host); } catch (e) { } }, 2400);
      }
      if (N.onRoom) try { N.onRoom(o, back); } catch (e) { console.warn('[net]', e); }
    } else if (o.t === 'join') {
      N.members.push(o.member); R.toast(o.member.name + ' 加入了房間。', '#7FE0FF');
      if (isHost() && coop()) N.send({ k: 'busy' }, o.member.id);   // 房主已經在遺跡裡：下一趟再一起
    } else if (o.t === 'leave') {
      R.toast(nameOf(o.id) + ' 離開了房間。', '#FFB45A'); N.members = N.members.filter(m => m.id !== o.id); dropRemote(o.id);
    } else if (o.t === 'closed') drop(o.why);
    else if (o.t === 'err') { finishRequest(); N.busy = ''; if (rejoining) { rejoining = false; drop('重新連線失敗（' + o.msg + '），這一趟變回一個人。'); } else R.toast(o.msg, '#FF9A6A'); }
    else if (o.t === 'msg') onMsg(o.from, o.d || {});
    else if (o.t === 'host') { N.host = o.id; R.toast(o.id === N.me ? '房主離開了：現在你是房主。' : nameOf(o.id) + ' 成為房主。', '#7FE0FF'); if (N.onServer2) N.onServer2(o); }
    else if (o.t === 'away') { R.toast(nameOf(o.id) + ' 斷線了：3 分鐘內連回來就能接著玩……', '#FFB45A'); dropRemote(o.id); if (N.onServer2) N.onServer2(o); }
    else if (o.t === 'back') { R.toast(nameOf(o.id) + ' 重新連上了。', '#7FE0FF'); if (isHost() && coop()) { pushFloor(o.id); pushFloorDump(o.id); } if (N.onServer2) N.onServer2(o); }
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
    N.guestFollow = true;   // guildtask.js：跳過／自動處理委託書，避免手上有委託時卡在沒有 tk-go 的視窗
    try { R.startRun(d.site); } finally { N.guestFollow = false; }
    // 後備：若仍跳出委託書（舊路徑／段位限制），點繼續／接下／不接（不要點放棄）
    let tries = 0; const accept = () => {
      const click = id => { const b = $(id); if (b && b.offsetParent && !b.disabled) { b.click(); return true; } return false; };
      if (click('tk-cont') || click('tk-go') || click('tk-free')) return;
      if (++tries < 30 && guestGo && pending === d) setTimeout(accept, 100);
    };
    setTimeout(accept, 0);
    setTimeout(() => { if (pending === d) { pending = null; guestGo = false; N.guestFollow = false; const hm2 = $('hub-modal'); if (hm2) hm2.hidden = true; if (R.closeSheet) try { R.closeSheet(); } catch (e) { } R.toast('未能跟隨出發，請確認委託條件後重新組隊。'); } }, 6000);
  };
  // 真的開始了（W.run 剛建好、還沒長第一層）：房主記下種子告訴大家；其他人照房主的設定
  const sp0 = R.startParty;
  R.startParty = run => {
    const result = sp0(run);
    if (N.room && isHost()) {
      cks.mine = {}; cks.host = {}; lastFloor = null; Object.keys(hostLayouts).forEach(k => delete hostLayouts[k]); Object.keys(fdBuf).forEach(k => delete fdBuf[k]); pendingHostLayout = null;
      run.coop = { seed: (R.nativeRandom() * 4294967296) >>> 0, n: 0, host: true };
      N.send({ k: 'run', site: run.site.id, name: run.site.name, seed: run.coop.seed, cfg: { env: run.env, reaction: run.reaction, floors: run.floors, tide: run.tide, pact: run.pact } });
    } else if (N.room && pending && pending.site === run.site.id) {
      Object.assign(run, pending.cfg); run.coop = { seed: pending.seed, n: 0, host: false }; pending = null; guestGo = false;
    }
    return result;
  };

  // ---------- 房主權威地圖（種子只當備援；隊友必須套用房主樓層資料） ----------
  // 根因：genFloor／buildFloor 裡曾用 sort(() => Math.random()-0.5)，跨瀏覽器比較次數不同，同種子也會長出不同地形。
  // 做法：房主打包 rooms＋tile 陣列（fd）推給全房；隊員 loadFloor 優先 unpack，校驗不一致則強制套用房主圖。
  const seedOf = (run, salt) => (run.coop.seed ^ Math.imul(run.coop.n + 1, 0x9E3779B1) ^ Math.imul(salt, 0x85EBCA77)) >>> 0;
  const b64enc = buf => {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + 0x8000, u8.length)));
    return btoa(s);
  };
  const b64dec = (s, Ctor) => {
    const bin = atob(s), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return Ctor ? new Ctor(u8.buffer) : u8;
  };
  const packLayout = (run, F) => {
    const t = F.tile; if (!t || !t.T) return null;
    const rooms = (F.rooms || []).map(r => ({
      i: r.i, gx: r.gx, gy: r.gy, links: Object.assign({}, r.links || {}), type: r.type, dist: r.dist,
      hx: r.hx, hz: r.hz, shape: r.shape, seed: r.seed, x: r.x, z: r.z, w: r.w, h: r.h,
      cleared: !!r.cleared, visited: !!r.visited,
      big: r.big || undefined, nest: r.nest || undefined, traps: r.traps || undefined, inner: r.inner || undefined
    }));
    return {
      rid: run.coop.seed, n: run.coop.n, f: F.f, last: !!F.last,
      rooms, links: (F.links || []).map(L => ({ a: L.a, b: L.b, dir: L.dir, bridge: L.bridge ? 1 : undefined })),
      X0: t.X0, Z0: t.Z0, nx: t.nx, nz: t.nz, TS: t.TS,
      T: b64enc(t.T), RM: b64enc(t.RM), CR: b64enc(t.CR),
      chests: (F.chests || []).map(c => ({ x: +c.x.toFixed(2), z: +c.z.toFixed(2), tier: c.tier|0, room: c.room|0 })),
      ck: checksum(F)
    };
  };
  const restoreRoomTiles = F => {
    const t = F.tile, FLOOR = (R.TILE && R.TILE.FLOOR) || 1, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const { nx, T: TT, RM, id } = t, N = nx * t.nz;
    F.rooms.forEach(r => { r.tiles = []; });
    for (let k = 0; k < N; k++) { const ri = RM[k]; if (ri >= 0 && F.rooms[ri]) F.rooms[ri].tiles.push(k); }
    F.rooms.forEach(r => {
      const doors = new Set();
      (r.tiles || []).forEach(k => {
        const tx = k % nx, tz = (k - tx) / nx;
        N4.forEach(([dx, dz]) => { const m = id(tx + dx, tz + dz); if (TT[m] === FLOOR && RM[m] < 0) doors.add(m); });
      });
      r.doors = [...doors];
    });
  };
  const unpackLayout = p => {
    const T = b64dec(p.T), RM = b64dec(p.RM, Int16Array), CR = b64dec(p.CR, Int16Array);
    const { X0, Z0, nx, nz, TS } = p;
    const id = (tx, tz) => tz * nx + tx;
    const tX = x => Math.floor((x - X0) / TS), tZ = z => Math.floor((z - Z0) / TS);
    const cX = tx => X0 + (tx + 0.5) * TS, cZ = tz => Z0 + (tz + 0.5) * TS;
    const rooms = (p.rooms || []).map(r => Object.assign({}, r, { links: Object.assign({}, r.links || {}), tiles: [], doors: [] }));
    const F = {
      f: p.f, last: !!p.last, rooms,
      links: (p.links || []).map(L => ({ a: L.a, b: L.b, dir: L.dir, bridge: !!L.bridge })),
      tile: { X0, Z0, nx, nz, TS, T, RM, CR, id, tX, tZ, cX, cZ }
    };
    restoreRoomTiles(F);
    return F;
  };
  const snapChests = (F, packed) => {
    if (!F || !packed || !packed.chests || !packed.chests.length) return;
    const list = F.chests || [];
    packed.chests.forEach((hc, i) => {
      const c = list[i]; if (!c) return;
      c.x = hc.x; c.z = hc.z;
      if (c.mesh) c.mesh.position.set(hc.x, 0, hc.z);
      if (c.col) { c.col.x0 = hc.x - 0.8; c.col.x1 = hc.x + 0.8; c.col.z0 = hc.z - 0.55; c.col.z1 = hc.z + 0.55; }
    });
  };
  let pendingHostLayout = null;   // 下一次 genFloor 強制用這份（隊員）
  const hostLayouts = {};         // n → packed
  const fdBuf = {};               // key → { tot, parts[] }
  const FD_CHUNK = 28000;
  let dumpQ = Promise.resolve();
  const pushFloorDump = to => {
    const run = coop(); if (!run || !run.coop.host || !W().F) return;
    const packed = packLayout(run, W().F); if (!packed) return;
    let raw; try { raw = JSON.stringify(packed); } catch (e) { console.warn('[net] packLayout', e); return; }
    const tot = Math.max(1, Math.ceil(raw.length / FD_CHUNK));
    const nAt = run.coop.n, seedAt = run.coop.seed, fAt = run.floor;
    dumpQ = dumpQ.then(async () => {
      for (let wait = 0; wait < 40 && floorBusy; wait++) await new Promise(ok => setTimeout(ok, 40));
      for (let i = 0; i < tot; i++) {
        const r2 = coop(); if (!r2 || !r2.coop.host || r2.coop.seed !== seedAt || r2.coop.n !== nAt) return;
        try {
          N.send({ k: 'fd', rid: seedAt, n: nAt, f: fAt, i, tot, s: raw.slice(i * FD_CHUNK, (i + 1) * FD_CHUNK) }, to);
        } catch (e) { }
        if (i + 1 < tot) await new Promise(ok => setTimeout(ok, 80));
      }
    }).catch(() => { });
  };
  N.pushFloorDump = pushFloorDump;
  const gf0 = R.genFloor;
  R.genFloor = (run, f) => {
    if (run && run.coop && !run.coop.host && pendingHostLayout && pendingHostLayout.n === run.coop.n && pendingHostLayout.f === f) {
      const L = pendingHostLayout; pendingHostLayout = null;
      try { return unpackLayout(L); } catch (e) { console.warn('[net] unpackLayout', e); }
    }
    return run && run.coop ? R.withSeed(seedOf(run, 1), () => gf0(run, f)) : gf0(run, f);
  };
  const bf0 = R.buildFloor;
  R.buildFloor = (sc, run, F) => run && run.coop ? R.withSeed(seedOf(run, 2), () => bf0(sc, run, F)) : bf0(sc, run, F);
  // 這一層長得一不一樣（地形和寶箱的位置）
  const checksum = F => { let h = 2166136261; const T = F.tile && F.tile.T; if (T) for (let i = 0; i < T.length; i++) h = Math.imul(h ^ T[i], 16777619); (F.chests || []).forEach(c => { h = Math.imul(h ^ Math.round((c.x || 0) * 10) ^ Math.round((c.z || 0) * 10) << 8, 16777619); }); return h >>> 0; };
  const cks = { mine: {}, host: {} }, ckBad = {};
  const keepAlive = () => { try { if (N.ws && N.ws.readyState === 1) N.ws.send('ping'); } catch (e) { } };
  const forceApplyHost = L => {
    const run = coop(); if (!run || run.coop.host || !L || L.rid !== run.coop.seed) return;
    if (floorBusy) { setTimeout(() => { try { forceApplyHost(L); } catch (e) { } }, 400); return; }
    console.info('[net] 強制套用房主地圖', L.n, L.f, L.ck);
    markFloorBusy(true); keepAlive();
    R.fade(() => {
      keepAlive();
      const r2 = coop(); if (!r2 || r2.coop.seed !== L.rid) { endFloorBusySoon(800); return; }
      pendingHostLayout = L;
      r2.coop.n = L.n;
      R.loadFloor(L.f, { netFollow: true, hostForce: true });
      try { snapChests(W().F, L); } catch (e) { }
      const ck = W().F && checksum(W().F); if (ck != null) { cks.mine[L.n] = ck; cks.host[L.n] = L.ck; if (ck === L.ck) { delete ckBad[L.n]; delete cks.mine[L.n]; delete cks.host[L.n]; } }
      R.toast && R.toast('已套用房主地圖', '#7FE0FF');
    });
  };
  const compare = n => {
    const a = cks.mine[n], b = cks.host[n]; if (a == null || b == null) return;
    if (a === b) { delete ckBad[n]; delete cks.mine[n]; delete cks.host[n]; return; }
    console.warn('[net] 這一層和房主的不一樣', n, a, b);
    ckBad[n] = (ckBad[n] || 0) + 1;
    if (ckBad[n] === 1 || ckBad[n] === 3) R.toast && R.toast('地圖不一致，正在套用房主地圖……', '#FFB45A');
    try {
      if (isHost()) { pushFloor(); pushFloorDump(); if (N.onWantFloor) N.onWantFloor(null); }
      else {
        const L = hostLayouts[n];
        if (L && (L.ck === b || b == null)) forceApplyHost(L);
        else if (N.host) N.send({ k: 'wantFloor', rid: coop() && coop().coop.seed }, N.host);
      }
    } catch (e) { }
    delete cks.mine[n]; delete cks.host[n];
    if (ckBad[n] >= 8) delete ckBad[n];
  };
  const onFloorDump = d => {
    if (!Number.isInteger(d.n) || !Number.isInteger(d.i) || !Number.isInteger(d.tot) || d.tot < 1 || d.tot > 64 || typeof d.s !== 'string') return;
    const key = d.rid + ':' + d.n;
    let buf = fdBuf[key]; if (!buf || buf.tot !== d.tot) buf = fdBuf[key] = { tot: d.tot, parts: [] };
    buf.parts[d.i] = d.s;
    if (buf.parts.length < d.tot) return;
    for (let i = 0; i < d.tot; i++) if (typeof buf.parts[i] !== 'string') return;
    let packed; try { packed = JSON.parse(buf.parts.join('')); } catch (e) { console.warn('[net] fd parse', e); delete fdBuf[key]; return; }
    delete fdBuf[key];
    if (!packed || packed.rid !== d.rid || packed.n !== d.n) return;
    hostLayouts[d.n] = packed;
    // 只留最近幾層，避免佔記憶體
    Object.keys(hostLayouts).map(Number).filter(n => n < d.n - 2).forEach(n => delete hostLayouts[n]);
    const run = coop();
    if (run && !run.coop.host && run.coop.seed === packed.rid) {
      const localCk = W().F && run.coop.n === packed.n && run.floor === packed.f ? checksum(W().F) : null;
      if (localCk == null || localCk !== packed.ck) forceApplyHost(packed);
      else { cks.mine[packed.n] = localCk; cks.host[packed.n] = packed.ck; delete ckBad[packed.n]; delete cks.mine[packed.n]; delete cks.host[packed.n]; }
    }
  };

  // floorBusy 宣告在上方（出站佇列／心跳會用到）
  let followPend = null, followTimer = null;
  N.floorBusy = () => floorBusy;
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    o = o || {}; const run = W().run;
    if (run && run.coop && !run.coop.solo && !run.coop.host && !o.fresh && !o.netFollow && !o.hostForce) { R.toast('多人連線：由房主選擇樓層。'); return; }
    clearRemotes();   // 換場景：別人的人物跟著舊場景丟掉，收到位置再畫
    if (run && run.coop && !run.coop.solo) {
      if (run.coop.host) run.coop.n++;
      else if (o.fresh) run.coop.n = 1;
    }
    // 隊員：若已有房主這一層的 dump，強制用它長圖（不要自己重新 gen）
    if (run && run.coop && !run.coop.solo && !run.coop.host) {
      const L = hostLayouts[run.coop.n];
      if (L && L.rid === run.coop.seed && L.f === f) pendingHostLayout = L;
    }
    const coopNow = run && run.coop && !run.coop.solo;
    if (coopNow) {
      markFloorBusy(true); keepAlive(); keepAlive();
      try { if (N.ws && N.ws.readyState === 1) N.ws.send('ping'); } catch (e) { }
      if (N.room && N.token && N.caps && (!N.ws || N.ws.readyState !== 1) && !rejoining) {
        silentRejoin = true; try { rejoin(); } catch (e) { }
      }
    }
    let r;
    try { r = lf0(f, o); }
    finally {
      if (coopNow) {
        keepAlive(); keepAlive();
        try { if (N.ws && N.ws.readyState === 1) N.ws.send('ping'); } catch (e) { }
        endFloorBusySoon(2500);
        if (N.room && N.token && N.caps && (!N.ws || N.ws.readyState !== 1) && !rejoining) {
          silentRejoin = true; try { rejoin(); } catch (e) { }
        }
      }
    }
    if (run && run.coop && !run.coop.solo && W().F) {
      // 隊員：若這次是用房主 layout 長的，把寶箱位置也對齊
      const used = hostLayouts[run.coop.n];
      if (!run.coop.host && used && used.rid === run.coop.seed && used.f === run.floor) {
        try { snapChests(W().F, used); } catch (e) { }
      }
      const ck = checksum(W().F); cks.mine[run.coop.n] = ck; if (!run.coop.host) compare(run.coop.n);
      if (run.coop.host) {
        const msg = { k: 'floor', rid: run.coop.seed, f, up: !!o.up, warp: !!o.warp, n: run.coop.n, ck };
        try { N.send(msg); } catch (e) { }
        const nAt = run.coop.n, seedAt = run.coop.seed;
        setTimeout(() => {
          const r2 = coop(); if (!r2 || !r2.coop.host || r2.coop.seed !== seedAt || r2.coop.n !== nAt || !W().F) return;
          pushFloor(); pushFloorDump();
          if (N.onFloorReady) try { N.onFloorReady(); } catch (e) { }
        }, 300);
        setTimeout(() => {
          const r2 = coop(); if (!r2 || !r2.coop.host || r2.coop.seed !== seedAt || r2.coop.n !== nAt || !W().F) return;
          pushFloor(); pushFloorDump();
        }, 1000);
        setTimeout(() => {
          const r2 = coop(); if (!r2 || !r2.coop.host || r2.coop.seed !== seedAt || r2.coop.n !== nAt || !W().F) return;
          pushFloor();
        }, 2200);
      } else if (o.fresh && lastFloor && lastFloor.rid === run.coop.seed && lastFloor.n > 1) setTimeout(() => follow(lastFloor), 300);
      else if (!run.coop.host && o.netFollow) {
        const seedAt = run.coop.seed;
        const ask = () => { const r2 = coop(); if (!r2 || r2.coop.host || r2.coop.seed !== seedAt || !N.host) return; try { N.send({ k: 'wantFloor', rid: seedAt }, N.host); } catch (e) { } };
        setTimeout(ask, 200);
        setTimeout(ask, 800);
        setTimeout(ask, 2000);
      }
    }
    return r;
  };
  function pushFloor(to) {
    const run = coop(); if (!run || !run.coop.host || !W().F) return;
    const ck = checksum(W().F); cks.mine[run.coop.n] = ck;
    const msg = { k: 'floor', rid: run.coop.seed, f: run.floor, up: false, n: run.coop.n, ck };
    try { if (to) N.send(msg, to); else N.send(msg); } catch (e) { }
  }
  N.pushFloor = pushFloor;
  const follow = d => {
    const run = coop(); if (!run || run.coop.host || run.coop.seed !== d.rid) return;
    if (run.coop.n === d.n && run.floor === d.f) {
      // 已在同一層：若有房主 dump 且校驗不對，強制套用
      const L = hostLayouts[d.n];
      if (L && L.ck != null && W().F && checksum(W().F) !== L.ck) forceApplyHost(L);
      return;
    }
    followPend = d;
    if (followTimer) return;
    followTimer = setTimeout(() => {
      followTimer = null;
      const d2 = followPend; followPend = null; if (!d2) return;
      keepAlive(); keepAlive();
      R.fade(() => {
        keepAlive();
        const r2 = coop(); if (!r2 || r2.coop.seed !== d2.rid) return;
        if (r2.coop.n === d2.n && r2.floor === d2.f) return;
        const L = hostLayouts[d2.n];
        if (L && L.rid === d2.rid && L.f === d2.f) pendingHostLayout = L;
        r2.coop.n = d2.n; R.loadFloor(d2.f, { up: !!d2.up, warp: !!d2.warp, netFollow: true });
        if (d2.up) R.banner('跟著房主往回走', '遺跡一直在長：上一層已經不是來的時候的樣子');
        else R.toast && R.toast('已與房主同步樓層', '#7FE0FF');
      });
    }, floorBusy ? 80 : 0);
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
    else if (d.k === 'fd' && from === N.host) {
      const expected = coop() ? coop().coop.seed : pending && pending.seed;
      if (d.rid !== expected) return;
      onFloorDump(d);
    }
    else if (d.k === 'end' && from === N.host) { const run = coop(); if (run && !run.coop.host && run.coop.seed === d.rid) { run.coop.solo = true; clearRemotes(); R.banner(nameOf(N.host) + ' 回到地面了', '剩下的路自己走：碰回歸水晶就能回去'); } }
    else if (d.k === 'bye' && coop() && d.rid === coop().coop.seed) dropRemote(from);
    else if (d.k === 'wantFloor' && isHost() && coop() && d.rid === coop().coop.seed) {
      pushFloor(from);
      pushFloorDump(from);   // 地圖資料（房主權威）
      if (N.onWantFloor) try { N.onWantFloor(from); } catch (e) { }   // net2：順便 dump 整層遺跡生物
    }
    else if (d.k === 'p') presence(from, d);
    else if (N.onMsg2) N.onMsg2(from, d);   // 第二階段（net2.js）
  };

  // ---------- 看得到彼此 ----------
  const remotes = new Map();   // id → { h, x, z, tx, tz, yaw, sp, t, seq }
  N.remotes = remotes;   // net2.js：房主的遺跡生物也要打別人
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
    return { h, tag: tagEl(m.name || '勇者'), x: d.x, z: d.z, tx: d.x, tz: d.z, y: d.y || 0, yaw: d.yaw || 0, sp: 0, t: 0, seq: d.a ? d.a[2] : 0, sh: 0, bubble: null };
  };
  const ensureBubble = r => {
    if (r.bubble) return r.bubble;
    const TH = THREE, m = new TH.Mesh(new TH.SphereGeometry(0.9, 16, 12), new TH.MeshBasicMaterial({ color: '#8AD8FF', transparent: true, opacity: 0.28, depthWrite: false, depthTest: true }));
    m.renderOrder = 6; m.position.y = 1.05; r.h.g.add(m); r.bubble = m; return m;
  };
  const dropRemote = id => { const r = remotes.get(id); if (!r) return; if (r.h.g.parent) r.h.g.parent.remove(r.h.g); r.tag.remove(); remotes.delete(id); };
  function clearRemotes() { [...remotes.keys()].forEach(dropRemote); }
  const presence = (from, d) => {
    const run = coop(); if (!run || d.rid !== run.coop.seed || d.f !== run.floor || d.n !== run.coop.n || !W().scene) { dropRemote(from); return; }
    if (![d.x, d.z, d.yaw].every(Number.isFinite) || (d.y != null && !Number.isFinite(d.y))) return;
    let r = remotes.get(from); if (!r) { r = makeRemote(from, d); remotes.set(from, r); }
    r.tx = d.x; r.tz = d.z; r.y = d.y || 0; r.yaw = d.yaw; r.sp = d.sp || 0; r.t = 0;
    r.sh = Math.max(0, Number.isFinite(+d.sh) ? +d.sh : 0);
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
      if (r.sh > 0) { const b = ensureBubble(r); b.visible = true; b.material.opacity = 0.2 + 0.18 * Math.min(1, r.sh / Math.max(40, (W().P && W().P.hpMax) || 100)); }
      else if (r.bubble) r.bubble.visible = false;
    });
    const P = W().P; if (!P || !P.h) return;
    if (P.h.atk && P.h.atk !== lastAtk) atkSeq++; lastAtk = P.h.atk;
    sendT -= dt; if (sendT > 0) return; sendT = 0.1;
    N.send({ k: 'p', rid: run.coop.seed, f: run.floor, n: run.coop.n, x: +P.x.toFixed(2), z: +P.z.toFixed(2), y: +(P.y || 0).toFixed(2), yaw: +P.h.g.rotation.y.toFixed(2), sp: P.still > 0 ? 0 : +(P.speed || 0).toFixed(1), a: P.h.atk ? [P.h.atk.wind, P.h.atk.dur, atkSeq] : null, r: P.h.roll > 0 ? 1 : 0, d: P.dead ? 1 : 0, sh: Math.max(0, Math.round(P.shield || 0)) });
  };

  // 分頁回到前景／網路恢復：若 socket 已死就重連，否則補一次心跳
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !N.room) return;
    if (!N.ws || N.ws.readyState !== 1) { if (N.token && N.caps && !rejoining) rejoin(); }
    else try { N.ws.send('ping'); } catch (e) { }
  });
  window.addEventListener('online', () => {
    if (!N.room || !N.token || !N.caps || rejoining) return;
    if (!N.ws || N.ws.readyState !== 1) rejoin();
    else try { N.ws.send('ping'); } catch (e) { }
  });

  // ---------- 公會登記處：多人連線 ----------
  const box = () => {
    const url = serverUrl(), held = S() && S().heldTask;
    let h = '<h3>多人連線（測試中）</h3><p class="note">最多四個人一起下同一趟遺跡。房主在委託告示板選遺跡出發，房裡的人會跟著進去；上下樓跟著房主走。現在是第一階段：看得到彼此，遺跡生物、寶箱、掉落還是各算各的。</p>';
    if (held) h += '<div class="ft-box" style="margin:8px 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg2)"><p><b>手上的委託</b>：' + esc(held.letter) + ' 級・' + esc(held.site) + '（' + esc(R.heldLine ? R.heldLine(held) : '') + '）</p><p class="note">跟房出發不會卡死，也不會自動放棄——同座遺跡會繼續這張；別座則這一趟不接委託、原委託保留。要結算或丟掉可按下面，或滾到上方「手上的委託」。</p><div class="row"><button type="button" class="btn gold" data-net="turnin">繳交委託（領 ' + (held.pay || 0) + ' 費拉）</button><button type="button" class="btn" data-net="dropquest">放棄這張委託</button></div></div>';
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
      else if (k === 'turnin') { if (!S() || !S().heldTask) return; const t0 = R.turnInTask && R.turnInTask(); if (t0) R.toast && R.toast('繳交了「' + t0.site + '」的委託。成績明天以後登錄到勇者證。', '#E8C04A'); R.hub && R.hub(); }
      else if (k === 'dropquest') { if (!S() || !S().heldTask) return; if (!confirm('放棄這張委託？會記為失敗，扣住的報酬也拿不到。')) return; R.dropHeldTask && R.dropHeldTask(); R.hub && R.hub(); }
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
