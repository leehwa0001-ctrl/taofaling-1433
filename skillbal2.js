// 技能的平衡（作者 2026-10-05：都做——壓過強的招、多發武器的技能威力、補弱的職業、讓不同打法都能上場）
// 1. 多發、多段的武器（霰彈槍 6 發、法球 3 發、鐵爪 3 段……）：技能、大招的威力原本把每一發都算滿，霰彈槍的技能比步槍痛 2.3 倍。
//    現在第一發照算，多出來的每一發、每一段算 0.6（R.multiN；skillbook.js、skills.js、combat.js、ult.js 用）。普攻不變。
// 2. 過強的招（每秒大約 2～3 倍普攻，一般的招 0.4～0.9）調下來：卷軸風暴 ×0.45、覺醒・萬卷 ×0.7、覺醒・氣旋 ×0.55、氣旋 ×0.8、
//    式神・雷鳥（術士、召喚師）×0.58、交響 ×0.75。
// 3. 輸出太低的補上去：牧師的攻擊技能 ×1.35、騎士 ×1.25、術陣師 ×1.25。
// 只改技能書裡的倍率（R.SKILL_LIB 的 k），說明照舊。放在所有加技能的檔案（skillbook2.js、classes2b.js、adv2plus.js、promote2.js）後面。
(function (R) {
  R.multiN = ws => { const n = Math.max(1, (ws && ws.pellets > 1 ? ws.pellets : 1) * ((ws && ws.hits) || 1)); return (n > 1 ? 1 + 0.6 * (n - 1) : 1) * ((ws && ws.skillK) || 1); };   // skillK：普攻改了、技能不想跟著變的武器（拳套、鐵爪 2026-10-09）
  const L = R.SKILL_LIB || {};
  const mulK = (id, m) => {
    const s = L[id]; if (!s || !s.p || s._bal) return; s._bal = m;
    const f = q => { if (q && typeof q.k === 'number') q.k = Math.round(q.k * m * 1000) / 1000; if (q && q.end && typeof q.end.k === 'number') q.end.k = Math.round(q.end.k * m * 1000) / 1000; };
    if (s.type === 'combo') (s.p.parts || []).forEach(x => f(x[1])); else f(s.p);
  };
  [['a2_scroll_scribe_0', 0.45], ['sr_master_aw', 0.7], ['wx_storm_aw', 0.55], ['wx_storm', 0.8], ['a2_mage_shikigami_0', 0.58], ['a2_summoner_shikigami_0', 0.58], ['sp2_bard_0', 0.75]].forEach(([id, m]) => mulK(id, m));
  const UP = { priest: 1.35, knight: 1.25, arraymage: 1.25 };
  Object.values(L).forEach(s => { if (s && UP[s.cls]) mulK(s.id, UP[s.cls]); });
})(window.R);
