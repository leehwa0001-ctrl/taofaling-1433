// 討伐令 1433：鐵匠鋪「精煉・重鑄・附魔」那一頁改成圖鑑的樣子（作者 2026-10-04：這個頁面可以做成跟圖鑑那邊一樣，
//   左邊放小圖示，點了右邊才會顯示完整的裝備數值，然後洗詞條之類的也可以做在右邊）
// - crafting.js 照舊畫出每一件的卡片（data-iid），affixplus.js、gems.js、sets.js 照舊在卡片裡加按鈕（洗一條、加一條、鑲嵌、刻套裝紋）；
//   這裡等它們都畫好，把卡片收起來，左邊排成一格一格的小圖示（稀有度的顏色、+幾、裝備中的記號），點哪一格，右邊就放那一張卡片。
//   卡片是直接搬過去的，按鈕的動作都還在。
// - 選的那一件記著，按了精煉、重鑄之後頁面重畫，右邊還是同一件。
// - 窄的畫面（手機）：小圖示在上面、卡片在下面。
// 放在 crafting.js、affixplus.js、gems.js、sets.js 後面。
(function (R) {
  const esc = s => R.esc(s);
  let sel = null;
  const build = () => {
    const body = document.getElementById('hub-body'); if (!body) return;
    const cards = [...body.querySelectorAll('.items > .item-card[data-iid]')]; if (!cards.length) return;
    const box = cards[0].parentNode; if (box.dataset.fg) return; box.dataset.fg = 1;
    const eq = R.equippedIds ? R.equippedIds() : new Set();
    if (!cards.some(c => c.dataset.iid === sel)) sel = cards[0].dataset.iid;
    const wrap = document.createElement('div'); wrap.className = 'fg-split';
    const list = document.createElement('div'); list.className = 'fg-list';
    const detail = document.createElement('div'); detail.className = 'fg-detail';
    const keep = document.createElement('div'); keep.hidden = true;
    // 分兩段：裝備中的、倉庫裡的
    const sec = (title, arr) => { if (!arr.length) return; const h = document.createElement('div'); h.className = 'fg-h'; h.textContent = title + '（' + arr.length + '）'; list.appendChild(h); const g = document.createElement('div'); g.className = 'fg-grid'; arr.forEach(c => g.appendChild(tile(c))); list.appendChild(g); };
    const tile = c => {
      const it = R.itemById(c.dataset.iid), b = document.createElement('button'); b.type = 'button'; b.className = 'fg-tile'; b.dataset.iid = c.dataset.iid;
      if (!it) { b.textContent = '？'; return b; }
      b.style.setProperty('--c', R.rarityColor(it)); b.title = R.itemName(it);
      b.innerHTML = (R.itemIconTag ? R.itemIconTag(it) : '') + (it.plus ? '<i class="fg-plus">+' + it.plus + '</i>' : '') + (eq.has(it.id) ? '<i class="fg-eq">裝</i>' : '') + (it.set ? '<i class="fg-set"></i>' : '');
      b.onclick = () => { sel = b.dataset.iid; show(); };
      return b;
    };
    const show = () => {
      list.querySelectorAll('.fg-tile').forEach(t => t.classList.toggle('on', t.dataset.iid === sel));
      [...detail.children].forEach(c => keep.appendChild(c));
      const c = cards.find(x => x.dataset.iid === sel); if (c) detail.appendChild(c);
    };
    sec('裝備中', cards.filter(c => eq.has(c.dataset.iid)));
    sec('倉庫', cards.filter(c => !eq.has(c.dataset.iid)));
    cards.forEach(c => keep.appendChild(c));
    wrap.append(list, detail); box.replaceChildren(wrap, keep); box.classList.add('fg-box');
    show();
  };
  const hub0 = R.hub;
  R.hub = (t, f) => { const r = hub0(t, f); try { build(); } catch (e) { console.warn('[forgeui]', e); } return r; };

  const css = document.createElement('style');
  css.textContent = [
    '.items.fg-box{display:block}',
    '.fg-split{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:12px;align-items:start}',
    '.fg-list{background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:8px;max-height:62dvh;overflow:auto}',
    '.fg-h{font-size:12px;color:var(--dim);margin:2px 2px 6px}.fg-grid+.fg-h{margin-top:10px}',
    '.fg-grid{display:grid;grid-template-columns:repeat(auto-fill,52px);gap:6px}',
    '.fg-tile{position:relative;width:52px;height:52px;padding:0;display:grid;place-items:center;border-radius:9px;border:1px solid transparent;background:rgba(255,255,255,.03);cursor:pointer}',
    '.fg-tile:hover{background:rgba(255,255,255,.08)}',
    '.fg-tile.on{border-color:var(--gold);background:color-mix(in srgb,var(--c) 18%,transparent);box-shadow:0 0 0 1px var(--gold),0 0 10px -2px var(--gold)}',
    '.fg-tile .gicon{width:44px;height:44px}',
    '.fg-tile i{position:absolute;font-style:normal;font-weight:800;font-size:10px;line-height:1;padding:2px 3px;border-radius:4px;pointer-events:none}',
    '.fg-plus{right:1px;bottom:1px;background:rgba(10,8,14,.85);color:#FFE08A}',
    '.fg-eq{left:1px;top:1px;background:var(--gold);color:#1A1408}',
    '.fg-set{right:3px;top:3px;width:7px;height:7px;padding:0!important;border-radius:50%!important;background:#7FE8C8;box-shadow:0 0 4px #7FE8C8}',
    '.fg-detail{min-width:0}.fg-detail .item-card{border-left-width:6px;padding:14px 16px}',
    '.fg-detail .item-card>.gicon{width:64px;height:64px;margin-bottom:4px}.fg-detail .item-card>.gicon img{width:58px;height:58px}',
    '.fg-detail .item-card b{font-size:18px}',
    '.fg-detail .item-card ul{font-size:13.5px;padding:8px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}',
    '.fg-detail .item-card .row{display:grid;gap:6px;justify-items:stretch}.fg-detail .item-card .row>span{display:grid;gap:6px}',
    '.fg-detail .item-card .row .btn,.fg-detail .item-card .row .mini{text-align:left}',
    '@media (max-width:720px){.fg-split{grid-template-columns:1fr}.fg-list{max-height:34dvh}}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
