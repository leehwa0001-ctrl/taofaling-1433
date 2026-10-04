// 序號兌換（作者 2026-10-03：一個輸入代碼的地方，然後一個 10000 費拉的序號）
// - 公會登記處（勇者證下面）有「序號兌換」：輸入序號、按兌換。大小寫、空白、連字號都不計較。
// - repo 是公開的，所以這裡只放序號的雜湊（cyrb53，加鹽），不放序號本身。新的序號用 tools/makecode.js 產生，
//   把印出來的那一行加進 CODES；序號本身只交給作者。
// - 每個序號每個存檔只能兌換一次（R.S.redeemed）。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s);
  // { h: 雜湊, gold: 費拉, name: 說明 }；unban：清空勇者證的停權（S.banUntil），停權中才能用，可以重複用
  const CODES = [
    { h: 'bit89vmj5t', gold: 10000, name: '10000 費拉' },   // 2026-10-03
    { h: 'fbgaw0yec7', unban: 1, name: '清空停權', msg: '勇者證的停權解除了，公會又會派委託給你。' },   // 2026-10-03
    // 2026-10-04（作者：加一個新序號清空停權、多開幾個序號）。potions：回復藥／魔力藥；pack：背包（raid.js 的 R.PACKS）
    { h: 'srwgfv0bxo', unban: 1, name: '清空停權', msg: '勇者證的停權解除了，公會又會派委託給你。' },
    { h: '72swoczdyr', unban: 1, name: '清空停權', msg: '勇者證的停權解除了，公會又會派委託給你。' },
    { h: '20cl2jgv4kc', gold: 20000, name: '20000 費拉' },
    { h: '14mtti70wl0', gold: 50000, name: '50000 費拉' },
    { h: '94w97gwi52', potions: { hp: 10, mp: 10 }, name: '回復藥、魔力藥各 10 瓶', msg: '回復藥、魔力藥各 10 瓶放進背包了。' },
    { h: '1j7z0nr40yn', pack: 'guild', name: '公會遠征背包', msg: '公會遠征背包送到了。到公會的商店選要背哪一個。' },
    { h: '22giv0b4d2i', gold: 3000, potions: { hp: 5, mp: 5 }, pack: 'leather', name: '新手禮包', msg: '3000 費拉、回復藥魔力藥各 5 瓶、一個皮背包。' },
    // 2026-10-04：原本限時補償（compensation.js）的內容，補償拿掉、改成序號。books：升 10 等經驗書；tickets：種族抽選券；core：魔力核心（tickets.js 讀經驗書、用抽選券）
    { h: 'l81lia6u52', gold: 5000, books: 1, tickets: 200, core: 1, name: '補償禮包', msg: '5000 費拉、升 10 等經驗書一本、種族抽選券 200 張、魔力核心一顆，放進背包了。抽選券在公會的登記處用。' },
    { h: '2bezge60id8', raceSelect: 'SSR', name: 'SSR 種族自選券', msg: 'SSR 種族自選券一張放進背包了。到公會的登記處，從 SSR 的種族裡自己挑一族。' },   // 2026-10-04（作者：可以自選 SSR 的序號）
    { h: '28uxjbs55z7', tickets: 1000, name: '種族抽選券 1000 張', msg: '種族抽選券 1000 張放進背包了。到公會的登記處抽種族。' },   // 2026-10-04（作者：1000 張種族序號卷）
    { h: 'qwuh0y9h3p', admin: 1, name: '管理員號', msg: '這個存檔變成管理員號了：錢、素材、裝備、職業等級、轉職、稱號全部都有。倉庫裡有每一種武器、防具。' },   // 2026-10-04（作者：管理員號，什麼東西都有；admin.js）
  ];
  const cyrb53 = (str, seed = 0) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  const hashOf = s => cyrb53('taofaling1433:' + String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));

  R.redeem = code => {
    const S = R.S; if (!S) return '先開始冒險（讀存檔）再兌換。';
    const h = hashOf(code), c = CODES.find(x => x.h === h);
    if (!c) return '序號不對。';
    if (c.unban) { if (!(S.banUntil > S.day)) return '勇者證現在沒有停權。'; S.banUntil = 0; R.save(); return null; }
    S.redeemed = S.redeemed || {};
    if (S.redeemed[h]) return '這個序號這個存檔已經兌換過了。';
    S.redeemed[h] = S.day || 1;
    if (c.gold) S.gold += c.gold;
    if (c.potions) { S.potions = S.potions || {}; Object.keys(c.potions).forEach(k => { S.potions[k] = (S.potions[k] || 0) + c.potions[k]; }); }
    if (c.pack) { S.packs = S.packs || { sack: 1 }; S.packs[c.pack] = (S.packs[c.pack] || 0) + 1; }
    if (c.books) S.xpBooks = (S.xpBooks || 0) + c.books;
    if (c.tickets) S.raceTickets = (S.raceTickets || 0) + c.tickets;
    if (c.raceSelect && R.giveRaceSelect) R.giveRaceSelect(c.raceSelect, c.n || 1);   // 種族自選券（raceselect.js）
    if (c.core) { S.mats = S.mats || {}; S.mats.core = (S.mats.core || 0) + c.core; }
    if (c.admin && R.makeAdmin) R.makeAdmin();   // 管理員號（admin.js）
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
    setTimeout(() => R.banner ? R.banner('序號兌換成功', c.msg || c.name + '已經放進錢包了。') : R.toast('序號兌換成功：' + c.name), 200);
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
