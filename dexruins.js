// 討伐令 1433：圖鑑多一頁「遺跡」（作者 2026-10-04：圖鑑感覺可以多一個專門介紹遺跡的，順便提到內部出產魔物之類的，我接任務有時候都不確定要往哪裡刷；
//   版面照作者畫的：上面分級的分頁＋「特殊種」分頁；一列一列照深度排，黑色代表淺層、紅色代表深層——或每個頁面是那個遺跡自己的顏色，越往下越深；
//   變異種只在深層出現，外觀越深越危險）
// - dexui.js 的分頁旁邊多一個「遺跡」。左頁：分級的分頁（哈米莉亞、阿彌勒、摩爾斯、克森特、特殊種）→ 那個分級的遺跡 →
//   這座遺跡的三列（淺層、中層、深層），每一列是那個深度會遇到的生物（可以左右拖），常見的排前面、標★；
//   中層、深層換成會出現的變種（荒、獰、淵——照 variants.js 的 R.variantAt：淺層沒有，越深越多越兇）。列的顏色是遺跡所在地區的顏色，越往下越暗、越紅。
// - 右頁：沒點生物的時候是遺跡的介紹（地區、分級、層數、環境、領主體、佩特拉核心的樣子）；點了生物是那一隻的大圖、說明、在哪些遺跡出現。
// - 手機（窄的畫面）：右頁的內容跳出來。
// - 2026-10-04 改版（作者：遺跡分層在最上面，領主和小怪分開來介紹，之後再做變體，佩特拉核心單獨介紹，圖鑑可以講場地效果）：
//   一座遺跡的左頁照這個順序：遺跡分層（淺層、中層、深層各第幾層、變種多少、到那一段最深的深度加成；最深處是什麼）
//   → 遺跡生物（同一個捲動框、一條滑桿，裡面分「小怪」「領主」「變體」三段：小怪＋環境才有的、領主體、荒／獰／淵各一列）
//   → 佩特拉核心（一張卡片，點了右頁是核心自己的介紹：這一帶的長相、在哪裡能不能打、注意和五種反應）
//   → 場地效果（這座遺跡的環境、會抽到的樓層效果；點了右頁是詳細說明，用 hudinfo.js 的 R.FIELD_INFO、R.FLOOR_MOD_MORE）。
// - 2026-10-05 作者：圖鑑沒有記載領主變體——克森特級以上的遺跡，「領主」那一段多一列「異變」（這座遺跡的領主體會變成的樣子，
//   遇過才亮）；特殊種分頁也有。點了右頁在生物介紹下面寫異變的說明（lordvariant.js 的 R.lordVariantDex）。
// 放在 dexui.js、region.js 後面。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s);
  let on = false, gtab = 'amile', siteId = null, mon = null, pick = null;   // pick：'core'（佩特拉核心）、'env:火山…'、'mod:濃霧…'（場地效果）
  const wide = () => window.matchMedia && window.matchMedia('(min-width: 780px)').matches;
  const G = id => R.gradeById(id), kills = id => { const k = R.S && R.S.dexKills; if (!k) return 0; return (k[id] || 0) + [1, 2, 3].reduce((a, t) => a + (k[id + '_v' + t] || 0), 0); };
  const icon = (id, s) => (R.beastIconURL ? R.beastIconURL(id, s || 2) : '');
  const ruins = gid => R.SITES.filter(s => s.kind === 'ruin' && s.grade === gid);
  const regionOf = s => (R.siteRegion ? R.siteRegion(s) : null);
  const colOf = s => { const rg = regionOf(s); return (rg && rg.c) || (R.GRADE_COLOR && R.GRADE_COLOR[s.grade]) || '#8A7A6A'; };
  // 這種生物原本是哪個分級的（變種的「分級差」照這個算）
  const originLv = id => { for (const g of R.GRADES) if ((g.pool || []).includes(id)) return g.lv || 1; return 1; };
  const tierAt = (id, site, band) => { const g = G(site.grade); if (!g || !band) return 0; const gd = Math.max(0, (g.lv || 1) - originLv(id)); let t = R.variantAt ? R.variantAt(band === 1 ? 0.5 : 0.75, gd).tier : Math.min(3, gd + band); while (t > 0 && !R.ENEMIES[id + '_v' + t]) t--; return t; };   // variants.js 的 R.variantAt：中層看一半深、深層看四分之三深
  const floorsOf = s => (R.floorsFor ? R.floorsFor(s) : Math.max(2, (G(s.grade) || {}).floors || 5));
  const BANDS = [['淺層', '沒有變種'], ['中層', '變種兩成到六成'], ['深層', '變種七成到全部，最深處是「淵」']];   // 2026-10-04 作者：越深越容易出現變種，再極端一點
  const bandRange = (s, b) => { const n = floorsOf(s), a = Math.floor(n * b / 3) + 1, z = Math.max(a, Math.floor(n * (b + 1) / 3)); return '第 ' + a + '～' + z + ' 層'; };
  const th = (id, star) => { const e = R.ENEMIES[id], n = kills(id.replace(/_v\d$/, '')), url = icon(id); return '<button type="button" class="dr-th' + (n ? '' : ' dim') + (mon === id ? ' sel' : '') + '" data-drm="' + id + '" title="' + esc(e ? e.name : id) + '">' + (url ? '<img src="' + url + '" alt="" draggable="false">' : '<span>' + esc((e && e.name || '?')[0]) + '</span>') + (star ? '<em>★</em>' : '') + '</button>'; };
  const row = (lab, sub, ids, k, col, stars) => '<div class="dr-row" style="--rc:' + col + ';--k:' + k + '"><div class="dr-lab"><b>' + esc(lab) + '</b><small>' + esc(sub) + '</small></div><div class="dr-strip">' + (ids.length ? ids.map(id => th(id, stars && stars.includes(id.replace(/_v\d$/, '')))).join('') : '<span class="dr-none">（沒有）</span>') + '</div></div>';

  // ---------- 左頁 ----------
  // ---------- 左頁：一座遺跡 ----------
  // 2026-10-04 作者：遺跡分層在最上面，領主和小怪分開來介紹，之後再做變體，佩特拉核心單獨介紹，講場地效果。
  //   順序：遺跡分層 → 小怪（＋環境才有的）→ 領主 → 變體（荒、獰、淵）——這三段在同一個捲動框（一條滑桿）→ 佩特拉核心 → 場地效果。
  const VT = [null, ['荒', '暗紅、眼睛發紅、背上長短刺｜生命 +15%、傷害 +10%'], ['獰', '更暗、刺更長、露出獠牙、大一成｜生命 +30%、傷害 +20%'], ['淵', '幾乎全黑、發紫光、大兩成｜生命 +45%、傷害 +30%']];
  const poolOf = s => (R.sitePool ? R.sitePool(s) : (G(s.grade).pool || [])).filter(id => R.ENEMIES[id] && !R.ENEMIES[id].noDex);
  const lordsOf = s => {
    const envLord = { snow: 'frostdeer', volcano: 'lavajaw', desert: 'sandwhale', deep: 'kraken' }[s.env], rg = regionOf(s), own = rg && rg.lords && rg.lords[s.id];
    const excl = new Set([].concat(...Object.values(R.REGIONS || {}).map(r => r.lords ? [].concat(...Object.values(r.lords)) : [])));   // 別的遺跡專屬的領主體（無主大鎧）不列
    return Array.from(new Set(own ? own : (envLord ? [envLord] : []).concat((G(s.grade).lords || []).filter(id => !excl.has(id))))).filter(id => R.ENEMIES[id]);
  };
  const bandEnd = (s, b) => { const n = floorsOf(s), a = Math.floor(n * b / 3) + 1; return Math.max(a, Math.floor(n * (b + 1) / 3)); };
  const depthAt = (s, n) => { try { return R.depthBonus ? R.depthBonus({ grade: G(s.grade), site: s, floor: n - 1, floors: floorsOf(s) }) : null; } catch (e) { return null; } };
  const reserve = s => G(s.grade).boss !== 'petra';   // 保留區：最深處的核心受公會保護
  const layers = s => {
    const col = colOf(s), L = lordsOf(s), pc = v => Math.round(v * 100) + '%';
    const rows = BANDS.map(([lab, note], b) => {
      const d = depthAt(s, bandEnd(s, b)), more = d && d.hp >= 0.01 ? '到這一段最深：生物生命 +' + pc(d.hp) + '、傷害 +' + pc(d.dmg) + '、寶物數量 +' + pc(d.qty) : '';
      return '<div class="dr-layer" style="--rc:' + col + ';--k:' + b + '"><b>' + esc(lab) + '</b><small>' + esc(bandRange(s, b)) + '</small><span>' + esc(note) + (b === 1 ? '（多半是「荒」）' : '') + (more ? '<br><i>' + esc(more) + '</i>' : '') + '</span></div>';
    });
    rows.push('<div class="dr-layer" style="--rc:' + col + ';--k:3"><b>最深處</b><small>第 ' + floorsOf(s) + ' 層</small><span>' + (reserve(s) ? '看得到佩特拉核心，但受公會保護，不能打。' : '佩特拉核心醒著：打倒它才算討伐完成。') + '</span></div>');
    return '<h4 class="dr-h">遺跡分層</h4><div class="dr-layers">' + rows.join('') + '</div>'
      + (L.length ? '<p class="note dr-lnote">領主體：每 3～5 層一隻，守在通往樓層通道的路上；牠倒下之前下不去。</p>' : '');
  };
  const sec = t => '<div class="dr-sec"><span>' + esc(t) + '</span></div>';
  const ruinRows = s => {
    const pool = poolOf(s), main = R.siteMain ? R.siteMain(s) : [], col = colOf(s);
    const minions = pool.filter(id => !/^領主體/.test(R.ENEMIES[id].name || '')).sort((a, b) => (main.includes(b) - main.includes(a)) || (!!R.ENEMIES[a].elite - !!R.ENEMIES[b].elite));
    // 小怪
    let h = sec('小怪') + row('小怪', minions.length + ' 種・★常見', minions, 0, col, main);
    const env = s.env && Object.keys(R.ENEMIES).filter(k => R.ENEMIES[k].env === s.env && !R.ENEMIES[k].boss && !R.ENEMIES[k].noDex);
    if (env && env.length) h += row('環境', (s.envName || (R.ENVS[s.env] || {}).name || '') + '才有的', env, 1, col);
    // 領主
    const L = lordsOf(s);
    h += sec('領主') + (L.length ? row('領主體', '每 3～5 層一隻', L, 2, col) : '<div class="dr-row" style="--rc:' + col + ';--k:2"><div class="dr-lab"><b>領主體</b><small>沒有</small></div><div class="dr-strip"><span class="dr-none">' + esc(G(s.grade).name) + '的遺跡沒有領主體（克森特級起才有）。</span></div></div>');
    // 異變（領主變體）：克森特級以上（lordvariant.js：克森特級 25%、卡索級 45%）
    const g = G(s.grade), mut = L.filter(id => R.LORD_VARIANTS && R.LORD_VARIANTS[id]);
    if (mut.length && g && (g.id === 'kaso' || (g.lv || 0) >= 4)) h += lvRow(mut, g.id === 'kaso' ? '45%' : '25%', col);
    // 變體：中層、深層會變成哪一種
    const byT = { 1: [], 2: [], 3: [] }, where = { 1: new Set(), 2: new Set(), 3: new Set() };
    minions.forEach(id => [1, 2].forEach(b => { const t = tierAt(id, s, b); if (t) { if (!byT[t].includes(id + '_v' + t)) byT[t].push(id + '_v' + t); where[t].add(b); } }));
    const vr = [1, 2, 3].filter(t => byT[t].length).map(t => row(VT[t][0], [...where[t]].sort().map(b => BANDS[b][0]).join('、') + '出現', byT[t], 1 + t * 0.6, col, main));
    h += sec('變體') + (vr.length ? vr.join('') : '<div class="dr-row" style="--rc:' + col + ';--k:1"><div class="dr-lab"><b>變體</b><small>沒有</small></div><div class="dr-strip"><span class="dr-none">這座遺跡的生物不會變種。</span></div></div>');
    return h;
  };
  // 異變的領主體一列：小頭像帶異變的顏色，遇過才亮，點了看本體的介紹（下面有異變那一段）
  const lvTh = id => { const e = R.ENEMIES[id], v = R.LORD_VARIANTS[id], ok = R.lordVariantSeen && R.lordVariantSeen(id), url = icon(id); return '<button type="button" class="dr-th lv-mut' + (ok ? '' : ' dim') + (mon === id ? ' sel' : '') + '" data-drm="' + id + '" style="--lvc:' + v[1] + '" title="' + esc(e.name + '【' + (ok ? v[0] : '？？？') + '】') + '">' + (url ? '<img src="' + url + '" alt="" draggable="false">' : '<span>' + esc(e.name[0]) + '</span>') + '</button>'; };
  const lvRow = (ids, ch, col) => '<div class="dr-row" style="--rc:' + col + ';--k:2.6"><div class="dr-lab"><b>異變</b><small>' + (ch ? '領主體的 ' + ch + '・兩條血' : '克森特級以上・兩條血') + '</small></div><div class="dr-strip">' + ids.map(lvTh).join('') + '</div></div>';
  const vnote = () => '<p class="note dr-tip">變體：' + [1, 2, 3].map(t => '「' + VT[t][0] + '」' + VT[t][1].replace('｜', '，')).join('；') + '。打倒的次數算在原本那一種上。</p>';
  const coreCard = s => {
    const cu = coreURL(s), rg = regionOf(s);
    return '<h4 class="dr-h">佩特拉核心</h4><button type="button" class="dr-corecard' + (pick === 'core' ? ' sel' : '') + '" data-drk="1" style="--rc:' + colOf(s) + '">' + (cu ? '<img src="' + cu + '" alt="">' : '')
      + '<span><b>佩特拉核心' + (rg ? '・' + esc(rg.n) + '一帶' : '') + '</b><small>' + (reserve(s) ? '保留區：最深處看得到，受公會保護、不能打。' : '討伐區：最深處醒著，打倒它才算討伐完成。') + '</small><em>點一下看介紹（長相、力場、反應）</em></span></button>';
  };
  const envsOf = s => { if (s.env) return [s.env]; const g = G(s.grade); return g && g.env ? ['volcano', 'desert', 'deep'] : []; };
  const modsOf = s => { const M = R.FLOOR_MODS || {}, g = G(s.grade); if (s.id === 'kanko' || !g || g.id === 'hunt') return []; return Object.keys(M).filter(k => !g.passive || M[k].safe); };
  const envName = e => (R.FIELD_ENV_NAME && R.FIELD_ENV_NAME[e]) || (R.ENVS[e] || {}).name || e;
  const fields = s => {
    const es = envsOf(s), ms = modsOf(s), M = R.FLOOR_MODS || {}, chip = (k, n, sub) => '<button type="button" class="dr-fc' + (pick === k ? ' sel' : '') + '" data-drf="' + k + '"><b>' + esc(n) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>';
    let h = '<h4 class="dr-h">場地效果</h4>';
    if (es.length) h += '<p class="note">' + (s.env ? '整座遺跡都是這種環境：' : '每一趟從這三種環境抽一種：') + '</p><div class="dr-fields">' + es.map(e => chip('env:' + e, envName(e), (R.ENVS[e] || {}).desc || (e === 'forge' ? '機關還在動。' : ''))).join('') + '</div>';
    if (ms.length) h += '<p class="note">樓層效果：第二層起，每一層大約四成五會抽到一種（每層重新抽）' + (G(s.grade).passive ? '；這一級只有不危險的幾種' : '') + '。</p><div class="dr-fields">' + ms.map(m => chip('mod:' + m, M[m].n, M[m].d)).join('') + '</div>';
    const gx = R.gradeFxOf ? R.gradeFxOf(s) : [];   // 這個分級帶來的效果（hudinfo.js 的 R.GRADE_FX；2026-10-05 作者：圖鑑裡的場地效果也要更新）
    if (gx.length) h += '<p class="note">這個分級（' + esc(G(s.grade).name) + '）：</p><div class="dr-fields">' + gx.map(k => chip('gfx:' + k, R.GRADE_FX[k].n, R.GRADE_FX[k].d)).join('') + '</div>';
    if (!es.length && !ms.length && !gx.length) h += '<p class="note">這裡沒有場地效果。</p>';
    return h;
  };
  const special = () => {
    const E = R.ENEMIES, envs = Object.keys(R.ENVS || {});
    let h = '';
    envs.forEach((env, i) => { const ids = Object.keys(E).filter(k => E[k].env === env && !E[k].noDex); if (ids.length) h += row(R.ENVS[env].name, '克森特級的' + R.ENVS[env].name + '環境', ids, i * 0.6, ['#D85A2A', '#C8A870', '#2A7A9A', '#7AB8E0'][i] || '#8A7A6A'); });
    const lords = Object.keys(E).filter(k => E[k].boss && /^領主體/.test(E[k].name || '') && !E[k].noDex); h += row('領主體', '克森特級以上', lords, 2.2, '#9A2A3A');
    const muts = lords.filter(id => R.LORD_VARIANTS && R.LORD_VARIANTS[id]); if (muts.length) h += lvRow(muts, '', '#9A2A3A');
    const etc = ['mimic', 'gaki', 'kudan', 'fukudo'].filter(k => E[k] && !E[k].noDex); if (etc.length) h += row('其他', '偽箱、佩特拉的反應……', etc, 1, '#6A5A7A');
    return '<p class="note">只在特定的環境、或特別的條件才看得到的。</p><div class="dr-ruin">' + h + '</div>';   // 一起左右捲（同一條滑桿）
  };
  const left = () => {
    const gs = R.GRADES.filter(g => g.pool && g.pool.length && ruins(g.id).length);
    if (gtab !== 'sp' && !gs.some(g => g.id === gtab)) gtab = gs[0] ? gs[0].id : 'sp';
    const list = gtab === 'sp' ? [] : ruins(gtab); if (gtab !== 'sp' && !list.some(s => s.id === siteId)) siteId = (list.find(s => s.status === 'open') || list[0] || {}).id;
    const s = R.SITES.find(x => x.id === siteId);
    return '<div class="dr-gtabs">' + gs.map(g => '<button type="button" class="dr-gt' + (gtab === g.id ? ' on' : '') + '" data-drg="' + g.id + '" style="--gc:' + ((R.GRADE_COLOR || {})[g.id] || '#8A7A6A') + '">' + esc(g.name) + '</button>').join('') + '<button type="button" class="dr-gt' + (gtab === 'sp' ? ' on' : '') + '" data-drg="sp" style="--gc:#9A6AC8">特殊種</button></div>'
      + (gtab === 'sp' ? special() : '<div class="dr-sites">' + list.map(x => { const rg = regionOf(x); return '<button type="button" class="dr-site' + (x.id === siteId ? ' on' : '') + (x.status === 'lock' ? ' lock' : '') + '" data-drs="' + x.id + '" style="--rc:' + colOf(x) + '"><b>' + esc(x.name) + '</b><small>' + esc(rg ? rg.n : '') + (x.status === 'lock' ? '・還不能進' : '') + '</small></button>'; }).join('') + '</div>'
        + (s ? layers(s) + '<h4 class="dr-h">遺跡生物</h4><div class="dr-ruin">' + ruinRows(s) + '</div><p class="note dr-tip">★＝這座遺跡常見的。暗的是還沒打倒過的。可以左右拖（每一列一起動）。</p>' + vnote() + coreCard(s) + fields(s) : ''));
  };
  // ---------- 右頁 ----------
  const coreURL = s => { try { const st = R.coreStyleOf && R.coreStyleOf(s), sh = R.beastSheetOf && R.beastSheetOf('petra'); if (!sh) return ''; const src = st && R.recolorCore ? R.recolorCore(sh.c, st) : sh.c, c = document.createElement('canvas'); c.width = sh.fw; c.height = sh.fh; c.getContext('2d').drawImage(src, 0, 0, sh.fw, sh.fh, 0, 0, sh.fw, sh.fh); return c.toDataURL(); } catch (e) { return ''; } };
  const ruinInfo = s => {
    const g = G(s.grade), rg = regionOf(s), t = R.TYPES[s.type], main = R.siteMain ? R.siteMain(s) : [];
    return '<div class="dx-banner">' + esc(s.name) + '</div>'
      + '<div class="dr-info" style="--rc:' + colOf(s) + '"><p><b>' + esc(g ? g.name : '') + '</b>（' + esc(g ? g.letter : '') + '）・' + esc(t ? t.name : '') + (s.env ? '・' + esc(s.envName || R.ENVS[s.env].name) + '環境' : '') + '・約 ' + floorsOf(s) + ' 層</p>'
      + '<p>' + esc(s.desc || '') + '</p>' + (rg ? '<p class="note"><b>' + esc(rg.n) + '</b>：' + esc(rg.d || '') + '</p>' : '')
      + (main.length ? '<p class="note">常見：' + main.map(id => esc(R.ENEMIES[id].name)).join('、') + '</p>' : '')
      + '</div>';
  };
  const ul = l => '<ul class="dr-ul">' + l.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  const back = '<div class="row"><button type="button" class="btn" data-drback="1">回到遺跡的介紹</button></div>';
  // 佩特拉核心：單獨一頁
  const coreInfo = s => {
    const e = R.ENEMIES.petra, cu = coreURL(s), rg = regionOf(s), RX = R.REACTIONS || {};
    return '<div class="dx-banner">佩特拉核心</div>' + (cu ? '<div class="dr-core"><img src="' + cu + '" alt=""><small>' + esc(rg ? rg.n + '一帶的核心' : '核心') + '（每個地區的殼、血管、瞳孔顏色都不一樣）</small></div>' : '')
      + '<p>' + esc(e.desc || '') + '</p>'
      + '<h4 class="dx-h">在哪裡、能不能打</h4>' + ul(['每一座遺跡的最深處都有一顆，遺跡就是靠它維持的。', '保留區（哈米莉亞、阿彌勒、摩爾斯級）：看得到，但受公會保護，不能打。', '討伐區（克森特級起）：醒著、周圍五到十公尺是異常狀態力場；打倒它才算討伐完成，會掉魔力核心、翼肢碎片。'])
      + '<h4 class="dx-h">佩特拉的注意、反應</h4>' + ul(['在遺跡裡打鬥、破壞、開寶箱……都會讓核心注意到你（右上角那一條）；滿 100 會觸發一次「反應」。'].concat(Object.keys(RX).map(k => RX[k].name + '：' + RX[k].desc)))
      + '<p class="note">每一趟遺跡的反應是上面五種之一，第一次觸發才知道是哪一種。遺跡裡點右上角的「佩特拉的注意」看什麼會讓它升、降。</p>'
      + (R.dexStats ? R.dexStats('petra') : '') + back;
  };
  // 場地效果：環境（火山、沙漠……）、樓層效果（濃霧、崩落……）
  const fieldInfo = k => {
    const [kind, id] = k.split(':');
    if (kind === 'env') {
      const F = R.FIELD_INFO && R.FIELD_INFO[id], secs = F ? F(1) : [];
      return '<div class="dx-banner">場地效果・' + esc(envName(id)) + '</div><p>' + esc((R.ENVS[id] || {}).desc || '') + '</p>'
        + secs.map(([h, l]) => '<h4 class="dx-h">' + esc(h) + '</h4>' + ul(l)).join('')
        + '<p class="note">上面是第一層的強度：越往下越兇，最深的地方 ×2。遺跡裡點左上角的「場地」那一格，看現在的強度。</p>' + back;
    }
    if (kind === 'gfx') {
      const X = (R.GRADE_FX || {})[id] || {}, s = R.SITES.find(x => x.id === siteId), g = s ? G(s.grade) : null;
      return '<div class="dx-banner">分級的效果・' + esc(X.n || id) + '</div><p>' + esc(X.d || '') + '</p>' + (X.more && g ? ul(X.more(g)) : '') + back;
    }
    const M = (R.FLOOR_MODS || {})[id] || {}, more = (R.FLOOR_MOD_MORE || {})[id] || [];
    return '<div class="dx-banner">樓層效果・' + esc(M.n || id) + '</div><p>' + esc(M.d || '') + '</p>' + (more.length ? ul(more) : '')
      + '<p class="note">樓層效果第二層起才有，每一層大約四成五的機率抽到一種，換一層重新抽。遺跡裡點左上角那一格看說明。</p>' + back;
  };
  const monInfo = id => {
    const e = R.ENEMIES[id], base = id.replace(/_v\d$/, ''), n = kills(base), url = icon(id, 6);
    const where = R.SITES.filter(s => s.kind === 'ruin' && s.id !== 'kanko' && ((R.sitePool ? R.sitePool(s) : []).includes(base) || (e.env && s.env === e.env) || (R.siteLords && (R.siteLords(s) || []).includes(base))));
    return '<div class="dx-banner">' + esc(e.name) + '</div><div class="dx-portrait' + (n ? '' : ' unseen') + '" style="--bg:#3A3046">' + (url ? '<img src="' + url + '" alt="">' : '') + '</div>'
      + '<p>' + esc(e.desc || (R.ENEMIES[base] && R.ENEMIES[base].desc) || '') + '</p>'
      + (R.dexStats ? R.dexStats(id) : '') + '<p class="note">' + (n ? '打倒過 ' + n + ' 隻（包括變種）' : '還沒打倒過') + '</p>'
      + (R.lordVariantDex ? R.lordVariantDex(base) : '')
      + (where.length ? '<h4 class="dx-h">出現的遺跡</h4><div class="dr-where">' + where.map(s => '<button type="button" class="dr-site sm" data-drgo="' + s.id + '" style="--rc:' + colOf(s) + '"><b>' + esc(s.name) + '</b><small>' + esc(G(s.grade).name) + ((R.siteMain ? R.siteMain(s) : []).includes(base) ? '・常見' : '') + '</small></button>').join('') + '</div>' : '')
      + back;
  };

  // ---------- 畫出來 ----------
  const render = host => {
    const book = host.querySelector('.dx-book'), lp = book && book.querySelector('.dx-left'), rp = book && book.querySelector('.dx-right'); if (!lp) return;
    const tabs = lp.querySelector('.dx-tabs'); tabs.querySelectorAll('.dx-tab').forEach(b => b.classList.toggle('on', b.dataset.dxtab === 'ruin'));
    [...lp.children].forEach(c => { if (c !== tabs) c.remove(); });
    const box = document.createElement('div'); box.className = 'dr-box'; box.innerHTML = left(); lp.appendChild(box);
    const s = R.SITES.find(x => x.id === siteId), showRight = html => { if (wide() && rp) { rp.innerHTML = html; rp.scrollTop = 0; bindRight(host, rp); } else if (html) popup(host, html); };
    if (wide() && rp) showRight(mon && R.ENEMIES[mon] ? monInfo(mon) : s && pick === 'core' ? coreInfo(s) : s && pick ? fieldInfo(pick) : s ? ruinInfo(s) : '<p class="note">選一座遺跡。</p>');
    box.querySelectorAll('[data-drg]').forEach(b => { b.onclick = () => { gtab = b.dataset.drg; mon = null; pick = null; render(host); }; });
    box.querySelectorAll('[data-drs]').forEach(b => { b.onclick = () => { siteId = b.dataset.drs; mon = null; pick = null; render(host); }; });
    box.querySelectorAll('[data-drk],[data-drf]').forEach(b => { b.onclick = () => { mon = null; pick = b.dataset.drk ? 'core' : b.dataset.drf; if (wide()) render(host); else if (s) popup(host, pick === 'core' ? coreInfo(s) : fieldInfo(pick)); }; });
    box.querySelectorAll('[data-drm]').forEach(b => { b.onclick = () => { if (b.dataset.drag === '1') return; mon = b.dataset.drm; pick = null; if (wide()) { render(host); } else popup(host, monInfo(mon)); }; });
    // 可以用滑鼠左右拖：整塊（每一列）一起動，只有一條滑桿（2026-10-04 作者：圖鑑的滑桿統一成同一個，四條分開挺瞎的）
    box.querySelectorAll('.dr-ruin').forEach(st => {
      let down = null;
      st.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = { x: e.clientX, l: st.scrollLeft, moved: false }; });
      st.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 4) { down.moved = true; st.scrollLeft = down.l - dx; st.classList.add('drag'); } });
      const up = () => { if (down && down.moved) { st.querySelectorAll('[data-drm]').forEach(b => { b.dataset.drag = '1'; }); setTimeout(() => st.querySelectorAll('[data-drm]').forEach(b => { b.dataset.drag = ''; }), 0); } down = null; st.classList.remove('drag'); };
      st.addEventListener('pointerup', up); st.addEventListener('pointerleave', up);
    });
  };
  const bindRight = (host, rp) => {
    rp.querySelectorAll('[data-drback]').forEach(b => { b.onclick = () => { mon = null; pick = null; render(host); }; });
    rp.querySelectorAll('[data-drgo]').forEach(b => { b.onclick = () => { const s = R.SITES.find(x => x.id === b.dataset.drgo); if (!s) return; gtab = s.grade; siteId = s.id; mon = null; render(host); const m = $('dr-modal'); if (m) m.remove(); }; });
  };
  const popup = (host, html) => {
    const old = $('dr-modal'); if (old) old.remove();
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'dr-modal'; m.style.zIndex = 60;
    m.innerHTML = '<div class="sheet dx-sheet" role="dialog" aria-modal="true">' + html + '<div class="row"><button type="button" class="btn pri" id="dr-x">關閉</button></div></div>';
    document.body.appendChild(m); const close = () => m.remove(); $('dr-x').onclick = close; m.onclick = e => { if (e.target === m) close(); };
    m.querySelectorAll('[data-drback]').forEach(b => { b.onclick = () => { mon = null; pick = null; close(); }; });
    m.querySelectorAll('[data-drgo]').forEach(b => { b.onclick = () => { const s = R.SITES.find(x => x.id === b.dataset.drgo); if (!s) return; gtab = s.grade; siteId = s.id; mon = null; close(); render(host); }; });
  };
  // dexui.js 每次重畫都會換掉整個 #cards：再把「遺跡」分頁加回去
  const inject = host => {
    const tabs = host.querySelector('.dx-tabs'); if (!tabs || tabs.querySelector('[data-dxtab="ruin"]')) return;
    const n = R.SITES.filter(s => s.kind === 'ruin').length, b = document.createElement('button'); b.type = 'button'; b.className = 'dx-tab'; b.dataset.dxtab = 'ruin'; b.innerHTML = '遺跡 <small>' + n + ' 座</small>';
    b.onclick = () => { on = true; render(host); }; tabs.appendChild(b);
    tabs.querySelectorAll('.dx-tab:not([data-dxtab="ruin"])').forEach(x => { const f0 = x.onclick; x.onclick = ev => { on = false; if (f0) f0.call(x, ev); }; });
    if (on) render(host);
  };
  const watch = () => {
    const host = $('cards'); if (!host) return;
    new MutationObserver(() => { if (host.querySelector('.dx-tabs')) inject(host); }).observe(host, { childList: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  R.dexRuins = { render: () => { const h = $('cards'); if (h) { on = true; render(h); } } };

  const css = document.createElement('style');
  css.textContent = [
    '.dr-gtabs{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0 8px}',
    '.dr-gt{padding:5px 10px;border-radius:999px;border:1px solid var(--gc);background:transparent;color:inherit;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}.dr-gt.on{background:var(--gc);color:#140E0A}',
    '.dr-sites{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-bottom:10px}',
    '.dr-site{display:grid;gap:1px;text-align:left;padding:6px 9px;border-radius:8px;border:1px solid var(--line);border-left:4px solid var(--rc);background:rgba(255,255,255,.04);color:inherit;font:inherit;cursor:pointer}',
    '.dr-site b{font-size:13px}.dr-site small{font-size:11px;opacity:.75}.dr-site.on{background:color-mix(in srgb,var(--rc) 22%,transparent);border-color:var(--rc)}.dr-site.lock{opacity:.7}.dr-site.sm{padding:4px 8px}',
    '.dr-ruin{display:grid;gap:0;border-radius:10px;overflow-x:auto;overflow-y:hidden;border:1px solid var(--line);scrollbar-width:thin;cursor:grab;user-select:none}.dr-ruin.drag{cursor:grabbing}',
    // 越往下越暗、越紅（--k：0 淺 → 3 最深）
    '.dr-row{display:grid;grid-template-columns:92px max-content;min-width:100%;width:max-content;box-sizing:border-box;align-items:center;gap:8px;padding:6px 8px;background:linear-gradient(90deg,color-mix(in srgb,var(--rc) calc(40% - var(--k) * 9%),color-mix(in srgb,#000 calc(100% - var(--k) * 18%),#8A0A14)),color-mix(in srgb,#000 calc(70% - var(--k) * 6%),color-mix(in srgb,var(--rc) 20%,#5A0A10)));border-top:1px solid rgba(0,0,0,.4)}',
    '.dr-lab{display:grid;gap:1px;line-height:1.2;position:sticky;left:0;z-index:1;align-self:stretch;align-content:center;margin:-6px 0 -6px -8px;padding:6px 6px 6px 8px;background:color-mix(in srgb,var(--rc) calc(32% - var(--k) * 7%),#0C0A0C);box-shadow:6px 0 8px -4px rgba(0,0,0,.6)}.dr-lab b{font-size:13.5px;color:#F4E9CD}.dr-lab small{font-size:10px;opacity:.8}',
    '.dr-strip{display:flex;gap:5px;padding:2px 0 4px}',
    '.dr-th{position:relative;flex:none;width:46px;height:46px;display:grid;place-items:center;padding:3px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.28);cursor:pointer}',
    '.dr-th img{max-width:100%;max-height:100%;image-rendering:pixelated;pointer-events:none}.dr-th.dim img{filter:grayscale(1) brightness(.5)}',
    '.dr-th.sel,.dr-th:hover{border-color:var(--gold,#C9A13A)}.dr-th em{position:absolute;left:2px;top:0;font-style:normal;font-size:10px;color:#FFE08A;text-shadow:0 1px 2px #000}',
    '.dr-none{opacity:.6;font-size:12px}.dr-tip{margin-top:6px}',
    '.dr-info p{margin:6px 0}.dr-info{border-left:3px solid var(--rc);padding-left:10px}',
    '.dr-core{display:grid;justify-items:center;gap:2px;margin-top:8px}.dr-core img{width:min(220px,80%);image-rendering:pixelated}.dr-core small{opacity:.75}',
    '.dr-where{display:grid;gap:5px}',
    // 遺跡分層、段落、佩特拉核心、場地效果（2026-10-04 改版）
    '.dr-h{margin:12px 0 6px;font-size:13.5px;letter-spacing:.06em;color:var(--gold,#C9A13A);border-bottom:1px solid var(--line);padding-bottom:3px}',
    '.dr-layers{display:grid;gap:0;border-radius:10px;overflow:hidden;border:1px solid var(--line)}',
    '.dr-layer{display:grid;grid-template-columns:58px 92px 1fr;gap:8px;align-items:center;padding:7px 10px;font-size:12px;background:linear-gradient(90deg,color-mix(in srgb,var(--rc) calc(40% - var(--k) * 9%),color-mix(in srgb,#000 calc(100% - var(--k) * 18%),#8A0A14)),color-mix(in srgb,#000 calc(70% - var(--k) * 6%),#5A0A10))}',
    '.dr-layer b{font-size:13.5px;color:#F4E9CD}.dr-layer small{opacity:.8}.dr-layer i{font-style:normal;opacity:.75;font-size:11px}.dr-lnote{margin:5px 0 0}',
    '@media (max-width:520px){.dr-layer{grid-template-columns:52px 1fr}.dr-layer span{grid-column:1/-1}}',
    '.dr-sec{display:block;min-width:100%;width:max-content;box-sizing:border-box;background:#0C0A0C;border-top:1px solid var(--line)}.dr-sec:first-child{border-top:0}',
    '.dr-sec span{position:sticky;left:0;display:inline-block;padding:4px 10px;font-size:11.5px;font-weight:900;letter-spacing:.12em;color:var(--gold,#C9A13A)}',
    '.dr-corecard{display:grid;grid-template-columns:72px 1fr;gap:10px;align-items:center;width:100%;text-align:left;padding:8px 10px;border-radius:10px;border:1px solid var(--line);border-left:4px solid var(--rc);background:rgba(255,255,255,.04);color:inherit;font:inherit;cursor:pointer}',
    '.dr-corecard img{width:72px;image-rendering:pixelated}.dr-corecard span{display:grid;gap:2px}.dr-corecard small{font-size:11.5px;opacity:.85}.dr-corecard em{font-style:normal;font-size:11px;color:var(--gold,#C9A13A)}.dr-corecard.sel,.dr-corecard:hover{border-color:var(--gold,#C9A13A)}',
    '.dr-fields{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin-bottom:6px}',
    '.dr-fc{display:grid;gap:1px;text-align:left;padding:6px 9px;border-radius:8px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:inherit;font:inherit;cursor:pointer}.dr-fc b{font-size:13px}.dr-fc small{font-size:10.5px;opacity:.75;line-height:1.3}.dr-fc.sel,.dr-fc:hover{border-color:var(--gold,#C9A13A)}',
    '.dr-ul{margin:4px 0 8px;padding-left:18px;font-size:12.5px}.dr-ul li{margin:2px 0}',
    // 右頁比畫面高的時候（佩特拉核心、場地效果的說明）自己捲，不會被推到上面看不到標題
    '@media (min-width:780px){.dx-book .dx-right{max-height:calc(100vh - 110px);overflow-y:auto;scrollbar-width:thin}}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
