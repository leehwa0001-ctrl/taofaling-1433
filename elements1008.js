// 元素（2026-10-08 作者回饋）
// - 火太強：原本燃燒每 0.5 秒固定扣 2.5＋等級×1.5（不看你多強，等級 2 就一秒 12，比大劍一秒砍的還多），技能多段、範圍打到的每一隻都燒。
//   → 燃燒改成真的燒在敵人身上的持續傷害：每 0.5 秒＝你技能威力的 10%（照你的武器、等級成長），3 秒。燒著的時候再點火只會續秒數，不會疊（多段技能不會燒十幾次）。
//   燃燒不會暴擊、不吸血、不觸發元素。燒著的敵人身上火苗大一點（fxplus.js）。
// - 冰太弱：緩速從 45% 改成 50%，而且所有遺跡生物都會變慢（原本自己有走法的遺跡生物不吃緩速）；攻擊也慢 30%。
// - 雷看不到：連鎖閃電從一條細線改成粗的折線＋白色的芯，留久一點。
// - 新的元素：風、毒（木）、金。
//   風（疾風）：放出一道風刃，往前一直線、穿過 3 隻，傷害＝那一下的 60%。
//   毒（蝕毒）：中毒可疊 5 層，6 秒；每秒＝技能威力的 4% × 層數。燒是短的爆發，毒是慢慢疊。
//   金（破甲）：5 秒內受到的傷害 +15%。
// - 武器的元素詞綴（焚燒、霜寒、雷鳴、疾風、蝕毒、破甲）只從鐵匠的附魔來，一把武器只會有一種元素；隨機詞綴不再骰到元素。
//   舊存檔：武器上骰出來的元素詞綴，還沒附魔的話留一條當成附魔，其他的換成同等級的「鋒利」。
//   附魔用的晶石多三種：風晶、毒晶、金晶（買素材買得到，精英、領主體也會掉）。
// - 附魔師（#25）：刻著的刻印會改變技能——焰＝傷害 +25%、燃燒；霜＝變慢、範圍技定身；雷＝冷卻 −20%、攻速 +20%；
//   風＝普攻帶劍氣、技能範圍 +25%；金＝破甲、技能範圍 −25% 但傷害 +40%。X 依序換（classcore2.js）。
// 放在 classcore2.js、buildfx.js、skillvar.js 後面（包 R.hurtEnemy、R.updateEnemies、R.addFx、R.weaponStats、R.migrate、R.SKILL_TYPES）。
(function (R) {
  const W = () => R.W, CT = () => performance.now() / 1000, rnd = Math.random;
  const num = v => (Number.isFinite(+v) ? +v : 0);
  const powerOf = P => { try { if (R.SKILL_KIT && R.SKILL_KIT.power && P && P.ws) return R.SKILL_KIT.power(P.ws); } catch (e) { } return ((P && P.ws && P.ws.dmg) || 10) * 2; };

  // ---------- 燃燒、中毒：每一跳（combat.js 的 R.updateEnemies 裡叫；回傳 true＝死了）----------
  R.elemTick = (e, dt) => {
    const st = e.st, P = W().P;
    if (st.burn > 0) {
      e.burnT = (e.burnT || 0) + dt;
      if (e.burnT > 0.5) { e.burnT = 0; R.hurtEnemy(e, Math.max(1, powerOf(P) * 0.1), { dot: 'burn', critChance: 0 }); if (e.dead) return true; }
    }
    const ps = e._psn;
    if (ps) {
      ps.t -= dt;
      if (ps.t <= 0 || ps.n <= 0) e._psn = null;
      else { ps.k = (ps.k || 0) + dt; if (ps.k >= 1) { ps.k = 0; R.hurtEnemy(e, Math.max(1, ps.pw * 0.04 * ps.n) + (ps.pct ? (e.hpMax || 0) * ps.pct / Math.max(0.1, (P && P.dmgMult) || 1) : 0), { dot: 'poison', critChance: 0 }); if (e.dead) return true; } }   // ps.pct：附魔・毒的毒再扣最大生命的 %（enchant1009.js）
    }
    return false;
  };

  // ---------- 風、毒、金 ----------
  R.elemWind = (P, e, dealt, k, rune, rk) => {   // rk：距離的倍率（附魔師的風刻印 1.3）
    if (!P || (P._windCd || 0) > CT()) return; P._windCd = CT() + (rune ? 0.3 : 0.25);
    const sp = 26, range = Math.max(6, ((P.ws && P.ws.range) || 6) * 1.6) * (rk || 1);
    const s = R.fire({ kind: 'hama', owner: 'p', x: P.x, z: P.z, a: P.aimA || 0, speed: sp, dmg: Math.max(1, num(dealt) * (k || 0.6) / Math.max(0.1, P.dmgMult || 1)), life: range / sp, pierce: 3 });
    if (s && s.mesh) { s.mesh.scale.set(14, 0.6, 0.3); }
  };
  R.elemPoison = (e, P, o) => {   // o.cap：最多疊幾層（附魔・毒 10 層）、o.pct：每一跳再扣最大生命的比例
    if (!e || e.dead || (e._psnCd || 0) > CT()) return; e._psnCd = CT() + 0.3;
    const ps = e._psn || (e._psn = { n: 0, t: 0, k: 0, pw: 0 });
    if (!ps.n && R.num) R.num(e.x, 1.8 * ((e.def && e.def.size) || 1) + 0.9, e.z, '中毒', '');
    ps.n = Math.min((o && o.cap) || Math.max(5, ps.cap || 5), ps.n + 1); ps.t = 6; ps.pw = Math.max(ps.pw || 0, powerOf(P)); if (o && o.cap) ps.cap = o.cap; if (o && o.pct) ps.pct = Math.max(ps.pct || 0, o.pct);
  };
  R.elemBreak = e => {
    if (!e || e.dead) return;
    if (!((e._brk || 0) > CT()) && R.num) R.num(e.x, 1.8 * ((e.def && e.def.size) || 1) + 0.9, e.z, '破甲', '');
    e._brk = CT() + 5;
  };
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    o = o || {};
    if (e && !e.dead && (e._brk || 0) > CT() && !o.reflect) raw *= 1.15;   // 破甲：受到的傷害 +15%
    const r = he0(e, raw, o);
    try {
      const P = W().P;
      if (P && e && !o.reflect && !o.noVamp && !o.thorns && !o.dot && (o.primary || o.elem)) {
        const ws = P.ws || {}, el = o.elem;
        if (el === 'wind' || (o.primary && rnd() < num(ws.wind))) R.elemWind(P, e, r, 0.6);
        if (!e.dead && (el === 'poison' || (o.primary && rnd() < num(ws.poison)))) R.elemPoison(e, P);
        if (!e.dead && (el === 'metal' || (o.primary && rnd() < num(ws.metal)))) R.elemBreak(e);
      }
    } catch (err) { console.warn('[elements1008]', err); }
    return r;
  };

  // ---------- 冰：緩速 50%，所有遺跡生物都吃（自己有走法的也是）；攻擊慢 30% ----------
  R.slowAll = true;
  const ue0 = R.updateEnemies;
  if (ue0) R.updateEnemies = (dt, ...a) => {
    const L = (W().enemies || []).filter(e => !e.dead && e.st && e.st.slow > 0 && e.speed > 0), saved = L.map(e => { const s0 = e.speed; e.speed = s0 * 0.5; return s0; });
    try { return ue0(dt, ...a); }
    finally { L.forEach((e, i) => { if (Math.abs(e.speed - saved[i] * 0.5) < 1e-9) e.speed = saved[i]; if (e.st && e.st.slow > 0 && e.cd != null) e.cd += dt * 0.3; }); }
  };

  // ---------- 雷：連鎖閃電畫粗一點（折線＋白芯）----------
  const fx0 = R.addFx;
  let boxG = null;
  R.addFx = (kind, x, y, z, o) => {
    if (kind !== 'bolt' || !o || !o.to || !window.THREE || !W().scene) return fx0(kind, x, y, z, o);
    try {
      const TH = window.THREE, w = W(), f = { kind: 'bolt2', t: 0, life: 0.32, objs: [] };
      boxG = boxG || new TH.BoxGeometry(1, 1, 1);
      const to = o.to, h0 = y || 1.1, h1 = (to.y != null ? to.y : 1.1), N = 4, pts = [];
      for (let i = 0; i <= N; i++) { const k = i / N, j = i === 0 || i === N ? 0 : 0.45; pts.push([x + (to.x - x) * k + (rnd() - 0.5) * j, h0 + (h1 - h0) * k + (rnd() - 0.5) * j, z + (to.z - z) * k + (rnd() - 0.5) * j]); }
      const seg = (a, b, th, col, op) => { const m = new TH.Mesh(boxG, new TH.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })); const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); m.scale.set(th, th, Math.max(0.01, len)); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.lookAt(b[0], b[1], b[2]); w.scene.add(m); f.objs.push(m); };
      for (let i = 0; i < N; i++) { seg(pts[i], pts[i + 1], 0.26, o.color || '#7FC8FF', 0.55); seg(pts[i], pts[i + 1], 0.1, '#FFFFFF', 1); }
      w.fxs.push(f);
    } catch (err) { return fx0(kind, x, y, z, o); }
  };

  // ---------- 詞綴：元素只從附魔來 ----------
  const WA = R.W_AFFIX || [];
  WA.forEach(a => { if (a.id === 'fire' || a.id === 'frost' || a.id === 'shock') a.enchOnly = 1; });
  WA.push(
    { id: 'wind', name: '疾風', roll: [15, 35], enchOnly: 1, txt: v => v + '% 機率放出風刃（往前一直線、穿過 3 隻）' },
    { id: 'poison', name: '蝕毒', roll: [20, 45], enchOnly: 1, txt: v => v + '% 機率讓敵人中毒（最多疊 5 層，6 秒）' },
    { id: 'metal', name: '破甲', roll: [15, 35], enchOnly: 1, txt: v => v + '% 機率破甲（5 秒內受到的傷害 +15%）' });
  const wsf0 = R.weaponStats;
  if (wsf0) R.weaponStats = it => {
    const ws = wsf0(it); if (!ws || !it) return ws;
    const aff = id => (it.identified && it.affixes ? it.affixes.filter(a => a.id === id).reduce((q, a) => q + a.v, 0) : 0);
    ws.wind = (ws.wind || 0) + aff('wind') / 100; ws.poison = (ws.poison || 0) + aff('poison') / 100; ws.metal = (ws.metal || 0) + aff('metal') / 100;
    return ws;
  };
  // 舊存檔：隨機骰出來的元素詞綴 → 沒附魔的話留一條當附魔，其他換成「鋒利」（照骰的高低換算）
  const ELEM = new Set(['fire', 'frost', 'shock']);
  const fixItem = it => {
    if (!it || it.kind !== 'weapon' || !Array.isArray(it.affixes) || it._elem1008) return; it._elem1008 = 1;
    const rolled = it.affixes.filter(a => a && ELEM.has(a.id) && !a.ench); if (!rolled.length) return;
    if (!it.enchant) { const best = rolled.slice().sort((a, b) => b.v - a.v)[0]; best.ench = 1; it.enchant = best.id; rolled.splice(rolled.indexOf(best), 1); }
    const sh = WA.find(a => a.id === 'sharp');
    rolled.forEach(a => { const d = WA.find(x => x.id === a.id), lo = d ? d.roll[0] : 10, hi = d ? d.roll[1] : 40, t = Math.max(0, Math.min(1, (a.v - lo) / Math.max(1, hi - lo))); a.id = 'sharp'; a.v = Math.round(sh.roll[0] + t * (sh.roll[1] - sh.roll[0])); });
  };
  const walk = (o, seen) => { if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o); if (o.kind === 'weapon' && Array.isArray(o.affixes)) { fixItem(o); return; } (Array.isArray(o) ? o : Object.values(o)).forEach(v => walk(v, seen)); };
  const mg0 = R.migrate;
  R.migrate = s => { s = mg0 ? mg0(s) : s; try { walk(s, new Set()); } catch (e) { console.warn('[elements1008]', e); } return s; };
  // 新晶石：精英、領主體掉
  const ke0 = R.killEnemy;
  if (ke0) R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by);
    try { const run = W().run; if (was && e.dead && run && e.def && !e.def.human && !e.def.wild && !(by && by.rival) && (e.def.elite || e.leader || e.def.boss) && rnd() < 0.12 && R.dropMat) R.dropMat(['windcry', 'venomcry', 'metalcry'][Math.floor(rnd() * 3)], 1, e.x, e.z + 0.5); } catch (err) { }
    return r;
  };

  // ---------- 附魔師：刻印改變技能 ----------
  const RS = {
    flame: { dmg: 1.25, area: 1, burn: 1 },
    frost: { dmg: 1, area: 1, slow: 3, root: 0.6 },
    storm: { dmg: 1, area: 1 },
    wind: { dmg: 1, area: 1.25 },
    metal: { dmg: 1.4, area: 0.75, brk: 1 }
  };
  R.RUNE_SKILL = RS;
  const AREA = ['r', 'len', 'width', 'hitR', 'radius', 'reach', 'step'];
  const ROOTY = new Set(['nova', 'at', 'arc', 'line', 'wave', 'xslash', 'storm']);
  const runeOf = P => (P && P.cls === 'enchanter' && W().run ? P._rune || 'flame' : null);
  const T = R.SKILL_TYPES || {};
  let tdep = 0;
  Object.keys(T).forEach(k => {
    const f = T[k]; if (typeof f !== 'function') return;
    T[k] = function (s, P, w, pw, ...a) {
      const rn = runeOf(P), m = rn && RS[rn]; if (!m || !s || typeof s !== 'object') return f.call(this, s, P, w, pw, ...a);
      s = Object.assign({}, s);
      if (m.area !== 1) AREA.forEach(key => { if (typeof s[key] === 'number') s[key] *= m.area; });
      if (m.burn) s.burn = 1;
      if (m.slow) s.slow = Math.max(s.slow || 0, m.slow);
      if (m.root && ROOTY.has(k)) s.root = Math.max(s.root || 0, m.root);
      if (tdep === 0 && typeof pw === 'number') pw *= m.dmg;
      tdep++; const brk = m.brk ? 1 : 0; if (brk) R._runeBrk = (R._runeBrk || 0) + 1;
      try { return f.call(this, s, P, w, pw, ...a); } finally { tdep--; if (brk) R._runeBrk--; }
    };
  });
  // 金：技能打中的破甲（施放當下打到的）
  const he1 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { const r = he1(e, raw, o); if (R._runeBrk > 0 && e && !e.dead && !(o && (o.reflect || o.dot))) R.elemBreak(e); return r; };
  // 雷：技能冷卻 −20%、攻速 +20%
  const storm = () => { const P = W().P; return runeOf(P) === 'storm' ? P : null; };
  const cdNow = (P, i) => (i === 0 ? num(P.skillCd) : num(P.skCd && P.skCd[i]));
  const cs0 = R.castSlot;
  if (cs0) R.castSlot = i => { const P = storm(), c0 = P ? cdNow(P, i | 0) : 0, r = cs0(i); if (P && cdNow(P, i | 0) > c0 + 0.01) { if ((i | 0) === 0) P.skillCd *= 0.8; else P.skCd[i] *= 0.8; } return r; };
  const at0 = R.attack;
  if (at0) R.attack = (...a) => { const P = storm(), c0 = P ? num(P.atkCd) : 0, r = at0(...a); if (P && num(P.atkCd) > c0 + 0.001) P.atkCd /= 1.2; return r; };
})(window.R);
