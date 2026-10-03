// 討伐令 1433：被衛兵抓到的懲罰（作者：要嚴重）
// props.js 的 arrest 交給 R.arrestPunish：
//  - 罰金：照通緝的星星、前科加重，再加身上的錢的 5%（有上限）。（作者 2026-10-04：罰款有點多——原本至少拿走身上的三成）
//  - 拘留：一顆星一天、每一次前科多一天；罰金付不出來，每差 150 費拉多關一天（最多七天）。日子照樣往前走。
//  - 勇者證停權（第二次被抓起）：公會不派委託，也不讓你下遺跡（R.startRun 擋下來）。
//  - 前科：名聲大降；店家一陣子收「有前科的人價」（貴三成）；花錢請的同行勇者離開隊伍。
//  - 放出來是早上九點，在衛兵詰所門口（城重新蓋過：天氣、路人照新的那一天）。
(function (R) {
  const W = R.W, $ = id => document.getElementById(id), esc = s => R.esc(s);
  R.arrestPunish = heat => {
    const S = R.S, prior = S.caughtN || 0, stars = Math.max(1, heat || 1);
    const base = Math.round((60 + 80 * stars) * (1 + 0.4 * prior)), fine = base + Math.min(Math.round(S.gold * 0.05), 150 * stars);
    const paid = Math.min(S.gold, fine), unpaid = fine - paid; S.gold -= paid;
    const days = Math.min(7, stars + prior + Math.ceil(unpaid / 150));
    const ban = prior >= 1 ? Math.min(10, prior * 2 + stars) : 0;
    S.rep = (S.rep || 0) - (4 + 2 * stars);
    const left = (S.party || []).filter(m => !m.story).map(m => m.name); S.party = (S.party || []).filter(m => m.story);
    if (R.advanceDays) R.advanceDays(days);
    S.shameUntil = Math.max(S.shameUntil || 0, S.day + 5);
    if (ban) S.banUntil = Math.max(S.banUntil || 0, S.day + ban);
    if (R.addDeed) R.addDeed(ban ? '公會東鶴分館懲戒委員會：一名勇者因竊盜再次被捕，勇者證停權 ' + ban + ' 日。' : '西市口的竊案嫌犯被衛兵當場逮捕，拘留 ' + days + ' 日。據說是一名勇者。');
    const lines = [
      '罰金 ' + fine + ' 費拉' + (unpaid ? '（身上只有 ' + paid + ' 費拉，付不出來的改成多關幾天）' : '') + '。',
      '在拘留所待了 ' + days + ' 天。',
      ban ? '公會的懲戒委員會：勇者證停權 ' + ban + ' 天——不能接委託，也不能下遺跡。' : '公會發了書面警告：「再被抓到，勇者證停權。」',
      '前科 ' + (prior + 1) + ' 次。名聲大降；這幾天店家都收「有前科的人價」（貴三成）。'
    ];
    if (left.length) lines.push(left.join('、') + '離開了隊伍：「我不跟有前科的人一起下遺跡。」');
    R.sheet('<p class="kicker">東鶴衛兵所</p><h2>被押走了</h2><ul class="loot">' + lines.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul><p class="note">接下來幾天，衛兵和街坊都認得你的臉（戴兜帽可以遮住）。</p>',
      '<div class="row"><button type="button" class="btn pri" id="pn-x">走出衛兵所</button></div>');
    $('pn-x').onclick = () => {
      R.closeSheet();
      const tw = W.town; if (!tw) return;
      const door = tw.inter.find(it => it.label === '衛兵詰所'), at = door ? [door.x, door.z + 1.6] : [W.P.x, W.P.z];
      S.pendingHour = 9; R.enterTownNow(tw.from, at);
      R.toast('早上九點。衛兵所的門在背後關上了。');
    };
  };
  // 停權中：不能下遺跡
  const sr = R.startRun;
  R.startRun = id => {
    const S = R.S;
    if (S && S.banUntil > S.day) { const msg = '勇者證停權中（還有 ' + (S.banUntil - S.day) + ' 天）：公會不派委託，也不讓你進遺跡。'; if (W.town) R.toast(msg); else if (R.say) R.say(msg); return; }
    return sr(id);
  };
  // 有前科的人價（公會照規矩收）
  const pm = R.priceMul;
  if (pm) R.priceMul = shop => { const m = pm(shop), S = R.S; if (m == null || shop === 'guild' || !S || !(S.shameUntil > S.day)) return m; return m * 1.3; };
  // 狀態列：停權的天數
  const ch = R.crimeHud;
  if (ch) R.crimeHud = () => { const S = R.S, s = ch(); return s + (S && S.banUntil > S.day ? '<span class="wanted">停權 <b>' + (S.banUntil - S.day) + '</b> 天</span>' : ''); };
})(window.R);
