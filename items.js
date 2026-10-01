// 討伐令 1433：裝備與素材（開寶箱、鑑定、製作、強化、分解、賣掉）
(function (R) {
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const wpick = w => { const s = w.reduce((a, b) => a + b, 0); let r = Math.random() * s; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; } return w.length - 1; };
  R.wpick = wpick;
  const newId = () => { R.S.nextId = (R.S.nextId || 1) + 1; return 'i' + R.S.nextId; };

  // ---------- 名稱 ----------
  R.baseName = it => it.kind === 'weapon' ? R.WEAPONS[it.base].name : it.kind === 'armor' ? R.ARMOR[it.base].name : '護符';
  R.itemName = it => {
    if (!it.identified) return '未鑑定的' + R.baseName(it);
    if (it.legend) return R.LEGENDS.find(l => l.id === it.legend).name + (it.plus ? ' +' + it.plus : '');
    const af = it.affixes[0], pre = af ? (R.affixDef(it, af.id).name + '的') : '';
    return pre + (it.kind === 'charm' ? '' : R.TIER_NAME[R.tierOf(it.ilvl)]) + R.baseName(it) + (it.plus ? ' +' + it.plus : '');
  };
  R.affixDef = (it, id) => (it.kind === 'weapon' ? R.W_AFFIX : R.A_AFFIX).find(a => a.id === id);
  R.rarityColor = it => (it.identified ? R.RARITY[it.rarity].color : '#8C8A92');
  R.canUse = (it, cls) => it.kind !== 'weapon' || R.WEAPONS[it.base].cls.includes(cls);
  // 這件東西穿在哪裡
  R.slotOf = it => (it.kind === 'weapon' ? 'weapon' : it.kind === 'charm' ? 'charm' : R.ARMOR[it.base].slot);

  // ---------- 產生 ----------
  // 未鑑定的東西，稀有度與詞綴其實已經決定好了，只是看不到、也還沒生效
  R.makeItem = (o) => {
    const it = { id: newId(), kind: o.kind, base: o.base, ilvl: o.ilvl || 1, rarity: o.rarity || 0, affixes: [], identified: !!o.identified, plus: 0, legend: null };
    if (it.rarity >= 4 && it.kind === 'weapon') { const ls = R.LEGENDS.filter(l => l.base === it.base); if (ls.length) it.legend = pick(ls).id; }
    const pool = (it.kind === 'weapon' ? R.W_AFFIX : R.A_AFFIX).filter(a => !(a.ranged && !['gun', 'bow', 'magic'].includes(R.WEAPONS[it.base] && R.WEAPONS[it.base].kind)));
    const n = it.kind === 'charm' ? Math.max(1, R.RARITY[it.rarity].affix) : R.RARITY[it.rarity].affix;
    const bag = pool.slice();
    for (let i = 0; i < n && bag.length; i++) {
      const k = Math.floor(Math.random() * bag.length), a = bag.splice(k, 1)[0];
      if (a.curse && Math.random() < 0.6) { i--; continue; }   // 詛咒比較少見
      it.affixes.push({ id: a.id, v: rint(a.roll[0], a.roll[1]) });
    }
    return it;
  };
  // 寶箱：g＝分級（0 哈米莉亞～3 克森特），cls＝現在的職業
  R.rollChest = (g, floor, cls, tier) => {
    const out = [], ilvl = Math.max(1, g * 2 + floor + (tier || 0));
    const nItems = (tier || 0) >= 2 ? 3 : (tier || 0) === 1 ? 2 : 1;
    // 哈米莉亞級的寶箱「只會出現簡單藥材或樹枝等無用之物」（《遺跡》第一章第四節）
    if (g === 0) { out.push({ mat: Math.random() < 0.5 ? 'branch' : 'herb', n: rint(1, 3) }); if (Math.random() < 0.4) out.push({ mat: 'herb', n: 1 }); return out; }
    for (let i = 0; i < nItems; i++) {
      const r = Math.random();
      if (r < 0.62) {
        const own = R.weaponsFor(cls), all = Object.keys(R.WEAPONS);
        const base = Math.random() < 0.6 ? pick(own) : pick(all);
        const rarity = wpick(R.LOOT_WEIGHTS[g].map((w, k) => (tier ? w * (1 + k * tier * 0.35) : w)));
        out.push({ item: R.makeItem({ kind: 'weapon', base, ilvl, rarity, identified: Math.random() < R.RARITY[rarity].known }) });
      } else if (r < 0.85) {
        const rarity = wpick(R.LOOT_WEIGHTS[g]);
        out.push({ item: R.makeItem({ kind: 'armor', base: pick(Object.keys(R.ARMOR)), ilvl, rarity, identified: Math.random() < R.RARITY[rarity].known }) });
      } else {
        const rarity = Math.max(1, wpick(R.LOOT_WEIGHTS[g]));
        out.push({ item: R.makeItem({ kind: 'charm', base: 'charm', ilvl, rarity, identified: Math.random() < R.RARITY[rarity].known }) });
      }
    }
    out.push({ mat: g === 0 ? 'herb' : pick(['iron', 'crystal', 'shell', g >= 2 ? 'manaore' : 'iron']), n: rint(1, 2 + g) });
    return out;
  };
  R.starter = cls => R.makeItem({ kind: 'weapon', base: R.STARTER[cls], ilvl: 1, rarity: 0, identified: true });

  // ---------- 數值 ----------
  const affixSum = (items, id) => items.reduce((s, it) => s + (it && it.identified ? it.affixes.filter(a => a.id === id).reduce((q, a) => q + a.v, 0) : 0), 0);
  R.affixSum = affixSum;
  // 武器的實際數值：未鑑定時只有基礎數值（依物品等級），稀有度加成與詞綴都還沒生效
  R.weaponStats = it => {
    const w = R.WEAPONS[it.base];
    const lvl = 1 + 0.13 * (it.ilvl - 1), rar = it.identified ? R.RARITY[it.rarity].mult : 1, plus = 1 + 0.08 * it.plus;
    const aff = id => (it.identified ? it.affixes.filter(a => a.id === id).reduce((q, a) => q + a.v, 0) : 0);
    return Object.assign({}, w, {
      dmg: w.dmg * lvl * rar * plus * (1 + (aff('sharp') + aff('cursed')) / 100),
      rate: w.rate * (1 + aff('swift') / 100) * (aff('heavy') ? 0.9 : 1),
      crit: 0.05 + aff('crit') / 100, vamp: aff('vamp') / 100, fire: aff('fire') / 100, frost: aff('frost') / 100, shock: aff('shock') / 100,
      pierce: (w.pierce || 0) + (aff('pierce') ? 1 : 0), pellets: (w.pellets || 1) + (aff('multi') ? 1 : 0), kb: (w.kb || 0.5) * (1 + aff('heavy') / 100),
      cursed: !!aff('cursed'), legend: it.identified ? it.legend : null
    });
  };
  R.armorStats = it => {
    if (!it) return { def: 0, spd: 0 };
    const a = R.ARMOR[it.base], lvl = 1 + 0.12 * (it.ilvl - 1), rar = it.identified ? R.RARITY[it.rarity].mult : 1;
    return { def: a.def * lvl * rar + it.plus * 1.5, spd: a.spd };
  };

  // ---------- 鐵匠鋪 ----------
  R.identify = it => { if (it.identified) return false; const p = R.idPrice(it); if (R.S.gold < p) return false; R.S.gold -= p; it.identified = true; return true; };
  R.salvage = it => {
    const t = R.tierOf(it.ilvl), got = { iron: rint(1, 2) };
    if (t >= 1) got.manaore = rint(1, 2);
    if (it.identified && it.rarity >= 2) got.crystal = rint(1, it.rarity);
    if (it.identified && it.rarity >= 4) got.core = 1;
    if (it.kind === 'armor') got.shell = 1;
    Object.keys(got).forEach(k => { R.S.mats[k] = (R.S.mats[k] || 0) + got[k]; });
    R.removeItem(it.id);
    return got;
  };
  R.sell = it => { const p = R.sellPrice(it); R.S.gold += p; R.removeItem(it.id); return p; };
  R.upgrade = it => {
    if (!it.identified || it.plus >= 5) return false;
    const c = R.upgradePrice(it);
    if (R.S.gold < c.gold || (R.S.mats.crystal || 0) < c.crystal) return false;
    R.S.gold -= c.gold; R.S.mats.crystal -= c.crystal; it.plus++;
    return true;
  };
  R.canCraft = rc => R.S.gold >= rc.gold && Object.keys(rc.mats).every(k => (R.S.mats[k] || 0) >= rc.mats[k]);
  R.craft = (rc, kind, base) => {
    if (!R.canCraft(rc)) return null;
    R.S.gold -= rc.gold; Object.keys(rc.mats).forEach(k => { R.S.mats[k] -= rc.mats[k]; });
    const it = R.makeItem({ kind, base, ilvl: rc.ilvl, rarity: wpick(rc.weights), identified: true });
    R.S.stash.push(it);
    return it;
  };
  R.removeItem = id => {
    R.S.stash = R.S.stash.filter(x => x.id !== id);
    Object.values(R.S.equip).forEach(e => { R.GEAR_KEYS.forEach(k => { if (e[k] === id) e[k] = null; }); });
  };
  R.itemById = id => R.S.stash.find(x => x.id === id) || null;
  R.equipped = cls => { const e = R.S.equip[cls] || {}, out = {}; R.GEAR_KEYS.forEach(k => { out[k] = R.itemById(e[k]); }); return out; };
  R.equippedIds = () => new Set(Object.values(R.S.equip).flatMap(e => R.GEAR_KEYS.map(k => e[k])).filter(Boolean));

  // 物品說明（給介面用）
  R.itemLines = it => {
    const L = [];
    if (it.kind === 'weapon') {
      const s = R.weaponStats(it), w = R.WEAPONS[it.base];
      L.push(R.WEAPONS[it.base].cls.map(c => R.CLASSES[c].name).join('、') + '用');
      L.push('傷害 ' + s.dmg.toFixed(1) + (s.pellets > 1 ? ' × ' + s.pellets : '') + (w.hits ? ' × ' + w.hits : '') + '　攻速 ' + s.rate.toFixed(1) + ' 次／秒');
      if (w.mag) L.push('彈匣 ' + w.mag + ' 發・換彈 ' + w.reload + ' 秒');
      if (w.mp) L.push('每發消耗魔力 ' + w.mp);
    } else if (it.kind === 'armor') { const s = R.armorStats(it); L.push(R.GEAR_NAME[R.ARMOR[it.base].slot] + '・防禦 ' + s.def.toFixed(1) + (s.spd ? '　移動 ' + (s.spd > 0 ? '+' : '') + Math.round(s.spd * 100) + '%' : '')); }
    else L.push('護符');
    L.push('物品等級 ' + it.ilvl);
    if (!it.identified) L.push('？？？　稀有度與詞綴要鑑定後才知道，也才會生效。');
    else {
      if (it.legend) L.push(R.LEGENDS.find(l => l.id === it.legend).desc);
      it.affixes.forEach(a => { const d = R.affixDef(it, a.id); L.push('・' + d.txt(a.v)); });
    }
    return L;
  };
})(window.R);
