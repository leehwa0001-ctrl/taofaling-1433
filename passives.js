// 討伐令 1433：職業的被動技能（作者：每個職業都有被動，可以習得、可以更換）
// - 每個基本職業八種專屬被動：職業等級到了自動學會。八種共通被動：到公會的訓練場花費拉學（每個存檔學一次，所有職業都能用）。
// - 被動欄：職業等級 1 一格、5 兩格、10 三格、16 四格。城裡（暫停選單、公會）可以換，進了遺跡就不能換。
// - 上位職業原本的被動照舊（combat.js），另外算。
// 效果：數值的在 R.calcPlayer 套上；擊倒、命中、受傷、翻滾、治療的在各自的函式包一層。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const SLOT_LV = [1, 5, 10, 16];
  const D = (id, cls, lv, name, desc, fx, cost) => ({ id, cls, lv, name, desc, fx, cost });
  const LIST = [
    D('gu1', 'gunner', 1, '快速裝填', '換彈快 25%。', { reload: 0.25 }), D('gu2', 'gunner', 3, '擴充彈匣', '彈匣多 30%。', { mag: 0.3 }), D('gu3', 'gunner', 5, '穩定射擊', '暴擊率 +8%。', { crit: 0.08 }), D('gu4', 'gunner', 7, '連射', '攻速 +12%。', { rate: 0.12 }),
    D('gu5', 'gunner', 9, '精準要害', '暴擊傷害 +30%。', { critMult: 0.3 }), D('gu6', 'gunner', 12, '狙擊本能', '8 公尺外的目標傷害 +20%。', { far: 0.2 }), D('gu7', 'gunner', 15, '彈殼回收', '擊倒遺跡生物，彈匣立刻補 3 發。', { killAmmo: 3 }), D('gu8', 'gunner', 18, '背水射擊', '生命低於三成時傷害 +30%。', { low: 0.3 }),
    D('ar1', 'archer', 1, '鷹眼', '射程 +20%、暴擊率 +4%。', { range: 0.2, crit: 0.04 }), D('ar2', 'archer', 3, '速射', '攻速 +14%。', { rate: 0.14 }), D('ar3', 'archer', 5, '輕裝', '翻滾冷卻 −20%。', { dodge: 0.2 }), D('ar4', 'archer', 7, '狩獵本能', '8 公尺外的目標傷害 +20%。', { far: 0.2 }),
    D('ar5', 'archer', 9, '麻痺箭', '18% 機率讓目標變慢。', { slow: 0.18 }), D('ar6', 'archer', 12, '貫穿', '箭多穿過一隻；遠程傷害 +6%。', { pierce: 1, ranged: 0.06 }), D('ar7', 'archer', 15, '獵人的耐心', '翻滾後 1.5 秒內的下一擊 +40%。', { dodgeHit: 0.4 }), D('ar8', 'archer', 18, '風之加護', '移動 +10%。', { speed: 0.1 }),
    D('wa1', 'warrior', 1, '重擊', '近戰傷害 +12%。', { melee: 0.12 }), D('wa2', 'warrior', 3, '鐵骨', '防禦 +4。', { def: 4 }), D('wa3', 'warrior', 5, '旋風', '揮砍的範圍 +25%。', { arc: 0.25 }), D('wa4', 'warrior', 7, '戰吼', '擊倒遺跡生物後 3 秒內傷害 +20%。', { rage: 0.2 }),
    D('wa5', 'warrior', 9, '嗜戰', '造成傷害的 4% 回復成生命。', { leech: 0.04 }), D('wa6', 'warrior', 12, '背水', '生命低於三成時傷害 +35%。', { low: 0.35 }), D('wa7', 'warrior', 15, '巨力', '近戰傷害 +10%；8% 機率把目標打暈。', { melee: 0.1, stun: 0.08 }), D('wa8', 'warrior', 18, '不屈', '每一層一次：受到致命傷時留下 1 點生命。', { last: 1 }),
    D('ma1', 'mage', 1, '法力增幅', '法術傷害 +12%。', { magic: 0.12 }), D('ma2', 'mage', 3, '冥想', '魔力 +30%。', { mp: 0.3 }), D('ma3', 'mage', 5, '爆裂', '法彈爆炸範圍 +30%。', { splash: 0.3 }), D('ma4', 'mage', 7, '法術迴響', '技能冷卻 −15%。', { skillCd: 0.15 }),
    D('ma5', 'mage', 9, '寒冰', '20% 機率讓目標變慢。', { slow: 0.2 }), D('ma6', 'mage', 12, '魔力轉換', '擊倒遺跡生物回復 8 點魔力。', { killMp: 8 }), D('ma7', 'mage', 15, '灼熱', '15% 機率讓目標燃燒。', { burn: 0.15 }), D('ma8', 'mage', 18, '秘法精通', '法術傷害 +10%、暴擊率 +6%。', { magic: 0.1, crit: 0.06 }),
    D('pr1', 'priest', 1, '神恩', '治療效果 +25%。', { heal: 0.25 }), D('pr2', 'priest', 3, '庇護', '防禦 +3、生命 +8%。', { def: 3, hp: 0.08 }), D('pr3', 'priest', 5, '祈禱', '每秒回復生命 0.8。', { regen: 0.8 }), D('pr4', 'priest', 7, '堅信', '佩特拉的注意 −15%。', { calm: 0.15 }),
    D('pr5', 'priest', 9, '懲戒', '12% 機率把目標打暈。', { stun: 0.12 }), D('pr6', 'priest', 12, '聖光', '傷害 +10%。', { dmg: 0.1 }), D('pr7', 'priest', 15, '生命之泉', '擊倒遺跡生物回復 3% 生命。', { killHeal: 0.03 }), D('pr8', 'priest', 18, '殉道', '每一層一次：受到致命傷時留下 1 點生命。', { last: 1 }),
    D('bl1', 'blade', 1, '疾風', '移動 +8%。', { speed: 0.08 }), D('bl2', 'blade', 3, '見切', '翻滾冷卻 −25%。', { dodge: 0.25 }), D('bl3', 'blade', 5, '一閃', '暴擊率 +10%。', { crit: 0.1 }), D('bl4', 'blade', 7, '殘心', '翻滾後 1.5 秒內的下一擊 +50%。', { dodgeHit: 0.5 }),
    D('bl5', 'blade', 9, '連斬', '攻速 +12%。', { rate: 0.12 }), D('bl6', 'blade', 12, '斬鐵', '暴擊傷害 +35%。', { critMult: 0.35 }), D('bl7', 'blade', 15, '血祭', '擊倒遺跡生物回復 2.5% 生命，3 秒內傷害 +15%。', { killHeal: 0.025, rage: 0.15 }), D('bl8', 'blade', 18, '無我', '生命低於三成時傷害 +30%；翻滾冷卻 −10%。', { low: 0.3, dodge: 0.1 }),
    D('kn1', 'knight', 1, '堅守', '防禦 +5。', { def: 5 }), D('kn2', 'knight', 3, '重裝', '生命 +15%，移動 −4%。', { hp: 0.15, speed: -0.04 }), D('kn3', 'knight', 5, '荊棘', '被打的時候，把 20% 的傷害還給打你的生物。', { thorns: 0.2 }), D('kn4', 'knight', 7, '衝鋒號令', '技能冷卻 −15%。', { skillCd: 0.15 }),
    D('kn5', 'knight', 9, '盾擊', '10% 機率把目標打暈。', { stun: 0.1 }), D('kn6', 'knight', 12, '鋼鐵意志', '佩特拉的注意 −10%、防禦 +3。', { calm: 0.1, def: 3 }), D('kn7', 'knight', 15, '守護', '每秒回復生命 0.6、生命 +8%。', { regen: 0.6, hp: 0.08 }), D('kn8', 'knight', 18, '不倒', '每一層一次：受到致命傷時留下 1 點生命。', { last: 1 }),
    D('co1', '*', 1, '強韌', '生命 +10%。', { hp: 0.1 }, 200), D('co2', '*', 1, '輕足', '移動 +6%。', { speed: 0.06 }, 200), D('co3', '*', 1, '魔力湧泉', '魔力 +20%。', { mp: 0.2 }, 200), D('co4', '*', 1, '鐵壁', '防禦 +3。', { def: 3 }, 250),
    D('co5', '*', 1, '專注', '技能冷卻 −10%。', { skillCd: 0.1 }, 300), D('co6', '*', 1, '屏息', '佩特拉的注意 −12%。', { calm: 0.12 }, 300), D('co7', '*', 1, '嗜血', '擊倒遺跡生物回復 2.5% 生命。', { killHeal: 0.025 }, 400), D('co8', '*', 1, '背水之陣', '生命低於三成時傷害 +20%。', { low: 0.2 }, 400)
  ];
  const BY = {}; LIST.forEach(p => { BY[p.id] = p; });
  R.PASSIVES = BY;

  // ---------- 學會、裝上 ----------
  const st = cls => R.S.classes[cls];
  const slots = cls => SLOT_LV.filter(l => (st(cls) ? st(cls).lv : 1) >= l).length;
  const learned = (cls, id) => { const p = BY[id], S = R.S; if (!p) return false; if (p.cls === '*') return (S.pvBought || []).includes(id); return p.cls === cls && (st(cls) ? st(cls).lv : 1) >= p.lv; };
  R.passivesOf = cls => {
    const S = R.S; S.pvEquip = S.pvEquip || {};
    let eq = (S.pvEquip[cls] || []).filter(id => learned(cls, id)).slice(0, slots(cls));
    if (!S.pvEquip[cls]) { const first = LIST.find(p => p.cls === cls && learned(cls, p.id)); eq = first ? [first.id] : []; S.pvEquip[cls] = eq; }
    return eq;
  };
  const merged = cls => { const fx = {}; R.passivesOf(cls).forEach(id => { const f = BY[id].fx; Object.keys(f).forEach(k => { fx[k] = (fx[k] || 0) + f[k]; }); }); return fx; };

  // ---------- 數值 ----------
  const cp = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp(cls); if (!R.S) return P;
    const f = merged(cls), ws = P.ws || {}, k = ws.kind;
    if (f.hp) P.hpMax = Math.round(P.hpMax * (1 + f.hp)); if (f.mp) P.mpMax = Math.round(P.mpMax * (1 + f.mp)); if (f.def) P.def += f.def; if (f.speed) P.speed *= 1 + f.speed; if (f.dmg) P.dmgMult *= 1 + f.dmg;
    if (f.melee && (k === 'melee' || k === 'thrust')) ws.dmg *= 1 + f.melee; if (f.magic && k === 'magic') ws.dmg *= 1 + f.magic; if (f.ranged && (k === 'gun' || k === 'bow')) ws.dmg *= 1 + f.ranged;
    if (f.crit) ws.crit = (ws.crit || 0) + f.crit; if (f.critMult) P.critMult += f.critMult; if (f.rate && ws.rate) ws.rate *= 1 + f.rate;
    if (f.reload && ws.reload) ws.reload *= 1 - f.reload; if (f.mag && ws.mag) ws.mag = Math.round(ws.mag * (1 + f.mag)); if (f.range && ws.range) ws.range *= 1 + f.range;
    if (f.arc && ws.arc) ws.arc *= 1 + f.arc; if (f.splash && ws.splash) ws.splash *= 1 + f.splash; if (f.pierce && ws.pierce) ws.pierce += f.pierce;
    if (f.dodge) P.dodgeCdMax *= 1 - f.dodge; if (f.skillCd) P.skillCdMult *= 1 - f.skillCd; if (f.regen) P.regen = (P.regen || 0) + f.regen; if (f.calm) P.calm = (P.calm || 0) + f.calm;
    P.pv = f;
    return P;
  };

  // ---------- 命中、擊倒、受傷、翻滾、治療 ----------
  const he = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P, f = P && P.pv; o = o || {};
    if (f && e && !e.dead) {
      if (f.low && P.hp < P.hpMax * 0.3) raw *= 1 + f.low;
      if (f.far && Math.hypot(e.x - P.x, e.z - P.z) > 8) raw *= 1 + f.far;
      if (f.rage && P.pvRage > 0) raw *= 1 + f.rage;
      if (f.dodgeHit && P.pvDodge > 0 && o.primary) { raw *= 1 + f.dodgeHit; P.pvDodge = 0; }
    }
    const d = he(e, raw, o);
    if (f && d > 0 && e) {
      if (f.leech) R.healP(d * f.leech, true);
      if (o.primary && !e.dead && e.st) { if (f.slow && Math.random() < f.slow) e.st.slow = Math.max(e.st.slow, 2); if (f.stun && Math.random() < f.stun) e.st.stun = Math.max(e.st.stun, 0.8); if (f.burn && Math.random() < f.burn) e.st.burn = Math.max(e.st.burn, 3); }
    }
    return d;
  };
  const ke = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke(e, by), P = W().P, f = P && P.pv;
    if (was && e.dead && f && !(by && by.rival)) {
      if (f.killHeal) R.healP(P.hpMax * f.killHeal, true);
      if (f.killMp) P.mp = Math.min(P.mpMax, P.mp + f.killMp);
      if (f.killAmmo && P.ws && P.ws.mag) P.ammo = Math.min(P.ws.mag, (P.ammo || 0) + f.killAmmo);
      if (f.rage) P.pvRage = 3;
    }
    return r;
  };
  const hp = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const P = W().P, f = P && P.pv;
    if (f && f.last && !P.pvLast && raw >= P.hp && P.hp > 1 && !(P.iframe > 0)) { raw = P.hp - 1; P.pvLast = 1; R.banner('不屈！', '留下了最後一口氣（這一層不會再有第二次）'); }
    const r = hp(raw, src, o);
    if (f && f.thorns && src && src.def && !src.dead && raw > 0) he(src, raw * f.thorns, { thorns: 1 });
    return r;
  };
  const hl = R.healP;
  if (hl) R.healP = (v, quiet) => { const P = W().P, f = P && P.pv; return hl(f && f.heal ? v * (1 + f.heal) : v, quiet); };
  const dg = R.dodge;
  if (dg) R.dodge = (...a) => { const P = W().P, c0 = P && P.dodgeCd; const r = dg(...a); if (P && P.dodgeCd > (c0 || 0)) P.pvDodge = 1.5; return r; };
  const step0 = R.step;
  if (step0) R.step = dt => { step0(dt); const P = W().P; if (P) { if (P.pvRage > 0) P.pvRage -= dt; if (P.pvDodge > 0) P.pvDodge -= dt; } };
  // 換樓層：不屈又可以用一次
  const lf = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf(f, o), P = W().P; if (P) P.pvLast = 0; return r; };

  // ---------- 升級：學會新的被動 ----------
  const gx = R.gainXp;
  R.gainXp = v => {
    const S = R.S, cls = S.cls, s = st(cls), lv0 = s.lv; gx(v);
    if (s.lv === lv0) return;
    const got = LIST.filter(p => p.cls === cls && p.lv > lv0 && p.lv <= s.lv), slot = SLOT_LV.some(l => l > lv0 && l <= s.lv);
    if (got.length || slot) setTimeout(() => R.banner(got.length ? '學會新的被動：' + got.map(p => p.name).join('、') : '被動欄多了一格', '回到城裡，在暫停選單或公會的「被動技能」換上去'), 5200);
  };

  // ---------- 被動技能的畫面 ----------
  const sheet = (host, where, close) => {
    const S = R.S, cls = S.cls, s = st(cls), eq = R.passivesOf(cls), n = slots(cls), atGuild = where === 'hub';
    const mine = LIST.filter(p => p.cls === cls), common = LIST.filter(p => p.cls === '*');
    const card = p => {
      const ok = learned(cls, p.id), on = eq.includes(p.id);
      const btn = ok ? '<button type="button" class="btn' + (on ? '' : ' pri') + '" data-pv="' + p.id + '"' + (!on && eq.length >= n ? ' disabled' : '') + '>' + (on ? '卸下' : '裝上') + '</button>'
        : p.cls === '*' ? '<button type="button" class="btn" data-learn="' + p.id + '"' + (!atGuild || S.gold < p.cost ? ' disabled' : '') + '>學（' + p.cost + ' 費拉）</button>' : '<span class="note">職業等級 ' + p.lv + ' 學會</span>';
      return '<div class="recipe pv-card' + (on ? ' on' : '') + (ok ? '' : ' lock') + '"><b>' + esc(p.name) + '</b><small>' + esc(p.desc) + '</small>' + btn + '</div>';
    };
    host.innerHTML = '<h2>被動技能・' + esc(R.clsName(cls)) + ' Lv ' + s.lv + '</h2><p class="note">被動欄 ' + eq.length + '／' + n + '（職業等級 ' + SLOT_LV.join('、') + ' 各開一格）。職業的被動照等級自動學會；共通的被動要在公會的訓練場花錢學，學一次每個職業都能用。進了遺跡就不能換。</p>'
      + '<div class="row pv-slots">' + SLOT_LV.map((l, i) => '<span class="chip' + (eq[i] ? ' on' : '') + '">' + (i < n ? (eq[i] ? esc(BY[eq[i]].name) : '（空）') : 'Lv ' + l) + '</span>').join('') + '</div>'
      + '<h3>' + esc(R.CLASSES[cls].name) + '的被動</h3><div class="recipes">' + mine.map(card).join('') + '</div>'
      + '<h3>共通的被動' + (atGuild ? '（公會的訓練場）' : '（到公會的訓練場學）') + '</h3><div class="recipes">' + common.map(card).join('') + '</div>'
      + '<div class="row"><button type="button" class="btn pri" data-close="1">好了</button></div>';
    host.querySelectorAll('[data-pv]').forEach(b => { b.onclick = () => { const id = b.dataset.pv, cur = R.passivesOf(cls).slice(), i = cur.indexOf(id); if (i >= 0) cur.splice(i, 1); else if (cur.length < n) cur.push(id); S.pvEquip[cls] = cur; R.save(); sheet(host, where, close); }; });
    host.querySelectorAll('[data-learn]').forEach(b => { b.onclick = () => { const p = BY[b.dataset.learn]; if (!atGuild || S.gold < p.cost) return; S.gold -= p.cost; S.pvBought = (S.pvBought || []).concat(p.id); R.save(); if (R.say) R.say('學會了「' + p.name + '」'); sheet(host, where, close); }; });
    host.querySelector('[data-close]').onclick = close;
  };
  R.passiveSheet = where => {
    if (W().run) { R.toast('遺跡裡不能換被動。'); return; }
    if (where === 'hub') { const host = $('hub-sheet'), el = $('hub-modal'); el.hidden = false; sheet(host, 'hub', () => { el.hidden = true; R.hub(); }); host.scrollTop = 0; return; }
    R.sheet('<div id="pv-host"></div>'); sheet($('pv-host'), 'town', () => R.closeSheet());
  };
  // 城裡的暫停選單、公會的武器登記：多一個按鈕
  const tm0 = R.townMenu;
  if (tm0) R.townMenu = (...a) => { const r = tm0(...a); const row = document.querySelector('#r-sheet .row'); if (row && !row.querySelector('#pv-open')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'pv-open'; b.textContent = '被動技能'; b.onclick = () => R.passiveSheet('town'); row.insertBefore(b, row.children[2] || null); } return r; };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'); if (!body) return;
    const h = [...body.querySelectorAll('h3')].find(e => e.textContent === '武器登記'); if (!h) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn pri'; b.textContent = '被動技能：訓練場（' + R.clsName(R.S.cls) + '）'; b.onclick = () => R.passiveSheet('hub');
    const p = document.createElement('div'); p.className = 'row'; p.appendChild(b); h.after(p);
  };
})(window.R);
