// 多人連線：同一個種子長出同一層遺跡（給 net.js 用）。**要放在 index.html 所有檔案的最前面**：
// 很多檔案一載入就把 Math.random 存成 rnd，所以先把 Math.random 換成「可以切換」的版本，存起來的 rnd 也會跟著換。
// R.withSeed(seed, fn)：fn 執行的時候 Math.random 改用這個種子的亂數（mulberry32），結束換回來。
(function () {
  const native = Math.random;
  let cur = null;
  Math.random = function () { return cur ? cur() : native(); };
  const mulberry32 = a => () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.R = window.R || {};
  window.R.withSeed = (seed, fn) => { const prev = cur; cur = mulberry32(seed >>> 0); try { return fn(); } finally { cur = prev; } };
  window.R.nativeRandom = native;
})();
