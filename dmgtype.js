// 物理傷害、魔法傷害；物防、魔防（2026-10-04 作者：分一下魔傷和物傷以及魔防、物防）
// - 你打出去的：武器普攻照武器（法杖、法球、短杖……＝魔法；刀、槍、弓、拳＝物理）；技能照職業
//   （術士、牧師、吟遊詩人、召喚師、術陣師、附魔師、符卷師的技能＝魔法；其他＝物理）；火、冰、雷的屬性傷害＝魔法。
//   物理傷害會被敵人的護甲擋（原本的 e.def.armor）；魔法傷害依魔抗計算減傷。
//   魔抗：靈、影、焰、霧……這類遺跡生物 30%（物理打牠們也 −20%，物理傷害也會降低）；領主體 15%；佩特拉核心 20%。
// - 你受到的：遺跡生物照牠的樣子分物理、魔法（靈、影、焰、電……的是魔法），陷阱、落石是物理。
//   物防＝原本的防禦；魔防＝物防的一半＋輕甲的防禦（再算一次）＋中甲防禦的一半＋法系職業 3＋「魔防」詞條。防具的防禦值換算為魔防：輕甲 150%、中甲 100%、重甲 50%。
// - 新詞條：武器「物理傷害 +%」「魔法傷害 +%」；防具「物防 +」「魔防 +」。
// - 魔法傷害的數字是紫色的。角色總數值、裝備說明會分開寫物攻／魔攻、物防／魔防。
// 放在 combat.js、items.js、sets.js、charsheet.js 後面。
(function (R) {
  const W = () => R.W;
  const MAG_CLS = { mage: 1, priest: 1, bard: 1, summoner: 1, arraymage: 1, enchanter: 1, scroll: 1 };
  const GHOST = /靈|影|魂|霧|焰|火|燈|瞳|電|嵐|幻|煙|霜|雷|晶|咒|光/;
  // ---------- 新詞條 ----------
  R.W_AFFIX.push({ id: 'patk', name: '剛猛', roll: [5, 18], txt: v => '物理傷害 +' + v + '%' }, { id: 'matk', name: '奧秘', roll: [5, 18], txt: v => '魔法傷害 +' + v + '%' });
  R.A_AFFIX.push({ id: 'pdef', name: '厚實', roll: [2, 7], txt: v => '物防 +' + v }, { id: 'mdef', name: '護法', roll: [2, 7], txt: v => '魔防 +' + v });
  // ---------- 敵人：魔抗、會不會用魔法打你 ----------
  const cache = new Map();
  const info = def => {
    if (!def) return { mres: 0, pres: 0, mag: false };
    let r = cache.get(def); if (r) return r;
    const n = def.name || '', ghost = GHOST.test(n);
    r = { mres: def.mres != null ? def.mres : /佩特拉/.test(n) ? 0.2 : /^領主體/.test(n) || def.boss ? 0.15 : ghost ? 0.3 : 0, pres: ghost && !def.armor ? 0.2 : 0, mag: def.mag != null ? !!def.mag : ghost || /佩特拉/.test(n) };
    cache.set(def, r); return r;
  };
  R.enemyDmgInfo = info;
  // ---------- 玩家數值 ----------
  const WF = { light: 1, medium: 0.5, heavy: 0 };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const eq = R.equipped(cls), items = R.GEAR_KEYS.map(k => eq[k]), sum = id => R.affixSum(items, id);
      P.def = (P.def || 0) + sum('pdef');
      let light = 0; R.SLOTS.forEach(s => { const it = eq[s.id], a = it && R.ARMOR[it.base]; if (a) light += R.armorStats(it).def * (WF[a.w] || 0); });
      P.mdef = Math.round(((P.def || 0) * 0.5 + light + (MAG_CLS[cls] ? 3 : 0) + sum('mdef')) * 10) / 10;
      P.patk = 1 + sum('patk') / 100; P.matk = 1 + sum('matk') / 100;
    } catch (e) { P.mdef = P.mdef || 0; P.patk = P.patk || 1; P.matk = P.matk || 1; }
    return P;
  };
  // ---------- 打敵人 ----------
  const isMagHit = (P, o) => {
    if (o.mag != null) return !!o.mag;
    if (o.elem) return true;
    if (o.primary) return !!(P.ws && P.ws.kind === 'magic');
    return !!MAG_CLS[P.cls];
  };
  R.isMagHit = (o) => { const P = W().P; return !!(P && isMagHit(P, o || {})); };   // difficulty.js 的穿透用
  let magNow = false;
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P; o = o || {};
    if (!e || e.dead || !P || !raw) return he0(e, raw, o);
    const mag = isMagHit(P, o), inf = info(e.def), pen = P.pen || 0;
    let k = mag ? (P.matk || 1) : (P.patk || 1);
    if (mag) {
      const arm = e.def.armor ? Math.min(0.9, e.def.armor * (1 - pen)) : 0;
      if (arm) k /= 1 - arm;   // 魔法不看護甲（原本的算法會扣，先補回來）
      k *= 1 - inf.mres * (1 - pen);
    } else if (inf.pres) k *= 1 - inf.pres * (1 - pen);
    const was = magNow; magNow = mag;
    try { return he0(e, raw * k, o); } finally { magNow = was; }
  };
  const num0 = R.num;
  R.num = (x, y, z, txt, cls) => num0(x, y, z, txt, magNow && (!cls || cls === 'crit') && typeof txt === 'number' ? (cls ? cls + ' ' : '') + 'mag' : cls);
  // ---------- 被打 ----------
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const P = W().P; o = o || {};
    try {
      const mag = o.mag != null ? !!o.mag : !!(src && src.def && info(src.def).mag);
      if (mag && P && raw > 0) { const d = P.def || 0, m = P.mdef || 0; raw *= (1 - m / (m + 30)) / (1 - d / (d + 30)); }   // 原本的算法扣物防，換成魔防
    } catch (e) { }
    return hp0(raw, src, o);
  };
  // ---------- 說明 ----------
  const il0 = R.itemLines;
  R.itemLines = it => {
    const L = il0(it);
    try {
      if (it && it.kind === 'weapon' && R.WEAPONS[it.base]) L.splice(1, 0, '傷害類型：' + (R.WEAPONS[it.base].kind === 'magic' ? '魔法（依魔抗計算減傷）' : '物理（依護甲計算減傷）'));
      else if (it && it.kind === 'armor' && R.ARMOR[it.base]) { const a = R.ARMOR[it.base], f = WF[a.w] || 0; L.splice(1, 0, '魔防 +' + (Math.round(R.armorStats(it).def * (0.5 + f) * 10) / 10) + '（' + (f >= 1 ? '輕甲：防禦值的 150% 換算為魔防' : f ? '中甲：防禦值的 100% 換算為魔防' : '重甲：防禦值的 50% 換算為魔防') + '）'); }
    } catch (e) { }
    return L;
  };
  const cs0 = R.charSheetHtml;
  if (cs0) R.charSheetHtml = (cls, opt) => {   // 2026-10-05：opt（暫停選單的戰鬥中 live）要傳下去，不然顯示的是滿血的計算值
    let h = cs0(cls, opt);
    try {
      const P = (opt && opt.live && R.W && R.W.P && R.W.run ? R.W.P : R.calcPlayer(cls || R.S.cls)), n1 = v => (Math.round(v * 10) / 10).toString(), row = (k, v, note) => '<div class="cs-row"><span>' + k + '</span><b>' + v + '</b>' + (note ? '<small>' + note + '</small>' : '') + '</div>';
      const mag = P.ws && P.ws.kind === 'magic', pct = v => (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%';
      h = h.replace(row('防禦', n1(P.def || 0)), row('物防', n1(P.def || 0), '降低受到的物理傷害') + row('魔防', n1(P.mdef || 0), '降低受到的魔法傷害'));
      h = h.replace('<h4>攻擊</h4>', '<h4>攻擊</h4>' + row('普攻', mag ? '魔法' : '物理', mag ? '依魔抗計算減傷' : '依護甲計算減傷') + row('技能', R.CLASSES[P.cls] && MAG_CLS[P.cls] ? '魔法' : '物理') + row('物攻', pct(P.patk || 1)) + row('魔攻', pct(P.matk || 1)));
    } catch (e) { }
    return h;
  };
})(window.R);
