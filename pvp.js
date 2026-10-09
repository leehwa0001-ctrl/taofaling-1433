// 多人連線的「友傷」：隊友打得到彼此、掉落物用搶的（2026-10-05 作者：多人的情況下，可以新增條款，開不開啟友傷，這樣就可以看怎麼搶掉落物了）
// - 房主在公會登記處的多人連線那一格勾「友傷」（隊員看得到現在是開還是關），出發的時候跟著遺跡的設定傳給大家（run.ff）。
//   加注條款的點數表是全部人共用、一個人也能拿滿的，所以友傷不放進加注條款，放在房間的設定。
// - 友傷開著：
//   打人：普攻（R.melee）、範圍招（R.aoe）、射出去的東西（自己的投射物）碰到隊友，隊友受到「打遺跡生物的一半」的傷害（照你的傷害倍率）。
//   搶掉落物：每個人掉的東西（遺跡生物、寶箱、擊倒掉的）大家都看得到，誰先碰到誰拿。
//     做法：掉東西的那一方說了算——別人碰到你掉的東西，先問你（ffclaim），還在的話你給第一個來問的人（ffgive，大家把那件拿掉），
//     你自己先撿走就告訴大家（ffgone）。拿到別人的東西會說「搶到了」，被搶的那一方會說誰搶走了。
// - 關著（預設）：照舊，各打各的、各撿各的。
// 放在 net.js、net2.js、raid.js 後面。
(function (R) {
  const W = () => R.W, N = () => R.net || {}, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const K = 0.5;
  const crun = () => { const run = W().run; return run && run.coop && !run.coop.solo && !run.done ? run : null; };
  const ffOn = () => { const run = crun(); return !!(run && run.ff && N().room); };
  const rid = () => crun().coop.seed;
  const nm = id => { const m = (N().members || []).find(x => x.id === id); return m ? m.name : '隊友'; };
  const send = (d, to) => { try { N().send && N().send(d, to); } catch (e) { } };
  const label = d => d.type === 'gold' ? d.n + ' 費拉' : d.type === 'mat' ? ((R.MATS[d.mat] || {}).name || d.mat) + ' ×' + d.n : d.type === 'item' && d.item ? R.itemName(d.item) : '回復果實';

  // ---------- 房間的設定 ----------
  // 2026-10-10 修正：在登記處按「開房」、有人加入時，net.js 會把多人連線那一格整格重畫（refresh），勾選框被洗掉、要關掉登記處再開才有。
  // 改成登記處開著就隨時補回來；房主、隊員、開或關變了也重畫。房裡人數變了，房主再告訴大家一次現在開還是關（晚進來的隊員才看得到）。
  const ffRow = () => {
    const box = document.querySelector('#hub-body .net-box'), n = N(); if (!box || !n.room) return;
    const host = !!(n.isHost && n.isHost()), key = (host ? 'h' : 'g') + (n.ffOn ? 1 : 0);
    let row = box.querySelector('#ff-row'); if (row && row.dataset.k === key) return;
    if (!row) { row = document.createElement('div'); row.id = 'ff-row'; row.className = 'row'; box.appendChild(row); }
    row.dataset.k = key;
    row.innerHTML = host
      ? '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="ff-on"' + (n.ffOn ? ' checked' : '') + '>友傷（隊友打得到彼此、掉落物用搶的）</label>'
      : '<span class="note">友傷：<b>' + (n.ffOn ? '開' : '關') + '</b>（房主決定）</span>';
    const cb = row.querySelector('#ff-on'); if (cb) cb.onchange = () => { n.ffOn = cb.checked; row.dataset.k = 'h' + (n.ffOn ? 1 : 0); send({ k: 'ffset', on: n.ffOn ? 1 : 0 }); R.toast && R.toast('友傷：' + (n.ffOn ? '開。下一趟出發時生效。' : '關。'), '#FFB45A'); };
  };
  const hub0 = R.hub;
  R.hub = (...a) => { const r = hub0(...a); try { ffRow(); } catch (e) { console.warn('[pvp]', e); } return r; };
  let seen = 0;
  setInterval(() => {
    try {
      const n = N(), h = $('hub'); if (h && !h.hidden) ffRow();
      const cnt = n.room ? (n.members || []).length : 0;
      if (cnt !== seen) { seen = cnt; if (cnt > 1 && n.isHost && n.isHost()) send({ k: 'ffset', on: n.ffOn ? 1 : 0 }); }
    } catch (e) { }
  }, 400);
  // 出發：遺跡的設定裡多帶 ff
  const wrapSend = () => {
    const n = N(); if (!n.send || n.send.ffWrapped) return;
    const s0 = n.send; n.send = (d, to) => { if (d && d.k === 'run' && d.cfg && n.isHost && n.isHost()) d.cfg.ff = n.ffOn ? 1 : 0; return s0(d, to); }; n.send.ffWrapped = 1;
  };
  wrapSend();
  const sp0 = R.startParty;
  R.startParty = run => { wrapSend(); const r = sp0(run); try { if (run && run.coop && run.coop.host) run.ff = N().ffOn ? 1 : 0; if (run && run.ff && run.coop && !run.coop.solo) setTimeout(() => R.toast && R.toast('友傷開著：小心別打到隊友，掉落物用搶的。', '#FF9A6A'), 3000); } catch (e) { } return r; };

  // ---------- 打到隊友 ----------
  const remotes = () => { const m = N().remotes; return m ? [...m.entries()].filter(([, v]) => v && v.x != null) : []; };
  const hitRemote = (id, v, raw) => {
    const P = W().P; if (!P) return;
    const dmg = Math.max(1, Math.round(raw * (P.dmgMult || 1) * K));
    send({ k: 'ffhit', rid: rid(), dmg }, id); R.num && R.num(v.x, 2.2, v.z, dmg, 'crit');
  };
  const m0 = R.melee;
  R.melee = (a, range, arc, dmg, width, delay, fwd, o) => {
    const r = m0(a, range, arc, dmg, width, delay, fwd, o);
    if (ffOn()) {
      const P = W().P, run = W().run;
      const go = () => {
        if (W().run !== run || !P || P.dead || !ffOn()) return;
        const ox = P.x + Math.sin(a) * (fwd || 0), oz = P.z + Math.cos(a) * (fwd || 0), rad = 0.4;
        remotes().forEach(([id, v]) => {
          const dx = v.x - ox, dz = v.z - oz, d = Math.hypot(dx, dz); let ok;
          if (width) { const along = dx * Math.sin(a) + dz * Math.cos(a), side = Math.abs(dx * Math.cos(a) - dz * Math.sin(a)); ok = along > -0.3 && along < range + rad && side < width + rad; }
          else ok = d < range + rad && Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - a), Math.cos(Math.atan2(dx, dz) - a))) < (arc || 0.5) / 2 + 0.2;
          if (ok) hitRemote(id, v, dmg);
        });
      };
      if (delay) setTimeout(go, delay * 1000); else go();
    }
    return r;
  };
  const a0 = R.aoe;
  R.aoe = (x, z, r, dmg, o) => { const n = a0(x, z, r, dmg, o); if (ffOn()) remotes().forEach(([id, v]) => { if (Math.hypot(v.x - x, v.z - z) < r + 0.4) hitRemote(id, v, dmg); }); return n; };
  const us0 = R.updateShots;
  R.updateShots = dt => {
    const r = us0(dt);
    if (ffOn()) (W().shots || []).forEach(s => {
      if (s.dead || s.owner !== 'p' || s.ally) return;
      remotes().forEach(([id, v]) => {
        if (s.dead || (s.ffHit && s.ffHit.has(id)) || Math.hypot(v.x - s.x, v.z - s.z) > 0.8) return;
        (s.ffHit = s.ffHit || new Set()).add(id); hitRemote(id, v, s.dmg || 0);
        if (!(s.pierce > 0)) { if (R.killShot) R.killShot(s); else s.dead = true; } else s.pierce--;
      });
    });
    return r;
  };

  // ---------- 搶掉落物 ----------
  let seq = 0; const mine = new Map(), ghosts = new Map();
  const ad0 = R.addDrop;
  R.addDrop = d => {
    const g = ad0(d);
    try { if (g && ffOn() && !d.ffGhost) { g.ffId = N().me + ':' + (++seq); mine.set(g.ffId, g); send({ k: 'ffdrop', rid: rid(), id: g.ffId, type: g.type, mat: g.mat, n: g.n, item: g.item, x: +g.x.toFixed(2), z: +g.z.toFixed(2) }); } } catch (e) { console.warn('[pvp]', e); }
    return g;
  };
  const drop = d => { if (!d || d.gone) return; d.gone = true; const w = W(); if (d.mesh) { w.scene && w.scene.remove(d.mesh); R.disposeObj && R.disposeObj(d.mesh); } w.drops = (w.drops || []).filter(x => x !== d); };
  const ud0 = R.updateDrops;
  R.updateDrops = dt => {
    const w = W(), P = w.P; if (!ffOn() || !P || !w.drops) return ud0(dt);
    const held = w.drops.filter(d => d.ffGhost && !d.gone), own = w.drops.filter(d => d.ffId && !d.ffGhost && !d.gone);
    held.forEach(d => {
      d.t = (d.t || 0) + dt; if (d.mesh) { d.mesh.position.y = 0.5 + Math.sin(d.t * 3) * 0.12; d.mesh.rotation.y += dt * 1.5; }
      if (!P.dead && Math.hypot(d.x - P.x, d.z - P.z) < 1.1 && (!d.claimAt || performance.now() - d.claimAt > 1500)) { d.claimAt = performance.now(); send({ k: 'ffclaim', rid: rid(), id: d.ffId }, d.ffOwner); }
    });
    w.drops = w.drops.filter(d => !d.ffGhost);   // 別人的東西不照一般的撿法（不然兩邊都拿得到）
    try { return ud0(dt); }
    finally {
      w.drops = (w.drops || []).concat(held.filter(d => !d.gone));
      own.forEach(d => { if (d.gone && mine.has(d.ffId)) { mine.delete(d.ffId); send({ k: 'ffgone', rid: rid(), id: d.ffId }); } });
    }
  };
  const take = d => {   // 拿到別人給的：放在腳下，下一格照一般的撿法（背包放不下就留在地上）
    const P = W().P; if (!P) return;
    const g = R.addDrop({ type: d.type, mat: d.mat, n: d.n, item: d.item, x: P.x, z: P.z });
    if (g) { g.x = P.x; g.z = P.z; if (g.mesh) g.mesh.position.set(P.x, 0.5, P.z); }
    R.toast && R.toast('搶到了：' + label(d), '#FFD04A');
  };
  const onMsg = (from, d) => {
    const run = crun(), n = N();
    if (d.k === 'ffset') { if (from === n.host) n.ffOn = !!d.on; return true; }
    if (!d.k || d.k.slice(0, 2) !== 'ff') return false;
    if (!run || !run.ff || d.rid !== run.coop.seed) return true;
    const w = W(), P = w.P;
    if (d.k === 'ffhit') { if (P && !P.dead && d.dmg > 0) R.hurtPlayer(Math.min(d.dmg, P.hpMax * 0.5), { name: nm(from) + '（友傷）', pvp: 1 }); }
    else if (d.k === 'ffdrop') {
      if (!w.scene || ghosts.has(d.id) || !['gold', 'mat', 'item', 'fruit'].includes(d.type) || (d.type === 'mat' && !R.MATS[d.mat])) return true;
      const g = ad0({ type: d.type, mat: d.mat, n: d.n, item: d.item, x: d.x, z: d.z, ffGhost: true });
      if (g) { g.ffGhost = true; g.ffId = d.id; g.ffOwner = from; g.x = d.x; g.z = d.z; if (g.mesh) g.mesh.position.set(d.x, 0.5, d.z); ghosts.set(d.id, g); }
    }
    else if (d.k === 'ffclaim') {
      const g = mine.get(d.id); if (!g || g.gone) return true;
      mine.delete(d.id); drop(g);
      send({ k: 'ffgive', rid: run.coop.seed, id: d.id, to: from, type: g.type, mat: g.mat, n: g.n, item: g.item });
      R.toast && R.toast(nm(from) + ' 搶走了：' + label(g), '#FF9A6A');
    }
    else if (d.k === 'ffgive') { const g = ghosts.get(d.id); if (g) { ghosts.delete(d.id); drop(g); } if (d.to === n.me) take(d); }
    else if (d.k === 'ffgone') { const g = ghosts.get(d.id); if (g) { ghosts.delete(d.id); drop(g); } }
    return true;
  };
  const hook = () => { const n = N(); if (!n.send || n.ffHooked) return; const prev = n.onMsg2; n.onMsg2 = (from, d) => { if (d && onMsg(from, d)) return; if (prev) prev(from, d); }; n.ffHooked = 1; };
  hook();
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { mine.clear(); ghosts.clear(); hook(); return lf0(f, o); };
  R.pvp = { ffOn, mine, ghosts };   // 測試用
})(window.R);
