// 討伐令 1433：勇者登記（新的冒險）：抽種族 → 捏角（名字、外觀） → 選職業
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
    st = { step: 'race', race: null, look: null, name: '', cls: 'blade' };
    R.showScreen('pick'); step();
  };
  const step = () => {
    clearInterval(timer);
    const h = $('pick-cards');
    $('pick-h').textContent = '勇者登記・' + { race: '一、種族', look: '二、外觀', cls: '三、職業' }[st.step];
    $('pick-intro').textContent = { race: '公會東鶴分館的登記處。戴眼鏡的館員推了推眼鏡：「下一位。種族、名字、職業，一項一項來。」', look: '「勇者證上要貼照片。」館員指了指牆邊的鏡子。', cls: '「最後，職業。之後隨時可以在公會換，每個職業的等級分開算。練到 8 級、交一顆魔力核心，就能轉職。」' }[st.step];
    if (st.step === 'race') R.raceGacha(h, id => { st.race = id; st.look = defaultLook(id); st.name = R.randomName(id); st.step = 'look'; step(); });
    else if (st.step === 'look') lookStep(h);
    else clsStep(h);
  };
  const defaultLook = race => { const r = R.RACES[race]; return { hs: r.look.bald ? 'bald' : 'short', hair: r.hairCol || pick(r.hairs || HAIR), skin: pick(r.skins), eye: r.eye || '#1A1714', top: pick(CLOTH), cloak: pick(CLOTH), acc: 'none', accCol: '#C8323A' }; };

  // ---------- 預覽：正面、側面、背面，走路的樣子 ----------
  let sheet = null, sheetKey = '';
  const preview = cv => {
    const look = Object.assign({ weapon: R.STARTER[st.cls] || 'katana', shield: !!R.CLASSES[st.cls].shield, race: st.race }, st.look), k = JSON.stringify(look);
    if (k !== sheetKey) { sheet = R.heroSheetCanvas(look); sheetKey = k; }
    let t = 0;
    const draw = () => {
      const x = cv.getContext('2d'), S = 5, fr = [0, 1, 0, 2][t++ % 4];
      x.imageSmoothingEnabled = false; x.clearRect(0, 0, cv.width, cv.height);
      [0, 2, 1].forEach((dir, i) => x.drawImage(sheet, fr * 24, dir * 30, 24, 30, i * 24 * S, 0, 24 * S, 30 * S));
    };
    draw(); clearInterval(timer); timer = setInterval(() => { if (!cv.isConnected) { clearInterval(timer); return; } draw(); }, 240);
  };
  const sw = (key, list, cur, dis) => '<div class="swatches">' + list.map(c => '<button type="button" class="sw' + (c === cur ? ' on' : '') + '" data-k="' + key + '" data-v="' + c + '" style="--c:' + c + '" aria-label="' + c + '"' + (dis ? ' disabled' : '') + '></button>').join('') + '</div>';
  const chips = (key, list, cur, dis) => '<div class="chips">' + list.map(([v, n]) => '<button type="button" class="chip' + (v === cur ? ' on' : '') + '" data-k="' + key + '" data-v="' + v + '"' + (dis ? ' disabled' : '') + '>' + esc(n) + '</button>').join('') + '</div>';
  const lookStep = h => {
    const r = R.RACES[st.race], L = st.look, bald = !!r.look.bald, fixedHair = !!r.hairCol;
    h.innerHTML = '<div class="creator"><div class="cr-prev"><canvas id="cr-cv" width="360" height="150"></canvas><p class="note"><b style="color:' + R.TIERS[r.tier].color + '">' + esc(r.tier) + '・' + esc(r.name) + '</b>　' + esc(R.raceBonusText(st.race).join('・')) + '</p></div>'
      + '<div class="cr-opts">'
      + '<label class="field">名字<input id="cr-name" maxlength="12" value="' + esc(st.name) + '"><button type="button" class="mini" id="cr-rname">換一個</button></label>'
      + '<h3>髮型</h3>' + (bald ? '<p class="note">' + esc(r.name) + '沒有頭髮。</p>' : chips('hs', HS, L.hs))
      + '<h3>髮色</h3>' + (fixedHair ? '<p class="note">' + esc(r.name) + '的頭髮是天生的顏色。</p>' : sw('hair', (r.hairs || []).concat(HAIR.filter(c => !(r.hairs || []).includes(c))), L.hair, bald && !r.look.leaves))
      + '<h3>膚色</h3>' + sw('skin', r.skins, L.skin)
      + '<h3>眼睛</h3>' + sw('eye', EYES, L.eye)
      + '<h3>衣服</h3>' + sw('top', CLOTH, L.top) + '<h3>披風</h3>' + sw('cloak', CLOTH, L.cloak)
      + '<h3>配件</h3>' + chips('acc', ACC, L.acc) + (L.acc !== 'none' && L.acc !== 'glasses' && L.acc !== 'eyepatch' && L.acc !== 'earring' ? sw('accCol', ACCC, L.accCol) : '')
      + '</div></div><div class="row"><button type="button" class="btn" id="cr-rand">全部隨機</button><button type="button" class="btn pri" id="cr-next">下一步：選職業</button></div>';
    preview($('cr-cv'));
    $('cr-name').oninput = e => { st.name = e.target.value.trim(); };
    $('cr-rname').onclick = () => { st.name = R.randomName(st.race); $('cr-name').value = st.name; };
    h.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { st.look[b.dataset.k] = b.dataset.v; lookStep(h); }; });
    $('cr-rand').onclick = () => { st.look = defaultLook(st.race); if (!bald) st.look.hs = pick(HS.slice(0, 8))[0]; st.look.acc = pick(ACC)[0]; st.look.accCol = pick(ACCC); st.look.eye = r.eye || pick(EYES); st.name = R.randomName(st.race); lookStep(h); };
    if (st.edit) { $('cr-next').textContent = '照好了'; $('cr-next').onclick = () => { R.S.look = st.look; if (st.name) R.S.name = st.name; R.save(); clearInterval(timer); R.backToTown(); R.toast('換了個樣子。'); }; return; }
    $('cr-next').onclick = () => { if (!st.name) { st.name = R.randomName(st.race); } st.step = 'cls'; step(); };
  };
  const clsStep = h => {
    h.innerHTML = '<div class="creator"><div class="cr-prev"><canvas id="cr-cv" width="360" height="150"></canvas><p class="note"><b>' + esc(st.name) + '</b>・' + esc(R.RACES[st.race].name) + '</p></div><div class="cr-opts"><div class="cls-cards">'
      + R.CLASS_IDS.map(c => { const d = R.CLASSES[c]; return '<button type="button" class="cls-card' + (st.cls === c ? ' sel' : '') + '" data-cls="' + c + '" style="--c:' + d.color + '"><b>' + esc(d.name) + '</b><small>生命 ' + d.hp + '・魔力 ' + d.mp + '</small><span>' + esc(d.desc) + '</span><em>轉職：' + R.ADV[c].map(a => a.name).join('／') + '</em></button>'; }).join('')
      + '</div></div></div><div class="row"><button type="button" class="btn" id="cr-back">回上一步</button><button type="button" class="btn pri" id="cr-go">登記完成，走出公會</button></div>';
    preview($('cr-cv'));
    h.querySelectorAll('[data-cls]').forEach(b => { b.onclick = () => { st.cls = b.dataset.cls; clsStep(h); }; });
    $('cr-back').onclick = () => { st.step = 'look'; step(); };
    $('cr-go').onclick = () => {
      clearInterval(timer);
      R.S = R.freshSave(st.cls, { name: st.name, look: st.look, race: st.race });
      R.ensureKit(st.cls); if (R.ensureWorld) R.ensureWorld();
      if (st.race === 'demon') { R.S.watched = true; R.addDeed && R.addDeed('公會東鶴分館登記了一名魔族勇者，列為受監視對象。'); }
      R.save(); R.enterTown();
    };
  };
  // 倉庫的大鏡子：換髮型、衣服、配件（種族換不了）
  R.restyle = () => {
    const S = R.S, race = S.race || 'human';
    st = { step: 'look', race, look: Object.assign(defaultLook(race), S.look || {}), name: S.name || R.randomName(race), cls: S.cls, edit: true };
    R.W.paused = true; R.showScreen('pick'); step();
    $('pick-h').textContent = '照鏡子'; $('pick-intro').textContent = '倉庫裡的大鏡子。勇者證上的照片，下次登記時會換成新的樣子。';
  };
  // 舊存檔：補登記種族、外觀（在公會的登記處）
  R.lateRegister = done => {
    const host = $('hub-sheet'), el = $('hub-modal'); el.hidden = false;
    R.raceGacha(host, id => {
      R.S.race = id; R.S.look = R.S.look || defaultLook(id); if (R.RACES[id].hairCol) R.S.look.hair = R.RACES[id].hairCol; if (!R.RACES[id].skins.includes(R.S.look.skin)) R.S.look.skin = R.RACES[id].skins[0];
      R.S.name = R.S.name || R.randomName(id); if (id === 'demon') R.S.watched = true;
      R.save(); el.hidden = true; done && done();
    }, { title: '補登記：種族', intro: '公會更新了勇者證的格式，要補上種族欄。最多抽 4 次，從抽到的裡面選一個登記。', cancel: () => { el.hidden = true; } });
  };
})(window.R);
