// 遺跡生物的特性（作者 2026-10-04：怪物有些還是沒什麼特色，是有重複到的）
// 同一種生物也不一定一樣：有些是帶著「特性」的強化個體（像《暗黑破壞神》的精英），名字前面有〔特性〕、腳下有一圈特性顏色的光，
// 打倒給比較多的經驗和東西。十二種特性：
//   迅捷（快、出手頻）、堅甲（受到的傷害少四成，暴擊照算）、狂怒（血剩四成以下變兇變快）、分裂（倒下時分成兩隻小的）、
//   爆裂（倒下後一會兒炸開，先亮圈）、吸血（打到人會回血）、冰霜（靠近的人變慢）、閃現（隔一陣子閃到你身邊）、
//   護盾（每隔一陣子罩上護盾，兩秒內幾乎打不動）、喚群（叫小隻的同伴來）、毒霧（走過的地方留下毒）、荊棘（打牠會被反彈一點傷害）。
// - 誰會有：阿彌勒級以上，一般的遺跡生物 6%（越深越多，最多 20%）有一到兩種；變種「荒」三成、「獰」五成五有一種，「淵」一定有兩種。
//   領主體、佩特拉核心、人、狩獵場的野獸、觀光遺跡、哈米莉亞級、特性叫出來的小隻不會有。
// 放在 monsters7.js 後面。
(function (R) {
  const W = () => R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const floorAt = (x, z) => (R.safeLand ? R.safeLand(x, z) : R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);   // ruinsafe.js：落點要是空地、看得到（2026-10-08 三羽鴉瞬移出牆外）
  const AFX = {
    swift: { n: '迅捷', c: '#9AE0FF' }, armored: { n: '堅甲', c: '#C8C0A8' }, enrage: { n: '狂怒', c: '#FF5A4A' }, splitter: { n: '分裂', c: '#B8E07A' },
    volatile: { n: '爆裂', c: '#FF9A3A' }, vampiric: { n: '吸血', c: '#C8204A' }, frost: { n: '冰霜', c: '#BFE8FF' }, blink: { n: '閃現', c: '#B88AFF' },
    shield: { n: '護盾', c: '#F0F4FF' }, summoner: { n: '喚群', c: '#8AE0B0' }, toxic: { n: '毒霧', c: '#7AC83A' }, thorns: { n: '荊棘', c: '#C8A06A' }
  };
  const KEYS = Object.keys(AFX);
  R.MON_AFFIX = AFX;
  const eligible = (e, o) => { const run = W().run; if (!run || !e || !e.def || o && (o.noAffix || o.human || o.packed)) return false; if (e.def.boss || e.def.human || e.fake || e.id === 'petra') return false; if (!run.grade || (run.grade.lv || 1) < 2 || run.grade.id === 'hunt' || (run.site && run.site.id === 'kanko')) return false; return true; };
  const tier = e => { const m = /_v(\d)$/.exec(e.id); return m ? +m[1] : 0; };
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se0(id, x, z, room, o); if (!eligible(e, o)) return e;
    const run = W().run, t = tier(e), dep = run.floor || 0;
    let n = 0;
    if (t === 3) n = 2; else if (t === 2) n = rnd() < 0.55 ? 1 : 0; else if (t === 1) n = rnd() < 0.3 ? 1 : 0;
    else if (rnd() < Math.min(0.2, 0.06 + 0.012 * dep)) n = rnd() < 0.3 + 0.03 * dep ? 2 : 1;
    if (!n) return e;
    const list = KEYS.slice().sort(() => rnd() - 0.5).slice(0, n);
    // 不合的組合：會自己隱形、鑽地的生物不給護盾、閃現（牠們有自己的一套）
    const ai = e.def.ai || ''; if (/burrow|sinkhole|wellhand|wyrm|hooktail|dropper|tentacle|sentry|turret/.test(ai)) for (let i = 0; i < list.length; i++) if (list[i] === 'blink' || list[i] === 'shield') list[i] = 'armored';
    apply(e, [...new Set(list)]);
    return e;
  };
  const apply = (e, list) => {
    e.afx = {}; list.forEach(k => { e.afx[k] = 1; });
    const base = e.def.name.replace(/^〔[^〕]*〕/, '');
    e.def = Object.assign({}, e.def, { name: '〔' + list.map(k => AFX[k].n).join('／') + '〕' + base, elite: 1, xp: Math.round((e.def.xp || 5) * (1.6 + 0.4 * list.length)) });
    e.hp *= 1.35; e.hpMax *= 1.35;
    if (e.afx.swift) e.speed *= 1.45;
    // 腳下的光圈（吃霧：跟名牌一樣，霧裡藏起來，不然 MeshBasic 再亮還是會從霧裡透出來）
    try { const TH = THREE, ring = new TH.Mesh(new TH.RingGeometry(0.55 * (e.def.size || 1), 0.75 * (e.def.size || 1), 20), new TH.MeshBasicMaterial({ color: AFX[list[0]].c, transparent: true, opacity: 0.55, side: TH.DoubleSide, depthWrite: false, fog: true })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; e.m.g.add(ring); e.afxRing = ring; } catch (err) { }
  };
  R.applyMonAffix = (e, list) => { if (e && !e.afx) apply(e, list || [KEYS[Math.floor(rnd() * KEYS.length)]]); };   // 別的檔案用（ruinvar.js 的寂靜層）
  // ---------- 每一格：迅捷出手快、狂怒、冰霜、閃現、護盾、喚群、毒霧 ----------
  let acc = 0;
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(), run = w.run, P = w.P; if (!run || run.done || !P || !w.enemies) return;
    acc += dt;
    w.enemies.forEach(e => {
      if (!e.afx || e.dead || e.mirror) return; const A = e.afx;
      if (e.afxRing) { const hide = R.fogHides && R.fogHides(e.x, e.z); e.afxRing.visible = !hide; if (!hide) { e.afxRing.rotation.z += dt * 1.5; e.afxRing.material.opacity = 0.4 + 0.2 * Math.sin(run.t * 4); } }
      if (!e.aggro || e.dormant) return;
      const d = dist(e, P);
      if (A.swift) e.cd -= dt * 0.4;
      if (A.enrage && !e.raged && e.hp < e.hpMax * 0.4) { e.raged = 1; e.dmg *= 1.5; e.speed *= 1.3; R.num && R.num(e.x, 2.2, e.z, '狂怒', 'crit'); R.fx('ring', e.x, 0.2, e.z, { r: 1.6, color: '#FF5A4A' }); if (e.afxRing) e.afxRing.material.color.set('#FF3A2A'); }
      if (A.frost && d < 3.2 && !P.dead) P.slowT = Math.max(P.slowT || 0, 0.3);
      if (A.blink) { e.bk = (e.bk == null ? 4 + rnd() * 2 : e.bk) - dt; if (e.bk <= 0 && d < 14) { e.bk = 5 + rnd() * 2; const a = rnd() * Math.PI * 2, [x, z] = floorAt(P.x + Math.sin(a) * 2.6, P.z + Math.cos(a) * 2.6); R.fx('blink', e.x, 1, e.z); e.x = x; e.z = z; R.fx('blink', x, 1, z); e.cd = Math.min(e.cd, 0.3); } }
      if (A.shield) { e.sh = (e.sh == null ? 3 : e.sh) - dt; if (e.sh <= 0) { e.sh = 7; e.shieldT = 2; R.fx('ring', e.x, 1, e.z, { r: 1.2 * (e.def.size || 1), color: '#F0F4FF' }); } if (e.shieldT > 0) { e.shieldT -= dt; if (rnd() < 0.2) R.fx('poof', e.x, 1, e.z, { color: '#F0F4FF', n: 1 }); } }
      if (A.summoner) { e.sm = (e.sm == null ? 4 : e.sm) - dt; if (e.sm <= 0 && d < 12) { e.sm = 9; const pool = (run.grade.pool || []).filter(k => R.ENEMIES[k] && (R.ENEMIES[k].hp || 99) < 60); const id = pool.length ? pick(pool) : 'kodama'; for (let i = 0; i < 2; i++) { const [x, z] = floorAt(e.x + rnd() * 3 - 1.5, e.z + rnd() * 3 - 1.5); const m = R.spawnEnemy(id, x, z, e.room, { aggro: true, hpMul: 0.4, noAffix: true }); if (m) R.fx('spawn', x, 0.1, z, { color: '#8AE0B0' }); } R.num && R.num(e.x, 2.2, e.z, '喚群', ''); } }
      if (A.toxic) { e.tx = (e.tx || 0) - dt; if (e.tx <= 0) { e.tx = 0.7; const zn = R.addZone({ kind: 'caltrop', x: e.x, z: e.z, r: 0.9, life: 4, dmg: e.dmg * 0.18 }); if (zn && zn.mesh) zn.mesh.material.color.set('#7AC83A'); } }
    });
  };
  // ---------- 受到傷害：堅甲、護盾、荊棘 ----------
  const ed0 = R.enemyDefend;
  R.enemyDefend = (e, dmg, o, crit) => {
    dmg = ed0 ? ed0(e, dmg, o, crit) : dmg; if (!e || !e.afx) return dmg;
    if (e.afx.armored && !crit) dmg *= 0.6;
    if (e.shieldT > 0) { dmg *= 0.1; if (rnd() < 0.3) R.num && R.num(e.x, 2, e.z, '護盾', ''); }
    if (e.afx.thorns) { const P = W().P, run = W().run; if (P && !P.dead && run && (e.thT || 0) < run.t) { e.thT = run.t + 0.35; R.hurtPlayer(Math.max(1, dmg * 0.05), e); } }
    return dmg;
  };
  // ---------- 吸血 ----------
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (dmg, src, o) => { const P = W().P, h = P ? P.hp : 0, r = hp0(dmg, src, o); if (src && src.afx && src.afx.vampiric && P && P.hp < h && !src.dead) { src.hp = Math.min(src.hpMax, src.hp + (h - P.hp) * 0.6); R.fx('poof', src.x, 1, src.z, { color: '#C8204A', n: 4 }); } return r; };
  // ---------- 倒下：分裂、爆裂、多給東西 ----------
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by); if (!was || !e.afx || !W().run) return r;
    const A = e.afx, x = e.x, z = e.z;
    if (A.splitter) for (let i = 0; i < 2; i++) { const [px, pz] = floorAt(x + rnd() * 2 - 1, z + rnd() * 2 - 1); const m = R.spawnEnemy(e.id.replace(/_v\d$/, ''), px, pz, e.room, { aggro: true, hpMul: 0.3, noAffix: true }); if (m && m.m && m.m.g) m.m.g.scale.multiplyScalar(0.7); }
    if (A.volatile) { R.fx('mark', x, 0, z, { r: 2.6, t: 0.9 }); later(() => { R.fx('boom', x, 0.4, z, { r: 2.6, color: '#FF9A3A' }); const P = W().P; if (P && !P.dead && Math.hypot(P.x - x, P.z - z) < 2.6 && !(P.iframe > 0)) R.hurtPlayer(e.dmg * 1.6, null); (W().allies || []).forEach(a => { if (!a.downed && Math.hypot(a.x - x, a.z - z) < 2.6) R.hurtAlly(a, e.dmg * 1.2, null); }); R.shake && R.shake(0.3); }, 900); }
    if (rnd() < 0.6) R.dropMat('crystal', 1 + (rnd() < 0.4 ? 1 : 0), x, z);
    if (rnd() < 0.1 && R.rollChest && R.dropItem) { /* 2026-10-04 作者：掉落太多（兩成→一成） */ const l = R.rollChest(Math.max(0, (W().run.grade.lv || 1) - 1), W().run.floor, R.S.cls, 0).find(q => q.item); if (l) R.dropItem(l.item, x + 0.6, z); }
    return r;
  };
})(window.R);
