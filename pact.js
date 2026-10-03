// 加注條款、稱號（作者：可以自己勾選項，像是回血量減半、怪物血量翻倍、都是精英怪；全部勾起來有成就或稱號，稱號可能有加成）
// 設定上的說法：公會的特殊討伐令本來就可以附條件——勇者自願接下更苛刻的條款，公會照條款加付報酬。
// - 委託書上（guildtask.js 的 R.taskExtras）勾條款；每一條有一到兩級，每級幾點「加注」。上一次勾的會記住。
// - 加注每 1 點：委託報酬 +10%、經驗 +5%、寶箱多開一樣東西的機率 +3%。
// - 稱號：用條款走完遺跡、五軌制成績好，就會拿到稱號；一次戴一個，各有小加成（傷害、暴擊、生命、經驗、報酬、回復）。
// - 存檔：R.S.pact = { sel: {條款: 級}, best: {分級: 最高點數}, got: {稱號: 哪一天}, title: 戴著的稱號 }
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  // [id, 名字, [每一級的說明], [每一級的點數], 效果]
  const TERMS = [
    ['hp', '強化個體', ['遺跡生物的生命 +50%', '遺跡生物的生命 +100%'], [2, 4]],
    ['dmg', '凶暴化', ['遺跡生物的傷害 +40%', '遺跡生物的傷害 +80%'], [2, 4]],
    ['elite', '精英化', ['所有遺跡生物都是精英（生命 +60%、傷害 +20%、更快）'], [5]],
    ['speed', '疾走', ['遺跡生物移動 +25%'], [2]],
    ['heal', '回復減半', ['所有回復（藥水、技能、吸血）減半'], [3]],
    ['nopot', '禁藥', ['不能喝藥水'], [3]],
    ['aware', '敏感', ['佩特拉的注意上升 ×1.5'], [2]],
    ['time', '急件', ['委託的時限減半'], [2]],
    ['more', '增量', ['要討伐的數量 ×1.5'], [1]],
    ['solo', '單獨', ['不能帶隊友'], [2]],
    ['nocry', '背水', ['不能用回歸水晶（要自己走回入口）'], [3]],
    // 2026-10-02 作者：條款可以多一點，像是怪死掉後會變炸彈
    ['bomb', '殉爆', ['遺跡生物倒下 1.5 秒後爆炸（2.5 公尺）', '倒下 1 秒後爆炸（3.5 公尺，更痛）'], [3, 5]],
    ['swarm', '群聚', ['遺跡生物的數量 ×1.5'], [3]],
    ['regen', '再生', ['遺跡生物 3 秒沒被打到，每秒回復 2% 生命'], [2]],
    ['glass', '易傷', ['你受到的傷害 +30%', '你受到的傷害 +60%'], [2, 4]],
    ['nodash', '鈍足', ['翻滾的冷卻 ×2'], [2]]
  ];
  const T = Object.fromEntries(TERMS.map(t => [t[0], t]));
  const MAXPTS = TERMS.reduce((a, t) => a + t[3][t[3].length - 1], 0);
  const ptsOf = sel => Object.keys(sel || {}).reduce((a, k) => a + (sel[k] && T[k] ? T[k][3][sel[k] - 1] : 0), 0);
  const pact = () => { const s = S(); s.pact = s.pact || { sel: {}, best: {}, got: {}, title: null }; return s.pact; };
  const cur = () => { const run = W().run; return run && run.pact && !run.done ? run.pact : null; };
  const on = k => { const p = cur(); return p ? p.sel[k] || 0 : 0; };

  // ---------- 稱號 ----------
  // [id, 名字, 怎麼拿到, 加成說明, 加成]
  const TITLES = [
    ['first', '加注者', '第一次帶著加注條款完成委託（完成度 60% 以上）', '委託報酬 +3%', { pay: 0.03 }],
    ['ten', '十注', '加注 10 點以上，委託做到六成以上回來（或走完遺跡）', '經驗值 +4%', { xp: 0.04 }],
    ['twenty', '二十注', '加注 20 點以上，委託做到六成以上回來（或走完遺跡）', '傷害 +4%', { dmg: 0.04 }],
    ['nopot', '不飲', '用「禁藥」，委託做到六成以上回來（或走完遺跡）', '回復 +6%', { heal: 0.06 }],
    ['back', '背水者', '用「背水」，委託做到六成以上回來（或走完遺跡）', '生命 +4%', { hp: 0.04 }],
    ['wolf', '孤狼', '用「單獨」在摩爾斯級以上，委託做到六成以上回來（或走完遺跡）', '傷害 +3%', { dmg: 0.03 }],
    ['elite', '精英獵人', '用「精英化」，委託做到六成以上回來（或走完遺跡）', '暴擊率 +3%', { crit: 0.03 }],
    ['full_amile', '滿注・阿彌勒', '全部條款最高級，走完阿彌勒級遺跡', '傷害 +3%', { dmg: 0.03 }],
    ['full_mors', '滿注・摩爾斯', '全部條款最高級，走完摩爾斯級遺跡', '傷害 +4%、生命 +3%', { dmg: 0.04, hp: 0.03 }],
    ['full_kesent', '滿注・克森特', '全部條款最高級，走完克森特級遺跡', '傷害 +5%、生命 +5%', { dmg: 0.05, hp: 0.05 }],
    ['perfect', '完美委託', '一件任務的五軌成績每一項都 95% 以上', '委託報酬 +5%', { pay: 0.05 }],
    ['model', '模範勇者', '十件以上的任務、成績總平均 90% 以上', '經驗值 +6%', { xp: 0.06 }]
  ];
  const TT = Object.fromEntries(TITLES.map(t => [t[0], t]));
  R.PACT_TERMS = TERMS; R.TITLES = TITLES;
  const tb = k => { const t = TT[pact().title]; return t && pact().got[t[0]] ? t[4][k] || 0 : 0; };
  const award = id => { const p = pact(); if (p.got[id] || !TT[id]) return; p.got[id] = S().day + 1; if (!p.title) p.title = id; R.save(); setTimeout(() => R.banner ? R.banner('拿到稱號「' + TT[id][1] + '」', TT[id][2] + '・' + TT[id][3] + '（公會登記處可以換戴）') : R.toast('拿到稱號「' + TT[id][1] + '」'), 1200); };
  R.awardTitle = award;   // 別的檔案（例如 hunt.js 的狩獵考核）給稱號
  R.addTitle = t => { if (!TT[t[0]]) { TITLES.push(t); TT[t[0]] = t; } };
  R.titleName = () => { const t = TT[pact().title]; return t && pact().got[t[0]] ? t[1] : ''; };

  // ---------- 委託書上的條款 ----------
  const sheet = (site, sp) => {
    const p = pact(), s = S(), sel = p.sel, party = (s.party || []).length, pts = ptsOf(party ? Object.assign({}, sel, { solo: 0 }) : sel), best = p.best[site.grade] || 0;   // 隊伍裡有人：「單獨」出發時會被拿掉，這裡就不算它
    return '<div id="pact-box"><h3>加注條款</h3><p class="note">自願接下更苛刻的條款，公會照條款加付報酬。加注每 1 點：報酬 +10%、經驗 +5%、寶箱多開一樣的機率 +3%。</p><div class="pact-list">'
      + TERMS.map(([id, name, lv, pt]) => { const v = sel[id] || 0, dis = id === 'solo' && party; return '<div class="pact-row' + (v ? ' on' : '') + '"><b>' + esc(name) + '</b><small>' + esc(v ? lv[v - 1] : lv.join('／')) + (dis ? (v ? '<b style="color:#FF9A7A">（隊伍裡有人：這一趟不算，點數也不算）</b>' : '（隊伍裡有人，不能選）') : '') + '</small><div class="pact-lv">' + ['不加'].concat(lv.map((_, i) => (lv.length > 1 ? (i ? '二級' : '一級') : '加') + ' ' + pt[i] + ' 點')).map((n, i) => '<button type="button" class="mini' + (v === i ? ' gold' : '') + '" data-pact="' + id + ':' + i + '"' + (dis && i ? ' disabled' : '') + '>' + n + '</button>').join('') + '</div></div>'; }).join('')
      + '</div><p class="pact-sum">加注 <b>' + pts + '</b>／' + MAXPTS + ' 點' + (pts ? '・報酬 +' + pts * 10 + '%・經驗 +' + pts * 5 + '%' : '') + (best ? '・這個分級的最高紀錄：' + best + ' 點' : '') + (pts === MAXPTS ? '・<b>滿注</b>' : '') + '</p></div>';
  };
  if (R.taskExtras) R.taskExtras.push({
    html: (site, sp) => sheet(site, sp),
    bind: (box, site, sp) => {
      const wire = () => box.querySelectorAll('[data-pact]').forEach(b => { b.onclick = () => { const [id, v] = b.dataset.pact.split(':'); pact().sel[id] = +v; if (!+v) delete pact().sel[id]; R.save(); const old = $('pact-box'); if (old) { const t = document.createElement('div'); t.innerHTML = sheet(site, sp); old.replaceWith(t.firstChild); wire(); } }; });
      wire();
    }
  });

  // ---------- 出發：記下這一趟的條款 ----------
  const sr0 = R.startRun;
  R.startRun = id => {
    const r = sr0(id), run = W().run;
    if (run && run.task && !run.pact) {
      const sel = Object.assign({}, pact().sel); if ((S().party || []).length) delete sel.solo;
      const pts = ptsOf(sel);
      if (pts) {
        run.pact = { sel, pts };
        if (sel.time) run.task.limitH = Math.ceil(run.task.limitH / 2);
        if (sel.more && run.task.kind === 'hunt') run.task.need = Math.round(run.task.need * 1.5);
        setTimeout(() => R.toast && R.toast('加注條款 ' + pts + ' 點：' + Object.keys(sel).map(k => T[k][1]).join('、'), '#FF9A6A'), 4200);
      }
    }
    return r;
  };

  // ---------- 條款的效果 ----------
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se0(id, x, z, room, o), p = cur(); if (!e || !p || e.def.human) return e;
    let hk = [1, 1.5, 2][p.sel.hp || 0], dk = [1, 1.4, 1.8][p.sel.dmg || 0], sk = p.sel.speed ? 1.25 : 1;
    if (p.sel.elite && !e.def.boss && !e.def.elite) { hk *= 1.6; dk *= 1.2; sk *= 1.1; e.pactElite = 1; }
    e.hp *= hk; e.hpMax *= hk; e.dmg *= dk; e.speed *= sk;
    // 群聚：一層開始放遺跡生物的時候，一半的機會多放一隻一樣的
    if (swarming && on('swarm') && !e.def.boss && !e.def.elite && !cloning && Math.random() < 0.5) {
      cloning = true; try { const [cx, cz] = R.nearestFloor ? R.nearestFloor(x + (Math.random() - 0.5) * 2.4, z + (Math.random() - 0.5) * 2.4) : [x, z]; const c = R.spawnEnemy(id, cx, cz, room, o); if (c && e.dormant) { c.dormant = true; c.aggro = false; } } finally { cloning = false; }
    }
    return e;
  };
  let swarming = false, cloning = false;
  const pf0 = R.populateFloor;
  if (pf0) R.populateFloor = (...a) => { swarming = true; try { return pf0(...a); } finally { swarming = false; } };
  // 殉爆：倒下的地方先亮出範圍，過一下爆炸；打到你和隊友（翻滾躲得掉）
  let fuses = [];
  const ke1 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke1(e, by), lv = on('bomb');
    if (lv && was && e.dead && !e.def.human && !e.def.boss && e.id !== 'petra') {
      const rad = lv > 1 ? 3.5 : 2.5, t = lv > 1 ? 1 : 1.5;
      fuses.push({ x: e.x, z: e.z, rad, t, dmg: (e.dmg || e.def.dmg || 10) * (lv > 1 ? 1.8 : 1.2) });
      R.fx('mark', e.x, 0, e.z, { r: rad, t, color: '#FF5A2A' });
    }
    return r;
  };
  const lf1 = R.loadFloor;
  R.loadFloor = (...a) => { fuses = []; return lf1(...a); };
  const st1 = R.step;
  R.step = dt => {
    st1(dt);
    const w = W(), run = w.run; if (!run) { fuses = []; return; }
    if (fuses.length) {
      fuses.forEach(f => { f.t -= dt; });
      fuses.filter(f => f.t <= 0).forEach(f => {
        R.fx('boom', f.x, 0.3, f.z, { r: f.rad, color: '#FF7A2A' }); R.shake && R.shake(0.25); R.sfx && R.sfx('boom');
        const P = w.P; if (P && !P.dead && Math.hypot(P.x - f.x, P.z - f.z) < f.rad + 0.4) R.hurtPlayer(f.dmg, null);
        (w.allies || []).forEach(a => { if (!a.downed && Math.hypot(a.x - f.x, a.z - f.z) < f.rad + 0.4) R.hurtAlly(a, f.dmg, null); });
      });
      fuses = fuses.filter(f => f.t > 0);
    }
    // 再生：3 秒沒被打到就慢慢回血
    if (on('regen')) (w.enemies || []).forEach(e => { if (e.dead || e.hp >= e.hpMax) return; if (run.t - (e.hitAt || 0) > 3) e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.02 * dt); });
  };
  const he1 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { if (e) { const run = W().run; e.hitAt = run ? run.t : 0; } return he1(e, raw, o); };
  const ah1 = R.allyHit;
  if (ah1) R.allyHit = (e, dmg, by) => { if (e) { const run = W().run; e.hitAt = run ? run.t : 0; } return ah1(e, dmg, by); };
  // 易傷、鈍足
  const hp1 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => hp1(raw * [1, 1.3, 1.6][on('glass')], src, o);
  const dg1 = R.dodge;
  R.dodge = () => { const P = W().P; if (P && on('nodash') && !P.pactNodash && P.dodgeCdMax) { P.pactNodash = 1; P.dodgeCdMax *= 2; } return dg1(); };
  const hl0 = R.healP;
  R.healP = (v, quiet) => hl0(v * (on('heal') ? 0.5 : 1) * (1 + tb('heal')), quiet);
  const dr0 = R.drink;
  R.drink = k => { if (on('nopot')) { R.toast('加注條款「禁藥」：這一趟不能喝藥水。'); return; } return dr0(k); };
  const aw0 = R.addAware;
  R.addAware = (v, why) => aw0(on('aware') ? v * 1.5 : v, why);
  const ax0 = R.askExtract;
  R.askExtract = () => { if (on('nocry')) { R.toast('加注條款「背水」：不能用回歸水晶，要自己走回入口。'); return; } return ax0(); };
  // 獎勵：經驗、寶箱
  const gx0 = R.gainXp;
  R.gainXp = v => { const p = cur(), k = (p ? p.pts * 0.05 : 0) + tb('xp'); return gx0(k ? Math.round(v * (1 + k)) : v); };
  const rc0 = R.rollChest;
  R.rollChest = (g, floor, cls, tier) => { const out = rc0(g, floor, cls, tier), p = cur(); if (g > 0 && p && Math.random() < p.pts * 0.03) { const more = rc0(g, floor, cls, tier).find(o => o.item); if (more) out.push(more); } return out; };
  // 稱號的加成
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => { const P = cp0(cls); try { P.dmgMult *= 1 + tb('dmg'); P.hpMax = Math.round(P.hpMax * (1 + tb('hp'))); if (P.ws) P.ws.crit += tb('crit'); } catch (e) { } return P; };

  // ---------- 回來：加付報酬、紀錄、稱號 ----------
  const ex0 = R.extract;
  R.extract = how => {
    const run = W().run, s = S(); if (!run || run.done) return ex0(how);
    const before = (s.cleared || {})[run.grade.id] || 0, g0 = s.gold;
    const r = ex0(how);
    const full = ((s.cleared || {})[run.grade.id] || 0) > before, p = run.pact, pay = (p ? p.pts * 0.1 : 0) + tb('pay');
    if (pay && run.reward) { run.pactBonus = Math.round(run.reward * pay); s.gold += run.pactBonus; }
    // 完成度：這一趟委託自己的進度（2026-10-04：委託改成回公會繳交才打成績以後，s.tasks 最後一筆不是這一趟的，會拿到別的委託的成績）
    const tk = run.task, comp = tk && tk.need ? Math.round(100 * (tk.kind === 'patrol' ? Math.min(tk.deepest || 0, tk.floors || tk.need) : (run.kills || 0) + (tk.kills0 || 0)) / tk.need) : 0;
    if (p) {
      const pp = pact(), g = run.grade.id;
      if (full || comp >= 60) pp.best[g] = Math.max(pp.best[g] || 0, p.pts);
      if (full) { pp.bestFull = pp.bestFull || {}; pp.bestFull[g] = Math.max(pp.bestFull[g] || 0, p.pts); }
      if (comp >= 60) award('first');
      // 2026-10-04 作者：用孤單跟禁藥闖很多次也沒拿到——層數加深以後「走完」太難，改成委託做到六成以上回來就算（滿注的稱號還是要走完）
      if (full || comp >= 60) {
        if (p.pts >= 10) award('ten'); if (p.pts >= 20) award('twenty');
        if (p.sel.nopot) award('nopot'); if (p.sel.nocry) award('back'); if (p.sel.elite) award('elite');
        if (p.sel.solo && run.grade.lv >= 3) award('wolf');
      }
      if (full && p.pts === MAXPTS && TT['full_' + g]) award('full_' + g);
    }
    R.save();
    if (run.pactBonus) setTimeout(() => { const box = $('r-sheet'); if (!box) return; const el = document.createElement('p'); el.className = 'note'; el.textContent = (p ? '加注條款 ' + p.pts + ' 點' : '稱號') + '：公會加付 ' + run.pactBonus + ' 費拉。'; const row = box.querySelector('.row'); if (row) box.insertBefore(el, row); }, 50);
    return r;
  };
  // 五軌成績登錄之後：完美委託、模範勇者
  const nd0 = R.onNewDay;
  R.onNewDay = () => { nd0(); const s = S(); if (!s || !s.tasks) return; const ok = s.tasks.filter(t => t.avg != null); if (ok.some(t => t.s.every(v => v >= 95))) award('perfect'); if (ok.length >= 10 && R.taskAverage && R.taskAverage() >= 90) award('model'); };

  // ---------- 公會登記處：稱號 ----------
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'), card = body && body.querySelector('.hero-card'); if (!card) return;
    const p = pact(), name = R.titleName(); const info = card.querySelector('div'); if (info && name) { const el = document.createElement('small'); el.className = 'tag'; el.textContent = '稱號：' + name; info.insertBefore(el, info.children[1] || null); }
    const box = document.createElement('div'); box.className = 'ft-box';
    { const bs = Object.values(p.best || {}); if (bs.some(v => v >= 10)) award('ten'); if (bs.some(v => v >= 20)) award('twenty'); }   // 2026-10-04 條件放寬以前的紀錄：補發
    box.innerHTML = '<h3>稱號（' + Object.keys(p.got).length + '／' + TITLES.length + '）</h3><p class="note">一次戴一個稱號。加注條款的最高紀錄（委託做到六成以上回來，或走完遺跡）：' + (['amile', 'mors', 'kesent'].map(g => R.gradeById(g).name + ' ' + (p.best[g] || 0) + ' 點' + ((p.bestFull || {})[g] ? '（走完 ' + p.bestFull[g] + ' 點）' : '')).join('・')) + '（滿注 ' + MAXPTS + ' 點；滿注的稱號要走完）</p><div class="ft-list">'
      + TITLES.map(([id, n, how, bonus]) => { const got = p.got[id]; return '<div class="ft-row' + (got ? '' : ' locked') + '"><b>' + (got ? esc(n) : '？？？') + '</b><small>' + esc(how) + '・' + esc(bonus) + '</small>' + (got ? (p.title === id ? '<span class="tag">戴著</span>' : '<button type="button" class="mini" data-title="' + id + '">戴上</button>') : '') + '</div>'; }).join('') + '</div>';
    const after = body.querySelector('.ft-box') || card; after.after(box);
    box.querySelectorAll('[data-title]').forEach(b => { b.onclick = () => { p.title = b.dataset.title; R.save(); R.hub(); }; });
  };
  const css = document.createElement('style');
  css.textContent = '.pact-list{display:grid;gap:4px}.pact-row{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:center;background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:5px 8px}.pact-row.on{border-color:#FF9A6A}.pact-row small{opacity:.85}.pact-lv{grid-column:1/-1;display:flex;gap:4px;flex-wrap:wrap}.pact-sum{margin-top:6px}.ft-row.locked{opacity:.55}';
  document.head.appendChild(css);
})(window.R);
