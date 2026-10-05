// 遺跡暫停選單的排版（作者 2026-10-05：訓練場的角色總數值移到左側，操作說明放中間並保持置頂，不用每次都往下滑才按得到）
// - 暫停選單（charsheet.js 加了角色總數值、menutidy.js 把按鈕分組、「操作說明」收起來）原本全部疊成一欄：總數值很長，操作說明、按鈕被擠到最下面。
// - 現在：有角色總數值的暫停選單分成三欄——左邊是角色總數值（自己捲動），中間是標題、操作說明、按鈕（固定在畫面上方），右邊留空讓中間那欄真的在畫面正中。
//   訓練場、遺跡裡都一樣。窄的畫面（手機直拿）改成上下排：操作說明、按鈕在上，總數值在下。
// - 打開暫停選單時，訓練場上方的面板（training.js 的 #tr-panel）先藏起來，不然會蓋住中間那欄的標題。
// 放在所有包 R.pauseSheet 的檔案後面（menutidy.js、unstuck.js 後面）。
(function (R) {
  const $ = id => document.getElementById(id);
  const lay = () => {
    const sh = $('r-sheet'); if (!sh || !(R.W && R.W.run)) return;
    const cs = sh.querySelector('.cs-box'); if (!cs) return;
    let L = sh.querySelector(':scope > .ps-l'), M = sh.querySelector(':scope > .ps-m');
    if (!L) { L = document.createElement('div'); L.className = 'ps-l'; M = document.createElement('div'); M.className = 'ps-m'; }
    [...sh.children].forEach(x => { if (x !== L && x !== M && x !== cs) M.appendChild(x); });   // 其他東西照原本的順序放中間（menutidy.js 第二次整理後加的也收進來）
    if (cs.parentNode !== L) L.appendChild(cs);
    if (L.parentNode !== sh) sh.append(L, M);
    sh.classList.add('ps-lay');
  };
  const ps0 = R.pauseSheet;
  if (ps0) R.pauseSheet = (...a) => { const r = ps0(...a); try { lay(); setTimeout(lay, 0); } catch (e) { console.warn('[pauselayout]', e); } return r; };
  // 換成別的視窗（背包、地圖……）就拿掉三欄的樣式
  const sh0 = R.sheet;
  R.sheet = (...a) => { const sh = $('r-sheet'); if (sh) sh.classList.remove('ps-lay'); return sh0(...a); };
  const css = document.createElement('style');
  css.textContent = '.modal:has(>.sheet.ps-lay){place-items:start center}'
    + '.sheet.ps-lay{width:min(1400px,100%);max-height:none;overflow:visible;display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,480px) minmax(0,1fr);gap:14px;align-items:start;background:none;border:0;box-shadow:none;padding:0}'
    + '.ps-lay>.ps-l,.ps-lay>.ps-m{max-height:calc(100dvh - 32px);overflow:auto;background:var(--bg2);border:1px solid var(--line);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);box-sizing:border-box}'
    + '.ps-lay>.ps-l{grid-column:1;padding:10px}.ps-lay>.ps-l .cs-box{margin:0;border:0;padding:0;background:none}.ps-lay>.ps-l .cs-grid{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}'
    + '.ps-lay>.ps-m{grid-column:2;padding:18px}'
    + 'body:has(#r-modal:not([hidden])>.sheet.ps-lay) #tr-panel{display:none}'
    + '@media (max-width:860px){.sheet.ps-lay{grid-template-columns:1fr;max-height:calc(100dvh - 32px);overflow:auto}.ps-lay>.ps-m{grid-column:1;grid-row:1;max-height:none}.ps-lay>.ps-l{grid-column:1;grid-row:2;max-height:none}}';
  document.head.appendChild(css);
})(window.R);
