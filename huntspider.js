// 狩獵場的雪蛛偷襲（2026-10-03 試玩回饋：狩獵場那個雪林景色我蠻喜歡的，如果有蜘蛛偷襲就更讚了）
// - 雪蛛：湯山村後山的野獸（不是遺跡生物），白色的，平常躲在積雪的樹枝上。打倒了掉絹絲（crafting.js 的 thread）。
// - 每一段山路（山腳 2 處、山腰 3 處）有幾棵樹上躲著雪蛛：走近的時候，頭頂的樹枝先晃、地上先出現影子，0.8 秒後兩三隻落下來；
//   還站在影子正中間的話，會被砸到（扣一點血、變慢一下）。
// - 雪蛛不是考核的目標：不算完成度，也不算「多殺的獵物」（hunt.js 只算蓑背熊、土鎧豬）；專員不記。
// 放在 hunt.js 後面。
(function (R) {
  const W = () => R.W, rnd = Math.random, ID = 'yuyama-hunt';
  const pad = (rows, w) => rows.map(r => r.padEnd(w, '.').slice(0, w));
  const BODY = ['......aaaaa', '....aaaaaaaaa', '...aaaaaaaaaaa.ee', '..aaaaaaaaaaaaaeea', '..aaaaaaaaaaaaaaa'];
  if (R.BEAST_ART) R.BEAST_ART.snowspider = {
    pal: { a: '#E6EAF0', d: '#9AA4B0', l: '#5A6270', e: '#D83A3A' },
    a: pad(BODY.concat(['.l.l.aaaaaaaaa.l.l', 'l.l.l.l.dddd.l.l.l', 'l..l...l....l..l.l', 'l...l...l..l..l..l']), 18),
    b: pad(BODY.concat(['..l.l.aaaaaaaa.l.l', '.l.l.l.ldddd.l.l..', '.l..l..l....l.l..l', 'l..l...l....l..l..']), 18)
  };
  R.ENEMIES.snowspider = {
    name: '雪蛛', ref: '', hp: 70, dmg: 12, speed: 5.2, xp: 10, size: 0.7, ai: 'chase', color: '#E6EAF0', eye: '#D83A3A', wild: 1, noDex: 1,
    desc: '湯山村後山的白色大蜘蛛。躲在積雪的樹枝上，等獵物走到底下才落下來。',
    wildDrop: e => { if (rnd() < 0.6) R.dropMat('thread', 1, e.x, e.z); }
  };
  // 每一段山路：幾棵躲著雪蛛的樹
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const r = lf0(f, o);
    try {
      const w = W(), run = w.run, F = w.F; if (!run || !run.site || run.site.id !== ID || !F || !F.rooms) return r;
      const rooms = F.rooms.filter((x, i) => i > 0).sort(() => rnd() - 0.5).slice(0, run.floor === 0 ? 2 : 3);
      F.webs = rooms.map(rm => { const [x, z] = R.roomPoint ? R.roomPoint(rm, {}) : [rm.x, rm.z]; return { x, z, done: false }; });
    } catch (e) { console.warn('[huntspider]', e); }
    return r;
  };
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const ambush = (w, P) => {
    const run = w.run, x = P.x, z = P.z, n = 2 + (run.floor > 0 ? 1 : 0);
    R.toast && R.toast('頭頂的樹枝晃了一下，雪落下來——', '#C8D4DC');
    R.fx('mark', x, 0, z, { r: 2.2, t: 0.8 }); R.fx('poof', x, 3, z, { color: '#FFFFFF', n: 14 });
    later(() => {
      const P2 = W().P; if (!P2) return;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd(), rr = 0.8 + rnd() * 1.4, [sx, sz] = R.nearestFloor ? R.nearestFloor(x + Math.sin(a) * rr, z + Math.cos(a) * rr) : [x, z];
        const e = R.spawnEnemy('snowspider', sx, sz, R.roomIndexAt ? R.roomIndexAt(sx, sz) : -1, { aggro: true, quiet: true }); if (e) R.fx('poof', sx, 0.4, sz, { color: '#FFFFFF', n: 10 });
      }
      if (!P2.dead && Math.hypot(P2.x - x, P2.z - z) < 1.4) { R.hurtPlayer(Math.max(6, P2.hpMax * 0.08), null, { slow: 1.5 }); R.toast && R.toast('被落下來的雪蛛砸到了！', '#FF9A7A'); }
      R.shake && R.shake(0.25);
    }, 800);
  };
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(), F = w.F, P = w.P; if (!F || !F.webs || !P || P.dead || !w.run || w.run.done) return;
    F.webs.forEach(web => { if (!web.done && Math.hypot(P.x - web.x, P.z - web.z) < 5.5) { web.done = true; ambush(w, P); } });
  };
})(window.R);
