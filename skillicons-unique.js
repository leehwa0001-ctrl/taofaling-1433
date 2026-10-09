// 每招使用獨立插畫圖格；依需要載入圖集，技能書不必先下載其他職業的素材。
(function (R) {
  const map = R.SKILL_ART_MAP;
  if (!map || !R.skillIconURL) return;
  map.sheets['warrior-micro-v2'] = { file: 'warrior-micro-v2.png', cols: 2, rows: 1 };
  for (const [id, tile] of [['warcry', 0], ['whirl', 1]]) {
    map.icons[id] = { ...map.icons[id], sheet: 'warrior-micro-v2', tile };
  }
  const old = R.skillIconURL, oldInfo = R.skillArtInfo;
  const sheets = new Map(), cache = new Map(), pending = new Map();
  const canonical = id => id && id.startsWith('ult_') ? 'ult:' + id.slice(4) : id;
  const refresh = () => {
    const changed = new Set();
    document.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src'), id = pending.get(src);
      if (!id) return;
      const next = R.skillIconURL(id);
      if (next !== src) { img.src = next; changed.add(src); }
    });
    changed.forEach(src => pending.delete(src));
  };
  const sheetOf = key => {
    if (sheets.has(key)) return sheets.get(key);
    const spec = map.sheets[key], state = { image: new Image(), loaded: false, failed: false };
    sheets.set(key, state);
    state.image.onload = () => { state.loaded = true; refresh(); };
    state.image.onerror = () => { state.failed = true; refresh(); console.warn('[skill-art] 無法載入', spec.file); };
    state.image.src = 'assets/art/skills-unique-v1/' + spec.file;
    return state;
  };
  R.skillIconURL = raw => {
    const id = canonical(raw), entry = map.icons[id];
    if (!entry) return old(raw);
    const state = sheetOf(entry.sheet);
    if (state.failed) return old(raw);
    if (!state.loaded) {
      // 暫時包住原圖，附上技能編號，避免兩個舊圖相同的技能在載入後被配錯。
      const fallback = old(raw), safe = String(id).replace(/[<>&"]/g, '');
      const src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><title>' + safe + '</title><image href="' + fallback.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" width="96" height="96"/></svg>');
      pending.set(src, id);
      return src;
    }
    if (cache.has(id)) return cache.get(id);
    const spec = map.sheets[entry.sheet], im = state.image;
    const col = entry.tile % spec.cols, row = Math.floor(entry.tile / spec.cols);
    const xs = spec.xCuts || Array.from({ length: spec.cols + 1 }, (_, n) => n / spec.cols);
    const ys = spec.yCuts || Array.from({ length: spec.rows + 1 }, (_, n) => n / spec.rows);
    const x = xs[col] * im.naturalWidth, y = ys[row] * im.naturalHeight;
    const w = (xs[col + 1] - xs[col]) * im.naturalWidth, h = (ys[row + 1] - ys[row]) * im.naturalHeight;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 48;
    const ctx = canvas.getContext('2d');
    // 略去圖格分隔線；不同招式直接使用自己的主圖，不再換色套模板。
    ctx.drawImage(im, x + 2, y + 2, w - 4, h - 4, 0, 0, 48, 48);
    const url = canvas.toDataURL('image/png'); cache.set(id, url); return url;
  };
  R.skillArtInfo = raw => {
    const id = canonical(raw), entry = map.icons[id];
    return { ...(oldInfo ? oldInfo(id) : {}), covered: !!entry, unique: !!entry,
      artKey: entry ? entry.sheet + ':' + entry.tile : null, family: entry && entry.family };
  };
  R.skillArtStatus = () => ({ total: Object.keys(map.icons).length, sheets: Object.keys(map.sheets).length,
    loaded: [...sheets.values()].filter(s => s.loaded).length,
    failed: [...sheets.values()].filter(s => s.failed).length,
    loading: [...sheets.values()].filter(s => !s.loaded && !s.failed).length });
  const style = document.createElement('style');
  style.textContent = '.h2-ic,.skill-ult-art,.skill-ult-art2{image-rendering:pixelated}.ul-btn .ul-txt{position:absolute;top:100%;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:10px;line-height:14px;pointer-events:none}.ul-btn{overflow:visible!important}#r-br .act.nomp::after{content:none!important}';
  document.head.appendChild(style);
})(window.R);
