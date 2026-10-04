// 炸彈（2026-10-04 作者：可以新增炸彈，可以帶下去炸遺跡，可以讓佩特拉核心的注意度高速上升）
// 2026-10-04 作者：遺跡用炸藥可以更狠一點，分好幾種——低級炸藥、高級炸藥、爆裂核心（範圍跟傷害依照等級提升），
//   爆裂核心必定觸發佩特拉核心反應（直接讓注意等於 100，裝備詞條降不了）；下方的 HUD 也要顯示炸彈的數量（原本要二十幾顆才引得起反應）。
// - 三種（公會的商店買；2026-10-04 作者：購買上限刪掉——原本最多 5／3／1 顆，爆裂核心只能帶一顆蠻沒用的，現在要帶幾顆都可以）：
//   低級炸藥：120 費拉、最多 5 顆、範圍 3.5 公尺、威力約你普攻的 6 倍、佩特拉的注意 +35、太近自己掉一成五生命；
//   高級炸藥：600 費拉、最多 3 顆、範圍 5 公尺、威力約普攻的 15 倍、注意 +60、太近掉三成；
//   爆裂核心：2000 費拉＋魔力核心 1 顆、最多 1 顆、範圍 5.5＋等級／20 公尺、威力約普攻的 40 倍（再照等級加）、
//            佩特拉的注意直接到 100（「靜默」之類的詞條降不了）——一定會引起反應；太近掉五成。
// - 遺跡裡按 G（按鍵設定「丟炸彈」可以改）丟出選中的那一種到準心處，地上先出現紅圈，1.2 秒後爆炸：遺跡生物重傷、被炸飛；罈子、木箱、碎石、肉壁全部炸碎。
// - 下方的快捷列多一格「炸彈」：圖示、選中的種類、數量；點一下換種類（Shift＋G 也可以換）。
// - 存檔：R.S.bombs（低級，舊存檔的炸彈都算低級）、R.S.bombsHi、R.S.bombsCore、R.S.bombSel。
// 放在 keybinds.js（加了 bomb 這個動作）、combat.js、skillbook.js、hud2.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id);
  const TYPES = {
    low: { name: '低級炸藥', key: 'bombs', price: 120, max: 5, rad: () => 3.5, mult: 6, base: 1, aware: 35, self: 0.15, color: '#FF7A3A', desc: '清障用的一般炸藥。' },
    high: { name: '高級炸藥', key: 'bombsHi', price: 600, max: 3, rad: () => 5, mult: 15, base: 2.5, aware: 60, self: 0.3, color: '#FF3A3A', desc: '軍用的高爆炸藥，範圍大、威力大。' },
    core: { name: '爆裂核心', key: 'bombsCore', price: 2000, core: 1, max: 1, rad: lv => 5.5 + lv / 20, mult: 40, base: 6, aware: 'max', self: 0.5, color: '#C86AFF', desc: '把魔力核心壓到極限做成的炸彈。威力、範圍照等級變大；一爆，佩特拉一定會察覺。' }
  };
  const IDS = ['low', 'high', 'core'];
  const lvOf = () => { const s = S(); return s && s.classes[s.cls] ? s.classes[s.cls].lv : 1; };
  const cnt = id => (S() && S()[TYPES[id].key]) || 0;
  const sel = () => { const s = S(); let id = (s && s.bombSel) || 'low'; if (!cnt(id)) id = IDS.find(i => cnt(i) > 0) || id; return id; };
  const later = (f, ms) => { const run = W().run; setTimeout(() => { if (W().run === run && run && !run.done) f(); }, ms); };
  const explode = (x, z, id) => {
    const w = W(), run = w.run, P = w.P, T = TYPES[id]; if (!run || !P) return;
    const lv = lvOf(), rad = T.rad(lv), g = run.grade.lv || 1, hit = R.playerHitEstimate ? R.playerHitEstimate() : 0;
    const dmg = Math.max((80 + 60 * g + 6 * (run.floor || 0)) * T.base, hit * T.mult * (id === 'core' ? 1 + lv / 40 : 1));
    R.fx('boom', x, 0.3, z, { r: rad, color: T.color }); R.fx('poof', x, 0.8, z, { color: '#5A4A40', n: id === 'low' ? 24 : 40 }); if (id !== 'low') R.fx('ring', x, 0.1, z, { r: rad + 1, color: T.color });
    R.shake && R.shake(id === 'low' ? 0.7 : id === 'high' ? 1 : 1.4); R.sfx && R.sfx('boom');
    R.aoe(x, z, rad, dmg, { kb: id === 'low' ? 4 : 6, stun: id === 'low' ? 0 : 1 });
    (w.F && w.F.props || []).slice().forEach(p => { if (p.alive && Math.hypot(p.x - x, p.z - z) < rad + 0.6) R.hitProp(p, 99999, true); });
    if (!P.dead && Math.hypot(P.x - x, P.z - z) < rad) { P.iframe = 0; R.hurtPlayer(P.hpMax * T.self, null); R.toast && R.toast('被自己的炸彈波及了！', '#FF9A6A'); }
    if (run.site && run.site.kind === 'ruin' && R.addAware) {
      if (T.aware === 'max') { const c = P.calm; P.calm = 0; try { R.addAware(200, 'bomb'); } finally { P.calm = c; } if (!run.reacting && R.react && run.aware >= 100) R.react(); }   // 裝備詞條降不了
      else R.addAware(T.aware, 'bomb');
    }
  };
  const throwBomb = () => {
    const w = W(), run = w.run, P = w.P, s = S(); if (!run || run.done || w.paused || !P || P.dead || !s) return;
    const id = sel(), T = TYPES[id];
    if (!(cnt(id) > 0)) { R.toast && R.toast('身上沒有炸彈了（公會的商店買得到）。'); return; }
    s[T.key]--; R.save();
    const [x, z] = R.SKILL_KIT && R.SKILL_KIT.aimIn ? R.SKILL_KIT.aimIn(P, 9) : [P.x, P.z];
    R.fx('mark', x, 0, z, { r: T.rad(lvOf()), t: 1.2, color: '#FF5A3A' }); R.fx('poof', P.x, 1.2, P.z, { color: '#C8B898', n: 6 });
    R.sfx && R.sfx('swing');
    if (id === 'core') R.toast && R.toast('爆裂核心——佩特拉一定會察覺。', '#C86AFF');
    later(() => explode(x, z, id), 1200);
  };
  const cycle = () => { const s = S(); if (!s) return; const have = IDS.filter(i => cnt(i) > 0); if (!have.length) { R.toast && R.toast('身上沒有炸彈。'); return; } const i = have.indexOf(sel()); s.bombSel = have[(i + 1) % have.length]; R.toast && R.toast('炸彈：' + TYPES[s.bombSel].name + ' ×' + cnt(s.bombSel), TYPES[s.bombSel].color); };
  R.throwBomb = throwBomb; R.BOMB_TYPES = TYPES;
  window.addEventListener('keydown', e => { if (e.repeat || (e.key || '').toLowerCase() !== 'g' || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return; const run = $('run'); if (!run || run.hidden || !W().run) return; if (e.shiftKey) cycle(); else throwBomb(); });
  // ---------- 下方的快捷列：炸彈一格 ----------
  const iconURL = {};
  const icon = id => { if (iconURL[id]) return iconURL[id]; const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'), P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const body = id === 'core' ? '#5A2A7A' : id === 'high' ? '#5A1A1A' : '#2A2A30', hi = id === 'core' ? '#C86AFF' : id === 'high' ? '#C83A3A' : '#5A5A66';
    P(4, 6, 8, 8, body); P(3, 7, 10, 6, body); P(5, 5, 6, 10, body); P(5, 7, 2, 2, hi); P(9, 3, 2, 3, '#8A7A5A'); P(10, 1, 2, 2, '#FFD04A'); P(12, 0, 1, 1, '#FF7A3A'); if (id === 'core') { P(7, 9, 2, 2, '#FFE8FF'); } if (id === 'high') { P(4, 10, 8, 1, '#C83A3A'); }
    return (iconURL[id] = c.toDataURL()); };
  let hudT = 0;
  const hud = () => {
    const br = $('r-br'), w = W(); if (!br) return; let b = br.querySelector('[data-h2="bomb"]');
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'act dungeon-only h2-only'; b.dataset.h2 = 'bomb'; b.innerHTML = '<img class="h2-ic" alt=""><span>炸彈</span><kbd>' + (R.keyName ? R.keyName('bomb') : 'G') + '</kbd><i class="h2-n"></i>'; b.title = '炸彈：點一下換種類（Shift＋G 也可以），' + (R.keyName ? R.keyName('bomb') : 'G') + ' 丟'; b.onclick = cycle; const mp = br.querySelector('[data-h2="mp"]'); if (mp) mp.after(b); else br.appendChild(b); }
    const id = sel(), n = cnt(id), sp = b.querySelector('span'), ic = b.querySelector('.h2-ic'), nn = b.querySelector('.h2-n');
    if (ic && ic.dataset.k !== id) { ic.src = icon(id); ic.dataset.k = id; }
    if (sp && sp.textContent !== TYPES[id].name) sp.textContent = TYPES[id].name;
    if (nn && nn.textContent !== '×' + n) nn.textContent = '×' + n;
    b.classList.toggle('lit', n > 0); b.classList.toggle('empty', !n);
  };
  const st0 = R.step;
  R.step = dt => { st0(dt); hudT -= dt; if (hudT > 0) return; hudT = 0.4; try { if (W().run && !W().run.done) hud(); } catch (e) { } const el = $('r-bomb'); if (el) el.hidden = true; };
  // ---------- 公會的商店 ----------
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try {
      const tab = document.querySelector('[data-htab][aria-selected="true"]'), body = $('hub-body'), s = S(); if (!body || !tab || tab.dataset.htab !== 'shop' || !s) return;
      const box = document.createElement('div'); box.className = 'bomb-shop';
      box.innerHTML = '<h3>遺跡用炸藥</h3><p class="note">遺跡裡按 ' + (R.keyName ? R.keyName('bomb') : 'G') + ' 丟出選中的那一種（快捷列的「炸彈」那格點一下換種類）。炸得越大，佩特拉越會注意到你；爆裂核心一定會引起反應。帶進去用掉就沒了。</p><div class="recipes">'
        + IDS.map(id => { const T = TYPES[id], n = cnt(id), ok = s.gold >= T.price && (!T.core || (s.mats.core || 0) >= T.core); return '<div class="recipe"><img src="' + icon(id) + '" alt="" style="width:32px;height:32px;image-rendering:pixelated"><b style="color:' + T.color + '">' + T.name + ' ×' + n + '</b><small>' + T.desc + '範圍 ' + T.rad(lvOf()).toFixed(1) + ' 公尺；佩特拉的注意 ' + (T.aware === 'max' ? '直接到 100' : '+' + T.aware) + '。一顆 ' + T.price + ' 費拉' + (T.core ? '＋魔力核心 ' + T.core + ' 顆' : '') + '。</small><div class="row"><button type="button" class="btn pri" data-bomb="' + id + ':1"' + (ok ? '' : ' disabled') + '>買一顆</button>' + '<button type="button" class="btn" data-bomb="' + id + ':5"' + (ok ? '' : ' disabled') + '>買五顆</button>' + '</div></div>'; }).join('') + '</div>';
      body.querySelector('.panel-doc') ? body.querySelector('.panel-doc').appendChild(box) : body.appendChild(box);
      box.querySelectorAll('[data-bomb]').forEach(b => { b.onclick = () => {
        const [id, m] = b.dataset.bomb.split(':'), T = TYPES[id]; let k = +m || 1;
        k = Math.min(k, Math.floor(s.gold / T.price), T.core ? Math.floor((s.mats.core || 0) / T.core) : 99); if (k <= 0) return;
        s.gold -= k * T.price; if (T.core) s.mats.core -= k * T.core; s[T.key] = cnt(id) + k; s.bombSel = id; R.save(); R.sfx && R.sfx('coin'); R.hub(t, f);
      }; });
    } catch (e) { console.warn('[bomb]', e); }
  };
})(window.R);
