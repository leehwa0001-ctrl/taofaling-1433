// 不屈（戰士）／神佑（祭司）：每一層一次，受到致命傷時留下 1 點生命（passives.js 的 fx.last）
// 2026-10-04 作者：不屈的觸發判定怪怪的，常常滿血就莫名其妙觸發；外觀效果要明顯一點（倒地，然後又站起來）。
// - 原因：passives.js 原本在 R.hurtPlayer 一開頭看「這一下的原始傷害 ≥ 現在的生命」，那是扣護甲、護盾、減傷之前的數字——
//   一下很大但被護甲擋掉大半、根本死不了的攻擊也會觸發，這一層的不屈就白白用掉了。
// - 現在：真的倒下的那一刻（R.onPlayerDown）才算。只算受傷倒下的，暫停選單的「放棄」、遺跡崩塌（一定會死）不算。
// - 觸發：先倒在地上（點陣圖的倒下）約一秒，這段時間不能動、不會受傷；站起來的時候金色的光圈往外震，把旁邊的遺跡生物震開，
//   之後 0.6 秒還打不到你。生命 1 點。
// - 2026-10-05 作者：不屈的判定是不是有 bug——斷尾型被切掉的區域、自己的炸彈會先把無敵時間歸零再扣血，
//   躺在地上那一秒照樣被打死，看起來像沒觸發。現在倒地＋站起來後 0.6 秒（P.unyGuard）什麼傷害都不吃，只有遺跡崩塌照樣會死。
// 要放在 adv2more.js 後面（包 R.onPlayerDown 最外面：委託失敗、死因、段位的記錄之前先攔下來；主教的復活留到下一次）。
(function (R) {
  const W = () => R.W;
  const DOWN = 1.0, AFTER = 0.6;
  let hit = null;   // 這一下的傷害（R.hurtPlayer 裡面才有）
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const P = W().P; if (P && !P.dead && P.unyGuard > 0 && !(!src && raw >= 9999)) return;   // 不屈救起來的這一段：別人歸零了無敵時間也一樣打不到
    const prev = hit; hit = { raw, src }; try { return hp0(raw, src, o); } finally { hit = prev; }
  };
  const pd0 = R.onPlayerDown;
  R.onPlayerDown = (...a) => {
    const w = W(), P = w.P, f = P && P.pv;
    const forced = hit && !hit.src && hit.raw >= 9999;   // 遺跡崩塌
    if (P && f && f.last && !P.pvLast && hit && !forced && w.run && !w.run.done) {
      P.pvLast = 1; P.dead = false; P.hp = 1;
      const name = P.cls === 'priest' ? '神佑' : '不屈';
      P.unyT = DOWN; P.unyGuard = DOWN + AFTER; P.iframe = DOWN + AFTER; P.knockT = DOWN; P.dashT = 0; P.jump = null; P.charging = false;
      if (R.setDown) R.setDown(P.h, true);
      R.fx && R.fx('boom', P.x, 0.3, P.z, { r: 1.6, color: '#8A2A2A' }); R.shake && R.shake(0.5); R.sfx && R.sfx('hurt');
      R.banner && R.banner(name + '……', '倒下了——');
      return;
    }
    return pd0(...a);
  };
  const stand = P => {
    const w = W(), name = P.cls === 'priest' ? '神佑' : '不屈';
    if (R.setDown) R.setDown(P.h, false);
    P.iframe = Math.max(P.iframe || 0, AFTER);
    R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 4, color: '#FFD27A' }); R.fx && R.fx('ring', P.x, 0.4, P.z, { r: 2.4, color: '#FFF0C0' }); R.fx && R.fx('boom', P.x, 0.6, P.z, { r: 2.2, color: '#FFD27A' });
    R.shake && R.shake(0.35); R.sfx && R.sfx('levelup');
    (w.enemies || []).forEach(e => { if (e.dead || (e.def && e.def.boss)) return; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d < 4 && d > 0.05) { e.kx = dx / d * 9; e.kz = dz / d * 9; } });
    R.banner && R.banner(name + '！', '又站了起來——留下最後一口氣（這一層不會再有第二次）');
    R.num && R.num(P.x, 2.6, P.z, name, 'heal');
  };
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), P = W().P;
    if (P && P.unyGuard > 0) P.unyGuard -= dt;
    if (P && P.unyT > 0) {
      P.unyT -= dt; P.knockT = Math.max(P.knockT || 0, P.unyT); P.iframe = Math.max(P.iframe || 0, P.unyT + AFTER);
      if (P.h && !P.h.down && R.setDown) R.setDown(P.h, true);
      if (P.unyT <= 0) { P.unyT = 0; P.knockT = 0; if (!P.dead) stand(P); }
    }
    return r;
  };
  // 換樓層（或離開遺跡）的時候還躺著：直接站起來
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const P = W().P; if (P && P.unyT > 0) { P.unyT = 0; P.knockT = 0; if (R.setDown) R.setDown(P.h, false); } return lf0(f, o); };
})(window.R);
