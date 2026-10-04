// 討伐令 1433：建築物的裡面（公會東鶴分館一樓、二樓，老岩的鐵匠鋪）
// 在城裡走到門口按空白鍵就會走進去，裡面有好幾個房間可以走：
//  - 公會一樓：大廳（登記處、委託告示板、收購窗口、等著同行的勇者）＋酒場（老闆和勇者們聊遺跡的傳聞）
//  - 公會二樓：資料室（遺跡生物圖鑑、全國遺跡分布圖）＋館員的辦公室
//  - 鐵匠鋪：店面（學徒顧櫃台）＋工房（爐子、鐵砧旁的老岩、鑑定台、磨刀石）＋後院（炭窯、礦車、水井）
// 朝著鏡頭的外牆會變透明（像娃娃屋）；隔間牆擋在你和鏡頭之間時也會變透明。從大門走出去就回到街上。
(function (R) {
  const T = () => THREE;
  const $ = id => document.getElementById(id);
  const W = R.W;
  const esc = s => R.esc(s);

  // 每一間的大小（寬 w、深 d、牆高 h）、預設的鏡頭遠近
  const PLACES = {
    guild: { name: '公會東鶴分館', sub: '一樓・大廳與酒場', w: 30, d: 18, h: 5.2, zoom: 0.9, wall: '#9C978D', cap: '#6A665E', floor: ['#6E5238', 'planks'], out: '出去（回到西市口）' },
    guild2: { name: '公會東鶴分館', sub: '二樓・資料室', w: 22, d: 14, h: 4.4, zoom: 0.85, wall: '#A8A296', cap: '#6A665E', floor: ['#7A5E40', 'planks'] },
    smith: { name: '老岩的鐵匠鋪', sub: '店面・工房・後院', w: 20, d: 16, h: 4.2, zoom: 0.88, wall: '#6A5446', cap: '#3A2E26', floor: ['#56504A', 'floor'], out: '出去（回到街上）', yard: 8, backDoor: [0.6, 2.8] },
    pharmacy: { name: '白藤堂', sub: '藥鋪', w: 14, d: 10, h: 3.8, zoom: 0.8, wall: '#E6E0D2', cap: '#8A7A6A', floor: ['#7A6048', 'planks'], out: '出去（回到西市街）' },
    store: { name: '倉庫', sub: '土藏', w: 14, d: 10, h: 4.4, zoom: 0.8, wall: '#F0ECE2', cap: '#3A3232', floor: ['#5A564E', 'floor'], out: '出去（回到街上）' },
    station: { name: '驛站', sub: '候車室・售票口', w: 18, d: 12, h: 4.2, zoom: 0.85, wall: '#8A6A4A', cap: '#4A3424', floor: ['#6E5238', 'planks'], out: '出去（回到大路口）' },
    tavern: { name: '赤提燈', sub: '居酒屋・樓上是宿屋', w: 20, d: 14, h: 4.2, zoom: 0.85, wall: '#8E7A62', cap: '#4A3424', floor: ['#6A4A30', 'planks'], out: '出去（回到西市街）' }
  };
  R.INTERIOR_PLACES = PLACES;   // interiors2.js 加更多的建築
  const bodyOf = cls => ({ body: { base: cls === 'knight' ? 'body_heavy' : cls === 'warrior' ? 'body_medium' : 'body_light' }, feet: { base: 'feet_medium' } });
  // 酒場裡聽得到的傳聞（也是打遺跡生物的提示）
  const RUMORS = [
    '摩爾斯級的尾隨犬會一直跟著你，跌倒、翻滾的那一刻整群撲上來。',
    '守墓骨兵正面幾乎打不動。等牠揮完刀、盾放下來的時候再打，或繞到背後。',
    '盤頂蛙頭上的盤子，用重一點的攻擊把它打翻，牠就會呆住，那時候打牠特別痛。',
    '腳下冒出紅圈就快跑——十之八九是鑽口蛇要鑽出來了。鑽在地底的時候根本打不到。',
    '喚群燈一叫，整區的生物都會過來。看到了就先打掉它。',
    '克森特級的入口會自己關起來。進去之前，藥一定要帶夠。',
    '群瞳看著你的時候，佩特拉的注意會一直往上升。別跟它對看太久。',
    '蛛身牛低頭刨地就是要衝了。閃到旁邊讓牠撞牆，撞暈了才是機會。',
    '纏身布衝過來之前，地上會先出現一條紅線。被纏住就動不了。',
    '影撲貓壓低身子的時候看地上的圈，撲完會隱身一下，別追丟了。',
    '根童挨打就跑，你一鬆懈又圍回來吐種子。打不太痛，可是很煩。',
    '房間裡的生物平常只是在晃。你一踏進去，或從外面打到牠們，整間都會醒過來。'
  ];

  // ---------- 材質：顏色照寫的色碼顯示；像素風加上點陣花紋 ----------
  let mats = {};
  const lam = (c, o) => {
    o = o || {}; const pix = R.pixelOn(), k = c + '|' + JSON.stringify(o) + (pix ? 'p' : '');
    if (mats[k]) return mats[k];
    const m = new (T().MeshLambertMaterial)({ color: c });
    m.color.convertSRGBToLinear();
    if (o.em) { m.emissive.set(o.em); m.emissive.convertSRGBToLinear(); m.emissiveIntensity = o.ei == null ? 1 : o.ei; }
    if (o.side) m.side = T().DoubleSide;
    if (pix && !o.em && o.tex !== 0) { m.map = R.pixTex(o.tex || 'plaster'); R.worldUV(m, m.map.image.width); }
    return (mats[k] = m);
  };
  const signTex = (txt, bg) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = bg || '#3A2A1C'; g.fillRect(0, 0, 256, 64); g.strokeStyle = '#C9A13A'; g.lineWidth = 4; g.strokeRect(4, 4, 248, 56);
    g.fillStyle = '#F4E9CD'; g.font = 'bold 34px "Noto Serif TC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 34);
    const t = new (T().CanvasTexture)(c); t.encoding = T().sRGBEncoding; return t;
  };
  // 二樓大桌上的昭旭地圖（三座島、紅點是遺跡）
  const mapTex = () => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d');
    g.fillStyle = '#E8DCC0'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#9AB8C8'; g.fillRect(8, 8, 240, 144);
    const isl = (cx, cy, rx, ry, a) => { g.fillStyle = '#C8C09A'; g.beginPath(); g.ellipse(cx, cy, rx, ry, a, 0, 7); g.fill(); g.strokeStyle = '#7A6A4A'; g.lineWidth = 2; g.stroke(); };
    isl(92, 46, 44, 22, -0.3); isl(128, 86, 70, 26, -0.2); isl(176, 126, 34, 16, 0.2);
    g.fillStyle = '#C8323A'; [[80, 40], [104, 52], [116, 84], [150, 80], [96, 92], [180, 124], [214, 70]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); });
    g.fillStyle = '#3E7A48'; g.fillRect(132, 82, 8, 8);
    const t = new (T().CanvasTexture)(c); t.encoding = T().sRGBEncoding; return t;
  };
  const talk = (who, lines) => { R.sheet('<p class="kicker">' + esc(who) + '</p>' + lines.map(l => '<p>' + esc(l) + '</p>').join(''), '<div class="row"><button type="button" class="btn pri" id="in-tk-x">好</button></div>'); $('in-tk-x').onclick = R.closeSheet; };
  const rumor = (who, extra) => { const a = RUMORS[Math.floor(Math.random() * RUMORS.length)]; let b = RUMORS[Math.floor(Math.random() * RUMORS.length)]; if (b === a) b = RUMORS[(RUMORS.indexOf(a) + 3) % RUMORS.length]; talk(who, (extra || []).concat(['「' + a + '」', '「' + b + '」'])); };

  // ---------- 蓋出一間屋子：地板、牆（外牆和隔間牆）、門 ----------
  const build = kind => {
    const TH = T(), pl = PLACES[kind], HW = pl.w / 2, HD = pl.d / 2, WH = pl.h, T0 = 0.6;
    mats = {};
    R.col = { list: [], cells: new Map() };
    const scene = R.markScene(new TH.Scene()), group = new TH.Group(); scene.add(group);
    scene.background = new TH.Color('#0E0B09').convertSRGBToLinear();
    const ins = { kind, pl, scene, group, inter: [], walls: [], npcs: [], lights: [], flames: [], fx: [], geos: [], spin: [], rects: [], smoke: [], watchers: [], steals: [], t: 0, puff: 0 };
    const bx = (w, h, d, m, x, y, z, par) => { const geo = new TH.BoxGeometry(w, h, d); ins.geos.push(geo); const o = new TH.Mesh(geo, typeof m === 'string' ? lam(m) : m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; (par || group).add(o); return o; };
    const flat = (w, d, m, x, y, z, par) => { const o = bx(w, 0.03, d, m, x, y, z, par); o.castShadow = false; return o; };
    const mesh = (geo, m, x, y, z, par) => { ins.geos.push(geo); const o = new TH.Mesh(geo, typeof m === 'string' ? lam(m) : m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; (par || group).add(o); return o; };
    const block = (x0, x1, z0, z1, tag) => R.addBox(x0, x1, z0, z1, tag || 'in');
    const inter = (x, z, r, label, act) => { const it = { x, z, r, label, act }; ins.inter.push(it); return it; };
    const lamp = (x, y, z, col, I, dist, flicker) => { const l = new TH.PointLight(new TH.Color(col).convertSRGBToLinear(), I, dist || 12, 1.6); l.position.set(x, y, z); scene.add(l); ins.lights.push({ l, I, x, flicker }); return l; };
    const sign = (x, y, z, rotY, txt, bg, par) => { const geo = new TH.PlaneGeometry(2.2, 0.55); ins.geos.push(geo); const m = new TH.Mesh(geo, new TH.MeshBasicMaterial({ map: signTex(txt, bg) })); m.position.set(x, y, z); m.rotation.y = rotY || 0; (par || group).add(m); return m; };
    const flame = (x, y, z, s, par) => { const f = mesh(new TH.ConeGeometry(0.2 * s, 0.7 * s, 5), lam('#FF9A3A', { em: '#FF6A1A', ei: 1 }), x, y, z, par); f.castShadow = false; ins.flames.push(f); return f; };
    // 站著的人：靠近的時候會轉過來看你
    const npc = (x, z, rot, o) => {
      const h = R.makeHero(o.cls || 'warrior', o.weapon || 'sword');
      if (o.eq) R.dressHero(h, o.eq);
      if (o.look) {
        if (h.isSprite) R.spriteLook(h, Object.assign({ weapon: o.weapon || null, shield: false }, o.look));
        else { if (!o.weapon) h.hand.clear(); if (o.look.top) h.dress.topM.color.set(o.look.top); if (o.look.hair) h.dress.hair.forEach(m => { m.material = lam(o.look.hair, { tex: 0 }); }); }
      }
      h.g.position.set(x, 0, z); h.g.rotation.y = rot; group.add(h.g);
      const n = { h, x, z, rot, rot0: rot, name: o.name, box: block(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 'npc') };
      ins.npcs.push(n); return n;
    };

    // 光：屋裡暖暖的，上面一盞主燈（有影子）
    scene.add(new TH.HemisphereLight(new TH.Color('#FFE6C8').convertSRGBToLinear(), new TH.Color('#2A2018').convertSRGBToLinear(), kind === 'smith' ? 0.5 : 0.66));
    const key = new TH.DirectionalLight(new TH.Color('#FFE2BC').convertSRGBToLinear(), kind === 'smith' ? 0.4 : 0.5);
    key.position.set(-3, 18, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    const ext = Math.max(HW, HD + (pl.yard || 0)) + 3, sc = key.shadow.camera; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 46; key.shadow.bias = -0.0015;
    key.target.position.set(0, 0, -(pl.yard || 0) / 2); scene.add(key); scene.add(key.target); ins.key = key;

    // 地板
    const floor = bx(pl.w, 0.2, pl.d, lam(pl.floor[0], { tex: pl.floor[1] }), 0, -0.1, 0); floor.castShadow = false; ins.rects.push([-HW, -HD, HW, HD, 'rgba(176,150,118,.85)']);
    if (!R.pixelOn() && pl.floor[1] === 'planks') for (let z = -HD + 0.8; z < HD; z += 0.8) flat(pl.w, 0.04, '#5A4230', 0, 0.005, z);
    if (!R.pixelOn() && pl.floor[1] === 'floor') for (let i = -HW + 2; i < HW; i += 2) flat(0.04, pl.d, '#46403A', i, 0.005, 0);
    // 門外：石階和一小段被踩過的雪路
    if (pl.out) { bx(3.2, 0.16, 0.9, '#6A665E', 0, 0.02, HD + T0 + 0.45).castShadow = false; const snow = bx(3.2, 0.1, 2.6, lam('#8E9AA6', { tex: 'ground' }), 0, -0.05, HD + T0 + 2.2); snow.castShadow = false; lamp(0, 2.6, HD + 2.2, '#9FB4CC', 0.35, 5); block(-4.5, 4.5, HD + T0 + 1.1, HD + T0 + 3); }

    // 牆：外牆朝著鏡頭時變透明；隔間牆（inner）擋在你和鏡頭之間時變透明
    const wallM = lam(pl.wall, { tex: 'wall' }), capM = lam(pl.cap, { tex: 'cap' });
    const WG = o => { const g = new TH.Group(); group.add(g); const w = Object.assign({ g, op: 1, top: WH }, o); ins.walls.push(w); return w; };
    const seg = (w, x, z, sw, sd, y0, h, m) => { bx(sw, h, sd, m || wallM, x, y0 + h / 2, z, w.g); if (y0 + h >= w.top - 0.01) bx(sw + 0.06, 0.16, sd + 0.06, capM, x, y0 + h + 0.08, z, w.g); if (y0 < 0.5) block(x - sw / 2, x + sw / 2, z - sd / 2, z + sd / 2, 'wall'); };
    // 一整面牆（沿 x 或沿 z），gaps 是門的位置（沿牆的座標）
    const wallLine = (w, alongX, fixed, from, to, h, gaps, m) => {
      let a = from;
      (gaps || []).slice().sort((p, q) => p[0] - q[0]).concat([[to, to]]).forEach(([g0, g1]) => {
        if (g0 - a > 0.05) { const len = g0 - a, c = (a + g0) / 2; if (alongX) seg(w, c, fixed, len, T0, 0, h, m); else seg(w, fixed, c, T0, len, 0, h, m); }
        if (g1 > g0) {
          const len = g1 - g0, c = (g0 + g1) / 2, dh = Math.min(3, h);
          if (h > 3.1) { if (alongX) seg(w, c, fixed, len, T0, 3.0, h - 3.0, m); else seg(w, fixed, c, T0, len, 3.0, h - 3.0, m); }
          [g0, g1].forEach(p => (alongX ? bx(0.22, dh, T0 + 0.1, '#3A2A1C', p, dh / 2, fixed, w.g) : bx(T0 + 0.1, dh, 0.22, '#3A2A1C', fixed, dh / 2, p, w.g)));
          if (h > 3.1) (alongX ? bx(len + 0.5, 0.26, T0 + 0.1, '#3A2A1C', c, 3.05, fixed, w.g) : bx(T0 + 0.1, 0.26, len + 0.5, '#3A2A1C', fixed, 3.05, c, w.g));
        }
        a = g1;
      });
    };
    const NW = WG(pl.yard ? { inner: true, nx: 0, nz: 1, cx: 0, cz: -HD, half: HW + 1 } : { nx: 0, nz: -1 }), SW = WG({ nx: 0, nz: 1 }), WW = WG({ nx: -1, nz: 0 }), EW = WG({ nx: 1, nz: 0 });
    wallLine(NW, true, -HD - T0 / 2, -HW - T0, HW + T0, WH, pl.backDoor ? [pl.backDoor] : null);
    wallLine(SW, true, HD + T0 / 2, -HW - T0, HW + T0, WH, pl.out ? [[-1.2, 1.2]] : null);
    wallLine(WW, false, -HW - T0 / 2, -HD, HD, WH); wallLine(EW, false, HW + T0 / 2, -HD, HD, WH);
    // 隔間牆
    const part = (alongX, fixed, from, to, gaps) => { const w = WG({ inner: true, nx: alongX ? 0 : 1, nz: alongX ? 1 : 0, cx: alongX ? (from + to) / 2 : fixed, cz: alongX ? fixed : (from + to) / 2, half: (to - from) / 2 }); wallLine(w, alongX, fixed, from, to, WH, gaps); return w; };
    // 牆根的踢腳板
    bx(pl.w, 0.3, 0.06, '#3A2A1C', 0, 0.15, -HD + 0.03, NW.g); bx(0.06, 0.3, pl.d, '#3A2A1C', -HW + 0.03, 0.15, 0, WW.g); bx(0.06, 0.3, pl.d, '#3A2A1C', HW - 0.03, 0.15, 0, EW.g);
    if (pl.out) inter(0, HD - 0.9, 1.8, pl.out, () => R.exitInterior());

    const c = { TH, ins, bx, flat, mesh, block, inter, lamp, sign, npc, flame, part, wallLine, WG, seg, HW, HD, WH, T0, NW, SW, WW, EW };
    Object.assign({ guild: furnishGuild, guild2: furnishGuild2, smith: furnishSmith, pharmacy: furnishPharmacy, store: furnishStore, station: furnishStation, tavern: furnishTavern }, R.INTERIOR_FURNISH || {})[kind](c);
    // 劇情人物、固定日期出現的人（people.js）
    if (R.placePeople) R.placePeople(kind, { ins, npc, inter, talk, HW, HD });
    return ins;
  };

  // 共用的家具
  const tableAt = (c, x, z, w, d) => { const { bx, block } = c; w = w || 2.4; d = d || 1.3; bx(w, 0.12, d, '#6A4A30', x, 0.86, z); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(0.12, 0.8, 0.12, '#4A3424', x + a * (w / 2 - 0.2), 0.4, z + b * (d / 2 - 0.15))); block(x - w / 2 - 0.05, x + w / 2 + 0.05, z - d / 2 - 0.05, z + d / 2 + 0.05, 'table'); };
  const benchAt = (c, x, z, w, alongX) => { const { bx, block } = c; bx(alongX ? w : 0.4, 0.1, alongX ? 0.4 : w, '#5A3E28', x, 0.48, z); [-1, 1].forEach(s => bx(0.1, 0.44, 0.1, '#4A3424', x + (alongX ? s * (w / 2 - 0.2) : 0), 0.22, z + (alongX ? 0 : s * (w / 2 - 0.2)))); block(x - (alongX ? w / 2 : 0.25), x + (alongX ? w / 2 : 0.25), z - (alongX ? 0.25 : w / 2), z + (alongX ? 0.25 : w / 2), 'bench'); };
  const stoolAt = (c, x, z) => { const { mesh, TH, block } = c; mesh(new TH.CylinderGeometry(0.24, 0.2, 0.55, 8), '#5A3E28', x, 0.28, z); block(x - 0.22, x + 0.22, z - 0.22, z + 0.22, 'stool'); };
  const plantAt = (c, x, z) => { const { bx, mesh, TH, block } = c; bx(0.7, 0.6, 0.7, '#8A5A3A', x, 0.3, z); mesh(new TH.SphereGeometry(0.6, 8, 6), lam('#3E6A3A', { tex: 0 }), x, 1.1, z); block(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 'pot'); };
  const shelfAt = (c, cx, z, w, par, colors) => {   // 靠北牆的書架／檔案櫃（開放式的）
    const { bx, block } = c, HD0 = -z; const binders = colors || ['#8A3A2E', '#2E5A7A', '#C9A13A', '#3E7A48', '#6A4A8A', '#D8CBAE'];
    bx(w, 3.4, 0.12, '#3A2818', cx, 1.7, z + 0.06, par); [-1, 1].forEach(s => bx(0.12, 3.4, 0.72, '#4A3424', cx + s * (w / 2 - 0.06), 1.7, z + 0.36, par)); bx(w, 0.12, 0.72, '#4A3424', cx, 3.4, z + 0.36, par);
    const n = Math.floor((w - 0.4) / 0.335);
    [0.1, 0.95, 1.8, 2.65].forEach((y, r) => { bx(w - 0.2, 0.06, 0.66, '#4A3424', cx, y, z + 0.38, par); if (r < 3) for (let i = 0; i < n; i++) bx(0.24, 0.6 - (i * 5 % 3) * 0.06, 0.48, lam(binders[(i * 7 + r * 3 + Math.round(cx)) % binders.length], { tex: 0 }), cx - (n - 1) * 0.335 / 2 + i * 0.335, y + 0.33 - (i * 5 % 3) * 0.03, z + 0.4, par); });
    block(cx - w / 2, cx + w / 2, z, z + 0.75, 'shelf'); return HD0;
  };

  // ---------- 公會東鶴分館・一樓：大廳＋酒場 ----------
  const furnishGuild = c => {
    const { TH, ins, bx, flat, mesh, block, inter, lamp, sign, npc, flame, part, HW, HD, NW, WW, EW, SW } = c;
    // 大廳和酒場中間的隔間牆（中間有門）
    part(false, 6, -HD, HD, [[-1.4, 1.4]]);
    sign(6 - 0.32, 3.55, 0, -Math.PI / 2, '酒場', '#5A2A24');
    // 綠色的長地毯：從門口一路鋪到登記處
    flat(2.8, 12.2, lam('#2E5A3A', { tex: 0 }), 0, 0.015, 2.1); [-1.46, 1.46].forEach(x => flat(0.12, 12.2, lam('#C9A13A', { tex: 0 }), x, 0.02, 2.1));
    // 登記處的櫃台、館員
    bx(9, 1.05, 0.9, '#5A3E28', 0, 0.525, -5.6); bx(9.3, 0.12, 1.15, '#7A5A3A', 0, 1.11, -5.6); bx(8.4, 0.62, 0.04, '#4A3220', 0, 0.52, -5.13);
    bx(0.5, 0.05, 0.36, '#F4E9CD', -2.2, 1.2, -5.6); bx(0.46, 0.05, 0.34, '#EDE0C8', -2.14, 1.25, -5.64); bx(0.7, 0.1, 0.5, '#3A2A1C', 2.6, 1.22, -5.7); bx(0.12, 0.14, 0.12, '#1A1410', 3.2, 1.24, -5.5);
    mesh(new TH.SphereGeometry(0.15, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam('#C9A13A', { tex: 0 }), 1.3, 1.17, -5.45);
    block(-4.65, 4.65, -6.1, -5.05, 'desk'); sign(0, 0.62, -5.1, 0, '登記處', '#2E4A34');
    npc(0, -7.1, 0, { name: '白川', look: { top: '#2E4A34', hair: '#2A2220', cloak: '#2E4A34', hs: 'bun', acc: 'glasses' } });
    npc(-3, -7.3, 0.3, { name: '館員', look: { top: '#2E4A34', hair: '#6A4A2E', cloak: '#2E4A34' } });
    inter(0, -4.3, 2.3, '登記處：職業登記・轉職・隊伍名冊', () => R.openHub('guild', 'desk'));
    // 後牆：委託告示板、公會的綠旗、檔案櫃
    { const cx = -8.5;
      bx(4.4, 2.8, 0.14, '#4A3424', cx, 2.3, -HD + 0.08, NW.g); bx(4.1, 2.5, 0.1, '#A07A50', cx, 2.3, -HD + 0.14, NW.g);
      R.syncStatus(); const open = R.SITES.filter(s => s.kind === 'ruin' && s.status === 'open');
      open.forEach((s, i) => { const col = R.GRADE_COLOR[s.grade] || '#C9A13A', x = cx - 1.6 + (i % 5) * 0.8, y = 3.05 - Math.floor(i / 5) * 0.95 - ((i * 37) % 5) * 0.03; bx(0.56, 0.66, 0.03, lam('#F4E9CD', { tex: 0 }), x, y, -HD + 0.2, NW.g); bx(0.56, 0.1, 0.035, lam(col, { tex: 0 }), x, y + 0.29, -HD + 0.21, NW.g); bx(0.06, 0.06, 0.04, '#B8322A', x, y + 0.27, -HD + 0.23, NW.g); });
      sign(cx, 3.95, -HD + 0.16, 0, '遺跡委託', '#3A2A1C', NW.g);
      block(cx - 2.25, cx + 2.25, -HD, -HD + 0.4, 'board');
      inter(cx, -7.2, 2.2, '委託告示板：遺跡委託', () => R.openHub('guild', 'quests')); }
    bx(2.2, 2.8, 0.06, lam('#3E7A48', { tex: 0 }), 0, 3.35, -HD + 0.05, NW.g); bx(2.2, 0.1, 0.07, lam('#C9A13A', { tex: 0 }), 0, 1.98, -HD + 0.06, NW.g); bx(2.6, 0.1, 0.1, '#5A4A3A', 0, 4.8, -HD + 0.1, NW.g);
    { const geo = new TH.PlaneGeometry(1.7, 2.4); ins.geos.push(geo); const em = new TH.Mesh(geo, new TH.MeshLambertMaterial({ map: R.emblemTex(20, 28), transparent: true, alphaTest: 0.4 })); em.position.set(0, 3.45, -HD + 0.1); NW.g.add(em); }
    shelfAt(c, 3.8, -HD, 3.6, NW.g);
    [-2.4, 2.4].forEach(x => bx(0.3, 0.4, 0.2, lam('#FFD08A', { em: '#FFB050', ei: 0.9 }), x, 3.4, -HD + 0.12, NW.g));
    // 往二樓的樓梯（西北角）
    for (let i = 0; i < 8; i++) { const h = 0.55 * (i + 1); bx(2.2, h, 0.55, '#6A4A30', -HW + 1.2, h / 2, -4.6 - 0.55 * i); }
    [-4.6, -6.4, -8.2].forEach(z => bx(0.1, 1, 0.1, '#4A3424', -HW + 2.4, 0.5 + (-4.6 - z) * 1.0, z));
    block(-HW, -HW + 2.45, -HD, -4.3, 'stairs');
    inter(-HW + 1.2, -3.6, 1.8, '上二樓（資料室：遺跡生物圖鑑、全國地圖）', () => R.changeFloor('guild2', { x: -7.4, z: -3.4, yaw: 0 }));
    // 西牆：窗、長椅、昭旭的地圖
    const win = (x, y, z, rotY, par) => { const g = new TH.Group(); g.position.set(x, y, z); g.rotation.y = rotY; par.add(g); bx(1.3, 1.8, 0.06, lam('#CFE0F0', { em: '#9FBEDC', ei: 0.7 }), 0, 0, 0, g); bx(0.08, 1.8, 0.1, '#3A2E26', 0, 0, 0.02, g); bx(1.3, 0.08, 0.1, '#3A2E26', 0, 0, 0.02, g); bx(1.5, 0.1, 0.26, '#7A746A', 0, -0.95, 0.1, g); };
    win(-HW + 0.04, 2.9, 4.5, Math.PI / 2, WW.g); win(-4.8, 2.9, -HD + 0.04, 0, NW.g);
    benchAt(c, -HW + 0.5, 4.5, 2.6, false);
    bx(0.06, 1.6, 2.2, lam('#E8DCC0', { tex: 0 }), -HW + 0.05, 2.6, -0.5, WW.g); [[0.5, 3.0, -1.2, 0.5], [0.4, 2.5, -0.6, 0.7], [0.3, 2.0, 0, 0.4]].forEach(([w, y, z, d]) => bx(0.07, w, d, lam('#8AA07A', { tex: 0 }), -HW + 0.06, y, z, WW.g));
    // 等著同行的勇者：兩張長桌
    tableAt(c, -9.5, 1.2); tableAt(c, -9.5, 5.6);
    benchAt(c, -9.5, 0.05, 2.4, true); benchAt(c, -9.5, 2.35, 2.4, true); benchAt(c, -9.5, 4.45, 2.4, true); benchAt(c, -9.5, 6.75, 2.4, true);
    const spots = [[-11.4, 1.2, -9.5, 1.2], [-7.6, 1.6, -9.5, 1.2], [-11.4, 5.6, -9.5, 5.6], [-7.6, 6.0, -9.5, 5.6]];
    R.ensureRoster();
    R.S.roster.slice(0, spots.length).forEach((m, i) => {
      const [x, z, tx, tz] = spots[i], n = npc(x, z, Math.atan2(tx - x, tz - z), { cls: m.cls, weapon: R.STARTER[m.cls], eq: bodyOf(m.cls), name: m.name });
      n.recruit = m;
      n.it = inter(x + (x < tx ? -0.2 : 0.2), z + 0.6, 1.9, '和' + m.name + '說話（' + R.CLASSES[m.cls].name + ' Lv ' + m.lv + '）', () => recruitSheet(m, n));
    });
    // 收購窗口（隔間牆旁邊）
    bx(0.9, 1.05, 3.6, '#5A3E28', 4.2, 0.525, 5.2); bx(1.15, 0.12, 3.8, '#7A5A3A', 4.18, 1.11, 5.2);
    bx(0.5, 0.06, 0.3, '#B8923A', 4.2, 1.2, 4.4); bx(0.06, 0.5, 0.06, '#B8923A', 4.2, 1.45, 4.4); bx(0.06, 0.04, 0.8, '#B8923A', 4.2, 1.7, 4.4);
    [-0.4, 0.4].forEach(dz => mesh(new TH.CylinderGeometry(0.16, 0.12, 0.05, 10), lam('#C9A13A', { tex: 0 }), 4.2, 1.52, 4.4 + dz));
    [[5.4, 0.45, 7.6], [5.4, 0.4, 3.0]].forEach(([x, y, z]) => bx(0.6, y * 2, 0.8, '#6A4A30', x, y, z));
    [[5.4, 0.98, 7.5], [5.5, 0.9, 3.1]].forEach(([x, y, z], i) => { const o = mesh(new TH.OctahedronGeometry(0.2, 0), lam(i ? '#9A7AFF' : '#7FE0FF', { em: i ? '#5A3ACF' : '#3A9ACF', ei: 0.7 }), x, y, z); o.scale.y = 1.5; });
    sign(3.73, 0.62, 5.2, -Math.PI / 2, '素材收購', '#3A2A1C');
    block(3.7, 6, 3.3, 8, 'desk');
    npc(5.2, 5.4, -Math.PI / 2, { name: '收購窗口的館員', look: { top: '#2E4A34', hair: '#8A5A3A', cloak: '#2E4A34' } });
    inter(2.8, 5.2, 2.2, '收購窗口：賣掉遺跡帶回來的素材', () => R.openHub('guild', 'sell'));
    plantAt(c, -HW + 0.7, HD - 0.8); plantAt(c, 5.2, HD - 0.8);
    lamp(0, 3.6, -6.2, '#FFD6A0', 0.9, 14); lamp(-8, 3.6, 3.4, '#FFD6A0', 0.7, 14); lamp(0, 3.6, 4, '#FFD6A0', 0.5, 12);

    // ---- 酒場 ----
    // 吧台、酒架、高腳椅
    bx(6.4, 1.1, 0.9, '#5A3A24', 11, 0.55, -6.2); bx(6.7, 0.12, 1.15, '#7A5A3A', 11, 1.14, -6.2); block(7.75, 14.25, -6.7, -5.7, 'bar');
    bx(6.4, 3, 0.4, '#3A2818', 11, 1.9, -HD + 0.22, NW.g); [1.0, 1.9, 2.8].forEach(y => bx(6.2, 0.06, 0.5, '#4A3424', 11, y, -HD + 0.42, NW.g));
    for (let s = 0; s < 3; s++) for (let i = 0; i < 14; i++) { const col = ['#3E6A3A', '#8A3A2E', '#C9A13A', '#2E4A6A', '#E8E0D0'][(i + s * 2) % 5], h = 0.3 + (i % 3) * 0.08; mesh(new TH.CylinderGeometry(0.06, 0.08, h, 6), lam(col, { tex: 0 }), 8.3 + i * 0.42, 1.03 + s * 0.9 + h / 2, -HD + 0.42, NW.g); }
    bx(0.5, 0.8, 0.5, '#6A4A2E', 13.6, 1.6, -6.2); mesh(new TH.CylinderGeometry(0.3, 0.3, 0.7, 10), '#6A4A2E', 8.5, 1.55, -6.2).rotation.z = Math.PI / 2;
    [8.8, 10.2, 11.6, 13].forEach(x => stoolAt(c, x, -5.1));
    npc(11, -7.4, 0, { name: '酒場的老闆', look: { top: '#8A6A4A', hair: '#5A4A3A', cloak: '#6A4A2E' } });
    inter(11, -4.3, 2.2, '和酒場的老闆聊聊（遺跡的傳聞）', () => rumor('酒場的老闆', ['「熱湯一碗，暖了身子再下去。」', '「調查點的人剛來喝過湯，說城西的魔力濃度又升了。你要去的話，先去問問他們。」']));
    // 圓桌、在聊天的勇者們
    const roundAt = (x, z) => { mesh(new TH.CylinderGeometry(0.75, 0.75, 0.1, 14), '#6A4A30', x, 0.86, z); mesh(new TH.CylinderGeometry(0.12, 0.18, 0.8, 8), '#4A3424', x, 0.4, z); block(x - 0.75, x + 0.75, z - 0.75, z + 0.75, 'table'); bx(0.18, 0.22, 0.18, '#C8B89A', x - 0.2, 1.03, z + 0.1); bx(0.18, 0.22, 0.18, '#8A6A4A', x + 0.3, 1.03, z - 0.2); };
    roundAt(10, 0.5); roundAt(12.8, 4.5); roundAt(9.2, 5.8);
    const people = [[11.2, 0.0, 'archer', '#3E6A3A'], [8.9, 1.3, 'gunner', '#5A4A3A'], [12.6, 3.3, 'mage', '#4A3A6A'], [10.1, 6.6, 'knight', '#6A6A74']];
    people.forEach(([x, z, cls, top], i) => { const n = npc(x, z, Math.atan2((i < 2 ? 10 : i === 2 ? 12.8 : 9.2) - x, (i < 2 ? 0.5 : i === 2 ? 4.5 : 5.8) - z), { cls, weapon: R.STARTER[cls], eq: bodyOf(cls), name: '在酒場的勇者' });
      inter(x, z + 0.8, 1.6, '和在酒場的勇者聊聊', () => rumor('在酒場的勇者', i === 3 ? ['「我今天有約了。你要找同行的，到大廳問問，剛才那邊還有人。」'] : null)); });
    // 酒場的暖爐（東牆）
    const stone = lam('#7A746A', { tex: 'wall' });
    bx(0.7, 2.6, 3.0, stone, HW - 0.35, 1.3, -2, EW.g); bx(0.05, 1.4, 2.0, lam('#140C08', { tex: 0 }), HW - 0.72, 0.7, -2, EW.g);
    [-3.25, -0.75].forEach(z => bx(0.6, 2.6, 0.5, stone, HW - 1.0, 1.3, z, EW.g)); bx(0.6, 1.2, 3.0, stone, HW - 1.0, 2.0, -2, EW.g); bx(1.2, 0.16, 3.4, '#5A3E28', HW - 0.9, 2.68, -2, EW.g);
    bx(0.24, 0.2, 1.4, '#3A2418', HW - 1.0, 0.1, -2); [-2.4, -2, -1.6].forEach((z, i) => flame(HW - 1.0, 0.5, z, 1 + (i % 2) * 0.25));
    lamp(HW - 2, 1.2, -2, '#FF9A4A', 1.2, 11, true); block(HW - 1.35, HW, -3.55, -0.45, 'fire');
    win(10.5, 2.9, HD - 0.04, Math.PI, SW.g); win(13.5, 2.9, HD - 0.04, Math.PI, SW.g);
    lamp(11, 3.4, 0, '#FFC890', 0.7, 13);
  };

  // ---------- 公會東鶴分館・二樓：資料室＋館員的辦公室 ----------
  const furnishGuild2 = c => {
    const { TH, ins, bx, flat, mesh, block, inter, lamp, sign, npc, part, HW, HD, NW, WW, SW, EW } = c;
    part(false, 0, -HD, HD, [[1.2, 3.6]]);
    sign(-0.32, 3.4, 2.4, -Math.PI / 2, '館員辦公室', '#2E4A34'); sign(0.32, 3.4, 2.4, Math.PI / 2, '資料室', '#3A2A1C');
    // 下樓的樓梯口（西北角）：地上一個開口、欄杆
    flat(2.2, 3.8, lam('#1A1410', { tex: 0 }), -HW + 1.4, 0.02, -HD + 2.4);
    bx(0.1, 1, 3.8, '#4A3424', -HW + 2.55, 0.5, -HD + 2.4); bx(2.2, 1, 0.1, '#4A3424', -HW + 1.4, 0.5, -HD + 4.35);
    block(-HW, -HW + 2.6, -HD, -HD + 4.4, 'stairs');
    inter(-HW + 3.6, -HD + 4.6, 1.8, '下樓（回到大廳）', () => R.changeFloor('guild', { x: -13.8, z: -3.4, yaw: 0 }));
    // 資料室：書架、地圖大桌、圖鑑台
    shelfAt(c, -6, -HD, 5.2, NW.g, ['#5A4A2E', '#7A3A2E', '#2E4A5A', '#3E5A3A', '#6A5A3A']);
    shelfAt(c, -1.9, -HD, 2.6, NW.g, ['#5A4A2E', '#7A3A2E', '#2E4A5A']);
    // 地圖大桌
    bx(4.4, 0.14, 2.6, '#5A3E28', -5.5, 0.9, 1.6); [[-2, -1.1], [2, -1.1], [-2, 1.1], [2, 1.1]].forEach(([a, b]) => bx(0.16, 0.84, 0.16, '#3A2818', -5.5 + a, 0.42, 1.6 + b));
    { const geo = new TH.PlaneGeometry(4.0, 2.3); ins.geos.push(geo); const m = new TH.Mesh(geo, new TH.MeshLambertMaterial({ map: mapTex() })); m.rotation.x = -Math.PI / 2; m.position.set(-5.5, 0.98, 1.6); m.receiveShadow = true; ins.group.add(m); }
    [[-6.5, 1], [-4.6, 2.1]].forEach(([x, z]) => mesh(new TH.CylinderGeometry(0.05, 0.05, 0.3, 6), '#C8323A', x, 1.12, z));
    block(-7.75, -3.25, 0.25, 2.95, 'table');
    inter(-5.5, 3.6, 2.2, '昭旭全國的遺跡分布圖（地圖大桌）', () => R.openMapPaused('nation'));
    // 圖鑑台（書架前的講台）
    bx(0.9, 1.1, 0.7, '#4A3424', -2.6, 0.55, -3.2); const book = bx(0.8, 0.08, 0.56, '#8A3A2E', -2.6, 1.16, -3.2); book.rotation.x = -0.35; bx(0.7, 0.03, 0.5, lam('#F4E9CD', { tex: 0 }), -2.6, 1.2, -3.18).rotation.x = -0.35;
    block(-3.05, -2.15, -3.55, -2.85, 'desk');
    inter(-2.6, -2.1, 2.0, '遺跡生物圖鑑（翻開公會的圖鑑）', () => R.openBest());
    bx(1.6, 0.9, 0.6, '#5A3E28', -8.2, 0.45, 4.4); bx(0.3, 0.3, 0.3, lam('#FFE08A', { em: '#FFC050', ei: 1 }), -8.7, 1.08, 4.4); lamp(-8.4, 1.8, 4.0, '#FFD08A', 0.5, 6);
    block(-9, -7.4, 4.1, 4.7, 'desk');
    npc(-8.2, 5.5, Math.PI, { name: '資料室的館員', look: { top: '#2E4A34', hair: '#C8B8A0', cloak: '#2E4A34' } });
    inter(-8.2, 3.2, 1.8, '和資料室的館員說話', () => talk('資料室的館員', ['「這裡的資料都是勇者們帶回來的。看完記得放回原位。」', '「圖鑑上的遺跡生物，有的只在特定的分級或環境裡出現。去之前先翻一翻。」']));
    // 館員辦公室：辦公桌、文件、在工作的館員、分館長室的門
    const desk = (x, z) => { bx(1.8, 0.1, 1.0, '#6A4A30', x, 0.8, z); bx(1.7, 0.75, 0.9, '#5A3E28', x, 0.38, z); bx(0.5, 0.05, 0.36, lam('#F4E9CD', { tex: 0 }), x - 0.3, 0.87, z); bx(0.46, 0.12, 0.32, lam('#EDE0C8', { tex: 0 }), x + 0.4, 0.9, z - 0.1); block(x - 0.95, x + 0.95, z - 0.55, z + 0.55, 'desk'); };
    desk(3.6, -3); desk(7.6, -3); desk(3.6, 1.5); desk(7.6, 1.5);
    npc(3.6, -4.1, 0, { name: '館員', look: { top: '#2E4A34', hair: '#2A2220', cloak: '#2E4A34' } });
    npc(7.6, 0.4, 0, { name: '館員', look: { top: '#2E4A34', hair: '#8A5A3A', cloak: '#2E4A34' } });
    inter(3.6, -1.8, 1.8, '和在辦公的館員說話', () => talk('館員', ['「委託書先放這裡，我看一下章有沒有漏。」', '「今天送回來的調查報告……又是城西遺跡。」']));
    inter(7.6, 2.7, 1.8, '和在辦公的館員說話', () => talk('館員', ['「這櫃不能自己翻。你要查自己的資料嗎？勇者證給我。」', '「出發前記得看一下委託告示板，有新的就會貼上去。」']));
    shelfAt(c, 7.2, -HD, 4.6, NW.g, ['#D8CBAE', '#C8B898', '#8A3A2E', '#2E4A6A']);
    bx(1.4, 2.6, 0.12, '#4A3222', HW - 0.08, 1.3, 4.5, EW.g).rotation.y = Math.PI / 2; sign(HW - 0.2, 2.9, 4.5, -Math.PI / 2, '分館長室', '#2E4A34', EW.g);
    block(HW - 0.4, HW, 3.7, 5.3, 'door');
    inter(HW - 1.6, 4.5, 1.6, '分館長室的門', () => talk('分館長室', ['門關著。門牌上寫著「分館長」。', '裡面傳出翻文件的聲音。']));
    const win = (x, z, rotY, par) => { const g = new TH.Group(); g.position.set(x, 2.6, z); g.rotation.y = rotY; par.add(g); bx(1.3, 1.8, 0.06, lam('#CFE0F0', { em: '#9FBEDC', ei: 0.7 }), 0, 0, 0, g); bx(0.08, 1.8, 0.1, '#3A2E26', 0, 0, 0.02, g); bx(1.3, 0.08, 0.1, '#3A2E26', 0, 0, 0.02, g); };
    win(-5, HD - 0.04, Math.PI, SW.g); win(5.5, HD - 0.04, Math.PI, SW.g); win(3.2, -HD + 0.04, 0, NW.g);
    plantAt(c, -HW + 0.8, HD - 0.8); plantAt(c, HW - 0.8, -HD + 0.9);
    lamp(-5, 3.2, 0, '#FFD6A0', 0.8, 13); lamp(5.5, 3.2, -0.5, '#FFD6A0', 0.8, 13);
  };

  // ---------- 老岩的鐵匠鋪：店面＋工房＋後院 ----------
  const furnishSmith = c => {
    const { TH, ins, bx, flat, mesh, block, inter, lamp, sign, npc, flame, part, wallLine, WG, seg, HW, HD, WH, T0, NW, WW, SW, EW } = c;
    const pl = ins.pl, YD = pl.yard;
    // 店面和工房中間的隔間牆
    part(true, 1.5, -HW, HW, [[-1.3, 1.3]]);
    sign(0, 3.55, 1.5 + 0.32, 0, '工房', '#3A2A1C');
    // ---- 店面 ----
    bx(3.6, 1.0, 0.9, '#5A3E28', -6.4, 0.5, 4.2); bx(3.8, 0.12, 1.1, '#7A5A3A', -6.4, 1.06, 4.2); block(-8.3, -4.5, 3.7, 4.75, 'desk');
    bx(0.6, 0.14, 0.4, '#A8AEB6', -7.2, 1.18, 4.2); bx(0.12, 0.5, 0.12, '#6A4A2E', -5.6, 1.35, 4.1);
    sign(-6.4, 0.6, 4.7, 0, '櫃台', '#3A2A1C');
    npc(-6.4, 2.9, 0, { name: '學徒', look: { top: '#6A5A48', hair: '#3A2A1C', cloak: '#4A3A30' } });
    inter(-6.4, 5.8, 2.2, '店面的櫃台：買老岩打好的東西（製作）', () => R.openHub('smith', 'craft'));
    // 展示：鎧甲架（人台）、武器展示架
    const armor = (x, z, col) => { bx(0.1, 1.3, 0.1, '#4A3424', x, 0.65, z); bx(0.62, 0.72, 0.36, col, x, 1.35, z); bx(0.72, 0.16, 0.42, col, x, 1.66, z); mesh(new TH.SphereGeometry(0.22, 8, 6), col, x, 1.95, z); bx(0.5, 0.1, 0.5, '#3A2818', x, 0.05, z); block(x - 0.35, x + 0.35, z - 0.3, z + 0.3, 'deco'); };
    armor(5, 3.4, '#AEB6C0'); armor(6.6, 3.4, '#7E8894'); armor(8.2, 3.4, '#8A6A4A');
    bx(3.4, 1.6, 0.12, '#4A3424', 6.6, 1.5, 7.4); [-1.3, -0.4, 0.5, 1.3].forEach((dx, i) => { bx(0.1, 1.1, 0.04, '#C8CED6', 6.6 + dx, 1.6, 7.3); bx(0.32, 0.06, 0.06, '#C9A13A', 6.6 + dx, 1.05, 7.3); }); block(4.8, 8.4, 7.2, HD, 'rack');
    { const x = -2.8, z = 6.2; bx(1.8, 0.8, 0.9, '#5A3E28', x, 0.4, z); bx(1.8, 0.04, 0.9, lam('#BFD8E8', { em: '#203040', ei: 0.3 }), x, 0.84, z); [[-0.5, 0], [0.2, 0.1], [0.6, -0.15]].forEach(([dx, dz], i) => bx(0.36, 0.06, 0.12, i === 1 ? '#C9A13A' : '#A8AEB6', x + dx, 0.88, z + dz)); block(x - 0.95, x + 0.95, z - 0.5, z + 0.5, 'deco'); }
    const win = (x, z, rotY, par) => { const g = new TH.Group(); g.position.set(x, 2.4, z); g.rotation.y = rotY; par.add(g); bx(1.2, 1.4, 0.06, lam('#CFE0F0', { em: '#9FBEDC', ei: 0.6 }), 0, 0, 0, g); bx(0.08, 1.4, 0.1, '#3A2E26', 0, 0, 0.02, g); bx(1.2, 0.08, 0.1, '#3A2E26', 0, 0, 0.02, g); };
    win(-5, HD - 0.04, Math.PI, SW.g); win(5, HD - 0.04, Math.PI, SW.g);
    lamp(0, 3.2, 4.8, '#FFD6A0', 0.6, 12);
    // ---- 工房 ----
    const brick = lam('#7A4A36', { tex: 'wall' });
    bx(3.2, 2.2, 2.4, brick, 5.6, 1.1, -HD + 1.2); bx(1.6, 0.8, 0.1, lam('#FF7A2A', { em: '#FF5A1A', ei: 1.1 }), 5.6, 0.95, -HD + 2.43);
    bx(2.8, 0.1, 2.0, lam('#FF6A20', { em: '#C83A10', ei: 0.9 }), 5.6, 2.25, -HD + 1.2);
    bx(2.6, 1.0, 1.9, '#3A3230', 5.6, 3.3, -HD + 0.85); bx(1.0, 1.6, 1.0, '#3A3230', 5.6, 4.4, -HD + 0.5);
    bx(0.8, 0.7, 1.1, '#4A3424', 3.5, 0.35, -HD + 1.1); bx(0.9, 0.42, 1.3, '#6A4A2E', 3.5, 0.9, -HD + 1.1);
    for (let i = 0; i < 3; i++) flame(5.0 + i * 0.6, 2.55, -HD + 1.2, 0.9);
    [[7.6, 0.15, -HD + 2.9], [7.9, 0.12, -HD + 3.3], [7.3, 0.1, -HD + 3.4]].forEach(([x, y, z], i) => bx(0.5 - i * 0.1, 0.3 - i * 0.06, 0.45, '#1E1A18', x, y, z));
    lamp(5.6, 1.3, -HD + 3.3, '#FF8A3A', 1.8, 12, true);
    block(3.95, 7.25, -HD, -HD + 2.45, 'forge'); block(3.05, 3.95, -HD + 0.45, -HD + 1.75, 'forge');
    inter(5.6, -HD + 3.7, 2.2, '爐子：打造新的裝備（製作）', () => R.openHub('smith', 'craft'));
    ins.forge = { x: 5.6, y: 1.1, z: -HD + 2.5 };
    // 鐵砧，老岩站在後面一直敲
    const ax = 0.2, az = -2.6;
    bx(0.9, 0.45, 0.7, '#2E2E34', ax, 0.225, az); bx(0.45, 0.35, 0.4, '#2E2E34', ax, 0.62, az); bx(1.4, 0.32, 0.55, '#4A4A54', ax, 0.95, az);
    const horn = mesh(new TH.ConeGeometry(0.2, 0.6, 6), '#4A4A54', ax + 1.0, 0.95, az); horn.rotation.z = -Math.PI / 2;
    block(ax - 0.7, ax + 1.2, az - 0.4, az + 0.4, 'anvil');
    const iwa = npc(ax, az - 1.2, 0, { name: '老岩', weapon: 'mace', look: { top: '#5A4A3A', hair: '#D8D2C4', cloak: '#3A2E26' } });
    iwa.hammer = { x: ax, y: 1.15, z: az };
    inter(ax, az + 1.2, 2.0, '跟老岩說話（鑑定・製作・強化・分解）', () => R.openHub('smith'));
    // 鑑定台（西邊）
    bx(1.2, 0.9, 2.6, '#5A3E28', -HW + 1.1, 0.45, -3.6); bx(0.3, 0.3, 0.3, lam('#FFE08A', { em: '#FFC050', ei: 1 }), -HW + 1.0, 1.08, -4.5);
    const lens = mesh(new TH.TorusGeometry(0.16, 0.03, 6, 14), '#C9A13A', -HW + 1.2, 0.95, -3.3); lens.rotation.x = Math.PI / 2;
    bx(0.5, 0.06, 0.7, '#8A3A2E', -HW + 1.1, 0.93, -2.8); bx(0.5, 0.5, 0.5, '#4A3424', -HW + 2.2, 0.25, -3.6); block(-HW + 1.95, -HW + 2.45, -3.85, -3.35, 'stool');
    lamp(-HW + 1.4, 1.7, -4.2, '#FFD08A', 0.6, 6);
    block(-HW, -HW + 1.75, -4.95, -2.25, 'desk'); sign(-HW + 1.75, 1.35, -3.6, Math.PI / 2, '鑑定', '#3A2A1C');
    inter(-HW + 2.7, -3.6, 2.0, '鑑定台：鑑定遺跡帶出來的東西', () => R.openHub('smith', 'id'));
    // 兵器架（北牆西邊）
    { const cx = -6.2, z = -HD + 0.2;
      bx(3.4, 2.4, 0.12, '#4A3424', cx, 1.9, -HD + 0.06, NW.g); bx(3.4, 0.12, 0.3, '#3A2818', cx, 1.0, -HD + 0.18, NW.g);
      [['sword', 0], ['sword', 1], ['spear', 2], ['axe', 3], ['katana', 4], ['greatsword', 5]].forEach(([k, i]) => {
        const x = cx - 1.4 + i * 0.56;
        if (k === 'spear') { bx(0.05, 2.4, 0.05, '#6A4A2E', x, 2.0, z, NW.g); bx(0.12, 0.3, 0.06, '#C8CED6', x, 3.3, z, NW.g); }
        else if (k === 'axe') { bx(0.05, 1.4, 0.05, '#6A4A2E', x, 1.8, z, NW.g); bx(0.3, 0.35, 0.06, '#A8AEB6', x + 0.1, 2.4, z, NW.g); }
        else { const L = k === 'greatsword' ? 1.5 : k === 'katana' ? 1.2 : 1.0; bx(k === 'greatsword' ? 0.16 : 0.1, L, 0.04, '#C8CED6', x, 1.7 + L / 2, z, NW.g); bx(0.34, 0.06, 0.06, '#C9A13A', x, 1.7, z, NW.g); bx(0.06, 0.36, 0.05, '#3A2A1C', x, 1.5, z, NW.g); }
      });
      block(cx - 1.75, cx + 1.75, -HD, -HD + 0.45, 'rack'); }
    // 工作台（北牆中間）
    bx(2.6, 0.9, 1.0, '#6A4A2E', -2.2, 0.45, -HD + 0.55); bx(0.5, 0.1, 0.16, '#5A5A62', -2.8, 0.95, -HD + 0.5); bx(0.1, 0.08, 0.6, '#3A3A40', -1.6, 0.95, -HD + 0.55);
    bx(2.4, 1.4, 0.06, '#5A3E28', -2.2, 2.4, -HD + 0.04, NW.g); [[-3, 2.5], [-2.4, 2.3], [-1.8, 2.6], [-1.3, 2.4]].forEach(([x, y]) => bx(0.12, 0.8, 0.05, '#2E2E34', x, y, -HD + 0.09, NW.g));
    block(-3.55, -0.85, -HD, -HD + 1.1, 'bench');
    // 磨刀石：會轉的石輪
    { const x = -4, z = -0.4; bx(0.14, 0.9, 0.9, '#4A3424', x - 0.35, 0.45, z); bx(0.14, 0.9, 0.9, '#4A3424', x + 0.35, 0.45, z); const wheel = mesh(new TH.CylinderGeometry(0.55, 0.55, 0.22, 16), '#8A8478', x, 0.95, z); wheel.rotation.z = Math.PI / 2; ins.spin.push({ m: wheel, sp: 4, axis: 'x' }); block(x - 0.6, x + 0.6, z - 0.55, z + 0.55, 'deco'); ins.grind = { x, y: 1.0, z: z + 0.5 }; }
    // 淬火的水槽、廢料箱
    bx(2.0, 0.7, 0.9, '#5A3E28', 4.4, 0.35, -1.4); bx(1.8, 0.04, 0.7, lam('#2A4A5A', { em: '#0A1A22', ei: 0.4 }), 4.4, 0.69, -1.4); block(3.35, 5.45, -1.9, -0.9, 'tub');
    bx(1.3, 0.8, 1.1, '#4A4A50', HW - 1.1, 0.4, -0.6); [[HW - 1.3, -0.8], [HW - 0.9, -0.4], [HW - 1.1, -0.9]].forEach(([x, z], i) => { const s = bx(0.4, 0.12, 0.2, i % 2 ? '#8A8A92' : '#6A6A72', x, 0.86 + i * 0.05, z); s.rotation.y = i; });
    block(HW - 1.8, HW, -1.2, 0, 'bin');
    inter(HW - 2.5, -0.6, 1.8, '廢料箱：分解不要的裝備', () => R.openHub('smith', 'salv'));
    mesh(new TH.CylinderGeometry(0.45, 0.42, 1.0, 10), '#6A4A2E', -HW + 0.7, 0.5, -0.6); block(-HW, -HW + 1.2, -1.1, -0.1, 'barrel');
    lamp(0, 3.2, -2.5, '#FFD6A0', 0.45, 12);
    // ---- 後院：雪地、炭窯、礦車、水井（低矮的圍牆） ----
    const Z0 = -HD - T0, Z1 = Z0 - YD, fence = lam('#7A6A58', { tex: 'planks' });
    const yard = bx(pl.w + T0 * 2, 0.2, YD, lam('#D6DEE2', { tex: 'ground' }), 0, -0.1, (Z0 + Z1) / 2); yard.castShadow = false; ins.rects.push([-HW - T0, Z1, HW + T0, Z0, 'rgba(214,222,226,.85)']);
    const YW = WG({ nx: -1, nz: 0, top: 1.2 }), YE = WG({ nx: 1, nz: 0, top: 1.2 }), YN = WG({ nx: 0, nz: -1, top: 1.2 });
    wallLine(YW, false, -HW - T0 / 2, Z1, Z0, 1.2, null, fence); wallLine(YE, false, HW + T0 / 2, Z1, Z0, 1.2, null, fence); wallLine(YN, true, Z1 - T0 / 2, -HW - T0, HW + T0, 1.2, null, fence);
    lamp(0, 4, (Z0 + Z1) / 2, '#C8D8E8', 0.5, 16);
    // 炭窯
    { const x = -6, z = Z0 - 4.5; const dome = mesh(new TH.SphereGeometry(1.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#7A5A48', x, 0, z); dome.scale.y = 0.9; bx(0.8, 0.7, 0.1, lam('#FF7A2A', { em: '#FF4A10', ei: 1 }), x, 0.4, z + 1.55); bx(0.4, 1.2, 0.4, '#5A4A3A', x + 0.6, 1.6, z - 0.4); block(x - 1.5, x + 1.5, z - 1.5, z + 1.5, 'kiln');
      ins.smoke.push({ x: x + 0.6, y: 2.3, z: z - 0.4 }); lamp(x, 0.8, z + 2.2, '#FF8A3A', 0.6, 5, true);
      inter(x, z + 2.4, 2.0, '炭窯', () => talk('炭窯', ['鐵匠鋪用的炭都是自己燒的。', '學徒說：「師父說買來的炭火不夠旺，遺跡帶出來的礦石燒不透。」'])); }
    // 柴堆（西邊圍牆）
    for (let i = 0; i < 3; i++) for (let k = 0; k < 4 - (i % 2); k++) { const lg = mesh(new TH.CylinderGeometry(0.14, 0.14, 1.6, 6), '#6A4A2E', -HW + 0.6, 0.15 + i * 0.27, Z0 - 1.4 - k * 0.3 - (i % 2) * 0.15); lg.rotation.z = Math.PI / 2; } block(-HW, -HW + 1.4, Z0 - 2.6, Z0 - 0.9, 'wood');
    // 礦車與軌道
    { const x = 5.2, z = Z0 - 4.2; [-0.5, 0.5].forEach(o => bx(0.1, 0.06, 5, '#5A5A62', x + o, 0.03, z)); for (let k = -2; k <= 2; k++) bx(1.4, 0.05, 0.2, '#5A3E28', x, 0.02, z + k); bx(1.3, 0.8, 1.8, '#5A4A3A', x, 0.65, z); bx(1.1, 0.2, 1.6, '#7A7068', x, 1.05, z);
      [[x - 0.2, z - 0.3], [x + 0.25, z + 0.4]].forEach(([cx2, cz2], i) => { const o = mesh(new TH.OctahedronGeometry(0.22, 0), lam(i ? '#9A7AFF' : '#A3ACB6', { em: i ? '#5A3ACF' : '#1A1030', ei: i ? 0.7 : 0.2 }), cx2, 1.25, cz2); o.scale.y = 1.4; });
      block(x - 0.7, x + 0.7, z - 1, z + 1, 'cart');
      inter(x - 1.6, z, 1.8, '礦車', () => talk('礦車', ['北山礦坑運來的礦石，上面還沾著遺跡的粉。', '有幾塊在暗處會微微發光。'])); }
    // 水井
    { const x = 0.5, z = Z1 + 2.2; mesh(new TH.CylinderGeometry(0.9, 0.95, 0.8, 14), '#8C8A82', x, 0.4, z); flat(1.4, 1.4, lam('#1A2A3A', { tex: 0 }), x, 0.81, z); [-0.95, 0.95].forEach(o => bx(0.12, 2.2, 0.12, '#5A3E26', x + o, 1.1, z)); bx(2.2, 0.12, 0.12, '#5A3E26', x, 2.2, z); bx(0.3, 0.3, 0.3, '#6A4A2E', x, 1.6, z);
      block(x - 1, x + 1, z - 1, z + 1, 'well'); inter(x, z + 1.8, 1.8, '水井', () => talk('水井', ['井水冰得刺骨。', '淬火的水都是從這裡打的。'])); }
    // 放炭袋的棚子
    { const x = 7.6, z = Z1 + 1.4; [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]].forEach(([a, b]) => bx(0.12, 2.2, 0.12, '#5A3E26', x + a, 1.1, z + b)); const roof = bx(3, 0.12, 1.8, '#4A3A34', x, 2.3, z); roof.rotation.x = 0.15; bx(3, 0.06, 1.8, '#F2F6F8', x, 2.4, z).rotation.x = 0.15;
      for (let k = 0; k < 5; k++) { const s = mesh(new TH.SphereGeometry(0.4, 8, 6), '#3A3430', x - 0.9 + k * 0.45, 0.3, z + (k % 2) * 0.3); s.scale.set(1, 0.75, 0.8); } block(x - 1.4, x + 1.4, z - 0.8, z + 0.8, 'shed'); }
    // 後院的雪堆
    [[-8.6, Z1 + 0.8], [8.8, Z0 - 1.2], [-2, Z1 + 0.7]].forEach(([x, z]) => { const s = mesh(new TH.SphereGeometry(1, 8, 6), '#F2F6F8', x, 0, z); s.scale.set(1.2, 0.35, 0.8); });
    // 雪花（只在後院）
    { const N = 160, arr = new Float32Array(N * 3); for (let i = 0; i < N; i++) { arr[i * 3] = (Math.random() - 0.5) * pl.w; arr[i * 3 + 1] = Math.random() * 7; arr[i * 3 + 2] = Z0 - Math.random() * YD; }
      const geo = new TH.BufferGeometry(); geo.setAttribute('position', new TH.BufferAttribute(arr, 3)); ins.geos.push(geo); const pix = R.pixelOn();
      const pts = new TH.Points(geo, new TH.PointsMaterial({ color: '#FFFFFF', size: pix ? 1 : 0.1, sizeAttenuation: !pix, transparent: true, opacity: 0.85, depthWrite: false })); pts.frustumCulled = false; ins.group.add(pts); ins.snow = { pts, arr, N, z0: Z0, z1: Z1, w: pl.w }; }
  };

  // ---------- 白藤堂：藥鋪（百味櫃、藥架、搗藥台、驅寒茶的爐子） ----------
  const furnishPharmacy = c => {
    const { TH, ins, bx, flat, mesh, block, inter, lamp, sign, npc, flame, HW, HD, NW, WW, EW, SW } = c;
    // 百味櫃：整面牆的小抽屜
    { const cx = -2, w = 8; bx(w, 3.2, 0.7, '#5A3E26', cx, 1.6, -HD + 0.35, NW.g);
      for (let r = 0; r < 6; r++) for (let i = 0; i < 12; i++) { bx(0.58, 0.44, 0.04, lam(((r + i) % 3) ? '#7A5A3A' : '#6A4A30', { tex: 0 }), cx - w / 2 + 0.38 + i * 0.66, 0.42 + r * 0.5, -HD + 0.72, NW.g); bx(0.08, 0.05, 0.03, '#C9A13A', cx - w / 2 + 0.38 + i * 0.66, 0.42 + r * 0.5, -HD + 0.75, NW.g); }
      block(cx - w / 2, cx + w / 2, -HD, -HD + 0.75, 'shelf'); sign(cx, 3.5, -HD + 0.74, 0, '白藤堂', '#4A3A5A', NW.g); }
    // 櫃台、掌櫃
    bx(7, 1.05, 0.9, '#6A4A30', -2, 0.525, -1.6); bx(7.3, 0.12, 1.15, '#8A6A44', -2, 1.11, -1.6); block(-5.65, 1.65, -2.1, -1.05, 'desk');
    bx(0.5, 0.06, 0.3, '#B8923A', -0.4, 1.2, -1.6); bx(0.06, 0.4, 0.06, '#B8923A', -0.4, 1.4, -1.6);
    [[-4.2, 0], [-3.6, 1], [-3.1, 2]].forEach(([x, i]) => mesh(new TH.CylinderGeometry(0.1, 0.12, 0.3, 8), lam(['#6FB36A', '#8AB8E8', '#E8C04A'][i], { tex: 0 }), x, 1.32, -1.5));
    const boss = npc(-2.5, -3.0, 0, { name: '白藤堂的掌櫃', look: { top: '#4A3A5A', hair: '#C8B8A0', cloak: '#3A2A4A', acc: 'glasses' } });
    boss.watch = { range: 8, fov: 1.15 }; ins.watchers.push(boss);
    inter(-2.5, -0.4, 2.2, '櫃台：回復藥、魔力藥、藥草換藥', () => R.openHub('shop'));
    // 藥架（東邊）：小瓶子一排一排——可以偷
    { const x = HW - 0.5; bx(0.7, 2.6, 4.2, '#5A3E26', x, 1.3, 1.6, EW.g); [0.6, 1.3, 2.0].forEach((y, r) => { bx(0.6, 0.06, 4.0, '#6A4A30', x - 0.05, y, 1.6, EW.g); for (let i = 0; i < 9; i++) mesh(new TH.CylinderGeometry(0.08, 0.1, 0.32, 6), lam(['#E85A6A', '#5F9AF2', '#6FB36A'][(i + r) % 3], { tex: 0 }), x - 0.1, y + 0.2, 0.0 + i * 0.4, EW.g); });
      block(HW - 0.85, HW, -0.5, 3.7, 'shelf');
      const st = R.addSteal({ x: HW - 1.6, z: 1.6, r: 1.5, label: '從藥架上摸走一瓶藥', owner: 'pharmacy', time: 1.3, loot: () => ({ potion: Math.random() < 0.6 ? 'hp' : 'mp' }), max: 2 }, ins.steals); ins.inter.push(R.stealInter(st)); }
    // 學徒在搗藥
    bx(1.6, 0.85, 0.9, '#6A4A30', -HW + 1.6, 0.42, 2.4); mesh(new TH.CylinderGeometry(0.28, 0.22, 0.3, 10), '#8C8A82', -HW + 1.4, 1.0, 2.4); block(-HW + 0.8, -HW + 2.4, 1.95, 2.85, 'table');
    const ap = npc(-HW + 1.6, 3.5, Math.PI, { name: '白藤堂的學徒', look: { top: '#E6DEC6', hair: '#2A2420', cloak: '#B89A4A', hs: 'ponytail' } }); ap.watch = { range: 7, fov: 1.0 }; ins.watchers.push(ap);
    inter(-HW + 1.6, 1.3, 1.8, '和搗藥的學徒說話', () => talk('白藤堂的學徒', ['「驅寒藥一箱要送到湯山村，天黑前、兩個人一起……」', '「以前這種送貨都是新人勇者接的。」']));
    // 驅寒茶的爐子、等候的長椅、藤花
    bx(1.0, 0.9, 1.0, '#3A3230', 3.6, 0.45, -3.8); mesh(new TH.CylinderGeometry(0.32, 0.3, 0.4, 10), '#5A5A62', 3.6, 1.1, -3.8); flame(3.6, 0.5, -3.3, 0.6); block(3.1, 4.1, -4.3, -3.3, 'deco'); lamp(3.6, 1.2, -2.8, '#FF9A4A', 0.6, 6, true);
    inter(3.6, -2.5, 1.6, '驅寒茶（熱茶葉 8 費拉）', () => { const p = R.shopPrice ? R.shopPrice(8, 'pharmacy') : 8; if (p == null) { talk('白藤堂的掌櫃', ['「……請回吧。」']); return; } if (R.S.gold < p) { R.toast('錢不夠。'); return; } R.S.gold -= p; R.addGift('tea', 1); R.save(); R.toast('買了一包驅寒茶葉。'); });
    benchAt(c, -HW + 0.5, -2.2, 2.6, false); benchAt(c, 1.5, HD - 1.4, 2.6, true);
    [[-HW + 0.7, HD - 0.8], [HW - 0.8, HD - 0.8]].forEach(([x, z]) => { bx(0.6, 0.7, 0.6, '#E6E0D2', x, 0.35, z); for (let i = 0; i < 5; i++) mesh(new TH.SphereGeometry(0.16, 6, 5), lam('#F4F0FF', { tex: 0 }), x + (i - 2) * 0.12, 0.85 + (i % 2) * 0.2, z); block(x - 0.35, x + 0.35, z - 0.35, z + 0.35, 'pot'); });
    lamp(-2, 3.0, 0.5, '#FFE0B0', 0.8, 12); lamp(2, 3.0, 2.5, '#FFE0B0', 0.5, 10);
  };

  // ---------- 倉庫：土藏的裡面（寄物的箱子、兵器架、鏡子） ----------
  const furnishStore = c => {
    const { TH, ins, bx, mesh, block, inter, lamp, sign, npc, HW, HD, NW, WW, EW } = c;
    bx(2.4, 0.9, 1.0, '#5A3E26', 0, 0.45, 1.8); bx(2.6, 0.08, 1.2, '#7A5A3A', 0, 0.94, 1.8); bx(0.5, 0.05, 0.36, lam('#F4E9CD', { tex: 0 }), -0.5, 0.99, 1.8); block(-1.25, 1.25, 1.25, 2.35, 'desk');
    npc(0, 0.6, Math.PI, { name: '倉庫番', look: { top: '#3A3232', hair: '#6A4A2E', cloak: '#2E2A2A', hs: 'crop' } }).watch = { range: 9, fov: 1.2 };
    ins.watchers.push(ins.npcs[ins.npcs.length - 1]);
    inter(0, 3.0, 2.2, '倉庫番：換裝備、賣東西', () => R.openHub('stash'));
    // 寄物的箱子、木架
    for (let i = 0; i < 5; i++) { const x = -HW + 1.2 + i * 1.5; bx(1.2, 0.8, 0.8, '#6A4A2E', x, 0.4, -HD + 0.7); bx(1.2, 0.8, 0.8, '#7A5A3A', x, 1.2, -HD + 0.7); bx(1.24, 0.06, 0.84, '#3A3A40', x, 0.82, -HD + 0.7); }
    block(-HW + 0.5, -HW + 7.6, -HD + 0.25, -HD + 1.15, 'shelf');
    const st = R.addSteal({ x: -HW + 4.2, z: -HD + 1.9, r: 1.6, label: '撬開別人寄放的箱子', owner: 'store', time: 2.0, loot: () => (Math.random() < 0.5 ? { gold: 15 + Math.floor(Math.random() * 30) } : { mat: ['iron', 'crystal', 'herb'][Math.floor(Math.random() * 3)], n: 2 }), max: 2 }, ins.steals); ins.inter.push(R.stealInter(st));
    // 兵器架、鎧甲架
    { const x = HW - 0.4; bx(0.3, 2.4, 3.6, '#4A3424', x, 1.5, -1.5, EW.g); for (let i = 0; i < 5; i++) bx(0.05, 1.3, 0.1, '#C8CED6', x - 0.2, 1.6, -3 + i * 0.7, EW.g); block(HW - 0.6, HW, -3.4, 0.4, 'rack'); }
    // 鏡子：換髮型、衣服
    { const x = -HW + 0.08; bx(0.06, 2.2, 1.2, lam('#BFD8E8', { em: '#4A6A7A', ei: 0.5 }), x, 1.6, 2.5, WW.g); bx(0.1, 2.4, 1.4, '#5A3E26', x - 0.02, 1.6, 2.5, WW.g);
      inter(-HW + 1.2, 2.5, 1.6, '大鏡子（重新捏角）', () => R.restyle && R.restyle()); }
    lamp(0, 3.2, 0, '#FFE0B0', 0.8, 12);
  };

  // ---------- 驛站：售票口、時刻表、候車的長椅、行李 ----------
  const furnishStation = c => {
    const { TH, ins, bx, mesh, block, inter, lamp, sign, npc, flame, HW, HD, NW, WW, EW, SW } = c;
    bx(6, 1.1, 0.9, '#5A3E28', 0, 0.55, -HD + 2.2); bx(6.3, 0.12, 1.15, '#7A5A3A', 0, 1.16, -HD + 2.2); block(-3.15, 3.15, -HD + 1.65, -HD + 2.75, 'desk');
    [-2, 0, 2].forEach(x => { bx(0.06, 1.0, 0.04, '#3A2A1C', x - 0.6, 1.8, -HD + 2.2); bx(1.2, 0.06, 0.04, '#3A2A1C', x, 2.3, -HD + 2.2); });
    sign(0, 2.6, -HD + 2.1, 0, '售票口', '#3A2A1C');
    npc(0, -HD + 1.2, 0, { name: '驛站的站務員', look: { top: '#2E3A48', hair: '#2A2420', cloak: '#2E3A48', hs: 'crop' } });
    inter(0, -HD + 3.6, 2.2, '售票口：搭車到昭旭全國的遺跡', () => R.openMapPaused('nation'));
    // 時刻表（看今天的路況）
    bx(3.4, 2.0, 0.08, '#2A2A30', -HW + 2.6, 2.2, -HD + 0.06, NW.g); for (let r = 0; r < 5; r++) bx(3.0, 0.05, 0.02, lam('#E8E4D8', { tex: 0 }), -HW + 2.6, 1.5 + r * 0.32, -HD + 0.11, NW.g);
    inter(-HW + 2.6, -HD + 1.2, 1.8, '看時刻表（今天的路況）', () => { const E = R.eventsToday ? R.eventsToday() : {}; talk('驛站的時刻表', [R.today ? R.dateLabel() : '', E.blizzard ? '暴風雪：矮丘山口、北山山口封閉。往湯山村、北山礦坑的車停駛。' : '往皇嶺：每天兩班。往西岸：每天一班。', E.martial ? '退位大典：今日全城戒嚴，車班照常，但出入要查證件。' : '德克斯凡的貨車：每天早上從選礦廠出發。', '往北州：要到港口換船。']); });
    // 候車的長椅、行李堆（可以偷）、暖爐
    benchAt(c, -3, 1.5, 3.2, true); benchAt(c, 3, 1.5, 3.2, true); benchAt(c, -3, 3.6, 3.2, true);
    const trav = npc(3.2, 0.6, 0, { name: '候車的旅客', look: { top: '#5A6A4A', hair: '#8A5A2E', cloak: '#4A3A30', race: R.randomRace ? R.randomRace() : 'human' } }); trav.watch = { range: 6, fov: 1.0 }; ins.watchers.push(trav);
    inter(3.2, 2.4, 1.6, '和候車的旅客聊聊', () => talk('候車的旅客', [pick(['「往皇嶺的車又誤點了。德克斯凡的貨車倒是很準時。」', '「聽說北州那邊的遺跡，裡面整片都是雪原。」', '「東鶴的人對外地人不太客氣……你也是外地來的？」', '「卡露那邊的教堂遺跡出事了，報上說有勇者失聯。」'])]));
    for (let i = 0; i < 4; i++) bx(0.7 + (i % 2) * 0.2, 0.5, 0.5, ['#6A4A2E', '#3A4A5A', '#7A3A2E', '#5A5A3A'][i], HW - 2.4 + (i % 2) * 0.8, 0.25 + Math.floor(i / 2) * 0.5, 3.6); block(HW - 3, HW - 1, 3.2, 4.0, 'deco');
    const st = R.addSteal({ x: HW - 2, z: 4.9, r: 1.5, label: '翻別人的行李', owner: 'station', time: 1.6, loot: () => (Math.random() < 0.6 ? { gold: 8 + Math.floor(Math.random() * 20) } : { gift: pick(['rose', 'notebook', 'dorayaki']), n: 1 }), max: 2 }, ins.steals); ins.inter.push(R.stealInter(st));
    bx(1.0, 1.0, 1.0, '#3A3230', -HW + 1, 0.5, 3.4); flame(-HW + 1, 0.6, 3.95, 0.7); block(-HW + 0.5, -HW + 1.5, 2.9, 3.9, 'deco'); lamp(-HW + 1.6, 1.1, 3.4, '#FF9A4A', 0.7, 8, true);
    lamp(0, 3.2, 0, '#FFE0B0', 0.8, 14);
  };

  // ---------- 赤提燈：居酒屋（櫃台、廚房、座敷），樓上是客房 ----------
  const furnishTavern = c => {
    const { TH, ins, bx, flat, mesh, block, inter, lamp, sign, npc, flame, part, HW, HD, NW, WW, EW, SW } = c;
    // L 形的櫃台、高腳椅
    bx(9, 1.05, 0.9, '#5A3A24', -2, 0.525, -2.6); bx(9.3, 0.12, 1.15, '#7A5A3A', -2, 1.11, -2.6); block(-6.65, 2.65, -3.1, -2.05, 'bar');
    for (let i = 0; i < 6; i++) stoolAt(c, -5.8 + i * 1.5, -1.5);
    // 廚房：爐火、鍋子、酒架
    bx(3.2, 1.0, 1.4, '#3A3230', -4.5, 0.5, -HD + 0.8); for (let i = 0; i < 3; i++) flame(-5.5 + i * 1.0, 1.05, -HD + 0.8, 0.7); mesh(new TH.CylinderGeometry(0.4, 0.36, 0.45, 10), '#4A4A50', -4.5, 1.25, -HD + 0.8); ins.smoke.push({ x: -4.5, y: 1.6, z: -HD + 0.8 });
    lamp(-4.5, 1.3, -HD + 2, '#FF8A3A', 1.0, 9, true); block(-6.1, -2.9, -HD, -HD + 1.5, 'forge');
    bx(5, 2.6, 0.4, '#3A2818', 1.5, 1.7, -HD + 0.22, NW.g); [0.9, 1.7, 2.5].forEach(y => bx(4.8, 0.06, 0.5, '#4A3424', 1.5, y, -HD + 0.42, NW.g));
    for (let s = 0; s < 3; s++) for (let i = 0; i < 10; i++) mesh(new TH.CylinderGeometry(0.06, 0.08, 0.32, 6), lam(['#3E6A3A', '#8A3A2E', '#C9A13A', '#E8E0D0'][(i + s) % 4], { tex: 0 }), -0.6 + i * 0.45, 1.1 + s * 0.8, -HD + 0.42, NW.g);
    const okami = npc(-1, -HD + 1.8, 0, { name: '赤提燈的老闆娘', look: { top: '#8A2A24', hair: '#1A1714', cloak: '#5A1E1C', hs: 'bun' } }); okami.watch = { range: 8, fov: 1.2 }; ins.watchers.push(okami);
    inter(-1, -0.6, 2.4, '和老闆娘點菜（熱湯、酒、宿屋的房間）', () => R.tavernSheet && R.tavernSheet());
    // 櫃台上的錢盒（可以偷）
    bx(0.4, 0.18, 0.3, '#3A2A1C', 1.9, 1.26, -2.6);
    const st = R.addSteal({ x: 2.1, z: -1.6, r: 1.2, label: '摸走櫃台上錢盒裡的錢', owner: 'tavern', time: 1.5, loot: () => ({ gold: 10 + Math.floor(Math.random() * 25) }), max: 1 }, ins.steals); ins.inter.push(R.stealInter(st));
    // 座敷（墊高的榻榻米）、矮桌、坐墊
    { const x0 = 3.6, x1 = HW - 0.3, z0 = 0.6, z1 = HD - 0.4; bx(x1 - x0, 0.3, z1 - z0, lam('#C8B888', { tex: 'planks' }), (x0 + x1) / 2, 0.15, (z0 + z1) / 2); for (let i = 0; i < 3; i++) flat(0.04, z1 - z0, '#8A7A5A', x0 + 1.4 + i * 2, 0.31, (z0 + z1) / 2);
      [[5.2, 2.6], [8, 2.6], [5.2, 5.2], [8, 5.2]].forEach(([x, z]) => { bx(1.4, 0.3, 0.9, '#6A4A30', x, 0.45, z); [-0.9, 0.9].forEach(o => bx(0.5, 0.08, 0.5, '#8A2A24', x + o, 0.34, z)); block(x - 0.7, x + 0.7, z - 0.45, z + 0.45, 'table'); }); }
    // 一般的桌子、在喝酒的客人（有的會聊遺跡的傳聞）
    tableAt(c, -4.5, 2.6, 2.0, 1.1); tableAt(c, -0.8, 3.4, 2.0, 1.1); tableAt(c, -4.5, 5.4, 2.0, 1.1);
    [[-5.6, 2.6, 'archer'], [-3.4, 2.6, 'gunner'], [0.3, 3.4, 'mage'], [-5.6, 5.4, 'warrior']].forEach(([x, z, cls], i) => { const n = npc(x, z, x < -4.5 ? Math.PI / 2 : -Math.PI / 2, { cls, weapon: R.STARTER[cls], eq: bodyOf(cls), name: '喝酒的客人', look: { race: R.randomRace ? R.randomRace() : 'human' } }); n.h.sit = true; inter(x, z + 0.9, 1.4, '和喝酒的客人聊聊', () => rumor('喝酒的客人', i === 3 ? ['「湯還有嗎？再給我一碗。喝完我就上樓睡了。」'] : null)); });
    // 上二樓的樓梯（客房）
    for (let i = 0; i < 7; i++) { const h = 0.55 * (i + 1); bx(1.8, h, 0.5, '#6A4A30', -HW + 1.0, h / 2, HD - 0.4 - 0.5 * i); }
    block(-HW, -HW + 2, HD - 3.8, HD, 'stairs');
    inter(-HW + 2.4, HD - 4.2, 1.8, '上樓：客房（住一晚）', () => R.tavernSheet && R.tavernSheet('room'));
    // 紅提燈、小舞台（息日有琵琶法師）
    for (let i = 0; i < 5; i++) { mesh(new TH.CylinderGeometry(0.22, 0.22, 0.4, 8), lam('#E04A3A', { em: '#C02818', ei: 0.9 }), -6 + i * 2.6, 3.4, 0.6); }
    bx(2.6, 0.3, 1.8, '#5A3E26', 1.6, 0.15, HD - 1.2); block(0.3, 2.9, HD - 2.1, HD - 0.3, 'stage');
    ins.stage = { x: 1.6, z: HD - 1.2 };
    lamp(-2, 3.4, 0, '#FFC890', 0.9, 13); lamp(6, 3.0, 3.8, '#FFC890', 0.7, 11); lamp(-4, 3.0, 4.5, '#FFC890', 0.5, 10);
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // 大廳裡的勇者：說話、邀請同行
  const recruitSheet = (m, n) => {
    const S = R.S; if (S.roster.indexOf(m) < 0) return;
    const full = S.party.length >= R.PARTY_MAX, poor = S.gold < m.fee || !!m.refuse;
    R.sheet('<p class="kicker">公會大廳・同行的勇者</p><h2>' + esc(m.name) + '</h2><p class="note">' + esc(R.CLASSES[m.cls].name) + ' Lv ' + m.lv + '</p><p>' + esc(m.line) + '</p>'
      + '<p class="note">邀請同行要 ' + m.fee + ' 費拉（你有 ' + S.gold + '）。隊伍最多 ' + R.PARTY_MAX + ' 人，現在 ' + S.party.length + ' 人。' + (full ? '隊伍已滿。要換人，請到登記處的隊伍名冊讓一位隊友離隊。' : poor ? '費拉不夠。' : '委託報酬每個隊友分走一成五。') + '</p>',
      '<div class="row"><button type="button" class="btn pri" id="rc-hire"' + (full || poor ? ' disabled' : '') + '>邀請同行（' + m.fee + ' 費拉）</button><button type="button" class="btn" id="rc-x">算了</button></div>');
    $('rc-x').onclick = R.closeSheet;
    $('rc-hire').onclick = () => {
      if (!R.hire(S.roster.indexOf(m))) return;
      R.closeSheet();
      const ins = W.inside; if (!ins) return;
      ins.group.remove(n.h.g); n.box.on = false; ins.npcs = ins.npcs.filter(v => v !== n); ins.inter = ins.inter.filter(v => v !== n.it);
      (W.town.allies || []).forEach(a => { if (a.h.g.parent) a.h.g.parent.remove(a.h.g); }); R.spawnTownAllies(); placeAllies();
      R.toast(m.name + '加入了隊伍');
    };
  };

  // ---------- 隊友進門時站在你身後 ----------
  const placeAllies = () => {
    const P = W.P; (W.town.allies || []).forEach((a, i) => { a.x = P.x + (i ? 1.3 : -1.3); a.z = Math.min(P.z + 0.8, W.inside.pl.d / 2 - 0.7); const o = { x: a.x, z: a.z }; R.collide(o, 0.4); a.x = o.x; a.z = o.z; a.h.g.position.set(a.x, 0, a.z); });
  };
  const dispose = ins => {
    if (!ins) return;
    ins.geos.forEach(g => g.dispose());
    ins.walls.forEach(w => { if (w.ghost) w.ghost.forEach(m => m.dispose()); });
  };

  // ---------- 赤提燈：吃的、喝的（下一趟遺跡的加成）、住一晚 ----------
  R.tavernSheet = mode => {
    const S = R.S, pr = b => (R.shopPrice ? R.shopPrice(b, 'tavern') : b);
    if (pr(1) == null) { talk('赤提燈的老闆娘', ['「……今天客滿了。」', '（她沒有看你的眼睛。）']); return; }
    const menu = [['soup', '熱湯', 8, '下一趟遺跡：生命 +8%', { hp: 0.08 }], ['fish', '烤霜背鮒定食', 12, '下一趟遺跡：慢慢回復生命', { regen: 0.5 }], ['sake', '熱酒', 10, '下一趟遺跡：傷害 +6%，但比較容易被佩特拉注意', { dmg: 0.06, aware: 0.1 }]];
    const room = pr(20);
    R.sheet('<p class="kicker">赤提燈</p><h2>' + (mode === 'room' ? '樓上的客房' : '今天的菜') + '</h2>' + (mode === 'room' ? '<p>「一晚 ' + room + ' 費拉，熱水和棉被都有。」</p>' : '<p>「今天冷，吃點熱的再下去。」</p><div class="recipes">' + menu.map(([k, n, b, d]) => '<div class="recipe"><b>' + n + '</b><small>' + d + '</small><button type="button" class="btn pri" data-eat="' + k + '"' + (S.gold < pr(b) ? ' disabled' : '') + '>點（' + pr(b) + ' 費拉）</button></div>').join('') + '</div>')
      + '<p class="note">' + (R.today ? esc(R.dateLabel()) : '') + '</p>',
      '<div class="row">' + '<button type="button" class="btn pri" id="tv-sleep"' + (S.gold < room ? ' disabled' : '') + '>住一晚（' + room + ' 費拉，睡到隔天）</button>' + (mode === 'room' ? '' : '<button type="button" class="btn" id="tv-talk">聽聽傳聞</button>') + '<button type="button" class="btn" id="tv-x">算了</button></div>');
    $('tv-x').onclick = R.closeSheet;
    if ($('tv-talk')) $('tv-talk').onclick = () => rumor('赤提燈的老闆娘', ['「這裡的客人什麼都聊。」']);
    $('tv-sleep').onclick = () => { if (S.gold < room) return; S.gold -= room; R.closeSheet(); R.sleepInn(); };
    document.querySelectorAll('[data-eat]').forEach(b => { b.onclick = () => { const m = menu.find(v => v[0] === b.dataset.eat), p = pr(m[2]); if (S.gold < p) return; S.gold -= p; S.buff = { kind: 'food', b: m[4], until: S.day }; R.save(); R.closeSheet(); R.toast(m[1] + '：暖和多了。（今天下遺跡有效）'); }; });
  };
  // 睡一晚：日子往前一天，城會重蓋（今天在城裡的人不一樣了），醒來在樓梯口
  R.sleepInn = () => {
    R.fade(() => {
      R.advanceDays(1);
      const door = W.town && W.town.inter.find(v => v.label && v.label.indexOf('赤提燈') >= 0), from = W.town ? W.town.from : null;
      R.enterTownNow(from, door ? [door.x, door.z] : null);
      enterNow('tavern', { x: -PLACES.tavern.w / 2 + 2.4, z: PLACES.tavern.d / 2 - 4.6, yaw: 0 });
      const E = R.eventsToday ? R.eventsToday() : {};
      R.banner(R.shortDate(), '睡了一晚。' + (E.martial ? '今天全城戒嚴。' : E.blizzard ? '外面是暴風雪。' : E.market ? '今天是市集日。' : R.today().rest ? '今天是休息日。' : ''));
    });
  };
  R.sleep = R.sleepInn;
  // 公會的徽章貼圖（透明底，點陣）
  R.emblemTex = (pw, ph) => {
    const c = document.createElement('canvas'); c.width = pw; c.height = ph; const t = new (T().CanvasTexture)(c); t.magFilter = t.minFilter = T().NearestFilter; t.generateMipmaps = false; t.encoding = T().sRGBEncoding;
    R.onEmblem(() => { const g = c.getContext('2d'), im = R.emblemImg; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; const h = ph, w = Math.round(h * im.naturalWidth / im.naturalHeight); g.drawImage(im, Math.round((pw - w) / 2), 0, w, h); const d = g.getImageData(0, 0, pw, ph); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0; g.putImageData(d, 0, 0); t.needsUpdate = true; });
    return t;
  };

  // ---------- 進去、出來、上下樓 ----------
  let busy = false;
  const enterNow = (kind, at) => {
    const tw = W.town, P = W.P; if (!tw || !P) return;
    if (!W.inside) W.outside = { scene: W.scene, col: R.col, moon: W.moon, torch: W.torch, x: P.x, z: P.z, zoom: W.cam.zoomT };
    const old = W.inside, ins = build(kind);
    W.inside = ins; W.scene = ins.scene; W.moon = ins.key; W.torch = null;
    ins.scene.add(P.h.g);
    (tw.allies || []).forEach(a => { if (a.h.g.parent) a.h.g.parent.remove(a.h.g); });
    if (old) dispose(old);
    if (at) { P.x = at.x; P.z = at.z; P.yaw = at.yaw; } else { P.x = 0; P.z = ins.pl.d / 2 - 1.3; P.yaw = Math.PI; }
    P.h.g.position.set(P.x, 0, P.z); P.h.g.rotation.y = P.yaw;
    R.spawnTownAllies(); placeAllies();
    if (!old) W.cam.zoomT = Math.min(W.outside.zoom, ins.pl.zoom);
    const cx = Math.sin(W.cam.yawT), cz = Math.cos(W.cam.yawT);
    ins.walls.forEach(w => fadeWall(w, wallWant(w, P, cx, cz), 1));
    R.placeCam(null);
    R.interiorHud(true);
  };
  R.INTERIOR_KIT = { tableAt, benchAt, stoolAt, plantAt, shelfAt, talk, rumor, lam };   // interiors2.js 用
  R.enterInterior = (kind, at) => {   // at：從別的門進來時站的位置（例如望月家正屋的後門）
    if (busy || W.inside || !W.town) return;
    busy = true; R.input.keys = {};
    R.fade(() => { busy = false; enterNow(kind, at); R.banner(PLACES[kind].name, { guild: '登記處在最裡面，委託貼在北邊的牆上；東邊是酒場', smith: '「進來把門帶上，風一直灌進來。」', pharmacy: '藥草和驅寒茶的味道', store: '「寄放的東西，報名字就好。」', station: '售票口在最裡面，時刻表在左邊的牆上', tavern: '「歡迎光臨！」老闆娘的聲音從櫃台後面傳來' }[kind] || PLACES[kind].hint || PLACES[kind].sub || ''); });
  };
  // 上下樓
  R.changeFloor = (kind, at) => {
    if (busy || !W.inside) return;
    busy = true; R.input.keys = {};
    R.fade(() => { busy = false; enterNow(kind, at); if (kind === 'guild2') R.banner('公會東鶴分館・二樓', '資料室：遺跡生物圖鑑、全國遺跡分布圖'); });
  };
  // 回到店裡（在店面的畫面按「回到……」）：重新擺一次（剛才可能找了隊友）
  R.refreshInterior = () => { const ins = W.inside, P = W.P; if (!ins) return; enterNow(ins.kind, { x: P.x, z: P.z, yaw: P.yaw }); };
  // 在裡面切換像素風：街道和屋子都要重做
  R.rebuildInterior = () => {
    const ins = W.inside, o = W.outside, P = W.P; if (!ins || !o) return;
    const kind = ins.kind, at = { x: P.x, z: P.z, yaw: P.yaw }, zoom = o.zoom;
    R.enterTownNow(W.town.from);
    W.P.x = o.x; W.P.z = o.z; W.cam.zoomT = zoom;
    enterNow(kind, at);
    dispose(ins);
  };
  R.exitInterior = () => {
    if (busy || !W.inside) return;
    busy = true; R.input.keys = {};
    R.fade(() => {
      busy = false;
      const ins = W.inside, o = W.outside, P = W.P; if (!ins || !o) return;
      (W.town.allies || []).forEach(a => { if (a.h.g.parent) a.h.g.parent.remove(a.h.g); });
      W.scene = o.scene; R.col = o.col; W.moon = o.moon; W.torch = o.torch;
      // o.back：從後門出來（站在門的北邊、面向北）
      W.scene.add(P.h.g); P.x = o.x; P.z = o.z + (o.back ? -0.3 : 0.3); P.yaw = o.back ? Math.PI : 0; P.h.g.position.set(P.x, 0, P.z); P.h.g.rotation.y = P.yaw;
      W.inside = null; W.outside = null;
      dispose(ins);
      R.spawnTownAllies();
      W.cam.zoomT = o.zoom;
      R.placeCam(null); R.townHud(true);
    });
  };

  // ---------- 透明的牆 ----------
  // 外牆：朝著鏡頭就透明；隔間牆：擋在你和鏡頭之間才透明
  const wallWant = (w, P, cx, cz) => {
    if (w.inner) { const dx = w.cx - P.x, dz = w.cz - P.z, along = dx * cx + dz * cz, lat = Math.abs(dx * cz - dz * cx), facing = Math.abs(w.nx * cx + w.nz * cz); return facing > 0.3 && along > -0.4 && along < 11 && lat < w.half + 3 ? 0.14 : 1; }
    return w.nx * cx + w.nz * cz > 0.3 ? 0.14 : 1;
  };
  const fadeWall = (w, want, dt) => {
    if (Math.abs(w.op - want) < 0.002) return;
    w.op = Math.abs(w.op - want) < 0.02 ? want : w.op + (want - w.op) * Math.min(1, dt * 8);
    if (!w.ghost) { w.ghost = []; w.g.traverse(o => { if (o.isMesh) { o.userData.m0 = o.material; o.material = R.cloneMat ? R.cloneMat(o.material) : o.material.clone(); o.material.transparent = true; o.material.depthWrite = false; w.ghost.push(o.material); } }); }
    w.ghost.forEach(m => { m.opacity = w.op; });
    w.g.traverse(o => { if (o.isMesh) o.castShadow = w.op > 0.6; });
    if (w.op >= 0.999) { w.g.traverse(o => { if (o.isMesh && o.userData.m0) { o.material.dispose(); o.material = o.userData.m0; delete o.userData.m0; } }); w.ghost = null; w.op = 1; }
  };
  const sparkGeo = () => sparkGeo.g || (sparkGeo.g = new (T().BoxGeometry)(0.07, 0.07, 0.07));
  const sparkMat = () => sparkMat.m || (sparkMat.m = new (T().MeshBasicMaterial)({ color: '#FFD27A' }));
  const smokeGeo = () => smokeGeo.g || (smokeGeo.g = new (T().SphereGeometry)(0.35, 6, 5));
  const sparks = (ins, x, y, z, n, up) => {
    for (let i = 0; i < n; i++) { const m = new (T().Mesh)(sparkGeo(), sparkMat()); m.position.set(x, y, z); ins.group.add(m); ins.fx.push({ m, vx: (Math.random() - 0.5) * 3, vy: (up || 1.6) + Math.random() * 2.4, vz: (Math.random() - 0.5) * 3, life: 0.35 + Math.random() * 0.45 }); }
  };

  // ---------- 每一格 ----------
  R.interiorNear = () => { const P = W.P, ins = W.inside; let best = null, bd = 1e9; ins.inter.forEach(it => { const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < bd) { bd = d; best = it; } }); return best; };
  R.interiorStep = dt => {
    const ins = W.inside, P = W.P, I = R.input; if (!ins || !P) return;
    ins.t += dt;
    let mx = 0, mz = 0;
    if (I.keys.w || I.keys.arrowup) mz -= 1; if (I.keys.s || I.keys.arrowdown) mz += 1; if (I.keys.a || I.keys.arrowleft) mx -= 1; if (I.keys.d || I.keys.arrowright) mx += 1;
    if (I.moveStick) { mx += I.moveStick.x; mz += I.moveStick.y; }
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    const cy = Math.cos(W.cam.yaw), sy = Math.sin(W.cam.yaw), wx = mx * cy + mz * sy, wz = -mx * sy + mz * cy;
    const run = R.running() ? 1.8 : 1; P.x += wx * P.speed * 0.8 * run * dt; P.z += wz * P.speed * 0.8 * run * dt;
    R.collide(P, 0.42);
    if (ml > 0.1) P.yaw = Math.atan2(wx, wz);
    P.aimA = P.yaw;
    // 走出大門就回到街上
    if (ins.pl.out && P.z > ins.pl.d / 2 + 0.2 && Math.abs(P.x) < 1.3) R.exitInterior();
    P.h.g.position.set(P.x, 0, P.z); P.h.g.rotation.y = P.yaw; R.animHero(P.h, ml * P.speed * 0.8 * run, dt, false);
    R.townAllies(dt);
    // 屋裡的人：靠近的時候轉過來看你；老岩一直在打鐵
    if (R.crimeStep) R.crimeStep(dt, ins.watchers, ins);
    ins.npcs.forEach(n => {
      if (n.watch || n.sitting) { R.animHero(n.h, 0, dt, false); return; }
      const d = Math.hypot(P.x - n.x, P.z - n.z), want = d < 4.2 && !n.hammer ? Math.atan2(P.x - n.x, P.z - n.z) : n.rot0;
      let da = want - n.rot; da = Math.atan2(Math.sin(da), Math.cos(da)); n.rot += da * Math.min(1, dt * 5); n.h.g.rotation.y = n.rot;
      if (n.hammer) { n.ht = (n.ht == null ? 0.6 : n.ht) - dt; if (n.ht <= 0) { n.ht = 1.1 + Math.random() * 0.5; n.h.swing = 0.25; setTimeout(() => { if (W.inside === ins) sparks(ins, n.hammer.x, n.hammer.y, n.hammer.z, 9); }, 150); } }
      R.animHero(n.h, 0, dt, false);
    });
    // 火光、火苗、爐口的火星、磨刀石、炭窯的煙、後院的雪
    ins.lights.forEach(L => { if (L.flicker) L.l.intensity = L.I * (0.84 + Math.sin(ins.t * 13 + L.x) * 0.07 + Math.random() * 0.1); });
    ins.flames.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(ins.t * 9 + i * 1.7) * 0.18 + Math.random() * 0.08; });
    ins.spin.forEach(s => { s.m.rotation.x += s.sp * dt; });
    ins.puff -= dt;
    if (ins.puff <= 0) {
      ins.puff = 0.5 + Math.random() * 0.6;
      if (ins.forge) sparks(ins, ins.forge.x + (Math.random() - 0.5), ins.forge.y, ins.forge.z, 3, 0.8);
      if (ins.grind && Math.random() < 0.5) sparks(ins, ins.grind.x, ins.grind.y, ins.grind.z, 4, 0.6);
      ins.smoke.forEach(s => { const m = new (T().Mesh)(smokeGeo(), new (T().MeshBasicMaterial)({ color: '#8A8A90', transparent: true, opacity: 0.5, depthWrite: false })); m.position.set(s.x + (Math.random() - 0.5) * 0.3, s.y, s.z); ins.group.add(m); ins.fx.push({ m, smoke: true, life: 2.6, vy: 0.9 }); });
    }
    ins.fx = ins.fx.filter(s => {
      s.life -= dt;
      if (s.smoke) { s.m.position.y += s.vy * dt; s.m.position.x += dt * 0.3; s.m.scale.multiplyScalar(1 + dt * 0.5); s.m.material.opacity = Math.max(0, s.life / 2.6 * 0.5); if (s.life <= 0) { ins.group.remove(s.m); s.m.material.dispose(); return false; } return true; }
      s.vy -= 9 * dt; s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt; if (s.life <= 0 || s.m.position.y < 0.03) { ins.group.remove(s.m); return false; } return true;
    });
    if (ins.snow) { const sn = ins.snow, a = sn.arr; for (let i = 0; i < sn.N; i++) { a[i * 3 + 1] -= dt * 1.1; a[i * 3] += Math.sin(ins.t + i) * dt * 0.3; if (a[i * 3 + 1] < 0) a[i * 3 + 1] += 7; } sn.pts.geometry.attributes.position.needsUpdate = true; }
    // 鏡頭；擋住視線的牆變透明
    R.placeCam(dt, 0);
    const cx = Math.sin(W.cam.yaw), cz = Math.cos(W.cam.yaw);
    ins.walls.forEach(w => fadeWall(w, wallWant(w, P, cx, cz), dt));
    R.interiorHud(false, dt);
  };

  // ---------- 狀態列、小地圖 ----------
  let slow = 0;
  R.interiorHud = (force, dt) => {
    slow += dt || 0; if (!force && slow < 0.2) return; slow = 0;
    const ins = W.inside; if (!ins) return;
    if (force) $('r-where').innerHTML = '<b>' + esc(ins.pl.name) + '</b><small>' + esc(ins.pl.sub) + (R.today ? '・' + esc(R.shortDate()) : '') + '　' + esc(R.clsName(R.S.cls)) + ' Lv ' + R.S.classes[R.S.cls].lv + '</small>';
    $('r-town').innerHTML = '<span>費拉 <b>' + R.S.gold + '</b></span><span>回復藥 <b>' + R.S.potions.hp + '</b></span><span>魔力藥 <b>' + R.S.potions.mp + '</b></span>' + (R.crimeHud ? R.crimeHud() : '');
    const it = R.interiorNear();
    $('r-prompt').hidden = !it; if (it) $('r-prompt').innerHTML = '<kbd>' + (R.touch ? '互動' : '空白') + '</kbd>' + esc(it.label);
    R.drawMinimap();
  };
  R.drawInteriorMinimap = (x, s) => {
    const ins = W.inside, P = W.P, yaw = W.cam.yaw, c = Math.cos(yaw), sn = Math.sin(yaw), k = s / (Math.max(ins.pl.w, ins.pl.d + (ins.pl.yard || 0)) + 5);
    const pt = (wx, wz) => { const dx = (wx - P.x) * k, dz = (wz - P.z) * k; return [s / 2 + dx * c - dz * sn, s / 2 + dx * sn + dz * c]; };
    const quad = (x0, z0, x1, z1, col) => { const a = pt(x0, z0), b = pt(x1, z0), e = pt(x1, z1), d = pt(x0, z1); x.fillStyle = col; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.lineTo(e[0], e[1]); x.lineTo(d[0], d[1]); x.closePath(); x.fill(); };
    ins.rects.forEach(([x0, z0, x1, z1, col]) => quad(x0, z0, x1, z1, col));
    R.col.list.forEach(b => { if (!b.on || b.z0 > ins.pl.d / 2 + 1) return; quad(b.x0, b.z0, b.x1, b.z1, b.tag === 'wall' ? '#2A221C' : b.tag === 'npc' ? '#3E7A48' : '#6A4E36'); });
    if (ins.pl.out) quad(-1.2, ins.pl.d / 2 - 0.1, 1.2, ins.pl.d / 2 + 0.7, '#F4E9CD');
  };
})(window.R);
