// 製作、飾品、新素材、花錢的地方（作者：能製作的東西太少了，飾品和素材都可以增加，也可以增加花錢的地方）
// - 新的裝備欄「飾品」：戒指、項鍊、耳環、腕輪、胸針、髮簪，每一種有自己本身的效果（第一個詞綴）；護符多了御守、根付。
//   飾品的詞綴除了防具那些，還有傷害、暴擊、攻速、移動、吸血、減傷、經驗、寶箱運氣、燃燒／減速／連鎖閃電。
//   護符、飾品強化（+1～+10）後詞綴的效果跟著變強（每一級 ×1.08）。
// - 新素材（照設定：能帶出遺跡的只有體內的魔力水晶、魔力核心和外殼上的礦石——《遺跡》第一章第五節）：
//   霜晶／炎晶／砂晶／潮晶（四種極端環境的遺跡生物體內的魔力水晶）、高純度魔力水晶（精英、領主體）、
//   銀礦、赤金（礦殼背上掘出來的）；貝殼、珍珠（東濱的沙灘）；布料、皮革、絹絲、和紙、漆、銀錠（城裡買得到）。
// - 鐵匠鋪多三個分頁：飾品工房（指定配方）、精煉・重鑄・附魔（+6～+10、重骰詞綴、把元素晶石灌進武器）、買素材。
//   製作分頁多了飾品、御守、根付可以選，和兩種新的等級（銀細工、赤金）。
// 放在 chuuni.js 後面（包住它的 R.chuuniName）。
(function (R) {
  const esc = s => R.esc(s), $ = id => document.getElementById(id);
  const W = () => R.W, S = () => R.S;
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick = a => a[Math.floor(Math.random() * a.length)];

  // ---------- 素材 ----------
  Object.assign(R.MATS, {
    frostcry: { name: '霜晶', color: '#BFE6FF', value: 22, desc: '凍原環境的遺跡生物體內結成的魔力水晶，摸起來是冰的。' },
    flamecry: { name: '炎晶', color: '#FF8A4A', value: 22, desc: '火山環境的遺跡生物體內的魔力水晶，裡面像有火在燒。' },
    sandcry: { name: '砂晶', color: '#E8C878', value: 22, desc: '沙漠環境的遺跡生物體內的魔力水晶，摸久了指尖會麻。' },
    tidecry: { name: '潮晶', color: '#5FC8E0', value: 22, desc: '深海環境的遺跡生物體內的魔力水晶，貼在耳邊聽得到潮聲。' },
    windcry: { name: '風晶', color: '#BFF0D0', value: 22, desc: '輕得像會飄走的魔力水晶，握在手裡有風從指縫穿過。附魔：疾風。' },
    venomcry: { name: '毒晶', color: '#8ACF3A', value: 22, desc: '長在遺跡植物根部的魔力水晶，帶著青草和腐葉的味道。附魔：蝕毒。' },
    metalcry: { name: '金晶', color: '#D8D8E0', value: 22, desc: '像金屬一樣沉的魔力水晶，敲起來有鐵的聲音。附魔：破甲。' },
    purecry: { name: '高純度魔力水晶', color: '#E8F6FF', value: 40, desc: '精英、領主體體內的魔力水晶，幾乎沒有雜質。' },
    silver: { name: '銀礦', color: '#D8DEE6', value: 16, desc: '阿彌勒級以上的礦殼，背上偶爾長著銀礦。' },
    redgold: { name: '赤金', color: '#E0603A', value: 45, desc: '摩爾斯級以上的礦殼背上才掘得到。真的赤金敲一下，鳴文是紅色的漩渦。' },
    seashell: { name: '貝殼', color: '#F0E2D0', value: 2, desc: '東濱海水浴場撿的貝殼。' },
    pearl: { name: '珍珠', color: '#F4F0FF', value: 50, desc: '沙灘上很少撿到；魚市場偶爾收到，老岩調得到。' },
    cloth: { name: '布料', color: '#7A8AA8', value: 4, desc: '商店街布團店的布。' },
    leather: { name: '皮革', color: '#9A6A44', value: 6, desc: '鞣好的牛皮。' },
    thread: { name: '絹絲', color: '#F2E8D8', value: 8, desc: '串飾品、縫御守用的絲線。' },
    washi: { name: '和紙', color: '#F4EEDC', value: 2, desc: '文具店的和紙。' },
    lacquer: { name: '漆', color: '#5A1E1C', value: 10, desc: '塗根付、髮簪用的漆。' },
    silverbar: { name: '銀錠', color: '#E8EEF6', value: 30, desc: '兌換所熔好的銀錠。' }
  });
  // 鐵匠鋪調得到的東西（價錢一定比公會收購高，買了再賣不會賺）
  const BUY = [['cloth', 8], ['leather', 14], ['thread', 18], ['washi', 6], ['lacquer', 26], ['silverbar', 70], ['pearl', 120], ['iron', 15], ['crystal', 28], ['windcry', 45], ['venomcry', 45], ['metalcry', 45]];

  // ---------- 飾品、護符的種類 ----------
  // imp：本身的效果（第一個詞綴，數值照物品等級變大）
  const ACC = {
    ring: { name: '戒指', imp: 'might', r: [4, 8] },
    necklace: { name: '項鍊', imp: 'wisdom', r: [6, 12] },
    earring: { name: '耳環', imp: 'keen', r: [3, 6] },
    bracelet: { name: '腕輪', imp: 'haste', r: [4, 8] },
    brooch: { name: '胸針', imp: 'guard', r: [3, 7] },
    hairpin: { name: '髮簪', imp: 'fleet', r: [3, 6] }
  };
  const CHARM2 = { omamori: { name: '御守', imp: 'lucky', r: [5, 10] }, netsuke: { name: '根付', imp: 'leech', r: [1, 2] } };
  R.ACC = ACC; R.CHARM2 = CHARM2;
  R.ACC_AFFIX = [
    { id: 'might', name: '剛力', roll: [4, 12], txt: v => '傷害 +' + v + '%' },
    { id: 'keen', name: '銳眼', roll: [3, 9], txt: v => '暴擊率 +' + v + '%' },
    { id: 'haste', name: '疾手', roll: [4, 12], txt: v => '攻擊速度 +' + v + '%' },
    { id: 'fleet', name: '輕身', roll: [3, 8], txt: v => '移動速度 +' + v + '%' },
    { id: 'leech', name: '飲血', roll: [1, 2], txt: v => '吸血 ' + v + '%' },
    { id: 'guard', name: '守護', roll: [3, 10], txt: v => '受到的傷害 −' + v + '%' },
    { id: 'wisdom', name: '求知', roll: [5, 15], txt: v => '經驗值 +' + v + '%' },
    { id: 'lucky', name: '好運', roll: [4, 12], txt: v => v + '% 機率寶箱多開出一樣東西' },
    { id: 'ember', name: '餘燼', roll: [8, 20], txt: v => v + '% 機率讓敵人燃燒' },
    { id: 'chill', name: '冰霜', roll: [8, 20], txt: v => v + '% 機率讓敵人減速' },
    { id: 'spark', name: '電光', roll: [6, 15], txt: v => v + '% 機率放出連鎖閃電（跳到附近最多 5 隻）' },
    { id: 'pen2', name: '穿透', roll: [5, 15], txt: v => '無視敵人 ' + v + '% 的護甲' },
    { id: 'mpregen2', name: '回魔', roll: [2, 8], txt: v => '每秒回復 ' + (v / 10) + ' 魔力' }
  ];
  const ACCDEF = id => R.A_AFFIX.find(a => a.id === id) || R.ACC_AFFIX.find(a => a.id === id);
  const isTrinket = it => it && (it.kind === 'acc' || it.kind === 'charm');
  const defOf = it => (it.kind === 'acc' ? ACC[it.base] : it.kind === 'charm' ? CHARM2[it.base] : null);
  // 強化：詞綴的效果每一級 ×0.08（2026-10-04 作者：武器、防具也要，原本只有護符、飾品）
  const mult = it => (it && it.plus ? 1 + 0.08 * it.plus : 1);
  const FLAT = { pierce: 1, multi: 1 };   // 貫穿、多重是「多一發」，不跟著強化變大
  // 武器的詞綴也要跟著強化變強（2026-10-04 作者回報：裝備強化，詞綴效果沒有跟著提升）：
  //   原本只有 R.affixSum（防具、飾品、護符那些加總）乘了強化，武器自己的詞綴（鋒利、迅捷、暴擊、吸血、燃燒、霜寒、電擊、沉重……）
  //   在 items.js 的 R.weaponStats 裡直接用原本的數字，說明寫「詞綴的效果 ×1.24」卻沒有真的變強。
  const scaled = it => (it && it.plus && it.identified ? Object.assign({}, it, { affixes: it.affixes.map(a => (FLAT[a.id] ? a : Object.assign({}, a, { v: a.v * mult(it) }))) }) : it);
  const ws0 = R.weaponStats; R.weaponStats = it => ws0(scaled(it));

  // 新的裝備欄
  if (!R.GEAR_KEYS.includes('acc')) R.GEAR_KEYS.push('acc');
  R.GEAR_NAME.acc = '飾品';
  const so0 = R.slotOf; R.slotOf = it => (it && it.kind === 'acc' ? 'acc' : so0(it));
  const bn0 = R.baseName; R.baseName = it => (it.kind === 'acc' ? ACC[it.base].name : it.kind === 'charm' && CHARM2[it.base] ? CHARM2[it.base].name : bn0(it));
  const ad0 = R.affixDef; R.affixDef = (it, id) => (isTrinket(it) ? ACCDEF(id) : ad0(it, id));
  // 護符、飾品：強化讓詞綴的效果變強
  R.affixSum = (items, id) => items.reduce((s, it) => s + (it && it.identified ? it.affixes.filter(a => a.id === id).reduce((q, a) => q + (FLAT[a.id] ? a.v : a.v * mult(it)), 0) : 0), 0);
  // 產生：飾品、御守、根付有本身的效果；其他詞綴從飾品＋防具的詞綴裡挑
  const mk0 = R.makeItem;
  R.makeItem = o => {
    if (o.kind !== 'acc' && !(o.kind === 'charm' && CHARM2[o.base])) return mk0(o);
    const it = mk0(Object.assign({}, o, { kind: 'charm', base: 'charm' })), d = o.kind === 'acc' ? ACC[o.base] : CHARM2[o.base];
    it.kind = o.kind; it.base = o.base;
    const bag = R.ACC_AFFIX.concat(R.A_AFFIX).filter(a => a.id !== d.imp), n = R.RARITY[it.rarity].affix;
    it.affixes = [{ id: d.imp, v: Math.round(rint(d.r[0], d.r[1]) * (1 + 0.06 * (it.ilvl - 1))) }];
    for (let i = 0; i < n && bag.length; i++) { const a = bag.splice(Math.floor(Math.random() * bag.length), 1)[0]; it.affixes.push({ id: a.id, v: rint(a.roll[0], a.roll[1]) }); }
    return it;
  };
  // 說明
  const il0 = R.itemLines;
  R.itemLines = it => {
    if (!isTrinket(it)) { const L = il0(it), a = it.enchant && it.identified && it.affixes.find(x => x.ench), df = a && R.W_AFFIX.find(x => x.id === a.id), i = df ? L.lastIndexOf('・' + df.txt(a.v)) : -1; if (i >= 0) L[i] += '（附魔）'; if (it.plus && it.identified && it.affixes.length) { const m = mult(it); it.affixes.forEach(a0 => { if (FLAT[a0.id]) return; const d0 = R.affixDef(it, a0.id), j = d0 ? L.findIndex(l => l.indexOf('・' + d0.txt(a0.v)) === 0) : -1; if (j >= 0) L[j] = L[j].replace('・' + d0.txt(a0.v), '・' + d0.txt(Math.round(a0.v * m * 10) / 10)); }); L.push('強化 +' + it.plus + '：詞綴的效果 ×' + m.toFixed(2) + '（上面的數字已經算進去）'); } return L; }   // 說明裡的詞綴寫強化後的數字
    const d = defOf(it), L = [(it.kind === 'acc' ? '飾品・' : '護符・') + R.baseName(it), '物品等級 ' + it.ilvl];
    if (!it.identified) { L.push('？？？　稀有度與詞綴要鑑定後才知道，也才會生效。'); return L; }
    const m = mult(it);
    it.affixes.forEach((a, i) => { const df = ACCDEF(a.id); if (df) L.push('・' + df.txt(Math.round(a.v * m * 10) / 10) + (i === 0 && d && a.id === d.imp ? '（' + d.name + '本身）' : '')); });
    if (it.plus) L.push('強化 +' + it.plus + '：詞綴的效果 ×' + m.toFixed(2));
    return L;
  };
  const cn0 = R.chuuniName;
  if (cn0) R.chuuniName = it => { const n = cn0(it); return n && it.kind === 'charm' && CHARM2[it.base] ? n.replace('・護符', '・' + CHARM2[it.base].name) : n; };

  // ---------- 數值 ----------
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const eq = R.equipped(cls), items = R.GEAR_KEYS.map(k => eq[k]), s = id => R.affixSum(items, id);
      P.dmgMult *= 1 + s('might') / 100; P.speed *= 1 + s('fleet') / 100;
      if (P.ws) { P.ws.crit += s('keen') / 100; P.ws.rate *= 1 + s('haste') / 100; P.ws.vamp = (P.ws.vamp || 0) + s('leech') / 100; P.ws.fire = (P.ws.fire || 0) + s('ember') / 100; P.ws.frost = (P.ws.frost || 0) + s('chill') / 100; P.ws.shock = (P.ws.shock || 0) + s('spark') / 100; }
      P.pen = Math.min(0.8, (s('pen') + s('pen2')) / 100); P.mpRegen = (s('mpregen') + s('mpregen2')) / 10;   // 穿透、回魔
      P.accGuard = Math.min(0.5, s('guard') / 100); P.accLucky = Math.min(0.6, s('lucky') / 100);
    } catch (e) { }
    return P;
  };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const P = W().P; return hp0(P && P.accGuard ? raw * (1 - P.accGuard) : raw, src, o); };
  const gx0 = R.gainXp;
  R.gainXp = v => { let k = 0; try { const eq = R.equipped(S().cls); k = R.affixSum(R.GEAR_KEYS.map(x => eq[x]), 'wisdom') / 100; } catch (e) { } return gx0(k ? Math.round(v * (1 + k)) : v); };

  // ---------- 掉落：寶箱的護符有一半換成飾品；好運多開一樣；魔力水晶的變種、高純度水晶；礦殼背上的銀礦、赤金 ----------
  const rc0 = R.rollChest;
  R.rollChest = (g, floor, cls, tier) => {
    const out = rc0(g, floor, cls, tier);
    out.forEach((o, i) => { const it = o.item; if (it && it.kind === 'charm' && it.base === 'charm' && Math.random() < 0.55) { const acc = Math.random() < 0.8, base = acc ? pick(Object.keys(ACC)) : pick(Object.keys(CHARM2)); out[i] = { item: R.makeItem({ kind: acc ? 'acc' : 'charm', base, ilvl: it.ilvl, rarity: it.rarity, identified: it.identified }) }; } });
    const P = W().P; if (g > 0 && P && P.accLucky && Math.random() < P.accLucky) { const more = rc0(g, floor, cls, tier).find(o => o.item); if (more) { out.push(more); R.toast && R.toast('好運：寶箱裡還有一樣東西', '#E8C04A'); } }
    return out;
  };
  const ENVC = { snow: 'frostcry', volcano: 'flamecry', desert: 'sandcry', deep: 'tidecry', forge: 'flamecry' };   // forge：兵工廠的熔爐
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by);
    try {
      const run = W().run;
      if (was && e.dead && run && !e.def.human && !(by && by.rival)) {
        const env = ENVC[run.env] || ENVC[e.def.env], strong = e.def.elite || e.leader || e.def.boss, g = run.grade.lv || 1;
        if (env && Math.random() < (strong ? 0.6 : 0.16)) R.dropMat(env, 1, e.x + 0.5, e.z);
        if (Math.random() < (strong ? 0.45 : 0.012 * g)) R.dropMat('purecry', 1, e.x - 0.5, e.z);
      }
    } catch (er) { }
    return r;
  };
  const mn0 = R.mine;
  if (mn0) R.mine = o => { mn0(o); try { const g = W().run.grade.lv || 1; if (g >= 2 && Math.random() < 0.4) R.dropMat('silver', 1 + (Math.random() < 0.3 ? 1 : 0), o.x + 0.4, o.z); if (g >= 3 && Math.random() < 0.22) R.dropMat('redgold', 1, o.x - 0.4, o.z); } catch (e) { } };

  // ---------- 配方 ----------
  // 製作分頁（任何種類都能做）多兩個等級
  R.RECIPES.push(
    { tier: 1, name: '銀細工', ilvl: 5, mats: { silver: 3, thread: 1, crystal: 2 }, gold: 150, weights: [0, 30, 50, 20, 0, 0] },
    { tier: 2, name: '赤金', ilvl: 8, mats: { redgold: 3, purecry: 2, core: 1, silverbar: 1 }, gold: 520, weights: [0, 0, 10, 50, 35, 5] }
  );
  // 飾品工房：指定的配方（extra：一定帶這個詞綴）
  const ACC_RC = [
    { name: '貝殼手環', kind: 'acc', base: 'bracelet', ilvl: 2, mats: { seashell: 6, thread: 1 }, gold: 20, weights: [50, 45, 5, 0, 0, 0], note: '東濱撿來的貝殼串成的手環。' },
    { name: '鐵指環', kind: 'acc', base: 'ring', ilvl: 2, mats: { iron: 3, leather: 1 }, gold: 30, weights: [60, 35, 5, 0, 0, 0], note: '老岩說這是學徒練手藝的東西。' },
    { name: '和紙御守', kind: 'charm', base: 'omamori', ilvl: 3, mats: { washi: 2, cloth: 1, thread: 1 }, gold: 30, weights: [30, 50, 20, 0, 0, 0], note: '布袋裡縫著一張寫了字的和紙。' },
    { name: '漆根付', kind: 'charm', base: 'netsuke', ilvl: 3, mats: { lacquer: 1, shell: 2, thread: 1 }, gold: 40, weights: [30, 50, 20, 0, 0, 0], note: '甲殼削成的小墜子，上了一層漆。' },
    { name: '銀耳環', kind: 'acc', base: 'earring', ilvl: 4, mats: { silver: 2, crystal: 2 }, gold: 90, weights: [0, 50, 40, 10, 0, 0] },
    { name: '銀簪', kind: 'acc', base: 'hairpin', ilvl: 4, mats: { silver: 2, lacquer: 1 }, gold: 90, weights: [0, 50, 40, 10, 0, 0] },
    { name: '皮革腕輪', kind: 'acc', base: 'bracelet', ilvl: 4, mats: { leather: 3, silver: 1, manaore: 2 }, gold: 100, weights: [0, 50, 40, 10, 0, 0], extra: 'tough' },
    { name: '珍珠項鍊', kind: 'acc', base: 'necklace', ilvl: 5, mats: { pearl: 2, thread: 2, silver: 1 }, gold: 160, weights: [0, 30, 50, 20, 0, 0], extra: 'spirit' },
    { name: '霜晶耳環', kind: 'acc', base: 'earring', ilvl: 6, mats: { frostcry: 3, silverbar: 1 }, gold: 180, weights: [0, 0, 50, 40, 10, 0], extra: 'chill' },
    { name: '炎晶戒指', kind: 'acc', base: 'ring', ilvl: 6, mats: { flamecry: 3, silverbar: 1 }, gold: 180, weights: [0, 0, 50, 40, 10, 0], extra: 'ember' },
    { name: '砂晶腕輪', kind: 'acc', base: 'bracelet', ilvl: 6, mats: { sandcry: 3, silverbar: 1 }, gold: 180, weights: [0, 0, 50, 40, 10, 0], extra: 'spark' },
    { name: '潮晶項鍊', kind: 'acc', base: 'necklace', ilvl: 6, mats: { tidecry: 3, pearl: 1 }, gold: 200, weights: [0, 0, 50, 40, 10, 0], extra: 'regen' },
    { name: '純晶護符', kind: 'charm', base: 'charm', ilvl: 7, mats: { purecry: 3, thread: 2 }, gold: 260, weights: [0, 0, 30, 50, 20, 0], extra: 'focus' },
    { name: '赤金胸針', kind: 'acc', base: 'brooch', ilvl: 8, mats: { redgold: 2, purecry: 1, silverbar: 1 }, gold: 320, weights: [0, 0, 20, 50, 25, 5], extra: 'vital' },
    { name: '赤金戒指', kind: 'acc', base: 'ring', ilvl: 8, mats: { redgold: 3, purecry: 2, core: 1 }, gold: 480, weights: [0, 0, 0, 45, 45, 10], extra: 'keen' },
    { name: '翼肢髮簪', kind: 'acc', base: 'hairpin', ilvl: 9, mats: { wing: 1, redgold: 1, lacquer: 2 }, gold: 600, weights: [0, 0, 0, 30, 55, 15], extra: 'calm', note: '佩特拉核心翼肢的碎片磨成的簪頭。' }
  ];
  R.ACC_RECIPES = ACC_RC;
  const addAffix = (it, id) => {
    if (it.affixes.some(a => a.id === id)) return;
    const df = ACCDEF(id); if (!df) return; const a = { id, v: rint(Math.ceil((df.roll[0] + df.roll[1]) / 2), df.roll[1]) };
    const keep = isTrinket(it) && defOf(it) ? 1 : 0;
    if (it.affixes.length > keep && it.affixes.length >= keep + R.RARITY[it.rarity].affix) it.affixes[keep + Math.floor(Math.random() * (it.affixes.length - keep))] = a; else it.affixes.push(a);
  };
  const pay = c => { const s = S(); s.gold -= c.gold || 0; Object.keys(c.mats || {}).forEach(k => { s.mats[k] -= c.mats[k]; }); };
  const can = c => { const s = S(); return s.gold >= (c.gold || 0) && Object.keys(c.mats || {}).every(k => (s.mats[k] || 0) >= c.mats[k]); };
  R.craftNamed = rc => {
    if (!can(rc)) return null; pay(rc);
    const it = R.makeItem({ kind: rc.kind, base: rc.base, ilvl: rc.ilvl, rarity: R.wpick(rc.weights), identified: true });
    if (rc.extra) addAffix(it, rc.extra);
    S().stash.push(it); R.save(); return it;
  };

  // ---------- 精煉（+6～+10）、重鑄（重骰詞綴）、附魔（元素晶石灌進武器） ----------
  R.refinePrice = it => ({ gold: 120 + 90 * (it.plus - 5), mats: Object.assign({ purecry: 1 + Math.floor((it.plus - 5) / 2) }, it.plus >= 8 ? { redgold: 1 } : {}) });
  R.refine = it => { if (!it || !it.identified || it.plus < 5 || it.plus >= 10) return false; const c = R.refinePrice(it); if (!can(c)) return false; pay(c); it.plus++; R.save(); return true; };
  R.reforgePrice = it => ({ gold: 60 + 50 * it.rarity, mats: Object.assign({ crystal: 2 + it.rarity }, it.rarity >= 3 ? { purecry: 1 } : {}) });
  R.reforge = it => {
    if (!it || !it.identified || !it.rarity) return false; const c = R.reforgePrice(it); if (!can(c)) return false; pay(c);
    const fresh = R.makeItem({ kind: it.kind, base: it.base, ilvl: it.ilvl, rarity: it.rarity, identified: true }), d = defOf(it), keep = d ? [it.affixes[0]] : [];
    const ench = it.enchant ? it.affixes.find(a => a.id === it.enchant) : null;
    it.affixes = keep.concat(fresh.affixes.slice(d ? 1 : 0)).filter(a => !ench || a.id !== ench.id);
    if (ench) it.affixes.push(ench);
    R.save(); return true;
  };
  const ENCH = { flamecry: 'fire', frostcry: 'frost', sandcry: 'shock', tidecry: 'swift', windcry: 'wind', venomcry: 'poison', metalcry: 'metal' };   // 2026-10-08：多風、毒、金；元素詞綴只從附魔來
  R.enchantPrice = () => ({ gold: 100, n: 3 });
  R.enchant = (it, cry) => {
    const id = ENCH[cry]; if (!it || it.kind !== 'weapon' || !it.identified || !id) return false;
    if (it.affixes.some(a => a.id === id && it.enchant !== id)) return 'same';
    const c = { gold: 100, mats: { [cry]: 3 } }; if (!can(c)) return false; pay(c);
    if (it.enchant) it.affixes = it.affixes.filter(a => !(a.id === it.enchant && a.ench));
    const df = R.W_AFFIX.find(a => a.id === id); it.affixes.push({ id, v: rint(Math.ceil((df.roll[0] + df.roll[1]) / 2), df.roll[1]), ench: 1 }); it.enchant = id;
    R.save(); return true;
  };

  // ---------- 圖示：飾品、御守、根付 ----------
  const MAT = [['#D4D8E0', '#8A909A', '#5A606A'], ['#E8EEF6', '#B8C0CC', '#6A7280'], ['#FFE08A', '#E09A3A', '#9A4A1E']], GEM = ['#9AF0FF', '#C8A0FF', '#FF8A6A'];
  const icon = (base, tier) => {
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'), m = MAT[tier] || MAT[0], gm = GEM[tier] || GEM[0];
    const rc = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const circ = (a, b, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
    const ring = (a, b, r, col, w) => { x.strokeStyle = col; x.lineWidth = w || 2; x.beginPath(); x.arc(a, b, r, 0, 7); x.stroke(); };
    const ln = (x0, y0, x1, y1, col, w) => { x.strokeStyle = col; x.lineWidth = w || 1; x.beginPath(); x.moveTo(x0 + 0.5, y0 + 0.5); x.lineTo(x1 + 0.5, y1 + 0.5); x.stroke(); };
    if (base === 'ring') { ring(8, 10, 4.2, m[1], 2.2); ring(8, 10, 4.2, m[0], 0.8); circ(8, 5, 2.4, gm); rc(7, 4, 1, 1, '#FFFFFF'); }
    else if (base === 'necklace') { for (let i = 0; i <= 6; i++) { const t = i / 6; rc(Math.round(2 + 12 * t), Math.round(2 + 7 * Math.sin(t * Math.PI)), 1, 1, m[0]); } circ(8, 12, 2.6, gm); rc(7, 11, 1, 1, '#FFFFFF'); }
    else if (base === 'earring') { ring(8, 4, 2, m[0], 1.2); ln(8, 6, 8, 8, m[1], 1); x.fillStyle = gm; x.beginPath(); x.moveTo(8, 8); x.lineTo(11, 12); x.lineTo(8, 15); x.lineTo(5, 12); x.closePath(); x.fill(); rc(7, 11, 1, 1, '#FFFFFF'); }
    else if (base === 'bracelet') { x.strokeStyle = m[1]; x.lineWidth = 2.4; x.beginPath(); x.ellipse(8, 9, 6, 3.6, 0, 0, 7); x.stroke(); [3, 8, 13].forEach(a => circ(a, a === 8 ? 12.4 : 10, 1.2, gm)); }
    else if (base === 'brooch') { circ(8, 8, 5.4, m[1]); circ(8, 8, 4.2, m[0]); circ(8, 8, 2.6, gm); rc(7, 7, 1, 1, '#FFFFFF'); ln(2, 14, 5, 11, m[2], 1); }
    else if (base === 'hairpin') { ln(2, 14, 11, 5, '#5A1E1C', 2); circ(12, 4, 2.6, gm); [[9, 7], [14, 7]].forEach(([a, b]) => { ln(a, b, a, b + 4, m[0], 1); circ(a, b + 5, 1, m[1]); }); }
    else if (base === 'omamori') { rc(4, 5, 8, 10, '#B8323A'); rc(5, 6, 6, 1, '#E8C04A'); rc(6, 8, 4, 5, '#F4EEDC'); rc(7, 9, 2, 1, '#2A2420'); rc(7, 11, 2, 1, '#2A2420'); ln(6, 5, 8, 1, '#E8C04A', 1); ln(10, 5, 8, 1, '#E8C04A', 1); }
    else if (base === 'netsuke') { ln(8, 1, 8, 6, '#6A4A2E', 1); circ(8, 10, 4.6, '#4A1E1A'); circ(7, 9, 3.4, '#7A2E24'); rc(6, 8, 2, 1, '#C8A06A'); rc(9, 11, 2, 1, '#C8A06A'); }
    const img = x.getImageData(0, 0, 16, 16), d = img.data, solid = new Uint8Array(256);
    for (let i = 0; i < 256; i++) { if (d[i * 4 + 3] >= 110) { d[i * 4 + 3] = 255; solid[i] = 1; } else d[i * 4 + 3] = 0; }
    for (let i = 0; i < 256; i++) { if (solid[i]) continue; const px = i % 16, py = (i - px) / 16; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const qx = px + a, qy = py + b; return qx >= 0 && qy >= 0 && qx < 16 && qy < 16 && solid[qy * 16 + qx]; })) { d[i * 4] = 20; d[i * 4 + 1] = 16; d[i * 4 + 2] = 24; d[i * 4 + 3] = 255; } }
    x.putImageData(img, 0, 0); return c;
  };
  const cache = {}, iu0 = R.itemIconURL;
  if (iu0) R.itemIconURL = (it, k) => {
    if (!(it.kind === 'acc' || (it.kind === 'charm' && CHARM2[it.base]))) return iu0(it, k);
    k = k || 3; const tier = it.kind === 'acc' ? R.tierOf(it.ilvl) : Math.min(2, Math.floor((it.rarity || 0) / 2)), key = it.base + ':' + tier + ':' + k;
    if (cache[key]) return cache[key];
    const src = icon(it.base, tier), c = document.createElement('canvas'); c.width = c.height = 16 * k; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, 16 * k, 16 * k);
    return (cache[key] = c.toDataURL());
  };

  // ---------- 鐵匠鋪的新分頁 ----------
  const TABS = [['acc', '飾品工房'], ['refine', '精煉・重鑄・附魔'], ['buy', '買素材']];
  let csub = null;
  const matsTxt = m => Object.keys(m).map(k => (R.matChip ? R.matChip(k, (S().mats[k] || 0) + '／' + m[k]) : esc(R.MATS[k].name) + ' ' + (S().mats[k] || 0) + '／' + m[k])).join(' ');
  const card = (it, btns) => '<div class="item-card" data-iid="' + it.id + '" style="--c:' + R.rarityColor(it) + '">' + (R.itemIconTag ? R.itemIconTag(it, 'card') : '') + '<b>' + esc(R.itemName(it)) + '</b>' + (R.itemInfo ? R.itemInfo(it) : '<small class="rar">' + (it.identified ? R.RARITY[it.rarity].name : '？？？') + (it.plus ? '・+' + it.plus : '') + '</small><ul>' + R.itemLines(it).map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>') + '<div class="row">' + btns + '</div></div>';
  const accTab = () => '<p class="note">「照圖做的東西，做出來是什麼樣子我心裡有數。」配方上寫的詞綴一定會有；其他的詞綴看運氣。做出來當場就鑑定好了。</p><div class="recipes">'
    + ACC_RC.map((rc, i) => { const d = rc.kind === 'acc' ? ACC[rc.base] : CHARM2[rc.base], imp = d ? ACCDEF(d.imp) : null, ex = rc.extra ? ACCDEF(rc.extra) : null;
      return '<div class="recipe"><b>' + esc(rc.name) + '（' + (rc.kind === 'acc' ? '飾品' : '護符') + '・物品等級 ' + rc.ilvl + '）</b><div class="mats-need">' + matsTxt(rc.mats) + '<span class="mat" style="--c:var(--gold)">' + rc.gold + ' 費拉</span></div>'
        + '<small>' + (imp ? '本身：' + esc(imp.name) + '（' + esc(imp.txt(d.r[0] + '～' + d.r[1])) + '）' : '護符') + (ex ? '・一定帶「' + esc(ex.name) + '」' : '') + '・可能的稀有度：' + rc.weights.map((w, k) => (w ? R.RARITY[k].name : '')).filter(Boolean).join('、') + '</small>'
        + (rc.note ? '<small>' + esc(rc.note) + '</small>' : '') + '<button type="button" class="btn pri" data-cacc="' + i + '"' + (can(rc) ? '' : ' disabled') + '>做</button></div>'; }).join('') + '</div>';
  const refineTab = () => {
    const s = S(), list = s.stash.filter(it => it.identified && (it.kind === 'weapon' || it.kind === 'armor' || isTrinket(it))), eqIds = R.equippedIds();
    list.sort((a, b) => (eqIds.has(b.id) - eqIds.has(a.id)) || b.rarity - a.rarity);
    return '<p class="note">「強化到 +5 以後，要用高純度的魔力水晶慢慢精煉，最多 +10。」重鑄：重新打一次詞綴（飾品本身的效果和附魔會留著）。附魔：三顆元素晶石灌進武器——炎晶＝焚燒、霜晶＝霜寒、砂晶＝雷鳴、潮晶＝迅捷。一把武器只能有一個附魔，再附魔會換掉。</p><div class="items">'
      + (list.length ? list.map(it => {
        const b = [];
        if (it.plus >= 5 && it.plus < 10) { const c = R.refinePrice(it); b.push('<button type="button" class="btn pri" data-refine="' + it.id + '"' + (can(c) ? '' : ' disabled') + '>精煉到 +' + (it.plus + 1) + '（' + c.gold + ' 費拉・' + matsTxt(c.mats) + '）</button>'); }
        else if (it.plus < 5) b.push('<span class="note">先在「強化」做到 +5</span>');
        if (it.rarity > 0) { const c = R.reforgePrice(it); b.push('<button type="button" class="btn" data-reforge="' + it.id + '"' + (can(c) ? '' : ' disabled') + '>重鑄（' + c.gold + ' 費拉・' + matsTxt(c.mats) + '）</button>'); }
        if (it.kind === 'weapon') Object.keys(ENCH).forEach(k => b.push('<button type="button" class="mini" data-ench="' + it.id + ':' + k + '"' + (can({ gold: 100, mats: { [k]: 3 } }) ? '' : ' disabled') + '>附魔：' + esc(R.MATS[k].name) + '（' + (s.mats[k] || 0) + '／3・100 費拉）</button>'));
        return card(it, (eqIds.has(it.id) ? '<span class="tag">裝備中</span>' : '') + b.join(''));
      }).join('') : '<p class="note">倉庫裡沒有鑑定好的裝備。</p>') + '</div>';
  };
  const buyTab = () => {
    const s = S(); let h = '<p class="note">「布、皮、紙、漆這些，我跟城裡的店調得到。銀錠是兌換所熔的，珍珠是魚市場的。」</p><div class="recipes">';
    BUY.forEach(([k, p0]) => { const p = R.shopPrice ? R.shopPrice(p0, 'smith') : p0; if (p == null) return; h += '<div class="recipe">' + (R.matIconTag ? R.matIconTag(k, 'card') : '') + '<b>' + esc(R.MATS[k].name) + '</b><small>' + esc(R.MATS[k].desc) + '</small><small>一個 ' + p + ' 費拉・手邊 ' + (s.mats[k] || 0) + '</small><div class="row"><button type="button" class="btn pri" data-mbuy="' + k + ':1:' + p + '"' + (s.gold < p ? ' disabled' : '') + '>買 1</button><button type="button" class="btn" data-mbuy="' + k + ':5:' + p + '"' + (s.gold < p * 5 ? ' disabled' : '') + '>買 5</button></div></div>'; });
    if (R.shopPrice && R.shopPrice(10, 'smith') == null) h += '<p class="hand">老岩搖搖頭：「今天不賣你。」</p>';
    return h + '</div>';
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    if (t) csub = t === 'smith' && TABS.some(x => x[0] === f) ? f : null;
    hub0(t, csub && t ? 'craft' : f);
    const body = $('hub-body'), sec = body && body.querySelector('section.panel-doc'), h2 = sec && sec.querySelector('h2'), tabs = sec && sec.querySelector('.subtabs');
    if (!h2 || h2.textContent !== '老岩的鐵匠鋪' || !tabs) return;
    TABS.forEach(([k, n]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'tab' + (csub === k ? ' on' : ''); b.textContent = n; b.onclick = () => { csub = k; R.hub(); }; tabs.appendChild(b); });
    tabs.addEventListener('click', e => { if (e.target.closest('[data-sub]')) csub = null; }, true);   // 原本的分頁：先清掉自己的分頁再重畫
    if (!csub) {
      // 製作分頁：加上飾品、御守、根付
      const sel = $('craft-base');
      if (sel) {
        const g = document.createElement('optgroup'); g.label = '飾品'; Object.keys(ACC).forEach(k => { const o = document.createElement('option'); o.value = 'acc:' + k; o.textContent = ACC[k].name; g.appendChild(o); }); sel.appendChild(g);
        const cg = [...sel.querySelectorAll('optgroup')].find(x => x.label === '護符'); if (cg) Object.keys(CHARM2).forEach(k => { const o = document.createElement('option'); o.value = 'charm:' + k; o.textContent = CHARM2[k].name; cg.appendChild(o); });
      }
      return;
    }
    tabs.querySelectorAll('.tab').forEach(b => { if (b.dataset.sub) b.classList.remove('on'); });
    // 換掉分頁下面的內容（留著最下面「手邊的素材」）
    let n = tabs.nextSibling; while (n && !(n.tagName === 'H3' && n.textContent === '手邊的素材')) { const nx = n.nextSibling; n.remove(); n = nx; }
    const box = document.createElement('div'); box.innerHTML = csub === 'acc' ? accTab() : csub === 'refine' ? refineTab() : buyTab(); tabs.after(box);
    const on = (sel, fn) => box.querySelectorAll(sel).forEach(b => { b.onclick = () => fn(b); });
    on('[data-cacc]', b => { const it = R.craftNamed(ACC_RC[+b.dataset.cacc]); if (it) { R.hub(); R.say('做好了：' + R.itemName(it), R.rarityColor(it)); } });
    on('[data-refine]', b => { const it = R.itemById(b.dataset.refine); if (R.refine(it)) { R.hub(); R.say('精煉成功：' + R.itemName(it), R.rarityColor(it)); } });
    on('[data-reforge]', b => { const it = R.itemById(b.dataset.reforge); if (R.reforge(it)) { R.hub(); R.say('重鑄好了：' + R.itemName(it), R.rarityColor(it)); } });
    on('[data-ench]', b => { const [id, k] = b.dataset.ench.split(':'), it = R.itemById(id), r = R.enchant(it, k); if (r === 'same') R.say('這把武器本來就有這個詞綴了。'); else if (r) { R.hub(); R.say('附魔好了：' + R.itemName(it), R.rarityColor(it)); } });
    on('[data-mbuy]', b => { const [k, q, p] = b.dataset.mbuy.split(':'), s = S(), n = +q, cost = n * +p; if (s.gold < cost) return; s.gold -= cost; s.mats[k] = (s.mats[k] || 0) + n; R.save(); R.hub(); R.say('買了 ' + R.MATS[k].name + ' ×' + n + '（' + cost + ' 費拉）'); });
  };
})(window.R);
