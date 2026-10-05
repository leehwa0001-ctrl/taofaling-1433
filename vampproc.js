// 吸血（第三版，作者 2026-10-05）：吸血跟攻擊力、生命上限都脫鉤，只看「吸血系數」x（正整數）。
// - x＝身上所有吸血加起來：武器的嗜血、飾品的飲血、種族、技能的強化、狂怒、那一招自己帶的吸血、天賦（P.vampX）。
//   舊的「吸血 1%」一律換成吸血系數 +20（說明文字一起改）。
// - 每一次攻擊（同一瞬間打到的算一次）有 √x % 的機率觸發（x＝100 → 10%，最多 50%）。
// - 觸發時回復：⌈武器吸血乘數 × 技能乘數 × (1＋x÷2000)⌉ × (1＋√打到幾隻)÷2 × (1＋恢復量增益)。
//   武器吸血乘數照攻速：長劍 5（＝5×2.3÷攻速）→ 大劍 11.5、戰斧 8.2、刀 4.3、拳套 3.3、步槍 1.3（1～15）。
//   技能乘數：普攻、技能都是 1（範圍招照 (1+√隻數)÷2：打 9 隻回 2 倍）。
//   例：吸血 100 的長劍，普攻一隻 10% 機率回 ⌈5×1×1.05⌉＝6；一次打 9 隻 10% 機率回 18。
// - 沒有冷卻（作者：拳師的普攻比 0.3 秒還快）。燃燒、毒、地上範圍的持續傷害不算攻擊，不擲。
// - 回復照樣吃降治療（魔力太濃、重傷、佩特拉的詛咒、條款）。
// - 天賦「滴血重生」（P.ttBleed）：每少 1% 生命，吸血系數 +1%。
// - 原本「照傷害的幾 % 回」的地方（combat.js、races.js、skillbook.js、skillbook2.js）看到 R.vampProc 就不回了。
// 放在所有包 R.hurtEnemy 的檔案後面（index.html 最後面附近）。
(function (R) {
  const W = R.W;
  const PER = 2000, CAP = 0.5, REF_RATE = 2.3, LONG = 5;
  R.vampProc = true;
  // 遺跡生物、地上範圍的每格結算裡（燃燒、毒、範圍持續傷害）：不擲
  let tick = 0;
  ['updateEnemies', 'updateZones'].forEach(name => { const f0 = R[name]; if (!f0) return; R[name] = (...a) => { tick++; try { return f0(...a); } finally { tick--; } }; });

  // 吸血系數（整數）
  const coef = (P, extra) => {
    let v = (P.ws && P.ws.vamp) || 0;
    if (P.raceB && P.raceB.vamp) v += P.raceB.vamp;
    if (P.sb) for (const k in P.sb) { const b = P.sb[k]; if (b && b.left > 0 && b.vamp) v += b.vamp; }
    if (P.buff && P.buff.rage > 0) v += 0.025;
    let x = Math.round((v + (extra || 0)) * PER) + (P.vampX || 0);
    if (P.ttBleed && P.hpMax) x = Math.round(x * (1 + P.ttBleed * Math.max(0, 1 - P.hp / P.hpMax)));
    return Math.max(0, x);
  };
  const wMult = P => { const wd = P.item && R.WEAPONS[P.item.base], rate = (wd && wd.rate) || REF_RATE; return Math.max(1, Math.min(15, LONG * REF_RATE / rate)); };
  const amp = P => 1 + (P.recovAmp || 0);
  const healOf = (P, x, n) => Math.max(1, Math.round(Math.ceil(wMult(P) * (1 + x / PER)) * (1 + Math.sqrt(Math.max(1, n))) / 2 * amp(P)));
  R.vampCoef = coef;
  // 給角色資料、狀態圖示用
  R.vampInfo = (P, extra) => { P = P || W.P; if (!P) return null; const x = coef(P, extra); return { x, chance: Math.min(CAP, Math.sqrt(x) / 100), heal: healOf(P, x, 1), mult: wMult(P) }; };
  R.vampLine = P => { const i = R.vampInfo(P); return i && i.x > 0 ? '系數 ' + i.x + '（每次攻擊 ' + (Math.round(i.chance * 1000) / 10) + '% 機率回 ' + i.heal + ' 生命；武器乘數 ' + (Math.round(i.mult * 10) / 10) + '）' : ''; };

  let grp = null;
  const resolve = () => {
    const g = grp; grp = null; const P = W.P, run = W.run; if (!g || !P || P.dead || !run || run.done) return;
    const x = coef(P, g.skill); if (x <= 0) return;
    if (Math.random() >= Math.min(CAP, Math.sqrt(x) / 100)) return;
    R.healP(healOf(P, x, g.n));
  };
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const h0 = e && !e.dead ? e.hp : 0, r = he0(e, raw, o);
    try {
      if (!tick && e && h0 > 0 && (e.dead || e.hp < h0) && !(o && o.noVamp)) {
        const P = W.P;
        if (P && !P.dead && W.run && !W.run.done) {
          if (!grp) { grp = { set: new Set(), skill: 0, n: 0 }; queueMicrotask(resolve); }   // 同一瞬間打到的算一次攻擊
          if (!grp.set.has(e)) { grp.set.add(e); grp.n++; }
          if (R.vampSkill) grp.skill = Math.max(grp.skill, R.vampSkill);
        }
      }
    } catch (err) { console.warn('[vampproc]', err); }
    return r;
  };

  // ---------- 說明文字：吸血 X% → 吸血系數 +20X ----------
  const X = v => Math.round(parseFloat(v) * 20);
  const fix = s => String(s || '')
    .replace(/打到的傷害有 ([\d.]+)% 回成生命/g, (m, v) => '吸血系數 +' + X(v))
    .replace(/打出去的傷害有 ([\d.]+)% 變成生命/g, (m, v) => '吸血系數 +' + X(v))
    .replace(/造成傷害的 ([\d.]+)% 回復成生命/g, (m, v) => '吸血系數 +' + X(v))
    .replace(/傷害的 ([\d.]+)% (?:回成|變成)(?:你的)?生命/g, (m, v) => '吸血系數 +' + X(v))
    .replace(/吸血 \+?([\d.]+)%/g, (m, v) => '吸血系數 +' + X(v));
  const fixAll = () => { if (R.SKILLS) Object.values(R.SKILLS).forEach(sk => { if (sk && sk.desc && /生命|吸血/.test(sk.desc)) sk.desc = fix(sk.desc); }); };
  fixAll(); setTimeout(fixAll, 0);   // 後面才加進來的技能（覺醒、二轉）也改
  R.vampDescFix = fix;
  // 詞綴：嗜血、飲血（數字照舊存 1～3；顯示成系數）
  [[R.W_AFFIX, 'vamp'], [R.ACC_AFFIX, 'leech']].forEach(([L, id]) => { const a = (L || []).find(x => x.id === id); if (a) a.txt = v => '吸血系數 +' + X(v); });
})(window.R);
