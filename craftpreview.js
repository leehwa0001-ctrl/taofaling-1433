// 鐵匠鋪「製作」：每一條配方下面先看做出來的數值（2026-10-05 作者：製作頁面不同的裝備要顯示每次製作後，裝備會出現的數值，例如物防魔防之類的）
// - 上面選好要做的東西（武器／防具／護符），每一條配方（鐵製、魔晶、核心、銀細工、赤金、異變……）多一塊「做出來的數值」：
//   照這條配方的物品等級、每一種可能的稀有度各一行（顏色＝稀有度、機率），寫主要數值——
//   武器：傷害（× 幾發、× 幾段）；防具：物防、魔防；護符、飾品：詞綴幾條（飾品再寫本身效果的範圍）。
//   上面一行寫不會變的東西：攻速、彈匣、傷害類型；防具的移動、輕／中／重甲、要的力量。
// - 數字直接用遊戲裡算數值的那套（R.weaponStats、R.armorStats、R.itemLines 的魔防換算），沒有詞綴、沒有強化的樣子；詞綴是隨機的，不算在裡面。
// - 再多一行「身上那件」的同一個數值，方便比較。
// 放在所有包 R.hub、R.itemLines、R.weaponStats 的檔案後面（hubside.js 前面）。
(function (R) {
  const esc = s => R.esc(s), S = () => R.S;
  const n1 = v => (Math.round(v * 10) / 10).toString();
  const WF = { light: 1, medium: 0.5, heavy: 0 }, WN = { light: '輕甲', medium: '中甲', heavy: '重甲' };
  const fake = (kind, base, ilvl, rarity) => ({ id: 'cfprev', kind, base, ilvl, rarity, affixes: [], identified: true, plus: 0, legend: null });
  const mdefOf = it => {
    try { const l = (R.itemLines(it) || []).find(x => /^魔防 \+/.test(x)); if (l) return parseFloat(l.slice(4)); } catch (e) { }
    const a = R.ARMOR[it.base]; return R.armorStats(it).def * (0.5 + (WF[a && a.w] || 0));
  };
  // 一件東西的主要數值（一行字）
  const mainOf = it => {
    if (!it) return '';
    if (it.kind === 'weapon' && R.WEAPONS[it.base]) { const s = R.weaponStats(it), w = R.WEAPONS[it.base]; return '傷害 ' + n1(s.dmg) + (s.pellets > 1 ? ' × ' + s.pellets : '') + (w.hits ? ' × ' + w.hits : ''); }
    if (it.kind === 'armor' && R.ARMOR[it.base]) return '物防 ' + n1(R.armorStats(it).def) + '・魔防 ' + n1(mdefOf(it));
    if (it.kind === 'charm' || it.kind === 'acc') return '沒有基礎數值，看詞綴';
    return '';
  };
  const affN = (kind, r) => { const n = (R.RARITY[r] && R.RARITY[r].affix) || 0; return kind === 'charm' ? Math.max(1, n) : n; };
  const preview = (rc, kind, base) => {
    const ilvl = rc.ilvl, tot = rc.weights.reduce((a, b) => a + (b || 0), 0) || 1, rows = [];
    let fixed = [], note = '';
    if (kind === 'weapon') {
      const w = R.WEAPONS[base]; if (!w) return '';
      const s = R.weaponStats(fake(kind, base, ilvl, 0));
      fixed.push('攻速 ' + n1(s.rate) + ' 次／秒', w.kind === 'magic' ? '魔法傷害' : '物理傷害', '暴擊 ' + Math.round((s.crit || 0.05) * 100) + '%');
      if (w.mag) fixed.push('彈匣 ' + w.mag + ' 發・換彈 ' + w.reload + ' 秒');
      if (w.mp) fixed.push('每發魔力 ' + w.mp);
    } else if (kind === 'armor') {
      const a = R.ARMOR[base]; if (!a) return '';
      fixed.push((R.GEAR_NAME[a.slot] || '防具') + (WN[a.w] ? '・' + WN[a.w] : ''));
      if (a.spd) fixed.push('移動 ' + (a.spd > 0 ? '+' : '') + Math.round(a.spd * 100) + '%');
      try { const need = R.strNeed ? R.strNeed(fake(kind, base, ilvl, 0)) : 0; if (need) { const have = R.strOf ? R.strOf() : null; fixed.push('需要力量 ' + need + (have != null ? '（你有 ' + have + '）' : '')); } } catch (e) { }
      if (a.note) note = a.note;
    } else if (kind === 'acc' && R.ACC && R.ACC[base]) {
      const d = R.ACC[base], df = (R.ACC_AFFIX || []).concat(R.A_AFFIX).find(x => x.id === d.imp), k = 1 + 0.06 * (ilvl - 1);
      if (df) fixed.push('本身：' + df.txt(Math.round(d.r[0] * k) + '～' + Math.round(d.r[1] * k)));
    } else if (kind === 'charm' && R.CHARM2 && R.CHARM2[base]) {
      const d = R.CHARM2[base], df = (R.ACC_AFFIX || []).concat(R.A_AFFIX).find(x => x.id === d.imp), k = 1 + 0.06 * (ilvl - 1);
      if (df) fixed.push('本身：' + df.txt(Math.round(d.r[0] * k) + '～' + Math.round(d.r[1] * k)));
    }
    rc.weights.forEach((wt, r) => {
      if (!wt || !R.RARITY[r]) return;
      const it = fake(kind, base, ilvl, r), m = mainOf(it), n = affN(kind, r), leg = kind === 'weapon' && r >= 4 && (R.LEGENDS || []).some(l => l.base === base);
      rows.push('<div class="cfp-r" style="--c:' + R.RARITY[r].color + '"><span class="cfp-rar">' + esc(R.RARITY[r].name) + '<i>' + Math.round(wt / tot * 100) + '%</i></span><b>' + esc(m || '—') + '</b><span class="cfp-aff">' + (n ? '詞綴 ' + n + ' 條' : '沒有詞綴') + (leg ? '・可能是傳說武器' : '') + '</span></div>');
    });
    let cur = '';
    try {
      const it0 = fake(kind, base, ilvl, 0), slot = R.slotOf(it0), eq = slot && R.equipped(S().cls)[slot];
      if (eq && eq.identified && (kind === 'weapon' || kind === 'armor') && eq.kind === kind) { const m = mainOf(eq); if (m) cur = '<div class="cfp-cur">身上那件（' + esc(R.itemName(eq)) + '）：' + esc(m) + '</div>'; }
    } catch (e) { }
    return '<div class="cfp"><div class="cfp-h">做出來的數值<small>物品等級 ' + ilvl + '</small></div>'
      + (fixed.length ? '<div class="cfp-fix">' + fixed.map(esc).join('・') + '</div>' : '')
      + '<div class="cfp-rows">' + rows.join('') + '</div>' + cur
      + '<div class="cfp-note">' + (note ? esc(note) + '<br>' : '') + '詞綴當場隨機，不算在上面的數字裡' + (kind === 'weapon' ? '；強化每級傷害 +8%' : kind === 'armor' ? '；強化每級防禦 +1.5' : '') + '。</div></div>';
  };
  const build = () => {
    const body = document.getElementById('hub-body'); if (!body) return;
    const on = body.querySelector('.cf-card.on[data-cfpick]'); if (!on) return;
    const [kind, base] = on.dataset.cfpick.split(':');
    body.querySelectorAll('.recipe').forEach(el => {
      const b = el.querySelector('[data-craft]'); if (!b || el.querySelector('.cfp')) return;
      const rc = R.RECIPES[+b.dataset.craft]; if (!rc) return;
      let h = ''; try { h = preview(rc, kind, base); } catch (e) { console.warn('[craftpreview]', e); }
      if (!h) return;
      const box = document.createElement('div'); box.innerHTML = h; el.insertBefore(box.firstChild, b);
    });
  };
  const hub0 = R.hub;
  R.hub = (t, f) => { const r = hub0(t, f); try { build(); } catch (e) { console.warn('[craftpreview]', e); } return r; };

  const css = document.createElement('style');
  css.textContent = [
    '.cfp{display:grid;gap:4px;margin:4px 0 2px;padding:7px 8px;border-radius:7px;background:rgba(255,255,255,.035);border:1px solid var(--line)}',
    '.cfp-h{font-size:12px;font-weight:700;color:var(--gold);display:flex;gap:8px;align-items:baseline}.cfp-h small{font-weight:400;color:var(--dim);font-size:11.5px}',
    '.cfp-fix{font-size:12px;color:#D6CCB8}',
    '.cfp-rows{display:grid;gap:2px}',
    '.cfp-r{display:grid;grid-template-columns:68px max-content 1fr;gap:6px;align-items:center;font-size:12px;padding:2px 6px;border-left:3px solid var(--c);border-radius:4px;background:color-mix(in srgb,var(--c) 9%,transparent)}',
    '.cfp-rar{color:var(--c);font-weight:700;white-space:nowrap}.cfp-rar i{font-style:normal;font-weight:400;color:var(--dim);font-size:11px;margin-left:4px}',
    '.cfp-r b{color:var(--ink);font-size:12.5px;white-space:nowrap}.cfp-aff{color:var(--dim);font-size:11.5px;text-align:right}',
    '.cfp-cur{font-size:11.5px;color:#A8C8E8}.cfp-note{font-size:11px;color:var(--dim)}',
    '@media (max-width:520px){.cfp-r{grid-template-columns:64px 1fr}.cfp-aff{grid-column:1/-1;text-align:left}}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
