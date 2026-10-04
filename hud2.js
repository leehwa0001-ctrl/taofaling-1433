// HUD 改版（作者：按鍵在旁邊有點簡陋，參考《飢荒》、Minecraft 或其他 2.5D 地牢遊戲；技能鈕沒亮起來）——只改電腦版，手機版照舊
// - 下面中間：Minecraft 那樣的快捷欄（技能 R、3、4、翻滾、回復藥、魔力藥、背包、指揮），每一格有點陣圖示、按鍵、冷卻的扇形和秒數、藥水的數量。
//   能放的技能整格亮起來（金框、發光）；冷卻中變暗；魔力不夠變藍。
// - 快捷欄兩邊：《飢荒》那樣的圓形生命、魔力表（被打有白色殘影、護盾是外圈的白環）；上面一條綠色的經驗條、中間寫等級。
// - 左下原本的大面板縮成小卡片（頭像、名字、狀態、武器）；生命魔力條藏起來（數字移到圓表上）。
// 原本的按鈕、數字的更新都照舊（hud.js、battlehud.js、skills.js、keybinds.js），這裡只搬位置、加圖示和亮不亮。放在 battlehud.js、skillpoints.js 後面。
(function (R) {
  const W = R.W, $ = id => document.getElementById(id);
  let built = false, hpT = 1, hpHold = 0, mpT = 1, lastHp = -1, slow = 0;

  // ---------- 圖示（16×16 點陣） ----------
  const ICON_OF = {
    roll: 'dash', volley: 'rain', whirl: 'spin', fireball: 'fire', heal: 'heal', flash: 'dash', charge: 'dash', snipe: 'shot', element: 'shot', grenade: 'boom', homing: 'shot', trap: 'trap', hamaya: 'shot', rage: 'buff', combo: 'spin', qijin: 'nova', meteor: 'boom', hex: 'curse', shiki: 'spirit', sanctuary: 'heal', wild: 'leaf', kekkai: 'guard', iai: 'slash', shadowstep: 'blink', yotoRelease: 'nova', fortress: 'guard', holycharge: 'dash', jump: 'jump',
    flashbang: 'boom', barrage: 'shot', pin: 'shot', leap: 'dash', quake: 'nova', warcry: 'buff', frostnova: 'ice', chain: 'bolt', smite: 'pillar', ward: 'guard', flurry: 'slash', parry: 'guard', shieldbash: 'guard', guard: 'guard'
  };
  const TYPE_ICON = { shots: 'shot', shotx: 'shot', boomer: 'spin', beam: 'beam', turret: 'turret', wave: 'wave', breath: 'fire', storm: 'bolt', chainx: 'bolt', chain: 'bolt', hook: 'hook', dance: 'blink', aura: 'nova', guard: 'guard', reload: 'shot', jumpx: 'jump', xslash: 'slash', at: 'boom', line: 'slash', arc: 'slash', dash: 'dash', blink: 'blink', buff: 'buff', heal: 'heal', zone: 'trap', mark: 'curse', pull: 'curse', drain: 'heal', nova: 'nova', orbit: 'spirit', parry: 'guard' };
  const iconFor = id => { if (!id) return 'none'; const s = R.SKILL_LIB && R.SKILL_LIB[id]; if (s) { const t = s.type === 'combo' ? s.p.parts[0][0] : s.type; return TYPE_ICON[t] || 'star'; } return ICON_OF[id] || 'star'; };
  const cache = {};
  const icon = k => {
    if (cache[k]) return cache[k];
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
    const P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const ln = (x0, y0, x1, y1, col, w) => { x.strokeStyle = col; x.lineWidth = w || 1.5; x.lineCap = 'square'; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
    const circ = (a, b, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
    const arc = (a, b, r, s0, s1, col, w) => { x.strokeStyle = col; x.lineWidth = w || 2; x.beginPath(); x.arc(a, b, r, s0, s1); x.stroke(); };
    switch (k) {
      case 'hp': P(6, 1, 4, 2, '#C8C0B0'); P(5, 3, 6, 2, '#E8E0D0'); circ(8, 10, 5, '#E8E0D0'); circ(8, 10, 4, '#D83A3A'); P(6, 8, 2, 2, '#FF9A9A'); break;
      case 'mp': P(6, 1, 4, 2, '#C8C0B0'); P(5, 3, 6, 2, '#E8E0D0'); circ(8, 10, 5, '#E8E0D0'); circ(8, 10, 4, '#3A6ADA'); P(6, 8, 2, 2, '#9ABAFF'); break;
      case 'bag': P(3, 5, 10, 9, '#8A5A34'); P(3, 5, 10, 2, '#A87A4A'); P(5, 2, 6, 3, '#6A4428'); P(7, 8, 2, 3, '#E8C04A'); break;
      case 'order': ln(4, 2, 4, 15, '#C8C0B0', 1.5); P(5, 2, 8, 6, '#C8323A'); P(5, 7, 6, 1, '#8A2228'); break;
      case 'dash': ln(2, 5, 8, 5, '#BFE8FF'); ln(1, 9, 9, 9, '#BFE8FF'); ln(3, 13, 8, 13, '#BFE8FF'); P(9, 6, 5, 7, '#C8A06A'); P(9, 11, 6, 2, '#6A4A2E'); break;
      case 'shot': ln(2, 14, 12, 4, '#E8D8B8', 2); x.fillStyle = '#FFE08A'; x.beginPath(); x.moveTo(14, 2); x.lineTo(9, 4); x.lineTo(12, 7); x.fill(); P(1, 13, 3, 2, '#8A6A44'); break;
      case 'slash': arc(4, 12, 10, -1.4, -0.1, '#FFFFFF', 2.5); arc(4, 12, 7, -1.3, -0.2, '#9ACCFF', 1.5); break;
      case 'spin': arc(8, 8, 5, 0.3, 5.6, '#FFC87A', 2.5); x.fillStyle = '#FFC87A'; x.beginPath(); x.moveTo(13, 6); x.lineTo(15, 10); x.lineTo(10, 10); x.fill(); break;
      case 'blink': [[8, 2], [8, 14], [2, 8], [14, 8]].forEach(([a, b]) => ln(8, 8, a, b, '#C8A0FF', 1.5)); circ(8, 8, 2.5, '#FFFFFF'); P(3, 3, 1, 1, '#C8A0FF'); P(12, 12, 1, 1, '#C8A0FF'); break;
      case 'buff': x.fillStyle = '#E8C04A'; x.beginPath(); x.moveTo(8, 1); x.lineTo(14, 8); x.lineTo(10, 8); x.lineTo(10, 15); x.lineTo(6, 15); x.lineTo(6, 8); x.lineTo(2, 8); x.fill(); break;
      case 'heal': P(6, 2, 4, 12, '#6FD36A'); P(2, 6, 12, 4, '#6FD36A'); P(7, 3, 2, 10, '#B8F0B0'); break;
      case 'guard': x.fillStyle = '#C9A13A'; x.beginPath(); x.moveTo(2, 2); x.lineTo(14, 2); x.lineTo(14, 8); x.lineTo(8, 15); x.lineTo(2, 8); x.fill(); x.fillStyle = '#6A7A8A'; x.beginPath(); x.moveTo(4, 4); x.lineTo(12, 4); x.lineTo(12, 8); x.lineTo(8, 12); x.lineTo(4, 8); x.fill(); break;
      case 'trap': P(2, 12, 12, 2, '#8A8A92'); for (let i = 0; i < 5; i++) { x.fillStyle = '#C8C8D0'; x.beginPath(); x.moveTo(2 + i * 2.5, 12); x.lineTo(3.2 + i * 2.5, 5); x.lineTo(4.5 + i * 2.5, 12); x.fill(); } break;
      case 'curse': x.fillStyle = '#9A4ACF'; x.beginPath(); x.ellipse(8, 8, 7, 4, 0, 0, 7); x.fill(); circ(8, 8, 2.6, '#F2E8FF'); circ(8, 8, 1.3, '#2A1440'); break;
      case 'nova': [0, 1, 2, 3, 4, 5, 6, 7].forEach(i => { const a = i * Math.PI / 4; ln(8 + Math.cos(a) * 3, 8 + Math.sin(a) * 3, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, '#BFE8FF', 1.5); }); circ(8, 8, 2.5, '#FFFFFF'); break;
      case 'boom': circ(8, 9, 6, '#FF8A3A'); circ(8, 9, 4, '#FFD06A'); circ(8, 9, 2, '#FFFFFF'); P(7, 1, 2, 3, '#FF8A3A'); break;
      case 'fire': x.fillStyle = '#FF6A2A'; x.beginPath(); x.moveTo(8, 1); x.quadraticCurveTo(15, 9, 8, 15); x.quadraticCurveTo(1, 9, 8, 1); x.fill(); x.fillStyle = '#FFD06A'; x.beginPath(); x.moveTo(8, 6); x.quadraticCurveTo(12, 11, 8, 14); x.quadraticCurveTo(4, 11, 8, 6); x.fill(); break;
      case 'ice': [0, 1, 2].forEach(i => { const a = i * Math.PI / 3; ln(8 - Math.cos(a) * 7, 8 - Math.sin(a) * 7, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, '#BFE6FF', 2); }); circ(8, 8, 1.5, '#FFFFFF'); break;
      case 'bolt': x.fillStyle = '#FFE070'; x.beginPath(); x.moveTo(10, 1); x.lineTo(3, 9); x.lineTo(8, 9); x.lineTo(6, 15); x.lineTo(13, 6); x.lineTo(8, 6); x.fill(); break;
      case 'beam': ln(1, 14, 15, 2, '#BFE8FF', 3); ln(1, 14, 15, 2, '#FFFFFF', 1); circ(2, 13, 2, '#9AD8FF'); break;
      case 'turret': P(4, 11, 8, 4, '#5A5C62'); P(5, 6, 6, 5, '#4A6A8A'); P(10, 7, 5, 2, '#3A3C42'); circ(8, 8, 1.2, '#FFE08A'); break;
      case 'wave': [4, 8, 12].forEach(y => { x.strokeStyle = '#9AD8FF'; x.lineWidth = 1.5; x.beginPath(); for (let i = 0; i <= 14; i++) x.lineTo(1 + i, y + Math.sin(i * 0.9) * 1.6); x.stroke(); }); break;
      case 'hook': arc(9, 10, 4, 0, Math.PI * 1.1, '#C8C8D0', 2); ln(13, 10, 13, 2, '#C8C8D0', 2); ln(2, 4, 13, 2, '#8A6A44', 1); break;
      case 'jump': x.fillStyle = '#9AD8FF'; x.beginPath(); x.moveTo(8, 1); x.lineTo(13, 7); x.lineTo(3, 7); x.fill(); P(7, 7, 2, 5, '#9AD8FF'); P(3, 13, 10, 2, '#C8A06A'); break;
      case 'spirit': P(4, 3, 8, 11, '#F4EEDC'); P(5, 5, 6, 1, '#B83A2E'); P(7, 7, 2, 5, '#B83A2E'); break;
      case 'rain': [3, 7, 11].forEach((a, i) => { ln(a, 2 + i, a + 2, 12 + i, '#E8D8B8', 1.5); P(a + 1, 12 + i, 2, 2, '#C8C8D0'); }); break;
      case 'pillar': P(6, 0, 4, 16, '#FFE8A0'); P(7, 0, 2, 16, '#FFFFFF'); P(3, 13, 10, 2, '#FFE8A0'); break;
      case 'leaf': x.fillStyle = '#6FB36A'; x.beginPath(); x.ellipse(8, 8, 3.5, 7, 0.7, 0, 7); x.fill(); ln(4, 13, 12, 3, '#3E7A48', 1); break;
      case 'none': break;
      default: x.fillStyle = '#E8C04A'; x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3 : 7; x.lineTo(8 + Math.cos(a) * r, 8 + Math.sin(a) * r); } x.fill();
    }
    // 描邊
    const img = x.getImageData(0, 0, 16, 16), d = img.data, s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) { if (d[i * 4 + 3] >= 100) { d[i * 4 + 3] = 255; s[i] = 1; } else d[i * 4 + 3] = 0; }
    for (let i = 0; i < 256; i++) { if (s[i]) continue; const px = i % 16, py = (i - px) / 16; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const qx = px + a, qy = py + b; return qx >= 0 && qy >= 0 && qx < 16 && qy < 16 && s[qy * 16 + qx]; })) { d[i * 4] = 14; d[i * 4 + 1] = 10; d[i * 4 + 2] = 16; d[i * 4 + 3] = 255; } }
    x.putImageData(img, 0, 0);
    return (cache[k] = c.toDataURL());
  };
  R.skillIconURL = id => icon(iconFor(id));   // 技能點畫面（talentui.js）也用同一套圖示

  // ---------- 搭起來：快捷欄、圓表、經驗條 ----------
  const build = () => {
    const br = $('r-br'), run = $('run'); if (!br || !run || built) return; built = true;
    const dock = document.createElement('div'); dock.id = 'h2-dock'; dock.className = 'hud';
    dock.innerHTML = '<div class="h2-badge hp" id="h2-hp"><i class="h2-ring"></i><i class="h2-trail"></i><i class="h2-sh"></i><span class="h2-core"><img alt="" src="' + icon('hp') + '"><b id="h2-hp-n"></b></span></div>'
      + '<div class="h2-mid"><div class="h2-xp"><i id="h2-xp"></i><b id="h2-lv"></b></div></div>'
      + '<div class="h2-badge mp" id="h2-mp"><i class="h2-ring"></i><i class="h2-trail"></i><span class="h2-core"><img alt="" src="' + icon('mp') + '"><b id="h2-mp-n"></b></span></div>';
    br.parentNode.insertBefore(dock, br); dock.querySelector('.h2-mid').appendChild(br);
    // 魔力藥的格子（原本只有按鍵 2）
    if (!br.querySelector('[data-h2="mp"]')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'act dungeon-only h2-only'; b.dataset.h2 = 'mp'; b.innerHTML = '魔力藥<kbd>2</kbd>'; b.onclick = () => R.drink && R.drink('mp'); br.appendChild(b); }
    // 每一格：圖示、數量；直接寫在按鈕裡的字（回復藥、背包……）包成 span，才能縮小放在下面
    br.querySelectorAll('.act').forEach(b => [...b.childNodes].forEach(nd => { if (nd.nodeType === 3 && nd.textContent.trim()) { const s = document.createElement('span'); s.textContent = nd.textContent.trim(); b.replaceChild(s, nd); } }));
    br.querySelectorAll('.act').forEach(b => { if (b.querySelector('.h2-ic')) return; const im = document.createElement('img'); im.className = 'h2-ic'; im.alt = ''; b.insertBefore(im, b.firstChild); const n = document.createElement('i'); n.className = 'h2-n'; b.appendChild(n); });
    const fixed = { hp: 'hp', mp: 'mp', bag: 'bag', order: 'order', dodge: 'dash' };
    br.querySelectorAll('.act').forEach(b => { const k = fixed[b.dataset.tact] || fixed[b.dataset.h2]; if (k) b.querySelector('.h2-ic').src = icon(k); });
  };

  const setF = (el, v, prop) => { if (el) el.style.setProperty(prop || '--f', Math.max(0, Math.min(1, v)).toFixed(3)); };
  const t0 = R.hudTick;
  R.hudTick = dt => {
    t0(dt);
    const P = W.P, run = W.run; if (!P || !run) return;
    if (!built) build();
    // 圓表：生命（殘影晚一點退）、魔力、護盾
    const hp = Math.max(0, P.hp / P.hpMax), mp = Math.max(0, P.mp / P.mpMax);
    if (hp < hpT) { hpHold -= dt; if (hpHold <= 0) hpT = Math.max(hp, hpT - dt * 0.6); } else { hpT = hp; hpHold = 0.45; }
    if (lastHp >= 0 && P.hp < lastHp - 0.5) hpHold = 0.45; lastHp = P.hp;
    mpT = mp > mpT ? mp : Math.max(mp, mpT - dt * 0.8);
    const bh = $('h2-hp'), bm = $('h2-mp');
    if (bh) { setF(bh, hp); setF(bh, hpT, '--t'); setF(bh, P.shield > 0 ? Math.min(1, P.shield / P.hpMax) : 0, '--s'); bh.classList.toggle('low', hp > 0 && hp < 0.3); const n = $('h2-hp-n'); const v = Math.ceil(P.hp); if (n && n.textContent !== String(v)) n.textContent = v; }
    if (bm) { setF(bm, mp); setF(bm, mpT, '--t'); const n = $('h2-mp-n'); const v = Math.floor(P.mp); if (n && n.textContent !== String(v)) n.textContent = v; }
    // 快捷欄：技能的圖示、亮不亮
    const S = R.S, slots = [['r-skill', 0], ['r-skill2', 1], ['r-skill3', 2], ['r-skill4', 3], ['r-skill5', 4]];
    slots.forEach(([id, i]) => {
      const b = $(id); if (!b) return; const sid = R.slotSkill ? R.slotSkill(P, i) : (i ? null : P.skill), sk = sid && R.SKILLS[sid];
      const cd = i === 0 ? P.skillCd : (P.skCd && P.skCd[i]) || 0, ic = b.querySelector('.h2-ic'), k = iconFor(sid);
      if (ic && ic.dataset.k !== k) { ic.dataset.k = k; ic.src = icon(k); }
      b.classList.toggle('lit', !!sk && cd <= 0.05 && P.mp >= sk.mp && !P.dead);
      const r = sid && R.skillRank ? R.skillRank(sid) : 0, n = b.querySelector('.h2-n'); if (n) { const t = r ? '★' + r : ''; if (n.textContent !== t) n.textContent = t; }
    });
    const dg = document.querySelector('#r-br [data-tact="dodge"]'); if (dg) dg.classList.toggle('lit', !(P.dodgeCd > 0.05) && !P.dead);
    const pot = (sel, k) => { const b = document.querySelector('#r-br ' + sel); if (!b) return; const c = (S.potions && S.potions[k]) || 0, n = b.querySelector('.h2-n'); if (n && n.textContent !== '×' + c) n.textContent = '×' + c; b.classList.toggle('lit', c > 0); b.classList.toggle('empty', !c); };
    pot('[data-tact="hp"]', 'hp'); pot('[data-h2="mp"]', 'mp');
    // 經驗條（每 0.2 秒）
    slow += dt; if (slow < 0.2) return; slow = 0;
    const st = S.classes[S.cls]; const need = R.xpNeed(st.lv); setF($('h2-xp'), need ? st.xp / need : 0); const lv = $('h2-lv'); if (lv) { const t = String(st.lv); if (lv.textContent !== t) lv.textContent = t; }
  };
  const f0 = R.hudFloor;
  R.hudFloor = () => { f0(); if (!built) build(); lastHp = -1; hpT = 1; mpT = 1; };

  // ---------- 樣式：只改電腦版 ----------
  const css = document.createElement('style');
  css.textContent = [
    'body.touch #h2-dock{display:contents}body.touch .h2-badge,body.touch .h2-xp,body.touch .h2-only,body.touch .h2-ic,body.touch .h2-n{display:none!important}',
    '#run.town #h2-dock .h2-badge,#run.town .h2-xp{display:none}body:not(.touch) #run.town #r-br{display:none}',
    'body:not(.touch) #h2-dock{position:fixed;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:flex-end;gap:10px;z-index:6;pointer-events:none}',
    'body:not(.touch) #h2-dock>*{pointer-events:auto}',
    'body:not(.touch) .h2-mid{display:grid;gap:4px;justify-items:center}',
    // 快捷欄
    'body:not(.touch) #r-br{position:static;display:flex;gap:3px;padding:4px;background:rgba(18,14,12,.86);border:2px solid #4A3E34;box-shadow:inset 0 0 0 1px #0E0A08,0 4px 14px rgba(0,0,0,.5);border-radius:6px}',
    'body:not(.touch) #r-br .act{width:56px;height:56px;border-radius:4px;background:linear-gradient(#2E2620,#1E1814);border:2px solid #3E342C;box-shadow:inset 2px 2px 0 rgba(255,255,255,.06),inset -2px -2px 0 rgba(0,0,0,.45);padding:0;display:block;font-size:0;transition:border-color .15s,box-shadow .15s,filter .15s}',
    'body:not(.touch) #r-br .act.big{width:64px;height:64px}body:not(.touch) #r-br .act.touch-only{display:none}',
    'body:not(.touch) #r-br [data-tact="skill"]{order:1}body:not(.touch) #r-br [data-tact="skill2"]{order:2}body:not(.touch) #r-br [data-tact="skill3"]{order:3}body:not(.touch) #r-br [data-tact="skill4"],body:not(.touch) #r-br [data-tact="skill5"]{order:3}body:not(.touch) #r-br [data-tact="dodge"]{order:4;margin-right:8px}body:not(.touch) #r-br [data-tact="hp"]{order:5}body:not(.touch) #r-br [data-h2="mp"]{order:6;margin-right:8px}body:not(.touch) #r-br [data-tact="bag"]{order:7}body:not(.touch) #r-br [data-tact="order"]{order:8}',
    'body:not(.touch) #r-br .h2-ic{position:absolute;left:50%;top:44%;width:32px;height:32px;transform:translate(-50%,-50%);image-rendering:pixelated;filter:brightness(.55) saturate(.6);transition:filter .15s}',
    'body:not(.touch) #r-br .act.big .h2-ic{width:40px;height:40px}',
    'body:not(.touch) #r-br .act kbd{position:absolute;left:2px;top:1px;font-size:9.5px;line-height:1.2;padding:0 3px;border:0;background:rgba(0,0,0,.55);color:#C8C0B0;max-width:52px;overflow:hidden;white-space:nowrap;z-index:4}',
    'body:not(.touch) #r-br .act>span:not(.cd):not(.bh-sec){position:absolute;left:0;right:0;bottom:1px;font-size:10px;line-height:1.15;color:#E8E0C8;text-align:center;white-space:nowrap;overflow:hidden;text-shadow:0 1px 2px #000;z-index:4}',
    'body:not(.touch) #r-br .act>.h2-n{position:absolute;right:3px;bottom:12px;font-style:normal;font-size:11px;font-weight:900;color:#FFF;text-shadow:0 1px 2px #000,0 0 3px #000;z-index:4}',
    'body:not(.touch) #r-br .act .bh-sec{font-size:17px}',
    // 亮起來：金框＋發光；冷卻中、沒藥：暗
    'body:not(.touch) #r-br .act.lit{border-color:#E8C04A;box-shadow:inset 0 0 10px rgba(232,192,74,.35),0 0 10px rgba(232,192,74,.45)}',
    'body:not(.touch) #r-br .act.lit .h2-ic{filter:none}',
    'body:not(.touch) #r-br .act.nomp{border-color:#3A6ACF!important;box-shadow:inset 0 0 10px rgba(58,106,207,.4)}',
    'body:not(.touch) #r-br .act.nomp::after{bottom:auto;top:2px;right:2px;left:auto;font-size:9px;z-index:5}',
    'body:not(.touch) #r-br .act.empty .h2-n{color:#E86A6A}',
    'body:not(.touch) #r-br .act:hover{filter:brightness(1.15)}',
    // 圓表
    '.h2-badge{position:relative;width:70px;height:70px;border-radius:50%;background:#14100E;box-shadow:0 0 0 3px #3E342C,0 0 0 4px #0E0A08,0 4px 12px rgba(0,0,0,.55)}',
    '.h2-badge>i{position:absolute;inset:4px;border-radius:50%}',
    '.h2-badge .h2-trail{background:conic-gradient(rgba(255,255,255,.55) calc(var(--t,1)*1turn),transparent 0)}',
    '.h2-badge.hp .h2-ring{background:conic-gradient(#D83A3A calc(var(--f,1)*1turn),rgba(80,20,20,.35) 0)}',
    '.h2-badge.mp .h2-ring{background:conic-gradient(#3A72E0 calc(var(--f,1)*1turn),rgba(20,30,80,.35) 0)}',
    '.h2-badge .h2-trail{z-index:0}.h2-badge .h2-ring{z-index:1}',
    '.h2-badge .h2-sh{inset:0;z-index:2;background:conic-gradient(rgba(240,248,255,.95) calc(var(--s,0)*1turn),transparent 0);-webkit-mask:radial-gradient(circle,transparent 31px,#000 32px);mask:radial-gradient(circle,transparent 31px,#000 32px)}',
    '.h2-badge .h2-core{position:absolute;inset:12px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#3A302A,#16120F);display:grid;place-items:center;z-index:3;box-shadow:inset 0 2px 4px rgba(0,0,0,.6)}',
    '.h2-badge .h2-core img{width:22px;height:22px;image-rendering:pixelated;margin-top:-6px}',
    '.h2-badge .h2-core b{position:absolute;bottom:6px;font-size:12px;font-weight:900;color:#FFF;text-shadow:0 1px 2px #000}',
    '.h2-badge.low{animation:h2low 1s ease-in-out infinite}@keyframes h2low{50%{box-shadow:0 0 0 3px #C8323A,0 0 14px #C8323A}}',
    // 經驗條
    '.h2-xp{position:relative;width:min(520px,60vw);height:7px;background:#12100E;border:1px solid #0A0806;box-shadow:0 0 0 1px #3E342C}',
    '.h2-xp i{position:absolute;left:0;top:0;bottom:0;width:calc(var(--f,0)*100%);background:linear-gradient(#9AF07A,#4AB83A)}',
    '.h2-xp b{position:absolute;left:50%;top:-15px;transform:translateX(-50%);font-size:13px;font-weight:900;color:#9AF07A;text-shadow:0 0 2px #000,0 1px 0 #000,1px 0 0 #000,-1px 0 0 #000}',
    // 左下的面板縮小：生命魔力條、經驗條藏起來（移到下面中間）
    'body:not(.touch) #r-bl{width:min(250px,calc(100% - 24px));bottom:max(12px,env(safe-area-inset-bottom))}',
    'body:not(.touch) #r-bl .stat-row,body:not(.touch) #r-bl .bh-xp{display:none}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
