// 討伐令 1433：可以互動的建築都走得進去（作者：可以互動的建築的內部）
// interior.js 原本只有公會、鐵匠鋪、白藤堂、倉庫、驛站、赤提燈；這裡再加二十幾間，用共通的家具拼出來：
//  縣廳、衛兵詰所、銀行、醫院、郵局、日報社、劇場「東鶴座」、德克斯凡百貨、錢湯「松之湯」、東鶴寺、東鶴旅館、柏青哥、遊樂場、
//  便利商店、咖啡館、德克斯凡商行、魔導燈具・零件行、和菓子店、書店、定食屋、理髮店、寫真館、時計・眼鏡、家電行、內科診所、超市、望月家道場、東鶴站。
// 街上原本的互動改成「走進去」；原本做的事（說話、買東西、看戲、住一晚、打柏青哥……）移到裡面的櫃台、店員身上。
(function (R) {
  const W = R.W, PL = R.INTERIOR_PLACES, FN = R.INTERIOR_FURNISH = R.INTERIOR_FURNISH || {};
  if (!PL) return;
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const K = () => R.INTERIOR_KIT;
  const orig = {};   // 街上原本的動作（照 kind 存）
  const def = (kind, place, fn) => { PL[kind] = Object.assign({ zoom: 0.82, h: 3.8, out: '出去（回到街上）' }, place); FN[kind] = fn; };

  // ---------- 共通的家具 ----------
  const TOPS = ['#3A4A5A', '#5A3A3A', '#3A5A4A', '#6A5A3A', '#4A3A5A', '#7A6A5A', '#2E2E38', '#8A4A3A', '#3A6A8A'], HAIRS = ['#1A1410', '#2A2420', '#4A3424', '#6A4A2E', '#8A8A88', '#C8C0B0'];
  const look = o => Object.assign({ top: pick(TOPS), hair: pick(HAIRS), cloak: pick(TOPS) }, o || {});
  const counter = (c, x, z, w, o) => { o = o || {}; const { bx, block } = c, d = o.d || 0.9, ax = o.alongZ ? 0 : 1, sw = ax ? w : d, sd = ax ? d : w; bx(sw, 1.0, sd, o.col || '#6A4A30', x, 0.5, z); bx(sw + 0.2, 0.1, sd + 0.2, o.top || '#8A6A44', x, 1.05, z); block(x - sw / 2 - 0.1, x + sw / 2 + 0.1, z - sd / 2 - 0.1, z + sd / 2 + 0.1, 'desk'); };
  // 架子：alongX 沿 x 擺（靠北牆或在房間中間），face＝貨朝哪邊（+1 朝南、-1 朝北；沿 z 擺時 +1 朝東）
  const shelf = (c, x, z, w, o) => {
    o = o || {}; const { bx, block } = c, alongX = !o.alongZ, h = o.h || 2.0, d = o.d || 0.5, face = o.face || 1, cols = o.goods || ['#C83A3A', '#3A6ACF', '#E8C04A', '#5AA85A', '#E8E0D0', '#8A5ACF'];
    const sw = alongX ? w : d, sd = alongX ? d : w; bx(sw, h, sd, o.col || '#5A4A3A', x, h / 2, z);
    const rows = Math.max(2, Math.floor(h / 0.55)), n = Math.max(2, Math.floor(w / 0.36));
    for (let r = 0; r < rows; r++) { const y = 0.25 + r * (h - 0.3) / rows; bx(alongX ? w : 0.06, 0.04, alongX ? 0.06 : w, '#3A2E24', alongX ? x : x + face * d / 2, y, alongX ? z + face * d / 2 : z);
      for (let i = 0; i < n; i++) { if (rnd() < 0.18) continue; const t = -w / 2 + 0.2 + i * (w - 0.4) / (n - 1), gh = 0.16 + rnd() * 0.2; if (alongX) bx(0.22, gh, 0.18, pick(cols), x + t, y + gh / 2 + 0.03, z + face * (d / 2 - 0.1)); else bx(0.18, gh, 0.22, pick(cols), x + face * (d / 2 - 0.1), y + gh / 2 + 0.03, z + t); } }
    block(x - sw / 2, x + sw / 2, z - sd / 2, z + sd / 2, 'shelf');
  };
  const chair = (c, x, z, rot, col) => { const { bx, block } = c, sx = Math.sin(rot), sz = Math.cos(rot); bx(0.5, 0.08, 0.5, col || '#5A3E28', x, 0.46, z); bx(Math.abs(sz) > 0.5 ? 0.5 : 0.08, 0.5, Math.abs(sz) > 0.5 ? 0.08 : 0.5, col || '#5A3E28', x - sx * 0.22, 0.75, z - sz * 0.22); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bx(0.06, 0.44, 0.06, '#3A2A1C', x + a * 0.2, 0.22, z + b * 0.2)); block(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 'chair'); };
  const machine = (c, x, z, rot, col, scr) => { const { bx, block, lamp } = c, kit = K(); const sx = Math.sin(rot), sz = Math.cos(rot); bx(Math.abs(sz) > 0.5 ? 0.9 : 0.7, 1.7, Math.abs(sz) > 0.5 ? 0.7 : 0.9, col || '#3A3A48', x, 0.85, z); bx(Math.abs(sz) > 0.5 ? 0.66 : 0.04, 0.5, Math.abs(sz) > 0.5 ? 0.04 : 0.66, kit.lam(scr || '#7AE0FF', { em: scr || '#7AE0FF', ei: 0.9 }), x + sx * 0.36, 1.2, z + sz * 0.36); block(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 'deco'); };
  const bed = (c, x, z, alongX) => { const { bx, block } = c, w = alongX ? 2.0 : 0.95, d = alongX ? 0.95 : 2.0; bx(w, 0.45, d, '#C8C8D0', x, 0.25, z); bx(w - 0.1, 0.14, d - 0.1, '#F0F0F4', x, 0.55, z); bx(alongX ? 0.4 : 0.7, 0.12, alongX ? 0.7 : 0.4, '#FFFFFF', x + (alongX ? -w / 2 + 0.3 : 0), 0.66, z + (alongX ? 0 : -d / 2 + 0.3)); block(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 'bed'); };
  const rug = (c, x, z, w, d, col) => { const o = c.flat(w, d, col, x, 0.012, z); o.receiveShadow = true; return o; };
  const panel = (c, x, y, z, w, h, col, par, rotY) => { const o = c.bx(rotY ? 0.04 : w, h, rotY ? w : 0.04, col, x, y, z, par); o.castShadow = false; return o; };
  const plant = (c, x, z) => K().plantAt(c, x, z);
  const table = (c, x, z, w, d) => K().tableAt(c, x, z, w, d);
  const bench = (c, x, z, w, alongX) => K().benchAt(c, x, z, w, alongX);
  const talk = (who, lines) => K().talk(who, lines);
  const clerk = (c, x, z, rot, name, lk, label, act, r) => { const n = c.npc(x, z, rot, { name, look: look(lk) }); c.inter(x + Math.sin(rot) * 1.4, z + Math.cos(rot) * 1.4, r || 2.2, label, act); return n; };
  const guest = (c, x, z, rot, name, lines, lk) => { const n = c.npc(x, z, rot, { name, look: look(lk) }); c.inter(x, z + 0.9, 1.6, '和' + name + '說話', () => talk(name, [pick(lines)])); return n; };
  const run = kind => () => (orig[kind] ? orig[kind]() : null);

  // ---------- 縣廳 ----------
  def('pref', { name: '東鶴縣廳', sub: '一樓・服務大廳', hint: '「請抽號碼牌。」', w: 22, d: 14, h: 4.6, wall: '#B4AEA2', cap: '#6A665E', floor: ['#8A8478', 'floor'] }, c => {
    const { HW, HD, NW, sign, lamp } = c;
    counter(c, 0, -HD + 2.2, 16, { col: '#7A746A', top: '#C8C4BC' });
    [['戶籍・通行證', -5.5], ['服務台', 0], ['稅務・登記', 5.5]].forEach(([t, x], i) => { sign(x, 3.0, -HD + 0.35, 0, t, '#2E3A4A', NW.g); if (i === 1) clerk(c, x, -HD + 1.2, 0, '縣廳的職員', { top: '#3A4A5A', acc: 'glasses' }, '服務台：問事情', run('pref')); else guest(c, x, -HD + 1.2, 0, i ? '稅務窗口的職員' : '戶籍窗口的職員', i ? ['「遺跡帶回來的東西要不要報稅？……目前不用。」', '「下一位，請到三號窗口。」'] : ['「勇者證的地址變更也在這裡辦。」', '「從皇嶺搬來的人越來越多了。」'], { top: '#3A4A5A' }); });
    for (let r = 0; r < 3; r++) bench(c, -4, 1 + r * 1.8, 5, true), bench(c, 4, 1 + r * 1.8, 5, true);
    c.bx(0.6, 1.3, 0.5, '#C83A3A', -HW + 1.2, 0.65, -1); c.inter(-HW + 1.2, -0.2, 1.5, '號碼牌機', () => R.toast('抽到 ' + (100 + Math.floor(rnd() * 80)) + ' 號。前面還有好多人。'));
    panel(c, HW - 0.32, 2.0, 0, 5, 2.2, '#E8E0C8', c.EW.g, true); c.inter(HW - 1.2, 0, 1.8, '看公告欄', () => talk('公告欄', ['「冬季道路除雪時間表」', '「遺跡入口周邊禁止擺攤（違者罰款）」', '「東鶴神社・新年參拜交通管制」']));
    guest(c, 6, 3, Math.PI, '等號碼的老人家', ['「排了一個鐘頭了……」', '「以前縣廳在舊城裡，現在搬到這麼大的樓。」']);
    plant(c, -HW + 0.8, HD - 0.8); plant(c, HW - 0.8, HD - 0.8); lamp(0, 3.8, 0, '#FFF0D8', 0.9, 14); lamp(0, 3.6, -4, '#FFF0D8', 0.6, 10);
  });
  // ---------- 衛兵詰所 ----------
  def('guardhq', { name: '東鶴衛兵詰所', sub: '值班室・拘留室', hint: '「有什麼事？」', w: 16, d: 12, wall: '#8E8A80', cap: '#4A4A50', floor: ['#5A5A62', 'floor'] }, c => {
    const { HW, HD, bx, block, lamp } = c;
    counter(c, -1, -1.2, 7, { col: '#4A4A52', top: '#6A6A72' });
    clerk(c, -1, -2.4, 0, '值班的衛兵', { top: '#3E4A5A', cloak: '#2E3A48' }, '值班台：報案、問事情', run('guardhq'));
    // 拘留室（東北角，鐵欄杆）
    for (let i = 0; i < 9; i++) bx(0.08, 2.6, 0.08, '#2A2A30', HW - 4.6 + i * 0.5, 1.3, -HD + 3.6); bx(4.6, 0.1, 0.1, '#2A2A30', HW - 2.4, 2.6, -HD + 3.6); block(HW - 4.8, HW, -HD + 3.5, -HD + 3.7, 'wall');
    bed(c, HW - 1.4, -HD + 1.4, true); c.inter(HW - 2.4, -HD + 4.4, 1.8, '看拘留室', () => talk('拘留室', R.S && R.S.caughtN ? ['……你對這張床很熟。', '牆上有人刻了一行字：「下次要戴兜帽。」'] : ['空的。一張硬板床、一個水桶。']));
    // 通緝告示、兵器架、置物櫃
    c.bx(3, 1.8, 0.05, '#E8E0C8', -HW + 2, 1.8, -HD + 0.35, c.NW.g); c.inter(-HW + 2, -HD + 1.4, 1.8, '看通緝告示', () => { const h = R.crime ? R.crime.heat : 0, w = R.S && R.S.wary ? R.S.wary.v : 0; talk('通緝告示', [h > 0 ? '最上面一張的畫像……有點像你。（通緝 ' + '★'.repeat(h) + '）' : '「西市口竊案，提供線索者有賞」', w >= 4 ? '告示越貼越多。衛兵說最近竊案太多了。' : '「尋人：湯山村的老太太走失了。」']); });
    for (let i = 0; i < 4; i++) bx(0.12, 1.8, 0.12, '#5A4A3A', -HW + 0.5, 0.9, 1 + i * 0.6), bx(0.04, 1.6, 0.04, '#C8C8D0', -HW + 0.62, 1.5, 1 + i * 0.6);
    block(-HW, -HW + 0.8, 0.6, 3.2, 'deco');
    for (let i = 0; i < 4; i++) bx(0.8, 2.0, 0.5, '#6A7078', 2 + i * 0.85, 1.0, HD - 0.5); block(1.6, 5.4, HD - 0.8, HD, 'shelf');
    table(c, -4, 2.8, 2, 1.2); chair(c, -4, 3.9, Math.PI);
    guest(c, -4, 1.8, 0, '休息的衛兵', ['「巡邏完腳都凍僵了。」', '「最近竊案多，連休假都被叫回來。」'], { top: '#3E4A5A' });
    lamp(0, 3.2, 0, '#E8F0FF', 0.8, 12);
  });
  // ---------- 銀行 ----------
  def('bank', { name: '世界中央銀行・東鶴分行', sub: '營業大廳', hint: '大理石的地板擦得發亮', w: 20, d: 14, h: 5, wall: '#D8D4CC', cap: '#8A8478', floor: ['#C8C4BC', 'floor'] }, c => {
    const { HW, HD, bx, block, lamp, mesh, TH } = c;
    counter(c, 0, -HD + 3, 14, { col: '#5A4A3A', top: '#3A3A42' });
    for (let i = 0; i < 4; i++) { const x = -5.25 + i * 3.5; const g = bx(2.8, 1.2, 0.04, K().lam('#BFE0F0', { em: '#4A7A9A', ei: 0.2 }), x, 1.75, -HD + 3); g.material.transparent = true; g.material.opacity = 0.35; }
    clerk(c, -1.75, -HD + 2, 0, '櫃員', { top: '#2E3A4A', acc: 'glasses' }, '櫃台：存提、兌換、問事情', run('bank'));
    guest(c, 1.75, -HD + 2, 0, '隔壁窗口的櫃員', ['「赤金請到兌換所驗。我們這裡只收費拉。」', '「費拉是世界央行發行的，哪一國都通用。」'], { top: '#2E3A4A' });
    mesh(new TH.CylinderGeometry(1.4, 1.4, 0.3, 20), '#8A8C92', HW - 2.2, 1.6, -HD + 0.5).rotation.x = Math.PI / 2; c.inter(HW - 2.2, -HD + 2.2, 1.8, '看金庫的門', () => talk('金庫', ['圓形的鋼門，比人還高。旁邊的衛兵瞪了你一眼。']));
    guest(c, HW - 3.6, -HD + 2.6, 0, '金庫前的警衛', ['「別靠太近。」'], { top: '#3E4A5A' });
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) chair(c, -4 + i * 1.1, 2 + r * 1.6, Math.PI);
    plant(c, -HW + 0.8, -HD + 0.8); plant(c, HW - 0.8, HD - 0.8); rug(c, 0, HD - 2, 3, 2.5, '#7A2A2A');
    lamp(0, 4.2, -1, '#FFF4E0', 1.0, 15);
  });
  // ---------- 醫院 ----------
  def('hospital', { name: '東鶴醫院', sub: '掛號・候診・病房', hint: '消毒水的味道', w: 22, d: 14, wall: '#E8ECEC', cap: '#9AA4A8', floor: ['#C8D0D0', 'floor'] }, c => {
    const { HW, HD, bx, block, lamp, part } = c;
    counter(c, -5, -HD + 2.2, 6, { col: '#E0E4E4', top: '#B8C4C8' });
    clerk(c, -5, -HD + 1.2, 0, '掛號處的護理師', { top: '#F0F4F4', hair: '#2A2420' }, '掛號處', run('hospital'));
    for (let r = 0; r < 3; r++) bench(c, -5, 0.5 + r * 1.7, 5, true);
    part(false, 2, -HD, HD - 3, [[-2, 0]]);
    for (let i = 0; i < 3; i++) { bed(c, HW - 1.4, -HD + 1.6 + i * 3, true); bx(0.04, 2.0, 2.4, '#C8E0E8', HW - 3, 1.0, -HD + 1.6 + i * 3).material.color.set('#C8E0E8'); }
    guest(c, 5, -1, -Math.PI / 2, '值班的醫生', ['「從遺跡抬回來的勇者，大多是凍傷和骨折。」', '「回復藥是好東西，但別把它當飯吃。」'], { top: '#F4F4F0', acc: 'glasses' });
    guest(c, -2, 3, Math.PI, '候診的人', ['「咳……這個冬天特別冷。」', '「掛號排了好久。」']);
    plant(c, -HW + 0.8, HD - 0.8); lamp(-4, 3.2, 0, '#F0FAFF', 0.9, 12); lamp(6, 3.2, -2, '#F0FAFF', 0.7, 10);
  });
  // ---------- 郵局 ----------
  def('post', { name: '東鶴郵局', sub: '郵務窗口', hint: '「郵票一張 1 費拉。」', w: 16, d: 10, wall: '#E8E0D0', cap: '#8A3A3A', floor: ['#8A8478', 'floor'] }, c => {
    const { HW, HD, bx, block, lamp } = c;
    counter(c, 0, -HD + 2.2, 10, { col: '#8A3A3A', top: '#C8C0B0' });
    clerk(c, -2, -HD + 1.2, 0, '郵局的窗口', { top: '#2E4A3A' }, '郵務窗口', run('post'));
    for (let r = 0; r < 4; r++) for (let i = 0; i < 8; i++) bx(0.5, 0.4, 0.4, (r + i) % 3 ? '#6A5A4A' : '#5A4A3A', -HW + 0.8 + i * 0.55, 0.5 + r * 0.45, -HD + 0.35);
    block(-HW, -HW + 4.8, -HD, -HD + 0.6, 'shelf');
    for (let i = 0; i < 5; i++) bx(0.6 + rnd() * 0.4, 0.4 + rnd() * 0.3, 0.5, pick(['#A88A5A', '#8A6A44', '#C8A878']), HW - 1.2 - (i % 2) * 0.7, 0.25 + Math.floor(i / 2) * 0.45, -HD + 1 + (i % 3) * 0.6);
    block(HW - 2, HW, -HD, -HD + 2.6, 'deco');
    bx(0.6, 1.4, 0.6, '#C83A3A', HW - 1, 0.7, HD - 1); block(HW - 1.3, HW - 0.7, HD - 1.3, HD - 0.7, 'deco');
    guest(c, 3, 1, Math.PI, '寄包裹的太太', ['「寄到皇嶺的包裹要三天。」', '「女兒在皇嶺念書，寄點年糕過去。」']);
    table(c, -4, 2, 2, 1); lamp(0, 3.0, 0, '#FFF0D8', 0.8, 11);
  });
  // ---------- 日報社 ----------
  def('paper', { name: '東鶴日報社', sub: '編輯部・印刷間', hint: '打字機的聲音此起彼落', w: 18, d: 12, wall: '#D8D0C0', cap: '#4A4A52', floor: ['#6A6058', 'floor'] }, c => {
    const { HW, HD, bx, block, lamp, part } = c;
    counter(c, 0, HD - 3, 6, { col: '#5A5048' });
    clerk(c, 0, HD - 4, 0, '日報社的接待', { top: '#4A4A52' }, '櫃台：今天的瓦版', () => (R.newsSheet ? R.newsSheet() : run('paper')()));
    for (let i = 0; i < 4; i++) { const x = -HW + 2 + (i % 2) * 3, z = -2 + Math.floor(i / 2) * 2.4; table(c, x, z, 1.8, 1); bx(0.5, 0.25, 0.4, '#2A2A30', x, 1.05, z); chair(c, x, z + 0.9, Math.PI); }
    guest(c, -HW + 2, -1.1, Math.PI, '記者', ['「遺跡的新聞最好賣。你有沒有什麼消息？」', '「縣廳的預算案又延了。」'], { acc: 'glasses' });
    part(false, 2.5, -HD, HD - 4.5, [[-1, 1]]);
    bx(3.4, 1.8, 2.2, '#3A3A42', HW - 2.6, 0.9, -HD + 2); bx(3.6, 0.3, 0.3, '#8A8A92', HW - 2.6, 1.9, -HD + 3); block(HW - 4.4, HW - 0.8, -HD + 0.8, -HD + 3.2, 'deco');
    for (let i = 0; i < 6; i++) bx(1.0, 0.2, 0.7, '#E8E4D8', HW - 1.6, 0.1 + i * 0.2, HD - 2); block(HW - 2.2, HW - 1, HD - 2.4, HD - 1.6, 'deco');
    c.inter(HW - 2.6, -HD + 3.6, 1.8, '看印刷機', () => talk('印刷間', ['滾筒還是熱的。明天的瓦版剛印好一疊。', '「夜班印好、清晨送出去。東鶴的人早餐配瓦版。」']));
    lamp(-3, 3.0, 0, '#FFF0D0', 0.8, 11); lamp(5, 3.0, -2, '#FFE0B0', 0.6, 9);
  });
  // ---------- 劇場 ----------
  def('theater', { name: '劇場「東鶴座」', sub: '觀眾席・舞台', hint: '紅色的布幕還沒拉開', w: 24, d: 18, h: 6, zoom: 0.92, wall: '#5A2A2A', cap: '#2A1A1A', floor: ['#4A2E22', 'planks'] }, c => {
    const { HW, HD, bx, block, lamp } = c;
    bx(18, 1.0, 5, '#6A4A30', 0, 0.5, -HD + 2.5); block(-9, 9, -HD, -HD + 5, 'stage');
    bx(18, 5, 0.3, '#8A1A2A', 0, 3.5, -HD + 0.4); [-7.5, 7.5].forEach(x => bx(3, 5, 0.5, '#A82A3A', x, 3.5, -HD + 0.8));
    for (let r = 0; r < 6; r++) [-1, 1].forEach(sd => { const z = -HD + 7 + r * 1.4, cx = sd * 4.75; bx(7.5, 0.45, 0.6, '#8A2A3A', cx, 0.45, z); bx(7.5, 0.6, 0.12, '#6A1A2A', cx, 0.9, z + 0.3); for (let k = 0; k <= 5; k++) bx(0.08, 0.3, 0.6, '#4A2A1A', cx - 3.75 + k * 1.5, 0.75, z); block(cx - 3.75, cx + 3.75, z - 0.3, z + 0.36, 'chair'); });
    for (let k = 0; k < 6; k++) { const x = -8 + Math.floor(rnd() * 9) * 2, z = -HD + 7 + Math.floor(rnd() * 6) * 1.4; if (Math.abs(x) < 1) continue; c.npc(x, z, Math.PI, { name: '觀眾', look: look() }); }
    clerk(c, -HW + 2.5, HD - 2, Math.PI / 2, '帶位的人', { top: '#5A2A2A' }, '問今天的戲碼', run('theater'));
    c.inter(0, -HD + 6, 2.4, '看舞台', () => talk('東鶴座', [pick(['布幕後面傳來三味線調音的聲音。', '今天的戲是《雪夜的渡口》。聽說最後一幕會讓人哭。', '舞台的木板被踩得發亮，有幾十年的歷史了。'])]));
    lamp(0, 5, -HD + 3, '#FFE0A0', 1.4, 16); lamp(0, 5, 2, '#FFD8A0', 0.4, 14);
  });
  // ---------- 百貨公司 ----------
  def('dept', { name: '德克斯凡百貨', sub: '一樓・化妝品與雜貨', hint: '「歡迎光臨。」電梯小姐鞠了一個躬', w: 26, d: 16, h: 4.6, zoom: 0.9, wall: '#E8E4DC', cap: '#B8A87A', floor: ['#D8D0C0', 'floor'] }, c => {
    const { HW, HD, bx, block, lamp } = c;
    for (let i = 0; i < 4; i++) { const x = -8 + (i % 2) * 6, z = -2 + Math.floor(i / 2) * 4.5; counter(c, x, z, 3.6, { col: '#F0ECE4', top: '#BFE0F0' }); for (let k = 0; k < 5; k++) bx(0.2, 0.25, 0.2, pick(['#E85A8A', '#F2C84A', '#7AE0FF', '#C8A0FF']), x - 1.4 + k * 0.7, 1.22, z); c.npc(x, z - 0.9, 0, { name: '專櫃小姐', look: look({ top: '#E8E0F0' }) }); }
    c.bx(2.4, 3.2, 0.3, '#B8A87A', HW - 3, 1.6, -HD + 0.3); c.bx(1.0, 2.6, 0.06, '#C8C8D0', HW - 3.5, 1.3, -HD + 0.48); c.bx(1.0, 2.6, 0.06, '#C8C8D0', HW - 2.5, 1.3, -HD + 0.48);
    clerk(c, HW - 5, -HD + 1.2, 0, '電梯小姐', { top: '#C83A3A' }, '搭電梯（樓層介紹、買東西、屋頂遊樂園）', run('dept'));
    c.bx(3, 2, 0.06, '#2E3A4A', -HW + 3, 2, -HD + 0.35, c.NW.g); c.inter(-HW + 3, -HD + 1.4, 1.8, '看樓層介紹', () => talk('樓層介紹', ['頂樓：屋頂遊樂園', '六樓：食堂・特賣會場', '四、五樓：德克斯凡家電', '二、三樓：服飾', '一樓：化妝品・雜貨・手帕']));
    for (let i = 0; i < 2; i++) { bx(0.5, 1.8, 0.4, '#E8E0D0', HW - 2, 0.9 + 0, 2 + i * 2); bx(0.7, 0.8, 0.5, pick(['#C83A3A', '#3A5A8A']), HW - 2, 1.2, 2 + i * 2); }
    guest(c, 2, 3.5, Math.PI, '逛街的太太', ['「歲末大特賣，手帕三條一費拉。」', '「頂樓的摩天輪，小孩一直吵著要坐。」']);
    lamp(-4, 3.8, 0, '#FFF8E8', 1.0, 14); lamp(6, 3.8, 0, '#FFF8E8', 0.8, 12);
  });
  // ---------- 錢湯 ----------
  def('bath', { name: '錢湯「松之湯」', sub: '番台・脫衣場・浴場', hint: '暖簾後面冒著熱氣', w: 20, d: 14, h: 4.4, wall: '#E8E0D0', cap: '#3A5A7A', floor: ['#8A7A64', 'planks'] }, c => {
    const { HW, HD, bx, block, lamp, part, flat } = c;
    bx(1.6, 1.4, 1.6, '#6A4A30', 0, 0.7, HD - 3); block(-0.8, 0.8, HD - 3.8, HD - 2.2, 'desk');
    clerk(c, 0, HD - 3, Math.PI, '番台的阿婆', { top: '#5A4A6A', hair: '#C8C0B0' }, '番台：泡澡', run('bath'));
    for (let i = 0; i < 10; i++) bx(0.5, 0.45, 0.45, '#8A6A44', -HW + 0.6 + (i % 5) * 0.55, 0.3 + Math.floor(i / 5) * 0.5, HD - 0.4); block(-HW, -HW + 3, HD - 0.7, HD, 'shelf');
    for (let i = 0; i < 6; i++) bx(0.6, 1.8, 0.5, '#9A8A6A', HW - 0.4, 0.9, HD - 1 - i * 0.65); block(HW - 0.7, HW, HD - 5, HD - 0.6, 'shelf');
    bx(0.8, 1.6, 0.6, '#E8F0F8', HW - 2.2, 0.8, HD - 1); const glow = bx(0.6, 1.0, 0.04, K().lam('#FFFFFF', { em: '#DDEEFF', ei: 0.6 }), HW - 2.2, 1.0, HD - 1.32); glow.castShadow = false; block(HW - 2.6, HW - 1.8, HD - 1.3, HD - 0.7, 'deco');
    c.inter(HW - 2.2, HD - 2.2, 1.6, '冰箱：咖啡牛奶（3 費拉）', () => { if (R.S.gold < 3) { R.toast('錢不夠。'); return; } R.S.gold -= 3; R.save(); talk('松之湯', ['冰涼的咖啡牛奶，一口氣喝完。', '（手要插在腰上喝。這是規矩。）']); });
    part(true, -1, -HW, HW, [[-1.5, 1.5]]);
    bx(14, 0.5, 4.6, '#6A9AB8', 0, 0.25, -HD + 3); const water = flat(13.4, 4.0, K().lam('#7FC8E8', { em: '#3A7AA8', ei: 0.25 }), 0, 0.52, -HD + 3); water.material.transparent = true; water.material.opacity = 0.85; block(-7, 7, -HD + 0.6, -HD + 5.4, 'deco');
    bx(16, 3.2, 0.05, '#7AA8D8', 0, 2.6, -HD + 0.32, c.NW.g); bx(6, 1.6, 0.06, '#F0F4F8', -2, 2.6, -HD + 0.36, c.NW.g); bx(3, 0.8, 0.07, '#FFFFFF', -2, 3.3, -HD + 0.38, c.NW.g);
    c.inter(0, -HD + 6, 2.2, '看牆上的畫', () => talk('松之湯', ['浴池後面的牆上畫著北山的雪景。', '熱水的蒸氣讓畫裡的山看起來像是真的在冒煙。']));
    lamp(0, 3.4, -HD + 3, '#FFF0D8', 0.9, 12); lamp(0, 3.2, HD - 3, '#FFE0B0', 0.6, 9);
  });
  // ---------- 寺 ----------
  def('temple', { name: '東鶴寺', sub: '本堂', hint: '線香的味道，很安靜', w: 20, d: 14, h: 5, zoom: 0.88, wall: '#6A5440', cap: '#2A2018', floor: ['#C8B888', 'planks'] }, c => {
    const { HW, HD, bx, block, lamp, mesh, TH, flame } = c;
    bx(8, 1.0, 2.6, '#3A2A1C', 0, 0.5, -HD + 1.6); bx(1.6, 2.2, 1.2, '#C9A13A', 0, 2.1, -HD + 1.4); mesh(new TH.SphereGeometry(0.55, 10, 8), '#C9A13A', 0, 3.5, -HD + 1.4); block(-4, 4, -HD, -HD + 3, 'altar');
    [-3, 3].forEach(x => { bx(0.3, 1.2, 0.3, '#8A6A3A', x, 1.6, -HD + 2.6); flame(x, 2.3, -HD + 2.6, 0.5); });
    mesh(new TH.CylinderGeometry(0.5, 0.4, 0.6, 10), '#5A5A62', 0, 0.3, -HD + 4); block(-0.5, 0.5, -HD + 3.5, -HD + 4.5, 'deco'); c.inter(0, -HD + 5, 1.8, '上一炷香', () => talk('東鶴寺', ['點了一炷香，合掌。', '煙慢慢地往上飄，消失在屋梁之間。']));
    for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) c.flat(0.7, 0.7, '#8A3A3A', -4 + i * 1.6, 0.03, -1 + r * 1.6);
    clerk(c, -HW + 2.5, -HD + 2, Math.PI / 2, '住持', { top: '#3A3A42', hair: '#1A1410', hs: 'bald' }, '和住持說話', run('temple'));
    lamp(0, 3.6, -HD + 2, '#FFD890', 0.9, 12); lamp(0, 3.4, 2, '#FFE0B0', 0.4, 12);
  });
  // ---------- 旅館 ----------
  def('hotel', { name: '東鶴旅館', sub: '大廳', hint: '「歡迎光臨，今晚要住宿嗎？」', w: 20, d: 12, wall: '#D8C8B0', cap: '#6A4A30', floor: ['#7A5A40', 'planks'] }, c => {
    const { HW, HD, bx, block, lamp } = c;
    counter(c, -4, -HD + 2, 6); clerk(c, -4, -HD + 1, 0, '旅館的櫃台', { top: '#4A3A2A' }, '櫃台：住一晚', run('hotel'));
    bx(0.4, 0.6, 2.0, '#2A2A30', -HW + 0.8, 0.3, -HD + 1.6); c.bx(1.6, 1.2, 0.1, K().lam('#5A7A9A', { em: '#4A6A8A', ei: 0.5 }), -HW + 0.8, 1.2, -HD + 0.5);
    [[3, 0], [3, 2.6]].forEach(([x, z]) => { bx(3, 0.5, 1.0, '#7A2A2A', x, 0.25, z); bx(3, 0.8, 0.25, '#7A2A2A', x, 0.65, z - 0.4); block(x - 1.5, x + 1.5, z - 0.6, z + 0.5, 'sofa'); });
    table(c, 3, 1.3, 1.6, 0.8); plant(c, HW - 0.8, -HD + 0.8); plant(c, -HW + 0.8, HD - 0.8);
    for (let i = 0; i < 3; i++) bx(0.7, 0.5, 0.4, pick(['#5A3A2A', '#2E3A4A', '#6A5A3A']), HW - 2 + i * 0.3, 0.25 + i * 0.45, HD - 1.2);
    guest(c, 3, -1.1, 0, '出差的商人', ['「從皇嶺坐電車來的。明天一早去選礦廠談生意。」', '「這家旅館的早餐，烤魚很好吃。」']);
    lamp(0, 3.0, 0, '#FFE0B0', 0.8, 12);
  });
  // ---------- 柏青哥 ----------
  def('pachinko', { name: '柏青哥「銀河」', sub: '店內', hint: '鋼珠的聲音吵得聽不見自己說話', w: 22, d: 14, wall: '#3A2A4A', cap: '#C9A13A', floor: ['#5A2A3A', 'floor'] }, c => {
    const { HW, HD, bx, block, lamp } = c;
    // 四排不同的機台（pachinko.js 的 R.PACHI_KINDS）：左島的外側銀河、內側海神；右島的內側赤龍、外側月影
    const PK = R.PACHI_KINDS || {}, side = (x, face) => (x < 0 ? (face < 0 ? 'ginga' : 'kaijin') : (face < 0 ? 'sekiryu' : 'tsukikage')), lit = k => (PK[k] ? PK[k].lamp : pick(['#FF5A8A', '#FFE070', '#7AE0FF']));
    [-4, 4].forEach(x => { for (let i = 0; i < 6; i++) { const z = -HD + 2 + i * 1.3; machine(c, x - 0.5, z, -Math.PI / 2, '#C8C0D8', lit(side(x, -1))); machine(c, x + 0.5, z, Math.PI / 2, '#C8C0D8', lit(side(x, 1))); } });
    [[-5.5, -1, -4, -1], [-2.5, 1, -4, 1], [2.5, -1, 4, -1], [5.5, 1, 4, 1]].forEach(([px, pz, x, f]) => { const k = side(x, f), nm = PK[k] ? PK[k].name : ''; c.inter(px, pz, 1.8, nm ? '坐下來打「' + nm + '」（' + PK[k].spec + '）' : '找一台空著的坐下（打柏青哥）', PK[k] ? () => R.pachinko(k) : run('pachinko')); });
    for (let k = 0; k < 6; k++) { const x = (rnd() < 0.5 ? -5.4 : 5.4) * (rnd() < 0.5 ? 1 : 0.85), z = -HD + 2 + Math.floor(rnd() * 6) * 1.3; c.npc(x, z, x < 0 ? Math.PI / 2 : -Math.PI / 2, { name: '打柏青哥的人', look: look() }); }
    counter(c, 0, HD - 2.5, 5, { col: '#C9A13A', top: '#E8D8A0' }); guest(c, 0, HD - 3.5, 0, '景品的店員', ['「鋼珠可以換香菸、零食、玩具。也可以換這個——（金色的小牌子）。」', '「這個嘛，出去轉角的小窗口會收。我什麼都沒說。」'], { top: '#C83A3A' });
    lamp(-4, 3.0, 0, '#FF8AC8', 0.7, 10); lamp(4, 3.0, 0, '#8AE0FF', 0.7, 10); lamp(0, 3.2, HD - 3, '#FFE070', 0.6, 8);
  });
  // ---------- 遊樂場 ----------
  def('arcade', { name: '遊樂場', sub: '夾娃娃機・電玩', hint: '電子音樂和硬幣的聲音', w: 20, d: 14, wall: '#1A1A3A', cap: '#7AE0FF', floor: ['#2A2A4A', 'floor'] }, c => {
    const { HW, HD, bx, block, lamp } = c;
    for (let i = 0; i < 3; i++) { const x = -6 + i * 3; bx(1.6, 2.2, 1.6, '#FF7AB8', x, 1.1, -HD + 1.4); const gl = bx(1.4, 1.2, 1.4, K().lam('#E8F0FF', {}), x, 1.6, -HD + 1.4); gl.material.transparent = true; gl.material.opacity = 0.3; bx(1.7, 0.3, 1.7, K().lam('#FFE070', { em: '#FFE070', ei: 0.8 }), x, 2.35, -HD + 1.4); block(x - 0.8, x + 0.8, -HD + 0.6, -HD + 2.2, 'deco'); c.inter(x, -HD + 3, 1.6, '夾娃娃機（一次 3 費拉）', () => (R.ufoCatcher ? R.ufoCatcher() : null)); }
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const x = 1.5 + i * 1.2, z = 0 + r * 3; machine(c, x, z, r ? 0 : Math.PI, '#2E2E48', pick(['#7AE0FF', '#FF5A8A', '#AAFF7A'])); }
    c.inter(3, 1.5, 2, '玩一台格鬥電玩（1 費拉）', () => { if (R.S.gold < 1) { R.toast('錢不夠。'); return; } R.S.gold -= 1; R.save(); talk('電玩', [rnd() < 0.4 ? '連贏三場！旁邊的國中生看傻了眼。' : '才第二關就輸了。背後傳來一聲嘆氣。']); });
    bx(1.6, 2.2, 1.4, '#E8E0F0', HW - 1.2, 1.1, HD - 2); block(HW - 2, HW, HD - 2.8, HD - 1.2, 'deco'); c.inter(HW - 2.4, HD - 2, 1.6, '拍大頭貼（2 費拉）', () => { if (R.S.gold < 2) { R.toast('錢不夠。'); return; } R.S.gold -= 2; R.save(); talk('大頭貼', ['閃光燈閃了四次。印出來的貼紙上，你的眼睛被畫得很大。']); });
    guest(c, -3, 2, Math.PI, '翹課的國中生', ['「你也是來夾娃娃的？那台的爪子比較緊。」', '「不要跟我媽說我在這裡。」'], { top: '#2E3A5A' });
    lamp(-4, 3.0, -HD + 2, '#FF8AC8', 0.8, 10); lamp(3, 3.0, 1, '#8AE0FF', 0.8, 10);
  });
  // ---------- 一般的店（照店的種類擺架子、櫃台、店員） ----------
  const shop = (kind, name, sub, o) => def(kind, Object.assign({ name, sub, hint: o.hint, w: o.w || 16, d: o.d || 10, wall: o.wall || '#E0D8C8', cap: o.cap || '#6A4A30', floor: o.floor || ['#7A6048', 'planks'] }), c => {
    const { HW, HD, lamp } = c;
    counter(c, o.cx != null ? o.cx : -HW + 3.5, -HD + 2, 4, { col: o.counter || '#6A4A30' });
    clerk(c, o.cx != null ? o.cx : -HW + 3.5, -HD + 1, 0, o.clerk, o.clerkLook, o.label || '櫃台', run(kind));
    if (o.furnish) o.furnish(c);
    lamp(0, 3.0, 0, o.light || '#FFE8C8', 0.8, 12);
  });
  shop('konbini', '德克斯凡便利商店', '店內', { hint: '「歡迎光臨——」', wall: '#F0F4F4', cap: '#3A8A5A', floor: ['#D8DCDC', 'floor'], counter: '#E8E8EC', clerk: '便利商店的店員', clerkLook: { top: '#3A8A5A' }, label: '收銀台', light: '#F4FAFF', furnish: c => {
    const { HW, HD, bx, block } = c; [-1, 2.5].forEach(x => shelf(c, x, 0.5, 3.4, { alongZ: true, h: 1.5, face: 1, col: '#C8C8D0' }));
    for (let i = 0; i < 4; i++) { bx(0.8, 2.0, 0.7, '#B8C0C8', HW - 0.45, 1.0, -HD + 1 + i * 0.85); const g = bx(0.04, 1.6, 0.6, K().lam('#E8F8FF', { em: '#BFE8FF', ei: 0.6 }), HW - 0.85, 1.05, -HD + 1 + i * 0.85); g.castShadow = false; } block(HW - 0.9, HW, -HD + 0.5, -HD + 4.2, 'shelf');
    shelf(c, HW - 3, HD - 0.6, 3.4, { h: 1.0, face: -1, col: '#C8C8D0', goods: ['#E8E0D0', '#C83A3A', '#3A6ACF'] }); guest(c, HW - 3, HD - 1.6, 0, '站著看雜誌的人', ['「……」（假裝沒看到你。）', '「這期的勇者特集，有寫到城西遺跡。」']); } });
  shop('cafe', '德克斯凡咖啡館', '店內', { hint: '咖啡豆的香味', wall: '#C8A888', cap: '#4A3424', clerk: '咖啡館的店長', clerkLook: { top: '#3A2A1C', acc: 'glasses' }, label: '櫃台：點一杯熱飲', furnish: c => {
    const { HW, HD, bx, mesh, TH } = c; bx(0.6, 0.6, 0.5, '#8A8A92', -HW + 2.4, 1.4, -HD + 1.8);
    [[2, -1], [5, -1], [2, 2], [5, 2]].forEach(([x, z]) => { table(c, x, z, 1.2, 1.2); chair(c, x - 0.9, z, Math.PI / 2); chair(c, x + 0.9, z, -Math.PI / 2); });
    mesh(new TH.CylinderGeometry(0.5, 0.5, 0.1, 16), '#1A1418', -HW + 1.2, 1.15, HD - 1.5); bx(0.9, 1.0, 0.9, '#5A3E28', -HW + 1.2, 0.5, HD - 1.5);
    c.inter(-HW + 1.6, HD - 2.4, 1.4, '聽唱片', () => talk('咖啡館', ['唱針沙沙地響。是德克斯凡那邊的舊曲子，女歌手的聲音很低。']));
    guest(c, 2, -0.2, Math.PI / 2 + Math.PI, '看書的學生', ['「這裡的熱可可，喝了下遺跡比較不會手抖。」'], { acc: 'glasses' }); plant(c, HW - 0.8, HD - 0.8); } });
  shop('trade', '德克斯凡商行', '店面', { hint: '機油和新鐵的味道', wall: '#B8B4AC', cap: '#3A4A5A', floor: ['#6A6A70', 'floor'], clerk: '商行的店員', clerkLook: { top: '#2E3A4A' }, label: '櫃台', furnish: c => {
    const { HW, HD, bx, block } = c; shelf(c, 2, -HD + 0.4, 8, { h: 2.4, col: '#4A4A52', goods: ['#8A8A92', '#C8A060', '#5A6A7A', '#C8C8D0'] });
    for (let i = 0; i < 3; i++) bx(1.2, 1.0, 1.0, '#8A6A44', HW - 1.5, 0.5 + i * 0.01, 1 + i * 1.3); block(HW - 2.2, HW, 0.4, 4.6, 'deco');
    bx(1.6, 1.4, 1.2, '#5A6A7A', 1, 0.7, 2); block(0.2, 1.8, 1.4, 2.6, 'deco'); c.inter(1, 3.2, 1.6, '看展示的魔導機械', () => talk('德克斯凡商行', ['齒輪和咒文刻在一起的機器。銘牌寫著：「德克斯凡・魔導汲水機 III 型」。'])); } });
  shop('parts', '魔導燈具・零件行', '店面', { hint: '一排排小燈泡亮著', wall: '#8A8070', cap: '#3A3A42', floor: ['#5A564E', 'floor'], clerk: '零件行的店員', clerkLook: { top: '#2E3A4A', hair: '#E9D8A6' }, label: '櫃台：機油、零件、溫室玫瑰', light: '#FFE8A0', furnish: c => {
    const { HW, HD, bx } = c; shelf(c, 2, -HD + 0.4, 8, { h: 2.4, col: '#3A3A42', goods: ['#FFE070', '#FFC890', '#E8F0FF', '#C8C8D0'] });
    for (let i = 0; i < 8; i++) { const g = bx(0.25, 0.25, 0.25, K().lam('#FFE8A0', { em: '#FFD070', ei: 0.9 }), -HW + 1 + i * 1.6, 3.0, 0); g.castShadow = false; }
    for (let i = 0; i < 6; i++) bx(0.4, 0.5, 0.4, '#C83A5A', HW - 1, 0.3, 1 + i * 0.5); } });
  shop('sweets', '甘味處・和菓子', '店內', { hint: '紅豆煮得甜甜的', wall: '#E8DCC8', cap: '#6A3A2A', clerk: '和菓子店的老闆娘', clerkLook: { top: '#8A4A5A', hair: '#2A2420' }, label: '櫃台：銅鑼燒、糰子', furnish: c => {
    const { HW, HD, bx } = c; const gl = bx(4, 0.9, 0.9, K().lam('#E8F0F8', {}), -HW + 3.5, 1.5, -HD + 2); gl.material.transparent = true; gl.material.opacity = 0.35;
    for (let i = 0; i < 6; i++) bx(0.4, 0.2, 0.4, pick(['#C88A6A', '#F0E8D8', '#8AC88A', '#E8A0B8']), -HW + 2 + i * 0.6, 1.2, -HD + 2);
    [[2, 0], [5, 0], [3.5, 2.5]].forEach(([x, z]) => { table(c, x, z, 1.2, 1.0); chair(c, x, z + 0.8, Math.PI); });
    guest(c, 5, -0.8, 0, '吃紅豆湯的老爺爺', ['「冬天就是要喝紅豆湯。」', '「這家店從我小時候就在了。」'], { hair: '#C8C0B0' }); } });
  shop('books', '東鶴書房', '店內', { hint: '舊紙的味道', wall: '#C8B898', cap: '#4A3424', clerk: '書房的老闆', clerkLook: { top: '#4A4A3A', hair: '#C8C0B0', acc: 'glasses' }, label: '櫃台', furnish: c => {
    const { HW, HD } = c; for (let i = 0; i < 3; i++) shelf(c, 0 + i * 2.6, -0.5, 4.5, { alongZ: true, h: 2.4, face: i % 2 ? 1 : -1, col: '#5A3E28', goods: ['#8A2A2A', '#2A4A6A', '#4A6A3A', '#C8B888', '#3A2A1C'] });
    shelf(c, 2.6, -HD + 0.4, 7, { h: 2.6, col: '#5A3E28', goods: ['#8A2A2A', '#2A4A6A', '#4A6A3A', '#C8B888'] });
    c.inter(1.3, 2.5, 1.8, '翻一本書', () => talk('東鶴書房', [pick(['《遺跡生物圖說》（公會監修，舊版）：裡面的「礦殼」畫得像一隻螃蟹。', '《天星十二宮曆的由來》：一週十天，四天休息的由來寫了三十頁。', '《德克斯凡魔導入門》：前面的咒文看得懂，後面全是算式。', '《東鶴百年》：舊城的城牆，原本有四座城門。'])])); } });
  shop('diner', '定食屋・小町', '店內', { hint: '「歡迎！今天的定食是烤鯖魚。」', wall: '#D8C8A8', cap: '#5A3A24', clerk: '小町的老闆', clerkLook: { top: '#F0ECE2', hair: '#2A2420' }, label: '櫃台：點定食', cx: 0, furnish: c => {
    const { HW, HD, bx, flame } = c; for (let i = 0; i < 5; i++) chair(c, -3 + i * 1.5, -HD + 3.1, Math.PI); bx(1.2, 0.9, 0.8, '#3A3230', 3.5, 0.45, -HD + 0.6); flame(3.5, 1.0, -HD + 0.9, 0.5);
    for (let i = 0; i < 4; i++) c.bx(0.6, 0.9, 0.04, '#F0E8D0', -HW + 1 + i * 0.8, 2.4, -HD + 0.33, c.NW.g);
    [[-4, 2.2], [-1, 2.2], [4, 2.2]].forEach(([x, z]) => { table(c, x, z, 1.4, 1.0); chair(c, x - 0.9, z, Math.PI / 2); chair(c, x + 0.9, z, -Math.PI / 2); });
    guest(c, -1, 1.3, Math.PI, '吃午飯的工人', ['「選礦廠的午休只有四十分鐘，吃快一點。」', '「白飯可以免費加一碗。」'], { top: '#5A5A3A' }); } });
  shop('barber', '理髮店', '店內', { hint: '剪刀喀擦喀擦', wall: '#E8ECF0', cap: '#C83A3A', floor: ['#C8C8D0', 'floor'], clerk: '理髮師傅', clerkLook: { top: '#F0F4F8' }, label: '剪頭髮、聊天', furnish: c => {
    const { HW, HD, bx, block } = c; for (let i = 0; i < 2; i++) { const x = 1 + i * 3; bx(0.8, 0.9, 0.8, '#3A3A42', x, 0.45, -HD + 2); bx(0.8, 0.8, 0.15, '#C83A3A', x, 1.1, -HD + 2.35); block(x - 0.45, x + 0.45, -HD + 1.5, -HD + 2.5, 'chair'); const m = bx(1.2, 1.4, 0.04, K().lam('#DDEEFF', { em: '#8AA8C8', ei: 0.2 }), x, 1.6, -HD + 0.35); m.castShadow = false; }
    bench(c, -HW + 0.5, 1.5, 3, false); guest(c, 1, -HD + 2, 0, '剪頭髮的客人', ['「短一點就好。」', '「師傅，聽說北山礦坑又出事了？」']); } });
  shop('photo', '寫真館', '攝影棚', { hint: '「請看這裡——」', wall: '#D8D0C8', cap: '#3A3A42', clerk: '寫真館的老闆', clerkLook: { top: '#2E2E38', acc: 'glasses' }, label: '拍一張照片（勇者證用的大頭照）', furnish: c => {
    const { HW, HD, bx, block } = c; bx(6, 3.4, 0.05, '#6A7A8A', 2, 1.7, -HD + 0.32, c.NW.g); chair(c, 2, -HD + 1.6, 0); bx(0.3, 1.4, 0.3, '#2A2A30', 2, 0.7, 1.5); bx(0.6, 0.4, 0.5, '#1A1A20', 2, 1.6, 1.5); block(1.7, 2.3, 1.2, 1.8, 'deco');
    [[-0.5, 0], [4.5, 0]].forEach(([x, z]) => { bx(0.1, 2.2, 0.1, '#C8C8D0', x, 1.1, z); bx(0.6, 0.6, 0.6, K().lam('#FFFFFF', { em: '#FFF8E8', ei: 0.7 }), x, 2.3, z); });
    for (let i = 0; i < 6; i++) c.bx(0.5, 0.7, 0.04, pick(['#C8B8A0', '#A8988A', '#E8E0D0']), -HW + 0.36, 1.6 + (i % 2) * 0.9, -2 + Math.floor(i / 2) * 1.2, c.WW.g); } });
  shop('watch', '時計・眼鏡', '店內', { hint: '滴答滴答，幾十個時鐘一起走', wall: '#D8CCB8', cap: '#4A3A2A', clerk: '鐘錶行的老師傅', clerkLook: { top: '#4A4A52', hair: '#C8C0B0', acc: 'glasses' }, label: '櫃台', furnish: c => {
    const { HW, HD, bx, mesh, TH } = c; for (let i = 0; i < 9; i++) { const x = -HW + 2 + (i % 5) * 2.4, y = 2.0 + Math.floor(i / 5) * 0.9; const f = mesh(new TH.CylinderGeometry(0.3, 0.3, 0.06, 14), '#F0ECE2', x, y, -HD + 0.36, c.NW.g); f.rotation.x = Math.PI / 2; }
    const gl = bx(4, 0.9, 0.8, K().lam('#E8F0F8', {}), 2, 1.5, 0); gl.material.transparent = true; gl.material.opacity = 0.3; c.block(0, 4, -0.4, 0.4, 'desk'); for (let i = 0; i < 6; i++) bx(0.25, 0.08, 0.25, pick(['#C9A13A', '#C8C8D0', '#2A2A30']), 0.6 + i * 0.55, 1.12, 0);
    c.inter(2, 1.2, 1.6, '看玻璃櫃', () => talk('時計・眼鏡', ['懷錶、手錶、眼鏡。最貴的一隻是德克斯凡的魔導錶：「不用上發條，照著佩特拉的脈動走。」'])); } });
  shop('electro', '德克斯凡家電', '店內', { hint: '一整面牆的電視一起演同一個節目', wall: '#E8E8EC', cap: '#3A5A8A', floor: ['#C8CCD0', 'floor'], clerk: '家電行的店員', clerkLook: { top: '#3A5A8A' }, label: '櫃台', light: '#F4F8FF', furnish: c => {
    const { HW, HD, bx } = c; for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { const x = -1 + i * 1.3, y = 0.9 + r * 1.1; bx(1.1, 0.85, 0.5, '#2A2A30', x, y, -HD + 0.5); const s = bx(0.9, 0.65, 0.04, K().lam('#7AB8E8', { em: '#5A9AD8', ei: 0.85 }), x, y, -HD + 0.77); s.castShadow = false; } c.block(-1.7, 6.6, -HD, -HD + 0.8, 'shelf');
    c.inter(2, -HD + 2, 2, '看電視', () => talk('德克斯凡家電', [pick(['電視在播晨間連續劇。女主角在皇嶺的車站哭著揮手。', '新聞：「昭旭沿岸今晚到明天，大雪特報。」', '廣告：「德克斯凡冷藏庫，雪國也需要冰箱！」'])]));
    for (let i = 0; i < 3; i++) bx(0.8, 1.6, 0.7, '#E8E8EC', HW - 0.6, 0.8, 0.5 + i * 1.0); c.block(HW - 1, HW, 0, 3.2, 'shelf'); } });
  shop('clinic', '內科診所', '候診室・診療室', { hint: '「請在這裡寫上名字。」', wall: '#EEF2F2', cap: '#7A9AA8', floor: ['#C8D0D0', 'floor'], counter: '#E0E4E4', clerk: '診所的護理師', clerkLook: { top: '#F0F4F4' }, label: '掛號（看病）', light: '#F0FAFF', furnish: c => {
    const { HW, HD, part } = c; for (let i = 0; i < 2; i++) bench(c, -3, 1 + i * 1.6, 3, true); part(false, 2, -HD, HD - 2.5, [[-1.5, 0]]); bed(c, HW - 1.4, -HD + 1.5, true); table(c, 4, 1, 1.2, 0.8);
    guest(c, 4, 0.1, Math.PI, '老醫生', ['「喉嚨痛就多喝熱水。下遺跡的話，別在雪地裡睡著。」', '「最近感冒的人很多。」'], { top: '#F4F4F0', hair: '#C8C0B0', acc: 'glasses' }); } });
  shop('super', '河西超市', '店內', { hint: '「今日特價：白蘿蔔一根 1 費拉！」', w: 20, d: 14, wall: '#F0EEE8', cap: '#C83A3A', floor: ['#D8D4CC', 'floor'], counter: '#E8E8EC', clerk: '收銀員', clerkLook: { top: '#C83A3A' }, label: '收銀台', cx: -6, light: '#F8FAFF', furnish: c => {
    const { HW, HD, bx } = c; for (let i = 0; i < 4; i++) shelf(c, -2 + i * 2.8, 0, 6, { alongZ: true, h: 1.6, face: i % 2 ? 1 : -1, col: '#C8C8D0' });
    for (let i = 0; i < 4; i++) { bx(1.6, 0.8, 1.0, '#8A6A44', -HW + 1.2, 0.4, 0 + i * 1.3); for (let k = 0; k < 4; k++) bx(0.3, 0.3, 0.3, pick(['#F0F0E8', '#C83A3A', '#5AA85A', '#E8823A']), -HW + 0.7 + k * 0.35, 0.95, i * 1.3); } c.block(-HW + 0.3, -HW + 2.1, -0.6, 4.6, 'deco');
    guest(c, 3, HD - 2, Math.PI, '買菜的太太', ['「白蘿蔔特價，晚上煮關東煮。」', '「冬天的菜都從南邊運來，貴得要命。」']); } });
  // ---------- 望月家（照原著〈浮標〉）：正屋、道場 ----------
  // 院子、碎石小路在城裡（town.js）。正屋：南邊是廊下，紙門後面由西到東是書房、座敷（床之間掛著「秋水長天」、佛龕）、廚房（土間、灶、水甕）；
  // 廚房北牆的後門出去是碎石小路，經過矮牆的小門就是道場。整間道場（房子連地）是租的。
  const BACK_X = 6;
  let scrollTex = null;   // 「秋水長天」的字（只畫一次）
  const scroll = TH => {
    if (scrollTex) return scrollTex;
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 192; const g = cv.getContext('2d');
    g.fillStyle = '#3A3A4A'; g.fillRect(0, 0, 64, 192); g.fillStyle = '#E8DFC8'; g.fillRect(8, 22, 48, 150); g.fillStyle = '#5A3E26'; g.fillRect(0, 0, 64, 6); g.fillRect(0, 186, 64, 6);
    g.fillStyle = '#1E1A16'; g.font = 'bold 30px "Noto Serif TC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; ['秋', '水', '長', '天'].forEach((ch, i) => g.fillText(ch, 32, 42 + i * 34));
    g.fillStyle = '#B83A2E'; g.fillRect(40, 160, 8, 8);
    scrollTex = new TH.CanvasTexture(cv); scrollTex.encoding = TH.sRGBEncoding; return scrollTex;
  };
  def('mochiHouse', { name: '望月家', sub: '正屋', hint: '廊下的木板擦得很乾淨', w: 20, d: 10, h: 3.2, zoom: 0.84, wall: '#D8CFBC', cap: '#3A2A1C', floor: ['#A8885A', 'planks'], out: '出去（回到院子）', backDoor: [BACK_X - 0.8, BACK_X + 0.8] }, c => {
    const { HW, HD, T0, bx, flat, mesh, TH, block, lamp, part, flame, ins } = c, L = K().lam, ZS = HD - 1.8;
    // 廊下（南邊一整條）和紙門
    flat(2 * HW, HD - ZS - 0.3, L('#C0A272', { tex: 'planks' }), 0, 0.012, (ZS + 0.3 + HD) / 2);
    const gaps = [[-7.6, -6.2], [-1.4, 1.4], [5.4, 6.8]], sh = part(true, ZS, -HW, HW, gaps);
    for (let x = -HW + 0.5; x < HW; x += 1) { if (gaps.some(([a, b]) => x > a - 0.5 && x < b + 0.5)) continue; bx(0.9, 2.3, 0.03, L('#F2ECDA', { tex: 0 }), x, 1.35, ZS + 0.32, sh.g); bx(0.04, 2.3, 0.03, '#5A3E26', x - 0.46, 1.35, ZS + 0.34, sh.g); bx(0.9, 0.04, 0.03, '#5A3E26', x, 1.7, ZS + 0.34, sh.g); }
    part(false, -4, -HD, ZS - T0 / 2, [[-0.4, 1.0]]); part(false, 4, -HD, ZS - T0 / 2, [[-0.4, 1.0]]);
    // 座敷：榻榻米、床之間（「秋水長天」）、佛龕、矮桌和坐墊
    flat(7.4, ZS - 0.3 + HD - 0.1, L('#3A3A2A', { tex: 0 }), 0, 0.011, (ZS - 0.3 - HD) / 2);
    for (let r = 0; r < 8; r++) for (let i = 0; i < 4; i++) flat(1.74, 0.84, L(r % 2 === i % 2 ? '#BDB97C' : '#B4B074', { tex: 0 }), -2.7 + i * 1.8, 0.014, -HD + 0.55 + r * 0.9);
    bx(2.6, 0.16, 0.8, '#5A3E26', 1.1, 0.08, -HD + 0.4); bx(2.6, 2.7, 0.04, '#C8BCA2', 1.1, 1.35, -HD + 0.04, c.NW.g); bx(0.16, 3.2, 0.16, '#6A4A2E', -0.25, 1.6, -HD + 0.8); bx(2.9, 0.22, 0.1, '#5A3E26', 1.1, 2.75, -HD + 0.8);
    mesh(new TH.PlaneGeometry(0.66, 1.98), new TH.MeshLambertMaterial({ map: scroll(TH) }), 1.1, 1.6, -HD + 0.07);
    mesh(new TH.CylinderGeometry(0.12, 0.16, 0.42, 8), '#3A4A5A', 2.0, 0.37, -HD + 0.45); block(-0.2, 2.4, -HD, -HD + 0.8, 'deco');
    c.inter(1.1, -HD + 1.7, 1.8, '看床之間的字', () => talk('座敷', ['床之間掛著一幅字：「秋水長天」。', '墨跡很淡，紙邊有一點泛黃，看得出掛了很多年。']));
    bx(1.2, 0.3, 0.9, '#3A2A1C', -2.6, 0.15, -HD + 0.45); bx(1.0, 1.4, 0.6, '#1E1A18', -2.6, 1.0, -HD + 0.36); bx(0.76, 1.0, 0.02, L('#C9A13A', { em: '#5A4010', ei: 0.5 }), -2.6, 1.05, -HD + 0.67);
    [-2.85, -2.35].forEach(x => { bx(0.05, 0.16, 0.05, '#F0ECE2', x, 0.38, -HD + 0.8); flame(x, 0.52, -HD + 0.8, 0.22); }); block(-3.25, -1.95, -HD, -HD + 0.95, 'deco');
    c.inter(-2.6, -HD + 1.6, 1.5, '在佛龕前合掌', () => talk('佛龕', ['佛龕前點著兩支小蠟燭，火光一動也不動。', '（你合掌，低頭拜了一下。）']));
    mesh(new TH.CylinderGeometry(0.62, 0.62, 0.06, 16), '#5A3A24', 0, 0.38, -0.6); mesh(new TH.CylinderGeometry(0.08, 0.1, 0.36, 6), '#4A3020', 0, 0.18, -0.6); block(-0.62, 0.62, -1.22, 0.02, 'table');
    [[0, -1.6], [0, 0.4], [-1.0, -0.6], [1.0, -0.6]].forEach(([x, z]) => bx(0.6, 0.08, 0.6, '#6A2E3A', x, 0.05, z));
    // 書房：矮桌、硯台、書架、行燈
    bx(1.6, 0.36, 0.6, '#5A3E26', -7, 0.18, -HD + 1.2); bx(0.2, 0.04, 0.3, '#1A1A1E', -7.5, 0.38, -HD + 1.2); flat(0.5, 0.36, '#F4F0E4', -6.8, 0.37, -HD + 1.2); bx(0.5, 0.08, 0.5, '#4A3A5A', -7, 0.04, -HD + 1.9); block(-7.8, -6.2, -HD + 0.9, -HD + 1.5, 'desk');
    for (let i = 0; i < 2; i++) { const z = -3.6 + i * 2.6; bx(0.5, 1.9, 2.2, '#4A3424', -HW + 0.3, 0.95, z); for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) bx(0.36, 0.42, 0.22, pick(['#6A5A48', '#8A7A5A', '#4A4A5A', '#7A4A3A', '#C8B898']), -HW + 0.4, 0.3 + r * 0.6, z - 0.95 + k * 0.3); block(-HW, -HW + 0.6, z - 1.1, z + 1.1, 'shelf'); }
    mesh(new TH.CylinderGeometry(0.2, 0.2, 0.55, 6), L('#FFE8B8', { em: '#FFC870', ei: 0.8 }), -5.0, 0.3, -HD + 0.6); lamp(-5.0, 0.9, -HD + 0.9, '#FFD8A0', 0.35, 5, true);
    c.inter(-7, -HD + 2.3, 1.6, '看書房的矮桌', () => talk('書房', ['矮桌上放著硯台和一枝筆，墨已經乾了。', '書架上是舊書和線裝的帳冊。']));
    // 廚房：土間、灶（還有火）、水甕、流理台、碗櫃；北牆的後門
    flat(HW - 4.3, ZS - 0.3 + HD, L('#6E665C', { tex: 'floor' }), (4.3 + HW) / 2, 0.013, (ZS - 0.3 - HD) / 2);
    bx(1.9, 0.8, 0.9, L('#8A7A6A', { tex: 'wall' }), 8.7, 0.4, -HD + 0.55); [8.2, 9.2].forEach(x => { bx(0.4, 0.3, 0.04, L('#FF7A2A', { em: '#FF5A1A', ei: 1 }), x, 0.3, -HD + 1.01); mesh(new TH.CylinderGeometry(0.3, 0.24, 0.3, 10), '#2A2A2E', x, 0.95, -HD + 0.55); });
    flame(8.2, 0.35, -HD + 1.1, 0.5); lamp(8.7, 0.6, -HD + 1.6, '#FF9A4A', 0.8, 6, true); ins.smoke.push({ x: 9.2, y: 1.3, z: -HD + 0.55 }); block(7.75, 9.65, -HD, -HD + 1.05, 'stove');
    mesh(new TH.CylinderGeometry(0.4, 0.32, 0.8, 10), '#5A4A3E', 4.9, 0.4, -HD + 0.6); flat(0.62, 0.62, L('#9FC0D8', { em: '#3A5A70', ei: 0.3 }), 4.9, 0.81, -HD + 0.6); block(4.45, 5.35, -HD + 0.15, -HD + 1.05, 'jar');
    bx(0.7, 0.85, 2.0, '#8A8A86', HW - 0.4, 0.42, -0.6); bx(0.6, 1.6, 1.8, '#5A3E26', HW - 0.35, 1.9, 1.6); for (let k = 0; k < 6; k++) mesh(new TH.CylinderGeometry(0.12, 0.08, 0.1, 8), pick(['#E8E0D0', '#4A6A8A', '#C8B898']), HW - 0.72, 1.3 + Math.floor(k / 3) * 0.5, 1.0 + (k % 3) * 0.55); block(HW - 0.8, HW, -1.6, 2.5, 'shelf');
    c.inter(8.7, -HD + 1.9, 1.8, '看看灶', () => talk('廚房', ['灶裡的柴火還有一點紅，鍋裡在燒熱水。', '水甕裡的水結了一層薄冰。']));
    // 後門：門外的石階、碎石（走出去就到正屋後面的碎石小路）
    bx(2, 0.12, 0.8, '#7A766E', BACK_X, 0.02, -HD - T0 - 0.4).castShadow = false; bx(3.2, 0.1, 2.0, L('#B4B0A6', { tex: 'gravel' }), BACK_X, -0.05, -HD - T0 - 1.6).castShadow = false;
    block(BACK_X - 3, BACK_X + 3, -HD - T0 - 3, -HD - T0 - 1.1); lamp(BACK_X, 2.4, -HD - 1.8, '#9FB4CC', 0.3, 5);
    c.inter(BACK_X, -HD + 0.9, 1.5, '從後門出去（碎石小路，往道場）', () => { ins.exitBack = 1; R.exitInterior(); });
    c.inter(-6, HD - 0.9, 1.6, '從廊下看院子', () => talk('廊下', ['紙門外是廊下，看得到院子裡的老松。', '雪從松枝上滑下來，「沙」的一聲。']));
    lamp(0, 2.8, -1.2, '#FFE8C8', 0.8, 12); lamp(0, 2.6, HD - 0.9, '#E8F0FF', 0.35, 12);
  });
  // 道場：東側的高窗、磨得發亮的木地板（有地板縫）、牆邊的木刀架、護具架、牆角的記分表、角落的小桌、補過灰泥的牆角、草靶。
  // 公開練習日（息日）門邊鋪觀摩席的墊子，有人來看、門生在中間對練。
  def('dojo', { name: '望月家道場', sub: '道場', hint: '木刀打在一起的聲音', w: 18, d: 12, h: 4.4, zoom: 0.86, wall: '#DCD2BA', cap: '#3A2A1C', floor: ['#C49A62', 'planks'], out: '出去（回到碎石小路）' }, c => {
    const { HW, HD, bx, flat, mesh, TH, block, lamp, ins, NW, WW, EW } = c, L = K().lam, dd = R.today ? R.today() : {}, open = dd.wd === '息日';
    // 地板縫、窗光照到的亮處
    for (let z = -HD + 0.6; z < HD; z += 0.6) flat(2 * HW, 0.025, '#7A5630', 0, 0.012, z);
    { const glow = new TH.MeshBasicMaterial({ color: '#FFF0C8', transparent: true, opacity: 0.2, depthWrite: false }); for (let i = 0; i < 4; i++) flat(3.4, 1.1, glow, HW - 3.0, 0.014, -4.0 + i * 2.6); }
    // 腰板
    bx(2 * HW, 1.1, 0.05, L('#6A4A2E', { tex: 'planks' }), 0, 0.55, -HD + 0.03, NW.g); bx(0.05, 1.1, 2 * HD, L('#6A4A2E', { tex: 'planks' }), -HW + 0.03, 0.55, 0, WW.g); bx(0.05, 1.1, 2 * HD, L('#6A4A2E', { tex: 'planks' }), HW - 0.03, 0.55, 0, EW.g);
    // 東側的高窗
    [-4, -1.3, 1.4, 4.1].forEach(z => { bx(0.04, 0.7, 1.5, L('#FFF6DE', { em: '#FFF0C8', ei: 0.95 }), HW - 0.03, 3.5, z, EW.g); bx(0.06, 0.06, 1.5, '#3A2A1C', HW - 0.05, 3.5, z, EW.g); }); [-2.6, 2.6].forEach(z => lamp(HW - 1.6, 3.2, z, '#FFF2D8', 0.45, 8));
    // 木刀架（西牆）
    bx(0.12, 1.5, 3.4, '#5A3E26', -HW + 0.1, 1.55, -1.5, WW.g); bx(0.3, 0.08, 3.4, '#4A3424', -HW + 0.2, 0.95, -1.5, WW.g); bx(0.3, 0.08, 3.4, '#4A3424', -HW + 0.2, 2.15, -1.5, WW.g);
    for (let i = 0; i < 10; i++) bx(0.05, 1.1, 0.05, i === 9 ? '#6A4A2E' : '#9A7A4E', -HW + 0.24, 1.55, -3.0 + i * 0.33, WW.g);
    block(-HW, -HW + 0.4, -3.3, 0.3, 'rack'); c.inter(-HW + 1.3, -1.5, 1.6, '看木刀架', () => talk('木刀架', ['一排木刀，握柄的地方都被手磨得發黑。']));
    // 護具架（北牆西邊）
    bx(3.2, 1.0, 0.6, '#4A3424', -5.6, 0.5, -HD + 0.35); bx(3.2, 0.06, 0.6, '#3A2818', -5.6, 1.5, -HD + 0.35); [-4.5, -3.5, -2.5, -1.5].forEach(o => { bx(0.5, 0.4, 0.44, '#2A3448', -7.2 + (o + 4.5) * 1.05, 1.22, -HD + 0.35); bx(0.4, 0.04, 0.3, '#C8C8D0', -7.2 + (o + 4.5) * 1.05, 1.24, -HD + 0.58); bx(0.56, 0.5, 0.36, '#1E1E24', -7.2 + (o + 4.5) * 1.05, 1.8, -HD + 0.35); });
    block(-7.2, -4.0, -HD, -HD + 0.7, 'rack'); c.inter(-5.6, -HD + 1.5, 1.6, '看護具架', () => talk('護具架', ['護具一套一套排好，綁帶都打成一樣的結。']));
    // 補過灰泥的牆角（西北角）
    bx(0.9, 1.1, 0.03, '#EEE8D8', -HW + 0.6, 2.3, -HD + 0.04, NW.g); bx(0.5, 0.6, 0.03, '#F2EEE2', -HW + 0.4, 2.9, -HD + 0.045, NW.g);
    c.inter(-HW + 1.2, -HD + 1.3, 1.3, '看牆角', () => talk('牆角', ['牆角補過灰泥，顏色比旁邊淺一點，抹得不太平。']));
    // 牆角的記分表（東北角）
    bx(1.6, 1.1, 0.04, '#E8E0C8', HW - 1.3, 2.0, -HD + 0.05, NW.g); for (let r = 0; r < 5; r++) { bx(0.4, 0.05, 0.02, '#2A2420', HW - 1.85, 2.38 - r * 0.18, -HD + 0.08, NW.g); for (let k = 0; k < 1 + (r * 3) % 4; k++) bx(0.12, 0.08, 0.02, '#2A2420', HW - 1.3 + k * 0.16, 2.38 - r * 0.18, -HD + 0.08, NW.g); }
    c.inter(HW - 1.4, -HD + 1.3, 1.4, '看牆角的記分表', () => talk('記分表', ['牆角釘著一張記分表：門生的名字底下，對練贏一次畫一筆，畫成一個個「正」字。']));
    // 角落的小桌（西南角）
    bx(0.9, 0.4, 0.6, '#5A3E26', -HW + 0.8, 0.2, HD - 0.7); mesh(new TH.SphereGeometry(0.13, 8, 6), '#4A5A4A', -HW + 0.6, 0.5, HD - 0.7); [0.85, 1.05].forEach(x => mesh(new TH.CylinderGeometry(0.05, 0.04, 0.08, 6), '#E8E0D0', -HW + x, 0.44, HD - 0.65)); block(-HW + 0.3, -HW + 1.3, HD - 1.0, HD - 0.4, 'desk');
    c.inter(-HW + 1.6, HD - 1.1, 1.3, '角落的小桌', () => talk('角落的小桌', ['小桌上放著茶壺和幾個茶杯，茶已經涼了。']));
    // 草靶（東邊），練習一天一次
    [-3, 0, 3].forEach(z => { const x = HW - 2.2; bx(0.14, 1.8, 0.14, '#6A4A2E', x, 0.9, z); mesh(new TH.CylinderGeometry(0.3, 0.32, 1.0, 8), L('#C8B070', { tex: 0 }), x, 1.35, z); [1.0, 1.7].forEach(y => mesh(new TH.CylinderGeometry(0.33, 0.33, 0.06, 8), '#6A4A2E', x, y, z)); block(x - 0.33, x + 0.33, z - 0.33, z + 0.33, 'deco'); });
    c.inter(HW - 3.4, 0, 2, '對著草靶練習（一天一次）', () => { const S = R.S; if (S.dojoDay === S.day) { talk('望月家道場', ['手臂已經抬不起來了。明天再來。']); return; } S.dojoDay = S.day; if (R.gainXp) R.gainXp(25); R.save(); talk('望月家道場', ['對著草靶揮了幾百下木刀，汗水滴在發亮的地板上。', '（職業經驗值 +25）']); });
    clerk(c, -3, 0.6, 0, '道場的門生', { top: '#E8E4DC', cloak: '#2E3A4A' }, '和門生說話', () => talk('道場的門生', [pick(['「地板每天早上擦一遍，擦到照得出人影。」', '「步法比刀快。這是第一天就教的。」', '「公開練習日是息日。那天門邊會鋪墊子，誰都可以進來看。」'])]));
    // 公開練習日：觀摩席的墊子、來看的人、兩個門生在中間對練
    if (open) {
      [-5.2, 5.2].forEach(x => flat(5.6, 1.5, L('#5A6A4A', { tex: 0 }), x, 0.03, HD - 1.0));
      [[-6.4, '來看練習的老人家', ['「公開練習日，誰都可以進來看。」', '「我年輕的時候也在這裡練過幾年。」']], [-4.2, '來看練習的學生', ['「聽說望月家的步法，一眨眼就到你面前。」', '「我也想學……可是好冷。」']], [5.0, '來看練習的太太', ['「我家孩子也在裡面練。」', '「地板亮得可以照鏡子呢。」']]].forEach(([x, name, lines]) => { const n = guest(c, x, HD - 1.0, Math.PI, name, lines); n.h.sit = true; n.sitting = true; });
      ins.spar = [[-1.0, -0.6, Math.PI / 2], [1.0, -0.6, -Math.PI / 2]].map(([x, z, rot], i) => { const n = c.npc(x, z, rot, { name: '對練的門生', weapon: 'katana', look: look({ top: '#E8E4DC', cloak: i ? '#2E3A4A' : '#3A2A2A' }) }); n.sitting = true; n.t = i * 0.6; return n; });
      c.inter(0, 0.6, 1.6, '看門生對練', () => talk('公開練習日', ['兩個門生隔著一步的距離站著，誰都沒有先動。', '——木刀相擊，一聲就結束了。']));
    }
    lamp(0, 4.0, 0, '#FFE8C8', 0.7, 14); lamp(-5, 3.6, 0, '#FFE8C8', 0.4, 9);
  });
  // 從正屋、道場出來：正屋前門回到院子、後門到碎石小路；道場的門也是碎石小路（城裡的位置 tw.mochi 在 town.js）
  const exit0 = R.exitInterior;
  R.exitInterior = () => {
    const ins = W.inside, o = W.outside, m = W.town && W.town.mochi;
    if (ins && o && m) { const back = ins.kind === 'mochiHouse' && ins.exitBack, p = ins.kind === 'mochiHouse' ? m[back ? 'back' : 'front'] : ins.kind === 'dojo' ? m.dojo : null; if (p) { o.x = p[0]; o.z = p[1]; o.back = back ? 1 : 0; } }
    exit0();
  };
  R.enterMochiBack = () => R.enterInterior('mochiHouse', { x: BACK_X, z: -PL.mochiHouse.d / 2 + 1.1, yaw: 0 });
  const istep0 = R.interiorStep;
  R.interiorStep = dt => {
    istep0(dt);
    const ins = W.inside, P = W.P; if (!ins || !P) return;
    // 走出後門
    if (ins.kind === 'mochiHouse' && !ins.exitBack && P.z < -ins.pl.d / 2 - 0.2 && Math.abs(P.x - BACK_X) < 1) { ins.exitBack = 1; R.exitInterior(); }
    // 對練：輪流出手
    if (ins.spar) ins.spar.forEach(n => { n.t -= dt; if (n.t <= 0) { n.t = 1.1 + rnd() * 0.9; n.h.swing = 0.25; } });
  };
  // ---------- 東鶴站 ----------
  def('trainst', { name: '東鶴站', sub: '售票口・剪票口・候車室', hint: '「往皇嶺的魔導電車，即將進站——」', w: 24, d: 14, h: 5, zoom: 0.9, wall: '#C8C0B0', cap: '#3A4A5A', floor: ['#A8A49C', 'floor'] }, c => {
    const { HW, HD, bx, block, lamp } = c;
    counter(c, -6, -HD + 2, 6, { col: '#5A6A7A', top: '#8A9AA8' }); clerk(c, -6, -HD + 1, 0, '售票口的站務員', { top: '#2E3A4A', cloak: '#2E3A4A' }, '售票口：搭魔導電車', run('trainst'));
    for (let i = 0; i < 4; i++) { const x = 3 + i * 1.6; bx(0.3, 1.0, 1.6, '#8A8A92', x, 0.5, -HD + 3); const l = bx(0.12, 0.12, 0.12, K().lam('#5AFF8A', { em: '#5AFF8A', ei: 1 }), x, 1.05, -HD + 2.5); l.castShadow = false; block(x - 0.2, x + 0.2, -HD + 2.2, -HD + 3.8, 'deco'); }
    c.inter(5.4, -HD + 4.6, 2.2, '剪票口', () => talk('東鶴站', ['剪票口後面是月台的樓梯。', '「要搭車請先到左邊的售票口買票。」']));
    c.bx(4, 1.6, 0.05, '#1A2A3A', 0, 3.0, -HD + 0.33, c.NW.g); c.inter(0, -HD + 2.4, 1.8, '看時刻表', () => talk('東鶴站的時刻表', ['往皇嶺：每天三班（早、中、晚）', '往苫小牧：每天兩班', '往月讀里：每天兩班（大雪停駛）']));
    for (let r = 0; r < 2; r++) bench(c, -3 + r * 0, 1.5 + r * 2, 6, true);
    bx(2, 1.2, 1.2, '#C8A060', HW - 2, 0.6, HD - 2.5); block(HW - 3, HW - 1, HD - 3.1, HD - 1.9, 'desk'); guest(c, HW - 2, HD - 3.6, 0, '月台小賣店的阿姨', ['「熱茶、便當、報紙。電車上很冷喔。」'], { top: '#8A4A3A' });
    guest(c, -2, 2.4, Math.PI, '等電車的人', ['「往皇嶺的那班又誤點了。」', '「從皇嶺來東鶴，要坐四個鐘頭。」']);
    lamp(-4, 4, 0, '#F0F4FF', 0.9, 14); lamp(5, 4, -2, '#F0F4FF', 0.8, 12);
  });

  // ---------- 街上的互動改成走進去 ----------
  const MAP = [[/^東鶴縣廳的服務台/, 'pref'], [/^衛兵詰所$/, 'guardhq'], [/世界中央銀行/, 'bank'], [/^東鶴醫院$/, 'hospital'], [/^東鶴郵局$/, 'post'], [/東鶴日報社/, 'paper'], [/劇場「東鶴座」/, 'theater'],
    [/德克斯凡百貨/, 'dept'], [/錢湯「松之湯」/, 'bath'], [/^東鶴寺$/, 'temple'], [/東鶴旅館/, 'hotel'], [/柏青哥「銀河」/, 'pachinko'], [/^遊樂場/, 'arcade'], [/德克斯凡便利商店/, 'konbini'],
    [/德克斯凡咖啡館/, 'cafe'], [/^德克斯凡商行$/, 'trade'], [/魔導燈具・零件行/, 'parts'], [/甘味處・和菓子/, 'sweets'], [/東鶴書房/, 'books'], [/定食屋・小町/, 'diner'], [/^理髮店$/, 'barber'],
    [/^寫真館$/, 'photo'], [/時計・眼鏡/, 'watch'], [/德克斯凡家電/, 'electro'], [/內科診所/, 'clinic'], [/河西超市/, 'super'], [/望月家道場/, 'dojo'], [/東鶴站・售票口/, 'trainst']];
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => {
    enter0(from, at);
    const tw = W.town; if (!tw) return;
    tw.inter.forEach(it => {
      if (it.follow || it.steal || typeof it.label !== 'string' || it.entered) return;
      const m = MAP.find(([re]) => re.test(it.label)); if (!m) return;
      const kind = m[1]; orig[kind] = orig[kind] || it.act; const act0 = it.act;
      it.entered = 1; it.door = 1; it.label = '走進' + PL[kind].name; it.act = () => { orig[kind] = act0; R.enterInterior(kind); };
    });
  };
})(window.R);
