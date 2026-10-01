// 遺跡生物（第三批）：補到七十種（作者）。名字都是自己取的，不用妖怪的原名。
// 每一種有自己的點陣圖（R.BEAST_ART，朝右畫）；行為大多沿用原本的（combat.js、monsters2.js），新的五種：
//  quills（晶刺蝟：縮成一團射出一圈晶刺）、mortar（酸泡：遠遠拋出酸液，落地留下酸池）、sting（裂地蠍：拉一條線再甩尾）、
//  spin（鐘擺刃：轉起來砍一圈）、rally（號角骸：吹號角讓附近的生物變兇——先打牠）。泥偶打倒會裂成兩個小泥偶。
// 分到哪些分級在最下面；凍原、火山、沙漠、深海各多一種只在那個環境出現的生物。
(function (R) {
  const W = () => R.W, ART = R.BEAST_ART, rnd = Math.random;
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const targets = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed)).filter(t => t && !t.dead); };

  // ---------- 資料 ----------
  const NEW = {
    mossball: { name: '苔團', hp: 18, dmg: 5, speed: 2.2, xp: 3, size: 0.6, ai: 'chase', color: '#4A7A3A', eye: '#F2F0D0', desc: '長滿青苔的圓球，滾來滾去。哈米莉亞級的遺跡裡最常見，不太會主動惹人。' },
    lampmoth: { name: '燈蛾', hp: 12, dmg: 5, speed: 4.5, xp: 3, size: 0.6, ai: 'swoop', fly: 1, color: '#D8CCB0', eye: '#FFE070', desc: '肚子會發光的大蛾。繞著光飛，突然俯衝下來撞人。' },
    stonesnail: { name: '石蝸', hp: 40, dmg: 7, speed: 1.4, xp: 5, size: 0.8, ai: 'chase', armor: 0.4, color: '#8A8478', eye: '#1A1410', desc: '背著石殼的蝸牛，很慢、很硬。殼擋掉四成的傷害。' },
    crysthog: { name: '晶刺蝟', hp: 38, dmg: 8, speed: 2.6, xp: 8, size: 0.6, ai: 'quills', color: '#6A5A4A', eye: '#9AE0FF', desc: '背上長著水晶刺。靠得太近，牠會縮成一團把刺射向四面八方——腳下出現藍圈就退開。' },
    shadelizard: { name: '影蜥', hp: 30, dmg: 11, speed: 3.8, xp: 8, size: 0.7, ai: 'pounce', color: '#2A2434', eye: '#FFD04A', desc: '貼著地面爬的黑蜥蜴，在暗處很難看見。蹲低之後會撲過來。' },
    bonebird: { name: '骨鳥', hp: 22, dmg: 8, speed: 3.6, xp: 8, size: 0.6, ai: 'kite', shoot: 0.5, shot: 'feather', fly: 1, color: '#E8E0CC', eye: '#FF5A3A', desc: '只剩骨架的鳥，飛在半空，射出削尖的骨羽。' },
    muddoll: { name: '泥偶', hp: 46, dmg: 9, speed: 2.2, xp: 9, size: 0.8, ai: 'chase', color: '#7A5A3A', eye: '#FFB04A', desc: '泥巴捏成的人形。打倒之後會裂成兩個小泥偶，小的也要打。' },
    muddoll_s: { name: '小泥偶', hp: 14, dmg: 5, speed: 3, xp: 2, size: 0.5, ai: 'chase', noDex: 1, color: '#7A5A3A', eye: '#FFB04A', desc: '' },
    bellcricket: { name: '鈴蟲', hp: 9, dmg: 4, speed: 5, xp: 2, size: 0.4, ai: 'chase', pack: 3, color: '#6A8A3A', eye: '#E8D86A', desc: '翅膀會發出鈴聲的蟋蟀，三隻一群。很弱，但跳得很快。' },
    rustknight: { name: '鏽甲兵', hp: 70, dmg: 12, speed: 2.2, xp: 11, size: 0.8, ai: 'guard', armor: 0.15, color: '#8A5A3A', eye: '#FFB04A', desc: '生鏽的鎧甲裡沒有人。舉著盾的時候從正面打不太進去，繞到旁邊或背後。' },
    acidbubble: { name: '酸泡', hp: 26, dmg: 8, speed: 2, xp: 8, size: 0.65, ai: 'mortar', color: '#8AE04A', eye: '#1A3010', desc: '會冒泡的綠色黏液。遠遠地把酸液拋過來，落地的地方會留下一攤酸，站在上面會一直受傷。' },
    echobat: { name: '回音蝠', hp: 14, dmg: 6, speed: 5.2, xp: 3, size: 0.5, ai: 'swoop', fly: 1, pack: 3, color: '#2A2430', eye: '#FF5A5A', desc: '靠回音找人的蝙蝠，三隻一群，輪流俯衝。' },
    mirrorgolem: { name: '鏡魔像', hp: 180, dmg: 18, speed: 2.6, xp: 26, size: 1.3, ai: 'charge', armor: 0.3, elite: 1, coreChance: 0.18, color: '#B8C8D8', eye: '#7FD8FF', desc: '胸口嵌著一面大鏡子的石像。低頭之後會往前猛衝，撞牆會暈一下——那時候打牠。摩爾斯級以上才看得到。' },
    riftscorp: { name: '裂地蠍', hp: 64, dmg: 14, speed: 3, xp: 13, size: 0.9, ai: 'sting', color: '#8A3A2A', eye: '#FFD04A', desc: '紅色的大蠍子，總是保持兩、三公尺。地上拉出一條線就是要甩尾了，被刺中會變慢。' },
    mistwisp: { name: '霧燈靈', hp: 30, dmg: 12, speed: 3, xp: 11, size: 0.6, ai: 'blink', fly: 1, color: '#C8D8E8', eye: '#3A4A6A', desc: '提燈一樣的白霧。會在你背後亮起來：腳下出現小圈就快轉身或翻滾。' },
    bonehound: { name: '蝕骨犬', hp: 34, dmg: 11, speed: 4.6, xp: 10, size: 0.75, ai: 'pounce', pack: 2, color: '#E8E0CC', eye: '#C83A3A', desc: '只剩骨頭的獵犬，兩隻一起。一隻引開你，另一隻從旁邊撲上來。' },
    thunderspider: { name: '雷晶蛛', hp: 40, dmg: 11, speed: 4.6, xp: 11, size: 0.7, ai: 'zap', color: '#3A3060', eye: '#FFE04A', desc: '背上長著雷晶的蜘蛛。直線衝刺，留下一條會電人的痕跡。' },
    bladewheel: { name: '鐘擺刃', hp: 90, dmg: 14, speed: 1.6, xp: 14, size: 1, ai: 'spin', armor: 0.25, color: '#8A8A92', eye: '#FFD04A', desc: '一圈刀刃圍著一顆眼睛的機關生物。地上出現大圈就是要轉起來了，轉的時候靠近會被砍。' },
    blackmaw: { name: '黑泥巨口', hp: 80, dmg: 18, speed: 2.4, xp: 14, size: 1.2, ai: 'ambush', color: '#1A1418', eye: '#FFD04A', desc: '平常是一攤黑泥，人走近才張開一張大嘴咬下去。看到地上有不自然的黑泥就繞開。' },
    hornbones: { name: '號角骸', hp: 50, dmg: 6, speed: 2.4, xp: 14, size: 0.8, ai: 'rally', color: '#5A3A4A', eye: '#C8A040', desc: '吹著骨號角的骸骨。號角一響，附近的遺跡生物都會變快、變痛——先打牠。' },
    ashcrow: { name: '灰燼鴉', hp: 26, dmg: 9, speed: 4, xp: 10, size: 0.6, ai: 'kite', shoot: 0.45, fan: 3, shot: 'fire', fly: 1, color: '#2A2A30', eye: '#FFD04A', desc: '羽毛末端燒著火的烏鴉，一次甩出三團火星。' },
    bonecentipede: { name: '白骨百足', hp: 260, dmg: 20, speed: 3.4, xp: 34, size: 1.5, ai: 'charge', armor: 0.2, elite: 1, coreChance: 0.22, color: '#E8E0CC', eye: '#C83A3A', desc: '一節一節的白骨連成的百足。會低頭猛衝，衝完要喘一下。克森特級才看得到。' },
    icewarden: { name: '冰棺守', hp: 110, dmg: 15, speed: 2, xp: 18, size: 1, ai: 'guard', armor: 0.3, env: 'snow', color: '#CFE6FF', eye: '#3A8AFF', desc: '只在凍原環境出現。棺材一樣的冰塊站起來守著路，正面幾乎打不動。' },
    lavaturtle: { name: '熔岩龜', hp: 140, dmg: 15, speed: 1.6, xp: 20, size: 1.1, ai: 'drum', armor: 0.35, env: 'volcano', color: '#3A2A24', eye: '#FFD04A', desc: '只在火山環境出現。殼上流著熔岩，跺腳打出一圈往外擴的熱浪——翻滾穿過去。' },
    sandsinker: { name: '沙沉蟲', hp: 70, dmg: 14, speed: 3, xp: 14, size: 1, ai: 'burrow', env: 'desert', color: '#C8A870', eye: '#1A1410', desc: '只在沙漠環境出現。在沙子底下游，從腳下鑽出來咬人。' },
    abyssarm: { name: '深淵觸手', hp: 100, dmg: 12, speed: 0, xp: 15, size: 1.1, ai: 'turret', env: 'deep', color: '#3A5A6A', eye: '#FFD04A', desc: '只在深海環境出現。從地板裂縫伸出來的觸手，不會移動；會吐東西，也會從你腳下纏上來。' },
    voidwalker: { name: '虛空行者', hp: 220, dmg: 22, speed: 3.2, xp: 32, size: 1.1, ai: 'blink', elite: 1, coreChance: 0.22, color: '#140E1C', eye: '#8A5AFF', desc: '胸口開著一個洞的高大人影，一眨眼就到你背後。克森特級才看得到。' },
    twinshade: { name: '雙生影', hp: 44, dmg: 12, speed: 4.2, xp: 12, size: 0.6, ai: 'pounce', pack: 2, color: '#2A2434', eye: '#FF8AE0', desc: '小孩模樣的影子，總是兩個一起出現，一前一後撲過來。' },
    corebeast: { name: '晶核獸', hp: 260, dmg: 20, speed: 3, xp: 34, size: 1.4, ai: 'thunder', elite: 1, coreChance: 0.28, color: '#5A3A6A', eye: '#FFE04A', desc: '背上長滿粉紅晶柱的四腳獸，體內有一顆很大的魔力核心。腳下出現圈就是要落雷了。克森特級才看得到。' },
    judgeeye: { name: '審判之眼', hp: 60, dmg: 12, speed: 2.4, xp: 16, size: 0.8, ai: 'kite', shoot: 0.35, fan: 7, shot: 'ering', fly: 1, color: '#F0E8E0', eye: '#C83A3A', desc: '套著金環的大眼睛，飄在半空，一次射出七發扇形的光彈。' }
  };
  Object.keys(NEW).forEach(id => { R.ENEMIES[id] = Object.assign({ ref: '' }, NEW[id]); });

  // ---------- 點陣圖（同 monsters2.js 的畫法：用形狀畫，轉成字串，朝右） ----------
  const grid = (w, h) => {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    const o = {
      p(x, y, c) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c; },
      rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) o.p(x + i, y + j, c); },
      line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) o.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
      ell(cx, cy, rx, ry, c, f) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const k = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (k <= 1.05 && (!f || f(x, y))) o.p(x, y, c); } },
      disc(cx, cy, r, c) { o.ell(cx, cy, r, r, c); },
      rows: () => g.map(r => r.join(''))
    };
    return o;
  };
  const add = (id, pal, w, h, draw) => { const fr = [0, 1].map(f => { const G = grid(w, h); draw(G, f); return G.rows(); }); ART[id] = { pal, a: fr[0], b: fr[1] }; };

  add('mossball', { g: '#4A7A3A', G: '#6A9A4A', d: '#2E4A24', e: '#F2F0D0', l: '#9ACF6A' }, 13, 11, (G, fr) => {
    const o = fr ? 1 : 0; G.disc(6, 5 + o, 4.6, 'g'); G.ell(5, 3 + o, 2.5, 1.4, 'G'); G.p(3, 1 + o, 'l'); G.p(9, 1 + o, 'l'); G.p(11, 4 + o, 'l'); G.p(8, 5 + o, 'e'); G.p(10, 5 + o, 'e'); G.line(2, 10, 10, 10, 'd');
  });
  add('lampmoth', { w: '#D8CCB0', W: '#A89878', b: '#5A4A3A', y: '#FFE070', e: '#1A1410' }, 15, 12, (G, fr) => {
    if (fr) { G.ell(4, 7, 3.5, 2, 'w'); G.ell(11, 7, 3.5, 2, 'w'); G.p(4, 7, 'W'); G.p(11, 7, 'W'); } else { G.ell(4, 4, 3.5, 2.6, 'w'); G.ell(11, 4, 3.5, 2.6, 'w'); G.p(4, 4, 'W'); G.p(11, 4, 'W'); }
    G.ell(7.5, 6, 1.5, 3, 'b'); G.ell(7.5, 9.5, 1.3, 1.6, 'y'); G.line(7, 3, 5, 0, 'b'); G.line(8, 3, 10, 0, 'b'); G.p(9, 4, 'e');
  });
  add('stonesnail', { s: '#8A8478', S: '#6A6458', b: '#C8B898', B: '#A89878', e: '#1A1410' }, 16, 11, (G, fr) => {
    G.rect(1, 8, fr ? 14 : 13, 2, 'b'); G.rect(11, 5, 3, 3, 'b'); G.line(12, 5, 13, 2, 'B'); G.line(14, 5, 15, 2, 'B'); G.p(13, 1, 'e'); G.p(15, 1, 'e');
    G.disc(6, 4.5, 4, 's'); G.p(6, 4, 'S'); G.p(7, 5, 'S'); G.p(5, 5, 'S'); G.p(6, 3, 'S'); G.p(4, 3, 'S'); G.line(2, 9, 10, 9, 'B');
  });
  add('crysthog', { a: '#6A5A4A', c: '#9AE0FF', C: '#5AB8E0', n: '#1A1410', s: '#C8B898' }, 14, 10, (G, fr) => {
    G.ell(6, 6, 5, 3, 'a'); for (let x = 2; x <= 10; x += 2) { G.line(x, 4, x - 1, 0, x % 4 ? 'c' : 'C'); }
    G.ell(11, 6, 2, 1.6, 's'); G.p(13, 7, 'n'); G.p(11, 5, 'n');
    if (fr) { G.p(4, 9, 'a'); G.p(9, 9, 'a'); } else { G.p(3, 9, 'a'); G.p(10, 9, 'a'); }
  });
  add('shadelizard', { k: '#2A2434', K: '#4A4058', e: '#FFD04A', t: '#3A3448' }, 18, 8, (G, fr) => {
    G.line(0, fr ? 3 : 5, 5, 4, 't'); G.line(1, fr ? 4 : 5, 5, 5, 't'); G.ell(9, 4, 4.2, 1.7, 'k'); G.ell(14.5, 3.5, 2.3, 1.4, 'k'); G.p(16, 3, 'e'); G.p(8, 3, 'K'); G.p(10, 3, 'K'); G.p(12, 3, 'K');
    (fr ? [6, 12] : [7, 11]).forEach(x => G.rect(x, 5, 1, 2, 'k'));
  });
  add('bonebird', { b: '#E8E0CC', B: '#B8AE98', k: '#2A2420', e: '#FF5A3A' }, 16, 13, (G, fr) => {
    for (let i = 0; i < 4; i++) G.line(7, 6, 1 + i, fr ? 10 - i * 0.5 : 1 + i * 1.5, i % 2 ? 'B' : 'b');
    G.ell(8, 7, 3, 2, 'B'); G.line(6, 7, 10, 7, 'k'); G.disc(12, 5, 2, 'b'); G.p(12, 5, 'e'); G.line(14, 5, 15, 6, 'B'); G.line(7, 9, 7, 12, 'B'); G.line(9, 9, 9, 12, 'B');
  });
  const mud = (G, fr, s) => {
    const k = s || 1; G.ell(6 * k, 10 * k, 4.5 * k, 5 * k, 'm'); G.disc(6 * k, 4 * k, 3 * k, 'm'); G.p(3 * k, 14 * k, 'M'); G.p(9 * k, 15 * k, 'M');
    G.p(7 * k, 4 * k, 'e'); G.p(9 * k, 4 * k, 'e'); G.line(6 * k, 6 * k, 8 * k, 6 * k, 'd');
    G.line(2 * k, 9 * k, 0, (fr ? 12 : 11) * k, 'M'); G.line(10 * k, 9 * k, 12 * k, (fr ? 11 : 12) * k, 'M'); G.rect(4 * k, 15 * k, 2, 2, 'd'); G.rect(7 * k, 15 * k, 2, 2, 'd');
  };
  add('muddoll', { m: '#7A5A3A', M: '#5A4028', d: '#3A2818', e: '#FFB04A' }, 13, 17, (G, fr) => mud(G, fr, 1));
  add('muddoll_s', { m: '#7A5A3A', M: '#5A4028', d: '#3A2818', e: '#FFB04A' }, 9, 12, (G, fr) => mud(G, fr, 0.68));
  add('bellcricket', { g: '#6A8A3A', G: '#8AAA4A', k: '#2A3018', y: '#E8D86A' }, 12, 8, (G, fr) => {
    G.ell(5, 4, 4, 1.8, 'g'); G.ell(4, 3, 3, 1.2, 'G'); G.disc(9, 4, 1.6, 'g'); G.line(10, 3, 11, 0, 'k'); G.p(5, 2, 'y'); G.p(10, 4, 'k');
    G.line(3, 5, fr ? 1 : 2, 7, 'k'); G.line(6, 5, 6, 7, 'k'); G.line(8, 5, fr ? 9 : 8, 7, 'k');
  });
  add('rustknight', { r: '#8A5A3A', R: '#6A4028', s: '#A8A098', k: '#2A2420', e: '#FFB04A', w: '#C8C0B0' }, 14, 21, (G, fr) => {
    G.line(2, 7, 1, 16, 'w'); G.rect(4, 1, 5, 5, 'r'); G.rect(5, 3, 4, 1, 'k'); G.p(7, 3, 'e'); G.rect(3, 6, 7, 8, 'r'); G.line(3, 9, 9, 9, 'R'); G.line(3, 12, 9, 12, 'R');
    G.rect(9, 7, 4, 7, 's'); G.rect(10, 8, 2, 5, 'w');
    if (fr) { G.rect(4, 14, 2, 6, 'R'); G.rect(7, 14, 2, 5, 'R'); } else { G.rect(4, 14, 2, 5, 'R'); G.rect(7, 14, 2, 6, 'R'); }
  });
  add('acidbubble', { a: '#8AE04A', A: '#5AB02A', w: '#E8FFC8', e: '#1A3010' }, 12, 12, (G, fr) => {
    const o = fr ? 1 : 0; G.ell(6, 6 + o * 0.5, 4.6, 4.6 - o * 0.4, 'a'); G.ell(4, 4, 1.5, 1, 'w'); G.p(6, 8, 'A'); G.p(3, 7, 'A'); G.p(8, 9, 'A'); G.p(7, 5, 'e'); G.p(9, 5, 'e'); G.line(2, 11, 9, 11, 'A');
  });
  add('echobat', { k: '#2A2430', K: '#4A4058', e: '#FF5A5A' }, 15, 9, (G, fr) => {
    for (let i = 0; i < 3; i++) { G.line(6, 4, 0 + i, fr ? 7 - i : 1 + i, 'K'); G.line(8, 4, 14 - i, fr ? 7 - i : 1 + i, 'K'); }
    G.ell(7, 4.5, 1.6, 2.2, 'k'); G.p(6, 1, 'k'); G.p(8, 1, 'k'); G.p(8, 4, 'e');
  });
  add('mirrorgolem', { s: '#B8C8D8', S: '#8898B0', d: '#5A6878', w: '#F0F8FF', e: '#7FD8FF' }, 21, 24, (G, fr) => {
    G.rect(5, 7, 11, 10, 'S'); G.rect(3, 6, 15, 3, 's'); G.rect(8, 9, 5, 6, 'w'); G.line(9, 10, 11, 13, 's'); G.rect(8, 2, 5, 5, 's'); G.rect(9, 4, 3, 1, 'e');
    G.rect(1, 9, 3, 9, 'd'); G.rect(17, 9, 3, 9, 'd');
    if (fr) { G.rect(6, 17, 3, 6, 'd'); G.rect(12, 17, 3, 5, 'd'); } else { G.rect(6, 17, 3, 5, 'd'); G.rect(12, 17, 3, 6, 'd'); }
  });
  add('riftscorp', { r: '#8A3A2A', R: '#B85A3A', k: '#2A1410', y: '#FFD04A' }, 22, 12, (G, fr) => {
    G.line(6, 7, 2, 4, 'r'); G.line(2, 4, 4, 1, 'r'); G.line(4, 1, 8, 1, 'r'); G.p(9, 2, 'y'); G.p(9, 1, 'y');
    G.ell(11, 7, 5, 2.2, 'r'); [8, 10, 12].forEach(x => G.line(x, 5, x, 9, 'R'));
    G.ell(17.5, 6, 2, 1.5, 'R'); G.line(18, 5, 21, fr ? 3 : 4, 'R'); G.line(18, 7, 21, fr ? 8 : 7, 'R'); G.p(16, 6, 'y');
    (fr ? [7, 10, 13, 15] : [8, 9, 12, 14]).forEach((x, i) => G.line(x, 9, x + (i < 2 ? -1 : 1), 11, 'k'));
  });
  add('mistwisp', { m: '#C8D8E8', M: '#9AB0C8', l: '#FFFFFF', e: '#3A4A6A' }, 11, 16, (G, fr) => {
    G.ell(5, 6, 4, 5, 'm'); G.ell(5, 5, 2, 2.5, 'l'); G.line(5, 11, fr ? 3 : 7, 15, 'M'); G.line(4, 11, fr ? 2 : 5, 14, 'M'); G.p(4, 6, 'e'); G.p(6, 6, 'e');
  });
  add('bonehound', { b: '#E8E0CC', B: '#B8AE98', k: '#2A2420', r: '#C83A3A' }, 18, 12, (G, fr) => {
    G.line(3, 4, 13, 4, 'b'); for (let x = 5; x <= 11; x += 2) G.line(x, 4, x, 7, 'B'); G.ell(15, 4, 2.5, 1.8, 'b'); G.line(14, 6, 17, 6, 'B'); G.p(15, 3, 'r'); G.line(3, 4, 0, 1, 'B');
    const lg = fr ? [[4, 2], [6, 7], [11, 9], [13, 14]] : [[4, 4], [6, 5], [11, 11], [13, 12]]; lg.forEach(([x0, x1]) => G.line(x0, 5, x1 > 10 ? x1 - 0 : x1, 11, 'b'));
  });
  add('thunderspider', { k: '#3A3060', K: '#5A4A9A', y: '#FFE04A', c: '#9AF0FF' }, 15, 10, (G, fr) => {
    G.ell(6, 5, 3.6, 2.6, 'k'); G.line(5, 2, 7, 2, 'c'); G.p(6, 1, 'c'); G.disc(11, 5, 1.8, 'K'); G.p(12, 4, 'y'); G.p(12, 6, 'y');
    (fr ? [[4, 1], [6, 5], [8, 9], [10, 13]] : [[4, 2], [6, 4], [8, 10], [10, 12]]).forEach(([x0, x1]) => G.line(x0, 7, x1, 9, 'K'));
  });
  add('bladewheel', { s: '#C8C8D0', S: '#8A8A92', k: '#3A3A42', e: '#FFD04A' }, 17, 17, (G, fr) => {
    G.disc(8, 8, 5.5, 'S'); G.disc(8, 8, 2, 'k'); G.p(8, 8, 'e');
    const ang = fr ? Math.PI / 4 : 0; for (let i = 0; i < 4; i++) { const a = ang + i * Math.PI / 2; G.line(8 + Math.cos(a) * 3, 8 + Math.sin(a) * 3, 8 + Math.cos(a) * 8, 8 + Math.sin(a) * 8, 's'); G.line(8 + Math.cos(a + 0.2) * 5, 8 + Math.sin(a + 0.2) * 5, 8 + Math.cos(a + 0.3) * 7.5, 8 + Math.sin(a + 0.3) * 7.5, 's'); }
  });
  add('blackmaw', { k: '#1A1418', K: '#2E2430', r: '#8A1A2A', w: '#F0E8E0', e: '#FFD04A' }, 22, 14, (G, fr) => {
    G.ell(10, 9, 9.5, 4.5, 'k'); G.ell(13, 7.5, 5, fr ? 3 : 1.6, 'r'); for (let x = 9; x <= 17; x += 2) { G.p(x, fr ? 5 : 6, 'w'); G.p(x, fr ? 10 : 9, 'w'); }
    G.p(5, 5, 'e'); G.p(7, 4, 'e'); G.p(3, 12, 'K'); G.p(18, 12, 'K'); G.line(2, 13, 19, 13, 'K');
  });
  add('hornbones', { b: '#E8E0CC', B: '#B8AE98', k: '#2A2420', h: '#C8A040', c: '#5A3A4A' }, 14, 20, (G, fr) => {
    G.disc(6, 3, 2.6, 'b'); G.p(5, 3, 'k'); G.p(7, 3, 'k'); G.rect(3, 6, 7, 9, 'c'); G.line(4, 8, 8, 8, 'B'); G.line(4, 10, 8, 10, 'B');
    G.line(8, 5, 12, 2, 'h'); G.p(12, 1, 'h'); G.p(13, 2, 'h'); G.p(12, 3, 'h');
    if (fr) { G.rect(4, 15, 1, 4, 'b'); G.rect(8, 15, 1, 3, 'b'); } else { G.rect(4, 15, 1, 3, 'b'); G.rect(8, 15, 1, 4, 'b'); }
  });
  add('ashcrow', { k: '#2A2A30', g: '#5A5A62', o: '#FF8A3A', e: '#FFD04A' }, 16, 12, (G, fr) => {
    for (let i = 0; i < 3; i++) G.line(7, 5, 3 + i, fr ? 9 - i : 0 + i, 'g');
    G.ell(7, 6, 4, 2.5, 'k'); G.disc(11, 4, 2, 'k'); G.line(13, 4, 15, 5, 'g'); G.p(12, 4, 'e'); G.p(2, 7, 'o'); G.p(1, 6, 'o'); G.p(3, 8, 'o'); G.line(6, 8, 6, 11, 'g'); G.line(8, 8, 8, 11, 'g');
  });
  add('bonecentipede', { b: '#E8E0CC', B: '#B8AE98', k: '#2A2420', r: '#C83A3A' }, 26, 12, (G, fr) => {
    for (let i = 0; i < 6; i++) { const x = 3 + i * 3.5, o = (i % 2 === fr) ? 1 : 0; G.line(x, 6, x - 1, 10 - o, 'B'); G.line(x + 1, 6, x + 2, 10 - (1 - o), 'B'); G.disc(x, 5, 2, 'b'); G.p(x, 4, 'B'); }
    G.ell(23.5, 5, 2.2, 2, 'B'); G.line(24, 6, 25, 9, 'k'); G.line(23, 7, 23, 9, 'k'); G.p(24, 4, 'r');
  });
  add('icewarden', { i: '#CFE6FF', I: '#9AC0E8', d: '#5A78A0', e: '#3A8AFF', k: '#1A2A3A' }, 15, 22, (G, fr) => {
    G.rect(3, 2, 9, 17, 'I'); G.rect(4, 3, 7, 15, 'i'); G.rect(6, 5, 3, 1, 'k'); G.p(6, 5, 'e'); G.p(8, 5, 'e'); G.line(5, 9, 8, 13, 'd'); G.line(9, 10, 7, 15, 'd');
    G.p(5, 1, 'i'); G.p(9, 1, 'i'); G.p(7, 0, 'i'); if (fr) { G.rect(4, 19, 3, 2, 'I'); G.rect(8, 19, 3, 3, 'I'); } else { G.rect(4, 19, 3, 3, 'I'); G.rect(8, 19, 3, 2, 'I'); }
  });
  add('lavaturtle', { s: '#3A2A24', l: '#FF7A3A', L: '#FFD04A', b: '#6A4A3A', e: '#FFD04A' }, 22, 14, (G, fr) => {
    G.ell(10, 7, 8.5, 5, 's', (x, y) => y <= 9); G.line(4, 5, 8, 8, 'l'); G.line(10, 3, 12, 8, 'l'); G.line(14, 4, 16, 7, 'l'); G.p(9, 5, 'L'); G.p(13, 6, 'L');
    G.ell(18.5, 8, 2.5, 2, 'b'); G.p(19, 7, 'e'); if (fr) { G.rect(4, 10, 3, 3, 'b'); G.rect(13, 10, 3, 3, 'b'); } else { G.rect(5, 10, 3, 3, 'b'); G.rect(12, 10, 3, 3, 'b'); }
  });
  add('sandsinker', { s: '#C8A870', S: '#A88850', k: '#3A2A18', w: '#F0E0C0' }, 22, 12, (G, fr) => {
    G.ell(6, 8, 5, 2.5, 'S'); G.ell(12, 6, 4, 3, 's'); [5, 8, 11, 13].forEach(x => G.line(x, 4, x, 9, 'S'));
    G.ell(17.5, 5, 3, fr ? 3.6 : 2.6, 'k'); for (let a = 0; a < 6; a++) { const t = a / 6 * Math.PI * 2; G.p(17.5 + Math.cos(t) * 2.6, 5 + Math.sin(t) * (fr ? 3 : 2), 'w'); }
  });
  add('abyssarm', { t: '#3A5A6A', T: '#5A8A9A', s: '#9AE0E8', e: '#FFD04A', k: '#1A2A30' }, 13, 23, (G, fr) => {
    G.ell(6, 21, 5.5, 1.8, 'k');
    const pts = fr ? [[6, 21], [5, 16], [7, 11], [6, 6], [8, 2]] : [[6, 21], [7, 16], [5, 11], [7, 6], [5, 2]];
    for (let i = 1; i < pts.length; i++) { const w2 = 3 - i * 0.5; for (let k = -1; k <= 1; k++) G.line(pts[i - 1][0] + k * w2 * 0.5, pts[i - 1][1], pts[i][0] + k * w2 * 0.5, pts[i][1], k ? 't' : 'T'); }
    pts.slice(1, 4).forEach(([x, y]) => G.p(x + 1, y, 's')); G.disc(pts[4][0], pts[4][1], 1.6, 'T'); G.p(pts[4][0] + 1, pts[4][1], 'e');
  });
  add('voidwalker', { k: '#140E1C', K: '#2A1E3A', v: '#8A5AFF', e: '#FFFFFF' }, 17, 25, (G, fr) => {
    G.rect(5, 6, 7, 16, 'k'); G.disc(8.5, 4, 3, 'K'); G.disc(8, 12, 2, 'v'); G.p(7, 4, 'e'); G.p(10, 4, 'e');
    G.line(4, 8, 1, fr ? 18 : 17, 'K'); G.line(12, 8, 15, fr ? 17 : 18, 'K'); for (let x = 5; x <= 11; x += 2) G.p(x, 22 + ((x + fr) % 2), 'k');
  });
  add('twinshade', { k: '#2A2434', K: '#3E3650', e: '#FF8AE0' }, 11, 17, (G, fr) => {
    G.disc(5, 4, 3, 'k'); G.ell(5, 11, 3.5, 4.6, 'k'); G.line(2, 8, 2, 13, 'K'); G.p(4, 4, 'e'); G.p(6, 4, 'e');
    if (fr) { G.rect(3, 15, 1, 2, 'k'); G.rect(7, 15, 1, 1, 'k'); } else { G.rect(3, 15, 1, 1, 'k'); G.rect(7, 15, 1, 2, 'k'); }
  });
  add('corebeast', { a: '#5A3A6A', A: '#7A5A8A', c: '#FF5A8A', C: '#FFC0D8', k: '#2A1A30', e: '#FFE04A' }, 26, 19, (G, fr) => {
    G.ell(12, 9, 8, 4.5, 'a'); G.line(8, 5, 7, 0, 'C'); G.line(9, 5, 8, 1, 'c'); G.line(12, 5, 12, 0, 'c'); G.line(13, 5, 13, 1, 'C'); G.line(16, 5, 17, 1, 'C'); G.disc(12, 9, 2, 'c'); G.p(12, 8, 'C');
    G.ell(21.5, 7, 3, 2.5, 'A'); G.p(22, 6, 'e'); G.line(23, 9, 25, 9, 'k');
    (fr ? [6, 9, 15, 18] : [7, 8, 16, 17]).forEach(x => G.rect(x, 13, 2, 5, 'a'));
  });
  add('judgeeye', { w: '#F0E8E0', r: '#C83A3A', k: '#1A1418', g: '#C8A040' }, 17, 17, (G, fr) => {
    G.ell(8, 8, 8, 2.4, 'g'); G.ell(8, 8, 6.5, 1.3, '.'); G.disc(8, 8, 5.5, 'w'); G.disc(fr ? 9 : 8.5, 8, 3, 'r'); G.disc(fr ? 9.5 : 9, 8, 1.4, 'k'); G.p(7, 6, 'w');
  });

  // ---------- 新的行為（R.AI_X） ----------
  const AI = R.AI_X = R.AI_X || {};
  const hit = (H, t, dmg, src, o) => H.hurtT(t, dmg, src, o);
  // 晶刺蝟：靠近就縮起來，0.5 秒後射出一圈晶刺
  AI.quills = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.curl > 0) { e.curl -= dt; if (e.curl <= 0) { for (let i = 0; i < 10; i++) R.fire({ kind: 'eorb', owner: 'e', x: e.x, z: e.z, a: i / 10 * Math.PI * 2 + e.t, speed: 8, dmg: e.dmg, life: 1.4, src: e }); } return false; }
    let mv = false; if (walk && d > 2.5) { H.move(e, a, sp, dt); mv = true; }
    if (e.cd <= 0 && d < 4.5) { e.cd = 3.5; e.curl = 0.5; R.fx('ring', e.x, 0.1, e.z, { r: 1.2, color: '#9AE0FF' }); }
    return mv;
  };
  // 酸泡：保持距離，拋出酸液：落地處先出現圈，炸開後留下一攤酸
  AI.mortar = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; let mv = false; const want = d < 5.5 ? a + Math.PI : d > 9 ? a : null;
    if (want != null && walk) { H.move(e, want, sp, dt); mv = true; }
    if (e.cd <= 0 && d < 12) {
      e.cd = 2.8 + rnd() * 0.6; const x = P.x, z = P.z; R.fx('mark', x, 0, z, { r: 1.4, t: 1 });
      later(() => { if (e.dead) return; R.fx('boom', x, 0.3, z, { r: 1.4, color: '#8AE04A' }); targets().forEach(t => { if (Math.hypot(t.x - x, t.z - z) < 1.4) hit(H, t, e.dmg, e); }); const zn = R.addZone({ kind: 'lava', x, z, r: 1.3, life: 3.5, dmg: e.dmg * 0.35 }); if (zn && zn.mesh) zn.mesh.material.color.set('#8AE04A'); }, 1000);
    }
    return mv;
  };
  // 裂地蠍：保持兩、三公尺；拉一條線，再甩尾（被刺中會變慢）
  AI.sting = (e, P, d, a, sp, dt, walk, H) => {
    if (e.stg) {
      e.yaw = e.stg.a; e.stg.t -= dt;
      if (e.stg.t <= 0) { const s = e.stg; e.stg = null; R.fx('slash', e.x, 1, e.z, { a: s.a, len: 4.6 }); targets().forEach(t => { const dx = t.x - e.x, dz = t.z - e.z, al = dx * Math.sin(s.a) + dz * Math.cos(s.a), sd = Math.abs(dx * Math.cos(s.a) - dz * Math.sin(s.a)); if (al > 0 && al < 4.8 && sd < 0.8) { hit(H, t, e.dmg * 1.3, e); if (t === W().P) t.slowT = Math.max(t.slowT || 0, 1.6); } }); e.cd = 2.2; }
      return false;
    }
    e.yaw = a; let mv = false; const want = d < 2.2 ? a + Math.PI : d > 3.8 ? a : null;
    if (want != null && walk) { H.move(e, want, sp, dt); mv = true; }
    if (e.cd <= 0 && d < 4.8) { e.stg = { a, t: 0.55 }; R.fx('aim', e.x, 0.3, e.z, { a, len: 4.6, t: 0.55 }); }
    return mv;
  };
  // 鐘擺刃：慢慢靠近；地上出現大圈 0.6 秒後轉 1.2 秒，圈裡每 0.3 秒被砍一下
  AI.spin = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.spinW > 0) { e.spinW -= dt; if (e.spinW <= 0) e.spinT = 1.2; return false; }
    if (e.spinT > 0) { e.spinT -= dt; e.tick = (e.tick || 0) - dt; if (e.tick <= 0) { e.tick = 0.3; R.fx('ring', e.x, 0.1, e.z, { r: 2.6, color: '#C8C8D0' }); targets().forEach(t => { if (Math.hypot(t.x - e.x, t.z - e.z) < 2.6) hit(H, t, e.dmg * 0.6, e); }); } if (walk) H.move(e, a, sp * 1.4, dt); return true; }
    let mv = false; if (walk && d > 1.8) { H.move(e, a, sp, dt); mv = true; }
    if (e.cd <= 0 && d < 5) { e.cd = 3.8; e.spinW = 0.6; R.fx('mark', e.x, 0, e.z, { r: 2.6, t: 0.6 }); }
    return mv;
  };
  // 號角骸：離你遠遠的，每七秒吹一次號角：九公尺內的生物五秒內變快、變痛
  let rallyMsg = 0;
  AI.rally = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; let mv = false; const want = d < 6 ? a + Math.PI : d > 10 ? a : null;
    if (want != null && walk) { H.move(e, want, sp, dt); mv = true; }
    if (e.cd <= 0 && d < 16) {
      e.cd = 7; R.fx('ring', e.x, 0.1, e.z, { r: 9, color: '#C8A040' }); if (R.playSfx) R.playSfx('alarm', 400);
      W().enemies.forEach(o => { if (o.dead || o === e || o.rallied || Math.hypot(o.x - e.x, o.z - e.z) > 9) return; o.rallied = 1; o.speed *= 1.3; o.dmg *= 1.2; R.fx('ring', o.x, 0.1, o.z, { r: 0.9, color: '#FFB04A' }); later(() => { if (o.dead || !o.rallied) return; o.rallied = 0; o.speed /= 1.3; o.dmg /= 1.2; }, 5000); });
      if (performance.now() - rallyMsg > 15000) { rallyMsg = performance.now(); R.toast('號角骸吹響了號角——附近的生物變兇了。先打牠！'); }
    }
    return mv;
  };
  // 泥偶：打倒會裂成兩個小泥偶
  const ke = R.killEnemy;
  R.killEnemy = (e, by) => {
    const split = e && !e.dead && e.id === 'muddoll';
    const r = ke(e, by);
    if (split && e.dead) for (let i = 0; i < 2; i++) { const [x, z] = R.nearestFloor(e.x + (i ? 0.8 : -0.8), e.z + (rnd() - 0.5)); R.spawnEnemy('muddoll_s', x, z, e.room, { aggro: true }); }
    return r;
  };

  // ---------- 分到哪裡 ----------
  const G = id => R.GRADES.find(g => g.id === id), addPool = (gid, ids) => { const g = G(gid); if (g) ids.forEach(i => { if (!g.pool.includes(i)) g.pool.push(i); }); };
  addPool('hamilia', ['mossball', 'lampmoth', 'stonesnail']);
  addPool('amile', ['mossball', 'lampmoth', 'stonesnail', 'crysthog', 'shadelizard', 'bonebird', 'muddoll', 'bellcricket', 'rustknight', 'acidbubble', 'echobat']);
  addPool('mors', ['crysthog', 'shadelizard', 'bonebird', 'muddoll', 'bellcricket', 'rustknight', 'acidbubble', 'echobat', 'mirrorgolem', 'riftscorp', 'mistwisp', 'bonehound', 'thunderspider', 'bladewheel', 'blackmaw', 'hornbones', 'ashcrow']);
  addPool('kesent', ['rustknight', 'acidbubble', 'mirrorgolem', 'riftscorp', 'mistwisp', 'bonehound', 'thunderspider', 'bladewheel', 'blackmaw', 'hornbones', 'ashcrow', 'bonecentipede', 'voidwalker', 'twinshade', 'corebeast', 'judgeeye']);
  const fav = (t, o) => { const T0 = R.TYPES[t]; if (T0) T0.favor = Object.assign({}, T0.favor, o); };
  fav('tower', { echobat: 2, bonebird: 2, ashcrow: 1, judgeeye: 1 });
  fav('city', { rustknight: 2, muddoll: 1, hornbones: 1 });
  fav('maze', { bellcricket: 2, shadelizard: 2, bladewheel: 1 });
  fav('tomb', { bonehound: 2, hornbones: 2, bonecentipede: 1, voidwalker: 1 });
  fav('island', { acidbubble: 1, crysthog: 1, mistwisp: 1 });
})(window.R);
