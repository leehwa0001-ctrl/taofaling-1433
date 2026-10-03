// 出口有遺跡生物守著（2026-10-04 作者：要殺完出入口的怪物才能下去，不然有人會避戰刷寶箱；
// 「應該不是全部清掉才能下去，是清掉水晶或出入口的才能下去」）
// - 每一層的樓層通道旁邊、回歸水晶旁邊，各有一小群遺跡生物守著（分級越高越多：阿彌勒 4 隻……卡索 7 隻）。
//   平常在附近晃；走近、或打到其中一隻，整群醒過來。
// - 那一群還有活著的：樓層通道走不下去、回歸水晶用不了（會說還剩幾隻）。打完那一群就能用——同一層其他房間的不用管。
// - 樓層通道旁邊的回歸水晶（克森特級）和樓層通道算同一群。第一層入口房間的回歸水晶（一進來就在旁邊）不守。
// - 哈米莉亞級（遺跡生物不會主動打人）、觀光遺跡、狩獵場、第 0 層休息區不套用。
// 放在 stairs2.js、savepoint.js、run.js 後面。
(function (R) {
  const W = () => R.W, rnd = Math.random;
  const ok = run => run && run.site && run.site.id !== 'kanko' && run.grade && run.grade.id !== 'hunt' && !run.grade.passive && !run.site.outdoor && !(run.f0 && run.floor === 0);
  const NOT = ['chochin', 'nurikabe', 'hyakume', 'ushioni'];
  const alive = g => g.foes.filter(e => !e.dead && W().enemies.includes(e));
  const spawnGroup = (run, F, kind, x, z) => {
    const lv = run.grade.lv || 1, n = Math.min(7, 2 + lv), ri = R.roomIndexAt(x, z), foes = [];
    for (let i = 0, tries = 0; foes.length < n && tries < n * 4; tries++, i++) {
      const id = R.pickEnemyId ? R.pickEnemyId(run.grade.pool, run, NOT) : run.grade.pool[0], d = R.ENEMIES[id];
      if (!d || d.elite || d.boss) continue;
      const a = (i / n) * Math.PI * 2 + rnd() * 0.6, r = 2.4 + rnd() * 1.8, [px, pz] = R.nearestFloor(x + Math.sin(a) * r, z + Math.cos(a) * r);
      if (Math.hypot(px - x, pz - z) > 6 || (R.pointBlocked && R.pointBlocked(px, pz))) continue;
      const e = R.spawnEnemy(id, px, pz, ri, { quiet: true }); if (!e) continue;
      e.dormant = true; e.aggro = false; e.sgGuard = kind; foes.push(e);
    }
    return { kind, x, z, foes, woke: false, done: !foes.length };
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const r = lf0(f, o);
    try {
      const w = W(), run = w.run, F = w.F; if (F) F.sg = [];
      if (ok(run) && F && F.rooms) {
        const start = F.rooms[0], pts = [];
        (F.stairsAll && F.stairsAll.length ? F.stairsAll : [F.stairs]).forEach(s => { if (s) pts.push(['stairs', s.x, s.z]); });
        (F.crystals || []).forEach(c => {
          if (c.room === start.i || R.roomIndexAt(c.x, c.z) === start.i) return;   // 入口房間的：一進來就在旁邊，不守
          if (pts.some(p => Math.hypot(p[1] - c.x, p[2] - c.z) < 7)) return;        // 樓層通道旁邊的：和樓層通道同一群
          pts.push(['crystal', c.x, c.z]);
        });
        pts.forEach(([k, x, z]) => F.sg.push(spawnGroup(run, F, k, x, z)));
      }
    } catch (e) { console.warn('[stairguard]', e); }
    return r;
  };
  // 這個出口（樓層通道／回歸水晶）是哪一群在守
  const groupAt = (x, z) => { const F = W().F; return F && F.sg ? F.sg.find(g => !g.done && Math.hypot(g.x - x, g.z - z) < 7) : null; };
  const what = g => g.kind === 'stairs' ? '樓層通道' : '回歸水晶';
  // 走近或打到其中一隻：整群醒過來；打完：跳提示
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(), F = w.F, P = w.P; if (!F || !F.sg || !F.sg.length || !P || !w.run) return;
    F.sg.forEach(g => {
      if (g.done) return;
      const left = alive(g);
      if (!left.length) { g.done = true; if (g.woke) { R.toast(what(g) + '旁邊清乾淨了：' + (g.kind === 'stairs' ? '可以往下走了。' : '可以用了。'), '#7AE0A0'); R.sfx && R.sfx('magic'); } return; }
      if (!g.woke && (Math.hypot(P.x - g.x, P.z - g.z) < 7 || left.some(e => !e.dormant))) {
        g.woke = true; left.forEach(e => { e.dormant = false; e.aggro = true; });
        R.toast(what(g) + '有遺跡生物守著——打倒牠們才能' + (g.kind === 'stairs' ? '往下走' : '用') + '。', '#E8C04A');
      }
    });
  };
  const blocked = (x, z) => { const g = groupAt(x, z); if (!g) return 0; const n = alive(g).length; if (!n) { g.done = true; return 0; } return n; };
  const de0 = R.descend;
  R.descend = () => {
    const s = W().F && W().F.stairs, n = s && !s.sealed ? blocked(s.x, s.z) : 0;
    if (n) { R.toast('樓層通道旁邊的遺跡生物還沒打完（還有 ' + n + ' 隻）。'); return; }
    return de0();
  };
  const ax0 = R.askExtract;
  R.askExtract = (...a) => {
    const w = W(), F = w.F, P = w.P;
    if (F && P && F.crystals) { const c = F.crystals.find(c => Math.hypot(c.x - P.x, c.z - P.z) < 3); const n = c ? blocked(c.x, c.z) : 0; if (n) { R.toast('回歸水晶旁邊的遺跡生物還沒打完（還有 ' + n + ' 隻）。'); return; } }
    return ax0(...a);
  };
  // 互動的字：還有守衛的時候說清楚
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => {
    const best = ni0(); if (!best) return best;
    const isStairs = best.act === R.descend, isCrystal = best.act === R.askExtract; if (!isStairs && !isCrystal) return best;
    const n = blocked(best.x, best.z); if (!n) return best;
    return Object.assign({}, best, { label: (isStairs ? '樓層通道' : '回歸水晶') + '：先打倒旁邊守著的遺跡生物（還有 ' + n + ' 隻）' });
  };
})(window.R);
