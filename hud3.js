// HUD 再改（作者 2026-10-04：hud 比較像物品欄；不好看，去網路上查）——電腦版
// 照《暗黑破壞神 III／IV》那種「一整塊有框的面板」做：生命、魔力是嵌在面板兩端金屬座裡的液體球（從下往上漲，不是圓環），
// 中間一塊石頭和青銅的面板，技能、藥水是嵌在面板裡、同一種斜面的方格；大招是面板正上方鑲著的一顆菱形寶石，光從下往上漲；
// 經驗是面板下緣一條細細的金線。散在畫面上、形狀不一的零件都收進同一塊面板，看起來才是一套。
// - 技能格：右上角藍色數字是魔力；沒學會的不顯示；能放的時候內框亮成職業顏色；冷卻照舊（扇形＋秒數）。
// - 按鍵只寫最短的（R、3、⇧、V……），放在格子右下角的小鍵帽。
// 只換樣式（hud2.js、battlehud.js、ult.js 的東西都照舊）。放在 hud2.js、ult.js 後面。
(function (R) {
  const W = R.W, $ = id => document.getElementById(id);
  const short = t => { t = String(t || '').trim(); if (!t) return ''; const a = t.split(/[／/]/)[0].replace(/^點/, '').trim(); if (/shift/i.test(a)) return '⇧'; if (/空白|space/i.test(a)) return '␣'; return a.length > 3 ? a.slice(0, 3) : a; };
  const ht0 = R.hudTick;
  R.hudTick = dt => {
    ht0(dt);
    const P = W.P; if (!P || !W.run) return;
    const c = (R.CLASS_GLOW && R.CLASS_GLOW[P.cls]) || '#E8C04A', dock = $('h2-dock'); if (dock && dock.dataset.c !== c) { dock.dataset.c = c; dock.style.setProperty('--cc', c); }
    [['r-skill', 0], ['r-skill2', 1], ['r-skill3', 2]].forEach(([id, i]) => {
      const b = $(id); if (!b) return; const sid = R.slotSkill ? R.slotSkill(P, i) : (i ? null : P.skill), sk = sid && R.SKILLS[sid];
      const t = sk && sk.mp ? String(sk.mp) : ''; if (b.dataset.mp !== t) b.dataset.mp = t; b.classList.toggle('none', !sk);
    });
    document.querySelectorAll('#r-br .act kbd').forEach(k => { const s = short(k.textContent); if (k.dataset.s !== s) k.dataset.s = s; });
  };
  const D = 'body:not(.touch) ', B = D + '#r-br ';
  const sel = (...k) => k.map(x => B + x).join(',');
  const SK = '.act[data-tact^="skill"]';
  const css = document.createElement('style');
  css.textContent = [
    // ===== 面板 =====
    D + '#h2-dock{gap:0!important;align-items:flex-end}',
    D + '.h2-mid{position:relative;display:flex!important;flex-direction:column;align-items:center;gap:7px;padding:16px 30px 9px;margin-bottom:6px;'
      + 'background:radial-gradient(120% 140% at 50% 0%,#3A302A 0%,#211A16 55%,#120E0C 100%);border:2px solid #070504;border-radius:14px 14px 6px 6px;'
      + 'box-shadow:inset 0 1px 0 rgba(255,225,170,.20),inset 0 0 0 1px #5E4A30,inset 0 0 0 3px #1A130E,inset 0 -14px 26px rgba(0,0,0,.55),0 0 0 1px #000,0 10px 26px rgba(0,0,0,.65)}',
    D + '.h2-mid::before{content:"";position:absolute;left:18px;right:18px;top:-3px;height:4px;border-radius:2px;background:linear-gradient(90deg,transparent,#7A5A2A 12%,#E8C870 50%,#7A5A2A 88%,transparent);box-shadow:0 0 6px rgba(232,200,112,.35)}',
    D + '.h2-mid::after{content:"";position:absolute;inset:5px 10px;border-radius:10px 10px 3px 3px;pointer-events:none;background:repeating-linear-gradient(90deg,rgba(255,255,255,.015) 0 2px,transparent 2px 6px)}',
    // 經驗：面板下緣的金線
    D + '.h2-xp{order:2;width:100%!important;height:4px!important;margin:0;background:#0A0806!important;border:0!important;box-shadow:inset 0 0 0 1px #2A2018!important;border-radius:2px}',
    D + '.h2-xp i{background:linear-gradient(90deg,#B8902A,#F2D98A)!important;border-radius:2px;box-shadow:0 0 6px rgba(242,217,138,.5)}',
    D + '.h2-xp b{left:auto!important;right:-26px!important;top:-6px!important;transform:none!important;font-size:11px!important;color:#F2D98A!important}',
    // ===== 格子 =====
    B + '{order:1;position:relative;background:none!important;border:0!important;box-shadow:none!important;padding:0!important;gap:5px!important;align-items:center}',
    sel('.act') + '{border-radius:5px!important;background:radial-gradient(circle at 50% 38%,#2E2A34,#0D0B10 78%)!important;border:2px solid #050405!important;'
      + 'box-shadow:inset 0 0 0 1px #6E5634,inset 0 0 0 2px #120E0A,inset 0 0 14px rgba(0,0,0,.85),0 1px 0 rgba(255,220,160,.12)!important;overflow:hidden}',
    sel('.act .h2-ic') + '{top:50%!important;filter:drop-shadow(0 2px 0 rgba(0,0,0,.7))!important}',
    sel('.act>span:not(.cd):not(.bh-sec)') + '{display:none!important}',
    sel('.act kbd') + '{left:auto!important;right:2px!important;top:auto!important;bottom:2px!important;transform:none!important;font-size:0!important;padding:0!important;background:none!important}',
    sel('.act kbd::after') + '{content:attr(data-s);display:inline-block;min-width:10px;padding:0 3px;font:700 9px/1.35 system-ui,sans-serif;color:#E8DCC0;text-align:center;background:rgba(6,4,6,.9);border:1px solid #5E4A30;border-radius:3px}',
    sel('.act .h2-n') + '{right:auto!important;left:3px!important;bottom:2px!important;top:auto!important;font-size:10px!important}',
    // 順序：藥水｜分隔｜技能｜翻滾｜分隔｜背包・指揮
    sel('[data-tact="hp"]') + '{order:1!important;margin:0!important}', sel('[data-h2="mp"]') + '{order:2!important;margin:0 10px 0 0!important}',
    sel('[data-tact="skill"]') + '{order:3!important}', sel('[data-tact="skill2"]') + '{order:4!important}', sel('[data-tact="skill3"]') + '{order:5!important}',
    sel('[data-tact="dodge"]') + '{order:6!important;margin:0 10px 0 0!important}', sel('[data-tact="bag"]') + '{order:8!important}', sel('[data-tact="order"]') + '{order:9!important}',
    // 分隔：小小的青銅菱形
    sel('[data-h2="mp"]::before', '[data-tact="dodge"]::before') + '{content:"";position:absolute;right:-9px;top:50%;width:6px;height:6px;margin-top:-3px;transform:rotate(45deg);background:#8A6A3A;box-shadow:0 0 0 1px #000;z-index:5}',
    sel('[data-h2="mp"]', '[data-tact="dodge"]') + '{overflow:visible!important}',
    // 技能格
    sel(SK) + '{width:54px!important;height:54px!important}',
    sel(SK + ' .h2-ic') + '{width:36px!important;height:36px!important}',
    sel(SK + '.none') + '{display:none!important}',
    sel(SK + '::before') + '{content:attr(data-mp);position:absolute;right:3px;top:2px;font:800 10px/1 system-ui,sans-serif;color:#8FB8FF;text-shadow:0 1px 0 #000,0 0 3px #000;z-index:4}',
    sel(SK + ' .h2-n') + '{left:3px!important;right:auto!important;top:2px!important;bottom:auto!important;transform:none!important;font-size:9px!important;color:#E8C04A!important}',
    sel(SK + ':not(.lit) .h2-ic') + '{filter:grayscale(.7) brightness(.5)!important}',
    sel(SK + '.lit') + '{box-shadow:inset 0 0 0 1px var(--cc,#E8C04A),inset 0 0 0 2px #120E0A,inset 0 0 18px color-mix(in srgb,var(--cc,#E8C04A) 40%,transparent),0 0 10px color-mix(in srgb,var(--cc,#E8C04A) 45%,transparent)!important}',
    sel(SK + '.lit::after') + '{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 40%,rgba(255,255,255,.18) 50%,transparent 60%);background-size:260% 100%;animation:h3shine 3s ease-in-out infinite;z-index:3;pointer-events:none}',
    '@keyframes h3shine{0%{background-position:130% 0}55%,100%{background-position:-60% 0}}',
    sel(SK + ' .bh-sec') + '{font:900 18px/1 system-ui,sans-serif!important;color:#FFF!important;text-shadow:0 2px 0 #000,0 0 4px #000!important}',
    sel(SK + '.nomp') + '{box-shadow:inset 0 0 0 1px #3A6ACF,inset 0 0 0 2px #120E0A,inset 0 0 14px rgba(58,106,207,.35)!important}',
    // 翻滾、藥水、背包：同一種格子，小一號
    sel('[data-tact="dodge"]', '[data-tact="hp"]', '[data-h2="mp"]') + '{width:44px!important;height:44px!important}',
    sel('[data-tact="dodge"] .h2-ic', '[data-tact="hp"] .h2-ic', '[data-h2="mp"] .h2-ic') + '{width:28px!important;height:28px!important}',
    sel('[data-tact="dodge"].lit') + '{box-shadow:inset 0 0 0 1px #9AD8FF,inset 0 0 0 2px #120E0A,inset 0 0 12px rgba(154,216,255,.3)!important}',
    sel('[data-tact="bag"]', '[data-tact="order"]') + '{width:34px!important;height:34px!important}',
    sel('[data-tact="bag"] .h2-ic', '[data-tact="order"] .h2-ic') + '{width:20px!important;height:20px!important}',
    sel('[data-tact="hp"] .h2-n', '[data-h2="mp"] .h2-n') + '{left:2px!important;right:auto!important;top:1px!important;bottom:auto!important;font-size:10px!important}',
    // 提示、訊息：往上移，不要壓在大招寶石上
    D + '#run:not(.town) #r-prompt{bottom:196px!important}', D + '#run:not(.town) #r-toast{bottom:166px!important}', D + '.ul-cast{bottom:220px!important}',
    // 左下的人物卡：窄一點的螢幕縮小，不要被生命球蓋住
    '@media (max-width:1320px){body:not(.touch) #r-bl{width:178px!important}body:not(.touch) #r-bl .bh-row,body:not(.touch) #r-bl small{font-size:11px}}',
    // ===== 大招：面板正上方的菱形寶石 =====
    sel('.ul-btn') + '{position:absolute!important;left:50%;top:-58px;order:0!important;width:50px!important;height:50px!important;margin:0!important;transform:translateX(-50%) rotate(45deg);border-radius:6px!important;'
      + 'background:radial-gradient(circle at 50% 50%,#2A2230,#0A080C 75%)!important;border:2px solid #050405!important;box-shadow:inset 0 0 0 1px #8A6A3A,inset 0 0 0 3px #120E0A,0 0 0 2px #2A1E14,0 4px 12px rgba(0,0,0,.7)!important;overflow:hidden}',
    '.ul-btn .ul-fill{position:absolute;inset:0;border-radius:4px!important;background:linear-gradient(to top left,color-mix(in srgb,var(--cc,#E8C04A) 70%,#000) 0,var(--cc,#E8C04A) calc(var(--u,0)*100%),transparent calc(var(--u,0)*100% + 1px))!important;-webkit-mask:none!important;mask:none!important;opacity:.85;z-index:1}',
    '.ul-btn .ul-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom right,rgba(255,255,255,.35),transparent 45%)}',
    '.ul-btn .ul-txt{transform:rotate(-45deg);font:900 10.5px/1.05 system-ui,sans-serif!important;color:#F4EEE0;text-shadow:0 1px 0 #000,0 0 4px #000!important;padding:0 2px!important}',
    sel('.ul-btn kbd') + '{left:auto!important;right:0!important;bottom:0!important;transform:rotate(-45deg)!important}',
    '.ul-btn.ready{animation:h3ult 1.2s ease-in-out infinite!important}',
    '@keyframes h3ult{50%{box-shadow:inset 0 0 0 1px var(--cc,#E8C04A),inset 0 0 0 3px #120E0A,0 0 0 2px var(--cc,#E8C04A),0 0 22px var(--cc,#E8C04A),0 0 46px color-mix(in srgb,var(--cc,#E8C04A) 50%,transparent)!important}}',
    '.ul-btn.ready .ul-fill{opacity:1}',
    // ===== 生命、魔力：液體球 =====
    D + '.h2-badge{width:96px!important;height:96px!important;z-index:2;overflow:hidden;background:#070405!important;box-shadow:0 0 0 3px #120C08,0 0 0 6px #7E6034,0 0 0 7px #2A1E12,0 0 0 9px #050304,0 8px 22px rgba(0,0,0,.75)!important}',
    D + '#h2-hp{margin:0 -16px 0 0}', D + '#h2-mp{margin:0 0 0 -16px}',
    D + '.h2-badge>i{inset:0!important}',
    D + '.h2-badge.hp .h2-ring{background:linear-gradient(to top,#5A080C 0,#C81E24 calc(var(--f,1)*100% - 8%),#F04A4A calc(var(--f,1)*100%),transparent calc(var(--f,1)*100% + 1px))!important}',
    D + '.h2-badge.mp .h2-ring{background:linear-gradient(to top,#08164A 0,#1E4AC8 calc(var(--f,1)*100% - 8%),#4A84F0 calc(var(--f,1)*100%),transparent calc(var(--f,1)*100% + 1px))!important}',
    D + '.h2-badge .h2-trail{background:linear-gradient(to top,rgba(255,235,220,.28) calc(var(--t,1)*100%),transparent calc(var(--t,1)*100% + 1px))!important}',
    D + '.h2-badge .h2-sh{background:conic-gradient(rgba(240,248,255,.9) calc(var(--s,0)*1turn),transparent 0)!important;-webkit-mask:radial-gradient(circle,transparent 44px,#000 45px)!important;mask:radial-gradient(circle,transparent 44px,#000 45px)!important}',
    D + '.h2-badge .h2-core{inset:0!important;background:radial-gradient(circle at 34% 24%,rgba(255,255,255,.42),rgba(255,255,255,0) 30%),radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%)!important;box-shadow:none!important}',
    D + '.h2-badge .h2-core img{display:none!important}',
    D + '.h2-badge .h2-core b{position:static!important;font:900 17px/1 system-ui,sans-serif!important;color:#FFF!important;text-shadow:0 2px 0 #000,0 0 6px #000!important}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
