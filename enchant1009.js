// 附魔師的附魔技能重做（2026-10-09 作者：不要只是讓武器帶那個元素加一點點增益，要讓武器得到符合元素特性的額外效果）
// - 附魔・焰：打中的燃燒、攻擊範圍 +25%、傷害 +10%。
// - 附魔・霜：打中的變慢；每一下 15% 機率凍住 2 秒；對變慢的敵人傷害 +15%、對凍住／暈眩／定身的敵人傷害 +30%（兩個取高的，不疊）。
// - 附魔・風：攻擊範圍 +50%、擊退 +100%、移動 +25%。
// - 附魔・雷：攻擊帶電（每一下打中都放連鎖閃電）、攻速 +25%；閃電讓敵人麻痺 0.5 秒；連鎖最多傳 10 隻（平常 5 隻）。
// - 「傑作」改成「附魔・金」：攻擊範圍 −30%，但傷害 +50%、多無視 40% 的護甲。
// - 「魔力爆發」改成「附魔・毒」：所有攻擊都帶毒、毒最多疊 10 層（平常 5 層），每一跳再扣目標最大生命的 0.5%（領主體 0.1%）。
// - 附魔師的刻印：風刻印的普攻每一揮都放劍氣（不用打中、距離 +30%）；刻印攢滿了自動釋放（classcore2.js）。
// 效果都掛在技能書增益（P.sb）的旗子上：enFlame、enFrost、enWind、enShock、enMetal、enPoison；範圍、擊退、穿甲照增益在不在相對地套在武器上。
// 放在 classes2b.js、skills3.js、prune1008.js、elements1008.js、classcore2.js 後面。
(function (R) {
  const W = () => R.W, LIB = R.SKILL_LIB || {}, SK = R.SKILLS || {}, CT = () => performance.now() / 1000;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  // ---------- 技能 ----------
  const set = (id, o) => { const L = LIB[id]; if (!L) return; Object.assign(L, o); if (SK[id]) Object.assign(SK[id], { name: L.name, desc: L.desc, cd: L.cd, mp: L.mp }); };
  set('en_flame', { p: { t: 8, enFlame: 1, burn: 1, dmg: 1.1, color: '#FF7A3A' }, desc: '把焰的咒文刻進武器：8 秒內打中的敵人燃燒，攻擊範圍 +25%、傷害 +10%。' });
  set('en_frost', { p: { t: 8, enFrost: 1, color: '#9AD8FF' }, desc: '把霜的咒文刻進武器：8 秒內打中的敵人變慢，每一下 15% 機率凍住 2 秒；對變慢的敵人傷害 +15%、對凍住或暈眩的敵人傷害 +30%（取高的）。' });
  set('en_gale', { p: { t: 8, enWind: 1, speed: 1.25, color: '#BFF0D0' }, desc: '把風的咒文刻進鞋底和刀身：8 秒內攻擊範圍 +50%、擊退 +100%、移動 +25%。' });
  set('en_shock', { p: { t: 8, enShock: 1, rate: 1.25, color: '#E8E07A' }, desc: '把雷的咒文刻進武器：8 秒內攻擊帶電（每一下打中都放連鎖閃電，最多傳 10 隻、被電到的麻痺 0.5 秒），攻速 +25%。' });
  set('en_masterwork', { name: '附魔・金', p: { t: 8, enMetal: 1, dmg: 1.5, color: '#D8D8E0' }, desc: '把金的咒文刻進武器：8 秒內攻擊範圍 −30%，但傷害 +50%、多無視 40% 的護甲。' });
  set('en_burst', { name: '附魔・毒', type: 'buff', cd: 14, mp: 12, p: { t: 8, enPoison: 1, color: '#8AD84A' }, desc: '把毒的咒文刻進武器：8 秒內所有攻擊都帶毒，毒最多疊 10 層（平常 5 層），每一跳再扣目標最大生命的 0.5%（領主體 0.1%）。' });
  const on = (P, f) => !!(P && P.sb && Object.keys(P.sb).some(k => { const b = P.sb[k]; return b && b[f] && b.left > 0; }));
  // ---------- 範圍、擊退、穿甲：照增益在不在，相對地套在武器上（換武器、重算數值之後重新套） ----------
  const apply = P => {
    const ws = P && P.ws; if (!ws) return;
    if (P._enWs !== ws) { P._enWs = ws; P._enR = 1; P._enK = 1; P._enPen = 0; }
    const rg = (on(P, 'enFlame') ? 1.25 : 1) * (on(P, 'enWind') ? 1.5 : 1) * (on(P, 'enMetal') ? 0.7 : 1), kb = on(P, 'enWind') ? 2 : 1, pen = on(P, 'enMetal') ? 0.4 : 0;
    if (Math.abs(rg - P._enR) > 1e-4) { ws.range = (ws.range || 2) * rg / P._enR; if (ws.arc) ws.arc = Math.min(6.28, ws.arc * rg / P._enR); P._enR = rg; }
    if (Math.abs(kb - P._enK) > 1e-4) { ws.kb = (ws.kb || 0.5) * kb / P._enK; P._enK = kb; }
    if (Math.abs(pen - P._enPen) > 1e-4) { P.pen = Math.max(0, Math.min(0.9, (P.pen || 0) - P._enPen + pen)); P._enPen = pen; }
  };
  const st0 = R.step;
  R.step = dt => { const r = st0(dt); try { const P = W().P; if (P && W().run) apply(P); } catch (e) { } return r; };
  // ---------- 打中的效果 ----------
  const hard = e => (e.st.stun || 0) > 0 || (e.st.root || 0) > 0 || (e._frz || 0) > CT();
  let inChain = 0;
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P; o = o || {};
    if (!P || !P.sb || !e || e.dead || o.reflect || o.thorns) return he0(e, raw, o);
    const frost = on(P, 'enFrost');
    if (frost && e.st) raw *= hard(e) ? 1.3 : (e.st.slow || 0) > 0 ? 1.15 : 1;   // 霜：對控制住的敵人（取高的、不疊）
    const r = he0(e, raw, o);
    try {
      if (o.dot) return r;
      if (o.primary && frost && !e.dead) {
        e.st.slow = Math.max(e.st.slow || 0, 2);
        if (Math.random() < 0.15) { e.st.stun = Math.max(e.st.stun || 0, 2); e._frz = CT() + 2; R.fx && R.fx('ring', e.x, 0.3, e.z, { r: 1.1, color: '#BFE6FF' }); R.num && R.num(e.x, 1.8 * ((e.def && e.def.size) || 1) + 0.9, e.z, '凍結', ''); }
      }
      if (o.primary && on(P, 'enShock') && !inChain && (P._enChainCd || 0) <= CT()) { P._enChainCd = CT() + 0.2; R.chain(e, Math.max(1, (r || raw) * 0.5)); }   // 雷：攻擊帶電
      if (on(P, 'enPoison') && !e.dead && R.elemPoison) R.elemPoison(e, P, { cap: 10, pct: e.def && e.def.boss ? 0.001 : 0.005 });   // 毒：所有攻擊
    } catch (err) { }
    return r;
  };
  // 雷：連鎖最多 10 隻、被電到的麻痺 0.5 秒
  const ch0 = R.chain;
  R.chain = (from, dmg) => {
    const P = W().P; if (!on(P, 'enShock')) return ch0(from, dmg);
    inChain++;
    try { (W().enemies || []).filter(e => !e.dead && e !== from && dist(e, from) < 6).sort((a, b) => dist(a, from) - dist(b, from)).slice(0, 10).forEach(e => { R.fx('bolt', from.x, 1, from.z, { to: e }); R.hurtEnemy(e, dmg / Math.max(0.1, P.dmgMult || 1), { elem: null, stun: 0.5 }); }); }
    finally { inChain--; }
  };
  // ---------- 風刻印：普攻每一揮都放劍氣（不用打中，距離 +30%） ----------
  const at0 = R.attack;
  if (at0) R.attack = (...a) => {
    const P = W().P, c0 = P ? P.atkCd || 0 : 0, r = at0(...a);
    try { if (P && P.cls === 'enchanter' && W().run && (P._rune || 'flame') === 'wind' && (P.atkCd || 0) > c0 + 0.01 && R.elemWind) R.elemWind(P, null, ((P.ws && P.ws.dmg) || 10) * (P.dmgMult || 1), 0.45, true, 1.3); } catch (e) { }
    return r;
  };
})(window.R);
