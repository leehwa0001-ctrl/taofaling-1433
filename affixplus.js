// 詞條：紅武（神話）多一點、可以洗一條、可以加一條（2026-10-04 作者：紅武的詞條太少，而且可以加可以洗詞條）
// - 詞條數：傳說 3→4、神話 4→6。倉庫裡已經有的傳說、神話會補到新的條數（只補一次，it.topped）。
// - 鐵匠鋪的「精煉・重鑄」那一頁，每件多兩個按鈕：
//   洗一條：挑一條詞條，換成這件裝備還沒有的另一條（數值重骰）。比重鑄便宜，其他條不動。
//   加一條：史詩以上可以多一條詞條，最多比這個稀有度原本的條數多 2 條（要魔力核心、高純度魔力水晶）。
// - 傳說武器的招牌（第一條、legend 那條）、附魔那條不會被洗掉。
// 放在 items.js、crafting.js、gearplus.js 後面（包 R.hub 最外面一點）。
(function (R) {
  const S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s), rnd = Math.random;
  if (R.RARITY[4]) R.RARITY[4].affix = Math.max(R.RARITY[4].affix, 4);
  if (R.RARITY[5]) R.RARITY[5].affix = Math.max(R.RARITY[5].affix, 6);
  const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const poolOf = it => (it.kind === 'weapon' ? R.W_AFFIX : R.A_AFFIX).filter(a => !(a.ranged && !['gun', 'bow', 'magic'].includes(R.WEAPONS[it.base] && R.WEAPONS[it.base].kind)) && !(a.melee && !['melee', 'thrust'].includes(R.WEAPONS[it.base] && R.WEAPONS[it.base].kind)) && !a.curse);
  const newAffix = it => { const have = new Set(it.affixes.map(a => a.id)), c = poolOf(it).filter(a => !have.has(a.id)); if (!c.length) return null; const a = c[Math.floor(rnd() * c.length)]; return { id: a.id, v: rint(a.roll[0], a.roll[1]) }; };
  const locked = (it, i) => (i === 0 && it.legend) || (it.enchant && it.affixes[i] && it.affixes[i].id === it.enchant);
  const maxOf = it => ((R.RARITY[it.rarity] && R.RARITY[it.rarity].affix) || 0) + 2;
  // 舊的傳說、神話：補到新的條數
  const topUp = () => { const s = S(); if (!s || !s.stash) return; let n = 0; s.stash.concat(Object.values(s.equip || {}).flatMap(e => Object.values(e || {})).map(id => R.itemById ? R.itemById(id) : null)).forEach(it => { if (!it || it.topped || !(it.kind === 'weapon' || it.kind === 'armor') || it.rarity < 4) return; it.topped = 1; while (it.affixes.length < R.RARITY[it.rarity].affix) { const a = newAffix(it); if (!a) break; it.affixes.push(a); n++; } }); if (n) R.save(); };
  // 價錢
  const can = c => { const s = S(); return s.gold >= c.gold && Object.keys(c.mats || {}).every(k => (s.mats[k] || 0) >= c.mats[k]); };
  const pay = c => { const s = S(); s.gold -= c.gold; Object.keys(c.mats || {}).forEach(k => { s.mats[k] -= c.mats[k]; }); };
  const matsTxt = m => Object.keys(m || {}).map(k => (R.MATS[k] ? R.MATS[k].name : k) + ' ' + m[k]).join('・');
  const rollPrice = it => ({ gold: 200 + 150 * it.rarity, mats: { crystal: 3 + it.rarity } });
  const addPrice = it => ({ gold: 800 + 600 * it.rarity, mats: { core: 1, purecry: 2 } });
  R.affixRoll = (it, i) => { if (!it || locked(it, i) || !can(rollPrice(it))) return false; const a = newAffix(it); if (!a) return false; pay(rollPrice(it)); it.affixes[i] = a; R.save(); return a; };
  R.affixAdd = it => { if (!it || it.rarity < 3 || it.affixes.length >= maxOf(it) || !can(addPrice(it))) return false; const a = newAffix(it); if (!a) return false; pay(addPrice(it)); it.affixes.push(a); R.save(); return a; };
  const rollSheet = it => {
    const c = rollPrice(it);
    R.hubSheet('<p class="kicker">鐵匠鋪</p><h2>洗一條：' + esc(R.itemName(it)) + '</h2><p class="note">挑一條換掉（換成這件還沒有的另一條，數值重骰）。每次 ' + c.gold + ' 費拉・' + matsTxt(c.mats) + '。</p><div class="recipes">'
      + it.affixes.map((a, i) => { const d = R.affixDef(it, a.id); return '<div class="recipe"><b>' + esc(d ? d.txt(a.v) : a.id) + '</b>' + (locked(it, i) ? '<small>傳說的招牌、附魔不能洗</small>' : '<button type="button" class="btn" data-afr="' + i + '"' + (can(c) ? '' : ' disabled') + '>洗這條</button>') + '</div>'; }).join('') + '</div>',
      '<div class="row"><button type="button" class="btn" id="afr-x">好了</button></div>');
    $('afr-x').onclick = () => R.hubSheetClose();
    document.querySelectorAll('[data-afr]').forEach(b => { b.onclick = () => { const a = R.affixRoll(it, +b.dataset.afr); if (a) { const d = R.affixDef(it, a.id); R.toast && R.toast('換成了：' + (d ? d.txt(a.v) : a.id), '#E8C04A'); R.sfx && R.sfx('magic'); } rollSheet(it); }; });
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try {
      topUp();
      document.querySelectorAll('#hub-body [data-reforge]').forEach(rb => {
        const it = R.itemById(rb.dataset.reforge); if (!it || rb.parentNode.querySelector('[data-afroll]')) return;
        const r = document.createElement('span');
        const cr = rollPrice(it), ca = addPrice(it), full = it.affixes.length >= maxOf(it);
        r.innerHTML = (it.affixes.length ? '<button type="button" class="btn" data-afroll="' + it.id + '">洗一條（' + cr.gold + ' 費拉・' + matsTxt(cr.mats) + '）</button>' : '')
          + (it.rarity >= 3 ? '<button type="button" class="btn" data-afadd="' + it.id + '"' + (full || !can(ca) ? ' disabled' : '') + ' title="' + (full ? '這件已經是最多條了' : '') + '">' + (full ? '詞條已滿（' + it.affixes.length + ' 條）' : '加一條（' + ca.gold + ' 費拉・' + matsTxt(ca.mats) + '）') + '</button>' : '');
        rb.after(r);
        const b1 = r.querySelector('[data-afroll]'); if (b1) b1.onclick = () => rollSheet(it);
        const b2 = r.querySelector('[data-afadd]'); if (b2) b2.onclick = () => { const a = R.affixAdd(it); if (a) { const d = R.affixDef(it, a.id); R.toast && R.toast('多了一條：' + (d ? d.txt(a.v) : a.id), '#E8C04A'); R.sfx && R.sfx('magic'); } R.hub(t, f); };
      });
    } catch (e) { console.warn('[affixplus]', e); }
  };
})(window.R);
