// 城裡的穿模再清一次（作者 2026-10-04：城市有很多穿模——房子、樹、路燈）
// tidy.js 只收「中心點在房子裡」的東西；樹冠比樹幹大，種在牆邊的樹，樹冠會插進牆和屋頂。這裡再收一次：
// - 點陣圖的樹（松樹、小樹）、行道樹（InstancedMesh 的樹幹、樹冠、影子）：離房子的牆不到 1.1 公尺的收起來，碰撞也拿掉。
// - 「回報穿模」：城裡的選單、暫停選單多一顆鈕，按了會記下你現在的位置和鏡頭方向，顯示一行可以複製的字（貼給 Claude 就知道是哪裡）。
//   記錄存在 R.S.clipReports（最多 30 筆）。
// 放在 tidy.js 後面。
(function (R) {
  const W = R.W;
  const clean = () => {
    const tw = W.town; if (!tw || !tw.group) return 0;
    const H = R.col.list.filter(b => b.on !== false && (b.tag === 'house' || b.tag === 'wall'));
    const dBox = (x, z, b) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));
    const nearWall = (x, z, r) => H.some(b => Math.abs((b.x0 + b.x1) / 2 - x) < 40 && Math.abs((b.z0 + b.z1) / 2 - z) < 40 && dBox(x, z, b) < r);
    const dropTree = (x, z) => R.col.list.forEach(b => { if (b.tag === 'tree' && b.on !== false && x > b.x0 - 0.2 && x < b.x1 + 0.2 && z > b.z0 - 0.2 && z < b.z1 + 0.2) b.on = false; });
    let n = 0;
    tw.group.children.forEach(o => { if (!o.isGroup || !o.visible || o.position.y > 1 || !o.children[0] || !o.children[0].onBeforeRender) return; if ((tw.npcs || []).some(q => q.h && q.h.g === o)) return; if (nearWall(o.position.x, o.position.z, 1.0)) { o.visible = false; dropTree(o.position.x, o.position.z); n++; } });
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    tw.group.traverse(o => { if (!o.isInstancedMesh || !/Plane|Circle|Cylinder|Cone|Sphere/.test(o.geometry.type)) return; let ch = false; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); if (m.elements[0] === 0 && m.elements[5] === 0) continue; p.setFromMatrixPosition(m); if (p.y < 4 && nearWall(p.x, p.z, 1.1)) { o.setMatrixAt(i, zero); dropTree(p.x, p.z); ch = true; n++; } } if (ch) o.instanceMatrix.needsUpdate = true; });
    if (n) console.info('[tidy2] 牆邊的樹收起來：' + n);
    return n;
  };
  R.tidyTown2 = clean;
  const en0 = R.enterTownNow;
  R.enterTownNow = (from, at) => { en0(from, at); try { clean(); } catch (e) { console.warn('[tidy2]', e); } };

  // ---------- 回報穿模 ----------
  R.reportClip = () => {
    const P = W.P, s = R.S; if (!P || !s) return;
    const where = W.run ? (W.run.site.name + '・第 ' + (W.run.floor + 1) + ' 層') : W.inside ? '室內：' + ((R.INTERIOR_PLACES[W.inside.kind] || {}).name || W.inside.kind || '') : '東鶴';
    const line = '穿模回報｜' + where + '｜x=' + P.x.toFixed(1) + ' z=' + P.z.toFixed(1) + '｜鏡頭 ' + Math.round(((W.cam && W.cam.yaw) || 0) * 180 / Math.PI) + '°｜' + (R.shortDate ? R.shortDate() : '');
    s.clipReports = (s.clipReports || []).concat([line]).slice(-30); R.save();
    R.sheet('<p class="kicker">回報穿模</p><h2>記下來了</h2><p>把下面這一行複製起來貼給 Claude，就知道是哪裡：</p><textarea id="cr-t" readonly rows="2" style="width:100%;font:13px monospace">' + R.esc(line) + '</textarea>'
      + (s.clipReports.length > 1 ? '<details><summary>之前記的（' + (s.clipReports.length - 1) + ' 筆）</summary><textarea readonly rows="5" style="width:100%;font:12px monospace">' + R.esc(s.clipReports.slice(0, -1).join('\n')) + '</textarea></details>' : ''),
      '<div class="row"><button type="button" class="btn pri" id="cr-copy">複製</button><button type="button" class="btn" id="cr-x">好</button></div>');
    document.getElementById('cr-copy').onclick = () => { const t = document.getElementById('cr-t'); t.select(); try { navigator.clipboard ? navigator.clipboard.writeText(t.value) : document.execCommand('copy'); R.toast('複製了。'); } catch (e) { document.execCommand && document.execCommand('copy'); } };
    document.getElementById('cr-x').onclick = R.closeSheet;
  };
  const addBtn = () => { const row = document.getElementById('r-sheet') && document.getElementById('r-sheet').querySelector('.row'); if (!row || row.querySelector('#cr-open')) return; const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'cr-open'; b.textContent = '回報穿模'; b.onclick = () => { R.closeSheet(); setTimeout(R.reportClip, 50); }; row.appendChild(b); };
  const tm = R.townMenu; if (tm) R.townMenu = (...a) => { const r = tm(...a); addBtn(); return r; };
  const ps = R.pauseSheet; if (ps) R.pauseSheet = (...a) => { const r = ps(...a); addBtn(); return r; };
})(window.R);
