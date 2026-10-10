// 前期的回復技能回復量砍半（2026-10-10 作者：所有初期能得到的恢復技能都要砍半恢復量）
// 「初期」＝轉職前就拿得到的：基本職業技能書 15 級以內（不屬於轉職路線）的回血技能，加上開局就有的種族技能「精靈之光」。
// 只砍回復生命的量（一次回多少、每秒回多少、站在旁邊回多少）；護盾、魔力回復不動。說明裡的數字跟著改。
// 技能變化「大治療」是乘上去的（回復 ×1.4），跟著一起變少。
// 法陣・癒（聖域）：combat.js 的聖域原本固定每 0.5 秒回 5%，改成乘上 healK（skillbook.js 放聖域時帶進去）。
// 放在 skillbook*.js、classes2b.js、bal1010.js、racial.js 後面。
(function (R) {
  const L = R.SKILL_LIB; if (!L) return;
  const H = 0.5, pc = v => +(v * 100).toFixed(2) + '%';
  // 技能書顯示的是 R.SKILLS 那一份（名字、冷卻、說明；後面可能多一句「效果隨魔力上限變強」）：說明一起換，後面那句留著
  const fix = (id, f) => { const s = L[id]; if (!s || !s.p || s._heal1010) return; s._heal1010 = 1; const old = s.desc || '', d = f(s.p, s); if (!d) return; s.desc = d; const sk = R.SKILLS && R.SKILLS[id]; if (sk && sk.desc) sk.desc = sk.desc.indexOf(old) === 0 ? d + sk.desc.slice(old.length) : d; };
  fix('bd_requiem', p => { p.pct *= H; p.allies *= H; return '溫柔的曲子：你回復 ' + pc(p.pct) + ' 生命，隊友回復 ' + pc(p.allies) + '。'; });
  fix('p_bless', (p, s) => { p.regen *= H; return s.desc.replace(/每秒回復 [\d.]+% 生命/, '每秒回復 ' + pc(p.regen) + ' 生命'); });
  fix('sc_heal', p => { p.pct *= H; return '撕開癒卷：回復 ' + pc(p.pct) + ' 生命。'; });
  fix('sn_bond', (p, s) => { p.pct *= H; return s.desc.replace(/回復 [\d.]+% 生命/, '回復 ' + pc(p.pct) + ' 生命'); });
  fix('p_lamp', (p, s) => { p.heal *= H; return s.desc.replace(/每秒回復 [\d.]+% 生命/, '每秒回復 ' + pc(p.heal) + ' 生命'); });
  fix('p_prayer', p => { p.pct *= H; p.allies *= H; return '你和身邊的隊友回復 ' + pc(p.pct) + ' 生命。'; });
  fix('p_hallow', p => { p.heal *= H; });
  fix('m_breathe', (p, s) => { p.pct *= H; return s.desc.replace(/回復 [\d.]+% 生命/, '回復 ' + pc(p.pct) + ' 生命'); });
  fix('p_refuge', (p, s) => { const h = (p.parts || []).find(x => x[0] === 'heal'); if (h && h[1].pct) { h[1].pct *= H; return s.desc.replace(/回復 [\d.]+% 生命/, '回復 ' + pc(h[1].pct) + ' 生命'); } });
  fix('k_vow', (p, s) => { p.pct *= H; return s.desc.replace(/回復 [\d.]+% 生命/, '回復 ' + pc(p.pct) + ' 生命'); });
  fix('ry_heal', p => { p.healK = H; });
  // 種族技能：精靈之光（R.raceSkillOf 回傳的是表裡那一筆，改它就好）
  try {
    const id = (R.RACE_IDS || Object.keys(R.RACES || {})).find(k => { const sk = R.raceSkillOf && R.raceSkillOf(k); return sk && sk[1] === '精靈之光'; });
    const sk = id && R.raceSkillOf(id);
    if (sk && !sk._heal1010) { sk._heal1010 = 1; sk[3].pct *= H; sk[3].allies *= H; sk[4] = '借森林的光：你回復 ' + pc(sk[3].pct) + ' 生命，隊友回復 ' + pc(sk[3].allies) + '。'; }
  } catch (e) { console.warn('[heal1010]', e); }
})(window.R);
