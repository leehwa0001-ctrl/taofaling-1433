// 討伐令 1433：左上角的顯示改版（作者 2026-10-04：遺跡那格根據難度不同有不同的外框，隊友應該放在旁邊或最下面，最好再加個頭像；
//   場地效果除了顯示文字外，也可以加上不同顏色的外框跟外框裝飾（像是結冰滴落、火焰燃燒等等）；樓層效果最好也都有自己的特色外框，讓人光是瞄一眼顏色就知道）
// - 遺跡那格（#r-where）：照分級換外框顏色和四角的裝飾，右上角掛分級的字母牌（F、E～D、C～A、AA～SS……）；觀光遺跡（動物園）、狩獵場另外一種。
// - 場地效果（kesentfx.js 的 #kfx-box）：火山＝底下一排火焰在燒、火星往上飄；凍原＝上緣掛冰柱、水滴往下滴；沙漠＝沙子斜斜地吹過去；深海＝泡泡往上冒。
//   沙暴、暴風雪來的時候整格閃。
// - 樓層效果（ruinvar.js 的 #rv-mod）：濃霧、寶藏、結晶、巢穴、寂靜、崩落、魔力潮、迷途各一種顏色和裝飾；領主層（lordfloor.js）多一格紅色的「領主層」。
// - 這幾格排在遺跡那格的正下面（場地 → 樓層 → 領主層）。
// - 隊友（#r-party）：電腦版搬到左下角、自己的卡片上面；每個隊友有頭像（從身上的圖切下來，和自己的卡片一樣）、血條，倒下變灰。手機版留在左上角，也有頭像。
// 只加 class、搬位置；原本的文字照舊由各自的檔案更新。放在 kesentfx.js、ruinvar.js、lordfloor.js、party.js、hud2.js 後面（index.html 最後面）。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const GRADE_CLS = id => ({ hamilia: 1, amile: 1, mors: 1, kesent: 1, kaso: 1, kansait: 1, hunt: 1 })[id] ? id : 'other';
  const ORD = { follow: '跟隨', focus: '集火', hold: '待命', free: '自由', retreat: '撤退' };

  // ---------- 遺跡那格 ----------
  const where = () => {
    const run = W().run, el = $('r-where'); if (!run || !el || !run.grade) return;
    const g = run.site && run.site.id === 'kanko' ? 'zoo' : GRADE_CLS(run.grade.id);
    el.classList.add('hf-where'); [...el.classList].forEach(c => { if (/^hf-g-/.test(c) && c !== 'hf-g-' + g) el.classList.remove(c); }); el.classList.add('hf-g-' + g);
    let b = el.querySelector('.hf-badge'); const t = g === 'zoo' ? '觀光' : run.grade.letter || '';
    if (!b) { b = document.createElement('i'); b.className = 'hf-badge'; el.appendChild(b); }
    if (b.textContent !== t) b.textContent = t;
  };
  const hf0 = R.hudFloor;
  R.hudFloor = (...a) => { const r = hf0(...a); try { where(); } catch (e) { console.warn('[hudframe]', e); } return r; };

  // ---------- 場地、樓層、領主層：外框照種類換 ----------
  const setKind = (el, pre, k) => { if (!el) return; [...el.classList].forEach(c => { if (c.indexOf(pre) === 0 && c !== pre + k) el.classList.remove(c); }); el.classList.add('hf-chip', pre + k); };
  const order = () => {
    const w = $('r-where'), tl = $('r-tl'); if (!w || !tl) return;
    let after = w; const gd = $('gd-box'); if (gd && gd.parentNode === tl && gd.previousElementSibling === w) after = gd;
    ['kfx-box', 'rv-mod', 'hf-lord'].forEach(id => { const el = $(id); if (el && el.parentNode === tl) { if (after.nextElementSibling !== el) tl.insertBefore(el, after.nextElementSibling); after = el; } });
  };
  const lordChip = () => {
    const w = W(), run = w.run, F = w.F, tl = $('r-tl'); if (!tl) return;
    let el = $('hf-lord');
    const on = run && F && F.lordGate;
    if (!on) { if (el) el.hidden = true; return; }
    if (!el) { el = document.createElement('div'); el.id = 'hf-lord'; el.className = 'glass dungeon-only r-misc hf-chip hf-lordc'; tl.appendChild(el); }
    const down = F.lordGate.down, h = '<span>領主層</span><small>' + (down ? '領主體倒下了：樓層通道開了' : '領主體守著樓層通道，打倒牠才能往下走') + '</small>';
    el.hidden = false; el.classList.toggle('down', !!down); if (el.innerHTML !== h) el.innerHTML = h;
  };

  // ---------- 隊友：頭像 ----------
  const faceOf = (a, c) => {
    const img = a.h && a.h.sp && a.h.sp.t && a.h.sp.t.image; if (!img || !c) return;
    const key = (img.width || 0) + ':' + a.cls + ':' + (a.downed ? 1 : 0); if (c.dataset.k === key) return; c.dataset.k = key;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 36, 30);
    const grd = g.createLinearGradient(0, 0, 0, 30); grd.addColorStop(0, '#2E3A44'); grd.addColorStop(1, '#14181E'); g.fillStyle = grd; g.fillRect(0, 0, 36, 30);
    try { g.filter = a.downed ? 'grayscale(1) brightness(.7)' : 'none'; g.drawImage(img, 3, 2, 18, 15, 0, 0, 36, 30); g.filter = 'none'; } catch (e) { }
  };
  R.partyHud = () => {
    const el = $('r-party'); if (!el) return;
    const w = W(), list = w.run ? (w.allies || []) : [], gone = w.run ? (w.run.party || []).filter(pm => pm.gone) : [];
    el.hidden = !list.length && !gone.length; if (el.hidden) return;
    el.classList.add('hf-party');
    const ordT = list.length && w.run.order && ORD[w.run.order.mode] ? '<div class="ordnow">指揮：<b>' + ORD[w.run.order.mode] + '</b><small>' + (R.touch ? '「指揮」按鈕' : 'C 鍵') + '換</small></div>' : '';
    const sig = list.map(a => a.name + (a.rival ? 'r' : '')).join('|') + '#' + gone.map(pm => pm.m.name).join('|') + '#' + ordT;
    if (el.dataset.sig !== sig) {
      el.dataset.sig = sig;
      el.innerHTML = ordT + list.map((a, i) => '<div class="pm" data-i="' + i + '"><canvas width="36" height="30"></canvas><div class="pm-t"><span>' + esc(a.name) + (a.rival ? '<em>臨時</em>' : '') + '</span><small></small><div class="meter"><i></i></div></div></div>').join('')
        + gone.map(pm => '<div class="pm down gone"><canvas width="36" height="30"></canvas><div class="pm-t"><span>' + esc(pm.m.name) + '</span><small>被帶回地面了</small></div></div>').join('');
    }
    el.querySelectorAll('.pm[data-i]').forEach(row => {
      const a = list[+row.dataset.i]; if (!a) return;
      const f = Math.max(0, a.hp / a.hpMax), sm = row.querySelector('small'), bar = row.querySelector('.meter>i');
      row.classList.toggle('down', !!a.downed); row.classList.toggle('low', !a.downed && f < 0.3);
      const t = a.downed ? '倒下了：走過去扶起來' : (R.CLASSES[a.cls] ? R.CLASSES[a.cls].name : '') + ' Lv ' + (a.m ? a.m.lv : '') + '・' + Math.ceil(Math.max(0, a.hp)) + '／' + Math.round(a.hpMax);
      if (sm.textContent !== t) sm.textContent = t;
      bar.style.width = f * 100 + '%';
      faceOf(a, row.querySelector('canvas'));
    });
    // 電腦版：放在左下角自己的卡片上面
    const bl = $('r-bl');
    if (!R.touch && bl && getComputedStyle(bl).position === 'fixed') { el.classList.add('hf-dock'); el.style.width = Math.max(210, bl.offsetWidth) + 'px'; el.style.bottom = (window.innerHeight - bl.getBoundingClientRect().top + 8) + 'px'; }
    else { el.classList.remove('hf-dock'); el.style.bottom = ''; el.style.width = ''; }
  };

  let t = 0;
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt); if ((t -= dt) > 0) return r; t = 0.3;
    try {
      const w = W(); if (!w.run) return r;
      setKind($('kfx-box'), 'hf-env-', w.run.envSkin || w.run.env || 'none');
      const fx = R.fieldFx && R.fieldFx(), kb = $('kfx-box'); if (kb) kb.classList.toggle('storm', !!(fx && fx.storm > 0));
      const mod = w.F && w.F.mod; if (mod) setKind($('rv-mod'), 'hf-mod-', mod);
      lordChip(); order();
      const wh = $('r-where'); if (wh && !wh.classList.contains('hf-where')) where();
    } catch (e) { console.warn('[hudframe]', e); }
    return r;
  };

  // ---------- 城裡、室內：自己的外框（2026-10-04 作者：離開遺跡後，公會、東鶴會繼承遺跡那個框框，他們應該要有自己的版本） ----------
  // 原本 #r-where 的 hf-g-分級 只在遺跡裡換，回到城裡還掛著最後那座遺跡的顏色和字母牌。
  // 東鶴的街上＝暖色的燈籠金、牌子「東鶴」；公會（東鶴分館、奉主分館）＝金色雙線框、紅底金字的「公會」印；奉主＝鋼灰、一排鉚釘、「奉主」；其他室內＝素色、沒有牌子。
  const PLACE = { town: '東鶴', guild: '公會', hosu: '奉主', inside: '' };
  const placeOf = w => { if (w.inside) { const n = (w.inside.pl && w.inside.pl.name) || ''; return /公會/.test(n) ? 'guild' : w.town && w.town.hosu ? 'hosu' : 'inside'; } if (w.town) return w.town.hosu ? 'hosu' : 'town'; return null; };
  setInterval(() => {
    try {
      const w = W(); if (!w || w.run) return; const el = $('r-where'), p = el && placeOf(w); if (!p) return;
      el.classList.add('hf-where'); [...el.classList].forEach(c => { if (/^hf-g-/.test(c) && c !== 'hf-g-' + p) el.classList.remove(c); }); el.classList.add('hf-g-' + p);
      let b = el.querySelector('.hf-badge'); const t = PLACE[p];
      if (!t) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('i'); b.className = 'hf-badge'; el.appendChild(b); } if (b.textContent !== t) b.textContent = t;
    } catch (e) { }
  }, 400);

  // ---------- 樣式 ----------
  const ICE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='46' height='12' viewBox='0 0 46 12'><path d='M0 0h46L44 3 42 9 40 3 36 6 33 2 30 11 27 2 23 5 20 1 17 8 14 2 10 6 7 1 4 10 2 2z' fill='%23E6F4FF'/><path d='M30 11l-1-6M17 8l-1-4M4 10l-1-5' stroke='%23FFFFFF' stroke-width='.6'/></svg>\")";
  const css = document.createElement('style');
  css.textContent = [
    // 遺跡那格
    '#r-where.hf-where{position:relative;--gc:#C8C0B0;border:2px solid var(--gc);padding-left:14px;padding-right:46px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),inset 0 0 18px -6px var(--gc),0 0 10px -4px var(--gc);background:linear-gradient(90deg,color-mix(in srgb,var(--gc) 22%,transparent),rgba(10,8,14,.78) 45%)}',
    '#r-where.hf-where::before{content:"";position:absolute;left:4px;top:5px;bottom:5px;width:4px;border-radius:2px;background:linear-gradient(var(--gc),color-mix(in srgb,var(--gc) 35%,#000))}',
    '#r-where.hf-where::after{content:"";position:absolute;inset:-5px;pointer-events:none;--k:10px;background:linear-gradient(var(--gc),var(--gc)) top left/var(--k) 2px no-repeat,linear-gradient(var(--gc),var(--gc)) top left/2px var(--k) no-repeat,linear-gradient(var(--gc),var(--gc)) top right/var(--k) 2px no-repeat,linear-gradient(var(--gc),var(--gc)) top right/2px var(--k) no-repeat,linear-gradient(var(--gc),var(--gc)) bottom left/var(--k) 2px no-repeat,linear-gradient(var(--gc),var(--gc)) bottom left/2px var(--k) no-repeat,linear-gradient(var(--gc),var(--gc)) bottom right/var(--k) 2px no-repeat,linear-gradient(var(--gc),var(--gc)) bottom right/2px var(--k) no-repeat}',
    '#r-where .hf-badge{position:absolute;right:6px;top:50%;transform:translateY(-50%);min-width:30px;padding:2px 5px;font-style:normal;font-weight:800;font-size:11px;text-align:center;color:#0E0C12;background:var(--gc);border-radius:4px;box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 8px -2px var(--gc);white-space:nowrap}',
    '#r-where.hf-g-hamilia{--gc:#9AE08A;border-radius:12px}#r-where.hf-g-hamilia::after{--k:0px}',
    '#r-where.hf-g-amile{--gc:#FFC45A;outline:1px solid color-mix(in srgb,#FFC45A 45%,transparent);outline-offset:2px}#r-where.hf-g-amile::after{--k:7px}',
    '#r-where.hf-g-mors{--gc:#B07AFF;border-radius:4px}#r-where.hf-g-mors::after{--k:14px}',
    '#r-where.hf-g-kesent{--gc:#FF4A6A;border-radius:2px;animation:hfPulse 2.4s ease-in-out infinite}#r-where.hf-g-kesent::after{--k:16px;filter:drop-shadow(0 0 3px #FF4A6A)}',
    '#r-where.hf-g-kaso{--gc:#E8C860;border-radius:0;border-width:3px;border-style:double;background:linear-gradient(100deg,#1A1408,#0A0806 40%,#2A2010 50%,#0A0806 60%);background-size:300% 100%;animation:hfShine 5s linear infinite}#r-where.hf-g-kaso::after{--k:18px}',
    '#r-where.hf-g-kansait{--gc:#FF2A2A;border-radius:0;background:repeating-linear-gradient(0deg,rgba(255,40,40,.08) 0 2px,transparent 2px 4px),#0A0406;animation:hfPulse 1.2s ease-in-out infinite}',
    '#r-where.hf-g-hunt{--gc:#C8A060;border-style:dashed;border-radius:8px}#r-where.hf-g-hunt::after{--k:0px}',
    '#r-where.hf-g-zoo{--gc:#5AD8B0;border-radius:14px}#r-where.hf-g-zoo::after{--k:0px}',
    // 城裡、室內（離開遺跡以後）
    '#r-where.hf-g-town{--gc:#E0A050;border-radius:10px}#r-where.hf-g-town::after{--k:6px}#r-where.hf-g-town .hf-badge{background:linear-gradient(#F0B860,#C8823A);border-radius:9px}',
    '#r-where.hf-g-guild{--gc:#E0B848;border-radius:3px;border-style:double;border-width:3px}#r-where.hf-g-guild::after{--k:12px}#r-where.hf-g-guild .hf-badge{background:#8A2228;color:#F6E2A8;box-shadow:0 0 0 1px #E0B848,0 0 8px -2px #E0B848;border-radius:3px;letter-spacing:1px}',
    '#r-where.hf-g-hosu{--gc:#A8AEBA;border-radius:2px;background-image:radial-gradient(circle,#D8DCE4 1.2px,transparent 1.8px),linear-gradient(90deg,color-mix(in srgb,#A8AEBA 22%,transparent),rgba(10,8,14,.78) 45%);background-size:16px 100%,auto;background-position:8px -4px,0 0;background-repeat:repeat-x,no-repeat}#r-where.hf-g-hosu::after{--k:8px}',
    '#r-where.hf-g-inside{--gc:#B8AE98;border-radius:10px;padding-right:14px}#r-where.hf-g-inside::after{--k:0px}',
    '@keyframes hfPulse{0%,100%{box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),inset 0 0 18px -6px var(--gc),0 0 6px -4px var(--gc)}50%{box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),inset 0 0 22px -4px var(--gc),0 0 16px -2px var(--gc)}}',
    '@keyframes hfShine{0%{background-position:100% 0}100%{background-position:-200% 0}}',
    // 場地、樓層的小格子：共通
    '.hf-chip{position:relative;overflow:hidden;--cc:#C8C0B0;border:2px solid var(--cc)!important;border-radius:6px;padding:5px 10px 5px 12px!important;box-shadow:inset 0 0 14px -6px var(--cc);isolation:isolate}',
    '.hf-chip b{color:var(--cc)!important}',
    '.hf-chip::before,.hf-chip::after{content:"";position:absolute;pointer-events:none;z-index:-1}',
    // 火山：底下燒著的火焰、往上飄的火星
    '.hf-env-volcano{--cc:#FF7A3A;background:linear-gradient(0deg,rgba(120,30,10,.85),rgba(20,8,6,.85) 70%)!important}',
    '.hf-env-volcano::after{left:-10px;right:-10px;bottom:-2px;height:14px;background:radial-gradient(ellipse 7px 12px at 50% 100%,#FFE08A 0,#FF8A2A 45%,rgba(255,60,20,.0) 75%) 0 100%/14px 14px repeat-x,radial-gradient(ellipse 5px 9px at 50% 100%,#FF5A1A 0,rgba(255,40,10,0) 80%) 7px 100%/14px 10px repeat-x;animation:hfFire .45s steps(2) infinite alternate;transform-origin:bottom}',
    '.hf-env-volcano::before{inset:0;background:radial-gradient(circle,#FFB040 0 1px,transparent 1.6px) 0 0/23px 19px,radial-gradient(circle,#FF7A2A 0 1px,transparent 1.6px) 11px 7px/31px 23px;animation:hfRise 2.2s linear infinite;opacity:.8}',
    '@keyframes hfFire{0%{transform:scaleY(.75);background-position:0 100%,7px 100%}100%{transform:scaleY(1.1);background-position:4px 100%,3px 100%}}',
    '@keyframes hfRise{0%{background-position:0 40px,11px 47px}100%{background-position:0 0,11px 7px}}',
    // 凍原：上緣的冰柱、往下滴的水
    '.hf-env-snow{--cc:#BFE4FF;background:linear-gradient(180deg,rgba(60,90,120,.85),rgba(14,20,30,.85))!important;padding-top:11px!important}',
    '.hf-env-snow::before{left:0;right:0;top:0;height:12px;background:' + ICE + ' 0 0/46px 12px repeat-x;filter:drop-shadow(0 1px 1px rgba(0,0,0,.4))}',
    '.hf-env-snow::after{left:0;right:0;top:9px;height:22px;background:radial-gradient(ellipse 1.2px 2px,#E6F4FF 60%,transparent 70%) 29px 0/46px 22px repeat-x,radial-gradient(ellipse 1.2px 2px,#E6F4FF 60%,transparent 70%) 16px 0/46px 22px repeat-x;animation:hfDrip 1.6s ease-in infinite}',
    '@keyframes hfDrip{0%{background-position:29px -2px,16px -10px;opacity:1}80%{opacity:.9}100%{background-position:29px 20px,16px 12px;opacity:0}}',
    // 熔爐（奉主兵工廠）：機關——鐵板和鉚釘、底下一條黃黑警示條（像輸送帶一樣往前走）、右邊一個會轉的齒輪（作者 2026-10-04：場地效果改成地刺、絞肉機、輸送帶，跟火焰沒關係了）
    '.hf-env-forge{--cc:#E8C04A;background:repeating-linear-gradient(90deg,rgba(74,78,86,.92) 0 22px,rgba(52,55,62,.92) 22px 23px)!important;box-shadow:inset 0 0 0 1px #14161A,inset 0 0 12px -6px #E8C04A;padding-bottom:9px!important}',
    '.hf-env-forge::before{inset:0;background:radial-gradient(circle,#A8ACB4 0 1.2px,transparent 1.6px) 4px 3px/23px 4px repeat-x,repeating-linear-gradient(-45deg,#E8C04A 0 4px,#16181C 4px 8px) 0 100%/100% 5px no-repeat;animation:hfBelt 1.2s linear infinite}',
    '.hf-env-forge::after{right:26px;top:50%;width:16px;height:16px;margin-top:-10px;border-radius:50%;background:radial-gradient(circle,#2A2C32 0 2.5px,#B8BCC4 3px 5px,transparent 5.5px),repeating-conic-gradient(#B8BCC4 0 18deg,transparent 18deg 36deg);-webkit-mask:radial-gradient(circle,#000 0 7.5px,transparent 8px);mask:radial-gradient(circle,#000 0 7.5px,transparent 8px);animation:hfSpin 3s linear infinite}',
    '.hf-env-forge.hi-click,.hf-env-forge{padding-right:48px!important}',
    '@keyframes hfBelt{0%{background-position:4px 3px,0 100%}100%{background-position:4px 3px,16px 100%}}',
    // 沙漠：斜吹的沙
    '.hf-env-desert{--cc:#E8C080;background:linear-gradient(90deg,rgba(110,80,40,.88),rgba(40,28,14,.85))!important}',
    '.hf-env-desert::after{inset:0;background:repeating-linear-gradient(100deg,transparent 0 16px,rgba(240,210,150,.28) 16px 18px,transparent 18px 27px,rgba(240,210,150,.16) 27px 28px);background-size:80px 100%;animation:hfSand 1.1s linear infinite}',
    '@keyframes hfSand{0%{background-position:0 0}100%{background-position:80px 0}}',
    // 深海：往上冒的泡泡
    '.hf-env-deep{--cc:#5FC8E0;background:linear-gradient(0deg,rgba(10,60,80,.88),rgba(6,20,30,.85))!important}',
    '.hf-env-deep::after{inset:0;background:radial-gradient(circle,transparent 0 1.6px,rgba(190,240,255,.8) 1.8px 2.4px,transparent 2.6px) 6px 0/29px 26px,radial-gradient(circle,transparent 0 1px,rgba(190,240,255,.6) 1.2px 1.7px,transparent 1.9px) 19px 9px/37px 31px;animation:hfBub 2.6s linear infinite}',
    '@keyframes hfBub{0%{background-position:6px 52px,19px 71px}100%{background-position:6px 0,19px 9px}}',
    // 沙暴、暴風雪來了：整格閃
    '.hf-chip.storm{animation:hfStorm .6s ease-in-out infinite alternate}',
    '@keyframes hfStorm{0%{box-shadow:inset 0 0 14px -6px var(--cc),0 0 0 0 var(--cc)}100%{box-shadow:inset 0 0 22px -2px var(--cc),0 0 14px 1px var(--cc)}}',
    // 樓層效果
    '#rv-mod.hf-chip{display:grid;gap:1px}#rv-mod.hf-chip small{color:#D6CCB8}',
    '.hf-mod-fog{--cc:#AEB8C2}.hf-mod-fog::after{inset:0;background:radial-gradient(ellipse 40px 10px at 30% 60%,rgba(220,230,240,.22),transparent 70%),radial-gradient(ellipse 50px 12px at 80% 40%,rgba(220,230,240,.18),transparent 70%);background-size:160px 100%;animation:hfSand 6s linear infinite}',
    '.hf-mod-treasure{--cc:#E8C860;background:linear-gradient(90deg,rgba(90,70,20,.85),rgba(14,10,6,.8))!important}.hf-mod-treasure::after{inset:0;background:radial-gradient(circle,#FFF4C0 0 1px,transparent 1.5px) 0 0/27px 17px,radial-gradient(circle,#FFE08A 0 .8px,transparent 1.3px) 13px 8px/33px 21px;animation:hfTw 1.4s steps(3) infinite}',
    '@keyframes hfTw{0%{opacity:.2}50%{opacity:1}100%{opacity:.35}}',
    '.hf-mod-crystal{--cc:#7FE8FF;background:linear-gradient(135deg,rgba(30,90,110,.8),rgba(10,16,24,.85) 60%)!important}.hf-mod-crystal::after{right:0;top:0;bottom:0;width:40px;background:linear-gradient(115deg,transparent 30%,rgba(160,240,255,.35) 31% 40%,transparent 41% 55%,rgba(160,240,255,.25) 56% 62%,transparent 63%)}',
    '.hf-mod-nest{--cc:#D8584A;background:radial-gradient(ellipse at 0 100%,rgba(110,20,20,.7),rgba(14,6,8,.85) 70%)!important}.hf-mod-nest::after{inset:0;background:radial-gradient(circle at 50% 50%,rgba(216,88,74,.35) 0 2px,transparent 3px) 0 0/14px 12px;animation:hfTw 1.8s ease-in-out infinite}',
    '.hf-mod-silent{--cc:#7A8ADA;background:rgba(10,12,26,.88)!important}.hf-mod-silent::after{inset:3px;border:1px dotted rgba(122,138,218,.5);border-radius:3px}',
    '.hf-mod-rockfall{--cc:#B89070}.hf-mod-rockfall::after{inset:0;background:linear-gradient(#B89070,#B89070) 10px 0/3px 3px no-repeat,linear-gradient(#8A6A50,#8A6A50) 47px 0/4px 4px no-repeat,linear-gradient(#B89070,#B89070) 83px 0/3px 3px no-repeat;animation:hfFall 1.3s ease-in infinite}',
    '@keyframes hfFall{0%{background-position:10px -4px,47px -14px,83px -24px}100%{background-position:10px 44px,47px 40px,83px 36px}}',
    '.hf-mod-mana{--cc:#A87AFF;animation:hfMana 1.8s ease-in-out infinite}',
    '@keyframes hfMana{0%,100%{box-shadow:inset 0 0 10px -6px #A87AFF}50%{box-shadow:inset 0 0 24px -4px #A87AFF,0 0 12px -2px #A87AFF}}',
    '.hf-mod-lost{--cc:#C8C0B0;border-style:dashed!important}.hf-mod-lost::after{right:6px;top:50%;width:14px;height:14px;margin-top:-7px;border:2px solid rgba(200,192,176,.5);border-radius:50%;border-top-color:transparent;animation:hfSpin 2s linear infinite}',
    '@keyframes hfSpin{to{transform:rotate(360deg)}}',
    // 領主層
    '.hf-lordc{--cc:#FF3A4A;display:grid;gap:1px;background:linear-gradient(90deg,rgba(90,10,20,.9),rgba(14,6,8,.85))!important;animation:hfPulse 2s ease-in-out infinite}.hf-lordc span{font-weight:800;color:#FF8A8A;letter-spacing:.2em}.hf-lordc small{color:#E8C8C8}',
    '.hf-lordc.down{--cc:#E8C860;animation:none}.hf-lordc.down span{color:#FFE08A}',
    // 隊友
    '#r-party.hf-party{gap:5px}',
    '#r-party.hf-party .pm{grid-template-columns:36px 1fr;gap:0 7px;padding:3px;border:1px solid var(--line);border-left:3px solid #7FC8FF;border-radius:6px;background:rgba(20,26,34,.55)}',
    '#r-party.hf-party .pm canvas{width:36px;height:30px;image-rendering:pixelated;border-radius:4px;border:1px solid rgba(255,255,255,.12)}',
    '#r-party.hf-party .pm-t{display:grid;gap:1px;min-width:0;align-content:center}',
    '#r-party.hf-party .pm-t span{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#r-party.hf-party .pm-t em{font-style:normal;font-size:10px;color:#FFD27A;margin-left:4px}',
    '#r-party.hf-party .pm-t small{text-align:left;font-size:10.5px}',
    '#r-party.hf-party .pm .meter{grid-column:auto;height:5px}',
    '#r-party.hf-party .pm.low{border-left-color:#FF6A5A}#r-party.hf-party .pm.low .meter>i{background:linear-gradient(90deg,#8A2A2A,#FF6A5A)}',
    '#r-party.hf-party .pm.down{border-left-color:#6A6A6A;opacity:.75}#r-party.hf-party .pm.down small{color:#FF8A7A}',
    '#r-party.hf-party.hf-dock{position:fixed;left:12px;padding:6px;z-index:2}',
    'body.touch #r-party.hf-party .pm{grid-template-columns:28px 1fr;padding:2px}body.touch #r-party.hf-party .pm canvas{width:28px;height:23px}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
