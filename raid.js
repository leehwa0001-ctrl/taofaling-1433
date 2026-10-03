// 搜打撤（作者 2026-10-03：遺跡應該是搜打撤；背包像塔科夫，可以買、不同的背包格子大小不同；裝備欄像 Minecraft，可以自己穿脫；
//   保險不要是公會保，是別的勇者來問你要不要保，他會去幫你找裝備）
// - 背包是格子：每件東西照種類佔幾格（大劍 1×4、胸甲 2×3、手槍 2×1……，可以轉向）；素材一格疊 10 個。放不下就撿不起來。
//   背包有五種（R.PACKS）：布袋 5×4（公會發的，倒下了也會再發）、皮背包 6×5、登山背包 7×6、公會遠征背包 8×7、魔導收納袋 9×8（2026-10-04 作者：初始的有點小，全部大一號）。在公會的商店買、選要背哪一個。
// - 遺跡裡按 I（背包）打開：左邊是 Minecraft 那樣的裝備欄，右邊是背包的格子。拖曳可以搬、拖的時候按 R 或右鍵轉向；
//   點一下看說明、穿上／換上、脫下、丟掉；把東西拖到裝備欄就是穿上。武器只能換、不能空手。
// - 搜：寶箱要花一點時間搜（站著不動；被打、走開就中斷）；有些房間裡有別的勇者遺落的背包，也可以搜。
// - 撤：用回歸水晶或走出入口才帶得走。倒下的話，背包裡的東西、身上穿的裝備、背的背包全部留在遺跡裡（哈米莉亞級、觀光遺跡、狩獵場不會）。
//   公會會補發基本的武器和衣服（hub.js 的 R.ensureKit）。
// - 保險：一進遺跡，入口旁邊的勇者「霧島」會問你要不要保險（每件大約是賣價的四分之一）；倒下的話，保了的東西（換下來放進背包的也算）十件大概撿回八件，兩天後放進倉庫。
// 這個檔案要放在 guildtask.js、ranks.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  // 一格疊幾個（2026-10-04 作者：比較高級的素材一組 10 個，例如魔力核心；碎片之類的 30、40 個）
  const STACK_OF = { crystal: 40, branch: 40, herb: 40, washi: 40, seashell: 40 };
  const ST = k => { if (STACK_OF[k]) return STACK_OF[k]; const v = (R.MATS[k] && R.MATS[k].value) || 10; return v >= 40 ? 10 : v >= 14 ? 20 : v >= 6 ? 30 : 40; };
  R.stackOf = ST;
  const PACKS = {
    sack: { name: '布袋', w: 5, h: 4, price: 0, desc: '公會發的布袋。倒下了也會再發一個。' },
    leather: { name: '皮背包', w: 6, h: 5, price: 450, desc: '老岩推薦的皮背包，耐磨。' },
    frame: { name: '登山背包', w: 7, h: 6, price: 1400, desc: '有鋁框的登山背包，背得比較多。' },
    guild: { name: '公會遠征背包', w: 8, h: 7, price: 3600, desc: '公會給長期遠征用的大背包，側邊掛得了長兵器。' },
    mage: { name: '魔導收納袋', w: 9, h: 8, price: 9000, desc: '魔導術式縫進內襯的袋子：裡面比外面大一點。' }
  };
  R.PACKS = PACKS;
  const packs = () => { const s = S(); s.packs = s.packs || { sack: 1 }; s.packs.sack = Math.max(1, s.packs.sack || 0); if (!s.pack || !(s.packs[s.pack] > 0) || !PACKS[s.pack]) s.pack = 'sack'; return s.packs; };
  const curPackId = () => { packs(); return S().pack; };

  // ---------- 每件東西佔幾格（寬×高） ----------
  const WSIZE = { pistol: [2, 1], rifle: [4, 1], shotgun: [4, 1], shortbow: [1, 3], longbow: [1, 4], crossbow: [3, 2], greatsword: [1, 4], axe: [2, 3], sword: [1, 3], staff: [1, 4], orb: [2, 2], holystaff: [1, 4], mace: [1, 3], katana: [1, 3], dualblades: [2, 2], spear: [1, 4] };
  const KSIZE = { melee: [1, 3], gun: [3, 1], bow: [1, 3], magic: [1, 3], thrust: [1, 4] };
  const ASIZE = { head: [2, 2], body: [2, 3], legs: [2, 2], feet: [2, 1] };
  const sizeOf = it => {
    if (!it) return [1, 1];
    if (it.kind === 'weapon') { const w = R.WEAPONS[it.base]; return WSIZE[it.base] || (w && KSIZE[w.kind]) || [1, 3]; }
    if (it.kind === 'armor') { const a = R.ARMOR && R.ARMOR[it.base]; return (a && ASIZE[a.slot]) || [2, 2]; }
    return [1, 1];
  };
  R.itemSize = sizeOf;

  // ---------- 格子 ----------
  const G = () => {
    const run = W().run; if (!run) return null;
    if (!run.grid) { const p = PACKS[run.packId] || PACKS.sack; run.grid = { w: p.w, h: p.h, at: new Map() }; run.bag.forEach(it => { const sp = findSpot(it); if (sp) run.grid.at.set(it, sp); }); }
    return run.grid;
  };
  const dims = (it, r) => { const [w, h] = sizeOf(it); return r ? [h, w] : [w, h]; };
  const occ = (g, skip) => { const o = Array(g.w * g.h).fill(null); W().run.bag.forEach(it => { if (it === skip) return; const p = g.at.get(it); if (!p) return; const [w, h] = dims(it, p.r); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[(p.y + y) * g.w + p.x + x] = it; }); return o; };
  const matCells = extra => { const m = Object.assign({}, W().run.mats); if (extra) m[extra.k] = (m[extra.k] || 0) + extra.n; return Object.keys(m).reduce((a, k) => a + Math.ceil(Math.max(0, m[k]) / ST(k)), 0); };
  const freeRect = (g, o, x, y, w, h) => { if (x < 0 || y < 0 || x + w > g.w || y + h > g.h) return false; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (o[(y + j) * g.w + x + i]) return false; return true; };
  const freeCount = o => o.reduce((a, c) => a + (c ? 0 : 1), 0);
  const fitsAt = (it, x, y, r, skip) => { const g = G(), o = occ(g, skip), [w, h] = dims(it, r); return freeRect(g, o, x, y, w, h) && freeCount(o) - w * h >= matCells(); };
  function findSpot(it, skip) {
    const g = W().run.grid; if (!g) return { x: 0, y: 0, r: 0 };
    const o = occ(g, skip), need = matCells();
    for (const r of [0, 1]) { const [w, h] = dims(it, r); if (r && w === h) continue; for (let y = 0; y <= g.h - h; y++) for (let x = 0; x <= g.w - w; x++) if (freeRect(g, o, x, y, w, h) && freeCount(o) - w * h >= need) return { x, y, r }; }
    return null;
  }
  const usage = () => { const g = G(), o = occ(g); return { used: g.w * g.h - freeCount(o) + matCells(), total: g.w * g.h }; };
  R.raidUsage = () => (W().run ? usage() : null);

  // ---------- 出發：背哪一個背包 ----------
  const eligible = run => run && run.site && run.site.kind === 'ruin' && run.site.id !== 'kanko' && run.grade && run.grade.id !== 'hamilia';
  const sr0 = R.startRun;
  R.startRun = id => {
    const r = sr0(id), run = W().run;
    if (run && run.site && run.site.id === id && !run.packId) { run.packId = curPackId(); run.grid = null; G(); if (eligible(run)) setTimeout(() => offer(run), 900); }
    return r;
  };

  // ---------- 撿東西：放得下才撿 ----------
  const ud0 = R.updateDrops;
  R.updateDrops = dt => {
    const w = W(), run = w.run, P = w.P;
    if (!run || !P || P.dead || !w.drops || !run.packId) return ud0(dt);
    const held = [];
    w.drops.forEach(d => {
      if (d.gone || (d.type !== 'item' && d.type !== 'mat')) return;
      // 自己從背包丟出去的：走開 2.4 公尺以上才會再撿（作者 2026-10-04：背包滿的時候站在裝備上整理背包，
      // 丟下去的東西一落地就被自動撿回來，背包又滿了，地上那件就一直撿不起來）
      const dist = Math.hypot(d.x - P.x, d.z - P.z);
      if (d.noPick) { if (dist > (d.type === 'mat' ? 4.5 : 2.4)) d.noPick = false; else { held.push(d); return; } }   // 素材在 3.5 公尺內會被吸過來，要走更遠
      if (dist >= 1.1) return;
      if (d.type === 'item') {
        const sp = findSpot(d.item);
        if (!sp) { if (!d.warned) { d.warned = true; const mc = matCells(); R.toast('背包放不下：' + R.itemName(d.item) + '（佔 ' + sizeOf(d.item).join('×') + ' 格）。按 I 整理背包' + (mc ? '（素材佔了 ' + mc + ' 格）' : '') + '；整理好再走過來就會撿。', '#FF9A6A'); } held.push(d); return; }
        run.bag.push(d.item); G().at.set(d.item, sp); R.toast('撿到：' + R.itemName(d.item), R.rarityColor(d.item)); R.sfx && R.sfx('pick');
      } else {
        const g = G(), o = occ(g);
        if (matCells({ k: d.mat, n: d.n }) > freeCount(o)) { if (!d.warned) { d.warned = true; R.toast('背包放不下：' + R.MATS[d.mat].name + '。按 I 整理背包。', '#FF9A6A'); } held.push(d); return; }
        run.mats[d.mat] = (run.mats[d.mat] || 0) + d.n; R.toast('＋' + R.MATS[d.mat].name + ' ×' + d.n);
      }
      d.gone = true; w.scene.remove(d.mesh); R.disposeObj && R.disposeObj(d.mesh);
    });
    if (held.length) w.drops = w.drops.filter(d => !held.includes(d));
    const r = ud0(dt);
    if (held.length) held.forEach(d => { if (!d.gone) w.drops.push(d); });
    return r;
  };
  const ht0 = R.hudTick;
  if (ht0) R.hudTick = (...a) => { const r = ht0(...a); const run = W().run, el = $('r-bag'); if (run && run.packId && el) { const u = usage(); el.textContent = u.used + '／' + u.total; } return r; };

  // ---------- 穿脫 ----------
  const slotOf = it => (R.slotOf ? R.slotOf(it) : it.kind === 'weapon' ? 'weapon' : it.kind === 'armor' ? R.ARMOR[it.base].slot : 'charm');
  const SLOT_NAME = { weapon: '武器', head: '頭', body: '身體', legs: '腿', feet: '腳', charm: '護符', acc: '飾品' };
  const refreshP = weaponChanged => {
    const s = S(), P = W().P; if (!P) return;
    const fresh = R.calcPlayer(s.cls);
    Object.keys(fresh).forEach(k => { if (k === 'hp' || k === 'mp' || k === 'h' || k === 'x' || k === 'z' || k === 'y') return; P[k] = fresh[k]; });
    P.hp = Math.min(P.hp, P.hpMax); P.mp = Math.min(P.mp, P.mpMax);
    if (weaponChanged) { P.ammo = P.ws.mag || 0; P.reloadT = 0; if (R.setHeroWeapon) R.setHeroWeapon(P.h, P.item.base); }
    if (R.dressHero) R.dressHero(P.h, R.equipped(s.cls));
  };
  const equip = it => {
    const s = S(), run = W().run, g = G(), k = slotOf(it); if (!k || !R.GEAR_KEYS.includes(k)) return '這個不能穿。';
    if (R.canUse && !R.canUse(it, s.cls)) return '現在的職業用不了（或是太重）。';
    const eq = s.equip[s.cls] = s.equip[s.cls] || {}, old = eq[k] ? R.itemById(eq[k]) : null, p = g.at.get(it);
    let sp = null;
    if (old) { sp = p && fitsAt(old, p.x, p.y, p.r, it) ? p : p && fitsAt(old, p.x, p.y, 1 - p.r, it) ? { x: p.x, y: p.y, r: 1 - p.r } : findSpot(old, it); if (!sp) return '背包放不下換下來的' + R.itemName(old) + '。'; }
    run.bag = run.bag.filter(x => x !== it); g.at.delete(it); s.stash.push(it); eq[k] = it.id;
    if (old) { s.stash = s.stash.filter(x => x !== old); run.bag.push(old); g.at.set(old, sp); }
    refreshP(k === 'weapon'); R.toast('穿上了：' + R.itemName(it)); return null;
  };
  const unequip = k => {
    const s = S(), run = W().run, g = G(), eq = s.equip[s.cls] || {}, old = eq[k] ? R.itemById(eq[k]) : null; if (!old) return null;
    if (k === 'weapon') return '武器只能換，不能空手。把別的武器拖過來就是換上。';
    const sp = findSpot(old); if (!sp) return '背包放不下。';
    s.stash = s.stash.filter(x => x !== old); eq[k] = null; run.bag.push(old); g.at.set(old, sp);
    refreshP(false); R.toast('脫下了：' + R.itemName(old)); return null;
  };

  // ---------- 背包的畫面（Minecraft 的裝備欄＋塔科夫的格子） ----------
  const CELL = 38;
  let sel = null, drag = null;
  const icon = it => (R.itemIconTag ? R.itemIconTag(it, 'sm') : '');
  R.bagSheet = () => {
    const run = W().run; if (!run) return;
    const g = G(), s = S(), eq = R.equipped(s.cls), pk = PACKS[run.packId] || PACKS.sack, u = usage();
    const slots = R.GEAR_KEYS.map(k => { const it = eq[k]; return '<div class="mc-slot' + (sel && sel.slot === k ? ' sel' : '') + '" data-slot="' + k + '" title="' + esc(SLOT_NAME[k] || k) + '">' + (it ? icon(it) : '<span class="mc-empty">' + esc(SLOT_NAME[k] || k) + '</span>') + '</div>'; }).join('');
    // 素材：照格子空的地方從後面排
    const o = occ(g), free = []; for (let i = o.length - 1; i >= 0; i--) if (!o[i]) free.push(i);
    const stacks = []; Object.keys(run.mats).forEach(k => { let n = run.mats[k]; while (n > 0) { stacks.push({ k, n: Math.min(ST(k), n) }); n -= ST(k); } });
    const cells = Array.from({ length: g.w * g.h }, (_, i) => '<div class="tk-cell" style="grid-column:' + (i % g.w + 1) + ';grid-row:' + (Math.floor(i / g.w) + 1) + '"></div>').join('');
    const items = run.bag.map((it, i) => { const p = g.at.get(it); if (!p) return ''; const [w, h] = dims(it, p.r); return '<div class="tk-item' + (sel && sel.it === it ? ' sel' : '') + '" data-bi="' + i + '" style="grid-column:' + (p.x + 1) + '/span ' + w + ';grid-row:' + (p.y + 1) + '/span ' + h + ';--c:' + R.rarityColor(it) + '">' + icon(it) + '<small>' + esc(R.itemName(it)) + '</small></div>'; }).join('');
    const matsHtml = stacks.map((st, j) => { const i = free[j]; if (i == null) return ''; return '<div class="tk-mat' + (sel && sel.mat === st.k ? ' sel' : '') + '" data-mk="' + st.k + '" style="grid-column:' + (i % g.w + 1) + ';grid-row:' + (Math.floor(i / g.w) + 1) + ';--c:' + (R.MATS[st.k].color || '#C8B88A') + '" title="' + esc(R.MATS[st.k].name) + '"><i></i><b>' + st.n + '</b></div>'; }).join('');
    const loose = run.bag.filter(it => !g.at.get(it));
    let info = '<p class="note">點一下看說明；拖曳搬動，拖的時候按 R 或右鍵轉向；拖到左邊的裝備欄就是穿上。</p>';
    if (sel && sel.mat && run.mats[sel.mat] > 0) {   // 選了素材（作者 2026-10-04：裝備可以丟出來，素材也要可以）
      const k = sel.mat, n = run.mats[k], M = R.MATS[k];
      info = '<div class="tk-info"><b style="color:' + (M.color || '#C8B88A') + '">' + esc(M.name) + ' ×' + n + '</b><small>' + esc(M.desc || '') + (M.desc ? '・' : '') + '一格疊 ' + ST(k) + ' 個，現在佔 ' + Math.ceil(n / ST(k)) + ' 格</small><div class="row">'
        + '<button type="button" class="btn" data-mdrop="1">丟在地上（' + Math.min(ST(k), n) + ' 個）</button>' + (n > ST(k) ? '<button type="button" class="btn" data-mdrop="all">全部丟在地上（' + n + ' 個）</button>' : '') + '</div></div>';
    } else if (sel && (sel.it || sel.slot)) {
      const it = sel.it || eq[sel.slot];
      if (it) {
        const k = slotOf(it), can = k && R.GEAR_KEYS.includes(k) && (!R.canUse || R.canUse(it, s.cls));
        info = '<div class="tk-info"><b style="color:' + R.rarityColor(it) + '">' + esc(R.itemName(it)) + '</b><small>' + esc(R.itemLines(it).join('・')) + '・佔 ' + sizeOf(it).join('×') + ' 格</small><div class="row">'
          + (sel.it ? (can ? '<button type="button" class="btn pri" data-act="eq">' + (eq[k] ? '換上' : '穿上') + '</button>' : '') + '<button type="button" class="btn" data-act="rot">轉向</button><button type="button" class="btn" data-act="drop">丟在地上</button>'
            : (sel.slot !== 'weapon' ? '<button type="button" class="btn" data-act="uneq">脫下（放進背包）</button>' : '<span class="note">武器只能換，不能空手。</span>'))
          + '</div></div>';
      }
    }
    R.sheet('<div class="tk-head"><h2>背包・' + esc(pk.name) + '</h2><span>' + u.used + '／' + u.total + ' 格</span></div>'
      + '<div class="tk-wrap"><div class="mc-panel"><p class="kicker">裝備</p><div class="mc-slots">' + slots + '</div></div>'
      + '<div class="tk-gridwrap"><div class="tk-grid" id="tk-grid" style="grid-template-columns:repeat(' + g.w + ',' + CELL + 'px);grid-template-rows:repeat(' + g.h + ',' + CELL + 'px)">' + cells + matsHtml + items + '</div></div></div>'
      + (loose.length ? '<p class="note" style="color:#FF9A6A">暫時放不進格子的物品：整理背包後即可收納；目前仍占用容量，返回地面時也會一起帶回。' + loose.map(it => '<button type="button" class="mini" data-loose="' + run.bag.indexOf(it) + '">' + esc(R.itemName(it)) + '</button>').join('') + '</p>' : '')
      + info
      + '<p class="note">素材：' + (Object.keys(run.mats).filter(k => run.mats[k] > 0).map(k => R.MATS[k].name + ' ×' + run.mats[k] + ' <button type="button" class="mini" data-dm="' + k + '">丟掉一格</button>').join('、') || '沒有') + '（一格疊幾個看素材：高級的 10 個、普通的 20～40 個）。倒下的話，背包、身上的裝備都會留在遺跡裡。</p>',
      '<div class="row"><button type="button" class="btn pri" id="bag-x">關上（I）</button></div>');
    $('bag-x').onclick = () => { sel = null; R.closeSheet(); };
    const box = $('r-sheet');
    box.querySelectorAll('[data-slot]').forEach(el => { el.onclick = () => { sel = { slot: el.dataset.slot }; R.bagSheet(); }; });
    box.querySelectorAll('[data-mk]').forEach(el => { el.onclick = () => { sel = { mat: el.dataset.mk }; R.bagSheet(); }; });
    box.querySelectorAll('[data-mdrop]').forEach(el => { el.onclick = () => { const k = sel && sel.mat, n = Math.min(el.dataset.mdrop === 'all' ? 1e9 : (k ? ST(k) : 10), (k && run.mats[k]) || 0); if (!n) return; run.mats[k] -= n; if (run.mats[k] <= 0) { delete run.mats[k]; sel = null; } const P = W().P; if (R.addDrop && P) { const d = R.addDrop({ type: 'mat', mat: k, n, x: P.x + 2.4, z: P.z }); if (d) d.noPick = true; } R.bagSheet(); }; });
    box.querySelectorAll('[data-dm]').forEach(el => { el.onclick = () => { const k = el.dataset.dm, n = Math.min(ST(k), run.mats[k] || 0); if (!n) return; run.mats[k] -= n; if (run.mats[k] <= 0) delete run.mats[k]; const P = W().P; if (R.addDrop && P) { const d = R.addDrop({ type: 'mat', mat: k, n, x: P.x + 2.4, z: P.z }); if (d) d.noPick = true; } R.bagSheet(); }; });
    box.querySelectorAll('[data-loose]').forEach(el => { el.onclick = () => { const it = run.bag[+el.dataset.loose], sp = it && findSpot(it); if (sp) { g.at.set(it, sp); R.bagSheet(); } else R.toast('還是放不下。'); }; });
    box.querySelectorAll('[data-act]').forEach(el => { el.onclick = () => {
      const a = el.dataset.act, it = sel && sel.it; let err = null;
      if (a === 'eq' && it) { err = equip(it); if (!err) sel = { slot: slotOf(it) }; }
      else if (a === 'uneq' && sel.slot) { const was = R.equipped(s.cls)[sel.slot]; err = unequip(sel.slot); if (!err) sel = { it: was }; }
      else if (a === 'rot' && it) { const p = g.at.get(it); if (p && fitsAt(it, p.x, p.y, 1 - p.r, it)) p.r = 1 - p.r; else { const sp = findSpot(it, it); if (sp && sp.r !== (p && p.r)) g.at.set(it, sp); else err = '轉不過來（旁邊沒有空間）。'; } }
      else if (a === 'drop' && it) { run.bag = run.bag.filter(x => x !== it); g.at.delete(it); const P = W().P; if (R.dropItem && P) { const d = R.dropItem(it, P.x + 2.4, P.z); if (d) { d.warned = true; d.noPick = true; } } sel = null; }
      if (err) R.toast(err, '#FF9A6A'); R.bagSheet();
    }; });
    // 拖曳
    const grid = $('tk-grid');
    grid.querySelectorAll('[data-bi]').forEach(el => {
      el.onpointerdown = e => {
        if (e.button === 2) return; e.preventDefault(); const it = run.bag[+el.dataset.bi], p = g.at.get(it), rc = grid.getBoundingClientRect();
        drag = { it, r: p.r, gx: Math.floor((e.clientX - rc.left) / CELL) - p.x, gy: Math.floor((e.clientY - rc.top) / CELL) - p.y, x0: e.clientX, y0: e.clientY, moved: false, ghost: null };
        const move = ev => {
          if (!drag) return; if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 6) return;
          if (!drag.moved) { drag.moved = true; drag.ghost = document.createElement('div'); drag.ghost.className = 'tk-ghost'; document.body.appendChild(drag.ghost); el.classList.add('dragging'); }
          const [w, h] = dims(drag.it, drag.r), r2 = grid.getBoundingClientRect(), cx = Math.floor((ev.clientX - r2.left) / CELL) - (drag.r === p.r ? drag.gx : drag.gy), cy = Math.floor((ev.clientY - r2.top) / CELL) - (drag.r === p.r ? drag.gy : drag.gx);
          drag.cx = cx; drag.cy = cy; drag.ex = ev.clientX; drag.ey = ev.clientY;
          const ok = fitsAt(drag.it, cx, cy, drag.r, drag.it);
          Object.assign(drag.ghost.style, { left: (r2.left + cx * CELL) + 'px', top: (r2.top + cy * CELL) + 'px', width: (w * CELL) + 'px', height: (h * CELL) + 'px' });
          drag.ghost.classList.toggle('bad', !ok); drag.ghost.innerHTML = icon(drag.it);
        };
        const key = ev => { if (drag && drag.moved && (ev.key === 'r' || ev.key === 'R')) { ev.preventDefault(); ev.stopPropagation(); drag.r = 1 - drag.r; move({ clientX: drag.ex, clientY: drag.ey }); } };
        const ctx = ev => { if (drag && drag.moved) { ev.preventDefault(); drag.r = 1 - drag.r; move({ clientX: drag.ex, clientY: drag.ey }); } };
        const up = ev => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('keydown', key, true); window.removeEventListener('contextmenu', ctx, true);
          const d = drag; drag = null; if (d && d.ghost) d.ghost.remove();
          if (!d || !d.moved) { sel = { it }; R.bagSheet(); return; }
          const tgt = document.elementFromPoint(ev.clientX, ev.clientY), slot = tgt && tgt.closest && tgt.closest('[data-slot]');
          if (slot) { const err = equip(d.it); if (err) R.toast(err, '#FF9A6A'); else sel = { slot: slotOf(d.it) }; }
          else if (fitsAt(d.it, d.cx, d.cy, d.r, d.it)) { g.at.set(d.it, { x: d.cx, y: d.cy, r: d.r }); sel = { it: d.it }; }
          R.bagSheet();
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('keydown', key, true); window.addEventListener('contextmenu', ctx, true);
      };
    });
  };

  // ---------- 搜：寶箱、遺落的背包 ----------
  let search = null;
  const bar = () => { let el = $('rd-search'); if (!el) { el = document.createElement('div'); el.id = 'rd-search'; el.innerHTML = '<span></span><i><b></b></i>'; document.body.appendChild(el); } return el; };
  const startSearch = (label, need, done) => { const P = W().P; if (!P || search) return; search = { t: 0, need, done, x: P.x, z: P.z, hp: P.hp, label }; const el = bar(); el.firstChild.textContent = label; el.hidden = false; };
  const stopSearch = msg => { search = null; const el = $('rd-search'); if (el) el.hidden = true; if (msg) R.toast(msg, '#FF9A6A'); };
  const uc0 = R.useChest;
  R.useChest = c => {
    const run = W().run; if (!run || !run.packId || c.state !== 'closed' || c.searched) { if (c.searched) c.searched = 0; return uc0(c); }
    startSearch('搜寶箱……', 1.0 + 0.35 * (c.tier || 0) + 0.15 * (run.grade.lv || 1), () => { c.searched = 1; R.useChest(c); });
  };
  // 遺落的背包：別的勇者留下的（有幾層才有）
  const lostLoot = (o) => {
    const run = W().run, lv = run.grade.lv || 1, pool = ['herb', 'branch', 'iron', 'crystal', 'shell'].filter(k => R.MATS[k]);
    R.dropMat && pool.length && R.dropMat(pool[Math.floor(Math.random() * pool.length)], 1 + Math.floor(Math.random() * 3), o.x, o.z + 0.8);
    if (Math.random() < 0.25 && R.MATS.core) R.dropMat('core', 1, o.x + 0.6, o.z + 0.6);
    { const g = Math.round((15 + Math.random() * 30) * lv); S().gold += g; R.toast('背包裡有 ' + g + ' 費拉。', '#E8C04A'); }
    if (Math.random() < 0.25 && R.rollChest) { const l = R.rollChest(lv - 1, run.floor, S().cls, 0).find(x => x.item);   // 2026-10-04 作者：掉落太多（四成五→兩成五）
      if (l && R.dropItem) R.dropItem(l.item, o.x, o.z + 1.2); }
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const r = lf0(f, o), w = W(), run = w.run, F = w.F; stopSearch();
    if (run && run.packId && eligible(run) && F && F.rooms && F.group) {
      F.lost = []; const cand = F.rooms.filter(rm => rm.type === 'fight'), n = cand.length >= 5 ? (Math.random() < 0.5 ? 2 : 1) : cand.length ? 1 : 0;
      for (let i = 0; i < n && cand.length; i++) {
        const rm = cand.splice(Math.floor(Math.random() * cand.length), 1)[0], [x, z] = R.roomPoint ? R.roomPoint(rm) : [rm.x, rm.z];
        const TH = THREE, g = new TH.Group(), bag = new TH.Mesh(new TH.BoxGeometry(0.8, 0.6, 0.5), new TH.MeshLambertMaterial({ color: '#6A4A2E' })), flap = new TH.Mesh(new TH.BoxGeometry(0.82, 0.12, 0.52), new TH.MeshLambertMaterial({ color: '#4A3420' })), strap = new TH.Mesh(new TH.BoxGeometry(0.1, 0.62, 0.54), new TH.MeshLambertMaterial({ color: '#2A2018' }));
        bag.position.y = 0.3; flap.position.y = 0.62; strap.position.set(0.2, 0.3, 0); g.add(bag, flap, strap); g.position.set(x, 0, z); g.rotation.y = Math.random() * 6; F.group.add(g);
        F.lost.push({ x, z, mesh: g, flap, done: false });
      }
    }
    return r;
  };
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => {
    const best = ni0(), P = W().P, F = W().F; let mine = null, md = 1e9;
    ((F && F.lost) || []).forEach(o => { if (o.done) return; const d = Math.hypot(o.x - P.x, o.z - P.z); if (d < 1.9 && d < md) { md = d; mine = { x: o.x, z: o.z, r: 1.9, label: '搜遺落的背包（別的勇者留下的）', act: () => startSearch('搜遺落的背包……', 2.2, () => { o.done = true; o.flap.rotation.x = -1.2; o.flap.position.z = -0.25; lostLoot(o); R.sfx && R.sfx('chest'); }) }; } });
    if (!mine) return best; if (!best) return mine;
    return Math.hypot(best.x - P.x, best.z - P.z) <= md ? best : mine;
  };
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    if (!search) return; const P = W().P, run = W().run;
    if (!run || run.done || !P || P.dead) return stopSearch();
    if (Math.hypot(P.x - search.x, P.z - search.z) > 0.6) return stopSearch('走開了：搜到一半中斷。');
    if (P.hp < search.hp - 0.5) return stopSearch('被打斷了！');
    search.hp = Math.max(search.hp, P.hp); search.t += dt;
    const el = bar(); el.querySelector('b').style.width = Math.min(100, search.t / search.need * 100) + '%';
    if (search.t >= search.need) { const f = search.done; stopSearch(); f(); }
  };

  // ---------- 保險：入口旁邊的勇者「霧島」 ----------
  const insCost = it => Math.max(5, Math.round(R.sellPrice(it) * 0.25));
  function offer(run) {
    if (W().run !== run || run.done || run.insAsked) return;
    if (R.sheetOpen && R.sheetOpen()) { setTimeout(() => offer(run), 600); return; }
    run.insAsked = 1;
    const s = S(), eq = R.equipped(s.cls), list = R.GEAR_KEYS.map(k => eq[k]).filter(Boolean), pk = run.packId !== 'sack' ? PACKS[run.packId] : null;
    if (!list.length && !pk) return;
    const rows = list.map(it => '<label class="ins-row"><input type="checkbox" data-ins="' + it.id + '"' + (insCost(it) <= s.gold ? ' checked' : '') + '><span style="color:' + R.rarityColor(it) + '">' + esc(R.itemName(it)) + '</span><b>' + insCost(it) + ' 費拉</b></label>').join('')
      + (pk ? '<label class="ins-row"><input type="checkbox" data-ins="pack" checked><span>' + esc(pk.name) + '（背包本身）</span><b>' + Math.round(pk.price * 0.1) + ' 費拉</b></label>' : '');
    R.sheet('<p class="kicker">遺跡入口</p><h2>回收屋・霧島</h2><p>入口旁，一個背著大背包的勇者問你要不要保險。「霧島，我的名字，證件在這裡。你要是倒在裡面，我會去找你留下的裝備。先說，不保證全拿得到，十件大概能找回八件，兩天後送到你的倉庫。」</p>'
      + '<p class="note">保的是身上穿的裝備和背的背包。背包裡撿到的東西保不了。</p><div class="ins-list">' + rows + '</div><p class="note" id="ins-sum"></p>',
      '<div class="row"><button type="button" class="btn pri" id="ins-go">保勾起來的</button><button type="button" class="btn" id="ins-no">不用了</button></div>');
    const box = $('r-sheet'), cost = () => [...box.querySelectorAll('[data-ins]')].filter(c => c.checked).reduce((a, c) => a + (c.dataset.ins === 'pack' ? Math.round(pk.price * 0.1) : insCost(R.itemById(c.dataset.ins))), 0);
    const upd = () => { const c = cost(); $('ins-sum').textContent = '合計 ' + c + ' 費拉（身上有 ' + s.gold + '）'; $('ins-go').disabled = c > s.gold || c === 0; };
    box.querySelectorAll('[data-ins]').forEach(c => { c.onchange = upd; }); upd();
    $('ins-no').onclick = () => { R.closeSheet(); R.toast('霧島：「那就祝你好運。」'); };
    $('ins-go').onclick = () => {
      const c = cost(); if (c > s.gold) return; s.gold -= c;
      run.ins = [...box.querySelectorAll('[data-ins]')].filter(x => x.checked && x.dataset.ins !== 'pack').map(x => x.dataset.ins);
      run.insPack = !!box.querySelector('[data-ins="pack"]:checked'); R.save(); R.closeSheet(); R.toast('霧島：「收到了。真有事我會去找，不過能自己帶回來最好。」', '#E8C04A');
    };
  }

  // ---------- 倒下：背包、裝備、背包本身都留在遺跡裡 ----------
  const rs0 = R.results;
  R.results = (ok, full, lost) => {
    const run = W().run, s = S(); let lostEq = [], back = [], packLost = null;
    if (run && !ok && eligible(run) && run.packId && !run.lossDone) {
      run.lossDone = 1;
      const eq = s.equip[s.cls] || {}, ins = new Set(run.ins || []);
      R.GEAR_KEYS.forEach(k => { const it = eq[k] ? R.itemById(eq[k]) : null; if (!it) return; lostEq.push(it); R.removeItem(it.id); if (ins.has(it.id)) back.push(it); });
      run.bag.forEach(it => { if (ins.has(it.id)) back.push(it); });   // 保了之後在遺跡裡換下來、放進背包的，一樣算
      if (run.packId !== 'sack') { packs(); s.packs[run.packId] = Math.max(0, (s.packs[run.packId] || 0) - 1); packLost = run.packId; if (run.insPack) back.push({ pack: run.packId }); if (!(s.packs[run.packId] > 0)) s.pack = 'sack'; }
      if (back.length) { s.insReturn = s.insReturn || []; s.insReturn.push({ day: (s.day || 0) + 2, list: back }); }
      if (R.ensureKit) R.ensureKit(s.cls);
      R.save();
    }
    const r = rs0(ok, full, lost);
    if (lostEq.length || packLost) {
      const b = $('r-sheet'); if (b) b.querySelectorAll('p.note').forEach(p => { if (p.textContent.includes('身上的裝備還在')) p.innerHTML = '身上的裝備也留在遺跡裡了：' + lostEq.map(it => '<span style="color:' + R.rarityColor(it) + '">' + esc(R.itemName(it)) + '</span>').join('、') + (packLost ? '，還有背的' + esc(PACKS[packLost].name) : '') + '。公會補發了基本的武器和衣服。經驗值還在。' + (back.length ? '<br><b style="color:#E8C04A">霧島保了 ' + back.length + ' 件：兩天後會把撿得回來的放進倉庫。</b>' : ''); });
    }
    return r;
  };
  const nd0 = R.onNewDay;
  R.onNewDay = () => {
    nd0(); const s = S(); if (!s || !s.insReturn || !s.insReturn.length) return;
    const due = s.insReturn.filter(x => x.day <= s.day); if (!due.length) return; s.insReturn = s.insReturn.filter(x => x.day > s.day);
    const got = [], miss = [];
    due.forEach(x => x.list.forEach(o => { if (Math.random() < 0.8) { if (o.pack) { packs(); s.packs[o.pack] = (s.packs[o.pack] || 0) + 1; got.push(PACKS[o.pack].name); } else { s.stash.push(o); got.push(R.itemName(o)); } } else miss.push(o.pack ? PACKS[o.pack].name : R.itemName(o)); }));
    R.save();
    setTimeout(() => R.banner && R.banner('霧島把東西撿回來了', (got.length ? '放進倉庫：' + got.join('、') + '。' : '') + (miss.length ? '「' + miss.join('、') + '……被別人先撿走了，抱歉。」' : '')), 2400);
  };

  // ---------- 公會的商店：背包 ----------
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const tab = document.querySelector('[data-htab][aria-selected="true"]'), body = $('hub-body'); if (!body || !tab || tab.dataset.htab !== 'shop') return;
    const s = S(); packs();
    const sec = document.createElement('div'); sec.className = 'pk-box';
    sec.innerHTML = '<h3>背包</h3><p class="note">遺跡裡撿到的東西都要放進背包的格子；越大的背包裝得越多。倒下的話背的那個會留在遺跡裡（布袋公會會再發）。現在背的是 <b>' + esc(PACKS[s.pack].name) + '</b>。</p><div class="pk-list">'
      + Object.keys(PACKS).map(k => { const p = PACKS[k], n = s.packs[k] || 0; return '<div class="pk-card' + (s.pack === k ? ' on' : '') + '"><b>' + esc(p.name) + '</b><small>' + p.w + '×' + p.h + '＝' + (p.w * p.h) + ' 格' + (k === 'sack' ? '' : '・' + p.price + ' 費拉・有 ' + n + ' 個') + '</small><span>' + esc(p.desc) + '</span><div class="row">'
        + (k !== 'sack' ? '<button type="button" class="btn" data-pkbuy="' + k + '"' + (s.gold < p.price ? ' disabled' : '') + '>買</button>' : '') + (n > 0 && s.pack !== k ? '<button type="button" class="btn pri" data-pkuse="' + k + '">背這個</button>' : s.pack === k ? '<span class="note">背著</span>' : '') + '</div></div>'; }).join('') + '</div>';
    body.prepend(sec);
    sec.querySelectorAll('[data-pkbuy]').forEach(b => { b.onclick = () => { const k = b.dataset.pkbuy, p = PACKS[k]; if (s.gold < p.price) return; s.gold -= p.price; s.packs[k] = (s.packs[k] || 0) + 1; if (s.pack === 'sack') s.pack = k; R.save(); R.sfx && R.sfx('coin'); R.hub(); R.toast('買了' + p.name + '。'); }; });
    sec.querySelectorAll('[data-pkuse]').forEach(b => { b.onclick = () => { s.pack = b.dataset.pkuse; R.save(); R.hub(); }; });
  };

  const css = document.createElement('style');
  css.textContent = '.tk-head{display:flex;align-items:baseline;gap:12px}.tk-head span{opacity:.8}.tk-wrap{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;margin:6px 0}'
    + '.mc-panel{background:#C6C6C6;border:3px solid;border-color:#FFFFFF #555555 #555555 #FFFFFF;padding:8px;border-radius:4px;color:#3A3A3A}.mc-panel .kicker{color:#3A3A3A;margin:0 0 6px}'
    + '.mc-slots{display:grid;grid-template-columns:repeat(2,52px);gap:6px}.mc-slot{width:52px;height:52px;background:#8B8B8B;border:3px solid;border-color:#373737 #FFFFFF #FFFFFF #373737;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative}'
    + '.mc-slot.sel{outline:2px solid #FFE08A}.mc-empty{font-size:11px;color:#3A3A3A;opacity:.75}.mc-slot img,.mc-slot canvas{max-width:40px;max-height:40px;image-rendering:pixelated}'
    + '.tk-gridwrap{max-width:100%;overflow:auto}.tk-grid{display:grid;position:relative;background:#1A1A1E;border:2px solid #4A4A52;padding:0;gap:0;touch-action:none}'
    + '.tk-cell{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)}.tk-item{position:relative;z-index:2;margin:1px;border:1px solid var(--c);background:linear-gradient(160deg,rgba(255,255,255,.10),rgba(0,0,0,.35));display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;cursor:grab;user-select:none}'
    + '.tk-item small{font-size:9px;line-height:1.1;text-align:center;opacity:.9;padding:0 2px;max-height:2.2em;overflow:hidden}.tk-item.sel{outline:2px solid #FFE08A}.tk-item.dragging{opacity:.35}.tk-item img,.tk-item canvas{max-width:34px;max-height:34px;image-rendering:pixelated;pointer-events:none}'
    + '.tk-mat{z-index:1;margin:3px;border-radius:4px;background:color-mix(in srgb,var(--c) 45%,#222);border:1px solid var(--c);position:relative;cursor:pointer}.tk-mat.sel{outline:2px solid #FFE08A;outline-offset:1px}.tk-mat b{position:absolute;right:2px;bottom:0;font-size:11px;text-shadow:0 1px 2px #000}'
    + '.tk-ghost{position:fixed;z-index:99999;pointer-events:none;border:2px solid #7AE07A;background:rgba(122,224,122,.18);display:flex;align-items:center;justify-content:center}.tk-ghost.bad{border-color:#FF6A5A;background:rgba(255,106,90,.18)}'
    + '.tk-info{background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin:6px 0}.tk-info small{display:block;opacity:.85;margin:2px 0 4px}'
    + '#rd-search{position:fixed;left:50%;bottom:22%;transform:translateX(-50%);z-index:60;background:rgba(10,8,14,.82);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:6px 12px;min-width:200px;text-align:center;color:#F1E9DA;pointer-events:none}#rd-search i{display:block;height:6px;background:rgba(255,255,255,.12);border-radius:3px;margin-top:4px;overflow:hidden}#rd-search b{display:block;height:100%;width:0;background:#E8C04A}'
    + '.ins-list{display:grid;gap:4px;margin:6px 0}.ins-row{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;background:var(--bg2);border:1px solid var(--line);border-radius:6px;padding:4px 8px}'
    + '.pk-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;margin-bottom:10px}.pk-card{display:grid;gap:3px;background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:8px 10px}.pk-card.on{border-color:var(--gold,#C9A13A)}.pk-card small{opacity:.85}.pk-card span{font-size:12px;opacity:.8}';
  document.head.appendChild(css);
})(window.R);
