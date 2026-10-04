// 卡索級加強、出得去（2026-10-05 作者：卡索級太弱了，可以樓層全亂掉，走一走會有空間裂隙，然後有卡索專有的怪物；
//   卡索級的怪物可以多一點，強度可以再增強；卡索級可能有出不去的 bug；卡索級的怪物種類可以多一點）
// - 出得去：卡索級原本沒有回歸水晶（crystal: 'none'）、第一層也沒有入口，66 層只有打倒最深處的核心或坎賽特級反應才出得去。
//   現在：第一層的入口房間、每個存檔點那一層（記錄碑旁邊）都有回歸水晶；打倒領主體，那一區也出一顆。
//   另外（每一級都算）：領主體的那一區進去過、8 秒都找不到活著的領主體（卡住、不見了），樓層通道的封印自己散掉。
// - 更多、更強：卡索級的遺跡生物（不是人、不是核心、不是領主體）生命 ×1.6、傷害 ×1.35；
//   每一間房間生出來的生物再多五成，多出來的三成五是卡索專屬的生物。
// - 卡索專屬的生物六種（名字自己取的）：裂隙獵手（地上冒紫圈，下一瞬間站在那裡揮爪）、殘響（一次射三團紫光，打散分成兩個小的）、
//   噬界者（把周圍的人吸過去再砸下來）、錯位影（出現在你一秒半前站的地方再衝過來）、稜鏡體（十字形的光彈邊轉邊射）、
//   虛甲騎士（地上拉線就是要衝過來，撞牆會暈）。
// - 樓層全亂：走下樓梯不一定到下一層——六成到下一層、兩成五往下跳兩層、一成跳三層、半成被甩回上一層（不會跳過存檔點那一層、不超過最深處）。
// - 空間裂隙：每 8～14 秒在你附近冒出紫色的圈，1.2 秒後裂開一道縫（留 6 秒）：踩進去被丟到這一層的別的房間、掉 8% 生命；
//   裂開的時候有一半會爬出一兩隻卡索專屬的生物。
// - 多人連線：房主決定樓層、生物（隊員那邊不生、不跳）；裂隙每個人自己的。
// 放在 net2.js 後面（R.loadFloor 要包在 net.js 外面，房主跳的樓層才會傳給隊員）。
(function (R) {
  const W = () => R.W, S = () => R.S, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const isK = () => { const run = W().run; return !!(run && run.grade && run.grade.id === 'kaso' && !run.done); };
  const guest = () => { const run = W().run; return !!(run && run.coop && !run.coop.solo && !run.coop.host); };
  const isLord = e => !!(e && e.def && /^領主體/.test(e.def.name || ''));
  const tgts = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed), R.netTargets ? R.netTargets() : []).filter(t => t && !t.dead); };   // 多人連線：房主這邊也算別人（net2.js）
  const clearLine = (x0, z0, x1, z1) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.3); for (let i = 1; i <= n; i++) if (!R.isFloor(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n)) return false; return true; };

  // ================= 卡索專屬的生物 =================
  const KASO = ['k_rift', 'k_echo', 'k_maw', 'k_shade', 'k_prism', 'k_hollow'];
  Object.assign(R.ENEMIES, {
    k_rift: { name: '裂隙獵手', hp: 140, dmg: 26, speed: 4.2, xp: 40, size: 0.9, ai: 'krift', color: '#3A2A50', eye: '#FF4AE0', desc: '從空間的裂縫裡爬出來的獵手。地上出現紫色的圈，下一瞬間牠就站在那裡揮爪——看到圈就往旁邊閃。只在卡索級出現。' },
    k_echo: { name: '殘響', hp: 90, dmg: 18, speed: 3.4, xp: 34, size: 0.8, fly: 1, ai: 'kecho', color: '#9A7AE8', eye: '#2A1040', desc: '遺跡裡回盪不散的聲音凝成的東西。一次射出三團紫光，被打散會分成兩個小的。只在卡索級出現。' },
    k_echo_s: { name: '殘響的碎片', hp: 30, dmg: 10, speed: 4, xp: 6, size: 0.5, fly: 1, ai: 'kecho', noDex: 1, noLoot: 1, color: '#9A7AE8', eye: '#2A1040', desc: '' },
    k_maw: { name: '噬界者', hp: 420, dmg: 34, speed: 2, xp: 90, size: 1.6, armor: 0.2, elite: 1, ai: 'kmaw', color: '#120C18', eye: '#FF4AE0', desc: '一張吞掉空間的大嘴。張開的時候把周圍的人吸過去，再整個砸下來——吸力停了、腳下出現紫圈就快跑。只在卡索級出現。' },
    k_shade: { name: '錯位影', hp: 70, dmg: 22, speed: 5, xp: 32, size: 0.7, ai: 'kshade', color: '#2A3448', eye: '#9AF0FF', desc: '慢了一拍的影子。牠會出現在你一秒半前站的地方，再朝你衝過來——不要一直停在同一個地方。只在卡索級出現。' },
    k_prism: { name: '稜鏡體', hp: 160, dmg: 16, speed: 1.4, xp: 44, size: 1.1, ai: 'kprism', color: '#7AD8FF', eye: '#FF6AE0', desc: '飄著的巨大稜鏡，把魔力折成十字往四面射，邊射邊轉。從光彈的縫隙鑽過去，或是從遠處打碎它。只在卡索級出現。' },
    k_hollow: { name: '虛甲騎士', hp: 300, dmg: 30, speed: 3, xp: 70, size: 1.2, armor: 0.35, ai: 'kcharge', color: '#4A4E5A', eye: '#B04AFF', desc: '盔甲裡什麼也沒有，只有一團紫光。地上拉出一條線就是要衝過來了，撞到牆會暈一下——引牠去撞牆。只在卡索級出現。' }
  });
  // 點陣圖（朝右畫；跟 monsters2.js 一樣的畫法）
  const grid = (w, h) => {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    const o = {
      p(x, y, c) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c; },
      rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) o.p(x + i, y + j, c); },
      line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) o.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
      ell(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.05) o.p(x, y, c); },
      disc(cx, cy, r, c) { o.ell(cx, cy, r, r, c); },
      rows: () => g.map(r => r.join(''))
    };
    return o;
  };
  const add = (id, pal, w, h, draw) => { if (!R.BEAST_ART) return; const [a, b] = [0, 1].map(fr => { const G = grid(w, h); draw(G, fr); return G.rows(); }); R.BEAST_ART[id] = { pal, a, b }; };
  add('k_rift', { k: '#1E1428', d: '#3A2A50', c: '#FF4AE0', e: '#FFE0FF', b: '#C8B0E8' }, 18, 18, (G, fr) => {
    G.ell(8, 10, 4.5, 4.5, 'd'); G.disc(12, 5, 3, 'd'); G.p(13, 4, 'e'); G.p(14, 5, 'c');
    G.line(5, 8, 8, 12, 'c'); G.line(9, 7, 7, 13, 'c'); G.p(10, 10, 'c');
    if (fr) G.line(11, 9, 17, 3, 'b'); else G.line(11, 10, 17, 13, 'b'); G.line(11, 11, 16, 8, 'b');
    if (fr) { G.rect(5, 14, 2, 4, 'k'); G.rect(10, 14, 2, 3, 'k'); } else { G.rect(6, 14, 2, 3, 'k'); G.rect(9, 14, 2, 4, 'k'); }
  });
  const echo = (G, fr, s) => {
    const c = s / 2; G.ell(c, c - 1, c - 1.5, c - 1.5, 'a'); G.ell(c, c - 1, c - 3.5, c - 3.5, 'b'); G.p(c + 2, c - 2, 'e');
    G.line(c - 2, c + 2, c - 4 + (fr ? 1 : 0), s - 1, 't'); G.line(c + 1, c + 2, c + (fr ? 0 : 1), s - 1, 't');
  };
  add('k_echo', { a: '#9A7AE8', b: '#E0D0FF', e: '#2A1040', t: '#6A4AC8' }, 16, 16, (G, fr) => echo(G, fr, 16));
  add('k_echo_s', { a: '#9A7AE8', b: '#E0D0FF', e: '#2A1040', t: '#6A4AC8' }, 10, 10, (G, fr) => echo(G, fr, 10));
  add('k_maw', { k: '#120C18', d: '#2A1A3A', m: '#6A1A5A', w: '#F0E8F0', e: '#FF4AE0', v: '#8A3AFF' }, 26, 22, (G, fr) => {
    G.ell(13, 12, 12, 9, 'k'); G.ell(12, 10, 9, 6, 'd'); G.line(4, 14, 9, 18, 'v'); G.line(20, 5, 23, 10, 'v');
    G.ell(17, 13, 6, fr ? 5 : 3.5, 'm'); for (let x = 12; x <= 22; x += 2) { G.p(x, fr ? 9 : 10, 'w'); G.p(x + 1, fr ? 17 : 16, 'w'); }
    G.disc(8, 7, 1.4, 'e'); G.disc(12, 5, 1.1, 'e'); G.p(5, 10, 'e');
  });
  add('k_shade', { s: '#2A3448', a: '#5A6A8A', e: '#9AF0FF' }, 14, 20, (G, fr) => {
    for (let y = 3; y < 18; y += 2) G.p(fr ? 2 : 3, y, 'a'); for (let y = 4; y < 17; y += 3) G.p(fr ? 4 : 5, y, 'a');
    G.disc(9, 3, 2.5, 's'); G.rect(7, 6, 5, 8, 's'); G.p(10, 3, 'e'); G.p(11, 3, 'e'); G.line(11, 7, 13, fr ? 10 : 9, 's');
    if (fr) { G.rect(7, 14, 2, 5, 's'); G.rect(10, 14, 2, 4, 's'); } else { G.rect(8, 14, 2, 4, 's'); G.rect(10, 14, 2, 5, 's'); }
  });
  add('k_prism', { b: '#7AD8FF', w: '#F0FCFF', m: '#FF6AE0', d: '#3A8AC8' }, 18, 18, (G, fr) => {
    for (let y = 0; y < 18; y++) { const hw = Math.round(8 - Math.abs(y - 8.5)); for (let x = 9 - hw; x < 9 + hw; x++) G.p(x, y, x < 9 ? (fr ? 'w' : 'b') : (fr ? 'b' : 'w')); }
    G.line(9, 1, 9, 16, 'd'); G.line(2, 8, 16, 8, 'd'); G.disc(9, 8.5, 2, 'm');
  });
  add('k_hollow', { s: '#4A4E5A', l: '#6A707E', v: '#B04AFF', w: '#C8C8D0', k: '#1A1A22' }, 22, 22, (G, fr) => {
    G.rect(9, 1, 6, 6, 's'); G.rect(9, 1, 6, 1, 'l'); G.rect(10, 3, 4, 2, 'k'); G.p(12, 3, 'v'); G.p(13, 4, 'v');
    G.rect(7, 7, 10, 2, 'l'); G.rect(8, 9, 8, 7, 's'); G.rect(10, 10, 4, 4, 'k'); G.p(11, 11, 'v'); G.p(12, 12, 'v');
    G.line(10, 12, 21, fr ? 10 : 12, 'w'); G.p(21, fr ? 10 : 12, 'l');
    if (fr) { G.rect(8, 16, 3, 5, 's'); G.rect(13, 16, 3, 4, 's'); } else { G.rect(9, 16, 3, 4, 's'); G.rect(12, 16, 3, 5, 's'); }
  });
  // 行為（combat.js 的 R.AI_X）
  const AI = R.AI_X = R.AI_X || {};
  AI.krift = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.kb) { e.kb.t -= dt; if (e.kb.t <= 0) { const b = e.kb; e.kb = null; R.fx('blink', e.x, 1, e.z, {}); e.x = b.x; e.z = b.z; e.m.g.position.x = e.x; e.m.g.position.z = e.z; R.fx('blink', e.x, 1, e.z, {}); const a2 = angTo(e, P); R.fx('swing', e.x, 1.1, e.z, { a: a2, range: 2.2, arc: 1.6 }); tgts().forEach(t => { if (dist(t, e) < 2.3) H.hurtT(t, e.dmg * 1.4, e, { knock: 0.3 }); }); e.cd = 4.5; } return false; }
    if (e.cd <= 0 && d > 3.5 && d < 12) { let [x, z] = R.nearestFloor(P.x - Math.sin(a) * 1.2, P.z - Math.cos(a) * 1.2); if (!clearLine(P.x, P.z, x, z)) { x = P.x; z = P.z; } e.kb = { t: 0.55, x, z }; R.fx('mark', x, 0, z, { r: 1.4, t: 0.55, color: '#FF4AE0' }); return false; }
    e.cd2 = (e.cd2 || 0) - dt;
    if (d > e.def.size + 0.8) { if (walk) { H.move(e, a, sp, dt); return true; } } else if (e.cd2 <= 0) { e.cd2 = 0.9; H.hurtT(P, e.dmg, e); }
    return false;
  };
  AI.kecho = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; const side = e.side || (e.side = rnd() < 0.5 ? 1 : -1), want = d < 5.5 ? a + Math.PI : d > 9 ? a : a + Math.PI / 2 * side; let mv = false;
    if (walk) { H.move(e, want, sp, dt); mv = true; }
    if (e.cd <= 0 && d < 12) { const small = e.id === 'k_echo_s', n = small ? 1 : 3; e.cd = small ? 2.2 : 1.8; for (let i = 0; i < n; i++) R.fire({ kind: 'eorb', owner: 'e', x: e.x, z: e.z, a: a + (i - (n - 1) / 2) * 0.28, speed: 9, dmg: e.dmg, life: 1.8, src: e }); }
    return mv;
  };
  AI.kmaw = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.pull > 0) {
      e.pull -= dt;
      tgts().forEach(t => { const dd = dist(t, e); if (dd < 9 && dd > 1.8 && !(t.iframe > 0) && !t.air) { const k = Math.min(dd - 1.8, 4.5 * dt); t.x -= (t.x - e.x) / dd * k; t.z -= (t.z - e.z) / dd * k; R.collide(t, 0.42); } });
      if (e.pull <= 0) { e.slam = 0.75; R.fx('mark', e.x, 0, e.z, { r: 3.2, t: 0.75, color: '#8A3AFF' }); }
      return false;
    }
    if (e.slam > 0) { e.slam -= dt; if (e.slam <= 0) { R.fx('boom', e.x, 0.3, e.z, { r: 3.2, color: '#8A3AFF' }); R.shake && R.shake(0.35); tgts().forEach(t => { if (dist(t, e) < 3.2) H.hurtT(t, e.dmg * 1.6, e, { knock: 0.5 }); }); e.cd = 6.5; } return false; }
    if (e.cd <= 0 && d < 8) { e.pull = 1.2; R.fx('ring', e.x, 0.1, e.z, { r: 9, color: '#8A3AFF' }); return false; }
    e.bite = (e.bite || 0) - dt;
    if (d > e.def.size + 0.8) { if (walk) { H.move(e, a, sp, dt); return true; } } else if (e.bite <= 0) { e.bite = 1.3; H.hurtT(P, e.dmg, e); }
    return false;
  };
  AI.kshade = (e, P, d, a, sp, dt, walk, H) => {
    const h = e.hist || (e.hist = []); h.push([P.x, P.z, e.t]); while (h.length > 1 && e.t - h[0][2] > 1.5) h.shift();
    e.yaw = a;
    if (e.dash) { e.dash.t -= dt; H.move(e, e.dash.a, 14, dt); if (!e.dash.hit && d < 1.2) { e.dash.hit = true; H.hurtT(P, e.dmg * 1.3, e, { knock: 0.3 }); } if (e.dash.t <= 0) { e.dash = null; e.cd = 3.2; } return true; }
    if (e.fadeT > 0) { e.fadeT -= dt; if (e.fadeT <= 0) { e.invuln = false; e.dash = { t: 0.35, a: angTo(e, P), hit: false }; } return false; }
    if (e.cd <= 0 && d < 14 && h.length && e.t - h[0][2] > 1.2) {
      const [ox, oz] = h[0]; if (Math.hypot(ox - P.x, oz - P.z) > 1.5) { R.fx('poof', e.x, 1, e.z, { color: '#5A6A8A', n: 8 }); const [x, z] = R.nearestFloor(ox, oz); e.x = x; e.z = z; e.m.g.position.x = x; e.m.g.position.z = z; e.invuln = true; e.fadeT = 0.35; R.fx('mark', x, 0, z, { r: 1, t: 0.35, color: '#9AF0FF' }); return false; }
      e.cd = 0.5;
    }
    if (walk) { H.move(e, a + Math.PI / 2 * (e.side || (e.side = rnd() < 0.5 ? 1 : -1)) * 0.6, sp * 0.7, dt); return true; }
    return false;
  };
  AI.kprism = (e, P, d, a, sp, dt, walk, H) => {
    e.rot = (e.rot || 0) + dt * 0.9; e.yaw = a; let mv = false;
    if (walk && d > 7) { H.move(e, a, sp, dt); mv = true; } else if (walk && d < 4) { H.move(e, a + Math.PI, sp, dt); mv = true; }
    if (e.cd <= 0 && d < 13) { e.cd = 0.8; for (let i = 0; i < 4; i++) R.fire({ kind: 'eorb', owner: 'e', x: e.x, z: e.z, a: e.rot + i * Math.PI / 2, speed: 7.5, dmg: e.dmg, life: 2.2, src: e }); }
    return mv;
  };
  AI.kcharge = (e, P, d, a, sp, dt, walk, H) => {
    if (e.ch) {
      const c = e.ch; if (c.wind > 0) { c.wind -= dt; e.yaw = c.a; return false; }
      const ox = e.x, oz = e.z; H.move(e, c.a, 16, dt); c.len -= 16 * dt; e.yaw = c.a;
      tgts().forEach(t => { if (!c.hit.has(t) && dist(t, e) < 1.4) { c.hit.add(t); H.hurtT(t, e.dmg * 1.5, e, { knock: 0.6 }); } });
      if (!R.isFloor(e.x, e.z) || R.pointBlocked(e.x, e.z)) { e.x = ox; e.z = oz; e.ch = null; e.st.stun = Math.max(e.st.stun || 0, 1.4); R.shake && R.shake(0.3); R.fx('boom', e.x, 0.6, e.z, { r: 1.2, color: '#B04AFF' }); e.cd = 3; return false; }
      if (c.len <= 0) { e.ch = null; e.cd = 2.6; } return true;
    }
    e.yaw = a;
    if (e.cd <= 0 && d < 11 && d > 2.5) { const len = Math.min(13, d + 3); e.ch = { a, wind: 0.8, len, hit: new Set() }; R.fx('aim', e.x, 0.3, e.z, { a, len, t: 0.8 }); return false; }
    e.jab = (e.jab || 0) - dt;
    if (d > e.def.size + 0.8) { if (walk) { H.move(e, a, sp, dt); return true; } } else if (e.jab <= 0) { e.jab = 1.1; H.hurtT(P, e.dmg, e); }
    return false;
  };
  // 殘響打散：分成兩個小的
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by);
    try { if (was && e.dead && e.id === 'k_echo' && W().run && !guest()) for (let i = 0; i < 2; i++) { const s = R.spawnEnemy('k_echo_s', e.x + (i ? 0.05 : -0.05), e.z, e.room, { aggro: true }); /* 生在原地（旁邊可能是牆），分開交給生物之間的推擠 */ if (s) { s.dormant = false; s.aggro = true; } } } catch (err) { console.warn('[kasoplus]', err); }
    return r;
  };

  // ================= 更多、更強 =================
  const kasoGrade = R.gradeById && R.gradeById('kaso');
  if (kasoGrade) kasoGrade.pool = Array.from(new Set((kasoGrade.pool || []).concat(KASO)));
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se0(id, x, z, room, o);
    try { if (e && isK() && e.def && !e.def.human && !e.def.boss && !isLord(e) && id !== 'petra' && !e.kansait && !e.kxScaled) { e.kxScaled = 1; e.hp *= 1.6; e.hpMax *= 1.6; e.dmg *= 1.35; } } catch (err) { }
    return e;
  };
  const pickId = () => (rnd() < 0.35 ? pick(KASO) : R.pickEnemyId ? R.pickEnemyId(W().run.grade.pool, W().run) : pick(KASO));
  const inRoom = r => W().enemies.filter(e => !e.dead && e.room === r.i && !(e.def && (e.def.boss || e.def.human)) && !isLord(e)).length;
  const more = (r, dormant) => {
    if (!r || r.kxMore || r.type === 'boss' || guest()) return; r.kxMore = 1;
    const n = Math.round(inRoom(r) * 0.5), w = W();
    for (let i = 0; i < n; i++) {
      const [x, z] = R.roomPoint(r, { away: w.P, min: 5 }), e = R.spawnEnemy(pickId(), x, z, r.i, { quiet: dormant });
      if (!e) continue; if (dormant) { e.dormant = true; e.aggro = false; } else { e.dormant = false; e.aggro = true; }
    }
  };
  const er0 = R.enterRoom;
  R.enterRoom = r => {
    const before = r ? inRoom(r) : 0, out = er0(r);
    try { if (isK() && r && !r.kxMore && inRoom(r) > before) more(r, false); } catch (err) { console.warn('[kasoplus]', err); }
    return out;
  };

  // ================= 出得去 =================
  const crystalNear = (F, r, x0, z0) => {
    if (!F || !r || (F.crystals || []).some(c => c.room === r.i)) return;
    for (const [dx, dz] of [[3, 3], [-3, 3], [3, -3], [-3, -3], [0, 4], [4, 0], [0, -4], [-4, 0]]) {
      const [x, z] = R.nearestFloor(x0 + dx, z0 + dz);
      if (R.roomIndexAt(x, z) === r.i && !R.pointBlocked(x, z) && !(F.crystals || []).some(c => Math.hypot(c.x - x, c.z - z) < 3)) { R.addCrystal(F.group, F, x, z, r.i); return; }
    }
    const [x, z] = R.roomPoint(r, {}); R.addCrystal(F.group, F, x, z, r.i);
  };
  const exits = () => {
    const w = W(), F = w.F, run = w.run; if (!F || !run) return;
    if (run.floor === 0) { const r = F.rooms.find(q => q.type === 'start') || F.rooms[0]; crystalNear(F, r, r.x, r.z); }
    if (F.save) { const i = R.roomIndexAt(F.save.x, F.save.z), r = F.rooms[i >= 0 ? i : 0]; crystalNear(F, r, F.save.x, F.save.z); }
  };
  const bd0 = R.onBossDown;
  R.onBossDown = e => {
    const r = bd0 ? bd0(e) : undefined;
    try { if (isK() && isLord(e)) { const F = W().F, room = R.roomOf(e); setTimeout(() => { if (W().F === F && isK()) { crystalNear(F, room, room.x, room.z - 2); R.toast && R.toast('領主體倒下的地方出現了回歸水晶。', '#7FE8FF'); } }, 1000); } } catch (err) { console.warn('[kasoplus]', err); }
    return r;
  };

  // ================= 樓層全亂 =================
  let jump = null;
  const de0 = R.descend;
  R.descend = (...a) => {
    const run = W().run;
    if (isK() && !guest()) {
      const u = rnd(), last = (run.floors || 1) - 1; let d = u < 0.6 ? 1 : u < 0.85 ? 2 : u < 0.95 ? 3 : -1; if (d < 0 && run.floor < 1) d = 1;
      let to = Math.max(0, Math.min(last, run.floor + d)); if (to === run.floor) to = Math.min(last, run.floor + 1);
      const every = R.saveEvery ? R.saveEvery(run) : 0, nOf = f => (run.f0 ? f : f + 1);
      if (every && to > run.floor + 1) for (let f = run.floor + 1; f < to; f++) if (nOf(f) % every === 0) { to = f; break; }   // 不跳過存檔點那一層
      jump = { from: run.floor, to, t: performance.now() };
    }
    return de0(...a);
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    let j = null;
    if (jump && W().run && f === jump.from + 1 && performance.now() - jump.t < 10000) { j = jump; f = j.to; }
    jump = null;
    const r = lf0(f, o);
    try {
      riftReset();
      if (isK()) {
        exits();
        if (!guest()) (W().F.rooms || []).forEach(rm => { if (rm.populated) more(rm, true); });
        if (j && j.to !== j.from + 1) setTimeout(() => { if (R.banner) R.banner('空間錯亂', j.to < j.from ? '樓梯把你甩回了上面一層' : '樓梯一口氣把你送到了往下 ' + (j.to - j.from) + ' 層'); }, 700);
      }
    } catch (err) { console.warn('[kasoplus]', err); }
    return r;
  };

  // ================= 空間裂隙 =================
  let RS = null;   // { F, next, rifts: [], warned }
  const riftReset = () => { if (RS) RS.rifts.forEach(rf => rf.g && rf.g.parent && rf.g.parent.remove(rf.g)); RS = { F: W().F, next: 6 + rnd() * 6, rifts: [], said: RS ? RS.said : false }; };
  const riftMesh = (x, z) => {
    const TH = window.THREE; if (!TH) return null;
    const g = new TH.Group(), mat = new TH.MeshBasicMaterial({ color: '#B04AFF', transparent: true, opacity: 0.85, side: TH.DoubleSide, depthWrite: false });
    const ring = new TH.Mesh(new TH.TorusGeometry(0.85, 0.1, 6, 24), mat); ring.scale.y = 1.7; ring.position.y = 1.5; g.add(ring);
    const core = new TH.Mesh(new TH.CircleGeometry(0.75, 20), new TH.MeshBasicMaterial({ color: '#1A0828', transparent: true, opacity: 0.9, side: TH.DoubleSide, depthWrite: false })); core.scale.y = 1.7; core.position.y = 1.5; g.add(core);
    const floor = new TH.Mesh(new TH.RingGeometry(0.9, 1.4, 24), new TH.MeshBasicMaterial({ color: '#8A3AFF', transparent: true, opacity: 0.5, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05; g.add(floor);
    const L = new TH.PointLight('#B04AFF', 1.2, 8, 1.6); L.position.y = 1.6; g.add(L);
    g.position.set(x, 0, z); return { g, ring, core };
  };
  const roomsOk = F => (F.rooms || []).filter(r => r.type !== 'boss' && r.tiles && r.tiles.length > 6);
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt);
    try {
      const w = W(), P = w.P, run = w.run, F = w.F;
      // 領主體的封印：領主體卡住、不見了（每一級都算；房主、單人）
      if (run && F && F.lordGate && !F.lordGate.down && !w.paused && !guest()) {
        const lr = F.rooms[F.lordGate.room];
        if (lr && lr.visited && !(w.enemies || []).some(e => !e.dead && isLord(e))) { F.lordGate.lost = (F.lordGate.lost || 0) + dt; if (F.lordGate.lost > 8) { F.lordGate.down = true; R.toast && R.toast('樓層通道的封印散掉了。', '#7FE8FF'); } }
        else F.lordGate.lost = 0;
      }
      if (!isK() || !P || !F || w.paused) return r;
      if (!RS || RS.F !== F) riftReset();
      P.riftCd = Math.max(0, (P.riftCd || 0) - dt);
      RS.next -= dt;
      if (RS.next <= 0 && !P.dead) {
        RS.next = 8 + rnd() * 6;
        for (let k = 0; k < 8; k++) {
          const an = rnd() * Math.PI * 2, dd = 3 + rnd() * 5, [x, z] = R.nearestFloor(P.x + Math.sin(an) * dd, P.z + Math.cos(an) * dd);
          if (!R.isFloor(x, z) || R.pointBlocked(x, z) || !clearLine(P.x, P.z, x, z)) continue;
          R.fx('mark', x, 0, z, { r: 1.8, t: 1.2, color: '#B04AFF' });
          if (!RS.said) { RS.said = true; R.toast && R.toast('空間裂隙：地上冒出紫色的圈，接著會裂開一道縫——踩進去會被丟到這一層的別處、受點傷，縫裡有時候還會爬出東西。', '#C88AFF'); }
          RS.rifts.push({ x, z, warn: 1.2, t: 6, g: null, F });
          break;
        }
      }
      RS.rifts.forEach(rf => {
        if (rf.warn > 0) {
          rf.warn -= dt; if (rf.warn > 0) return;
          const m = riftMesh(rf.x, rf.z); if (m) { rf.g = m.g; rf.ring = m.ring; F.group.add(m.g); }
          R.fx('boom', rf.x, 1, rf.z, { r: 1.6, color: '#B04AFF' }); R.shake && R.shake(0.15);
          if (!guest() && rnd() < 0.5) { const n = 1 + (rnd() < 0.4 ? 1 : 0); for (let i = 0; i < n; i++) { const e = R.spawnEnemy(pick(KASO), rf.x + (i ? 0.8 : -0.8), rf.z, R.roomIndexAt(rf.x, rf.z), { aggro: true }); if (e) { e.dormant = false; e.aggro = true; } } }
          return;
        }
        rf.t -= dt; if (rf.ring) { rf.ring.rotation.z += dt * 2; rf.g.scale.setScalar(rf.t < 0.6 ? Math.max(0.05, rf.t / 0.6) : 1); }
        if (rf.t > 0 && P.riftCd <= 0 && !P.dead && !P.air && Math.hypot(P.x - rf.x, P.z - rf.z) < 1.2) {
          const rooms = roomsOk(F).filter(q => q.i !== R.roomIndexAt(P.x, P.z)); const to = pick(rooms.length ? rooms : roomsOk(F)); if (!to) return;
          const [x, z] = R.roomPoint(to, {}); R.fx('blink', P.x, 1, P.z, {}); P.x = x; P.z = z; if (P.h) P.h.g.position.set(x, 0, z); R.fx('blink', x, 1, z, {});
          P.riftCd = 3; R.hurtPlayer(P.hpMax * 0.08, { name: '空間裂隙' }); R.toast && R.toast('被空間裂隙丟到了別的地方！', '#C88AFF');
        }
      });
      RS.rifts = RS.rifts.filter(rf => { if (rf.t > 0) return true; if (rf.g && rf.g.parent) rf.g.parent.remove(rf.g); return false; });
    } catch (err) { console.warn('[kasoplus]', err); }
    return r;
  };
  R.kasoPlus = { KASO, rifts: () => RS, more, plannedJump: () => jump };   // 測試用
})(window.R);
