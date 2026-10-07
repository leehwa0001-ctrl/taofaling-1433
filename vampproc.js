// 吸血（第三版，作者 2026-10-05；同日晚：系數對回血量幾乎沒感——1＋x÷2000 從 100→200 只多 5%，滴血重生／血之渴望體感為零。回血改走 1＋x÷250）：
// - x＝身上所有吸血加起來：武器的嗜血、飾品的飲血、種族、技能的強化、狂怒、那一招自己帶的吸血、天賦（P.vampX）。
//   舊的「吸血 1%」一律換成吸血系數 +20（說明文字一起改）。把 % 換成系數時仍 ÷2000（1%＝+20）。
// - 每一次攻擊（同一瞬間打到的算一次）有 x÷(x＋250) 的機率觸發（x＝100 → 28.6%、250 → 50%、400 → 61.5%，越高越接近 100%）。
//   （作者 2026-10-05 晚：原本是 √x %、最多 50%，改成 x÷(x＋250)。）
// - 觸發時回復：⌈武器吸血乘數 × (1＋x÷250)⌉ × (1＋√打到幾隻)÷2 × (1＋恢復量增益)。
//   武器吸血乘數照攻速：長劍 5（＝5×2.3÷攻速）→ 大劍 11.5、戰斧 8.2、刀 4.3、步槍 1.3（1～15）；拳套／鐵爪再 ×0.25（原本約 3.3／3.6 → 約 1）。
//   例：吸血 100 的長劍，普攻一隻 10% 機率回 ⌈5×1.4⌉＝7；血之渴望 ×2（x＝200）回 ⌈5×1.8⌉＝9；一次打 9 隻再 ×2。
//   滴血重生把 x 再 ×(1＋少掉生命比例)：生命越低，回血機率與每次回血量都會真的變高。
// - 沒有冷卻（作者：拳師的普攻比 0.3 秒還快）。燃燒、毒、地上範圍的持續傷害不算攻擊，不擲。
// - 回復照樣吃降治療（元素混亂、重傷、佩特拉的詛咒、條款）。
// - 天賦「滴血重生」（P.ttBleed）：每少 1% 生命，吸血系數 +1%。
// - 技能書／種族強化的 vampMul：吸血系數再 ×N（吸血族「血之渴望」×2）。
// - 原本「照傷害的幾 % 回」的地方（combat.js、races.js、skillbook.js、skillbook2.js）看到 R.vampProc 就不回了。
// - 技能、大招（2026-10-05 作者）：不擲機率，每一次必定回，但回復量＝普攻的回復量 × 回血機率 ÷2（x＝100 → ×0.143、x＝250 → ×0.25、x＝400 → ×0.308，最多接近 ×0.5）。
//   （作者同日：先改成普攻恢復×回血概率，太少；再改成×(1＋回血概率)÷2，配上 1＋x÷250 的回血量太誇張；最後改成 × 回血機率 ÷2，機率也換成 x÷(x＋250)。最早是 × √x÷20。）
//   普攻一秒好幾下，沒中還好；技能、大招放得少，沒觸發很尷尬。
//   「技能」＝在 R.useSkill／R.castSlot／R.castUlt／R.castRaceSkill 裡面打到的，包括那一招排的 setTimeout（連段、延遲爆炸）
//   和那一招射出去的子彈（R.fire 標 vSk，combat.js 打到時帶 o.vSk）。同一瞬間技能、普攻打到的分開算。
// - 角色資料那頁的計算用 R.calcPlayer 算出來的 P（沒有 P.hp）：滴血重生算「少掉多少生命」時以前變 NaN，顯示成 NaN；沒有 P.hp 當滿血。
// 放在所有包 R.hurtEnemy 的檔案後面（index.html 最後面附近）。
(function (R) {
  const W = R.W;
  const PER = 2000, HEAL_PER = 250, CH_K = 250, REF_RATE = 2.3, LONG = 5;   // PER：%→系數；HEAL_PER：系數→回血量（作者：2000 太鈍，系數加倍幾乎看不出回血差）
  R.vampProc = true;
  // 遺跡生物、地上範圍的每格結算裡（燃燒、毒、範圍持續傷害）：不擲
  let tick = 0;
  ['updateEnemies', 'updateZones'].forEach(name => { const f0 = R[name]; if (!f0) return; R[name] = (...a) => { tick++; try { return f0(...a); } finally { tick--; } }; });

  const num = v => (Number.isFinite(+v) ? +v : 0);
  // 吸血系數（整數）
  const coef = (P, extra) => {
    let v = num(P.ws && P.ws.vamp), mul = 1;
    if (P.raceB && P.raceB.vamp) v += num(P.raceB.vamp);
    if (P.sb) for (const k in P.sb) {
      const b = P.sb[k]; if (!(b && b.left > 0)) continue;
      if (b.vamp) v += num(b.vamp);
      if (b.vampMul) mul *= Math.max(0, num(b.vampMul));   // 種族「血之渴望」等：吸血系數 ×N
    }
    if (P.buff && P.buff.rage > 0) v += 0.025;
    if (P.pv && P.pv.leech) v += num(P.pv.leech);   // 被動、轉職的吸血（嗜戰、氣血、血怒、妖刀飢渴…）：2% → 系數 +40（作者 2026-10-05：戰士、拳師被動的吸血沒改，還是超級回）
    let x = Math.round((num(v) + num(extra)) * PER) + num(P.vampX);
    if (P.ttBleed && P.hpMax > 0) { const hp = Number.isFinite(P.hp) ? P.hp : P.hpMax; x = Math.round(x * (1 + num(P.ttBleed) * Math.max(0, Math.min(1, 1 - hp / P.hpMax)))); }   // 角色資料頁的 P 沒有 hp：當滿血
    if (mul !== 1) x = Math.round(x * mul);
    return Number.isFinite(x) ? Math.max(0, x) : 0;
  };
  const wMult = P => { const wd = P.item && R.WEAPONS[P.item.base], rate = (wd && wd.rate) || REF_RATE, base = P.item && P.item.base; let m = LONG * REF_RATE / rate; if (base === 'gauntlet' || base === 'claws') m *= 0.25; const hits = Math.max(1, (P.ws && (P.ws.pellets || P.ws.hits)) || (wd && (wd.pellets || wd.hits)) || 1); m /= hits; if (wd && wd.kind === 'magic') m *= 0.5; return Math.max(0.25, Math.min(15, m)); };   // 作者：拳套／鐵爪攻速太快，武器吸血乘數改成原本的 1/4
  const amp = P => Math.max(0, 1 + (R.recovAmpOf ? R.recovAmpOf(P) : num(P.recovAmp)));   // 含滴血重生的恢復量%（實際乘在 healP；這裡給顯示用）
  const baseHeal = (P, x, n) => Math.max(1, Math.round(Math.ceil(wMult(P) * (1 + x / HEAL_PER)) * (1 + Math.sqrt(Math.max(1, n))) / 2));
  const healOf = (P, x, n) => Math.max(1, Math.round(baseHeal(P, x, n) * amp(P)));   // 顯示＝實際（healP 會再乘 amp）
  const chanceOf = x => { x = Math.max(0, num(x)); return x > 0 ? x / (x + CH_K) : 0; };   // 回血機率＝系數÷(系數＋250)
  const skMult = x => chanceOf(x) / 2;   // 技能、大招：必定觸發，回復量＝普攻的回復量 × 回血機率 ÷2
  const skHealOf = (P, x, n) => Math.max(1, Math.round(healOf(P, x, n) * skMult(x)));
  R.vampCoef = coef;
  // 給角色資料、狀態圖示用
  R.vampInfo = (P, extra) => { P = P || W.P; if (!P) return null; const x = coef(P, extra); return { x, chance: chanceOf(x), heal: healOf(P, x, 1), mult: wMult(P), skHeal: x > 0 ? skHealOf(P, x, 1) : 0, skMult: skMult(x) }; };
  R.vampLine = P => { const i = R.vampInfo(P); return i && i.x > 0 ? '系數 ' + i.x + '（普攻每次 ' + (Math.round(i.chance * 1000) / 10) + '% 機率回 ' + i.heal + ' 生命；技能、大招每次必定回 ' + i.skHeal + '；武器乘數 ' + (Math.round(i.mult * 10) / 10) + '）' : ''; };

  // ---------- 技能、大招的範圍：施放當下＋那一招排的 setTimeout＋那一招射出去的子彈 ----------
  let sk = 0;
  const inSk = f => function (...a) { sk++; try { return f.apply(this, a); } finally { sk--; } };
  const st0 = window.setTimeout;
  window.setTimeout = function (f, ms, ...a) { return st0.call(window, sk > 0 && typeof f === 'function' ? inSk(f) : f, ms, ...a); };
  ['useSkill', 'castSlot', 'castUlt', 'castRaceSkill'].forEach(name => { const f0 = R[name]; if (typeof f0 === 'function') R[name] = inSk(f0); });
  const fi0 = R.fire;
  if (fi0) R.fire = o => fi0(sk > 0 && o && o.owner === 'p' ? Object.assign({}, o, { vSk: 1 }) : o);
  const ex0 = R.explode;
  if (ex0) R.explode = s => (s && s.vSk && !sk ? inSk(ex0)(s) : ex0(s));
  R.vampInSkill = () => sk > 0;

  // 同一瞬間打到的算一次攻擊；普攻（含其他）和技能、大招分兩組
  const grp = { atk: null, sk: null };
  const resolve = key => () => {
    const g = grp[key]; grp[key] = null; const P = W.P, run = W.run; if (!g || !P || P.dead || !run || run.done) return;
    const x = coef(P, g.skill); if (x <= 0) return;
    if (key === 'sk') { R.healP(Math.max(1, Math.round(baseHeal(P, x, g.n) * skMult(x)))); return; }   // 技能、大招：baseHeal（恢復量% 由 healP 乘）
    if (Math.random() >= chanceOf(x)) return;
    R.healP(baseHeal(P, x, 1));   // 普攻多發／多段／範圍同時命中仍只按一次攻擊的回血量算
  };
  // 單一閘門：反擊／荊棘／noVamp／source=reflect 任一成立 → 正規化旗標＋進 _vampBlock 深度
  // 巢狀傷害（反傷過程中再打出去的）就算漏標也不會進吸血；擊倒回血看 R._vampBlock／R._reflectKill
  R.isNoVampHit = o => !!(o && (o.noVamp || o.thorns || o.reflect || o.source === 'reflect')) || !!(R._vampBlock > 0);
  R.markNoVamp = o => { o = o || {}; o.noVamp = true; o.reflect = true; return o; };  // 只強制 noVamp＋reflect；thorns 由呼叫端自己帶
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    o = o || {};
    const flagged = !!(o.noVamp || o.thorns || o.reflect || o.source === 'reflect');
    if (flagged) { o.noVamp = true; o.reflect = true; R._vampBlock = (R._vampBlock || 0) + 1; }
    const h0 = e && !e.dead ? e.hp : 0;
    let r;
    try {
      r = he0(e, raw, o);
      try {
        // 閘門在吸血排程本身：旗標或巢狀 _vampBlock 都不回血（作者 2026-10-05 晚：反擊仍吸血——改成源頭閘門，呼叫端漏標也擋）
        const nested = (R._vampBlock || 0) > (flagged ? 1 : 0);
        if (!tick && !flagged && !nested && e && h0 > 0 && (e.dead || e.hp < h0)) {
          const P = W.P;
          if (P && !P.dead && W.run && !W.run.done) {
            const key = sk > 0 || (o && o.vSk) ? 'sk' : 'atk';
            if (!grp[key]) { grp[key] = { set: new Set(), skill: 0, n: 0 }; queueMicrotask(resolve(key)); }   // 同一瞬間打到的算一次攻擊
            const g = grp[key];
            if (!g.set.has(e)) { g.set.add(e); g.n++; }
            if (R.vampSkill) g.skill = Math.max(g.skill, num(R.vampSkill));
          }
        } else if (flagged && e && h0 > 0 && (e.dead || e.hp < h0) && typeof console !== 'undefined' && console.assert) {
          // 單元式自檢：反擊有造成傷害時，確認這一擊不會進吸血排程
          console.assert(flagged && (o.noVamp || o.reflect), '[vampproc] reflect/thorns hit must keep noVamp gate');
        }
      } catch (err) { console.warn('[vampproc]', err); }
    } finally {
      if (flagged) R._vampBlock = Math.max(0, (R._vampBlock || 1) - 1);
    }
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
  const fixPass = () => { (R.PASSIVE_LIST || []).forEach(p => { if (p && p.desc) p.desc = fix(p.desc); }); Object.values(R.ADV || {}).forEach(L => (L || []).forEach(a => { ['desc', 'p1', 'p2'].forEach(k => { if (a && typeof a[k] === 'string') a[k] = fix(a[k]); }); })); };
  fixAll(); fixPass(); setTimeout(() => { fixAll(); fixPass(); }, 0);   // 後面才加進來的技能（覺醒、二轉）也改
  R.vampDescFix = fix;
  // 詞綴：嗜血、飲血（數字照舊存 1～3；顯示成系數）
  [[R.W_AFFIX, 'vamp'], [R.ACC_AFFIX, 'leech']].forEach(([L, id]) => { const a = (L || []).find(x => x.id === id); if (a) a.txt = v => '吸血系數 +' + X(v); });
})(window.R);
