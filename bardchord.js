// 吟遊詩人重做：R＝和弦、樂譜、演奏（2026-10-10 作者）
// - R（右鍵、手機的技能鈕一樣）：點一下換和弦；按住 0.45 秒開始寫樂譜（寫的時候再按住一次＝提早寫完）。
//   吟遊詩人的技能改放 3、4、5、6（skillbook.js 的 R.SLOT_OFF）：1 級就有「3」那一格，開格等級照舊往前挪一格，最多四招。
// - 寫樂譜：10 秒內記下出手——普攻一下＝八分音符（半拍）、基礎冷卻 13 秒以內的技能＝四分音符（一拍）、13 秒以上＝二分音符（兩拍）；
//   一個小節 4 拍（被動「樂譜延長」多 2 拍），下一個音放不下就寫完。攻擊技能的音符是紅的、增益（守、治）是綠的、普攻是金的；音高照和弦。
//   寫樂譜的時候普攻、技能照常放出去（普攻是一發普通的音符）。
// - 出手的順序：按下技能或普攻 → 演奏（照樂譜彈出聲音，2 秒；這段時間可以走、翻滾）→ 發出攻擊；下一次技能或普攻再演奏、再發出。
//   樂譜是空的：普攻不會發出任何攻擊；技能照常馬上放。攻速每 +1% 演奏快 1%（+100% 攻速只要一半的時間）。
//   普攻：樂譜有幾個音就同時射出幾個音符——攻擊音符碰到敵人炸開（半徑 1 公尺，算技能傷害，吃技能傷害的加成；二分的半徑、傷害兩倍）；
//         四分增益音符每個給你和隊友最大魔力 1% 的護盾，二分的再回同樣多的生命。
//   技能：每個八分音符你和隊友攻速 +5%（8 秒）；攻擊四分每個傷害與範圍 +8%；增益四分每個冷卻 −5%、恢復與護盾 +5%；
//         攻擊二分每個耗魔 +25%、傷害與範圍 +30%、冷卻 +10%；增益二分每個增益效果 +40%，周圍的友軍（含你）得到你最大魔力 20% 的護盾、回復你最大魔力 10% 的生命。
// - 和弦（一直有效）：大三和弦 範圍 +(10+等級/2)%、小三和弦 恢復與護盾 +(10+等級/2)%（等級算到 40 為止，最多 +30%）；
//   20 級七和弦 傷害 +(10+等級/2)%、30 級九和弦 技能急速 +(40+等級×1.5)、40 級十一和弦 每次演奏完回復 5% 最大魔力。
// - 被動（passives.js）：快速演奏（1 級）演奏時間 −20%、節奏加速（15 級）演奏時間 −30%、樂譜延長（30 級）、絕對音感（26 級）音符效果 +25%。
// - 原本的「樂句」（三個音湊曲子）拿掉；X 改成撕掉樂譜。轉職：詠嘆詩人增益音符 ×1.5、戰鼓手攻擊音符 ×1.5、奏域師八分音符的攻速維持兩倍久；
//   傳說：萬曲之琴音符效果 +50%、迴響長笛普攻演奏完射出兩輪音符。和弦、樂譜存在存檔（R.S.bardScore）。
// 放在最後面（main.js 前面）：包在 R.attack、R.castSlot、R.useSkill、R.fire、R.updateShots、R.hurtEnemy、R.calcPlayer、R.step、R.hudTick 最外面。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id);
  R.SLOT_OFF = Object.assign(R.SLOT_OFF || {}, { bard: 1 });
  R.SLOT_NOTE = Object.assign(R.SLOT_NOTE || {}, { bard: '吟遊詩人的 R 是和弦（點一下換和弦、按住寫樂譜），技能從 3 開始放、最多四格。' });
  const IS = P => !!P && P.cls === 'bard';
  const ME = () => { const w = W(), P = w.P; return IS(P) && w.run && !w.run.done && !P.dead ? P : null; };
  const now = () => performance.now() / 1000;
  const toast = (t, c) => R.toast && R.toast(t, c || '#FFB8E0');
  const leg = P => (R.legOf ? R.legOf(P) : null);
  const inst = P => (R.bardDebug && R.bardDebug.instOf ? R.bardDebug.instOf(P) : 'pluck');
  const melody = (P, notes, v) => { try { R.playMelody && R.playMelody(inst(P), notes, v || 0.09); } catch (e) { } };

  // ---------- 和弦 ----------
  const CH = [
    { id: 'maj', name: '大三和弦', sym: 'C', lv: 1, tones: [60, 64, 67, 72, 76, 79, 84] },
    { id: 'min', name: '小三和弦', sym: 'Am', lv: 1, tones: [57, 60, 64, 69, 72, 76, 81] },
    { id: 'sev', name: '七和弦', sym: 'G7', lv: 20, tones: [55, 59, 62, 65, 67, 71, 74] },
    { id: 'nin', name: '九和弦', sym: 'Dm9', lv: 30, tones: [62, 65, 69, 72, 76, 77, 81] },
    { id: 'ele', name: '十一和弦', sym: 'C11', lv: 40, tones: [60, 64, 67, 70, 74, 77, 79] }
  ];
  const L40 = P => Math.min(40, P.lv || 1);
  const pctOf = P => 10 + L40(P) / 2;
  const hasteOf = P => 40 + L40(P) * 1.5;
  const SV = () => { const s = R.S || {}; s.bardScore = s.bardScore || { chord: 'maj', notes: null }; return s.bardScore; };
  const chordOf = P => { const c = CH.find(x => x.id === SV().chord); return c && (P.lv || 1) >= c.lv ? c : CH[0]; };
  const chordDesc = (c, P) => (c.id === 'maj' ? '範圍 +' + pctOf(P) + '%' : c.id === 'min' ? '恢復與護盾 +' + pctOf(P) + '%' : c.id === 'sev' ? '傷害 +' + pctOf(P) + '%' : c.id === 'nin' ? '技能急速 +' + hasteOf(P) : '每次演奏回復 5% 最大魔力');
  const areaK = P => (chordOf(P).id === 'maj' ? 1 + pctOf(P) / 100 : 1);
  const healK = P => (chordOf(P).id === 'min' ? 1 + pctOf(P) / 100 : 1);
  const dmgK = P => (chordOf(P).id === 'sev' ? 1 + pctOf(P) / 100 : 1);
  const syncHaste = P => { if (!P || !('haste' in P)) return; const want = IS(P) && chordOf(P).id === 'nin' ? hasteOf(P) : 0, had = P._bdHaste || 0; if (want !== had) { P.haste = (P.haste || 0) - had + want; P._bdHaste = want; } };
  const nextChord = P => {
    const av = CH.filter(c => (P.lv || 1) >= c.lv), i = av.findIndex(c => c.id === chordOf(P).id), c = av[(i + 1) % av.length];
    SV().chord = c.id; syncHaste(P);
    toast('和弦：' + c.sym + ' ' + c.name + '（' + chordDesc(c, P) + '）');
    melody(P, c.tones.slice(0, 4).map((m, k) => [m, k * 0.06, 0.5]), 0.08);
    R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 1.6, color: '#FFB8E0' });
  };

  // ---------- 音符 ----------
  // d＝拍數（0.5 八分、1 四分、2 二分）；k＝'a' 攻擊、'b' 增益、'n' 普攻
  const COL = { a: '#FF6A5A', b: '#5AE8A0', n: '#FFE08A' };
  const noteOfSkill = id => { const s = R.SKILLS[id]; if (!s) return null; const t = R.bardNoteOf ? R.bardNoteOf(id) : '攻'; return { d: s.cd <= 13 ? 1 : 2, k: t === '攻' ? 'a' : 'b' }; };
  const midiOf = (n, i, c) => c.tones[(n.d < 1 ? 1 + i % 3 : n.k === 'a' ? 3 + i % 4 : i % 3) % c.tones.length];
  const capOf = P => 4 + (P.pv && P.pv.bdExtend ? 2 : 0);
  // 音符效果的倍率：絕對音感 ×1.25、萬曲之琴 ×1.5、詠嘆詩人增益 ×1.5、戰鼓手攻擊 ×1.5
  const nk = (P, k) => (P.pv && P.pv.bdPitch ? 1.25 : 1) * (leg(P) === 'lg_allsong' ? 1.5 : 1) * (k === 'b' && P.adv === 'aria' ? 1.5 : 1) * (k === 'a' && P.adv === 'drummer' ? 1.5 : 1);
  const tally = notes => { const c = { e: 0, aq: 0, bq: 0, ah: 0, bh: 0 }; (notes || []).forEach(n => { if (n.d < 1) c.e++; else if (n.d < 2) c[n.k === 'a' ? 'aq' : 'bq']++; else c[n.k === 'a' ? 'ah' : 'bh']++; }); return c; };

  // ---------- 這一趟的狀態 ----------
  const ST = { run: null, rec: null, perf: null, cast: null, release: null, press: null, lastShotT: 0, hintT: -99, ally: [] };
  const reset = () => { ST.rec = null; ST.perf = null; ST.cast = null; ST.release = null; ST.press = null; ST.ally = []; };

  // ---------- 寫樂譜 ----------
  const REC_T = 10, HOLD = 0.45;
  const startRec = P => {
    ST.rec = { t: 0, notes: [], beats: 0 }; ST.perf = null;
    toast('開始寫樂譜：10 秒內的普攻、技能都會記成音符（一個小節 ' + capOf(P) + ' 拍；再按住 R 提早寫完）');
    R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 2.6, color: '#FFB8E0' }); melody(P, [[72, 0, 0.15], [79, 0.12, 0.35]], 0.08);
  };
  const endRec = (P, why) => {
    const r = ST.rec; if (!r) return; ST.rec = null;
    if (!r.notes.length) { toast('樂譜是空的（' + (why || '10 秒內沒有出手') + '）'); return; }
    SV().notes = r.notes.slice(); ST.perf = null; if (R.save) try { R.save(); } catch (e) { }
    toast('樂譜寫好了：' + r.notes.length + ' 個音符、' + r.beats + ' 拍' + (why ? '（' + why + '）' : '') + '——之後每次出手都會先演奏再發出');
  };
  const addNote = (P, n) => {
    const r = ST.rec; if (!r) return; const cap = capOf(P);
    if (r.beats + n.d > cap + 1e-6) { endRec(P, '小節寫滿了'); return; }
    r.notes.push(n); r.beats += n.d;
    melody(P, [[midiOf(n, r.notes.length - 1, chordOf(P)), 0, 0.12 + n.d * 0.15]], 0.07);
    if (R.num) R.num(P.x, 2.4, P.z, n.d < 1 ? '♪' : n.d < 2 ? '♩' : '♫', n.k === 'a' ? 'crit' : 'heal');
    if (r.beats >= cap - 1e-6) endRec(P, '小節寫滿了');
  };

  // ---------- 演奏：按下 → 演奏 → 發出 ----------
  // 演奏時間：2 秒 × 快速演奏 0.8 × 節奏加速 0.7 ÷ 攻速（攻速每 +1% 快 1%）
  const baseRate = P => { const b = R.WEAPONS && P.item && R.WEAPONS[P.item.base]; return (b && b.rate) || (P.ws && P.ws.rate) || 1; };
  const spdK = P => Math.max(0.25, (P.ws && P.ws.rate ? P.ws.rate : 1) / baseRate(P));
  const perfDur = P => Math.max(0.3, Math.min(4, 2 * (P.pv && P.pv.bdFast ? 0.8 : 1) * (P.pv && P.pv.bdRhythm ? 0.7 : 1) / spdK(P)));
  const startPerf = (P, what) => {
    const notes = SV().notes; if (!notes || !notes.length || ST.rec || ST.perf) return false;
    const dur = perfDur(P), cap = Math.max(capOf(P), notes.reduce((a, n) => a + n.d, 0)), bt = dur / cap, c = chordOf(P);
    let at = 0; const times = notes.map(n => { const t = at; at += n.d * bt; return t; });
    ST.perf = Object.assign({ t: 0, dur, notes: notes.slice(), times, shown: 0 }, what);
    melody(P, notes.map((n, i) => [midiOf(n, i, c), times[i], Math.max(0.08, n.d * bt * 0.9)]), 0.085);
    R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 1.2, color: '#FFB8E0' });
    return true;
  };
  const shieldAll = (P, sh, hl, range) => {
    if (sh > 0) { P.shield = Math.min(P.hpMax, (P.shield || 0) + sh); P.buff = P.buff || {}; P.buff.shieldT = Math.max(P.buff.shieldT || 0, 6); }
    if (hl > 0 && R.healP) R.healP(hl);
    if (R.nearAllies && R.aidAlly) R.nearAllies(P, range || 8).forEach(al => R.aidAlly(al, { shieldAbs: sh, healAbs: hl, shieldT: 6, quiet: true }));
    if (sh > 0 || hl > 0) R.fx && R.fx('ring', P.x, 0.1, P.z, { r: range ? 3 : 1.6, color: '#5AE8A0' });
  };
  // 攻速：自己（P.sb，時間到 skillbook.js 會還原）、電腦隊友（a.st.rate，這裡自己還原）、連線隊友（netaid.js 送過去）
  const applyRate = (P, k, t) => {
    if (!(k > 1)) return;
    if (P.ws) { P.sb = P.sb || {}; const id = 'bd:score', old = P.sb[id]; if (old && old.rate) P.ws.rate /= old.rate; P.sb[id] = { left: t, t, rate: k, color: '#FFE08A' }; P.ws.rate *= k; }
    (R.nearAllies ? R.nearAllies(P, 9) : []).forEach(al => {
      if (al.remote != null) { R.aidAlly && R.aidAlly(al, { rateK: k, rateT: t }); return; }
      if (!al.st || !al.st.rate) return; const old = ST.ally.find(b => b.a === al); if (old) { al.st.rate /= old.k; old.k = k; old.left = t; } else ST.ally.push({ a: al, k, left: t }); al.st.rate *= k;
    });
  };

  // ---------- 音符的樣子（顏色照種類：攻擊紅、增益綠、普攻金；二分的大一點） ----------
  const TEX = {};
  const noteMat = (glyph, col) => {
    const k = glyph + col; if (TEX[k]) return TEX[k];
    const TH = THREE, c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.font = 'bold 50px "Segoe UI Symbol","Noto Sans Symbols","Apple Symbols",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = col; g.shadowBlur = 18; g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = '#1A1020'; g.strokeText(glyph, 32, 34); g.shadowBlur = 0; g.fillStyle = col; g.fillText(glyph, 32, 34);
    const t = new TH.CanvasTexture(c); t.userData.shared = true;
    const m = new TH.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false, toneMapped: false }); m.userData.shared = true;
    return (TEX[k] = m);
  };
  const dress = (s, n) => {
    if (!s || !window.THREE) return; const col = COL[n.d < 1 ? 'n' : n.k] || COL.n, glyph = n.d < 1 ? '♪' : n.d < 2 ? '♩' : '♫';
    s.ncol = col;
    if (s.mesh && s.mesh.isSprite) { s.mesh.material = noteMat(glyph, col); const k = n.d >= 2 ? 1.7 : n.d >= 1 ? 1.45 : 1.25; s.mesh.scale.set(k, k, 1); }
  };
  // 普攻：同時射出樂譜上的每一個音（迴響長笛：再射一輪，角度錯開半格）
  const volley = (P, o, notes, fi) => {
    const N = notes.length, step = Math.min(0.14, 1.1 / Math.max(1, N - 1)), rounds = leg(P) === 'lg_echo' ? 2 : 1; let first = null, sh = 0, hl = 0;
    for (let r = 0; r < rounds; r++) notes.forEach((n, i) => {
      const s = fi(Object.assign({}, o, { a: o.a + (i - (N - 1) / 2 + r * 0.5) * step, _bd: 1 })); if (!s) return; if (!first) first = s;
      dress(s, n);
      if (n.d >= 1 && n.k === 'a') { const big = n.d >= 2 ? 2 : 1, m = nk(P, 'a'); s.bdBoom = { r: big * areaK(P), dmg: (s.dmg || 0) * big * m, col: '#FF6A5A' }; }
      if (n.d >= 1 && n.k === 'b') { const v = P.mpMax * 0.01 * healK(P) * nk(P, 'b'); sh += v; if (n.d >= 2) hl += v; }
    });
    if (sh > 0 || hl > 0) shieldAll(P, sh, hl);
    if (R.num) R.num(P.x, 2.6, P.z, '♫×' + N * rounds, 'crit');
    return first;
  };
  // 技能：照樂譜算倍率
  const castMods = (P, notes) => {
    const c = tally(notes), a = nk(P, 'a'), b = nk(P, 'b'), e = nk(P, 'n');
    return { c, dmg: 1 + (0.08 * c.aq + 0.3 * c.ah) * a, area: 1 + (0.08 * c.aq + 0.3 * c.ah) * a, heal: 1 + 0.05 * c.bq * b, buff: 1 + 0.4 * c.bh * b,
      cd: Math.max(0.3, 1 - 0.05 * c.bq * b + 0.1 * c.ah), mpx: 0.25 * c.ah, rate: 1 + 0.05 * c.e * e, ally: c.bh * b };
  };
  const post = (P, i, id, m) => {
    const sk = R.SKILLS[id] || {};
    if (P.skCd && P.skCd[i] > 0) P.skCd[i] *= m.cd;
    if (m.mpx > 0) P.mp = Math.max(0, P.mp - (sk.mp || 0) * m.mpx);
    applyRate(P, m.rate, P.adv === 'serane' ? 16 : 8);
    if (m.ally > 0) shieldAll(P, P.mpMax * 0.2 * m.ally * healK(P), P.mpMax * 0.1 * m.ally * healK(P), 9);
    if (R.num) R.num(P.x, 2.6, P.z, '♫ ' + (sk.name || ''), 'crit');
  };

  // ---------- 技能的型：和弦（範圍、恢復）＋樂譜（傷害、範圍、恢復、增益） ----------
  const T = R.SKILL_TYPES || {};
  const AREA = ['r', 'width', 'radius'], PCT = ['pct', 'allies', 'shield', 'allyShield', 'heal', 'regen', 'selfHeal'], MUL = ['dmg', 'speed', 'rate'], ADD = ['crit', 'def'];
  // 回傳 [改過的參數, 改過的威力]；沒有要改的回傳 null
  const scaleArgs = (type, s, P, pw) => {
    const m = ST.cast, ak = areaK(P) * (m ? m.area : 1), hk = healK(P) * (m ? m.heal : 1), bk = m ? m.buff : 1, dk = m ? m.dmg : 1;
    if (ak === 1 && hk === 1 && bk === 1 && dk === 1) return null;
    s = Object.assign({}, s);
    if (ak !== 1) AREA.forEach(k => { if (typeof s[k] === 'number') s[k] *= ak; });
    if (hk !== 1) PCT.forEach(k => { if (typeof s[k] === 'number') s[k] = k === 'pct' || k === 'allies' ? Math.min(1, s[k] * hk) : s[k] * hk; });
    if (bk !== 1 && (type === 'buff' || type === 'aura')) { MUL.forEach(k => { if (typeof s[k] === 'number' && s[k] > 1) s[k] = 1 + (s[k] - 1) * bk; }); ADD.forEach(k => { if (typeof s[k] === 'number') s[k] *= bk; }); }
    return [s, typeof pw === 'number' ? pw * dk : pw];
  };
  Object.keys(T).forEach(type => {
    const f = T[type]; if (type === 'combo' || typeof f !== 'function') return;
    T[type] = function (s, P, w, pw, ...a) {
      if (!IS(P) || P !== W().P || !s || typeof s !== 'object') return f.call(this, s, P, w, pw, ...a);
      const r = scaleArgs(type, s, P, pw); if (!r) return f.call(this, s, P, w, pw, ...a);
      return f.call(this, r[0], P, w, r[1], ...a);
    };
  });

  // ---------- 接到遊戲裡 ----------
  // R：不再放技能（技能在 3～6）
  const us0 = R.useSkill;
  R.useSkill = (...a) => { const P = W().P; if (IS(P) && W().run) return; return us0(...a); };
  // 技能：寫樂譜的時候照常放、記下來；有樂譜就先演奏（演奏完才真的放出去）；沒有樂譜照常放
  const cs0 = R.castSlot;
  const castNow = (P, i) => { const cdOf = () => (P.skCd && P.skCd[i]) || 0, c0 = cdOf(); cs0(i); return cdOf() > c0 + 0.01; };
  R.castSlot = i => {
    const P = W().P; if (!IS(P) || !(i >= 1) || !W().run) return cs0(i);
    const id = R.slotSkill ? R.slotSkill(P, i) : null;
    if (ST.rec) { if (castNow(P, i) && id) { const n = noteOfSkill(id); if (n) addNote(P, n); } return; }
    const notes = SV().notes;
    if (!notes || !notes.length || !id) return cs0(i);
    if (ST.perf || P.dead) return;
    const sk = R.SKILLS[id]; if (!sk) return cs0(i);
    if (((P.skCd && P.skCd[i]) || 0) > 0) return cs0(i);   // 還在冷卻：照原本的（不放）
    const m = castMods(P, notes);
    if (P.mp < sk.mp * (1 + m.mpx)) { toast('魔力不夠'); return; }
    startPerf(P, { kind: 'skill', i, id });
  };
  // 普攻：寫樂譜的時候照常射一發（記成八分音符）；有樂譜就先演奏、演奏完同時射出整個樂譜；樂譜是空的就不射
  const at0 = R.attack;
  R.attack = (...a) => {
    const P = W().P; if (!IS(P) || !W().run || ST.release) return at0(...a);
    if (ST.rec) return at0(...a);
    if (P.atkCd > 0 || P.dead || P.knockT > 0 || P.stance > 0) return;
    if (!SV().notes || !SV().notes.length) { const t = now(); if (t - ST.hintT > 4) { ST.hintT = t; toast('樂譜是空的，普攻不會發出攻擊——按住 R 寫一段樂譜（寫的時候普攻照常）'); } P.atkCd = 0.3; return; }
    if (ST.perf) return;
    startPerf(P, { kind: 'atk' });
  };
  const perfDone = P => {
    const p = ST.perf; ST.perf = null;
    if (chordOf(P).id === 'ele') P.mp = Math.min(P.mpMax, P.mp + P.mpMax * 0.05);
    if (p.kind === 'atk') { ST.release = p.notes; const c0 = P.atkCd; P.atkCd = 0; try { at0(); } finally { ST.release = null; } if (!(P.atkCd > 0)) P.atkCd = c0; }
    else if (p.kind === 'skill') {
      ST.cast = castMods(P, p.notes); let ok = false;
      try { ok = castNow(P, p.i); } finally { const m = ST.cast; ST.cast = null; if (ok) post(P, p.i, p.id, m); }
    }
  };
  // 主要的那一發：寫樂譜的時候記一個八分音符；演奏完的那一下換成整個樂譜
  const fi0 = R.fire;
  R.fire = o => {
    const P = W().P;
    if (!o || o._bd || o.owner !== 'p' || !o.primary || !IS(P) || !W().run) return fi0(o);
    const t = now(), first = t - ST.lastShotT > 0.06; if (first) ST.lastShotT = t;   // 一次普攻射好幾發的只算一次
    if (first && ST.rec) { addNote(P, { d: 0.5, k: 'n' }); return fi0(o); }
    if (ST.release) { const notes = ST.release; ST.release = null; return volley(P, o, notes, fi0); }
    return fi0(o);
  };
  // 攻擊音符：碰到敵人的那一下炸開（打牆、飛完不炸）
  const up0 = R.updateShots;
  R.updateShots = dt => {
    const live = (W().shots || []).filter(s => s.bdBoom && !s.dead).map(s => [s, s.hit ? s.hit.size : 0]);
    const r = up0(dt);
    live.forEach(([s, n]) => { if (s.hit && s.hit.size > n) { const b = s.bdBoom; s.bdBoom = null; R.fx && R.fx('boom', s.x, 0.6, s.z, { r: b.r, color: b.col }); R.aoe(s.x, s.z, b.r, b.dmg, { props: true }); } });
    return r;
  };
  // 七和弦：傷害
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { const P = W().P; if (IS(P) && e && !e.dead && !e.petHit && !(o && (o.reflect || o.thorns))) { const k = dmgK(P); if (k !== 1) raw *= k; } return he0(e, raw, o); };
  // 九和弦：技能急速（重新算數值的時候補上）
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => { const P = cp0(cls); try { P._bdHaste = 0; if (IS(P)) syncHaste(P); } catch (e) { } return P; };

  // ---------- 按鍵：點一下換和弦、按住寫樂譜 ----------
  const inGame = () => { const run = $('run'); return run && !run.hidden && !(R.sheetOpen && R.sheetOpen()) && !W().paused; };
  const press = src => { if (!ME() || !inGame() || ST.press) return; ST.press = { t0: now(), src, held: false }; };
  const release = src => { const p = ST.press; if (!p || p.src !== src) return; ST.press = null; const P = ME(); if (P && !p.held) nextChord(P); };
  window.addEventListener('keydown', e => { if ((e.key || '').toLowerCase() === 'r' && !e.repeat && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) press('k'); });
  window.addEventListener('keyup', e => { if ((e.key || '').toLowerCase() === 'r') release('k'); });
  const cv = $('gl');
  if (cv) cv.addEventListener('mousedown', e => { if (e.button === 2) press('m'); });
  window.addEventListener('mouseup', e => { if (e.button === 2) release('m'); });
  window.addEventListener('blur', () => { ST.press = null; });
  const rb = $('r-skill');
  if (rb) { rb.addEventListener('pointerdown', e => { if (ME()) { e.preventDefault(); press('p'); } }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => rb.addEventListener(t, () => release('p'))); }

  // ---------- 每一幀 ----------
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(), P = w.P; if (!IS(P) || !w.run) return;
    if (ST.run !== w.run) { ST.run = w.run; reset(); }
    if (w.paused || P.dead) return;
    if (ST.press && !ST.press.held && now() - ST.press.t0 >= HOLD) { ST.press.held = true; if (ST.rec) endRec(P, '提早寫完'); else startRec(P); }
    if (ST.rec) { ST.rec.t += dt; if (ST.rec.t >= REC_T) endRec(P); }
    if (ST.perf) {
      const p = ST.perf; p.t += dt;
      while (p.shown < p.notes.length && p.t >= p.times[p.shown]) { const n = p.notes[p.shown++]; if (R.num) R.num(P.x + (Math.random() - 0.5) * 0.8, 2.2, P.z, n.d < 1 ? '♪' : n.d < 2 ? '♩' : '♫', n.k === 'a' ? 'crit' : 'heal'); }
      if (p.t >= p.dur) perfDone(P);
    }
    for (let k = ST.ally.length - 1; k >= 0; k--) { const b = ST.ally[k]; b.left -= dt; if (b.left <= 0 || !b.a || b.a.dead) { if (b.a && b.a.st) b.a.st.rate /= b.k; ST.ally.splice(k, 1); } }
  };

  // ---------- 職業鍵（X）、職業特效的條 ----------
  const status = P => {
    if (ST.rec) return '寫樂譜中 ' + Math.max(0, REC_T - ST.rec.t).toFixed(1) + ' 秒・' + ST.rec.beats + '／' + capOf(P) + ' 拍';
    if (!SV().notes) return '樂譜是空的：按住 R 寫樂譜';
    if (ST.perf) return '演奏中' + (ST.perf.kind === 'skill' && R.SKILLS[ST.perf.id] ? '（' + R.SKILLS[ST.perf.id].name + '）' : '（普攻）') + ' ' + Math.max(0, ST.perf.dur - ST.perf.t).toFixed(1) + ' 秒';
    return '出手會先演奏 ' + perfDur(P).toFixed(1) + ' 秒再發出';
  };
  const C = R.CORE && R.CORE.bard;
  if (C) Object.assign(C, {
    name: '和弦', col: '#FFB8E0',
    help: P => '和弦與樂譜：R 點一下換和弦（大三＝範圍、小三＝恢復與護盾、20 級七和弦＝傷害、30 級九和弦＝技能急速、40 級十一和弦＝演奏回魔）；按住 R 寫 10 秒的樂譜——普攻是八分音符、基礎冷卻 13 秒以內的技能是四分、以上是二分（一個小節 '
      + capOf(P) + ' 拍）。之後每次出手：按下 → 演奏（' + perfDur(P).toFixed(1) + ' 秒，可以走、翻滾；攻速越快演奏越快）→ 發出。普攻同時射出整個樂譜的音符（攻擊音符碰到敵人炸開、增益音符給護盾；樂譜是空的就不射），技能照音符加攻速、傷害、範圍、恢復、增益。X 撕掉樂譜。'
      + ({ aria: '詠嘆詩人：增益音符效果 ×1.5。', drummer: '戰鼓手：攻擊音符效果 ×1.5。', serane: '奏域師：八分音符的攻速維持兩倍久。' }[P && P.adv] || ''),
    step() { }, onCast() { }, play() { },
    act(P) { if (!SV().notes) { toast('還沒有樂譜（按住 R 寫一個）'); return; } SV().notes = null; ST.perf = null; if (R.save) try { R.save(); } catch (e) { } toast('樂譜撕掉了'); },
    gauge(P) { const c = chordOf(P); return { name: '和弦 ' + c.sym, col: '#FFB8E0', text: c.name + '・' + chordDesc(c, P), sub: status(P), x: SV().notes ? '撕掉樂譜' : '' }; }
  });

  // ---------- 畫面：R 鈕（和弦）、上面的五線譜 ----------
  const css = document.createElement('style');
  css.textContent = '#bd-staff{position:fixed;z-index:30;pointer-events:none;display:none;filter:drop-shadow(0 4px 10px rgba(0,0,0,.6))}'
    + '#bd-staff canvas{display:block;width:236px;height:78px}'
    + '#r-skill.bd-on{opacity:1!important}#r-skill.bd-on.none{filter:none!important}#r-skill.bd-on.rec{box-shadow:0 0 0 2px #FF6A8A,0 0 12px #FF6A8A!important}#r-skill.bd-on.perf{box-shadow:0 0 0 2px #FFE08A,0 0 14px #FFE08A!important}';
  document.head.appendChild(css);
  const box = document.createElement('div'); box.id = 'bd-staff'; const can = document.createElement('canvas'); box.appendChild(can); document.body.appendChild(box);
  const DPR = () => Math.min(2, window.devicePixelRatio || 1);
  const icons = {};
  const iconOf = c => {
    if (icons[c.id]) return icons[c.id];
    const k = document.createElement('canvas'); k.width = k.height = 64; const g = k.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#3A2238'); gr.addColorStop(1, '#160C16'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(255,184,224,.35)'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(6, 38 + i * 4.5); g.lineTo(58, 38 + i * 4.5); g.stroke(); }
    g.fillStyle = '#FFB8E0'; g.font = 'bold ' + (c.sym.length > 2 ? 20 : 26) + 'px "Segoe UI",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#FF6AB8'; g.shadowBlur = 8; g.fillText(c.sym, 32, 22);
    return (icons[c.id] = k.toDataURL());
  };
  // 五線譜：E4（64）在最下面那條線，每半格一個音階（照白鍵粗略換算）
  const STEP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const posOf = m => { const o = Math.floor(m / 12) - 5, d = o * 7 + STEP[((m % 12) + 12) % 12]; return d - 2; };   // E4＝0
  let drawKey = '';
  const draw = P => {
    const c = chordOf(P), notes = ST.rec ? ST.rec.notes : SV().notes || [], cap = Math.max(capOf(P), notes.reduce((a, n) => a + n.d, 0));
    const key = [c.id, notes.length, cap, ST.rec ? Math.ceil(ST.rec.t * 4) : -1, ST.perf ? Math.floor(ST.perf.t / ST.perf.dur * 24) : -1, P.lv, (P.ws && P.ws.rate || 0).toFixed(2)].join('|');
    if (key === drawKey) return; drawKey = key;
    const d = DPR(), Wd = 236, Hd = 78; if (can.width !== Wd * d) { can.width = Wd * d; can.height = Hd * d; }
    const g = can.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, Wd, Hd);
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const bg = g.createLinearGradient(0, 0, 0, Hd); bg.addColorStop(0, 'rgba(46,32,40,.94)'); bg.addColorStop(1, 'rgba(18,12,16,.94)');
    rr(1, 1, Wd - 2, Hd - 2, 8); g.fillStyle = bg; g.fill(); g.lineWidth = 1.5; g.strokeStyle = ST.rec ? '#FF6A8A' : ST.perf ? '#FFE08A' : '#7A5A48'; g.stroke();
    g.font = 'bold 12px "Segoe UI","Microsoft JhengHei",sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = '#FFB8E0'; g.fillText(c.sym + '  ' + c.name, 10, 12); g.fillStyle = '#C8B8A8'; g.font = '11px "Segoe UI","Microsoft JhengHei",sans-serif'; g.textAlign = 'right'; g.fillText(chordDesc(c, P), Wd - 10, 12);
    const x0 = 30, x1 = Wd - 10, yb = 50, sp = 5; g.strokeStyle = 'rgba(232,216,200,.55)'; g.lineWidth = 1;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x0 - 18, yb - i * sp + 0.5); g.lineTo(x1, yb - i * sp + 0.5); g.stroke(); }
    g.beginPath(); g.moveTo(x1 + 0.5, yb - 4 * sp); g.lineTo(x1 + 0.5, yb); g.stroke();
    g.fillStyle = 'rgba(232,216,200,.8)'; g.font = '30px "Segoe UI Symbol","Noto Music","Noto Sans Symbols",serif'; g.textAlign = 'center'; g.fillText('𝄞', x0 - 10, yb - 9);
    let beat = 0;
    notes.forEach((n, i) => {
      const x = x0 + 8 + (beat + n.d / 2) / cap * (x1 - x0 - 14), y = yb - posOf(midiOf(n, i, c)) * (sp / 2), col = COL[n.d < 1 ? 'n' : n.k];
      beat += n.d;
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1.4;
      g.beginPath(); g.ellipse(x, y, 3.6, 2.6, -0.4, 0, Math.PI * 2); if (n.d >= 2) g.stroke(); else g.fill();
      g.beginPath(); g.moveTo(x + 3.3, y); g.lineTo(x + 3.3, y - 15); g.stroke();
      if (n.d < 1) { g.beginPath(); g.moveTo(x + 3.3, y - 15); g.quadraticCurveTo(x + 9, y - 10, x + 7, y - 5); g.stroke(); }
    });
    if (ST.perf) { const x = x0 + 8 + (ST.perf.t / ST.perf.dur) * (x1 - x0 - 14); g.strokeStyle = 'rgba(255,224,138,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, yb - 4 * sp - 4); g.lineTo(x, yb + 4); g.stroke(); }
    g.font = '11px "Segoe UI","Microsoft JhengHei",sans-serif'; g.textAlign = 'left'; g.fillStyle = ST.rec ? '#FF8AA8' : ST.perf ? '#FFE08A' : '#B8A898';
    g.fillText((ST.rec ? '● ' : '') + status(P), 10, Hd - 10);
    if (ST.rec) { g.fillStyle = 'rgba(255,106,138,.85)'; g.fillRect(10, Hd - 3, (Wd - 20) * (1 - ST.rec.t / REC_T), 2); }
  };
  const ht0 = R.hudTick;
  R.hudTick = dt => {
    ht0(dt);
    const w = W(), P = w.P, b = $('r-skill'), on = IS(P) && !!w.run && !w.town;
    if (b) b.classList.toggle('bd-on', on);
    if (!on) { box.style.display = 'none'; return; }
    try {
      const c = chordOf(P), n = $('r-skill-n'), ic = b && b.querySelector('.h2-ic'), sec = b && b.querySelector('.bh-sec');
      if (n && n.textContent !== '和弦') n.textContent = '和弦';
      if (ic) { const src = iconOf(c); if (ic.dataset.bd !== c.id) { ic.dataset.bd = c.id; ic.dataset.k = 'sk:'; ic.src = src; } }
      if (b) {
        b.title = '和弦：' + c.sym + ' ' + c.name + '（' + chordDesc(c, P) + '）。點一下換和弦；按住寫 10 秒的樂譜。';
        b.classList.remove('none', 'locked', 'nomp'); b.classList.add('lit'); b.classList.toggle('rec', !!ST.rec); b.classList.toggle('perf', !!ST.perf);
        const cd = b.querySelector('.cd'); if (cd) cd.style.setProperty('--p', ST.rec ? 1 - ST.rec.t / REC_T : ST.perf ? 1 - ST.perf.t / ST.perf.dur : 0);
        if (sec) { const t = ST.rec ? Math.max(0, REC_T - ST.rec.t).toFixed(1) : ST.perf ? Math.max(0, ST.perf.dur - ST.perf.t).toFixed(1) : ''; if (sec.textContent !== t) sec.textContent = t; }
      }
      draw(P);
      const r = b && b.getBoundingClientRect();
      if (r && r.width) { box.style.display = 'block'; const x = Math.max(6, Math.min(window.innerWidth - 242, r.left + r.width / 2 - 118)), y = r.top - 84 - (R.touch ? 56 : 0); box.style.left = x + 'px'; box.style.top = Math.max(6, y) + 'px'; }
      else box.style.display = 'none';
    } catch (e) { }
  };
  R.bardChord = { ST, SV, scaleArgs, chordOf, castMods, tally, nextChord, startRec, endRec, perfDur, capOf, spdK };
})(window.R);
