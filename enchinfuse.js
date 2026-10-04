// 討伐令 1433：附魔師的「魔力灌注」（作者 2026-10-04：附魔派可以有個技能會附加額外魔法傷害，但副作用會一直扣魔力）
// - 附魔師 12 級學會。開關式：按一次打開、再按一次關掉（開的時候身上至少要有 5 點魔力）。
// - 開著的時候：武器的每一下（普攻）另外多打一份魔法傷害＝那一下的 40%（技能熟練一星 +5%，最多 65%）。魔法傷害不看護甲、看魔抗。
// - 副作用：魔力一直流掉——每秒 3 點＋魔力上限的 2%，比回魔快；魔力見底灌注就斷了。
// - 左下角的狀態寫「魔力灌注」，後面的秒數是照現在的魔力還撐得了多久。
// 放在 skillbook.js、skillpoints.js、dmgtype.js 後面（包 R.hurtEnemy、R.step）。
(function (R) {
  const W = () => R.W, L = R.SKILL_LIB, T = R.SKILL_TYPES; if (!L || !T) return;
  const ID = 'en_infuse', COLOR = '#9A8AFF';
  const drain = P => 3 + 0.02 * (P.mpMax || 0);
  T.infuse = (s, P) => {
    if (P.infuse) { P.infuse = false; if (P.sb) delete P.sb[ID]; R.toast && R.toast('魔力灌注：關掉了。', COLOR); return; }
    if ((P.mp || 0) < 5) { R.toast && R.toast('魔力不夠，灌不進去。', COLOR); return; }
    P.infuse = true; R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 2.2, color: COLOR }); R.sfx && R.sfx('magic');
    R.toast && R.toast('魔力灌注：武器每一下多打一份魔法傷害——魔力會一直流掉。再按一次關掉。', COLOR);
  };
  if (!L[ID]) {
    const desc = '開關式：把魔力直接灌進武器。開著的時候，普攻每一下多打一份魔法傷害（那一下的 40%，不看護甲）；代價是魔力一直流掉（每秒 3 點＋魔力上限的 2%），見底就斷。再按一次關掉。';
    L[ID] = { id: ID, name: '魔力灌注', cls: 'enchanter', lv: 12, cd: 1, mp: 0, type: 'infuse', p: {}, desc };
    R.SKILLS[ID] = { name: '魔力灌注', cd: 1, mp: 0, desc };
  }
  // 武器打中：再補一下魔法傷害
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const r = he0(e, raw, o), P = W().P;
    if (P && P.infuse && o && o.primary && !o.infused && raw > 0 && e && !e.dead) {
      const k = 0.4 + 0.05 * Math.min(5, R.skillRank ? R.skillRank(ID, P.cls) : 0);
      he0(e, raw * k, { mag: 1, infused: 1, primary: false });
      if (Math.random() < 0.5) R.fx && R.fx('spark', e.x, 1.1, e.z, { color: COLOR });
    }
    return r;
  };
  // 每一格：扣魔力、更新左下角的狀態
  let fxT = 0;
  const st0 = R.step;
  R.step = dt => {
    const out = st0(dt), w = W(), P = w.P;
    if (P && !P.infuse && P.sb && P.sb[ID]) delete P.sb[ID];
    if (P && P.infuse) {
      if (!w.run || P.dead) { P.infuse = false; if (P.sb) delete P.sb[ID]; return out; }
      const d = drain(P); P.mp = Math.max(0, (P.mp || 0) - d * dt);
      if (P.mp <= 0) { P.infuse = false; if (P.sb) delete P.sb[ID]; R.toast && R.toast('魔力見底，灌注斷了。', COLOR); return out; }
      P.sb = P.sb || {}; P.sb[ID] = Object.assign(P.sb[ID] || {}, { left: P.mp / d + dt, infuse: 1 });
      if ((fxT -= dt) <= 0) { fxT = 0.45; R.fx && R.fx('spark', P.x, 1.2, P.z, { color: COLOR }); }
    }
    return out;
  };
})(window.R);
