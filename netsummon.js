// 多人連線：隊友看得到你的召喚物（2026-10-05 作者：隊友看不到召喚物）
// 原本召喚出來的東西只在召喚的人自己的畫面上：召喚獸（型 pet：用遺跡生物的樣子捏的土狗、泥偶、這一層的遺跡生物…）、
//   設置物（型 turret：魔導砲台、聖燈、戰旗、召喚・泥偶…）。
// 現在：
// - 自己有召喚物的時候，每 0.1 秒送一次 { k: 'sm', rid, f, n, L: [[編號, x, z, 朝向, 在不在動, 樣子], …] }；
//   樣子只在新的那一隻第一次送、之後每 2 秒補一次（中途才連上的人也看得到）：召喚獸＝遺跡生物的編號、大小；設置物＝每一塊的形狀、顏色、位置。
//   召喚物都收掉了再送一次空的，隊友那邊馬上收掉。
// - 隊友那邊照樣子做一個「影子」：只有樣子和動作（不會打人、不會擋路、不算目標），往收到的位置滑過去；
//   超過 1.2 秒沒收到、換樓層、離開遺跡就收掉（冒一團煙）。形狀只認幾種基本的、數字有上限（別人送來的東西不照單全收）。
// - 傷害照舊：召喚物打遺跡生物在召喚的人那邊算（net2.js 照常同步給房主）。
// 放在 net.js、net2.js、pvp.js、classes2b.js、skillbook2.js 後面。
(function (R) {
  const W = () => R.W, N = () => R.net || {}, T = R.SKILL_TYPES;
  if (!T) return;
  const crun = () => { const run = W().run; return run && run.coop && !run.coop.solo && !run.done && N().room ? run : null; };
  const send = d => { try { N().send && N().send(d); } catch (e) { } };
  const r2 = v => Math.round(v * 100) / 100;

  // ---------- 樣子：設置物的每一塊 ----------
  const GEO = { BoxGeometry: ['width', 'height', 'depth'], CylinderGeometry: ['radiusTop', 'radiusBottom', 'height', 'radialSegments'], SphereGeometry: ['radius', 'widthSegments', 'heightSegments'], ConeGeometry: ['radius', 'height', 'radialSegments'] };
  const shapeOf = g => g.children.filter(c => c.isMesh && c.geometry && GEO[c.geometry.type] && c.material && c.material.color).slice(0, 12).map(c => {
    const p = c.geometry.parameters || {};
    return [c.geometry.type, GEO[c.geometry.type].map(k => r2(p[k] || 0)), '#' + c.material.color.getHexString(), c.material.isMeshBasicMaterial ? 1 : 0,
      [c.position.x, c.position.y, c.position.z].map(r2), [c.scale.x, c.scale.y, c.scale.z].map(r2), [c.rotation.x, c.rotation.y, c.rotation.z].map(r2)];
  });
  const num = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
  const okPart = p => Array.isArray(p) && GEO[p[0]] && Array.isArray(p[1]) && p[1].length === GEO[p[0]].length && p[1].every(v => num(v, 0, 6))
    && /^#[0-9a-f]{6}$/i.test(p[2]) && [p[4], p[5], p[6]].every(a => Array.isArray(a) && a.length === 3 && a.every(v => num(v, -8, 8)));
  const buildTurret = parts => {
    const TH = window.THREE, g = new TH.Group();
    parts.filter(okPart).forEach(p => {
      const a = p[1].slice(), seg = { CylinderGeometry: 3, SphereGeometry: 1, ConeGeometry: 2 }[p[0]];
      if (seg != null) for (let i = seg; i < a.length; i++) a[i] = Math.max(3, Math.min(16, Math.round(a[i])));
      const m = new TH.Mesh(new TH[p[0]](...a), p[3] ? new TH.MeshBasicMaterial({ color: p[2] }) : new TH.MeshLambertMaterial({ color: p[2] }));
      m.position.set(...p[4]); m.scale.set(...p[5]); m.rotation.set(...p[6]); g.add(m);
    });
    return g.children.length ? g : null;
  };

  // ---------- 自己的召喚物 ----------
  let seq = 0; const mine = new Map();   // 編號 → { g, shape, px, pz, mv, shapeT }
  const track = (g, shape) => { if (g) mine.set(++seq, { g, shape, px: g.position.x, pz: g.position.z, mv: 0, shapeT: 0 }); };
  const pet0 = T.pet;
  if (pet0) T.pet = (s, P, w, pw) => {
    if (!crun()) return pet0(s, P, w, pw);
    const mb = R.makeBeast, got = [];
    R.makeBeast = (id, ...a) => { const m = mb(id, ...a); if (m && m.g) got.push([id, m]); return m; };
    try { return pet0(s, P, w, pw); }
    finally { R.makeBeast = mb; got.forEach(([id, m]) => track(m.g, { b: id, s: r2(m.g.scale.x || 1) })); }
  };
  const tur0 = T.turret;
  if (tur0) T.turret = (s, P, w, pw) => {
    if (!crun() || !w.scene) return tur0(s, P, w, pw);
    const sc = w.scene, own = Object.prototype.hasOwnProperty.call(sc, 'add'), add0 = sc.add; let first = null;
    sc.add = function (...o) { if (!first && o[0] && o[0].isGroup) first = o[0]; return add0.apply(this, o); };
    try { return tur0(s, P, w, pw); }
    finally { if (own) sc.add = add0; else delete sc.add; if (first) track(first, { t: shapeOf(first) }); }
  };

  // ---------- 隊友的召喚物（影子） ----------
  const ghosts = new Map();   // 送的人:編號 → { g, m, b, from, x, z, tx, tz, yaw, mv, t, at }
  const dropGhost = (key, poof) => {
    const gh = ghosts.get(key); if (!gh) return; ghosts.delete(key);
    if (gh.g.parent) gh.g.parent.remove(gh.g); if (R.disposeObj && !gh.m) R.disposeObj(gh.g);
    if (poof && R.fx) R.fx('poof', gh.x, 0.6, gh.z, { color: '#C8C8D0', n: 10 });
  };
  const clearGhosts = () => [...ghosts.keys()].forEach(k => dropGhost(k));
  const makeGhost = (shape, x, z) => {
    let g = null, m = null, b = null;
    if (shape && typeof shape.b === 'string' && R.ENEMIES[shape.b] && R.makeBeast) { b = shape.b; m = R.makeBeast(b); g = m && m.g; if (g && num(shape.s, 0.2, 4)) g.scale.setScalar(shape.s); }
    else if (shape && Array.isArray(shape.t)) g = buildTurret(shape.t.slice(0, 12));
    if (!g) return null;
    g.position.set(x, 0, z); W().scene.add(g);
    if (R.fx) R.fx('poof', x, 0.6, z, { color: '#C8A878', n: 12 });
    return { g, m, b, x, z, tx: x, tz: z, yaw: 0, mv: 0, t: 0, at: Math.random() * 5 };
  };
  const onMsg = (from, d) => {
    if (!d || d.k !== 'sm') return false;
    const run = crun();
    if (!run || d.rid !== run.coop.seed || d.f !== run.floor || d.n !== run.coop.n || !W().scene || !Array.isArray(d.L)) { ghosts.forEach((gh, k) => { if (gh.from === from) dropGhost(k); }); return true; }
    const seen = new Set();
    d.L.slice(0, 24).forEach(it => {
      if (!Array.isArray(it)) return; const [sid, x, z, yaw, mv, shape] = it;
      if (!Number.isInteger(sid) || !num(x, -2000, 2000) || !num(z, -2000, 2000)) return;
      const key = from + ':' + sid; seen.add(key);
      let gh = ghosts.get(key);
      if (!gh) { gh = makeGhost(shape, x, z); if (!gh) return; gh.from = from; ghosts.set(key, gh); }
      gh.tx = x; gh.tz = z; gh.yaw = Number.isFinite(yaw) ? yaw : gh.yaw; gh.mv = mv ? 1 : 0; gh.t = 0;
    });
    ghosts.forEach((gh, k) => { if (gh.from === from && !seen.has(k)) dropGhost(k, true); });
    return true;
  };
  const hook = () => { const n = N(); if (!n.send || n.smHooked) return; const prev = n.onMsg2; n.onMsg2 = (from, d) => { if (d && onMsg(from, d)) return; if (prev) prev(from, d); }; n.smHooked = 1; };
  hook();

  // ---------- 每一幀 ----------
  let sendT = 0, had = false;
  const tick = dt => {
    const run = crun();
    if (!run) { if (mine.size) mine.clear(); if (ghosts.size) clearGhosts(); had = false; return; }
    hook();
    mine.forEach((o, sid) => {
      if (!o.g.parent) { mine.delete(sid); return; }
      const x = o.g.position.x, z = o.g.position.z; o.mv = Math.hypot(x - o.px, z - o.pz) > 0.004 ? 0.25 : Math.max(0, o.mv - dt); o.px = x; o.pz = z; o.shapeT -= dt;
    });
    sendT -= dt;
    if (sendT <= 0 && (mine.size || had)) {
      sendT = 0.1;
      const L = [...mine.entries()].slice(0, 24).map(([sid, o]) => { const it = [sid, r2(o.g.position.x), r2(o.g.position.z), r2(o.g.rotation.y), o.mv > 0 ? 1 : 0]; if (o.shapeT <= 0) { o.shapeT = 2; it.push(o.shape); } return it; });
      send({ k: 'sm', rid: run.coop.seed, f: run.floor, n: run.coop.n, L }); had = mine.size > 0;
    }
    const k = 1 - Math.exp(-dt * 12);
    ghosts.forEach((gh, key) => {
      gh.t += dt; if (gh.t > 1.2) { dropGhost(key, true); return; }
      gh.x += (gh.tx - gh.x) * k; gh.z += (gh.tz - gh.z) * k; gh.at += dt;
      gh.g.position.set(gh.x, 0, gh.z);
      if (gh.m) { if (R.animBeast) R.animBeast(gh.m, gh.b, gh.at, !!gh.mv); } else gh.g.rotation.y = gh.yaw;
    });
  };
  const st0 = R.step;
  R.step = dt => { const r = st0(dt); try { tick(dt); } catch (e) { console.warn('[netsummon]', e); } return r; };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { mine.clear(); clearGhosts(); had = false; return lf0(f, o); };
  R.netSummon = { mine, ghosts };   // 測試用
})(window.R);
