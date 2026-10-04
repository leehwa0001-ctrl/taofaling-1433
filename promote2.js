// 二次轉職（2026-10-04 作者：新增一個二次轉職，也可以上架諧鳴為法師的二轉的派系，諧鳴有五種派系）
// - 條件：職業等級 40、已經轉職、公會段位討伐段以上、完成要選的那一個的指定試煉（見下面），
//   再交魔力核心 3 顆、高純度魔力水晶 2 個。存在 R.S.classes[職業]：trial2（1＝報名了、2＝通過了）、adv2（選了哪一個）。
// - 選項：
//   覺醒（每個職業都有）：走原本的轉職路線再往上——傷害 +12%、生命 +10%、技能冷卻 −8%；
//     路線上最強的那一招多一個「覺醒」版（威力 ×1.5），40 級學會。
//   諧鳴（術士）：諧鳴有五個派系，公會目前只登錄了「瑟蘭派」（《法術統整》第四項第一節）——
//     用共振圍出「奏域」、改寫法術的頻率：奏域、共鳴、鎮頻、共振、轉調、定頻六招（40～45 級學會）；
//     魔法傷害 +10%、魔力 +15%、技能冷卻 −5%。其他四個派系等作者的設定。
// - 選過以後可以重選（交 1 顆魔力核心）。技能書多一段「二次轉職」（skillbook.js）。
// 放在 promote.js、skillbook.js、skills3.js、classes2b.js、dmgtype.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const LV = 40, COST = { core: 3, purecry: 2 };
  const LIB = R.SKILL_LIB || {};
  const scaleK = p => { const q = JSON.parse(JSON.stringify(p || {})); const f = o => { if (!o || typeof o !== 'object') return; if (typeof o.k === 'number') o.k *= 1.5; Object.values(o).forEach(f); }; f(q); return q; };
  // ---------- 覺醒技：每條路線最強的那一招 ×1.5 ----------
  const AW = {};
  R.CLASS_IDS.forEach(cls => (R.ADV[cls] || []).filter(a => !a.legacy).forEach(a => {
    const own = Object.values(LIB).filter(s => s.cls === cls && s.adv === a.id && !s.adv2).sort((x, y) => y.lv - x.lv)[0]; if (!own) return;
    const id = own.id + '_aw', desc = '（二轉・覺醒）' + own.desc + '威力 ×1.5。';
    LIB[id] = { id, name: '覺醒・' + own.name, cls, lv: LV, cd: own.cd, mp: Math.round(own.mp * 1.25), type: own.type, p: scaleK(own.p), desc, adv: a.id, adv2: 'awaken' };
    R.SKILLS[id] = { name: '覺醒・' + own.name, cd: own.cd, mp: Math.round(own.mp * 1.25), desc }; AW[cls + ':' + a.id] = id;
  }));
  // ---------- 諧鳴（瑟蘭派）：術士用的奏域技能 ----------
  const HM = Object.values(LIB).filter(s => s.cls === 'bard' && s.adv === 'serane' && !s.adv2).sort((x, y) => x.lv - y.lv).map((s, i) => {
    const id = 'hm_' + s.id.replace(/^se_/, ''), desc = '（二轉・諧鳴・瑟蘭派）' + s.desc;
    LIB[id] = { id, name: s.name, cls: 'mage', lv: LV + i, cd: s.cd, mp: s.mp, type: s.type, p: JSON.parse(JSON.stringify(s.p)), desc, adv2: 'harmonic' };
    R.SKILLS[id] = { name: s.name, cd: s.cd, mp: s.mp, desc }; return id;
  });
  const OPTS = cls => [{ id: 'awaken', name: '覺醒', desc: '走原本的轉職路線再往上：傷害 +12%、生命 +10%、技能冷卻 −8%。路線上最強的那一招多一個「覺醒」版（威力 ×1.5）。' }]
    .concat(cls === 'mage' && HM.length ? [{ id: 'harmonic', name: '諧鳴・瑟蘭派', desc: '諧鳴有五個派系，公會目前只登錄了瑟蘭派：用共振圍出閉環的「奏域」，在裡面改寫法術的頻率。學會' + HM.map(id => '「' + R.SKILLS[id].name + '」').join('') + '（40～' + (LV + HM.length - 1) + ' 級）。魔法傷害 +10%、魔力 +15%、技能冷卻 −5%。' }] : []);
  R.ADV2_OPTS = OPTS;   // adv2more.js 會包住它，加每個職業自己的二轉、諧鳴的其他派系
  const optName = (cls, id) => { const o = R.ADV2_OPTS(cls).find(x => x.id === id); return o ? o.name : ''; };
  // ---------- 技能書：學會的條件 ----------
  const nl0 = R.skillNeedLv;
  R.skillNeedLv = (sk, st) => (sk && sk.adv2 ? (st && st.adv2 === sk.adv2 && (!sk.adv || sk.adv === st.adv) ? sk.lv : 999) : nl0(sk, st));
  R.adv2Req = (s, st) => '二次轉職：' + (optName(s.cls, s.adv2) || '覺醒') + '・Lv ' + s.lv;
  R.adv2Title = (cls, st) => '二次轉職' + (st.adv2 ? '・' + optName(cls, st.adv2) + '（你選的）' : '（職業等級 ' + LV + '、轉職以後）');
  // ---------- 名字、數值 ----------
  const cn0 = R.clsName;
  R.clsName = cls => { const n = cn0(cls), st = S() && S().classes[cls]; return st && st.adv2 ? n + '・' + optName(cls, st.adv2) : n; };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const st = S().classes[cls];
      if (st && st.adv2 === 'awaken') { P.dmgMult *= 1.12; P.hpMax = Math.round(P.hpMax * 1.1); P.skillCdMult *= 0.92; }
      if (st && st.adv2 === 'harmonic') { P.matk = (P.matk || 1) + 0.1; P.mpMax = Math.round(P.mpMax * 1.15); P.skillCdMult *= 0.95; }
      P.adv2 = st && st.adv2 || null;
    } catch (e) { }
    return P;
  };
  // ---------- 條件、畫面 ----------
  const rankOk = () => { const r = S().rank; return !!r && r.dan >= 2; };
  const conds = cls => {
    const s = S(), st = s.classes[cls];
    return [
      { ok: st.lv >= LV, txt: '職業等級 ' + LV + '（現在 ' + st.lv + '）' },
      { ok: !!st.adv, txt: '已經轉職（' + (st.adv ? R.ADV[cls].find(a => a.id === st.adv).name : '還沒') + '）' },
      { ok: rankOk(), txt: '公會段位：討伐段以上（現在 ' + (R.rankName ? R.rankName() : '—') + '）' },
      { ok: (s.mats.core || 0) >= COST.core && (s.mats.purecry || 0) >= COST.purecry, txt: '魔力核心 ' + COST.core + ' 顆（有 ' + (s.mats.core || 0) + '）、高純度魔力水晶 ' + COST.purecry + ' 個（有 ' + (s.mats.purecry || 0) + '）' }
    ];
  };
  // ---------- 指定試煉（2026-10-04 作者：二轉要完成指定的試煉任務才可以） ----------
  // 每一個二轉選項各有自己的試煉：公會指定一座克森特級遺跡，用這個職業在「同一趟」裡（不接委託也可以）：
  //   走到第 N 層（那座遺跡的四成、至少第 10 層）＋打倒一隻領主體＋完成這個選項自己的目標。完成了那個選項才能選。
  //   存在 st.t2[選項] = { done }；st.t2on：正在挑戰的選項。舊存檔原本通過的試煉（trial2 === 2）算「覺醒」的。
  const OBJ = {
    nopot: n => '整趟不喝回復藥、魔力藥', crit: n => '用暴擊打倒 ' + n + ' 隻遺跡生物', far: n => '在 10 公尺外打倒 ' + n + ' 隻', low: n => '生命不到三成的時候打倒 ' + n + ' 隻',
    skill: n => '用技能打倒 ' + n + ' 隻', melee: n => '用普攻（近戰）打倒 ' + n + ' 隻', elem: n => '用屬性傷害（火、冰、雷、燃燒中）打倒 ' + n + ' 隻', cast: n => '放 ' + n + ' 次技能',
    scroll: n => '用掉 ' + n + ' 張寫好的卷軸', tank: n => '承受 ' + n + ' 管生命的傷害（活著）', heal: n => '回復 ' + n + ' 管生命'
  };
  const SPOBJ = { gunner: ['crit', 60], archer: ['far', 80], warrior: ['low', 15], priest: ['heal', 3], blade: ['crit', 100], knight: ['tank', 5], monk: ['melee', 150], bard: ['cast', 60], summoner: ['skill', 80], arraymage: ['skill', 120], enchanter: ['elem', 60], scroll: ['scroll', 40] };
  const objOf = (cls, opt) => (opt === 'awaken' ? ['nopot', 1] : opt === 'sp' ? SPOBJ[cls] || ['skill', 80] : ['skill', 120]);
  const siteOf = (cls, opt) => { const ks = R.SITES.filter(x => x.kind === 'ruin' && x.grade === 'kesent'); let h = 7; (cls + ':' + opt).split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) | 0; }); return ks.length ? ks[Math.abs(h) % ks.length] : null; };
  const floorNeed = site => Math.max(10, Math.round((R.floorsFor ? R.floorsFor(site) : 20) * 0.4));
  const trialTxt = (cls, opt) => { const site = siteOf(cls, opt), o = objOf(cls, opt); return site ? '到「' + site.name + '」走到第 ' + floorNeed(site) + ' 層、打倒一隻領主體，同一趟裡' + OBJ[o[0]](o[1]) + '（用' + R.CLASSES[cls].name + '，不接委託也可以）。' : '（目前沒有克森特級的遺跡）'; };
  const tOf = st => { st.t2 = st.t2 || {}; if (st.trial2 === 2 && !st.t2.awaken) st.t2.awaken = { done: 1 }; if (st.adv2 && !st.t2[st.adv2]) st.t2[st.adv2] = { done: 1 }; return st.t2; };
  const doneOf = (st, opt) => !!(tOf(st)[opt] && tOf(st)[opt].done);
  R.adv2TrialOf = (cls, opt) => ({ site: siteOf(cls, opt), floor: siteOf(cls, opt) ? floorNeed(siteOf(cls, opt)) : 0, obj: objOf(cls, opt), txt: trialTxt(cls, opt) });
  const sheet = (cls, back) => {
    const s = S(), st = s.classes[cls], cs = conds(cls), ready = cs.every(c => c.ok), el = $('hub-modal'); el.hidden = false; tOf(st);
    const redo = !!st.adv2, canRedo = redo && (s.mats.core || 0) >= 1;
    $('hub-sheet').innerHTML = '<h2>' + esc(R.CLASSES[cls].name) + '的二次轉職</h2>'
      + (redo ? '<p class="note">現在：' + esc(optName(cls, st.adv2)) + '。想換的話，先完成那一個的指定試煉，再交 1 顆魔力核心重選。</p>' : '<p class="note">二次轉職要公會認可：等級、段位都要到，完成你要選的那一個的<b>指定試煉</b>，再交魔力核心 ' + COST.core + ' 顆、高純度魔力水晶 ' + COST.purecry + ' 個。</p><ul class="loot">' + cs.map(c => '<li style="color:' + (c.ok ? '#7AE0A0' : '#E8B07A') + '">' + (c.ok ? '✓ ' : '✗ ') + esc(c.txt) + '</li>').join('') + '</ul>')
      + '<div class="recipes">' + R.ADV2_OPTS(cls).map(o => {
        const dn = doneOf(st, o.id), on = st.t2on === o.id, cur = st.adv2 === o.id, can = dn && !cur && (redo ? canRedo : ready);
        return '<div class="recipe"><b>' + esc(o.name) + (cur ? '（現在的）' : '') + '</b><small>' + esc(o.desc) + '</small>'
          + '<small style="color:' + (dn ? '#7AE0A0' : on ? '#FFD27A' : '#C8C0B0') + '">指定試煉' + (dn ? '（完成了）' : on ? '（挑戰中）' : '') + '：' + esc(trialTxt(cls, o.id)) + '</small>'
          + '<div class="row">' + (!dn && !on ? '<button type="button" class="btn" data-p2t="' + o.id + '"' + (st.lv >= LV && st.adv ? '' : ' disabled') + '>挑戰這個試煉</button>' : '')
          + '<button type="button" class="btn' + (can ? ' pri' : '') + '" data-p2="' + o.id + '"' + (can ? '' : ' disabled') + '>' + (cur ? '現在就是這個' : redo ? '重選這一個（魔力核心 1 顆）' : '選這一個') + '</button></div></div>';
      }).join('') + '</div>'
      + '<div class="row"><button type="button" class="btn" id="p2-x">好了</button></div>';
    $('p2-x').onclick = () => { el.hidden = true; back && back(); };
    document.querySelectorAll('[data-p2t]').forEach(b => { b.onclick = () => { st.t2on = b.dataset.p2t; R.save(); R.toast && R.toast('接下了指定試煉：' + trialTxt(cls, st.t2on), '#E8C04A'); sheet(cls, back); }; });
    document.querySelectorAll('[data-p2]').forEach(b => { b.onclick = () => {
      const id = b.dataset.p2; if (!doneOf(st, id)) return;
      if (redo) { if ((s.mats.core || 0) < 1) return; s.mats.core--; }
      else { if (!conds(cls).every(c => c.ok)) return; s.mats.core -= COST.core; s.mats.purecry -= COST.purecry; }
      st.adv2 = id; R.save(); R.sfx && R.sfx('levelup');
      R.banner && R.banner('二次轉職：' + optName(cls, id), R.CLASSES[cls].name + '・Lv ' + st.lv);
      sheet(cls, back);
    }; });
  };
  R.adv2Sheet = sheet;
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try {
      document.querySelectorAll('#hub-body [data-promo]').forEach(b => {
        const cls = b.dataset.promo, st = S().classes[cls]; if (!st || !st.adv || b.parentNode.querySelector('[data-p2open]')) return;
        const x = document.createElement('button'); x.type = 'button'; x.className = 'mini' + (st.lv >= LV && !st.adv2 ? ' gold' : ''); x.dataset.p2open = cls;
        x.textContent = st.adv2 ? '二轉：' + optName(cls, st.adv2) : st.t2on ? '二轉試煉中' : '二次轉職';
        x.onclick = () => sheet(cls, () => R.hub(t, f)); b.after(x);
      });
    } catch (e) { console.warn('[promote2]', e); }
  };
  // ---------- 試煉的進度（同一趟） ----------
  const tr = () => { const run = W().run; return run && run.t2 && !run.done ? run.t2 : null; };
  const sr0 = R.startRun;
  R.startRun = id => {
    const r = sr0(id);
    setTimeout(() => {   // 遺跡是非同步建的（R.three 載好才開始）
      try { const run = W().run, s = S(), cls = s && s.cls, st = cls && s.classes[cls]; if (run && !run.t2 && st && st.t2on && !doneOf(st, st.t2on)) { const site = siteOf(cls, st.t2on); if (site && run.site && run.site.id === site.id) { run.t2 = { cls, opt: st.t2on, need: floorNeed(site), obj: objOf(cls, st.t2on), n: 0, lord: false, pot: false, tank: 0, heal: 0, casts: 0, sc: s.scrolls || 0 }; R.toast && R.toast('指定試煉：' + trialTxt(cls, st.t2on), '#FFD27A'); } } } catch (e) { console.warn('[promote2]', e); }
    }, 1500);
    return r;
  };
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { const r = he0(e, raw, o); try { const t = tr(); if (t && e) { const P = W().P; o = o || {}; e.t2hit = { primary: !!o.primary, crit: !!R.lastCrit, elem: !!(o.elem || (e.st && e.st.burn > 0)), far: P ? Math.hypot(P.x - e.x, P.z - e.z) > 10 : false, melee: !!(o.primary && P && P.ws && (P.ws.kind === 'melee' || P.ws.kind === 'thrust')), low: P ? P.hp < P.hpMax * 0.3 : false }; } } catch (err) { } return r; };
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by);
    try {
      const t = tr(); if (was && e.dead && t && !(by && by.rival)) {
        if (e.def && /^領主體/.test(e.def.name || '')) t.lord = true;
        const h = e.t2hit, k = t.obj[0];
        if (h && ((k === 'crit' && h.crit) || (k === 'far' && h.far) || (k === 'low' && h.low) || (k === 'skill' && !h.primary) || (k === 'melee' && h.melee) || (k === 'elem' && h.elem))) t.n++;
      }
    } catch (err) { console.warn('[promote2]', err); }
    return r;
  };
  const dr0 = R.drink; if (dr0) R.drink = (...a) => { const t = tr(); if (t) t.pot = true; return dr0(...a); };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const P = W().P, h = P ? P.hp : 0, r = hp0(raw, src, o); const t = tr(); if (t && P && P.hp < h) t.tank += (h - P.hp) / P.hpMax; return r; };
  const hl0 = R.healP; if (hl0) R.healP = (...a) => { const P = W().P, h = P ? P.hp : 0, r = hl0(...a); const t = tr(); if (t && P && P.hp > h) t.heal += (P.hp - h) / P.hpMax; return r; };
  const cdSum = P => (P.skillCd || 0) + (P.skCd ? P.skCd.reduce((x, y) => x + (y || 0), 0) : 0);
  const cast = fn => (...a) => { const P = W().P, b = P ? cdSum(P) : 0, r = fn(...a); const t = tr(); if (t && P && cdSum(P) > b + 0.01) t.casts++; return r; };
  R.useSkill = cast(R.useSkill); const cs0 = R.castSlot; if (cs0) { const c2 = cast(cs0); R.castSlot = i => (i === 0 ? cs0(i) : c2(i)); }
  let chk = 0;
  const st0 = R.step;
  R.step = dt => {
    st0(dt); chk -= dt; if (chk > 0) return; chk = 0.5;
    const t = tr(), run = W().run, s = S(); if (!t || !s) return;
    const k = t.obj[0], need = t.obj[1], st = s.classes[t.cls];
    if (k === 'scroll') { const now = s.scrolls || 0; if (now < t.sc) t.n += t.sc - now; t.sc = now; }
    if (k === 'cast') t.n = t.casts; if (k === 'tank') t.n = Math.floor(t.tank); if (k === 'heal') t.n = Math.floor(t.heal);
    const fl = run.floor + (run.f0 ? 0 : 1), objOk = k === 'nopot' ? !t.pot : t.n >= need;
    if (k === 'nopot' && t.pot && !t.failSaid) { t.failSaid = 1; R.toast && R.toast('指定試煉：喝了藥——這一趟不算了。', '#FF9A6A'); }
    if (fl >= t.need && t.lord && objOk && !doneOf(st, t.opt)) {
      tOf(st)[t.opt] = { done: 1 }; st.t2on = null; run.t2 = null; R.save();
      R.banner && R.banner('指定試煉完成', '回公會登記處的「武器登記」，選二次轉職：' + optName(t.cls, t.opt));
    }
  };
  // 左上角：試煉的進度
  const st1 = R.step; let ht = 0;
  R.step = dt => {
    st1(dt); ht -= dt; if (ht > 0) return; ht = 0.5;
    const t = tr(); let el = $('r-t2'); if (!t) { if (el) el.hidden = true; return; }
    if (!el) { const tl = $('r-tl'); if (!tl) return; el = document.createElement('div'); el.id = 'r-t2'; el.className = 'glass dungeon-only r-misc'; tl.appendChild(el); }
    const run = W().run, fl = run.floor + (run.f0 ? 0 : 1), k = t.obj[0], ok = (b, x) => '<b style="color:' + (b ? '#7AE0A0' : '#FFD27A') + '">' + x + '</b>';
    el.hidden = false; el.innerHTML = '指定試煉 ' + ok(fl >= t.need, '第 ' + Math.min(fl, t.need) + '／' + t.need + ' 層') + '・' + ok(t.lord, t.lord ? '領主 ✓' : '領主 ✗') + '・' + (k === 'nopot' ? ok(!t.pot, t.pot ? '喝了藥' : '沒喝藥') : ok(t.n >= t.obj[1], t.n + '／' + t.obj[1]));
  };
  R.adv2TrialProgress = () => { const t = tr(); if (!t) return null; const run = W().run; return { floor: run.floor + (run.f0 ? 0 : 1), need: t.need, lord: t.lord, obj: t.obj, n: t.obj[0] === 'nopot' ? (t.pot ? 0 : 1) : t.n }; };
  R.promote2Debug = { AW, HM, conds };
})(window.R);
