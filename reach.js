// 攻擊範圍（2026-10-04 作者：裝備詞條、天賦樹可以再加個攻擊範圍，回調一下平衡）
// - 武器詞綴「延伸」：只出在近戰武器（劍、刀、斧、槌、長槍、拳套、長棍……；items.js、affixplus.js 看 a.melee）：
//   攻擊範圍 +6～18%＝攻擊距離、揮砍的角度都變大；強化照樣放大（crafting.js 的 R.affixSum）。
// - 天賦樹的根基多一格「伸展」（talenttree.js）：攻擊範圍 +3%／級。
// - 武器數值記下武器原本的攻擊距離（range0）：戰士的大招「天崩斬」照「現在的攻擊距離÷原本的」放大範圍（ult.js，最多 2 倍）——
//   種族、轉職、被動、詞綴、天賦加的攻擊距離都算。
// 放在 crafting.js、dmgtype.js 後面（包 R.weaponStats 最外面）。
(function (R) {
  R.W_AFFIX.push({ id: 'reach', name: '延伸', roll: [6, 18], melee: 1, txt: v => '攻擊範圍 +' + v + '%（攻擊距離、揮砍角度）' });
  const ws0 = R.weaponStats;
  R.weaponStats = it => {
    const o = ws0(it);
    try {
      const w = it && R.WEAPONS[it.base]; if (!o || !w) return o;
      o.range0 = w.range;
      const v = (R.affixSum ? R.affixSum([it], 'reach') : 0) / 100;
      if (v > 0 && (o.kind === 'melee' || o.kind === 'thrust')) { o.range = (o.range || 2) * (1 + v); if (o.arc) o.arc *= 1 + v; }
    } catch (e) { console.warn('[reach]', e); }
    return o;
  };
})(window.R);
