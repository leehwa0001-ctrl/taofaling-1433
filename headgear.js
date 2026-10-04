// 帽子各有各的樣子、圖示、效果（2026-10-05 作者：斗笠和羽冠和法冠，沒有分別）
// 原因：角色身上的帽子只看輕、中、重（sprites.js），斗笠、羽冠、法冠都是輕的，畫出來是同一頂草帽；
//   圖示羽冠是草帽加一根羽毛、法冠直接借斗笠的；效果只有法冠有（魔力 +15%）。
// 現在：
// - 畫法（R.HEAD_DRAW，sprites.js 照帽子的種類找）：斗笠照舊（寬的草帽）；羽冠＝藍色的圓帽、金邊、後面插一根大白羽毛；
//   法冠＝高高尖尖的白色法冠、金邊、中間金色的十字紋；角盔＝鐵兜兩邊長出彎角。
// - 圖示：羽冠、法冠重畫（gear.js 的 R.ICON_EXTRA），法冠不再借斗笠的、角盔不再借鐵兜的。
// - 效果：斗笠＝遮陽擋砂，場地效果、機關、落石的傷害 −30%（沒有來源、或來源不是遺跡生物的傷害）；
//   羽冠＝暴擊率 +5%（原本的移動 +1% 照舊）；法冠＝魔力 +15%（照舊）。說明寫在裝備的說明裡（gearplus.js 的 note）。
// 放在 gearplus.js、gearmore.js 後面。
(function (R) {
  const W = () => R.W;
  // ---------- 畫在角色身上 ----------
  R.HEAD_DRAW = Object.assign(R.HEAD_DRAW || {}, {
    head_plume: (p, { side, back, lt, dk }) => {
      const s = '#3A6A8A', g = '#E8C04A', f = '#F4F4FF';
      p(4, 0, 8, 2, s); p(5, -1, 6, 1, lt(s)); p(3, 2, 10, 1, g); p(4, 1, 8, 1, dk(s));
      if (side) { p(2, -3, 2, 4, f); p(1, -5, 2, 3, f); p(0, -6, 1, 2, '#9AC8F0'); }      // 羽毛插在後面
      else { p(back ? 4 : 11, -4, 2, 5, f); p(back ? 3 : 12, -6, 2, 3, f); p(back ? 3 : 12, -7, 1, 1, '#9AC8F0'); }
    },
    head_mitre: (p, { side, back, lt, dk }) => {
      const s = '#F2EEE4', g = '#E8C04A';
      p(4, -2, 8, 4, s); p(5, -4, 6, 2, s); p(6, -6, 4, 2, s); p(7, -7, 2, 1, s); p(4, -2, 1, 4, dk(s));
      p(4, 1, 8, 1, g); if (!back) { p(7, -5, 2, 6, g); p(6, -3, 4, 1, g); }
      if (side) p(11, -1, 1, 3, dk(s));
    },
    head_horn: (p, { side, back, lt, dk }) => {
      const s = '#B8C0C8', h = '#E8E0CC';
      p(3, 0, 10, 4, s); p(3, 0, 10, 1, lt(s)); p(11, 1, 2, 3, dk(s)); if (!back) p(4, 4, side ? 3 : 8, 1, dk(dk(s)));
      if (side) { p(5, -2, 2, 2, h); p(4, -4, 2, 2, h); p(3, -5, 1, 1, dk(h)); }
      else { p(1, -1, 2, 2, h); p(0, -3, 2, 2, h); p(0, -4, 1, 1, dk(h)); p(13, -1, 2, 2, h); p(14, -3, 2, 2, h); p(15, -4, 1, 1, dk(h)); }
    }
  });
  // ---------- 圖示 ----------
  R.ICON_EXTRA = Object.assign(R.ICON_EXTRA || {}, {
    head_plume: ({ rc, ln, circ }) => { circ(8, 10, 5, '#3A6A8A'); rc(3, 10, 11, 4, '#3A6A8A'); rc(3, 12, 11, 2, '#E8C04A'); rc(5, 8, 3, 1, '#5A8AAA'); ln(10, 9, 14, 1, '#F4F4FF', 3); ln(11, 8, 15, 2, '#9AC8F0', 1); },
    head_mitre: ({ rc, poly }) => { poly([[3, 14], [8, 1], [13, 14]], '#F2EEE4'); rc(3, 13, 11, 2, '#E8C04A'); rc(7, 4, 2, 9, '#E8C04A'); rc(5, 8, 6, 2, '#E8C04A'); poly([[3, 14], [8, 1], [6, 14]], '#D8D2C4'); }
  });
  if (R.ARMOR.head_mitre) delete R.ARMOR.head_mitre.icon;   // 不再借斗笠的圖示
  if (R.ARMOR.head_horn) delete R.ARMOR.head_horn.icon;     // 角盔用 gearmore.js 畫的（有角），不借鐵兜的
  // ---------- 效果 ----------
  const A = R.ARMOR;
  if (A.head_light) { A.head_light.fx = Object.assign({}, A.head_light.fx, { env: 0.3 }); A.head_light.note = '遮陽擋砂：場地效果、機關、落石的傷害 −30%'; }
  if (A.head_plume) { A.head_plume.fx = Object.assign({}, A.head_plume.fx, { crit: 0.05 }); A.head_plume.note = '暴擊率 +5%、移動 +1%'; }
  const headFx = cls => { try { const it = R.equipped(cls || R.S.cls).head, a = it && A[it.base]; return (a && a.fx) || {}; } catch (e) { return {}; } };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls), fx = headFx(cls);
    if (fx.crit && P.ws) P.ws.crit = (P.ws.crit || 0) + fx.crit;
    P.envGuard = fx.env || 0;
    return P;
  };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const P = W().P;
    if (P && P.envGuard && raw > 0 && W().run && (!src || (!src.def && !src.ally && !src.pvp && src !== P))) raw *= 1 - P.envGuard;   // 不是遺跡生物打的：場地、機關、落石
    return hp0(raw, src, o);
  };
})(window.R);
