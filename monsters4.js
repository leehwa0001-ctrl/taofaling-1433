// 遺跡生物（第四批）：參考有名的妖怪再做三十種（作者：妖怪有幾種就做幾種），總數到一百。名字都是自己取的，不用妖怪的原名。
// 新的行為：pull（濕鱗女、巨蟾：拉一條線，把人捲過去再咬）、luck（福影童：只會逃，打倒掉一把魔力水晶）、prophet（預言犢：不攻擊，靠近會說出樓層通道在哪裡；殺了牠佩特拉的注意大增）、
//  swap（翻枕影：和你交換位置）、hydra（八首蟒：好幾顆頭從地上咬過來）、club（赤角巨人：扇形砸地）、twoface（後口女：從背後打牠會被後腦的嘴咬）。
// 福影童、預言犢不在一般的生物池裡：每一層有一成五的機會各出現一隻。
(function (R) {
  const W = () => R.W, ART = R.BEAST_ART, rnd = Math.random, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const targets = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed), R.netTargets ? R.netTargets() : []).filter(t => t && !t.dead); };   // 多人連線：房主這邊也算別人（net2.js）

  // ---------- 資料 ----------
  const NEW = {
    fukudo: { name: '福影童', hp: 30, dmg: 0, speed: 4.6, xp: 20, size: 0.55, ai: 'luck', color: '#E8C8D8', eye: '#1A1410', desc: '穿著紅色和服的小孩影子，一看到人就跑。追上去打倒牠，會掉下一把魔力水晶。很少見。' },
    azuki: { name: '淘豆聲', hp: 24, dmg: 0, speed: 2.2, xp: 7, size: 0.6, ai: 'alarm', color: '#8A7A5A', eye: '#FFFFFF', desc: '躲在水邊沙沙地淘著豆子的矮小人影。被看到就大叫，把附近的遺跡生物都叫醒。先打掉。' },
    akane: { name: '長舌穢', hp: 40, dmg: 11, speed: 2.8, xp: 10, size: 0.7, ai: 'reach', color: '#7A8A5A', eye: '#FFE04A', desc: '舔著髒東西的瘦小怪物，舌頭可以伸很長。地上拉出一條線，就是舌頭要甩過來了。' },
    umiso: { name: '黑潮僧', hp: 230, dmg: 18, speed: 2.4, xp: 30, size: 1.5, ai: 'slam', fly: 1, ownY: 1, elite: 1, env: 'deep', coreChance: 0.22, color: '#1A2A3A', eye: '#FFE04A', desc: '只在深海環境出現。從黑水裡浮起來的巨大光頭，地上出現大圈就是要壓下來了。' },
    nureo: { name: '濕鱗女', hp: 70, dmg: 13, speed: 2.8, xp: 14, size: 0.9, ai: 'pull', env: 'deep', color: '#3A6A5A', eye: '#FFD04A', desc: '只在深海環境出現。上半身是長髮的女人、下半身是蛇。地上拉出一條線，就是尾巴要把人捲過去了。' },
    inugami: { name: '附犬靈', hp: 32, dmg: 11, speed: 4.4, xp: 9, size: 0.7, ai: 'stalk', color: '#C8B8A0', eye: '#FF5A3A', desc: '只剩頭和一團白霧的犬。跟在後面，你一摔倒或翻滾就撲上來。' },
    yamata: { name: '八首蟒', hp: 320, dmg: 20, speed: 1.6, xp: 40, size: 1.8, ai: 'hydra', armor: 0.15, elite: 1, coreChance: 0.3, color: '#4A5A3A', eye: '#FF3A3A', desc: '八顆頭的大蛇，身體埋在地底。地上一次出現好幾個圈，就是頭要從那裡咬上來了。克森特級才看得到。' },
    akaoni: { name: '赤角巨人', hp: 280, dmg: 24, speed: 2.6, xp: 36, size: 1.6, ai: 'club', armor: 0.1, elite: 1, coreChance: 0.25, color: '#C8402A', eye: '#FFE04A', desc: '紅皮膚、頭上長角、扛著鐵棒的巨人。地上出現扇形就是要砸下來了——往旁邊躲。摩爾斯級以上才看得到。' },
    mineba: { name: '嶺婆', hp: 50, dmg: 11, speed: 4, xp: 12, size: 0.8, ai: 'kite', shoot: 0.55, fan: 2, shot: 'feather', color: '#8A8A7A', eye: '#FFE04A', desc: '披頭散髮的老婆婆，跑得比年輕人還快，一邊跑一邊丟菜刀。' },
    yukiko: { name: '雪粒童', hp: 26, dmg: 8, speed: 3.4, xp: 8, size: 0.5, ai: 'kite', shoot: 0.5, freeze: 1, env: 'snow', color: '#E8F2F8', eye: '#3A6ACF', desc: '只在凍原環境出現。戴著草帽的雪孩子，丟出的雪球打中會變慢。' },
    datara: { name: '獨足鍛', hp: 90, dmg: 16, speed: 2.4, xp: 15, size: 1, ai: 'hop', color: '#6A5A4A', eye: '#FF8A3A', desc: '一隻腳、一隻眼的鍛冶匠，用一條腿跳著走，落地的時候會震一下。' },
    ubume: { name: '抱嬰鳥', hp: 30, dmg: 10, speed: 4.6, xp: 9, size: 0.7, ai: 'swoop', fly: 1, color: '#D8D0C0', eye: '#C83A3A', desc: '抱著布包的鳥。在頭上繞圈，聽到哭聲就是要俯衝了。' },
    kasha: { name: '焚車貓', hp: 70, dmg: 16, speed: 7, xp: 13, size: 1, ai: 'roll', env: 'volcano', color: '#3A2A2A', eye: '#FF8A3A', desc: '只在火山環境出現。拉著燒起來的車的黑貓，直直衝過來。' },
    tsurube: { name: '墜桶', hp: 60, dmg: 15, speed: 2.4, xp: 11, size: 0.9, ai: 'ambush', color: '#6A5038', eye: '#FFE04A', desc: '掛在高處的一顆大頭，人一走到底下就掉下來。看到天花板上有東西就繞開。' },
    kudan: { name: '預言犢', hp: 40, dmg: 0, speed: 1.2, xp: 0, size: 0.8, ai: 'prophet', color: '#C8A878', eye: '#1A1410', desc: '人臉的小牛，不會攻擊人。走到牠旁邊，牠會說出這一層的樓層通道在哪裡。殺了牠，佩特拉的注意會大增。很少見。' },
    makura: { name: '翻枕影', hp: 44, dmg: 12, speed: 2.6, xp: 12, size: 0.7, ai: 'swap', color: '#4A3A6A', eye: '#FFE04A', desc: '抱著枕頭的小和尚影子。會和你交換位置——一回神就站在別的地方，背後還有東西。' },
    tofuko: { name: '捧盤童', hp: 22, dmg: 6, speed: 2.6, xp: 5, size: 0.5, ai: 'kite', shoot: 0.4, freeze: 1, color: '#E8E0C8', eye: '#1A1410', desc: '戴著大斗笠、捧著一盤豆腐的小孩。丟過來的豆腐黏黏的，打中會變慢。' },
    setosho: { name: '陶片將', hp: 90, dmg: 14, speed: 2, xp: 15, size: 0.9, ai: 'guard', armor: 0.3, color: '#C8D0D8', eye: '#3A6ACF', desc: '碗盤、茶壺拼成的武將。舉著盤子當盾，正面幾乎打不動。' },
    tsuchikoro: { name: '滾土球', hp: 50, dmg: 12, speed: 6.4, xp: 9, size: 0.9, ai: 'roll', color: '#7A6A4A', eye: '#FFFFFF', desc: '一團會滾的土，滾過來撞人，撞到牆會停一下。' },
    kanibo: { name: '蟹甲僧', hp: 130, dmg: 16, speed: 2.4, xp: 18, size: 1.2, ai: 'charge', armor: 0.4, color: '#B8503A', eye: '#1A1410', desc: '穿著袈裟的大螃蟹，殼硬得刀槍不入。低頭衝撞之後會暈一下，那時候打。' },
    ogama: { name: '巨蟾', hp: 110, dmg: 14, speed: 2.2, xp: 16, size: 1.2, ai: 'pull', color: '#6A7A3A', eye: '#FFD04A', desc: '比人還大的蟾蜍。舌頭一捲就把人拉過去咬。' },
    kyokotsu: { name: '井底骸', hp: 64, dmg: 14, speed: 3, xp: 12, size: 0.9, ai: 'burrow', color: '#D8D0C0', eye: '#7FD8FF', desc: '從地底的井爬出來的白骨，在地下游，從腳下抓上來。' },
    aobo: { name: '青目僧', hp: 56, dmg: 13, speed: 3, xp: 12, size: 0.8, ai: 'blink', color: '#3A6A9A', eye: '#FFFFFF', desc: '一隻眼睛的青色和尚，會突然出現在你背後。' },
    oshiroi: { name: '撲粉嫗', hp: 40, dmg: 8, speed: 2.4, xp: 9, size: 0.7, ai: 'smoke', color: '#F0E8E0', eye: '#C83A3A', desc: '臉上塗滿白粉的老婆婆，走過的地方飄著白粉，站在裡面看不清楚、喘不過氣。' },
    hannya: { name: '怨角面', hp: 240, dmg: 20, speed: 3, xp: 32, size: 1.1, ai: 'kite', shoot: 0.6, fan: 5, shot: 'spirit', elite: 1, coreChance: 0.22, color: '#E8D8C8', eye: '#FFD04A', desc: '戴著長角的女鬼面具，邊退邊放出五道怨火。克森特級才看得到。' },
    tenjo: { name: '舐梁影', hp: 60, dmg: 13, speed: 2.4, xp: 12, size: 1, ai: 'reach', color: '#4A4A3A', eye: '#FFE04A', desc: '高得頭頂到天花板的瘦長影子，用長舌頭從上面舔下來。' },
    tenome: { name: '掌眼人', hp: 46, dmg: 11, speed: 2.6, xp: 11, size: 0.8, ai: 'kite', shoot: 0.5, fan: 2, shot: 'ering', color: '#9A8A8A', eye: '#C83A3A', desc: '眼睛長在手掌上的盲人。舉起雙手，兩隻眼睛各射出一道光。' },
    futakuchi: { name: '後口女', hp: 70, dmg: 13, speed: 3, xp: 14, size: 0.8, ai: 'twoface', color: '#2A1E1A', eye: '#C83A3A', desc: '長髮的女人，後腦勺有一張大嘴。從背後打牠，後面那張嘴會反咬你一口。' },
    hihi: { name: '狂猿', hp: 260, dmg: 22, speed: 4.2, xp: 34, size: 1.5, ai: 'pounce', elite: 1, coreChance: 0.22, color: '#8A6A4A', eye: '#FF3A3A', desc: '比人還高的大猿，力氣大得嚇人。蹲低之後會飛撲過來。摩爾斯級以上才看得到。' },
    oboro: { name: '霧牛車', hp: 300, dmg: 24, speed: 6.4, xp: 36, size: 1.7, ai: 'roll', elite: 1, coreChance: 0.25, color: '#3A3A4A', eye: '#FFE04A', desc: '霧裡出現的牛車，簾子後面是一張巨大的臉。直直衝過來，撞牆會停一下。克森特級才看得到。' }
  };
  Object.keys(NEW).forEach(id => { R.ENEMIES[id] = Object.assign({ ref: '' }, NEW[id]); });

  // ---------- 點陣圖 ----------
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
  const legs2 = (G, fr, x1, x2, y, len, c) => { G.rect(x1, y, 1, fr ? len : len - 1, c); G.rect(x2, y, 1, fr ? len - 1 : len, c); };
  // 人形的底：頭、身體、腳（kimono：k、皮膚：s、頭髮：h）
  const person = (G, fr, o) => { const { w = 11, top = 2, hw = 3, body = 8 } = o || {}; const cx = Math.floor(w / 2); G.disc(cx, top + 2, 2.4, 's'); G.rect(cx - hw, top + 5, hw * 2 + 1, body, 'k'); legs2(G, fr, cx - 2, cx + 2, top + 5 + body, 3, 's'); };

  add('fukudo', { h: '#1A1714', s: '#F2E2D0', k: '#C8323A', o: '#F2C84A', e: '#1A1410' }, 11, 16, (G, fr) => { person(G, fr, { top: 1, hw: 3, body: 8 }); G.rect(3, 1, 5, 2, 'h'); G.rect(2, 3, 1, 3, 'h'); G.rect(8, 3, 1, 3, 'h'); G.p(6, 3, 'e'); G.rect(2, 9, 7, 1, 'o'); });
  add('azuki', { h: '#3A3020', s: '#C8B898', k: '#6A5A3A', b: '#8A3A2A', w: '#7FB8D8' }, 13, 12, (G, fr) => { G.disc(5, 3, 2.4, 'h'); G.p(6, 3, 's'); G.ell(5, 7, 3.5, 2.5, 'k'); G.ell(10, 9, 2.6, 1.6, 'w'); G.p(fr ? 9 : 10, 8, 'b'); G.p(11, 9, 'b'); G.line(7, 7, 9, 8, 's'); G.rect(3, 10, 1, 2, 's'); G.rect(6, 10, 1, 2, 's'); });
  add('akane', { a: '#7A8A5A', A: '#5A6A3A', t: '#E86A7A', e: '#FFE04A', k: '#2A2014' }, 15, 12, (G, fr) => { G.ell(5, 7, 3.5, 3.5, 'a'); G.disc(7, 3, 2.4, 'a'); G.p(8, 2, 'e'); G.line(9, 4, fr ? 14 : 12, fr ? 5 : 4, 't'); G.rect(3, 10, 1, 2, 'A'); G.rect(7, 10, 1, 2, 'A'); G.p(1, 6, 'A'); G.p(2, 4, 'A'); });
  add('umiso', { k: '#1A2A3A', K: '#2E4258', w: '#E8F0F8', e: '#FFE04A', b: '#0E1620' }, 23, 21, (G, fr) => { G.ell(11, 10, 10, 9, 'k'); G.ell(9, 6, 5, 3, 'K'); G.rect(7, 9, 3, 2, 'e'); G.rect(13, 9, 3, 2, 'e'); G.line(8, 15, 15, 15, 'b'); for (let x = 2; x < 22; x += 3) G.p(x, 19 + (fr ? x % 2 : 1 - x % 2), 'w'); });
  add('nureo', { h: '#141018', s: '#D8E0D8', g: '#3A6A5A', G: '#2A4A40', e: '#FFD04A' }, 17, 18, (G, fr) => { G.disc(10, 3, 2.4, 'h'); G.p(11, 3, 's'); G.line(8, 3, 6, 9, 'h'); G.rect(8, 5, 4, 5, 's'); G.ell(9, 13, 5, 2, 'g'); const t = fr ? [[4, 13], [1, 15], [3, 17]] : [[4, 13], [1, 14], [2, 17]]; for (let i = 1; i < 3; i++) G.line(t[i - 1][0], t[i - 1][1], t[i][0], t[i][1], 'G'); G.p(11, 2, 'e'); });
  add('inugami', { w: '#E8E0D0', W: '#C8B8A0', k: '#2A2014', e: '#FF5A3A' }, 15, 10, (G, fr) => { G.ell(6, 6, 5, 2.5, 'W'); G.ell(3, 7, 3, 1.5, 'w'); G.disc(11, 4, 2.6, 'w'); G.p(12, 3, 'e'); G.p(10, 1, 'w'); G.line(13, 5, 14, 6, 'k'); G.p(fr ? 1 : 2, 9, 'w'); G.p(fr ? 5 : 4, 9, 'w'); });
  add('yamata', { g: '#4A5A3A', G: '#6A7A4A', k: '#2A3020', e: '#FF3A3A', d: '#3A2A1E' }, 27, 22, (G, fr) => { G.ell(13, 19, 12, 3, 'd'); for (let i = 0; i < 5; i++) { const x0 = 5 + i * 4, sway = (fr ? 1 : -1) * (i % 2 ? 1 : -1); G.line(x0, 19, x0 + sway, 9 - (i % 2) * 3, 'g'); G.line(x0 + 1, 19, x0 + 1 + sway, 9 - (i % 2) * 3, 'G'); G.ell(x0 + sway + 1, 7 - (i % 2) * 3, 2, 1.6, 'g'); G.p(x0 + sway + 2, 6 - (i % 2) * 3, 'e'); } });
  add('akaoni', { r: '#C8402A', R: '#A83020', h: '#1A1410', y: '#F2D86A', w: '#E8E0D0', k: '#4A4A52', e: '#FFE04A' }, 21, 25, (G, fr) => { G.disc(10, 5, 3.6, 'r'); G.line(7, 2, 6, 0, 'w'); G.line(13, 2, 14, 0, 'w'); G.rect(7, 2, 7, 2, 'h'); G.p(9, 5, 'e'); G.p(12, 5, 'e'); G.rect(5, 9, 11, 9, 'r'); G.rect(6, 15, 9, 3, 'y'); G.line(16, 10, 20, 1, 'k'); G.line(17, 10, 21, 2, 'k'); G.rect(2, 10, 3, 6, 'R'); legs2(G, fr, 7, 13, 18, 6, 'R'); G.rect(6, 18, 1, 1, 'R'); });
  add('mineba', { h: '#C8C8C0', s: '#B8A890', k: '#5A5A4A', e: '#FFE04A', w: '#E8E8F0' }, 13, 19, (G, fr) => { person(G, fr, { w: 13, top: 2, hw: 3, body: 9 }); G.line(3, 3, 1, 10, 'h'); G.line(9, 3, 11, 10, 'h'); G.rect(4, 1, 5, 2, 'h'); G.p(7, 4, 'e'); G.line(10, 8, 12, 6, 'w'); });
  add('yukiko', { s: '#F2E8E0', k: '#E8F2F8', K: '#9AC0E8', h: '#C8A060', e: '#3A6ACF' }, 11, 14, (G, fr) => { G.ell(5, 2.5, 5, 1.5, 'h'); G.disc(5, 5, 2.4, 's'); G.p(6, 5, 'e'); G.rect(2, 8, 7, 4, 'k'); G.line(2, 11, 8, 11, 'K'); legs2(G, fr, 3, 7, 12, 2, 'K'); });
  add('datara', { a: '#6A5A4A', A: '#4A3A2E', e: '#FF8A3A', k: '#2A2014', m: '#8A8A92' }, 13, 20, (G, fr) => { G.disc(6, 4, 3.2, 'a'); G.disc(6, 4, 1.4, 'e'); G.rect(3, 8, 7, 7, 'A'); G.rect(fr ? 5 : 6, 15, 2, fr ? 5 : 4, 'a'); G.line(10, 9, 12, 4, 'm'); G.rect(11, 2, 2, 3, 'm'); });
  add('ubume', { w: '#D8D0C0', W: '#A8A090', b: '#F0E8E0', e: '#C83A3A', k: '#2A2420' }, 17, 13, (G, fr) => { for (let i = 0; i < 4; i++) G.line(7, 5, 1 + i, fr ? 10 - i * 0.5 : 1 + i * 1.6, i % 2 ? 'W' : 'w'); G.ell(9, 6, 3, 2.5, 'w'); G.disc(12, 4, 2, 'w'); G.p(13, 4, 'e'); G.line(14, 4, 16, 5, 'k'); G.ell(9, 9, 2, 1.5, 'b'); G.line(8, 11, 8, 12, 'k'); G.line(10, 11, 10, 12, 'k'); });
  add('kasha', { k: '#2A2020', K: '#3A2A2A', f: '#FF8A3A', F: '#FFD04A', w: '#6A4A2A', e: '#FF8A3A' }, 21, 15, (G, fr) => { G.disc(5, 9, 4.5, 'w'); G.disc(5, 9, 1.5, 'K'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + (fr ? 0.4 : 0); G.line(5, 9, 5 + Math.cos(a) * 4, 9 + Math.sin(a) * 4, 'K'); } G.p(2, 3, 'f'); G.p(5, 2, 'F'); G.p(8, 3, 'f'); G.ell(14, 9, 4, 2.5, 'k'); G.disc(18, 6, 2.2, 'k'); G.p(19, 6, 'e'); G.p(17, 3, 'k'); G.p(19, 3, 'k'); legs2(G, fr, 12, 16, 11, 3, 'k'); });
  add('tsurube', { h: '#1A1410', s: '#D8C0A0', w: '#6A5038', W: '#4A3828', e: '#FFE04A', m: '#8A2A2A', r: '#C8B898' }, 15, 19, (G, fr) => { G.line(7, 0, 7, 5, 'r'); G.rect(3, 4, 9, 3, 'w'); G.ell(7, 11, 6, 6, 's'); G.ell(7, 7, 6, 3, 'h'); G.p(5, 11, 'e'); G.p(9, 11, 'e'); G.line(5, 14, 9, 14, 'm'); if (fr) G.rect(5, 14, 5, 2, 'm'); });
  add('kudan', { a: '#C8A878', A: '#A88858', s: '#F2E2D0', e: '#1A1410', h: '#3A3020' }, 17, 13, (G, fr) => { G.ell(7, 7, 5.5, 3, 'a'); G.disc(13, 5, 2.6, 's'); G.rect(11, 2, 5, 1, 'h'); G.p(14, 5, 'e'); G.p(14, 7, 'e'); G.p(10, 2, 'A'); G.line(1, 6, 0, 9, 'A'); (fr ? [3, 6, 9, 11] : [4, 5, 10, 11]).forEach(x => G.rect(x, 10, 1, 3, 'A')); });
  add('makura', { s: '#D8C8B8', k: '#4A3A6A', K: '#6A5A8A', w: '#F0E8E0', e: '#FFE04A' }, 13, 15, (G, fr) => { G.disc(6, 3, 2.6, 's'); G.p(7, 3, 'e'); G.rect(3, 6, 7, 6, 'k'); G.ell(6, 9, 4, 2, 'w'); G.line(3, 9, 9, 9, 'K'); legs2(G, fr, 4, 8, 12, 3, 's'); });
  add('tofuko', { h: '#C8A060', s: '#F2E2D0', k: '#4A6A9A', w: '#F8F8F0', b: '#6A4A2E', e: '#1A1410' }, 13, 14, (G, fr) => { G.ell(6, 2, 6, 1.6, 'h'); G.disc(6, 5, 2.3, 's'); G.p(7, 5, 'e'); G.rect(3, 8, 7, 4, 'k'); G.rect(8, 7, 5, 1, 'b'); G.rect(9, 5, 3, 2, 'w'); legs2(G, fr, 4, 8, 12, 2, 's'); });
  add('setosho', { c: '#C8D0D8', C: '#9AA8B8', b: '#3A6ACF', k: '#2A2A32', e: '#3A6ACF' }, 15, 21, (G, fr) => { G.ell(7, 3, 3.5, 2.5, 'c'); G.line(4, 3, 10, 3, 'b'); G.p(8, 4, 'e'); G.rect(4, 6, 7, 8, 'C'); G.ell(7, 8, 2, 1.5, 'c'); G.line(4, 11, 10, 11, 'b'); G.ell(12, 10, 2.5, 3.5, 'c'); G.p(12, 10, 'b'); legs2(G, fr, 5, 9, 14, 6, 'C'); });
  add('tsuchikoro', { a: '#7A6A4A', A: '#5A4A34', l: '#9A8A6A', e: '#FFFFFF', k: '#1A1410' }, 13, 13, (G, fr) => { G.disc(6, 6, 5.6, 'a'); G.ell(5, 4, 2.5, 1.5, 'l'); const o = fr ? 1 : 0; G.p(7 + o, 6, 'e'); G.p(9 + o, 6, 'e'); G.p(8 + o, 6, 'k'); G.p(3 - o, 9, 'A'); G.p(9, 10 - o, 'A'); G.p(2, 5 + o, 'A'); });
  add('kanibo', { r: '#B8503A', R: '#8A3A2A', y: '#E8C060', e: '#1A1410', k: '#2A1A14' }, 21, 15, (G, fr) => { G.ell(10, 7, 6.5, 4, 'r'); G.ell(10, 7, 3, 4, 'y', (x, y) => y > 5); G.p(9, 3, 'e'); G.p(12, 3, 'e'); G.line(9, 3, 9, 1, 'k'); G.line(12, 3, 12, 1, 'k'); G.ell(18, 5, 2.5, 2, 'R'); G.ell(2.5, 5, 2.5, 2, 'R'); (fr ? [5, 8, 12, 15] : [6, 8, 13, 14]).forEach(x => G.line(x, 10, x + (x < 10 ? -2 : 2), 14, 'R')); });
  add('ogama', { g: '#6A7A3A', G: '#4A5A28', y: '#D8D08A', e: '#FFD04A', k: '#1A1410', t: '#E86A7A' }, 21, 15, (G, fr) => { G.ell(10, 9, 9, 5, 'g'); G.ell(11, 11, 6, 3, 'y'); G.disc(14, 4, 2, 'g'); G.p(14, 3, 'e'); G.p(15, 3, 'k'); G.line(17, 7, 20, 7, 'k'); if (fr) G.line(18, 8, 20, 9, 't'); [3, 7, 12, 16].forEach(x => G.rect(x, 13, 2, 2, 'G')); G.p(6, 6, 'G'); G.p(9, 5, 'G'); });
  add('kyokotsu', { b: '#D8D0C0', B: '#A8A090', h: '#3A3A42', e: '#7FD8FF', w: '#5A5050' }, 13, 20, (G, fr) => { G.disc(6, 4, 2.8, 'b'); G.p(5, 4, 'e'); G.p(7, 4, 'e'); G.line(3, 3, 1, 12, 'h'); G.rect(3, 8, 7, 1, 'B'); G.rect(3, 10, 7, 1, 'B'); G.line(6, 7, 6, 14, 'b'); G.line(4, 8, fr ? 1 : 2, 13, 'b'); G.line(8, 8, fr ? 11 : 10, 13, 'b'); G.rect(1, 15, 11, 5, 'w'); G.rect(2, 15, 9, 1, 'B'); });
  add('aobo', { s: '#5A8ABA', k: '#3A6A9A', K: '#2A4A6A', w: '#FFFFFF', e: '#1A1A1A' }, 13, 19, (G, fr) => { G.disc(6, 4, 3.2, 's'); G.disc(6, 4, 1.4, 'w'); G.p(6, 4, 'e'); G.rect(2, 8, 9, 8, 'k'); G.line(2, 11, 10, 11, 'K'); legs2(G, fr, 4, 8, 16, 3, 's'); });
  add('oshiroi', { w: '#F0E8E0', s: '#E8D8C8', h: '#3A3030', k: '#8A6A9A', r: '#C83A3A', e: '#1A1410' }, 13, 19, (G, fr) => { person(G, fr, { w: 13, top: 2, hw: 3, body: 9 }); G.disc(6, 4, 2.4, 'w'); G.rect(4, 1, 5, 2, 'h'); G.p(5, 4, 'e'); G.p(7, 4, 'e'); G.p(6, 6, 'r'); G.p(1, 8, 'w'); G.p(11, 10, 'w'); G.p(2, 13, 'w'); });
  add('hannya', { w: '#E8D8C8', W: '#C8B8A8', r: '#C83A3A', h: '#1A1410', e: '#FFD04A', k: '#5A2A4A' }, 17, 22, (G, fr) => { G.ell(8, 6, 4.5, 5, 'w'); G.line(4, 2, 2, 0, 'W'); G.line(12, 2, 14, 0, 'W'); G.rect(4, 1, 9, 2, 'h'); G.p(6, 5, 'e'); G.p(10, 5, 'e'); G.line(5, 9, 11, 9, 'r'); G.p(5, 10, 'w'); G.p(11, 10, 'w'); G.rect(4, 11, 9, 9, 'k'); G.line(2, 6, 1, 18, 'h'); G.line(14, 6, 15, 18, 'h'); for (let x = 4; x <= 12; x += 2) G.p(x, 20 + ((x + fr) % 2), 'k'); });
  add('tenjo', { k: '#4A4A3A', K: '#2E2E24', t: '#E86A7A', e: '#FFE04A' }, 13, 28, (G, fr) => { G.rect(5, 6, 3, 16, 'k'); G.disc(6, 3, 2.4, 'k'); G.p(7, 3, 'e'); G.line(8, 4, fr ? 12 : 11, fr ? 9 : 7, 't'); G.line(5, 8, 2, 16, 'K'); G.line(8, 8, 10, 15, 'K'); legs2(G, fr, 5, 7, 22, 6, 'K'); });
  add('tenome', { s: '#9A8A8A', k: '#4A4048', e: '#C83A3A', w: '#FFFFFF', h: '#2A2420' }, 15, 19, (G, fr) => { G.disc(7, 4, 2.6, 's'); G.rect(5, 1, 5, 2, 'h'); G.rect(4, 7, 7, 8, 'k'); G.line(4, 8, 1, fr ? 3 : 4, 's'); G.line(10, 8, 13, fr ? 4 : 3, 's'); G.disc(1, fr ? 3 : 4, 1.2, 'w'); G.p(1, fr ? 3 : 4, 'e'); G.disc(13, fr ? 4 : 3, 1.2, 'w'); G.p(13, fr ? 4 : 3, 'e'); legs2(G, fr, 5, 9, 15, 4, 's'); });
  add('futakuchi', { h: '#1A1410', s: '#E8D8C8', k: '#5A2A2A', m: '#C83A3A', w: '#F0E8E0', e: '#C83A3A' }, 13, 19, (G, fr) => { person(G, fr, { w: 13, top: 2, hw: 3, body: 9 }); G.ell(5, 4, 3, 3, 'h'); G.p(7, 4, 'e'); G.ell(3, 5, 1.6, fr ? 1.6 : 1, 'm'); G.p(2, 4, 'w'); G.p(2, 6, 'w'); G.line(3, 3, 1, 11, 'h'); });
  add('hihi', { a: '#8A6A4A', A: '#6A4A30', s: '#D8A888', e: '#FF3A3A', k: '#1A1410' }, 21, 22, (G, fr) => { G.ell(10, 11, 7, 7, 'a'); G.disc(12, 4, 3.5, 'A'); G.ell(13, 5, 2.4, 2, 's'); G.p(12, 4, 'e'); G.p(14, 4, 'e'); G.line(12, 7, 15, 7, 'k'); G.line(4, 9, 1, fr ? 19 : 18, 'A'); G.line(16, 9, 19, fr ? 18 : 19, 'A'); legs2(G, fr, 7, 13, 17, 5, 'A'); });
  add('oboro', { k: '#3A3A4A', K: '#24242E', s: '#E8D8C8', e: '#FFE04A', w: '#5A4A3A', m: '#8A2A2A', r: '#C8B8A0' }, 25, 21, (G, fr) => { G.rect(3, 3, 13, 11, 'K'); G.rect(4, 2, 11, 1, 'k'); G.ell(9.5, 8, 4.5, 4.5, 's'); G.p(8, 7, 'e'); G.p(11, 7, 'e'); G.line(8, 10, 11, 10, 'm'); G.line(4, 4, 15, 4, 'r'); G.disc(9, 16, 4, 'w'); G.disc(9, 16, 1.4, 'K'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + (fr ? 0.4 : 0); G.line(9, 16, 9 + Math.cos(a) * 4, 16 + Math.sin(a) * 4, 'K'); } G.line(16, 9, 24, 11, 'w'); });

  // ---------- 新的行為 ----------
  const AI = R.AI_X = R.AI_X || {};
  const hit = (H, t, dmg, src, o) => H.hurtT(t, dmg, src, o);
  // 福影童：只會逃
  AI.luck = (e, P, d, a, sp, dt, walk, H) => { e.yaw = a + Math.PI; if (walk && d < 12) { H.move(e, a + Math.PI + Math.sin(e.t * 1.7) * 0.7, sp, dt); return true; } return false; };
  // 預言犢：不攻擊；第一次走到旁邊，說出樓層通道在哪裡（小地圖上看得到那一間）
  AI.prophet = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (!e.spoke && d < 3.2) {
      e.spoke = 1; const F = W().F, end = F && F.rooms.find(r => r.type === 'stairs' || r.type === 'deep' || r.type === 'boss');
      if (end) { end.visited = true; Object.values(end.links).forEach(j => { if (F.rooms[j]) F.rooms[j].visited = true; }); if (R.drawMinimap) R.drawMinimap(true); }
      R.banner('預言犢開口了', end ? '「往' + (end.x > e.x + 4 ? '東' : end.x < e.x - 4 ? '西' : '') + (end.z > e.z + 4 ? '南' : end.z < e.z - 4 ? '北' : '') + '走……門在那裡。」（小地圖上標出來了）' : '「……這裡沒有路了。」');
    }
    if (walk && d > 5) { H.move(e, e.wa || (e.wa = rnd() * 6.28), sp * 0.4, dt); return true; }
    return false;
  };
  // 翻枕影：和你交換位置（你身後留著牠的爪子）
  AI.swap = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.swT > 0) { e.swT -= dt; if (e.swT <= 0 && !e.dead) { const Pl = W().P; if (Pl && !Pl.dead && !(Pl.iframe > 0) && dist2(e, Pl) < 9) { const ox = Pl.x, oz = Pl.z; R.fx('blink', Pl.x, 1, Pl.z); R.fx('blink', e.x, 1, e.z); Pl.x = e.x; Pl.z = e.z; e.x = ox; e.z = oz; e.m.g.position.x = e.x; e.m.g.position.z = e.z; e.strike = 0.4; R.toast('……眼前的景色突然換了。'); } } return false; }
    if (e.strike > 0) { e.strike -= dt; if (e.strike <= 0 && dist2(e, P) < 2) hit(H, P, e.dmg * 1.2, e); return false; }
    let mv = false; if (walk && d > 1.6) { H.move(e, a, sp, dt); mv = true; } else if (e.cd <= 0 && d <= 1.6) { e.cd = 1.2; hit(H, P, e.dmg, e); }
    e.swC = (e.swC == null ? 4 : e.swC) - dt;
    if (e.swC <= 0 && d < 8 && d > 3) { e.swC = 7 + rnd() * 3; e.swT = 0.7; R.fx('mark', P.x, 0, P.z, { r: 0.9, t: 0.7 }); R.fx('mark', e.x, 0, e.z, { r: 0.9, t: 0.7 }); }
    return mv;
  };
  const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  // 濕鱗女、巨蟾：拉一條線，把線上的人捲到身邊，再咬
  AI.pull = (e, P, d, a, sp, dt, walk, H) => {
    if (e.pl) {
      e.yaw = e.pl.a; e.pl.t -= dt;
      if (e.pl.t <= 0) { const s = e.pl, Pl = W().P; e.pl = null; R.fx('slash', e.x, 1, e.z, { a: s.a, len: 6 }); targets().forEach(t => { const dx = t.x - e.x, dz = t.z - e.z, al = dx * Math.sin(s.a) + dz * Math.cos(s.a), sd = Math.abs(dx * Math.cos(s.a) - dz * Math.sin(s.a)); if (al > 0 && al < 6.2 && sd < 0.9 && !(t.iframe > 0)) { hit(H, t, e.dmg, e); if (t === Pl) { const k = Math.max(0, al - 1.2); Pl.x -= Math.sin(s.a) * k; Pl.z -= Math.cos(s.a) * k; R.collide(Pl, 0.42); } } }); e.cd = 2.8; }
      return false;
    }
    e.yaw = a; let mv = false; e.bcd = (e.bcd || 0) - dt;
    if (d <= 1.6) { if (e.bcd <= 0) { e.bcd = 1.1; hit(H, P, e.dmg, e); } }
    else if (walk && (d > 6 || e.cd > 0)) { H.move(e, a, sp, dt); mv = true; }
    if (e.cd <= 0 && d < 6 && d > 2) { e.pl = { a, t: 0.6 }; R.fx('aim', e.x, 0.3, e.z, { a, len: 6, t: 0.6 }); }
    return mv;
  };
  // 八首蟒：慢慢靠近；一次三到五顆頭從地上咬上來（先出現圈）
  AI.hydra = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; let mv = false; if (walk && d > 4) { H.move(e, a, sp, dt); mv = true; }
    if (e.cd <= 0 && d < 16) {
      const hurt = 1 - e.hp / e.hpMax, n = 3 + Math.round(hurt * 2); e.cd = 2.8 - hurt;
      const pts = [[P.x, P.z]]; for (let i = 1; i < n; i++) { const aa = rnd() * 6.28, r = 1.5 + rnd() * 3; pts.push(R.nearestFloor(P.x + Math.sin(aa) * r, P.z + Math.cos(aa) * r)); }
      pts.forEach(([x, z]) => R.fx('mark', x, 0, z, { r: 1.3, t: 0.85 }));
      later(() => { if (e.dead) return; pts.forEach(([x, z]) => { R.fx('pillar', x, 0, z, { r: 0.6, color: '#6A7A4A' }); targets().forEach(t => { if (Math.hypot(t.x - x, t.z - z) < 1.3) hit(H, t, e.dmg, e, { knock: 0.3 }); }); }); R.shake(0.2); }, 850);
      if (hurt > 0.5 && rnd() < 0.5) for (let i = -2; i <= 2; i++) R.fire({ kind: 'seed', owner: 'e', x: e.x, z: e.z, a: a + i * 0.25, speed: 9, dmg: e.dmg * 0.6, life: 2, src: e });
    }
    return mv;
  };
  // 赤角巨人：扇形砸地（先出現扇形）
  AI.club = (e, P, d, a, sp, dt, walk, H) => {
    if (e.sm) { e.yaw = e.sm.a; e.sm.t -= dt; if (e.sm.t <= 0) { const s = e.sm; e.sm = null; R.fx('swing', e.x, 0, e.z, { a: s.a, arc: 1.8, range: 4.2, color: '#C8402A' }); R.fx('boom', e.x + Math.sin(s.a) * 3, 0.3, e.z + Math.cos(s.a) * 3, { r: 1.6, color: '#8A6A4A' }); R.shake(0.45); targets().forEach(t => { const dd = dist2(e, t), aa = Math.atan2(t.x - e.x, t.z - e.z); if (dd < 4.4 && Math.abs(wrap(aa - s.a)) < 0.95) hit(H, t, e.dmg * 1.4, e, { knock: 0.7 }); }); e.cd = 2; } return false; }
    e.yaw = a; let mv = false; if (walk && d > 3) { H.move(e, a, sp, dt); mv = true; }
    if (e.cd <= 0 && d < 4.6) { e.sm = { a, t: 0.85 }; R.fx('sector', e.x, 0, e.z, { a, arc: 1.8, range: 4.2, t: 0.85 }); }
    return mv;
  };
  // 後口女：追著咬；從背後打會被後面的嘴反咬（R.hurtEnemy 那裡）
  AI.twoface = (e, P, d, a, sp, dt, walk, H) => { e.yaw = a; if (d > 1.4) { if (walk) { H.move(e, a, sp, dt); return true; } return false; } if (e.cd <= 0) { e.cd = 0.9; hit(H, P, e.dmg, e); } return false; };
  const he = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    if (e && !e.dead && e.def.ai === 'twoface') { const Pl = W().P; const now = performance.now(); if (Pl && dist2(e, Pl) < 3.5 && Math.abs(wrap(Math.atan2(Pl.x - e.x, Pl.z - e.z) - e.yaw)) > 2.1 && !(now - (e.biteAt || 0) < 1200)) { e.biteAt = now; R.fx('ring', e.x, 0.1, e.z, { r: 1.2, color: '#C83A3A' }); R.num(e.x, 2.2, e.z, '後面的嘴咬了回來！', 'hurt'); R.hurtPlayer(e.dmg * 1.2, e); } }
    return he(e, raw, o);
  };
  // 打倒福影童：掉一把魔力水晶；殺了預言犢：佩特拉的注意大增
  const ke = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, id = e && e.id, r = ke(e, by), run = W().run;
    if (was && e.dead && run) {
      if (id === 'fukudo') { R.dropMat('crystal', 3 + run.grade.lv * 2, e.x, e.z); R.toast('福影童消失了，地上留下一把魔力水晶。', '#F2C84A'); }
      if (id === 'kudan' && R.addAware) { R.addAware(18, 'kudan'); R.toast('……牆上的眼睛一起張開了。', '#E07A5A'); }
    }
    return r;
  };
  // 每一層：一成五的機會出現福影童、預言犢（不在一般的生物池裡）
  const pf = R.populateFloor;
  R.populateFloor = () => {
    pf(); const F = W().F; if (!F) return;
    const rooms = F.rooms.filter(r => r.type === 'fight' || r.type === 'ore');
    ['fukudo', 'kudan'].forEach(id => { if (rnd() < 0.15 && rooms.length) { const r = rooms[Math.floor(rnd() * rooms.length)], [x, z] = R.roomPoint(r); const e = R.spawnEnemy(id, x, z, r.i, { quiet: true }); e.dormant = true; } });
  };

  // ---------- 分到哪裡 ----------
  const G = id => R.GRADES.find(g => g.id === id), addPool = (gid, ids) => { const g = G(gid); if (g) ids.forEach(i => { if (!g.pool.includes(i)) g.pool.push(i); }); };
  addPool('hamilia', ['tofuko', 'tsuchikoro']);
  addPool('amile', ['tofuko', 'tsuchikoro', 'azuki', 'akane', 'inugami', 'ubume', 'mineba', 'makura', 'aobo']);
  addPool('mors', ['azuki', 'akane', 'inugami', 'ubume', 'mineba', 'makura', 'aobo', 'datara', 'tsurube', 'setosho', 'kanibo', 'ogama', 'kyokotsu', 'oshiroi', 'tenjo', 'tenome', 'futakuchi', 'akaoni', 'hihi']);
  addPool('kesent', ['datara', 'tsurube', 'setosho', 'kanibo', 'ogama', 'kyokotsu', 'oshiroi', 'tenjo', 'tenome', 'futakuchi', 'akaoni', 'hihi', 'yamata', 'hannya', 'oboro']);
  const fav = (t, o) => { const T0 = R.TYPES[t]; if (T0) T0.favor = Object.assign({}, T0.favor, o); };
  fav('tomb', { kyokotsu: 2, oshiroi: 1, hannya: 1 });
  fav('city', { setosho: 2, makura: 1, tenome: 1 });
  fav('maze', { tenjo: 2, futakuchi: 1, tsurube: 1 });
  fav('tower', { ubume: 2, tsurube: 1 });
  fav('island', { ogama: 2, kanibo: 2, akane: 1 });
})(window.R);
