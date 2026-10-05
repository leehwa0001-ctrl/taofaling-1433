// 裝備詞條的數字：四捨五入到小數點後 2 位（2026-10-05 作者：避免一堆 9 的情況出現，例如強化後 13.799999999%）
// - 所有詞綴的說明（R.W_AFFIX、R.A_AFFIX、R.ACC_AFFIX 的 txt）出來的字串，小數超過 2 位的數字一律四捨五入到 2 位（尾巴的 0 拿掉）。
//   txt 之後被別的檔案換掉（haste.js 那種晚一點才包的）也一樣會被包到。
// - R.itemLines（裝備說明的每一行）最後也過一次，傳說、強化、寶石、套裝那些行一起修。
// - 只改顯示，存檔裡的數值不動。放在所有包 R.itemLines、改詞綴 txt 的檔案後面（main.js 前面）。
(function (R) {
  const r2 = s => { const n = Math.round((parseFloat(s) + 1e-9) * 100) / 100; return String(n); };
  const fix = R.round2Txt = s => (typeof s === 'string' ? s.replace(/\d+\.\d{3,}/g, r2) : s);
  const wrap = g => (typeof g === 'function' && !g.__r2 ? Object.assign(function () { return fix(g.apply(this, arguments)); }, { __r2: 1 }) : g);
  const hook = a => {
    if (!a || typeof a !== 'object' || a.__r2) return;
    try {
      let w = wrap(a.txt);
      Object.defineProperty(a, 'txt', { configurable: true, enumerable: true, get: () => w, set: g => { w = wrap(g); } });
      Object.defineProperty(a, '__r2', { value: 1 });
    } catch (e) { console.warn('[affixround]', e); }
  };
  const hookAll = () => ['W_AFFIX', 'A_AFFIX', 'ACC_AFFIX'].forEach(k => (R[k] || []).forEach(hook));
  const lines = () => {
    const il = R.itemLines; if (typeof il !== 'function' || il.__r2) return;
    R.itemLines = Object.assign(function (it) { const L = il.apply(this, arguments); return Array.isArray(L) ? L.map(fix) : L; }, { __r2: 1 });
  };
  hookAll(); lines();
  const late = () => { hookAll(); lines(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', late); else setTimeout(late, 0);
  setTimeout(late, 1500);
})(window.R);
