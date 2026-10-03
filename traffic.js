// 交通和罰金（作者 2026-10-04）
// 1.「區分一下車走的和人走的；在斑馬線和人走的地方撞人才會被罰」：
//    R.pedZone(x, z)：人走的地方＝人行道、斑馬線、巷子（沒有人行道，本來就是人車共用）、拱廊商店街、廣場……；
//    車道＝主幹道、副幹道扣掉兩邊人行道的部分（斑馬線除外）。開車在車道上撞到亂穿越的人：不罰（vehicles.js 問這個）。
// 2.「出車禍會隨機給予輕傷、中傷、重傷三種持續 debuff」：開車撞牆、撞車、被巡邏車撞，撞之前的速度越快越容易受傷、傷得越重。
//    R.S.injury＝{ lv: 1～3, until: 第幾天 }。輕傷 2 天、中傷 4 天、重傷 7 天；生命上限、傷害、走路的速度變差。
//    東鶴醫院的掛號處可以治療（輕傷 40、中傷 150、重傷 400 費拉）。
// 3.「抓的罰款有點多了，可以上法院申訴」：罰金在 punish.js 改輕（基本罰金＋身上的錢的 5%，有上限）；
//    被抓之後三天內可以申訴（衛兵所的那張單子、城裡的選單「法院申訴」）：訴訟費 20 費拉，隔天判決，成功退回罰金。
// 放在 vehicles.js、pursuit.js、punish.js、interiors2.js 後面。
(function (R) {
  const W = R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s), C = R.CITY;

  // ---------- 1. 人走的地方 ----------
  const SW = { main: 8, sub: 6 };   // 人行道的寬（cityscape.js 一樣）
  const carriage = (sx, sy) => C.roads.some(rd => (rd.kind === 'main' || rd.kind === 'sub') && !rd.broken && C.lineDist(sx, sy, rd.pts) < rd.w / 2 - SW[rd.kind]);
  const crosswalk = (sx, sy) => (C.junctions || []).some(J => [J.a, J.b].some(rd => {
    if (rd.kind !== 'main' && rd.kind !== 'sub') return false;
    const other = rd === J.a ? J.b : J.a, a = rd === J.a ? J.angA : J.angB, ux = Math.cos(a), uy = Math.sin(a), off = other.w / 2 + 5;
    return [-1, 1].some(sd => { const cx = J.x + ux * off * sd, cy = J.y + uy * off * sd, dx = sx - cx, dy = sy - cy; return Math.abs(dx * ux + dy * uy) < 4.5 && Math.abs(-dx * uy + dy * ux) < rd.w / 2; });
  }));
  R.pedZone = (x, z) => { if (W.town && W.town.hosu) return true; const sx = x / C.S + 500, sy = z / C.S + 500; return !carriage(sx, sy) || crosswalk(sx, sy); };

  // 路人：被別的東西移開（回家又出來、被撞開、讓路……）之後，記得的下一個點可能在馬路對面，會直直斜穿過去。
  // 每半秒看一次：要走的那一段會穿過車道，就先走到身邊最近、不用過馬路的點（pedpaths.js）。
  let pedT = 0;
  const pedCheck = () => {
    const tw = W.town; if (!tw || tw.hosu || W.inside || !R.pedCross || !R.pedNearest) return;
    const P = W.P, k = 1 / C.S;
    tw.npcs.forEach(n => {
      if (!n.walk || !n.next || n.chase || n.patrol || n.off || n.flee > 0 || n.guard) return;
      if (P && (Math.abs(n.x - P.x) > 90 || Math.abs(n.z - P.z) > 90)) return;
      const a = [n.x * k + 500, n.z * k + 500], b = [n.tx * k + 500, n.tz * k + 500]; if (!R.pedCross(a, b)) return;
      const j = R.pedNearest(a[0], a[1]); if (j < 0) return;
      n.ni = j; n.prev = undefined; n.tx = (C.nodes[j][0] - 500) * C.S; n.tz = (C.nodes[j][1] - 500) * C.S;
    });
  };
  const tsp = R.townStep;
  R.townStep = dt => { tsp(dt); pedT -= dt; if (pedT <= 0) { pedT = 0.5; try { pedCheck(); } catch (e) { } } };

  // ---------- 2. 車禍受傷 ----------
  const INJ = [null,
    { n: '輕傷', days: 2, hp: 0.1, dmg: 0, spd: 0.05, cure: 40, d: '擦傷、瘀青。生命上限 -10%、走路慢一點。' },
    { n: '中傷', days: 4, hp: 0.2, dmg: 0.1, spd: 0.12, cure: 150, d: '扭傷、肋骨裂了一根。生命上限 -20%、傷害 -10%、走路變慢。' },
    { n: '重傷', days: 7, hp: 0.35, dmg: 0.2, spd: 0.2, cure: 400, d: '骨折，全身都痛。生命上限 -35%、傷害 -20%、走路慢很多。' }];
  R.INJURY = INJ;
  const inj = () => { const s = S(); if (!s || !s.injury) return null; if (s.injury.until <= s.day) { s.injury = null; return null; } return s.injury; };
  R.injuryNow = () => { const i = inj(); return i ? INJ[i.lv] : null; };
  const hurt = speed => {
    const s = S(); if (!s) return;
    const kmh = speed * 3.6, p = kmh > 58 ? 1 : kmh > 43 ? 0.85 : 0.6; if (Math.random() > p) { R.toast('碰！好險，沒受傷。', '#E8C04A'); return; }
    const w = kmh > 58 ? [20, 45, 35] : kmh > 43 ? [40, 45, 15] : [70, 25, 5], r = Math.random() * 100, lv = r < w[0] ? 1 : r < w[0] + w[1] ? 2 : 3;
    const cur = inj(), nl = cur ? Math.max(cur.lv, lv) : lv; s.injury = { lv: nl, until: s.day + INJ[nl].days }; R.save();
    R.banner('出車禍了：' + INJ[nl].n, INJ[nl].d + '（' + INJ[nl].days + ' 天，東鶴醫院可以治療）');
    if (R.shake) R.shake(0.4); R.sfx && R.sfx('hurt');
  };
  // 看自己的車的速度：一格之內速度掉很多＝撞到東西了（撞牆、撞車、被巡邏車撞）
  let lastV = 0, cool = 0;
  const ts0 = R.townStep;
  R.townStep = dt => {
    ts0(dt); cool -= dt;
    const V = R.VEH, v = V && V.cur && V.cur.type === 'car' ? V.cur : null;
    if (!v || W.inside || (W.town && W.town.hosu)) { lastV = 0; return; }
    const now = v.v || 0, dv = Math.abs(lastV - now);
    if (dv > 5 && Math.abs(lastV) > 8 && cool <= 0) { cool = 3; hurt(Math.abs(lastV)); }
    lastV = now;
  };
  // 數值：遺跡裡（calcPlayer）、城裡走路的速度
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => { const P = cp0(cls), i = R.injuryNow(); if (i && P) { P.hpMax = Math.round(P.hpMax * (1 - i.hp)); if (P.dmgMult) P.dmgMult *= 1 - i.dmg; if (P.speed) P.speed *= 1 - i.spd; } return P; };
  const et0 = R.enterTownNow;
  R.enterTownNow = (...a) => { et0(...a); const i = R.injuryNow(); if (i && W.P) W.P.speed *= 1 - i.spd; };
  const ch = R.crimeHud;
  if (ch) R.crimeHud = () => { const s = ch(), i = inj(); return s + (i ? '<span class="wanted" style="color:#FF9A6A">' + INJ[i.lv].n + ' <b>' + (i.until - S().day) + '</b> 天</span>' : ''); };
  // 東鶴醫院：掛號處可以治療
  const ih0 = R.interiorHud;
  R.interiorHud = (force, dt) => {
    ih0(force, dt);
    const ins = W.inside; if (!ins || ins.kind !== 'hospital' || ins.injHooked) return; ins.injHooked = 1;
    const it = ins.inter.find(v => v.label === '掛號處'); if (!it) return;
    const orig = it.act; it.label = '掛號處（治療車禍的傷）';
    it.act = () => {
      const i = inj(); if (!i) { orig(); return; }
      const T = INJ[i.lv], s = S();
      R.sheet('<p class="kicker">東鶴醫院・掛號處</p><h2>治療：' + T.n + '</h2><p>' + esc(T.d) + '</p><p class="note">不治療的話還要 ' + (i.until - s.day) + ' 天才會好。治療費 ' + T.cure + ' 費拉（費拉 ' + s.gold + '）。</p>',
        '<div class="row"><button type="button" class="btn pri" id="ij-go"' + (s.gold < T.cure ? ' disabled' : '') + '>治療（' + T.cure + ' 費拉）</button><button type="button" class="btn" id="ij-x">不用了</button></div>');
      $('ij-x').onclick = R.closeSheet;
      $('ij-go').onclick = () => { if (s.gold < T.cure) return; s.gold -= T.cure; s.injury = null; R.save(); R.closeSheet(); R.toast('完成治療，傷勢造成的數值減益已解除。', '#7AE0A0'); R.sfx && R.sfx('drink'); };
    };
  };

  // ---------- 3. 罰金申訴 ----------
  const ap0 = R.arrestPunish;
  if (ap0) R.arrestPunish = (heat, g) => {
    const s = S(), g0 = s.gold; ap0(heat, g);
    const fine = g0 - s.gold; if (fine <= 0) return;
    s.lastFine = { amt: fine, day: s.day, heat: heat || 1, prior: (s.caughtN || 0), kind: R.crime && R.crime.cause === 'traffic' ? 'traffic' : 'theft' }; if (R.crime) R.crime.cause = null;
    R.save();
    const row = $('r-sheet') && $('r-sheet').querySelector('.row');
    if (row) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = '上法院申訴（罰金不服）'; b.onclick = appealSheet; row.appendChild(b); }
  };
  const canAppeal = () => { const s = S(), f = s && s.lastFine; return f && !f.appealed && s.day - f.day <= 3 ? f : null; };
  const appealSheet = () => {
    const f = canAppeal(), s = S(); if (!f) { R.toast('沒有可以申訴的罰金（被抓之後三天內才能申訴）。'); return; }
    const odds = Math.max(10, Math.min(80, 45 - 12 * f.prior - 6 * (f.heat - 1) + Math.max(-15, Math.min(15, s.rep || 0))));
    R.sheet('<p class="kicker">東鶴地方法院・申訴窗口</p><h2>對罰金不服</h2><p>罰金 ' + f.amt + ' 費拉（第 ' + f.day + ' 天）。申訴的話，法院明天判決：贏了退回罰金；輸了維持原判，訴訟費不退。</p><p class="note">訴訟費 20 費拉。預估申訴成功率：約 ' + odds + '%（前科越多、通緝越重越難；名聲好一點有幫助）。</p>',
      '<div class="row"><button type="button" class="btn pri" id="ap-go"' + (s.gold < 20 ? ' disabled' : '') + '>提出申訴（20 費拉）</button><button type="button" class="btn" id="ap-x">算了</button></div>');
    $('ap-x').onclick = R.closeSheet;
    $('ap-go').onclick = () => { if (s.gold < 20) return; s.gold -= 20; f.appealed = 1; s.appeal = { amt: f.amt, odds, day: s.day }; R.save(); R.closeSheet(); R.toast('申訴書遞出去了。明天判決。', '#E8C04A'); };
  };
  R.appealSheet = appealSheet;
  const nd0 = R.onNewDay;
  R.onNewDay = (...a) => {
    const r = nd0 ? nd0(...a) : undefined, s = S(), ap = s && s.appeal;
    if (ap && s.day > ap.day) {
      s.appeal = null; const win = Math.random() * 100 < ap.odds;
      if (win) s.gold += ap.amt; R.save();
      setTimeout(() => R.banner && R.banner('法院的判決', win ? '申訴成功：罰金 ' + ap.amt + ' 費拉退回來了。' : '申訴駁回：維持原判。'), 1800);
    }
    return r;
  };
  // 城裡的選單：還在申訴期限內就多一顆「法院申訴」
  const tm = R.townMenu;
  if (tm) R.townMenu = (...a) => { const r = tm(...a), row = $('r-sheet') && $('r-sheet').querySelector('.row'); if (row && canAppeal() && !row.querySelector('#ap-open')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'ap-open'; b.textContent = '法院申訴'; b.onclick = () => { R.closeSheet(); setTimeout(appealSheet, 50); }; row.appendChild(b); } return r; };
})(window.R);
