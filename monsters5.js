// 遺跡生物（第五批）：再加二十五種，名字和樣子都是自己想的（不用妖怪的原名）。總數到一百二十五。
// 新的行為：
//  mine（孢子團：沿路留下孢子，靠近就爆）、split（分裂膠：打倒會分成兩隻小的）、healer（引魂燈：躲在後面幫同伴補血）、
//  aegis（盾甲蟲：幫附近的同伴罩上護盾，傷害減半）、orbit（環刃鳥：繞著你轉，突然穿過來）、laser（稜鏡眼：先拉一條紅線，再射出光束）。
// 極端環境的四種（深淵鰩、熔岩龜、砂蠕蟲、霜岩像）照 env 出現，不放進一般的生物池。
(function (R) {
  const W = () => R.W, ART = R.BEAST_ART, rnd = Math.random;
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const targets = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed), R.netTargets ? R.netTargets() : []).filter(t => t && !t.dead); };   // 多人連線：房主這邊也算別人（net2.js）
  const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  // ---------- 資料 ----------
  const NEW = {
    glowslug: { name: '熒光蛞蝓', hp: 34, dmg: 6, speed: 1.4, xp: 5, size: 0.6, ai: 'chase', color: '#7AE0B0', eye: '#1A3020', desc: '身體會發光的大蛞蝓，爬得很慢。遺跡的通道裡常常一整排，像路燈一樣。' },
    pebblemite: { name: '礫甲蟎', hp: 18, dmg: 5, speed: 4.6, xp: 4, size: 0.45, ai: 'skitter', color: '#8A8478', eye: '#FF5A3A', desc: '背上黏滿碎石的小蟎，鑽來鑽去，一窩一窩地出現。' },
    ruinrat: { name: '遺跡鼠', hp: 16, dmg: 5, speed: 4.2, xp: 3, size: 0.45, ai: 'chase', color: '#6A5A4A', eye: '#FF3A3A', desc: '吃魔力水晶碎屑長大的老鼠，眼睛發紅。單隻不可怕，一群就麻煩了。' },
    sporepuff: { name: '孢子團', hp: 30, dmg: 10, speed: 1.6, xp: 7, size: 0.7, ai: 'mine', color: '#9ACF6A', eye: '#3A2A1A', desc: '一團軟軟的菌，走過的地方會留下孢子。孢子靠近就會爆開，爆到的人會變慢。' },
    jellylamp: { name: '水母燈', hp: 26, dmg: 8, speed: 3.6, xp: 6, size: 0.6, ai: 'swoop', fly: 1, color: '#BFE8FF', eye: '#3A6ACF', desc: '飄在半空中的透明水母，發著淡藍的光。在頭上繞圈，再垂下觸手往下撲。' },
    splitgel: { name: '分裂膠', hp: 44, dmg: 8, speed: 2.2, xp: 8, size: 0.8, ai: 'split', color: '#C88AE0', eye: '#2A1A3A', desc: '紫色的膠狀生物。打倒之後會分成兩隻小的，小的再打倒才算數。' },
    splitgel_s: { name: '分裂膠（小）', hp: 16, dmg: 5, speed: 3.2, xp: 2, size: 0.45, ai: 'chase', noDex: 1, color: '#D8A8F0', eye: '#2A1A3A', desc: '' },
    crystmantis: { name: '晶刃螳螂', hp: 70, dmg: 15, speed: 3.6, xp: 13, size: 0.9, ai: 'pounce', color: '#7FD8E8', eye: '#FF5A6A', desc: '兩隻前腳是魔力結晶長成的刀。蹲低之後會撲過來，一刀很痛。' },
    lanternwisp: { name: '引魂燈', hp: 40, dmg: 0, speed: 3, xp: 12, size: 0.6, ai: 'healer', fly: 1, color: '#FFD08A', eye: '#8A3A1A', desc: '提著燈籠的小小魂火，不會攻擊人，但會躲在後面幫同伴補血。先打掉牠。' },
    shieldbeetle: { name: '盾甲蟲', hp: 110, dmg: 12, speed: 1.8, xp: 16, size: 1, ai: 'aegis', armor: 0.3, color: '#5A7A9A', eye: '#FFE04A', desc: '殼像盾牌一樣的大甲蟲。會幫附近的同伴罩上一層光（傷害減半）。' },
    ringbird: { name: '環刃鳥', hp: 46, dmg: 12, speed: 4.4, xp: 11, size: 0.7, ai: 'orbit', fly: 1, color: '#C8C8D0', eye: '#C83A3A', desc: '翅膀邊緣像刀刃的銀色鳥。繞著你轉圈，冷不防地從中間穿過去。' },
    prismeye: { name: '稜鏡眼', hp: 60, dmg: 18, speed: 1.8, xp: 14, size: 0.8, ai: 'laser', fly: 1, color: '#E8E0FF', eye: '#FF3A6A', desc: '長在稜鏡裡的眼睛。地上拉出一條紅線，就是光束要射過來了——離開那條線。' },
    gearsentry: { name: '齒輪哨兵', hp: 90, dmg: 10, speed: 0, xp: 13, size: 0.9, ai: 'turret', armor: 0.25, color: '#9A8A6A', eye: '#FF5A3A', desc: '古代的齒輪機關，釘在地上轉個不停，看到人就射出鐵釘。' },
    tarbeast: { name: '瀝青獸', hp: 120, dmg: 16, speed: 2.4, xp: 16, size: 1.1, ai: 'charge', color: '#2A2420', eye: '#FFB04A', desc: '全身沾滿黑色瀝青的野獸。低頭衝撞之後會黏在地上一下，那時候打。' },
    echoshade: { name: '回聲影', hp: 50, dmg: 13, speed: 3, xp: 12, size: 0.8, ai: 'blink', color: '#4A4A6A', eye: '#BFE8FF', desc: '你自己的腳步聲變成的影子。會突然出現在你背後。' },
    bonefiddler: { name: '骨琴師', hp: 56, dmg: 11, speed: 2.6, xp: 13, size: 0.8, ai: 'kite', shoot: 0.5, fan: 3, shot: 'spirit', color: '#E8E0CC', eye: '#7FD8FF', desc: '抱著骨頭做的琴的骷髏。邊退邊拉琴，琴聲變成三道魂火飛過來。' },
    voidmoth: { name: '虛空蛾', hp: 48, dmg: 9, speed: 2.8, xp: 12, size: 0.8, ai: 'smoke', fly: 1, color: '#3A2A5A', eye: '#E8C0FF', desc: '翅膀上有星空花紋的大蛾。灑下的鱗粉讓人看不清楚、喘不過氣。' },
    starspider: { name: '星紋蛛', hp: 80, dmg: 13, speed: 2.8, xp: 15, size: 1, ai: 'kite', shoot: 0.5, fan: 2, shot: 'web', color: '#2A2A3A', eye: '#FFE04A', desc: '背上有發光星紋的蜘蛛，噴出的絲黏到會走不動。' },
    mirrorwraith: { name: '鏡魂', hp: 60, dmg: 13, speed: 2.6, xp: 14, size: 0.8, ai: 'swap', color: '#BFD8E8', eye: '#3A6ACF', desc: '被困在碎鏡子裡的影子。會和你交換位置。' },
    clockknight: { name: '時計騎士', hp: 240, dmg: 20, speed: 2.8, xp: 30, size: 1.3, ai: 'charge', armor: 0.35, elite: 1, coreChance: 0.22, color: '#8A7A5A', eye: '#FF8A3A', desc: '胸口嵌著大時鐘的鎧甲騎士。時鐘每響一聲就衝一次。克森特級才看得到。' },
    twinhound: { name: '雙首犬', hp: 210, dmg: 20, speed: 4.4, xp: 28, size: 1.3, ai: 'pounce', elite: 1, coreChance: 0.2, color: '#4A3A3A', eye: '#FF3A3A', desc: '兩顆頭的大黑犬。一顆頭盯著你，另一顆頭盯著你的隊友。摩爾斯級以上才看得到。' },
    thornqueen: { name: '荊棘女王', hp: 300, dmg: 20, speed: 1.6, xp: 38, size: 1.6, ai: 'hydra', elite: 1, coreChance: 0.3, color: '#6A3A4A', eye: '#FF5A8A', desc: '下半身是一整叢荊棘的女人。地上一次出現好幾個圈，荊棘就要從那裡刺上來。克森特級才看得到。' },
    abyssray: { name: '深淵鰩', hp: 200, dmg: 18, speed: 4.6, xp: 28, size: 1.6, ai: 'swoop', fly: 1, elite: 1, env: 'deep', coreChance: 0.2, color: '#1A3A4A', eye: '#7FFFE0', desc: '只在深海環境出現。在黑水上方滑翔的巨大鰩魚，俯衝下來的時候尾巴會電人。' },
    magmaturtle: { name: '熔岩龜', hp: 320, dmg: 20, speed: 1.4, xp: 32, size: 1.6, ai: 'guard', armor: 0.45, elite: 1, env: 'volcano', coreChance: 0.25, color: '#4A3A2A', eye: '#FFB04A', desc: '只在火山環境出現。殼上流著岩漿的大烏龜，正面幾乎打不動，繞到後面打。' },
    dunewyrm: { name: '砂蠕蟲', hp: 260, dmg: 20, speed: 3.2, xp: 30, size: 1.5, ai: 'burrow', elite: 1, env: 'desert', coreChance: 0.22, color: '#C8A870', eye: '#3A2A1A', desc: '只在沙漠環境出現。在沙底下游的巨大蠕蟲，從腳下張開大嘴咬上來。' },
    frostgolem: { name: '霜岩像', hp: 300, dmg: 22, speed: 2, xp: 32, size: 1.6, ai: 'slam', elite: 1, env: 'snow', coreChance: 0.25, color: '#BFD8E8', eye: '#3A6ACF', desc: '只在凍原環境出現。冰和岩石堆成的巨像，地上出現大圈就是要壓下來了。' }
  };
  Object.keys(NEW).forEach(id => { R.ENEMIES[id] = Object.assign({ ref: '' }, NEW[id]); });

  // ---------- 點陣圖 ----------
  const grid = (w, h) => {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    const o = {
      p(x, y, c) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c; },
      rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) o.p(x + i, y + j, c); },
      line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) o.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
      ell(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.05) o.p(x, y, c); } },
      disc(cx, cy, r, c) { o.ell(cx, cy, r, r, c); },
      rows: () => g.map(r => r.join(''))
    };
    return o;
  };
  const add = (id, pal, w, h, draw) => { const fr = [0, 1].map(f => { const G = grid(w, h); draw(G, f); return G.rows(); }); ART[id] = { pal, a: fr[0], b: fr[1] }; };
  const legs = (G, fr, xs, y, len, c) => xs.forEach((x, i) => G.rect(x, y, 1, (i + fr) % 2 ? len : len - 1, c));

  add('glowslug', { a: '#7AE0B0', A: '#4AA880', g: '#D8FFE8', e: '#1A3020' }, 15, 8, (G, fr) => { G.ell(7, 5, 6.5, 2.2, 'a'); G.ell(7, 6, 6, 1.2, 'A'); G.ell(fr ? 6 : 8, 4, 2.5, 1, 'g'); G.line(12, 3, 13, 0, 'A'); G.line(10, 3, 10, 0, 'A'); G.p(13, 0, 'e'); G.p(10, 0, 'e'); });
  add('pebblemite', { a: '#8A8478', A: '#5A564E', s: '#B8B0A0', e: '#FF5A3A' }, 11, 7, (G, fr) => { G.ell(5, 3, 4, 2.4, 'A'); [[2, 2], [5, 1], [7, 3], [4, 4]].forEach(([x, y]) => G.p(x, y, 's')); G.p(8, 2, 'e'); legs(G, fr, [1, 3, 6, 8], 5, 2, 'a'); });
  add('ruinrat', { a: '#6A5A4A', A: '#4A3E32', p: '#C89A8A', e: '#FF3A3A' }, 13, 7, (G, fr) => { G.ell(6, 4, 4, 2, 'a'); G.disc(10, 3, 1.8, 'a'); G.p(11, 3, 'e'); G.p(9, 1, 'p'); G.line(2, 4, 0, fr ? 2 : 5, 'p'); legs(G, fr, [4, 8], 6, 1, 'A'); });
  add('sporepuff', { a: '#9ACF6A', A: '#6A9A3A', s: '#E8F8C8', e: '#3A2A1A' }, 13, 12, (G, fr) => { G.ell(6, 7, 5.5, 4.5, 'a'); G.ell(6, 9, 5, 2.5, 'A'); [[3, 4], [8, 3], [10, 6], [5, 6], [2, 8]].forEach(([x, y]) => G.disc(x, y, 0.8, 's')); G.p(5, 8, 'e'); G.p(8, 8, 'e'); if (fr) { G.p(2, 1, 's'); G.p(10, 0, 's'); } else { G.p(4, 0, 's'); G.p(11, 2, 's'); } });
  add('jellylamp', { a: '#BFE8FF', A: '#7FC0E8', g: '#FFFFFF', e: '#3A6ACF' }, 13, 15, (G, fr) => { G.ell(6, 4, 5, 3.5, 'A'); G.ell(6, 3, 4, 2.5, 'a'); G.disc(5, 2, 1, 'g'); G.p(4, 5, 'e'); G.p(8, 5, 'e'); for (let i = 0; i < 4; i++) { const x = 3 + i * 2; G.line(x, 8, x + (fr ? (i % 2 ? 1 : -1) : 0), 14 - (i % 2) * 2, 'A'); } });
  add('splitgel', { a: '#C88AE0', A: '#9A5AB8', g: '#F0D8FF', e: '#2A1A3A' }, 15, 11, (G, fr) => { G.ell(7, 6, fr ? 7 : 6.5, fr ? 4 : 4.5, 'a'); G.ell(7, 8, 6, 2, 'A'); G.disc(4, 4, 1, 'g'); G.p(5, 6, 'e'); G.p(9, 6, 'e'); G.line(6, 8, 8, 8, 'e'); });
  add('splitgel_s', { a: '#D8A8F0', A: '#A878C8', e: '#2A1A3A' }, 9, 7, (G, fr) => { G.ell(4, 4, fr ? 4 : 3.6, fr ? 2.6 : 3, 'a'); G.ell(4, 5, 3, 1, 'A'); G.p(3, 3, 'e'); G.p(5, 3, 'e'); });
  add('crystmantis', { a: '#5A8A7A', A: '#3A6A5A', c: '#7FD8E8', C: '#BFF4FF', e: '#FF5A6A' }, 17, 16, (G, fr) => { G.ell(7, 10, 4.5, 2, 'a'); G.ell(10, 6, 1.6, 3, 'A'); G.disc(11, 3, 2, 'a'); G.p(12, 2, 'e'); G.line(11, 6, fr ? 15 : 14, fr ? 3 : 5, 'c'); G.line(fr ? 15 : 14, fr ? 3 : 5, 16, fr ? 6 : 9, 'C'); G.line(9, 7, 12, 9, 'c'); legs(G, fr, [4, 6, 9], 12, 4, 'A'); });
  add('lanternwisp', { f: '#FFD08A', F: '#FF8A3A', l: '#E8C04A', k: '#3A2A1A', e: '#8A3A1A' }, 11, 15, (G, fr) => { G.disc(5, 4, fr ? 3.4 : 3, 'F'); G.disc(5, 4, 2, 'f'); G.p(4, 4, 'e'); G.p(6, 4, 'e'); G.line(5, 8, fr ? 4 : 6, 10, 'k'); G.rect(3, 10, 5, 4, 'l'); G.rect(4, 11, 3, 2, 'f'); });
  add('shieldbeetle', { a: '#5A7A9A', A: '#3A5A7A', s: '#8AB0D0', k: '#1A2A3A', e: '#FFE04A' }, 17, 12, (G, fr) => { G.ell(8, 6, 7, 4.5, 'A'); G.ell(8, 5, 6, 3.5, 'a'); G.line(8, 2, 8, 9, 'k'); G.ell(5, 4, 1.5, 1, 's'); G.disc(15, 6, 1.6, 'k'); G.p(15, 5, 'e'); legs(G, fr, [3, 6, 10, 13], 10, 2, 'k'); });
  add('ringbird', { a: '#C8C8D0', A: '#8A8A98', w: '#F0F0F8', e: '#C83A3A', b: '#E8C04A' }, 19, 11, (G, fr) => { G.ell(9, 6, 3, 2, 'a'); G.disc(12, 5, 1.6, 'a'); G.p(13, 4, 'e'); G.p(14, 5, 'b'); for (let i = 0; i < 4; i++) { G.line(8, 5, 1 + i, fr ? 1 + i * 2 : 9 - i, i % 2 ? 'A' : 'w'); G.line(10, 5, 17 - i, fr ? 1 + i * 2 : 9 - i, i % 2 ? 'A' : 'w'); } });
  add('prismeye', { c: '#E8E0FF', C: '#B8A8E8', w: '#FFFFFF', e: '#FF3A6A', k: '#1A1020' }, 13, 15, (G, fr) => { G.line(6, 0, 1, 7, 'C'); G.line(6, 0, 11, 7, 'C'); G.line(1, 7, 6, 14, 'C'); G.line(11, 7, 6, 14, 'C'); for (let y = 2; y < 13; y++) { const hw = y < 7 ? (y * 5 / 7) : ((14 - y) * 5 / 7); G.line(6 - hw + 1, y, 6 + hw - 1, y, 'c'); } G.disc(6, 7, 2.4, 'w'); G.disc(6, 7, 1.4, fr ? 'e' : 'k'); G.p(6, 7, 'k'); });
  add('gearsentry', { m: '#9A8A6A', M: '#6A5A3A', g: '#C8B888', k: '#2A2014', e: '#FF5A3A' }, 15, 14, (G, fr) => { G.rect(4, 10, 7, 4, 'M'); G.disc(7, 6, 4.5, 'm'); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + (fr ? 0.39 : 0); G.p(7 + Math.cos(a) * 5.5, 6 + Math.sin(a) * 5.5, 'g'); } G.disc(7, 6, 2, 'k'); G.p(7, 6, 'e'); });
  add('tarbeast', { a: '#2A2420', A: '#4A3E36', d: '#14100E', e: '#FFB04A', h: '#8A7A6A' }, 19, 13, (G, fr) => { G.ell(9, 6, 7, 4, 'a'); G.ell(8, 5, 5, 2, 'A'); G.disc(15, 5, 2.6, 'a'); G.p(16, 4, 'e'); G.line(15, 2, 17, 0, 'h'); for (let x = 3; x < 15; x += 3) G.rect(x, 10, 1, fr ? 3 : 2, 'd'); legs(G, fr, [4, 7, 11, 14], 9, 3, 'a'); });
  add('echoshade', { a: '#4A4A6A', A: '#2E2E48', e: '#BFE8FF', w: '#8A8AB0' }, 11, 17, (G, fr) => { G.disc(5, 3, 2.5, 'a'); G.p(4, 3, 'e'); G.p(6, 3, 'e'); G.rect(3, 6, 5, 7, 'A'); for (let i = 0; i < 3; i++) G.p(2 + i * 3, 13 + (fr ? i % 2 : (i + 1) % 2), 'A'); G.ell(5, 9, fr ? 5 : 4, 1, 'w'); });
  add('bonefiddler', { b: '#E8E0CC', B: '#B8B09C', k: '#2A2420', w: '#8A5A3A', e: '#7FD8FF' }, 15, 18, (G, fr) => { G.disc(6, 3, 2.5, 'b'); G.p(5, 3, 'k'); G.p(7, 3, 'e'); G.rect(5, 6, 3, 6, 'B'); for (let y = 6; y < 12; y += 2) G.line(4, y, 8, y, 'b'); G.ell(11, 10, 2.2, 3, 'w'); G.line(11, 5, 11, 13, 'k'); G.line(fr ? 8 : 9, 7, 14, fr ? 11 : 9, 'b'); legs(G, fr, [5, 7], 12, 5, 'b'); });
  add('voidmoth', { a: '#3A2A5A', A: '#5A4A8A', s: '#E8C0FF', b: '#1A1428', e: '#E8C0FF' }, 19, 13, (G, fr) => { const h = fr ? 1 : 0; G.ell(5, 5 - h, 4.5, 4, 'a'); G.ell(13, 5 - h, 4.5, 4, 'a'); G.ell(5, 10, 3, 2, 'A'); G.ell(13, 10, 3, 2, 'A'); [[4, 4], [6, 6], [12, 4], [14, 6], [5, 10], [13, 10]].forEach(([x, y]) => G.p(x, y - (y < 8 ? h : 0), 's')); G.ell(9, 7, 1.3, 4.5, 'b'); G.p(9, 3, 'e'); G.line(8, 2, 6, 0, 'b'); G.line(10, 2, 12, 0, 'b'); });
  add('starspider', { a: '#2A2A3A', A: '#4A4A5A', s: '#FFE04A', e: '#FFE04A' }, 19, 12, (G, fr) => { G.ell(9, 6, 4, 3, 'a'); G.disc(14, 6, 2, 'A'); G.p(15, 5, 'e'); G.p(15, 7, 'e'); [[8, 5], [10, 6], [9, 7]].forEach(([x, y]) => G.p(x, y, 's')); for (let i = 0; i < 4; i++) { G.line(8 + i, 7, 3 + i * 3 + (fr ? 1 : 0), 11, 'A'); G.line(8 + i, 5, 3 + i * 3 + (fr ? 0 : 1), 1, 'A'); } });
  add('mirrorwraith', { m: '#BFD8E8', M: '#8AA8C0', w: '#FFFFFF', k: '#2A3A4A', e: '#3A6ACF' }, 13, 17, (G, fr) => { G.rect(2, 1, 9, 13, 'k'); G.rect(3, 2, 7, 11, 'M'); G.line(3, 12, 9, 3, 'w'); G.disc(6, 5, 2, 'm'); G.p(5, 5, 'e'); G.p(7, 5, 'e'); G.rect(5, 8, 3, 4, 'm'); G.p(fr ? 2 : 10, 15, 'm'); G.p(fr ? 9 : 4, 16, 'w'); });
  add('clockknight', { a: '#8A7A5A', A: '#5A4E3A', g: '#E8D8A8', k: '#1A1410', e: '#FF8A3A', c: '#F2ECD8' }, 19, 24, (G, fr) => { G.rect(7, 1, 6, 5, 'A'); G.rect(8, 3, 4, 1, 'e'); G.rect(5, 6, 10, 10, 'a'); G.disc(10, 10, 3.2, 'c'); G.line(10, 10, 10, 7, 'k'); G.line(10, 10, fr ? 12 : 8, fr ? 11 : 11, 'k'); G.rect(3, 6, 2, 8, 'A'); G.rect(15, 6, 2, 8, 'A'); G.line(17, 6, 18, 0, 'g'); legs(G, fr, [7, 12], 16, 7, 'A'); });
  add('twinhound', { a: '#4A3A3A', A: '#2E2424', e: '#FF3A3A', t: '#E8E0D0' }, 21, 14, (G, fr) => { G.ell(9, 8, 6.5, 3, 'a'); G.disc(16, 4, 2.4, 'a'); G.disc(17, 8, 2.4, 'A'); G.p(17, 3, 'e'); G.p(18, 7, 'e'); G.p(18, 5, 't'); G.p(19, 9, 't'); G.line(3, 7, 0, fr ? 4 : 6, 'A'); legs(G, fr, [5, 8, 12, 14], 10, 4, 'A'); });
  add('thornqueen', { h: '#1A1014', s: '#E8D0D8', d: '#6A3A4A', t: '#3A5A2A', T: '#5A7A3A', r: '#FF5A8A', e: '#FF5A8A' }, 23, 25, (G, fr) => { G.disc(11, 4, 2.6, 's'); G.rect(8, 1, 7, 2, 'h'); G.line(8, 3, 7, 9, 'h'); G.line(14, 3, 15, 9, 'h'); G.p(12, 4, 'e'); G.rect(9, 7, 5, 6, 'd'); G.p(10, 1, 'r'); G.p(13, 0, 'r'); for (let i = 0; i < 7; i++) { const x = 3 + i * 3; G.line(11, 13, x + (fr ? 1 : 0), 24, i % 2 ? 'T' : 't'); G.p(x + 1, 18 + i % 3, 'r'); } });
  add('abyssray', { a: '#1A3A4A', A: '#2E5A6A', g: '#7FFFE0', e: '#7FFFE0' }, 25, 13, (G, fr) => { const h = fr ? 1 : 0; G.ell(12, 6, 11, 3.5 + h, 'a'); G.ell(12, 5, 7, 2, 'A'); G.p(10, 4, 'e'); G.p(14, 4, 'e'); [[6, 6], [18, 6], [12, 7]].forEach(([x, y]) => G.p(x, y, 'g')); G.line(12, 9, 12 + (fr ? 2 : -2), 12, 'A'); });
  add('magmaturtle', { s: '#4A3A2A', S: '#2E241A', l: '#FFB04A', L: '#FF5A1A', a: '#6A5A4A', e: '#FFB04A' }, 23, 15, (G, fr) => { G.ell(11, 7, 9, 5, 'S'); G.ell(11, 6, 8, 4, 's'); [[7, 5], [11, 4], [15, 6], [9, 8], [14, 8]].forEach(([x, y]) => { G.p(x, y, 'l'); G.p(x + 1, y, 'L'); }); G.disc(20, 8, 2, 'a'); G.p(21, 7, 'e'); legs(G, fr, [5, 9, 14, 17], 11, 3, 'a'); });
  add('dunewyrm', { a: '#C8A870', A: '#A88850', m: '#5A2A1A', t: '#F2E8D0', e: '#3A2A1A' }, 21, 17, (G, fr) => { for (let i = 0; i < 5; i++) G.disc(4 + i * 3, 14 - i * 2 - (fr && i % 2 ? 1 : 0), 3, i % 2 ? 'A' : 'a'); G.disc(17, 5, 3.6, 'a'); G.disc(18, 5, 2, 'm'); [[16, 3], [19, 3], [16, 7], [19, 7]].forEach(([x, y]) => G.p(x, y, 't')); G.p(15, 3, 'e'); });
  add('frostgolem', { i: '#BFD8E8', I: '#8AB0C8', r: '#6A7A8A', w: '#F2F8FF', e: '#3A6ACF' }, 23, 25, (G, fr) => { G.rect(8, 1, 7, 6, 'I'); G.rect(9, 3, 2, 1, 'e'); G.rect(12, 3, 2, 1, 'e'); G.rect(5, 7, 13, 10, 'i'); G.rect(7, 9, 4, 3, 'w'); G.rect(1, 7, 4, fr ? 11 : 10, 'r'); G.rect(18, 7, 4, fr ? 10 : 11, 'r'); G.rect(7, 17, 4, 7, 'I'); G.rect(12, 17, 4, 7, 'I'); G.line(6, 16, 16, 16, 'r'); });

  // ---------- 新的行為 ----------
  const AI = R.AI_X = R.AI_X || {};
  const hit = (H, t, dmg, src, o) => H.hurtT(t, dmg, src, o);
  // 孢子團：沿路留下孢子（12 秒），有人靠近 0.4 秒後爆開
  const spores = [];
  AI.mine = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; let mv = false; if (walk && d > 2) { H.move(e, a + Math.sin(e.t) * 0.6, sp, dt); mv = true; } else if (e.cd <= 0 && d <= 1.4) { e.cd = 1.2; hit(H, P, e.dmg * 0.6, e); }
    e.spT = (e.spT == null ? 1.5 : e.spT) - dt;
    if (e.spT <= 0 && spores.length < 40) { e.spT = 2.2; const TH = THREE, m = new TH.Mesh(new TH.SphereGeometry(0.22, 6, 5), new TH.MeshBasicMaterial({ color: '#B8F07A' })); m.position.set(e.x, 0.25, e.z); W().scene.add(m); spores.push({ x: e.x, z: e.z, m, t: 12, fuse: -1, dmg: e.dmg, src: e }); }
    return mv;
  };
  const stepSpores = dt => {
    for (let i = spores.length - 1; i >= 0; i--) {
      const s = spores[i]; s.t -= dt; const near = targets().some(t => Math.hypot(t.x - s.x, t.z - s.z) < 1.4);
      if (s.fuse < 0 && near) s.fuse = 0.4;
      if (s.fuse >= 0) { s.fuse -= dt; s.m.scale.setScalar(1 + (0.4 - s.fuse) * 2); }
      else s.m.scale.setScalar(1 + Math.sin(s.t * 6) * 0.15);
      if (s.fuse >= 0 && s.fuse <= 0) { R.fx('boom', s.x, 0.3, s.z, { r: 1.6, color: '#9ACF6A' }); targets().forEach(t => { if (Math.hypot(t.x - s.x, t.z - s.z) < 1.7) { if (t === W().P) { R.hurtPlayer(s.dmg, s.src); t.slowT = Math.max(t.slowT || 0, 1.5); } else if (R.hurtAlly) R.hurtAlly(t, s.dmg, s.src); } }); s.t = 0; }
      if (s.t <= 0) { if (s.m.parent) s.m.parent.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); spores.splice(i, 1); }
    }
  };
  // 分裂膠：一般的追人；打倒時分成兩隻小的（在 killEnemy 裡）
  AI.split = (e, P, d, a, sp, dt, walk, H) => { e.yaw = a; if (d > e.def.size + 0.7) { if (walk) { H.move(e, a, sp, dt); return true; } } else if (e.cd <= 0) { e.cd = 1; hit(H, P, e.dmg, e); } return false; };
  // 引魂燈：離你六到九公尺，每三秒幫最需要的同伴補血
  AI.healer = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; const want = d < 6 ? a + Math.PI : d > 9 ? a : a + Math.PI / 2 * (e.side || (e.side = rnd() < 0.5 ? 1 : -1)); let mv = false; if (walk) { H.move(e, want, sp * (d > 6 && d < 9 ? 0.4 : 1), dt); mv = true; }
    if (e.cd <= 0) { const w = W(), hurt = w.enemies.filter(o => !o.dead && o !== e && !o.def.boss && dist2(o, e) < 9 && o.hp < o.hpMax).sort((p, q) => p.hp / p.hpMax - q.hp / q.hpMax)[0]; if (hurt) { e.cd = 3; const n = Math.round(hurt.hpMax * 0.25); hurt.hp = Math.min(hurt.hpMax, hurt.hp + n); R.fx('ring', hurt.x, 0.1, hurt.z, { r: 1.2, color: '#9AE8B0' }); R.fx('bolt', e.x, 1, e.z, { to: hurt }); R.num(hurt.x, 1.6 + hurt.def.size * 0.5, hurt.z, '+' + n, 'heal'); } else e.cd = 1; }
    return mv;
  };
  // 盾甲蟲：慢慢靠近；每五秒幫附近的同伴罩上護盾（四秒、傷害減半）
  AI.aegis = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; let mv = false; if (walk && d > 1.8) { H.move(e, a, sp, dt); mv = true; } else if (e.cd <= 0 && d <= 1.8) { e.cd = 1.1; hit(H, P, e.dmg, e); }
    e.agT = (e.agT == null ? 2 : e.agT) - dt;
    if (e.agT <= 0) { e.agT = 5; R.fx('ring', e.x, 0.1, e.z, { r: 7, color: '#8AB0D0' }); W().enemies.forEach(o => { if (!o.dead && dist2(o, e) < 7) { o.aegisT = 4; R.fx('block', o.x, 1 + o.def.size * 0.4, o.z); } }); }
    return mv;
  };
  // 環刃鳥：在四公尺外繞圈，每兩秒半穿過你一次
  AI.orbit = (e, P, d, a, sp, dt, walk, H) => {
    if (e.ds) { e.ds.t -= dt; e.yaw = e.ds.a; if (walk) H.move(e, e.ds.a, sp * 3.2, dt); if (!e.ds.hit && d < 1.2) { e.ds.hit = 1; hit(H, P, e.dmg, e); } if (e.ds.t <= 0) e.ds = null; return true; }
    e.yaw = a; if (!walk) return false;
    if (d > 6) H.move(e, a, sp, dt); else H.move(e, a + Math.PI / 2 * (e.side || (e.side = rnd() < 0.5 ? 1 : -1)) * (d < 3 ? 1.4 : 1), sp, dt);
    if (e.cd <= 0 && d < 6.5) { e.cd = 2.5 + rnd(); e.ds = { a, t: 0.45 }; R.fx('aim', e.x, 0.3, e.z, { a, len: 4, t: 0.2 }); }
    return true;
  };
  // 稜鏡眼：離你六到十公尺；先拉紅線（0.9 秒），再射出一道十四公尺的光束
  AI.laser = (e, P, d, a, sp, dt, walk, H) => {
    if (e.lz) { e.yaw = e.lz.a; e.lz.t -= dt; if (e.lz.t <= 0) { const s = e.lz; e.lz = null; R.fx('beam', e.x, 1, e.z, { a: s.a, len: 14 }); R.fx('aim', e.x, 0.3, e.z, { a: s.a, len: 14, t: 0.15 }); R.shake(0.12); targets().forEach(t => { const dx = t.x - e.x, dz = t.z - e.z, al = dx * Math.sin(s.a) + dz * Math.cos(s.a), sd = Math.abs(dx * Math.cos(s.a) - dz * Math.sin(s.a)); if (al > 0 && al < 14 && sd < 0.8 && !(t.iframe > 0)) hit(H, t, e.dmg, e); }); } return false; }
    e.yaw = a; let mv = false; const want = d < 6 ? a + Math.PI : d > 10 ? a : a + Math.PI / 2 * (e.side || (e.side = rnd() < 0.5 ? 1 : -1));
    if (walk) { H.move(e, want, sp * (d > 6 && d < 10 ? 0.4 : 1), dt); mv = true; }
    if (e.cd <= 0 && d < 12) { e.cd = 3.6; e.lz = { a, t: 0.9 }; R.fx('aim', e.x, 0.3, e.z, { a, len: 14, t: 0.9 }); }
    return mv;
  };
  // 護盾：傷害減半
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => he0(e, e && e.aegisT > 0 ? raw * 0.5 : raw, o);
  // 分裂
  const kill0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const r = kill0(e, by);
    if (e && e.id === 'splitgel' && W().run) { [-1, 1].forEach(s => { const [x, z] = R.nearestFloor(e.x + s * 0.8, e.z + 0.3); const c = R.spawnEnemy('splitgel_s', x, z, e.room, { aggro: true }); if (c) c.cd = 0.6; }); }
    return r;
  };
  // 每一格：孢子、護盾倒數
  const step0 = R.step;
  R.step = dt => { step0(dt); const w = W(); if (!w.run) { if (spores.length) spores.splice(0).forEach(s => s.m.parent && s.m.parent.remove(s.m)); return; } stepSpores(dt); (w.enemies || []).forEach(e => { if (e.aegisT > 0) e.aegisT -= dt; }); };
  const lf0 = R.loadFloor; if (lf0) R.loadFloor = (...a) => { spores.splice(0).forEach(s => { if (s.m.parent) s.m.parent.remove(s.m); }); return lf0(...a); };

  // ---------- 生物池 ----------
  const G = id => R.GRADES.find(g => g.id === id), addPool = (gid, ids) => { const g = G(gid); if (g) ids.forEach(i => { if (!g.pool.includes(i)) g.pool.push(i); }); };
  addPool('hamilia', ['glowslug', 'ruinrat', 'pebblemite']);
  addPool('amile', ['glowslug', 'ruinrat', 'pebblemite', 'sporepuff', 'jellylamp', 'splitgel', 'lanternwisp']);
  addPool('mors', ['sporepuff', 'jellylamp', 'splitgel', 'lanternwisp', 'crystmantis', 'shieldbeetle', 'ringbird', 'prismeye', 'gearsentry', 'tarbeast', 'echoshade', 'bonefiddler', 'voidmoth', 'starspider', 'mirrorwraith', 'twinhound']);
  addPool('kesent', ['crystmantis', 'shieldbeetle', 'ringbird', 'prismeye', 'gearsentry', 'tarbeast', 'echoshade', 'bonefiddler', 'voidmoth', 'starspider', 'mirrorwraith', 'twinhound', 'clockknight', 'thornqueen']);
  const kaso = G('kaso'); if (kaso && kaso.pool) ['crystmantis', 'shieldbeetle', 'ringbird', 'prismeye', 'voidmoth', 'starspider', 'twinhound', 'clockknight', 'thornqueen', 'lanternwisp'].forEach(i => { if (!kaso.pool.includes(i)) kaso.pool.push(i); });
  const fav = (t, o) => { const T0 = R.TYPES[t]; if (T0) T0.favor = Object.assign({}, T0.favor, o); };
  fav('tomb', { bonefiddler: 2, echoshade: 1 });
  fav('city', { gearsentry: 2, clockknight: 1, mirrorwraith: 1 });
  fav('maze', { sporepuff: 2, starspider: 1, glowslug: 1 });
  fav('tower', { ringbird: 2, prismeye: 1, voidmoth: 1 });
  fav('island', { jellylamp: 2, splitgel: 1 });
})(window.R);
