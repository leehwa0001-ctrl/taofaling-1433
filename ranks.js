// 公會階位：六段二十四階（照作者的《公會簡章》第三章；作者 2026-10-03：做，委託照段位開放）
// - 段：新人段、冒險段、討伐段、獵殺段、特攻段、近神段；每段有幾階。存在 R.S.rank = { dan, tier, desig, fire, exam, examFail }。
// - 委託照段位開放：每一段只能接自己那一段的任務分級，加上下一段最高的那一級（「上段勇者要對下段勇者的高評級任務負責」）。
//   遺跡的分級是一個範圍（阿彌勒 E～D、摩爾斯 C～A、克森特 AA～SS……），公會發給你的是這個範圍裡你能接的最高那一級；
//   比範圍最低的高一級，報酬 +15%。接不了的遺跡還是可以「不接委託，自己下去」（guildtask.js），只是沒有報酬。
//   狩獵場（hunt.js）的考核和狩獵委託不受段位限制。
// - 升階：任務數量照簡章除以十（無條件進位，S 級以上除以五），成績看最近 10 件的平均。數量是「這一級以上」的任務都算。
//   討伐段、獵殺段的升階還要「指定討伐」：條件到了，公會下達指定討伐——下一次在委託裡打倒一隻領主體。
//   金鳳階要「火龍討伐」：在委託裡打倒領主體・熔顎蜥。
// - 升段：每段最後一階達到條件，再通過「段位考核」（每個月一次）：
//   冒險段＝狩獵考核合格兩次（hunt.js）；討伐段＝摩爾斯級以上的考核委託 85% 以上；獵殺段＝克森特級的考核委託打倒佩特拉核心、90% 以上；
//   特攻段＝卡索級的特別討伐令 95% 以上。近神段由會長決定（遊戲裡還沒開放）。
// - 舊存檔：照走完過的遺跡給起始的段階（走完過阿彌勒級或 8 級以上＝冒險段，走完過摩爾斯級＝冒險段黃金階，走完過克森特級＝討伐段）。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const LET = ['F', 'E', 'D', 'C', 'B', 'A', 'AA', 'S', 'SS', 'SSS', 'X', 'G'], li = l => LET.indexOf(l);
  const DANS = [
    { name: '新人段', range: ['F'], tiers: ['初心階', '榮心階', '護心階'], desc: '通過勇者考核的新進勇者。負責 F 級的採集、巡邏、搬運。' },
    { name: '冒險段', range: ['E', 'D', 'C'], tiers: ['青銅階', '灰鐵階', '白銀階', '黃金階', '白金階'], desc: '勇者人數最多的段位，負責日常的清剿與狩獵、遺跡。' },
    { name: '討伐段', range: ['B', 'A', 'AA'], tiers: ['黑狼階', '白熊階', '棕鹿階', '紅獅階', '藍鷹階', '金鳳階'], desc: '大部分勇者能抵達的最高段位，負責大型討伐、魔物討伐、遺跡討伐。' },
    { name: '獵殺段', range: ['AA', 'S', 'SS'], tiers: ['火龍階', '鋼龍階', '戰龍階', '龍王階'], desc: '一道厚重的大門：不只要極強的實力，也要極高的聲望與名譽。' },
    { name: '特攻段', range: ['SSS', 'X'], tiers: ['米諾陶', '戈爾貢', '利維坦', '阿特斯'], desc: '勇者中的佼佼者，世界公認的特種單位。' },
    { name: '近神段', range: ['SS', 'SSS', 'X', 'G'], tiers: ['散心階', '斷心階'], desc: '公會面對世界危機時的底牌之一。由會長親自決定。' }
  ];
  // 每一階「往上」的條件（最後一階＝可以報名段位考核的條件）
  const REQ = [
    [{ any: 1, avg: 60 }, { F: 3, avg: 60 }, { F: 8, avg: 70 }],
    [{ D: 4, avg: 65 }, { D: 7, avg: 65 }, { D: 8, C: 3, avg: 70 }, { C: 6, avg: 70 }, { C: 7, avg: 80 }],
    [{ B: 2, avg: 70, desig: 1 }, { B: 4, avg: 70, desig: 1 }, { B: 5, A: 1, avg: 70, desig: 1 }, { B: 7, A: 2, avg: 75, desig: 1 }, { A: 4, AA: 1, avg: 75, desig: 1 }, { B: 10, A: 6, AA: 2, avg: 75, fire: 1 }],
    [{ A: 5, AA: 2, S: 1, avg: 75, desig: 1 }, { A: 6, AA: 3, S: 1, avg: 80, desig: 1 }, { S: 1, SS: 1, avg: 85, desig: 1 }, { S: 2, SS: 1, avg: 90 }],
    [{ SSS: 1, avg: 90 }, { SSS: 1, avg: 95 }, { SSS: 2, X: 1, avg: 95 }, { X: 2, avg: 98 }],
    [{ never: 1 }, { never: 1 }]
  ];
  const EXAM = [
    { name: '冒險段考核', hunt: 1, desc: '湯山村後山的狩獵考核合格兩次（簡章：兩次狩獵任務、團隊任務、體能考核，平均 70%）。' },
    { name: '討伐段考核', grades: ['mors', 'kesent'], need: 85, desc: '報名之後，下一次在摩爾斯級以上的遺跡接的委託就是考核：成績要 85% 以上。' },
    { name: '獵殺段考核', grades: ['kesent'], need: 90, boss: 1, desc: '報名之後，下一次克森特級的委託就是考核：要打倒最深處的佩特拉核心，成績 90% 以上。' },
    { name: '特攻段考核', grades: ['kaso'], need: 95, desc: '提交申請之後，下一次卡索級的特別討伐令就是考核：成績要 95% 以上。' },
    { name: '近神段', never: 1, desc: '阿特斯階的勇者會收到會長直接指派的特殊任務，最後由會長決定。（遊戲裡還沒開放）' }
  ];
  R.RANK_DANS = DANS;

  // ---------- 存檔 ----------
  const rk = () => {
    const s = S(); if (!s) return null; if (s.rank) return s.rank;
    const c = s.cleared || {}, lv = s.classes && s.classes[s.cls] ? s.classes[s.cls].lv : 1;
    s.rank = c.kesent ? { dan: 2, tier: 0 } : c.mors ? { dan: 1, tier: 3 } : (c.amile || lv >= 8) ? { dan: 1, tier: 0 } : { dan: 0, tier: 0 };
    return s.rank;
  };
  const rankName = r => { r = r || rk(); return r ? DANS[r.dan].name + '・' + DANS[r.dan].tiers[r.tier] : ''; };
  R.rankName = rankName;
  const month = () => { const dd = R.today ? R.today() : null; return dd ? dd.y * 100 + dd.m : Math.floor(((S() && S().day) || 0) / 30); };

  // ---------- 委託的分級 ----------
  const OLD = { 'E～D': 'D', 'C～A': 'C', 'AA～SS': 'AA', 'SSS～G': 'SSS' };
  const rangeOf = txt => { const p = String(txt || '').split('～'); if (p.length < 2) return li(p[0]) >= 0 ? [p[0]] : []; const a = li(p[0]), b = li(p[1]); return a < 0 || b < 0 ? [] : LET.slice(a, b + 1); };
  const allowed = dan => { const set = DANS[dan].range.slice(); if (dan > 0) { const pr = DANS[dan - 1].range; set.push(pr[pr.length - 1]); } return set; };
  // 這座遺跡公會會發給你哪一級（null：接不了）
  const letterFor = (g, dan) => { const rg = rangeOf(g.letter), ok = allowed(dan).filter(l => rg.includes(l)); return ok.length ? ok.sort((a, b) => li(b) - li(a))[0] : null; };
  const ts0 = R.taskSpec;
  R.taskSpec = site => {
    const sp = ts0(site), r = rk(); if (!r || !site || site.kind === 'hunt') return sp;
    const g = R.gradeById(site.grade), rg = rangeOf(g.letter); if (!rg.length) return sp;
    const L = letterFor(g, r.dan);
    if (!L) { sp.blocked = '你是' + rankName(r) + '：公會不把 ' + g.letter + ' 級的委託發給這個段位。'; sp.letter = g.letter; return sp; }
    sp.letter = L; sp.range = g.letter; sp.bonusK = 0.15 * (li(L) - li(rg[0]));
    return sp;
  };
  if (R.taskExtras) R.taskExtras.unshift({
    html: (site, sp) => { const r = rk(); if (!r || site.kind === 'hunt') return ''; return '<p class="note rk-note">你的段階：<b>' + esc(rankName(r)) + '</b>。' + (sp.blocked ? '<b style="color:#FF8A7A">' + esc(sp.blocked) + '</b>想進去的話，可以不接委託自己下去（沒有報酬）。' : '這張委託是 <b>' + esc(sp.letter) + ' 級</b>' + (sp.bonusK ? '（比 ' + esc(sp.range) + ' 的最低級高，報酬 +' + Math.round(sp.bonusK * 100) + '%）' : '') + '。') + (r.exam && EXAM[r.dan].grades && EXAM[r.dan].grades.includes(site.grade) && !sp.blocked ? '<br><b style="color:#E8C04A">這一趟是' + esc(EXAM[r.dan].name) + '：成績要 ' + EXAM[r.dan].need + '% 以上' + (EXAM[r.dan].boss ? '，而且要打倒佩特拉核心' : '') + '。</b>' : '') + (r.desig && !sp.blocked ? '<br><b style="color:#E8C04A">指定討伐：' + (r.desig.fire ? '在委託裡打倒領主體・熔顎蜥（火龍討伐）' : '在委託裡打倒一隻領主體') + '。</b>' : '') + '</p>'; },
    bind: (box, site, sp) => { if (!sp.blocked) return; const b = $('tk-go'); if (b) { b.disabled = true; b.title = sp.blocked; b.textContent = '段位不符，接不了'; } }
  });
  // 出發：考核委託做記號
  const sr0 = R.startRun;
  R.startRun = id => {
    const r0 = sr0(id), run = W().run, r = rk();
    if (run && run.task && r && r.exam && !run.task.rankExam) { const ex = EXAM[r.dan]; if (ex.grades && ex.grades.includes(run.grade.id)) { run.task.rankExam = r.dan + 1; setTimeout(() => R.banner && R.banner(ex.name, '成績要 ' + ex.need + '% 以上' + (ex.boss ? '，而且要打倒佩特拉核心' : '') + '。公會的專員跟在後面記錄。'), 3200); } }
    return r0;
  };
  // 回到地面：委託的等級加成、把考核和打倒核心記到任務成績上
  const tag = run => { const s = S(), t = s && s.tasks && s.tasks[s.tasks.length - 1]; if (!t || !run || !run.task || t.day !== s.day || t.rkTag) return; t.rkTag = 1; if (run.task.rankExam) t.rankExam = run.task.rankExam; if (run.bossDown) t.boss = 1; };
  const rs0 = R.results;
  R.results = (ok, full, lost) => {
    const run = W().run, s = S();
    if (run && ok && run.task && run.task.bonusK && !run.rkPaid && run.reward) { run.rkPaid = 1; const extra = Math.round((run.reward - (run.share || 0)) * run.task.bonusK); s.gold += extra; run.reward += extra; R.save(); }
    return rs0(ok, full, lost);
  };
  const ex0 = R.extract;
  R.extract = how => { const run = W().run, r = ex0(how); tag(run); return r; };
  const pd0 = R.onPlayerDown;
  R.onPlayerDown = () => { const run = W().run, r = pd0(); tag(run); return r; };

  // ---------- 升階、升段 ----------
  const done = () => (S().tasks || []).filter(t => t.avg != null && !t.failed);
  const letterOfTask = t => OLD[t.letter] || (li(t.letter) >= 0 ? t.letter : (rangeOf(t.letter)[0] || 'F'));
  const countAtLeast = l => done().filter(t => li(letterOfTask(t)) >= li(l)).length;
  const recentAvg = () => { const ts = (S().tasks || []).filter(t => t.avg != null).slice(-10); return ts.length ? Math.round(ts.reduce((a, t) => a + t.avg, 0) / ts.length) : 0; };
  const reqLines = q => {
    const out = [];
    if (q.never) return [{ ok: false, txt: '由會長決定（遊戲裡還沒開放）' }];
    if (q.any) { const n = done().length; out.push({ ok: n >= q.any, txt: '完成任務 ' + n + '／' + q.any + ' 件' }); }
    LET.forEach(l => { if (q[l]) { const n = countAtLeast(l); out.push({ ok: n >= q[l], txt: l + ' 級以上的任務 ' + n + '／' + q[l] + ' 件' }); } });
    if (q.avg) { const a = recentAvg(); out.push({ ok: a >= q.avg, txt: '最近 10 件的成績平均 ' + a + '%／' + q.avg + '%' }); }
    return out;
  };
  const met = q => reqLines(q).every(x => x.ok);
  const up = (title, sub) => { R.save(); setTimeout(() => { R.banner && R.banner(title, sub); R.sfx && R.sfx('chest'); }, 1800); };
  R.rankCheck = () => {
    const s = S(), r = rk(); if (!s || !r) return;
    // 段位考核的結果（成績隔天才登錄）
    (s.tasks || []).forEach(t => {
      if (!t.rankExam || t.avg == null || t.rkExamDone) return; t.rkExamDone = 1;
      if (r.dan + 1 !== t.rankExam) return; const ex = EXAM[r.dan];
      if (!t.failed && t.avg >= ex.need && (!ex.boss || t.boss)) { r.dan++; r.tier = 0; r.exam = null; r.desig = null; up('晉升' + DANS[r.dan].name, ex.name + '合格（' + t.avg + '%）。現在是' + rankName(r) + '。'); }
      else { r.exam = null; r.examFail = month(); R.save(); setTimeout(() => R.toast && R.toast(ex.name + '不合格（' + t.avg + '%，要 ' + ex.need + '%' + (ex.boss && !t.boss ? '、要打倒佩特拉核心' : '') + '）。下個月再報名。', '#FF9A6A'), 1800); }
    });
    // 自動升階（指定討伐的要等打倒領主體）
    for (let k = 0; k < 30; k++) {
      const tiers = DANS[r.dan].tiers, q = REQ[r.dan][r.tier]; if (!q || r.tier >= tiers.length - 1 || q.never || !met(q)) break;
      if (q.desig) { if (!r.desig) { r.desig = { dan: r.dan, tier: r.tier }; up('公會下達指定討伐', '下一次在委託裡打倒一隻領主體，就升上' + tiers[r.tier + 1] + '。'); } break; }
      r.tier++; up('升階：' + rankName(r), '公會照你的任務成績調整了段階。');
    }
    // 金鳳階：火龍討伐
    { const q = REQ[r.dan][r.tier]; if (q && q.fire && !r.fire && !r.desig && met(q)) { r.desig = { dan: r.dan, tier: r.tier, fire: 1 }; up('段位晉升必要條件：火龍討伐', '在委託裡打倒領主體・熔顎蜥（納瓦・火山遺跡最常見）。'); } }
    R.save();
  };
  const bd0 = R.onBossDown;
  R.onBossDown = e => {
    const r0 = bd0 ? bd0(e) : undefined, run = W().run, r = rk();
    if (r && r.desig && run && run.task && e && e.def && /^領主體/.test(e.def.name || '')) {
      if (r.desig.fire) { if (e.id === 'lavajaw') { r.fire = 1; r.desig = null; up('火龍討伐完成', '可以報名獵殺段考核了（成績也要達標）。'); } }
      else if (r.desig.dan === r.dan && r.desig.tier === r.tier) { r.tier++; r.desig = null; up('指定討伐完成：' + rankName(r), '專員在旁邊記錄了整場戰鬥。'); }
    }
    return r0;
  };
  const nd0 = R.onNewDay;
  R.onNewDay = () => { nd0(); try { R.rankCheck(); } catch (e) { console.warn('[ranks]', e); } };

  // ---------- 公會登記處：勇者證上的段階 ----------
  const examState = r => {
    const tiers = DANS[r.dan].tiers, last = r.tier >= tiers.length - 1, ex = EXAM[r.dan], q = REQ[r.dan][r.tier];
    if (!last || !ex || ex.never) return null;
    const ready = met(q) && (!q.fire || r.fire);
    if (ex.hunt) { const h = (S().hunt || {}).passed || 0; return { ex, ready, can: ready && h >= 2, note: '狩獵考核合格 ' + h + '／2 次' }; }
    return { ex, ready, can: ready && !r.exam && r.examFail !== month(), note: r.exam ? '已經報名了：下一次符合的委託就是考核。' : r.examFail === month() ? '這個月考過了，下個月再報名。' : '' };
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'), card = body && body.querySelector('.hero-card'), r = rk(); if (!card || !r) return;
    try { R.rankCheck(); } catch (e) { console.warn('[ranks]', e); }
    const D = DANS[r.dan], q = REQ[r.dan][r.tier], last = r.tier >= D.tiers.length - 1, es = examState(r);
    const lines = q ? reqLines(q) : [];
    const box = document.createElement('div'); box.className = 'rk-box';
    box.innerHTML = '<h3>公會階位</h3><div class="rk-badge"><b>' + esc(D.name) + '</b><span>' + esc(D.tiers[r.tier]) + '</span></div>'
      + '<p class="note">' + esc(D.desc) + '能接的委託：' + allowed(r.dan).join('、') + ' 級。</p>'
      + '<div class="rk-steps">' + D.tiers.map((n, i) => '<i class="' + (i < r.tier ? 'done' : i === r.tier ? 'cur' : '') + '">' + esc(n) + '</i>').join('') + '</div>'
      + (lines.length ? '<p class="note">' + (last ? (EXAM[r.dan] && !EXAM[r.dan].never ? '報名' + esc(EXAM[r.dan].name) + '的條件' : '') : '升上' + esc(D.tiers[r.tier + 1]) + '的條件') + '：</p><ul class="rk-req">' + lines.map(x => '<li class="' + (x.ok ? 'ok' : '') + '">' + (x.ok ? '✓ ' : '・') + esc(x.txt) + '</li>').join('')
        + (q.desig ? '<li class="' + (r.desig ? 'ok' : '') + '">' + (r.desig ? '✓ 指定討伐已經下達：在委託裡打倒一隻領主體' : '・條件到了公會會下達指定討伐') + '</li>' : '')
        + (q.fire ? '<li class="' + (r.fire ? 'ok' : '') + '">' + (r.fire ? '✓ 火龍討伐完成' : '・火龍討伐：在委託裡打倒領主體・熔顎蜥') + '</li>' : '') + '</ul>' : '')
      + (es ? '<p class="note">' + esc(es.ex.desc) + (es.note ? '<br>' + esc(es.note) : '') + '</p><div class="row"><button type="button" class="btn pri" id="rk-exam"' + (es.can ? '' : ' disabled') + '>' + (es.ex.hunt ? '申請晉升冒險段' : r.dan === 3 ? '提交特攻段申請' : '報名' + esc(es.ex.name)) + '</button></div>' : '');
    card.after(box);
    const b = $('rk-exam'); if (b) b.onclick = () => {
      const st = examState(r); if (!st || !st.can) return;
      if (st.ex.hunt) { r.dan = 1; r.tier = 0; r.desig = null; R.save(); R.hub(); setTimeout(() => R.banner && R.banner('晉升冒險段', '現在是' + rankName(r) + '。公會開放了 D～C 級的委託。'), 200); return; }
      r.exam = { to: r.dan + 1, m: month() }; R.save(); R.hub(); R.toast(st.ex.name + '：報名了。' + st.ex.desc, '#E8C04A');
    };
  };
  const css = document.createElement('style');
  css.textContent = '.rk-box{margin:10px 0}.rk-badge{display:inline-flex;gap:8px;align-items:baseline;padding:4px 12px;border-radius:999px;border:1px solid var(--gold,#C9A13A);background:rgba(201,161,58,.12)}.rk-badge b{color:var(--gold,#C9A13A);font-size:1.1em}'
    + '.rk-steps{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.rk-steps i{font-style:normal;font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg2);border:1px solid var(--line);opacity:.6}.rk-steps i.done{opacity:.9}.rk-steps i.cur{opacity:1;border-color:var(--gold,#C9A13A);color:var(--gold,#C9A13A)}'
    + '.rk-req{margin:4px 0;padding-left:1em;display:grid;gap:2px;font-size:13px}.rk-req li{list-style:none;opacity:.85}.rk-req li.ok{color:#9AE08A;opacity:1}';
  document.head.appendChild(css);
})(window.R);
