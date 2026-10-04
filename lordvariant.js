// 領主體的異變（2026-10-05 作者：幫我設計所有領主體的變種，而且要更強，更多變化的設計，並且可以做紅武，血量更厚，就像真正的 boss 一樣）
// - 克森特級以上，領主體有機會以「異變」的樣子出現（克森特級 25%、卡索級 45%，最深的那幾層再 +10%）：
//   名字後面多一個異變的名號，身體大三成、染成異變的顏色、腳下一圈紅光；生命 ×4、傷害 ×1.4、護甲 +10%。
// - 三個形態：生命掉到 66%、33% 的時候「異變」——1.5 秒不會受傷、震開周圍、橫幅寫第幾形態；
//   第二形態多一招、第三形態再多一招（每一種領主體自己的兩招，見下面 V），而且原本的招式出得更快、移動更快。
// - 打倒：掉「異變核心」2 個（卡索級 3 個）、一個魔力核心，15% 直接掉一件神話（紅武）；第一次打倒那一種的異變，多給 2 個異變核心。
// - 紅武：鐵匠鋪的製作多一條「異變（紅武）」——異變核心 ×4、高純度魔力水晶 ×2、3000 費拉，做出來一定是神話（紅色），
//   物品等級跟著現在的職業等級（至少 12）。
// - 管理員面板生領主體的時候勾「異變」就是異變的（R.lordVariant(e)）。
// 放在 lords.js、lordplus.js、lordfloor.js、region.js、windelder.js 後面，net2.js 前面。
(function (R) {
  const W = () => R.W, S = () => R.S, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const isLord = d => !!(d && /^領主體/.test(d.name || ''));
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const targets = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed)).filter(t => t && !t.dead); };
  const hitT = (t, dmg, e, o) => (t.ally ? R.hurtAlly(t, dmg, e) : R.hurtPlayer(dmg, e, o));
  const floorAt = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const guest = () => { const run = W().run; return !!(run && run.coop && !run.coop.solo && !run.coop.host); };

  // ---------- 招式的積木 ----------
  const hitAt = (e, x, z, r, k, o) => targets().forEach(t => { if (Math.hypot(t.x - x, t.z - z) < r && !(t.iframe > 0)) { hitT(t, e.dmg * k, e, { knock: o && o.knock }); if (o && o.slow && !t.ally) t.slowT = Math.max(t.slowT || 0, o.slow); if (o && o.stun && !t.ally) t.knockT = Math.max(t.knockT || 0, o.stun); if (o && o.dbf && !t.ally && R.playerDebuff) R.playerDebuff(o.dbf); } });
  const blast = (e, x, z, r, t, k, col, o) => { R.fx('mark', x, 0, z, { r, t, color: col }); later(() => { if (e.dead) return; R.fx('boom', x, 0.4, z, { r, color: col }); hitAt(e, x, z, r, k, o); if (o && o.zone) { const zn = R.addZone({ kind: 'lava', x, z, r: r * 0.8, life: o.zone, dmg: e.dmg * 0.08 }); if (zn && zn.mesh) zn.mesh.material.color.set(col); } }, t * 1000); };
  const B = {
    // 一圈一圈往外：牢籠、骨柱
    rings: (e, o) => { for (let w = 0; w < (o.n || 3); w++) later(() => { if (e.dead) return; const r = 2.5 + w * 2.6, m = 6 + w * 4; for (let i = 0; i < m; i++) { const a = i / m * Math.PI * 2 + w * 0.3, [x, z] = floorAt(e.x + Math.sin(a) * r, e.z + Math.cos(a) * r); blast(e, x, z, 1.3, 0.7, o.k || 1.2, o.col, o); } }, w * (o.gap || 650)); },
    // 目標周圍的方格：每一格輪流冒出來（踩縫隙）
    grid: (e, P, o) => { const s = o.step || 2.6, n = o.n || 2; for (let pass = 0; pass < 2; pass++) later(() => { if (e.dead) return; for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { if ((i + j + pass) % 2) continue; const [x, z] = floorAt(P.x + i * s, P.z + j * s); blast(e, x, z, s * 0.48, 0.8, o.k || 1.3, o.col, o); } }, pass * 1200); },
    // 從天上落下：每個目標附近好幾顆
    rain: (e, o) => { targets().forEach(t => { for (let i = 0; i < (o.n || 5); i++) later(() => { if (e.dead) return; const a = rnd() * Math.PI * 2, d = i === 0 ? 0 : 1 + rnd() * 4, [x, z] = floorAt(t.x + Math.sin(a) * d, t.z + Math.cos(a) * d); blast(e, x, z, o.r || 1.8, 0.85, o.k || 1.4, o.col, o); }, i * (o.gap || 260)); }); },
    // 鑽下去，從目標腳下冒出來，連續幾次
    dive: (e, P, o) => { e.invuln = true; e.vBusy = (o.n || 3) * 0.9 + 0.6; if (e.m && e.m.g) e.m.g.visible = false; for (let i = 0; i < (o.n || 3); i++) later(() => { if (e.dead) return; const Q = W().P, [x, z] = floorAt(Q.x, Q.z); R.fx('mark', x, 0, z, { r: o.r || 2.6, t: 0.7, color: o.col }); later(() => { if (e.dead) return; e.x = x; e.z = z; if (e.m && e.m.g) { e.m.g.position.x = x; e.m.g.position.z = z; } R.fx('boom', x, 0.4, z, { r: o.r || 2.6, color: o.col }); R.shake && R.shake(0.35); hitAt(e, x, z, o.r || 2.6, o.k || 1.8, { knock: 0.5 }); }, 700); }, i * 900); later(() => { e.invuln = false; if (e.m && e.m.g) e.m.g.visible = true; }, (o.n || 3) * 900 + 300); },
    // 連續突進：每一下先畫線
    dashes: (e, o) => { let t0 = 0; for (let i = 0; i < (o.n || 4); i++) { later(() => { if (e.dead) return; const Q = W().P, a = angTo(e, Q), len = Math.min(14, dist(e, Q) + 4); R.fx('aim', e.x, 0.3, e.z, { a, len, t: 0.55 }); later(() => { if (e.dead) return; const x0 = e.x, z0 = e.z; let [x1, z1] = floorAt(e.x + Math.sin(a) * len, e.z + Math.cos(a) * len); R.fx('slash', x0, 1.2, z0, { a, len }); targets().forEach(t => { const dx = t.x - x0, dz = t.z - z0, al = dx * Math.sin(a) + dz * Math.cos(a), sd = Math.abs(dx * Math.cos(a) - dz * Math.sin(a)); if (al > -0.5 && al < len && sd < 1.3 && !(t.iframe > 0)) hitT(t, e.dmg * (o.k || 1.5), e, { knock: 0.5 }); }); e.x = x1; e.z = z1; if (e.m && e.m.g) { e.m.g.position.x = x1; e.m.g.position.z = z1; } }, 550); }, t0); t0 += o.gap || 800; } e.vBusy = t0 / 1000 + 0.6; },
    // 旋轉的放射彈幕
    spiral: (e, o) => { for (let w = 0; w < (o.waves || 6); w++) later(() => { if (e.dead) return; const n = o.n || 10; for (let i = 0; i < n; i++) R.fire({ kind: o.kind || 'eorb', owner: 'e', x: e.x, z: e.z, a: i / n * Math.PI * 2 + w * (o.rot || 0.25), speed: o.speed || 8, dmg: e.dmg * (o.k || 0.7), life: 2.6, src: e }); }, w * (o.gap || 300)); },
    // 吸過去
    pull: (e, o) => { const w = W(), run = w.run; let t = o.t || 2.5; R.fx('ring', e.x, 0.1, e.z, { r: o.r || 10, color: o.col }); if (!o.quiet) R.toast && R.toast(e.def.name + '在吸！往外跑、翻滾。', o.col || '#FF6A6A');
      w.dyn.push(dt => { if (W().run !== run || e.dead) return false; t -= dt; targets().forEach(q => { const dd = dist(q, e); if (dd < (o.r || 10) && dd > 1.6 && !(q.iframe > 0) && !q.air) { const k = Math.min(dd - 1.6, (o.s || 3.2) * dt); q.x -= (q.x - e.x) / dd * k; q.z -= (q.z - e.z) / dd * k; R.collide(q, 0.42); } }); if (t <= 0) { if (o.end) blast(e, e.x, e.z, o.end, 0.6, o.k || 2, o.col, { knock: 0.6 }); return false; } return true; }); },
    // 叫手下
    summon: (e, o) => { const ids = (o.ids || []).filter(id => R.ENEMIES[id]); if (!ids.length || guest()) return; const rm = R.roomOf ? R.roomOf(e) : null; for (let i = 0; i < (o.n || 3); i++) { const [x, z] = rm ? R.roomPoint(rm, {}) : floorAt(e.x + rnd() * 4 - 2, e.z + rnd() * 4 - 2); const m = R.spawnEnemy(pick(ids), x, z, e.room, { aggro: true }); if (m) { m.dormant = false; m.aggro = true; R.fx('spawn', x, 0.1, z, { color: o.col }); } } },
    // 追著目標的光束：先畫線跟著，再射
    beams: (e, o) => { const L = []; for (let i = 0; i < (o.n || 3); i++) later(() => { if (e.dead) return; const Q = pick(targets()); if (!Q) return; const a = angTo(e, Q) + (rnd() - 0.5) * 0.3, len = o.len || 16; R.fx('aim', e.x, 0.3, e.z, { a, len, t: 0.8 }); later(() => { if (e.dead) return; R.fx('slash', e.x, 1.4, e.z, { a, len }); targets().forEach(t => { const dx = t.x - e.x, dz = t.z - e.z, al = dx * Math.sin(a) + dz * Math.cos(a), sd = Math.abs(dx * Math.cos(a) - dz * Math.sin(a)); if (al > 0 && al < len && sd < 1.1 && !(t.iframe > 0)) { hitT(t, e.dmg * (o.k || 1.6), e, {}); if (o.dbf && !t.ally && R.playerDebuff) R.playerDebuff(o.dbf); } }); }, 800); }, i * (o.gap || 450)); },
    // 走過的地方留下危險的地面
    trail: (e, o) => { const w = W(), run = w.run; let t = o.t || 5, tick = 0; w.dyn.push(dt => { if (W().run !== run || e.dead) return false; t -= dt; tick -= dt; if (tick <= 0) { tick = 0.35; const zn = R.addZone({ kind: o.kind || 'lava', x: e.x, z: e.z, r: 1.4, life: o.life || 7, dmg: e.dmg * 0.1 }); if (zn && zn.mesh && o.col) zn.mesh.material.color.set(o.col); } return t > 0; }); e.vRush = o.t || 5; },
    // 連續落雷：打最近的目標
    storm: (e, o) => { for (let i = 0; i < (o.n || 8); i++) later(() => { if (e.dead) return; const Q = pick(targets()); if (!Q) return; const [x, z] = floorAt(Q.x + (rnd() - 0.5) * 2, Q.z + (rnd() - 0.5) * 2); blast(e, x, z, 1.5, 0.55, o.k || 1.2, o.col || '#FFE04A', { stun: 0.4 }); }, i * (o.gap || 380)); },
    // 甜甜圈：中間、外圈都打，只有中間那一圈安全
    donut: (e, o) => { const r0 = o.safe0 || 3, r1 = o.safe1 || 5.5, rr = o.r || 9; R.fx('mark', e.x, 0, e.z, { r: r0, t: 1.3, color: o.col }); R.fx('mark', e.x, 0, e.z, { r: rr, t: 1.3, color: o.col }); R.toast && R.toast('站到中間那一圈！', o.col || '#9AD8FF'); later(() => { if (e.dead) return; R.fx('ring', e.x, 0.1, e.z, { r: rr, color: o.col }); R.fx('boom', e.x, 0.4, e.z, { r: r0, color: o.col }); targets().forEach(t => { const d = dist(t, e); if ((d < r0 || (d > r1 && d < rr)) && !(t.iframe > 0)) { hitT(t, e.dmg * (o.k || 2), e, { knock: 0.4 }); if (o.stun && !t.ally) t.knockT = Math.max(t.knockT || 0, o.stun); } }); }, 1300); }
  };

  // ---------- 每一種領主體的異變 ----------
  // [異變名號, 顏色, 第二形態的招, 第三形態的招, 手下]
  const V = {
    tsuchigumo: ['深淵織母', '#7A3AFF', e => B.rings(e, { n: 3, col: '#B08AFF', k: 1.1, slow: 1.5 }), e => { B.summon(e, { ids: ['thunderspider', 'starspider'], n: 4, col: '#7A3AFF' }); B.rain(e, { n: 4, col: '#7AFF6A', k: 1, dbf: 'heal' }); }],
    omukade: ['噬骨千足', '#C83A3A', (e, P) => B.dive(e, P, { n: 3, r: 2.8, col: '#C86A3A', k: 1.8 }), e => B.trail(e, { t: 5, col: '#8ACF3A', kind: 'lava', life: 6 })],
    gashadokuro: ['萬骸之王', '#E8E0CC', e => B.rings(e, { n: 4, col: '#E8E0CC', k: 1.3, gap: 550 }), e => B.rain(e, { n: 5, r: 2.8, col: '#B8AE98', k: 1.8, gap: 450, knock: 0.6, dbf: 'armor' })],
    frostdeer: ['永凍之冠', '#7AD8FF', e => B.donut(e, { col: '#9AD8FF', k: 2, stun: 1.5 }), e => B.spiral(e, { waves: 8, n: 12, kind: 'cold', speed: 8, rot: 0.2, k: 0.6 })],
    lavajaw: ['熔獄之顎', '#FF5A1A', (e, P) => B.grid(e, P, { col: '#FF5A1A', k: 1.4, zone: 6 }), e => B.rain(e, { n: 7, r: 2, col: '#FF7A3A', k: 1.5, zone: 8 })],
    sandwhale: ['沙海吞天', '#D8B86A', e => B.pull(e, { r: 11, t: 3, s: 3.4, end: 4, col: '#D8B86A', k: 2.2 }), (e, P) => B.dive(e, P, { n: 4, r: 3.2, col: '#C8A86A', k: 1.9 })],
    kraken: ['深淵之主', '#6A2AAA', e => { for (let i = 0; i < 2; i++) later(() => { if (e.dead) return; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + i * 0.4; R.fx('aim', e.x, 0.3, e.z, { a, len: 11, t: 0.8 }); later(() => { if (e.dead) return; R.fx('slash', e.x, 1, e.z, { a, len: 11 }); targets().forEach(t => { const dx = t.x - e.x, dz = t.z - e.z, al = dx * Math.sin(a) + dz * Math.cos(a), sd = Math.abs(dx * Math.cos(a) - dz * Math.sin(a)); if (al > 0 && al < 11 && sd < 1 && !(t.iframe > 0)) hitT(t, e.dmg * 1.3, e, {}); }); }, 800); } }, i * 1100); }, e => { B.summon(e, { ids: ['isonade', 'kappa'], n: 3, col: '#6A2AAA' }); B.rain(e, { n: 4, r: 2.2, col: '#2A1A3A', k: 1, dbf: 'atk', zone: 6 }); }],
    faceforest: ['千面之森', '#3A8A2E', e => B.beams(e, { n: 5, k: 1.6, gap: 380, dbf: 'atk' }), (e, P) => B.grid(e, P, { col: '#5A8A3A', k: 1.5, n: 3, step: 2.4 })],
    bonewyvern: ['亡骸天災', '#7FD8FF', e => B.dashes(e, { n: 3, k: 1.6, gap: 900 }), e => { B.spiral(e, { waves: 5, n: 9, kind: 'eorb', speed: 9, rot: 0.35, k: 0.7 }); B.rain(e, { n: 4, col: '#D8D0C0', k: 1.2 }); }],
    thunderape: ['萬雷之王', '#FFE04A', (e, P) => B.grid(e, P, { col: '#FFE04A', k: 1.4, stun: 0.6 }), e => B.storm(e, { n: 12, gap: 330, k: 1.2 })],
    windelder: ['天狂風神', '#FF6A8A', e => { const a0 = rnd() * Math.PI; [0, Math.PI / 2].forEach(off => { const a = a0 + off; [a, a + Math.PI].forEach(b => { R.fx('aim', e.x, 0.3, e.z, { a: b, len: 14, t: 0.75 }); later(() => { if (e.dead) return; R.fx('slash', e.x, 1.2, e.z, { a: b, len: 14 }); targets().forEach(t => { const dx = t.x - e.x, dz = t.z - e.z, al = dx * Math.sin(b) + dz * Math.cos(b), sd = Math.abs(dx * Math.cos(b) - dz * Math.sin(b)); if (al > 0 && al < 14 && sd < 1.2 && !(t.iframe > 0)) hitT(t, e.dmg * 1.6, e, { knock: 0.6 }); }); }, 750); }); }); }, e => B.pull(e, { r: 12, t: 3.5, s: 2.6, end: 3.5, col: '#FF8AAA', k: 1.8 })],
    spikewolf: ['千棘狼王', '#8A1A2A', e => B.summon(e, { ids: ['okuriinu', 'bonehound'], n: 4, col: '#8A1A2A' }), e => { B.spiral(e, { waves: 4, n: 16, kind: 'eorb', speed: 11, rot: 0.2, k: 0.65 }); B.dashes(e, { n: 2, k: 1.8, gap: 900 }); }],
    muhyo: ['魔王之鎧', '#B04AFF', e => B.dashes(e, { n: 5, k: 1.5, gap: 700 }), e => { B.summon(e, { ids: ['ashigaru'], n: 4, col: '#B04AFF' }); B.donut(e, { col: '#B04AFF', k: 2.2, safe0: 3.2, safe1: 6, r: 10 }); }]
  };
  R.LORD_VARIANTS = V;

  // ---------- 變成異變 ----------
  const tint = (e, col) => {
    try {
      const TH = window.THREE; if (!e.m || !e.m.g || !TH) return;
      e.m.g.scale.multiplyScalar(1.3);
      const sp = e.m.sp; if (sp && sp.mat) { if (sp.mat.color) sp.mat.color.lerp(new TH.Color(col), 0.35); }
      const ring = new TH.Mesh(new TH.RingGeometry(1.6, 2.1, 32), new TH.MeshBasicMaterial({ color: '#FF2A3A', transparent: true, opacity: 0.55, depthWrite: false, side: TH.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; e.m.g.add(ring); e.vRing = ring;
    } catch (err) { }
  };
  R.lordVariant = e => {
    if (!e || e.variant || !V[e.id]) return e;
    const v = V[e.id];
    e.variant = { title: v[0], col: v[1], phase: 1, t: 5 };
    e.def = Object.assign({}, e.def, { name: e.def.name + '【' + v[0] + '】' });
    e.hpMax *= 4; e.hp = e.hpMax; e.dmg *= 1.4; e.def.armor = Math.min(0.55, (e.def.armor || 0) + 0.1);
    tint(e, v[1]);
    later(() => { R.banner && R.banner(e.def.name, '異變的領主體——生命厚得多，血掉到三分之二、三分之一會再異變'); R.shake && R.shake(0.4); }, 300);
    return e;
  };
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se0(id, x, z, room, o);
    try {
      const run = W().run;
      if (e && V[id] && run && run.grade && !(o && (o.noVariant || o.quiet === 'mirror')) && !guest() && !e.mirror) {
        const g = run.grade, deep = run.floors > 1 && run.floor >= run.floors * 0.7;
        const ch = g.id === 'kaso' ? 0.45 : (g.lv || 0) >= 4 ? 0.25 : 0;
        if (ch && rnd() < ch + (deep ? 0.1 : 0)) R.lordVariant(e);
      }
    } catch (err) { console.warn('[lordvariant]', err); }
    return e;
  };
  // ---------- 形態、招式 ----------
  const phaseShift = (e, ph) => {
    e.variant.phase = ph; e.invuln = true; e.vBusy = 1.5;
    R.banner && R.banner(e.def.name, ph === 2 ? '第二形態：異變加深，多了新的招式' : '第三形態：完全異變，出招更快');
    R.fx('ring', e.x, 0.1, e.z, { r: 6, color: e.variant.col }); R.fx('boom', e.x, 0.6, e.z, { r: 3, color: e.variant.col }); R.shake && R.shake(0.5);
    targets().forEach(t => { const d = dist(t, e); if (d < 6 && d > 0.1) { hitT(t, e.dmg * 0.6, e, { knock: 0.6 }); if (!t.ally) { const k = Math.min(3, 6 - d); t.x += (t.x - e.x) / d * k; t.z += (t.z - e.z) / d * k; R.collide(t, 0.42); } } });
    if (e.st) { e.st.stun = 0; e.st.root = 0; e.st.slow = 0; }
    if (ph === 3) e.speed *= 1.2;
    later(() => { e.invuln = false; }, 1500);
    e.variant.t = 1.6;
  };
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), w = W();
    if (!w.run || w.paused || guest()) return r;
    try {
      (w.enemies || []).forEach(e => {
        const v = e.variant; if (!v || e.dead) return;
        if (e.vRing) e.vRing.material.opacity = 0.35 + 0.25 * Math.sin((w.run.t || 0) * 4);
        const f = e.hp / e.hpMax;
        if (v.phase === 1 && f < 0.66) phaseShift(e, 2); else if (v.phase === 2 && f < 0.33) phaseShift(e, 3);
        if (e.vBusy > 0) { e.vBusy -= dt; return; }
        if (v.phase >= 3) e.pat = (e.pat || 0) - dt * 0.5;   // 原本的招式出得更快
        if (v.phase < 2 || !e.aggro) return;
        v.t -= dt; if (v.t > 0) return;
        const P = e.tgt && !e.tgt.dead ? e.tgt : w.P; if (!P || dist(P, e) > 22) { v.t = 1; return; }
        const moves = V[e.id], list = v.phase >= 3 ? [moves[2], moves[3]] : [moves[2]];
        v.t = v.phase >= 3 ? 5 + rnd() * 2 : 8 + rnd() * 2;
        pick(list)(e, P);
      });
    } catch (err) { console.warn('[lordvariant]', err); }
    return r;
  };
  // ---------- 打倒：異變核心、紅武 ----------
  R.MATS.mutacore = { name: '異變核心', color: '#FF3A5A', value: 300, desc: '異變的領主體體內的核心，還在發燙。鐵匠鋪可以拿來做神話（紅色）的裝備。' };
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead && (e.variant || (e.netName && /【/.test(e.netName))), r = ke0(e, by);   // 隊員那邊的鏡像：照房主給的名字認
    try {
      if (was && e.dead && W().run) {
        const s = S(), run = W().run; s.mutaGot = s.mutaGot || {}; const first = !s.mutaGot[e.id]; s.mutaGot[e.id] = (s.mutaGot[e.id] || 0) + 1;
        const n = (run.grade.id === 'kaso' ? 3 : 2) + (first ? 2 : 0);
        R.dropMat('mutacore', n, e.x, e.z); R.dropMat('core', 1, e.x + 1, e.z);
        if (rnd() < 0.15) { const kinds = Object.keys(R.WEAPONS), it = R.makeItem({ kind: 'weapon', base: pick(kinds), ilvl: Math.max(12, (s.classes[s.cls] || {}).lv || 12), rarity: 5 }); if (it) R.dropItem(it, e.x, e.z + 1); }
        R.banner && R.banner('異變討伐', e.def.name + '倒下了' + (first ? '（第一次：異變核心多 2 個）' : ''));
      }
    } catch (err) { console.warn('[lordvariant]', err); }
    return r;
  };
  if (R.RECIPES) R.RECIPES.push({ tier: 3, name: '異變（紅武）', get ilvl() { const s = S(); return Math.max(12, s && s.classes && s.classes[s.cls] ? s.classes[s.cls].lv : 12); }, mats: { mutacore: 4, purecry: 2 }, gold: 3000, weights: [0, 0, 0, 0, 0, 1], note: '異變核心做的：一定是神話（紅色）。' });
})(window.R);
