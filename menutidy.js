// 城裡的選單、暫停選單整理（2026-10-04 作者：設定那邊有點亂，可以幫我整理嗎？）
// 很多檔案各自往選單最下面那一排加按鈕，加到十幾顆擠成一堆。這裡在全部加完之後重新排：
//   角色（技能書、技能點、被動、捏角、披風……）／行動・資訊（快速移動、委託、地圖、指南、瓦版、更新公告……）／
//   設定（音量、按鍵、鏡頭、回報穿模……），最下面一排只留「繼續」和「存檔回到標題／放棄這一趟」。
// 很長的操作說明收進「操作說明」（點開才看）。按鈕是原本那幾顆搬過來的，功能不變。
// 放在所有包 R.townMenu、R.pauseSheet 的檔案後面（main.js 前面）。
(function (R) {
  const $ = id => document.getElementById(id);
  const GROUPS = [
    ['char', '角色', /技能書|技能點|天賦|被動|捏角|披風|轉職|稱號|裝備/],
    ['info', '行動・資訊', /快速移動|委託|地圖|指南|手冊|瓦版|公告|圖鑑|觀光|日誌|隊伍/],
    ['set', '設定', /按鍵|鏡頭|音效|音樂|穿模|設定|畫面|語言/]
  ];
  const SYS = /^繼續|回到標題|放棄這一趟|^離開/;
  const groupOf = b => { const t = b.textContent.trim(); if (SYS.test(t) || /^(tm-x|ps-x|ps-quit|tm-title)$/.test(b.id)) return 'sys'; const g = GROUPS.find(g => g[2].test(t)); return g ? g[0] : 'other'; };
  const tidy = () => {
    const sh = $('r-sheet'); if (!sh) return;
    let wrap = sh.querySelector('.mt-wrap'), sys = sh.querySelector('.mt-sys');
    const rows = [...sh.querySelectorAll('.row')].filter(r => !r.classList.contains('mt-sys') && !r.closest('.mt-wrap'));
    const btns = rows.flatMap(r => [...r.children].filter(x => x.tagName === 'BUTTON'));
    if (!btns.length && wrap) return;
    if (btns.length < 5 && !wrap) return;   // 按鈕不多的選單（別的小視窗）不動
    if (!wrap) {
      wrap = document.createElement('div'); wrap.className = 'mt-wrap';
      GROUPS.concat([['other', '其他']]).forEach(([id, name]) => { const s = document.createElement('section'); s.className = 'mt-sec mt-' + id; s.innerHTML = '<h4>' + name + '</h4><div class="mt-btns"></div>'; wrap.appendChild(s); });
      sys = document.createElement('div'); sys.className = 'row mt-sys';
      (rows[0] || sh.lastChild).before(wrap); wrap.after(sys);
      // 音量拉桿放進「設定」
      const vol = sh.querySelector('.vol-row'); if (vol) wrap.querySelector('.mt-set').insertBefore(vol, wrap.querySelector('.mt-set .mt-btns'));
      // 長的說明收起來（留第一段：日期、在哪一層）
      const ps = [...sh.children].filter(x => x.tagName === 'P' && !x.classList.contains('kicker'));
      if (ps.length > 1) { const d = document.createElement('details'); d.className = 'mt-help'; d.innerHTML = '<summary>操作說明</summary>'; ps.slice(1).forEach(p => d.appendChild(p)); wrap.before(d); }
    }
    btns.forEach(b => {
      const g = groupOf(b);
      if (g === 'sys') { if (/^(tm-x|ps-x)$/.test(b.id) || /^繼續/.test(b.textContent.trim())) sys.prepend(b); else sys.appendChild(b); }
      else wrap.querySelector('.mt-' + g + ' .mt-btns').appendChild(b);
    });
    rows.forEach(r => { if (!r.children.length) r.remove(); });
    wrap.querySelectorAll('.mt-sec').forEach(s => { s.hidden = !s.querySelector('.mt-btns').children.length && !s.querySelector('.vol-row'); });
  };
  const wrapFn = name => { const f0 = R[name]; if (!f0) return; R[name] = (...a) => { const r = f0(...a); try { tidy(); setTimeout(tidy, 0); } catch (e) { console.warn('[menutidy]', e); } return r; }; };
  wrapFn('townMenu'); wrapFn('pauseSheet');
  R.tidyMenu = tidy;
  const css = document.createElement('style');
  css.textContent = '.mt-wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:10px 0}'
    + '.mt-sec{border:1px solid var(--line,#5A4A3A);border-radius:8px;padding:8px 10px;background:rgba(255,255,255,.03)}.mt-sec h4{margin:0 0 6px;font-size:13px;letter-spacing:.08em;color:var(--gold,#C9A13A)}'
    + '.mt-set{grid-column:1/-1}.mt-set .vol-row{margin:0 0 8px}.mt-btns{display:flex;flex-wrap:wrap;gap:6px}.mt-btns .btn,.mt-btns .mini{padding:6px 10px;font-size:14px}'
    + '.mt-sys{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.mt-sys .btn.pri{order:2;min-width:120px}'
    + '.mt-help{margin:4px 0 0;font-size:13px;opacity:.9}.mt-help summary{cursor:pointer;color:var(--gold,#C9A13A)}.mt-help p{margin:6px 0}';
  document.head.appendChild(css);
})(window.R);
