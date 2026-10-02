// 更新公告（作者 2026-10-03：更新的東西可以寫在更新公告裡）
// - 標題畫面多一個「更新公告」，城裡的選單也有。有新的公告時，打開遊戲會自己跳出來一次（localStorage 記看過哪一版，讀不到就不跳）。
// - 新的東西加在 R.UPDATES 最上面那一天的 items；換一天就在最上面加一筆。寫給玩家看的話，不寫檔名。
(function (R) {
  R.UPDATES = [
    { d: '2026-10-03', items: [
      '柏青哥「銀河」多了三種機台：海神（甘，中得勤）、赤龍（大當後可能進入「龍神時間」確變）、月影（一發台，中了就是一大盒）。店裡每一排是不同的機台。',
      '新的領主體「緋面風翁」：紅臉、長鼻、黑翼，羽扇一搧就是暴風，會消失後從背後出現、叫三羽鴉幫忙。浮島型的克森特級遺跡最常遇到。',
      '遺跡往下的路不只一條：比較大的樓層會有兩、三個樓層通道（多出來的那幾條在有遺跡生物的房間裡）。',
      '遺跡加深：哈米莉亞 3 層、阿彌勒 6 層、摩爾斯 8 層、克森特 9 層、卡索 10 層。越深越強的幅度在第 4 層以後放緩。',
      '佩特拉核心變強：血更多、傷害更高，血剩三分之二、三分之一時會喚來群瞳和三羽鴉，剩一半以後暴走。所有領主體也變強了。',
      '委託書可以選「不接委託，自己下去」：沒有委託報酬、不打成績，撿到的東西和經驗照拿。',
      '披風可以拿掉：暫停選單、城裡的選單有「拿下披風／披上披風」。',
      '序號兌換：公會登記處（勇者證下面）可以輸入序號。新增一個清空停權的序號。',
      '電腦版 HUD 改版：下方的快捷欄（技能、翻滾、回復藥、魔力藥）、左右兩個圓形的生命和魔力表，技能能放的時候會亮。',
      '東鶴港：海岸線外多了一座有港灣的大港。',
      '力量與護具：護具有力量需求，多了八種新護具。',
      '職業平衡：弓箭手、刀客、牧師加強；種族加成照職業換算。',
      '遺跡生物的新動作第二批：本來只會邊退邊射的那幾種，現在打法更難纏。'
    ] },
    { d: '2026-10-02', items: [
      '公會的委託書和「任務評判五軌制」：出發前看委託書，回來隔天在勇者證上看完成度、效率、創傷、環境、反饋五項成績。',
      '加注條款和稱號：委託書上自己勾苛刻的條款，公會加付報酬；用條款走完遺跡可以拿稱號，戴上有小加成。',
      '等級上限 50、技能點和天賦：每升一級 1 點，強化技能、點天賦；公會可以花錢洗點。',
      '技能加到 252 種；製作、飾品、十五種新素材。',
      '狩獵考核：湯山村後山的狩獵場，打蓑背熊和土鎧豬。',
      '熟練度：武器越用越順手、重武器越拿越輕。',
      '麻將可以吃、碰、槓了，坐下時可以選要賭幾倍。',
      '多人連線第一階段：開房、加入、一起下同一趟遺跡。',
      '掘礦要拿十字鎬敲三下；解謎變難；遺跡裡的時間走慢一倍。',
      '望月家照原著重蓋；觀光遺跡變成動物園；城市的街道更自然。'
    ] }
  ];
  const KEY = 'tfl-news-seen', top = R.UPDATES[0], ver = top.d + ':' + top.items.length;
  const seen = () => { try { return localStorage.getItem(KEY) === ver; } catch (e) { return true; } };
  const markSeen = () => { try { localStorage.setItem(KEY, ver); } catch (e) { } };
  const esc = s => (R.esc ? R.esc(s) : String(s));
  const css = document.createElement('style');
  css.textContent = '.news-ov{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(6,4,10,.62)}'
    + '.news-box{width:min(620px,100%);max-height:min(82vh,760px);overflow:auto;background:var(--bg,#1A1612);color:var(--ink,#F1E9DA);border:1px solid var(--line,#5A4A3A);border-radius:12px;padding:16px 18px;box-shadow:0 10px 40px rgba(0,0,0,.5)}'
    + '.news-box h2{margin:0 0 6px}.news-box h3{margin:14px 0 6px;color:var(--gold,#C9A13A);font-size:1em}.news-box ul{margin:0;padding-left:1.2em;display:grid;gap:5px}.news-box li{line-height:1.5}'
    + '.news-box .row{display:flex;justify-content:flex-end;margin-top:12px}.t-btns .news-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#FF5A4A;margin-left:6px;vertical-align:middle}';
  document.head.appendChild(css);
  R.newsSheet = () => {
    markSeen(); const dot = document.querySelector('#t-news .news-dot'); if (dot) dot.remove();
    const ov = document.createElement('div'); ov.className = 'news-ov';
    ov.innerHTML = '<div class="news-box" role="dialog" aria-label="更新公告"><p class="kicker">公會東鶴分館・告示板</p><h2>更新公告</h2>'
      + R.UPDATES.map(u => '<h3>' + esc(u.d) + '</h3><ul>' + u.items.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>').join('')
      + '<div class="row"><button type="button" class="btn pri" id="news-x">知道了</button></div></div>';
    document.body.appendChild(ov);
    const close = () => { ov.remove(); document.removeEventListener('keydown', key, true); };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    document.addEventListener('keydown', key, true);
    ov.onclick = e => { if (e.target === ov) close(); };
    ov.querySelector('#news-x').onclick = close;
  };
  // 標題畫面
  const addTitle = () => {
    const box = document.querySelector('#title .t-btns') || document.querySelector('.t-btns'); if (!box || document.getElementById('t-news')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 't-news';
    b.innerHTML = '更新公告' + (seen() ? '' : '<span class="news-dot"></span>') + '<small>' + esc(top.d) + ' 的更新</small>';
    b.onclick = R.newsSheet; box.appendChild(b);
    if (!seen()) setTimeout(() => { if (!document.querySelector('.news-ov')) R.newsSheet(); }, 600);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addTitle); else addTitle();
  // 城裡的選單
  const tm = R.townMenu;
  if (tm) R.townMenu = (...a) => {
    const r = tm(...a), row = document.getElementById('r-sheet') && document.getElementById('r-sheet').querySelector('.row');
    if (row && !row.querySelector('#nw-open')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'nw-open'; b.textContent = '更新公告'; b.onclick = () => { R.closeSheet(); R.newsSheet(); }; row.appendChild(b); }
    return r;
  };
})(window.R);
