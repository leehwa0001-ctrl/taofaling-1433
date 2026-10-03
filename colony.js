// 遺跡生物的聚落（2026-10-04 作者：某一層可以有特別聚落，可能有一大坨怪，或者是同一種怪）
// - 阿彌勒級以上，大約四層有一層：挑一間大的房間變成聚落，房裡原本的生物換掉：
//   同族的巢（六成）：一大群同一種遺跡生物＋一隻「群的頭目」（生命四倍、比較大）；
//   大群（四成）：三種遺跡生物混在一起的一大坨。數量照分級、深度加多。
// - 房間地上有巢、骨頭堆；進這一層時提示「這一層有聚落」。整個聚落打光：房間中間冒出一個寶箱、多一筆經驗和費拉。
// - 休息區、樓層通道、回歸水晶、領主、寶箱、機關、礦脈的房間不會變成聚落；觀光遺跡、狩獵場、哈米莉亞級沒有。
// 放在 run.js、stairguard.js、biome.js 後面（包 R.populateFloor、R.step）。
(function (R) {
  const W = () => R.W, rnd = Math.random;
  const ok = run => run && run.site && run.grade && (run.grade.lv || 0) >= 2 && run.site.id !== 'kanko' && run.grade.id !== 'hunt' && !run.site.outdoor && !(run.grade.passive);
  const pickRoom = F => {
    const rooms = (F.rooms || []).filter(r => r.i > 0 && r.type === 'fight' && !r.rest && !r.nest && !r.puzzle && !r.lord && r.hx && r.hz);
    if (!rooms.length) return null;
    rooms.sort((a, b) => b.hx * b.hz - a.hx * a.hz);
    return rooms[Math.floor(rnd() * Math.min(3, rooms.length))];
  };
  const nestDeco = (F, r, col) => {
    const TH = THREE, mat = new TH.MeshLambertMaterial({ color: col }), bone = new TH.MeshLambertMaterial({ color: '#E8E0CC' });
    for (let i = 0; i < 5 + Math.floor(rnd() * 4); i++) {
      const [x, z] = R.roomPoint(r, {}); const m = new TH.Mesh(new TH.SphereGeometry(0.7 + rnd() * 0.5, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat); m.scale.y = 0.45; m.position.set(x, 0, z); m.receiveShadow = true; F.group.add(m);
      for (let k = 0; k < 3; k++) { const b = new TH.Mesh(new TH.BoxGeometry(0.5, 0.08, 0.1), bone); b.position.set(x + (rnd() - 0.5) * 2.2, 0.05, z + (rnd() - 0.5) * 2.2); b.rotation.y = rnd() * 3; F.group.add(b); }
    }
  };
  const make = () => {
    const w = W(), run = w.run, F = w.F; if (!ok(run) || !F || F.colony) return;
    if ((run.floor || 0) < 1 || rnd() > 0.27) return;
    const r = pickRoom(F); if (!r) return;
    // 房裡原本的生物先拿掉
    w.enemies.filter(e => e.room === r.i && !e.dead).forEach(e => { e.dead = true; e.silent = true; if (e.m && e.m.g) w.scene.remove(e.m.g); });
    w.enemies = w.enemies.filter(e => !e.dead);
    const g = run.grade, deep = Math.min(1, (run.floor || 0) / Math.max(1, run.floors - 1)), same = rnd() < 0.6;
    const no = ['chochin', 'nurikabe', 'hyakume', 'ushioni', 'kamaitachi'];
    const pick = () => (R.pickEnemyId ? R.pickEnemyId(g.pool, run, no) : g.pool[Math.floor(rnd() * g.pool.length)]);
    let ids = same ? [pick()] : [pick(), pick(), pick()]; ids = ids.filter(id => R.ENEMIES[id] && !R.ENEMIES[id].boss && !R.ENEMIES[id].elite); if (!ids.length) return;
    const n = Math.min(28, (same ? 10 : 13) + g.lv * 2 + Math.round(deep * 6) + Math.floor(rnd() * 4));
    const list = [];
    for (let i = 0; i < n; i++) {
      const id = ids[i % ids.length], [x, z] = R.roomPoint(r, { away: w.P, min: 4 });
      const e = R.spawnEnemy(id, x, z, r.i, { quiet: true }); if (!e) continue; e.dormant = true; e.aggro = false; e.colony = 1; list.push(e);
    }
    if (same && list.length) {
      const [x, z] = R.roomPoint(r, {}), lead = R.spawnEnemy(ids[0], x, z, r.i, { quiet: true, hpMul: 4 });
      if (lead) { lead.leader = true; lead.colony = 1; lead.dormant = true; lead.aggro = false; lead.dmg = (lead.dmg || lead.def.dmg) * 1.3; try { if (lead.m && lead.m.isSprite && R.beastVariant) R.beastVariant(lead.m, ids[0], 'leader'); else if (lead.m && lead.m.g) lead.m.g.scale.setScalar(1.5); } catch (e) { } list.push(lead); }
    }
    r.colony = 1; r.big = 1;
    const name = same ? R.ENEMIES[ids[0]].name + '的巢' : '遺跡生物的大群';
    F.colony = { r, list, name, done: false };
    nestDeco(F, r, same ? (R.ENEMIES[ids[0]].color || '#6A5A4A') : '#5A4A3A');
    setTimeout(() => { if (W().F === F && R.toast) R.toast('這一層有聚落：「' + name + '」——一大群 ' + list.length + ' 隻。打光的話有獎勵。', '#FF9A6A'); }, 3000);
  };
  const pf0 = R.populateFloor;
  R.populateFloor = (...a) => { const r = pf0(...a); try { make(); } catch (e) { console.warn('[colony]', e); } return r; };
  // 聚落打光：房間中間一個寶箱、經驗、費拉
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), w = W(), F = w.F, C = F && F.colony;
    if (C && !C.done && w.run && C.list.every(e => e.dead)) {
      C.done = true;
      try { const [x, z] = R.nearestFloor ? R.nearestFloor(C.r.x, C.r.z) : [C.r.x, C.r.z]; if (R.addChest) R.addChest(F.group, F, x, z, 1, C.r.i); R.fx && R.fx('ring', x, 0.2, z, { r: 3, color: '#FFE08A' }); } catch (e) { console.warn('[colony]', e); }
      const g = w.run.grade.lv || 1; if (R.gainXp) R.gainXp(25 * g); w.run.gold += 40 * g;
      R.banner && R.banner('聚落清空了', name0(C) + '・多一個寶箱、經驗 +' + 25 * g + '、費拉 +' + 40 * g);
    }
    return r;
  };
  const name0 = C => C.name;
})(window.R);
