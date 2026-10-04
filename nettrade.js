// 玩家之間交易裝備、飾品（作者 2026-10-05：玩家們可以交易裝備和飾品）
// - 在同一個多人連線房間裡、兩個人都不在遺跡裡的時候：公會登記處「多人連線」那一格，每個朋友旁邊有「交易」。
// - 對方答應之後兩邊都打開交易視窗：從倉庫挑沒穿在身上的武器、防具、飾品、護符（最多 8 件），也可以加費拉。
//   任何一邊改了內容，兩邊的「確定」都會取消；兩個人都按確定、看到的內容一樣，才同時交換。
// - 收到的東西換一個新的編號放進倉庫（不會跟自己的撞號）；給出去的從倉庫拿掉（套裝登記裡有的，那一格就空著）。
// - 訊息：trq 邀請、tra 答應、trn 拒絕、tro 內容、trr 確定、trx 取消（net.js 的 N.send(d, to)，接在 N.onMsg2 前面）。
// 放在 net.js、net2.js、netparty.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const N = () => R.net || {};
  const MAX = 8;
  let T = null;   // { tid, with, mine: [id], gold, theirs: [item], theirGold, myOk, theirOk }
  let invite = null;   // 別人邀請你的 { tid, from }
  const nameOf = id => { const m = (N().members || []).find(x => x.id === id); return m ? m.name : '朋友'; };
  const inRun = () => { const run = W().run; return !!(run && !run.done); };
  const send = (d, to) => { const n = N(); if (n.send && n.inRoom && n.inRoom()) n.send(d, to); };
  const worn = id => Object.values(S().equip || {}).some(eq => eq && Object.values(eq).includes(id));
  const tradable = it => it && ['weapon', 'armor', 'charm', 'acc'].includes(it.kind) && !worn(it.id);
  const mineItems = () => (T ? T.mine.map(id => R.itemById(id)).filter(Boolean) : []);
  const sig = () => !T ? '' : JSON.stringify([[...T.mine].sort(), T.gold | 0, T.theirs.map(x => x.id).sort(), T.theirGold | 0]);
  const sigFor = () => !T ? '' : JSON.stringify([T.theirs.map(x => x.id).sort(), T.theirGold | 0, [...T.mine].sort(), T.gold | 0]);   // 對方眼中的樣子

  // ---------- 視窗 ----------
  const hubOpen = () => { const h = $('hub'); return h && !h.hidden; };
  const modal = (html, foot) => {
    if (hubOpen()) { $('hub-sheet').innerHTML = html + foot; $('hub-modal').hidden = false; return { box: $('hub-sheet'), close: () => { $('hub-modal').hidden = true; } }; }
    R.sheet(html, foot); return { box: $('r-sheet'), close: R.closeSheet };
  };
  let M = null;
  const close = () => { if (M) { try { M.close(); } catch (e) { } M = null; } };
  const line = it => '<b style="color:' + R.rarityColor(it) + '">' + esc(R.itemName(it)) + '</b><small>' + esc((R.itemLines ? R.itemLines(it) : []).slice(0, 4).join('・')) + '</small>';
  const render = () => {
    if (!T) return;
    const s = S(), mine = mineItems(), pick = s.stash.filter(it => tradable(it) && !T.mine.includes(it.id));
    const html = '<p class="kicker">多人連線</p><h2>和 ' + esc(nameOf(T.with)) + ' 交易</h2>'
      + '<p class="note">挑倉庫裡沒穿在身上的裝備、飾品（最多 ' + MAX + ' 件），也可以加費拉。任何一邊改了內容，兩邊的確定都會取消；兩個人都按確定才交換。</p>'
      + '<div class="trade-cols" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      + '<div><h3>你給的' + (T.myOk ? ' <span style="color:#7FE08A">✔ 確定了</span>' : '') + '</h3><div class="recipes">'
      + (mine.length ? mine.map(it => '<div class="recipe">' + line(it) + '<button type="button" class="mini" data-trdel="' + esc(it.id) + '">拿回來</button></div>').join('') : '<p class="note">還沒放東西。</p>')
      + '</div><p>費拉 <input id="tr-gold" type="number" min="0" step="10" value="' + (T.gold | 0) + '" style="width:7em"> <small>（身上 ' + (s.gold | 0) + '）</small></p></div>'
      + '<div><h3>' + esc(nameOf(T.with)) + ' 給的' + (T.theirOk ? ' <span style="color:#7FE08A">✔ 確定了</span>' : '') + '</h3><div class="recipes">'
      + (T.theirs.length ? T.theirs.map(it => '<div class="recipe">' + line(it) + '</div>').join('') : '<p class="note">還沒放東西。</p>')
      + '</div><p>費拉 <b>' + (T.theirGold | 0) + '</b></p></div></div>'
      + '<h3>倉庫（點一下放進去）</h3><div class="recipes" style="max-height:220px;overflow:auto">'
      + (pick.length ? pick.map(it => '<div class="recipe">' + line(it) + '<button type="button" class="mini" data-tradd="' + esc(it.id) + '"' + (mine.length >= MAX ? ' disabled' : '') + '>放進去</button></div>').join('') : '<p class="note">倉庫裡沒有可以交易的東西（穿在身上的要先脫下來）。</p>')
      + '</div>';
    const foot = '<div class="row"><button type="button" class="btn pri" id="tr-ok">' + (T.myOk ? '取消確定' : '確定交換') + '</button><button type="button" class="btn" id="tr-x">不換了</button></div>';
    M = modal(html, foot);
    const box = M.box;
    box.querySelectorAll('[data-tradd]').forEach(b => { b.onclick = () => { if (T.mine.length >= MAX) return; T.mine.push(b.dataset.tradd); changed(); }; });
    box.querySelectorAll('[data-trdel]').forEach(b => { b.onclick = () => { T.mine = T.mine.filter(id => id !== b.dataset.trdel); changed(); }; });
    const g = $('tr-gold'); if (g) g.onchange = () => { T.gold = Math.max(0, Math.min(S().gold | 0, Math.floor(+g.value || 0))); changed(); };
    $('tr-ok').onclick = () => { T.myOk = !T.myOk; send({ k: 'trr', tid: T.tid, on: T.myOk, sig: sig() }, T.with); render(); tryDeal(); };
    $('tr-x').onclick = () => cancel(true, '不換了。');
  };
  const changed = () => {
    if (!T) return; T.myOk = false; T.theirOk = false;
    send({ k: 'tro', tid: T.tid, items: mineItems().map(it => JSON.parse(JSON.stringify(it))), gold: T.gold | 0 }, T.with);
    render();
  };
  const cancel = (tell, msg) => { if (!T) return; if (tell) send({ k: 'trx', tid: T.tid }, T.with); T = null; close(); if (msg) R.toast(msg, '#FFB45A'); };
  // 兩邊都確定、內容一樣：交換
  const tryDeal = () => {
    if (!T || !T.myOk || !T.theirOk || T.theirSig !== sigFor()) return;
    const s = S(), mine = mineItems();
    if (mine.length !== T.mine.length || mine.some(it => !tradable(it)) || (T.gold | 0) > (s.gold | 0)) { cancel(true, '東西對不上（可能穿上了或賣掉了），交易取消。'); return; }
    s.stash = s.stash.filter(it => !T.mine.includes(it.id));
    s.gold = (s.gold | 0) - (T.gold | 0) + (T.theirGold | 0);
    T.theirs.forEach(it0 => { const it = JSON.parse(JSON.stringify(it0)); s.nextId = (s.nextId || 1) + 1; it.id = 'i' + s.nextId; s.stash.push(it); });
    R.save(); R.sfx && R.sfx('coin');
    const who = nameOf(T.with), got = T.theirs.length, gave = T.mine.length;
    T = null; close();
    R.toast('和 ' + who + ' 交換好了：給出 ' + gave + ' 件、拿到 ' + got + ' 件。', '#7FE08A');
  };
  const start = (tid, partner) => { T = { tid, with: partner, mine: [], gold: 0, theirs: [], theirGold: 0, myOk: false, theirOk: false, theirSig: '' }; render(); };
  R.tradeWith = id => {
    const n = N(); if (!n.inRoom || !n.inRoom()) { R.toast('要先在同一個多人連線房間裡。'); return; }
    if (inRun()) { R.toast('在遺跡裡不能交易，回到地面再說。'); return; }
    if (T) { R.toast('已經在交易了。'); return; }
    const tid = n.me + ':' + Date.now(); T = { tid, with: id, pending: true, mine: [], gold: 0, theirs: [], theirGold: 0 };
    send({ k: 'trq', tid }, id); R.toast('問了 ' + nameOf(id) + ' 要不要交易……', '#7FE0FF');
    setTimeout(() => { if (T && T.tid === tid && T.pending) { T = null; R.toast(nameOf(id) + ' 沒有回應。'); } }, 30000);
  };
  const askSheet = () => {
    if (!invite) return; const iv = invite;
    M = modal('<p class="kicker">多人連線</p><h2>' + esc(nameOf(iv.from)) + ' 想跟你交易</h2><p>交換倉庫裡的裝備、飾品和費拉。</p>',
      '<div class="row"><button type="button" class="btn pri" id="tr-yes">好</button><button type="button" class="btn" id="tr-no">不要</button></div>');
    $('tr-yes').onclick = () => { invite = null; close(); if (inRun()) { send({ k: 'trn', tid: iv.tid, why: 'run' }, iv.from); R.toast('在遺跡裡不能交易。'); return; } send({ k: 'tra', tid: iv.tid }, iv.from); start(iv.tid, iv.from); };
    $('tr-no').onclick = () => { invite = null; close(); send({ k: 'trn', tid: iv.tid }, iv.from); };
  };

  // ---------- 訊息 ----------
  const onMsg = (from, d) => {
    if (!d || typeof d.k !== 'string' || d.k.slice(0, 2) !== 'tr' || d.k.length !== 3) return false;
    if (d.k === 'trq') {
      if (T || invite || inRun()) { send({ k: 'trn', tid: d.tid, why: T || invite ? 'busy' : 'run' }, from); return true; }
      invite = { tid: d.tid, from }; R.toast(nameOf(from) + ' 想跟你交易', '#7FE0FF'); askSheet(); return true;
    }
    if (!T || T.tid !== d.tid || T.with !== from) return true;
    if (d.k === 'tra') { if (T.pending) start(T.tid, from); }
    else if (d.k === 'trn') { T = null; R.toast(nameOf(from) + (d.why === 'run' ? ' 在遺跡裡，不能交易。' : d.why === 'busy' ? ' 正在忙。' : ' 不想交易。'), '#FFB45A'); }
    else if (d.k === 'trx') { cancel(false, nameOf(from) + ' 不換了。'); }
    else if (d.k === 'tro') {
      const items = Array.isArray(d.items) ? d.items.filter(it => it && typeof it === 'object' && typeof it.id === 'string' && ['weapon', 'armor', 'charm', 'acc'].includes(it.kind)).slice(0, MAX) : [];
      T.theirs = items; T.theirGold = Math.max(0, Math.floor(+d.gold || 0)); T.myOk = false; T.theirOk = false; T.theirSig = ''; render();
    }
    else if (d.k === 'trr') { T.theirOk = !!d.on; T.theirSig = d.sig || ''; render(); tryDeal(); }
    return true;
  };
  const hook = () => { const n = N(); if (!n.send || n.trHooked) return; const prev = n.onMsg2; n.onMsg2 = (from, d) => { if (d && onMsg(from, d)) return; if (prev) prev(from, d); }; n.trHooked = true; };
  hook();

  // ---------- 公會登記處：每個朋友旁邊的「交易」 ----------
  const addButtons = () => {
    const n = N(), sec = document.querySelector('#hub-body .net-box'); if (!sec || !n.inRoom || !n.inRoom()) return;
    if (sec.querySelector('.tr-row')) return;
    const others = (n.members || []).filter(m => m.id !== n.me); if (!others.length) return;
    const row = document.createElement('div'); row.className = 'row tr-row';
    others.forEach(m => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = '和 ' + m.name + ' 交易'; b.onclick = () => R.tradeWith(m.id); row.appendChild(b); });
    const ul = sec.querySelector('ul.loot'); if (ul) ul.after(row); else sec.appendChild(row);
  };
  setInterval(() => { try { hook(); if (hubOpen()) addButtons(); if (T && !(N().members || []).some(m => m.id === T.with)) cancel(false, '對方離開了房間，交易取消。'); } catch (e) { } }, 600);
})(window.R);
