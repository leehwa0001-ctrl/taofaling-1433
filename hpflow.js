// 生命的起伏（作者 2026-10-05：坦克站在岩漿池裡跟怪物群毆也不會死、一個大招血就回滿——
//   讓角色的血量變化更平滑，更難瞬間掉血又大量恢復，營火、泉水這些回血的地方才有用）
// - 每秒回血（P.regen、德魯伊、回復增益、技能強化的每秒回復、天賦）全部 ×0.3：R.regenMul(P)（run.js、skillbook.js、talenttree.js 用）。
//   恢復量增益（P.recovAmp、滴血重生 P.ttBleed）在 R.healP 一次乘上（藥水、技能、每秒回血、吸血都吃到）；滴血重生：每少 1% 生命，恢復量 +0.5%（不是每秒回血）。
// - 回復藥：一瓶回生命上限的 25%（原本 35%）；戰鬥中（6 秒內被打過，或 12 公尺內有醒著的遺跡生物）再少 20%（回 20%）。
//   連續喝會遞減：每喝一瓶下一瓶藥效減半，最多到 1/8；10 秒沒喝恢復一階，連續 30 秒沒喝回到全效。
// - 遺跡生物打人的傷害全部再 ×0.5（招式的基本傷害；子彈、範圍招都跟著）。
// 放在 run.js（R.drink）、pact.js／promote2.js（包 R.drink）、所有包 R.spawnEnemy 的檔案（dmgfloor.js、kasoplus.js、lordvariant.js）後面。
(function (R) {
  const W = R.W;
  const REGEN = 0.3, POT = 0.25, POT_OLD = 0.35, FIGHT = 0.8, STEP = 10, MAXN = 3, MON = 0.5;   // 戰鬥中 ×0.8 → 回 20%（原本 ×0.4 → 10%）
  const now = () => performance.now() / 1000;

  // ---------- 恢復量／每秒回血 ----------
  // 滴血重生改加恢復量%（每少 1% 生命 +0.5%×點數比例），不再另外乘每秒回血
  R.recovAmpOf = P => {
    let a = (P && P.recovAmp) || 0;
    if (P && P.ttBleed && P.hpMax) {
      const hp = Number.isFinite(P.hp) ? P.hp : P.hpMax;
      a += 0.5 * P.ttBleed * Math.max(0, Math.min(1, 1 - hp / P.hpMax));
    }
    return a;
  };
  // 恢復量%改走 healP 一次乘（藥水、技能、每秒回血、吸血都吃到）；regenMul 只留全局 ×0.3，避免跟 healP 重複乘
  R.regenMul = P => REGEN;

  // 天賦「渴血」會扣每秒回血：最少 0（負的會變成扣血）
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => { const P = cp0(cls); if (P && P.regen < 0) P.regen = 0; return P; };

  // ---------- 戰鬥中 ----------
  let lastHurt = -1e9;
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const P = W.P, h = P ? P.hp : 0, r = hp0(raw, src, o); if (P && P.hp < h) lastHurt = now(); return r; };
  const inFight = () => {
    const P = W.P; if (!P || !W.run || W.run.done) return false;
    if (now() - lastHurt < 6) return true;
    return (W.enemies || []).some(e => !e.dead && e.aggro && !e.dormant && !(e.def && e.def.human && !e.hostile) && Math.hypot(e.x - P.x, e.z - P.z) < 12);
  };
  R.inFight = inFight;

  // ---------- 回復藥 ----------
  let potN = 0, potLast = -1e9, drinking = 0;
  const stacks = () => Math.max(0, potN - Math.floor((now() - potLast) / STEP));
  R.potionState = () => { const s = stacks(); return { stacks: s, mult: Math.pow(0.5, s), next: s ? STEP - ((now() - potLast) % STEP) : 0, fight: inFight() }; };
  const hl0 = R.healP;
  R.healP = (v, q) => {
    const P = W.P;
    let m = drinking || 1;
    if (P && v > 0) m *= Math.max(0, 1 + R.recovAmpOf(P));   // 滴血重生／癒合等：實際回血量跟著加
    return hl0(v * m, q);
  };
  const dr0 = R.drink;
  R.drink = k => {
    const S = R.S, P = W.P;
    if (k !== 'hp' || !P || P.dead || !S || !(S.potions && S.potions.hp > 0)) return dr0(k);
    const s = stacks(), fight = inFight(), n0 = S.potions.hp;
    drinking = POT / POT_OLD * Math.pow(0.5, s) * (fight ? FIGHT : 1);
    try { dr0(k); } finally { drinking = 0; }
    if (S.potions.hp < n0) {
      potN = Math.min(MAXN, s + 1); potLast = now();
      if (s || fight) R.toast && R.toast('回復藥的效果：' + [fight ? '戰鬥中 ×0.8' : '', s ? '連續喝 ×1/' + Math.pow(2, s) : ''].filter(Boolean).join('、'), '#FF9A8A');
    }
  };

  // ---------- 遺跡生物的傷害 ×0.5 ----------
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => { const e = se0(id, x, z, room, o); if (e && e.dmg > 0 && !e.hpflow) { e.hpflow = 1; e.dmg *= MON; } return e; };
})(window.R);
