// 裝備說明的格式統一（2026-10-04 作者：背包中裝備顯示的部分，希望不同裝備的格式能夠統一，不然要慢慢找武器的等級為多少挺麻煩的）
// 原本 R.itemLines 一行一行接起來（遺跡的背包用「・」接成一長串），武器、防具、飾品的順序都不一樣，「物品等級」夾在中間。
// 現在每一件都一樣：
//   第一行：等級（Lv，固定在最前面）・稀有度・種類（武器・大劍／頭／飾品・○○）・強化 +N・誰能用
//   第二行：主要數值（武器的傷害和攻速、防具的防禦）粗體
//   下面：詞綴、附魔、套裝、寶石、領主體……一行一個
// R.itemInfo(it, extra) 回傳這一塊 HTML；遺跡的背包（raid.js）、倉庫和鐵匠鋪的卡片（hub.js、crafting.js）都用它。
// 放在所有包 R.itemLines 的檔案後面（只在畫面上用，順序其實不影響）。
(function (R) {
  const esc = s => R.esc(s);
  const kindOf = it => {
    if (it.kind === 'weapon') return '武器・' + R.baseName(it);
    if (it.kind === 'armor') { const a = R.ARMOR && R.ARMOR[it.base]; return (R.GEAR_NAME && a && R.GEAR_NAME[a.slot] || '防具') + '・' + R.baseName(it); }
    const k = it.kind === 'acc' ? '飾品' : '護符', n = R.baseName(it); return n === k ? k : k + '・' + n;
  };
  R.itemSplit = it => {
    const L = (R.itemLines ? R.itemLines(it) : []).slice(), take = re => { const i = L.findIndex(l => re.test(l)); return i >= 0 ? L.splice(i, 1)[0] : null; };
    take(/^物品等級/);
    const uses = it.kind === 'weapon' ? take(/用$/) : null;
    if (it.kind === 'acc' || it.kind === 'charm') take(/^(飾品|護符)・/);
    if (it.kind === 'charm') take(/^護符$/);
    const main = take(/^傷害 |・防禦 |^防禦 /);
    return { uses, main, rest: L.map(l => l.replace(/^・/, '')) };
  };
  R.itemInfo = (it, extra) => {
    const s = R.itemSplit(it), rar = it.identified ? R.RARITY[it.rarity].name : '未鑑定';
    const meta = '<span class="ii-lv">Lv ' + it.ilvl + '</span><span class="ii-rar" style="color:' + R.rarityColor(it) + '">' + esc(rar) + '</span><span>' + esc(kindOf(it)) + '</span>' + (it.plus ? '<span class="ii-plus">+' + it.plus + '</span>' : '') + (s.uses ? '<span class="ii-use">' + esc(s.uses) + '</span>' : '');
    return '<div class="ii"><div class="ii-meta">' + meta + '</div>' + (s.main ? '<div class="ii-main">' + esc(s.main.replace(/^(帽子|上衣|褲子|鞋子)・/, '')) + '</div>' : '')
      + (s.rest.length || extra ? '<ul class="ii-list">' + s.rest.map(l => '<li>' + esc(l) + '</li>').join('') + (extra ? '<li class="ii-x">' + extra + '</li>' : '') + '</ul>' : '') + '</div>';
  };
  const css = document.createElement('style');
  css.textContent = [
    '.ii{display:grid;gap:3px;min-width:0}',
    '.ii-meta{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;font-size:12px;color:var(--dim)}',
    '.ii-lv{font-weight:700;color:#141018;background:#E8C04A;border-radius:5px;padding:0 6px;font-size:12px;line-height:18px}',
    '.ii-rar{font-weight:700}.ii-plus{color:#7AE0A0;font-weight:700}.ii-use{color:#A8A0B8}',
    '.ii-main{font-weight:700;font-size:13px;color:var(--ink)}',
    '.ii-list{list-style:none;margin:2px 0 0;padding:0;display:grid;gap:1px;font-size:12px;color:#D6CCB8}.ii-list li::before{content:"・";color:var(--dim)}.ii-list li.ii-x{color:var(--dim)}.ii-list li.ii-x::before{content:""}',
    '.tk-item .tk-lv{position:absolute;left:2px;top:1px;font-style:normal;font-size:9.5px;font-weight:700;line-height:12px;padding:0 3px;border-radius:3px;background:rgba(10,8,14,.78);color:#E8C04A;pointer-events:none;z-index:1}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
