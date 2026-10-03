// 委託要回公會繳交才結算（作者 2026-10-04：我的委託必須要我到公會分館找櫃台繳交後才算完成；我忘了配裝，出個遺跡就直接給我結算委託了）
// guildtask.js 把遺跡委託的進度記在 R.S.heldTask、在公會登記處繳交；這個檔案負責「報酬先扣住」：
// - 回到地面時，這一趟的委託報酬（run.reward 扣掉隊友分走的、加注條款加付的 run.pactBonus、段階加給——ranks.js 加在 run.reward 裡）
//   先從錢包拿回來、記在 heldTask.pay，繳交的時候才一起付。卡索級的特別報酬、撿到的東西不算在裡面。
// - 結算畫面把「公會的委託報酬」那一行改成要回去繳交，再加一行手上委託的進度。
// - 城裡的「手上的委託」也列出這張委託。
// 要放在 guildtask.js、pact.js、ranks.js、hunt.js、kaso.js 後面（包在最外面，報酬都算完了才扣）。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const ex0 = R.extract;
  R.extract = how => {
    const run = W().run, s = S();
    const ours = run && !run.done && run.task && !run.free && run.site && run.site.kind === 'ruin';
    const r = ex0(how);
    const h = s && s.heldTask;
    if (!ours || !h || h.siteId !== run.site.id) return r;
    const pay = Math.max(0, (run.reward || 0) - (run.share || 0) + (run.pactBonus || 0));
    if (pay) { s.gold -= pay; h.pay = (h.pay || 0) + pay; R.save(); }
    const box = $('r-sheet');
    if (box) {
      box.querySelectorAll('p').forEach(p => { if (p.innerHTML.includes('公會的委託報酬')) p.innerHTML = p.innerHTML.replace(/公會的委託報酬：[^<]*/, '委託報酬 ' + pay + ' 費拉：回公會分館的登記處繳交委託才會付'); });
      const p = document.createElement('p'); p.className = 'note';
      p.innerHTML = '<b>手上的委託</b>：' + esc(R.heldLine ? R.heldLine(h) : '') + '。還沒做完可以再下去繼續；回公會分館的登記處<b>繳交</b>，才結算五軌成績、付委託報酬（扣住 ' + h.pay + ' 費拉）。';
      const row = box.querySelector('.row'); if (row) box.insertBefore(p, row); else box.appendChild(p);
    }
    return r;
  };
  const ql0 = R.questLog;
  if (ql0) R.questLog = (...a) => {
    const r = ql0(...a), h = S() && S().heldTask, box = $('r-sheet');
    if (h && box) { const d = document.createElement('div'); d.innerHTML = '<h3>公會的遺跡委託</h3><p><b>' + esc(h.letter) + ' 級・' + esc(h.site) + '</b>：' + esc(R.heldLine ? R.heldLine(h) : '') + '</p><p class="note">回公會分館的登記處繳交（委託報酬扣住 ' + (h.pay || 0) + ' 費拉）。</p>'; const h2 = box.querySelector('h2'); (h2 || box).after(d); }
    return r;
  };
})(window.R);
