// 討伐令 1433：街頭的犯罪——扒路人的錢包
// 從背後靠近一般的路人（不是衛兵、不是有名字的人），按空白鍵（手機點提示）：貼著他走一下子（不能離太遠）就扒到了。
// 有一定機率對方會回頭——被他看到就是「小偷！」（通緝）；旁邊看得到你的人也會讓視線條往上漲（和偷東西同一套，props.js）。
// 一個人一天只能扒一次；扒到的可能是零錢、鼓鼓的錢包、小東西，或空錢包。
(function (R) {
  const W = R.W, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const faceOf = n => (n.h ? n.h.g.rotation.y : n.rot);
  const S = () => R.S;

  // ---------- 扒路人的錢包 ----------
  let pp = null;   // 扒到一半：{ n: 對象, t, time: 要貼多久, turn: 第幾秒回頭（-1 不回頭） }
  const behind = (n, P) => Math.abs(wrap(Math.atan2(P.x - n.x, P.z - n.z) - faceOf(n))) > 1.9;
  const canPick = n => !pp && !n.off && n.walk && !n.patrol && !n.guard && !n.name && !n.person && !n.chase && !(n.flee > 0) && n.picked !== S().day && W.P && !W.P.sit && behind(n, W.P);
  const pickInter = n => ({ get x() { return n.x; }, get z() { return n.z; }, r: 1.5, pick: n, label: '扒走路人的錢包', when: () => canPick(n), act: () => start(n) });
  const start = n => { pp = { n, t: 0, time: 0.7 + Math.random() * 0.5, turn: Math.random() < 0.2 ? 0.2 + Math.random() * 0.4 : -1 }; R.toast('……（貼著走，別離太遠）'); };
  const loot = () => {
    const r = Math.random();
    if (r < 0.1) return null;
    if (r < 0.75) return { gold: 4 + Math.floor(Math.random() * 19) };
    if (r < 0.9) return { gold: 25 + Math.floor(Math.random() * 36), fat: 1 };
    return { gift: ['notebook', 'dango', 'rose', 'tea'][Math.floor(Math.random() * 4)] };
  };
  const done = n => {
    pp = null; n.picked = S().day; const l = loot(), s = S();
    s.stats = s.stats || {}; s.stats.picked = (s.stats.picked || 0) + 1;
    if (!l) R.toast('錢包是空的，只有一張當鋪的收據。', '#E8A03A');
    else if (l.gold) { s.gold += l.gold; R.toast((l.fat ? '鼓鼓的錢包：' : '扒到了：') + l.gold + ' 費拉', '#E8A03A'); if (R.sfx) R.sfx('coin'); }
    else { R.addGift(l.gift, 1); R.toast('扒到了：' + R.GIFTS[l.gift].name, '#E8A03A'); }
    // 有的人過一會兒才發現
    if (Math.random() < 0.35) setTimeout(() => { if (W.town && !W.inside && !n.off) R.toast('身後傳來：「咦？我的錢包呢……」'); }, 4000 + Math.random() * 3000);
    if (Math.random() < 0.2 && R.addDeed) R.addDeed('站前一帶扒手出沒，衛兵呼籲民眾注意隨身財物。');
    R.save();
  };
  // 被抓包：對象嚇得跑開；通緝照偷東西的規矩（props.js 的 R.crimeCaught）
  const caught = (who, victim) => {
    pp = null;
    if (victim) { victim.picked = S().day; victim.flee = 2.5; const a = Math.atan2(victim.x - W.P.x, victim.z - W.P.z); victim.tx = victim.x + Math.sin(a) * 8; victim.tz = victim.z + Math.cos(a) * 8; }
    if (R.crimeCaught) R.crimeCaught({ owner: 'street' }, who);
  };
  const step = dt => {
    const P = W.P, tw = W.town; if (!pp || !P || !tw) return;
    const n = pp.n, d = Math.hypot(P.x - n.x, P.z - n.z), C = R.crime;
    if (d > 1.8 || n.off || P.sit) { pp = null; R.toast('沒扒成——跟丟了。'); return; }
    pp.t += dt;
    // 對方回頭：當場被看到
    if (pp.turn >= 0 && pp.t >= pp.turn) { n.h.g.rotation.y = Math.atan2(P.x - n.x, P.z - n.z); caught(n, n); return; }
    // 旁邊的人看得到你：視線條往上漲
    let seen = 0, seer = null;
    tw.watchers.forEach(w => { if (w === n || w.off) return; const v = R.crimeSees ? R.crimeSees(w, P) : 0; if (v > seen) { seen = v; seer = w; } });
    if (seen > 0) C.seen = Math.min(1, C.seen + dt * (seer.watch.guard ? 2.8 : 1.9) * seen * (R.hoodOn && R.hoodOn() ? 0.8 : 1));
    if (C.seen >= 1) { C.seen = 0; caught(seer, n); return; }
    if (pp.t >= pp.time) done(n);
  };

  // ---------- 接上城裡 ----------
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => {
    enter0(from, at); pp = null;
    const tw = W.town; if (!tw) return;
    tw.npcs.forEach(n => { if (n.walk && !n.patrol && !n.guard && !n.name) tw.inter.push(pickInter(n)); });
  };
  const step0 = R.townStep;
  R.townStep = dt => { step0(dt); if (!W.inside) step(dt); };
})(window.R);
