// 討伐令 1433：調整名字和效果對不上的被動（作者：有些被動技能的屬性很尷尬，例如龍騎士的鋼鐵意志）
// - 鋼鐵意志（騎士）：原本是「佩特拉的注意 −10%、防禦 +3」（降注意是潛行的效果，跟意志沒關係）
//     → 暈眩（踉蹌）、緩速、被擊退、看不見的時間減半；生命低於一半時，受到的傷害再少 6 點。
// - 號令（騎士，原本叫衝鋒號令，效果只是技能冷卻）→ 隊友造成的傷害 +15%、技能冷卻 −8%。
// - 只改名字：殉道 → 神佑（效果是留下一口氣，不是犧牲）；戰士的被動「戰吼」→「殺氣」（和技能同名）；堅信 → 靜心（降注意比較像靜下心來）。
// 存檔裡記的是被動的 id，改名、改效果不影響已經學會、已經裝上的。
(function (R) {
  const W = R.W, PV = R.PASSIVES; if (!PV) return;
  const set = (id, o) => { if (PV[id]) Object.assign(PV[id], o); };
  set('kn6', { name: '鋼鐵意志', desc: '踉蹌、緩速、被擊退、看不見的時間減半；生命低於一半時，受到的傷害再少 6 點。', fx: { tenacity: 0.5, lowDef: 6 } });
  set('kn4', { name: '號令', desc: '隊友造成的傷害 +15%；技能冷卻 −8%。', fx: { allyDmg: 0.15, skillCd: 0.08 } });
  set('pr8', { name: '神佑', desc: '每一層一次：受到致命傷時留下 1 點生命。' });
  set('wa4', { name: '殺氣' });
  set('pr4', { name: '靜心' });
  // 鋼鐵意志：每一格看壞狀態的時間有沒有變長，變長的部分砍半
  const KEYS = ['stumble', 'slowT', 'knockT', 'blindT'], last = {};
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const P = W.P, f = P && P.pv; if (!P) return;
    const ten = f && f.tenacity || 0;
    KEYS.forEach(k => { const v = P[k] || 0, l = last[k] || 0; if (ten && v > l + 0.01) P[k] = l + (v - l) * (1 - ten); last[k] = P[k] || 0; });
  };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const P = W.P, f = P && P.pv; if (f && f.lowDef && P.hp < P.hpMax * 0.5 && raw > 0) raw = Math.max(1, raw - f.lowDef); return hp0(raw, src, o); };
  const ah0 = R.allyHit;
  if (ah0) R.allyHit = (e, dmg, by) => { const P = W.P, f = P && P.pv; return ah0(e, f && f.allyDmg && !(by && by.rival) ? dmg * (1 + f.allyDmg) : dmg, by); };
})(window.R);
