// 樓層通道有遺跡生物守著（2026-10-04 作者：要殺完出入口的怪物才能下去，不然有人會避戰刷寶箱）
// - 原本樓層通道那一間一開始就算「清乾淨」，裡面沒有遺跡生物：可以一路繞過戰鬥、開寶箱、直接往下。
// - 改成：樓層通道那一間和一般的房間一樣，一踏進去就長出一群遺跡生物、門口張膜；打完膜才會開，也才走得下去。
//   （stairs2.js 的每一條樓層通道都一樣。）
// - 哈米莉亞級（遺跡生物不會主動打人）、觀光遺跡、狩獵場、第 0 層休息區不套用。
// 放在 stairs2.js、run.js 後面。
(function (R) {
  const W = () => R.W;
  const ok = run => run && run.site && run.site.id !== 'kanko' && run.grade && run.grade.id !== 'hunt' && !run.grade.passive && !run.site.outdoor && !(run.f0 && run.floor === 0);
  const guardRooms = F => {
    const set = new Set();
    (F.stairsAll && F.stairsAll.length ? F.stairsAll : [F.stairs]).forEach(s => { if (s && s.room != null && s.room >= 0) set.add(s.room); });
    return [...set].map(i => F.rooms[i]).filter(r => r && r.type !== 'start');
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const r = lf0(f, o);
    try {
      const w = W(), run = w.run, F = w.F;
      if (ok(run) && F && F.stairs) {
        // 走進去的時候 run.js 的 enterRoom 照一般的房間長遺跡生物、鎖門（本來就有遺跡生物在晃的那一間：叫醒牠們，不再多長一批）
        guardRooms(F).forEach(rm => { rm.cleared = false; rm.populated = w.enemies.filter(e => !e.dead && e.room === rm.i).length >= 4; rm.stairGuard = true; });
        if (!run.sgTold) { run.sgTold = 1; setTimeout(() => { if (W().run === run) R.toast('樓層通道那一間有遺跡生物守著：打倒牠們，才能往下走。', '#E8C04A'); }, 2600); }
      }
    } catch (e) { console.warn('[stairguard]', e); }
    return r;
  };
  const de0 = R.descend;
  R.descend = () => {
    const w = W(), F = w.F, s = F && F.stairs, rm = s && F.rooms[s.room];
    if (rm && rm.stairGuard && !rm.cleared && !s.sealed) {
      const n = (w.enemies || []).filter(e => !e.dead && e.room === rm.i).length;
      R.toast(n ? '樓層通道前的遺跡生物還沒打完（還有 ' + n + ' 隻）。' : '先把這一區的遺跡生物打完，才能往下走。');
      return;
    }
    return de0();
  };
})(window.R);
