// 每一層都有休息的地方（作者 2026-10-03：休息區應該每一層都有）
// - 第 0 層的休息區照舊（ruinplus.js：營火回滿、公會調查點補給）。其他每一層的入口房間多一個小營地：
//   營火、鋪在地上的睡袋、別的勇者留下的木箱。保留區是公會擺的，討伐區是別的勇者留下的臨時營地。
// - 在營火旁休息：每層一次，回復四成的生命和魔力，倒下的隊友扶起來。附近有醒著的遺跡生物就靜不下來，不能休息。
// - 狩獵場、觀光遺跡沒有。
// 這個檔案要在 ruinplus.js 後面載入。
(function (R) {
  const W = () => R.W;
  const free = (x, z, r) => { if (R.pointBlocked && R.pointBlocked(x, z)) return false; for (const c of (R.boxesNear ? R.boxesNear(x, z) : [])) if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return false; return true; };
  const build = () => {
    const w = W(), run = w.run, F = w.F; if (!run || !F || F.rest || !F.group || !F.rooms || !F.rooms[0]) return;
    if (run.site.id === 'kanko' || run.grade.id === 'hunt') return;
    const r = F.rooms[0], TH = THREE, spots = [[2.6, 1.6], [-2.6, 1.6], [2.6, -1.2], [-2.6, -1.2], [0, 2.4], [3.4, 0], [-3.4, 0]];
    const s = spots.map(([dx, dz]) => [r.x + dx, r.z + dz]).find(([x, z]) => free(x, z, 1.4) && (!F.up || Math.hypot(F.up.x - x, F.up.z - z) > 3) && !(F.crystals || []).some(c => Math.hypot(c.x - x, c.z - z) < 2.6)); if (!s) return;
    const [cx, cz] = s, g = new TH.Group(), wood = new TH.MeshLambertMaterial({ color: '#5A3A24' });
    for (let i = 0; i < 5; i++) { const lg = new TH.Mesh(new TH.CylinderGeometry(0.08, 0.08, 0.9, 5), wood); lg.rotation.z = Math.PI / 2; lg.rotation.y = i / 5 * Math.PI; lg.position.y = 0.1; g.add(lg); }
    for (let i = 0; i < 7; i++) { const st = new TH.Mesh(new TH.DodecahedronGeometry(0.14, 0), new TH.MeshLambertMaterial({ color: '#6A6458' })); const a = i / 7 * Math.PI * 2; st.position.set(Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55); g.add(st); }
    const fl = new TH.Mesh(new TH.ConeGeometry(0.24, 0.65, 6), new TH.MeshBasicMaterial({ color: '#FF9A3A' })); fl.position.y = 0.42; g.add(fl);
    const fl2 = new TH.Mesh(new TH.ConeGeometry(0.13, 0.4, 6), new TH.MeshBasicMaterial({ color: '#FFE08A' })); fl2.position.y = 0.38; g.add(fl2);
    const L = new TH.PointLight('#FFB060', 1.1, 11, 1.6); L.position.set(0, 1.2, 0); g.add(L);
    // 睡袋、木箱
    const bag = new TH.Mesh(new TH.BoxGeometry(0.8, 0.14, 1.9), new TH.MeshLambertMaterial({ color: run.grade.zone === '討伐區' ? '#5A4A3A' : '#3E5A4A' })); bag.position.set(1.4, 0.07, 0.6); bag.rotation.y = 0.3; g.add(bag);
    const box = new TH.Mesh(new TH.BoxGeometry(0.7, 0.55, 0.7), new TH.MeshLambertMaterial({ color: '#8A6A44' })); box.position.set(-1.3, 0.28, 0.5); box.castShadow = true; g.add(box);
    g.position.set(cx, 0, cz); F.group.add(g); R.addBox(cx - 0.55, cx + 0.55, cz - 0.55, cz + 0.55, 'deco');
    F.camp = { x: cx, z: cz, fl, fl2, L, used: false };
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf0(f, o); try { build(); } catch (e) { console.warn('[restfloor]', e); } return r; };
  const rest = () => {
    const w = W(), F = w.F, P = w.P, C = F && F.camp; if (!C || !P) return;
    if (C.used) { R.toast('營火已經快熄了。這一層休息過了。'); return; }
    const awake = (w.enemies || []).some(e => !e.dead && !e.dormant && e.aggro && !(e.def && e.def.ai === 'luck') && Math.hypot(e.x - P.x, e.z - P.z) < 12);
    if (awake) { R.toast('附近有遺跡生物在動，靜不下來。', '#FF9A6A'); return; }
    C.used = true; P.hp = Math.min(P.hpMax, P.hp + P.hpMax * 0.4); P.mp = Math.min(P.mpMax, P.mp + P.mpMax * 0.4);
    (w.allies || []).forEach(a => { if (a.downed) { a.downed = false; if (R.setDown) R.setDown(a.h, false); a.hp = Math.max(a.hp || 0, (a.hpMax || 100) * 0.4); } else if (a.hpMax) a.hp = Math.min(a.hpMax, a.hp + a.hpMax * 0.4); });
    C.fl.scale.setScalar(0.5); C.fl2.scale.setScalar(0.5); C.L.intensity = 0.5;
    if (R.sanAdd) R.sanAdd(8);   // 2026-10-08 作者：營火回一點理智（約 8）
    R.sfx && R.sfx('drink'); R.toast((w.run.grade.zone === '討伐區' ? '在別的勇者留下的營地坐了一會兒。' : '在公會擺的營火旁坐了一會兒。') + '（生命、魔力回復四成、理智 +8）');
  };
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => {
    const best = ni0(), w = W(), P = w.P, C = w.F && w.F.camp; if (!C || !P) return best;
    const d = Math.hypot(C.x - P.x, C.z - P.z); if (d > 2.2) return best;
    const mine = { x: C.x, z: C.z, r: 2.2, label: C.used ? '營火（這一層休息過了）' : '在營火旁休息（這一層一次：回復四成）', act: rest };
    if (!best) return mine; return Math.hypot(best.x - P.x, best.z - P.z) < d ? best : mine;
  };
  // 火焰搖晃
  const st0 = R.step;
  R.step = dt => { st0(dt); const F = W().F, C = F && F.camp; if (C) { const k = (C.used ? 0.5 : 1) * (0.9 + Math.sin(performance.now() / 90) * 0.1); C.fl.scale.set(k, k * (0.9 + Math.random() * 0.2), k); } };
})(window.R);
