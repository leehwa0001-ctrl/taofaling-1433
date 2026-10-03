// HUD 再改（作者 2026-10-04：hud 比較像物品欄，而不是技能那些的地方；很醜，上網查查有什麼好看的）——電腦版
// 參考《暗黑破壞神》系列的「左右兩顆球＋中間技能」和像素風 HUD 的做法（同一種東西同一種形狀、沒用的格子不顯示、高對比、按鍵用小鍵帽）：
// - 拿掉整條深色的大底板；每一格自己一個有斜面的小框。
// - 技能（R、3、4）：方形的技能格，還沒學會的不顯示；右上角小小的藍色數字是魔力；冷卻是暗下來的扇形加秒數；能放的時候外框亮成職業顏色。
// - 大招（ult.js）：和生命、魔力一樣是一顆球，裡面的光從下往上漲；滿了會一直發亮、閃一下。
// - 回復藥、魔力藥靠在生命球旁邊；背包、指揮縮小，靠在魔力球旁邊。翻滾是技能後面小一點的格子。
// - 按鍵只寫最短的（R、3、⇧、V……），放在格子左下角的小鍵帽。
// 只換樣式和排位置（hud2.js、battlehud.js 的東西都照舊）。放在 hud2.js、ult.js 後面。
(function (R) {
  const W = R.W, $ = id => document.getElementById(id);
  const short = t => { t = String(t || '').trim(); if (!t) return ''; const a = t.split(/[／/]/)[0].replace(/^點/, '').trim(); if (/shift/i.test(a)) return '⇧'; if (/空白|space/i.test(a)) return '␣'; return a.length > 3 ? a.slice(0, 3) : a; };
  const ht0 = R.hudTick;
  R.hudTick = dt => {
    ht0(dt);
    const P = W.P; if (!P || !W.run) return;
    const c = (R.CLASS_GLOW && R.CLASS_GLOW[P.cls]) || (R.CLASSES[P.cls] && R.CLASSES[P.cls].color) || '#E8C04A', dock = $('h2-dock'); if (dock && dock.dataset.c !== c) { dock.dataset.c = c; dock.style.setProperty('--cc', c); }
    [['r-skill', 0], ['r-skill2', 1], ['r-skill3', 2]].forEach(([id, i]) => {
      const b = $(id); if (!b) return; const sid = R.slotSkill ? R.slotSkill(P, i) : (i ? null : P.skill), sk = sid && R.SKILLS[sid];
      const t = sk && sk.mp ? String(sk.mp) : ''; if (b.dataset.mp !== t) b.dataset.mp = t; b.classList.toggle('none', !sk);
    });
    document.querySelectorAll('#r-br .act kbd').forEach(k => { const s = short(k.textContent); if (k.dataset.s !== s) k.dataset.s = s; });
  };
  const sel = (...k) => k.map(x => 'body:not(.touch) #r-br ' + x).join(',');
  const SK = '.act[data-tact^="skill"]', ITEM = '[data-tact="hp"],[data-h2="mp"]', MISC = '[data-tact="bag"],[data-tact="order"]';
  const css = document.createElement('style');
  css.textContent = [
    // 底板拿掉
    'body:not(.touch) #r-br{background:none!important;border:0!important;box-shadow:none!important;padding:0!important;gap:6px!important;align-items:flex-end}',
    'body:not(.touch) #h2-dock{gap:12px;align-items:flex-end}',
    // 共通的格子：斜面小框
    sel('.act') + '{border-radius:7px!important;background:linear-gradient(#2C2632,#15121A)!important;border:2px solid #0A080C!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),inset 0 -10px 14px rgba(0,0,0,.45),0 2px 0 #000,0 5px 12px rgba(0,0,0,.5)!important;overflow:hidden}',
    sel('.act .h2-ic') + '{top:50%!important;filter:drop-shadow(0 2px 0 rgba(0,0,0,.6))!important}',
    sel('.act>span:not(.cd):not(.bh-sec)') + '{display:none!important}',
    // 鍵帽：最短的字，左下角
    sel('.act kbd') + '{left:3px!important;top:auto!important;bottom:3px!important;right:auto!important;transform:none!important;font-size:0!important;padding:0!important;background:none!important}',
    sel('.act kbd::after') + '{content:attr(data-s);display:inline-block;min-width:11px;padding:1px 3px;font:700 9.5px/1.15 system-ui,sans-serif;color:#E8E0D0;text-align:center;background:#0C0A0E;border:1px solid #4A4250;border-radius:3px;box-shadow:0 1px 0 #000}',
    // 順序：藥水｜技能｜大招｜翻滾｜背包・指揮
    sel('[data-tact="hp"]') + '{order:1!important;margin:0!important}', sel('[data-h2="mp"]') + '{order:2!important;margin:0 14px 0 0!important}',
    sel('[data-tact="skill"]') + '{order:3!important}', sel('[data-tact="skill2"]') + '{order:4!important}', sel('[data-tact="skill3"]') + '{order:5!important}',
    sel('.ul-btn') + '{order:6!important}', sel('[data-tact="dodge"]') + '{order:7!important;margin:0 14px 0 0!important}',
    sel('[data-tact="bag"]') + '{order:8!important}', sel('[data-tact="order"]') + '{order:9!important}',
    // 技能格
    sel(SK) + '{width:56px!important;height:56px!important}',
    sel(SK + ' .h2-ic') + '{width:36px!important;height:36px!important}',
    sel(SK + '.none') + '{display:none!important}',
    sel(SK + '::before') + '{content:attr(data-mp);position:absolute;right:3px;top:2px;font:800 10px/1 system-ui,sans-serif;color:#9AC4FF;text-shadow:0 1px 0 #000,0 0 3px #000;z-index:4}',
    sel(SK + ' .h2-n') + '{left:auto!important;right:3px!important;top:auto!important;bottom:3px!important;transform:none!important;font-size:9px!important;color:#E8C04A!important}',
    sel(SK + ':not(.lit) .h2-ic') + '{filter:grayscale(.75) brightness(.55)!important}',
    sel(SK + '.lit') + '{border-color:var(--cc,#E8C04A)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22),inset 0 0 16px color-mix(in srgb,var(--cc,#E8C04A) 35%,transparent),0 0 0 1px #000,0 0 12px color-mix(in srgb,var(--cc,#E8C04A) 60%,transparent)!important}',
    sel(SK + '.lit::after') + '{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.22) 50%,transparent 65%);background-size:250% 100%;animation:h3shine 2.6s ease-in-out infinite;z-index:3;pointer-events:none}',
    '@keyframes h3shine{0%{background-position:120% 0}60%,100%{background-position:-60% 0}}',
    sel(SK + ' .bh-sec') + '{font:900 18px/1 system-ui,sans-serif!important;text-shadow:0 2px 0 #000,0 0 4px #000!important}',
    sel(SK + '.nomp') + '{border-color:#3A6ACF!important}',
    // 翻滾：小一號
    sel('[data-tact="dodge"]') + '{width:44px!important;height:44px!important;border-radius:7px!important}',
    sel('[data-tact="dodge"] .h2-ic') + '{width:26px!important;height:26px!important}',
    sel('[data-tact="dodge"].lit') + '{border-color:#9AD8FF!important}',
    // 藥水：生命球旁邊
    sel(ITEM) + '{width:42px!important;height:42px!important}',
    sel('[data-tact="hp"] .h2-ic', '[data-h2="mp"] .h2-ic') + '{width:26px!important;height:26px!important}',
    sel('[data-tact="hp"] .h2-n', '[data-h2="mp"] .h2-n') + '{right:3px!important;bottom:2px!important;font-size:10px!important}',
    // 背包、指揮：小、暗一點
    sel(MISC) + '{width:34px!important;height:34px!important;opacity:.85}',
    sel('[data-tact="bag"] .h2-ic', '[data-tact="order"] .h2-ic') + '{width:20px!important;height:20px!important}',
    // 大招：一顆球，光從下往上漲
    sel('.ul-btn') + '{width:72px!important;height:72px!important;border-radius:50%!important;margin:0 4px!important;background:radial-gradient(circle at 50% 35%,#2A2230,#0E0C12 70%)!important;border:3px solid #0A080C!important;box-shadow:0 0 0 2px #5A4A38,0 0 0 4px #0A080C,inset 0 0 0 1px rgba(255,255,255,.12),0 6px 14px rgba(0,0,0,.6)!important}',
    '.ul-btn .ul-fill{position:absolute;inset:0;border-radius:50%;background:linear-gradient(to top,color-mix(in srgb,var(--cc,#E8C04A) 85%,#000) 0,var(--cc,#E8C04A) calc(var(--u,0)*100%),transparent calc(var(--u,0)*100% + 1px))!important;-webkit-mask:none!important;mask:none!important;opacity:.75;z-index:1}',
    '.ul-btn .ul-fill::after{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.45),transparent 38%)}',
    '.ul-btn .ul-txt{font:900 12px/1.1 system-ui,sans-serif!important;color:#F4EEE0;text-shadow:0 1px 0 #000,0 0 4px #000!important}',
    sel('.ul-btn kbd') + '{left:50%!important;bottom:-1px!important;transform:translateX(-50%)!important}',
    '.ul-btn.ready{animation:h3ult 1.2s ease-in-out infinite!important}',
    '@keyframes h3ult{50%{box-shadow:0 0 0 2px var(--cc,#E8C04A),0 0 0 4px #0A080C,0 0 20px var(--cc,#E8C04A),0 0 44px color-mix(in srgb,var(--cc,#E8C04A) 55%,transparent)}}',
    '.ul-btn.ready .ul-fill{opacity:1}',
    // 經驗條：細一點、放在技能上面
    'body:not(.touch) .h2-xp{height:5px!important;width:min(460px,52vw)!important}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
