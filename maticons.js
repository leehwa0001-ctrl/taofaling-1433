// 素材圖示（2026-10-05 作者：幫我把素材的圖示也畫一下）
// 每一種素材一張 16×16 點陣圖（和 gear.js 裝備圖示同一套：先畫、半透明邊變實心、描深色邊），
// 外框顏色用素材自己的 color。手邊的素材、公會收購、倉庫「身上的東西」、鐵匠鋪配方都會帶圖示。
// 放在 gems.js、lordvariant.js 後面（全部 R.MATS 都有了），hubside.js 前面。
(function (R) {
  const cache = {};
  const ln = (x, x0, y0, x1, y1, col, w) => { x.strokeStyle = col; x.lineWidth = w || 1; x.lineCap = 'square'; x.beginPath(); x.moveTo(x0 + 0.5, y0 + 0.5); x.lineTo(x1 + 0.5, y1 + 0.5); x.stroke(); };
  const rc = (x, a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const poly = (x, pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
  const circ = (x, a, b, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
  const outline = x => {
    const img = x.getImageData(0, 0, 16, 16), d = img.data, solid = new Uint8Array(256);
    for (let i = 0; i < 256; i++) { if (d[i * 4 + 3] >= 110) { d[i * 4 + 3] = 255; solid[i] = 1; } else d[i * 4 + 3] = 0; }
    for (let i = 0; i < 256; i++) { if (solid[i]) continue; const px = i % 16, py = (i - px) / 16; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const qx = px + a, qy = py + b; return qx >= 0 && qy >= 0 && qx < 16 && qy < 16 && solid[qy * 16 + qx]; })) { d[i * 4] = 20; d[i * 4 + 1] = 16; d[i * 4 + 2] = 24; d[i * 4 + 3] = 255; } }
    x.putImageData(img, 0, 0);
  };
  const draw = kind => {
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
    const M = (R.MATS && R.MATS[kind]) || {}, col = M.color || '#C8C0B0';
    const hi = '#FFFFFF', dk = '#2A2430';
    switch (kind) {
      // ---- 基本 ----
      case 'branch':
        ln(x, 3, 14, 10, 4, '#8A6A44', 2); ln(x, 10, 4, 13, 2, '#A87A4A', 1);
        ln(x, 7, 9, 11, 7, '#6A4A2E', 1); ln(x, 6, 11, 3, 9, '#6A4A2E', 1);
        rc(x, 9, 3, 2, 2, '#6FB36A'); break;
      case 'herb':
        ln(x, 8, 14, 8, 7, '#4A7A3A', 2);
        poly(x, [[8, 7], [3, 5], [5, 9]], '#6FB36A'); poly(x, [[8, 7], [13, 4], [11, 9]], '#8AD07A');
        poly(x, [[8, 5], [6, 1], [10, 1]], '#9AE08A'); circ(x, 8, 2, 1, '#E8C04A'); break;
      case 'iron':
        poly(x, [[3, 11], [6, 4], [10, 3], [13, 8], [11, 13], [5, 14]], '#A3ACB6');
        poly(x, [[6, 5], [9, 4], [11, 8], [8, 10]], '#D4D8E0'); rc(x, 7, 7, 2, 2, '#5A606A'); break;
      case 'shell':
        poly(x, [[2, 11], [4, 5], [8, 3], [12, 5], [14, 11], [8, 14]], '#9A7A5A');
        poly(x, [[4, 10], [6, 6], [8, 5], [10, 6], [12, 10], [8, 12]], '#7A6552');
        ln(x, 8, 5, 8, 12, '#5A4434', 1); ln(x, 5, 7, 11, 7, '#5A4434', 1); break;
      case 'manaore':
        poly(x, [[8, 1], [14, 6], [11, 14], [5, 14], [2, 6]], '#8A74FF');
        poly(x, [[8, 3], [12, 7], [10, 12], [6, 12], [4, 7]], '#B8A8FF');
        circ(x, 8, 8, 1.5, '#E8E0FF'); break;
      case 'crystal':
        poly(x, [[8, 1], [13, 6], [11, 14], [5, 14], [3, 6]], '#5FE0FF');
        poly(x, [[8, 3], [11, 7], [9, 12], [7, 12], [5, 7]], '#BFF4FF');
        ln(x, 8, 3, 8, 12, hi, 1); break;
      case 'core':
        circ(x, 8, 8, 6, '#FF6AA8'); circ(x, 8, 8, 4, '#FFA0C8'); circ(x, 8, 8, 2, '#FFE0F0');
        circ(x, 6.5, 6.5, 1.2, hi); break;
      case 'wing':
        poly(x, [[2, 12], [5, 4], [8, 7], [8, 13]], '#F0D9A0');
        poly(x, [[14, 12], [11, 4], [8, 7], [8, 13]], '#E8C878');
        ln(x, 5, 6, 8, 10, '#C8A860', 1); ln(x, 11, 6, 8, 10, '#C8A860', 1);
        circ(x, 8, 8, 1.5, '#FFE8B0'); break;
      // ---- 元素晶 ----
      case 'frostcry':
        poly(x, [[8, 1], [13, 6], [11, 14], [5, 14], [3, 6]], '#BFE6FF');
        ln(x, 8, 3, 8, 13, hi, 1); ln(x, 4, 8, 12, 8, hi, 1);
        ln(x, 5, 5, 11, 11, '#8AC8F0', 1); ln(x, 11, 5, 5, 11, '#8AC8F0', 1); break;
      case 'flamecry':
        poly(x, [[8, 1], [13, 6], [11, 14], [5, 14], [3, 6]], '#FF8A4A');
        poly(x, [[8, 4], [11, 8], [9, 13], [7, 13], [5, 8]], '#FFD06A');
        circ(x, 8, 9, 1.5, hi); break;
      case 'sandcry':
        poly(x, [[8, 1], [13, 6], [11, 14], [5, 14], [3, 6]], '#E8C878');
        rc(x, 6, 6, 1, 1, '#C8A050'); rc(x, 9, 8, 1, 1, '#C8A050'); rc(x, 7, 11, 1, 1, '#C8A050');
        circ(x, 8, 7, 1.5, '#FFF0C0'); break;
      case 'windcry':
        poly(x, [[8, 1], [13, 6], [11, 14], [5, 14], [3, 6]], '#BFF0D0');
        ln(x, 4, 6, 11, 6, '#FFFFFF', 1); ln(x, 6, 9, 12, 9, '#FFFFFF', 1); ln(x, 4, 12, 10, 12, '#FFFFFF', 1); break;
      case 'venomcry':
        poly(x, [[8, 1], [13, 6], [11, 14], [5, 14], [3, 6]], '#8ACF3A');
        circ(x, 7, 7, 1.5, '#D8FF9A'); circ(x, 10, 10, 1, '#4A8A1A'); ln(x, 8, 12, 8, 14, '#4A8A1A', 1); break;
      case 'metalcry':
        poly(x, [[8, 1], [13, 6], [11, 14], [5, 14], [3, 6]], '#B8B8C4');
        ln(x, 5, 5, 11, 11, '#FFFFFF', 1); rc(x, 6, 9, 4, 1, '#6A6A78'); break;
      case 'tidecry':
        poly(x, [[8, 1], [13, 6], [11, 14], [5, 14], [3, 6]], '#5FC8E0');
        ln(x, 4, 7, 12, 7, '#BFF0FF', 1); ln(x, 5, 10, 11, 10, '#BFF0FF', 1);
        circ(x, 8, 5, 1.5, hi); break;
      case 'purecry':
        poly(x, [[8, 1], [14, 6], [11, 14], [5, 14], [2, 6]], '#E8F6FF');
        poly(x, [[8, 3], [12, 7], [10, 12], [6, 12], [4, 7]], '#FFFFFF');
        circ(x, 8, 8, 2, '#C8E8FF'); circ(x, 7, 7, 1, hi); break;
      // ---- 礦・金屬 ----
      case 'silver':
        poly(x, [[3, 11], [6, 4], [10, 3], [13, 8], [11, 13], [5, 14]], '#D8DEE6');
        poly(x, [[6, 5], [9, 4], [11, 8], [8, 10]], '#F0F4F8'); rc(x, 7, 7, 2, 2, '#A0A8B0'); break;
      case 'redgold':
        poly(x, [[3, 11], [6, 4], [10, 3], [13, 8], [11, 13], [5, 14]], '#E0603A');
        poly(x, [[6, 5], [9, 4], [11, 8], [8, 10]], '#FFB07A');
        circ(x, 8, 8, 1.5, '#FFE0A0'); break;
      case 'silverbar':
        rc(x, 3, 6, 10, 5, '#E8EEF6'); rc(x, 3, 6, 10, 1, '#FFFFFF'); rc(x, 3, 10, 10, 1, '#A8B0BC');
        rc(x, 5, 7, 2, 2, '#C8D0DA'); rc(x, 9, 7, 2, 2, '#C8D0DA'); break;
      // ---- 海邊 ----
      case 'seashell':
        poly(x, [[8, 3], [13, 7], [12, 13], [4, 13], [3, 7]], '#F0E2D0');
        poly(x, [[8, 5], [11, 8], [10, 12], [6, 12], [5, 8]], '#E8D0B8');
        ln(x, 8, 5, 8, 12, '#C8A888', 1); ln(x, 6, 7, 10, 7, '#C8A888', 1); break;
      case 'pearl':
        circ(x, 8, 8, 5.5, '#F4F0FF'); circ(x, 8, 8, 3.5, '#FFFFFF'); circ(x, 6.5, 6.5, 1.5, '#E8E0FF'); break;
      // ---- 城裡買的 ----
      case 'cloth':
        rc(x, 3, 4, 10, 9, '#7A8AA8'); rc(x, 3, 4, 10, 2, '#9AACCC');
        ln(x, 5, 7, 11, 7, '#5A6A88', 1); ln(x, 5, 10, 11, 10, '#5A6A88', 1);
        rc(x, 12, 5, 2, 7, '#4E5A78'); break;
      case 'leather':
        rc(x, 3, 3, 10, 11, '#9A6A44'); rc(x, 4, 4, 8, 9, '#B8845A');
        ln(x, 5, 6, 11, 6, '#6A4A2E', 1); ln(x, 5, 9, 11, 9, '#6A4A2E', 1);
        circ(x, 8, 11, 1, '#6A4A2E'); break;
      case 'thread':
        circ(x, 8, 8, 5.5, '#F2E8D8'); circ(x, 8, 8, 3.5, '#E8D8C0');
        circ(x, 8, 8, 1.5, '#C8A888'); ln(x, 8, 3, 8, 13, '#D8C8B0', 1); break;
      case 'washi':
        rc(x, 3, 2, 10, 12, '#F4EEDC'); rc(x, 4, 3, 8, 10, '#FFF8EC');
        ln(x, 5, 6, 11, 6, '#C8B898', 1); ln(x, 5, 9, 10, 9, '#C8B898', 1); break;
      case 'lacquer':
        rc(x, 5, 2, 6, 11, '#5A1E1C'); rc(x, 6, 3, 4, 9, '#8A2A28');
        circ(x, 8, 7, 1.5, '#C8403A'); rc(x, 6, 12, 4, 2, '#3A1412'); break;
      // ---- 異變・寶石 ----
      case 'mutacore':
        circ(x, 8, 8, 6.5, '#FF3A5A'); circ(x, 8, 8, 4.5, '#FF6A4A'); circ(x, 8, 8, 2.5, '#FFE08A');
        [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([a, b]) => ln(x, 8, 8, 8 + a * 6, 8 + b * 6, '#FFB45A', 1));
        circ(x, 6.5, 6.5, 1, hi); break;
      case 'gem_ruby':
        poly(x, [[8, 2], [13, 7], [10, 14], [6, 14], [3, 7]], '#E8404A'); poly(x, [[8, 4], [11, 8], [9, 12], [7, 12], [5, 8]], '#FF7A7A'); circ(x, 7, 7, 1, hi); break;
      case 'gem_sapph':
        poly(x, [[8, 2], [13, 7], [10, 14], [6, 14], [3, 7]], '#4A7AE8'); poly(x, [[8, 4], [11, 8], [9, 12], [7, 12], [5, 8]], '#7AA8FF'); circ(x, 7, 7, 1, hi); break;
      case 'gem_emer':
        poly(x, [[8, 2], [13, 7], [10, 14], [6, 14], [3, 7]], '#3AC86A'); poly(x, [[8, 4], [11, 8], [9, 12], [7, 12], [5, 8]], '#7AE0A0'); circ(x, 7, 7, 1, hi); break;
      case 'gem_topaz':
        poly(x, [[8, 2], [13, 7], [10, 14], [6, 14], [3, 7]], '#E8C03A'); poly(x, [[8, 4], [11, 8], [9, 12], [7, 12], [5, 8]], '#FFE08A'); circ(x, 7, 7, 1, hi); break;
      case 'gem_ameth':
        poly(x, [[8, 2], [13, 7], [10, 14], [6, 14], [3, 7]], '#A86AE8'); poly(x, [[8, 4], [11, 8], [9, 12], [7, 12], [5, 8]], '#C89AFF'); circ(x, 7, 7, 1, hi); break;
      case 'gem_dia':
        poly(x, [[8, 2], [13, 7], [10, 14], [6, 14], [3, 7]], '#E8F2FF'); poly(x, [[8, 4], [11, 8], [9, 12], [7, 12], [5, 8]], '#FFFFFF'); circ(x, 7, 7, 1, '#C8D8F0'); break;
      case 'gem_obsid':
        poly(x, [[8, 2], [13, 7], [10, 14], [6, 14], [3, 7]], '#3A2E44'); poly(x, [[8, 4], [11, 8], [9, 12], [7, 12], [5, 8]], '#5A4A68'); circ(x, 7, 7, 1, '#8A7A98'); break;
      default:
        // 還沒畫的：用顏色圓球＋小結晶
        circ(x, 8, 9, 5, col); poly(x, [[8, 2], [11, 6], [8, 8], [5, 6]], col); circ(x, 6.5, 7.5, 1.2, hi);
    }
    outline(x);
    return c;
  };
  R.matIconURL = (k, scale) => {
    scale = scale || 2;
    const key = k + ':' + scale;
    if (cache[key]) return cache[key];
    const src = draw(k), c = document.createElement('canvas'); c.width = c.height = 16 * scale;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, 16 * scale, 16 * scale);
    return (cache[key] = c.toDataURL());
  };
  // cls: chip（手邊素材膠囊）、sm（收購列）、card（配方旁）
  R.matIconTag = (k, cls) => {
    const M = R.MATS && R.MATS[k]; if (!M) return '';
    const sc = cls === 'card' ? 3 : cls === 'sm' ? 2 : 2;
    return '<span class="micon' + (cls ? ' ' + cls : '') + '" style="--c:' + M.color + '" title="' + R.esc(M.name) + '"><img src="' + R.matIconURL(k, sc) + '" alt=""></span>';
  };
  // HTML 小片：圖示＋名字＋數量（倉庫側欄、手邊素材共用）
  R.matChip = (k, n) => {
    const M = R.MATS && R.MATS[k]; if (!M) return '';
    return '<span class="mat" style="--c:' + M.color + '">' + R.matIconTag(k, 'chip') + R.esc(M.name) + (n != null ? ' ' + n : '') + '</span>';
  };
  const css = document.createElement('style');
  css.textContent = [
    '.micon{flex:none;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:5px;border:1px solid color-mix(in srgb,var(--c,#888) 55%,#2A2430);background:radial-gradient(circle at 40% 35%,color-mix(in srgb,var(--c,#888) 35%,transparent),rgba(0,0,0,.4));vertical-align:-5px;margin-right:4px}',
    '.micon img{width:18px;height:18px;image-rendering:pixelated}',
    '.micon.chip{width:18px;height:18px;border-radius:4px;margin-right:3px;vertical-align:-4px}.micon.chip img{width:14px;height:14px}',
    '.micon.sm{width:28px;height:28px;border-radius:6px;margin-right:6px}.micon.sm img{width:24px;height:24px}',
    '.micon.card{width:36px;height:36px;border-radius:7px;margin-right:8px}.micon.card img{width:32px;height:32px}',
    '.mat{display:inline-flex;align-items:center;gap:0}',
    '.sellmat .micon{flex:none}',
    '.sellmat .sm-name{display:flex;align-items:center;flex-wrap:wrap;gap:2px 6px}',
    '.recipe .mats-need{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;font-size:12px;opacity:.9}',
    '.recipe .mats-need .mat{padding:2px 8px 2px 4px}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
