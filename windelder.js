// 新的領主體：緋面風翁（作者 2026-10-03：照天狗的特徵做，名字原創）
// - 赤紅的臉、長鼻子、背後一對黑翼、手上一把羽扇；飛在半空，保持距離。
// - 四套招式（血越少出招越密）：羽扇暴風（扇形，把人吹開）、隱身（消失後在你背後現身、補一刀）、
//   喚鴉（叫三羽鴉來）、旋風（三團會追人的風）。
// - 浮島型的克森特級遺跡最常見（R.TYPES.island.lord），其他克森特級遺跡也會出現。
// 這個檔案要在 lords.js 後面、deeper.js 前面載入（deeper.js 會把所有「領主體・」一起加強）。
(function (R) {
  const W = () => R.W, rnd = Math.random, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const ID = 'windelder';
  R.ENEMIES[ID] = { name: '領主體・緋面風翁', ref: '', boss: 1, hp: 740, dmg: 23, speed: 4.2, xp: 90, size: 2.2, ai: 'l_wind', fly: 1, armor: 0.15, color: '#C8302A', eye: '#FFE04A',
    desc: '浮島型的克森特級遺跡最常見的領主體。赤紅的臉、長長的鼻子，背後一對黑翼。手上的羽扇一搧就是一陣暴風；會突然消失、從你背後出現，還會叫三羽鴉來幫忙。' };

  // ---------- 點陣圖（朝右畫；兩格） ----------
  const grid = (w, h) => {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    const o = {
      p(x, y, c) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c; },
      rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) o.p(x + i, y + j, c); },
      line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) o.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
      ell(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.05) o.p(x, y, c); },
      rows: () => g.map(r => r.join(''))
    };
    return o;
  };
  const draw = (G, fr) => {
    // 黑翼（後面）：拍上、拍下兩格
    const wy = fr ? -3 : 0;
    G.ell(9, 10 + wy, 8, 5, 'k'); G.ell(8, 9 + wy, 6, 3, 'K'); for (let i = 0; i < 5; i++) G.line(2 + i * 2, 13 + wy, 1 + i * 2, 17 + wy + (i % 2), 'k');
    // 身體：白色的修行衣、金色的結袈裟
    G.rect(13, 12, 9, 11, 'w'); G.rect(13, 12, 2, 11, 'W'); G.p(17, 13, 'y'); G.p(17, 15, 'y'); G.p(19, 14, 'y'); G.p(18, 17, 'y');
    G.rect(13, 22, 3, 6, 'W'); G.rect(19, 22, 3, 6, 'W'); G.rect(13, 28, 3, 1, 'g'); G.rect(19, 28, 3, 1, 'g');   // 一本齒的木屐
    // 頭：紅臉、長鼻、黑色的小帽、白眉
    G.ell(18, 7, 4.5, 4.5, 'r'); G.ell(17, 8, 3, 3, 'R'); G.rect(16, 1, 4, 2, 'k'); G.p(18, 0, 'k');
    G.line(21, 7, 28, 6, 'r'); G.line(21, 8, 27, 7, 'R');   // 長鼻子
    G.p(20, 5, 'w'); G.p(21, 5, 'w'); G.p(20, 6, 'e'); G.line(16, 11, 21, 11, 'w');   // 眉、眼、鬍子
    // 羽扇
    const fx = 24, fy = fr ? 14 : 16; G.line(21, 16, fx, fy, 'g'); G.ell(fx + 3, fy - 2, 3, 4, 'f'); G.line(fx + 1, fy - 1, fx + 5, fy - 5, 'F'); G.line(fx + 1, fy, fx + 6, fy - 2, 'F');
  };
  const fr = [0, 1].map(f => { const G = grid(32, 30); draw(G, f); return G.rows(); });
  if (R.BEAST_ART) R.BEAST_ART[ID] = { pal: { k: '#1A1A22', K: '#34343E', w: '#E8E4DC', W: '#C8C2B6', y: '#E8C04A', r: '#C8302A', R: '#8A1E1A', e: '#FFE04A', g: '#5A3E26', f: '#6A8A4A', F: '#A8C878' }, a: fr[0], b: fr[1] };

  // ---------- 招式 ----------
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const targets = () => { const w = W(); return [w.P].concat((w.allies || []).filter(a => !a.downed), R.netTargets ? R.netTargets() : []).filter(t => t && !t.dead); };   // 多人連線：房主這邊也算別人（net2.js）
  const hitT = (t, dmg, e, o) => (t.ally ? R.hurtAlly(t, dmg, e) : R.hurtPlayer(dmg, e, o));
  const floor = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  const hurt = e => 1 - e.hp / e.hpMax;
  const push = (t, a, dist) => { const w = W(), run = w.run; let left = dist / 14; w.dyn.push(dt => { if (w.run !== run || t.dead) return false; left -= dt; if (left <= 0) return false; t.x += Math.sin(a) * 14 * dt; t.z += Math.cos(a) * 14 * dt; R.collide(t, 0.42); return true; }); };
  // 扇形：先畫範圍，t 秒後打下去
  const cone = (e, a, arc, range, t, k, col, after) => {
    R.fx('sector', e.x, 0, e.z, { a, arc, range, t });
    later(() => {
      if (e.dead) return; R.fx('swing', e.x, 0, e.z, { a, arc, range, color: col });
      targets().forEach(tg => { const dd = Math.hypot(tg.x - e.x, tg.z - e.z), aa = Math.atan2(tg.x - e.x, tg.z - e.z); if (dd < range && Math.abs(wrap(aa - a)) < arc / 2 && !(tg.iframe > 0)) { hitT(tg, e.dmg * k, e, { knock: 0.4 }); if (after) after(tg, aa); } });
    }, t * 1000);
  };
  const MOVES = [
    // 羽扇暴風：大扇形，打中的人被吹飛
    (e, P, d, a) => { e.busy = 1.2; cone(e, a, 1.9, 9, 0.85, 1.1, '#DCEED0', (tg, aa) => push(tg, aa, 5)); R.fx('poof', e.x, 1.2, e.z, { color: '#DCEED0', n: 14 }); },
    // 隱身：消失、背後先出現記號、現身補一刀
    (e, P) => {
      e.busy = 2.0; e.invuln = true; e.m.g.visible = false; R.fx('poof', e.x, 1, e.z, { color: '#1A1A22', n: 22 });
      later(() => {
        const Pl = W().P; if (!Pl || e.dead) return; const aa = Math.atan2(Pl.x - e.x, Pl.z - e.z), [x, z] = floor(Pl.x + Math.sin(aa) * 2.6, Pl.z + Math.cos(aa) * 2.6);
        R.fx('mark', x, 0, z, { r: 1.6, t: 0.55 });
        later(() => {
          if (e.dead) return; e.x = x; e.z = z; e.m.g.position.x = x; e.m.g.position.z = z; e.m.g.visible = true; e.invuln = false; R.fx('blink', x, 1, z);
          const P2 = W().P; cone(e, Math.atan2(P2.x - e.x, P2.z - e.z), 1.5, 3.6, 0.35, 1.3, '#FF6A5A');
        }, 550);
      }, 800);
    },
    // 喚鴉
    e => { for (let i = 0; i < 3; i++) { const [x, z] = floor(e.x + rnd() * 5 - 2.5, e.z + rnd() * 5 - 2.5); R.fx('blink', x, 1, z); R.spawnEnemy('karasu', x, z, e.room, { aggro: true, hpMul: 0.6 }); } R.toast('羽扇一指，三羽鴉從暗處飛了出來'); },
    // 旋風：三團會追人的風
    e => {
      const w = W(), run = w.run;
      for (let i = 0; i < 3; i++) {
        const [x, z] = floor(e.x + rnd() * 6 - 3, e.z + rnd() * 6 - 3), zn = R.addZone({ kind: 'caltrop', x, z, r: 1.3, life: 6, dmg: e.dmg * 0.3 }); if (!zn) continue;
        if (zn.mesh) zn.mesh.material.color.set('#DCEED0'); const sp = 2 + rnd() * 0.8;
        w.dyn.push(dt => { if (w.run !== run || zn.dead) return false; const Pl = w.P, aa = Math.atan2(Pl.x - zn.x, Pl.z - zn.z); zn.x += Math.sin(aa) * sp * dt; zn.z += Math.cos(aa) * sp * dt; if (zn.mesh) zn.mesh.position.set(zn.x, 0.06, zn.z); return true; });
      }
      R.toast('羽扇捲起了會追人的旋風');
    }
  ];
  const AI = R.AI_X = R.AI_X || {};
  AI.l_wind = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.busy > 0) { e.busy -= dt; return false; }
    let mv = false;
    const want = d < 4 ? a + Math.PI : d > 9 ? a : null; if (want != null && walk && sp > 0) { H.move(e, want, sp, dt); mv = true; }
    e.bite = (e.bite || 0) - dt; if (d < 2.8 && e.bite <= 0) { e.bite = 1.2; H.hurtT(P, e.dmg, e, { knock: 0.5 }); R.fx('swing', e.x, 0, e.z, { a, arc: 1.6, range: 2.8, color: '#DCEED0' }); }
    e.pat = (e.pat == null ? 1.5 : e.pat) - dt;
    if (e.pat <= 0) { e.pat = 3.3 - hurt(e) * 3.3 * 0.45 + rnd(); MOVES[Math.floor(rnd() * MOVES.length)](e, P, d, a); }
    return mv;
  };

  // ---------- 出現在哪裡 ----------
  if (R.TYPES.island && !R.TYPES.island.lord) R.TYPES.island.lord = ID;
  const gf = R.genFloor;
  R.genFloor = (run, f) => { const F = gf(run, f), g = run.grade; if (g.lords && !g.lords.includes(ID)) g.lords.push(ID); return F; };   // lords.js 每一層會重排名單，所以每一層都加回去
  const kes = R.GRADES.find(g => g.id === 'kesent'); if (kes && kes.lords && !kes.lords.includes(ID)) kes.lords.push(ID);
})(window.R);
