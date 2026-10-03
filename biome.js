// 遺跡的地形風格（2026-10-04 回饋：遺跡的外觀幾乎沒有區別，除了顏色；可以有密林、平原、洞窟、岩漿海……；
// 越深牆壁的裝飾、顏色、怪物的種類也要變，可以跟存檔點搭配——進入下一種景色有新的存檔點）
// - 景色：古代遺構（原本的樣子）、密林、平原、洞窟、晶洞、岩漿海。各有地板、牆的顏色、光、霧，房間裡擺各自的東西
//   （樹叢、花草、鐘乳石、發光的蘑菇、水晶、熔岩池……），那一帶常見的遺跡生物也不一樣（挑種類的時候那種景色常見的多抽幾次，分級本來沒有的不會出現）。
// - 每座遺跡有自己的景色順序（照遺跡的 id 固定），越深越險；每過一段存檔點（depth.js 的 R.saveEvery）換一次景色，
//   換的時候跳提示——存檔點剛好在換景色之前。哈米莉亞級只有平原、密林（明亮）。
// - 有特殊環境的遺跡（凍原、火山、深海、沙漠：克森特級那幾座）照舊用環境的樣子；觀光遺跡、狩獵場不變。
// - 2026-10-04 作者：「豐富化遺跡的房間那個你做了嗎」——有特殊環境的遺跡原本完全沒套到，現在照環境擺自己的東西（顏色照環境的）：
//   凍原：冰柱、凍住的枯樹、雪堆；深海：珊瑚、海草、氣泡；沙漠：斷柱和破罈、沙丘、白骨；火山：和岩漿海一樣。
// 放在 depth.js、savepoint.js、ruinvar.js 後面（包 R.loadFloor 最外面：蓋這一層之前先決定景色）。
(function (R) {
  const W = () => R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const B = {
    ruin: { n: '古代遺構', d: '石砌的通道和崩落的柱子。', deco: 'ruin', fav: ['rustknight', 'gearsentry', 'setosho', 'muddoll', 'honemusha', 'ruinrat'] },
    forest: { n: '密林', d: '遺跡裡長出了樹林，枝葉擋住了天花板的光。', floor: '#3E5A36', wall: '#2E4A2A', top: '#5E8A4E', light: '#D8F0B0', fog: '#1A2A1A', accent: '#9AE07A', deco: 'forest', fav: ['kodama', 'jinmenju', 'mossball', 'bellcricket', 'sporepuff', 'kitsune', 'bakeneko', 'karasu', 'tanuki'] },
    plain: { n: '平原', d: '地底的草原，不知道哪裡透進來的光照著。', floor: '#7A8A54', wall: '#8A8460', top: '#B8B07A', light: '#FFF4CC', fog: '#5A6A4A', accent: '#E8E07A', deco: 'plain', fav: ['kasa', 'tsuchikoro', 'bellcricket', 'karasu', 'okuriinu', 'ringbird', 'tanuki', 'azuki'] },
    cave: { n: '洞窟', d: '濕冷的岩洞，滴水聲從四面八方傳來。', floor: '#4A4238', wall: '#3A342C', top: '#6A6052', light: '#C8D8E8', fog: '#14120E', accent: '#7AE0D0', deco: 'cave', fav: ['stonesnail', 'pebblemite', 'glowslug', 'echobat', 'tesso', 'nozuchi', 'ruinrat', 'kyokotsu'] },
    crystal: { n: '晶洞', d: '牆裡長滿了發光的魔力結晶。', floor: '#3A3450', wall: '#2E2A44', top: '#5A5280', light: '#C8B8FF', fog: '#100E1C', accent: '#B88AFF', deco: 'crystal', fav: ['crysthog', 'crystmantis', 'prismeye', 'lampmoth', 'jellylamp', 'thunderspider', 'starspider', 'hyakume'] },
    lava: { n: '岩漿海', d: '腳下的岩縫透著紅光，空氣燙得刺痛。', floor: '#2E201A', wall: '#3A2620', top: '#5A3A2E', light: '#FF9A5A', fog: '#200C08', accent: '#FF6A2A', deco: 'lava', fav: ['onibi', 'ashcrow', 'datara', 'tarbeast', 'acidbubble', 'blackmaw'] }
  };
  R.BIOMES = B;
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const ok = run => run && run.site && !run.env && run.site.id !== 'kanko' && run.grade && run.grade.id !== 'hunt' && !run.site.outdoor;
  // 這座遺跡的景色順序（越深越險）
  const order = run => {
    if (run.biomeOrder) return run.biomeOrder;
    const h = hash(run.site.id), lv = run.grade.lv || 1;
    const easy = ['plain', 'forest'], mid = ['ruin', 'forest', 'cave', 'plain'], hard = ['cave', 'crystal', 'lava', 'ruin'];
    let seq;
    if (run.grade.id === 'hamilia') seq = h < 0.5 ? ['plain', 'forest'] : ['forest', 'plain'];
    else { const a = mid.slice().sort((x, y) => hash(run.site.id + x) - hash(run.site.id + y)), b = hard.slice().sort((x, y) => hash(run.site.id + y) - hash(run.site.id + x)); seq = lv <= 2 ? a.concat(b.slice(0, 2)) : [a[0]].concat(b, a.slice(1)); }
    return (run.biomeOrder = seq);
  };
  const biomeFor = (run, f) => {
    if (!ok(run)) return null;
    const n = run.f0 ? f : f + 1; if (run.f0 && f === 0) return order(run)[0];
    const every = R.saveEvery ? R.saveEvery(run) : 5, seg = Math.floor((n - 1) / every), seq = order(run);
    return seq[Math.min(seq.length - 1, seg)];
  };
  // 顏色：有景色的時候用景色的
  const th0 = R.theme;
  R.theme = run => { const t = th0(run), b = run && run.biome && B[run.biome]; if (!b || !b.floor) return t; return Object.assign({}, t, { floor: b.floor, wall: b.wall, top: b.top, light: b.light, fog: b.fog, accent: b.accent }); };
  // 遺跡生物：這種景色常見的多抽幾次（run.js 的 pickId 會加上這個權重；分級本來沒有的不會出現）
  R.biomeFavor = run => { const b = run && run.biome && B[run.biome], o = {}; if (b) b.fav.forEach(k => { o[k] = 3; }); return o; };
  // 每一層：先決定景色再蓋；蓋好擺東西；換景色的時候提示
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => {
    const run = W().run; let prev = null;
    if (run) { prev = run.biome; run.biome = biomeFor(run, f); }
    const r = lf0(f, o);
    try { if (run && !run.biome && envOk(run)) decorate(run, W().F, ENVDECO[run.env]);
      if (run && run.biome) { decorate(run, W().F); if (prev && prev !== run.biome) setTimeout(() => { if (W().run === run) R.banner && R.banner('景色變了：' + B[run.biome].n, B[run.biome].d); }, 2200); } } catch (e) { console.warn('[biome]', e); }
    return r;
  };
  // ---------- 擺東西 ----------
  let G = null;
  const geo = () => G || (G = (() => { const TH = THREE, g = { box: new TH.BoxGeometry(1, 1, 1), cyl: new TH.CylinderGeometry(0.5, 0.5, 1, 7), cone: new TH.ConeGeometry(0.5, 1, 7), sph: new TH.SphereGeometry(0.5, 8, 6), oct: new TH.OctahedronGeometry(0.5, 0), dod: new TH.DodecahedronGeometry(0.5, 0), disc: new TH.CircleGeometry(0.5, 14) }; Object.values(g).forEach(x => { x.userData.shared = true; }); return g; })());
  const mats = {};
  const lam = (c, em) => { const k = c + (em || ''); if (mats[k]) return mats[k]; const m = new THREE.MeshLambertMaterial({ color: c }); if (em) { m.emissive = new THREE.Color(em); m.emissiveIntensity = 0.9; } m.userData.shared = true; return (mats[k] = m); };
  const ENVDECO = { snow: 'snow', volcano: 'lava', deep: 'deep', desert: 'sand' };
  const envOk = run => run && run.env && ENVDECO[run.env] && run.site && run.site.id !== 'kanko' && run.grade && run.grade.id !== 'hunt' && !run.site.outdoor;
  const decorate = (run, F, envKey) => {
    if (!F || !F.group || !F.rooms || !R.Batch || !R.roomPoint) return;
    const b = envKey ? { deco: envKey } : B[run.biome]; if (!b) return;
    const g = geo(), Bt = R.Batch(), add = (gm, m, x, y, z, sx, sy, sz, rx, ry, rz) => Bt.add(gm, m, x, y, z, sx, sy, sz, rx || 0, ry || 0, rz || 0);
    const avoid = []; [F.stairs, F.up, F.save, F.warp, F.camp].concat(F.stairsAll || [], F.crystals || [], F.chests || []).forEach(o => { if (o && o.x != null) avoid.push([o.x, o.z]); });
    const free = (x, z) => avoid.every(([ax, az]) => Math.hypot(ax - x, az - z) > 3.2) && !(R.pointBlocked && R.pointBlocked(x, z));
    const block = (x, z, r) => R.addBox(x - r, x + r, z - r, z + r, 'deco');
    const PATCH = { forest: ['#2A4422', '#34522A'], plain: ['#5E8038', '#6A8A40'], cave: ['#232A30', '#2A3238'], crystal: ['#4A3478', '#3A2E66'], lava: ['#FF5A1A', '#E8440A'], snow: ['#F4F8FC', '#E6EEF6'], deep: ['#245A5A', '#1E4E52'], sand: ['#D8BE8A', '#CAB07C'], ruin: ['#5E5A50', '#6A655A'] };
    F.rooms.forEach(r => {
      if (r.type === 'puzzle' || r.spec || (r.type === 'start' && run.floor === 0)) return;
      const area = (r.hx || 8) * (r.hz || 8), n = Math.round(Math.min(26, area / 6));
      const fight = r.type === 'boss' || r.type === 'lord';   // 領主、佩特拉核心的房間：不擺會擋路的
      // 地上一塊一塊的顏色（草地、苔、積水、結晶、熔岩），從上面看最明顯
      const pc = PATCH[b.deco];
      if (pc) for (let i = 0; i < Math.round(area / 30); i++) {
        const [x, z] = R.roomPoint(r, {}), lava = b.deco === 'lava', m = lam(pick(pc), lava ? '#FF3A00' : b.deco === 'crystal' ? '#2A1A4A' : null);
        if (lava && !free(x, z)) continue;
        for (let j = 0; j < (lava ? 2 : 4); j++) { const s = (lava ? 0.8 : 1.4) + rnd() * 1.4; add(g.disc, m, x + (rnd() - 0.5) * 2.4, 0.012 + (i * 4 + j) * 0.0015, z + (rnd() - 0.5) * 2.4, s * (0.8 + rnd() * 0.5), s, 1, -Math.PI / 2, 0, rnd() * 3); }
      }
      for (let i = 0; i < n; i++) {
        const [x, z] = R.roomPoint(r, {}); if (!free(x, z)) continue;
        const s = 0.8 + rnd() * 0.6, k = fight ? 0.5 + rnd() * 0.5 : rnd();
        if (b.deco === 'forest') {
          if (k < 0.3) { add(g.cyl, lam('#4A3424'), x, 1.2 * s, z, 0.45 * s, 2.4 * s, 0.45 * s); add(g.cone, lam('#2E5A2A'), x, 2.6 * s, z, 2.6 * s, 2.4 * s, 2.6 * s); add(g.cone, lam('#3A6E34'), x, 3.6 * s, z, 1.8 * s, 1.8 * s, 1.8 * s); block(x, z, 0.35 * s); avoid.push([x, z]); }
          else if (k < 0.65) for (let j = 0; j < 2; j++) add(g.sph, lam(pick(['#3A6A30', '#2E5A28', '#4A7A3A'])), x + (rnd() - 0.5) * 1.2, 0.45 * s, z + (rnd() - 0.5) * 1.2, 1.6 * s, 1.1 * s, 1.6 * s);
          else if (k < 0.88) for (let j = 0; j < 5; j++) add(g.cone, lam(pick(['#5A8A3A', '#4A7A30'])), x + (rnd() - 0.5) * 1.6, 0.35, z + (rnd() - 0.5) * 1.6, 0.3, 0.7, 0.3, (rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4);
          else for (let j = 0; j < 3; j++) add(g.sph, lam('#E8F87A', '#C8F04A'), x + (rnd() - 0.5) * 2, 0.8 + rnd() * 1.4, z + (rnd() - 0.5) * 2, 0.18, 0.18, 0.18);   // 螢火
        } else if (b.deco === 'plain') {
          if (k < 0.45) for (let j = 0; j < 6; j++) add(g.cone, lam(pick(['#7AA04A', '#8AB05A', '#6A9040'])), x + (rnd() - 0.5) * 1.8, 0.4, z + (rnd() - 0.5) * 1.8, 0.32, 0.8, 0.32, (rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4);
          else if (k < 0.82) { const c = pick(['#FFE24A', '#FF8AB0', '#FFFFFF', '#B88AFF', '#FF7A5A']); for (let j = 0; j < 4; j++) { const xx = x + (rnd() - 0.5) * 1.4, zz = z + (rnd() - 0.5) * 1.4; add(g.cyl, lam('#5A8A3A'), xx, 0.2, zz, 0.06, 0.4, 0.06); add(g.sph, lam(c), xx, 0.45, zz, 0.36, 0.26, 0.36); } }
          else { add(g.dod, lam('#9A9488'), x, 0.35 * s, z, 1.2 * s, 0.75 * s, 1 * s, 0, rnd() * 3, 0); }
        } else if (b.deco === 'cave') {
          if (k < 0.4) { add(g.cone, lam(pick(['#6A5E50', '#5A5044', '#7A6E5E'])), x, 1.3 * s, z, 1.1 * s, 2.6 * s, 1.1 * s); add(g.cone, lam('#5A5044'), x + 0.6, 0.5, z + 0.3, 0.5, 1, 0.5); block(x, z, 0.45 * s); avoid.push([x, z]); }
          else if (k < 0.68) add(g.dod, lam('#5A5246'), x, 0.35 * s, z, 1.3 * s, 0.75 * s, 1.1 * s, 0, rnd() * 3, 0);
          else for (let j = 0; j < 4; j++) { const xx = x + (rnd() - 0.5) * 1.4, zz = z + (rnd() - 0.5) * 1.4, h = 0.25 + rnd() * 0.3; add(g.cyl, lam('#C8D0C0'), xx, h / 2, zz, 0.1, h, 0.1); add(g.sph, lam('#7AE0D0', '#3AC8B0'), xx, h + 0.05, zz, 0.55, 0.24, 0.55); }   // 發光的蘑菇
        } else if (b.deco === 'crystal') {
          if (k < 0.5) { const c = pick(['#B88AFF', '#7AC8FF', '#FF8AE0']); for (let j = 0; j < 4; j++) add(g.oct, lam(c, c), x + (rnd() - 0.5) * 1, 0.7 * s, z + (rnd() - 0.5) * 1, 0.55 * s, 1.7 * s, 0.55 * s, (rnd() - 0.5) * 0.6, rnd() * 3, (rnd() - 0.5) * 0.6); block(x, z, 0.45); avoid.push([x, z]); }
          else if (k < 0.8) add(g.dod, lam('#3E3858'), x, 0.3 * s, z, 1.1 * s, 0.6 * s, 1 * s);
          else for (let j = 0; j < 3; j++) add(g.oct, lam('#D8C8FF', '#B88AFF'), x + (rnd() - 0.5) * 1.2, 0.15, z + (rnd() - 0.5) * 1.2, 0.25, 0.4, 0.25, 0, rnd() * 3, 0);
        } else if (b.deco === 'lava') {
          if (k < 0.6) { add(g.dod, lam(pick(['#2A1E1A', '#3A2620'])), x, 0.45 * s, z, 1.4 * s, 0.9 * s, 1.2 * s, 0, rnd() * 3, 0); if (rnd() < 0.5) add(g.box, lam('#FF6A1A', '#FF4A0A'), x, 0.02, z + 0.9 * s, 1.6, 0.04, 0.12, 0, rnd() * 3, 0); }
          else for (let j = 0; j < 3; j++) add(g.sph, lam('#FFB04A', '#FF7A1A'), x + (rnd() - 0.5) * 2, 0.6 + rnd() * 1.5, z + (rnd() - 0.5) * 2, 0.16, 0.16, 0.16);   // 火星
        } else if (b.deco === 'snow') {
          if (k < 0.25) { for (let j = 0; j < 3; j++) add(g.oct, lam('#CFEAFF', '#3A6A8A'), x + (rnd() - 0.5) * 0.9, 0.8 * s, z + (rnd() - 0.5) * 0.9, 0.45 * s, 1.9 * s, 0.45 * s, (rnd() - 0.5) * 0.4, rnd() * 3, (rnd() - 0.5) * 0.4); block(x, z, 0.45); avoid.push([x, z]); }   // 冰柱
          else if (k < 0.45) { add(g.cyl, lam('#4A4650'), x, 1.2 * s, z, 0.32 * s, 2.4 * s, 0.32 * s); add(g.cyl, lam('#4A4650'), x + 0.4 * s, 1.9 * s, z, 0.12, 1.1 * s, 0.12, 0, 0, -0.7); add(g.cone, lam('#F4F8FC'), x, 2.5 * s, z, 0.7 * s, 0.5 * s, 0.7 * s); block(x, z, 0.3 * s); avoid.push([x, z]); }   // 凍住的枯樹
          else if (k < 0.8) add(g.sph, lam(pick(['#F4F8FC', '#E8EEF6'])), x, 0.12, z, 1.8 * s, 0.5 * s, 1.3 * s, 0, rnd() * 3, 0);   // 雪堆
          else for (let j = 0; j < 4; j++) add(g.oct, lam('#DDF2FF', '#4A8AAA'), x + (rnd() - 0.5) * 1.4, 0.12, z + (rnd() - 0.5) * 1.4, 0.18, 0.3, 0.18, 0, rnd() * 3, 0);   // 碎冰
        } else if (b.deco === 'deep') {
          if (k < 0.4) { const c = pick(['#FF7A8A', '#FF9A5A', '#E07AE0']); for (let j = 0; j < 5; j++) add(g.cone, lam(c, c), x + (rnd() - 0.5) * 0.9, 0.5 * s, z + (rnd() - 0.5) * 0.9, 0.22 * s, (0.8 + rnd() * 0.8) * s, 0.22 * s, (rnd() - 0.5) * 0.6, 0, (rnd() - 0.5) * 0.6); block(x, z, 0.4); avoid.push([x, z]); }   // 珊瑚
          else if (k < 0.75) for (let j = 0; j < 4; j++) add(g.cone, lam(pick(['#2E8A5A', '#3A9A6A', '#26704A'])), x + (rnd() - 0.5) * 1.2, 0.9, z + (rnd() - 0.5) * 1.2, 0.16, 1.8 + rnd(), 0.16, (rnd() - 0.5) * 0.3, 0, (rnd() - 0.5) * 0.3);   // 海草
          else for (let j = 0; j < 4; j++) add(g.sph, lam('#BFF0FF', '#5AC8E0'), x + (rnd() - 0.5) * 1.6, 0.5 + rnd() * 2, z + (rnd() - 0.5) * 1.6, 0.14, 0.14, 0.14);   // 氣泡
        } else if (b.deco === 'sand') {
          if (k < 0.35) { if (rnd() < 0.5) add(g.cyl, lam('#B8A07A'), x, 0.8 * s, z, 0.7, 1.6 * s, 0.7); else add(g.cyl, lam('#9A6A4A'), x, 0.45, z, 0.6, 0.9, 0.6); block(x, z, 0.4); avoid.push([x, z]); }   // 斷柱、破罈
          else if (k < 0.75) add(g.sph, lam(pick(['#D8BE8A', '#CCB07C'])), x, 0.1, z, 2.2 * s, 0.45 * s, 1.5 * s, 0, rnd() * 3, 0);   // 沙丘
          else for (let j = 0; j < 3; j++) add(g.cyl, lam('#EDE6D6'), x + (rnd() - 0.5) * 1.2, 0.06, z + (rnd() - 0.5) * 1.2, 0.08, 0.7, 0.08, 0, rnd() * 3, Math.PI / 2);   // 白骨
        } else {   // 古代遺構：倒下的柱子、碎石
          if (k < 0.3) { add(g.cyl, lam('#8A8478'), x, 0.4, z, 0.8, 2.4 * s, 0.8, 0, rnd() * 3, Math.PI / 2); }
          else if (k < 0.6) add(g.box, lam('#7A7468'), x, 0.3, z, 0.8 * s, 0.6 * s, 0.7 * s, 0, rnd() * 3, 0);
        }
      }
    });
    Bt.flush(F.group);
  };
})(window.R);
