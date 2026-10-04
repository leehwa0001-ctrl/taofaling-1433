// 消除隔間牆（2026-10-05 作者：暫停鍵裡新增一個消除隔間牆，為了防 bug 出現時離不開房間）
// - 遺跡裡的暫停選單多一個按鈕「消除隔間牆」，按了先問一次（只在卡住的時候用）。
// - 做的事：這一層所有房間門口的膜（R.lockRoom 張的）拿掉、那間房間算清完（回去不會再封）；
//   遺跡反應的擠壓牆、碎石（tag squeeze／rubble）的碰撞關掉；自己卡在牆裡、柱子裡的話移到最近能走的地方。
// - 10 秒內只能按一次。遺跡生物照樣在，只是你走得出去。
// 放在 hud.js、run.js 後面（包 R.pauseSheet）。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id);
  let last = -99;
  const now = () => performance.now() / 1000;
  const inBox = P => [...R.boxesNear(P.x, P.z)].some(c => c.on && P.x > c.x0 - 0.3 && P.x < c.x1 + 0.3 && P.z > c.z0 - 0.3 && P.z < c.z1 + 0.3);
  R.unstuck = () => {
    const w = W(), F = w.F, P = w.P; if (!w.run || !F || !P) return 0;
    let n = 0;
    (F.rooms || []).forEach(r => {
      if (!r.locked && !(r.barriers || []).length) return;
      (r.barriers || []).forEach(b => { if (b.m && b.m.parent) b.m.parent.remove(b.m); if (b.c) b.c.on = false; n++; });
      r.barriers = []; r.locked = false; r.cleared = true; r.trial = 0;
    });
    (R.col.list || []).forEach(c => { if (c.on && (c.tag === 'door' || c.tag === 'squeeze' || c.tag === 'rubble')) { c.on = false; n++; } });
    if (inBox(P) && R.nearestFloor) { const [x, z] = R.nearestFloor(P.x, P.z); P.x = x; P.z = z; R.collide(P, 0.42); if (P.h) P.h.g.position.set(P.x, 0, P.z); n++; }
    return n;
  };
  const ask = () => {
    R.sheet('<h2>消除隔間牆</h2><p>只在 bug 讓你離不開房間、卡在牆裡的時候用。</p>'
      + '<p class="note">這一層房間門口的膜會拿掉（那間房間算清完，回去也不會再封），遺跡震出來的牆和碎石也會消失；卡在東西裡的話，會把你移到最近能走的地方。遺跡生物照樣在。</p>',
      '<div class="row"><button type="button" class="btn pri" id="us-yes">消除</button><button type="button" class="btn" id="us-no">算了</button></div>');
    $('us-no').onclick = () => R.pauseSheet();
    $('us-yes').onclick = () => {
      R.closeSheet();
      if (now() - last < 10) { R.toast('剛剛才消除過，等幾秒再試。'); return; }
      last = now(); const n = R.unstuck();
      R.toast(n ? '隔間牆消除了，可以走了。' : '這一層沒有封住的門口，也沒有卡在牆裡。還是走不出去的話，回報給作者。', '#9AE0B0');
    };
  };
  const addBtn = () => {
    const sh = $('r-sheet'), row = sh && sh.querySelector('.row'); if (!row || row.querySelector('#ps-unstuck') || !W().run) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'ps-unstuck'; b.textContent = '消除隔間牆'; b.title = '卡住離不開房間的時候用'; b.onclick = ask;
    const quit = row.querySelector('#ps-quit'); row.insertBefore(b, quit || null);
  };
  const ps = R.pauseSheet; if (ps) R.pauseSheet = (...a) => { const r = ps(...a); addBtn(); return r; };
})(window.R);
