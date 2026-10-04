// 種族加成重新平衡（2026-10-04 作者：種族之間的加成差異不大，要更有變化——巨人族血量 +30%、多首人族攻擊範圍多一點這種，
// 各自要有非常大的差異；對比龍人族（目前最好用），其他種族也增強一點）
// 1. 每個族種一個「招牌」：很大的一項或兩項（巨人＝生命、攻擊距離；繁肢＝攻速、攻擊範圍；岩礦＝防禦；光影＝閃避、背刺……），
//    幾個子族另外有自己的招牌（雙頭人族、多臂人族、獨臂人族、九尾狐族……）。
// 2. 新的加成：攻擊距離（range）、攻擊範圍（arc）、攻速（rate）、多穿透（pierce）、回魔（mpRegen）、擊退（kb）。
// 3. 強度照稀有度拉齊：用一個「強度分數」算每一族（龍人族原本大約 66 分），目標 N 50、R 58、SR 66、SSR 74、UR 86（混血六成）。
//    招牌照設計的數值；其他加成照比例縮放（0.3～1.6 倍）；還不夠的用生命、傷害補——每一族的特色是招牌那一項，強度差不多。
// 放在 races.js、races2.js、luck.js 後面。
(function (R) {
  const add = (b, x) => { Object.keys(x || {}).forEach(k => { if (k === 'immune') b.immune = Object.assign({}, b.immune || {}, x.immune); else b[k] = Math.round(((b[k] || 0) + x[k]) * 1000) / 1000; }); return b; };
  const FAM = {
    大陸族種: { xp: 0.15, skillCd: 0.05 }, 精靈族種: { mp: 0.2, skillCd: 0.1, range: 0.15 }, 矮人族種: { def: 4, hp: 0.12, ore: 0.3 },
    鰭人族種: { regen: 0.6, immune: { slow: 1 } }, 翼人族種: { dodge: 0.2, speed: 0.08 }, 地精族種: { luck: 3, dodge: 0.15 },
    妖精族種: { mp: 0.25, skillCd: 0.12, mpRegen: 1 }, 獸妖族種: { magic: 0.15, calm: 0.15 }, 妖人族種: { mp: 0.25, calm: 0.2, mpRegen: 1 },
    蟲型族種: { rate: 0.15, dodge: 0.1 }, 節肢人族種: { crit: 0.08, critMult: 0.3, rate: 0.1, pen: 0.12 }, 節鱗族種: { def: 4, hp: 0.12 },
    巨人族種: { hp: 0.3, range: 0.25, kb: 1.5 }, 繁肢族種: { rate: 0.2, arc: 0.3, range: 0.15 }, 兩棲族種: { regen: 0.5, immune: { slow: 1 } },
    岩礦族種: { def: 6 }, 晶體族種: { mp: 0.25, crystal: 0.4, mpRegen: 0.8 }, 血族種: { vamp: 0.03 }, 植根族種: { hp: 0.2, regen: 0.8 },
    流體族種: { dodge: 0.25 }, 氣流族種: { speed: 0.15, dodge: 0.15 }, 聚合族種: { dmg: 0.1, mp: 0.2 }, 真菌族種: { regen: 0.8, hp: 0.1 },
    擬態族種: { calm: 0.3, mp: 0.15 }, 光影族種: { dodge: 0.25, back: 0.3 }, 寰星族種: { magic: 0.2, luck: 3 }, 吸血族種: { vamp: 0.035, night: 0.15 },
    巨像族種: { hp: 0.3, def: 5, range: 0.15 }, 穴甲族種: { def: 6, ore: 0.5 }, 泳熔族種: { thorns: 0.3, immune: { burn: 1 } }, 植精族種: { regen: 0.6, mp: 0.2 },
    元素精族種: { magic: 0.2, mp: 0.15 }, 聚種族種: { hp: 0.08, mp: 0.08, dmg: 0.08 }, 化形族種: { dodge: 0.2, calm: 0.2 }, 雲翼族種: { speed: 0.15, dodge: 0.25 }, 岩龍族種: { def: 6, hp: 0.15 }
  };
  // 子族、原本的種族自己的招牌（照名字）
  const NAME = {
    大陸人族: { xp: 0.2, skillCd: 0.08, luck: 2 }, 犬人族: { guard: 0.2, hp: 0.1 }, 貓人族: { dodge: 0.25, crit: 0.06 }, 精靈族: { mp: 0.25, skillCd: 0.12, range: 0.15 },
    狐人族: { magic: 0.2, calm: 0.15 }, 雪狐族: { magic: 0.15, mp: 0.2, immune: { slow: 1 } }, 狼人族: { hp: 0.12, melee: 0.18, pen: 0.1 }, 沙人族: { def: 5, immune: { blind: 1 } },
    鰭人族: { regen: 0.8, immune: { slow: 1 } }, 樹人族: { hp: 0.25, regen: 0.8 }, 黑石族: { def: 10 }, 翼人族: { speed: 0.15, dodge: 0.3 },
    巨人族: { hp: 0.3, range: 0.25, kb: 1.5 }, 焰人族: { dmg: 0.12, ignite: 0.25 }, 熔岩人族: { def: 5, thorns: 0.35 }, 幻魔族: { mp: 0.3, calm: 0.3 },
    節肢蛛人族: { crit: 0.12, critMult: 0.4, pen: 0.15 }, 黑水晶族: { mp: 0.35, skillCd: 0.2, crystal: 0.6 }, 吸血人族: { vamp: 0.04, critMult: 0.25, night: 0.15 },
    暗影族: { dodge: 0.35, back: 0.35, calm: 0.2 }, 金龍人族: { def: 7, hp: 0.25, ore: 0.6 },
    雙頭人族: { range: 0.3, arc: 0.35, mp: 0.1 }, 多臂人族: { rate: 0.3, arc: 0.4 }, 四臂人族: { rate: 0.22, arc: 0.3 }, 獨臂人族: { melee: 0.3 }, 三足人族: { speed: 0.2 },
    獨眼巨人族: { crit: 0.1, range: 0.2 }, 巨臂巨人族: { range: 0.35, melee: 0.2 }, 九尾狐族: { magic: 0.3, mp: 0.3 }, 貓又族: { dodge: 0.3, crit: 0.08 },
    鑽石人族: { def: 8, crit: 0.08 }, 史萊姆人族: { hp: 0.25, regen: 0.8 }, 雷人族: { crit: 0.1, rate: 0.12 }, 鏡人族: { thorns: 0.4 }
  };
  // 強度分數（每一點的價值）
  const V = { hp: 100, mp: 40, def: 4, speed: 150, dmg: 150, melee: 90, magic: 90, crit: 150, critMult: 50, dodge: 45, skillCd: 130, regen: 25, calm: 35, xp: 40, vamp: 350, ignite: 50, thorns: 60, guard: 60, crystal: 15, night: 40, back: 50, ore: 15, luck: 4, range: 70, arc: 35, rate: 130, pierce: 15, mpRegen: 12, kb: 6, pen: 120 };
  const CAP = { hp: 0.6, mp: 0.7, def: 16, speed: 0.3, dmg: 0.35, melee: 0.5, magic: 0.5, crit: 0.25, critMult: 0.8, dodge: 0.55, skillCd: 0.35, regen: 2.5, calm: 0.6, xp: 0.5, vamp: 0.06, ignite: 0.4, thorns: 0.6, guard: 0.4, crystal: 1, night: 0.4, back: 0.6, ore: 1, luck: 8, range: 0.5, arc: 0.7, rate: 0.5, pierce: 2, mpRegen: 3, kb: 4, pen: 0.3 };
  const TARGET = { N: 50, R: 58, SR: 66, SSR: 74, UR: 86 };
  const score = b => Object.keys(b).reduce((s, k) => s + (k === 'immune' ? Object.keys(b.immune || {}).length * 8 : V[k] && b[k] > 0 ? V[k] * b[k] : 0), 0);
  const round = (k, v) => (k === 'def' || k === 'luck' ? Math.round(v) : k === 'regen' || k === 'mpRegen' || k === 'kb' ? Math.round(v * 10) / 10 : Math.round(v * 1000) / 1000);
  // 招牌照設計的數值（不縮放）；其他原本的加成照比例調（多了縮、少了放大到 1.6 倍）；還差的用「生命、傷害」各補一半
  const merge = (a, b) => { const o = Object.assign({}, a); Object.keys(b).forEach(k => { if (k === 'immune') o.immune = Object.assign({}, o.immune || {}, b.immune); else o[k] = (o[k] || 0) + b[k]; }); return o; };
  Object.keys(R.RACES).forEach(id => {
    const r = R.RACES[id]; if (!r || !r.b) return;
    const base = r.mixed ? R.RACES[r.mixed] : null; let sig = {};
    if (!r.mixed) sig = NAME[r.name] ? Object.assign({}, NAME[r.name]) : r.fam && FAM[r.fam] ? Object.assign({}, FAM[r.fam]) : {};   // 子族自己的招牌取代族種的（不疊加）
    else if (base && NAME[base.name]) sig = Object.fromEntries(Object.entries(NAME[base.name]).map(([k, v]) => [k, typeof v === 'number' ? v / 2 : v]));   // 混血：招牌減半
    const tgt = (TARGET[r.tier] || 50) * (r.mixed ? 0.6 : 1), sS = score(sig), b0 = Object.assign({}, r.b), sB = score(b0), room = tgt - sS;
    const f = sB > 0 ? Math.max(0.15, Math.min(1.6, room / sB)) : 1;
    const b = {}; Object.keys(b0).forEach(k => { if (k === 'immune') b.immune = b0.immune; else b[k] = b0[k] > 0 ? b0[k] * f : b0[k]; });
    let out = merge(b, sig);
    const left = tgt - score(out); if (left > 2) out = merge(out, { hp: left / 2 / V.hp, dmg: left / 2 / V.dmg });
    Object.keys(out).forEach(k => { if (k === 'immune' || typeof out[k] !== 'number') return; let v = out[k]; if (CAP[k] != null) v = Math.min(CAP[k], v); out[k] = round(k, v); if (!out[k]) delete out[k]; });
    r.b = out;
  });
  // ---------- 新的加成套進玩家的數值 ----------
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls), r = R.raceOf ? R.raceOf() : null, b = r && r.b; if (!b || !P.ws) return P;
    const k = P.ws.kind, melee = k === 'melee' || k === 'thrust';
    if (b.range) P.ws.range = (P.ws.range || 2) * (1 + b.range);
    if (b.arc && melee && P.ws.arc) P.ws.arc *= 1 + b.arc;
    if (b.rate) P.ws.rate *= 1 + b.rate;
    if (b.pierce && !melee) P.ws.pierce = (P.ws.pierce || 0) + Math.round(b.pierce);
    if (b.kb) P.ws.kb = (P.ws.kb || 0) + b.kb;
    if (b.mpRegen) P.mpRegen = (P.mpRegen || 0) + b.mpRegen;
    if (b.pen) P.pen = Math.min(0.8, (P.pen || 0) + b.pen);   // 2026-10-04 作者：種族也可以有穿透（無視護甲）
    return P;
  };
  const bt0 = R.raceBonusText;
  R.raceBonusText = id => {
    const out = bt0 ? bt0(id) : [], b = R.RACES[id] && R.RACES[id].b; if (!b) return out;
    const PCT = v => Math.round(v * 100) + '%';
    if (b.range) out.push('攻擊距離 +' + PCT(b.range)); if (b.arc) out.push('近戰攻擊範圍 +' + PCT(b.arc)); if (b.rate) out.push('攻速 +' + PCT(b.rate));
    if (b.pierce) out.push('遠程多穿透 ' + Math.round(b.pierce)); if (b.mpRegen) out.push('每秒回復魔力 ' + b.mpRegen); if (b.kb) out.push('擊退 +' + b.kb); if (b.pen) out.push('無視護甲 ' + PCT(b.pen));
    return out;
  };
  R.raceScore = id => Math.round(score(R.RACES[id].b));   // 測試用：強度分數
})(window.R);
