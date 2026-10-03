// 驅逐型（佩特拉的反應）：「當佩特拉核心其所在位置距受損區域距離過近時，便會前往其位置驅趕破壞者」
// 原本只有最深那一層才有反應，其他層什麼都不會發生。照設定改成「離核心的距離」決定它怎麼做（一定是核心本體，沒有分身、投影）：
// - 最深那一層（距離 0）：核心直接過來（combat.js 原本的做法），而且會一路逼近、把你往外推。
// - 再上一層（距離 1）：腳下傳來聲音，十秒後核心從下面鑽上來，逼近、推你；待一陣子或被打傷三成就鑽回深處。
//   打傷的部分會留著：之後在最深處打它，它的血是少的。保留區的核心一樣打不動、也不准打。
// - 更遠（距離 2 以上）：它過不來，但記住你了（run.expelMark）。之後你一走到離它夠近的樓層，它會自己找上來；記得越多次越快。
(function (R) {
  const W = () => R.W;
  const dist = run => run.floors - 1 - run.floor;
  const reserve = run => run.grade.boss !== 'petra';
  // 推開：往遠離核心的方向推 3～4 公尺
  const shove = (e, P) => {
    const a = Math.atan2(P.x - e.x, P.z - e.z); let t = 0.35;
    R.fx('ring', e.x, 0.1, e.z, { r: 7, color: '#C86A7A' }); R.shake && R.shake(0.5);
    P.knockT = Math.max(P.knockT || 0, 0.35);
    if (!(P.iframe > 0)) R.hurtPlayer(e.dmg * 1.1, e, { knock: 0.45 }); /* 2026-10-04 作者：要更狠（原本 0.6 倍、推 11） */
    W().dyn.push(dt => { t -= dt; if (t <= 0 || P.dead) return false; P.x += Math.sin(a) * 15 * dt; P.z += Math.cos(a) * 15 * dt; R.collide(P, 0.42); return true; });
  };
  // 核心在你身邊：慢慢飄過來、每三秒推一次
  const drive = (e, o) => {
    const w = W(), run = w.run; e.expel = true; let push = 2.5, left = o.stay || 0; const hp0 = e.hp;
    w.dyn.push(dt => {
      if (e.dead || w.run !== run) return false;
      const P = w.P; if (P.dead) return true;
      const d = Math.hypot(P.x - e.x, P.z - e.z);
      if (d > 4) { const a = Math.atan2(P.x - e.x, P.z - e.z), sp = d > 12 ? 5 : 3.2; /* 原本 1.7：太慢，拉開距離就甩掉了 */ e.x += Math.sin(a) * sp * dt; e.z += Math.cos(a) * sp * dt; e.m.g.position.x = e.x; e.m.g.position.z = e.z; const rm = R.roomAt(e.x, e.z); if (rm) e.room = rm.i; }
      push -= dt; if (push <= 0 && d < 8.5) { push = 2.2; shove(e, P); }
      if (o.stay) {
        left -= dt;
        const hurt = !e.invuln && e.hp < hp0 - e.hpMax * 0.3;
        if (left <= 0 || hurt) {
          if (!e.invuln) { run.coreFrac = e.hp / e.hpMax; }
          e.dead = true; w.scene.remove(e.m.g);
          R.banner(hurt ? '核心受了傷，鑽回深處' : '佩特拉核心回到了深處', hurt ? '打傷的地方會留著：在最深處遇到它時，它還沒好' : '下一次，它會更快找上來');
          return false;
        }
      }
      return true;
    });
  };
  // 核心過來：先有預兆（地面震動、落點的記號），再現身
  const visit = (why) => {
    const w = W(), run = w.run, P = w.P; if (!run || run.expelVisit) return;
    const d = dist(run);   // 2026-10-04 作者：「離太遠不過來」很尷尬——多遠都會過來，越遠越久才到
    run.expelVisit = true;
    const room = R.roomAt(P.x, P.z) || w.F.rooms[0];
    // 最深那一層、核心已經在：直接移過來
    let core = d === 0 ? w.enemies.find(e => e.id === 'petra' && !e.dead) : null;
    R.banner('佩特拉核心要過來了', why);
    let t = d === 0 ? 3 : Math.min(20, 5 + 3 * d), shakeT = 0, mark = null;
    w.dyn.push(dt => {
      if (w.run !== run) return false;
      t -= dt; shakeT -= dt; if (shakeT <= 0) { shakeT = 1.6; R.shake && R.shake(0.35); }
      if (t < 1.6 && !mark) { const p = R.nearestFloor(P.x + 5, P.z + 5); mark = p; R.fx('mark', p[0], 0, p[1], { r: 3.2, t: 1.6 }); }
      if (t > 0) return true;
      const [cx, cz] = mark || R.nearestFloor(P.x + 5, P.z + 5);
      if (core) { core.x = cx; core.z = cz; core.room = room.i; core.aggro = true; core.m.g.position.set(cx, core.m.g.position.y, cz); }
      else {
        core = R.spawnEnemy('petra', cx, cz, room.i, { aggro: true });
        if (reserve(run)) core.invuln = true;
        if (d === 0) { const br = w.F.rooms.find(r => r.type === 'boss'); if (br) { br.coreOut = true; br.cleared = true; } }
      }
      R.banner('佩特拉核心親自過來了', reserve(run) ? '保留區的核心打不動，也不准打。它會把你推開——離開這一區！' : d === 0 ? '驅逐型：它會一路逼近，把破壞者推出去' : '它從 ' + d + ' 層下面鑽上來了：撐過去，或打傷它讓它退回去');
      drive(core, { stay: d === 0 && !reserve(run) ? 0 : reserve(run) ? 22 : 26 });
      return false;
    });
  };

  const react0 = R.react;
  R.react = () => {
    const w = W(), run = w.run;
    if (!run || run.reaction !== 'expel' || run.reacting) return react0();
    const d = dist(run);
    run.reacting = true; run.reactCount++; run.reactionKnown = true;
    setTimeout(() => { if (W().run === run) { run.aware = 35; run.reacting = false; } }, 9000);
    run.expelMark = (run.expelMark || 0) + 1;
    R.banner('佩特拉察覺到了破壞：驅逐型', d >= 2 ? '腳下很深的地方有東西動了——核心在 ' + d + ' 層下面，正在一路往上爬。' : d === 1 ? '腳下傳來很深的聲音——核心就在下一層，正在往上爬。' : '核心就在這一層。');
    run.expelVisit = false; visit(d === 1 ? '腳下的震動越來越近。' : '它要親自把你趕出去。');
  };
  // 換樓層：被記住了，又走到離核心夠近的地方——它會自己找上來
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const r = lf0(f, o), w = W(), run = w.run;
    if (run) {
      run.expelVisit = false;
      if (run.reaction === 'expel' && run.expelMark && dist(run) <= 1) {
        const wait = Math.max(6, (dist(run) === 0 ? 14 : 30) / run.expelMark); let t = wait;
        w.dyn.push(dt => { if (w.run !== run || run.floor !== f) return false; t -= dt; if (t > 0) return true; visit('它記得你。（被記住 ' + run.expelMark + ' 次）'); return false; });
        setTimeout(() => R.toast('……遺跡深處有什麼在動。它記得你。'), 1500);
      }
    }
    return r;
  };
  // 被打傷退回去的核心：之後在最深處遇到時，傷還在
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se0(id, x, z, room, o), run = W().run;
    if (id === 'petra' && run && run.coreFrac != null && !reserve(run)) e.hp = e.hpMax * run.coreFrac;
    return e;
  };
})(window.R);
