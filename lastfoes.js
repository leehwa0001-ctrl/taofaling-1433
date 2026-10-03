// 房間只剩最後幾隻的時候標出來（2026-10-04 回饋：常常只剩一兩隻躲在角落，還要找到、打倒才能離開房間，很麻煩）
// - 你所在的、封起來的那一區只剩 1～3 隻：每一隻頭上有一個上下晃的紅箭頭；不在畫面裡的，畫面邊緣有箭頭指著牠。
// - 剩下的過了 20 秒還沒解決：牠們會醒過來、主動朝你過來（不再縮在角落）。
// 放在 run.js、combat.js 後面。
(function (R) {
  const W = () => R.W;
  const marks = new Map();
  let acc = 0, layer = null, lastN = 0, since = 0;
  const ensureLayer = () => { if (layer && layer.isConnected) return layer; const run = document.getElementById('run'); if (!run) return null; layer = document.createElement('div'); layer.id = 'lf-layer'; run.appendChild(layer); return layer; };
  const clear = () => { marks.forEach(m => { if (m.parent) m.parent.remove(m); }); marks.clear(); if (layer) layer.innerHTML = ''; };
  const arrowMesh = () => {
    const TH = THREE, g = new TH.Group(), mat = new TH.MeshBasicMaterial({ color: '#FF3A4A', transparent: true, opacity: 0.9, depthTest: false });
    const c = new TH.Mesh(new TH.ConeGeometry(0.32, 0.6, 4), mat); c.rotation.x = Math.PI; g.add(c);
    const beam = new TH.Mesh(new TH.CylinderGeometry(0.05, 0.05, 2.2, 6), new TH.MeshBasicMaterial({ color: '#FF6A7A', transparent: true, opacity: 0.4, depthTest: false })); beam.position.y = 1.4; g.add(beam);
    g.renderOrder = 10; g.traverse(o => { o.renderOrder = 10; }); return g;
  };
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(), run = w.run, P = w.P, F = w.F;
    if (!run || run.done || !P || !F || !R.roomIndexAt) { if (marks.size) clear(); return; }
    acc += dt; marks.forEach((m, e) => { m.position.set(e.x, 2.4 + (e.def.size || 1) * 0.6 + Math.sin(run.t * 5) * 0.2, e.z); m.rotation.y += dt * 2; });
    if (acc < 0.2) return; acc = 0;
    const ri = R.roomIndexAt(P.x, P.z), r = ri >= 0 ? F.rooms[ri] : null;
    const left = r && r.locked ? w.enemies.filter(e => !e.dead && e.room === r.i && !e.fake) : [];
    if (!left.length || left.length > 3) { if (marks.size) clear(); lastN = 0; since = 0; return; }
    if (left.length !== lastN) { if (!lastN || left.length < lastN) R.toast && R.toast('這一區還剩 ' + left.length + ' 隻——紅色箭頭標出來了', '#FF7A6A'); lastN = left.length; }
    since += 0.2;
    // 世界裡的箭頭
    marks.forEach((m, e) => { if (!left.includes(e)) { if (m.parent) m.parent.remove(m); marks.delete(e); } });
    left.forEach(e => { if (!marks.has(e)) { const m = arrowMesh(); w.scene.add(m); marks.set(e, m); } if (since > 20) { e.aggro = true; e.dormant = false; } });
    // 畫面邊緣的箭頭
    const L = ensureLayer(); if (!L || !w.camera) return;
    const cv = document.getElementById('gl'), rc = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const v = new THREE.Vector3(); let html = '';
    left.forEach(e => {
      v.set(e.x, 1, e.z).project(w.camera); const behind = v.z > 1, on = !behind && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.9; if (on) return;
      let x = v.x, y = v.y; if (behind) { x = -x; y = -y; } const a = Math.atan2(-y, x), k = 0.9 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
      const px = rc.left + rc.width * (0.5 + Math.cos(a) * k * 0.5), py = rc.top + rc.height * (0.5 + Math.sin(a) * k * 0.5);
      html += '<i class="lf-arrow" style="left:' + px.toFixed(0) + 'px;top:' + py.toFixed(0) + 'px;transform:translate(-50%,-50%) rotate(' + (a * 180 / Math.PI).toFixed(0) + 'deg)"></i>';
    });
    L.innerHTML = html;
  };
  const lf0 = R.loadFloor; R.loadFloor = (f, o) => { clear(); lastN = 0; since = 0; return lf0(f, o); };
  const er0 = R.endRun; R.endRun = (...a) => { clear(); return er0(...a); };
  const css = document.createElement('style');
  css.textContent = '#lf-layer{position:fixed;inset:0;pointer-events:none;z-index:6}.lf-arrow{position:fixed;width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:22px solid #FF3A4A;filter:drop-shadow(0 0 4px rgba(0,0,0,.8));animation:lf-pulse .8s ease-in-out infinite alternate}@keyframes lf-pulse{from{opacity:.55}to{opacity:1}}#run.town #lf-layer{display:none}';
  document.head.appendChild(css);
})(window.R);
