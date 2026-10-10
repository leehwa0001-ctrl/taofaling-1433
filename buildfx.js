// 改變玩法的裝備（作者 2026-10-05：都做——傳說武器、套裝從「加數值」改成「加機制」）
// 一、新的傳說武器 26 把（每個職業兩把，接在那個職業的核心玩法上；classcore.js、classcore2.js 用 R.legOf(P) 判斷）：
//   傳說（稀有度 4）以上的武器，同一種武器有傳說的話隨機挑一把（items.js 原本的規則）。說明寫在 R.LEGENDS 的 desc。
// 二、套裝四件的機制（原本的數值照舊，多一個效果）：
//   霜狼：翻滾的時候身邊 3 公尺的敵人減速 2 秒、受到武器一下的傷害。
//   熔岩：暴擊時 20% 在目標腳下爆炸（2 公尺、0.8 倍）。
//   守墓人：生命掉到三成以下的那一下，得到 25% 生命的護盾（60 秒一次）。
//   影行者：翻滾後隱身 1 秒，下一擊必定暴擊。
//   祈禱者：放技能 15% 機率退回魔力。
//   遺跡探索者：打開寶箱回 10% 生命、佩特拉的注意 −5。
// 放在 classcore2.js、sets.js 後面。
(function (R) {
  const W = () => R.W, rnd = Math.random, dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const CT = () => (R.coreTime ? R.coreTime() : performance.now() / 1000);
  const live = () => { const w = W(); return !!(w.run && !w.run.done && w.P && !w.P.dead); };
  R.legOf = P => (P && P.ws && P.ws.legend) || null;

  // ---------- 傳說武器 ----------
  const NEW = [
    ['lg_wrath', '不熄的怒火', 'warhammer', '怒吼只用掉一半的怒氣；怒吼後 6 秒，普攻會讓敵人燃燒。'],
    ['lg_chain', '斷鎖', 'axe', '怒氣滿的時候，每一下普攻都震出一圈（0.6 倍）。'],
    ['lg_tri', '三相之杖', 'staff', '元素反應的威力 +50%；反應之後自動換到下一個元素。'],
    ['lg_thunder', '雷鳴法球', 'orb', '雷元素的攻擊會再電到旁邊的一隻（0.5 倍）。'],
    ['lg_receiver', '完美機匣', 'rifle', '完美換彈的金色那一格大一倍；完美換彈的那一匣子彈多穿一隻。'],
    ['lg_dragon', '龍息霰彈', 'shotgun', '燃燒彈一定會燒；打倒燃燒中的敵人會炸開。'],
    ['lg_hawkking', '鷹王之弦', 'longbow', '鷹眼最多 8 層；被打只掉一半。'],
    ['lg_beads', '連珠', 'repeater', '完美射擊之後 3 秒，普攻都會暴擊。'],
    ['lg_sheathless', '無鞘', 'nodachi', '刀意累積快一倍。'],
    ['lg_seam', '影縫', 'dualblades', '見切之後 3 秒，每一刀都帶一半的居合加成。'],
    ['lg_vow', '不落之誓', 'halberd', '完美格擋的時間從 0.3 秒變成 0.5 秒。'],
    ['lg_judge', '審判長槍', 'spear', '反制（完美格擋後的盾擊）範圍變大、暈 3 秒。'],
    ['lg_thousand', '千手', 'claws', '連段上限 +100；終結技之後連段只少一半。'],
    ['lg_immovable', '不動明王棍', 'staffpole', '被打要掉超過 10% 生命連段才會斷。'],
    ['lg_mercy', '慈悲香爐', 'censer', '補過頭變成的光一次打三隻。'],
    ['lg_saint', '聖徒權杖', 'holystaff', '神蹟只要 70 信仰。'],
    ['lg_allsong', '萬曲之琴', 'harp', '樂譜每一個音符的效果 +50%。'],
    ['lg_echo', '迴響長笛', 'flute', '樂譜演奏完以後，接下來兩擊都吃到樂譜的效果。'],
    ['lg_pack', '群獸圖騰', 'totem', '每次召喚多一隻召喚物。'],
    ['lg_bell', '執念之鈴', 'bell', '獻祭不用掉執念（改成 10 秒冷卻）。'],
    ['lg_compass', '閉環羅盤', 'compass', '兩個點彼此 8 公尺內就能閉環。'],
    ['lg_chaindisc', '連鎖陣盤', 'disc', '閉環之後在中心留下一個點，可以接著連下一個閉環。'],
    ['lg_trirune', '三刻之刃', 'runeblade', '刻印釋放的威力 ×1.8。'],
    ['lg_quickrune', '速刻短刀', 'runedagger', '刻印的力量攢兩倍快。'],
    ['lg_endless', '無盡卷軸', 'scrollb', '展卷只要 1 張卷軸、15 秒一次。'],
    ['lg_brush', '連筆', 'brush', '連鎖之後的下一次連鎖，兩種不同的技能就夠。']
  ];
  if (R.LEGENDS) NEW.forEach(([id, name, base, desc]) => { if (R.WEAPONS[base] && !R.LEGENDS.find(l => l.id === id)) R.LEGENDS.push({ id, name, base, fx: id, desc }); });

  // 用包裝接的那幾把（其他的寫在 classcore.js、classcore2.js 裡）
  const C = R.CORE || {};
  const wrapM = (cls, k, f) => { const o = C[cls]; if (!o) return; const f0 = o[k]; o[k] = function (...a) { return f.call(this, f0, ...a); }; };
  // 不熄的怒火
  wrapM('warrior', 'act', function (f0, P, ...a) { const r0 = P._rage || 0, out = f0 && f0.call(this, P, ...a); if (R.legOf(P) === 'lg_wrath' && r0 >= 50 && (P._rage || 0) === 0) { this.add(P, r0 / 2); P._wrathT = CT() + 6; } return out; });
  wrapM('warrior', 'mod', function (f0, e, raw, o, P) {
    const r = f0 ? f0.call(this, e, raw, o, P) : raw;
    if (o.primary && R.legOf(P) === 'lg_wrath' && (P._wrathT || 0) > CT()) e.st.burn = 3;
    if (o.primary && !(o.reflect || o.thorns || o.noVamp) && R.legOf(P) === 'lg_chain' && (P._rage || 0) >= 100 && CT() - (P._chainT || 0) > 0.3) { P._chainT = CT(); R.fx && R.fx('ring', e.x, 0.1, e.z, { r: 2, color: '#E8503A' }); R.coreAoe(e.x, e.z, 2, raw * 0.6, {}); }
    return r;
  });
  // 雷鳴法球
  wrapM('mage', 'onHit', function (f0, e, d, o, P, killed) { const r = f0 && f0.call(this, e, d, o, P, killed); if (R.legOf(P) === 'lg_thunder' && (P._el || 'fire') === 'shock' && d > 0) { const n = (W().enemies || []).find(x => !x.dead && x !== e && dist(x, e) < 5); if (n) { R.fx && R.fx('bolt', e.x, 1, e.z, { to: n }); R.coreHit(n, d * 0.5, {}); } } return r; });
  // 完美機匣：完美的那一匣多穿一隻
  wrapM('gunner', 'step', function (f0, dt, P) { const r = f0 && f0.call(this, dt, P); if (P.ws) { if (P._pierceBase == null || P._pierceWs !== P.ws) { P._pierceWs = P.ws; P._pierceBase = P.ws.pierce || 0; } P.ws.pierce = P._pierceBase + (R.legOf(P) === 'lg_receiver' && P._perfect ? 1 : 0); } return r; });
  // 龍息霰彈
  wrapM('gunner', 'mod', function (f0, e, raw, o, P) { const r = f0 ? f0.call(this, e, raw, o, P) : raw; if (o.primary && R.legOf(P) === 'lg_dragon' && P._ammoT === 'fire') e.st.burn = 3; return r; });
  wrapM('gunner', 'onHit', function (f0, e, d, o, P, killed) { const r = f0 && f0.call(this, e, d, o, P, killed); if (killed && R.legOf(P) === 'lg_dragon' && e.st && e.st.burn > 0) { R.fx && R.fx('boom', e.x, 0.3, e.z, { r: 2.5, color: '#FF6A2A' }); R.coreAoe(e.x, e.z, 2.5, (R.coreKit ? R.coreKit.pw(P) : 20) * 0.8, {}); } return r; });
  // 連珠
  wrapM('archer', 'shoot', function (f0, P, perfect) { const r = f0 && f0.call(this, P, perfect); if (perfect && R.legOf(P) === 'lg_beads') P._beadsT = CT() + 3; return r; });
  wrapM('archer', 'mod', function (f0, e, raw, o, P) { const r = f0 ? f0.call(this, e, raw, o, P) : raw; if (o.primary && (P._beadsT || 0) > CT()) { o.crit = true; } return r; });
  // 無鞘、影縫
  wrapM('blade', 'step', function (f0, dt, P) { const v0 = P._iai || 0, r = f0 && f0.call(this, dt, P); if (R.legOf(P) === 'lg_sheathless' && (P._iai || 0) > v0) P._iai = Math.min(this.max(P), P._iai + (P._iai - v0)); return r; });
  wrapM('blade', 'mikiri', function (f0, P, src) { const r = f0 && f0.call(this, P, src); if (R.legOf(P) === 'lg_seam') P._seamT = CT() + 3; return r; });
  wrapM('blade', 'mod', function (f0, e, raw, o, P) { let r = f0 ? f0.call(this, e, raw, o, P) : raw; if ((P._seamT || 0) > CT() && P._iaiUse == null) { if (typeof r === 'number') r *= 1.75; else if (r && typeof r === 'object') r.raw *= 1.75; } return r; });
  // 群獸圖騰：多一隻
  if (R.SKILL_TYPES && R.SKILL_TYPES.pet) { const pt0 = R.SKILL_TYPES.pet; R.SKILL_TYPES.pet = (s, P, w, pw) => pt0(P && R.legOf(P) === 'lg_pack' ? Object.assign({}, s, { n: (s.n || 1) + 1 }) : s, P, w, pw); }

  // ---------- 套裝四件的機制 ----------
  const MECH = { frostwolf: '翻滾的時候身邊 3 公尺的敵人減速 2 秒、受到武器一下的傷害', lava: '暴擊時 20% 在目標腳下爆炸（2 公尺、0.8 倍）', warden: '生命掉到三成以下的那一下，得到 25% 生命的護盾（60 秒一次）', shade: '翻滾後隱身 1 秒，下一擊必定暴擊', prayer: '放技能 15% 機率退回魔力', seeker: '打開寶箱回 10% 生命、佩特拉的注意 −5' };
  if (R.SETS) Object.keys(MECH).forEach(id => { const s = R.SETS[id]; if (s && s.t4 && s.t4.indexOf(MECH[id]) < 0) s.t4 += '；' + MECH[id]; });
  const setsOf = cls => { const out = {}; try { const eq = R.equipped(cls); (R.GEAR_KEYS || []).forEach(k => { const it = eq[k]; if (it && it.set && R.SETS && R.SETS[it.set]) out[it.set] = (out[it.set] || 0) + 1; }); } catch (e) { } return out; };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => { const P = cp0(cls), n = setsOf(cls); P.setMech = {}; Object.keys(n).forEach(id => { if (n[id] >= 4) P.setMech[id] = 1; }); return P; };
  const has = (P, id) => !!(P && P.setMech && P.setMech[id]);
  // 翻滾的那一下（霜狼、影行者）
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt);
    try {
      const P = W().P; if (P && live()) {
        const roll = !!(P.h && P.h.roll > 0);
        if (roll && !P._sfRoll) {
          if (has(P, 'frostwolf')) { R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 3, color: '#BFE8FF' }); (W().enemies || []).forEach(e => { if (!e.dead && dist(e, P) < 3) { e.st.slow = Math.max(e.st.slow || 0, 2); R.coreHit ? R.coreHit(e, (P.ws && P.ws.dmg) || 10, {}) : R.hurtEnemy(e, (P.ws && P.ws.dmg) || 10, {}); } }); }
          if (has(P, 'shade')) { P.invis = Math.max(P.invis || 0, 1); P._shadeCrit = true; }
        }
        P._sfRoll = roll;
      }
    } catch (e) { console.warn('[buildfx]', e); }
    return r;
  };
  // 熔岩、影行者（打人）
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P; if (!P || !e || e.dead || !live()) return he0(e, raw, o);
    if (P._shadeCrit && o && (o.primary || o.crit !== undefined)) { o = Object.assign({}, o, { crit: true }); P._shadeCrit = false; }
    const r = he0(e, raw, o);
    if (has(P, 'lava') && !(o && (o.reflect || o.thorns || o.noVamp)) && R.lastCrit && rnd() < 0.2 && CT() - (P._lavaT || 0) > 0.25) { P._lavaT = CT(); R.fx && R.fx('boom', e.x, 0.3, e.z, { r: 2, color: '#FF7A3A' }); (R.coreAoe || R.aoe)(e.x, e.z, 2, raw * 0.8, {}); }
    return r;
  };
  // 守墓人
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const P = W().P, h0 = P ? P.hp : 0, r = hp0(raw, src, o);
    try { if (P && has(P, 'warden') && h0 >= P.hpMax * 0.3 && P.hp < P.hpMax * 0.3 && P.hp > 0 && CT() - (P._wardT || -99) > 60) { P._wardT = CT(); P.shield = Math.max(P.shield || 0, P.hpMax * 0.25); P.buff.shieldT = Math.max(P.buff.shieldT || 0, 8); R.num && R.num(P.x, 2.6, P.z, '守墓人', 'heal'); } } catch (e) { }
    return r;
  };
  // 祈禱者（放技能：冷卻變長＝放出去了）
  const cd = (P, i) => (i === 0 ? P.skillCd || 0 : (P.skCd && P.skCd[i]) || 0);
  const wrapCast = (f, slotOf) => (...a) => { const P = W().P; if (!P || !has(P, 'prayer')) return f(...a); const i = slotOf(a), c0 = cd(P, i), m0 = P.mp, r = f(...a); if (cd(P, i) > c0 + 0.01 && rnd() < 0.15 && P.mp < m0) { P.mp = Math.min(P.mpMax, m0); R.num && R.num(P.x, 2.6, P.z, '祈禱', 'heal'); } return r; };
  if (R.castSlot) R.castSlot = wrapCast(R.castSlot, a => a[0] || 0);
  if (R.useSkill) R.useSkill = wrapCast(R.useSkill, () => 0);
  // 遺跡探索者
  const uc0 = R.useChest;
  if (uc0) R.useChest = c => { const P = W().P, was = c && c.state, r = uc0(c); try { if (P && has(P, 'seeker') && was === 'closed' && c.state !== 'closed') { R.healP(P.hpMax * 0.1); const run = W().run; if (run) run.aware = Math.max(0, (run.aware || 0) - 5); } } catch (e) { } return r; };
})(window.R);
