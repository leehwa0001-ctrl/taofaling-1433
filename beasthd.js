// 遺跡生物的高解析度（2026-10-08 作者：所有怪物重繪、DPI 拉高；玩家人物不用；無主大鎧保持原樣）
// - 原本（character-art.js）：每一個像素放大成 2×2，再沿輪廓加亮、下緣收暗——斜線、圓弧還是一格一格的鋸齒。
// - 現在：照像素藝術的放大法（Scale2x 做兩次＝4 倍）把斜線、圓弧修順，再補上受光面：
//   輪廓上緣、左緣一條細的亮邊；下緣、右緣一條細的暗邊；每一格身體從上到下淡淡地變暗（有立體感）。
//   不撒隨機雜點（跟原本一樣），顏色、兩幀動畫、變種的換色都照舊；看板的大小、碰撞不變（只是貼圖細了四倍）。
// - 無主大鎧（muhyo）照原本的 2 倍細節，不動。
// - 之後分批手繪：手繪好的那一隻放進 R.BEAST_ART 就會自動走這一條（一樣 4 倍、修邊）。
// 放在 sprites.js、character-art.js 後面。
(function (R) {
  const KEEP = new Set(['muhyo']);
  const old = R.detailBeastCanvas;
  let cur = null;
  // 誰在畫（sprites.js 的 beastSheet 只把畫布傳進來）
  ['makeBeastSprite', 'beastVariant', 'beastSheetOf'].forEach(k => {
    const f = R[k]; if (typeof f !== 'function') return;
    R[k] = (...a) => { const id = k === 'beastVariant' ? a[1] : a[0], prev = cur; cur = id; try { return f(...a); } finally { cur = prev; } };
  });
  // Scale2x（EPX）：同顏色的斜邊補成斜的，不產生新顏色
  const scale2x = (src, w, h) => {
    const W2 = w * 2, out = new Uint32Array(W2 * h * 2), P = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const E = src[y * w + x], B = P(x, y - 1), D = P(x - 1, y), F = P(x + 1, y), H = P(x, y + 1);
      let e0 = E, e1 = E, e2 = E, e3 = E;
      if (B !== H && D !== F) { if (D === B) e0 = D; if (B === F) e1 = F; if (D === H) e2 = D; if (H === F) e3 = F; }
      const o = y * 2 * W2 + x * 2; out[o] = e0; out[o + 1] = e1; out[o + W2] = e2; out[o + W2 + 1] = e3;
    }
    return out;
  };
  const lum = v => (v & 255) * 0.3 + (v >>> 8 & 255) * 0.59 + (v >>> 16 & 255) * 0.11;   // little-endian：R 在最低位
  const tone = (v, k) => { const r = Math.min(255, Math.round((v & 255) * k)), g = Math.min(255, Math.round((v >>> 8 & 255) * k)), b = Math.min(255, Math.round((v >>> 16 & 255) * k)); return (v & 0xFF000000) | (b << 16) | (g << 8) | r; };
  const hd = source => {
    const w = source.width, h = source.height, sctx = source.getContext('2d'), img = sctx.getImageData(0, 0, w, h);
    const s32 = new Uint32Array(img.data.buffer.slice(0));
    for (let i = 0; i < s32.length; i++) if ((s32[i] >>> 24) < 128) s32[i] = 0; else s32[i] = s32[i] | 0xFF000000;   // 只要全透明、全不透明
    const a2 = scale2x(s32, w, h), a4 = scale2x(a2, w * 2, h * 2), W4 = w * 4, H4 = h * 4;
    // 受光：上、左亮；下、右暗（細的一條）；每一格（sprites.js 的表是 2×2 格）從上到下淡淡變暗
    const out = new Uint32Array(a4.length), fh4 = H4 / 2, dark = lum(0xFF18141A) + 8;
    for (let y = 0; y < H4; y++) {
      const fy = (y % fh4) / fh4, grad = 1.07 - 0.14 * fy;
      for (let x = 0; x < W4; x++) {
        const i = y * W4 + x, v = a4[i]; if (!v) continue;
        if (lum(v) < dark) { out[i] = v; continue; }   // 外框（深色）不動
        const up = y > 0 ? a4[i - W4] : 0, lf = x > 0 ? a4[i - 1] : 0, dn = y < H4 - 1 ? a4[i + W4] : 0, rt = x < W4 - 1 ? a4[i + 1] : 0, L = lum(v);
        const edgeUp = !up || lum(up) < L - 30, edgeLf = !lf || lum(lf) < L - 30, edgeDn = !dn || lum(dn) < L - 30, edgeRt = !rt || lum(rt) < L - 30;
        let k = grad; if (edgeUp) k *= 1.16; else if (edgeLf) k *= 1.08; if (edgeDn) k *= 0.8; else if (edgeRt) k *= 0.9;
        out[i] = tone(v, k);
      }
    }
    const c = document.createElement('canvas'); c.width = W4; c.height = H4;
    const ctx = c.getContext('2d'), od = ctx.createImageData(W4, H4); new Uint32Array(od.data.buffer).set(out); ctx.putImageData(od, 0, 0);
    return c;
  };
  R.detailBeastCanvas = source => {
    try { if (cur && KEEP.has(cur)) return old ? old(source) : source; return hd(source); }
    catch (e) { console.warn('[beasthd]', e); return old ? old(source) : source; }
  };
  R.beastHD = { scale2x, hd, old };
})(window.R);
