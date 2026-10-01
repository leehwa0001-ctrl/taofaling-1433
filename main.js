// 討伐令 1433：畫面切換、地圖上的遺跡資料、遺跡生物圖鑑
(function (R) {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const show = id => R.showScreen(id);
  const back = () => { if (R.base === 'town' && R.S) R.backToTown(); else if (R.base === 'hub' && R.S) { show('hub'); R.hub(); } else titleScreen(); };

  // 國旗：旭日、山與海（作者提供的新國旗）
  const flag = '<img class="flag" src="flag.webp" alt="昭旭聯合王國國旗" width="72" height="54">';
  const flagBig = '<figure class="flag-big"><img src="flag.webp" alt="昭旭聯合王國國旗：紅色的旭日從藍色的山後升起，山下是海浪" width="1448" height="1086"><figcaption>昭旭聯合王國國旗：旭日、山與海</figcaption></figure>';

  // ---------- 地圖 ----------
  let which = 'nation', pz = null, sel = null;
  const cartouche = () => {
    $('cartouche').innerHTML = which === 'nation'
      ? flag + '<div><b>' + R.NATION.name + '</b><small>首都 ' + R.NATION.capital + '・人口' + R.NATION.pop + '・' + R.NATION.gov + '</small><small>公會測繪部　遺跡分布圖　公元 ' + R.NATION.year + ' 年</small></div>'
      : flag + '<div><b>東鶴近郊</b><small>昭旭聯合王國陪都・公會東鶴分館轄區</small><small>示意圖，距離未照比例</small></div>';
  };
  const drawMap = () => {
    $('map-host').innerHTML = which === 'nation' ? R.drawNation() : R.drawDonghe();
    const svg = $('map-host').querySelector('svg');
    pz = R.panZoom(svg, pick);
    $('tab-nation').setAttribute('aria-selected', which === 'nation'); $('tab-donghe').setAttribute('aria-selected', which === 'donghe');
    cartouche();
    document.querySelector('.map-wrap').classList.toggle('inset', which === 'donghe');
    if (sel && R.SITES.find(s => s.id === sel && s.map === which)) mark(sel);
  };
  const mark = id => { document.querySelectorAll('#map-host .site').forEach(g => g.classList.toggle('sel', g.dataset.site === id)); };
  const openMap = (w, focus) => { which = w; R.syncStatus(); show('map'); $('m-back').textContent = R.base === 'hub' || R.base === 'town' ? '東鶴' : '標題'; drawMap(); if (focus) pick(focus); else if (!sel) intro(); else pick(sel); };
  R.openMap = openMap;
  // 在建築物裡面打開地圖、圖鑑：先暫停，回來時回到原來的地方
  R.openMapPaused = (w, focus) => { if (R.W) R.W.paused = true; openMap(w, focus); };
  R.openBest = () => { if (R.W) R.W.paused = true; openBest(); };

  // ---------- 遺跡資料 ----------
  const gradeOf = s => R.gradeById(s.grade);
  const floorsOf = s => { const g = gradeOf(s), t = R.TYPES[s.type]; return g && g.floors ? Math.max(2, g.floors + (t ? t.floors : 0)) : null; };
  const monstersOf = s => { const g = gradeOf(s); if (!g || !g.pool) return []; let ids = g.pool.slice(); if (s.env) ids = ids.concat(Object.keys(R.ENEMIES).filter(k => R.ENEMIES[k].env === s.env)); if (g.lords) ids = ids.concat(g.lords); if (g.boss) ids.push(g.boss); return ids; };
  const LORE = {
    hamilia: '威脅最低。經公會登記與審核，一般民眾也能進入；轉化效率低，戰利品多半靠人工採集。',
    amile: '保留區裡數量最多的分級，也是初階勇者試煉的主要來源。從這一級開始，只有取得公會勇者資格的人能進入。',
    mors: '沒有保留區常見的「第 0 層」。遺跡生物開始有領地意識，會成群協作、組織狩獵。',
    kesent: '入口會因為空間錯位、自我閉合而消失，只能靠公會的傳送水晶投送。內部有極端環境與區域支配者「領主體」。',
    kaso: '以舊太陽神「卡索．昂」命名。不同隊伍在相近的時間進入同一區，回報的地形卻完全不同。公會禁止任何個人單獨進入。'
  };
  const status = s => {
    if (s.status === 'open') return '<span class="stamp open">開放中</span>';
    if (s.status === 'forbidden') return '<span class="stamp forbidden">禁止進入</span>';
    const g = gradeOf(s), u = g && g.unlock ? R.gradeById(g.unlock) : null;
    return '<span class="stamp lock">未開放</span><p class="hand">' + (u ? '要先從' + esc(u.name) + '遺跡的最深處活著回來，公會才會發這一級的委託。' : '') + '</p>';
  };
  const carry = '<h3>帶得出來的東西</h3><p>寶箱開出的道具、防具、武器、素材；遺跡生物體內的魔力水晶、魔力核心；礦殼背上的礦石。其他在遺跡裡撿到的東西，一出遺跡就會分解，過樓層通道時也會自己消失。</p><p class="hand">寶箱開出的武器，大多是「未鑑定」的。帶回東鶴，給老岩的鐵匠鋪鑑定。</p>';
  const facilities = '<h3>東鶴的設施</h3><div class="fac"><div><b>公會東鶴分館</b><span>西市口的綠旗石樓。遺跡委託、職業登記、轉職。</span></div><div><b>老岩的鐵匠鋪</b><span>鑑定、製作、強化、分解。</span></div><div><b>白藤堂</b><span>回復藥、魔力藥。</span></div><div><b>倉庫</b><span>放裝備和素材。帶下去的東西，死在遺跡裡就沒了。</span></div><div><b>菅婆婆的糰子攤</b><span>還在西市口。</span></div></div>';
  const intro = () => {
    $('panel').innerHTML = '<article class="doc"><div class="order">公會令－討伐令第 1433 號　遺跡分布圖</div><h2>點一個地點看看</h2>'
      + flagBig + '<p>昭旭聯合王國是大陸東邊的三座島：北邊的北州、本土天宮、南邊的納瓦。海峽對面是華爾納蘭特中央帝國。</p>'
      + '<p>眼睛的記號是遺跡，顏色是公會的分級。先從<b>東鶴</b>附近的遺跡開始——東鶴近郊有兩座開放中的阿彌勒級、一座給新人的哈米莉亞級。</p>'
      + '<p class="hand">國界與海岸線，取自艾菲爾斯特的世界地圖。</p></article>'
      + '<p class="hint">拖曳移動地圖，滾輪或雙指縮放。</p>';
  };
  function pick(id) {
    const s = R.SITES.find(x => x.id === id); if (!s) return;
    sel = id; mark(id);
    let h = '<article class="doc"><div class="order">公會令－討伐令第 1433 號　' + (s.kind === 'ruin' || s.kind === 'forbidden' ? '遺跡資料' : '地點') + '</div><h2>' + esc(s.name) + '</h2>'
      + '<div class="src">' + (R.SRC[s.src] || '') + '</div>';
    if (s.kind === 'ruin' || s.kind === 'forbidden') {
      const g = gradeOf(s), t = R.TYPES[s.type], env = s.env ? R.ENVS[s.env] : null, fl = floorsOf(s), c = R.GRADE_COLOR[s.grade];
      h += '<div class="badges"><span class="badge fill" style="background:' + c + ';border-color:' + c + '">' + esc(g.name) + '（' + esc(g.letter) + '）</span><span class="badge" style="color:' + (g.zone === '討伐區' ? '#8A1E18' : '#3E6A48') + '">' + esc(g.zone) + '</span>'
        + (t ? '<span class="badge" style="color:#4A3A28">' + esc(t.name) + '</span>' : '') + (env ? '<span class="badge" style="color:#8A4A1E">' + esc(env.name) + '環境</span>' : '') + '</div>';
      h += '<p>' + esc(s.desc) + '</p>';
      h += '<dl>' + (fl ? '<dt>推定層數</dt><dd>' + fl + ' 層' + (t ? '（' + esc(t.desc) + '）' : '') + '</dd>' : '')
        + (g.floors ? '<dt>回歸水晶</dt><dd>' + (g.crystal === 'start' ? '每一層的入口旁都有' : g.crystal === 'stairs' ? '只在每一層的樓層通道旁' : '沒有。打倒最深處的核心之前回不來') + '</dd>' : '')
        + (g.floors ? '<dt>反應型</dt><dd>未知（破壞太多東西時才會知道）</dd>' : '')
        + (env ? '<dt>環境</dt><dd>' + esc(env.desc) + '</dd>' : '') + '</dl>';
      const mons = monstersOf(s);
      if (mons.length) h += '<h3>已知的遺跡生物</h3><div class="mons">' + mons.map(k => { const e = R.ENEMIES[k]; return '<span class="mon">' + esc(e.name) + '</span>'; }).join('') + '</div>';
      h += '<h3>公會的分級說明</h3><p>' + esc(LORE[s.grade] || g.locked || '') + '</p>';
      if (s.kind === 'ruin') h += carry;
      h += status(s);
      if (s.kind === 'ruin') h += '<div class="doc-actions">' + (s.status !== 'open' ? '<button type="button" class="btn pri" disabled>還不能出發</button>' : R.S ? '<button type="button" class="btn pri" data-go="' + s.id + '">出發（' + esc(R.clsName(R.S.cls)) + ' Lv ' + R.S.classes[R.S.cls].lv + '）</button>' : '<button type="button" class="btn pri" data-new="1">先到公會登記職業</button>') + '<button type="button" class="btn" data-best="1">看遺跡生物</button></div>';
    } else {
      if (s.kind === 'capital') h += flagBig;
      h += '<p>' + esc(s.desc) + '</p>';
      if (s.id === 'donghe' || s.hub) h += facilities;
      h += '<div class="doc-actions">' + (s.zoom ? '<button type="button" class="btn pri" data-zoom="' + s.zoom + '">打開東鶴近郊的地圖</button>' : '') + (s.hub || s.id === 'donghe' ? '<button type="button" class="btn' + (s.hub ? ' pri' : '') + '" data-town="1">走進東鶴</button>' : '') + '</div>';
    }
    h += '</article>';
    $('panel').innerHTML = h; $('panel').scrollTop = 0;
    const z = $('panel').querySelector('[data-zoom]'); if (z) z.onclick = () => openMap('donghe', 'dh-town');
    const b = $('panel').querySelector('[data-best]'); if (b) b.onclick = () => openBest();
    const go = $('panel').querySelector('[data-go]'); if (go) go.onclick = () => R.startRun(go.dataset.go);
    const nw = $('panel').querySelector('[data-new]'); if (nw) nw.onclick = () => R.showPick();
    const tw = $('panel').querySelector('[data-town]'); if (tw) tw.onclick = enterTown;
  }

  // ---------- 圖鑑 ----------
  const whereOf = id => {
    const e = R.ENEMIES[id], out = [];
    R.GRADES.forEach(g => { if ((g.pool || []).includes(id)) out.push(g.name); if ((g.lords || []).includes(id)) out.push(g.name + '的領主體'); if (g.boss === id) out.push(g.name + '最深處'); });
    if (e.env) out.push(R.ENVS[e.env].name + '環境');
    if (id === 'gaki') out.push('生物型反應');
    if (id === 'okuriinu') out.push('摩爾斯級最深處的巢（群首）');
    if (id === 'petra') out.push('每一座遺跡的最深處（保留區的核心受公會保護）、驅逐型反應');
    return out;
  };
  const openBest = () => {
    show('bestiary'); $('b-back').textContent = R.base === 'hub' || R.base === 'town' ? '東鶴' : '標題';
    $('cards').innerHTML = Object.keys(R.ENEMIES).filter(id => !R.ENEMIES[id].human && !R.ENEMIES[id].noDex).map(id => { const e = R.ENEMIES[id], nm = e.name.split('・').pop(); return '<article class="card' + (e.boss ? ' boss' : '') + '"><span class="em" style="background:' + e.color + '">' + esc(nm[0]) + '</span><b>' + esc(e.name) + '</b><small>' + (e.ref === '公會文件' ? '公會正式名稱' : '公會東鶴分館的圖鑑名') + '</small><p>' + esc(e.desc) + '</p><div class="where">出沒：' + esc(whereOf(id).join('、') || '—') + '</div></article>'; }).join('')
      + '<article class="card"><span class="em" style="background:#EDE0D6">瞳</span><b>牆瞳</b><small>不是敵人</small><p>' + esc(R.MOKUMOKUREN) + '</p><div class="where">出沒：所有遺跡的牆上</div></article>';
  };

  // ---------- 綁定 ----------
  // ---------- 標題、東鶴 ----------
  const enterTown = () => { if (!R.S) { newGame(); return; } R.enterTown(); };
  const newGame = () => { for (let i = 1; i <= R.SLOT_N; i++) if (!R.slotInfo(i)) { R.createChar(i); return; } R.say('三格存檔都滿了：先在下面刪掉一格，或讀取其中一格。'); };
  const titleScreen = () => {
    if (R.leaveTown) R.leaveTown();
    show('title');
    const s = R.S, st = s && s.classes[s.cls];
    $('t-go').hidden = !s;
    if (s) $('t-go').querySelector('small').textContent = (s.name ? s.name + '・' : '') + R.clsName(s.cls) + ' Lv ' + st.lv + (R.dateOf ? '・' + R.shortDate(R.dateOf(s.day || 0)) : '');
    $('t-new').querySelector('small').textContent = '抽種族、捏角、登記武器';
    slots();
  };
  // 三格存檔：讀取、刪除（按兩次）、在空的格子開始新的冒險
  let delArm = 0;
  const slots = () => {
    let h = '';
    for (let i = 1; i <= R.SLOT_N; i++) {
      const inf = R.slotInfo(i), cur = R.S && R.slot === i;
      h += '<div class="slot-card' + (cur ? ' cur' : '') + '"><b>存檔 ' + i + (cur ? '（現在）' : '') + '</b>'
        + (inf ? '<span>' + esc(inf.name) + '</span><small>' + esc(inf.race + '・' + inf.cls + ' Lv ' + inf.lv + '・' + inf.gold + ' 費拉' + (inf.date ? '・' + inf.date : '')) + '</small><div class="row"><button type="button" class="mini gold" data-load="' + i + '">' + (cur ? '繼續' : '讀取') + '</button><button type="button" class="mini" data-del="' + i + '">' + (delArm === i ? '再按一次：確定刪除' : '刪除') + '</button></div>'
          : '<small>空的</small><div class="row"><button type="button" class="mini gold" data-newslot="' + i + '">在這一格開始新的冒險</button></div>') + '</div>';
    }
    $('t-slots').innerHTML = h;
    $('t-slots').querySelectorAll('[data-load]').forEach(b => { b.onclick = () => { R.useSlot(+b.dataset.load); R.syncStatus(); R.enterTown(); }; });
    $('t-slots').querySelectorAll('[data-del]').forEach(b => { b.onclick = () => { const i = +b.dataset.del; if (delArm !== i) { delArm = i; slots(); return; } delArm = 0; R.deleteSlot(i); titleScreen(); }; });
    $('t-slots').querySelectorAll('[data-newslot]').forEach(b => { b.onclick = () => R.createChar(+b.dataset.newslot); });
  };
  $('t-go').onclick = enterTown;
  R.goTitle = () => titleScreen();
  $('t-new').onclick = newGame;
  $('p-back').onclick = titleScreen;
  R.setPixel();
  $('h-map').onclick = () => openMap('nation');
  $('h-best').onclick = openBest;
  $('h-title').onclick = titleScreen;
  $('t-map').onclick = () => openMap('nation');
  $('t-best').onclick = openBest;
  $('m-back').onclick = $('b-back').onclick = back;
  // 桌機的滑鼠也能按遺跡裡的按鈕（觸控在 run.js 裡處理）
  document.querySelectorAll('[data-tact]').forEach(b => b.addEventListener('click', () => R.tact(b.dataset.tact)));
  $('m-best').onclick = openBest;
  $('b-map').onclick = () => openMap(which);
  $('tab-nation').onclick = () => openMap('nation');
  $('tab-donghe').onclick = () => openMap('donghe');
  $('z-in').onclick = () => pz && pz.zoom(1 / 1.3);
  $('z-out').onclick = () => pz && pz.zoom(1.3);
  $('z-reset').onclick = () => pz && pz.reset();
  if (window.matchMedia && matchMedia('(max-width: 820px)').matches) $('legend').open = false;
  document.body.classList.toggle('touch', !!R.touch);
  // three.js 只有進遺跡才用得到：先在背景載入，按「出發」時還沒好就等一下
  R.three = new Promise((ok, no) => { if (window.THREE) { ok(); return; } const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js'; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
  R.three.catch(() => { });
  const startRun = R.startRun;
  R.startRun = id => { if (!window.THREE) R.say('正在打開遺跡的入口……'); R.three.then(() => startRun(id), () => R.say('3D 引擎載入失敗了。請檢查網路後重新整理。')); };
  R.S = R.load(); if (R.S && R.ensureWorld) R.ensureWorld();
  R.syncStatus();
  titleScreen();
})(window.R);
