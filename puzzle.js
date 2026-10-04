// 討伐令 1433：遺跡的解謎（作者：只放在支線，不影響主幹道）
// 每一層從「入口到樓層通道（或最深處）的那條路」以外的房間挑 0～2 間，變成謎題房：裡面沒有遺跡生物，
// 有一塊石碑（提示）和一個被封住的金寶箱；解開了寶箱的封印才會消失，另外掉魔力水晶。
// 2026-10-02 作者：解謎要難一點。分級是摩爾斯以上（lv ≥ 3）再難一點。
//  - 燭台：五支（難：六支）高矮差不多的燭台，順序是亂的；石碑只說「先點第二高的，再點最矮的……」，要自己比高矮。
//    點錯全部熄滅，佩特拉的注意往上。
//  - 石板：五塊（難：七塊）圍成一圈；踩上一塊，它和兩旁的石板一起翻轉明暗（關燈遊戲）。全部同時亮起來就解開。
//    圈的塊數不是 3 的倍數，所以一定解得開。
//  - 符文柱：三根（難：四根）；轉一根，順序上的下一根也跟著轉。照石碑上的符號排好就解開（一定解得開）。
// 2026-10-04 作者：寶箱解謎蠻有趣，除了燭台；希望不用看規則說明就能直接解。
//  - 燭台不再出現，換成「回音之室」：一進房間，幾塊彩色的石頭照順序一個一個亮、唱一個音，照著踩一遍就解開；
//    踩錯會重唱一次（站著不動太久、摸石碑也會再唱）。
//  - 石板：相鄰的石板之間有發光的連線；人靠近一塊石板，踩下去會翻的那三塊先亮給你看。
//  - 符文柱：每根柱子前面的地上浮著它該轉成的符號；柱子之間有連桿（轉這根，右邊那根也會動）。
(function (R) {
  const W = R.W, T = () => THREE, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const KINDS = ['echo', 'plates', 'dials'];   // 燭台（candles）的程式還在，不再挑
  const NAMES = { candles: '燭台之室', plates: '石板之室', dials: '符文之室', echo: '回音之室' };
  // 2026-10-04 作者：解謎種類也沒增加啊——新的種類寫在 puzzle2.js，從這裡接上（R.PUZZLE_EXT[種類] = { name, build, update }）
  const EXT = R.PUZZLE_EXT = R.PUZZLE_EXT || {}, nameOf = k => NAMES[k] || (EXT[k] && EXT[k].name) || '機關之室';
  // 回音之室的音（R.AUDIO 的 AudioContext；靜音就不唱）
  const tone = f => { try { const A = R.AUDIO, c = A && A.ctx; if (!c || (R.isMuted && R.isMuted())) return; const v = (A.VOL ? A.VOL.sfx : 0.8) * 0.22, t = c.currentTime + 0.01, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o.connect(g); g.connect(A.out || c.destination); o.start(t); o.stop(t + 0.55); } catch (e) { } };

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
    side.slice(0, n).forEach(r => { r.type = 'puzzle'; r.puzzle = pick(KINDS.concat(Object.keys(EXT))); r.cleared = true; });
    return F;
  };

  // ---------- 小工具 ----------
  const mat = (col, em) => new (T().MeshLambertMaterial)(Object.assign({ color: col }, em ? { emissive: em, emissiveIntensity: 0 } : {}));
  const floorOk = (F, r, x, z) => { const t = F.tile, tx = t.tX(x), tz = t.tZ(z); if (tx < 1 || tz < 1 || tx >= t.nx - 1 || tz >= t.nz - 1) return false; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const k = t.id(tx + dx, tz + dz); if (t.T[k] !== 1 || t.RM[k] !== r.i) return false; } return true; };
  // 房間裡的一個點（fx、fz：-1～1）：找離那裡最近、四周都是這間房地板的格子，而且和已經擺的東西隔 2.4 公尺以上
  let used = [];
  const spot = (F, r, fx, fz, pad) => {   // pad：這個東西自己有多寬（寶箱、石碑），別的東西要再離遠一點
    const t = F.tile, wx = r.x + fx * (r.hx - 3), wz = r.z + fz * (r.hz - 3);
    if (!r.okTiles) { r.okTiles = []; for (let k = 0; k < t.nx * t.nz; k++) { if (t.RM[k] !== r.i) continue; const tx = k % t.nx, tz = (k - tx) / t.nx, x = t.cX(tx), z = t.cZ(tz); if (floorOk(F, r, x, z)) r.okTiles.push([x, z]); } }
    const near = r.okTiles.map(p => [p, Math.hypot(p[0] - wx, p[1] - wz)]).sort((a, b) => a[1] - b[1]), far = p => used.length ? Math.min(...used.map(u => Math.hypot(u[0] - p[0], u[1] - p[1]) - (u[2] || 0))) : 99;
    let c = null; for (const gap of [2.4, 2.0, 1.7]) { c = near.find(([p]) => far(p) >= gap); if (c) break; }
    if (!c && near.length) c = near.slice().sort((a, b) => far(b[0]) - far(a[0]))[0];   // 真的擺不下：挑離別的東西最遠的（2026-10-04：原本全部疊在房間正中央，石板一踩翻好幾塊，解不開）
    const p = c ? c[0] : [r.x, r.z]; used.push([p[0], p[1], pad || 0]); return p;
  };
  const noteTex = col => pixTex(c => { c.width = 10; c.height = 12; const x = c.getContext('2d'); x.fillStyle = '#140E1A'; x.fillRect(1, 7, 5, 5); x.fillRect(5, 0, 3, 9); x.fillStyle = col; x.fillRect(2, 8, 3, 3); x.fillRect(6, 1, 1, 8); x.fillRect(7, 1, 2, 2); x.fillRect(8, 3, 1, 2); });   // 浮在回音石上面的音符
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
    const [tx0, tz0] = spot(F, r, 0, -0.75, 0.5);
    // 石碑
    const tab = new (T().Mesh)(new (T().BoxGeometry)(1.5, 1.8, 0.4), mat('#8A86A0', '#2A2440')); tab.material.emissiveIntensity = 0.6; tab.position.set(tx0, 0.85, tz0); tab.castShadow = true; scene.add(tab);
    R.addBox(tx0 - 0.75, tx0 + 0.75, tz0 - 0.22, tz0 + 0.22, 'deco');
    pz.tex = []; pz.mark = sprite(scene, pz, markTex(), tx0, r.puzzle === 'dials' ? 3.2 : 2.5, tz0, 14 / 12); pz.tex.push(pz.mark.material.map);
    // 被封住的金寶箱：先不放進 F.chests（解開才放）
    const [cx, cz] = spot(F, r, 0.32, -0.5, 0.7);   /* 2026-10-04 作者回報：石頭被擋住——寶箱 1.6 公尺寬，別的東西要離遠一點 */
    const ch = R.addChest(scene, F, cx, cz, 2, r.i); F.chests.splice(F.chests.indexOf(ch), 1); pz.chest = ch;
    const seal = new (T().Mesh)(new (T().RingGeometry)(1.1, 1.35, 24), new (T().MeshBasicMaterial)({ color: '#B07AFF', transparent: true, opacity: 0.7, depthWrite: false, side: T().DoubleSide })); seal.rotation.x = -Math.PI / 2; seal.position.set(cx, 0.06, cz); scene.add(seal); pz.seal = seal;
    pz.inter.push({ x: cx, z: cz, r: 2, label: '寶箱被機關封著', when: () => !pz.solved, act: () => say(nameOf(pz.kind), '寶箱的鎖孔上有一圈發光的紋路。先解開這一區的機關。') });
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
    if (pz.kind === 'echo') {
      const n = run.grade.lv >= 3 ? 5 : 4, L = run.grade.lv >= 3 ? 5 : 4, COLS = ['#FF6A5A', '#5AC8FF', '#7AE07A', '#FFD24A', '#C88AFF'], NOTES = [262, 330, 392, 494, 587];
      pz.hint = '「石頭會唱歌。記住牠們唱的順序，照著踩一遍。」（踩錯了會再唱一次；摸石碑也會再唱。）';
      pz.stones = ring(n).map(([x, z], i) => {
        const m = mat(COLS[i], COLS[i]), st = new (T().Mesh)(new (T().CylinderGeometry)(0.75, 0.85, 0.3, 8), m); m.emissiveIntensity = 0.55; m.fog = false; st.position.set(x, 0.15, z); st.receiveShadow = true; scene.add(st);
        const rg = floorRing(scene, x, z, 0.9, 1.05, COLS[i], 0.55); rg.position.y = 0.32; rg.material.fog = false;
        // 2026-10-04 回報：火山深層的機關房看不到石頭（橘色的霧、暗光把石頭的顏色蓋掉，只剩光圈）——石頭自己發光、上面浮一個同色的音符
        const nt = sprite(scene, pz, noteTex(COLS[i]), x, 1.5, z, 1.25); nt.material.fog = false; pz.tex.push(nt.material.map);
        return { x, z, m, rg, nt, inside: false, lit: 0, f: NOTES[i] };
      });
      pz.seq = []; for (let i = 0; i < L; i++) { let k; do { k = Math.floor(rnd() * n); } while (pz.seq.length && k === pz.seq[pz.seq.length - 1]); pz.seq.push(k); }
      pz.step = 0; pz.last = -1; pz.play = null; pz.started = false; pz.idle = 0;
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
      // 相鄰的石板之間畫發光的連線（看得出哪幾塊是一組）
      pz.plates.forEach((a, i) => { const b = pz.plates[(i + 1) % n], L = Math.hypot(b.x - a.x, b.z - a.z), ln = new (T().Mesh)(new (T().BoxGeometry)(0.14, 0.02, Math.max(0.1, L - 1.6)), new (T().MeshBasicMaterial)({ color: '#9AF0FF', transparent: true, opacity: 0.45, depthWrite: false })); ln.position.set((a.x + b.x) / 2, 0.07, (a.z + b.z) / 2); ln.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); scene.add(ln); });
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
      // 每根柱子前面的地上浮著它該轉成的符號；柱子之間的連桿（轉這根，右邊那根也會動）
      pz.dials.forEach((d, j) => { const tg = sprite(scene, pz, pz.glyph[pz.target[j]], d.x, 0.55, d.z + 1.0, 0.6); tg.material.opacity = 0.55; const b = pz.dials[j + 1]; if (b) { const L = Math.hypot(b.x - d.x, b.z - d.z), rod = new (T().Mesh)(new (T().BoxGeometry)(0.12, 0.12, Math.max(0.1, L - 0.7)), new (T().MeshBasicMaterial)({ color: '#C8A0FF', transparent: true, opacity: 0.6 })); rod.position.set((d.x + b.x) / 2, 1.1, (d.z + b.z) / 2); rod.rotation.y = Math.atan2(b.x - d.x, b.z - d.z); scene.add(rod); } });
      if (pz.dials.every((o, j) => o.sym === pz.target[j])) { const d = pz.dials[0]; d.sym = (d.sym + 1) % 4; d.sp.material.map = pz.glyph[d.sym]; }   // 一開始剛好排好就打亂一格
    }
    if (EXT[pz.kind]) EXT[pz.kind].build(pz, { scene, run, F, r, tx0, tz0, mat, glyphTex, pixTex, SYM, SYMCOL, ring, spot: (fx, fz, pad) => spot(F, r, fx, fz, pad), sprite: (tex, x, y, z, sc) => sprite(scene, pz, tex, x, y, z, sc), floorRing: (x, z, r0, r1, col, op) => floorRing(scene, x, z, r0, r1, col, op), solve: () => solve(pz), fail: msg => fail(pz, msg) });
    pz.inter.push({ x: tx0, z: tz0 + 0.3, r: 1.9, label: pz.kind === 'echo' ? '摸石碑（再聽一次）' : '看石碑', act: () => { if (pz.kind === 'echo' && !pz.solved) { pz.step = 0; pz.last = -1; pz.play = { i: -1, t: 0.4 }; R.toast('石碑亮了一下——石頭又唱了一次。', '#B8E07A'); return; } say(nameOf(pz.kind), pz.solved ? '石碑上的字已經暗下去了。' : pz.hint); } });
    F.puzzles.push(pz);
  };
  const bf = R.buildFloor;
  // 謎題擺好之後：石頭、石板、轉盤、石碑旁邊原本就有的東西（罈子、木箱、碎石堆）拿掉（2026-10-04 作者回報：有時候被擋住，踩不到）
  const clearNear = (F, n0) => {
    const pts = []; F.puzzles.forEach(pz => [pz.stones, pz.plates, pz.dials, pz.inter, pz.objs].forEach(L => (L || []).forEach(o => { if (o && o.x != null) pts.push([o.x, o.z]); })));
    R.col.list.slice(0, n0).forEach(c => {
      if (!c.on || c.tag === 'wall' || c.tag === 'pit') return;
      if (!pts.some(([x, z]) => Math.max(c.x0 - x, 0, x - c.x1) ** 2 + Math.max(c.z0 - z, 0, z - c.z1) ** 2 < 1.6 * 1.6)) return;
      c.on = false; const p = c.ref; if (p && p.mesh) { p.alive = false; if (p.mesh.parent) p.mesh.parent.remove(p.mesh); }
    });
  };
  R.buildFloor = (scene, run, F) => { const out = bf(scene, run, F); F.puzzles = []; const n0 = R.col.list.length; F.rooms.forEach(r => { if (r.type === 'puzzle') build(scene, run, F, r); }); if (F.puzzles.length) { try { clearNear(F, n0); } catch (e) { console.warn('[puzzle]', e); } } return out; };

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
      if (EXT[pz.kind]) { if (EXT[pz.kind].update) EXT[pz.kind].update(pz, dt, P, run); return; }
      if (pz.kind === 'echo' && !pz.solved) {
        const inRoom = R.roomIndexAt && R.roomIndexAt(P.x, P.z) === pz.r.i;
        if (!pz.started && inRoom) { pz.started = true; pz.play = { i: -1, t: 0.8 }; }
        pz.stones.forEach(s => { s.lit = Math.max(0, s.lit - dt); const k = Math.min(1, s.lit * 2.5); s.m.emissiveIntensity = 0.55 + 1.1 * k; s.rg.material.opacity = 0.55 + 0.4 * k; if (s.nt) { const sc = 1.25 + 0.7 * k; s.nt.scale.set(sc, sc, 1); s.nt.position.y = 1.5 + Math.sin((run.t || 0) * 2.2 + s.f) * 0.12 + 0.3 * k; } });
        // 2026-10-04 作者：走過去會被當成連續按兩下——踩上去要進到 0.8 以內、要走到 1.1 以外才算離開（邊緣不會抖）；唱的時候也記住站在哪一顆
        let on = -1, bd = 1e9; pz.stones.forEach((s, i) => { const d = Math.max(Math.abs(P.x - s.x), Math.abs(P.z - s.z)); if (d < (s.inside ? 1.1 : 0.8) && d < bd) { bd = d; on = i; } });
        if (pz.play) { pz.stones.forEach((s, i) => { s.inside = i === on; }); pz.play.t -= dt; if (pz.play.t <= 0) { pz.play.i++; if (pz.play.i >= pz.seq.length) { pz.play = null; pz.idle = 0; } else { const s = pz.stones[pz.seq[pz.play.i]]; s.lit = 0.45; tone(s.f); pz.play.t = 0.7; } } return; }
        pz.stones.forEach((s, i) => {
          const inside = i === on;
          if (inside && !s.inside) {
            s.lit = 0.4; tone(s.f);
            if (i === pz.last) { /* 同一顆連踩不算（順序裡不會有同一顆連續兩次），也不算錯 */ }
            else if (pz.seq[pz.step] === i) { pz.last = i; pz.step++; if (pz.step >= pz.seq.length) solve(pz); }
            else { pz.step = 0; pz.last = -1; fail(pz, '石頭發出刺耳的聲音。……再聽一次。'); pz.play = { i: -1, t: 1.4 }; }
          }
          s.inside = inside;
        });
        pz.idle = on >= 0 || pz.step ? 0 : pz.idle + dt; if (pz.idle > 9 && inRoom) { pz.idle = 0; pz.play = { i: -1, t: 0.3 }; }
        return;
      }
      if (pz.kind !== 'plates' || pz.solved) return;
      // 踩上去的那一下才翻（站著不動不會一直翻）
      let on = -1, bd = 1e9; pz.plates.forEach((p, i) => { const d = Math.max(Math.abs(P.x - p.x), Math.abs(P.z - p.z)); if (d < (p.inside ? 1.05 : 0.8) && d < bd) { bd = d; on = i; } });   // 一次只踩得到一塊；要走到 1.05 以外才算離開（邊緣不會抖成踩兩下）
      pz.plates.forEach((p, i) => { const inside = i === on; if (inside && !p.inside) { pz.press(i); if (R.sfx) R.sfx('ui'); } p.inside = inside; });
      pz.plates.forEach(p => { p.m.emissiveIntensity = p.on ? 1 : 0; p.rg.material.opacity = p.on ? 0.9 : 0.25; p.rg.scale.setScalar(1); });
      // 靠近（還沒踩上去）：踩下去會翻的那三塊先亮給你看
      if (on < 0) { let near = -1, nd = 2.4; pz.plates.forEach((p, i) => { const d = Math.hypot(P.x - p.x, P.z - p.z); if (d < nd) { nd = d; near = i; } }); if (near >= 0) { const k = 1.12 + 0.1 * Math.sin((run.t || 0) * 8); [near - 1, near, near + 1].forEach(j => { const p = pz.plates[(j + pz.plates.length) % pz.plates.length]; p.rg.scale.setScalar(k); p.rg.material.opacity = 0.95; }); } }
      if (pz.plates.every(p => p.on)) solve(pz);
    });
  };
  // 換樓層：精靈圖（Sprite）R.disposeScene 不會清，自己丟
  const lf = R.loadFloor;
  R.loadFloor = (f, o) => { const F = W.F; if (F && F.puzzles) F.puzzles.forEach(pz => { pz.sprites.forEach(s => { s.material.dispose(); }); (pz.tex || []).forEach(t => t.dispose()); }); return lf(f, o); };
})(window.R);
