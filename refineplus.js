// 討伐令 1433：極限精煉 +11～+15（2026-10-04 後期檢查：錢和素材到後面用不完；精煉到 +10 最多只要五百多費拉）
// - 鐵匠鋪「精煉・重鑄・附魔」頁：+10 的裝備多一個「極限精煉」按鈕，最多 +15。每 +1 一樣是詞綴效果 +8%（crafting.js 的 mult）、防具防禦 +1.5。
// - 很貴，而且會失敗：+11 一定成功，+12 八成、+13 六成、+14 四成五、+15 三成。失敗的時候錢和素材照扣，等級不會掉。
//   素材：純晶、赤金、魔力核心（轉職也要用的那個）。
// 放在 crafting.js、forgeui.js 後面。
(function (R) {
  const S = () => R.S, esc = s => R.esc(s), MAX = 15;
  const COST = { 11: [6000, 4, 2, 1, 1], 12: [12000, 6, 3, 1, 0.8], 13: [25000, 8, 4, 2, 0.6], 14: [50000, 10, 5, 2, 0.45], 15: [100000, 12, 6, 3, 0.3] };
  R.refinePlusPrice = it => { const c = COST[(it.plus || 0) + 1]; return c ? { gold: c[0], mats: { purecry: c[1], redgold: c[2], core: c[3] }, rate: c[4] } : null; };
  const can = c => { const s = S(); return s.gold >= c.gold && Object.keys(c.mats).every(k => (s.mats[k] || 0) >= c.mats[k]); };
  const matsTxt = m => Object.keys(m).map(k => esc(R.MATS[k] ? R.MATS[k].name : k) + ' ' + (S().mats[k] || 0) + '／' + m[k]).join('・');
  R.refinePlus = it => {
    if (!it || !it.identified || it.plus < 10 || it.plus >= MAX) return null; const c = R.refinePlusPrice(it); if (!c || !can(c)) return null;
    const s = S(); s.gold -= c.gold; Object.keys(c.mats).forEach(k => { s.mats[k] -= c.mats[k]; });
    const ok = Math.random() < c.rate; if (ok) it.plus++; R.save && R.save(); return ok ? 'ok' : 'fail';
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    const r = hub0(t, f);
    try {
      document.querySelectorAll('#hub-body .item-card[data-iid]').forEach(card => {
        const it = R.itemById(card.dataset.iid); if (!it || it.plus < 10 || card.querySelector('[data-rfp]')) return;
        const row = card.querySelector('.row'); if (!row) return;
        const b = document.createElement('button'); b.type = 'button'; b.dataset.rfp = it.id;
        if (it.plus >= MAX) { b.className = 'btn'; b.disabled = true; b.textContent = '已經是極限（+' + MAX + '）'; }
        else { const c = R.refinePlusPrice(it); b.className = 'btn gold'; b.disabled = !can(c); b.textContent = '極限精煉到 +' + (it.plus + 1) + '（成功率 ' + Math.round(c.rate * 100) + '%・' + c.gold.toLocaleString() + ' 費拉・' + matsTxt(c.mats) + '）'; }
        b.onclick = () => {
          const c = R.refinePlusPrice(it); if (!c) return;
          if (c.rate < 1 && !confirm('成功率 ' + Math.round(c.rate * 100) + '%。失敗的話錢和素材照扣（等級不會掉）。要試嗎？')) return;
          const res = R.refinePlus(it); if (!res) return;
          R.sfx && R.sfx(res === 'ok' ? 'magic' : 'hit');
          R.hub(); R.say && R.say(res === 'ok' ? '極限精煉成功：' + R.itemName(it) : '失敗了……老岩搖搖頭：「火候差一點。」（' + R.itemName(it) + ' 還是 +' + it.plus + '）', res === 'ok' ? R.rarityColor(it) : '#B8B0A0');
        };
        const first = row.querySelector('[data-refine],[data-reforge]'); row.insertBefore(b, first || row.firstChild);
        // 原本那一行「先在強化做到 +5」不會出現；+10 的時候 crafting.js 不放精煉鈕
      });
    } catch (e) { console.warn('[refineplus]', e); }
    return r;
  };
})(window.R);
