// 討伐令 1433：街上的人更多樣（作者：NPC 全部豐富化）
// - 長椅上坐著人（老人家、學生、上班族、主婦），白天才在；可以和他們說話；你坐另一邊。
// - 站在路邊聊天的兩個人：偷聽得到傳聞（遺跡、城裡的事、劇情人物的小道消息）。
// - 公園裡玩雪的學生（白天、不是暴風雪）：偶爾一顆雪球打在你背上。
// - 站前廣場的街頭藝人（早上十點到晚上九點）：投一枚費拉，聽一段三味線（用 R.AUDIO.ctx 合成）。
// - 晚上（六點到半夜）站前出現屋台：拉麵、關東煮；吃了下一趟遺跡有一點加成（和百貨的食堂同一套 R.S.buff）。
(function (R) {
  const W = R.W, C = R.CITY, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const TOPS = ['#3A4A5A', '#5A3A3A', '#3A5A4A', '#6A5A3A', '#4A3A5A', '#7A6A5A', '#2E2E38', '#8A4A3A', '#3A6A8A', '#C8B8A0'], HAIRS = ['#1A1410', '#2A2420', '#4A3424', '#6A4A2E', '#8A8A88', '#C8C0B0'];
  const hour = () => (R.hourNow ? ((R.hourNow() % 24) + 24) % 24 : 12);
  const HS = ['short', 'long', 'ponytail', 'bun', 'bob', 'crop', 'spiky'];
  const ROLES = {
    old: { name: '老人家', hair: ['#C8C0B0', '#8A8A88'], lines: ['「年輕的時候，東鶴還沒有魔導路燈，晚上黑漆漆的。」', '「以前要約人，就約在城門。我到現在還是不太會認新路名。」', '「冬天曬太陽最舒服。」', '「我孫子也想當勇者……我叫他去念書。」'] },
    student: { name: '學生', top: ['#2E3A5A', '#1E2A3A'], lines: ['「明天要考試……可是好想去遊樂場。」', '「聽說城西遺跡的入口，晚上會發光。」', '「勇者證要十六歲才能考。再等兩年。」'] },
    salary: { name: '上班族', top: ['#2E2E38', '#3A3A48'], lines: ['「午休只剩十分鐘……」', '「德克斯凡的新機器，課長說要學會操作。」', '「最近竊案很多，公司的保險箱多加了一道鎖。」'] },
    mama: { name: '主婦', top: ['#8A4A5A', '#6A5A3A', '#C8A888'], lines: ['「河西超市的白蘿蔔今天特價。」', '「孩子的學費又漲了。」', '「聽說赤提燈的老闆娘以前也是勇者。」'] }
  };
  const GOSSIP = ['「北山礦坑的深層，又有人沒回來。」', '「西市口的兌換所說，赤金越來越難驗了。」', '「聽說公會二樓的資料室，有一本禁止外借的圖鑑。」', '「望月家的人，刀快得看不見。」', '「德克斯凡的貨車昨天在國道上翻了，滿地都是零件。」', '「魔族？東鶴哪有魔族。……你別嚇我。」', '「縣廳要蓋新的大橋，預算還在吵。」', '「站前的柏青哥，昨天有人大當十連莊。」', '「湯山村的溫泉旅館，冬天的客人變少了。」', '「海那邊的千歲空，聽說也冒出了新的遺跡。」'];
  let L = null;
  const mkNpc = (tw, x, z, rot, role, extra, full) => {
    const r = ROLES[role] || {}, v = Math.floor(rnd() * 4), top = r.top ? r.top[v % r.top.length] : TOPS[(v * 3 + role.length) % TOPS.length], hair = r.hair ? r.hair[v % r.hair.length] : HAIRS[v % HAIRS.length];
    const h = R.makeHero('warrior', null, { pool: (full ? 'slf_' : 'sl_') + role + v, lite: full ? 0 : 1, top, hair, cloak: TOPS[(v + 5) % TOPS.length], hs: HS[(v * 2 + role.length) % HS.length], acc: role === 'old' && v < 2 ? 'glasses' : role === 'mama' && v === 1 ? 'scarf' : null, accCol: '#8A3A2E', weapon: null, shield: false });
    h.g.position.set(x, 0, z); h.g.rotation.y = rot; tw.group.add(h.g);
    const n = Object.assign({ h, x, z, rot, name: null, life: 1, role }, extra || {}); tw.npcs.push(n); return n;
  };
  const blocked = (x, z) => R.col.list.some(b => b.on !== false && b.tag !== 'deco' && x > b.x0 - 0.4 && x < b.x1 + 0.4 && z > b.z0 - 0.4 && z < b.z1 + 0.4);
  const freeNear = (x, z) => { for (let r = 0; r <= 8; r += 0.5) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, nx = x + Math.sin(a) * r, nz = z + Math.cos(a) * r; if (!blocked(nx, nz) && !blocked(nx + 1.2, nz)) return [nx, nz]; } return null; };
  const say = (who, lines) => R.townTalk(who, lines);

  // ---------- 三味線：一小段五聲音階 ----------
  const shamisen = () => {
    const A = R.AUDIO, c = A && A.ctx; if (!c || (R.isMuted && R.isMuted())) return; const v = (A.VOL ? A.VOL.sfx : 0.8) * 0.25, t0 = c.currentTime + 0.05;
    const scale = [293.7, 329.6, 392, 440, 523.3, 587.3, 659.3], notes = Array.from({ length: 10 }, () => pick(scale));
    notes.forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(), t = t0 + i * 0.26 + (i % 3 === 2 ? 0.1 : 0); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.01, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 2400; o.connect(fl); fl.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.45); });
  };

  // ---------- 蓋 ----------
  const build = tw => {
    const TH = THREE; L = { sit: [], pairs: [], kids: [], busk: null, carts: [], t: 0, ballT: 20 };
    // 再多擺幾張長椅：公園、樹林、站前、西市口（城裡原本只有八張）
    { const wood = new TH.MeshLambertMaterial({ color: '#6A4A2E' }), leg = new TH.MeshLambertMaterial({ color: '#4A3424' }), snowM = new TH.MeshLambertMaterial({ color: '#E8EEF2' });
      const spots = [];
      (C.PARKS || []).forEach(pk => { spots.push([(pk[0] * 2 + pk[2]) / 3, (pk[1] + pk[3]) / 2], [(pk[0] + pk[2] * 2) / 3, (pk[1] + pk[3]) / 2]); });
      [C.Z && C.Z.park, C.Z && C.Z.grove].filter(Boolean).forEach(pk => spots.push([(pk[0] + pk[2]) / 2 + 10, pk[3] - 6]));
      if (C.PLAZA) spots.push([C.PLAZA[0] + 60, C.PLAZA[1] + 6], [C.PLAZA[2] - 60, C.PLAZA[1] + 6]);
      if (C.SQUARE) { const [cx, cy, rx, ry] = C.SQUARE; spots.push([cx - rx * 0.6, cy + ry + 2], [cx + rx * 0.6, cy + ry + 2]); }
      spots.forEach(([sx, sy]) => {
        const p = freeNear(C.WX(sx), C.WZ(sy)); if (!p || blocked(p[0] - 1.2, p[1]) || blocked(p[0] + 1.2, p[1]) || blocked(p[0], p[1] + 1)) return; const [x, z] = p, g = new TH.Group();
        const m = (geo, mat, ox, oy, oz) => { const o = new TH.Mesh(geo, mat); o.position.set(ox, oy, oz); o.castShadow = true; g.add(o); };
        m(new TH.BoxGeometry(2.2, 0.1, 0.5), wood, 0, 0.48, 0); m(new TH.BoxGeometry(2.2, 0.5, 0.08), wood, 0, 0.8, -0.24); [-0.9, 0.9].forEach(o => m(new TH.BoxGeometry(0.12, 0.48, 0.4), leg, o, 0.24, 0)); m(new TH.BoxGeometry(2.0, 0.04, 0.4), snowM, 0, 0.55, 0);
        g.position.set(x, 0, z); tw.group.add(g); R.addBox(x - 1.1, x + 1.1, z - 0.3, z + 0.3, 'deco');
        tw.inter.push({ x, z: z + 0.8, r: 1.4, label: '坐一下', act: () => R.sitDown && R.sitDown(x, z + 0.32) });
      }); }
    // 長椅：一天換一批
    const benches = tw.inter.filter(it => it.label === '坐一下' && !it.follow);
    benches.sort(() => rnd() - 0.5).slice(0, Math.min(16, Math.ceil(benches.length * 0.6))).forEach(it => {
      const bx = it.x, bz = it.z - 0.8, role = pick(Object.keys(ROLES)), n = mkNpc(tw, bx + 0.55, bz + 0.32, 0, role, null, true); n.h.sit = true;
      it.act = () => R.sitDown && R.sitDown(bx - 0.55, bz + 0.32);
      tw.inter.push({ follow: n, x: n.x, z: n.z, r: 1.5, label: '和長椅上的' + ROLES[role].name + '說話', act: () => say(ROLES[role].name, [pick(ROLES[role].lines)]), when: () => n.h.g.visible });
      L.sit.push(n);
    });
    // 聊天的兩個人：商店街、站前、西市口、新商區的人行道
    const busy = C.nodes.filter(([sx, sy]) => (sy > 290 && sy < 360 && sx > 380 && sx < 760) || (sx > 560 && sx < 640 && sy > 580 && sy < 660) || (sx > 780 && sx < 900 && sy > 300 && sy < 600));
    for (let i = 0; i < 9 && busy.length; i++) {
      const [sx, sy] = busy.splice(Math.floor(rnd() * busy.length), 1)[0], p = freeNear(C.WX(sx) + 2, C.WZ(sy) + 2); if (!p) continue;
      const a = mkNpc(tw, p[0], p[1], Math.PI / 2, pick(['salary', 'mama', 'student', 'old'])), b = mkNpc(tw, p[0] + 1.1, p[1], -Math.PI / 2, pick(['salary', 'mama', 'student', 'old']));
      tw.inter.push({ follow: a, x: a.x, z: a.z, r: 2.2, label: '偷聽他們聊天', act: () => say('路邊聊天的人', [pick(GOSSIP), '（說完，兩個人看了你一眼，換了一個話題。）']), when: () => a.h.g.visible });
      L.pairs.push([a, b]);
    }
    // 公園裡玩雪的學生
    const parks = [C.Z && C.Z.park, C.PARKS && C.PARKS[0]].filter(Boolean);
    parks.forEach(pk => { const cx = C.WX((pk[0] + pk[2]) / 2), cz = C.WZ((pk[1] + pk[3]) / 2), rr = Math.min(pk[2] - pk[0], pk[3] - pk[1]) * C.S * 0.3; for (let i = 0; i < 3; i++) { const k = mkNpc(tw, cx, cz, 0, 'student', { off: true, cx, cz, rr: rr * (0.6 + i * 0.25), ph: i * 2.1, sp: 0.5 + rnd() * 0.3 }); L.kids.push(k); tw.inter.push({ follow: k, x: k.x, z: k.z, r: 1.6, label: '和玩雪的學生說話', act: () => say('玩雪的學生', [pick(['「要不要一起打雪仗？」', '「我堆的雪人比較大！」', '「放學了！」'])]), when: () => k.h.g.visible }); } });
    // 站前的街頭藝人
    { const p = freeNear(C.WX(604), C.WZ(302)); if (p) { const n = mkNpc(tw, p[0], p[1], 0, 'old'); L.busk = n; tw.inter.push({ follow: n, x: n.x, z: n.z, r: 2.2, label: '聽街頭藝人彈三味線（投 1 費拉）', when: () => n.h.g.visible, act: () => { if (R.S.gold < 1) { say('街頭藝人', ['（他朝你點點頭，繼續彈。）']); return; } R.S.gold -= 1; R.save(); shamisen(); say('街頭藝人', [pick(['「謝啦。這一首叫《雪夜的渡口》。」', '「還想聽哪首？先說，我不一定會彈。」', '「年輕人，下遺跡要小心。」']), '（琴聲在站前廣場上散開。）']); } }); } }
    // 屋台：拉麵、關東煮（晚上才擺出來）
    const cart = (sx, sy, name, col, menu) => {
      const p = freeNear(C.WX(sx), C.WZ(sy)); if (!p) return; const [x, z] = p, g = new TH.Group(), lam = c2 => new TH.MeshLambertMaterial({ color: c2 });
      const box = (w, h, d, c2, ox, oy, oz) => { const m = new TH.Mesh(new TH.BoxGeometry(w, h, d), typeof c2 === 'string' ? lam(c2) : c2); m.position.set(ox, oy, oz); m.castShadow = true; g.add(m); return m; };
      box(2.4, 1.0, 1.0, '#6A4A30', 0, 0.5, 0); box(2.6, 0.08, 1.3, '#8A6A44', 0, 1.04, 0.1); [-1.15, 1.15].forEach(o => box(0.08, 1.3, 0.08, '#4A3424', o, 1.65, 0.45)); box(2.7, 0.08, 0.7, '#3A2A1C', 0, 2.3, 0.4);
      [-0.9, -0.3, 0.3, 0.9].forEach(o => box(0.56, 0.42, 0.03, col, o, 2.04, 0.76)); box(2.4, 0.3, 0.06, '#5A3E28', 0, 1.2, -0.45);
      const lantern = new TH.Mesh(new TH.CylinderGeometry(0.2, 0.2, 0.42, 8), new TH.MeshBasicMaterial({ color: '#FF5A3A' })); lantern.position.set(1.32, 1.95, 0.76); g.add(lantern);
      const steam = new TH.Mesh(new TH.SphereGeometry(0.3, 6, 5), new TH.MeshBasicMaterial({ color: '#F4F4F4', transparent: true, opacity: 0.35, depthWrite: false })); steam.position.set(-0.5, 1.5, 0); g.add(steam); g.userData.steam = steam;
      [-0.6, 0.6].forEach(o => box(0.4, 0.5, 0.4, '#5A3E28', o, 0.25, 1.1));
      g.position.set(x, 0, z); tw.group.add(g); tw.lamps.push([x, z + 0.8]); const b = R.addBox(x - 1.3, x + 1.3, z - 0.6, z + 0.6, 'deco');
      const v = mkNpc(tw, x, z - 0.9, 0, 'salary'); v.h.g.visible = false;
      tw.inter.push({ x, z: z + 1.4, r: 2, label: name, when: () => g.visible, act: () => menu() });
      L.carts.push({ g, b, v });
    };
    const eat = (who, food, price, buff, lines) => () => { if (R.S.gold < price) { R.toast('錢不夠。'); return; } R.S.gold -= price; R.S.buff = { kind: 'yatai', b: buff, until: R.S.day }; R.save(); say(who, lines.concat(['（下一趟遺跡：' + Object.keys(buff).map(k => ({ hp: '生命', mp: '魔力', regen: '回復' })[k] + ' 稍微提高').join('、') + '）'])); };
    cart(566, 312, '屋台拉麵（一碗 8 費拉）', '#C83A3A', eat('拉麵屋台的老闆', '拉麵', 8, { hp: 0.05 }, ['「醬油拉麵一碗——來了！」', '你喝了幾口湯，老闆把裝白蘿蔔的小碟推過來，叫你小心燙。']));
    cart(674, 312, '屋台關東煮（一份 6 費拉）', '#E8C04A', eat('關東煮屋台的阿婆', '關東煮', 6, { mp: 0.06 }, ['「白蘿蔔、蛋、竹輪，再來一塊豆腐？」', '湯頭是昆布熬的，很清甜。']));
  };
  // ---------- 每一格 ----------
  const step = dt => {
    const tw = W.town; if (!L || !tw || W.inside) return; L.t += dt;
    const h = hour(), E = R.eventsToday ? R.eventsToday() : {}, bad = E.blizzard || /大雪|雨/.test(E.weather || ''), P = W.P;
    const day = h >= 7 && h < 19 && !bad, eve = h >= 10 && h < 21 && !E.blizzard, night = h >= 18 || h < 1;
    L.sit.forEach(n => { n.h.g.visible = day; });
    L.pairs.forEach(([a, b], i) => { const on = h >= 8 && h < 21 && !E.blizzard; a.h.g.visible = b.h.g.visible = on; if (on && Math.sin(L.t * 0.9 + i) > 0.97) { const t2 = a.rot; a.h.g.rotation.y = t2 + 0.3; } });
    L.kids.forEach(k => { k.h.g.visible = day; if (!day) return; const a = L.t * k.sp + k.ph, x = k.cx + Math.sin(a) * k.rr, z = k.cz + Math.cos(a * 1.3) * k.rr * 0.7; const yaw = Math.atan2(x - k.x, z - k.z); k.x = x; k.z = z; k.h.g.position.set(x, 0, z); k.h.g.rotation.y = yaw; R.animHero(k.h, 2.4, dt, false); });
    if (day && L.kids.length && P) { L.ballT -= dt; if (L.ballT <= 0) { L.ballT = 25 + rnd() * 30; if (L.kids.some(k => Math.hypot(k.x - P.x, k.z - P.z) < 9)) R.toast(pick(['一顆雪球打在你背上。學生們笑著跑開了。', '「對不起——！」雪球從你頭上飛過去。'])); } }
    if (L.busk) L.busk.h.g.visible = eve;
    L.carts.forEach(c => { const st = c.g.userData.steam; if (st && night) { const k = (L.t * 0.5) % 1; st.position.y = 1.3 + k * 1.2; st.scale.setScalar(0.6 + k); st.material.opacity = 0.35 * (1 - k); } c.g.visible = night; c.v.h.g.visible = night; c.b.on = night; });
  };
  R.SL = { ROLES, GOSSIP, shamisen };   // 精緻城市（cklife.js）也用
  const enter0 = R.enterTownNow;
  R.enterTownNow = (from, at) => { enter0(from, at); const tw = W.town; if (tw) { try { build(tw); } catch (e) { console.warn('[streetlife]', e); } } };
  const step0 = R.townStep;
  R.townStep = dt => { step0(dt); step(dt); };
})(window.R);
