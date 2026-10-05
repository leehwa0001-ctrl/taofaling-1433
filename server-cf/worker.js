// 討伐令 1433：多人連線伺服器的 Cloudflare Workers 版（和 server/server.js 同一套訊息，只轉送、不跑遊戲邏輯）
// 為什麼有這一版（見 連線報告.md）：Render 免費方案閒置 15 分鐘會睡、叫醒要一分鐘，2026-04 起每月流量只剩 5 GB；
//   Cloudflare 的 Workers 免費方案可以用 Durable Objects（要 SQLite 那種），不會睡、離台灣近、不收流量費。
// - 全部的房間放在同一個 Durable Object（名字 'lobby'）裡：程式和 server.js 一樣簡單。玩家多到一個物件撐不住再分房。
// - 用「WebSocket 休眠」（acceptWebSocket）：大家都在城裡沒傳訊息的時候，物件可以睡著不計時間；
//   醒來時從每條連線身上的附件（serializeAttachment：id、名字、外觀、房號、房主）把房間重建回來。
// - 每條連線每秒約 96 則（令牌桶、突發上限 144）：遊戲每秒送 10 則位置；換層／重連控制訊息不佔額度，超過的一般訊息丟掉。
// - 2026-10-05（第二階段，和 server/server.js 一樣）：房主離開或斷線換下一個人當房主（{ t: 'host', id }），所有人都走了才關房；
//   斷線保留座位 180 秒（{ t: 'away', id }，用 rejoin: { id, token } 連回來 → { t: 'back', id }）；'room' 多帶 token、caps: 1。
//   全房短暫斷線不立刻關房：空房仍留在 this.rooms，座位在 this.away，到期用 alarm 清掉；
//   座位／空房主資訊寫進 Durable Object storage，物件睡著醒來也不丟。
//   連線優化（2026-10-05 第三階段）：HOLD 180s、RATE 令牌桶 96/144、控制鍵擴充、座位持久化。
// 部署：見 server-cf/README.md（npx wrangler login、npx wrangler deploy）。
const MAX = 4, MAX_BYTES = 96 * 1024, PROTOCOL = '1433-net-2';
const RATE = 96, BURST = 144, HOLD = 180000;
const CTRL_K = new Set(['floor', 'run', 'end', 'busy', 'wantFloor', 'hd', 'bye']);
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const clean = (v, n) => String(v == null ? '' : v).slice(0, n);

export default {
  async fetch(req, env) {
    if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return new Response('ok\n', { headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' } });
    return env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch(req);
  }
};

export class Lobby {
  constructor(state) {
    this.state = state; this.rooms = null; this.nextId = 1; this.rate = new Map(); this.away = new Map();
    this.awayLoaded = false; this.dropN = 0; this.dropLog = 0;
    // 用戶端送 'ping' 由 Cloudflare 自己回 'pong'，不用叫醒物件
    try { state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong')); } catch (e) { }
  }
  // 從連線的附件重建房間（剛建立或剛從休眠醒來）
  load() {
    if (this.rooms) return; this.rooms = new Map();
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment() || {}; if (a.id >= this.nextId) this.nextId = a.id + 1;
      if (!a.code) continue; let r = this.rooms.get(a.code); if (!r) { r = { code: a.code, host: a.host, members: new Map() }; this.rooms.set(a.code, r); }
      r.members.set(a.id, ws);
    }
  }
  // 座位／空房主：寫進 storage，DO 休眠醒來不丟（短暫斷線重連關鍵）
  async loadAway() {
    if (this.awayLoaded) return; this.awayLoaded = true;
    try {
      const data = await this.state.storage.get('away');
      if (Array.isArray(data)) for (const [k, v] of data) if (v && v.code && v.id != null && v.token) this.away.set(k, v);
      const meta = await this.state.storage.get('roomMeta');
      if (meta && typeof meta === 'object') {
        for (const code of Object.keys(meta)) {
          const m = meta[code]; if (!m) continue;
          if (!this.rooms.has(code)) this.rooms.set(code, { code, host: m.host, members: new Map() });
          else if (m.host != null && !this.rooms.get(code).members.size) this.rooms.get(code).host = m.host;
        }
      }
    } catch (e) { }
  }
  async saveAway() {
    try {
      const now = Date.now();
      const data = [...this.away.entries()].filter(([, v]) => v && v.until > now);
      await this.state.storage.put('away', data);
      const meta = {};
      for (const [code, r] of this.rooms) {
        const hasAway = data.some(([, v]) => v.code === code);
        if (!r.members.size && hasAway) meta[code] = { host: r.host };
      }
      await this.state.storage.put('roomMeta', meta);
    } catch (e) { }
  }
  att(ws) { return ws.deserializeAttachment() || {}; }
  setAtt(ws, a) { let look = a.look; try { if (look && JSON.stringify(look).length > 1500) look = null; } catch (e) { look = null; } ws.serializeAttachment(Object.assign({}, a, { look })); }
  send(ws, o) { try { ws.send(JSON.stringify(o)); } catch (e) { } }
  pub(ws) { const a = this.att(ws); return { id: a.id, name: a.name, look: a.look }; }
  roomInfo(r, ws) { const a = this.att(ws), aw = [...this.away.values()].filter(x => x.code === r.code).map(x => ({ id: x.id, name: x.name, look: x.look })); return { t: 'room', v: PROTOCOL, code: r.code, you: a.id, host: r.host, members: [...r.members.values()].map(m => this.pub(m)).concat(aw), token: a.token, caps: 1 }; }
  // 令牌桶：每秒 RATE，突發 BURST；換層瞬間不會一次砍光
  takeRate(ws) {
    const now = Date.now(); let rt = this.rate.get(ws);
    if (!rt) { rt = { t: now, tokens: BURST }; this.rate.set(ws, rt); }
    const elapsed = (now - rt.t) / 1000;
    if (elapsed > 0) { rt.tokens = Math.min(BURST, rt.tokens + elapsed * RATE); rt.t = now; }
    if (rt.tokens < 1) {
      this.dropN++;
      // 最多每 30 秒記一次，避免 spam
      if (now - this.dropLog > 30000) { this.dropLog = now; console.log('[lobby] rate-drop', this.dropN); this.dropN = 0; }
      return false;
    }
    rt.tokens -= 1; return true;
  }
  // 換房主：下一個還連著的人（每條連線的附件也要改，醒來重建時才對）
  migrate(r) {
    const next = [...r.members.keys()].find(id => id !== r.host); if (next == null) return false;
    r.host = next; r.members.forEach(m => { const b = this.att(m); this.setAtt(m, Object.assign(b, { host: next })); this.send(m, { t: 'host', id: next }); });
    return true;
  }
  // 保留的座位到期：當成離開；空房且沒座位才關
  async purge() {
    const now = Date.now(); let changed = false;
    for (const [k, x] of this.away) {
      if (x.until > now) continue; this.away.delete(k); changed = true;
      const r = this.rooms.get(x.code); if (!r) continue;
      r.members.forEach(m => this.send(m, { t: 'leave', id: x.id }));
      if (r.host === x.id) {
        if (r.members.size) this.migrate(r);
        else {
          const next = [...this.away.values()].find(a => a.code === x.code);
          if (next) r.host = next.id;
        }
      }
      if (!r.members.size && ![...this.away.values()].some(a => a.code === x.code)) this.rooms.delete(x.code);
    }
    if (changed) await this.saveAway();
  }
  async alarm() { this.load(); await this.loadAway(); await this.purge(); if (this.away.size) try { await this.state.storage.setAlarm(Date.now() + 5000); } catch (e) { } }
  newCode() { for (;;) { let s = ''; for (let i = 0; i < 4; i++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)]; if (!this.rooms.has(s)) return s; } }
  roomOf(ws) { const a = this.att(ws); return a.code ? this.rooms.get(a.code) || null : null; }
  // keep：斷線（不是按離開）——保留座位 HOLD 毫秒；空房也先留著等重連
  leave(ws, why, keep) {
    const a = this.att(ws), r = this.roomOf(ws); if (!r) return Promise.resolve();
    r.members.delete(a.id); this.setAtt(ws, Object.assign(a, { code: null, host: null }));
    if (keep) {
      this.away.set(r.code + ':' + a.id, { code: r.code, id: a.id, token: a.token, name: a.name, look: a.look, until: Date.now() + HOLD });
      if (r.host === a.id && r.members.size) this.migrate(r);
      r.members.forEach(m => this.send(m, { t: 'away', id: a.id }));
      try { this.state.storage.setAlarm(Date.now() + Math.min(HOLD, 30000) + 500); } catch (e) { }
      return this.saveAway();
    }
    // 按離開：不保留自己的座位；若還有别人連著／保留中就通知，否則關房
    for (const [k, x] of this.away) if (x.code === r.code && x.id === a.id) this.away.delete(k);
    const hasAway = [...this.away.values()].some(x => x.code === r.code);
    if (!r.members.size && !hasAway) { this.rooms.delete(r.code); return this.saveAway(); }
    if (r.host === a.id) {
      if (r.members.size) this.migrate(r);
      else {
        const next = [...this.away.values()].find(x => x.code === r.code);
        if (next) r.host = next.id;
      }
    }
    r.members.forEach(m => this.send(m, { t: 'leave', id: a.id }));
    return this.saveAway();
  }

  async fetch() {
    this.load(); await this.loadAway();
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    this.setAtt(server, { id: this.nextId++, name: '', look: null, code: null, host: null, token: null });
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, raw) {
    this.load(); await this.loadAway();
    if (typeof raw !== 'string' || raw.length > MAX_BYTES) return;
    let o; try { o = JSON.parse(raw); } catch (e) { return; }
    if (!o || typeof o.t !== 'string') return;
    // 換層／重連控制訊息不佔速率：避免換層瞬間 floor＋hd 被丢掉造成斷線感
    const ctrl = o.t === 'msg' && o.d && typeof o.d.k === 'string' && CTRL_K.has(o.d.k);
    if (!ctrl && !this.takeRate(ws)) return;
    const a = this.att(ws); if (this.away.size) await this.purge();
    if (o.t === 'create' || o.t === 'join') {
      if (o.v !== PROTOCOL) return this.send(ws, { t: 'err', msg: '連線版本不同，請重新整理遊戲並更新伺服器。' });
      let target = null; const cur = this.roomOf(ws);
      if (o.t === 'join') {
        target = this.rooms.get(clean(o.code, 8).toUpperCase());
        if (!target) return this.send(ws, { t: 'err', msg: '找不到這個房號。' });
        // 重新連線：接回保留的座位（同一個 id）
        const rj = o.rejoin, seat = rj && this.away.get(target.code + ':' + (+rj.id));
        if (rj && seat && seat.token === rj.token) {
          this.leave(ws); this.away.delete(target.code + ':' + seat.id);
          this.setAtt(ws, { id: seat.id, name: seat.name, look: seat.look, code: target.code, host: target.host, token: seat.token });
          target.members.forEach(m => this.send(m, { t: 'back', id: seat.id }));
          target.members.set(seat.id, ws);
          await this.saveAway();
          return this.send(ws, this.roomInfo(target, ws));
        }
        if (rj) return this.send(ws, { t: 'err', msg: '座位已經不在了' });
        if (target === cur) return this.send(ws, this.roomInfo(target, ws));
        if (target.members.size + [...this.away.values()].filter(x => x.code === target.code).length >= MAX) return this.send(ws, { t: 'err', msg: '房間滿了（最多 ' + MAX + ' 個人）。' });
      } else if (cur && cur.host === a.id) return this.send(ws, this.roomInfo(cur, ws));
      this.leave(ws);
      const b = this.att(ws); b.name = clean(o.name, 24) || '無名的勇者'; b.look = o.look && typeof o.look === 'object' ? o.look : null; b.token = Math.random().toString(36).slice(2, 12);
      let r;
      if (o.t === 'create') { r = { code: this.newCode(), host: b.id, members: new Map() }; this.rooms.set(r.code, r); }
      else r = target;
      b.code = r.code; b.host = r.host; this.setAtt(ws, b);
      r.members.forEach(m => this.send(m, { t: 'join', member: this.pub(ws) }));
      r.members.set(b.id, ws);
      this.send(ws, this.roomInfo(r, ws));
      return;
    }
    if (o.t === 'leave') { this.leave(ws, ''); return; }
    const r = this.roomOf(ws);
    if (o.t === 'msg' && r) {
      if (!o.d || typeof o.d !== 'object' || Array.isArray(o.d) || typeof o.d.k !== 'string') return;
      if (['run', 'floor', 'end', 'busy'].includes(o.d.k) && r.host !== a.id) return;
      const out = JSON.stringify({ t: 'msg', from: a.id, d: o.d });
      if (o.to != null) { const m = r.members.get(o.to); if (m) try { m.send(out); } catch (e) { } }
      else r.members.forEach(m => { if (m !== ws) try { m.send(out); } catch (e) { } });
    }
  }
  async webSocketClose(ws) { this.load(); await this.loadAway(); await this.leave(ws, '', true); this.rate.delete(ws); try { ws.close(); } catch (e) { } }
  async webSocketError(ws) { this.load(); await this.loadAway(); await this.leave(ws, '', true); this.rate.delete(ws); }
}
