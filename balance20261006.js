// 2026-10-06：裝備詞綴／槍手細部平衡。放在 affixround.js 後、main.js 前。
(function (R) {
  // 舊雙槍仍可使用，但不再當成新武器種類掉落；手槍類合併，新增狙擊步槍。
  const wf0 = R.weaponsFor;
  if (wf0) R.weaponsFor = cls => wf0(cls).filter(id => !(R.WEAPONS[id] && R.WEAPONS[id].legacy));

  // 詞條：固定數字看物品等級；百分比增幅看稀有度。專注（技能冷卻）再額外降成原本 1/4。
  const PCT = new Set(['sharp','swift','crit','vamp','fire','frost','shock','heavy','cursed','pen','evade','focus','calm','greed','reach','might','keen','haste','fleet','leech','guard','wisdom','lucky','ember','chill','spark','pen2']);
  const DISCRETE = new Set(['pierce','multi']);
  const rarK = [0.25, 0.35, 0.50, 0.65, 0.80, 1.00];
  const val = (it, a) => {
    if (!it || !a || it._affixActual || DISCRETE.has(a.id)) return a ? a.v : 0;
    let k = PCT.has(a.id) ? (rarK[Math.min(rarK.length - 1, Math.max(0, it.rarity || 0))] || 1) : Math.min(2, 0.6 + 0.1 * Math.max(1, it.ilvl || 1));
    if (a.id === 'focus' || a.id === 'haste') k *= 0.25;
    return Math.round(a.v * k * 100) / 100;
  };
  const clone = it => { if (!it || !it.affixes || it._affixActual) return it; const c = Object.assign({}, it, { _affixActual: 1, affixes: it.affixes.map(a => Object.assign({}, a, { v: val(it, a) })) }); return c; };
  const sum0 = R.affixSum;
  if (sum0) R.affixSum = (items, id) => sum0(items.map(clone), id);
  const ws0 = R.weaponStats;
  if (ws0) R.weaponStats = it => ws0(clone(it));
  const il0 = R.itemLines;
  if (il0) R.itemLines = it => il0(clone(it));
})(window.R);
