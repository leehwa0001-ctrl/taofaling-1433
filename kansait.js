// 討伐令 1433：近神段——由會長坎賽特親自決定（作者 2026-10-04：會長是坎賽特；參考作者的〈坎賽特記・前傳・回憶〉）
// 公會簡章：近神段「由會長親自決定」。原本 ranks.js 寫遊戲裡還沒開放，這裡接上：
// - 特攻段・阿特斯階、升段的條件都達到（X 級以上 2 件、最近 10 件平均 98%）、職業等級 70 以上 → 隔天會長坎賽特召見。
// - 會長室：嵌燈全暗著，只有落地窗那邊亮；他拿著澆壺在窗邊澆花、哼著早就退流行的小曲；桌上那本日記的封面寫著「愛人」。
//   （前傳裡的米雅、他被精神控制的那個春天都不寫進遊戲，只留這些畫面。）
// - 第一次見面：指派「在卡索級的特別討伐令裡打倒最深處的佩特拉核心」→ 回來再見他 → 近神段・散心階。
// - 職業等級 80 以後再見他：指派「一趟卡索級裡打倒三隻領主體、再打倒核心」→ 近神段・斷心階。
// - 存在 R.S.kansait = { step, lords }。step：1 召見、2 第一件指派中、3 第一件完成、4 散心階（等 80 級）、5 第二件指派中、6 第二件完成、7 斷心階。
// 放在 ranks.js、kaso.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  // 和 ranks.js 一樣的算法（那邊沒有匯出）
  const LET = ['F', 'E', 'D', 'C', 'B', 'A', 'AA', 'S', 'SS', 'SSS', 'X', 'G'], li = l => LET.indexOf(l), OLD = { 'E～D': 'D', 'C～A': 'C', 'AA～SS': 'AA', 'SSS～G': 'SSS' };
  const rangeOf = txt => { const p = String(txt || '').split('～'); if (p.length < 2) return li(p[0]) >= 0 ? [p[0]] : []; const a = li(p[0]), b = li(p[1]); return a < 0 || b < 0 ? [] : LET.slice(a, b + 1); };
  const letterOf = t => OLD[t.letter] || (li(t.letter) >= 0 ? t.letter : (rangeOf(t.letter)[0] || 'F'));
  const reqMet = () => { const ts = S().tasks || [], done = ts.filter(t => t.avg != null && !t.failed), x = done.filter(t => li(letterOf(t)) >= li('X')).length, rec = ts.filter(t => t.avg != null).slice(-10), avg = rec.length ? rec.reduce((a, t) => a + t.avg, 0) / rec.length : 0; return x >= 2 && avg >= 98; };
  const lv = () => { const s = S(); return s && s.classes && s.classes[s.cls] ? s.classes[s.cls].lv : 1; };
  const K = () => { const s = S(); return s && s.kansait; };
  const atAtlas = r => r && r.dan === 4 && r.tier === 3;

  // ---------- 召見 ----------
  const check = () => {
    const s = S(), r = s && s.rank; if (!s || !r) return;
    if (!s.kansait && atAtlas(r) && reqMet() && lv() >= 70) { s.kansait = { step: 1 }; R.save && R.save(); setTimeout(() => R.banner && R.banner('公會會長坎賽特召見', '到公會的登記處，專員會帶你去會長室。'), 1800); }
    const k = s.kansait; if (k && k.step === 4 && lv() >= 80 && !k.told80) { k.told80 = 1; R.save && R.save(); setTimeout(() => R.toast && R.toast('職業等級 80：會長說過，到了這一步再去找他。（公會的登記處）', '#C8A040'), 2000); }
  };
  const nd0 = R.onNewDay;
  R.onNewDay = () => { nd0 && nd0(); try { check(); } catch (e) { console.warn('[kansait]', e); } };

  // ---------- 卡索級裡：打倒的領主體、核心 ----------
  const active = run => { const k = K(); return k && (k.step === 2 || k.step === 5) && run && run.grade && run.grade.id === 'kaso'; };
  const bd0 = R.onBossDown;
  R.onBossDown = e => {
    const r0 = bd0 ? bd0(e) : undefined, run = W().run;
    try {
      if (active(run) && e && e.def) {
        if (/^領主體/.test(e.def.name || '')) { run.ksLords = (run.ksLords || 0) + 1; if (K().step === 5) R.toast && R.toast('會長的指派：領主體 ' + Math.min(3, run.ksLords) + '／3', '#C8A040'); }
        if (e.id === 'petra') run.ksCore = 1;
        const k = K(); if (run.ksCore && (k.step === 2 || run.ksLords >= 3)) { run.ksDone = 1; setTimeout(() => R.banner && R.banner('會長的指派完成了', '活著回到地面，再去會長室一趟。'), 1500); }
      }
    } catch (err) { console.warn('[kansait]', err); }
    return r0;
  };
  const ex0 = R.extract;
  R.extract = how => { const run = W().run, k = K(); if (run && run.ksDone && k && (k.step === 2 || k.step === 5)) { k.step++; R.save && R.save(); } return ex0(how); };

  // ---------- 會長室 ----------
  const OFFICE = '辦公室的嵌燈全暗著，只有落地窗那邊亮。';
  const SCENES = {
    1: { kick: '公會本部・會長室', title: '會長坎賽特', lines: [
      '專員把你帶到會長室的門口，敲了兩下門就走了。門沒關。', OFFICE,
      '一個男人背對著你，拿著澆壺在窗邊澆花，嘴裡哼著一首你沒聽過的老歌，腳下踩著奇怪的舞步。',
      '「啊，來了來了。」他放下澆壺，轉過身。「我是坎賽特，這裡的會長。」',
      '辦公桌上攤著一本舊日記，封面寫著「愛人」兩個字。他順手把它闔上，推到桌子的另一邊。',
      '「阿特斯階……簡章上說，再往上就是『由會長親自決定』。」他坐進辦公椅，椅子吱了一聲。「所以我得先親眼看看你。」',
      '「給你一件事做：下一次接卡索級的特別討伐令，走到最深處，把佩特拉核心打下來。」',
      '「活著回來，我們再聊。」'], btn: '接下指派', next: 2 },
    2: { kick: '公會本部・會長室', title: '會長坎賽特', lines: [OFFICE, '坎賽特在窗邊澆花，看了你一眼：「卡索級的特別討伐令，最深處的核心。還沒做完吧？」', '「不急。活著比較重要。」'], btn: '告辭' },
    3: { kick: '公會本部・會長室', title: '近神段', lines: [
      '窗邊的花又開了一朵。坎賽特翹著腳坐在辦公椅上，手裡轉著一支筆。',
      '「聽說了。核心碎掉的時候，專員差點把記錄板摔了。」',
      '「好。」他在文件上簽了名，字很潦草。「近神段・散心階。」',
      '「從今天起，公會面對世界危機的時候，你是底牌之一。」',
      '「……別緊張。大部分的日子，底牌只要好好活著就行了。」'], btn: '收下勇者證', next: 4, promote: 0 },
    4: { kick: '公會本部・會長室', title: '會長坎賽特', lines: [OFFICE, '坎賽特哼著那首老歌，在窗邊澆花。', '「最後一階嘛……等你再強一點。」他沒有回頭。「職業等級到 80，再來找我。」'], btn: '告辭' },
    '4b': { kick: '公會本部・會長室', title: '會長坎賽特', lines: [
      OFFICE, '坎賽特把那本日記收進抽屜，關上。',
      '「80 了啊。」他伸了個懶腰。「最後一階，斷心階。」',
      '「這次要難一點：一趟卡索級的特別討伐令裡，打倒三隻領主體，再把核心打下來。」',
      '「一樣，活著回來。」'], btn: '接下指派', next: 5 },
    5: { kick: '公會本部・會長室', title: '會長坎賽特', lines: [OFFICE, '「一趟卡索級裡，三隻領主體，最後是核心。」坎賽特舉起澆壺晃了晃。「慢慢來。」'], btn: '告辭' },
    6: { kick: '公會本部・會長室', title: '近神段・斷心階', lines: [
      '坎賽特站在窗邊，哼著那首早就退流行的小曲。澆壺的水沒了，還有幾滴從高處滴下來。',
      '「……近神段・斷心階。」他沒有看文件，直接簽了名。「恭喜。也……辛苦了。」',
      '「魔族真是該死啊。」他忽然說了一句，又笑了笑。',
      '「沒事。回去吧——該工作了。」'], btn: '收下勇者證', next: 7, promote: 1 },
    7: { kick: '公會本部・會長室', title: '會長坎賽特', lines: [OFFICE, '坎賽特在窗邊澆花。「斷心階的勇者還來找我喝茶？」他笑了。「茶在左邊的櫃子。」'], btn: '告辭' }
  };
  const office = () => {
    const k = K(); if (!k) return; const r = S().rank;
    const key = k.step === 4 && lv() >= 80 ? '4b' : String(k.step), sc = SCENES[key]; if (!sc) return;
    const host = $('hub-sheet'), el = $('hub-modal'); if (!host || !el) return;
    host.innerHTML = '<p class="kicker">' + esc(sc.kick) + '</p><h2>' + esc(sc.title) + '</h2><div class="ks-office">' + sc.lines.map(l => '<p>' + esc(l) + '</p>').join('') + '</div><div class="row"><button type="button" class="btn pri" id="kso-ok">' + esc(sc.btn) + '</button></div>';
    el.hidden = false; host.scrollTop = 0;
    $('kso-ok').onclick = () => {
      if (sc.next) k.step = sc.next;
      if (sc.promote != null) { r.dan = 5; r.tier = sc.promote; r.exam = null; r.desig = null; setTimeout(() => { R.banner && R.banner('晉升' + (sc.promote ? '近神段・斷心階' : '近神段・散心階'), '會長坎賽特親自決定。'); R.sfx && R.sfx('chest'); }, 300); }
      R.save && R.save(); el.hidden = true; R.hub();
    };
  };
  R.kansaitOffice = office;

  // ---------- 公會登記處：勇者證下面 ----------
  const STATUS = {
    1: '會長坎賽特召見：去會長室一趟。', 2: '會長的指派：在卡索級的特別討伐令裡打倒最深處的佩特拉核心，活著回來。', 3: '會長的指派完成了：去會長室回報。',
    4: '近神段・散心階。下一階：職業等級 80 以後再去找會長。', 5: '會長的指派：一趟卡索級的特別討伐令裡打倒三隻領主體，再打倒核心。', 6: '會長的指派完成了：去會長室回報。', 7: '近神段・斷心階。'
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    const out = hub0(t, f);
    try {
      check();
      const box = document.querySelector('#hub-body .rk-box'), s = S(), r = s && s.rank, k = K(); if (!box || !r) return out;
      // ranks.js 寫的「由會長決定（遊戲裡還沒開放）」拿掉
      box.querySelectorAll('.rk-req li').forEach(li => { if (/還沒開放/.test(li.textContent)) li.remove(); });
      box.querySelectorAll('.rk-req').forEach(ul => { if (!ul.children.length) { const p = ul.previousElementSibling; if (p && p.classList.contains('note')) p.remove(); ul.remove(); } });
      if (!atAtlas(r) && r.dan < 5 && !k) return out;
      const div = document.createElement('div'); div.className = 'ks-box';
      if (!k) div.innerHTML = '<p class="note">近神段由會長坎賽特親自決定。條件都達到、職業等級 70 以上（現在 ' + lv() + '），會長會召見你。</p>';
      else { div.innerHTML = '<p class="note"><b>' + esc(STATUS[k.step] || '') + '</b></p><div class="row"><button type="button" class="btn' + ([1, 3, 6].includes(k.step) || (k.step === 4 && lv() >= 80) ? ' gold' : '') + '" id="ks-go">去會長室</button></div>'; }
      box.appendChild(div);
      const b = $('ks-go'); if (b) b.onclick = office;
    } catch (e) { console.warn('[kansait]', e); }
    return out;
  };
  R.kansaitDebug = { check, reqMet, SCENES };
  const css = document.createElement('style');
  css.textContent = '.ks-office p{margin:8px 0;line-height:1.7}.ks-box{margin-top:8px;padding:8px 10px;border-left:3px solid #C8A040;background:rgba(200,160,64,.08);border-radius:6px}';
  document.head.appendChild(css);
})(window.R);
