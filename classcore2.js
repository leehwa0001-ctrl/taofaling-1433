// 職業的核心玩法（二）：牧師、吟遊詩人、召喚師、術陣師、附魔師、符卷師（共用的部分在 classcore.js）
// - 牧師「信仰」：補血（照補了多少）、放祝福和治療的技能攢信仰；補過頭的量（一次補 2% 以上才算）變成一道光打最近的遺跡生物。
//   X（信仰 100）神蹟：自己和隊友回 30%、周圍 5 公尺 4 倍傷害、清掉壞狀態。主教神蹟扶起倒下的隊友；德魯伊神蹟讓周圍的定身 3 秒；神官神蹟張開 6 秒大結界。
// - 吟遊詩人「樂句」（馬里奧派：把咒文編成曲子）：每放一招就是一個音（R、3、4、5、6），最後三個音照曲譜就演奏出曲子：
//   3-4-5 進行曲（移動 +20%、傷害 +10%，8 秒）、5-4-3 安魂曲（你和隊友回 15%）、3-3-4 戰歌（傷害 +25%，6 秒；10 級）、
//   4-5-6 疾風曲（全部技能冷卻 −3 秒；20 級）、6-5-4 鎮魂鐘（周圍暈 1.5 秒＋2.5 倍；30 級）、R-R-R 終章（周圍 6 倍；40 級）。X 休止符：清掉音。
//   詠嘆詩人治療的曲子 ×1.5；戰鼓手打人的曲子 ×1.5；奏域師曲子的時間兩倍。
// - 召喚師「執念」（霍克派）：召喚物會集火你最後打的那一隻；召喚物打中、打倒攢執念。X（執念 50）獻祭：所有召喚物炸開（2.2 倍範圍）。
//   打倒過 10 隻以上的遺跡生物（圖鑑）會變成新的召喚形態，召喚的時候一半機率捏成牠們的樣子。
//   萬獸師執念漲 1.5 倍；靈媒師獻祭每隻回 4% 生命；遺跡馴獸師集火的時候召喚物傷害 +30%；式神使獻祭只要 30。
// - 術陣師「閉環」（艾達諾拉派）：放在地上的法陣（落點、場域的技能）和 X 放的陣眼都是一個點，8 秒內有三個點彼此 11 公尺以內
//   就連成閉環：三角形裡面 3.5 倍傷害＋定身 2 秒。大陣師閉環範圍 +30%、傷害 ×1.3；結界師閉環給自己 15% 護盾；艾達諾拉的點留 16 秒。
// - 附魔師「刻印切換」（恩特安派）：X 換武器上的刻印（焰、霜、雷），普攻打中攢刻印的力量；換掉的時候舊的刻印釋放：
//   焰＝前方火焰爆、霜＝身邊冰封定身、雷＝連鎖閃電打五隻（攢越滿越痛）。刻印師釋放 ×1.5、攢得快；魔劍士釋放多打出一道劍氣；恩特安的傳人釋放讓敵人破防（5 秒你的傷害 +20%）。
// - 符卷師「卷軸組」（諾克薩派）：6 秒內放三種不同的技能＝連鎖，第三招再放一次（不扣魔力、不進冷卻）。
//   X 展卷：用掉 3 張寫好的卷軸，所有技能冷卻歸零（30 秒一次）。抄寫師展卷只要 2 張；封印師連鎖的那一招會暈；諾克薩的傳人兩種不同就連鎖。
// 放在 classcore.js 後面。
(function (R) {
  const CORE = R.CORE, K = R.coreKit; if (!CORE || !K) return;
  const { W, pw, adv, toast, say, dist, rnd } = K, CT = () => R.coreTime();
  const allies = () => (W().allies || []).filter(a => !a.downed);
  const nearest = (P, r) => { let b = null, bd = r || 1e9; (W().enemies || []).forEach(e => { if (e.dead || e.under) return; const d = dist(e, P); if (d < bd) { bd = d; b = e; } }); return b; };
  const buff = (P, id, o) => { P.sb = P.sb || {}; P.sb['core:' + id] = Object.assign({ left: o.t, t: o.t }, o); if (o.speed) P.speed *= o.speed; if (o.speed) P.sb['core:' + id].spd = o.speed; };

  // ======================= 牧師：信仰 =======================
  CORE.priest = {
    name: '信仰', col: '#FFE8A0',
    help: P => '信仰：補血（照補了多少）、放祝福和治療的技能攢信仰；一次補 2% 以上、補過頭的量會變成一道光，打最近的遺跡生物（兩倍）。X（信仰 100）神蹟：自己和隊友回 30%、周圍 5 公尺 4 倍傷害、清掉壞狀態。'
      + ({ bishop: '主教：神蹟扶起倒下的隊友。', druid: '德魯伊：神蹟讓周圍的遺跡生物定身 3 秒。', shinkan: '神官：神蹟張開 6 秒大結界。' }[adv(P)] || ''),
    add(P, n) { P._faith = Math.min(100, (P._faith || 0) + n); },
    onCast(P, i, id, sk) { const L = R.SKILL_LIB && R.SKILL_LIB[id]; if (L && (L.type === 'heal' || L.type === 'buff' || L.type === 'revive')) this.add(P, 12); },
    act(P) {
      if ((P._faith || 0) < 100) { toast('信仰要滿（現在 ' + Math.floor(P._faith || 0) + '）'); return; }
      P._faith = 0; P._miracle = true; try { R.healP(P.hpMax * 0.3); } finally { P._miracle = false; }   // 神蹟自己的補血不算信仰 P.slowT = 0; P.blindT = 0; if (P.dbf) Object.keys(P.dbf).forEach(k => { P.dbf[k] = 0; });
      W().allies && W().allies.forEach(a => { if (a.downed) { if (adv(P) === 'bishop') { a.downed = false; a.hp = a.hpMax * 0.4; } return; } a.hp = Math.min(a.hpMax, a.hp + a.hpMax * 0.3); });
      R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 5, color: '#FFE8A0' }); R.fx && R.fx('pillar', P.x, 0, P.z, { color: '#FFE8A0' }); R.shake && R.shake(0.25);
      R.coreAoe(P.x, P.z, 5, pw(P) * 4, {});
      if (adv(P) === 'druid') (W().enemies || []).forEach(e => { if (!e.dead && dist(e, P) < 5) e.st.root = Math.max(e.st.root || 0, 3); });
      if (adv(P) === 'shinkan') P.buff.kekkai = Math.max(P.buff.kekkai || 0, 6);
      say(P, '神蹟', 'heal');
    },
    gauge(P) { const f = P._faith || 0; return { v: f, max: 100, full: f >= 100, sub: '補血、祝福攢信仰', x: f >= 100 ? '神蹟' : '' }; }
  };
  const hl0 = R.healP;
  R.healP = (v, q) => {
    const P = W().P; if (!P || P.cls !== 'priest' || !K.live() || !(v > 0)) return hl0(v, q);
    const h0 = P.hp, r = hl0(v, q), got = Math.max(0, P.hp - h0);
    if (!P._miracle) CORE.priest.add(P, got / P.hpMax * 100);
    const over = v - got;
    if (v >= P.hpMax * 0.02 && over > 1 && CT() - (P._overT || 0) > 0.5) { const e = nearest(P, 10); if (e) { P._overT = CT(); R.fx && R.fx('bolt', P.x, 1.4, P.z, { to: e }); R.coreHit(e, over * 2, {}); } }
    return r;
  };

  // ======================= 吟遊詩人：樂句 =======================
  const KEY = ['R', '3', '4', '5', '6'];
  const SONGS = [
    { seq: '345', n: '進行曲', lv: 1, kind: 'buff', d: '移動 +20%、傷害 +10%，8 秒' },
    { seq: '543', n: '安魂曲', lv: 1, kind: 'heal', d: '你和隊友回 15% 生命' },
    { seq: '334', n: '戰歌', lv: 10, kind: 'buff', d: '傷害 +25%，6 秒' },
    { seq: '456', n: '疾風曲', lv: 20, kind: 'buff', d: '全部技能冷卻 −3 秒' },
    { seq: '654', n: '鎮魂鐘', lv: 30, kind: 'hit', d: '周圍 5 公尺暈 1.5 秒＋2.5 倍傷害' },
    { seq: 'RRR', n: '終章', lv: 40, kind: 'hit', d: '周圍 6 公尺 6 倍傷害' }
  ];
  const known = P => SONGS.filter(s => (P.lv || 1) >= s.lv);
  CORE.bard = {
    name: '樂句', col: '#FFB8E0',
    help: P => '樂句（把咒文編成曲子）：每放一招就是一個音（快捷欄的 R、3、4、5、6），最後三個音照曲譜就演奏出曲子。曲譜：' + SONGS.map(s => s.seq.split('').join('-') + ' ' + s.n + '（' + s.d + (P.lv < s.lv ? '；' + s.lv + ' 級' : '') + '）').join('、') + '。X 休止符：清掉音。'
      + ({ aria: '詠嘆詩人：治療的曲子 ×1.5。', drummer: '戰鼓手：打人的曲子 ×1.5。', serane: '奏域師：曲子的時間兩倍。' }[adv(P)] || ''),
    onCast(P, i) {
      P._notes = ((P._notes || '') + KEY[i]).slice(-3);
      const s = known(P).find(x => x.seq === P._notes); if (!s) return;
      P._notes = ''; this.play(P, s);
    },
    play(P, s) {
      const heal = adv(P) === 'aria' ? 1.5 : 1, hit = adv(P) === 'drummer' ? 1.5 : 1, tk = adv(P) === 'serane' ? 2 : 1;
      R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 4, color: '#FFB8E0' }); say(P, '♪ ' + s.n, 'heal');
      if (s.n === '進行曲') buff(P, 'march', { t: 8 * tk, speed: 1.2, dmg: 1.1, color: '#FFB8E0' });
      else if (s.n === '安魂曲') { R.healP(P.hpMax * 0.15 * heal); allies().forEach(a => { a.hp = Math.min(a.hpMax, a.hp + a.hpMax * 0.15 * heal); }); }
      else if (s.n === '戰歌') buff(P, 'warsong', { t: 6 * tk, dmg: 1.25, color: '#FF8AB8' });
      else if (s.n === '疾風曲') { P.skillCd = Math.max(0, (P.skillCd || 0) - 3); if (P.skCd) P.skCd = P.skCd.map(v => Math.max(0, (v || 0) - 3)); }
      else if (s.n === '鎮魂鐘') { (W().enemies || []).forEach(e => { if (!e.dead && dist(e, P) < 5) e.st.stun = Math.max(e.st.stun || 0, 1.5); }); R.coreAoe(P.x, P.z, 5, pw(P) * 2.5 * hit, {}); }
      else if (s.n === '終章') { R.shake && R.shake(0.3); R.coreAoe(P.x, P.z, 6, pw(P) * 6 * hit, { kb: 2 }); }
    },
    act(P) { P._notes = ''; say(P, '休止符', 'heal'); },
    gauge(P) { const n = (P._notes || '').split(''), next = known(P).filter(s => s.seq.startsWith(P._notes || '')).map(s => s.n); return { name: '樂句', text: n.length ? n.join('-') : '（還沒有音）', sub: n.length ? '接下去：' + (next.slice(0, 3).join('、') || '沒有這種曲子') : '放技能就是音', x: n.length ? '休止符' : '' }; }
  };

  // ======================= 召喚師：執念 =======================
  CORE.summoner = {
    name: '執念', col: '#B8E07A',
    help: P => '執念（霍克派）：召喚物會集火你最後打的那一隻；召喚物打中、打倒都攢執念。X（執念 ' + (adv(P) === 'shikigami' ? 30 : 50) + ' 以上）獻祭：所有召喚物炸開（2.2 倍範圍）。圖鑑裡打倒過 10 隻以上的遺跡生物會變成新的召喚形態。'
      + ({ beastlord: '萬獸師：執念漲 1.5 倍。', medium: '靈媒師：獻祭每一隻回你 4% 生命。', tamer: '遺跡馴獸師：集火的時候召喚物傷害 +30%。', shikigami: '式神使：獻祭只要 30 執念。' }[adv(P)] || ''),
    add(P, n) { P._obs = Math.min(100, (P._obs || 0) + n * (adv(P) === 'beastlord' ? 1.5 : 1)); },
    onHit(e, d, o, P, killed) {
      if (e.petHit) { this.add(P, killed ? 6 : 1.2); return; }
      if (d > 0 && !o.reflect) R.petFocus = e;
    },
    mod(e, raw, o, P) { return e.petHit && adv(P) === 'tamer' && e === R.petFocus ? raw * 1.3 : raw; },
    act(P) {
      const need = adv(P) === 'shikigami' ? 30 : 50, pets = (R.PETS || []).filter(p => !p.gone && p.left > 0);
      if (!pets.length) { toast('沒有召喚物可以獻祭'); return; }
      if ((P._obs || 0) < need) { toast('執念要 ' + need + '（現在 ' + Math.floor(P._obs || 0) + '）'); return; }
      P._obs -= need;
      pets.forEach(p => { R.fx && R.fx('boom', p.x, 0.4, p.z, { r: 2.5, color: '#B8E07A' }); R.coreAoe(p.x, p.z, 2.5, pw(P) * 2.2, { kb: 1.5 }); p.left = 0; if (adv(P) === 'medium') R.healP(P.hpMax * 0.04); });
      R.shake && R.shake(0.25); say(P, '獻祭 ×' + pets.length, 'crit');
    },
    gauge(P) { const o = P._obs || 0, n = (R.PETS || []).filter(p => !p.gone && p.left > 0).length, need = adv(P) === 'shikigami' ? 30 : 50; return { v: o, max: 100, full: o >= 100, sub: '召喚物 ' + n + ' 隻・集火你打的那隻', x: o >= need && n ? '獻祭' : '' }; }
  };
  // 新的召喚形態：圖鑑打倒 10 隻以上的（不會飛、不是領主、有圖的）
  if (R.SKILL_TYPES && R.SKILL_TYPES.pet) {
    const pet0 = R.SKILL_TYPES.pet;
    R.SKILL_TYPES.pet = (s, P, w, pw0) => {
      try {
        if (P && P.cls === 'summoner' && s && s.beast !== 'floor' && rnd() < 0.5) {
          const dk = (R.S && R.S.dexKills) || {}, ok = Object.keys(dk).filter(id => dk[id] >= 10 && R.ENEMIES[id] && !R.ENEMIES[id].boss && !R.ENEMIES[id].fly && !R.ENEMIES[id].human && R.BEAST_ART && R.BEAST_ART[id]);
          if (ok.length) s = Object.assign({}, s, { beast: ok[Math.floor(rnd() * ok.length)] });
        }
      } catch (e) { }
      return pet0(s, P, w, pw0);
    };
  }
  const lf0 = R.loadFloor;
  R.loadFloor = (...a) => { R.PETS = []; R.petFocus = null; return lf0(...a); };

  // ======================= 術陣師：閉環 =======================
  const ptLife = P => (adv(P) === 'eidanora' ? 16 : 8);
  CORE.arraymage = {
    name: '閉環', col: '#7AC8E8',
    help: P => '閉環（艾達諾拉派）：放在地上的法陣（落點、場域的技能）和 X 放的陣眼都是一個點，' + ptLife(P) + ' 秒內有三個點彼此 11 公尺以內就連成閉環：三角形裡面 3.5 倍傷害＋定身 2 秒。X 陣眼：在準心處放一個點（冷卻 3 秒）。'
      + ({ grandarray: '大陣師：閉環範圍 +30%、傷害 ×1.3。', warder: '結界師：閉環給你 15% 生命的護盾。', eidanora: '艾達諾拉的傳人：點留 16 秒。' }[adv(P)] || ''),
    point(P, x, z) {
      const L = (P._pts || []).filter(p => CT() - p.t < ptLife(P)); L.push({ x, z, t: CT() }); P._pts = L;
      R.fx && R.fx('ring', x, 0.1, z, { r: 1, color: '#7AC8E8' });
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) for (let k = j + 1; k < L.length; k++) {
        const a = L[i], b = L[j], c = L[k]; if (Math.hypot(a.x - b.x, a.z - b.z) > 11 || Math.hypot(a.x - c.x, a.z - c.z) > 11 || Math.hypot(b.x - c.x, b.z - c.z) > 11) continue;
        this.close(P, [a, b, c]); P._pts = L.filter(p => p !== a && p !== b && p !== c); return;
      }
    },
    close(P, T) {
      const cx = (T[0].x + T[1].x + T[2].x) / 3, cz = (T[0].z + T[1].z + T[2].z) / 3, big = adv(P) === 'grandarray';
      const r = (Math.max(...T.map(p => Math.hypot(p.x - cx, p.z - cz))) + 1.5) * (big ? 1.3 : 1);
      T.forEach((p, i) => { const q = T[(i + 1) % 3]; R.fx && R.fx('aim', p.x, 0.3, p.z, { a: Math.atan2(q.x - p.x, q.z - p.z), len: Math.hypot(q.x - p.x, q.z - p.z), t: 0.6 }); });
      R.fx && R.fx('ring', cx, 0.1, cz, { r, color: '#7AC8E8' }); R.fx && R.fx('pillar', cx, 0, cz, { color: '#BFE8FF' }); R.shake && R.shake(0.3);
      (W().enemies || []).forEach(e => { if (!e.dead && Math.hypot(e.x - cx, e.z - cz) < r) e.st.root = Math.max(e.st.root || 0, 2); });
      R.coreAoe(cx, cz, r, pw(P) * 3.5 * (big ? 1.3 : 1), {});
      if (adv(P) === 'warder') { P.shield = Math.max(P.shield || 0, P.hpMax * 0.15); P.buff.shieldT = Math.max(P.buff.shieldT || 0, 6); }
      R.num && R.num(cx, 2.6, cz, '閉環', 'crit');
    },
    aimPt(P, range) { const ax = P.aimX != null ? P.aimX : P.x + Math.sin(P.aimA) * 6, az = P.aimZ != null ? P.aimZ : P.z + Math.cos(P.aimA) * 6, d = Math.hypot(ax - P.x, az - P.z), k = d > range ? range / d : 1; return [P.x + (ax - P.x) * k, P.z + (az - P.z) * k]; },
    onCast(P, i, id) { const L = R.SKILL_LIB && R.SKILL_LIB[id]; if (!(L && ['at', 'zone', 'storm', 'mark'].includes(L.type)) && i !== 0) return; const [x, z] = this.aimPt(P, (L && L.p && L.p.range) || 10); this.point(P, x, z); },
    act(P) { if ((P._eyeCd || 0) > CT()) return; P._eyeCd = CT() + 3; const [x, z] = this.aimPt(P, 12); this.point(P, x, z); say(P, '陣眼', 'heal'); },
    gauge(P) { const L = (P._pts || []).filter(p => CT() - p.t < ptLife(P)), cd = Math.max(0, (P._eyeCd || 0) - CT()); return { name: '閉環 ' + L.length + '／3', v: L.length, max: 3, text: L.length ? '最早的還剩 ' + Math.max(0, ptLife(P) - (CT() - L[0].t)).toFixed(1) + ' 秒' : '放法陣或陣眼', x: cd > 0 ? '冷卻 ' + cd.toFixed(1) : '陣眼' }; }
  };

  // ======================= 附魔師：刻印切換 =======================
  const RUNE = { flame: ['焰', '#FF7A3A'], frost: ['霜', '#9AD8FF'], storm: ['雷', '#FFE070'] }, RU = ['flame', 'frost', 'storm'];
  CORE.enchanter = {
    name: '刻印', col: '#FF9A6A',
    help: P => '刻印切換（恩特安派）：X 換武器上的刻印（焰、霜、雷）。普攻打中攢刻印的力量；換掉的時候舊的刻印釋放——焰＝前方火焰爆、霜＝身邊冰封定身、雷＝連鎖閃電打五隻，攢越滿越痛。焰普攻會燒、霜普攻會減速、雷普攻會電到旁邊。'
      + ({ runesmith: '刻印師：釋放 ×1.5、攢得快一半。', spellblade: '魔劍士：釋放時多打出一道劍氣（前方一直線）。', entian: '恩特安的傳人：釋放打到的敵人破防（5 秒你的傷害 +20%）。' }[adv(P)] || ''),
    floor: P => { P._rune = P._rune || 'flame'; },
    mod(e, raw, o, P) {
      if ((e._sunder || 0) > CT()) raw *= 1.2;
      if (o.primary && !o.reflect) {
        P._runeCh = Math.min(100, (P._runeCh || 0) + (adv(P) === 'runesmith' ? 6 : 4));
        const r = P._rune || 'flame';
        if (r === 'flame' && rnd() < 0.2) e.st.burn = 3;
        if (r === 'frost') e.st.slow = Math.max(e.st.slow || 0, 1.5);
        if (r === 'storm' && rnd() < 0.15) { const n = (W().enemies || []).find(x => !x.dead && x !== e && dist(x, e) < 5); if (n) { R.fx && R.fx('bolt', e.x, 1, e.z, { to: n }); R.coreHit(n, raw * 0.4, {}); } }
      }
      return raw;
    },
    release(P) {
      const ch = P._runeCh || 0; P._runeCh = 0; if (ch < 20) return;
      const r = P._rune, k = pw(P) * (adv(P) === 'runesmith' ? 1.5 : 1), sund = adv(P) === 'entian', hitList = [];
      const hitAt = (x, z, rad, dmg, o) => (W().enemies || []).forEach(e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < rad + e.def.size * 0.5) { R.coreHit(e, dmg, o || {}); hitList.push(e); } });
      if (r === 'flame') { const x = P.x + Math.sin(P.aimA) * 2.5, z = P.z + Math.cos(P.aimA) * 2.5; R.fx && R.fx('boom', x, 0.4, z, { r: 2.8, color: '#FF7A3A' }); hitAt(x, z, 2.8, k * ch / 25); hitList.forEach(e => { e.st.burn = 3; }); }
      else if (r === 'frost') { R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 3.5, color: '#9AD8FF' }); hitAt(P.x, P.z, 3.5, k * ch / 40); hitList.forEach(e => { e.st.root = Math.max(e.st.root || 0, 2); }); }
      else { const L = (W().enemies || []).filter(e => !e.dead && dist(e, P) < 9).sort((a, b) => dist(a, P) - dist(b, P)).slice(0, 5); let from = P; L.forEach(e => { R.fx && R.fx('bolt', from.x, 1.2, from.z, { to: e }); R.coreHit(e, k * ch / 30, { stun: 0.5 }); hitList.push(e); from = e; }); }
      if (adv(P) === 'spellblade') [2, 4, 6].forEach(d => hitAt(P.x + Math.sin(P.aimA) * d, P.z + Math.cos(P.aimA) * d, 1.3, k * ch / 50));
      if (sund) hitList.forEach(e => { e._sunder = CT() + 5; });
      R.shake && R.shake(0.2); say(P, RUNE[r][0] + '・釋放', 'crit');
    },
    act(P) { this.release(P); const i = RU.indexOf(P._rune || 'flame'); P._rune = RU[(i + 1) % 3]; R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 1.4, color: RUNE[P._rune][1] }); },
    gauge(P) { const r = P._rune || 'flame', ch = P._runeCh || 0; return { name: '刻印：' + RUNE[r][0], col: RUNE[r][1], v: ch, max: 100, full: ch >= 100, text: Math.floor(ch) + '／100', sub: '普攻攢力量', x: (ch >= 20 ? '釋放＋' : '') + '換成' + RUNE[RU[(RU.indexOf(r) + 1) % 3]][0] }; }
  };

  // ======================= 符卷師：卷軸組 =======================
  CORE.scroll = {
    name: '卷軸組', col: '#E8C878',
    help: P => '卷軸組（諾克薩派）：6 秒內放' + (adv(P) === 'noxa' ? '兩' : '三') + '種不同的技能＝連鎖，最後那一招再放一次（不扣魔力、不進冷卻）。X 展卷：用掉 ' + (adv(P) === 'scribe' ? 2 : 3) + ' 張寫好的卷軸，所有技能冷卻歸零（30 秒一次）。'
      + ({ scribe: '抄寫師：展卷只要 2 張。', sealer: '封印師：連鎖的那一招會暈 0.8 秒。', noxa: '諾克薩的傳人：兩種不同的技能就連鎖。' }[adv(P)] || ''),
    onCast(P, i, id) {
      if (!id || P._echoing) return;
      const L = (P._chain || []).filter(x => CT() - x[1] < 6 && x[0] !== id); L.push([id, CT()]); P._chain = L;
      const need = adv(P) === 'noxa' ? 2 : 3; if (new Set(L.map(x => x[0])).size < need) return;
      P._chain = [];
      const lib = R.SKILL_LIB && R.SKILL_LIB[id], T = R.SKILL_TYPES; if (!lib || !T || !T[lib.type]) return;
      say(P, '連鎖', 'crit');
      setTimeout(() => { const w = W(); if (!w.run || w.run.done || !w.P || w.P.dead) return; P._echoing = true; try { const s = Object.assign({ _id: id + ':echo' }, lib.p, adv(P) === 'sealer' ? { stun: Math.max((lib.p && lib.p.stun) || 0, 0.8) } : {}); T[lib.type](s, w.P, w, pw(w.P)); } catch (e) { } finally { P._echoing = false; } }, 250);
    },
    act(P) {
      const need = adv(P) === 'scribe' ? 2 : 3, S = R.S, have = (S && S.scrolls) || 0;
      if ((P._unrollCd || 0) > CT()) { toast('展卷還在冷卻（' + Math.ceil(P._unrollCd - CT()) + ' 秒）'); return; }
      if (have < need) { toast('寫好的卷軸不夠（要 ' + need + ' 張，現在 ' + have + '）'); return; }
      S.scrolls = have - need; P._unrollCd = CT() + 30; P.skillCd = 0; if (P.skCd) P.skCd = P.skCd.map(() => 0);
      R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 3, color: '#E8C878' }); say(P, '展卷', 'heal');
    },
    gauge(P) { const L = (P._chain || []).filter(x => CT() - x[1] < 6), need = adv(P) === 'noxa' ? 2 : 3, cd = Math.max(0, (P._unrollCd || 0) - CT()); return { name: '連鎖 ' + L.length + '／' + need, v: L.length, max: need, text: '卷軸 ' + ((R.S && R.S.scrolls) || 0) + ' 張', sub: '6 秒內放不同的技能', x: cd > 0 ? '展卷 ' + Math.ceil(cd) + ' 秒' : '展卷' }; }
  };
})(window.R);
