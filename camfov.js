// 鏡頭的設定（2026-10-04 作者：透視不能全刪；改為截圖那一種＝第一版的一般透視；視角可以修回原本的和 45 度角）
// 暫停選單、城裡的選單有兩顆：
// - 「透視」：有一點（預設，26 度）→ 明顯（36）→ 不透視（0）→ 一點點（18），輪流換。數字是鏡頭的視角（pixel.js 的 R.PIX_FOV）。
// - 「俯角」：原本（57 度）／45 度。人物、牆的點陣是照俯角畫的，換了要重新整理，所以只在城裡換（遺跡裡換的話這一趟會沒了）。
// 放在 keybinds.js 後面。
(function (R) {
  const $ = id => document.getElementById(id);
  const L = [[26, '有一點'], [36, '明顯'], [0, '不透視'], [18, '一點點']];
  const name = () => { const f = R.PIX_FOV(), it = L.find(v => v[0] === f); return it ? it[1] : f + ' 度'; };
  const pitch45 = () => { try { return localStorage.getItem('tfl-pitch') === '45'; } catch (e) { return false; } };
  const addBtn = () => {
    const row = $('r-sheet') && $('r-sheet').querySelector('.row'); if (!row || row.querySelector('#fov-open')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'fov-open'; b.textContent = '鏡頭透視：' + name();
    b.onclick = () => {
      const f = R.PIX_FOV(), i = L.findIndex(v => v[0] === f), nx = L[(i + 1) % L.length];
      R.S.opts = R.S.opts || {}; R.S.opts.fov = nx[0]; R.save && R.save();
      if (R.W.cam && R.placeCam) R.placeCam(null);
      b.textContent = '鏡頭透視：' + nx[1];
    };
    row.appendChild(b);
    const c = document.createElement('button'); c.type = 'button'; c.className = 'btn'; c.id = 'pitch-open'; c.textContent = '鏡頭俯角：' + (pitch45() ? '45 度' : '原本');
    c.onclick = () => {
      if (R.W.run) { R.toast && R.toast('俯角要回到城裡再換（換了會重新整理畫面）。'); return; }
      if (!confirm('換成「' + (pitch45() ? '原本的俯角' : '45 度') + '」？畫面會重新整理一次（存檔會先存好）。')) return;
      try { if (pitch45()) localStorage.removeItem('tfl-pitch'); else localStorage.setItem('tfl-pitch', '45'); } catch (e) { }
      R.save && R.save(); location.reload();
    };
    row.appendChild(c);
  };
  const ps = R.pauseSheet; if (ps) R.pauseSheet = (...a) => { const r = ps(...a); addBtn(); return r; };
  const tm = R.townMenu; if (tm) R.townMenu = (...a) => { const r = tm(...a); addBtn(); return r; };
})(window.R);
