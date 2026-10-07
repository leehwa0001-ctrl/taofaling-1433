// 大招的補償（2026-10-04 作者：全部大招傷害都要削，但都要有相對應的補償）
// 傷害在 ult.js 的 R.ultBase／ULT_K 削到普攻的 10～15 倍（原本多乘一次傷害倍率，高等級變成 20～40 倍）；每個大招各多一樣好處：
//   槍手 彈幕風暴：整整 3 秒不會受傷；彈匣裝滿，掃完接下來 6 發必定暴擊
//   弓箭手 流星箭雨：落點的敵人一直變慢；8 秒內暴擊率 +20%、移動 +15%
//   戰士 天崩斬：攻擊距離的加成算進範圍（ult.js、reach.js）；落地後 6 秒受到的傷害 −30%
//   術士 七曜隕星：重置技能冷卻，回滿魔力
//   牧師 聖域降臨：20 秒內倒下會原地站起來一次；解除變慢、看不清楚
//   刀客 千刃：翻滾馬上能用；斬完 6 秒內暴擊率 +30%、移動 +20%
//   騎士 不落城塞：4 秒內每秒回 3% 生命；結束時多一層 40% 生命的護盾
//   武術家 天崩拳：回 25% 生命；6 秒內受到的傷害 −30%、移動 +15%
//   吟遊詩人 狂想曲：16 秒內移動 +15%、受到的傷害 −15%；魔力回一半
//   召喚師 百鬼夜行：多一層 30% 生命的護盾；8 秒內受到的傷害 −20%
//   術陣師 天地大陣：陣裡的敵人被定住 2.5 秒（三次爆炸都跑不掉）；獲得可吸收相當於最大生命 50% 傷害的護盾
//   附魔師 萬象附魔：附魔持續時間延長 6 秒（共 18 秒）
//   符卷師 萬卷齊發：魔力回滿、技能冷卻減半
// 大招的副標題後面加上補償的說明。放在 ult.js、monk.js、classes2b.js、skillbook.js 後面。
(function (R) {
  const W = () => R.W, U = R.ULTS; if (!U) return;
  const later = (f, ms) => { const run = W().run; setTimeout(() => { const w = W(); if (w.run === run && w.P && !w.P.dead && run && !run.done) f(w.P); }, ms); };
  const buff = (P, id, o) => { const T = R.SKILL_TYPES; if (T && T.buff) T.buff(Object.assign({ _id: 'ult+' + id, t: 6 }, o), P); };
  const near = (x, z, r) => (W().enemies || []).filter(e => !e.dead && !e.under && Math.hypot(e.x - x, e.z - z) < r + (e.def ? e.def.size * 0.5 : 0));
  const aim = (P, max) => { let x = P.aimX != null ? P.aimX : P.x, z = P.aimZ != null ? P.aimZ : P.z; const d = Math.hypot(x - P.x, z - P.z); if (d > max) { x = P.x + (x - P.x) / d * max; z = P.z + (z - P.z) / d * max; } return [x, z]; };
  const cds = (P, k) => { P.skillCd = (P.skillCd || 0) * k; if (P.skCd) P.skCd = P.skCd.map(c => (c || 0) * k); };
  const shield = (P, v, t) => { P.shield = Math.max(P.shield || 0, P.hpMax * v); if (P.buff) P.buff.shieldT = Math.max(P.buff.shieldT || 0, t || 8); };
  const C = {
    gunner: ['整整 3 秒不會受傷；施放時裝滿彈匣，掃射結束後 5 秒射速 +25%', P => { P.iframe = Math.max(P.iframe || 0, 3.1); if (P.ws && P.ws.mag) { P.ammo = P.ws.mag; P.reloadT = 0; } later(P => { if (R.SKILL_TYPES && R.SKILL_TYPES.buff) R.SKILL_TYPES.buff({ _id: 'ult:gunner:rate', t: 5, rate: 1.25 }, P); }, 3000); }],
    archer: ['落點的敵人變慢；8 秒內暴擊 +20%、移動 +15%', P => { const [x, z] = aim(P, 13); [0, 1200, 2400].forEach(ms => later(() => near(x, z, 7).forEach(e => { if (e.st) e.st.slow = Math.max(e.st.slow || 0, 2.5); }), ms)); buff(P, 'archer', { t: 8, crit: 0.2, speed: 1.15, color: '#BFE8FF' }); }],
    warrior: ['攻擊距離越長範圍越大；落地後 6 秒受到的傷害 −30%', P => { later(P => buff(P, 'warrior', { t: 6, def: 0.3, color: '#FF8A5A' }), 700); }],
    mage: ['重置技能冷卻，回滿魔力', P => { cds(P, 0); P.mp = P.mpMax; }],
    priest: ['20 秒內倒下會原地站起來一次', P => { P.reviveCharge = Math.max(P.reviveCharge || 0, 20); P.slowT = 0; P.blindT = 0; }],
    blade: ['翻滾馬上能用；之後 6 秒暴擊 +30%、移動 +20%', P => { P.dodgeCd = 0; later(P => buff(P, 'blade', { t: 6, crit: 0.3, speed: 1.2, color: '#9AD8FF' }), 1400); }],
    knight: ['每秒回 3% 生命，結束時多一層 40% 生命的護盾', P => { buff(P, 'knight', { t: 4, regen: 0.03, color: '#FFC85A' }); later(P => shield(P, 0.4, 8), 4000); }],
    monk: ['回 25% 生命；6 秒內受到的傷害 −30%、移動 +15%', P => { R.healP(P.hpMax * 0.25); buff(P, 'monk', { t: 6, def: 0.3, speed: 1.15, color: '#FFB45A' }); }],
    bard: ['16 秒內移動 +15%、受到的傷害 −15%；魔力回一半', P => { P.mp = Math.min(P.mpMax, P.mp + P.mpMax * 0.5); buff(P, 'bard', { t: 16, speed: 1.15, def: 0.15, color: '#FFB8E0' }); }],
    summoner: ['多一層 30% 生命的護盾；8 秒內受到的傷害 −20%', P => { shield(P, 0.3, 8); buff(P, 'summoner', { t: 8, def: 0.2, color: '#A8C88A' }); }],
    arraymage: ['陣裡的敵人被定住 2.5 秒；獲得可吸收相當於最大生命 50% 傷害的護盾', P => { near(P.x, P.z, 7).forEach(e => { if (e.st) e.st.root = Math.max(e.st.root || 0, 2.5); }); later(P => shield(P, 0.5, 8), 50); }],
    enchanter: ['附魔持續時間延長 6 秒（共 18 秒）', P => { Object.keys(P.sb || {}).forEach(k => { if (/^ult:buff/.test(k) && P.sb[k].left > 0) P.sb[k].left += 6; }); }],
    scroll: ['魔力回滿、技能冷卻減半', P => { P.mp = P.mpMax; cds(P, 0.5); }]
  };
  Object.keys(C).forEach(cls => {
    const u = U[cls]; if (!u) return; const [txt, f] = C[cls], g = u.go;
    u.sub = u.sub + '｜' + txt; u.bonus = txt;
    u.go = P => { g(P); try { f(P); } catch (e) { console.warn('[ultbal]', e); } };
  });
})(window.R);
