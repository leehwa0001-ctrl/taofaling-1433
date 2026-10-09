// 精緻城市的畫質自動調整（2026-10-09 作者：皇嶺很卡，吉山應該也會卡）
// - 進城（或從店裡出來）以後先等 1.5 秒，再量 3 秒的平均每格時間：超過 26 毫秒（不到 38 fps）就降一級（高 → 中 → 低），再量一次。
// - 中：沒有反鋸齒、沒有水面倒影、陰影小一點、解析度 1 倍；低：再拿掉泛光和陰影、解析度 0.8 倍（citykit.js、citykit4.js）。
// - 降過的畫質記在瀏覽器（下次直接用那一級）；自己在暫停選單改過畫質的，就不自動調。
// 放在 citykit*.js、ckcrime.js 後面。
(function (R) {
  const CK = R.CK, W = R.W; if (!CK) return;
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null; };
  const QN = ['低', '中', '高'];
  let auto = false, last = 0, acc = 0, n = 0, warm = 0, key = null, done = false;
  // 陰影跟著畫質（暫停選單的「畫質」那一顆也是這樣）
  const applyLight = q => { const L = W.town && W.town.L; if (!L || !L.sun) return; L.sun.castShadow = q > 0; const sz = q >= 2 ? 4096 : 2048; if (L.sun.shadow.mapSize.x !== sz) { L.sun.shadow.mapSize.set(sz, sz); if (L.sun.shadow.map) { L.sun.shadow.map.dispose(); L.sun.shadow.map = null; } } };
  // 2026-10-09 作者：調低畫質還是會卡——低畫質拿掉材質的凹凸貼圖、粗糙度貼圖（每個像素少讀兩張貼圖、少算很多），換回中、高再裝回去；
  // 進城以後先把看不到的東西（遠處的路人、晚上才亮的燈……）也編譯好，走到的時候才不會頓一下。
  const stripOne = (m, on) => {
    if (!m || !m.isMeshStandardMaterial) return; const u = m.userData;
    if (on) { if (u.nm0 !== undefined || (!m.normalMap && !m.roughnessMap)) return; u.nm0 = m.normalMap || null; u.rm0 = m.roughnessMap || null; m.normalMap = null; m.roughnessMap = null; m.needsUpdate = true; }
    else if (u.nm0 !== undefined) { m.normalMap = u.nm0; m.roughnessMap = u.rm0; delete u.nm0; delete u.rm0; m.needsUpdate = true; }
  };
  const strip = on => Object.values(CK.mats || {}).forEach(m => stripOne(m, on));
  const mat0 = CK.mat;
  CK.mat = (k, o) => { const m = mat0(k, o); if (CK.quality() === 0) stripOne(m, true); return m; };
  const precompile = () => {
    const sc = W.scene, r = W.renderer, cam = W.camera; if (!sc || !r || !cam) return; const hid = [];
    sc.traverse(o => { if (!o.visible) { hid.push(o); o.visible = true; } });
    try { r.compile(sc, cam); } catch (e) { } hid.forEach(o => { o.visible = false; });
  };
  const ce0 = CK.enter;
  CK.enter = (...a) => { const r = ce0(...a); try { if (W.town && W.town.ck) { if (CK.quality() === 0) strip(true); precompile(); } } catch (e) { console.warn('[ckperf]', e); } return r; };
  const sq = CK.setQuality;
  CK.setQuality = q => { sq(q); if (!auto) LS('tfl-cityq-user', '1'); applyLight(q); strip(q === 0); if (CK.applyTime) CK.applyTime(true); };
  const check = avg => {
    acc = 0; n = 0; warm = 0;
    if (LS('tfl-cityq-user')) { done = true; return; }
    const q = CK.quality();
    if (avg > 26 && q > 0) { auto = true; try { CK.setQuality(q - 1); } finally { auto = false; } R.toast('畫面有點卡：畫質自動調成「' + QN[q - 1] + '」（暫停選單可以改）', '#E8C04A'); }
    else done = true;
  };
  const ts0 = R.townStep;
  R.townStep = dt => {
    ts0(dt);
    const tw = W.town;
    if (!tw || !tw.ck || W.paused || document.hidden) { last = 0; return; }
    if (key !== tw) { key = tw; warm = 0; acc = 0; n = 0; done = false; }
    const now = performance.now();
    if (last && !done) { const f = now - last; if (f < 250) { warm += f; if (warm > 1500) { acc += f; n++; if (acc > 3000) check(acc / n); } } }
    last = now;
  };
  R.ckPerf = () => ({ q: CK.quality(), user: !!LS('tfl-cityq-user'), done, avg: n ? acc / n : 0 });
})(window.R);
