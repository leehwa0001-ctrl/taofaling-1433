// 鐵匠鋪、倉庫的側欄（2026-10-05 作者）
// -「倉庫那邊的角色總體數值說明可以直接搬到鐵匠鋪的左邊，常規顯示這樣」：鐵匠鋪也分成兩欄——左邊是角色總數值
//   （charsheet.js 的 R.charSheetHtml），右邊是原本的鐵匠鋪。樣式借 stashui.js 的 .st-cols，窄的畫面上下排、數值那塊先收起來。
//   倉庫照舊也有（換裝備的時候要看）。
// -「倉庫可以顯示更多角色持有道具，像是有的素材、炸彈、紀念品、禮物等等」：倉庫左欄的角色總數值下面多一塊「身上的東西」：
//   藥水、炸藥、卷軸、經驗書、抽選券和自選券、存在店裡的代幣和鋼珠、紀念品、禮物、家具、寶石、素材（放在角色總數值的上面）。
// 放在所有包 R.hub 的檔案後面（index.html 裡 net.js 後面、main.js 前面）。
(function (R) {
  const $ = id => document.getElementById(id), S = () => R.S, esc = s => R.esc(s);
  const tabOf = () => { const t = document.querySelector('[data-htab][aria-selected="true"]'); return t ? t.dataset.htab : ''; };
  const wide = () => { try { return matchMedia('(min-width: 861px)').matches; } catch (e) { return true; } };

  // ---------- 鐵匠鋪：左邊角色總數值 ----------
  const smithCols = body => {
    if (!R.charSheetHtml || body.querySelector(':scope > .st-cols')) return;
    const box = document.createElement('div'); box.innerHTML = R.charSheetHtml(); const cs = box.firstElementChild; if (!cs) return;
    if ('open' in cs) cs.open = wide();
    const cols = document.createElement('div'); cols.className = 'st-cols hs-smith';
    const left = document.createElement('div'); left.className = 'st-left'; const right = document.createElement('div'); right.className = 'st-right';
    while (body.firstChild) right.appendChild(body.firstChild);   // 原本的內容整個搬到右邊（按鈕的事件跟著走）
    left.appendChild(cs); cols.append(left, right); body.appendChild(cols);
  };

  // ---------- 倉庫：身上的東西 ----------
  const chip = (name, n, col) => '<span class="mat"' + (col ? ' style="--c:' + col + '"' : '') + '>' + esc(name) + ' ' + n + '</span>';
  const ownHtml = () => {
    const s = S(), out = [], sec = (title, chips) => { chips = chips.filter(Boolean); if (chips.length) out.push('<h4>' + esc(title) + '</h4><div class="hs-chips">' + chips.join('') + '</div>'); };
    const p = s.potions || {}, BT = R.BOMB_TYPES || {};
    sec('道具', [p.hp ? chip('回復藥', p.hp, '#E8404A') : '', p.mp ? chip('魔力藥', p.mp, '#4A7AE8') : '']
      .concat(Object.keys(BT).map(k => s[BT[k].key] ? chip(BT[k].name, s[BT[k].key], BT[k].color) : ''))
      .concat([s.scrolls ? chip('寫好的卷軸', s.scrolls, '#C8A85A') : '', s.xpBooks ? chip('經驗書', s.xpBooks, '#7FE0FF') : '']));
    const rs = s.raceSelect || {};
    sec('券', [s.raceTickets ? chip('種族抽選券', s.raceTickets, '#E8C04A') : ''].concat(['SR', 'SSR', 'UR'].map(t => rs[t] ? chip(t + ' 自選券', rs[t], '#E8C04A') : '')));
    sec('存在店裡', [s.medals ? chip('拉霸代幣', s.medals) : '', s.pachiBalls ? chip('柏青哥鋼珠', s.pachiBalls) : '']);
    const g = s.gifts || {}, G = R.GIFTS || {}, gk = Object.keys(g).filter(k => g[k] > 0);
    sec('紀念品', gk.filter(k => /^plush_/.test(k)).map(k => chip(G[k] ? G[k].name : k, g[k])));
    sec('禮物', gk.filter(k => !/^plush_/.test(k)).map(k => chip(G[k] ? G[k].name : k, g[k])));
    const fo = (s.furn && s.furn.own) || {}, FU = R.FURNITURE || {};
    sec('家具', Object.keys(fo).filter(k => fo[k] > 0 && FU[k]).map(k => chip(FU[k].name, fo[k])));
    const M = R.MATS || {}, mk = Object.keys(M).filter(k => (s.mats || {})[k] > 0);
    sec('寶石', mk.filter(k => /^gem_/.test(k)).map(k => chip(M[k].name, s.mats[k], M[k].color)));
    sec('素材', mk.filter(k => !/^gem_/.test(k)).map(k => chip(M[k].name, s.mats[k], M[k].color)));
    return '<details class="cs-box hs-own"' + (wide() ? ' open' : '') + '><summary>身上的東西</summary>' + (out.length ? out.join('') : '<p class="note">身上什麼都沒有。</p>') + '</details>';
  };
  const stashOwn = body => {
    if (body.querySelector('.hs-own')) return;
    const left = body.querySelector('.st-left'), box = document.createElement('div'); box.innerHTML = ownHtml();
    if (left) left.prepend(box.firstChild); else body.prepend(box.firstChild);   // 角色總數值很長，放它上面才看得到
  };

  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'); if (!body) return;
    try { const tab = tabOf(); if (tab === 'smith') smithCols(body); else if (tab === 'stash') stashOwn(body); } catch (e) { console.warn('[hubside]', e); }
  };
  const css = document.createElement('style');
  css.textContent = '.hs-own h4{margin:8px 0 4px;font-size:13px;opacity:.85}.hs-chips{display:flex;flex-wrap:wrap;gap:4px;max-height:220px;overflow:auto}.hs-smith{grid-template-columns:minmax(240px,28%) 1fr}.hs-smith .st-right>section{margin-top:0}@media (max-width:860px){.hs-smith{grid-template-columns:1fr}}';
  document.head.appendChild(css);
})(window.R);
