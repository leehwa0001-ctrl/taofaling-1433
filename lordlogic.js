// 領主體：體型四倍大、每一隻有自己的特色和攻擊邏輯（2026-10-08 作者：領主體房間加大，各個領主體都要有各自的特色和攻擊邏輯，而且領主體體型加到四倍大）
// - 體型：圖放大四倍（地出巨骸本來就是巨人，最寬 12.5 公尺為止），打得到的範圍（def.size）跟著變大；人不會走進牠的身體裡（推出去）。
//   招式全部改成從牠身體的邊緣算（不然四倍大的身體，原本 3 公尺的爪子連身體外面都碰不到）。
// - 每一隻一個「特色」（被動）＋四、五套招式，血越少出招越密；同一套不會連出兩次。
//   巢織蛛：爬上天花板，影子跟著你，掉下來砸；吐絲纏人。怕火。
//   千節蟲：頭的甲殼很硬（正面 ×0.5）、尾巴軟（背後 ×1.5）；衝鋒會留下毒地、會鑽地。
//   地出巨骸：幾乎不動；兩隻骨手拍地、橫掃、抓人；血掉到 2/3、1/3 會散架重組（3 秒不會受傷，叫骨兵）。
//   霜冠鹿：寒氣——站在牠附近會一直積霜，積滿 5 層整個人凍住 1.5 秒；怕火（×1.5）。
//   熔顎蜥：熔甲——平常受到的傷害 ×0.6，被冰（緩速）打到甲殼裂開 6 秒（×1.3）；走過的地方留熔岩；會潛進熔岩回血。
//   沙暴鯨：大半時間潛在沙裡（打不到），從你腳下衝出來；衝出來之後擱淺 3 秒，這時受到的傷害 +40%。
//   深淵王蛸：身邊有觸手護著（兩條以上活著時本體 ×0.4）；砍斷一條觸手牠會痛得愣住；噴墨、漩渦。
//   萬面樹：不會動；身上只有一張臉是睜開的（地上有光指著那個方向），從那個方向打 ×2，其他方向 ×0.5；每 6 秒換一張。怕火。
//   朽翼龍：一下飛一下落地——飛在天上近戰打不到（×0.2），只能用遠程；落地時 +20%。
//   雷鳴猿：蓄雷——每出一招、每打中你一下都在蓄電，滿了「雷神降臨」：整個大廳落雷，只有貼在牠身邊安全。
//   緋面風翁：風之衣——飛過來的投射物有一半被吹散；會把人吹開、颳出追人的龍捲。
//   棘背狼：原本的刺、毛、怕火、預判、越打越兇（lordfloor.js）照舊，招式範圍跟著身體變大。
//   無主大鎧：架勢——擺出架勢的 1.5 秒內打牠會被反擊（居合）；鎧甲很硬（×0.7），背後打 ×1.3。
// - 異變（lordvariant.js）的招式也照身體大小放大（那邊用 e.BR）。
// 放在 lords.js、lordplus.js、lordfloor.js、region.js、windelder.js、lordvariant.js、kasoplus.js 後面。
(function (R) {
  const W = () => R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)], wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const targets = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed), R.netTargets ? R.netTargets() : []).filter(t => t && !t.dead); };
  const hitT = (t, dmg, e, o) => (t.ally ? R.hurtAlly(t, dmg, e, o) : R.hurtPlayer(dmg, e, o));
  const floor = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
  const isLord = d => !!(d && /^領主體/.test(d.name || ''));
  const hurtK = e => 1 - e.hp / e.hpMax;
  const MAXW = 12.5, K0 = 4;

  // ---------- 體型 ----------
  const widthOf = e => { try { const p = e.m.spr.geometry.parameters; return p.width; } catch (er) { return (e.def && e.def.size) || 2.4; } };
  const sizeUp = e => {
    if (!e || e.lordK || !isLord(e.def) || !e.m || !e.m.g) return;
    const w0 = widthOf(e), k = Math.max(1, Math.min(K0, MAXW / Math.max(0.5, w0)));
    e.lordK = k; e.w0 = w0; e.m.g.scale.multiplyScalar(k);
    e.def = Object.assign({}, e.def, { size: (e.def.size || 2.4) * k, ai: D[e.id] ? 'LL_' + e.id : e.def.ai });
    refresh(e);
  };
  const refresh = e => { const s = e.m && e.m.g ? e.m.g.scale.x : e.lordK || 1; e.BR = e.w0 * s * 0.28; e.def.size = e.BR * 2; };   // 2026-10-08 作者：碰撞框小 30%（0.4 → 0.28；圖的邊有空白，子彈還沒碰到影子就算打中）
  R.lordGeo = e => (e && e.BR ? Math.min(2.6, Math.max(1, e.BR / 1.8)) : 1);
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (...a) => { const e = se0(...a); try { sizeUp(e); } catch (er) { console.warn('[lordlogic]', er); } return e; };

  // ---------- 招式的積木（全部從身體邊緣算） ----------
  const at = (e, a, d) => floor(e.x + Math.sin(a) * d, e.z + Math.cos(a) * d);
  const hitCircle = (e, x, z, r, k, o) => targets().forEach(t => { if (Math.hypot(t.x - x, t.z - z) < r && !(t.iframe > 0)) { hitT(t, e.dmg * k, e, { knock: o && o.knock }); stat(t, o); } });
  const stat = (t, o) => { if (!o || t.ally) return; if (o.slow) t.slowT = Math.max(t.slowT || 0, o.slow); if (o.stun) t.knockT = Math.max(t.knockT || 0, o.stun); if (o.blind) t.blindT = Math.max(t.blindT || 0, o.blind); if (o.frost) frost(t, o.frost); if (o.on) o.on(t); };
  const slam = (e, x, z, r, t, k, col, o) => { R.fx('mark', x, 0, z, { r, t, color: col }); later(() => { if (e.dead) return; R.fx('boom', x, 0.4, z, { r, color: col }); hitCircle(e, x, z, r, k, o); if (o && o.zone) zone(x, z, r * 0.8, o.zone, e.dmg * 0.12, o.zk || 'lava', o.zc); if (r > 3) R.shake && R.shake(0.35); }, t * 1000); };
  const cone = (e, a, arc, len, t, k, col, o) => { const rr = e.BR + len; R.fx('sector', e.x, 0, e.z, { a, arc, range: rr, t }); later(() => { if (e.dead) return; R.fx('swing', e.x, 0, e.z, { a, arc, range: rr, color: col, big: true }); targets().forEach(q => { const dd = dist(q, e), aa = angTo(e, q); if (dd < rr + 0.3 && Math.abs(wrap(aa - a)) < arc / 2 + 0.12 && !(q.iframe > 0)) { hitT(q, e.dmg * k, e, { knock: (o && o.knock) || 0.5 }); stat(q, o); } }); R.shake && R.shake(0.3); if (o && o.after) o.after(); }, t * 1000); };
  const beam = (e, a, len, wd, t, k, col, o) => { const L = e.BR + len; R.fx('aim', e.x, 0.3, e.z, { a, len: L, t }); later(() => { if (e.dead) return; R.fx('slash', e.x, 1.4, e.z, { a, len: L }); R.fx('line', e.x, 1.2, e.z, { a, len: L, color: col }); targets().forEach(q => { const dx = q.x - e.x, dz = q.z - e.z, al = dx * Math.sin(a) + dz * Math.cos(a), sd = Math.abs(dx * Math.cos(a) - dz * Math.sin(a)); if (al > 0 && al < L && sd < wd && !(q.iframe > 0)) { hitT(q, e.dmg * k, e, { knock: o && o.knock }); stat(q, o); } }); if (o && o.after) o.after(); }, t * 1000); };
  const wave = (e, maxR, speed, k, col, o) => { const w = W(), run = w.run, done = new Set(), x0 = e.x, z0 = e.z; let r = e.BR * 0.8; R.fx('ring', x0, 0.1, z0, { r: e.BR + maxR, color: col }); R.shake && R.shake(0.3); w.dyn.push(dt => { if (w.run !== run) return false; r += dt * speed; targets().forEach(t => { if (done.has(t)) return; const dd = Math.hypot(t.x - x0, t.z - z0); if (Math.abs(dd - r) < 0.7 && !(t.iframe > 0) && !(t.air > 0)) { done.add(t); hitT(t, e.dmg * k, e, { knock: 0.5 }); stat(t, o); } }); return r < e.BR + maxR; }); };
  const shoot = (e, a, n, spread, kind, speed, k, o) => { for (let i = 0; i < n; i++) { const b = a + (i - (n - 1) / 2) * spread; R.fire(Object.assign({ kind, owner: 'e', x: e.x + Math.sin(b) * e.BR * 0.7, z: e.z + Math.cos(b) * e.BR * 0.7, a: b, speed, dmg: e.dmg * k, life: 2.6, src: e }, o || {})); } };
  const radial = (e, n, kind, speed, k, off) => shoot(e, (off || 0) + Math.PI * (n - 1) / n, n, Math.PI * 2 / n, kind, speed, k);
  const zone = (x, z, r, life, dmg, kind, col) => { const zn = R.addZone && R.addZone({ kind: kind || 'lava', x, z, r, life, dmg }); if (zn && zn.mesh && col) zn.mesh.material.color.set(col); return zn; };
  const summon = (e, id, n, hpMul) => { if (!R.ENEMIES[id]) return; const rm = R.roomOf ? R.roomOf(e) : null; for (let i = 0; i < n; i++) { const [x, z] = rm ? R.roomPoint(rm, {}) : at(e, rnd() * 6.28, e.BR + 2); const m = R.spawnEnemy(id, x, z, e.room, { aggro: true, hpMul: hpMul || 0.6 }); if (m) { m.dormant = false; m.aggro = true; } } };
  const around = (P, n, rr) => Array.from({ length: n }, (_, i) => { const a = rnd() * 6.28, d = i === 0 ? 0 : 1.5 + rnd() * rr; return floor(P.x + Math.sin(a) * d, P.z + Math.cos(a) * d); });
  const jump = (e, x, z, dur, h, land) => { e.jumpS = { t: 0, dur, x0: e.x, z0: e.z, x1: x, z1: z, h, land }; };
  const msg = (e, s, c) => R.num && R.num(e.x, 2 + e.BR * 1.6, e.z, s, c || 'hurt');
  // 霜（霜冠鹿）：積到 5 層凍住
  const frost = (t, n) => { if (t !== W().P) return; t._frost = Math.min(5, (t._frost || 0) + n); t._frostT = 4; if (t._frost >= 5) { t._frost = 0; t.knockT = Math.max(t.knockT || 0, 1.5); R.num && R.num(t.x, 2.6, t.z, '凍住了', 'hurt'); R.fx && R.fx('ring', t.x, 0.2, t.z, { r: 1.4, color: '#CFE6FF' }); } else R.num && R.num(t.x, 2.6, t.z, '霜 ' + t._frost + '/5', ''); };

  // ---------- 每一隻 ----------
  const D = {};
  // 巢織蛛
  D.tsuchigumo = { move: 'chase', reach: 2, every: 3.2, col: '#B08AFF',
    hurt: (e, raw, o) => raw * (o.elem === 'fire' || o.burn ? 1.5 : 1),
    moves: [
      (e, P, de, a) => { shoot(e, a, 5, 0.22, 'web', 11, 0.6); for (let i = 0; i < 3; i++) { const [x, z] = at(e, a + (i - 1) * 0.3, e.BR + 5 + i * 2); zone(x, z, 2.2, 7, 0, 'web'); } },
      (e) => { // 爬上天花板：影子跟著你，2.2 秒後掉下來
        e.lockT = 3.2; e.invuln = true; const g = e.m.g; let t = 0; const w = W(), run = w.run; R.toast && R.toast('巢織蛛爬上了天花板——看地上的影子！', '#B08AFF');
        w.dyn.push(dt => { if (w.run !== run || e.dead) return false; t += dt; const Q = W().P; if (t < 0.5) g.position.y = 12 * t / 0.5; else if (t < 2.4) { e.x += (Q.x - e.x) * Math.min(1, dt * 1.6); e.z += (Q.z - e.z) * Math.min(1, dt * 1.6); g.position.y = 12; if (((t * 10) | 0) % 3 === 0) R.fx('mark', e.x, 0, e.z, { r: e.BR + 0.5, t: 0.25, color: '#B08AFF' }); } else if (t < 2.75) g.position.y = 12 * (1 - (t - 2.4) / 0.35); else { g.position.y = 0; e.invuln = false; R.fx('boom', e.x, 0.3, e.z, { r: e.BR + 1, color: '#5A4A6A' }); hitCircle(e, e.x, e.z, e.BR + 1, 2, { knock: 0.7 }); R.shake && R.shake(0.7); return false; } g.position.x = e.x; g.position.z = e.z; return true; });
      },
      (e, P) => { around(P, 4, 3).forEach(([x, z]) => zone(x, z, 1.8, 6, 0, 'web')); [0, 500, 1000].forEach(ms => later(() => { if (e.dead) return; const Q = W().P; slam(e, Q.x, Q.z, 1.8, 0.6, 1.1, '#B08AFF', { slow: 1.5 }); }, ms)); R.toast && R.toast('蛛絲纏住地面，腳一直刺下來', '#B08AFF'); },
      (e) => { summon(e, 'gaki', hurtK(e) > 0.5 ? 4 : 2, 0.6); R.toast && R.toast('天花板上垂下了幼體', '#B08AFF'); },
      (e, P, de, a) => { e.lockT = 1; cone(e, a, 1.8, 4, 0.7, 1.4, '#E8E0CC', { slow: 1 }); }
    ] };
  // 千節蟲
  D.omukade = { move: 'chase', reach: 2, every: 3, col: '#C86A3A', turn: 1.6,
    hurt: (e, raw, o, P) => { if (!P) return raw; const front = Math.abs(wrap(angTo(e, P) - (e.yaw || 0))) < 0.9; return raw * (front ? 0.5 : 1.5); },
    moves: [
      (e, P, de, a) => { e.lockT = 1.7; R.fx('aim', e.x, 0.3, e.z, { a, len: e.BR + 18, t: 0.6 }); later(() => { if (e.dead) return; e.rush = { a, t: 1, hit: new Set() }; }, 600); },
      (e, P) => { e.lockT = 3.4; e.invuln = true; e.m.g.visible = false; R.fx('poof', e.x, 0.5, e.z, { color: '#6A4A2E', n: 20 }); for (let i = 0; i < 3; i++) later(() => { if (e.dead) return; const Q = W().P; slam(e, Q.x, Q.z, e.BR * 0.8, 0.7, 1.6, '#C86A3A', { knock: 0.6 }); later(() => { if (e.dead) return; e.x = Q.x; e.z = Q.z; }, 700); }, 300 + i * 1000); later(() => { e.invuln = false; e.m.g.visible = true; e.m.g.position.set(e.x, 0, e.z); }, 3300); },
      (e) => { e.lockT = 1.6; R.fx('mark', e.x, 0, e.z, { r: e.BR + 4, t: 0.9, color: '#C86A3A' }); later(() => { if (e.dead) return; wave(e, 6, 10, 1.2, '#C86A3A'); B_pull(e, e.BR + 9, 1.2, 3); }, 900); },
      (e, P, de, a) => { e.lockT = 0.9; cone(e, a, 1.2, 3.5, 0.6, 1.5, '#8ACF3A', { slow: 2 }); }
    ],
    passive: (e, P, dt) => { const r = e.rush; if (!r) return; r.t -= dt; const sp = 18 * dt; e.x += Math.sin(r.a) * sp; e.z += Math.cos(r.a) * sp; [e.x, e.z] = floor(e.x, e.z); r.z = (r.z || 0) - dt; if (r.z <= 0) { r.z = 0.25; zone(e.x, e.z, e.BR * 0.5, 6, e.dmg * 0.1, 'lava', '#6A9A2A'); } targets().forEach(t => { if (!r.hit.has(t) && dist(t, e) < e.BR + 0.8 && !(t.iframe > 0)) { r.hit.add(t); hitT(t, e.dmg * 1.6, e, { knock: 0.8 }); } }); if (r.t <= 0) e.rush = null; }
  };
  // 地出巨骸
  D.gashadokuro = { move: 'still', reach: 3, every: 2.8, col: '#E8E0CC',
    hurt: (e, raw) => (e.reform ? 0 : raw),
    passive: (e, P, dt) => {
      const f = e.hp / e.hpMax; e.reformAt = e.reformAt || [0.66, 0.33];
      if (!e.reform && e.reformAt.length && f < e.reformAt[0]) { e.reformAt.shift(); e.reform = 3; e.lockT = 3.2; R.banner && R.banner('地出巨骸散架了', '骨頭重新拼起來之前打不動——先處理骨兵'); summon(e, 'honemusha', 3, 0.7); R.fx('poof', e.x, 1, e.z, { color: '#E8E0CC', n: 40 }); }
      if (e.reform) { e.reform -= dt; e.m.g.position.y = -e.BR * 0.9 * Math.min(1, Math.min(3 - e.reform, e.reform) / 0.6); if (e.reform <= 0) { e.reform = 0; e.m.g.position.y = 0; wave(e, 8, 9, 1.2, '#E8E0CC'); } }
    },
    moves: [
      (e, P, de, a) => { const s = a + Math.PI / 2; [[P.x, P.z], at(e, a + 0.7, e.BR + 6), at(e, a - 0.7, e.BR + 6)].forEach(([x, z], i) => slam(e, x, z, 3.4, 1 + i * 0.25, 1.6, '#C8C0AC', { knock: 0.5 })); },
      (e, P, de, a) => { e.lockT = 1.2; cone(e, a, 2.8, 8, 1, 1.4, '#E8E0CC', { knock: 0.8 }); },
      (e, P) => { around(P, 9, 6).forEach(([x, z], i) => later(() => { if (!e.dead) slam(e, x, z, 2.2, 0.8, 1.2, '#B8AE98'); }, i * 160)); },
      (e, P, de, a) => { e.lockT = 1.2; beam(e, a, 14, 1.8, 0.9, 1.2, '#E8E0CC', { stun: 1, on: t => { const d0 = dist(t, e); if (d0 > e.BR) { const k = (d0 - e.BR * 0.9) / d0; t.x -= (t.x - e.x) * k; t.z -= (t.z - e.z) * k; R.collide && R.collide(t, 0.42); } R.num && R.num(t.x, 2.6, t.z, '被抓過去了', 'hurt'); } }); }
    ] };
  // 霜冠鹿
  D.frostdeer = { move: 'chase', reach: 2.4, every: 3.2, col: '#CFE6FF',
    hurt: (e, raw, o) => raw * (o.elem === 'fire' || o.burn ? 1.5 : 1),
    passive: (e, P, dt) => { const t = W().P; if (!t || t.dead) return; if (t._frostT > 0) { t._frostT -= dt; if (t._frostT <= 0) t._frost = 0; } e.chill = (e.chill || 0) - dt; if (e.chill <= 0) { e.chill = 1.2; if (dist(t, e) < e.BR + 6) frost(t, 1); } },
    moves: [
      (e, P, de, a) => { [-0.35, 0, 0.35].forEach(o => { for (let i = 1; i <= 6; i++) { const [x, z] = at(e, a + o, e.BR + i * 2); later(() => { if (!e.dead) slam(e, x, z, 1.3, 0.35, 1, '#CFE6FF', { frost: 1 }); }, i * 120); } }); },
      (e) => { e.lockT = 1; wave(e, 10, 8, 1, '#CFE6FF', { slow: 2.5, frost: 2 }); },
      (e, P, de, a) => { e.lockT = 1.6; R.fx('aim', e.x, 0.3, e.z, { a, len: e.BR + 14, t: 0.6 }); later(() => { if (!e.dead) e.rush = { a, t: 0.8, hit: new Set(), k: 1.5 }; }, 600); },
      (e, P) => { around(P, 5, 4).forEach(([x, z]) => zone(x, z, 2, 8, 0, 'web', '#CFE6FF')); slam(e, P.x, P.z, 2.4, 1, 1.2, '#CFE6FF', { frost: 2 }); R.toast && R.toast('地面結冰了（踩上去會變慢）', '#CFE6FF'); },
      (e) => { summon(e, 'icewarden', 2, 0.5); }
    ],
    rush: true };
  // 熔顎蜥
  D.lavajaw = { move: 'chase', reach: 2.4, every: 3.4, col: '#FF7A3A',
    hurt: (e, raw, o) => { if (o.elem === 'frost' || (e.st && e.st.slow > 0)) { if (!(e.crack > 0)) msg(e, '熔甲裂開了', 'crit'); e.crack = 6; } return raw * (e.crack > 0 ? 1.3 : 0.6); },
    passive: (e, P, dt) => { if (e.crack > 0) e.crack -= dt; e.trailT = (e.trailT || 0) - dt; if (e.trailT <= 0 && e.moving) { e.trailT = 0.5; zone(e.x, e.z, e.BR * 0.45, 5, e.dmg * 0.1, 'lava'); } },
    moves: [
      (e, P, de, a) => { e.lockT = 1.3; cone(e, a, 1.4, 10, 1, 1.5, '#FF7A3A', { after: () => { for (let i = 3; i <= 9; i += 3) { const [x, z] = at(e, a, e.BR + i); zone(x, z, 1.6, 4, e.dmg * 0.2); } } }); },
      (e, P) => { around(P, 7, 5).forEach(([x, z], i) => later(() => { if (!e.dead) slam(e, x, z, 1.9, 1, 1.2, '#FF7A3A', { zone: 4 }); }, i * 120)); R.toast && R.toast('天花板上落下了熔岩', '#FF7A3A'); },
      (e) => { e.lockT = 1; R.fx('mark', e.x, 0, e.z, { r: e.BR + 4, t: 0.8, color: '#FF7A3A' }); later(() => { if (e.dead) return; R.fx('ring', e.x, 0.1, e.z, { r: e.BR + 4, color: '#FF7A3A' }); hitCircle(e, e.x, e.z, e.BR + 4, 1.3, { knock: 0.7 }); R.shake && R.shake(0.4); }, 800); },
      (e) => { // 潛進熔岩：回血、從腳下冒出來
        e.lockT = 2.8; e.invuln = true; e.m.g.visible = false; zone(e.x, e.z, e.BR, 3, e.dmg * 0.2); e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.03); msg(e, '潛進熔岩回血', '');
        later(() => { if (e.dead) return; const Q = W().P; slam(e, Q.x, Q.z, e.BR + 0.5, 0.9, 1.8, '#FF5A1A', { knock: 0.7, zone: 5 }); later(() => { if (e.dead) return; e.x = Q.x; e.z = Q.z; e.invuln = false; e.m.g.visible = true; e.m.g.position.set(e.x, 0, e.z); }, 900); }, 1600);
      }
    ] };
  // 沙暴鯨
  D.sandwhale = { move: 'none', reach: 2.4, every: 2.6, col: '#C8A870',
    hurt: (e, raw) => (e.sub ? 0 : raw * (e.beach > 0 ? 1.4 : 1)),
    passive: (e, P, dt) => {
      if (e.beach > 0) { e.beach -= dt; if (e.beach <= 0) dive(e); return; }
      if (e.sub) { const Q = W().P; e.subT -= dt; const aa = angTo(e, Q); e.x += Math.sin(aa) * Math.min(dist(e, Q), 6.5 * dt); e.z += Math.cos(aa) * Math.min(dist(e, Q), 6.5 * dt); e.finT = (e.finT || 0) - dt; if (e.finT <= 0) { e.finT = 0.18; R.fx('dust', e.x, 0.2, e.z, { color: '#C8A870' }); R.fx('poof', e.x, 0.3, e.z, { color: '#D8B880', n: 3 }); } if (e.subT <= 0) breach(e); }
    },
    moves: [
      (e, P, de, a) => { shoot(e, a, 9, 0.14, 'sand', 11, 0.6); targets().forEach(t => { if (dist(t, e) < e.BR + 9 && t === W().P) t.blindT = Math.max(t.blindT || 0, 2); }); },
      (e, P, de, a) => { for (let i = 1; i <= 7; i++) { const [x, z] = at(e, a, e.BR + i * 2.2); later(() => { if (!e.dead) slam(e, x, z, 1.7, 0.35, 1.2, '#C8A870'); }, i * 130); } },
      (e) => { const w = W(), run = w.run; for (let i = 0; i < 3; i++) { const [x, z] = at(e, rnd() * 6.28, e.BR + 2), zn = zone(x, z, 1.6, 7, e.dmg * 0.3, 'caltrop', '#D8B880'); if (!zn) continue; const sp2 = 1.8 + rnd(); w.dyn.push(dt => { if (w.run !== run || zn.dead) return false; const Pl = w.P, aa = Math.atan2(Pl.x - zn.x, Pl.z - zn.z); zn.x += Math.sin(aa) * sp2 * dt; zn.z += Math.cos(aa) * sp2 * dt; if (zn.mesh) zn.mesh.position.set(zn.x, 0.06, zn.z); return true; }); } R.toast && R.toast('捲起了會追人的沙暴', '#C8A870'); }
    ],
    spawn: e => later(() => dive(e), 1500) };
  const dive = e => { if (e.dead) return; e.sub = true; e.subT = 3 + rnd() * 1.5; e.invuln = true; e.m.g.visible = false; R.fx('poof', e.x, 0.5, e.z, { color: '#C8A870', n: 24 }); };
  const breach = e => { e.sub = false; const Q = W().P; R.fx('mark', Q.x, 0, Q.z, { r: e.BR + 0.6, t: 0.7, color: '#C8A870' }); later(() => { if (e.dead) return; e.x = Q.x; e.z = Q.z; [e.x, e.z] = floor(e.x, e.z); e.invuln = false; e.m.g.visible = true; e.m.g.position.set(e.x, 0, e.z); R.fx('boom', e.x, 0.3, e.z, { r: e.BR + 0.6, color: '#C8A870' }); R.shake && R.shake(0.6); hitCircle(e, e.x, e.z, e.BR + 0.6, 1.8, { knock: 0.8 }); e.beach = 3.2; e.pat = 1.2; msg(e, '擱淺了！', 'crit'); }, 700); };
  // 深淵王蛸
  D.kraken = { move: 'keep', keep: [3, 9], reach: 2.2, every: 3.2, col: '#5A2A4A',
    hurt: (e, raw) => raw * (arms(e).length >= 2 ? 0.4 : 1),
    spawn: e => later(() => grow(e, 4), 400),
    passive: (e, P, dt) => { const n = arms(e).length; if (e.armN != null && n < e.armN) { e.st.stun = Math.max(e.st.stun || 0, 1); msg(e, '觸手被砍斷了', 'crit'); } e.armN = n; e.regrow = (e.regrow == null ? 16 : e.regrow) - dt; if (e.regrow <= 0) { e.regrow = 16; if (n < 2) grow(e, 2); } },
    moves: [
      (e, P, de, a) => { [-0.5, -0.17, 0.17, 0.5].forEach((o, i) => later(() => { if (!e.dead) beam(e, a + o, 12, 1.3, 0.8, 1.2, '#5A2A4A'); }, i * 120)); },
      (e, P) => { around(P, 4, 3).forEach(([x, z]) => zone(x, z, 2, 5, 0, 'web', '#2A1A2A')); targets().forEach(t => { if (t === W().P && dist(t, e) < e.BR + 12) t.blindT = Math.max(t.blindT || 0, 2.5); }); R.fx('poof', e.x, 1, e.z, { color: '#1A0E18', n: 30 }); },
      (e) => { e.lockT = 0.6; B_pull(e, e.BR + 12, 2.4, 2.8); R.toast && R.toast('漩渦把人往王蛸那裡拉', '#5A2A4A'); },
      (e) => radial(e, 14, 'eorb', 9, 0.6, rnd())
    ] };
  const arms = e => (W().enemies || []).filter(o => !o.dead && o.krakenOf === e);
  const grow = (e, n) => { if (e.dead || !R.ENEMIES.abyssarm) return; for (let i = 0; i < n; i++) { const a = i / n * 6.28 + rnd() * 0.4, [x, z] = at(e, a, e.BR + 2.5), m = R.spawnEnemy('abyssarm', x, z, e.room, { aggro: true, hpMul: 0.45 }); if (m) { m.krakenOf = e; m.dormant = false; m.aggro = true; } } };
  // 萬面樹
  D.faceforest = { move: 'still', reach: 3, every: 2.8, col: '#5A8A3A',
    hurt: (e, raw, o, P) => { const fire = o.elem === 'fire' || o.burn ? 1.5 : 1; if (!P) return raw * fire; const ok = Math.abs(wrap(angTo(e, P) - (e.face || 0))) < 0.9; return raw * fire * (ok ? 2 : 0.5); },
    passive: (e, P, dt) => { e.faceT = (e.faceT || 0) - dt; if (e.faceT <= 0) { e.faceT = 6; e.face = rnd() * 6.28; msg(e, '另一張臉睜開了', ''); } e.faceFx = (e.faceFx || 0) - dt; if (e.faceFx <= 0) { e.faceFx = 0.5; const [x, z] = at(e, e.face, e.BR + 1.2); R.fx('ring', x, 0.1, z, { r: 1.2, color: '#FFE08A' }); R.fx('line', e.x, 0.3, e.z, { a: e.face, len: e.BR + 2, color: '#FFE08A' }); } },
    moves: [
      (e, P, de, a) => { [-0.3, 0.3].forEach(o => { for (let i = 1; i <= 8; i++) { const [x, z] = at(e, a + o, e.BR + i * 1.8); later(() => { if (!e.dead) slam(e, x, z, 1.3, 0.35, 1.1, '#5A3E26', { slow: 1 }); }, i * 140); } }); },
      (e) => { radial(e, 22, 'seed', 8, 0.55, e.t || 0); later(() => { if (!e.dead) radial(e, 22, 'seed', 8, 0.55, (e.t || 0) + 0.14); }, 500); },
      (e, P) => { around(P, 3, 2).forEach(([x, z]) => slam(e, x, z, 1.6, 0.9, 0.9, '#3A5A2E', { slow: 2.2 })); },
      (e) => { summon(e, 'kodama', 3, 0.8); R.toast && R.toast('果實落地，變成了根童', '#5A8A3A'); },
      (e) => { e.lockT = 1; wave(e, 9, 7, 1, '#5A8A3A', { stun: 0.4 }); msg(e, '每一張臉一起尖叫', 'hurt'); }
    ] };
  // 朽翼龍
  D.bonewyvern = { move: 'keep', keep: [2, 8], reach: 2.2, every: 3, col: '#D8D0C0',
    hurt: (e, raw, o) => (e.fly ? raw * (o.primary && W().P && W().P.ws && (W().P.ws.kind === 'melee' || W().P.ws.kind === 'thrust') ? 0.2 : 1) : raw * 1.2),
    passive: (e, P, dt) => {
      e.phaseT = (e.phaseT == null ? 8 : e.phaseT) - dt;
      if (e.phaseT <= 0) { e.fly = !e.fly; e.phaseT = e.fly ? 6 : 8; msg(e, e.fly ? '飛上去了（近戰打不到）' : '落地了', e.fly ? 'hurt' : 'crit'); if (!e.fly) { R.fx('boom', e.x, 0.3, e.z, { r: e.BR, color: '#D8D0C0' }); hitCircle(e, e.x, e.z, e.BR + 1, 1.2, { knock: 0.6 }); } }
      const y = e.m.g.position.y, want = e.fly ? 5 : 0; if (!e.jumpS) e.m.g.position.y = y + (want - y) * Math.min(1, dt * 3);
    },
    moves: [
      (e, P) => { if (!e.fly) { e.lockT = 1.2; beam(e, angTo(e, P), 16, 1.5, 0.9, 1.5, '#7FD8FF'); return; } // 天上：俯衝三次
        e.lockT = 3; for (let i = 0; i < 3; i++) later(() => { if (e.dead) return; const Q = W().P, x = Q.x, z = Q.z; R.fx('mark', x, 0, z, { r: e.BR, t: 0.7, color: '#D8D0C0' }); later(() => { if (e.dead) return; jump(e, x, z, 0.35, 5, () => { R.fx('boom', x, 0.3, z, { r: e.BR, color: '#D8D0C0' }); hitCircle(e, x, z, e.BR, 1.4, { knock: 0.6 }); R.shake && R.shake(0.45); }); }, 700); }, i * 1000); },
      (e, P, de, a) => { shoot(e, a, 7, 0.2, 'feather', 12, 0.6); targets().forEach(t => { const dd = dist(t, e); if (dd < e.BR + 7 && !(t.iframe > 0)) { const aa = angTo(e, t); t.x += Math.sin(aa) * 3.5; t.z += Math.cos(aa) * 3.5; R.collide && R.collide(t, 0.42); } }); },
      (e) => wave(e, 9, 7, 1, '#D8D0C0'),
      (e, P) => { if (!e.fly) return wave(e, 7, 9, 1.1, '#7FD8FF'); around(P, 6, 5).forEach(([x, z], i) => later(() => { if (!e.dead) slam(e, x, z, 1.8, 0.8, 1.1, '#7FD8FF'); }, i * 150)); }
    ] };
  // 雷鳴猿
  D.thunderape = { move: 'chase', reach: 2.4, every: 3, col: '#FFE04A',
    passive: (e, P, dt) => { e.volt = Math.min(100, (e.volt || 0) + dt * 4); e.voltFx = (e.voltFx || 0) - dt; if (e.voltFx <= 0) { e.voltFx = 1.5; msg(e, '蓄雷 ' + Math.round(e.volt) + '%', e.volt > 70 ? 'crit' : ''); } if (e.volt >= 100 && !(e.lockT > 0)) godThunder(e); },
    moves: [
      (e, P) => { e.lockT = 1.4; e.volt += 10; R.fx('mark', P.x, 0, P.z, { r: e.BR + 0.5, t: 0.8, color: '#FFE04A' }); jump(e, P.x, P.z, 0.8, 6, () => { R.fx('boom', e.x, 0.3, e.z, { r: e.BR + 1, color: '#4A4A7A' }); hitCircle(e, e.x, e.z, e.BR + 1, 1.4, { knock: 0.6 }); for (let i = 0; i < 8; i++) { const [x, z] = at(e, i / 8 * 6.28, e.BR + 3); slam(e, x, z, 1.5, 0.4, 1, '#FFE04A', { stun: 0.3 }); } }); },
      (e, P) => { e.volt += 10; around(P, 7, 5).forEach(([x, z]) => { R.fx('mark', x, 0, z, { r: 1.7, t: 0.9 }); later(() => { if (e.dead) return; R.fx('pillar', x, 0, z, { r: 0.9, color: '#C8B4FF' }); hitCircle(e, x, z, 1.7, 1.2, { stun: 0.3 }); }, 900); }); },
      (e, P, de, a) => { e.lockT = 1.9; e.volt += 8; [0, 550, 1100].forEach(ms => later(() => { if (e.dead) return; cone(e, angTo(e, W().P), 1.6, 4, 0.4, 1, '#FFE04A'); }, ms)); },
      (e) => { e.volt += 8; wave(e, 9, 8, 1.1, '#FFE04A', { stun: 0.3 }); }
    ] };
  const godThunder = e => {
    e.volt = 0; e.lockT = 2.6; R.banner && R.banner('雷神降臨', '整個大廳要落雷了——貼到雷鳴猿身邊！');
    const safe = e.BR + 3.5; R.fx('mark', e.x, 0, e.z, { r: safe, t: 1.8, color: '#9AE07A' });
    const pts = []; targets().forEach(t => { for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, d = i ? 2 + rnd() * 6 : 0; pts.push(floor(t.x + Math.sin(a) * d, t.z + Math.cos(a) * d)); } });
    pts.forEach(([x, z]) => R.fx('mark', x, 0, z, { r: 2, t: 1.8, color: '#FFE04A' }));
    later(() => { if (e.dead) return; pts.forEach(([x, z]) => R.fx('pillar', x, 0, z, { r: 1.2, color: '#FFFFFF' })); R.shake && R.shake(0.9); targets().forEach(t => { if (dist(t, e) > safe && !(t.iframe > 0)) { hitT(t, e.dmg * 2.4, e, { knock: 0.5 }); if (!t.ally) t.knockT = Math.max(t.knockT || 0, 0.8); } }); }, 1800);
  };
  // 緋面風翁
  D.windelder = { move: 'keep', keep: [3, 10], reach: 2.2, every: 3, col: '#FF6A8A',
    passive: (e, P, dt) => { e.windT = (e.windT || 0) - dt; if (e.windT > 0) return; e.windT = 0.15; (W().shots || []).forEach(s => { if (s.owner === 'p' && !s.dead && !s.windChk && Math.hypot(s.x - e.x, s.z - e.z) < e.BR + 3) { s.windChk = 1; if (rnd() < 0.5) { s.dead = true; if (R.killShot) R.killShot(s); R.fx('poof', s.x, 1, s.z, { color: '#FFB8C8', n: 6 }); } } }); },
    moves: [
      (e, P, de, a) => { [-0.6, -0.2, 0.2, 0.6].forEach(o => beam(e, a + o, 13, 1, 0.75, 1.2, '#FF6A8A')); },
      (e) => { const w = W(), run = w.run; for (let i = 0; i < 2; i++) { const [x, z] = at(e, rnd() * 6.28, e.BR + 2); let zx = x, zz = z, life = 7, tick = 0; w.dyn.push(dt => { if (w.run !== run || e.dead) return false; life -= dt; tick -= dt; const Q = w.P, aa = Math.atan2(Q.x - zx, Q.z - zz); zx += Math.sin(aa) * 3.2 * dt; zz += Math.cos(aa) * 3.2 * dt; if (tick <= 0) { tick = 0.3; R.fx('ring', zx, 0.2, zz, { r: 1.6, color: '#FFB8C8' }); targets().forEach(t => { if (Math.hypot(t.x - zx, t.z - zz) < 1.6 && !(t.iframe > 0)) { hitT(t, e.dmg * 0.5, e, { knock: 0.3 }); const b = rnd() * 6.28; t.x += Math.sin(b) * 2; t.z += Math.cos(b) * 2; R.collide && R.collide(t, 0.42); } }); } return life > 0; }); } R.toast && R.toast('颳起了追人的龍捲', '#FF6A8A'); },
      (e) => { e.lockT = 1; wave(e, 9, 9, 0.9, '#FFB8C8', { on: t => { const aa = angTo(e, t); t.x += Math.sin(aa) * 4; t.z += Math.cos(aa) * 4; R.collide && R.collide(t, 0.42); } }); },
      (e, P) => { around(P, 6, 4).forEach(([x, z]) => slam(e, x, z, 1.6, 0.8, 1.2, '#FF6A8A')); }
    ] };
  // 棘背狼（刺、毛、怕火、預判在 lordfloor.js）
  D.spikewolf = { move: 'chase', reach: 2.2, every: 2.8, col: '#8A8A96',
    passive: (e, P, dt) => { if (e.howl > 0) e.howl -= dt; e.rageT = (e.rageT || 0) + dt; if (e.rageT > 12) { e.rageT = 0; e.fero = Math.min(1.6, (e.fero || 1) + 0.08); e.speed = (R.ENEMIES.spikewolf.speed || 4.6) * e.fero; msg(e, '越來越兇'); }
      e.dodgeCd = (e.dodgeCd || 0) - dt; if (e.dodgeCd <= 0 && !e.jumpS) { const s = (W().shots || []).find(s => s.owner === 'p' && !s.dead && Math.hypot(s.x - e.x, s.z - e.z) < e.BR + 4 && ((e.x - s.x) * (s.vx || 0) + (e.z - s.z) * (s.vz || 0)) > 0); if (s && rnd() < 0.45) { e.dodgeCd = 2.6; const sa = Math.atan2(s.vx || 0, s.vz || 0) + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2, [x, z] = at(e, sa, 3.5); jump(e, x, z, 0.3, 1.5); } else if (s) e.dodgeCd = 0.6; } },
    moves: [
      (e, P) => { e.lockT = 1.3; const x = P.x, z = P.z; R.fx('mark', x, 0, z, { r: e.BR, t: 0.7 }); later(() => { if (!e.dead) jump(e, x, z, 0.55, 3, () => { R.fx('boom', e.x, 0.3, e.z, { r: e.BR + 0.5, color: '#3A3A44' }); hitCircle(e, e.x, e.z, e.BR + 0.5, 1.5 * (e.fero || 1), { knock: 0.6 }); R.shake && R.shake(0.4); }); }, 700); },
      (e) => { e.lockT = 1.3; [0, 450].forEach(ms => later(() => { if (!e.dead) cone(e, angTo(e, W().P), 2, 4, 0.3, 1.1 * (e.fero || 1), '#E8E0CC'); }, ms)); },
      (e) => { e.lockT = 1; R.fx('mark', e.x, 0, e.z, { r: e.BR + 4, t: 0.6 }); later(() => { if (e.dead) return; R.fx('ring', e.x, 0.1, e.z, { r: e.BR + 4, color: '#8A8A96' }); hitCircle(e, e.x, e.z, e.BR + 4, 1.2 * (e.fero || 1), { knock: 0.9 }); }, 600); },
      (e) => { e.lockT = 1; e.howl = 6; R.banner && R.banner('棘背狼吼了一聲', '背上的刺變長了——近戰會被刺得更深'); later(() => { if (!e.dead) radial(e, 16, 'arrow', 11, 0.7 * (e.fero || 1), rnd()); }, 500); }
    ] };
  // 無主大鎧
  D.muhyo = { move: 'chase', reach: 2.4, every: 3, col: '#C8A040', turn: 2.4,
    hurt: (e, raw, o, P) => { let k = 0.7; if (P && Math.abs(wrap(angTo(e, P) - (e.yaw || 0))) > 2.2) k = 1.3; if (e.stance > 0 && P && !o.dot && !o.reflect && !(e.ctrCd > 0)) { e.ctrCd = 1; later(() => { if (e.dead) return; const Q = W().P, a = angTo(e, Q); R.banner && R.banner('居合', '無主大鎧反擊了'); beam(e, a, 8, 1.6, 0.15, 2.2, '#FF5A3A', { knock: 0.7 }); }, 50); } return raw * k; },
    passive: (e, P, dt) => { if (e.stance > 0) { e.stance -= dt; if (e.stance <= 0) msg(e, '架勢解除', ''); } if (e.ctrCd > 0) e.ctrCd -= dt; },
    moves: [
      (e) => { e.lockT = 1.6; e.stance = 1.6; msg(e, '架勢——別打牠！', 'crit'); R.fx('ring', e.x, 0.1, e.z, { r: e.BR + 1, color: '#FF5A3A' }); },
      (e, P) => { e.lockT = 2.6; let t0 = 0; for (let i = 0; i < 3; i++) { later(() => { if (e.dead) return; const Q = W().P, a = angTo(e, Q), len = Math.min(14, dist(e, Q) + 3); R.fx('aim', e.x, 0.3, e.z, { a, len: len + e.BR, t: 0.5 }); later(() => { if (e.dead) return; beam(e, a, len, e.BR * 0.5 + 1, 0, 1.5, '#C8A040'); const [x, z] = at(e, a, len); e.x = x; e.z = z; e.m.g.position.set(x, 0, z); }, 500); }, t0); t0 += 750; } },
      (e) => { const r0 = e.BR + 1.2, r1 = e.BR + 4.5, rr = e.BR + 9; R.fx('mark', e.x, 0, e.z, { r: r0, t: 1.3, color: '#B04AFF' }); R.fx('mark', e.x, 0, e.z, { r: rr, t: 1.3, color: '#B04AFF' }); R.toast && R.toast('站到身邊那一圈！', '#B04AFF'); later(() => { if (e.dead) return; R.fx('ring', e.x, 0.1, e.z, { r: rr, color: '#B04AFF' }); targets().forEach(t => { const d = dist(t, e); if ((d < r0 || (d > r1 && d < rr)) && !(t.iframe > 0)) hitT(t, e.dmg * 2, e, { knock: 0.4 }); }); }, 1300); },
      (e) => { summon(e, 'ashigaru', 3, 0.6); R.toast && R.toast('足輕從鎧甲的影子裡走出來', '#C8A040'); }
    ] };

  // ---------- 共通的骨架 ----------
  const B_pull = (e, r, t, s) => { const w = W(), run = w.run; let left = t; R.fx('ring', e.x, 0.1, e.z, { r, color: '#9A7AFF' }); w.dyn.push(dt => { if (w.run !== run || e.dead) return false; left -= dt; targets().forEach(q => { const dd = dist(q, e); if (dd < r && dd > e.BR + 0.6 && !(q.iframe > 0) && !q.air) { const k = Math.min(dd - e.BR - 0.6, s * dt); q.x -= (q.x - e.x) / dd * k; q.z -= (q.z - e.z) / dd * k; R.collide && R.collide(q, 0.42); } }); return left > 0; }); };
  const AI = R.AI_X = R.AI_X || {};
  Object.keys(D).forEach(id => {
    const L = D[id];
    AI['LL_' + id] = (e, P, d, a, sp, dt, walk, H) => {
      if (!e.BR) refresh(e);
      if (!e.llInit) { e.llInit = 1; if (L.spawn) L.spawn(e); }
      const de = Math.max(0, d - e.BR); let mv = false; e.moving = false;
      if (e.jumpS) { const s = e.jumpS; s.t += dt; const k = Math.min(1, s.t / s.dur); e.x = s.x0 + (s.x1 - s.x0) * k; e.z = s.z0 + (s.z1 - s.z0) * k; e.m.g.position.y = Math.sin(k * Math.PI) * s.h; if (k >= 1) { e.jumpS = null; e.m.g.position.y = 0; [e.x, e.z] = floor(e.x, e.z); if (s.land) s.land(); } return true; }
      if (L.passive) L.passive(e, P, dt);
      if (e.rush && L.rush) { const r = e.rush; r.t -= dt; e.x += Math.sin(r.a) * 16 * dt; e.z += Math.cos(r.a) * 16 * dt; [e.x, e.z] = floor(e.x, e.z); targets().forEach(t => { if (!r.hit.has(t) && dist(t, e) < e.BR + 0.8 && !(t.iframe > 0)) { r.hit.add(t); hitT(t, e.dmg * (r.k || 1.5), e, { knock: 0.7 }); } }); if (r.t <= 0) e.rush = null; return true; }
      if (e.sub || e.reform) return false;
      // 轉身：千節蟲、無主大鎧轉得慢（才繞得到背後）
      if (L.turn) { const df = wrap(a - (e.yaw || 0)), s2 = L.turn * dt; e.yaw = (e.yaw || 0) + Math.max(-s2, Math.min(s2, df)); } else e.yaw = a;
      if (e.lockT > 0) { e.lockT -= dt; return false; }
      // 走
      if (walk && sp > 0) {
        if (L.move === 'chase' && de > L.reach) { H.move(e, a, sp, dt); mv = true; }
        else if (L.move === 'keep') { const want = de < L.keep[0] ? a + Math.PI : de > L.keep[1] ? a : null; if (want != null) { H.move(e, want, sp, dt); mv = true; } }
      }
      e.moving = mv;
      // 貼身的爪子（從身體邊緣算）
      e.bite = (e.bite || 0) - dt;
      if (de < L.reach + 0.3 && e.bite <= 0 && !e.fly && Math.abs(wrap(a - (e.yaw || 0))) < 0.9) { e.bite = 1.3; const rr = e.BR + L.reach + 0.3; a = e.yaw || a; R.fx('swing', e.x, 0, e.z, { a, arc: 1.6, range: rr, color: '#E8E0CC', big: true }); targets().forEach(t => { if (dist(t, e) < rr && Math.abs(wrap(angTo(e, t) - a)) < 0.9 && !(t.iframe > 0)) { hitT(t, e.dmg, e, { knock: 0.4 }); if (id === 'frostdeer') frost(t, 1); } }); }
      // 招式：血越少越密，同一套不連出
      e.pat = (e.pat == null ? 2 : e.pat) - dt;
      if (e.pat <= 0) {
        e.pat = L.every * (1 - hurtK(e) * 0.4) + rnd() * 0.6;
        let k = Math.floor(rnd() * L.moves.length); if (k === e.lastMove && L.moves.length > 1) k = (k + 1) % L.moves.length; e.lastMove = k;
        try { L.moves[k](e, P, de, a); } catch (er) { console.warn('[lordlogic]', id, er); }
      }
      return mv;
    };
  });
  // 特色：受到的傷害
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const L = e && !e.dead && e.lordK && D[e.id];
    if (L && L.hurt) { o = o || {}; try { raw = L.hurt(e, raw, o, W().P); } catch (er) { } if (!(raw > 0)) { if (o.primary && R.num && !(e._immT > 0)) { e._immT = 0.6; R.num(e.x, 2 + e.BR * 1.6, e.z, '打不動', ''); } return 0; } }
    return he0(e, raw, o);
  };
  // 雷鳴猿：打中你也蓄電
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { if (src && src.id === 'thunderape' && src.lordK) src.volt = Math.min(100, (src.volt || 0) + 6); return hp0(raw, src, o); };
  // 不會走進牠的身體裡；體型跟著異變放大；計時器
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), w = W();
    try {
      if (w.run && !w.paused) (w.enemies || []).forEach(e => {
        if (e.dead || !e.lordK) return;
        if (e.m && e.m.g && Math.abs(e.m.g.scale.x - (e._sc || 0)) > 0.01) { e._sc = e.m.g.scale.x; refresh(e); }
        if (e._immT > 0) e._immT -= dt;
        if (e.sub || e.invuln || e.fly || (e.m && e.m.g && e.m.g.position.y > 2)) return;
        const rr = e.BR * 0.72;
        targets().forEach(t => { if (t.air > 0 || t.dashT > 0) return; const dd = dist(t, e); if (dd < rr && dd > 0.01) { t.x = e.x + (t.x - e.x) / dd * rr; t.z = e.z + (t.z - e.z) / dd * rr; R.collide && R.collide(t, 0.42); } });
      });
    } catch (er) { }
    return r;
  };
  // 鏡頭：四倍大的領主體醒著、在附近的時候自動拉遠（打完回到自己設定的遠近；不寫進設定）
  const BOSS_ZOOM = 1.9;
  let held = false;
  const st1 = R.step;
  R.step = dt => {
    const r = st1(dt), w = W(), c = w.cam;
    try {
      if (c && w.run) {
        const P = w.P, near = P && (w.enemies || []).some(e => !e.dead && e.lordK && e.aggro && !e.dormant && dist(e, P) < 34);
        const user = Math.max(R.CAM ? R.CAM.zMin : 0.65, Math.min(R.CAM ? R.CAM.zMax : 1.45, (R.S && R.S.opts && R.S.opts.zoom) || 1));
        if (near) { held = true; c.zoomT = Math.max(user, BOSS_ZOOM); } else if (held) { held = false; c.zoomT = user; }
      } else held = false;
    } catch (er) { }
    return r;
  };
  R.LORD_LOGIC = D;
})(window.R);
