// 討伐令 1433：東鶴靠海（作者）。城的東邊是海（city.js 的 C.COAST：示意圖 x = 975）。
// - 海：一大片會動的海面（貼圖慢慢流），岸邊有白浪；護岸、消波塊（一個 InstancedMesh）。
// - 東鶴漁港（南邊，國道一號的盡頭）：兩座碼頭、繫著的漁船（會晃）、魚市場（賣釣到的魚、買海產）、防波堤和燈塔（晚上會轉的光）。
// - 東濱海水浴場（北邊，霜溪出海口旁）：沙灘、冬天休業的海之家；可以撿貝殼（一天三次）。
// - 鐵路出城的那一段是跨海的鐵橋；碼頭盡頭可以釣魚（props.js 的 R.fishing）。
// - 小地圖、大地圖畫出海、沙灘、碼頭；地名「東鶴漁港」「濱海」「東濱海水浴場」。
(function (R) {
  const W = R.W, C = R.CITY, S = C.S, WX = C.WX, WZ = C.WZ, T = () => THREE, rnd = Math.random;
  const CX = C.COAST, F = C.FAC;
  const PIERS = [[846, 854], [892, 900]];          // 碼頭（示意圖的 y 範圍），從海岸伸到 x = 998
  const BREAK = [934, 941];                         // 防波堤
  const BEACH = [112, 206];                         // 沙灘（示意圖的 y 範圍）

  // ---------- 地名、小地圖 ----------
  const an = C.areaName;
  C.areaName = (sx, sy) => (sx >= 945 ? (sy > 820 ? '東鶴漁港' : sy < 210 ? '東濱海水浴場' : '濱海') : an(sx, sy));
  const pm = C.paintMap;
  C.paintMap = N => {
    const c = pm(N), g = c.getContext('2d'), k = N / 1000, rect = (x0, y0, x1, y1, col) => { g.fillStyle = col; g.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k); };
    rect(CX, 0, 1000, 1000, '#5E86A8'); rect(CX - 1.5, 0, CX + 1.5, 1000, '#E8F0F6');
    rect(948, BEACH[0], CX, BEACH[1], '#E2D2A8');
    PIERS.forEach(([a, b]) => rect(CX, a, 998, b, '#9A9890')); rect(CX, BREAK[0], 1000, BREAK[1], '#B8B4AC');
    rect(C.COAST, C.RAIL.y0 + 6, 1000, C.RAIL.y1 - 6, '#8A8478');
    return c;
  };

  // ---------- 海面的貼圖：深淺不一的藍，一條條的浪 ----------
  const seaTex = () => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
    x.fillStyle = '#2A4E6C'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 90; i++) { x.fillStyle = rnd() < 0.5 ? '#36607E' : '#23445E'; x.fillRect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 2 + Math.floor(rnd() * 5), 1); }
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(200,222,236,.5)'; x.fillRect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 3 + Math.floor(rnd() * 4), 1); }
    const t = new (T().CanvasTexture)(cv); t.wrapS = t.wrapT = T().RepeatWrapping; t.magFilter = T().NearestFilter; t.minFilter = T().NearestFilter; return t;
  };

  // ---------- 蓋 ----------
  let K = null;   // 這一次進城蓋的東西（會動的海、船、燈塔）
  const build = tw => {
    const TH = T(), g = new TH.Group(), x0 = WX(CX), lam = (col, o) => new TH.MeshLambertMaterial(Object.assign({ color: col }, o || {}));
    const box = (mat, x, y, z, sx, sy, sz, ry) => { const m = new TH.Mesh(new TH.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = sy > 0.5; m.receiveShadow = true; g.add(m); return m; };
    const block = (a, b, c, d, tag) => R.addBox(Math.min(a, b), Math.max(a, b), Math.min(c, d), Math.max(c, d), tag || 'water');
    // 海面
    const tex = seaTex(); tex.repeat.set(70, 140);
    const sea = new TH.Mesh(new TH.PlaneGeometry(420, 840), lam('#8EAAC2', { map: tex })); sea.rotation.x = -Math.PI / 2; sea.position.set(x0 + 210, 0.015, 0); sea.receiveShadow = true; g.add(sea);
    const foamM = new TH.MeshBasicMaterial({ color: '#E8F2F8', transparent: true, opacity: 0.6, depthWrite: false }); const foam = new TH.Mesh(new TH.PlaneGeometry(0.9, 840), foamM); foam.rotation.x = -Math.PI / 2; foam.position.set(x0 + 0.6, 0.03, 0); g.add(foam);
    // 護岸（沙灘那一段沒有）、步道的欄杆
    const wallM = lam('#A8A49C'), railM = lam('#5A6068');
    const zB0 = WZ(BEACH[0]), zB1 = WZ(BEACH[1]), zN = WZ(0) - 60, zS = WZ(1000) + 60;
    [[zN, zB0], [zB1, zS]].forEach(([za, zb]) => { box(wallM, x0 - 0.15, 0.3, (za + zb) / 2, 0.5, 0.6, zb - za); });
    // 擋住人走進海裡：碼頭、防波堤的地方留缺口
    const gaps = PIERS.concat([BREAK]).map(([a, b]) => [WZ(a), WZ(b)]).sort((p, q) => p[0] - q[0]);
    let zc = zN; gaps.forEach(([a, b]) => { block(x0 - 0.3, x0 + 400, zc, a); zc = b; }); block(x0 - 0.3, x0 + 400, zc, zS);
    // 消波塊：護岸外面一堆一堆（四支腳，InstancedMesh 一次畫完）
    { const arm = new TH.CylinderGeometry(0.16, 0.24, 0.9, 6), n = 260, im = new TH.InstancedMesh(arm, lam('#B8B4AA'), n), m4 = new TH.Matrix4(), q = new TH.Quaternion(), e = new TH.Euler(), v = new TH.Vector3(), sc = new TH.Vector3(1, 1, 1); let i = 0;
      const dirs = [[0, 0], [1.91, 0], [1.91, 2.09], [1.91, 4.19]];
      for (let z = zN + 40; z < zS - 40 && i < n - 4; z += 2.6) { if (z > zB0 - 3 && z < zB1 + 3) continue; if (gaps.some(([a, b]) => z > a - 2 && z < b + 2)) continue; if (rnd() < 0.35) continue; const bx = x0 + 1 + rnd() * 1.6, by = 0.2, yaw = rnd() * 6.28;
        dirs.forEach(([tilt, rot]) => { e.set(tilt, rot + yaw, 0); q.setFromEuler(e); v.set(bx, by + 0.3, z).add(new TH.Vector3(0, 0.45, 0).applyQuaternion(q)); m4.compose(v, q, sc); im.setMatrixAt(i++, m4); }); }
      im.count = i; im.castShadow = true; g.add(im); }
    // 碼頭：木棧板＋繫纜柱；兩側擋住
    const deckM = lam('#6A5A48'), bollM = lam('#3A3A42');
    PIERS.forEach(([a, b]) => {
      const za = WZ(a), zb = WZ(b), xe = WX(998), cz = (za + zb) / 2, len = xe - x0;
      box(deckM, x0 + len / 2, 0.32, cz, len, 0.25, zb - za); for (let x = x0 + 1; x < xe; x += 2.2) box(bollM, x, 0.6, za + 0.3, 0.25, 0.4, 0.25), box(bollM, x, 0.6, zb - 0.3, 0.25, 0.4, 0.25);
      for (let x = x0 + 1; x < xe; x += 3) [za + 0.2, zb - 0.2].forEach(z => box(lam('#5A4A38'), x, -0.3, z, 0.3, 1.2, 0.3));
      block(x0, xe + 400, za - 0.4, za + 0.05); block(x0, xe + 400, zb - 0.05, zb + 0.4); block(xe, xe + 400, za, zb);
    });
    // 防波堤＋燈塔
    const bw0 = WZ(BREAK[0]), bw1 = WZ(BREAK[1]), bxe = WX(999), lhx = WX(996), lhz = (bw0 + bw1) / 2;
    box(lam('#C8C4BC'), (x0 + bxe) / 2, 0.45, lhz, bxe - x0, 0.9, bw1 - bw0); block(x0, bxe + 400, bw0 - 0.4, bw0 + 0.05); block(x0, bxe + 400, bw1 - 0.05, bw1 + 0.4); block(bxe, bxe + 400, bw0, bw1);
    const lhM = lam('#F2F0EA'), redM = lam('#C8323A');
    const tower = new TH.Mesh(new TH.CylinderGeometry(0.75, 1.0, 7, 10), lhM); tower.position.set(lhx, 4.4, lhz); tower.castShadow = true; g.add(tower);
    [2.2, 4.6].forEach(y => { const band = new TH.Mesh(new TH.CylinderGeometry(0.86, 0.9, 0.6, 10), redM); band.position.set(lhx, 0.9 + y, lhz); g.add(band); });
    const lamp = new TH.Mesh(new TH.CylinderGeometry(0.6, 0.6, 0.8, 8), new TH.MeshBasicMaterial({ color: '#FFE8A0' })); lamp.position.set(lhx, 8.3, lhz); g.add(lamp);
    const cap = new TH.Mesh(new TH.ConeGeometry(0.85, 0.8, 10), redM); cap.position.set(lhx, 9.1, lhz); g.add(cap);
    const beamM = new TH.MeshBasicMaterial({ color: '#FFF0C0', transparent: true, opacity: 0.22, depthWrite: false, side: TH.DoubleSide, fog: false });
    const beam = new TH.Mesh(new TH.PlaneGeometry(26, 1.4), beamM); beam.position.set(lhx, 8.3, lhz); beam.geometry.translate(13, 0, 0); g.add(beam);
    block(lhx - 1.1, lhx + 1.1, lhz - 1.1, lhz + 1.1, 'deco');
    // 漁船（繫在碼頭兩側，會晃）
    const boats = [];
    const boat = (x, z, col) => {
      const b = new TH.Group(); const hull = new TH.Mesh(new TH.BoxGeometry(5.2, 0.9, 1.9), lam(col)); hull.position.y = 0.35; b.add(hull);
      const bow = new TH.Mesh(new TH.CylinderGeometry(0.01, 0.95, 1.6, 3), lam(col)); bow.rotation.z = -Math.PI / 2; bow.rotation.x = Math.PI / 2; bow.position.set(3.3, 0.35, 0); b.add(bow);
      const cab = new TH.Mesh(new TH.BoxGeometry(1.5, 1.2, 1.3), lam('#E8E4DC')); cab.position.set(-0.9, 1.3, 0); b.add(cab);
      const mast = new TH.Mesh(new TH.CylinderGeometry(0.06, 0.06, 2.6, 5), lam('#5A5A62')); mast.position.set(0.8, 2, 0); b.add(mast);
      const flag = new TH.Mesh(new TH.PlaneGeometry(0.7, 0.4), new TH.MeshLambertMaterial({ color: '#C8323A', side: TH.DoubleSide })); flag.position.set(1.15, 3.1, 0); b.add(flag);
      b.position.set(x, 0, z); b.rotation.y = rnd() < 0.5 ? 0 : Math.PI; g.add(b); boats.push({ b, ph: rnd() * 6 });
    };
    PIERS.forEach(([a, b], i) => { const za = WZ(a), zb = WZ(b); boat(x0 + 5, za - 1.4, ['#3A6A9A', '#C8A040'][i]); boat(x0 + 9.5, zb + 1.4, ['#E8E4DC', '#3A8A5A'][i]); });
    // 魚市場：開放式的棚子、一箱箱的魚、冰
    { const [fx, fy] = F.fishMarket, [fw, fd] = C.FS.fishMarket, cx = WX(fx), cz = WZ(fy), w = fw * S, d = fd * S;
      { const roofM = R.seeThrough(lam('#3E4E60')), ridgeM = R.seeThrough(lam('#2A3644')); [-1, 1].forEach(sd => { const m = box(roofM, cx, 3.35, cz + sd * (d / 4 + 0.15), w + 0.8, 0.18, d / 2 + 0.6); m.rotation.x = sd * 0.22; }); box(ridgeM, cx, 3.62, cz, w + 0.9, 0.16, 0.3); for (let x = cx - w / 2; x <= cx + w / 2; x += 1.2) [-1, 1].forEach(sd => { const m = box(ridgeM, x, 3.46, cz + sd * (d / 4 + 0.15), 0.08, 0.06, d / 2 + 0.6); m.rotation.x = sd * 0.22; }); } [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(lam('#4A5058'), cx + a * w / 2, 1.6, cz + b * d / 2, 0.3, 3.2, 0.3));
      box(lam('#C8C4BC'), cx, 0.06, cz, w, 0.1, d);
      for (let i = 0; i < 6; i++) { const bx = cx - w / 2 + 1.2 + (i % 3) * (w - 2.4) / 2, bz = cz - d / 4 + Math.floor(i / 3) * d / 2; box(lam('#2E6A8A'), bx, 0.45, bz, 1.6, 0.7, 0.9); box(lam('#E8F2F8'), bx, 0.82, bz, 1.4, 0.06, 0.7); for (let f = 0; f < 3; f++) box(lam(['#9AA8B8', '#C88A6A', '#7A8A9A'][f]), bx - 0.4 + f * 0.4, 0.9, bz, 0.3, 0.08, 0.6); block(bx - 0.8, bx + 0.8, bz - 0.45, bz + 0.45, 'deco'); }
      const sign = R.makeSign ? null : null;   // 招牌用文字點陣：簡單一點，掛一塊藍布
      box(lam('#2E5A8A'), cx, 3.6, cz + d / 2 + 0.35, w * 0.6, 0.5, 0.05);
      const vend = R.makeHero('warrior', null, { top: '#E8E4DC', hair: '#2A2420', cloak: '#2E5A8A', weapon: null, shield: false }); vend.g.position.set(cx + 1, 0, cz + d / 2 - 1); vend.g.rotation.y = 0; g.add(vend.g);
      tw.inter.push({ x: cx, z: cz + d / 2 + 0.8, r: 2.8, label: '東鶴魚市場（賣魚、買海產）', act: market }); }
    // 海水浴場：沙灘、海之家（冬天休業）
    { const sx0 = WX(948), sz0 = WZ(BEACH[0]), sz1 = WZ(BEACH[1]);
      const sand = new TH.Mesh(new TH.PlaneGeometry(x0 - sx0 + 6, sz1 - sz0), lam('#B49C70')); sand.rotation.x = -Math.PI / 2; sand.position.set((sx0 + x0 + 6) / 2, 0.04, (sz0 + sz1) / 2); sand.receiveShadow = true; g.add(sand);
      block(x0 + 6, x0 + 400, sz0, sz1);
      const [hx, hy] = F.beachHut, hcx = WX(hx), hcz = WZ(hy);
      box(lam('#C8A060'), hcx, 1.2, hcz, 4.2, 2.4, 3.2); box(lam('#3A6A9A'), hcx, 2.55, hcz, 4.8, 0.3, 3.8); box(lam('#8A6A44'), hcx, 1.0, hcz + 1.62, 3.2, 1.6, 0.05); block(hcx - 2.1, hcx + 2.1, hcz - 1.6, hcz + 1.6, 'house');
      for (let i = 0; i < 4; i++) { const ux = x0 - 2 - i * 2.6, uz = (sz0 + sz1) / 2 + (i % 2 ? 4 : -3); box(lam('#E8E4DC'), ux, 0.9, uz, 0.08, 1.8, 0.08); box(lam(['#C8323A', '#3A6ACF', '#F2C84A', '#3A8A5A'][i]), ux, 1.6, uz, 0.3, 0.9, 0.3); }
      tw.inter.push({ x: hcx, z: hcz + 2.3, r: 2.6, label: '海之家（冬季休業）', act: () => R.townTalk('海之家', ['門上貼著一張紙：「冬季休業。夏峰月見。」', '（門縫裡飄出一點醬油和炒麵的味道……大概是錯覺。）']) });
      tw.inter.push({ x: x0 - 3, z: (sz0 + sz1) / 2, r: 3.5, label: '在沙灘上撿貝殼', act: shells });
      tw.inter.push({ x: x0 - 1.5, z: sz0 + 4, r: 2.5, label: '看海', act: () => R.townTalk('東濱', [pick(['冬天的海是鉛灰色的。浪一波一波打上來，又退回去。', '遠方有一艘貨船，往北邊的千歲空開去。', '風很冷，帶著鹽的味道。海鷗在浪上飛。', '天氣好的時候，可以看到南邊的空知川。'])]) }); }
    // 碼頭盡頭：釣魚、看海；燈塔
    tw.inter.push({ x: WX(995), z: (WZ(PIERS[0][0]) + WZ(PIERS[0][1])) / 2, r: 2.2, label: '在碼頭釣魚', act: () => (R.fishing ? R.fishing() : R.townToast('海風太大，浮標一直被吹走。')) });
    tw.inter.push({ x: lhx - 2, z: lhz, r: 2.6, label: '在燈塔下看海', act: () => R.townTalk('東鶴燈塔', [pick(['燈塔的門鎖著。牌子上寫：「昭旭沿岸第十二號燈塔」。', '浪打在防波堤上，碎成白色的泡沫。', '晚上燈塔的光會轉，一圈一圈掃過海面。'])]) });
    // 跨海的鐵橋：鐵路出城那一段
    { const RL = C.RAIL, zr0 = WZ(RL.y0 + 4), zr1 = WZ(RL.y1 - 4), xa = x0, xb = WX(1000) + 50;
      box(lam('#5E5A54'), (xa + xb) / 2, 0.03, (zr0 + zr1) / 2, xb - xa, 0.04, zr1 - zr0);
      for (let x = xa + 2; x < xb; x += 8) box(lam('#7A766E'), x, -0.6, (zr0 + zr1) / 2, 1, 1.3, zr1 - zr0 - 1);
      [zr0, zr1].forEach(z => box(lam('#5A6068'), (xa + xb) / 2, 0.6, z, xb - xa, 0.1, 0.1)); }
    tw.group.add(g);
    // 海裡不該有的東西（城外的松樹、圍籬……）收起來
    tw.group.children.forEach(o => { if (o !== g && o.position.x > x0 + 0.6 && o.position.x < x0 + 400) o.visible = false; });
    K = { g, tex, beam, boats, foamM, sea };
  };
  const pick = a => a[Math.floor(rnd() * a.length)];
  // 魚市場：把釣到的魚賣掉；買海產（送禮用）
  const market = () => {
    const S0 = R.S, n = (S0.gifts && S0.gifts.fish) || 0, price = 8, buy = R.priceMul ? R.priceMul('market') : 1;
    if (buy == null) { R.townTalk('魚市場的大叔', ['「……我們不賣東西給你。」']); return; }
    const p = Math.max(1, Math.round(12 * buy));
    R.sheet('<p class="kicker">東鶴漁港</p><h2>東鶴魚市場</h2><p class="note">天還沒亮就開始叫賣。冬天的鯖魚最肥。</p><div class="recipes">'
      + '<div class="recipe"><b>賣掉釣到的魚</b><small>手上有 ' + n + ' 條，一條 ' + price + ' 費拉</small><button type="button" class="btn pri" id="fm-sell"' + (n ? '' : ' disabled') + '>全部賣掉</button></div>'
      + '<div class="recipe"><b>寒鯖一夜干</b><small>' + p + ' 費拉。送禮用（算「魚」）。</small><button type="button" class="btn" id="fm-buy"' + (S0.gold < p ? ' disabled' : '') + '>買</button></div></div>',
      '<div class="row"><button type="button" class="btn pri" id="fm-x">走了</button></div>');
    document.getElementById('fm-x').onclick = R.closeSheet;
    document.getElementById('fm-sell').onclick = () => { S0.gold += n * price; S0.gifts.fish = 0; R.save(); R.toast('賣了 ' + n + ' 條魚：' + n * price + ' 費拉'); market(); };
    document.getElementById('fm-buy').onclick = () => { if (S0.gold < p) return; S0.gold -= p; R.addGift('fish', 1); R.save(); market(); };
  };
  // 撿貝殼：一天三次
  const shells = () => {
    const S0 = R.S; if (S0.shellDay !== S0.day) { S0.shellDay = S0.day; S0.shellN = 0; }
    if (S0.shellN >= 3) { R.townTalk('東濱', ['今天的沙灘已經被撿得差不多了。']); return; }
    // 貝殼（crafting.js 的素材；沒有的話退回甲殼），很少撿到珍珠
    S0.shellN++; const k = R.MATS.seashell ? 'seashell' : 'shell', n = 1 + (Math.random() < 0.4 ? 1 : 0); S0.mats[k] = (S0.mats[k] || 0) + n;
    const pearl = R.MATS.pearl && Math.random() < 0.08; if (pearl) S0.mats.pearl = (S0.mats.pearl || 0) + 1;
    R.save(); R.toast('撿到' + (n > 1 ? '兩個' : '一個') + '貝殼' + (pearl ? '，還有一顆珍珠！' : ''), '#E2D2A8');
  };

  // ---------- 接上城裡 ----------
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => { enter0(from, at); K = null; const tw = W.town; if (tw && tw.group) build(tw); };
  const step0 = R.townStep;
  R.townStep = dt => {
    step0(dt); if (!K || W.inside) return; const tw = W.town, t = tw ? tw.t : 0;
    K.tex.offset.x = (K.tex.offset.x + dt * 0.006) % 1; K.tex.offset.y = (K.tex.offset.y + dt * 0.004) % 1;
    K.foamM.opacity = 0.45 + Math.sin(t * 1.3) * 0.2;
    K.boats.forEach(o => { o.b.position.y = Math.sin(t * 1.1 + o.ph) * 0.08; o.b.rotation.z = Math.sin(t * 0.9 + o.ph) * 0.04; });
    const h = R.hourNow ? ((R.hourNow() % 24) + 24) % 24 : 12, night = h >= 17.5 || h < 6.5; K.beam.visible = night; if (night) K.beam.rotation.y = t * 0.8;
  };
})(window.R);
