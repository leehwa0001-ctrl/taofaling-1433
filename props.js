// 討伐令 1433：城裡可以互動的小東西、順手牽羊、視線條、通緝（有點像 GTA）
// 偷東西要花一點時間（按住空白鍵那一下之後，人站著不動才會偷完）。看得到你的人（攤販、店員、學徒、路人、衛兵）視線範圍會畫在地上；
// 被看見，「視線條」就往上漲；滿了就被抓包：東西拿不到、被通緝（星星）、衛兵追你。
// 甩掉衛兵：跑出他們的視線、躲一陣子，星星會一顆一顆退掉。被衛兵抓到：罰錢（付不起就關一晚）。
// 還有：抽籤、參拜、自動販賣機、翻垃圾桶、釣魚、咖啡館、零件行、兌換所……
(function (R) {
  const T = () => THREE;
  const $ = id => document.getElementById(id);
  const W = R.W, esc = s => R.esc(s);
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

  // ---------- 禮物、小東西（存在 S.gifts） ----------
  R.GIFTS = {
    dango: { name: '糰子', price: 2, desc: '菅婆婆烤的。' },
    dorayaki: { name: '銅鑼燒', price: 6, desc: '和菓子店的。' },
    fish: { name: '霜背鮒', price: 5, desc: '最便宜的河魚。' },
    notebook: { name: '記事本', price: 8, desc: '雜貨店的小冊子。' },
    strings: { name: '三味線的弦', price: 15, desc: '雜貨店的。' },
    tackle: { name: '釣具', price: 12, desc: '鉤子、浮標、線。' },
    oil: { name: '機油', price: 20, desc: '德克斯凡的機械用油。' },
    parts: { name: '零件', price: 25, desc: '德克斯凡的小齒輪、螺絲。' },
    rose: { name: '溫室玫瑰', price: 6, desc: '德克斯凡溫室種的，冬天也有。' },
    wrap: { name: '護帶', price: 10, desc: '手腕綁的布帶。' },
    tea: { name: '熱茶葉', price: 8, desc: '白藤堂的驅寒茶。' }
  };
  const S = () => R.S;
  const addGift = (k, n) => { const s = S(); s.gifts = s.gifts || {}; s.gifts[k] = (s.gifts[k] || 0) + (n || 1); };
  R.addGift = addGift;
  // 店家的價錢（排外、市集日、你偷過他們）
  const price = (base, shop) => { const m = R.priceMul ? R.priceMul(shop) : 1; if (m == null) return null; const E = R.eventsToday ? R.eventsToday() : {}; const grudge = (S().grudge || {})[shop] > S().day ? 1.5 : 1; return Math.max(1, Math.round(base * m * (E.market && shop !== 'guild' ? 0.8 : 1) * grudge)); };
  R.shopPrice = price;
  const refuse = who => R.townTalk(who, R.isDemon() ? ['（對方看到你的角，往後退了一步。）', '「……我們不賣東西給你。請你走。」'] : ['「今天不做你的生意。」']);

  // ---------- 偷東西 ----------
  // 城裡的（town 建的時候登記）、建築物裡的（interior 自己帶一份 list）
  let steals = [];
  R.addSteal = (o, list) => { const st = Object.assign({ left: o.max || 2 }, o); (list || steals).push(st); return st; };
  const C = { heat: 0, seen: 0, lostT: 0, ch: null };
  R.crime = C;
  // 難度倍數（vigilance.js 每一格算好放在 R.crimeK：居民越來越警惕、衛兵越來越難甩）
  const K1 = { range: 1, fov: 1, seen: 1, time: 1, look: 1, lost: 1 }, K = () => R.crimeK || K1;
  // 互動列表上的「偷」
  R.stealInter = st => ({ x: st.x, z: st.z, r: st.r, steal: st, get label() { return st.label + (st.left > 0 ? '' : '（已經空了）'); }, act: () => startSteal(st) });
  R.crimeReset = () => {
    const tw = W.town; if (!tw) return;
    steals.forEach(st => tw.inter.push(R.stealInter(st)));
    tw.cones = []; C.ch = null; C.seen = 0;
  };
  // 每次建城時重新登記（城會重蓋）
  const bt = R.buildTown;
  R.buildTown = scene => { steals = []; bt(scene); };
  const startSteal = st => {
    if (st.left <= 0) { R.toast('裡面已經空了。'); return; }
    if (C.ch) return;
    C.ch = { st, t: 0, x: W.P.x, z: W.P.z };
    R.toast('……（站著別動）');
  };
  // 這個人看不看得到你：在視線範圍（扇形）裡、中間沒有房子擋著
  const blocked = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 0.6); for (let i = 1; i < n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; for (const c of R.boxesNear(x, z)) if (c.on !== false && (c.tag === 'house' || c.tag === 'wall' || c.tag === 'in') && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true; } return false; };
  const faceOf = n => (n.h ? n.h.g.rotation.y : n.rot);
  const sees = (n, P) => {
    const w = n.watch; if (!w || n.busy) return 0;
    const k = K(), rg = w.range * (w.guard ? Math.max(1, k.range * 0.9) : k.range), dx = P.x - n.x, dz = P.z - n.z, d = Math.hypot(dx, dz); if (d > rg) return 0;
    const off = Math.abs(wrap(Math.atan2(dx, dz) - faceOf(n)));
    if (off > Math.min(2.6, w.fov * k.fov) && d > 1.4) return 0;
    if (blocked(n.x, n.z, P.x, P.z)) return 0;
    return 1 - d / rg * 0.7;
  };
  // 地上的視線扇形（靠近可以偷的東西時才畫）
  const coneFor = (ctx, n) => {
    ctx.cones = ctx.cones || [];
    let c = ctx.cones.find(v => v.n === n); if (c) return c;
    const w = n.watch, g = new (T().RingGeometry)(0.4, w.range, 18, 1, -w.fov, w.fov * 2), m = new (T().Mesh)(g, new (T().MeshBasicMaterial)({ color: '#FFD04A', transparent: true, opacity: 0.16, depthWrite: false, side: T().DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.05; W.scene.add(m); c = { n, m }; ctx.cones.push(c); return c;
  };
  // 站著的人會東張西望（偶爾轉身整理東西）：那就是下手的機會
  const lookAround = (n, dt) => {
    if (n.walk || n.chase || n.talkT > 0) return;
    n.lookT = (n.lookT || Math.random() * 3) - dt;
    if (n.lookT <= 0) { n.lookT = (1.8 + Math.random() * 3.2) / K().look; n.lookA = Math.random() < 0.28 ? n.rot + Math.PI : n.rot + (Math.random() - 0.5) * 2.2; }
    if (n.lookA != null) { const cur = n.h.g.rotation.y, d = wrap(n.lookA - cur); n.h.g.rotation.y = cur + d * Math.min(1, dt * 4); }
  };
  R.crimeStep = (dt, watchers, ctx) => {
    const P = W.P; if (!P) return;
    const list = (ctx && ctx.steals) || steals;
    watchers.forEach(n => lookAround(n, dt));
    // 附近有可以偷的東西：把看得到這裡的人的視線畫出來
    const nearSteal = list.some(st => st.left > 0 && Math.hypot(st.x - P.x, st.z - P.z) < 7);
    let seen = 0, seer = null;
    watchers.forEach(n => {
      const v = sees(n, P); if (v > seen) { seen = v; seer = n; }
      if (nearSteal && Math.hypot(n.x - P.x, n.z - P.z) < n.watch.range + 6) { const c = coneFor(ctx, n); c.m.visible = true; c.m.position.x = n.x; c.m.position.z = n.z; c.m.rotation.z = faceOf(n) - Math.PI / 2; c.m.material.color.set(v > 0 ? '#FF4A3A' : '#FFD04A'); c.m.material.opacity = v > 0 ? 0.26 : 0.14; }
      else if (ctx && ctx.cones) { const c = ctx.cones.find(v2 => v2.n === n); if (c) c.m.visible = false; }
    });
    // 偷到一半
    if (C.ch) {
      const ch = C.ch;
      if (Math.hypot(P.x - ch.x, P.z - ch.z) > 0.6 || P.sit) { C.ch = null; R.toast('沒偷成。'); }
      else {
        ch.t += dt;
        if (seen > 0) C.seen = Math.min(1, C.seen + dt * (seer && seer.watch.guard ? 2.6 : 1.7) * seen * (R.hoodOn && R.hoodOn() ? 0.8 : 1) * K().seen);
        if (C.seen >= 1) caught(ch.st, seer);
        else if (ch.t >= ch.st.time * K().time) done(ch.st);
      }
    } else C.seen = Math.max(0, C.seen - dt * 0.5);
    // 被通緝：衛兵追你；甩掉視線一陣子，星星會退掉
    if (C.heat > 0) {
      const guards = watchers.filter(n => n.watch.guard);
      let spotted = false;
      guards.forEach(g => {
        const d = Math.hypot(P.x - g.x, P.z - g.z), v = sees(g, P) || (d < 3 ? 1 : 0);
        if (v > 0) { spotted = true; g.chase = true; g.lastX = P.x; g.lastZ = P.z; }
        if (g.chase && R.guardMove) { R.guardMove(g, P, v > 0, dt); if (C.heat > 0 && Math.hypot(P.x - g.x, P.z - g.z) < 1.2) arrest(g); }   // vigilance.js：追、搜、包抄
        else if (g.chase) {
          const tx = g.lastX, tz = g.lastZ, a = Math.atan2(tx - g.x, tz - g.z), dd = Math.hypot(tx - g.x, tz - g.z), sp = 6.2;
          if (dd > 0.4) { g.x += Math.sin(a) * sp * dt; g.z += Math.cos(a) * sp * dt; const o = { x: g.x, z: g.z }; R.collide(o, 0.35); g.x = o.x; g.z = o.z; }
          g.h.g.position.set(g.x, 0, g.z); g.h.g.rotation.y = a; R.animHero(g.h, dd > 0.4 ? sp : 0, dt, false);
          if (d < 1.2) arrest(g);
          if (!spotted && dd < 0.6) g.chase = false;
        }
      });
      C.lostT = spotted ? 0 : C.lostT + dt;
      if (C.lostT > (6 + C.heat * 3) * K().lost) { C.heat--; C.lostT = 0; R.toast(C.heat > 0 ? '衛兵還在找你……' : '甩掉衛兵了。'); if (!C.heat) guards.forEach(g => { g.chase = false; if (g.patrol) { g.tx = g.x; g.tz = g.z; } }); }
    }
    // 魔族：路人看到你會躲開
    if (R.xenoLevel && R.xenoLevel() >= 3) watchers.forEach(n => { if (n.watch.civ && n.walk && Math.hypot(P.x - n.x, P.z - n.z) < 4 && !(n.flee > 0)) { n.flee = 2; const a = Math.atan2(n.x - P.x, n.z - P.z); n.tx = n.x + Math.sin(a) * 8; n.tz = n.z + Math.cos(a) * 8; } });
  };
  // 在建築物裡：躲著，通緝會慢慢退
  R.crimeHide = dt => { if (C.heat <= 0) return; C.lostT += dt; if (C.lostT > (6 + C.heat * 3) * K().lost) { C.heat--; C.lostT = 0; if (!C.heat) R.toast('外面的衛兵好像走了。'); } };
  const done = st => {
    C.ch = null; st.left--;
    const l = st.loot(); let what = '';
    if (l.mat) { S().mats[l.mat] = (S().mats[l.mat] || 0) + l.n; what = R.MATS[l.mat].name + ' ×' + l.n; }
    else if (l.gift) { addGift(l.gift, l.n); what = R.GIFTS[l.gift].name + ' ×' + l.n; }
    else if (l.potion) { S().potions[l.potion] = (S().potions[l.potion] || 0) + 1; what = l.potion === 'hp' ? '回復藥' : '魔力藥'; }
    else if (l.gold) { S().gold += l.gold; what = l.gold + ' 費拉'; }
    S().stats.stolen = (S().stats.stolen || 0) + 1;
    R.toast('偷到了：' + what + (C.seen > 0.5 ? '（好險）' : ''), '#E8A03A');
    if (Math.random() < 0.3 && R.addDeed) R.addDeed('西市口一帶發生小竊案，店家說「東西少了，卻沒看到是誰」。');
    R.save();
  };
  const caught = (st, who) => {
    C.ch = null; C.seen = 0;
    const name = who && who.name || '路人';
    if (st.owner === 'suga' || (who && who.watch.kind === 'suga')) {   // 菅婆婆：罵你一頓，還是給你一串
      addGift('dango', 1); S().rep = (S().rep || 0) - 1; S().gold = Math.max(0, S().gold - 2);
      R.townTalk('菅婆婆', ['「孩子，要吃就說。」', '（她把一串糰子塞進你手裡，敲了一下你的頭。）', '「兩費拉，從你口袋拿了。」']); R.save(); return;
    }
    C.heat = Math.min(3, C.heat + (who && who.watch.guard ? 2 : 1)); C.lostT = 0;
    S().rep = (S().rep || 0) - 2; S().grudge = S().grudge || {}; S().grudge[st.owner] = S().day + 3;
    R.banner('被看見了！', name + '大喊：「小偷！」——衛兵往這裡來了（通緝 ' + '★'.repeat(C.heat) + '）');
    if (W.town && !W.inside) (W.town.watchers || []).forEach(n => { if (n.watch.guard && Math.hypot(n.x - W.P.x, n.z - W.P.z) < 45) { n.chase = true; n.lastX = W.P.x; n.lastZ = W.P.z; } });
    R.save();
  };
  const arrest = g => {
    const fine = 60 * C.heat + 20, S0 = S();
    C.heat = 0; C.lostT = 0; if (W.town) (W.town.watchers || []).forEach(n => { n.chase = false; });
    if (S0.gold >= fine) { S0.gold -= fine; R.townTalk('東鶴的衛兵', ['「抓到了。」', '（被押到衛兵所，罰了 ' + fine + ' 費拉。）', '「再有下次，就送公會的懲戒委員會。」']); }
    else { S0.gold = 0; R.townTalk('東鶴的衛兵', ['「抓到了。……錢不夠？那就在拘留所待一晚。」', '（在拘留所過了一晚。）']); if (R.advanceDays) R.advanceDays(1); }
    if (R.addDeed) R.addDeed('西市口的竊案嫌犯被衛兵當場逮捕。據說是一名勇者。');
    S0.rep = (S0.rep || 0) - 3; if (R.onArrest) R.onArrest(); R.save();
    if (R.townHud) R.townHud(true);
  };
  R.crimeSees = sees; R.crimeCaught = caught;   // 扒路人的錢包（streetcrime.js）也用同一套視線、抓包
  R.crimeHud = () => (C.heat > 0 ? '<span class="wanted">通緝 <b>' + '★'.repeat(C.heat) + '☆'.repeat(3 - C.heat) + '</b></span>' : '') + (C.ch || C.seen > 0.02 ? '<span class="seen">視線<i><em style="width:' + Math.round(C.seen * 100) + '%"></em></i></span>' : '');
  R.crimeMinimap = (x, pt) => { if (C.heat <= 0 || !W.town) return; (W.town.watchers || []).forEach(n => { if (!n.watch.guard) return; const m = pt(n.x, n.z); x.fillStyle = n.chase ? '#FF3A3A' : '#5A8ACF'; x.beginPath(); x.arc(m[0], m[1], 3.5, 0, 7); x.fill(); }); };

  // ---------- 城裡的小東西 ----------
  R.omikuji = () => {
    const s = S(); if (s.gold < 5) { R.toast('5 費拉都沒有……'); return; }
    if (s.omikujiDay === s.day) { R.townTalk('神社', ['今天已經抽過了。']); return; }
    s.gold -= 5; s.omikujiDay = s.day;
    const r = R.dayRand ? R.dayRand('kuji') : Math.random(), F = r < 0.12 ? ['大吉', '下一趟遺跡：傷害 +10%、寶箱好一點。', { dmg: 0.1, luck: 1 }] : r < 0.4 ? ['吉', '下一趟遺跡：生命 +8%。', { hp: 0.08 }] : r < 0.75 ? ['小吉', '沒什麼特別的事。', null] : r < 0.93 ? ['凶', '下一趟遺跡：佩特拉比較容易注意到你。（把籤綁在樹上，就不算數了。）', { aware: 0.2 }] : ['大凶', '……今天別下遺跡比較好。', { aware: 0.35, dmgTaken: 0.1 }];
    s.buff = F[2] ? { kind: 'kuji', b: F[2], until: s.day } : null; R.save();
    R.sheet('<p class="kicker">東鶴神社・籤</p><h2>' + F[0] + '</h2><p>' + esc(F[1]) + '</p>', '<div class="row"><button type="button" class="btn pri" id="kj-x">收好</button>' + (r >= 0.75 ? '<button type="button" class="btn" id="kj-tie">綁在樹上</button>' : '') + '</div>');
    $('kj-x').onclick = R.closeSheet; if ($('kj-tie')) $('kj-tie').onclick = () => { s.buff = null; R.save(); R.closeSheet(); R.toast('把籤綁在神社的樹上了。'); };
  };
  R.shrinePray = () => { const s = S(); if (s.gold >= 1) s.gold -= 1; R.townTalk('東鶴神社', ['投了一枚白條，拍兩下手。', R.today && R.eventsToday().martial ? '今天神社也有衛兵站崗。' : '鈴鐺的聲音在雪裡傳得很遠。']); R.save(); };
  R.vendingBuy = () => {
    const p = price(6, 'dex'); if (p == null) { refuse('自動販賣機旁的店員'); return; }
    const s = S(); if (s.gold < p) { R.toast('錢不夠。'); return; }
    s.gold -= p; s.buff = { kind: 'drink', b: { regen: 0.4 }, until: s.day }; R.save();
    R.toast('喀啦一聲掉下來一罐熱的。（今天下遺跡：慢慢回復生命）');
  };
  R.searchTrash = sx => {
    const s = S(), key = 'trash' + sx; s.searched = s.searched || {}; if (s.searched[key] === s.day) { R.toast('剛翻過了。'); return; }
    s.searched[key] = s.day; const r = Math.random();
    if (r < 0.15) { s.gold += 1 + Math.floor(Math.random() * 4); R.toast('撿到幾枚白條。'); }
    else if (r < 0.3) { s.mats.branch = (s.mats.branch || 0) + 1; R.toast('一根還能用的樹枝。'); }
    else if (r < 0.36 && R.addGift) { addGift('notebook', 1); R.toast('一本只寫了兩頁的記事本。'); }
    else R.toast('只有菜葉和碎紙。');
    R.save();
  };
  R.cafeSheet = () => {
    const p = price(12, 'dex'); if (p == null) { refuse('咖啡館的店員'); return; }
    R.sheet('<p class="kicker">德克斯凡咖啡館</p><h2>熱飲</h2><p class="note">德克斯凡的機器煮的。喝了下一趟遺跡有加成（當天有效）。</p><div class="recipes">'
      + [['coffee', '黑咖啡', '技能冷卻 −10%', { skillCd: 0.1 }], ['cocoa', '熱可可', '生命 +6%', { hp: 0.06 }], ['tea', '紅茶', '魔力 +12%', { mp: 0.12 }]].map(([k, n, d, b]) => '<div class="recipe"><b>' + n + '</b><small>' + d + '</small><button type="button" class="btn pri" data-cafe="' + k + '"' + (S().gold < p ? ' disabled' : '') + '>點一杯（' + p + ' 費拉）</button></div>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn" id="cf-x">走了</button></div>');
    $('cf-x').onclick = R.closeSheet;
    const B = { coffee: { skillCd: 0.1 }, cocoa: { hp: 0.06 }, tea: { mp: 0.12 } };
    document.querySelectorAll('[data-cafe]').forEach(b => { b.onclick = () => { const s = S(); if (s.gold < p) return; s.gold -= p; s.buff = { kind: 'cafe', b: B[b.dataset.cafe], until: s.day }; R.save(); R.closeSheet(); R.toast('暖和多了。（今天下遺跡有效）'); }; });
  };
  // 零件行、德克斯凡商行：禮物用的東西
  R.dexShop = k => {
    if (k === 'trade') { const dd = R.today(); if (dd.abs >= R.absOf(2836, 10, 13) && dd.abs < R.absOf(2836, 10, 27)) { R.townTalk('德克斯凡商行', ['門上貼著公告：「本店經理遇害，暫停營業。」', '玻璃門後面的燈全都熄了。']); return; } }
    giftShop(k === 'trade' ? '德克斯凡商行' : '魔導燈具・零件行', 'dex', k === 'trade' ? ['oil', 'parts', 'rose'] : ['oil', 'parts', 'rose']);
  };
  R.stallSheet = (who, lines) => {
    const items = who === '和菓子店的老闆娘' ? ['dorayaki', 'dango'] : who === '魚販' ? ['fish'] : who === '雜貨店的老闆' ? ['notebook', 'strings', 'tackle', 'wrap'] : who === '菜攤的大叔' ? [] : [];
    if (!items.length) { R.townTalk(who, lines); return; }
    giftShop(who, 'stall', items, lines);
  };
  R.sugaSheet = () => giftShop('菅婆婆', 'suga', ['dango'], ['「糰子一串兩費拉。今天冷，吃熱的。」', R.isDemon && R.isDemon() ? '「角？孩子就是孩子。吃吧。」' : '「下遺跡的孩子，回來記得來露個臉。」']);
  const giftShop = (who, shop, items, lines) => {
    const s = S(), mul = price(100, shop);
    if (mul == null) { refuse(who); return; }
    R.sheet('<p class="kicker">' + esc(who) + '</p>' + (lines || []).map(l => '<p>' + esc(l) + '</p>').join('') + (mul > 100 ? '<p class="note">（價錢比牌子上寫的貴。）</p>' : mul < 100 ? '<p class="note">（今天是市集日，便宜一點。）</p>' : '')
      + '<div class="recipes">' + items.map(k => { const g = R.GIFTS[k], p = price(g.price, shop); return '<div class="recipe"><b>' + esc(g.name) + '</b><small>' + esc(g.desc) + '・手上有 ' + ((s.gifts || {})[k] || 0) + '</small><button type="button" class="btn pri" data-gb="' + k + '"' + (s.gold < p ? ' disabled' : '') + '>買（' + p + ' 費拉）</button></div>'; }).join('') + '</div>',
      '<div class="row"><button type="button" class="btn" id="gs-x">好了</button></div>');
    $('gs-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-gb]').forEach(b => { b.onclick = () => { const k = b.dataset.gb, p = price(R.GIFTS[k].price, shop); if (s.gold < p) return; s.gold -= p; addGift(k, 1); R.save(); giftShop(who, shop, items, lines); R.toast('買了：' + R.GIFTS[k].name); }; });
  };
  // 兌換所：驗貨幣（私人委託拿到的赤金是真是假）
  R.exchangeSheet = () => {
    const s = S(), fakes = s.fake || 0;
    R.sheet('<p class="kicker">西市兌換所</p><h2>驗貨幣</h2><p>「昭旭的舊銅錢一天比一天不值錢。要換公會的費拉，還是要驗東西？」</p>'
      + '<p class="note">費拉的硬幣：白條 1、貝勒 5、綠幣 10、碧光 50、黃十 100、四文 500、赤金 1000、彩碧 5000。赤金的鳴文是紅色的漩渦。</p>'
      + (fakes ? '<p class="hand">你身上有 ' + fakes + ' 枚私人委託付的「赤金」。掌櫃拿起來對著燈看：鳴文是藍色的直紋——假的。</p>' : '<p class="note">身上沒有可疑的錢。</p>'),
      '<div class="row">' + (fakes ? '<button type="button" class="btn pri" id="ex-report">交給衛兵（假幣）</button>' : '') + '<button type="button" class="btn" id="ex-x">好</button></div>');
    $('ex-x').onclick = R.closeSheet;
    if ($('ex-report')) $('ex-report').onclick = () => { s.fake = 0; const b = 30; s.gold += b; s.rep = (s.rep || 0) + 1; R.addDeed && R.addDeed('有勇者把私人委託收到的假赤金交給衛兵。衛兵說：「最近這種很多。」'); R.save(); R.closeSheet(); R.toast('衛兵給了 ' + b + ' 費拉的通報獎金。'); };
  };
  // 南橋下釣魚：看準時機收線
  R.fishing = () => {
    const s = S(); if (!((s.gifts || {}).tackle) && !s.rod) { R.townTalk('南橋下', ['沒有釣具。', '（雜貨店有賣。）']); return; }
    if (s.fishDay === s.day && (s.fishN || 0) >= 3) { R.townTalk('南橋下', ['今天的魚好像都不咬了。']); return; }
    if (s.fishDay !== s.day) { s.fishDay = s.day; s.fishN = 0; }
    let t = 0, bite = 1.2 + Math.random() * 2.5, tm = 0, done2 = false;
    R.sheet('<p class="kicker">南橋下</p><h2>釣魚</h2><p id="fs-t">把線拋進冰縫裡……等浮標沉下去，馬上收線。</p><div class="meter" style="height:14px"><i id="fs-bar" style="width:0;background:#7FC8FF"></i></div>', '<div class="row"><button type="button" class="btn pri" id="fs-pull">收線！</button><button type="button" class="btn" id="fs-x">不釣了</button></div>');
    const iv = setInterval(() => { if (done2 || !$('fs-bar')) { clearInterval(iv); return; } t += 0.05; if (t > bite) { tm += 0.05; $('fs-t').textContent = '浮標沉下去了！'; $('fs-bar').style.width = Math.min(100, tm / 0.7 * 100) + '%'; if (tm > 0.7) { done2 = true; clearInterval(iv); $('fs-t').textContent = '……魚跑了。'; } } }, 50);
    $('fs-pull').onclick = () => { if (done2) { R.closeSheet(); return; } done2 = true; clearInterval(iv); if (t > bite && tm <= 0.7) { s.fishN = (s.fishN || 0) + 1; addGift('fish', 1); R.save(); $('fs-t').textContent = '釣到一條霜背鮒！'; } else $('fs-t').textContent = '收得太早了。'; $('fs-pull').textContent = '好'; };
    $('fs-x').onclick = () => { done2 = true; clearInterval(iv); R.closeSheet(); };
  };
  R.onsen = () => { const s = S(); if (s.onsenDay === s.day) { R.townTalk('湯山村', ['今天已經泡過了。']); return; } s.onsenDay = s.day; s.buff = { kind: 'onsen', b: { hp: 0.05, regen: 0.3 }, until: s.day }; R.save(); R.townTalk('湯山村', ['熱水從腳趾一路暖到頭頂。', '（今天下遺跡：生命 +5%，慢慢回復）']); };
  // 手上的加成（籤、熱飲、溫泉）套進遺跡裡的數值；只有當天有效
  const cp = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp(cls), s = S(), bf = s && s.buff; if (!bf || !W.run || bf.until !== s.day) return P;
    const b = bf.b || {}; if (b.hp) P.hpMax = Math.round(P.hpMax * (1 + b.hp)); if (b.mp) P.mpMax = Math.round(P.mpMax * (1 + b.mp)); if (b.dmg) P.dmgMult *= 1 + b.dmg; if (b.skillCd) P.skillCdMult *= 1 - b.skillCd; if (b.regen) P.regen += b.regen; if (b.aware) P.calm -= b.aware;
    return P;
  };
})(window.R);
