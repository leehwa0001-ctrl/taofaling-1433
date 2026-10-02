// 觀光景點（作者 2026-10-03：好像都沒有觀光景點）
// - 東鶴本來就有的地方（神社、寺的鐘樓、舊市街的鐘樓、燈塔、魚市場、紅磚倉庫……）旁邊立一塊說明牌：
//   走過去可以讀說明、蓋「觀光章」。地圖上是「景」的圖示（gtamap.js）。
// - 說明牌放在原本那個互動點的旁邊（找一個沒有東西擋著的位置），所以不會插進牆裡。
// - 觀光章蓋齊：800 費拉和稱號「東鶴通」（委託報酬 +2%）。城裡的選單有「觀光手冊」看蓋了哪些、還差哪裡。
// 這個檔案要在 coast.js、harbor.js 後面、tidy.js 前面載入。
(function (R) {
  const S = () => R.S, esc = s => R.esc(s);
  // [id, 錨點（原本互動的標籤）, 名字, 在哪裡（手冊上的提示）, 說明]
  const SIGHTS = [
    ['shrine', /^參拜/, '東鶴神社', '舊市街', '東鶴最老的神社。鳥居是用北山的石頭刻的，冬天積雪的時候，參道兩旁的石燈籠只露出一個頭。新年的時候整條參道都是人。'],
    ['bell', /^寺的鐘樓/, '東鶴寺的大鐘', '寺町', '東鶴寺的梵鐘，據說是建城那年鑄的。除夕夜要敲一百零八下；平常敲一下 1 費拉，香油錢拿去修屋頂。'],
    ['clock', /^鐘樓$/, '舊市街的鐘樓', '舊市街的東邊', '德克斯凡的工匠來修過三次的鐘樓。整點的時候，鐘面下的小窗會打開，出來一隻木頭做的鶴。'],
    ['pillar', /^站前的時鐘柱/, '站前的時鐘柱', '東鶴站前', '「時鐘柱前見」是東鶴人約見面的老話。柱子上的鐘慢了三分鐘，大家都知道，但沒有人去調。'],
    ['theater', /^走進劇場「東鶴座」/, '劇場「東鶴座」', '南邊的繁華街', '東鶴座的看板是手繪的，每換一齣戲就重畫一次。門口貼著這個月的戲碼：〈瀧之夜叉〉〈鶴返し〉。'],
    ['market', /^東鶴魚市場/, '東鶴魚市場', '東邊的漁港', '清晨四點開始拍賣，喊價的聲音整條碼頭都聽得到。冬天的霜背鮒最肥，一箱一箱從船上搬下來。'],
    ['beach', /^在沙灘上撿貝殼/, '東濱海水浴場', '東北邊的海邊', '夏天擠滿了人的海水浴場，冬天只剩下風和浪。沙灘上偶爾撿得到漂亮的貝殼，傳說撿到七色的貝殼會有好事。'],
    ['light', /^在燈塔下看海/, '東鶴燈塔', '漁港的防波堤', '「昭旭沿岸第十二號燈塔」。晚上的光一圈一圈地轉，船在很遠的海上就看得到。'],
    ['whitelight', /^在白燈塔下看海/, '東鶴港的白燈塔', '東鶴港', '新港落成時一起蓋的白燈塔，和漁港的紅燈塔一南一北。情侶喜歡在這裡等日出。'],
    ['brick', /^紅磚倉庫/, '東鶴港的紅磚倉庫', '東鶴港', '以前放德克斯凡進口貨的倉庫，紅磚是從華爾納蘭特運來的。現在有幾間改成了店。'],
    ['bridge', /^在南橋下釣魚/, '霜溪南橋', '城南的霜溪', '霜溪流進東鶴前的最後一座橋。橋下釣得到霜背鮒；冬天河面結薄冰，釣客會敲一個洞。'],
    ['hokora', /^向鎮守的小祠合掌/, '河西的鎮守小祠', '河西', '河西的居民自己守著的小祠，祠前總是放著新鮮的供品。據說遺跡出現以前就在了。'],
    ['onsen', /^泡一下溫泉/, '湯山村的露天溫泉', '湯山村', '湯山村的露天溫泉，看得到雪山。泡完之後身體一整天都是暖的。']
  ];
  R.SIGHTS = SIGHTS;
  const got = () => { const s = S(); s.sights = s.sights || {}; return s.sights; };
  R.addTitle && R.addTitle(['tourist', '東鶴通', '在東鶴的每一個觀光景點蓋了觀光章', '委託報酬 +2%', { pay: 0.02 }]);
  const visit = sg => {
    const g = got(), first = !g[sg[0]], n0 = Object.keys(g).length;
    if (first) { g[sg[0]] = S().day || 1; R.save(); R.sfx && R.sfx('pick'); }
    const n = Object.keys(g).length, all = n >= SIGHTS.length;
    R.sheet('<p class="kicker">觀光景點・' + esc(sg[3]) + '</p><h2>' + esc(sg[2]) + '</h2><p>' + esc(sg[4]) + '</p>'
      + '<p class="note">' + (first ? '在觀光手冊上蓋了章。' : '這裡的章已經蓋過了。') + '（' + n + '／' + SIGHTS.length + '）</p>',
      '<div class="row"><button type="button" class="btn pri" id="sg-x">好</button><button type="button" class="btn" id="sg-book">觀光手冊</button></div>');
    document.getElementById('sg-x').onclick = R.closeSheet; document.getElementById('sg-book').onclick = book;
    if (first && all && n0 < SIGHTS.length) { S().gold += 800; R.save(); R.awardTitle && R.awardTitle('tourist'); setTimeout(() => R.banner && R.banner('觀光章蓋齊了！', '東鶴觀光協會送來 800 費拉和稱號「東鶴通」。'), 600); }
  };
  const book = () => {
    const g = got();
    R.sheet('<p class="kicker">東鶴觀光協會</p><h2>觀光手冊</h2><p class="note">走到景點旁邊的說明牌就能蓋章。蓋齊 ' + SIGHTS.length + ' 個：800 費拉和稱號「東鶴通」。</p><ul class="sg-list">'
      + SIGHTS.map(sg => '<li class="' + (g[sg[0]] ? 'ok' : '') + '"><b>' + (g[sg[0]] ? '✓ ' : '・') + esc(sg[2]) + '</b><small>' + esc(sg[3]) + '</small></li>').join('') + '</ul>',
      '<div class="row"><button type="button" class="btn pri" id="sg-x">關上</button></div>');
    document.getElementById('sg-x').onclick = R.closeSheet;
  };
  R.sightBook = book;
  // ---------- 進城：在錨點旁邊立說明牌 ----------
  const free = (x, z) => { if (!R.boxesNear) return true; for (const c of R.boxesNear(x, z)) if (x > c.x0 - 0.5 && x < c.x1 + 0.5 && z > c.z0 - 0.5 && z < c.z1 + 0.5) return false; return true; };
  const en0 = R.enterTownNow;
  R.enterTownNow = (from, at) => {
    en0(from, at);
    const tw = R.W.town, scene = R.W.scene; if (!tw) return;
    const TH = THREE, wood = new TH.MeshLambertMaterial({ color: '#6A4A30' }), board = new TH.MeshLambertMaterial({ color: '#E8DCC0' });
    SIGHTS.forEach(sg => {
      const a = tw.inter.find(it => typeof it.label === 'string' && sg[1].test(it.label)); if (!a || tw.inter.some(it => it.sight === sg[0])) return;
      const offs = [[1.8, 0], [-1.8, 0], [0, 1.8], [0, -1.8], [1.4, 1.4], [-1.4, 1.4], [1.4, -1.4], [-1.4, -1.4]], o = offs.find(([dx, dz]) => free(a.x + dx, a.z + dz)); if (!o) return;
      const x = a.x + o[0], z = a.z + o[1];
      if (scene) { const g = new TH.Group(), post = new TH.Mesh(new TH.BoxGeometry(0.12, 1.2, 0.12), wood), pl = new TH.Mesh(new TH.BoxGeometry(0.8, 0.5, 0.06), board), roof = new TH.Mesh(new TH.BoxGeometry(0.95, 0.06, 0.2), wood); post.position.y = 0.6; pl.position.y = 1.15; roof.position.y = 1.44; g.add(post, pl, roof); g.position.set(x, 0, z); g.rotation.y = Math.atan2(a.x - x, a.z - z) + Math.PI / 2; scene.add(g); }
      tw.inter.push({ x, z, r: 1.7, label: '觀光景點：' + sg[2] + '（說明牌・觀光章）', act: () => visit(sg), sight: sg[0] });
    });
  };
  const tm = R.townMenu;
  if (tm) R.townMenu = (...a) => { const r = tm(...a), row = document.getElementById('r-sheet') && document.getElementById('r-sheet').querySelector('.row'); if (row && !row.querySelector('#sg-open')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'sg-open'; b.textContent = '觀光手冊'; b.onclick = book; row.appendChild(b); } return r; };
  const css = document.createElement('style');
  css.textContent = '.sg-list{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px}.sg-list li{background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:6px 10px;opacity:.75}.sg-list li.ok{opacity:1;border-color:var(--gold,#C9A13A)}.sg-list small{display:block;opacity:.8}';
  document.head.appendChild(css);
})(window.R);
