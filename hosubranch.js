// 討伐令 1433：公會奉主分館——第二個據點（作者 2026-10-04：在其他地區開局？→ 照 Claude 的建議，討伐段以後開「奉主分館」當第二個據點）
// - 奉主站前廣場的西側、靠著站房：三層的石樓，屋頂插著公會的綠旗（跟東鶴分館一樣），門口掛「公會奉主分館」。
// - 討伐段以上才受理（奉主的兩座遺跡是摩爾斯級、克森特級）；還沒到討伐段，櫃台會請你回東鶴分館。
// - 受理之後打開的就是公會的畫面（委託、繳交、收購、登記……，標題換成奉主分館）；從這裡出發的遺跡，回到地面會回奉主，不用再搭電車。
// - 升到討伐段的時候提醒一次。
// 放在 hosu.js 後面（包 hosu.js 換過的 R.townStep、還有 R.enterTown、R.startRun、R.hub）。
(function (R) {
  const W = R.W, S = () => R.S, esc = s => R.esc(s);
  const BOX = [-47, -94, -35, -86];   // 分館的位置（站房的正前面、廣場西側）
  const open = () => { const s = S(); return !!(s && s.rank && s.rank.dan >= 2); };

  // ---------- 房子 ----------
  const build = tw => {
    const TH = THREE, g = new TH.Group(), [x0, z0, x1, z1] = BOX, cx = (x0 + x1) / 2, w = x1 - x0, d = z1 - z0, H = 10.5;
    const lam = (c, e) => new TH.MeshLambertMaterial(Object.assign({ color: c }, e || {}));
    const box = (m, x, y, z, sx, sy, sz) => { const o = new TH.Mesh(new TH.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
    const stone = lam('#9A968C'), stoneD = lam('#7A766E'), win = lam('#F2DCA0', { emissive: '#F2DCA0', emissiveIntensity: 0.45 }), wood = lam('#5A3E2A');
    box(stone, cx, H / 2, (z0 + z1) / 2, w, H, d);
    [3.5, 7].forEach(y => box(stoneD, cx, y, z1 + 0.08, w + 0.3, 0.3, 0.3));   // 樓層的線腳
    for (let fl = 0; fl < 3; fl++) for (let i = 0; i < 4; i++) { const x = x0 + 1.6 + i * ((w - 3.2) / 3); if (fl === 0 && (i === 1 || i === 2)) continue; box(win, x, 1.9 + fl * 3.5, z1 + 0.06, 1.2, 1.6, 0.1); }
    box(wood, cx, 1.4, z1 + 0.06, 2.6, 2.8, 0.12);   // 大門
    box(stoneD, cx, 0.12, z1 + 0.8, 4.2, 0.24, 1.4);  // 門口的石階
    // 屋頂的旗竿、綠旗
    box(lam('#3A3A40'), x1 - 1.5, H + 2.2, z1 - 1.2, 0.15, 4.4, 0.15);
    const flag = box(lam('#3E7A48', { side: TH.DoubleSide }), x1 - 1.5 + 0.9, H + 3.6, z1 - 1.2, 1.8, 1.1, 0.04); tw.branchFlag = flag;
    // 招牌（canvas 字）
    const c = document.createElement('canvas'); c.width = 384; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#1E3A28'; x.fillRect(0, 0, 384, 64); x.strokeStyle = '#C8A040'; x.lineWidth = 4; x.strokeRect(4, 4, 376, 56);
    x.fillStyle = '#F4E9CD'; x.font = 'bold 34px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('公會奉主分館', 192, 34);
    const tex = new TH.CanvasTexture(c); const sg = new TH.Mesh(new TH.PlaneGeometry(7.6, 1.27), new TH.MeshBasicMaterial({ map: tex })); sg.position.set(cx, 3.5, z1 + 0.3); g.add(sg);
    W.scene.add(g); R.addBox(x0, x1, z0, z1, 'house');
    tw.inter.push({ x: cx, z: z1 + 1.4, r: 2.4, label: '公會奉主分館', act: enterBranch, icon: '#3E7A48' });
    tw.branchBuilt = true;
  };
  const enterBranch = () => {
    if (!open()) {
      R.townTalk('公會奉主分館・櫃台', ['櫃台的館員看了你的勇者證一眼：「奉主分館只受理討伐段以上的勇者。」', '「附近的舊兵營、兵工廠都是摩爾斯級、克森特級的遺跡——冒險段的委託，請回東鶴分館接。」', '（升到討伐段之後，這裡就是你在奉主的據點：接委託、繳交、從這裡出發，回來也回奉主。）']);
      return;
    }
    const s = S(); if (!s.branchSeen) { s.branchSeen = 1; R.save && R.save(); }
    R.openHub('guild');
  };
  R.hosuBranch = { BOX, enter: enterBranch, open };   // 精緻城市版的奉主（city_hosu.js）蓋自己的石樓、門口叫這個
  const ts0 = R.townStep;
  R.townStep = dt => { const r = ts0(dt); try { const tw = W.town; if (tw && tw.hosu && !tw.branchBuilt && W.scene && tw.inter) build(tw); if (tw && tw.branchFlag) tw.branchFlag.rotation.y = Math.sin(tw.t * 2.2) * 0.25; } catch (e) { console.warn('[hosubranch]', e); tw && (tw.branchBuilt = true); } return r; };

  // ---------- 公會的畫面：標題換成奉主分館 ----------
  const hub0 = R.hub;
  R.hub = (t, f) => {
    const r = hub0(t, f);
    try {
      if (R.inHosu && R.inHosu()) document.querySelectorAll('#hub-body h2, #hub-body .note').forEach(el => {
        if (el.textContent.indexOf('東鶴分館') >= 0) el.innerHTML = el.innerHTML.replace(/公會東鶴分館/g, '公會奉主分館');
        if (el.textContent.indexOf('西市口的綠旗石樓') >= 0) el.innerHTML = el.innerHTML.replace('西市口的綠旗石樓', '奉主站前的石樓，屋頂一樣插著綠旗');
      });
    } catch (e) { }
    return r;
  };

  // ---------- 從奉主出發 → 回奉主 ----------
  const sr0 = R.startRun;
  R.startRun = (...a) => { const here = !!(R.inHosu && R.inHosu()); const r = sr0(...a); const s = S(); if (s) { s.retHosu = here && W.run ? 1 : 0; } return r; };
  const en0 = R.enterTown;
  R.enterTown = (...a) => {
    const s = S();
    if (s && s.retHosu && R.hosuEnter) {
      s.retHosu = 0;
      return R.three.then(() => { R.hosuEnter(); const P = W.P; if (P) { P.x = (BOX[0] + BOX[2]) / 2; P.z = BOX[3] + 2.4; P.yaw = 0; P.h.g.position.set(P.x, 0, P.z); R.placeCam && R.placeCam(null); } R.banner && R.banner('奉主', '回到公會奉主分館的門口'); });
    }
    const r = en0(...a);
    // 升到討伐段：提醒一次
    if (s && open() && !s.branchTold) { s.branchTold = 1; setTimeout(() => R.toast && R.toast('升到討伐段了：公會奉主分館開始受理你的委託。搭魔導電車到奉主，站前廣場西側的石樓——從那裡出發的遺跡，回來也回奉主。', '#3E7A48'), 3000); }
    return r;
  };
})(window.R);
