// 吸血削一半（2026-10-05 作者：吸血數值削一半）
// - 數值直接改在各檔：武器的嗜血（data.js）、飾品的飲血、根付（crafting.js）、種族（races.js、races2.js、racebal.js）、
//   被動（passives.js、adv2plus.js）、技能的吸血（skillbook.js、skillbook2.js、skills3.js、adv2plus.js）、狂怒（combat.js、data.js）。
// - 這個檔：舊存檔裡已經抽到的嗜血、飲血詞綴一次減半（存檔標 s.vampHalf，只做一次）；新的存檔一開始就標上，免得新抽的又被減一次。
// - 吸取、吸魂、鎮魂、咒殺、血之渴望這幾招本身就是「吸生命的招式」，沒有動。
// 放在 hub.js（R.migrate、R.freshSave）後面。
(function (R) {
  const IDS = { vamp: 1, leech: 1 };
  // 存檔裡所有的裝備（背包、倉庫、身上、擔保品……）：有 affixes 的物件都找出來
  const walk = (o, f) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(x => walk(x, f)); return; }
    if (Array.isArray(o.affixes)) f(o);
    Object.keys(o).forEach(k => { if (k !== 'affixes') walk(o[k], f); });
  };
  const half = s => {
    if (!s || typeof s !== 'object' || s.vampHalf) return s;
    walk(s, it => it.affixes.forEach(a => { if (a && IDS[a.id] && typeof a.v === 'number') a.v = Math.round(a.v * 5) / 10; }));
    s.vampHalf = 1; return s;
  };
  const mg0 = R.migrate;
  R.migrate = s => half(mg0 ? mg0(s) : s);
  const fs0 = R.freshSave;
  R.freshSave = (...a) => { const s = fs0(...a); if (s && typeof s === 'object') s.vampHalf = 1; return s; };
})(window.R);
