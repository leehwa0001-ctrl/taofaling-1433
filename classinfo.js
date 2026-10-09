// 職業說明的「？」（2026-10-08 作者：每個職業多一個問號，按下去顯示這個職業的特色、職業效果、技能等等）
// - 出現在：捏角最後一步選武器（每一類的標題旁邊）、公會登記處的「武器登記」（每一列）。
// - 內容：基本數值、武器、職業特效（classcore.js 的 help）、大招、技能書的技能、三條轉職路線（被動、路線大招、路線技能）。
// - 視窗是自己開的（#ci-modal，最上層；Esc、點外面、「知道了」關掉）。
// - 用 MutationObserver 找畫面上的 .reg-group、.cls-row 補上按鈕（不改 creator.js、hub.js 原本的字串）。
// 放在 classcore.js、monkstance.js、ult.js、ultpath.js、skillbook.js、creator.js、hub.js 後面。
(function (R) {
  const esc = s => R.esc(String(s == null ? '' : s)), $ = id => document.getElementById(id);
  const fakeP = cls => ({ cls, adv: '', lv: 1, ws: {}, item: null, hp: 1, hpMax: 1, mp: 0, mpMax: 0, x: 0, z: 0 });
  const helpOf = cls => { const c = R.CORE && R.CORE[cls]; if (!c) return null; let t = ''; try { t = c.help ? c.help(fakeP(cls)) : ''; } catch (e) { t = ''; } return { name: c.name || '', t }; };
  const skillsOf = (cls, adv) => Object.values(R.SKILL_LIB || {}).filter(s => s && s.cls === cls && (adv ? s.adv === adv : !s.adv)).sort((a, b) => (a.lv || 0) - (b.lv || 0));
  const chip = s => '<span class="ci-sk"><i>Lv ' + (s.lv || 1) + '</i>' + esc(s.name) + '</span>';
  // ---------- 說明的文字（2026-10-09 作者：介紹用省略的語氣講特色，不要直接講數值） ----------
  const CORE_T = {
    gunner: '換彈時抓準時機就是「完美換彈」，這一匣打得更痛；按錯會卡彈。彈匣滿的時候可以換彈種：穿甲、燃燒、冰凍，各自對付不同的敵人。',
    archer: '拉滿弓、在圈縮到金色時放箭就是「完美射擊」：貫穿、必定暴擊，還會疊鷹眼讓之後的箭越來越痛；被打就斷。',
    warrior: '用怒氣代替魔力：打人、挨打都會漲，停手就慢慢掉。怒氣夠多時一口氣吼出去，之後一陣子打得更痛。',
    mage: '切換火、冰、雷三種元素，攻擊和法術都帶著它。同一隻敵人身上疊到不同的元素就會引爆——蒸發、碎冰、過載各有各的效果。',
    priest: '補血、祝福都會攢信仰，補過頭的量會化成光去打最近的敵人。信仰滿了可以放「神蹟」：大家回血、清掉負面狀態，還會震傷周圍。',
    blade: '收刀不攻擊時累積刀意，下一刀照刀意加倍，滿了必定暴擊。看準時機納刀就是「見切」：不受傷、反斬周圍、刀意直接滿。',
    knight: '看準時機防禦就是「完美格擋」：不受傷、對方暈眩，還會自動盾擊反制；防禦的時候也替身邊的隊友擋傷害。',
    monk: '四種「法」輪流切換：拳法出拳快、掌法把敵人打飛、步法邊打邊往前跨、腿法慢但一腳很重。普攻打中會累積「勢」，勢滿了換法，換過去的那一法會爆發出強化。裝備和天賦的攻速對武術家沒用，會轉成普攻的傷害。',
    bard: '每放一招就是一個音，最後三個音照曲譜就演奏出曲子——進行曲、安魂曲、戰歌、疾風曲、鎮魂鐘、終章，各有鼓舞或攻擊的效果；等級越高會的曲子越多。',
    summoner: '召喚物會集火你最後打的那一隻，打中、打倒都會攢執念；執念夠多時可以讓召喚物一起炸開。圖鑑裡打倒夠多的遺跡生物，會變成新的召喚形態。',
    arraymage: '在地上放法陣或陣眼，三個點連成閉環的時候，三角形裡的敵人會被重創並定住。',
    enchanter: '普攻打中會攢刻印的力量，攢滿了就自動釋放；武器上刻著的刻印（焰、霜、雷、風、金）會讓普攻和技能帶上那種元素的特性。',
    scroll: '短時間內放出三種不同的技能就會連鎖，最後那一招免費再放一次；展卷可以讓所有技能的冷卻歸零。'
  };
  const ULT_T = {
    gunner: '朝準心扇形狂掃一陣，掃射時不會受傷；結束後射速變快一陣子。',
    archer: '一大片箭雨落下，落點的敵人變慢；之後一陣子更容易暴擊、跑得更快。',
    warrior: '跳起來劈下、整片地裂開，武器越長範圍越大；落地後一陣子更耐打。',
    mage: '七顆隕星砸下來，順便重置技能冷卻、回滿魔力。',
    priest: '光柱降下，自己和隊友回滿；一陣子內倒下會原地站起來一次。',
    blade: '在附近的敵人之間來回閃斬；之後一陣子更容易暴擊、跑得更快，翻滾也馬上能用。',
    knight: '幾秒內什麼都打不穿，附近的遺跡生物只能打你；結束時多一層護盾。',
    monk: '閃到附近的敵人面前各打一拳，最後一拳打在地上；回一些生命，之後一陣子更耐打、跑得更快。',
    bard: '回復自己和附近的隊友、連續震擊周圍的敵人，之後一陣子跑得更快、更耐打，魔力也回來一些。',
    summoner: '一口氣捏出一群召喚物和一尊巨像，自己也多一層護盾。',
    arraymage: '以你為中心畫出巨大的閉環連爆好幾次，定住陣裡的敵人，自己也拿到護盾。',
    enchanter: '把各種元素一起灌進武器，周圍一圈魔力爆發，附魔也維持得更久。',
    scroll: '把身上的卷軸全部撕開、四面八方連發，魔力回滿、技能冷卻縮短。'
  };
  const ADV_T = {
    sniper: '蓄力射出貫穿一切的子彈，射程更遠、更容易暴擊。大招最後補一發必定暴擊的狙擊彈。',
    magigun: '子彈帶上火、冰、雷，燃燒、減速、麻痺輪流來。大招掃射時前方的敵人輪流被元素打中。',
    bomber: '丟出爆裂核心大範圍炸開，爆炸特別痛，但會引來佩特拉的注意。大招朝準心一路連炸。',
    arcane: '箭會追著敵人跑，技能一口氣射出一群追蹤箭。大招落下時再對周圍放出大量追蹤魔箭。',
    ranger: '放捕獸夾定住敵人，跑得快、翻滾得勤。大招先夾住落點的敵人，再讓你跑得更快。',
    hama: '專打遺跡生物，破魔矢一箭射穿一整排，弱小的一擊就散。大招最後落下巨大的破魔矢並破甲。',
    berserker: '越殘血越兇，狂怒時又快又痛還會吸血。大招先把周圍的敵人吸過來再劈。',
    gladiator: '攻擊更快，迴旋連斬把周圍一圈掃開。大招落地後再接迴旋斬。',
    onimusha: '戴上鬼面，大範圍斬擊把敵人嚇得愣住；生命低時更耐打、更兇。大招留下一片持續燃燒的鬼火。',
    elementalist: '隕石砸下大範圍燃燒，攻擊常順手點燃或冰住敵人。大招的隕星輪流帶火、冰、雷，最後再落一顆大的。',
    hexer: '詛咒一片敵人，讓牠們受傷更重、走得更慢；被詛咒的敵人死掉時詛咒會傳下去。大招先詛咒落點再砸下隕星。',
    waixiu: '體外常駐一層魔力罩擋傷害、施法更快，還能把魔力罩炸開震飛敵人；但魔力外放，比較容易被佩特拉注意到。大招先補滿魔力罩再炸開。',
    bishop: '展開聖域回血又灼傷敵人，治療更強。大招再展開更大的聖域並給大家護盾。',
    druid: '藤蔓纏住周圍的敵人並持續回血，平時也會慢慢自己回。大招纏住一大片敵人並大量回復。',
    shinkan: '張開結界擋下所有投射物，範圍內的遺跡生物會變弱，也比較不會引來佩特拉。大招的結界還會讓敵人變慢。',
    kensei: '暴擊打得特別痛，居合一刀斬出一直線、必定暴擊。大招斬完再補一記遠距離的一閃。',
    shadow: '影步閃到敵人背後重擊並隱身，從背後打特別痛。大招斬完隱身，隱身時更容易暴擊。',
    yoto: '妖刀吸遺跡生物的魔力質，打倒越多越強，還能一口氣解放成大範圍斬擊。大招閃斬時打倒敵人會回血，最後放出一圈妖氣斬。',
    templar: '堡壘大幅減傷並反彈傷害，平時也比較耐打。大招城塞期間一直震傷身邊的敵人。',
    paladin: '聖光衝鋒並回復自己，擋下攻擊也會回血。大招城塞期間連隊友一起持續回血，結束時放出一圈聖光。',
    dragoon: '長槍打得更遠，龍躍跳起來落下震飛敵人、空中不會受傷。大招結束時再跳一次把周圍擊飛。',
    fistsaint: '出拳更快、更容易暴擊，百裂拳一口氣打出一大串。大招閃到每隻敵人面前時多打好幾拳。',
    staffmonk: '攻擊範圍更大、更耐打，風車棍掃開身邊所有敵人。大招最後長棍一圈比一圈大地掄開。',
    inner: '把魔力質注進全身強化肉體和五感：站著不動會回生命和魔力，攻擊也不會引來佩特拉；氣勁一掌震退周圍的敵人，還能震碎行壁。大招回復自己並讓周圍的敵人暈眩。',
    aria: '治療更強，頌歌回血還給護盾，隊友也比較耐打。大招給大家護盾並清掉負面狀態。',
    drummer: '技能冷卻更快、更容易暴擊，雷鼓一圈一圈震飛周圍的敵人。大招多敲幾下並大幅縮短技能冷卻。',
    serane: '瑟蘭派：用共振圍出「奏域」，裡面回血、灼傷敵人；魔力更多，也比較不會引來佩特拉。大招在腳下展開更久的奏域。',
    beastlord: '一口氣召喚一群土狼，召喚物更兇、待得更久。大招再多捏幾隻一起咬。',
    medium: '放出怨靈纏住周圍的敵人一直咬，每次召喚都會回血。大招讓怨靈纏住一大片敵人並回復自己。',
    tamer: '用執念捏出這一層遺跡生物的樣子替你打，召喚物更強，也比較不會引來佩特拉。大招再捏出一隻替你打。',
    shikigami: '把執念寫進紙裡折成式神，環繞著你自動攻擊，平時就有一隻跟著。大招一次放出一群式神。',
    grandarray: '法陣更大、技能更痛，能在準心處畫出巨大的閉環爆開。大招最後再爆一次更大的。',
    warder: '立起結界燈持續回復，平時也更耐打。大招一陣子內大量回血並減傷。',
    eidanora: '抑制圈：法陣不散，長時間持續傷害並讓敵人變慢，技能也更省魔力。大招爆完留下一片抑制圈。',
    runesmith: '一次刻上好幾種元素，打得更穿、更容易燃燒。大招再刻上毒和金，讓敵人中毒、破甲。',
    spellblade: '把附魔的斬擊打出去穿過一整排敵人，法術也算進近戰傷害、魔力更多。大招期間普攻也會順手打出劍氣。',
    entian: '恩特安的作品撕得開魔力罩，無視更多護甲，一刀直線必定暴擊。大招朝準心撕開一道長長的裂口並破甲。',
    scribe: '技能冷卻更快，疊卷一次撕開好幾張火卷在準心連爆。大招再連爆一輪火卷。',
    sealer: '封印符把敵人封住並讓牠受傷更重，也更容易暴擊。大招封住一大片敵人並詛咒。',
    noxa: '一次把預先寫好的卷軸全放出去，魔力更多，在魔力濃的遺跡更強。大招再放一輪並回魔力。'
  };
  // 沒寫到的（之後新加的職業、路線）：照原本的說明，把數字拿掉
  const noNum = s => String(s || '').replace(/[（(][^）)]*\d[^）)]*[）)]/g, '').replace(/[+＋−\-×x]?\s*\d+(\.\d+)?\s*(%|％|秒|公尺|倍|隻|下|層|點|發|支|拳|圈|張)?/g, '').replace(/[、，]\s*[、，]/g, '，').replace(/\s{2,}/g, ' ');
  // 生命、魔力、移動：跟其他職業比（高／中／低、快／普通／慢）
  const tierOf = (cls, k, words) => { const vs = R.CLASS_IDS.map(c => R.CLASSES[c] && R.CLASSES[c][k]).filter(v => v != null).sort((a, b) => a - b), v = R.CLASSES[cls][k], i = vs.indexOf(v) / Math.max(1, vs.length - 1); return i >= 0.67 ? words[0] : i >= 0.34 ? words[1] : words[2]; };
  R.classInfo = cls => {
    const d = R.CLASSES[cls]; if (!d) return '';
    const g = R.regGroup ? R.regGroup(cls) : null, core = helpOf(cls), U = R.ULTS && R.ULTS[cls], P = R.ULT_PATHS && R.ULT_PATHS[cls];
    const sig = R.SKILLS && R.SKILLS[d.skill];
    const base = skillsOf(cls, '');
    let h = '<div class="ci" style="--c:' + d.color + '"><h2>' + esc(d.name) + (g ? '<small>公會分類：' + esc(g.group) + '</small>' : '') + '</h2>'
      + '<p>' + esc(d.desc) + '</p><p class="ci-st"><span>生命 <b>' + tierOf(cls, 'hp', ['高', '中', '低']) + '</b></span><span>魔力 <b>' + tierOf(cls, 'mp', ['高', '中', '低']) + '</b></span><span>移動 <b>' + tierOf(cls, 'speed', ['快', '普通', '慢']) + '</b></span>' + (d.shield ? '<span>帶盾</span>' : '') + '</p>';
    if (g && g.list) h += '<h3>武器</h3><ul class="ci-w">' + g.list.map(([w, line]) => '<li><b>' + esc(R.regName ? R.regName(cls, w) : w) + '</b>　' + esc(line) + '</li>').join('') + '</ul>';
    if (core) h += '<h3>職業特效：' + esc(core.name) + '</h3><p>' + esc(CORE_T[cls] || noNum(core.t)) + '</p>';
    if (U) h += '<h3>大招：' + esc(U.name) + '</h3><p>' + esc(ULT_T[cls] || noNum(String(U.sub || '').replace(/｜/g, '；'))) + '</p><p class="note">打中、被打會累積大招能量，滿了按 V。</p>';
    h += '<h3>技能</h3>' + (sig ? '<p>一開始的技能：<b>' + esc(sig.name) + '</b></p>' : '')
      + '<p class="note">職業等級升上去會學到新技能，到技能書換上（詳細的數值在技能書裡看）。</p><div class="ci-sks">' + base.map(chip).join('') + '</div>';
    const advs = R.ADV && (R.ADV[cls] || []).filter(a => !a.legacy);   // 2026-10-09：刪掉（legacy）的轉職路線不列
    if (advs && advs.length) {
      h += '<h3>轉職（Lv ' + (R.PROMOTE_LV || 30) + '，交一顆魔力核心）</h3><div class="ci-advs">' + advs.map(a => {
        const pu = P && P[a.id], sk = skillsOf(cls, a.id);
        return '<div class="ci-adv"><b>' + esc(a.name) + '</b><small>' + esc(a.path || '') + '</small><p>' + esc(ADV_T[a.id] || noNum(a.desc || '')) + '</p>'
          + (pu ? '<p class="note">路線大招「' + esc(pu.name) + '」</p>' : '')
          + (sk.length ? '<div class="ci-sks">' + sk.map(chip).join('') + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    }
    return h + '</div>';
  };
  const FOOT = '<div class="row"><button type="button" class="btn pri" data-ciclose="1">知道了</button></div>';
  // 自己的視窗（最上層）：捏角畫面、公會頁面都蓋得過去，遊戲也不用暫停
  const close = () => { const m = $('ci-modal'); if (m) m.hidden = true; };
  R.showClassInfo = cls => {
    const html = R.classInfo(cls); if (!html) return;
    let m = $('ci-modal'); if (!m) { m = document.createElement('div'); m.id = 'ci-modal'; m.innerHTML = '<div class="ci-box" role="dialog" aria-modal="true"></div>'; m.onclick = ev => { if (ev.target === m) close(); }; document.body.appendChild(m); }
    const box = m.firstChild; box.innerHTML = html + FOOT; m.hidden = false; box.scrollTop = 0;
  };
  document.addEventListener('keydown', ev => { const m = $('ci-modal'); if (ev.key === 'Escape' && m && !m.hidden) { ev.stopPropagation(); close(); } }, true);
  document.addEventListener('click', ev => {
    const q = ev.target.closest && ev.target.closest('[data-clsq]');
    if (q) { ev.preventDefault(); ev.stopPropagation(); R.showClassInfo(q.dataset.clsq); return; }
    const c = ev.target.closest && ev.target.closest('[data-ciclose]');
    if (c) { ev.preventDefault(); ev.stopPropagation(); close(); }
  }, true);
  // 畫面上的職業列表補上「？」
  const btn = cls => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cls-q'; b.dataset.clsq = cls; b.textContent = '?'; b.title = '這個職業的說明'; return b; };
  const scan = () => {
    document.querySelectorAll('.reg-group:not([data-q])').forEach(gp => { gp.dataset.q = 1; const c = gp.querySelector('[data-cls]'), h = gp.querySelector('h4'); if (c && h) h.appendChild(btn(c.dataset.cls)); });
    document.querySelectorAll('.cls-grid').forEach(gr => { gr.querySelectorAll('.cls-row').forEach((row, i) => { if (row.dataset.q) return; row.dataset.q = 1; const cls = R.CLASS_IDS[i]; const b = row.querySelector('b'); if (cls && b) b.after(btn(cls)); }); });
  };
  let queued = false;
  new MutationObserver(() => { if (queued) return; queued = true; setTimeout(() => { queued = false; scan(); }, 0); }).observe(document.body, { childList: true, subtree: true });
  const css = document.createElement('style');
  css.textContent = '#ci-modal{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,6,4,.62)}#ci-modal[hidden]{display:none}'
    + '.ci-box{width:min(720px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:16px 18px;border-radius:10px;border:1px solid #5A4A38;background:#1C1714;color:#EDE6DA;box-shadow:0 10px 40px rgba(0,0,0,.6);font-size:14px}.ci-box .row{display:flex;justify-content:flex-end;margin-top:12px}.ci-box .note{opacity:.7;font-size:12.5px}'
    + '.cls-q{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-left:6px;padding:0;border-radius:50%;border:1px solid var(--c,#C9A85A);background:rgba(0,0,0,.25);color:var(--c,#E8D8A8);font:700 12px/1 system-ui,sans-serif;cursor:pointer;vertical-align:middle;flex:none}.cls-q:hover{background:var(--c,#C9A85A);color:#140F0A}'
    + '.ci h2{border-left:4px solid var(--c);padding-left:10px}.ci h2 small{display:block;font-size:12px;opacity:.7;font-weight:400}.ci h3{margin:14px 0 4px;color:var(--c);filter:brightness(1.35)}.ci p{margin:4px 0;line-height:1.6}'
    + '.ci-st{display:flex;flex-wrap:wrap;gap:6px 14px}.ci-w{margin:4px 0;padding-left:18px;line-height:1.6}.ci-sks{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}'
    + '.ci-sk{display:inline-flex;gap:5px;align-items:baseline;padding:2px 8px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);font-size:12.5px;cursor:help}.ci-sk i{font-style:normal;font-size:10.5px;opacity:.65}'
    + '.ci-advs{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}.ci-adv{padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04)}.ci-adv small{margin-left:8px;opacity:.7}.ci-adv p{font-size:13px}';
  document.head.appendChild(css);
})(window.R);
