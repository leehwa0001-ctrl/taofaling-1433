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
  const NAME = { volcano: '噴發的熔岩', desert: '沙暴', deep: '水壓', snow: '凍傷', forge: '兵工廠的機關' };   // forge：兵工廠（機關在 forge.js）
  const TIP = {
    volcano: '場地效果・火山：地上冒出紅圈、開始冒泡就快躲開，熔岩會噴出來（噴中非常痛；圈有大有小，越大的預警越久，偶爾有大噴發）。留下的熔岩攤會留十幾秒，跟噴發一樣燙，站在上面每一秒燙一次。',
    desert: '場地效果・沙漠：魔力乾枯——魔力的自然回復減半；沙暴一陣一陣來，沙暴裡看不遠、會被風推著走、沙子一直刮掉一點生命，而且魔力完全不會自己回（喝藥、技能回魔照常）。',
    deep: '場地效果・深海：藍色的圈是暗流，會把人沖走；水壓一縮的時候會往四周推開。',
    snow: '場地效果・凍原：地上淺藍色、亮亮的是冰面，踩上去會滑、停不下來；白色、鼓起來的是積雪，站進去凍傷值會一直漲（暴風雪的時候到處都會慢慢漲）。凍傷值滿了會變慢、一直掉生命，畫面四周結霜。離開積雪會慢慢退，靠近營火、火焰退得快。',
    forge: '場地效果・熔爐：兵工廠的機關還在動。有孔的鐵板是地刺（踩到半秒後冒刺）、圓形鐵柵是絞肉機（轉的時候會吸人）、走道上的輸送帶會把人送走。遺跡生物也會中。'
  };
  let S = null;   // 這一層的狀態
  R.kesentState = () => S;   // envplus.js（魔力乾枯、凍傷）要看沙暴、暴風雪、冰面
  const later = (t, f) => { if (S) S.q.push({ t, f }); };
  const hurtP = (frac, flat) => { const w = W(), P = w.P; if (!P || P.dead) return; R.hurtPlayer(P.hpMax * frac + (flat || 0), { name: NAME[w.run.env] }); };
  const nearFloor = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  const zone = (o, color) => { const z = R.addZone(o); if (z && z.mesh && color) z.mesh.material.color.set(color); return z; };
  // 火山：噴發的大小（小、中、大，偶爾大噴發）、噴中的傷害（生命的比例 × 深度 k）、留下的熔岩攤
  const ERUPT = 0.4;
  const eruptSize = () => { const u = Math.random(); return u < 0.4 ? rnd(0.9, 1.4) : u < 0.8 ? rnd(1.5, 2.2) : u < 0.97 ? rnd(2.6, 3.4) : rnd(4, 5); };
  const pool = (x, z, r, life) => {
    const zn = zone({ kind: 'lava', x, z, r, life, dmg: 0 }, '#FF5A1A'); if (!zn) return; zn.kind = 'magma';   // 畫成熔岩，再改成 magma：combat.js 的熔岩不另外扣，這裡照噴發的傷害燙
    // 跟噴發一樣燙，要看得很清楚：整片填滿的熔岩（中間比較亮），剛噴完那 0.6 秒淡淡的、積起來才亮
    let fill = null, core = null;
    if (zn.mesh && window.THREE) { const TH = THREE; fill = new TH.Mesh(new TH.CircleGeometry(r * 0.94, 28), new TH.MeshBasicMaterial({ color: '#E8400A', transparent: true, opacity: 0.15, depthWrite: false, side: TH.DoubleSide })); fill.position.z = -0.002; core = new TH.Mesh(new TH.CircleGeometry(r * 0.55, 20), new TH.MeshBasicMaterial({ color: '#FFB04A', transparent: true, opacity: 0.1, depthWrite: false, side: TH.DoubleSide })); core.position.z = -0.001; zn.mesh.add(fill, core); }
    if (S) (S.pools = S.pools || []).push({ x, z, r, zn, arm: 0.6, fill, core, ph: Math.random() * 6 });
  };
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
    if (S.env === 'snow') {
      // 冰（2026-10-04 作者：冰可以做成地形的一部分，站上去會滑；放個圈圈蠻奇怪的）：地板上一塊一塊不規則的冰面，貼著地板的格子長
      const t = w.F.tile, ice = S.iceT = new Set(), N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      spots(Math.round(7 * k)).forEach(([x, z]) => {
        const k0 = t.id(t.tX(x), t.tZ(z)); if (t.T[k0] !== 1) return; const want = 6 + Math.floor(Math.random() * 10), q = [k0]; let n = 0;
        while (q.length && n < want) { const kk = q.splice(Math.floor(Math.random() * q.length), 1)[0]; if (ice.has(kk) || t.T[kk] !== 1) continue; ice.add(kk); n++; const tx = kk % t.nx, tz = (kk - tx) / t.nx; N4.forEach(([dx, dz]) => { const nk = t.id(tx + dx, tz + dz); if (!ice.has(nk) && t.T[nk] === 1) q.push(nk); }); }
      });
      if (ice.size) {
        const TH = THREE, c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#BFE4F4'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#E8F8FF'; [[2, 3, 6], [9, 1, 5], [4, 10, 7], [11, 12, 4]].forEach(([a, b, l]) => { for (let i = 0; i < l; i++) g.fillRect(a + i, b + Math.floor(i / 2), 1, 1); }); g.fillStyle = '#9ACDE4'; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16);
        const tex = new TH.CanvasTexture(c); tex.magFilter = tex.minFilter = TH.NearestFilter;
        const m = new TH.InstancedMesh(new TH.PlaneGeometry(t.TS, t.TS), new TH.MeshLambertMaterial({ map: tex, emissive: '#5A8AA8', emissiveIntensity: 0.25, transparent: true, opacity: 0.92 }), ice.size), o = new TH.Object3D(); let i = 0;
        ice.forEach(kk => { const tx = kk % t.nx, tz = (kk - tx) / t.nx; o.position.set(t.cX(tx), 0.03, t.cZ(tz)); o.rotation.set(-Math.PI / 2, 0, (Math.floor(Math.random() * 4)) * Math.PI / 2); o.updateMatrix(); m.setMatrixAt(i++, o.matrix); });
        m.receiveShadow = true; w.F.group.add(m); S.iceMesh = m;
      }
    }
    setTimeout(() => { if (S && R.toast) R.toast(TIP[S.env], '#FFB45A'); }, 1200);
  };

  // 被打斷（挖礦 mining.js、搜寶箱 raid.js）：只有遺跡生物打到、或一下掉超過 15% 生命才算；場地一點一點的傷害不算
  const hp1 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const P = W().P; if (P && src && src.def) P.hurtByT = performance.now(); return hp1(raw, src, o); };
  R.hitInterrupts = loss => { const P = W().P; return !!P && (performance.now() - (P.hurtByT || 0) < 300 || loss > P.hpMax * 0.15); };
  const tick = dt => {
    const w = W(), run = w.run, P = w.P; if (!S || !on(run) || !P || P.dead) return;
    S.t += dt;
    for (const it of S.q) { it.t -= dt; if (it.t <= 0) { it.done = 1; it.f(); } } S.q = S.q.filter(it => !it.done);
    const k = S.k;
    if (S.env === 'volcano') {
      S.amb = (S.amb || 0) - dt; if (S.amb <= 0) { S.amb = 0.3; const [bx, bz] = nearFloor(P.x + rnd(-10, 10), P.z + rnd(-10, 10)); R.fx('spark', bx, 0.15, bz, { color: rnd() < 0.5 ? '#FF8A3A' : '#FFD04A' }); if (rnd() < 0.3) R.fx('boom', bx, 0.05, bz, { r: 0.4, color: '#FF5A1A' }); }   // 岩漿冒泡、火星（只是畫面）
      S.next -= dt;
      if (S.next <= 0) {
        S.next = rnd(11, 17) / k;   // 2026-10-04 作者：頻率低一點、傷害高很多（20 倍）——原本像抓癢，只是一直打斷挖礦、開寶箱
        const n = 1 + Math.round(2 * k) + Math.floor(rnd(0, 2)), vx = (P.x - S.px) / Math.max(dt, 0.016), vz = (P.z - S.pz) / Math.max(dt, 0.016);
        let saidBig = false;
        for (let i = 0; i < n; i++) {
          // 兩個瞄著你（往你走的方向多算一點），其他的散在附近
          // 2026-10-04 作者：大小可以有大有小，多一點變化跟隨機性——小的、中的、大的、偶爾一個大噴發；越大預警越久
          const aim = i < 2, [x, z] = nearFloor(aim ? P.x + vx * 0.9 * (i ? 1 : 0.4) + rnd(-1, 1) : P.x + rnd(-10, 10), aim ? P.z + vz * 0.9 * (i ? 1 : 0.4) + rnd(-1, 1) : P.z + rnd(-10, 10)), r = eruptSize(), warn = 1.1 + r * 0.18, big = r >= 4;
          if (big && !saidBig) { saidBig = true; R.toast && R.toast('地面震起來了——大噴發！離開那個大紅圈！', '#FF7A3A'); R.shake && R.shake(0.25); }
          R.fx('mark', x, 0, z, { r, t: warn, color: '#FF5A1A' }); [0.2, 0.45, 0.7].forEach(f0 => later(warn * f0, () => { for (let j = 0; j < (big ? 3 : 1); j++) { R.fx('spark', x + rnd(-r, r) * 0.5, 0.2, z + rnd(-r, r) * 0.5, { color: '#FF8A3A' }); R.fx('boom', x + rnd(-r, r) * 0.4, 0.1, z + rnd(-r, r) * 0.4, { r: 0.45, color: '#FF5A1A' }); } }));   // 預警：地上冒泡、火星
          later(warn, () => {
            R.fx('boom', x, 0.4, z, { r: r + 0.4, color: '#FF7A3A' }); if (R.shake && Math.hypot(P.x - x, P.z - z) < 8 + r) R.shake(big ? 0.4 : 0.15);
            if (Math.hypot(P.x - x, P.z - z) < r + 0.3) hurtP(ERUPT * k, 40);   // 噴中很痛：四成到八成生命
            w.enemies.forEach(e => { if (!e.dead && !e.under && Math.hypot(e.x - x, e.z - z) < r + e.def.size * 0.4) R.hurtEnemy(e, 20 * k, {}); });
            pool(x, z, r * rnd(0.7, 1), rnd(9, 15) * (0.8 + r * 0.12));   // 2026-10-05 作者：熔岩攤留久一點（原本 3～7 秒，現在大約 8～21 秒）
          });
        }
      }
      // 熔岩攤（2026-10-04 作者：持續傷害應該要跟噴發的一樣，不然沒什麼感覺；原本每半秒 2.5～5% 生命、還先扣護甲）：
      //   站在上面每一秒燙一次，一次跟噴中一樣痛；剛噴完的那 0.6 秒還沒積起來（噴中之後來得及跳出去）。遺跡生物也一樣。
      S.lavaCd = (S.lavaCd || 0) - dt; S.pools = (S.pools || []).filter(p => p.zn && !p.zn.dead); S.pools.forEach(p => { p.arm -= dt; p.ph += dt * 3; const fade = Math.max(0, Math.min(1, p.zn.life / 0.8)); if (p.fill) p.fill.material.opacity = (p.arm > 0 ? 0.18 : 0.55 + 0.08 * Math.sin(p.ph)) * fade; if (p.core) p.core.material.opacity = (p.arm > 0 ? 0.1 : 0.4 + 0.15 * Math.sin(p.ph * 1.3)) * fade; });
      const inPool = o => S.pools.some(p => p.arm <= 0 && Math.hypot(o.x - p.x, o.z - p.z) < p.r);
      if (S.lavaCd <= 0 && !P.air && inPool(P)) { S.lavaCd = 1; hurtP(ERUPT * k, 40); R.fx('boom', P.x, 0.2, P.z, { r: 0.8, color: '#FF7A3A' }); if (!S.poolSaid) { S.poolSaid = 1; R.toast && R.toast('熔岩攤跟噴發一樣燙——站在上面每一秒都燙一次，快離開！', '#FF7A3A'); } }
      w.enemies.forEach(e => { if (e.dead || e.under || e.def.fly) return; e.lavaCd = (e.lavaCd || 0) - dt; if (e.lavaCd <= 0 && inPool(e)) { e.lavaCd = 1; R.hurtEnemy(e, 20 * k, {}); } });
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
      const t = w.F && w.F.tile, onIce = !!(S.iceT && t && S.iceT.has(t.id(t.tX(P.x), t.tZ(P.z)))) && !P.air;
      const vx = (P.x - S.px) / Math.max(dt, 0.016), vz = (P.z - S.pz) / Math.max(dt, 0.016);
      if (onIce) { S.vx = S.vx * 0.94 + vx * 0.06; S.vz = S.vz * 0.94 + vz * 0.06; const sl = Math.min(1, dt * 2.6); push(P, S.vx * sl * 0.85, S.vz * sl * 0.85); if (Math.hypot(S.vx, S.vz) > 2 && Math.random() < dt * 8) R.fx('dust', P.x, 0.1, P.z, { color: '#E8F8FF' }); }   // 冰上停不下來、轉不了彎
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
  // 左上角一直顯示這一層的場地效果（2026-10-04 作者：克森特級以上的場地效果會放在左上角）；點一下再看一次說明
  const ENVN = { volcano: '火山', desert: '沙漠', deep: '深海', snow: '凍原', forge: '熔爐' };
  let hudT = 0;
  const st1 = R.step;
  R.step = dt => {
    const r = st1(dt); hudT -= dt; if (hudT > 0) return r; hudT = 0.4;
    try {
      const run = W().run; let el = document.getElementById('kfx-box');
      if (!S || !on(run)) { if (el) el.hidden = true; return r; }
      if (!el) { const tl = document.getElementById('r-tl'); if (!tl) return r; el = document.createElement('div'); el.id = 'kfx-box'; el.className = 'glass dungeon-only r-misc'; el.style.cursor = 'pointer'; el.title = '點一下看說明'; el.onclick = () => R.toast && S && R.toast(TIP[S.env], '#FFB45A'); tl.appendChild(el); }
      const st = (S.env === 'desert' || S.env === 'snow') ? (S.storm > 0 ? '・<b style="color:#FF9A6A">' + (S.env === 'desert' ? '沙暴' : '暴風雪') + '來了</b>' : S.calm <= 2.5 ? '・<b style="color:#FFD27A">快要來了</b>' : '') : '';
      el.hidden = false; el.innerHTML = '場地：<b style="color:#FFB45A">' + (ENVN[S.env] || '') + '</b>・' + (NAME[S.env] || '') + st;
    } catch (e) { }
    return r;
  };
})(window.R);
