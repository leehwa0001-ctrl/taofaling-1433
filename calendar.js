// 討伐令 1433：日曆、瓦版（新聞）、每天的事件
// 曆法照《公會館員日誌》的天星十二宮曆：一年 365 日、從冬末月起算；一週 10 日（元素周日曆），水日、木日、凝日、息日是休息日。
// 遊戲從公元 2836 年冬凌月 12 日開始——和《公會館員日誌》東鶴篇的第一天同一天。
// 東鶴篇的大事照那邊的日期發生：造勢大會、退位大典（戒嚴）、暴風雪封路、城西遺跡事件（封鎖）、城西遺跡降為摩爾斯級重新開放。
// 去遺跡一趟會過一到三天；在宿屋睡一晚過一天。
(function (R) {
  const $ = id => document.getElementById(id);
  const MONTHS = [['冬末月', 29], ['春風月', 30], ['春花月', 30], ['春散月', 37], ['夏照月', 29], ['夏峰月', 25], ['夏閉月', 32], ['秋豐月', 35], ['秋收月', 25], ['秋結月', 30], ['冬凌月', 32], ['冬雪月', 31]];
  const WEEK = ['火日', '金日', '土日', '水日', '木日', '光日', '風日', '闇日', '凝日', '息日'], REST = ['水日', '木日', '凝日', '息日'];
  R.MONTHS = MONTHS; R.WEEK = WEEK;
  const dayIndex = (y, m, d) => { let n = (y - 1) * 365; for (let i = 0; i < m; i++) n += MONTHS[i][1]; return n + d - 1; };
  const START = dayIndex(2836, 10, 12);
  // 0～1 的固定亂數（同一天、同一件事，結果一樣）
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
  R.hash01 = hash;
  R.dateOf = day => {
    const n = START + day, y = Math.floor(n / 365) + 1; let r = n % 365, m = 0;
    while (r >= MONTHS[m][1]) { r -= MONTHS[m][1]; m++; }
    const d = r + 1, wd = WEEK[n % 10];
    return { day, y, m, d, wd, rest: REST.includes(wd), month: MONTHS[m][0], abs: n, season: m >= 10 || m === 0 ? '冬' : m <= 3 ? '春' : m <= 6 ? '夏' : '秋' };
  };
  R.today = () => R.dateOf((R.S && R.S.day) || 0);
  R.dateLabel = dd => { dd = dd || R.today(); return '公元 ' + dd.y + ' 年 ' + dd.month + ' ' + dd.d + ' 日・' + dd.wd; };
  R.shortDate = dd => { dd = dd || R.today(); return dd.month + ' ' + dd.d + ' 日・' + dd.wd; };
  R.absOf = (y, m, d) => dayIndex(y, m, d);
  // 存檔裡的世界資料（舊存檔也補上）
  R.ensureWorld = () => {
    const S = R.S; if (!S) return;
    if (S.day == null) S.day = 0;
    if (!S.seed) S.seed = Math.floor(Math.random() * 1e9);
    ['met', 'missed', 'lost', 'aff', 'talked', 'gifted', 'gifts', 'rel', 'evt', 'sil'].forEach(k => { S[k] = S[k] || {}; });
    S.jobs = S.jobs || []; S.offersTaken = S.offersTaken || {}; S.news = S.news || []; S.deeds = S.deeds || [];
    S.rep = S.rep || 0; S.fake = S.fake || 0; S.cards = S.cards || []; S.buff = S.buff || null;
    if (S.hour == null) S.hour = 8;   // 現在幾點（0～24）：daytime.js
  };
  R.dayRand = salt => hash((R.S ? R.S.seed : 1) + ':' + ((R.S && R.S.day) || 0) + ':' + salt);

  // ---------- 每天的事件 ----------
  const SEAL0 = dayIndex(2836, 10, 23), SEAL1 = dayIndex(2836, 10, 27), MORS = dayIndex(2836, 10, 28);
  R.eventsOf = dd => {
    const E = {}, a = dd.abs;
    if (a === dayIndex(2836, 10, 16)) E.rally = 1;          // 國民黨在西市口造勢遊行
    if (a === dayIndex(2836, 10, 17)) E.martial = 1;        // 退位大典：全城戒嚴
    if (a === dayIndex(2836, 10, 21)) E.blizzard = 1;       // 暴風雪：矮丘山口、北山山口封路
    if (a >= SEAL0 && a <= SEAL1) E.josaiSealed = 1;        // 城西遺跡事件：封鎖
    if (a >= MORS) E.josaiMors = 1;                         // 城西遺跡暫定降為摩爾斯級
    if (dd.wd === '凝日') E.market = 1;                      // 市集日：攤子打八折
    if (a > dayIndex(2836, 10, 29) && hash('tide:' + a) < 0.12) E.manaTide = 1;   // 魔力潮：遺跡生物強一點，寶箱好一點
    // 天氣：每天不一樣（照日期算，同一天每次看都一樣）。冬天是晴、陰、小雪、大雪；其他季節是晴、陰、雨
    const wx = hash('wx:' + a), winter = dd.season === '冬';
    E.weather = E.blizzard ? '暴風雪' : winter ? (wx < 0.3 ? '晴' : wx < 0.52 ? '陰' : wx < 0.8 ? '小雪' : '大雪') : (wx < 0.45 ? '晴' : wx < 0.75 ? '陰' : '雨');
    if (E.weather === '大雪') E.heavySnow = 1;
    return E;
  };
  R.eventsToday = () => R.eventsOf(R.today());
  // 遺跡的狀態跟著事件變
  R.applyEvents = () => {
    if (!R.S) return;
    const E = R.eventsToday(), josai = R.SITES.find(s => s.id === 'dh-josai'), kouzan = R.SITES.find(s => s.id === 'dh-kouzan');
    if (josai) {
      josai.grade = E.josaiMors ? 'mors' : 'amile';
      josai.sealed = E.josaiSealed ? '城西遺跡事件之後，公會封鎖了入口。調查委員會還在裡面。' : null;
      josai.desc = E.josaiMors ? '冬凌月 23 日的事件之後，遺跡暫定降為摩爾斯級，限有入場許可的勇者進入。調查點主任真壁還守在入口。' : '公會在入口設了調查點，調查點主任真壁每天派人把報告送回分館。最近遺跡裡的魔力濃度一直往上升，外圍第一層已經標出了十二處危險點。';
    }
    if (kouzan) kouzan.sealed = E.blizzard ? '暴風雪：北山山口封閉，今天上不去。' : null;
  };

  // ---------- 瓦版：照日期的新聞 ----------
  const k = (m, d) => dayIndex(2836, m, d);
  const SCRIPT = {
    [k(10, 12)]: [['東鶴日報', '國民黨的競選進入最後一週。西市口的看板貼滿了「東鶴的飯碗，東鶴人自己端」。'], ['公會東鶴分館', '近來外地勇者在城內屢遭騷擾。遇到請通報警衛，不要自己處理。']],
    [k(10, 13)]: [['治安', '昨夜新商區一名德克斯凡商行經理在回家路上遇刺身亡。目擊者說，刺客穿著勇者的裝束。'], ['公會警示', '有隊伍以「臨時搬運工」名義帶沒有身分的人進入遺跡，疑涉黑市人口販賣。在遺跡裡遇到，請記下對方的勇者證號碼。']],
    [k(10, 14)]: [['外電', '卡露大城邦・立爾卡露的教堂遺跡 20 層發生空間撕裂。勇者凱斯諾・翠迪托斯、艾芙蕾娜失聯。'], ['公會通緝', '「教派」的卡爾斯、莉莉亞娜在逃。兩人能竄改別人對他們的熟悉感，混進隊伍而不被察覺。']],
    [k(10, 15)]: [['東鶴日報', '昨日公會東鶴分館發生包裹爆炸。手法和 2737 年法蘭斯省分館的包裹案相似，總部不排除模仿犯。'], ['公會東鶴分館', '來源不明的包裹一律不代收。自稱消防、衛生檢查的人，沒有總部公函不得進入後場。']],
    [k(10, 16)]: [['東鶴日報', '國民黨今天在西市口舉行造勢大會，遊行隊伍經過公會門前。'], ['市井', '有人在西市口發傳單：「外人逐利、鄉土凋零」。']],
    [k(10, 17)]: [['號外', '今日皇嶺舉行昭皇 皇多尉・夕川 退位大典，由長子岸田繼位。東鶴全城戒嚴。'], ['公會東鶴分館', '本館收到署名「東鶴義勇」的恐嚇信，指名城內的外地勇者。外出請結伴。']],
    [k(10, 18)]: [['城西遺跡調查點', '遺跡內魔力濃度連日上升。調查點主任真壁每天派人把報告送回分館。']],
    [k(10, 19)]: [['北山礦坑', '德克斯凡礦務公司回報：礦用「爆裂核心」的盤點數量不符。']],
    [k(10, 20)]: [['城西遺跡調查點', '外圍第一層的危險點標記完成，勘查報告由護衛望月瀧送回分館。'], ['天候', '明日暴風雪，矮丘山口將封路。']],
    [k(10, 21)]: [['天候', '暴風雪。矮丘山口、北山山口全面封閉，北山礦坑今天不開放。']],
    [k(10, 22)]: [['城西遺跡調查點', '調查點附近連續兩晚出現不明人士：衣著整齊、態度有禮。事後，沒有人描述得出他的長相。']],
    [k(10, 23)]: [['號外', '城西遺跡魔力濃度異常，遺跡內發生爆炸。外圍的勇者與搬運工緊急撤離，公會大廳開放避難。城西遺跡即日起封鎖。']],
    [k(10, 24)]: [['號外', '新皇岸田第一道詔令：「嚴查東鶴義勇」。'], ['公會東鶴分館', '城西遺跡封鎖中。事件善後（勇者保險理賠、受災民眾救助金）由右側窗口承辦。']],
    [k(10, 25)]: [['公會東鶴分館', '受災民眾救助金今日起受理。']],
    [k(10, 26)]: [['東鶴日報', '德克斯凡礦務公司向公會總部遞交求償書。']],
    [k(10, 27)]: [['公會東鶴分館', '總部的城西遺跡事件調查委員會今日到館。']],
    [k(10, 28)]: [['公會東鶴分館', '城西遺跡重新開放，暫定降為摩爾斯級。要先有摩爾斯級委託的資格才能進去。']],
    [k(11, 6)]: [['外電', '卡塞爾維亞王國與凡尼特奧賽帝國在洛爾森簽下停火協議。公會副會長擔任見證人。']]
  };
  // 瓦版的天候欄：照當天真正的天氣寫
  const WX_NEWS = { '晴': '晴，北風。霜溪的冰又厚了一點。', '陰': '整天陰陰的，看不到太陽。', '小雪': '細雪斷斷續續地下。路面有點滑。', '大雪': '大雪。走城外的路要小心。', '暴風雪': '暴風雪。', '雨': '下雨。積雪化成了泥水。' };
  const POOL = {
    weather: ['晴，北風。霜溪的冰又厚了一點。', '整天陰陰的，傍晚下起細雪。', '大雪。西橋的整修又延期了。', '天氣放晴。北渠上有孩子在溜冰，被衛兵趕下來。', '冷得刺骨。菅婆婆的炭爐前排了長長的隊。'],
    town: ['糰子還是兩費拉一串。菅婆婆說米價再漲就撐不住了。', '新商區又開了一家德克斯凡的店，賣會自己發亮的燈。', '西市兌換所公告：昭旭舊銅錢的兌換比率再次下調。', '湯山村的溫泉旅館說，今年冬天的客人比往年少。', '北郊農舍又被冰鼬偷了雞。', '驛站新進了一台德克斯凡的貨車，車伕還在學怎麼開。'],
    guild: ['公會提醒：私人委託不受公會保障。被騙了，公會也沒辦法。', '公會提醒：在遺跡裡遇到別的隊伍，結伴前先看一眼對方的勇者證。', '公會提醒：持註銷勇者證（HR-2819-7302、HR-2824-0517、HR-2833-2208）的人，請通報。', '公會東鶴分館：登記處七時開始受理。', '公會東鶴分館：資料室的遺跡生物圖鑑新增了幾頁。'],
    ruin: ['霜溪石窟今天根童特別多，採藥的民眾說被圍著吐了一身種子。', '北山礦坑又挖到新的礦脈，礦殼也跟著多了起來。', '有勇者在城西遺跡附近看到一個衣著整齊的人，回來卻說不出他長什麼樣子。', '遺跡裡的寶箱，關上之後會慢慢「刷新」。人越多刷得越慢。', '有人說，在遺跡裡看見佩特拉核心的眼睛跟著人轉。'],
    world: ['外電：德克斯凡的最新戰鬥機甲又傳出失控事故，官方說是科研疏忽。', '外電：法蘭克法蘭斯聯邦增兵東部邊境。', '外電：獵妖同盟發布新的懸賞名單。', '外電：阿卡迪亞聯邦的報曼谷分館修繕完成。', '外電：卡露大城邦・立爾卡露的教堂遺跡重新開放。']
  };
  // 每天的瓦版：照日期的大事＋幾則日常＋你自己的事
  R.newsOf = dd => {
    const out = (SCRIPT[dd.abs] || []).map(([t, b]) => ({ t, b, big: 1 }));
    const pick = (list, salt) => list[Math.floor(hash(salt + ':' + dd.abs) * list.length)];
    out.push({ t: '天候', b: WX_NEWS[R.eventsOf(dd).weather] || pick(POOL.weather, 'w') });
    if (out.length < 3) out.push({ t: '市井', b: pick(POOL.town, 't') });
    if (out.length < 4) out.push({ t: pick(['公會', '遺跡', '外電'], 'kind'), b: pick(hash('k2:' + dd.abs) < 0.4 ? POOL.guild : hash('k3:' + dd.abs) < 0.5 ? POOL.ruin : POOL.world, 'p') });
    const E = R.eventsOf(dd);
    if (E.market) out.push({ t: '市集日', b: '今天是凝日，西市口的攤子打八折。' });
    if (E.manaTide) out.push({ t: '公會警示', b: '魔力潮：今天各地遺跡的魔力濃度偏高。遺跡生物比較兇，寶箱也比較好。' });
    return out;
  };
  // 你做過的事，隔天會上瓦版
  R.addDeed = text => { R.ensureWorld(); R.S.deeds.push({ day: R.S.day + 1, b: text }); if (R.S.deeds.length > 30) R.S.deeds.shift(); };
  R.newsSheet = () => {
    R.ensureWorld();
    const dd = R.today(), today = R.newsOf(dd).concat(R.S.deeds.filter(x => x.day === dd.day).map(x => ({ t: '東鶴日報', b: x.b })));
    const past = [1, 2, 3].map(i => R.S.day - i).filter(d => d >= 0).map(d => { const p = R.dateOf(d), list = R.newsOf(p).filter(x => x.big); return list.length ? '<h3>' + R.esc(R.shortDate(p)) + '</h3>' + list.map(x => '<p class="note"><b>' + R.esc(x.t) + '</b>　' + R.esc(x.b) + '</p>').join('') : ''; }).join('');
    R.sheet('<p class="kicker">瓦版・東鶴日報</p><h2>' + R.esc(R.dateLabel(dd)) + '</h2>' + today.map(x => '<p' + (x.big ? ' class="hand"' : '') + '><b>' + R.esc(x.t) + '</b>　' + R.esc(x.b) + '</p>').join('') + (past ? '<h3 class="kicker">前幾天的大事</h3>' + past : ''),
      '<div class="row"><button type="button" class="btn pri" id="nw-x">好</button></div>');
    $('nw-x').onclick = R.closeSheet;
  };

  // ---------- 過日子 ----------
  R.onNewDay = () => {
    const S = R.S, dd = R.today(), prev = R.dateOf(S.day - 1);
    S.talked = {}; S.gifted = {};
    // 昨天以黑影出現、你沒去搭話的人：錯過一次（錯過兩次就再也不會出現）
    Object.keys(S.sil).forEach(id => { if (S.sil[id] === prev.day && !S.met[id]) { S.missed[id] = (S.missed[id] || 0) + 1; if (S.missed[id] >= 2) S.lost[id] = true; } });
    if (R.ensureRoster) R.ensureRoster(true);
    if (R.jobsNewDay) R.jobsNewDay(dd);
    if (S.buff && S.buff.until < S.day) S.buff = null;
    R.applyEvents();
  };
  R.advanceDays = n => {
    R.ensureWorld();
    for (let i = 0; i < n; i++) { R.S.day++; R.onNewDay(); }
    R.save();
  };
  // 在宿屋睡一晚
  R.sleep = () => {
    R.ensureWorld();
    R.fade(() => {
      R.advanceDays(1);
      if (R.W.inside && R.refreshInterior) { const k = R.W.inside.kind; R.enterTownNow(R.W.town.from); if (k) { R.W.P.x = R.W.town.innPos ? R.W.town.innPos[0] : R.W.P.x; } }
      else R.enterTownNow(R.W.town ? R.W.town.from : null);
      R.banner(R.shortDate(), '睡了一晚。' + (R.eventsToday().market ? '今天是市集日。' : R.today().rest ? '今天是休息日，街上人比較多。' : ''));
    });
  };
})(window.R);
