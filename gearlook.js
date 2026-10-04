// 裝備外觀的開關（作者 2026-10-05：新增可以開關裝備顯示外觀）
// - 帽子、上衣、褲子、鞋子各自可以「不顯示」：數值照樣算（R.equipped 不動），只是身上畫成捏角時選的樣子。
// - 存在 R.S.gearHide＝{ head, body, legs, feet }（true＝不顯示）。
// - 暫停選單、城裡的選單多一顆「裝備外觀」，點開一格一格切換；馬上換上新的樣子。
// - 多人連線時別人看到的也照這個（net.js 送出去的名片）。
// 放在 sprites.js、cape.js、people.js（R.restyleSelf）、net.js 後面。
(function (R) {
  const W = R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const SLOTS = (R.SLOTS || [{ id: 'head', name: '帽子' }, { id: 'body', name: '上衣' }, { id: 'legs', name: '褲子' }, { id: 'feet', name: '鞋子' }]);
  const hidden = k => { const s = S(); return !!(s && s.gearHide && s.gearHide[k]); };
  R.gearHidden = hidden;
  // 畫在身上的裝備：拿掉設定成不顯示的那幾格
  const shown = eq => { if (!eq || !S() || !S().gearHide) return eq; const o = Object.assign({}, eq); SLOTS.forEach(sl => { if (hidden(sl.id)) delete o[sl.id]; }); return o; };
  R.gearShown = shown;

  const mp0 = R.makePlayerHero;
  R.makePlayerHero = (cls, base, eq) => { const h = mp0(cls, base, shown(eq)); h._self = true; return h; };
  const dr0 = R.dressHero;
  R.dressHero = (h, eq) => dr0(h, h && (h._self || (W.P && h === W.P.h)) ? shown(eq) : eq);
  // 多人連線的名片：net.js 送出去之前問 R.gearHidden
  const eqd = cls => (R.equipped ? R.equipped(cls) : {});

  const redress = () => { const P = W.P, s = S(); if (!P || !P.h || !s || !eqd) return; R.dressHero(P.h, eqd(s.cls)); if (W.run && R.hudFloor) try { R.hudFloor(); } catch (e) { } };   // hudFloor：左下角的頭像跟著重畫
  R.toggleGearLook = k => {
    const s = S(); if (!s) return; s.gearHide = s.gearHide || {}; s.gearHide[k] = !s.gearHide[k]; R.save(); redress();
    const sl = SLOTS.find(x => x.id === k); R.toast((sl ? sl.name : k) + (s.gearHide[k] ? '：不顯示裝備的樣子' : '：顯示裝備的樣子'));
  };
  const sheet = back => {
    const s = S(); if (!s) return; const eq = eqd ? eqd(s.cls) : {};
    const rows = SLOTS.map(sl => {
      const it = eq[sl.id], name = it ? (it.name || (R.ARMOR && R.ARMOR[it.base] && R.ARMOR[it.base].name) || '裝備') : '沒有穿';
      return '<li><b>' + esc(sl.name) + '</b>　<small>' + esc(name) + '</small>　<button type="button" class="mini" data-gl="' + sl.id + '">' + (hidden(sl.id) ? '不顯示（點一下顯示）' : '顯示中（點一下隱藏）') + '</button></li>';
    }).join('');
    R.sheet('<p class="kicker">外觀</p><h2>裝備外觀</h2><p class="note">隱藏的那一格，身上會畫成捏角時選的樣子；裝備的數值照樣算。</p><ul class="loot">' + rows + '</ul>',
      '<div class="row"><button type="button" class="btn" id="gl-all">全部' + (SLOTS.every(sl => hidden(sl.id)) ? '顯示' : '隱藏') + '</button><button type="button" class="btn pri" id="gl-back">回去</button></div>');
    document.querySelectorAll('[data-gl]').forEach(b => { b.onclick = () => { R.toggleGearLook(b.dataset.gl); sheet(back); }; });
    $('gl-all').onclick = () => { const s2 = S(), on = !SLOTS.every(sl => hidden(sl.id)); s2.gearHide = {}; SLOTS.forEach(sl => { s2.gearHide[sl.id] = on; }); R.save(); redress(); R.toast(on ? '裝備的樣子全部不顯示' : '裝備的樣子全部顯示'); sheet(back); };
    $('gl-back').onclick = () => back();
  };
  R.gearLookSheet = sheet;
  const addBtn = again => {
    const row = $('r-sheet') && $('r-sheet').querySelector('.row'); if (!row || row.querySelector('#gl-tg') || !S()) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'gl-tg'; b.textContent = '裝備外觀';
    b.onclick = () => sheet(again); row.appendChild(b);
  };
  const ps = R.pauseSheet; if (ps) R.pauseSheet = (...a) => { const r = ps(...a); addBtn(() => R.pauseSheet()); return r; };
  const tm = R.townMenu; if (tm) R.townMenu = (...a) => { const r = tm(...a); addBtn(() => R.townMenu()); return r; };
})(window.R);
