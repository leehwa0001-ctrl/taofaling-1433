// 凍傷的狀態圖示、生命球變淺藍（2026-10-08 作者：凍傷在畫面下方 HUD 加入負面狀態顯示，滑鼠放上去看效果和怎麼減少凍傷值；
//   隨著凍傷值疊上去，生命逐漸變成淺藍色）
// - 狀態圖示（statusicons.js 的 R.STATUS_EXTRA）：凍傷值 > 0 就在右邊（壞狀態）多一格雪花；格子照凍傷值慢慢「結滿」，右下角寫凍傷值。
//   滑鼠放上去：現在的凍傷值、滿了會怎樣、現在每秒漲還是退、怎麼退。
// - 生命球：凍傷值越高越淺藍（#h2-hp 加 .fz、--fz＝凍傷值÷100）。
// - 凍傷值從 envplus.js 的 R.frostState 拿（算法照舊：積雪每秒 +30、暴風雪到處 +6、平常 −8、營火火焰旁 −30）。
// 放在 envplus.js、statusicons.js、hud2.js、hud3.js 後面。
(function (R) {
  const $ = id => document.getElementById(id);
  if (R.STATUS_ICON) R.STATUS_ICON.snowflake = ['....#....', '.#..#..#.', '..#+#+#..', '.#.+#+.#.', '####+####', '.#.+#+.#.', '..#+#+#..', '.#..#..#.', '....#....'];
  (R.STATUS_EXTRA = R.STATUS_EXTRA || []).push((P, run, add) => {
    const f = R.frostState && R.frostState(); if (!f || f.v < 0.5) return;
    const v = Math.round(f.v), full = v >= 100, dmg = Math.round(2.5 * f.k * 10) / 10;
    const now = f.heat ? '靠近營火、火焰：每秒 −30' : f.drift ? '站在積雪裡：每秒 +30' : f.storm ? '暴風雪：到處每秒 +6' : '離開積雪：每秒 −8';
    add('frost', full ? '凍傷・凍僵了' : '凍傷', 'snowflake', '#9FD8F8', [
      '凍傷值 ' + v + '／100' + (full ? '（滿了）' : ''),
      '滿了會凍僵：移動變慢，每 1.5 秒掉最大生命的 ' + dmg + '%（越深的樓層越痛）',
      '現在：' + now,
      '怎麼退：離開白色鼓起來的積雪（每秒 −8），靠近營火或火焰更快（每秒 −30）；暴風雪的時候站在哪裡都會漲（每秒 +6）'
    ], Math.max(0.01, f.v), 100, true, '凍原的遺跡・凍傷值越高，生命球越淺藍');
  });
  // 生命球
  const ht0 = R.hudTick;
  R.hudTick = dt => {
    ht0(dt);
    try {
      const el = $('h2-hp'); if (!el) return;
      const f = R.W && R.W.run && R.frostState ? R.frostState() : null, v = f ? Math.max(0, Math.min(1, f.v / 100)) : 0;
      el.classList.toggle('fz', v > 0.005);
      const s = v.toFixed(2); if (el.dataset.fz !== s) { el.dataset.fz = s; el.style.setProperty('--fz', s); }
    } catch (e) { }
  };
  const mix = (a, b) => 'color-mix(in srgb,' + a + ',' + b + ' calc(var(--fz,0)*100%))';
  const css = document.createElement('style');
  css.textContent = 'body:not(.touch) #h2-hp.fz .h2-ring{background:linear-gradient(to top,' + mix('#5A080C', '#2E6A90') + ' 0,' + mix('#C81E24', '#7CC8F0') + ' calc(var(--f,1)*100% - 8%),' + mix('#F04A4A', '#D8F2FF') + ' calc(var(--f,1)*100%),transparent calc(var(--f,1)*100% + 1px))!important}'
    + 'body.touch #h2-hp.fz .h2-ring{background:conic-gradient(' + mix('#D83A3A', '#8ACCF0') + ' calc(var(--f,1)*1turn),rgba(80,20,20,.35) 0)!important}';
  document.head.appendChild(css);
})(window.R);
