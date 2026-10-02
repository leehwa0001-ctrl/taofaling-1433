// 討伐令 1433：城蓋好之後的善後（穿模）
// 不管是誰改了城市（設施轉向、新的房子、劇情人物的位置），進城時都檢查一次：
//  - 站在房子裡的人（劇情人物、店員、攤販）：挪到最近的屋外空地。
//  - 落在房子裡的互動點：挪到最近的屋外。
//  - 地上的直立看板（松樹、小招牌）、行道樹（InstancedMesh）被包在房子裡的：收起來。
// 屋頂上的東西（百貨的摩天輪、招牌）不算。
(function (R) {
  const W = R.W;
  const tidy = () => {
    const tw = W.town; if (!tw) return;
    const boxes = R.col.list.filter(b => b.on !== false && (b.tag === 'house' || b.tag === 'wall'));
    const inside = (x, z, pad) => boxes.some(b => x > b.x0 + pad && x < b.x1 - pad && z > b.z0 + pad && z < b.z1 - pad);
    const blocked = (x, z) => R.col.list.some(b => b.on !== false && b.tag !== 'deco' && x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3);
    const freeNear = (x, z) => { for (let r = 0.8; r <= 8; r += 0.4) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, nx = x + Math.sin(a) * r, nz = z + Math.cos(a) * r; if (!blocked(nx, nz)) return [nx, nz]; } return null; };
    let moved = 0, hid = 0;
    tw.npcs.forEach(n => { if (n.walk || n.off || !inside(n.x, n.z, 0.15)) return; const p = freeNear(n.x, n.z); if (!p) return; n.x = p[0]; n.z = p[1]; if (n.h) n.h.g.position.set(n.x, 0, n.z); moved++; });
    tw.inter.forEach(it => { if (it.follow) return; const d = Object.getOwnPropertyDescriptor(it, 'x'); if (d && d.get) return; if (!inside(it.x, it.z, 0.4)) return; const p = freeNear(it.x, it.z); if (p) { it.x = p[0]; it.z = p[1]; moved++; } });
    tw.group.children.forEach(o => { if (!o.isGroup || !o.visible || o.position.y > 1 || !o.children[0] || !o.children[0].onBeforeRender) return; if (tw.npcs.some(n => n.h && n.h.g === o)) return; if (inside(o.position.x, o.position.z, 0.3)) { o.visible = false; hid++; } });
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    tw.group.traverse(o => { if (!o.isInstancedMesh) return; let ch = false; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); p.setFromMatrixPosition(m); if (p.y < 3 && inside(p.x, p.z, 0.4)) { o.setMatrixAt(i, zero); ch = true; hid++; } } if (ch) o.instanceMatrix.needsUpdate = true; });
    if (moved || hid) console.info('[tidy] 挪出房子：' + moved + '，收起來：' + hid);
  };
  R.tidyTown = tidy;
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => { enter0(from, at); try { tidy(); } catch (e) { console.warn('[tidy]', e); } };
})(window.R);
