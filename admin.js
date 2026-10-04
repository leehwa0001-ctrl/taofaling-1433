// 管理員號（2026-10-04 作者：幫我用一個管理員號，就是什麼東西都有，再這些更新後再用就好）
// - 用序號開（redeem.js 的 admin）：兌換的那個存檔變成管理員號（R.S.admin）。建議在新的存檔格開一個角色再兌換。
// - 給的東西：費拉 999 萬、藥水各 999、所有素材（含寶石、新素材）各 999、所有背包、經驗書 99、種族抽選券 9999、
//   SR／SSR／UR 自選券各 5、炸彈 5、寫好的卷軸 60；所有職業 80 級、轉職（還沒選的給第一條路線）、二次轉職（術士諧鳴、其他覺醒）；
//   望月瀧教的技能、全部稱號、圖鑑全滿（小同伴也會解鎖）；段位近神段；房子、花園擴到最大；
//   倉庫：每一種武器、防具各一件神話、每一件領主專屬裝備、一個神話護符。
// - 2026-10-05 再補（作者：全部東西都要解鎖）：高級炸彈、爆裂核心、公會賣的共通被動、各分級的攻略次數和卡索級的許可、
//   每座遺跡的存檔點、觀光章（東鶴、奉主）、動物園的說明牌、每一種家具、二轉的指定試煉全部通過、所有技能熟練度 ★5。
//   坎賽特級照設定永遠不開放；會長的劇情（kansait.js）照常走。
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
    // 2026-10-05 作者：全部東西都要解鎖——後來加的內容也補上（坎賽特級照設定永遠不開放，不動）
    try {
      s.bombsHi = Math.max(s.bombsHi || 0, 5); s.bombsCore = Math.max(s.bombsCore || 0, 5);
      s.pvBought = Array.from(new Set((s.pvBought || []).concat((R.PASSIVE_LIST || []).filter(p => p.cls === '*').map(p => p.id))));   // 公會賣的共通被動
      s.cleared = s.cleared || {}; (R.GRADES || []).forEach(g => { if (g.id !== 'kansait') s.cleared[g.id] = Math.max(s.cleared[g.id] || 0, 10); });
      s.kasoAuth = s.kasoAuth || (s.day || 0) + 1;   // 卡索級的許可
      // 每座遺跡的存檔點都記過（從入口直接轉送）
      s.waypoints = s.waypoints || {}; s.waypointList = s.waypointList || {};
      R.SITES.filter(x => x.kind === 'ruin' && x.grade !== 'kansait').forEach(site => {
        const grade = R.GRADES.find(g => g.id === site.grade), floors = R.floorsFor ? R.floorsFor(site) : 10, run = { site, grade, floors, f0: grade && grade.floor0 ? 1 : 0 };
        const every = R.saveEvery ? R.saveEvery(run) : 5, L = []; for (let n = every; n < floors; n += every) L.push(n);
        if (L.length) { s.waypointList[site.id] = Array.from(new Set((s.waypointList[site.id] || []).concat(L))).sort((a, b) => a - b); s.waypoints[site.id] = Math.max(s.waypoints[site.id] || 0, L[L.length - 1]); }
      });
      // 觀光章（東鶴、奉主）、動物園的說明牌、家具
      s.sights = s.sights || {}; (R.SIGHTS || []).forEach(v => { s.sights[v[0]] = s.sights[v[0]] || (s.day || 0) + 1; });
      s.hosuSights = s.hosuSights || {}; (R.HOSU_SIGHTS || []).forEach(v => { s.hosuSights[v[0]] = s.hosuSights[v[0]] || (s.day || 0) + 1; });
      s.zooSeen = s.zooSeen || {}; Object.keys(R.ENEMIES).forEach(id => { s.zooSeen[id] = 1; });
      s.furn = s.furn || {}; s.furn.own = s.furn.own || {}; s.furn.at = s.furn.at || {}; Object.keys(R.FURNITURE || {}).forEach(id => { s.furn.own[id] = Math.max(s.furn.own[id] || 0, 1); });
      // 每個職業：二轉的指定試煉全部算通過（可以隨時換）、所有技能熟練度 ★5
      const PROF = R.SKILL_PROF || [20, 60, 140, 260, 450];
      R.CLASS_IDS.forEach(c => {
        const st = s.classes[c]; if (!st) return;
        st.t2 = st.t2 || {}; (R.ADV2_OPTS ? R.ADV2_OPTS(c) : []).forEach(o => { st.t2[o.id] = { done: 1 }; });
        st.sp = st.sp || { r: {}, t: {} }; st.sp.r = st.sp.r || {}; st.sp.t = st.sp.t || {}; st.sp.u = st.sp.u || {}; st.sp.m1 = 1;
        const ids = new Set(R.skillsLearned ? R.skillsLearned(c) : []);
        Object.values(R.SKILL_LIB || {}).forEach(k => { if (k.cls === c) ids.add(k.id); });
        ids.forEach(id => { st.sp.r[id] = 5; st.sp.u[id] = Math.max(st.sp.u[id] || 0, PROF[PROF.length - 1]); });
      });
    } catch (e) { console.warn('[admin]', e); }
    R.save();
  };
  // 公會畫面標「管理員」
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try { const s = S(), st = document.getElementById('hub-stat'); if (s && s.admin && st && !st.querySelector('.admin-tag')) { const b = document.createElement('span'); b.className = 'admin-tag'; b.innerHTML = '<b style="color:#FF7A7A">管理員</b>'; st.prepend(b); } } catch (e) { }
  };
})(window.R);
