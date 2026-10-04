// 難度：血量 ×2、後期的保底（2026-10-04 作者：難度有點太低，血量調整成 2 倍，傷害差不多；加條款打 2 倍血的領主一樣一下就被秒；
//   後期玩家太輕鬆，可以加難後期）
// - 所有遺跡生物（人和狩獵場的野獸除外）生命 ×2。
// - 後期的保底（摩爾斯級以上）：玩家的傷害每升一級 +3%、再乘裝備、暴擊，到後期會把遺跡生物的加成甩開（那些加成都有上限）。
//   照玩家「一下普攻打多少」算一個最低生命：普通 4～10 下、精英 18～36 下、領主體 120～240 下、佩特拉核心 200～400 下（越深越多，照走到第幾成）。
//   遺跡生物的生命至少是這個數字（加注條款的生命倍率另外再乘）。
// - 傷害不動（作者：傷害目前感覺差不多）。
// 放在所有包 R.spawnEnemy 的檔案後面（最外面）。
(function (R) {
  const W = () => R.W, S = () => R.S;
  const isLord = d => !!(d && (/^領主體/.test(d.name || '')));
  // 玩家一下普攻的傷害（含等級、裝備、物攻魔攻、暴擊的平均）
  let cache = { t: -1, v: 0 };
  const hitOf = () => {
    const w = W(), P = w.P, run = w.run; if (!P || !P.ws) return 0;
    if (run && cache.t === run.floor && cache.run === run) return cache.v;
    const ws = P.ws, b = P.item && R.WEAPONS[P.item.base] || {}, mag = ws.kind === 'magic';
    const v = (ws.dmg || 0) * (P.dmgMult || 1) * (mag ? (P.matk || 1) : (P.patk || 1)) * (ws.pellets || 1) * (b.hits || 1) * (1 + Math.min(1, ws.crit || 0) * ((P.critMult || 1.5) - 1));
    cache = { t: run ? run.floor : -1, run, v }; return v;
  };
  R.playerHitEstimate = hitOf;
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se0(id, x, z, room, o), run = W().run; if (!e || !run || !e.def || e.def.human || e.def.wild || e.fake) return e;
    let hp = e.hpMax * 2;   // 全部 ×2
    try {
      const g = run.grade && run.grade.lv || 1;
      if (g >= 3) {
        const depth = Math.max(0, Math.min(1, (run.floor || 0) / Math.max(1, (run.floors || 1) - 1))), hit = hitOf();
        const n = e.id === 'petra' ? 200 : isLord(e.def) ? 120 : e.def.elite || e.def.boss ? 18 : 4, extra = e.id === 'petra' ? 200 : isLord(e.def) ? 120 : e.def.elite || e.def.boss ? 18 : 6;
        const pk = run.pact && run.pact.sel && run.pact.sel.hp ? [1, 1.5, 2][run.pact.sel.hp] : 1;
        hp = Math.max(hp, hit * (n + extra * depth) * (g >= 5 ? 1.3 : g >= 4 ? 1 : 0.7) * pk);
      }
    } catch (err) { }
    const k = hp / e.hpMax; e.hp *= k; e.hpMax = hp;
    return e;
  };
})(window.R);
