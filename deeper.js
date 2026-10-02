// 遺跡加深、佩特拉核心和領主體加強（作者 2026-10-03：遺跡目前層數太淺；佩特拉在最深處、要強一點；領主體都可以再強一點）
// - 層數：哈米莉亞 2→3、阿彌勒 4→6、摩爾斯 5→8、克森特 5→9、卡索 6→10（遺跡形式的加減照舊：高塔型 +1、迷宮型 −1）。
//   越深越強的幅度在第 4 層以後放緩（balance.js），不然最深幾層會強到打不動。
// - 領主體（名字是「領主體・」開頭的，包括 lords.js 的七種）：生命 ×1.4、傷害 ×1.15、經驗 ×1.4。
// - 佩特拉核心（克森特級以上的最深處）：生命 ×1.1（加上變深，總共大約是原本的 1.7 倍）、傷害 ×1.2、經驗 ×1.5；血剩 2/3、1/3 時喚出群瞳和三羽鴉，剩一半以後暴走（傷害再 +25%）。
//   保留區的核心（打不動的那種）不會這樣。
// 這個檔案要在 lords.js、kaso.js 後面載入。
(function (R) {
  const W = () => R.W;
  const FL = { hamilia: 3, amile: 6, mors: 8, kesent: 9, kaso: 10 };
  R.GRADES.forEach(g => { if (FL[g.id] && g.floors) g.floors = FL[g.id]; });

  const E = R.ENEMIES;
  Object.keys(E).forEach(id => {
    const d = E[id]; if (!/^領主體/.test(d.name || '')) return;
    d.hp = Math.round(d.hp * 1.4); d.dmg = Math.round(d.dmg * 1.15); d.xp = Math.round((d.xp || 80) * 1.4);
  });
  if (E.petra) { E.petra.hp = Math.round(E.petra.hp * 1.1);   // 層數變深，本來就會多五成左右的血（combat.js、balance.js 都照深度加）
    E.petra.dmg = Math.round(E.petra.dmg * 1.2); E.petra.xp = Math.round(E.petra.xp * 1.5); }

  // ---------- 佩特拉核心：喚出眷屬、暴走 ----------
  const call = (core, n) => {
    const P = W().P; R.banner('佩特拉核心喚來了眷屬', '翼肢張開，牆上的眼睛一起睜開');
    R.shake && R.shake(0.5);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, [x, z] = R.nearestFloor(core.x + Math.sin(a) * 4, core.z + Math.cos(a) * 4);
      R.fx && R.fx('blink', x, 1, z);
      R.spawnEnemy(i % 2 ? 'karasu' : 'hyakume', x, z, core.room, { aggro: true });
    }
    if (P) core.aggro = true;
  };
  let tick = 0;
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(), run = w.run; if (!run || run.done || !w.enemies) return;
    tick -= dt; if (tick > 0) return; tick = 0.3;
    const core = w.enemies.find(e => e.id === 'petra' && !e.dead && !e.invuln); if (!core) return;
    const f = core.hp / core.hpMax; core.ph = core.ph || 0;
    if (core.ph < 1 && f < 2 / 3) { core.ph = 1; call(core, 3); }
    if (core.ph < 2 && f < 1 / 2) { core.ph = 2; core.dmg *= 1.25; R.toast('佩特拉核心暴走了：攻擊變重', '#FF6A7A'); }
    if (core.ph < 3 && f < 1 / 3) { core.ph = 3; call(core, 4); }
  };
})(window.R);
