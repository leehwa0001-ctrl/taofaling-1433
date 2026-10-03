// 地上的持續效果看得清楚一點（作者 2026-10-04：技能特效不明顯，特別指那些會在地上留下持續傷害類型的技能）
// combat.js 的 R.addZone 原本只畫一圈細細的環（透明度 0.25～0.55），遺跡裡暗，幾乎看不到。這裡加上：
// - 範圍內鋪一層半透明的顏色；外圈一閃一閃；外面一圈轉動的弧線（看得出範圍、還在作用）；
// - 聖域（光環、花開、聖域擴張）、火焰：持續冒光點、火星；陷阱（地雷、捕獸夾）：中間一閃一閃；
// - 自己放的那一下打一圈光。遺跡生物的毒霧、熔岩也一樣看得清楚（光點只在你附近才冒，省效能）。
// 放在 combat.js 後面。
(function (R) {
  const W = () => R.W;
  const a0 = R.addZone;
  R.addZone = z => {
    const r = a0(z); if (!r || !r.mesh) return r;
    try {
      const TH = THREE, col = r.mesh.material.color.clone(), mine = z.own === 'p' || z.kind === 'sanct' || z.kind === 'trap', R0 = z.kind === 'trap' ? Math.max(0.5, z.r * 0.6) : z.r;
      const disc = new TH.Mesh(new TH.CircleGeometry(R0, 28), new TH.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, depthWrite: false, side: TH.DoubleSide })); disc.position.z = -0.004; r.mesh.add(disc);
      const arcs = new TH.Group(), am = new TH.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, depthWrite: false, side: TH.DoubleSide });
      for (let i = 0; i < 6; i++) arcs.add(new TH.Mesh(new TH.RingGeometry(z.r * 1.03, z.r * 1.15, 6, 1, i * Math.PI / 3, Math.PI / 6), am));
      r.mesh.add(arcs);
      r.fxv = { disc, arcs, am, mine, hex: '#' + col.getHexString(), t: Math.random() * 3, spark: 0 };
      if (mine && R.fx) R.fx('ring', z.x, 0.1, z.z, { r: z.r * 1.1, color: r.fxv.hex });
    } catch (e) { }
    return r;
  };
  const u0 = R.updateZones;
  R.updateZones = dt => {
    u0(dt);
    const w = W(), P = w.P;
    (w.zones || []).forEach(z => {
      const v = z.fxv; if (!v || !z.mesh || z.dead) return;
      v.t += dt; const fade = Math.max(0, Math.min(1, z.life / 0.8)), pulse = 0.5 + 0.5 * Math.sin(v.t * 5);
      z.mesh.material.opacity = (0.55 + 0.35 * pulse) * fade;
      v.disc.material.opacity = (z.kind === 'trap' ? 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(v.t * 7)) : (v.mine ? 0.34 : 0.2) * (0.85 + 0.15 * pulse)) * fade;
      v.am.opacity = 0.65 * fade; v.arcs.rotation.z += dt * (z.kind === 'sanct' ? 0.7 : 1.5);
      if (z.kind === 'trap' || !R.fx || !P) return;
      if (!v.mine && Math.hypot(z.x - P.x, z.z - P.z) > 16) return;
      v.spark -= dt; if (v.spark > 0) return; v.spark = z.kind === 'sanct' ? 0.16 : 0.22;
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * z.r * 0.9;
      R.fx('poof', z.x + Math.sin(a) * d, z.kind === 'sanct' ? 0.4 : 0.2, z.z + Math.cos(a) * d, { color: z.kind === 'lava' ? (Math.random() < 0.5 ? '#FFB04A' : '#FF5A1A') : v.hex, n: 1 });
    });
  };
})(window.R);
