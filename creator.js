// 討伐令 1433：勇者登記（新的冒險）：抽種族 → 捏角（名字、外觀） → 登記武器（武器的類別就是職業）
(function (R) {
  const $ = id => document.getElementById(id);
  const esc = s => R.esc(s);
  const HS = [['short', '短髮'], ['long', '長髮'], ['ponytail', '馬尾'], ['bun', '包頭'], ['spiky', '刺蝟頭'], ['bob', '鮑伯頭'], ['braid', '辮子'], ['crop', '平頭'], ['bald', '光頭']];
  const HAIR = ['#1A1714', '#2A2420', '#4A3424', '#6A4A2E', '#8A5A2E', '#B7874E', '#C99B55', '#E9D8A6', '#D8D2C4', '#7A2E1F', '#D2692A', '#2E3A5A', '#3E5A3E', '#6A4A7A'];
  const EYES = ['#1A1714', '#3A2A1C', '#2E4A6A', '#3E6A3E', '#6A3A2A', '#5A5A6A', '#8A6A2A', '#C8323A'];
  const CLOTH = ['#3E4E62', '#4A6A3E', '#7A3E30', '#4A3E7A', '#E6DEC6', '#2E2E38', '#8A96A3', '#6E5A44', '#2F4A6E', '#5A3A5A', '#8A6A3A', '#3A5A5A', '#B8322A', '#1C1C24'];
  const ACC = [['none', '沒有'], ['scarf', '圍巾'], ['glasses', '眼鏡'], ['headband', '頭帶'], ['eyepatch', '眼罩'], ['earring', '耳環'], ['flower', '髮飾']];
  const ACCC = ['#C8323A', '#2E5A8A', '#3E7A48', '#C9A13A', '#E8E0D0', '#6A4A8A', '#1C1C24'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let st = null, timer = 0;

  R.createChar = slot => {
    if (slot) R.slot = slot;
    st = { step: 'race', race: null, look: null, name: '', cls: 'gunner', weapon: 'pistol' };
    R.showScreen('pick'); step();
  };
  const step = () => {
    clearInterval(timer);
    const h = $('pick-cards');
    $('pick-h').textContent = '勇者登記・' + { race: '一、種族', look: '二、外觀', cls: '三、登記武器' }[st.step];
    $('pick-intro').textContent = { race: '輪到你時，館員把登記表轉過來。「先填名字，接著確認種族和武器。不清楚的地方再問我。」', look: '「勇者證上要貼照片。」館員指了指牆邊的鏡子。', cls: '「最後是主要武器。你平常用哪一種？以後要換，再來改登記就好。」各類武器的等級分開計算；轉職條件可在公會的武器登記頁查看。' }[st.step];
    if (st.step === 'race') R.raceGacha(h, id => { st.race = id; st.look = defaultLook(id); st.name = R.randomName(id); st.step = 'look'; step(); }, { ten: true });
    else if (st.step === 'look') lookStep(h);
    else clsStep(h);
  };
  const defaultLook = race => { const r = R.RACES[race]; return { hs: r.look.bald ? 'bald' : 'short', hair: r.hairCol || pick(r.hairs || HAIR), skin: pick(r.skins), eye: r.eye || '#1A1714', top: pick(CLOTH), cloak: pick(CLOTH), acc: 'none', accCol: '#C8323A' }; };

  // ---------- 預覽：正面、側面、背面，走路的樣子 ----------
  let sheet = null, sheetKey = '';
  const preview = cv => {
    const look = Object.assign({ weapon: st.weapon || R.STARTER[st.cls] || 'katana', shield: !!R.CLASSES[st.cls].shield, race: st.race }, st.look), k = JSON.stringify(look);
    if (k !== sheetKey) { sheet = R.heroSheetCanvas(look); sheetKey = k; }
    let t = 0;
    const draw = () => {
      const x = cv.getContext('2d'), S = 5, fr = [0, 1, 0, 2][t++ % 4], k = R.lookScale ? R.lookScale(st.look) : { x: 1, y: 1 };
      x.imageSmoothingEnabled = false; x.clearRect(0, 0, cv.width, cv.height);
      [0, 2, 1].forEach((dir, i) => { const w = 24 * S * k.x, hh = 30 * S * k.y; x.drawImage(sheet, fr * 24, dir * 30, 24, 30, i * 24 * S + (24 * S - w) / 2, cv.height - hh, w, hh); });   // 身高、體格（lookplus.js）
    };
    draw(); clearInterval(timer); timer = setInterval(() => { if (!cv.isConnected) { clearInterval(timer); return; } draw(); }, 240);
  };
  const sw = (key, list, cur, dis) => '<div class="swatches">' + list.map(c => '<button type="button" class="sw' + (c === cur ? ' on' : '') + '" data-k="' + key + '" data-v="' + c + '" style="--c:' + c + '" aria-label="' + c + '"' + (dis ? ' disabled' : '') + '></button>').join('') + '</div>';
  const chips = (key, list, cur, dis) => '<div class="chips">' + list.map(([v, n]) => '<button type="button" class="chip' + (v === cur ? ' on' : '') + '" data-k="' + key + '" data-v="' + v + '"' + (dis ? ' disabled' : '') + '>' + esc(n) + '</button>').join('') + '</div>';
  const lookStep = h => {
    const r = R.RACES[st.race], L = st.look, bald = !!r.look.bald, fixedHair = !!r.hairCol, O = R.LOOK_OPTS, FCOL = { ears: 'earCol', horns: 'hornCol', wings: 'wingCol', tail: 'tailCol' };
    h.innerHTML = '<div class="creator"><div class="cr-prev"><canvas id="cr-cv" width="360" height="166"></canvas><p class="note"><b style="color:' + R.TIERS[r.tier].color + '">' + esc(r.tier) + '・' + esc(r.name) + '</b>　' + esc(R.raceBonusText(st.race).join('・')) + '</p></div>'
      + '<div class="cr-opts">'
      + '<label class="field">名字<input id="cr-name" maxlength="12" value="' + esc(st.name) + '"><button type="button" class="mini" id="cr-rname">換一個</button></label>'
      + '<h3>髮型</h3>' + (bald ? '<p class="note">' + esc(r.name) + '沒有頭髮。</p>' : chips('hs', HS.concat(O ? O.HAIR_NEW : []), L.hs))
      + '<h3>髮色</h3>' + (fixedHair ? '<p class="note">' + esc(r.name) + '的頭髮是天生的顏色。</p>' : sw('hair', (r.hairs || []).concat(HAIR.filter(c => !(r.hairs || []).includes(c))), L.hair, bald && !r.look.leaves))
      + '<h3>膚色</h3>' + sw('skin', r.skins, L.skin)
      + '<h3>眼睛</h3>' + sw('eye', EYES, L.eye)
      + (O ? '<h3>臉</h3><p class="note cr-sub">眉毛</p>' + chips('brow', O.BROW, L.brow || '') + '<p class="note cr-sub">瞳孔</p>' + chips('pupil', O.PUPIL, L.pupil || '') + '<p class="note cr-sub">表情</p>' + chips('mouth', O.MOUTH, L.mouth || '')
        + '<h3>體型</h3><p class="note cr-sub">身高</p>' + chips('height', O.HEIGHT, L.height || '') + '<p class="note cr-sub">體格</p>' + chips('build', O.BUILD, L.build || '') : '')
      + '<h3>上衣</h3>' + (O ? chips('topStyle', O.TOP, L.topStyle || '') : '') + sw('top', CLOTH, L.top)
      + (O && ['vest', 'coat', 'kimono'].includes(L.topStyle) ? '<p class="note cr-sub">' + (L.topStyle === 'kimono' ? '腰帶' : '裡面的襯衫') + '</p>' + sw('top2', CLOTH, L.top2 || '#E8E4DA') : '')
      + '<h3>披風</h3>' + sw('cloak', CLOTH, L.cloak)
      + (O ? '<h3>褲子</h3>' + chips('pantsStyle', O.PANTS, L.pantsStyle || '') + sw('pants', CLOTH, L.pants || '') + '<h3>鞋子</h3>' + chips('shoeStyle', O.SHOES, L.shoeStyle || '') + sw('shoe', O.SHOE_COL, L.shoe || '') : '')
      + (O && R.raceFeatureOpts ? R.raceFeatureOpts(st.race).map(f => '<h3>' + esc(f.n) + '</h3>' + (f.styles.length > 1 ? chips(f.key, f.styles, L[f.key] || f.def) : '') + sw(FCOL[f.key], O.FEAT_COL, L[FCOL[f.key]] || '')).join('') : '')
      + '<h3>配件</h3>' + chips('acc', ACC, L.acc) + (L.acc !== 'none' && L.acc !== 'glasses' && L.acc !== 'eyepatch' && L.acc !== 'earring' ? sw('accCol', ACCC, L.accCol) : '')
      + '</div></div><div class="row"><button type="button" class="btn" id="cr-rand">全部隨機</button><button type="button" class="btn pri" id="cr-next">下一步：登記武器</button></div>';
    preview($('cr-cv'));
    $('cr-name').oninput = e => { st.name = e.target.value.trim(); };
    $('cr-rname').onclick = () => { st.name = R.randomName(st.race); $('cr-name').value = st.name; };
    h.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { st.look[b.dataset.k] = b.dataset.v; lookStep(h); }; });
    $('cr-rand').onclick = () => { st.look = defaultLook(st.race); if (!bald) st.look.hs = pick(HS.slice(0, 8))[0]; st.look.acc = pick(ACC)[0]; st.look.accCol = pick(ACCC); st.look.eye = r.eye || pick(EYES); if (O) { const pv = l => pick(l)[0]; Object.assign(st.look, { brow: pv(O.BROW), pupil: pv(O.PUPIL), mouth: pv(O.MOUTH), height: pv(O.HEIGHT), build: pv(O.BUILD), topStyle: pv(O.TOP), pantsStyle: pv(O.PANTS), shoeStyle: pv(O.SHOES), pants: pick(CLOTH), shoe: pick(O.SHOE_COL), top2: pick(CLOTH) }); if (!bald && Math.random() < 0.4) st.look.hs = pv(O.HAIR_NEW); } st.name = R.randomName(st.race); lookStep(h); };
    if (st.edit) {
      // 重新捏角：照好了才換；「不換了」什麼都不改。從公會打開的回到公會，其他回到街上（或建築物裡）
      const leave = msg => { clearInterval(timer); if (st.from === 'hub') { R.showScreen('hub'); R.hub(); if (msg && R.say) R.say(msg); } else { R.backToTown(); if (msg) R.toast(msg); } };
      $('cr-next').textContent = '照好了';
      $('cr-next').onclick = () => { R.S.look = st.look; if (st.name) R.S.name = st.name; R.save(); if (R.restyleSelf) R.restyleSelf(); leave('換了個樣子。'); };
      const cx = document.createElement('button'); cx.type = 'button'; cx.className = 'btn'; cx.textContent = '不換了'; cx.onclick = () => leave(''); $('cr-next').before(cx);
      return;
    }
    $('cr-next').onclick = () => { if (!st.name) { st.name = R.randomName(st.race); } st.step = 'cls'; step(); };
  };
  const clsStep = h => {
    const g0 = R.regGroup(st.cls), d0 = R.CLASSES[st.cls];
    h.innerHTML = '<div class="creator"><div class="cr-prev"><canvas id="cr-cv" width="360" height="166"></canvas><p class="note"><b>' + esc(st.name) + '</b>・' + esc(R.RACES[st.race].name) + '</p>'
      + '<p class="note">登記：<b>' + esc(R.regName(st.cls, st.weapon)) + '</b>　公會分類：' + esc(g0.group) + '（' + esc(d0.name) + '）<br>生命 ' + d0.hp + '・魔力 ' + d0.mp + '・' + esc(d0.desc) + '<br><span style="color:var(--gold)">轉職：' + esc(R.ADV[st.cls].map(a => a.name).join('／')) + '</span></p></div>'
      + '<div class="cr-opts"><div class="reg-groups">'
      + R.REG.map(g => { const d = R.CLASSES[g.cls]; return '<div class="reg-group" style="--c:' + d.color + '"><h4>' + (R.classEmblemHTML ? R.classEmblemHTML(g.cls) : '') + esc(g.group) + '<small>' + esc(d.name) + '</small></h4><div class="reg-list">'
        + g.list.map(([w, line]) => '<button type="button" class="reg-card' + (st.cls === g.cls && st.weapon === w ? ' sel' : '') + '" data-cls="' + g.cls + '" data-w="' + w + '"><b>' + esc(R.regName(g.cls, w)) + '</b><span>' + esc(line) + '</span></button>').join('') + '</div></div>'; }).join('')
      + '</div></div></div><div class="row"><button type="button" class="btn" id="cr-back">回上一步</button><button type="button" class="btn pri" id="cr-go">登記完成，走出公會</button></div>';
    preview($('cr-cv'));
    h.querySelectorAll('[data-w]').forEach(b => { b.onclick = () => { st.cls = b.dataset.cls; st.weapon = b.dataset.w; clsStep(h); }; });
    $('cr-back').onclick = () => { st.step = 'look'; step(); };
    $('cr-go').onclick = () => {
      clearInterval(timer);
      R.S = R.freshSave(st.cls, { name: st.name, look: st.look, race: st.race });
      // 公會配給登記的那把武器（不是每一類固定的那把）
      const w = R.makeItem({ kind: 'weapon', base: st.weapon, ilvl: 1, rarity: 0, identified: true }); R.S.stash.push(w); R.S.equip[st.cls].weapon = w.id;
      R.ensureKit(st.cls); if (R.ensureWorld) R.ensureWorld();
      if (st.race === 'demon') { R.S.watched = true; R.addDeed && R.addDeed('公會東鶴分館登記了一名純魔族勇者，列為受監視對象。'); }
      R.save(); R.enterTown();
    };
  };
  // 重新捏角：名字、髮型、髮色、膚色、眼睛、衣服、披風、配件（種族要到公會重新登記）
  // o.from：'mirror' 倉庫的大鏡子、'hub' 公會登記處、'town' 街上的暫停選單
  R.restyle = o => {
    o = o || {}; if (R.W.run) { R.toast('遺跡裡不能重新捏角。'); return; }
    const S = R.S, race = S.race || 'human';
    st = { step: 'look', race, look: Object.assign(defaultLook(race), S.look || {}), name: S.name || R.randomName(race), cls: S.cls, edit: true, from: o.from || 'mirror' };
    if (R.sheetOpen && R.sheetOpen()) R.closeSheet();
    R.W.paused = true; R.showScreen('pick'); step();
    $('pick-h').textContent = '重新捏角';
    $('pick-intro').textContent = { hub: '登記處的館員遞來一張新的照片表格：「勇者證要換照片？名字、樣子都可以改，不收錢。種族要另外重新驗魔力波。」', town: '找個櫥窗照一照。名字、髮型、衣服、配件都可以改；種族要到公會重新登記。', mirror: '倉庫裡的大鏡子。名字、髮型、衣服、配件都可以改；種族要到公會重新登記。' }[st.from];
  };
  // 街上的暫停選單：多一個「重新捏角」
  const tm0 = R.townMenu;
  if (tm0) R.townMenu = () => { tm0(); const row = document.querySelector('#r-sheet .row'); if (!row) return; const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = '重新捏角'; b.onclick = () => R.restyle({ from: R.W.inside ? 'mirror' : 'town' }); row.insertBefore(b, row.children[1] || null); };
  // 玩到一半重新登記種族（公會的登記處）：一天驗一次魔力波；抽到喜歡的才付手續費，都不喜歡就不改、不收錢
  R.RACE_CHANGE_FEE = 150;
  R.changeRace = done => {
    const S = R.S, host = $('hub-sheet'), el = $('hub-modal'), old = S.race; el.hidden = false; S.raceChgDay = S.day; R.save();
    R.raceGacha(host, id => {
      el.hidden = true;
      if (id === old) { done && done('驗出來還是同一族。手續費不用付。'); return; }
      const r = R.RACES[id]; S.gold -= R.RACE_CHANGE_FEE; S.race = id; S.look = S.look || defaultLook(id);
      if (r.hairCol) S.look.hair = r.hairCol; if (!r.skins.includes(S.look.skin)) S.look.skin = r.skins[0]; S.look.eye = r.eye || '#1A1714';
      // 魔族：列為受監視對象；驗出來不是魔族了，監視也跟著撤掉
      if (id === 'demon') { S.watched = true; R.addDeed && R.addDeed('公會東鶴分館登記了一名純魔族勇者，列為受監視對象。'); } else if (S.watched) S.watched = false;
      R.addDeed && R.addDeed('勇者證的種族欄重新登記為「' + r.name + '」。');
      R.save(); if (R.restyleSelf) R.restyleSelf();
      done && done('種族重新登記為「' + r.name + '」（手續費 ' + R.RACE_CHANGE_FEE + ' 費拉）。');
    }, { title: '種族重新登記', intro: '館員翻到你的資料。「要重新驗魔力波嗎？驗完再決定要不要改種族欄。」最多抽 4 次，選一個登記，手續費 ' + R.RACE_CHANGE_FEE + ' 費拉；都不喜歡就按「先不要」，種族不變、不收錢。一天只能驗一次。', cancel: () => { el.hidden = true; done && done('種族沒有改。'); } });
  };
  // 舊存檔：補登記種族、外觀（在公會的登記處）
  R.lateRegister = done => {
    const host = $('hub-sheet'), el = $('hub-modal'); el.hidden = false;
    R.raceGacha(host, id => {
      R.S.race = id; R.S.look = R.S.look || defaultLook(id); if (R.RACES[id].hairCol) R.S.look.hair = R.RACES[id].hairCol; if (!R.RACES[id].skins.includes(R.S.look.skin)) R.S.look.skin = R.RACES[id].skins[0];
      R.S.name = R.S.name || R.randomName(id); if (id === 'demon') R.S.watched = true;
      R.save(); el.hidden = true; done && done();
    }, { ten: true, title: '補登記：種族', intro: '公會更新了勇者證的格式，要補上種族欄。五十連抽一次，從抽到的五十個裡面選一個登記。', cancel: () => { el.hidden = true; } });
  };
})(window.R);
