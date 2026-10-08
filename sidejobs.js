// 討伐令 1433：跑腿的打工（作者：GTA 的支線工作——計程車、送貨）
// - 郵局「送包裹」：三個地址，限時（照距離算）；每送到一個 12 費拉，全部準時送完再加剩下的時間當獎金。
//   用走的很趕，騎腳踏車、開車比較從容。地址會設成目的地（雷達和大地圖上有路線）。
// - 站前的計程車行「開計程車」：要開自己的車。客人在哪裡會標出來，開過去停下來（貼近、慢下來）客人就上車；
//   再把客人送到目的地停下來收車資（照距離），撞到東西客人會不高興、小費變少。一趟接一趟，下車太久就收工。
// 上面有提示：要去哪裡、多遠、剩幾秒、這一趟賺多少。
(function (R) {
  const W = R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const C = R.CITY, toS = v => (CKT() ? v : v / C.S + 500), toW = s => (CKT() ? s : (s - 500) * C.S);
  // 2026-10-09：在精緻城市（W.town.ck）用世界座標、精緻城市的路網（ckmove.js 的 W.town.nav、R.CK.navPath）
  const CKT = () => !!(W.town && W.town.ck), NAV = () => (CKT() ? W.town.nav : R.NAV), navPath = (a, b, c, d) => (CKT() ? (R.CK && R.CK.navPath ? R.CK.navPath(a, b, c, d) : null) : (R.navPath ? R.navPath(a, b, c, d) : null));
  const S = () => R.S, P = () => W.P, tw = () => W.town;
  let J = null, hud = null;
  const PLACES = ['米店', '鐘錶行', '中村家', '二丁目的公寓', '豆腐店', '佐藤家', '洗衣店', '老醫生的家', '神社的社務所', '小學的教職員室', '公會的宿舍', '花店', '舊城的長屋', '河邊的倉庫'];
  const PASS = [['上班族', '「麻煩到$，快遲到了！」', '「謝啦，零錢不用找。」'], ['老奶奶', '「年輕人，到$，慢慢開就好。」', '「哎呀，比公車舒服多了。」'], ['勇者', '「去$。剛從遺跡出來，身上有點臭，抱歉。」', '「下次還坐你的車。」'], ['學生', '「到$！我只有這些錢……夠嗎？」', '「謝謝！」'], ['德克斯凡的技師', '「到$，零件很重，小心點。」', '「開得不錯。」']];

  const node = (fn) => { const nodes = NAV() && NAV().nodes, Pl = P(); if (!nodes || !Pl) return null; for (let k = 0; k < 120; k++) { const q = pick(nodes), x = toW(q[0]), z = toW(q[1]), d = Math.hypot(x - Pl.x, z - Pl.z); if (fn(x, z, d) && !R.col.list.some(b => b.on !== false && b.tag === 'house' && x > b.x0 - 1 && x < b.x1 + 1 && z > b.z0 - 1 && z < b.z1 + 1)) return [x, z]; } return null; };
  const wp = (x, z, name) => { if (R.setWaypoint) R.setWaypoint(toS(x), toS(z), name); };
  const clearWp = () => { const w = S() && (CKT() ? S().ckWaypoint : S().waypoint); if (R.clearWaypoint && w && /^打工：/.test(w.name || '')) R.clearWaypoint(); };
  const showHud = h => { if (!hud) { hud = document.createElement('div'); hud.className = 'hud se-hud sj-hud'; const run = document.getElementById('run'); (run || document.body).appendChild(hud); } hud.hidden = !h; if (h && hud.innerHTML !== h) hud.innerHTML = h; };
  const car = () => { const v = R.inVehicle && R.inVehicle(); return v && v.type === 'car' ? v : null; };
  const pay = v => { const s = S(); s.gold += v; s.stats = s.stats || {}; s.stats.jobGold = (s.stats.jobGold || 0) + v; R.save && R.save(); };
  const end = msg => { clearWp(); if (J && J.npc) { const t = tw(); if (t) t.group.remove(J.npc.h.g); } J = null; showHud(''); if (msg) R.townTalk('打工', msg); };

  // ---------- 送包裹 ----------
  const startPost = () => {
    const stops = [], Pl = P(); let from = [Pl.x, Pl.z], dist = 0;
    for (let k = 0; k < 3; k++) { const n = node((x, z, d) => d > 50 && d < 190 && stops.every(s => Math.hypot(s.x - x, s.z - z) > 40)); if (!n) break; dist += Math.hypot(n[0] - from[0], n[1] - from[1]); from = n; stops.push({ x: n[0], z: n[1], name: pick(PLACES) }); }
    if (stops.length < 2) { R.toast('今天沒有包裹要送。'); return; }
    const limit = Math.round(dist / 4.2 + 25 * stops.length);
    J = { kind: 'post', stops, i: 0, t: 0, limit, got: 0 };
    wp(stops[0].x, stops[0].z, '打工：' + stops[0].name);
    R.townTalk('郵局', ['「這三件麻煩你。地址都寫在上面了。」', '（限時 ' + limit + ' 秒。每件 12 費拉，準時送完還有獎金。目的地標在地圖上。）']);
  };
  const stepPost = dt => {
    const Pl = P(), st = J.stops[J.i]; J.t += dt;
    const d = Math.hypot(st.x - Pl.x, st.z - Pl.z), left = J.limit - J.t, v = car() || (R.inVehicle && R.inVehicle());
    showHud('<b>送包裹 ' + (J.i + 1) + '／' + J.stops.length + '：' + st.name + '</b><span>' + Math.round(d) + ' 公尺・剩 ' + Math.max(0, Math.ceil(left)) + ' 秒</span><small>已經賺 ' + J.got + ' 費拉</small>');
    if (d < 4.5 && (!v || Math.abs(v.v || 0) < 3.5)) {
      J.got += 12; pay(12); R.sfx && R.sfx('coin'); R.toast('「' + st.name + '的包裹？謝謝！」（+12 費拉）'); J.i++;
      if (J.i >= J.stops.length) { const bonus = Math.max(0, Math.round(left / 3)); if (bonus) pay(bonus); J.got += bonus; const tot = J.got; end(['全部送完了！' + (bonus ? '準時的獎金 ' + bonus + ' 費拉。' : ''), '（這一趟一共賺了 ' + tot + ' 費拉。）']); return; }
      const n = J.stops[J.i]; wp(n.x, n.z, '打工：' + n.name);
    }
    if (left <= 0) { const got = J.got; end(['超過時間了……郵局的人打電話來說，剩下的包裹他們自己送。', '（這一趟賺了 ' + got + ' 費拉。）']); }
  };

  // ---------- 計程車 ----------
  const startTaxi = () => {
    if (!S().car && !(CKT() && R.VEH && R.VEH.list.some(v => v.type === 'car' && (v.rent || v.own)))) { R.townTalk('計程車行', ['「開計程車要有自己的車喔。新商區的德克斯凡中古車行有在賣。」']); return; }
    J = { kind: 'taxi', st: 'idle', t: 0, got: 0, fares: 0, outT: 0, wait: 2 };
    R.townTalk('計程車行', ['「車頂的燈我幫你裝上了。客人在哪裡會告訴你。」', '（開自己的車載客。下車太久就收工。）']);
  };
  const spawnPass = () => {
    const n = node((x, z, d) => d > 25 && d < 90); if (!n) return false;
    const t = tw(), [nm, l1, l2] = pick(PASS), h = R.makeHero('warrior', null, { pool: 'sj_pass', lite: 1, top: pick(['#3A4A5A', '#8A4A5A', '#6A5A3A', '#2E2E38']), hair: pick(['#1A1410', '#8A8A88', '#4A3424']), weapon: null, shield: false });
    h.g.position.set(n[0], 0, n[1]); t.group.add(h.g);
    J.npc = { h, x: n[0], z: n[1] }; J.pass = { name: nm, l1, l2 }; J.st = 'pick'; J.t = 0;
    wp(n[0], n[1], '打工：' + nm + '在等車'); R.toast('有客人叫車！（' + nm + '）');
    return true;
  };
  const stepTaxi = dt => {
    const Pl = P(), v = car(); J.t += dt;
    if (!v) { J.outT += dt; showHud('<b>計程車（暫停）</b><span>回到車上繼續載客・' + Math.max(0, Math.ceil(25 - J.outT)) + ' 秒後收工</span><small>今天賺 ' + J.got + ' 費拉・' + J.fares + ' 趟</small>'); if (J.outT > 25) { const g = J.got, f = J.fares; end(['收工了。', '（今天載了 ' + f + ' 趟，賺了 ' + g + ' 費拉。）']); } return; }
    J.outT = 0;
    // 撞到東西：車速一下子掉很多
    if (J.lastV != null && Math.abs(J.lastV) - Math.abs(v.v) > 4.5) { J.bumps = (J.bumps || 0) + 1; if (J.st === 'ride') R.toast(pick(['「喂！開慢一點！」', '「我的腰……」', '「你有駕照嗎？」'])); }
    J.lastV = v.v;
    if (J.st === 'idle') { J.wait -= dt; showHud('<b>計程車：空車</b><span>等客人叫車……</span><small>今天賺 ' + J.got + ' 費拉・' + J.fares + ' 趟</small>'); if (J.wait <= 0) { if (!spawnPass()) J.wait = 3; } return; }
    if (J.st === 'pick') {
      const n = J.npc, d = Math.hypot(n.x - Pl.x, n.z - Pl.z); n.h.g.rotation.y = Math.atan2(Pl.x - n.x, Pl.z - n.z); R.animHero(n.h, 0, dt, false);
      showHud('<b>去接客人（' + J.pass.name + '）</b><span>' + Math.round(d) + ' 公尺</span><small>開到旁邊停下來</small>');
      if (d < 5.5 && Math.abs(v.v) < 2) {
        tw().group.remove(n.h.g); J.npc = null;
        const dst = node((x, z, dd) => dd > 70 && dd < 220); if (!dst) { J.st = 'idle'; J.wait = 2; return; }
        J.dst = { x: dst[0], z: dst[1], name: pick(PLACES) }; J.st = 'ride'; J.t = 0; J.bumps = 0; J.dist0 = Math.hypot(dst[0] - Pl.x, dst[1] - Pl.z);
        wp(dst[0], dst[1], '打工：' + J.dst.name); R.toast(J.pass.l1.replace('$', J.dst.name));
      } else if (J.t > 90) { tw().group.remove(n.h.g); J.npc = null; J.st = 'idle'; J.wait = 2; clearWp(); R.toast('客人等不及，叫了別台車。'); }
      return;
    }
    if (J.st === 'ride') {
      const d = Math.hypot(J.dst.x - Pl.x, J.dst.z - Pl.z), fare = Math.round(10 + J.dist0 / 6), par = J.dist0 / 7 + 15;
      showHud('<b>載客中：' + J.dst.name + '</b><span>' + Math.round(d) + ' 公尺・跳表 ' + fare + ' 費拉</span><small>' + (J.t < par ? '快一點有小費' : '客人在看錶……') + (J.bumps ? '・撞了 ' + J.bumps + ' 次' : '') + '</small>');
      if (d < 6 && Math.abs(v.v) < 2) {
        const tip = Math.max(0, Math.round((par - J.t) / 3) - J.bumps * 3), tot = fare + tip; pay(tot); J.got += tot; J.fares++; R.sfx && R.sfx('coin');
        R.toast(J.pass.l2 + '（車資 ' + fare + (tip ? '＋小費 ' + tip : '') + ' 費拉）'); J.st = 'idle'; J.wait = 3 + rnd() * 4; clearWp();
      }
    }
  };

  // ---------- 接工作的地方 ----------
  const build = t => {
    const F = C.FAC, free = (x, z) => { for (let r = 0; r <= 8; r += 0.5) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, nx = x + Math.sin(a) * r, nz = z + Math.cos(a) * r; if (!R.col.list.some(b => b.on !== false && b.tag !== 'deco' && nx > b.x0 - 0.4 && nx < b.x1 + 0.4 && nz > b.z0 - 0.4 && nz < b.z1 + 0.4)) return [nx, nz]; } return null; };
    if (F.post) { const p = free(toW(F.post[0] - 10), toW(F.post[1] + 14)); if (p) t.inter.push({ x: p[0], z: p[1], r: 2, label: '郵局：送包裹的打工', when: () => !J, act: startPost }); }
    { const p = free(toW(C.PLAZA[2] - 34), toW(C.PLAZA[3] - 6)); if (p) t.inter.push({ x: p[0], z: p[1], r: 2.2, label: '計程車行：開計程車的打工', when: () => !J, act: startTaxi }); }
  };
  const step0 = R.townStep;
  R.townStep = dt => {
    step0(dt); if (!J || !P() || !tw()) return;
    if (W.inside) return; if (R.sheetOpen && R.sheetOpen()) return;
    try { if (J.kind === 'post') stepPost(dt); else stepTaxi(dt); } catch (e) { console.warn('[sidejobs]', e); end(); }
  };
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => { if (J) { clearWp(); J = null; } showHud(''); enter0(from, at); const t = tw(); if (t) { try { build(t); } catch (e) { console.warn('[sidejobs]', e); } } };
  R.sideJobDebug = { get J() { return J; }, startPost, startTaxi, spawnPass, end };
  R.sideJobTick = dt => { if (!J || !P() || !tw()) return; if (R.sheetOpen && R.sheetOpen()) return; try { if (J.kind === 'post') stepPost(dt); else stepTaxi(dt); } catch (e) { console.warn('[sidejobs]', e); end(); } };   // 精緻城市（ckmove.js）
  R.sideJobReset = () => { if (J) { clearWp(); J = null; } showHud(''); };
})(window.R);
