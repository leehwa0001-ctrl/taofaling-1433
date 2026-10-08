// 2026-10-08 作者回饋的數值調整（放在所有包 R.spawnEnemy 的檔案後面：difficulty.js、deepbonus.js、dmgfloor.js……）
// - 阿彌勒級的遺跡生物倍率砍半：生命、傷害都 ×0.5（深度、難度、保底這些都算完之後才乘）。
(function (R) {
  const W = () => R.W;
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se0(id, x, z, room, o), run = W().run;
    if (e && run && run.grade && run.grade.id === 'amile' && e.def && !e.def.human && !e.def.wild && !e.fake && !e.amileHalf && !(o && o.netMirror)) {
      e.amileHalf = 1; e.hp *= 0.5; e.hpMax *= 0.5; e.dmg *= 0.5;
    }
    return e;
  };
})(window.R);
