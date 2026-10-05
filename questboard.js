// 公會的委託板（2026-10-04 作者：升段改輕鬆一點，不然目前太肝了——改任務就可以了：像是攻略至 XX 層、殺死 XX 隻指定怪物
// （完成兩倍數量算完成任務兩次？），可以同時接取很多任務，然後一起完成）
// - 公會登記處多一塊「委託板」：每天換一批小委託，可以同時接 5 張，一趟遺跡一起做，回登記處一起繳交。
//   運送補給：「移動至某座遺跡的第 N 層」（自己走到那一層；存檔點傳送不算，至少約 4～5 層的路程）；討伐：「打倒指定的遺跡生物 N 隻」（在那個分級以上的遺跡打倒的才算）；採集：「帶回某種素材 N 個」（回到地面才算）。
// - 討伐做到兩倍算兩件、三倍算三件（最多三件）。每一件都登錄到勇者證（五軌：完成度 100、效率看幾天內繳交、創傷和環境 85、反饋隔天），
//   照委託的分級算進升階的件數（ranks.js）。分級照段位發（和討伐令一樣，ranks.js 的 R.taskSpec）。
// - 原本的討伐令（guildtask.js，一次一張、五軌嚴查）照舊；兩種可以一起做。
// - 存檔：R.S.qboard = { day, offers }（今天的委託板）、R.S.quests = [{ qid, kind, siteId, site, mon, mat, grade, letter, need, prog, pay, day0 }]（接了的）。
// 放在 guildtask.js、ranks.js、turnin.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const MAXQ = 5, CAP = 3, PAY = { 1: 40, 2: 110, 3: 260, 4: 560, 5: 1100 };
  const base = id => String(id || '').replace(/_(v\d+|s)$/, '');
  const lvOf = gid => (R.gradeById(gid) || {}).lv || 1;
  const clamp = v => Math.max(1, Math.min(100, Math.round(v)));
  const quests = () => { const s = S(); s.quests = s.quests || []; return s.quests; };
  const monName = id => (R.ENEMIES[id] ? R.ENEMIES[id].name : id), matName = id => (R.MATS[id] ? R.MATS[id].name : id);
  const text = q => q.kind === 'floor' ? '移動至「' + q.site + '」第 ' + q.need + ' 層運送補給' : q.kind === 'kill' ? '討伐「' + monName(q.mon) + '」' + q.need + ' 隻（' + R.gradeById(q.grade).name + '以上的遺跡' + (R.monSites ? R.monSites(q.mon, q.grade) : '') + '）' : '採集「' + matName(q.mat) + '」' + q.need + ' 個（帶回地面）';
  const times = q => q.kind === 'kill' ? Math.min(CAP, Math.floor(q.prog / q.need)) : (q.prog >= q.need ? 1 : 0);
  const cap = q => q.kind === 'kill' ? q.need * CAP : q.need;

  // ---------- 今天的委託板 ----------
  const sites = () => (R.SITES || []).filter(s => s.kind === 'ruin' && s.id !== 'kanko' && s.grade !== 'kaso' && !s.outdoor && R.gradeById(s.grade))
    .map(s => ({ s, sp: R.taskSpec(s) })).filter(x => x.sp && !x.sp.blocked && x.sp.letter);
  const make = (list, out) => {
    const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
    list.slice().sort(() => rnd() - 0.5).slice(0, 3).forEach(({ s: site, sp }) => {
      const fl = R.floorsFor ? R.floorsFor(site) : 5, n = Math.max(Math.min(5, fl), Math.min(fl, Math.round(fl * (0.4 + rnd() * 0.4))));   /* 至少約 4～5 層：老手不能傳到底層就交 */
      out.push({ kind: 'floor', siteId: site.id, site: site.name, grade: site.grade, letter: sp.letter, need: n });
    });
    const gs = [...new Set(list.map(x => x.s.grade))].filter(g => g !== 'hamilia');   // 哈米莉亞級的遺跡生物不主動打人：不出討伐
    for (let i = 0; i < 3 && gs.length; i++) {
      const g = pick(gs), G = R.gradeById(g), pool = (G.pool || []).map(base).filter((v, j, a) => a.indexOf(v) === j && R.ENEMIES[v] && !R.ENEMIES[v].elite && !R.ENEMIES[v].boss && !R.ENEMIES[v].env && v !== 'chochin' && v !== 'gaki');
      if (!pool.length) continue; const mon = pick(pool); if (out.some(q => q.mon === mon)) continue;
      out.push({ kind: 'kill', mon, grade: g, letter: list.find(x => x.s.grade === g).sp.letter, need: 4 + G.lv + Math.round(rnd() * 4) });
    }
    const low = list.filter(x => x.s.grade === 'hamilia' || x.s.grade === 'amile');
    if (low.length) { const x = pick(low), mat = x.s.grade === 'hamilia' ? pick(['herb', 'branch']) : pick(['herb', 'iron', 'crystal']); out.push({ kind: 'gather', mat, grade: x.s.grade, letter: x.sp.letter, need: { branch: 8, herb: 6, iron: 5, crystal: 4 }[mat] }); }
    out.forEach((q, i) => { q.oid = i; q.pay = Math.round(PAY[lvOf(q.grade)] * (q.kind === 'floor' ? 0.5 + 0.06 * q.need : q.kind === 'kill' ? 0.9 : 0.6)); });
  };
  const offers = () => {
    const s = S(), day = s.day || 0, b = s.qboard;
    if (b && b.day === day && b.offers) return b.offers;
    const out = [], list = sites(); if (list.length) (R.withSeed ? R.withSeed(day * 7919 + 13, () => make(list, out)) : make(list, out));
    s.qboard = { day, offers: out }; return out;
  };

  // ---------- 進度 ----------
  const told = (q, before) => {
    const t0 = before >= q.need ? (q.kind === 'kill' ? Math.floor(before / q.need) : 1) : 0, t1 = times(q);
    if (t1 > t0) R.toast && R.toast('委託板：' + text(q) + (t1 > 1 ? '——做到 ' + t1 + ' 倍了（算 ' + t1 + ' 件）' : '——完成了') + '。回公會登記處繳交。', '#E8C04A');
  };
  const ruinRun = run => run && run.site && run.site.kind === 'ruin' && run.site.id !== 'kanko' && run.grade && run.grade.id !== 'hunt';
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by);
    try {
      const run = W().run, qs = S() && S().quests;
      if (was && e.dead && qs && qs.length && ruinRun(run)) { const id = base(e.id); qs.forEach(q => { if (q.kind === 'kill' && q.mon === id && (run.grade.lv || 1) >= lvOf(q.grade) && q.prog < cap(q)) { const b = q.prog; q.prog++; told(q, b); } }); }
    } catch (err) { console.warn('[questboard]', err); }
    return r;
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const r = lf0(f, o);
    try {
      // 存檔點傳送／跟著房主傳送：不算「走過去運送補給」（老手不能傳到底層就交）
      if (o && o.warp) return r;
      const run = W().run, qs = S() && S().quests;
      if (qs && qs.length && ruinRun(run)) {
        const n = run.f0 ? f : f + 1;
        qs.forEach(q => { if (q.kind === 'floor' && q.siteId === run.site.id && n > q.prog) { const b = q.prog; q.prog = Math.min(q.need, n); told(q, b); } });
      }
    } catch (err) { console.warn('[questboard]', err); }
    return r;
  };
  const ex0 = R.extract;
  R.extract = how => {
    const run = W().run, was = run && run.done, r = ex0(how);
    try { const qs = S() && S().quests; if (run && !was && run.done && qs && qs.length && ruinRun(run)) { qs.forEach(q => { if (q.kind === 'gather' && run.mats && run.mats[q.mat]) { const b = q.prog; q.prog = Math.min(q.need, q.prog + run.mats[q.mat]); told(q, b); } }); R.save(); } } catch (err) { console.warn('[questboard]', err); }
    return r;
  };
  // 遺跡裡：左上角列出這一趟做得到的
  const st0 = R.step; let hudT = 0;
  R.step = dt => {
    st0(dt);
    const run = W().run; hudT -= dt; if (hudT > 0) return; hudT = 0.5;
    let el = $('r-qb'); const qs = (S() && S().quests || []).filter(q => ruinRun(run) && (q.kind === 'gather' || (q.kind === 'floor' && q.siteId === run.site.id) || (q.kind === 'kill' && (run.grade.lv || 1) >= lvOf(q.grade))));
    if (!run || run.done || !qs.length) { if (el) el.hidden = true; return; }
    if (!el) { const tl = $('r-tl'); if (!tl) return; el = document.createElement('div'); el.id = 'r-qb'; el.className = 'glass dungeon-only r-misc'; tl.appendChild(el); }
    el.hidden = false;
    el.innerHTML = qs.map(q => '<span>' + (q.kind === 'floor' ? '補給 第 <b>' + q.prog + '／' + q.need + '</b> 層' : q.kind === 'kill' ? esc(monName(q.mon)) + ' <b>' + q.prog + '／' + q.need + '</b>' + (q.prog >= q.need * 2 ? '（×' + times(q) + '）' : '') : esc(matName(q.mat)) + ' <b>' + q.prog + '／' + q.need + '</b>（帶回）') + '</span>').join('');
  };

  // ---------- 繳交：每一件登錄到勇者證 ----------
  const turnIn = q => {
    const s = S(), n = times(q); if (!n) return 0;
    const d = (s.day || 0) - (q.day0 || 0), eff = d <= 5 ? 100 : clamp(100 - 5 * (d - 5));
    s.tasks = s.tasks || [];
    for (let i = 0; i < n; i++) s.tasks.push({ id: s.tasks.length + 1, site: '委託板・' + text(q), grade: q.grade, letter: q.letter, kind: 'board', need: q.need, done: q.need, limitH: 0, h: 0, s: [100, eff, 85, 85, null], day: s.day, ready: (s.day || 0) + 1, failed: false, rkTag: 1, board: 1 });
    s.gold += q.pay * n; s.quests = quests().filter(x => x !== q);
    return n;
  };
  const box = () => {
    const s = S(), qs = quests(), off = offers(), full = qs.length >= MAXQ, ready = qs.filter(q => times(q) > 0);
    const line = q => '<div class="ft-row qb-row"><b>' + esc(q.letter) + ' 級・' + esc(text(q)) + '</b><small>' + (q.kind === 'floor' ? '走到第 ' + q.prog + '／' + q.need + ' 層（存檔點傳送不算）' : q.prog + '／' + q.need + (q.kind === 'kill' && times(q) > 1 ? '（' + times(q) + ' 倍，算 ' + times(q) + ' 件）' : '')) + '・報酬 ' + q.pay + ' 費拉' + (q.kind === 'kill' ? '／件' : '') + '</small>'
      + '<div class="row">' + (times(q) ? '<button type="button" class="btn gold" data-qbin="' + q.qid + '">繳交（' + times(q) + ' 件・' + q.pay * times(q) + ' 費拉）</button>' : '') + '<button type="button" class="mini" data-qbdrop="' + q.qid + '">放棄</button></div></div>';
    const offer = q => '<div class="ft-row qb-row"><b>' + esc(q.letter) + ' 級・' + esc(text(q)) + '</b><small>報酬 ' + q.pay + ' 費拉' + (q.kind === 'kill' ? '／件（做到兩倍算兩件，最多三件）' : '') + '</small><div class="row"><button type="button" class="btn" data-qbtake="' + q.oid + '"' + (full ? ' disabled' : '') + '>接下</button></div></div>';
    return '<h3>委託板</h3><p class="note">小委託可以同時接 ' + MAXQ + ' 張，一趟遺跡一起做，回這裡一起繳交；每一件都登錄到勇者證、算進升階的件數。討伐做到兩倍算兩件（最多三件）。運送補給要自己走過去（存檔點傳送不算），目標大約 4～5 層以上。委託板每天換一批。</p>'
      + (qs.length ? '<p><b>手上的（' + qs.length + '／' + MAXQ + '）</b>' + (ready.length > 1 ? ' <button type="button" class="btn gold" id="qb-all">全部繳交（' + ready.reduce((a, q) => a + times(q), 0) + ' 件）</button>' : '') + '</p><div class="ft-list">' + qs.map(line).join('') + '</div>' : '')
      + '<p><b>今天的委託</b></p>' + (off.length ? '<div class="ft-list">' + off.map(offer).join('') + '</div>' : '<p class="note">今天沒有你的段位能接的委託。</p>');
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try {
      const body = $('hub-body'), card = body && body.querySelector('.hero-card'), s = S(); if (!card || !s) return;
      const el = document.createElement('div'); el.className = 'ft-box qb-box'; el.innerHTML = box(); card.after(el);
      const again = () => { R.save(); R.hub(t, f); };
      el.querySelectorAll('[data-qbtake]').forEach(b => { b.onclick = () => { const off = offers(), i = off.findIndex(q => q.oid === +b.dataset.qbtake); if (i < 0 || quests().length >= MAXQ) return; const q = Object.assign({}, off[i], { qid: Date.now() + '' + i, prog: 0, day0: s.day || 0 }); off.splice(i, 1); quests().push(q); R.sfx && R.sfx('click'); again(); }; });
      el.querySelectorAll('[data-qbdrop]').forEach(b => { b.onclick = () => { s.quests = quests().filter(q => q.qid !== b.dataset.qbdrop); again(); }; });
      el.querySelectorAll('[data-qbin]').forEach(b => { b.onclick = () => { const q = quests().find(x => x.qid === b.dataset.qbin); const n = q ? turnIn(q) : 0; if (n) { R.sfx && R.sfx('coin'); R.toast && R.toast('繳交了 ' + n + ' 件委託。成績明天以後登錄到勇者證。', '#E8C04A'); } again(); }; });
      const all = el.querySelector('#qb-all'); if (all) all.onclick = () => { let n = 0; quests().slice().forEach(q => { n += turnIn(q); }); if (n) { R.sfx && R.sfx('coin'); R.toast && R.toast('繳交了 ' + n + ' 件委託。成績明天以後登錄到勇者證。', '#E8C04A'); } again(); };
    } catch (err) { console.warn('[questboard]', err); }
  };
  const css = document.createElement('style');
  css.textContent = '.qb-row .row{margin-top:4px;gap:6px}#r-qb{display:flex;flex-direction:column;gap:2px;font-size:12px}#r-qb span b{color:#E8C04A}';
  document.head.appendChild(css);
})(window.R);
