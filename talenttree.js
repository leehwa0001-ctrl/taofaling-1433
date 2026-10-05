// 討伐令 1433：天賦樹（作者 2026-10-04：天賦點不滿，感覺可以變成類似天賦樹的東西，有不同種分支這樣，點了一種就沒辦法點另一種）
// 原本 skillpoints.js 的天賦是一排一排的（三階、十二種，全部點滿要 80 點），換成一棵樹：
//   根基（體魄、力量、魔力）→ 投滿 8 點以後開三條「道」：刃（攻）、盾（守）、心（術）
//   → 一條道投滿 10 點以後開它的兩個分支 → 一個分支投滿 8 點開它的「奧義」 → 奧義點滿以後，多出來的點數放進「歷練」（沒有上限）。
// - 2026-10-04 作者：技能樹應該要可以點其他方向的，只不過奧義只能學會一個。
//   所以三條道、六個分支都可以點（原本選了一條道／一個分支，另外的就鎖起來）；六個奧義只能學一個，學了別的奧義就鎖起來。
//   一條路走到底：根基 15＋道 15＋分支 10＋奧義 5＝45 點；多的點數可以點別的道、別的分支，或進歷練。
// - 2026-10-05 作者：改成四條道——攻擊、防禦、魔法、恢復。防禦＝減傷、雙防、生命；恢復＝每秒回血、吸血系數、恢復量增益、體力回復。
//   不死身從防禦移到恢復的「自然恢復」；防禦的新奧義「反擊」（點滿把受到傷害的一半反彈）；恢復的新奧義「滴血重生」（生命越低恢復量%越高）。
//   天賦點改成每級 2 點（skillpoints.js）；花 10 點可以多學一個奧義（最多兩個，st.sp.t.T_slot2）。舊的點數（tree 2）全部退回一次。
// - 點數照舊是 skillpoints.js 算的（等級＋滿級後攢的點，st.sp.t 裡全部加起來是用掉的）；這裡的天賦 id 都是 T_ 開頭。
// - 舊存檔：原本點的天賦（沒有 T_ 的）全部退回來，提醒一次。
// - 重新分配照舊在公會的武器登記那裡（skillpoints.js 的按鈕，收 40 × 等級）。
// 放在 skillpoints.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const pct = v => Math.round(v * 1000) / 10 + '%';
  // 每個節點：[id, 名字, 最多幾級, 每級的說明, (P, 級數) => 加到身上]
  // tr：增益減益參半的節點（2026-10-04 作者：天賦樹也可以有減益增益參半的，像是技能傷害 +30%、普攻傷害 −15%，攻速 +60%、技能冷卻 +30%）——說明用「｜」分開好處和代價
  const N = (id, n, mx, d, f, tr) => ({ id, n, mx, d, f, tr });
  const capOn = (P, c) => { P.ttCaps = P.ttCaps || {}; P.ttCaps[c] = 1; if (!P.ttCap) P.ttCap = c; };   // 點滿的奧義（talentcap.js 看 P.ttCaps）
  const ROOT = [
    N('T_vit', '體魄', 5, '生命 +3%', (P, v) => { P.hpMax = Math.round(P.hpMax * (1 + 0.03 * v)); }),
    N('T_str', '力量', 5, '傷害 +2%', (P, v) => { P.dmgMult *= 1 + 0.02 * v; }),
    N('T_wis', '魔力', 5, '魔力 +4%', (P, v) => { P.mpMax = Math.round(P.mpMax * (1 + 0.04 * v)); }),
    // 2026-10-04 作者：天賦樹加個攻擊範圍（reach.js）——近戰是攻擊距離和揮砍的角度，遠程是射程；戰士的大招範圍也跟著攻擊距離變大
    N('T_reach', '伸展', 5, '攻擊範圍 +3%（近戰的攻擊距離、揮砍角度；遠程的射程）', (P, v) => { if (P.ws) { P.ws.range = (P.ws.range || 2) * (1 + 0.03 * v); if (P.ws.arc) P.ws.arc *= 1 + 0.03 * v; } })
  ];
  const PATHS = [
    { id: 'blade', n: '攻擊之道', c: '#FF6A5A', d: '攻勢：暴擊、穿透、攻速。',
      nodes: [N('T_acc', '精準', 5, '暴擊率 +1%', (P, v) => { if (P.ws) P.ws.crit += 0.01 * v; }), N('T_fat', '致命', 5, '暴擊傷害 +6%', (P, v) => { P.critMult += 0.06 * v; }), N('T_pen', '穿透', 5, '無視敵人護甲 +4%', (P, v) => { P.pen = Math.min(0.8, (P.pen || 0) + 0.04 * v); })],
      subs: [
        { id: 'gale', n: '疾風', d: '手快、腳快。', nodes: [N('T_spd', '迅捷', 5, '攻擊速度 +3%', (P, v) => { if (P.ws) P.ws.rate *= 1 + 0.03 * v; }), N('T_eva', '身法', 5, '翻滾冷卻 −5%', (P, v) => { P.dodgeCdMax *= 1 - 0.05 * v; }),
          N('T_trA1', '狂速', 5, '攻擊速度 +12%｜技能冷卻 +6%', (P, v) => { if (P.ws) P.ws.rate *= 1 + 0.12 * v; P.skillCdMult *= 1 + 0.06 * v; }, 1)],
          cap: N('T_capA1', '奧義・千刃', 5, '攻擊速度 +5%、暴擊率 +2%；點滿：每第五下普攻多砍一下', (P, v) => { if (P.ws) { P.ws.rate *= 1 + 0.05 * v; P.ws.crit += 0.02 * v; } if (v >= 5) capOn(P, 'A1'); }) },   // 2026-10-05 作者：奧義的數值強一點（talentcap.js）
        { id: 'heavy', n: '重擊', d: '一下比一下重。', nodes: [N('T_str2', '剛力', 5, '傷害 +3%', (P, v) => { P.dmgMult *= 1 + 0.03 * v; }), N('T_brk', '破勢', 5, '無視護甲 +3%、暴擊傷害 +4%', (P, v) => { P.pen = Math.min(0.8, (P.pen || 0) + 0.03 * v); P.critMult += 0.04 * v; }),
          N('T_trA2', '捨身', 5, '傷害 +6%｜受到的傷害 +4%', (P, v) => { P.dmgMult *= 1 + 0.06 * v; P.ttGuard = (P.ttGuard || 0) - 0.04 * v; }, 1)],
          cap: N('T_capA2', '奧義・斬鐵', 5, '暴擊傷害 +15%、無視護甲 +5%；點滿：對精英、領主體的傷害 +25%', (P, v) => { P.critMult += 0.15 * v; P.pen = Math.min(0.85, (P.pen || 0) + 0.05 * v); if (v >= 5) capOn(P, 'A2'); }) }
      ] },
    { id: 'shield', n: '防禦之道', c: '#6AB0FF', d: '守勢：減傷、雙防、生命。',
      nodes: [N('T_tou', '堅韌', 5, '受到的傷害 −1.5%', (P, v) => { P.ttGuard = (P.ttGuard || 0) + 0.015 * v; }), N('T_dd', '雙防', 5, '物防 +2、魔防 +2', (P, v) => { P.def = (P.def || 0) + 2 * v; P.mdef = (P.mdef || 0) + 2 * v; }), N('T_vit2', '厚實', 5, '生命 +4%', (P, v) => { P.hpMax = Math.round(P.hpMax * (1 + 0.04 * v)); })],
      subs: [
        { id: 'wall', n: '鐵壁', d: '減傷、雙防。', nodes: [N('T_tou2', '硬撐', 5, '受到的傷害 −1.5%', (P, v) => { P.ttGuard = (P.ttGuard || 0) + 0.015 * v; }), N('T_def', '護體', 5, '物防 +3、魔防 +3', (P, v) => { P.def = (P.def || 0) + 3 * v; P.mdef = (P.mdef || 0) + 3 * v; }),
          N('T_trB1', '重甲', 5, '受到的傷害 −4%｜移動 −3%', (P, v) => { P.ttGuard = (P.ttGuard || 0) + 0.04 * v; P.speed *= 1 - 0.03 * v; }, 1)],
          cap: N('T_capB3', '奧義・反擊', 5, '受到的傷害 −3%、每級把受到傷害的 20% 反彈給打你的敵人（吃傷害增幅，無視牠的防禦、減傷）；點滿：全部反彈，傷害再 ×4，每次反擊另外附加你最大生命 10% 的傷害', (P, v) => { P.ttGuard = (P.ttGuard || 0) + 0.03 * v; P.ttReflect = 0.2 * v; if (v >= 5) capOn(P, 'B3'); }) },
        { id: 'life', n: '體魄', d: '生命值。', nodes: [N('T_hp3', '生機', 5, '生命 +3%、魔防 +1', (P, v) => { P.hpMax = Math.round(P.hpMax * (1 + 0.03 * v)); P.mdef = (P.mdef || 0) + v; }), N('T_hp4', '血氣', 5, '生命 +5%', (P, v) => { P.hpMax = Math.round(P.hpMax * (1 + 0.05 * v)); }),
          N('T_trB2', '苦修', 5, '生命 +8%｜傷害 −3%', (P, v) => { P.hpMax = Math.round(P.hpMax * (1 + 0.08 * v)); P.dmgMult *= 1 - 0.03 * v; }, 1)],
          cap: N('T_capB1', '奧義・不動如山', 5, '受到的傷害 −4%、生命 +5%；點滿：不會被擊退', (P, v) => { P.ttGuard = (P.ttGuard || 0) + 0.04 * v; P.hpMax = Math.round(P.hpMax * (1 + 0.05 * v)); if (v >= 5) capOn(P, 'B1'); }) }
      ] },
    { id: 'mind', n: '魔法之道', c: '#B88AFF', d: '術勢：技能、魔力。',
      nodes: [N('T_med', '冥想', 5, '技能冷卻 −2%', (P, v) => { P.skillCdMult *= 1 - 0.02 * v; }), N('T_mpr', '回魔', 5, '每秒回復魔力 +0.4', (P, v) => { P.mpRegen = (P.mpRegen || 0) + 0.4 * v; }), N('T_amp', '共鳴', 5, '技能書技能的傷害 +3%', (P, v) => { P.ttSkill = (P.ttSkill || 0) + 0.03 * v; })],
      subs: [
        { id: 'swift', n: '迅思', d: '技能一直放。', nodes: [N('T_med2', '疾思', 5, '技能冷卻 −2.5%', (P, v) => { P.skillCdMult *= 1 - 0.025 * v; }), N('T_mpr2', '湧泉', 5, '每秒回復魔力 +0.5', (P, v) => { P.mpRegen = (P.mpRegen || 0) + 0.5 * v; }),
          N('T_trC1', '急咒', 5, '技能冷卻 −5%｜魔力 −6%', (P, v) => { P.skillCdMult *= 1 - 0.05 * v; P.mpMax = Math.round(P.mpMax * (1 - 0.06 * v)); }, 1)],
          cap: N('T_capC1', '奧義・無念', 5, '技能冷卻 −5%；點滿：放技能有 25% 不進冷卻', (P, v) => { P.skillCdMult *= 1 - 0.05 * v; if (v >= 5) capOn(P, 'C1'); }) },
        { id: 'abyss', n: '深淵', d: '一發比一發重。', nodes: [N('T_wis2', '深魔', 5, '魔力 +5%', (P, v) => { P.mpMax = Math.round(P.mpMax * (1 + 0.05 * v)); }), N('T_amp2', '增幅', 5, '技能書技能的傷害 +4%', (P, v) => { P.ttSkill = (P.ttSkill || 0) + 0.04 * v; }),
          N('T_trC2', '專精', 5, '技能書技能的傷害 +6%｜普攻的傷害 −3%', (P, v) => { P.ttSkill = (P.ttSkill || 0) + 0.06 * v; P.ttPrimary = (P.ttPrimary || 0) + 0.03 * v; }, 1)],
          cap: N('T_capC2', '奧義・天啟', 5, '技能書技能的傷害 +8%、魔力 +6%；點滿：技能的暴擊率 +15%', (P, v) => { P.ttSkill = (P.ttSkill || 0) + 0.08 * v; P.mpMax = Math.round(P.mpMax * (1 + 0.06 * v)); if (v >= 5) capOn(P, 'C2'); }) }
      ] },
    { id: 'mend', n: '恢復之道', c: '#6AE08A', d: '回復：每秒回血、吸血、恢復量、體力。',
      nodes: [N('T_rec', '調息', 5, '每秒回復生命 +1', (P, v) => { P.regen = (P.regen || 0) + v; }), N('T_heal', '癒合', 5, '恢復量 +4%（每秒回血、吸血都算）', (P, v) => { P.recovAmp = (P.recovAmp || 0) + 0.04 * v; }), N('T_stam', '喘息', 5, '體力回復 +6%', (P, v) => { P.ttStam = (P.ttStam || 0) + 0.06 * v; })],
      subs: [
        { id: 'regen', n: '自然恢復', d: '站得住就會好。', nodes: [N('T_rec2', '再生', 5, '每秒回復生命 +1.5', (P, v) => { P.regen = (P.regen || 0) + 1.5 * v; }), N('T_heal2', '生生不息', 5, '恢復量 +5%', (P, v) => { P.recovAmp = (P.recovAmp || 0) + 0.05 * v; }),
          N('T_trD1', '靜養', 5, '每秒回復生命 +4｜攻速 −4%', (P, v) => { P.regen = (P.regen || 0) + 4 * v; if (P.ws) P.ws.rate *= 1 - 0.04 * v; }, 1)],
          cap: N('T_capB2', '奧義・不死身', 5, '生命剩三成以下時，每秒再回復 1.5% 生命；點滿：受到致命傷時留 1 點生命、3 秒不會受傷（90 秒一次）', (P, v) => { P.ttLowRegen = 0.015 * v; if (v >= 5) capOn(P, 'B2'); }) },
        { id: 'leech', n: '吸血', d: '打到就回。', nodes: [N('T_vx1', '飲血', 5, '吸血系數 +10', (P, v) => { P.vampX = (P.vampX || 0) + 10 * v; }), N('T_vx2', '血契', 5, '吸血系數 +6、恢復量 +3%', (P, v) => { P.vampX = (P.vampX || 0) + 6 * v; P.recovAmp = (P.recovAmp || 0) + 0.03 * v; }),
          N('T_trD2', '渴血', 5, '吸血系數 +20｜每秒回復生命 −1.5', (P, v) => { P.vampX = (P.vampX || 0) + 20 * v; P.regen = (P.regen || 0) - 1.5 * v; }, 1)],
          cap: N('T_capD2', '奧義・滴血重生', 5, '生命越低越會回：每少 1% 生命，吸血系數 +0.2%、恢復量 +0.1%；點滿＝+1%、+0.5%', (P, v) => { P.ttBleed = v / 5; if (v >= 5) capOn(P, 'D2'); }) }
      ] }
  ];
  const XP = N('T_xp', '歷練', 999, '傷害 +0.5%、生命 +0.5%', (P, v) => { P.dmgMult *= 1 + 0.005 * v; P.hpMax = Math.round(P.hpMax * (1 + 0.005 * v)); });
  const NEED_PATH = 8, NEED_SUB = 10, NEED_CAP = 8;
  const ALL = ROOT.concat(...PATHS.map(p => p.nodes.concat(...p.subs.map(s => s.nodes.concat([s.cap]))))).concat([XP]);
  const BY = {}; ALL.forEach(n => { BY[n.id] = n; });
  // 給 charsheet.js 看的（[id, 名字, 階, 最多, 說明]）
  R.TALENTS = ALL.map(n => [n.id, n.n, 0, n.mx, n.d]);

  const stOf = cls => S().classes[cls || S().cls];
  const tt = st => { st.sp = st.sp || { r: {}, t: {} }; st.sp.t = st.sp.t || {}; return st.sp.t; };
  // 舊的天賦退回來
  const mig = st => {
    const t = tt(st); if (st.sp.tree === 3) return t;
    const old = Object.keys(t).filter(k => t[k] > 0), n = old.reduce((a, k) => a + t[k], 0);   // 2026-10-05 四條道：全部退回一次
    old.forEach(k => delete t[k]); st.sp.tree = 3;
    if (n) setTimeout(() => R.toast && R.toast('天賦樹改成四條道（攻擊、防禦、魔法、恢復）：原本的 ' + n + ' 點全部退回來，可以重新點。', '#E8C04A'), 1500);
    return t;
  };
  const sum = (t, list) => list.reduce((a, n) => a + (t[n.id] || 0), 0);
  const pathPts = (t, p) => sum(t, p.nodes) + p.subs.reduce((a, s) => a + sum(t, s.nodes.concat([s.cap])), 0);
  const subPts = (t, s) => sum(t, s.nodes.concat([s.cap]));
  const CAPS = [].concat(...PATHS.map(p => p.subs.map(s => s.cap)));
  const capsOf = t => CAPS.filter(c => (t[c.id] || 0) > 0);   // 學了的奧義
  const slotsOf = t => 1 + (t.T_slot2 ? 1 : 0);   // 奧義的格數：花 10 點多一格
  const capOf = t => capsOf(t)[0] || null;
  // 這個節點能不能點：回傳 '' 或擋住的原因
  const why = (t, id) => {
    const n = BY[id]; if (!n) return '沒有這個天賦';
    if ((t[id] || 0) >= n.mx) return '滿級';
    if (ROOT.includes(n)) return '';
    const root = sum(t, ROOT);
    if (n === XP) return capsOf(t).some(c => (t[c.id] || 0) >= c.mx) ? '' : '先把一個奧義點滿';
    const p = PATHS.find(x => x.nodes.includes(n) || x.subs.some(s => s.nodes.includes(n) || s.cap === n));
    if (root < NEED_PATH) return '根基要先投 ' + NEED_PATH + ' 點';
    if (p.nodes.includes(n)) return '';
    const s = p.subs.find(x => x.nodes.includes(n) || x.cap === n);
    if (sum(t, p.nodes) < NEED_SUB) return '「' + p.n + '」要先投 ' + NEED_SUB + ' 點';
    if (s.cap !== n) return '';
    if (sum(t, s.nodes) < NEED_CAP) return '「' + s.n + '」要先投 ' + NEED_CAP + ' 點';
    const cs = capsOf(t); if (!cs.includes(n) && cs.length >= slotsOf(t)) return '已經學了「' + cs.map(c => c.n).join('」「') + '」（奧義只能學 ' + slotsOf(t) + ' 個' + (slotsOf(t) < 2 ? '；可以花 10 點多開一格' : '') + '）';
    return '';
  };
  R.talentWhy = (id, cls) => why(mig(stOf(cls)), id);
  // 給 talentui.js（新的技能點畫面）用：樹的結構、現在幾級、點一下
  R.TALENT_TREE = { ROOT, PATHS, XP, NEED_PATH, NEED_SUB, NEED_CAP };
  R.talentLv = (id, cls) => mig(stOf(cls))[id] || 0;
  R.talentSlots = cls => slotsOf(mig(stOf(cls)));
  R.talentBuySlot = cls => { const st = stOf(cls), t = mig(st); if (t.T_slot2 || R.spFree(st) < 10) return false; t.T_slot2 = 10; R.save && R.save(); return true; };
  R.talentAdd = (id, cls) => { const st = stOf(cls), t = mig(st); if (R.spFree(st) < 1 || why(t, id)) return false; t[id] = (t[id] || 0) + 1; R.save && R.save(); return true; };

  // ---------- 效果 ----------
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    try { if (S()) mig(stOf(cls)); } catch (e) { }
    const P = cp0(cls);
    try { const s = S(); if (s) { const t = mig(stOf(cls)); ALL.forEach(n => { const v = t[n.id] || 0; if (v) n.f(P, v); }); } } catch (e) { console.warn('[talenttree]', e); }
    return P;
  };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const P = W().P; return hp0(P && P.ttGuard ? raw * (1 - Math.min(0.5, P.ttGuard)) : raw, src, o); };
  // 普攻的傷害（專精：普攻 −）
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { const P = W().P; return he0(e, P && P.ttPrimary && o && o.primary ? raw * (1 - Math.min(0.6, P.ttPrimary)) : raw, o); };
  const st0 = R.step;
  R.step = dt => { const r = st0(dt); const P = W().P; if (P && P.ttLowRegen && !P.dead && P.hp > 0 && P.hp < P.hpMax * 0.3) R.healP(P.hpMax * P.ttLowRegen * dt * (R.regenMul ? R.regenMul(P) : 1), true); return r; };
  // 技能書的技能（skillbook.js 的「型」）：傷害照 P.ttSkill 加
  const TY = R.SKILL_TYPES; let depth = 0;
  if (TY) Object.keys(TY).forEach(k => { const f = TY[k]; TY[k] = (s, P, w, pw) => { const m = !depth && P && P.ttSkill ? 1 + P.ttSkill : 1; depth++; try { return f(s, P, w, pw * m); } finally { depth--; } }; });

  // ---------- 畫面：把 skillpoints.js 的天賦那一段換成樹 ----------
  const nodeHtml = (t, n, col) => {
    const v = t[n.id] || 0, w = why(t, n.id), full = v >= n.mx, free = R.spFree(stOf()) > 0;
    return '<div class="tt-node' + (v ? ' on' : '') + (w && !full ? ' lock' : '') + '" style="--tc:' + (col || '#C8C0B0') + '"><b>' + esc(n.n) + '</b><span>' + (n.mx > 99 ? v : v + '／' + n.mx) + '</span><small>每級 ' + esc(n.d) + '</small>'
      + (full ? '<em>滿級</em>' : w ? '<em class="why">' + esc(w) + '</em>' : '<button type="button" class="mini gold" data-ttp="' + n.id + '"' + (free ? '' : ' disabled') + '>+1</button>') + '</div>';
  };
  const treeHtml = st => {
    const t = mig(st), c0 = capOf(t), root = sum(t, ROOT);
    return '<h3>天賦樹（投了 ' + Object.values(t).reduce((a, v) => a + v, 0) + ' 點）</h3>'
      + '<p class="note">根基投滿 ' + NEED_PATH + ' 點以後開四條道；一條道投滿 ' + NEED_SUB + ' 點以後開它的兩個分支；分支投滿 ' + NEED_CAP + ' 點開它的奧義。道和分支都可以點好幾條，<b>奧義只能學一個</b>（技能點畫面右上角可以花 10 點多開一格；學了別的就鎖起來；要換到公會的武器登記那裡重新分配）。一條路走到底要 45 點；奧義點滿以後，多的點數也可以放進「歷練」。</p>'
      + '<div class="tt-tree"><div class="tt-root"><div class="tt-h">根基<small>' + root + '／15</small></div><div class="tt-row">' + ROOT.map(n => nodeHtml(t, n)).join('') + '</div></div>'
      + '<div class="tt-paths">' + PATHS.map(p => {
        return '<div class="tt-path' + (pathPts(t, p) ? ' pick' : '') + '" style="--tc:' + p.c + '"><div class="tt-h">' + esc(p.n) + '<small>' + esc(p.d) + '</small></div>'
          + p.nodes.map(n => nodeHtml(t, n, p.c)).join('')
          + '<div class="tt-subs">' + p.subs.map(s => '<div class="tt-sub' + (subPts(t, s) ? ' pick' : '') + '"><div class="tt-h sm">' + esc(s.n) + '<small>' + esc(s.d) + '</small></div>' + s.nodes.map(n => nodeHtml(t, n, p.c)).join('') + '<div class="tt-cap' + (c0 && c0 !== s.cap ? ' off' : '') + '">' + nodeHtml(t, s.cap, p.c) + '</div></div>').join('') + '</div></div>';
      }).join('') + '</div>'
      + '<div class="tt-root">' + nodeHtml(t, XP, '#E8C04A') + '</div></div>';
  };
  const mount = where => {
    const host = where === 'hub' ? $('hub-sheet') : $('sp-host'); if (!host) return;
    const h3 = [...host.querySelectorAll('h3')].find(h => h.textContent.indexOf('天賦') === 0), cb = host.querySelector('[data-close]'), row = cb && cb.closest('.row'); if (!h3) return;
    let n = h3; while (n && n !== row) { const nx = n.nextElementSibling; n.remove(); n = nx; }
    const box = document.createElement('div'); box.innerHTML = treeHtml(stOf()); (row ? row.parentNode.insertBefore(box, row) : host.appendChild(box));
    const st = stOf(), t = tt(st);
    box.querySelectorAll('[data-ttp]').forEach(b => { b.onclick = () => { const id = b.dataset.ttp; if (R.spFree(st) < 1 || why(t, id)) return; t[id] = (t[id] || 0) + 1; R.save && R.save(); R.skillPoints(where, true); }; });
    const rs = host.querySelector('[data-sprs]'); if (rs) { const f0 = rs.onclick; rs.onclick = () => { f0 && f0(); R.skillPoints(where, true); }; }
  };
  const sp0 = R.skillPoints;
  // keep：點了 +1 重畫的時候留在原本捲到的地方（2026-10-04 作者：每按一次都會回到頁面最上面，有點煩）；從選單打開的時候照舊從最上面開始
  const scrolls = () => [$('hub-sheet'), $('hub-modal'), $('r-sheet'), $('r-modal'), document.scrollingElement].filter(Boolean).map(el => [el, el.scrollTop]);
  R.skillPoints = (where, keep) => { const sc = keep && scrolls(), r = sp0(where); try { mount(where === 'hub' ? 'hub' : 'town'); } catch (e) { console.warn('[talenttree]', e); } if (sc) sc.forEach(([el, y]) => { el.scrollTop = y; }); return r; };

  const css = document.createElement('style');
  css.textContent = [
    '.tt-tree{display:grid;gap:10px;margin:6px 0 10px}',
    '.tt-h{font-family:var(--serif);font-weight:700;font-size:15px;color:var(--tc,var(--gold));margin-bottom:4px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.tt-h small{font-family:inherit;font-weight:400;font-size:11.5px;color:var(--dim)}.tt-h.sm{font-size:13.5px}',
    '.tt-root{background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:8px}',
    '.tt-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px}',
    '.tt-paths{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;position:relative}',
    '.tt-path{display:grid;gap:5px;align-content:start;background:var(--bg2);border:1px solid var(--line);border-top:3px solid var(--tc);border-radius:10px;padding:8px}',
    '.tt-path.pick{box-shadow:0 0 0 1px var(--tc),0 0 14px -4px var(--tc)}',
    '.tt-path.off,.tt-sub.off,.tt-cap.off{opacity:.38;filter:grayscale(.7)}',
    '.tt-subs{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:6px;margin-top:4px;padding-top:6px;border-top:1px dashed var(--line)}',
    '.tt-sub{display:grid;gap:5px;align-content:start;border:1px solid var(--line);border-radius:8px;padding:6px}.tt-sub.pick{border-color:var(--tc)}',
    '.tt-node{display:grid;grid-template-columns:1fr auto;gap:1px 6px;align-items:center;background:rgba(255,255,255,.03);border:1px solid var(--line);border-left:3px solid #4A4450;border-radius:7px;padding:5px 7px;font-size:12.5px}',
    '.tt-node.on{border-left-color:var(--tc);background:color-mix(in srgb,var(--tc) 10%,transparent)}',
    '.tt-node b{font-weight:700}.tt-node span{font-weight:700;color:var(--tc)}.tt-node small{grid-column:1/-1;color:var(--dim);font-size:11px}',
    '.tt-node em{grid-column:1/-1;font-style:normal;font-size:10.5px;color:#C8B88A}.tt-node em.why{color:#8A8090}',
    '.tt-node .mini{grid-column:1/-1;justify-self:start;margin-top:2px}',
    '.tt-node.lock{opacity:.7}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
