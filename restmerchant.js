// 安全區的流浪商人（2026-10-04 作者：沒過幾層的安全區，可能會有流浪商人可以賣東西給他，或者有非常小的村落可以賣東西）
// - 有存檔點（公會的記錄碑，savepoint.js）的那一層，入口房間多一個流浪商人，那一間是安全區。
// - 賣：背包裡的裝備（賣價的八成）、素材（每個賣價的八成）——下得深的時候不用一直揹著滿背包。
//   買：回復藥、魔力藥（比城裡貴一半）。
// - 觀光遺跡、狩獵場沒有。
// 放在 savepoint.js、raid.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const K = 0.8, HP = 45, MP = 38;
  const ok = run => run && run.site && run.site.kind === 'ruin' && run.site.id !== 'kanko';
  const build = () => {
    const w = W(), run = w.run, F = w.F; if (!ok(run) || !F || !F.save || !F.group) return;
    const sx = F.save.x, sz = F.save.z, cand = [[2.4, 0.6], [-2.4, 0.6], [0, 2.6], [2.2, -1.8], [-2.2, -1.8]];
    let x = sx + 2.4, z = sz + 0.6;
    for (const [dx, dz] of cand) { const px = sx + dx, pz = sz + dz; if (!(R.pointBlocked && R.pointBlocked(px, pz)) && (!R.roomIndexAt || R.roomIndexAt(px, pz) >= 0)) { x = px; z = pz; break; } }
    let h = null; try { h = R.makeHero('warrior', null, { lite: 1, weapon: null, shield: false, top: '#5A4A3A', cloak: '#3A4A3A', hair: '#8A7A6A' }); h.g.position.set(x, 0, z); F.group.add(h.g); } catch (e) { h = null; }
    R.addBox(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 'npc');
    F.trader = { x, z, h };
  };
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf0(f, o); try { build(); } catch (e) { console.warn('[restmerchant]', e); } return r; };
  const sheet = () => {
    const w = W(), run = w.run, s = S(); if (!run) return;
    const bag = run.bag || [], mats = Object.keys(run.mats || {}).filter(k => run.mats[k] > 0 && R.MATS[k]);
    const itemP = it => Math.max(1, Math.round(R.sellPrice(it) * K)), matP = k => Math.max(1, Math.round((R.MATS[k].value || 1) * K));
    R.sheet('<p class="kicker">安全區</p><h2>流浪商人</h2><p>記錄碑旁邊，一個背著大木箱的商人坐在石頭上：「深處的東西我也收，只是得打點折——我還要揹出去嘛。」</p>'
      + '<h3>賣裝備（賣價八成）</h3>' + (bag.length ? '<div class="recipes">' + bag.map((it, i) => '<div class="recipe"><b style="color:' + R.rarityColor(it) + '">' + esc(R.itemName(it)) + '</b><small>' + esc((R.itemLines ? R.itemLines(it) : []).slice(0, 3).join('・')) + '</small><button type="button" class="btn" data-tri="' + i + '"' + (it.locked ? ' disabled title="上鎖的不能賣"' : '') + '>賣（' + itemP(it) + ' 費拉）</button></div>').join('') + '</div>' : '<p class="note">背包裡沒有裝備。</p>')
      + '<h3>賣素材（每個賣價八成）</h3>' + (mats.length ? '<div class="sellmats">' + mats.map(k => '<div class="sellmat"><span>' + esc(R.MATS[k].name) + ' ×' + run.mats[k] + '（每個 ' + matP(k) + ' 費拉）</span><button type="button" class="mini" data-trm="' + k + ':1">賣 1</button><button type="button" class="mini" data-trm="' + k + ':all">全賣</button></div>').join('') + '</div>' : '<p class="note">沒有素材。</p>')
      + '<h3>買</h3><div class="row"><button type="button" class="btn pri" data-trb="hp"' + (s.gold < HP ? ' disabled' : '') + '>回復藥（' + HP + ' 費拉）</button><button type="button" class="btn pri" data-trb="mp"' + (s.gold < MP ? ' disabled' : '') + '>魔力藥（' + MP + ' 費拉）</button><span class="note">身上有 ' + s.gold + ' 費拉</span></div>',
      '<div class="row"><button type="button" class="btn" id="tr-x">走了</button></div>');
    $('tr-x').onclick = R.closeSheet;
    const again = () => { R.save(); R.sfx && R.sfx('coin'); sheet(); };
    document.querySelectorAll('[data-tri]').forEach(b => { b.onclick = () => { const it = bag[+b.dataset.tri]; if (!it || it.locked) return; s.gold += itemP(it); run.bag.splice(run.bag.indexOf(it), 1); if (R.bagForget) R.bagForget(it); again(); }; });
    document.querySelectorAll('[data-trm]').forEach(b => { b.onclick = () => { const [k, q] = b.dataset.trm.split(':'), n = q === 'all' ? run.mats[k] : Math.min(1, run.mats[k]); if (!n) return; run.mats[k] -= n; if (run.mats[k] <= 0) delete run.mats[k]; s.gold += n * matP(k); again(); }; });
    document.querySelectorAll('[data-trb]').forEach(b => { b.onclick = () => { const k = b.dataset.trb, pr = k === 'hp' ? HP : MP; if (s.gold < pr) return; s.gold -= pr; s.potions[k] = (s.potions[k] || 0) + 1; if (w.P && w.P.potions) w.P.potions[k] = (w.P.potions[k] || 0) + 1; again(); }; });
  };
  const ni0 = R.nearestInteract;
  R.nearestInteract = () => {
    const best = ni0(), P = W().P, F = W().F; if (!P || !F || !F.trader) return best;
    const d = Math.hypot(F.trader.x - P.x, F.trader.z - P.z), bd = best ? Math.hypot(best.x - P.x, best.z - P.z) : 1e9;
    return d < 2.2 && d <= bd + 0.3 ? { x: F.trader.x, z: F.trader.z, r: 2.2, label: '流浪商人：賣東西、買藥', act: sheet } : best;
  };
  const st0 = R.step;
  R.step = dt => { st0(dt); const F = W().F, P = W().P; const t = F && F.trader; if (!t || !t.h || !P) return; if (Math.hypot(P.x - t.x, P.z - t.z) < 6) t.h.g.rotation.y = Math.atan2(P.x - t.x, P.z - t.z); R.animHero && R.animHero(t.h, 0, dt, false); };
})(window.R);
