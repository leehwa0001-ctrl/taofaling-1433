// 討伐令 1433：遺跡的解謎，再多三種（2026-10-04 作者：解謎種類也沒增加啊）
// 照作者之前說的「希望不用看規則說明就能直接解」：每一種看了就知道要做什麼，做對的時候畫面上馬上看得到。
//  - 光之室：房間一角的水晶射出一道光，中間有兩面（摩爾斯以上三面）鏡子。走到鏡子旁邊轉它（每次轉 90 度），
//    光會跟著轉；讓光一路照到房間另一頭的水晶，寶箱就解開。
//  - 色光之室：紅、綠、藍三盞燈，中間一顆球照出混在一起的顏色；石碑上浮著要的顏色。開關燈讓顏色一樣。
//    摩爾斯以上：燈之間有連桿，開關一盞，右邊那盞也會跟著動。
//  - 注視之室：三尊（摩爾斯以上四尊）石像圍著寶箱，眼睛照出一道光在地上。轉石像（每次 45 度），讓每一尊都看著寶箱。
// （原本還有一種「記憶之室」，main 的 puzzle2.js 同時做了同名的一種——留那邊的，這裡拿掉；檔名也從 puzzle2.js 改成 puzzle3.js。）
// 接在 puzzle.js 的 R.PUZZLE_EXT 上（選房間、石碑、被封住的寶箱、解開、互動都照 puzzle.js）。
// puzzle2.js（記憶之室、時限之室、重石之室）是另外包 R.genFloor 換掉一半的謎題房，種類的名字不能跟這裡重複。放在 puzzle.js 後面。
(function (R) {
  const T = () => THREE, rnd = Math.random, EXT = R.PUZZLE_EXT = R.PUZZLE_EXT || {};
  const ang = (x0, z0, x1, z1) => Math.atan2(x1 - x0, z1 - z0);
  // 地上的一條光：從 (x0,z0) 到 (x1,z1)
  const beam = (scene, col, w, y) => {
    const m = new (T().Mesh)(new (T().BoxGeometry)(1, 1, 1), new (T().MeshBasicMaterial)({ color: col, transparent: true, opacity: 0.75, depthWrite: false }));
    m.material.fog = false; scene.add(m);
    m.to = (x0, z0, x1, z1) => { const L = Math.max(0.05, Math.hypot(x1 - x0, z1 - z0)); m.scale.set(w, w * 0.6, L); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.rotation.y = ang(x0, z0, x1, z1); };
    return m;
  };
  const glow = (K, col, r) => { const m = K.mat(col, col); m.emissiveIntensity = 0.4; m.fog = false; return new (T().Mesh)(new (T().OctahedronGeometry)(r || 0.35, 0), m); };
  const hard = run => (run.grade.lv || 1) >= 3;

  // ---------- 光之室：轉鏡子，把光引到水晶上 ----------
  EXT.mirror = {
    name: '光之室',
    build(pz, K) {
      const n = hard(K.run) ? 3 : 2, sc = K.scene;
      pz.hint = '「把光引到水晶上。」（走到鏡子旁邊轉動它，光會跟著轉。）';
      // 起點、終點在房間的兩頭，鏡子在中間走「之」字
      const pts = [K.spot(-0.8, 0.7, 0.4)];
      const mids = n === 3 ? [[-0.3, -0.05], [0.3, 0.75], [0.75, 0.05]] : [[-0.15, 0.0], [0.45, 0.75]];
      mids.forEach(([fx, fz]) => pts.push(K.spot(fx, fz, 0.4)));
      pts.push(K.spot(0.85, n === 3 ? 0.75 : 0.0, 0.4));
      const node = ([x, z], col, r) => { const g = glow(K, col, r); g.position.set(x, 1.0, z); sc.add(g); const base = new (T().Mesh)(new (T().CylinderGeometry)(0.35, 0.45, 0.6, 8), K.mat('#4A4458')); base.position.set(x, 0.3, z); sc.add(base); R.addBox(x - 0.35, x + 0.35, z - 0.35, z + 0.35, 'deco'); return g; };
      pz.src = node(pts[0], '#FFF0A0', 0.32); pz.src.material.emissiveIntensity = 1.4;
      pz.dst = node(pts[pts.length - 1], '#9AF0FF', 0.36);
      pz.objs = pts.map(([x, z]) => ({ x, z }));
      pz.mirrors = pts.slice(1, -1).map(([x, z], i) => {
        const nx = pts[i + 2], good = ang(x, z, nx[0], nx[1]);
        const g = new (T().Group)(); g.position.set(x, 0, z); sc.add(g);
        const post = new (T().Mesh)(new (T().CylinderGeometry)(0.12, 0.16, 1.1, 6), K.mat('#5A5466')); post.position.y = 0.55; g.add(post);
        const pane = new (T().Mesh)(new (T().BoxGeometry)(0.9, 0.9, 0.08), K.mat('#C8E8F0', '#9AD8F0')); pane.material.emissiveIntensity = 0.35; pane.position.y = 1.15; g.add(pane);
        R.addBox(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 'deco');
        const m = { x, z, g, pane, good, st: 1 + Math.floor(rnd() * 3) };   // 0＝對的方向；一開始一定是錯的
        pz.inter.push({ x, z, r: 1.7, get label() { return '轉動鏡子（第 ' + (pz.mirrors.indexOf(m) + 1) + ' 面）'; }, when: () => !pz.solved, act: () => { m.st = (m.st + 1) % 4; R.sfx && R.sfx('swing'); trace(pz); } });
        return m;
      });
      pz.beams = pts.slice(0, -1).map(() => beam(sc, '#FFF0A0', 0.16, 1.0));
      trace(pz);
    },
    update(pz, dt, P, run) {
      const t = run.t || 0; pz.mirrors.forEach(m => { m.pane.material.emissiveIntensity = 0.3 + (m.lit ? 0.5 : 0) + 0.1 * Math.sin(t * 3 + m.x); });
      pz.dst.rotation.y += dt * (pz.done ? 3 : 0.8); pz.src.rotation.y += dt * 1.5;
    }
  };
  // 光走的路：起點 → 第一面鏡子（一定照得到）→ 鏡子照它對著的方向；對的方向會照到下一面（或終點的水晶）
  const trace = pz => {
    const L = pz.objs; let lit = true;
    pz.beams.forEach((b, i) => {
      const a = L[i], m = pz.mirrors[i - 1];   // 第 i 段從 L[i] 出發；i>0 時 L[i] 是第 i 面鏡子
      if (!lit) { b.visible = false; return; }
      b.visible = true;
      if (i === 0) { b.to(a.x, a.z, L[1].x, L[1].z); return; }
      const dir = m.good + m.st * Math.PI / 2;
      if (m.st === 0) { b.to(a.x, a.z, L[i + 1].x, L[i + 1].z); }
      else { b.to(a.x, a.z, a.x + Math.sin(dir) * 2.6, a.z + Math.cos(dir) * 2.6); lit = false; }
    });
    // 鏡面轉到「照進來的光」和「照出去的方向」中間（看起來真的是在反射）
    pz.mirrors.forEach((m, i) => { m.lit = pz.mirrors.slice(0, i).every(o => o.st === 0); const pv = L[i], inA = ang(pv.x, pv.z, m.x, m.z), dir = m.good + m.st * Math.PI / 2; m.g.rotation.y = Math.atan2(Math.sin(dir) - Math.sin(inA), Math.cos(dir) - Math.cos(inA)); });
    const ok = pz.mirrors.every(m => m.st === 0);
    pz.dst.material.emissiveIntensity = ok ? 1.6 : 0.4;
    if (ok && !pz.done) { pz.done = true; R.fx && R.fx('ring', L[L.length - 1].x, 0.1, L[L.length - 1].z, { r: 1.6, color: '#9AF0FF' }); pz.solveNow(); }
  };

  // ---------- 色光之室：開關紅、綠、藍三盞燈，讓混出來的顏色和石碑上的一樣 ----------
  const RGB = ['#FF4A3A', '#4AE05A', '#4A7AFF'], MIX = c => { const v = [c[0] ? 255 : 0, c[1] ? 255 : 0, c[2] ? 255 : 0]; return '#' + v.map(x => x.toString(16).padStart(2, '0')).join(''); };
  const CNAME = { '#ff0000': '紅', '#00ff00': '綠', '#0000ff': '藍', '#ffff00': '黃', '#ff00ff': '紫', '#00ffff': '青', '#ffffff': '白' };
  EXT.color = {
    name: '色光之室',
    build(pz, K) {
      const sc = K.scene, link = hard(K.run);
      // 要的顏色：簡單的（沒有連桿）六種裡挑；有連桿的時候只挑得到兩盞燈混出來的（黃、紫、青）
      const opts = link ? [[1, 1, 0], [1, 0, 1], [0, 1, 1]] : [[1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 0], [0, 0, 1]];
      pz.want = opts[Math.floor(rnd() * opts.length)];
      pz.hint = '「讓中間那顆球的顏色，和石碑上浮著的一樣。」（紅加綠是黃、紅加藍是紫、綠加藍是青、三盞全開是白。' + (link ? '燈之間有連桿：開關一盞，右邊那盞也會跟著動。' : '') + '）';
      // 石碑上浮著要的顏色
      const want = MIX(pz.want), tg = glow(K, want, 0.32); tg.material.emissiveIntensity = 1.3; tg.position.set(K.tx0, 2.6, K.tz0); sc.add(tg); pz.tg = tg;
      const [ox, oz] = K.spot(0, 0.15, 0.4); pz.orb = glow(K, '#202020', 0.5); pz.orb.position.set(ox, 1.4, oz); sc.add(pz.orb);
      const base = new (T().Mesh)(new (T().CylinderGeometry)(0.4, 0.5, 0.8, 8), K.mat('#4A4458')); base.position.set(ox, 0.4, oz); sc.add(base); R.addBox(ox - 0.4, ox + 0.4, oz - 0.4, oz + 0.4, 'deco');
      pz.objs = [{ x: ox, z: oz }];
      pz.lamps = [-0.55, 0, 0.55].map((fx, i) => {
        const [x, z] = K.spot(fx, 0.75, 0.4), m = K.mat(RGB[i], RGB[i]), lamp = new (T().Mesh)(new (T().SphereGeometry)(0.38, 10, 8), m); m.fog = false; lamp.position.set(x, 1.1, z); sc.add(lamp);
        const post = new (T().Mesh)(new (T().CylinderGeometry)(0.14, 0.2, 0.9, 6), K.mat('#5A5466')); post.position.set(x, 0.45, z); sc.add(post); R.addBox(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 'deco');
        const rg = K.floorRing(x, z, 0.6, 0.78, RGB[i], 0.3);
        const L = { i, x, z, m, rg, on: false };
        pz.inter.push({ x, z, r: 1.7, label: '開關' + ['紅', '綠', '藍'][i] + '燈', when: () => !pz.solved, act: () => { press(pz, i); R.sfx && R.sfx('ui'); } });
        return L;
      });
      pz.lamps.sort((a, b) => a.x - b.x);   // 由左到右（連桿照這個順序）
      pz.link = link;
      if (link) pz.lamps.forEach((a, j) => { const b = pz.lamps[(j + 1) % 3]; if (j === 2) return; const ln = beam(sc, '#C8A0FF', 0.1, 1.1); ln.to(a.x, a.z, b.x, b.z); ln.material.opacity = 0.5; });
      // 一開始：亂開幾盞（不會剛好對）
      pz.lamps.forEach(l => { l.on = rnd() < 0.5; });
      if (link) { pz.lamps.forEach(l => { l.on = false; }); press(pz, Math.floor(rnd() * 3), true); }
      if (same(pz)) press(pz, 0, true);
      paint(pz);
    },
    update(pz, dt, P, run) { pz.tg.rotation.y += dt * 1.2; pz.orb.rotation.y += dt * 0.8; }
  };
  const same = pz => pz.lamps.every(l => !!l.on === !!pz.want[l.i]);
  const press = (pz, i, quiet) => {
    const k = quiet ? i : pz.lamps.findIndex(l => l.i === i), a = pz.lamps[k];
    a.on = !a.on; if (pz.link && k < 2) { const b = pz.lamps[k + 1]; b.on = !b.on; }
    if (!quiet) { paint(pz); if (same(pz)) pz.solveNow(); }
  };
  const paint = pz => {
    const c = [0, 0, 0]; pz.lamps.forEach(l => { if (l.on) c[l.i] = 1; l.m.emissiveIntensity = l.on ? 1.3 : 0.05; l.rg.material.opacity = l.on ? 0.85 : 0.2; });
    const col = MIX(c); pz.orb.material.color.set(c.some(Boolean) ? col : '#202020'); pz.orb.material.emissive.set(col); pz.orb.material.emissiveIntensity = c.some(Boolean) ? 1.2 : 0;
  };

  // ---------- 注視之室：轉石像，讓每一尊都看著寶箱 ----------
  EXT.gaze = {
    name: '注視之室',
    build(pz, K) {
      const sc = K.scene, n = hard(K.run) ? 4 : 3, ch = pz.chest;
      pz.hint = '「讓石像都看著寶箱。」（轉動石像，地上那道眼光會跟著轉。）';
      const pos = n === 4 ? [[-0.75, 0.75], [0.0, 0.8], [0.8, 0.55], [-0.6, -0.1]] : [[-0.7, 0.7], [0.15, 0.8], [0.85, 0.4]];
      pz.objs = [];
      pz.statues = pos.map(([fx, fz]) => {
        const [x, z] = K.spot(fx, fz, 0.4), good = Math.round(ang(x, z, ch.x, ch.z) / (Math.PI / 4)) & 7;
        const g = new (T().Group)(); g.position.set(x, 0, z); sc.add(g);
        const body = new (T().Mesh)(new (T().BoxGeometry)(0.7, 1.2, 0.6), K.mat('#7A7484')); body.position.y = 0.6; g.add(body);
        const head = new (T().Mesh)(new (T().BoxGeometry)(0.5, 0.45, 0.45), K.mat('#8A8496')); head.position.y = 1.45; g.add(head);
        const eyeM = K.mat('#FFD86A', '#FFD86A'); eyeM.emissiveIntensity = 1.2; eyeM.fog = false;
        [-0.12, 0.12].forEach(dx => { const e = new (T().Mesh)(new (T().BoxGeometry)(0.08, 0.06, 0.04), eyeM); e.position.set(dx, 1.5, 0.24); g.add(e); });
        R.addBox(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 'deco'); pz.objs.push({ x, z });
        let st; do { st = Math.floor(rnd() * 8); } while (st === good);
        const s = { x, z, g, good, st, ln: beam(sc, '#FFD86A', 0.14, 0.08), eyeM };
        pz.inter.push({ x, z, r: 1.7, label: '轉動石像', when: () => !pz.solved, act: () => { s.st = (s.st + 1) & 7; R.sfx && R.sfx('swing'); look(pz); } });
        return s;
      });
      look(pz);
    },
    update(pz, dt, P, run) { const t = run.t || 0; pz.statues.forEach(s => { s.ln.material.opacity = (s.st === s.good ? 0.85 : 0.45) + 0.1 * Math.sin(t * 4 + s.x); }); }
  };
  const look = pz => {
    const ch = pz.chest;
    pz.statues.forEach(s => {
      const a = s.st * Math.PI / 4; s.g.rotation.y = a;
      if (s.st === s.good) { s.ln.to(s.x, s.z, ch.x, ch.z); s.ln.material.color.set('#FFE89A'); }
      else { s.ln.to(s.x + Math.sin(a) * 0.5, s.z + Math.cos(a) * 0.5, s.x + Math.sin(a) * 2.6, s.z + Math.cos(a) * 2.6); s.ln.material.color.set('#C8A040'); }
    });
    if (pz.statues.every(s => s.st === s.good)) pz.solveNow();
  };

  // 解開：puzzle.js 給的 solve（build 的時候記下來）
  Object.keys(EXT).forEach(k => { const b = EXT[k].build; EXT[k].build = (pz, K) => { pz.solveNow = () => { if (!pz.solved) K.solve(); }; pz.tex = pz.tex || []; return b(pz, K); }; });
})(window.R);
