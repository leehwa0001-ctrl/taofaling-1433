// 圖鑑整理（玩家回饋 2026-10-04：分類、簡化，照分級區分；先只出現小頭像，點進去才顯示完整資訊；領主和小怪分兩個分頁）
// - main.js 照原本的做法把卡片放進 #cards 之後，這裡把它重新排成：
//   上面兩個分頁「遺跡生物／領主體」；遺跡生物照第一次出現的分級分段（哈米莉亞、阿彌勒、摩爾斯、克森特……），另外有「極端環境」「其他」。
//   每一段是一排小頭像（打倒過的寫隻數，沒打倒過的暗暗的）；點小頭像跳出完整的卡片（就是原本那一張）。
// - 荒、獰、淵的變種不另外列一格，收在本體的詳細資料裡。
// - 2026-10-04 作者找的參考圖（像一本書：左頁照地區分段的小頭像、右頁是點到的那一隻：名字、帶背景的大立繪、數值、說明、打倒過幾隻）：
//   寬的畫面改成左右兩頁，點小頭像直接在右頁顯示（變種列在下面）；窄的畫面（手機）照舊跳出卡片。左頁底下是收集的進度。
// - 2026-10-05 作者：圖鑑沒有記載領主變體——領主體分頁多一段「異變的領主體」（lordvariant.js 的 R.LORD_VARIANTS），
//   遇過的才亮、打倒過寫次數；點了右頁（手機跳出來的卡片）在本體的資料下面寫異變的名號、跟本體差在哪、兩條血、兩個形態的新招。
// - 2026-10-05 作者：遺跡圖鑑最上層的分頁（原本「遺跡生物、領主體、遺跡」）換成「總覽、哈米莉亞級、阿彌勒級、摩爾斯級、克森特級、卡索級」，
//   跟原本「遺跡」那一頁一樣：選分級 → 選遺跡 → 再分「小怪、領主體、遺跡詳情」三個小分頁；「環境生物」那一類拿掉（併進那座遺跡的小怪）。
//   這個檔案現在只做書本的外框和六個大分頁；裡面的內容都是 dexruins.js 畫的（R.dexRuins.mount）。
// 放在 main.js 前面就好（看 #cards 的變化，不包任何函式）。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s);
  // 大分頁：總覽＋五個分級（坎賽特級照設定不開放，不列）
  const TABS = [['all', '總覽'], ['hamilia', '哈米莉亞級'], ['amile', '阿彌勒級'], ['mors', '摩爾斯級'], ['kesent', '克森特級'], ['kaso', '卡索級']];
  R.DEX_TABS = TABS;
  const build = (host, cardsHtml, ids) => {
    const card = {}; ids.forEach((id, i) => { card[id] = cardsHtml[i]; });
    R.dexCardHTML = id => card[id] || '';   // main.js 原本那一張卡片（dexruins.js 的右頁用）
    host.dataset.dexui = '1';
    host.innerHTML = '<div class="dx-book"><div class="dx-page dx-left"><div class="dx-tabs dx-gtabs">'
      + TABS.map(([g, n]) => '<button type="button" class="dx-tab" data-dxg="' + g + '" style="--gc:' + (g === 'all' ? '#C9A13A' : ((R.GRADE_COLOR || {})[g] === '#1A1A1A' ? '#8A8A96' : (R.GRADE_COLOR || {})[g] || '#8A7A6A')) + '">' + esc(n) + '</button>').join('')
      + '</div><div class="dx-body"></div></div><div class="dx-page dx-right" id="dx-detail"></div></div>';
    if (R.dexRuins && R.dexRuins.mount) R.dexRuins.mount(host);
  };
  // main.js 把卡片放進 #cards 的時候，整理成新的樣子
  const watch = () => {
    const host = $('cards'); if (!host) return;
    new MutationObserver(() => {
      if (host.dataset.dexui === '1' && host.querySelector('.dx-gtabs')) return;
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
    + '.dx-gtabs{flex-wrap:wrap}.dx-gtabs .dx-tab{flex:1 1 auto;min-width:76px;padding:7px 8px;font-size:13px;border-bottom:3px solid var(--gc)}.dx-gtabs .dx-tab.on{background:var(--gc);color:#140E0A}'
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
