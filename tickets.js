// 經驗書、種族抽選券（原本是 compensation.js 的限時補償，2026-10-02 上線）
// - 作者 2026-10-04：「限時補償和序號能獲得的東西如果重複，就能刪掉了」——補償的內容（5000 費拉、升 10 等經驗書、種族抽選券 200 張、魔力核心）
//   改成序號「補償禮包」（redeem.js），自動寄送的部分拿掉了；這個檔案只留下「用」的部分：
//   倉庫（背包）讀經驗書、公會登記處用抽選券。已經領過補償、手上還有的照樣可以用。
//   存檔裡的 comp20261002、comp20261002b 欄位不再有程式讀，不用清。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s);
  const BOOK_LV = 10;

  // 升 10 等經驗書：現在登記的武器（職業）直接升 10 級
  const readBook = () => {
    const S = R.S; if (!(S.xpBooks > 0)) return;
    const st = S.classes[S.cls], lv0 = st.lv, cap = R.LV_CAP || 100;
    S.xpBooks--;
    // 不能超過等級上限（以前會直接 +10，滿級附近會破帽）；多出來的等同一級的經驗換成技能點（跟 levelcap.js 滿級後一樣）
    if (st.lv > cap) { st.spBonus = (st.spBonus || 0) + (st.lv - cap); st.lv = cap; }
    const gain = Math.min(BOOK_LV, Math.max(0, cap - st.lv));
    st.lv += gain;
    const extra = BOOK_LV - gain;
    if (extra > 0) st.spBonus = (st.spBonus || 0) + extra;
    R.save(); R.hub();
    R.say(R.clsName(S.cls) + ' Lv ' + lv0 + ' → ' + st.lv
      + (extra ? '（已滿級，多出來的 ' + extra + ' 級換成 ' + extra + ' 點技能點）' : '')
      + (lv0 < R.PROMOTE_LV && st.lv >= R.PROMOTE_LV ? '。轉職的等級到了（到公會看轉職條件）' : ''));
  };

  // 用抽選券改種族：抽一次一張、十連抽十張；選了才登記，不收手續費，也不受一天一次的限制
  const TIER_I = () => Object.keys(R.TIERS);
  const applyRace = id => {
    const S = R.S, r = R.RACES[id];
    S.race = id;
    if (!S.look) S.look = { hs: r.look && r.look.bald ? 'bald' : 'short', hair: r.hairCol || (r.hairs ? r.hairs[0] : '#2A2420'), skin: r.skins[0], eye: r.eye || '#1A1714', top: '#3E5A6E', cloak: '#4A3A30', acc: 'none', accCol: '#C8323A' };
    if (r.hairCol) S.look.hair = r.hairCol; if (!r.skins.includes(S.look.skin)) S.look.skin = r.skins[0]; S.look.eye = r.eye || '#1A1714';
    S.name = S.name || R.randomName(id);
    if (id === 'demon') { S.watched = true; R.addDeed && R.addDeed('公會東鶴分館登記了一名魔族勇者，列為受監視對象。'); } else if (S.watched) S.watched = false;
    R.addDeed && R.addDeed('勇者證的種族欄重新登記為「' + r.name + '」。');
    R.save(); if (R.restyleSelf) R.restyleSelf();
  };
  R.applyRace = applyRace;   // 自選券（raceselect.js）也用
  const ticketGacha = () => {
    const S = R.S, host = $('hub-sheet'), el = $('hub-modal'); el.hidden = false;
    let got = [], pick = null;
    const card = (id, i) => { const r = R.RACES[id], T0 = R.TIERS[r.tier]; return '<button type="button" class="race-card' + (pick === i ? ' sel' : '') + '" data-pick="' + i + '" style="--c:' + T0.color + '"><span class="tier">' + T0.name + '</span><b>' + esc(r.name) + '</b><small>' + esc(r.from) + '</small></button>'; };
    const detail = id => { const r = R.RACES[id], T0 = R.TIERS[r.tier]; return '<div class="race-card race-detail" style="--c:' + T0.color + '"><span class="tier">' + T0.name + '</span><b>' + esc(r.name) + '</b><small>' + esc(r.from) + '</small><span>' + esc(r.line) + '</span><em>' + esc(R.raceBonusText(id).join('・')) + '</em><i>' + esc(R.XENO_TEXT[r.xeno]) + '</i></div>'; };
    const rates = '<div class="rates">' + TIER_I().map(t => '<div class="rate" style="--c:' + R.TIERS[t].color + '"><b>' + R.TIERS[t].name + '</b><span>' + R.TIERS[t].w + '%</span></div>').join('') + '</div>';
    const render = () => {
      const n = S.raceTickets || 0;
      host.innerHTML = '<h2>種族抽選券</h2><p class="note">登記處的館員收下抽選券：「有抽選券就不用付這次的驗測費。給我一張就好。」抽一次用一張，十連抽用十張，五十連抽用五十張（最稀有的排在最前面）。抽到喜歡的就按「登記」；不喜歡就再抽，或收起來下次再用。</p>'
        + '<p class="note">現在的種族：<b>' + (S.race && R.RACES[S.race] ? esc(R.RACES[S.race].name) : '未登記') + '</b>・抽選券還有 <b>' + n + '</b> 張</p>' + rates
        + '<div class="race-cards ten">' + (got.length ? got.map(card).join('') : '<p class="note">還沒抽。</p>') + '</div>'
        + (pick != null ? detail(got[pick]) : '')
        + '<div class="row"><button type="button" class="btn pri" id="tk-1"' + (n < 1 ? ' disabled' : '') + '>抽一次（1 張）</button><button type="button" class="btn pri" id="tk-10"' + (n < 10 ? ' disabled' : '') + '>十連抽（10 張）</button><button type="button" class="btn pri" id="tk-50"' + (n < 50 ? ' disabled' : '') + '>五十連抽（50 張）</button>'
        + (pick != null ? '<button type="button" class="btn gold" id="tk-ok">登記為「' + esc(R.RACES[got[pick]].name) + '」</button>' : '') + '<button type="button" class="btn" id="tk-x">收起來</button></div>';
      const draw = k => {
        if ((S.raceTickets || 0) < k) return;
        S.raceTickets -= k; got = []; for (let i = 0; i < k; i++) got.push(R.drawRace());
        // 照稀有度排（最稀有的在前面），先選中第一張
        got.sort((a, b) => TIER_I().indexOf(R.RACES[b].tier) - TIER_I().indexOf(R.RACES[a].tier)); pick = 0;
        R.save(); render();
        got.forEach((id, i) => { const c = host.querySelector('[data-pick="' + i + '"]'), t = R.RACES[id].tier, rare = t === 'SSR' || t === 'UR', d = i * (k > 10 ? 0.03 : 0.09); if (!c) return; c.style.animationDelay = rare ? d + 's, ' + (d + 0.5) + 's' : d + 's'; c.style.animationFillMode = 'backwards'; c.classList.add('flip'); if (rare) c.classList.add('shine'); });
      };
      $('tk-1').onclick = () => draw(1); $('tk-10').onclick = () => draw(10); $('tk-50').onclick = () => draw(50);
      host.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => { pick = +b.dataset.pick; render(); }; });
      if ($('tk-ok')) $('tk-ok').onclick = () => {
        const id = got[pick]; el.hidden = true;
        if (id === S.race) { R.hub(); R.say('本來就是這一族，種族欄不用改。'); return; }
        applyRace(id); R.hub(); R.say('種族重新登記為「' + R.RACES[id].name + '」。');
      };
      $('tk-x').onclick = () => { el.hidden = true; R.hub(); };
    };
    render();
  };

  // 接到店面的畫面上：倉庫（背包）多一欄經驗書、抽選券；公會登記處的勇者證旁邊多一個按鈕
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const S = R.S, body = $('hub-body'); if (!body) return;
    const h2 = body.querySelector('h2');
    if (h2 && h2.textContent === '倉庫' && (S.xpBooks > 0 || S.raceTickets > 0)) {
      const box = document.createElement('div');
      box.innerHTML = '<h3>背包：經驗書、抽選券</h3><div class="recipes">'
        + (S.xpBooks > 0 ? '<div class="recipe"><b>升 ' + BOOK_LV + ' 等經驗書 ×' + S.xpBooks + '</b><small>讀了以後，現在登記的武器（' + esc(R.clsName(S.cls)) + ' Lv ' + S.classes[S.cls].lv + '）直接升 ' + BOOK_LV + ' 級。想給別的武器用，先到公會改登記。</small><button type="button" class="btn pri" data-xpbook="1">讀</button></div>' : '')
        + (S.raceTickets > 0 ? '<div class="recipe"><b>種族抽選券 ×' + S.raceTickets + '</b><small>到公會的登記處用：抽一次一張，十連抽十張，五十連抽五十張，抽到喜歡的才登記，不收手續費。</small></div>' : '') + '</div>';
      const note = body.querySelector('.panel-doc > .note'); (note || h2).after(box);
      const b = box.querySelector('[data-xpbook]'); if (b) b.onclick = readBook;
    }
    const anchor = body.querySelector('[data-racechg], [data-latereg]');
    if (anchor && S.raceTickets > 0) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn gold'; b.textContent = '用種族抽選券（還有 ' + S.raceTickets + ' 張）';
      b.onclick = ticketGacha; anchor.after(b);
    }
  };
})(window.R);
