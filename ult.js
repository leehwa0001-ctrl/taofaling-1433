// 大招與更華麗的技能（作者 2026-10-04：技能也可以華麗，甚至有大招那樣的）
// - 大招量表 P.ult（0～100，這一趟遺跡才有）：打中遺跡生物、打倒（領主體更多）、被打都會累積。滿了 HUD 中間的大招鈕發光，按 V（或點鈕）放出來。
// - 每個職業一招（都很誇張：整個畫面閃一下、名字大大地打在畫面上、鏡頭震）：
//   槍手「彈幕風暴」、弓箭手「流星箭雨」、戰士「天崩斬」、術士「七曜隕星」、牧師「聖域降臨」、刀客「千刃」、騎士「不落城塞」。
// - 一般技能也加料：放出去的時候腳下炸開一圈職業顏色的光、往上飄的光點，畫面下方打出技能的名字。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id), rnd = Math.random;
  // 擊飛：在原地被打上半空（0.9 秒、最高 2.6 公尺），飛在空中不能動，落地揚起灰塵；領主體、佩特拉核心不會被擊飛
  const knockUp = (x, z, r) => (W().enemies || []).forEach(e => {
    if (e.dead || e.under || !e.def || e.def.boss || e.def.lordPlus || e.def.fly || e.id === 'petra') return;   // 會飛的本來就在空中
    if (Math.hypot(e.x - x, e.z - z) > r + (e.def.size || 1) * 0.4) return;
    e.up = { t: 0, dur: 0.9, h: 2.6 / Math.max(0.8, Math.sqrt(e.def.size || 1)), x: e.x, z: e.z };
  });
  R.knockUp = knockUp;
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const near = (x, z, r) => (W().enemies || []).filter(e => !e.dead && !e.dormant && Math.hypot(e.x - x, e.z - z) < r);
  // 大招的傷害基準（2026-10-04 作者：大招傷害大約是普攻的 20～30 倍，調低一半到 10～15 倍）：
  // 原本＝武器一下的傷害×傷害倍率，打到的時候 R.hurtEnemy 又乘一次傷害倍率——等級越高大招越誇張（30 級就是兩倍）。
  // 現在＝一下普攻（武器一下的傷害×彈數×段數，不乘傷害倍率）×ULT_K[職業]：照實測調，每個職業的大招打在中間的敵人身上大約是普攻的 10～15 倍。
  // 補償（傷害削了，每個大招各多一樣好處）在 ultbal.js。monk.js、classes2b.js 的大招也用 R.ultBase。
  // 實測（K＝1、身邊 2.5 公尺的敵人）：槍手 7、弓 20、戰士 14、術士 13、牧師 13、刀客 20、騎士 12、武術家 10、吟遊 12、召喚 2、術陣 9、附魔 6、符卷 5 倍
  const ULT_K = R.ULT_K = { gunner: 1.7, archer: 0.6, warrior: 0.85, mage: 0.95, priest: 0.9, blade: 0.6, knight: 1, monk: 1.2, bard: 1, summoner: 1.7, arraymage: 1.3, enchanter: 1.6, scroll: 1.2 };
  // 調完（30 級實測，身邊 2.5 公尺）：槍手 11、弓 14、戰士 11、術士 12、牧師 11、刀客 10、騎士 11、武術家 14、吟遊 12、術陣 12、附魔 8（＋18 秒附魔）、符卷 8、召喚 5（召喚物各咬各的）；原本 30 級是 13～39 倍
  R.ultBase = P => { const ws = P.ws || {}; return (ws.dmg || 10) * (R.multiN ? R.multiN(ws) : (ws.pellets > 1 ? ws.pellets : 1) * (ws.hits || 1)) * (ULT_K[P.cls] || 1); };
  const base = P => R.ultBase(P), meter = P => (P.ws ? P.ws.dmg : 10) * (P.dmgMult || 1);   // 量表照舊
  // 職業的光（data.js 的職業顏色有幾個太暗，HUD 和大招用亮一點的）
  const GLOW = R.CLASS_GLOW = { gunner: '#7AB8FF', archer: '#8AE07A', warrior: '#FF8A5A', mage: '#B88AFF', priest: '#FFE08A', blade: '#9AD8FF', knight: '#FFC85A' };
  const col = cls => GLOW[cls] || (R.CLASSES[cls] && R.CLASSES[cls].color) || '#E8C04A';
  const floor = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  // 瞄準的點：滑鼠指的地方；太遠就拉回 12 公尺
  const aimPt = (P, max) => { let x = P.aimX != null ? P.aimX : P.x + Math.sin(P.aimA || 0) * 6, z = P.aimZ != null ? P.aimZ : P.z + Math.cos(P.aimA || 0) * 6; const d = Math.hypot(x - P.x, z - P.z), m = max || 12; if (d > m) { x = P.x + (x - P.x) / d * m; z = P.z + (z - P.z) / d * m; } return floor(x, z); };

  // ---------- 畫面效果：閃光、大字 ----------
  const flash = (c, ms) => { const el = document.createElement('div'); el.className = 'ul-flash'; el.style.setProperty('--c', c); el.style.animationDuration = (ms || 500) + 'ms'; document.body.appendChild(el); setTimeout(() => el.remove(), (ms || 500) + 50); };
  const cutIn = (name, sub, c) => { const el = document.createElement('div'); el.className = 'ul-cut'; el.style.setProperty('--c', c); el.innerHTML = '<b>' + R.esc(name) + '</b><small>' + R.esc(sub) + '</small>'; document.body.appendChild(el); setTimeout(() => el.remove(), 1700); };
  let castEl = null;
  const castName = (name, c) => { if (!castEl) { castEl = document.createElement('div'); castEl.className = 'ul-cast'; document.body.appendChild(castEl); } castEl.style.setProperty('--c', c); castEl.textContent = name; castEl.classList.remove('on'); void castEl.offsetWidth; castEl.classList.add('on'); };
  const burst = (P, c, big) => { R.fx('ring', P.x, 0.1, P.z, { r: big ? 4.5 : 2.2, color: c }); R.fx('poof', P.x, 1, P.z, { color: c, n: big ? 30 : 12 }); if (big) { R.fx('ring', P.x, 0.2, P.z, { r: 7, color: '#FFFFFF' }); R.fx('pillar', P.x, 0, P.z, { r: 1.2, color: c }); } };

  // ---------- 一般技能加料 ----------
  const skName = id => { const s = (R.SKILL_LIB && R.SKILL_LIB[id]) || (R.SKILLS && R.SKILLS[id]); return s ? s.name : ''; };
  const us0 = R.useSkill;
  if (us0) R.useSkill = (...a) => { const P = W().P, b = P ? P.skillCd || 0 : 0, r = us0(...a); if (P && (P.skillCd || 0) > b + 0.01) { const c = col(P.cls); burst(P, c); castName(skName(P.skill), c); } return r; };
  const cs0 = R.castSlot;
  if (cs0) R.castSlot = i => { const P = W().P, b = P && P.skCd ? P.skCd[i] || 0 : 0, r = cs0(i); if (P && P.skCd && (P.skCd[i] || 0) > b + 0.01) { const c = col(P.cls); burst(P, c); castName(skName(R.slotSkill ? R.slotSkill(P, i) : ''), c); } return r; };

  // ---------- 大招量表 ----------
  const gain = v => { const P = W().P, run = W().run; if (!P || !run || P.dead || P.ulting) return; const was = P.ult || 0; P.ult = Math.min(100, was + v); if (was < 100 && P.ult >= 100) { R.toast && R.toast('大招準備好了（V）', col(P.cls)); R.sfx && R.sfx('chest'); } };
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { const h0 = e && e.hp, r = he0(e, raw, o), P = W().P; if (e && P && h0 > e.hp) gain(Math.min(3, 1.4 * (h0 - Math.max(0, e.hp)) / Math.max(1, meter(P)))); return r; };
  const ke0 = R.killEnemy;
  if (ke0) R.killEnemy = (e, by) => { const was = e && !e.dead, r = ke0(e, by); if (was && e && !e.fake) gain(e.def && e.def.boss ? 25 : 6); return r; };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (dmg, src, o) => { const P = W().P, h = P ? P.hp : 0, r = hp0(dmg, src, o); if (P && P.hp < h) gain(2.5); return r; };

  // ---------- 七招 ----------
  const ULT = {
    gunner: { name: '彈幕風暴', sub: '槍手的大招：三秒內朝準心方向扇形高速掃射', go: P => {
      const b = base(P), run = W().run; P.iframe = Math.max(P.iframe || 0, 3.1); let n = 0;
      for (let t = 0; t < 3000; t += 80) later(() => {
        if (W().run !== run || P.dead) return; const a0 = P.aimA || 0;
        for (let i = -3; i <= 3; i++) R.fire({ kind: 'bullet', owner: 'p', x: P.x, z: P.z, a: a0 + i * 0.17 + (rnd() - 0.5) * 0.025, speed: 34, dmg: b * 0.34, life: 0.9, pierce: 1, primary: false });
        if ((n++ % 4) === 0) { R.fx('line', P.x, 1, P.z, { a: a0, len: 7, color: '#9AD8FF' }); R.shake && R.shake(0.06); }
      }, t);
    } },
    archer: { name: '流星箭雨', sub: '弓箭手的大招：一大片的箭從天上落下來', go: P => {
      const b = base(P), [x, z] = aimPt(P, 13); R.fx('mark', x, 0, z, { r: 6, t: 0.6 });
      for (let k = 0; k < 8; k++) later(() => { for (let i = 0; i < 6; i++) { const an = rnd() * Math.PI * 2, rr = rnd() * 6, [px, pz] = floor(x + Math.sin(an) * rr, z + Math.cos(an) * rr); R.fx('rain', px, 0, pz, { r: 1.4 }); } R.aoe(x, z, 6, b * 1.6, { primary: false }); R.shake && R.shake(0.15); }, 500 + k * 220);
      later(() => { R.fx('pillar', x, 0, z, { r: 1.6, color: '#BFE8FF' }); R.fx('boom', x, 0.4, z, { r: 6, color: '#BFE8FF' }); R.aoe(x, z, 6.5, b * 7, { stun: 1.2 }); R.shake && R.shake(0.6); }, 2400);
    } },
    warrior: { name: '天崩斬', sub: '戰士的大招：跳起來劈下，整片地裂開', go: P => {
      // 2026-10-04 作者：戰士的大招傷害太離譜——削弱傷害，但攻擊距離的加成算進大招：攻擊距離比武器原本長多少（ultbal.js 的 range0），
      // 跳的距離、劈下去的範圍、裂地的長度就大多少（最多 2 倍）
      const ws = P.ws || {}, rk = Math.max(1, Math.min(2, ws.range0 ? ws.range / ws.range0 : 1));
      const b = base(P), [x, z] = aimPt(P, 9 * rk); P.jump = { t: 0, dur: 0.7, x0: P.x, z0: P.z, x1: x, z1: z }; P.air = 0.7; P.iframe = Math.max(P.iframe || 0, 1);
      later(() => { R.fx('boom', x, 0.4, z, { r: 6 * rk, color: '#FF8A4A' }); R.fx('ring', x, 0.1, z, { r: 9 * rk, color: '#FFFFFF' }); R.aoe(x, z, 6 * rk, b * 12, { stun: 2 }); knockUp(x, z, 6 * rk); R.shake && R.shake(1);   // 2026-10-04 作者：天崩斬改成擊飛而不是擊退
        for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2; for (let i = 2; i <= 6; i++) { const [px, pz] = floor(x + Math.sin(an) * i * 1.5 * rk, z + Math.cos(an) * i * 1.5 * rk); later(() => { R.fx('boom', px, 0.2, pz, { r: rk, color: '#C86A3A' }); R.aoe(px, pz, rk, b * 1.2, { primary: false }); }, i * 70); } } }, 700);
    } },
    mage: { name: '七曜隕星', sub: '術士的大招：七顆隕星砸下來', go: P => {
      const b = base(P), [x, z] = aimPt(P, 13);
      for (let k = 0; k < 7; k++) { const an = rnd() * Math.PI * 2, rr = k ? 1.5 + rnd() * 4.5 : 0, [px, pz] = floor(x + Math.sin(an) * rr, z + Math.cos(an) * rr); R.fx('mark', px, 0, pz, { r: 2.6, t: 0.7 + k * 0.18 }); later(() => { R.fx('pillar', px, 0, pz, { r: 1, color: '#FF7A3A' }); R.fx('boom', px, 0.6, pz, { r: 2.8, color: '#FF9A3A' }); R.aoe(px, pz, 2.8, b * 4.5, { burn: true }); R.shake && R.shake(0.4); flash('#FF7A3A', 180); }, 700 + k * 180); }
    } },
    priest: { name: '聖域降臨', sub: '牧師的大招：天上降下光柱，你和隊友回滿', go: P => {
      const b = base(P); R.fx('pillar', P.x, 0, P.z, { r: 3, color: '#FFE8A0' }); R.healP(P.hpMax, true); P.shield = Math.max(P.shield || 0, P.hpMax * 0.35); P.buff.shieldT = 8;
      (W().allies || []).forEach(a => { if (a.downed) { a.downed = false; if (R.setDown) R.setDown(a.h, false); } a.hp = a.hpMax || a.hp; R.fx('ring', a.x, 0.1, a.z, { r: 1.5, color: '#FFE8A0' }); });
      for (let k = 0; k < 5; k++) later(() => { R.fx('ring', P.x, 0.1, P.z, { r: 7, color: '#FFE8A0' }); R.aoe(P.x, P.z, 7, b * 2.4, { stun: 0.6, primary: false }); }, 300 + k * 450);
      if (R.addZone) R.addZone({ kind: 'sanct', x: P.x, z: P.z, r: 6, life: 8, dmg: b * 0.6 });
    } },
    blade: { name: '千刃', sub: '刀客的大招：在附近的遺跡生物之間來回閃斬', go: P => {
      const b = base(P), tg = near(P.x, P.z, 14).sort((p, q) => Math.hypot(p.x - P.x, p.z - P.z) - Math.hypot(q.x - P.x, q.z - P.z)).slice(0, 8), x0 = P.x, z0 = P.z; P.iframe = Math.max(P.iframe || 0, 2.5);
      const seq = tg.length ? tg.concat(tg).slice(0, 10) : [];
      seq.forEach((e, i) => later(() => { if (e.dead) return; const [nx, nz] = floor(e.x - Math.sin(rnd() * 6) * 1.2, e.z - Math.cos(rnd() * 6) * 1.2); R.fx('blink', P.x, 1, P.z); R.fx('slash', P.x, 1, P.z, { a: Math.atan2(nx - P.x, nz - P.z), len: Math.hypot(nx - P.x, nz - P.z) }); P.x = nx; P.z = nz; R.hurtEnemy(e, b * 3.2, { crit: true }); R.fx('swing', P.x, 0, P.z, { a: Math.atan2(e.x - P.x, e.z - P.z), arc: 2, range: 2.6, color: '#B8D8FF' }); R.shake && R.shake(0.2); }, 150 + i * 130));
      later(() => { R.fx('slash', P.x - 3, 1, P.z - 3, { a: Math.PI / 4, len: 8.5 }); R.fx('slash', P.x + 3, 1, P.z - 3, { a: -Math.PI / 4, len: 8.5 }); R.aoe(P.x, P.z, 5, b * 6, { crit: true }); flash('#B8D8FF', 260); R.shake && R.shake(0.7); if (!seq.length) R.aoe(x0, z0, 5, b * 6); }, 300 + seq.length * 130);
    } },
    knight: { name: '不落城塞', sub: '騎士的大招：四秒內什麼都打不穿，附近的遺跡生物只能打你', go: P => {
      const b = base(P), w = W(), run = w.run; let t = 4, tick = 0; P.iframe = Math.max(P.iframe || 0, 4); P.buff.fortress = Math.max(P.buff.fortress || 0, 4);
      w.dyn.push(dt => { if (w.run !== run || P.dead) return false; t -= dt; tick -= dt; if (tick <= 0) { tick = 0.5; R.fx('ring', P.x, 0.1, P.z, { r: 3.2, color: '#C9A13A' }); near(P.x, P.z, 10).forEach(e => { e.tgt = P; e.aggro = true; }); R.aoe(P.x, P.z, 3.2, b * 0.9, { primary: false }); } return t > 0; });
      later(() => { R.fx('boom', P.x, 0.4, P.z, { r: 6, color: '#C9A13A' }); R.fx('ring', P.x, 0.1, P.z, { r: 9, color: '#FFFFFF' }); R.aoe(P.x, P.z, 6, b * 9, { stun: 1.6, kb: 6 }); R.shake && R.shake(0.9); flash('#C9A13A', 300); }, 4000);
    } }
  };
  R.ULTS = ULT;
  // 大招本身持續多久（秒）：這段時間打出去的傷害不幫大招充能（2026-10-08：彈幕風暴掃 3 秒，以前只擋 1.5 秒，後半段又充滿可以連放）
  Object.assign(ULT.gunner, { dur: 3.3 }); Object.assign(ULT.archer, { dur: 3 }); Object.assign(ULT.warrior, { dur: 2 }); Object.assign(ULT.mage, { dur: 3.5 });
  Object.assign(ULT.priest, { dur: 8.5 }); Object.assign(ULT.blade, { dur: 3.5 }); Object.assign(ULT.knight, { dur: 4.5 });
  R.castUlt = () => {
    const P = W().P, run = W().run; if (!P || !run || run.done || P.dead || (R.sheetOpen && R.sheetOpen())) return;
    if ((P.ult || 0) < 100) { R.toast && R.toast('大招還沒滿（' + Math.floor(P.ult || 0) + '%）'); return; }
    const u = ULT[P.cls] || ULT.warrior, c = col(P.cls); P.ult = 0; P.ulting = true;
    { const w0 = W(), run0 = w0.run; let ut = u.dur || 4; const off = () => { P.ulting = false; }; clearTimeout(P._ultT); P._ultT = setTimeout(off, (ut + 5) * 1000);   // 換樓層 dyn 會被清掉：保險用的
      if (w0.dyn) w0.dyn.push(dt => { ut -= dt; if (ut <= 0 || W().run !== run0) { off(); return false; } return true; }); else P._ultT = setTimeout(off, ut * 1000); }
    flash(c, 520); cutIn(u.name, u.sub, c); burst(P, c, true); R.shake && R.shake(0.7); R.sfx && R.sfx('chest');
    try { u.go(P); } catch (e) { console.warn('[ult]', e); }
  };
  window.addEventListener('keydown', e => { if ((e.key === 'v' || e.key === 'V') && W().run && !e.repeat && !(R.sheetOpen && R.sheetOpen()) && !/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); R.castUlt(); } });
  // 每一趟從 0 開始
  const sr0 = R.startRun;
  R.startRun = id => { const r = sr0(id), P = W().P; if (P && W().run && !W().run.ultInit) { W().run.ultInit = 1; P.ult = 0; } return r; };

  // ---------- HUD：大招鈕 ----------
  const ensureBtn = () => {
    const br = $('r-br'); if (!br || br.querySelector('[data-tact="ult"]')) return br && br.querySelector('[data-tact="ult"]');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'act dungeon-only ul-btn'; b.dataset.tact = 'ult';
    b.innerHTML = '<i class="ul-fill"></i><span class="ul-txt">大招</span><kbd>V</kbd>'; b.onclick = () => R.castUlt(); br.appendChild(b); return b;
  };
  const ht0 = R.hudTick;
  R.hudTick = dt => { ht0(dt); const P = W().P; if (!P || !W().run) return; const b = ensureBtn(); if (!b) return; const v = Math.max(0, Math.min(100, P.ult || 0)); b.style.setProperty('--u', (v / 100).toFixed(3)); b.classList.toggle('ready', v >= 100); const t = b.querySelector('.ul-txt'), s = v >= 100 ? (ULT[P.cls] || ULT.warrior).name : Math.floor(v) + '%'; if (t && t.textContent !== s) t.textContent = s; };

  const css = document.createElement('style');
  css.textContent = '.ul-flash{position:fixed;inset:0;z-index:70;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.75),var(--c) 60%,transparent);mix-blend-mode:screen;animation:ulf .5s ease-out forwards}@keyframes ulf{0%{opacity:.95}100%{opacity:0}}'
    + '.ul-cut{position:fixed;left:0;right:0;top:34%;z-index:71;pointer-events:none;text-align:center;animation:ulc 1.7s ease-out forwards}.ul-cut b{display:block;font:900 clamp(34px,7vw,72px)/1.1 var(--serif,serif);color:#FFF;letter-spacing:.18em;text-shadow:0 0 18px var(--c),0 0 40px var(--c),0 3px 0 #000}.ul-cut small{display:block;margin-top:6px;font-size:14px;color:#F4EEE0;text-shadow:0 1px 3px #000}'
    + '.ul-cut::before{content:"";position:absolute;left:0;right:0;top:50%;height:110px;transform:translateY(-50%) skewY(-4deg);background:linear-gradient(90deg,transparent,rgba(0,0,0,.55) 20%,rgba(0,0,0,.55) 80%,transparent);z-index:-1;border-top:2px solid var(--c);border-bottom:2px solid var(--c)}'
    + '@keyframes ulc{0%{opacity:0;transform:translateX(-60px) scale(1.15)}12%{opacity:1;transform:none}75%{opacity:1}100%{opacity:0;transform:translateX(40px)}}'
    + '.ul-cast{position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:60;pointer-events:none;font:900 22px/1 var(--serif,serif);letter-spacing:.12em;color:#FFF;text-shadow:0 0 10px var(--c),0 0 22px var(--c),0 2px 0 #000;opacity:0}.ul-cast.on{animation:ulk .9s ease-out forwards}@keyframes ulk{0%{opacity:0;transform:translate(-50%,10px) scale(.9)}15%{opacity:1;transform:translate(-50%,0) scale(1.05)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-14px)}}'
    + 'body.touch .ul-btn{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:calc(230px + env(safe-area-inset-bottom));width:64px;height:64px;border-radius:50%;z-index:7}body.touch .ul-cast{bottom:42%}';
  document.head.appendChild(css);
  const stU = R.step;
  R.step = dt => {
    const r = stU(dt);
    (W().enemies || []).forEach(e => {
      const u = e.up; if (!u) return;
      if (e.dead) { e.up = null; if (e.m && e.m.g) e.m.g.position.y = 0; return; }
      u.t += dt; const k = Math.min(1, u.t / u.dur);
      e.x = u.x; e.z = u.z; if (e.m && e.m.g) { e.m.g.position.set(u.x, Math.sin(k * Math.PI) * u.h, u.z); e.m.g.rotation.z = Math.sin(k * Math.PI) * 0.5; }
      if (k >= 1) { e.up = null; if (e.m && e.m.g) { e.m.g.position.y = 0; e.m.g.rotation.z = 0; } R.fx && R.fx('dust', e.x, 0.2, e.z, { color: '#C8B898' }); R.fx && R.fx('poof', e.x, 0.3, e.z, { color: '#A89878', n: 4 }); }
    });
    return r;
  };
})(window.R);
