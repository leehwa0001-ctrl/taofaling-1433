// 討伐令 1433：私人委託（不是公會的委託）與詐騙
// 後巷的木板上每天會貼幾張手寫的委託。公會不保障私人委託——有的是真的，有的是騙局：
//  訂金詐騙（先付保證金，人就不見了）、假赤金（付你一枚鳴文不對的赤金）、違禁品（包裹裡是礦坑少掉的爆裂核心）、
//  不存在的日期（合約寫「夏峰月 27 日」，夏峰月只有 25 天）、引你進遺跡埋伏、帶「臨時搬運工」進遺跡（公會警告過的人口販賣）。
// 可以：細看（找破綻）、接下、不接、通報衛兵（是騙局的話有獎金；冤枉人會扣名聲）。
(function (R) {
  const $ = id => document.getElementById(id);
  const esc = s => R.esc(s);
  const W = R.W;
  const S = () => R.S;
  const CLIENTS = ['西市的布商', '北郊的農家', '德克斯凡的跑單員', '湯山村的旅館', '驛站的車伕', '自稱學者的人', '城南的老太太', '戴著帽子的男人', '新商區的店員', '一位外地的商人'];
  const PLACES = [['湯山村', '湯山村的溫泉旁'], ['北郊農舍', '北郊農舍的門口'], ['驛站', '驛站的售票口前'], ['神社', '東鶴神社的鳥居下'], ['調查點', '城西遺跡的公會調查點']];
  const TARGET = R.CITY ? R.CITY.TARGET : { '湯山村': [200, 128], '北郊農舍': [790, 276], '驛站': [640, 492], '神社': [470, 512], '調查點': [200, 478] };
  const MAT_JOBS = [['herb', 6], ['iron', 4], ['crystal', 3], ['shell', 4], ['branch', 10]];
  const HUNT = [['kousaku', '礦殼', 'dh-kouzan'], ['kodama', '根童', 'dh-sokkutsu'], ['onibi', '游焰', 'dh-sokkutsu'], ['kasa', '獨腳傘', 'dh-josai'], ['hyakume', '群瞳', 'dh-josai']];
  const hash = s => R.hash01(S().seed + ':' + s);

  // ---------- 今天的委託（同一天固定） ----------
  const offers = () => {
    const s = S(), dd = R.today(), n = 2 + (hash('n' + dd.abs) < 0.5 ? 1 : 0), out = [];
    for (let i = 0; i < n; i++) {
      const h = x => hash(dd.abs + ':' + i + ':' + x), id = 'J' + dd.abs + '-' + i;
      if (s.offersTaken[id]) continue;
      const kind = ['gather', 'deliver', 'hunt', 'deliver', 'gather', 'escort'][Math.floor(h('k') * 6)], client = CLIENTS[Math.floor(h('c') * CLIENTS.length)];
      let job = { id, kind, client, day: dd.day, due: dd.day + 2 + Math.floor(h('d') * 3), scam: null };
      // 騙局的種類
      const sr = h('s');
      if (kind === 'escort') job.scam = 'traffic';
      else if (sr < 0.14) job.scam = 'deposit'; else if (sr < 0.26) job.scam = 'fakegold'; else if (sr < 0.36 && kind === 'deliver') job.scam = 'contraband'; else if (sr < 0.45) job.scam = 'baddate'; else if (sr < 0.53 && kind === 'hunt') job.scam = 'trap';
      if (kind === 'gather') { const [m, q] = MAT_JOBS[Math.floor(h('m') * MAT_JOBS.length)]; Object.assign(job, { mat: m, n: q, reward: Math.round(R.MATS[m].value * q * 2.2 + 20), title: '收購' + R.MATS[m].name + ' ×' + q, text: '帶' + R.MATS[m].name + ' ' + q + ' 個到後巷的木板，委託人會來收。' }); }
      if (kind === 'deliver') { const pl = PLACES[Math.floor(h('p') * PLACES.length)]; Object.assign(job, { to: pl[0], reward: 40 + Math.floor(h('r') * 50), title: '送一個包裹到' + pl[0], text: '包裹交給' + pl[1] + '等著的人。' }); }
      if (kind === 'hunt') { const t = HUNT[Math.floor(h('t') * HUNT.length)], q = 3 + Math.floor(h('q') * 4); Object.assign(job, { target: t[0], site: t[2], n: q, got: 0, reward: 60 + q * 15, title: '在' + R.SITES.find(v => v.id === t[2]).name + '打倒' + t[1] + ' ×' + q, text: '委託人說要' + t[1] + '體內的東西做研究。打倒就好，不用帶回來。' }); }
      if (kind === 'escort') Object.assign(job, { site: 'dh-josai', reward: 300, title: '帶三個臨時搬運工進城西遺跡', text: '「人我們出，你只要帶路。不用問他們是誰。」' });
      if (job.scam === 'fakegold') { job.reward = 1000; job.text += ' 報酬是一枚赤金，先給你看過了。'; }
      if (job.scam === 'deposit') { job.deposit = 30 + Math.floor(h('dp') * 50); job.text += ' 接之前要先付 ' + job.deposit + ' 費拉的保證金。'; }
      if (job.scam === 'baddate') job.text += ' 合約上寫：夏峰月 27 日前完成。';
      out.push(job);
    }
    return out;
  };
  // 細看：找破綻（騙局的話，大部分看得出來；真的委託，也可能看起來怪怪的）
  const clues = j => {
    const c = { deposit: ['委託人說不出自己住在哪裡。', '「保證金一定要付現金。」'], fakegold: ['他讓你看了一眼那枚赤金：鳴文是藍色的直紋。（真的赤金是紅色的漩渦）', '這種小事付一枚赤金？太多了。'], contraband: ['包裹沉得不像話，外面貼著德克斯凡礦務公司的封條。', '委託人一直要你「別在路上打開」。'], baddate: ['合約上的日期：夏峰月 27 日。……夏峰月只有 25 天。', '委託人的印章是新刻的，邊緣還很利。'], trap: ['委託人不肯留名字，只說「到了第二層就知道」。', '他的同伴在後巷口一直盯著你看。'], traffic: ['「臨時搬運工」三個人都沒有身分證。', '公會前幾天才警告過：有人用「臨時搬運工」的名義帶沒有身分的人進遺跡。'] }[j.scam];
    if (c) return c;
    return [pick2(['委託人是常在這一帶走動的人。', '紙上的字寫得很工整，地址也寫得清清楚楚。', '委託人看起來有點緊張，不過說話很老實。']), pick2(['報酬不多，但也不少。', '日期和地點都寫得很清楚。'])];
  };
  const pick2 = a => a[Math.floor(Math.random() * a.length)];

  // ---------- 木板 ----------
  R.privateBoard = () => {
    R.ensureWorld();
    const s = S(), list = offers();
    R.sheet('<p class="kicker">後巷・私人委託</p><h2>木板上的紙</h2><p class="note">公會不保障私人委託。被騙了，公會也沒辦法。' + (R.today().abs <= R.absOf(2836, 10, 20) && R.today().abs >= R.absOf(2836, 10, 13) ? '（最近公會警告過「臨時搬運工」的事。）' : '') + '</p>'
      + (list.length ? '<div class="quests">' + list.map(j => '<div class="quest" style="--c:#8A6A44"><b>' + esc(j.title) + '</b><small>' + esc(j.client) + '・報酬 ' + j.reward + ' 費拉・' + (j.due - s.day) + ' 天內</small><small>' + esc(j.text) + '</small><div class="row"><button type="button" class="mini" data-look="' + j.id + '">細看</button><button type="button" class="mini gold" data-take="' + j.id + '">接下</button><button type="button" class="mini" data-rep="' + j.id + '">通報衛兵</button></div><p class="hand" id="cl-' + j.id + '" hidden></p></div>').join('') + '</div>' : '<p class="note">今天沒有新的委託。</p>')
      + ((s.jobs || []).length ? '<h3>手上的私人委託</h3>' + jobLines() : ''),
      '<div class="row"><button type="button" class="btn" id="pb-x">好</button></div>');
    $('pb-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-look]').forEach(b => { b.onclick = () => { const j = list.find(v => v.id === b.dataset.look), el = $('cl-' + j.id); el.hidden = false; el.textContent = clues(j).join(' '); }; });
    document.querySelectorAll('[data-take]').forEach(b => { b.onclick = () => take(list.find(v => v.id === b.dataset.take)); });
    document.querySelectorAll('[data-rep]').forEach(b => { b.onclick = () => report(list.find(v => v.id === b.dataset.rep)); });
  };
  const jobLines = () => '<ul class="loot">' + S().jobs.map(j => '<li>' + esc(j.title) + '<small class="note">　' + esc(progress(j)) + '・剩 ' + Math.max(0, j.due - S().day) + ' 天</small></li>').join('') + '</ul>';
  const progress = j => j.kind === 'gather' ? '手上 ' + (S().mats[j.mat] || 0) + '／' + j.n : j.kind === 'deliver' ? '包裹在你身上：交給' + j.to + '的人' : j.kind === 'hunt' ? j.got + '／' + j.n : j.kind === 'escort' ? '進城西遺跡' : '';
  const take = j => {
    const s = S();
    if (s.jobs.length >= 4) { R.toast('手上的委託太多了（最多 4 件）。'); return; }
    if (j.deposit) { if (s.gold < j.deposit) { R.toast('保證金不夠。'); return; } s.gold -= j.deposit; }
    s.offersTaken[j.id] = 1; s.jobs.push(j); R.save(); R.closeSheet();
    if (j.scam === 'deposit') { R.toast('付了 ' + j.deposit + ' 費拉的保證金。委託人說「明天見」。'); j.vanish = true; }
    else R.toast('接下了：' + j.title);
    if (W.town && R.refreshJobs) R.refreshJobs();
  };
  const report = j => {
    const s = S(); s.offersTaken[j.id] = 1;
    if (j.scam) {
      const b = { traffic: 180, contraband: 150, fakegold: 90, trap: 120, deposit: 70, baddate: 70 }[j.scam];
      s.gold += b; s.rep = (s.rep || 0) + 2;
      R.addDeed({ traffic: '有勇者向衛兵通報「臨時搬運工」的委託，衛兵在後巷逮捕了一名男子。', contraband: '衛兵在後巷查獲德克斯凡礦務公司失竊的爆裂核心。', fakegold: '衛兵查獲一批偽造的赤金。', trap: '衛兵在霜溪一帶抓到一夥假委託真搶劫的人。', deposit: '後巷的「保證金」騙子被抓了。', baddate: '一份日期造假的合約被送到了衛兵所。' }[j.scam]);
      R.save(); R.closeSheet(); R.townTalk('東鶴的衛兵', ['「通報得好。」', '（拿到 ' + b + ' 費拉的通報獎金。）']);
    } else { s.rep = (s.rep || 0) - 1; R.save(); R.closeSheet(); R.townTalk('東鶴的衛兵', ['衛兵去問了一圈，回來瞪了你一眼。', '「人家是正經的委託。別亂報。」']); }
  };
  R.questLog = () => {
    const s = S();
    R.sheet('<h2>手上的委託</h2>' + ((s.jobs || []).length ? jobLines() : '<p class="note">沒有私人委託。公會的遺跡委託在公會的告示板上。</p>'), '<div class="row"><button type="button" class="btn pri" id="ql-x">好</button></div>');
    $('ql-x').onclick = R.closeSheet;
  };

  // ---------- 交件 ----------
  const finish = (j, msg) => {
    const s = S(); s.jobs = s.jobs.filter(v => v !== j);
    if (j.scam === 'fakegold') { s.fake = (s.fake || 0) + 1; R.townTalk(j.client, [msg, '「辛苦了。」委託人把一枚赤金放進你手裡，很快地走了。', '（拿到一枚「赤金」。）']); }
    else if (j.scam === 'baddate' || j.scam === 'deposit') { R.townTalk(j.client, ['……委託人沒有出現。', '問了附近的人，沒有人認識這個人。']); }
    else if (j.scam === 'contraband') {
      R.townTalk('收貨的人', [msg, '收貨的人看了看四周，把包裹抱進懷裡就走了。', '（拿到 ' + j.reward + ' 費拉。）']); s.gold += j.reward;
      // 隔天：選礦廠的爆裂核心外流……衛兵開始查
      s.contraband = (s.contraband || 0) + 1; R.addDeed('衛兵在城外查獲一批來路不明的爆裂核心。據說是有人幫忙「送貨」。');
      if (R.crime) { R.crime.heat = Math.max(R.crime.heat, 1); }
    }
    else { s.gold += j.reward; s.rep = (s.rep || 0) + 1; R.townTalk(j.client, [msg, '（拿到 ' + j.reward + ' 費拉。）']); }
    R.save(); if (R.refreshJobs) R.refreshJobs();
  };
  // 城裡：收貨的人、收素材的人（在目的地等著）
  R.placeJobs = (kind, api) => {
    const s = S(); if (!s || kind !== 'town') return;
    (s.jobs || []).forEach(j => {
      if (j.vanish) return;
      if (j.kind === 'deliver') { const t = TARGET[j.to]; const [x, z] = api.spot(t[0], t[1]); const n = api.npc(x, z, { top: '#5A4A3A', hair: '#2A2420', cloak: '#3A3A30' }, '收貨的人', 0); n.near = 1; api.inter(x, z + 1, 2, '把包裹交給收貨的人', () => finish(j, '你把包裹交了出去。'), { follow: n }); }
      if (j.kind === 'gather') { const [x, z] = api.spot(...(R.CITY ? R.CITY.gatherSpot : [465, 566])); const n = api.npc(x, z, { top: '#3A4A5A', hair: '#6A4A2E', cloak: '#2E3A48' }, j.client, Math.PI); n.near = 1; api.inter(x, z, 2, '把' + R.MATS[j.mat].name + '交給委託人（' + j.n + ' 個）', () => { if ((s.mats[j.mat] || 0) < j.n) { R.toast(R.MATS[j.mat].name + '不夠。'); return; } s.mats[j.mat] -= j.n; finish(j, '委託人點了點數量。'); }, { follow: n }); }
    });
  };
  R.refreshJobs = () => { };
  // 遺跡回來：討伐的數量；引你進遺跡的埋伏、搬運工
  R.jobsOnRun = run => {
    const s = S();
    (s.jobs || []).slice().forEach(j => {
      if (j.kind === 'hunt' && run.killIds) { j.got = Math.min(j.n, j.got + (run.killIds[j.target] || 0)); if (j.got >= j.n) { if (j.scam === 'baddate' || j.scam === 'deposit') finish(j, ''); else { s.jobs = s.jobs.filter(v => v !== j); s.gold += j.scam === 'fakegold' ? 0 : j.reward; if (j.scam === 'fakegold') s.fake = (s.fake || 0) + 1; R.toast('私人委託完成：' + j.title + (j.scam === 'fakegold' ? '（拿到一枚赤金）' : '（' + j.reward + ' 費拉）')); } } }
      if (j.kind === 'escort' && run.site.id === j.site) { s.jobs = s.jobs.filter(v => v !== j); s.gold += j.reward; s.rep = (s.rep || 0) - 4; s.wantedEscort = 1; R.addDeed('公會東鶴分館發布警示：有勇者帶著沒有身分的「臨時搬運工」進入城西遺跡。'); R.toast('「臨時搬運工」在遺跡入口就被人帶走了。……拿到 ' + j.reward + ' 費拉。'); }
    });
    R.save();
  };
  // 這一趟遺跡：有沒有人埋伏你
  R.jobAmbush = site => (S().jobs || []).find(j => j.scam === 'trap' && j.site === site.id && !j.sprung);
  // 每天：過期的委託
  R.jobsNewDay = dd => {
    const s = S(); if (!s.jobs) return;
    s.jobs.forEach(j => { if (j.vanish && dd.day > j.day) j.gone = true; });
    s.jobs = s.jobs.filter(j => { if (j.gone) return false; if (dd.day > j.due) { s.rep = (s.rep || 0) - (j.scam ? 0 : 1); return false; } return true; });
  };
})(window.R);
