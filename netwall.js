// 多人連線：房間門口的膜（空氣牆）等全部的隊友都走進這一間才張起來（2026-10-10 作者）
// - 原本誰先走進去，自己的畫面就張膜；隊員走進去還會轉給房主跑一次，房主人在外面也被關在門外。
// - 現在：有人走進去，生物照樣醒、這一間照樣算「打起來了」（清光照樣算清完），只是膜先不張；
//   這一層的隊友（倒在地上的也算，才扶得到）全部都站進這一間，膜才張起來。一個人玩照舊。
// 放在 net.js、net2.js、run.js、ruinvar.js、audio.js 後面（R.lockRoom 要包在最外面：膜還沒張的時候不放關門的音效）。
(function (R) {
  const W = () => R.W, N = R.net; if (!N || !R.lockRoom) return;
  const coop = () => { const run = W().run; return run && run.coop && !run.coop.solo && !run.done && N.room ? run : null; };
  const mates = () => (N.remotes ? [...N.remotes.values()] : []);
  const inside = (r, x, z) => Number.isFinite(x) && Number.isFinite(z) && R.roomIndexAt(x, z) === r.i;
  const allIn = r => { const P = W().P; return !!P && inside(r, P.x, P.z) && mates().every(m => inside(r, m.x, m.z)); };
  const lr0 = R.lockRoom;
  R.lockRoom = (r, on) => {
    if (!r || !on) { if (r) r.wallWait = false; return lr0(r, on); }
    if (r.locked || !coop() || !mates().length || allIn(r)) return lr0(r, on);
    r.locked = true; r.wallWait = true; r.barriers = r.barriers || [];   // 打起來了，膜還沒張
    if (!r.wallSaid) { r.wallSaid = 1; R.toast && R.toast('等隊友都走進這一區，門口的膜才會張起來。', '#7FE0FF'); }
  };
  // 每一幀：等膜的房間，大家都進來了就張起來
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const F = W().F; if (!F || !F.rooms || !W().run) return;
    F.rooms.forEach(r => {
      if (!r.wallWait) return;
      if (!r.locked) { r.wallWait = false; return; }
      if (coop() && mates().length && !allIn(r)) return;
      if (!coop() || !mates().length) { const P = W().P; if (!P || !inside(r, P.x, P.z)) return; }   // 隊友都走了：自己在裡面才張
      r.wallWait = false; r.locked = false; R.lockRoom(r, true);
    });
  };
})(window.R);
