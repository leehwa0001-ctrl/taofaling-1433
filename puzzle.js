// 討伐令 1433：遺跡的解謎（作者：只放在支線，不影響主幹道）
// 每一層從「入口到樓層通道（或最深處）的那條路」以外的房間挑 0～2 間，變成謎題房：裡面沒有遺跡生物，
// 有一塊石碑（提示）和一個被封住的金寶箱；解開了寶箱的封印才會消失，另外掉魔力水晶。
// 2026-10-02 作者：解謎要難一點。分級是摩爾斯以上（lv ≥ 3）再難一點。
//  - 燭台：五支（難：六支）高矮差不多的燭台，順序是亂的；石碑只說「先點第二高的，再點最矮的……」，要自己比高矮。
//    點錯全部熄滅，佩特拉的注意往上。
//  - 石板：五塊（難：七塊）圍成一圈；踩上一塊，它和兩旁的石板一起翻轉明暗（關燈遊戲）。全部同時亮起來就解開。
//    圈的塊數不是 3 的倍數，所以一定解得開。
//  - 符文柱：三根（難：四根）；轉一根，順序上的下一根也跟著轉。照石碑上的符號排好就解開（一定解得開）。
(function (R) {
  const W = R.W, T = () => THREE, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const KINDS = ['candles', 'plates', 'dials'];
  const NAMES = { candles: '燭台之室', plates: '石板之室', dials: '符文之室' };

  // ---------- 選房間：主幹道以外的戰鬥房 ----------
  const gf = R.genFloor;
  R.genFloor = (run, f) => {
    const F = gf(run, f), rooms = F.rooms;
    const end = rooms.find(r => r.type === 'stairs' || r.type === 'boss' || r.type === 'deep'); if (!end) return F;
    const prev = rooms.map(() => -1), seen = rooms.map(() => false), q = [0]; seen[0] = true;
    while (q.length) { const i = q.shift(); Object.values(rooms[i].links).forEach(j => { if (!seen[j]) { seen[j] = true; prev[j] = i; q.push(j); } }); }
    const main = new Set(); for (let i = end.i; i >= 0; i = prev[i]) { main.add(i); if (i === 0) break; }
    const side = rooms.filter(r => !main.has(r.i) && r.type === 'fight' && !r.big && !r.traps && (r.hx || 0) >= 6 && (r.hz || 0) >= 5).sort((a, b) => Object.keys(a.links).length - Object.keys(b.links).length || b.dist - a.dist);
    const n = Math.min(side.length, rooms.length >= 9 ? (rnd() < 0.5 ? 2 : 1) : (rnd() < 0.7 ? 1 : 0));
    side.slice(0, n).forEach(r => { r.type = 'puzzle'; r.puzzle = pick(KINDS); r.cleared = true; });
    return F;
  };

  // ---------- 小工具 ----------
  const mat = (col, em) => new (T().MeshLambertMaterial)(Object.assign({ color: col }, em ? { emissive: em, emissiveIntensity: 0 } : {}));
  const floorOk = (F, r, x, z) => { const t = F.tile, tx = t.tX(x), tz = t.tZ(z); if (tx < 1 || tz < 1 || tx >= t.nx - 1 || tz >= t.nz - 1) return false; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const k = t.id(tx + dx, tz + dz); if (t.T[k] !== 1 || t.RM[k] !== r.i) return false; } return true; };
  // 房間裡的一個點（fx、fz：-1～1）：找離那裡最近、四周都是這間房地板的格子，而且和已經擺的東西隔 2.4 公尺以上
  let used = [];
  const spot = (F, r, fx, fz) => {
    const t = F.tile, wx = r.x + fx * (r.hx - 3), wz = r.z + fz * (r.hz - 3);
    if (!r.okTiles) { r.okTiles = []; for (let k = 0; k < t.nx * t.nz; k++) { if (t.RM[k] !== r.i) continue; const tx = k % t.nx, tz = (k - tx) / t.nx, x = t.cX(tx), z = t.cZ(tz); if (floorOk(F, r, x, z)) r.okTiles.push([x, z]); } }
    const near = r.okTiles.map(p => [p, Math.hypot(p[0] - wx, p[1] - wz)]).sort((a, b) => a[1] - b[1]), far = p => used.length ? Math.min(...used.map(u => Math.hypot(u[0] - p[0], u[1] - p[1]))) : 99;
    let c = null; for (const gap of [2.4, 2.0, 1.7]) { c = near.find(([p]) => far(p) >= gap); if (c) break; }
    if (!c && near.length) c = near.slice().sort((a, b) => far(b[0]) - far(a[0]))[0];   // 真的擺不下：挑離別的東西最遠的（2026-10-04：原本全部疊在房間正中央，石板一踩翻好幾塊，解不開）
    const p = c ? c[0] : [r.x, r.z]; used.push(p); return p;
  };
  const glyphTex = (sym, col) => {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16; const x = c.getContext('2d'); x.fillStyle = col; x.strokeStyle = '#140E1A'; x.lineWidth = 2;
    x.beginPath();
    if (sym === 0) x.arc(8, 8, 5.5, 0, 7);
    else if (sym === 1) { x.moveTo(8, 2); x.lineTo(14, 13); x.lineTo(2, 13); x.closePath(); }
    else if (sym === 2) x.rect(3, 3, 10, 10);
    else { x.moveTo(8, 1.5); x.lineTo(14.5, 8); x.lineTo(8, 14.5); x.lineTo(1.5, 8); x.closePath(); }
    x.fill(); x.stroke();
    const t = new (T().CanvasTexture)(c); t.magFilter = t.minFilter = T().NearestFilter; return t;
  };
  const pixTex = draw => { const c = document.createElement('canvas'); draw(c); const t = new (T().CanvasTexture)(c); t.magFilter = t.minFilter = T().NearestFilter; return t; };
  const flameTex = () => pixTex(c => { c.width = 8; c.height = 12; const x = c.getContext('2d'), P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); }; P(3, 1, 2, 2, '#FFE8A0'); P(2, 3, 4, 3, '#FFC24A'); P(1, 6, 6, 4, '#FF8A2A'); P(3, 5, 2, 4, '#FFF4C8'); P(2, 10, 4, 2, '#C8501A'); });
  const markTex = () => pixTex(c => { c.width = 10; c.height = 14; const x = c.getContext('2d'); x.fillStyle = '#140E1A'; x.fillRect(1, 0, 8, 14); x.fillStyle = '#FFD86A'; x.fillRect(3, 1, 4, 2); x.fillRect(6, 2, 2, 4); x.fillRect(4, 5, 3, 2); x.fillRect(4, 7, 2, 2); x.fillRect(4, 11, 2, 2); });
  const floorRing = (scene, x, z, r0, r1, col, op) => { const m = new (T().Mesh)(new (T().RingGeometry)(r0, r1, 20), new (T().MeshBasicMaterial)({ color: col, transparent: true, opacity: op, depthWrite: false, side: T().DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); scene.add(m); return m; };
  const SYM = ['●', '▲', '■', '◆'], SYMCOL = ['#FFD86A', '#7FE0FF', '#FF8A7A', '#C8A0FF'];
  const sprite = (scene, pz, tex, x, y, z, s) => { const m = new (T().SpriteMaterial)({ map: tex, transparent: true, depthWrite: false }), sp = new (T().Sprite)(m); sp.scale.set(s, s, 1); sp.position.set(x, y, z); scene.add(sp); pz.sprites.push(sp); return sp; };
  const say = (title, line) => { R.sheet('<p class="kicker">' + R.esc(title) + '</p><p class="hand">' + R.esc(line) + '</p>', '<div class="row"><button type="button" class="btn pri" id="pz-x">知道了</button></div>'); document.getElementById('pz-x').onclick = R.closeSheet; };

  // ---------- 解開 ----------
  const solve = pz => {
    if (pz.solved) return; pz.solved = true;
    const F = W.F, run = W.run, ch = pz.chest;
    if (ch && !F.chests.includes(ch)) F.chests.push(ch);
    if (pz.seal) { pz.seal.visible = false; } if (pz.mark) pz.mark.visible = false;
    if (R.playSfx) R.playSfx('unlock', 200); else if (R.sfx) R.sfx('chest');
    R.toast('機關解開了——寶箱的封印消失了。', '#B8E07A');
    if (ch && R.dropMat) R.dropMat('crystal', 1 + run.grade.lv, ch.x + 1.2, ch.z + 0.9);
    if (R.fx) R.fx('spawn', ch ? ch.x : pz.r.x, 0.1, ch ? ch.z : pz.r.z, { color: '#B8E07A' });
  };
  const fail = (pz, msg) => { const run = W.run; run.aware = Math.min(100, run.aware + 8); R.toast(msg, '#E07A5A'); if (R.shake) R.shake(0.2); };

  // ---------- 蓋謎題房 ----------
  const build = (scene, run, F, r) => {
    const pz = { r, kind: r.puzzle, solved: false, inter: [], sprites: [], step: 0 };
    used = [];
    const [tx0, tz0] = spot(F, r, 0, -0.75);
    // 石碑
    const tab = new (T().Mesh)(new (T().BoxGeometry)(1.5, 1.8, 0.4), mat('#8A86A0', '#2A2440')); tab.material.emissiveIntensity = 0.6; tab.position.set(tx0, 0.85, tz0); tab.castShadow = true; scene.add(tab);
    R.addBox(tx0 - 0.75, tx0 + 0.75, tz0 - 0.22, tz0 + 0.22, 'deco');
    pz.tex = []; pz.mark = sprite(scene, pz, markTex(), tx0, r.puzzle === 'dials' ? 3.2 : 2.5, tz0, 14 / 12); pz.tex.push(pz.mark.material.map);
    // 被封住的金寶箱：先不放進 F.chests（解開才放）
    const [cx, cz] = spot(F, r, 0.32, -0.5);
    const ch = R.addChest(scene, F, cx, cz, 2, r.i); F.chests.splice(F.chests.indexOf(ch), 1); pz.chest = ch;
    const seal = new (T().Mesh)(new (T().RingGeometry)(1.1, 1.35, 24), new (T().MeshBasicMaterial)({ color: '#B07AFF', transparent: true, opacity: 0.7, depthWrite: false, side: T().DoubleSide })); seal.rotation.x = -Math.PI / 2; seal.position.set(cx, 0.06, cz); scene.add(seal); pz.seal = seal;
    pz.inter.push({ x: cx, z: cz, r: 2, label: '寶箱被機關封著', when: () => !pz.solved, act: () => say(NAMES[pz.kind], '寶箱的鎖孔上有一圈發光的紋路。先解開這一區的機關。') });
    const ring = n => Array.from({ length: n }, (_, i) => { const a = (i + 0.5) / n * Math.PI * 2; return spot(F, r, Math.sin(a) * 0.75, Math.cos(a) * 0.55 + 0.2); });

    if (pz.kind === 'candles') {
      const n = run.grade.lv >= 3 ? 6 : 5, HS = Array.from({ length: n }, (_, k) => 0.4 + k * 2.0 / (n - 1)), hs = HS.slice().sort(() => rnd() - 0.5);   // 高矮差大一點（鏡頭從上面看，原本差 20 公分看不出來）
      const RANK = n === 6 ? ['最矮', '第二矮', '第三矮', '第三高', '第二高', '最高'] : ['最矮', '第二矮', '中間', '第二高', '最高'], rk = i => RANK[HS.indexOf(hs[i])];
      pz.order = Array.from({ length: n }, (_, i) => i).sort(() => rnd() - 0.5);
      pz.hint = '「先點' + rk(pz.order[0]) + '的，' + pz.order.slice(1, -1).map(i => '再點' + rk(i) + '的').join('，') + '，最後點' + rk(pz.order[n - 1]) + '的。」';
      pz.cand = ring(n).map(([x, z], i) => {
        const h = hs[i], pole = new (T().Mesh)(new (T().CylinderGeometry)(0.15, 0.2, h, 6), mat('#6A5A44')); pole.position.set(x, h / 2, z); scene.add(pole);
        const wax = new (T().Mesh)(new (T().CylinderGeometry)(0.17, 0.17, 0.3, 6), mat('#F0E8D4', '#3A3020')); wax.material.emissiveIntensity = 0.5; wax.position.set(x, h + 0.15, z); scene.add(wax);
        const base = new (T().Mesh)(new (T().CylinderGeometry)(0.36, 0.42, 0.12, 8), mat('#4A3E30')); base.position.set(x, 0.06, z); scene.add(base); const mk = floorRing(scene, x, z, 0.55, 0.7, '#FFD86A', 0.32);
        if (!pz.flame) { pz.flame = flameTex(); pz.tex.push(pz.flame); } const fl = sprite(scene, pz, pz.flame, x, h + 0.62, z, 1); fl.scale.set(8 / 12, 1, 1); fl.visible = false;
        R.addBox(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 'deco');
        const L = { x, y: h + 0.6, z, col: '#FFB060', I: 0, flick: rnd() * 10 }; F.lights.push(L);
        const c = { i, x, z, fl, L, mk, lit: false };
        pz.inter.push({ x, z, r: 1.6, label: '點燃燭台（這支高 ' + (h + 0.3).toFixed(1) + ' 公尺）', when: () => !pz.solved && !c.lit, act: () => {
          if (pz.order[pz.step] === i) { c.lit = true; fl.visible = true; mk.material.opacity = 0.7; L.I = 1.1; pz.step++; if (R.sfx) R.sfx('magic'); if (pz.step >= pz.order.length) solve(pz); }
          else { pz.step = 0; pz.cand.forEach(o => { o.lit = false; o.fl.visible = false; o.mk.material.opacity = 0.32; o.L.I = 0; }); fail(pz, '燭火一起熄滅了。……牆上的眼睛張開了一點。'); }
        } });
        return c;
      });
    }
    if (pz.kind === 'plates') {
      const n = run.grade.lv >= 3 ? 7 : 5;
      pz.hint = '「踩上一塊石板，它和兩旁的石板會一起翻轉明暗。讓所有的石板同時亮起來。」（同一塊踩兩次等於沒踩；先試著只踩暗的那幾塊旁邊。）';
      pz.plates = ring(n).map(([x, z]) => {
        const m = mat('#7A7484', '#9AF0FF'), p = new (T().Mesh)(new (T().BoxGeometry)(1.5, 0.1, 1.5), m); p.position.set(x, 0.05, z); p.receiveShadow = true; scene.add(p);
        const rg = floorRing(scene, x, z, 0.45, 0.62, '#9AF0FF', 0.25); rg.position.y = 0.11;
        return { x, z, m, rg, on: true, inside: false };
      });
      { const mx = pz.plates.reduce((a, p) => a + p.x, 0) / n, mz = pz.plates.reduce((a, p) => a + p.z, 0) / n; pz.plates.sort((a, b) => Math.atan2(a.x - mx, a.z - mz) - Math.atan2(b.x - mx, b.z - mz)); }
      // 從全亮的樣子隨便踩幾下打亂（所以一定解得開）；踩完剛好全亮就再踩一下
      pz.press = i => [i - 1, i, i + 1].forEach(j => { const p = pz.plates[(j + n) % n]; p.on = !p.on; });
      const k = run.grade.lv >= 3 ? 3 : 2, picks = Array.from({ length: n }, (_, i) => i).sort(() => rnd() - 0.5).slice(0, k); picks.forEach(pz.press);
      if (pz.plates.every(p => p.on)) pz.press(picks[0] === 0 ? 1 : 0);
    }
    if (pz.kind === 'dials') {
      const nd = run.grade.lv >= 3 ? 4 : 3;
      pz.target = Array.from({ length: nd }, () => Math.floor(rnd() * 4));
      pz.hint = '石碑上刻著' + (nd === 4 ? '四' : '三') + '個符號：「' + pz.target.map(s => SYM[s]).join('　') + '」。下面一行小字：「轉動一根柱子，它右邊的那一根也會跟著轉。」（符號由左到右對應柱子由左到右；最右邊那根只轉自己。）';
      pz.glyph = SYM.map((s, i) => glyphTex(i, SYMCOL[i])); pz.tex.push(...pz.glyph);
      pz.target.forEach((s, i) => sprite(scene, pz, pz.glyph[s], tx0 + (i - (nd - 1) / 2) * (nd === 4 ? 0.7 : 0.9), 2.3, tz0 + 0.2, nd === 4 ? 0.75 : 0.9));   // 石碑上的三個符號
      pz.dials = Array.from({ length: nd }, (_, i) => i - (nd - 1) / 2).map((k, i) => {
        const [x, z] = spot(F, r, k * (nd === 4 ? 0.32 : 0.42), 0.2);
        const pil = new (T().Mesh)(new (T().BoxGeometry)(0.7, 1.3, 0.7), mat('#5A5466')); pil.position.set(x, 0.65, z); pil.castShadow = true; scene.add(pil);
        R.addBox(x - 0.35, x + 0.35, z - 0.35, z + 0.35, 'deco');
        const sym = Math.floor(rnd() * 4);
        const sp = sprite(scene, pz, pz.glyph[sym], x, 2.0, z, 16 / 12);
        const d = { x, z, sym, sp, i };
        pz.inter.push({ x, z, r: 1.7, get label() { return '轉動符文柱（由左數來第 ' + (pz.dials.indexOf(d) + 1) + ' 根）'; }, when: () => !pz.solved, act: () => {
          [d, pz.dials[pz.dials.indexOf(d) + 1]].forEach(o => { if (!o) return; o.sym = (o.sym + 1) % 4; o.sp.material.map = pz.glyph[o.sym]; o.sp.material.needsUpdate = true; }); if (R.sfx) R.sfx('swing');
          if (pz.dials.every((o, j) => o.sym === pz.target[j])) solve(pz);
        } });
        return d;
      });
      pz.dials.sort((a, b) => a.x - b.x);   // 由左到右（擺的時候可能被房間的形狀擠亂）
      if (pz.dials.every((o, j) => o.sym === pz.target[j])) { const d = pz.dials[0]; d.sym = (d.sym + 1) % 4; d.sp.material.map = pz.glyph[d.sym]; }   // 一開始剛好排好就打亂一格
    }
    pz.inter.push({ x: tx0, z: tz0 + 0.3, r: 1.9, label: '看石碑', act: () => say(NAMES[pz.kind], pz.solved ? '石碑上的字已經暗下去了。' : pz.hint) });
    F.puzzles.push(pz);
  };
  const bf = R.buildFloor;
  R.buildFloor = (scene, run, F) => { const out = bf(scene, run, F); F.puzzles = []; F.rooms.forEach(r => { if (r.type === 'puzzle') build(scene, run, F, r); }); return out; };

  // ---------- 互動：和原本的寶箱、水晶一起比誰最近 ----------
  const ni = R.nearestInteract;
  R.nearestInteract = () => {
    const best = ni(), P = W.P, F = W.F; if (!F || !F.puzzles || !F.puzzles.length || !P) return best;
    let b2 = null, bd = best ? Math.hypot(best.x - P.x, best.z - P.z) : 1e9;
    F.puzzles.forEach(pz => pz.inter.forEach(it => { if (it.when && !it.when()) return; const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < bd) { bd = d; b2 = it; } }));
    return b2 || best;
  };
  // ---------- 每一格：石板、封印的光 ----------
  const uf = R.updateFx;
  R.updateFx = dt => {
    uf(dt);
    const F = W.F, P = W.P, run = W.run; if (!run || !F || !F.puzzles || !P) return;
    F.puzzles.forEach(pz => {
      if (pz.seal && !pz.solved) pz.seal.material.opacity = 0.45 + Math.sin((run.t || 0) * 3) * 0.25;
      if (pz.kind !== 'plates' || pz.solved) return;
      // 踩上去的那一下才翻（站著不動不會一直翻）
      let on = -1, bd = 1e9; pz.plates.forEach((p, i) => { const d = Math.max(Math.abs(P.x - p.x), Math.abs(P.z - p.z)); if (d < 0.8 && d < bd) { bd = d; on = i; } });   // 一次只踩得到一塊
      pz.plates.forEach((p, i) => { const inside = i === on; if (inside && !p.inside) { pz.press(i); if (R.sfx) R.sfx('ui'); } p.inside = inside; });
      pz.plates.forEach(p => { p.m.emissiveIntensity = p.on ? 1 : 0; p.rg.material.opacity = p.on ? 0.9 : 0.25; });
      if (pz.plates.every(p => p.on)) solve(pz);
    });
  };
  // 換樓層：精靈圖（Sprite）R.disposeScene 不會清，自己丟
  const lf = R.loadFloor;
  R.loadFloor = (f, o) => { const F = W.F; if (F && F.puzzles) F.puzzles.forEach(pz => { pz.sprites.forEach(s => { s.material.dispose(); }); (pz.tex || []).forEach(t => t.dispose()); }); return lf(f, o); };
})(window.R);
