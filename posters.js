// 競選海報（原著〈雪路〉：街上貼著競選標語。作者 2026-10-04：「我想要不只有提到國民黨而已」）
// 昭旭聯合王國的政黨照作者的《國家簡介》：昭皇黨、聯合共和黨、軍官黨、國民黨。議會選舉快到了，大路邊立著「海報張貼處」的板子，
// 四個黨的海報並排貼著；走過去可以看每一張寫什麼。標語是照《國家簡介》2836 年的情勢寫的（和德克斯凡技術交流、舊職業被取代、暗殺），
// 四個黨都只寫自己的主張，不寫誰對誰錯；作者要改標語，改 PARTIES 就好。
// - 東鶴：沿著大路、次要道路（含站北新市街）挑幾個人行道上空著的地方立板子（離門口、別的東西遠一點）。
// - R.electionBoard(group, x, z, rotY)：別的檔案（例如 hosu.js 的奉主）也可以立板子；R.electionSheet() 打開海報的說明。
// 放在 sights.js 後面（tidy.js 前面）。
(function (R) {
  const esc = s => R.esc(s);
  const PARTIES = [
    { n: '昭皇黨', c: '#5A2A6A', a: '#E8C04A', s: '穩定，才有繁榮', sub: '延續昭旭百年的路', who: '紫底金字。海報下面印著一行小字：「新皇律之下，昭皇與民同罪；守住制度，就是守住國家。」' },
    { n: '聯合共和黨', c: '#24467E', a: '#F4F4F0', s: '議會的事，國民決定', sub: '每一票都算數', who: '藍底白字。角落畫著一個投票箱：「預算公開、議事公開，誰收了誰的錢，攤開來看。」' },
    { n: '軍官黨', c: '#3A4A2E', a: '#D8B048', s: '終結暗殺，找回秩序', sub: '治安是國家的第一件事', who: '墨綠底，字是金色的。底下一排小字：「商人、議員、老百姓，走在街上都不該怕。」' },
    { n: '國民黨', c: '#A8402A', a: '#FFF0D8', s: '科技要來，飯碗要留', sub: '先顧好昭旭人的工作', who: '紅底白字。畫著一雙握著工具的手：「德克斯凡的機器可以進來，被換掉的人要有下一份工作。」' }
  ];
  R.PARTIES = PARTIES;
  // 一塊板子的貼圖：上面一條「議會選舉 海報張貼處」，下面四張海報（一公尺 48 個點陣像素）
  let tex = null;
  const boardTex = () => tex || (tex = R.pixCanvasTex(128, 60, (g, W0, H0) => {
    g.fillStyle = '#E8E4DA'; g.fillRect(0, 0, W0, H0);
    g.fillStyle = '#2E3440'; g.fillRect(0, 0, W0, 11); g.fillStyle = '#F4F0E6'; g.font = 'bold 9px "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('議會選舉　海報張貼處', W0 / 2, 6);
    PARTIES.forEach((p, i) => {
      const x = 3 + i * 31, y = 14, w = 29, h = 43;
      g.fillStyle = p.c; g.fillRect(x, y, w, h);
      g.fillStyle = p.a; g.fillRect(x + 1, y + 1, w - 2, 1); g.fillRect(x + 1, y + h - 2, w - 2, 1);
      // 候選人的剪影（不畫真的臉）
      g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(x + w / 2, y + 13, 5, 0, Math.PI * 2); g.fill(); g.fillRect(x + w / 2 - 8, y + 19, 16, 7);
      g.fillStyle = p.a; g.font = 'bold 7px "Noto Sans TC", sans-serif'; g.fillText(p.n.length > 3 ? p.n.slice(0, 2) + p.n.slice(-1) : p.n, x + w / 2, y + 31);
      g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x + 4, y + 36, w - 8, 1); g.fillRect(x + 6, y + 39, w - 12, 1);
      g.fillStyle = '#1A1A1A'; g.font = 'bold 6px sans-serif'; g.fillText(String(i + 1), x + 4, y + 4);
    });
    // 有一張被撕掉一角
    g.fillStyle = '#E8E4DA'; g.beginPath(); g.moveTo(3 + 2 * 31 + 29, 14 + 43); g.lineTo(3 + 2 * 31 + 20, 14 + 43); g.lineTo(3 + 2 * 31 + 29, 14 + 35); g.fill();
  }));
  R.electionBoard = (group, x, z, rotY) => {
    const TH = THREE, g = new TH.Group(), wood = new TH.MeshLambertMaterial({ color: '#4A4E56' });
    [-1.25, 1.25].forEach(dx => { const p = new TH.Mesh(new TH.BoxGeometry(0.08, 2.1, 0.08), wood); p.position.set(dx, 1.05, 0); p.castShadow = true; g.add(p); });
    const back = new TH.Mesh(new TH.BoxGeometry(2.7, 1.3, 0.05), wood); back.position.set(0, 1.45, -0.03); back.castShadow = true; g.add(back);
    // 兩面都貼（鏡頭從哪一邊看都看得到）
    const fm = new TH.MeshLambertMaterial({ map: boardTex() });
    [0, Math.PI].forEach(r => { const face = new TH.Mesh(new TH.PlaneGeometry(2.6, 1.22), fm); face.rotation.y = r; face.position.set(0, 1.45, r ? -0.06 : 0.005); g.add(face); });
    g.position.set(x, 0, z); g.rotation.y = rotY || 0; group.add(g);
    R.addBox(x - 1.3, x + 1.3, z - 1.3, z + 1.3, 'deco');
    return g;
  };
  R.electionSheet = () => {
    R.sheet('<p class="kicker">議會選舉</p><h2>海報張貼處</h2><p class="note">議會選舉快到了。四個黨的海報按號碼並排貼著，有幾張被撕掉了一角，又有人用膠帶補了回去。</p>'
      + '<div class="el-list">' + PARTIES.map((p, i) => '<div class="el-card" style="--c:' + p.c + ';--a:' + p.a + '"><small>' + (i + 1) + '</small><b>' + esc(p.n) + '</b><span class="el-s">「' + esc(p.s) + '」</span><span class="el-sub">' + esc(p.sub) + '</span><p>' + esc(p.who) + '</p></div>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn pri" id="el-x">好</button></div>');
    document.getElementById('el-x').onclick = R.closeSheet;
  };
  const css = document.createElement('style');
  css.textContent = '.el-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}.el-card{background:var(--c);color:var(--a);border-radius:6px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;border:2px solid rgba(0,0,0,.25)}.el-card small{opacity:.7}.el-card b{font-size:1.15em}.el-s{font-weight:700;font-size:1.05em}.el-sub{opacity:.85;font-size:.9em}.el-card p{margin:.4em 0 0;font-size:.85em;opacity:.92;color:#FFF}';
  document.head.appendChild(css);

  // ---------- 東鶴：沿著大路挑空地 ----------
  const spots = () => {
    const C = R.CITY; if (!C || !C.roads) return [];
    const S = C.S || 0.44, W = sx => (sx - 500) * S, out = [];
    // 不在路上、水裡，也不在任何地塊（房子的屋簷比碰撞大）、設施的範圍裡
    const inRect = (sx, sy, r, m) => sx > r[0] - m && sx < r[2] + m && sy > r[1] - m && sy < r[3] + m;
    const facR = Object.keys(C.FAC || {}).filter(k => C.FS && C.FS[k]).map(k => { const [fx, fy] = C.FAC[k], [w, d] = C.FS[k]; return [fx - w / 2, fy - d / 2, fx + w / 2, fy + d / 2]; });
    const onRoad = (sx, sy) => C.roads.some(r => C.lineDist(sx, sy, r.pts) < r.w / 2 + 2) || (C.water || []).some(w => C.lineDist(sx, sy, w.pts) < w.w / 2 + 6)
      || C.lots.some(l => l.type !== 'vacant' && l.type !== 'parking' && inRect(sx, sy, l.r, 5)) || facR.some(r => inRect(sx, sy, r, 6)) || (C.FIELDS || []).some(r => inRect(sx, sy, r, 2));
    C.roads.filter(r => r.kind === 'main' || r.kind === 'sub').forEach(r => {
      let acc = 40;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L;
        for (let t = 0; t < L; t += 8) {
          acc += 8; if (acc < 150) continue;
          const side = (out.length % 2) ? 1 : -1, off = r.w / 2 + 6, sx = ax + ux * t - uy * off * side, sy = ay + uy * t + ux * off * side;
          if (onRoad(sx, sy)) continue;
          out.push({ x: W(sx), z: W(sy), rot: Math.atan2(uy * side, -ux * side) }); acc = 0;   // 板子正面朝路
        }
      }
    });
    return out;
  };
  const free = (x, z, tw) => {
    for (const c of R.boxesNear(x, z)) if (x > c.x0 - 1.6 && x < c.x1 + 1.6 && z > c.z0 - 1.6 && z < c.z1 + 1.6) return false;
    return !tw.inter.some(it => Math.hypot(it.x - x, it.z - z) < 3.2);
  };
  const en0 = R.enterTownNow;
  R.enterTownNow = (from, at) => {
    en0(from, at);
    const tw = R.W.town; if (!tw || !tw.group || tw.hosu) return;
    let n = 0; const placed = [];
    spots().forEach(s => {
      if (n >= 12 || placed.some(p => Math.hypot(p.x - s.x, p.z - s.z) < 55) || !free(s.x, s.z, tw)) return;
      R.electionBoard(tw.group, s.x, s.z, s.rot); placed.push(s); n++;
      tw.inter.push({ x: s.x, z: s.z, r: 2.2, label: '看競選海報（議會選舉）', act: R.electionSheet });
    });
    R.ELECTION_SPOTS = placed;
  };
})(window.R);
