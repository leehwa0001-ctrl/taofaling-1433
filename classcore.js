// 職業的核心玩法（作者 2026-10-05：我要有趣又好玩、多樣性的職業——十三個職業的核心玩法一次做）
// 每個職業一個別人沒有的機制，三、四條轉職路線各自把它往不同方向改；X 鍵（原本的「換彈」）變成「職業鍵」。
// 這個檔：共用的部分（R.CORE 登記、X 鍵、包 R.hurtEnemy／R.hurtPlayer／R.castSlot／R.step、職業量表）
//   ＋戰士、術士、槍手、弓箭手、刀客、騎士、武術家。牧師、吟遊詩人、召喚師、術陣師、附魔師、符卷師在 classcore2.js。
// 職業量表：生命圓表的上面一條（名字、數值、狀態、X 做什麼），滑鼠放上去看完整說明。
// - 戰士「怒氣」：魔力換成怒氣（0～100），打中、被打都會漲，技能吃怒氣，不打會慢慢掉；X（50 以上）怒吼：把怒氣全部吼出去，越多越痛、之後 6 秒傷害提高。
//   狂戰士：怒氣不會掉、殘血時被打漲兩倍；劍鬥士：6 秒內放三種不同的技能，下一下普攻變「終幕」（4 倍範圍）；
//   鬼武者：怒吼時戴上鬼面（扣 10% 生命，6 秒傷害 +30%、吸血系數 +100）；內修者：站著不動每秒 +8 怒氣。
// - 術士「元素反應」：X 換元素（火、冰、雷），之後的攻擊、法術都帶著這個元素；同一隻遺跡生物身上疊到不同元素就引爆：
//   火＋冰＝蒸發（大傷害）、冰＋雷＝碎冰（暈眩＋小範圍）、雷＋火＝過載（大範圍爆炸）。元素師反應 ×1.5；咒術師反應順便詛咒周圍；式神使、外修者反應回魔力。
// - 槍手「彈種＋完美換彈」：換彈的時候再按一次 X，按在中間那一格＝完美換彈（馬上換好、這一匣 +25%），按錯會卡彈；
//   彈匣滿的時候按 X 換彈種：一般→穿甲（對有甲的 +30%）→燃燒→冰凍。狙擊手打背後、暈住的 ×1.5；魔導槍手彈種效果兩倍；爆破手燃燒彈打倒的會炸開。
// - 弓箭手「完美蓄力」：X 拉滿弓，圈縮到金色那一格時再按 X＝完美射擊（四倍、貫穿全部、必定暴擊、疊一層鷹眼：每層 +6%、最多 5 層、被打就沒了）；
//   沒抓到就是普通的兩倍箭。魔弓手完美箭分成三支追蹤；遊俠在準心處放一個捕獸夾；破魔弓手射中的留破魔印（8 秒，你的傷害 +20%）。
// - 刀客「居合」：不攻擊（收刀）的時候累積刀意，下一刀照刀意加倍（滿了必定暴擊）；X 納刀 0.4 秒，這時被打就「見切」：不受傷、反斬周圍、刀意滿。
//   翻滾的一開始被打也算見切。劍豪刀意上限 150、倍率高；影刃見切後閃到背後隱身；妖刀使擊倒也漲刀意，但刀意滿著不用會吸你的血。
// - 騎士「格擋」：按住 Z 防禦的頭 0.3 秒被打＝完美格擋（不受傷、對方暈 1.5 秒、盾反擊、回體力）；防禦時身邊的隊友受到的傷害 −40%；
//   X 盾擊往前衝（完美格擋後 2 秒內＝反制，三倍）。殿堂騎士完美格擋把傷害整個彈回去；聖騎士完美格擋回 8% 生命；龍騎士完美格擋後的盾擊變成龍躍。
// - 武術家「連段」：打中就疊連段，2.5 秒沒打中或被打（掉超過 2% 生命）就斷；每 5 段普攻 +1%（最多 +20%）；
//   X（10 段以上）終結技：前方一大掌，連段越多越痛。拳聖連段上限 150、不容易斷；棍僧終結技是一圈；內修者站著不動連段不會掉；外修者魔力罩擋下的不會斷。
// 放在 skillbook.js、stamina.js、talentcap.js 後面、dmgmeter.js 前面（index.html 後段）。
(function (R) {
  const W = () => R.W, rnd = Math.random, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const CORE = R.CORE = R.CORE || {};
  let CT = 0;   // 遊戲時間（暫停不算）
  R.coreTime = () => CT;
  const pw = P => (R.SKILL_KIT && R.SKILL_KIT.power && P.ws ? R.SKILL_KIT.power(P.ws) : 20);
  const adv = P => P.adv || '';
  const live = () => { const w = W(); return !!(w.run && !w.run.done && w.P && !w.P.dead); };
  const coreOf = P => (P && live() ? CORE[P.cls] || null : null);
  const toast = (t, c) => R.toast && R.toast(t, c || '#FFE08A');
  const say = (P, t, c) => R.num && R.num(P.x, 2.8, P.z, t, c || 'crit');
  const front = (P, r, arc) => (W().enemies || []).filter(e => !e.dead && !e.under && dist(e, P) < r + e.def.size * 0.5 && (arc >= 6.2 || Math.abs(wrap(angTo(P, e) - P.aimA)) < arc / 2));
  R.coreKit = { W, pw, adv, live, toast, say, front, dist, angTo, wrap, rnd, CT: () => CT };

  // ---------- 共用的掛鉤 ----------
  let depth = 0;   // 職業效果自己打出去的傷害不再觸發職業效果
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P, c = depth ? null : coreOf(P);
    if (!c || !e || e.dead) return he0(e, raw, o);
    o = o || {};
    depth++;
    try {
      if (c.mod) { const r2 = c.mod(e, raw, o, P); if (typeof r2 === 'number') raw = r2; else if (r2 && typeof r2 === 'object') { raw = r2.raw; o = r2.o || o; } }
      const h0 = e.hp, r = he0(e, raw, o), dealt = Math.max(0, h0 - Math.max(0, e.hp));
      if (c.onHit) try { c.onHit(e, dealt, o, P, e.dead); } catch (err) { console.warn('[classcore]', err); }
      return r;
    } finally { depth--; }
  };
  R.coreHit = (e, raw, o) => { depth++; try { return R.hurtEnemy(e, raw, o); } finally { depth--; } };   // 職業效果的傷害（走完整的傷害流程，但不再觸發職業效果）
  R.coreAoe = (x, z, r, dmg, o) => { depth++; try { return R.aoe(x, z, r, dmg, o); } finally { depth--; } };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const P = W().P, c = coreOf(P);
    if (!c) return hp0(raw, src, o);
    if (c.onHurt) { const v = c.onHurt(raw, src, o || {}, P); if (v === false) return; if (typeof v === 'number') raw = v; }
    const h0 = P.hp + (P.shield || 0), r = hp0(raw, src, o), took = h0 - (P.hp + (P.shield || 0));
    if (c.afterHurt && took > 0) try { c.afterHurt(took, src, P); } catch (err) { console.warn('[classcore]', err); }
    return r;
  };
  // 放技能：冷卻有變長＝放出去了
  const cdOf = (P, i) => (i === 0 ? P.skillCd || 0 : (P.skCd && P.skCd[i]) || 0);
  const wrapCast = (f, slotOf) => (...a) => {
    const P = W().P, c = coreOf(P); if (!c || !c.onCast || !P) return f(...a);
    const i = slotOf(a), c0 = cdOf(P, i), r = f(...a);
    if (cdOf(P, i) > c0 + 0.01) { const id = i === 0 ? P.skill : R.slotSkill ? R.slotSkill(P, i) : null; try { c.onCast(P, i, id, R.SKILLS[id]); } catch (err) { console.warn('[classcore]', err); } }
    return r;
  };
  if (R.castSlot) R.castSlot = wrapCast(R.castSlot, a => a[0] || 0);
  if (R.useSkill) R.useSkill = wrapCast(R.useSkill, () => 0);
  // X：職業鍵（槍手照舊換彈，另外多完美換彈、換彈種）
  const rl0 = R.reload;
  R.reload = (...a) => {
    const P = W().P, c = coreOf(P);
    if (c && c.act) return c.act(P, () => rl0(...a));
    return rl0(...a);
  };
  R.classAction = () => R.reload();
  // 能力值（戰士的魔力上限＝怒氣 100）
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => { const P = cp0(cls), c = CORE[cls]; if (c && c.calc) try { c.calc(P); } catch (e) { } return P; };
  const lf0 = R.loadFloor;
  R.loadFloor = (...a) => { const r = lf0(...a); const P = W().P, c = coreOf(P); if (c && c.floor) try { c.floor(P); } catch (e) { } return r; };
  let uiT = 0;
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), w = W();
    if (!w.paused) CT += dt;
    try { const P = w.P, c = coreOf(P); if (c && c.step && !w.paused) c.step(dt, P); uiT -= dt; if (uiT <= 0) { uiT = 0.1; render(); } } catch (e) { console.warn('[classcore]', e); }
    return r;
  };

  // ---------- 職業量表 ----------
  const css = document.createElement('style');
  css.textContent = '#core-g{position:fixed;z-index:6;width:236px;padding:4px 7px 5px;border-radius:7px;background:rgba(16,12,20,.86);border:1px solid var(--cc,#6A5A70);color:#EDE6DA;font-size:11.5px;pointer-events:auto;cursor:help}'
    + '#core-g .cg-h{display:flex;justify-content:space-between;gap:6px}#core-g .cg-h b{color:var(--cc);font-size:12px}#core-g .cg-h span{color:#C8C0B0;font-variant-numeric:tabular-nums}'
    + '#core-g .cg-bar{position:relative;height:7px;margin-top:3px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}#core-g .cg-bar i{position:absolute;left:0;top:0;bottom:0;background:var(--cc)}#core-g .cg-bar em{position:absolute;top:0;bottom:0;background:rgba(255,230,140,.55)}'
    + '#core-g .cg-x{margin-top:3px;color:#A89CA8;font-size:10.5px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:1px 12px}#core-g .cg-x span,#core-g .cg-x b{white-space:nowrap}#core-g .cg-x b{color:#FFE08A;font-weight:600}#core-g.full{box-shadow:0 0 10px -2px var(--cc)}';
  document.head.appendChild(css);
  let g = null;
  const render = () => {
    const P = W().P, c = coreOf(P);
    if (!g || !g.isConnected) { const host = $('run'); if (!host) return; g = document.createElement('div'); g.id = 'core-g'; g.className = 'dungeon-only'; host.appendChild(g); }
    if (!c || !c.gauge) { g.hidden = true; return; }
    const hp = $('h2-hp'), r0 = hp && hp.getBoundingClientRect();
    if (!r0 || !r0.width) { g.hidden = true; return; }
    const bl = $('r-bl'), r1 = bl && bl.getBoundingClientRect(), top = r1 && r1.height && r1.right > r0.left ? Math.min(r0.top, r1.top) : r0.top;   // 左下的角色卡比較高的話放在它上面
    g.hidden = false; g.style.left = Math.max(6, Math.round(Math.min(r0.left - 4, r1 && r1.height ? r1.left : 1e9))) + 'px'; g.style.bottom = Math.round(innerHeight - top + 6) + 'px';
    const s = c.gauge(P) || {}, col = s.col || c.col || '#C8A86A';
    g.style.setProperty('--cc', col); g.classList.toggle('full', !!s.full);
    const tip = (c.help ? c.help(P) : '') || '';
    if (g.title !== tip) g.title = tip;
    const pct = s.max ? Math.max(0, Math.min(1, s.v / s.max)) : 0;
    const html = '<div class="cg-h"><b>' + esc(s.name || c.name) + '</b><span>' + esc(s.text != null ? s.text : Math.floor(s.v || 0) + (s.max ? '／' + s.max : '')) + '</span></div>'
      + (s.max ? '<div class="cg-bar"><i style="width:' + (pct * 100).toFixed(1) + '%"></i>' + (s.zone ? '<em style="left:' + (s.zone[0] * 100) + '%;width:' + ((s.zone[1] - s.zone[0]) * 100) + '%"></em>' : '') + '</div>' : '')
      + '<div class="cg-x"><span>' + esc(s.sub || '') + '</span><b>' + esc(s.x ? 'X：' + s.x : '') + '</b></div>';
    if (g.innerHTML !== html) g.innerHTML = html;
  };

  // ======================= 戰士：怒氣 =======================
  CORE.warrior = {
    name: '怒氣', col: '#E8503A',
    help: P => '怒氣（取代魔力）：打中、被打都會漲，技能吃怒氣；4 秒沒打沒被打就慢慢掉。X：怒氣 50 以上時怒吼（全部吼出去，越多越痛，之後 6 秒傷害提高）。'
      + ({ berserker: '狂戰士：怒氣不會掉，生命三成以下被打漲兩倍。', gladiator: '劍鬥士：6 秒內放三種不同的技能，下一下普攻變「終幕」（4 倍、範圍）。', onimusha: '鬼武者：怒吼時戴上鬼面（扣 10% 生命，6 秒傷害 +30%、吸血系數 +100）。', inner: '內修者：站著不動每秒 +8 怒氣。' }[adv(P)] || ''),
    calc: P => { P.mpMax = 100; },
    floor: P => { P._rage = 30; P.mp = 30; P._rageT = CT; },
    add(P, n) { P._rage = Math.min(100, (P._rage == null ? P.mp : P._rage) + n); P.mp = P._rage; P._rageT = CT; },
    step(dt, P) {
      if (P._rage == null) P._rage = Math.min(P.mp, 100);
      // 魔力的自然回復、魔力藥（2026-10-05 作者：魔力恢復等價轉成怒氣恢復，魔力藥不能變擺設）：多出來的魔力一律換成怒氣
      if (P.mp > P._rage + 1e-6) { P._rage = Math.min(100, P._rage + (P.mp - P._rage)); P.mp = P._rage; } else P._rage = P.mp;
      if (adv(P) === 'inner' && P.still > 0.5) this.add(P, 8 * dt);
      else if (adv(P) !== 'berserker' && CT - (P._rageT || 0) > 4 && P._rage > 0) { P._rage = Math.max(0, P._rage - 4 * dt); P.mp = P._rage; }
      if (P._mask > 0) P._mask -= dt;
    },
    onHit(e, d, o, P, killed) {
      if (d <= 0) return;
      if (o.primary) { if (!P._rageHit || CT - P._rageHit > 0.12) { P._rageHit = CT; this.add(P, 4); } } else if (!o.reflect) this.add(P, 1);
      if (killed) this.add(P, 5);
    },
    mod(e, raw, o, P) {
      if (P._finale && o.primary) { P._finale = false; say(P, '終幕', 'crit'); R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 3.2, color: '#FFB45A' }); R.coreAoe(P.x, P.z, 3.2, raw * 3, { kb: 2 }); return raw * 4; }
      return raw;
    },
    afterHurt(took, src, P) { let n = took / P.hpMax * 100 * 0.8; if (adv(P) === 'berserker' && P.hp < P.hpMax * 0.3) n *= 2; this.add(P, n); },
    onCast(P, i, id) {
      if (adv(P) !== 'gladiator' || !id) return;
      const L = (P._glad || []).filter(x => CT - x[1] < 6 && x[0] !== id); L.push([id, CT]); P._glad = L;
      if (new Set(L.map(x => x[0])).size >= 3) { P._glad = []; P._finale = true; say(P, '終幕準備', 'heal'); }
    },
    act(P) {
      const r = P._rage || 0; if (r < 50) { toast('怒氣 50 以上才能怒吼（現在 ' + Math.floor(r) + '）'); return; }
      const k = r / 50; P._rage = 0; P.mp = 0;
      R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 4.5, color: '#E8503A' }); R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 2.5, color: '#FFB45A' }); R.shake && R.shake(0.3);
      R.coreAoe(P.x, P.z, 4.5, pw(P) * 1.2 * k, { stun: 0.8, kb: 1.5 });
      P.sb = P.sb || {}; P.sb['core:roar'] = { left: 6, t: 6, dmg: 1 + 0.12 * k, color: '#E8503A' };
      if (adv(P) === 'onimusha') { P.hp = Math.max(1, P.hp - P.hpMax * 0.1); P._mask = 6; P.sb['core:mask'] = { left: 6, t: 6, dmg: 1.3, vamp: 0.05, color: '#C83A3A' }; say(P, '鬼面', 'crit'); }
      else say(P, '怒吼', 'crit');
    },
    gauge(P) { const r = P._rage || 0; return { v: r, max: 100, full: r >= 100, sub: P._finale ? '下一下普攻：終幕' : P._mask > 0 ? '鬼面 ' + P._mask.toFixed(1) + ' 秒' : adv(P) === 'berserker' ? '怒氣不會掉' : '', x: r >= 50 ? '怒吼' : '' }; }
  };

  // ======================= 術士：元素反應 =======================
  const EL = { fire: ['火', '#FF6A2A'], frost: ['冰', '#9AD8FF'], shock: ['雷', '#FFE070'] }, ELS = ['fire', 'frost', 'shock'];
  const REACT = { 'fire+frost': '蒸發', 'frost+shock': '碎冰', 'fire+shock': '過載' };
  CORE.mage = {
    name: '元素', col: '#B88AFF',
    help: P => '元素反應：X 換元素（火、冰、雷），之後的攻擊、法術都帶著這個元素。同一隻遺跡生物身上疊到不同元素就引爆——火＋冰＝蒸發（大傷害）、冰＋雷＝碎冰（暈眩＋小範圍）、雷＋火＝過載（大範圍爆炸）。元素在牠身上留 4 秒。'
      + ({ elementalist: '元素師：反應的威力 ×1.5。', hexer: '咒術師：反應順便詛咒周圍 4 公尺。', shikigami: '式神使：反應回 6 點魔力。', waixiu: '外修者：反應回 6 點魔力。' }[adv(P)] || ''),
    floor: P => { P._el = P._el || 'fire'; },
    onHit(e, d, o, P, killed) {
      const el = o.elem && EL[o.elem] ? o.elem : P._el || 'fire'; if (!e || o.reflect) return;
      const m = e._el || (e._el = {}), other = ELS.find(x => x !== el && (m[x] || 0) > CT);
      if (!other) { m[el] = CT + 4; return; }
      delete m[other]; delete m[el];
      const key = [el, other].sort().join('+'), name = REACT[key], tri = (R.legOf ? R.legOf(P) : null) === 'lg_tri', k = (adv(P) === 'elementalist' ? 1.5 : 1) * (tri ? 1.5 : 1) * pw(P);
      if (tri) P._el = ELS[(ELS.indexOf(P._el || 'fire') + 1) % 3];   // 三相之杖：反應之後自動換元素
      R.num && R.num(e.x, 2.6, e.z, name, 'crit');
      if (key === 'fire+frost') { R.fx && R.fx('poof', e.x, 1, e.z, { color: '#F0F0F0', n: 18 }); if (!e.dead) R.coreHit(e, k * 1.6, {}); }
      else if (key === 'frost+shock') { R.fx && R.fx('ring', e.x, 0.1, e.z, { r: 2.5, color: '#BFE8FF' }); if (!e.dead) e.st.stun = Math.max(e.st.stun || 0, 1.5); R.coreAoe(e.x, e.z, 2.5, k * 1.0, {}); }
      else { R.fx && R.fx('boom', e.x, 0.4, e.z, { r: 3.5, color: '#FFB45A' }); R.shake && R.shake(0.2); R.coreAoe(e.x, e.z, 3.5, k * 1.8, { kb: 2 }); }
      if (adv(P) === 'hexer') (W().enemies || []).forEach(x => { if (!x.dead && dist(x, e) < 4) x.st.curse = Math.max(x.st.curse || 0, 4); });
      if (adv(P) === 'shikigami' || adv(P) === 'waixiu') P.mp = Math.min(P.mpMax, P.mp + 6);
    },
    act(P) { const i = ELS.indexOf(P._el || 'fire'); P._el = ELS[(i + 1) % 3]; say(P, EL[P._el][0], 'heal'); R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 1.4, color: EL[P._el][1] }); },
    gauge(P) { const el = P._el || 'fire'; return { name: '元素：' + EL[el][0], col: EL[el][1], text: '火＋冰 蒸發・冰＋雷 碎冰・雷＋火 過載', x: '換成' + EL[ELS[(ELS.indexOf(el) + 1) % 3]][0] }; }
  };

  // ======================= 槍手：彈種＋完美換彈 =======================
  const AMMO = { normal: ['一般彈', '#C8C0B0'], pierce: ['穿甲彈', '#C8D0DC'], fire: ['燃燒彈', '#FF7A3A'], frost: ['冰凍彈', '#9AD8FF'] }, AM = ['normal', 'pierce', 'fire', 'frost'];
  const ZONE = [0.45, 0.65];
  CORE.gunner = {
    name: '彈藥', col: '#C8A86A',
    help: P => '彈種＋完美換彈：換彈的時候再按一次 X，按在中間金色那一格＝完美換彈（馬上換好、這一匣傷害 +25%），按錯會卡彈（多 0.5 秒）。彈匣滿的時候按 X 換彈種：一般→穿甲（對有甲的 +30%）→燃燒（18% 燃燒）→冰凍（25% 減速）。'
      + ({ sniper: '狙擊手：打背後、暈住的 ×1.5。', magigun: '魔導槍手：彈種的效果兩倍。', bomber: '爆破手：燃燒彈打倒的會炸開。' }[adv(P)] || ''),
    floor: P => { P._ammoT = P._ammoT || 'normal'; P._tried = false; },
    act(P, orig) {
      const ws = P.ws; if (!ws || ws.kind !== 'gun') return orig();
      if (P.reloadT > 0) {
        if (P._tried) return; P._tried = true;
        const p = 1 - P.reloadT / (ws.reload || 1);
        const Z = (R.legOf ? R.legOf(P) : null) === 'lg_receiver' ? [0.35, 0.75] : ZONE; if (p >= Z[0] && p <= Z[1]) { P.reloadT = 0.001; P._perfect = true; say(P, '完美換彈', 'heal'); R.sfx && R.sfx('pick'); }
        else { P.reloadT += 0.5; say(P, '卡彈', 'hurt'); }
        return;
      }
      if (P.ammo >= (ws.mag || 0)) { const i = AM.indexOf(P._ammoT || 'normal'); P._ammoT = AM[(i + 1) % AM.length]; say(P, AMMO[P._ammoT][0], 'heal'); return; }
      P._tried = false; P._perfect = false; return orig();
    },
    step(dt, P) { if (P.reloadT > 0 && P._reloading !== true) { P._reloading = true; P._tried = false; P._perfect = false; } if (!(P.reloadT > 0)) P._reloading = false; },
    mod(e, raw, o, P) {
      if (!o.primary) return raw;
      let k = P._perfect ? 1.25 : 1; const t = P._ammoT || 'normal', dbl = adv(P) === 'magigun' ? 2 : 1;
      if (t === 'pierce' && e.def.armor) k *= 1 + 0.3 * dbl;
      if (t === 'fire' && rnd() < 0.18 * dbl) e.st.burn = 3;
      if (t === 'frost' && rnd() < 0.25 * dbl) e.st.slow = Math.max(e.st.slow || 0, 2);
      if (adv(P) === 'sniper' && ((e.st.stun || 0) > 0 || Math.abs(wrap(angTo(e, P) - (e.yaw || 0))) > 2.1)) { k *= 1.5; if (rnd() < 0.3) say(P, '弱點', 'crit'); }
      return raw * k;
    },
    onHit(e, d, o, P, killed) { if (killed && o.primary && adv(P) === 'bomber' && (P._ammoT === 'fire')) { R.fx && R.fx('boom', e.x, 0.3, e.z, { r: 2, color: '#FF8A3A' }); R.coreAoe(e.x, e.z, 2, pw(P) * 0.6, {}); } },
    gauge(P) {
      const ws = P.ws || {}, t = P._ammoT || 'normal';
      if (P.reloadT > 0) return { name: '換彈中', col: '#FFE08A', v: 1 - P.reloadT / (ws.reload || 1), max: 1, text: P._tried ? '' : '抓金色那一格', zone: (R.legOf ? R.legOf(P) : null) === 'lg_receiver' ? [0.35, 0.75] : ZONE, x: P._tried ? '' : '完美換彈' };
      return { name: AMMO[t][0], col: AMMO[t][1], text: (P.ammo || 0) + '／' + (ws.mag || 0) + (P._perfect ? '・完美 +25%' : ''), sub: '', x: P.ammo >= (ws.mag || 0) ? '換彈種' : '換彈' };
    }
  };

  // ======================= 弓箭手：完美蓄力 =======================
  const DRAW = 1.0, WIN = [0.78, 0.95];
  CORE.archer = {
    name: '鷹眼', col: '#9AE07A',
    help: P => '完美蓄力：X 拉滿弓（走路變慢），圈縮到金色那一格時再按一次 X＝完美射擊：四倍傷害、貫穿全部、必定暴擊，疊一層鷹眼（每層 +6% 傷害、最多 5 層、8 秒，被打就沒了）。沒抓到就是普通的兩倍箭。冷卻 2.5 秒、花 12 體力。'
      + ({ arcane: '魔弓手：完美箭分成三支，會追蹤。', ranger: '遊俠：完美射擊在準心處放一個捕獸夾。', hama: '破魔弓手：完美箭射中的留破魔印（8 秒，你的傷害 +20%）。' }[adv(P)] || ''),
    shoot(P, perfect) {
      const ws = P.ws || {}, base = (ws.dmg || 10) * (perfect ? 4 : 2), a = P.aimA;
      const one = (da, hm) => R.fire({ kind: 'arrow', owner: 'p', x: P.x, z: P.z, a: a + da, speed: (ws.speed || 24) * 1.25, dmg: base, life: (ws.range || 15) / (ws.speed || 24) * 1.4, pierce: perfect ? 99 : 1, primary: false, crit: perfect, elem: perfect ? 'perfect' : null, homing: hm ? 1 : 0 });
      one(0, false);
      if (perfect && adv(P) === 'arcane') { one(0.22, true); one(-0.22, true); }
      if (perfect && adv(P) === 'ranger' && R.addZone) { const ax = P.aimX != null ? P.aimX : P.x + Math.sin(a) * 6, az = P.aimZ != null ? P.aimZ : P.z + Math.cos(a) * 6, q = R.nearestFloor ? R.nearestFloor(ax, az) : [ax, az]; R.addZone({ kind: 'trap', x: q[0], z: q[1], r: 1.1, life: 12, dmg: pw(P) * 1.5 }); }
      if (perfect) { P._hawk = Math.min((R.legOf ? R.legOf(P) : null) === 'lg_hawkking' ? 8 : 5, (P._hawk || 0) + 1); P._hawkT = CT + 8; say(P, '完美射擊', 'crit'); } else { say(P, '射擊', 'heal'); }
      R.sfx && R.sfx('bow'); P.h && (P.h.recoil = 1);
    },
    act(P) {
      if (P._draw) { const t = P._draw.t, ok = t >= WIN[0] * DRAW && t <= WIN[1] * DRAW; P._draw = null; P._drawCd = CT + 2.5; this.shoot(P, ok); return; }
      if ((P._drawCd || 0) > CT) { toast('還在冷卻（' + (P._drawCd - CT).toFixed(1) + ' 秒）'); return; }
      if (P.stam != null && P.stam < 12) { toast('體力不夠'); return; }
      if (P.stam != null) P.stam -= 12;
      P._draw = { t: 0 };
    },
    step(dt, P) {
      if (P._draw) { P._draw.t += dt; P.slowT = Math.max(P.slowT || 0, 0.1); if (P._draw.t > DRAW * 1.4) { P._draw = null; P._drawCd = CT + 2.5; this.shoot(P, false); } }
      if (P._hawk && CT > (P._hawkT || 0)) P._hawk = 0;
    },
    mod(e, raw, o, P) {
      let k = 1 + 0.06 * (P._hawk || 0);
      if ((e._hama || 0) > CT) k *= 1.2;
      if (o.elem === 'perfect' && adv(P) === 'hama') e._hama = CT + 8;
      return raw * k;
    },
    afterHurt(took, src, P) { if (P._hawk) { P._hawk = (R.legOf ? R.legOf(P) : null) === 'lg_hawkking' ? Math.floor(P._hawk / 2) : 0; say(P, '鷹眼斷了', 'hurt'); } },
    gauge(P) {
      if (P._draw) { const t = P._draw.t / DRAW; return { name: '拉弓', col: t >= WIN[0] && t <= WIN[1] ? '#FFE08A' : '#9AE07A', v: Math.min(1, t), max: 1, zone: WIN, text: '在金色那一格放', x: '放箭' }; }
      const cd = Math.max(0, (P._drawCd || 0) - CT);
      return { name: '鷹眼 ' + (P._hawk || 0) + ' 層', v: P._hawk || 0, max: (R.legOf ? R.legOf(P) : null) === 'lg_hawkking' ? 8 : 5, text: '+' + 6 * (P._hawk || 0) + '%', x: cd > 0 ? '冷卻 ' + cd.toFixed(1) : '拉滿弓' };
    }
  };

  // ======================= 刀客：居合 =======================
  CORE.blade = {
    name: '刀意', col: '#DDEEFF',
    help: P => '居合：不攻擊（收刀）的時候累積刀意，下一刀照刀意加倍（滿了必定暴擊）。X 納刀 0.4 秒：這時被打就「見切」——不受傷、反斬周圍、刀意直接滿；翻滾的一開始被打也算見切。'
      + ({ kensei: '劍豪：刀意上限 150，倍率更高。', shadow: '影刃：見切後閃到敵人背後、隱身 2 秒。', yoto: '妖刀使：擊倒也漲刀意；刀意滿著 3 秒不用，會開始吸你的血。' }[adv(P)] || ''),
    max: P => (adv(P) === 'kensei' ? 150 : 100),
    step(dt, P) {
      if ((P.atkCd || 0) > 0 || (P.atkHold || 0) > 0) P._lastAtk = CT;
      if (CT - (P._lastAtk || 0) > 0.6) P._iai = Math.min(this.max(P), (P._iai || 0) + 30 * dt);
      if (P._noto > 0) P._noto -= dt;
      const roll = P.h && P.h.roll > 0; if (roll && !P._rolling) { P._rolling = true; P._rollT = CT; } if (!roll) P._rolling = false;
      if (adv(P) === 'yoto') { if ((P._iai || 0) >= this.max(P)) { P._fullT = P._fullT || CT; if (CT - P._fullT > 3) P.hp = Math.max(1, P.hp - P.hpMax * 0.01 * dt); } else P._fullT = 0; }
    },
    mod(e, raw, o, P) {
      if (o.reflect) return raw;
      if (P._iaiUse == null && (P._iai || 0) >= 20) { P._iaiUse = P._iai; P._iai = 0; queueMicrotask(() => { P._iaiUse = null; }); }
      const v = P._iaiUse; if (v == null) return raw;
      const k = 1 + v / 100 * (adv(P) === 'kensei' ? 2 : 1.5);
      if (v >= 100) { o = Object.assign({}, o, { crit: true }); if (!P._iaiSaid) { P._iaiSaid = 1; say(P, '居合', 'crit'); queueMicrotask(() => { P._iaiSaid = 0; }); } }
      return { raw: raw * k, o };
    },
    onHit(e, d, o, P, killed) { if (killed && adv(P) === 'yoto') P._iai = Math.min(this.max(P), (P._iai || 0) + 20); },
    mikiri(P, src) {
      P._noto = 0; P._iai = this.max(P); P.iframe = Math.max(P.iframe || 0, 0.4); P._mikiriCd = CT + 0.6;
      say(P, '見切', 'crit'); R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 3, color: '#FFFFFF' }); R.shake && R.shake(0.2);
      R.coreAoe(P.x, P.z, 3, pw(P) * 2.5, { stun: 1 });
      if (adv(P) === 'shadow' && src && src.x != null) { const a = src.yaw || 0, q = R.nearestFloor ? R.nearestFloor(src.x - Math.sin(a) * 1.4, src.z - Math.cos(a) * 1.4) : [src.x, src.z]; R.fx && R.fx('blink', P.x, 1, P.z); P.x = q[0]; P.z = q[1]; P.invis = Math.max(P.invis || 0, 2); }
    },
    onHurt(raw, src, o, P) {
      if ((P._mikiriCd || 0) > CT) return;
      if (P._noto > 0 || (P._rolling && CT - (P._rollT || 0) < 0.25 && (P.iframe || 0) > 0)) { this.mikiri(P, src); return false; }
    },
    act(P) { if ((P._notoCd || 0) > CT) return; P._noto = 0.4; P._notoCd = CT + 1.5; P.stance = Math.max(P.stance || 0, 0.4); say(P, '納刀', 'heal'); },
    gauge(P) { const m = this.max(P), v = P._iai || 0; return { v, max: m, full: v >= 100, sub: P._noto > 0 ? '納刀中' : v >= 100 ? '下一刀必定暴擊' : '收刀累積', x: '納刀（見切）' }; }
  };

  // ======================= 騎士：格擋 =======================
  CORE.knight = {
    name: '格擋', col: '#C9A13A',
    help: P => '格擋：按住 Z 防禦的頭 0.3 秒被打＝完美格擋（不受傷、對方暈 1.5 秒、盾反擊、回 20 體力）。防禦的時候身邊 3.5 公尺的隊友受到的傷害 −40%。X 盾擊往前衝；完美格擋後 2 秒內是「反制」，三倍傷害。'
      + ({ templar: '殿堂騎士：完美格擋把傷害整個彈回去。', paladin: '聖騎士：完美格擋回 8% 生命。', dragoon: '龍騎士：完美格擋後的盾擊變成龍躍（跳到準心處砸下）。' }[adv(P)] || ''),
    onHurt(raw, src, o, P) {
      const run = W().run; if (!P.guard || !run || P.guardT0 == null || run.t - P.guardT0 > ((R.legOf ? R.legOf(P) : null) === 'lg_vow' ? 0.5 : 0.3) || !src || src.dead) return;
      say(P, '完美格擋', 'crit'); R.fx && R.fx('block', P.x, 1.2, P.z); R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 2, color: '#FFE08A' });
      if (src.st) src.st.stun = Math.max(src.st.stun || 0, 1.5);
      if (src.hp != null && src.def) R.coreHit(src, pw(P) * 1.5 + (adv(P) === 'templar' ? raw : 0), { kb: 2 });
      if (P.stam != null) P.stam = Math.min(P.stamMax || 100, P.stam + 20);
      if (adv(P) === 'paladin') R.healP(P.hpMax * 0.08);
      P._riposte = CT + 2; return false;
    },
    act(P) {
      if ((P._bashCd || 0) > CT) return; P._bashCd = CT + 4;
      const rip = (P._riposte || 0) > CT, a = P.aimA;
      if (rip && adv(P) === 'dragoon') {
        const ax = P.aimX != null ? P.aimX : P.x + Math.sin(a) * 6, az = P.aimZ != null ? P.aimZ : P.z + Math.cos(a) * 6, d = Math.min(8, Math.hypot(ax - P.x, az - P.z)), q = R.nearestFloor ? R.nearestFloor(P.x + Math.sin(a) * d, P.z + Math.cos(a) * d) : [ax, az];
        R.fx && R.fx('blink', P.x, 1, P.z); P.x = q[0]; P.z = q[1]; P.iframe = Math.max(P.iframe || 0, 0.4); R.fx && R.fx('boom', P.x, 0.3, P.z, { r: 3.2, color: '#9AD8FF' }); R.shake && R.shake(0.3);
        R.coreAoe(P.x, P.z, 3.2, pw(P) * 3, { stun: 1, kb: 2 }); P._riposte = 0; say(P, '龍躍', 'crit'); return;
      }
      const jd = rip && (R.legOf ? R.legOf(P) : null) === 'lg_judge'; front(P, jd ? 5 : 3.5, jd ? 2.6 : 1.8).forEach(e => R.coreHit(e, pw(P) * (rip ? 3 : 1.2), { stun: jd ? 3 : 1, kb: 2 }));   // 盾往前撞：前方 3.5 公尺都吃到
      if (R.dash) R.dash(a, 2.4, 0.18, { iframe: true });
      R.fx && R.fx('swing', P.x, 1.1, P.z, { a, range: 3.5, arc: 1.8, color: rip ? '#FFE08A' : '#C9A13A' });
      say(P, rip ? '反制' : '盾擊', rip ? 'crit' : 'heal'); P._riposte = 0;
    },
    gauge(P) { const rip = (P._riposte || 0) > CT, cd = Math.max(0, (P._bashCd || 0) - CT); return { name: rip ? '反制！' : P.guard ? '防禦中' : '格擋', col: rip ? '#FFE08A' : '#C9A13A', text: P.guard ? '頭 0.3 秒被打＝完美' : '按住 Z 防禦', x: cd > 0 ? '冷卻 ' + cd.toFixed(1) : rip ? '反制（三倍）' : '盾擊' }; }
  };
  // 防禦的時候護著身邊的隊友
  const ha0 = R.hurtAlly;
  if (ha0) R.hurtAlly = (a, raw, src, ...rest) => { const P = W().P; if (P && P.cls === 'knight' && P.guard && a && dist(a, P) < 3.5 && live()) raw *= 0.6; return ha0(a, raw, src, ...rest); };

  // ======================= 武術家：連段 =======================
  CORE.monk = {
    name: '連段', col: '#FFB45A',
    help: P => '連段：打中就疊連段，' + (adv(P) === 'fistsaint' ? '3.5' : '2.5') + ' 秒沒打中、或被打掉超過 2% 生命就斷。每 5 段普攻 +1%（最多 +20%）。X（10 段以上）終結技：前方一大掌，連段越多越痛（每 10 段 +1 倍）。'
      + ({ fistsaint: '拳聖：連段上限 150、3.5 秒才斷。', staffmonk: '棍僧：終結技是身邊一圈。', inner: '內修者：站著不動連段不會掉。', waixiu: '外修者：被打的傷害被魔力罩擋下時，連段不會斷。' }[adv(P)] || ''),
    max: P => (adv(P) === 'fistsaint' ? 150 : 100) + ((R.legOf ? R.legOf(P) : null) === 'lg_thousand' ? 100 : 0),
    step(dt, P) { const keep = adv(P) === 'inner' && P.still > 0.3, gap = adv(P) === 'fistsaint' ? 3.5 : 2.5; if (!keep && (P._combo || 0) > 0 && CT - (P._comboT || 0) > gap) P._combo = 0; },
    onHit(e, d, o, P) { if (d <= 0 || o.reflect) return; if (!P._cbF || CT - P._cbF > 0.05) { P._cbF = CT; P._combo = Math.min(this.max(P), (P._combo || 0) + 1); } P._comboT = CT; },
    mod(e, raw, o, P) { return o.primary ? raw * (1 + Math.min(0.2, (P._combo || 0) * 0.002)) : raw; },
    afterHurt(took, src, P) { if (took > P.hpMax * ((R.legOf ? R.legOf(P) : null) === 'lg_immovable' ? 0.1 : 0.02) && (P._combo || 0) > 0 && !(adv(P) === 'waixiu' && P.shield > 0)) { if (P._combo >= 10) say(P, '連段斷了', 'hurt'); P._combo = 0; } },
    act(P) {
      const c = P._combo || 0; if (c < 10) { toast('連段 10 以上才能放終結技（現在 ' + c + '）'); return; }
      const ring = adv(P) === 'staffmonk', k = pw(P) * 0.8 * (1 + c / 10);
      front(P, ring ? 4 : 3.5, ring ? 6.3 : 1.8).forEach(e => R.coreHit(e, k, { stun: 1, kb: 2 }));
      R.fx && R.fx(ring ? 'ring' : 'swing', P.x, ring ? 0.1 : 1.1, P.z, ring ? { r: 4, color: '#FFB45A' } : { a: P.aimA, range: 3.5, arc: 1.8, color: '#FFB45A' }); R.shake && R.shake(0.25);
      say(P, '終結 ×' + (1 + c / 10).toFixed(1), 'crit'); P._combo = (R.legOf ? R.legOf(P) : null) === 'lg_thousand' ? Math.floor(c / 2) : 0;
    },
    gauge(P) { const c = P._combo || 0, m = this.max(P); return { name: '連段 ' + c, v: c, max: m, full: c >= m, text: '普攻 +' + Math.min(20, Math.floor(c / 5)) + '%', x: c >= 10 ? '終結技 ×' + (1 + c / 10).toFixed(1) : '' }; }
  };
})(window.R);
