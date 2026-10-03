// 掉落物、寶箱減量（作者 2026-10-04：掉落物跟寶箱裡的物品感覺都有點太多，也許可以加個寶箱會開出空的的機率）
// - 寶箱可能是空的（被別的勇者先搜過了）：普通的三成、藍的一成五；金寶箱（機關房、試煉、領主、核心的獎勵）不會空。
// - 關上「刷新」之後再開：一半是空的。
// - 開出兩件以上的，一半機率少一件。
// - 精英（monsters8.js）掉裝備兩成→一成；遺落的背包（raid.js）四成五→兩成五。
// 放在 crafting.js、pact.js、raid.js 後面（包在 R.rollChest、R.useChest 最外面）。
(function (R) {
  const EMPTY = [0.3, 0.15, 0];
  let ctx = null;   // 現在正在開的寶箱（R.useChest 裡面叫 R.rollChest 的時候用）
  const rc0 = R.rollChest;
  R.rollChest = (g, floor, cls, tier) => {
    const out = rc0(g, floor, cls, tier), c = ctx; ctx = null;
    if (!c || g <= 0) return out;   // 不是開寶箱（行商、精英、擬態箱……）、哈米莉亞級（本來就是雜物）
    const p = (c.opened || 0) >= 1 ? 0.5 : EMPTY[Math.min(2, c.tier || 0)];
    if (Math.random() < p) { c.wasEmpty = 1; setTimeout(() => R.toast && R.toast('寶箱是空的。……被別的勇者先搜過了。', '#C8B88A'), 150); return []; }
    const items = out.filter(o => o.item);
    if (items.length >= 2 && Math.random() < 0.5) out.splice(out.indexOf(items[items.length - 1]), 1);
    return out;
  };
  const uc0 = R.useChest;
  R.useChest = c => { ctx = c && c.state === 'closed' ? c : null; try { return uc0(c); } finally { if (ctx === c) ctx = null; } };
})(window.R);
