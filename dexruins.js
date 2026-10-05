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
// - 2026-10-05 作者大改：最上層的大分頁換成「總覽、哈米莉亞級、阿彌勒級、摩爾斯級、克森特級、卡索級」（dexui.js），
//   選分級 → 那個分級的遺跡 → 點一座遺跡，再分三個小分頁：
//   「小怪」：這座遺跡會遇到的一般生物；每一種是一直欄，本體在上、荒／獰／淵在正下方（只列這座遺跡會出現的；中間缺一級就空一格，同一列一定是同一級；
//            順序固定：常見的★在前、精英在後，其他照生物池原本的順序）。
//            環境才有的生物直接併進來，不再另外一類「環境生物」；偽箱、福影童、預言犢、填隙肉芽另一段「偶爾出現」。
//   「領主體」：這座遺跡會出現的領主體——不是只在深層：第 3～5 層起每隔 3～5 層一隻；這座遺跡專屬／最常見的排前面。異變放在本體正下方。
//   「遺跡詳情」：遺跡的介紹、分層、佩特拉核心（這一帶的長相）、場地效果（環境、樓層效果、分級的效果）。
//   原本的「特殊種」分頁拿掉（環境的生物、領主體都歸到各自的遺跡）。
// - 2026-10-05 作者：總覽不要先列遺跡——總覽直接三個小分頁（小怪／領主體／遺跡詳情）：
//   小怪＝全部遺跡的全部小怪（不分難度），變種一樣排在本體正下方；領主體＝全部領主體；
//   遺跡詳情＝各個分級的詳細情報＋東鶴有哪些那一級的遺跡。分級分頁（哈米莉亞～卡索）照舊：選分級→選遺跡→三個小分頁。
// 放在 dexui.js、region.js 後面。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s);
  let gtab = 'all', siteId = null, sub = 'mob', mon = null, pick = null;   // pick：'core'（佩特拉核心）、'env:火山…'、'mod:濃霧…'、'gfx:…'（場地效果）
  const wide = () => window.matchMedia && window.matchMedia('(min-width: 780px)').matches;
  const G = id => R.gradeById(id), E = () => R.ENEMIES;
  const killsOf = id => { const k = R.S && R.S.dexKills; return (k && k[id]) || 0; };
  const kills = id => killsOf(id) + varsOf(id).reduce((a, v) => a + killsOf(v), 0);   // 本體＋荒／獰／淵
  const icon = (id, s) => (R.beastIconURL ? R.beastIconURL(id, s || 2) : '');
  const ORDER = ['hamilia', 'amile', 'mors', 'kesent', 'kaso'];
  const isRuin = s => s && s.grade && ORDER.includes(s.grade) && (s.kind === 'ruin' || s.id === 'kaso');   // 卡索級還沒拿到討伐令的時候是「封鎖海域」，圖鑑照樣列
  const ruins = gid => R.SITES.filter(s => isRuin(s) && (gid === 'all' || s.grade === gid)).sort((a, b) => ORDER.indexOf(a.grade) - ORDER.indexOf(b.grade));
  const regionOf = s => (R.siteRegion ? R.siteRegion(s) : null);
  const gcol = gid => { const c = (R.GRADE_COLOR || {})[gid]; return c === '#1A1A1A' ? '#8A8A96' : c || '#8A7A6A'; };
  const colOf = s => { const rg = regionOf(s); return (rg && rg.c) || gcol(s.grade); };
  const VT = [null, ['荒', '暗紅、眼睛發紅、背上長短刺｜生命 +15%、傷害 +10%'], ['獰', '更暗、刺更長、露出獠牙、大一成｜生命 +30%、傷害 +20%'], ['淵', '幾乎全黑、發紫光、大兩成｜生命 +45%、傷害 +30%']];
  const varsOf = id => { const V = R.VARIANTS && R.VARIANTS[id]; if (V) return [1, 2, 3].map(t => V[t]).filter(Boolean); return [1, 2, 3].map(t => id + '_v' + t).filter(k => E()[k]); };
  const varOf = (id, t) => { const V = R.VARIANTS && R.VARIANTS[id]; return V ? V[t] || null : (E()[id + '_v' + t] ? id + '_v' + t : null); };
  const baseOf = id => { const e = E()[id]; return (e && e.vbase) || id.replace(/_v\d$/, ''); };
  // 這種生物原本是哪個分級的（變種的「分級差」照這個算，跟 variants.js 一樣）
  const originLv = id => { for (let i = 0; i < 4; i++) { const g = G(ORDER[i]); if (g && (g.pool || []).includes(id)) return i + 1; } return 1; };
  const floorsOf = s => { try { if (R.floorsFor && s.type) return R.floorsFor(s); } catch (e) { } return Math.max(2, (G(s.grade) || {}).floors || 5); };
  const BANDS = [['淺層', '沒有變種'], ['中層', '變種兩成到六成'], ['深層', '變種七成到全部，最深處是「淵」']];   // 2026-10-04 作者：越深越容易出現變種，再極端一點
  const bandOf = (s, f) => { const n = floorsOf(s); return Math.min(2, Math.floor(f * 3 / n)); };
  const bandRange = (s, b) => { const n = floorsOf(s), a = Math.floor(n * b / 3) + 1, z = Math.max(a, Math.floor(n * (b + 1) / 3)); return '第 ' + a + '～' + z + ' 層'; };
  const bandEnd = (s, b) => { const n = floorsOf(s), a = Math.floor(n * b / 3) + 1; return Math.max(a, Math.floor(n * (b + 1) / 3)); };
  // 這座遺跡裡，這一種會變成哪幾級（照 variants.js 的 R.variantAt，一層一層算），每一級寫在哪一段出現
  const tiersAt = (id, s) => {
    const out = {}, g = G(s.grade), V = R.VARIANTS ? R.VARIANTS[id] : null; if (!g || !V || !R.variantAt) return out;
    const n = floorsOf(s), gd = Math.max(0, (g.lv || 1) - originLv(id));
    for (let f = 0; f < n; f++) { const v = R.variantAt(n > 1 ? f / (n - 1) : 1, gd); let t = v.tier; while (t > 0 && !V[t]) t--; if (t >= 1 && v.chance > 0) (out[t] = out[t] || new Set()).add(bandOf(s, f)); }
    return out;
  };
  const depthAt = (s, n) => { try { return R.depthBonus ? R.depthBonus({ grade: G(s.grade), site: s, floor: n - 1, floors: floorsOf(s) }) : null; } catch (e) { return null; } };
  const reserve = s => G(s.grade).boss !== 'petra';   // 保留區：最深處的核心受公會保護
  const envsOf = s => { if (s.env) return [s.env]; const g = G(s.grade); return g && g.env ? ['volcano', 'desert', 'deep'] : []; };
  const envName = e => (R.FIELD_ENV_NAME && R.FIELD_ENV_NAME[e]) || (R.ENVS[e] || {}).name || e;

  // ---------- 這座遺跡有什麼 ----------
  const isLordDef = e => !!(e && e.boss && /^領主體/.test(e.name || ''));
  const poolOf = s => {
    let pool = R.sitePool ? R.sitePool(s) : (G(s.grade).pool || []);
    if (s.grade === 'kaso') pool = Array.from(new Set((G('kesent').pool || []).concat(G('kaso').pool || [])));   // 卡索級進去之前會再併一次克森特級的（kaso.js）
    return pool.filter(id => E()[id] && !E()[id].noDex && !E()[id].boss && !E()[id].human);
  };
  // 小怪：常見的（★）排前面、精英排後面，其他照原本的順序（穩定排序，不會每次亂跳）；環境才有的接在後面
  const mobsOf = s => {
    const main = R.siteMain ? R.siteMain(s) : [], pool = poolOf(s), idx = id => pool.indexOf(id);
    const list = pool.slice().sort((a, b) => (main.includes(b) - main.includes(a)) || (!!E()[a].elite - !!E()[b].elite) || (idx(a) - idx(b)));
    const envs = envsOf(s), env = Object.keys(E()).filter(k => envs.includes(E()[k].env) && !E()[k].boss && !E()[k].noDex && !E()[k].vbase && !list.includes(k));
    return { list: list.concat(env), main, env };
  };
  const RARE = s => { const g = G(s.grade); return ['fukudo', 'kudan', 'gaki'].concat(s.id !== 'kanko' && g && !g.passive ? ['mimic'] : []).filter(k => E()[k] && !E()[k].noDex); };
  const RARE_NOTE = { fukudo: '一成五的樓層會躲著一隻', kudan: '一成五的樓層會躲著一隻', gaki: '佩特拉的「生物型」反應', mimic: '第 3 層起，寶箱一成是牠' };
  const ENV_LORD = { snow: 'frostdeer', volcano: 'lavajaw', desert: 'sandwhale', deep: 'kraken' };
  const exclLords = () => new Set([].concat(...Object.values(R.REGIONS || {}).map(r => r.lords ? [].concat(...Object.values(r.lords)) : [])));   // 別的遺跡專屬的（無主大鎧）不列
  // 領主體：[id, 為什麼在這裡]；這座遺跡專屬、這種環境、這種形式最常見的排前面
  const lordsOf = s => {
    const g = G(s.grade); if (!g || !(g.lords || g.id === 'kaso')) return [];
    const rg = regionOf(s), own = rg && rg.lords && rg.lords[s.id];
    if (own) return own.filter(id => E()[id]).map(id => [id, '這座遺跡專屬']);
    const ex = exclLords(), out = [], add = (id, why) => { if (id && E()[id] && isLordDef(E()[id]) && !ex.has(id) && !out.some(x => x[0] === id)) out.push([id, why]); };
    envsOf(s).forEach(e => add(ENV_LORD[e], envName(e) + '環境專屬・最常見'));
    const tl = s.type && R.TYPES[s.type] && R.TYPES[s.type].lord; if (tl) add(tl, R.TYPES[s.type].name + '最常見');
    [].concat(G('kesent').lords || [], g.lords || [], ['spikewolf']).forEach(id => add(id, '可能出現'));
    return out;
  };
  const lordCount = s => { const n = floorsOf(s), c = st => { let k = st, m = 0; while (k < n - 1) { m++; k += st; } return m; }; return [c(5), c(3)]; };   // lordfloor.js：第 3～5 層起，每隔 3～5 層一隻，最後一層沒有

  // ---------- 小頭像 ----------
  const th = (id, o) => {
    o = o || {}; const e = E()[id], n = o.n != null ? o.n : killsOf(id), url = icon(id);
    return '<button type="button" class="dr-th' + (n ? '' : ' dim') + (mon === id ? ' sel' : '') + (o.cls ? ' ' + o.cls : '') + '" data-drm="' + id + '"' + (o.style ? ' style="' + o.style + '"' : '') + ' title="' + esc(o.title || (e ? e.name : id)) + '">'
      + (url ? '<img src="' + url + '" alt="" draggable="false">' : '<span>' + esc((e && e.name || '?').split('・').pop()[0]) + '</span>')
      + (o.star ? '<em>★</em>' : '') + (o.tag ? '<u>' + esc(o.tag) + '</u>' : '') + (n ? '<i>' + n + '</i>' : '') + '</button>';
  };
  const lvTh = (id, ch) => { const v = R.LORD_VARIANTS[id], ok = R.lordVariantSeen && R.lordVariantSeen(id), k = R.lordVariantKills ? R.lordVariantKills(id) : 0; return th(id, { n: k, cls: 'lv-mut' + (ok ? '' : ' dim'), style: '--lvc:' + v[1], title: E()[id].name + '【' + (ok ? v[0] : '？？？') + '】' + (ch ? '・' + ch : ''), tag: '異變' }); };

  // ---------- 左頁 ----------
  const siteBtn = x => { const rg = regionOf(x), lock = x.status === 'lock' || x.status === 'forbidden'; return '<button type="button" class="dr-site' + (x.id === siteId ? ' on' : '') + (lock ? ' lock' : '') + '" data-drs="' + x.id + '" style="--rc:' + colOf(x) + '"><b>' + esc(x.name) + '</b><small>' + esc(G(x.grade).name) + (rg ? '・' + esc(rg.n) : '') + (x.status === 'forbidden' ? '・公會禁止進入' : x.status === 'lock' ? '・還不能進' : '') + '</small></button>'; };
  const SUBS = [['mob', '小怪'], ['lord', '領主體'], ['info', '遺跡詳情']];
  const siteList = () => {
    const list = ruins(gtab);
    return '<p class="note dr-tip">點一座遺跡，看裡面的小怪、領主體和遺跡的詳情。</p><div class="dr-sites">' + list.map(siteBtn).join('') + '</div>';
  };
  // ---------- 總覽：不分難度，直接列全部小怪／領主體；遺跡詳情＝分級情報＋東鶴的遺跡 ----------
  const allMobs = () => {
    const seen = new Set(), list = [], main = new Set(), env = new Set(), rare = new Set();
    ORDER.forEach(gid => ruins(gid).forEach(s => {
      const m = mobsOf(s);
      m.list.forEach(id => { if (!seen.has(id)) { seen.add(id); list.push(id); } });
      m.main.forEach(id => main.add(id)); m.env.forEach(id => env.add(id));
      RARE(s).forEach(id => rare.add(id));
    }));
    return { list, main: [...main], env: [...env], rare: [...rare].filter(id => E()[id]) };
  };
  const tiersAtAll = id => {
    const out = {};
    ORDER.forEach(gid => ruins(gid).forEach(s => {
      const T = tiersAt(id, s);
      Object.keys(T).forEach(t => { (out[t] = out[t] || new Set()); T[t].forEach(b => out[t].add(b)); });
    }));
    return out;
  };
  const allLords = () => {
    const seen = new Set(), out = [];
    ORDER.forEach(gid => ruins(gid).forEach(s => {
      lordsOf(s).forEach(([id, why]) => { if (!seen.has(id)) { seen.add(id); out.push([id, G(s.grade).name + (why && why !== '可能出現' ? '・' + why : ''), s.grade]); } });
    }));
    return out;
  };
  const allMobTab = () => {
    const { list, main, env, rare } = allMobs(), T = {}, used = new Set();
    list.forEach(id => { T[id] = tiersAtAll(id); Object.keys(T[id]).forEach(t => used.add(+t)); });
    const rows = [1, 2, 3].filter(t => used.has(t));
    const col = id => '<div class="dr-col">' + th(id, { n: kills(id), star: main.includes(id), tag: env.includes(id) ? envName(E()[id].env) : E()[id].elite ? '精英' : '' })
      + rows.filter(t => rows.some(u => u >= t && T[id][u])).map(t => { const v = T[id][t] && varOf(id, t); return v ? th(v, { tag: VT[t][0], cls: 'dr-v dr-v' + t, title: E()[v].name + '・' + [...T[id][t]].sort().map(b => BANDS[b][0]).join('、') + '出現' }) : '<span class="dr-th dr-empty" aria-hidden="true"></span>'; }).join('') + '</div>';
    return '<p class="note dr-tip">總覽・全部小怪 ' + list.length + ' 種（不分難度）・★＝至少一座遺跡常見・數字含變種・暗的是還沒打倒過的。' + (rows.length ? '每一欄上面是本體，正下方是荒／獰／淵（只要任何一座遺跡會出現就列）。' : '') + '</p>'
      + '<div class="dr-cols">' + list.map(col).join('') + '</div>'
      + (rows.length ? '<p class="note dr-tip">' + rows.map(t => '「' + VT[t][0] + '」' + VT[t][1].replace('｜', '，')).join('；') + '。中層起才會出現，越深越多。</p>' : '')
      + (rare.length ? '<h4 class="dr-h">偶爾出現<small>每座遺跡都可能</small></h4><div class="dr-strip wrap">' + rare.map(id => '<div class="dr-rare">' + th(id) + '<small>' + esc(E()[id].name) + '<br>' + esc(RARE_NOTE[id] || '') + '</small></div>').join('') + '</div>' : '');
  };
  const allLordTab = () => {
    const L = allLords();
    if (!L.length) return '<p class="note dr-tip">還沒有記載的領主體（克森特級起才有）。</p>';
    const card = ([id, why, gid]) => { const e = E()[id], g = G(gid), ch = g && g.id === 'kaso' ? '45%' : (g && (g.lv || 0) >= 4 ? '25%' : ''), mut = ch && R.LORD_VARIANTS && R.LORD_VARIANTS[id];
      return '<div class="dr-lord"><div class="dr-col">' + th(id, { n: killsOf(id), star: why.indexOf('專屬') >= 0 || why.indexOf('最常見') >= 0 }) + (mut ? lvTh(id, ch) : '') + '</div><div class="dr-lt"><b>' + esc(e.name.replace(/^領主體・/, '')) + '</b><small>' + esc(why) + '</small>' + (mut ? '<small class="dr-mt" style="--lvc:' + R.LORD_VARIANTS[id][1] + '">下面是異變（' + ch + '・兩條血）</small>' : '') + '</div></div>'; };
    return '<p class="note dr-tip">總覽・全部領主體 ' + L.length + ' 種。領主體不是只在深層：第 3～5 層起每隔 3～5 層有一隻。異變放在本體正下方（遇過才亮）。</p>'
      + '<div class="dr-lords">' + L.map(card).join('') + '</div>';
  };
  const allInfoTab = () => {
    return '<p class="note dr-tip">各個分級的詳細情報，以及東鶴目前有哪些那一級的遺跡（點了跳到那座遺跡的圖鑑）。</p>'
      + ORDER.map(gid => {
        const g = G(gid); if (!g) return '';
        const dh = ruins(gid).filter(s => s.map === 'donghe');
        const all = ruins(gid);
        return '<div class="dr-ginfo" style="--gc:' + gcol(gid) + '"><h4 class="dr-h" style="--gc:' + gcol(gid) + '">' + esc(g.name) + '<small>' + esc(g.letter || '') + '・' + esc(g.zone || '') + (g.floors ? '・約 ' + g.floors + ' 層' : '') + '</small></h4>'
          + '<p>' + esc(g.desc || g.locked || '') + '</p>'
          + (g.locked && g.desc ? '<p class="note">' + esc(g.locked) + '</p>' : '')
          + '<p class="note"><b>東鶴的遺跡</b>' + (dh.length ? '（' + dh.length + ' 座）' : '：東鶴目前沒有這一級的遺跡。') + '</p>'
          + (dh.length ? '<div class="dr-sites">' + dh.map(siteBtn).join('') + '</div>' : '')
          + (all.length && all.length !== dh.length ? '<p class="note">全國一共 ' + all.length + ' 座這一級的遺跡（要看其他地區的，到上面「' + esc(g.name) + '」分頁）。</p>' : '')
          + '</div>';
      }).join('');
  };
  const overviewPage = () => {
    const M = allMobs().list.length, L = allLords().length;
    return '<div class="dr-head" style="--rc:#C9A13A"><div><b>遺跡圖鑑・總覽</b><small>不分難度・全部一起看</small></div></div>'
      + '<div class="dr-subs">' + SUBS.map(([k, n]) => '<button type="button" class="dr-sub' + (sub === k ? ' on' : '') + '" data-drsub="' + k + '">' + n + (k === 'mob' ? '<small>' + M + '</small>' : k === 'lord' ? '<small>' + L + '</small>' : '') + '</button>').join('') + '</div>'
      + '<div class="dr-subbody">' + (sub === 'lord' ? allLordTab() : sub === 'info' ? allInfoTab() : allMobTab()) + '</div>';
  };
  // 小怪：一欄一種，本體在上、荒／獰／淵在正下方
  const mobTab = s => {
    const { list, main, env } = mobsOf(s), T = {}, used = new Set();
    list.forEach(id => { T[id] = tiersAt(id, s); Object.keys(T[id]).forEach(t => used.add(+t)); });
    const rows = [1, 2, 3].filter(t => used.has(t));
    const col = id => '<div class="dr-col">' + th(id, { n: kills(id), star: main.includes(id), tag: env.includes(id) ? envName(E()[id].env) : E()[id].elite ? '精英' : '' })
      + rows.filter(t => rows.some(u => u >= t && T[id][u])).map(t => { const v = T[id][t] && varOf(id, t); return v ? th(v, { tag: VT[t][0], cls: 'dr-v dr-v' + t, title: E()[v].name + '・' + [...T[id][t]].sort().map(b => BANDS[b][0]).join('、') + '出現' }) : '<span class="dr-th dr-empty" aria-hidden="true"></span>'; }).join('') + '</div>';
    const rare = RARE(s);
    return '<p class="note dr-tip">' + list.length + ' 種・★＝這座遺跡常見的・數字是打倒過的隻數（包括變種）・暗的是還沒打倒過的。' + (rows.length ? '每一欄上面是本體，正下方是牠在這座遺跡會變成的變種。' : '這座遺跡的生物不會變種。') + '</p>'
      + '<div class="dr-cols">' + list.map(col).join('') + '</div>'
      + (rows.length ? '<p class="note dr-tip">' + rows.map(t => '「' + VT[t][0] + '」' + VT[t][1].replace('｜', '，')).join('；') + '。中層起才會出現，越深越多。</p>' : '')
      + (rare.length ? '<h4 class="dr-h">偶爾出現<small>每座遺跡都可能</small></h4><div class="dr-strip wrap">' + rare.map(id => '<div class="dr-rare">' + th(id) + '<small>' + esc(E()[id].name) + '<br>' + esc(RARE_NOTE[id] || '') + '</small></div>').join('') + '</div>' : '');
  };
  const lordTab = s => {
    const L = lordsOf(s), g = G(s.grade);
    if (!L.length) return '<p class="note dr-tip">' + esc(g.name) + '的遺跡沒有領主體（克森特級起才有）。</p>';
    const ch = g.id === 'kaso' ? '45%' : (g.lv || 0) >= 4 ? '25%' : '', [lo, hi] = lordCount(s);
    const card = ([id, why]) => { const e = E()[id], mut = ch && R.LORD_VARIANTS && R.LORD_VARIANTS[id]; return '<div class="dr-lord"><div class="dr-col">' + th(id, { n: killsOf(id), star: why !== '可能出現' }) + (mut ? lvTh(id, ch) : '') + '</div><div class="dr-lt"><b>' + esc(e.name.replace(/^領主體・/, '')) + '</b><small>' + esc(why) + '</small>' + (mut ? '<small class="dr-mt" style="--lvc:' + R.LORD_VARIANTS[id][1] + '">下面是異變（' + ch + '・兩條血）</small>' : '') + '</div></div>'; };
    return '<p class="note dr-tip">領主體不是只在深層：<b>第 3～5 層起，每隔 3～5 層有一隻</b>（最後一層沒有），守在往下的樓層通道前，牠倒下之前下不去。這座遺跡約 ' + floorsOf(s) + ' 層，一趟大約遇到 ' + (lo === hi ? lo : lo + '～' + hi) + ' 隻。★＝這座遺跡最常見的。</p>'
      + '<div class="dr-lords">' + L.map(card).join('') + '</div>'
      + (ch ? '<p class="note dr-tip">異變：' + esc(g.name) + '的領主體有 ' + ch + ' 的機率以異變的樣子出現（最深三成的樓層再 +10%），遇過才亮。</p>' : '');
  };
  const layers = s => {
    const col = colOf(s), pc = v => Math.round(v * 100) + '%';
    const rows = BANDS.map(([lab, note], b) => {
      const d = depthAt(s, bandEnd(s, b)), more = d && d.hp >= 0.01 ? '到這一段最深：生物生命 +' + pc(d.hp) + '、傷害 +' + pc(d.dmg) + '、寶物數量 +' + pc(d.qty) : '';
      return '<div class="dr-layer" style="--rc:' + col + ';--k:' + b + '"><b>' + esc(lab) + '</b><small>' + esc(bandRange(s, b)) + '</small><span>' + esc(note) + (more ? '<br><i>' + esc(more) + '</i>' : '') + '</span></div>';
    });
    rows.push('<div class="dr-layer" style="--rc:' + col + ';--k:3"><b>最深處</b><small>第 ' + floorsOf(s) + ' 層</small><span>' + (reserve(s) ? '看得到佩特拉核心，但受公會保護，不能打。' : '佩特拉核心醒著：打倒它才算討伐完成。') + '</span></div>');
    return '<h4 class="dr-h">遺跡分層</h4><div class="dr-layers">' + rows.join('') + '</div>';
  };
  const coreCard = s => {
    const cu = coreURL(s), rg = regionOf(s);
    return '<h4 class="dr-h">佩特拉核心</h4><button type="button" class="dr-corecard' + (pick === 'core' ? ' sel' : '') + '" data-drk="1" style="--rc:' + colOf(s) + '">' + (cu ? '<img src="' + cu + '" alt="">' : '')
      + '<span><b>佩特拉核心' + (rg ? '・' + esc(rg.n) + '一帶' : '') + '</b><small>' + (reserve(s) ? '保留區：最深處看得到，受公會保護、不能打。' : '討伐區：最深處醒著，打倒它才算討伐完成。') + '</small><small>長相：' + esc(rg ? rg.n + '一帶的殼、血管、瞳孔顏色' : '原本的象牙白殼、紅色血管') + '</small><em>點一下看介紹（長相、力場、反應）</em></span></button>'
      + (R.MOKUMOKUREN ? '<p class="note dr-tip">' + esc(R.MOKUMOKUREN) + '</p>' : '');
  };
  const modsOf = s => { const M = R.FLOOR_MODS || {}, g = G(s.grade); if (s.id === 'kanko' || !g || g.id === 'hunt') return []; return Object.keys(M).filter(k => !g.passive || M[k].safe); };
  const fields = s => {
    const es = envsOf(s), ms = modsOf(s), M = R.FLOOR_MODS || {}, chip = (k, n, sb) => '<button type="button" class="dr-fc' + (pick === k ? ' sel' : '') + '" data-drf="' + k + '"><b>' + esc(n) + '</b>' + (sb ? '<small>' + esc(sb) + '</small>' : '') + '</button>';
    let h = '<h4 class="dr-h">場地效果</h4>';
    if (es.length) h += '<p class="note">' + (s.env ? '整座遺跡都是這種環境：' : '每一趟從這三種環境抽一種：') + '</p><div class="dr-fields">' + es.map(e => chip('env:' + e, envName(e), (R.ENVS[e] || {}).desc || (e === 'forge' ? '機關還在動。' : ''))).join('') + '</div>';
    if (ms.length) h += '<p class="note">樓層效果：第二層起，每一層大約四成五會抽到一種（每層重新抽）' + (G(s.grade).passive ? '；這一級只有不危險的幾種' : '') + '。</p><div class="dr-fields">' + ms.map(m => chip('mod:' + m, M[m].n, M[m].d)).join('') + '</div>';
    const gx = R.gradeFxOf ? R.gradeFxOf(s) : [];   // 這個分級帶來的效果（hudinfo.js 的 R.GRADE_FX）
    if (gx.length) h += '<p class="note">這個分級（' + esc(G(s.grade).name) + '）：</p><div class="dr-fields">' + gx.map(k => chip('gfx:' + k, R.GRADE_FX[k].n, R.GRADE_FX[k].d)).join('') + '</div>';
    if (!es.length && !ms.length && !gx.length) h += '<p class="note">這裡沒有場地效果。</p>';
    return h;
  };
  const infoTab = s => {
    const g = G(s.grade), rg = regionOf(s), t = R.TYPES[s.type];
    return '<div class="dr-info" style="--rc:' + colOf(s) + '"><p><b>' + esc(g.name) + '</b>（' + esc(g.letter || '') + '・' + esc(g.zone || '') + '）' + (t ? '・' + esc(t.name) : '') + (s.env ? '・' + esc(envName(s.env)) + '環境' : '') + '・約 ' + floorsOf(s) + ' 層</p>'
      + '<p>' + esc(s.desc || '') + '</p>' + (rg ? '<p class="note"><b>' + esc(rg.n) + '</b>：' + esc(rg.d || '') + '</p>' : '') + (t && t.desc ? '<p class="note">' + esc(t.name) + '：' + esc(t.desc) + '</p>' : '') + '</div>'
      + fields(s) + coreCard(s) + layers(s);
  };
  const ruinPage = s => {
    const rg = regionOf(s), L = lordsOf(s).length, M = mobsOf(s).list.length;
    return '<div class="dr-head" style="--rc:' + colOf(s) + '"><button type="button" class="btn dr-back" data-drup="1">‹ ' + esc(gtab === 'all' ? '全部的遺跡' : G(gtab).name + '的遺跡') + '</button><div><b>' + esc(s.name) + '</b><small>' + esc(G(s.grade).name) + (rg ? '・' + esc(rg.n) : '') + '</small></div></div>'
      + '<div class="dr-subs">' + SUBS.map(([k, n]) => '<button type="button" class="dr-sub' + (sub === k ? ' on' : '') + '" data-drsub="' + k + '">' + n + (k === 'mob' ? '<small>' + M + '</small>' : k === 'lord' ? '<small>' + L + '</small>' : '') + '</button>').join('') + '</div>'
      + '<div class="dr-subbody">' + (sub === 'lord' ? lordTab(s) : sub === 'info' ? infoTab(s) : mobTab(s)) + '</div>';
  };
  const progress = () => {
    const ids = Object.keys(E()).filter(id => { const e = E()[id]; return !e.human && !e.noDex && !e.vbase && !/_v\d$/.test(id); });
    return '<p class="dx-count">已記錄 <b>' + ids.filter(id => kills(id)).length + '</b>／' + ids.length + '</p>';
  };
  const left = () => {
    if (gtab !== 'all' && !G(gtab)) gtab = 'all';
    const s = siteId && R.SITES.find(x => x.id === siteId);
    if (s && !(isRuin(s) && (gtab === 'all' || s.grade === gtab))) siteId = null;
    if (gtab === 'all') { siteId = null; return overviewPage() + progress(); }   // 總覽：直接三個小分頁，不先列遺跡
    return (siteId ? ruinPage(s) : siteList()) + progress();
  };
  // ---------- 右頁 ----------
  const coreURL = s => { try { const st = R.coreStyleOf && R.coreStyleOf(s), sh = R.beastSheetOf && R.beastSheetOf('petra'); if (!sh) return ''; const src = st && R.recolorCore ? R.recolorCore(sh.c, st) : sh.c, c = document.createElement('canvas'); c.width = sh.fw; c.height = sh.fh; c.getContext('2d').drawImage(src, 0, 0, sh.fw, sh.fh, 0, 0, sh.fw, sh.fh); return c.toDataURL(); } catch (e) { return ''; } };
  const ruinInfo = s => {
    const g = G(s.grade), rg = regionOf(s), t = R.TYPES[s.type], main = R.siteMain ? R.siteMain(s) : [];
    return '<div class="dx-banner">' + esc(s.name) + '</div>'
      + '<div class="dr-info" style="--rc:' + colOf(s) + '"><p><b>' + esc(g ? g.name : '') + '</b>（' + esc(g ? g.letter || '' : '') + '）' + (t ? '・' + esc(t.name) : '') + (s.env ? '・' + esc(envName(s.env)) + '環境' : '') + '・約 ' + floorsOf(s) + ' 層</p>'
      + '<p>' + esc(s.desc || '') + '</p>' + (rg ? '<p class="note"><b>' + esc(rg.n) + '</b>：' + esc(rg.d || '') + '</p>' : '')
      + (main.length ? '<p class="note">常見：' + main.map(id => esc(E()[id].name)).join('、') + '</p>' : '')
      + '</div><p class="note">點左邊的小頭像看那一隻的介紹；「遺跡詳情」裡有佩特拉核心和場地效果。</p>';
  };
  const gradeInfo = gid => {
    if (gid === 'all') return '<div class="dx-banner">遺跡圖鑑・總覽</div><p>總覽直接看全部小怪、全部領主體；「遺跡詳情」是各個分級的情報，以及東鶴有哪些那一級的遺跡。</p><p class="note">哈米莉亞～卡索級的分頁照舊：選分級 → 選遺跡 → 小怪／領主體／遺跡詳情。變種（荒、獰、淵）排在本體正下方。</p>';
    const g = G(gid); return '<div class="dx-banner">' + esc(g.name) + '</div><p><b>' + esc(g.letter || '') + '</b>・' + esc(g.zone || '') + '</p><p>' + esc(g.desc || g.locked || '') + '</p>' + (gid === 'kaso' && g.locked ? '<p class="note">' + esc(g.locked) + '</p>' : '');
  };
  const ul = l => '<ul class="dr-ul">' + l.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  const back = '<div class="row"><button type="button" class="btn" data-drback="1">回到遺跡的介紹</button></div>';
  const coreInfo = s => {
    const e = E().petra, cu = coreURL(s), rg = regionOf(s), RX = R.REACTIONS || {};
    return '<div class="dx-banner">佩特拉核心</div>' + (cu ? '<div class="dr-core"><img src="' + cu + '" alt=""><small>' + esc(rg ? rg.n + '一帶的核心' : '核心') + '（每個地區的殼、血管、瞳孔顏色都不一樣）</small></div>' : '')
      + '<p>' + esc(e.desc || '') + '</p>'
      + '<h4 class="dx-h">在哪裡、能不能打</h4>' + ul(['每一座遺跡的最深處都有一顆，遺跡就是靠它維持的。', '保留區（哈米莉亞、阿彌勒、摩爾斯級）：看得到，但受公會保護，不能打。', '討伐區（克森特級起）：醒著、周圍五到十公尺是異常狀態力場；打倒它才算討伐完成，會掉魔力核心、翼肢碎片。'])
      + '<h4 class="dx-h">佩特拉的注意、反應</h4>' + ul(['在遺跡裡打鬥、破壞、開寶箱……都會讓核心注意到你（右上角那一條）；滿 100 會觸發一次「反應」。'].concat(Object.keys(RX).map(k => RX[k].name + '：' + RX[k].desc)))
      + '<p class="note">每一趟遺跡的反應是上面五種之一，第一次觸發才知道是哪一種。遺跡裡點右上角的「佩特拉的注意」看什麼會讓它升、降。</p>'
      + (R.dexStats ? R.dexStats('petra') : '') + back;
  };
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
    const e = E()[id], base = baseOf(id), n = kills(base), url = icon(id, 6), s0 = R.SITES.find(x => x.id === siteId);
    const where = R.SITES.filter(s => isRuin(s) && s.id !== 'kanko' && (mobsOf(s).list.includes(base) || lordsOf(s).some(x => x[0] === base) || RARE(s).includes(base)));
    const vs = varsOf(base);
    return '<div class="dx-banner">' + esc(e.name) + '</div><div class="dx-portrait' + (n ? '' : ' unseen') + '" style="--bg:' + ((e.env && R.ENVS[e.env] && R.ENVS[e.env].floor) || (s0 && R.THEMES && R.THEMES[s0.grade] && R.THEMES[s0.grade].floor) || '#3A3046') + '">' + (url ? '<img src="' + url + '" alt="">' : '') + '</div>'
      + '<p>' + esc(e.desc || (E()[base] && E()[base].desc) || '') + '</p>'
      + (R.dexStats ? R.dexStats(id) : '') + '<p class="note">' + (n ? '打倒過 ' + n + ' 隻（包括變種）' : '還沒打倒過') + '</p>'
      + (vs.length ? '<h4 class="dx-h">分級變種</h4><div class="dx-vlist">' + [base].concat(vs).map((v, i) => { const k = killsOf(v); return '<div class="dx-var' + (k ? '' : ' dim') + '">' + (icon(v) ? '<img src="' + icon(v) + '" alt="">' : '') + '<span>' + (i ? '「' + VT[i][0] + '」' : '本體・') + esc(E()[v].name) + '<small>' + (k ? '打倒 ' + k : '還沒打倒過') + (i ? '・' + VT[i][1].split('｜')[1] : '') + '</small></span></div>'; }).join('') + '</div>' : '')
      + (R.lordVariantDex ? R.lordVariantDex(base) : '')
      + (where.length ? '<h4 class="dx-h">出現的遺跡</h4><div class="dr-where">' + where.map(s => '<button type="button" class="dr-site sm" data-drgo="' + s.id + '" style="--rc:' + colOf(s) + '"><b>' + esc(s.name) + '</b><small>' + esc(G(s.grade).name) + ((R.siteMain ? R.siteMain(s) : []).includes(base) ? '・常見' : '') + '</small></button>').join('') + '</div>' : '')
      + back;
  };

  // ---------- 畫出來 ----------
  let HOST = null;
  const render = host => {
    host = host || HOST; if (!host) return; HOST = host;
    const lp = host.querySelector('.dx-left'), rp = host.querySelector('.dx-right'), body = host.querySelector('.dx-body'); if (!lp || !body) return;
    body.innerHTML = '<div class="dr-box">' + left() + '</div>';
    host.querySelectorAll('[data-dxg]').forEach(b => { b.classList.toggle('on', b.dataset.dxg === gtab); b.onclick = () => { gtab = b.dataset.dxg; siteId = null; mon = null; pick = null; render(host); }; });
    const s = siteId && R.SITES.find(x => x.id === siteId);
    if (wide() && rp) { rp.innerHTML = mon && E()[mon] ? monInfo(mon) : s && pick === 'core' ? coreInfo(s) : s && pick ? fieldInfo(pick) : s ? ruinInfo(s) : gradeInfo(gtab); rp.scrollTop = 0; bindRight(host, rp); }
    body.querySelectorAll('[data-drs]').forEach(b => { b.onclick = () => { if (gtab === 'all') goSite(host, b.dataset.drs); else { siteId = b.dataset.drs; sub = 'mob'; mon = null; pick = null; render(host); } }; });
    body.querySelectorAll('[data-drup]').forEach(b => { b.onclick = () => { siteId = null; mon = null; pick = null; render(host); }; });
    body.querySelectorAll('[data-drsub]').forEach(b => { b.onclick = () => { sub = b.dataset.drsub; mon = null; pick = null; render(host); }; });
    body.querySelectorAll('[data-drk],[data-drf]').forEach(b => { b.onclick = () => { mon = null; pick = b.dataset.drk ? 'core' : b.dataset.drf; if (wide()) render(host); else if (s) popup(host, pick === 'core' ? coreInfo(s) : fieldInfo(pick)); }; });
    body.querySelectorAll('[data-drm]').forEach(b => { b.onclick = () => { mon = b.dataset.drm; pick = null; if (wide()) render(host); else popup(host, monInfo(mon)); }; });
  };
  const goSite = (host, id) => { const s = R.SITES.find(x => x.id === id); if (!s) return; gtab = s.grade; siteId = s.id; sub = 'mob'; mon = null; pick = null; render(host); };
  const bindRight = (host, rp) => {
    rp.querySelectorAll('[data-drback]').forEach(b => { b.onclick = () => { mon = null; pick = null; render(host); }; });
    rp.querySelectorAll('[data-drgo]').forEach(b => { b.onclick = () => goSite(host, b.dataset.drgo); });
  };
  const popup = (host, html) => {
    const old = $('dr-modal'); if (old) old.remove();
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'dr-modal'; m.style.zIndex = 60;
    m.innerHTML = '<div class="sheet dx-sheet" role="dialog" aria-modal="true">' + html + '<div class="row"><button type="button" class="btn pri" id="dr-x">關閉</button></div></div>';
    document.body.appendChild(m); const close = () => m.remove(); $('dr-x').onclick = close; m.onclick = e => { if (e.target === m) close(); };
    m.querySelectorAll('[data-drback]').forEach(b => { b.onclick = () => { mon = null; pick = null; close(); }; });
    m.querySelectorAll('[data-drgo]').forEach(b => { b.onclick = () => { close(); goSite(host, b.dataset.drgo); }; });
  };
  // dexui.js 每次打開圖鑑都會重畫書本的外框，這裡把內容畫進去
  R.dexRuins = { mount: host => render(host), render: () => { const h = $('cards'); if (h) render(h); }, go: id => { const h = $('cards'); if (h) goSite(h, id); }, _t: { mobsOf, lordsOf, tiersAt, RARE } };

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
    '@media (min-width:780px){.dx-book .dx-right{max-height:calc(100vh - 110px);overflow-y:auto;scrollbar-width:thin}}',
    // 2026-10-05 改版：一座遺跡的上方、三個小分頁、小怪的直欄（本體在上、變種在正下方）、領主體的卡片
    '.dr-h small{font-weight:400;opacity:.7;font-size:11px;margin-left:6px;letter-spacing:0}',
    '.dr-head{display:flex;align-items:center;gap:10px;margin:2px 0 8px;padding:6px 8px;border-radius:10px;border-left:4px solid var(--rc);background:color-mix(in srgb,var(--rc) 16%,transparent)}.dr-head b{display:block;font-size:15px}.dr-head small{font-size:11.5px;opacity:.8}.dr-back{padding:4px 10px;font-size:12px;white-space:nowrap}',
    '.dr-subs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin:0 0 8px}',
    '.dr-sub{flex:1;padding:7px 8px;border:1px solid var(--line);border-bottom:0;border-radius:8px 8px 0 0;background:rgba(255,255,255,.03);color:inherit;font:inherit;font-weight:700;font-size:13px;cursor:pointer;opacity:.8}.dr-sub.on{background:color-mix(in srgb,var(--gold,#C9A13A) 22%,transparent);border-color:var(--gold,#C9A13A);opacity:1}.dr-sub small{font-weight:400;opacity:.75;margin-left:5px;font-size:11px}',
    '.dr-cols{display:flex;flex-wrap:wrap;gap:6px 5px;align-items:flex-start;padding:8px;border:1px solid var(--line);border-radius:10px;background:rgba(0,0,0,.18)}',
    '.dr-col{display:flex;flex-direction:column;gap:3px;align-items:center}',
    '.dr-legend{display:flex;flex-direction:column;gap:3px;margin-right:2px}.dr-legend span{height:46px;display:grid;place-items:center;font-size:11px;font-weight:900;writing-mode:vertical-rl;letter-spacing:.2em;opacity:.85;padding:0 2px;border-radius:4px;background:rgba(255,255,255,.05)}',
    '.dr-legend .dr-v1{color:#E88A6A}.dr-legend .dr-v2{color:#E05A5A}.dr-legend .dr-v3{color:#B07AFF}',
    '.dr-th u{position:absolute;left:1px;bottom:0;text-decoration:none;font-size:9px;font-weight:900;color:#FFE8C0;text-shadow:0 1px 2px #000,0 0 2px #000;line-height:1.1}',
    '.dr-th i{position:absolute;right:2px;top:0;font-style:normal;font-size:9.5px;font-weight:700;color:#F2D98A;text-shadow:0 1px 2px #000}',
    '.dr-th.dr-v1{border-color:rgba(232,138,106,.5)}.dr-th.dr-v2{border-color:rgba(224,90,90,.6)}.dr-th.dr-v3{border-color:rgba(176,122,255,.65)}',
    '.dr-th.dr-empty{cursor:default;background:repeating-linear-gradient(45deg,rgba(255,255,255,.03) 0 4px,transparent 4px 8px);border-style:dashed;border-color:rgba(255,255,255,.08)}',
    '.dr-strip.wrap{flex-wrap:wrap;gap:8px}.dr-rare{display:flex;align-items:center;gap:6px;font-size:11.5px;min-width:150px}.dr-rare small{opacity:.85;line-height:1.3}',
    '.dr-lords{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px}',
    '.dr-lord{display:flex;gap:8px;align-items:flex-start;padding:6px 8px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.04)}.dr-lt{display:grid;gap:2px;font-size:12px}.dr-lt b{font-size:13.5px}.dr-lt small{opacity:.8;font-size:11px}.dr-lt .dr-mt{color:var(--lvc);opacity:1}',
    '.dr-sites+.dr-h,.dr-tip+.dr-h{margin-top:10px}',
    '.dr-ginfo{margin:0 0 14px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);border-left:4px solid var(--gc);background:rgba(255,255,255,.03)}.dr-ginfo p{margin:6px 0;font-size:12.5px;line-height:1.45}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
