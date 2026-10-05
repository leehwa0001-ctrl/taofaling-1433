// 管理員面板（2026-10-05 作者：管理員有些東西還是沒有，我是要能測試全部東西的帳號）
// - 只有管理員號（R.S.admin，admin.js）才看得到：畫面右邊一顆「管理」的鈕，城裡、遺跡裡都有。
// - 角色：換職業、轉職路線（舊路線也行）、二次轉職、職業等級、種族；天賦點 +50、所有技能熟練度 ★5（城裡才能改，進遺跡時套用）。
// - 東西：任何武器、防具（稀有度、強化、套裝紋、領主裝備）、飾品、護符放進倉庫；素材全部 999、費拉 +100 萬、炸藥、卷軸補滿。
// - 遺跡：任何一座遺跡直接出發（坎賽特級照設定永遠不開放）；在遺跡裡跳到第幾層、生出指定的遺跡生物、清掉這一層、回滿、
//   佩特拉的注意歸零／加滿、無敵、一下打倒（傷害 ×10000）。
// - 其他：過一天、所有劇情人物好感全滿。
// - 這些都只是測試用，不寫進更新公告（跟 admin.js 一樣）。
// 放在 admin.js 後面（index.html 最後面附近，要讀到全部的職業、裝備、遺跡生物）。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const F = { god: false, oneshot: false, noclip: false };
  const opt = (v, t, sel) => '<option value="' + esc(String(v)) + '"' + (sel ? ' selected' : '') + '>' + esc(t) + '</option>';
  const nm = (o, k) => (o && o[k] && o[k].name) || k;

  // ---------- 按鈕 ----------
  let btn = null, box = null;
  const ensureBtn = () => {
    if (btn) return btn;
    btn = document.createElement('button'); btn.type = 'button'; btn.id = 'adm-btn'; btn.textContent = '管理'; btn.title = '管理員面板（測試用）'; btn.hidden = true;
    btn.onclick = e => { e.stopPropagation(); open(); };
    document.body.appendChild(btn); return btn;
  };
  setInterval(() => { try { const s = S(), on = !!(s && s.admin && (W().town || W().run)); ensureBtn().hidden = !on; if (!on && box) box.hidden = true; } catch (e) { } }, 1000);

  // ---------- 面板 ----------
  const sec = (t, h) => '<section class="adm-sec"><h3>' + esc(t) + '</h3>' + h + '</section>';
  const html = () => {
    const s = S(), cls = s.cls, st = s.classes[cls], run = W().run, town = !!W().town && !run;
    const advs = R.ADV[cls] || [], opts2 = R.ADV2_OPTS ? R.ADV2_OPTS(cls) : [];
    let h = '<div class="adm-head"><b>管理員面板</b><small>測試用；城裡才能改角色</small><button type="button" class="mini" id="adm-x">關閉</button></div>';
    if (town) h += sec('角色', '<div class="adm-row"><label>職業<select id="adm-cls">' + R.CLASS_IDS.map(c => opt(c, R.CLASSES[c].name, c === cls)).join('') + '</select></label>'
      + '<label>轉職路線<select id="adm-adv">' + opt('', '（還沒轉職）', !st.adv) + advs.map(a => opt(a.id, a.name + (a.legacy ? '（舊路線）' : ''), a.id === st.adv)).join('') + '</select></label>'
      + '<label>二次轉職<select id="adm-adv2">' + opt('', '（沒有）', !st.adv2) + opts2.map(o => opt(o.id, o.name, o.id === st.adv2)).join('') + '</select></label>'
      + '<label>等級<input id="adm-lv" type="number" min="1" max="' + (R.LV_CAP || 80) + '" value="' + st.lv + '" style="width:4.5em"></label>'
      + '<button type="button" class="btn pri" id="adm-cls-go">套用</button></div>'
      + '<div class="adm-row"><label>種族<select id="adm-race">' + Object.keys(R.RACES).map(k => opt(k, R.RACES[k].name + '（' + (R.RACES[k].tier || '') + '）', k === s.race)).join('') + '</select></label><button type="button" class="btn" id="adm-race-go">換種族</button>'
      + '<button type="button" class="btn" id="adm-tal">天賦點 +50</button><button type="button" class="btn" id="adm-star">技能熟練度全 ★5</button></div>');
    h += sec('東西', '<div class="adm-row"><label>種類<select id="adm-kind">' + opt('weapon', '武器') + opt('armor', '防具') + opt('acc', '飾品') + opt('charm', '護符') + '</select></label>'
      + '<label>底<select id="adm-base"></select></label>'
      + '<label>稀有度<select id="adm-rar">' + (R.RARITY || []).map((r, i) => opt(i, r.name, i === 5)).join('') + '</select></label>'
      + '<label>強化<input id="adm-plus" type="number" min="0" max="15" value="0" style="width:4em"></label>'
      + '<label>套裝紋<select id="adm-set">' + opt('', '（沒有）') + Object.keys(R.SETS || {}).map(k => opt(k, R.SETS[k].name)).join('') + '</select></label>'
      + '<label>領主裝備<select id="adm-lord">' + opt('', '（不是）') + Object.keys(R.LORD_GEAR || {}).map(k => opt(k, (R.ENEMIES[k] ? R.ENEMIES[k].name : k))).join('') + '</select></label>'
      + '<button type="button" class="btn pri" id="adm-item">放進倉庫</button></div>'
      + '<div class="adm-row"><button type="button" class="btn" id="adm-gold">費拉 +100 萬</button><button type="button" class="btn" id="adm-mats">素材全部 999</button><button type="button" class="btn" id="adm-kit">藥水、炸藥、卷軸補滿</button><button type="button" class="btn" id="adm-all">再跑一次「全部解鎖」</button></div>');
    if (town) h += sec('遺跡', '<div class="adm-row"><label>直接出發<select id="adm-site">' + R.SITES.filter(x => (x.kind === 'ruin' || x.kind === 'hunt' || x.kind === 'forbidden') && x.grade !== 'kansait').map(x => opt(x.id, (R.gradeById(x.grade) ? R.gradeById(x.grade).name + '・' : '') + x.name)).join('') + '</select></label><button type="button" class="btn pri" id="adm-go">出發</button></div>');
    if (run) h += sec('這一趟', '<div class="adm-row"><label>跳到第<input id="adm-floor" type="number" min="1" max="' + run.floors + '" value="' + (run.floor + 1) + '" style="width:4em">層（共 ' + run.floors + ' 層）</label><button type="button" class="btn pri" id="adm-floor-go">跳</button>'
      + '<button type="button" class="btn" id="adm-clear">清掉這一層的遺跡生物</button><button type="button" class="btn" id="adm-heal">回滿</button>'
      + '<button type="button" class="btn" id="adm-aw0">注意歸零</button><button type="button" class="btn" id="adm-aw100">注意加滿</button></div>'
      + '<div class="adm-row"><button type="button" class="btn" id="adm-tp-down">傳送到下樓的樓梯</button><button type="button" class="btn" id="adm-tp-out">傳送到出口（回歸水晶／入口）</button><small style="opacity:.7">遇到生成擋住路、卡在牆裡用；也可以勾下面的「穿牆」</small></div>'
      + '<div class="adm-row"><label>生出<select id="adm-foe">' + Object.keys(R.ENEMIES).filter(k => !R.ENEMIES[k].human).sort((a, b) => String(R.ENEMIES[a].name || a).localeCompare(String(R.ENEMIES[b].name || b), 'zh-Hant')).map(k => opt(k, (R.ENEMIES[k].name || k) + '（' + k + '）')).join('') + '</select></label>'
      + '<label>幾隻<input id="adm-n" type="number" min="1" max="20" value="1" style="width:3.5em"></label><label class="adm-chk"><input type="checkbox" id="adm-var">異變（領主體才有）</label><button type="button" class="btn pri" id="adm-spawn">生在準心那裡</button></div>');
    h += sec('開關', '<div class="adm-row"><label class="adm-chk"><input type="checkbox" id="adm-god"' + (F.god ? ' checked' : '') + '>無敵</label><label class="adm-chk"><input type="checkbox" id="adm-one"' + (F.oneshot ? ' checked' : '') + '>一下打倒（傷害 ×10000）</label><label class="adm-chk"><input type="checkbox" id="adm-clip"' + (F.noclip ? ' checked' : '') + '>穿牆</label>'
      + (town ? '<button type="button" class="btn" id="adm-day">過一天</button><button type="button" class="btn" id="adm-aff">劇情人物好感全滿</button>' : '') + '</div>');
    return h;
  };
  const baseList = kind => kind === 'weapon' ? Object.keys(R.WEAPONS).map(k => [k, nm(R.WEAPONS, k)]) : kind === 'armor' ? Object.keys(R.ARMOR).map(k => [k, nm(R.ARMOR, k)]) : kind === 'acc' ? Object.keys(R.ACC || {}).map(k => [k, nm(R.ACC, k)]) : [['charm', '護符']].concat(Object.keys(R.CHARM2 || {}).map(k => [k, nm(R.CHARM2, k)]));
  const fillBase = () => { const k = $('adm-kind'), b = $('adm-base'); if (!k || !b) return; b.innerHTML = baseList(k.value).map(([v, t]) => opt(v, t)).join(''); };
  const toast = (t, c) => R.toast && R.toast(t, c || '#FF7A7A');
  const open = () => {
    if (!box) { box = document.createElement('div'); box.id = 'adm-box'; document.body.appendChild(box); box.addEventListener('pointerdown', e => e.stopPropagation()); box.addEventListener('keydown', e => e.stopPropagation()); }
    try { box.innerHTML = html(); } catch (e) { console.warn('[admin]', e); box.innerHTML = '<p>管理員面板出錯了：' + esc(e.message) + '</p><button type="button" class="mini" id="adm-x">關閉</button>'; }
    box.hidden = false; bind(); fillBase();
  };
  const close = () => { if (box) box.hidden = true; };
  const on = (id, f) => { const el = $(id); if (el) el.onclick = () => { try { f(); } catch (e) { console.warn('[admin]', e); toast('出錯了：' + e.message); } }; };
  const bind = () => {
    const s = S();
    on('adm-x', close);
    const k = $('adm-kind'); if (k) k.onchange = fillBase;
    const c = $('adm-cls'); if (c) c.onchange = () => { s.cls = c.value; R.ensureKit && R.ensureKit(s.cls); open(); };
    on('adm-cls-go', () => {
      const cls = $('adm-cls').value, st = s.classes[cls]; s.cls = cls; R.ensureKit && R.ensureKit(cls);
      st.adv = $('adm-adv').value || null; st.adv2 = $('adm-adv2').value || null; st.lv = Math.max(1, Math.min(R.LV_CAP || 80, +$('adm-lv').value || 1)); st.trial = 2; st.trial2 = 2;
      if (st.adv2) { st.t2 = st.t2 || {}; st.t2[st.adv2] = { done: 1 }; }
      R.save(); toast('職業：' + (R.clsName ? R.clsName(cls) : cls) + ' Lv ' + st.lv, '#7FE0FF'); if (R.restyleSelf) R.restyleSelf(); open();
    });
    on('adm-race-go', () => { const id = $('adm-race').value; if (R.applyRace) R.applyRace(id); else s.race = id; R.save(); toast('種族：' + R.RACES[id].name, '#7FE0FF'); });
    on('adm-tal', () => { const st = s.classes[s.cls]; st.spBonus = (st.spBonus || 0) + 50; R.save(); toast('天賦點 +50', '#7FE0FF'); });
    on('adm-star', () => { const st = s.classes[s.cls], PROF = R.SKILL_PROF || [20, 60, 140, 260, 450]; st.sp = st.sp || { r: {}, t: {} }; st.sp.r = st.sp.r || {}; st.sp.u = st.sp.u || {}; Object.values(R.SKILL_LIB || {}).forEach(x => { if (x.cls === s.cls) { st.sp.r[x.id] = 5; st.sp.u[x.id] = PROF[PROF.length - 1]; } }); (R.skillsLearned ? R.skillsLearned(s.cls) : []).forEach(id => { st.sp.r[id] = 5; st.sp.u[id] = PROF[PROF.length - 1]; }); R.save(); toast('技能熟練度全 ★5', '#7FE0FF'); });
    on('adm-item', () => {
      const kind = $('adm-kind').value, base = $('adm-base').value, rarity = +$('adm-rar').value || 0, plus = Math.max(0, Math.min(15, +$('adm-plus').value || 0));
      const it = R.makeItem({ kind, base, ilvl: R.LV_CAP || 80, rarity, identified: true }); if (!it) return;
      if (plus) it.plus = plus;
      const set = $('adm-set').value; if (set && kind === 'armor') it.set = set;
      const lord = $('adm-lord').value; if (lord && R.LORD_GEAR[lord]) { it.lord = lord; }
      if (R.GEMS && it.rarity >= 2) it.sockets = it.sockets || [];
      s.stash.push(it); R.save(); toast('放進倉庫：' + R.itemName(it), '#E8C04A');
    });
    on('adm-gold', () => { s.gold += 1000000; R.save(); toast('費拉 +100 萬', '#E8C04A'); });
    on('adm-mats', () => { Object.keys(R.MATS).forEach(m => { s.mats[m] = Math.max(s.mats[m] || 0, 999); }); R.save(); toast('素材全部 999', '#E8C04A'); });
    on('adm-kit', () => { s.potions.hp = Math.max(s.potions.hp || 0, 999); s.potions.mp = Math.max(s.potions.mp || 0, 999); Object.values(R.BOMB_TYPES || {}).forEach(b => { s[b.key] = Math.max(s[b.key] || 0, b.max || 5); }); s.scrolls = Math.max(s.scrolls || 0, 60); R.save(); toast('藥水、炸藥、卷軸補滿', '#E8C04A'); });
    on('adm-all', () => { R.makeAdmin && R.makeAdmin(); toast('全部解鎖又跑了一次（倉庫補上還沒有的藍、紫、金、紅裝）', '#E8C04A'); });
    on('adm-go', () => { const id = $('adm-site').value; if (!id) return; close(); s.kasoAuth = s.kasoAuth || (s.day || 0) + 1; R.startRun(id); });
    on('adm-floor-go', () => { const run = W().run, n = Math.max(1, Math.min(run.floors, +$('adm-floor').value || 1)); close(); R.fade ? R.fade(() => R.loadFloor(n - 1, { netFollow: true })) : R.loadFloor(n - 1, { netFollow: true }); });
    on('adm-clear', () => { W().enemies.forEach(e => { if (!e.dead) R.killEnemy(e); }); toast('這一層的遺跡生物都倒了', '#7FE0FF'); });
    on('adm-heal', () => { const P = W().P; P.hp = P.hpMax; P.mp = P.mpMax; P.dead = false; P.ult = 100; toast('回滿（大招也滿了）', '#7FE0FF'); });
    on('adm-aw0', () => { W().run.aware = 0; toast('佩特拉的注意歸零', '#7FE0FF'); });
    on('adm-aw100', () => { const run = W().run; if (R.addAware) R.addAware(100 - run.aware, 'admin'); else run.aware = 100; toast('佩特拉的注意加滿', '#7FE0FF'); });
    on('adm-spawn', () => {
      const id = $('adm-foe').value, n = Math.max(1, Math.min(20, +$('adm-n').value || 1)), P = W().P, x0 = P.aimX != null ? P.aimX : P.x, z0 = P.aimZ != null ? P.aimZ : P.z - 4;
      for (let i = 0; i < n; i++) { const [x, z] = R.nearestFloor ? R.nearestFloor(x0 + (Math.random() - 0.5) * 2, z0 + (Math.random() - 0.5) * 2) : [x0, z0]; const e = R.spawnEnemy(id, x, z, -1, { aggro: true, noVariant: true }); if (e) { e.dormant = false; e.aggro = true; if ($('adm-var') && $('adm-var').checked && R.lordVariant) R.lordVariant(e); } }
      toast('生出了 ' + R.ENEMIES[id].name + ' ×' + n, '#7FE0FF');
    });
    const g = $('adm-god'); if (g) g.onchange = () => { F.god = g.checked; };
    const o = $('adm-one'); if (o) o.onchange = () => { F.oneshot = o.checked; };
    const cl = $('adm-clip'); if (cl) cl.onchange = () => { F.noclip = cl.checked; };
    // 傳送（2026-10-05 作者：遺跡生成錯亂擋到路的時候，管理員要能脫困）
    const tp = (x, z, what) => { const P = W().P; if (!P) return; const [x1, z1] = R.nearestFloor ? R.nearestFloor(x, z) : [x, z]; P.x = x1; P.z = z1; P.h && P.h.g.position.set(x1, 0, z1); close(); toast('傳送到' + what, '#7FE0FF'); };
    on('adm-tp-down', () => { const F2 = W().F, st = F2 && F2.stairs; if (!st) { toast('這一層沒有下樓的樓梯（最後一層？）'); return; } tp(st.x + 1.6, st.z + 1.6, '下樓的樓梯'); });
    on('adm-tp-out', () => { const F2 = W().F, P = W().P, c = (F2.crystals || []).slice().sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0]; if (c) { tp(c.x + 1.8, c.z + 1.8, '回歸水晶'); return; } if (F2.up) { tp(F2.up.x + 1.6, F2.up.z + 1.6, F2.up.exit ? '入口' : '上樓的樓梯'); return; } toast('這一層找不到出口'); });
    on('adm-day', () => { R.advanceDays && R.advanceDays(1); R.save(); toast('過了一天', '#7FE0FF'); });
    on('adm-aff', () => { s.aff = s.aff || {}; Object.keys(R.PEOPLE || {}).forEach(id => { s.aff[id] = 10; }); R.save(); toast('劇情人物好感全滿', '#7FE0FF'); });
  };

  // ---------- 無敵、一下打倒 ----------
  const adm = () => { const s = S(); return !!(s && s.admin); };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => (F.god && adm() ? undefined : hp0(raw, src, o));
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => he0(e, F.oneshot && adm() ? raw * 10000 : raw, o);
  // 穿牆：自己不被牆推出去（遺跡生物照舊）
  const col0 = R.collide;
  R.collide = (p, r) => (F.noclip && p && p === W().P && adm() ? false : col0(p, r));

  const css = document.createElement('style');
  css.textContent = '#adm-btn{position:fixed;right:8px;top:46%;z-index:40;padding:6px 8px;border-radius:8px;border:1px solid #FF7A7A;background:rgba(40,10,10,.85);color:#FFB0A0;font-weight:bold;font-size:12px;cursor:pointer}'
    + '#adm-box{position:fixed;inset:5vh max(16px,calc(50vw - 380px));z-index:9500;overflow:auto;background:rgba(18,14,12,.97);border:1px solid #FF7A7A;border-radius:12px;padding:12px 14px;color:#F1E9DA;font-size:13px}'
    + '.adm-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}.adm-head b{color:#FF9A8A;font-size:16px}.adm-head small{opacity:.7;flex:1}'
    + '.adm-sec h3{margin:10px 0 6px;font-size:14px;color:#E8C04A}.adm-row{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:4px 0}.adm-row label{display:flex;gap:4px;align-items:center}.adm-row select{max-width:260px}.adm-chk input{margin:0}';
  document.head.appendChild(css);
})(window.R);
