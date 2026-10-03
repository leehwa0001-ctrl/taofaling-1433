// 新手指引（2026-10-04 回饋：指引太少，除了公會，其他地方可以幹嘛、有什麼用都不太確定；沒有主線劇情，要有別的方式指引新手）
// - 「東鶴指南」：每一個地方能做什麼，旁邊有「前往」（公會的接駁馬車，fasttravel.js）。城裡的選單、第一次進城自己打開。
// - 「新手的第一步」：公會→第一趟遺跡→繳交委託→鑑定→換裝備→補藥→快速移動，做到哪裡打勾；全部做完公會送 300 費拉。
//   城裡左上角一個小框寫下一步（可以收起來）。存在 R.S.tut。
// 放在 fasttravel.js、guildtask.js 後面。
(function (R) {
  const W = R.W, $ = id => document.getElementById(id), esc = s => R.esc(s), S = () => R.S;
  const PLACES = [
    ['公會東鶴分館', '公會東鶴分館', '登記處：勇者證、接委託（也可以不接、自己下遺跡）、繳交委託（回來要繳交才拿報酬）、序號兌換、種族抽選券。酒場：遺跡的傳聞、找同行的勇者。二樓：遺跡生物圖鑑、全國遺跡分布圖。'],
    ['老岩的鐵匠鋪', '老岩的鐵匠鋪', '鑑定從遺跡帶回來的未鑑定裝備（不鑑定只有基礎數值）、強化、用素材製作、拆解。'],
    ['白藤堂（藥鋪）', '白藤堂', '買回復藥、魔力藥；藥草三株換一瓶回復藥。'],
    ['倉庫', '倉庫', '換裝備、看角色的總數值、賣掉不要的東西（按住「賣掉」同一個稀有度一起賣）、讀經驗書。'],
    ['赤提燈（居酒屋・宿屋）', '赤提燈', '吃飯（當天下遺跡有加成，各家餐廳也是）、住一晚。'],
    ['驛站', '驛站', '搭馬車到昭旭各地的遺跡（全國地圖）。'],
    ['東鶴站', '東鶴站', '搭魔導電車到南邊的陪都「奉主」：大城市、觀光章、小吃。'],
    ['世界中央銀行', '世界中央銀行', '存錢（有利息，扒手扒不走）、股票。'],
    ['東鶴醫院', '東鶴醫院', '治療開車出車禍受的傷。'],
    ['自己的家（公團住宅）', '自己的家', '租房子。打敗同一種遺跡生物 50 次，家裡的小花園會多一隻小同伴，可以帶出門。'],
    ['城邊的遺跡入口', '遺跡入口：霜溪石窟', '霜溪石窟是哈米莉亞級（最簡單），新手先從這裡下去。城西遺跡、北山礦坑・深層比較難。']
  ];
  const STEPS = [
    ['guild', '到公會東鶴分館，打開登記處看自己的勇者證', '公會東鶴分館'],
    ['run', '從霜溪石窟（哈米莉亞級）下一趟遺跡：接委託或自己下去都可以', '遺跡入口：霜溪石窟'],
    ['turnin', '回公會的登記處「繳交委託」（自己下去的話可以略過）', '公會東鶴分館'],
    ['smith', '帶未鑑定的裝備去老岩的鐵匠鋪鑑定', '老岩的鐵匠鋪'],
    ['stash', '到倉庫換上比較好的裝備', '倉庫'],
    ['shop', '到白藤堂補回復藥', '白藤堂'],
    ['ft', '按 T 叫公會的接駁馬車（快速移動）', null]
  ];
  const tut = () => { const s = S(); if (!s) return {}; s.tut = s.tut || {}; return s.tut; };
  const done = id => { const t = tut(); if (id === 'turnin') return !!(t.turnin || (S().tasks || []).length || t.freeRun); return !!t[id]; };
  const mark = id => { const t = tut(); if (t[id]) return; t[id] = S().day || 1; R.save(); upd(true); if (STEPS.every(st => done(st[0])) && !t.reward) { t.reward = 1; S().gold += 300; R.save(); setTimeout(() => R.banner && R.banner('新手指引完成！', '公會送來 300 費拉。之後可以往阿彌勒級、摩爾斯級挑戰。'), 600); } };
  const next = () => STEPS.find(st => !done(st[0]));
  const goTo = name => { const sp = R.ftSpots && R.ftSpots().find(v => v.n.indexOf(name) === 0); if (sp && R.ftGo) { if (R.VEH && R.VEH.cur) { R.toast('先下車。'); return; } R.ftGo(sp); } else R.toast('先走出去，到外面再搭馬車。'); };
  R.guideSheet = () => {
    const t = tut();
    R.sheet('<p class="kicker">東鶴指南</p><h2>東鶴有什麼</h2>'
      + '<h3>新手的第一步</h3><ol class="gd-steps">' + STEPS.map(st => '<li class="' + (done(st[0]) ? 'ok' : '') + '">' + (done(st[0]) ? '✓ ' : '') + esc(st[1]) + (st[2] && !done(st[0]) ? ' <button type="button" class="mini" data-gd="' + esc(st[2]) + '">前往</button>' : '') + '</li>').join('') + '</ol>'
      + (t.reward ? '<p class="note">新手指引已經完成了。</p>' : '<p class="note">全部做完，公會送 300 費拉。</p>')
      + '<h3>每個地方能做什麼</h3><div class="gd-places">' + PLACES.map(p => '<div class="gd-place"><b>' + esc(p[0]) + '</b><small>' + esc(p[2]) + '</small><button type="button" class="mini" data-gd="' + esc(p[1]) + '">前往</button></div>').join('') + '</div>'
      + '<p class="note">按鍵：空白鍵 互動・Shift 跑步・T 快速移動・Tab 或 M 地圖・Esc 選單・I 背包（遺跡裡）。觀光章、奉主、柏青哥、麻將……都是可以慢慢玩的。</p>',
      '<div class="row"><button type="button" class="btn pri" id="gd-x">知道了</button>' + (t.hide ? '<button type="button" class="btn" id="gd-show">在左上角顯示下一步</button>' : '') + '</div>');
    $('gd-x').onclick = R.closeSheet; if ($('gd-show')) $('gd-show').onclick = () => { t.hide = 0; R.save(); R.closeSheet(); upd(true); };
    document.querySelectorAll('[data-gd]').forEach(b => { b.onclick = () => { R.closeSheet(); setTimeout(() => goTo(b.dataset.gd), 60); }; });
  };
  // 左上角的小框：下一步
  let box = null;
  const upd = force => {
    const s = S(); if (!s) return;
    const ok = W.town && !W.run && !W.town.hosu && $('run') && !$('run').hidden, t = tut(), st = next();
    if (!box || !box.isConnected) { const tl = $('r-where'); if (!tl || !tl.parentNode) return; box = document.createElement('div'); box.id = 'gd-box'; box.className = 'glass'; tl.parentNode.insertBefore(box, tl.nextSibling); }
    const show = ok && !t.hide && !!st; box.hidden = !show; if (!show) return;
    const key = st[0]; if (!force && box.dataset.k === key) return; box.dataset.k = key;
    box.innerHTML = '<small>新手指引・下一步</small><b>' + esc(st[1]) + '</b><span>' + (st[2] ? '<button type="button" class="mini" id="gd-go">前往</button>' : '') + '<button type="button" class="mini" id="gd-all">指南</button><button type="button" class="mini" id="gd-hide">收起</button></span>';
    if ($('gd-go')) $('gd-go').onclick = () => goTo(st[2]); $('gd-all').onclick = R.guideSheet; $('gd-hide').onclick = () => { t.hide = 1; R.save(); upd(true); R.toast('收起來了。城裡的選單「東鶴指南」還看得到。'); };
  };
  const th0 = R.townHud; R.townHud = (f, dt) => { const r = th0(f, dt); try { upd(f); } catch (e) { } return r; };
  // 做到了就打勾
  const hub0 = R.hub; R.hub = (t, f) => { const r = hub0(t, f); try { if (t === 'guild') mark('guild'); else if (t === 'stash') mark('stash'); else if (t === 'smith') mark('smith'); else if (t === 'shop') mark('shop'); } catch (e) { } return r; };
  const sr0 = R.startRun; R.startRun = id => { const r = sr0(id), run = W.run; if (run && run.site && run.site.id === id) { mark('run'); if (run.free) tut().freeRun = 1; } return r; };
  const ti0 = R.turnInTask; if (ti0) R.turnInTask = (...a) => { const r = ti0(...a); mark('turnin'); return r; };
  const ft0 = R.ftGo; if (ft0) R.ftGo = sp => { mark('ft'); return ft0(sp); };
  const fo0 = R.fastTravel; if (fo0) R.fastTravel = (...a) => { const r = fo0(...a); if (document.querySelector('[data-ft]')) { document.querySelectorAll('[data-ft]').forEach(b => b.addEventListener('click', () => mark('ft'))); } return r; };
  // 城裡的選單：「東鶴指南」；第一次進城自己打開
  const tm = R.townMenu; if (tm) R.townMenu = (...a) => { const r = tm(...a), row = $('r-sheet') && $('r-sheet').querySelector('.row'); if (row && !row.querySelector('#gd-open') && W.town && !W.town.hosu) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'gd-open'; b.textContent = '東鶴指南'; b.onclick = () => { R.closeSheet(); setTimeout(R.guideSheet, 50); }; row.insertBefore(b, row.children[1] || null); } return r; };
  const en0 = R.enterTownNow; R.enterTownNow = (...a) => { const r = en0(...a), t = tut(); if (S() && !t.seen && W.town && !W.town.hosu) { t.seen = 1; R.save(); setTimeout(() => { if (!(R.sheetOpen && R.sheetOpen())) R.guideSheet(); }, 4200); } return r; };
  const css = document.createElement('style');
  css.textContent = '#gd-box{margin-top:6px;padding:6px 10px;max-width:340px;display:grid;gap:2px;font-size:13px}#gd-box small{opacity:.7;font-size:11px}#gd-box span{display:flex;gap:4px;flex-wrap:wrap;margin-top:2px}#run:not(.town) #gd-box{display:none}'
    + '.gd-steps{margin:4px 0 8px;padding-left:1.4em;display:grid;gap:3px}.gd-steps li.ok{opacity:.6}.gd-places{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px}.gd-place{background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:6px 10px;display:grid;gap:3px}.gd-place small{opacity:.85}.gd-place .mini{justify-self:start}';
  document.head.appendChild(css);
})(window.R);
