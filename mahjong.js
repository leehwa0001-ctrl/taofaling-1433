// 討伐令 1433：雀莊「東風」（作者：新增日式麻將館）
// 繁華街（旅館和柏青哥中間）的三層小樓，二樓是雀莊；裡面四張桌子，找空的那張坐下就開打。
// 規則（簡化的日式立直麻將）：四個人、東風戰四局（莊家輪一圈就結束，不連莊）；
//   可以吃（只有上家打的）、碰、槓（明槓、暗槓、加槓；槓完摸嶺上牌、多翻一張寶牌指示牌）。吃碰之後就不是門清：不能立直，
//   平和、一盃口、二盃口、門前清自摸和、七對子沒有了；一氣通貫、三色同順、混一色、清一色少一翻（食い下がり）。斷么九吃碰了也算（食斷）。
//   可以立直（押 1000 點）、自摸、榮和；要有役才能和：立直、一發、門前清自摸和、斷么九、平和、一盃口、二盃口、役牌、
//   一氣通貫、三色同順、三色同刻、對對和、三暗刻、三槓子、七對子、混老頭、小三元、混一色、清一色、海底、河底、嶺上開花；役滿：四暗刻、大三元、字一色、清老頭、四槓子。寶牌加翻。
//   點數不算符，照翻數查表（一翻 1000、二翻 2000、三翻 3900、四翻 7700、滿貫 8000、跳滿 12000、倍滿 16000、三倍滿 24000、役滿 32000；莊家 1.5 倍）。
//   振聽：自己打過的牌在等的牌裡就不能榮和；放過一次榮和，到下一次摸牌前也不能榮和（立直之後放過就一直不能）。
//   流局：聽牌的人平分沒聽牌的人付的 3000 點。有人點數變成負的就提前結束。
// 桌費 20 費拉；第一名拿 80、第二名 30、第三名 10（R.S.mj 記戰績）。
// 電腦的三家：算向聽數和進張挑牌，聽牌就立直；有人立直、自己還差得遠的時候打安全牌（現物、筋、字牌）。
//   吃碰：役牌的對子會碰；已經有役牌的副露、或是全部是 2–8 的牌（斷么九）時，吃碰讓向聽數變少才叫；四張一樣的會暗槓。
// 街上的大樓、裡面的房間也在這個檔案（包住 R.buildCivic；用 civic.js 的 api.civ、api.bigSign）。
(function (R) {
  const W = R.W, rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'], HON = ['東', '南', '西', '北', '白', '發', '中'], SUIT = ['萬', '筒', '索'];
  const tname = id => id < 27 ? NUM[id % 9] + SUIT[(id / 9) | 0] : HON[id - 27];
  const FEE = 20, PRIZE = [80, 30, 10, 0], START = 25000;
  const FOES = [
    { name: '老闆娘・玉枝', rp: 0.9, top: '#8A3A4A', hair: '#2A2420' },
    { name: '退休衛兵・權藏', rp: 0.7, top: '#3E4A5A', hair: '#8A8A88' },
    { name: '上班族・新田', rp: 1.0, top: '#2E2E38', hair: '#1A1410' }
  ];

  // ---------- 牌：0–8 萬、9–17 筒、18–26 索、27–30 東南西北、31–33 白發中；一張牌＝0..135，id＝t>>2 ----------
  const counts = tiles => { const c = new Array(34).fill(0); tiles.forEach(t => c[t >> 2]++); return c; };
  const isTerm = i => i >= 27 || i % 9 === 0 || i % 9 === 8;

  // 向聽數：每一種花色分開找「面子、搭子、雀頭」的所有組合（有快取），再合起來
  const suitMemo = new Map();
  const suitOpts = (arr, honor) => {
    const key = (honor ? 'h' : 's') + arr.join('');
    if (suitMemo.has(key)) return suitMemo.get(key);
    const res = new Set(), a = arr.slice(), n = a.length;
    const rec = (i, m, t, p) => {
      while (i < n && !a[i]) i++;
      if (i >= n) { res.add(m * 100 + Math.min(t, 8) * 10 + p); return; }
      if (a[i] >= 3) { a[i] -= 3; rec(i, m + 1, t, p); a[i] += 3; }
      if (!honor && i <= 6 && a[i + 1] && a[i + 2]) { a[i]--; a[i + 1]--; a[i + 2]--; rec(i, m + 1, t, p); a[i]++; a[i + 1]++; a[i + 2]++; }
      if (a[i] >= 2) { a[i] -= 2; if (!p) rec(i, m, t, 1); rec(i, m, t + 1, p); a[i] += 2; }
      if (!honor && i <= 7 && a[i + 1]) { a[i]--; a[i + 1]--; rec(i, m, t + 1, p); a[i]++; a[i + 1]++; }
      if (!honor && i <= 6 && a[i + 2]) { a[i]--; a[i + 2]--; rec(i, m, t + 1, p); a[i]++; a[i + 2]++; }
      a[i]--; rec(i, m, t, p); a[i]++;
    };
    rec(0, 0, 0, 0);
    const out = [...res].map(v => [(v / 100) | 0, ((v / 10) | 0) % 10, v % 10]);
    suitMemo.set(key, out); return out;
  };
  // nm：已經副露（吃碰槓）的組數，手牌只要湊 4−nm 組面子
  const shantenN = (c, nm) => {
    nm = nm || 0; let acc = [[0, 0, 0]];
    [[0, 9, 0], [9, 18, 0], [18, 27, 0], [27, 34, 1]].forEach(([a, b, h]) => {
      const opts = suitOpts(c.slice(a, b), h), nx = new Map();
      acc.forEach(([m, t, p]) => opts.forEach(([m2, t2, p2]) => { if (p + p2 > 1) return; const k = (m + m2) * 100 + Math.min(t + t2, 8) * 10 + p + p2; nx.set(k, 1); }));
      acc = [...nx.keys()].map(v => [(v / 100) | 0, ((v / 10) | 0) % 10, v % 10]);
    });
    let best = 8; acc.forEach(([m, t, p]) => { const need = 4 - nm, mm = Math.min(m, need), s = 8 - 2 * (mm + nm) - Math.min(t, need - mm) - p; if (s < best) best = s; });
    return best;
  };
  const shantenC = c => { let pr = 0, kinds = 0; c.forEach(v => { if (v) kinds++; if (v >= 2) pr++; }); return 6 - pr + Math.max(0, 7 - kinds); };
  const shanten = (c, nm) => (nm ? shantenN(c, nm) : Math.min(shantenN(c, 0), shantenC(c)));

  // 和了的拆法（雀頭＋四組面子）
  const decomps = c => {
    const out = [];
    const dfs = (i, ms, pair) => {
      while (i < 34 && !c[i]) i++;
      if (i === 34) { out.push({ pair, ms: ms.slice() }); return; }
      if (c[i] >= 3) { c[i] -= 3; ms.push(['k', i]); dfs(i, ms, pair); ms.pop(); c[i] += 3; }
      if (i < 27 && i % 9 <= 6 && c[i + 1] && c[i + 2]) { c[i]--; c[i + 1]--; c[i + 2]--; ms.push(['s', i]); dfs(i, ms, pair); ms.pop(); c[i]++; c[i + 1]++; c[i + 2]++; }
    };
    for (let p = 0; p < 34; p++) if (c[p] >= 2) { c[p] -= 2; dfs(0, [], p); c[p] += 2; }
    return out;
  };
  const isChiitoi = c => c.filter(v => v === 2).length === 7;
  const isAgari = c => isChiitoi(c) || decomps(c).length > 0;
  const waitsOf = hand13 => { const c = counts(hand13), w = []; for (let k = 0; k < 34; k++) { if (c[k] >= 4) continue; c[k]++; if (isAgari(c)) w.push(k); c[k]--; } return w; };

  // 役：o = { c（手牌，含和的那張）, win, tsumo, riichi, ippatsu, seatW, last, dora[], melds（副露）, rinshan }
  const yakuOf = o => {
    const { c } = o, M = o.melds || [], open = M.some(m => m.type !== 'ankan'), all = c.slice(); M.forEach(m => m.tiles.forEach(t => all[t >> 2]++));
    const ids = []; all.forEach((v, i) => { if (v) ids.push(i); });
    const allSimple = ids.every(i => !isTerm(i)), allTH = ids.every(isTerm), suits = new Set(ids.filter(i => i < 27).map(i => (i / 9) | 0)), honors = ids.some(i => i >= 27);
    const mSeq = M.filter(m => m.type === 'chi').map(m => Math.min(...m.tiles.map(t => t >> 2))), mTri = M.filter(m => m.type !== 'chi').map(m => m.tiles[0] >> 2);
    const kans = M.filter(m => m.type === 'kan' || m.type === 'ankan').length, ankan = M.filter(m => m.type === 'ankan').length;
    const common = () => {
      const y = [];
      if (o.riichi) y.push(['立直', 1]); if (o.riichi && o.ippatsu) y.push(['一發', 1]);
      if (o.tsumo && !open) y.push(['門前清自摸和', 1]);
      if (o.last) y.push([o.tsumo ? '海底撈月' : '河底撈魚', 1]);
      if (o.rinshan) y.push(['嶺上開花', 1]);
      if (allSimple) y.push(['斷么九', 1]);
      if (suits.size === 1 && !honors) y.push(['清一色', open ? 5 : 6]); else if (suits.size === 1 && honors) y.push(['混一色', open ? 2 : 3]);
      if (kans === 3) y.push(['三槓子', 2]);
      return y;
    };
    const ykm = [];
    if (ids.every(i => i >= 27)) ykm.push('字一色');
    if (ids.every(i => i < 27 && isTerm(i))) ykm.push('清老頭');
    if (kans === 4) ykm.push('四槓子');
    let best = null;
    const consider = (y, ym) => {
      const yk = ykm.concat(ym || []);
      if (yk.length) { const r = { yaku: yk.map(n => [n, 13]), han: 13 * yk.length, yakuman: yk.length }; if (!best || r.han > best.han) best = r; return; }
      const han = y.reduce((s, v) => s + v[1], 0); if (!han) return;
      const dora = o.dora.reduce((s, d) => s + all[d], 0), r = { yaku: dora ? y.concat([['寶牌', dora]]) : y, han: han + dora, yakuman: 0 };
      if (!best || r.han > best.han) best = r;
    };
    if (!M.length && isChiitoi(c)) { const y = common(); y.push(['七對子', 2]); if (allTH) y.push(['混老頭', 2]); consider(y); }
    decomps(c.slice()).forEach(d => {
      const y = common(), ym = [], cSeq = d.ms.filter(m => m[0] === 's').map(m => m[1]), cTri = d.ms.filter(m => m[0] === 'k').map(m => m[1]), seqs = cSeq.concat(mSeq), trips = cTri.concat(mTri);
      const yh = [31, 32, 33, 27 + o.seatW, 27];
      if (!open && !trips.length && !yh.includes(d.pair) && cSeq.some(s => (o.win === s && s % 9 <= 5) || (o.win === s + 2 && s % 9 >= 1))) y.push(['平和', 1]);
      const sc = {}; cSeq.forEach(s => { sc[s] = (sc[s] || 0) + 1; }); const pk = open ? 0 : Object.values(sc).reduce((s, v) => s + Math.floor(v / 2), 0);
      if (pk >= 2) y.push(['二盃口', 3]); else if (pk === 1) y.push(['一盃口', 1]);
      trips.forEach(k => { if (k >= 31) y.push(['役牌・' + HON[k - 27], 1]); if (k === 27 + o.seatW) y.push(['自風・' + HON[k - 27], 1]); if (k === 27) y.push(['場風・東', 1]); });
      for (let s = 0; s < 3; s++) if ([0, 3, 6].every(n => seqs.includes(s * 9 + n))) y.push(['一氣通貫', open ? 1 : 2]);
      for (let n = 0; n < 7; n++) if ([0, 9, 18].every(b => seqs.includes(b + n))) { y.push(['三色同順', open ? 1 : 2]); break; }
      for (let n = 0; n < 9; n++) if ([0, 9, 18].every(b => trips.includes(b + n))) { y.push(['三色同刻', 2]); break; }
      if (trips.length === 4) y.push(['對對和', 2]);
      const openT = !o.tsumo && cTri.includes(o.win) && d.pair !== o.win && !cSeq.some(s => o.win >= s && o.win <= s + 2) ? 1 : 0, an = cTri.length - openT + ankan;
      if (an === 4) ym.push('四暗刻'); else if (an === 3) y.push(['三暗刻', 2]);
      if (allTH) y.push(['混老頭', 2]);
      const dr = trips.filter(k => k >= 31).length; if (dr === 3) ym.push('大三元'); else if (dr === 2 && d.pair >= 31) y.push(['小三元', 2]);
      consider(y, ym);
    });
    return best;
  };
  const BASE = h => h >= 13 ? 8000 * Math.floor(h / 13) : h >= 11 ? 6000 : h >= 8 ? 4000 : h >= 6 ? 3000 : h >= 5 ? 2000 : [0, 250, 500, 975, 1925][h];
  const up100 = v => Math.ceil(v / 100) * 100;
  const rankName = h => h >= 26 ? '雙倍役滿' : h >= 13 ? '役滿' : h >= 11 ? '三倍滿' : h >= 8 ? '倍滿' : h >= 6 ? '跳滿' : h >= 5 ? '滿貫' : '';

  // ---------- 一場（東風戰四局） ----------
  let G = null, SPEED = 1;
  const seatW = s => (s - G.dealer + 4) % 4;
  const wallLeft = () => G.wall.length;
  const newGame = () => {
    const foes = FOES.slice().sort(() => rnd() - 0.5);
    G = { seats: [{ name: (R.S && R.S.name) || '你', pts: START, you: true }].concat(foes.map(f => Object.assign({ pts: START }, f))), round: 0, kyotaku: 0, hint: true, log: [] };
    G.seats.forEach((s, i) => { s.i = i; });
    deal();
  };
  const deal = () => {
    const w = []; for (let t = 0; t < 136; t++) w.push(t);
    for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; }
    // 王牌 14 張：0–3 是嶺上牌（槓了摸這裡），4、6、8、10、12 是寶牌指示牌
    G.dead = w.splice(0, 14); G.wall = w; G.kans = 0; G.doraInd = [G.dead[4] >> 2]; G.dora = G.doraInd.map(doraOf);
    G.dealer = G.round % 4; G.turn = G.dealer; G.drawn = null; G.last = null; G.result = null; G.riichiMode = false; G.rinshanNow = false; G.msg = '東 ' + (G.round + 1) + ' 局，' + G.seats[G.dealer].name + '是莊家。';
    G.seats.forEach(s => { s.hand = G.wall.splice(0, 13).sort((a, b) => a - b); s.river = []; s.gone = []; s.melds = []; s.riichi = false; s.ippatsu = false; s.furitenT = false; s.furitenR = false; s.riichiAt = -1; });
    G.phase = 'draw';
  };
  const doraOf = i => (i < 27 ? ((i / 9) | 0) * 9 + (i % 9 + 1) % 9 : i < 31 ? 27 + (i - 27 + 1) % 4 : 31 + (i - 31 + 1) % 3);
  const isOpen = o => o.melds.some(m => m.type !== 'ankan');
  const visible = s => { const v = new Array(34).fill(0); G.seats.forEach(o => { o.river.forEach(t => v[t >> 2]++); o.melds.forEach(m => m.tiles.forEach(t => v[t >> 2]++)); }); G.doraInd.forEach(i => v[i]++); G.seats[s].hand.forEach(t => v[t >> 2]++); return v; };
  // 被吃碰拿走的牌（o.gone）也算自己打過的：一樣會振聽
  const furiten = s => { const o = G.seats[s]; if (o.furitenT || o.furitenR) return true; const w = waitsOf(o.hand); return o.river.concat(o.gone).some(t => w.includes(t >> 2)); };
  const winOf = (s, tile, tsumo) => {
    const o = G.seats[s], tiles = tsumo ? o.hand : o.hand.concat([tile]), c = counts(tiles);
    if (!isAgari(c)) return null;
    const win = (tsumo ? G.drawn : tile) >> 2, rin = tsumo && G.rinshanNow && G.turn === s;
    return yakuOf({ c, win, tsumo, riichi: o.riichi, ippatsu: o.ippatsu, seatW: seatW(s), last: wallLeft() === 0 && !rin, dora: G.dora, melds: o.melds, rinshan: rin });
  };

  // 電腦（也是「提示」用的）：挑要打的牌
  const choose = s => {
    const o = G.seats[s]; if (o.riichi) return G.drawn;
    const c = counts(o.hand), vis = visible(s), threats = G.seats.filter(x => x.i !== s && x.riichi), nm = o.melds.length;
    const danger = id => threats.reduce((mx, t) => { const rv = t.river.map(x => x >> 2); let d = 6; if (rv.includes(id)) d = 0; else if (id >= 27) d = vis[id] >= 3 ? 0.5 : vis[id] === 2 ? 1.5 : 3; else { const n = id % 9; const suji = (n >= 3 && rv.includes(id - 3)) || (n <= 5 && rv.includes(id + 3)); d = suji ? (isTerm(id) ? 1.5 : 3) : isTerm(id) ? 3.5 : 6; } return Math.max(mx, d); }, 0);
    const val = id => id >= 27 ? (vis[id] >= 2 ? -1 : [31, 32, 33, 27 + seatW(s), 27].includes(id) ? 1 : 0) : [1, 2, 3, 4, 4, 4, 3, 2, 1][id % 9] + (G.dora.includes(id) ? 3 : 0);
    let best = null; const seen = {};
    o.hand.forEach(t => {
      const id = t >> 2; if (seen[id]) return; seen[id] = 1;
      c[id]--; const sh = shanten(c, nm); let uk = 0;
      if (sh <= 3) for (let k = 0; k < 34; k++) { const left = 4 - vis[k] - (k === id ? 0 : 0); if (left <= 0) continue; c[k]++; if (shanten(c, nm) < sh) uk += left; c[k]--; }
      c[id]++;
      const dg = threats.length ? danger(id) : 0, score = -sh * 1000 + uk * 4 - val(id) * 3 - dg * (sh >= 2 ? 2000 : sh === 1 ? 60 : 15);
      if (!best || score > best.score) best = { t, id, sh, score };
    });
    return best.t;
  };
  let hintKey = '', hintT = null;
  const hintFor = () => { const k = G.seats[0].hand.join(',') + '|' + G.seats.map(o => o.river.length + (o.riichi ? 'r' : '')).join(','); if (k !== hintKey) { hintKey = k; hintT = choose(0); } return hintT; };
  const tenpaiDiscards = s => { const o = G.seats[s], out = new Set(), c = counts(o.hand); o.hand.forEach(t => { const id = t >> 2; c[id]--; if (shanten(c, o.melds.length) === 0) out.add(id); c[id]++; }); return out; };

  // ---------- 進行 ----------
  const say = m => { G.msg = m; };
  const doDiscard = (s, t, riichi) => {
    const o = G.seats[s]; o.hand.splice(o.hand.indexOf(t), 1); o.hand.sort((a, b) => a - b); o.river.push(t); G.last = { s, t };
    if (o.ippatsu && !riichi) o.ippatsu = false;
    if (riichi) { o.riichi = true; o.ippatsu = true; o.riichiAt = o.river.length - 1; o.pts -= 1000; G.kyotaku += 1000; say(o.name + '：立直！'); R.sfx && R.sfx('pick'); }
    G.drawn = null; G.riichiMode = false; G.rinshanNow = false; G.phase = 'claims'; G.claimFrom = (s + 1) % 4; G.youPassed = false; G.youPassedCall = false;
    R.sfx && R.sfx('ui');
  };
  // ---------- 吃、碰、槓 ----------
  const yakuhai = (s, id) => id >= 31 || id === 27 || id === 27 + seatW(s);
  // 把剛打出去的那張拿走（河裡少一張；放槍的振聽照樣算，記在 gone）
  const takeDiscard = () => { const { s, t } = G.last, o = G.seats[s]; o.river.pop(); o.gone.push(t); return t; };
  const drawRinshan = s => {
    const o = G.seats[s], r = G.dead[G.kans]; G.kans++; G.doraInd.push(G.dead[4 + 2 * G.kans] >> 2); G.dora = G.doraInd.map(doraOf); G.wall.pop();
    o.hand.push(r); G.drawn = r; G.rinshanNow = true; G.turn = s; o.furitenT = false;
  };
  // kind：ankan（暗槓，自己的四張）、kakan（加槓，碰過的再加一張）、kan（明槓，別人打的）
  const doKan = (s, kind, id) => {
    const o = G.seats[s];
    if (kind === 'ankan') { const ts = o.hand.filter(t => t >> 2 === id).slice(0, 4); ts.forEach(t => o.hand.splice(o.hand.indexOf(t), 1)); o.melds.push({ type: 'ankan', tiles: ts }); }
    else if (kind === 'kakan') { const m = o.melds.find(x => x.type === 'pon' && x.tiles[0] >> 2 === id), t = o.hand.find(x => x >> 2 === id); o.hand.splice(o.hand.indexOf(t), 1); m.tiles.push(t); m.type = 'kan'; }
    else { const from = G.last.s, ts = o.hand.filter(t => t >> 2 === id).slice(0, 3); ts.forEach(t => o.hand.splice(o.hand.indexOf(t), 1)); const t = takeDiscard(); o.melds.push({ type: 'kan', tiles: ts.concat([t]), from, called: t }); }
    o.hand.sort((a, b) => a - b); G.seats.forEach(x => { x.ippatsu = false; });
    say(o.name + '：槓！'); R.sfx && R.sfx('pick');
    drawRinshan(s);
  };
  // 吃、碰：ids＝要從手牌拿出來的兩張（碰就是兩張一樣的）
  const doCall = (s, type, ids) => {
    const o = G.seats[s], from = G.last.s, use = [];
    ids.forEach(id => { const x = o.hand.find(h => h >> 2 === id && !use.includes(h)); use.push(x); });
    use.forEach(x => o.hand.splice(o.hand.indexOf(x), 1)); const t = takeDiscard();
    o.melds.push({ type, tiles: use.concat([t]).sort((a, b) => a - b), from, called: t });
    G.seats.forEach(x => { x.ippatsu = false; });
    G.turn = s; G.drawn = null; G.rinshanNow = false; say(o.name + '：' + (type === 'pon' ? '碰' : '吃') + '！'); R.sfx && R.sfx('pick');
    G.phase = s === 0 ? 'you' : 'aiDiscard';
  };
  // 叫了之後（打掉最好的一張）的向聽數
  const shAfter = (o, used) => { const c = counts(o.hand); used.forEach(id => c[id]--); const nm = o.melds.length + 1; let best = 9; for (let k = 0; k < 34; k++) { if (!c[k]) continue; c[k]--; best = Math.min(best, shanten(c, nm)); c[k]++; } return best; };
  // 斷么九還做得成：副露全部 2–8、手上的么九字牌不多
  const tanyaoOK = (o, used, id) => o.melds.every(m => m.tiles.every(t => !isTerm(t >> 2))) && !isTerm(id) && used.every(u => !isTerm(u)) && o.hand.filter(t => isTerm(t >> 2)).length <= 2;
  const hasYakuPath = (s, used, id) => { const o = G.seats[s]; return o.melds.some(m => m.type !== 'chi' && yakuhai(s, m.tiles[0] >> 2)) || tanyaoOK(o, used, id); };
  const aiCall = (j, type, id, used) => {
    const o = G.seats[j]; if (o.riichi || !wallLeft()) return false;
    const sh0 = shanten(counts(o.hand), o.melds.length);
    if (type === 'pon' && yakuhai(j, id)) return shAfter(o, used) <= sh0;   // 役牌的對子：碰了就有役
    return hasYakuPath(j, used, id) && shAfter(o, used) < sh0 && rnd() < 0.8;
  };
  // 你能叫的：碰、明槓（誰打的都可以）、吃（只有上家）
  const callOpts = () => {
    const o = G.seats[0]; if (!G.last || o.riichi || !wallLeft()) return [];
    const { s, t } = G.last, id = t >> 2, c = counts(o.hand), out = [];
    if (c[id] >= 2) out.push({ type: 'pon', ids: [id, id], label: '碰 ' + tname(id) });
    if (c[id] >= 3 && G.kans < 4) out.push({ type: 'kan', label: '槓 ' + tname(id) });
    if (s === 3 && id < 27) { const n = id % 9; [[-2, -1], [-1, 1], [1, 2]].forEach(([a, b]) => { if (n + a < 0 || n + b > 8 || !c[id + a] || !c[id + b]) return; out.push({ type: 'chi', ids: [id + a, id + b], label: '吃 ' + [id + a, id, id + b].sort((p, q) => p - q).map(k => NUM[k % 9]).join('') + SUIT[(id / 9) | 0] }); }); }
    return out;
  };
  // 自己的回合能槓的：暗槓、加槓（立直中不槓，簡化）
  const selfKans = s => {
    const o = G.seats[s]; if (o.riichi || !wallLeft() || G.kans >= 4 || G.drawn == null) return [];
    const c = counts(o.hand), out = []; for (let k = 0; k < 34; k++) if (c[k] === 4) out.push({ kind: 'ankan', id: k });
    o.melds.forEach(m => { if (m.type === 'pon' && c[m.tiles[0] >> 2]) out.push({ kind: 'kakan', id: m.tiles[0] >> 2 }); });
    return out;
  };
  const settle = (w, from, y, tsumo) => {
    const dealer = w === G.dealer, b = BASE(y.han), pay = {}; let total = 0;
    if (tsumo) G.seats.forEach(o => { if (o.i === w) return; const p = up100(b * (dealer || o.i === G.dealer ? 2 : 1)); pay[o.i] = p; total += p; });
    else { const p = up100(b * (dealer ? 6 : 4)); pay[from] = p; total = p; }
    Object.keys(pay).forEach(i => { G.seats[i].pts -= pay[i]; }); G.seats[w].pts += total + G.kyotaku; const kt = G.kyotaku; G.kyotaku = 0;
    G.result = { kind: tsumo ? 'tsumo' : 'ron', w, from, y, total, kt, hand: (tsumo ? G.seats[w].hand : G.seats[w].hand.concat([G.last.t])).slice().sort((a, b) => a - b), winT: tsumo ? G.drawn : G.last.t, melds: G.seats[w].melds.slice() };
    G.phase = 'result';
    if (w === 0 && R.S) { const S = R.S; S.mj = S.mj || { games: 0, first: 0, wins: 0, best: 0, bestName: '' }; S.mj.wins++; if (y.han > S.mj.best) { S.mj.best = y.han; S.mj.bestName = y.yaku.map(v => v[0]).join('・'); } }
    R.sfx && R.sfx(w === 0 ? 'chest' : 'pick');
  };
  const exhaust = () => {
    const ten = G.seats.map(o => shanten(counts(o.hand), o.melds.length) === 0), n = ten.filter(Boolean).length;
    if (n > 0 && n < 4) G.seats.forEach((o, i) => { o.pts += ten[i] ? 3000 / n : -3000 / (4 - n); });
    G.result = { kind: 'draw', ten }; G.phase = 'result';
  };
  // 一步：自動的部分（摸牌、電腦打牌、看有沒有人榮和）；輪到你的時候回傳 false
  const step = () => {
    if (!G) return false;
    if (G.phase === 'draw') {
      if (!wallLeft()) { exhaust(); return false; }
      const o = G.seats[G.turn], t = G.wall.shift(); o.hand.push(t); G.drawn = t; o.furitenT = false; G.rinshanNow = false;
      if (G.turn === 0) { G.phase = 'you'; if (o.riichi && !winOf(0, null, true)) { G.phase = 'auto'; } return G.phase === 'auto'; }
      G.phase = 'ai'; return true;
    }
    if (G.phase === 'auto') { doDiscard(0, G.drawn, false); return true; }
    if (G.phase === 'ai' || (G.phase === 'you' && G.autoYou)) {
      const s = G.turn, o = G.seats[s], y = winOf(s, null, true);
      if (y) { say(o.name + '：自摸！'); settle(s, s, y, true); return false; }
      // 暗槓、加槓：槓了不會變差才槓
      const kn = selfKans(s).find(k => { const c = counts(o.hand); c[k.id] -= k.kind === 'ankan' ? 4 : 1; return shanten(c, o.melds.length + (k.kind === 'ankan' ? 1 : 0)) <= shanten(counts(o.hand.filter(x => x !== G.drawn)), o.melds.length) && rnd() < 0.7; });
      if (kn) { doKan(s, kn.kind, kn.id); return true; }
      const t = choose(s); let ri = false;
      if (!o.riichi && !isOpen(o) && o.pts >= 1000 && wallLeft() >= 4) { const h = o.hand.slice(); h.splice(h.indexOf(t), 1); if (shanten(counts(h), o.melds.length) === 0 && rnd() < (o.rp || 0.85)) ri = true; }
      doDiscard(s, t, ri); return true;
    }
    if (G.phase === 'aiDiscard') { doDiscard(G.turn, choose(G.turn), false); return true; }   // 吃碰之後：不摸牌，直接打一張
    if (G.phase === 'claims') {
      const { s, t } = G.last, id = t >> 2;
      for (let k = 1; k <= 3; k++) {
        const j = (s + k) % 4; if (j === 0 && G.youPassed) continue;
        const y = winOf(j, t, false); if (!y || furiten(j)) continue;
        if (j === 0 && !G.autoYou) { G.phase = 'youRon'; G.ronY = y; say('可以榮和！（' + tname(id) + '）'); return false; }
        say(G.seats[j].name + '：榮和！'); settle(j, s, y, false); return false;
      }
      // 碰、明槓（電腦先；四張牌只有一家能碰）
      for (let k = 1; k <= 3; k++) {
        const j = (s + k) % 4; if (j === 0 && !G.autoYou) continue;
        const o = G.seats[j], n = o.hand.filter(x => x >> 2 === id).length;
        if (n >= 3 && G.kans < 4 && yakuhai(j, id) && !o.riichi && wallLeft() && rnd() < 0.5) { doKan(j, 'kan', id); G.phase = 'ai'; return true; }
        if (n >= 2 && aiCall(j, 'pon', id, [id, id])) { doCall(j, 'pon', [id, id]); return true; }
      }
      // 你：吃、碰、槓
      if (!G.autoYou && !G.youPassedCall) { const op = callOpts(); if (op.length) { G.phase = 'youCall'; G.callOpts = op; say(G.seats[s].name + '打了' + tname(id) + '：要叫嗎？'); return false; } }
      // 下家（電腦）吃
      const nx = (s + 1) % 4;
      if (nx !== 0 && id < 27) {
        const o = G.seats[nx], c = counts(o.hand), n = id % 9;
        const ch = [[-2, -1], [-1, 1], [1, 2]].map(([a, b]) => (n + a >= 0 && n + b <= 8 && c[id + a] && c[id + b] ? [id + a, id + b] : null)).filter(Boolean).find(u => aiCall(nx, 'chi', id, u));
        if (ch) { doCall(nx, 'chi', ch); return true; }
      }
      G.turn = (s + 1) % 4; G.phase = 'draw'; return true;
    }
    return false;
  };
  const nextHand = () => {
    if (G.seats.some(o => o.pts < 0) || G.round >= 3) { G.phase = 'over'; finish(); return; }
    G.round++; deal();
  };
  const order = () => G.seats.slice().sort((a, b) => b.pts - a.pts || a.i - b.i);
  const finish = () => {
    if (G.kyotaku) { order()[0].pts += G.kyotaku; G.kyotaku = 0; }   // 最後沒人拿的供託給第一名
    const S = R.S, rk = order().findIndex(o => o.i === 0), pr = PRIZE[rk];
    if (S) { S.mj = S.mj || { games: 0, first: 0, wins: 0, best: 0, bestName: '' }; S.mj.games++; if (!rk) S.mj.first++; S.gold += pr; R.save && R.save(); }
    G.final = { rk, pr };
    R.sfx && R.sfx(rk === 0 ? 'chest' : 'coin');
  };

  // ---------- 畫面 ----------
  const CW = 720, CH = 540, TL = { L: [36, 50], M: [22, 30], S: [14, 19] };
  const tcache = {};
  const tileCv = (id, sz) => {
    const key = id + sz; if (tcache[key]) return tcache[key];
    const [w, h] = TL[sz], cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    const th = sz === 'S' ? 2 : 3;
    g.fillStyle = '#2E6A4A'; g.fillRect(0, 0, w, h); g.fillStyle = '#C8B88A'; g.fillRect(1, h - th - 1, w - 2, th);
    g.fillStyle = '#F6F0DE'; g.fillRect(1, 1, w - 2, h - th - 2); g.fillStyle = '#FFFFFF'; g.fillRect(2, 2, w - 4, 2);
    if (id < 0) { g.fillStyle = '#2E6A4A'; g.fillRect(1, 1, w - 2, h - th - 2); g.fillStyle = '#3E8A5E'; g.fillRect(2, 2, w - 4, 2); tcache[key] = cv; return cv; }
    const fw = w - 2, fh = h - th - 2, ox = 1, oy = 1, X = u => ox + u * fw, Y = v => oy + v * fh;
    const font = (px, bold) => (bold ? 'bold ' : '') + px + 'px "Noto Serif TC","Songti TC","PMingLiU",serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (id < 9) { g.fillStyle = '#1A1A2A'; g.font = font(Math.round(fh * 0.4), 1); g.fillText(NUM[id], X(0.5), Y(0.3)); g.fillStyle = '#B8282A'; g.font = font(Math.round(fh * 0.42), 1); g.fillText('萬', X(0.5), Y(0.73)); }
    else if (id < 27) {
      const n = id % 9 + 1, pin = id < 18;
      const P = { 1: [[.5, .5]], 2: [[.5, .27], [.5, .73]], 3: [[.25, .2], [.5, .5], [.75, .8]], 4: [[.3, .27], [.7, .27], [.3, .73], [.7, .73]], 5: [[.28, .22], [.72, .22], [.5, .5], [.28, .78], [.72, .78]], 6: [[.3, .2], [.7, .2], [.3, .52], [.7, .52], [.3, .82], [.7, .82]], 7: [[.2, .13], [.5, .23], [.8, .33], [.3, .6], [.7, .6], [.3, .85], [.7, .85]], 8: [[.3, .14], [.7, .14], [.3, .38], [.7, .38], [.3, .62], [.7, .62], [.3, .86], [.7, .86]], 9: [[.2, .18], [.5, .18], [.8, .18], [.2, .5], [.5, .5], [.8, .5], [.2, .82], [.5, .82], [.8, .82]] }[n];
      if (pin) {
        const r = n === 1 ? fw * 0.36 : n <= 4 ? fw * 0.17 : n <= 6 ? fw * 0.15 : fw * 0.12;
        P.forEach(([u, v], i) => { const col = n === 1 ? '#B8282A' : (n === 5 && i === 2) || (n === 7 && i < 3) || (n === 9 && i >= 3 && i < 6) || (n === 6 && i >= 2) || (n === 3 && i === 1) ? '#B8282A' : n % 2 ? '#2A7A4A' : '#2A4A9A'; g.fillStyle = col; g.beginPath(); g.arc(X(u), Y(v), r, 0, 7); g.fill(); g.fillStyle = '#F6F0DE'; g.beginPath(); g.arc(X(u), Y(v), r * 0.5, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(X(u), Y(v), r * 0.22, 0, 7); g.fill(); });
      } else if (n === 1) {
        // 一索：一隻鳥
        g.fillStyle = '#2A7A4A'; g.beginPath(); g.ellipse(X(0.5), Y(0.56), fw * 0.26, fh * 0.2, 0, 0, 7); g.fill(); g.fillStyle = '#B8282A'; g.beginPath(); g.arc(X(0.62), Y(0.3), fw * 0.13, 0, 7); g.fill();
        g.fillStyle = '#2A4A9A'; g.beginPath(); g.moveTo(X(0.3), Y(0.6)); g.lineTo(X(0.1), Y(0.85)); g.lineTo(X(0.42), Y(0.72)); g.fill(); g.fillStyle = '#E8A03A'; g.fillRect(X(0.72), Y(0.29), fw * 0.12, fh * 0.04);
      } else {
        const sw = Math.max(2, fw * 0.13), sh = fh * (n <= 3 ? 0.36 : n <= 6 ? 0.28 : 0.22);
        P.forEach(([u, v], i) => { const red = (n === 5 && i === 2) || (n === 7 && i === 0) || (n === 9 && i % 3 === 1); g.fillStyle = red ? '#B8282A' : '#2A7A4A'; g.fillRect(X(u) - sw / 2, Y(v) - sh / 2, sw, sh); g.fillStyle = '#F6F0DE'; g.fillRect(X(u) - sw / 2, Y(v) - 0.5, sw, 1); });
      }
    } else if (id === 31) { g.strokeStyle = '#3A6ACF'; g.lineWidth = Math.max(1, fw * 0.07); g.strokeRect(X(0.2), Y(0.18), fw * 0.6, fh * 0.64); }
    else { g.fillStyle = id === 32 ? '#2A7A4A' : id === 33 ? '#B8282A' : '#1A1A2A'; g.font = font(Math.round(fh * 0.62), 1); g.fillText(HON[id - 27], X(0.5), Y(0.53)); }
    tcache[key] = cv; return cv;
  };
  let cv = null, x = null, hover = -1, timer = 0;
  // 手牌的位置：摸到的那張放最右邊、隔開一點
  // 副露的寬度（右下角用中的牌擺）：每張 23、組和組之間空 8
  const meldW = o => o.melds.reduce((a, m) => a + m.tiles.length * 23 + 8, 0);
  const handPos = () => {
    const o = G.seats[0], tw = 38, drawnIn = G.drawn != null && o.hand.length % 3 === 2 && o.hand.includes(G.drawn);
    const rest = drawnIn ? o.hand.filter(t => t !== G.drawn) : o.hand.slice(), wTot = rest.length * tw + (drawnIn ? 12 + tw : 0), x0 = Math.max(14, Math.round((CW - (o.melds.length ? meldW(o) + 10 : 0) - wTot) / 2));
    const out = rest.map((t, i) => ({ t, x: x0 + i * tw })); if (drawnIn) out.push({ t: G.drawn, x: x0 + rest.length * tw + 12, drawn: true }); return out;
  };
  const RIVER = [[288, 352, 1], [550, 214, 1], [288, 70, 1], [34, 214, 1]];
  const draw = () => {
    if (!x || !G) return;
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#3A2A1C'; x.fillRect(0, 0, CW, CH); x.fillStyle = '#1F4A36'; x.fillRect(8, 8, CW - 16, CH - 16);
    for (let i = 0; i < 260; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.05)'; x.fillRect(8 + (i * 97) % (CW - 20), 8 + (i * 53) % (CH - 20), 2, 2); }
    const txt = (s, X, Y, col, size, al) => { x.fillStyle = col || '#F2EEDC'; x.font = (size || 13) + 'px "Noto Sans TC",sans-serif'; x.textAlign = al || 'left'; x.textBaseline = 'middle'; x.fillText(s, X, Y); };
    // 上面的資訊
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(8, 8, CW - 16, 26);
    txt('東 ' + (G.round + 1) + ' 局', 18, 21, '#FFE070', 14); txt('牌山 ' + wallLeft(), 98, 21); txt('寶牌指示', 186, 21); G.doraInd.forEach((d, i) => x.drawImage(tileCv(d, 'S'), 246 + i * 16, 12));
    txt('供託 ' + G.kyotaku, 280, 21); txt(G.msg || '', CW - 18, 21, '#E8E0C8', 13, 'right');
    // 河（打出去的牌）
    G.seats.forEach((o, s) => {
      const [rx, ry] = RIVER[s];
      o.river.forEach((t, i) => { const c = i % 6, r = (i / 6) | 0, X = rx + c * 24, Y = ry + r * 32; x.drawImage(tileCv(t >> 2, 'M'), X, Y); if (i === o.riichiAt) { x.fillStyle = '#E8323A'; x.fillRect(X, Y + 30, 22, 2); } if (G.last && G.last.s === s && i === o.river.length - 1 && G.phase !== 'result') { x.strokeStyle = '#FFE070'; x.lineWidth = 2; x.strokeRect(X - 1, Y - 1, 24, 32); } });
    });
    // 對手的手牌（背面）
    [[1, 'R'], [2, 'T'], [3, 'L']].forEach(([s, side]) => {
      const o = G.seats[s], n = o.hand.length, show = G.phase === 'result' && G.result && (G.result.w === s || (G.result.kind === 'draw' && G.result.ten[s]));
      if (side === 'T') { const x0 = CW / 2 - n * 8; o.hand.forEach((t, i) => x.drawImage(tileCv(show ? t >> 2 : -1, 'S'), x0 + i * 16, 42)); txt(o.name, x0 - 10, 52, '#C8C0A8', 12, 'right'); }
      else { const X = side === 'R' ? CW - 24 : 10; o.hand.forEach((t, i) => x.drawImage(tileCv(show ? t >> 2 : -1, 'S'), X, 44 + i * 11)); txt(o.name, side === 'R' ? CW - 14 : 14, 204, '#C8C0A8', 12, side === 'R' ? 'right' : 'left'); }
      // 副露：上家、對家、下家的吃碰槓擺在手牌旁邊（暗槓中間兩張蓋著）
      let k = 0; o.melds.forEach(m => { m.tiles.forEach((t, i) => { const back = m.type === 'ankan' && (i === 1 || i === 2), X = side === 'T' ? CW / 2 + n * 8 + 12 + k * 15 : side === 'R' ? CW - 24 : 10, Y = side === 'T' ? 42 : 214 + k * 11; x.drawImage(tileCv(back ? -1 : t >> 2, 'S'), X, Y); if (t === m.called) { x.fillStyle = '#FFE070'; x.fillRect(X, Y + (side === 'T' ? 19 : 0), 14, 1); } k++; }); k += 0.4; });
    });
    // 中間：風、點數、立直棒
    const bx0 = 290, by0 = 214, bw = 140, bh = 128;
    x.fillStyle = '#163828'; x.fillRect(bx0, by0, bw, bh); x.strokeStyle = '#C9A13A'; x.lineWidth = 1; x.strokeRect(bx0 + 0.5, by0 + 0.5, bw - 1, bh - 1);
    const WN = ['東', '南', '西', '北'], pos = [[bx0 + bw / 2, by0 + bh - 16], [bx0 + bw - 8, by0 + bh / 2], [bx0 + bw / 2, by0 + 16], [bx0 + 8, by0 + bh / 2]];
    G.seats.forEach((o, s) => {
      const [px, py] = pos[s], al = s === 1 ? 'right' : s === 3 ? 'left' : 'center', on = G.turn === s && G.phase !== 'result' && G.phase !== 'over';
      txt(WN[seatW(s)] + ' ' + o.pts, px, py, on ? '#FFE070' : '#E8E0C8', 13, al);
      if (o.riichi) { const ry2 = s === 0 ? py - 14 : s === 2 ? py + 14 : py + 14; x.fillStyle = '#F2F2F2'; x.fillRect(px - (al === 'right' ? 40 : al === 'left' ? 0 : 20), ry2 - 2, 40, 4); x.fillStyle = '#E8323A'; x.fillRect(px - (al === 'right' ? 22 : al === 'left' ? -18 : 2), ry2 - 2, 4, 4); }
    });
    // 你的手牌
    const hp = handPos(), best = G.hint && G.phase === 'you' && !G.seats[0].riichi ? hintFor() : null, tdisc = G.riichiMode ? tenpaiDiscards(0) : null;
    hp.forEach((p, i) => {
      const lift = (i === hover && (G.phase === 'you')) ? 8 : 0, Y = 470 - lift;
      x.drawImage(tileCv(p.t >> 2, 'L'), p.x, Y);
      if (tdisc && !tdisc.has(p.t >> 2)) { x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(p.x, Y, 36, 50); }
      if (best != null && p.t === best) { x.fillStyle = '#FFE070'; x.beginPath(); x.moveTo(p.x + 18, Y - 4); x.lineTo(p.x + 12, Y - 11); x.lineTo(p.x + 24, Y - 11); x.fill(); }
    });
    // 你的副露：右下角
    { let X = CW - 14; G.seats[0].melds.slice().reverse().forEach(m => { const ts = m.tiles; X -= ts.length * 23; ts.forEach((t, i) => { const back = m.type === 'ankan' && (i === 1 || i === 2); x.drawImage(tileCv(back ? -1 : t >> 2, 'M'), X + i * 23, 486); if (t === m.called) { x.fillStyle = '#FFE070'; x.fillRect(X + i * 23, 517, 22, 2); } }); X -= 8; }); }
    txt(G.seats[0].name + (G.seats[0].riichi ? '（立直中）' : ''), 18, 456, '#C8C0A8', 12);
    // 聽牌的提示
    if (G.phase !== 'result' && G.phase !== 'over' && G.seats[0].hand.length % 3 === 1) { const w = waitsOf(G.seats[0].hand); if (w.length) { const vis = visible(0); txt('聽牌：等 ' + w.map(k => tname(k) + '（剩 ' + Math.max(0, 4 - vis[k]) + '）').join('、') + (furiten(0) ? '　※振聽（不能榮和）' : ''), CW - 18, 456, '#7AE0A0', 12, 'right'); } }
    // 結果
    if (G.phase === 'result' && G.result) {
      const r = G.result; x.fillStyle = 'rgba(10,14,12,.88)'; x.fillRect(110, 120, 500, 300); x.strokeStyle = '#C9A13A'; x.strokeRect(110.5, 120.5, 499, 299);
      if (r.kind === 'draw') {
        txt('流局', CW / 2, 150, '#FFE070', 22, 'center');
        G.seats.forEach((o, s) => txt(o.name + '：' + (r.ten[s] ? '聽牌' : '沒聽牌') + '　' + o.pts, CW / 2, 196 + s * 26, r.ten[s] ? '#7AE0A0' : '#C8C0A8', 14, 'center'));
      } else {
        const wn = G.seats[r.w].name, rn = rankName(r.y.han);
        txt(wn + (r.kind === 'tsumo' ? '　自摸' : '　榮和' + (r.from !== r.w ? '（' + G.seats[r.from].name + ' 放槍）' : '')), CW / 2, 146, '#FFE070', 18, 'center');
        const ml = (r.melds || []).reduce((a, m) => a + m.tiles.length * 18 + 6, 0), n = r.hand.length, x0 = CW / 2 - (n * 24 + ml) / 2; r.hand.forEach((t, i) => { x.drawImage(tileCv(t >> 2, 'M'), x0 + i * 24, 166); if (t === r.winT) { x.fillStyle = '#FFE070'; x.fillRect(x0 + i * 24, 198, 22, 2); } });
        { let X = x0 + n * 24 + 6; (r.melds || []).forEach(m => { m.tiles.forEach((t, i) => x.drawImage(tileCv(m.type === 'ankan' && (i === 1 || i === 2) ? -1 : t >> 2, 'S'), X + i * 18, 176)); X += m.tiles.length * 18 + 6; }); }
        r.y.yaku.forEach((v, i) => { const col = i % 2, row = (i / 2) | 0; txt(v[0] + '　' + (v[1] >= 13 ? '役滿' : v[1] + ' 翻'), 170 + col * 210, 220 + row * 22, '#E8E0C8', 14); });
        txt((r.y.yakuman ? '' : r.y.han + ' 翻　') + (rn ? rn + '　' : '') + r.total + ' 點' + (r.kt ? '＋供託 ' + r.kt : ''), CW / 2, 360, '#FFE070', 18, 'center');
      }
    }
    { if (G.phase === 'over' && G.final) { const od = order(); x.fillStyle = 'rgba(10,14,12,.95)'; x.fillRect(150, 150, 420, 240); x.strokeStyle = '#C9A13A'; x.strokeRect(150.5, 150.5, 419, 239); txt('結束', CW / 2, 176, '#FFE070', 22, 'center'); od.forEach((o, i) => txt((i + 1) + ' 位　' + o.name + '　' + o.pts + ' 點', CW / 2, 214 + i * 28, o.i === 0 ? '#FFE070' : '#E8E0C8', 15, 'center')); txt(G.final.pr ? '獎金 ' + G.final.pr + ' 費拉' : '沒有獎金。下次再來。', CW / 2, 352, '#7AE0A0', 15, 'center'); }
    }
  };
  const $ = id => document.getElementById(id);
  const btns = () => {
    const el = $('mj-btns'); if (!el || !G) return; const o = G.seats[0], B = [];
    if (G.phase === 'you') {
      if (G.drawn != null && winOf(0, null, true)) B.push(['mj-tsumo', G.rinshanNow ? '自摸（嶺上）' : '自摸', 'pri']);
      if (!o.riichi && !isOpen(o) && o.pts >= 1000 && wallLeft() >= 4 && tenpaiDiscards(0).size) B.push(['mj-riichi', G.riichiMode ? '取消立直' : '立直', 'gold']);
      selfKans(0).forEach((k, i) => B.push(['mj-sk' + i, (k.kind === 'ankan' ? '暗槓 ' : '加槓 ') + tname(k.id), 'gold']));
      if (o.riichi && winOf(0, null, true)) B.push(['mj-pass', '不和（打出去）', '']);
    }
    if (G.phase === 'youRon') { B.push(['mj-ron', '榮和', 'pri']); B.push(['mj-pass', '跳過', '']); }
    if (G.phase === 'youCall') { (G.callOpts || []).forEach((c, i) => B.push(['mj-call' + i, c.label, c.type === 'chi' ? '' : 'gold'])); B.push(['mj-nocall', '跳過', '']); }
    if (G.phase === 'result') B.push(['mj-next', G.round >= 3 || G.seats.some(s => s.pts < 0) ? '看結果' : '下一局', 'pri']);
    if (G.phase === 'over') B.push(['mj-again', '再打一場（' + FEE + ' 費拉）', 'pri']);
    B.push(['mj-hint', G.hint ? '提示：開' : '提示：關', '']); B.push(['mj-rule', '規則', '']); B.push(['mj-x', G.phase === 'over' ? '離開' : '離席（這一場作廢）', '']);
    el.innerHTML = B.map(([id, t, c]) => '<button type="button" class="btn ' + c + '" id="' + id + '">' + t + '</button>').join('');
    const on = (id, f) => { const b = $(id); if (b) b.onclick = f; };
    on('mj-tsumo', () => { const y = winOf(0, null, true); if (y) { say('自摸！'); settle(0, 0, y, true); refresh(); } });
    on('mj-riichi', () => { G.riichiMode = !G.riichiMode; refresh(); });
    on('mj-pass', () => { if (G.phase === 'youRon') { G.youPassed = true; const me = G.seats[0]; if (me.riichi) me.furitenR = true; else me.furitenT = true; G.phase = 'claims'; pump(); } else { doDiscard(0, G.drawn, false); pump(); } });
    on('mj-ron', () => { const y = winOf(0, G.last.t, false); if (y) { say('榮和！'); settle(0, G.last.s, y, false); refresh(); } });
    (G.callOpts || []).forEach((c, i) => on('mj-call' + i, () => { if (G.phase !== 'youCall') return; if (c.type === 'kan') { doKan(0, 'kan', G.last.t >> 2); G.phase = 'you'; } else doCall(0, c.type, c.ids); refresh(); }));
    on('mj-nocall', () => { G.youPassedCall = true; G.phase = 'claims'; pump(); });
    selfKans(0).forEach((k, i) => on('mj-sk' + i, () => { if (G.phase !== 'you') return; doKan(0, k.kind, k.id); G.phase = 'you'; refresh(); }));
    on('mj-next', () => { nextHand(); pump(); });
    on('mj-again', () => { if (R.S.gold < FEE) { R.toast('錢不夠（桌費 ' + FEE + ' 費拉）。'); return; } R.S.gold -= FEE; R.save(); newGame(); pump(); });
    on('mj-hint', () => { G.hint = !G.hint; refresh(); });
    on('mj-rule', () => { const n = $('mj-note'); n.hidden = !n.hidden; });
    on('mj-x', () => { clearTimeout(timer); G = null; R.closeSheet(); });
  };
  const refresh = () => { draw(); btns(); };
  const alive = () => cv && document.body.contains(cv) && R.sheetOpen();
  // 自動的部分一步一步跑（每一步隔一下，看得到電腦在打牌）
  const pump = () => {
    clearTimeout(timer); refresh();
    // aiDiscard：電腦吃、碰之後打一張（以前漏了這一個，電腦一吃碰整桌就停住）
    if (!G || !['draw', 'ai', 'aiDiscard', 'claims', 'auto'].includes(G.phase) && !(G.phase === 'you' && G.autoYou)) return;
    const ms = { draw: 90, ai: 420, aiDiscard: 520, claims: 120, auto: 500, you: 300 }[G.phase] * SPEED;
    timer = setTimeout(() => { if (!alive() || !G) return; step(); pump(); }, ms);
  };
  const clickAt = (mx, my) => {
    if (!G || G.phase !== 'you') return;
    const hp = handPos(), hit = hp.findIndex(p => mx >= p.x && mx < p.x + 36 && my >= 462 && my < 522); if (hit < 0) return;
    const t = hp[hit].t, o = G.seats[0];
    if (o.riichi) { if (t !== G.drawn) { R.toast('立直之後只能打摸到的牌。'); return; } doDiscard(0, t, false); pump(); return; }
    if (G.riichiMode) { if (!tenpaiDiscards(0).has(t >> 2)) { R.toast('打這張就沒有聽牌了。'); return; } doDiscard(0, t, true); pump(); return; }
    doDiscard(0, t, false); pump();
  };
  const RULES = '<b>怎麼打</b>：每次摸一張、打一張。湊成「四組面子（三張順子 或 三張一樣）＋一對雀頭」，或「七個對子」就能和。'
    + '<br><b>吃、碰、槓</b>：上家打的牌可以「吃」湊順子；誰打的都可以「碰」（手上有兩張一樣的）、「槓」（手上有三張）。自己摸齊四張可以暗槓，碰過的再摸到可以加槓；槓完從嶺上補一張，多翻一張寶牌。吃碰之後就不能立直，有些役會少一翻，所以要先想好有沒有役（役牌、斷么九最常見）。'
    + '<br><b>立直</b>：只差一張就能和（聽牌）的時候可以宣告立直，押 1000 點；之後只能打摸到的牌，但多一翻。<b>自摸</b>：自己摸到要的牌。<b>榮和</b>：別人打出你要的牌。'
    + '<br><b>要有役</b>：沒立直的時候，要有斷么九（全部 2–8）、役牌（白發中、自己的風、東 三張）、平和、一盃口、混一色、清一色、七對子……才能榮和；自摸本身就算一個役。'
    + '<br><b>振聽</b>：你等的牌如果自己打過，就不能榮和（自摸可以）。<b>提示</b>開著的時候，黃色的小三角是建議打的牌；右下會寫你在等什麼牌。'
    + '<br>東風戰四局，第一名 ' + PRIZE[0] + ' 費拉、第二名 ' + PRIZE[1] + '、第三名 ' + PRIZE[2] + '。';
  R.mahjong = () => {
    const S = R.S; S.mj = S.mj || { games: 0, first: 0, wins: 0, best: 0, bestName: '' };
    const st = S.mj.games ? '你的戰績：' + S.mj.games + ' 場、第一名 ' + S.mj.first + ' 次、和了 ' + S.mj.wins + ' 次' + (S.mj.best ? '、最大 ' + S.mj.best + ' 翻（' + S.mj.bestName + '）' : '') + '。' : '第一次來？老闆娘會先跟你講規則。';
    R.sheet('<p class="kicker">繁華街・二樓</p><h2>雀莊「東風」</h2><p class="note">洗牌的聲音嘩啦嘩啦。桌費 ' + FEE + ' 費拉，東風戰四局。' + st + '</p><p class="note">' + RULES + '</p>',
      '<div class="row"><button type="button" class="btn pri" id="mj-go">坐下（' + FEE + ' 費拉）</button><button type="button" class="btn" id="mj-no">算了</button></div>');
    $('mj-no').onclick = R.closeSheet;
    $('mj-go').onclick = () => {
      if (S.gold < FEE) { R.toast('錢不夠（桌費 ' + FEE + ' 費拉）。'); return; }
      S.gold -= FEE; R.save();
      R.sheet('<div class="mj"><canvas id="mj-cv" width="' + CW + '" height="' + CH + '"></canvas><div class="row mj-btns" id="mj-btns"></div><p class="note" id="mj-note" hidden>' + RULES + '</p></div>', '');
      const sh = $('r-sheet'); if (sh) sh.classList.add('wide');
      cv = $('mj-cv'); x = cv.getContext('2d');
      const toXY = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * CW / r.width, (e.clientY - r.top) * CH / r.height]; };
      cv.onclick = e => { const [mx, my] = toXY(e); clickAt(mx, my); };
      cv.onmousemove = e => { if (!G || G.phase !== 'you') return; const [mx, my] = toXY(e), hp = handPos(), h = hp.findIndex(p => mx >= p.x && mx < p.x + 36 && my >= 462 && my < 522); if (h !== hover) { hover = h; draw(); } };
      cv.onmouseleave = () => { hover = -1; draw(); };
      newGame(); pump();
    };
  };
  // 測試用：畫面在背景時，一步一步推；auto＝你那家也交給電腦
  R.mjDebug = { get G() { return G; }, newGame, step, pump, refresh, set speed(v) { SPEED = v; }, auto: on => { if (G) G.autoYou = on; }, shanten: tiles => shanten(counts(tiles)), yaku: (tiles, win, o) => yakuOf(Object.assign({ c: counts(tiles), win, tsumo: true, riichi: false, ippatsu: false, seatW: 0, last: false, dora: [] }, o || {})), nextHand, tname };

  // ---------- 街上的大樓 ----------
  const civ0 = R.buildCivic;
  R.buildCivic = api => {
    civ0(api);
    const F = R.CITY.FAC.mahjong; if (!F || !api.civ) return;
    try {
      const { HB, G3, B_, inter, WX, WZ } = api, b = api.civ(F[0], F[1], 10, 7.6, 3, { col: '#7A6A58', win: 1.4, fh: 3.0, doorW: 1.6 });
      api.bigSign(b.x, 4.6, b.front + 0.08, 0, '雀莊 東風', '#1E3A2A', '#F2E8C8', 5.2, 1.0);
      // 直式的燈箱招牌「麻雀」：貼在正面的右邊
      HB.add(G3.box, B_('#E8E0C8', { em: '#FFF0C8', ei: 0.8 }), b.x + b.w / 2 - 0.7, 5.6, b.front + 0.12, 1.1, 3.4, 0.2);
      { const TH = THREE, t = R.pixCanvasTex(32, 104, (g, W0, H0) => { g.fillStyle = '#B8282A'; g.fillRect(0, 0, W0, H0); g.fillStyle = '#FFFFFF'; g.font = 'bold ' + Math.round(W0 * 0.78) + 'px "Noto Serif TC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; ['麻', '雀'].forEach((ch, i) => g.fillText(ch, W0 / 2, (i + 0.5) * H0 / 2 + 1)); });
        const m = new TH.Mesh(new TH.PlaneGeometry(0.92, 3.0), R.seeThrough(new TH.MeshBasicMaterial({ map: t }))); m.position.set(b.x + b.w / 2 - 0.7, 5.6, b.front + 0.24); api.group.add(m); }
      // 一樓：通往二樓的樓梯口
      HB.add(G3.box, B_('#2A2420', { tex: 0 }), b.x - 3.2, 1.2, b.front + 0.06, 1.4, 2.4, 0.06);
      inter(b.door[0], b.door[1], 2.2, '走進雀莊「東風」（麻將）', () => R.enterInterior ? R.enterInterior('mahjong') : R.mahjong());
    } catch (e) { console.warn('[mahjong] building', e); }
  };

  // ---------- 裡面：四張桌子，三張有人在打 ----------
  const PL = R.INTERIOR_PLACES, FN = R.INTERIOR_FURNISH = R.INTERIOR_FURNISH || {};
  if (PL) {
    PL.mahjong = { name: '雀莊「東風」', sub: '二樓', hint: '洗牌的聲音嘩啦嘩啦', w: 14, d: 11, h: 3.4, wall: '#6A5A48', cap: '#3A2E24', floor: ['#4A5246', 'floor'], zoom: 0.82, out: '下樓（回到街上）' };
    FN.mahjong = c => {
      const { bx, block, inter, npc, lamp, sign, HW, HD, NW } = c, K = R.INTERIOR_KIT;
      const LOOKS = [['#3A4A5A', '#8A8A88'], ['#5A3A3A', '#2A2420'], ['#2E2E38', '#1A1410'], ['#6A5A3A', '#4A3424'], ['#3A5A4A', '#C8C0B0']];
      const TALK = ['「碰！……啊，沒有役。」', '「立直！」', '「又是你放槍。」', '「那張東風我早就想打了。」', '「再一場就回家，真的。」', '「自摸，三千、六千。」'];
      const table = (tx, tz, busy, mine) => {
        bx(1.7, 0.1, 1.7, '#2E6A4A', tx, 0.78, tz); bx(1.9, 0.08, 1.9, '#4A3424', tx, 0.72, tz); bx(0.3, 0.7, 0.3, '#3A2A1C', tx, 0.36, tz);
        for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) { const a = i * Math.PI / 2, ox = Math.sin(a) * 0.62, oz = Math.cos(a) * 0.62, px = -Math.cos(a) * (k - 2.5) * 0.17, pz = Math.sin(a) * (k - 2.5) * 0.17; bx(0.14, 0.1, 0.1, '#F2ECD8', tx + ox + px, 0.88, tz + oz + pz); }
        block(tx - 0.95, tx + 0.95, tz - 0.95, tz + 0.95, 'table');
        [[0, 1.3, Math.PI], [1.3, 0, -Math.PI / 2], [0, -1.3, 0], [-1.3, 0, Math.PI / 2]].forEach(([ox, oz, rot], i) => {
          bx(0.5, 0.08, 0.5, '#5A3E28', tx + ox, 0.46, tz + oz); bx(0.08, 0.46, 0.08, '#3A2A1C', tx + ox, 0.23, tz + oz);
          if (busy && !(mine && i === 0)) { const lk = LOOKS[(((i + Math.round(tx * 3 + tz)) % LOOKS.length) + LOOKS.length) % LOOKS.length], n = npc(tx + ox, tz + oz, rot, { name: '打麻將的客人', look: { top: lk[0], hair: lk[1], cloak: lk[0] } }); if (n && n.h) n.h.sit = true; }
        });
        if (busy && !mine) inter(tx, tz + 1.9, 1.7, '和這桌的客人打麻將', () => R.mahjong());   // 每一桌都能坐下打（作者：麻將館不能打麻將？——原本只有一張空桌能坐，找不到）
        if (mine) inter(tx, tz + 1.9, 1.7, '找空的那張桌子坐下（打麻將）', () => R.mahjong());
      };
      table(-3.6, -2.2, 1); table(3.6, -2.2, 1); table(-3.6, 2.4, 1); table(3.6, 2.4, 0, 1);
      // 櫃台和老闆娘
      bx(3.4, 1.0, 0.8, '#5A4030', 0, 0.5, -HD + 1.0); bx(3.6, 0.1, 1.0, '#7A5A40', 0, 1.05, -HD + 1.0); block(-1.8, 1.8, -HD + 0.5, -HD + 1.5, 'counter');
      npc(0, -HD + 0.4, 0, { name: '雀莊的老闆', look: { top: '#4A3A30', hair: '#8A8A88', acc: 'glasses' } });
      inter(0, -HD + 2.2, 1.8, '和老闆說話（開一桌麻將）', () => { if (R.mahjong) { R.mahjong(); return; } const m = (R.S && R.S.mj) || {}; K.talk('雀莊的老闆', [m.games ? '「又來啦。打了 ' + m.games + ' 場，拿了 ' + (m.first || 0) + ' 次第一。」' : '「新面孔？空桌在右前方。不懂規則的話，桌上有提示。」', pick(['「吃碰之前先想想有沒有役。白發中碰了就有。」', '「上個月有個勇者在這裡和了四暗刻，到現在還在講。」', '「茶免費，菸到外面抽。」'])]); });
      sign(0, 2.6, -HD + 0.36, 0, '本月排名', '#1E3A2A', NW.g);
      if (K && K.plantAt) { K.plantAt(c, -HW + 0.7, HD - 0.8); K.plantAt(c, HW - 0.7, -HD + 0.8); }
      lamp(-3.6, 2.8, -2.2, '#FFF0D0', 0.55, 7); lamp(3.6, 2.8, -2.2, '#FFF0D0', 0.55, 7); lamp(-3.6, 2.8, 2.4, '#FFF0D0', 0.55, 7); lamp(3.6, 2.8, 2.4, '#FFF0D0', 0.55, 7);
    };
  }
})(window.R);
