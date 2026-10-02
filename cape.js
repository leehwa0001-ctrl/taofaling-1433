// 披風：可以拿掉、可以披回去（作者：披風可以選擇拿掉或不拿掉）
// - 存在 R.S.capeOff。拿掉的時候背後和側面露出衣服（披風的顏色換成衣服的顏色）；戴著兜帽時兜帽斗篷照樣蓋住。
// - 暫停選單、城裡的選單多一顆「拿下披風／披上披風」。
(function (R) {
  const S = () => R.S, $ = id => document.getElementById(id);
  const pl0 = R.playerLook;
  R.playerLook = () => {
    const L = pl0(), s = S(); if (!L || !s || !s.capeOff || L.hood) return L;
    const c = R.CLASSES[s.cls]; L.cloak = L.top || (c && c.look && c.look.top) || '#3E5A6E'; return L;
  };
  R.toggleCape = () => { const s = S(); if (!s) return; s.capeOff = !s.capeOff; R.save(); if (R.restyleSelf) R.restyleSelf(); R.toast(s.capeOff ? '拿下了披風。' : '披上了披風。'); };
  const addBtn = again => {
    const row = $('r-sheet') && $('r-sheet').querySelector('.row'); if (!row || row.querySelector('#cp-tg') || !S()) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'cp-tg'; b.textContent = S().capeOff ? '披上披風' : '拿下披風';
    b.onclick = () => { R.toggleCape(); again(); }; row.appendChild(b);
  };
  const ps = R.pauseSheet; if (ps) R.pauseSheet = (...a) => { const r = ps(...a); addBtn(() => R.pauseSheet()); return r; };
  const tm = R.townMenu; if (tm) R.townMenu = (...a) => { const r = tm(...a); addBtn(() => R.townMenu()); return r; };
})(window.R);
