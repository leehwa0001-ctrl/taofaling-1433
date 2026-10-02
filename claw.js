// 討伐令 1433：夾娃娃機（取代 civic.js 原本只擲骰子的 R.ufoCatcher）
// 投一枚 3 費拉（四次 10 費拉）。← → 移動爪子（按住），按「放下」爪子就會降下去夾；夾不夾得住看對得準不準和娃娃的重量，
// 拉上去和搬到出口的路上也可能掉——掉在出口上面一樣算你的。夾到的娃娃是「小東西」，可以送人（R.GIFTS）。
(function (R) {
  const FW = 220, FH = 300, FLOOR = 286, TOP = 34, CHUTE = [6, 50], CHUTE_Y = 232, RAIL = [56, 206];
  const KINDS = [
    { k: 'plush_moss', name: '苔團娃娃', body: '#5A8A3A', ear: '#7AAA4A', eye: '#F2F0D0', w: 18, h: 16, wt: 0.9, desc: '圓滾滾的綠色娃娃。遺跡生物做成娃娃反而很可愛。' },
    { k: 'plush_tanuki', name: '鼓腹狸娃娃', body: '#8A6A4A', ear: '#5A4028', eye: '#1A1410', belly: '#E8D8B8', w: 18, h: 18, wt: 1.1, desc: '肚子圓圓的狸貓娃娃。' },
    { k: 'plush_cat', name: '招福貓', body: '#F0ECE2', ear: '#E8A0A0', eye: '#1A1410', belly: '#F0ECE2', w: 16, h: 18, wt: 1.0, desc: '舉著一隻手的白貓。商店街的店都放一隻。' },
    { k: 'plush_chick', name: '小雞娃娃', body: '#F2D24A', ear: '#E8823A', eye: '#1A1410', w: 14, h: 14, wt: 0.6, desc: '黃色的小雞，輕輕的。' },
    { k: 'plush_snow', name: '雪粒童娃娃', body: '#E8F2F8', ear: '#C8A060', eye: '#3A6ACF', w: 15, h: 17, wt: 0.8, desc: '戴著草帽的雪孩子娃娃。' },
    { k: 'plush_flag', name: '公會小旗吊飾', body: '#3E7A48', ear: '#C9A13A', eye: '#F2F0D0', w: 12, h: 14, wt: 0.5, desc: '公會東鶴分館的綠旗，做成鑰匙圈。' },
    { k: 'plush_moth', name: '燈蛾吊飾', body: '#D8CCB0', ear: '#FFE070', eye: '#1A1410', w: 16, h: 12, wt: 0.5, desc: '肚子會反光的燈蛾鑰匙圈。' },
    { k: 'plush_bear', name: '大熊娃娃', body: '#6A4A3A', ear: '#4A3020', eye: '#1A1410', belly: '#C8A888', w: 24, h: 22, wt: 1.6, desc: '很大一隻，很重，夾得到算你厲害。' }
  ];
  if (R.GIFTS) KINDS.forEach(d => { R.GIFTS[d.k] = R.GIFTS[d.k] || { name: d.name, price: 6, desc: d.desc }; });

  const pile = [];
  const refill = () => { while (pile.length < 11) { const d = KINDS[Math.floor(Math.random() * KINDS.length)], x = CHUTE[1] + 10 + Math.random() * (FW - CHUTE[1] - 22); pile.push({ d, x, y: FLOOR - d.h / 2 - Math.random() * 10, vy: 0, rot: (Math.random() - 0.5) * 0.4 }); } };
  // 娃娃：圓身體、兩隻耳朵、眼睛（點陣）
  const drawPrize = (x, p, gx, gy) => {
    const d = p.d, w = d.w, h = d.h, X = Math.round(gx - w / 2), Y = Math.round(gy - h / 2), P = (a, b, ww, hh, c) => { x.fillStyle = c; x.fillRect(X + a, Y + b, ww, hh); };
    if (d.k === 'plush_flag') { P(1, 0, 1, h, '#5A5A62'); P(2, 1, w - 3, h - 6, d.body); P(4, 3, 4, 4, d.ear); return; }
    if (d.k === 'plush_moth') { P(0, 2, w / 2 - 1, h - 5, d.body); P(w / 2 + 1, 2, w / 2 - 1, h - 5, d.body); P(w / 2 - 1, 1, 2, h - 2, '#5A4A3A'); P(w / 2 - 1, h - 4, 2, 3, d.ear); return; }
    P(2, 3, w - 4, h - 3, d.body); P(1, 5, w - 2, h - 7, d.body); P(2, 0, 4, 4, d.ear); P(w - 6, 0, 4, 4, d.ear);
    if (d.belly) P(Math.round(w / 2) - 3, Math.round(h / 2), 6, Math.round(h / 2) - 3, d.belly);
    P(Math.round(w / 2) - 4, Math.round(h / 2) - 3, 2, 2, d.eye); P(Math.round(w / 2) + 2, Math.round(h / 2) - 3, 2, 2, d.eye);
    if (d.k === 'plush_chick') P(Math.round(w / 2) - 1, Math.round(h / 2), 2, 2, d.ear);
  };

  R.ufoCatcher = () => {
    const S = R.S; S.clawCoins = S.clawCoins || 0; refill();
    R.sheet('<p class="kicker">站前・遊樂場</p><h2>夾娃娃機</h2><p class="note">玻璃後面堆著一堆娃娃。投幣之後，按住 ← → 移動爪子，按「放下」——爪子就會降下去夾。對準娃娃的正中間比較夾得住；大的比較重。</p>'
      + '<div class="pachi claw"><canvas id="cl-cv" width="' + FW + '" height="' + FH + '"></canvas><div class="pachi-ui">'
      + '<div class="pachi-st">還可以玩 <b id="cl-n">0</b> 次<small id="cl-info">先投幣。</small></div>'
      + '<div class="row claw-pad"><button type="button" class="btn" id="cl-l">← 移動</button><button type="button" class="btn" id="cl-r">移動 →</button></div>'
      + '<button type="button" class="btn pri pachi-fire" id="cl-drop">放下爪子<small>（電腦：← → 移動、空白鍵放下）</small></button>'
      + '<div class="row"><button type="button" class="btn" id="cl-c1">投幣（3 費拉）</button><button type="button" class="btn" id="cl-c4">四次（10 費拉）</button><button type="button" class="btn" id="cl-x">離開</button></div>'
      + '<p class="note" id="cl-won"></p></div></div>');
    const $ = id => document.getElementById(id), cv = $('cl-cv'), x = cv.getContext('2d');
    const claw = { x: 120, y: TOP, open: 1, st: 'idle', hold: null, t: 0 };
    let move = 0, won = [], loop = 0;
    const info = t => { $('cl-info').textContent = t; };
    const upd = () => { $('cl-n').textContent = S.clawCoins; $('cl-c1').disabled = S.gold < 3; $('cl-c4').disabled = S.gold < 10; $('cl-drop').disabled = !(claw.st === 'idle' && S.clawCoins > 0); $('cl-won').textContent = won.length ? '這次夾到：' + won.join('、') : ''; };
    const coin = (n, g) => { if (S.gold < g) return; S.gold -= g; S.clawCoins += n; R.sfx && R.sfx('coin'); info('← → 移動爪子，對準了就按「放下」。'); upd(); };
    $('cl-c1').onclick = () => coin(1, 3); $('cl-c4').onclick = () => coin(4, 10);
    const hold = (el, v) => { const on = e => { e.preventDefault(); move = v; }, off = () => { if (move === v) move = 0; }; el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off); };
    hold($('cl-l'), -1); hold($('cl-r'), 1);
    const drop = () => { if (claw.st !== 'idle' || S.clawCoins <= 0) return; S.clawCoins--; claw.st = 'down'; move = 0; info('爪子降下去了……'); upd(); };
    $('cl-drop').onclick = drop;
    const key = e => {
      if (!document.body.contains(cv)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); const v = e.key === 'ArrowLeft' ? -1 : 1; if (e.type === 'keydown') move = v; else if (move === v) move = 0; }
      if (e.key === ' ' && e.type === 'keydown') { e.preventDefault(); e.stopPropagation(); drop(); }
    };
    window.addEventListener('keydown', key, true); window.addEventListener('keyup', key, true);
    $('cl-x').onclick = () => R.closeSheet();
    // 夾：對得越準、娃娃越輕越容易；這台的爪子力道不大（店家）
    const grab = () => {
      const near = pile.map(p => [p, Math.abs(p.x - claw.x)]).filter(([p, d]) => d < p.d.w * 0.75 && Math.abs((claw.y + 14) - (p.y - p.d.h / 2)) < 14).sort((a, b) => a[1] - b[1])[0];
      if (!near) return null;
      const [p, d] = near, ch = Math.max(0, 0.82 - d / (p.d.w * 0.6)) / p.d.wt;
      return Math.random() < Math.min(0.85, ch * 0.75) ? p : 'miss';
    };
    let last = performance.now();
    const step = dt => {
      if (claw.st === 'idle') { claw.x = Math.max(RAIL[0] - 50, Math.min(RAIL[1], claw.x + move * 70 * dt)); }
      else if (claw.st === 'down') {
        claw.y += 80 * dt; claw.open = 1;
        const under = pile.filter(p => Math.abs(p.x - claw.x) < p.d.w * 0.6).map(p => p.y - p.d.h / 2).sort((a, b) => a - b)[0];
        const stop = Math.min(FLOOR - 18, under != null ? under - 12 : 1e9);
        if (claw.y >= stop) { claw.y = stop; claw.st = 'close'; claw.t = 0; }
      } else if (claw.st === 'close') {
        claw.t += dt; claw.open = Math.max(0, 1 - claw.t * 2.2);
        if (claw.t > 0.5) { const g = grab(); claw.hold = g && g !== 'miss' ? g : null; if (claw.hold) { const i = pile.indexOf(claw.hold); pile.splice(i, 1); claw.hold.off = claw.hold.x - claw.x; } claw.st = 'up'; R.sfx && R.sfx('ui'); }
      } else if (claw.st === 'up') {
        claw.y -= 70 * dt; if (claw.hold && claw.y < TOP + 30 && !claw.hold.jerked) { claw.hold.jerked = 1; if (Math.random() < 0.18 + Math.abs(claw.hold.off) / 40) release('爪子一晃，娃娃掉下去了！'); }
        if (claw.y <= TOP) { claw.y = TOP; claw.st = 'carry'; }
      } else if (claw.st === 'carry') {
        claw.x -= 70 * dt; if (claw.hold && Math.random() < 0.004 * claw.hold.d.wt) release('搬到一半，娃娃滑掉了……');
        if (claw.x <= (CHUTE[0] + CHUTE[1]) / 2) { claw.x = (CHUTE[0] + CHUTE[1]) / 2; claw.st = 'open'; claw.t = 0; }
      } else if (claw.st === 'open') {
        claw.t += dt; claw.open = Math.min(1, claw.t * 2.5); if (claw.hold && claw.t > 0.2) release(null);
        if (claw.t > 0.6) { claw.st = 'back'; }
      } else if (claw.st === 'back') { claw.x += 60 * dt; if (claw.x >= 120) { claw.x = 120; claw.st = 'idle'; if (!fall.length && !msgWin) info(S.clawCoins ? '再試一次？' : '投幣再玩一次。'); msgWin = false; upd(); } }
      if (claw.hold) { claw.hold.x = claw.x + claw.hold.off * 0.6; claw.hold.y = claw.y + 14 + claw.hold.d.h / 2; }
      // 掉下去的娃娃：落進出口就是你的
      for (let i = fall.length - 1; i >= 0; i--) {
        const p = fall[i]; p.vy += 420 * dt; p.y += p.vy * dt;
        if (p.x > CHUTE[0] && p.x < CHUTE[1] && p.y > CHUTE_Y) { fall.splice(i, 1); win(p); continue; }
        const ground = FLOOR - p.d.h / 2 - (p.x > CHUTE[0] - 4 && p.x < CHUTE[1] + 4 && p.y < CHUTE_Y ? 0 : 0);
        if (p.y >= ground) { p.y = ground; fall.splice(i, 1); if (p.x < CHUTE[1] + 6) p.x = CHUTE[1] + 8; pile.push(p); }
      }
    };
    const fall = []; let msgWin = false;
    const release = msg => { const p = claw.hold; claw.hold = null; p.vy = 0; fall.push(p); if (msg) info(msg); };
    const win = p => { msgWin = true; won.push(p.d.name); if (R.addGift) R.addGift(p.d.k, 1); R.save(); R.sfx && R.sfx('chest'); info('掉進出口了！夾到「' + p.d.name + '」。'); refill(); upd(); };
    const draw = () => {
      x.fillStyle = '#1A2238'; x.fillRect(0, 0, FW, FH);
      const g = x.createLinearGradient(0, 0, 0, FH); g.addColorStop(0, '#2E3A5E'); g.addColorStop(1, '#151A2C'); x.fillStyle = g; x.fillRect(4, 18, FW - 8, FH - 22);
      x.fillStyle = '#FF7AB8'; x.fillRect(0, 0, FW, 16); x.fillStyle = '#FFE070'; for (let i = 6; i < FW; i += 14) x.fillRect(i, 6, 6, 4);   // 頂上的燈
      x.fillStyle = '#6A6A78'; x.fillRect(4, TOP - 14, FW - 8, 3);   // 軌道
      // 出口
      x.fillStyle = '#0A0C14'; x.fillRect(CHUTE[0], CHUTE_Y, CHUTE[1] - CHUTE[0], FH - CHUTE_Y - 4); x.fillStyle = '#C8C4D8'; x.fillRect(CHUTE[1], CHUTE_Y - 2, 3, FH - CHUTE_Y - 2); x.fillRect(CHUTE[0], CHUTE_Y - 2, CHUTE[1] - CHUTE[0] + 3, 2);
      x.fillStyle = '#FFE070'; x.font = 'bold 9px sans-serif'; x.textAlign = 'center'; x.fillText('出口', (CHUTE[0] + CHUTE[1]) / 2, CHUTE_Y + 14);
      x.fillStyle = '#3A3050'; x.fillRect(CHUTE[1] + 3, FLOOR, FW - CHUTE[1] - 7, FH - FLOOR - 4);
      pile.slice().sort((a, b) => a.y - b.y).forEach(p => drawPrize(x, p, p.x, p.y)); fall.forEach(p => drawPrize(x, p, p.x, p.y));
      // 爪子：吊繩、本體、三支爪
      x.fillStyle = '#C8C8D0'; x.fillRect(Math.round(claw.x) - 1, TOP - 12, 2, Math.round(claw.y - TOP + 12));
      x.fillStyle = '#E8E8F0'; x.fillRect(Math.round(claw.x) - 6, Math.round(claw.y), 12, 6); x.fillStyle = '#FF7AB8'; x.fillRect(Math.round(claw.x) - 4, Math.round(claw.y) + 1, 8, 2);
      const o = claw.open * 7, cy0 = Math.round(claw.y) + 6;
      x.strokeStyle = '#D8D8E0'; x.lineWidth = 2; [-1, 1].forEach(sd => { x.beginPath(); x.moveTo(claw.x + sd * 4, cy0); x.lineTo(claw.x + sd * (5 + o), cy0 + 8); x.lineTo(claw.x + sd * (2 + o * 0.4), cy0 + 14); x.stroke(); });
      if (claw.hold) drawPrize(x, claw.hold, claw.hold.x, claw.hold.y);
      x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(10, 20, 6, FH - 30); x.fillRect(FW - 40, 20, 3, FH - 30);   // 玻璃的反光
    };
    const frame = now => {
      if (!document.body.contains(cv) || !R.sheetOpen()) { window.removeEventListener('keydown', key, true); window.removeEventListener('keyup', key, true); R.save(); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt); draw(); loop = requestAnimationFrame(frame);
    };
    R.clawDebug = { step: dt => { step(dt); draw(); }, claw, pile };   // 測試用：畫面在背景時一格一格推
    upd(); loop = requestAnimationFrame(frame);
  };
})(window.R);
