// 討伐令 1433：自己的家（作者：GTA——自己的家）
// 公團住宅 1 號棟的 302 室：找管理員簽約（300 費拉，之後不用再付）。R.S.home 記著。
// 家裡（R.enterInterior('home')）：
// - 棉被：睡到明天早上（不用錢，醒來在樓下）。
// - 暖桌：坐一下；泡麵：今天下遺跡生命稍微多一點。
// - 電視：今天的新聞和天氣。
// - 收納櫃：打開倉庫（R.openHub('stash')）。
// - 戰利品架：夾到的娃娃（架上擺出來）、麻將、卡拉 OK、打工、圖鑑、討伐的紀錄。
// - 書桌：寫日記（存檔）。
// 有家之後，車子平常停在家門口（R.homeParking，vehicles.js 會用）。
(function (R) {
  const W = R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const C = R.CITY, toW = s => (s - 500) * C.S;
  const S = () => R.S, RENT = 300;
  const door = () => { const d = C.FAC.danchi && C.FAC.danchi[0]; if (!d) return null; const x = toW(d[0]), z = toW(d[1]); return [x - 9 + 4.2, z + 3.75 + 2]; };   // 1 號棟（寬 18、深 7.5）樓梯口的旁邊
  R.homeParking = () => { if (!S() || !S().home) return null; const d = door(); return d ? [d[0] + 5, d[1] + 3.2, Math.PI / 2] : null; };

  const signSheet = () => {
    const s = S();
    R.sheet('<p class="kicker">公團住宅 1 號棟</p><h2>管理員室</h2><p>「302 室剛好空出來。兩房一廳，有暖桌。押金和手續費一次 ' + RENT + ' 費拉，之後的房租公會的補助會付。」</p><p class="note">有了家：免費睡覺、倉庫的收納櫃、戰利品架、車子停家門口。</p>',
      '<div class="row"><button type="button" class="btn pri" id="hm-sign">簽約（' + RENT + ' 費拉）</button><button type="button" class="btn" id="hm-x">再想想</button></div>');
    document.getElementById('hm-x').onclick = R.closeSheet;
    document.getElementById('hm-sign').onclick = () => { if (s.gold < RENT) { R.toast('錢不夠（要 ' + RENT + ' 費拉）。'); return; } s.gold -= RENT; s.home = { day: s.day }; R.save(); R.closeSheet(); R.townTalk('公團住宅的管理員', ['「這是鑰匙。垃圾記得分類。」', '（302 室是你的了。從 1 號棟的樓梯口回家。）']); };
  };
  // ---------- 街上：樓梯口 ----------
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => {
    enter0(from, at); const t = W.town, d = door(); if (!t || !d) return;
    t.inter.push({ x: d[0], z: d[1], r: 1.8, get label() { return S() && S().home ? '回家（1 號棟 302 室）' : '公團住宅的管理員室（租房子）'; }, act: () => (S().home ? R.enterInterior('home') : signSheet()) });
  };

  // ---------- 家裡 ----------
  const PL = R.INTERIOR_PLACES, FN = R.INTERIOR_FURNISH = R.INTERIOR_FURNISH || {};
  const PLUSH = { plush_moss: '#5A8A3A', plush_tanuki: '#8A6A4A', plush_cat: '#F0ECE2', plush_chick: '#F2D24A', plush_snow: '#E8F2F8', plush_flag: '#3E7A48', plush_moth: '#D8CCB0', plush_bear: '#6A4A3A' };
  const trophies = () => {
    const s = S(), g = s.gifts || {}, st = s.stats || {}, lines = [];
    const pl = Object.keys(PLUSH).filter(k => g[k] > 0).map(k => (R.GIFTS && R.GIFTS[k] ? R.GIFTS[k].name : k) + '×' + g[k]);
    lines.push(pl.length ? '架上的娃娃：' + pl.join('、') : '架上還沒有擺東西。');
    if (s.mj && s.mj.games) lines.push('麻將：' + s.mj.games + ' 場、第一名 ' + s.mj.first + ' 次' + (s.mj.best ? '、最大 ' + s.mj.best + ' 翻' : '') + '。');
    if (s.karaoke) { const k = Object.keys(s.karaoke); if (k.length) lines.push('卡拉 OK 的最高分：' + k.map(id => ({ snow: '〈雪夜的渡口〉', neon: '〈站前的霓虹〉', hero: '〈勇者證明〉' })[id] + ' ' + s.karaoke[id]).join('、') + '。'); }
    const dex = s.dexKills ? Object.keys(s.dexKills).length : 0; if (dex) lines.push('圖鑑上打倒過的遺跡生物：' + dex + ' 種。');
    if (st.runs) lines.push('下過遺跡 ' + st.runs + ' 趟。');
    if (st.jobGold) lines.push('打工賺的錢：' + st.jobGold + ' 費拉。');
    if (st.robbers) lines.push('打倒的強盜：' + st.robbers + ' 個。');
    if ((s.rep || 0) > 0) lines.push('街坊的名聲：' + s.rep + '。');
    R.townTalk('戰利品架', lines);
  };
  const sleep = () => {
    R.sheet('<p class="kicker">302 室</p><h2>棉被</h2><p>你把暖桌關掉，拉開棉被。要睡到明天早上嗎？</p>', '<div class="row"><button type="button" class="btn pri" id="hm-zz">睡覺</button><button type="button" class="btn" id="hm-no">還不睏</button></div>');
    document.getElementById('hm-no').onclick = R.closeSheet;
    document.getElementById('hm-zz').onclick = () => { R.closeSheet(); R.fade(() => { R.advanceDays(1); const from = W.town ? W.town.from : null, d = door(); R.enterTownNow(from, d ? [d[0], d[1] + 1.2] : null); R.toast(pick(['在自己的棉被裡睡了一整晚。', '鬧鐘響了三次才起來。', '夢到了遺跡。醒來的時候還記得一點點。'])); }); };
  };
  const tv = () => { const E = R.eventsToday ? R.eventsToday() : {}, news = (R.CAL_NEWS || []).length ? pick(R.CAL_NEWS) : null; R.townTalk('電視', ['「東鶴電視台，晚間新聞。」', '今天的天氣：' + (E.weather || (E.blizzard ? '暴風雪' : E.heavySnow ? '大雪' : '陰時多雲')) + '。', news || pick(['「北山礦坑的深層，公會呼籲勇者結伴進入。」', '「德克斯凡發表新型魔導引擎，冬天發動更順。」', '「站前的屋台，今年也開張了。」', '「縣廳前的新大橋，預算案今天三讀。」'])]); };
  if (PL) {
    PL.home = { name: '公團住宅 302 室', sub: '你的家', hint: '暖桌的電線有點鬆', w: 10, d: 8, h: 2.8, wall: '#E8E0CC', cap: '#8A7A64', floor: ['#C8B888', 'planks'], zoom: 0.72, out: '出門（下樓）' };
    FN.home = c => {
      const { bx, block, inter, lamp, mesh, TH, HW, HD } = c, K = R.INTERIOR_KIT;
      // 榻榻米（左半邊）、棉被
      bx(5, 0.06, 7.6, '#B8B07A', -HW + 2.5, 0.03, 0).castShadow = false;
      for (let i = 0; i < 3; i++) bx(5, 0.01, 0.04, '#6A6A3A', -HW + 2.5, 0.065, -HD + 2.6 * (i + 1));
      bx(1.2, 0.16, 2.2, '#F2F0E8', -HW + 1.0, 0.14, -HD + 1.6); bx(1.2, 0.08, 1.5, '#5A7AAA', -HW + 1.0, 0.24, -HD + 1.95); bx(0.7, 0.12, 0.4, '#FFFFFF', -HW + 1.0, 0.26, -HD + 0.75);
      block(-HW + 0.4, -HW + 1.6, -HD + 0.5, -HD + 2.7, 'bed'); inter(-HW + 2.0, -HD + 1.6, 1.5, '鑽進棉被（睡到明天早上）', sleep);
      // 暖桌
      bx(1.6, 0.4, 1.6, '#7A5A3A', -HW + 2.6, 0.2, 1.2); bx(2.2, 0.06, 2.2, '#C83A3A', -HW + 2.6, 0.36, 1.2); bx(1.7, 0.05, 1.7, '#8A6A44', -HW + 2.6, 0.44, 1.2);
      mesh(new TH.SphereGeometry(0.08, 6, 5), '#E8823A', -HW + 2.4, 0.52, 1.0); mesh(new TH.SphereGeometry(0.08, 6, 5), '#E8823A', -HW + 2.6, 0.52, 1.2); mesh(new TH.SphereGeometry(0.08, 6, 5), '#E8823A', -HW + 2.8, 0.52, 1.0);   // 橘子
      block(-HW + 1.6, -HW + 3.6, 0.2, 2.2, 'table'); inter(-HW + 2.6, 2.6, 1.5, '鑽進暖桌', () => R.townTalk('暖桌', [pick(['腳伸進去的一瞬間，整個人都不想動了。', '剝了一顆橘子。', '再坐一下。外套先放旁邊。'])]));
      // 電視
      bx(1.0, 0.7, 0.6, '#2A2A30', -HW + 4.4, 0.65, -HD + 0.5); const scr = bx(0.8, 0.5, 0.02, new TH.MeshBasicMaterial({ color: '#7A9ACF' }), -HW + 4.4, 0.68, -HD + 0.81); scr.castShadow = false; bx(1.2, 0.3, 0.6, '#6A4A30', -HW + 4.4, 0.15, -HD + 0.5);
      block(-HW + 3.8, -HW + 5.0, -HD + 0.2, -HD + 0.8, 'tv'); inter(-HW + 4.4, -HD + 1.6, 1.4, '看電視', tv);
      // 廚房（右上）：流理台、泡麵
      bx(3.2, 0.9, 0.6, '#C8C8D0', HW - 1.8, 0.45, -HD + 0.4); bx(3.2, 0.05, 0.62, '#9A9AA2', HW - 1.8, 0.92, -HD + 0.4); bx(0.6, 0.06, 0.4, '#3A3A40', HW - 2.6, 0.96, -HD + 0.4);
      block(HW - 3.4, HW - 0.2, -HD + 0.1, -HD + 0.7, 'counter');
      inter(HW - 1.8, -HD + 1.4, 1.5, '煮一碗泡麵', () => { const s = S(); if (s.ramenDay === s.day) { R.townTalk('廚房', ['今天已經吃過了。']); return; } s.ramenDay = s.day; if (!s.buff || s.buff.until !== s.day) s.buff = { kind: 'ramen', b: { hp: 0.03 }, until: s.day }; R.save(); R.townTalk('廚房', ['熱水倒下去，等三分鐘。', '……兩分半就忍不住打開了。', '（今天下遺跡：生命稍微提高）']); });
      // 收納櫃（倉庫）
      bx(1.4, 1.8, 0.5, '#8A6A44', HW - 0.5, 0.9, 0.6); [0.5, 1.3].forEach(y => bx(1.3, 0.04, 0.02, '#5A4030', HW - 0.5, y, 0.86)); block(HW - 1.2, HW, 0.3, 0.9, 'shelf');
      inter(HW - 1.4, 0.6, 1.4, '收納櫃（打開倉庫）', () => R.openHub('stash'));
      // 戰利品架（北牆、電視和廚房中間，正面朝南看得到）：夾到的娃娃擺上去
      const SX = 0.8, SZ = -HD + 0.25; bx(1.4, 1.7, 0.4, '#6A4A30', SX, 0.85, SZ); [0.55, 1.1, 1.65].forEach(y => bx(1.36, 0.04, 0.42, '#4A3424', SX, y, SZ + 0.02));
      const g = (S() && S().gifts) || {}; let n = 0;
      Object.keys(PLUSH).forEach(k => { const cnt = Math.min(3, g[k] || 0); for (let i = 0; i < cnt; i++, n++) { if (n >= 8) return; const row = Math.floor(n / 4), col = n % 4; mesh(new TH.SphereGeometry(0.12, 7, 6), PLUSH[k], SX - 0.45 + col * 0.3, 0.7 + row * 0.55, SZ + 0.18); } });
      if (S() && S().mj && S().mj.first) mesh(new TH.CylinderGeometry(0.08, 0.12, 0.3, 8), new TH.MeshLambertMaterial({ color: '#E8C04A', emissive: '#6A5010' }), SX, 1.82, SZ + 0.1);   // 麻將拿過第一的獎盃
      block(SX - 0.7, SX + 0.7, SZ - 0.2, SZ + 0.25, 'shelf'); inter(SX, -HD + 1.4, 1.4, '看戰利品架', trophies);
      // 書桌：寫日記（存檔）
      bx(1.2, 0.75, 0.6, '#7A5A3A', HW - 0.7, 0.375, HD - 2.4); bx(0.5, 0.04, 0.35, '#F2ECD8', HW - 0.7, 0.77, HD - 2.4); block(HW - 1.3, HW - 0.1, HD - 2.7, HD - 2.1, 'table');
      inter(HW - 1.6, HD - 2.4, 1.3, '寫日記（存檔）', () => { R.save && R.save(); R.townTalk('日記', ['第 ' + (S().day || 0) + ' 天。', pick(['今天也活著回來了。', '有幾件事忘了記，現在又想不起來。', '明天要去哪一座遺跡呢。', '今天花的錢也該記一下，不然過兩天又忘了。']), '（存檔了）']); });
      lamp(0, 2.5, 0, '#FFF0D0', 0.8, 10); lamp(-HW + 2.6, 1.2, 1.2, '#FF9A5A', 0.35, 3);
      if (K && K.plantAt) K.plantAt(c, HW - 0.6, HD - 0.6);
    };
  }
  R.homeDebug = { door, signSheet, trophies };
})(window.R);
