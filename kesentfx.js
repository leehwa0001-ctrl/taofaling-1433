// 克森特級以上的場地效果（2026-10-04 作者：克森特級要有場地效果）
// 克森特級的遺跡一定是極端環境（火山、沙漠、深海、凍原），原本只有走路慢一點。現在每一種都有會動的場地效果，越深越兇：
// - 火山：地底的熔岩每隔幾秒噴出來——先冒紅圈，一秒後噴發，留下一攤會燙人的熔岩（遺跡生物站在上面也會被燙）。
// - 沙漠：沙暴一陣一陣來——來之前會提醒；沙暴裡看不遠、被風推著走、沙子一直刮掉一點生命。
// - 深海：一條一條的暗流（藍色的圈）會把人沖走；每隔一陣子水壓一縮，往四周把人推開。
// - 凍原：地上有冰（白色的圈），踩上去會滑；暴風雪來的時候變慢、凍傷。
// 放在 dread.js、combat.js、run.js 後面（包 R.step、R.loadFloor、R.updateLights）。
(function (R) {
  const W = () => R.W, rnd = (a, b) => a + Math.random() * (b - a);
  const on = run => run && run.env && run.grade && !run.done && (run.grade.id === 'kesent' || (run.grade.lv || 0) >= 4 || run.grade.id === 'kaso');
  const deep = run => 1 + Math.min(1, (run.floor || 0) / Math.max(1, run.floors - 1));   // 1～2：越深越兇
  const NAME = { volcano: '噴發的熔岩', desert: '沙暴', deep: '水壓', snow: '凍傷' };
  const TIP = {
    volcano: '場地效果・火山：地上冒出紅圈就快躲開，一秒後熔岩會噴出來，留下的熔岩攤會燙人。',
    desert: '場地效果・沙漠：沙暴一陣一陣來。沙暴裡看不遠、會被風推著走，沙子一直刮掉一點生命。',
    deep: '場地效果・深海：藍色的圈是暗流，會把人沖走；水壓一縮的時候會往四周推開。',
    snow: '場地效果・凍原：白色的圈是冰，踩上去會滑；暴風雪來的時候走得慢、會凍傷。'
  };
  let S = null;   // 這一層的狀態
  const later = (t, f) => { if (S) S.q.push({ t, f }); };
  const hurtP = (frac, flat) => { const w = W(), P = w.P; if (!P || P.dead) return; R.hurtPlayer(P.hpMax * frac + (flat || 0), { name: NAME[w.run.env] }); };
  const nearFloor = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  const zone = (o, color) => { const z = R.addZone(o); if (z && z.mesh && color) z.mesh.material.color.set(color); return z; };
  const push = (o, dx, dz) => { o.x += dx; o.z += dz; if (R.collide) R.collide(o, o === W().P ? 0.42 : 0.4); };

  const setup = () => {
    const w = W(), run = w.run; S = null; if (!on(run) || !w.F) return;
    const k = deep(run), P = w.P;
    S = { env: run.env, k, t: 0, q: [], next: rnd(4, 6), storm: 0, calm: rnd(14, 20), cur: [], ice: [], vx: 0, vz: 0, px: P ? P.x : 0, pz: P ? P.z : 0, chip: 0 };
    // 暗流、冰：一層擺幾個（找地板上的點）
    const spots = n => { const out = [], rooms = (w.F.rooms || []).filter(r => !r.rest); for (let i = 0; i < n * 3 && out.length < n; i++) { const rm = rooms[Math.floor(Math.random() * rooms.length)]; if (!rm) break; const [x, z] = nearFloor(rm.x + rnd(-rm.hx, rm.hx) * 0.7, rm.z + rnd(-rm.hz, rm.hz) * 0.7); if (P && Math.hypot(x - P.x, z - P.z) < 6) continue; out.push([x, z]); } return out; };
    if (S.env === 'deep') S.cur = spots(Math.round(6 * k)).map(([x, z]) => {
      const a = Math.random() * Math.PI * 2, r = rnd(2.2, 3.4); zone({ kind: 'current', x, z, r, life: 1e9 }, '#3A9AD8');
      // 圈裡一排會流動的箭頭：看得出水往哪邊沖（2026-10-04 作者：深海那個沒有提示）
      const TH = THREE, arrows = [], am = new TH.MeshBasicMaterial({ color: '#BFF0FF', transparent: true, opacity: 0.75, depthWrite: false, side: TH.DoubleSide });
      for (let i = 0; i < 3; i++) { const g = new TH.ShapeGeometry(new TH.Shape([new TH.Vector2(-0.35, -0.25), new TH.Vector2(0, 0.35), new TH.Vector2(0.35, -0.25), new TH.Vector2(0, -0.05)])); const m = new TH.Mesh(g, am); m.rotation.x = -Math.PI / 2; m.rotation.z = -a; w.F.group.add(m); arrows.push(m); }
      return { x, z, r, dx: Math.sin(a), dz: Math.cos(a), arrows, ph: Math.random() };
    });
    if (S.env === 'snow') S.ice = spots(Math.round(7 * k)).map(([x, z]) => { const r = rnd(2.4, 3.8); zone({ kind: 'ice', x, z, r, life: 1e9 }, '#E8F4FF'); return { x, z, r }; });
    setTimeout(() => { if (S && R.toast) R.toast(TIP[S.env], '#FFB45A'); }, 1200);
  };

  const tick = dt => {
    const w = W(), run = w.run, P = w.P; if (!S || !on(run) || !P || P.dead) return;
    S.t += dt;
    for (const it of S.q) { it.t -= dt; if (it.t <= 0) { it.done = 1; it.f(); } } S.q = S.q.filter(it => !it.done);
    const k = S.k;
    if (S.env === 'volcano') {
      S.next -= dt;
      if (S.next <= 0) {
        S.next = rnd(5.5, 8.5) / k;
        const n = 2 + Math.round(2 * k), vx = (P.x - S.px) / Math.max(dt, 0.016), vz = (P.z - S.pz) / Math.max(dt, 0.016);
        for (let i = 0; i < n; i++) {
          // 兩個瞄著你（往你走的方向多算一點），其他的散在附近
          const aim = i < 2, [x, z] = nearFloor(aim ? P.x + vx * 0.9 * (i ? 1 : 0.4) + rnd(-1, 1) : P.x + rnd(-9, 9), aim ? P.z + vz * 0.9 * (i ? 1 : 0.4) + rnd(-1, 1) : P.z + rnd(-9, 9)), r = 1.6;
          R.fx('mark', x, 0, z, { r, t: 1.1, color: '#FF5A1A' });
          later(1.1, () => {
            R.fx('boom', x, 0.4, z, { r: r + 0.4, color: '#FF7A3A' }); if (R.shake && Math.hypot(P.x - x, P.z - z) < 8) R.shake(0.15);
            if (Math.hypot(P.x - x, P.z - z) < r + 0.3) hurtP(0.07 * k, 4);
            w.enemies.forEach(e => { if (!e.dead && !e.under && Math.hypot(e.x - x, e.z - z) < r + e.def.size * 0.4) R.hurtEnemy(e, 20 * k, {}); });
            zone({ kind: 'lava', x, z, r: 1.3, life: 5, dmg: P.hpMax * 0.025 * k }, '#FF5A1A');
          });
        }
      }
    } else if (S.env === 'desert' || S.env === 'snow') {
      // 沙暴／暴風雪：平靜一陣 → 提醒 → 颳一陣
      if (S.storm > 0) {
        S.storm -= dt;
        const wx = Math.sin(S.wa), wz = Math.cos(S.wa), sp = S.env === 'desert' ? 1.7 * k : 0.9 * k;
        push(P, wx * sp * dt, wz * sp * dt);
        P.slowT = Math.max(P.slowT || 0, 0.2);
        S.chip += dt; if (S.chip > 1.5) { S.chip = 0; hurtP(S.env === 'desert' ? 0.02 * k : 0.03 * k, 1); }
        if (Math.random() < dt * 14) R.fx('dust', P.x + rnd(-6, 6), rnd(0.3, 2), P.z + rnd(-6, 6), { color: S.env === 'desert' ? '#D8B878' : '#F2F6FF' });
        if (S.storm <= 0) { S.calm = rnd(16, 24) / k; R.toast && R.toast(S.env === 'desert' ? '沙暴過去了。' : '暴風雪停了。'); }
      } else {
        S.calm -= dt;
        if (S.calm <= 2.5 && !S.warned) { S.warned = 1; R.toast && R.toast(S.env === 'desert' ? '遠處揚起一片沙牆——沙暴要來了！' : '風聲變尖了——暴風雪要來了！', '#FF9A6A'); }
        if (S.calm <= 0) { S.warned = 0; S.storm = rnd(7, 10) * (0.8 + 0.2 * k); S.wa = Math.random() * Math.PI * 2; S.chip = 0; }
      }
    }
    if (S.env === 'deep') {
      // 暗流：在圈裡會被沖走（遺跡生物也是）
      S.cur.forEach(c => {
        c.ph = (c.ph + dt * 0.6) % 1; c.arrows.forEach((m, i) => { const u = ((c.ph + i / 3) % 1) * 2 - 1; m.position.set(c.x + c.dx * u * c.r * 0.8, 0.12, c.z + c.dz * u * c.r * 0.8); m.material.opacity = 0.8 * (1 - Math.abs(u)); });
        const sp = 4.2 * k * dt;
        if (Math.hypot(P.x - c.x, P.z - c.z) < c.r && !P.air) { if (!S.curSaid) { S.curSaid = 1; R.toast && R.toast('暗流！藍色的圈會照箭頭的方向把人沖走——走出圈外就好；也可以拿來把遺跡生物沖開。', '#8AD8FF'); } push(P, c.dx * sp, c.dz * sp); if (Math.random() < dt * 6) R.fx('spark', P.x, 0.3, P.z, { color: '#8AD8FF' }); }
        w.enemies.forEach(e => { if (!e.dead && !e.def.boss && Math.hypot(e.x - c.x, e.z - c.z) < c.r) push(e, c.dx * sp * 0.6, c.dz * sp * 0.6); });
      });
      // 水壓：一縮，往四周推開
      S.next -= dt;
      if (S.next <= 0) {
        S.next = rnd(10, 14) / k; const cx = P.x, cz = P.z;
        R.fx('ring', cx, 0.1, cz, { r: 4, color: '#5FC8E0' }); R.fx('mark', cx, 0, cz, { r: 4.5, t: 1.3, color: '#5FC8E0' }); R.toast && R.toast('水壓一緊……快離開藍圈（1 秒後往外推、會受傷）', '#8AD8FF');
        later(1.3, () => {
          R.fx('ring', cx, 0.2, cz, { r: 6, color: '#BFF0FF' }); if (R.shake) R.shake(0.2);
          const d = Math.hypot(P.x - cx, P.z - cz);
          if (d < 4.5) { const a = d > 0.05 ? Math.atan2(P.x - cx, P.z - cz) : Math.random() * Math.PI * 2; for (let i = 0; i < 6; i++) push(P, Math.sin(a) * 0.5, Math.cos(a) * 0.5); hurtP(0.06 * k, 3); }
        });
      }
    }
    if (S.env === 'snow') {
      // 冰：在冰上停不下來（照上一格的速度繼續滑）
      const onIce = S.ice.some(c => Math.hypot(P.x - c.x, P.z - c.z) < c.r) && !P.air;
      const vx = (P.x - S.px) / Math.max(dt, 0.016), vz = (P.z - S.pz) / Math.max(dt, 0.016);
      if (onIce) { S.vx = S.vx * 0.9 + vx * 0.1; S.vz = S.vz * 0.9 + vz * 0.1; const sl = Math.min(1, dt * 2.2); push(P, S.vx * sl * 0.6, S.vz * sl * 0.6); }
      else { S.vx *= 0.5; S.vz *= 0.5; }
    }
    S.px = P.x; S.pz = P.z;
  };

  const st0 = R.step;
  R.step = dt => { const r = st0(dt); try { tick(dt); } catch (e) { console.warn('[kesentfx]', e); } return r; };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf0(f, o); try { setup(); } catch (e) { console.warn('[kesentfx]', e); S = null; } return r; };
  // 沙暴、暴風雪：看不遠（dread.js 每一格設霧之後再收窄）
  const ul0 = R.updateLights;
  R.updateLights = dt => {
    const r = ul0(dt), fg = W().scene && W().scene.fog;
    if (S && S.storm > 0 && fg && fg.isFog) { fg.far = Math.min(fg.far, fg.near + (S.env === 'desert' ? 7 : 10)); }
    return r;
  };
  R.fieldFx = () => S;   // 測試用
})(window.R);
