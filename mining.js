// 掘礦要有挖的動作（作者 2026-10-02：掘礦就是要挖）
// - 在礦殼留下的礦旁邊按互動（空白鍵）：換上十字鎬、面向礦、敲三下（約 1.8 秒），第三下敲完才掉礦石。
// - 走開、被打到、自己出手攻擊、倒下、換層：中斷，礦還在，可以重新挖。
// - 要放在 crafting.js、races.js 後面：挖完時呼叫的 R.mine 已經包好了銀礦、金龍人族多敲一塊的加成。
(function (R) {
  const W = () => R.W;
  const STRIKE = 0.6, WIND = 0.26, HITS = 3;
  let dig = null;   // { o, t, sw, hits, x, z, hp, h, weapon, kind, F, atk }
  const mine0 = R.mine;
  // 收起十字鎬，換回原本的武器
  const restore = () => {
    const d = dig; dig = null; if (!d) return;
    if (d.h && d.h.opt) { R.spriteLook(d.h, { weapon: d.weapon }); d.h.kind = d.kind; if (d.h.atk === d.atk) d.h.atk = null; }
    if (d.o && d.o.mesh) d.o.mesh.position.set(d.o.x, 0, d.o.z);
  };
  const stop = msg => { if (!dig) return; restore(); if (msg) R.toast(msg); };
  R.mine = o => {
    if (!o || o.left <= 0 || dig) return;
    const P = W().P; if (!P || !P.h || P.dead || !P.h.isSprite || !R.spriteLook) return mine0(o);
    dig = { o, t: 0, sw: 0, hits: 0, x: P.x, z: P.z, hp: P.hp, h: P.h, weapon: P.h.opt.weapon, kind: P.h.kind, F: W().F, atk: null };
    R.spriteLook(P.h, { weapon: 'pickaxe' }); P.h.kind = 'melee';
  };
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const d = dig; if (!d) return;
    const P = W().P, o = d.o;
    if (!W().run || !P || P.dead || W().F !== d.F || P.h !== d.h || o.left <= 0) { stop(); return; }
    if (Math.hypot(P.x - d.x, P.z - d.z) > 0.3) { stop('掘礦中斷了（礦還在，可以再挖）'); return; }
    if (P.hp < d.hp - 0.5 && (!R.hitInterrupts || R.hitInterrupts(d.hp - P.hp))) { stop('被打斷了，礦還沒挖下來'); return; }   // 場地的小傷害不打斷（kesentfx.js）
    if (P.h.atk && d.atk && P.h.atk !== d.atk) { stop(); return; }   // 自己出手攻擊
    d.hp = P.hp; d.t += dt;
    // 一下一下敲：舉起 → 敲下去 → 收回
    if (d.sw < HITS && d.t >= d.sw * STRIKE) { R.swingAnim(P.h, WIND, STRIKE); d.atk = P.h.atk; d.sw++; }
    if (d.hits < d.sw && d.t >= (d.sw - 1) * STRIKE + WIND + 0.05) {
      d.hits++; R.sfx && R.sfx('mine'); R.shake && R.shake(0.06);
      R.fx('spark', o.x, 0.45, o.z, { color: '#FFE6A0' }); R.fx('dust', o.x, 0.25, o.z, {});
      if (o.mesh) o.mesh.position.set(o.x + (Math.random() - 0.5) * 0.14, 0, o.z + (Math.random() - 0.5) * 0.14);
    }
    // 面向礦（瞄準的方向在 st0 裡已經套上去了，這裡蓋過去，再用新的方向重排一次這一格）
    P.h.g.rotation.y = Math.atan2(o.x - P.x, o.z - P.z); R.animHero(P.h, 0, 0, false);
    if (d.t >= HITS * STRIKE) { restore(); R.fx('poof', o.x, 0.4, o.z, { color: '#A3ACB6', n: 8 }); mine0(o); }
  };
})(window.R);
