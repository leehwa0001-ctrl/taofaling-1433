// 多人連線：有人走進要清怪的房間，同一層的隊友全部一起被傳送進那一間，門口的膜馬上張起來（像元氣騎士；2026-10-10 作者）
// - 原本誰先走進去，自己的畫面就張膜；隊員走進去還會轉給房主跑一次，房主人在外面也被關在門外。
// - 現在：誰的畫面上這一間張膜了，就喊大家一聲（rmp）；收到的人如果還在外面，從離自己最近的那個門口被傳送進去（倒在地上的也一起，才扶得到），
//   然後照常走進這一間（生物醒來、張膜）。人在別的、還沒清完的房間裡打的，不拉（那一間會被丟著）。
// 放在 net.js、net2.js、run.js、ruinvar.js、audio.js 後面，pvp.js 前面（pvp.js 會再包一層 N.onMsg2）。
(function (R) {
  const W = () => R.W, N = R.net; if (!N || !R.lockRoom) return;
  const coop = () => { const run = W().run; return run && run.coop && !run.coop.solo && !run.done && N.room ? run : null; };
  const tag = run => ({ rid: run.coop.seed, f: run.floor, n: run.coop.n });
  // 落點：離自己最近的那個門口往房間裡走 2.5 公尺（不在牆、擺設裡面），不行就房間裡隨便一點
  const spot = (r, P) => {
    const t = W().F.tile; let best = null, bd = 1e9;
    (r.doors || []).forEach(k => { const tx = k % t.nx, tz = (k - tx) / t.nx, x = t.cX(tx), z = t.cZ(tz), d = Math.hypot(x - P.x, z - P.z); if (d < bd) { bd = d; best = [x, z]; } });
    if (best) {
      const dx = r.x - best[0], dz = r.z - best[1], l = Math.hypot(dx, dz) || 1;
      for (const k of [2.5, 3.5, 4.5, 6]) {
        const p = R.nearestFloor(best[0] + dx / l * k, best[1] + dz / l * k);
        if (R.roomIndexAt(p[0], p[1]) === r.i && !(R.pointBlocked && R.pointBlocked(p[0], p[1]))) return p;
      }
    }
    return R.roomPoint(r, {});
  };
  const pull = r => {
    const P = W().P, F = W().F; if (!P || !F || r.cleared) return false;
    const here = R.roomIndexAt(P.x, P.z); if (here === r.i) return false;
    const busy = here >= 0 && F.rooms[here] && F.rooms[here].locked && !F.rooms[here].cleared;
    if (busy) { R.toast && R.toast('隊友在另一區開打了。', '#7FE0FF'); return false; }
    const [x, z] = spot(r, P);
    P.x = x; P.z = z; P.vx = 0; P.vz = 0; if (P.h && P.h.g) P.h.g.position.set(x, P.h.g.position.y, z);
    if (R.fx) R.fx('spawn', x, 0.1, z, { color: '#7FE0FF' });
    R.toast && R.toast('隊友走進了戰鬥區域，你被一起傳送進去了。', '#7FE0FF');
    return true;
  };
  // 這一間張膜了：喊大家一聲；自己還在外面（例如房主跑隊員轉過來的進房間）就自己也進去
  const lr0 = R.lockRoom;
  R.lockRoom = (r, on) => {
    const res = lr0(r, on), run = coop();
    if (on && r && r.locked && run && !r.pullSent) { r.pullSent = 1; N.send(Object.assign({ k: 'rmp', i: r.i }, tag(run))); pull(r); }
    return res;
  };
  // 收到：先把自己傳進去，再照常走進這一間
  const got = d => {
    const run = coop(), F = W().F; if (!run || !F || d.rid !== run.coop.seed || d.f !== run.floor || d.n !== run.coop.n) return;
    const r = F.rooms[d.i]; if (!r || r.cleared) return;
    r.pullSent = 1;
    if (pull(r) || R.roomIndexAt(W().P.x, W().P.z) === r.i) R.enterRoom(r);
  };
  const prev = N.onMsg2;
  N.onMsg2 = (from, d) => { if (d && d.k === 'rmp') { try { got(d); } catch (e) { console.warn('[netwall]', e); } return; } if (prev) prev(from, d); };
})(window.R);
