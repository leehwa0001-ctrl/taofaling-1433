// 技能卡片的版型（2026-10-10 作者給的樣子：圖片固定在左上角，詳細說明的欄寬更寬，節省卡片上下的空間）
//   ┌────┐ 技能名（裝在哪個按鈕）
//   │ 圖 │
//   └────┘ 概述・冷卻・魔力
//   ★☆☆☆☆
//   技能詳細描述（整張卡的寬度）
//   ──────────
//   變化［原版］［A］［B］［C］
// 原本說明擠在圖片右邊那一欄；現在圖片只佔名字、概述那兩行的高度，星星和說明拉到整張卡的寬度。
// 星星：熟練度（skillpoints.js 的 R.skillRank；奏域這種可以練到 ★9 的照它的上限畫）；概述那一行原本的「★n」拿掉，不重複。
// 技能書（skillbook.js）、公會看技能、大招卡片（ultpath.js）都是同一種卡片，一起換。
// 放在 skillbook.js、skillvar.js、ultpath.js、skillicons*.js 後面。
(function (R) {
  const css = document.createElement('style');
  css.textContent = '.sb-card .sb-pick{grid-template-columns:54px minmax(0,1fr);grid-template-rows:auto 1fr auto auto auto;column-gap:12px;row-gap:0;padding:10px 12px 11px}'
    + '.sb-card .sb-pick>.sb-ico{grid-column:1;grid-row:1/span 3;width:54px;height:54px;align-self:start}'
    + '.sb-card .sb-pick>b{grid-column:2;grid-row:1;align-self:start;line-height:1.3}'
    + '.sb-card .sb-pick>small{grid-column:2;grid-row:3;align-self:end;line-height:1.35}'
    + '.sb-card .sb-pick>.sb-stars{grid-column:1/-1;grid-row:4;margin-top:7px;font-size:13px;letter-spacing:1px;color:#F2C84A;line-height:1}'
    + '.sb-card .sb-pick>.sb-stars i{font-style:normal;color:rgba(242,200,74,.35)}'
    + '.sb-card .sb-pick>span{grid-column:1/-1;grid-row:5;margin-top:6px;line-height:1.5}'
    + '.sb-card .sb-foot{padding:7px 12px 10px}';
  document.head.appendChild(css);
  const stars = id => {
    const r = R.skillRank ? R.skillRank(id) || 0 : 0, mx = Math.max(r, (R.SKILL_MAXR && R.SKILL_MAXR[id]) || 5);
    const u = R.skillProf ? R.skillProf(id) || 0 : 0, P = R.SKILL_PROF || [], need = r < mx ? P[Math.min(r, P.length - 1)] : null;
    return '<div class="sb-stars" title="熟練度：用了 ' + u + ' 次' + (need ? '，下一顆星大約 ' + need + ' 次（冷卻越長的技能需要的次數越少）' : '，練滿了') + '">' + '★'.repeat(r) + '<i>' + '☆'.repeat(mx - r) + '</i></div>';
  };
  // 學會的卡片才有熟練度：技能書每畫一次，每張學會的卡片的 .sb-foot 都會跑一次 R.SB_FOOT（沒有東西的 foot 之後會被拿掉，星星放在卡片本體，不受影響）
  (R.SB_FOOT = R.SB_FOOT || []).push((foot, id) => {
    if (!id || /^ult:/.test(id) || !R.SKILLS || !R.SKILLS[id]) return;
    const card = foot.closest('.sb-card'), pick = card && card.querySelector('.sb-pick'); if (!pick || pick.querySelector('.sb-stars')) return;
    const desc = pick.querySelector(':scope>span'), meta = pick.querySelector(':scope>small');
    if (meta) meta.innerHTML = meta.innerHTML.replace(/・?★\d+(?=・|$)/, '').replace(/^・/, '');
    const t = document.createElement('div'); t.innerHTML = stars(id); pick.insertBefore(t.firstChild, desc || null);
  });
})(window.R);
