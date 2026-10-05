// 卡索級的經驗提升（作者 2026-10-05：卡索級怪物經驗提升該來了吧）
// - 卡索級遺跡裡拿到的經驗 ×3（打倒遺跡生物、委託都算）。滿級以後經驗滿一級就多 1 點天賦點（skillpoints.js），卡索級也比較好刷。
// 放在 run.js、deepbonus.js 後面。
(function (R) {
  const K = 3;
  const gx0 = R.gainXp;
  R.gainXp = v => { const run = R.W.run; return gx0(run && !run.done && run.grade && run.grade.id === 'kaso' ? Math.round(v * K) : v); };
})(window.R);
