// 公會的委託書與「任務評判五軌制」（照作者的《公會簡章》第六章第五項）
// - 出發之前先看委託書：遺跡的分級、任務內容（哈米莉亞級是新人段的 F 級「巡查」，其他是「討伐」）、要負責的數量、時限。
//   數量照統籌組的做法定（比實際需要的多一些，勇者不用 100% 也能申請完成）：阿彌勒每層 12 隻、摩爾斯 16 隻、克森特 10 隻、卡索 12 隻。
//   時限：每層 4 小時（遺跡裡一小時＝真實 90 秒，比城裡慢一倍；2026-10-02 以前是 45 秒）。
// - 回到地面＝申請「任務完成」。五軌：
//   完成度：實際／要求（巡查：走到第幾層）；效率：時限內 100%，超過每小時扣 3%，最低 1%；
//   創傷：申請完成時的身體狀況（任務中治療不算，「能使自己在戰後恢復的與戰前無異，也是實力」），倒下＝1%，隊友倒著也扣；
//   環境：打壞的東西、引起佩特拉的反應會扣（巡查不是戰鬥任務，固定 100%）；反饋：專員事後調查民眾和環境的反應。
//   五項平均是這個任務的成績。成績不會馬上知道：專員調查、分館綜合後，隔天才登錄到勇者證（公會登記處查詢）。
// - 存檔：R.S.tasks＝[{ id, site, grade, letter, kind, need, done, limitH, h, s: [完成度, 效率, 創傷, 環境, 反饋], avg, day, ready, failed }]
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const HOUR = 90, K = { amile: 12, mors: 16, kesent: 10, kaso: 12 };   // HOUR：遺跡裡一小時＝真實 90 秒（作者：下遺跡的時間可以慢點；原本 45 秒）
  const clamp = v => Math.max(1, Math.min(100, Math.round(v)));
  const NAMES = ['完成度', '效率', '創傷', '環境', '反饋'];
  R.FIVE_TRACK = NAMES;

  // ---------- 委託書 ----------
  const floorsOf = site => { const g = R.gradeById(site.grade); return Math.max(2, g.floors + (R.TYPES[site.type] && R.TYPES[site.type].floors || 0)); };
  R.taskSpec = site => {
    const g = R.gradeById(site.grade), floors = floorsOf(site), patrol = g.id === 'hamilia';
    return { kind: patrol ? 'patrol' : 'hunt', need: patrol ? floors : Math.max(10, Math.round(floors * (K[g.id] || 12))), limitH: Math.ceil(floors * 4 * (1 + 0.08 * (g.lv - 1))), letter: g.letter || '', floors };
  };
  const specLines = (site, sp) => { const g = R.gradeById(site.grade); return sp.lines || ['任務分級：' + sp.letter + ' 級（' + g.name + '）', sp.kind === 'patrol' ? '任務內容：巡查（走到最深處，第 ' + sp.floors + ' 層）' : '任務內容：討伐遺跡生物 ' + sp.need + ' 隻（討伐令 1433 令）', '時限：' + sp.limitH + ' 小時（超過每小時扣 3% 的效率分）']; };
  R.taskExtras = [];   // 加注條款之類的：{ html(site), bind(box, site) }
  const hubOpen = () => { const h = $('hub'); return h && !h.hidden; };
  const modal = (html, foot) => {
    if (hubOpen()) { $('hub-sheet').innerHTML = html + foot; $('hub-modal').hidden = false; return { box: $('hub-sheet'), close: () => { $('hub-modal').hidden = true; } }; }
    R.sheet(html, foot); return { box: $('r-sheet'), close: R.closeSheet };
  };
  // 外層的包裝（main.js、gtamap.js……）只傳 id，所以「已經看過委託書」用旗子記，不用第二個參數
  let okId = null, freeId = null;   // freeId：不接委託，自己下去（沒有委託報酬、不打成績，加注條款也不算）
  const sr0 = R.startRun;
  R.startRun = id => {
    const s = S(), site = R.SITES.find(x => x.id === id);
    if (okId === id) { okId = null; return sr0(id); }
    if (!site || (site.kind !== 'ruin' && site.kind !== 'hunt') || !s) return sr0(id);   // hunt：湯山村後山的狩獵場（hunt.js）
    if (s.banUntil > s.day || site.id === 'kanko' || site.grade === 'kaso') return sr0(id);   // 停權（punish.js 會說明）、觀光的動物園、卡索級的特別討伐令（kaso.js）不用這張委託書
    const sp = R.taskSpec(site);
    const m = modal('<p class="kicker">公會討伐令・委託書</p><h2>' + esc(site.name) + '</h2>' + specLines(site, sp).map(l => '<p>' + esc(l) + '</p>').join('')
      + '<p class="note">回到地面就是申請「任務完成」。專員會照五軌制（完成度、效率、創傷、環境、反饋）打分數，隔天登錄到勇者證，在公會的登記處查得到。</p>'
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
    const free = freeId === id; freeId = null;
    const r = sr1(id), run = W().run;
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
    el.innerHTML = '<span>委託 <b>' + (tk.kind === 'patrol' ? '第 ' + Math.min(tk.deepest, tk.floors) + '／' + tk.floors + ' 層' : run.kills + '／' + tk.need + ' 隻') + '</b></span><span' + (over ? ' style="color:#FF7A6A"' : '') + '>時間 <b>' + h.toFixed(1) + '／' + tk.limitH + '</b> 小時</span>';
  };
  const hp0 = R.hitProp;
  R.hitProp = (p, dmg, by) => { const was = p && p.alive; hp0(p, dmg, by); const tk = W().run && W().run.task; if (tk && was && !p.alive && by) tk.props++; };
  const endTask = (failed) => {
    const run = W().run, tk = run && run.task, s = S(), P = W().P; if (!tk || tk.posted) return; tk.posted = 1;
    const h = tk.t / HOUR, done = tk.kind === 'patrol' ? Math.min(tk.deepest, tk.floors) : run.kills;
    const comp = clamp(100 * done / tk.need), eff = h <= tk.limitH ? 100 : clamp(100 - 3 * Math.ceil(h - tk.limitH));
    const downAllies = (W().allies || []).filter(a => a.downed).length;
    const hurt = failed ? 1 : clamp(100 * (P ? P.hp / P.hpMax : 1) - 15 * downAllies);
    const env = tk.kind === 'patrol' ? 100 : clamp(100 - 2 * tk.props - 15 * (run.reactCount || 0));
    s.tasks = s.tasks || [];
    s.tasks.push({ id: s.tasks.length + 1, site: run.site.name, grade: run.grade.id, letter: tk.letter, kind: tk.kind, need: tk.need, done, limitH: tk.limitH, h: Math.round(h * 10) / 10, s: [comp, eff, hurt, env, null], day: s.day, ready: s.day + 1, failed: !!failed });
    R.save();
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
    const s = S(), t = s.tasks && s.tasks[s.tasks.length - 1], run = W().run; if (!t || !run || !run.task || t.day !== s.day) return;
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
    const box = document.createElement('div'); box.className = 'ft-box';
    box.innerHTML = '<h3>任務成績（五軌制）</h3><p class="note">成績＝完成度、效率、創傷、環境、反饋五項的平均。' + (done.length ? '總平均 <b>' + avg + '%</b>（' + done.length + ' 件）' : '還沒有登錄的成績。') + (wait ? '・調查中 ' + wait + ' 件（明天以後登錄）' : '') + '</p>'
      + (done.length ? '<div class="ft-list">' + done.slice(-8).reverse().map(x => '<div class="ft-row"><b>' + esc(x.letter) + ' 級・' + esc(x.site) + (x.failed ? '（倒下）' : '') + '</b><small>' + esc(R.shortDate ? R.shortDate(R.dateOf ? R.dateOf(x.day) : undefined) : '') + '・成績 <b>' + x.avg + '%</b></small><div class="ft-tracks">' + NAMES.map((n, i) => '<span>' + n + ' ' + x.s[i] + '%' + bar(x.s[i]) + '</span>').join('') + '</div></div>').join('') + '</div>' : '');
    card.after(box);
  };
  // 樣式
  const css = document.createElement('style');
  css.textContent = '.ft-box{margin:10px 0}.ft-list{display:grid;gap:6px}.ft-row{background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:6px 10px}.ft-row small{display:block;opacity:.8}.ft-tracks{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:2px 10px;font-size:12px;margin-top:4px}.ft-bar{display:block;height:4px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden}.ft-bar i{display:block;height:100%;background:var(--gold,#C9A13A)}';
  document.head.appendChild(css);
})(window.R);
