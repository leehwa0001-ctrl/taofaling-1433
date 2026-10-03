// 幸運、麻將的稱號（2026-10-04 作者：麻將可以有稱號，可能可以加幸運，寶箱空的機率可以再高）
// - 幸運（P.luck，點數）：戴著的稱號（R.titleBonus('luck')）＋種族（R.RACES[..].b.luck）。
//   每 1 點：寶箱空的機率 −3%（loot.js，最多少六成）、寶箱多開一樣的機率 +1%（crafting.js 的 P.accLucky）、暴擊率 +0.2%。
// - 雀莊的稱號（mahjong.js 的 R.mjEvent）：第一次和了、滿貫、役滿、十次第一名、×10 拿第一名。稱號一次只能戴一個（公會登記處換）。
// 放在 pact.js、loot.js、mahjong.js 後面。
(function (R) {
  const S = () => R.S;
  if (R.addTitle) [
    ['mj_first', '初和了', '在雀莊第一次和了', '幸運 +1', { luck: 1 }],
    ['mj_mangan', '滿貫', '在雀莊和出滿貫以上（5 翻）', '幸運 +2、暴擊率 +1%', { luck: 2, crit: 0.01 }],
    ['mj_yakuman', '役滿', '在雀莊和出役滿', '幸運 +5', { luck: 5 }],
    ['mj_regular', '雀莊常客', '在雀莊拿到 10 次第一名', '幸運 +3', { luck: 3 }],
    ['mj_whale', '大賭客', '在 ×10 的桌子拿到第一名', '幸運 +3、委託報酬 +2%', { luck: 3, pay: 0.02 }]
  ].forEach(t => R.addTitle(t));
  const give = id => { if (R.awardTitle) R.awardTitle(id); };
  R.mjEvent = (k, o) => {
    try {
      const m = (S() && S().mj) || {};
      if (k === 'win') { give('mj_first'); if (o.y && o.y.han >= 5) give('mj_mangan'); if (o.y && o.y.yakuman) give('mj_yakuman'); }
      if (k === 'end' && o.rk === 0) { if ((m.first || 0) >= 10) give('mj_regular'); if (o.mul >= 10) give('mj_whale'); }
    } catch (e) { console.warn('[luck]', e); }
  };
  // 幸運的點數
  R.luckOf = () => {
    const rc = R.raceOf ? R.raceOf() : null;
    return Math.round(((R.titleBonus ? R.titleBonus('luck') : 0) + ((rc && rc.b && rc.b.luck) || 0)) * 10) / 10;
  };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const L = R.luckOf(); P.luck = L;
      if (L) { P.accLucky = Math.min(0.6, (P.accLucky || 0) + L * 0.01); if (P.ws) P.ws.crit = (P.ws.crit || 0) + L * 0.002; }
    } catch (e) { }
    return P;
  };
  // 種族的加成說明多一行「幸運」
  const bt0 = R.raceBonusText;
  if (bt0) R.raceBonusText = id => { const out = bt0(id), b = R.RACES[id] && R.RACES[id].b; if (b && b.luck) out.push('幸運 +' + b.luck); return out; };
})(window.R);
