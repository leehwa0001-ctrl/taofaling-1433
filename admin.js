// 管理員號（2026-10-04 作者：幫我用一個管理員號，就是什麼東西都有，再這些更新後再用就好）
// - 用序號開（redeem.js 的 admin）：兌換的那個存檔變成管理員號（R.S.admin）。建議在新的存檔格開一個角色再兌換。
// - 給的東西：費拉 999 萬、藥水各 999、所有素材（含寶石、新素材）各 999、所有背包、經驗書 99、種族抽選券 9999、
//   SR／SSR／UR 自選券各 5、炸彈 5、寫好的卷軸 60；所有職業 80 級、轉職（還沒選的給第一條路線）、二次轉職（術士諧鳴、其他覺醒）；
//   望月瀧教的技能、全部稱號、圖鑑全滿（小同伴也會解鎖）；段位近神段；房子、花園擴到最大；
//   倉庫：每一種武器、防具各一件神話、每一件領主專屬裝備、一個神話護符。
// - 公會畫面上面會標「管理員」。
// 放在所有內容檔的後面（要讀到全部的武器、防具、素材、技能、稱號）。
(function (R) {
  const S = () => R.S;
  R.makeAdmin = () => {
    const s = S(); if (!s) return;
    s.admin = 1; s.gold = (s.gold || 0) + 9999999;
    s.potions = s.potions || {}; s.potions.hp = (s.potions.hp || 0) + 999; s.potions.mp = (s.potions.mp || 0) + 999;
    s.mats = s.mats || {}; Object.keys(R.MATS).forEach(k => { s.mats[k] = Math.max(s.mats[k] || 0, 999); });
    s.packs = s.packs || { sack: 1 }; Object.keys(R.PACKS || {}).forEach(k => { s.packs[k] = Math.max(s.packs[k] || 0, 1); });
    s.xpBooks = (s.xpBooks || 0) + 99; s.raceTickets = (s.raceTickets || 0) + 9999;
    if (R.giveRaceSelect) ['SR', 'SSR', 'UR'].forEach(t => R.giveRaceSelect(t, 5));
    s.bombs = 5; s.scrolls = Math.max(s.scrolls || 0, 60); s.san = 100; s.banUntil = 0; s.shameUntil = 0;
    s.homeLv = 3; s.gardenLv = 3; s.home = s.home || { day: s.day || 0 };
    s.rank = { dan: 5, tier: 1 };
    // 職業
    const cap = R.LV_CAP || 80;
    R.CLASS_IDS.forEach(c => {
      if (R.ensureKit) R.ensureKit(c); const st = s.classes[c]; if (!st) return;
      st.lv = Math.max(st.lv || 1, cap); st.xp = 0; st.trial = 2; st.trial2 = 2;
      if (!st.adv) { const a = (R.ADV[c] || []).find(x => !x.legacy); if (a) st.adv = a.id; }
      if (!st.adv2) st.adv2 = c === 'mage' ? 'harmonic' : 'awaken';
    });
    // 技能、稱號、圖鑑、領主
    s.taught = s.taught || {}; Object.values(R.SKILL_LIB || {}).forEach(k => { if (k.taught) s.taught[k.id] = 1; });
    s.pact = s.pact || { sel: {}, best: {}, got: {}, title: null }; (R.TITLES || []).forEach(t => { s.pact.got[t[0]] = s.pact.got[t[0]] || (s.day || 0) + 1; }); if (!s.pact.title && R.TITLES && R.TITLES[0]) s.pact.title = R.TITLES[0][0];
    s.dexKills = s.dexKills || {}; Object.keys(R.ENEMIES).forEach(id => { s.dexKills[id] = Math.max(s.dexKills[id] || 0, 99); });
    s.lordGot = s.lordGot || {}; Object.keys(R.LORD_GEAR || {}).forEach(id => { s.lordGot[id] = s.lordGot[id] || 1; });
    // 倉庫
    s.stash = s.stash || []; const ilvl = cap;
    Object.keys(R.WEAPONS).forEach(b => s.stash.push(R.makeItem({ kind: 'weapon', base: b, ilvl, rarity: 5, identified: true })));
    Object.keys(R.ARMOR).forEach(b => s.stash.push(R.makeItem({ kind: 'armor', base: b, ilvl, rarity: 5, identified: true })));
    Object.keys(R.LORD_GEAR || {}).forEach(id => { const g = R.LORD_GEAR[id], it = R.makeItem({ kind: 'armor', base: g[1], ilvl, rarity: 4, identified: true }); it.lord = id; s.stash.push(it); });
    try { s.stash.push(R.makeItem({ kind: 'charm', base: 'charm', ilvl, rarity: 5, identified: true })); } catch (e) { }
    R.save();
  };
  // 公會畫面標「管理員」
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try { const s = S(), st = document.getElementById('hub-stat'); if (s && s.admin && st && !st.querySelector('.admin-tag')) { const b = document.createElement('span'); b.className = 'admin-tag'; b.innerHTML = '<b style="color:#FF7A7A">管理員</b>'; st.prepend(b); } } catch (e) { }
  };
})(window.R);
