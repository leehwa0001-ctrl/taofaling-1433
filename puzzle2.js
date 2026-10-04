// 討伐令 1433：遺跡的解謎多三種（作者 2026-10-04：解謎可以多類型一點）
// puzzle.js 原本有回音之室、石板之室、符文之室。這裡另外三種，一樣不用看規則就能直接解（作者 2026-10-04 說的）：
// - 記憶之室：地上一排石板（6 塊、摩爾斯級以上 8 塊）。踩上去翻出底下的圖案；連續翻兩塊一樣的就留著亮，不一樣的過一下蓋回去。全部配對完就解開。
// - 時限之室：房間各處三支拉桿（摩爾斯級以上四支）。拉下第一支開始倒數（8 秒，摩爾斯級以上 7 秒），每支拉桿腳下的光圈一直縮；
//   時間內全部拉下就解開，來不及就全部彈回去（佩特拉的注意 +5）。
// - 重石之室：兩顆刻著符文的大石頭（摩爾斯級以上三顆）和同樣多的壓板。走過去頂著石頭就會推動一格（兩公尺）；全部壓板上都有石頭就解開。
//   推到角落推不出來的時候，摸石碑讓石頭回到原位。保證推得到：每顆石頭照「直的推」或「先橫再直」的路擺。
// 做法：puzzle.js 選好的謎題房有一半換成這三種（r.puzzle）。puzzle.js 照舊幫忙蓋石碑和被封住的金寶箱（不認得的種類只蓋這兩樣），
//   這裡再把機關擺上去、把石碑的說明換掉、解開的時候照 puzzle.js 的做法打開寶箱。
// 放在 puzzle.js 後面。
(function (R) {
  const W = R.W, T = () => THREE, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const KINDS = ['memory', 'levers', 'push'];
  const NAMES = { memory: '記憶之室', levers: '時限之室', push: '重石之室' };
  const mine = k => KINDS.includes(k);
  const mat = (col, em) => new (T().MeshLambertMaterial)(Object.assign({ color: col }, em ? { emissive: em, emissiveIntensity: 0 } : {}));
  const ring = (scene, x, z, r0, r1, col, op) => { const m = new (T().Mesh)(new (T().RingGeometry)(r0, r1, 24), new (T().MeshBasicMaterial)({ color: col, transparent: true, opacity: op, depthWrite: false, side: T().DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z); scene.add(m); return m; };
  const say = (title, line) => { R.sheet('<p class="kicker">' + R.esc(title) + '</p><p class="hand">' + R.esc(line) + '</p>', '<div class="row"><button type="button" class="btn pri" id="pz2-x">知道了</button></div>'); document.getElementById('pz2-x').onclick = R.closeSheet; };
  const fail = (pz, msg, n) => { const run = W.run; run.aware = Math.min(100, run.aware + (n || 4)); R.toast(msg, '#E07A5A'); if (R.shake) R.shake(0.15); };
  // 解開：和 puzzle.js 的 solve 一樣（寶箱放進 F.chests、封印消失、掉魔力水晶）
  const solve = pz => {
    if (pz.solved) return; pz.solved = true;
    const F = W.F, run = W.run, ch = pz.chest;
    if (ch && !F.chests.includes(ch)) F.chests.push(ch);
    if (pz.seal) pz.seal.visible = false; if (pz.mark) pz.mark.visible = false;
    if (R.playSfx) R.playSfx('unlock', 200); else if (R.sfx) R.sfx('chest');
    R.toast('機關解開了——寶箱的封印消失了。', '#B8E07A');
    if (ch && R.dropMat) R.dropMat('crystal', 1 + run.grade.lv, ch.x + 1.2, ch.z + 0.9);
    if (R.fx) R.fx('spawn', ch ? ch.x : pz.r.x, 0.1, ch ? ch.z : pz.r.z, { color: '#B8E07A' });
  };
  // 圖案（記憶之室）
  const GLYPH = [['#FFD86A', 0], ['#7FE0FF', 1], ['#FF8A7A', 2], ['#C8A0FF', 3], ['#9AE08A', 4], ['#FFB0D8', 5]];
  const glyphTex = (col, k) => {
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.fillStyle = col; x.strokeStyle = '#140E1A'; x.lineWidth = 2; x.beginPath();
    if (k === 0) x.arc(8, 8, 5.5, 0, 7); else if (k === 1) { x.moveTo(8, 2); x.lineTo(14, 13); x.lineTo(2, 13); x.closePath(); } else if (k === 2) x.rect(3, 3, 10, 10);
    else if (k === 3) { x.moveTo(8, 1.5); x.lineTo(14.5, 8); x.lineTo(8, 14.5); x.lineTo(1.5, 8); x.closePath(); }
    else if (k === 4) { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 2.8 : 6.5; i ? x.lineTo(8 + Math.cos(a) * r, 8 + Math.sin(a) * r) : x.moveTo(8 + Math.cos(a) * r, 8 + Math.sin(a) * r); } x.closePath(); }
    else { x.arc(8, 8, 6, -1.1, 2.3); x.arc(10.5, 6.5, 4.5, 2.1, -0.9, true); x.closePath(); }
    x.fill(); x.stroke(); const t = new (T().CanvasTexture)(c); t.magFilter = t.minFilter = T().NearestFilter; return t;
  };

  // ---------- 選房間：puzzle.js 選好的謎題房，一半換成這三種 ----------
  const gf = R.genFloor;
  R.genFloor = (run, f) => { const F = gf(run, f); try { F.rooms.forEach(r => { if (r.type === 'puzzle' && rnd() < 0.5) r.puzzle = pick(KINDS); }); } catch (e) { } return F; };

  // ---------- 房間裡的格子 ----------
  const roomTiles = (F, r, avoid) => {
    const t = F.tile, out = [];
    for (let k = 0; k < t.nx * t.nz; k++) {
      if (t.RM[k] !== r.i || t.T[k] !== 1) continue;
      const tx = k % t.nx, tz = (k - tx) / t.nx; let ok = true;
      for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -1; dx <= 1; dx++) { const kk = t.id(tx + dx, tz + dz); if (t.T[kk] !== 1 || t.RM[kk] !== r.i) { ok = false; break; } }
      if (!ok) continue; const x = t.cX(tx), z = t.cZ(tz);
      if (avoid.some(([ax, az, ar]) => Math.hypot(ax - x, az - z) < ar)) continue;
      out.push({ k, tx, tz, x, z });
    }
    return out;
  };
  // 那一格有沒有擋路的東西（柱子之類的；石頭自己的不算）
  const solidAt = (x, z, skip) => { const B = R.boxesNear ? R.boxesNear(x, z) : []; for (const c of B) { if (!c.on || (skip && skip.includes(c)) || c.tag === 'chest') continue; if (c.x1 > x - 0.7 && c.x0 < x + 0.7 && c.z1 > z - 0.7 && c.z0 < z + 0.7) return true; } return false; };
  // 擺好之後，把擋在機關上的罈子、木箱這些拿掉
  const clearAt = pts => R.col.list.forEach(c => {
    if (!c.on || !c.ref || !c.ref.mesh || c.tag === 'wall' || c.tag === 'pit') return;
    if (!pts.some(([x, z]) => Math.max(c.x0 - x, 0, x - c.x1) ** 2 + Math.max(c.z0 - z, 0, z - c.z1) ** 2 < 1.6 * 1.6)) return;
    c.on = false; const p = c.ref; p.alive = false; if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
  });

  // ---------- 蓋機關 ----------
  const setup = (scene, run, F, pz) => {
    const r = pz.r, lv = run.grade.lv || 1, hard = lv >= 3;
    const tab = pz.inter.find(it => /石碑/.test(String(it.label))) || null;
    const avoid = [[pz.chest.x, pz.chest.z, 2.6]].concat(tab ? [[tab.x, tab.z - 0.3, 2.4]] : []);
    let tiles = roomTiles(F, r, avoid); if (tiles.length < 8) { pz.kind = 'memory'; tiles = roomTiles(F, r, avoid.map(a => [a[0], a[1], a[2] * 0.7])); }
    pz.p2 = { kind: pz.kind }; const S = pz.p2, pts = [];
    if (pz.kind === 'memory') {
      const n = Math.min(hard ? 8 : 6, tiles.length - (tiles.length % 2)); if (n < 4) return;
      // 離房間中心最近的 n 格（盡量排在一起），兩兩一組的圖案打亂
      const cx = tiles.reduce((a, t) => a + t.x, 0) / tiles.length, cz = tiles.reduce((a, t) => a + t.z, 0) / tiles.length;
      const pickT = tiles.slice().sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz)).slice(0, n);
      const syms = []; for (let i = 0; i < n / 2; i++) syms.push(i, i); syms.sort(() => rnd() - 0.5);
      S.tex = GLYPH.slice(0, n / 2).map(([c, k]) => glyphTex(c, k));
      S.tiles = pickT.map((t, i) => {
        const m = mat('#6A6478', '#BFE8FF'), p = new (T().Mesh)(new (T().BoxGeometry)(1.5, 0.12, 1.5), m); p.position.set(t.x, 0.06, t.z); p.receiveShadow = true; scene.add(p);
        const sp = new (T().Sprite)(new (T().SpriteMaterial)({ map: S.tex[syms[i]], transparent: true, depthWrite: false })); sp.scale.set(1, 1, 1); sp.position.set(t.x, 1.0, t.z); sp.visible = false; scene.add(sp);
        const rg = ring(scene, t.x, t.z, 0.55, 0.7, '#BFE8FF', 0.3); pts.push([t.x, t.z]);
        return { x: t.x, z: t.z, m, sp, rg, sym: syms[i], open: false, done: false, inside: false };
      });
      S.flip = []; S.hide = 0;
      pz.hint = '「石板底下刻著圖案，一樣的有兩塊。」踩上去會翻開；連續翻到兩塊一樣的就會留著，不一樣的過一下會蓋回去。';
    } else if (pz.kind === 'levers') {
      const n = hard ? 4 : 3; S.time = hard ? 7 : 8; S.left = 0; S.on = false;
      // 分散在房間各處：先挑離中心最遠的方向，再挑彼此最遠的
      const ch = []; const far = t => ch.length ? Math.min(...ch.map(c => Math.hypot(c.x - t.x, c.z - t.z))) : Math.hypot(t.x - r.x, t.z - r.z);
      for (let i = 0; i < n && tiles.length; i++) { const t = tiles.slice().sort((a, b) => far(b) - far(a))[0]; ch.push(t); tiles = tiles.filter(x => x !== t); }
      S.levers = ch.map(t => {
        const base = new (T().Mesh)(new (T().BoxGeometry)(0.7, 0.35, 0.5), mat('#4A4450')); base.position.set(t.x, 0.18, t.z); scene.add(base);
        const arm = new (T().Group)(); arm.position.set(t.x, 0.35, t.z); scene.add(arm);
        const stick = new (T().Mesh)(new (T().BoxGeometry)(0.1, 0.9, 0.1), mat('#8A7A5A')); stick.position.y = 0.45; arm.add(stick);
        const knob = new (T().Mesh)(new (T().SphereGeometry)(0.13, 8, 6), mat('#C83A3A', '#FF5A3A')); knob.position.y = 0.92; arm.add(knob); arm.rotation.x = -0.6;
        const rg = ring(scene, t.x, t.z, 0.9, 1.05, '#FFD86A', 0.45); R.addBox(t.x - 0.35, t.x + 0.35, t.z - 0.25, t.z + 0.25, 'deco'); pts.push([t.x, t.z]);
        const L = { x: t.x, z: t.z, arm, knob, rg, on: false };
        pz.inter.push({ x: t.x, z: t.z + 0.6, r: 1.5, label: '拉下拉桿', when: () => !pz.solved && !L.on, act: () => pull(pz, L) });
        return L;
      });
      pz.hint = '「' + n + ' 支拉桿。拉下第一支之後，要在 ' + S.time + ' 秒內把全部拉下。」腳下的光圈縮到沒有之前，跑過去拉。';
    } else if (pz.kind === 'push') {
      const n = hard ? 3 : 2, t = F.tile, set = new Set(tiles.map(x => x.k)), used = new Set(), at = (tx, tz) => t.id(tx, tz);
      const free = (tx, tz) => set.has(at(tx, tz)) && !used.has(at(tx, tz)) && !solidAt(t.cX(tx), t.cZ(tz));
      S.rocks = []; S.plates = [];
      const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let i = 0; i < n * 20 && S.rocks.length < n; i++) {
        const p0 = pick(tiles); if (!free(p0.tx, p0.tz)) continue;
        // 壓板 → 往一個方向走 2 格是石頭，石頭後面一格要站得到（推的人站的地方）；難的再多一段橫的
        const [dx, dz] = pick(DIRS), steps = 2;
        let ok = true; const path = [];
        for (let s = 1; s <= steps + 1; s++) { const tx = p0.tx + dx * s, tz = p0.tz + dz * s; if (!free(tx, tz)) { ok = false; break; } path.push([tx, tz]); }
        if (!ok) continue;
        let rock = path[steps - 1], stand = path[steps];
        if (hard && rnd() < 0.6) {   // 先橫再直：石頭再往旁邊挪一格，要先往側面推一格
          const [ex, ez] = dz ? [pick([1, -1]), 0] : [0, pick([1, -1])], r2 = [rock[0] + ex, rock[1] + ez], st2 = [rock[0] + 2 * ex, rock[1] + 2 * ez];
          if (free(r2[0], r2[1]) && free(st2[0], st2[1])) { path.push(r2, st2); rock = r2; }
        }
        used.add(at(p0.tx, p0.tz)); path.forEach(([a, b]) => used.add(at(a, b)));
        const px = t.cX(p0.tx), pz0 = t.cZ(p0.tz), rx = t.cX(rock[0]), rz = t.cZ(rock[1]);
        const pm = mat('#5A5466', '#9AF0FF'), plate = new (T().Mesh)(new (T().BoxGeometry)(1.7, 0.08, 1.7), pm); plate.position.set(px, 0.04, pz0); plate.receiveShadow = true; scene.add(plate);
        const prg = ring(scene, px, pz0, 0.95, 1.1, '#9AF0FF', 0.35);
        S.plates.push({ x: px, z: pz0, m: pm, rg: prg, on: false });
        const rm = new (T().Mesh)(new (T().DodecahedronGeometry)(0.85, 0), mat('#7A7484', '#9AF0FF')); rm.position.set(rx, 0.8, rz); rm.castShadow = true; scene.add(rm);
        const col = R.addBox(rx - 0.8, rx + 0.8, rz - 0.8, rz + 0.8, 'deco');
        S.rocks.push({ x: rx, z: rz, x0: rx, z0: rz, tx: rock[0], tz: rock[1], tx0: rock[0], tz0: rock[1], m: rm, col, push: 0, anim: null });
        pts.push([px, pz0], [rx, rz]);
      }
      if (!S.rocks.length) { pz.kind = 'memory'; return setup(scene, run, F, pz); }
      S.set = set; S.t = t;
      pz.hint = '「刻著符文的石頭要壓在發光的壓板上。」走過去頂著石頭就會推動一格。推不動了就摸石碑，石頭會回到原位。';
    }
    // 石碑：換成這一種的說明（重石之室摸石碑＝石頭回到原位）
    if (tab) { tab.label = pz.kind === 'push' ? '摸石碑（石頭回到原位）' : '看石碑'; tab.act = () => { if (pz.kind === 'push' && !pz.solved) { resetRocks(pz); R.toast('石碑亮了一下——石頭都回到原位了。', '#B8E07A'); return; } say(NAMES[pz.kind], pz.hint); }; }
    pz.inter.forEach(it => { if (/封著/.test(String(it.label))) it.act = () => say(NAMES[pz.kind], '寶箱的鎖孔上有一圈發光的紋路。先解開這一區的機關。'); });
    try { clearAt(pts); } catch (e) { }
  };
  const pull = (pz, L) => {
    const S = pz.p2; L.on = true; L.arm.rotation.x = 0.6; L.knob.material.color.set('#7AE07A'); L.knob.material.emissive.set('#3AC83A'); L.knob.material.emissiveIntensity = 0.8; L.rg.material.color.set('#7AE07A');
    if (R.sfx) R.sfx('lock');
    if (!S.on) { S.on = true; S.left = S.time; R.toast(S.time + ' 秒內把全部的拉桿拉下！', '#FFD86A'); }
    if (S.levers.every(l => l.on)) { S.on = false; solve(pz); }
  };
  const resetLevers = pz => { const S = pz.p2; S.on = false; S.levers.forEach(L => { L.on = false; L.arm.rotation.x = -0.6; L.knob.material.color.set('#C83A3A'); L.knob.material.emissive.set('#FF5A3A'); L.knob.material.emissiveIntensity = 0; L.rg.material.color.set('#FFD86A'); L.rg.scale.setScalar(1); }); };
  const moveRock = (rk, tx, tz, S) => {
    rk.tx = tx; rk.tz = tz; const x = S.t.cX(tx), z = S.t.cZ(tz);
    rk.col.on = false; rk.col = R.addBox(x - 0.8, x + 0.8, z - 0.8, z + 0.8, 'deco');
    rk.anim = { x0: rk.x, z0: rk.z, x1: x, z1: z, t: 0 }; rk.x = x; rk.z = z;
  };
  const resetRocks = pz => { const S = pz.p2; S.rocks.forEach(rk => { if (rk.tx !== rk.tx0 || rk.tz !== rk.tz0) moveRock(rk, rk.tx0, rk.tz0, S); }); };

  // ---------- 蓋樓層：puzzle.js 蓋好石碑、寶箱之後 ----------
  const bf = R.buildFloor;
  R.buildFloor = (scene, run, F) => { const out = bf(scene, run, F); try { (F.puzzles || []).forEach(pz => { if (mine(pz.kind)) setup(scene, run, F, pz); }); } catch (e) { console.warn('[puzzle2]', e); } return out; };

  // ---------- 每一格 ----------
  const st0 = R.step;
  R.step = dt => {
    const out = st0(dt), F = W.F, P = W.P, run = W.run;
    if (!run || !F || !F.puzzles || !P) return out;
    // 想往哪邊走（方向鍵、搖桿換成世界座標，和 run.js 一樣）：頂著石頭的時候人其實走不動，所以看按鍵不看位移
    const I = R.input || { keys: {} }; let ix = 0, iz = 0; if (I.keys.w || I.keys.arrowup) iz -= 1; if (I.keys.s || I.keys.arrowdown) iz += 1; if (I.keys.a || I.keys.arrowleft) ix -= 1; if (I.keys.d || I.keys.arrowright) ix += 1; if (I.moveStick) { ix += I.moveStick.x; iz += I.moveStick.y; }
    const cy = Math.cos(W.cam ? W.cam.yaw : 0), sy = Math.sin(W.cam ? W.cam.yaw : 0), mvx = ix * cy + iz * sy, mvz = -ix * sy + iz * cy;
    F.puzzles.forEach(pz => {
      const S = pz.p2; if (!S || pz.solved) return;
      if (pz.kind === 'memory' && S.tiles) {
        if (S.hide > 0) { S.hide -= dt; if (S.hide <= 0) { S.flip.forEach(tl => { tl.open = false; tl.sp.visible = false; tl.m.emissiveIntensity = 0; }); S.flip = []; } }
        let on = -1, bd = 1e9; S.tiles.forEach((tl, i) => { const d = Math.max(Math.abs(P.x - tl.x), Math.abs(P.z - tl.z)); if (d < (tl.inside ? 1.05 : 0.8) && d < bd) { bd = d; on = i; } });
        S.tiles.forEach((tl, i) => {
          const inside = i === on;
          if (inside && !tl.inside && !tl.open && !tl.done && S.hide <= 0) {
            tl.open = true; tl.sp.visible = true; tl.m.emissiveIntensity = 0.7; S.flip.push(tl); if (R.sfx) R.sfx('ui');
            if (S.flip.length === 2) {
              const [a, b] = S.flip;
              if (a.sym === b.sym) { a.done = b.done = true; a.rg.material.opacity = b.rg.material.opacity = 0.9; a.m.emissiveIntensity = b.m.emissiveIntensity = 1; S.flip = []; if (R.sfx) R.sfx('magic'); if (S.tiles.every(t => t.done)) solve(pz); }
              else { S.hide = 0.9; fail(pz, '圖案不一樣……石板慢慢蓋回去了。', 2); }
            }
          }
          tl.inside = inside;
          if (tl.done) tl.sp.position.y = 1.0 + Math.sin((run.t || 0) * 2 + i) * 0.08;
        });
      } else if (pz.kind === 'levers' && S.levers) {
        if (S.on) {
          S.left -= dt; const k = Math.max(0, S.left / S.time);
          S.levers.forEach(L => { if (!L.on) { L.rg.scale.setScalar(0.25 + 0.75 * k); L.rg.material.opacity = 0.45 + 0.4 * Math.sin((run.t || 0) * 12); } });
          if (S.left <= 0) { resetLevers(pz); fail(pz, '來不及——拉桿全部彈回去了。……牆上的眼睛張開了一點。', 5); }
        }
      } else if (pz.kind === 'push' && S.rocks) {
        S.rocks.forEach(rk => {
          if (rk.anim) { const a = rk.anim; a.t += dt / 0.25; const u = Math.min(1, a.t); rk.m.position.set(a.x0 + (a.x1 - a.x0) * u, 0.8, a.z0 + (a.z1 - a.z0) * u); rk.m.rotation.z += dt * 4; if (u >= 1) rk.anim = null; return; }
          const dx = rk.x - P.x, dz = rk.z - P.z, d = Math.hypot(dx, dz), sp = Math.hypot(mvx, mvz);
          // 頂著石頭（貼著、往石頭的方向走）0.25 秒：推一格
          if (d < 1.45 && sp > 0.001 && (mvx * dx + mvz * dz) / (sp * d) > 0.6) {
            rk.push += dt;
            if (rk.push > 0.25) {
              rk.push = 0; const ax = Math.abs(dx) > Math.abs(dz), sx = ax ? Math.sign(dx) : 0, sz = ax ? 0 : Math.sign(dz), nx = rk.tx + sx, nz = rk.tz + sz, k = S.t.id(nx, nz);
              const blocked = !S.set.has(k) || S.rocks.some(o => o !== rk && o.tx === nx && o.tz === nz) || solidAt(S.t.cX(nx), S.t.cZ(nz), S.rocks.map(o => o.col));
              if (blocked) { if (!rk.told) { rk.told = 1; R.toast('推不動——那邊是牆或另一顆石頭。推錯了就摸石碑讓石頭回去。', '#B8B0A0'); } }
              else { moveRock(rk, nx, nz, S); if (R.sfx) R.sfx('hit'); }
            }
          } else rk.push = 0;
        });
        let all = true;
        S.plates.forEach(pl => { const on = S.rocks.some(rk => !rk.anim && Math.hypot(rk.x - pl.x, rk.z - pl.z) < 0.6); if (on !== pl.on) { pl.on = on; pl.m.emissiveIntensity = on ? 1 : 0; pl.rg.material.opacity = on ? 0.9 : 0.35; if (on && R.sfx) R.sfx('lock'); } if (!on) all = false; });
        if (all) solve(pz);
      }
    });
    return out;
  };
  // 換樓層：Sprite、貼圖丟掉
  const lf = R.loadFloor;
  R.loadFloor = (f, o) => { const F = W.F; if (F && F.puzzles) F.puzzles.forEach(pz => { const S = pz.p2; if (!S) return; (S.tiles || []).forEach(t => t.sp.material.dispose()); (S.tex || []).forEach(t => t.dispose()); }); return lf(f, o); };
})(window.R);
