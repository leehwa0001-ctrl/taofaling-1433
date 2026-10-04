// 討伐令 1433：可以互動的東西加白色螢光外框（作者 2026-10-04：下遺跡後可以用營火恢復，新手應該不太會知道；
//   加個白色螢光外框表示營火可互動、存檔點可互動等等）
// - 營火（restfloor.js 的 F.camp、第 0 層的 F.fire）、存檔點（savepoint.js 的 F.save、F.warp）、回歸水晶、還沒開的寶箱：
//   東西的輪廓外面多一圈白光（把模型往外撐一點、只畫背面＝描邊），一亮一暗；走到按得到的距離變亮、變粗。
// - 人（第 0 層的職員、休息的勇者、流浪商人）和告示板沒有模型可以描：腳下一圈白色的光環。
// 放在 restfloor.js、savepoint.js、restmerchant.js、ruinplus.js 後面。
(function (R) {
  const W = () => R.W;
  // 外殼往鏡頭拉近 1.2 公尺：東西放在地上，外殼的下半截會被地板擋住；拉近之後才看得到貼地的那一圈
  const VS = 'uniform float th; void main(){ vec3 p = position + normalize(position + vec3(0.0001)) * th; vec4 mv = modelViewMatrix * vec4(p, 1.0); mv.z += 1.2; gl_Position = projectionMatrix * mv; }';
  const FS = 'uniform float op; void main(){ gl_FragColor = vec4(1.0, 1.0, 0.96, op); }';
  const SKIP = /Plane|Ring|Circle|Torus/;
  let lastF = null, list = [], scanT = 0;
  // 描一整組模型：每一個實心的 mesh 底下加一個「撐大、只畫背面」的白色外殼，
  // 外殼拉近鏡頭以後會蓋住東西本身，所以後面再把東西原樣畫一次（renderOrder 2）蓋回去
  const outline = (obj, kind) => {
    if (!obj || obj.userData.glowDone) return; obj.userData.glowDone = 1;
    const TH = THREE, u = { th: { value: 0.05 }, op: { value: 0.6 } };
    const mat = new TH.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, side: TH.BackSide, transparent: true, depthWrite: false });
    const meshes = []; obj.traverse(m => { if (m.isMesh && !m.userData.glow && m.geometry && !SKIP.test(m.geometry.type)) meshes.push(m); });
    meshes.forEach(m => {
      const o = new TH.Mesh(m.geometry, mat); o.userData.glow = 1; o.renderOrder = 1; m.add(o);
      const mm = m.material && !Array.isArray(m.material) ? m.material.clone() : null; if (!mm) return;
      mm.transparent = true; mm.depthWrite = false; mm.depthFunc = TH.LessEqualDepth;
      const c = new TH.Mesh(m.geometry, mm); c.userData.glow = 1; c.renderOrder = 2; m.add(c);
    });
    list.push({ obj, u, kind });
  };
  // 腳下的光環（人、告示板這種沒辦法描的）
  const halo = it => {
    const F = W().F, TH = THREE; if (!F || !F.group) return;
    const u = { op: { value: 0.5 } };
    const m = new TH.Mesh(new TH.RingGeometry(0.55, 0.72, 28), new TH.MeshBasicMaterial({ color: '#FFFFF4', transparent: true, opacity: 0.5, depthWrite: false, side: TH.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(it.x, 0.04, it.z); m.userData.glow = 1; F.group.add(m);
    list.push({ ring: m, it, u, kind: 'halo' });
  };
  const scan = () => {
    const F = W().F; if (!F || !F.group) return;
    const parentOf = o => o && o.parent;
    if (F.camp) outline(parentOf(F.camp.fl), 'camp');
    if (F.fire) outline(parentOf(F.fire.fl), 'camp');
    if (F.save && F.save.g) outline(F.save.g, 'save');
    if (F.warp && F.warp.g) outline(F.warp.g, 'save');
    (F.crystals || []).forEach(c => outline(c.mesh, 'crystal'));
    (F.chests || []).forEach(c => { if (c.mesh && !c.mesh.userData.glowDone) { outline(c.mesh, 'chest'); list[list.length - 1].chest = c; } });
    (F.rpInter || []).forEach(it => { if (!it._glow && !/營火/.test(it.label)) { it._glow = 1; halo(it); } });
    if (F.trader && !F.trader._glow) { F.trader._glow = 1; halo(F.trader); }
  };
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(), F = w.F, P = w.P; if (!w.run || !F || !P) { lastF = null; return; }
    if (F !== lastF) { lastF = F; list = []; scanT = 0; }
    if ((scanT -= dt) <= 0) { scanT = 0.5; try { scan(); } catch (e) { console.warn('[glowhint]', e); } }
    const t = performance.now() / 1000;
    for (const g of list) {
      const p = g.it || g.obj.getWorldPosition(g.wp || (g.wp = new THREE.Vector3()));
      const d = Math.hypot(p.x - P.x, p.z - P.z), near = d < 2.6 ? 1 : d < 9 ? 0 : -1;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + (g.kind === 'chest' ? 1 : 0));
      if (g.kind === 'halo') { g.ring.material.opacity = near > 0 ? 0.85 : near === 0 ? 0.3 + pulse * 0.35 : 0.18; const s = near > 0 ? 1.15 : 1; g.ring.scale.set(s, s, s); if (g.it.x !== g.ring.position.x) g.ring.position.set(g.it.x, 0.04, g.it.z); continue; }
      const off = (g.chest && g.chest.state !== 'closed') || (g.kind === 'camp' && F.camp && F.camp.used && g.obj === (F.camp.fl && F.camp.fl.parent));
      g.u.op.value = off ? 0 : near > 0 ? 0.9 : near === 0 ? 0.35 + pulse * 0.4 : 0.22 + pulse * 0.1;
      g.u.th.value = near > 0 ? 0.14 : 0.09;
    }
  };
})(window.R);
