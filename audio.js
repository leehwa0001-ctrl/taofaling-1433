// 音效與背景音樂（瀏覽器即時合成，不用音檔）
// 背景音樂照場景換（兩秒交叉淡入淡出）：
//   標題（都節音階、太鼓）、東鶴白天（陽音階的箏＋和弦）、東鶴晚上（陰音階、風鈴）、店裡（安靜的白天）、
//   遺跡（低沉的持續音、水滴、石頭的聲音；佩特拉的注意越高心跳越快）＋戰鬥層（太鼓、低音；附近的遺跡生物越多越大聲，核心、領主在的時候最大）。
// 音效：打中、暴擊、擊倒、受傷、翻滾、升級、房門封住／打開、爆炸、落雷、佩特拉的反應、喚群燈、腳踏車鈴、狗叫、貓叫……
// 音量：暫停選單（城裡、遺跡）有「音樂」「音效」兩條；原本的「關掉音效」會連音樂一起關。存在 localStorage（ruins1433-vol）。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id);
  let ctx = null, master, comp, musicBus, sfxBus, revIn;
  const VOL = (() => { try { return Object.assign({ music: 0.5, sfx: 0.8 }, JSON.parse(localStorage.getItem('ruins1433-vol') || '{}')); } catch (e) { return { music: 0.5, sfx: 0.8 }; } })();
  const saveVol = () => { try { localStorage.setItem('ruins1433-vol', JSON.stringify(VOL)); } catch (e) { } };
  const muted = () => !!(R.isMuted && R.isMuted());
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- 開機：瀏覽器要等玩家第一次點擊或按鍵才能出聲 ----------
  const impulse = (sec, decay) => { const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const a = b.getChannelData(c); for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; };
  let noiseBuf = null;
  const init = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    try { ctx = new A(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.connect(ctx.destination);
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(master);
    musicBus = ctx.createGain(); sfxBus = ctx.createGain(); musicBus.connect(comp); sfxBus.connect(comp);
    const rev = ctx.createConvolver(); rev.buffer = impulse(2.6, 2.4); revIn = ctx.createGain(); revIn.gain.value = 1; const revOut = ctx.createGain(); revOut.gain.value = 0.32; revIn.connect(rev); rev.connect(revOut); revOut.connect(comp);
    const n = ctx.sampleRate; noiseBuf = ctx.createBuffer(1, n, n); const a = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1;
    applyVol(); setInterval(tick, 50); setInterval(watch, 500);
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, init, { passive: true }));
  const applyVol = () => { if (!ctx) return; const t = ctx.currentTime; master.gain.setTargetAtTime(muted() ? 0 : 1, t, 0.05); musicBus.gain.setTargetAtTime(VOL.music * 0.5, t, 0.1); sfxBus.gain.setTargetAtTime(VOL.sfx, t, 0.05); };
  const tm0 = R.toggleMute; if (tm0) R.toggleMute = () => { const m = tm0(); applyVol(); return m; };

  // ---------- 樂器 ----------
  const gainAt = (t, a, peak, d, dest) => { const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); g.connect(dest); return g; };
  const osc = (type, f, t, stop, dest, detune) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune; o.connect(dest); o.start(t); o.stop(stop); return o; };
  const toRev = (node, amt) => { const s = ctx.createGain(); s.gain.value = amt; node.connect(s); s.connect(revIn); };
  // 箏（撥弦）：三角波＋一點方波，濾波器很快關起來
  const koto = (m, t, d, v, dest, rv) => { const f = mtof(m), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.35); const g = gainAt(t, 0.004, v, d, dest); lp.connect(g); toRev(g, rv == null ? 0.5 : rv); osc('triangle', f, t, t + d + 0.1, lp); const sq = ctx.createGain(); sq.gain.value = 0.25; sq.connect(lp); osc('square', f * 1.003, t, t + d + 0.1, sq); };
  // 鐘（風鈴、遺跡裡的回音）：兩個不和諧的正弦泛音，長長的尾巴
  const bell = (m, t, v, dest, d) => { const f = mtof(m), g = gainAt(t, 0.003, v, d || 2.4, dest); toRev(g, 0.9); osc('sine', f, t, t + (d || 2.4) + 0.1, g); const g2 = gainAt(t, 0.003, v * 0.35, (d || 2.4) * 0.5, dest); osc('sine', f * 2.76, t, t + (d || 2.4), g2); };
  // 和弦墊底：鋸齒波過低通，慢慢起來
  const pad = (ms, t, d, v, dest, cut) => { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut || 900; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + d * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + d); lp.connect(g); g.connect(dest); toRev(g, 0.4); ms.forEach(m => { osc('sawtooth', mtof(m), t, t + d + 0.05, lp, -6); osc('sawtooth', mtof(m), t, t + d + 0.05, lp, 6); }); };
  const bass = (m, t, d, v, dest, type) => { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; const g = gainAt(t, 0.01, v, d, dest); lp.connect(g); osc(type || 'triangle', mtof(m), t, t + d + 0.05, lp); };
  const noiseHit = (t, d, v, dest, type, f, q) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const fl = ctx.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.value = f || 1200; if (q) fl.Q.value = q; const g = gainAt(t, 0.002, v, d, dest); s.connect(fl); fl.connect(g); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05); return fl; };
  const sweep = (type, f0, f1, t, d, v, dest) => { const g = gainAt(t, 0.005, v, d, dest), o = osc(type, f0, t, t + d + 0.05, g); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d); return o; };
  // 太鼓：音高往下掉的正弦＋一點噪音
  const taiko = (t, v, dest, f) => { sweep('sine', f || 120, 42, t, 0.42, v, dest); noiseHit(t, 0.08, v * 0.4, dest, 'lowpass', 900); };
  const woodTick = (t, v, dest) => { sweep('sine', 1700, 1500, t, 0.05, v, dest); };

  // ---------- 音樂 ----------
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  const daySeed = () => (R.S ? (R.S.day || 0) * 131 + 7 : 7);
  // 旋律：四小節一句，第 1、2 小節和第 5、6 小節是同一個動機；第 4、8 小節回到主音
  const RHY = [[0, 4, 6, 8, 12], [0, 3, 6, 8, 10, 12], [0, 8, 12], [0, 2, 4, 8, 12, 14], [0, 6, 8, 12], [0, 4, 8, 10, 12]];
  const phrase = (scale, bar, seed, lo) => {
    const motif = (bar % 8) < 4 ? bar % 2 : bar % 2, r = rng(seed * 97 + motif * 13 + (bar % 8 >= 6 ? 5 : 0)), rh = RHY[Math.floor(r() * RHY.length)], end = bar % 4 === 3;
    let deg = Math.floor(r() * 4) + 2; const out = [];
    (end ? [0, 4, 8] : rh).forEach((st, i, arr) => { deg = Math.max(0, Math.min(scale.length - 1, deg + Math.floor(r() * 5) - 2)); if (end && i === arr.length - 1) deg = scale.indexOf(lo) >= 0 ? scale.indexOf(lo) : 0; out.push([st, scale[deg], ((arr[i + 1] != null ? arr[i + 1] : 16) - st)]); });
    return out;
  };
  const SC = {
    // 陽音階（D E G A B）；晚上是陰音階（A B♭ D E F）；標題是 D 的都節（D E♭ G A B♭）
    yo: [62, 64, 67, 69, 71, 74, 76, 79], in: [57, 58, 62, 64, 65, 69, 70, 74], miyako: [62, 63, 67, 69, 70, 74, 75, 79]
  };
  const SCENES = {
    title: { bpm: 70, bus: null, step(s, t, d, L) {
      const bar = Math.floor(s / 16), st = s % 16;
      if (st === 0) { pad(bar % 2 ? [50, 57, 62] : [46, 53, 58], t, d * 16, 0.05, L, 700); taiko(t, 0.22, L); if (bar % 4 === 3) taiko(t + d * 2, 0.14, L, 100); }
      if (st % 2 === 0 && (st / 2) % 4 !== 3) koto(SC.miyako[(st / 2 + bar * 3) % 5] - 12, t, d * 3, 0.06, L, 0.6);
      phrase(SC.miyako, bar, 3, 62).forEach(([k, m, len]) => { if (k === st && bar % 2 === 1) koto(m, t, d * len * 0.9, 0.09, L); });
    } },
    day: { bpm: 88, bus: null, step(s, t, d, L) {
      const bar = Math.floor(s / 16), st = s % 16, ch = [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]][bar % 4];
      if (st === 0) { pad(ch.slice(1), t, d * 16, 0.035, L, 1100); bass(ch[0] - 12 + 12, t, d * 6, 0.12, L); }
      if (st === 8) bass(ch[0] + 7, t, d * 6, 0.1, L);
      if (st % 4 === 2) woodTick(t, 0.025, L);
      phrase(SC.yo, bar, daySeed(), 62).forEach(([k, m, len]) => { if (k === st) koto(m, t, d * len * 0.95, 0.1, L); });
      if (st % 4 === 0 && bar % 8 >= 4) koto(ch[2] + 12, t, d * 3, 0.035, L);
    } },
    interior: { bpm: 80, bus: null, step(s, t, d, L) {
      const bar = Math.floor(s / 16), st = s % 16, ch = [[50, 57, 62], [43, 55, 59], [45, 52, 57], [50, 54, 57]][bar % 4];
      if (st === 0) { pad(ch, t, d * 16, 0.03, L, 800); bass(ch[0] - 12, t, d * 8, 0.08, L); }
      if (st % 4 === 0) koto(ch[(st / 4) % 3] + 12, t, d * 4, 0.05, L);
      phrase(SC.yo, bar, daySeed() + 3, 62).forEach(([k, m, len]) => { if (k === st && bar % 2 === 0) koto(m, t, d * len, 0.06, L); });
    } },
    night: { bpm: 62, bus: null, step(s, t, d, L) {
      const bar = Math.floor(s / 16), st = s % 16;
      if (st === 0) { pad(bar % 2 ? [45, 52, 57] : [46, 53, 58], t, d * 16, 0.03, L, 600); bass(bar % 2 ? 33 : 34, t, d * 12, 0.09, L, 'sine'); }
      if (st % 4 === 0) koto(SC.in[(bar * 2 + st / 4) % 5], t, d * 5, 0.05, L, 0.7);
      phrase(SC.in, bar, daySeed() + 11, 57).forEach(([k, m, len]) => { if (k === st && bar % 4 !== 1) koto(m + 12, t, d * len * 1.2, 0.07, L, 0.7); });
      if (st === 8 && Math.random() < 0.3) bell(SC.in[Math.floor(Math.random() * 5)] + 24, t, 0.03, L, 3);
    } },
    // 遺跡：持續音（另外開著，在 drone() 裡）＋零星的回音、水滴；心跳和戰鬥層照緊張程度
    ruin: { bpm: 120, bus: null, step(s, t, d, L) {
      const st = s % 16, bar = Math.floor(s / 16), run = W().run, aware = run ? run.aware / 100 : 0, th = threat;
      if (st === 0 && bar % 2 === 0 && Math.random() < 0.55) bell(SC.in[Math.floor(Math.random() * 5)] + (Math.random() < 0.5 ? 12 : 24), t + Math.random() * 0.5, 0.025, L, 3.5);
      if (st === 6 && Math.random() < 0.12) { const fl = noiseHit(t, 1.2, 0.04, L, 'bandpass', 300, 4); fl.frequency.exponentialRampToValueAtTime(120, t + 1.2); }
      if (st === 10 && Math.random() < 0.15) sweep('sine', 2400 + Math.random() * 800, 1800, t, 0.12, 0.02, L);   // 水滴
      // 心跳：佩特拉的注意過半就聽得到，越高越快
      if (aware > 0.45) { const per = aware > 0.85 ? 4 : aware > 0.7 ? 8 : 16; if (s % per === 0) { sweep('sine', 70, 40, t, 0.18, 0.12 * aware, L); sweep('sine', 64, 38, t + d * 1.2, 0.16, 0.08 * aware, L); } }
      // 戰鬥層：太鼓＋低音；有核心或領主在的時候再加和弦
      if (th > 0.05) {
        const C = combat; C.gain.gain.setTargetAtTime(Math.min(1, th) * 0.9, t, 0.4);
        if (st === 0 || st === 6 || st === 8 || (st === 14 && th > 0.6)) taiko(t, st === 0 ? 0.3 : 0.2, C.gain);
        if (st === 4 || st === 12) noiseHit(t, 0.07, 0.08, C.gain, 'highpass', 2500);
        if (st % 2 === 0) bass([45, 45, 48, 45, 43, 45, 40, 43][(st / 2) % 8] - 12, t, d * 1.6, 0.14, C.gain, 'sawtooth');
        if (boss && st === 0) pad([57, 60, 64], t, d * 6, 0.05, C.gain, 1600);
        if (boss && st === 8 && bar % 2) pad([55, 59, 62], t, d * 6, 0.05, C.gain, 1600);
      } else combat.gain.gain.setTargetAtTime(0, t, 0.6);
    } }
  };
  const combat = { gain: null };
  let threat = 0, boss = false;
  // 遺跡的持續音：兩個低音鋸齒波過低通，濾波器慢慢擺動
  let drone = null;
  const droneOn = (on, L) => {
    if (on && !drone) {
      const run = W().run, deep = run && run.grade && run.grade.lv >= 3, root = deep ? 33 : 38, t = ctx.currentTime;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 3); lp.connect(g); g.connect(L);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 120; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      const os = [osc('sawtooth', mtof(root), t, t + 3600, lp, -8), osc('sawtooth', mtof(root + 7), t, t + 3600, lp, 5), osc('sine', mtof(root - 12), t, t + 3600, lp)];
      if (deep) os.push(osc('sawtooth', mtof(root + 6), t, t + 3600, lp, 3));   // 越深越不和諧
      drone = { g, os: os.concat([lfo]) };
    } else if (!on && drone) { const d = drone, t = ctx.currentTime; d.g.gain.setTargetAtTime(0, t, 0.6); setTimeout(() => d.os.forEach(o => { try { o.stop(); } catch (e) { } }), 3000); drone = null; }
  };

  // ---------- 排程：每 50 毫秒排下一小段 ----------
  let scene = null, nextT = 0, stepN = 0;
  const busOf = name => { const S = SCENES[name]; if (!S.bus) { S.bus = ctx.createGain(); S.bus.gain.value = 0; S.bus.connect(musicBus); } return S.bus; };
  const setScene = name => {
    if (name === scene || !ctx) return;
    const t = ctx.currentTime;
    if (scene) busOf(scene).gain.setTargetAtTime(0, t, 0.7);
    scene = name; if (!name) return;
    const b = busOf(name); b.gain.cancelScheduledValues(t); b.gain.setTargetAtTime(1, t, 0.7);
    if (!combat.gain) { combat.gain = ctx.createGain(); combat.gain.gain.value = 0; combat.gain.connect(busOf('ruin')); }
    droneOn(name === 'ruin', busOf('ruin'));
    nextT = t + 0.1; stepN = 0;
  };
  const tick = () => {
    if (!ctx || !scene || ctx.state !== 'running') return;
    const S = SCENES[scene], d = 60 / S.bpm / 4, L = busOf(scene);
    while (nextT < ctx.currentTime + 0.25) { try { S.step(stepN, nextT, d, L); } catch (e) { R.AUDIO.err = scene + ': ' + e.message; } nextT += d; stepN++; }
  };
  // 現在在哪個畫面：標題／城裡（白天、晚上）／店裡／遺跡
  const vis = id => { const el = $(id); return !!el && !el.hidden; };
  const watch = () => {
    if (!ctx) return; applyVol();
    const w = W();
    let name = scene;
    if (vis('title') || (vis('pick') && !w.town)) name = 'title';
    else if (w.run && vis('run')) name = 'ruin';
    else if (vis('hub')) name = 'interior';
    else if (w.town && vis('run')) { if (w.inside) name = 'interior'; else { const h = R.hourNow ? ((R.hourNow() % 24) + 24) % 24 : 12; name = h >= 6 && h < 18.5 ? 'day' : 'night'; } }
    setScene(name);
    // 緊張程度：附近醒著的遺跡生物；核心或領主在附近就是最大
    if (w.run && w.P) { let n = 0; boss = false; (w.enemies || []).forEach(e => { if (e.dead || !e.aggro || e.def.human && !e.aggro) return; const dd = Math.hypot(e.x - w.P.x, e.z - w.P.z); if (dd < 16) { n += e.def.elite ? 3 : 1; if (e.def.boss) boss = true; } }); threat = boss ? 1 : Math.min(1, n / 5); } else { threat = 0; boss = false; }
  };

  // ---------- 音效 ----------
  const last = {};
  const limit = (k, ms) => { const n = performance.now(); if (last[k] && n - last[k] < ms) return false; last[k] = n; return true; };
  const FX = {
    hit: t => { noiseHit(t, 0.06, 0.22, sfxBus, 'bandpass', 1100, 1.2); sweep('sine', 160, 70, t, 0.08, 0.2, sfxBus); },
    crit: t => { FX.hit(t); sweep('triangle', 1900, 1400, t, 0.12, 0.08, sfxBus); },
    kill: t => { const f = noiseHit(t, 0.28, 0.18, sfxBus, 'lowpass', 2200); f.frequency.exponentialRampToValueAtTime(260, t + 0.28); sweep('sine', 420, 120, t, 0.18, 0.1, sfxBus); },
    hurt: t => { sweep('square', 230, 110, t, 0.14, 0.06, sfxBus); noiseHit(t, 0.1, 0.16, sfxBus, 'lowpass', 900); },
    roll: t => { const f = noiseHit(t, 0.26, 0.14, sfxBus, 'bandpass', 400, 2); f.frequency.exponentialRampToValueAtTime(1700, t + 0.24); },
    levelup: t => [62, 66, 69, 74, 78].forEach((m, i) => koto(m + 12, t + i * 0.08, 0.6, 0.12, sfxBus, 0.6)),
    lock: t => { sweep('sawtooth', 70, 110, t, 0.7, 0.06, sfxBus); noiseHit(t + 0.05, 0.5, 0.08, sfxBus, 'bandpass', 600, 3); },
    unlock: t => [69, 74, 81].forEach((m, i) => bell(m, t + i * 0.07, 0.05, sfxBus, 1)),
    boom: t => { const f = noiseHit(t, 0.7, 0.32, sfxBus, 'lowpass', 900); f.frequency.exponentialRampToValueAtTime(120, t + 0.6); sweep('sine', 90, 35, t, 0.6, 0.3, sfxBus); },
    thunder: t => { noiseHit(t, 0.12, 0.3, sfxBus, 'highpass', 2500); FX.boom(t + 0.05); },
    react: t => { const f = noiseHit(t, 2.2, 0.2, sfxBus, 'lowpass', 160); f.frequency.linearRampToValueAtTime(60, t + 2); sweep('sawtooth', 48, 36, t, 2, 0.1, sfxBus); },
    alarm: t => { const o = sweep('square', 900, 1300, t, 0.7, 0.05, sfxBus); o.frequency.setValueAtTime(900, t + 0.2); o.frequency.exponentialRampToValueAtTime(1300, t + 0.45); },
    bell: t => { [0, 0.18].forEach(o => { bell(100, t + o, 0.05, sfxBus, 0.5); sweep('sine', 2600, 2550, t + o, 0.3, 0.04, sfxBus); }); },
    bark: t => [0, 0.2].forEach(o => { sweep('square', 330, 190, t + o, 0.1, 0.05, sfxBus); noiseHit(t + o, 0.08, 0.1, sfxBus, 'bandpass', 700, 2); }),
    meow: t => { const o = sweep('triangle', 700, 560, t, 0.45, 0.05, sfxBus); o.frequency.setValueAtTime(700, t); o.frequency.linearRampToValueAtTime(950, t + 0.15); o.frequency.exponentialRampToValueAtTime(560, t + 0.45); },
    caw: t => [0, 0.25].forEach(o => noiseHit(t + o, 0.15, 0.1, sfxBus, 'bandpass', 1200, 6)),
    stairs: t => [0, 0.12, 0.24, 0.36].forEach((o, i) => noiseHit(t + o, 0.06, 0.1 - i * 0.015, sfxBus, 'lowpass', 600)),
    crystal: t => { bell(86, t, 0.05, sfxBus, 0.6); bell(91, t + 0.06, 0.04, sfxBus, 0.6); },
    ui: t => sweep('sine', 900, 700, t, 0.05, 0.04, sfxBus),
    death: t => { [64, 60, 57, 52].forEach((m, i) => koto(m - 12, t + i * 0.22, 1.2, 0.12, sfxBus, 0.8)); sweep('sine', 120, 40, t, 1.4, 0.15, sfxBus); }
  };
  const sfx0 = R.sfx;
  R.sfx = k => { if (!ctx || muted()) { if (sfx0) sfx0(k); return; } if (FX[k]) { try { FX[k](ctx.currentTime + 0.005); } catch (e) { } } else if (sfx0) sfx0(k); };
  const play = (k, ms) => { if (!ctx || muted() || !limit(k, ms || 40)) return; try { FX[k](ctx.currentTime + 0.005); } catch (e) { } };
  R.playSfx = play;

  // ---------- 接到遊戲裡的事件 ----------
  const he = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { const h0 = e && e.hp; const r = he(e, raw, o); if (e && e.hp < h0 && !e.dead) play(R.lastCrit ? 'crit' : 'hit', 45); return r; };
  const ke = R.killEnemy;
  R.killEnemy = (e, by) => { const was = e && !e.dead; const r = ke(e, by); if (was && e.dead) play(e.def.boss ? 'boom' : 'kill', 60); return r; };
  const hp = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const P = W().P, h0 = P && P.hp; const r = hp(raw, src, o); if (P && P.hp < h0) play(P.hp <= 0 ? 'death' : 'hurt', 120); return r; };
  const dg = R.dodge;
  if (dg) R.dodge = (...a) => { const P = W().P, c0 = P && P.dodgeCd; const r = dg(...a); if (P && P.dodgeCd > (c0 || 0)) play('roll', 100); return r; };
  const gx = R.gainXp;
  R.gainXp = v => { const S = R.S, st = S && S.classes[S.cls], lv = st && st.lv; gx(v); if (st && st.lv > lv) play('levelup', 300); };
  const rc = R.react;
  if (rc) R.react = (...a) => { const run = W().run, was = run && run.reacting; const r = rc(...a); if (run && run.reacting && !was) play('react', 1000); return r; };
  const lr = R.lockRoom;
  if (lr) R.lockRoom = (r, on) => { const was = r && r.locked; const out = lr(r, on); if (r && !!r.locked !== !!was) play(r.locked ? 'lock' : 'unlock', 200); return out; };
  const ex = R.explode;
  if (ex) R.explode = s => { const r = ex(s); play('boom', 80); return r; };
  const lf = R.loadFloor;
  if (lf) R.loadFloor = (f, o) => { const r = lf(f, o); if (f > 0) play('stairs', 300); return r; };

  // ---------- 音量（暫停選單） ----------
  const volRow = () => '<div class="vol-row"><label>音樂<input type="range" min="0" max="100" value="' + Math.round(VOL.music * 100) + '" data-vol="music"></label><label>音效<input type="range" min="0" max="100" value="' + Math.round(VOL.sfx * 100) + '" data-vol="sfx"></label></div>';
  const addVol = () => {
    const sheet = $('r-sheet'); if (!sheet || sheet.querySelector('.vol-row')) return;
    const box = document.createElement('div'); box.innerHTML = volRow(); const row = sheet.querySelector('.row'); (row || sheet).before(box.firstChild);
    sheet.querySelectorAll('[data-vol]').forEach(inp => { inp.oninput = () => { VOL[inp.dataset.vol] = +inp.value / 100; applyVol(); saveVol(); }; inp.onchange = () => { if (inp.dataset.vol === 'sfx') play('ui', 0); }; });
  };
  const ps = R.pauseSheet; if (ps) R.pauseSheet = (...a) => { const r = ps(...a); addVol(); return r; };
  const tmu = R.townMenu; if (tmu) R.townMenu = (...a) => { const r = tmu(...a); addVol(); return r; };
  R.AUDIO = { VOL, setScene: n => setScene(n), get scene() { return scene; }, get ctx() { return ctx; } };
})(window.R);
