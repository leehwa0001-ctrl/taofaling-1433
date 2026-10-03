// 討伐令 1433：地面上的東鶴（存檔、選職業、公會、老岩的鐵匠鋪、倉庫、白藤堂）
(function (R) {
  const $ = id => document.getElementById(id);
  const esc = s => R.esc(s);
  const KEY = 'ruins1433-v1';
  const SCREENS = ['title', 'map', 'bestiary', 'pick', 'hub', 'run'];
  // R.base：地圖、圖鑑的「返回」要回到標題還是東鶴
  R.base = 'title';
  // 職業名稱：轉職了就顯示上位職業
  R.clsName = cls => { const st = R.S && R.S.classes[cls], a = st && st.adv ? R.ADV[cls].find(x => x.id === st.adv) : null; return a ? a.name : R.CLASSES[cls].name; };
  R.showScreen = id => { if (id === 'title' || id === 'hub') R.base = id; if (id === 'run' && R.W && R.W.town) R.base = 'town'; SCREENS.forEach(k => { const el = $(k); if (el) el.hidden = k !== id; }); };

  // ---------- 存檔 ----------
  // 舊存檔（v1 只有一格防具）：原本的防具變成「上衣」
  const migrate = s => {
    if (s.v === 1) {
      const map = { light: 'body_light', medium: 'body_medium', heavy: 'body_heavy' };
      s.stash.forEach(it => { if (it.kind === 'armor' && map[it.base]) it.base = map[it.base]; });
      Object.values(s.equip).forEach(e => { e.body = e.armor || null; delete e.armor; ['head', 'legs', 'feet'].forEach(k => { e[k] = e[k] || null; }); });
      s.v = 2;
    }
    // 新的職業（2026-10-04 武術家）：舊存檔補上這個職業的等級、裝備欄
    if (s.classes && s.equip) R.CLASS_IDS.forEach(c => { if (!s.classes[c]) s.classes[c] = { lv: 1, xp: 0, adv: null }; if (!s.equip[c]) s.equip[c] = { weapon: null, head: null, body: null, legs: null, feet: null, charm: null }; });
    return s;
  };
  R.migrate = migrate;
  // o：捏角的結果（name、look、race）
  R.freshSave = (cls, o) => Object.assign({
    v: 2, nextId: 1, gold: 150, cls, name: '', look: null, race: null, day: 0,
    classes: Object.fromEntries(R.CLASS_IDS.map(c => [c, { lv: 1, xp: 0, adv: null }])),
    stash: [], equip: Object.fromEntries(R.CLASS_IDS.map(c => [c, { weapon: null, head: null, body: null, legs: null, feet: null, charm: null }])),
    party: [], roster: null, mats: { branch: 0, herb: 0, iron: 0, shell: 0, manaore: 0, crystal: 0, core: 0, wing: 0 }, potions: { hp: 2, mp: 1 }, cleared: {}, stats: {}
  }, o || {});
  // 每個職業第一次登記時，公會配給一把基本武器和一件防具
  R.ensureKit = cls => {
    const eq = R.S.equip[cls];
    if (!eq.weapon || !R.itemById(eq.weapon)) { const w = R.starter(cls); R.S.stash.push(w); eq.weapon = w.id; }
    if (!eq.body || !R.itemById(eq.body)) { const a = R.makeItem({ kind: 'armor', base: cls === 'knight' ? 'body_heavy' : cls === 'warrior' ? 'body_medium' : 'body_light', ilvl: 1, rarity: 0, identified: true }); R.S.stash.push(a); eq.body = a.id; }
  };
  // 委託：阿彌勒級走完才開摩爾斯級，摩爾斯級走完才開克森特級
  R.gradeOpen = id => id === 'hamilia' || id === 'amile' || (id === 'mors' && !!R.S && R.S.cleared.amile > 0) || (id === 'kesent' && !!R.S && R.S.cleared.mors > 0);
  R.syncStatus = () => R.SITES.forEach(s => { if (s.kind === 'ruin') s.status = R.gradeOpen(s.grade) ? 'open' : 'lock'; });

  // ---------- 選職業 ----------
  R.showPick = slot => R.createChar(slot);

  // ---------- 東鶴 ----------
  let tab = 'guild', sub = 'id', focus = null;
  // f：在公會裡站在哪裡（告示板、登記處、收購窗口）；鐵匠鋪是哪一個分頁
  R.hub = (t, f) => {
    if (t) { tab = t; focus = null; if (f) { if (t === 'smith') sub = f; else focus = f; } }
    const S = R.S; R.ensureKit(S.cls);
    const st = S.classes[S.cls];
    $('hub-stat').innerHTML = (S.name ? '<span>' + esc(S.name) + '</span>' : '') + (R.today ? '<span>' + esc(R.shortDate()) + '</span>' : '') + '<span><b>' + S.gold + '</b> 費拉</span><span>' + esc(R.clsName(S.cls)) + ' Lv ' + st.lv + '</span><span>回復藥 ' + S.potions.hp + '・魔力藥 ' + S.potions.mp + '</span>';
    document.querySelectorAll('[data-htab]').forEach(b => b.setAttribute('aria-selected', b.dataset.htab === tab));
    const body = $('hub-body');
    body.innerHTML = tab === 'guild' ? focusGuild(guild()) : tab === 'smith' ? smith() : tab === 'stash' ? stash() : shop();
    bind(body);
    R.save();
  };
  const matsLine = () => Object.keys(R.MATS).filter(k => R.S.mats[k]).map(k => '<span class="mat" style="--c:' + R.MATS[k].color + '">' + esc(R.MATS[k].name) + ' ' + R.S.mats[k] + '</span>').join('') || '<span class="note">還沒有素材。</span>';
  const itemCard = (it, btns) => '<div class="item-card" style="--c:' + R.rarityColor(it) + '">' + (R.itemIconTag ? R.itemIconTag(it, 'card') : '') + '<b>' + esc(R.itemName(it)) + '</b>' + (it.identified ? '<small class="rar">' + R.RARITY[it.rarity].name + '</small>' : '<small class="rar">？？？</small>') + (it.locked ? '<span class="tag lock-tag">🔒 上鎖</span>' : '') + '<ul>' + R.itemLines(it).map(l => '<li>' + esc(l) + '</li>').join('') + '</ul><div class="row">' + btns + '</div></div>';

  // 同行的勇者：最多兩個人；每個人分走一成五的委託報酬
  const partyBox = () => {
    const S = R.S; R.ensureRoster();
    const card = (m, btn) => '<div class="recruit" style="--c:' + R.CLASSES[m.cls].color + '"><b>' + esc(m.name) + '</b><small>' + esc((m.race && R.RACES[m.race] ? R.RACES[m.race].name + '・' : '') + R.CLASSES[m.cls].name) + ' Lv ' + m.lv + (m.story ? '・不收錢' : '') + '</small><span>' + esc(m.line) + '</span>' + btn + '</div>';
    return '<h3>同行的勇者</h3><p class="note">最多兩個人一起下遺跡。隊友會跟著你、照自己的職業打；倒下了靠近扶起來。人越多，寶箱刷新越慢，公會的委託報酬每人分走一成五。</p>'
      + '<div class="recruits">' + (S.party.length ? S.party.map((m, i) => card(m, '<button type="button" class="mini" data-dismiss="' + i + '">解散</button>')).join('') : '<p class="note">現在是一個人。</p>') + '</div>'
      + '<p class="note">公會大廳裡的勇者（每跑完一趟會換一批）：</p><div class="recruits">' + S.roster.map((m, i) => card(m, m.refuse ? '<span class="note">不肯同行</span>' : '<button type="button" class="btn pri" data-hire="' + i + '"' + (S.party.length >= R.PARTY_MAX || S.gold < m.fee ? ' disabled' : '') + '>邀請同行（' + m.fee + ' 費拉）</button>')).join('') + '</div>';
  };
  const cardBox = () => {
    const S = R.S, r = R.raceOf();
    return '<h3>勇者證</h3><div class="hero-card"><canvas id="hc-face" width="72" height="90"></canvas><div><b>' + esc(S.name || '（還沒有名字）') + '</b><small>' + (r ? esc(r.name + '・' + r.from) : '種族：未登記') + '</small>'
      + (S.watched ? '<span class="tag red">受監視對象（神魔族）</span>' : '') + (r ? '<small>' + esc(R.raceBonusText(S.race).join('・')) + '</small><button type="button" class="btn" data-restyle="1">重新捏角（換照片、名字）</button><button type="button" class="btn" data-racechg="1">重新登記種族（' + (R.RACE_CHANGE_FEE || 150) + ' 費拉）</button>' : '<button type="button" class="btn pri" data-latereg="1">補登記種族</button>') + '</div></div>';
  };
  // 公會東鶴分館：職業登記、轉職、遺跡委託
  const guild = () => {
    const S = R.S;
    R.syncStatus();
    const open = R.SITES.filter(s => s.kind === 'ruin' && s.status === 'open');
    return '<section class="panel-doc"><h2>公會東鶴分館</h2><p class="note">西市口的綠旗石樓。登記處的館員抬頭看了你一眼：「下一位。」</p>'
      + '<h3>遺跡委託</h3><div class="quests">' + open.map(s => { const g = R.gradeById(s.grade); return '<div class="quest" style="--c:' + R.GRADE_COLOR[s.grade] + '"><b>' + esc(s.name) + '</b><small>' + esc(g.name) + '・' + esc(R.TYPES[s.type].name) + (s.env ? '・' + esc(R.ENVS[s.env].name) : '') + '</small><button type="button" class="btn pri" data-go="' + s.id + '">出發</button></div>'; }).join('')
      + '<button type="button" class="btn" data-map="1">攤開地圖看全部</button></div>'
      + cardBox()
      + partyBox()
      + '<h3>武器登記</h3><p class="note">勇者證上登記的主要武器，可以隨時改；公會照武器的類別派委託。每一類的等級分開算；練到 ' + R.PROMOTE_LV + ' 級、交一顆魔力核心，就能轉職（三條路選一條，之後再交一顆可以重選）。</p><div class="cls-grid">'
      + R.CLASS_IDS.map(c => { const d = R.CLASSES[c], st = S.classes[c], adv = st.adv ? R.ADV[c].find(a => a.id === st.adv) : null, cur = S.cls === c;
        return '<div class="cls-row' + (cur ? ' cur' : '') + '" style="--c:' + d.color + '"><b>' + esc(R.regGroup(c).group) + '</b><small>' + esc(d.name) + (adv ? '→' + esc(adv.name) : '') + '・Lv ' + st.lv + '</small>'
          + (cur ? '<span class="tag">現在登記的</span>' : '<button type="button" class="mini" data-cls="' + c + '">改登記這一類</button>')
          + (st.lv >= R.PROMOTE_LV ? '<button type="button" class="mini gold" data-promo="' + c + '">' + (adv ? '重選轉職' : '轉職') + '</button>' : '') + '</div>'; }).join('') + '</div>'
      + ((S.cards || []).length ? '<h3>撿到的勇者證</h3><p class="note">在遺跡裡偷襲你的人留下的勇者證。交給公會：註銷名單上的冒用證件有獎金。</p><ul class="loot">' + S.cards.map(c => '<li>' + esc(c.no) + '　' + esc(c.name) + (c.revoked ? '　<b style="color:#E04A3A">註銷名單上的號碼</b>' : '') + '</li>').join('') + '</ul><button type="button" class="btn pri" data-cards="1">全部交給公會</button>' : '')
      + '<h3>素材收購</h3><p class="note">公會收購從遺跡帶回來的素材。魔力核心留著轉職用，公會不收。</p><div class="sellmats">' + (Object.keys(R.MATS).filter(k => k !== 'core' && S.mats[k] > 0).map(k => '<div class="sellmat"><span>' + esc(R.MATS[k].name) + ' ×' + S.mats[k] + '（每個 ' + R.MATS[k].value + ' 費拉）</span><button type="button" class="mini" data-sellmat="' + k + ':1">賣 1</button><button type="button" class="mini" data-sellmat="' + k + ':all">全賣</button></div>').join('') || '<span class="note">沒有可以賣的素材。</span>') + '</div>'
      + '<h3>手邊的素材</h3><div class="mats">' + matsLine() + '</div></section>';
  };
  // 在公會裡面走到哪裡，就只看那一塊（告示板＝委託、登記處＝職業與隊伍、收購窗口＝素材）
  const FOCUS = {
    quests: { at: '委託告示板', line: '告示板上用圖釘釘著一張張委託，紙頭的顏色是遺跡的分級。', keep: ['遺跡委託'] },
    desk: { at: '登記處', line: '登記處的館員抬頭看了你一眼：「下一位。」', keep: ['勇者證', '同行的勇者', '武器登記'] },
    sell: { at: '收購窗口', line: '收購窗口的館員把秤擦乾淨：「今天收什麼？」', keep: ['撿到的勇者證', '素材收購', '手邊的素材'] }
  };
  const focusGuild = html => {
    const f = FOCUS[focus]; if (!f) return html;
    const parts = html.replace(/<\/section>\s*$/, '').split('<h3>');
    const body = parts.slice(1).filter(p => f.keep.some(k => p.startsWith(k + '</h3>'))).map(p => '<h3>' + p).join('');
    return '<section class="panel-doc"><h2>公會東鶴分館・' + esc(f.at) + '</h2><p class="note">' + esc(f.line) + '</p>' + body + '<div class="row"><button type="button" class="btn" data-gall="1">看公會的全部</button></div></section>';
  };
  // 老岩的鐵匠鋪：鑑定、製作、強化、分解
  const smith = () => {
    const S = R.S, uid = S.stash.filter(it => !it.identified);
    const subs = [['id', '鑑定（' + uid.length + '）'], ['craft', '製作'], ['up', '強化'], ['salv', '分解']];
    let h = '<section class="panel-doc"><h2>老岩的鐵匠鋪</h2><p class="note">「遺跡裡帶出來的東西，十件有八件看不出是什麼。拿來，我看。」</p><div class="subtabs">' + subs.map(([k, n]) => '<button type="button" class="tab' + (sub === k ? ' on' : '') + '" data-sub="' + k + '">' + n + '</button>').join('') + '</div>';
    if (sub === 'id') h += uid.length ? '<div class="items">' + uid.map(it => itemCard(it, '<button type="button" class="btn pri" data-ident="' + it.id + '"' + (S.gold < R.idPrice(it) ? ' disabled' : '') + '>鑑定（' + R.idPrice(it) + ' 費拉）</button>')).join('') + '</div>' : '<p class="note">沒有要鑑定的東西。從遺跡寶箱開出來的武器，大多要鑑定過才知道是什麼。</p>';
    if (sub === 'craft') {
      const opt = (v, n) => '<option value="' + v + '">' + esc(n) + '</option>';
      const groups = '<optgroup label="武器">' + R.weaponsFor(S.cls).map(k => opt('weapon:' + k, R.WEAPONS[k].name)).join('') + '</optgroup>'
        + R.SLOTS.map(sl => '<optgroup label="' + sl.name + '">' + Object.keys(R.ARMOR).filter(k => R.ARMOR[k].slot === sl.id).map(k => opt('armor:' + k, R.ARMOR[k].name)).join('') + '</optgroup>').join('')
        + '<optgroup label="護符">' + opt('charm:charm', '護符') + '</optgroup>';
      h += '<p class="note">做出來的東西當場就鑑定好了。現在的職業：' + esc(R.clsName(S.cls)) + '。</p><label class="field">要做什麼<select id="craft-base">' + groups + '</select></label>'
        + '<div class="recipes">' + R.RECIPES.map((rc, i) => '<div class="recipe"><b>' + esc(rc.name) + '（物品等級 ' + rc.ilvl + '）</b><small>' + Object.keys(rc.mats).map(k => esc(R.MATS[k].name) + ' ' + (S.mats[k] || 0) + '／' + rc.mats[k]).join('・') + '・' + rc.gold + ' 費拉</small><small>可能的稀有度：' + rc.weights.map((w, k) => w ? R.RARITY[k].name : '').filter(Boolean).join('、') + '</small><button type="button" class="btn pri" data-craft="' + i + '"' + (R.canCraft(rc) ? '' : ' disabled') + '>打造</button></div>').join('') + '</div>';
    }
    if (sub === 'up') { const eqU = R.equippedIds(), ok = S.stash.filter(it => it.identified).sort((a, b) => (eqU.has(b.id) - eqU.has(a.id)) || b.rarity - a.rarity); h += '<p class="note">強化最多到 +5。每一級：武器傷害 +8%，防具防禦 +1.5。</p><div class="items">' + ok.map(it => { const c = R.upgradePrice(it); return itemCard(it, (eqU.has(it.id) ? '<span class="tag">裝備中</span>' : '') + (it.plus >= 5 ? '<span class="note">已經 +5</span>' : '<button type="button" class="btn pri" data-up="' + it.id + '"' + (S.gold >= c.gold && S.mats.crystal >= c.crystal ? '' : ' disabled') + '>強化（' + c.gold + ' 費拉・魔力水晶 ' + c.crystal + '）</button>')); }).join('') + '</div>'; }
    if (sub === 'salv') { const eqIds = R.equippedIds(); const ok = S.stash.filter(it => !eqIds.has(it.id) && !it.locked); h += '<p class="note">拆掉不要的裝備換素材。裝備中的、上鎖的不能拆（在倉庫按「上鎖」）。</p><div class="items">' + ok.map(it => itemCard(it, '<button type="button" class="btn" data-salv="' + it.id + '">分解</button>')).join('') + '</div>'; }
    return h + '<h3>手邊的素材</h3><div class="mats">' + matsLine() + '</div></section>';
  };
  // 倉庫：裝備、賣掉
  const stash = () => {
    const S = R.S, eq = R.equipped(S.cls), eqIds = R.equippedIds();
    const slot = k => R.gearSlot ? R.gearSlot(k, eq[k]) : '<div class="slot"><small>' + R.GEAR_NAME[k] + '</small>' + (eq[k] ? '<b style="color:' + R.rarityColor(eq[k]) + '">' + esc(R.itemName(eq[k])) + '</b>' + (k !== 'weapon' ? '<button type="button" class="mini" data-unequip="' + k + '">脫下</button>' : '') : '<span class="note">（空）</span>') + '</div>';
    const P = R.calcPlayer(S.cls);
    const rest = S.stash.filter(it => !eqIds.has(it.id));
    return '<section class="panel-doc"><h2>倉庫</h2><p class="note">現在的職業：' + esc(R.CLASSES[S.cls].name) + '。放在倉庫的東西很安全；帶進遺跡的只有身上的裝備。</p><div class="slots">' + R.GEAR_KEYS.map(slot).join('') + '</div><p class="note">生命 ' + P.hpMax + '・魔力 ' + P.mpMax + '・防禦 ' + P.def.toFixed(1) + '・移動速度 ' + P.speed.toFixed(2) + '</p>'
      + '<h3>倉庫裡的東西（' + rest.length + '）</h3><div class="items">' + rest.map(it => itemCard(it, (R.canUse(it, S.cls) ? '<button type="button" class="btn pri" data-equip="' + it.id + '">穿上（' + R.GEAR_NAME[R.slotOf(it)] + '）</button>' : '<span class="note">' + esc(R.CLASSES[S.cls].name) + '不能用</span>') + (it.locked ? '<button type="button" class="btn" disabled title="上鎖的不能賣，先解鎖">賣掉（上鎖中）</button>' : '<button type="button" class="btn" data-sell="' + it.id + '">賣掉（' + R.sellPrice(it) + '）</button>') + '<button type="button" class="mini" data-lock="' + it.id + '" title="上鎖的東西不能賣、不能分解，一起賣也不會賣到">' + (it.locked ? '解鎖' : '上鎖') + '</button>')).join('') + '</div></section>';
  };
  // 白藤堂：藥水
  const shop = () => {
    const S = R.S, php = R.shopPrice ? R.shopPrice(30, 'shop') : 30, pmp = R.shopPrice ? R.shopPrice(25, 'shop') : 25;
    return '<section class="panel-doc"><h2>白藤堂</h2><p class="note">城西的藥鋪。掌櫃說：「藥草三株換一瓶回復藥。樹枝就別拿來了。」</p><div class="recipes">'
      + (php == null ? '<p class="hand">掌櫃看到你，往後退了一步：「……我們不賣東西給你。請你走。」</p>' : '<div class="recipe"><b>回復藥</b><small>回復 35% 生命。按 1 使用。</small><button type="button" class="btn pri" data-buy="hp:' + php + '"' + (S.gold < php ? ' disabled' : '') + '>買（' + php + ' 費拉）</button></div>')
      + (php == null ? '' : '<div class="recipe"><b>魔力藥</b><small>回復 50% 魔力。按 2 使用。</small><button type="button" class="btn pri" data-buy="mp:' + pmp + '"' + (S.gold < pmp ? ' disabled' : '') + '>買（' + pmp + ' 費拉）</button></div>')
      + '<div class="recipe"><b>藥草換回復藥</b><small>藥草 ' + S.mats.herb + '／3</small><button type="button" class="btn" data-herb="1"' + (S.mats.herb < 3 ? ' disabled' : '') + '>換</button></div>'
      + '<div class="recipe"><b>賣樹枝</b><small>樹枝 ' + S.mats.branch + ' 根，一根 1 費拉</small><button type="button" class="btn" data-branch="1"' + (S.mats.branch < 1 ? ' disabled' : '') + '>全部賣掉</button></div></div></section>';
  };
  const bind = body => {
    const S = R.S, on = (sel, f) => body.querySelectorAll(sel).forEach(b => { b.onclick = () => f(b); });
    on('[data-go]', b => R.startRun(b.dataset.go));
    on('[data-latereg]', () => R.lateRegister(() => R.hub()));
    on('[data-restyle]', () => R.restyle && R.restyle({ from: 'hub' }));
    on('[data-racechg]', () => {
      if (S.raceChgDay === S.day) { flashMsg('今天已經驗過魔力波了。明天再來。'); return; }
      if (S.gold < (R.RACE_CHANGE_FEE || 150)) { flashMsg('手續費要 ' + (R.RACE_CHANGE_FEE || 150) + ' 費拉。'); return; }
      R.changeRace(m => { R.hub(); if (m) flashMsg(m); });
    });
    on('[data-cards]', () => { const cs = S.cards || [], b = cs.reduce((a, c) => a + (c.revoked ? 120 : c.hunter ? 60 : 40), 0); S.gold += b; S.rep = (S.rep || 0) + cs.length; cs.forEach(c => R.addDeed && R.addDeed(c.revoked ? '公會東鶴分館收回一張冒用的勇者證（' + c.no + '）。' : '公會東鶴分館受理遺跡內的襲擊通報。')); S.cards = []; R.hub(); flashMsg('公會給了 ' + b + ' 費拉的獎金。'); });
    const face = body.querySelector('#hc-face'); if (face && R.heroSheetCanvas) { const sh = R.heroSheetCanvas(Object.assign({ weapon: null }, R.CLASSES[S.cls] ? R.CLASSES[S.cls].look : {}, R.playerLook())), x = face.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(sh, 0, 0, 24, 30, 0, 0, 72, 90); }
    on('[data-map]', () => R.openMap && R.openMap('nation'));
    on('[data-gall]', () => R.hub('guild'));
    on('[data-cls]', b => { S.cls = b.dataset.cls; R.ensureKit(S.cls); R.hub(); });
    on('[data-hire]', b => { const m = S.roster[+b.dataset.hire]; if (R.hire(+b.dataset.hire)) { R.hub(); flashMsg(m.name + '加入了隊伍'); } });
    on('[data-dismiss]', b => { const m = S.party[+b.dataset.dismiss]; R.dismiss(+b.dataset.dismiss); R.hub(); flashMsg(m.name + '離開了隊伍'); });
    on('[data-promo]', b => promoSheet(b.dataset.promo));
    on('[data-sub]', b => { sub = b.dataset.sub; R.hub(); });
    on('[data-ident]', b => { const it = R.itemById(b.dataset.ident); if (R.identify(it)) { R.hub(); flashMsg('鑑定出來了：' + R.itemName(it), R.rarityColor(it)); } });
    on('[data-craft]', b => { const [kind, base] = $('craft-base').value.split(':'); const it = R.craft(R.RECIPES[+b.dataset.craft], kind, base); if (it) { R.hub(); flashMsg('打造好了：' + R.itemName(it), R.rarityColor(it)); } });
    on('[data-up]', b => { const it = R.itemById(b.dataset.up); if (R.upgrade(it)) { R.hub(); flashMsg('強化成功：' + R.itemName(it), R.rarityColor(it)); } });
    on('[data-salv]', b => { const got = R.salvage(R.itemById(b.dataset.salv)); R.hub(); flashMsg('拆出來了：' + Object.keys(got).map(k => R.MATS[k].name + ' ×' + got[k]).join('、')); });
    on('[data-equip]', b => { const it = R.itemById(b.dataset.equip); S.equip[S.cls][R.slotOf(it)] = it.id; R.hub(); });
    on('[data-unequip]', b => { S.equip[S.cls][b.dataset.unequip] = null; R.hub(); });
    on('[data-lock]', b => { const it = R.itemById(b.dataset.lock); if (!it) return; it.locked = !it.locked; R.save(); R.hub(); flashMsg(it.locked ? '上鎖了：' + R.itemName(it) + '（不會被賣掉、分解）' : '解鎖了：' + R.itemName(it)); });
    on('[data-sell]', b => { const p = R.sell(R.itemById(b.dataset.sell)); R.hub(); flashMsg('賣了 ' + p + ' 費拉'); });
    on('[data-buy]', b => { const [k, p] = b.dataset.buy.split(':'); if (S.gold >= +p) { S.gold -= +p; S.potions[k]++; R.hub(); } });
    on('[data-herb]', () => { if (S.mats.herb >= 3) { S.mats.herb -= 3; S.potions.hp++; R.hub(); } });
    on('[data-branch]', () => { S.gold += S.mats.branch; S.mats.branch = 0; R.hub(); });
    on('[data-sellmat]', b => { const [k, q] = b.dataset.sellmat.split(':'), n = q === 'all' ? S.mats[k] : Math.min(1, S.mats[k]); if (!n) return; S.mats[k] -= n; S.gold += n * R.MATS[k].value; R.hub(); flashMsg('賣了 ' + R.MATS[k].name + ' ×' + n + '：' + n * R.MATS[k].value + ' 費拉'); });
  };
  const flashMsg = (txt, color) => { const el = $('hub-msg'); el.textContent = txt; el.style.color = color || ''; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };
  R.say = flashMsg;
  // 轉職：三條路選一條
  const promoSheet = cls => {
    const S = R.S, st = S.classes[cls];
    const el = $('hub-modal'); el.hidden = false;
    $('hub-sheet').innerHTML = '<h2>' + esc(R.CLASSES[cls].name) + '的轉職</h2><p class="note">需要一顆魔力核心（你有 ' + (S.mats.core || 0) + ' 顆）。' + (st.adv ? '已經轉職過了；重選也要一顆。' : '') + '</p><div class="promo">'
      + R.ADV[cls].filter(a => !a.legacy || st.adv === a.id).map(a => '<button type="button" class="promo-card' + (st.adv === a.id ? ' cur' : '') + '" data-adv="' + a.id + '"' + ((S.mats.core || 0) < 1 || st.adv === a.id ? ' disabled' : '') + '><small>' + esc(a.path) + '</small><b>' + esc(a.name) + '</b><span>' + esc(a.desc) + '</span></button>').join('') + '</div><div class="row"><button type="button" class="btn" id="promo-x">先不要</button></div>';
    $('promo-x').onclick = () => { el.hidden = true; };
    $('hub-sheet').querySelectorAll('[data-adv]').forEach(b => { b.onclick = () => { S.mats.core--; st.adv = b.dataset.adv; el.hidden = true; R.hub(); flashMsg('轉職完成：' + R.ADV[cls].find(a => a.id === st.adv).name); }; });
  };
  document.querySelectorAll('[data-htab]').forEach(b => { b.onclick = () => R.hub(b.dataset.htab); });
  $('h-street').onclick = () => { R.save(); R.backToTown(); };
})(window.R);
