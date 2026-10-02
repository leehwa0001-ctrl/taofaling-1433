// 力量與裝備的需求、新的護具（作者 2026-10-03：牧師力量太低的時候，可能就沒辦法裝備鐵頭盔之類的重型裝備；裝備可以多樣化一點）
// - 力量 R.strOf(cls)＝職業的底（騎士 9、戰士 8、刀客 5、槍手 4、弓箭手 4、牧師 3、術士 2）＋種族（巨人 +3；黑石、金龍、龍人、熔岩 +2；
//   狼人、樹人、沙人、魔族 +1；精靈、翼人 −1；混血減半）＋職業等級每 5 級 +1＋力量的鍛鍊（prof.js）。
// - 護具要的力量：重裝 頭 6、上衣 8、褲 7、鞋 5；中裝 頭 3、上衣 5、褲 4、鞋 3；輕裝不用。新的護具各自寫。
// - 力量不夠：倉庫裡穿不上（寫要多少）；已經穿在身上的（舊存檔）照樣穿著，但每一件移動 −8%、攻速 −8%（作者選的）。
// - 新的護具（八種，寶箱會掉、鐵匠鋪做得出來；圖示借同一個部位、同一種重量的）：
//   法冠（輕・魔力 +15%）、角盔（重・被擊退、踉蹌的時間減半）、法袍（輕・技能冷卻 −8%）、獵裝（輕・遠程傷害 +8%）、
//   武者胴（中・近戰傷害 +6%）、綁腿（輕・移動 +3%）、疾風靴（輕・翻滾冷卻 −10%）、重踏靴（重・生命 +5%）。
// 放在 classbal.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const BASE_STR = { knight: 9, warrior: 8, blade: 5, gunner: 4, archer: 4, priest: 3, mage: 2 };
  const RACE_STR = { 巨人族: 3, 黑石族: 2, 金龍人族: 2, 龍人族: 2, 熔岩人族: 2, 狼人族: 1, 樹人族: 1, 沙人族: 1, 魔族: 1, 精靈族: -1, 翼人族: -1 };
  const NEED = { heavy: { head: 6, body: 8, legs: 7, feet: 5 }, medium: { head: 3, body: 5, legs: 4, feet: 3 } };

  // ---------- 新的護具 ----------
  Object.assign(R.ARMOR, {
    head_mitre: { slot: 'head', w: 'light', name: '法冠', def: 0.5, spd: 0, icon: 'head_light', fx: { mp: 0.15 }, note: '魔力 +15%' },
    head_horn: { slot: 'head', w: 'heavy', name: '角盔', def: 1.8, spd: -0.01, icon: 'head_heavy', fx: { stagger: 0.5 }, note: '被擊退、踉蹌的時間減半' },
    body_robe: { slot: 'body', w: 'light', name: '法袍', def: 1.1, spd: 0, icon: 'body_light', fx: { skillCd: 0.08 }, note: '技能冷卻 −8%' },
    body_hunt: { slot: 'body', w: 'light', name: '獵裝', def: 1.4, spd: 0, icon: 'body_light', fx: { ranged: 0.08 }, note: '遠程傷害 +8%' },
    body_dou: { slot: 'body', w: 'medium', name: '武者胴', def: 2.6, spd: -0.01, icon: 'body_medium', fx: { melee: 0.06 }, note: '近戰傷害 +6%', str: 4 },
    legs_wrap: { slot: 'legs', w: 'light', name: '綁腿', def: 0.7, spd: 0.03, icon: 'legs_light', note: '移動 +3%' },
    feet_gale: { slot: 'feet', w: 'light', name: '疾風靴', def: 0.4, spd: 0.02, icon: 'feet_light', fx: { dodge: 0.1 }, note: '翻滾冷卻 −10%' },
    feet_tread: { slot: 'feet', w: 'heavy', name: '重踏靴', def: 1.6, spd: -0.02, icon: 'feet_heavy', fx: { hp: 0.05 }, note: '生命 +5%' }
  });
  // 圖示：借同一個部位、同一種重量的
  const icon0 = R.itemIconURL;
  R.itemIconURL = (it, k) => { const a = it && it.kind === 'armor' && R.ARMOR[it.base]; return icon0(a && a.icon ? Object.assign({}, it, { base: a.icon }) : it, k); };

  // ---------- 力量 ----------
  const raceStr = () => { const r = R.raceOf && R.raceOf(); if (!r) return 0; const half = r.name.indexOf('混血') >= 0, v = RACE_STR[r.name.replace(/（混血）/, '')] || 0; return half ? (v > 0 ? Math.ceil(v / 2) : Math.trunc(v / 2)) : v; };
  R.strOf = cls => { const s = S(); cls = cls || s.cls; const st = s.classes[cls] || { lv: 1 }; return (BASE_STR[cls] || 4) + raceStr() + Math.floor(st.lv / 5) + (R.profLv && R.profLv.str ? R.profLv.str() : 0); };
  R.strNeed = it => { if (!it || it.kind !== 'armor') return 0; const a = R.ARMOR[it.base]; if (!a) return 0; return a.str != null ? a.str : (NEED[a.w] || {})[a.slot] || 0; };
  const tooHeavy = (it, cls) => R.strNeed(it) > R.strOf(cls);
  // 穿不上：力量不夠
  const cu0 = R.canUse;
  R.canUse = (it, cls) => cu0(it, cls) && !(it && it.kind === 'armor' && tooHeavy(it, cls));
  // 說明多一行：特性、要的力量
  const il0 = R.itemLines;
  R.itemLines = it => {
    const L = il0(it); if (!it || it.kind !== 'armor') return L;
    const a = R.ARMOR[it.base], need = R.strNeed(it);
    if (a && a.note) L.push(a.note);
    if (need) L.push('需要力量 ' + need + (S() ? '（你有 ' + R.strOf() + '）' : ''));
    return L;
  };

  // ---------- 數值：新護具的特性、太重的拖累 ----------
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const eq = R.equipped(cls); let heavy = 0; const fx = {};
      R.SLOTS.forEach(sl => { const it = eq[sl.id]; if (!it || it.kind !== 'armor') return; const a = R.ARMOR[it.base]; if (a && a.fx) Object.keys(a.fx).forEach(k => { fx[k] = (fx[k] || 0) + a.fx[k]; }); if (tooHeavy(it, cls)) heavy++; });
      const k = P.ws && P.ws.kind;
      if (fx.mp) P.mpMax = Math.round(P.mpMax * (1 + fx.mp)); if (fx.hp) P.hpMax = Math.round(P.hpMax * (1 + fx.hp));
      if (fx.skillCd) P.skillCdMult *= 1 - fx.skillCd; if (fx.dodge) P.dodgeCdMax *= 1 - fx.dodge;
      if (fx.ranged && (k === 'gun' || k === 'bow')) P.ws.dmg *= 1 + fx.ranged;
      if (fx.melee && (k === 'melee' || k === 'thrust')) P.ws.dmg *= 1 + fx.melee;
      P.stagger = fx.stagger || 0;
      P.str = R.strOf(cls); P.tooHeavy = heavy;
      if (heavy) { P.speed *= Math.pow(0.92, heavy); if (P.ws) P.ws.rate *= Math.pow(0.92, heavy); }
    } catch (e) { }
    return P;
  };
  // 角盔：被擊退、踉蹌的時間減半
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const P = W().P, k0 = P ? P.knockT : 0, s0 = P ? P.stumble : 0, r = hp0(raw, src, o);
    if (P && P.stagger) { if (P.knockT > k0) P.knockT = k0 + (P.knockT - k0) * (1 - P.stagger); if (P.stumble > s0) P.stumble = s0 + (P.stumble - s0) * (1 - P.stagger); }
    return r;
  };
  // 出發的時候提醒：身上有太重的
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf0(f, o), P = W().P; if (o && o.fresh && P && P.tooHeavy) setTimeout(() => R.toast && R.toast('身上有 ' + P.tooHeavy + ' 件護具太重了（力量 ' + P.str + ' 不夠）：移動、攻速變慢。', '#FF9A6A'), 3200); return r; };

  // ---------- 公會：倉庫裡穿不上的寫原因；勇者證寫力量 ----------
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'); if (!body || !S()) return;
    const cls = S().cls, mine = R.strOf(cls);
    body.querySelectorAll('[data-sell]').forEach(b => {
      const it = R.itemById && R.itemById(b.dataset.sell); if (!it || it.kind !== 'armor' || !tooHeavy(it, cls)) return;
      const note = b.parentNode.querySelector('.note'); if (note) note.textContent = '力量不夠（要 ' + R.strNeed(it) + '，你有 ' + mine + '）';
    });
    const eq = R.equipped ? R.equipped(cls) : {}, heavy = R.SLOTS.filter(sl => eq[sl.id] && tooHeavy(eq[sl.id], cls));
    const hc = body.querySelector('.hero-card > div');
    if (hc && !hc.querySelector('.str-line')) { const el = document.createElement('small'); el.className = 'str-line'; el.textContent = '力量 ' + mine + (heavy.length ? '（' + heavy.map(sl => R.ARMOR[eq[sl.id].base].name).join('、') + '太重了：移動、攻速變慢）' : ''); if (heavy.length) el.style.color = '#FF9A6A'; hc.appendChild(el); }
  };
})(window.R);
