// 炸彈（2026-10-04 作者：可以新增炸彈，可以帶下去炸遺跡，可以讓佩特拉核心的注意度高速上升）
// - 公會的商店買（一顆 120 費拉，身上最多帶 5 顆；R.S.bombs）。帶進遺跡的就是身上那幾顆，用掉就沒了。
// - 遺跡裡按 G（按鍵設定可以改「丟炸彈」）：丟到準心處（最遠 9 公尺），地上先出現紅圈，1.2 秒後爆炸（3.5 公尺）：
//   遺跡生物重傷、被炸飛；罈子、木箱、水晶、碎石堆、斷尾的肉壁全部炸碎；站太近自己也會受傷（一成五生命）。
//   佩特拉的注意一顆 +25（「敏感」條款、被動的「冷靜」照樣算）——炸多了很快就會引起反應。
// - 左上角顯示身上還有幾顆。
// 放在 keybinds.js（加了 bomb 這個動作）、combat.js、skillbook.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id);
  const PRICE = 120, MAX = 5, RAD = 3.5;
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const explode = (x, z) => {
    const w = W(), run = w.run, P = w.P; if (!run || !P) return;
    R.fx('boom', x, 0.3, z, { r: RAD, color: '#FF7A3A' }); R.fx('poof', x, 0.8, z, { color: '#5A4A40', n: 24 }); R.shake && R.shake(0.7); R.sfx && R.sfx('boom');
    const lv = run.grade.lv || 1, dmg = 80 + 60 * lv + 6 * (run.floor || 0);
    R.aoe(x, z, RAD, dmg, { kb: 4 });
    (w.F && w.F.props || []).slice().forEach(p => { if (p.alive && Math.hypot(p.x - x, p.z - z) < RAD + 0.6) R.hitProp(p, 99999, true); });
    if (!P.dead && Math.hypot(P.x - x, P.z - z) < RAD) { P.iframe = 0; R.hurtPlayer(P.hpMax * 0.15, null); R.toast && R.toast('被自己的炸彈波及了！', '#FF9A6A'); }
    if (run.site && run.site.kind === 'ruin') R.addAware && R.addAware(25, 'bomb');
  };
  const throwBomb = () => {
    const w = W(), run = w.run, P = w.P, s = S(); if (!run || run.done || w.paused || !P || P.dead || !s) return;
    if (!(s.bombs > 0)) { R.toast && R.toast('身上沒有炸彈了（公會的商店買得到）。'); return; }
    s.bombs--; R.save();
    const [x, z] = R.SKILL_KIT && R.SKILL_KIT.aimIn ? R.SKILL_KIT.aimIn(P, 9) : [P.x, P.z];
    R.fx('mark', x, 0, z, { r: RAD, t: 1.2, color: '#FF5A3A' }); R.fx('poof', P.x, 1.2, P.z, { color: '#C8B898', n: 6 });
    R.sfx && R.sfx('swing');
    later(() => explode(x, z), 1200);
  };
  R.throwBomb = throwBomb;
  window.addEventListener('keydown', e => { if (e.repeat || (e.key || '').toLowerCase() !== 'g' || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return; const run = $('run'); if (!run || run.hidden || !W().run) return; throwBomb(); });
  // 左上角：身上幾顆
  const st0 = R.step; let hudT = 0;
  R.step = dt => {
    st0(dt); hudT -= dt; if (hudT > 0) return; hudT = 0.5;
    const w = W(), s = S(); let el = $('r-bomb'); const n = (s && s.bombs) || 0;
    if (!w.run || w.run.done || !n) { if (el) el.hidden = true; return; }
    if (!el) { const tl = $('r-tl'); if (!tl) return; el = document.createElement('div'); el.id = 'r-bomb'; el.className = 'glass dungeon-only r-misc'; tl.appendChild(el); }
    el.hidden = false; el.innerHTML = '炸彈 <b>×' + n + '</b>（' + (R.keyName ? R.keyName('bomb') : 'G') + ' 丟）';
  };
  // 公會的商店：買炸彈
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try {
      const tab = document.querySelector('[data-htab][aria-selected="true"]'), body = $('hub-body'), s = S(); if (!body || !tab || tab.dataset.htab !== 'shop' || !s) return;
      const n = s.bombs || 0, box = document.createElement('div'); box.className = 'bomb-shop';
      box.innerHTML = '<h3>遺跡用炸藥</h3><p class="note">公會賣給勇者清障用的炸藥。遺跡裡按 ' + (R.keyName ? R.keyName('bomb') : 'G') + ' 丟到準心處：遺跡生物重傷、罈子木箱和肉壁都炸得碎——但佩特拉的注意一顆 +25，炸多了很快就會引起反應。身上最多帶 ' + MAX + ' 顆，帶進去用掉就沒了。</p>'
        + '<div class="recipe"><b>炸彈 ×' + n + '／' + MAX + '</b><small>一顆 ' + PRICE + ' 費拉</small><div class="row"><button type="button" class="btn pri" data-bomb="1"' + (n >= MAX || s.gold < PRICE ? ' disabled' : '') + '>買一顆</button><button type="button" class="btn" data-bomb="max"' + (n >= MAX || s.gold < PRICE ? ' disabled' : '') + '>買到滿</button></div></div>';
      body.querySelector('.panel-doc') ? body.querySelector('.panel-doc').appendChild(box) : body.appendChild(box);
      box.querySelectorAll('[data-bomb]').forEach(b => { b.onclick = () => { let k = b.dataset.bomb === 'max' ? MAX - (s.bombs || 0) : 1; k = Math.min(k, Math.floor(s.gold / PRICE), MAX - (s.bombs || 0)); if (k <= 0) return; s.gold -= k * PRICE; s.bombs = (s.bombs || 0) + k; R.save(); R.sfx && R.sfx('coin'); R.hub(t, f); }; });
    } catch (e) { console.warn('[bomb]', e); }
  };
})(window.R);
