// 討伐令 1433：卡拉 OK「歌聲」（作者：城市缺的也補一補）
// 繁華街（銀行東邊，city.js 的 FAC.karaoke）的四層樓；裡面是一間包廂：沙發、矮桌、大螢幕、鏡面球。
// 點歌一首 5 費拉。唱歌＝節奏小遊戲：音符從右邊流過來，分高、中、低三條；音符經過左邊那條線的時候，按住對的那條
//   （電腦：J K L 或 ↓ → ↑；手機：下面三顆按鈕）。按對了會聽到自己的歌聲，歌詞跟著變色。分數 S／A／B／C。
// 三首歌（曲和詞都是這個遊戲原創的）：〈雪夜的渡口〉（演歌）、〈站前的霓虹〉（城市流行）、〈勇者證明〉（動畫歌）。
// 唱到 A 以上：心情變好，今天下遺跡魔力稍微多一點（R.S.buff）。R.S.karaoke 記每首歌的最高分。
// 唱歌的時候背景音樂先停（R.musicHold，audio.js 看這個）。
(function (R) {
  const W = R.W, PRICE = 5;
  const PENTA_MAJ = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21], PENTA_MIN = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];
  const SONGS = [
    { k: 'snow', title: '雪夜的渡口', genre: '演歌', bpm: 76, scale: PENTA_MIN, base: 220, bg: ['#0E1630', '#2A3A5A'],
      lines: [['雪落在渡口　船還沒有來', [5, 5, 6, 5, 4, 3, 4, 3, 2, 1], [1, .5, .5, 1, 2, 1, .5, .5, 1, 2]],
        ['提燈照不到　對岸的你', [3, 4, 5, 6, 5, 4, 5, 3, 3], [1, .5, .5, 1, 2, 1, 1, 1, 3]],
        ['東鶴的冬天　這麼長', [6, 6, 7, 6, 5, 4, 3, 4], [1, .5, .5, 1, 2, 1, 1, 3]],
        ['我就在這裡　等到春天', [3, 4, 5, 4, 3, 2, 1, 2, 0], [1, .5, .5, 1, 2, 1, 1, 1, 4]]] },
    { k: 'neon', title: '站前的霓虹', genre: '城市流行', bpm: 112, scale: PENTA_MAJ, base: 262, bg: ['#2A0E3A', '#5A1E5A'],
      lines: [['霓虹燈亮了　站前的廣場', [5, 4, 5, 6, 5, 4, 3, 4, 5, 4], [.5, .5, .5, .5, 1.5, .5, .5, .5, .5, 1.5]],
        ['最後一班車　還有十分鐘', [3, 4, 5, 4, 3, 2, 3, 4, 3, 2], [.5, .5, .5, .5, 1.5, .5, .5, .5, .5, 1.5]],
        ['不要回頭看　今晚的風', [5, 6, 7, 6, 5, 6, 5, 4, 5], [.5, .5, .5, .5, 1.5, .5, .5, .5, 2]],
        ['把我們吹到　天亮以後', [4, 5, 6, 5, 4, 3, 2, 1, 2], [.5, .5, .5, .5, 1.5, .5, .5, 1, 2.5]]] },
    { k: 'hero', title: '勇者證明', genre: '動畫歌', bpm: 140, scale: PENTA_MAJ, base: 247, bg: ['#3A1A0E', '#8A3A1E'],
      lines: [['握緊這把劍　走進黑暗裡', [3, 3, 4, 5, 5, 6, 5, 4, 3, 4], [.5, .5, .5, .5, 1, .5, .5, .5, .5, 1]],
        ['就算會害怕　也不能停下', [4, 4, 5, 6, 6, 7, 6, 5, 4, 5], [.5, .5, .5, .5, 1, .5, .5, .5, .5, 1]],
        ['核心的光芒　照亮了前方', [7, 7, 8, 7, 6, 5, 6, 7, 8, 7], [.5, .5, .5, .5, 1, .5, .5, .5, .5, 1]],
        ['這就是我的　勇者證明', [6, 6, 7, 8, 9, 8, 7, 8, 8], [.5, .5, .5, .5, 1, 1, 1, 1, 3]]] }
  ];
  // 歌詞的每一個字對一個音；「　」的地方空半拍，每一句之間空兩拍
  const build = song => {
    const notes = [], lines = []; let b = 4;
    song.lines.forEach(([txt, degs, durs], li) => {
      const chars = [...txt]; let ni = 0; const L = { txt, chars, start: b, notes: [] };
      chars.forEach((ch, ci) => { if (ch === '　') { b += 0.5; return; } const d = degs[ni], du = durs[ni]; const n = { b, du, deg: d, lane: d <= 3 ? 0 : d <= 6 ? 1 : 2, f: song.base * Math.pow(2, song.scale[d] / 12), li, ci, got: 0 }; notes.push(n); L.notes.push(n); b += du; ni++; });
      L.end = b; lines.push(L); b += 2;
    });
    return { notes, lines, end: b + 1 };
  };

  // ---------- 背景音樂停一下 ----------
  const hold = on => { R.musicHold = !!on; };

  // ---------- 一首歌 ----------
  const LANE_Y = [196, 146, 96], HIT_X = 96, PX_BEAT = 92, CW = 560, CH = 320;
  const LANE_C = ['#5AC8FF', '#FFE070', '#FF7AB8'], LANE_N = ['低', '中', '高'];
  let K = null;
  const sing = song => {
    const S = R.S, $ = id => document.getElementById(id), A = R.AUDIO, ac = A && A.ctx, quiet = !ac || (R.isMuted && R.isMuted());
    R.sheet('<p class="kicker">卡拉 OK「歌聲」・包廂</p><h2>〈' + song.title + '〉</h2><div class="kara"><canvas id="ka-cv" width="' + CW + '" height="' + CH + '"></canvas>'
      + '<div class="row kara-keys"><button type="button" class="btn" data-lane="0">低（J ↓）</button><button type="button" class="btn" data-lane="1">中（K →）</button><button type="button" class="btn" data-lane="2">高（L ↑）</button></div>'
      + '<p class="note">音符經過左邊的線的時候，按住對的那一條。按對了就聽得到自己的歌聲。</p><div class="row"><button type="button" class="btn" id="ka-x">不唱了</button></div></div>', '');
    const sh = $('r-sheet'); if (sh) sh.classList.add('wide');
    const cv = $('ka-cv'), x = cv.getContext('2d'), M = build(song), spb = 60 / song.bpm;
    const st = { held: [0, 0, 0], beat: -1, good: 0, bad: 0, total: M.notes.reduce((s, n) => s + n.du, 0), done: false, t0: 0, last: performance.now(), sparks: [] };
    K = { st, M, song };
    hold(true);
    // 聲音：伴奏（低音、和弦、拍子）先排好；歌聲是一個一直開著的振盪器，按對了才開音量
    let voice = null, vg = null, nodes = [];
    if (!quiet) {
      const t0 = ac.currentTime + 0.15, vol = (A.VOL ? A.VOL.music : 0.5) * 0.9 + 0.1; st.t0 = t0;
      const out = ac.createGain(); out.gain.value = 0.6 * vol; out.connect(ac.destination); nodes.push(out);
      const tone = (f, t, d, type, g0) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(g0, t + 0.02); g.gain.setTargetAtTime(0, t + d * 0.7, d * 0.25); o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.3); };
      const nb = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate), na = nb.getChannelData(0); for (let i = 0; i < na.length; i++) na[i] = (Math.random() * 2 - 1) * (1 - i / na.length);
      const hat = (t, g0) => { const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = nb; f.type = 'highpass'; f.frequency.value = 6000; g.gain.value = g0; s.connect(f); f.connect(g); g.connect(out); s.start(t); };
      const prog = song.scale === PENTA_MIN ? [0, -4, -2, -5] : [0, -3, -7, -5];   // 小調：i–VI–VII–v；大調：I–vi–IV–V（相對主音的半音）
      for (let bt = 0; bt < M.end; bt++) {
        const t = t0 + bt * spb, root = song.base / 2 * Math.pow(2, prog[Math.floor(bt / 4) % 4] / 12);
        tone(root, t, spb * 0.9, 'triangle', 0.18);
        if (bt % 2 === 0) [1, song.scale === PENTA_MIN ? 1.189 : 1.26, 1.498].forEach(m => tone(root * 2 * m, t, spb * 1.8, 'sine', 0.035));
        hat(t + spb / 2, 0.05); if (bt % 2) hat(t, 0.03);
      }
      M.notes.forEach(n => tone(n.f, t0 + n.b * spb, n.du * spb * 0.95, 'triangle', 0.04));   // 導唱（小小聲）
      voice = ac.createOscillator(); vg = ac.createGain(); voice.type = 'sawtooth'; vg.gain.value = 0; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      const vib = ac.createOscillator(), vibG = ac.createGain(); vib.frequency.value = 5.5; vibG.gain.value = 4; vib.connect(vibG); vibG.connect(voice.frequency);
      voice.connect(lp); lp.connect(vg); vg.connect(out); voice.start(); vib.start(); nodes.push(voice, vib);
    }
    const stopAll = () => { hold(false); nodes.forEach(n => { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) { } }); nodes = []; window.removeEventListener('keydown', key, true); window.removeEventListener('keyup', key, true); };
    // 按鍵
    const KEYS = { KeyJ: 0, ArrowDown: 0, KeyK: 1, ArrowRight: 1, KeyL: 2, ArrowUp: 2, Digit1: 0, Digit2: 1, Digit3: 2 };
    const key = e => { if (!(e.code in KEYS)) return; e.preventDefault(); e.stopPropagation(); st.held[KEYS[e.code]] = e.type === 'keydown' ? 1 : 0; };
    window.addEventListener('keydown', key, true); window.addEventListener('keyup', key, true);
    document.querySelectorAll('.kara-keys [data-lane]').forEach(b => { const l = +b.dataset.lane; b.onpointerdown = e => { e.preventDefault(); st.held[l] = 1; b.classList.add('on'); }; const up = () => { st.held[l] = 0; b.classList.remove('on'); }; b.onpointerup = up; b.onpointerleave = up; b.onpointercancel = up; });
    $('ka-x').onclick = () => { stopAll(); K = null; R.closeSheet(); };
    // 一小段時間：dt 是拍數
    const step = (beat, dtB) => {
      st.beat = beat; const cur = M.notes.find(n => beat >= n.b && beat < n.b + n.du);
      let singing = false;
      if (cur) { if (st.held[cur.lane]) { st.good += dtB; cur.got += dtB; singing = true; if (Math.random() < 0.3) st.sparks.push({ x: HIT_X, y: LANE_Y[cur.lane], vx: 40 + Math.random() * 60, vy: -30 + Math.random() * 60, t: 0.5 }); } st.held.forEach((h, l) => { if (h && l !== cur.lane) st.bad += dtB * 0.5; }); }
      else if (st.held.some(Boolean)) st.bad += dtB * 0.15;
      if (vg) { const t = ac.currentTime; vg.gain.setTargetAtTime(singing ? 0.16 : 0, t, 0.03); if (cur) voice.frequency.setTargetAtTime(cur.f, t, 0.02); }
      st.sparks.forEach(p => { p.t -= dtB * spb; p.x += p.vx * dtB * spb; p.y += p.vy * dtB * spb; }); st.sparks = st.sparks.filter(p => p.t > 0);
      if (beat >= M.end && !st.done) { st.done = true; finish(); }
    };
    const draw = () => {
      const beat = st.beat, g = x.createLinearGradient(0, 0, 0, CH); g.addColorStop(0, song.bg[0]); g.addColorStop(1, song.bg[1]); x.fillStyle = g; x.fillRect(0, 0, CW, CH);
      // 背景：卡拉 OK 的影片（下雪、霓虹、火花）
      for (let i = 0; i < 40; i++) { const px = (i * 137 + beat * (song.k === 'snow' ? 6 : 14) * (1 + i % 3)) % CW, py = (i * 71 + beat * (song.k === 'snow' ? 9 : 3)) % CH; x.fillStyle = song.k === 'snow' ? 'rgba(255,255,255,.5)' : song.k === 'neon' ? ['rgba(255,90,180,.35)', 'rgba(90,220,255,.35)'][i % 2] : 'rgba(255,180,90,.4)'; x.fillRect(CW - px, py, song.k === 'snow' ? 2 : 3, song.k === 'snow' ? 2 : 3); }
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 70, CW, 152);
      LANE_Y.forEach((y, l) => { x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(0, y - 14, CW, 28); x.fillStyle = st.held[l] ? LANE_C[l] : 'rgba(255,255,255,.45)'; x.font = 'bold 13px "Noto Sans TC",sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(LANE_N[l], 8, y); });
      x.fillStyle = '#FFFFFF'; x.fillRect(HIT_X - 1, 76, 3, 140);
      M.notes.forEach(n => { const x0 = HIT_X + (n.b - beat) * PX_BEAT, w = n.du * PX_BEAT - 6, oy = ([1.5, 5, 8][n.lane] - n.deg) * 4; if (x0 > CW || x0 + w < 0) return; const on = beat >= n.b && beat < n.b + n.du && st.held[n.lane]; x.fillStyle = on ? '#FFFFFF' : LANE_C[n.lane]; x.globalAlpha = n.b + n.du < beat ? (n.got / n.du > 0.5 ? 0.9 : 0.25) : 1; x.fillRect(x0, LANE_Y[n.lane] - 7 + oy, w, 14); x.globalAlpha = 1; });
      st.sparks.forEach(p => { x.fillStyle = 'rgba(255,240,180,' + Math.min(1, p.t * 2) + ')'; x.fillRect(p.x, p.y, 3, 3); });
      // 歌詞：這一句（唱到的字變色）、下一句
      const li = M.lines.findIndex(L => beat < L.end + 1.5), L = M.lines[Math.max(0, li)], nx = M.lines[li + 1];
      x.textAlign = 'center'; x.textBaseline = 'middle';
      if (L) {
        x.font = 'bold 26px "Noto Serif TC",serif'; const full = x.measureText(L.txt).width; let cx = CW / 2 - full / 2;
        L.chars.forEach((ch, ci) => { const w = x.measureText(ch).width, n = L.notes.find(q => q.ci === ci), sung = n && beat >= n.b; x.fillStyle = '#1A1020'; x.fillText(ch, cx + w / 2 + 2, 262 + 2); x.fillStyle = sung ? (n.got / n.du > 0.5 || beat < n.b + n.du ? '#FFE070' : '#8A8AA0') : '#FFFFFF'; x.fillText(ch, cx + w / 2, 262); cx += w; });
      }
      if (nx) { x.font = '16px "Noto Serif TC",serif'; x.fillStyle = 'rgba(255,255,255,.6)'; x.fillText(nx.txt, CW / 2, 296); }
      x.font = 'bold 14px "Noto Sans TC",sans-serif'; x.textAlign = 'left'; x.fillStyle = '#FFFFFF'; x.fillText('〈' + song.title + '〉' + song.genre, 12, 22);
      x.textAlign = 'right'; x.fillText('分數 ' + score(), CW - 12, 22);
      if (beat < 4) { x.textAlign = 'center'; x.font = 'bold 40px "Noto Sans TC",sans-serif'; x.fillStyle = '#FFE070'; x.fillText(beat < 0 ? '準備' : String(4 - Math.floor(beat)), CW / 2, 150); }
    };
    const score = () => Math.max(0, Math.min(100, Math.round(100 * (st.good - st.bad * 0.6) / st.total)));
    const grade = s => s >= 90 ? 'S' : s >= 75 ? 'A' : s >= 55 ? 'B' : 'C';
    const finish = () => {
      stopAll(); const sc = score(), gd = grade(sc);
      S.karaoke = S.karaoke || {}; const best = S.karaoke[song.k] || 0, nb = sc > best; if (nb) S.karaoke[song.k] = sc;
      let gift = '';
      if (gd === 'S' || gd === 'A') { S.buff = { kind: 'karaoke', b: { mp: gd === 'S' ? 0.06 : 0.04 }, until: S.day }; gift = '唱完心情很好。（今天下遺跡：魔力稍微提高）'; }
      R.save();
      R.sfx && R.sfx(gd === 'S' ? 'chest' : 'pick');
      const msg = { S: '「……包廂外面有人在鼓掌。」', A: '「唱得真好。」', B: '「還不錯。再練練。」', C: '「……音響好像壞了。一定是音響的問題。」' }[gd];
      const box = $('ka-x') && $('ka-x').parentNode; if (!box) return;
      box.innerHTML = '<p style="flex-basis:100%;margin:0 0 6px"><b style="font-size:22px;color:var(--gold)">' + gd + '</b>　' + sc + ' 分' + (nb ? '（新紀錄！）' : '（最高 ' + best + ' 分）') + '　' + msg + (gift ? '<br>' + gift : '') + '</p>'
        + '<button type="button" class="btn pri" id="ka-again">再點一首</button><button type="button" class="btn" id="ka-out">離開包廂</button>';
      $('ka-again').onclick = () => { K = null; R.karaoke(); };
      $('ka-out').onclick = () => { K = null; R.closeSheet(); };
    };
    let lastP = performance.now(), qb = -1.5;
    const frame = tm => {
      if (!document.body.contains(cv) || !R.sheetOpen()) { stopAll(); K = null; return; }
      const dt = Math.min(0.05, (tm - lastP) / 1000); lastP = tm;
      if (!st.done) { const b = quiet ? (qb += dt / spb) : (ac.currentTime - st.t0) / spb, dtB = st.started ? Math.max(0, b - st.beat) : 0; st.started = true; step(b, dtB); }
      draw(); if (!st.done || document.body.contains(cv)) requestAnimationFrame(frame);
    };
    K.debug = { step: (b, dtB) => { step(b, dtB); draw(); }, st, M, finish };
    requestAnimationFrame(frame);
  };

  // ---------- 點歌 ----------
  R.karaoke = () => {
    const S = R.S; S.karaoke = S.karaoke || {};
    R.sheet('<p class="kicker">卡拉 OK「歌聲」・包廂</p><h2>點歌</h2><p class="note">一首 ' + PRICE + ' 費拉。音符經過線的時候按住對的那一條（J K L／↓ → ↑，手機按下面的按鈕）。</p>'
      + SONGS.map((s, i) => '<div class="row ka-song"><b>〈' + s.title + '〉</b><small>' + s.genre + '・' + (s.bpm < 90 ? '慢' : s.bpm < 125 ? '中等' : '快') + (S.karaoke[s.k] ? '・最高 ' + S.karaoke[s.k] + ' 分' : '') + '</small><button type="button" class="mini gold" data-song="' + i + '">唱這首</button></div>').join(''),
      '<div class="row"><button type="button" class="btn" id="ka-no">算了</button></div>');
    document.getElementById('ka-no').onclick = R.closeSheet;
    document.querySelectorAll('[data-song]').forEach(b => { b.onclick = () => { if (S.gold < PRICE) { R.toast('錢不夠（一首 ' + PRICE + ' 費拉）。'); return; } S.gold -= PRICE; R.save(); sing(SONGS[+b.dataset.song]); }; });
  };
  R.karaokeDebug = { get K() { return K; }, SONGS, build };

  // ---------- 街上的大樓 ----------
  const civ0 = R.buildCivic;
  R.buildCivic = api => {
    civ0(api);
    const F = R.CITY.FAC.karaoke; if (!F || !api.civ) return;
    try {
      const { HB, G3, B_, inter } = api, b = api.civ(F[0], F[1], 8.8, 7, 4, { col: '#4A3A5A', win: 1.4, fh: 3.0, doorW: 2.0 });
      api.bigSign(b.x, 4.4, b.front + 0.08, 0, '卡拉OK 歌聲', '#2A0A3A', '#FF7AE0', 6.2, 1.1);
      ['#FF5AB8', '#5AE0FF', '#FFE04A', '#7AFF8A'].forEach((c, i) => HB.add(G3.box, B_(c, { em: c, ei: 1 }), b.x - b.w / 2 + 0.2, 6.2 + i * 2.2, b.front + 0.08, 0.16, 1.6, 0.06));
      for (let i = 0; i < 10; i++) HB.add(G3.box, B_(i % 2 ? '#FF5AB8' : '#5AE0FF', { em: i % 2 ? '#FF5AB8' : '#5AE0FF', ei: 1 }), b.x - 4 + i * 0.9, 3.55, b.front + 0.1, 0.5, 0.12, 0.06);
      inter(b.door[0], b.door[1], 2.2, '走進卡拉 OK「歌聲」', () => R.enterInterior ? R.enterInterior('karaoke') : R.karaoke());
    } catch (e) { console.warn('[karaoke] building', e); }
  };

  // ---------- 包廂 ----------
  const PL = R.INTERIOR_PLACES, FN = R.INTERIOR_FURNISH = R.INTERIOR_FURNISH || {};
  if (PL) {
    PL.karaoke = { name: '卡拉 OK「歌聲」', sub: '三號包廂', hint: '隔壁包廂傳來走音的歌聲', w: 11, d: 8, h: 3.2, wall: '#3A2A4A', cap: '#2A1E36', floor: ['#3A2E44', 'floor'], zoom: 0.78, out: '出去（回到街上）' };
    FN.karaoke = c => {
      const { bx, block, inter, npc, lamp, mesh, TH, HW, HD } = c, K2 = R.INTERIOR_KIT;
      // 大螢幕（北牆）、音響
      bx(4.2, 2.3, 0.12, '#1A1A22', 0, 1.7, -HD + 0.12); const scr = bx(3.9, 2.0, 0.04, new TH.MeshBasicMaterial({ color: '#4A5AFF' }), 0, 1.7, -HD + 0.2); scr.castShadow = false;
      [-2.7, 2.7].forEach(sx => { bx(0.8, 1.4, 0.6, '#1E1E26', sx, 0.7, -HD + 0.45); bx(0.5, 0.5, 0.04, '#3A3A48', sx, 1.0, -HD + 0.76); });
      block(-3.2, 3.2, -HD, -HD + 0.8, 'tv');
      // U 字型的沙發、矮桌（麥克風、飲料、點歌本）
      const sofa = (x0, z0, w, d) => { bx(w, 0.45, d, '#7A2A4A', x0, 0.23, z0); bx(w, 0.12, d, '#9A3A5A', x0, 0.5, z0); block(x0 - w / 2, x0 + w / 2, z0 - d / 2, z0 + d / 2, 'sofa'); };
      sofa(-HW + 0.5, 0.6, 0.9, 4.2); sofa(HW - 0.5, 0.6, 0.9, 4.2); sofa(0, HD - 1.6, 5, 0.9);
      bx(3.2, 0.4, 1.6, '#2A2A30', 0, 0.2, 0.6); bx(3.3, 0.05, 1.7, '#5A5A68', 0, 0.42, 0.6); block(-1.65, 1.65, -0.2, 1.4, 'table');
      ['#E8C04A', '#5AC8FF', '#E8E0D0', '#C83A3A'].forEach((col, i) => bx(0.14, 0.22, 0.14, col, -1.1 + i * 0.6, 0.56, 0.4 + (i % 2) * 0.4));
      mesh(new TH.CylinderGeometry(0.05, 0.04, 0.4, 6), '#2A2A30', 0.8, 0.5, 0.9).rotation.z = Math.PI / 2;
      // 鏡面球、彩色的燈
      const ball = mesh(new TH.SphereGeometry(0.28, 10, 8), new TH.MeshLambertMaterial({ color: '#D8D8E8', emissive: '#6A6A88' }), 0, 2.8, 0.6); ball.castShadow = false;
      lamp(-2.5, 2.6, 0.6, '#FF5AB8', 0.7, 7); lamp(2.5, 2.6, 0.6, '#5AE0FF', 0.7, 7); lamp(0, 2.2, -HD + 1.2, '#8A9AFF', 0.6, 6);
      inter(0, -HD + 1.6, 1.8, '點歌（一首 ' + PRICE + ' 費拉）', () => R.karaoke());
      inter(1.6, 1.8, 1.4, '看點歌本', () => K2.talk('點歌本', SONGS.map(s => '〈' + s.title + '〉——' + s.genre + (R.S.karaoke && R.S.karaoke[s.k] ? '（你的最高分：' + R.S.karaoke[s.k] + '）' : '')).concat(['（最後一頁有人用鉛筆寫：「〈勇者證明〉最後一句要拉長。」）'])));
      npc(-HW + 1.6, -HD + 1.0, Math.PI / 2, { name: '包廂的店員', look: { top: '#2E2E38', hair: '#4A3424' } });
      inter(-HW + 2.6, -HD + 1.2, 1.5, '和店員說話', () => K2.talk('卡拉 OK 的店員', [['「飲料無限暢飲。麥克風請不要摔。」', '「隔壁那間是公會的人，每週三都來。」', '「唱到九十分以上，櫃台會送一張折價券……開玩笑的。」'][Math.floor(Math.random() * 3)]]));
    };
  }
})(window.R);
