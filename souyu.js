// 奏域（2026-10-08 作者：諧鳴 22 招同質性太高，全部刪掉，只留一招 9 星的「奏域」）
// - 術士二轉「諧鳴」只剩一個選項（原本瑟蘭派＋鎮頻、共振、轉調、定頻四派）：40 級學會「奏域」，常駐效果照舊（promote2.js、adv2plus.js）。
//   舊存檔選了四派之一的 → 改回「諧鳴」；技能欄上被刪掉的招 → 空出來（用預設）。
// - 奏域可以練到 ★9（skillpoints.js 的 R.SKILL_MAXR；一般的冷卻、傷害星數加成照舊最多算 ★5）。
//   ★0、★3、★6、★9 各四選一（技能書裡奏域下面點）：
//     ★0〔共鳴・鎮頻・定頻・轉調〕 ★3〔共振・壓制・鎖定・變化〕 ★6〔協振・鎮壓・擴散・極化〕 ★9〔劇烈・高壓・廣域・魔化〕
//   另外選一種形態（可以不選）：輕便（跟著你移動、效果 −10%）、沉穩（效果 +20%）、拓展（半徑 +30%）。
// - 奏域本身：準心處（最遠 10 公尺；輕便＝腳下）展開半徑 5、8 秒的奏域；同時只能有一個，再放一次會換掉舊的。
//   奏域打出去的傷害算奏域這一招（吸血照技能算）。
// 放在 skillpoints.js、skillvar.js、adv2more.js、adv2plus.js、promote2.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, esc = s => R.esc(s), CT = () => performance.now() / 1000, rnd = Math.random;
  const L = R.SKILL_LIB, T = R.SKILL_TYPES; if (!L || !T) return;
  const ID = 'hm_field', COL = '#FFB8E0';
  // ---------- 選項 ----------
  const TIERS = [
    { star: 0, opts: [['gm', '共鳴', '奏域每 0.5 秒震一下：裡面的敵人受傷（技能威力 35%）'], ['zp', '鎮頻', '裡面的敵人變慢 50%；敵人的投射物飛進奏域就消失'], ['dp', '定頻', '每 0.35 秒朝裡面的一隻敵人射出必中的音波（技能威力 30%）'], ['zd', '轉調', '每 0.5 秒輪流讓裡面的敵人燃燒、變慢、被雷電到']] },
    { star: 3, opts: [['gz', '共振', '你和隊友站在裡面時傷害 +20%'], ['yz', '壓制', '裡面的敵人造成的傷害 −25%'], ['sd', '鎖定', '裡面的敵人受到你的傷害 +15%，而且慢慢被往中間拉'], ['bh', '變化', '每 0.5 秒隨機讓裡面的敵人燃燒、中毒、破甲或變慢']] },
    { star: 6, opts: [['xz', '協振', '站在裡面放技能退回 30% 魔力'], ['zy', '鎮壓', '每 2 秒讓裡面的敵人暈 0.6 秒'], ['ks', '擴散', '每 0.5 秒朝奏域外 6 公尺內的兩隻敵人射出音波（技能威力 30%）'], ['jh', '極化', '裡面的敵人燃燒、中毒的傷害 ×2；第一次被奏域變慢會先定身 0.5 秒']] },
    { star: 9, opts: [['jl', '劇烈', '奏域打出的傷害 ×2，結束時整個炸開（技能威力 300%）'], ['gy', '高壓', '裡面的敵人一直被往中間壓、攻擊慢 40%'], ['gw', '廣域', '半徑 +60%、持續時間 +50%'], ['mh', '魔化', '你打裡面的敵人傷害 +40%，每一下普攻都隨機帶一種元素']] }
  ];
  const FORMS = [['qb', '輕便', '奏域跟著你移動，效果 −10%'], ['cw', '沉穩', '效果 +20%'], ['tz', '拓展', '半徑 +30%']];
  R.SOUYU = { TIERS, FORMS };
  R.SKILL_MAXR = Object.assign(R.SKILL_MAXR || {}, { [ID]: 9 });
  const star = () => (R.skillRank ? R.skillRank(ID, 'mage') : 0);
  const conf = () => { const s = S(); if (!s) return {}; s.souyu = s.souyu || {}; return s.souyu; };
  const pick = () => { const c = conf(), st = star(), out = new Set(); TIERS.forEach(t => { if (st >= t.star) out.add(t.opts.some(o => o[0] === c[t.star]) ? c[t.star] : t.opts[0][0]); }); return { has: k => out.has(k), form: FORMS.some(f => f[0] === c.form) ? c.form : '' }; };
  R.souyuPick = pick;

  // ---------- 刪掉諧鳴的其他招、四派 ----------
  const HF = ['hm_zhen', 'hm_gong', 'hm_zhuan', 'hm_ding'];
  const gone = Object.keys(L).filter(id => /^hm_/.test(id) && id !== ID && L[id].cls === 'mage');
  gone.forEach(id => { delete L[id]; if (R.SKILLS) delete R.SKILLS[id]; });
  L[ID] = Object.assign(L[ID] || { id: ID, cls: 'mage', adv2: 'harmonic' }, { name: '奏域', lv: 40, cd: 18, mp: 28, type: 'souyu', p: { r: 5, life: 8 } });
  R.SKILLS[ID] = Object.assign(R.SKILLS[ID] || {}, { name: '奏域', cd: 18, mp: 28, desc: '（二轉・諧鳴）用共振圍出閉環：準心處展開 8 秒的奏域。可以練到 ★9，★0、★3、★6、★9 各選一種諧鳴（共鳴、鎮頻、定頻、轉調……），在技能書這張卡片最下面選。' });
  const op0 = R.ADV2_OPTS;
  if (op0) R.ADV2_OPTS = cls => op0(cls).filter(o => !HF.includes(o.id)).map(o => (o.id === 'harmonic' ? Object.assign({}, o, { name: '諧鳴', desc: '用共振圍出閉環的「奏域」，在裡面改寫法術的頻率。學會「奏域」（40 級）：可以練到 ★9，★0、★3、★6、★9 各從四種諧鳴選一種（共鳴、鎮頻、定頻、轉調……），再選輕便、沉穩或拓展。常駐：魔攻 +10%、魔力 +15%、技能冷卻 −5%。' }) : o));
  const sv0 = R.skillVariants;
  if (sv0) R.skillVariants = id => (id === ID ? [] : sv0(id));   // 奏域用自己的選項，不用技能變化
  const fix = s => {
    if (!s || !s.classes) return s;
    Object.values(s.classes).forEach(st => { if (st && HF.includes(st.adv2)) st.adv2 = 'harmonic'; });
    if (s.loadout) Object.keys(s.loadout).forEach(c => { const lo = s.loadout[c]; if (Array.isArray(lo)) s.loadout[c] = lo.map(id => (id && /^hm_/.test(id) && id !== ID && (!L[id]) ? null : id)); });
    return s;
  };
  const mg0 = R.migrate;
  R.migrate = s => fix(mg0 ? mg0(s) : s);
  if (S()) fix(S());

  // ---------- 奏域本身 ----------
  let F = null;
  const TH = () => window.THREE;
  const inF = (o, pad) => F && o && Math.hypot(o.x - F.x, o.z - F.z) < F.r + (pad || 0) + (o.def ? o.def.size * 0.5 : 0);
  const kill = () => { if (!F) return; try { F.objs.forEach(m => { if (m.parent) m.parent.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); }); } catch (e) { } F = null; };
  const mesh = (x, z, r) => {
    const t = TH(), w = W(); if (!t || !w.scene) return [];
    const ring = new t.Mesh(new t.RingGeometry(Math.max(0.1, r - 0.18), r, 56), new t.MeshBasicMaterial({ color: COL, transparent: true, opacity: 0.85, side: t.DoubleSide, depthWrite: false }));
    const disc = new t.Mesh(new t.CircleGeometry(r, 48), new t.MeshBasicMaterial({ color: COL, transparent: true, opacity: 0.12, side: t.DoubleSide, depthWrite: false }));
    [ring, disc].forEach((m, i) => { m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06 + i * 0.01, z); w.scene.add(m); });
    return [ring, disc];
  };
  const hit = (e, raw, o) => R.hurtEnemy(e, raw, Object.assign({ vSk: ID }, o || {}));
  const inside = () => (W().enemies || []).filter(e => !e.dead && !e.under && inF(e));
  const slowIn = e => { const was = e.st.slow > 0; e.st.slow = Math.max(e.st.slow || 0, 0.3); if (F.c.has('jh') && !was && !F.rooted.has(e)) { F.rooted.add(e); e.st.root = Math.max(e.st.root || 0, 0.5); } };
  const elemOn = (e, k) => { if (k === 'burn') e.st.burn = 3; else if (k === 'slow') { e.st.slow = Math.max(e.st.slow || 0, 2); slowIn(e); } else if (k === 'shock') R.chain && R.chain(e, F.pw * 0.2 * F.eff); else if (k === 'poison') R.elemPoison && R.elemPoison(e, W().P); else if (k === 'break') R.elemBreak && R.elemBreak(e); };
  const bolt = (e, from) => { R.fx && R.fx('bolt', from ? from.x : F.x, 1.1, from ? from.z : F.z, { to: e, color: COL }); };
  const step = dt => {
    const w = W(), P = w.P; if (!F || !P || P.dead || !w.run || w.run.done) { kill(); return false; }
    F.t -= dt; if (F.follow) { F.x = P.x; F.z = P.z; F.objs.forEach(m => { m.position.x = F.x; m.position.z = F.z; }); }
    const k = Math.max(0, F.t / F.life); if (F.objs[0]) F.objs[0].material.opacity = 0.55 + 0.3 * Math.abs(Math.sin(CT() * 4));
    const c = F.c, L2 = inside(), dmgK = F.eff * (c.has('jl') ? 2 : 1);
    // 每一格
    if (c.has('zp')) { L2.forEach(slowIn); (w.shots || []).forEach(s => { if (s.owner !== 'p' && !s.dead && inF(s)) { s.life = -1; } }); }
    if (c.has('gy') || c.has('sd')) { const pull = c.has('gy') ? 1.2 : 0.4; L2.forEach(e => { if (e.def && e.def.boss) return; e.x += (F.x - e.x) * Math.min(1, dt * pull); e.z += (F.z - e.z) * Math.min(1, dt * pull); if (c.has('gy') && e.cd != null) e.cd += dt * 0.4; }); }
    F.shot -= dt; if (c.has('dp') && F.shot <= 0) { F.shot = 0.35; const e = L2[Math.floor(rnd() * L2.length)]; if (e) { bolt(e); hit(e, F.pw * 0.3 * dmgK); } }
    F.stun -= dt; if (c.has('zy') && F.stun <= 0) { F.stun = 2; L2.forEach(e => { e.st.stun = Math.max(e.st.stun || 0, 0.6); }); R.fx && R.fx('ring', F.x, 0.1, F.z, { r: F.r, color: '#9AD8FF' }); }
    // 每 0.5 秒
    F.pulse -= dt;
    if (F.pulse <= 0) {
      F.pulse = 0.5; F.n++;
      if (c.has('gm')) { R.fx && R.fx('ring', F.x, 0.1, F.z, { r: F.r, color: COL }); L2.forEach(e => hit(e, F.pw * 0.35 * dmgK)); }
      if (c.has('zd')) { const kk = ['burn', 'slow', 'shock'][F.n % 3]; L2.slice(0, 6).forEach(e => elemOn(e, kk)); }
      if (c.has('bh')) L2.forEach(e => elemOn(e, ['burn', 'poison', 'break', 'slow'][Math.floor(rnd() * 4)]));
      if (c.has('ks')) (w.enemies || []).filter(e => !e.dead && !e.under && !inF(e) && inF(e, 6)).sort(() => rnd() - 0.5).slice(0, 2).forEach(e => { bolt(e); hit(e, F.pw * 0.3 * dmgK); });
    }
    if (F.t <= 0) {
      if (c.has('jl')) { R.fx && R.fx('boom', F.x, 0.4, F.z, { r: F.r, color: COL }); (w.enemies || []).filter(e => !e.dead && inF(e)).forEach(e => hit(e, F.pw * 3 * F.eff)); }
      kill(); return false;
    }
    return true;
  };
  T.souyu = (s, P, w, pw) => {
    const c = pick(), eff = c.form === 'qb' ? 0.9 : c.form === 'cw' ? 1.2 : 1;
    const r = (s.r || 5) * (c.form === 'tz' ? 1.3 : 1) * (c.has('gw') ? 1.6 : 1), life = (s.life || 8) * (c.has('gw') ? 1.5 : 1);
    let x = P.x, z = P.z;
    if (c.form !== 'qb' && R.SKILL_KIT && R.SKILL_KIT.aimIn) [x, z] = R.SKILL_KIT.aimIn(P, 10);
    kill();
    F = { x, z, r, life, t: life, pw: pw || 20, eff, c, follow: c.form === 'qb', pulse: 0, shot: 0, stun: 0.5, n: 0, rooted: new Set(), objs: mesh(x, z, r) };
    w.dyn.push(step);
    R.fx && R.fx('ring', x, 0.1, z, { r, color: COL });
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (...a) => { kill(); return lf0(...a); };
  // 共振、鎖定、魔化、極化（傷害）
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    if (F && e && !e.dead && !(o && (o.reflect || o.thorns))) {
      const c = F.c, P = W().P, din = inF(e);
      if (c.has('gz') && P && inF(P)) raw *= 1 + 0.2 * F.eff;
      if (din && c.has('sd')) raw *= 1 + 0.15 * F.eff;
      if (din && c.has('mh') && !(o && o.dot)) { raw *= 1 + 0.4 * F.eff; if (o && o.primary) { const r = he0(e, raw, o); if (!e.dead) elemOn(e, ['burn', 'slow', 'shock', 'poison', 'break'][Math.floor(rnd() * 5)]); return r; } }
      if (din && c.has('jh') && o && o.dot) raw *= 2;
    }
    return he0(e, raw, o);
  };
  // 壓制：裡面的敵人打你 −25%
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { if (F && F.c.has('yz') && src && src.def && inF(src)) raw *= 1 - 0.25 * F.eff; return hp0(raw, src, o); };
  // 協振：站在裡面放技能退回 30% 魔力
  const refund = f => (...a) => { const P = W().P, m0 = P ? P.mp : 0, r = f(...a); if (F && P && F.c.has('xz') && inF(P) && P.mp < m0) P.mp = Math.min(P.mpMax, P.mp + (m0 - P.mp) * 0.3 * F.eff); return r; };
  if (R.castSlot) R.castSlot = refund(R.castSlot);

  // ---------- 技能書：奏域下面的選項 ----------
  const css = document.createElement('style');
  css.textContent = '.sy-box{margin:2px 0 0;padding:8px;border:1px solid var(--line);border-radius:10px;background:rgba(255,184,224,.06)}'
    + '.sy-box h4{margin:0 0 6px;font-size:13px}.sy-row{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:4px 0}'
    + '.sy-row .sy-st{min-width:64px;font-size:11px;color:#E8C04A;letter-spacing:-1px}.sy-row .sy-st i{color:var(--muted,#888);font-style:normal}'
    + '.sy-row button{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:inherit;cursor:pointer}'
    + '.sy-row button.on{outline:2px solid #E8C04A;background:rgba(232,192,74,.2);border-color:transparent}.sy-row button:disabled{opacity:.4;cursor:default}'
    + '.sy-row .sy-lock{font-size:10.5px;opacity:.7}.sy-desc{font-size:11px;opacity:.8;margin-top:4px;min-height:1.3em}';
  document.head.appendChild(css);
  const learned = () => { const s = S(); if (!s || s.cls !== 'mage') return false; const st = s.classes && s.classes.mage; return !!(st && st.adv2 === 'harmonic' && R.skillsLearned && R.skillsLearned('mage').includes(ID)); };
  const html = () => {
    const c = conf(), st = star(), p = pick();
    const stars = n => '★'.repeat(Math.min(n, 9)) || '★0';
    return '<h4>奏域 ' + '★'.repeat(st) + '<span style="opacity:.4">' + '☆'.repeat(9 - st) + '</span>（' + st + '／9）</h4>'
      + TIERS.map(t => { const open = st >= t.star, cur = p.has; return '<div class="sy-row"><span class="sy-st">' + (t.star ? '★' + t.star : '★0') + '</span>' + (open ? t.opts.map(o => '<button type="button" data-sy="' + t.star + '" data-v="' + o[0] + '" class="' + (cur(o[0]) ? 'on' : '') + '" title="' + esc(o[2]) + '">' + esc(o[1]) + '</button>').join('') : '<span class="sy-lock">' + t.opts.map(o => o[1]).join('・') + '（奏域練到 ★' + t.star + ' 才能選）</span>') + '</div>'; }).join('')
      + '<div class="sy-row"><span class="sy-st">形態</span><button type="button" data-sy="form" data-v="" class="' + (p.form ? '' : 'on') + '" title="不選">不選</button>' + FORMS.map(f => '<button type="button" data-sy="form" data-v="' + f[0] + '" class="' + (p.form === f[0] ? 'on' : '') + '" title="' + esc(f[2]) + '">' + esc(f[1]) + '</button>').join('') + '</div>'
      + '<div class="sy-desc">' + esc([].concat(...TIERS.map(t => t.opts)).concat(FORMS).filter(o => p.has(o[0]) || p.form === o[0]).map(o => o[1] + '：' + o[2]).join('；')) + '</div>';
  };
  // 2026-10-08 作者：選項放在技能書裡奏域那張卡片的最下面（不放在上面換技能的地方）
  const fill = (foot, id) => {
    if (id !== ID || !learned()) return;
    let box = foot.querySelector('.sy-box'); if (!box) { box = document.createElement('div'); box.className = 'sy-box'; foot.appendChild(box); }
    box.innerHTML = html();
    box.querySelectorAll('[data-sy]').forEach(b => { b.onclick = e => { e.stopPropagation(); const c = conf(); c[b.dataset.sy] = b.dataset.v; R.save && R.save(); fill(foot, id); }; });
  };
  (R.SB_FOOT = R.SB_FOOT || []).push(fill);
})(window.R);
