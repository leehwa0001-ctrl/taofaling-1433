// 討伐令 1433：家具（作者 2026-10-04：也許可以買家具之類的？目前超空的）
// - 302 室和中庭的小花園各有一本「家具型錄（郵購）」：買了當天送到，自動擺到空著的位置；
//   「擺設」可以換位置、收起來。存在 R.S.furn = { own: { 家具id: 數量 }, at: { home: { 位置id: 家具id }, garden: {…} } }。
// - 位置是固定的幾個（客廳中間、北邊的牆、西邊的牆、地板……），照房子、花園的大小（homeup.js 擴建）跟著牆走。
//   位置分種類：地上（大、中、小）、靠北牆、掛西牆、地毯。家具只能放進合得上的位置。
// - 有些家具可以用：沙發坐一下、書架翻書、神棚拜一拜、啞鈴、烤肉架（一天一次，當天下遺跡有小加成，和吃東西的加成不疊）、
//   鞦韆、吊床、風鈴、收音機……
// 放在 home.js、zoo.js、homeup.js 後面。
(function (R) {
  const S = () => R.S, esc = s => R.esc(s), pick = a => a[Math.floor(Math.random() * a.length)];
  const PL = R.INTERIOR_PLACES, FN = R.INTERIOR_FURNISH; if (!PL || !FN) return;
  const data = () => { const s = S(); s.furn = s.furn || {}; s.furn.own = s.furn.own || {}; s.furn.at = s.furn.at || {}; s.furn.at.home = s.furn.at.home || {}; s.furn.at.garden = s.furn.at.garden || {}; s.furn.day = s.furn.day || {}; return s.furn; };

  // ---------- 位置 ----------
  // t：floor（max＝放得下的大小 1 小、2 中、3 大）、nwall（靠北邊的牆站著）、wwall（掛在西邊的牆上）、rug（地毯、野餐墊）
  const SLOTS = {
    home: [
      { id: 'liv', n: '客廳中間', t: 'floor', max: 3, at: c => [c.HW - 2.8, -0.7] },
      { id: 'mid', n: '房間正中', t: 'floor', max: 2, at: c => [0.2, 0.6] },
      { id: 'nw', n: '北牆（床和電視中間）', t: 'nwall', at: c => [-c.HW + 2.6, -c.HD + 0.25] },
      { id: 'ww', n: '西邊的牆', t: 'wwall', at: c => [-c.HW + 0.04, 0.9] },
      { id: 'rug', n: '客廳的地板', t: 'rug', at: c => [c.HW - 2.8, -0.2] },
      { id: 'sw', n: '暖桌旁的角落', t: 'floor', max: 1, at: c => [-c.HW + 0.5, 1.5] },
      { id: 'east', n: '收納櫃旁', t: 'floor', max: 1, at: c => [c.HW - 0.5, -1.2] },
      { id: 'door', n: '玄關', t: 'floor', max: 1, at: c => [1.5, c.HD - 0.45] }
    ],
    garden: [
      { id: 'gn', n: '北邊花圃中間', t: 'floor', max: 3, at: c => [0, -c.HD + 1.1] },
      { id: 'ge', n: '東邊', t: 'floor', max: 3, at: c => [c.HW - 1.6, -1.6] },
      { id: 'gmid', n: '中央的草地', t: 'floor', max: 2, at: c => [-3.0, 1.0] },
      { id: 'gnw', n: '西北角', t: 'floor', max: 2, at: c => [-c.HW + 1.2, -c.HD + 2.6] },
      { id: 'gbench', n: '長椅旁', t: 'floor', max: 2, at: c => [-c.HW + 4.6, c.HD - 1.3] },
      { id: 'gmat', n: '晒衣竿下的草地', t: 'rug', at: c => [0, 0.2] },
      { id: 'gpond', n: '池塘邊', t: 'floor', max: 1, at: c => [c.HW - 1.0, 0.6] },
      { id: 'gs', n: '南邊', t: 'floor', max: 1, at: c => [2.6, c.HD - 0.8] }
    ]
  };
  const fits = (sl, f) => sl.t === f.t && (sl.t !== 'floor' || f.size <= sl.max);

  // ---------- 用得到的小東西 ----------
  const daily = (key, lines, buff, kind) => {
    const s = S(), d = data();
    if (d.day[key] === s.day) { R.townTalk(FUR[key] ? FUR[key].name : '家具', ['今天已經做過了。']); return; }
    d.day[key] = s.day; let note = '';
    if (buff) { if (!s.buff || s.buff.until !== s.day) { s.buff = { kind: kind || key, b: buff, until: s.day }; note = '（今天下遺跡有一點加成）'; } else note = '（今天已經有別的加成了，不會疊上去）'; }
    R.save && R.save(); R.townTalk(FUR[key].name, lines.concat(note ? [note] : []));
  };
  const BOOKS = ['《遺跡入門・第三版》：「佩特拉核心不是心臟，比較像一顆會記仇的腦。」', '《東鶴風土記》：「西橋已經修了十一年。」', '《勇者的家計簿》：「回復藥要在公會買，遺跡裡的商人貴一半。」', '一本封面掉了的小說。讀到一半發現是第二集。', '《遺跡生物的飼養（試論）》：「牠們不吃東西，但是喜歡被摸。」', '《全國溫泉百選》：湯山村排第四十二名。'];

  // ---------- 家具 ----------
  // size：1 小、2 中、3 大；draw(c, x, z)：c 是 interior.js 的工具（bx、mesh、block、inter、lamp、TH）
  const box = (c, w, h, d, col, x, y, z) => c.bx(w, h, d, col, x, y, z);
  const glow = (c, col, I) => new c.TH.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: I || 0.8 });
  const FUR = {
    // ---- 房子 ----
    sofa: { name: '布沙發', price: 4800, place: 'home', t: 'floor', size: 3, desc: '三人座。坐下去會陷進去一點。',
      draw: (c, x, z) => { const col = '#5A6A8A'; box(c, 2.0, 0.4, 0.8, col, x, 0.2, z); box(c, 2.0, 0.55, 0.2, '#4A5A7A', x, 0.6, z - 0.32); [-0.92, 0.92].forEach(o => box(c, 0.18, 0.55, 0.8, '#4A5A7A', x + o, 0.3, z)); [-0.45, 0.45].forEach(o => box(c, 0.8, 0.1, 0.55, '#7A8AAA', x + o, 0.45, z + 0.05)); c.block(x - 1, x + 1, z - 0.42, z + 0.4, 'deco'); c.inter(x, z + 0.9, 1.2, '在沙發上坐一下', () => R.townTalk('布沙發', [pick(['整個人陷進去了。', '靠墊的形狀剛好。', '差一點就睡著了。', '遠遠聽到樓下在炒菜。'])])); } },
    lowtable: { name: '和式矮桌', price: 1800, place: 'home', t: 'floor', size: 2, desc: '可以放茶杯和看到一半的書。',
      draw: (c, x, z) => { box(c, 1.2, 0.06, 0.8, '#8A5A34', x, 0.36, z); [[-0.52, -0.32], [0.52, -0.32], [-0.52, 0.32], [0.52, 0.32]].forEach(([a, b]) => box(c, 0.07, 0.33, 0.07, '#6A4428', x + a, 0.17, z + b)); c.mesh(new c.TH.CylinderGeometry(0.05, 0.04, 0.08, 8), '#E8E0D0', x + 0.25, 0.43, z); box(c, 0.3, 0.03, 0.22, '#C83A3A', x - 0.25, 0.41, z + 0.05); c.block(x - 0.6, x + 0.6, z - 0.4, z + 0.4, 'deco'); } },
    bookshelf: { name: '書架', price: 3600, place: 'home', t: 'nwall', desc: '可以翻書。書是舊書店一箱一箱買的。',
      draw: (c, x, z) => { box(c, 1.4, 1.9, 0.35, '#6A4A30', x, 0.95, z + 0.05); const cols = ['#8A2A2A', '#2A4A6A', '#3A5A2A', '#C8A040', '#5A3A6A', '#E8E0D0']; [0.25, 0.85, 1.45].forEach((y, r) => { box(c, 1.3, 0.03, 0.3, '#4A3424', x, y - 0.02, z + 0.08); for (let i = 0; i < 7; i++) box(c, 0.12, 0.38 + ((i * 7 + r * 3) % 4) * 0.04, 0.24, cols[(i + r * 2) % cols.length], x - 0.55 + i * 0.17, y + 0.2, z + 0.09); }); c.block(x - 0.7, x + 0.7, z - 0.15, z + 0.25, 'deco'); c.inter(x, z + 1.0, 1.2, '翻書架上的書', () => R.townTalk('書架', [pick(BOOKS)])); } },
    aquarium: { name: '魚缸', price: 6800, place: 'home', t: 'nwall', desc: '兩條金魚。名字還沒取。',
      draw: (c, x, z) => { box(c, 1.3, 0.7, 0.5, '#3A3A40', x, 0.35, z + 0.1); const g = box(c, 1.2, 0.62, 0.42, new c.TH.MeshLambertMaterial({ color: '#7ACFE8', transparent: true, opacity: 0.42 }), x, 1.03, z + 0.1); g.castShadow = false; box(c, 1.16, 0.08, 0.38, '#C8B888', x, 0.76, z + 0.1); [[-0.25, 1.0, '#FF8A2A'], [0.2, 1.12, '#F2F2F2']].forEach(([a, y, col]) => { box(c, 0.12, 0.06, 0.04, col, x + a, y, z + 0.12); box(c, 0.05, 0.08, 0.02, col, x + a - 0.08, y, z + 0.12); }); c.mesh(new c.TH.ConeGeometry(0.05, 0.3, 5), '#3A8A4A', x + 0.4, 0.95, z + 0.05); c.lamp(x, 1.5, z + 0.5, '#9AE0FF', 0.25, 3); c.block(x - 0.65, x + 0.65, z - 0.15, z + 0.35, 'deco'); c.inter(x, z + 1.0, 1.2, '看魚缸', () => R.townTalk('魚缸', [pick(['金魚游過來，以為你要餵牠。', '白色的那條一直躲在水草後面。', '水好像該換了。'])])); } },
    shrine: { name: '神棚', price: 3000, place: 'home', t: 'wwall', desc: '掛在牆上的小神社。每天拜一拜。',
      draw: (c, x, z) => { box(c, 0.45, 0.06, 1.1, '#C8A878', x + 0.22, 1.9, z); box(c, 0.32, 0.36, 0.5, '#E8D8B0', x + 0.2, 2.12, z); box(c, 0.4, 0.06, 0.62, '#5A4030', x + 0.22, 2.33, z); box(c, 0.02, 0.18, 0.12, '#F2F2F2', x + 0.37, 2.1, z); [-0.38, 0.38].forEach(o => c.mesh(new c.TH.CylinderGeometry(0.04, 0.05, 0.16, 6), '#3A7A3A', x + 0.2, 2.0, z + o)); c.inter(x + 1.2, z, 1.3, '拜神棚', () => daily('shrine', ['拍了兩下手。', pick(['「今天也平安回來。」', '「希望寶箱裡是好東西。」', '「希望阿杏的考試順利。」'])], { aware: -0.05 }, 'shrine')); } },
    painting: { name: '雪景的掛畫', price: 2200, place: 'home', t: 'wwall', desc: '冬天的東鶴港，畫家沒有署名。',
      draw: (c, x, z) => { box(c, 0.05, 0.8, 1.2, '#5A4030', x, 1.55, z); const p = box(c, 0.03, 0.66, 1.04, new c.TH.MeshBasicMaterial({ color: '#C8D8E8' }), x + 0.03, 1.55, z); p.castShadow = false; box(c, 0.02, 0.2, 1.0, '#4A6A8A', x + 0.05, 1.32, z); box(c, 0.02, 0.14, 0.3, '#E8F0F8', x + 0.05, 1.62, z - 0.2); box(c, 0.02, 0.2, 0.18, '#3A3A44', x + 0.05, 1.52, z + 0.25); c.inter(x + 1.1, z, 1.2, '看掛畫', () => R.townTalk('雪景的掛畫', ['冬天的東鶴港。遠遠的燈塔亮著。', '角落有一個小小的人影，看不出是誰。'])); } },
    rug: { name: '圓點地毯', price: 1500, place: 'home', t: 'rug', desc: '踩起來軟軟的。',
      draw: (c, x, z) => { const r = box(c, 2.4, 0.015, 1.6, '#B85A4A', x, 0.01, z); r.castShadow = false; [[0, -0.74, 2.4, 0.08], [0, 0.74, 2.4, 0.08]].forEach(([a, b, w, d]) => { const s = box(c, w, 0.018, d, '#E8D0A0', x + a, 0.012, z + b); s.castShadow = false; }); for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { const d = box(c, 0.12, 0.02, 0.12, '#E8D0A0', x - 0.95 + i * 0.38, 0.013, z - 0.4 + j * 0.4); d.castShadow = false; } } },
    floorlamp: { name: '落地燈', price: 1200, place: 'home', t: 'floor', size: 1, desc: '暖黃色的燈。晚上看書剛好。',
      draw: (c, x, z) => { c.mesh(new c.TH.CylinderGeometry(0.18, 0.2, 0.05, 10), '#3A3A40', x, 0.03, z); c.mesh(new c.TH.CylinderGeometry(0.025, 0.025, 1.4, 6), '#3A3A40', x, 0.72, z); c.mesh(new c.TH.CylinderGeometry(0.16, 0.24, 0.3, 10, 1, true), glow(c, '#FFE0A0', 0.6), x, 1.5, z); c.lamp(x, 1.4, z, '#FFD8A0', 0.45, 5); c.block(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 'deco'); } },
    bigplant: { name: '大盆栽', price: 900, place: 'any', t: 'floor', size: 1, desc: '一週澆一次水就好。',
      draw: (c, x, z) => { c.mesh(new c.TH.CylinderGeometry(0.22, 0.17, 0.4, 8), '#B86A4A', x, 0.2, z); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c.mesh(new c.TH.SphereGeometry(0.18, 6, 5), i % 2 ? '#3A7A3A' : '#4A8A4A', x + Math.cos(a) * 0.15, 0.62 + (i % 3) * 0.15, z + Math.sin(a) * 0.15); } c.block(x - 0.22, x + 0.22, z - 0.22, z + 0.22, 'deco'); } },
    radio: { name: '真空管收音機', price: 1600, place: 'home', t: 'floor', size: 1, desc: '只收得到兩個台。',
      draw: (c, x, z) => { box(c, 0.5, 0.5, 0.35, '#5A3A24', x, 0.25, z); box(c, 0.52, 0.08, 0.36, '#3A2414', x, 0.53, z); c.mesh(new c.TH.CylinderGeometry(0.12, 0.12, 0.02, 12), '#C8B080', x - 0.08, 0.3, z + 0.18).rotation.x = Math.PI / 2; box(c, 0.08, 0.08, 0.04, '#E8C04A', x + 0.15, 0.3, z + 0.18); c.block(x - 0.28, x + 0.28, z - 0.2, z + 0.2, 'deco'); c.inter(x, z + 0.8, 1.1, '開收音機', () => R.townTalk('收音機', [pick(['「……東鶴港的漁獲量今年回升……」', '「……接下來點播的是〈雪夜的渡口〉……」', '「……遺跡警報：北州一帶的勇者請注意……」', '沙沙沙沙。轉了一圈只有雜音。'])])); } },
    dumbbell: { name: '啞鈴架', price: 1400, place: 'home', t: 'floor', size: 1, desc: '一天練一次。',
      draw: (c, x, z) => { box(c, 0.5, 0.5, 0.3, '#3A3A40', x, 0.25, z); [0.32, 0.52].forEach(y => { box(c, 0.36, 0.04, 0.04, '#8A8A92', x, y, z + 0.05); [-0.17, 0.17].forEach(o => c.mesh(new c.TH.CylinderGeometry(0.06, 0.06, 0.06, 8), '#2A2A30', x + o, y, z + 0.05).rotation.z = Math.PI / 2); }); c.block(x - 0.28, x + 0.28, z - 0.18, z + 0.18, 'deco'); c.inter(x, z + 0.8, 1.1, '舉啞鈴', () => daily('dumbbell', ['一、二、三……二十。', pick(['手臂明天會痠。', '流了一身汗，心情好多了。'])], { hp: 0.02 }, 'dumbbell')); } },
    cattower: { name: '貓跳台', price: 2600, place: 'home', t: 'floor', size: 2, desc: '家裡沒有貓。小同伴們很喜歡。',
      draw: (c, x, z) => { box(c, 1.0, 0.08, 0.7, '#C8B090', x, 0.04, z); [[-0.3, 0.6], [0.3, 1.1]].forEach(([o, h]) => { c.mesh(new c.TH.CylinderGeometry(0.07, 0.07, h, 8), '#D8C8A0', x + o, h / 2, z); box(c, 0.5, 0.06, 0.45, '#A86A4A', x + o, h + 0.03, z); }); box(c, 0.4, 0.3, 0.35, '#A86A4A', x - 0.3, 0.2, z); c.block(x - 0.5, x + 0.5, z - 0.35, z + 0.35, 'deco'); c.inter(x, z + 0.9, 1.1, '看看貓跳台', () => R.townTalk('貓跳台', [S().petOut ? '跟著你的小同伴跳上最高的那一層，不下來了。' : '最上面那層有一撮毛。是誰的？'])); } },
    // ---- 花園 ----
    lantern: { name: '石燈籠', price: 2400, place: 'garden', t: 'floor', size: 1, desc: '晚上會點起來。',
      draw: (c, x, z) => { box(c, 0.5, 0.15, 0.5, '#8A8A84', x, 0.08, z); c.mesh(new c.TH.CylinderGeometry(0.09, 0.11, 0.6, 6), '#9A9A94', x, 0.45, z); box(c, 0.4, 0.3, 0.4, glow(c, '#FFE8A0', 0.5), x, 0.9, z); c.mesh(new c.TH.ConeGeometry(0.42, 0.28, 4), '#8A8A84', x, 1.2, z).rotation.y = Math.PI / 4; c.lamp(x, 1.0, z, '#FFD890', 0.4, 4); c.block(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 'deco'); } },
    swing: { name: '鞦韆', price: 5200, place: 'garden', t: 'floor', size: 3, desc: '大人坐也不會壞。',
      draw: (c, x, z) => { [-1.0, 1.0].forEach(o => { const a = box(c, 0.1, 2.0, 0.1, '#6A4A30', x + o, 1.0, z - 0.3); a.rotation.x = 0.18; const b = box(c, 0.1, 2.0, 0.1, '#6A4A30', x + o, 1.0, z + 0.3); b.rotation.x = -0.18; }); box(c, 2.2, 0.1, 0.1, '#6A4A30', x, 1.96, z); [-0.3, 0.3].forEach(o => box(c, 0.02, 1.3, 0.02, '#C8C0B0', x + o, 1.3, z)); box(c, 0.75, 0.06, 0.3, '#A86A4A', x, 0.62, z); c.block(x - 1.1, x - 0.9, z - 0.5, z + 0.5, 'deco'); c.block(x + 0.9, x + 1.1, z - 0.5, z + 0.5, 'deco'); c.inter(x, z + 0.9, 1.2, '盪鞦韆', () => R.townTalk('鞦韆', [pick(['盪到最高的時候，看得到圍牆外面的屋頂。', '鐵鍊吱吱地響。', '小時候好像也盪過。'])])); } },
    pethouse: { name: '小同伴的小屋', price: 3200, place: 'garden', t: 'floor', size: 2, desc: '下雨的時候小同伴會躲進去。',
      draw: (c, x, z) => { box(c, 1.0, 0.7, 0.9, '#C8A070', x, 0.35, z); c.mesh(new c.TH.ConeGeometry(0.85, 0.5, 4), '#A84A3A', x, 0.95, z).rotation.y = Math.PI / 4; box(c, 0.4, 0.42, 0.02, '#2A1C14', x, 0.24, z + 0.46); c.block(x - 0.5, x + 0.5, z - 0.45, z + 0.45, 'deco'); c.inter(x, z + 1.0, 1.2, '看看小屋', () => R.townTalk('小屋', [Object.keys(S().pets || {}).length ? '裡面鋪的毛巾被睡出了一個圓圓的凹洞。' : '還沒有誰住進來。'])); } },
    bbq: { name: '烤肉架', price: 2800, place: 'garden', t: 'floor', size: 2, desc: '一天烤一次，當天下遺跡有力氣。',
      draw: (c, x, z) => { [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]].forEach(([a, b]) => box(c, 0.05, 0.7, 0.05, '#3A3A40', x + a, 0.35, z + b)); box(c, 1.0, 0.18, 0.5, '#2A2A30', x, 0.75, z); box(c, 0.9, 0.04, 0.42, glow(c, '#FF6A2A', 0.7), x, 0.83, z); for (let i = 0; i < 6; i++) box(c, 0.02, 0.02, 0.44, '#8A8A92', x - 0.4 + i * 0.16, 0.87, z); c.block(x - 0.55, x + 0.55, z - 0.3, z + 0.3, 'deco'); c.inter(x, z + 0.9, 1.2, '烤肉', () => daily('bbq', ['炭火劈哩啪啦。', pick(['烤了土鎧豬的肉——不是，是市場買的豬肉。', '烤了兩串香菇，一串給了隔壁的小孩。'])], { dmg: 0.03 }, 'bbq')); } },
    picnic: { name: '格子野餐墊', price: 1200, place: 'garden', t: 'rug', desc: '紅白格子。',
      draw: (c, x, z) => { for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const m = box(c, 0.4, 0.015, 0.4, (i + j) % 2 ? '#E8E0D0' : '#C83A3A', x - 1.0 + i * 0.4, 0.01, z - 0.6 + j * 0.4); m.castShadow = false; } box(c, 0.4, 0.25, 0.28, '#A87A4A', x + 0.7, 0.14, z - 0.3); } },
    windchime: { name: '風鈴架', price: 800, place: 'any', t: 'floor', size: 1, desc: '有風的時候叮叮響。',
      draw: (c, x, z) => { box(c, 0.06, 1.6, 0.06, '#6A4A30', x, 0.8, z); box(c, 0.5, 0.05, 0.05, '#6A4A30', x + 0.22, 1.58, z); c.mesh(new c.TH.SphereGeometry(0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new c.TH.MeshLambertMaterial({ color: '#BFE4FF', transparent: true, opacity: 0.7 }), x + 0.42, 1.38, z); box(c, 0.08, 0.2, 0.01, '#F2F2F2', x + 0.42, 1.18, z); c.block(x - 0.1, x + 0.1, z - 0.1, z + 0.1, 'deco'); c.inter(x + 0.3, z + 0.7, 1.0, '碰一下風鈴', () => { R.sfx && R.sfx('ui'); R.townTalk('風鈴', ['叮——']); }); } },
    hammock: { name: '吊床', price: 4500, place: 'garden', t: 'floor', size: 3, desc: '躺上去就不想起來。',
      draw: (c, x, z) => { [-1.05, 1.05].forEach(o => box(c, 0.12, 1.4, 0.12, '#6A4A30', x + o, 0.7, z)); for (let i = 0; i < 7; i++) { const t = i / 6, y = 1.05 - Math.sin(t * Math.PI) * 0.4; box(c, 0.3, 0.04, 0.7, i % 2 ? '#E8C86A' : '#4A8A8A', x - 0.9 + t * 1.8, y, z); } c.block(x - 1.15, x - 0.95, z - 0.1, z + 0.1, 'deco'); c.block(x + 0.95, x + 1.15, z - 0.1, z + 0.1, 'deco'); c.inter(x, z + 0.9, 1.2, '躺上吊床', () => daily('hammock', ['搖啊搖。', '雲從圍牆上面慢慢飄過去。'], { regen: 0.2 }, 'hammock')); } },
    snowman: { name: '雪人', price: 300, place: 'garden', t: 'floor', size: 1, desc: '管理員幫忙堆的。春天就沒了（其實不會）。',
      draw: (c, x, z) => { c.mesh(new c.TH.SphereGeometry(0.32, 10, 8), '#F4F8FC', x, 0.3, z); c.mesh(new c.TH.SphereGeometry(0.22, 10, 8), '#F4F8FC', x, 0.78, z); c.mesh(new c.TH.ConeGeometry(0.04, 0.18, 6), '#E8823A', x, 0.8, z + 0.25).rotation.x = Math.PI / 2; [-0.07, 0.07].forEach(o => c.mesh(new c.TH.SphereGeometry(0.025, 5, 4), '#1A1714', x + o, 0.86, z + 0.19)); box(c, 0.5, 0.06, 0.08, '#C83A3A', x, 0.6, z + 0.08); c.block(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 'deco'); } },
    sakura: { name: '櫻花樹（盆植）', price: 6000, place: 'garden', t: 'floor', size: 3, desc: '一年四季都開著。園藝店說是遺跡裡帶出來的品種。',
      draw: (c, x, z) => { c.mesh(new c.TH.CylinderGeometry(0.5, 0.4, 0.4, 10), '#8A6A4A', x, 0.2, z); c.mesh(new c.TH.CylinderGeometry(0.1, 0.16, 1.4, 6), '#5A3A2A', x, 1.0, z); [[0, 1.9, 0, 0.6], [-0.5, 1.65, 0.1, 0.45], [0.5, 1.7, -0.1, 0.48], [0.1, 2.2, 0.2, 0.4]].forEach(([a, y, b, r]) => c.mesh(new c.TH.SphereGeometry(r, 8, 6), '#F2B8C8', x + a, y, z + b)); c.block(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 'deco'); c.inter(x, z + 1.0, 1.3, '看櫻花', () => R.townTalk('櫻花樹', [pick(['花瓣一片一片掉在小同伴頭上。', '冬天也開著。園藝店的老闆說不要問。'])])); } },
    flowerstand: { name: '盆花架', price: 900, place: 'any', t: 'floor', size: 1, desc: '三層，擺著季節的花。',
      draw: (c, x, z) => { [0.2, 0.45, 0.7].forEach((y, i) => { box(c, 0.6 - i * 0.12, 0.04, 0.3, '#8A6A44', x, y, z - i * 0.06); c.mesh(new c.TH.CylinderGeometry(0.07, 0.05, 0.12, 6), '#B86A4A', x, y + 0.08, z - i * 0.06); c.mesh(new c.TH.SphereGeometry(0.08, 6, 5), ['#E86A8A', '#F2D24A', '#8A6AE8'][i], x, y + 0.2, z - i * 0.06); }); box(c, 0.04, 0.72, 0.04, '#6A4A30', x - 0.3, 0.36, z); box(c, 0.04, 0.72, 0.04, '#6A4A30', x + 0.3, 0.36, z); c.block(x - 0.32, x + 0.32, z - 0.2, z + 0.18, 'deco'); } }
  };
  R.FURNITURE = FUR;
  const canPlace = (f, kind) => f.place === 'any' || f.place === kind;
  const placedCount = id => { const d = data(); let n = 0; ['home', 'garden'].forEach(k => Object.values(d.at[k]).forEach(v => { if (v === id) n++; })); return n; };
  const spare = id => (data().own[id] || 0) - placedCount(id);
  const autoPlace = (id, kind) => { const d = data(), f = FUR[id]; const sl = SLOTS[kind].find(s => !d.at[kind][s.id] && fits(s, f)); if (sl) { d.at[kind][sl.id] = id; return sl; } return null; };

  // ---------- 擺進屋子 ----------
  const furnish = (kind, c) => {
    if (!S()) return; const d = data();
    SLOTS[kind].forEach(sl => { const id = d.at[kind][sl.id], f = FUR[id]; if (!f || !fits(sl, f)) return; const [x, z] = sl.at(c); try { f.draw(c, x, z); } catch (e) { console.warn('[furniture]', id, e); } });
  };
  ['home', 'garden'].forEach(kind => {
    const f0 = FN[kind]; if (!f0) return;
    FN[kind] = c => { f0(c); furnish(kind, c); c.inter(kind === 'home' ? -1.6 : 1.4, c.HD - 0.8, 1.1, '家具型錄（郵購、擺設）', () => shop(kind)); };
  });
  const reenter = kind => { if (R.W.inside && R.W.inside.kind === kind && R.refreshInterior) R.refreshInterior(); };

  // ---------- 型錄 ----------
  const shop = (kind, tab) => {
    const s = S(), d = data(); tab = tab || 'buy';
    const where = kind === 'home' ? '302 室' : '中庭的小花園';
    const list = Object.keys(FUR).filter(id => canPlace(FUR[id], kind));
    const tabs = '<div class="row"><button type="button" class="btn' + (tab === 'buy' ? ' pri' : '') + '" data-fk="buy">型錄</button><button type="button" class="btn' + (tab === 'set' ? ' pri' : '') + '" data-fk="set">擺設</button></div>';
    let body = '';
    if (tab === 'buy') {
      body = '<p class="note">郵購，今天下訂今天送到；送到會自動擺在空著的位置。身上 ' + s.gold.toLocaleString() + ' 費拉。</p><div class="fu-list">'
        + list.map(id => { const f = FUR[id], own = d.own[id] || 0; return '<div class="fu-it"><b>' + esc(f.name) + '</b><small>' + esc(f.desc) + '</small><small class="fu-k">' + ({ floor: ['', '小・地上', '中・地上', '大・地上'][f.size], nwall: '靠牆', wwall: '掛牆上', rug: '鋪地上' })[f.t] + (f.place === 'any' ? '・家裡花園都能放' : '') + (own ? '・有 ' + own + ' 個' : '') + '</small><button type="button" class="btn gold" data-fbuy="' + id + '"' + (s.gold < f.price ? ' disabled' : '') + '>' + f.price.toLocaleString() + ' 費拉</button></div>'; }).join('') + '</div>';
    } else {
      body = '<p class="note">每個位置放一樣。換掉的家具收進儲藏室，之後可以再擺出來。</p><div class="fu-list">'
        + SLOTS[kind].map(sl => { const cur = d.at[kind][sl.id], opts = list.filter(id => fits(sl, FUR[id]) && (id === cur || spare(id) > 0));
          return '<div class="fu-it"><b>' + esc(sl.n) + '</b><small>' + ({ floor: ['', '放得下小的', '放得下中的以下', '什麼大小都放得下'][sl.max], nwall: '靠牆的家具', wwall: '掛在牆上的', rug: '地毯、墊子' })[sl.t] + '</small><select data-fslot="' + sl.id + '"><option value="">（空著）</option>' + opts.map(id => '<option value="' + id + '"' + (id === cur ? ' selected' : '') + '>' + esc(FUR[id].name) + '</option>').join('') + '</select></div>'; }).join('') + '</div>';
    }
    R.sheet('<p class="kicker">' + where + '</p><h2>家具型錄</h2>' + tabs + body, '<div class="row"><button type="button" class="btn" id="fu-x">好了</button></div>');
    const done = () => { R.closeSheet(); reenter(kind); };
    document.getElementById('fu-x').onclick = done;
    document.querySelectorAll('[data-fk]').forEach(b => { b.onclick = () => shop(kind, b.dataset.fk); });
    document.querySelectorAll('[data-fbuy]').forEach(b => { b.onclick = () => { const id = b.dataset.fbuy, f = FUR[id]; if (s.gold < f.price) return; s.gold -= f.price; d.own[id] = (d.own[id] || 0) + 1; const sl = autoPlace(id, kind); R.save && R.save(); R.sfx && R.sfx('coin'); R.toast && R.toast(f.name + (sl ? '送到了，擺在「' + sl.n + '」。' : '送到了。位置都滿了，先收在儲藏室（在「擺設」換）。'), '#E8C04A'); shop(kind, 'buy'); }; });
    document.querySelectorAll('[data-fslot]').forEach(sel => { sel.onchange = () => { const v = sel.value; if (v) d.at[kind][sel.dataset.fslot] = v; else delete d.at[kind][sel.dataset.fslot]; R.save && R.save(); shop(kind, 'set'); }; });
  };
  R.furnitureDebug = { SLOTS, shop, data };

  const css = document.createElement('style');
  css.textContent = '.fu-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-top:8px}'
    + '.fu-it{display:grid;gap:3px;align-content:start;background:var(--bg2);border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:8px;padding:8px 10px}'
    + '.fu-it b{font-family:var(--serif)}.fu-it small{color:var(--dim);font-size:12px}.fu-it .fu-k{color:#C8B88A}.fu-it .btn{justify-self:start;margin-top:4px}.fu-it select{margin-top:4px}';
  document.head.appendChild(css);
})(window.R);
