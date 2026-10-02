// 序號兌換（作者 2026-10-03：一個輸入代碼的地方，然後一個 10000 費拉的序號）
// - 公會登記處（勇者證下面）有「序號兌換」：輸入序號、按兌換。大小寫、空白、連字號都不計較。
// - repo 是公開的，所以這裡只放序號的雜湊（cyrb53，加鹽），不放序號本身。新的序號用 tools/makecode.js 產生，
//   把印出來的那一行加進 CODES；序號本身只交給作者。
// - 每個序號每個存檔只能兌換一次（R.S.redeemed）。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s);
  // { h: 雜湊, gold: 費拉, name: 說明 }
  const CODES = [
    { h: 'bit89vmj5t', gold: 10000, name: '10000 費拉' }   // 2026-10-03
  ];
  const cyrb53 = (str, seed = 0) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  const hashOf = s => cyrb53('taofaling1433:' + String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));

  R.redeem = code => {
    const S = R.S; if (!S) return '先開始冒險（讀存檔）再兌換。';
    const h = hashOf(code), c = CODES.find(x => x.h === h);
    if (!c) return '序號不對。';
    S.redeemed = S.redeemed || {};
    if (S.redeemed[h]) return '這個序號這個存檔已經兌換過了。';
    S.redeemed[h] = S.day || 1;
    if (c.gold) S.gold += c.gold;
    R.save();
    return null;
  };
  const box = () => '<h3>序號兌換</h3><p class="note">公會發的序號（大小寫、空白、連字號都沒關係）。每個序號每個存檔只能兌換一次。</p>'
    + '<div class="row"><input id="rd-code" placeholder="TFL-XXXX-XXXX-XXXX" autocomplete="off" style="flex:1;min-width:12em;text-transform:uppercase;letter-spacing:.06em"><button type="button" class="btn pri" id="rd-go">兌換</button></div>';
  const go = () => {
    const inp = $('rd-code'), code = inp ? inp.value : '', err = R.redeem(code);
    if (err) { R.toast(err, '#FF9A6A'); return; }
    const c = CODES.find(x => x.h === hashOf(code));
    R.hub();
    setTimeout(() => R.banner ? R.banner('序號兌換成功', c.name + '已經放進錢包了。') : R.toast('序號兌換成功：' + c.name), 200);
    R.sfx && R.sfx('coin');
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'); if (!body) return;
    const h3 = [...body.querySelectorAll('h3')].find(x => x.textContent === '勇者證'); if (!h3) return;
    let at = h3.nextElementSibling; while (at && at.tagName !== 'H3') at = at.nextElementSibling;
    const sec = document.createElement('div'); sec.className = 'redeem-box'; sec.innerHTML = box();
    h3.parentNode.insertBefore(sec, at);
    $('rd-go').onclick = go; $('rd-code').onkeydown = e => { if (e.key === 'Enter') go(); };
  };
})(window.R);
