// 二次轉職：每個職業自己的二轉、諧鳴五派、主教的「復活」（2026-10-04 作者：二轉只有法師有特殊而已，其他職業應該也要有；
//   主教應該要有可以直接復活隊友的招式；諧鳴有其他加成，一個加成就可以是一個派系）
// - 每個職業除了「覺醒」，多一個自己的二轉（40 級，條件和 promote2.js 一樣）：三招（40、43、46 級學會）＋常駐加成。
// - 術士的諧鳴：《法術統整》第四項第一節的四種諧鳴加成各自成一派——鎮頻派（壓制）、共振派（增幅）、轉調派（轉換）、定頻派（必中），
//   加上原本的瑟蘭派（奏域）一共五派。每一派都有奏域，再加那一派的招式和常駐效果：
//   鎮頻派：身邊 4.5 公尺內敵人的投射物會被取消、敵人變慢；共振派：技能傷害 +30%、放技能退回三成魔力；
//   轉調派：普攻輪流帶火、冰、雷，打有護甲的敵人 +15%；定頻派：你的投射物全部會追蹤、飛得更遠。
// - 主教（牧師的一轉路線）多一招「復活」：倒下的隊友立刻站起來；自己一個人的時候，20 秒內倒下會原地站起來一次。
// - 新的技能「型」revive（skillbook.js 的 R.SKILL_TYPES）。
// 放在 promote2.js、skillbook.js、deathcause.js、guildtask.js、run.js 後面（R.onPlayerDown 要包在最外面）。
(function (R) {
  const W = () => R.W, S = () => R.S, LIB = R.SKILL_LIB || {}, T = R.SKILL_TYPES || {};
  // ---------- 技能的型：復活 ----------
  T.revive = (s, P, w, pw) => {
    let n = 0;
    (w.allies || []).forEach(a => { if (!a.downed || Math.hypot(a.x - P.x, a.z - P.z) > (s.range || 30)) return; a.downed = false; a.hp = a.hpMax * (s.pct || 0.5); if (s.shield) { a.shield = Math.max(a.shield || 0, a.hpMax * s.shield); a.shieldT = 6; } R.setDown && R.setDown(a.h, false); R.fx && R.fx('spawn', a.x, 0.1, a.z, { color: '#FFE8A0' }); R.toast && R.toast(a.name + '站起來了！', '#FFE8A0'); n++; });
    if (!n) { P.reviveCharge = Math.max(P.reviveCharge || 0, s.self || 20); R.toast && R.toast('身上罩著一層聖光：' + (s.self || 20) + ' 秒內倒下會站起來一次。', '#FFE8A0'); }
    if (s.heal && T.heal) T.heal({ _id: (s._id || 'rv') + ':h', pct: s.heal, allies: s.heal, shield: s.shield, allyShield: s.shield, color: '#FFE8A0' }, P, w, pw);
    R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 4, color: '#FFE8A0' });
  };
  const pd0 = R.onPlayerDown;
  R.onPlayerDown = (...a) => {
    const P = W().P;
    if (P && P.reviveCharge > 0) { P.reviveCharge = 0; P.hp = Math.round(P.hpMax * 0.5); P.iframe = 2; P.dead = false; R.fx && R.fx('spawn', P.x, 0.1, P.z, { color: '#FFE8A0' }); R.banner && R.banner('復活', '聖光把你拉了回來'); return; }
    return pd0(...a);
  };
  const st0 = R.step;
  R.step = dt => { st0(dt); const P = W().P; if (P && P.reviveCharge > 0 && W().run) P.reviveCharge -= dt; };
  // 主教：復活（一轉路線的技能，等級照 promote.js 往後挪：11＋7＝18 級）
  const add = (id, o) => { LIB[id] = Object.assign({ id }, o); R.SKILLS[id] = { name: o.name, cd: o.cd, mp: o.mp, desc: o.desc }; };
  add('bi_revive', { name: '復活', cls: 'priest', lv: 11, cd: 45, mp: 35, type: 'revive', p: { pct: 0.5, range: 30, heal: 0.15, shield: 0.15, self: 20 }, desc: '倒下的隊友立刻站起來（50% 生命、一層護盾），大家再回一點血。自己一個人的時候：20 秒內倒下會原地站起來一次。', adv: 'bishop' });
  // ---------- 每個職業自己的二轉 ----------
  // [名字, 常駐加成, 加成說明, 三招：[名字, 型, 參數, 冷卻, 魔力, 說明]]
  const SP = {
    gunner: ['槍聖', { crit: 0.08, rate: 0.1 }, '暴擊率 +8%、攻速 +10%', [
      ['千發彈雨', 'shots', { n: 20, spread: 1.6, k: 0.7, sp: 26, life: 0.8 }, 16, 30, '把彈匣裡的子彈一口氣潑出去：扇形二十發。'],
      ['處刑射擊', 'line', { len: 16, width: 0.8, k: 4.5, color: '#FFD27A' }, 14, 26, '瞄很久的一槍：一直線穿過去，威力極大。'],
      ['彈藥無限', 'buff', { t: 8, dmg: 1.2, speed: 1.1, color: '#FFD27A' }, 30, 24, '8 秒內傷害 +20%、移動 +10%。']]],
    archer: ['天弓', { crit: 0.06, dmg: 0.06 }, '暴擊率 +6%、傷害 +6%', [
      ['流星箭雨', 'storm', { t: 5, gap: 0.3, r: 9, hitR: 1.8, k: 1.1, fx: 'spark', color: '#BFE8FF' }, 18, 30, '箭像流星一樣落在附近的敵人身上，5 秒。'],
      ['貫日', 'line', { len: 20, width: 1, k: 4, color: '#FFE8A0' }, 14, 24, '拉滿的一箭，穿過一整排敵人。'],
      ['鷹眼', 'buff', { t: 10, crit: 0.25, dmg: 1.1, color: '#BFE8FF' }, 30, 20, '10 秒內暴擊率 +25%、傷害 +10%。']]],
    warrior: ['戰神', { hp: 0.12, dmg: 0.06 }, '生命 +12%、傷害 +6%', [
      ['天崩', 'nova', { r: 5.5, k: 3.5, stun: 1.2, kb: 4, color: '#FF8A4A' }, 18, 30, '往地上全力一砸：周圍的敵人重傷、暈眩、被震開。'],
      ['不滅', 'combo', { parts: [['guard', { t: 4, cleanse: 1, color: '#FFD27A' }], ['heal', { pct: 0.25, color: '#FFD27A' }, 50], ['buff', { t: 10, dmg: 1.2, def: 0.25, color: '#FFD27A' }, 100]] }, 30, 20, '4 秒內不受傷（清掉緩速、看不見），回復 25% 生命；接下來 10 秒傷害 +20%、受到的傷害 −25%。'],   // 2026-10-04 作者：不滅要增強（原本 2.5 秒不受傷、冷卻 40 秒）
      ['戰神降臨', 'buff', { t: 10, dmg: 1.35, speed: 1.15, color: '#FF5A3A' }, 45, 30, '10 秒內傷害 +35%、移動 +15%。']]],
    priest: ['聖者', { hp: 0.1, regen: 1.5 }, '生命 +10%、每秒回復 1.5 生命', [
      ['群體復活', 'revive', { pct: 0.8, range: 40, heal: 0.4, shield: 0.25, self: 30 }, 60, 45, '所有倒下的隊友立刻站起來（80% 生命、一層護盾），大家回 40% 生命。自己一個人：30 秒內倒下會站起來一次。'],
      ['神蹟', 'heal', { pct: 0.5, allies: 0.5, shield: 0.3, allyShield: 0.3, color: '#FFE8A0' }, 30, 35, '你和隊友回 50% 生命，再多一層厚護盾。'],
      ['天罰', 'at', { range: 12, r: 4, k: 3.2, stun: 1, delay: 300, fx: 'boom', color: '#FFE8A0' }, 16, 28, '準心處落下一道天光：重傷、暈眩。']]],
    blade: ['劍聖', { crit: 0.06, critMult: 0.25 }, '暴擊率 +6%、暴擊傷害 +25%', [
      ['一閃・極', 'dash', { len: 9, dur: 0.18, k: 4 }, 12, 20, '一步踏出九公尺，路上的敵人全部被斬。'],
      ['萬刃', 'xslash', { n: 4, spread: 0.8, len: 6, width: 0.8, k: 2.2, color: '#DDEEFF' }, 16, 26, '四道交錯的斬擊。'],
      ['明鏡止水', 'buff', { t: 8, crit: 0.4, dmg: 1.2, color: '#DDEEFF' }, 35, 20, '心靜下來：8 秒內暴擊率 +40%、傷害 +20%。']]],
    knight: ['騎士團長', { def: 8, hp: 0.12 }, '物防 +8、生命 +12%', [
      ['號令', 'buff', { t: 12, dmg: 1.2, def: 0.2, color: '#FFD27A' }, 35, 24, '12 秒內傷害 +20%、受到的傷害 −20%。'],
      ['鋼鐵壁壘', 'guard', { t: 3, color: '#C8D0D8' }, 40, 20, '3 秒內不受傷。'],
      ['衝鋒・極', 'dash', { len: 10, dur: 0.2, k: 3.2 }, 12, 20, '舉盾往前衝十公尺，撞翻一路的敵人。']]],
    monk: ['武神', { rate: 0.12, hp: 0.08 }, '攻速 +12%、生命 +8%', [
      ['百裂拳', 'dance', { n: 10, range: 6, k: 0.9, crit: 0.3, gap: 70 }, 16, 26, '一口氣打出十拳，在敵人之間穿梭。'],
      ['震天腳', 'jumpx', { range: 9, dur: 0.5, end: { r: 4.5, k: 3, stun: 1, color: '#FFD27A' } }, 16, 26, '跳起來往準心處一腳踩下：大範圍重傷、暈眩。'],
      ['金剛不壞', 'guard', { t: 3, color: '#FFD27A' }, 40, 20, '3 秒內不受傷。']]],
    bard: ['樂聖', { skillCd: 0.1, mp: 0.15 }, '技能冷卻 −10%、魔力 +15%', [
      ['交響', 'aura', { t: 8, r: 4.5, gap: 0.25, k: 0.8, color: '#FFB8E0' }, 20, 28, '8 秒內身邊一直響著交響，附近的敵人一直受傷。'],
      ['安魂曲', 'revive', { pct: 0.5, range: 30, heal: 0.25, self: 15 }, 55, 40, '倒下的隊友站起來，大家回 25% 的生命。自己一個人：15 秒內倒下會站起來一次。'],
      ['狂想曲', 'buff', { t: 10, dmg: 1.25, speed: 1.2, crit: 0.1, color: '#FFB8E0' }, 35, 26, '10 秒內傷害 +25%、移動 +20%、暴擊率 +10%。']]],
    summoner: ['萬靈主', { dmg: 0.1, mp: 0.1 }, '傷害 +10%、魔力 +10%', [
      ['群靈', 'pet', { beast: 'okuriinu', n: 6, t: 16, k: 0.9, color: '#C8A878' }, 30, 40, '六隻土狼一起放出去，16 秒。'],
      ['靈獸王', 'pet', { beast: 'okuriinu', t: 20, k: 3.2, color: '#FFD27A' }, 35, 40, '捏出一隻特別強的頭狼，20 秒。'],
      ['契約強化', 'buff', { t: 12, dmg: 1.3, color: '#C8A878' }, 35, 24, '12 秒內傷害 +30%。']]],
    arraymage: ['陣聖', { matk: 0.12, skillCd: 0.08 }, '魔法傷害 +12%、技能冷卻 −8%', [
      ['天陣', 'at', { range: 12, r: 6, k: 3, delay: 900, fx: 'boom', color: '#7AC8E8' }, 20, 34, '準心處畫一個巨大的閉環，0.9 秒後爆開。'],
      ['封絕陣', 'mark', { range: 11, r: 5, t: 6, slow: 4, stun: 1.5, k: 0.5 }, 18, 26, '準心附近的敵人被封住：暈眩、變慢，6 秒內受到的傷害 +30%。'],
      ['萬象陣', 'storm', { t: 6, gap: 0.35, r: 9, hitR: 1.8, k: 1.2, fx: 'spark', color: '#7AC8E8' }, 24, 34, '陣光一下一下打在附近的敵人身上，6 秒。']]],
    enchanter: ['附魔宗師', { dmg: 0.08, pen: 0.1 }, '傷害 +8%、無視護甲 +10%', [
      ['萬物附魔', 'buff', { t: 12, dmg: 1.25, crit: 0.1, color: '#9AE8FF' }, 35, 24, '12 秒內傷害 +25%、暴擊率 +10%。'],
      ['符文爆裂', 'nova', { r: 5, k: 3, burn: 1, color: '#FF8A4A' }, 16, 28, '身上的符文一起爆開：周圍的敵人重傷、燃燒。'],
      ['魔劍解放', 'arc', { range: 5, arc: 2.8, k: 4, kb: 3 }, 14, 26, '一大片的魔力斬擊。']]],
    scroll: ['符聖', { matk: 0.1, skillCd: 0.1 }, '魔法傷害 +10%、技能冷卻 −10%', [
      ['千符', 'shots', { n: 16, spread: 6.28, k: 1, homing: 6, kind: 'holy', sp: 16, life: 2.4 }, 18, 30, '十六張符一起飛出去，追著敵人。'],
      ['封天卷', 'mark', { range: 12, r: 5, t: 7, slow: 4, stun: 1, k: 0.6 }, 18, 26, '攤開一卷封印：準心附近的敵人暈眩、變慢，7 秒內受到的傷害 +30%。'],
      ['一筆成陣', 'combo', { parts: [['at', { range: 11, r: 3, k: 1.6, delay: 150, fx: 'boom', color: '#C8A85A' }], ['at', { range: 11, r: 3.5, k: 1.6, delay: 100, fx: 'boom', color: '#C8A85A' }, 300], ['at', { range: 11, r: 4, k: 2.2, stun: 0.8, delay: 100, fx: 'boom', color: '#FFD27A' }, 600]] }, 20, 32, '一筆寫完三張符：準心處連爆三次，越來越大。']]]
  };
  Object.keys(SP).forEach(cls => SP[cls][3].forEach(([name, type, p, cd, mp, desc], i) => add('sp2_' + cls + '_' + i, { name, cls, lv: 40 + i * 3, cd, mp, type, p, desc: '（二轉・' + SP[cls][0] + '）' + desc, adv2: 'sp' })));
  // ---------- 諧鳴：四種加成各成一派 ----------
  const copy = (src, id, name, lv, adv2, desc, over) => { const s = LIB[src]; if (!s) return; add(id, { name: name || s.name, cls: 'mage', lv, cd: s.cd, mp: s.mp, type: s.type, p: Object.assign(JSON.parse(JSON.stringify(s.p)), over || {}), desc: desc || s.desc, adv2 }); };
  const HF = [
    ['hm_zhen', '鎮頻派', '壓制：改寫奏域裡對手法術的「m」頻。常駐：身邊 4.5 公尺內敵人的投射物會被取消、敵人變慢。', 'hm_suppress', [['頻率崩解', 'nova', { r: 4.5, k: 1.6, stun: 1.5, color: '#9AD8FF' }, 18, 26, '奏域裡的頻率全部打亂：周圍的敵人暈眩。'], ['靜默領域', 'zone', { zone: 'trap', self: 1, r: 5, life: 8, k: 0.5 }, 24, 28, '腳下 8 秒的靜默領域，踩進來的敵人一直受傷。']]],
    ['hm_gong', '共振派', '增幅：改寫自己法術的「k」「f」頻，施法前花得少、施法後放得大。常駐：技能傷害 +30%、放技能退回 30% 魔力。', 'hm_amp', [['共振爆發', 'at', { range: 11, r: 4, k: 3.4, delay: 250, fx: 'boom', color: '#FFB8E0' }, 16, 30, '把小小的魔力在準心處放成巨量：大爆炸。'], ['增幅連鎖', 'chainx', { n: 7, jump: 6, k: 1.5, falloff: 0.9, range: 12 }, 14, 24, '共振沿著敵人一路傳下去，七次。']]],
    ['hm_zhuan', '轉調派', '轉換：改寫法術的「a」「o」頻，換掉元素。常駐：普攻輪流帶火、冰、雷，打有護甲的敵人 +15%。', 'hm_shift', [['光學射線', 'beam', { t: 1.6, tick: 0.12, len: 11, width: 0.8, k: 0.5, slow: 2 }, 16, 28, '把火焰轉成激光：一道會燒穿一排敵人的射線。'], ['元素轉換', 'buff', { t: 10, dmg: 1.25, color: '#FF9A6A' }, 30, 22, '10 秒內傷害 +25%。']]],
    ['hm_ding', '定頻派', '必中：改寫法術的「r」「e」「l」「y」頻，無視方向、距離。常駐：你的投射物全部會追蹤、飛得更遠。', 'hm_lock', [['千道定頻', 'shots', { n: 14, spread: 6.28, k: 1.1, homing: 10, kind: 'holy', sp: 18, life: 3 }, 16, 28, '十四道音波，必定追著目標。'], ['鎖定', 'mark', { range: 14, r: 3, t: 8, slow: 3, k: 0.4 }, 14, 18, '鎖定準心附近的敵人：8 秒內變慢、受到的傷害 +30%。']]]
  ];
  HF.forEach(([id, name, desc, main, extra]) => {
    copy('hm_field', id + '_field', null, 40, id, '（二轉・諧鳴・' + name + '）' + (LIB.hm_field ? LIB.hm_field.desc.replace(/^（[^）]*）/, '') : ''));
    copy(main, id + '_main', null, 41, id, '（二轉・諧鳴・' + name + '）' + (LIB[main] ? LIB[main].desc.replace(/^（[^）]*）/, '') : ''));
    extra.forEach(([n, type, p, cd, mp, d], i) => add(id + '_' + i, { name: n, cls: 'mage', lv: 43 + i * 3, cd, mp, type, p, desc: '（二轉・諧鳴・' + name + '）' + d, adv2: id }));
  });
  // ---------- 選項 ----------
  const op0 = R.ADV2_OPTS;
  R.ADV2_OPTS = cls => {
    const out = op0(cls).map(o => (o.id === 'harmonic' ? Object.assign({}, o, { name: '諧鳴・瑟蘭派' }) : o));
    if (SP[cls]) out.push({ id: 'sp', name: SP[cls][0], desc: SP[cls][0] + '：' + SP[cls][2] + '。學會' + SP[cls][3].map(s => '「' + s[0] + '」').join('') + '（40、43、46 級）。' });
    if (cls === 'mage') HF.forEach(([id, name, desc]) => out.push({ id, name: '諧鳴・' + name, desc: desc + '學會奏域和這一派的招式（40～46 級）。' }));
    return out;
  };
  // ---------- 常駐效果 ----------
  const NUM = { crit: (P, v) => { if (P.ws) P.ws.crit = (P.ws.crit || 0) + v; }, rate: (P, v) => { if (P.ws) P.ws.rate *= 1 + v; }, dmg: (P, v) => { P.dmgMult *= 1 + v; }, hp: (P, v) => { P.hpMax = Math.round(P.hpMax * (1 + v)); }, mp: (P, v) => { P.mpMax = Math.round(P.mpMax * (1 + v)); },
    regen: (P, v) => { P.regen = (P.regen || 0) + v; }, critMult: (P, v) => { P.critMult += v; }, def: (P, v) => { P.def = (P.def || 0) + v; }, skillCd: (P, v) => { P.skillCdMult *= 1 - v; }, matk: (P, v) => { P.matk = (P.matk || 1) + v; }, pen: (P, v) => { P.pen = Math.min(0.8, (P.pen || 0) + v); } };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try { const st = S().classes[cls]; if (st && st.adv2 === 'sp' && SP[cls]) { const b = SP[cls][1]; Object.keys(b).forEach(k => NUM[k] && NUM[k](P, b[k])); } if (st && /^hm_/.test(st.adv2 || '')) { P.matk = (P.matk || 1) + 0.1; P.mpMax = Math.round(P.mpMax * 1.15); } } catch (e) { }
    return P;
  };
  const hf = () => { const P = W().P; return P && W().run ? P.adv2 : null; };
  // 共振派：技能傷害 +30%；轉調派：普攻輪流帶元素、打護甲 +15%
  let el = 0;
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const a = hf(); o = o || {};
    if (a === 'hm_gong' && !o.primary) raw *= 1.3;
    if (a === 'hm_zhuan') { if (o.primary && !o.elem) o = Object.assign({}, o, { elem: ['fire', 'frost', 'shock'][el++ % 3] }); if (e && e.def && e.def.armor) raw *= 1.15; }
    return he0(e, raw, o);
  };
  // 共振派：放技能退回三成魔力
  const refund = fn => (...a) => { const P = W().P, m0 = P ? P.mp : 0, r = fn(...a); if (P && hf() === 'hm_gong' && P.mp < m0) P.mp = Math.min(P.mpMax, P.mp + (m0 - P.mp) * 0.3); return r; };
  R.useSkill = refund(R.useSkill); const cs0 = R.castSlot; if (cs0) R.castSlot = i => (i === 0 ? cs0(i) : refund(cs0)(i));
  // 定頻派：投射物全部追蹤、飛得更遠
  const fi0 = R.fire;
  R.fire = o => { if (o && o.owner === 'p' && hf() === 'hm_ding') o = Object.assign({}, o, { homing: Math.max(o.homing || 0, 4), life: (o.life || 1) * 1.3 }); return fi0(o); };
  // 鎮頻派：身邊敵人的投射物取消、敵人變慢
  let zt = 0;
  const st1 = R.step;
  R.step = dt => {
    st1(dt); if (hf() !== 'hm_zhen') return; zt -= dt; if (zt > 0) return; zt = 0.2;
    const w = W(), P = w.P; (w.shots || []).forEach(s => { if (s.owner !== 'p' && !s.dead && Math.hypot(s.x - P.x, s.z - P.z) < 4.5) { R.fx && R.fx('ring', s.x, 0.6, s.z, { r: 0.6, color: '#9AD8FF' }); R.killShot(s); } });
    (w.enemies || []).forEach(e => { if (!e.dead && e.st && Math.hypot(e.x - P.x, e.z - P.z) < 4.5) e.st.slow = Math.max(e.st.slow || 0, 0.4); });
  };
  R.adv2moreDebug = { SP, HF };
})(window.R);
