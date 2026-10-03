// 股票、銀行跟遺跡掛鉤（2026-10-04 回饋：股票、銀行跟探索遺跡沒關係、有點多餘；作者選「改成跟遺跡有關」）
// - 股票：你在遺跡的成績會讓股價動——
//   帶回礦石（鐵礦、甲殼、魔晶礦）→ 德克斯凡礦務；魔力水晶、魔力核心、翼肢碎片 → 魔導燈具工業；藥草 → 白藤堂製藥；
//   觸發佩特拉的反應 → 東鶴建設（公會發包遺跡附近的加固工程）；打倒佩特拉核心 → 全市場；
//   到公會繳交委託 → 新的一家「東鶴冒險用品」（勇者的背包、繩索、提燈；委託越熱鬧越好賣）。
//   一趟每一家最多 +6%，之後照 stocks.js 的規則慢慢拉回長期的價位。會寫進「市場新聞」。
// - 銀行：「裝備擔保」——把倉庫裡的裝備押在銀行，借到賣價的八成；7 天內還（借款＋一成手續費）就拿回來，過期銀行收走。
//   下遺跡之前缺錢（買背包、找霧島保險）可以先借。保險照舊是霧島的（raid.js；作者：保險不要是公會保）。
//   存檔：R.S.pawn = [{ it, loan, due（到期的那天）}]，最多 6 件。
// 放在 bank.js、stocks.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const fmt = n => Math.floor(n).toLocaleString('zh-TW');
  // ---------- 股票 ----------
  const ADV = { id: 'ADV', name: '東鶴冒險用品', base: 55, vol: 0.03, drift: 0.0005, desc: '勇者的背包、繩索、提燈都在這裡買。公會的委託越熱鬧，它越好賣。' };
  if (R.STOCKS && !R.STOCKS.some(c => c.id === ADV.id)) R.STOCKS.push(ADV);
  // 舊存檔沒有新公司的股價：先補上（不然 stocks.js 每天算的時候會變成 NaN）
  const ensure = () => { const s = S(), st = s && s.stocks; if (!st) return; (R.STOCKS || []).forEach(c => { if (!(st.p[c.id] > 0)) { st.p[c.id] = c.base; st.h[c.id] = [c.base]; } }); };
  const nd0 = R.onNewDay; R.onNewDay = () => { try { ensure(); } catch (e) { } nd0(); try { pawnDue(); } catch (e) { console.warn('[ruinmarket]', e); } };
  const tk0 = R.stocksTick; if (tk0) R.stocksTick = () => { ensure(); return tk0(); };
  const book = () => { if (!R.stocksTick || !S()) return null; const st = R.stocksTick(); ensure(); return st; };
  const bump = (st, id, k, t, out) => {
    k = Math.min(0.06, k); if (!st || !(st.p[id] > 0) || k < 0.003) return;
    st.p[id] = Math.max(1, Math.round(st.p[id] * (1 + k) * 10) / 10);
    st.news.unshift({ d: S().day || 0, t, id, k }); st.news = st.news.slice(0, 6);
    if (out) out.push(((R.STOCKS || []).find(c => c.id === id) || { name: id }).name + ' ▲' + (k * 100).toFixed(1) + '%');
  };
  const fromRun = run => {
    const st = book(); if (!st) return; const m = run.mats || {}, out = [], site = run.site.name;
    bump(st, 'DXM', 0.003 * ((m.iron || 0) + (m.shell || 0)) + 0.008 * (m.manaore || 0), '公會收購了一批從「' + site + '」帶回來的礦石', out);
    bump(st, 'MDL', 0.003 * (m.crystal || 0) + 0.015 * (m.core || 0) + 0.04 * (m.wing || 0), '從「' + site + '」帶回來的魔力結晶送進了魔導燈具工業的工廠', out);
    bump(st, 'HFD', 0.004 * (m.herb || 0), '白藤堂收購了遺跡裡採的藥草', out);
    bump(st, 'TKC', 0.02 * (run.reactCount || 0), '「' + site + '」的佩特拉起了反應，公會發包附近的加固工程', out);
    if (run.bossDown && run.grade.boss === 'petra') { (R.STOCKS || []).forEach(c => { st.p[c.id] = Math.round(st.p[c.id] * 1.02 * 10) / 10; }); st.news.unshift({ d: S().day || 0, t: '公會公布：「' + site + '」的佩特拉核心被討伐了', id: '*', k: 0.02 }); st.news = st.news.slice(0, 6); out.push('全市場 ▲2.0%'); }
    if (out.length) { R.save(); setTimeout(() => R.toast && R.toast('股價動了：' + out.join('、'), '#E8C04A'), 1800); }
  };
  const ex0 = R.extract;
  R.extract = how => { const run = W().run, was = run && run.done, r = ex0(how); try { if (run && !was && run.done && !run.rmDone && run.site && run.site.kind === 'ruin') { run.rmDone = 1; fromRun(run); } } catch (e) { console.warn('[ruinmarket]', e); } return r; };
  const ti0 = R.turnInTask;
  if (ti0) R.turnInTask = () => {
    const h = S() && S().heldTask, t = ti0();
    try { if (h && t) { const st = book(), g = R.gradeById && R.gradeById(h.grade), lv = (g && g.lv) || 1, out = []; bump(st, 'ADV', (0.01 + 0.006 * lv) * (t.s && t.s[0] >= 60 ? 1.5 : 1), '公會的委託（' + (h.site || '') + '）順利結案，冒險用品的訂單跟著增加', out); if (out.length) { R.save(); R.toast('股價動了：' + out.join('、'), '#E8C04A'); } } } catch (e) { console.warn('[ruinmarket]', e); }
    return t;
  };
  // 證券窗口：說明遺跡怎麼影響股價
  const ss0 = R.stockSheet;
  if (ss0) R.stockSheet = () => {
    book(); ss0();
    const ab = document.querySelector('.sk-about'); if (ab && !document.getElementById('rm-note')) ab.insertAdjacentHTML('beforebegin', '<p class="note" id="rm-note">你在遺跡的成績會讓股價動：帶回礦石→德克斯凡礦務、魔力水晶和核心→魔導燈具工業、藥草→白藤堂製藥、觸發佩特拉的反應→東鶴建設（加固工程）、到公會繳交委託→東鶴冒險用品。</p>');
  };

  // ---------- 銀行：裝備擔保 ----------
  const MAXP = 6, DAYS = 7;
  const pawns = () => { const s = S(); s.pawn = s.pawn || []; return s.pawn; };
  const loanOf = it => Math.max(5, Math.round(R.sellPrice(it) * 0.8)), repayOf = p => Math.round(p.loan * 1.1);
  const pawnDue = () => {
    const s = S(); if (!s || !s.pawn || !s.pawn.length) return;
    const gone = s.pawn.filter(p => (s.day || 0) > p.due); if (!gone.length) return;
    s.pawn = s.pawn.filter(p => (s.day || 0) <= p.due); R.save();
    R.toast('擔保過了期限，銀行收走了：' + gone.map(p => R.itemName(p.it)).join('、'), '#E07A6A');
  };
  const pawnHtml = () => {
    const s = S(), eq = R.equippedIds ? R.equippedIds() : new Set(), list = pawns();
    const cand = s.stash.filter(it => !eq.has(it.id) && it.identified !== false).sort((a, b) => R.sellPrice(b) - R.sellPrice(a)).slice(0, 8);
    const mine = list.map((p, i) => '<li><span style="color:' + R.rarityColor(p.it) + '">' + esc(R.itemName(p.it)) + '</span>・借了 ' + fmt(p.loan) + '・還 <b>' + fmt(repayOf(p)) + '</b> 費拉・' + (p.due - (s.day || 0) <= 0 ? '<b class="dn">今天到期</b>' : '還有 ' + (p.due - (s.day || 0)) + ' 天')
      + ' <button type="button" class="mini" data-pwr="' + i + '"' + (s.gold < repayOf(p) ? ' disabled' : '') + '>還錢拿回來</button></li>').join('');
    const opts = cand.map(it => '<li><span style="color:' + R.rarityColor(it) + '">' + esc(R.itemName(it)) + '</span>・可以借 <b>' + fmt(loanOf(it)) + '</b> 費拉 <button type="button" class="mini" data-pwb="' + it.id + '"' + (list.length >= MAXP ? ' disabled' : '') + '>押這件</button></li>').join('');
    return '<div id="pw-box"><h3>裝備擔保</h3><p class="note">把倉庫裡的裝備押在銀行，借到賣價的八成；' + DAYS + ' 天內還（借款＋一成手續費）就拿回來，過期銀行收走。下遺跡之前缺錢的時候用（最多押 ' + MAXP + ' 件）。</p>'
      + (mine ? '<ul class="loot">' + mine + '</ul>' : '') + (opts ? '<details' + (mine ? '' : ' open') + '><summary>押一件（倉庫裡最值錢的幾件）</summary><ul class="loot">' + opts + '</ul></details>' : '<p class="note">倉庫裡沒有可以押的裝備。</p>') + '</div>';
  };
  const bindPawn = () => {
    const s = S();
    document.querySelectorAll('[data-pwb]').forEach(b => { b.onclick = () => {
      const i = s.stash.findIndex(it => String(it.id) === b.dataset.pwb); if (i < 0 || pawns().length >= MAXP) return;
      const it = s.stash.splice(i, 1)[0], loan = loanOf(it); pawns().push({ it, loan, due: (s.day || 0) + DAYS }); s.gold += loan;
      R.sfx && R.sfx('coin'); R.toast('押了 ' + R.itemName(it) + '，借到 ' + fmt(loan) + ' 費拉（' + DAYS + ' 天內還）。', '#E8C04A'); R.save(); R.bankSheet();
    }; });
    document.querySelectorAll('[data-pwr]').forEach(b => { b.onclick = () => {
      const p = pawns()[+b.dataset.pwr]; if (!p) return; const c = repayOf(p); if (s.gold < c) { R.toast('錢包裡的錢不夠。'); return; }
      s.gold -= c; s.stash.push(p.it); s.pawn.splice(+b.dataset.pwr, 1);
      R.sfx && R.sfx('coin'); R.toast('還了 ' + fmt(c) + ' 費拉，' + R.itemName(p.it) + ' 放回倉庫了。', '#E8C04A'); R.save(); R.bankSheet();
    }; });
  };
  const bs0 = R.bankSheet;
  if (bs0) R.bankSheet = () => {
    pawnDue(); bs0();
    try { const rows = document.querySelectorAll('.bk-row'), last = rows[rows.length - 1]; if (last && !$('pw-box')) { last.insertAdjacentHTML('afterend', pawnHtml()); bindPawn(); } } catch (e) { console.warn('[ruinmarket]', e); }
  };
})(window.R);
