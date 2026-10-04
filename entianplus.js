// 恩特安的傳人（附魔師的昭旭・遺跡路線）多幾招附魔的強化技（2026-10-05 作者：恩特安的強化技再多一點）
// 原本這條路線六招裡只有「找破綻」「博弈」兩招是強化。「附魔之父」恩特安的路線，多五招把刻紋刻上武器的強化：
//   恩特安刻紋（9 級：傷害 +20%、多無視 30% 護甲）、霜之刻紋（12 級：打中的變慢、暴擊 +10%）、
//   雷之刻紋（16 級：打中時電到旁邊一隻、傷害 +10%）、迴響刻印（19 級：普攻 35% 多打一下四成）、
//   傑作（27 級：焰、霜、雷一次刻上去，傷害 +35%、暴擊 +25%、多無視 40% 護甲）。
// 強化（P.sb）新的兩個欄位在這裡算：pen（暫時多的穿透，最多到 95%）、echo（普攻多打一下的機率）。
// 霜（frost）、雷（shock）照 classes2b.js、焰（burn）、傷害、暴擊照 skillbook.js 的算法。
// 放在 classes2b.js、skills3.js 後面。
(function (R) {
  const W = () => R.W, L = R.SKILL_LIB;
  const NEW = [
    ['et_mark', '恩特安刻紋', 'enchanter', 9, 14, 12, 'buff', { t: 10, dmg: 1.2, pen: 0.3, color: '#FFFFFF' }, '把恩特安的刻紋刻上武器：10 秒內傷害 +20%，再多無視 30% 的護甲。', 'entian'],
    ['et_frostrune', '霜之刻紋', 'enchanter', 12, 14, 12, 'buff', { t: 10, frost: 1, crit: 0.1, color: '#9AD8FF' }, '刻上霜的刻紋：10 秒內打中的敵人變慢，暴擊率 +10%。', 'entian'],
    ['et_stormrune', '雷之刻紋', 'enchanter', 16, 14, 14, 'buff', { t: 10, shock: 1, dmg: 1.1, color: '#FFE04A' }, '刻上雷的刻紋：10 秒內打中的時候，三成五會電到旁邊的一隻；傷害 +10%。', 'entian'],
    ['et_echo', '迴響刻印', 'enchanter', 19, 16, 16, 'buff', { t: 10, echo: 0.35, color: '#E0D0FF' }, '讓刻紋跟著刀身震：10 秒內普攻有 35% 多打一下（四成傷害）。', 'entian'],
    ['et_master', '傑作', 'enchanter', 27, 24, 28, 'buff', { t: 12, dmg: 1.35, crit: 0.25, burn: 1, frost: 1, shock: 1, pen: 0.4, color: '#FFFFFF' }, '恩特安的傑作：焰、霜、雷一次刻上去 12 秒；傷害 +35%、暴擊率 +25%，多無視 40% 的護甲。', 'entian']
  ];
  NEW.forEach(([id, name, cls, lv, cd, mp, type, p, desc, adv]) => {
    if (!L || L[id]) return;
    L[id] = { id, name, cls, lv, cd, mp, type, p, desc, adv };
    R.SKILLS[id] = { name, cd, mp, desc };
  });
  // pen、echo
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P, B = P && P.sb ? Object.values(P.sb) : null; if (!B || !B.length || !e || e.dead) return he0(e, raw, o);
    let pen = 0, echo = 0; B.forEach(b => { if (b.pen) pen += b.pen; if (b.echo) echo += b.echo; });
    if (!pen && !echo) return he0(e, raw, o);
    const p0 = P.pen || 0; if (pen) P.pen = Math.min(0.95, p0 + pen);
    let r; try { r = he0(e, raw, o); } finally { P.pen = p0; }
    if (echo && o && o.primary && !o.echo && Math.random() < echo) { const run = W().run; setTimeout(() => { if (W().run === run && !e.dead) { R.fx && R.fx('spark', e.x, 1, e.z, { color: '#E0D0FF' }); R.hurtEnemy(e, raw * 0.4, { primary: false, echo: true }); } }, 120); }
    return r;
  };
})(window.R);
