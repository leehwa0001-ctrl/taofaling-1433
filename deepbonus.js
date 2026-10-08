// 深度加成（2026-10-07 作者：不要再照絕對「第幾層」算，改成照這座遺跡已經走到總樓層的幾 %；
//   這樣短遺跡和長遺跡都會從淺層一路拉到該分級應有的最深層強度。）
// - 深度進度＝目前樓層 ÷ 這座遺跡總樓層。
// - 2026-10-08 作者：增幅改成複利（原本照進度線性加，越後面每層多的比例越小、不平均；生命應該指數成長），第 1 層 +0%。
//   每層倍率＝(1＋最深增幅)^(1÷(總樓層−1))，第 n 層＝(1＋最深增幅)^((n−1)÷(總樓層−1)) − 1；最深層還是剛好到最深增幅。
//   例：20 層的阿彌勒級（最深 +50%）每層 ×1.022：第 1 層 +0%、第 10 層 +21.2%、第 15 層 +34.8%、第 20 層 +50%。
//   20 層的克森特級（最深 +200%）每層 ×1.060：第 10 層 +68.3%、第 20 層 +200%。傷害一樣是複利，最深是生命的一半。
//   寶物數量、稀有度、經驗照本層的生命增幅算，所以第 1 層也是 +0%。
// - 各分級最深層的「生命增幅」：阿彌勒 +50%、摩爾斯 +100%、克森特 +200%、卡索 +300%。
//   傷害增幅維持生命的一半：+25%／+50%／+100%／+150%。哈米莉亞級不加。
// - 寶物數量、稀有度、經驗也改跟同一個深度百分比走；克森特最深層仍約等同舊制第 60 層的獎勵。
// - difficulty.js 的領主／核心生命保底照舊；這裡只負責可見的「深度」增幅。
// 放在 difficulty.js、pact.js、loot.js、sets.js、crafting.js 後面（包 R.spawnEnemy、R.rollChest 最外面）；左上角的「深度」那一格也在這裡。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id), isLord = d => !!(d && /^領主體/.test(d.name || ''));
  const TOTAL = { amile: 0.5, mors: 1, kesent: 2, kaso: 3, kansait: 3 };
  const has0 = run => { const RP = R.ruinPlusDebug; return !!(RP && RP.has0 && RP.has0(run)); };
  const shown = run => run.f0 && has0(run) ? run.floor : run.floor + 1;   // 第 0 層休息區不算深度；真正第 1 層從 1／總樓層開始
  const totalFloors = run => Math.max(1, (run.floors || 1) - (run.f0 ? 1 : 0));
  const NONE = { n: 0, total: 0, p: 0, k: 0, amp: 0, cap: 0, hp: 0, dmg: 0, qty: 0, rare: 0, xp: 0 };
  R.depthBonus = run => {
    if (!run || !run.grade || !run.site || run.grade.id === 'hamilia' || run.grade.id === 'hunt' || run.site.id === 'kanko' || run.site.outdoor) return NONE;
    const cap = TOTAL[run.grade.id] || 0; if (!cap) return NONE;
    const n = Math.max(0, shown(run)), total = totalFloors(run), p = Math.max(0, Math.min(1, n / total));
    // 複利：第 1 層 +0%，之後每層乘同一個倍率，最深層剛好到這個分級的最深增幅
    const steps = Math.max(1, total - 1), i = Math.max(0, Math.min(steps, n - 1));
    const grow = top => (total > 1 ? Math.pow(1 + top, i / steps) - 1 : 0);
    const amp = grow(cap), rate = total > 1 ? Math.pow(1 + cap, 1 / steps) - 1 : 0;
    return {
      n, total, p, k: p, amp, cap, rate,
      hp: amp,
      dmg: grow(cap * 0.5),   // 傷害也是複利，最深層是生命增幅的一半
      qty: Math.min(1, amp * 0.3),
      rare: Math.min(1, amp * 0.4),
      xp: Math.min(3, amp * 0.75)
    };
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
      const col = colOf(b.cap ? b.amp / b.cap : 0), html = '<b style="color:' + col + '">深度・第 ' + b.n + '／' + b.total + ' 層</b><span>本層增幅 <em style="color:' + col + '">' + pc(b.amp) + '</em>（每層 ×' + (1 + (b.rate || 0)).toFixed(3) + '，最深 ' + pc(b.cap) + '）</span><span>遺跡生物 生命 <em style="color:' + col + '">' + pc(b.hp) + '</em>・傷害 <em style="color:' + col + '">' + pc(b.dmg) + '</em></span><span>寶物數量 <em>' + pc(b.qty) + '</em>・寶物稀有度 <em>' + pc(b.rare) + '</em></span><span>經驗 <em style="color:#9AE07A">' + pc(b.xp) + '</em></span>';
      el.hidden = false; el.style.setProperty('--dc', col); if (html !== last) { el.innerHTML = html; last = html; }
    } catch (e) { }
    return r;
  };
  const css = document.createElement('style');
  css.textContent = '#deep-box{display:grid;gap:1px;font-size:11.5px;padding:5px 9px;border-left:3px solid var(--dc,#A79E8C);box-shadow:inset 0 0 18px -8px var(--dc,transparent)}#deep-box b{font-size:12.5px;font-family:var(--serif)}#deep-box span{color:var(--dim)}#deep-box em{font-style:normal;font-weight:700;color:#E8D8B0}';
  document.head.appendChild(css);
})(window.R);
