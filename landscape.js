// 手機橫式（2026-10-08 作者：手機版可以用橫式）
// 橫拿手機（高度 520 以下、橫的）時原本直式的版面會疊在一起：左上的樓層、深度、角色卡蓋住跑步／回復藥／背包和左邊的搖桿，
// 右上的小地圖、佩特拉的注意蓋住大招和技能鈕。橫式的時候：
// - 左上整欄縮小（×0.82）；深度那一格只留第一行（點一下展開／收起）；角色卡拿掉武器、背包那兩行（暫停選單、背包裡看得到）。
// - 右上：小地圖縮成 72，佩特拉的注意擺在小地圖左邊（原本疊在下面）；大招鈕往下挪到小地圖下面。
// - 對話、選單這類的大框：高度最多到畫面高、裡面捲。
// - 標題畫面：眼睛放左邊、標題和按鈕放右邊。
// - 轉向的時候重新算一次畫面大小。
(function (R) {
  const Q = '@media (orientation:landscape) and (max-height:520px){';
  const css = document.createElement('style');
  css.textContent = Q
    + 'body.touch #r-tl{transform:scale(.82);transform-origin:top left;width:260px}'
    + 'body.touch #deep-box:not(.ls-open)>:not(:first-child){display:none}'
    + 'body.touch #deep-box{cursor:pointer;pointer-events:auto}'
    + 'body.touch #r-bl #r-weapon,body.touch #r-bl .r-misc{display:none}'
    + 'body.touch #r-tr{display:grid;grid-template-columns:92px 72px;column-gap:4px;row-gap:4px;width:168px!important;align-items:start}'
    + 'body.touch #r-tr .r-cam{grid-column:1/-1;width:168px;display:flex;justify-content:flex-end;flex-wrap:nowrap;white-space:nowrap;gap:4px}body.touch #r-tr .r-cam>button{flex:0 0 auto;width:auto!important;min-width:32px;white-space:nowrap}'
    + 'body.touch #r-map{width:72px!important;height:72px!important;grid-column:2;grid-row:2}'
    + 'body.touch #r-aware-box{grid-column:1;grid-row:2;width:88px;margin:0}'
    + 'body.touch .ul-btn{bottom:auto!important;top:calc(128px + env(safe-area-inset-top))!important}'
    + '#r-sheet .sheet,#r-sheet>div,.sheet-box{max-height:calc(100vh - 16px);overflow:auto}'
    // 標題畫面：眼睛放左邊、標題和按鈕放右邊（原本直的排下來，按鈕要捲到很下面）
    + '#title .t-wrap{display:grid;grid-template-columns:minmax(0,40%) minmax(0,1fr);column-gap:18px;align-items:start}'
    + '#title .t-eye{grid-column:1;grid-row:1/span 8;width:100%!important;height:auto!important;max-height:82vh;object-fit:contain;position:sticky;top:12px;margin:0!important}'
    + '#title .t-wrap>:not(.t-eye){grid-column:2;min-width:0}'
    + '#title .t-name{font-size:clamp(30px,10vh,56px)!important;margin:6px 0 2px!important;line-height:1.05}#title .t-sub{margin:2px 0 8px!important}'
    + '}';
  document.head.appendChild(css);
  // 深度那一格：點一下展開／收起
  document.addEventListener('click', ev => { const b = ev.target && ev.target.closest && ev.target.closest('#deep-box'); if (b && document.body.classList.contains('touch')) b.classList.toggle('ls-open'); }, true);
  // 轉向：重新算畫面大小
  const fit = () => { try { window.dispatchEvent(new Event('resize')); } catch (e) { } };
  window.addEventListener('orientationchange', () => setTimeout(fit, 250));
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => setTimeout(fit, 250));
})(window.R);
