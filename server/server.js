// 討伐令 1433：多人連線的伺服器（只轉送訊息，不跑遊戲邏輯）
// - 一間房最多 4 個人；開房的人是房主（遺跡的樓層、遺跡生物由房主決定），房主離開房間就關了。
// - 房號：4 個英文字母（去掉容易看錯的 I、O）。
// - 訊息都是 JSON：
//   用戶端 → 伺服器：{ t: 'create', name, look }、{ t: 'join', code, name, look }、{ t: 'leave' }、{ t: 'msg', to?, d }
//   伺服器 → 用戶端：{ t: 'room', code, you, host, members }、{ t: 'join', member }、{ t: 'leave', id }、{ t: 'closed', why }、{ t: 'msg', from, d }、{ t: 'err', msg }
// - 本機測試：cd server && npm install && npm start（ws://localhost:8787）
// - 部署：Render、Fly.io 之類（PORT 環境變數）；GET / 回 ok（給健康檢查用）
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = +process.env.PORT || 8787, MAX = 4, MAX_BYTES = 64 * 1024;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const rooms = new Map();   // code → { code, host, members: Map(id → client) }
let nextId = 1;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' });
  res.end('ok ' + rooms.size + ' rooms\n');
});
const wss = new WebSocketServer({ server, maxPayload: MAX_BYTES });

const send = (c, o) => { if (c.ws.readyState === 1) c.ws.send(JSON.stringify(o)); };
const pub = c => ({ id: c.id, name: c.name, look: c.look });
const roomInfo = (r, c) => ({ t: 'room', code: r.code, you: c.id, host: r.host, members: [...r.members.values()].map(pub) });
const newCode = () => { for (;;) { let s = ''; for (let i = 0; i < 4; i++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)]; if (!rooms.has(s)) return s; } };
const clean = (v, n) => String(v == null ? '' : v).slice(0, n);

const leave = (c, why) => {
  const r = c.room; if (!r) return; c.room = null; r.members.delete(c.id);
  if (r.host === c.id || !r.members.size) {
    rooms.delete(r.code);
    r.members.forEach(m => { m.room = null; send(m, { t: 'closed', why: why || '房主離開了，房間關了。' }); });
  } else r.members.forEach(m => send(m, { t: 'leave', id: c.id }));
};

wss.on('connection', ws => {
  const c = { ws, id: nextId++, name: '', look: null, room: null };
  ws.on('pong', () => { ws.dead = false; });
  ws.on('message', raw => {
    let o; try { o = JSON.parse(raw); } catch (e) { return; }
    if (!o || typeof o.t !== 'string') return;
    if (o.t === 'create' || o.t === 'join') {
      leave(c);
      c.name = clean(o.name, 24) || '無名的勇者'; c.look = o.look && typeof o.look === 'object' ? o.look : null;
      let r;
      if (o.t === 'create') { r = { code: newCode(), host: c.id, members: new Map() }; rooms.set(r.code, r); }
      else {
        r = rooms.get(clean(o.code, 8).toUpperCase());
        if (!r) return send(c, { t: 'err', msg: '找不到這個房號。' });
        if (r.members.size >= MAX) return send(c, { t: 'err', msg: '房間滿了（最多 ' + MAX + ' 個人）。' });
      }
      r.members.forEach(m => send(m, { t: 'join', member: pub(c) }));
      r.members.set(c.id, c); c.room = r;
      send(c, roomInfo(r, c));
      return;
    }
    if (o.t === 'leave') { leave(c, '房主離開了，房間關了。'); return; }
    if (o.t === 'msg' && c.room) {
      const out = JSON.stringify({ t: 'msg', from: c.id, d: o.d });
      if (o.to != null) { const m = c.room.members.get(o.to); if (m && m.ws.readyState === 1) m.ws.send(out); }
      else c.room.members.forEach(m => { if (m !== c && m.ws.readyState === 1) m.ws.send(out); });
    }
  });
  ws.on('close', () => leave(c, '房主斷線了，房間關了。'));
  ws.on('error', () => {});
});

// 每 25 秒確認還連著（有些主機的閒置連線一分鐘就會被切掉）
setInterval(() => { wss.clients.forEach(ws => { if (ws.dead) return ws.terminate(); ws.dead = true; ws.ping(); }); }, 25000);

server.listen(PORT, () => console.log('討伐令 1433 連線伺服器：port ' + PORT));
