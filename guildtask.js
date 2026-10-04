// 公會的委託書與「任務評判五軌制」（照作者的《公會簡章》第六章第五項）
// - 出發之前先看委託書：遺跡的分級、任務內容（哈米莉亞級是新人段的 F 級「巡查」，其他是「討伐」）、要負責的數量、時限。
//   數量照統籌組的做法定（比實際需要的多一些，勇者不用 100% 也能申請完成）：阿彌勒每層 12 隻、摩爾斯 16 隻、克森特 10 隻、卡索 12 隻。
//   時限：每層 4 小時（遺跡裡一小時＝真實 90 秒，比城裡慢一倍；2026-10-02 以前是 45 秒）。
// - 回到地面＝申請「任務完成」。五軌：
//   完成度：實際／要求（巡查：走到第幾層）；效率：時限內 100%，超過每小時扣 3%，最低 1%；
//   創傷：申請完成時的身體狀況（任務中治療不算，「能使自己在戰後恢復的與戰前無異，也是實力」），倒下＝1%，隊友倒著也扣；
//   環境（2026-10-04 作者：要嚴查，照佩特拉核心的關注算）：佩特拉的注意每跨過 25、50、75 算一次關注，扣 5；注意滿了引起反應，扣 20。
//   （2026-10-05 作者回報卡索級的環境分可能有 bug：卡索級 60～100 層，關注一路累積，環境分幾乎一定 0 分）→ 扣的分照走過的層數攤：
//   15 層以內照扣；超過的 ×15÷走到的層數（30 層扣一半、60 層扣四分之一、100 層扣 15%）。
//   打壞東西、殺多少遺跡生物都不直接扣（打壞東西會讓注意上升，就會算進去）；巡查一樣算；反饋：專員事後調查民眾和環境的反應。
//   五項平均是這個任務的成績。成績不會馬上知道：專員調查、分館綜合後，隔天才登錄到勇者證（公會登記處查詢）。
// - 2026-10-04（作者：委託必須到公會分館找櫃台繳交後才算完成；忘了配裝、出個遺跡就被結算了）：遺跡的委託回到地面不再馬上結算，
//   進度記在 R.S.heldTask（可以再下去同一座遺跡繼續做，擊倒數、時間、走到的層數累積），回公會登記處按「繳交委託」才打成績、付報酬（報酬先扣住，見 turnin.js）。
//   倒下＝委託失敗，照舊馬上記。狩獵場（hunt.js）照舊回來就結算。一次只能接一張委託：手上有別的委託要先繳交或放棄。
// - 存檔：R.S.tasks＝[{ id, site, grade, letter, kind, need, done, limitH, h, s: [完成度, 效率, 創傷, 環境, 反饋], avg, day, ready, failed }]
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const HOUR = 90, K = { amile: 12, mors: 16, kesent: 10, kaso: 12 };   // HOUR：遺跡裡一小時＝真實 90 秒（作者：下遺跡的時間可以慢點；原本 45 秒）
  const clamp = v => Math.max(1, Math.min(100, Math.round(v)));
  const NAMES = ['完成度', '效率', '創傷', '環境', '反饋'];
  R.FIVE_TRACK = NAMES;

  // ---------- 委託書 ----------
  const floorsOf = site => { if (R.floorsFor) return R.floorsFor(site); const g = R.gradeById(site.grade); return Math.max(2, g.floors + (R.TYPES[site.type] && R.TYPES[site.type].floors || 0)); };
  R.taskSpec = site => {
    const g = R.gradeById(site.grade), floors = floorsOf(site), patrol = g.id === 'hamilia';
    return { kind: patrol ? 'patrol' : 'hunt', need: patrol ? floors : Math.max(10, Math.round(Math.min(floors, 50) * (K[g.id] || 12))),   /* 2026-10-04 作者：委託的數量、時限還可以再調——後期一趟殺一兩千隻、30 層不到 20 小時，200 小時夠人掛機一整天。討伐數照層數算到第 50 層（原本只算到第 10 層） */ limitH: patrol ? Math.ceil(floors * 4 * (1 + 0.08 * (g.lv - 1))) : Math.max(6, Math.ceil(Math.min(floors, 50) * 0.8 * (1 + 0.05 * (g.lv - 1)))),   /* 時限：每層 0.8 小時（原本 4 小時） */ letter: g.letter || '', floors };
  };
  const specLines = (site, sp) => { const g = R.gradeById(site.grade); return sp.lines || ['任務分級：' + sp.letter + ' 級（' + g.name + '）', sp.kind === 'patrol' ? '任務內容：巡查（走到最深處，第 ' + sp.floors + ' 層）' : '任務內容：討伐遺跡生物 ' + sp.need + ' 隻（討伐令 1433 令）', '時限：' + sp.limitH + ' 小時（超過每小時扣 3% 的效率分）']; };
  R.taskExtras = [];   // 加注條款之類的：{ html(site), bind(box, site) }
  const hubOpen = () => { const h = $('hub'); return h && !h.hidden; };
  const modal = (html, foot) => {
    if (hubOpen()) { $('hub-sheet').innerHTML = html + foot; $('hub-modal').hidden = false; return { box: $('hub-sheet'), close: () => { $('hub-modal').hidden = true; } }; }
    R.sheet(html, foot); return { box: $('r-sheet'), close: R.closeSheet };
  };
  // 外層的包裝（main.js、gtamap.js……）只傳 id，所以「已經看過委託書」用旗子記，不用第二個參數
  let okId = null, freeId = null, contId = null;   // freeId：不接委託，自己下去（沒有委託報酬、不打成績，加注條款也不算）；contId：繼續手上的委託
  const sr0 = R.startRun;
  R.startRun = id => {
    const s = S(), site = R.SITES.find(x => x.id === id);
    if (okId === id) { okId = null; return sr0(id); }
    if (!site || (site.kind !== 'ruin' && site.kind !== 'hunt') || !s) return sr0(id);   // hunt：湯山村後山的狩獵場（hunt.js）
    if (s.banUntil > s.day || site.id === 'kanko' || site.grade === 'kaso') return sr0(id);   // 停權（punish.js 會說明）、觀光的動物園、卡索級的特別討伐令（kaso.js）不用這張委託書
    const held = s.heldTask;
    if (held && site.kind === 'ruin') {
      const go = (mode) => { okId = id; if (mode === 'free') freeId = id; if (mode === 'cont') contId = id; R.startRun(id); };
      if (held.siteId === id) {
        const m = modal('<p class="kicker">公會討伐令・手上的委託</p><h2>' + esc(site.name) + '</h2><p>這座遺跡的委託還在手上：' + esc(R.heldLine(held)) + '。</p><p class="note">可以再下去繼續做；回公會分館的登記處繳交，才結算五軌成績、付委託報酬（已經扣住 ' + (held.pay || 0) + ' 費拉）。</p>',
          '<div class="row"><button type="button" class="btn pri" id="tk-cont">繼續委託，出發</button><button type="button" class="btn" id="tk-free">不接委託，自己下去</button><button type="button" class="btn" id="tk-no">再想想</button></div>');
        $('tk-no').onclick = m.close; $('tk-cont').onclick = () => { m.close(); go('cont'); }; $('tk-free').onclick = () => { m.close(); go('free'); };
        return;
      }
      const m = modal('<p class="kicker">公會討伐令</p><h2>' + esc(site.name) + '</h2><p>手上還有「' + esc(held.site) + '」的委託沒繳交（' + esc(R.heldLine(held)) + '）。一次只能接一張委託。</p><p class="note">先回公會分館的登記處繳交；或是放棄那張委託（記為失敗、沒有報酬）再接這一張。也可以不接委託，自己下去。</p>',
        '<div class="row"><button type="button" class="btn pri" id="tk-no">先回去繳交</button><button type="button" class="btn" id="tk-free">不接委託，自己下去</button><button type="button" class="btn" id="tk-drop">放棄手上的委託</button></div>');
      $('tk-no').onclick = m.close; $('tk-free').onclick = () => { m.close(); go('free'); };
      $('tk-drop').onclick = () => { m.close(); R.dropHeldTask(); R.startRun(id); };
      return;
    }
    const sp = R.taskSpec(site);
    const m = modal('<p class="kicker">公會討伐令・委託書</p><h2>' + esc(site.name) + '</h2>' + specLines(site, sp).map(l => '<p>' + esc(l) + '</p>').join('')
      + '<p class="note">' + (site.kind === 'ruin' ? '回到地面之後，到公會分館的登記處繳交委託，才算申請「任務完成」（沒做完可以再下去繼續）。' : '回到地面就是申請「任務完成」。') + '專員會照五軌制（完成度、效率、創傷、環境、反饋）打分數，隔天登錄到勇者證，在公會的登記處查得到。</p>'
      + R.taskExtras.map(x => x.html(site, sp)).join(''),
      '<div class="row"><button type="button" class="btn pri" id="tk-go">接下委託，出發</button><button type="button" class="btn" id="tk-free" title="沒有委託報酬、不打成績、沒有時限">不接委託，自己下去</button><button type="button" class="btn" id="tk-no">再想想</button></div>');
    R.taskExtras.forEach(x => x.bind && x.bind(m.box, site, sp));
    $('tk-no').onclick = m.close;
    $('tk-go').onclick = () => { m.close(); okId = id; R.startRun(id); };
    $('tk-free').onclick = () => { m.close(); okId = id; freeId = id; R.startRun(id); };
  };
  // 真的出發了：記下委託
  const sr1 = R.startRun;
  R.startRun = id => {
    const free = freeId === id, cont = contId === id; freeId = null; contId = null;
    const r = sr1(id), run = W().run, h = S().heldTask;
    if (cont && run && h && run.site && run.site.id === h.siteId && !run.task) {
      run.task = { kind: h.kind, need: h.need, limitH: h.limitH, letter: h.letter, floors: h.floors, t: h.t, props: h.props, deepest: h.deepest, kills0: h.kills, react0: h.react, notice0: h.notice, rankExam: h.rankExam, cont: 1 };
      run.pact = h.pact || { sel: {}, pts: 0 };   // 加注條款照第一趟的（pact.js 看到 run.pact 就不會再加一次）
      setTimeout(() => R.toast && R.toast('繼續委託：' + R.heldLine(h), '#E8C04A'), 2600);
      return r;
    }
    if (free && run) { run.free = 1; setTimeout(() => R.toast && R.toast('沒有接委託：這一趟沒有委託報酬，也不會打成績', '#C8B88A'), 2600); return r; }
    if (run && !run.task && run.site && run.site.id === id && (run.site.kind === 'ruin' || run.site.kind === 'hunt') && id !== 'kanko') {
      const sp = R.taskSpec(run.site); run.task = Object.assign({ t: 0, props: 0, deepest: 0 }, sp);
      setTimeout(() => R.toast && R.toast(sp.kind === 'patrol' ? '委託：巡查到第 ' + sp.floors + ' 層・時限 ' + sp.limitH + ' 小時' : '委託：討伐 ' + sp.need + ' 隻・時限 ' + sp.limitH + ' 小時', '#E8C04A'), 2600);
    }
    return r;
  };

  // ---------- 遺跡裡：計時、打壞的東西、委託的進度 ----------
  const st0 = R.step;
  let hudT = 0;
  R.step = dt => {
    st0(dt);
    const run = W().run, tk = run && run.task; if (!tk || run.done) { const e0 = $('r-task'); if (e0 && !e0.hidden && run) e0.hidden = !tk; return; }
    tk.t += dt; tk.deepest = Math.max(tk.deepest, run.floor - (run.f0 ? 1 : 0) + 1);
    hudT -= dt; if (hudT > 0) return; hudT = 0.5;
    let el = $('r-task'); if (!el) { const tl = $('r-tl'); if (!tl) return; el = document.createElement('div'); el.id = 'r-task'; el.className = 'glass dungeon-only r-misc'; tl.appendChild(el); } el.hidden = false;
    const h = tk.t / HOUR, over = h > tk.limitH;
    el.innerHTML = '<span>委託 <b>' + (tk.kind === 'patrol' ? '第 ' + Math.min(tk.deepest, tk.floors) + '／' + tk.floors + ' 層' : (run.kills + (tk.kills0 || 0)) + '／' + tk.need + ' 隻') + '</b></span><span' + (over ? ' style="color:#FF7A6A"' : '') + '>時間 <b>' + h.toFixed(1) + '／' + tk.limitH + '</b> 小時</span>';
  };
  const hp0 = R.hitProp;
  R.hitProp = (p, dmg, by) => { const was = p && p.alive; hp0(p, dmg, by); const tk = W().run && W().run.task; if (tk && was && !p.alive && by) tk.props++; };
  // 一張委託的成績（五軌的前四軌；反饋隔天才有）。h：手上的委託（turn-in）或這一趟的進度
  const record = (h, failed) => {
    const s = S(), hh = h.t / HOUR, done = h.kind === 'patrol' ? Math.min(h.deepest, h.floors) : h.kills;
    const comp = clamp(100 * done / h.need), eff = hh <= h.limitH ? 100 : clamp(100 - 3 * Math.ceil(hh - h.limitH));
    const hurt = failed ? 1 : clamp(100 * h.hp - 15 * h.downAllies), env = clamp(100 - (5 * (h.notice || 0) + 20 * (h.react || 0)) * Math.min(1, 15 / Math.max(1, h.deepest || h.floors || 1)));   // 照走過的層數攤：15 層以內照扣，越深每次扣得越少（卡索級 60～100 層原本幾乎一定 0 分）
    s.tasks = s.tasks || [];
    const t = { id: s.tasks.length + 1, site: h.site, grade: h.grade, letter: h.letter, kind: h.kind, need: h.need, done, limitH: h.limitH, h: Math.round(hh * 10) / 10, s: [comp, eff, hurt, env, null], day: s.day, ready: s.day + 1, failed: !!failed };
    s.tasks.push(t); return t;
  };
  R.heldLine = h => h ? (h.kind === 'patrol' ? '巡查到第 ' + Math.min(h.deepest, h.floors) + '／' + h.floors + ' 層' : '討伐 ' + h.kills + '／' + h.need + ' 隻') + '・用了 ' + (Math.round(h.t / HOUR * 10) / 10) + '／' + h.limitH + ' 小時' + (h.trips > 1 ? '・下去了 ' + h.trips + ' 趟' : '') : '';
  // 放棄手上的委託：記為失敗、沒有報酬（扣住的報酬也沒了）
  R.dropHeldTask = () => { const s = S(), h = s.heldTask; if (!h) return; const t = record(h, true); t.rkTag = 1; t.dropped = 1; s.heldTask = null; R.save(); R.toast && R.toast('放棄了「' + h.site + '」的委託（記為失敗）。', '#FF9A6A'); };
  // 到公會繳交：打成績、付扣住的報酬
  R.turnInTask = () => {
    const s = S(), h = s.heldTask; if (!h) return;
    const t = record(h, false); t.rkTag = 1; if (h.rankExam) t.rankExam = h.rankExam; if (h.boss) t.boss = 1;
    s.gold += h.pay || 0; s.heldTask = null;
    if (h.pact && h.pact.pts && t.s[0] >= 60 && R.awardTitle) R.awardTitle('first');   // 加注條款的稱號：原本回到地面就看完成度（pact.js），改成繳交的時候看
    R.save(); R.sfx && R.sfx('coin');
    return t;
  };
  const endTask = (failed) => {
    const run = W().run, tk = run && run.task, s = S(), P = W().P; if (!tk || tk.posted) return; tk.posted = 1;
    const prev = s.heldTask && s.heldTask.siteId === run.site.id ? s.heldTask : null;
    const h = { siteId: run.site.id, site: run.site.name, grade: run.grade.id, letter: tk.letter, kind: tk.kind, need: tk.need, floors: tk.floors, limitH: tk.limitH, t: tk.t, props: tk.props, deepest: tk.deepest,
      kills: run.kills + (tk.kills0 || 0), react: (run.reactCount || 0) + (tk.react0 || 0), notice: (run.noticeCount || 0) + (tk.notice0 || 0), hp: P ? P.hp / P.hpMax : 1, downAllies: (W().allies || []).filter(a => a.downed).length,
      pay: prev ? prev.pay || 0 : 0, day0: prev ? prev.day0 : s.day, trips: (prev ? prev.trips || 1 : 0) + 1, rankExam: tk.rankExam, boss: (prev && prev.boss) || !!run.bossDown, pact: run.pact || null };
    // 遺跡的委託：回到地面先記在手上，到公會繳交才算（倒下＝失敗，馬上記；狩獵場照舊馬上記）
    if (!failed && run.site.kind === 'ruin') { s.heldTask = h; R.save(); return; }
    if (prev) s.heldTask = null;
    record(h, failed); R.save();
  };
  const ex0 = R.extract;
  R.extract = how => { const run = W().run; if (run && !run.done) endTask(false); return ex0(how); };
  const pd0 = R.onPlayerDown;
  R.onPlayerDown = () => { const run = W().run; if (run && !run.done) endTask(true); return pd0(); };
  // 結算的畫面：只說實際做了什麼，成績要等調查
  const rs0 = R.results;
  R.results = (ok, full, lost) => {
    const r0 = W().run;
    if (r0 && r0.free && ok && !r0.freePaid) { r0.freePaid = 1; S().gold -= (r0.reward || 0) - (r0.share || 0); r0.reward = 0; r0.share = 0; R.save(); }   // 不接委託：公會不付報酬
    rs0(ok, full, lost);
    if (r0 && r0.free) { const b = $('r-sheet'); if (b) b.querySelectorAll('p').forEach(p => { if (p.innerHTML.includes('公會的委託報酬')) p.innerHTML = p.innerHTML.replace(/公會的委託報酬：[^<]*/, '沒有接委託：沒有委託報酬'); }); }
    const s = S(), t = s.tasks && s.tasks[s.tasks.length - 1], run = W().run; if (!t || t.board || !run || !run.task || t.day !== s.day) return;   /* board：委託板的（questboard.js）不是這一趟的 */
    const box = $('r-sheet'); if (!box) return;
    const p = document.createElement('p'); p.className = 'note';
    p.textContent = '委託回報：' + (t.kind === 'patrol' ? '巡查到第 ' + t.done + '／' + t.need + ' 層' : '討伐 ' + t.done + '／' + t.need + ' 隻') + '・用了 ' + t.h + '／' + t.limitH + ' 小時。任務成績要等專員調查，明天以後到公會登記處的勇者證查詢。';
    const row = box.querySelector('.row'); if (row) box.insertBefore(p, row); else box.appendChild(p);
  };

  const ae0 = R.askExtract;
  R.askExtract = () => { ae0(); const run = W().run, b = $('r-sheet'); if (run && run.free && b) b.querySelectorAll('p.note').forEach(p => { p.innerHTML = p.innerHTML.replace('回去後公會會付委託報酬。', '這一趟沒有接委託，沒有委託報酬。'); }); };

  // ---------- 隔天：反饋評分、登錄到勇者證 ----------
  const post = () => {
    const s = S(); if (!s || !s.tasks) return 0; let n = 0;
    s.tasks.forEach(t => {
      if (t.s[4] != null || t.ready > s.day) return;
      // 反饋：民眾覺得威脅變少、生態慢慢恢復——跟完成度、環境有關；公會自己調查來的遺跡委託起伏比較小
      t.s[4] = clamp(58 + 0.25 * t.s[0] + 0.15 * t.s[3] + (Math.random() - 0.5) * 12 - (t.failed ? 20 : 0));
      t.avg = Math.round(t.s.reduce((a, b) => a + b, 0) / 5); n++;
    });
    if (n) R.save();
    return n;
  };
  const nd0 = R.onNewDay;
  R.onNewDay = () => { nd0(); const n = post(); if (n) setTimeout(() => R.toast && R.toast('公會登錄了 ' + n + ' 件任務成績到勇者證', '#E8C04A'), 1500); };
  R.taskAverage = () => { const s = S(), ts = (s && s.tasks || []).filter(t => t.avg != null); return ts.length ? Math.round(ts.reduce((a, t) => a + t.avg, 0) / ts.length) : null; };

  // ---------- 公會的勇者證：任務成績 ----------
  const bar = v => '<span class="ft-bar"><i style="width:' + v + '%"></i></span>';
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f); post();
    const body = $('hub-body'), card = body && body.querySelector('.hero-card'), s = S(); if (!card || !s) return;
    const ts = (s.tasks || []), done = ts.filter(x => x.avg != null), wait = ts.length - done.length, avg = R.taskAverage();
    if (s.heldTask) {
      const h = s.heldTask, tb = document.createElement('div'); tb.className = 'ft-box ti-box';
      tb.innerHTML = '<h3>繳交委託</h3><p><b>' + esc(h.letter) + ' 級・' + esc(h.site) + '</b>：' + esc(R.heldLine(h)) + '</p><p class="note">繳交之後，專員照五軌制打分數（隔天登錄到勇者證）；委託報酬 <b>' + (h.pay || 0) + '</b> 費拉現在付。還沒做完的話，也可以再下去繼續。</p>'
        + '<div class="row"><button type="button" class="btn gold" id="ti-go">繳交委託（領 ' + (h.pay || 0) + ' 費拉）</button><button type="button" class="btn" id="ti-drop">放棄這張委託</button></div>';
      card.after(tb);
      tb.querySelector('#ti-go').onclick = () => { const t0 = R.turnInTask(); R.hub(t, f); if (t0) R.toast && R.toast('繳交了「' + t0.site + '」的委託。成績明天以後登錄到勇者證。', '#E8C04A'); };
      tb.querySelector('#ti-drop').onclick = () => { if (!confirm('放棄這張委託？會記為失敗，扣住的報酬也拿不到。')) return; R.dropHeldTask(); R.hub(t, f); };
    }
    const box = document.createElement('div'); box.className = 'ft-box';
    box.innerHTML = '<h3>任務成績（五軌制）</h3><p class="note">成績＝完成度、效率、創傷、環境、反饋五項的平均。' + (done.length ? '總平均 <b>' + avg + '%</b>（' + done.length + ' 件）' : '還沒有登錄的成績。') + (wait ? '・調查中 ' + wait + ' 件（明天以後登錄）' : '') + '</p>'
      + (done.length ? '<div class="ft-list">' + done.slice(-8).reverse().map(x => '<div class="ft-row"><b>' + esc(x.letter) + ' 級・' + esc(x.site) + (x.failed ? '（倒下）' : '') + '</b><small>' + esc(R.shortDate ? R.shortDate(R.dateOf ? R.dateOf(x.day) : undefined) : '') + '・成績 <b>' + x.avg + '%</b></small><div class="ft-tracks">' + NAMES.map((n, i) => '<span>' + n + ' ' + x.s[i] + '%' + bar(x.s[i]) + '</span>').join('') + '</div></div>').join('') + '</div>' : '');
    (s.heldTask ? card.nextElementSibling : card).after(box);
  };
  // 樣式
  const css = document.createElement('style');
  css.textContent = '.ft-box{margin:10px 0}.ft-list{display:grid;gap:6px}.ft-row{background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:6px 10px}.ft-row small{display:block;opacity:.8}.ft-tracks{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:2px 10px;font-size:12px;margin-top:4px}.ft-bar{display:block;height:4px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden}.ft-bar i{display:block;height:100%;background:var(--gold,#C9A13A)}';
  document.head.appendChild(css);
})(window.R);
