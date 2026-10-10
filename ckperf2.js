// 精緻城市的效能（二）（2026-10-10 作者：那城市的優化效能也繼續——替電腦比較差的玩家著想）
// 量過：CPU 每一格只花 2～3 毫秒（更新＋送出繪圖），卡的是顯示卡畫每一個像素。所以這裡省的都是「每個像素要算的東西」：
// 1. 路燈的光（中畫質 4 盞、高畫質 8 盞點光源）：白天沒亮（亮度 0）也照樣每個像素算一遍。現在天色暗到路燈亮起來（lampK > 0.05）才開，
//    天亮就關。點光源的數量一變，所有材質的著色器都要換一份：進城的時候先把「開燈」「關燈」兩份都編譯好，黃昏、天亮切換才不會頓一下。
// 2. 水面倒影（高畫質才有，等於整個場景多畫一次）：靠海的城原本只要城裡有海就每格都畫；
//    現在海真的在畫面裡才畫——從鏡頭往畫面上的 5×4 個點看出去，碰到的地方有一個在陸地外面（或看到地平線）才算看得到海。
// 放在 citykit*.js、ckperf.js、cktopcam.js 後面。
(function (R) {
  const CK = R.CK, W = R.W; if (!CK || !CK.enter) return;
  // ---------- 1. 路燈的光：天黑才開 ----------
  const want = L => (L.lampK || 0) > 0.05;
  const apply = (L, on) => { if (!L.pts || !CK.lampLights) return; if (on) CK.lampLights(L.pts, CK.quality()); else L.pts.forEach(p => { p.visible = false; }); L._on = on; };
  const precompile = () => {
    const tw = W.town, L = tw && tw.L, r = W.renderer, sc = W.scene, cam = W.camera; if (!L || !L.pts || !r || !sc || !cam || CK.quality() < 1) return;
    const hid = []; sc.traverse(o => { if (!o.visible && !o.isLight) { hid.push(o); o.visible = true; } });
    const rt = new THREE.WebGLRenderTarget(1, 1), rt0 = r.getRenderTarget();   // 對畫布編譯（同 ckperf.js）
    try { r.setRenderTarget(rt); [false, true].forEach(on => { apply(L, on); r.compile(sc, cam); }); } catch (e) { } finally { r.setRenderTarget(rt0); rt.dispose(); apply(L, want(L)); hid.forEach(o => { o.visible = false; }); }
  };
  const ce0 = CK.enter;
  CK.enter = (...a) => { const r = ce0(...a); try { const tw = W.town; if (tw && tw.ck && !tw.room && tw.L) { apply(tw.L, want(tw.L)); precompile(); } } catch (e) { console.warn('[ckperf2]', e); } return r; };
  const ts0 = R.townStep;
  R.townStep = dt => {
    ts0(dt);
    const tw = W.town, L = tw && tw.ck && !tw.room && tw.L; if (!L || !L.pts) return;
    const on = want(L); if (on !== L._on) apply(L, on);
  };
  // 換畫質（暫停選單、自動降級）：照現在的天色重新決定
  const sq0 = CK.setQuality;
  CK.setQuality = q => { sq0(q); const L = W.town && W.town.L; if (L && L.pts) apply(L, want(L)); };

  // ---------- 2. 海在不在畫面裡 ----------
  let TV = null;
  CK.seaInView = cam => {
    const tw = W.town, city = tw && tw.city; if (!city || !city.sea) return false;
    const land = city.land; if (!land) return true;
    const TH = THREE; if (!TV) TV = { v: new TH.Vector3(), o: new TH.Vector3() };
    const pip = CK.util.pip, sy = tw.D && tw.D.seaY != null ? tw.D.seaY : -1.2, v = TV.v, o = TV.o;
    o.setFromMatrixPosition(cam.matrixWorld);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) {
      v.set(-1 + i * 0.5, -1 + j * (2 / 3), 0.5).unproject(cam).sub(o);
      if (v.y > -1e-4) return true;   // 看得到地平線
      const t = (sy - o.y) / v.y; if (t > 2500) return true;
      if (!pip(o.x + v.x * t, o.z + v.z * t, land)) return true;
    }
    return false;
  };
})(window.R);
