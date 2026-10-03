// 倉庫頁的排法、長按賣掉（作者 2026-10-04）
// -「倉庫頁面左側顯示角色資訊，右側顯示背包與裝備」：倉庫頁分成兩欄——左邊是角色總數值（charsheet.js），
//   右邊是原本的倉庫（裝備欄、經驗書、倉庫裡的東西）。畫面窄（手機）的時候上下排。
// -「賣東西可以一次長按賣掉嗎」：按住「賣掉」0.6 秒，把倉庫裡（沒穿在身上的）同一個稀有度的東西一起賣掉；
//   點一下照舊只賣那一件。史詩以上一起賣之前會再問一次。
// 要放在所有包 R.hub 的檔案後面。
(function (R) {
  const $ = id => document.getElementById(id), S = () => R.S;
  const isStash = () => { const tab = document.querySelector('[data-htab][aria-selected="true"]'); return tab && tab.dataset.htab === 'stash'; };
  const layout = body => {
    const cs = body.querySelector(':scope > .cs-box'), sec = body.querySelector(':scope > section.panel-doc'); if (!cs || !sec || body.querySelector('.st-cols')) return;
    const cols = document.createElement('div'); cols.className = 'st-cols';
    const left = document.createElement('div'); left.className = 'st-left'; const right = document.createElement('div'); right.className = 'st-right';
    cols.append(left, right); body.insertBefore(cols, cs); left.appendChild(cs); right.appendChild(sec);
    cs.open = true;
  };
  // 長按賣掉
  const tierName = it => it.identified ? (R.RARITY[it.rarity] && R.RARITY[it.rarity].name) || '' : '未鑑定';
  const sameTier = (a, b) => (a.identified ? 1 : 0) === (b.identified ? 1 : 0) && (!a.identified || a.rarity === b.rarity);
  const bulkSell = it => {
    const s = S(), eqIds = R.equippedIds ? R.equippedIds() : new Set(), list = s.stash.filter(x => !eqIds.has(x.id) && sameTier(x, it));
    if (!list.length) return;
    if (it.identified && it.rarity >= 3 && !confirm('一次賣掉 ' + list.length + ' 件「' + tierName(it) + '」的東西？')) return;
    let g = 0; list.forEach(x => { g += R.sell(x); });
    R.save(); R.hub('stash'); R.toast && R.toast('一次賣掉 ' + list.length + ' 件「' + tierName(it) + '」，得到 ' + g + ' 費拉', '#E8C04A'); R.sfx && R.sfx('coin');
  };
  const hold = body => {
    body.querySelectorAll('[data-sell]').forEach(b => {
      if (b.dataset.hold) return; b.dataset.hold = 1; b.title = '點一下賣這一件；按住 0.6 秒，同一個稀有度的一起賣';
      let t = null;
      const stop = () => { if (t) { clearTimeout(t); t = null; } b.classList.remove('st-holding'); };
      b.addEventListener('pointerdown', e => {
        if (e.button === 2) return; const it = R.itemById && R.itemById(b.dataset.sell); if (!it) return;
        b.classList.add('st-holding');
        t = setTimeout(() => { t = null; b.classList.remove('st-holding'); bulkSell(it); }, 600);   // 賣完會重畫，這顆按鈕不在了，放開也不會再賣一次
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
    });
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'); if (!body || !isStash()) return;
    try { layout(body); hold(body); } catch (e) { console.warn('[stashui]', e); }
    const h3 = [...body.querySelectorAll('h3')].find(x => /^倉庫裡的東西/.test(x.textContent));
    if (h3 && !h3.querySelector('.st-tip')) { const sm = document.createElement('small'); sm.className = 'st-tip'; sm.textContent = '　按住「賣掉」：同一個稀有度的一起賣'; h3.appendChild(sm); }
  };
  const css = document.createElement('style');
  css.textContent = '.st-cols{display:grid;grid-template-columns:minmax(260px,36%) 1fr;gap:16px;align-items:start}.st-left .cs-box{margin:0}.st-left .cs-grid{grid-template-columns:1fr}.st-right>section{margin-top:0}'
    + '.st-tip{font-size:12px;opacity:.7;font-weight:normal}'
    + '[data-sell].st-holding{background:linear-gradient(90deg,rgba(232,192,74,.55) 0,rgba(232,192,74,.55) 0) no-repeat;animation:st-fill .6s linear forwards}@keyframes st-fill{from{background-size:0% 100%}to{background-size:100% 100%}}'
    + '@media (max-width:860px){.st-cols{grid-template-columns:1fr}}';
  document.head.appendChild(css);
})(window.R);
