// 討伐令 1433：技能欄（每個職業三個技能）與頓幀
// 第一格是原本的技能（R／右鍵；轉職後換成上位職業的技能）；第二、三格（數字鍵 3、4）在職業等級 3、6 學會，轉職後也留著。
// 新技能的說法照設定的施法派別：槍手是科技派（刻了咒文的魔力鋼彈頭），術士念咒文，內修、外修之類的不亂用。
(function (R) {
  const W = () => R.W;
  const $ = id => document.getElementById(id);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  // 延遲的動作：換樓層、回到地面或倒下之後就不再發生
  const later = (f, ms) => { const run = W().run, sc = W().scene; setTimeout(() => { const w = W(); if (w.run === run && w.scene === sc && w.P && !w.P.dead && !run.done) f(); }, ms); };

  // ---------- 技能資料 ----------
  Object.assign(R.SKILLS, {
    flashbang: { name: '閃光彈', cd: 9, mp: 10, desc: '丟出刻了咒文的魔力鋼閃光彈：落點附近的敵人暈眩 1.6 秒（領主體只有一下）。' },
    barrage: { name: '掃射', cd: 8, mp: 12, desc: '0.6 秒內朝準心掃出 10 發子彈，不耗彈匣。邊掃邊移動滑鼠可以掃一片。' },
    pin: { name: '釘射', cd: 7, mp: 10, desc: '射出沉重的箭，貫穿兩隻敵人，打中的被釘在原地 2 秒。' },
    leap: { name: '後躍射擊', cd: 7, mp: 10, desc: '往後躍開 4 公尺（躍開時不會受傷），同時往前射出三支箭。' },
    quake: { name: '震地', cd: 9, mp: 12, desc: '武器砸向地面，震波往前推進 5 公尺：震到的敵人暈眩、變慢。' },
    warcry: { name: '戰吼', cd: 16, mp: 10, desc: '6 秒內你和隊友的傷害 +25%，周圍的敵人變慢。' },
    frostnova: { name: '霜環', cd: 10, mp: 22, desc: '念出咒文，以自己為中心炸開一圈寒氣：周圍的敵人受傷、凍住 1.2 秒，之後變慢。' },
    chain: { name: '連鎖電擊', cd: 7, mp: 20, desc: '電流打向準心方向的敵人，再跳到附近最多四隻，每跳一次弱一點。' },
    smite: { name: '聖擊', cd: 8, mp: 16, desc: '在準心處落下一道光柱：0.35 秒後傷害並暈眩範圍內的敵人，回復 5% 生命。' },
    ward: { name: '守護之印', cd: 14, mp: 20, desc: '給自己和身邊的隊友一層護盾（6 秒），並解除變慢、看不清楚。' },
    flurry: { name: '亂斬', cd: 7, mp: 10, desc: '往前踏一步，0.5 秒內連砍五刀。' },
    parry: { name: '見切', cd: 8, mp: 8, desc: '擺出架勢 0.6 秒：這期間被遺跡生物打到會完全擋下，並反擊必定暴擊的一刀。' },
    shieldbash: { name: '盾擊', cd: 6, mp: 8, desc: '用盾牌撞向前方：敵人受傷、暈眩 1.4 秒並被撞退。' },
    guard: { name: '挺身護衛', cd: 15, mp: 12, desc: '5 秒內受到的傷害 −40%，周圍的敵人改打你；身邊隊友受到的傷害 −30%。' }
  });
  R.SKILL_SLOTS = { gunner: ['flashbang', 'barrage'], archer: ['pin', 'leap'], warrior: ['quake', 'warcry'], mage: ['frostnova', 'chain'], priest: ['smite', 'ward'], blade: ['flurry', 'parry'], knight: ['shieldbash', 'guard'] };
  R.SKILL_UNLOCK = [1, 3, 6, 10, 15];   // 2026-10-04 玩家回饋：技能格多一點（原本三格：1、3、6 級）——第四格 10 級、第五格 15 級，按鍵 5、6
  R.SKILL_KEYS = ['R／右鍵', '3', '4'];
  // 第 i 格（0～2）的技能；還沒學會是 null
  R.slotSkill = (P, i) => (i === 0 ? P.skill : P.lv >= R.SKILL_UNLOCK[i] ? (R.SKILL_SLOTS[P.cls] || [])[i - 1] || null : null);
  const cdOf = (P, i) => (i === 0 ? P.skillCd : (P.skCd && P.skCd[i]) || 0);

  // 技能的力道：用武器每秒的傷害換算（不然連射快、單發低的武器，技能會弱得很不公平）
  const power = ws => (ws.dmg * (ws.pellets > 1 ? ws.pellets : 1) * (ws.hits || 1) * ws.rate) / 2;

  // ---------- 用技能 ----------
  R.castSlot = i => {
    const w = W(), P = w.P; if (!P || !w.run || w.paused) return;
    if (i === 0) { R.useSkill(); return; }
    const id = R.slotSkill(P, i);
    if (!id) { R.toast('職業等級 ' + R.SKILL_UNLOCK[i] + ' 才會學會這一格的技能'); return; }
    const sk = R.SKILLS[id]; P.skCd = P.skCd || [0, 0, 0];
    if (P.skCd[i] > 0 || P.dead || P.knockT > 0 || P.jump || P.stance > 0) return;
    if (P.mp < sk.mp) { R.toast('魔力不夠'); return; }
    P.mp -= sk.mp; P.skCd[i] = sk.cd * P.skillCdMult;
    if (cast(id, P, w) === false) { P.mp += sk.mp; P.skCd[i] = 0.3; return; }   // 放不出來（例如沒有目標）：魔力還回去
    R.sfx && R.sfx('skill');
  };
  const cast = (id, P, w) => {
    const a = P.aimA, ws = P.ws, pow = power(ws), x0 = P.x, z0 = P.z;
    const aimIn = max => { const d = Math.hypot(P.aimX - P.x, P.aimZ - P.z), k = d > max ? max / d : 1; return [P.x + (P.aimX - P.x) * k, P.z + (P.aimZ - P.z) * k]; };
    const near = r => w.enemies.filter(e => !e.dead && !e.under && dist(e, P) < r + e.def.size * 0.5);
    switch (id) {
      case 'flashbang': {
        const [x, z] = aimIn(9), d = Math.hypot(x - P.x, z - P.z), t = 0.45;
        const s = R.fire({ kind: 'grenade', owner: 'p', x: P.x, z: P.z, a: Math.atan2(x - P.x, z - P.z), speed: Math.max(1, d / t), dmg: pow * 0.5, life: 3, primary: false });
        s.grav = true; s.y = 1.4; s.vy = 20 * t / 2; s.flash = true; P.h.recoil = 1; break;
      }
      case 'barrage':
        for (let i = 0; i < 10; i++) later(() => { const aa = P.aimA + (Math.random() - 0.5) * 0.22; R.fire({ kind: 'bullet', owner: 'p', x: P.x + Math.sin(aa) * 0.8, z: P.z + Math.cos(aa) * 0.8, a: aa, speed: 30, dmg: pow * 0.32, life: 0.6, primary: true }); R.fx('muzzle', P.x + Math.sin(aa) * 0.9, 1.15, P.z + Math.cos(aa) * 0.9, {}); P.h.recoil = 1; R.sfx && R.sfx('gun'); }, i * 60);
        break;
      case 'pin': R.fire({ kind: 'arrow', owner: 'p', x: P.x, z: P.z, a, speed: 32, dmg: pow * 1.9, life: 0.8, pierce: 2, primary: false, root: 2 }); P.h.recoil = 1; R.sfx && R.sfx('bow'); break;
      case 'leap':
        R.dash(a + Math.PI, 4.2, 0.26, { iframe: true }); R.startRoll(P.h, a + Math.PI, 0.26); R.fx('dust', P.x, 0.15, P.z, {});
        for (let k = -1; k <= 1; k++) R.fire({ kind: 'arrow', owner: 'p', x: P.x, z: P.z, a: a + k * 0.13, speed: 26, dmg: pow * 1.1, life: 0.8, primary: true });
        R.sfx && R.sfx('bow'); break;
      case 'quake':
        P.stance = 0.3; R.swingAnim(P.h, 0.2, 0.45);
        later(() => { for (let k = 1; k <= 3; k++) later(() => { const x = x0 + Math.sin(a) * k * 1.6, z = z0 + Math.cos(a) * k * 1.6; R.fx('ring', x, 0.1, z, { r: 1.9, color: '#C8B08A' }); R.fx('dust', x, 0.15, z, { n: 10 }); R.fx('rock', x, 0.4, z, {}); R.aoe(x, z, 1.9, pow * 1.5, { stun: 0.7 }); w.enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < 1.9 + e.def.size * 0.5) e.st.slow = Math.max(e.st.slow, 2); }); if (k === 1) R.shake(0.35); }, (k - 1) * 90); }, 200);
        break;
      case 'warcry':
        P.buff.warcry = 6; R.fx('ring', P.x, 0.1, P.z, { r: 6, color: '#E8603A' }); R.fx('ring', P.x, 0.1, P.z, { r: 3, color: '#FFB45A' });
        near(6).forEach(e => { e.st.slow = Math.max(e.st.slow, 3); }); R.shake(0.15); break;
      case 'frostnova':
        R.fx('ring', P.x, 0.1, P.z, { r: 3.6, color: '#BFE6FF' }); R.fx('poof', P.x, 0.6, P.z, { color: '#DDF2FF', n: 22 });
        near(3.6).forEach(e => { R.hurtEnemy(e, pow * 1.4, { root: e.def.boss ? 0.3 : 1.2 }); e.st.slow = Math.max(e.st.slow, 3.5); }); break;
      case 'chain': {
        let tg = R.nearestEnemy(P.x, P.z, 10, a) || R.nearestEnemy(P.x, P.z, 6); if (!tg) { R.toast('附近沒有敵人'); return false; }
        const hit = new Set(); let from = { x: P.x, z: P.z }, dmg = pow * 1.8;
        for (let j = 0; j < 5 && tg; j++) {
          const f0 = from, t0 = tg, d0 = dmg;
          later(() => { if (t0.dead) return; R.fx('bolt', f0.x, 1, f0.z, { to: t0 }); R.hurtEnemy(t0, d0, { stun: 0.25 }); }, j * 70);
          hit.add(tg); from = tg; dmg *= 0.85;
          tg = w.enemies.filter(e => !e.dead && !e.under && !hit.has(e) && dist(e, from) < 5).sort((p, q) => dist(p, from) - dist(q, from))[0];
        }
        break;
      }
      case 'smite': {
        const [x, z] = aimIn(10); R.fx('mark', x, 0, z, { r: 2, t: 0.35 });
        later(() => { R.fx('pillar', x, 0, z, { r: 1.3, color: '#FFE8A0' }); R.fx('ring', x, 0.1, z, { r: 2.2, color: '#FFE8A0' }); R.aoe(x, z, 2, pow * 2.6, { stun: 0.8 }); R.healP(P.hpMax * 0.05); R.shake(0.2); }, 350);
        break;
      }
      case 'ward':
        P.shield = Math.max(P.shield, P.hpMax * 0.25); P.buff.shieldT = Math.max(P.buff.shieldT || 0, 6); P.slowT = 0; P.blindT = 0;
        (w.allies || []).forEach(al => { if (!al.downed && dist(al, P) < 6) { al.shield = Math.max(al.shield || 0, al.hpMax * 0.2); al.shieldT = 6; R.fx('ring', al.x, 0.1, al.z, { r: 1.2, color: '#FFE8A0' }); } });
        R.fx('ring', P.x, 0.1, P.z, { r: 6, color: '#FFE8A0' }); R.fx('block', P.x, 1.2, P.z); break;
      case 'flurry':
        R.dash(a, 1.2, 0.12, {}); P.stance = 0.55;
        for (let i = 0; i < 5; i++) later(() => { R.swingAnim(P.h, 0.02, 0.1); R.melee(P.aimA, 2.6, 1.6, pow * 0.75, 0, 0, 0.5, { dir: i % 2 ? -1 : 1, hs: 1, kb: 0.3 }); R.sfx && R.sfx('swing'); }, 100 + i * 100);
        break;
      case 'parry':
        P.parryT = 0.6; P.stance = 0.6; R.swingAnim(P.h, 0.6, 0.62); R.fx('ring', P.x, 0.1, P.z, { r: 1.4, color: '#FFFFFF' }); break;
      case 'shieldbash':
        R.dash(a, 1, 0.1, {}); R.swingAnim(P.h, 0.04, 0.3);
        R.melee(a, 2.4, 1.9, pow * 1.6, 0, 0.06, 0.3, { stun: 1.4, kb: 2.5, primary: false, hs: 1, dir: 1 }); later(() => R.fx('block', P.x + Math.sin(a) * 1.2, 1.1, P.z + Math.cos(a) * 1.2), 60);
        break;
      case 'guard':
        P.buff.guard = 5; P.taunt = 5; R.fx('ring', P.x, 0.1, P.z, { r: 4.5, color: '#C9A13A' }); R.fx('block', P.x, 1.2, P.z); break;
    }
  };

  R.castSkillId = id => { const w = W(); return cast(id, w.P, w); };   // skillbook.js：任何一格都能放這十四個技能
  // 閃光彈：落地後不是爆炸，是一陣強光
  const explode0 = R.explode;
  R.explode = s => {
    if (!s.flash) { explode0(s); return; }
    R.killShot(s); R.fx('boom', s.x, 0.6, s.z, { r: 3.2, color: '#FFFFFF' }); R.fx('poof', s.x, 1, s.z, { color: '#FFF8E0', n: 16 });
    W().enemies.forEach(e => { if (!e.dead && !e.under && Math.hypot(e.x - s.x, e.z - s.z) < 3.2 + e.def.size * 0.5) R.hurtEnemy(e, s.dmg, { stun: e.def.boss ? 0.4 : 1.6 }); });
    R.addAware(2, 'boom');
  };

  // ---------- 受傷：見切、挺身護衛、守護之印 ----------
  const hurtPlayer0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const P = W().P;
    // 見切：只擋遺跡生物（和牠們的投射物）；陷阱、崩塌擋不住
    if (P && P.parryT > 0 && !P.dead && P.iframe <= 0 && !(P.air > 0) && src && src.def && !src.dead) {
      P.parryT = 0; P.stance = 0; P.iframe = 0.5;
      R.fx('block', P.x, 1.2, P.z); R.fx('spark', P.x, 1.2, P.z, { a: angTo(P, src), crit: true }); R.num(P.x, 2.6, P.z, '見切', 'crit');
      const tg = dist(src, P) < 5 ? src : R.nearestEnemy(P.x, P.z, 4);
      if (tg) { P.aimA = angTo(P, tg); R.swingAnim(P.h, 0.02, 0.25); R.melee(P.aimA, Math.max(2.4, dist(tg, P) + 0.5), 1.2, power(P.ws) * 3, 0, 0, 0, { crit: true, kb: 2, primary: false, hs: 1, dir: -1 }); }
      return;
    }
    if (P && P.buff && P.buff.guard > 0) raw *= 0.6;
    hurtPlayer0(raw, src, o);
  };
  const hurtAlly0 = R.hurtAlly;
  R.hurtAlly = (a, raw, src) => {
    const P = W().P;
    if (a && !a.downed && a.iframe <= 0) {
      if (P && P.buff && P.buff.guard > 0 && dist(a, P) < 4.5) raw *= 0.7;
      if (a.shield > 0) { const s = Math.min(a.shield, raw); a.shield -= s; raw -= s; if (raw <= 0) { a.iframe = 0.2; return; } }
    }
    hurtAlly0(a, raw, src);
  };
  // 戰吼：你和隊友的傷害 +25%（別的隊伍不算）
  const hurtEnemy0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { const P = W().P; return hurtEnemy0(e, P && P.buff && P.buff.warcry > 0 ? raw * 1.25 : raw, o); };
  const allyHit0 = R.allyHit;
  R.allyHit = (e, dmg, by) => { const P = W().P; allyHit0(e, P && P.buff && P.buff.warcry > 0 && !(by && by.rival) ? dmg * 1.25 : dmg, by); };

  // ---------- 頓幀：打中的瞬間整個畫面停一下 ----------
  R.hitStop = t => { const w = W(); w.hitStop = Math.max(w.hitStop || 0, t); };
  const step0 = R.step;
  R.step = dt => {
    const w = W(), P = w.P;
    if (w.hitStop > 0) { w.hitStop -= dt; dt *= 0.06; }
    if (P) {
      if (P.skCd) for (let i = 1; i < R.SKILL_UNLOCK.length; i++) if (P.skCd[i] > 0) P.skCd[i] = Math.max(0, P.skCd[i] - dt);
      if (P.parryT > 0) P.parryT -= dt;
      if (P.taunt > 0) P.taunt -= dt;
    }
    (w.allies || []).forEach(a => { if (a.shieldT > 0) { a.shieldT -= dt; if (a.shieldT <= 0) a.shield = 0; } });
    step0(dt);
  };

  // ---------- 升級：學會新技能 ----------
  const gainXp0 = R.gainXp;
  R.gainXp = v => {
    const st = R.S.classes[R.S.cls], before = st.lv;
    gainXp0(v);
    const P = W().P;
    R.SKILL_UNLOCK.forEach((u, i) => { if (i >= 3 && before < u && st.lv >= u) setTimeout(() => R.banner('技能多一格（第 ' + (i + 1) + ' 格，按鍵 ' + (i + 2) + '）', '到技能書把學會的技能裝上去'), 2400); });
    [1, 2].forEach(i => { if (before < R.SKILL_UNLOCK[i] && st.lv >= R.SKILL_UNLOCK[i]) { const id = (R.SKILL_SLOTS[R.S.cls] || [])[i - 1]; if (id) setTimeout(() => R.banner('學會新技能：' + R.SKILLS[id].name, (R.touch ? '技能按鈕' : '按 ' + R.SKILL_KEYS[i]) + '・' + R.SKILLS[id].desc), 1800); } });
    if (P) { P.lv = st.lv; hudSkills(true); }
  };

  // ---------- 畫面：三個技能按鈕 ----------
  const slotEl = i => (i === 0 ? { b: $('r-skill'), n: $('r-skill-n'), cd: $('r-skill-cd') } : { b: $('r-skill' + (i + 1)), n: $('r-skill' + (i + 1) + '-n'), cd: $('r-skill' + (i + 1) + '-cd') });
  let shown = '';
  const hudSkills = force => {
    const P = W().P; if (!P) return;
    const key = R.SKILL_UNLOCK.map((u, i) => R.slotSkill(P, i)).join('|') + P.lv;
    if (!force && key === shown) return; shown = key;
    R.SKILL_UNLOCK.slice(1).map((u, k) => k + 1).forEach(i => {
      const el = slotEl(i); if (!el.b) return; const id = R.slotSkill(P, i), sk = id && R.SKILLS[id];
      el.n.textContent = sk ? sk.name : 'Lv ' + R.SKILL_UNLOCK[i];
      el.b.classList.toggle('locked', !sk);
      el.b.title = sk ? sk.name + '：' + sk.desc + '（魔力 ' + sk.mp + '、冷卻 ' + sk.cd + ' 秒）' : '職業等級 ' + R.SKILL_UNLOCK[i] + ' 打開這一格' + ((R.SKILL_SLOTS[P.cls] || [])[i - 1] && R.SKILLS[(R.SKILL_SLOTS[P.cls] || [])[i - 1]] ? '：' + R.SKILLS[(R.SKILL_SLOTS[P.cls] || [])[i - 1]].name : '（到技能書裝技能）');
    });
  };
  const hudFloor0 = R.hudFloor;
  R.hudFloor = () => { hudFloor0(); const r3 = $('r-skill3'), r4 = $('r-skill4'), r5 = $('r-skill5'); if (r3 && r4 && r5 && r3.nextElementSibling !== r4) r3.after(r4, r5); hudSkills(true); };   // 第四、五格緊跟在第三格後面（大招鈕之前）
  const hudTick0 = R.hudTick;
  R.hudTick = dt => {
    hudTick0(dt);
    const P = W().P; if (!P) return;
    hudSkills(false);
    R.SKILL_UNLOCK.slice(1).map((u, k) => k + 1).forEach(i => { const el = slotEl(i), id = R.slotSkill(P, i); if (!el.cd) return; el.cd.style.height = id ? (cdOf(P, i) / (R.SKILLS[id].cd * P.skillCdMult) * 100) + '%' : '0%'; });
  };

  // ---------- 按鍵：3、4（指揮選單打開時 1～5 是選命令，不放技能）----------
  // 用捕獲階段：比 run.js 的按鍵處理早一步，才知道選單是不是本來就開著
  window.addEventListener('keydown', e => {
    const w = W(); if (!w.run || w.town || !$('run') || $('run').hidden || w.paused || (R.sheetOpen && R.sheetOpen())) return;
    if (R.orderOpen && R.orderOpen()) return;
    if (e.key === '3') R.castSlot(1); else if (e.key === '4') R.castSlot(2); else if (e.key === '5') R.castSlot(3); else if (e.key === '6') R.castSlot(4);
  }, true);
  const tact0 = R.tact;
  R.tact = a => { const m = /^skill([2-5])$/.exec(a); if (m) { if (W().run && !W().town) R.castSlot(+m[1] - 1); return; } tact0(a); };
})(window.R);
