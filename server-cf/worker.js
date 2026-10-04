// 討伐令 1433：多人連線伺服器的 Cloudflare Workers 版（和 server/server.js 同一套訊息，只轉送、不跑遊戲邏輯）
// 為什麼有這一版（見 連線報告.md）：Render 免費方案閒置 15 分鐘會睡、叫醒要一分鐘，2026-04 起每月流量只剩 5 GB；
//   Cloudflare 的 Workers 免費方案可以用 Durable Objects（要 SQLite 那種），不會睡、離台灣近、不收流量費。
// - 全部的房間放在同一個 Durable Object（名字 'lobby'）裡：程式和 server.js 一樣簡單。玩家多到一個物件撐不住再分房。
// - 用「WebSocket 休眠」（acceptWebSocket）：大家都在城裡沒傳訊息的時候，物件可以睡著不計時間；
//   醒來時從每條連線身上的附件（serializeAttachment：id、名字、外觀、房號、房主）把房間重建回來。
// - 每條連線每秒最多 40 則訊息（遊戲每秒送 10 則位置），超過的丟掉——免得有人亂送吃光免費額度。
// 部署：見 server-cf/README.md（npx wrangler login、npx wrangler deploy）。
const MAX = 4, MAX_BYTES = 64 * 1024, PROTOCOL = '1433-net-2', RATE = 40;
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
    this.state = state; this.rooms = null; this.nextId = 1; this.rate = new Map();
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
  att(ws) { return ws.deserializeAttachment() || {}; }
  setAtt(ws, a) { let look = a.look; try { if (look && JSON.stringify(look).length > 1500) look = null; } catch (e) { look = null; } ws.serializeAttachment(Object.assign({}, a, { look })); }
  send(ws, o) { try { ws.send(JSON.stringify(o)); } catch (e) { } }
  pub(ws) { const a = this.att(ws); return { id: a.id, name: a.name, look: a.look }; }
  roomInfo(r, ws) { return { t: 'room', v: PROTOCOL, code: r.code, you: this.att(ws).id, host: r.host, members: [...r.members.values()].map(m => this.pub(m)) }; }
  newCode() { for (;;) { let s = ''; for (let i = 0; i < 4; i++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)]; if (!this.rooms.has(s)) return s; } }
  roomOf(ws) { const a = this.att(ws); return a.code ? this.rooms.get(a.code) || null : null; }
  leave(ws, why) {
    const a = this.att(ws), r = this.roomOf(ws); if (!r) return;
    r.members.delete(a.id); this.setAtt(ws, Object.assign(a, { code: null, host: null }));
    if (r.host === a.id || !r.members.size) {
      this.rooms.delete(r.code);
      r.members.forEach(m => { const b = this.att(m); this.setAtt(m, Object.assign(b, { code: null, host: null })); this.send(m, { t: 'closed', why: why || '房主離開了，房間關了。' }); });
    } else r.members.forEach(m => this.send(m, { t: 'leave', id: a.id }));
  }

  async fetch() {
    this.load();
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    this.setAtt(server, { id: this.nextId++, name: '', look: null, code: null, host: null });
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, raw) {
    this.load();
    if (typeof raw !== 'string' || raw.length > MAX_BYTES) return;
    // 每秒最多 RATE 則
    const now = Date.now(), rt = this.rate.get(ws) || { t: now, n: 0 }; if (now - rt.t > 1000) { rt.t = now; rt.n = 0; } rt.n++; this.rate.set(ws, rt); if (rt.n > RATE) return;
    let o; try { o = JSON.parse(raw); } catch (e) { return; }
    if (!o || typeof o.t !== 'string') return;
    const a = this.att(ws);
    if (o.t === 'create' || o.t === 'join') {
      if (o.v !== PROTOCOL) return this.send(ws, { t: 'err', msg: '連線版本不同，請重新整理遊戲並更新伺服器。' });
      let target = null; const cur = this.roomOf(ws);
      if (o.t === 'join') {
        target = this.rooms.get(clean(o.code, 8).toUpperCase());
        if (!target) return this.send(ws, { t: 'err', msg: '找不到這個房號。' });
        if (target === cur) return this.send(ws, this.roomInfo(target, ws));
        if (target.members.size >= MAX) return this.send(ws, { t: 'err', msg: '房間滿了（最多 ' + MAX + ' 個人）。' });
      } else if (cur && cur.host === a.id) return this.send(ws, this.roomInfo(cur, ws));
      this.leave(ws);
      const b = this.att(ws); b.name = clean(o.name, 24) || '無名的勇者'; b.look = o.look && typeof o.look === 'object' ? o.look : null;
      let r;
      if (o.t === 'create') { r = { code: this.newCode(), host: b.id, members: new Map() }; this.rooms.set(r.code, r); }
      else r = target;
      b.code = r.code; b.host = r.host; this.setAtt(ws, b);
      r.members.forEach(m => this.send(m, { t: 'join', member: this.pub(ws) }));
      r.members.set(b.id, ws);
      this.send(ws, this.roomInfo(r, ws));
      return;
    }
    if (o.t === 'leave') { this.leave(ws, '房主離開了，房間關了。'); return; }
    const r = this.roomOf(ws);
    if (o.t === 'msg' && r) {
      if (!o.d || typeof o.d !== 'object' || Array.isArray(o.d) || typeof o.d.k !== 'string') return;
      if (['run', 'floor', 'end', 'busy'].includes(o.d.k) && r.host !== a.id) return;
      const out = JSON.stringify({ t: 'msg', from: a.id, d: o.d });
      if (o.to != null) { const m = r.members.get(o.to); if (m) try { m.send(out); } catch (e) { } }
      else r.members.forEach(m => { if (m !== ws) try { m.send(out); } catch (e) { } });
    }
  }
  async webSocketClose(ws) { this.load(); this.leave(ws, '房主斷線了，房間關了。'); this.rate.delete(ws); try { ws.close(); } catch (e) { } }
  async webSocketError(ws) { this.load(); this.leave(ws, '房主斷線了，房間關了。'); this.rate.delete(ws); }
}
