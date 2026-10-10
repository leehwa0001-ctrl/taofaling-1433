// 技能、被動的平衡（2026-10-10 作者：全部照建議）
// 怎麼比的：在遺跡裡用同一把基準武器，每一招實際放一次，量打一隻不動的假人、和打一群六隻的傷害，除以冷卻，
// 跟同一個等級帶（1–10、11–20、21–39、40 以上）全部職業的招比（控制、減益、防禦類的招不算傷害）。
// A. 壞掉的：
//   - 法陣・焰、巨陣・焰的熔岩沒有標成「你的」：不燙遺跡生物、反而燙你。改成你的（熔岩每 0.3 秒燙一下，傷害照同級調低）。
//   - 回馬箭：往後跳開才在落地點炸，打不到人 → 先在原地射一圈箭再往後跳（那圈箭也加強，原本只有同級兩成）。
//   - 十字斬、十字刻印、魔劍十字：兩刀各斜 45 度、正前方的打不到 → 兩刀在準心前方交叉成 X（xslash 的 cross）。
// B. 太強（同級的 2.5～5 倍）削；C. 太弱（同級的一～三成）加強；40 級以上的純控制招加一下傷害。
// D. 被動：固定點數回血 → 照最大生命的 %（hpPct，adv2plus.js 的 R.step 算）；固定減傷 6 點 → 生命低於一半時受到的傷害 −12%（lowGuard）；
//    高等級只加魔力或翻滾的格子補傷害；二轉被動只回魔力的補技能傷害。
// 直接改載入完成後的技能資料（SKILL_LIB 的 p 和覺醒、二轉的表是同一份），所以放在所有技能、被動檔案的後面。
(function (R) {
  const LIB = R.SKILL_LIB || {}, SK = R.SKILLS || {}, T = R.SKILL_TYPES, W = () => R.W;
  const D = R.adv2plusDebug || {};
  // 二轉、覺醒表裡的說明（選二轉的畫面用）也一起改
  const awkSkill = name => { let hit = null; Object.values(D.AWK || {}).forEach(v => (v[4] || []).forEach(s => { if (s[0] === name) hit = s; })); return hit; };
  const set = (id, f, desc) => {
    const L = LIB[id]; if (!L) return; L.p = L.p || {}; f(L.p, L);
    if (desc) { const a = awkSkill(L.name); if (a && typeof desc === 'function') a[5] = desc(a[5]); L.desc = typeof desc === 'function' ? desc(L.desc) : desc; }
    if (SK[id]) Object.assign(SK[id], { name: L.name, cd: L.cd, mp: L.mp, desc: L.desc });
  };
  const rep = (a, b) => s => String(s).split(a).join(b);
  const add = t => s => String(s).replace(/。$/, t + '。');

  // ---------- A. 壞掉的 ----------
  // 熔岩：技能放的算你的（combat.js 的 updateZones：own 'p' 才燙遺跡生物）
  let inZone = 0;
  if (T && T.zone) { const z0 = T.zone; T.zone = function (...a) { inZone++; try { return z0.apply(this, a); } finally { inZone--; } }; }
  const az0 = R.addZone;
  R.addZone = z => { if (inZone && z && z.kind === 'lava' && !z.own) z.own = 'p'; return az0(z); };
  set('ry_fire', p => { p.k = 0.2; });
  set('ga_mega', p => { p.k = 0.25; });
  // 回馬箭：原地射一圈箭，再往後跳
  set('a2_archer_ranger_1', (p, L) => { L.type = 'combo'; const end = Object.assign({}, p.end, { k: 3 }); L.p = { parts: [['nova', end], ['blink', { back: 1, range: p.range || 6, iframe: p.iframe || 0.4 }]] }; },
    s => String(s).replace('往後一躍拉開六公尺，落地時射出一圈箭：周圍的敵人受傷、變慢。', '原地射出一圈箭（周圍的敵人受傷、變慢），同時往後一躍拉開六公尺。'));
  // 十字：兩刀在準心前方交叉
  if (T && T.xslash) {
    const xs0 = T.xslash;
    T.xslash = function (s, P, w, pw) {
      if (!s.cross) return xs0.call(this, s, P, w, pw);
      const a = P.aimA, len = s.len || 4, cx = P.x + Math.sin(a) * len * 0.55, cz = P.z + Math.cos(a) * len * 0.55;
      [a + Math.PI / 4, a - Math.PI / 4].forEach(b => {
        const ca = Math.sin(b), sa = Math.cos(b), sx = cx - ca * len / 2, sz = cz - sa * len / 2;
        R.fx('slash', sx, 1, sz, { a: b, len });
        w.enemies.forEach(e => {
          if (e.dead || e.under) return; const dx = e.x - sx, dz = e.z - sz, along = dx * ca + dz * sa, side = Math.abs(dx * sa - dz * ca), rad = e.def.size * 0.5;
          if (along < -rad || along > len + rad || side > (s.width || 0.6) + rad) return;
          R.hurtEnemy(e, pw * s.k, { stun: s.stun, kb: s.kb, curse: s.curse, root: s.root });
        });
      });
      if (R.swingAnim) R.swingAnim(P.h, 0.02, 0.2); if (R.sfx) R.sfx('swing');
    };
  }
  ['b_cross', 'en_cross', 'sb_cross'].forEach(id => set(id, p => { p.cross = 1; }));

  // ---------- B. 太強 ----------
  set('sn_wisp', p => { p.t = 5; }, rep('8 秒', '5 秒'));
  set('bd_rondo', p => { p.t = 5; }, rep('8 秒', '5 秒'));
  set('sc_thunder', p => { p.k = 0.6; p.stun = 0.15; });
  set('sr_stack', p => { p.k = 0.9; });
  set('md_haunt', p => { p.k = 0.55; });
  set('ed_loop', p => { p.k = 0.3; });
  set('ry_storm', p => { p.k = 0.8; });
  set('sn_swarm', p => { p.k = 0.5; });
  set('se_resonance', p => { p.k = 0.6; });
  set('bd_canon', p => { p.k = 0.65; });
  set('ry_gravity', p => { p.k = 0.45; });
  set('sm_dragon', p => { p.k = 0.45; });
  set('m_storm', p => { p.k = 0.45; });
  set('nx_auto', p => { p.k = 0.5; });
  set('wd_sanctum', p => { p.k = 0.45; });
  set('se_lock_aw', p => { p.k = Math.round(p.k / 3.8 * 2.6 * 100) / 100; }, rep('威力 ×3.8', '威力 ×2.6'));
  set('a2_summoner_medium_0', p => { p.k = 3; });
  set('a2_priest_bishop_1', p => { p.k = 1.4; });

  // ---------- C. 太弱 ----------
  set('g_allout', p => { const s = p.parts && p.parts[0] && p.parts[0][1]; if (s) { s.k = 1.6; s.spread = 0.9; } });
  set('a_fullmoon', p => { p.homing = 5; p.life = 1.2; }, rep('射出十六支箭', '射出十六支會追蹤的箭'));
  set('sp2_gunner_0', p => { p.k = 1.2; p.spread = 1.0; });
  set('a2_blade_shadow_0', p => { p.homing = 6; p.k = 1.6; p.life = 1.6; }, rep('十二把飛刀，往四面八方射出', '十二把會追蹤的飛刀，往四面八方射出'));
  set('a2_summoner_medium_1', p => { p.k = 4; });
  set('yt_drink', p => { p.k = 2; });
  // 40 級以上的純控制招：控制不變，加一下傷害
  [['a2_mage_hexer_0', add('，並受到一次傷害')], ['sp2_arraymage_1', add('；封住的那一下也會受傷')], ['sp2_scroll_1', add('；封住的那一下也會受傷')], ['a2_scroll_sealer_1', add('；封住的那一下也會受傷')],
    ['a2_arraymage_warder_0', add('，立起來的那一下也會受傷')], ['a2_blade_shadow_1', add('，抓住的那一下也會受傷')], ['a2_summoner_tamer_0', add('，撒中的那一下也會受傷')]]
    .forEach(([id, d]) => set(id, p => { p.k = 3; }, d));
  set('sl_grand_aw', p => { p.k = 3; }, rep('8 秒內受到的傷害 +30%。', '8 秒內受到的傷害 +30%；封住的那一下也會受傷。'));

  // ---------- D. 被動 ----------
  const PL = R.PASSIVE_LIST || [], byId = id => PL.find(p => p.id === id);
  // fx 跟二轉的表是同一個物件：清掉再填，兩邊一起變
  const pset = (id, fx, body, oldBody) => {
    const p = byId(id); if (!p) return;
    Object.keys(p.fx).forEach(k => delete p.fx[k]); Object.assign(p.fx, fx);
    if (oldBody && p.desc.indexOf(oldBody) >= 0) p.desc = p.desc.replace(oldBody, body); else if (!oldBody) p.desc = body;
    // 選二轉畫面的說明
    Object.values(D.AWK || {}).forEach(v => { if (v[3] && v[3][1] === p.fx && oldBody) v[3][2] = String(v[3][2]).replace(oldBody, body); });
    Object.values(D.SPP || {}).forEach(v => { if (v && v[1] === p.fx && oldBody) v[2] = String(v[2]).replace(oldBody, body); });
  };
  // 固定點數回血 → 照最大生命
  pset('pr3', { hpPct: 0.004 }, '每秒回復 0.4% 的最大生命。');
  pset('sn6', { hpPct: 0.005 }, '每秒回復 0.5% 的最大生命。');
  pset('kn7', { hpPct: 0.005, hp: 0.12 }, '每秒回復 0.5% 的最大生命、生命 +12%。');
  pset('pr8', { heal: 0.15, hpPct: 0.004 }, '治療效果 +15%；每秒回復 0.4% 的最大生命。');
  pset('pr10', { hpPct: 0.01, mp: 0.3 }, '每秒回復 1% 的最大生命、魔力 +30%。');
  pset('a2p_knight_paladin', { hpPct: 0.008, def: 3 }, '每秒回復 0.8% 的最大生命、防禦 +3。', '每秒回復 1.2 點生命、防禦 +3。');
  pset('a2p_bard_aria', { killShield: 0.03, hpPct: 0.006 }, '擊倒遺跡生物得到 3% 生命的護盾（最多 30%）；每秒回復 0.6% 的最大生命。', '擊倒遺跡生物得到 3% 生命的護盾（最多 30%）；每秒回復 1 點生命。');
  // 固定減傷 6 點 → %
  pset('kn6', { tenacity: 0.5, lowGuard: 0.12 }, '受到的控制類負面效果時間減半；生命低於一半時，受到的傷害再 −12%。');
  pset('wa8', { def: 4, lowGuard: 0.12 }, '防禦 +4；生命低於一半時，受到的傷害再 −12%。');
  // 高等級只加魔力或翻滾的格子
  pset('sn8', { mp: 0.34, magic: 0.12 }, '魔力 +34%、法術傷害 +12%。');
  pset('sc8', { mp: 0.42, magic: 0.12 }, '魔力 +42%、法術傷害 +12%。');
  pset('ma11', { mp: 0.53, magic: 0.12 }, '魔力 +53%、法術傷害 +12%。');
  pset('bl9', { dodge: 0.28, dmg: 0.1 }, '翻滾冷卻 −28%、傷害 +10%。');
  pset('bd7', { mp: 0.39, speed: 0.08, magic: 0.1 }, '魔力 +39%、移動 +8%、法術傷害 +10%。');
  // 二轉被動只回魔力的
  pset('a2p_bard_serane', { mpRegen: 1.5, killMp: 5, skillDmg: 0.12 }, '在遺跡裡每秒回復 1.5 點魔力；擊倒遺跡生物回復 5 點魔力；技能傷害 +12%。', '在遺跡裡每秒回復 1.5 點魔力；擊倒遺跡生物回復 5 點魔力。');
  pset('a2p_scroll_noxa', { mpRegen: 1.5, killMp: 4, skillDmg: 0.12 }, '在遺跡裡每秒回復 1.5 點魔力；擊倒遺跡生物回復 4 點魔力；技能傷害 +12%。', '在遺跡裡每秒回復 1.5 點魔力；擊倒遺跡生物回復 4 點魔力。');
  pset('a2p_scroll_sp', { killCd: 0.5, mp: 0.2, skillDmg: 0.12 }, '擊倒遺跡生物，技能冷卻少 0.5 秒；魔力 +20%；技能傷害 +12%。', '擊倒遺跡生物，技能冷卻少 0.5 秒；魔力 +20%。');
  pset('a2p_bard_sp', { killCd: 0.5, mpRegen: 1, dmg: 0.1 }, '擊倒遺跡生物，技能冷卻少 0.5 秒；在遺跡裡每秒回復 1 點魔力；傷害 +10%。', '擊倒遺跡生物，技能冷卻少 0.5 秒；在遺跡裡每秒回復 1 點魔力。');
  pset('a2p_summoner_tamer', { killHeal: 0.02, petMul: 0.2 }, '擊倒遺跡生物回復 2% 生命；召喚物的傷害 +20%。', '擊倒遺跡生物回復 2% 生命；移動 +6%。');
  // 生命低於一半時的減傷（%）
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const P = W().P, f = P && P.pv; if (f && f.lowGuard && raw > 0 && P.hp < P.hpMax * 0.5) raw *= 1 - Math.min(0.5, f.lowGuard); return hp0(raw, src, o); };
  R.bal1010 = true;
})(window.R);
