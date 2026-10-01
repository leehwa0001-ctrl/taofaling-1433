// 討伐令 1433：東鶴的時間與天氣
// 一天有早晚：在城裡（和建築物裡）走動時時間會過，1 小時＝真實的 45 秒；光線、天空、路燈、窗戶、路人的多寡跟著變。
// 天氣每天不同（calendar.js 的 R.eventsOf 算出 E.weather：晴、陰、小雪、大雪、暴風雪、雨）：雪下不下、天色、霧都照天氣。
// 起床是早上 7 點；從遺跡回來是下午；在街上待過半夜 12 點，就是熬夜到天亮（換日、重新整理一次城）。
(function (R) {
  const W = R.W, $ = id => document.getElementById(id);
  const T = () => THREE;
  const SEC_PER_HOUR = 45;

  // ---------- 時間 ----------
  R.hourNow = () => (R.S && R.S.hour != null ? R.S.hour : 8);
  R.timeLabel = h => {
    h = h == null ? R.hourNow() : h; h = ((h % 24) + 24) % 24;
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60), part = hh < 5 ? '深夜' : hh < 8 ? '清晨' : hh < 12 ? '上午' : hh < 13 ? '中午' : hh < 17 ? '下午' : hh < 19 ? '傍晚' : hh < 23 ? '晚上' : '深夜';
    return part + ' ' + (hh % 12 === 0 ? 12 : hh % 12) + ':' + String(mm).padStart(2, '0');
  };
  R.weatherNow = () => (R.eventsToday ? R.eventsToday().weather : '小雪') || '小雪';

  // ---------- 光線的關鍵時刻（晴天）：[幾點, 天空, 太陽（或月亮）的顏色, 太陽強度, 天光顏色, 天光強度, 路燈, 窗戶] ----------
  const KEYS = [
    [0, '#141C2C', '#8AA4D8', 0.26, '#4A5A7A', 0.36, 1, 1],
    [5, '#1E2638', '#8AA4D8', 0.24, '#4A5A7A', 0.38, 1, 0.75],
    [6.5, '#C0B0B0', '#FFD0B0', 0.6, '#B8B8C4', 0.62, 0.55, 0.6],
    [8, '#B8CCDC', '#FFE6C8', 1.1, '#DCE6EE', 0.95, 0, 0.3],
    [12, '#BCD0E0', '#FFF0DC', 1.2, '#E2EAF0', 1.0, 0, 0.22],
    [16, '#C8C8C4', '#FFD8A8', 1.0, '#DCE0E4', 0.9, 0, 0.35],
    [17.5, '#D8A888', '#FFBC88', 0.7, '#BCB0B4', 0.74, 0.5, 0.8],
    [19, '#3A3A58', '#7A90C0', 0.3, '#5A6488', 0.45, 1, 1],
    [24, '#141C2C', '#8AA4D8', 0.26, '#4A5A7A', 0.36, 1, 1]
  ];
  // 天氣：太陽強度、天光強度、天空變灰多少、霧的濃淡、雪（雨）的量、風
  const WX = {
    '晴': { sun: 1, hemi: 1, grey: 0, fog: 1, flakes: 0, wind: 0.3 },
    '陰': { sun: 0.55, hemi: 0.92, grey: 0.6, fog: 1.2, flakes: 0, wind: 0.5 },
    '小雪': { sun: 0.6, hemi: 0.92, grey: 0.5, fog: 1.3, flakes: 650, wind: 0.3 },
    '大雪': { sun: 0.45, hemi: 0.86, grey: 0.7, fog: 1.9, flakes: 1400, wind: 0.6 },
    '暴風雪': { sun: 0.35, hemi: 0.8, grey: 0.8, fog: 3.3, flakes: 2200, wind: 6 },
    '雨': { sun: 0.5, hemi: 0.88, grey: 0.65, fog: 1.4, flakes: 1200, wind: 0.4, rain: 1 }
  };
  R.flakeCount = E => Math.max(1, (WX[(E && E.weather) || '小雪'] || WX['小雪']).flakes);
  const lerp = (a, b, k) => a + (b - a) * k;
  const col = (hex, out) => out.set(hex).convertSRGBToLinear();
  const sample = h => {
    let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
    const a = KEYS[i], b = KEYS[i + 1], k = (h - a[0]) / (b[0] - a[0] || 1);
    return { a, b, k };
  };

  // ---------- 進城：找出要跟著時間變的東西 ----------
  let L = null, lightT = 0, walkT = 0;
  const setup = () => {
    const TH = T(), sc = W.scene, E = R.eventsToday ? R.eventsToday() : {}, wx = WX[E.weather] || WX['小雪'];
    L = { hemi: null, sun: W.moon, win: [], lamp: [], wx, rain: !!wx.rain, pts: [], sky: new TH.Color(), tmp: new TH.Color(), tmp2: new TH.Color() };
    sc.traverse(o => { if (o.isHemisphereLight) L.hemi = o; });
    const seen = new Set();
    sc.traverse(o => { if (!o.isMesh || !o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!m || seen.has(m) || !m.emissive) return; seen.add(m); const hx = m.emissive.getHexString(); if (m.userData.dayKind === 'win' || hx === col('#FFB050', L.tmp).getHexString()) { m.userData.dayKind = 'win'; m.userData.ei0 = m.userData.ei0 || m.emissiveIntensity; L.win.push(m); } else if (m.userData.dayKind === 'lamp' || hx === col('#FFE0A0', L.tmp).getHexString()) { m.userData.dayKind = 'lamp'; m.userData.ei0 = m.userData.ei0 || m.emissiveIntensity; L.lamp.push(m); } }); });
    // 路燈的光：只在人物附近的幾盞點上真的燈（燈的數量固定，不會一直重編著色器）
    for (let i = 0; i < 8; i++) { const p = new TH.PointLight(new TH.Color('#FFD8A0').convertSRGBToLinear(), 0, 13, 1.6); p.position.set(0, -50, 0); sc.add(p); L.pts.push(p); }
    // 雪或雨
    const tw = W.town; if (tw && tw.snow) { tw.snow.visible = wx.flakes > 0 && !wx.rain; tw.snow.userData.wind = wx.wind; }
    if (tw && wx.rain) {
      const n = wx.flakes, pos = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * 60, y = Math.random() * 18, z = (Math.random() - 0.5) * 60; pos.set([x, y, z, x - 0.05, y - 0.7, z], i * 6); }
      const g = new TH.BufferGeometry(); g.setAttribute('position', new TH.BufferAttribute(pos, 3));
      L.rainObj = new TH.LineSegments(g, new TH.LineBasicMaterial({ color: '#B8CCE0', transparent: true, opacity: 0.55, depthWrite: false })); L.rainObj.frustumCulled = false; tw.group.add(L.rainObj);
    }
    // 路人：最多的那些先全部蓋好，之後照時間決定有幾個人在街上
    L.walkers = tw ? tw.npcs.filter(n => n.walk && !n.patrol && !n.name && !n.guard) : [];
    L.walkers.forEach((n, i) => { n.rank = (i * 0.6180339) % 1; });   // 誰先回家：打散，不要整區一起消失
    lightT = 0; walkT = 0; apply(0, true);
  };
  // 白天有多少人在街上（0～1）：早上通勤、中午、傍晚最多，半夜很少；天氣不好的時候少一點
  const crowd = (h, wx) => {
    const base = h < 5 ? 0.12 : h < 7 ? 0.3 : h < 9 ? 0.95 : h < 17 ? 0.8 : h < 19.5 ? 1 : h < 22 ? 0.55 : 0.22;
    return base * (wx.flakes > 1300 ? 0.55 : wx.rain ? 0.7 : 1);
  };
  const apply = (dt, force) => {
    if (!L || !W.town) return;
    const h = ((R.hourNow() % 24) + 24) % 24, { a, b, k } = sample(h), wx = L.wx, TH = T();
    // 天空、霧：晴天的顏色往灰色靠（看天氣）
    col(a[1], L.sky).lerp(col(b[1], L.tmp), k);
    const dayness = Math.max(0, Math.min(1, (lerp(a[3], b[3], k) - 0.26) / 0.9));
    L.tmp2.set(dayness > 0.3 ? '#A0A8B0' : '#2A2E38').convertSRGBToLinear(); L.sky.lerp(L.tmp2, wx.grey * (0.5 + 0.5 * dayness));
    if (W.scene.background && W.scene.background.isColor) W.scene.background.copy(L.sky);
    if (W.scene.fog) { W.scene.fog.color.copy(L.sky); W.scene.fog.density = 0.009 * wx.fog * (dayness < 0.3 ? 1.25 : 1); }
    // 太陽、天光
    if (L.sun) { col(a[2], L.sun.color).lerp(col(b[2], L.tmp), k); L.sun.intensity = lerp(a[3], b[3], k) * (dayness > 0.3 ? wx.sun : 0.6 + 0.4 * wx.sun); }
    if (L.hemi) { col(a[4], L.hemi.color).lerp(col(b[4], L.tmp), k); L.hemi.intensity = lerp(a[5], b[5], k) * wx.hemi; }
    // 路燈、窗戶
    const lampK = lerp(a[6], b[6], k), winK = lerp(a[7], b[7], k);
    L.lamp.forEach(m => { m.emissiveIntensity = (m.userData.ei0 || 1) * (0.25 + 1.15 * lampK); });
    L.win.forEach(m => { m.emissiveIntensity = (m.userData.ei0 || 0.85) * (0.3 + 1.0 * winK); });
    L.lampK = lampK;
  };
  // 太陽的方向：早上從東邊、傍晚從西邊，越接近中午越高；晚上換成月亮
  const placeSun = P => {
    if (!L || !L.sun) return;
    const h = ((R.hourNow() % 24) + 24) % 24, day = h >= 6 && h <= 18.5, t = day ? (h - 6) / 12.5 : ((h + 24 - 18.5) % 24) / 11.5;
    const az = Math.PI * (0.15 + 0.7 * t), el = 0.35 + Math.sin(Math.PI * t) * (day ? 0.85 : 0.6);
    L.sun.position.set(P.x - Math.cos(az) * 40 * Math.cos(el), 40 * Math.sin(el) + 6, P.z + 18 - Math.sin(az) * 10);
    L.sun.target.position.set(P.x, 0, P.z);
  };
  const lampLights = P => {
    const tw = W.town; if (!L || !tw) return;
    const on = (L.lampK || 0) > 0.05 && !W.inside, list = on ? (tw.lamps || []).map(p => [p, (p[0] - P.x) ** 2 + (p[1] - P.z) ** 2]).filter(q => q[1] < 1600).sort((p, q) => p[1] - q[1]).slice(0, L.pts.length) : [];
    L.pts.forEach((p, i) => { const q = list[i]; if (q) { p.position.set(q[0][0], 3.4, q[0][1]); p.intensity = 1.9 * L.lampK; } else { p.intensity = 0; p.position.y = -50; } });
  };
  // 路人：照時間決定誰在街上；離人物太遠的不畫
  const walkers = P => {
    const tw = W.town; if (!L || !tw) return;
    const want = crowd(((R.hourNow() % 24) + 24) % 24, L.wx);
    L.walkers.forEach(n => {
      const off = n.rank >= want;
      // 回家的人從「看得到你的人」名單拿掉（不要把 n.watch 設成 null：props.js 的通緝、抓包會讀 n.watch.guard）
      if (off !== !!n.off) { n.off = off; const ws = tw.watchers, i = ws.indexOf(n); if (off && i >= 0) ws.splice(i, 1); else if (!off && i < 0 && n.watch) ws.push(n); }
      n.h.g.visible = !off && Math.abs(n.x - P.x) + Math.abs(n.z - P.z) < 90;
    });
  };

  // ---------- 接上：進城、每一格、狀態列 ----------
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => {
    if (R.S && R.S.pendingHour != null) { R.S.hour = R.S.pendingHour; R.S.pendingHour = null; }
    enter0(from, at);
    setup();
  };
  const step0 = R.townStep;
  R.townStep = dt => {
    const tw = W.town, P = W.P;
    // 時間往前走（在店面畫面、對話框打開時不走：那時候整個遊戲是暫停的）
    if (R.S && tw && !tw.rolling) {
      R.S.hour = (R.S.hour == null ? 8 : R.S.hour) + dt / SEC_PER_HOUR;
      if (R.S.hour >= 24 && !W.inside) rollOver();
    }
    step0(dt);
    if (!tw || !P || W.inside) return;
    lightT -= dt; if (lightT <= 0) { lightT = 0.25; apply(dt); lampLights(P); }
    walkT -= dt; if (walkT <= 0) { walkT = 0.5; walkers(P); }
    placeSun(P);
    // 雨絲往下掉，掉到地上回到上面
    if (L && L.rainObj) { const a = L.rainObj.geometry.attributes.position, v = a.array, fall = 16 * dt; for (let i = 0; i < v.length; i += 6) { v[i + 1] -= fall; v[i + 4] -= fall; v[i] -= fall * 0.07; v[i + 3] -= fall * 0.07; if (v[i + 4] < 0) { const x = (Math.random() - 0.5) * 60, z = (Math.random() - 0.5) * 60; v[i] = x; v[i + 1] = 18; v[i + 2] = z; v[i + 3] = x - 0.05; v[i + 4] = 17.3; v[i + 5] = z; } } a.needsUpdate = true; L.rainObj.position.set(P.x, 0, P.z); }
    // 鐘樓的時鐘照遊戲裡的時間走；整點敲鐘
    if (tw.clock) { const h = R.hourNow(), hh = h % 12, mm = (h % 1) * 60; tw.clock.h.rotation.z = -hh / 12 * Math.PI * 2; tw.clock.m.rotation.z = -mm / 60 * Math.PI * 2; }
  };
  // 在街上待過半夜：熬夜到天亮
  const rollOver = () => {
    const tw = W.town, P = W.P; if (!tw || !P) return;
    tw.rolling = true; R.S.pendingHour = 6;
    R.fade(() => {
      R.advanceDays(1);
      R.enterTownNow(tw.from, [P.x, P.z]);
      const E = R.eventsToday ? R.eventsToday() : {};
      R.banner(R.shortDate(), '在街上待到天亮了。' + (E.weather ? '今天的天氣：' + E.weather + '。' : ''));
    });
  };
  // 睡一晚：早上 7 點起床
  const sleep0 = R.sleepInn;
  if (sleep0) { R.sleepInn = () => { if (R.S) R.S.pendingHour = 7; sleep0(); }; R.sleep = R.sleepInn; }
  // 從遺跡回來：下午
  const end0 = R.endRun;
  R.endRun = () => { if (R.S) R.S.pendingHour = 14 + Math.random() * 3; end0(); };
  // 狀態列：日期下面加上時間、天氣
  const clock = () => {
    const where = $('r-where'); if (!where) return;
    let el = $('r-clock'); if (!el || !where.contains(el)) { el = document.createElement('small'); el.id = 'r-clock'; where.appendChild(el); }
    const t = R.timeLabel() + '・' + R.weatherNow(); if (el.textContent !== t) el.textContent = t;
  };
  const hud0 = R.townHud;
  R.townHud = (force, dt) => { hud0(force, dt); if (W.town && !W.run) clock(); };
  const ihud0 = R.interiorHud;
  if (ihud0) R.interiorHud = (force, dt) => { ihud0(force, dt); if (W.town && !W.run) clock(); };
  // 路人最多蓋幾個：城很大，白天要熱鬧；晚上、壞天氣的時候由上面的 walkers() 讓一部分人回家
  R.walkerCount = (E, dd) => (E.martial ? 22 : E.blizzard ? 40 : dd && dd.rest ? 190 : 160);
})(window.R);
