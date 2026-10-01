// 討伐令 1433：城牆裡的陪都設施
// 東鶴是陪都（設定：陪都 東鶴、吉山、奉主；城市分級 縣›城›司›鄉›戶），城裡要有一座大城市該有的東西：
// 東鶴縣廳、衛兵詰所、大聯合國世界中央銀行的分行（費拉是世界央行發行的）、東鶴醫院、郵局、東鶴日報社、劇場「東鶴座」、德克斯凡百貨。
// 這些地方先保留起來（reserve），town.js 的 denseBlock 就不會在上面蓋一般的房子。
// 座標和 town.js 一樣：示意圖的 1 單位＝0.22 公尺。
(function (R) {
  let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  let flagTex = null;   // 昭旭聯合王國的國旗（作者提供的 flag.webp）

  R.buildCivic = api => {
    const { group, npc, inter, block, talk, lam, SB, HB, G3, B_, glowW, darkW, sign, lampPost, pineAt, bench, vending, bike, reserve, WX, WZ, tw, E } = api;
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

    // ---------- 東鶴縣廳：三層的石造廳舍、前庭、國旗 ----------
    { const b = civ(548, 452, 15, 9, 3, { col: '#B4AEA2', columns: 1, win: 1.7, door: 4.2 });
      HB.at(b.x, b.z, 0); HB.add(G3.box, B_('#B4AEA2', { tex: 'wall' }), 0, b.H + 2.0, -1, 4, 2.6, 4); HB.add(G3.box, dk, 0, b.H + 3.4, -1, 4.4, 0.2, 4.4); HB.add(G3.box, snowM, 0, b.H + 3.52, -1, 4, 0.06, 4); HB.at(null);
      const face = new TH.Mesh(new TH.CircleGeometry(0.8, 20), R.seeThrough(new TH.MeshLambertMaterial({ color: '#F4ECD8', emissive: '#FFE8B0', emissiveIntensity: 0.5 }))); face.position.set(b.x, b.H + 2.2, b.z + 1.02); group.add(face);
      bigSign(b.x, 4.6, b.front + 1.82, 0, '東鶴縣廳', '#2E2A26', '#F4E9CD', 4.2, 0.8);
      [-6, 6].forEach(o => flagpole(b.x + o, b.front + 6, 7, flagTex));
      SB.add(G3.box, lam('#9C968A', { tex: 'cap' }), b.x, 0.05, b.front + 6, 10, 0.1, 10); for (let i = 0; i < 2; i++) pineAt(b.x - 6.5 + i * 13, b.front + 11, 0.9); bench(b.x - 3.5, b.front + 9.5, 0); bench(b.x + 3.5, b.front + 9.5, 0);
      inter(b.door[0], b.door[1], 2.4, '東鶴縣廳的服務台', () => talk('東鶴縣廳', E.martial ? ['「今日退位大典，縣廳只辦緊急事務。」', '大廳的收音機正在轉播皇嶺的典禮。'] : [pick(['「勇者登記請到公會分館；這裡是縣廳。」', '「陪都的事情多：皇嶺的人來來去去，德克斯凡的商會也天天來談事情。」', '「大典那天全城戒嚴，請盡量不要出門。」']), '公告欄：「德克斯凡商會東鶴新商區擴建計畫・說明會」']));
      reserve(509, 406, 587, 510); }
    // ---------- 衛兵詰所：北門旁，衛兵輪班的地方 ----------
    { const b = civ(670, 424, 11, 5.6, 2, { col: '#8E8A80', win: 2.0 });
      bigSign(b.x, 3.6, b.front + 1.62, 0, '衛兵詰所', '#2E3A48', '#F4E9CD', 2.8, 0.6);
      const g = npc(b.x + 2.2, b.front + 1.6, { top: '#3E4A5A', hair: '#2A2420', cloak: '#2E3A48', shield: true }, '詰所的衛兵', 0, 'spear', 'knight'); g.watch = { range: 11, fov: 1.0, guard: 1 }; tw.watchers.push(g); g.guard = true;
      inter(b.door[0], b.door[1], 2.2, '衛兵詰所', () => talk('衛兵詰所', [R.crimeHud && R.crimeHud() ? '「……你最近是不是在哪裡偷了東西？別讓我們抓到。」' : pick(['「城裡的治安歸我們管。遺跡裡的事歸公會。」', '「失物招領在左邊的櫃子。撿到勇者證要送公會，不要拿去賣。」']), '牆上貼著幾張通緝令。']));
      bike(b.x - 4, b.front + 1.2, 0.2); bike(b.x - 3.3, b.front + 1.2, 0.2);
      reserve(636, 406, 704, 444); }
    // ---------- 大聯合國世界中央銀行 東鶴分行：新商區、石柱的門面 ----------
    { const b = civ(925, 688, 9, 6.6, 2, { col: '#C8C2B4', columns: 1, win: 1.6, door: 2.0, fh: 3.6 });
      bigSign(b.x, 4.6, b.front + 1.82, 0, '世界中央銀行・東鶴分行', '#2A2A30', '#E8D8A0', 4.6, 0.6);
      inter(b.door[0], b.door[1], 2.2, '世界中央銀行・東鶴分行', () => talk('世界中央銀行・東鶴分行', ['「費拉的存提、兌換、匯款。」', '「赤金和昭旭的舊銅錢，請到西市兌換所驗過再拿來。」', E.martial ? '今天因為戒嚴，只開半天。' : '櫃台前排了一小排德克斯凡的商人。']));
      reserve(900, 664, 952, 712); }
    // ---------- 東鶴醫院：白色的四層樓 ----------
    { const b = civ(875, 803, 15, 8, 4, { col: '#ECEAE4', trim: '#C8D8D0', win: 1.6, fh: 3.0, doorW: 3 });
      bigSign(b.x, 3.55, b.front + 1.62, 0, '東鶴醫院', '#2E5A4A', '#F4F8F4', 3.4, 0.7);
      HB.add(G3.box, B_('#3A8A5A', { em: '#2A6A3A', ei: 0.6 }), b.x + b.w / 2 - 1, b.H - 0.5, b.front + 0.1, 0.9, 0.9, 0.1);
      { const cb = R.Batch(), x = b.x - 5, z = b.front + 3; cb.at(x, z, Math.PI / 2); const wb = lam('#F0F0EC', { tex: 0 }); cb.add(G3.box, wb, 0, 1.4, 0.5, 2.0, 1.8, 3.4); cb.add(G3.box, wb, 0, 1.2, -1.8, 2.0, 1.4, 1.4); cb.add(G3.box, lam('#C83A3A', { tex: 0 }), 0, 1.2, 0.5, 2.02, 0.2, 3.42); cb.add(G3.box, lam('#9AB4C8', { em: '#203040', ei: 0.25 }), 0, 1.45, -2.52, 1.7, 0.6, 0.04); [[-0.9, -1.6], [0.9, -1.6], [-0.9, 1.4], [0.9, 1.4]].forEach(([a, c]) => cb.add(G3.cyl, lam('#1E1E22', { tex: 0 }), a, 0.38, c, 0.76, 0.26, 0.76, 0, 0, Math.PI / 2)); cb.add(G3.box, lam('#F2F6F8', { tex: 'ground' }), 0, 2.33, 0.5, 1.9, 0.06, 3.3); cb.flush(group); block(x - 2.6, x + 2.6, z - 1.1, z + 1.1, 'deco'); }
      inter(b.door[0], b.door[1], 2.4, '東鶴醫院', () => talk('東鶴醫院', ['「從遺跡抬回來的勇者，請走急診的門。」', pick(['「冬天跌倒骨折的老人家特別多。」', '「這是德克斯凡出錢擴建的新病棟。」', '「魔力枯竭的病人，請先到白藤堂拿藥。」'])]));
      reserve(832, 770, 916, 838); }
    // ---------- 郵局：門口有紅色的郵筒 ----------
    { const b = civ(640, 791, 7, 5.6, 2, { col: '#C8B8A0', win: 1.8, door: 1.4 });
      bigSign(b.x, 3.55, b.front + 1.62, 0, '東鶴郵局', '#8A2A24', '#F4F0E6', 2.6, 0.6);
      const px = b.x + 2.4, pz = b.front + 1.6; SB.add(G3.cyl, lam('#C8323A', { tex: 0 }), px, 0.75, pz, 0.6, 1.5, 0.6); SB.add(G3.cyl, lam('#A82A2A', { tex: 0 }), px, 1.55, pz, 0.68, 0.12, 0.68); SB.add(G3.box, lam('#1A1A1A', { tex: 0 }), px, 1.2, pz + 0.3, 0.3, 0.06, 0.04); block(px - 0.32, px + 0.32, pz - 0.32, pz + 0.32, 'deco');
      inter(b.door[0], b.door[1], 2.2, '東鶴郵局', () => talk('東鶴郵局', ['「信件、包裹，往皇嶺的明天就到。」', '「年底的賀年信，記得早點寄。」']));
      inter(px, pz + 1, 1.4, '紅色的郵筒', () => R.townToast('郵筒上寫著收件時間：上午十時、下午三時。'));
      reserve(616, 770, 662, 812); }
    // ---------- 東鶴日報社：瓦版就是這裡印的 ----------
    { const b = civ(430, 690, 8, 6, 3, { col: '#9A8A7A', tex: 'wall', win: 1.6 });
      bigSign(b.x, 3.55, b.front + 1.62, 0, '東鶴日報社', '#2A2A30', '#F4E9CD', 3.0, 0.6);
      for (let i = 0; i < 3; i++) SB.add(G3.box, lam('#6A4A2E', { tex: 'planks' }), b.x - 3 + i * 0.9, 0.35, b.front + 1.4, 0.8, 0.7, 0.6); block(b.x - 3.5, b.x - 0.9, b.front + 1.1, b.front + 1.7, 'deco');
      inter(b.door[0], b.door[1], 2.2, '東鶴日報社（今天的瓦版）', () => (R.newsSheet ? R.newsSheet() : talk('東鶴日報社', ['印刷機轟隆隆地響。'])));
      reserve(400, 664, 456, 712); }
    // ---------- 劇場「東鶴座」：門口的大招牌、一排旗子 ----------
    { const x = WX(548), z = WZ(803), w = 14, d = 9, B = HB, H = 7.2; B.at(x, z, 0);
      B.add(G3.box, B_('#8A3A2E', { tex: 'planks' }), 0, H / 2, 0, w, H, d); B.add(G3.box, B_('#3A2A1C', { tex: 'planks' }), 0, 1.4, d / 2 + 0.04, 4, 2.8, 0.08);
      B.add(G3.box, B_('#2E2A2A', { tex: 'cap' }), 0, H + 0.2, 0, w + 0.6, 0.4, d + 0.6); B.add(G3.box, snowM, 0, H + 0.45, 0, w, 0.08, d);
      B.add(G3.box, B_('#E8D8B0', { em: '#B8803A', ei: 0.7 }), 0, 3.5, d / 2 + 0.6, w - 1, 1.2, 0.1); B.add(G3.box, B_('#3A2A1C', { tex: 0 }), 0, 2.85, d / 2 + 0.7, w, 0.14, 1.4);
      for (let i = 0; i < 6; i++) { const fx = -w / 2 + 1 + i * (w - 2) / 5; B.add(G3.box, B_('#2A2A30', { tex: 0 }), fx, 1.4, d / 2 + 1.6, 0.06, 2.8, 0.06); B.add(G3.box, B_(['#C83A3A', '#E8C03A', '#F0ECE2'][i % 3], { tex: 0 }), fx + 0.25, 1.7, d / 2 + 1.6, 0.42, 2.0, 0.03); }
      B.at(null); block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'house');
      bigSign(x, 5.4, z + d / 2 + 0.06, 0, '東鶴座', '#1E1414', '#F4D88A', 4.4, 1.2); sign(x, 3.5, z + d / 2 + 0.68, 0, '今夜上演・《雪中的勇者》', '#3A1E14', 5.6);
      inter(x, z + d / 2 + 2.4, 2.4, '劇場「東鶴座」', () => talk('東鶴座', E.martial ? ['「大典那天停演一天。」'] : ['「今晚的戲是《雪中的勇者》：一個勇者在遺跡裡迷路的故事。」', '「票賣完了。站票的話，開演前再來看看。」']));
      reserve(510, 770, 586, 840); }
    // ---------- 德克斯凡百貨：新商區的四層樓、大玻璃櫥窗 ----------
    { const b = civ(877, 563, 18, 8, 4, { col: '#C8C8C4', tex: 'wall', win: 1.4, fh: 3.0, doorW: 3.2 });
      HB.add(G3.box, B_('#9AC8E8', { em: '#3A6A9A', ei: 0.7 }), b.x - 5, 1.5, b.front + 0.05, 5, 2.2, 0.06); HB.add(G3.box, B_('#9AC8E8', { em: '#3A6A9A', ei: 0.7 }), b.x + 5, 1.5, b.front + 0.05, 5, 2.2, 0.06);
      bigSign(b.x, b.H - 1.2, b.front + 0.08, 0, '德克斯凡百貨', '#1E2A3A', '#BFE8FF', 5.6, 1.1);
      HB.add(G3.box, B_('#E8A03A', { em: '#E8A03A', ei: 0.8 }), b.x + b.w / 2 - 0.4, b.H * 0.55, b.front + 0.4, 0.2, b.H * 0.5, 0.7);
      inter(b.door[0], b.door[1], 2.4, '德克斯凡百貨（機油、零件、溫室玫瑰）', () => (R.dexShop ? R.dexShop('parts') : null));
      vending(b.x + 7.5, b.front + 1.2); bike(b.x - 8, b.front + 1.4, 0.1);
      reserve(830, 543, 926, 586); }

    // 城裡的地名
    const D = R.TOWN_DISTRICTS;
    if (D && !D.some(v => v.n === '東鶴縣廳')) D.push({ n: '東鶴縣廳', x: 548, y: 478, r: 40 }, { n: '衛兵詰所', x: 670, y: 432, r: 26 }, { n: '世界中央銀行前', x: 925, y: 712, r: 26 }, { n: '東鶴醫院', x: 875, y: 830, r: 38 }, { n: '郵局前', x: 640, y: 812, r: 22 }, { n: '東鶴日報社', x: 430, y: 712, r: 24 }, { n: '東鶴座', x: 548, y: 838, r: 34 }, { n: '德克斯凡百貨', x: 877, y: 592, r: 40 });
  };

  // ---------- 街區裡的空地：補上住在城裡的人會有的東西 ----------
  // 房子都蓋好以後（suburbs.js 的 R.buildSuburbs 最後呼叫），找沒有東西、離路和門口都有一段距離的地方，
  // 放儲物間、曬衣架、腳踏車、盆栽、垃圾集中處、柴堆、停著的車。周圍要留空間，才不會把人卡住。
  R.fillTown = api => {
    const { SB, G3, lam, block, bike, pineAt, tw } = api, G = R.TOWN_G, S = 0.22, WX = sx => (sx - 500) * S, WZ = sy => (sy - 500) * S;
    seed = 17;
    const busy = (x, z, r) => { const cs = R.col.cells, g0 = Math.floor((x - r) / 12), g1 = Math.floor((x + r) / 12), h0 = Math.floor((z - r) / 12), h1 = Math.floor((z + r) / 12); for (let gx = g0; gx <= g1; gx++) for (let gz = h0; gz <= h1; gz++) { const L = cs.get(gx + ',' + gz); if (L && L.some(c => c.on && x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1)) return true; } return false; };
    const segD = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L)); return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t); };
    const lines = G.streets.concat(G.avenues), onStreet = (sx, sy) => lines.some(p => segD(sx, sy, p[0], p[1]) < 10) || Math.abs(sy - G.canal) < 10;
    const keep = [[556, 610, 644, 690], [542, 690, 588, 752], [680, 550, 772, 574], [618, 696, 636, 714], [396, 548, 494, 576], [668, 618, 800, 640], [728, 680, 812, 748], [430, 438, 482, 510], [580, 400, 620, 430], [580, 850, 620, 880], [390, 460, 420, 500], [390, 630, 420, 670], [930, 630, 960, 670], [500, 560, 600, 680], [840, 420, 954, 516]];
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
    for (let sy = G.town[1] + 12; sy < G.town[3] - 8; sy += 8) for (let sx = G.town[0] + 10; sx < G.town[2] - 8; sx += 8) {
      const jx = sx + (rnd() - 0.5) * 5, jy = sy + (rnd() - 0.5) * 5, x = WX(jx), z = WZ(jy);
      if (rnd() > 0.3 || onStreet(jx, jy) || keep.some(k => jx > k[0] && jx < k[2] && jy > k[1] && jy < k[3])) continue;
      if (busy(x, z, 2.2) || doors.some(d => Math.hypot(d.x - x, d.z - z) < 4)) continue;
      // 寬一點的地方才停車
      if (!busy(x, z, 3.4) && rnd() < 0.25) { const cb = R.Batch(), ry = rnd() < 0.5 ? 0 : Math.PI / 2, col = pick(['#E8E8EC', '#C83A3A', '#3A5A8A', '#2A2A30', '#D8C890']); cb.at(x, z, ry); const bm = lam(col, { tex: 0 }); cb.add(G3.box, bm, 0, 0.7, 0, 1.5, 0.6, 3.2); cb.add(G3.box, bm, 0, 1.25, -0.2, 1.4, 0.55, 2.0); cb.add(G3.box, lam('#9AB4C8', { em: '#203040', ei: 0.25 }), 0, 1.27, -0.2, 1.42, 0.4, 1.9); cb.add(G3.box, snow, 0, 1.55, -0.2, 1.3, 0.06, 1.8); [[-0.75, -1.05], [0.75, -1.05], [-0.75, 1.05], [0.75, 1.05]].forEach(([a, b]) => cb.add(G3.cyl, lam('#1E1E22', { tex: 0 }), a, 0.3, b, 0.6, 0.2, 0.6, 0, 0, Math.PI / 2)); cb.flush(api.group); const hw = ry ? 1.65 : 0.8, hd = ry ? 0.8 : 1.65; block(x - hw, x + hw, z - hd, z + hd, 'deco'); n++; continue; }
      items[Math.floor(rnd() * items.length)](x, z); n++;
    }
    return n;
  };
})(window.R);
