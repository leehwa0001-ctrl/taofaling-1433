// 吟遊詩人的音樂感（2026-10-09 作者：普攻子彈是上下飄動的音符；施法的時候照技能有不同的曲子、照武器有不同的音色）
// - 普攻：射出去的是音符（♪♫），一邊飛一邊上下飄；顏色照樂器（魯特琴金、長笛淡藍、豎琴粉紅）。
//   2026-10-10 作者：普攻音符的效果挺不明顯的，可以加個顏色——改成一顆一顆輪流換的彩虹色（紅、橘、黃、綠、藍、紫），大一點、白色蓋得少一點，
//   飛的時候灑同色的小光點，打中或飛完的地方炸一小圈同色的光（fx1010.js 的粒子，一次畫完）。
// - 放技能：彈一小段這一招自己的旋律（照技能編號固定，同一招每次都一樣），音色照武器——魯特琴撥弦、長笛吹、豎琴琶音、其他撥弦。
// - 樂句演奏出曲子（classcore2.js 的 CORE.bard.play）：每一首曲子有自己的一段（進行曲、安魂曲、戰歌、疾風曲、鎮魂鐘、終章）。
// - 施法前搖：只做聲音和揮手，不延遲技能（延遲會讓手感變差；作者說要不要調整看 Claude）。
// 聲音用 audio.js 的 R.playMelody（沒開聲音、還沒點過畫面就不響）。放在 classcore2.js、skillbook.js、combat.js、audio.js 後面。
(function (R) {
  const W = () => R.W;
  const INST = { lute: 'pluck', flute: 'flute', harp: 'harp' };
  const COL = { lute: '#FFE08A', flute: '#BFE8FF', harp: '#FFB8E0' };
  const instOf = P => INST[P && P.item && P.item.base] || 'pluck';
  const colOf = P => COL[P && P.item && P.item.base] || '#FFE8A0';
  const RAIN = ['#FF2E55', '#FF8A00', '#FFD000', '#1ED760', '#1A9CFF', '#8A4DFF'];   // 普攻音符輪流換的顏色
  // ---------- 音符的樣子（精靈圖：一直面向鏡頭） ----------
  const TEX = {};
  const noteTex = (glyph, col) => {
    const k = glyph + col; if (TEX[k]) return TEX[k];
    const TH = THREE, c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.font = 'bold 50px "Segoe UI Symbol","Noto Sans Symbols","Apple Symbols",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = col; g.shadowBlur = 18; g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = '#1A1020'; g.strokeText(glyph, 32, 34); g.shadowBlur = 0; g.fillStyle = col; g.fillText(glyph, 32, 34); g.fillStyle = '#FFFFFF'; g.globalAlpha = 0.3; g.fillText(glyph, 30, 31);   /* 深色外框：亮的地板上也看得清楚 */
    const t = new TH.CanvasTexture(c); t.userData.shared = true; return (TEX[k] = t);
  };
  const MAT = {};
  const noteMat = (glyph, col) => { const k = glyph + col; if (MAT[k]) return MAT[k]; const m = new THREE.SpriteMaterial({ map: noteTex(glyph, col), transparent: true, depthWrite: false, fog: false, toneMapped: false });   /* 不吃霧、不做色調映射（遺跡的白霧、色調映射會把顏色蓋淡） */ m.userData.shared = true; return (MAT[k] = m); };
  const fi0 = R.fire;
  let flip = 0;
  R.fire = o => {
    const s = fi0(o);
    try {
      const P = W().P;
      if (s && o && o.owner === 'p' && o.primary && P && P.cls === 'bard' && window.THREE && s.mesh && s.mesh.parent) {
        const col = RAIN[flip % RAIN.length], sp = new THREE.Sprite(noteMat(flip++ % 3 ? '♪' : '♫', col)); sp.scale.set(1.25, 1.25, 1); sp.position.copy(s.mesh.position); s.ncol = col;
        s.mesh.parent.add(sp); s.mesh.parent.remove(s.mesh); s.mesh = sp; s.note = 1; s.y0 = s.y; s.ph = Math.random() * 6.28; s.age = 0;
      }
    } catch (e) { }
    return s;
  };
  // 上下飄（碰撞只看 x、z，飄不影響打不打得到）
  const us0 = R.updateShots;
  if (us0) R.updateShots = dt => {
    const FX = R.fx1010, fx = FX && FX.ensure && FX.ensure(), A = fx ? FX.sys()[0] : null, live = [];
    try { (W().shots || []).forEach(s => { if (s.note && !s.dead) { s.age += dt; s.y = s.y0 + Math.sin(s.age * 9 + s.ph) * 0.3; live.push(s);
      if (A && s.ncol) { s.tt = (s.tt || 0) + dt; if (s.tt > 0.05) { s.tt = 0; FX.emit(A, s.x, s.y, s.z, (Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 0.8, (Math.random() - 0.5) * 0.8, 0.4, s.ncol, { size: 5, size1: 1 }); } } } }); } catch (e) { }
    const r = us0(dt);
    try { if (A) live.forEach(s => { if (s.dead && s.ncol) { FX.burst(A, s.x, s.y, s.z, 9, 3.2, 0.35, [s.ncol, '#FFFFFF'], { size: 5, size1: 1, up: 1.5 }); FX.emit(A, s.x, s.y, s.z, 0, 0, 0, 0.16, s.ncol, { size: 26, size1: 40, a: 0.7 }); } }); } catch (e) { }
    return r;
  };
  // ---------- 旋律 ----------
  const PENTA = [0, 2, 4, 7, 9];   // 五聲音階
  const hash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const motif = id => {   // 這一招的一小段：四個音，照技能編號固定
    const h = hash(String(id)), root = 62 + (h % 5), out = []; let at = 0, last = 0;   // D4～F#4 起頭，音域一個八度多一點
    for (let i = 0; i < 4; i++) { const d = i === 3 ? 0 : ((h >> (i * 3)) & 7), m = root + [0, 2, 4, 7, 9, 12, 14, 16][d] + (i === 3 ? (last >= 12 ? 12 : 0) : 0); last = m - root; const len = i === 3 ? 0.32 : ((h >> (12 + i)) & 1 ? 0.1 : 0.16); out.push([m, at, len + 0.08]); at += len; }
    return out;
  };
  const SONG = {
    進行曲: [[67, 0, 0.12], [67, 0.15, 0.08], [72, 0.25, 0.14], [76, 0.42, 0.14], [79, 0.6, 0.35]],
    安魂曲: [[76, 0, 0.4], [74, 0.38, 0.4], [72, 0.76, 0.4], [67, 1.14, 0.9]],
    戰歌: [[69, 0, 0.12], [72, 0.12, 0.12], [76, 0.24, 0.12], [81, 0.36, 0.4], [76, 0.62, 0.12], [81, 0.74, 0.5]],
    疾風曲: [[72, 0, 0.07], [74, 0.06, 0.07], [76, 0.12, 0.07], [79, 0.18, 0.07], [81, 0.24, 0.07], [84, 0.3, 0.3]],
    鎮魂鐘: [[60, 0, 1.6], [55, 0.55, 1.8], [60, 1.1, 2.2]],
    終章: [[60, 0, 0.18], [64, 0.1, 0.18], [67, 0.2, 0.18], [72, 0.3, 0.2], [76, 0.42, 0.2], [79, 0.54, 0.25], [84, 0.68, 0.9]]
  };
  const play = (P, notes, vol) => { if (R.playMelody) R.playMelody(instOf(P), notes, vol); };
  // 放技能：冷卻真的開始了才彈（放失敗不彈）
  const cdOf = (P, i) => (i === 0 ? P.skillCd || 0 : (P.skCd && P.skCd[i]) || 0);
  const cs0 = R.castSlot;
  if (cs0) R.castSlot = i => {
    const P = W().P; if (!P || P.cls !== 'bard') return cs0(i);
    const c0 = cdOf(P, i | 0), r = cs0(i);
    try { if (cdOf(P, i | 0) > c0 + 0.01) { const id = R.slotSkill ? R.slotSkill(P, i | 0) : P.skill; play(P, motif(id || 'bd'), 0.09); if (P.h) P.h.recoil = 1; } } catch (e) { }
    return r;
  };
  // 曲子
  const C = R.CORE && R.CORE.bard;
  if (C && C.play) { const p0 = C.play; C.play = function (P, s) { const r = p0.call(this, P, s); try { if (s && SONG[s.n] && R.playMelody) R.playMelody(s.n === '鎮魂鐘' ? 'bell' : instOf(P), SONG[s.n], s.n === '鎮魂鐘' ? 0.12 : 0.1); } catch (e) { } return r; }; }
  R.bardDebug = { motif, SONG, instOf };
})(window.R);
