// 討伐令 1433：自訂按鍵（作者：可以放在滑鼠側鍵上）
// 做法：在 window 的捕獲階段先攔下實體按鍵（用 e.code，輸入法開著也認得），照設定換成遊戲原本認得的那個鍵，再送一個新的按鍵事件。
//  - 遊戲裡其他地方完全不用改（run.js、skills.js、gtamap.js 照舊讀 e.key）；所以這個檔案要比 skills.js 早載入。
//  - 滑鼠中鍵、側鍵（上一頁／下一頁）也可以綁；在遊戲畫面裡會擋掉瀏覽器的「上一頁」。
//  - 被換掉的原本按鍵就不再有作用；紙本（選單）打開時、指揮選單選 1～5 時照原本的按鍵。
//  - 設定存在 localStorage（ruins1433-keys）。暫停選單、城裡的選單有「按鍵設定」。
(function (R) {
  const $ = id => document.getElementById(id);
  const ACTS = [
    ['up', '往上走', 'w', 'KeyW'], ['left', '往左走', 'a', 'KeyA'], ['down', '往下走', 's', 'KeyS'], ['right', '往右走', 'd', 'KeyD'],
    ['dodge', '翻滾（點一下）／跑步（按住）', 'shift', 'ShiftLeft'], ['use', '互動', ' ', 'Space'],
    ['skill1', '技能一（右鍵也可以）', 'r', 'KeyR'], ['skill2', '技能二', '3', 'Digit3'], ['skill3', '技能三', '4', 'Digit4'], ['skill4', '技能四', '5', 'Digit5'], ['skill5', '技能五', '6', 'Digit6'],
    ['auto', '自動打最近的敵人（按住）', 'f', 'KeyF'], ['reload', '換彈', 'x', 'KeyX'],
    ['hp', '回復藥', '1', 'Digit1'], ['mp', '魔力藥', '2', 'Digit2'], ['bag', '背包', 'i', 'KeyI'], ['map', '地圖', 'tab', 'Tab'], ['bigmap', '城裡的大地圖', 'm', 'KeyM'],
    ['rotl', '視角往左轉', 'q', 'KeyQ'], ['rotr', '視角往右轉', 'e', 'KeyE'], ['order', '指揮隊友', 'c', 'KeyC'], ['hood', '兜帽', 'h', 'KeyH'], ['bomb', '丟炸彈', 'g', 'KeyG'], ['race', '種族技能（城裡是快速移動）', 't', 'KeyT'], ['pause', '暫停', 'escape', 'Escape']
  ];
  const LOGIC = {}, DEF = {}; ACTS.forEach(([id, , k, c]) => { LOGIC[id] = k; DEF[id] = c; });
  const LOGIC_KEYS = new Set(ACTS.map(a => a[2]));
  const KEYNAME = { ' ': ' ', shift: 'Shift', tab: 'Tab', escape: 'Escape' };
  let bind = {};
  try { bind = Object.assign({}, DEF, JSON.parse(localStorage.getItem('ruins1433-keys') || '{}')); } catch (e) { bind = Object.assign({}, DEF); }
  const save = () => { try { localStorage.setItem('ruins1433-keys', JSON.stringify(bind)); } catch (e) { } };
  let byCode = {};
  const rebuild = () => { byCode = {}; Object.keys(bind).forEach(a => { if (bind[a] && LOGIC[a] != null) byCode[bind[a]] = a; }); };
  rebuild();
  R.keyBinds = () => Object.assign({}, bind);

  // 按鍵的名字
  const NAMES = { Space: '空白', ShiftLeft: '左 Shift', ShiftRight: '右 Shift', ControlLeft: '左 Ctrl', ControlRight: '右 Ctrl', AltLeft: '左 Alt', AltRight: '右 Alt', Tab: 'Tab', Escape: 'Esc', Enter: 'Enter', Backspace: '退格', CapsLock: 'Caps Lock',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Mouse1: '滑鼠中鍵', Mouse3: '滑鼠側鍵（後）', Mouse4: '滑鼠側鍵（前）', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' };
  const codeName = c => !c ? '（沒有）' : NAMES[c] || (/^Key[A-Z]$/.test(c) ? c.slice(3) : /^Digit\d$/.test(c) ? c.slice(5) : /^Numpad/.test(c) ? '數字鍵盤 ' + c.slice(6) : c);
  R.keyName = a => codeName(bind[a]);

  // ---------- 攔截 ----------
  const inGame = () => { const run = $('run'); return run && !run.hidden && !(R.sheetOpen && R.sheetOpen()) && !capture; };
  const typing = e => e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
  const send = (type, a, src) => {
    const k = LOGIC[a], ev = new KeyboardEvent(type, { key: KEYNAME[k] || k, code: DEF[a], bubbles: true, cancelable: true, repeat: !!(src && src.repeat), shiftKey: k === 'shift' && type === 'keydown' });
    ev._kb = 1; window.dispatchEvent(ev);
  };
  const onKey = e => {
    if (e._kb || !e.isTrusted || typing(e) || !inGame()) return;
    if (R.orderOpen && R.orderOpen() && /^Digit[1-5]$/.test(e.code)) return;   // 指揮選單：1～5 選命令
    const a = byCode[e.code];
    if (a) { e.stopImmediatePropagation(); if (e.code === 'Tab' || e.code === 'Space' || LOGIC[a] === 'tab' || LOGIC[a] === ' ') e.preventDefault(); send(e.type, a, e); return; }
    // 遊戲原本認得、但現在沒有綁任何動作的鍵：擋下來（例如把技能一改到側鍵之後，R 就不再放技能）
    const k = (e.key || '').toLowerCase();
    if (LOGIC_KEYS.has(k) && !/^Arrow/.test(e.code)) { e.stopImmediatePropagation(); if (k === 'tab') e.preventDefault(); }
  };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', e => { if (e._kb || !e.isTrusted || typing(e)) return; const a = byCode[e.code]; if (a && $('run') && !$('run').hidden) { e.stopImmediatePropagation(); send('keyup', a, e); return; } const k = (e.key || '').toLowerCase(); if (LOGIC_KEYS.has(k) && !/^Arrow/.test(e.code) && inGame()) e.stopImmediatePropagation(); }, true);
  // 滑鼠中鍵、側鍵
  const mouseCode = e => (e.button === 1 || e.button === 3 || e.button === 4 ? 'Mouse' + e.button : null);
  const onMouse = e => {
    const c = mouseCode(e); if (!c || capture) return;
    const run = $('run'); if (!run || run.hidden) return;
    e.preventDefault();   // 側鍵：不要讓瀏覽器回上一頁
    const a = byCode[c]; if (!a || (R.sheetOpen && R.sheetOpen() && e.type === 'mousedown')) return;
    send(e.type === 'mousedown' ? 'keydown' : 'keyup', a, e);
  };
  window.addEventListener('mousedown', onMouse, true); window.addEventListener('mouseup', onMouse, true);
  window.addEventListener('auxclick', e => { if (mouseCode(e) && $('run') && !$('run').hidden) e.preventDefault(); }, true);

  // ---------- 設定畫面 ----------
  let capture = null;   // 正在等新按鍵的動作
  const labelHud = () => {
    const set = (sel, txt) => { const el = document.querySelector(sel); if (el) el.textContent = txt; };
    set('[data-tact="hp"] kbd', R.keyName('hp')); set('[data-tact="bag"] kbd', R.keyName('bag')); set('[data-tact="order"] kbd', R.keyName('order'));
    set('[data-tact="dodge"] kbd', '點 ' + R.keyName('dodge')); set('#r-skill2 kbd', R.keyName('skill2')); set('#r-skill3 kbd', R.keyName('skill3')); set('#r-skill4 kbd', R.keyName('skill4')); set('#r-skill5 kbd', R.keyName('skill5')); set('#r-skill kbd', R.keyName('skill1') + '／右鍵');
    set('[data-tact="rotl"] .key-only', R.keyName('rotl')); set('[data-tact="rotr"] .key-only', R.keyName('rotr'));
  };
  const back = { fn: null };
  R.keySheet = onBack => {
    back.fn = onBack || back.fn;
    R.sheet('<h2>按鍵設定</h2><p class="note">點右邊的按鍵，再按下新的鍵（可以是滑鼠中鍵、側鍵）。和別的動作撞到時，兩個會互換。左鍵攻擊、右鍵技能一固定不變。</p>'
      + '<div class="keys">' + ACTS.map(([id, name]) => '<div class="keyrow"><span>' + R.esc(name) + '</span><button type="button" class="btn keybtn' + (bind[id] !== DEF[id] ? ' changed' : '') + '" data-key="' + id + '">' + R.esc(capture === id ? '請按下新的鍵……（Esc 取消）' : codeName(bind[id])) + '</button></div>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn pri" id="kb-x">好了</button><button type="button" class="btn" id="kb-def">全部恢復預設</button></div>');
    document.querySelectorAll('[data-key]').forEach(b => { b.onclick = e => { e.stopPropagation(); capture = b.dataset.key; R.keySheet(); }; });
    $('kb-x').onclick = () => { capture = null; R.closeSheet(); if (back.fn) { const f = back.fn; back.fn = null; f(); } };
    $('kb-def').onclick = () => { bind = Object.assign({}, DEF); rebuild(); save(); labelHud(); capture = null; R.keySheet(); };
  };
  const assign = code => {
    const a = capture; capture = null; if (!a) return;
    const other = Object.keys(bind).find(k => k !== a && bind[k] === code);
    if (other) bind[other] = bind[a];   // 撞到了：互換
    bind[a] = code; rebuild(); save(); labelHud(); R.keySheet();
  };
  // 等新按鍵：比所有人都早（捕獲階段、最先登記）
  window.addEventListener('keydown', e => {
    if (!capture || !e.isTrusted) return; e.preventDefault(); e.stopImmediatePropagation();
    if (e.code === 'Escape') { capture = null; R.keySheet(); return; }
    assign(e.code);
  }, true);
  window.addEventListener('mousedown', e => {
    if (!capture || !e.isTrusted) return; const c = mouseCode(e); if (!c) return;
    e.preventDefault(); e.stopImmediatePropagation(); assign(c);
  }, true);

  // 暫停選單、城裡的選單：加一顆「按鍵設定」（手機沒有鍵盤，不加）
  const addBtn = again => {
    if (R.touch) return; const row = $('r-sheet') && $('r-sheet').querySelector('.row'); if (!row || row.querySelector('#kb-open')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'kb-open'; b.textContent = '按鍵設定'; b.onclick = () => R.keySheet(again); row.appendChild(b);
  };
  const ps = R.pauseSheet; if (ps) R.pauseSheet = (...a) => { const r = ps(...a); addBtn(() => R.pauseSheet()); return r; };
  const tm = R.townMenu; if (tm) R.townMenu = (...a) => { const r = tm(...a); addBtn(() => R.townMenu()); return r; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', labelHud); else labelHud();
})(window.R);
