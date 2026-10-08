// 精緻城市的街頭事件、快速移動、競選海報（2026-10-09 作者：其他城市也要有東鶴有的那些功能）
// - 街頭事件（streetevents.js）：扒手、搶包包、深夜小巷的強盜（城的設定 alleys: [[x0, z0, x1, z1], ...]）、醉漢打架（brawl: [[x, z], ...]）、
//   迷路的小孩、跌倒的老人家。追的對象在小地圖、大地圖上是紅點。走進店裡的時候事件就結束。
// - 快速移動（fasttravel.js）：T 鍵、暫停選單的「快速移動」。這座城的每一間走得進去的店門口、廣場，搭公會的接駁車過去。
// - 競選海報（posters.js）：大路邊的人行道立幾塊「海報張貼處」（貼著房子那一側，不擋路人）。
// 放在 ckmove.js 後面。
(function (R) {
  const CK = R.CK, W = R.W; if (!CK) return;
  const $ = id => document.getElementById(id), esc = s => R.esc(s);
  const ck = () => !!(W.town && W.town.ck);
  // ---------- 街頭事件 ----------
  const SE = () => R.streetEventDebug;
  const target = ev => ev.st === 'flee' ? ev.thief : ev.st === 'return' ? ev.vic : ev.st === 'follow' ? ev.mom : ev.kind === 'rob' && ev.robbers ? ev.robbers[0] : ev.npcs && ev.npcs[0];
  (CK.mapHooks = CK.mapHooks || []).push((x, pt, kind, o) => {
    const ev = SE() && SE().ev; if (!ev || !W.town || W.town.room) return; const tg = target(ev); if (!tg) return;
    let m = pt(tg.x, tg.z);
    if (kind === 'mini') { const c = o.s / 2, dx = m[0] - c, dy = m[1] - c, d = Math.hypot(dx, dy), lim = c - 6; if (d > lim) m = [c + dx / d * lim, c + dy / d * lim]; }
    x.fillStyle = '#FF3A3A'; x.strokeStyle = '#FFFFFF'; x.lineWidth = 1.5; x.beginPath(); x.arc(m[0], m[1], kind === 'big' ? 6 : 4, 0, 7); x.fill(); x.stroke();
  });
  // ---------- 競選海報 ----------
  const posters = (tw, B) => {
    if (!R.electionBoard || !R.electionSheet) return;
    const D = B.D, rnd = B.rnd || Math.random, roads = D.roads.filter(rd => rd.kind !== 'alley' && Math.max(rd.r[2] - rd.r[0], rd.r[3] - rd.r[1]) > 70).sort(() => rnd() - 0.5);
    const segs = []; (tw.walkers || []).forEach(n => { for (let i = 1; i < n.path.length; i++) segs.push([n.path[i - 1], n.path[i]]); });
    const segD = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L)) : 0; return Math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t); };
    const free = (x, z, hx, hz) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const o = { x: x + i * hx, z: z + j * hz }, x0 = o.x, z0 = o.z; R.collide(o, 0.3); if (Math.hypot(o.x - x0, o.z - z0) > 0.02) return false; } return !tw.inter.some(it => Math.hypot(it.x - x, it.z - z) < 5) && !segs.some(([a, b]) => segD(x, z, a, b) < 1.4) && !D.roads.some(rd => x > rd.r[0] - 0.5 && x < rd.r[2] + 0.5 && z > rd.r[1] - 0.5 && z < rd.r[3] + 0.5); };
    let n = 0;
    for (const rd of roads) {
      if (n >= 4) break; const r = rd.r, ax = r[2] - r[0] >= r[3] - r[1], off = rd.sw - 0.45;
      for (let k = 0; k < 8; k++) {
        const t = 0.15 + rnd() * 0.7, sd = rnd() < 0.5 ? -1 : 1;
        const x = ax ? r[0] + (r[2] - r[0]) * t : (sd < 0 ? r[0] - off : r[2] + off), z = ax ? (sd < 0 ? r[1] - off : r[3] + off) : r[1] + (r[3] - r[1]) * t;
        const rot = ax ? (sd < 0 ? 0 : Math.PI) : (sd < 0 ? Math.PI / 2 : -Math.PI / 2), hx = ax ? 1.35 : 0.15, hz = ax ? 0.15 : 1.35;
        if (!free(x, z, hx, hz)) continue;
        const nb = R.col.list.length, g = R.electionBoard(tw.group, x, z, rot); R.col.list.slice(nb).forEach(b => { b.on = false; });   // posters.js 的碰撞是 2.6 公尺見方，換成板子本身的大小
        g.position.y = CK.heightAt(x, z); R.addBox(x - hx, x + hx, z - hz, z + hz, 'deco');
        tw.inter.push({ x: x + (ax ? 0 : -sd * 1.2), z: z + (ax ? -sd * 1.2 : 0), r: 1.8, label: '看競選海報', act: R.electionSheet });
        n++; break;
      }
    }
  };
  // ---------- 進城 ----------
  const sl0 = CK.spawnLife;
  CK.spawnLife = B => { sl0(B); const tw = W.town; if (!tw || !tw.ck || tw.room) return; try { if (R.streetEventReset) R.streetEventReset(); posters(tw, B); } catch (e) { console.warn('[ckextra]', e); } };
  const er0 = CK.enterRoom;
  CK.enterRoom = (id, door) => { const se = SE(); if (se && se.ev && W.town && !W.town.room) se.end(); return er0(id, door); };
  // ---------- 每一格 ----------
  const ts0 = R.townStep;
  R.townStep = dt => {
    ts0(dt); const tw = W.town; if (!tw || !tw.ck || tw.room || !W.P || W.paused) return;
    try {
      if (R.streetEventTick) R.streetEventTick(dt);
      const ev = SE() && SE().ev; if (ev) (ev.npcs || []).forEach(n => { if (n.h) n.h.g.position.y = CK.heightAt(n.x, n.z); });   // streetevents.js 放在 y＝0
    } catch (e) { console.warn('[ckextra]', e); }
  };
  // ---------- 快速移動 ----------
  const lbl = it => { try { return typeof it.label === 'string' ? it.label : ''; } catch (e) { return ''; } };
  const spots = () => {
    const tw = W.town, city = tw.city, out = [], seen = {};
    if (city.plaza) out.push({ n: city.plazaName || '站前廣場', x: city.plaza[0], z: city.plaza[1] });
    tw.inter.forEach(it => { const l = lbl(it); if (!/^走進/.test(l)) return; const n = l.replace(/^走進/, '').replace(/[（(].*$/, ''); if (seen[n]) return; seen[n] = 1; out.push({ n, x: it.x, z: it.z }); });
    return out;
  };
  const go = sp => {
    const P = W.P; if (!P) return; R.closeSheet && R.closeSheet();
    if (W.town.room) { CK.exitRoom(); let n = 0; const t = setInterval(() => { if (W.town && !W.town.room) { clearInterval(t); go(sp); } else if (++n > 40) clearInterval(t); }, 100); return; }
    (R.fade || (f => f()))(() => {
      P.x = sp.x; P.z = sp.z; R.collide(P, 0.42); P.yv = CK.heightAt(P.x, P.z); if (P.h) P.h.g.position.set(P.x, P.yv, P.z);
      R.placeCam && R.placeCam(null); R.banner && R.banner(sp.n, '搭公會的接駁車過來了');
    });
  };
  const ft0 = R.fastTravel, sp0 = R.ftSpots, go0 = R.ftGo;
  R.ftSpots = () => (ck() ? spots() : sp0 ? sp0() : []);
  R.ftGo = sp => (ck() ? go(sp) : go0 && go0(sp));
  R.fastTravel = () => {
    if (!ck()) return ft0 && ft0();
    if (W.run) return;
    if (W.town.room) { CK.exitRoom(); let n = 0; const t = setInterval(() => { if (W.town && !W.town.room) { clearInterval(t); R.fastTravel(); } else if (++n > 40) clearInterval(t); }, 100); return; }
    if (R.VEH && R.VEH.cur) { R.toast('先下車。'); return; }
    if (R.crime && R.crime.heat > 0) { R.toast('被通緝的時候，接駁車不載你。', '#FF9A6A'); return; }
    const list = spots();
    R.sheet('<p class="kicker">' + esc(W.town.city.name) + '・公會的接駁車</p><h2>快速移動</h2><p class="note">免費。登記過的勇者都能搭。（在城裡按 T 也能叫車）</p><div class="ft-grid">'
      + list.map((s, i) => '<button type="button" class="btn' + (i ? '' : ' pri') + '" data-ft="' + i + '">' + esc(s.n) + '</button>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn" id="ft-x">不搭了</button></div>');
    $('ft-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-ft]').forEach(b => { b.onclick = () => go(list[+b.dataset.ft]); });
  };
  // 暫停選單（citykit2.js 的 menu 用 R.sheet 開）：多一顆「快速移動（T）」
  const sh0 = R.sheet;
  R.sheet = (...a) => {
    const r = sh0(...a);
    if (ck() && !W.town.room && $('ck-x') && $('ck-map') && !$('ck-ft')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'ck-ft'; b.textContent = '快速移動（T）'; b.onclick = () => { R.closeSheet(); setTimeout(R.fastTravel, 50); }; $('ck-map').insertAdjacentElement('afterend', b); }
    return r;
  };
})(window.R);
