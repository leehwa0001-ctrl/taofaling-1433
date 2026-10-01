// 柏青哥「銀河」：真的打鋼珠（取代 civic.js 原本只擲骰子的 R.pachinko）
// 盤面：鋼珠從左下的發射軌道打上去，沿著外框繞過頂端，落進一整片釘子裡。
// 進中間的「啟動口」→ 液晶的三個數字轉一次（最多保留 4 次）；三個一樣 = 大當，右下的「大入賞口」打開幾個回合，要往右邊打。
// 兩邊的「袖入賞口」退幾顆珠。買珠 5 顆 1 費拉，換回來 6 顆 1 費拉（店家抽成）；沒換完的珠存在店裡（R.S.pachiBalls）。
(function (R) {
  const FW = 240, FH = 300, CX = 120, CY = 146, RAD = 112, RB = 2.4, G = 420;
  const RAIL_A0 = Math.PI * 0.75, RAIL_A1 = Math.PI * 1.27, INNER = RAD - 9;
  const LCD = [82, 86, 158, 142], HESO = { x: 120, y: 200 }, SODE = [{ x: 52, y: 188 }, { x: 158, y: 200 }], ATK = { x0: 182, x1: 204, y: 212 };
  const PAY = { heso: 1, sode: 2, atk: 12 }, P_WIN = 1 / 50, P_REACH = 0.14, ROUNDS = 3, ROUND_IN = 6, ROUND_T = 10;
  const BUY = 50, BUY_GOLD = 10, CASH = 6, OUT_Y = CY + RAD - 16;

  // ---------- 釘子 ----------
  const pins = [];
  const addPin = (x, y, r) => pins.push({ x, y, r: r || 1.2 });
  const special = [];
  // 命釘（啟動口上面的兩根）、啟動口的兩邊、袖入賞口的兩邊
  [[HESO.x - 6.5, HESO.y - 11], [HESO.x + 6.5, HESO.y - 11], [HESO.x - 6, HESO.y, 1.5], [HESO.x + 6, HESO.y, 1.5]].forEach(p => special.push(p));
  SODE.forEach(s => { special.push([s.x - 5.6, s.y, 1.5], [s.x + 5.6, s.y, 1.5], [s.x - 4, s.y - 8], [s.x + 4, s.y - 8]); });
  // 道釘：液晶下面兩排斜的釘子（間隔比珠子小，珠子會沿著滾），把珠子帶到命釘中間
  for (let i = 0; i < 7; i++) { special.push([74 + i * 5, 156 + i * 4]); special.push([166 - i * 5, 156 + i * 4]); }
  // 右邊的通道（右打ち）：一排隔板釘把右下角和盤面隔開，左邊打下來的珠子進不去；通道底下是大入賞口
  for (let y = 96; y <= ATK.y - 4; y += 4) special.push([ATK.x0 - 6, y]);
  [[194, 112], [204, 128], [190, 144], [202, 160], [192, 178], [198, 194]].forEach(p => special.push(p));
  special.forEach(([x, y, r]) => addPin(x, y, r));
  // 一整片交錯的釘子：離外框、液晶、入賞口都留一點空間
  for (let row = 0, y = 44; y < 226; row++, y += 10.5) for (let x = 12 + (row % 2) * 6.5; x < FW - 8; x += 13) {
    const d = Math.hypot(x - CX, y - CY); if (d > RAD - 12) continue;
    if (x > LCD[0] - 7 && x < LCD[2] + 7 && y > LCD[1] - 9 && y < LCD[3] + 6) continue;
    if (special.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 8)) continue;
    if (x > ATK.x0 - 12 && y > 90) continue;
    if (x > 70 && x < 170 && y > LCD[3] && y < HESO.y + 8 && y > 150 + Math.abs(x - CX) * 0.1) continue;   // 道釘下面空出來
    addPin(x, y);
  }
  // 右上的「返しゴム」：打太大力的珠子在這裡彈回盤面
  const RUBBER = [Math.PI * 1.78, Math.PI * 1.9];
  const MILLS = [{ x: 34, y: 140, a: 0 }, { x: 206, y: 140, a: 0 }];

  // ---------- 物理（和畫面分開，方便用 node 模擬機率） ----------
  const machine = (on, rnd) => {
    rnd = rnd || Math.random;
    const M = { balls: [], atkOpen: false, t: 0 };
    M.launch = pow => { const v = 365 + pow * 165 + (rnd() - 0.5) * 10; M.balls.push({ rail: true, a: RAIL_A0, v, x: 0, y: 0, vx: 0, vy: 0 }); };
    const bounce = (b, nx, ny, e) => { const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; } };
    const sub = h => {
      for (let i = M.balls.length - 1; i >= 0; i--) {
        const b = M.balls[i];
        if (b.rail) {
          const rr = RAD - RB; b.v += G * Math.cos(b.a) * h; b.v *= 1 - 0.05 * h; b.a += b.v / rr * h;
          b.x = CX + rr * Math.cos(b.a); b.y = CY + rr * Math.sin(b.a);
          if (b.a >= RAIL_A1) { b.rail = false; b.vx = -Math.sin(b.a) * b.v; b.vy = Math.cos(b.a) * b.v; }
          else if (b.v <= 0 && b.a <= RAIL_A0 + 0.02) { M.balls.splice(i, 1); on('foul'); }
          continue;
        }
        b.vy += G * h; b.x += b.vx * h; b.y += b.vy * h;
        let dx = b.x - CX, dy = b.y - CY, d = Math.hypot(dx, dy);
        // 外框
        if (d > RAD - RB) { const nx = dx / d, ny = dy / d; b.x = CX + nx * (RAD - RB); b.y = CY + ny * (RAD - RB); bounce(b, -nx, -ny, 0.3); }
        // 左邊的內軌（發射軌道的內側）
        let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI * 2;
        if (a > RAIL_A0 - 0.03 && a < RAIL_A1 && d > INNER - RB && d < INNER + 4) { const nx = dx / d, ny = dy / d; b.x = CX + nx * (INNER - RB); b.y = CY + ny * (INNER - RB); bounce(b, -nx, -ny, 0.4); }
        // 返しゴム：沿著外框衝過來的珠子往盤面裡彈
        if (a > RUBBER[0] && a < RUBBER[1] && d > RAD - 7) { const nx = dx / d, ny = dy / d, tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty; if (vt > 0) { b.vx += -vt * 1.45 * tx - nx * 50; b.vy += -vt * 1.45 * ty - ny * 50; } }
        // 釘子
        for (let k = 0; k < pins.length; k++) {
          const p = pins[k], px = b.x - p.x; if (px > 4 || px < -4) continue;
          const py = b.y - p.y; if (py > 4 || py < -4) continue;
          const dd = Math.hypot(px, py), lim = RB + p.r; if (dd >= lim || dd < 1e-6) continue;
          const nx = px / dd, ny = py / dd; b.x = p.x + nx * lim; b.y = p.y + ny * lim; bounce(b, nx, ny, 0.45);
          const j = (rnd() - 0.5) * 16; b.vx += -ny * j; b.vy += nx * j;
        }
        // 風車：碰到會被轉的方向帶走
        MILLS.forEach(m => { const mx = b.x - m.x, my = b.y - m.y, dd = Math.hypot(mx, my), lim = RB + 4; if (dd < lim && dd > 1e-6) { const nx = mx / dd, ny = my / dd; b.x = m.x + nx * lim; b.y = m.y + ny * lim; bounce(b, nx, ny, 0.3); b.vx += -ny * 28; b.vy += nx * 28; m.kick = 1; } });
        // 液晶（方框）
        { const qx = Math.max(LCD[0], Math.min(LCD[2], b.x)), qy = Math.max(LCD[1], Math.min(LCD[3], b.y)), ex = b.x - qx, ey = b.y - qy, dd = Math.hypot(ex, ey); if (dd < RB && dd > 1e-6) { const nx = ex / dd, ny = ey / dd; b.x = qx + nx * RB; b.y = qy + ny * RB; bounce(b, nx, ny, 0.35); } }
        // 大入賞口：關著的時候是一片蓋子
        if (!M.atkOpen && b.x > ATK.x0 && b.x < ATK.x1 && b.y > ATK.y - RB - 1 && b.y < ATK.y + 2 && b.vy > 0) { b.y = ATK.y - RB - 1; bounce(b, 0, -1, 0.3); }
        // 入賞
        let got = null;
        if (b.vy > 0 && b.y > HESO.y && b.y < HESO.y + 5 && Math.abs(b.x - HESO.x) < 2.6) got = 'heso';
        else if (b.vy > 0 && SODE.some(s => b.y > s.y && b.y < s.y + 5 && Math.abs(b.x - s.x) < 2)) got = 'sode';
        else if (M.atkOpen && b.y > ATK.y && b.y < ATK.y + 6 && b.x > ATK.x0 + 1 && b.x < ATK.x1 - 1) got = 'atk';
        else if (b.y > OUT_Y) got = 'out';
        if (got) { M.balls.splice(i, 1); on(got, b); }
      }
    };
    M.step = dt => { M.t += dt; const n = Math.max(1, Math.ceil(dt / 0.004)); for (let k = 0; k < n; k++) sub(dt / n); MILLS.forEach(m => { m.a += dt * (2 + (m.kick || 0) * 6); m.kick = Math.max(0, (m.kick || 0) - dt * 2); }); };
    return M;
  };

  // ---------- 液晶：三個數字，保留最多 4 次 ----------
  const slot = (rnd, ev) => {
    const L = { hold: 0, spin: null, show: [7, 7, 7], jack: null, msg: '', msgT: 0 };
    L.add = () => { if (L.hold < 4) L.hold++; };
    const pickDigits = (win, reach) => { const d = 1 + Math.floor(rnd() * 9); if (win) return [d, d, d]; if (reach) { let e = 1 + Math.floor(rnd() * 9); if (e === d) e = e % 9 + 1; return [d, e, d]; } let a = 1 + Math.floor(rnd() * 9), b = 1 + Math.floor(rnd() * 9); if (a === b) b = b % 9 + 1; return [a, 1 + Math.floor(rnd() * 9), b]; };
    L.step = dt => {
      if (L.msgT > 0) L.msgT -= dt;
      if (L.jack) return;
      if (!L.spin && L.hold > 0) { L.hold--; const win = rnd() < P_WIN, reach = win || rnd() < P_REACH; L.spin = { t: 0, win, reach, fin: pickDigits(win, reach), dur: reach ? 4.6 : 2.0 }; if (reach) ev('reach'); }
      const s = L.spin; if (!s) return;
      s.t += dt;
      // 左、右先停，中間最後停（聽牌的時候慢慢轉）
      const stop = [0.8, s.dur, 1.3];
      L.show = s.fin.map((d, i) => s.t >= stop[i] ? d : 1 + Math.floor((s.t * (i === 1 && s.reach && s.t > 1.3 ? 6 : 18) + i * 3) % 9));
      if (s.t >= s.dur + 0.3) { L.spin = null; if (s.win) ev('win'); else if (s.reach) ev('miss'); }
    };
    return L;
  };

  // ---------- 畫面 ----------
  let loop = 0;
  R.pachinko = () => {
    const S = R.S; S.pachiBalls = S.pachiBalls || 0;
    R.sheet('<p class="kicker">站前</p><h2>柏青哥「銀河」</h2><p class="note">店裡吵得聽不到自己說話。找一台空著的坐下。把手轉到適合的力道、按住就會一直打；珠子進中間的「啟動口」，液晶的數字就轉一次，三個一樣是大當——右下的大入賞口打開，往右邊打。</p>'
      + '<div class="pachi"><canvas id="pc-cv" width="' + FW + '" height="' + FH + '"></canvas><div class="pachi-ui">'
      + '<div class="pachi-st">持珠 <b id="pc-n">0</b> 顆<small id="pc-info"></small></div>'
      + '<label class="pachi-pow">把手的力道<input type="range" id="pc-pow" min="0" max="100" value="38"><span><i>← 左邊打</i><i>右邊打 →</i></span></label>'
      + '<button type="button" class="btn pri pachi-fire" id="pc-fire">按住發射<small>（電腦：按住空白鍵，← → 調力道）</small></button>'
      + '<div class="row"><button type="button" class="btn" id="pc-buy">買一盒珠（' + BUY_GOLD + ' 費拉＝' + BUY + ' 顆）</button><button type="button" class="btn gold" id="pc-cash">換成費拉（' + CASH + ' 顆＝1 費拉）</button><button type="button" class="btn" id="pc-x">離開</button></div>'
      + '</div></div>');
    const $ = id => document.getElementById(id), cv = $('pc-cv'), x = cv.getContext('2d');
    const rnd = Math.random;
    let firing = false, cd = 0, hits = 0, toast = '';
    const info = t => { toast = t; $('pc-info').textContent = t; };
    const upd = () => { $('pc-n').textContent = S.pachiBalls; $('pc-buy').disabled = S.gold < BUY_GOLD; $('pc-cash').disabled = S.pachiBalls < CASH; };
    const L = slot(rnd, e => {
      if (e === 'reach') { L.msg = '聽牌！'; L.msgT = 4.6; R.sfx && R.sfx('pick'); }
      if (e === 'miss') { L.msg = '……可惜'; L.msgT = 1.2; }
      if (e === 'win') { L.jack = { round: 1, inn: 0, t: 0, gap: 1.2 }; L.msg = '大當！'; L.msgT = 2.5; R.sfx && R.sfx('chest'); info('大當！把手轉到右邊，往右下的大入賞口打。'); }
    });
    const M = machine(k => {
      if (k === 'heso') { S.pachiBalls += PAY.heso; L.add(); R.sfx && R.sfx('coin'); }
      else if (k === 'sode') { S.pachiBalls += PAY.sode; R.sfx && R.sfx('coin'); }
      else if (k === 'atk') { S.pachiBalls += PAY.atk; hits++; if (L.jack) L.jack.inn++; R.sfx && R.sfx('coin'); }
      else if (k === 'foul') S.pachiBalls++;   // 力道太小，珠子掉回發射口
      upd();
    }, rnd);
    // 大當的回合：每回合大入賞口開 10 秒或進 8 顆
    const jackStep = dt => {
      const J = L.jack; if (!J) return;
      if (J.gap > 0) { J.gap -= dt; M.atkOpen = false; if (J.gap <= 0) { J.t = 0; J.inn = 0; } return; }
      M.atkOpen = true; J.t += dt;
      if (J.inn >= ROUND_IN || J.t >= ROUND_T) {
        M.atkOpen = false;
        if (J.round >= ROUNDS) { L.jack = null; L.msg = '大當結束'; L.msgT = 2; info('大當結束。大入賞口一共進了 ' + hits + ' 顆。'); hits = 0; R.save(); }
        else { J.round++; J.gap = 1.2; }
      }
    };
    // 靜態的底圖：機台外框、星空、釘子
    const base = document.createElement('canvas'); base.width = FW; base.height = FH;
    { const b = base.getContext('2d');
      b.fillStyle = '#B8B4C4'; b.fillRect(0, 0, FW, FH); b.fillStyle = '#8A8698'; for (let i = 0; i < FH; i += 4) b.fillRect(0, i, FW, 1);
      const gr = b.createRadialGradient(CX, CY - 30, 10, CX, CY, RAD); gr.addColorStop(0, '#2A2A6A'); gr.addColorStop(0.7, '#141436'); gr.addColorStop(1, '#0A0A1E');
      b.fillStyle = gr; b.beginPath(); b.arc(CX, CY, RAD, 0, Math.PI * 2); b.fill();
      // 銀河帶與星星
      b.save(); b.beginPath(); b.arc(CX, CY, RAD, 0, Math.PI * 2); b.clip();
      b.globalAlpha = 0.25; b.fillStyle = '#8A7AFF'; b.beginPath(); b.ellipse(CX, CY - 10, RAD, 22, -0.5, 0, Math.PI * 2); b.fill(); b.globalAlpha = 1;
      for (let i = 0; i < 140; i++) { const sx = Math.random() * FW, sy = Math.random() * FH; b.fillStyle = ['#FFFFFF', '#FFE08A', '#9AD8FF'][i % 3]; b.fillRect(sx | 0, sy | 0, 1, 1); }
      b.restore();
      // 外框的鍍鉻
      b.strokeStyle = '#E8E6F0'; b.lineWidth = 3; b.beginPath(); b.arc(CX, CY, RAD + 1.5, 0, Math.PI * 2); b.stroke();
      b.strokeStyle = '#6A6878'; b.lineWidth = 1; b.beginPath(); b.arc(CX, CY, RAD + 3.5, 0, Math.PI * 2); b.stroke();
      // 發射軌道的內軌
      b.strokeStyle = '#D8D6E2'; b.lineWidth = 1.5; b.beginPath(); b.arc(CX, CY, INNER, RAIL_A0 - 0.03, RAIL_A1); b.stroke();
      // 機台名字
      b.fillStyle = '#2A1A4A'; b.fillRect(70, 262, 100, 30); b.fillStyle = '#FFE08A'; b.font = 'bold 16px sans-serif'; b.textAlign = 'center'; b.fillText('銀　河', CX, 283);
      // 釘子
      pins.forEach(p => { b.fillStyle = '#5A5A6A'; b.fillRect(Math.round(p.x) - 1, Math.round(p.y), 2, 2); b.fillStyle = '#F0F0F8'; b.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 1); });
      // 啟動口、袖入賞口
      const cup = (cx, cy, col, lab) => { b.fillStyle = col; b.fillRect(cx - 5, cy + 1, 10, 4); b.fillStyle = '#0A0A1E'; b.fillRect(cx - 3, cy + 1, 6, 2); b.fillStyle = '#FFFFFF'; b.font = '7px sans-serif'; b.fillText(lab, cx, cy + 13); };
      cup(HESO.x, HESO.y, '#FFC83A', '啟動口'); SODE.forEach(s => cup(s.x, s.y, '#3AC87A', ''));
    }
    const draw = () => {
      x.drawImage(base, 0, 0);
      const t = M.t, J = L.jack;
      // 外框的燈：平常慢慢閃，轉數字的時候跑馬燈，大當整圈紅金一起閃
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, on = J ? (Math.floor(t * 8) + i) % 2 : L.spin ? (Math.floor(t * 14) % 28) === i || (Math.floor(t * 14) + 14) % 28 === i : (Math.floor(t * 2) + i) % 7 === 0; x.fillStyle = on ? (J ? (i % 2 ? '#FF3A3A' : '#FFE08A') : '#9AD8FF') : '#4A4858'; x.fillRect(Math.round(CX + (RAD + 6) * Math.cos(a)) - 1, Math.round(CY + (RAD + 6) * Math.sin(a)) - 1, 3, 3); }
      // 風車
      MILLS.forEach(m => { x.save(); x.translate(m.x, m.y); x.rotate(m.a); x.fillStyle = '#E8E6F0'; for (let k = 0; k < 4; k++) { x.rotate(Math.PI / 2); x.fillRect(-0.5, -4.5, 1.5, 4); } x.fillStyle = '#C83A3A'; x.fillRect(-1, -1, 2, 2); x.restore(); });
      // 液晶
      x.fillStyle = '#05050E'; x.fillRect(LCD[0], LCD[1], LCD[2] - LCD[0], LCD[3] - LCD[1]); x.strokeStyle = J ? (Math.floor(t * 6) % 2 ? '#FF3A3A' : '#FFE08A') : '#C8C6D8'; x.lineWidth = 2; x.strokeRect(LCD[0] - 1, LCD[1] - 1, LCD[2] - LCD[0] + 2, LCD[3] - LCD[1] + 2);
      x.textAlign = 'center'; x.font = 'bold 22px monospace';
      const COLS = ['#FF5A5A', '#FFE08A', '#7AE0FF', '#9AFF8A', '#FF9AE0', '#FFFFFF', '#FFB83A', '#C8A8FF', '#FF5A5A'];
      L.show.forEach((d, i) => { const cx2 = LCD[0] + 13 + i * 25, spin = L.spin && !(L.spin.t >= [0.8, L.spin.dur, 1.3][i]); x.fillStyle = '#14142A'; x.fillRect(cx2 - 10, LCD[1] + 10, 20, 28); x.fillStyle = spin ? '#8A8AA8' : COLS[d - 1]; x.fillText(String(d), cx2, LCD[1] + 32); });
      x.font = '9px sans-serif'; x.fillStyle = '#FFE08A';
      const msg = J ? (J.gap > 0 ? '第 ' + J.round + ' 回合' : '第 ' + J.round + '／' + ROUNDS + ' 回合　往右打 →') : L.msgT > 0 ? L.msg : L.spin && L.spin.reach && L.spin.t > 1.3 ? '聽牌！' : '銀河';
      x.fillText(msg, CX, LCD[3] - 6);
      // 保留燈
      for (let i = 0; i < 4; i++) { x.fillStyle = i < L.hold ? '#FF5A5A' : '#3A3848'; x.fillRect(HESO.x - 11 + i * 6, HESO.y + 16, 4, 3); }
      // 大入賞口
      x.fillStyle = M.atkOpen ? (Math.floor(t * 8) % 2 ? '#FF3A3A' : '#FFE08A') : '#A82A2A'; x.fillRect(ATK.x0, ATK.y - 1, ATK.x1 - ATK.x0, 3);
      if (M.atkOpen) { x.fillStyle = '#05050E'; x.fillRect(ATK.x0 + 2, ATK.y + 1, ATK.x1 - ATK.x0 - 4, 5); }
      x.fillStyle = '#FFFFFF'; x.font = '7px sans-serif'; x.fillText('大入賞口', (ATK.x0 + ATK.x1) / 2, ATK.y + 14);
      // 鋼珠
      M.balls.forEach(b => { x.fillStyle = '#8A8A98'; x.beginPath(); x.arc(b.x, b.y, RB, 0, Math.PI * 2); x.fill(); x.fillStyle = '#FFFFFF'; x.fillRect(Math.round(b.x - 1.2), Math.round(b.y - 1.4), 1, 1); });
    };
    const pow = () => +$('pc-pow').value / 100;
    const key = e => {
      if (!document.body.contains(cv)) return;
      if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); firing = e.type === 'keydown'; }
      if (e.type === 'keydown' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); const p = $('pc-pow'); p.value = Math.max(0, Math.min(100, +p.value + (e.key === 'ArrowLeft' ? -3 : 3))); }
    };
    window.addEventListener('keydown', key, true); window.addEventListener('keyup', key, true);
    const fb = $('pc-fire');
    fb.onpointerdown = e => { e.preventDefault(); firing = true; try { fb.setPointerCapture(e.pointerId); } catch (er) { } };
    fb.onpointerup = fb.onpointercancel = () => { firing = false; };
    fb.oncontextmenu = e => e.preventDefault();
    $('pc-buy').onclick = () => { if (S.gold < BUY_GOLD) return; S.gold -= BUY_GOLD; S.pachiBalls += BUY; R.save(); upd(); };
    $('pc-cash').onclick = () => { const g = Math.floor(S.pachiBalls / CASH); if (!g) return; S.pachiBalls -= g * CASH; S.gold += g; R.save(); upd(); info('在櫃台換了 ' + g + ' 費拉。'); R.sfx && R.sfx('coin'); };
    $('pc-x').onclick = () => R.closeSheet();
    if (!S.pachiBalls && S.gold >= BUY_GOLD) { S.gold -= BUY_GOLD; S.pachiBalls = BUY; R.save(); info('先買了一盒珠（' + BUY_GOLD + ' 費拉）。'); }
    else if (S.pachiBalls) info('店裡存著你上次沒換的珠。');
    upd();
    // 主迴圈：表單關掉就停，珠子留在存珠
    cancelAnimationFrame(loop);
    let last = performance.now(), saveT = 0;
    const frame = now => {
      if (!document.body.contains(cv) || !R.sheetOpen()) { window.removeEventListener('keydown', key, true); window.removeEventListener('keyup', key, true); R.save(); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      cd -= dt; if (firing && cd <= 0 && S.pachiBalls > 0) { S.pachiBalls--; M.launch(pow()); cd = 0.6; upd(); }
      if (firing && S.pachiBalls <= 0 && !M.balls.length && toast !== '珠子打完了。') info('珠子打完了。');
      M.step(dt); L.step(dt); jackStep(dt); draw();
      saveT += dt; if (saveT > 5) { saveT = 0; R.save(); }
      loop = requestAnimationFrame(frame);
    };
    loop = requestAnimationFrame(frame);
  };
  R.PACHI = { machine, slot, pins, P_WIN, PAY, ROUNDS, ROUND_IN, BUY, BUY_GOLD, CASH };
})(window.R);
