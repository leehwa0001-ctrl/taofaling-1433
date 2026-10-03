// 房子、花園花錢擴建（2026-10-04 作者：花園可以花錢擴大；房子也可以花錢擴大）
// - 公團住宅 302 室（home.js）、中庭的小花園（zoo.js）各可以擴建三次：房子每次寬 +3、深 +2；花園每次寬 +6、深 +4。
//   家具、花圃都是貼著牆擺的，變大的是中間能走、能讓小同伴跑的地方。存在 R.S.homeLv、R.S.gardenLv。
// - 在家裡找房東（門口旁邊）、在花園的告示牌旁邊談擴建。
// - 每天第一次摸小同伴會被療癒（zoo.js 記 R.S.petMood）：當天下遺跡每秒多回復 0.3 生命。
// 放在 home.js、zoo.js 後面。
(function (R) {
  const S = () => R.S, esc = s => R.esc(s);
  const PL = R.INTERIOR_PLACES, FN = R.INTERIOR_FURNISH; if (!PL || !FN) return;
  const K = {
    home: { name: '房子', base: [10, 8], step: [3, 2], cost: [8000, 25000, 60000], who: '房東', lv: () => S() && S().homeLv || 0 },
    garden: { name: '中庭的小花園', base: [14, 11], step: [6, 4], cost: [5000, 15000, 40000], who: '管理員', lv: () => S() && S().gardenLv || 0 }
  };
  const size = (k, lv) => [K[k].base[0] + K[k].step[0] * lv, K[k].base[1] + K[k].step[1] * lv];
  ['home', 'garden'].forEach(k => {
    if (!PL[k]) return;
    Object.defineProperty(PL[k], 'w', { get: () => size(k, K[k].lv())[0], configurable: true });
    Object.defineProperty(PL[k], 'd', { get: () => size(k, K[k].lv())[1], configurable: true });
  });
  const reenter = k => (R.changeFloor ? R.changeFloor(k) : R.enterInterior(k));
  const sheet = k => {
    const s = S(), c = K[k], lv = c.lv(), [w, d] = size(k, lv), next = lv < c.cost.length ? c.cost[lv] : null, [w2, d2] = size(k, lv + 1);
    R.sheet('<p class="kicker">擴建</p><h2>' + esc(c.name) + '</h2><p>' + esc(c.who) + '翻著帳本：「' + (next ? '要打掉隔間、往旁邊那戶延伸的話……' + next.toLocaleString() + ' 費拉。' : '再擴就要蓋到隔壁棟去了，這樣已經是最大了。') + '」</p>'
      + '<p class="note">現在：' + w + '×' + d + ' 公尺（擴建 ' + lv + '／' + c.cost.length + ' 次）' + (next ? '・擴建以後：' + w2 + '×' + d2 + ' 公尺' : '') + '・身上有 ' + s.gold.toLocaleString() + ' 費拉</p>',
      '<div class="row">' + (next ? '<button type="button" class="btn gold" id="hu-go"' + (s.gold < next ? ' disabled' : '') + '>擴建（' + next.toLocaleString() + ' 費拉）</button>' : '') + '<button type="button" class="btn" id="hu-x">先不要</button></div>');
    document.getElementById('hu-x').onclick = R.closeSheet;
    const go = document.getElementById('hu-go'); if (go) go.onclick = () => { if (s.gold < next) return; s.gold -= next; s[k === 'home' ? 'homeLv' : 'gardenLv'] = lv + 1; R.save(); R.sfx && R.sfx('coin'); R.closeSheet(); reenter(k); setTimeout(() => R.toast && R.toast(c.name + '擴建好了：' + w2 + '×' + d2 + ' 公尺。', '#E8C04A'), 600); };
  };
  const fh = FN.home; if (fh) FN.home = c => { fh(c); c.inter(c.HW - 2.6, c.HD - 1.0, 1.3, '找房東談擴建', () => sheet('home')); };
  const fg = FN.garden; if (fg) FN.garden = c => { fg(c); c.inter(-c.HW + 1.2, 2.2, 1.4, '跟管理員談花園擴建', () => sheet('garden')); };
  // 被療癒：當天下遺跡每秒多回 0.3 生命
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => { const P = cp0(cls); try { const s = S(); if (s && s.petMood === s.day) P.regen = (P.regen || 0) + 0.3; } catch (e) { } return P; };
})(window.R);
