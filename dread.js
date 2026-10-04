// 討伐令 1433：遺跡更暗、更恐怖（作者）
// - 光：天光、月光照分級變暗（哈米莉亞級最亮、克森特級最暗，越深越暗），霧更濃、顏色更沉；
//   手上的燈照得到的範圍變小，會晃、會閃。牆上的火把也暗一點。
// - 畫面四周一圈黑（佩特拉的注意越高、生命越少，黑得越多）。
// - 附近沒有遺跡生物的時候，偶爾發生怪事：燈全部暗下來一下、黑暗的邊上站著一個黑影（走近就不見）、
//   身後的腳步聲、牆裡傳來三下敲門聲、聽不清楚的低語。聲音用瀏覽器即時合成（audio.js 的 R.AUDIO.ctx）。
(function (R) {
  const W = R.W, rnd = Math.random, T = () => THREE;
  const DARK = { 1: 0.15, 2: 0.38, 3: 0.48, 4: 0.56 };   // 2026-10-04 回饋：遺跡太暗、看不清楚怪物和技能（原本 0.45／0.6／0.72／0.8）
  const D = { k: 0, torchI: 1.3, flick: 1, flickT: 0, nextT: 30, shadow: null, veil: null };

  // ---------- 換樓層：把光調暗 ----------
  const lf = R.loadFloor;
  R.loadFloor = (f, o) => {
    const r = lf(f, o), run = W.run, sc = W.scene; if (!run || !sc || (run.site && run.site.outdoor)) return r;   // 外面（hunt.js 的狩獵場）不暗
    // 2026-10-04 作者：遺跡越深層，光影效果可以越明顯（營造壓抑感）——原本照絕對層數，十幾層以後就到頂；改成照「走到第幾成」
    const depth = Math.max(0, Math.min(1, (f || 0) / Math.max(1, (run.floors || 1) - 1))); D.depth = depth;
    const k = Math.min(0.82, (DARK[run.grade.lv] || 0.4) + 0.3 * depth); D.k = k;
    // 深淵（2026-10-04 作者：深層光影變暗還是不夠明顯，要再暗三倍左右、光源少一點——舉著燈火在深淵的那種壓抑感，背景也跟著暗）：
    //   走到兩成以後開始，越深越接近「只有手上的燈」：天光、月光、霧和背景的顏色、深淵底下的光最深剩一成五；
    //   牆上的火把熄掉一部分（最深六成），同時真的發光的火把從 6 支減到 2 支；手上的燈照得近一點、邊緣收得快一點。哈米莉亞級不變。
    const abyss = run.grade.id === 'hamilia' ? 0 : Math.max(0, Math.min(1, (depth - 0.2) / 0.8)), dim = 1 - abyss * 0.85; D.abyss = abyss;
    D.poolN = W.pool ? Math.max(2, Math.round(W.pool.length * (1 - 0.6 * abyss))) : 0;
    sc.children.forEach(c => { if (c.isHemisphereLight) c.intensity = (0.62 * (1 - k) + 0.14) * dim; });
    if (W.moon) W.moon.intensity = (0.6 * (1 - k) * 0.8 + 0.05) * dim;
    if (sc.fog) { sc.fog.density = 0.02 * (1 + k * 0.7); sc.fog.color.multiplyScalar(1 - k * 0.35); if (sc.background && sc.background.isColor) sc.background.copy(sc.fog.color); }
    if (W.torch) { W.torch.intensity = D.torchI = 2.3; W.torch.distance = 15 + (1 - k) * 6; W.torch.decay = 1.4; }
    // 霧改成「從角色那裡才開始算」（2026-10-04 作者回報：濃霧樓層完全看不到）：
    // 原本的 FogExp2 照離鏡頭的距離算，鏡頭在角色上方二十幾公尺，角色自己就埋在霧裡。改成線性的霧，近端每一格對齊鏡頭到角色的距離（updateLights）
    if (sc.fog) { const c = sc.fog.color.clone(); if (run.grade.id !== 'hamilia' && depth > 0.3) c.lerp(new (T().Color)('#2A0A14'), (depth - 0.3) * 0.6); c.multiplyScalar(dim); sc.fog = new (T().Fog)(c, 20, 60); if (sc.background && sc.background.isColor) sc.background.copy(c); }   // 深處的霧帶一點暗紅；深淵再暗到三分之一
    const F = W.F;
    if (F && abyss > 0) {
      if (F.abyss && F.abyss.material && F.abyss.material.color) F.abyss.material.color.multiplyScalar(dim * dim);   // 懸崖下面（火山是熔岩）：不受光照，直接調暗
      if (F.pitGlow && F.pitGlow.material) F.pitGlow.material.opacity *= dim;
      if (W.torch) { W.torch.distance *= 1 - 0.5 * abyss; W.torch.decay = 1.4 + 1.4 * abyss; }   // 燈照得到的範圍最深剩一半多一點、邊緣收得快：燈外面是黑的
      // 熄掉一部分火把：光拿掉，旁邊的火苗也收起來
      if (F.lights && F.lights.length) { const out = F.lights.filter(() => rnd() < 0.6 * abyss); F.lights = F.lights.filter(L => !out.includes(L)); out.forEach(L => (F.flames || []).forEach(fl => { if (Math.hypot(fl.position.x - L.x, fl.position.z - L.z) < 1) fl.visible = false; })); }
    }
    if (F && F.lights) F.lights.forEach(L => { L.I *= 0.85 * (1 - 0.5 * abyss); });
    D.flick = 1; D.flickT = 0; D.nextT = 25 + rnd() * 20; removeShadow();
    return r;
  };

  // ---------- 合成的聲音 ----------
  const audio = () => { const A = R.AUDIO, c = A && A.ctx; if (!c || (R.isMuted && R.isMuted())) return null; return { c, v: (A.VOL ? A.VOL.sfx : 0.8) * 0.55 }; };
  const noiseBuf = c => { if (D.nb && D.nb.sampleRate === c.sampleRate) return D.nb; const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return (D.nb = b); };
  const burst = (a, t, dur, freq, q, gain, pan) => {
    const { c } = a, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null;
    s.buffer = noiseBuf(c); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * a.v, t + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); if (p) { p.pan.value = pan || 0; g.connect(p); p.connect(c.destination); } else g.connect(c.destination);
    s.start(t, rnd() * 0.5, dur + 0.05);
  };
  const SND = {
    // 低語：一串忽高忽低的氣音
    whisper: () => { const a = audio(); if (!a) return; const t0 = a.c.currentTime, pan = rnd() * 2 - 1; for (let i = 0; i < 9; i++) burst(a, t0 + i * 0.13 + rnd() * 0.05, 0.16 + rnd() * 0.1, 1800 + rnd() * 2400, 6, 0.09, pan); },
    // 腳步聲：身後幾步，越來越近
    steps: () => { const a = audio(); if (!a) return; const t0 = a.c.currentTime, pan = rnd() < 0.5 ? -0.6 : 0.6; for (let i = 0; i < 5; i++) burst(a, t0 + i * 0.42, 0.09, 260 + rnd() * 80, 2, 0.12 + i * 0.05, pan * (1 - i * 0.15)); },
    // 牆裡的三下敲門聲
    knock: () => { const a = audio(); if (!a) return; const t0 = a.c.currentTime + 0.05, pan = rnd() * 1.6 - 0.8; [0, 0.32, 0.64].forEach(d => { burst(a, t0 + d, 0.14, 140, 1.5, 0.5, pan); const o = a.c.createOscillator(), g = a.c.createGain(); o.frequency.setValueAtTime(90, t0 + d); o.frequency.exponentialRampToValueAtTime(45, t0 + d + 0.12); g.gain.setValueAtTime(0.35 * a.v, t0 + d); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.16); o.connect(g); g.connect(a.c.destination); o.start(t0 + d); o.stop(t0 + d + 0.2); }); },
    // 看到黑影：一聲很低的嗡
    sting: () => { const a = audio(); if (!a) return; const t0 = a.c.currentTime; [55, 58.3].forEach(fq => { const o = a.c.createOscillator(), g = a.c.createGain(); o.type = 'sawtooth'; o.frequency.value = fq; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.12 * a.v, t0 + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4); o.connect(g); g.connect(a.c.destination); o.start(t0); o.stop(t0 + 2.5); }); }
  };

  // ---------- 黑影 ----------
  let shadowTex = null;
  const shadowCanvas = () => {
    const c = document.createElement('canvas'); c.width = 12; c.height = 30; const x = c.getContext('2d');
    x.fillStyle = '#07050A';
    x.fillRect(4, 1, 4, 5); x.fillRect(3, 2, 6, 3);            // 頭
    x.fillRect(3, 6, 6, 12); x.fillRect(2, 8, 8, 8);           // 身體
    x.fillRect(1, 9, 2, 10); x.fillRect(9, 9, 2, 10);          // 長長的手
    x.fillRect(3, 18, 2, 11); x.fillRect(7, 18, 2, 11);        // 腳
    x.fillStyle = 'rgba(7,5,10,.55)'; x.fillRect(2, 28, 8, 2); x.fillRect(0, 17, 1, 3); x.fillRect(11, 17, 1, 3);
    x.fillStyle = '#E8E4F0'; x.fillRect(4, 3, 1, 1); x.fillRect(7, 3, 1, 1);   // 眼睛
    return c;
  };
  const removeShadow = () => { const s = D.shadow; if (!s) return; if (s.spr.parent) s.spr.parent.remove(s.spr); s.spr.material.dispose(); D.shadow = null; };
  const tileAt = (x, z) => { const t = W.F && W.F.tile; if (!t) return -1; const tx = Math.floor((x - t.X0) / t.TS), tz = Math.floor((z - t.Z0) / t.TS); if (tx < 0 || tz < 0 || tx >= t.nx || tz >= t.nz) return -1; return t.T[tz * t.nx + tx]; };
  const darkSpot = P => {
    for (let i = 0; i < 24; i++) {
      const a = rnd() * Math.PI * 2, d = 8.5 + rnd() * 3.5, x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d;
      if (tileAt(x, z) !== 1) continue;
      if ((W.F.lights || []).some(L => Math.hypot(L.x - x, L.z - z) < 4.5)) continue;
      return [x, z];
    }
    return null;
  };
  const showShadow = P => {
    const p = darkSpot(P); if (!p) return false;
    if (!shadowTex) { shadowTex = new (T().CanvasTexture)(shadowCanvas()); shadowTex.magFilter = shadowTex.minFilter = T().NearestFilter; }
    const m = new (T().SpriteMaterial)({ map: shadowTex, transparent: true, depthWrite: false, fog: true }), spr = new (T().Sprite)(m);
    spr.scale.set(1, 2.5, 1); spr.position.set(p[0], 1.25, p[1]); W.scene.add(spr);
    D.shadow = { spr, t: 0, life: 3 + rnd() * 2.5, fade: 0 };
    if (rnd() < 0.6) SND.sting();
    return true;
  };

  // ---------- 每一格 ----------
  const ensureVeil = () => {
    if (D.veil && D.veil.isConnected) return D.veil;
    const v = document.createElement('div'); v.id = 'r-dread'; v.className = 'veil';
    const ref = document.getElementById('r-hurt'); if (!ref) return null; ref.parentNode.insertBefore(v, ref); return (D.veil = v);
  };
  const quiet = P => !W.enemies.some(e => !e.dead && Math.hypot(e.x - P.x, e.z - P.z) < 11);
  const ul = R.updateLights;
  R.updateLights = dt => {
    ul(dt);
    const run = W.run, P = W.P, veil = ensureVeil(); if (!run || !P || (run.site && run.site.outdoor)) { if (veil) veil.style.opacity = 0; return; }
    const t = run.t || 0;
    // 燈：平常微微晃，怪事發生時整個暗下來
    if (D.flickT > 0) { D.flickT -= dt; D.flick = D.flickT > 0 ? (rnd() < 0.15 ? 0.6 : 0.08) : 1; }
    if (W.torch) W.torch.intensity = D.torchI * D.flick * (0.9 + Math.sin(t * 7.3) * 0.04 + Math.sin(t * 17.1) * 0.03 + (rnd() < 0.01 ? -0.25 : 0));
    if (D.flick < 1 && W.pool) W.pool.forEach(l => { l.intensity *= D.flick; });
    if (W.pool && D.poolN) W.pool.forEach((l, i) => { if (i >= D.poolN) l.intensity = 0; });   // 深淵：只有最近的幾支火把真的發光
    // 霧：角色周圍一定看得清楚；一般看得到 30 公尺左右（越暗越近），濃霧樓層（ruinvar.js 的 F.fogMin）4.5 公尺
    // 濃霧（2026-10-04 作者：濃霧被削弱到完全沒效果了，調回來一點）：原本 10 公尺（比深層一般的還遠），霧的顏色又跟黑暗一樣，看不出是霧。
    //   現在角色往外 4.5 公尺就看不見，霧是灰白的（深淵裡暗一點）；角色自己照樣看得清楚（霧從角色前面一點點才開始）。
    { const fg = W.scene && W.scene.fog, fog = W.F && W.F.fogMin; if (fg && fg.isFog && W.camera) {
      if (fog && W.F.fogTint !== W.F) { W.F.fogTint = W.F; fg.color.lerp(new (T().Color)('#A8AEB4'), 0.6).multiplyScalar(0.55 + 0.45 * (1 - (D.abyss || 0))); if (W.scene.background && W.scene.background.isColor) W.scene.background.copy(fg.color); }
      const cd = Math.hypot(W.camera.position.x - P.x, W.camera.position.y - 1, W.camera.position.z - P.z), vis = fog ? 4.5 : Math.max(8, 30 - D.k * 12 - (D.depth || 0) * 6 - (D.abyss || 0) * 8); fg.near = Math.max(1, cd - (fog ? 0.5 : 3)); fg.far = cd + vis; } }
    // 哈米莉亞級：不嚇人（沒有四周的黑、黑影、低語、敲門聲）——2026-10-04 回饋：探索起來太壓抑
    if (run.grade && run.grade.id === 'hamilia') { if (veil) veil.style.opacity = 0; return; }
    // 四周的黑：注意越高、生命越少越黑
    if (veil) veil.style.opacity = Math.min(0.95, 0.22 + D.k * 0.2 + (D.depth || 0) * 0.18 + (D.abyss || 0) * 0.4 + run.aware / 100 * 0.25 + Math.max(0, 0.5 - P.hp / P.hpMax) * 0.4).toFixed(3);
    // 黑影：走近或時間到就不見
    const s = D.shadow;
    if (s) {
      s.t += dt; const d = Math.hypot(s.spr.position.x - P.x, s.spr.position.z - P.z);
      if (!s.fade && (d < 6 || s.t > s.life)) { s.fade = 0.0001; if (rnd() < 0.5) SND.whisper(); }
      if (s.fade) { s.fade += dt; s.spr.material.opacity = Math.max(0, 1 - s.fade / 0.35); if (s.fade > 0.35) removeShadow(); }
    }
    // 怪事：附近沒有生物、也沒有開著的紙本時才發生
    D.nextT -= dt * (1 + run.aware / 60);
    if (D.nextT <= 0) {
      if (!quiet(P) || (R.sheetOpen && R.sheetOpen()) || D.shadow) { D.nextT = 6; return; }
      D.nextT = (run.grade.lv <= 1 ? 50 : 26) + rnd() * 30;
      const r = rnd();
      if (r < 0.3) { D.flickT = 1.2 + rnd() * 0.8; SND.whisper(); if (rnd() < 0.5) setTimeout(() => R.toast && W.run && R.toast('……燈好像被什麼吹了一下。'), 900); }
      else if (r < 0.58) { if (!showShadow(P)) SND.knock(); }
      else if (r < 0.8) { SND.steps(); if (rnd() < 0.45) setTimeout(() => R.toast && W.run && R.toast('……身後有腳步聲。回頭看，什麼也沒有。'), 2200); }
      else { SND.knock(); if (rnd() < 0.4) setTimeout(() => R.toast && W.run && R.toast('牆的另一邊，有人敲了三下。'), 1200); }
    }
  };
  // 回城：拿掉黑影和四周的黑
  const er = R.endRun;
  R.endRun = (...a) => { removeShadow(); if (D.veil) D.veil.style.opacity = 0; return er(...a); };
})(window.R);
