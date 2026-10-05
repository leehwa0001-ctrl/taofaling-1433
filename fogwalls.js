// 討伐令 1433：濃霧裡照樣看得到建築物的輪廓（作者 2026-10-05：迷霧建築物還是要顯示線條，怪物看不到沒關係）
// - 濃霧樓層（ruinvar.js 的 F.fogMin；fogarc.js 只看得到身邊和準心方向的扇形）原本連牆都埋在霧裡，背後的路完全看不到。
// - 這裡沿著「地板和牆接在一起」的每一條邊畫線：牆腳一條、牆頂一條（照那一段牆的高度）。線不吃霧（fog: false），
//   所以整層的牆、建築物的輪廓都看得到；遺跡生物、寶箱、擺設照舊藏在霧裡。
// - 只有濃霧樓層才畫；換樓層的時候跟著 F.group 一起丟掉。
// 放在 fogarc.js 後面。
(function (R) {
  const W = R.W;
  // 2026-10-05 作者：迷霧的白框是碰撞框，應該像暴風雪那樣顯示物體外側的輪廓——這些線關掉，
  //   改由 pixel.js 的深度描邊（霧裡減半）畫出牆、擺設真正的外形。要看回舊的線把 LINES 改 true。
  const LINES = false;
  let lastF = null;
  const build = F => {
    const t = F.tile; if (!t || !t.T || !F.group) return null;
    const TS = t.TS || 2, pos = [], N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let tz = 1; tz < t.nz - 1; tz++) for (let tx = 1; tx < t.nx - 1; tx++) {
      const k = t.id(tx, tz); if (t.T[k] !== 1) continue;
      const cx = t.cX(tx), cz = t.cZ(tz);
      N4.forEach(([dx, dz]) => {
        const nk = t.id(tx + dx, tz + dz); if (t.T[nk] !== 2) return;
        const wi = F.wallAt ? F.wallAt[nk] : -1, h = wi >= 0 && F.wallH ? F.wallH[wi] : 3.2;
        // 共用的那一條邊
        const ex = cx + dx * TS / 2, ez = cz + dz * TS / 2, ax = dz ? TS / 2 : 0, az = dx ? TS / 2 : 0;
        [0.04, h + 0.02].forEach(y => pos.push(ex - ax, y, ez - az, ex + ax, y, ez + az));
      });
    }
    if (!pos.length) return null;
    const TH = THREE, g = new TH.BufferGeometry(); g.setAttribute('position', new TH.Float32BufferAttribute(pos, 3));
    const m = new TH.LineSegments(g, new TH.LineBasicMaterial({ color: '#D8D0BC', transparent: true, opacity: 0.55, fog: false, depthWrite: false }));
    m.renderOrder = 3; m.frustumCulled = false; F.group.add(m); return m;
  };
  const ul = R.updateLights;
  R.updateLights = dt => {
    const r = ul(dt), run = W.run, F = W.F;
    try {
      const fogOn = !!(run && F && F.fogMin && !(run.site && run.site.outdoor)), on = LINES && fogOn;
      // 生物不描邊（作者 2026-10-05：只顯示地圖物件的外框，敵人太明顯）：濃霧樓層裡生物的材質不寫深度，後製的深度描邊就不會圍著牠們畫
      (W.enemies || []).forEach(e => { const mt = e.m && e.m.sp && e.m.sp.mat; if (!mt || mt.transparent) return; const want = !fogOn; if (mt.depthWrite !== want) mt.depthWrite = want; });
      if (F !== lastF) { lastF = F; if (F) F.fogLines = null; }
      if (on && F && !F.fogLines) F.fogLines = build(F) || 'none';
      if (F && F.fogLines && F.fogLines !== 'none') {
        F.fogLines.visible = on;
        // 霧亮（白霧）用深色的線、霧暗用淺色的線，才看得清楚
        const fc = W.scene && W.scene.fog && W.scene.fog.color; if (on && fc) { const l = 0.3 * fc.r + 0.59 * fc.g + 0.11 * fc.b, m = F.fogLines.material; m.color.set(l > 0.45 ? '#2E2A34' : '#D8D0BC'); m.opacity = l > 0.45 ? 0.6 : 0.55; }
      }
    } catch (e) { console.warn('[fogwalls]', e); }
    return r;
  };
})(window.R);
