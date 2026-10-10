// 大招的演出（2026-10-10 作者：大招除了字條以外也要像大招一點，設計得像真正的大招一樣）
// 原本：畫面閃一下、中間打出大字、腳下一圈光、鏡頭震。現在一招大招分三段：
// 1. 蓄力（真實 0.5 秒）：時間慢到兩成多，畫面四周暗下來、只剩你那裡亮；職業顏色的光點從四周收進你身上，
//    腳下轉著一圈法陣（雙圈＋六芒星），身上一直發光；這段時間不會受傷。
// 2. 爆發：原本的閃光、大字、震動照舊，再加從你身上擴散出去的衝擊波（光環＋粒子環＋塵土）、一聲轟響，然後放出招式本身。
//    招式本身照大招的名字、說明套上元素特效（fx1010.js：七曜隕星有火光拖尾、聖域降臨是聖光……）。
// 3. 大招期間（P.ulting）：身上一直冒職業顏色的光，腳下每 0.4 秒一圈光。
// 效能：全部用 fx1010.js 的粒子、光帶（一次畫完），只多一層 CSS 的暗角；沒有新的燈光、不換材質。
// 放在 ult.js、monk.js、classes2b.js、ultpath.js、fx1010.js 後面（最外層的 R.castUlt、R.step）。
(function (R) {
  const W = R.W, FX = R.fx1010; if (!FX || !R.castUlt) return;
  const rnd = Math.random, TAU = Math.PI * 2;
  const SLOW = 0.22, INTRO = 0.5;
  const colOf = cls => (R.CLASS_GLOW && R.CLASS_GLOW[cls]) || (R.CLASSES[cls] && R.CLASSES[cls].color) || '#E8C04A';
  const ULT_EL = { gunner: null, warrior: 'earth', mage: 'fire', priest: 'holy', blade: 'wind', knight: 'holy', monk: 'earth', bard: 'sound', summoner: 'shadow', arraymage: 'thunder', enchanter: null, scroll: null, archer: null };
  // ---------- 畫面四周暗下來 ----------
  let dim = null;
  const dimOn = P => {
    if (!dim) { dim = document.createElement('div'); dim.className = 'ux-dim'; document.body.appendChild(dim); }
    try { const v = new THREE.Vector3(P.x, 1, P.z).project(W.camera); dim.style.setProperty('--x', ((v.x + 1) / 2 * 100).toFixed(1) + '%'); dim.style.setProperty('--y', ((1 - v.y) / 2 * 100).toFixed(1) + '%'); } catch (e) { }
    dim.classList.add('on');
  };
  const dimOff = () => { if (dim) dim.classList.remove('on'); };
  // ---------- 圈、法陣（光帶：每一格重新畫一次，壽命一格） ----------
  const circle = (x, z, r, segs, y, w, col, life, rot) => { const p = []; for (let i = 0; i <= segs; i++) { const a = (rot || 0) + i / segs * TAU; p.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]); } FX.ribbon(p, w, col, life, { a: 0.95 }); };
  const star = (x, z, r, y, w, col, life, rot) => { const p = []; for (let i = 0; i <= 6; i++) { const a = rot + i * 2 * TAU / 6 * 1; p.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]); } FX.ribbon(p.slice(0, 4), w, col, life, {}); const q = []; for (let i = 0; i <= 3; i++) { const a = rot + TAU / 6 + i * TAU / 3; q.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]); } FX.ribbon(q, w, col, life, {}); };
  // ---------- 蓄力 ----------
  let intro = null;
  const introTick = dt => {
    const it = intro, P = it.P; it.t += dt; const k = Math.min(1, it.t / INTRO), gl = dt * SLOW * 1.6, [A, N] = FX.sys();
    if (P.dead || !W.run || W.run !== it.run) { intro = null; dimOff(); return; }
    P.iframe = Math.max(P.iframe || 0, 0.6);
    // 法陣：雙圈＋六芒星，轉著、越來越亮
    const rot = it.t * 5, r0 = 1.5 + k * 0.5;
    circle(P.x, P.z, r0, 28, 0.12, 0.16, it.col, gl, rot); circle(P.x, P.z, r0 * 0.72, 22, 0.12, 0.1, '#FFFFFF', gl, -rot); star(P.x, P.z, r0 * 0.72, 0.13, 0.08, it.col, gl, rot * 0.6);
    // 光點從四周收進來（遊戲時間變慢了：速度、壽命照慢的時間算）
    const life = 0.28 * SLOW;
    for (let i = 0; i < 5; i++) { const a = rnd() * TAU, d = 3 + rnd() * 2.5, y = 0.3 + rnd() * 2; FX.emit(A, P.x + Math.cos(a) * d, y, P.z + Math.sin(a) * d, -Math.cos(a) * d / life, (1.1 - y) / life, -Math.sin(a) * d / life, life, rnd() < 0.3 ? '#FFFFFF' : it.col, { size: 3, size1: 2 }); }
    // 身上發光
    FX.emit(A, P.x, 1.1, P.z, 0, 0, 0, dt * SLOW * 2, it.col, { size: 14 + k * 16, size1: 14 + k * 16, a: 0.55 + k * 0.4 });
    if (it.t >= INTRO) { intro = null; dimOff(); release(it); }
  };
  // ---------- 爆發 ----------
  const release = it => {
    const P = it.P, u = R.ULTS && (R.ULTS[P.cls] || R.ULTS.warrior), name = u ? String(u.name || '') : '', sub = u ? String(u.sub || '') : '';
    const el = FX.elemOf({ name, desc: sub }) || ULT_EL[P.cls] || null;
    const pick = R.S && R.S.ultPick && R.S.ultPick[P.cls], adv = P.adv && pick !== 'base' && R.FXQ && R.FXQ.ROUTE && R.FXQ.ROUTE[P.adv] ? P.adv : null;
    const ctx = { el: el === 'multi' ? null : el, col: it.col, fall: /隕|流星|落下|砸|天降|墜|箭雨/.test(name + sub), adv, motifAfter: W.run ? W.run.t + 0.12 : 0 };   // adv：轉職路線的大招在落地／擊中的那一下跳出路線徽記（鬼武者的鬼面……）
    FX.runCtx(ctx, () => it.cast());   // 原本的 R.castUlt：閃光、大字、震動、招式本身
    const [A, N] = FX.sys(), x = P.x, z = P.z;
    FX.emit(A, x, 1, z, 0, 0, 0, 0.14, '#FFFFFF', { size: 60, size1: 90, a: 0.9 });
    FX.ring(A, x, 0.5, z, 56, 15, 0.5, it.col, { size: 4, size1: 1 });
    FX.ring(A, x, 0.8, z, 40, 9, 0.55, '#FFFFFF', { size: 3, size1: 1 });
    FX.ring(N, x, 0.3, z, 30, 6.5, 0.8, '#A89880', { size: 7, size1: 15, a: 0.5, drag: 1.4 });
    for (let i = 0; i < 18; i++) FX.emit(A, x + (rnd() - 0.5) * 1.2, 0.3, z + (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 2, 7 + rnd() * 7, (rnd() - 0.5) * 2, 0.6, rnd() < 0.5 ? it.col : '#FFFFFF', { size: 4, size1: 1, grav: 6 });
    // 擴散出去的光環（0.4 秒）
    const run = W.run; let t = 0;
    if (W.dyn) W.dyn.push(dt => { if (W.run !== run) return false; t += dt; const k = Math.min(1, t / 0.4); circle(x, z, 1 + k * 13, 40, 0.3, 0.6 * (1 - k) + 0.1, it.col, dt * 1.6, 0); circle(x, z, 0.6 + k * 9, 32, 0.4, 0.25 * (1 - k) + 0.05, '#FFFFFF', dt * 1.6, 0.3); return k < 1; });
    if (R.shake) R.shake(1);
    if (R.sfx) { R.sfx('boom'); setTimeout(() => R.sfx && R.sfx('thunder'), 90); }
  };
  // ---------- 接上 ----------
  const cu0 = R.castUlt;
  R.castUlt = () => {
    const P = W.P, run = W.run;
    if (intro) return;
    if (!P || !run || run.done || P.dead || (R.sheetOpen && R.sheetOpen()) || (P.ult || 0) < 100 || !FX.ensure()) return cu0();
    intro = { t: 0, P, run, col: colOf(P.cls), cast: () => cu0() };
    dimOn(P); if (R.sfx) R.sfx('levelup');
    FX.ring(FX.sys()[0], P.x, 0.2, P.z, 24, 2.5, 0.4 * SLOW * 2, intro.col, { size: 3, size1: 1 });
  };
  const st0 = R.step;
  let auraT = 0;
  R.step = dt => {
    if (intro) { try { introTick(dt); } catch (e) { intro = null; dimOff(); } return st0(dt * SLOW); }
    const r = st0(dt);
    try {
      const P = W.P; if (P && P.ulting && W.run && FX.ensure()) {
        const [A] = FX.sys(), c = colOf(P.cls);
        for (let i = 0; i < 2; i++) { const a = rnd() * TAU, d = 0.3 + rnd() * 0.5; FX.emit(A, P.x + Math.cos(a) * d, 0.2 + rnd() * 1.2, P.z + Math.sin(a) * d, 0, 1.5 + rnd() * 1.5, 0, 0.5, rnd() < 0.3 ? '#FFFFFF' : c, { size: 3, size1: 1 }); }
        auraT -= dt; if (auraT <= 0) { auraT = 0.4; circle(P.x, P.z, 1.1, 22, 0.1, 0.1, c, 0.3, rnd() * TAU); }
      }
    } catch (e) { }
    return r;
  };
  const css = document.createElement('style');
  css.textContent = '.ux-dim{position:fixed;inset:0;z-index:68;pointer-events:none;background:radial-gradient(circle at var(--x,50%) var(--y,50%),transparent 0,transparent 9%,rgba(6,4,10,.55) 26%,rgba(6,4,10,.82) 60%);opacity:0;transition:opacity .12s ease-out}.ux-dim.on{opacity:1;transition:opacity .08s}';
  document.head.appendChild(css);
  R.ultFx = { intro: () => intro };
})(window.R);
