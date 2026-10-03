// 佩特拉的注意：說清楚什麼會升、什麼會降（作者 2026-10-04：希望可以大概講一下佩特拉核心的關注度哪些事情會升、哪些會降；應該要隨時間緩緩下降）
// - 隨時間：每 4 秒降 1（run.js；原本是每 5 秒升 1）。
// - 遺跡裡點左上角的「佩特拉的注意」那一格：打開說明。
// 放在 run.js、petra2.js 後面。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id);
  R.awareSheet = () => {
    const run = W().run; if (!run) return;
    const lines = [
      ['會升', ['打破遺跡裡的東西：一般 +3～5，水晶 +8', '爆炸（自己或遺跡生物的）', '喚群燈大叫（警報）：+15', '被群瞳盯著看：盯越久升越多', '預言犢說出預言的時候：+18', '機關解錯：+8', '加注條款「注意上升 1.5 倍」會放大以上全部']],
      ['會降', ['什麼都不做的時候，每 4 秒 −1（慢慢降下來）', '走到新的一層：剩下四成', '遺跡的反應結束之後：回到 35', '有些被動、裝備的「冷靜」會讓上升變少']],
      ['不會影響', ['打倒遺跡生物不會讓它上升', '站著不動、走來走去都一樣（只看時間）']],
      ['到了會怎樣', ['滿 100：觸發這座遺跡的反應（擠壓、崩塌、生物、斷尾、驅逐……）', '每跨過 25、50、75 算一次「被注意到」：委託的環境分會扣']]
    ];
    R.sheet('<p class="kicker">遺跡</p><h2>佩特拉的注意：' + Math.floor(run.aware) + '／100</h2>' + lines.map(([h, l]) => '<h3>' + h + '</h3><ul class="loot">' + l.map(x => '<li>' + R.esc(x) + '</li>').join('') + '</ul>').join(''),
      '<div class="row"><button type="button" class="btn pri" id="aw-x">知道了</button></div>');
    $('aw-x').onclick = R.closeSheet;
  };
  const hook = () => { const b = $('r-aware-box'); if (b && !b.dataset.aw) { b.dataset.aw = 1; b.style.cursor = 'pointer'; b.title = '點一下：什麼會讓佩特拉的注意升、降'; b.addEventListener('click', () => R.awareSheet()); } };
  const lf0 = R.loadFloor; R.loadFloor = (f, o) => { const r = lf0(f, o); try { hook(); } catch (e) { } return r; };
})(window.R);
