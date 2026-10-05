// 圖鑑整理（玩家回饋 2026-10-04：分類、簡化，照分級區分；先只出現小頭像，點進去才顯示完整資訊；領主和小怪分兩個分頁）
// - main.js 照原本的做法把卡片放進 #cards 之後，這裡把它重新排成：
//   上面兩個分頁「遺跡生物／領主體」；遺跡生物照第一次出現的分級分段（哈米莉亞、阿彌勒、摩爾斯、克森特……），另外有「極端環境」「其他」。
//   每一段是一排小頭像（打倒過的寫隻數，沒打倒過的暗暗的）；點小頭像跳出完整的卡片（就是原本那一張）。
// - 荒、獰、淵的變種不另外列一格，收在本體的詳細資料裡。
// - 2026-10-04 作者找的參考圖（像一本書：左頁照地區分段的小頭像、右頁是點到的那一隻：名字、帶背景的大立繪、數值、說明、打倒過幾隻）：
//   寬的畫面改成左右兩頁，點小頭像直接在右頁顯示（變種列在下面）；窄的畫面（手機）照舊跳出卡片。左頁底下是收集的進度。
// - 2026-10-05 作者：圖鑑沒有記載領主變體——領主體分頁多一段「異變的領主體」（lordvariant.js 的 R.LORD_VARIANTS），
//   遇過的才亮、打倒過寫次數；點了右頁（手機跳出來的卡片）在本體的資料下面寫異變的名號、跟本體差在哪、兩條血、兩個形態的新招。
// 放在 main.js 前面就好（看 #cards 的變化，不包任何函式）。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s);
  let tab = 'mob', sel = null;
  const wide = () => window.matchMedia && window.matchMedia('(min-width: 780px)').matches;
  const baseOf = id => { const e = R.ENEMIES[id]; return (e && e.vbase) || (/_v\d$/.test(id) ? id.replace(/_v\d$/, '') : id); };
  const isLord = e => !!(e && e.boss);
  const kills = ids => { const k = R.S && R.S.dexKills; if (!k) return 0; return ids.reduce((a, id) => a + (k[id] || 0), 0); };
  const thumb = id => { const e = R.ENEMIES[id], url = R.beastIconURL ? R.beastIconURL(id, 2) : ''; return url ? '<img src="' + url + '" alt="">' : '<span class="dx-ch" style="background:' + (e.color || '#5A4A6A') + '">' + esc(e.name.split('・').pop()[0]) + '</span>'; };

  const build = (host, cardsHtml, ids) => {
    const card = {}; ids.forEach((id, i) => { card[id] = cardsHtml[i]; }); const extra = cardsHtml.slice(ids.length);
    const groups = {}; ids.forEach(id => { const b = baseOf(id); if (!R.ENEMIES[b]) return; (groups[b] = groups[b] || []).push(id); });
    const bases = Object.keys(groups);
    // 第一次出現的分級
    const sectionOf = id => {
      const e = R.ENEMIES[id];
      for (const g of R.GRADES) { if (isLord(e) ? ((g.lords || []).includes(id) || g.boss === id) : (g.pool || []).includes(id)) return g.id; }
      if (e.env) return 'env';
      return 'other';
    };
    const SECTIONS = R.GRADES.filter(g => g.id !== 'hunt').map(g => [g.id, g.name]).concat([['env', '極端環境'], ['other', '其他（佩特拉的反應、特別的）']]);
    const lords = bases.filter(b => isLord(R.ENEMIES[b])), mobs = bases.filter(b => !isLord(R.ENEMIES[b]));
    const grid = list => '<div class="dx-grid">' + list.map(b => { const n = kills([b].concat(variantsOf(b))), e = R.ENEMIES[b]; return '<button type="button" class="dx-th' + (n ? '' : ' dim') + '" data-dx="' + b + '" title="' + esc(e.name) + '">' + thumb(b) + (n ? '<i>' + n + '</i>' : '') + '</button>'; }).join('') + '</div>';
    const body = list => SECTIONS.map(([sid, nm]) => { const l = list.filter(b => sectionOf(b) === sid); return l.length ? '<h3 class="dx-h">' + esc(nm) + '<small>' + l.length + ' 種</small></h3>' + grid(l) : ''; }).join('');
    const seen = l => l.filter(b => kills([b].concat(variantsOf(b)))).length;
    // 異變的領主體（lordvariant.js）：遇過才亮，數字是打倒過的次數
    const LV = R.LORD_VARIANTS || {}, muts = lords.filter(b => LV[b]), lvSeen = b => !!(R.lordVariantSeen && R.lordVariantSeen(b));
    const mutGrid = () => muts.length ? '<h3 class="dx-h">異變的領主體<small>遇見過 ' + muts.filter(lvSeen).length + '／' + muts.length + '・克森特級以上才會出現</small></h3><div class="dx-grid">' + muts.map(b => { const ok = lvSeen(b), k = R.lordVariantKills ? R.lordVariantKills(b) : 0, e = R.ENEMIES[b]; return '<button type="button" class="dx-th lv-mut' + (ok ? '' : ' dim') + '" data-dx="' + b + '" data-dxmut="1" style="--lvc:' + LV[b][1] + '" title="' + esc(e.name + '【' + (ok ? LV[b][0] : '？？？') + '】') + '">' + thumb(b) + (k ? '<i>' + k + '</i>' : '') + '</button>'; }).join('') + '</div>' : '';
    const lvDex = id => (R.lordVariantDex ? R.lordVariantDex(id) : '');
    host.dataset.dexui = '1';
    const all = mobs.concat(lords), got = seen(all);
    host.innerHTML = '<div class="dx-book"><div class="dx-page dx-left"><div class="dx-tabs"><button type="button" class="dx-tab' + (tab === 'mob' ? ' on' : '') + '" data-dxtab="mob">遺跡生物 <small>' + seen(mobs) + '／' + mobs.length + '</small></button>'
      + '<button type="button" class="dx-tab' + (tab === 'lord' ? ' on' : '') + '" data-dxtab="lord">領主體 <small>' + seen(lords) + '／' + lords.length + '</small></button></div>'
      + '<p class="note dx-note">點小頭像看完整的資料。數字是打倒過的隻數（包括荒、獰、淵）；暗的是還沒打倒過的。</p>'
      + (tab === 'mob' ? body(mobs) + (extra.length ? '<h3 class="dx-h">不是敵人</h3><div class="dx-grid"><button type="button" class="dx-th" data-dxextra="0" title="牆瞳"><span class="dx-ch" style="background:#EDE0D6;color:#3A2E2A">瞳</span></button></div>' : '') : body(lords) + mutGrid())
      + '<p class="dx-count">已記錄 <b>' + got + '</b>／' + all.length + '</p></div><div class="dx-page dx-right" id="dx-detail"></div></div>';
    // 右頁：點到的那一隻（名字、帶背景的大立繪、原本那張卡片的數值和說明、變種）
    const detail = id => {
      const pane = $('dx-detail'), e = R.ENEMIES[id]; if (!pane || !e) return; sel = id;
      host.querySelectorAll('[data-dx]').forEach(b => b.classList.toggle('sel', b.dataset.dx === id));
      const g = R.GRADES.find(g => (g.pool || []).includes(id) || (g.lords || []).includes(id) || g.boss === id), th = g && R.THEMES && R.THEMES[g.id];
      const bg = (e.env && R.ENVS && R.ENVS[e.env] && R.ENVS[e.env].floor) || (th && th.floor) || '#3A3046', url = R.beastIconURL ? R.beastIconURL(id, 6) : '', n = kills([id].concat(variantsOf(id)));
      pane.innerHTML = '<div class="dx-banner">' + esc(e.name) + '</div><div class="dx-portrait' + (n ? '' : ' unseen') + '" style="--bg:' + bg + '">' + (url ? '<img src="' + url + '" alt="">' : '<span class="dx-ch" style="background:' + (e.color || '#5A4A6A') + '">' + esc(e.name.split('・').pop()[0]) + '</span>') + '</div>'
        + '<div class="dx-card">' + card[id] + '</div>'   /* 打倒過幾隻：卡片的數值列裡就有（monlabel.js 的 R.dexStats） */
        + (variantsOf(id).length ? '<h4 class="dx-h">分級變種</h4><div class="dx-vlist">' + variantsOf(id).map(v => { const ve = R.ENEMIES[v], k = R.S && R.S.dexKills ? R.S.dexKills[v] || 0 : 0; return '<div class="dx-var' + (k ? '' : ' dim') + '">' + thumb(v) + '<span>' + esc(ve.name) + '<small>' + (k ? '打倒 ' + k : '還沒打倒過') + '</small></span></div>'; }).join('') + '</div>' : '')
        + lvDex(id);
    };
    host.querySelectorAll('[data-dxtab]').forEach(b => { b.onclick = () => { tab = b.dataset.dxtab; build(host, cardsHtml, ids); }; });
    host.querySelectorAll('[data-dx]').forEach(b => { b.onclick = () => {
      const id = b.dataset.dx, lv = lvDex(id);
      if (wide()) { detail(id); const x = b.dataset.dxmut && $('dx-detail') && $('dx-detail').querySelector('.lv-dex'); if (x) x.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      else { open([card[id] + (lv ? '<div class="dx-lvwrap">' + lv + '</div>' : '')].concat(variantsOf(id).map(vcard)), []); const x = b.dataset.dxmut && document.querySelector('#dx-modal .lv-dex'); if (x) x.scrollIntoView({ block: 'nearest' }); }
    }; });
    if (wide()) { const list = tab === 'mob' ? mobs : lords; detail(list.includes(sel) ? sel : (list.find(b => kills([b].concat(variantsOf(b)))) || list[0])); }
    host.querySelectorAll('[data-dxextra]').forEach(b => { b.onclick = () => open([extra[+b.dataset.dxextra]], []); });
  };
  // 荒、獰、淵（variants.js 的變種不進圖鑑，這裡直接從資料做小卡片）
  const variantsOf = id => Object.keys(R.ENEMIES).filter(k => k !== id && (R.ENEMIES[k].vbase === id || k.indexOf(id + '_v') === 0));
  const vcard = id => { const e = R.ENEMIES[id], n = R.S && R.S.dexKills ? R.S.dexKills[id] || 0 : 0; return '<article class="card">' + (R.dexIcon ? R.dexIcon(id, '') : '') + '<b>' + esc(e.name) + '</b><small>' + (n ? '打倒過 ' + n + ' 隻' : '還沒打倒過') + '</small>' + (e.desc ? '<p>' + esc(e.desc) + '</p>' : '') + (R.dexStats ? R.dexStats(id) : '') + '</article>'; };
  // 詳細資料：本體的卡片，下面是荒、獰、淵
  const open = (htmls, ids) => {
    const old = $('dx-modal'); if (old) old.remove();
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'dx-modal'; m.style.zIndex = 60;
    const vars = htmls.slice(1);
    m.innerHTML = '<div class="sheet dx-sheet" role="dialog" aria-modal="true"><div class="cards dx-one">' + htmls[0] + '</div>'
      + (vars.length ? '<h3 class="dx-h">分級變種（到更高分級的遺跡會變成這樣）</h3><div class="cards dx-vars">' + vars.join('') + '</div>' : '')
      + '<div class="row"><button type="button" class="btn pri" id="dx-x">關閉</button></div></div>';
    document.body.appendChild(m);
    const close = () => m.remove(); $('dx-x').onclick = close; m.onclick = e => { if (e.target === m) close(); };
  };
  // main.js 把卡片放進 #cards 的時候，整理成新的樣子
  const watch = () => {
    const host = $('cards'); if (!host) return;
    new MutationObserver(() => {
      if (host.dataset.dexui === '1' && host.querySelector('.dx-tabs')) return;
      const arts = [...host.children].filter(x => x.tagName === 'ARTICLE'); if (!arts.length) return;
      const ids = Object.keys(R.ENEMIES).filter(id => !R.ENEMIES[id].human && !R.ENEMIES[id].noDex);
      if (arts.length < ids.length) return;
      build(host, arts.map(a => a.outerHTML), ids);
    }).observe(host, { childList: true });   // main.js 每次打開圖鑑都會重寫 #cards（分頁不見了），這裡就再整理一次
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();

  const css = document.createElement('style');
  css.textContent = '#cards[data-dexui]{display:block}'
    + '.dx-book{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:0;align-items:start;background:linear-gradient(90deg,rgba(0,0,0,0) 0,rgba(0,0,0,0) calc(60% - 10px),rgba(0,0,0,.35) 60%,rgba(0,0,0,0) calc(60% + 10px));border:1px solid var(--line);border-radius:12px;padding:12px}'
    + '.dx-page{min-width:0;padding:4px 14px}.dx-right{position:sticky;top:8px}.dx-count{text-align:center;opacity:.85;margin:14px 0 2px}.dx-count b{color:var(--gold,#C9A13A)}'
    + '.dx-th.sel{border-color:var(--gold,#C9A13A);box-shadow:0 0 0 2px rgba(201,161,58,.5) inset}'
    + '.dx-banner{text-align:center;font-weight:700;font-size:18px;padding:6px 12px;margin:0 auto 10px;max-width:90%;background:linear-gradient(90deg,transparent,rgba(201,161,58,.35) 18%,rgba(201,161,58,.35) 82%,transparent);border-radius:4px}'
    + '.dx-portrait{width:min(220px,80%);aspect-ratio:1;margin:0 auto 10px;display:grid;place-items:center;border:3px solid #6A5238;border-radius:6px;background:radial-gradient(circle at 50% 60%,color-mix(in srgb,var(--bg) 70%,#fff 30%),var(--bg) 70%);box-shadow:0 4px 14px rgba(0,0,0,.45) inset}'
    + '.dx-portrait img{width:78%;height:78%;object-fit:contain;image-rendering:pixelated}.dx-portrait.unseen img{filter:brightness(0) opacity(.7)}.dx-portrait .dx-ch{width:50%;font-size:28px}'
    + '.dx-card .card{display:block;background:none;border:0;padding:0;box-shadow:none}.dx-card .card>*{margin:4px 0}.dx-card .card>.em,.dx-card .card>b:first-of-type{display:none}.dx-kills{margin:8px 0;opacity:.9}.dx-kills b{color:var(--gold,#C9A13A)}'
    + '.dx-vlist{display:grid;gap:6px}.dx-var{display:flex;align-items:center;gap:8px}.dx-var img,.dx-var .dx-ch{width:34px;height:34px;image-rendering:pixelated}.dx-var small{display:block;opacity:.75}.dx-var.dim img{filter:grayscale(1) brightness(.55)}'
    + '@media (max-width:779px){.dx-book{display:block;background:none;border:0;padding:0}.dx-right{display:none}}'
    + '.dx-tabs{display:flex;gap:6px;margin:0 0 8px}.dx-tab{flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:inherit;font:inherit;font-weight:700;cursor:pointer}'
    + '.dx-tab.on{background:var(--gold,#C9A13A);color:#1A1410;border-color:transparent}.dx-tab small{font-weight:400;opacity:.8;margin-left:4px}'
    + '.dx-note{margin:4px 0 10px}.dx-h{display:flex;align-items:baseline;gap:8px;margin:14px 0 6px;font-size:15px}.dx-h small{font-weight:400;opacity:.7;font-size:12px}'
    + '.dx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:6px}'
    + '.dx-th{position:relative;aspect-ratio:1;display:grid;place-items:center;border-radius:8px;border:1px solid var(--line);background:rgba(255,255,255,.05);cursor:pointer;padding:4px}'
    + '.dx-th:hover,.dx-th:focus-visible{border-color:var(--gold,#C9A13A);background:rgba(201,161,58,.12)}'
    + '.dx-th img{max-width:100%;max-height:100%;image-rendering:pixelated}.dx-th.dim img,.dx-th.dim .dx-ch{filter:grayscale(1) brightness(.55)}'
    + '.dx-th i{position:absolute;right:2px;bottom:1px;font-style:normal;font-size:10px;font-weight:700;color:#F2D98A;text-shadow:0 1px 2px #000}'
    + '.dx-ch{width:70%;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff}'
    + '.dx-sheet{width:min(620px,100%)}.dx-one,.dx-vars{display:grid;grid-template-columns:1fr;gap:8px}.dx-vars{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}';
  document.head.appendChild(css);
})(window.R);
