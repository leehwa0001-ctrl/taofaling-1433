// 符卷師：自己寫卷軸（2026-10-04 作者：卷軸派改為可以自己寫卷軸，他的裝備可以有毛筆、牛皮紙，要戰鬥前可以放在背包裡有寫好的卷軸，
//   高級的可以寫得更快；卷軸派的攻擊會扣錢）
// - 白藤堂多一張「符卷師的書桌」：買牛皮紙（素材 parchment，一張 4 費拉），一張紙寫一張卷軸。
//   寫的時候有進度條：職業等級越高、手上拿毛筆（稀有度越高越快）、轉職過的，寫得越快。
//   寫好的卷軸（R.S.scrolls）放在背包裡，最多 20＋等級／2 張，下遺跡自動帶著。
// - 遺跡裡，符卷師放技能：先用寫好的卷軸（一張，冷卻 −20%：預先寫好的零前搖）；沒有就現場寫——扣錢（4＋等級／8 費拉），沒錢就放不出來。
// - 普攻：卷軸、符紙、牛皮紙是真的紙，每打 6 下扣 1 費拉（紙錢）；毛筆是在空中寫字，不扣錢。
// - 新武器「牛皮紙」（一次兩張、比卷軸重）。遺跡裡左上角顯示卷軸還有幾張。
// 放在 classes2.js、gearmore.js、skillbook.js、skillpoints.js、hub.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const PRICE = 4, PAPER = { scrollb: 1, talisman: 1, parchment: 1 };
  R.WEAPONS.parchment = { name: '牛皮紙', cls: ['scroll'], kind: 'magic', dmg: 13, pellets: 2, rate: 1.5, speed: 18, range: 13, mp: 1.5, spread: 0.3 };
  if (R.WEAPON_LOOK) R.WEAPON_LOOK.parchment = 'scrollb';
  R.ICON_EXTRA = Object.assign(R.ICON_EXTRA || {}, { parchment: ({ rc }) => { rc(2, 3, 12, 10, '#D8C098'); rc(2, 3, 12, 1, '#A8885A'); rc(2, 12, 12, 1, '#A8885A'); rc(4, 6, 8, 1, '#5A3A2A'); rc(4, 8, 6, 1, '#5A3A2A'); rc(10, 9, 2, 2, '#C83A3A'); } });
  R.MATS.parchment = R.MATS.parchment || { name: '牛皮紙', color: '#D8C098', value: 2, desc: '符卷師寫卷軸用的紙。白藤堂有賣。' };
  const lvOf = () => { const s = S(); return s && s.classes[s.cls] ? s.classes[s.cls].lv : 1; };
  const cap = () => 20 + Math.floor(lvOf() / 2);
  const improv = () => 4 + Math.floor(lvOf() / 8);
  // 寫一張要幾秒
  const secPer = () => {
    const s = S(), st = s.classes[s.cls] || {}, eq = R.equipped(s.cls), wp = eq && eq.weapon;
    const brush = wp && wp.base === 'brush' ? 0.5 + 0.15 * (wp.rarity || 0) : 0;
    return Math.max(0.35, 2.4 / (1 + (lvOf() - 1) / 30 + brush + (st.adv ? 0.3 : 0)));
  };
  R.scrollInfo = () => ({ have: (S() && S().scrolls) || 0, cap: cap(), sec: secPer(), improv: improv() });
  // ---------- 書桌 ----------
  let job = null;
  const desk = () => {
    const s = S(), have = s.scrolls || 0, paper = s.mats.parchment || 0, room = Math.max(0, cap() - have), can = Math.min(room, paper), sp = secPer();
    const wb = n => '<button type="button" class="btn' + (n === can ? ' pri' : '') + '" data-sw="' + n + '"' + (can < 1 || job ? ' disabled' : '') + '>寫 ' + n + ' 張</button>';
    R.sheet('<p class="kicker">白藤堂・二樓</p><h2>符卷師的書桌</h2><p class="note">掌櫃：「桌子借你用，紙要買。」一張牛皮紙寫一張卷軸。寫好的放在背包裡，下遺跡自動帶著；放技能時先用寫好的（冷卻短一點），用完了就得現場寫——每次 ' + improv() + ' 費拉。</p>'
      + '<div class="recipes"><div class="recipe"><b>寫好的卷軸 ' + have + '／' + cap() + ' 張</b><small>寫一張要 ' + sp.toFixed(1) + ' 秒（等級越高、拿著毛筆、轉職過的，寫得越快）</small><div class="meter" style="margin:6px 0"><i id="sw-bar" style="width:0%"></i></div><small id="sw-st">' + (job ? '寫字中……' : '') + '</small></div>'
      + '<div class="recipe"><b>牛皮紙 ' + paper + ' 張</b><small>一張 ' + PRICE + ' 費拉（身上 ' + s.gold + ' 費拉）</small><div class="row"><button type="button" class="btn" data-pb="5"' + (s.gold < PRICE * 5 ? ' disabled' : '') + '>買 5 張</button><button type="button" class="btn" data-pb="20"' + (s.gold < PRICE * 20 ? ' disabled' : '') + '>買 20 張</button></div></div></div>'
      + '<div class="row">' + [1, 5].filter(n => n < can).map(wb).join('') + (can >= 1 ? wb(can) : '<small>' + (room < 1 ? '背包裡的卷軸滿了。' : '沒有牛皮紙。') + '</small>') + '</div>',
      '<div class="row">' + (job ? '<button type="button" class="btn" id="sw-stop">停筆</button>' : '') + '<button type="button" class="btn" id="sw-x">好了</button></div>');
    $('sw-x').onclick = () => { stop(); R.closeSheet(); R.hub(); };
    const sb = $('sw-stop'); if (sb) sb.onclick = () => { stop(); desk(); };
    document.querySelectorAll('[data-pb]').forEach(b => { b.onclick = () => { const n = +b.dataset.pb; if (s.gold < PRICE * n) return; s.gold -= PRICE * n; s.mats.parchment = (s.mats.parchment || 0) + n; R.save(); R.sfx && R.sfx('coin'); desk(); }; });
    document.querySelectorAll('[data-sw]').forEach(b => { b.onclick = () => start(+b.dataset.sw); });
  };
  const stop = () => { if (job) { clearInterval(job.iv); job = null; } };
  const start = n => {
    stop(); const s = S(), sp = secPer(); let left = n, t = 0;
    job = { iv: setInterval(() => {
      const bar = $('sw-bar'), st = $('sw-st'); if (!bar) { stop(); return; }
      t += 0.1; bar.style.width = Math.min(100, t / sp * 100) + '%';
      if (t >= sp) {
        t = 0; if ((s.mats.parchment || 0) < 1 || (s.scrolls || 0) >= cap()) { left = 0; } else { s.mats.parchment--; s.scrolls = (s.scrolls || 0) + 1; left--; R.sfx && R.sfx('pick'); }
        if (st) st.textContent = '寫好了 ' + (n - left) + '／' + n + ' 張（背包裡 ' + (s.scrolls || 0) + ' 張）';
        if (left <= 0) { stop(); R.save(); R.toast('卷軸寫好了：背包裡有 ' + (s.scrolls || 0) + ' 張。', '#C8A85A'); desk(); }
      }
    }, 100) };
    desk();
  };
  R.scrollDesk = desk;
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try {
      const body = $('hub-body'), h2 = body && body.querySelector('h2'); if (!h2 || h2.textContent !== '白藤堂' || body.querySelector('#sw-open')) return;
      const s = S(), mine = s.cls === 'scroll';
      const d = document.createElement('div'); d.className = 'recipe';
      d.innerHTML = '<b>符卷師的書桌</b><small>' + (mine ? '寫好的卷軸 ' + (s.scrolls || 0) + '／' + cap() + ' 張・牛皮紙 ' + (s.mats.parchment || 0) + ' 張' : '符卷師才用得到：買牛皮紙、自己寫卷軸。') + '</small><button type="button" class="btn' + (mine ? ' pri' : '') + '" id="sw-open">' + (mine ? '寫卷軸' : '看看') + '</button>';
      h2.parentNode.insertBefore(d, h2.nextSibling.nextSibling || null);
      $('sw-open').onclick = desk;
    } catch (e) { console.warn('[scrollwrite]', e); }
  };
  // ---------- 遺跡裡：技能先用寫好的卷軸，沒有就扣錢 ----------
  const cdOf = (P, i) => (i === 0 ? P.skillCd || 0 : (P.skCd && P.skCd[i]) || 0);
  const cdSet = (P, i, v) => { if (i === 0) P.skillCd = v; else if (P.skCd) P.skCd[i] = v; };
  const wrapCast = (fn, slotOf) => (...a) => {
    const w = W(), P = w.P, s = S(), i = slotOf(...a);
    if (!P || P.cls !== 'scroll' || !w.run || !s || i == null) return fn(...a);
    const before = cdOf(P, i), have = (s.scrolls || 0) > 0, cost = improv();
    if (before <= 0 && !have && s.gold < cost) { R.toast('沒有寫好的卷軸，也沒錢買紙現寫（要 ' + cost + ' 費拉）。'); return; }
    const r = fn(...a);
    if (cdOf(P, i) > before + 0.01) {
      if (have) { s.scrolls--; cdSet(P, i, cdOf(P, i) * 0.8); }
      else { s.gold -= cost; R.num && R.num(P.x, 2.6, P.z, '−' + cost + ' 費拉', 'hurt'); }
    }
    return r;
  };
  R.useSkill = wrapCast(R.useSkill, () => 0);
  const cs0 = R.castSlot;
  if (cs0) { const w2 = wrapCast(cs0, i => (i === 0 ? null : i)); R.castSlot = i => (i === 0 ? cs0(i) : w2(i)); }   // 第一格會再叫 R.useSkill，不要算兩次
  // ---------- 普攻：紙錢 ----------
  let paper = 0;
  const at0 = R.attack;
  R.attack = (...a) => {
    const P = W().P, b = P ? P.atkCd || 0 : 0, r = at0(...a);
    try { const s = S(); if (P && P.cls === 'scroll' && W().run && P.item && PAPER[P.item.base] && (P.atkCd || 0) > b + 0.001 && ++paper >= 6) { paper = 0; if (s.gold > 0) s.gold--; } } catch (e) { }
    return r;
  };
  // ---------- 左上角 ----------
  const st0 = R.step; let hudT = 0;
  R.step = dt => {
    st0(dt); hudT -= dt; if (hudT > 0) return; hudT = 0.5;
    const w = W(), s = S(), on = !!(w.run && !w.run.done && s && s.cls === 'scroll'); let el = $('r-scrolls');
    if (!on) { if (el) el.hidden = true; return; }
    if (!el) { const tl = $('r-tl'); if (!tl) return; el = document.createElement('div'); el.id = 'r-scrolls'; el.className = 'glass r-misc'; tl.appendChild(el); }
    el.hidden = false; const n = s.scrolls || 0, txt = '寫好的卷軸 <b>' + n + '</b>' + (n ? '' : '・現寫每次 ' + improv() + ' 費拉');
    if (el.dataset.t !== txt) { el.innerHTML = txt; el.dataset.t = txt; }
  };
})(window.R);
