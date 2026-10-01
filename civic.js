// 討伐令 1433：城牆裡的陪都設施
// 東鶴是陪都（設定：陪都 東鶴、吉山、奉主；城市分級 縣›城›司›鄉›戶），城裡要有一座大城市該有的東西：
// 東鶴縣廳、衛兵詰所、大聯合國世界中央銀行的分行（費拉是世界央行發行的）、東鶴醫院、郵局、東鶴日報社、劇場「東鶴座」、德克斯凡百貨。
// 這些地方先保留起來（reserve），town.js 的 denseBlock 就不會在上面蓋一般的房子。
// 位置照 city.js 的 R.CITY.FAC（示意圖的 1 單位＝0.44 公尺）。房子最高六層樓（作者：沒有高樓大廈）。
// 90 年代的地方都市：站前有百貨公司（屋頂有小遊樂園）、柏青哥、遊樂場（夾娃娃機）、旅館；住宅區有錢湯、寺、公團住宅。
(function (R) {
  let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  let flagTex = null;   // 昭旭聯合王國的國旗（作者提供的 flag.webp）

  R.buildCivic = api => {
    const { group, npc, inter, block, talk, lam, SB, HB, G3, B_, glowW, darkW, woodM, gableB, sign, lampPost, pineAt, bench, vending, bike, WX, WZ, tw, E } = api;
    const FAC = R.CITY.FAC;
    const TH = THREE; seed = 3;
    const snowM = B_('#F2F6F8', { tex: 'ground' }), dk = B_('#3A3C42', { tex: 'cap' });
    // 大招牌（字跟著招牌一起放大）
    const bigSign = (x, y, z, ry, txt, bg, fg, w, h) => { const t = R.pixCanvasTex(Math.round(w * 24), Math.round(h * 24), (g, W0, H0) => { g.fillStyle = bg; g.fillRect(0, 0, W0, H0); g.strokeStyle = '#C9A13A'; g.lineWidth = 2; g.strokeRect(1, 1, W0 - 2, H0 - 2); g.fillStyle = fg; g.font = 'bold ' + Math.round(H0 * 0.62) + 'px "Noto Serif TC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W0 / 2, H0 / 2 + 1); }); const m = new TH.Mesh(new TH.PlaneGeometry(w, h), R.seeThrough(new TH.MeshBasicMaterial({ map: t }))); m.position.set(x, y, z); m.rotation.y = ry || 0; group.add(m); return m; };
    // 石造或磚造的大樓：每層一圈腰線、整排窗、平屋頂（女兒牆、積雪）；門在南面（+z）
    const civ = (sx, sy, w, d, floors, o) => {
      const x = WX(sx), z = WZ(sy), B = HB, fh = o.fh || 3.2, H = floors * fh, wall = B_(o.col || '#A8A296', { tex: o.tex || 'wall' }), trim = B_(o.trim || '#E8E4DA', { tex: 'cap' });
      B.at(x, z, 0);
      B.add(G3.box, B_('#6E6A62', { tex: 'wall' }), 0, 0.3, 0, w + 0.3, 0.6, d + 0.3);
      B.add(G3.box, wall, 0, H / 2 + 0.3, 0, w, H - 0.6 + 0.6, d);
      for (let f = 0; f < floors; f++) {
        B.add(G3.box, trim, 0, (f + 1) * fh + 0.3, d / 2 + 0.04, w + 0.1, 0.16, 0.1);
        const n = Math.max(2, Math.floor(w / (o.win || 1.8))); for (let i = 0; i < n; i++) { const wx = -w / 2 + (i + 0.5) * w / n; if (f === 0 && Math.abs(wx) < (o.door || 1.6)) continue; B.add(G3.box, rnd() < 0.65 ? glowW : darkW, wx, f * fh + 1.9, d / 2 + 0.03, Math.min(1.1, w / n - 0.5), 1.3, 0.05); }
        [-1, 1].forEach(sd => { for (let i = 0; i < Math.max(1, Math.floor(d / 2.4)); i++) B.add(G3.box, rnd() < 0.5 ? glowW : darkW, sd * (w / 2 + 0.03), f * fh + 1.9, -d / 2 + (i + 0.5) * d / Math.max(1, Math.floor(d / 2.4)), 0.05, 1.2, 0.9); });
      }
      B.add(G3.box, B_('#4A4C52', { tex: 'cap' }), 0, H + 0.4, 0, w - 0.1, 0.12, d - 0.1); B.add(G3.box, snowM, 0, H + 0.48, 0, w - 0.8, 0.06, d - 0.8);
      [[0, d / 2, w + 0.2, 0.25], [0, -d / 2, w + 0.2, 0.25]].forEach(([px, pz, pw, pd]) => B.add(G3.box, trim, px, H + 0.8, pz, pw, 0.8, pd)); [-1, 1].forEach(sd => B.add(G3.box, trim, sd * w / 2, H + 0.8, 0, 0.25, 0.8, d + 0.2));
      B.add(G3.box, B_('#3A2A1C', { tex: 'planks' }), 0, 1.5, d / 2 + 0.05, o.doorW || 2.2, 2.4, 0.08);
      if (o.columns) { [-1, 1].forEach(sd => [1.6, 3.2].forEach(cx => B.add(G3.cyl, trim, sd * cx, 2.0, d / 2 + 1.0, 0.5, 3.4, 0.5))); B.add(G3.box, trim, 0, 3.85, d / 2 + 1.0, 8.0, 0.4, 1.6); B.add(G3.box, snowM, 0, 4.1, d / 2 + 1.0, 7.6, 0.08, 1.4); B.add(G3.box, B_('#8A8478', { tex: 'cap' }), 0, 0.15, d / 2 + 1.4, 8.4, 0.3, 2.4); }
      else { B.add(G3.box, dk, 0, 3.0, d / 2 + 0.8, (o.doorW || 2.2) + 1.6, 0.14, 1.6); B.add(G3.box, snowM, 0, 3.1, d / 2 + 0.6, (o.doorW || 2.2) + 1.2, 0.05, 0.8); }
      B.at(null); block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'house');
      if (o.columns) [-1, 1].forEach(sd => [1.6, 3.2].forEach(cx => block(x + sd * cx - 0.25, x + sd * cx + 0.25, z + d / 2 + 0.75, z + d / 2 + 1.25, 'deco')));
      return { x, z, w, d, H, front: z + d / 2, door: [x, z + d / 2 + (o.columns ? 2.8 : 1.4)] };
    };
    const flagpole = (x, z, h, tex) => { SB.add(G3.cyl, lam('#C8C8CC', { tex: 0 }), x, h / 2, z, 0.16, h, 0.16); SB.add(G3.box, lam('#6A6A70', { tex: 'cap' }), x, 0.2, z, 0.6, 0.4, 0.6); block(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 'deco'); const fl = new TH.Mesh(new TH.PlaneGeometry(1.8, 1.35), R.seeThrough(new TH.MeshLambertMaterial({ map: tex, side: TH.DoubleSide }))); fl.position.set(x + 0.95, h - 0.75, z); group.add(fl); tw.fx.push({ kind: 'flag', m: fl, ph: x }); };
    if (!flagTex) { flagTex = new TH.TextureLoader().load('flag.webp'); flagTex.encoding = TH.sRGBEncoding; flagTex.userData.shared = true; }

    // ---------- 東鶴縣廳：五層的石造廳舍、前庭、國旗 ----------
    { const b = civ(FAC.pref[0], FAC.pref[1], 26, 15, 5, { col: '#B4AEA2', columns: 1, win: 1.7, door: 4.2, fh: 3.4 });
      HB.at(b.x, b.z, 0); HB.add(G3.box, B_('#B4AEA2', { tex: 'wall' }), 0, b.H + 2.0, -1, 5, 2.6, 5); HB.add(G3.box, dk, 0, b.H + 3.4, -1, 5.4, 0.2, 5.4); HB.add(G3.box, snowM, 0, b.H + 3.52, -1, 5, 0.06, 5); HB.at(null);
      const face = new TH.Mesh(new TH.CircleGeometry(0.9, 20), R.seeThrough(new TH.MeshLambertMaterial({ color: '#F4ECD8', emissive: '#FFE8B0', emissiveIntensity: 0.5 }))); face.position.set(b.x, b.H + 2.2, b.z + 1.52); group.add(face);
      bigSign(b.x, 4.6, b.front + 1.82, 0, '東鶴縣廳', '#2E2A26', '#F4E9CD', 4.2, 0.8);
      [-6, 6].forEach(o => flagpole(b.x + o, b.front + 5, 7, flagTex));
      for (let i = 0; i < 2; i++) pineAt(b.x - 9 + i * 18, b.front + 3, 0.9); bench(b.x - 3.5, b.front + 4.6, 0); bench(b.x + 3.5, b.front + 4.6, 0);
      inter(b.door[0], b.door[1], 2.4, '東鶴縣廳的服務台', () => talk('東鶴縣廳', E.martial ? ['「今日退位大典，縣廳只辦緊急事務。」', '大廳的收音機正在轉播皇嶺的典禮。'] : [pick(['「勇者登記請到公會分館；這裡是縣廳。」', '「陪都的事情多：皇嶺的人來來去去，戶籍、通行證都在這裡辦。」', '「河西的西橋什麼時候修好？預算還在審。」'])])); }
    // ---------- 衛兵詰所：官廳街，衛兵輪班的地方 ----------
    { const b = civ(FAC.guardHQ[0], FAC.guardHQ[1], 13, 9, 3, { col: '#8E8A80', win: 2.0 });
      bigSign(b.x, 3.6, b.front + 1.62, 0, '衛兵詰所', '#2E3A48', '#F4E9CD', 2.8, 0.6);
      HB.add(G3.box, B_('#E04A3A', { em: '#C0281A', ei: 1 }), b.x + 3.6, 3.1, b.front + 0.3, 0.4, 0.4, 0.4);
      const g = npc(b.x + 2.2, b.front + 1.6, { top: '#3E4A5A', hair: '#2A2420', cloak: '#2E3A48', shield: true }, '詰所的衛兵', 0, 'spear', 'knight'); g.watch = { range: 11, fov: 1.0, guard: 1 }; tw.watchers.push(g); g.guard = true;
      inter(b.door[0], b.door[1], 2.2, '衛兵詰所', () => talk('衛兵詰所', [R.crimeHud && R.crimeHud() ? '「……你最近是不是在哪裡偷了東西？別讓我們抓到。」' : pick(['「城裡的治安歸我們管。遺跡裡的事歸公會。」', '「失物招領在左邊的櫃子。撿到勇者證要送公會，不是送這裡。」'])]));
      bike(b.x - 4, b.front + 1.2, 0.2); bike(b.x - 3.3, b.front + 1.2, 0.2); }
    // ---------- 大聯合國世界中央銀行 東鶴分行：國道邊、石柱的門面 ----------
    { const b = civ(FAC.bank[0], FAC.bank[1], 18, 12, 4, { col: '#C8C2B4', columns: 1, win: 1.6, door: 2.0, fh: 3.6 });
      bigSign(b.x, 4.6, b.front + 1.82, 0, '世界中央銀行・東鶴分行', '#2A2A30', '#E8D8A0', 4.6, 0.6);
      inter(b.door[0], b.door[1], 2.2, '世界中央銀行・東鶴分行', () => talk('世界中央銀行・東鶴分行', ['「費拉的存提、兌換、匯款。」', '「赤金和昭旭的舊銅錢，請到西市兌換所驗過再拿來。」', E.martial ? '今天因為戒嚴，只開半天。' : '櫃台前排了一小排人。'])); }
    // ---------- 東鶴醫院：白色的五層樓、急診的門、救護車 ----------
    { const b = civ(FAC.hospital[0], FAC.hospital[1], 24, 14, 5, { col: '#ECEAE4', trim: '#C8D8D0', win: 1.6, fh: 3.0, doorW: 3 });
      bigSign(b.x, 3.55, b.front + 1.62, 0, '東鶴醫院', '#2E5A4A', '#F4F8F4', 3.4, 0.7);
      HB.add(G3.box, B_('#3A8A5A', { em: '#2A6A3A', ei: 0.6 }), b.x + b.w / 2 - 1, b.H - 0.5, b.front + 0.1, 0.9, 0.9, 0.1);
      { const cb = R.Batch(), x = b.x - 8, z = b.front + 3; cb.at(x, z, Math.PI / 2); const wb = lam('#F0F0EC', { tex: 0 }); cb.add(G3.box, wb, 0, 1.4, 0.5, 2.0, 1.8, 3.4); cb.add(G3.box, wb, 0, 1.2, -1.8, 2.0, 1.4, 1.4); cb.add(G3.box, lam('#C83A3A', { tex: 0 }), 0, 1.2, 0.5, 2.02, 0.2, 3.42); cb.add(G3.box, lam('#9AB4C8', { em: '#203040', ei: 0.3 }), 0, 1.6, -2.45, 1.8, 0.6, 0.05); cb.flush(group); block(x - 2.5, x + 2.5, z - 1.1, z + 1.1, 'deco'); }
      inter(b.door[0], b.door[1], 2.4, '東鶴醫院', () => talk('東鶴醫院', ['「從遺跡抬回來的勇者，請走急診的門。」', pick(['「冬天跌倒骨折的老人家特別多。」', '「這是德克斯凡出錢擴建的新病棟。」', '「魔力枯竭的病人，請先到白藤堂拿藥。」'])])); }
    // ---------- 郵局：門口有紅色的郵筒 ----------
    { const b = civ(FAC.post[0], FAC.post[1], 12, 8, 2, { col: '#C8B8A0', win: 1.8, door: 1.4 });
      bigSign(b.x, 3.55, b.front + 1.62, 0, '東鶴郵局', '#8A2A24', '#F4F0E6', 2.6, 0.6);
      const px = b.x + 3.2, pz = b.front + 0.7; SB.add(G3.cyl, lam('#C8323A', { tex: 0 }), px, 0.75, pz, 0.6, 1.5, 0.6); SB.add(G3.cyl, lam('#A82A2A', { tex: 0 }), px, 1.55, pz, 0.68, 0.12, 0.68); SB.add(G3.box, lam('#1A1A1A', { tex: 0 }), px, 1.2, pz + 0.3, 0.3, 0.06, 0.04); block(px - 0.32, px + 0.32, pz - 0.32, pz + 0.32, 'deco');
      inter(b.door[0], b.door[1], 2.2, '東鶴郵局', () => talk('東鶴郵局', ['「信件、包裹，往皇嶺的明天就到。」', '「年底的賀年信，記得早點寄。」']));
      inter(px, pz + 1, 1.4, '紅色的郵筒', () => R.townToast('郵筒上寫著收件時間：上午十時、下午三時。')); }
    // ---------- 東鶴日報社：瓦版就是這裡印的 ----------
    { const b = civ(FAC.paper[0], FAC.paper[1], 12, 9, 3, { col: '#9A8A7A', tex: 'wall', win: 1.6 });
      bigSign(b.x, 3.55, b.front + 1.62, 0, '東鶴日報社', '#2A2A30', '#F4E9CD', 3.0, 0.6);
      for (let i = 0; i < 3; i++) SB.add(G3.box, lam('#6A4A2E', { tex: 'planks' }), b.x - 3 + i * 0.9, 0.35, b.front + 1.4, 0.8, 0.7, 0.6); block(b.x - 3.5, b.x - 0.9, b.front + 1.1, b.front + 1.7, 'deco');
      inter(b.door[0], b.door[1], 2.2, '東鶴日報社（今天的瓦版）', () => (R.newsSheet ? R.newsSheet() : talk('東鶴日報社', ['印刷機轟隆隆地響。']))); }
    // ---------- 劇場「東鶴座」：門口的大招牌、一排旗子 ----------
    { const x = WX(FAC.theater[0]), z = WZ(FAC.theater[1]), w = 16, d = 12, B = HB, H = 8; B.at(x, z, 0);
      B.add(G3.box, B_('#8A3A2E', { tex: 'planks' }), 0, H / 2, 0, w, H, d); B.add(G3.box, B_('#3A2A1C', { tex: 'planks' }), 0, 1.4, d / 2 + 0.04, 4, 2.8, 0.08);
      B.add(G3.box, B_('#2E2A2A', { tex: 'cap' }), 0, H + 0.2, 0, w + 0.6, 0.4, d + 0.6); B.add(G3.box, snowM, 0, H + 0.45, 0, w, 0.08, d);
      B.add(G3.box, B_('#E8D8B0', { em: '#B8803A', ei: 0.7 }), 0, 3.5, d / 2 + 0.6, w - 1, 1.2, 0.1); B.add(G3.box, B_('#3A2A1C', { tex: 0 }), 0, 2.85, d / 2 + 0.7, w, 0.14, 1.4);
      for (let i = 0; i < 6; i++) { const fx = -w / 2 + 1 + i * (w - 2) / 5; B.add(G3.box, B_('#2A2A30', { tex: 0 }), fx, 1.4, d / 2 + 1.6, 0.06, 2.8, 0.06); B.add(G3.box, B_(['#C83A3A', '#E8C03A', '#F0ECE2'][i % 3], { tex: 0 }), fx + 0.25, 1.7, d / 2 + 1.6, 0.42, 2.0, 0.03); }
      B.at(null); block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'house');
      bigSign(x, 5.6, z + d / 2 + 0.06, 0, '東鶴座', '#1E1414', '#F4D88A', 4.4, 1.2); sign(x, 3.5, z + d / 2 + 0.68, 0, '今夜上演・《雪中的勇者》', '#3A1E14', 5.6);
      inter(x, z + d / 2 + 2.4, 2.4, '劇場「東鶴座」', () => talk('東鶴座', E.martial ? ['「大典那天停演一天。」'] : ['「今晚的戲是《雪中的勇者》：一個勇者在遺跡裡迷路的故事。」', '「票賣完了。站票的話，開演前再來看看。」'])); }
    // ---------- 德克斯凡百貨：站前的六層樓、大櫥窗、垂幕、屋頂的小遊樂園 ----------
    { const b = civ(FAC.dept[0], FAC.dept[1], 28, 22, 6, { col: '#D8D4CC', tex: 'wall', win: 1.4, fh: 3.8, doorW: 4 });
      [-10, -5, 5, 10].forEach(o => HB.add(G3.box, B_('#BFE0F0', { em: '#4A7A9A', ei: 0.75 }), b.x + o, 1.8, b.front + 0.06, 4.2, 2.8, 0.06));
      HB.add(G3.box, B_('#2E3A4A', { tex: 'cap' }), b.x, 3.6, b.front + 1.2, 12, 0.2, 2.4); HB.add(G3.box, snowM, b.x, 3.73, b.front + 1.2, 11.6, 0.06, 2.2);
      // 外牆的垂幕（年底大特賣）
      [[-8, '#C83A3A', '歲末大特賣'], [8, '#2E5A8A', '德克斯凡家電展']].forEach(([o, c, t]) => { const tx = R.pixCanvasTex(40, 200, (g, W0, H0) => { g.fillStyle = c; g.fillRect(0, 0, W0, H0); g.fillStyle = '#F4F0E6'; g.font = 'bold 30px "Noto Serif TC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; [...t].forEach((ch, i) => g.fillText(ch, W0 / 2, 22 + i * 36)); }); const m = new TH.Mesh(new TH.PlaneGeometry(1.4, 7), R.seeThrough(new TH.MeshBasicMaterial({ map: tx }))); m.position.set(b.x + o, b.H - 6, b.front + 0.08); group.add(m); });
      // 頂樓：大招牌、水塔、屋頂遊樂園（小摩天輪、旋轉木馬）
      const top = b.H + 0.5;
      bigSign(b.x - 4, top + 2.6, b.z - b.d / 2 + 2, 0, '德克斯凡百貨', '#1E2A3A', '#BFE8FF', 9, 1.8); HB.add(G3.box, dk, b.x - 4, top + 1.0, b.z - b.d / 2 + 1.9, 0.2, 2.2, 0.2);
      HB.add(G3.cyl, B_('#6A6A70', { tex: 0 }), b.x - 10, top + 1.5, b.z + 4, 2.4, 2.4, 2.4); HB.add(G3.box, B_('#4A4A50', { tex: 0 }), b.x - 10, top + 0.4, b.z + 4, 2, 0.8, 2);
      { const wx = b.x + 8, wz = b.z - 2, wy = top + 5.2, wheel = new TH.Group(); wheel.position.set(wx, wy, wz); group.add(wheel);
        const wb = R.Batch(), spoke = lam('#E8E4DC', { tex: 0 }), cabC = ['#C83A3A', '#E8C03A', '#3A8ACF', '#5AC88A'];
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; wb.add(G3.box, spoke, Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0, 3.8, 0.08, 0.08, 0, 0, a); wb.add(G3.box, spoke, Math.cos(a) * 3.8, Math.sin(a) * 3.8, 0, 0.12, 2.0, 0.12, 0, 0, a + Math.PI / 2); }
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; wb.add(G3.box, lam(cabC[i % 4], { tex: 0 }), Math.cos(a) * 3.8, Math.sin(a) * 3.8 - 0.5, 0, 0.8, 0.8, 0.8); }
        wb.flush(wheel, true); tw.fx.push({ kind: 'spin', m: wheel, sp: 0.25 });
        [-1, 1].forEach(sd => HB.add(G3.box, B_('#8A8C92', { tex: 0 }), wx + sd * 1.5, top + 2.6, wz, 0.25, 5.4, 0.25, 0, 0, sd * 0.28)); }
      { const cx = b.x + 1, cz = b.z + 5; HB.add(G3.cyl, B_('#E8D8B0', { tex: 0 }), cx, top + 0.2, cz, 4.4, 0.4, 4.4); HB.add(G3.cone, B_('#C83A3A', { tex: 0 }), cx, top + 3.4, cz, 4.8, 1.4, 4.8); HB.add(G3.cone, snowM, cx, top + 3.62, cz, 4.2, 1.0, 4.2); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; HB.add(G3.box, B_('#C9A13A', { tex: 0 }), cx + Math.cos(a) * 1.7, top + 1.5, cz + Math.sin(a) * 1.7, 0.08, 2.4, 0.08); HB.add(G3.box, B_(['#F0ECE2', '#8A6A44', '#E8A0B0'][i % 3], { tex: 0 }), cx + Math.cos(a) * 1.7, top + 0.9, cz + Math.sin(a) * 1.7, 0.4, 0.5, 0.8, 0, -a, 0); } }
      HB.add(G3.box, B_('#E8A03A', { em: '#E8A03A', ei: 0.8 }), b.x + b.w / 2 + 0.2, b.H * 0.55, b.front - 2, 0.2, b.H * 0.6, 1.0);
      inter(b.door[0], b.door[1], 2.6, '德克斯凡百貨（樓層介紹、買東西、屋頂遊樂園）', () => R.deptSheet());
      vending(b.x + 13, b.front + 1.2); bike(b.x - 13, b.front + 1.4, 0.1); bike(b.x - 12.3, b.front + 1.4, 0.1); }
    // ---------- 錢湯「松之湯」：高高的煙囪、男湯女湯的暖簾 ----------
    { const [sx, sy] = FAC.bath, x = WX(sx), z = WZ(sy), w = 12, d = 10, B = HB, h = 4.2; B.at(x, z, 0);
      B.add(G3.box, B_('#D8D0BE'), 0, h / 2, 0, w, h, d); gableB(B, w, d, h, 0, '#D8D0BE');
      B.add(G3.box, B_('#5A3E26', { tex: 'planks' }), 0, 1.3, d / 2 + 0.04, 3, 2.4, 0.08); [[-0.8, '#2E4A8A'], [0.8, '#C83A3A']].forEach(([o, c]) => B.add(G3.box, B_(c, { tex: 0 }), o, 2.0, d / 2 + 0.12, 1.4, 0.9, 0.03));
      B.add(G3.box, B_('#8A5A44', { tex: 'wall' }), -w / 2 + 1.2, 8, -d / 2 + 1.2, 1.4, 16, 1.4); B.add(G3.box, B_('#3A3A40', { tex: 0 }), -w / 2 + 1.2, 16.1, -d / 2 + 1.2, 1.6, 0.3, 1.6);
      B.at(null); block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'house'); block(x - w / 2 + 0.4, x - w / 2 + 2, z - d / 2 + 0.4, z - d / 2 + 2, 'house');
      tw.smokes.push({ x: x - w / 2 + 1.2, y: 16.6, z: z - d / 2 + 1.2, big: 1 });
      sign(x, 3.4, z + d / 2 + 0.15, 0, '錢湯・松之湯', '#2E4A3A', 3.0);
      inter(x, z + d / 2 + 1.4, 2.2, '錢湯「松之湯」（泡澡 8 費拉）', () => R.sento()); }
    // ---------- 寺：山門、本堂、鐘樓、石燈籠、後面的墓 ----------
    { const [sx, sy] = FAC.temple, x = WX(sx), z = WZ(sy) - 2, B = HB, w = 12, d = 9, h = 4.2; B.at(x, z, 0);
      B.add(G3.box, B_('#E6E0D2'), 0, h / 2, 0, w, h, d); B.add(G3.box, B_('#5A3E26', { tex: 'planks' }), 0, h / 2, d / 2 + 0.03, w, h, 0.06);
      gableB(B, w + 2, d + 2, h, 0, '#E6E0D2'); B.add(G3.box, B_('#7A766E', { tex: 'wall' }), 0, 0.3, d / 2 + 1.2, w, 0.6, 2.4);
      B.at(null); block(x - w / 2 - 1, x + w / 2 + 1, z - d / 2 - 1, z + d / 2 + 1, 'house');
      const gz = z + 10; [-2.2, 2.2].forEach(o => { HB.add(G3.box, woodM, x + o, 2, gz, 0.5, 4, 0.5); block(x + o - 0.3, x + o + 0.3, gz - 0.3, gz + 0.3, 'deco'); }); HB.add(G3.box, B_('#3A3A44', { tex: 'cap' }), x, 4.3, gz, 6.4, 0.5, 2.6); HB.add(G3.box, snowM, x, 4.6, gz, 6, 0.1, 2.2);
      { const bx = x + 9, bz = z + 2; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => HB.add(G3.box, woodM, bx + a * 1.2, 2.2, bz + c * 1.2, 0.24, 4.4, 0.24)); HB.add(G3.cone, B_('#3A3A44', { tex: 'cap' }), bx, 5.2, bz, 4, 1.4, 4, 0, Math.PI / 4, 0); HB.add(G3.cyl, B_('#6A5A3A', { tex: 0 }), bx, 3.4, bz, 1.0, 1.4, 1.0); block(bx - 1.4, bx + 1.4, bz - 1.4, bz + 1.4, 'deco');
        inter(bx, bz + 2.2, 1.8, '寺的鐘樓（敲一下）', () => { R.townToast('咚——。鐘聲在雪地裡傳得很遠。'); R.sfx && R.sfx('skill'); }); }
      [[-5, 6], [5, 6]].forEach(([a, c]) => { SB.add(G3.box, lam('#8C8A82', { tex: 'wall' }), x + a, 0.65, z + c, 0.26, 0.9, 0.26); SB.add(G3.box, lam('#FFD9A0', { em: '#FFB050', ei: 0.9 }), x + a, 1.3, z + c, 0.44, 0.4, 0.44); SB.add(G3.cone, lam('#EEF2F4', { tex: 'ground' }), x + a, 1.68, z + c, 1.1, 0.36, 1.1, 0, Math.PI / 4, 0); block(x + a - 0.3, x + a + 0.3, z + c - 0.3, z + c + 0.3, 'deco'); });
      // 墓碑排在本堂的西側（原本第二排跑出寺的地、插進北邊鄰居的房子）
      for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) { const gx = x - 11.6 + i * 1.6, gz2 = z - 3.2 + r * 2.2; SB.add(G3.box, lam('#9C9A94', { tex: 'wall' }), gx, 0.6, gz2, 0.5, 1.2, 0.3); SB.add(G3.box, snowM, gx, 1.22, gz2, 0.52, 0.05, 0.32); block(gx - 0.3, gx + 0.3, gz2 - 0.2, gz2 + 0.2, 'deco'); }
      sign(x, 3.2, z + d / 2 + 0.1, 0, '東鶴寺', '#3A2A1C', 2.4);
      inter(x, gz + 1.4, 2.2, '東鶴寺', () => talk('東鶴寺', [pick(['住持在掃雪：「年底的除夕夜，這裡會敲一百零八下鐘。」', '「遺跡裡回不來的勇者，名字都刻在後面的慰靈碑上。」'])])); }
    // ---------- 公團住宅：兩棟五層樓，陽台一整排、側面漆著大大的號碼 ----------
    FAC.danchi.forEach(([sx, sy], k) => {
      const x = WX(sx), z = WZ(sy), w = 18, d = 7.5, fl = 5, fh = 2.8, H = fl * fh, B = HB, wall = B_('#D8D4C8', { tex: 'plaster' }); B.at(x, z, 0);
      B.add(G3.box, wall, 0, H / 2, 0, w, H, d);
      for (let f = 0; f < fl; f++) { B.add(G3.box, B_('#B8B4AA', { tex: 'cap' }), 0, f * fh + 0.05, d / 2 + 0.6, w, 0.12, 1.2); B.add(G3.box, B_('#C8CCD0', { tex: 0 }), 0, f * fh + 0.6, d / 2 + 1.18, w, 0.9, 0.06); for (let i = 0; i < 6; i++) { B.add(G3.box, Math.random() < 0.5 ? glowW : darkW, -w / 2 + 1.5 + i * 3, f * fh + 1.6, d / 2 + 0.03, 1.6, 1.4, 0.05); if (f > 0 && Math.random() < 0.4) B.add(G3.box, B_(pick(['#E8E4D8', '#7A9AC8', '#C87A7A']), { tex: 0 }), -w / 2 + 1.5 + i * 3, f * fh + 1.0, d / 2 + 1.1, 1.2, 0.6, 0.03); } }
      B.add(G3.box, B_('#4A4C52', { tex: 'cap' }), 0, H + 0.1, 0, w + 0.3, 0.2, d + 0.3); B.add(G3.box, snowM, 0, H + 0.22, 0, w - 0.4, 0.06, d - 0.4); B.add(G3.box, B_('#9A9CA2', { tex: 'wall' }), w / 4, H / 2, -d / 2 - 0.8, 2.2, H + 1.2, 1.6);
      B.at(null); block(x - w / 2, x + w / 2, z - d / 2 - 1.6, z + d / 2 + 1.2, 'house');
      const num = R.pixCanvasTex(24, 32, (g, W0, H0) => { g.fillStyle = '#D8D4C8'; g.fillRect(0, 0, W0, H0); g.fillStyle = '#3A5A8A'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(k + 1), W0 / 2, H0 / 2 + 1); });
      const nm = new TH.Mesh(new TH.PlaneGeometry(2.2, 2.9), R.seeThrough(new TH.MeshLambertMaterial({ map: num }))); nm.position.set(x + w / 2 + 0.02, H - 2.5, z); nm.rotation.y = Math.PI / 2; group.add(nm);
      inter(x - w / 2 + 1.5, z + d / 2 + 2, 1.6, '公團住宅 ' + (k + 1) + ' 號棟', () => R.townToast(pick(['樓梯間貼著：「垃圾請在收集日早上八點前拿出來。」', '不知道哪一戶在煮咖哩，整個樓梯間都是香味。', '信箱上的名字有一半是外地人的姓。'])));
    });
    // ---------- 旅館（六層樓）：住一晚 ----------
    { const b = civ(FAC.hotel[0], FAC.hotel[1], 16, 12, 6, { col: '#C8B8A8', win: 1.5, fh: 3.1, doorW: 2.4 });
      bigSign(b.x, b.H + 1.4, b.z, 0, '東鶴旅館', '#2A1E3A', '#F4D8F0', 5, 1.2); HB.add(G3.box, dk, b.x, b.H + 0.6, b.z, 0.2, 1.2, 0.2);
      HB.add(G3.box, B_('#C83A6A', { em: '#C83A6A', ei: 0.8 }), b.x + b.w / 2 + 0.2, b.H * 0.6, b.front - 2, 0.2, b.H * 0.5, 0.9);
      inter(b.door[0], b.door[1], 2.2, '東鶴旅館（住一晚 40 費拉）', () => R.hotelSheet(b.door)); }
    // ---------- 柏青哥「銀河」：整面的燈泡、霓虹、旗子 ----------
    { const b = civ(FAC.pachinko[0], FAC.pachinko[1], 17, 12, 2, { col: '#3A2A4A', win: 3, fh: 4.0, doorW: 3.4 });
      for (let i = 0; i < 16; i++) HB.add(G3.box, B_(['#FFE04A', '#FF5A8A', '#5AE0FF'][i % 3], { em: ['#FFE04A', '#FF5A8A', '#5AE0FF'][i % 3], ei: 1 }), b.x - 8 + i * 1.07, b.H - 0.4, b.front + 0.08, 0.3, 0.3, 0.06);
      bigSign(b.x, b.H - 1.8, b.front + 0.1, 0, '柏青哥・銀河', '#1A0A2A', '#FFE04A', 7, 1.4);
      for (let i = 0; i < 5; i++) { const fx = b.x - 7 + i * 3.5; SB.add(G3.box, lam('#2A2A30', { tex: 0 }), fx, 1.4, b.front + 2.2, 0.06, 2.8, 0.06); SB.add(G3.box, lam(['#C83A3A', '#E8C03A', '#3A8ACF'][i % 3], { tex: 0 }), fx + 0.25, 1.8, b.front + 2.2, 0.45, 1.8, 0.03); }
      inter(b.door[0], b.door[1], 2.4, '柏青哥「銀河」（一盒鋼珠 10 費拉）', () => R.pachinko()); }
    // ---------- 遊樂場（電玩、夾娃娃機） ----------
    { const b = civ(FAC.game[0], FAC.game[1], 14, 11, 2, { col: '#2E3A5A', win: 2.6, fh: 3.8, doorW: 3 });
      bigSign(b.x, b.H - 1.4, b.front + 0.1, 0, '遊樂場・夾娃娃機', '#0A1A3A', '#7AE0FF', 6.4, 1.1);
      [-4.5, 4.5].forEach(o => { const ux = b.x + o, uz = b.front + 1.0; SB.add(G3.box, lam('#E8E4DC', { tex: 0 }), ux, 0.5, uz, 1.3, 1.0, 1.1); SB.add(G3.box, lam('#BFE8F8', { em: '#5AA8D8', ei: 0.6 }), ux, 1.5, uz, 1.2, 1.0, 1.0); for (let i = 0; i < 3; i++) SB.add(G3.sph, lam(['#F2A0B8', '#E8C03A', '#A87AE8'][i], { tex: 0 }), ux - 0.3 + i * 0.3, 1.15, uz, 0.3, 0.3, 0.3); SB.add(G3.box, lam('#FF5A8A', { em: '#FF5A8A', ei: 0.8 }), ux, 2.1, uz, 1.3, 0.2, 1.1); block(ux - 0.7, ux + 0.7, uz - 0.6, uz + 0.6, 'deco'); });
      inter(b.door[0], b.door[1], 2.2, '遊樂場（夾娃娃機一次 3 費拉）', () => R.ufoCatcher()); }
    // ---------- 站前的衛兵崗亭（紅燈） ----------
    { const [sx, sy] = FAC.koban, x = WX(sx), z = WZ(sy); HB.add(G3.box, B_('#C8C4BC', { tex: 'wall' }), x, 1.4, z, 2.6, 2.8, 2.6); HB.add(G3.box, glowW, x, 1.6, z + 1.31, 1.2, 1.0, 0.05); HB.add(G3.box, B_('#3A3C42', { tex: 'cap' }), x, 2.9, z, 3, 0.16, 3); HB.add(G3.box, snowM, x, 3.0, z, 2.8, 0.06, 2.8); HB.add(G3.sph, B_('#E04A3A', { em: '#E02A1A', ei: 1 }), x, 3.3, z + 1.1, 0.35, 0.35, 0.35); block(x - 1.3, x + 1.3, z - 1.3, z + 1.3, 'house');
      sign(x, 2.4, z + 1.32, 0, '衛兵崗亭', '#2E3A48', 1.8);
      const gd = npc(x + 2, z + 1.6, { top: '#3E4A5A', hair: '#2A2420', cloak: '#2E3A48', shield: true }, '站前崗亭的衛兵', 0, 'spear', 'knight'); gd.watch = { range: 11, fov: 1.0, guard: 1 }; tw.watchers.push(gd); gd.guard = true;
      inter(x + 2, z + 2.6, 1.8, '和崗亭的衛兵說話', () => talk('站前崗亭的衛兵', [E.martial ? '「戒嚴中。電車停駛，車站也不讓人進。」' : pick(['「從皇嶺來的人越來越多，車站前要有人顧著。」', '「平交道別亂闖。上個月有個醉漢差點被電車撞。」', '「商店街的扒手，十個有八個是外地來的。……你別看我，我只是說說。」'])]), { follow: gd }); }
  };

  // ---------- 百貨公司、柏青哥、夾娃娃機、錢湯、旅館（小小的玩法） ----------
  const gold = n => { if (R.S.gold < n) { R.townToast('錢不夠（要 ' + n + ' 費拉）。'); return false; } R.S.gold -= n; R.save(); return true; };
  R.deptSheet = () => {
    const E = R.eventsToday ? R.eventsToday() : {};
    R.sheet('<p class="kicker">站前・六層樓</p><h2>德克斯凡百貨</h2><ul class="loot"><li>B1　食品（德克斯凡的罐頭、皇嶺的點心）</li><li>1F　化妝品・飾品</li><li>2F　女裝　3F　紳士服</li><li>4F　生活用品・德克斯凡家電（收音機、魔導暖爐）</li><li>5F　玩具・書籍・唱片</li><li>6F　餐廳街</li><li>屋頂　小遊樂園（摩天輪、旋轉木馬）</li></ul><p class="note">' + (E.martial ? '今天退位大典，四樓的收音機前擠滿了人。' : '年底大特賣。電扶梯上上下下都是人。') + '</p>',
      '<div class="row"><button type="button" class="btn pri" id="dp-buy">買東西（機油、零件、溫室玫瑰）</button><button type="button" class="btn" id="dp-food">到餐廳街吃飯（12 費拉）</button><button type="button" class="btn" id="dp-roof">上屋頂坐摩天輪（3 費拉）</button><button type="button" class="btn" id="dp-x">走了</button></div>');
    document.getElementById('dp-buy').onclick = () => { R.closeSheet(); if (R.dexShop) R.dexShop('parts'); };
    document.getElementById('dp-food').onclick = () => { if (!gold(12)) return; R.closeSheet(); const s = R.S; s.buff = { kind: 'dept', b: { hp: 0.04, mp: 0.06 }, until: s.day }; R.save(); R.townTalk('德克斯凡百貨・餐廳街', ['兒童午餐上插著一支小旗子。你點了大人的咖哩飯。', '（下一趟遺跡：生命 +4%、魔力 +6%，只有今天）']); };
    document.getElementById('dp-roof').onclick = () => { if (!gold(3)) return; R.closeSheet(); R.townTalk('屋頂遊樂園', ['摩天輪慢慢轉到最上面。', '看得到整個東鶴：舊城的城牆、霜溪、北邊的山，還有站前一排一排的屋頂。']); };
    document.getElementById('dp-x').onclick = R.closeSheet;
  };
  R.pachinko = () => {
    if (!gold(10)) return;
    const r = Math.random(), win = r < 0.03 ? 100 : r < 0.15 ? 20 + Math.floor(Math.random() * 21) : r < 0.4 ? 5 + Math.floor(Math.random() * 11) : 0;
    R.S.gold += win; R.save();
    R.townTalk('柏青哥「銀河」', win >= 100 ? ['叮叮叮叮——！大當！', '鋼珠一直滾出來。換到 ' + win + ' 費拉。'] : win ? ['鋼珠叮叮噹噹地落下。', '換回 ' + win + ' 費拉。'] : ['一盒鋼珠一下子就打完了。', '旁邊的大叔說：「這台今天不會出啦。」']);
  };
  R.ufoCatcher = () => {
    if (!gold(3)) return;
    if (Math.random() < 0.22) { const k = ['dango', 'dorayaki', 'rose', 'notebook'][Math.floor(Math.random() * 4)]; if (R.addGift) R.addGift(k, 1); R.save(); R.townTalk('夾娃娃機', ['爪子夾住了……掉進洞裡了！', '裡面不是娃娃，是一份「' + (R.GIFTS && R.GIFTS[k] ? R.GIFTS[k].name : k) + '」的兌換券。去櫃台換了。']); }
    else R.townTalk('夾娃娃機', ['爪子夾住了……又鬆開了。', '店員在玻璃另一邊偷笑。']);
  };
  R.sento = () => {
    const s = R.S; if (s.sentoDay === s.day) { R.townTalk('松之湯', ['今天已經泡過了。']); return; } if (!gold(8)) return;
    s.sentoDay = s.day; s.buff = { kind: 'sento', b: { hp: 0.03, regen: 0.2 }, until: s.day }; R.save();
    R.townTalk('錢湯「松之湯」', ['牆上畫著一整面的富士山……不，是皇嶺的山。', '泡完喝一瓶冰牛奶。（下一趟遺跡：生命 +3%、每秒回復 0.2，只有今天）']);
  };
  R.hotelSheet = door => {
    R.sheet('<p class="kicker">站前</p><h2>東鶴旅館</h2><p>「單人房一晚 40 費拉，附早餐。」櫃台後面掛著一排鑰匙。</p>', '<div class="row"><button type="button" class="btn pri" id="ht-sleep">住一晚</button><button type="button" class="btn" id="ht-x">不用了</button></div>');
    document.getElementById('ht-x').onclick = R.closeSheet;
    document.getElementById('ht-sleep').onclick = () => { if (R.S.gold < 40) { R.toast('錢不夠（要 40 費拉）。'); return; } R.S.gold -= 40; R.closeSheet(); R.fade(() => { R.advanceDays(1); const from = R.W.town ? R.W.town.from : null; R.enterTownNow(from, door); R.toast('一覺睡到天亮。'); }); };
  };

  // ---------- 街區裡的空地：補上住在城裡的人會有的東西 ----------
  // 房子都蓋好以後（suburbs.js 的 R.buildSuburbs 最後呼叫），找沒有東西、離路和門口都有一段距離的地方，
  // 放儲物間、曬衣架、腳踏車、盆栽、垃圾集中處、柴堆、停著的車。周圍要留空間，才不會把人卡住。
  R.fillTown = api => {
    const { SB, G3, lam, block, bike, pineAt, tw } = api, C = R.CITY, WX = C.WX, WZ = C.WZ, occ = C._occ;
    seed = 17;
    const busy = (x, z, r) => { const cs = R.col.cells, g0 = Math.floor((x - r) / 12), g1 = Math.floor((x + r) / 12), h0 = Math.floor((z - r) / 12), h1 = Math.floor((z + r) / 12); for (let gx = g0; gx <= g1; gx++) for (let gz = h0; gz <= h1; gz++) { const L = cs.get(gx + ',' + gz); if (L && L.some(c => c.on && x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1)) return true; } return false; };
    const free = (sx, sy) => { const gx = Math.floor(sx / 2), gy = Math.floor(sy / 2); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const v = occ[(gy + dy) * 500 + gx + dx]; if (v) return false; } return true; };
    const doors = tw.inter.filter(i => i.door || i.r >= 2);
    const grey = lam('#9AA0A6', { tex: 'cap' }), snow = lam('#F2F6F8', { tex: 'ground' }), wood = lam('#6A4A2E', { tex: 'planks' });
    const items = [
      (x, z) => { SB.add(G3.box, grey, x, 0.9, z, 1.6, 1.8, 1.0); SB.add(G3.box, lam('#7A8088', { tex: 0 }), x, 1.84, z, 1.7, 0.08, 1.1); SB.add(G3.box, snow, x, 1.9, z, 1.6, 0.05, 1.0); block(x - 0.8, x + 0.8, z - 0.5, z + 0.5, 'deco'); },   // 鐵皮儲物間
      (x, z) => { [-1, 1].forEach(o => SB.add(G3.box, lam('#5A5C62', { tex: 0 }), x + o, 0.9, z, 0.06, 1.8, 0.06)); SB.add(G3.box, lam('#5A5C62', { tex: 0 }), x, 1.75, z, 2.1, 0.04, 0.04); for (let i = 0; i < 4; i++) SB.add(G3.box, lam(pick(['#E8E4D8', '#7A9AC8', '#C87A7A', '#E8D07A', '#8AA87A']), { tex: 0 }), x - 0.75 + i * 0.5, 1.4, z, 0.4, 0.6, 0.03); block(x - 1.05, x + 1.05, z - 0.1, z + 0.1, 'deco'); },   // 曬衣架
      (x, z) => { bike(x, z, rnd() * 3); bike(x + 0.7, z + 0.1, rnd() * 3); },
      (x, z) => { for (let i = 0; i < 4; i++) { const px = x + (i % 2) * 0.6 - 0.3, pz = z + Math.floor(i / 2) * 0.6 - 0.3; SB.add(G3.cyl, lam('#8A5A3A', { tex: 0 }), px, 0.22, pz, 0.42, 0.44, 0.42); SB.add(G3.sph, lam(pick(['#4A6A3A', '#5A7A4A', '#3A5A3A']), { tex: 0 }), px, 0.6, pz, 0.5, 0.42, 0.5); } block(x - 0.6, x + 0.6, z - 0.6, z + 0.6, 'deco'); },   // 盆栽
      (x, z) => { SB.add(G3.box, lam('#3A6A4A', { tex: 0 }), x, 0.45, z, 1.8, 0.9, 1.0); SB.add(G3.box, lam('#2A4A3A', { tex: 0 }), x, 0.92, z, 1.9, 0.06, 1.1); SB.add(G3.box, snow, x, 0.98, z, 1.7, 0.05, 0.9); block(x - 0.9, x + 0.9, z - 0.5, z + 0.5, 'deco'); api.inter(x, z + 1.0, 1.3, '垃圾集中處', () => R.townToast('牌子上寫著：「可燃垃圾：火日、土日。資源回收：光日。」')); },   // 垃圾集中處
      (x, z) => { for (let i = 0; i < 3; i++) SB.add(G3.box, wood, x, 0.2 + i * 0.36, z, 1.6, 0.34, 0.8); SB.add(G3.box, snow, x, 1.1, z, 1.6, 0.06, 0.8); block(x - 0.8, x + 0.8, z - 0.4, z + 0.4, 'deco'); },   // 柴堆
      (x, z) => { SB.add(G3.cyl, lam('#5A6A7A', { tex: 0 }), x, 0.6, z, 1.1, 1.2, 1.1); SB.add(G3.cyl, snow, x, 1.22, z, 1.0, 0.05, 1.0); block(x - 0.55, x + 0.55, z - 0.55, z + 0.55, 'deco'); },   // 水桶
      (x, z) => pineAt(x, z, 0.6 + rnd() * 0.3)
    ];
    let n = 0;
    for (let sy = 262; sy < 940; sy += 9) for (let sx = 236; sx < 996; sx += 9) {
      const jx = sx + (rnd() - 0.5) * 5, jy = sy + (rnd() - 0.5) * 5, x = WX(jx), z = WZ(jy);
      if (rnd() > 0.45 || !free(jx, jy)) continue;
      if (busy(x, z, 2.2) || doors.some(d => Math.hypot(d.x - x, d.z - z) < 4)) continue;
      // 寬一點的地方才停車
      if (!busy(x, z, 3.4) && rnd() < 0.25) { const cb = R.Batch(), ry = rnd() < 0.5 ? 0 : Math.PI / 2, col = pick(['#E8E8EC', '#C83A3A', '#3A5A8A', '#2A2A30', '#D8C890']); cb.at(x, z, ry); const bm = lam(col, { tex: 0 }); cb.add(G3.box, bm, 0, 0.7, 0, 1.5, 0.6, 3.2); cb.add(G3.box, bm, 0, 1.25, -0.2, 1.4, 0.55, 2.0); cb.add(G3.box, lam('#9AB4C8', { em: '#203040', ei: 0.25 }), 0, 1.27, -0.2, 1.42, 0.4, 1.9); cb.add(G3.box, snow, 0, 1.55, -0.2, 1.3, 0.06, 1.8); [[-0.75, -1.05], [0.75, -1.05], [-0.75, 1.05], [0.75, 1.05]].forEach(([a, b]) => cb.add(G3.cyl, lam('#1E1E22', { tex: 0 }), a, 0.3, b, 0.6, 0.2, 0.6, 0, 0, Math.PI / 2)); cb.flush(api.group); const hw = ry ? 1.65 : 0.8, hd = ry ? 0.8 : 1.65; block(x - hw, x + hw, z - hd, z + hd, 'deco'); n++; continue; }
      items[Math.floor(rnd() * items.length)](x, z); n++;
    }
    return n;
  };
})(window.R);
