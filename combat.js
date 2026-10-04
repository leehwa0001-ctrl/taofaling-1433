// 討伐令 1433：戰鬥（武器、技能、遺跡生物的行為、傷害、佩特拉的注意與反應）
(function (R) {
  const T = () => THREE;
  const W = () => R.W;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  R.hasAdv = id => W().P && W().P.adv === id;
  // 敵人打到的是玩家還是隊友
  const hurtT = (T0, dmg, src, o) => (T0 && T0.ally ? R.hurtAlly(T0, dmg, src) : R.hurtPlayer(dmg, src, o));
  // 延遲的攻擊：換樓層、回到地面或倒下之後就不再發生
  const later = (f, ms) => { const run = W().run, sc = W().scene; setTimeout(() => { const w = W(); if (w.run === run && w.scene === sc && w.P && !w.P.dead && !run.done) f(); }, ms); };

  // ---------- 玩家數值 ----------
  R.calcPlayer = (cls) => {
    const c = R.CLASSES[cls], st = R.S.classes[cls], eq = R.equipped(cls), items = R.GEAR_KEYS.map(k => eq[k]);
    const lv = st.lv, sum = id => R.affixSum(items, id);
    const arm = R.SLOTS.reduce((a, s) => { const x = R.armorStats(eq[s.id]); a.def += x.def; a.spd += x.spd; return a; }, { def: 0, spd: 0 });
    const P = { cls, adv: st.adv, lv };
    P.hpMax = Math.round(c.hp * (1 + 0.035 * (lv - 1)) + sum('vital') * 1 - (sum('cursed') ? c.hp * 0.15 : 0));
    P.mpMax = Math.round(c.mp * (1 + 0.03 * (lv - 1)) + sum('spirit'));
    P.def = arm.def + sum('tough');
    P.speed = c.speed * (1 + arm.spd) * (st.adv === 'ranger' ? 1.1 : 1);
    P.dmgMult = 1 + 0.03 * (lv - 1);
    P.dodgeCdMax = 1.4 * (1 - sum('evade') / 100) * (st.adv === 'ranger' ? 0.7 : 1);
    P.skillCdMult = 1 - sum('focus') / 100;
    P.regen = sum('regen') / 10;
    P.calm = sum('calm') / 100 + (st.adv === 'shinkan' ? 0.4 : 0);
    P.greed = sum('greed') / 100;
    P.item = eq.weapon; P.ws = R.weaponStats(eq.weapon);
    if (st.adv === 'sniper') P.ws.crit += 0.15;
    if (st.adv === 'gladiator') P.ws.rate *= 1.2;
    if (st.adv === 'dragoon' && P.ws.kind === 'thrust') P.ws.range *= 1.25;
    if (st.adv === 'fistsaint') { P.ws.rate *= 1.2; P.ws.crit += 0.05; }   // 拳聖
    if (st.adv === 'staffmonk') { P.ws.range *= 1.2; if (P.ws.arc) P.ws.arc *= 1.2; }   // 棍僧
    if (st.adv === 'waixiu') { P.skillCdMult *= 0.85; P.calm -= 0.2; P.wxShield = 0.15; }   // 外修者：施法快、魔力罩；魔力外放，佩特拉比較注意得到
    P.critMult = st.adv === 'kensei' ? 2.3 : 1.8;
    P.skill = st.adv ? R.ADV[cls].find(a => a.id === st.adv).skill : c.skill;
    return P;
  };

  // ---------- 傷害數字、特效 ----------
  R.fx = (kind, x, y, z, o) => R.addFx && R.addFx(kind, x, y, z, o || {});
  R.num = (x, y, z, txt, cls) => R.addNum && R.addNum(x, y, z, txt, cls);

  // ---------- 對遺跡生物造成傷害 ----------
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P; o = o || {};
    if (e.dead) return 0;
    if (e.invuln) { if (Math.random() < 0.3) R.num(e.x, 1.8 * e.def.size + 0.6, e.z, '無效', ''); return 0; }
    let dmg = raw * P.dmgMult;
    if (P.adv === 'berserker') dmg *= 1 + 0.4 * (1 - P.hp / P.hpMax);
    if (P.buff.rage > 0) dmg *= 1.5;
    if (P.adv === 'hama') dmg *= 1.2;
    if (P.adv === 'onimusha' && P.hp < P.hpMax * 0.5) dmg *= 1.15;
    if (P.adv === 'yoto') dmg *= 1 + Math.min(0.6, (P.stacks || 0) / 100);
    if (P.adv === 'shadow' && o.fromBehind !== false) { const back = Math.abs(wrap(angTo(e, P) - e.yaw)) > 2.1; if (back) dmg *= 1.5; }
    if (e.st.curse > 0) dmg *= 1.3;
    if (e.def.armor) dmg *= 1 - e.def.armor * (1 - (P.pen || 0));   // 穿透：無視一部分護甲
    let crit = o.crit || Math.random() < (o.critChance != null ? o.critChance : P.ws.crit) || (P.crits > 0 && o.primary);
    if (P.crits > 0 && o.primary) P.crits--;
    if (crit) dmg *= P.critMult;
    R.lastCrit = !!crit;
    if (R.enemyDefend) dmg = R.enemyDefend(e, dmg, o, crit);
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg; e.flash = 0.12; e.aggro = true; e.provoked = true;
    if (e.dormant && R.wakeRoom) R.wakeRoom(e.room, e);   // 從外面打到房間裡還沒醒的生物：整間都醒過來
    R.num(e.x, 1.8 * e.def.size + 0.6, e.z, dmg, crit ? 'crit' : '');
    // 附加效果
    const ws = P.ws;
    const elem = o.elem || (P.elemShots > 0 && o.primary ? ['fire', 'frost', 'shock'][P.elemShots % 3] : null) || (P.adv === 'magigun' && o.primary && Math.random() < 0.25 ? ['fire', 'frost', 'shock'][Math.floor(Math.random() * 3)] : null);
    if (o.primary && P.elemShots > 0) P.elemShots--;
    if (elem === 'fire' || (o.primary && Math.random() < ws.fire) || (P.adv === 'elementalist' && Math.random() < 0.1)) e.st.burn = 3;
    if (elem === 'frost' || (o.primary && Math.random() < ws.frost) || (P.adv === 'elementalist' && Math.random() < 0.1)) e.st.slow = 2;
    if (elem === 'shock' || (o.primary && Math.random() < ws.shock)) R.chain(e, dmg * 0.5);
    if (o.stun) e.st.stun = Math.max(e.st.stun, o.stun);
    if (o.root) e.st.root = Math.max(e.st.root, o.root);
    if (o.curse) e.st.curse = Math.max(e.st.curse, o.curse);
    if (o.primary && ws.stun && Math.random() < ws.stun) e.st.stun = 0.8;
    const kb = (o.kb != null ? o.kb : o.primary ? ws.kb : 0) * (e.def.boss ? 0.15 : 1);
    if (kb) { const a = angTo(P, e); e.kx += Math.sin(a) * kb * 6; e.kz += Math.cos(a) * kb * 6; }
    if (ws.vamp && o.primary) R.healP(dmg * ws.vamp, true);
    if (P.buff.rage > 0) R.healP(dmg * 0.05, true);
    if (e.hp <= 0) R.killEnemy(e);
    return dmg;
  };
  R.chain = (from, dmg) => {
    const others = W().enemies.filter(e => !e.dead && e !== from && dist(e, from) < 6).slice(0, 2);
    others.forEach(e => { R.fx('bolt', from.x, 1, from.z, { to: e }); R.hurtEnemy(e, dmg / W().P.dmgMult, { elem: null }); });
  };
  R.killEnemy = (e, by) => {
    const w = W(), P = w.P; if (e.dead) return;
    e.dead = true; e.hp = 0;
    R.fx('poof', e.x, 1, e.z, { color: e.def.color, n: e.def.boss ? 40 : 14 });
    w.scene.remove(e.m.g);
    // 別的隊伍打倒的：經驗是他們的
    if (!(by && by.rival)) { R.gainXp(e.def.xp); w.run.kills++; } else if (Math.random() < 0.4) R.num(e.x, 2.4, e.z, '經驗被搶走了', 'hurt');
    w.run.killIds = w.run.killIds || {}; w.run.killIds[e.id] = (w.run.killIds[e.id] || 0) + 1;
    if (P.adv === 'yoto') P.stacks = Math.min(60, (P.stacks || 0) + 1);
    if (P.adv === 'hexer' && e.st.curse > 0) { const n = w.enemies.filter(o => !o.dead && dist(o, e) < 5)[0]; if (n) n.st.curse = 5; }
    if (e.def.human) { if (R.humanDown) R.humanDown(e); return; }   // 人：掉錢包、勇者證（不是遺跡生物，沒有魔力水晶）
    // 掉落：魔力水晶（遺跡生物體內的結晶）、費拉
    // 能帶出遺跡的只有體內的魔力水晶、魔力核心和外殼上的礦石（《遺跡》第一章第五節），所以遺跡生物不會掉費拉
    const g = w.run.grade.lv;
    if (Math.random() < 0.34 + g * 0.05) R.dropMat('crystal', 1, e.x, e.z);
    if ((e.def.coreChance && Math.random() < e.def.coreChance) || e.leader) R.dropMat('core', 1, e.x, e.z);
    if (e.def.ore) R.addOre(e.x, e.z);                       // 礦殼：死掉後可以掘礦
    if (e.def.boss) { R.dropMat('core', e.id === 'petra' ? 2 : 1, e.x, e.z); if (e.id === 'petra') R.dropMat('wing', 2, e.x + 1, e.z); R.onBossDown && R.onBossDown(e); }
    if (e.id === 'nurikabe' && Math.random() < 0.5) R.dropMat('manaore', 1, e.x, e.z);
  };

  // ---------- 對玩家造成傷害 ----------
  R.hurtPlayer = (raw, src, o) => {
    const P = W().P; o = o || {};
    if (P.dead || P.iframe > 0 || P.air > 0) return;
    let dmg = raw * (W().run.dmgScale || 1);
    dmg *= 1 - P.def / (P.def + 30);
    if (P.buff.fortress > 0) dmg *= 0.3;
    if (P.adv === 'templar') dmg *= 0.85;
    if (P.adv === 'onimusha' && P.hp < P.hpMax * 0.5) dmg *= 0.8;   // 鬼武者
    if (P.adv === 'staffmonk') dmg *= 0.9;   // 棍僧
    if (P.buff.kekkai > 0 && src && dist(src, P) < 4.5) dmg *= 0.6;
    // 騎士的盾：沒在攻擊時，擋下正面來的傷害
    if (R.CLASSES[P.cls].shield && src && P.atkHold <= 0) { const fa = Math.abs(wrap(angTo(P, src) - P.yaw)); if (fa < 1) { dmg *= 0.7; R.fx('block', P.x, 1.2, P.z); if (P.adv === 'paladin') R.healP(2, true); } }
    if (P.shield > 0) { const s = Math.min(P.shield, dmg); P.shield -= s; dmg -= s; }
    dmg = Math.round(dmg);
    if (P.buff.fortress > 0 && src && src.hp) R.hurtEnemy(src, raw * 0.3 / P.dmgMult, { fromBehind: false });
    if (dmg <= 0) return;
    P.hp -= dmg; P.iframe = 0.3; P.stumble = 1.2; P.hurtT = 0.25;
    R.num(P.x, 2.2, P.z, dmg, 'hurt');
    R.shake && R.shake(0.25);
    if (o.slow) P.slowT = Math.max(P.slowT, o.slow);
    if (o.blind) P.blindT = Math.max(P.blindT, o.blind);
    if (o.knock) { P.knockT = o.knock; }
    if (P.hp <= 0) {
      if (P.adv === 'bishop' && !W().F.saved) { W().F.saved = true; P.hp = Math.round(P.hpMax * 0.3); R.toast('聖光留住了你（這一層只有一次）'); return; }
      P.hp = 0; R.onPlayerDown && R.onPlayerDown();
    }
  };
  R.healP = (v, quiet) => { const P = W().P; const before = P.hp; P.hp = Math.min(P.hpMax, P.hp + v * (R.hasAdv('bishop') ? 1.3 : 1)); if (!quiet && P.hp > before) R.num(P.x, 2.2, P.z, '+' + Math.round(P.hp - before), 'heal'); };

  // ---------- 佩特拉的注意 ----------
  R.addAware = (v, why) => {
    const w = W(), P = w.P; if (!w.run || w.run.done) return;
    v *= 1 - Math.min(0.8, P.calm || 0);
    w.run.aware = Math.min(100, w.run.aware + v);
    if (w.run.aware >= 100 && !w.run.reacting) R.react();
  };
  R.react = () => {
    const w = W(), run = w.run, P = w.P, room = R.roomAt(P.x, P.z) || w.F.rooms[0];
    run.reacting = true; run.reactCount++;
    const type = run.reaction; run.reactionKnown = true;
    R.banner('佩特拉察覺到了破壞：' + R.REACTIONS[type].name, R.REACTIONS[type].desc);
    R.shake(0.8);
    if (type === 'squeeze') R.squeeze(room);
    else if (type === 'collapse') R.collapse(room);
    else if (type === 'bio') { for (let i = 0; i < 8 + 2 * run.grade.lv; i++) { const [x, z] = R.roomPoint(room, { edge: true, away: P, min: 3 }); R.spawnEnemy('gaki', x, z, room.i, { aggro: true }); } R.lockRoom(room, true); }
    else if (type === 'tail') R.tailCut(R.roomAt(P.x, P.z) || R.roomOf({ x: P.x, z: P.z, room: -1 }));
    else if (type === 'expel') {
      // 驅逐型：「當佩特拉核心其所在位置距受損區域距離過近時，便會前往其位置驅趕破壞者」——只有最深的那一層才夠近
      if (run.floor < run.floors - 1) R.toast('遠處有什麼轉過來看了一眼……但佩特拉核心離這裡太遠了。');
      else if (run.grade.boss === 'petra') {
        let core = w.enemies.find(e => e.id === 'petra' && !e.dead); const [cx, cz] = R.nearestFloor(P.x + 6, P.z + 6);
        if (!core) { core = R.spawnEnemy('petra', cx, cz, room.i, { aggro: true }); const br = w.F.rooms.find(r => r.type === 'boss'); if (br) { br.coreOut = true; br.cleared = true; } }
        else { core.x = cx; core.z = cz; core.room = room.i; core.aggro = true; }
        R.banner('佩特拉核心親自過來了', '驅逐型：它要把破壞者趕出去');
      } else {
        const [cx, cz] = R.nearestFloor(P.x + 6, P.z + 6), e = R.spawnEnemy('petra', cx, cz, room.i, { aggro: true }); e.invuln = true; let left = 18;
        R.banner('佩特拉核心親自過來了', '保留區的核心打不動，也不准打。快逃到回歸水晶或入口！');
        w.dyn.push(dt => { if (e.dead) return false; left -= dt; if (left <= 0) { e.dead = true; w.scene.remove(e.m.g); R.toast('佩特拉核心回到了深處。'); return false; } return true; });
      }
    }
    setTimeout(() => { run.aware = 35; run.reacting = false; }, 9000);
  };

  // ---------- 投射物 ----------
  const SHOT_LOOK = {
    bullet: { c: '#FFE08A', s: [0.12, 0.12, 0.5] }, arrow: { c: '#E8D8B8', s: [0.06, 0.06, 0.9] }, orb: { c: '#B89AFF', r: 0.26, glow: 1 }, holy: { c: '#FFE8A0', r: 0.24, glow: 1 },
    fire: { c: '#FF8A3A', r: 0.5, glow: 1 }, eorb: { c: '#7FD8FF', r: 0.24, glow: 1 }, ering: { c: '#FF5A6A', r: 0.22, glow: 1 }, sand: { c: '#D8B880', r: 0.3 }, cold: { c: '#BFE6FF', r: 0.28, glow: 1 },
    web: { c: '#EDEDED', r: 0.3 }, seed: { c: '#9ACF6A', r: 0.16 }, feather: { c: '#1E1E26', s: [0.08, 0.04, 0.7] }, kasa: { c: '#FFB0A0', r: 0.2, glow: 1 }, grenade: { c: '#6A6A70', r: 0.3 }, hama: { c: '#FFFFFF', s: [0.1, 0.1, 1.4], glow: 1 }, spirit: { c: '#E8E0FF', r: 0.18, glow: 1 }
  };
  const shotGeo = {}, shotMat = {};
  R.fire = (o) => {
    const TH = T(), look = SHOT_LOOK[o.kind] || SHOT_LOOK.bullet;
    const key = o.kind; if (!shotGeo[key]) shotGeo[key] = look.s ? new TH.BoxGeometry(...look.s) : new TH.SphereGeometry(look.r, 8, 6);
    if (!shotMat[key]) { shotMat[key] = look.glow ? new TH.MeshBasicMaterial({ color: look.c }) : new TH.MeshLambertMaterial({ color: look.c }); shotMat[key].userData.shared = true; shotGeo[key].userData.shared = true; }
    const mesh = new TH.Mesh(shotGeo[key], shotMat[key]);
    const s = Object.assign({ y: 1.1, life: 1.5, pierce: 0, hit: new Set(), rad: look.r || 0.2, mesh }, o);
    s.vx = Math.sin(o.a) * o.speed; s.vz = Math.cos(o.a) * o.speed;
    mesh.position.set(s.x, s.y, s.z); mesh.rotation.y = o.a; W().scene.add(mesh); W().shots.push(s);
    return s;
  };
  R.updateShots = dt => {
    const w = W(), P = w.P;
    for (const s of w.shots) {
      if (s.dead) continue;
      s.life -= dt;
      if (s.homing) { const tg = R.nearestEnemy(s.x, s.z, 12); if (tg) { const want = angTo(s, tg), cur = Math.atan2(s.vx, s.vz), d = wrap(want - cur), sp = Math.hypot(s.vx, s.vz), na = cur + Math.max(-s.homing * dt, Math.min(s.homing * dt, d)); s.vx = Math.sin(na) * sp; s.vz = Math.cos(na) * sp; s.a = na; } }
      if (s.grav) { s.vy -= 20 * dt; s.y += s.vy * dt; }
      s.x += s.vx * dt; s.z += s.vz * dt;
      s.mesh.position.set(s.x, s.y, s.z); s.mesh.rotation.y = Math.atan2(s.vx, s.vz);
      if (s.grav && s.y <= 0.2) { R.explode(s); continue; }
      const blk = R.pointBlocked(s.x, s.z);
      if (blk && !s.grav) {
        if (blk.tag === 'prop' && s.owner === 'p') R.hitProp(blk.ref, s.dmg, true);
        if (s.splash || s.kind === 'fire') R.explode(s); else if (s.kind === 'web') R.webZone(s.x, s.z); else R.killShot(s);
        continue;
      }
      if (s.owner === 'p') {
        for (const e of w.enemies) {
          if (e.dead || s.hit.has(e) || e.under) continue;
          if (Math.hypot(e.x - s.x, e.z - s.z) < s.rad + e.def.size * 0.7) {
            s.hit.add(e);
            if (s.kind === 'fire' || s.splash) { R.explode(s); break; }
            const extra = s.kind === 'hama' && (e.id === 'chochin' || e.id === 'onibi') ? 99 : 1;
            if (s.ally) R.allyHit(e, s.dmg * extra, s.by); else R.hurtEnemy(e, s.dmg * extra, { primary: s.primary, elem: s.elem, crit: s.crit, root: s.root, stun: s.stun });
            if (s.pierce-- <= 0) { R.killShot(s); break; }
          }
        }
      } else if (!P.dead && Math.hypot(P.x - s.x, P.z - s.z) < s.rad + 0.45) {
        if (P.buff.kekkai > 0) { R.killShot(s); continue; }
        R.hurtPlayer(s.dmg, s.src, { blind: s.kind === 'sand' ? 2 : 0, slow: s.kind === 'cold' || s.kind === 'web' ? 2 : 0 });
        if (s.kind === 'web') R.webZone(s.x, s.z);
        R.killShot(s);
      } else if (w.allies && w.allies.some(a => !a.downed && Math.hypot(a.x - s.x, a.z - s.z) < s.rad + 0.45 && (R.hurtAlly(a, s.dmg, s.src), true))) R.killShot(s);
      else if (P.buff.kekkai > 0 && Math.hypot(P.x - s.x, P.z - s.z) < 4.2) R.killShot(s);
      if (s.life <= 0) { if (s.splash || s.kind === 'fire') R.explode(s); else R.killShot(s); }
    }
    w.shots = w.shots.filter(s => !s.dead);
  };
  R.killShot = s => { s.dead = true; W().scene.remove(s.mesh); };
  R.explode = s => {
    R.killShot(s);
    const r = s.radius || (s.kind === 'grenade' ? 3.6 : s.kind === 'fire' ? 3 : 1.4), mult = s.kind === 'grenade' && R.hasAdv('bomber') ? 1.4 : 1;
    R.fx('boom', s.x, 0.6, s.z, { r, color: s.kind === 'grenade' ? '#FFB45A' : s.kind === 'fire' ? '#FF7A3A' : '#B89AFF' });
    R.aoe(s.x, s.z, r, s.dmg * mult, { burn: s.kind === 'fire', props: true, primary: s.primary });
    if (s.kind === 'grenade') R.addAware(R.hasAdv('bomber') ? 4 : 6, 'boom');
  };
  // 範圍傷害
  R.aoe = (x, z, r, dmg, o) => {
    o = o || {}; let n = 0;
    W().enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < r + e.def.size * 0.5) { R.hurtEnemy(e, dmg, { primary: o.primary, stun: o.stun, root: o.root, curse: o.curse, kb: o.kb, crit: o.crit }); if (o.burn) e.st.burn = 3; n++; } });
    if (o.props !== false) W().F.props.forEach(p => { if (p.alive && Math.hypot(p.x - x, p.z - z) < r + 0.4) R.hitProp(p, dmg, !o.noAware); });
    return n;
  };
  // 打破東西：會讓佩特拉注意到（內修者除外）
  R.hitProp = (p, dmg, byPlayer) => {
    if (!p.alive) return;
    p.hp -= dmg;
    if (p.hp > 0) { p.mesh.rotation.z = (Math.random() - 0.5) * 0.2; return; }
    p.alive = false; p.col.on = false; W().F.group.remove(p.mesh);
    if (p.kind === 'plug') { R.fx('poof', p.x, 1, p.z, { color: '#7A3A4A', n: 16 }); if (byPlayer) R.addAware(3, 'prop'); R.toast('肉壁破了一個洞'); return; }
    R.fx('poof', p.x, 0.6, p.z, { color: p.kind === 'crystal' ? '#8AE8FF' : '#8A6A4A', n: 10 });
    if (byPlayer && !R.hasAdv('inner')) R.addAware(p.kind === 'crystal' ? 8 : 5, 'prop');
    const r = Math.random(), g = W().run.grade.lv;
    if (p.kind === 'crystal' && r < 0.7) R.dropMat('crystal', 1, p.x, p.z);
    else if (r < 0.45) R.dropGold(Math.round(rnd(1, 4) * (1 + g * 0.5) * (1 + W().P.greed)), p.x, p.z);
    else if (r < 0.55) R.dropFruit(p.x, p.z);
  };

  // ---------- 玩家攻擊 ----------
  R.attack = () => {
    const w = W(), P = w.P, ws = P.ws;
    if (P.atkCd > 0 || P.dead || P.knockT > 0 || P.stance > 0) return;
    const aim = P.aimA;
    if (ws.kind === 'gun') {
      if (P.reloadT > 0) return;
      if (P.ammo <= 0) { R.reload(); return; }
      P.ammo--; P.atkCd = 1 / ws.rate; P.h.recoil = 1;
      for (let i = 0; i < ws.pellets; i++) R.fire({ kind: 'bullet', owner: 'p', x: P.x + Math.sin(aim) * 0.8, z: P.z + Math.cos(aim) * 0.8, a: aim + (Math.random() - 0.5) * ws.spread * (ws.pellets > 1 ? 1 : 1) + (ws.pellets > 1 ? (i - (ws.pellets - 1) / 2) * ws.spread / ws.pellets : 0), speed: ws.speed, dmg: ws.dmg, life: ws.range / ws.speed, pierce: ws.pierce, primary: true, homing: ws.legend === 'petra' ? 3 : 0 });
      R.fx('muzzle', P.x + Math.sin(aim) * 0.9, 1.15, P.z + Math.cos(aim) * 0.9, {});
      R.sfx && R.sfx('gun');
      if (P.ammo <= 0) R.reload();
    } else if (ws.kind === 'bow') {
      if (ws.charge) { P.charging = true; return; }
      P.atkCd = 1 / ws.rate; P.h.recoil = 1;
      for (let i = 0; i < ws.pellets; i++) R.fire({ kind: 'arrow', owner: 'p', x: P.x, z: P.z, a: aim + (i - (ws.pellets - 1) / 2) * 0.12, speed: ws.speed, dmg: ws.dmg, life: ws.range / ws.speed, pierce: ws.pierce, primary: true, homing: R.hasAdv('arcane') ? 1.5 : 0 });
      R.sfx && R.sfx('bow');
    } else if (ws.kind === 'magic') {
      if (P.mp < ws.mp) { R.toast('魔力不夠'); P.atkCd = 0.4; return; }
      P.mp -= ws.mp; P.atkCd = 1 / ws.rate; P.h.recoil = 1;
      const n = ws.pellets || 1;
      for (let i = 0; i < n; i++) R.fire({ kind: ws.holy ? 'holy' : 'orb', owner: 'p', x: P.x, z: P.z, a: aim + (n > 1 ? (i - (n - 1) / 2) * (ws.spread || 0.25) : 0), speed: ws.speed, dmg: ws.dmg, life: ws.range / ws.speed, pierce: 0, primary: true, homing: ws.homing ? 3 : 0, splash: ws.splash ? 1 : 0, radius: ws.splash || 0 });
      if (ws.holy) R.healP(0.6, true);
      R.fx('muzzle', P.x + Math.sin(aim) * 0.7, 1.5, P.z + Math.cos(aim) * 0.7, { color: ws.holy ? '#FFE8A0' : '#C8B0FF' });
      R.sfx && R.sfx('magic');
    } else {
      const wind = Math.min(0.09, 0.16 / ws.rate), now = w.run.t;
      P.combo = now - (P.lastSwing == null ? -9 : P.lastSwing) < 1 / ws.rate + 0.45 ? ((P.combo || 0) + 1) % 3 : 0; P.lastSwing = now;
      const big = P.combo === 2, hits = ws.hits || 1;
      P.atkCd = 1 / ws.rate; P.atkHold = 0.35;
      R.swingAnim(P.h, wind, Math.min(0.45, 0.85 / ws.rate + wind));
      for (let k = 0; k < hits; k++) R.melee(aim, ws.range * (big ? 1.1 : 1), ws.kind === 'thrust' ? 0 : ws.arc * (big ? 1.15 : 1), ws.dmg * (big ? 1.2 : 1), ws.kind === 'thrust' ? ws.width : 0, wind + k * 0.08, 0, { dir: (P.combo + k) % 2 ? -1 : 1, big });
      if (ws.legend === 'rift') later(() => R.melee(aim, ws.range, ws.arc, ws.dmg * 0.6, 0, 0, 3), 150 + wind * 1000);
      R.sfx && R.sfx('swing');
    }
  };
  R.releaseBow = () => {
    const P = W().P, ws = P.ws; if (!P.charging) return;
    P.charging = false; const ch = Math.min(1, P.charge / 1.1); P.charge = 0;
    P.atkCd = 1 / ws.rate; P.h.recoil = 1;
    const leg = ws.legend === 'spetim';
    for (let i = 0; i < ws.pellets; i++) {
      if (leg) { const tg = R.nearestEnemy(P.x, P.z, ws.range, P.aimA); if (tg) { R.hurtEnemy(tg, ws.dmg * (0.6 + ch * 0.9), { primary: true }); R.fx('blink', tg.x, 1.2, tg.z); continue; } }
      R.fire({ kind: 'arrow', owner: 'p', x: P.x, z: P.z, a: P.aimA + (i - (ws.pellets - 1) / 2) * 0.1, speed: ws.speed * (0.7 + ch * 0.5), dmg: ws.dmg * (0.6 + ch * 0.9), life: ws.range / ws.speed * 1.3, pierce: ws.pierce + (ch > 0.95 ? 1 : 0), primary: true, homing: R.hasAdv('arcane') ? 1.5 : 0 });
    }
    R.sfx && R.sfx('bow');
  };
  R.melee = (a, range, arc, dmg, width, delay, fwd, o) => {
    const P = W().P, run = W().run;
    const go = () => {
      if (!W().run || W().run !== run || P.dead) return;
      const ox = P.x + Math.sin(a) * (fwd || 0), oz = P.z + Math.cos(a) * (fwd || 0);
      R.fx('swing', ox, 1.1, oz, { a, range, arc: arc || 0.5, width, color: P.ws.legend === 'kasoon' ? '#FFB45A' : '#FFFFFF', dir: o && o.dir, big: o && o.big });
      const inArc = (x, z, rad) => { const dx = x - ox, dz = z - oz, d = Math.hypot(dx, dz); if (width) { const along = dx * Math.sin(a) + dz * Math.cos(a), side = Math.abs(dx * Math.cos(a) - dz * Math.sin(a)); return along > -(d < rad + 1 ? rad + 0.6 : 0.3) && along < range + rad && side < width + rad; } const close = d < rad + 1; return d < range + rad && Math.abs(wrap(Math.atan2(dx, dz) - a)) < (close ? Math.max(arc / 2 + 0.2, 1.9) : arc / 2 + 0.2); };   // 貼身（作者 2026-10-04：拳師的普攻太近會空掉）：角度放寬到前方 ±110 度
      let hit = 0, crit = false;
      W().enemies.forEach(e => { if (!e.dead && inArc(e.x, e.z, e.def.size * 0.5)) { R.lastCrit = false; R.hurtEnemy(e, dmg, Object.assign({ primary: true }, o)); hit++; crit = crit || R.lastCrit; R.fx('spark', e.x, 0.9 + e.def.size * 0.4, e.z, { a, crit: R.lastCrit }); } });
      W().F.props.forEach(p => { if (p.alive && inArc(p.x, p.z, 0.4)) R.hitProp(p, dmg, true); });
      // 頓幀、震動只給一般攻擊和單發的技能（旋風斬那種一直轉的不停頓，不然會一卡一卡）
      if (hit && o && (o.dir || o.hs)) { if (R.hitStop) R.hitStop(crit ? 0.085 : o.big ? 0.06 : 0.04); if (crit || o.big) R.shake(crit ? 0.22 : 0.12); }
      if (P.ws.legend === 'kasoon') R.fireTrail(ox + Math.sin(a) * range * 0.6, oz + Math.cos(a) * range * 0.6);
    };
    if (delay) later(go, delay * 1000); else go();
  };
  R.reload = () => { const P = W().P; if (P.ws.kind !== 'gun' || P.reloadT > 0 || P.ammo >= P.ws.mag) return; P.reloadT = P.ws.reload; };

  // ---------- 翻滾 ----------
  R.dodge = () => {
    const P = W().P; if (P.dodgeCd > 0 || P.dead || P.knockT > 0 || P.dashT > 0 || P.jump) return;
    const mv = P.moveA != null ? P.moveA : P.aimA;
    // 0.32 秒滾大約 4 公尺；前 0.26 秒不會受傷
    P.dashT = 0.32; P.dashA = mv; P.dashSp = 12.5; P.dashEase = 0.32; P.iframe = 0.26; P.dodgeCd = P.dodgeCdMax; P.dashHit = null; P.dashEnd = null;
    R.startRoll(P.h, mv, 0.32); P.charging = false;
    R.fx('dust', P.x, 0.15, P.z, {});
    P.stumble = 0.55;   // 尾隨犬會趁這時候撲上來
  };

  // ---------- 技能 ----------
  R.useSkill = () => {
    const w = W(), P = w.P, sk = R.SKILLS[P.skill];
    if (P.skillCd > 0 || P.dead || P.knockT > 0) return;
    if (P.mp < sk.mp) { R.toast('魔力不夠'); return; }
    P.mp -= sk.mp; P.skillCd = sk.cd * P.skillCdMult;
    const a = P.aimA, ax = P.aimX, az = P.aimZ, ws = P.ws, base = ws.dmg * (ws.pellets > 1 ? ws.pellets : 1) * (ws.hits || 1) * 1.5;   // 2026-10-04 作者：技能提升到普攻的 3～5 倍——原本＝武器一下（霰彈只算一顆、雙刀只算一刀），現在＝一下普攻×1.5
    const aimIn = max => { const d = Math.hypot(ax - P.x, az - P.z); const k = d > max ? max / d : 1; return [P.x + (ax - P.x) * k, P.z + (az - P.z) * k]; };
    R.sfx && R.sfx('skill');
    switch (P.skill) {
      case 'roll': R.dash(a, 5, 0.25, { iframe: true }); P.ammo = ws.mag || P.ammo; P.reloadT = 0; P.crits = 3; break;
      case 'volley': { const [x, z] = aimIn(12); [0, 0.35, 0.7].forEach(t => later(() => { R.fx('rain', x, 0, z, { r: 2.8 }); R.aoe(x, z, 2.8, base * 0.9); }, t * 1000)); R.fx('mark', x, 0, z, { r: 2.8, t: 1 }); break; }
      case 'whirl': P.buff.whirl = 1.2; break;
      case 'fireball': R.fire({ kind: 'fire', owner: 'p', x: P.x, z: P.z, a, speed: 14, dmg: base * 2.4, life: 1.4, radius: 3, primary: false }); break;
      case 'heal': R.healP(P.hpMax * 0.35); P.shield = 20; P.buff.shieldT = 4; R.fx('ring', P.x, 0.1, P.z, { r: 2.5, color: '#FFE8A0' }); break;
      case 'flash': R.dash(a, 6.5, 0.18, { iframe: true, hit: base * 2 }); break;
      case 'charge': R.dash(a, 7, 0.3, { iframe: true, hit: base * 1.5, stun: 1.2, kb: 3 }); break;
      case 'snipe': P.stance = 0.5; later(() => { R.fire({ kind: 'bullet', owner: 'p', x: P.x, z: P.z, a: P.aimA, speed: 60, dmg: base * 5, life: 0.6, pierce: 99, primary: false, crit: true }); R.shake(0.3); }, 500); break;
      case 'element': P.elemShots = 12; P.ammo = ws.mag || P.ammo; P.reloadT = 0; break;
      case 'grenade': { const [x, z] = aimIn(11), d = Math.hypot(x - P.x, z - P.z), t = 0.6; const s = R.fire({ kind: 'grenade', owner: 'p', x: P.x, z: P.z, a: Math.atan2(x - P.x, z - P.z), speed: d / t, dmg: base * 3, life: 3, primary: false }); s.grav = true; s.y = 1.4; s.vy = 20 * t / 2; break; }
      case 'homing': for (let i = 0; i < 8; i++) R.fire({ kind: 'arrow', owner: 'p', x: P.x, z: P.z, a: a + (i - 3.5) * 0.18, speed: 20, dmg: base * 0.9, life: 1.6, homing: 5, primary: true }); break;
      case 'trap': { const [x, z] = aimIn(8); R.addZone({ kind: 'trap', x, z, r: 1.2, life: 20, dmg: base * 2 }); break; }
      case 'hamaya': R.fire({ kind: 'hama', owner: 'p', x: P.x, z: P.z, a, speed: 34, dmg: base * 3, life: 0.8, pierce: 99, primary: false }); break;
      case 'rage': P.buff.rage = 6; R.fx('ring', P.x, 0.1, P.z, { r: 2, color: '#FF5A4A' }); break;
      case 'combo': [0, 0.2, 0.4].forEach(t => R.melee(0, 3.2, Math.PI * 2, base * 0.9, 0, t, 0, { kb: 3 })); break;
      case 'qijin': P.stance = 0.3; later(() => { R.fx('ring', P.x, 0.2, P.z, { r: 3.5, color: '#BFE8FF' }); W().enemies.forEach(e => { if (!e.dead && dist(e, P) < 3.5 + e.def.size * 0.5) { if (e.id === 'nurikabe') { R.fx('poof', e.x, 1.2, e.z, { color: e.def.color, n: 24 }); R.killEnemy(e); } else R.hurtEnemy(e, base * 2, { kb: 5 }); } }); }, 300); break;
      case 'meteor': { const [x, z] = aimIn(13); R.fx('mark', x, 0, z, { r: 3.8, t: 0.8 }); later(() => { R.fx('boom', x, 0.6, z, { r: 3.8, color: '#FF7A3A' }); R.aoe(x, z, 3.8, base * 4, { burn: true }); R.shake(0.5); }, 800); break; }
      case 'hex': { const [x, z] = aimIn(12); R.fx('ring', x, 0.1, z, { r: 4, color: '#9A4ACF' }); W().enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < 4) { e.st.curse = 5; e.st.slow = 5; } }); break; }
      case 'shiki': P.orbit = Math.max(P.orbit || 0, 10); P.orbitN = 3; break;
      case 'sanctuary': R.addZone({ kind: 'sanct', x: P.x, z: P.z, r: 4, life: 6, dmg: base * 0.3 }); break;
      case 'wild': W().enemies.forEach(e => { if (!e.dead && dist(e, P) < 5) e.st.root = 2.5; }); P.buff.regen = 4; R.fx('ring', P.x, 0.1, P.z, { r: 5, color: '#6FB36A' }); break;
      case 'kekkai': P.buff.kekkai = 5; R.fx('ring', P.x, 0.1, P.z, { r: 4.2, color: '#FFFFFF' }); break;
      case 'iai': P.stance = 0.4; R.melee(a, 8, 0, base * 4, 0.9, 0.4, 0, { crit: true, primary: false }); later(() => R.fx('slash', P.x, 1, P.z, { a, len: 8 }), 400); break;
      case 'shadowstep': { const tg = R.nearestEnemy(P.x, P.z, 12); if (tg) { [P.x, P.z] = R.nearestFloor(tg.x - Math.sin(tg.yaw) * 1.4, tg.z - Math.cos(tg.yaw) * 1.4); R.collide(P, 0.42); R.fx('blink', P.x, 1, P.z); R.hurtEnemy(tg, base * 3, { primary: true }); P.invis = 2; } break; }
      case 'yotoRelease': { const k = (P.stacks || 0); R.fx('ring', P.x, 0.2, P.z, { r: 4, color: '#B83AE8' }); R.aoe(P.x, P.z, 4, base * (1.5 + k * 0.05)); P.stacks = Math.floor(k / 2); break; }
      case 'fortress': P.buff.fortress = 5; R.fx('ring', P.x, 0.1, P.z, { r: 1.8, color: '#C9A13A' }); break;
      case 'holycharge': R.dash(a, 7, 0.3, { iframe: true, hit: base * 1.5, stun: 1, kb: 3, end: () => { R.aoe(P.x, P.z, 3, base * 1.2); R.healP(P.hpMax * 0.15); R.fx('ring', P.x, 0.1, P.z, { r: 3, color: '#FFE8A0' }); } }); break;
      case 'jump': { const [x, z] = aimIn(9); P.jump = { t: 0, dur: 0.6, x0: P.x, z0: P.z, x1: x, z1: z }; P.air = 0.6; break; }
    }
  };
  // 衝刺（可以帶傷害）
  R.dash = (a, len, dur, o) => {
    const P = W().P; P.dashT = dur; P.dashA = a; P.dashSp = len / dur; P.dashEase = 0; if (o.iframe) P.iframe = dur + 0.1;
    P.dashHit = o.hit ? { dmg: o.hit, stun: o.stun, kb: o.kb, done: new Set() } : null; P.dashEnd = o.end || null;
  };
  // 地面上的區域：陷阱、聖域、蛛網
  R.addZone = z => {
    const TH = T(); const color = { trap: '#C9A13A', sanct: '#FFE8A0', web: '#E8E8E8', lava: '#FF5A1A', caltrop: '#8A8A92' }[z.kind];
    const m = new TH.Mesh(new TH.RingGeometry(z.kind === 'trap' ? 0.3 : z.r * 0.92, z.r, 24), new TH.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: TH.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(z.x, 0.06, z.z); W().scene.add(m); z.mesh = m; z.t = 0; W().zones.push(z); return z;
  };
  R.webZone = (x, z) => R.addZone({ kind: 'web', x, z, r: 1.8, life: 6 });
  R.fireTrail = (x, z) => R.addZone({ kind: 'lava', x, z, r: 0.9, life: 1.2, dmg: W().P.ws.dmg * 0.25, own: 'p' });
  R.updateZones = dt => {
    const w = W(), P = w.P;
    for (const z of w.zones) {
      z.life -= dt; z.t += dt;
      if (z.kind === 'trap') { const e = w.enemies.find(e => !e.dead && Math.hypot(e.x - z.x, e.z - z.z) < z.r + e.def.size * 0.4); if (e) { e.st.root = 3; R.hurtEnemy(e, z.dmg, {}); z.life = 0; R.fx('ring', z.x, 0.1, z.z, { r: 1.2, color: '#C9A13A' }); } }
      if (z.kind === 'sanct' && z.t > 0.5) { z.t = 0; if (Math.hypot(P.x - z.x, P.z - z.z) < z.r) R.healP(P.hpMax * 0.05, true); w.enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - z.x, e.z - z.z) < z.r) R.hurtEnemy(e, z.dmg, {}); }); }
      if (z.kind === 'web' && Math.hypot(P.x - z.x, P.z - z.z) < z.r) P.slowT = Math.max(P.slowT, 0.3);
      if (z.kind === 'caltrop' && Math.hypot(P.x - z.x, P.z - z.z) < z.r && !P.air) { P.slowT = Math.max(P.slowT, 0.6); if (z.t > 0.8) { z.t = 0; R.hurtPlayer(z.dmg, null); } }
      if (z.kind === 'lava') { if (z.own === 'p') { if (z.t > 0.3) { z.t = 0; w.enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - z.x, e.z - z.z) < z.r + 0.5) R.hurtEnemy(e, z.dmg, {}); }); } } else if (Math.hypot(P.x - z.x, P.z - z.z) < z.r) { if (z.t > 0.5) { z.t = 0; R.hurtPlayer(z.dmg, null); } } }
      if (z.life <= 0) { z.dead = true; w.scene.remove(z.mesh); R.disposeObj(z.mesh); }
      else z.mesh.material.opacity = 0.25 + 0.3 * Math.min(1, z.life);
    }
    w.zones = w.zones.filter(z => !z.dead);
  };

  // ---------- 遺跡生物 ----------
  R.spawnEnemy = (id, x, z, room, o) => {
    const w = W(), d = R.ENEMIES[id], g = w.run.grade.lv, f = w.run.floor;
    o = o || {};
    const m = o.human ? R.humanModel(o.human) : R.makeBeast(id, o.role);
    // 硬核：遺跡生物更硬、更痛，越深越強
    const tide = w.run.tide || 1, hpMul = (1 + 0.7 * (g - 1)) * 1.2 * (o.hpMul || 1) * tide, dmgMul = (1 + 0.45 * (g - 1)) * 1.45 * tide;   // 2026-10-04：照層數加的那一段（每層 +16% 生命、+10% 傷害）改到 deepbonus.js（照畫面上的層數，左上角看得到）
    const e = { id, def: d, m, x, z, yaw: 0, hp: d.hp * hpMul, hpMax: d.hp * hpMul, dmg: d.dmg * dmgMul, speed: d.speed, t: Math.random() * 5, cd: 1 + Math.random(), room, st: { burn: 0, slow: 0, stun: 0, root: 0, curse: 0 }, kx: 0, kz: 0, role: o.role, aggro: !!o.aggro, flash: 0, phase: 0 };
    m.g.position.set(x, 0, z); w.scene.add(m.g); w.enemies.push(e);
    if (!o.quiet) R.fx('spawn', x, 0.1, z, { color: d.color });
    return e;
  };
  // 生物所在的房間（被引出房間、在通道遊蕩的：用牠現在所在、或離牠最近的房間）
  R.roomOf = e => { const F = W().F; if (e.room >= 0 && F.rooms[e.room]) return F.rooms[e.room]; const i = R.roomIndexAt(e.x, e.z); if (i >= 0) return F.rooms[i]; let best = F.rooms[0], bd = 1e9; F.rooms.forEach(r => { const d = Math.hypot(r.x - e.x, r.z - e.z); if (d < bd) { bd = d; best = r; } }); return best; };
  R.nearestEnemy = (x, z, maxD, dirA) => { let best = null, bd = maxD || 1e9; for (const e of W().enemies) { if (e.dead || e.under) continue; const d = Math.hypot(e.x - x, e.z - z); if (dirA != null && Math.abs(wrap(Math.atan2(e.x - x, e.z - z) - dirA)) > 0.6) continue; if (d < bd) { bd = d; best = e; } } return best; };
  const move = (e, a, sp, dt) => { e.x += Math.sin(a) * sp * dt; e.z += Math.cos(a) * sp * dt; };
  R.updateEnemies = dt => {
    const w = W();
    for (const e of w.enemies) {
      if (e.dead) continue;
      if (e.dormant && Math.abs(e.x - w.P.x) + Math.abs(e.z - w.P.z) > 46) continue;
      // 目標：玩家或隊友之中最近的（騎士挑釁時先打騎士）
      e.tgtT = (e.tgtT || 0) - dt; if (e.tgtT <= 0 || !e.tgt || e.tgt.downed || e.tgt.dead) { e.tgtT = 0.8; e.tgt = R.pickTarget ? R.pickTarget(e) : w.P; }
      const P = e.tgt || w.P;
      e.t += dt; e.cd -= dt; e.flash = Math.max(0, e.flash - dt);
      const st = e.st; for (const k in st) st[k] = Math.max(0, st[k] - dt);
      if (e.dishT > 0) { e.dishT -= dt; if (e.dishT <= 0 && e.m.dish) e.m.dish.visible = true; }
      if (e.fade > 0) e.fade -= dt;
      if (st.burn > 0) { e.burnT = (e.burnT || 0) + dt; if (e.burnT > 0.5) { e.burnT = 0; R.hurtEnemy(e, 2.5 + w.run.grade.lv * 1.5, {}); if (e.dead) continue; } }
      R.flash(e.m, e.flash);
      const d = dist(e, P), a = angTo(e, P), sp = e.speed * (st.slow > 0 ? 0.55 : 1) * (P.buff.kekkai > 0 && d < 4.5 ? 0.6 : 1);
      const can = st.stun <= 0 && !P.dead, walk = can && st.root <= 0;
      const target = !P.invis || P.invis <= 0;
      // 哈米莉亞級（passive）：遺跡生物不會主動攻擊人——走近也不會，被打了才還手（e.provoked）
      if (w.run.grade.passive) { if (!e.provoked) e.aggro = false; }
      else if (!e.aggro && !e.dormant && d < 13) e.aggro = true;
      let moving = false;
      if (can && e.aggro && target) {
        const ai = e.def.ai;
        if (R.AI_X && R.AI_X[ai]) moving = !!R.AI_X[ai](e, P, d, a, sp, dt, walk, { move, hurtT, st, w });   // monsters2.js 的新生物
        else if (ai === 'chase' || ai === 'lord' && false) { if (d > e.def.size + 0.7) { if (walk) { move(e, a, sp, dt); moving = true; } } else if (e.cd <= 0) { e.cd = 0.85; hurtT(P, e.dmg, e); } e.yaw = a; }
        else if (ai === 'kite') {
          const want = d < 6 ? a + Math.PI : d > 9 ? a : a + Math.PI / 2 * (e.side || (e.side = Math.random() < 0.5 ? 1 : -1));
          if (walk) { move(e, want, sp * (d > 6 && d < 9 ? 0.5 : 1), dt); moving = true; } e.yaw = a;
          if (e.cd <= 0 && d < 14) { e.cd = 0.8 / e.def.shoot + Math.random() * 0.4; const n = e.def.fan || 1; for (let i = 0; i < n; i++) R.fire({ kind: e.def.shot || (e.def.fan ? 'feather' : e.def.blind ? 'sand' : e.def.freeze ? 'cold' : 'eorb'), owner: 'e', x: e.x, z: e.z, a: a + (i - (n - 1) / 2) * 0.24, speed: e.def.fan ? 11 : 8, dmg: e.dmg, life: 2.2, src: e }); }
        } else if (ai === 'trio') {
          if (e.role === 'heal') { const want = d < 5 ? a + Math.PI : d > 8 ? a : a + Math.PI / 2; if (walk) { move(e, want, sp * 0.7, dt); moving = true; } if (e.cd <= 0) { e.cd = 3; const hurt = w.enemies.filter(o => !o.dead && o !== e && o.id === 'kamaitachi' && dist(o, e) < 8 && o.hp < o.hpMax); hurt.forEach(o => { o.hp = Math.min(o.hpMax, o.hp + o.hpMax * 0.35); R.fx('ring', o.x, 0.1, o.z, { r: 1, color: '#6FE08A' }); }); } }
          else if (e.role === 'trip') { if (e.dashT > 0) { e.dashT -= dt; move(e, e.dashA, sp * 2.6, dt); moving = true; if (d < 1) { hurtT(P, e.dmg * 0.6, e, { knock: 0.5 }); e.dashT = 0; } } else { if (walk && d > 3) { move(e, a, sp * 0.8, dt); moving = true; } if (e.cd <= 0 && d < 7) { e.cd = 2.6; e.dashT = 0.45; e.dashA = a; } } }
          else { if (d > 0.9) { if (walk) { move(e, a, sp, dt); moving = true; } } else if (e.cd <= 0) { e.cd = 0.6; hurtT(P, e.dmg, e); } }
          e.yaw = a;
        } else if (ai === 'wall') {
          if (e.slam > 0) { e.slam -= dt; if (e.slam <= 0) { R.fx('boom', e.x + Math.sin(e.yaw) * 1.8, 0.3, e.z + Math.cos(e.yaw) * 1.8, { r: 2, color: '#8A8476' }); const fx = e.x + Math.sin(e.yaw) * 1.8, fz = e.z + Math.cos(e.yaw) * 1.8; if (Math.hypot(P.x - fx, P.z - fz) < 2.2) hurtT(P, e.dmg, e, { knock: 0.3 }); e.cd = 2; } }
          else { if (d > 2.6) { if (walk) { move(e, a, sp, dt); moving = true; } e.yaw = a; } else if (e.cd <= 0) { e.slam = 0.8; R.fx('mark', e.x + Math.sin(e.yaw) * 1.8, 0, e.z + Math.cos(e.yaw) * 1.8, { r: 2, t: 0.8 }); } }
        } else if (ai === 'stalk') {
          // 送犬：跟著，不先動手；玩家一跌倒（翻滾、受傷）就撲上來
          if (e.lunge > 0) { e.lunge -= dt; move(e, e.lungeA, sp * 2.4, dt); moving = true; if (d < 1 && !e.bit) { e.bit = true; hurtT(P, e.dmg, e); } }
          else if (P.stumble > 0 && d < 7 && e.cd <= 0) { e.lunge = 0.35; e.lungeA = a; e.cd = 1.2; e.bit = false; }
          else { const want = d > 5 ? a : d < 3.5 ? a + Math.PI : a + Math.PI / 2 * (e.side || (e.side = Math.random() < 0.5 ? 1 : -1)); if (walk) { move(e, want, sp * 0.55, dt); moving = true; } }
          e.yaw = a;
        } else if (ai === 'hop') {
          e.hop = (e.hop || 0) + dt; const ph = e.hop % 0.8; if (ph < 0.35 && walk) { move(e, a, sp * 1.8, dt); moving = true; e.m.g.position.y = Math.sin(ph / 0.35 * Math.PI) * 0.6; }
          if (e.cd <= 0) { e.cd = 3.2; for (let i = 0; i < 8; i++) R.fire({ kind: 'kasa', owner: 'e', x: e.x, z: e.z, a: i / 8 * Math.PI * 2 + e.t, speed: 6, dmg: e.dmg * 0.8, life: 1.8, src: e }); }
          if (d < 1 && e.cd < 3.3) { hurtT(P, e.dmg * 0.6, e); } e.yaw = a;
        } else if (ai === 'alarm') {
          if (!e.alarmed && d < 11) { e.alarmed = true; R.sfx && R.sfx('alarm'); R.toast('喚群燈大叫了起來！附近的遺跡生物都被叫過來了'); R.addAware(15, 'alarm'); const rm = R.roomOf(e); for (let i = 0; i < 2; i++) { const pool = w.run.grade.pool.filter(p => p !== 'chochin' && !R.ENEMIES[p].elite), [sx, sz] = R.roomPoint(rm); R.spawnEnemy(pool[Math.floor(Math.random() * pool.length)], sx, sz, rm.i, { aggro: true }); } }
          if (walk) { move(e, a + Math.PI, sp, dt); moving = true; } e.yaw = a;
        } else if (ai === 'roll') {
          if (e.dashT > 0) { e.dashT -= dt; const ox = e.x, oz = e.z; move(e, e.dashA, 12, dt); moving = true; if (d < 1.2 && !e.bit) { e.bit = true; hurtT(P, e.dmg, e, { knock: 0.3 }); } if (R.pointBlocked(e.x, e.z)) { e.x = ox; e.z = oz; e.dashT = 0; st.stun = 1; R.shake(0.2); } }
          else if (e.cd <= 0) { e.cd = 2.5; e.dashT = 1.2; e.dashA = a; e.bit = false; } else e.yaw = a;
        } else if (ai === 'ambush') {
          if (!e.up) { if (walk) { move(e, a, sp * 1.2, dt); moving = true; } e.m.g.position.y = -0.6; if (d < 2.2) { e.up = 1.2; hurtT(P, e.dmg, e); const k = 1.6; P.x += Math.sin(a + Math.PI) * k; P.z += Math.cos(a + Math.PI) * k; } }
          else { e.up -= dt; e.m.g.position.y = 0; if (e.up <= 0) { e.up = 0; e.cd = 1.5; } }
          e.yaw = a;
        } else if (ai === 'skitter') {
          // 木魂：被打就四散逃開，過一下又圍回來吐種子
          if (e.fleeT > 0) { e.fleeT -= dt; if (walk) { move(e, a + Math.PI + Math.sin(e.t * 3) * 0.6, sp * 1.6, dt); moving = true; } }
          else { const want = d > 6 ? a : d < 3.5 ? a + Math.PI : a + Math.PI / 2 * (e.side || (e.side = Math.random() < 0.5 ? 1 : -1)); if (walk) { move(e, want, sp * 0.8, dt); moving = true; }
            if (e.cd <= 0 && d < 9) { e.cd = 2.2 + Math.random(); R.fire({ kind: 'seed', owner: 'e', x: e.x, z: e.z, a, speed: 7, dmg: e.dmg, life: 1.6, src: e }); } }
          e.yaw = a;
        } else if (ai === 'swoop') {
          // 一反木綿：繞圈；地上拉出紅線之後沿線衝過來，纏住就動不了
          if (e.sw) { e.sw.t -= dt;
            if (e.sw.t <= 0) { const k = 16 * dt; e.x += Math.sin(e.sw.a) * k; e.z += Math.cos(e.sw.a) * k; e.sw.len -= k; moving = true;
              if (!e.sw.hit && d < 1.1) { e.sw.hit = true; hurtT(P, e.dmg, e, { knock: 0.8 }); R.fx('ring', P.x, 0.1, P.z, { r: 1, color: '#F2F0E8' }); }
              if (e.sw.len <= 0 || R.pointBlocked(e.x, e.z)) { e.sw = null; e.cd = 2.6 + Math.random(); } } }
          else { const want = d > 7 ? a : d < 4.5 ? a + Math.PI : a + Math.PI / 2 * (e.side || (e.side = Math.random() < 0.5 ? 1 : -1)); if (walk) { move(e, want, sp, dt); moving = true; }
            if (e.cd <= 0 && d < 9) { e.sw = { a, t: 0.7, len: d + 4, hit: false }; R.fx('aim', e.x, 0.3, e.z, { a, len: d + 4, t: 0.7 }); } }
          e.yaw = e.sw ? e.sw.a : a;
        } else if (ai === 'grapple') {
          // 河童：抓住人往後摔
          if (e.grab > 0) { e.grab -= dt; if (e.grab <= 0) { if (d < 1.9) { hurtT(P, e.dmg * 1.2, e, { knock: 0.45 }); if (!P.ally) { P.x += Math.sin(a) * 2.2; P.z += Math.cos(a) * 2.2; R.collide(P, 0.42); } R.fx('boom', P.x, 0.3, P.z, { r: 1.2, color: '#5A8A5A' }); } e.cd = 1.6; } }
          else if (d > 1.3) { if (walk) { move(e, a, sp, dt); moving = true; } }
          else if (e.cd <= 0) { e.grab = 0.45; R.fx('mark', P.x, 0, P.z, { r: 1.1, t: 0.45 }); }
          e.yaw = a;
        } else if (ai === 'burrow') {
          // 野槌：在地底下鑽（打不到）；冒出紅圈之後從那裡鑽出來，在外面待一下
          if (e.pop > 0) { e.pop -= dt; e.invuln = false; e.under = false; e.m.g.position.y = 0; if (d < 1.6 && e.cd <= 0) { e.cd = 1; hurtT(P, e.dmg * 0.7, e); } if (e.pop <= 0) { e.cd = 1.5; R.fx('poof', e.x, 0.2, e.z, { color: '#7A6A4A', n: 8 }); } }
          else if (e.erupt) { e.erupt.t -= dt; if (e.erupt.t <= 0) { e.x = e.erupt.x; e.z = e.erupt.z; R.fx('boom', e.x, 0.3, e.z, { r: 1.6, color: '#7A6A4A' }); R.shake(0.2); if (Math.hypot(P.x - e.x, P.z - e.z) < 1.6) hurtT(P, e.dmg * 1.3, e, { knock: 0.3 }); e.erupt = null; e.pop = 2.6; } }
          else { e.under = true; e.invuln = true; e.m.g.position.y = -1.4; if (walk) { move(e, a, sp * 1.3, dt); moving = true; e.trail = (e.trail || 0) - dt; if (e.trail <= 0) { e.trail = 0.35; R.fx('poof', e.x, 0.1, e.z, { color: '#6A5A3A', n: 3 }); } }
            if (d < 3 && e.cd <= 0) { e.erupt = { t: 0.8, x: P.x, z: P.z }; R.fx('mark', P.x, 0, P.z, { r: 1.6, t: 0.8 }); } }
          e.yaw = a;
        } else if (ai === 'pounce') {
          // 化貓：繞圈、壓低身子（地上出現圈）、撲過去；撲完隱身一下
          if (e.leap) { e.leap.t += dt; const k = Math.min(1, e.leap.t / 0.45); e.x = e.leap.x0 + (e.leap.x1 - e.leap.x0) * k; e.z = e.leap.z0 + (e.leap.z1 - e.leap.z0) * k; e.m.g.position.y = Math.sin(k * Math.PI) * 1.4; moving = true;
            if (k >= 1) { e.m.g.position.y = 0; if (Math.hypot(P.x - e.x, P.z - e.z) < 1.3) hurtT(P, e.dmg * 1.3, e); R.fx('ring', e.x, 0.1, e.z, { r: 1.3, color: '#9AFF6A' }); e.leap = null; e.fade = 1.2; e.cd = 2.2 + Math.random(); } }
          else if (e.crouch > 0) { e.crouch -= dt; if (e.crouch <= 0) e.leap = { t: 0, x0: e.x, z0: e.z, x1: e.cx1, z1: e.cz1 }; }
          else { e.m.g.position.y = 0; const want = d > 6 ? a : d < 3.8 ? a + Math.PI : a + Math.PI / 2 * (e.side || (e.side = Math.random() < 0.5 ? 1 : -1)); if (walk) { move(e, want, sp * (e.fade > 0 ? 1.3 : 0.9), dt); moving = true; }
            if (e.cd <= 0 && d < 7.5 && !(e.fade > 0)) { e.crouch = 0.55; e.cx1 = P.x; e.cz1 = P.z; R.fx('mark', P.x, 0, P.z, { r: 1.3, t: 1 }); } }
          R.setBeastAlpha(e.m, e.fade > 0 ? 0.3 : 1);
          e.yaw = e.leap ? Math.atan2(e.leap.x1 - e.leap.x0, e.leap.z1 - e.leap.z0) : a;
        } else if (ai === 'guard') {
          // 骨武者：舉盾往前推；揮刀之後盾會放下來一下
          if (e.openT > 0) e.openT -= dt;
          if (e.swingT > 0) { e.swingT -= dt; if (e.swingT <= 0) { R.fx('swing', e.x, 0, e.z, { a: e.yaw, arc: 1.6, range: 2.3, color: '#E8E0CC' }); if (d < 2.4 && Math.abs(wrap(a - e.yaw)) < 0.9) hurtT(P, e.dmg * 1.2, e); e.openT = 1.2; e.cd = 1.7; } }
          else if (d > 1.9) { if (walk) { move(e, a, sp * (e.openT > 0 ? 0.4 : 1), dt); moving = true; } e.yaw = a; }
          else { e.yaw = a; if (e.cd <= 0) { e.swingT = 0.5; R.fx('sector', e.x, 0, e.z, { a, arc: 1.6, range: 2.3, t: 0.5 }); } }
          e.guardUp = !(e.swingT > 0) && !(e.openT > 0);
          if (e.m.shield) e.m.shield.position.y = e.guardUp ? 0.95 : 0.55;
          if (e.m.blade) e.m.blade.rotation.x = e.swingT > 0 ? -1.6 : -0.4;
        } else if (ai === 'charge') {
          // 牛鬼：刨地（地上出現長條）→ 直線衝撞，撞牆就暈；太近會被踩
          if (e.rush) { const ox = e.x, oz = e.z; move(e, e.rush.a, 15, dt); moving = true; e.rush.len -= 15 * dt;
            if (!e.rush.hit && d < 1.7) { e.rush.hit = true; hurtT(P, e.dmg * 1.4, e, { knock: 0.6 }); R.shake(0.4); }
            if (R.pointBlocked(e.x + Math.sin(e.rush.a) * 1.3, e.z + Math.cos(e.rush.a) * 1.3)) { e.x = ox; e.z = oz; e.rush = null; st.stun = 1.8; R.shake(0.5); R.fx('boom', e.x + Math.sin(e.yaw) * 1.3, 0.5, e.z + Math.cos(e.yaw) * 1.3, { r: 1.8, color: '#8A7A6A' }); R.num(e.x, 3.2, e.z, '撞暈了', ''); }
            else if (e.rush.len <= 0) { e.rush = null; e.cd = 1.4; } }
          else if (e.paw > 0) { e.paw -= dt; if (e.paw <= 0) e.rush = { a: e.rushA, len: 16, hit: false }; }
          else if (e.stomp > 0) { e.stomp -= dt; if (e.stomp <= 0) { R.fx('boom', e.x, 0.3, e.z, { r: 3, color: '#5A4A5A' }); R.shake(0.35); if (d < 3) hurtT(P, e.dmg, e, { knock: 0.4 }); e.cd = 1.8; } }
          else { if (walk && d > 2.5) { move(e, a, sp, dt); moving = true; }
            if (e.cd <= 0) { if (d < 3) { e.stomp = 0.75; R.fx('mark', e.x, 0, e.z, { r: 3, t: 0.75 }); } else if (d < 13) { e.paw = 0.9; e.rushA = a; R.fx('aim', e.x, 0.3, e.z, { a, len: 16, t: 0.9 }); } } }
          e.yaw = e.rush ? e.rush.a : e.paw > 0 ? e.rushA : a;
        } else if (ai === 'giant') R.aiGiant(e, d, a, sp, dt, walk);
        else if (ai === 'lord') R.aiLord(e, d, a, sp, dt, walk);
        else if (ai === 'eye') R.aiEye(e, d, a, sp, dt);
        else if (ai === 'core') R.aiCore(e, d, a, dt);
        else if (ai === 'centipede') { if (walk) { move(e, a + Math.sin(e.t) * 0.6, sp * (1 + (1 - e.hp / e.hpMax)), dt); moving = true; } if (d < 1.6 && e.cd <= 0) { e.cd = 1; hurtT(P, e.dmg, e); } e.yaw = a; }
      } else if (can && walk && !e.aggro && !e.def.boss) {
        // 還沒被惹到的生物：在自己的房間裡慢慢晃
        e.wt = (e.wt || 0) - dt; if (e.wt <= 0) { e.wt = 2 + Math.random() * 3; e.wa = Math.random() < 0.35 ? null : Math.random() * Math.PI * 2; }
        if (e.wa != null) { const ox = e.x, oz = e.z; move(e, e.wa, sp * 0.3, dt); if (R.roomIndexAt(e.x, e.z) !== e.room) { e.x = ox; e.z = oz; e.wa += Math.PI; } else { moving = true; e.yaw = e.wa; } }
      }
      // 擊退、碰撞、位置
      if (e.kx || e.kz) { e.x += e.kx * dt; e.z += e.kz * dt; e.kx *= Math.pow(0.02, dt); e.kz *= Math.pow(0.02, dt); if (Math.abs(e.kx) + Math.abs(e.kz) < 0.1) { e.kx = e.kz = 0; } }
      if (!e.def.fly || e.id !== 'petra') R.collide(e, e.def.size * 0.5);
      for (const o of w.enemies) if (o !== e && !o.dead) { const dx = e.x - o.x, dz = e.z - o.z, dd = Math.hypot(dx, dz), m = (e.def.size + o.def.size) * 0.45; if (dd < m && dd > 0.001) { e.x += dx / dd * (m - dd) * 0.5; e.z += dz / dd * (m - dd) * 0.5; } }
      e.m.g.position.x = e.x; e.m.g.position.z = e.z; e.m.g.rotation.y = e.yaw;
      if (!e.def.ownY && e.def.ai !== 'hop' && e.def.ai !== 'ambush' && e.def.ai !== 'burrow' && e.def.ai !== 'pounce') e.m.g.position.y = e.def.fly ? 0.2 + Math.sin(e.t * 2) * 0.15 : 0;
      if (e.def.human) R.animHero(e.m, moving ? e.speed : 0, dt, e.def.ai === 'kite'); else R.animBeast(e.m, e.id, e.t, moving);
    }
    w.enemies = w.enemies.filter(e => !e.dead);
  };
  // 領主體・土蜘蛛：吐網、放幼體、跳躍
  R.aiLord = (e, d, a, sp, dt, walk) => {
    const P = e.tgt || W().P; e.yaw = a;
    if (e.leap) { e.leap.t += dt; const k = Math.min(1, e.leap.t / 0.9); e.x = e.leap.x0 + (e.leap.x1 - e.leap.x0) * k; e.z = e.leap.z0 + (e.leap.z1 - e.leap.z0) * k; e.m.g.position.y = Math.sin(k * Math.PI) * 4; if (k >= 1) { R.fx('boom', e.x, 0.3, e.z, { r: 3.2, color: '#5A4A3E' }); if (Math.hypot(P.x - e.x, P.z - e.z) < 3.4) hurtT(P, e.dmg * 1.3, e, { knock: 0.4 }); e.leap = null; R.shake(0.5); } return; }
    if (d > 2.6 && walk) move(e, a, sp, dt); else if (e.cd <= 0 && d <= 2.6) { e.cd = 1.2; hurtT(P, e.dmg, e); }
    e.pat = (e.pat || 0) - dt;
    if (e.pat <= 0) {
      e.pat = 3.2 - (1 - e.hp / e.hpMax) * 1.2;
      const r = Math.random();
      if (r < 0.4) for (let i = -1; i <= 1; i++) R.fire({ kind: 'web', owner: 'e', x: e.x, z: e.z, a: a + i * 0.3, speed: 10, dmg: e.dmg * 0.6, life: 1.6, src: e });
      else if (r < 0.7) { for (let i = 0; i < 2; i++) R.spawnEnemy('gaki', e.x + rnd(-2, 2), e.z + rnd(-2, 2), e.room, { aggro: true, hpMul: 0.6 }); R.toast('天花板上垂下了幼體'); }
      else { e.leap = { t: 0, x0: e.x, z0: e.z, x1: P.x, z1: P.z }; R.fx('mark', P.x, 0, P.z, { r: 3.2, t: 0.9 }); }
    }
  };
  // 領主體・餓者髑髏：不太移動；揮手掃一大片（地上出現扇形）、拍地（兩個紅圈）、叫骨武者出來
  R.aiGiant = (e, d, a, sp, dt, walk) => {
    const P = e.tgt || W().P, w = W();
    if (e.act) {
      e.act.t -= dt; e.yaw = e.act.a;
      if (e.act.t <= 0) {
        if (e.act.kind === 'swipe') { R.fx('swing', e.x, 0, e.z, { a: e.act.a, arc: 2.2, range: 7, color: '#E8E0CC' }); if (d < 7.2 && Math.abs(wrap(a - e.act.a)) < 1.15) hurtT(P, e.dmg * 1.2, e, { knock: 0.6 }); R.shake(0.3); }
        else { e.act.pts.forEach(([x, z]) => { R.fx('boom', x, 0.4, z, { r: 2.3, color: '#C8C0AC' }); if (Math.hypot(P.x - x, P.z - z) < 2.3) hurtT(P, e.dmg * 1.4, e, { knock: 0.4 }); }); R.shake(0.6); }
        e.act = null; e.pat = 1.6 - (1 - e.hp / e.hpMax) * 0.6;
      }
      return;
    }
    e.yaw = a;
    if (d > 6.5 && walk) move(e, a, sp, dt);
    e.callT = (e.callT == null ? 6 : e.callT) - dt;
    if (e.callT <= 0) { e.callT = 13; const n = w.enemies.filter(o => !o.dead && o.id === 'honemusha' && o.room === e.room).length; if (n < 4) { const rm = R.roomOf(e); for (let i = 0; i < 2; i++) { const [sx, sz] = R.roomPoint(rm); R.spawnEnemy('honemusha', sx, sz, e.room, { aggro: true, hpMul: 0.7 }); } R.toast('地上爬出了守墓骨兵'); } }
    e.pat = (e.pat == null ? 2 : e.pat) - dt;
    if (e.pat <= 0) {
      if (d < 7.5 && Math.random() < 0.55) { e.act = { kind: 'swipe', t: 0.95, a }; R.fx('sector', e.x, 0, e.z, { a, arc: 2.2, range: 7, t: 0.95 }); }
      else { const pts = [[P.x, P.z], [P.x + rnd(-3, 3), P.z + rnd(-3, 3)]]; e.act = { kind: 'slam', t: 1.0, a, pts }; pts.forEach(([x, z]) => R.fx('mark', x, 0, z, { r: 2.3, t: 1.0 })); }
    }
  };
  // 受傷前：骨武者的盾、河童的盤子、木魂四散
  R.enemyDefend = (e, dmg, o, crit) => {
    const P = W().P, ai = e.def.ai;
    if (ai === 'skitter') e.fleeT = 1.4;
    if (ai === 'guard' && e.guardUp && o.fromBehind !== false && Math.abs(wrap(angTo(e, P) - e.yaw)) < 1.2) { if (Math.random() < 0.5) R.num(e.x, 1.8 * e.def.size + 0.9, e.z, '格擋', ''); R.fx('block', e.x + Math.sin(e.yaw) * 0.5, 1, e.z + Math.cos(e.yaw) * 0.5); return dmg * 0.25; }
    if (ai === 'grapple') {
      if (e.dishT > 0) return dmg * 1.5;
      if (crit || dmg >= e.hpMax * 0.15) { e.dishT = 2.6; e.st.stun = Math.max(e.st.stun, 2.4); e.grab = 0; R.num(e.x, 1.8 * e.def.size + 1.1, e.z, '盤子灑了！', 'crit'); if (e.m.dish) e.m.dish.visible = false; return dmg * 1.5; }
    }
    return dmg;
  };
  // 隱身：3D 模型和點陣圖都變半透明
  R.setBeastAlpha = (m, a) => {
    if (m.alpha === a || (m.alpha == null && a === 1)) return; m.alpha = a;
    if (m.isSprite) { R.fadeSprite(m, a); return; }
    m.g.traverse(o => { if (o.isMesh && o.material) { o.material.transparent = a < 1; o.material.opacity = a; } });
  };
  // 群瞳：彈幕環、凝視光線、瞬移
  R.aiEye = (e, d, a, sp, dt) => {
    const P = e.tgt || W().P; e.yaw = a;
    if (d < 12) R.addAware(dt * 1.6, 'eye');   // 被群瞳看見：佩特拉的注意一直往上升
    const want = d > 8 ? a : d < 5 ? a + Math.PI : a + Math.PI / 2; move(e, want, sp * 0.6, dt);
    if (e.beam) { e.beam.t -= dt; if (e.beam.t <= 0) { const bx = Math.sin(e.beam.a), bz = Math.cos(e.beam.a), dx = P.x - e.x, dz = P.z - e.z, along = dx * bx + dz * bz, side = Math.abs(dx * bz - dz * bx); if (along > 0 && along < 16 && side < 1) hurtT(P, e.dmg * 1.6, e); R.fx('beam', e.x, 1.6, e.z, { a: e.beam.a, len: 16 }); e.beam = null; } return; }
    e.pat = (e.pat || 1.5) - dt;
    if (e.pat <= 0) {
      const hurt = 1 - e.hp / e.hpMax; e.pat = 2.6 - hurt * 1.2;
      const r = Math.random();
      if (r < 0.45) { const n = 12 + Math.round(hurt * 8); for (let i = 0; i < n; i++) R.fire({ kind: 'ering', owner: 'e', x: e.x, z: e.z, a: i / n * Math.PI * 2 + e.t, speed: 7, dmg: e.dmg, life: 2.4, src: e }); }
      else if (r < 0.75) { e.beam = { a, t: 1 }; R.fx('aim', e.x, 1.6, e.z, { a, len: 16, t: 1 }); }
      else { const rm = R.roomOf(e); [e.x, e.z] = R.roomPoint(rm); R.fx('blink', e.x, 2, e.z); for (let i = 0; i < 6; i++) R.fire({ kind: 'ering', owner: 'e', x: e.x, z: e.z, a: a + (i - 2.5) * 0.15, speed: 9, dmg: e.dmg, life: 2, src: e }); }
    }
  };
  // 佩特拉核心：不會移動；異常狀態力場＋彈幕＋翼肢掃擊
  R.aiCore = (e, d, a, dt) => {
    const P = e.tgt || W().P; e.yaw = a;
    if (e.m.pupil) { e.m.pupil.position.x = Math.sin(a) * 0.5; e.m.iris.position.x = Math.sin(a) * 0.35; }
    e.pat = (e.pat || 2) - dt;
    if (e.pat <= 0) {
      const hurt = 1 - e.hp / e.hpMax; e.pat = 2.2 - hurt;
      const r = Math.random();
      if (r < 0.4) { const n = 18 + Math.round(hurt * 12); for (let i = 0; i < n; i++) R.fire({ kind: 'ering', owner: 'e', x: e.x, z: e.z, a: i / n * Math.PI * 2 + e.t * 0.7, speed: 6.5, dmg: e.dmg, life: 3, src: e }); }
      else if (r < 0.7) { e.beam = { a, t: 1 }; R.fx('aim', e.x, 1.6, e.z, { a, len: 22, t: 1 }); later(() => { if (e.dead) return; const bx = Math.sin(a), bz = Math.cos(a), dx = P.x - e.x, dz = P.z - e.z, along = dx * bx + dz * bz, side = Math.abs(dx * bz - dz * bx); if (along > 0 && along < 22 && side < 1.4) hurtT(P, e.dmg * 1.8, e); R.fx('beam', e.x, 1.6, e.z, { a, len: 22 }); }, 1000); }
      else { const rm = R.roomOf(e); for (let i = 0; i < 2 + Math.round(hurt * 2); i++) { const ids = ['onibi', 'kamaitachi', 'okuriinu'], [sx, sz] = R.roomPoint(rm); R.spawnEnemy(ids[i % 3], sx, sz, rm.i, { aggro: true, role: ['trip', 'cut', 'heal'][i % 3] }); } }
    }
  };

  // ---------- 反應：擠壓、崩塌 ----------
  // 擠壓：牆邊冒出石塊，慢慢往房間中心推進，過一陣子再退回去
  R.squeeze = room => {
    const w = W(), TH = T(), mat = new TH.MeshLambertMaterial({ color: R.theme(w.run).wall }), edge = R.roomEdgeTiles(room).sort(() => Math.random() - 0.5).slice(0, 24);
    const blocks = edge.map(([x, z]) => { const m = new TH.Mesh(new TH.BoxGeometry(1.9, 2.6, 1.9), mat); m.position.set(x, -1.3, z); m.castShadow = true; w.scene.add(m); const c = R.addBox(x - 0.95, x + 0.95, z - 0.95, z + 0.95, 'squeeze'); c.on = false; const d = Math.hypot(room.x - x, room.z - z) || 1; return { m, c, x, z, ux: (room.x - x) / d, uz: (room.z - z) / d, max: d * 0.82 }; });
    let t = 0;
    w.dyn.push(dt => {
      // 先從地上冒出來（0.8 秒的警告），再往中心推進
      t += dt; const rise = Math.min(1, t / 0.8), tt = t - 0.8, k = tt < 0 ? 0 : tt < 2.5 ? tt / 2.5 : tt < 5.5 ? 1 : tt < 7.5 ? 1 - (tt - 5.5) / 2 : 0;
      blocks.forEach(b => { const x = b.x + b.ux * b.max * k, z = b.z + b.uz * b.max * k; b.c.x0 = x - 0.95; b.c.x1 = x + 0.95; b.c.z0 = z - 0.95; b.c.z1 = z + 0.95; if (rise >= 1) b.c.on = true; b.m.position.set(x, -1.3 + 2.6 * rise, z); });
      if (tt >= 7.5) { blocks.forEach(b => { w.scene.remove(b.m); b.c.on = false; }); return false; }
      return true;
    });
  };
  R.collapse = room => {
    const w = W(), P = w.P;
    for (let i = 0; i < 20; i++) later(() => {
      if (!w.run || w.run.done) return;
      const near = i % 2 === 0, rp = near ? null : R.roomPoint(room), x = near ? P.x + rnd(-1.5, 1.5) : rp[0], z = near ? P.z + rnd(-1.5, 1.5) : rp[1];
      R.fx('mark', x, 0, z, { r: 1.5, t: 1 });
      later(() => { if (!w.run || w.run.done) return; R.fx('rock', x, 6, z, {}); if (Math.hypot(P.x - x, P.z - z) < 1.6) R.hurtPlayer(12 + 12 * w.run.grade.lv, null); W().enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < 1.6) R.hurtEnemy(e, 18, {}); });
        const TH = T(); const m = new TH.Mesh(new TH.DodecahedronGeometry(0.7, 0), new TH.MeshLambertMaterial({ color: R.theme(w.run).wall })); m.position.set(x, 0.5, z); m.rotation.set(Math.random(), Math.random(), 0); w.F.group.add(m); R.addBox(x - 0.55, x + 0.55, z - 0.55, z + 0.55, 'rubble'); }, 1000);
    }, i * 420);
  };

  // 斷尾型（《遺跡》第一章第三節）：把受損的那一區切掉。出入口長出肉壁，往回的路、往前的路一起封死。
  // 時間到還在房間裡：被切掉的區域往內擠，一直受傷；只能打破肉壁（佩特拉的注意會上升）逃出來。
  R.tailCut = room => {
    const w = W(), TH = T(), run = w.run, F = w.F, t = F.tile, TS = t.TS, P = w.P;
    if (!room || !room.doors || !room.doors.length) { R.collapse(room || F.rooms[0]); return; }
    const T0 = Math.max(3, 5 - run.grade.lv * 0.5);   // 2026-10-04 作者：斷尾型要更狠（原本 7 − 0.7×分級，最少 4 秒）
    if (room.locked) R.lockRoom(room, false);
    R.banner('斷尾型：這一區要被切掉了', Math.ceil(T0) + ' 秒內離開這個房間！前後的出入口都在封死');
    const mat = new TH.MeshLambertMaterial({ color: '#7A3A4A', emissive: '#4A0A18', emissiveIntensity: 0.7 }), g = new TH.BoxGeometry(TS, 2.8, TS);
    const plugs = room.doors.map(k => { const tx = k % t.nx, tz = (k - tx) / t.nx, x = t.cX(tx), z = t.cZ(tz), m = new TH.Mesh(g, mat); m.position.set(x, -1.4, z); m.castShadow = true; F.group.add(m); return { m, x, z }; });
    let left = T0, last = Math.ceil(T0), sealed = false, tick = 0, swallow = null;
    w.dyn.push(dt => {
      if (!w.run || w.run !== run || w.F !== F) return false;
      if (!sealed) {
        left -= dt; const k = Math.min(1, 1 - left / T0);
        plugs.forEach(p => { p.m.position.y = -1.4 + 2.8 * k; p.m.scale.x = p.m.scale.z = 0.8 + 0.2 * Math.sin(run.t * 12); });
        if (Math.ceil(left) < last && left > 0) { last = Math.ceil(left); R.toast('出入口封死還有 ' + last + ' 秒' + (R.roomIndexAt(P.x, P.z) === room.i ? '——快出去！' : '')); }
        if (left > 0) return true;
        sealed = true; room.severed = true; room.cleared = true;
        plugs.forEach(p => { p.m.scale.x = p.m.scale.z = 1; p.prop = { kind: 'plug', x: p.x, z: p.z, hp: 260 + run.grade.lv * 180, hpMax: 260 + run.grade.lv * 180, alive: true, mesh: p.m, room: room.i }; /* 肉壁很硬，沒被打會長回去、打破了還會再長（petra2.js） */ p.prop.col = R.addBox(p.x - TS / 2, p.x + TS / 2, p.z - TS / 2, p.z + TS / 2, 'prop', p.prop); F.props.push(p.prop); });
        if (F.stairs && F.stairs.room === room.i) { F.stairs.sealed = true; R.sealStairs(); }
        if (F.up && R.roomIndexAt(F.up.x, F.up.z) === room.i) F.up.sealed = true;
        const inside = R.roomIndexAt(P.x, P.z) === room.i;
        if (inside && !(run.coop && !run.coop.solo)) swallow = 5;
        R.banner('這一區被切掉了', inside ? '你被困在裡面！5 秒內打破肉壁逃出去，不然整區會被吞掉' : (F.stairs && F.stairs.sealed ? '樓層通道在那一區裡：往下的路沒了，只能找回歸水晶' : '那個房間再也進不去了'));
        R.shake(0.6); R.drawMinimap(true);
      }
      // 沒逃出來：整區被佩特拉吞掉，人被吐到上下兩層內的隨機樓層（作者：斷尾過後會跑到隨機樓層）
      // 2026-10-04 作者回報：斷尾型沒有掉到其他樓層、一直受傷——中途離開過一下（打破肉壁、被擊退到門口），倒數就永遠取消了；
      // 現在只要人還在被切掉的那一區裡，就重新開始 5 秒倒數
      if (sealed && swallow == null && !P.dead && R.roomIndexAt(P.x, P.z) === room.i && !(run.coop && !run.coop.solo)) { swallow = 5; R.toast('被困在被切掉的那一區——5 秒內打破肉壁逃出去，不然會被吞掉', '#FF6A6A'); }
      if (swallow != null) {
        if (P.dead || R.roomIndexAt(P.x, P.z) !== room.i) swallow = null;
        else { const s0 = Math.ceil(swallow); swallow -= dt; if (Math.ceil(swallow) < s0 && swallow > 0) R.toast('被吞掉還有 ' + Math.ceil(swallow) + ' 秒——打破肉壁！', '#FF6A6A');
          if (swallow <= 0) { swallow = null; const f0 = run.floor, cand = [-2, -1, 1, 2].map(k => f0 + k).filter(f => f >= 0 && f < run.floors && f !== f0), to = cand[Math.floor(Math.random() * cand.length)];
            if (to != null) { R.shake(1); R.fade(() => { R.loadFloor(to, to < f0 ? { up: true } : {}); if (W().P) W().P.petraCurse = 90; R.banner('被佩特拉吞掉了', '90 秒內生命、魔力的回復減半。被切掉的那一區連你一起被吞下去，吐到了' + (R.floorLabel ? R.floorLabel(run) : '第 ' + (to + 1) + ' 層') + '。'); }); return false; } } }
      }
      // 被切掉的區域往內擠：還在裡面的一直受傷
      tick -= dt; if (tick > 0) return true; tick = 1;
      if (!P.dead && R.roomIndexAt(P.x, P.z) === room.i) { P.iframe = 0; R.hurtPlayer(P.hpMax * 0.14, null); }
      (w.allies || []).forEach(a => { if (!a.downed && R.roomIndexAt(a.x, a.z) === room.i) { a.iframe = 0; R.hurtAlly(a, a.hpMax * 0.07, null); } });
      w.enemies.forEach(e => { if (!e.dead && e.room === room.i) R.hurtEnemy(e, e.hpMax * 0.12, { fromBehind: false }); });
      return true;
    });
  };

  // ---------- 掉落物 ----------
  R.dropMat = (mat, n, x, z) => R.addDrop({ type: 'mat', mat, n, x, z });
  R.dropGold = (n, x, z) => R.addDrop({ type: 'gold', n, x, z });
  R.dropFruit = (x, z) => R.addDrop({ type: 'fruit', x, z });
  R.dropItem = (item, x, z) => R.addDrop({ type: 'item', item, x, z });
  R.addDrop = d => {
    const TH = T(), g = new TH.Group();
    if (d.type === 'gold') { const c = new TH.Mesh(new TH.CylinderGeometry(0.18, 0.18, 0.05, 10), new TH.MeshLambertMaterial({ color: '#E8C860', emissive: '#4A3A00' })); c.rotation.x = Math.PI / 2; g.add(c); }
    else if (d.type === 'mat') { const c = new TH.Mesh(new TH.OctahedronGeometry(0.22, 0), new TH.MeshLambertMaterial({ color: R.MATS[d.mat].color, emissive: R.MATS[d.mat].color, emissiveIntensity: 0.35 })); g.add(c); }
    else if (d.type === 'fruit') { const c = new TH.Mesh(new TH.SphereGeometry(0.22, 8, 6), new TH.MeshLambertMaterial({ color: '#E85A6A', emissive: '#5A1010' })); g.add(c); }
    else { const col = R.rarityColor(d.item); const c = new TH.Mesh(new TH.BoxGeometry(0.5, 0.5, 0.5), new TH.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.4 })); c.rotation.set(0.6, 0.6, 0); g.add(c);
      const beam = new TH.Mesh(new TH.CylinderGeometry(0.25, 0.25, 5, 8, 1, true), new TH.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, depthWrite: false })); beam.position.y = 2.5; g.add(beam); }
    const a = Math.random() * Math.PI * 2, r = d.type === 'item' ? rnd(0.6, 1.6) : rnd(0.2, 1);
    d.x += Math.sin(a) * r; d.z += Math.cos(a) * r;
    const blk = R.pointBlocked(d.x, d.z); if (blk || !R.isFloor(d.x, d.z) || (R.lineOpen && W().F && W().F.tile && !R.lineOpen(d.x - Math.sin(a) * r, d.z - Math.cos(a) * r, d.x, d.z))) { d.x -= Math.sin(a) * r; d.z -= Math.cos(a) * r; }
    // 掉在牆裡、柱子裡、牆的另一邊就永遠撿不到（遺跡生物死在牆邊、背包丟東西靠牆的時候）：挪到最近一塊走得到的地板
    if (R.openFloorNear && W().F && W().F.tile) { const [ox, oz] = R.openFloorNear(d.x, d.z, d.from); d.x = ox; d.z = oz; }
    g.position.set(d.x, 0.5, d.z); W().scene.add(g); d.mesh = g; d.t = Math.random() * 3; W().drops.push(d);
    return d;
  };
  // 礦殼死掉後留下的礦（按互動掘礦）
  R.addOre = (x, z) => {
    const TH = T(), g = new TH.Group();
    for (let i = 0; i < 4; i++) { const c = new TH.Mesh(new TH.OctahedronGeometry(0.25 + Math.random() * 0.15, 0), new TH.MeshLambertMaterial({ color: Math.random() < 0.4 ? '#8A74FF' : '#A3ACB6', emissive: '#1A1030' })); c.position.set(rnd(-0.4, 0.4), 0.3, rnd(-0.4, 0.4)); g.add(c); }
    g.position.set(x, 0, z); W().F.group.add(g); W().F.ores.push({ x, z, mesh: g, left: 1 });
  };
})(window.R);
