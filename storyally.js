// 劇情的三位主要隊友（望月瀧、雷諾、楚璐）跟著你的實力變強，雷諾、楚璐也有自己的招式、成為戀人之後也會教你
// （2026-10-05 作者：望月瀧沒有被成功增強，其他兩個主要角色也可以，同款的增強和教會技能）
// 瀧沒變強的原因：taki.js 的增強乘在「隊友的基本數值」上，隊友的數值只看自己的等級和預設的武器——
//   瀧的等級最多到她原本的 40 級，也不看你的裝備；你的等級、裝備越好，她相對越弱（高等級、神話裝的時候差最多）。
// 改成：
// - 等級：瀧＝你的等級 +15（至少 20）；雷諾、楚璐＝你的等級 +10（至少 12）；最高到等級上限，不再卡在原本的等級。
// - 數值至少跟你一樣有用：每秒的普攻傷害至少是你普攻的 ×1.3（瀧）／×1.1（雷諾、楚璐），生命至少是你的 ×2.2／×1.6，防禦至少你的 +10／+6。
//   你的普攻＝武器一下 × 傷害倍率 × 段數 × 攻速（R.calcPlayer 算好的 P.ws、P.dmgMult）。
// - 雷諾（術士）：護壁（受到的傷害 −35%）；頁籤彈（每 3.5 秒，追蹤的魔力彈打 10 公尺內最多 5 隻）；
//   流星帳（每 12 秒，最密的那群落一顆流星、燒起來）；冊頁結界（生命四成以下：2 秒擋下所有攻擊、回復兩成五；30 秒一次）。
// - 楚璐（槍手）：翻身（被打的時候三成五躲開，躲不開的少兩成五）；穿甲彈（每 4 秒，一發穿過一整排）；
//   油彈（每 12 秒，最密的那群丟一罐、燒起來）；引擎咆哮（每 15 秒，身邊 3 隻以上：震開、暈眩）；急救包（生命四成以下：回三成、1.5 秒不會受傷；30 秒一次）。
// - 教技能（跟瀧一樣）：成為戀人之後，和雷諾說話多「請雷諾教你魔法」（術士 10／20／30 級：書籤 → 頁籤彈 → 流星帳），
//   和楚璐說話多「請楚璐教你槍法」（槍手 10／20／30 級：調校 → 穿甲彈 → 油彈），每次隔 7 天（R.S.storyLesson[人] = { n, day }）。
//   學會的一樣存在 R.S.taught；技能書那一段的標題照教的人（skillbook.js 看 R.TEACHER）。
// 放在 taki.js、takiteach.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), rnd = Math.random;
  R.TEACHER = Object.assign(R.TEACHER || {}, { taki: '望月瀧', reno: '雷諾', churu: '楚璐' });
  const MAIN = { taki: { up: 15, min: 20, hit: 1.3, hp: 2.2, def: 10 }, reno: { up: 10, min: 12, hit: 1.1, hp: 1.6, def: 6 }, churu: { up: 10, min: 12, hit: 1.1, hp: 1.6, def: 6 } };
  const of = m => m && m.story && MAIN[m.story] ? m.story : null;

  // ---------- 等級：跟著你走，不卡在原本的等級 ----------
  const sy0 = R.syncStoryLv;
  R.syncStoryLv = () => {
    if (sy0) sy0();
    const s = S(); if (!s || !s.classes || !s.classes[s.cls]) return;
    const cap = R.LV_CAP || 100, mine = s.classes[s.cls].lv || 1;
    (s.party || []).forEach(m => { const K = MAIN[of(m)]; if (K) m.lv = Math.max(K.min, Math.min(cap, mine + K.up)); });
  };
  // ---------- 數值：至少跟你一樣有用 ----------
  const as0 = R.allyStats;
  R.allyStats = m => {
    const st = as0(m), id = of(m), K = MAIN[id], P = W().P; if (!K) return st;
    st.story = id;
    if (!P || !P.ws || !W().run) return st;
    const ws = P.ws, mine = (ws.dmg || 0) * (P.dmgMult || 1) * (ws.hits || 1) * Math.max(1, ws.pellets || 1) * (ws.rate || 1);
    const theirs = (st.dmg || 0) * (st.rate || 1) * Math.max(1, st.pellets || 1);
    if (mine > 0 && theirs > 0 && theirs < mine * K.hit) st.dmg *= mine * K.hit / theirs;
    st.hpMax = Math.round(Math.max(st.hpMax, (P.hpMax || 0) * K.hp));
    st.def = Math.max(st.def || 0, (P.def || 0) + K.def);
    return st;
  };

  // ---------- 雷諾、楚璐：被打 ----------
  const ha0 = R.hurtAlly;
  R.hurtAlly = (a, raw, src) => {
    const id = a && of(a.m);
    if (id === 'reno' && !a.downed && !(a.iframe > 0)) { if (a.rnWard > 0) { a.iframe = 0.2; R.num(a.x, 2.2, a.z, '擋', 'heal'); return; } raw *= 0.65; }
    if (id === 'churu' && !a.downed && !(a.iframe > 0)) { if (rnd() < 0.35) { a.iframe = 0.3; R.num(a.x, 2.2, a.z, '翻身', 'heal'); return; } raw *= 0.75; }
    return ha0(a, raw, src);
  };

  // ---------- 雷諾、楚璐：招式 ----------
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done && !W().paused) f(); }, ms); };
  const foes = (w, x, z, r) => (w.enemies || []).filter(e => !e.dead && !e.under && Math.hypot(e.x - x, e.z - z) < r + (e.def ? e.def.size * 0.4 : 0));
  const densest = (w, a, r, rr) => { const c = foes(w, a.x, a.z, r); if (!c.length) return null; return c.map(e => [e, foes(w, e.x, e.z, rr).length]).sort((p, q) => q[1] - p[1])[0][0]; };
  const hitAll = (w, x, z, r, dmg, a, f) => foes(w, x, z, r).forEach(e => { if (f) f(e); R.allyHit(e, dmg, a); });
  const reno = (a, w, dt) => {
    a.rnTab = (a.rnTab == null ? 2 : a.rnTab) - dt; a.rnMet = (a.rnMet == null ? 5 : a.rnMet) - dt; a.rnSave = (a.rnSave || 0) - dt; if (a.rnWard > 0) a.rnWard -= dt;
    // 冊頁結界
    if (a.rnSave <= 0 && a.hp < a.hpMax * 0.4) { a.rnSave = 30; a.rnWard = 2; a.iframe = Math.max(a.iframe || 0, 0.3); a.hp = Math.min(a.hpMax, a.hp + a.hpMax * 0.25); R.fx('ring', a.x, 0.1, a.z, { r: 2.2, color: '#C8E86A' }); R.num(a.x, 2.6, a.z, '冊頁結界', 'heal'); }
    // 頁籤彈
    if (a.rnTab <= 0) {
      const tg = foes(w, a.x, a.z, 10).sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z)).slice(0, 5);
      if (!tg.length) a.rnTab = 0.5; else { a.rnTab = 3.5; a.h.recoil = 1; R.num(a.x, 2.6, a.z, '頁籤彈', 'heal');
        tg.forEach((e, i) => R.fire({ kind: 'orb', owner: 'p', ally: true, by: a, x: a.x, z: a.z, a: Math.atan2(e.x - a.x, e.z - a.z) + (i - 2) * 0.08, speed: 16, dmg: a.st.dmg * 1.4, life: 1, homing: 6 })); }
    }
    // 流星帳
    if (a.rnMet <= 0) {
      const tg = densest(w, a, 12, 3.5); if (!tg) { a.rnMet = 1; return; }
      a.rnMet = 12; const x = tg.x, z = tg.z; R.num(a.x, 2.6, a.z, '流星帳', 'heal'); R.fx('mark', x, 0, z, { r: 3.5, t: 0.7, color: '#C8E86A' });
      later(() => { R.fx('boom', x, 0.6, z, { r: 3.5, color: '#E8F08A' }); R.shake && R.shake(0.25); hitAll(w, x, z, 3.5, a.st.dmg * 3.4, a, e => { e.st.burn = Math.max(e.st.burn || 0, 3); }); }, 700);
    }
  };
  const churu = (a, w, dt) => {
    a.crShot = (a.crShot == null ? 2 : a.crShot) - dt; a.crOil = (a.crOil == null ? 5 : a.crOil) - dt; a.crRev = (a.crRev == null ? 7 : a.crRev) - dt; a.crKit = (a.crKit || 0) - dt;
    // 急救包
    if (a.crKit <= 0 && a.hp < a.hpMax * 0.4) { a.crKit = 30; a.iframe = Math.max(a.iframe || 0, 1.5); a.hp = Math.min(a.hpMax, a.hp + a.hpMax * 0.3); R.fx('ring', a.x, 0.1, a.z, { r: 1.8, color: '#9AE0B0' }); R.num(a.x, 2.6, a.z, '急救包', 'heal'); }
    // 穿甲彈：打最近那隻的方向，一整排
    if (a.crShot <= 0) {
      const tg = foes(w, a.x, a.z, 14).sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z))[0];
      if (!tg) a.crShot = 0.5; else {
        a.crShot = 4; a.h.recoil = 1; const ang = Math.atan2(tg.x - a.x, tg.z - a.z), ca = Math.sin(ang), sa = Math.cos(ang);
        R.fx('muzzle', a.x + ca * 0.9, 1.15, a.z + sa * 0.9, {}); R.fx('slash', a.x, 1.1, a.z, { a: ang, len: 16 }); R.num(a.x, 2.6, a.z, '穿甲彈', 'heal'); R.sfx && R.sfx('gun');
        (w.enemies || []).forEach(e => { if (e.dead || e.under) return; const dx = e.x - a.x, dz = e.z - a.z, along = dx * ca + dz * sa, side = Math.abs(dx * sa - dz * ca); if (along > -0.3 && along < 16 && side < 0.8 + e.def.size * 0.5) R.allyHit(e, a.st.dmg * 3, a); });
      }
    }
    // 油彈
    if (a.crOil <= 0) {
      const tg = densest(w, a, 11, 3.2); if (!tg) a.crOil = 1; else {
        a.crOil = 12; const x = tg.x, z = tg.z; R.num(a.x, 2.6, a.z, '油彈', 'heal'); R.fx('mark', x, 0, z, { r: 3.2, t: 0.5, color: '#FF8A3A' });
        later(() => { R.fx('boom', x, 0.5, z, { r: 3.2, color: '#FF8A3A' }); hitAll(w, x, z, 3.2, a.st.dmg * 2.6, a, e => { e.st.burn = Math.max(e.st.burn || 0, 4); }); }, 500);
      }
    }
    // 引擎咆哮：被圍住的時候
    if (a.crRev <= 0) {
      const n = foes(w, a.x, a.z, 5); if (n.length < 3) a.crRev = 1; else {
        a.crRev = 15; R.num(a.x, 2.6, a.z, '引擎咆哮', 'heal'); R.fx('ring', a.x, 0.1, a.z, { r: 4.5, color: '#FFD04A' }); R.shake && R.shake(0.2);
        n.forEach(e => { const d = Math.max(0.5, Math.hypot(e.x - a.x, e.z - a.z)); e.kx = (e.kx || 0) + (e.x - a.x) / d * 9; e.kz = (e.kz || 0) + (e.z - a.z) / d * 9; e.st.stun = Math.max(e.st.stun || 0, 1.2); R.allyHit(e, a.st.dmg * 1.5, a); });
      }
    }
  };
  const ua0 = R.updateAllies;
  R.updateAllies = dt => {
    const r = ua0(dt), w = W(); if (!w.run || w.paused) return r;
    (w.allies || []).forEach(a => { if (a.downed || a.dead) return; const id = of(a.m); if (id === 'reno') reno(a, w, dt); else if (id === 'churu') churu(a, w, dt); });
    return r;
  };

  // ---------- 教技能（成為戀人之後） ----------
  const DAYS = 7;
  const TEACH = {
    reno: { cls: 'mage', btn: '請雷諾教你魔法', lessons: [
      { id: 'rn_bookmark', name: '書籤', cd: 14, mp: 12, type: 'buff', p: { t: 8, dmg: 1.15, crit: 0.15, color: '#C8E86A' }, need: 10,
        desc: '在魔導書夾上書籤，咒文念得又快又準：8 秒內傷害 +15%、暴擊率 +15%。雷諾教的。',
        lines: ['「先別急著念。翻到你要的那頁，夾一張書籤。」雷諾從冊子裡抽出一條細細的布條給你。', '你照著做了一次。雷諾看了看，把書籤往下挪了一格。', '「對，就是這樣。翻得到才念得準，念得準就不浪費魔力。」'] },
      { id: 'rn_tabs', name: '頁籤彈', cd: 9, mp: 16, type: 'shots', p: { n: 5, spread: 0.9, k: 0.9, homing: 6, kind: 'orb', sp: 16, life: 1.6 }, need: 20,
        desc: '把五張頁籤折成魔力彈一起丟出去，追著敵人撞上去。雷諾教的。',
        lines: ['「這招我平常拿來省力氣。一次五發，自己會找目標。」', '雷諾撕下五張頁籤，一張一張折好，排在桌上給你看。', '「折法不一樣，飛的方向就不一樣。你先記住第一張，其他的照著折。」'] },
      { id: 'rn_meteor', name: '流星帳', cd: 18, mp: 26, type: 'at', p: { range: 11, r: 3.5, k: 1.6, waves: 3, gap: 350, fx: 'boom', color: '#E8F08A', burn: 1 }, need: 30,
        desc: '把一整頁的帳算完，連續三顆流星落在準心處、燒起來。雷諾教的。',
        lines: ['「這是我最貴的一招，魔力用得兇。不到要緊的時候別用。」', '雷諾把冊子翻到最後一頁，一行一行指給你看，算到最後一行才停下來。', '「帳算清楚了，才落得下來。少算一行，就只會冒煙。」'] }
    ] },
    churu: { cls: 'gunner', btn: '請楚璐教你槍法', lessons: [
      { id: 'cr_tune', name: '調校', cd: 14, mp: 10, type: 'buff', p: { t: 8, speed: 1.15, dmg: 1.15, color: '#6AA8FF' }, need: 10,
        desc: '把槍和腳步都調順：8 秒內移動 +15%、傷害 +15%。楚璐教的。',
        lines: ['「槍跟機車一樣，聲音不對就是哪裡沒調好。」楚璐把你的槍接過去，拉了兩下槍機。', '她把一顆螺絲轉緊了半圈，再把槍還給你。「你自己的腳步也一樣，先找到順的節奏。」', '「好，現在聽起來對了。」'] },
      { id: 'cr_pierce', name: '穿甲彈', cd: 10, mp: 16, type: 'shots', p: { k: 3.6, pierce: 8, kind: 'bullet', sp: 40 }, need: 20,
        desc: '換上刻了咒文的穿甲彈：一發穿過一整排敵人。楚璐教的。',
        lines: ['「一般的子彈打到第一隻就停了。這個不會。」楚璐從腰包裡拿出一顆彈頭比較尖的子彈。', '「彈頭上的咒文要對準膛線，不然會偏。來，你裝一次。」', '你裝了兩次才裝對。楚璐點點頭。「打的時候別閉眼睛。」'] },
      { id: 'cr_oil', name: '油彈', cd: 16, mp: 22, type: 'at', p: { range: 11, r: 3.2, k: 2.4, burn: 1, fx: 'boom', color: '#FF8A3A', delay: 450 }, need: 30,
        desc: '把一罐機油綁上信管丟出去：落點炸開、燒起來。楚璐教的。',
        lines: ['「這招不能在車子旁邊練。」楚璐把機車推遠了一點，才拿出一個小罐子。', '她示範怎麼把信管綁緊，綁到一半停下來，讓你自己綁完。', '「丟出去以後往後退兩步。油會濺，衣服很難洗。」'] }
    ] }
  };
  Object.keys(TEACH).forEach(who => { const T = TEACH[who]; T.lessons.forEach(L => { if (!R.SKILL_LIB) return; R.SKILL_LIB[L.id] = { id: L.id, name: L.name, cls: T.cls, lv: 1, cd: L.cd, mp: L.mp, type: L.type, p: L.p, desc: L.desc, taught: who }; R.SKILLS[L.id] = { name: L.name, cd: L.cd, mp: L.mp, desc: L.desc }; }); });
  R.STORY_LESSONS = TEACH;
  const next = who => { const t = S().taught || {}; return TEACH[who].lessons.find(L => !t[L.id]); };
  const status = who => {
    const s = S(), L = next(who); if (!L) return { done: true };
    const c = TEACH[who].cls, lv = s.classes[c] ? s.classes[c].lv : 0, rec = (s.storyLesson || {})[who], wait = rec && rec.day != null ? rec.day + DAYS - (s.day || 0) : 0;
    return { L, lvOk: lv >= L.need, wait: Math.max(0, wait), cname: R.clsName ? R.clsName(c) : c };
  };
  R.personExtras = R.personExtras || [];
  R.personExtras.push({
    html: id => {
      const T = TEACH[id]; if (!T || !S().rel || S().rel[id] !== 'lover') return '';
      const st = status(id); if (st.done) return '';
      const ok = st.lvOk && !st.wait, why = !st.lvOk ? st.cname + ' Lv ' + st.L.need + ' 才學得會' : st.wait ? st.wait + ' 天後再教' : '';
      return '<button type="button" class="btn' + (ok ? ' gold' : '') + '" id="sa-teach"' + (ok ? '' : ' disabled') + ' title="' + R.esc(why) + '">' + T.btn + '：' + R.esc(st.L.name) + (why ? '（' + R.esc(why) + '）' : '') + '</button>';
    },
    bind: id => {
      const b = $('sa-teach'), T = TEACH[id]; if (!b || !T) return;
      b.onclick = () => {
        const s = S(), st = status(id); if (st.done || !st.lvOk || st.wait) return;
        s.taught = s.taught || {}; s.taught[st.L.id] = 1; s.storyLesson = s.storyLesson || {}; s.storyLesson[id] = { n: T.lessons.filter(L => s.taught[L.id]).length, day: s.day || 0 }; R.save();
        R.closeSheet(); R.townTalk(R.TEACHER[id], st.L.lines.concat(['（學會了「' + st.L.name + '」：' + st.cname + '的技能書，「' + R.TEACHER[id] + '教的」那一段）']));
        R.sfx && R.sfx('magic');
      };
    }
  });
})(window.R);
