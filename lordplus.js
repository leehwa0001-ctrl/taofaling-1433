// 領主體：全方面增強、專屬裝備、專屬戰鬥音樂（2026-10-04 作者：領主體再全方面增強，並有獨自的裝備和戰鬥音樂）
// - 增強（11 種領主體）：生命 ×1.6、傷害 ×1.25、移動 ×1.1、護甲 +10%（最多 45%）、魔抗 25%（dmgtype.js）、經驗 ×1.5。
//   暈眩最多 0.5 秒，暈過一次之後 4 秒內不會再暈（霸體）。血剩 35% 以下發狂：傷害再 +20%、移動 +20%，身上冒紅光。
// - 專屬裝備：每一種領主體一件（傳說稀有度的防具，名字和效果固定）。第一次打倒一定掉，之後三成五。
// - 專屬戰鬥音樂：領主體醒著、在 20 公尺內，原本的音樂先停（R.musicHold），換成那一隻的曲子——
//   音階、速度、旋律、音色照領主體決定（每一隻都不一樣）；發狂後鼓更密、旋律高八度。瀏覽器即時合成，不用音檔。
// 放在 lords.js、data.js、items.js、dmgtype.js、audio.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, rnd = Math.random;
  const isLord = d => !!(d && /^領主體/.test(d.name || ''));
  // ---------- 增強 ----------
  Object.values(R.ENEMIES).forEach(d => {
    if (!isLord(d) || d.lordPlus) return; d.lordPlus = 1;
    d.hp = Math.round(d.hp * 1.6); d.dmg = Math.round(d.dmg * 1.25); d.speed = (d.speed || 0) * 1.1; d.armor = Math.min(0.45, (d.armor || 0) + 0.1); d.mres = 0.25; d.xp = Math.round((d.xp || 85) * 1.5);
  });
  // ---------- 專屬裝備 ----------
  // [領主體 id, 名字, 底子, 效果, 說明]
  const GEAR = {
    tsuchigumo: ['巢織絲衣', 'body_robe', { mdef: 5, slow: 0.15 }, '魔防 +5、打中時 15% 機率讓敵人減速'],
    omukade: ['千節護腿', 'legs_skirt', { speed: 0.08, dodge: 0.15 }, '移動 +8%、翻滾冷卻 −15%'],
    gashadokuro: ['巨骸胸甲', 'body_heavy', { hp: 0.15, def: 6 }, '生命 +15%、物防 +6'],
    frostdeer: ['霜冠', 'head_horn', { mdef: 3, slow: 0.2 }, '魔防 +3、打中時 20% 機率讓敵人減速'],
    lavajaw: ['熔顎戰靴', 'feet_war', { burn: 0.2, dmg: 0.05 }, '打中時 20% 機率燃燒、傷害 +5%'],
    sandwhale: ['沙暴披衣', 'body_light', { dodgeHit: 0.4, speed: 0.06 }, '翻滾後 1.5 秒內的下一擊 +40%、移動 +6%'],
    kraken: ['王蛸墨袍', 'body_robe', { matk: 0.12, mpRegen: 1 }, '魔法傷害 +12%、每秒回復魔力 +1'],
    faceforest: ['萬面冠', 'head_plume', { regen: 1.5, calm: 0.15 }, '每秒回復生命 +1.5、佩特拉的注意上升 −15%'],
    bonewyvern: ['朽翼護脛', 'legs_wrap', { speed: 0.1, crit: 0.05 }, '移動 +10%、暴擊率 +5%'],
    thunderape: ['雷鳴戰靴', 'feet_war', { stun: 0.15, patk: 0.1 }, '打中時 15% 機率暈眩、物理傷害 +10%'],
    windelder: ['緋面', 'head_light', { critMult: 0.3, skillCd: 0.1 }, '暴擊傷害 +30%、技能冷卻 −10%']
  };
  R.LORD_GEAR = GEAR;
  const NUM = { speed: (P, v) => { P.speed *= 1 + v; }, dmg: (P, v) => { P.dmgMult *= 1 + v; }, def: (P, v) => { P.def = (P.def || 0) + v; }, mdef: (P, v) => { P.mdef = (P.mdef || 0) + v; }, hp: (P, v) => { P.hpMax = Math.round(P.hpMax * (1 + v)); },
    crit: (P, v) => { if (P.ws) P.ws.crit = (P.ws.crit || 0) + v; }, critMult: (P, v) => { P.critMult += v; }, dodge: (P, v) => { P.dodgeCdMax *= 1 - v; }, skillCd: (P, v) => { P.skillCdMult *= 1 - v; },
    mpRegen: (P, v) => { P.mpRegen = (P.mpRegen || 0) + v; }, regen: (P, v) => { P.regen = (P.regen || 0) + v; }, calm: (P, v) => { P.calm = (P.calm || 0) + v; }, matk: (P, v) => { P.matk = (P.matk || 1) + v; }, patk: (P, v) => { P.patk = (P.patk || 1) + v; } };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const eq = R.equipped(cls), pv = Object.assign({}, P.pv || {});
      R.GEAR_KEYS.forEach(k => { const it = eq[k], g = it && it.lord && GEAR[it.lord]; if (!g) return; Object.keys(g[2]).forEach(f => { if (NUM[f]) NUM[f](P, g[2][f]); else pv[f] = (pv[f] || 0) + g[2][f]; }); });
      P.pv = pv;
    } catch (e) { }
    return P;
  };
  const nm0 = R.itemName;
  R.itemName = it => (it && it.lord && GEAR[it.lord] && it.identified !== false ? '【領主】' + GEAR[it.lord][0] + (it.plus ? ' +' + it.plus : '') : nm0(it));
  const il0 = R.itemLines;
  R.itemLines = it => { const L = il0(it); try { if (it && it.lord && GEAR[it.lord]) L.push('領主體「' + (R.ENEMIES[it.lord] ? R.ENEMIES[it.lord].name.replace(/^領主體・/, '') : it.lord) + '」的專屬裝備：' + GEAR[it.lord][3]); } catch (e) { } return L; };
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by);
    try {
      const run = W().run, s = S(), g = e && GEAR[e.id];
      if (was && e.dead && run && g && isLord(e.def)) {
        s.lordGot = s.lordGot || {}; const first = !s.lordGot[e.id];
        if (first || rnd() < 0.35) {
          s.lordGot[e.id] = (s.lordGot[e.id] || 0) + 1;
          const it = R.makeItem({ kind: 'armor', base: g[1], ilvl: Math.max(1, (run.grade.lv || 1) * 2 + run.floor + 3), rarity: 4, identified: true }); it.lord = e.id;
          setTimeout(() => { if (W().run === run) { R.dropItem(it, e.x, e.z + 1); R.banner && R.banner('掉了專屬裝備', '【領主】' + g[0] + '：' + g[3]); } }, 900);
        }
      }
    } catch (err) { console.warn('[lordplus]', err); }
    return r;
  };
  // ---------- 霸體、發狂 ----------
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(); if (!w.run || w.paused) return;
    let fight = null;
    (w.enemies || []).forEach(e => {
      if (e.dead || !isLord(e.def)) return;
      if (e.st) {
        if (e.st.stun > 0) { if (!e.lpStun) { if ((e.lpImm || 0) > 0) e.st.stun = 0; else { e.lpStun = 1; e.st.stun = Math.min(e.st.stun, 0.5); e.lpImm = 4.5; } } } else e.lpStun = 0;
        if (e.st.root > 0.5) e.st.root = 0.5;
        e.lpImm = (e.lpImm || 0) - dt;
      }
      if (!e.lpRage && e.hp < e.hpMax * 0.35) { e.lpRage = 1; e.dmg = Math.round(e.dmg * 1.2); e.speed = (e.speed || 0) * 1.2; R.banner && R.banner(e.def.name + '發狂了', '剩下的血不多了——牠的攻擊更重、更快'); R.shake && R.shake(0.4); }
      if (e.lpRage) { e.lpFx = (e.lpFx || 0) - dt; if (e.lpFx <= 0) { e.lpFx = 1.2; R.fx && R.fx('ring', e.x, 0.1, e.z, { r: (e.def.size || 2) * 0.9, color: '#FF3A3A' }); } }
      if (w.P && e.aggro && Math.hypot(e.x - w.P.x, e.z - w.P.z) < 20) fight = e;
    });
    music(fight, dt);
  };
  // ---------- 戰鬥音樂 ----------
  let M = null, held = false, offT = 0, noise = null;
  const hash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const MODES = [[0, 2, 3, 5, 7, 8, 11], [0, 1, 3, 5, 7, 8, 10], [0, 2, 3, 5, 7, 9, 10], [0, 1, 5, 7, 8], [0, 3, 5, 6, 7, 10]];
  const RHY = [[0, 2, 4, 6, 8, 12], [0, 3, 6, 8, 10, 12, 14], [0, 4, 6, 8, 12], [0, 2, 3, 6, 8, 11, 12, 14], [0, 6, 8, 10, 12, 14]];
  const themeOf = id => {
    const h = hash(id || 'lord'), r = rng(h);
    const scale = MODES[h % MODES.length], root = 40 + (h >> 3) % 8;
    return { id, scale, root, bpm: 132 + Math.floor(r() * 26), lead: ['sawtooth', 'square', 'triangle'][(h >> 5) % 3], seed: h, prog: [[0, 0, 5, 4], [0, 3, 4, 0], [0, 5, 3, 4], [0, 1, 0, 4]][(h >> 7) % 4], taiko: (h >> 9) % 2 };
  };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const vol = () => (R.isMuted && R.isMuted() ? 0 : ((R.AUDIO && R.AUDIO.VOL && R.AUDIO.VOL.music) != null ? R.AUDIO.VOL.music : 0.5));
  const env = (ctx, t, a, peak, dec, dest) => { const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); g.connect(dest); return g; };
  const tone = (ctx, type, f, t, dur, g, f2) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); o.connect(g); o.start(t); o.stop(t + dur + 0.05); return o; };
  const nz = (ctx, t, dur, v, dest, type, freq) => { if (!noise) { const n = ctx.sampleRate, b = ctx.createBuffer(1, n, n), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = rnd() * 2 - 1; noise = b; } const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; s.connect(f); f.connect(env(ctx, t, 0.002, v, dur, dest)); s.start(t); s.stop(t + dur + 0.05); };
  const degree = (th, d) => { const n = th.scale.length, o = Math.floor(d / n), k = ((d % n) + n) % n; return th.root + 12 * o + th.scale[k]; };
  const melody = (th, bar) => {   // 四小節一句：A A B 收尾
    const part = bar % 4, motif = part === 2 ? 2 + (Math.floor(bar / 4) % 2) : part === 3 ? 9 : 0, r = rng(th.seed * 13 + motif), rh = RHY[Math.floor(r() * RHY.length)];
    let d = 7 + Math.floor(r() * 4); const out = [];
    rh.forEach((st, i) => { d += Math.floor(r() * 5) - 2; if (part === 3 && i === rh.length - 1) d = 7; out.push([st, Math.max(3, Math.min(13, d)), (rh[i + 1] != null ? rh[i + 1] : 16) - st]); });
    return out;
  };
  const stepMusic = (s, t, d) => {
    const ctx = M.ctx, th = M.th, out = M.bus, bar = Math.floor(s / 16), st = s % 16, rage = M.rage, chordDeg = th.prog[bar % 4];
    // 鼓：大鼓（或太鼓）、小鼓、鈸
    if (st === 0 || st === 8 || (st === 10 && bar % 2) || (rage && st % 4 === 0)) { if (th.taiko) { tone(ctx, 'sine', 95, t, 0.35, env(ctx, t, 0.003, 0.5, 0.3, out), 52); nz(ctx, t, 0.08, 0.12, out, 'lowpass', 400); } else tone(ctx, 'sine', 130, t, 0.18, env(ctx, t, 0.002, 0.55, 0.16, out), 42); }
    if (st === 4 || st === 12) { nz(ctx, t, 0.13, 0.22, out, 'highpass', 1600); tone(ctx, 'triangle', 210, t, 0.08, env(ctx, t, 0.001, 0.12, 0.07, out), 160); }
    if (st % 2 === 0 || rage) nz(ctx, t, 0.03, rage ? 0.05 : 0.035, out, 'highpass', 7000);
    // 低音：八分音符跟著和弦根音
    if (st % 2 === 0) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; f.connect(env(ctx, t, 0.005, 0.2, d * 1.6, out)); tone(ctx, 'sawtooth', mtof(degree(th, chordDeg) - 12), t, d * 1.8, f); }
    // 和弦：每小節第一拍
    if (st === 0) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1300; f.connect(env(ctx, t, 0.08, 0.06, d * 14, out)); [0, 2, 4].forEach((k, i) => tone(ctx, 'sawtooth', mtof(degree(th, chordDeg + k) + 12) * (1 + (i - 1) * 0.003), t, d * 15, f)); }
    // 旋律
    melody(th, bar).forEach(([k, deg, len]) => { if (k !== st) return; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = th.lead === 'sawtooth' ? 2400 : 3200; f.connect(env(ctx, t, 0.01, th.lead === 'triangle' ? 0.16 : 0.09, d * len * 0.9, out)); tone(ctx, th.lead, mtof(degree(th, deg) + 12 + (rage ? 12 : 0)), t, d * len, f); });
  };
  const music = (lord, dt) => {
    const ctx = R.AUDIO && R.AUDIO.ctx;
    if (lord) offT = 3; else offT -= dt;
    const want = !!(ctx && ctx.state === 'running' && (lord || (M && offT > 0)) && W().run && !W().run.done);
    if (want && !M) {
      if (R.musicHold) return;   // 別人（卡拉 OK）先停了音樂
      R.musicHold = true; held = true;
      const bus = ctx.createGain(); bus.gain.value = 0.0001; bus.connect(ctx.destination); bus.gain.setTargetAtTime(0.55 * vol(), ctx.currentTime, 0.8);
      M = { ctx, bus, th: themeOf(lord.id), nextT: ctx.currentTime + 0.1, s: 0, rage: false, lord };
      M.iv = setInterval(() => { if (!M) return; const th = M.th, d = 60 / (th.bpm * (M.rage ? 1.08 : 1)) / 4; M.bus.gain.setTargetAtTime(0.55 * vol(), M.ctx.currentTime, 0.3); while (M.nextT < M.ctx.currentTime + 0.25) { try { stepMusic(M.s, M.nextT, d); } catch (e) { } M.nextT += d; M.s++; } }, 50);
    }
    if (M && lord) { if (lord !== M.lord && lord.id !== M.th.id) { M.th = themeOf(lord.id); } M.lord = lord; M.rage = !!lord.lpRage; }
    if (!want && M) { const m = M; M = null; clearInterval(m.iv); m.bus.gain.setTargetAtTime(0.0001, m.ctx.currentTime, 0.6); setTimeout(() => { try { m.bus.disconnect(); } catch (e) { } }, 3000); if (held) { R.musicHold = false; held = false; } }
  };
  R.lordMusicDebug = { themeOf, get M() { return M; } };
})(window.R);
