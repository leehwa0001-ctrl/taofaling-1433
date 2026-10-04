// 討伐令 1433：左上角、右上角那幾格點了看詳細說明（作者 2026-10-04：場地效果還是沒有詳細說明，可以不用每層講，
//   第一層講過一次，然後點擊左上角可以出現詳細說明；佩特拉核心注意的也是，點擊那一條可以多一個什麼會增加、什麼會減少的詳細說明）
// - 原因：那幾格放在 .hud 裡（pointer-events: none），只有按鈕點得到，所以 aware.js 寫好的說明一直點不開。
//   這裡讓「場地」「樓層」「領主層」「佩特拉的注意」「理智」幾格點得到，右邊掛一個小小的「？」，滑過去會亮。
// - 場地效果：一趟遺跡只在第一次遇到那種環境的時候跳一次短提示（kesentfx.js 每一層都會講），之後點左上角那一格看完整說明：
//   會發生什麼、多痛、多久一次、怎麼躲、遺跡生物會不會中、現在的強度（越深越兇，最深兩倍）。
// - 樓層效果、領主層：一樣點了看說明。佩特拉的注意：用 aware.js 原本的說明，再加上現在的數字和這座遺跡的反應。
// 放在 kesentfx.js、forge.js、ruinvar.js、lordfloor.js、aware.js、hudframe.js 後面。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const deep = run => 1 + Math.min(1, (run.floor || 0) / Math.max(1, run.floors - 1));
  const pct = v => Math.round(v * 100) + '%';
  const sheet = (kick, title, sections, foot) => {
    R.sheet('<p class="kicker">' + esc(kick) + '</p><h2>' + esc(title) + '</h2>' + sections.map(([h, l]) => (h ? '<h3>' + esc(h) + '</h3>' : '') + '<ul class="loot hi-list">' + l.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>').join('') + (foot ? '<p class="note">' + esc(foot) + '</p>' : ''),
      '<div class="row"><button type="button" class="btn pri" id="hi-x">知道了</button></div>');
    $('hi-x').onclick = R.closeSheet;
  };

  // ---------- 場地效果 ----------
  const FIELD = {
    volcano: k => [['會發生什麼', ['地上冒出紅色的圈、開始冒泡冒火星：熔岩要從那裡噴出來。', '圈有大有小：小的 1～1.4 公尺、中的 1.5～2.2、大的 2.6～3.4，偶爾一個 4～5 公尺的大噴發（會先震一下、跳提示）。越大的圈，預警越久（大約 1.3～2 秒）。', '每 ' + Math.round(11 / k) + '～' + Math.round(17 / k) + ' 秒一波，一波 ' + (1 + Math.round(2 * k)) + '～' + (2 + Math.round(2 * k)) + ' 個：兩個瞄著你（會算你往哪邊走），其他的散在附近。']],
      ['多痛', ['噴中：生命上限的 ' + pct(0.4 * k) + '＋40。', '噴完留下熔岩攤（亮亮的一片），會留大約 8～21 秒（越大的留越久）：站在上面每一秒燙一次，一次跟噴中一樣痛。剛噴完的 0.6 秒還沒積起來，噴中之後來得及跳出去。']],
      ['怎麼躲', ['看到紅圈就往旁邊走，不要往前直衝（瞄你的那兩個會算你的方向）。', '翻滾可以穿過去。熔岩攤要繞開，噴過的地方要繞一陣子。', '戴斗笠：場地效果的傷害 −30%。']],
      ['遺跡生物', ['一樣會被噴、會被燙（每次 ' + Math.round(20 * k) + ' 點）：可以把牠們引到紅圈裡。']]],
    desert: k => [['魔力乾枯', ['沙漠裡魔力自己回得只剩一半（自然回復、回魔詞綴、每秒回魔都算）。', '沙暴來的時候完全不回。喝魔力藥、擊倒回魔、技能回魔照常。']], ['會發生什麼', ['平靜一陣子（大約 ' + Math.round(16 / k) + '～' + Math.round(24 / k) + ' 秒）→ 提醒「沙牆要來了」→ 颳一陣沙暴（' + Math.round(7 * (0.8 + 0.2 * k)) + '～' + Math.round(10 * (0.8 + 0.2 * k)) + ' 秒）。', '沙暴裡看不遠（霧變得很近）、被風往一個方向推、走得慢。']],
      ['多痛', ['沙暴裡每 1.5 秒刮掉生命上限的 ' + pct(0.02 * k) + '。']],
      ['怎麼辦', ['提醒出現就先打完眼前的、別往沒走過的地方衝；沙暴裡貼著牆走比較不會被吹走。', '沙暴前把魔力用在刀口上，多帶魔力藥。戴斗笠：沙暴的傷害 −30%。']]],
    snow: k => [['會發生什麼', ['地上淺藍色、亮亮的是冰面：踩上去會照原本的速度一直滑，很難停、很難轉彎。', '地上白色、鼓起來的是積雪（跟冰面不會重疊）。', '暴風雪一陣一陣來：平靜大約 ' + Math.round(16 / k) + '～' + Math.round(24 / k) + ' 秒，颳 ' + Math.round(7 * (0.8 + 0.2 * k)) + '～' + Math.round(10 * (0.8 + 0.2 * k)) + ' 秒；颳的時候看不遠、被風推、走得慢。']],
      ['凍傷', ['左上角有一格凍傷值（0～100）。站在積雪裡每秒 +30；暴風雪的時候到處每秒 +6；其他時候每秒 −8，靠近營火、火焰每秒 −30。', '凍傷值滿了：走路變慢，每 1.5 秒掉生命上限的 ' + pct(0.025 * k) + '＋1，畫面四周結霜。']], ['多痛', ['暴風雪裡每 1.5 秒凍掉生命上限的 ' + pct(0.03 * k) + '。冰面本身不會痛。']],
      ['怎麼辦', ['打架的時候避開冰面、積雪；要過冰面就先放慢、對準方向再走。', '凍傷值快滿就離開積雪、找營火或火焰取暖。']]],
    deep: k => [['會發生什麼', ['藍色的圈是暗流：圈裡的箭頭往哪邊流，就把人（和遺跡生物）往哪邊沖。', '水壓：每 ' + Math.round(10 / k) + '～' + Math.round(14 / k) + ' 秒，你腳下出現一個藍圈，1.3 秒後往外一推。']],
      ['多痛', ['水壓推到：生命上限的 ' + pct(0.06 * k) + '＋3，還會被推開。暗流不會痛。']],
      ['怎麼辦', ['藍圈一出現就走出去。暗流可以拿來把遺跡生物沖開，自己走出圈外就不會被沖。']]],
    forge: k => [['會發生什麼', ['兵工廠的機關還在動，越深越多。', '地刺：有孔的鐵板。踩上去「喀」一聲變紅，半秒後尖刺冒出來，一秒後縮回去、再過 1.4 秒才能再觸發。', '絞肉機：房間地上的圓形鐵柵。轉 5～6.5 秒、停 3 秒（要轉之前會冒火星、響警報）；轉的時候靠近會被吸過去。', '輸送帶：走道上的帶子，箭頭往哪邊流就把人往哪邊送，逆著走很慢。']],
      ['多痛', ['地刺：生命上限的 ' + pct(0.22 * k) + '＋6，還會變慢一下。', '絞肉機：站在上面每 0.35 秒一次，每次生命上限的 ' + pct(0.07 * k) + '＋6。', '戴斗笠：機關的傷害 −30%。']],
      ['遺跡生物', ['一樣會中（地刺 ' + Math.round(30 * k) + ' 點、絞肉機每次 ' + Math.round(14 * k) + ' 點）：把牠們引到鐵板、鐵柵上。領主體不會被絞肉機吸過去。']]]
  };
  const ENV_NAME = { volcano: '火山', desert: '沙漠', deep: '深海', snow: '凍原', forge: '熔爐' };
  R.FIELD_INFO = FIELD; R.FIELD_ENV_NAME = ENV_NAME;   // 圖鑑的遺跡頁（dexruins.js）也用
  // 分級帶來的效果（2026-10-05 作者：圖鑑裡的場地效果也要更新）：圖鑑的遺跡頁列在場地效果下面，點了看 more
  const lvOf = g => (g && g.lv) || 0;
  const GFX = {
    traps: { n: '機關', d: '地上的釘板、克森特級生物撒的撒菱。', on: g => true, more: g => ['釘板：一陣一陣刺出來（刺出來之前先發紅）。刺中＝生命上限的 ' + pct(0.14 + 0.03 * lvOf(g)) + '＋' + 8 * lvOf(g) + '，重傷 5 秒（受到的治療 −80%）、腳步變慢；整間都是釘板的機關房再加破防 4 秒。', '遺跡生物踩到也很痛（生命的 15%＋20），還會被定住——可以把牠們引過去。', '撒菱（克森特級以上的生物會撒）：生命上限的 5%＋分級×4、踩到慢 1.5 秒，留 24 秒。', '戴斗笠：機關的傷害 −30%。'] },
    debuff: { n: '遺跡生物的手段', d: '打中你的時候可能破防、虛弱、重傷。', on: g => lvOf(g) >= 3, more: g => ['破防：6 秒內受到的傷害 +25%。', '虛弱：6 秒內打出去的傷害 −25%。', '重傷：8 秒內受到的治療 −80%。', '每一種生物固定帶一種（大約六成的生物有），精英、領主體三種都可能。機率：一般 15%、精英 30%、領主體 40%' + (g.id === 'kaso' ? '，卡索級再 +10%' : '') + '。', '中了會跳字，左上角顯示還剩幾秒；同一種再中就重新計時，不會疊加。'] },
    heal: { n: '魔力太濃', d: '受到的治療變少。', on: g => lvOf(g) >= 4, more: g => ['魔力太濃，傷口長不好：受到的治療（回復藥、技能、每秒回血、吸血全部算）' + (g.id === 'kaso' ? '−60%' : '−40%') + '。', '左上角會寫「魔力太濃：治療 −' + (g.id === 'kaso' ? '60' : '40') + '%」。重傷的話再 −80%（剩下的再打兩折）。'] },
    variant: { n: '領主體的異變', d: '領主體有機會以異變的樣子出現。', on: g => lvOf(g) >= 4 && !!g.lords, more: g => ['機率：' + (g.id === 'kaso' ? '45%' : '25%') + '，最深三成的樓層再 +10%。名字後面多一個異變名號、體型更大、腳下一圈紅光。', '生命是原本的四倍、更痛、護甲更厚。血掉到三分之二、三分之一的時候再異變（震開周圍、短暫不會受傷），每一種都多兩招自己的新招，第三形態出招更快。', '打倒：異變核心 ' + (g.id === 'kaso' ? 3 : 2) + ' 個（每一種第一次打倒再多 2 個）、15% 直接掉一件神話武器。異變核心在鐵匠鋪做紅武（一定是神話）。'] },
    kaso: { n: '卡索級的生物', d: '更多、更強，還有卡索專屬的生物。', on: g => g.id === 'kaso', more: g => ['遺跡生物生命 ×1.6、傷害 ×1.35，每間房間再多五成。', '專屬的六種：裂隙獵手（地上冒紫圈，下一瞬間站在那裡揮爪）、殘響（三團紫光，打散分成兩個小的）、噬界者（把人吸過去再砸下來）、錯位影（出現在你一秒半前站的地方再衝過來）、稜鏡體（十字光彈邊轉邊射）、虛甲騎士（拉線衝鋒，撞牆會暈）。'] },
    chaos: { n: '空間錯亂', d: '走下樓梯不一定到下一層。', on: g => g.id === 'kaso', more: g => ['下樓：六成到下一層、兩成五往下跳兩層、一成跳三層、半成被甩回上一層。', '不會跳過存檔點那一層，也不會超過最深處。跳的時候會有橫幅。'] },
    rift: { n: '空間裂隙', d: '走著走著會裂開一道縫。', on: g => g.id === 'kaso', more: g => ['每 8～14 秒在你附近冒出紫色的圈，1.2 秒後裂開一道縫，留 6 秒。', '踩進去會被丟到這一層的別的房間，掉生命上限的 8%。', '裂開的時候有一半會爬出一兩隻卡索專屬的生物。'] },
    exit: { n: '回歸水晶', d: '卡索級哪裡出得去。', on: g => g.id === 'kaso', more: g => ['第一層的入口房間、每個存檔點那一層（記錄碑旁邊）、打倒領主體的地方，都有回歸水晶。', '最深處的佩特拉核心打倒以後也會出現。'] }
  };
  R.GRADE_FX = GFX;
  R.gradeFxOf = s => { const g = s && R.gradeById && R.gradeById(s.grade); return g && g.id !== 'hunt' && s.id !== 'kanko' ? Object.keys(GFX).filter(k => GFX[k].on(g)) : []; };
  R.fieldSheet = () => {
    const run = W().run; if (!run || !run.env || !FIELD[run.env]) return;
    const k = deep(run);
    sheet('場地效果', ENV_NAME[run.env] + '：' + ((R.ENVS[run.env] || {}).desc || ''), FIELD[run.env](k),
      '現在的強度 ×' + k.toFixed(2) + '（照走到第幾成算：第一層 ×1，越深越兇，最深 ×2）。上面的數字已經照現在的強度算好了。');
  };
  // 一趟遺跡同一種環境只講一次（kesentfx.js 每一層都會講）
  const to0 = R.toast;
  if (to0) R.toast = (txt, col) => {
    const run = W().run;
    if (run && typeof txt === 'string' && txt.indexOf('場地效果・') === 0) {
      run.fieldTold = run.fieldTold || {};
      if (run.fieldTold[run.env]) return;
      run.fieldTold[run.env] = 1;
      txt = txt + '（點左上角的「場地」那一格看詳細說明）';
    }
    return to0(txt, col);
  };

  // ---------- 樓層效果、領主層 ----------
  const MOD_MORE = {
    fog: ['霧很濃：只看得到身邊 5 公尺，和準心那一邊 45 度的扇形（一路看得到底）——轉準心才看得到旁邊、後面的遺跡生物。'], treasure: ['這一層多兩個寶箱。'], crystal: ['牆邊長滿可以掘的魔晶礦，帶十字鎬來。'],
    nest: ['遺跡生物多五成（上鎖的房間會再多叫幾隻）；打倒的經驗 +30%。'], silent: ['遺跡生物少一半，但剩下的每一隻都帶著特性（〔迅捷〕〔堅甲〕……）。'],
    rockfall: ['每 3.5～6 秒，你身邊會出現兩個圈，1.1 秒後天花板的石頭掉下來：砸到扣生命上限的 10%。'], mana: ['技能冷卻 −30%，但遺跡生物的傷害 +15%。'], lost: ['小地圖看不到，只能靠自己記路。']
  };
  R.FLOOR_MOD_MORE = MOD_MORE;   // 圖鑑的遺跡頁（dexruins.js）也用
  R.floorModSheet = () => {
    const F = W().F, m = F && F.mod, M = R.FLOOR_MODS && R.FLOOR_MODS[m]; if (!M) return;
    sheet('樓層效果', M.n, [['這一層', [M.d].concat(MOD_MORE[m] || [])]], '樓層效果每一層重新抽（第一層以後，大約四成五的樓層有）。');
  };
  R.lordSheet = () => {
    const F = W().F; if (!F || !F.lordGate) return;
    sheet('領主層', F.lordGate.down ? '領主體倒下了' : '領主體守著樓層通道', [['規則', ['克森特級、卡索級每 3～5 層有一隻領主體，守在通往樓層通道的路上（城堡大廳一樣的房間，地上有金色的邊線）。', '牠倒下之前，樓層通道被牠的力量封著，下不去。', '打倒以後：那一區有金寶箱，這一層也變成存檔點（下次可以從這一層開始）。']], ['打法', ['大廳兩側的柱子可以躲。領主體血剩三成五以下會發狂。', '打不贏可以用回歸水晶回去（委託的成績會受影響）。']]]);
  };

  // ---------- 佩特拉的注意：加上現在的數字、這座遺跡的反應 ----------
  const as0 = R.awareSheet;
  R.awareSheet = () => {
    if (as0) as0();
    const run = W().run, sh = $('r-sheet'); if (!run || !sh) return;
    const rx = run.reactionKnown && R.REACTIONS && R.REACTIONS[run.reaction];
    const p = document.createElement('div'); p.className = 'hi-now';
    p.innerHTML = '<h3>現在</h3><ul class="loot hi-list"><li>' + esc('佩特拉的注意：' + Math.floor(run.aware) + '／100' + (run.aware >= 75 ? '（快滿了：先停手、等它降下來）' : run.aware >= 50 ? '（過半了）' : '')) + '</li><li>' + esc(rx ? '這座遺跡的反應：' + rx.name + '——' + rx.desc : '這座遺跡的反應：還不知道（滿 100 觸發一次就會知道；第 0 層的告示板也可能寫著）') + '</li></ul>';
    const h2 = sh.querySelector('h2'); if (h2) h2.after(p);
  };

  // ---------- 讓那幾格點得到 ----------
  const BOXES = [['kfx-box', () => R.fieldSheet(), '點一下：場地效果的詳細說明'], ['rv-mod', () => R.floorModSheet(), '點一下：樓層效果的說明'], ['hf-lord', () => R.lordSheet(), '點一下：領主層的說明'], ['r-aware-box', () => R.awareSheet(), '點一下：什麼會讓佩特拉的注意升、降']];
  const hook = () => {
    BOXES.forEach(([id, fn, tip]) => {
      const el = $(id); if (!el) return;
      if (!el.dataset.hi) { el.dataset.hi = 1; el.onclick = null; el.addEventListener('click', e => { e.stopPropagation(); if (W().run && !(R.sheetOpen && R.sheetOpen())) fn(); }); }
      el.title = tip; el.classList.add('hi-click');
      // 問號用 CSS 的 ::after 畫在框上（2026-10-05 作者：場地的問號一直閃——原本是塞一個 <i> 進去，kesentfx.js、hudframe.js 重寫內容就洗掉，0.25 秒後才補回來）
      const old = el.querySelector(':scope > .hi-q'); if (old) old.remove();
    });
  };
  let t = 0;
  const st0 = R.step;
  R.step = dt => { const r = st0(dt); if ((t -= dt) <= 0) { t = 0.25; try { hook(); } catch (e) { } } return r; };

  const css = document.createElement('style');
  css.textContent = '.hi-click{pointer-events:auto!important;cursor:pointer;position:relative;padding-right:24px!important;transition:filter .15s}'
    + '.hi-click:hover{filter:brightness(1.25)}'
    + '.hi-click::after{content:"?";position:absolute;right:5px;top:50%;transform:translateY(-50%);width:15px;height:15px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:10.5px;font-weight:800;color:#140E0A;background:rgba(255,236,190,.9);box-shadow:0 0 0 1px rgba(0,0,0,.5);z-index:2;pointer-events:none}'
    + '.hi-list li{margin:3px 0;line-height:1.55}';
  document.head.appendChild(css);
})(window.R);
