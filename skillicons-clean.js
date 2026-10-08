// 簡潔彩繪圖示：依招式種類取圖，載入失敗時沿用原圖。
(function (R) {
  const previous = R.skillIconURL, info = R.skillIconInfo;
  if (!previous || !info) return;
  const tiles = { slash: 0, xslash: 1, fist: 2, guard: 3, fireball: 4,
    frost: 5, bolt: 6, wave: 7, heal: 8, drain: 9, arrow: 10,
    shot: 11, orb: 12, paw: 13, note: 14, scroll: 15 };
  const cache = new Map(), pending = new Map(), atlas = new Image();
  let ready = false;
  R.skillIconURL = id => {
    if (!id) return '';
    const o = info(id), tile = tiles[o.kind];
    if (tile == null) return previous(id);
    const key = o.key;
    if (!ready) {
      const url = previous(id);
      pending.set(url, id);
      return url;
    }
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const x = c.getContext('2d'), w = atlas.naturalWidth / 4, h = atlas.naturalHeight / 4;
    x.drawImage(atlas, tile % 4 * w, Math.floor(tile / 4) * h, w, h, 0, 0, 96, 96);
    // 保留段數和轉職等級的辨識，不在圖案裡灑粒子。
    x.strokeStyle = o.tier === 'aw' ? '#f3cb64' : o.tier === 'sp' ? '#b38ae8' : o.tier === 'adv' ? '#cbd5e1' : '#272331';
    x.lineWidth = o.tier ? 4 : 2; x.strokeRect(2, 2, 92, 92);
    if (o.n > 1) {
      x.fillStyle = '#10101bd9'; x.fillRect(33, 3, 30, 15);
      x.fillStyle = '#fff'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center';
      x.fillText('×' + o.n, 48, 15);
    }
    const marks = { burn: '火', frost: '冰', shock: '雷', stun: '暈', curse: '咒', vamp: '血', root: '縛', crit: '暴', ghost: '隱', taunt: '嘲', pierce: '穿' };
    (o.badges || []).forEach((b, i) => {
      const left = 4 + i * 20;
      x.fillStyle = '#10101be6'; x.fillRect(left, 73, 18, 19);
      x.fillStyle = '#fff'; x.font = 'bold 13px sans-serif'; x.textAlign = 'center';
      x.fillText(marks[b] || '', left + 9, 87);
    });
    const url = c.toDataURL('image/png'); cache.set(key, url); return url;
  };
  atlas.onload = () => {
    ready = true;
    // 已開啟的快捷列與技能書立刻換圖，不需要玩家重開視窗。
    document.querySelectorAll('img').forEach(el => {
      const id = pending.get(el.getAttribute('src'));
      if (id) el.src = R.skillIconURL(id);
    });
    pending.clear();
  };
  atlas.onerror = () => { pending.clear(); };
  atlas.src = 'assets/art/skill-icons-clean-v1.png';
})(window.R);
