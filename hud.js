// 討伐令 1433：遺跡裡的畫面（狀態列、小地圖、傷害數字、特效、音效、背包、暫停）
(function (R) {
  const $ = id => document.getElementById(id);
  const T = () => THREE;
  const W = R.W;
  R.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- 提示、橫幅、紙本 ----------
  let toastT = 0, bannerT = 0;
  R.toast = (txt, color) => { const t = $('r-toast'); t.textContent = txt; t.style.borderLeftColor = color || ''; t.hidden = false; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); };
  R.banner = (big, small) => { const b = $('r-banner'); b.innerHTML = '<b>' + R.esc(big) + '</b>' + (small ? '<small>' + R.esc(small) + '</small>' : ''); b.hidden = false; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); clearTimeout(bannerT); bannerT = setTimeout(() => { b.hidden = true; }, 3400); };
  R.sheet = (html, foot) => { W.paused = true; R.input.fire = false; $('r-sheet').innerHTML = html + (foot || ''); $('r-modal').hidden = false; };
  R.closeSheet = () => { $('r-modal').hidden = true; W.paused = false; };
  R.sheetOpen = () => !$('r-modal').hidden;

  // ---------- 狀態列 ----------
  R.hudFloor = () => {
    const run = W.run;
    $('r-where').innerHTML = '<b>' + R.esc(run.site.name) + '</b><small>' + R.esc(run.grade.name) + '・' + R.esc(R.TYPES[run.type] ? R.TYPES[run.type].name : '') + '・' + (R.floorLabel ? R.floorLabel(run) : '第 ' + (run.floor + 1) + '／' + run.floors + ' 層') + (run.env ? '・' + R.ENVS[run.env].name : '') + '</small>';
    if (W.P) { const sk = R.SKILLS[W.P.skill]; $('r-skill-n').textContent = sk.name; $('r-skill').title = sk.name + '：' + sk.desc + '（魔力 ' + sk.mp + '）'; }
    R.drawMinimap(true);
  };
  let slow = 0;
  R.hudTick = dt => {
    const P = W.P, run = W.run; if (!P) return;
    $('r-hp').style.width = Math.max(0, P.hp / P.hpMax * 100) + '%';
    $('r-hp-t').textContent = Math.ceil(Math.max(0, P.hp)) + '／' + P.hpMax + (P.shield > 0 ? '（護盾 ' + Math.ceil(P.shield) + '）' : '');
    $('r-mp').style.width = (P.mp / P.mpMax * 100) + '%';
    $('r-mp-t').textContent = Math.floor(P.mp) + '／' + P.mpMax;
    $('r-aware').style.width = run.aware + '%';
    $('r-aware-box').classList.toggle('hot', run.aware >= 70);
    const sk = R.SKILLS[P.skill], cdMax = sk.cd * P.skillCdMult;
    $('r-skill-cd').style.height = (P.skillCd / cdMax * 100) + '%';
    $('r-dodge-cd').style.height = (P.dodgeCd / P.dodgeCdMax * 100) + '%';
    $('r-hurt').style.opacity = P.hurtT > 0 ? 0.5 : P.hp / P.hpMax < 0.3 ? 0.25 : 0;
    $('r-blind').style.opacity = P.blindT > 0 ? Math.min(0.85, P.blindT / 2) : 0;
    slow += dt; if (slow < 0.15) return; slow = 0;
    const ws = P.ws;
    $('r-weapon').innerHTML = '<b style="color:' + R.rarityColor(P.item) + '">' + R.esc(R.itemName(P.item)) + '</b><small>' + (ws.kind === 'gun' ? (P.reloadT > 0 ? '換彈中……' : '彈匣 ' + P.ammo + '／' + ws.mag) : ws.kind === 'magic' ? '每發 ' + ws.mp + ' 魔力' : ws.charge ? (P.charging ? '蓄力 ' + Math.round(Math.min(1, P.charge / 1.1) * 100) + '%' : '按住蓄力') : '') + (P.adv === 'yoto' ? '　魔力質 ' + (P.stacks || 0) : '') + (P.elemShots > 0 ? '　元素彈 ' + P.elemShots : '') + '</small>';
    $('r-gold').textContent = run.mats.crystal || 0; $('r-bag').textContent = run.bag.length + '／' + R.BAG_MAX;
    $('r-pot').textContent = '回復藥 ' + (R.S.potions.hp || 0) + '・魔力藥 ' + (R.S.potions.mp || 0);
    R.partyHud();
    const st = R.S.classes[R.S.cls];
    $('r-cls').innerHTML = '<b>' + R.esc(P.adv ? R.ADV[P.cls].find(a => a.id === P.adv).name : R.CLASSES[P.cls].name) + '</b> Lv ' + st.lv + '<i style="width:' + (st.xp / R.xpNeed(st.lv) * 100) + '%"></i>';
    $('r-aware-t').textContent = '佩特拉的注意 ' + Math.floor(run.aware) + (run.reactionKnown ? '・' + R.REACTIONS[run.reaction].name : '');
    const it = R.nearestInteract();
    $('r-prompt').hidden = !it; if (it) $('r-prompt').innerHTML = '<kbd>' + (R.touch ? '互動' : '空白') + '</kbd>' + R.esc(it.label);
    const boss = W.enemies.find(e => e.def.boss && !e.dead);
    $('r-boss').hidden = !boss; if (boss) { $('r-boss-n').textContent = boss.def.name; $('r-boss-hp').style.width = (boss.hp / boss.hpMax * 100) + '%'; }
    // 異常狀態力場：靠近佩特拉核心時，看不清楚
    const core = W.enemies.find(e => e.id === 'petra' && !e.dead) || (W.F && W.F.coreView);
    const near = core ? Math.max(0, 1 - Math.hypot(core.x - P.x, core.z - P.z) / 12) : 0;
    $('r-field').style.opacity = near * 0.7;
    if (run.collapseT != null) $('r-where').querySelector('small').textContent = '遺跡崩塌中：' + Math.ceil(run.collapseT) + ' 秒';
    R.drawMinimap(false);
  };

  // ---------- 小地圖 ----------
  R.drawMinimap = () => {
    const cv = $('r-map'), x = cv.getContext('2d'), F = W.F, P = W.P; if (!P || (!W.town && (!F || !F.tile))) return;
    const s = cv.width, sc = 1.3, yaw = W.cam ? W.cam.yaw : 0, cy = Math.cos(yaw), sy = Math.sin(yaw);
    // 小地圖跟著視角一起轉：畫面的上方就是小地圖的上方
    const pt = (wx, wz) => { const dx = (wx - P.x) / sc, dz = (wz - P.z) / sc; return [s / 2 + dx * cy - dz * sy, s / 2 + dx * sy + dz * cy]; };
    x.clearRect(0, 0, s, s); x.fillStyle = 'rgba(10,8,14,.72)'; x.fillRect(0, 0, s, s);
    if (W.inside) R.drawInteriorMinimap(x, s); else if (W.town) R.drawTownMinimap(x, s); else {
    const known = r => r.visited || Object.values(r.links).some(j => F.rooms[j].visited);
    // 地形：每格一個點，畫在離屏畫布上；房間走過或看過才畫
    const t = F.tile;
    if (!F.mini || F.miniKey !== F.rooms.map(r => (r.visited ? 2 : known(r) ? 1 : 0) + (r.locked ? 4 : 0)).join('')) {
      F.miniKey = F.rooms.map(r => (r.visited ? 2 : known(r) ? 1 : 0) + (r.locked ? 4 : 0)).join('');
      const mc = F.mini || (F.mini = document.createElement('canvas')); mc.width = t.nx; mc.height = t.nz;
      const mx = mc.getContext('2d'), img = mx.createImageData(t.nx, t.nz), d = img.data;
      for (let k = 0; k < t.nx * t.nz; k++) {
        let c = null; const kind = t.T[k];
        if (kind === 1) {
          const ri = t.RM[k];
          if (ri >= 0) { const r = F.rooms[ri]; c = !known(r) ? null : !r.visited ? [90, 80, 100, 150] : r.locked ? [184, 50, 42, 200] : [176, 166, 150, 215]; }
          else { const L = F.links[t.CR[k]]; if (L && (known(F.rooms[L.a]) && F.rooms[L.a].visited || known(F.rooms[L.b]) && F.rooms[L.b].visited)) c = L.bridge ? [150, 110, 70, 215] : [140, 132, 120, 200]; }
        } else if (kind === 2) {
          const tx = k % t.nx, tz = (k - tx) / t.nx; let near = false;
          for (let dz = -1; dz <= 1 && !near; dz++) for (let dx = -1; dx <= 1 && !near; dx++) { const m = (tz + dz) * t.nx + tx + dx; if (m >= 0 && m < t.T.length && t.T[m] === 1) { const ri = t.RM[m]; near = ri >= 0 ? F.rooms[ri].visited : (() => { const L = F.links[t.CR[m]]; return L && (F.rooms[L.a].visited || F.rooms[L.b].visited); })(); } }
          if (near) c = [60, 54, 64, 230];
        }
        if (c) { d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; d[k * 4 + 3] = c[3]; }
      }
      mx.putImageData(img, 0, 0);
    }
    // 把離屏畫布轉到「畫面的上方＝小地圖的上方」
    x.save(); x.translate(s / 2, s / 2); x.rotate(yaw); x.scale(t.TS / sc, t.TS / sc); x.translate(-(P.x - t.X0) / t.TS, -(P.z - t.Z0) / t.TS);
    x.imageSmoothingEnabled = false; x.drawImage(F.mini, 0, 0); x.restore();
    x.font = '12px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    F.rooms.forEach(r => {
      if (!known(r)) return;
      const ic = r.type === 'stairs' ? (F.stairs && F.stairs.sealed ? '✕' : '▼') : r.type === 'chest' ? '▣' : r.type === 'boss' ? '◉' : r.type === 'deep' ? '◆' : r.type === 'ore' ? '◇' : '';
      if (ic && r.visited) { const m = pt(r.x, r.z); x.fillStyle = '#F4E9CD'; x.fillText(ic, m[0], m[1]); }
    });
    x.fillStyle = '#7FE8FF'; (F.crystals || []).forEach(c => { if (!F.rooms[c.room].visited) return; const m = pt(c.x, c.z); x.beginPath(); x.arc(m[0], m[1], 3.5, 0, Math.PI * 2); x.fill(); });
    }
    // 自己：黃點，加一個小三角形表示面向
    const a = (P.aimA || 0) - yaw, fx = Math.sin(a), fz = Math.cos(a);
    x.fillStyle = '#FFE08A'; x.beginPath(); x.moveTo(s / 2 + fx * 8, s / 2 + fz * 8); x.lineTo(s / 2 - fz * 4, s / 2 + fx * 4); x.lineTo(s / 2 + fz * 4, s / 2 - fx * 4); x.closePath(); x.fill();
    x.beginPath(); x.arc(s / 2, s / 2, 3.5, 0, Math.PI * 2); x.fill();
    // 北方
    const nr = s / 2 - 10, nx = s / 2 + sy * nr, ny = s / 2 - cy * nr;
    x.fillStyle = 'rgba(184,50,42,.9)'; x.beginPath(); x.arc(nx, ny, 8, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#FFFFFF'; x.font = 'bold 10px sans-serif'; x.fillText('北', nx, ny + 0.5);
  };

  // ---------- 傷害數字 ----------
  const nums = [];
  R.addNum = (x, y, z, txt, cls) => {
    const el = document.createElement('div'); el.className = 'num ' + (cls || ''); el.textContent = txt; $('r-nums').appendChild(el);
    nums.push({ el, x, y, z, t: 0 });
    if (nums.length > 40) { const o = nums.shift(); o.el.remove(); }
  };
  // 換場景時把還浮在畫面上的傷害數字清掉
  R.clearNums = () => { nums.forEach(n => n.el.remove()); nums.length = 0; };
  const v3 = () => new (T().Vector3)();
  const tmp = { v: null };
  const updateNums = dt => {
    if (!tmp.v) tmp.v = v3();
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i]; n.t += dt; n.y += dt * 1.4;
      if (n.t > 0.9) { n.el.remove(); nums.splice(i, 1); continue; }
      tmp.v.set(n.x, n.y, n.z).project(W.camera);
      n.el.style.transform = 'translate(' + ((tmp.v.x + 1) / 2 * w) + 'px,' + ((1 - tmp.v.y) / 2 * h) + 'px) translate(-50%,-50%)';
      n.el.style.opacity = 1 - Math.max(0, n.t - 0.5) / 0.4;
    }
  };

  // ---------- 特效 ----------
  // 形狀共用（不會每次都做新的）；材質每個特效一份，結束時丟掉（不然記憶體會越吃越多、越玩越卡）
  const FXG = {};
  const geo = (k, make) => FXG[k] || (FXG[k] = make());
  R.disposeObj = o => { if (!o) return; o.traverse(m => { if (m.isMesh || m.isPoints || m.isLine) { if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); const ms = Array.isArray(m.material) ? m.material : [m.material]; ms.forEach(mt => { if (mt && !mt.userData.shared) mt.dispose(); }); } }); };
  R.addFx = (kind, x, y, z, o) => {
    const TH = T(), scene = W.scene; if (!scene) return;
    const f = { kind, t: 0, life: 0.5, objs: [] };
    const add = (m, own) => { scene.add(m); m.userData.ownGeo = !!own; f.objs.push(m); return m; };
    const basic = (c, op, side) => new TH.MeshBasicMaterial({ color: c, transparent: op != null, opacity: op == null ? 1 : op, side: side ? TH.DoubleSide : TH.FrontSide, depthWrite: op == null });
    const col = o.color || '#FFFFFF';
    if (kind === 'swing') {
      // 斬擊光：直接用世界座標做形狀（a 是 atan2(dx, dz)，和遊戲裡所有的角度一樣）
      // 揮砍：中間厚、兩端尖的月牙，從一邊掃到另一邊（o.dir：1 從右到左、-1 從左到右），掃完再淡掉
      // 突刺（o.width）：一道往前伸出去的尖光
      const big = o.big ? 1.25 : 1, y0 = 0.9;
      const mesh = (verts, c, op) => { const g = new TH.BufferGeometry(); g.setAttribute('position', new TH.BufferAttribute(new Float32Array(verts), 3)); const m = add(new TH.Mesh(g, basic(c, op, true)), true); m.renderOrder = 2; return m; };
      if (o.width) {
        f.life = 0.18; const sa = Math.sin(o.a), ca = Math.cos(o.a), w2 = o.width * 0.8, L0 = 0.4, L1 = o.range + 0.3;
        const tri = (w, c, op) => mesh([x + sa * L0 - ca * w, y0, z + ca * L0 + sa * w, x + sa * L0 + ca * w, y0, z + ca * L0 - sa * w, x + sa * L1, y0, z + ca * L1], c, op);
        const a1 = tri(w2, col, 0.5), a2 = tri(w2 * 0.4, '#FFFFFF', 0.95);
        f.tick = k => [a1, a2].forEach(m => { m.material.opacity = (m === a2 ? 0.95 : 0.5) * (k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6); });
      } else {
        f.life = 0.2 * (o.big ? 1.2 : 1);
        const arc = (o.arc || 1.6) * (o.arc >= 6 ? 1 : big), n = Math.max(8, Math.round(arc * 9)), dirS = o.dir === -1 ? -1 : 1, R0 = (o.range || 2) + 0.15, th = Math.min(0.95, R0 * 0.32) * big;
        const crescent = (thick, c, op) => {
          const v = [];
          for (let i = 0; i < n; i++) {
            const u0 = i / n, u1 = (i + 1) / n, an = u => o.a + dirS * (arc / 2 - arc * u), t = u => thick * Math.pow(Math.sin(Math.PI * u), 0.8) + 0.03;
            const P0 = [an(u0), t(u0)], P1 = [an(u1), t(u1)], pt = (A, r) => [x + Math.sin(A) * r, y0, z + Math.cos(A) * r];
            const o0 = pt(P0[0], R0), i0 = pt(P0[0], R0 - P0[1]), o1 = pt(P1[0], R0), i1 = pt(P1[0], R0 - P1[1]);
            v.push(...o0, ...i0, ...o1, ...i0, ...i1, ...o1);
          }
          return mesh(v, c, op);
        };
        const outer = crescent(th, col === '#FFFFFF' ? '#D8E6FF' : col, 0.55), core = crescent(th * 0.45, '#FFFFFF', 0.95);
        f.tick = k => { const seg = Math.min(n, Math.ceil(n * Math.min(1, k / 0.42))); [outer, core].forEach(m => { m.geometry.setDrawRange(0, seg * 6); m.material.opacity = (m === core ? 0.95 : 0.55) * (k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55); }); };
        f.tick(0.01);
      }
    } else if (kind === 'spark') {
      // 命中的火花：亮色的小方塊往打出去的方向噴；暴擊多一點、大一點
      f.life = o.crit ? 0.3 : 0.22; const n = o.crit ? 12 : 7, mat = basic(o.crit ? '#FFE28A' : '#FFF6D8', 1), g = geo('spark', () => new TH.BoxGeometry(0.13, 0.13, 0.13));
      for (let i = 0; i < n; i++) { const m = add(new TH.Mesh(g, mat)); m.position.set(x, y, z); const an = (o.a || 0) + (Math.random() - 0.5) * 1.8, sp = 3 + Math.random() * (o.crit ? 7 : 5); m.userData.v = [Math.sin(an) * sp, 1 + Math.random() * 3, Math.cos(an) * sp]; }
      f.shared = mat;
    } else if (kind === 'muzzle') {
      // 槍口、法杖的火光
      f.life = 0.07; const m = add(new TH.Mesh(geo('ball', () => new TH.SphereGeometry(1, 12, 8)), basic(col === '#FFFFFF' ? '#FFE9A8' : col, 0.9))); m.position.set(x, y, z); m.scale.setScalar(0.28);
    } else if (kind === 'pillar') {
      // 從天上落下的光柱（聖擊）
      f.life = 0.45; const m = add(new TH.Mesh(geo('pillar', () => { const g = new TH.CylinderGeometry(1, 1, 1, 14, 1, true); g.translate(0, 0.5, 0); return g; }), basic(col, 0.7, true))); m.position.set(x, 0, z); m.scale.set(o.r || 1, 9, o.r || 1);
      f.tick = k => { const s = (o.r || 1) * (1 - k * 0.7); m.scale.set(s, 9, s); };
    } else if (kind === 'poof' || kind === 'spawn' || kind === 'dust') {
      f.life = kind === 'dust' ? 0.4 : 0.6; const n = o.n || (kind === 'dust' ? 6 : 10), mat = basic(kind === 'dust' ? '#C8C0B0' : col, 1), g = geo('cube', () => new TH.BoxGeometry(0.16, 0.16, 0.16));
      for (let i = 0; i < n; i++) { const m = add(new TH.Mesh(g, i ? mat : mat)); m.position.set(x, y, z); m.userData.v = kind === 'dust' ? [(Math.random() - 0.5) * 3, Math.random() * 1.5, (Math.random() - 0.5) * 3] : [(Math.random() - 0.5) * 6, Math.random() * 5 + (kind === 'spawn' ? 2 : 0), (Math.random() - 0.5) * 6]; }
      f.shared = mat;
    } else if (kind === 'boom' || kind === 'ring' || kind === 'rain') {
      f.life = kind === 'ring' ? 0.5 : 0.4;
      const m = add(new TH.Mesh(geo('ring', () => new TH.RingGeometry(0.1, 1, 32)), basic(col, 0.7, true)));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.12, z); m.userData.r = o.r || 2;
      if (kind === 'boom') { const b = add(new TH.Mesh(geo('ball', () => new TH.SphereGeometry(1, 12, 8)), basic(col, 0.5))); b.position.set(x, 0.5, z); b.userData.r = (o.r || 2) * 0.8; }
    } else if (kind === 'sector') {
      f.life = o.t || 1;
      const m = add(new TH.Mesh(new TH.RingGeometry(0.4, o.range, 28, 1, -o.arc / 2, o.arc), basic('#E0283A', 0.25, true)), true); m.rotation.set(-Math.PI / 2, 0, o.a - Math.PI / 2); m.position.set(x, 0.08, z);
      // 外緣一圈亮紅、跟著時間長出去的填色（長滿就打下來；2026-10-04 回饋：遺跡太暗、怪物攻擊提示看不清楚）
      const edge = new TH.Mesh(new TH.RingGeometry(o.range - 0.12, o.range, 28, 1, -o.arc / 2, o.arc), basic('#FF3A4A', 0.9, true)); edge.position.z = 0.003; m.add(edge);
      const fill = new TH.Mesh(new TH.RingGeometry(0.4, o.range, 28, 1, -o.arc / 2, o.arc), basic('#FF2A3A', 0.35, true)); fill.position.z = 0.002; fill.scale.set(0.05, 0.05, 1); m.add(fill); f.tick = k => fill.scale.set(Math.max(0.05, k), Math.max(0.05, k), 1);
    } else if (kind === 'mark') {
      f.life = o.t || 1;
      const m = add(new TH.Mesh(geo('disc', () => new TH.CircleGeometry(1, 28)), basic('#E0283A', 0.25))); m.scale.set(o.r, o.r, 1); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, z);
      const edge = new TH.Mesh(geo('mkedge', () => new TH.RingGeometry(0.92, 1, 40)), basic('#FF3A4A', 0.9)); edge.position.z = 0.003; m.add(edge);
      const fill = new TH.Mesh(geo('disc', () => new TH.CircleGeometry(1, 28)), basic('#FF2A3A', 0.35)); fill.position.z = 0.002; fill.scale.set(0.05, 0.05, 1); m.add(fill); f.tick = k => fill.scale.set(Math.max(0.05, k), Math.max(0.05, k), 1);
    } else if (kind === 'aim' || kind === 'beam' || kind === 'slash') {
      f.life = kind === 'aim' ? (o.t || 1) : 0.25;
      const m = add(new TH.Mesh(new TH.PlaneGeometry(kind === 'aim' ? 0.3 : kind === 'slash' ? 1.2 : 1.8, o.len), basic(kind === 'aim' ? '#FF3A4A' : kind === 'slash' ? '#FFFFFF' : '#FF8A9A', kind === 'aim' ? 0.45 : 0.8, true)), true);
      m.geometry.translate(0, o.len / 2, 0); m.rotation.set(-Math.PI / 2, 0, o.a + Math.PI); m.position.set(x, 0.3, z);
    } else if (kind === 'bolt') {
      f.life = 0.15; const e = o.to, mid = new TH.Vector3((x + e.x) / 2, 1.2, (z + e.z) / 2), len = Math.hypot(e.x - x, e.z - z);
      const m = add(new TH.Mesh(geo('cube1', () => new TH.BoxGeometry(1, 1, 1)), basic('#BFE8FF'))); m.scale.set(0.08, 0.08, Math.max(0.01, len)); m.position.copy(mid); m.lookAt(e.x, 1.2, e.z);
    } else if (kind === 'blink' || kind === 'block') {
      f.life = 0.3; const m = add(new TH.Mesh(geo('ball', () => new TH.SphereGeometry(1, 12, 8)), basic(kind === 'block' ? '#C9A13A' : '#B89AFF', 0.5))); m.scale.setScalar(kind === 'block' ? 0.6 : 1); m.position.set(x, y, z);
    } else if (kind === 'rock') {
      f.life = 0.3; const m = add(new TH.Mesh(geo('rock', () => new TH.DodecahedronGeometry(0.7, 0)), new TH.MeshLambertMaterial({ color: '#6A6458' }))); m.position.set(x, y, z); m.userData.fall = true;
    }
    W.fxs.push(f);
  };
  R.updateFx = dt => {
    W.fxs.forEach(f => {
      f.t += dt; const k = f.t / f.life;
      f.objs.forEach(m => {
        if (m.userData.v) { m.position.x += m.userData.v[0] * dt; m.position.y += m.userData.v[1] * dt; m.position.z += m.userData.v[2] * dt; m.userData.v[1] -= 12 * dt; }
        if (m.userData.r) { const s = m.userData.r * Math.min(1, k * 1.6); m.scale.set(s, s, s); }
        if (m.userData.fall) m.position.y = Math.max(0.4, 6 - k * 6);
        if (m.material && m.material.transparent) m.material.opacity = Math.max(0, (m.material.userData.o0 || (m.material.userData.o0 = m.material.opacity)) * (1 - k));
      });
      if (f.shared && f.shared.transparent) f.shared.opacity = Math.max(0, 1 - k);
      if (f.kind === 'mark' || f.kind === 'sector') f.objs[0].material.opacity = 0.28 + 0.27 * Math.abs(Math.sin(f.t * 10));
      if (f.tick && k < 1) f.tick(k);
      if (k >= 1) {
        f.dead = true;
        const mats = new Set();
        f.objs.forEach(m => { W.scene.remove(m); if (m.userData.ownGeo) m.geometry.dispose(); if (m.material) mats.add(m.material); m.children.forEach(c => { if (c.material) mats.add(c.material); if (f.kind === 'sector' && c.geometry) c.geometry.dispose(); }); });
        mats.forEach(mt => mt.dispose());
      }
    });
    W.fxs = W.fxs.filter(f => !f.dead);
    updateNums(dt);
  };

  // ---------- 音效（瀏覽器合成） ----------
  let ac = null;
  const ensureAC = () => { if (!ac) { try { const A = window.AudioContext || window.webkitAudioContext; ac = A ? new A() : null; } catch (e) { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); return ac; };
  document.addEventListener('pointerdown', ensureAC, { once: true });
  const tone = (f, d, type, v, at) => { if (!ac) return; const t = ac.currentTime + (at || 0), o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.05); };
  const noise = (d, v, f) => { if (!ac) return; const n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; fl.type = 'bandpass'; fl.frequency.value = f || 1200; g.gain.value = v || 0.2; s.connect(fl); fl.connect(g); g.connect(ac.destination); s.start(); };
  let muted = false; try { muted = localStorage.getItem('ruins1433-mute') === '1'; } catch (e) { }
  R.sfx = k => { if (muted || !ac) return; ({ gun: () => { noise(0.08, 0.18, 2400); tone(160, 0.06, 'square', 0.04); }, bow: () => noise(0.12, 0.12, 900), magic: () => tone(880, 0.15, 'triangle', 0.05), swing: () => noise(0.1, 0.14, 1600), crossing: () => { tone(760, 0.16, 'square', 0.025); tone(640, 0.16, 'square', 0.02, 0.27); }, skill: () => { tone(520, 0.12); tone(780, 0.18, 'sine', 0.06, 0.06); }, chest: () => { tone(330, 0.1, 'triangle', 0.08); tone(660, 0.3, 'triangle', 0.06, 0.08); }, coin: () => tone(2400, 0.08, 'triangle', 0.04), pick: () => { tone(880, 0.1); tone(1320, 0.14, 'sine', 0.05, 0.06); }, mine: () => { noise(0.12, 0.3, 700); tone(120, 0.1, 'square', 0.05); }, drink: () => tone(600, 0.2, 'sine', 0.06) })[k]?.(); };
  R.toggleMute = () => { muted = !muted; try { localStorage.setItem('ruins1433-mute', muted ? '1' : '0'); } catch (e) { } return muted; };
  R.isMuted = () => muted;

  // ---------- 背包與暫停 ----------
  R.bagSheet = () => {
    const run = W.run; if (!run) return;
    const list = run.bag.map((it, i) => '<li>' + (R.itemIconTag ? R.itemIconTag(it, 'sm') : '') + '<span style="color:' + R.rarityColor(it) + '">' + R.esc(R.itemName(it)) + '</span><small>' + R.esc(R.itemLines(it).slice(0, 2).join('・')) + '</small>'
      + (it.identified && R.canUse(it, R.S.cls) && it.kind === 'weapon' ? '<button type="button" class="mini" data-eq="' + i + '">現在換上</button>' : !it.identified && it.kind === 'weapon' && R.canUse(it, R.S.cls) ? '<button type="button" class="mini" data-eq="' + i + '">換上（未鑑定，只有基礎數值）</button>' : '')
      + '<button type="button" class="mini" data-drop="' + i + '">丟掉</button></li>').join('');
    R.sheet('<h2>背包　' + run.bag.length + '／' + R.BAG_MAX + '</h2><ul class="bag">' + (list || '<li class="note">還沒撿到裝備。</li>') + '</ul>'
      + '<p class="note">素材：' + (Object.keys(run.mats).map(k => R.MATS[k].name + ' ×' + run.mats[k]).join('、') || '沒有') + '</p>'
      + '<p class="hand">寶箱開出的東西、魔力水晶、魔力核心、礦石，都能帶出遺跡。倒下的話，這些全部留在遺跡裡。</p>',
      '<div class="row"><button type="button" class="btn pri" id="bag-x">關上（I）</button></div>');
    $('bag-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-drop]').forEach(b => { b.onclick = () => { run.bag.splice(+b.dataset.drop, 1); R.bagSheet(); }; });
    document.querySelectorAll('[data-eq]').forEach(b => { b.onclick = () => { const it = run.bag[+b.dataset.eq]; R.swapWeapon(it); R.bagSheet(); }; });
  };
  // 在遺跡裡直接換武器：原本那把放進背包
  R.swapWeapon = it => {
    const run = W.run, P = W.P, eq = R.S.equip[R.S.cls], old = R.itemById(eq.weapon);
    run.bag = run.bag.filter(x => x !== it);
    R.S.stash.push(it); eq.weapon = it.id;
    if (old) { R.S.stash = R.S.stash.filter(x => x !== old); run.bag.push(old); }
    const fresh = R.calcPlayer(R.S.cls); P.item = fresh.item; P.ws = fresh.ws; P.ammo = P.ws.mag || 0; P.reloadT = 0;
    R.setHeroWeapon(P.h, it.base);
    R.toast('換上了：' + R.itemName(it));
  };
  // 第一次下遺跡：操作說明與三條規則
  R.helpSheet = () => {
    const keys = R.touch
      ? '<li>左搖桿移動；右搖桿瞄準，推到底就會攻擊</li><li>「式神」「翻滾」等按鈕在右搖桿上面；靠近寶箱時點畫面上的提示就能互動</li><li>右上角的箭頭轉動視角，「遠近」拉近拉遠</li>'
      : '<li>WASD 移動・滑鼠瞄準・按住左鍵攻擊（或按住 F：自動打最近的敵人）</li><li>空白鍵：互動（開寶箱、掘礦、走樓層通道）・Q／E：轉視角・滾輪：拉近拉遠</li><li>R 或右鍵：第一個技能・3、4：第二、三個技能（職業等級 3、6 學會）・點一下 Shift：翻滾（滾的時候不會受傷）・按住 Shift：跑步（跑的時候不能攻擊）・X：換彈</li><li>1：回復藥・2：魔力藥・I：背包・Tab：地圖・Esc：暫停</li><li>C：指揮隊友（跟隨、集火、待命、自由、撤退；選單打開時按 1～5）・H：戴上／拿下兜帽（有的話）</li>';
    R.sheet('<p class="kicker">第一次下遺跡</p><h2>公會的新人須知</h2><ul class="loot">' + keys + '</ul>'
      + '<h3>三件要記住的事</h3><ul class="loot"><li>寶箱開出來的武器，大多是<b>未鑑定</b>的：數值只有基礎的一部分。帶回東鶴，給老岩鑑定。</li><li>打破東西、爆炸、喚群燈大叫，會讓<b>佩特拉的注意</b>上升（什麼都不做會慢慢降下來；點左上角那一格看說明）。滿了，遺跡會有反應。</li><li>只有碰到<b>回歸水晶</b>才能帶著東西回去。倒在遺跡裡，背包裡的東西全部留下。</li></ul>',
      '<div class="row"><button type="button" class="btn pri" id="help-x">知道了</button></div>');
    $('help-x').onclick = R.closeSheet;
  };
  // Tab：大地圖（像《飢荒》）：遺跡裡畫這一層走過的地方；地面上畫整張東鶴近郊
  R.bigMap = () => {
    if (!W.run && !W.town) return;
    const s = Math.max(240, Math.min(560, Math.floor(window.innerWidth * 0.84), Math.floor(window.innerHeight * 0.64)));
    R.sheet('<h2>' + (W.town ? '東鶴近郊' : R.esc(W.run.site.name) + '・第 ' + (W.run.floor + 1) + ' 層') + '</h2><canvas id="big-map" class="bigmap" width="' + s + '" height="' + s + '"></canvas><p class="note">' + (W.town ? '黃點是你；彩色的點是遺跡入口（顏色是分級）；綠色方塊是公會和店。' : '黃點是你。▼ 往下的樓層通道・▲ 往上（第一層是入口）・▣ 寶箱・◉ 最深處或領主體・藍點 回歸水晶。只畫走過、看過的地方。') + '</p>',
      '<div class="row"><button type="button" class="btn pri" id="bm-x">關上（Tab）</button></div>');
    $('bm-x').onclick = R.closeSheet;
    const x = $('big-map').getContext('2d'); x.fillStyle = '#0A080E'; x.fillRect(0, 0, s, s);
    if (W.town) { R.drawTownBig(x, s); return; }
    R.drawMinimap(); const F = W.F, t = F.tile, P = W.P; if (!F.mini) return;
    const k = Math.min(s / t.nx, s / t.nz) * 0.96, ox = (s - t.nx * k) / 2, oz = (s - t.nz * k) / 2, pt = (wx, wz) => [ox + (wx - t.X0) / t.TS * k, oz + (wz - t.Z0) / t.TS * k];
    x.imageSmoothingEnabled = false; x.drawImage(F.mini, ox, oz, t.nx * k, t.nz * k);
    x.font = Math.max(12, Math.round(k * 1.6)) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    F.rooms.forEach(r => { if (!r.visited) return; const ic = r.type === 'stairs' ? (F.stairs && F.stairs.sealed ? '✕' : '▼') : r.type === 'chest' ? '▣' : r.type === 'boss' || r.type === 'lord' ? '◉' : r.type === 'deep' ? '◆' : r.type === 'ore' ? '◇' : ''; if (ic) { const m = pt(r.x, r.z); x.fillStyle = '#F4E9CD'; x.fillText(ic, m[0], m[1]); } });
    if (F.up && F.rooms[0].visited) { const m = pt(F.up.x, F.up.z); x.fillStyle = '#FFF1D0'; x.fillText('▲', m[0], m[1]); }
    x.fillStyle = '#7FE8FF'; (F.crystals || []).forEach(c => { if (!F.rooms[c.room].visited) return; const m = pt(c.x, c.z); x.beginPath(); x.arc(m[0], m[1], 4, 0, Math.PI * 2); x.fill(); });
    const m = pt(P.x, P.z); x.fillStyle = '#FFE08A'; x.strokeStyle = '#1A1410'; x.lineWidth = 2; x.beginPath(); x.arc(m[0], m[1], 5, 0, Math.PI * 2); x.fill(); x.stroke();
  };
  R.pauseSheet = () => {
    const run = W.run; if (!run) return;
    R.sheet('<h2>暫停</h2><p>' + R.esc(run.site.name) + '・第 ' + (run.floor + 1) + ' 層</p>'
      + '<p class="note">' + (R.touch ? '左搖桿移動・右搖桿瞄準並攻擊・按鈕：技能、翻滾、互動、回復藥、背包・右上角的箭頭轉動視角、「遠近」拉近拉遠' : 'WASD 移動・滑鼠瞄準、左鍵或 F 攻擊・R 或右鍵、3、4 技能・點 Shift 翻滾、按住 Shift 跑步・空白鍵互動・Q／E 轉視角・滾輪拉近拉遠・1 回復藥・2 魔力藥・X 換彈・I 背包・Tab 地圖') + '</p>'
      + '<p class="note">佩特拉的注意：打破東西、爆炸、喚群燈大叫、被群瞳盯著都會讓它上升；什麼都不做會慢慢降，換一層剩四成。滿了會觸發遺跡的反應。牆上張開的眼睛越多，代表它越注意你。</p>',
      '<div class="row"><button type="button" class="btn pri" id="ps-x">繼續</button><button type="button" class="btn" id="ps-mute">' + (R.isMuted() ? '打開音效' : '關掉音效') + '</button>' + (R.S && R.S.hood ? '<button type="button" class="btn" id="ps-hood">' + (R.S.hoodOn ? '拿下兜帽' : '戴上兜帽') + '</button>' : '') + '<button type="button" class="btn" id="ps-quit">放棄這一趟（當作倒下）</button></div>');
    $('ps-x').onclick = R.closeSheet;
    $('ps-mute').onclick = () => { R.toggleMute(); R.pauseSheet(); };
    $('ps-quit').onclick = () => { R.closeSheet(); W.P.hp = 0; R.onPlayerDown(); };
    if ($('ps-hood')) $('ps-hood').onclick = () => { R.toggleHood(); R.pauseSheet(); };
  };
})(window.R);
