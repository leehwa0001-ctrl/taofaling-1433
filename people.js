// 討伐令 1433：城裡的人（劇情人物、固定日期出現的人）
// - 第一次遇到重要的人，只看得到黑色的剪影「？？？」。過去說話就認識了；那一天沒說話就錯過一次——錯過兩次，就再也不會遇到。
// - 每個人有自己的行程（哪幾天、在哪裡、多少機率在），照《公會館員日誌》的東鶴篇（2836 冬凌月 12～29 日）排：
//   瀧在城西遺跡當調查隊的護衛、20 日送勘查報告回分館、23 日撤離時折回去救人受了傷；楚璐在調查點和分館之間騎重機送東西，29 日問你「我要往哪裡騎？」之後離開東鶴；
//   阿杏冬凌月十幾日到公會登記，16 日接第一件任務；雷諾天天在二號窗口排隊。（瀧的段位照作者 2026-10-01 的決定：特攻段。雷諾是術士。）
// - 好感度 0～10：每天第一次說話 +1、送禮（每天一次）看喜不喜歡 +0～+3。到 3、6、9 會有事件。成年的劇情人物到 9 可以走感情線（純愛），阿杏只當朋友。
// - 好感度到 3 以上，可以邀請一起下遺跡（不收錢，報酬照公會規矩分）。
(function (R) {
  const $ = id => document.getElementById(id);
  const esc = s => R.esc(s);
  const W = R.W;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const k = (m, d, y) => R.absOf(y || 2836, m, d);
  const S = () => R.S;
  const aff = id => (S().aff[id] || 0);
  // 好感：越往後每一格要的進度越多（2026-10-04 作者：戀人的好感不要累積這麼快）。說話一天 1 點、送禮 0～3 點，進度存在 s.affX
  const COST = a => (a < 3 ? 1 : a < 6 ? 2 : 5);
  const gain = (id, pts) => { const s = S(); s.affX = s.affX || {}; let x = (s.affX[id] || 0) + pts, a = aff(id); while (a < 10 && x >= COST(a)) { x -= COST(a); a++; } s.affX[id] = a >= 10 ? 0 : x; s.aff[id] = a; return a; };
  R.personExtras = R.personExtras || [];   // 對話畫面多的按鈕：{ html(id), bind(id) }（takiteach.js）

  // ---------- 人 ----------
  // spot：town:地點 或 室內的種類:位置編號；sched(dd, E)：今天在哪裡（null＝不在東鶴／不出門）；chance：出現的機率
  const P = {
    taki: {
      name: '望月瀧', short: '瀧', race: 'human', adult: 1, romance: 1, recruit: 1, sil: 1, cls: 'blade', weapon: 'katana', lv: 40, card: 'HR-2830-3317', rank: '特攻段',
      look: { top: '#26262C', hair: '#E6EAF0', cloak: '#1E1E24', hs: 'ponytail', skin: '#F4E2D2', eye: '#8A929C', pants: '#1E1E24', sig: 'taki' },   // 照作者的設定圖（storylooks.js）
      likes: { strings: 3, tackle: 2, fish: 1, dango: 1, dorayaki: 1, tea: 1 },
      hint: '南橋下，有人在釣魚。',
      sched: (dd, E) => {
        const a = dd.abs;
        if (a < k(10, 20)) return E.blizzard ? null : 'town:survey';
        if (a === k(10, 20)) return 'guild:0';
        if (a === k(10, 21)) return 'town:dojo';
        if (a === k(10, 22)) return 'town:survey';
        if (a >= k(10, 23) && a <= k(10, 26)) return a === k(10, 25) ? 'guild:0' : 'town:dojo';   // 撤離時折回去救人，受了傷
        if (dd.wd === '水日' || dd.wd === '凝日') return 'town:nanbashi';
        if (dd.wd === '木日' || dd.wd === '息日') return 'town:dojo';
        return R.hash01('taki' + a) < 0.5 ? 'guild:0' : 'tavern:1';
      },
      chance: 0.75, busy: dd => dd.abs >= k(10, 23) && dd.abs <= k(10, 26) ? '瀧的傷還沒好。' : dd.abs < k(10, 21) ? '瀧在城西遺跡當調查隊的護衛。' : null,
      talk: [
        ['……', '瀧正在整理纏在一起的釣線，見你過來，挪開了腳邊的布包。', '這裡再打一個結。不然一拉就鬆了。'],
        ['你來了。今天不用接任務？', '冬末再去釣吧。那時候比較容易上鉤。', '城西那邊，我是去當護衛的。調查的事要問真壁主任。'],
        ['上次那條太小，我又放回去了。', '「有空去釣魚嗎？我可以多帶一根竿子。」', '雷諾連買釣鉤都要比價。我等到店快關了，他還在算。'],
        ['嗯？你剛才說什麼？我在看這個結。', '瀧打開裝著銅鑼燒的油紙包。「要不要吃？照姊姊教的做的。奶奶說糖放太少了。」', '你下次出發前叫我一下。我先看看有沒有空。']
      ]
    },
    reno: {
      name: '雷諾・雷提歐', short: '雷諾', race: 'dog', adult: 1, romance: 1, recruit: 1, sil: 1, cls: 'mage', weapon: 'orb', lv: 16, card: '（冒險段・灰鐵階）',
      look: { top: '#8A9A2E', hair: '#B7874E', cloak: '#7A8A28', hs: 'short', skin: '#EFCFAE', eye: '#6A9A2A', pants: '#5A4030', sig: 'reno' },
      likes: { notebook: 3, dango: 2, fish: 1, tea: 1, dorayaki: 1 },
      hint: '公會的大廳裡，有個人一直在小冊子上記東西。',
      sched: (dd, E) => {
        const a = dd.abs;
        if (a === k(10, 17) || a === k(10, 24)) return null;
        if (dd.rest) return R.hash01('reno' + a) < 0.6 ? 'town:market' : 'tavern:2';
        return 'guild:1';
      },
      chance: 0.8,
      talk: [
        ['「你好。等我一下，這張紙一直掉。」雷諾把皮夾裡露出的紙條折好，塞了回去。', '找我有事？如果是找同行的，我也是勇者。', '糰子一串兩費拉。我剛剛問的，你要買的話，帶剛好的錢就行。'],
        ['房東要看我的評分，我沒給。窗口也說了，那份證明只給本人。', '「等一下……少一枚。喔，在這裡。」雷諾從袋子的夾層翻出硬幣。', '房東又來問我的分數了。'],
        ['這本不能借，是魔導書。後面記價錢的幾頁可以看，別把我的書籤弄掉。', '雷諾翻著冊子找了一會兒。「我明明記了……你等等，不是在這頁。」', '報酬有算不清楚的就拿來。不過委託書也要帶，光說總數我算不了。'],
        ['「我剛剛還在想你會不會來。要一起吃點東西嗎？」', '要記價錢？我找張紙給你。別撕這本，後面我還要用。', '下次要去哪裡？早點跟我說，我想先查一下。']
      ]
    },
    churu: {
      name: '楚璐・洛朗', short: '楚璐', race: 'human', adult: 1, romance: 1, recruit: 1, sil: 1, cls: 'gunner', weapon: 'rifle', lv: 14, card: 'HR-2830-1192',
      look: { top: '#16161A', hair: '#6E4E30', cloak: '#16161A', hs: 'bob', skin: '#F1C9A5', eye: '#3A6AC8', pants: '#2E4A6E', sig: 'churu' },
      likes: { oil: 3, parts: 3, rose: 2, dango: 1 },
      hint: '北門外，有人在擦一台兩輪的機車。',
      sched: (dd, E) => {
        const a = dd.abs;
        if (a > k(10, 29) && a < k(1, 1, 2837)) return null;   // 往外地騎走了
        if (a >= k(1, 1, 2837)) return R.hash01('churu' + a) < 0.25 ? 'town:northGate' : null;   // 偶爾回來
        if (a === k(10, 29)) return 'town:northGate';
        if (a >= k(10, 23)) return 'guild:2';
        return R.hash01('churu' + a) < 0.5 ? 'town:survey2' : 'town:northGate';
      },
      chance: 0.75,
      talk: [
        ['嗨，要出門？等我一下，我把這邊擦完。', '「等一下，我手上有油。」楚璐找出一塊布，把指縫擦乾淨才轉向你。', '這台？從大陸運過來的重機。在東鶴，路比我的老家平。'],
        ['我每天在調查點和分館之間來回騎。真壁主任的報告，都是我送的。', '昨天有個小孩想摸車。我才剛熄火，嚇得趕快攔住他，排氣管還燙著呢。', '哪裡常鬆就畫個記號啊。我都這樣，不然拆開以後又忘了原本要修哪裡。'],
        ['這裡忙完以後，我想再往外騎一段。你有沒有去過哪裡，覺得還不錯的？', '我老家那邊的口音，你聽得出來嗎？', '今天總算找到那個異音了。一顆螺絲而已，害我拆了半天。'],
        ['「要不要出去繞一圈？等我把安全帽拿來。」', '要坐後座嗎？等一下，我把那頂安全帽找出來。明明放在這裡的。', '我今天不趕時間，可以慢慢騎。']
      ]
    },
    achan: {
      name: '阿杏', short: '阿杏', race: 'human', adult: 0, romance: 0, recruit: 1, sil: 1, cls: 'blade', weapon: 'katana', lv: 3, card: 'HR-2836-7781', onlyHamilia: 1,
      look: { top: '#7A5B2E', hair: '#3A2A1C', cloak: '#5A4A3A', hs: 'ponytail', skin: '#F1C9A5', eye: '#2A2420' },
      likes: { dango: 3, wrap: 2, dorayaki: 2, notebook: 1 },
      hint: '望月家道場的院子裡，有人在練步法。',
      sched: (dd, E) => {
        const a = dd.abs;
        if (a < k(10, 13)) return 'town:dojo';
        if (a <= k(10, 16)) return 'guild:3';
        if (a === k(10, 23) || a === k(10, 24)) return null;
        return dd.rest ? 'town:dojo' : R.hash01('achan' + a) < 0.5 ? 'town:plaza' : 'guild:3';
      },
      chance: 0.85, busy: dd => dd.abs < k(10, 17) ? '阿杏還沒正式接過任務（公會才剛登記）。' : null,
      talk: [
        ['步法……右腳又偏外了。', '你也是勇者？我才剛開始。公會那些表格，我每次都要問館員怎麼填。', '望月姊姊好厲害，聽說是總部的人了。'],
        ['拿到報酬就想去買糰子。可是我娘一定會問錢花去哪裡了。', '館員說，升不升階沒有期限，不用急。', '我娘說我才十七歲，先把功課顧好。我又沒說不念了。'],
        ['新武館教側步，道場也教。我以為差不多，結果一練就被說腳放錯了。', '你下遺跡的時候，腳步是怎麼踩的？', '今天有一回沒被打到。只有一回啦，後面又輸了。'],
        ['「你要不要吃？我買了兩串，結果剛剛又吃了銅鑼燒。」', '下次有空，再陪我練一下好不好？你不用讓我。', '下次也帶我去吧——哈米莉亞級的就好，我答應過師父。']
      ]
    },
    // ---- 城裡固定的人（不用剪影） ----
    iwa: { name: '望月巖', short: '巖', race: 'human', look: { top: '#4A4A54', hair: '#4A4A4A', cloak: '#3A3A44', hs: 'crop' }, sched: (dd) => (dd.rest ? 'town:dojoGate' : null), chance: 0.8, likes: { tea: 2, dango: 1 },
      talk: [['「找瀧？她不一定在。你有事就先跟我說。」', '「先別踩進去，地板剛擦過。鞋子放旁邊就好。」', '「瀧那孩子……很少回家吃飯。」'], ['「你先慢慢做一遍，我看看。不要一拿刀就急著砍。」', '「新武館的器械是不錯。有沒有用，得看你怎麼練。」']] },
    kenji: { name: '小健', short: '小健', race: 'human', look: { top: '#5A6A7A', hair: '#2A2420', cloak: '#3A4A5A', hs: 'short' }, sched: (dd) => (dd.rest ? 'town:sugaSide' : null), chance: 0.7, likes: { dango: 0, parts: 2, notebook: 1 },
      talk: [['「奶奶的攤子，休息日我會來幫忙。」', '「米又漲了，奶奶還是不肯改價錢。你看，一串還是兩費拉。」'], ['「以前常常東西不見……奶奶說是貓。」']] },
    laozhou: { name: '老周', short: '老周', race: 'human', look: { top: '#5A5040', hair: '#D8D2C4', cloak: '#4A4030', hs: 'crop' }, sched: (dd) => (dd.wd === '息日' ? null : 'guild:4'), chance: 0.9, likes: { tea: 2, sake: 1 },
      talk: [['（打了一個大哈欠。）', '「新人的考核在後院。站樁、體能、過兩招。」'], ['「考完別急著跑。哪裡受了傷要講，我還得記。」', '「昨天收工太晚了。你等我喝口茶。」']] },
    clerk: { name: '二號窗口的新館員', short: '新館員', race: 'human', look: { top: '#2E4A34', hair: '#2A2420', cloak: '#2E4A34', hs: 'short' }, sched: (dd) => (dd.abs >= k(10, 12) && dd.abs <= k(10, 29) && !dd.rest ? 'guild:5' : null), chance: 1,
      talk: [['「下一位。勇者證請放在櫃檯上。」', '「證件借我核對一下。不是本人的，我不能辦。」'], ['「最近有騷擾外地勇者的通報。要出城的話，盡量找人同行。」']] },
    // ---- 城裡角落、固定日子出現的人 ----
    merchant: { name: '旅行商人', short: '旅行商人', race: 'fox', look: { top: '#6A4A2E', hair: '#D2692A', cloak: '#4A3424', hs: 'bun' }, sched: (dd) => (dd.wd === '凝日' || dd.wd === '光日' ? 'town:plazaW' : null), chance: 0.9, shop: 'merchant',
      talk: [['「從西岸來的，下一站皇嶺。要看看貨嗎？」']] },
    hooder: { name: '後巷的斗篷商', short: '斗篷商', race: 'phantom', look: { top: '#2A2430', hair: '#E6E0F2', cloak: '#1A1420', hs: 'long' }, sched: (dd) => (dd.wd === '闇日' || dd.wd === '水日' || dd.wd === '風日' ? 'town:alley' : null), chance: 0.85, shop: 'hood',
      talk: [['「兜帽、斗篷。遮臉、遮角、遮耳朵都行。」', '「戒嚴那天別戴，衛兵會叫你拿下來。」']] },
    biwa: { name: '琵琶法師', short: '琵琶法師', race: 'human', look: { top: '#3A3A44', hair: '#C8B8A0', cloak: '#2A2A30', hs: 'bald' }, sched: (dd) => (dd.wd === '息日' ? 'tavern:3' : null), chance: 0.95,
      talk: [['（撥了一下琵琶。）「遺跡是佩特拉長出來的城。它會呼吸、會長、會痛。」', '「打破它的東西，它就會看著你——牆上的眼睛，就是它在看。」'], ['「斷尾的遺跡，會把受傷的那一節切掉。困在裡面的人……就跟著那一節一起被吞了。」', '「碰上驅逐，核心會親自追來。別以為跑到另一間就沒事了。」'], ['「卡索級，一千五百年只出現過七次。」', '「坎賽特級……那種東西，只有會長親自去。」']] },
    fortune: { name: '算命的老婆婆', short: '算命的', race: 'human', look: { top: '#4A2A4A', hair: '#E8E4F0', cloak: '#3A1A3A', hs: 'bun' }, sched: (dd) => (dd.wd === '闇日' || dd.wd === '土日' ? 'town:alley2' : null), chance: 0.9, fortune: 1,
      talk: [['「十費拉，看看你下一趟會遇到什麼。」']] },
    io: { name: '伊歐・月溪・白樺', short: '伊歐', race: 'elf', adult: 1, recruit: 1, sil: 1, cls: 'archer', weapon: 'longbow', lv: 10, card: 'HR-2834-5521',
      look: { top: '#3E5A36', hair: '#E9D8A6', cloak: '#2E4A2E', hs: 'long', eye: '#3E6A3E' }, likes: { tea: 2, rose: 2, notebook: 1 },
      hint: '驛站裡，有個背著長弓的人對著地圖發呆。',
      sched: (dd) => (R.hash01('io' + dd.abs) < 0.45 ? 'station:0' : 'tavern:0'), chance: 0.55,
      talk: [['「我剛才把圖拿反了。難怪走那麼久，驛站一直在另一邊。」', '「我是從大陸西邊來的。昨天問路，對方先問了半天我的耳朵，最後也沒告訴我怎麼走。」'], ['「你要下遺跡的話，我可以一起去。弓還算準。」'], ['「這次我自己找到驛站了，沒繞路。回去應該也沒問題。」']] },
    sou: { name: '朝霧・颯', short: '颯', race: 'wolf', adult: 1, recruit: 1, sil: 1, cls: 'gunner', weapon: 'shotgun', lv: 12, card: 'HR-2831-0904',
      look: { top: '#5A4A3A', hair: '#6D6A66', cloak: '#3A3A30', hs: 'spiky', eye: '#C8A03A' }, likes: { fish: 2, oil: 2, dango: 1 },
      hint: '北門的城牆邊，有人靠著牆在擦槍。',
      sched: (dd) => (dd.wd === '火日' || dd.wd === '金日' || dd.wd === '光日' ? 'town:wallN' : null), chance: 0.7,
      talk: [['「北郊的冰鼬又在偷雞。我只是順手打一打。」', '「有些店看到我是狼人就不肯賣。算了，我去別家。」'], ['「一起下去？報酬照公會的規矩，我不多拿。」'], ['「你看前面就好，後面有動靜我會叫你。」']] },
    karls: { name: '？？？', short: '？？？', race: 'human', look: { top: '#1C1C24', hair: '#1C1C24', cloak: '#1C1C24', hs: 'short' }, sched: (dd) => (dd.abs >= k(10, 17) && dd.abs <= k(10, 22) ? 'town:survey3' : null), chance: 0.6, alwaysSil: 1,
      talk: [['一位衣著整齊、很有禮貌的人向你點頭致意。', '「魔力計的數字，今天又往上跳了呢。」', '（他走了之後，你怎麼也想不起他的長相。）']] }
  };
  R.PEOPLE = P;
  // 城裡的位置（示意圖座標）、朝向
  const SPOTS = R.CITY ? R.CITY.SPOTS : {
    nanbashi: [578, 917, 0], dojo: [762, 722, Math.PI], dojoGate: [778, 750, 0], plaza: [586, 664, 0], plazaW: [566, 628, 0], market: [730, 646, Math.PI],
    northGate: [622, 420, 0], wallN: [560, 410, 0], survey: [186, 466, Math.PI * 0.8], survey2: [196, 470, Math.PI], survey3: [160, 470, Math.PI * 0.5],
    alley: [430, 562, 0], alley2: [470, 562, Math.PI], sugaSide: [652, 672, 0]
  };
  const ROOM_SPOTS = {
    guild: [[-5.2, -2.6, Math.PI / 2], [2.6, -3.2, -Math.PI / 2], [2.8, 1.6, Math.PI], [-3.4, 4.8, 0], [-13.6, 3.0, Math.PI / 2], [3.4, -7.3, 0]],
    tavern: [[5.2, 3.6, Math.PI], [-2.6, -1.5, 0], [8, 5.8, Math.PI], [1.6, 6.3, 0]],
    station: [[-3, 2.4, Math.PI], [3, 3.9, Math.PI]]
  };

  // ---------- 今天誰在哪裡 ----------
  const todayAt = id => {
    const p = P[id], s = S(), dd = R.today(), E = R.eventsToday();
    if (!p.sched) return null;
    if (s.lost[id] && !s.met[id]) return null;
    if (id === 'churu' && s.evt.churuLeft && dd.abs <= k(1, 1, 2837)) return null;
    const spot = p.sched(dd, E); if (!spot) return null;
    if (R.hash01(s.seed + ':' + id + ':' + dd.abs) > (p.chance || 1)) return null;
    // 戒嚴：大家都不太出門
    if (E.martial && spot.startsWith('town:') && R.hash01('m' + id + dd.abs) < 0.6) return null;
    if (E.blizzard && spot.startsWith('town:') && !['dojo', 'dojoGate'].includes(spot.slice(5))) return null;
    return spot;
  };
  R.personToday = todayAt;
  // 認識了沒有：還沒說過話的重要人物是黑色剪影
  const isSil = id => P[id].alwaysSil || (P[id].sil && !S().met[id]);
  const displayName = id => (isSil(id) ? '？？？' : P[id].name);
  const lookOf = (id, sil) => Object.assign({}, P[id].look, { race: P[id].race, weapon: P[id].weapon || null, shield: false, sil: !!sil });

  // ---------- 放進城裡、屋裡 ----------
  R.placePeople = (kind, api) => {
    const s = S(); if (!s) return;
    R.ensureWorld();
    Object.keys(P).forEach(id => {
      if ((s.party || []).some(m => m.story === id)) return;   // 已經在隊伍裡跟著你：不要再照行程放一個（作者 2026-10-04 回報：怎麼變兩個了）
      const at = todayAt(id); if (!at) return;
      const [where, idx] = at.split(':');
      if (kind === 'town' && where === 'town') {
        const sp = SPOTS[idx]; if (!sp) return; const [x, z] = api.spot(sp[0], sp[1]);
        const n = api.npc(x, z, lookOf(id, isSil(id)), displayName(id), sp[2], P[id].weapon || null, P[id].cls || 'warrior');
        n.person = id; n.near = 1;
        const it = api.inter(x, z, 2.0, '', () => meet(id), { follow: n, person: id }); Object.defineProperty(it, 'label', { get: () => '和' + displayName(id) + '說話' });
        if (id === 'churu') { const bk = api.SB, G3 = api.G3, L = api.lam; bk.add(G3.box, L('#1C1C24', { tex: 0 }), x + 1.6, 0.7, z, 0.4, 0.5, 1.8); [-0.75, 0.75].forEach(o => bk.add(G3.cyl, L('#2A2A2A', { tex: 0 }), x + 1.6, 0.42, z + o, 0.84, 0.18, 0.84, 0, 0, Math.PI / 2)); bk.add(G3.box, L('#C8323A', { tex: 0 }), x + 1.6, 1.05, z - 0.3, 0.32, 0.25, 0.8); api.block(x + 1.3, x + 1.9, z - 1, z + 1, 'deco'); }
      } else if (where === kind && api.ins) {
        const sp = (ROOM_SPOTS[kind] || [])[+idx]; if (!sp) return;
        const n = api.npc(sp[0], sp[1], sp[2], { cls: P[id].cls || 'warrior', weapon: P[id].weapon || null, name: displayName(id), look: lookOf(id, isSil(id)) });
        n.person = id; if (P[id].sil && !s.met[id]) s.sil[id] = s.day;   // 走進這個房間就算「看到了」
        if (kind === 'tavern' && idx !== '3') { n.h.sit = true; n.sitting = true; }
        const it = api.inter(sp[0] + Math.sin(sp[2]) * 1.0, sp[1] + Math.cos(sp[2]) * 1.0, 1.8, '', () => meet(id));
        Object.defineProperty(it, 'label', { get: () => '和' + displayName(id) + '說話' });
      }
    });
    R.save();
  };

  // ---------- 說話、送禮、邀請 ----------
  const tierOf = a => (a >= 9 ? 3 : a >= 6 ? 2 : a >= 3 ? 1 : 0);
  const meet = id => {
    const p = P[id], s = S();
    if (p.alwaysSil) { R.townTalk('？？？', p.talk[0]); s.met.karlsSeen = 1; R.save(); return; }
    const first = !s.met[id];
    if (first) { s.met[id] = s.day; delete s.sil[id]; reveal(id); }
    if (id === 'churu' && R.today().abs === k(10, 29) && !s.evt.churuBye) { s.evt.churuBye = s.day; R.save(); churuBye(); return; }
    if (s.talked[id] !== s.day && p.romance != null) { s.talked[id] = s.day; gain(id, 1); }
    else if (s.talked[id] !== s.day) s.talked[id] = s.day;
    R.save();
    if (eventDue(id)) { runEvent(id); return; }
    sheet(id, first);
  };
  const reveal = id => { const lists = [W.town && W.town.npcs, W.inside && W.inside.npcs]; lists.forEach(L => (L || []).forEach(n => { if (n.person === id) { R.spriteLook(n.h, lookOf(id, false)); n.name = P[id].name; } })); };
  const sheet = (id, first) => {
    const p = P[id], s = S(), a = aff(id), lines = p.romance == null ? p.talk[Math.floor(R.hash01(id + s.day + 'v') * p.talk.length)] : p.talk[Math.min(p.talk.length - 1, tierOf(a))], line = lines[Math.floor(R.hash01(id + s.day) * lines.length)];
    const inParty = (s.party || []).some(m => m.story === id), can = p.recruit && a >= 3 && !inParty, busy = p.busy ? p.busy(R.today()) : null;
    const giftable = Object.keys(s.gifts || {}).filter(g => s.gifts[g] > 0);
    const rel = s.rel[id] === 'lover' ? '<span class="tag gold">戀人</span>' : s.rel[id] === 'friend' ? '<span class="tag">好朋友</span>' : '';
    R.sheet('<p class="kicker">' + (first && p.sil ? '第一次見面' : (p.rank ? esc(p.rank) + '・' : '') + esc(R.RACES[p.race] ? R.RACES[p.race].name : '')) + '</p><h2>' + esc(p.name) + ' ' + rel + '</h2>'
      + (first && p.sil ? '<p class="hand">你們互相報了名字。對方是' + esc(p.name) + '。</p>' : '')
      + '<p>' + esc(line) + '</p>'
      + (p.romance != null ? '<p class="note">好感 ' + '♥'.repeat(Math.ceil(a / 2)) + '♡'.repeat(5 - Math.ceil(a / 2)) + '（' + a + '／10' + (a < 10 ? '・下一格 ' + ((s.affX || {})[id] || 0) + '／' + COST(a) : '') + '）' + (s.gifted[id] === s.day ? '・今天已經送過禮了' : '') + '</p>' : '')
      + (busy && p.recruit ? '<p class="note">' + esc(busy) + '</p>' : ''),
      '<div class="row">' + (p.romance != null && giftable.length && s.gifted[id] !== s.day ? '<button type="button" class="btn" id="pp-gift">送禮</button>' : '')
      + (p.shop ? '<button type="button" class="btn pri" id="pp-shop">看看貨</button>' : '') + (p.fortune ? '<button type="button" class="btn pri" id="pp-fort">算一下（10 費拉）</button>' : '')
      + (can ? '<button type="button" class="btn pri" id="pp-inv"' + (s.party.length >= R.PARTY_MAX ? ' disabled' : '') + '>邀請一起下遺跡' + (s.party.length >= R.PARTY_MAX ? '（隊伍滿了）' : '') + '</button>' : '')
      + (inParty ? '<button type="button" class="btn" id="pp-bye">請' + esc(p.short) + '先離隊</button>' : '')
      + R.personExtras.map(x => (x.html && x.html(id)) || '').join('')
      + '<button type="button" class="btn" id="pp-x">好</button></div>');
    $('pp-x').onclick = R.closeSheet;
    R.personExtras.forEach(x => { try { x.bind && x.bind(id); } catch (e) { console.warn('[people]', e); } });
    if ($('pp-gift')) $('pp-gift').onclick = () => giftSheet(id);
    if ($('pp-shop')) $('pp-shop').onclick = () => (p.shop === 'hood' ? hoodShop() : merchantShop());
    if ($('pp-fort')) $('pp-fort').onclick = fortune;
    if ($('pp-inv')) $('pp-inv').onclick = () => invite(id);
    if ($('pp-bye')) $('pp-bye').onclick = () => { const i = s.party.findIndex(m => m.story === id); if (i >= 0) s.party.splice(i, 1); R.save(); R.closeSheet(); R.toast(p.short + '離開了隊伍。'); refreshAllies(); };
  };
  const giftSheet = id => {
    const p = P[id], s = S();
    R.sheet('<p class="kicker">送禮</p><h2>送什麼給' + esc(p.short) + '？</h2><div class="recipes">' + Object.keys(s.gifts).filter(g => s.gifts[g] > 0).map(g => '<div class="recipe"><b>' + esc(R.GIFTS[g].name) + ' ×' + s.gifts[g] + '</b><small>' + esc(R.GIFTS[g].desc) + '</small><button type="button" class="btn pri" data-give="' + g + '">送</button></div>').join('') + '</div>', '<div class="row"><button type="button" class="btn" id="gf-x">算了</button></div>');
    $('gf-x').onclick = () => sheet(id);
    document.querySelectorAll('[data-give]').forEach(b => { b.onclick = () => {
      const g = b.dataset.give; s.gifts[g]--; s.gifted[id] = s.day; const v = (p.likes || {})[g] != null ? p.likes[g] : 0, pts = v >= 3 ? 3 : v === 2 ? 2 : v === 1 ? 1 : 0;
      gain(id, pts); R.save();
      R.townTalk(p.short, [pts >= 3 ? reactLove(id, g) : pts === 2 ? '「謝謝，這個我喜歡。」' : pts === 1 ? '「謝謝你。」' : '「謝謝，我收下了。」', '（好感的進度 ' + (pts ? '+' + pts : '沒有變') + '）']);
    }; });
  };
  const reactLove = (id, g) => ({ taki: { strings: '「三味線的弦？謝謝，正好可以換。」瀧把包裝折好，收進外衣裡。「今晚試試看。」', tackle: '「這個大小剛好。我留著，下次釣魚用。」' }, reno: { notebook: '「新的冊子？這個紙比較厚，背面也能寫。謝謝你。」' }, churu: { oil: '「喔，這種我有在用！謝啦，我正想找時間去買。」', parts: '「這個我收下了。等我拆開看看尺寸，應該用得上。」' }, achan: { dango: '「糰子！給我的嗎？」阿杏接過去，先咬了一口才想起來說謝謝。' } }[id] || {})[g] || '「謝謝，讓你破費了。」';
  const invite = id => {
    const p = P[id], s = S();
    if (s.party.length >= R.PARTY_MAX) return;
    const lv = Math.max(id === 'taki' ? 15 : 1, Math.min(p.lv, s.classes[s.cls].lv + (id === 'taki' ? 12 : 2)));   // 瀧是特攻段：比你高很多（taki.js）
    s.party.push({ id: 'p-' + id, story: id, name: p.name, cls: p.cls, lv, fee: 0, line: '', race: p.race, look: p.look, weapon: p.weapon });
    R.save(); R.closeSheet(); R.toast(p.short + '加入了隊伍。' + (p.onlyHamilia ? '（只去哈米莉亞級的遺跡）' : ''));
    refreshAllies();
  };
  const refreshAllies = () => { const tw = W.town; if (!tw) return; (tw.allies || []).forEach(a => { if (a.h.g.parent) a.h.g.parent.remove(a.h.g); }); R.spawnTownAllies(); };
  // 劇情人物今天能不能一起下遺跡（受傷、有任務、只去哈米莉亞級）
  R.partyAvailable = (m, site) => {
    if (!m.story) return true;
    const p = P[m.story], dd = R.today();
    if (p.onlyHamilia && site && site.grade !== 'hamilia') return '阿杏答應過師父，只去哈米莉亞級的遺跡。';
    const b = p.busy && p.busy(dd); if (b) return b;
    if (m.story === 'churu' && S().evt.churuLeft && dd.abs <= k(1, 1, 2837)) return '楚璐已經騎著重機離開東鶴了。';
    return true;
  };
  // 隊伍裡的劇情人物：升級跟著你走（最多到他們原本的等級）
  R.syncStoryLv = () => { const s = S(); (s.party || []).forEach(m => { if (m.story) m.lv = Math.max(m.story === 'taki' ? 20 : 1, Math.min(P[m.story].lv, s.classes[s.cls].lv + (m.story === 'taki' ? 15 : 2))); }); };   // 瀧：你的等級 +15、至少 20（2026-10-04 作者：瀧太弱了）
  R.STORY_LOOK = id => P[id] && P[id].look;   // storylooks.js：隊伍裡的劇情人物換成最新的樣子
  // 戀人在隊伍裡：多一點力氣
  R.partyBond = Pl => { const s = S(); if (!s || !W.run) return; const lover = (s.party || []).find(m => m.story && s.rel[m.story] === 'lover'); if (lover) { Pl.dmgMult *= 1.06; Pl.def += 2; Pl.bond = lover.story; } };

  // ---------- 事件：好感度 3、6、9 ----------
  const eventDue = id => { const p = P[id], s = S(), a = aff(id); if (p.romance == null) return false; for (const t of [3, 6, 9]) if (a >= t && !s.evt[id + t]) return t; return false; };
  const runEvent = id => {
    const t = eventDue(id), s = S(); s.evt[id + t] = s.day; R.save();
    const E = EVENTS[id] && EVENTS[id][t]; if (!E) { sheet(id); return; }
    const opts = E.opts || [['好', null]];
    R.sheet('<p class="kicker">' + esc(P[id].name) + '</p><h2>' + esc(E.title) + '</h2>' + E.lines.map(l => '<p>' + esc(l) + '</p>').join(''), '<div class="row">' + opts.map(([lab], i) => '<button type="button" class="btn' + (i ? '' : ' pri') + '" data-ev="' + i + '">' + esc(lab) + '</button>').join('') + '</div>');
    document.querySelectorAll('[data-ev]').forEach(b => { b.onclick = () => { const f = opts[+b.dataset.ev][1]; if (f) f(s); R.save(); R.closeSheet(); }; });
  };
  const loverOK = id => { const s = S(); const cur = Object.keys(s.rel).find(k2 => s.rel[k2] === 'lover'); return !cur || cur === id; };
  const EVENTS = {
    taki: {
      3: { title: '繞三圈，多一個結', lines: ['瀧正在收釣線。有個結怎麼拉都解不開，她索性剪掉，重新穿線。', '你問她怎麼綁，她把鉤子拿近了一點，重做一次給你看。', '「先繞三圈。這裡再打一個結，你看……拉緊就好了。」', '「以前哥哥教我的。」她拉了拉線，確認沒有鬆。'], opts: [['「你哥哥呢？」', s => { R.toast('瀧沒回答，把剪下來的線收進布包裡。'); }], ['「我試試看。」', s => { s.aff.taki = Math.min(10, aff('taki') + 1); R.toast('你學會了瀧的結。（好感 +1）'); }]] },
      6: { title: '畫出來的地圖', lines: ['瀧翻出一張城西遺跡外圍的草圖，指給你看入口和幾條岔路。紙上沒寫字，危險處用紅圈標了起來。', '「我用畫的比較快。這個是入口，不是寶箱。」', '「看得懂嗎？哪裡不清楚，你指給我看。」'], opts: [['「我看得懂。」', s => { s.aff.taki = Math.min(10, aff('taki') + 1); R.toast('瀧輕輕點了一下頭。（好感 +1）'); }], ['「畫得很清楚。」', null]] },
      9: { title: '一起去釣魚', lines: ['瀧拿出兩個魚鉤，要你挑一個。你挑好後，她把另一個收了起來。', '「下次我去釣魚，你來不來？」她把你挑的魚鉤放到你手上。「就我們兩個。」', '你問要不要也找其他人。瀧看了你一會兒。「我想跟你去啊。」'], opts: [['（握住她的手）「好。」', s => { if (loverOK('taki')) { s.rel.taki = 'lover'; R.toast('你和瀧成為了戀人。'); } else { s.rel.taki = 'friend'; R.toast('「你已經有交往的人了吧。」瀧把魚鉤收回袋裡。「那就別牽手。」'); } }], ['「我們是最好的同伴。」', s => { s.rel.taki = 'friend'; R.toast('「知道了。」瀧把魚鉤收回袋裡，過了一會兒才問：「魚還釣嗎？」'); }]] }
    },
    reno: {
      3: { title: '算式卡', lines: ['雷諾把一張小卡片塞給你。上面用很小、很整齊的字，寫滿了公會結算用的公式。', '「結算的時候照這張算一次。不是說公會會少給……總不能拿到多少就算多少吧。」'], opts: [['「謝謝，我會用的。」', s => { s.flags = s.flags || {}; s.flags.renoCard = 1; R.toast('拿到「雷諾的算式卡」。'); }]] },
      6: { title: '房東又來問了', lines: ['雷諾提起西市口新貼的標語：「東鶴的飯碗，東鶴人自己端。」話說到一半，又改問你有沒有聽過哪裡在租房子。', '「房東又問我的分數。我說證明只給本人，他就不高興了。」', '「我還想住在東鶴。可是如果他不租我，我得先找別的地方。」'], opts: [['「我幫你留意。要找哪一帶？」', s => { s.aff.reno = Math.min(10, aff('reno') + 1); R.toast('「離公會不要太遠。房租……我寫給你。」（好感 +1）'); }], ['「我也不熟，可能幫不上忙。」', null]] },
      9: { title: '冊子的最後一頁', lines: ['雷諾把冊子翻到最後一頁，推到你面前。', '上面寫著你的名字，後面卻沒有金額。你問他要記什麼，他把冊子拉回去了一點。', '「我本來想先寫好再跟你說，寫不出來。就是……我想跟你交往。你願意嗎？」'], opts: [['「好，我也想。」', s => { if (loverOK('reno')) { s.rel.reno = 'lover'; R.toast('你和雷諾成為了戀人。'); } else { s.rel.reno = 'friend'; R.toast('雷諾把冊子合起來。「啊，你已經有對象了。那就當朋友吧。」'); } }], ['「我們是好搭檔。」', s => { s.rel.reno = 'friend'; R.toast('「嗯。那這頁先別看了，我改一下。」'); }]] }
    },
    churu: {
      3: { title: '配備上的記號', lines: ['楚璐問你要不要檢查配備。你把扣帶交給她，她拉了幾下，用粉筆圈出鬆動的地方。', '「這裡，拉的時候會滑。你自己試。」', '你照著拉了一下，扣帶果然鬆開了。楚璐把它重新穿好。「先這樣，下次出門前再看一下。」'], opts: [['「謝了。」', s => { s.buff = { kind: 'churu', b: { def: 0 }, until: s.day }; R.toast('楚璐幫你檢查過配備了。'); }]] },
      6: { title: '洗不掉的泥', lines: ['楚璐的外套下襬還沾著泥。你問她是不是摔車了，她連忙說沒有。', '「北渠那邊有台貨車陷進去了，我下去幫忙推。司機一踩油門，全噴到我身上。」', '你問車後來有沒有出來。「有啊，不然我更氣。先不說了，哪裡有水？我背後是不是也有？」'], opts: [['「轉過去，我幫你看看背後。」', s => { s.aff.churu = Math.min(10, aff('churu') + 1); R.toast('（好感 +1）'); }]] },
      9: { title: '後座', lines: ['楚璐把多帶的安全帽遞給你。你問去哪裡，她說還沒決定。', '「只是想約你出去。不是順路載你，是約會。」', '你還拿著安全帽，楚璐把手伸了過來。「不去就還我。拿著又不說話，我哪知道你在想什麼。」'], opts: [['（戴上安全帽）「好，去海邊吧。」', s => { if (loverOK('churu')) { s.rel.churu = 'lover'; R.toast('你和楚璐成為了戀人。'); } else { s.rel.churu = 'friend'; R.toast('「等等，你不是有交往的人嗎？那就說好，只是出去玩。」'); } }], ['「出去可以，不過我們當朋友就好。」', s => { s.rel.churu = 'friend'; R.toast('「好啊。那還去不去？我都把安全帽帶來了。」'); }]] }
    },
    achan: {
      3: { title: '第一筆報酬', lines: ['阿杏捧著兩串糰子跑過來。', '「第一件任務的錢！一串給望月姊姊，一串……」她看了看你，把其中一串塞進你手裡。', '「望月姊姊的那一串，我再去買！」'], opts: [['「謝謝。」', s => { R.addGift('dango', 1); R.toast('收到一串糰子。'); }]] },
      6: { title: '國籍', lines: ['「榮心階……是不是真的要把國籍丟掉？那，戶口上就沒有我了？」', '「館員有給我說明，可是我看了又看，還是不太懂。我娘看到一定會問。」'], opts: [['「是會除籍。不過沒有期限，你可以把說明拿回去，跟家裡商量。」', s => { s.aff.achan = Math.min(10, aff('achan') + 1); R.toast('「那我再問一次館員。要拿回家的話，我自己得先弄懂。」（好感 +1）'); }], ['「這個我怕講錯，你再問館員比較好。」', null]] },
      9: { title: '想追上的人', lines: ['阿杏問你下次什麼時候有空。你以為她又要找人對練，她趕快搖頭。', '「這次不是練刀啦。我想請你吃糰子。上次的報酬還有剩。」', '「你要吃幾串？先講，不然我錢沒帶夠就丟臉了。」'], opts: [['「兩串就好。謝謝。」', s => { s.rel.achan = 'friend'; R.toast('你和阿杏成為了好朋友。'); }]] }
    }
  };

  // ---------- 旅行商人、斗篷商、算命的 ----------
  const merchantShop = () => {
    const s = S(), items = [['hood', '旅人的兜帽', 120, '遮住耳朵、角、臉。（排外的人看不出你的種族；戒嚴那天會被盤查）'], ['potion', '回復藥（外地貨）', 34, '和白藤堂的一樣。'], ['dorayaki', '銅鑼燒', 6, '禮物'], ['tackle', '釣具', 12, '南橋下可以釣魚']];
    R.sheet('<p class="kicker">旅行商人</p><h2>今天的貨</h2><div class="recipes">' + items.map(([kk, n, pr, d]) => '<div class="recipe"><b>' + n + '</b><small>' + d + '</small><button type="button" class="btn pri" data-mb="' + kk + '"' + (s.gold < pr || (kk === 'hood' && s.hood) ? ' disabled' : '') + '>' + (kk === 'hood' && s.hood ? '已經有了' : '買（' + pr + ' 費拉）') + '</button></div>').join('') + '</div>', '<div class="row"><button type="button" class="btn" id="mb-x">走了</button></div>');
    $('mb-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-mb]').forEach(b => { b.onclick = () => { const it = items.find(v => v[0] === b.dataset.mb); if (s.gold < it[2]) return; s.gold -= it[2]; if (it[0] === 'hood') { s.hood = true; s.hoodOn = true; } else if (it[0] === 'potion') s.potions.hp++; else R.addGift(it[0], 1); R.save(); merchantShop(); R.toast('買了：' + it[1]); if (it[0] === 'hood') R.restyleSelf(); }; });
  };
  const hoodShop = () => {
    const s = S(), pr = 90;
    R.sheet('<p class="kicker">後巷的斗篷商</p><h2>兜帽斗篷</h2><p>「遮臉、遮角、遮耳朵都行。進遺跡也戴著，沒人看得出你是誰。」</p><p class="note">戴著的時候，店家和路人看不出你的種族。戒嚴那天衛兵會叫你拿下來。可以在暫停選單裡戴上、拿下。</p>',
      '<div class="row"><button type="button" class="btn pri" id="hd-buy"' + (s.hood || s.gold < pr ? ' disabled' : '') + '>' + (s.hood ? '已經有了' : '買（' + pr + ' 費拉）') + '</button><button type="button" class="btn" id="hd-x">算了</button></div>');
    $('hd-x').onclick = R.closeSheet; $('hd-buy').onclick = () => { if (s.hood || s.gold < pr) return; s.gold -= pr; s.hood = true; s.hoodOn = true; R.save(); R.closeSheet(); R.toast('戴上了兜帽。'); R.restyleSelf(); };
  };
  const fortune = () => {
    const s = S(); if (s.gold < 10) { R.toast('錢不夠。'); return; }
    s.gold -= 10; R.save();
    const r = Math.random(), say = r < 0.3 ? '「你的下一趟，會在遺跡裡遇到別的勇者。……看清楚他們的證件。」' : r < 0.55 ? '「這張牌是訪客。最近要是碰到不認識的人，別急著走，聽聽對方要說什麼。」' : r < 0.8 ? '「最近有人會拿著紙來找你。看清楚紙上的日子。」' : '「斷尾的時候，往門口跑。」';
    R.townTalk('算命的老婆婆', ['（她翻開一張牌。）', say]);
  };
  // 兜帽：戴上、拿下（換人物的樣子）
  R.restyleSelf = () => { const Pl = W.P; if (!Pl || !Pl.h || !R.playerLook) return; R.spriteLook(Pl.h, R.playerLook()); };
  R.toggleHood = () => { const s = S(); if (!s.hood) return; s.hoodOn = !s.hoodOn; R.save(); R.restyleSelf(); R.toast(s.hoodOn ? '戴上了兜帽。' : '拿下了兜帽。'); };

  // ---------- 楚璐離開東鶴（冬凌月 29 日） ----------
  R.dojoGate = () => { const at = todayAt('iwa'); R.townTalk('望月家道場', at ? ['門口坐著一個扶著膝蓋的男人。'] : ['門裡傳來木刀相擊的聲音。', '門口掛著「望月」的木牌。']); };
  const ce = R.onNewDay;
  R.onNewDay = () => {
    ce();
    const s = S(), dd = R.today();
    R.syncStoryLv();
    // 楚璐問完「要往哪裡騎」就走了（在隊伍裡的話也會離隊）
    if (dd.abs === k(10, 30) && !s.evt.churuLeft) {
      s.evt.churuLeft = 1; const i = s.party.findIndex(m => m.story === 'churu'); if (i >= 0) s.party.splice(i, 1);
      if (s.met.churu) R.addDeed('有人看到一台黑色的重機，往城外騎走了。');
    }
  };
  // 楚璐：冬凌月 29 日，問你要往哪裡騎（之後離開東鶴，明年春天才會偶爾回來）
  const churuBye = () => {
    const s = S(), lover = s.rel.churu === 'lover';
    R.sheet('<p class="kicker">楚璐・洛朗</p><h2>往哪裡騎</h2><p>調查點的器材都還回去了。楚璐把安全帽夾在腋下，靠著重機。</p><p>「欸，你說——我要往哪裡騎？」</p>' + (lover ? '<p class="hand">「我走了以後，你有空就寫信。別等到春天才跟我說一堆。」</p>' : ''),
      '<div class="row"><button type="button" class="btn pri" data-by="s">「往南。」</button><button type="button" class="btn" data-by="e">「往海邊。」</button><button type="button" class="btn" data-by="w">「騎慢一點就好。」</button></div>');
    document.querySelectorAll('[data-by]').forEach(b => { b.onclick = () => {
      const r = { s: '往南啊……好，那就往南。', e: '海邊啊……好，就海邊。', w: '哈，你跟我媽一樣。' }[b.dataset.by];
      gain('churu', 1); R.save();
      R.townTalk('楚璐', [r, '春天的時候，我會再騎回來看看。', lover ? '「春天回來，再載你出去。安全帽先幫我收著。」' : '（引擎聲響起，重機往城門騎去。）']);
    }; });
  };
  // 城裡每一格：走近黑色剪影，就算「看到了」（那天沒去說話，隔天算錯過一次）
  let pt = 0;
  R.peopleStep = dt => {
    pt -= dt; if (pt > 0) return; pt = 0.5;
    const s = S(), Pl = W.P, tw = W.town; if (!s || !Pl || !tw) return;
    tw.npcs.forEach(n => { if (n.person && P[n.person].sil && !s.met[n.person] && Math.hypot(n.x - Pl.x, n.z - Pl.z) < 16) s.sil[n.person] = s.day; });
  };
})(window.R);
