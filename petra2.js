// 佩特拉的反應：全部更狠（作者 2026-10-04）＋環境分照「關注」算
// - 關注：佩特拉的注意每跨過 25、50、75 算一次（run.noticeCount；guildtask.js 的環境分每次扣 5，反應每次扣 20），跳提示。
// - 擠壓型（「蠻容易逃掉的，被輾到也才扣五分之一」）：牆多一倍、合得更快、合攏後壓更久；被牆碾到每 0.5 秒扣三成五生命，
//   合攏的那一下房間中間的人再扣五成五（翻滾躲得掉）。
// - 崩塌型（「很好躲，石頭很擋路」）：落石變多、警告只有半秒多、三顆有兩顆砸在你「接下來會走到」的地方；最後整片大崩落（四公尺半）。
//   落下來的石堆 8 秒後碎掉，不會一直擋路。
// - 生物型（「一個技能就全死了」）：長出來的肉芽硬好幾倍，還有一大塊「肉體組織」母體（很硬、會回血、每 5 秒再長肉芽）；
//   打爛母體，剩下的肉芽才會枯掉。
// - 斷尾型（combat.js）：封得更快、困在裡面更痛、5 秒沒逃出去整區被吞掉、吐到上下兩層內的隨機樓層；肉壁很硬、
//   沒被打 1.5 秒就長回去、打破了 4 秒後再長出來（這裡）。
// - 驅逐型（expel.js）：多遠都會過來（越遠越久才到）、追得快、推得兇。
// - 被斷尾吞掉、吐到別層之後：90 秒內生命、魔力的回復減半（P.petraCurse）。
// 放在 zonefx.js 後面。
(function (R) {
  const W = () => R.W, T = () => THREE, rnd = Math.random;
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const floorAt = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);

  // ---------- 關注 ----------
  const aw0 = R.addAware;
  R.addAware = (v, why) => {
    const run = W().run, b = run ? run.aware : 0, r = aw0(v, why);
    if (run && W().run === run && !run.done) {
      const a = run.aware; let n = 0; [25, 50, 75].forEach(th => { if (b < th && a >= th) n++; });
      if (n) { run.noticeCount = (run.noticeCount || 0) + n; R.toast && R.toast('佩特拉注意到你了（注意 ' + Math.floor(a) + '）——委託的環境分會扣', '#E07A9A'); }
    }
    return r;
  };

  // ---------- 擠壓型 ----------
  R.squeeze = room => {
    const w = W(), TH = T(), run = w.run, P = w.P, lv = run.grade.lv || 1;
    const mat = new TH.MeshLambertMaterial({ color: R.theme(run).wall, emissive: '#3A0A14', emissiveIntensity: 0.25 });
    const all = R.roomEdgeTiles(room).sort(() => rnd() - 0.5), n = Math.min(all.length, 44 + 6 * lv);
    const blocks = all.slice(0, n).map(([x, z]) => { const m = new TH.Mesh(new TH.BoxGeometry(1.9, 2.6, 1.9), mat); m.position.set(x, -1.3, z); m.castShadow = true; w.scene.add(m); const c = R.addBox(x - 0.95, x + 0.95, z - 0.95, z + 0.95, 'squeeze'); c.on = false; const d = Math.hypot(room.x - x, room.z - z) || 1; return { m, c, x, z, ux: (room.x - x) / d, uz: (room.z - z) / d, max: d * 0.9 }; });
    const CLOSE = Math.max(1.2, 1.9 - 0.15 * lv), HOLD = 4.5, OPEN = 1.5;
    let t = 0, hitCd = 0, slammed = false;
    w.dyn.push(dt => {
      if (W().run !== run) return false;
      t += dt; hitCd -= dt; const rise = Math.min(1, t / 0.7), tt = t - 0.7;
      const k = tt < 0 ? 0 : tt < CLOSE ? Math.pow(tt / CLOSE, 1.5) : tt < CLOSE + HOLD ? 1 : tt < CLOSE + HOLD + OPEN ? 1 - (tt - CLOSE - HOLD) / OPEN : 0;
      blocks.forEach(b => { const x = b.x + b.ux * b.max * k, z = b.z + b.uz * b.max * k; b.c.x0 = x - 0.95; b.c.x1 = x + 0.95; b.c.z0 = z - 0.95; b.c.z1 = z + 0.95; if (rise >= 1) b.c.on = true; b.m.position.set(x, -1.3 + 2.6 * rise, z); b.cx = x; b.cz = z; });
      // 被牆碾到（翻滾躲得掉）
      if (rise >= 1 && tt < CLOSE + HOLD && P && !P.dead && !(P.iframe > 0) && hitCd <= 0 && blocks.some(b => Math.abs(P.x - b.cx) < 1.4 && Math.abs(P.z - b.cz) < 1.4)) {
        hitCd = 0.5; R.hurtPlayer(P.hpMax * 0.35, null, { knock: 0.3 }); R.shake && R.shake(0.45);
      }
      // 合攏的那一下：房間中間的人被整個壓住
      if (!slammed && tt >= CLOSE) {
        slammed = true; R.shake && R.shake(0.9); R.fx('ring', room.x, 0.2, room.z, { r: 3, color: '#C86A7A' });
        if (P && !P.dead && !(P.iframe > 0) && R.roomIndexAt(P.x, P.z) === room.i) R.hurtPlayer(P.hpMax * 0.55, null, { knock: 0.5 });
      }
      if (tt >= CLOSE + HOLD + OPEN) { blocks.forEach(b => { w.scene.remove(b.m); b.c.on = false; }); return false; }
      return true;
    });
  };

  // ---------- 崩塌型 ----------
  let vel = { x: 0, z: 0 }, lastP = null;
  R.collapse = room => {
    const w = W(), P = w.P, run = w.run, lv = run.grade.lv || 1, n = 24 + 4 * lv, dmg = () => P.hpMax * 0.13 + 5 * lv;   /* 一顆一成三；最後的大崩落 ×2.4 */
    const rock = (x, z, r, warn, k) => {
      R.fx('mark', x, 0, z, { r, t: warn / 1000, color: '#C86A4A' });
      later(() => {
        R.fx('rock', x, 6, z, {}); if (r > 2) { R.fx('boom', x, 0.3, z, { r, color: '#8A7A6A' }); R.shake && R.shake(0.7); }
        if (!P.dead && !(P.iframe > 0) && Math.hypot(P.x - x, P.z - z) < r) R.hurtPlayer(dmg() * k, null, { knock: 0.25 });
        (w.allies || []).forEach(a => { if (!a.downed && Math.hypot(a.x - x, a.z - z) < r) R.hurtAlly(a, a.hpMax * 0.2 * k, null); });
        w.enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < r) R.hurtEnemy(e, 18 * k, {}); });
        if (r <= 2) {   // 石堆：8 秒後碎掉，不會一直擋路
          const TH = T(), m = new TH.Mesh(new TH.DodecahedronGeometry(0.55, 0), new TH.MeshLambertMaterial({ color: R.theme(run).wall })); m.position.set(x, 0.4, z); m.rotation.set(rnd(), rnd(), 0); w.F.group.add(m);
          const c = R.addBox(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 'rubble'); const F = w.F;
          setTimeout(() => { c.on = false; if (m.parent) m.parent.remove(m); if (W().F === F) R.fx('poof', x, 0.3, z, { color: '#8A7A6A', n: 6 }); }, 8000);
        }
      }, warn);
    };
    for (let i = 0; i < n; i++) later(() => {
      if (P.dead) return;
      if (i % 3 !== 2) { const [x, z] = floorAt(P.x + vel.x * 0.6 + (rnd() - 0.5) * 1.2, P.z + vel.z * 0.6 + (rnd() - 0.5) * 1.2); rock(x, z, 1.8, 600, 1); }   // 砸你接下來會走到的地方
      else { const rp = R.roomPoint(room); rock(rp[0], rp[1], 1.8, 600, 1); }
    }, i * 300);
    later(() => { if (P.dead) return; const [x, z] = floorAt(P.x, P.z); R.toast && R.toast('頭上整片要塌下來了——離開紅圈！', '#FF6A4A'); rock(x, z, 4.5, 1500, 2.4); }, n * 300 + 400);
  };

  // ---------- 生物型：先照原本的長，再把長出來的加強、加一大塊母體 ----------
  const react0 = R.react;
  R.react = (...a) => {
    const w = W(), run = w.run, n0 = w.enemies ? w.enemies.length : 0, was = run && run.reacting;
    const r = react0(...a);
    if (run && !was && run.reacting && run.reaction === 'bio') {
      const lv = run.grade.lv || 1, P = w.P, room = R.roomAt(P.x, P.z) || w.F.rooms[0], kids = w.enemies.slice(n0).filter(e => e.id === 'gaki' && !e.dead);
      const placeKid = e => { const pt = R.roomPoint ? R.roomPoint(room, { away: P, min: 2 }) : [room.x, room.z]; e.x = pt[0]; e.z = pt[1]; e.room = room.i; if (e.m && e.m.g) { e.m.g.position.x = e.x; e.m.g.position.z = e.z; } e.hp *= 1.5; e.hpMax *= 1.5; e.dmg *= 1.5; e.bioKid = true; };
      kids.forEach(placeKid); const want = Math.max(3, kids.length * 3); for (let i = kids.length; i < want; i++) { const pt = R.roomPoint ? R.roomPoint(room, { away: P, min: 2 }) : [room.x, room.z], k = R.spawnEnemy('gaki', pt[0], pt[1], room.i, { aggro: true }); if (k) placeKid(k); }
      const [mx, mz] = R.roomPoint ? R.roomPoint(room, { away: P, min: 4 }) : [room.x, room.z];
      const m = R.spawnEnemy('gaki', mx, mz, room.i, { aggro: true });
      if (m) {
        m.hp = m.hpMax = (260 + 220 * lv) * Math.max(1, m.hpMax / R.ENEMIES.gaki.hp); m.dmg *= 2.2;   /* 2026-10-04 作者：一個技能就全死了——母體的生命照深度、玩家等級一起加強（和其他遺跡生物一樣），不再是固定的 */ m.speed *= 0.5; m.bioMother = true; m.spawnT = 5;
        if (m.m && m.m.g) m.m.g.scale.set(2.4, 2.4, 2.4);
        R.fx('spawn', mx, 0.2, mz, { color: '#C86A7A' });
        setTimeout(() => R.toast && R.toast('房間裡長出一大塊肉體組織——打爛它，其他的肉芽才會枯掉', '#E07A9A'), 1200);
      }
    }
    return r;
  };

  // 母體被打爛：剩下的肉芽跟著枯掉（死掉的遺跡生物會從清單裡拿掉，所以在這裡處理）
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead && e.bioMother, r = ke0(e, by);
    if (was && e.dead) { (W().enemies || []).filter(k => k.bioKid && !k.dead).forEach(k => R.killEnemy(k)); R.toast && R.toast('肉體組織被打爛了，肉芽跟著枯掉', '#7AE0A0'); }
    return r;
  };
  // 母體一下最多只掉一部分血（2026-10-04：練度高的時候一招打爛母體、肉芽全部跟著枯掉，太快了）——至少要打好幾下
  const heB = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { if (e && e.bioMother && !e.dead) { const P = W().P; raw = Math.min(raw, e.hpMax * 0.15 / Math.max(1, (P && P.dmgMult) || 1)); } return heB(e, raw, o); };
  // ---------- 斷尾型的肉壁：打了才會破，沒打就長回去；破了會再長 ----------
  const hp0 = R.hitProp;
  R.hitProp = (p, dmg, by) => {
    const was = p && p.alive, run = W().run; if (p && p.kind === 'plug' && run) p.hitAt = run.t;
    const r = hp0(p, dmg, by);
    if (p && p.kind === 'plug' && was && !p.alive && p.hpMax) {
      const F = W().F;
      const regrow = () => later(() => {
        if (W().F !== F || p.alive) return; const P = W().P;
        if (P && Math.hypot(P.x - p.x, P.z - p.z) < 1.4) { regrow(); return; }   // 有人站在洞口：等一下再長
        p.alive = true; p.hp = p.hpMax; if (p.col) p.col.on = true; if (p.mesh && !p.mesh.parent) F.group.add(p.mesh);
        R.fx('poof', p.x, 1, p.z, { color: '#7A3A4A', n: 10 }); R.toast && R.toast('肉壁又長回來了', '#E07A9A');
      }, 4000);
      regrow();
    }
    return r;
  };

  // ---------- 被吞掉之後：一段時間內生命、魔力的回復減半（P.petraCurse 秒；作者：然後血量跟魔力恢復一段時間內減半） ----------
  const hl0 = R.healP;
  R.healP = (v, quiet) => { const P = W().P; return hl0(P && P.petraCurse > 0 ? v * 0.5 : v, quiet); };
  // ---------- 每一格：你移動的方向（崩塌型瞄準用）、肉壁回血、生物型的母體 ----------
  const st0 = R.step;
  R.step = dt => {
    const P0 = W().P, mp0 = P0 ? P0.mp : 0;
    st0(dt);
    const w = W(), run = w.run, P = w.P; if (!run || !P || !(dt > 0)) return;
    if (P.petraCurse > 0) {
      if (P === P0 && P.mp > mp0) P.mp = mp0 + (P.mp - mp0) * 0.5;   // 魔力回得也慢一半
      P.petraCurse -= dt; if (P.petraCurse <= 0) { P.petraCurse = 0; R.toast && R.toast('佩特拉的侵蝕退了：回復恢復正常', '#7AE0A0'); }
    }
    if (lastP) { const k = Math.min(1, dt * 6); vel.x += ((P.x - lastP.x) / dt - vel.x) * k; vel.z += ((P.z - lastP.z) / dt - vel.z) * k; }
    lastP = { x: P.x, z: P.z };
    (w.F && w.F.props || []).forEach(p => { if (p.kind === 'plug' && p.alive && p.hpMax && p.hp < p.hpMax && run.t - (p.hitAt || 0) > 1.5) p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.12 * dt); });
    const moms = (w.enemies || []).filter(e => e.bioMother);
    moms.forEach(m => {
      if (m.dead) return;
      m.hp = Math.min(m.hpMax, m.hp + m.hpMax * 0.015 * dt);
      m.spawnT -= dt; if (m.spawnT <= 0) {
        m.spawnT = 5; const alive = (w.enemies || []).filter(e => e.bioKid && !e.dead).length;
        if (alive < 54) { const room = w.F && w.F.rooms && w.F.rooms[m.room] || R.roomAt(m.x, m.z); for (let i = 0; i < 6; i++) { const pt = room && R.roomPoint ? R.roomPoint(room, { away: m, min: 1 }) : floorAt(m.x + (rnd() - 0.5) * 3, m.z + (rnd() - 0.5) * 3), k = R.spawnEnemy('gaki', pt[0], pt[1], m.room, { aggro: true }); if (k) { k.hp *= 1.5; k.hpMax *= 1.5; k.dmg *= 1.5; k.bioKid = true; } } }
      }
    });
    if (!run.lastF || run.lastF !== w.F) { run.lastF = w.F; lastP = null; }
  };
})(window.R);
