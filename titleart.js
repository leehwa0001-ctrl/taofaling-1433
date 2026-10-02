// 討伐令 1433：標題的佩特拉核心立繪（作者：標題的佩特拉核心的立繪可以優化）
// 原本是 index.html 裡一張平面的 SVG 眼球（2026-10-03 刪掉了，現在 index.html 只留一個空的 .t-eye 給這裡換）；這裡換成會動的像素畫（240×150，放大顯示）：
//   有明暗的眼球（逐點打光、邊緣透紅）、纖維狀的虹膜、會看滑鼠（沒有滑鼠就四處張望、偶爾猛地轉一下）的瞳孔、血管、
//   左右各五根骨翼和翼膜（慢慢拍動）、下面兩對小翼肢、繞著核心轉的符文環（異常狀態力場）、浮在旁邊的碎石、往上飄的魔力粒子。
// 只在標題畫面看得到的時候才畫。
(function (R) {
  const svg = document.querySelector('#title .t-eye'); if (!svg) return;
  const W = 240, H = 150, CX = 120, CY = 80, ER = 33;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 't-eye t-core'; cv.setAttribute('aria-hidden', 'true');
  svg.replaceWith(cv);
  const x = cv.getContext('2d');
  let seed = 7; const srnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  // 血管：從眼白的邊緣往裡面長、會分岔
  const veins = [];
  for (let v = 0; v < 12; v++) {
    let a = v / 12 * Math.PI * 2 + srnd() * 0.3, r = ER - 1; const pts = [[a, r]];
    for (let s = 0; s < 14; s++) { a += (srnd() - 0.5) * 0.28; r -= 0.9 + srnd() * 0.6; if (r < ER * 0.6) break; pts.push([a, r]); if (srnd() < 0.18) { let a2 = a, r2 = r; const br = [[a2, r2]]; for (let k = 0; k < 5; k++) { a2 += (srnd() - 0.3) * 0.35; r2 -= 1; br.push([a2, r2]); } veins.push({ pts: br, w: 0.5 }); } }
    veins.push({ pts, w: 1 });
  }
  // 碎石、粒子
  const rocks = Array.from({ length: 7 }, (_, i) => ({ a: i / 7 * Math.PI * 2, r: 62 + srnd() * 26, s: 2 + srnd() * 3.5, sp: 0.15 + srnd() * 0.12, ph: srnd() * 6, k: Math.floor(srnd() * 3) }));
  const motes = Array.from({ length: 34 }, () => ({ x: srnd() * W, y: srnd() * H, v: 4 + srnd() * 8, ph: srnd() * 6, c: srnd() < 0.7 ? 0 : 1 }));
  const runes = Array.from({ length: 28 }, () => Math.floor(srnd() * 6));
  // 視線
  const gaze = { x: 0, y: 0, tx: 0, ty: 0, mouse: 0, next: 1.5 };
  window.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); if (!r.width) return; const dx = (e.clientX - (r.left + r.width * CX / W)) / (r.width * 0.5), dy = (e.clientY - (r.top + r.height * CY / H)) / (r.height * 0.6); const d = Math.hypot(dx, dy), k = Math.min(1, d) / (d || 1); gaze.tx = dx * k; gaze.ty = dy * k; gaze.mouse = 3; }, { passive: true });

  const ec = document.createElement('canvas'); ec.width = ec.height = ER * 2 + 2; const ex = ec.getContext('2d'), eyeImg = ex.createImageData(ER * 2 + 2, ER * 2 + 2);   // 眼球先畫在小畫布上再貼上去（直接 putImageData 會把後面的翅膀蓋掉）
  const L = (() => { const v = [-0.5, -0.62, 0.6], n = Math.hypot(...v); return v.map(c => c / n); })();
  const drawEye = (t, pupil) => {
    const d = eyeImg.data, S = ER * 2 + 2, gx = gaze.x * ER * 0.36, gy = gaze.y * ER * 0.34, IR = 15.5, PR = pupil;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const px = i - ER - 0.5, py = j - ER - 0.5, rr = (px * px + py * py) / (ER * ER), o = (j * S + i) * 4;
      if (rr > 1) { d[o + 3] = 0; continue; }
      const nx = px / ER, ny = py / ER, nz = Math.sqrt(1 - rr), dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), sh = 0.42 + 0.62 * dif;
      let r = 237, g = 226, b = 214;
      const edge = Math.pow(1 - nz, 1.6) * 0.7; r = r * (1 - edge) + 178 * edge; g = g * (1 - edge) + 104 * edge; b = b * (1 - edge) + 100 * edge;
      // 虹膜（跟著視線在球面上移動，越偏越扁）
      const ix = px - gx, iy = py - gy, sq = 1 - 0.35 * Math.hypot(gaze.x, gaze.y), id = Math.hypot(ix * (1 + (1 - sq) * Math.abs(gaze.x)), iy * (1 + (1 - sq) * Math.abs(gaze.y)));
      if (id < IR) {
        const an = Math.atan2(iy, ix), fib = 0.5 + 0.5 * Math.sin(an * 27 + Math.sin(an * 7) * 2 + id * 0.6), u = id / IR;
        if (id < PR) { r = 12; g = 5; b = 8; const gl = Math.max(0, 1 - (PR - id) / 2); r += 60 * gl; }
        else { r = 96 + 70 * fib * (1 - u * 0.6); g = 14 + 18 * fib; b = 26 + 20 * fib; if (u > 0.86) { r *= 0.45; g *= 0.4; b *= 0.45; } if (u < 0.62 && u > 0.4) { r += 30 * fib; g += 10; } }
      }
      d[o] = Math.min(255, r * sh); d[o + 1] = Math.min(255, g * sh); d[o + 2] = Math.min(255, b * sh); d[o + 3] = 255;
    }
    ex.putImageData(eyeImg, 0, 0); x.drawImage(ec, CX - ER - 1, CY - ER - 1);
    // 血管（畫在眼白上，虹膜那邊淡掉）
    x.save(); x.beginPath(); x.arc(CX, CY, ER - 0.5, 0, 7); x.clip();
    const icx = CX + gaze.x * ER * 0.36, icy = CY + gaze.y * ER * 0.34;
    veins.forEach(v => { x.strokeStyle = v.w > 0.8 ? 'rgba(170,40,36,.55)' : 'rgba(170,40,36,.32)'; x.lineWidth = v.w; x.beginPath(); let pen = false; v.pts.forEach(([a, r]) => { const X = CX + Math.cos(a) * r, Y = CY + Math.sin(a) * r; if (Math.hypot(X - icx, Y - icy) < 17.5) { pen = false; return; } if (pen) x.lineTo(X, Y); else { x.moveTo(X, Y); pen = true; } }); x.stroke(); });
    // 反光
    x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); x.ellipse(CX - ER * 0.36 + gaze.x * 3, CY - ER * 0.42 + gaze.y * 2, 4.2, 3.2, -0.5, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(Math.round(CX - ER * 0.16 + gaze.x * 3), Math.round(CY - ER * 0.5), 2, 2);
    x.restore();
    x.strokeStyle = 'rgba(60,24,30,.9)'; x.lineWidth = 1; x.beginPath(); x.arc(CX, CY, ER, 0, 7); x.stroke();
  };
  // 骨翼：五根指骨＋翼膜；sg＝左右
  const wing = (sg, t) => {
    const flap = Math.sin(t * 1.3) * 0.09, sx = CX + sg * (ER - 6), sy = CY - 8, tips = [];
    for (let k = 0; k < 5; k++) { const a = (-1.32 + k * 0.3 + flap * (1 + k * 0.3)) , len = 56 + k * 6 - (k === 4 ? 14 : 0); tips.push([sx + sg * Math.cos(a) * len, sy + Math.sin(a) * len, a, len]); }
    // 翼膜
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = tips[k], [bx, by] = tips[k + 1], mx = (ax + bx) / 2 - sg * 6, my = (ay + by) / 2 + 7;
      const g = x.createLinearGradient(sx, sy, mx, my); g.addColorStop(0, 'rgba(150,120,118,.85)'); g.addColorStop(1, 'rgba(120,78,88,.75)');
      x.fillStyle = g; x.beginPath(); x.moveTo(sx, sy); x.lineTo(ax, ay); x.quadraticCurveTo(mx, my, bx, by); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(70,40,48,.8)'; x.lineWidth = 1; x.beginPath(); x.moveTo(ax, ay); x.quadraticCurveTo(mx, my, bx, by); x.stroke();
    }
    // 指骨（關節、爪）
    tips.forEach(([tx, ty, a, len]) => {
      const jx = sx + sg * Math.cos(a) * len * 0.42, jy = sy + Math.sin(a) * len * 0.42;
      x.strokeStyle = '#6A5A54'; x.lineWidth = 3; x.beginPath(); x.moveTo(sx, sy); x.lineTo(jx, jy); x.lineTo(tx, ty); x.stroke();
      x.strokeStyle = '#E8DCCE'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(sx, sy); x.lineTo(jx, jy); x.lineTo(tx, ty); x.stroke();
      x.fillStyle = '#F4ECE2'; x.beginPath(); x.arc(jx, jy, 1.8, 0, 7); x.fill();
      x.fillStyle = '#3A2A2E'; x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx + sg * Math.cos(a - 0.5) * 6, ty + Math.sin(a - 0.5) * 6); x.lineTo(tx + sg * Math.cos(a) * 2, ty + Math.sin(a) * 2 + 2); x.fill();
    });
    // 下面的小翼肢
    [0, 1].forEach(k => { const a = 0.55 + k * 0.42 - flap * 1.5, len = 30 - k * 6, x0 = CX + sg * (ER - 10), y0 = CY + 12, x1 = x0 + sg * Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      x.fillStyle = 'rgba(110,70,80,.6)'; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.lineTo(x0 + sg * Math.cos(a - 0.35) * len * 0.6, y0 + Math.sin(a - 0.35) * len * 0.6); x.fill();
      x.strokeStyle = '#D8CCBE'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); });
  };
  // 符文環（前半圈和後半圈分開畫，夾住眼球）
  const RUNE = [[[0, -2], [0, 2]], [[-2, -2], [2, 2]], [[-2, 0], [2, 0], [0, -2]], [[-2, 2], [0, -2], [2, 2]], [[-2, -2], [2, -2], [0, 2]], [[-1, -2], [-1, 2], [2, 0]]];
  const ring = (t, front) => {
    const rx = 58, ry = 13, rot = t * 0.25;
    x.strokeStyle = front ? 'rgba(232,120,80,.55)' : 'rgba(232,120,80,.25)'; x.lineWidth = 1;
    x.beginPath(); for (let k = 0; k <= 40; k++) { const a = Math.PI * (front ? k / 40 : 1 + k / 40), X = CX + Math.cos(a) * rx, Y = CY + 6 + Math.sin(a) * ry; if (k) x.lineTo(X, Y); else x.moveTo(X, Y); } x.stroke();
    runes.forEach((rn, i) => { const a = i / runes.length * Math.PI * 2 + rot, s = Math.sin(a); if ((s > 0) !== front) return; const X = CX + Math.cos(a) * rx, Y = CY + 6 + s * ry, al = front ? 0.85 : 0.35;
      x.strokeStyle = 'rgba(255,170,110,' + al + ')'; x.beginPath(); RUNE[rn].forEach(([u, v], k) => { if (k) x.lineTo(X + u, Y + v); else x.moveTo(X + u, Y + v); }); x.stroke(); });
  };
  const rock = (o, t, front) => {
    const a = o.a + t * o.sp, X = CX + Math.cos(a) * o.r, z = Math.sin(a), Y = CY + 10 + z * 18 + Math.sin(t * 1.1 + o.ph) * 3; if ((z > 0) !== front) return;
    const s = o.s * (0.8 + z * 0.25);
    x.fillStyle = front ? '#5A4E4A' : '#3A3230'; x.beginPath(); x.moveTo(X - s, Y); x.lineTo(X - s * 0.3, Y - s); x.lineTo(X + s, Y - s * 0.4); x.lineTo(X + s * 0.6, Y + s * 0.8); x.closePath(); x.fill();
    x.fillStyle = front ? '#8A7A70' : '#5A4E4A'; x.fillRect(Math.round(X - s * 0.3), Math.round(Y - s * 0.8), 2, 1);
  };
  let last = performance.now(), T = 0, raf = 0;
  const frame = now => {
    raf = 0;
    const title = document.getElementById('title'); if (!title || title.hidden || !document.body.contains(cv)) { raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    // 視線：滑鼠動過就看滑鼠，不然四處張望，偶爾猛地轉一下
    gaze.mouse -= dt; gaze.next -= dt;
    if (gaze.mouse <= 0 && gaze.next <= 0) { gaze.next = 1.2 + Math.random() * 2.8; const a = Math.random() * Math.PI * 2, r = Math.random() < 0.3 ? 0 : 0.4 + Math.random() * 0.6; gaze.tx = Math.cos(a) * r; gaze.ty = Math.sin(a) * r * 0.8; }
    const k = gaze.mouse > 0 ? 6 : 10; gaze.x += (gaze.tx - gaze.x) * Math.min(1, dt * k); gaze.y += (gaze.ty - gaze.y) * Math.min(1, dt * k);
    const bob = Math.sin(T * 0.9) * 2;
    x.clearRect(0, 0, W, H);
    x.save(); x.translate(0, bob);
    const glow = x.createRadialGradient(CX, CY, 8, CX, CY, 90); glow.addColorStop(0, 'rgba(200,50,42,.35)'); glow.addColorStop(1, 'rgba(200,50,42,0)'); x.fillStyle = glow; x.fillRect(0, -10, W, H + 20);
    rocks.forEach(o => rock(o, T, false)); ring(T, false);
    wing(-1, T); wing(1, T);
    drawEye(T, 6 + Math.sin(T * 0.7) * 1.2);
    ring(T, true); rocks.forEach(o => rock(o, T, true));
    x.restore();
    motes.forEach(m => { m.y -= m.v * dt; if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; } const al = 0.35 + 0.35 * Math.sin(T * 2 + m.ph); x.fillStyle = m.c ? 'rgba(255,200,120,' + al + ')' : 'rgba(230,80,60,' + al + ')'; x.fillRect(Math.round(m.x + Math.sin(T + m.ph) * 3), Math.round(m.y), 1, 1); });
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  R.titleArtDebug = { draw: t => { last = performance.now() - 16; frame(performance.now()); }, gaze };
})(window.R);
