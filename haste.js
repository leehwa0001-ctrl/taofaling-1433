// 技能急速（2026-10-04 作者：技能冷卻的系統改成英雄聯盟的計算方式一樣後，所有冷縮基礎上調 2～3 倍）
// - 英雄聯盟的算法：冷卻 = 原本的冷卻 × 100 ÷（100 + 技能急速）。急速是相加的，越疊越不明顯，永遠到不了 0：
//   +25 → 冷卻 −20%、+50 → −33%、+100 → 減半、+200 → 剩三分之一。
// - 原本每個「技能冷卻 −X%」的來源都換成「技能急速 +X×2.5」（R.HASTE_K）：詞綴「專注」、被動、天賦、技能點天賦、轉職、二轉、
//   種族、套裝、裝備（法袍）、領主裝備、熱飲、餐廳的咖啡。例如 −10% → 技能急速 +25（冷卻 −20%）。
// - 程式不用一個一個改：算數值（R.calcPlayer）的時候 P.skillCdMult 是一個「接收器」——誰寫 P.skillCdMult *= 1 − v，就記成急速 +v×100×2.5；
//   寫 *= 1 + v（代價，例如天賦「狂速」）照舊是乘的。算完（最外面）換回普通的數字：讀 P.skillCdMult 就是最後的倍率，P.haste 是急速。
// - 不算急速、照舊乘的：魔力潮（場地效果，冷卻 −30%，ruinvar.js 用 R.cdMul）、祭壇的「靈之祝福」（遺跡裡當場乘）、技能熟練的星（每星 −5%）。
// - 說明文字：開頁的時候把資料裡的「技能冷卻 −X%」換成「技能急速 +N」（R.hasteTxt）。
// - 2026-10-05 作者：裝備的技能急速堆了快 300，角色總數值只有 75——combat.js 把詞綴「專注」算成「冷卻 × (1 − 合計％)」，
//   合計超過 100％（急速超過 250）的時候變成 0 或負數，這裡原本就整個不算了。現在直接照合計％換算成急速，多少都算。
// 放在 combat.js 後面（包 R.calcPlayer 最裡面）。
(function (R) {
  const K = R.HASTE_K = 2.5;
  const cdOf = R.hasteCd = h => 100 / (100 + Math.max(0, h || 0));
  // 只乘、不算急速（場地效果）
  R.cdMul = (P, f) => { if (P.hasteSt) P.hasteSt.mul *= f; else P.skillCdMult *= f; };
  const arm = P => {
    const st = { haste: 0, mul: 1 };
    const add = f => { if (!(f > 0)) return; if (f < 1) st.haste += (1 - f) * 100 * K; else if (f > 1) st.mul *= f; };
    const get = () => st.mul * cdOf(st.haste);
    Object.defineProperty(P, 'skillCdMult', { configurable: true, enumerable: true, get, set: v => { const o = get(); if (o > 0 && v > 0) add(v / o); } });
    Object.defineProperty(P, 'haste', { configurable: true, enumerable: true, get: () => st.haste, set: v => { st.haste = Math.max(0, +v || 0); } });
    Object.defineProperty(P, 'hasteSt', { configurable: true, writable: true, enumerable: false, value: st });
    return add;
  };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const m0 = typeof P.skillCdMult === 'number' ? P.skillCdMult : 1, wx = P.adv === 'waixiu' ? 0.85 : 1, add = arm(P), base = m0 / wx;
      if (base < 1) P.haste += (1 - base) * 100 * K; else add(base);   // 1 − 專注合計％（超過 100％ 也照算）
      add(wx);
    } catch (e) { console.warn('[haste]', e); }
    return P;
  };

  // ---------- 說明文字 ----------
  const RE = /技能冷卻\s*[−-]\s*(\d+(?:\.\d+)?)%/g, f2 = v => String(Math.round(v * 100) / 100);
  const txt = R.hasteTxt = s => (typeof s === 'string' && s.indexOf('技能冷卻') >= 0 ? s.replace(RE, (m, v) => '技能急速 +' + f2(v * K)) : s);
  const deep = (o, seen) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o);
    Object.keys(o).forEach(k => { const v = o[k]; if (typeof v === 'string') { const t = txt(v); if (t !== v) try { o[k] = t; } catch (e) { } } else if (v && typeof v === 'object') deep(v, seen); });
  };
  const start = () => {
    try {
      const seen = new Set();
      [R.PASSIVE_LIST, R.PASSIVES, R.TALENT_TREE, R.TALENTS, R.ADV, R.ARMOR, R.SETS, R.LORD_GEAR].forEach(o => deep(o, seen));
      ['W_AFFIX', 'A_AFFIX', 'ACC_AFFIX'].forEach(k => (R[k] || []).forEach(a => { if (a && typeof a.txt === 'function') { const t0 = a.txt; a.txt = v => txt(t0(v)); } }));
      const ao = R.ADV2_OPTS; if (ao) R.ADV2_OPTS = cls => (ao(cls) || []).map(o => (o && o.desc && o.desc.indexOf('技能冷卻') >= 0 ? Object.assign({}, o, { desc: txt(o.desc) }) : o));
      const rb = R.raceBonusText; if (rb) R.raceBonusText = id => { const r = rb(id); return Array.isArray(r) ? r.map(txt) : txt(r); };
      // 算完換回普通的數字（包在最外面）
      const cp = R.calcPlayer;
      R.calcPlayer = cls => {
        const P = cp(cls);
        try { if (P && P.hasteSt) { const m = P.skillCdMult, h = Math.round(P.haste * 10) / 10; delete P.skillCdMult; delete P.haste; P.skillCdMult = m; P.haste = h; } } catch (e) { console.warn('[haste]', e); }
        return P;
      };
    } catch (e) { console.warn('[haste]', e); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window.R);
