// 鏡頭的透視（2026-10-04 作者：像《潛水員戴夫》那樣，鏡頭有一點透視）
// 暫停選單、城裡的選單多一顆「鏡頭」：原本的正交 → 一點透視 → 普通 → 明顯，輪流換。數字是鏡頭的視角（pixel.js 的 R.PIX_FOV）。
// 放在 keybinds.js 後面。
(function (R) {
  const $ = id => document.getElementById(id);
  const L = [[0, '不透視（原本的）'], [18, '一點點透視'], [26, '有一點透視'], [36, '透視明顯']];
  const name = () => { const f = R.PIX_FOV(), it = L.find(v => v[0] === f); return it ? it[1] : f + ' 度'; };
  const addBtn = again => {
    const row = $('r-sheet') && $('r-sheet').querySelector('.row'); if (!row || row.querySelector('#fov-open')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'fov-open'; b.textContent = '鏡頭：' + name();
    b.onclick = () => {
      const f = R.PIX_FOV(), i = L.findIndex(v => v[0] === f), nx = L[(i + 1) % L.length];
      R.S.opts = R.S.opts || {}; R.S.opts.fov = nx[0]; R.save && R.save();
      if (R.W.cam && R.placeCam) R.placeCam(null);
      b.textContent = '鏡頭：' + nx[1];
    };
    row.appendChild(b);
  };
  const ps = R.pauseSheet; if (ps) R.pauseSheet = (...a) => { const r = ps(...a); addBtn(); return r; };
  const tm = R.townMenu; if (tm) R.townMenu = (...a) => { const r = tm(...a); addBtn(); return r; };
})(window.R);
