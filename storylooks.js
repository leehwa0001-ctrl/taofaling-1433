// 劇情人物的樣子（照作者給的設定圖）：在點陣人物上加各自的細節（sprites.js 呼叫 R.HERO_SIG[L.sig]）
// 人物格子：頭 x 4～11、y 2～8；身體 x 4～11、y 9～15；腿 y 16～22；手臂 x 2～3、12～13（正面）。側面朝右：身體 x 5～10。
// 另外：望月家的家紋（圓框裡一輪滿月、左右兩彎新月、下面三片葉子）掛在道場的門柱上（R.drawMochizukiCrest）。
(function (R) {
  const SIG = R.HERO_SIG = R.HERO_SIG || {};
  // 望月瀧：白色長髮高馬尾（長到膝蓋）、紅髮帶、兩個 X 髮夾、黑色短羽織＋白衣領＋黑高領、紅腰帶和流蘇、黑袴（內側紅）、黑靴
  SIG.taki = (p, v, fr, L, sit, shade) => {
    const H = L.hair, dk = shade(H, -0.18), red = '#B8262E', rib = '#C8323A', blk = '#16161A';
    if (v === 'front') {
      p(6, 9, 4, 5, '#ECECF0'); p(7, 9, 2, 1, blk); p(6, 9, 1, 1, '#ECECF0'); p(9, 9, 1, 1, '#ECECF0');   // 白衣領、黑高領
      p(5, 9, 1, 5, '#2A2A30'); p(10, 9, 1, 5, '#2A2A30');                                                // 羽織的前襟
      if (!sit) {
        p(4, 14, 8, 2, red); p(4, 14, 8, 1, shade(red, 0.15)); p(9, 16, 1, 3, rib); p(9, 19, 1, 1, shade(rib, -0.3));   // 紅腰帶、流蘇
        p(4, 16, 8, 5, '#1E1E24'); p(4, 16, 1, 5, '#2A2A32'); p(7, 17, 1, 4, '#141418'); p(10, 16, 1, 5, '#7A1A20');      // 黑袴、內側的紅
        p(9, 16, 1, 3, rib);
      }
      p(2, 8, 1, 7, H); p(13, 8, 1, 7, dk);                                         // 垂到肩後的長髮
      p(7, -1, 2, 1, H); p(6, 0, 1, 1, red); p(9, 0, 1, 1, red);                     // 高馬尾、紅髮帶
      p(11, 3, 1, 1, blk); p(10, 4, 1, 1, blk); p(11, 5, 1, 1, blk);                 // X 髮夾
    } else if (v === 'back') {
      p(6, 0, 4, 1, red); p(5, 1, 1, 2, rib); p(10, 1, 1, 2, rib);                  // 紅髮帶的結
      p(6, 8, 4, 6, H); p(7, 14, 2, 7, H); p(7, 21, 2, 1, dk); p(6, 9, 1, 5, dk);   // 長到膝蓋的馬尾
      if (!sit) { p(4, 15, 8, 1, red); p(4, 16, 3, 5, '#1E1E24'); p(9, 16, 3, 5, '#1E1E24'); p(11, 16, 1, 5, '#7A1A20'); }
    } else {
      p(3, 1, 1, 2, red); p(2, 1, 1, 1, rib);                                       // 髮帶
      p(0, 3, 2, 12, H); p(0, 14, 1, 4, H); p(1, 15, 1, 1, dk); p(1, 4, 1, 9, dk);  // 往後飄的長馬尾
      p(10, 9, 1, 3, '#ECECF0');                                                    // 白衣領
      if (!sit) { p(5, 14, 6, 2, red); p(10, 16, 1, 3, rib); p(4, 16, 8, 5, '#1E1E24'); p(5, 17, 1, 4, '#141418'); p(9, 16, 1, 5, '#7A1A20'); }
      p(9, 3, 1, 1, blk);                                                           // 髮夾
    }
  };
  // 楚璐・洛朗：棕色短鮑伯（髮尾淺）、藍眼睛、耳骨夾、黑色短版皮衣＋黑高領、銀項鍊、褲鍊、牛仔褲、黑色綁帶靴
  SIG.churu = (p, v, fr, L, sit, shade) => {
    const tip = '#C49A62', sil = '#C8C8D2', zip = '#8A8A96';
    if (v === 'front') {
      p(6, 9, 4, 4, '#0E0E12'); p(7, 11, 2, 1, sil);                                // 黑高領、項鍊
      p(5, 9, 1, 4, '#3A3A46'); p(10, 9, 1, 4, '#3A3A46'); p(9, 10, 1, 4, zip);    // 皮衣的翻領、斜拉鍊
      p(4, 13, 8, 2, '#1A1A20');                                                    // 短版的下襬
      p(3, 7, 1, 2, tip); p(12, 7, 1, 2, tip); p(4, 8, 1, 1, tip);                  // 髮尾
      p(12, 5, 1, 2, sil);                                                          // 耳骨夾
      if (!sit) { p(10, 15, 2, 1, sil); p(11, 16, 1, 2, sil); }                     // 褲鍊
    } else if (v === 'back') {
      p(4, 8, 8, 1, tip); p(4, 13, 8, 2, '#1A1A20'); p(7, 10, 2, 1, '#2A2A32');
    } else {
      p(4, 7, 3, 2, tip); p(7, 6, 1, 2, sil); p(9, 10, 1, 4, zip); p(5, 13, 6, 2, '#1A1A20'); if (!sit) p(10, 15, 1, 2, sil);
    }
  };
  // 雷諾・雷提歐：淺棕亂髮（呆毛）、垂耳、綠眼睛、黃綠色上衣配深色袖口、皮革吊帶、橘色背帶的書包、抱著書、棕色長褲和綁帶靴
  SIG.reno = (p, v, fr, L, sit, shade) => {
    const H = L.hair, strap = '#D8782E', bag = '#B8602A', sus = '#6A4228', cuff = '#2A2A30';
    if (v === 'front') {
      p(8, -1, 1, 1, H); p(9, -2, 1, 1, H);                                          // 呆毛
      p(7, 9, 2, 1, '#2A2A20');                                                      // 領口的釦子
      p(5, 9, 1, 6, sus); p(10, 9, 1, 6, sus);                                       // 吊帶
      [[10, 9], [9, 10], [8, 11], [7, 12], [6, 13], [5, 14]].forEach(([a, b]) => p(a, b, 1, 1, strap));   // 書包的背帶
      p(6, 11, 4, 2, '#3A5AA0'); p(6, 11, 4, 1, '#F0E8D8');                          // 抱著的書
      if (!sit) { p(1, 14, 3, 3, bag); p(1, 14, 3, 1, shade(bag, -0.25)); }          // 書包
      p(2, 13, 2, 1, cuff); p(12, 13, 2, 1, cuff);                                   // 深色袖口
    } else if (v === 'back') {
      p(7, 0, 1, 1, H);
      [[5, 9], [6, 10], [7, 11], [8, 12], [9, 13], [10, 14]].forEach(([a, b]) => p(a, b, 1, 1, strap));
      p(5, 9, 1, 6, sus); p(10, 9, 1, 6, sus);
      if (!sit) { p(12, 14, 3, 3, bag); p(12, 14, 3, 1, shade(bag, -0.25)); }
    } else {
      p(7, 0, 1, 1, H); p(8, -1, 1, 1, H);
      p(9, 11, 2, 2, '#3A5AA0'); p(9, 11, 2, 1, '#F0E8D8');
      if (!sit) { p(3, 13, 3, 3, bag); p(3, 13, 3, 1, shade(bag, -0.25)); }
      p(6, 9, 1, 1, strap); p(7, 10, 1, 1, strap);
    }
  };

  // ---------- 望月家的家紋 ----------
  R.drawMochizukiCrest = (g, S, fg, bg) => {
    const c = S / 2, k = S / 64;
    if (bg) { g.fillStyle = bg; g.beginPath(); g.arc(c, c, 31 * k, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = fg; g.fillStyle = fg; g.lineCap = 'round';
    g.lineWidth = 2.6 * k; g.beginPath(); g.arc(c, c, 28.5 * k, 0, Math.PI * 2); g.stroke();             // 外圈
    g.lineWidth = 2 * k; g.beginPath(); g.arc(c, 25 * k, 11 * k, 0, Math.PI * 2); g.stroke();            // 滿月
    // 兩彎新月：外緣粗、內緣細，尖端朝上
    [[-1], [1]].forEach(([s]) => { g.beginPath(); g.ellipse(c + s * 1 * k, 27 * k, 18 * k, 18 * k, 0, s < 0 ? Math.PI * 0.55 : -Math.PI * 0.25, s < 0 ? Math.PI * 1.25 : Math.PI * 0.45); g.ellipse(c + s * 4 * k, 26 * k, 14 * k, 15 * k, 0, s < 0 ? Math.PI * 1.25 : Math.PI * 0.45, s < 0 ? Math.PI * 0.55 : -Math.PI * 0.25, true); g.closePath(); g.fill(); });
    // 三片葉子
    const leaf = (x, y, a, l, w) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(w, -l * 0.5, 0, -l); g.quadraticCurveTo(-w, -l * 0.5, 0, 0); g.fill(); g.restore(); };
    leaf(c, 51 * k, 0, 14 * k, 5 * k); leaf(c - 1 * k, 51 * k, -1.15, 15 * k, 4.5 * k); leaf(c + 1 * k, 51 * k, 1.15, 15 * k, 4.5 * k);
  };
  // 隊伍裡的劇情人物（舊存檔記的是舊樣子）：換成最新的
  const fresh = () => { const S = R.S; if (!S || !R.STORY_LOOK) return; (S.party || []).forEach(m => { const l = m.story && R.STORY_LOOK(m.story); if (l) m.look = Object.assign({}, l); }); };
  const sp0 = R.startParty;
  if (sp0) R.startParty = run => { fresh(); sp0(run); };
  // 道場的門柱：兩邊各掛一面家紋
  const etn = R.enterTownNow;
  R.enterTownNow = (from, at) => {
    fresh(); etn(from, at);
    const tw = R.W.town, TH = window.THREE; if (!tw || !tw.dojo || !TH) return;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; R.drawMochizukiCrest(cv.getContext('2d'), 64, '#F2EEE4', '#1E1E24');
    const t = new TH.CanvasTexture(cv); t.magFilter = TH.NearestFilter; t.minFilter = TH.NearestFilter; if (TH.sRGBEncoding) t.encoding = TH.sRGBEncoding;
    const mat = new TH.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5 });
    [-1.7, 1.7].forEach(o => { const m = new TH.Mesh(new TH.CircleGeometry(0.42, 20), R.seeThrough ? R.seeThrough(mat) : mat); m.position.set(tw.dojo.x + o, 2.1, tw.dojo.z1 + 0.17); tw.group.add(m); });
  };
})(window.R);
