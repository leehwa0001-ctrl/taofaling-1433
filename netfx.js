// 多人連線：看得到隊友的特效（2026-10-05 作者：要看的到隊友的特效）
// 原本隊友放技能、普攻，自己的畫面上只看得到對方的人物在揮手：刀光、爆炸、地上的圈、射出去的東西都只在對方那邊。
//   （遺跡生物的特效、子彈 net2.js 已經從房主送給大家，這裡只管「人」做的。）
// 做法：
// - 記下「自己的動作」：普攻（R.attack）、技能（R.useSkill、R.castSlot）、大招（R.castUlt）、種族技能（R.castRaceSkill）、翻滾（R.dodge）。
//   動作裡排的延後的事（setTimeout）、每一幀跑的東西（W.dyn：召喚獸咬人、砲台、持續的範圍）也算——這些時候呼叫的 R.fx 和自己射出去的東西（R.fire，owner 'p'）就是自己的特效。
// - 連線中每 0.2 秒把這段時間的特效 { k: 'pfx', rid, f, n, fx: [[種類, x, y, z, 參數]…], sh: [[種類, x, z, y, 方向, 速度, 壽命, 追蹤, 拋物線, 往上的速度, 爆開的範圍, 穿透]…] } 送出去（一次最多 60 個特效、30 發）。
//   參數裡指到遺跡生物的換成編號（房主那邊的 nid，兩邊都認得），指到自己的換成「送的人」（隊友那邊用對方的人物位置）；認不得的整個不送。
// - 隊友那邊照樣播：特效直接放；射出去的東西只有樣子（自己飛、撞牆或時間到就消失，會爆開的照樣冒一團爆炸的光），不會打到任何東西。
// 放在所有包 R.attack、R.useSkill、R.castSlot、R.castUlt、R.castRaceSkill、R.dodge、R.fire、R.fx 的檔案後面（net2.js、netsummon.js 後面）。
(function (R) {
  const W = () => R.W, N = () => R.net || {};
  const crun = () => { const run = W().run; return run && run.coop && !run.coop.solo && !run.done && N().room ? run : null; };
  const r2 = v => Math.round(v * 100) / 100;

  // ---------- 自己的動作（包含之後才發生的） ----------
  let depth = 0, dynArr = null;
  const enter = () => { if (depth++ === 0) { const d = W().dyn; if (Array.isArray(d) && !Object.prototype.hasOwnProperty.call(d, 'push')) { d.push = function (...fns) { return Array.prototype.push.apply(this, fns.map(f => (typeof f === 'function' ? mine(f) : f))); }; dynArr = d; } } };
  const leave = () => { if (--depth === 0 && dynArr) { delete dynArr.push; dynArr = null; } };
  const mine = f => { if (f.netfx) return f; const g = function (...a) { enter(); try { return f.apply(this, a); } finally { leave(); } }; g.netfx = 1; return g; };
  const st0 = window.setTimeout;
  window.setTimeout = function (f, ms, ...rest) { return st0.call(window, depth > 0 && typeof f === 'function' ? mine(f) : f, ms, ...rest); };
  ['attack', 'useSkill', 'castSlot', 'castUlt', 'castRaceSkill', 'dodge'].forEach(k => { const f = R[k]; if (typeof f === 'function') R[k] = mine(f); });

  // ---------- 收集 ----------
  const Q = { fx: [], sh: [] };
  const argsOf = o => {
    if (!o || typeof o !== 'object') return {};
    const out = {}, P = W().P;
    for (const k of Object.keys(o)) {
      const v = o[k]; if (v == null || typeof v === 'function') continue;
      if (typeof v === 'object') {
        if (v === P) out[k + 'P'] = 1;
        else if (v.nid) out[k + 'N'] = v.nid;
        else if (Array.isArray(v) && v.length < 20 && v.every(x => typeof x === 'number')) out[k] = v;
        else return null;   // 認不得的東西：整個不送
        continue;
      }
      if (typeof v === 'number') out[k] = r2(v); else if (typeof v === 'string' && v.length < 40 || typeof v === 'boolean') out[k] = v;
    }
    return out;
  };
  const fx0 = R.fx;
  R.fx = (kind, x, y, z, o) => {
    try { if (depth > 0 && crun() && Q.fx.length < 60 && typeof kind === 'string' && [x, y, z].every(Number.isFinite)) { const a = argsOf(o); if (a) Q.fx.push([kind, r2(x), r2(y), r2(z), a]); } } catch (e) { }
    return fx0(kind, x, y, z, o);
  };
  const fi0 = R.fire;
  R.fire = o => {
    const s = fi0(o);
    try { if (depth > 0 && o && o.owner === 'p' && crun() && Q.sh.length < 30 && [o.x, o.z, o.a, o.speed].every(Number.isFinite)) Q.sh.push([String(o.kind || 'bullet'), r2(o.x), r2(o.z), r2(o.y != null ? o.y : 1.1), r2(o.a), r2(o.speed), r2(o.life || 1.5), r2(o.homing || 0), o.grav ? 1 : 0, r2(o.vy || 0), (o.splash || o.kind === 'fire' || o.kind === 'grenade') ? r2(o.radius || (o.kind === 'grenade' ? 3.6 : o.kind === 'fire' ? 3 : 1.4)) : 0, o.pierce > 0 ? 1 : 0]); } catch (e) { }
    return s;
  };

  // ---------- 隊友那邊：照樣播 ----------
  const num = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
  const vis = [];   // 只有樣子的子彈
  const fxIn = (from, f) => {
    if (!Array.isArray(f) || typeof f[0] !== 'string' || f[0].length > 24 || ![f[1], f[2], f[3]].every(v => num(v, -2000, 2000))) return;
    const o = Object.assign({}, f[4] && typeof f[4] === 'object' ? f[4] : {});
    for (const k of Object.keys(o)) {
      if (k.length > 1 && k.endsWith('N')) { const e = W().enemies.find(x => x.nid === o[k] && !x.dead); if (!e) return; o[k.slice(0, -1)] = e; delete o[k]; }
      else if (k.length > 1 && k.endsWith('P') && o[k] === 1) { const r = N().remotes && N().remotes.get(from); if (!r) return; o[k.slice(0, -1)] = r; delete o[k]; }
    }
    try { fx0(f[0], f[1], f[2], f[3], o); } catch (e) { }
  };
  const shotIn = s => {
    if (!Array.isArray(s) || typeof s[0] !== 'string' || s[0].length > 16 || ![s[1], s[2]].every(v => num(v, -2000, 2000)) || !num(s[4], -100, 100) || !num(s[5], 0, 80) || !num(s[6], 0, 8)) return;
    const w = W(); let sh;
    try { sh = fi0({ kind: s[0], owner: 'v', x: s[1], z: s[2], y: num(s[3], -5, 30) ? s[3] : 1.1, a: s[4], speed: s[5], life: s[6], dmg: 0 }); } catch (e) { return; }
    if (!sh) return; const i = w.shots.indexOf(sh); if (i >= 0) w.shots.splice(i, 1);   // 不進遺跡的子彈表：不會打到任何人
    vis.push({ s: sh, homing: num(s[7], 0, 30) ? s[7] : 0, grav: !!s[8], vy: num(s[9], -60, 60) ? s[9] : 0, boom: num(s[10], 0, 12) ? s[10] : 0, pierce: !!s[11] });
  };
  const visStep = dt => {
    for (let i = vis.length - 1; i >= 0; i--) {
      const v = vis[i], s = v.s; s.life -= dt;
      if (v.homing) { const tg = R.nearestEnemy && R.nearestEnemy(s.x, s.z, 12); if (tg) { const want = Math.atan2(tg.x - s.x, tg.z - s.z), cur = Math.atan2(s.vx, s.vz), d = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)), sp = Math.hypot(s.vx, s.vz), na = cur + Math.max(-v.homing * dt, Math.min(v.homing * dt, d)); s.vx = Math.sin(na) * sp; s.vz = Math.cos(na) * sp; } }
      if (v.grav) { v.vy -= 20 * dt; s.y += v.vy * dt; }
      s.x += s.vx * dt; s.z += s.vz * dt; s.mesh.position.set(s.x, s.y, s.z); s.mesh.rotation.y = Math.atan2(s.vx, s.vz);
      const hitEnemy = !v.grav && W().enemies.some(e => !e.dead && !e.under && Math.hypot(e.x - s.x, e.z - s.z) < (s.rad || 0.2) + e.def.size * 0.7);
      const end = s.life <= 0 || (v.grav ? s.y <= 0.2 : (R.pointBlocked && R.pointBlocked(s.x, s.z)) || (hitEnemy && (v.boom || !v.pierce)));
      if (end) {
        if (W().scene) W().scene.remove(s.mesh);
        if (v.boom) fx0('boom', s.x, 0.6, s.z, { r: v.boom, color: s.kind === 'grenade' ? '#FFB45A' : s.kind === 'fire' ? '#FF7A3A' : '#B89AFF' });
        vis.splice(i, 1);
      }
    }
  };
  const onMsg = (from, d) => {
    if (!d || d.k !== 'pfx') return false;
    const run = crun(); if (!run || d.rid !== run.coop.seed || d.f !== run.floor || d.n !== run.coop.n || !W().scene) return true;
    if (Array.isArray(d.fx)) d.fx.slice(0, 60).forEach(f => fxIn(from, f));
    if (Array.isArray(d.sh)) d.sh.slice(0, 30).forEach(shotIn);
    return true;
  };
  const hook = () => { const n = N(); if (!n.send || n.fxHooked) return; const prev = n.onMsg2; n.onMsg2 = (from, d) => { if (d && onMsg(from, d)) return; if (prev) prev(from, d); }; n.fxHooked = 1; };
  hook();

  // ---------- 每一幀：送、飛 ----------
  let sendT = 0;
  const stp0 = R.step;
  R.step = dt => {
    const r = stp0(dt);
    try {
      const run = crun();
      if (!run) { Q.fx.length = 0; Q.sh.length = 0; if (vis.length) { vis.forEach(v => W().scene && W().scene.remove(v.s.mesh)); vis.length = 0; } }
      else {
        hook(); if (!W().paused) visStep(dt);
        sendT -= dt;
        if (sendT <= 0) { sendT = 0.2; if (Q.fx.length || Q.sh.length) { try { N().send({ k: 'pfx', rid: run.coop.seed, f: run.floor, n: run.coop.n, fx: Q.fx.splice(0), sh: Q.sh.splice(0) }); } catch (e) { Q.fx.length = 0; Q.sh.length = 0; } } }
      }
    } catch (e) { console.warn('[netfx]', e); }
    return r;
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { Q.fx.length = 0; Q.sh.length = 0; vis.forEach(v => { const sc = W().scene; if (sc) sc.remove(v.s.mesh); }); vis.length = 0; return lf0(f, o); };
  R.netFx = { Q, vis, depth: () => depth };   // 測試用
})(window.R);
