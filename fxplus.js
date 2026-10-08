// 討伐令 1433：技能的動作和特效（作者：技能的動作、特效可以再升級）
// 原本的斬擊光、火花、頓幀、震動都留著；這裡再加（全部用兩組粒子，不加燈光，免得著色器重新編譯卡一下）：
// - 放技能：腳下一圈光環、往上飄的光點、身上一閃（顏色照技能的屬性）。
// - 翻滾、衝刺：身後留下淡藍色的殘影。
// - 爆炸（boom）：白色的衝擊波、碎石、火星，照範圍震動畫面；光柱（pillar）：地上一圈、往上噴的光；光環（ring）：往上飄的光點。
// - 子彈、箭、魔法：身後拖一條光（照子彈的顏色）。
// - 遺跡生物的狀態：燒著冒火星、緩速冒冰屑、暈眩頭上轉星星、詛咒冒紫煙。
// - 暴擊：打中的地方一圈白光；擊倒：照牠的顏色爆開。
(function (R) {
  const W = R.W, rnd = Math.random;
  const ELEM = { fireball: '#FF8A3A', meteor: '#FF6A2A', heal: '#FFE8A0', guard: '#E8C04A', parry: '#FFFFFF', shieldbash: '#E8C04A', flash: '#B8D8FF', flurry: '#FFFFFF', whirl: '#D8E6FF', volley: '#E8D8B8', roll: '#FFE08A', snipe: '#FFE08A' };
  const CLS = { warrior: '#E8C04A', mage: '#B89AFF', archer: '#9ACF6A', gunner: '#FFE08A', priest: '#FFE8A0', rogue: '#B8D8FF', knight: '#E8E0C8' };
  // ---------- 粒子（細的、大的兩組） ----------
  const mkSys = (N, size) => {
    const TH = THREE, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), g = new TH.BufferGeometry();
    for (let i = 0; i < N; i++) pos[i * 3 + 1] = -999;
    g.setAttribute('position', new TH.BufferAttribute(pos, 3)); g.setAttribute('color', new TH.BufferAttribute(col, 3));
    const pix = !!(R.pixelOn && R.pixelOn());
    const m = new TH.PointsMaterial({ size: pix ? size[0] : size[1], sizeAttenuation: !pix, vertexColors: true, transparent: true, depthWrite: false, blending: TH.AdditiveBlending });
    const pts = new TH.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 3;
    return { pts, pos, col, N, life: new Float32Array(N), max: new Float32Array(N), v: new Float32Array(N * 3), c: new Float32Array(N * 3), grav: new Float32Array(N), head: 0, pix };
  };
  let fine = null, big = null;
  const sys = () => { if (!fine) { fine = mkSys(900, [2, 0.12]); big = mkSys(260, [4, 0.3]); } [fine, big].forEach(s => { if (W.scene && s.pts.parent !== W.scene) { if (s.pts.parent) s.pts.parent.remove(s.pts); W.scene.add(s.pts); } }); };
  const hex = h => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const emit = (s, x, y, z, vx, vy, vz, life, color, grav) => {
    const i = s.head; s.head = (s.head + 1) % s.N; const c = typeof color === 'string' ? hex(color) : color;
    s.pos[i * 3] = x; s.pos[i * 3 + 1] = y; s.pos[i * 3 + 2] = z; s.v[i * 3] = vx; s.v[i * 3 + 1] = vy; s.v[i * 3 + 2] = vz;
    s.life[i] = life; s.max[i] = life; s.c[i * 3] = c[0]; s.c[i * 3 + 1] = c[1]; s.c[i * 3 + 2] = c[2]; s.grav[i] = grav || 0;
  };
  const burst = (s, x, y, z, n, sp, life, color, o) => { o = o || {}; for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, u = o.flat ? 0 : (rnd() - 0.3), r = sp * (0.4 + rnd() * 0.6); emit(s, x + (o.spread ? (rnd() - 0.5) * o.spread : 0), y, z + (o.spread ? (rnd() - 0.5) * o.spread : 0), Math.cos(a) * r, (o.up != null ? o.up * (0.5 + rnd()) : u * r), Math.sin(a) * r, life * (0.6 + rnd() * 0.5), color, o.grav); } };
  const ringOut = (s, x, y, z, n, sp, life, color) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; emit(s, x, y, z, Math.cos(a) * sp, 0, Math.sin(a) * sp, life, color, 0); } };
  const update = dt => {
    [fine, big].forEach(s => {
      if (!s) return; const { pos, col, v, c, life, max, grav } = s;
      for (let i = 0; i < s.N; i++) {
        if (life[i] <= 0) { if (pos[i * 3 + 1] > -900) { pos[i * 3 + 1] = -999; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; } continue; }
        life[i] -= dt; const k = Math.max(0, life[i] / max[i]);
        v[i * 3 + 1] -= grav[i] * dt; pos[i * 3] += v[i * 3] * dt; pos[i * 3 + 1] += v[i * 3 + 1] * dt; pos[i * 3 + 2] += v[i * 3 + 2] * dt;
        if (pos[i * 3 + 1] < 0.05 && grav[i] > 0) { pos[i * 3 + 1] = 0.05; v[i * 3 + 1] *= -0.3; v[i * 3] *= 0.6; v[i * 3 + 2] *= 0.6; }
        col[i * 3] = c[i * 3] * k; col[i * 3 + 1] = c[i * 3 + 1] * k; col[i * 3 + 2] = c[i * 3 + 2] * k;   // 加法混色：越暗越透明
      }
      s.pts.geometry.attributes.position.needsUpdate = true; s.pts.geometry.attributes.color.needsUpdate = true;
    });
  };

  // ---------- 放技能 ----------
  const castFx = (P, color) => {
    sys(); const c = color || '#FFFFFF';
    ringOut(big, P.x, 0.15, P.z, 22, 5.5, 0.32, c); ringOut(fine, P.x, 0.12, P.z, 36, 3.2, 0.4, '#FFFFFF');
    for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, r = rnd() * 1.1; emit(fine, P.x + Math.cos(a) * r, 0.2 + rnd() * 0.5, P.z + Math.sin(a) * r, 0, 2.2 + rnd() * 2.5, 0, 0.7 + rnd() * 0.4, c, 0); }
    burst(big, P.x, 1.2, P.z, 8, 1.2, 0.25, '#FFFFFF', { up: 0.6 });
  };
  const wrapCast = (name, colorOf) => {
    const f0 = R[name]; if (!f0) return;
    R[name] = (...args) => {
      const w = W, P = w.P; if (!P || !w.run) return f0(...args);
      const mp = P.mp, cd = P.skillCd, cds = P.skCd ? Object.assign({}, P.skCd) : null, r = f0(...args);
      const cast = P.mp < mp - 0.01 || P.skillCd > cd + 0.01 || (P.skCd && cds && Object.keys(P.skCd).some(k => (P.skCd[k] || 0) > (cds[k] || 0) + 0.01));
      if (cast) castFx(P, colorOf(args, P));
      return r;
    };
  };
  wrapCast('useSkill', (a, P) => ELEM[P.skill] || CLS[P.cls] || '#FFFFFF');
  wrapCast('castSlot', ([i], P) => { const id = R.slotSkill ? R.slotSkill(P, i) : null; return ELEM[id] || CLS[P.cls] || '#FFFFFF'; });

  // ---------- 原本的特效加料 ----------
  const fx0 = R.addFx;
  R.addFx = (kind, x, y, z, o) => {
    fx0(kind, x, y, z, o); o = o || {}; if (!W.scene) return;
    try {
      sys(); const c = o.color || '#FFFFFF', r = o.r || 2;
      if (kind === 'boom') {
        ringOut(big, x, 0.3, z, 28, r * 3.2, 0.28, '#FFFFFF');
        burst(fine, x, 0.6, z, 30, r * 3, 0.6, c === '#FFFFFF' ? '#FFB45A' : c, { up: 4, grav: 14 });
        burst(fine, x, 0.4, z, 12, r * 2, 0.8, '#5A5048', { up: 3, grav: 16 });
        burst(big, x, 0.8, z, 10, r * 1.2, 0.35, c, {});
        if (R.shake) R.shake(Math.min(0.5, 0.12 + r * 0.05));
      } else if (kind === 'pillar') {
        ringOut(big, x, 0.2, z, 18, (o.r || 1) * 4, 0.3, c);
        for (let i = 0; i < 24; i++) emit(fine, x + (rnd() - 0.5) * (o.r || 1), 0.2, z + (rnd() - 0.5) * (o.r || 1), (rnd() - 0.5) * 1.5, 6 + rnd() * 6, (rnd() - 0.5) * 1.5, 0.5, c, 0);
      } else if (kind === 'ring') {
        for (let i = 0; i < 18; i++) { const a = rnd() * Math.PI * 2; emit(fine, x + Math.cos(a) * r * 0.8, 0.2, z + Math.sin(a) * r * 0.8, 0, 1.5 + rnd() * 2, 0, 0.6, c, 0); }
      } else if (kind === 'spark' && o.crit) {
        ringOut(big, x, y, z, 14, 6, 0.16, '#FFFFFF'); burst(fine, x, y, z, 10, 6, 0.3, '#FFE28A', { grav: 8 });
      } else if (kind === 'swing' && o.big) {
        const a = o.a || 0, rg = o.range || 2; for (let i = 0; i < 14; i++) { const t = (rnd() - 0.5) * (o.arc || 1.6), A = a + t; emit(fine, x + Math.sin(A) * rg, 1, z + Math.cos(A) * rg, Math.sin(A) * 3, 1 + rnd() * 2, Math.cos(A) * 3, 0.35, c === '#FFFFFF' ? '#D8E6FF' : c, 6); }
      } else if (kind === 'blink') {
        burst(big, x, y || 1, z, 14, 4, 0.3, '#B89AFF', {});
      }
    } catch (e) { }
  };
  // 擊倒：照牠的顏色爆開
  const kill0 = R.killEnemy;
  if (kill0) R.killEnemy = (e, by) => { const r = kill0(e, by); try { if (e && W.scene) { sys(); const s = (e.def && e.def.size) || 1, c = (e.def && e.def.color) || '#FFFFFF'; burst(fine, e.x, 0.6 + s * 0.3, e.z, 16 + Math.round(s * 10), 3 + s * 2, 0.6, c, { up: 3, grav: 10 }); ringOut(big, e.x, 0.3, e.z, 16, 3 + s * 2, 0.25, '#FFFFFF'); } } catch (er) { } return r; };

  // ---------- 每一格：殘影、拖尾、狀態 ----------
  const ghosts = [];
  let gT = 0, sT = 0;
  const ghost = P => {
    const spr = P.h && P.h.spr, tex = spr && spr.material && spr.material.map; if (!spr || !tex) return;
    const TH = THREE, t2 = tex.clone(); t2.needsUpdate = true;
    const m = new TH.Mesh(spr.geometry, new TH.MeshBasicMaterial({ map: t2, transparent: true, opacity: 0.45, color: '#8AB8FF', depthWrite: false, alphaTest: 0.1 }));
    spr.updateWorldMatrix(true, false); m.applyMatrix4(spr.matrixWorld); m.renderOrder = 1; W.scene.add(m); ghosts.push({ m, t2, life: 0.25 });
  };
  const step0 = R.step;
  R.step = dt => {
    step0(dt);
    const w = W, P = w.P; if (!w.run || !P || !w.scene) return;
    sys();
    // 殘影
    gT -= dt; if (P.dashT > 0 && gT <= 0) { gT = 0.035; ghost(P); }
    for (let i = ghosts.length - 1; i >= 0; i--) { const g = ghosts[i]; g.life -= dt; g.m.material.opacity = Math.max(0, g.life / 0.25 * 0.45); if (g.life <= 0) { if (g.m.parent) g.m.parent.remove(g.m); g.m.material.dispose(); g.t2.dispose(); ghosts.splice(i, 1); } }
    // 拖尾
    (w.shots || []).forEach(s => { if (!s.mesh || !s.mesh.parent) return; const col = s.mesh.material && s.mesh.material.color ? [s.mesh.material.color.r, s.mesh.material.color.g, s.mesh.material.color.b] : [1, 1, 1]; const glow = s.mesh.material && s.mesh.material.isMeshBasicMaterial; emit(glow ? big : fine, s.mesh.position.x + (rnd() - 0.5) * 0.1, s.mesh.position.y, s.mesh.position.z + (rnd() - 0.5) * 0.1, 0, glow ? 0.3 : 0, 0, glow ? 0.22 : 0.12, glow ? col : [col[0] * 0.8, col[1] * 0.8, col[2] * 0.6], 0); });
    // 狀態（只看附近的）
    sT -= dt; if (sT <= 0) { sT = 0.08;
      (w.enemies || []).forEach(e => {
        if (e.dead || !e.st || Math.abs(e.x - P.x) > 22 || Math.abs(e.z - P.z) > 22) return; const s = (e.def && e.def.size) || 1, h = 0.6 + s * 0.5;
        if (e.st.burn > 0) { for (let k = 0; k < 2; k++) emit(fine, e.x + (rnd() - 0.5) * s * 0.9, h * (0.3 + rnd() * 0.6), e.z + (rnd() - 0.5) * s * 0.9, (rnd() - 0.5) * 0.5, 1.8 + rnd(), (rnd() - 0.5) * 0.5, 0.6, rnd() < 0.5 ? '#FF8A3A' : '#FFD04A', 0); emit(big, e.x + (rnd() - 0.5) * s * 0.5, h * 0.7, e.z + (rnd() - 0.5) * s * 0.5, 0, 1.4, 0, 0.45, '#FF5A1A', 0); }   // 2026-10-08：燒起來看得到
        if (e._psn && e._psn.n > 0) emit(fine, e.x + (rnd() - 0.5) * s * 0.7, h * 0.5, e.z + (rnd() - 0.5) * s * 0.7, 0, 0.9, 0, 0.7, rnd() < 0.5 ? '#8ACF3A' : '#5A9A2A', 0);
        if ((e._brk || 0) > performance.now() / 1000) emit(fine, e.x + (rnd() - 0.5) * s * 0.6, h * 0.9, e.z + (rnd() - 0.5) * s * 0.6, 0, -0.4, 0, 0.4, '#D8D8E0', 0);
        if (e.st.slow > 0) emit(fine, e.x + (rnd() - 0.5) * s * 0.7, h * 0.8, e.z + (rnd() - 0.5) * s * 0.7, 0, -0.6, 0, 0.6, '#BFE6FF', 0);
        if (e.st.curse > 0) emit(big, e.x + (rnd() - 0.5) * s * 0.5, h * 0.7, e.z + (rnd() - 0.5) * s * 0.5, 0, 0.8, 0, 0.6, '#8A4AC8', 0);
        if (e.st.stun > 0) { const a = performance.now() / 160 + e.t; for (let k = 0; k < 3; k++) { const A = a + k * 2.09; emit(fine, e.x + Math.cos(A) * 0.45, h + 0.5, e.z + Math.sin(A) * 0.45, 0, 0, 0, 0.1, '#FFE070', 0); } }
      });
    }
    update(dt);
  };
  // 換樓層、回城：殘影清掉
  const clearAll = () => { ghosts.splice(0).forEach(g => { if (g.m.parent) g.m.parent.remove(g.m); g.m.material.dispose(); g.t2.dispose(); }); [fine, big].forEach(s => { if (s) { s.life.fill(0); update(0); } }); };
  const lf0 = R.loadFloor; if (lf0) R.loadFloor = (...a) => { clearAll(); return lf0(...a); };
  R.fxPlusDebug = { castFx, sys: () => [fine, big], update };
})(window.R);
