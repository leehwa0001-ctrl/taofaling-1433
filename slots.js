// 拉霸機「鶴之舞」（作者 2026-10-04：柏青哥可以加拉霸機）
// 日式拉霸（斯洛）：三軸、一條中線。拉桿（空白鍵）開始轉，按停止鈕（1、2、3 或 J、K、L）一軸一軸停；轉的時候再按空白鍵＝從左邊停（作者 2026-10-04）。
// - 拉桿的時候機台裡面就先抽好結果（內部抽選）；停的時候轉軸最多再滑四格去對齊那個結果——
//   鈴鐺、Replay 每四格就有一個，一定對得上；西瓜、櫻桃、7、BAR 很少，要自己看準了再按（目押し）。
// - 抽到大獎（BIG：7 7 7、REG：BAR BAR BAR）的那一下，旁邊的「GOGO!」燈會亮；沒對齊的話獎會留著，燈一直亮到你對齊為止。
// - 代幣：50 枚 10 費拉，6 枚換 1 費拉（和柏青哥一樣抽成）；沒換完的存在店裡（R.S.medals）。一次押 3 枚，Replay 下一把免費。
// - 期望值大約九成（長期玩一定小輸），大獎很少但一次很多。
(function (R) {
  const SYM = { '7': { c: '#E83A3A', t: '7' }, B: { c: '#1A1A1A', t: 'BAR' }, 鶴: { c: '#F4F0E8', t: '鶴' }, 鈴: { c: '#F2C83A', t: '鈴' }, 瓜: { c: '#3AA84A', t: '瓜' }, 櫻: { c: '#D83A6A', t: '櫻' }, R: { c: '#3A7AE8', t: 'RE' } };
  const STRIP = [
    ['7', '鈴', 'R', '瓜', '鈴', 'R', '櫻', '鈴', 'R', 'B', '鈴', 'R', '鶴', '鈴', 'R', '瓜', '鈴', 'R', '7', '鈴', 'R'],
    ['鈴', 'R', '7', '鈴', 'R', '瓜', '鈴', 'R', 'B', '鈴', 'R', '鶴', '鈴', 'R', '7', '鈴', 'R', '瓜', '鈴', 'R', '鶴'],
    ['R', '鈴', '7', 'R', '鈴', '瓜', 'R', '鈴', 'B', 'R', '鈴', '鶴', 'R', '鈴', '7', 'R', '鈴', '瓜', 'R', '鈴', '鶴']
  ];
  const N = 21, BET = 3, BUY = 50, BUY_GOLD = 10, CASH = 6, SLIDE = 4;
  // 內部抽選（每一把）：機率、中線要對齊的圖案
  const LOT = [['big', 1 / 280], ['reg', 1 / 440], ['melon', 1 / 90], ['cherry', 1 / 36], ['bell', 1 / 7], ['replay', 1 / 7.3]];
  const PAY = { big: 252, reg: 96, melon: 12, cherry: 2, bell: 8, replay: 0 };
  const TARGET = { big: ['7', '7', '7'], reg: ['B', 'B', 'B'], melon: ['瓜', '瓜', '瓜'], cherry: ['櫻', null, null], bell: ['鈴', '鈴', '鈴'], replay: ['R', 'R', 'R'] };
  const NAME = { big: 'BIG BONUS', reg: 'REG BONUS', melon: '西瓜', cherry: '櫻桃', bell: '鈴鐺', replay: 'Replay' };
  const at = (r, p) => STRIP[r][((p % N) + N) % N];
  const lineWin = L => { if (L[0] === '7' && L[1] === '7' && L[2] === '7') return 'big'; if (L[0] === 'B' && L[1] === 'B' && L[2] === 'B') return 'reg'; if (L[0] === '瓜' && L[1] === '瓜' && L[2] === '瓜') return 'melon'; if (L[0] === '鈴' && L[1] === '鈴' && L[2] === '鈴') return 'bell'; if (L[0] === 'R' && L[1] === 'R' && L[2] === 'R') return 'replay'; if (L[0] === '櫻') return 'cherry'; return null; };
  // 停的位置：從按下去的那一格往後最多滑四格；對得上結果就對，對不上就避開別的獎
  const stopAt = (r, p, flag, line) => {
    const want = flag && TARGET[flag] ? TARGET[flag][r] : null, cands = [0, 1, 2, 3, 4].map(k => p + k);
    const valid = q => { const L = line.slice(); L[r] = at(r, q); if (r === 0 && L[0] === '櫻' && flag !== 'cherry') return false; if (r === 2) { const w = lineWin(L); return !w || w === flag; } return true; };
    if (want) { const q = cands.find(q => at(r, q) === want && valid(q)); if (q != null) return q; }
    const q2 = cands.find(valid); return q2 != null ? q2 : p;
  };

  R.slotMachine = () => {
    const S = R.S; S.medals = S.medals || 0;
    R.sheet('<p class="kicker">柏青哥「銀河」・拉霸機</p><h2>鶴之舞</h2><p class="note">拉桿（空白鍵）開始轉，轉的時候再按空白鍵，從左到右一軸一軸停（也可以按 1、2、3 或 J、K、L 自己挑哪一軸）。鈴鐺、Replay 一定對得上；西瓜、櫻桃、7、BAR 要看準了再按。「GOGO!」亮了就是大獎在等你對齊。</p>'
      + '<div class="sl"><canvas id="sl-cv" width="300" height="236"></canvas><div class="sl-ui"><div class="sl-st">代幣 <b id="sl-n">0</b> 枚<small id="sl-info"></small></div>'
      + '<div class="sl-stops"><button type="button" class="btn" data-st="0">停 1</button><button type="button" class="btn" data-st="1">停 2</button><button type="button" class="btn" data-st="2">停 3</button></div>'
      + '<button type="button" class="btn pri sl-lever" id="sl-go">拉桿（押 3 枚）<small>空白鍵</small></button>'
      + '<div class="row"><button type="button" class="btn" id="sl-buy">買代幣（' + BUY_GOLD + ' 費拉＝' + BUY + ' 枚）</button><button type="button" class="btn gold" id="sl-cash">換成費拉（' + CASH + ' 枚＝1 費拉）</button><button type="button" class="btn" id="sl-x">離開</button></div>'
      + '<p class="note sl-pay">中線：7 7 7＝BIG（' + PAY.big + ' 枚）・BAR×3＝REG（' + PAY.reg + '）・西瓜×3＝' + PAY.melon + '・鈴鐺×3＝' + PAY.bell + '・左邊櫻桃＝' + PAY.cherry + '・Replay×3＝下一把免費</p></div></div>');
    const $ = id => document.getElementById(id), cv = $('sl-cv'), x = cv.getContext('2d');
    const M = { pos: [0, 7, 14], spin: [false, false, false], v: 0, flag: null, carry: null, free: false, gogo: false, msg: '', msgT: 0, win: 0, t: 0, line: [null, null, null] };
    const info = t => { $('sl-info').textContent = t; };
    const upd = () => { $('sl-n').textContent = S.medals; $('sl-buy').disabled = S.gold < BUY_GOLD; $('sl-cash').disabled = S.medals < CASH; $('sl-go').disabled = M.spin.some(Boolean) || (!M.free && S.medals < BET); $('sl-go').firstChild.textContent = M.free ? '拉桿（Replay：免費）' : '拉桿（押 3 枚）'; document.querySelectorAll('[data-st]').forEach(b => { b.disabled = !M.spin[+b.dataset.st]; }); };
    const lever = () => {
      if (M.spin.some(Boolean)) return; if (!M.free) { if (S.medals < BET) { info('代幣不夠了。'); return; } S.medals -= BET; } M.free = false; M.win = 0;
      if (M.carry) M.flag = M.carry; else { let r = Math.random(), f = null; for (const [k, p] of LOT) { if (r < p) { f = k; break; } r -= p; } M.flag = f; if (f === 'big' || f === 'reg') M.carry = f; }
      M.spin = [true, true, true]; M.line = [null, null, null]; R.sfx && R.sfx('pick'); upd();
    };
    const stop = r => {
      if (!M.spin[r]) return; const p = Math.round(M.pos[r]) + 1, q = stopAt(r, p, M.flag, M.line);
      M.pos[r] = q; M.spin[r] = false; M.line[r] = at(r, q); R.sfx && R.sfx('coin');
      if (!M.spin.some(Boolean)) settle(); upd();
    };
    const settle = () => {
      const w = lineWin(M.line);
      if (M.carry && !M.gogo) { M.gogo = true; R.sfx && R.sfx('chest'); info('GOGO!——大獎在等你對齊（7 或 BAR）。'); }
      if (w) {
        if (w === 'replay') { M.free = true; M.msg = 'REPLAY'; }
        else { const pay = PAY[w]; S.medals += pay; M.win = pay; M.msg = NAME[w] + '  +' + pay; }
        if (w === 'big' || w === 'reg') { M.carry = null; M.gogo = false; R.sfx && R.sfx('chest'); info(NAME[w] + '！代幣 +' + PAY[w] + ' 枚。'); }
        M.msgT = w === 'big' || w === 'reg' ? 3 : 1.4;
      } else if (M.flag && M.flag !== 'big' && M.flag !== 'reg' && M.flag !== 'replay' && M.flag !== 'bell') { M.msg = '……沒對到' + NAME[M.flag]; M.msgT = 1.2; }
      R.save();
    };
    // 畫面
    const drawSym = (s, cx, cy, h, dim) => {
      const d = SYM[s]; x.save(); x.globalAlpha = dim ? 0.45 : 1;
      if (s === 'B') { x.fillStyle = '#1A1A1A'; x.fillRect(cx - 30, cy - 12, 60, 24); x.fillStyle = '#F4F0E8'; x.font = 'bold 15px sans-serif'; x.fillText('BAR', cx, cy + 5); }
      else if (s === '7') { x.fillStyle = '#7A1A1A'; x.font = '900 40px serif'; x.fillText('7', cx + 2, cy + 15); x.fillStyle = '#E83A3A'; x.fillText('7', cx, cy + 13); }
      else if (s === '鈴') { x.fillStyle = '#C89A2A'; x.beginPath(); x.moveTo(cx - 14, cy + 10); x.quadraticCurveTo(cx - 14, cy - 16, cx, cy - 16); x.quadraticCurveTo(cx + 14, cy - 16, cx + 14, cy + 10); x.closePath(); x.fill(); x.fillStyle = '#F2C83A'; x.beginPath(); x.moveTo(cx - 11, cy + 8); x.quadraticCurveTo(cx - 11, cy - 13, cx, cy - 13); x.quadraticCurveTo(cx + 11, cy - 13, cx + 11, cy + 8); x.closePath(); x.fill(); x.fillStyle = '#8A6A1A'; x.fillRect(cx - 3, cy + 9, 6, 5); }
      else if (s === '瓜') { x.fillStyle = '#2A7A3A'; x.beginPath(); x.arc(cx, cy - 2, 16, 0, Math.PI); x.fill(); x.fillStyle = '#E84A4A'; x.beginPath(); x.arc(cx, cy - 2, 12, 0, Math.PI); x.fill(); x.fillStyle = '#1A1A1A'; [-6, 0, 6].forEach(o => x.fillRect(cx + o - 1, cy + 2, 2, 3)); }
      else if (s === '櫻') { x.strokeStyle = '#3A7A2A'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 7, cy + 4); x.quadraticCurveTo(cx, cy - 16, cx + 4, cy - 14); x.moveTo(cx + 7, cy + 4); x.quadraticCurveTo(cx + 4, cy - 10, cx + 4, cy - 14); x.stroke(); x.fillStyle = '#D83A3A'; x.beginPath(); x.arc(cx - 7, cy + 7, 7, 0, 7); x.arc(cx + 8, cy + 7, 7, 0, 7); x.fill(); }
      else if (s === '鶴') { x.fillStyle = '#F4F0E8'; x.beginPath(); x.arc(cx, cy, 15, 0, 7); x.fill(); x.fillStyle = '#C83A3A'; x.beginPath(); x.arc(cx, cy - 5, 3, 0, 7); x.fill(); x.fillStyle = '#1A1A1A'; x.font = 'bold 16px serif'; x.fillText('鶴', cx, cy + 9); }
      else { x.fillStyle = '#3A7AE8'; x.font = '900 13px sans-serif'; x.fillText('REPLAY', cx, cy + 5); }
      x.restore();
    };
    const draw = () => {
      const t = M.t; x.textAlign = 'center';
      x.fillStyle = '#2A1A3A'; x.fillRect(0, 0, 300, 236); x.fillStyle = '#3A2450'; for (let i = 0; i < 236; i += 6) x.fillRect(0, i, 300, 2);
      // 招牌
      x.fillStyle = '#1A0E24'; x.fillRect(10, 6, 280, 30); x.fillStyle = '#FFE08A'; x.font = 'bold 18px serif'; x.fillText('鶴　之　舞', 150, 28);
      // 轉軸
      const RX = [62, 150, 238], RY = 54, RH = 132, CH = 44;
      x.fillStyle = '#F8F4EA'; x.fillRect(22, RY, 256, RH);
      for (let r = 0; r < 3; r++) {
        x.save(); x.beginPath(); x.rect(RX[r] - 40, RY, 80, RH); x.clip();
        const p = M.pos[r], base = Math.floor(p), off = (p - base) * CH;
        for (let k = -1; k <= 3; k++) { const cy = RY + (k + 0.5) * CH - off; drawSym(at(r, base + k), RX[r], cy, CH, M.spin[r]); }
        x.restore(); x.strokeStyle = '#2A1A3A'; x.lineWidth = 3; x.strokeRect(RX[r] - 40, RY, 80, RH);
      }
      // 陰影、中線
      const g = x.createLinearGradient(0, RY, 0, RY + RH); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = g; x.fillRect(22, RY, 256, RH);
      x.strokeStyle = M.win ? (Math.floor(t * 8) % 2 ? '#FFE08A' : '#FF5A5A') : '#E83A3A'; x.lineWidth = 2; x.beginPath(); x.moveTo(16, RY + RH / 2); x.lineTo(284, RY + RH / 2); x.stroke();
      // GOGO 燈
      const on = M.gogo; x.fillStyle = on ? (Math.floor(t * 4) % 2 ? '#FF3A8A' : '#FFE08A') : '#3A2A3A'; x.beginPath(); x.ellipse(40, 214, 30, 14, 0, 0, 7); x.fill(); x.fillStyle = on ? '#FFFFFF' : '#5A4A5A'; x.font = '900 14px sans-serif'; x.fillText('GOGO!', 40, 219);
      // 訊息、押注
      x.fillStyle = '#FFE08A'; x.font = 'bold 14px sans-serif'; x.fillText(M.msgT > 0 ? M.msg : (M.free ? 'REPLAY' : ''), 170, 219);
      x.fillStyle = '#C8C0D8'; x.font = '11px sans-serif'; x.fillText('BET 3', 268, 219);
    };
    const key = e => {
      if (!document.body.contains(cv)) return;
      if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (e.repeat) return; const r = M.spin.indexOf(true); if (r >= 0) stop(r); else lever(); }
      const k = { '1': 0, '2': 1, '3': 2, j: 0, k: 1, l: 2, J: 0, K: 1, L: 2 }[e.key]; if (k != null) { e.preventDefault(); e.stopPropagation(); stop(k); }
    };
    window.addEventListener('keydown', key, true);
    $('sl-go').onclick = lever; document.querySelectorAll('[data-st]').forEach(b => { b.onclick = () => stop(+b.dataset.st); });
    $('sl-buy').onclick = () => { if (S.gold < BUY_GOLD) return; S.gold -= BUY_GOLD; S.medals += BUY; R.save(); upd(); };
    $('sl-cash').onclick = () => { const g = Math.floor(S.medals / CASH); if (!g) return; S.medals -= g * CASH; S.gold += g; R.save(); upd(); info('在櫃台換了 ' + g + ' 費拉。'); R.sfx && R.sfx('coin'); };
    $('sl-x').onclick = () => R.closeSheet();
    if (!S.medals && S.gold >= BUY_GOLD) { S.gold -= BUY_GOLD; S.medals = BUY; R.save(); info('先買了 ' + BUY + ' 枚代幣（' + BUY_GOLD + ' 費拉）。'); }
    upd();
    let last = performance.now();
    const frame = now => {
      if (!document.body.contains(cv) || !R.sheetOpen()) { window.removeEventListener('keydown', key, true); R.save(); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; M.t += dt; if (M.msgT > 0) M.msgT -= dt;
      for (let r = 0; r < 3; r++) if (M.spin[r]) M.pos[r] = (M.pos[r] + dt * 13) % N;
      draw(); requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  R.SLOT = { STRIP, LOT, PAY, TARGET, lineWin, stopAt, at };   // 測試用

  // 柏青哥的選台畫面多一張「拉霸機」；店裡後面多一排拉霸機
  const pc0 = R.pachinko;
  R.pachinko = kind => { const r = pc0(kind); if (!kind) { const box = document.querySelector('.pachi-kinds'); if (box && !box.querySelector('[data-slot]')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pachi-kind'; b.dataset.slot = '1'; b.style.setProperty('--pk', '#FF5AA8'); b.style.setProperty('--pkb', '#2A1A3A'); b.innerHTML = '<b>拉霸機・鶴之舞</b><small>斯洛：三軸、自己按停（目押し）</small><span>GOGO! 燈亮了就是大獎在等你對齊。押 3 枚，期望值大約九成。</span>'; b.onclick = () => R.slotMachine(); box.appendChild(b); } } return r; };
  const FN = R.INTERIOR_FURNISH;
  // 店裡東邊的牆邊一排拉霸機（原本擺在大門前面，把出口擋住了——作者 2026-10-04 回報）
  if (FN && FN.pachinko) { const f0 = FN.pachinko; FN.pachinko = c => { const r = f0(c); try { const { HW, bx, lamp } = c, x0 = HW - 0.6; for (let i = 0; i < 4; i++) { const z = -3 + i * 2; bx(0.7, 1.9, 1.2, '#3A2450', x0, 0.95, z); bx(0.05, 0.6, 0.9, R.INTERIOR_KIT && R.INTERIOR_KIT.lam ? R.INTERIOR_KIT.lam('#FF8AC8', { em: '#FF5AA8', ei: 0.8 }) : '#FF8AC8', x0 - 0.36, 1.35, z); } c.block(HW - 1, HW - 0.2, -3.8, 3.8, 'machine'); c.inter(HW - 1.9, 0, 2.2, '坐下來打拉霸機「鶴之舞」', () => R.slotMachine()); lamp(HW - 1.4, 2.8, 0, '#FF8AC8', 0.6, 8); } catch (e) { console.warn('[slots]', e); } return r; }; }
  const css = document.createElement('style');
  css.textContent = '.sl{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}.sl canvas{width:min(300px,100%);image-rendering:auto;border:3px solid #6A4A8A;border-radius:8px;background:#2A1A3A}.sl-ui{flex:1;min-width:220px;display:grid;gap:8px}.sl-st b{font-size:1.4em;color:var(--gold,#C9A13A)}.sl-st small{display:block;opacity:.85}.sl-stops{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.sl-stops .btn{font-weight:bold}.sl-lever small{display:block;opacity:.8;font-size:.8em}.sl-pay{font-size:12px}';
  document.head.appendChild(css);
})(window.R);
