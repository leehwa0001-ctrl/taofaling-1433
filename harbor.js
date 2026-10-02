// 東鶴港（作者 2026-10-03：港口可以做大，像有港灣的大港口一樣，就像東京港那樣）
// 在海岸線（示意圖 x = 975）外面填出來的港區，在鐵路的跨海鐵橋（北）和東鶴漁港（南）之間；漁港照舊。
// - 外防波堤圍出港灣，港口兩側各一座燈塔（紅、白，晚上會亮）。
// - 貨櫃埠頭（最大）：三座貨櫃起重機、一排排的貨櫃、停在岸邊的大貨輪。
// - 客船埠頭：客船航站、往北州的渡輪（看時刻表；旅館的時刻表說「往北州：要到港口換船」）。
// - 中央埠頭：兩棟紅磚倉庫。
// - 港裡的拖船繞著走、外海有一艘等著進港的貨輪；埠頭、防波堤都走得上去，水裡走不下去。
// 放在 coast.js 後面（包住 R.enterTownNow、R.townStep）。
(function (R) {
  const W = R.W, C = R.CITY, T = () => THREE, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const X0 = C.WX(C.COAST);   // 海岸線（世界座標）
  // 填出來的地（世界座標，x 從海岸線算起）：[x0, x1, z0, z1]
  const LAND = {
    cargo: [0, 180, 40, 110],     // 貨櫃埠頭
    ferry: [0, 140, -62, -36],    // 客船埠頭
    mid: [0, 90, -12, 14],        // 中央埠頭（紅磚倉庫）
    bwOut: [226, 232, -98, 62],   // 外防波堤（南北向）
    bwN: [0, 232, -98, -92]       // 北防波堤（從岸邊伸出去）
  };
  const REGION = [-0.4, 262, -100, 146];   // 港區：這裡面的水重新擋
  const rect = k => { const [a, b, c, d] = LAND[k]; return [X0 + (a === 0 ? -0.8 : a), X0 + b, c, d]; };   // 靠岸的往陸地多伸一點，才走得上去

  // 區域名稱
  const an = C.areaName;
  C.areaName = (sx, sy) => (sx >= 975 && sy > 270 && sy < 832 ? '東鶴港' : an(sx, sy));

  // ---------- 水：港區裡原本整片擋住，改成「填出來的地以外才擋」 ----------
  const reblock = () => {
    const rx0 = X0 + REGION[0], rx1 = X0 + REGION[1], rz0 = REGION[2], rz1 = REGION[3];
    const hit = c => c.on && c.tag === 'water' && c.x1 > rx0 && c.x0 < rx1 && c.z1 > rz0 && c.z0 < rz1;
    R.col.list.filter(hit).forEach(c => {
      c.on = false;   // 切掉港區的那一塊，外面的部分補回去
      if (c.z0 < rz0) R.addBox(c.x0, c.x1, c.z0, rz0, 'water'); if (c.z1 > rz1) R.addBox(c.x0, c.x1, rz1, c.z1, 'water');
      const za = Math.max(c.z0, rz0), zb = Math.min(c.z1, rz1);
      if (c.x1 > rx1) R.addBox(rx1, c.x1, za, zb, 'water'); if (c.x0 < rx0) R.addBox(c.x0, rx0, za, zb, 'water');
    });
    const lands = Object.keys(LAND).map(rect);
    for (let z = rz0; z < rz1; z += 1.5) {   // 一條一條掃：地以外的地方擋起來
      const zm = z + 0.75, cuts = lands.filter(([, , a, b]) => zm > a && zm < b).map(([a, b]) => [a, b]).sort((p, q) => p[0] - q[0]);
      let x = rx0; cuts.forEach(([a, b]) => { if (a > x) R.addBox(x, a, z, z + 1.5, 'water'); x = Math.max(x, b); }); if (x < rx1) R.addBox(x, rx1, z, z + 1.5, 'water');
    }
  };

  // ---------- 蓋 ----------
  let H = null;
  const build = tw => {
    const TH = T(), g = new TH.Group(), mats = {};
    const lam = (col, o) => mats[col + (o ? JSON.stringify(o) : '')] || (mats[col + (o ? JSON.stringify(o) : '')] = new TH.MeshLambertMaterial(Object.assign({ color: col }, o || {})));
    const geoBox = new TH.BoxGeometry(1, 1, 1);
    const box = (col, x, y, z, sx, sy, sz, o) => { const m = new TH.Mesh(geoBox, typeof col === 'string' ? lam(col) : col); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = sy > 1; m.receiveShadow = true; if (o && o.ry) m.rotation.y = o.ry; (o && o.parent || g).add(m); return m; };
    const block = (a, b, c, d, tag) => R.addBox(a, b, c, d, tag || 'deco');
    const glow = col => new TH.MeshBasicMaterial({ color: col });
    // 地：混凝土的埠頭，邊上一排繫纜柱、防舷材
    Object.keys(LAND).forEach(k => {
      const [a, b, c, d] = rect(k), bw = k.indexOf('bw') === 0;
      box(bw ? '#9A968E' : '#B8B4AC', (a + b) / 2, -0.98, (c + d) / 2, b - a, 2.04, d - c);
      if (bw) { box('#8A867E', (a + b) / 2, 0.06, (c + d) / 2, b - a - 0.6, 0.04, d - c - 0.6); return; }
      for (let x = a + 4; x < b - 1; x += 9) [c + 0.5, d - 0.5].forEach(z => box('#2E3238', x, 0.3, z, 0.35, 0.5, 0.35));
      for (let z = c + 3; z < d - 1; z += 8) box('#2E3238', b - 0.5, 0.3, z, 0.35, 0.5, 0.35);
      [c, d].forEach(z => box('#1E1E22', (a + b) / 2, -0.25, z + (z === c ? -0.12 : 0.12), b - a, 0.5, 0.2));
    });
    // 貨櫃埠頭：瀝青、黃線、貨櫃、起重機、大貨輪
    { const [a, b, c, d] = rect('cargo');
      box('#5A5A60', (a + b) / 2, 0.045, (c + d) / 2 + 6, b - a - 4, 0.01, d - c - 16);
      for (let x = a + 10; x < b - 6; x += 12) box('#E8C84A', x, 0.055, c + 9, 5, 0.01, 0.25);
      // 貨櫃：一排一排疊兩三層（一個 InstancedMesh）
      const cols = ['#C8323A', '#2E5A8A', '#3A8A5A', '#E0A030', '#8A8A92', '#6A3A8A', '#C86A2A', '#2E8A8A'].map(c0 => new TH.Color(c0));
      const n = 520, im = new TH.InstancedMesh(new TH.BoxGeometry(6, 2.6, 2.44), lam('#FFFFFF'), n), m4 = new TH.Matrix4(), q = new TH.Quaternion(), v = new TH.Vector3(), s1 = new TH.Vector3(1, 1, 1); let i = 0;
      for (let row = 0; row < 9 && i < n; row++) for (let col = 0; col < 18 && i < n; col++) {
        const x = a + 18 + col * 7.2, z = c + 22 + row * 2.9 + (row > 4 ? 4 : 0); if (x > b - 14) continue;
        const h = 1 + Math.floor(rnd() * 3);
        for (let k = 0; k < h && i < n; k++) { v.set(x, 1.3 + k * 2.62, z); m4.compose(v, q, s1); im.setMatrixAt(i, m4); im.setColorAt(i, cols[Math.floor(rnd() * cols.length)]); i++; }
      }
      im.count = i; im.castShadow = true; im.receiveShadow = true; g.add(im);
      block(a + 14, b - 10, c + 20, c + 22 + 9 * 2.9 + 4);   // 貨櫃堆走不進去
      // 起重機：紅白的門架，懸臂伸到海上
      const lights = [];
      [0.22, 0.47, 0.72].forEach(fx => {
        const x = a + (b - a) * fx, z0 = c + 3, z1 = c + 15, red = lam('#C8323A'), wht = lam('#EEECE6');
        [x - 7, x + 7].forEach(lx => [z0, z1].forEach(lz => { box(red, lx, 11, lz, 1, 22, 1); block(lx - 0.6, lx + 0.6, lz - 0.6, lz + 0.6); }));
        [z0, z1].forEach(lz => box(wht, x, 22.5, lz, 15, 1.4, 1.2));
        box(red, x, 25, (z0 + z1) / 2 - 14, 2.2, 1.6, 50);   // 懸臂（往北伸到船的上面）
        box(wht, x, 23.8, z1 - 2, 4, 3, 4);                     // 機房
        box('#2A2E36', x, 21.5, z0 - 8, 2.6, 1.6, 2.4);        // 吊具
        const L = new TH.Mesh(new TH.SphereGeometry(0.4, 6, 4), glow('#FF3A2A')); L.position.set(x, 26.2, (z0 + z1) / 2 - 38); g.add(L); lights.push(L);
      });
      // 大貨輪（靠在埠頭北邊）
      const ship = new TH.Group(), sx = a + 95, sz = c - 9;
      box('#2A2A30', 0, -0.4, 0, 96, 7, 15, { parent: ship }); box('#8A2A2A', 0, -3.2, 0, 96.2, 1.4, 15.2, { parent: ship });
      const bow = new TH.Mesh(new TH.CylinderGeometry(0.1, 7.6, 12, 3), lam('#2A2A30')); bow.rotation.z = -Math.PI / 2; bow.rotation.x = Math.PI / 2; bow.position.set(53.5, -0.4, 0); ship.add(bow);
      box('#EEECE6', -40, 7, 0, 10, 8, 13, { parent: ship }); box('#2A2E36', -40, 9.5, 6.6, 9, 1.2, 0.1, { parent: ship }); box('#C8323A', -44, 13, 0, 2.4, 5, 2.4, { parent: ship });
      const im2 = new TH.InstancedMesh(new TH.BoxGeometry(6, 2.6, 2.44), lam('#FFFFFF'), 140); let j = 0;
      for (let x = -30; x < 44 && j < 140; x += 6.4) for (let zz = -5.4; zz <= 5.4 && j < 140; zz += 2.7) { const hh = 1 + Math.floor(rnd() * 2); for (let k = 0; k < hh && j < 140; k++) { v.set(x, 4.4 + k * 2.62, zz); m4.compose(v, q, s1); im2.setMatrixAt(j, m4); im2.setColorAt(j, cols[Math.floor(rnd() * cols.length)]); j++; } }
      im2.count = j; ship.add(im2); ship.position.set(sx, 0, sz); g.add(ship);
      H = { lights, ship, tugs: [], g }; }
    // 客船埠頭：航站、往北州的渡輪
    { const [a, b, c, d] = rect('ferry');
      box('#9AB8C8', a + 16, 3.5, (c + d) / 2, 22, 7, 16); box('#E8E4DC', a + 16, 7.2, (c + d) / 2, 23, 0.5, 17); box('#2E5A8A', a + 16, 6.2, d - 0.1, 14, 1.2, 0.1);
      block(a + 5, a + 27, (c + d) / 2 - 8, (c + d) / 2 + 8, 'house');
      const fer = new TH.Group(), fx = a + 75, fz = c - 7;
      box('#F2F0EA', 0, 0.5, 0, 64, 5, 11, { parent: fer }); box('#2E5A8A', 0, -1, 0, 64.2, 1, 11.2, { parent: fer });
      box('#F2F0EA', -4, 4.5, 0, 44, 3, 10, { parent: fer }); box('#F2F0EA', -8, 7.4, 0, 30, 2.8, 9, { parent: fer }); box('#2A2E36', -8, 7.6, 4.55, 28, 0.9, 0.1, { parent: fer });
      box('#2E5A8A', -14, 11, 0, 4, 4, 3.4, { parent: fer }); box('#C8323A', -14, 12.6, 0, 4.1, 0.8, 3.5, { parent: fer });
      const fbow = new TH.Mesh(new TH.CylinderGeometry(0.1, 5.6, 9, 3), lam('#F2F0EA')); fbow.rotation.z = -Math.PI / 2; fbow.rotation.x = Math.PI / 2; fbow.position.set(36.4, 0.5, 0); fer.add(fbow);
      fer.position.set(fx, 0, fz); g.add(fer); H.ferry = fer;
      tw.inter.push({ x: a + 16, z: d + 1.5, r: 3, label: '東鶴港客船航站（看時刻表）', act: () => R.townTalk('東鶴港客船航站', [R.today ? R.dateLabel() : '', '往北州・千歲：每天一班，早上八點開。冬天浪大的時候停航。', '往納瓦：每週兩班（息日、輝日）。', pick(['（候船室裡的暖爐燒得很旺，一群穿著厚外套的人在等船。）', '（廣播：「往北州的旅客，請準備登船。」）', '（售票口的阿姨在打毛線。）'])]) });
      tw.inter.push({ x: a + 70, z: c - 0.8, r: 3, label: '看渡輪', act: () => R.townTalk('往北州的渡輪', [pick(['白色的渡輪，船身上漆著藍色的「北州丸」。', '甲板上有人在搬一箱箱的蘋果，大概是北州運來的。', '船員在甲板上抽菸，朝你揮了揮手。'])]) }); }
    // 中央埠頭：紅磚倉庫
    { const [a, b, c, d] = rect('mid');
      [[a + 22, 1], [a + 58, 0]].forEach(([x, i]) => {
        box('#9A4A36', x, 4, (c + d) / 2, 28, 8, 18); box('#6A3428', x, 8.3, (c + d) / 2, 29, 0.6, 19);
        for (let k = -2; k <= 2; k++) box('#3A2E2A', x + k * 5, 2.4, d - 4.05, 2, 3, 0.1);
        for (let k = -2; k <= 2; k++) box('#FFD08A', x + k * 5, 6, d - 4.05, 1.2, 1.2, 0.05);
        block(x - 14, x + 14, (c + d) / 2 - 9, (c + d) / 2 + 9, 'house');
      });
      tw.inter.push({ x: a + 40, z: d - 2, r: 3, label: '紅磚倉庫', act: () => R.townTalk('紅磚倉庫', [pick(['德克斯凡的商會把倉庫改成了市集。門口掛著「港の市」的布條。', '倉庫的牆上還留著舊時代的鐵環，以前是用來綁船的。', '裡面堆著一袋袋的米和一桶桶的醬油，等著上船。'])]) }); }
    // 防波堤、燈塔（港口：外防波堤的南端白燈塔、貨櫃埠頭的東南角紅燈塔）
    const lh = (x, z, col) => {
      const t = new TH.Mesh(new TH.CylinderGeometry(0.9, 1.2, 9, 10), lam(col)); t.position.set(x, 4.5, z); t.castShadow = true; g.add(t);
      box('#2A2E36', x, 9.4, z, 2.2, 0.3, 2.2); const L = new TH.Mesh(new TH.CylinderGeometry(0.7, 0.7, 1, 8), glow(col === '#C8323A' ? '#FF5A4A' : '#FFF4C8')); L.position.set(x, 10.2, z); g.add(L);
      const cap = new TH.Mesh(new TH.ConeGeometry(0.95, 0.9, 10), lam('#2A2E36')); cap.position.set(x, 11.1, z); g.add(cap); block(x - 1.3, x + 1.3, z - 1.3, z + 1.3); return L;
    };
    { const [a, b, , d] = rect('bwOut'), [ca, cb, , cd] = rect('cargo');
      H.lamps = [lh((a + b) / 2, d - 2, '#F2F0EA'), lh(cb - 2, cd - 2, '#C8323A')];
      tw.inter.push({ x: (a + b) / 2, z: d - 5, r: 3, label: '在白燈塔下看海', act: () => R.townTalk('東鶴港・白燈塔', [pick(['港口的另一邊是紅燈塔。船從兩座燈塔中間進港。', '外海停著一艘貨輪，在等著進港的信號。', '防波堤外面的浪很大，裡面的港灣卻很平靜。'])]) }); }
    // 港務局（港區的入口）
    { const [a, , c] = rect('cargo'); box('#C8C4BC', a + 7, 5, c + 6, 10, 10, 8); box('#2E3A48', a + 7, 9.2, c + 2, 8, 1, 0.1); block(a + 2, a + 12, c + 2, c + 10, 'house');
      tw.inter.push({ x: a + 7, z: c + 1, r: 3, label: '東鶴港務局', act: () => R.townTalk('東鶴港務局', ['「東鶴港：貨櫃埠頭、客船埠頭、中央埠頭。」', pick(['「德克斯凡的貨輪一週來三次，起重機日夜都在動。」', '「冬天的北風一吹，港外的浪就有三公尺高。」', '「要去北州的話，到客船航站買票。」'])]) }); }
    // 拖船（港灣裡繞圈）、外海的貨輪
    const tug = (cx, cz, r, sp) => { const t = new TH.Group(); box('#C8323A', 0, 0.4, 0, 9, 1.8, 4, { parent: t }); box('#EEECE6', -1, 2.2, 0, 3.4, 2, 3, { parent: t }); box('#2A2A30', -1.6, 3.9, 0, 0.8, 1.6, 0.8, { parent: t }); g.add(t); H.tugs.push({ t, cx, cz, r, sp, a: rnd() * 6 }); };
    tug(X0 + 200, -20, 16, 0.12); tug(X0 + 170, -78, 12, -0.16);
    { const s = new TH.Group(); box('#3A4A5A', 0, 0.5, 0, 110, 9, 17, { parent: s }); box('#EEECE6', -46, 9, 0, 12, 9, 15, { parent: s }); s.position.set(X0 + 330, 0, -30); s.rotation.y = 0.3; g.add(s); H.anchor = s; }
    tw.group.add(g);
    reblock();
    // 跨在港區上的城外東西（松樹、圍籬……）收起來（coast.js 只收到 400 公尺以內）
    tw.group.children.forEach(o => { if (o !== g && o.position.x > X0 + 0.6 && o.position.x < X0 + 470 && o.position.z > REGION[2] && o.position.z < REGION[3]) o.visible = false; });
    // 合併過的城裡建築（一大塊網格，位置在原點）有幾塊整個落在海岸線外面、浮在海上：整塊都在海上的收起來（海岸、港區自己的不算）
    { const own = new Set(); g.traverse(o => own.add(o)); const coastG = tw.group.children.find(o => o.isGroup && o.children.some(c => c.geometry && c.geometry.parameters && c.geometry.parameters.width === 420)); if (coastG) coastG.traverse(o => own.add(o));
      const bb = new TH.Box3(), XC = X0 + 1, zA = REGION[2], zB = REGION[3];
      tw.group.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh || own.has(o) || !o.visible) return; bb.setFromObject(o);
        if (bb.max.x <= XC || bb.max.z < zA || bb.min.z > zB) return;
        if (bb.min.x > XC && bb.min.z > zA && bb.max.z < zB) { o.visible = false; return; }
        // 一半在陸上、一半在海上的那幾塊：只把海上（港區範圍內）的三角形收掉（網格在原點、沒有轉，本地座標就是世界座標）
        o.updateMatrixWorld(); if (!o.matrixWorld.equals(new TH.Matrix4())) return;
        const pos = o.geometry.attributes.position, idx = o.geometry.index, sea = i => pos.getX(i) > XC && pos.getZ(i) > zA && pos.getZ(i) < zB;
        if (idx) { const a = idx.array; for (let t = 0; t < a.length; t += 3) if (sea(a[t]) && sea(a[t + 1]) && sea(a[t + 2])) a[t] = a[t + 1] = a[t + 2] = a[t]; idx.needsUpdate = true; }
        else { for (let t = 0; t < pos.count; t += 3) if (sea(t) && sea(t + 1) && sea(t + 2)) { pos.setXYZ(t + 1, pos.getX(t), pos.getY(t), pos.getZ(t)); pos.setXYZ(t + 2, pos.getX(t), pos.getY(t), pos.getZ(t)); } pos.needsUpdate = true; }
      }); }
  };
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => { enter0(from, at); H = null; const tw = W.town; if (tw && tw.group) build(tw); };
  const step0 = R.townStep;
  R.townStep = dt => {
    step0(dt); if (!H || W.inside) return; const t = W.town ? W.town.t : 0;
    H.tugs.forEach(o => { o.a += dt * o.sp; o.t.position.set(o.cx + Math.cos(o.a) * o.r, Math.sin(t * 1.3 + o.r) * 0.06, o.cz + Math.sin(o.a) * o.r); o.t.rotation.y = -o.a + (o.sp > 0 ? 0 : Math.PI); });
    if (H.ferry) H.ferry.position.y = Math.sin(t * 0.7) * 0.05;
    if (H.ship) H.ship.position.y = Math.sin(t * 0.5 + 1) * 0.04;
    const blink = Math.floor(t * 1.2) % 2 === 0; H.lights.forEach(L => { L.visible = blink; });
    const h = R.hourNow ? ((R.hourNow() % 24) + 24) % 24 : 12, night = h >= 17.5 || h < 6.5; (H.lamps || []).forEach((L, i) => { L.visible = night ? Math.floor(t * 0.8 + i) % 2 === 0 : false; });
  };
})(window.R);
