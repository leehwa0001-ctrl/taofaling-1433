// 技能書第二冊：每個基本職業再多八種、二十一條轉職路線各多三種（新技能一百一十九種，總數兩百五十二種）。
// 多了幾種新的「型」，玩起來不只是換數字：
//  迴旋（丟出去再飛回來）、照射（持續的光束，跟著準心轉）、設置（砲台、聖燈、戰旗、結界柱）、推進（地裂一路往前竄）、
//  噴射（持續的扇形）、天降（自動打附近的敵人）、彈射（在敵人之間跳）、鉤拉（把敵人拉過來／把自己拉過去）、
//  連閃（在幾隻敵人之間瞬移連斬）、光環（跟著你走的範圍）、無敵、換彈、躍擊、多段斬、組合（幾個型照時間接起來）。
// 說法照設定的施法派別：槍手是科技派（刻了咒文的魔力鋼彈頭）、術士念咒文、牧師祈禱、神官用結界和祓、式神使放式神。
// 放在 skillbook.js 後面（用它開出來的 R.SKILL_TYPES、R.SKILL_LIB、R.SKILL_KIT）。
(function (R) {
  const T = R.SKILL_TYPES, LIB = R.SKILL_LIB, K = R.SKILL_KIT;
  if (!T || !LIB || !K) return;
  const W = () => R.W, TH = () => window.THREE, rnd = Math.random;
  const { later, aimIn, nova, slowIn } = K;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const KIND = { gunner: 'bullet', archer: 'arrow', mage: 'orb', priest: 'holy', blade: 'eorb', warrior: 'eorb', knight: 'eorb' };
  const alive = () => W().enemies.filter(e => !e.dead && !e.under);
  // 一個地方有沒有被牆擋住（照射、推進碰到牆就停）
  const blocked = (x, z) => !!(R.pointBlocked && R.pointBlocked(x, z));

  // ---------- 投射物的樣子：斧頭、盾、刀、紙符…（形狀、材質共用，不會越玩越卡） ----------
  const LOOK = {}, mat = {};
  const lookMesh = key => {
    const t = TH(); if (!LOOK[key]) {
      const g = { axe: () => new t.BoxGeometry(0.9, 0.08, 0.5), disc: () => new t.CylinderGeometry(0.45, 0.45, 0.1, 14), blade: () => new t.BoxGeometry(1.1, 0.06, 0.18), card: () => new t.BoxGeometry(0.3, 0.02, 0.45), ember: () => new t.SphereGeometry(0.22, 8, 6), leaf: () => new t.BoxGeometry(0.35, 0.04, 0.6) }[key]();
      g.userData.shared = true; LOOK[key] = g;
    }
    const c = { axe: '#A8AEB6', disc: '#C9A13A', blade: '#E8F0FF', card: '#F4EEDC', ember: '#FF8A3A', leaf: '#6FB36A' }[key];
    if (!mat[key]) { mat[key] = key === 'ember' || key === 'blade' ? new t.MeshBasicMaterial({ color: c }) : new t.MeshLambertMaterial({ color: c }); mat[key].userData.shared = true; }
    return new t.Mesh(LOOK[key], mat[key]);
  };
  const reskin = (s, key) => { if (!key) return; const w = W(); w.scene.remove(s.mesh); s.mesh = lookMesh(key); s.mesh.position.set(s.x, s.y, s.z); w.scene.add(s.mesh); s.spin = 1; };
  // 投射物打中時的附加效果（combat.js 的投射物只帶暈眩、定住）：看它打到了誰，再補上詛咒、變慢、燃燒
  const onHit = (s, f) => { const seen = new Set(); let tail = 2; W().dyn.push(() => { for (const e of s.hit) if (!seen.has(e)) { seen.add(e); if (!e.dead) f(e); } if (s.spin && !s.dead) s.mesh.rotation.z += 0.5; if (s.dead) tail--; return tail > 0; }); };
  const status = (e, s) => { if (s.curse) e.st.curse = Math.max(e.st.curse, s.curse); if (s.slow) e.st.slow = Math.max(e.st.slow, s.slow); if (s.burn) e.st.burn = 3; if (s.root) e.st.root = Math.max(e.st.root, s.root); };

  // ---------- 新的型 ----------
  Object.assign(T, {
    // 射擊＋打中時的效果（詛咒、變慢、燃燒），可以換投射物的樣子
    shotx(s, P, w, pw) {
      const n = s.n || 1, kind = s.kind || KIND[P.cls] || 'bullet', b = s.burst || 1;
      for (let j = 0; j < b; j++) later(() => {
        for (let i = 0; i < n; i++) {
          const aa = P.aimA + (n > 1 ? (s.spread >= 6.2 ? i * Math.PI * 2 / n : (i - (n - 1) / 2) * (s.spread || 0.3) / (n - 1) * 2) : 0);
          const sh = R.fire({ kind, owner: 'p', x: P.x, z: P.z, a: aa, speed: s.sp || 26, dmg: pw * s.k, life: s.life || 0.9, pierce: s.pierce || 0, homing: s.homing || 0, stun: s.stun, primary: false });
          reskin(sh, s.look); if (s.curse || s.slow || s.burn) onHit(sh, e => status(e, s));
        }
        P.h.recoil = 1; R.sfx && R.sfx(kind === 'bullet' ? 'gun' : kind === 'arrow' ? 'bow' : 'magic');
      }, j * (s.gap || 100));
    },
    // 迴旋：飛到 range 公尺再轉回你手上，來回都會打到
    boomer(s, P, w, pw) {
      const n = s.n || 1, sp = s.sp || 16, out = (s.range || 8) / sp;
      for (let i = 0; i < n; i++) {
        const aa = P.aimA + (n > 1 ? (i - (n - 1) / 2) * (s.spread || 0.5) : 0);
        const sh = R.fire({ kind: s.kind || 'eorb', owner: 'p', x: P.x, z: P.z, a: aa, speed: sp, dmg: pw * s.k, life: 99, pierce: 99, stun: s.stun, primary: false });
        sh.rad = Math.max(sh.rad, 0.55); reskin(sh, s.look || 'axe'); if (s.curse || s.slow || s.burn) onHit(sh, e => status(e, s));
        let t = 0, back = false;
        w.dyn.push(dt => {
          if (sh.dead) return false; t += dt;
          if (!back && t >= out) { back = true; sh.hit.clear(); }
          if (back) { const a = Math.atan2(P.x - sh.x, P.z - sh.z); sh.vx = Math.sin(a) * sp * 1.15; sh.vz = Math.cos(a) * sp * 1.15; if (dist(sh, P) < 0.9 || t > out * 4) { R.killShot(sh); return false; } }
          return true;
        });
      }
      R.sfx && R.sfx('swing');
    },
    // 照射：t 秒內每 tick 秒打一次一直線（跟著準心轉、可以邊走邊照），碰到牆就停
    beam(s, P, w, pw) {
      const run = w.run; let left = s.t || 1.5, tick = 0;
      w.dyn.push(dt => {
        if (W().run !== run || P.dead) return false; left -= dt; tick -= dt;
        if (tick <= 0) {
          tick = s.tick || 0.15; const a = P.aimA, ca = Math.sin(a), sa = Math.cos(a); let len = 0;
          while (len < s.len && !blocked(P.x + ca * (len + 0.5), P.z + sa * (len + 0.5))) len += 0.5;
          R.fx('bolt', P.x + ca * 0.6, 1.2, P.z + sa * 0.6, { to: { x: P.x + ca * Math.max(0.8, len), z: P.z + sa * Math.max(0.8, len) } });
          w.enemies.forEach(e => {
            if (e.dead || e.under) return; const dx = e.x - P.x, dz = e.z - P.z, along = dx * ca + dz * sa, side = Math.abs(dx * sa - dz * ca), rad = e.def.size * 0.5;
            if (along < -0.3 || along > len + rad || side > (s.width || 0.6) + rad) return;
            R.hurtEnemy(e, pw * s.k, { stun: s.stun, primary: false }); status(e, s);
          });
          if (s.selfHeal) R.healP(P.hpMax * s.selfHeal, true);
        }
        return left > 0;
      });
      R.sfx && R.sfx('magic');
    },
    // 設置：在準心處立一個東西 t 秒——自動射擊（rate 秒一發）、回復（heal：每秒回復生命的比例）、強化（站在旁邊）、範圍傷害、變慢
    turret(s, P, w, pw) {
      const t = TH(), run = w.run, [x, z] = R.nearestFloor(...(s.self ? [P.x + Math.sin(P.aimA) * 1.5, P.z + Math.cos(P.aimA) * 1.5] : aimIn(P, s.range0 || 7)));
      const g = new t.Group(); g.position.set(x, 0, z);
      const part = (geo, col, y, glow) => { const k = geo + col + (glow ? 1 : 0); if (!LOOK[geo]) { LOOK[geo] = { base: () => new t.CylinderGeometry(0.32, 0.4, 0.5, 10), post: () => new t.BoxGeometry(0.18, 1.6, 0.18), top: () => new t.BoxGeometry(0.5, 0.36, 0.5), ball: () => new t.SphereGeometry(0.32, 10, 8), flag: () => new t.BoxGeometry(0.06, 0.7, 1.0), crown: () => new t.SphereGeometry(0.8, 10, 8) }[geo](); LOOK[geo].userData.shared = true; } if (!mat[k]) { mat[k] = glow ? new t.MeshBasicMaterial({ color: col }) : new t.MeshLambertMaterial({ color: col }); mat[k].userData.shared = true; } const m = new t.Mesh(LOOK[geo], mat[k]); m.position.y = y; m.castShadow = true; g.add(m); return m; };
      const L = s.look || 'gun';
      if (L === 'gun') { part('base', '#3A3C42', 0.25); part('post', '#5A5C62', 0.9); const h = part('top', '#4A6A8A', 1.7); h.scale.set(1, 0.8, 1.6); part('ball', s.color || '#FFE08A', 1.75, 1).scale.setScalar(0.35); }
      else if (L === 'lamp') { part('base', '#8A7A5A', 0.25); part('post', '#C9A13A', 0.9); part('ball', s.color || '#FFE8A0', 1.9, 1); }
      else if (L === 'banner') { part('base', '#4A4A50', 0.25); const p = part('post', '#6A4A2E', 1.2); p.scale.y = 1.5; const f = part('flag', s.color || '#2F4A6E', 1.85); f.position.z = 0.5; }
      else if (L === 'tree') { part('base', '#5A3E26', 0.25); part('post', '#5A3E26', 0.9); part('crown', s.color || '#4E8A4A', 2.0); }
      else if (L === 'paper') { part('base', '#E8E0D0', 0.25); const p = part('top', '#F4EEDC', 1.0); p.scale.set(1.4, 3.4, 0.6); part('ball', s.color || '#E8E0FF', 1.9, 1).scale.setScalar(0.4); }
      else { part('base', '#8C8A82', 0.25); const p = part('post', '#F2EEE4', 1.2); p.scale.set(1.6, 1.5, 1.6); part('ball', s.color || '#FFFFFF', 2.4, 1).scale.setScalar(0.3); }
      w.scene.add(g); R.fx('ring', x, 0.1, z, { r: s.r || 1.6, color: s.color || '#FFFFFF' });
      let left = s.t || 8, cd = 0.3, tick = 0;
      w.dyn.push(dt => {
        const end = () => { W().scene.remove(g); R.fx('poof', x, 1, z, { color: s.color || '#C8C8D0', n: 10 }); return false; };
        if (W().run !== run) { w.scene.remove(g); return false; }
        left -= dt; cd -= dt; tick -= dt;
        if (s.rate && cd <= 0) {
          const tg = R.nearestEnemy(x, z, s.reach || 10);
          if (tg) { cd = s.rate; const a = Math.atan2(tg.x - x, tg.z - z), n = s.n || 1; g.rotation.y = a; for (let i = 0; i < n; i++) { const sh = R.fire({ kind: s.kind || 'bullet', owner: 'p', x, z, a: a + (n > 1 ? (i - (n - 1) / 2) * 0.25 : 0), speed: s.sp || 24, dmg: pw * s.k, life: 0.8, homing: s.homing || 0, primary: false }); sh.y = 1.6; } R.sfx && R.sfx(s.kind === 'bullet' ? 'gun' : 'magic'); }
        }
        const near = Math.hypot(P.x - x, P.z - z) < (s.r || 3.5);
        if (s.heal && near) R.healP(P.hpMax * s.heal * dt, true);
        if (s.mpHeal && near) P.mp = Math.min(P.mpMax, P.mp + P.mpMax * s.mpHeal * dt);
        if ((s.buffDmg || s.buffDef) && near) { P.sb = P.sb || {}; P.sb[s._id + ':zone'] = { left: 0.3, dmg: s.buffDmg, def: s.buffDef }; }
        if ((s.aura || s.slowAura) && tick <= 0) { tick = 0.5; if (s.aura) R.aoe(x, z, s.r || 3.5, pw * s.aura, { props: false }); if (s.slowAura) slowIn(x, z, s.r || 3.5, 1); R.fx('ring', x, 0.1, z, { r: s.r || 3.5, color: s.color || '#FFFFFF' }); }
        return left > 0 ? true : end();
      });
    },
    // 推進：從你腳下沿著準心方向，一段一段往前炸過去（碰到牆就停）
    wave(s, P, w, pw) {
      const a = P.aimA, x0 = P.x, z0 = P.z; let stop = false;
      for (let i = 1; i <= (s.n || 5); i++) later(() => {
        if (stop) return; const x = x0 + Math.sin(a) * (s.step || 1.6) * i, z = z0 + Math.cos(a) * (s.step || 1.6) * i;
        if (blocked(x, z)) { stop = true; return; }
        const fx = s.fx || 'boom'; if (fx === 'ring') R.fx('ring', x, 0.1, z, { r: s.r, color: s.color }); else if (fx === 'pillar') R.fx('pillar', x, 0, z, { r: s.r * 0.6, color: s.color }); else R.fx('boom', x, 0.4, z, { r: s.r, color: s.color });
        if (fx === 'boom') R.fx('dust', x, 0.15, z, {});
        R.aoe(x, z, s.r || 1.4, pw * s.k, { stun: s.stun, root: s.root, curse: s.curse, kb: s.kb, burn: s.burn, props: false }); if (s.slow) slowIn(x, z, s.r || 1.4, s.slow);
      }, i * (s.gap || 70));
      if (s.aware) R.addAware(s.aware, 'boom');
      R.shake && R.shake(0.15);
    },
    // 噴射：t 秒內每 tick 秒打一次前方的扇形（跟著準心轉）
    breath(s, P, w, pw) {
      const run = w.run; let left = s.t || 1.5, tick = 0;
      w.dyn.push(dt => {
        if (W().run !== run || P.dead) return false; left -= dt; tick -= dt;
        if (tick <= 0) {
          tick = s.tick || 0.15; const a = P.aimA, rg = s.range || 5, arc = s.arc || 1;
          [0.35, 0.65, 0.95].forEach((f, i) => { const aa = a + (i - 1) * arc * 0.3; R.fx('poof', P.x + Math.sin(aa) * rg * f, 1.0, P.z + Math.cos(aa) * rg * f, { color: s.color || '#FF8A3A', n: 3 }); });
          w.enemies.forEach(e => { if (e.dead || e.under) return; const d = dist(e, P); if (d > rg + e.def.size * 0.5 || Math.abs(wrap(Math.atan2(e.x - P.x, e.z - P.z) - a)) > arc / 2 + 0.15) return; R.hurtEnemy(e, pw * s.k, { primary: false }); status(e, s); });
        }
        return left > 0;
      });
    },
    // 天降：t 秒內每 gap 秒挑一隻附近的敵人打（落雷、流星、獵鷹、式神……）
    storm(s, P, w, pw) {
      const run = w.run; let left = s.t || 5, cd = 0.1;
      w.dyn.push(dt => {
        if (W().run !== run || P.dead) return false; left -= dt; cd -= dt;
        if (cd <= 0) {
          cd = s.gap || 0.6; const list = alive().filter(e => dist(e, P) < (s.r || 9));
          const e = list.length ? list[Math.floor(rnd() * list.length)] : null, x = e ? e.x : P.x + (rnd() - 0.5) * 8, z = e ? e.z : P.z + (rnd() - 0.5) * 8;
          const fx = s.fx || 'pillar'; if (fx === 'pillar') R.fx('pillar', x, 0, z, { r: (s.hitR || 1.4) * 0.6, color: s.color }); else if (fx === 'spark') { R.fx('spark', x, 1.2, z, { a: rnd() * 6.28, crit: true }); R.fx('poof', x, 1.4, z, { color: s.color || '#E8E0D0', n: 6 }); } else R.fx('boom', x, 0.5, z, { r: s.hitR || 1.4, color: s.color });
          if (e) R.aoe(x, z, s.hitR || 1.4, pw * s.k, { stun: s.stun, root: s.root, burn: s.burn, props: false });
        }
        return left > 0;
      });
    },
    // 彈射：打準心方向最近的敵人，再跳到附近還沒打過的，每跳一次弱一點
    chainx(s, P, w, pw) {
      let tg = R.nearestEnemy(P.x, P.z, s.range || 11, P.aimA) || R.nearestEnemy(P.x, P.z, (s.range || 11) * 0.6); if (!tg) { R.toast('附近沒有敵人'); return false; }
      const hit = new Set(); let from = { x: P.x, z: P.z }, k = s.k;
      for (let i = 0; i < (s.n || 4); i++) {
        const cur = tg; if (!cur) break; hit.add(cur);
        const f0 = from, kk = k; later(() => { if (cur.dead) return; R.fx('bolt', f0.x, 1.2, f0.z, { to: cur }); R.hurtEnemy(cur, pw * kk, { stun: s.stun, root: s.root, primary: false }); status(cur, s); }, i * 70);
        from = { x: cur.x, z: cur.z }; k *= s.falloff || 0.85;
        tg = alive().filter(e => !hit.has(e) && dist(e, cur) < (s.jump || 6)).sort((a, b) => dist(a, cur) - dist(b, cur))[0];
      }
      R.sfx && R.sfx('magic');
    },
    // 鉤拉：把準心方向的敵人拉到面前（領主體拉不動：改成把你拉過去）；self＝一定是你過去
    hook(s, P, w, pw) {
      const tg = R.nearestEnemy(P.x, P.z, s.range || 10, P.aimA) || R.nearestEnemy(P.x, P.z, (s.range || 10) * 0.6); if (!tg) { R.toast('附近沒有敵人'); return false; }
      const a = Math.atan2(tg.x - P.x, tg.z - P.z), d = dist(tg, P);
      R.fx('bolt', P.x, 1.2, P.z, { to: tg });
      if (s.self || tg.def.boss) { R.dash(a, Math.max(0, d - 1.3 - tg.def.size * 0.4), 0.2, { iframe: true }); later(() => { if (!tg.dead) { R.hurtEnemy(tg, pw * s.k, { stun: s.stun, primary: false }); status(tg, s); R.fx('spark', tg.x, 1.2, tg.z, { a, crit: true }); } }, 210); }
      else { const [x, z] = R.nearestFloor(P.x + Math.sin(a) * (1.3 + tg.def.size * 0.4), P.z + Math.cos(a) * (1.3 + tg.def.size * 0.4)); tg.x = x; tg.z = z; R.hurtEnemy(tg, pw * s.k, { stun: s.stun, primary: false }); status(tg, s); R.fx('poof', x, 1, z, { color: '#C8C0B0', n: 8 }); }
      P.aimA = a;
    },
    // 連閃：在附近幾隻敵人之間瞬移連斬（瞬移的時候不會受傷）
    dance(s, P, w, pw) {
      if (!R.nearestEnemy(P.x, P.z, s.range || 8)) { R.toast('附近沒有敵人'); return false; }
      const n = s.n || 4, gap = s.gap || 140, hit = new Set(); P.iframe = Math.max(P.iframe || 0, n * gap / 1000 + 0.25); P.stance = Math.max(P.stance || 0, n * gap / 1000);
      for (let i = 0; i < n; i++) later(() => {
        const list = alive().filter(e => dist(e, P) < (s.range || 8)).sort((a, b) => (hit.has(a) - hit.has(b)) || dist(a, P) - dist(b, P)), tg = list[0]; if (!tg) return; hit.add(tg);
        const side = rnd() * 6.28, [x, z] = R.nearestFloor(tg.x + Math.sin(side) * 1.3, tg.z + Math.cos(side) * 1.3);
        R.fx('blink', P.x, 1, P.z); P.x = x; P.z = z; R.collide(P, 0.42); R.fx('blink', P.x, 1, P.z);
        P.aimA = Math.atan2(tg.x - P.x, tg.z - P.z); R.swingAnim(P.h, 0.02, 0.12);
        R.hurtEnemy(tg, pw * s.k, { crit: s.crit >= 1 || (s.crit && rnd() < s.crit), primary: false }); R.fx('spark', tg.x, 1.2, tg.z, { a: P.aimA, crit: true }); R.sfx && R.sfx('swing');
      }, i * gap);
    },
    // 光環：t 秒內跟著你走，每 gap 秒影響身邊 r 公尺（傷害、變慢、詛咒、回復、吸血）
    aura(s, P, w, pw) {
      const run = w.run; let left = s.t || 6, tick = 0;
      w.dyn.push(dt => {
        if (W().run !== run || P.dead) return false; left -= dt; tick -= dt;
        if (tick <= 0) {
          tick = s.gap || 0.5;
          if (s.r) { R.fx('ring', P.x, 0.1, P.z, { r: s.r, color: s.color || '#FFFFFF' }); let got = 0; w.enemies.forEach(e => { if (e.dead || e.under || dist(e, P) > s.r + e.def.size * 0.5) return; if (s.k) { const h0 = e.hp; R.hurtEnemy(e, pw * s.k, { primary: false }); got += Math.max(0, h0 - Math.max(0, e.hp)); } status(e, s); }); if (s.vamp && got) R.healP(got * s.vamp, true); }
          if (s.heal) R.healP(P.hpMax * s.heal, true);
          if (s.mp) P.mp = Math.min(P.mpMax, P.mp + P.mpMax * s.mp);
        }
        return left > 0;
      });
    },
    // 無敵：t 秒內不會受傷；cleanse 解除變慢和看不清楚；dodge 翻滾馬上可以再用
    guard(s, P) { P.iframe = Math.max(P.iframe || 0, s.t || 1); if (s.cleanse) { P.slowT = 0; P.blindT = 0; } if (s.dodge) P.dodgeCd = 0; R.fx('ring', P.x, 0.1, P.z, { r: 1.8, color: s.color || '#FFFFFF' }); R.fx('blink', P.x, 1, P.z); },
    // 換彈：彈匣馬上裝滿；crits：接下來幾發必定暴擊
    reload(s, P) { if (!s.noReload && P.ws.mag) { P.ammo = P.ws.mag; P.reloadT = 0; } if (s.crits) P.crits = (P.crits || 0) + s.crits; R.fx('ring', P.x, 0.1, P.z, { r: 1.2, color: '#FFE08A' }); },
    // 躍擊：跳起來落在準心處（在空中不會受傷），落地再炸一圈
    jumpx(s, P, w, pw) { const [x, z] = R.nearestFloor(...aimIn(P, s.range || 9)), dur = s.dur || 0.6; P.jump = { t: 0, dur, x0: P.x, z0: P.z, x1: x, z1: z }; P.air = dur; if (s.end) later(() => nova(P, w, s.end, pw, x, z), dur * 1000 + 20); },
    // 多段斬：幾道直線斬擊（spread：張開的角度；around：平均分布在四周）
    xslash(s, P, w, pw) { const a0 = P.aimA, n = s.n || 2; for (let i = 0; i < n; i++) { P.aimA = s.around ? a0 + i * Math.PI * 2 / n : a0 + (n > 1 ? (i - (n - 1) / 2) * (s.spread || 1.2) / (n - 1) : 0); T.line(Object.assign({}, s, { delay: (s.gap || 0) * i }), P, w, pw); } P.aimA = a0; R.swingAnim(P.h, 0.02, 0.2); R.sfx && R.sfx('swing'); },
    // 佩特拉的注意（爆破手的爆炸）
    aware(s) { R.addAware(s.v || 3, 'boom'); },
    // 組合：[[型, 參數, 延遲毫秒], ...]；第一段失敗（例如附近沒有敵人）就整個不放
    combo(s, P, w, pw) {
      let ok = true;
      s.parts.forEach(([type, p, d], i) => { const sp = Object.assign({ _id: s._id + ':' + i }, p); if (!d) { if (i === 0) ok = T[type](sp, P, w, pw) !== false; else if (ok) T[type](sp, P, w, pw); } else later(() => { if (ok) T[type](sp, P, w, pw); }, d); });
      return ok ? undefined : false;
    }
  });

  // ---------- 新技能：[id, 名字, 職業, 等級, 冷卻, 魔力, 型, 參數, 說明, 轉職路線] ----------
  const C = { fire: '#FF7A3A', frost: '#BFE6FF', holy: '#FFE8A0', gold: '#C9A13A', earth: '#A08A6A', shadow: '#3A2A4A', hex: '#9A4ACF', green: '#6FB36A', white: '#FFFFFF', bolt: '#BFE8FF', boom: '#FFB45A' };
  const NEW = [
    // 槍手
    ['g_quick', '快拔換彈', 'gunner', 3, 8, 6, 'reload', { crits: 2 }, '一瞬間換好彈匣，接下來兩發必定暴擊。'],
    ['g_slug', '獨頭彈', 'gunner', 7, 6, 8, 'shotx', { k: 2.6, sp: 30, stun: 0.5, slow: 2 }, '射出一發沉重的獨頭彈：打中的敵人暈眩一下、變慢。'],
    ['g_turret', '自動砲台', 'gunner', 9, 16, 14, 'turret', { t: 8, rate: 0.5, reach: 10, k: 0.45, kind: 'bullet', look: 'gun' }, '在準心處架起一座刻了索敵咒文的小砲台，8 秒內自動射擊附近的敵人。'],
    ['g_flare', '照明彈', 'gunner', 11, 12, 12, 'combo', { parts: [['mark', { range: 12, r: 4, t: 6 }], ['at', { range: 12, r: 4, k: 0.3, burn: 1, fx: 'pillar', color: C.boom }, 0]] }, '打出照明彈：落點附近的敵人被照得無處可躲，6 秒內受到的傷害 +30%，並且燃燒。'],
    ['g_frag', '破片手雷', 'gunner', 14, 10, 14, 'at', { range: 11, r: 2.4, k: 1.4, waves: 3, gap: 160, scatter: 2.2, fx: 'boom', color: C.boom, aware: 2 }, '丟出三顆小型破片手雷，在準心附近連炸三下（佩特拉會注意到）。'],
    ['g_suppress', '壓制射擊', 'gunner', 17, 12, 16, 'shotx', { burst: 8, gap: 70, n: 2, spread: 0.3, k: 0.45, sp: 32, slow: 1.5 }, '八輪雙發連射，把敵人壓得抬不起頭：打中的都會變慢。'],
    ['g_hook', '鋼索鉤爪', 'gunner', 20, 9, 10, 'hook', { range: 12, k: 1.2, stun: 1 }, '射出鋼索鉤爪，把敵人拉到面前、撞暈 1 秒（領主體拉不動，改成把你拉過去）。'],
    ['g_allout', '全彈發射', 'gunner', 24, 20, 24, 'combo', { parts: [['shotx', { n: 12, spread: 1.6, k: 0.9, sp: 30, pierce: 1 }], ['reload', {}, 300]] }, '把彈匣和腰包裡的魔力鋼彈頭全部打出去，然後一瞬間換好彈匣。'],
    // 弓箭手
    ['a_bounce', '彈射箭', 'archer', 3, 6, 8, 'chainx', { n: 4, jump: 6, k: 1.2, falloff: 0.85, range: 12 }, '射出會在敵人之間彈跳的箭，最多彈四次。'],
    ['a_pierce', '穿雲箭', 'archer', 7, 8, 10, 'shotx', { k: 2.4, pierce: 99, sp: 42, life: 0.6 }, '拉滿弓射出一支箭，穿過直線上所有的敵人。'],
    ['a_gale', '旋風箭', 'archer', 9, 9, 12, 'wave', { n: 6, step: 1.8, r: 1.6, k: 0.8, kb: 1.5, gap: 60, fx: 'ring', color: '#DDF2FF' }, '射出帶著旋風的箭，一路捲起地上的雪，把沿途的敵人吹開。'],
    ['a_venom', '毒蛇箭', 'archer', 11, 8, 10, 'shotx', { n: 3, spread: 0.25, k: 1.0, curse: 6, slow: 6, sp: 30 }, '射出三支淬了毒的箭：打中的敵人 6 秒內變慢、受到的傷害 +30%。'],
    ['a_hawk2', '獵鷹', 'archer', 14, 16, 14, 'storm', { t: 8, gap: 0.8, r: 10, hitR: 1.2, k: 0.9, fx: 'spark', color: '#8A6A44' }, '放出獵鷹：8 秒內不停俯衝，啄附近的敵人。'],
    ['a_skyrain', '天穹箭雨', 'archer', 17, 14, 18, 'at', { range: 13, r: 2, k: 0.85, waves: 8, gap: 150, scatter: 3.5, fx: 'rain' }, '朝天空連射，八波箭雨落在準心附近一大片。'],
    ['a_grapple', '鉤索', 'archer', 20, 9, 10, 'hook', { range: 12, self: 1, k: 1.2, stun: 0.8 }, '射出鉤索，把自己拉到準心方向的敵人身邊，順勢一腳踢暈。'],
    ['a_fullmoon', '滿月', 'archer', 24, 16, 20, 'shotx', { n: 16, spread: 6.28, k: 0.9, pierce: 1, sp: 30 }, '原地轉一圈，往四面八方射出十六支箭。'],
    // 戰士
    ['w_kick', '踹擊', 'warrior', 3, 5, 6, 'line', { len: 2.4, width: 0.9, k: 1.2, kb: 3, stun: 0.5, color: '#C8B08A' }, '往前狠狠一腳，把敵人踹開、踹暈一下。'],
    ['w_throw', '回旋飛斬', 'warrior', 7, 7, 8, 'boomer', { range: 9, sp: 16, k: 1.3, look: 'axe' }, '把武器扔出去，飛到 9 公尺再轉回手上，來回都會砍到敵人。'],
    ['w_bull', '蠻牛衝撞', 'warrior', 9, 9, 10, 'dash', { len: 7, dur: 0.35, k: 1.4, kb: 3, stun: 0.6 }, '低頭往前衝 7 公尺，撞開路上的敵人。'],
    ['w_fissure', '地裂斬', 'warrior', 11, 9, 12, 'wave', { n: 6, step: 1.6, r: 1.4, k: 1.0, stun: 0.3, gap: 60, color: C.earth }, '一刀劈進地面，裂縫往前竄出 10 公尺，裂縫上的敵人暈眩一下。'],
    ['w_menace', '威嚇', 'warrior', 14, 14, 10, 'nova', { r: 5, k: 0.3, curse: 4, slow: 4, color: '#E8603A' }, '朝四周怒吼：周圍的敵人 4 秒內變慢、受到的傷害 +30%。'],
    ['w_bloodfight', '血戰', 'warrior', 17, 18, 12, 'buff', { t: 8, dmg: 1.15, vamp: 0.05, def: 0.1, color: '#B8322A' }, '殺紅了眼：8 秒內傷害 +15%、受到的傷害 −10%，打出去的傷害有 5% 變成生命。'],
    ['w_meteor', '隕擊', 'warrior', 20, 12, 16, 'jumpx', { range: 10, dur: 0.7, end: { r: 3.6, k: 2.2, stun: 1, color: C.earth } }, '高高躍起，連人帶武器砸進準心處，周圍的敵人暈眩。'],
    ['w_bladestorm', '劍刃風暴', 'warrior', 24, 18, 20, 'combo', { parts: [['aura', { t: 4, r: 3.2, gap: 0.25, k: 0.5, color: '#FF8A6A' }], ['buff', { t: 4, speed: 1.15 }]] }, '武器捲起一陣風暴，跟著你轉 4 秒：靠近的敵人都被砍到，移動 +15%。'],
    // 術士
    ['m_embers', '火花連射', 'mage', 3, 4, 10, 'shotx', { burst: 4, gap: 90, k: 0.55, burn: 1, look: 'ember', sp: 22 }, '念一串短咒，連射四發小火球：打中的敵人燃燒。'],
    ['m_frostray', '冰霜射線', 'mage', 7, 9, 18, 'beam', { t: 1.6, tick: 0.15, len: 9, width: 0.7, k: 0.35, slow: 2 }, '念出寒冰咒，朝準心照出一道寒氣 1.6 秒（可以邊走邊轉方向）：照到的敵人變慢。'],
    ['m_thundercloud', '雷雲', 'mage', 9, 14, 24, 'storm', { t: 6, gap: 0.7, r: 9, hitR: 1.4, k: 0.9, stun: 0.3, fx: 'pillar', color: C.bolt }, '在頭上召來雷雲 6 秒，雷自己劈向附近的敵人。'],
    ['m_spikes', '岩刺', 'mage', 11, 9, 18, 'wave', { n: 7, step: 1.5, r: 1.2, k: 1.1, root: 0.6, gap: 60, color: C.earth }, '念出大地咒，岩刺沿著準心方向一根根冒出來，刺到的敵人被定住一下。'],
    ['m_flamethrower', '火焰噴射', 'mage', 14, 10, 22, 'breath', { t: 1.5, tick: 0.15, range: 5.5, arc: 0.9, k: 0.35, burn: 1, color: C.fire }, '掌心噴出火焰 1.5 秒（跟著準心轉）：前方扇形的敵人持續受傷、燃燒。'],
    ['m_stasis', '時緩', 'mage', 17, 14, 26, 'at', { range: 12, r: 5, k: 0.2, slow: 5, root: 0.5, fx: 'ring', color: '#B89AFF' }, '讓準心處的時間變慢：範圍內的敵人 5 秒內動作遲緩。'],
    ['m_manaburst', '魔力爆發', 'mage', 20, 12, 40, 'nova', { r: 4, k: 2.2, kb: 2, color: '#B89AFF' }, '把身上的魔力一口氣炸開：周圍的敵人重傷、被推開。'],
    ['m_starfall', '星隕', 'mage', 24, 24, 50, 'storm', { t: 4, gap: 0.3, r: 10, hitR: 2, k: 0.9, burn: 1, fx: 'boom', color: C.boom }, '念出最長的一段咒文：4 秒內流星不停地砸向附近的敵人。'],
    // 牧師
    ['p_ray', '祈光', 'priest', 3, 6, 12, 'beam', { t: 1.2, tick: 0.15, len: 8, width: 0.6, k: 0.32, selfHeal: 0.006 }, '祈禱，掌心照出一道光 1.2 秒：照到的敵人受傷，你慢慢回復生命。'],
    ['p_chain', '光之鎖鏈', 'priest', 7, 8, 14, 'chainx', { n: 4, jump: 6, k: 1.0, falloff: 0.9, stun: 0.3, range: 10 }, '祈禱化成光的鎖鏈，在四隻敵人之間跳躍，每一隻都暈眩一下。'],
    ['p_lamp', '聖燈', 'priest', 9, 18, 20, 'turret', { t: 10, rate: 0.8, reach: 9, k: 0.55, kind: 'holy', heal: 0.02, r: 3.5, look: 'lamp', color: C.holy }, '在準心處立起一盞聖燈 10 秒：自動射出光彈；站在旁邊每秒回復 2% 生命。'],
    ['p_hallow', '祝聖', 'priest', 11, 16, 20, 'aura', { t: 6, r: 3, gap: 0.5, k: 0.25, heal: 0.01, color: C.holy }, '祈禱讓腳下的地面變得神聖 6 秒（跟著你走）：灼傷靠近的敵人，回復生命。'],
    ['p_refuge', '庇護', 'priest', 14, 18, 18, 'combo', { parts: [['guard', { t: 1.5, cleanse: 1, color: C.holy }], ['heal', { pct: 0.1 }]] }, '祈求庇護：1.5 秒內不會受傷，解除不良狀態，回復 10% 生命。'],
    ['p_burst', '光爆', 'priest', 17, 12, 22, 'nova', { r: 4.5, k: 1.6, stun: 0.8, color: C.white }, '以自己為中心放出強光：周圍的敵人受傷、暈眩。'],
    ['p_hymn', '聖歌', 'priest', 20, 22, 26, 'combo', { parts: [['buff', { t: 10, dmg: 1.1, def: 0.15, regen: 0.01, color: C.holy }], ['heal', { allies: 0.2 }]] }, '唱起聖歌：10 秒內傷害 +10%、受到的傷害 −15%、每秒回復 1% 生命；隊友回復 20%。'],
    ['p_heaven', '天罰', 'priest', 24, 24, 40, 'storm', { t: 3, gap: 0.22, r: 10, hitR: 1.8, k: 0.9, stun: 0.4, fx: 'pillar', color: C.holy }, '祈禱降下天罰：3 秒內光柱不停落在附近的敵人身上。'],
    // 刀客
    ['b_step', '縮地斬', 'blade', 3, 6, 8, 'combo', { parts: [['dash', { len: 4, dur: 0.15 }], ['arc', { range: 2.6, arc: 3.0, k: 1.1 }, 170]] }, '一步踏進敵人懷裡，順勢橫斬。'],
    ['b_cross', '十字斬', 'blade', 7, 7, 10, 'xslash', { n: 2, spread: 1.57, len: 3.5, width: 0.6, k: 1.3, color: C.white }, '交叉斬出兩刀，形成一個十字。'],
    ['b_dance', '亂舞', 'blade', 9, 12, 14, 'dance', { n: 4, range: 8, k: 1.0, crit: 0.3, gap: 140 }, '在附近的敵人之間連閃四次，一閃一刀（閃的時候不會受傷）。'],
    ['b_wave', '刀氣浪', 'blade', 11, 9, 12, 'wave', { n: 5, step: 1.8, r: 1.2, k: 1.0, gap: 50, fx: 'ring', color: C.white }, '橫刀一揮，刀氣貼著地面往前推出 9 公尺。'],
    ['b_mist', '霧隱', 'blade', 14, 16, 10, 'buff', { t: 3, invis: 3, speed: 1.2, color: '#C8C8D0' }, '化進霧裡：隱身 3 秒、移動 +20%。'],
    ['b_hundred', '百裂', 'blade', 17, 10, 14, 'arc', { range: 2.4, arc: 1.6, k: 0.35, hits: 12, gap: 50 }, '0.6 秒內往前刺出十二刀。'],
    ['b_moonfall', '月落', 'blade', 20, 12, 16, 'jumpx', { range: 7, dur: 0.5, end: { r: 2.6, k: 2.6, color: C.white } }, '躍上半空，像月亮落下一樣斬向準心處。'],
    ['b_void', '虛空斬', 'blade', 24, 18, 20, 'line', { len: 12, width: 1.4, k: 3.6, delay: 700, crit: 0.5, color: C.white }, '收刀靜止 0.7 秒，斬開前方 12 公尺的空間，五成機率暴擊。'],
    // 騎士
    ['k_throw', '擲盾', 'knight', 3, 7, 8, 'boomer', { range: 8, sp: 18, k: 1.2, stun: 0.4, look: 'disc' }, '把盾扔出去再接回來，來回都會撞暈敵人。'],
    ['k_lancecharge', '衝鋒突刺', 'knight', 7, 9, 10, 'dash', { len: 6, dur: 0.25, k: 1.6, kb: 2 }, '架起武器往前衝 6 公尺，刺穿路上的敵人。'],
    ['k_banner', '戰旗', 'knight', 9, 20, 14, 'turret', { t: 12, r: 4, buffDmg: 1.15, buffDef: 0.1, look: 'banner', color: '#2F4A6E', self: 1 }, '在身邊插下戰旗 12 秒：站在旗子旁邊，傷害 +15%、受到的傷害 −10%。'],
    ['k_chain', '鎖鏈', 'knight', 11, 9, 10, 'hook', { range: 9, k: 1.0, stun: 1.0 }, '甩出鎖鏈，把敵人拖到盾前撞暈 1 秒（領主體拖不動，改成把你拉過去）。'],
    ['k_stomp', '重踏', 'knight', 14, 12, 14, 'nova', { r: 3.8, k: 1.3, stun: 0.6, slow: 3, waves: 2, gap: 400, color: C.earth }, '重重踏地兩下：周圍的敵人暈眩、變慢。'],
    ['k_domain', '守護領域', 'knight', 17, 20, 18, 'combo', { parts: [['aura', { t: 6, r: 3.5, gap: 0.5, k: 0.15, slow: 1, color: C.gold }], ['buff', { t: 6, def: 0.25, taunt: 6, color: C.gold }]] }, '張開守護的領域 6 秒（跟著你走）：周圍的敵人變慢、改打你；受到的傷害 −25%。'],
    ['k_spearwall', '槍陣', 'knight', 20, 10, 14, 'xslash', { n: 3, spread: 1.2, len: 5, width: 0.5, k: 1.6, color: '#D8DEE6' }, '一口氣往前方刺出三道突刺，排成一片槍陣。'],
    ['k_laststand', '最後的堡壘', 'knight', 24, 26, 20, 'combo', { parts: [['guard', { t: 2, color: C.gold }], ['heal', { pct: 0.3 }], ['nova', { r: 4, k: 1.5, kb: 3, color: C.gold }]] }, '2 秒內不會受傷、回復 30% 生命，並把周圍的敵人震開。'],
    // ---------- 轉職路線 ----------
    ['sn_mark', '標定', 'gunner', 11, 12, 10, 'combo', { parts: [['mark', { range: 16, r: 1.8, t: 10 }], ['reload', { crits: 1, noReload: 1 }]] }, '用瞄準鏡標定一隻獵物：10 秒內受到的傷害 +30%；下一發必定暴擊。', 'sniper'],
    ['sn_pierce', '貫通連射', 'gunner', 18, 12, 18, 'shotx', { burst: 3, gap: 220, k: 2.4, pierce: 99, sp: 50, life: 0.5 }, '每隔一下射出一發貫穿彈，連射三發。', 'sniper'],
    ['sn_one', '一發入魂', 'gunner', 24, 22, 24, 'line', { len: 22, width: 0.5, k: 8, crit: 1, delay: 1200, color: '#FFE08A' }, '屏住呼吸 1.2 秒，射出這一趟最重的一槍（必定暴擊）。', 'sniper'],
    ['mg_beam', '魔導光束', 'gunner', 11, 12, 20, 'beam', { t: 2, tick: 0.12, len: 12, width: 0.6, k: 0.4, burn: 1 }, '槍口接上魔導迴路，射出持續 2 秒的光束（跟著準心轉），照到的敵人燃燒。', 'magigun'],
    ['mg_turret', '魔導砲台', 'gunner', 18, 18, 24, 'turret', { t: 10, rate: 0.35, reach: 11, k: 0.5, kind: 'eorb', look: 'gun', color: '#7FD8FF' }, '架起魔導砲台 10 秒，連續射出魔力彈。', 'magigun'],
    ['mg_tri', '元素新星', 'gunner', 24, 20, 32, 'combo', { parts: [['nova', { r: 4.5, k: 1.3, burn: 1, color: C.fire }], ['nova', { r: 5, k: 1.2, slow: 3, color: C.frost }, 300], ['nova', { r: 5.5, k: 1.2, stun: 0.6, color: '#FFE08A' }, 600]] }, '火、冰、雷三圈新星接連炸開：燃燒、變慢、暈眩。', 'magigun'],
    ['bo_mines', '連鎖地雷', 'gunner', 11, 14, 16, 'zone', { zone: 'trap', range: 8, r: 1.2, life: 30, k: 2.2, count: 5 }, '在準心附近一次埋下五顆爆裂核心做的地雷。', 'bomber'],
    ['bo_rocket', '火箭推進', 'gunner', 18, 12, 16, 'combo', { parts: [['dash', { len: 8, dur: 0.3, k: 1.5, end: { r: 3, k: 2, color: C.boom } }], ['aware', { v: 3 }]] }, '背上的爆裂核心把你推出去 8 公尺，落地炸開（佩特拉會注意到）。', 'bomber'],
    ['bo_carpet', '地毯轟炸', 'gunner', 24, 22, 28, 'wave', { n: 8, step: 2, r: 2.6, k: 2.0, gap: 120, color: C.boom, aware: 6 }, '一整排爆裂核心沿著準心方向接連引爆（佩特拉會注意到）。', 'bomber'],
    ['ar_rift', '裂空', 'archer', 11, 10, 18, 'shotx', { k: 3, pierce: 99, sp: 45, kind: 'hama', curse: 4, life: 0.6 }, '魔箭撕開空氣，射穿直線上的敵人：打中的 4 秒內受到的傷害 +30%。', 'arcane'],
    ['ar_seeker', '追星', 'archer', 18, 12, 22, 'shotx', { n: 5, spread: 1, k: 1.2, homing: 8, life: 2.4, sp: 18, curse: 4 }, '射出五支會一直追著敵人的魔箭。', 'arcane'],
    ['ar_galaxy', '星河', 'archer', 24, 22, 34, 'storm', { t: 4, gap: 0.2, r: 11, hitR: 1.4, k: 0.75, fx: 'pillar', color: '#B89AFF' }, '射向天空的魔箭化成星河，4 秒內不停落在附近的敵人身上。', 'arcane'],
    ['ra_sprint', '疾走', 'archer', 11, 14, 10, 'combo', { parts: [['buff', { t: 6, speed: 1.35, color: C.green }], ['guard', { t: 0.4, dodge: 1, color: C.green }]] }, '6 秒內移動 +35%，翻滾馬上可以再用。', 'ranger'],
    ['ra_blast', '爆裂陷阱', 'archer', 18, 16, 18, 'zone', { zone: 'trap', range: 9, r: 1.3, life: 30, k: 3, count: 4 }, '在準心附近布下四個重型捕獸夾。', 'ranger'],
    ['ra_hunt', '狩獵時刻', 'archer', 24, 22, 20, 'combo', { parts: [['mark', { range: 12, r: 5, t: 8 }], ['buff', { t: 8, crit: 0.3, speed: 1.15, color: C.green }]] }, '標記準心附近所有的獵物（受到的傷害 +30%），8 秒內暴擊率 +30%、移動 +15%。', 'ranger'],
    ['hm_ring', '破魔結界陣', 'archer', 11, 16, 20, 'aura', { t: 6, r: 4, gap: 0.5, k: 0.6, slow: 1, color: C.white }, '破魔矢插在身邊圍成結界 6 秒（跟著你走）：靠近的遺跡生物受傷、變慢。', 'hama'],
    ['hm_rain', '破魔矢雨', 'archer', 18, 14, 22, 'at', { range: 12, r: 3, k: 1.2, waves: 4, gap: 200, fx: 'pillar', color: C.white }, '破魔矢從天而降，在準心處落下四波。', 'hama'],
    ['hm_thousand', '破魔・千本', 'archer', 24, 20, 30, 'shotx', { n: 9, spread: 1.2, k: 1.6, pierce: 99, kind: 'hama', sp: 36, life: 0.7 }, '九支破魔矢扇形齊射，射穿直線上的一切。', 'hama'],
    ['bs_leap', '狂躍', 'warrior', 11, 10, 10, 'jumpx', { range: 9, dur: 0.55, end: { r: 3, k: 2, kb: 2, color: '#B8322A' } }, '咆哮著跳過去，砸在準心處。', 'berserker'],
    ['bs_frenzy', '狂亂', 'warrior', 18, 12, 14, 'arc', { range: 3, arc: 6.28, k: 0.8, hits: 8, gap: 90, vamp: 0.1 }, '不管三七二十一地亂砍八刀，傷害的一成變成生命。', 'berserker'],
    ['bs_undying', '不死狂怒', 'warrior', 24, 30, 16, 'combo', { parts: [['guard', { t: 2, color: '#B8322A' }], ['buff', { t: 8, dmg: 1.4, vamp: 0.12, color: '#B8322A' }]] }, '2 秒內不會受傷；之後 8 秒傷害 +40%，打出去的傷害有 12% 變成生命。', 'berserker'],
    ['gl_cheer', '喝采', 'warrior', 11, 16, 10, 'buff', { t: 8, dmg: 1.2, taunt: 3, color: '#E8C04A' }, '聽見鬥技場的喝采：8 秒內傷害 +20%，周圍的敵人改打你。', 'gladiator'],
    ['gl_trident', '三叉刺', 'warrior', 18, 9, 12, 'xslash', { n: 3, spread: 0.6, len: 4.5, width: 0.5, k: 1.6, color: '#D8DEE6' }, '三道突刺同時往前刺出去。', 'gladiator'],
    ['gl_duel', '決鬥場', 'warrior', 24, 24, 18, 'combo', { parts: [['aura', { t: 8, r: 4.5, gap: 0.6, k: 0.4, curse: 1, color: '#E8C04A' }], ['buff', { t: 8, def: 0.2, color: '#E8C04A' }]] }, '把身邊 4.5 公尺圍成決鬥場 8 秒：裡面的敵人持續受傷、受到的傷害 +30%；你受到的傷害 −20%。', 'gladiator'],
    ['in_flow', '行氣', 'warrior', 11, 18, 0, 'aura', { t: 8, gap: 0.5, heal: 0.01, mp: 0.015 }, '在體內行氣 8 秒：每秒回復 2% 生命、3% 魔力。', 'inner'],
    ['in_wave', '氣浪', 'warrior', 18, 10, 14, 'wave', { n: 5, step: 1.8, r: 1.6, k: 1.4, kb: 2, gap: 60, fx: 'ring', color: C.bolt }, '雙掌推出氣浪，一路往前把敵人推開。', 'inner'],
    ['in_still', '止水', 'warrior', 24, 22, 18, 'combo', { parts: [['guard', { t: 1.2, color: C.bolt }], ['nova', { r: 5, k: 2.6, stun: 1.2, color: C.bolt }, 400]] }, '靜如止水 1.2 秒（不會受傷），再一口氣把氣勁放出去，震暈周圍的敵人。', 'inner'],
    ['el_firewhirl', '炎旋', 'mage', 11, 12, 26, 'breath', { t: 2, tick: 0.12, range: 6, arc: 1.2, k: 0.4, burn: 1, color: C.fire }, '念出火之咒，噴出旋轉的火焰 2 秒（跟著準心轉）。', 'elementalist'],
    ['el_rockslide', '岩崩', 'mage', 18, 14, 30, 'wave', { n: 8, step: 1.6, r: 1.8, k: 1.4, stun: 0.5, gap: 70, color: C.earth }, '大地一路崩開，碎岩往前滾出 13 公尺，砸到的敵人暈眩。', 'elementalist'],
    ['el_tempest', '雷暴', 'mage', 24, 22, 44, 'storm', { t: 5, gap: 0.35, r: 11, hitR: 1.6, k: 0.8, stun: 0.4, fx: 'pillar', color: C.bolt }, '召來雷暴 5 秒，雷一道接一道劈向附近的敵人。', 'elementalist'],
    ['hx_bind', '怨縛', 'mage', 11, 9, 16, 'hook', { range: 10, k: 0.8, curse: 6, root: 1 }, '咒術化成看不見的手，把敵人拖過來、綁住並詛咒。', 'hexer'],
    ['hx_wither', '枯萎', 'mage', 18, 16, 26, 'aura', { t: 6, r: 4, gap: 0.5, k: 0.3, slow: 1, curse: 1, color: C.hex }, '身邊 6 秒內瀰漫枯萎的咒：靠近的敵人持續受傷、變慢、受到的傷害 +30%。', 'hexer'],
    ['hx_doom', '宣告', 'mage', 24, 20, 30, 'combo', { parts: [['mark', { range: 12, r: 2.4, t: 10 }], ['at', { range: 12, r: 2.4, k: 4, delay: 2500, fx: 'pillar', color: '#6A2A8A' }]] }, '對準心處的敵人宣告死期：先詛咒，2.5 秒後降下咒術的重擊。', 'hexer'],
    ['sk_wolf', '狼式神', 'mage', 11, 14, 22, 'storm', { t: 8, gap: 0.7, r: 9, hitR: 1.2, k: 0.9, fx: 'spark', color: '#E8E0FF' }, '放出狼形的紙式神：8 秒內撲咬附近的敵人。', 'shikigami'],
    ['sk_swarm', '千羽', 'mage', 18, 12, 26, 'shotx', { n: 12, spread: 6.28, k: 0.7, homing: 7, kind: 'spirit', sp: 14, life: 2.2, look: 'card' }, '十二隻紙鳥式神往四面八方飛出去，再追著敵人撞上去。', 'shikigami'],
    ['sk_giant', '大式神', 'mage', 24, 24, 36, 'turret', { t: 10, rate: 0.5, reach: 10, k: 0.8, n: 3, kind: 'spirit', homing: 4, look: 'paper', color: '#E8E0FF' }, '在準心處立起一尊大式神 10 秒，一次放出三隻小式神攻擊敵人。', 'shikigami'],
    ['bi_wide', '聖域擴張', 'priest', 11, 18, 26, 'zone', { zone: 'sanct', self: 1, r: 5.5, life: 8, k: 0.4 }, '展開更大的聖域 8 秒：站在裡面回復生命，灼傷進來的敵人。', 'bishop'],
    ['bi_rise', '再起', 'priest', 18, 26, 30, 'combo', { parts: [['guard', { t: 1, cleanse: 1, color: C.holy }], ['heal', { pct: 0.35, allies: 0.5 }]] }, '1 秒內不會受傷；你回復 35% 生命、身邊的隊友回復 50%。', 'bishop'],
    ['bi_light', '大聖光', 'priest', 24, 22, 40, 'combo', { parts: [['nova', { r: 6, k: 2.4, stun: 1, color: C.holy }], ['heal', { pct: 0.2 }]] }, '放出大聖光：周圍 6 公尺的敵人重傷、暈眩，你回復 20% 生命。', 'bishop'],
    ['dr_vine', '藤鞭', 'priest', 11, 9, 14, 'hook', { range: 9, k: 1.2, root: 1.5 }, '甩出藤蔓把敵人拉過來，綁住 1.5 秒。', 'druid'],
    ['dr_grove', '古樹', 'priest', 18, 20, 26, 'turret', { t: 12, rate: 1.0, reach: 8, k: 0.8, kind: 'seed', heal: 0.015, r: 4, look: 'tree', color: '#4E8A4A' }, '在準心處長出一棵古樹 12 秒：朝敵人吐出種子；站在樹下每秒回復生命。', 'druid'],
    ['dr_wrath', '自然之怒', 'priest', 24, 24, 36, 'combo', { parts: [['nova', { r: 5, k: 1.8, root: 2, color: C.green }], ['storm', { t: 3, gap: 0.3, r: 8, hitR: 1.4, k: 0.9, fx: 'pillar', color: C.green }]] }, '藤蔓從地底竄出纏住周圍的敵人，再落下三秒的綠色雷光。', 'druid'],
    ['sh_ofuda', '符咒', 'priest', 11, 8, 16, 'shotx', { n: 3, spread: 0.4, k: 1.3, homing: 4, kind: 'spirit', sp: 22, curse: 4, look: 'card' }, '射出三張符：打中的遺跡生物 4 秒內受到的傷害 +30%。', 'shinkan'],
    ['sh_ooharae', '大祓', 'priest', 18, 16, 28, 'combo', { parts: [['nova', { r: 5.5, k: 2, kb: 2.5, color: C.white }], ['heal', { pct: 0.1, cleanse: 1 }]] }, '大大地揮動御幣祓除：周圍的遺跡生物受傷、被推開；你回復 10% 生命、解除不良狀態。', 'shinkan'],
    ['sh_pillars', '結界柱', 'priest', 24, 24, 34, 'turret', { t: 12, r: 5, aura: 0.3, slowAura: 1, look: 'pillar', color: C.white }, '在準心處立起結界柱 12 秒：範圍裡的遺跡生物持續受傷、變慢。', 'shinkan'],
    ['ks_wind', '風刃', 'blade', 11, 8, 14, 'shotx', { n: 3, spread: 0.5, k: 1.6, pierce: 3, kind: 'hama', sp: 26, life: 0.6, look: 'blade' }, '三道刀風扇形飛出去，每一道穿過三隻敵人。', 'kensei'],
    ['ks_moon', '鏡花水月', 'blade', 18, 14, 18, 'dance', { n: 5, range: 9, k: 1.4, crit: 0.5, gap: 120 }, '身影像水裡的月亮一樣抓不到：在附近的敵人之間閃五次，一閃一刀。', 'kensei'],
    ['ks_mushin', '無想', 'blade', 24, 22, 24, 'line', { len: 14, width: 1.6, k: 6, crit: 1, delay: 900, color: C.white }, '什麼都不想，0.9 秒後斬出 14 公尺的一刀，必定暴擊。', 'kensei'],
    ['sd_smoke', '煙玉', 'blade', 11, 12, 10, 'at', { range: 6, r: 3.5, k: 0.2, slow: 3, invis: 3, fx: 'poof', color: '#5A4A6A' }, '丟出煙玉：範圍內的敵人變慢，你隱身 3 秒。', 'shadow'],
    ['sd_knives', '飛刀扇', 'blade', 18, 8, 12, 'shotx', { n: 7, spread: 0.9, k: 0.9, pierce: 1, kind: 'feather', sp: 30, look: 'blade' }, '一揮手扇形擲出七把飛刀。', 'shadow'],
    ['sd_assassinate', '暗殺', 'blade', 24, 20, 20, 'dance', { n: 3, range: 12, k: 2.6, crit: 1, gap: 200 }, '從影子裡出現在三隻敵人身邊，一刀一隻，必定暴擊。', 'shadow'],
    ['yt_hunger', '飢渴', 'blade', 11, 14, 12, 'aura', { t: 5, r: 3, gap: 0.5, k: 0.5, vamp: 0.3, color: '#B83AE8' }, '妖刀渴了 5 秒：身邊的敵人持續受傷，傷害的三成變成你的生命。', 'yoto'],
    ['yt_four', '妖斬・四方', 'blade', 18, 10, 14, 'xslash', { n: 4, around: 1, len: 4, width: 0.7, k: 1.5, color: '#B83AE8' }, '妖刀往前後左右同時斬出四刀。', 'yoto'],
    ['yt_eclipse', '蝕月', 'blade', 24, 24, 20, 'combo', { parts: [['buff', { t: 6, dmg: 1.3, vamp: 0.1, color: '#B83AE8' }], ['nova', { r: 4.5, k: 2.4, curse: 4, color: '#B83AE8' }]] }, '妖刀的魔力質吞掉四周的光：周圍的敵人重傷並被詛咒；6 秒內傷害 +30%、吸血。', 'yoto'],
    ['tp_shieldwall', '聖盾陣', 'knight', 11, 16, 14, 'buff', { t: 5, def: 0.4, kekkai: 1, color: C.gold }, '架起聖盾陣 5 秒：受到的傷害 −40%，擋下飛過來的投射物。', 'templar'],
    ['tp_verdict', '審判之刃', 'knight', 18, 10, 16, 'line', { len: 6, width: 1.4, k: 3, stun: 1, color: C.holy }, '一劍斬下審判，前方一直線的敵人暈眩。', 'templar'],
    ['tp_unfallen', '不落', 'knight', 24, 28, 22, 'combo', { parts: [['guard', { t: 2.5, color: C.gold }], ['nova', { r: 4, k: 1.6, kb: 2, taunt: 6, color: C.gold }], ['buff', { t: 6, def: 0.4, color: C.gold }]] }, '2.5 秒內不會受傷，震開周圍的敵人並讓牠們改打你；6 秒內受到的傷害 −40%。', 'templar'],
    ['pl_wave', '聖光波', 'knight', 11, 10, 14, 'wave', { n: 5, step: 1.8, r: 1.6, k: 1.2, gap: 60, fx: 'ring', color: C.holy }, '劍尖推出聖光，一路往前灼傷敵人。', 'paladin'],
    ['pl_aura', '虔誠光環', 'knight', 18, 18, 20, 'aura', { t: 8, r: 4, gap: 0.5, k: 0.2, heal: 0.01, color: C.holy }, '8 秒內身邊有光環（跟著你走）：灼傷靠近的敵人，回復生命。', 'paladin'],
    ['pl_avatar', '化身', 'knight', 24, 26, 24, 'combo', { parts: [['buff', { t: 8, dmg: 1.25, def: 0.25, regen: 0.01, color: C.holy }], ['nova', { r: 4, k: 1.5, color: C.holy }]] }, '化身為光：8 秒內傷害 +25%、受到的傷害 −25%、每秒回復 1% 生命，並放出一圈聖光。', 'paladin'],
    ['dg_tail', '龍尾掃', 'knight', 11, 8, 12, 'arc', { range: 4, arc: 3.6, k: 1.4, kb: 2.5 }, '長槍像龍尾一樣掃過一大片，把敵人掃開。', 'dragoon'],
    ['dg_triple', '三段突', 'knight', 18, 10, 14, 'combo', { parts: [['line', { len: 5, width: 0.6, k: 1.2, color: '#9AD8FF' }], ['line', { len: 5, width: 0.6, k: 1.2, color: '#9AD8FF' }, 150], ['line', { len: 6, width: 0.7, k: 1.6, kb: 2, color: '#9AD8FF' }, 300]] }, '突、突、再一記更長的突刺。', 'dragoon'],
    ['dg_skyfall', '天落', 'knight', 24, 22, 26, 'jumpx', { range: 12, dur: 0.9, end: { r: 4.5, k: 3.6, stun: 1.2, color: '#9AD8FF' } }, '跳得比龍落還高，從天上砸進準心處：周圍的敵人重傷、暈眩。', 'dragoon']
  ];
  NEW.forEach(([id, name, cls, lv, cd, mp, type, p, desc, adv]) => { LIB[id] = { id, name, cls, lv, cd, mp, type, p, desc, adv }; R.SKILLS[id] = { name, cd, mp, desc }; });

  // ---------- 技能書上的分類 ----------
  const TAG = { shots: '射擊', shotx: '射擊', at: '落點', line: '直線', arc: '揮砍', dash: '衝刺', blink: '瞬移', buff: '強化', heal: '治療', zone: '陷阱', mark: '標記', pull: '吸引', drain: '吸取', nova: '範圍', orbit: '式神', parry: '架勢', chain: '彈射', boomer: '迴旋', beam: '照射', turret: '設置', wave: '推進', breath: '噴射', storm: '天降', chainx: '彈射', hook: '鉤拉', dance: '連閃', aura: '光環', guard: '無敵', reload: '換彈', jumpx: '躍擊', xslash: '多段斬' };
  R.skillTag = id => { const s = LIB[id]; if (!s) return ''; return s.type === 'combo' ? s.p.parts.map(p => TAG[p[0]]).filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 2).join('＋') : TAG[s.type] || ''; };
})(window.R);
