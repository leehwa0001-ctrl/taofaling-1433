// 裝備比較、裝備總覽選格子（2026-10-08 作者：
//   沒穿著的裝備多一個比較功能，正穿著的數值在左邊；飾品有「比較飾品一」「比較飾品二」兩個按鈕；
//   裝備分類刪掉「飾品二」，飾品一有東西就自動放飾品二、飾品二有東西就放飾品一——裝備總覽一樣可以選）
// - 倉庫的卡片：「穿上」旁邊多「比較」（飾品是「比較飾品一」「比較飾品二」）。遺跡裡的背包：選了裝備，下面多同樣的鈕。
// - 比較視窗：左邊＝現在穿著的、右邊＝這一件；下面是換上之後角色總數值的變化（R.calcPlayer 把那一格暫時換掉算一次，算完換回來）。
//   視窗裡可以直接「換上」（倉庫：放進那一格；遺跡裡：照背包原本的穿法）。
// - 倉庫上面的裝備欄（裝備總覽）：每一格多一個「選一件」，列出倉庫裡能放這一格的東西，選了就放進「這一格」（飾品可以指定第一、第二格）。
// 放在 hub.js、acc2.js、raid.js、itemcard.js、stashux.js、charsheet.js 後面。
(function (R) {
  const S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(String(s == null ? '' : s));
  const NAME = k => (k === 'acc' ? '飾品一' : k === 'acc2' ? '飾品二' : (R.GEAR_NAME && R.GEAR_NAME[k]) || k);
  const n1 = v => (Number.isFinite(+v) ? Math.round(v * 10) / 10 : 0);
  const usable = it => !R.canUse || R.canUse(it, S().cls);
  const slotsFor = it => (it.kind === 'acc' ? ['acc', 'acc2'] : [R.slotOf(it)]).filter(k => (R.GEAR_KEYS || []).includes(k));
  // ---------- 角色數值（跟角色總數值同一套算法，只挑會變的） ----------
  const stats = P => {
    const ws = P.ws || {}, w = (P.item && R.WEAPONS[P.item.base]) || {}, hit = (ws.dmg || 0) * (P.dmgMult || 1), per = hit * (ws.pellets || 1) * (w.hits || 1), crit = Math.min(1, ws.crit || 0), cm = P.critMult || 1.5;
    return [
      ['生命', P.hpMax, 0], ['魔力', P.mpMax, 0], ['防禦', P.def, 1], ['魔防', P.mdef, 1], ['移動速度', P.speed, 2],
      ['每一下', hit, 1], ['攻擊速度', ws.rate, 2], ['估計每秒傷害', per * (ws.rate || 1) * (1 + crit * (cm - 1)), 0], ['暴擊率', crit * 100, 1, '%'], ['暴擊傷害', cm, 2, '×'],
      ['攻擊範圍', ws.range, 2], ['技能急速', P.haste, 1], ['穿透', P.pen, 1], ['每秒回魔', R.mpRegenOf ? R.mpRegenOf(P) : P.mpRegen, 1],
      ['受到的傷害減少', ((P.accGuard || 0) + (P.talGuard || 0)) * 100, 1, '%'], ['幸運', P.luck, 0], ['力量', P.str, 0]
    ];
  };
  const calcWith = (k, id) => {
    const s = S(), cls = s.cls, e = s.equip[cls] = s.equip[cls] || {}, old = e[k], other = k === 'acc' ? 'acc2' : k === 'acc2' ? 'acc' : null, oldO = other ? e[other] : null;
    try { e[k] = id; if (other && id && e[other] === id) e[other] = null; return R.calcPlayer(cls); }
    finally { e[k] = old; if (other) e[other] = oldO; }
  };
  const table = (A, B) => {
    const a = stats(A), b = stats(B);
    return '<table class="gc-tab"><tr><th></th><th>現在</th><th>換上之後</th><th></th></tr>' + a.map((r, i) => {
      const x = +r[1] || 0, y = +b[i][1] || 0; if (!x && !y) return '';
      const d = y - x, f = v => (r[3] === '×' ? '×' : '') + v.toFixed(r[2]) + (r[3] === '%' ? '%' : ''), same = Math.abs(d) < Math.pow(10, -r[2]) / 2;
      return '<tr class="' + (same ? 'gc-same' : d > 0 ? 'gc-up' : 'gc-down') + '"><td>' + r[0] + '</td><td>' + f(x) + '</td><td>' + f(y) + '</td><td>' + (same ? '' : (d > 0 ? '▲ +' : '▼ ') + d.toFixed(r[2]) + (r[3] === '%' ? '%' : '')) + '</td></tr>';
    }).join('') + '</table>';
  };
  const card = (it, label) => '<div class="gc-col"><small>' + esc(label) + '</small>' + (it ? '<b style="color:' + R.rarityColor(it) + '">' + (R.itemIconTag ? R.itemIconTag(it, 'card') : '') + esc(R.itemName(it)) + '</b>' + (R.itemInfo ? R.itemInfo(it) : '<p>' + esc(R.itemLines(it).join('・')) + '</p>') : '<p class="note">（空著）</p>') + '</div>';
  // ---------- 視窗 ----------
  const close = () => { const m = $('gc-modal'); if (m) m.hidden = true; };
  const open = html => {
    let m = $('gc-modal'); if (!m) { m = document.createElement('div'); m.id = 'gc-modal'; m.innerHTML = '<div class="gc-box" role="dialog" aria-modal="true"></div>'; m.onclick = ev => { if (ev.target === m) close(); }; document.body.appendChild(m); }
    m.firstChild.innerHTML = html; m.hidden = false; m.firstChild.scrollTop = 0; return m.firstChild;
  };
  document.addEventListener('keydown', ev => { const m = $('gc-modal'); if (ev.key === 'Escape' && m && !m.hidden) { ev.stopPropagation(); ev.preventDefault(); close(); } }, true);
  // o.wear：按「換上」做什麼（沒有就不顯示）
  R.gearCompare = (it, k, o) => {
    o = o || {}; const s = S(); if (!it || !s) return;
    const cur = R.itemById((s.equip[s.cls] || {})[k]);
    let A, B; try { A = calcWith(k, cur ? cur.id : null); B = calcWith(k, it.id); } catch (e) { console.warn('[gearcmp]', e); A = B = null; }
    const box = open('<h2>比較・' + esc(NAME(k)) + '</h2><div class="gc-cols">' + card(cur, '現在穿著的（' + NAME(k) + '）') + card(it, '這一件') + '</div>'
      + (A && B ? '<h3>換上之後，角色總數值</h3>' + table(A, B) + '<p class="note">裝備、被動、天賦、種族、稱號全部算進去；吃東西的加成、戰鬥中的狀態不算。</p>' : '')
      + '<div class="row">' + (o.wear ? '<button type="button" class="btn pri" data-gcwear="1">換上（' + esc(NAME(k)) + '）</button>' : '') + '<button type="button" class="btn" data-gcx="1">關掉</button></div>');
    box.querySelector('[data-gcx]').onclick = close;
    const w = box.querySelector('[data-gcwear]'); if (w) w.onclick = () => { close(); o.wear(); };
  };
  // 倉庫：放進指定的那一格
  const wearAt = (it, k) => {
    const s = S(), e = s.equip[s.cls] = s.equip[s.cls] || {};
    (R.GEAR_KEYS || []).forEach(x => { if (!(x in e)) e[x] = null; if (x !== k && e[x] === it.id) e[x] = null; });
    e[k] = it.id; R.save && R.save(); R.hub();
  };
  const btn = (txt, f, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls || 'btn'; b.textContent = txt; b.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); f(); }; return b; };
  const cmpBtns = (it, wear) => slotsFor(it).map(k => btn(it.kind === 'acc' ? '比較' + NAME(k) : '比較', () => R.gearCompare(it, k, { wear: () => wear(k) }), 'btn gc-btn'));
  // 裝備總覽的「選一件」：倉庫裡能放這一格的東西
  const pick = k => {
    const s = S(), eqIds = R.equippedIds ? R.equippedIds() : new Set();
    const L = s.stash.filter(it => !eqIds.has(it.id) && (it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'charm' || it.kind === 'acc') && usable(it) && slotsFor(it).includes(k))
      .sort((a, b) => (b.identified ? b.rarity : -1) - (a.identified ? a.rarity : -1) || (b.ilvl || 0) - (a.ilvl || 0));
    const box = open('<h2>選一件放「' + esc(NAME(k)) + '」</h2>' + (L.length ? '<div class="gc-list">' + L.map((it, i) => '<div class="gc-li" style="--c:' + R.rarityColor(it) + '">' + (R.itemIconTag ? R.itemIconTag(it) : '') + '<div><b style="color:' + R.rarityColor(it) + '">' + esc(R.itemName(it)) + '</b><small>' + esc(R.itemLines(it).filter(l => !/用$/.test(l)).slice(0, 4).join('・')) + '</small></div><span><button type="button" class="btn pri" data-gcput="' + i + '">放這一格</button><button type="button" class="btn" data-gccmp="' + i + '">比較</button></span></div>').join('') + '</div>' : '<p class="note">倉庫裡沒有能放這一格的東西。</p>')
      + '<div class="row"><button type="button" class="btn" data-gcx="1">關掉</button></div>');
    box.querySelector('[data-gcx]').onclick = close;
    box.querySelectorAll('[data-gcput]').forEach(b => { b.onclick = () => { close(); wearAt(L[+b.dataset.gcput], k); }; });
    box.querySelectorAll('[data-gccmp]').forEach(b => { b.onclick = () => { const it = L[+b.dataset.gccmp]; R.gearCompare(it, k, { wear: () => wearAt(it, k) }); }; });
  };
  // ---------- 倉庫 ----------
  const hub0 = R.hub;
  R.hub = (...a) => {
    const r = hub0(...a);
    try {
      document.querySelectorAll('#hub-body [data-equip]').forEach(b => {
        if (b.dataset.gc) return; b.dataset.gc = 1; const it = R.itemById(b.dataset.equip); if (!it || !usable(it)) return;
        if (it.kind === 'acc') b.textContent = '穿上（' + NAME(R.slotOf(it)) + '）';
        let at = b; cmpBtns(it, k => wearAt(it, k)).forEach(x => { at.after(x); at = x; });
      });
      const sl = [...document.querySelectorAll('#hub-body .slots > .slot')];
      if (sl.length === (R.GEAR_KEYS || []).length) sl.forEach((el, i) => {
        if (el.dataset.gc) return; el.dataset.gc = 1; const k = R.GEAR_KEYS[i];
        const host = el.querySelector(':scope > div') || el; host.appendChild(btn('選一件', () => pick(k), 'mini gc-pick'));
      });
    } catch (e) { console.warn('[gearcmp]', e); }
    return r;
  };
  // ---------- 遺跡裡的背包 ----------
  const bs0 = R.bagSheet;
  if (bs0) R.bagSheet = (...a) => {
    const r = bs0(...a);
    try {
      const run = R.W && R.W.run, eqb = document.querySelector('#r-sheet [data-act="eq"]'), selEl = document.querySelector('#r-sheet .tk-item.sel');
      const it = run && selEl ? run.bag[+selEl.dataset.bi] : null;
      if (eqb && it && usable(it)) { let at = eqb; cmpBtns(it, () => eqb.click()).forEach(x => { at.after(x); at = x; }); }
    } catch (e) { console.warn('[gearcmp]', e); }
    return r;
  };
  const css = document.createElement('style');
  css.textContent = '#gc-modal{position:fixed;inset:0;z-index:9001;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,6,4,.62)}#gc-modal[hidden]{display:none}'
    + '.gc-box{width:min(760px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:16px 18px;border-radius:10px;border:1px solid #5A4A38;background:#1C1714;color:#EDE6DA;box-shadow:0 10px 40px rgba(0,0,0,.6);font-size:14px}'
    + '.gc-box h2{margin:0 0 10px}.gc-box h3{margin:14px 0 6px;color:#E8C870}.gc-box .row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}.gc-box .note{opacity:.7;font-size:12.5px}'
    + '.gc-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}.gc-col{padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);min-width:0}.gc-col>small{display:block;opacity:.65;margin-bottom:4px}.gc-col>b{display:flex;align-items:center;gap:6px;margin-bottom:4px}'
    + '.gc-tab{width:100%;border-collapse:collapse;font-size:13px}.gc-tab th{text-align:right;font-weight:400;opacity:.6;padding:2px 6px}.gc-tab th:first-child{text-align:left}.gc-tab td{padding:3px 6px;text-align:right;border-top:1px solid rgba(255,255,255,.06)}.gc-tab td:first-child{text-align:left}'
    + '.gc-tab tr.gc-same{opacity:.45}.gc-tab tr.gc-up td:last-child{color:#7AE07A}.gc-tab tr.gc-down td:last-child{color:#FF7A6A}.gc-tab td{color:#EDE6DA;font-weight:400}'
    + '.gc-list{display:flex;flex-direction:column;gap:6px}.gc-li{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.12);border-left:3px solid var(--c)}.gc-li small{display:block;opacity:.7;font-size:12px}.gc-li span{display:flex;gap:6px}'
    + '.gc-pick{margin-top:4px}@media (max-width:560px){.gc-cols{grid-template-columns:1fr}.gc-li{grid-template-columns:auto 1fr}.gc-li span{grid-column:1/-1}}';
  document.head.appendChild(css);
})(window.R);
