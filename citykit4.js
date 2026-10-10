// 精緻城市（四）：電影感的遠景（2026-10-08 作者給了一部影片：「你能把場景做成像這樣嗎？一樣的精緻度」）
// 影片的精緻感來自：低角度看得到地平線、水面像鏡子一樣倒映城和山、有光的大朵雲、層層的遠山（越遠越藍）、暖色的陽光。
// - 水面倒影：每一格先從「水面下的鏡像鏡頭」畫一次（半解析度，水本身不畫），水的材質照螢幕位置取這張圖，
//   加上法線的扭曲和菲涅耳（越斜看越像鏡子）。水面高度取離你最近的那片水。畫質「低」不畫倒影。
// - 遠山：R.CK.mountains(B, o)——一圈高解析度的山脈（脊線的噪聲），照坡度和高度上色：低的是杉林、陡的是岩、高的是雪。
// - 陰影：範圍跟著鏡頭看的方向往前挪，大一點（畫質高 4096）。
// 放在 citykit3.js 後面。
(function (R) {
  const W = R.W, T = () => THREE, CK = R.CK;

  // ---------- 水面倒影 ----------
  const RF = {};
  const rfInit = () => {
    const TH = T();
    RF.cam = new TH.PerspectiveCamera(); RF.tm = new TH.Matrix4(); RF.plane = new TH.Plane(); RF.clip = new TH.Vector4(); RF.q = new TH.Vector4();
    RF.u = { tRefl: { value: null }, rMat: { value: new TH.Matrix4() }, rOn: { value: 0 } };
    RF.pos = new TH.Vector3(); RF.n = new TH.Vector3(0, 1, 0); RF.view = new TH.Vector3(); RF.look = new TH.Vector3(); RF.target = new TH.Vector3(); RF.rot = new TH.Matrix4(); RF.cw = new TH.Vector3();
  };
  // 水的材質：加上倒影
  const wm0 = CK.waterMat;
  CK.waterMat = () => {
    const m = wm0(); if (m.userData.refl) return m; m.userData.refl = true;
    if (!RF.u) rfInit();
    m.onBeforeCompile = sh => {
      sh.uniforms.tRefl = RF.u.tRefl; sh.uniforms.rMat = RF.u.rMat; sh.uniforms.rOn = RF.u.rOn;
      sh.vertexShader = 'varying vec3 vRW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vRW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      sh.fragmentShader = 'varying vec3 vRW;\nuniform sampler2D tRefl;\nuniform mat4 rMat;\nuniform float rOn;\n' + sh.fragmentShader.replace('#include <output_fragment>',
        '  { vec4 rc = rMat * vec4( vRW, 1.0 ); vec2 ruv = rc.xy / rc.w + normal.xy * 0.035; vec3 refl = texture2D( tRefl, clamp( ruv, 0.001, 0.999 ) ).rgb;\n' +
        '    vec3 Vw = normalize( cameraPosition - vRW ); float fres = 0.06 + 0.94 * pow( 1.0 - clamp( Vw.y, 0.0, 1.0 ), 4.0 );\n' +
        '    outgoingLight = mix( outgoingLight, refl * vec3( 0.86, 0.94, 0.96 ), clamp( fres + 0.18, 0.0, 0.92 ) * rOn ); }\n#include <output_fragment>');
    };
    m.customProgramCacheKey = () => 'ckwater';
    m.needsUpdate = true;
    return m;
  };
  // 哪一片水：離鏡頭看的地方最近的（水面高度）
  const levelNear = (x, z) => {
    const tw = W.town, D = tw && tw.D; if (!D) return null; let best = null, bd = 1e9;
    D.water.forEach(w => { if (!w.bb) { const xs = w.poly.map(p => p[0]), zs = w.poly.map(p => p[1]); w.bb = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; } const b = w.bb, dx = Math.max(b[0] - x, 0, x - b[2]), dz = Math.max(b[1] - z, 0, z - b[3]), d = dx * dx + dz * dz; if (d < bd) { bd = d; best = w.level; } });
    if (tw.city.sea && (best == null || bd > 3600)) { const sy = D.seaY == null ? -1.2 : D.seaY; if (best == null) best = sy; }
    return bd < 220 * 220 ? best : null;   // 水離鏡頭看的地方 220 公尺以內才畫倒影（效能）
  };
  CK.pre = CK.pre || [];
  CK.pre.push((cam, w, h) => {
    if (!RF.u) rfInit();
    const r = W.renderer, TH = T(), P = W.P, wm = CK.waterMat();
    RF.u.rOn.value = 0;
    if (CK.quality() < 2 || !P || !W.town || !W.town.D || !W.town.D.water.length && !W.town.city.sea) return;   // 2026-10-09：倒影只有高畫質才畫（中、低畫質省一次整個場景）
    const lv = levelNear(P.x, P.z); if (lv == null) return;
    // 水在不在畫面裡（看不到就不畫倒影：省一次整個場景）
    { if (!RF.fr) { RF.fr = new TH.Frustum(); RF.pm = new TH.Matrix4(); RF.bx = new TH.Box3(); } RF.pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); RF.fr.setFromProjectionMatrix(RF.pm); const D = W.town.D; let seen = W.town.city.sea ? (CK.seaInView ? CK.seaInView(cam) : true) : false;   /* 2026-10-10：海真的在畫面裡才算（ckperf2.js） */ if (!seen) for (const wt of D.water) { const b = wt.bb; if (!b) continue; RF.bx.min.set(b[0], wt.level - 0.5, b[1]); RF.bx.max.set(b[2], wt.level + 0.5, b[3]); if (RF.fr.intersectsBox(RF.bx)) { seen = true; break; } } if (!seen) return; }
    const rw = Math.max(2, Math.floor(w * (CK.quality() >= 2 ? 0.4 : 0.3))), rh = Math.max(2, Math.floor(h * (CK.quality() >= 2 ? 0.4 : 0.3)));
    if (!RF.rt) RF.rt = new TH.WebGLRenderTarget(rw, rh, { type: TH.HalfFloatType });
    if (RF.rt.width !== rw || RF.rt.height !== rh) RF.rt.setSize(rw, rh);
    // 鏡像的鏡頭（three.js Reflector 的算法）
    RF.pos.set(0, lv, 0); cam.updateMatrixWorld(); RF.cw.setFromMatrixPosition(cam.matrixWorld);
    RF.pos.x = RF.cw.x; RF.pos.z = RF.cw.z;
    RF.view.subVectors(RF.pos, RF.cw); if (RF.view.dot(RF.n) > 0) return;   // 鏡頭在水面下
    RF.view.reflect(RF.n).negate(); RF.view.add(RF.pos);
    RF.rot.extractRotation(cam.matrixWorld); RF.look.set(0, 0, -1).applyMatrix4(RF.rot).add(RF.cw);
    RF.target.subVectors(RF.pos, RF.look); RF.target.reflect(RF.n).negate(); RF.target.add(RF.pos);
    const vc = RF.cam; vc.position.copy(RF.view); vc.up.set(0, 1, 0).applyMatrix4(RF.rot).reflect(RF.n); vc.lookAt(RF.target);
    vc.far = Math.min(cam.far, 1500); vc.near = cam.near; vc.updateMatrixWorld(); vc.projectionMatrix.copy(cam.projectionMatrix);
    RF.tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1); RF.tm.multiply(vc.projectionMatrix); RF.tm.multiply(vc.matrixWorldInverse);
    RF.u.rMat.value.copy(RF.tm);
    // 斜的近平面：水面下的東西不畫
    RF.plane.setFromNormalAndCoplanarPoint(RF.n, RF.pos); RF.plane.applyMatrix4(vc.matrixWorldInverse);
    RF.clip.set(RF.plane.normal.x, RF.plane.normal.y, RF.plane.normal.z, RF.plane.constant);
    const e = vc.projectionMatrix.elements;
    RF.q.x = (Math.sign(RF.clip.x) + e[8]) / e[0]; RF.q.y = (Math.sign(RF.clip.y) + e[9]) / e[5]; RF.q.z = -1; RF.q.w = (1 + e[10]) / e[14];
    RF.clip.multiplyScalar(2 / RF.clip.dot(RF.q));
    e[2] = RF.clip.x; e[6] = RF.clip.y; e[10] = RF.clip.z + 1 - 0.003; e[14] = RF.clip.w;
    // 畫（水不畫、陰影不重算）
    const vis = wm.visible, au = r.shadowMap.autoUpdate, sky = W.town.L && W.town.L.sky, sp = sky ? sky.position.clone() : null;
    wm.visible = false; r.shadowMap.autoUpdate = false; if (sky) sky.position.copy(vc.position);
    // 2026-10-08：遠處（180 公尺外）的小區塊不畫進倒影（倒影只有 0.4 倍解析度看不出來；皇嶺改建後河邊一格多畫上千次）。山、火山這種大的照畫
    const tw = W.town; if (!tw._rl || tw._rlS !== W.scene) { tw._rlS = W.scene; tw._rl = []; W.scene.traverse(o => { if (!o.isMesh || !o.geometry || (o.isInstancedMesh && !o.userData.forest) || o.matrixAutoUpdate) return; const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const s = g.boundingSphere; if (!s || s.radius > 150) return; o.updateMatrixWorld(); const c = s.center.clone().applyMatrix4(o.matrixWorld); tw._rl.push([o, c.x, c.y, c.z, s.radius]); }); }
    const off = []; tw._rl.forEach(q => { const o = q[0]; if (o.visible && Math.hypot(q[1] - RF.cw.x, q[3] - RF.cw.z) - q[4] > 140) { o.visible = false; off.push(o); } });
    r.setRenderTarget(RF.rt); r.clear(); r.render(W.scene, vc);
    off.forEach(o => { o.visible = true; });
    wm.visible = vis; r.shadowMap.autoUpdate = au; if (sky) sky.position.copy(sp);
    RF.u.tRefl.value = RF.rt.texture; RF.u.rOn.value = 1;
  });

  // ---------- 遠山 ----------
  // o：{ r0（山腳離城中心多遠）, r1（最外圈）, h（最高）, seed, low: [[角度0, 角度1, 剩幾成], …]（某些方向比較低：海、平原）, snow（雪線）, cx, cz }
  CK.mountains = (B, o) => {
    o = o || {}; const TH = T(), cx = o.cx || 0, cz = o.cz || 0, r0 = o.r0 || 650, r1 = o.r1 || 2600, H = o.h || 520, seed = o.seed || 7, N = 288, NR = 40;
    const ridge = (x, y, s) => { let v = 0, a = 0.6, f = 1, n = 0; for (let i = 0; i < 5; i++) { const q = 1 - Math.abs(2 * CK.fbm(x * f, y * f, s + i * 31, [Math.round(24 * f), 64 * f], 1) - 1); v += a * q * q; n += a; a *= 0.45; f *= 2; } return v / n; };
    const lowK = a => { let k = 1; (o.low || []).forEach(([a0, a1, m]) => { const d0 = ((a - a0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), span = ((a1 - a0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); if (d0 <= span) { const t = Math.min(d0, span - d0) / Math.max(0.001, span * 0.25); k = Math.min(k, m + (1 - m) * Math.max(0, 1 - Math.min(1, t))); } }); return k; };
    const hAt = (a, rad) => { const u = a / (Math.PI * 2) * 24, v = rad / 320, k = (rad - r0) / (r1 - r0), env = Math.pow(Math.sin(Math.min(1, k * 1.8) * Math.PI / 2), 1.3) * (0.75 + 0.25 * Math.min(1, k * 1.2)); return Math.max(0, ridge(u, v, seed) * H * env * lowK(a)); };
    CK.mountainH = hAt;
    const pos = new Float32Array((N + 1) * (NR + 1) * 3), idx = [];
    for (let j = 0; j <= NR; j++) { const rad = r0 + (r1 - r0) * Math.pow(j / NR, 1.35); for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, h = hAt(a % (Math.PI * 2), rad), k = (j * (N + 1) + i) * 3; pos[k] = cx + Math.cos(a) * rad; pos[k + 1] = h - 3; pos[k + 2] = cz + Math.sin(a) * rad; } }
    for (let j = 0; j < NR; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const geo = new TH.BufferGeometry(); geo.setAttribute('position', new TH.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    // 上色：坡度、高度、一點雜訊
    const nrm = geo.attributes.normal.array, col = new Float32Array(pos.length), snowY = o.snow || H * 0.55;
    for (let k = 0; k < pos.length; k += 3) {
      const y = pos[k + 1] + 3, ny = nrm[k + 1], nz = CK.fbm(pos[k] / 90, pos[k + 2] / 90, seed + 5, 400, 3), steep = 1 - ny;
      let c = [0.06 + nz * 0.04, 0.09 + nz * 0.05, 0.07 + nz * 0.03];                                   // 杉林
      const rock = Math.min(1, Math.max(0, (steep - 0.28) * 3.2)); c = c.map((v, i) => v + ([0.32, 0.30, 0.28][i] - v) * rock);   // 陡的地方露出岩石
      const snow = Math.min(1, Math.max(0, (y - snowY + nz * 60) / 70)) * Math.min(1, Math.max(0, (ny - 0.45) * 3.5)); c = c.map((v, i) => v + ([0.86, 0.89, 0.94][i] - v) * snow);
      col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
    }
    geo.setAttribute('color', new TH.BufferAttribute(col, 3));
    const m = new TH.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, side: TH.DoubleSide, envMapIntensity: 0.35 }); m.userData.shared = false;
    const mesh = new TH.Mesh(geo, m); mesh.receiveShadow = false; mesh.castShadow = false; B.group.add(mesh);
    return hAt;
  };
})(window.R);
