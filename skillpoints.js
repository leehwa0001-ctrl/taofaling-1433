// 技能點・天賦（作者選的：技能照等級學會，另外每升一級給 1 點，用來強化技能和點天賦；等級上限 50，滿級後的經驗換點數——levelcap.js）
// - 點數：每個職業分開算＝(職業等級 − 1)＋滿級後攢的點（st.spBonus）。存在 st.sp = { r: {技能: 星}, t: {天賦: 級} }。
// - 技能強化：學會的技能可以強化到 ★5。每一星：冷卻 −5%；技能書的新技能（skillbook.js、skillbook2.js）傷害再 +12%。
//   2026-10-04 作者：升星改成熟練度——每用一次 +1（st.sp.u），用滿 20、60、140、260、450 次各升一星，不再花點數；點數全部給天賦。
//   之前用點數升的星保留（熟練度補到那一星），花掉的點數退回來。
// - 天賦：三階（基礎、進階要先在天賦投 10 點、精通要 25 點），每一級 1 點。
// - 洗點：只能在公會（武器登記那裡），收 40 × 職業等級 費拉。
// 放在 skillbook2.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const TAL = [
    ['vit', '體魄', 0, 5, '生命 +3%'], ['str', '力量', 0, 10, '傷害 +2%'], ['wis', '魔力', 0, 5, '魔力 +4%'],
    ['acc', '精準', 1, 10, '暴擊率 +1%'], ['spd', '迅捷', 1, 5, '攻擊速度 +2%'], ['eva', '身法', 1, 5, '翻滾冷卻 −4%'], ['rec', '調息', 1, 5, '每秒回復 0.3 生命'],
    ['med', '冥想', 2, 10, '技能冷卻 −2%'], ['tou', '堅韌', 2, 10, '受到的傷害 −1.5%'], ['fat', '致命', 2, 5, '暴擊傷害 +6%'],
    ['mpr', '回魔', 1, 5, '每秒回復魔力 +0.4'], ['pen', '穿透', 2, 5, '無視敵人護甲 +4%']   // 2026-10-04 作者：天賦新增回魔和穿透
  ];
  const TIER = ['基礎', '進階', '精通'], TIER_NEED = [0, 10, 25], MAXR = 5, PROF = [20, 60, 140, 260, 450];
  R.TALENTS = TAL;
  const stOf = cls => S().classes[cls || S().cls];
  const sp = st => {
    st.sp = st.sp || { r: {}, t: {} }; st.sp.r = st.sp.r || {}; st.sp.t = st.sp.t || {}; st.sp.u = st.sp.u || {};
    if (!st.sp.m1) { st.sp.m1 = 1; Object.keys(st.sp.r).forEach(id => { const r = st.sp.r[id]; if (r > 0) st.sp.u[id] = Math.max(st.sp.u[id] || 0, PROF[r - 1]); }); }   // 舊存檔：點數升的星保留
    return st.sp;
  };
  const spent = st => Object.values(sp(st).t).reduce((a, v) => a + v, 0);   // 星改成熟練度：點數只算天賦
  const talSpent = st => Object.values(sp(st).t).reduce((a, v) => a + v, 0);
  R.spTotal = st => Math.max(0, st.lv) * 2 + (st.spBonus || 0);   // 2026-10-05 作者：天賦點變多——每級 2 點（天賦樹改成四條道）   // 2026-10-04 作者：等級有 50 就有 50 點天賦點（原本是等級 − 1）
  R.spFree = st => R.spTotal(st) - spent(st);
  const rank = (id, cls) => { const s = S(); if (!s) return 0; const st = stOf(cls), r = (st && st.sp && st.sp.r) || {}; return Math.max(r[id] || 0, /_aw$/.test(id || '') ? r[id.replace(/_aw$/, '')] || 0 : 0); };   // 覺醒版（_aw）沿用原版的星數
  const tal = (id, cls) => { const s = S(); if (!s) return 0; const st = stOf(cls); return (st && st.sp && st.sp.t[id]) || 0; };
  R.skillRank = rank;

  // ---------- 學會的技能（照 skillbook.js 的規則） ----------
  const learnedOf = cls => {
    const st = stOf(cls), out = [R.CLASSES[cls].skill];
    (R.SKILL_SLOTS[cls] || []).forEach((id, i) => { if (st.lv >= R.SKILL_UNLOCK[i + 1]) out.push(id); });
    if (st.adv) { const a = R.ADV[cls].find(x => x.id === st.adv); if (a) out.push(a.skill); }
    Object.values(R.SKILL_LIB || {}).forEach(s => { if (s.cls === cls && st.lv >= (R.skillNeedLv ? R.skillNeedLv(s, st) : s.lv) && (!s.adv || s.adv === st.adv)) out.push(s.id); });
    return Array.from(new Set(out)).filter(id => R.SKILLS[id]);
  };
  R.skillsLearned = learnedOf; R.SKILL_PROF = PROF;   // talentui.js 用

  // ---------- 效果：技能的傷害（技能書的「型」）、冷卻 ----------
  const T = R.SKILL_TYPES; let depth = 0;
  if (T) Object.keys(T).forEach(k => { const f = T[k]; T[k] = (s, P, w, pw) => { const id = s && s._id; let m = 1; if (!depth && id && id.indexOf(':') < 0) m = 1 + 0.12 * rank(id, P && P.cls); depth++; try { return f(s, P, w, pw * m); } finally { depth--; } }; });
  const cdScale = (P, id, get, set) => { const r = id ? rank(id, P.cls) : 0; if (r) set(get() * (1 - 0.05 * r)); };
  // 熟練度：放出去一次 +1，滿了升一星
  const gainProf = (P, id) => {
    if (!id || id.indexOf(':') >= 0 || !S()) return; const st = stOf(P.cls); if (!st) return;
    const p = sp(st); p.u[id] = (p.u[id] || 0) + 1; const r = p.r[id] || 0;
    if (r < MAXR && p.u[id] >= PROF[r]) { p.r[id] = r + 1; R.toast && R.toast('「' + (R.SKILLS[id] ? R.SKILLS[id].name : id) + '」熟練了：★' + (r + 1) + '（冷卻 −' + 5 * (r + 1) + '%' + (R.SKILL_LIB && R.SKILL_LIB[id] ? '、傷害 +' + 12 * (r + 1) + '%' : '') + '）', '#E8C04A'); R.sfx && R.sfx('magic'); }
  };
  R.skillProf = (id, cls) => { const st = stOf(cls); return st ? (sp(st).u[id] || 0) : 0; };
  const us0 = R.useSkill;
  R.useSkill = () => { const P = W().P; if (!P) return us0(); const id = P.skill, b = P.skillCd || 0, r = us0(); if ((P.skillCd || 0) > b + 0.01) { cdScale(P, id, () => P.skillCd, v => { P.skillCd = v; }); gainProf(P, id); } return r; };
  const cs0 = R.castSlot;
  R.castSlot = i => { const P = W().P; if (!P || i === 0) return cs0(i); const id = R.slotSkill ? R.slotSkill(P, i) : null, b = (P.skCd && P.skCd[i]) || 0, r = cs0(i); if (P.skCd && (P.skCd[i] || 0) > b + 0.01) { cdScale(P, id, () => P.skCd[i], v => { P.skCd[i] = v; }); gainProf(P, id); } return r; };
  // 技能書的卡片：標上星數
  const tg0 = R.skillTag;
  R.skillTag = id => { const t = tg0 ? tg0(id) : '', r = rank(id); return (t ? t : '') + (r ? (t ? '・' : '') + '★' + r : ''); };

  // ---------- 效果：天賦 ----------
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const t = id => tal(id, cls);
      P.hpMax = Math.round(P.hpMax * (1 + 0.03 * t('vit'))); P.mpMax = Math.round(P.mpMax * (1 + 0.04 * t('wis'))); P.dmgMult *= 1 + 0.02 * t('str');
      if (P.ws) { P.ws.crit += 0.01 * t('acc'); P.ws.rate *= 1 + 0.02 * t('spd'); }
      P.dodgeCdMax *= 1 - 0.04 * t('eva'); P.regen = (P.regen || 0) + 0.3 * t('rec'); P.skillCdMult *= 1 - 0.02 * t('med'); P.critMult += 0.06 * t('fat'); P.talGuard = 0.015 * t('tou');
      P.mpRegen = (P.mpRegen || 0) + 0.4 * t('mpr'); P.pen = Math.min(0.8, (P.pen || 0) + 0.04 * t('pen'));
    } catch (e) { }
    return P;
  };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const P = W().P; return hp0(P && P.talGuard ? raw * (1 - P.talGuard) : raw, src, o); };
  // 升級：提醒有點數可以用
  const gx0 = R.gainXp;
  R.gainXp = v => { const st = stOf(), lv0 = st.lv, b0 = st.spBonus || 0; gx0(v); const n = (st.lv - lv0) * 2 + ((st.spBonus || 0) - b0); if (n > 0) setTimeout(() => R.toast && R.toast('技能點 +' + n + '（可用 ' + R.spFree(st) + ' 點）', '#E8C04A'), 2400); };

  // ---------- 畫面 ----------
  const book = (host, where, close) => {
    const s = S(), cls = s.cls, st = stOf(cls), p = sp(st), free = R.spFree(st), ts = talSpent(st), atGuild = where === 'hub', fee = 40 * st.lv;
    const skills = learnedOf(cls);
    host.innerHTML = '<h2>技能點・天賦・' + esc(R.clsName(cls)) + ' Lv ' + st.lv + (st.lv >= R.LV_CAP ? '（滿級）' : '／' + R.LV_CAP) + '</h2>'
      + '<p class="note">每升一級 +2 點' + (st.lv >= R.LV_CAP ? '；滿級之後每攢滿一級的經驗再 1 點' : '') + '，用在天賦。可用 <b>' + free + '</b> 點（共 ' + R.spTotal(st) + '，用掉 ' + (R.spTotal(st) - free) + '）。每個武器類別的點數分開算。</p>'
      + '<h3>技能熟練度（最多 ★' + MAXR + '）</h3><p class="note">技能用越多越熟練：每放出去一次 +1，用滿 ' + PROF.join('、') + ' 次各升一星（不用花點數）。每一星：冷卻 −5%；技能書的技能傷害再 +12%（原本的基本技能只縮短冷卻）。</p>'
      + [null, st.adv].filter((v, i) => i === 0 || v).map(adv => { const list = skills.filter(id => { const L = R.SKILL_LIB && R.SKILL_LIB[id], a = L ? L.adv || null : ((R.ADV[cls] || []).some(x => x.skill === id) ? st.adv : null); return a === adv; }); if (!list.length) return ''; const an = adv && (R.ADV[cls] || []).find(x => x.id === adv);
        return '<p class="note"><b>' + esc(adv ? '轉職・' + (an ? an.name : adv) : '基本・' + R.CLASSES[cls].name) + '</b></p><div class="sp-list">' + list.map(id => { const r = p.r[id] || 0, u = p.u[id] || 0, lib = !!(R.SKILL_LIB && R.SKILL_LIB[id]), lo = r ? PROF[r - 1] : 0, hi = PROF[Math.min(r, MAXR - 1)], k = r >= MAXR ? 1 : Math.max(0, Math.min(1, (u - lo) / (hi - lo)));
          return '<div class="sp-row"><b>' + esc(R.SKILLS[id].name) + '</b><span class="sp-star">' + '★'.repeat(r) + '<i>' + '☆'.repeat(MAXR - r) + '</i></span><small>' + (r ? (lib ? '傷害 +' + 12 * r + '%・' : '') + '冷卻 −' + 5 * r + '%' : '還沒熟練') + '</small>' + (r < MAXR ? '<span class="sp-prof" title="熟練度"><i style="width:' + Math.round(k * 100) + '%"></i><em>' + u + '／' + hi + '</em></span>' : '<span class="tag">滿星</span>') + '</div>'; }).join('') + '</div>'; }).join('')
      + '<h3>天賦（投了 ' + ts + ' 點）</h3>' + TIER.map((tn, k) => { const open = ts >= TIER_NEED[k]; return '<p class="note"><b>' + tn + '</b>' + (k ? (open ? '' : '（要先在天賦投 ' + TIER_NEED[k] + ' 點）') : '') + '</p><div class="sp-list">' + TAL.filter(x => x[2] === k).map(([id, n, , mx, d]) => { const v = p.t[id] || 0; return '<div class="sp-row' + (open ? '' : ' locked') + '"><b>' + esc(n) + '</b><span class="sp-star">' + v + '／' + mx + '</span><small>每級 ' + esc(d) + '</small>' + (v < mx ? '<button type="button" class="mini gold" data-spt="' + id + '"' + (!open || free < 1 ? ' disabled' : '') + '>+1（1 點）</button>' : '<span class="tag">滿級</span>') + '</div>'; }).join('') + '</div>'; }).join('')
      + '<div class="row">' + (atGuild ? '<button type="button" class="btn" data-sprs="1"' + (s.gold < fee || !(R.spTotal(st) - free) ? ' disabled' : '') + '>天賦全部重新分配（' + fee + ' 費拉）</button>' : '<span class="note">要重新分配天賦，到公會的武器登記那裡。</span>') + '<button type="button" class="btn pri" data-close="1">好了</button></div>';
    host.querySelectorAll('[data-spr]').forEach(b => { b.onclick = () => { const id = b.dataset.spr, r = p.r[id] || 0; if (R.spFree(st) < r + 1 || r >= MAXR) return; p.r[id] = r + 1; R.save(); book(host, where, close); }; });
    host.querySelectorAll('[data-spt]').forEach(b => { b.onclick = () => { const id = b.dataset.spt, d = TAL.find(x => x[0] === id), v = p.t[id] || 0; if (R.spFree(st) < 1 || v >= d[3] || talSpent(st) < TIER_NEED[d[2]]) return; p.t[id] = v + 1; R.save(); book(host, where, close); }; });
    const rs = host.querySelector('[data-sprs]'); if (rs) rs.onclick = () => { if (s.gold < fee) return; s.gold -= fee; sp(st).t = {}; R.save();   /* 熟練度、星不動，只收回天賦 */ book(host, where, close); R.say && R.say('點數全部收回來了（' + fee + ' 費拉）'); };
    host.querySelector('[data-close]').onclick = close;
  };
  R.skillPoints = where => {
    if (W().run) { R.toast('遺跡裡不能分配點數。'); return; }
    if (where === 'hub') { const host = $('hub-sheet'), el = $('hub-modal'); el.hidden = false; book(host, 'hub', () => { el.hidden = true; R.hub(); }); host.scrollTop = 0; return; }
    R.sheet('<div id="sp-host"></div>'); book($('sp-host'), 'town', () => R.closeSheet());
  };
  // 城裡的暫停選單、公會的武器登記：多一個按鈕
  const tm0 = R.townMenu;
  if (tm0) R.townMenu = (...a) => { const r = tm0(...a); const row = document.querySelector('#r-sheet .row'); if (row && !row.querySelector('#sp-btn')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'sp-btn'; const f = R.S ? R.spFree(stOf()) : 0; b.textContent = '技能點・天賦' + (f ? '（' + f + '）' : ''); b.onclick = () => R.skillPoints('town'); row.insertBefore(b, row.children[2] || null); } return r; };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'); if (!body) return;
    const h = [...body.querySelectorAll('h3')].find(e => e.textContent === '武器登記'); if (!h) return;
    const fr = R.spFree(stOf()), b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (fr ? ' pri' : ''); b.textContent = '技能點・天賦' + (fr ? '（可用 ' + fr + ' 點）' : ''); b.onclick = () => R.skillPoints('hub');
    const row = h.nextElementSibling && h.nextElementSibling.classList.contains('row') ? h.nextElementSibling : null;
    if (row) row.appendChild(b); else { const p = document.createElement('div'); p.className = 'row'; p.appendChild(b); h.after(p); }
  };
  const css = document.createElement('style');
  css.textContent = '.sp-list{display:grid;gap:4px;margin-bottom:8px}.sp-row{display:grid;grid-template-columns:auto auto 1fr auto;gap:2px 10px;align-items:center;background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:5px 8px}.sp-row.locked{opacity:.5}.sp-star{color:#E8C04A;letter-spacing:1px}.sp-prof{position:relative;display:block;min-width:120px;height:16px;background:var(--bg);border:1px solid var(--line);border-radius:8px;overflow:hidden}.sp-prof i{position:absolute;left:0;top:0;bottom:0;background:#8A6A2A}.sp-prof em{position:relative;display:block;text-align:center;font-style:normal;font-size:11px;line-height:16px}.sp-star i{color:rgba(255,255,255,.25);font-style:normal}.sp-row small{opacity:.85}';
  document.head.appendChild(css);
})(window.R);
