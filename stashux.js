// 倉庫／裝備頁優化（2026-10-05 作者：讓裝備頁面優化）
// - 篩選列拆成兩排：上面部位分類、下面屬性／職業／排序＋名字搜尋＋清除；篩選列在右邊捲動時黏在上面。
// - 裝備欄比較疏、空格比較清楚；角色數值改成一排小標籤。
// - 倉庫卡片：按鈕排成「穿上／賣掉／上鎖」一列，能用的卡片多一條左邊亮邊。
// - 名字搜尋：輸入框即時過濾（畫面重畫後還記得）。
// 放在 loadout.js、hubside.js、stashui.js 後面。
(function (R) {
  const $ = id => document.getElementById(id);
  let stashQ = '';
  const isStash = () => { const t = document.querySelector('[data-htab][aria-selected="true"]'); return t && t.dataset.htab === 'stash'; };

  const polish = body => {
    const sec = body.querySelector('.st-right > section.panel-doc') || body.querySelector('section.panel-doc');
    if (!sec || sec.dataset.sx) return; sec.dataset.sx = '1';

    // 數值說明 → 小標籤列
    const notes = [...sec.querySelectorAll(':scope > p.note')];
    const statsP = notes.find(p => /^生命 /.test(p.textContent || ''));
    if (statsP && !sec.querySelector('.sx-stats')) {
      const raw = statsP.textContent || '';
      const parts = raw.split('・').map(s => s.trim()).filter(Boolean);
      const bar = document.createElement('div'); bar.className = 'sx-stats';
      parts.forEach(t => { const s = document.createElement('span'); s.className = 'sx-stat'; s.textContent = t; bar.appendChild(s); });
      statsP.replaceWith(bar);
    }

    // 篩選列：分類 chips 與 select 拆開，加搜尋、清除
    const cats = sec.querySelector('.st-cats');
    if (cats && !cats.dataset.sx) {
      cats.dataset.sx = '1';
      const selects = [...cats.querySelectorAll('select')];
      const chips = [...cats.querySelectorAll('button')];
      const row1 = document.createElement('div'); row1.className = 'sx-chips';
      chips.forEach(b => row1.appendChild(b));
      const row2 = document.createElement('div'); row2.className = 'sx-filters';
      const LAB = { 'st-affix': '屬性', 'st-cls': '職業', 'st-sort': '排序' };
      selects.forEach(s => {
        const wrap = document.createElement('label'); wrap.className = 'sx-f';
        const lab = document.createElement('span'); lab.textContent = LAB[s.id] || s.id.replace('st-', '');
        // 選項文字拿掉重複的「屬性：」「職業：」「排序：」前綴（標籤已經寫了）
        [...s.options].forEach(o => { o.textContent = o.textContent.replace(/^(屬性|職業|排序)：/, ''); });
        wrap.append(lab, s); row2.appendChild(wrap);
      });
      const search = document.createElement('label'); search.className = 'sx-f sx-search';
      search.innerHTML = '<span>搜尋</span>';
      const inp = document.createElement('input'); inp.type = 'search'; inp.id = 'st-q'; inp.placeholder = '名字…'; inp.value = stashQ; inp.autocomplete = 'off';
      search.appendChild(inp); row2.appendChild(search);
      const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'mini sx-clr'; clr.textContent = '清除篩選';
      clr.title = '屬性、職業、搜尋都清掉'; row2.appendChild(clr);
      cats.innerHTML = ''; cats.append(row1, row2);
      cats.classList.add('sx-bar');

      const applyQ = () => {
        stashQ = (inp.value || '').trim();
        const q = stashQ.toLowerCase();
        sec.querySelectorAll('.items .item-card').forEach(card => {
          const name = (card.querySelector('b') || {}).textContent || '';
          card.hidden = !!(q && !name.toLowerCase().includes(q));
        });
        const empty = sec.querySelector('.items .sx-empty');
        const visible = [...sec.querySelectorAll('.items .item-card')].filter(c => !c.hidden);
        if (empty) empty.hidden = visible.length > 0;
        else if (!visible.length && q) {
          const p = document.createElement('p'); p.className = 'note sx-empty'; p.textContent = '沒有名字符合「' + stashQ + '」的東西。';
          const items = sec.querySelector('.items'); if (items) items.appendChild(p);
        }
        const h3 = [...sec.querySelectorAll('h3')].find(x => /^倉庫裡的東西/.test(x.textContent || ''));
        if (h3) {
          const base = h3.childNodes[0];
          // 更新括號數字旁提示
          let tip = h3.querySelector('.sx-qtip');
          if (q) {
            if (!tip) { tip = document.createElement('small'); tip.className = 'sx-qtip st-tip'; h3.appendChild(tip); }
            tip.textContent = '　搜尋：「' + stashQ + '」→ ' + visible.length + ' 件';
          } else if (tip) tip.remove();
        }
      };
      inp.addEventListener('input', applyQ);
      clr.onclick = () => {
        stashQ = ''; inp.value = '';
        const aff = $('st-affix'), cls = $('st-cls');
        if (aff) aff.value = 'all'; if (cls) cls.value = 'all';
        const allBtn = row1.querySelector('[data-scat="all"]');
        if (allBtn && !allBtn.classList.contains('gold')) { allBtn.click(); return; }   // 分類也回到全部（會重畫）
        if (aff) aff.dispatchEvent(new Event('change'));
        else { applyQ(); R.hub('stash'); }
      };
      applyQ();
    }

    // 卡片：能用的加 class；按鈕列標 sx-acts
    sec.querySelectorAll('.items .item-card').forEach(card => {
      const row = card.querySelector('.row'); if (row) row.classList.add('sx-acts');
      if (card.querySelector('[data-equip]')) card.classList.add('sx-usable');
      else card.classList.add('sx-unusable');
    });

    // 裝備欄空格標籤
    sec.querySelectorAll('.gslot.empty').forEach(sl => sl.classList.add('sx-empty-slot'));
  };

  const hub0 = R.hub;
  R.hub = (t, f) => {
    const r = hub0(t, f);
    try {
      const body = $('hub-body');
      if (body && isStash()) polish(body);
      // 手邊素材／收購列：補上圖示（hub 重畫後）
      if (body && R.matIconTag) {
        body.querySelectorAll('.sellmat .sm-name').forEach(n => {
          if (n.querySelector('.micon')) return;
          const b = n.querySelector('b'); if (!b) return;
          const name = b.textContent;
          const k = Object.keys(R.MATS || {}).find(id => R.MATS[id].name === name);
          if (k) n.insertBefore(Object.assign(document.createElement('span'), { innerHTML: R.matIconTag(k, 'sm') }).firstChild, b);
        });
      }
    } catch (e) { console.warn('[stashux]', e); }
    return r;
  };

  const css = document.createElement('style');
  css.textContent = [
    /* 篩選列 */
    '.st-cats.sx-bar{display:grid;gap:8px;margin:6px 0 12px;position:sticky;top:0;z-index:3;padding:8px 8px 10px;background:color-mix(in srgb,var(--bg,#141018) 92%,transparent);border:1px solid var(--line);border-radius:10px;backdrop-filter:blur(4px)}',
    '.sx-chips{display:flex;flex-wrap:wrap;gap:5px;align-items:center}',
    '.sx-chips .mini{padding:4px 10px;border-radius:999px}',
    '.sx-chips .mini.gold{box-shadow:0 0 0 1px var(--gold)}',
    '.sx-filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.sx-f{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dim)}',
    '.sx-f>span{flex:none;opacity:.85}',
    '.sx-f select,.sx-f input{font:inherit;font-size:12.5px;padding:4px 8px;background:var(--bg2);color:inherit;border:1px solid var(--line);border-radius:7px;min-width:7.5em}',
    '.sx-search input{min-width:9em}',
    '.sx-clr{margin-left:auto}',
    /* 數值列 */
    '.sx-stats{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px}',
    '.sx-stat{font-size:12.5px;padding:4px 10px;border-radius:8px;background:var(--bg2);border:1px solid var(--line);color:var(--ink)}',
    /* 裝備欄 */
    '.st-right .slots{gap:10px;margin-bottom:4px}',
    '.gslot{padding:10px 12px;border-radius:10px;min-height:64px}',
    '.gslot .gicon{width:48px;height:48px}.gslot .gicon img{width:44px;height:44px}',
    '.gslot.empty.sx-empty-slot{border-style:dashed;opacity:.65}',
    '.gslot .mini[data-unequip]{margin-top:4px;padding:3px 10px}',
    /* 卡片 */
    '.st-right .items{gap:12px;grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}',
    '.item-card{padding:12px 14px;border-radius:10px;gap:4px;box-shadow:0 1px 0 rgba(0,0,0,.2)}',
    '.item-card.sx-usable{border-left-width:5px}',
    '.item-card.sx-unusable{opacity:.88}',
    '.item-card .sx-acts{margin-top:8px;gap:6px;padding-top:8px;border-top:1px dashed color-mix(in srgb,var(--line) 70%,transparent)}',
    '.item-card .sx-acts .btn{min-height:30px}',
    '.item-card .sx-acts .mini{opacity:.9}',
    '.st-right>section.panel-doc>h2{letter-spacing:.04em}',
    '.st-right>section.panel-doc>h3{margin-top:14px;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px}',
    '@media (max-width:860px){.st-cats.sx-bar{position:static}.sx-clr{margin-left:0}}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
