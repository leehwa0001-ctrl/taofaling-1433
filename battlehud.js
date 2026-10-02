// 討伐令 1433：戰鬥 HUD（作者：戰鬥 HUD 也可以優化）
// 包住 R.hudTick、R.hudFloor，只加東西、不改原本的數字：
// - 左下：角色的頭像（從身上的圖切下來）、職業和等級、經驗條；生命和魔力條有刻度、高光，
//   被打的時候留一段白色的「殘影」慢慢退掉，補血的時候閃綠光；護盾疊在生命條上面；生命剩三成以下會閃。
// - 狀態：吃的東西、技能的強化（戰吼、防禦、回復、護盾……）、壞狀態（緩速、看不見、踉蹌），寫剩幾秒。
// - 技能鈕：冷卻變成順時針轉的扇形，中間寫剩幾秒；魔力不夠的時候變暗、變藍；冷卻好的那一下會亮一下，能放的時候一直亮著（金框、發光）。
// - 魔王的血條：名牌、四分之一的刻度、殘影、剩幾 %；剩三成以下會發紅光。
(function (R) {
  const W = R.W, $ = id => document.getElementById(id);
  let built = false, hpTrail = 1, mpTrail = 1, hpHold = 0, mpHold = 0, lastHp = -1, bossTrail = 1, bossHold = 0, bossId = null, faceKey = '';
  const prevCd = {};
  const BUFF = { warcry: ['戰吼', 'up'], guard: ['防禦', 'up'], regen: ['回復', 'up'], whirl: ['旋風', 'up'], fortress: ['要塞', 'up'], shieldT: ['護盾', 'up'], rage: ['狂怒', 'up'], kekkai: ['結界', 'up'] };
  const BAD = { slowT: '緩速', blindT: '看不見', stumble: '踉蹌', knockT: '被擊退' };
  const FOOD = { dept: '百貨的定食', sento: '泡過錢湯', food: '吃飽了', cafe: '咖啡', drink: '熱飲', kuji: '神籤', onsen: '溫泉', churu: '楚璐檢查過', yatai: '屋台', karaoke: '唱過歌', ramen: '拉麵' };
  const build = () => {
    const bl = $('r-bl'); if (!bl || built) return; built = true;
    // 頭像、職業等級列
    const head = document.createElement('div'); head.className = 'bh-head';
    head.innerHTML = '<canvas id="bh-face" width="48" height="40"></canvas><div class="bh-who"><b id="bh-name"></b><small id="bh-lv"></small><div class="bh-xp"><i id="bh-xp"></i></div></div>';
    bl.insertBefore(head, bl.firstChild);
    const st = document.createElement('div'); st.className = 'bh-st'; st.id = 'bh-st'; bl.insertBefore(st, $('r-weapon'));
    // 生命、魔力條：殘影、護盾
    [['r-hp', 'bh-hp-tr'], ['r-mp', 'bh-mp-tr']].forEach(([id, tr]) => { const fill = $(id), m = fill && fill.parentNode; if (!m) return; m.classList.add('bh-bar'); const t = document.createElement('b'); t.className = 'bh-trail'; t.id = tr; m.insertBefore(t, fill); });
    const hpM = $('r-hp').parentNode, sh = document.createElement('b'); sh.className = 'bh-shield'; sh.id = 'bh-shield'; hpM.appendChild(sh);
    // 魔王
    const boss = $('r-boss'); if (boss) { const m = $('r-boss-hp').parentNode; m.classList.add('bh-bar'); const t = document.createElement('b'); t.className = 'bh-trail'; t.id = 'bh-boss-tr'; m.insertBefore(t, $('r-boss-hp')); const p = document.createElement('small'); p.id = 'bh-boss-p'; boss.appendChild(p); }
    // 技能鈕：冷卻的秒數
    ['r-skill', 'r-skill2', 'r-skill3', 'r-dodge-cd'].forEach(id => { const b = id === 'r-dodge-cd' ? $(id) && $(id).parentNode : $(id); if (!b || b.querySelector('.bh-sec')) return; const s = document.createElement('span'); s.className = 'bh-sec'; b.appendChild(s); });
  };
  // 頭像：身上那張圖的第一格（正面、站著）切上半身，放大兩倍
  const face = P => {
    const c = $('bh-face'), img = P.h && P.h.sp && P.h.sp.t && P.h.sp.t.image; if (!c || !img) return;
    const key = (img.width || 0) + ':' + P.cls + ':' + (P.adv || '') + ':' + (P.item && P.item.base); if (key === faceKey) return; faceKey = key;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 48, 40);
    const grd = g.createLinearGradient(0, 0, 0, 40); grd.addColorStop(0, '#3A2E3A'); grd.addColorStop(1, '#16121A'); g.fillStyle = grd; g.fillRect(0, 0, 48, 40);
    try { g.drawImage(img, 0, 2, 24, 20, 0, 0, 48, 40); } catch (e) { }
  };
  const setW = (el, v) => { if (el) el.style.width = Math.max(0, Math.min(100, v * 100)) + '%'; };
  const flash = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  const tick0 = R.hudTick;
  R.hudTick = dt => {
    tick0(dt);
    const P = W.P, run = W.run; if (!P || !run) return;
    if (!built) build();
    // 生命、魔力：殘影晚 0.45 秒才開始退
    const hp = Math.max(0, P.hp / P.hpMax), mp = Math.max(0, P.mp / P.mpMax);
    if (hp < hpTrail) { hpHold -= dt; if (hpHold <= 0) hpTrail = Math.max(hp, hpTrail - dt * 0.6); } else { hpTrail = hp; hpHold = 0.45; }
    if (lastHp >= 0 && P.hp < lastHp - 0.5) hpHold = 0.45;
    if (lastHp >= 0 && P.hp > lastHp + 0.5) flash($('r-hp').parentNode, 'heal');
    lastHp = P.hp;
    if (mp < mpTrail) { mpHold -= dt; if (mpHold <= 0) mpTrail = Math.max(mp, mpTrail - dt * 0.8); } else { mpTrail = mp; mpHold = 0.35; }
    setW($('bh-hp-tr'), hpTrail); setW($('bh-mp-tr'), mpTrail);
    const shEl = $('bh-shield'); if (shEl) { const s = P.shield > 0 ? Math.min(1, P.shield / P.hpMax) : 0; shEl.style.width = s * 100 + '%'; shEl.style.left = Math.min(100 - s * 100, hp * 100) + '%'; shEl.hidden = !s; }
    $('r-bl').classList.toggle('low', hp > 0 && hp < 0.3);
    // 技能鈕：扇形冷卻、秒數、魔力不夠、好了亮一下
    const slots = [['r-skill', 0], ['r-skill2', 1], ['r-skill3', 2]];
    slots.forEach(([id, i]) => {
      const b = $(id); if (!b) return; const sid = R.slotSkill ? R.slotSkill(P, i) : (i ? null : P.skill), sk = sid && R.SKILLS[sid];
      const cd = i === 0 ? P.skillCd : (P.skCd && P.skCd[i]) || 0, max = sk ? sk.cd * (P.skillCdMult || 1) : 1, p = sk ? Math.max(0, Math.min(1, cd / max)) : 0;
      const c = b.querySelector('.cd'); if (c) c.style.setProperty('--p', p);
      const s = b.querySelector('.bh-sec'); if (s) s.textContent = cd > 0.05 && sk ? (cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)) : '';
      b.classList.toggle('nomp', !!sk && P.mp < sk.mp && cd <= 0);
      b.classList.toggle('lit', !!sk && cd <= 0 && P.mp >= sk.mp);   // 能放的技能一直亮著（作者：技能沒有亮起來）
      if ((prevCd[id] || 0) > 0 && cd <= 0 && sk) flash(b, 'ready'); prevCd[id] = cd;
    });
    { const c = $('r-dodge-cd'), b = c && c.parentNode; if (c) { const p = P.dodgeCdMax ? Math.max(0, Math.min(1, P.dodgeCd / P.dodgeCdMax)) : 0; c.style.setProperty('--p', p); const s = b.querySelector('.bh-sec'); if (s) s.textContent = P.dodgeCd > 0.05 ? P.dodgeCd.toFixed(1) : ''; } }
    // 魔王
    const boss = W.enemies && W.enemies.find(e => e.def.boss && !e.dead);
    if (boss) {
      const f = Math.max(0, boss.hp / boss.hpMax); if (boss !== bossId) { bossId = boss; bossTrail = f; }
      if (f < bossTrail) { bossHold -= dt; if (bossHold <= 0) bossTrail = Math.max(f, bossTrail - dt * 0.35); } else { bossTrail = f; bossHold = 0.6; }
      setW($('bh-boss-tr'), bossTrail); const bp = $('bh-boss-p'); if (bp) bp.textContent = Math.ceil(f * 100) + '%';
      $('r-boss').classList.toggle('rage', f < 0.3);
    }
    slowTick(dt, P, run);
  };
  // 每 0.2 秒：頭像、等級、狀態
  let slow = 0;
  const slowTick = (dt, P, run) => {
    slow += dt; if (slow < 0.2) return; slow = 0;
    face(P);
    const st = R.S.classes[R.S.cls], nm = P.adv && R.ADV && R.ADV[P.cls] ? (R.ADV[P.cls].find(a => a.id === P.adv) || {}).name : R.CLASSES[P.cls].name;
    const n = $('bh-name'); if (n) n.textContent = (R.S.name || '') ; const lv = $('bh-lv'); if (lv) lv.textContent = nm + '・Lv ' + st.lv + '　擊倒 ' + (run.kills || 0);
    setW($('bh-xp'), st.xp / R.xpNeed(st.lv));
    const chips = [];
    const S = R.S; if (S.buff && S.buff.until === S.day) chips.push(['up', FOOD[S.buff.kind] || '加成', '']);
    Object.keys(BUFF).forEach(k => { const v = P.buff && P.buff[k]; if (v > 0) chips.push([BUFF[k][1], BUFF[k][0], v.toFixed(v < 10 ? 1 : 0) + 's']); });
    if (P.sb) Object.keys(P.sb).forEach(k => { const b = P.sb[k]; if (!b || !(b.left > 0) || b.kekkai) return; const sk = R.SKILLS[String(k).split(':')[0]]; chips.push(['up', sk ? sk.name : '強化', b.left.toFixed(1) + 's']); });
    Object.keys(BAD).forEach(k => { const v = P[k]; if (v > 0) chips.push(['down', BAD[k], v.toFixed(1) + 's']); });
    if (P.shield > 0) chips.push(['up', '護盾', Math.ceil(P.shield)]);
    const el = $('bh-st'); if (el) { const h = chips.slice(0, 7).map(([c, t, v]) => '<span class="bh-chip ' + c + '">' + R.esc(t) + (v !== '' ? '<i>' + v + '</i>' : '') + '</span>').join(''); if (el.innerHTML !== h) el.innerHTML = h; el.hidden = !chips.length; }
  };
  const floor0 = R.hudFloor;
  R.hudFloor = () => { floor0(); if (!built) build(); faceKey = ''; lastHp = -1; hpTrail = 1; mpTrail = 1; };
})(window.R);
