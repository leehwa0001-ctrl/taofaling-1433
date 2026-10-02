// 討伐令 1433：卡索級與坎賽特級（作者：遊戲時程拉久一點、更強的分級——卡索級、坎賽特級）
// 照設定：卡索級「公會明文禁止任何個人單獨進入」「約 1500 年間只出現過 7 次」；坎賽特級「發現即通報、撤離」。所以：
// - 卡索級：走完三次克森特級之後，公會會長發下特別討伐令——封鎖海域出現了第八座卡索級遺跡。
//   一定要帶至少兩名隊友（不能單獨進入）。六層、全部是極端環境、生物更硬更痛、領主區、最深處是佩特拉核心；寶箱更好（神話比較常見）。
// - 坎賽特級：不是一個可以進去的分級。卡索級的最後一層待太久，會出現「坎賽特級反應」：
//   打不倒的東西穿過牆慢慢逼近，遠處亮起緊急撤離水晶——活著撤離就好（通報、撤離），撤離成功有公會的特別報酬。
// - 遊戲時程：職業等級 15 以後，升級要的經驗值越來越多（R.xpNeed）。
(function (R) {
  const W = R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const kes = R.gradeById && R.gradeById('kesent'), kaso = R.gradeById && R.gradeById('kaso'); if (!kes || !kaso) return;
  const PARTY_MIN = 2, NEED = 3;
  // ---------- 分級的內容 ----------
  Object.keys(kes).forEach(k => { if (kaso[k] == null) kaso[k] = Array.isArray(kes[k]) ? kes[k].slice() : kes[k]; });
  Object.assign(kaso, { floors: 6, lv: 5, loot: 4, floor0: 0, crystal: 'none', env: 1, unlock: 'kesent', pool: Array.from(new Set(kes.pool)), lords: (kes.lords || []).slice() });
  if (R.THEMES && R.THEMES.kesent && !R.THEMES.kaso) R.THEMES.kaso = Object.assign({}, R.THEMES.kesent);
  if (R.LOOT_WEIGHTS && !R.LOOT_WEIGHTS[4]) R.LOOT_WEIGHTS[4] = [0, 6, 24, 38, 24, 8];
  const site = R.SITES.find(s => s.id === 'kaso'), site0 = site ? { name: site.name, desc: site.desc, kind: site.kind } : null;
  const S = () => R.S;
  const authed = () => !!(S() && S().kasoAuth);
  // ---------- 開放 ----------
  const go0 = R.gradeOpen;
  R.gradeOpen = id => (id === 'kaso' ? authed() : go0(id));
  const sync0 = R.syncStatus;
  R.syncStatus = () => {
    sync0();
    if (!site || !site0) return;
    if (authed()) Object.assign(site, { kind: 'ruin', type: 'island', status: 'open', name: '封鎖海域・第八號卡索級遺跡', desc: '公會會長親筆簽發的特別討伐令。1500 年來第八次出現的卡索級遺跡，浮在封鎖海域的正中央。公會明文禁止任何個人單獨進入：至少帶兩名隊友。' });
    else Object.assign(site, { kind: site0.kind, name: site0.name, desc: site0.desc, status: 'forbidden' });
  };
  // 回到東鶴：走完三次克森特級，公會會長的信
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => {
    enter0(from, at); const s = S(); if (!s || s.kasoAuth || !s.cleared || (s.cleared.kesent || 0) < NEED) return;
    s.kasoAuth = s.day; R.save && R.save(); R.syncStatus();
    setTimeout(() => R.sheet('<p class="kicker">公會本部・會長室</p><h2>特別討伐令</h2><p>「你走完了三座克森特級遺跡。這件事，本部已經知道了。」</p><p>「封鎖海域裡，出現了第八座卡索級遺跡。一千五百年來第八次。」</p><p>「公會明文禁止任何個人單獨進入卡索級遺跡——帶著你的隊伍去。至少兩個人跟著你。」</p><p class="note">「還有一件事。如果在裡面遇到『那個』……不要打。通報，然後撤離。這是命令。」</p>',
      '<div class="row"><button type="button" class="btn pri" id="ks-ok">接下討伐令</button></div>'), 600);
    setTimeout(() => { const b = document.getElementById('ks-ok'); if (b) b.onclick = () => { R.closeSheet(); R.toast('全國地圖上的封鎖海域可以進去了。'); }; }, 700);
  };
  // 單獨不能進
  const sr0 = R.startRun;
  R.startRun = id => {
    const st = R.SITES.find(s => s.id === id);
    if (st && st.grade === 'kaso') {
      if (!authed()) { R.say ? R.say('公會明文禁止任何個人進入卡索級遺跡。') : R.toast('禁止進入。'); return; }
      const n = (S().party || []).length; if (n < PARTY_MIN) { R.say ? R.say('公會明文禁止任何個人單獨進入卡索級遺跡：至少要帶 ' + PARTY_MIN + ' 名隊友（現在 ' + n + ' 名）。到公會的登記處找人。') : R.toast('至少要帶兩名隊友。'); return; }
    }
    return sr0(id);
  };
  // ---------- 升級變慢 ----------
  const xp0 = R.xpNeed;
  R.xpNeed = lv => xp0(lv) + (lv > 15 ? 8 * (lv - 15) * (lv - 15) : 0);

  // ---------- 坎賽特級反應 ----------
  const KDEF = Object.assign({}, R.ENEMIES.petra, { name: '？？？（坎賽特級）', desc: '發現即通報、撤離。', boss: 0, xp: 0, noDex: 1 });
  const trigger = () => {
    const w = W, run = w.run, P = w.P, F = w.F; if (!run || !P || !F) return;
    run.kansait = { t: 0, hitT: 0 };
    R.banner('坎賽特級反應', '牆壁在發抖。不要打——通報，然後撤離。緊急撤離水晶出現在遠處。');
    R.sfx && R.sfx('mine');
    // 牠：佩特拉的樣子放大、染黑，穿牆慢慢逼近
    const a = rnd() * Math.PI * 2, [x, z] = R.nearestFloor(P.x + Math.sin(a) * 20, P.z + Math.cos(a) * 20), room = (R.roomOf && R.roomOf({ x, z })) || F.rooms[0];
    const e = R.spawnEnemy('petra', x, z, room ? room.i : 0, { aggro: true });
    if (e) { e.def = KDEF; e.invuln = true; e.speed = 0; e.kansait = true; if (e.m && e.m.g) e.m.g.scale.multiplyScalar(2.2); const sp = e.m && e.m.sp; if (sp && sp.mat) { sp.mat.color && sp.mat.color.set('#2A1A3A'); if (sp.mat.emissive) { sp.mat.emissive.set('#5A1A8A'); sp.mat.emissiveIntensity = 0.5; } } run.kansait.e = e; }
    // 緊急撤離水晶：離你最遠的房間
    const far = F.rooms.slice().sort((r1, r2) => Math.hypot(r2.x - P.x, r2.z - P.z) - Math.hypot(r1.x - P.x, r1.z - P.z))[0];
    if (far) { const [cx, cz] = R.nearestFloor(far.x, far.z); R.addCrystal(F.group, F, cx, cz, far.i); run.kansait.cx = cx; run.kansait.cz = cz; }
  };
  const step0 = R.step;
  R.step = dt => {
    step0(dt);
    const run = W.run, P = W.P; if (!run || run.done || !P || run.grade.id !== 'kaso' || run.floor !== run.floors - 1) return;
    if (!run.kansait) { run.kt = (run.kt || 0) + dt; if (run.kt > 30) trigger(); return; }
    const K = run.kansait, e = K.e; K.t += dt;
    if (e && !e.dead) {
      const sp0 = e.m && e.m.sp; if (sp0 && sp0.mat) { sp0.mat.color.set('#3A2A4A'); sp0.mat.emissive.set('#6A2AAA'); sp0.mat.emissiveIntensity = 0.35 + 0.15 * Math.sin(K.t * 3); }   // 受擊的閃光每一格會把顏色改回去，這裡再染一次
      const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz), sp = 2.7 + Math.min(1.6, K.t * 0.02);
      if (d > 0.5) { e.x += dx / d * sp * dt; e.z += dz / d * sp * dt; e.m.g.position.set(e.x, 0, e.z); }
      K.hitT -= dt; if (d < 2.8 && K.hitT <= 0) { K.hitT = 0.5; R.hurtPlayer(P.hpMax * 0.2, e); }
      const dc = K.cx != null ? Math.hypot(K.cx - P.x, K.cz - P.z) : 0;
      if (!K.msgT || K.msgT < K.t) { K.msgT = K.t + 4; R.toast('牠在 ' + Math.round(d) + ' 公尺外。撤離水晶在 ' + Math.round(dc) + ' 公尺外。', '#9A5AFF'); }
    }
  };
  // 撤離成功：公會的特別報酬
  const ex0 = R.extract;
  R.extract = how => {
    const run = W.run, K = run && run.kansait, s = S();
    if (K && !run.done && s) {
      s.stats = s.stats || {}; s.stats.kansait = (s.stats.kansait || 0) + 1; s.gold += 2000;
      const kinds = Object.keys(R.WEAPONS), it = R.makeItem && R.makeItem({ kind: 'weapon', base: pick(kinds), ilvl: 14, rarity: 5 }); if (it) run.bag.push(it);
      setTimeout(() => R.toast('通報、撤離成功。公會的特別報酬：2000 費拉，還有一件未鑑定的東西。', '#9A5AFF'), 1500);
    }
    return ex0(how);
  };
  R.kasoDebug = { trigger, kaso, KDEF };
})(window.R);
