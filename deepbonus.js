// 深度加成（2026-10-04 作者：遺跡深層的怪物增幅可以再更明顯一點，也顯示在左上角——比如第 20 層怪物血量 +30%、傷害 +15%；
//   第 60 層怪物血量 +200%、傷害 +100%，隨著深度顏色也會出現變化。「寶箱裡面多一樣 XX%」改成「寶物數量增加」「寶物稀有度增加」，也加在深層的增幅上）
// - 照畫面上的層數 n（第 n 層）：k = (n ÷ 60)^1.75（第 20 層 0.15、第 40 層 0.49、第 60 層 1、第 80 層 1.65）。
//   遺跡生物：生命 +200%×k、傷害 +100%×k（最多 +400%／+200%）；寶物數量 +60%×k、寶物稀有度 +80%×k（最多 +100%）；經驗 +150%×k（最多 +300%；2026-10-05 作者：多一點點，原本 +100%×k）。
//   哈米莉亞級、觀光遺跡、狩獵場不加。
// - combat.js 原本每一層 +16% 生命、+10% 傷害（換算回舊層數）那一段拿掉了，換成這個——左上角寫的就是實際的加成。
//   difficulty.js 後期的生命保底也不再照深度加（一般、精英），由這裡乘。
//   領主體、佩特拉核心的生命照舊（difficulty.js 本來就照深度給保底，再乘會變成要打好幾百下；摩爾斯級以下的核心沒有保底，照樣加），傷害一樣加。
// - 寶物數量：寶箱開出的每一件，有這個機率再多開一件；寶物稀有度：開寶箱時，越稀有的權重乘得越多（×(1＋稀有度級數×加成×0.5)）。
// 放在 difficulty.js、pact.js、loot.js、sets.js、crafting.js 後面（包 R.spawnEnemy、R.rollChest 最外面）；左上角的「深度」那一格也在這裡。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id), isLord = d => !!(d && /^領主體/.test(d.name || ''));
  const shown = run => { const RP = R.ruinPlusDebug; return RP && RP.has0 && RP.has0(run) ? run.floor : run.floor + 1; };   // 畫面上的第幾層
  const NONE = { n: 0, k: 0, hp: 0, dmg: 0, qty: 0, rare: 0, xp: 0 };
  R.depthBonus = run => {
    if (!run || !run.grade || !run.site || run.grade.id === 'hamilia' || run.grade.id === 'hunt' || run.site.id === 'kanko' || run.site.outdoor) return NONE;
    const n = Math.max(0, shown(run)), k = Math.pow(n / 60, 1.75);
    return { n, k, hp: Math.min(4, 2 * k), dmg: Math.min(2, k), qty: Math.min(1, 0.6 * k), rare: Math.min(1, 0.8 * k), xp: Math.min(3, 1.5 * k) };
  };

  // ---------- 遺跡生物 ----------
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se0(id, x, z, room, o), run = W().run;
    if (!e || !run || !e.def || e.def.human || e.def.wild || e.fake) return e;
    const b = R.depthBonus(run); if (!b.k) return e;
    e.dmg *= 1 + b.dmg;   // 傷害：全部
    if (!isLord(e.def) && !(e.id === 'petra' && (run.grade.lv || 1) >= 3)) { e.hp *= 1 + b.hp; e.hpMax *= 1 + b.hp; }   // 生命：領主體、有保底的核心不再乘
    return e;
  };

  // ---------- 經驗（2026-10-04 作者：經驗增幅也是——原本沒有照深度加，現在加上：+100%×k，最多 +200%；2026-10-05 再多一點：+150%×k，最多 +300%） ----------
  const gx0 = R.gainXp;
  R.gainXp = v => { const run = W().run, b = run && !run.done ? R.depthBonus(run) : NONE; return gx0(b.xp > 0 ? Math.round(v * (1 + b.xp)) : v); };

  // ---------- 寶箱 ----------
  const rc0 = R.rollChest;
  R.rollChest = (g, floor, cls, tier) => {
    const b = R.depthBonus(W().run); if (!b.k || g <= 0) return rc0(g, floor, cls, tier);
    const L = R.LOOT_WEIGHTS, keep = L && L[g];
    if (keep && b.rare > 0) L[g] = keep.map((w, i) => w * (1 + i * b.rare * 0.5));
    try {
      const out = rc0(g, floor, cls, tier) || [];
      if (b.qty > 0) { const n = out.filter(o => o && o.item).length; for (let i = 0; i < n; i++) if (Math.random() < b.qty) { const more = (rc0(g, floor, cls, tier) || []).find(o => o && o.item); if (more) out.push(more); } }
      return out;
    } finally { if (keep) L[g] = keep; }
  };

  // ---------- 左上角：深度 ----------
  const COLS = [[0.05, '#A79E8C'], [0.2, '#E8C04A'], [0.5, '#FF9A3A'], [1, '#FF4A4A'], [9, '#C86AFF']];
  const colOf = k => COLS.find(c => k < c[0])[1];
  const pc = v => '+' + Math.round(v * 100) + '%';
  let hudT = 0, last = '';
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt); hudT -= dt; if (hudT > 0) return r; hudT = 0.5;
    try {
      const run = W().run, b = R.depthBonus(run); let el = $('deep-box');
      if (!run || !b.k || b.n < 1) { if (el) el.hidden = true; return r; }
      if (!el) { const where = $('r-where'); if (!where) return r; el = document.createElement('div'); el.id = 'deep-box'; el.className = 'glass dungeon-only'; where.after(el); }
      const col = colOf(b.k), html = '<b style="color:' + col + '">深度・第 ' + b.n + ' 層</b><span>遺跡生物 生命 <em style="color:' + col + '">' + pc(b.hp) + '</em>・傷害 <em style="color:' + col + '">' + pc(b.dmg) + '</em></span><span>寶物數量 <em>' + pc(b.qty) + '</em>・寶物稀有度 <em>' + pc(b.rare) + '</em></span><span>經驗 <em style="color:#9AE07A">' + pc(b.xp) + '</em></span>';
      el.hidden = false; el.style.setProperty('--dc', col); if (html !== last) { el.innerHTML = html; last = html; }
    } catch (e) { }
    return r;
  };
  const css = document.createElement('style');
  css.textContent = '#deep-box{display:grid;gap:1px;font-size:11.5px;padding:5px 9px;border-left:3px solid var(--dc,#A79E8C);box-shadow:inset 0 0 18px -8px var(--dc,transparent)}#deep-box b{font-size:12.5px;font-family:var(--serif)}#deep-box span{color:var(--dim)}#deep-box em{font-style:normal;font-weight:700;color:#E8D8B0}';
  document.head.appendChild(css);
})(window.R);
