// 遺跡的層數：更多、每座不一樣（2026-10-04 回饋：樓層深度太少、太固定；分迷宮型、城邦型……可以用來做變化；
// 存檔點可以跟著樓層數平衡——層數少的 3 層一個、多的 8 層一個，層數少的每層之間難度差比較大；有存檔點的話 40～50 層也沒問題）
// - 層數照分級給一個範圍，每座遺跡固定（照遺跡的 id 決定，下次來還是一樣深）：
//   哈米莉亞 4～7、阿彌勒 8～16、摩爾斯 14～28、克森特 30～60、卡索 60～100（最多 100 層）；高塔型 ×1.35、迷宮型 ×0.65、浮島型 ×0.85。
//   觀光遺跡、狩獵場照舊。
// - 難度照「走到第幾成」算：遺跡生物的強度、寶箱的等級，用「換算回原本層數」的那一層（run.depthK）——
//   最上層到最深處的難度幅度和原本一樣；層數少的每一層差比較多，層數多的慢慢變強。
// - 存檔點（savepoint.js）的間隔：9 層以下每 3 層、22 層以下每 5 層、再深每 8 層；克森特級每 10 層、卡索級以上每 20 層（R.saveEvery）。
// 放在 deeper.js、ruinplus.js 後面；run.js、guildtask.js、main.js 用 R.floorsFor。
(function (R) {
  const W = () => R.W;
  // 2026-10-04 作者：遺跡最多可以到 100 層、後面的分級每 20 層一個存檔點，其他遺跡也加深（50、60 層沒問題）
  const RANGE = { hamilia: [4, 7], amile: [8, 16], mors: [14, 28], kesent: [30, 60], kaso: [60, 100], kansait: [60, 100] }, MAXF = 100;
  const TYPEK = { tower: 1.35, city: 1, maze: 0.65, tomb: 1, island: 0.85 };
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const oldFloors = site => { const g = R.gradeById(site.grade), t = R.TYPES[site.type]; return Math.max(2, ((g && g.floors) || 2) + (t ? t.floors : 0)); };
  R.floorsFor = site => {
    const g = R.gradeById(site.grade); if (!g || !RANGE[g.id] || site.id === 'kanko' || site.kind === 'hunt' || site.outdoor) return oldFloors(site);
    const [a, b] = RANGE[g.id], n = Math.round((a + (b - a) * hash(site.id)) * (TYPEK[site.type] || 1));
    return Math.max(Math.max(2, Math.round(a * 0.65)), Math.min(MAXF, Math.round(b * 1.3), n));
  };
  // 克森特級每 10 層、卡索級以上每 20 層（2026-10-04 作者：每 20 層一個是後面的等級；克森特級怎麼沒有存檔點）
  R.saveEvery = run => { const n = run.floors - (run.f0 ? 1 : 0), g = run.grade ? run.grade.id : ''; if (g === 'kaso' || g === 'kansait') return 20; if (g === 'kesent') return 10; return n <= 9 ? 3 : n <= 22 ? 5 : 8; };
  // 出發：記下難度換算的比例
  const sr0 = R.startRun;
  R.startRun = id => {
    const r = sr0(id), run = W().run;
    if (run && run.site && run.site.id === id && run.depthK == null) { const real = run.floors - (run.f0 ? 1 : 0), old = oldFloors(run.site); run.depthK = real > old ? (old - 1) / Math.max(1, real - 1) : 1; }
    return r;
  };
  // 遺跡生物的強度、寶箱的等級：用換算回原本層數的那一層
  const eff = (run, f) => (run && run.depthK && run.depthK < 1 ? Math.round(f * run.depthK) : f);
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (...a) => { const run = W().run; if (!run || !run.depthK || run.depthK >= 1) return se0(...a); const f = run.floor; run.floor = eff(run, f); try { return se0(...a); } finally { run.floor = f; } };
  const rc0 = R.rollChest;
  R.rollChest = (g, floor, cls, tier) => rc0(g, eff(W().run, floor), cls, tier);
})(window.R);
