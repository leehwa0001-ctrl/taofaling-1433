// 沙漠的魔力乾枯、凍原的凍傷（2026-10-05 作者：沙漠類可以加魔力乾枯的效果，沙塵爆可以阻止魔力回復，雪地可以新增像是麥塊的凍傷系統）
// - 沙漠（有場地效果的沙漠，kesentfx.js 的 on）：魔力的自然回復減半；沙暴來的時候完全不回。
//   做法：R.step 前後看魔力多了多少，照這一格自然會回的量（職業的底＋回魔詞綴＋天賦＋二轉的每秒回魔）扣回去一半或全部；
//   多出來的（喝藥、擊倒回魔、技能）照常。
// - 凍原：像麥塊的細雪。地上一塊一塊的「積雪」（白色、鼓起來，跟冰面不重疊），站進去凍傷值每秒 +30；
//   暴風雪的時候到處每秒 +6；其他時候每秒 −8，營火、火焰旁邊每秒 −30。凍傷值 0～100：
//   滿了以後走路變慢（跟變慢的狀態一樣），每 1.5 秒掉一點生命（照深度）；畫面四周結霜，越凍越白。左上角一格顯示凍傷值。
// 放在 kesentfx.js 後面（要 R.kesentState）。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id), rnd = (a, b) => a + Math.random() * (b - a);
  const on = run => run && run.env && run.grade && !run.done && (run.grade.id === 'kesent' || (run.grade.lv || 0) >= 4 || run.grade.id === 'kaso');
  const deepK = run => 1 + Math.min(1, (run.floor || 0) / Math.max(1, run.floors - 1));
  const ks = () => (R.kesentState ? R.kesentState() : null);

  // ---------- 凍原：積雪 ----------
  let F2 = null;   // { F, drift: Set(格子), frost, hurtT, mesh }
  const buildDrift = () => {
    const w = W(), run = w.run, F = w.F; F2 = null;
    if (!on(run) || run.env !== 'snow' || !F || !F.tile || !F.group || !window.THREE) return;
    const t = F.tile, ice = (ks() && ks().iceT) || new Set(), drift = new Set(), N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const rooms = (F.rooms || []).filter((r, i) => i > 0 && !r.rest), n = Math.round(5 * deepK(run));
    for (let i = 0; i < n * 3 && rooms.length; i++) {
      const rm = rooms[Math.floor(Math.random() * rooms.length)], x = rm.x + rnd(-rm.hx, rm.hx) * 0.7, z = rm.z + rnd(-rm.hz, rm.hz) * 0.7;
      const k0 = t.id(t.tX(x), t.tZ(z)); if (t.T[k0] !== 1 || ice.has(k0) || drift.has(k0)) continue;
      const want = 8 + Math.floor(Math.random() * 9), q = [k0]; let got = 0;
      while (q.length && got < want) { const kk = q.splice(Math.floor(Math.random() * q.length), 1)[0]; if (drift.has(kk) || ice.has(kk) || t.T[kk] !== 1) continue; drift.add(kk); got++; const tx = kk % t.nx, tz = (kk - tx) / t.nx; N4.forEach(([dx, dz]) => { const nk = t.id(tx + dx, tz + dz); if (!drift.has(nk) && t.T[nk] === 1) q.push(nk); }); }
      if (drift.size > n * 14) break;
    }
    F2 = { F, drift, frost: 0, hurtT: 0, mesh: null };
    if (!drift.size) return;
    // 積雪：白色、有一點起伏的方塊（比冰面高一點、不透明）
    const TH = THREE, c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
    g.fillStyle = '#F4F8FC'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#DCE6F0'; [[1, 2], [6, 5], [11, 1], [3, 11], [9, 9], [13, 13]].forEach(([a, b]) => g.fillRect(a, b, 3, 2)); g.fillStyle = '#FFFFFF'; [[4, 1], [12, 6], [2, 7], [8, 13]].forEach(([a, b]) => g.fillRect(a, b, 2, 1));
    const tex = new TH.CanvasTexture(c); tex.magFilter = tex.minFilter = TH.NearestFilter;
    const m = new TH.InstancedMesh(new TH.BoxGeometry(t.TS, 0.22, t.TS), new TH.MeshLambertMaterial({ map: tex, emissive: '#8AA0B8', emissiveIntensity: 0.18 }), drift.size), o = new TH.Object3D(); let i = 0;
    drift.forEach(kk => { const tx = kk % t.nx, tz = (kk - tx) / t.nx; o.position.set(t.cX(tx), 0.05 + Math.random() * 0.04, t.cZ(tz)); o.rotation.y = 0; o.updateMatrix(); m.setMatrixAt(i++, o.matrix); });
    m.receiveShadow = true; F.group.add(m); F2.mesh = m;
  };
  const inDrift = P => { const t = F2 && F2.F.tile; return !!(t && F2.drift.has(t.id(t.tX(P.x), t.tZ(P.z)))) && !P.air; };
  const nearHeat = P => {
    const w = W(), C = w.F && w.F.camp; if (C && Math.hypot(C.x - P.x, C.z - P.z) < 4) return true;
    return (w.zones || []).some(z => !z.dead && /lava|magma|fire|flame|burn/.test(z.kind || '') && Math.hypot(z.x - P.x, z.z - P.z) < (z.r || 1) + 2.5);
  };
  // 畫面四周結霜、左上角的凍傷值
  const overlay = () => { let el = $('env-frost-ov'); if (!el) { el = document.createElement('div'); el.id = 'env-frost-ov'; document.body.appendChild(el); } return el; };
  const chip = () => { let el = $('env-frost'); if (!el) { const tl = $('r-tl'); if (!tl) return null; el = document.createElement('div'); el.id = 'env-frost'; el.className = 'glass dungeon-only r-misc'; el.title = '凍傷：站在積雪裡會一直漲，滿了會變慢、掉生命。離開積雪、靠近營火或火焰就會退。'; tl.appendChild(el); } return el; };
  let hudT = 0;
  const hud = run => {
    const el = $('env-frost'), ov = $('env-frost-ov'), show = !!(F2 && run && run.env === 'snow' && on(run));
    if (!show) { if (el) el.hidden = true; if (ov) ov.style.opacity = 0; return; }
    const c = chip(); if (!c) return; const v = Math.round(F2.frost), n = Math.round(v / 10);
    c.hidden = false; const h = '凍傷 <b style="color:' + (v >= 100 ? '#FF7A7A' : v >= 60 ? '#BFE8FF' : '#E8F2FF') + '">' + '▮'.repeat(n) + '▯'.repeat(10 - n) + '</b> ' + v + (v >= 100 ? '・<b style="color:#FF9A6A">凍僵了</b>' : '');
    if (c.dataset.h !== h) { c.dataset.h = h; c.innerHTML = h; }
    overlay().style.opacity = (Math.min(1, v / 100) * 0.9).toFixed(2);
  };

  // ---------- 每一格 ----------
  const st0 = R.step;
  R.step = dt => {
    const w = W(), P0 = w.P, mp0 = P0 ? P0.mp : 0;
    const r = st0(dt);
    const run = w.run, P = w.P; if (!run || !P || P !== P0 || w.paused) { hud(run); return r; }
    if (on(run) && run.env === 'desert' && !P.dead) {
      // 魔力乾枯：照這一格「自然會回多少」扣回去（平常一半、沙暴全部）
      // 2026-10-05 作者：沙暴時魔力不回好像沒有用——原本看「一格多的少不少（不超過 max(0.6, 每秒 25)）」，
      //   回魔高（神話裝備的回魔、天賦、二轉的每秒回魔）、畫面卡（一格 0.05 秒）的時候一格回超過門檻，被當成喝藥放過去了。
      //   現在照實際的回魔速度算：職業的底（術士、祭司 3.5，其他 2）＋回魔（P.mpRegen）＋二轉的每秒回魔（P.pv.mpRegen）＋內修者站著不動 3。
      const gain = P.mp - mp0, S = ks(), storm = !!(S && S.storm > 0);
      if (gain > 0) {
        const rate = (P.cls === 'mage' || P.cls === 'priest' ? 3.5 : 2) + (P.mpRegen || 0) + ((P.pv && P.pv.mpRegen) || 0) + (P.adv === 'inner' && P.still > 0.6 ? 3 : 0);
        P.mp -= Math.min(gain, rate * dt * 1.05 + 0.02) * (storm ? 1 : 0.5);
      }
    }
    if (F2 && F2.F !== w.F) F2 = null;
    if (F2 && run.env === 'snow' && on(run)) {
      const S = ks(), storm = !!(S && S.storm > 0), k = deepK(run);
      let rate = inDrift(P) ? 30 : storm ? 6 : -8; if (nearHeat(P)) rate = -30; if (P.dead) rate = -8;
      F2.frost = Math.max(0, Math.min(100, F2.frost + rate * dt));
      if (F2.frost >= 100 && !P.dead) {
        P.slowT = Math.max(P.slowT || 0, 0.3);
        F2.hurtT -= dt; if (F2.hurtT <= 0) { F2.hurtT = 1.5; R.hurtPlayer(P.hpMax * 0.025 * k + 1, { name: '凍傷' }); }
        if (!F2.warned) { F2.warned = 1; R.toast && R.toast('凍僵了：快離開積雪，找營火或火焰取暖！', '#BFE8FF'); }
      } else if (F2.frost < 70) F2.warned = 0;
      if (inDrift(P) && Math.random() < dt * 6) R.fx && R.fx('dust', P.x + rnd(-0.4, 0.4), 0.2, P.z + rnd(-0.4, 0.4), { color: '#F4F8FF' });
    }
    hudT -= dt; if (hudT <= 0) { hudT = 0.25; hud(run); }
    return r;
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf0(f, o); try { buildDrift(); } catch (e) { console.warn('[envplus]', e); } return r; };

  const css = document.createElement('style');
  css.textContent = '#env-frost-ov{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity .4s;'
    + 'background:radial-gradient(ellipse at center,rgba(220,240,255,0) 45%,rgba(220,240,255,.55) 78%,rgba(245,250,255,.95) 100%);'
    + 'box-shadow:inset 0 0 60px 18px rgba(200,230,255,.6)}';
  document.head.appendChild(css);
})(window.R);
