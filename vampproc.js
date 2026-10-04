// 吸血改成「每次攻擊有機率回復」（作者 2026-10-05：每次攻擊有［吸血％數的機率］回復［武器吸血乘數×技能乘數］，
//   攻擊速度慢的大劍乘數高、快的長劍乘數低；範圍型技能乘數再降低，避免一刀直接回滿血。作者選：機率放大、每次回少一點）
// - 吸血％＝身上所有吸血加起來：武器的嗜血詞綴、飾品的飲血、種族、技能的強化（嗜血、血戰、鬼血……）、狂怒（2.5%）、
//   那一招自己帶的吸血（啜血、狂亂、飢渴……）。
// - 每一次攻擊（同一瞬間打到的算一次，不管打到幾隻）有「吸血％×5」的機率觸發（最多 90%）：
//   回復 生命上限 2% × 武器乘數 × 技能乘數。
//   武器乘數＝長劍的攻速（每秒 2.3 下）÷ 這把武器的攻速：大劍 2.3、戰斧 1.6、長劍 1、刀 0.85、步槍 0.26（0.25～3）——
//   每秒回的量各武器差不多，慢的武器一下回得多。
//   技能乘數：普攻 1；技能打到一隻 1、打到兩隻以上 0.5（範圍招）；本來就帶吸血的招式 1.5（不吃範圍的減半）。
// - 觸發後 0.3 秒內不會再觸發（多段的招式不會一下連回好幾次）。
// - 燃燒、毒、地上的範圍持續傷害（遺跡生物、範圍的每格結算）不算攻擊，不擲。
// - 原本「照傷害的幾 % 回」的地方（combat.js、races.js、skillbook.js、skillbook2.js）看到 R.vampProc 就不回了。
// 放在所有包 R.hurtEnemy 的檔案後面（index.html 最後面附近）。
(function (R) {
  const W = R.W;
  const CH = 5, CAP = 0.9, BASE = 0.02, REF_RATE = 2.3, ICD = 0.3;
  R.vampProc = true;
  // 遺跡生物、地上範圍的每格結算裡（燃燒、毒、範圍持續傷害）：不擲
  let tick = 0;
  ['updateEnemies', 'updateZones'].forEach(name => { const f0 = R[name]; if (!f0) return; R[name] = (...a) => { tick++; try { return f0(...a); } finally { tick--; } }; });

  const total = P => {
    let v = (P.ws && P.ws.vamp) || 0;
    if (P.raceB && P.raceB.vamp) v += P.raceB.vamp;
    if (P.sb) for (const k in P.sb) { const b = P.sb[k]; if (b && b.left > 0 && b.vamp) v += b.vamp; }
    if (P.buff && P.buff.rage > 0) v += 0.025;
    return v;
  };
  const wMult = P => { const wd = P.item && R.WEAPONS[P.item.base], rate = (wd && wd.rate) || REF_RATE; return Math.max(0.25, Math.min(3, REF_RATE / rate)); };
  // 給角色資料、狀態圖示用：現在的吸血％、觸發機率、一次回多少
  R.vampInfo = (P, extra) => { P = P || W.P; if (!P) return null; const v = total(P) + (extra || 0); return { vamp: v, chance: Math.min(CAP, v * CH), heal: Math.round((P.hpMax || 0) * BASE * wMult(P)), mult: wMult(P) }; };
  R.vampLine = P => { const i = R.vampInfo(P); return i && i.vamp > 0 ? Math.round(i.vamp * 1000) / 10 + '%（每次攻擊 ' + Math.round(i.chance * 100) + '% 機率回 ' + i.heal + ' 生命）' : ''; };

  let grp = null, last = -1e9;
  const resolve = () => {
    const g = grp; grp = null; const P = W.P, run = W.run; if (!g || !P || P.dead || !run || run.done) return;
    const v = total(P) + g.skill; if (v <= 0) return;
    const now = performance.now() / 1000; if (now - last < ICD) return;
    if (Math.random() >= Math.min(CAP, v * CH)) return;
    let k = 1; if (g.skill > 0) k = 1.5; else if (!g.primary && g.n >= 2) k = 0.5;
    last = now; R.healP(P.hpMax * BASE * wMult(P) * k);
  };
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const h0 = e && !e.dead ? e.hp : 0, r = he0(e, raw, o);
    try {
      if (!tick && e && h0 > 0 && (e.dead || e.hp < h0) && !(o && o.noVamp)) {
        const P = W.P;
        if (P && !P.dead && W.run && !W.run.done) {
          if (!grp) { grp = { set: new Set(), primary: false, skill: 0, n: 0 }; queueMicrotask(resolve); }   // 同一瞬間打到的算一次攻擊
          if (!grp.set.has(e)) { grp.set.add(e); grp.n++; }
          if (o && o.primary) grp.primary = true;
          if (R.vampSkill) grp.skill = Math.max(grp.skill, R.vampSkill);
        }
      }
    } catch (err) { console.warn('[vampproc]', err); }
    return r;
  };

  // 技能說明：「傷害的 15% 變成生命」這類舊寫法改成「吸血 +15%」
  const fix = s => String(s || '')
    .replace(/打到的傷害有 ([\d.]+)% 回成生命/g, '吸血 +$1%')
    .replace(/打出去的傷害有 ([\d.]+)% 變成生命/g, '吸血 +$1%')
    .replace(/造成傷害的 ([\d.]+)% 回復成生命/g, '吸血 +$1%')
    .replace(/傷害的 ([\d.]+)% (?:回成|變成)(?:你的)?生命/g, '吸血 +$1%');
  const fixAll = () => { if (R.SKILLS) Object.values(R.SKILLS).forEach(sk => { if (sk && sk.desc && /生命/.test(sk.desc)) sk.desc = fix(sk.desc); }); };
  fixAll(); setTimeout(fixAll, 0);   // 後面才加進來的技能（覺醒、二轉）也改
  R.vampDescFix = fix;
})(window.R);
