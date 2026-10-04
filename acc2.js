// 第二個飾品欄、新的飾品（2026-10-05 作者：再開一個飾品欄，可能有手環或戒指，你可以再新增）
// - 裝備欄多一格「飾品二」（R.GEAR_KEYS 加 acc2）：戒指、項鍊、手環……什麼飾品都能戴，兩格可以戴同一種（兩個戒指也行）。
//   能力（詞綴、強化、寶石）照算：calcPlayer、角色總數值都是看 R.GEAR_KEYS 加起來的。
// - 戴上去：第一格空著戴第一格；第一格有了、第二格空著，戴第二格；兩格都有，換掉第一格（R.slotOf 照這個順序回答，
//   倉庫、遺跡裡的背包都照這個）。倉庫的飾品多一個「戴在飾品二」的鈕，可以直接換第二格。
// - 新的飾品三種（寶箱會掉、飾品工房做得出來）：腳鍊（輕身＝移動）、臂環（穿透）、墜飾（回魔）。
// 放在 crafting.js、raid.js、hub.js 後面。
(function (R) {
  const S = () => R.S, $ = id => document.getElementById(id);
  if (!R.GEAR_KEYS.includes('acc2')) R.GEAR_KEYS.push('acc2');
  R.GEAR_NAME.acc2 = '飾品二';
  // ---------- 戴在哪一格 ----------
  const so0 = R.slotOf;
  R.slotOf = it => {
    const k = so0(it); if (k !== 'acc') return k;
    const s = S(), e = (s && s.equip && s.equip[s.cls]) || {};
    if (it && e.acc === it.id) return 'acc'; if (it && e.acc2 === it.id) return 'acc2';
    return e.acc && R.itemById(e.acc) && !(e.acc2 && R.itemById(e.acc2)) ? 'acc2' : 'acc';
  };
  // 倉庫：飾品多一個「戴在飾品二」
  const hub0 = R.hub;
  R.hub = (...a) => {
    const r = hub0(...a);
    try {
      const s = S();
      document.querySelectorAll('[data-equip]').forEach(b => {
        const it = R.itemById(b.dataset.equip); if (!it || it.kind !== 'acc' || b.parentNode.querySelector('[data-equip2]')) return;
        const b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'btn'; b2.dataset.equip2 = it.id; b2.textContent = '戴在飾品二';
        b2.onclick = () => { const e = s.equip[s.cls] = s.equip[s.cls] || {}; if (e.acc === it.id) e.acc = null; e.acc2 = it.id; R.save && R.save(); R.hub(); };
        b.after(b2);
      });
    } catch (e) { console.warn('[acc2]', e); }
    return r;
  };
  // ---------- 新的飾品 ----------
  Object.assign(R.ACC, {
    anklet: { name: '腳鍊', imp: 'fleet', r: [3, 6] },
    armlet: { name: '臂環', imp: 'pen2', r: [5, 12] },
    pendant: { name: '墜飾', imp: 'mpregen2', r: [3, 8] }
  });
  (R.ACC_RECIPES || []).push(
    { name: '銀腳鍊', kind: 'acc', base: 'anklet', ilvl: 4, mats: { silver: 2, thread: 2 }, gold: 90, weights: [0, 50, 40, 10, 0, 0], note: '走起路來會輕輕響。' },
    { name: '鐵臂環', kind: 'acc', base: 'armlet', ilvl: 5, mats: { iron: 4, leather: 2, manaore: 2 }, gold: 140, weights: [0, 40, 45, 15, 0, 0], extra: 'might' },
    { name: '晶石墜飾', kind: 'acc', base: 'pendant', ilvl: 6, mats: { crystal: 3, silverbar: 1, thread: 1 }, gold: 200, weights: [0, 0, 50, 40, 10, 0], extra: 'wisdom' },
    { name: '赤金臂環', kind: 'acc', base: 'armlet', ilvl: 8, mats: { redgold: 3, purecry: 1, leather: 2 }, gold: 420, weights: [0, 0, 10, 50, 35, 5], extra: 'keen' }
  );
  // 圖示（crafting.js 的畫法只認得原本那幾種）
  const MAT = [['#D4D8E0', '#8A909A', '#5A606A'], ['#E8EEF6', '#B8C0CC', '#6A7280'], ['#FFE08A', '#E09A3A', '#9A4A1E']], GEM = ['#9AF0FF', '#C8A0FF', '#FF8A6A'];
  const draw = (base, tier) => {
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'), m = MAT[tier] || MAT[0], gm = GEM[tier] || GEM[0];
    const rc = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const circ = (a, b, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
    if (base === 'anklet') { for (let i = 0; i <= 8; i++) { const t = i / 8; rc(Math.round(1 + 14 * t), Math.round(6 + 4 * Math.sin(t * Math.PI)), 1, 1, i % 2 ? m[0] : m[1]); } [4, 8, 12].forEach((a, i) => { rc(a, 11 + (i === 1 ? 1 : 0), 1, 2, m[2]); circ(a + 0.5, 14 + (i === 1 ? 1 : 0), 1.2, gm); }); }
    else if (base === 'armlet') { rc(3, 5, 10, 6, m[1]); rc(3, 5, 10, 1, m[0]); rc(3, 10, 10, 1, m[2]); rc(6, 6, 4, 4, m[2]); circ(8, 8, 1.6, gm); rc(4, 7, 1, 2, m[0]); rc(11, 7, 1, 2, m[0]); }
    else if (base === 'pendant') { x.strokeStyle = m[1]; x.lineWidth = 1; x.beginPath(); x.moveTo(3, 1); x.lineTo(8, 7); x.lineTo(13, 1); x.stroke(); rc(7, 6, 2, 2, m[0]); x.fillStyle = gm; x.beginPath(); x.moveTo(8, 8); x.lineTo(11, 11); x.lineTo(8, 15); x.lineTo(5, 11); x.closePath(); x.fill(); rc(7, 10, 1, 2, '#FFFFFF'); }
    // 外框（跟 crafting.js 一樣）
    const img = x.getImageData(0, 0, 16, 16), d = img.data, solid = new Uint8Array(256);
    for (let i = 0; i < 256; i++) { if (d[i * 4 + 3] >= 110) { d[i * 4 + 3] = 255; solid[i] = 1; } else d[i * 4 + 3] = 0; }
    for (let i = 0; i < 256; i++) { if (solid[i]) continue; const px = i % 16, py = (i - px) / 16; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const qx = px + a, qy = py + b; return qx >= 0 && qy >= 0 && qx < 16 && qy < 16 && solid[qy * 16 + qx]; })) { d[i * 4] = 20; d[i * 4 + 1] = 16; d[i * 4 + 2] = 14; d[i * 4 + 3] = 255; } }
    x.putImageData(img, 0, 0); return c;
  };
  const NEWB = { anklet: 1, armlet: 1, pendant: 1 }, cache = {}, iu0 = R.itemIconURL;
  if (iu0) R.itemIconURL = (it, k) => {
    if (!it || it.kind !== 'acc' || !NEWB[it.base]) return iu0(it, k);
    k = k || 3; const tier = R.tierOf ? R.tierOf(it.ilvl) : 0, key = it.base + ':' + tier + ':' + k; if (cache[key]) return cache[key];
    const src = draw(it.base, tier), c = document.createElement('canvas'); c.width = c.height = 16 * k; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, 16 * k, 16 * k);
    return (cache[key] = c.toDataURL());
  };
})(window.R);
