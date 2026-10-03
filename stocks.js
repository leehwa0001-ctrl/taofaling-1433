// 股票（作者 2026-10-04：然後有股票系統）
// - 世界中央銀行・東鶴分行的營業大廳，右邊的窗口是「證券窗口」：八家艾菲爾斯特的公司（東鶴、德克斯凡、昭旭的），買賣股票。
// - 股價每天變一次：各家有自己的起伏大小、慢慢往長期的價位拉回去；偶爾有新聞（礦坑挖到新礦脈、貨船遇上暴風……）讓一家或整個市場跳一下。
// - 買賣都收 0.5% 的手續費（最少 1 費拉）。沒有配息，賺的是價差——有可能賠。
// - 存檔：R.S.stocks = { p（現在的股價）, h（最近 40 天的股價）, own（{ n 股數, cost 總成本 }）, last（上次更新的那天）, news（最近的新聞） }。
(function (R) {
  const S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s), rnd = Math.random;
  const CO = [
    { id: 'DXM', name: '德克斯凡礦務', base: 120, vol: 0.035, drift: 0.0006, desc: '北山礦坑的經營者。魔晶礦的產量一變，股價就跟著跳。' },
    { id: 'TDE', name: '東鶴電力', base: 80, vol: 0.012, drift: 0.0003, desc: '東鶴的電燈、魔導暖爐都靠它。起伏很小，適合放著。' },
    { id: 'SKR', name: '昭旭鐵道', base: 150, vol: 0.02, drift: 0.0004, desc: '皇嶺到東鶴的魔導電車。大雪的季節容易停駛。' },
    { id: 'TGS', name: '天宮海運', base: 60, vol: 0.05, drift: 0.0002, desc: '跑華爾納蘭特航線的貨船公司。看天吃飯，起伏很大。' },
    { id: 'DXT', name: '德克斯凡商會', base: 200, vol: 0.025, drift: 0.0005, desc: '德克斯凡的貿易商會，東鶴的商行、百貨都有它的股份。' },
    { id: 'HFD', name: '白藤堂製藥', base: 45, vol: 0.03, drift: 0.0006, desc: '東鶴老牌的藥鋪做成的製藥公司。回復藥賣得好，股價就好。' },
    { id: 'MDL', name: '魔導燈具工業', base: 30, vol: 0.07, drift: 0.0004, desc: '生產魔導燈與零件的新公司，股價波動很大。' },
    { id: 'TKC', name: '東鶴建設', base: 70, vol: 0.03, drift: 0.0003, desc: '東鶴的營造廠。縣廳發包工程的時候最熱鬧。' }
  ];
  const NEWS = [
    ['DXM', 0.12, '北山礦坑挖到新的魔晶礦脈'], ['DXM', -0.10, '北山礦坑深層又出事了，暫停開採三天'], ['TGS', -0.14, '天宮海運的貨船遇上暴風，貨物泡水'], ['TGS', 0.12, '華爾納蘭特的訂單大增，天宮海運的船班全滿'],
    ['MDL', 0.20, '魔導燈具工業發表新型魔導燈，訂單接不完'], ['MDL', -0.18, '魔導燈具工業的新品過熱，全面召回'], ['HFD', 0.10, '白藤堂的新回復藥獲得公會採用'], ['HFD', -0.07, '白藤堂的藥材倉庫進水'],
    ['SKR', 0.08, '昭旭鐵道宣布加開往皇嶺的班次'], ['SKR', -0.08, '大雪讓昭旭鐵道停駛三天'], ['TDE', -0.05, '東鶴電力的發電所故障，河西停電一晚'], ['TDE', 0.04, '東鶴電力調漲電價獲准'],
    ['TKC', 0.10, '縣廳發包新的堤防工程，東鶴建設得標'], ['TKC', -0.08, '東鶴建設的工地發生意外，工程暫停'], ['DXT', 0.07, '德克斯凡商會的季報亮眼'], ['DXT', -0.09, '德克斯凡商會傳出帳目問題'],
    ['*', -0.06, '各地遺跡的反應頻傳，市場一片恐慌'], ['*', 0.05, '公會公布遺跡素材的產量創新高']
  ];
  const FEE = 0.005, HIST = 40;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const fair = (c, day) => c.base * Math.exp(c.drift * day);
  const step = (st, day) => {
    const ev = rnd() < 0.3 ? NEWS[Math.floor(rnd() * NEWS.length)] : null;
    CO.forEach(c => {
      let lp = Math.log(st.p[c.id]); lp += c.drift + c.vol * gauss() + 0.03 * (Math.log(fair(c, day)) - lp);
      if (ev && (ev[0] === c.id || ev[0] === '*')) lp += Math.log(1 + ev[1]);
      st.p[c.id] = Math.max(1, Math.round(Math.exp(lp) * 10) / 10);
      const h = st.h[c.id] = st.h[c.id] || []; h.push(st.p[c.id]); if (h.length > HIST) h.shift();
    });
    if (ev) { st.news.unshift({ d: day, t: ev[2], id: ev[0], k: ev[1] }); st.news = st.news.slice(0, 6); }
  };
  const book = () => {
    const s = S(); if (!s) return null;
    if (!s.stocks) { const st = s.stocks = { p: {}, h: {}, own: {}, last: s.day || 0, news: [] }; CO.forEach(c => { st.p[c.id] = Math.round(c.base * (0.9 + rnd() * 0.2) * 10) / 10; st.h[c.id] = []; }); for (let i = 0; i < 30; i++) step(st, (s.day || 0) - 30 + i); st.news = []; }
    const st = s.stocks; while (st.last < (s.day || 0)) { st.last++; step(st, st.last); }
    return st;
  };
  R.stocksTick = book;
  const nd0 = R.onNewDay;
  R.onNewDay = () => { nd0(); try { if (S() && S().stocks) { book(); R.save(); } } catch (e) { console.warn('[stocks]', e); } };
  const fmt = n => (Math.round(n * 10) / 10).toLocaleString('zh-TW');
  const spark = h => { if (!h || h.length < 2) return ''; const lo = Math.min(...h), hi = Math.max(...h), w = 90, ht = 26, k = hi > lo ? ht / (hi - lo) : 0; const pts = h.map((v, i) => (i / (h.length - 1) * w).toFixed(1) + ',' + (ht - (v - lo) * k).toFixed(1)).join(' '); const up = h[h.length - 1] >= h[0]; return '<svg class="sk-spark" viewBox="0 0 ' + w + ' ' + ht + '" preserveAspectRatio="none"><polyline points="' + pts + '" fill="none" stroke="' + (up ? '#E85A5A' : '#5AB86A') + '" stroke-width="1.6"/></svg>'; };
  R.stockSheet = () => {
    const s = S(), st = book(); if (!st) return;
    let val = 0, cost = 0; CO.forEach(c => { const o = st.own[c.id]; if (o && o.n) { val += o.n * st.p[c.id]; cost += o.cost; } });
    const rows = CO.map(c => {
      const p = st.p[c.id], h = st.h[c.id] || [], prev = h.length > 1 ? h[h.length - 2] : p, ch = prev ? (p - prev) / prev : 0, o = st.own[c.id] || { n: 0, cost: 0 }, pl = o.n ? o.n * p - o.cost : 0;
      return '<div class="sk-row"><div class="sk-name" title="' + esc(c.desc) + '"><b>' + esc(c.name) + '</b><small>' + c.id + '</small></div>'
        + '<div class="sk-px"><b>' + fmt(p) + '</b><small class="' + (ch >= 0 ? 'up' : 'dn') + '">' + (ch >= 0 ? '▲' : '▼') + Math.abs(ch * 100).toFixed(1) + '%</small></div>' + spark(h)
        + '<div class="sk-own">' + (o.n ? '持有 <b>' + o.n + '</b> 股<small>均價 ' + fmt(o.cost / o.n) + '・<span class="' + (pl >= 0 ? 'up' : 'dn') + '">' + (pl >= 0 ? '+' : '') + fmt(pl) + '</span></small>' : '<small>沒有持股</small>') + '</div>'
        + '<div class="sk-btns"><button type="button" class="mini" data-sb="' + c.id + ':1">買 1</button><button type="button" class="mini" data-sb="' + c.id + ':10">買 10</button><button type="button" class="mini" data-ss="' + c.id + ':1"' + (o.n ? '' : ' disabled') + '>賣 1</button><button type="button" class="mini" data-ss="' + c.id + ':all"' + (o.n ? '' : ' disabled') + '>全賣</button></div></div>';
    }).join('');
    const news = st.news.length ? st.news.map(n => '<li><small>' + esc(R.shortDate && R.dateOf ? R.shortDate(R.dateOf(n.d)) : '第 ' + n.d + ' 天') + '</small> ' + esc(n.t) + ' <span class="' + (n.k >= 0 ? 'up' : 'dn') + '">' + (n.id === '*' ? '全市場' : n.id) + (n.k >= 0 ? ' ▲' : ' ▼') + '</span></li>').join('') : '<li>最近沒有大新聞。</li>';
    R.sheet('<p class="kicker">世界中央銀行・東鶴分行</p><h2>證券窗口</h2><p class="note">股價每天開盤時變一次。買賣收 0.5% 手續費（最少 1 費拉）。沒有配息，賺的是價差，也可能賠。紅色是漲、綠色是跌。</p>'
      + '<div class="bk-box"><div><small>錢包</small><b>' + fmt(s.gold) + ' 費拉</b></div><div><small>持股市值</small><b>' + fmt(val) + ' 費拉</b></div><div><small>未實現損益</small><b class="' + (val - cost >= 0 ? 'up' : 'dn') + '">' + (val - cost >= 0 ? '+' : '') + fmt(val - cost) + '</b></div></div>'
      + '<details class="sk-about"><summary>公司介紹</summary><ul>' + CO.map(c => '<li><b>' + esc(c.name) + '</b>（' + c.id + '）：' + esc(c.desc) + '</li>').join('') + '</ul></details><div class="sk-list">' + rows + '</div><h3>市場新聞</h3><ul class="sk-news">' + news + '</ul>',
      '<div class="row"><button type="button" class="btn" id="sk-x">好了</button></div>');
    const trade = (id, n, buy) => {
      const p = st.p[id], o = st.own[id] = st.own[id] || { n: 0, cost: 0 };
      if (buy) { const amt = p * n, fee = Math.max(1, Math.round(amt * FEE)); if (s.gold < amt + fee) { R.toast('錢包裡的錢不夠（含手續費 ' + fee + ' 費拉）。'); return; } s.gold -= Math.round(amt + fee); o.n += n; o.cost += amt + fee; R.toast('買了 ' + n + ' 股（手續費 ' + fee + ' 費拉）。', '#E8C04A'); }
      else { n = n === 'all' ? o.n : Math.min(o.n, n); if (!n) return; const amt = p * n, fee = Math.max(1, Math.round(amt * FEE)), avg = o.cost / o.n; s.gold += Math.max(0, Math.round(amt - fee)); o.cost -= avg * n; o.n -= n; if (!o.n) o.cost = 0; R.toast('賣了 ' + n + ' 股，拿到 ' + Math.round(amt - fee) + ' 費拉。', '#E8C04A'); }
      R.sfx && R.sfx('coin'); R.save(); R.stockSheet();
    };
    document.querySelectorAll('[data-sb]').forEach(b => { b.onclick = () => { const [id, n] = b.dataset.sb.split(':'); trade(id, +n, true); }; });
    document.querySelectorAll('[data-ss]').forEach(b => { b.onclick = () => { const [id, n] = b.dataset.ss.split(':'); trade(id, n === 'all' ? 'all' : +n, false); }; });
    $('sk-x').onclick = R.closeSheet;
  };
  R.STOCKS = CO;
  // 營業大廳：右邊的窗口
  const FN = R.INTERIOR_FURNISH;
  if (FN && FN.bank) { const f0 = FN.bank; FN.bank = c => { const r = f0(c); try { c.inter(5.25, -c.HD + 4.4, 1.8, '證券窗口（股票）', R.stockSheet); } catch (e) { console.warn('[stocks]', e); } return r; }; }
  const css = document.createElement('style');
  css.textContent = '.sk-list{display:grid;gap:6px;margin:8px 0}.sk-row{display:grid;grid-template-columns:minmax(110px,1.3fr) 66px 84px minmax(96px,1fr) auto;gap:6px 10px;align-items:center;background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:6px 10px}'
    + '.sk-name small{display:block;opacity:.7;font-size:11px;line-height:1.3}.sk-px b{display:block;font-size:1.1em}.sk-px small,.sk-own small{display:block;font-size:11px}.sk-spark{width:84px;height:26px}.sk-btns{display:grid;grid-template-columns:repeat(2,auto);gap:4px}.sk-btns .mini{white-space:nowrap;padding:2px 8px}'
    + '.sk-about{font-size:13px;margin:4px 0}.sk-about summary{cursor:pointer;opacity:.85}.sk-about ul{margin:4px 0;padding-left:1.1em}.up{color:#F07A6A}.dn{color:#6AC87A}.sk-news{padding-left:1.1em;font-size:13px}.sk-news small{opacity:.7}'
    + '@media (max-width:640px){.sk-row{grid-template-columns:1fr auto}.sk-spark{display:none}.sk-own,.sk-btns{grid-column:1/-1}}';
  document.head.appendChild(css);
})(window.R);
