// 套裝（2026-10-04 作者：可以新增套裝，玩家可以自己搭配裝備）
// - 六套：霜狼、熔岩、守墓人、影行者、祈禱者、遺跡探索者。防具（頭、身體、腿、腳）才有套裝紋（it.set）。
//   同一套穿 2 件、4 件各有加成；兩套各穿 2 件也可以（自己搭配）。
// - 怎麼來：寶箱開出史詩以上的防具，兩成五機率帶套裝紋；或在鐵匠鋪「精煉・重鑄」頁替史詩以上的防具刻上你選的套裝紋（可以改刻）。
// - 名字前面多【套裝名】；說明列出套裝的加成和現在穿了幾件。
// - 效果：數值的直接加（R.calcPlayer）；打中時的（減速、燃燒、背刺……）併進被動的 P.pv（passives.js 照樣處理）。
// 放在 passives.js、gems.js 後面。
(function (R) {
  const S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s), rnd = Math.random;
  const SETS = {
    frostwolf: { name: '霜狼', color: '#9AD8FF', b2: { speed: 0.06 }, b4: { slow: 0.15, dmg: 0.08 }, t2: '移動 +6%', t4: '打中時 15% 機率讓敵人減速、傷害 +8%' },
    lava: { name: '熔岩', color: '#FF7A3A', b2: { dmg: 0.06 }, b4: { burn: 0.15, critMult: 0.2 }, t2: '傷害 +6%', t4: '打中時 15% 機率燃燒、暴擊傷害 +20%' },
    warden: { name: '守墓人', color: '#A8A49A', b2: { def: 4 }, b4: { guard: 0.1, hp: 0.1 }, t2: '防禦 +4', t4: '受到的傷害 −10%、生命 +10%' },
    shade: { name: '影行者', color: '#7A6AA8', b2: { crit: 0.04 }, b4: { dodge: 0.2, dodgeHit: 0.4 }, t2: '暴擊率 +4%', t4: '翻滾冷卻 −20%、翻滾後 1.5 秒內的下一擊 +40%' },
    prayer: { name: '祈禱者', color: '#FFE8A0', b2: { mp: 0.15 }, b4: { skillCd: 0.12, mpRegen: 1 }, t2: '魔力 +15%', t4: '技能冷卻 −12%、每秒回復魔力 +1' },
    seeker: { name: '遺跡探索者', color: '#8AC88A', b2: { calm: 0.1 }, b4: { regen: 1, speed: 0.08 }, t2: '佩特拉的注意上升 −10%', t4: '每秒回復生命 +1、移動 +8%' }
  };
  R.SETS = SETS;
  const IDS = Object.keys(SETS);
  const isArmor = it => it && it.kind === 'armor';
  const countOf = cls => { const eq = R.equipped(cls), n = {}; R.GEAR_KEYS.forEach(k => { const it = eq[k]; if (isArmor(it) && it.set && SETS[it.set]) n[it.set] = (n[it.set] || 0) + 1; }); return n; };
  // ---------- 效果 ----------
  const NUM = { speed: (P, v) => { P.speed *= 1 + v; }, dmg: (P, v) => { P.dmgMult *= 1 + v; }, def: (P, v) => { P.def = (P.def || 0) + v; }, hp: (P, v) => { P.hpMax = Math.round(P.hpMax * (1 + v)); }, mp: (P, v) => { P.mpMax = Math.round(P.mpMax * (1 + v)); },
    crit: (P, v) => { if (P.ws) P.ws.crit = (P.ws.crit || 0) + v; }, critMult: (P, v) => { P.critMult += v; }, dodge: (P, v) => { P.dodgeCdMax *= 1 - v; }, skillCd: (P, v) => { P.skillCdMult *= 1 - v; },
    mpRegen: (P, v) => { P.mpRegen = (P.mpRegen || 0) + v; }, guard: (P, v) => { P.setGuard = (P.setGuard || 0) + v; }, regen: (P, v) => { P.regen = (P.regen || 0) + v; }, calm: (P, v) => { P.calm = (P.calm || 0) + v; } };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const n = countOf(cls), pv = Object.assign({}, P.pv || {});
      Object.keys(n).forEach(id => { const st = SETS[id]; [n[id] >= 2 && st.b2, n[id] >= 4 && st.b4].filter(Boolean).forEach(b => Object.keys(b).forEach(k => { if (NUM[k]) NUM[k](P, b[k]); else pv[k] = (pv[k] || 0) + b[k]; })); });
      P.pv = pv; P.setCount = n;
    } catch (e) { }
    return P;
  };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const P = R.W.P; return hp0(P && P.setGuard && raw > 0 ? raw * (1 - P.setGuard) : raw, src, o); };   // 守墓人 4 件：受到的傷害 −10%
  // ---------- 名字、說明 ----------
  const nm0 = R.itemName;
  R.itemName = it => { const n = nm0(it); return isArmor(it) && it.set && SETS[it.set] ? '【' + SETS[it.set].name + '】' + n : n; };
  const il0 = R.itemLines;
  R.itemLines = it => {
    const L = il0(it);
    try { if (isArmor(it) && it.set && SETS[it.set]) { const st = SETS[it.set], have = S() ? (countOf(S().cls)[it.set] || 0) : 0; L.push('套裝「' + st.name + '」（穿著 ' + have + ' 件）：2 件 ' + st.t2 + '／4 件 ' + st.t4); } } catch (e) { }
    return L;
  };
  // ---------- 寶箱：史詩以上的防具兩成五帶套裝紋 ----------
  const rc0 = R.rollChest;
  R.rollChest = (...a) => { const out = rc0(...a); try { (out || []).forEach(o => { const it = o && o.item; if (isArmor(it) && it.rarity >= 3 && !it.set && rnd() < 0.25) it.set = IDS[Math.floor(rnd() * IDS.length)]; }); } catch (e) { } return out; };
  // ---------- 鐵匠鋪：刻套裝紋 ----------
  const price = it => ({ gold: 1500 + 500 * it.rarity, crystal: 5 });
  const sheet = it => {
    const s = S(), c = price(it), ok = s.gold >= c.gold && (s.mats.crystal || 0) >= c.crystal, n = countOf(s.cls);
    R.sheet('<p class="kicker">鐵匠鋪</p><h2>刻套裝紋：' + esc(R.itemName(it)) + '</h2><p class="note">刻上哪一套，就算那一套的一件（頭、身體、腿、腳各一件，湊 2 件、4 件有加成；可以兩套各 2 件）。' + (it.set ? '現在是「' + SETS[it.set].name + '」，改刻會換掉。' : '') + '每次 ' + c.gold + ' 費拉・魔力水晶 ' + c.crystal + '。</p><div class="recipes">'
      + IDS.map(id => { const st = SETS[id]; return '<div class="recipe"><b style="color:' + st.color + '">' + esc(st.name) + (n[id] ? '（穿著 ' + n[id] + ' 件）' : '') + '</b><small>2 件：' + esc(st.t2) + '</small><small>4 件：' + esc(st.t4) + '</small><button type="button" class="btn' + (it.set === id ? '' : ' pri') + '" data-setpick="' + id + '"' + (!ok || it.set === id ? ' disabled' : '') + '>' + (it.set === id ? '現在就是這套' : '刻這一套') + '</button></div>'; }).join('') + '</div>',
      '<div class="row"><button type="button" class="btn" id="st-x">好了</button></div>');
    $('st-x').onclick = () => { R.closeSheet(); R.hub(); };
    document.querySelectorAll('[data-setpick]').forEach(b => { b.onclick = () => { if (s.gold < c.gold || (s.mats.crystal || 0) < c.crystal) return; s.gold -= c.gold; s.mats.crystal -= c.crystal; it.set = b.dataset.setpick; R.save(); R.sfx && R.sfx('magic'); R.toast && R.toast('刻好了：' + R.itemName(it), SETS[it.set].color); sheet(it); }; });
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try {
      document.querySelectorAll('#hub-body [data-reforge]').forEach(rb => {
        const it = R.itemById(rb.dataset.reforge); if (!isArmor(it) || it.rarity < 3 || rb.parentNode.querySelector('[data-setopen]')) return;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.dataset.setopen = it.id; b.textContent = it.set ? '改刻套裝紋（現在：' + SETS[it.set].name + '）' : '刻套裝紋'; b.onclick = () => sheet(it);
        rb.after(b);
      });
    } catch (e) { console.warn('[sets]', e); }
  };
})(window.R);
