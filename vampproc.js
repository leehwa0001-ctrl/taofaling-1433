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
// - 技能、大招（2026-10-08 作者改）：必定回，(1＋x÷250)×x÷(x＋500)×那一招的吸血倍率×多目標；每 0.2 秒結算一次。細節看下面「技能、大招（2026-10-08 作者）」。
//   以下是舊的（10-05）：每一次必定回，但回復量＝普攻的回復量 × 回血機率 ÷2（x＝100 → ×0.143、x＝250 → ×0.25、x＝400 → ×0.308，最多接近 ×0.5）。
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
  // ---------- 技能、大招（2026-10-08 作者）----------
  // 每次結算必定回：(1＋系數÷250) × 系數÷(系數＋500) × 那一招自己的吸血倍率 × (1＋√打到幾隻)÷2（多目標照舊）。
  // 每 0.2 秒結算一次：那一招 0.2 秒內打到的敵人合併算「同時命中」（連射、多段不會每一下都回）。
  // 吸血倍率＝4 × 冷卻秒數 ÷ 一次施放大約結算幾次（攻擊頻率高的技能低、冷卻長的一下打完的技能高；0.5～60）。
  //   「結算幾次」照技能參數（波數、連發、段數）先猜，之後每放一次照實際的結算次數修正（打得比預估多就馬上調上去，少就慢慢調下來）。
  //   大招冷卻當 30 秒、種族技能 40 秒。普攻照舊（上面的機率 × 武器吸血乘數）。
  const VK = 4, SK_WIN = 200, SESS_GAP = 1500;
  const skBase = x => (x > 0 ? (1 + x / HEAL_PER) * (x / (x + 500)) : 0);
  const est = {}, sess = {};
  const cdOf = id => (id === 'ult' ? 30 : id === 'race' ? 40 : num(R.SKILLS && R.SKILLS[id] && R.SKILLS[id].cd) || 8);
  const guess = id => {
    const L = R.SKILL_LIB && R.SKILL_LIB[id], p = (L && L.p) || {};
    const c = Math.max(1, num(p.waves) || num(p.burst) || num(p.hits) || (Array.isArray(p.parts) ? p.parts.length : 0) || 1), gap = num(p.gap) || 250;
    return c <= 1 ? 1 : gap >= SK_WIN ? c : 1 + Math.floor((c - 1) * gap / SK_WIN);
  };
  const winOf = id => est[id] || (est[id] = guess(id));
  const learn = (id, n) => { if (!(n > 0)) return; const e = winOf(id); est[id] = n > e ? n : Math.max(1, e * 0.85 + n * 0.15); };
  const vkOf = id => { const s = R.SKILLS && R.SKILLS[id]; const v = s && Number.isFinite(+s.vk) ? +s.vk : VK * cdOf(id) / winOf(id); return Math.max(0.5, Math.min(60, v)); };
  const skHealOf = (P, x, n, id) => Math.max(1, Math.round(skBase(x) * vkOf(id) * (1 + Math.sqrt(Math.max(1, n))) / 2 * amp(P)));
  R.vampSkMul = vkOf;
  R.vampCoef = coef;
  // 給角色資料、狀態圖示用
  const slotIds = P => { const out = []; const n = (R.SKILL_UNLOCK && R.SKILL_UNLOCK.length) || 3; for (let i = 0; i < Math.max(3, n); i++) { const id = R.slotSkill ? R.slotSkill(P, i) : i === 0 ? P.skill : null; if (id && R.SKILLS[id] && !out.includes(id)) out.push(id); } return out; };
  R.vampInfo = (P, extra) => {
    P = P || W.P; if (!P) return null; const x = coef(P, extra);
    let sks = []; try { sks = slotIds(P).map(id => ({ id, name: R.SKILLS[id].name, mul: vkOf(id), heal: x > 0 ? skHealOf(P, x, 1, id) : 0 })); } catch (e) { }
    return { x, chance: chanceOf(x), heal: healOf(P, x, 1), mult: wMult(P), skBase: skBase(x), sks, ultHeal: x > 0 ? skHealOf(P, x, 1, 'ult') : 0 };
  };
  R.vampLine = P => { const i = R.vampInfo(P); return i && i.x > 0 ? '系數 ' + i.x + '（普攻每次 ' + (Math.round(i.chance * 1000) / 10) + '% 機率回 ' + i.heal + ' 生命；技能每 0.2 秒結算一次必定回：' + (i.sks.map(s => s.name + ' ' + s.heal).join('、') || '—') + '；武器乘數 ' + (Math.round(i.mult * 10) / 10) + '）' : ''; };

  // ---------- 技能、大招的範圍：施放當下＋那一招排的 setTimeout＋那一招射出去的子彈＋施放動作（衝刺、旋風、跳躍）還沒結束時打到的 ----------
  let sk = 0, skId = null, lastCast = null;
  const inSk = (f, idOf) => function (...a) { const prev = skId; sk++; if (idOf) { const id = idOf(a); if (id) skId = id; } try { return f.apply(this, a); } finally { sk--; skId = prev; } };
  const st0 = window.setTimeout;
  window.setTimeout = function (f, ms, ...a) { if (sk > 0 && typeof f === 'function') { const id = skId; f = inSk(f, () => id); } return st0.call(window, f, ms, ...a); };
  const castTime = P => Math.max(P.dashT || 0, P.stance || 0, P.air || 0, P.jump ? Math.max(0, (P.jump.dur || 0.6) - (P.jump.t || 0)) : 0, P.buff && P.buff.whirl > 0 ? P.buff.whirl : 0, P.castT || 0);
  const cdNow = (P, i) => (i === 0 ? num(P.skillCd) : num(P.skCd && P.skCd[i]));
  // 放出去了（冷卻變長／魔力變少／大招開了）：上一次施放的結算次數拿來修正，記下施放動作還要多久
  const began = id => { const s = sess[id]; if (s) { learn(id, s.n); delete sess[id]; } const P = W.P, ct = P ? castTime(P) : 0; lastCast = ct > 0 ? { id, until: performance.now() + ct * 1000 + 100 } : null; };
  const wrapCastFn = (f, idOf) => { const g = inSk(f, idOf); return (...a) => { const P = W.P; if (!P) return g(...a); const id = idOf(a), i = a[0] | 0, c0 = cdNow(P, i), sc0 = num(P.skillCd), m0 = num(P.mp), u0 = P.ulting, r = g(...a); if (id && (cdNow(P, i) > c0 + 0.01 || num(P.skillCd) > sc0 + 0.01 || num(P.mp) < m0 - 0.01 || (!u0 && P.ulting))) began(id); return r; }; };
  const idSlot = a => { const P = W.P; return P ? (R.slotSkill ? R.slotSkill(P, a[0] | 0) : P.skill) : null; };
  if (typeof R.useSkill === 'function') R.useSkill = wrapCastFn(R.useSkill, () => W.P && W.P.skill);
  if (typeof R.castSlot === 'function') R.castSlot = wrapCastFn(R.castSlot, idSlot);
  if (typeof R.castUlt === 'function') R.castUlt = wrapCastFn(R.castUlt, () => 'ult');
  if (typeof R.castRaceSkill === 'function') { const g = inSk(R.castRaceSkill, () => 'race'); R.castRaceSkill = (...a) => { const r = g(...a); began('race'); return r; }; }
  const fi0 = R.fire;
  if (fi0) R.fire = o => fi0(sk > 0 && o && o.owner === 'p' ? Object.assign({}, o, { vSk: skId || 1 }) : o);
  const ex0 = R.explode;
  if (ex0) R.explode = s => (s && s.vSk && !sk ? inSk(ex0, () => (typeof s.vSk === 'string' ? s.vSk : null))(s) : ex0(s));
  R.vampInSkill = () => sk > 0;

  // 普攻（含其他）：同一瞬間打到的算一次攻擊，擲機率
  // 技能、大招：每一招自己一組，0.2 秒結算一次
  const grp = { atk: null }, skG = {};
  const resolve = () => {
    const g = grp.atk; grp.atk = null; const P = W.P, run = W.run; if (!g || !P || P.dead || !run || run.done) return;
    const x = coef(P, g.skill); if (x <= 0) return;
    if (Math.random() >= chanceOf(x)) return;
    R.healP(baseHeal(P, x, 1));   // 普攻多發／多段／範圍同時命中仍只按一次攻擊的回血量算
  };
  const resolveSk = id => () => {
    const g = skG[id]; delete skG[id]; const P = W.P, run = W.run; if (!g || !P || P.dead || !run || run.done) return;
    const now = performance.now(); let s = sess[id];
    if (s && now - s.last > SESS_GAP) { learn(id, s.n); s = null; }
    if (!s) s = sess[id] = { n: 0, last: now };
    s.n++; s.last = now;
    const x = coef(P, g.skill); if (x <= 0) return;
    R.healP(Math.max(1, Math.round(skBase(x) * vkOf(id) * (1 + Math.sqrt(Math.max(1, g.n))) / 2)));   // 恢復量% 由 healP 乘
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
            const lc = lastCast && performance.now() < lastCast.until ? lastCast.id : null;
            const sid = sk > 0 ? skId || '?' : o && o.vSk ? (typeof o.vSk === 'string' ? o.vSk : '?') : lc;
            let g;
            if (sid) { g = skG[sid]; if (!g) { g = skG[sid] = { set: new Set(), skill: 0, n: 0 }; st0.call(window, resolveSk(sid), SK_WIN); } }   // 技能：這一招 0.2 秒內打到的合併
            else { if (!grp.atk) { grp.atk = { set: new Set(), skill: 0, n: 0 }; queueMicrotask(resolve); } g = grp.atk; }   // 普攻：同一瞬間打到的算一次攻擊
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
