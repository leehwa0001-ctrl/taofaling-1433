// 討伐令 1433：圖鑑多一頁「遺跡」（作者 2026-10-04：圖鑑感覺可以多一個專門介紹遺跡的，順便提到內部出產魔物之類的，我接任務有時候都不確定要往哪裡刷；
//   版面照作者畫的：上面分級的分頁＋「特殊種」分頁；一列一列照深度排，黑色代表淺層、紅色代表深層——或每個頁面是那個遺跡自己的顏色，越往下越深；
//   變異種只在深層出現，外觀越深越危險）
// - dexui.js 的分頁旁邊多一個「遺跡」。左頁：分級的分頁（哈米莉亞、阿彌勒、摩爾斯、克森特、特殊種）→ 那個分級的遺跡 →
//   這座遺跡的三列（淺層、中層、深層），每一列是那個深度會遇到的生物（可以左右拖），常見的排前面、標★；
//   中層、深層換成會出現的變種（荒、獰、淵——照 variants.js 的 R.variantAt：淺層沒有，越深越多越兇）。列的顏色是遺跡所在地區的顏色，越往下越暗、越紅。
// - 右頁：沒點生物的時候是遺跡的介紹（地區、分級、層數、環境、領主體、佩特拉核心的樣子）；點了生物是那一隻的大圖、說明、在哪些遺跡出現。
// - 手機（窄的畫面）：右頁的內容跳出來。
// 放在 dexui.js、region.js 後面。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s);
  let on = false, gtab = 'amile', siteId = null, mon = null;
  const wide = () => window.matchMedia && window.matchMedia('(min-width: 780px)').matches;
  const G = id => R.gradeById(id), kills = id => { const k = R.S && R.S.dexKills; if (!k) return 0; return (k[id] || 0) + [1, 2, 3].reduce((a, t) => a + (k[id + '_v' + t] || 0), 0); };
  const icon = (id, s) => (R.beastIconURL ? R.beastIconURL(id, s || 2) : '');
  const ruins = gid => R.SITES.filter(s => s.kind === 'ruin' && s.grade === gid);
  const regionOf = s => (R.siteRegion ? R.siteRegion(s) : null);
  const colOf = s => { const rg = regionOf(s); return (rg && rg.c) || (R.GRADE_COLOR && R.GRADE_COLOR[s.grade]) || '#8A7A6A'; };
  // 這種生物原本是哪個分級的（變種的「分級差」照這個算）
  const originLv = id => { for (const g of R.GRADES) if ((g.pool || []).includes(id)) return g.lv || 1; return 1; };
  const tierAt = (id, site, band) => { const g = G(site.grade); if (!g || !band) return 0; const gd = Math.max(0, (g.lv || 1) - originLv(id)); let t = R.variantAt ? R.variantAt(band === 1 ? 0.5 : 0.75, gd).tier : Math.min(3, gd + band); while (t > 0 && !R.ENEMIES[id + '_v' + t]) t--; return t; };   // variants.js 的 R.variantAt：中層看一半深、深層看四分之三深
  const floorsOf = s => (R.floorsFor ? R.floorsFor(s) : Math.max(2, (G(s.grade) || {}).floors || 5));
  const BANDS = [['淺層', '沒有變種'], ['中層', '變種兩成到六成'], ['深層', '變種七成到全部，最深處是「淵」']];   // 2026-10-04 作者：越深越容易出現變種，再極端一點
  const bandRange = (s, b) => { const n = floorsOf(s), a = Math.floor(n * b / 3) + 1, z = Math.max(a, Math.floor(n * (b + 1) / 3)); return '第 ' + a + '～' + z + ' 層'; };
  const th = (id, star) => { const e = R.ENEMIES[id], n = kills(id.replace(/_v\d$/, '')), url = icon(id); return '<button type="button" class="dr-th' + (n ? '' : ' dim') + (mon === id ? ' sel' : '') + '" data-drm="' + id + '" title="' + esc(e ? e.name : id) + '">' + (url ? '<img src="' + url + '" alt="" draggable="false">' : '<span>' + esc((e && e.name || '?')[0]) + '</span>') + (star ? '<em>★</em>' : '') + '</button>'; };
  const row = (lab, sub, ids, k, col, stars) => '<div class="dr-row" style="--rc:' + col + ';--k:' + k + '"><div class="dr-lab"><b>' + esc(lab) + '</b><small>' + esc(sub) + '</small></div><div class="dr-strip">' + (ids.length ? ids.map(id => th(id, stars && stars.includes(id.replace(/_v\d$/, '')))).join('') : '<span class="dr-none">（沒有）</span>') + '</div></div>';

  // ---------- 左頁 ----------
  const ruinRows = s => {
    const pool = (R.sitePool ? R.sitePool(s) : (G(s.grade).pool || [])).filter(id => R.ENEMIES[id] && !R.ENEMIES[id].noDex);
    const main = R.siteMain ? R.siteMain(s) : [], order = pool.slice().sort((a, b) => (main.includes(b) - main.includes(a)) || (!!R.ENEMIES[a].elite - !!R.ENEMIES[b].elite));
    const col = colOf(s);
    let h = BANDS.map(([lab, note], b) => row(lab, bandRange(s, b) + '・' + note, order.map(id => { const t = b ? tierAt(id, s, b) : 0; return t ? id + '_v' + t : id; }), b, col, main)).join('');
    const env = s.env && Object.keys(R.ENEMIES).filter(k => R.ENEMIES[k].env === s.env && !R.ENEMIES[k].boss);
    if (env && env.length) h += row('環境', (s.envName || (R.ENVS[s.env] || {}).name) + '才有的', env, 1.5, col);
    const envLord = { snow: 'frostdeer', volcano: 'lavajaw', desert: 'sandwhale', deep: 'kraken' }[s.env], rg = regionOf(s), own = rg && rg.lords && rg.lords[s.id];
    const excl = new Set([].concat(...Object.values(R.REGIONS || {}).map(r => r.lords ? [].concat(...Object.values(r.lords)) : [])));   // 別的遺跡專屬的領主體（無主大鎧）不列
    const L = Array.from(new Set(own ? own : (envLord ? [envLord] : []).concat((G(s.grade).lords || []).filter(id => !excl.has(id))))).filter(id => R.ENEMIES[id]);
    if (L.length) h += row('領主體', '每 3～5 層守在樓層通道前', L, 2.4, col);
    const boss = G(s.grade).boss; if (boss && R.ENEMIES[boss]) h += row('最深處', '佩特拉核心', [boss], 3, col);
    return h;
  };
  const special = () => {
    const E = R.ENEMIES, envs = Object.keys(R.ENVS || {});
    let h = '';
    envs.forEach((env, i) => { const ids = Object.keys(E).filter(k => E[k].env === env && !E[k].noDex); if (ids.length) h += row(R.ENVS[env].name, '克森特級的' + R.ENVS[env].name + '環境', ids, i * 0.6, ['#D85A2A', '#C8A870', '#2A7A9A', '#7AB8E0'][i] || '#8A7A6A'); });
    const lords = Object.keys(E).filter(k => E[k].boss && /^領主體/.test(E[k].name || '') && !E[k].noDex); h += row('領主體', '克森特級以上', lords, 2.2, '#9A2A3A');
    const etc = ['mimic', 'gaki', 'kudan', 'fukudo'].filter(k => E[k] && !E[k].noDex); if (etc.length) h += row('其他', '偽箱、佩特拉的反應……', etc, 1, '#6A5A7A');
    return '<p class="note">只在特定的環境、或特別的條件才看得到的。</p><div class="dr-ruin">' + h + '</div>';   // 一起左右捲（同一條滑桿）
  };
  const left = () => {
    const gs = R.GRADES.filter(g => g.pool && g.pool.length && ruins(g.id).length);
    if (gtab !== 'sp' && !gs.some(g => g.id === gtab)) gtab = gs[0] ? gs[0].id : 'sp';
    const list = gtab === 'sp' ? [] : ruins(gtab); if (gtab !== 'sp' && !list.some(s => s.id === siteId)) siteId = (list.find(s => s.status === 'open') || list[0] || {}).id;
    const s = R.SITES.find(x => x.id === siteId);
    return '<div class="dr-gtabs">' + gs.map(g => '<button type="button" class="dr-gt' + (gtab === g.id ? ' on' : '') + '" data-drg="' + g.id + '" style="--gc:' + ((R.GRADE_COLOR || {})[g.id] || '#8A7A6A') + '">' + esc(g.name) + '</button>').join('') + '<button type="button" class="dr-gt' + (gtab === 'sp' ? ' on' : '') + '" data-drg="sp" style="--gc:#9A6AC8">特殊種</button></div>'
      + (gtab === 'sp' ? special() : '<div class="dr-sites">' + list.map(x => { const rg = regionOf(x); return '<button type="button" class="dr-site' + (x.id === siteId ? ' on' : '') + (x.status === 'lock' ? ' lock' : '') + '" data-drs="' + x.id + '" style="--rc:' + colOf(x) + '"><b>' + esc(x.name) + '</b><small>' + esc(rg ? rg.n : '') + (x.status === 'lock' ? '・還不能進' : '') + '</small></button>'; }).join('') + '</div>'
        + (s ? '<div class="dr-ruin">' + ruinRows(s) + '</div><p class="note dr-tip">★＝這座遺跡常見的。暗的是還沒打倒過的。可以左右拖（每一列一起動）。</p>' : ''));
  };
  // ---------- 右頁 ----------
  const coreURL = s => { try { const st = R.coreStyleOf && R.coreStyleOf(s), sh = R.beastSheetOf && R.beastSheetOf('petra'); if (!sh) return ''; const src = st && R.recolorCore ? R.recolorCore(sh.c, st) : sh.c, c = document.createElement('canvas'); c.width = sh.fw; c.height = sh.fh; c.getContext('2d').drawImage(src, 0, 0, sh.fw, sh.fh, 0, 0, sh.fw, sh.fh); return c.toDataURL(); } catch (e) { return ''; } };
  const ruinInfo = s => {
    const g = G(s.grade), rg = regionOf(s), t = R.TYPES[s.type], main = R.siteMain ? R.siteMain(s) : [], cu = g && g.boss === 'petra' ? coreURL(s) : '';
    return '<div class="dx-banner">' + esc(s.name) + '</div>'
      + '<div class="dr-info" style="--rc:' + colOf(s) + '"><p><b>' + esc(g ? g.name : '') + '</b>（' + esc(g ? g.letter : '') + '）・' + esc(t ? t.name : '') + (s.env ? '・' + esc(s.envName || R.ENVS[s.env].name) + '環境' : '') + '・約 ' + floorsOf(s) + ' 層</p>'
      + '<p>' + esc(s.desc || '') + '</p>' + (rg ? '<p class="note"><b>' + esc(rg.n) + '</b>：' + esc(rg.d || '') + '</p>' : '')
      + (main.length ? '<p class="note">常見：' + main.map(id => esc(R.ENEMIES[id].name)).join('、') + '</p>' : '')
      + (cu ? '<div class="dr-core"><img src="' + cu + '" alt=""><small>這一帶的佩特拉核心</small></div>' : '') + '</div>';
  };
  const monInfo = id => {
    const e = R.ENEMIES[id], base = id.replace(/_v\d$/, ''), n = kills(base), url = icon(id, 6);
    const where = R.SITES.filter(s => s.kind === 'ruin' && s.id !== 'kanko' && ((R.sitePool ? R.sitePool(s) : []).includes(base) || (e.env && s.env === e.env) || (R.siteLords && (R.siteLords(s) || []).includes(base))));
    return '<div class="dx-banner">' + esc(e.name) + '</div><div class="dx-portrait' + (n ? '' : ' unseen') + '" style="--bg:#3A3046">' + (url ? '<img src="' + url + '" alt="">' : '') + '</div>'
      + '<p>' + esc(e.desc || (R.ENEMIES[base] && R.ENEMIES[base].desc) || '') + '</p>'
      + (R.dexStats ? R.dexStats(id) : '') + '<p class="note">' + (n ? '打倒過 ' + n + ' 隻（包括變種）' : '還沒打倒過') + '</p>'
      + (where.length ? '<h4 class="dx-h">出現的遺跡</h4><div class="dr-where">' + where.map(s => '<button type="button" class="dr-site sm" data-drgo="' + s.id + '" style="--rc:' + colOf(s) + '"><b>' + esc(s.name) + '</b><small>' + esc(G(s.grade).name) + ((R.siteMain ? R.siteMain(s) : []).includes(base) ? '・常見' : '') + '</small></button>').join('') + '</div>' : '')
      + '<div class="row"><button type="button" class="btn" data-drback="1">回到遺跡的介紹</button></div>';
  };

  // ---------- 畫出來 ----------
  const render = host => {
    const book = host.querySelector('.dx-book'), lp = book && book.querySelector('.dx-left'), rp = book && book.querySelector('.dx-right'); if (!lp) return;
    const tabs = lp.querySelector('.dx-tabs'); tabs.querySelectorAll('.dx-tab').forEach(b => b.classList.toggle('on', b.dataset.dxtab === 'ruin'));
    [...lp.children].forEach(c => { if (c !== tabs) c.remove(); });
    const box = document.createElement('div'); box.className = 'dr-box'; box.innerHTML = left(); lp.appendChild(box);
    const s = R.SITES.find(x => x.id === siteId), showRight = html => { if (wide() && rp) { rp.innerHTML = html; bindRight(host, rp); } else if (html) popup(host, html); };
    if (wide() && rp) showRight(mon && R.ENEMIES[mon] ? monInfo(mon) : s ? ruinInfo(s) : '<p class="note">選一座遺跡。</p>');
    box.querySelectorAll('[data-drg]').forEach(b => { b.onclick = () => { gtab = b.dataset.drg; mon = null; render(host); }; });
    box.querySelectorAll('[data-drs]').forEach(b => { b.onclick = () => { siteId = b.dataset.drs; mon = null; render(host); }; });
    box.querySelectorAll('[data-drm]').forEach(b => { b.onclick = () => { if (b.dataset.drag === '1') return; mon = b.dataset.drm; if (wide()) { render(host); } else popup(host, monInfo(mon)); }; });
    // 可以用滑鼠左右拖：整塊（每一列）一起動，只有一條滑桿（2026-10-04 作者：圖鑑的滑桿統一成同一個，四條分開挺瞎的）
    box.querySelectorAll('.dr-ruin').forEach(st => {
      let down = null;
      st.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = { x: e.clientX, l: st.scrollLeft, moved: false }; });
      st.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 4) { down.moved = true; st.scrollLeft = down.l - dx; st.classList.add('drag'); } });
      const up = () => { if (down && down.moved) { st.querySelectorAll('[data-drm]').forEach(b => { b.dataset.drag = '1'; }); setTimeout(() => st.querySelectorAll('[data-drm]').forEach(b => { b.dataset.drag = ''; }), 0); } down = null; st.classList.remove('drag'); };
      st.addEventListener('pointerup', up); st.addEventListener('pointerleave', up);
    });
  };
  const bindRight = (host, rp) => {
    rp.querySelectorAll('[data-drback]').forEach(b => { b.onclick = () => { mon = null; render(host); }; });
    rp.querySelectorAll('[data-drgo]').forEach(b => { b.onclick = () => { const s = R.SITES.find(x => x.id === b.dataset.drgo); if (!s) return; gtab = s.grade; siteId = s.id; mon = null; render(host); const m = $('dr-modal'); if (m) m.remove(); }; });
  };
  const popup = (host, html) => {
    const old = $('dr-modal'); if (old) old.remove();
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'dr-modal'; m.style.zIndex = 60;
    m.innerHTML = '<div class="sheet dx-sheet" role="dialog" aria-modal="true">' + html + '<div class="row"><button type="button" class="btn pri" id="dr-x">關閉</button></div></div>';
    document.body.appendChild(m); const close = () => m.remove(); $('dr-x').onclick = close; m.onclick = e => { if (e.target === m) close(); };
    m.querySelectorAll('[data-drback]').forEach(b => { b.onclick = () => { mon = null; close(); }; });
    m.querySelectorAll('[data-drgo]').forEach(b => { b.onclick = () => { const s = R.SITES.find(x => x.id === b.dataset.drgo); if (!s) return; gtab = s.grade; siteId = s.id; mon = null; close(); render(host); }; });
  };
  // dexui.js 每次重畫都會換掉整個 #cards：再把「遺跡」分頁加回去
  const inject = host => {
    const tabs = host.querySelector('.dx-tabs'); if (!tabs || tabs.querySelector('[data-dxtab="ruin"]')) return;
    const n = R.SITES.filter(s => s.kind === 'ruin').length, b = document.createElement('button'); b.type = 'button'; b.className = 'dx-tab'; b.dataset.dxtab = 'ruin'; b.innerHTML = '遺跡 <small>' + n + ' 座</small>';
    b.onclick = () => { on = true; render(host); }; tabs.appendChild(b);
    tabs.querySelectorAll('.dx-tab:not([data-dxtab="ruin"])').forEach(x => { const f0 = x.onclick; x.onclick = ev => { on = false; if (f0) f0.call(x, ev); }; });
    if (on) render(host);
  };
  const watch = () => {
    const host = $('cards'); if (!host) return;
    new MutationObserver(() => { if (host.querySelector('.dx-tabs')) inject(host); }).observe(host, { childList: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  R.dexRuins = { render: () => { const h = $('cards'); if (h) { on = true; render(h); } } };

  const css = document.createElement('style');
  css.textContent = [
    '.dr-gtabs{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0 8px}',
    '.dr-gt{padding:5px 10px;border-radius:999px;border:1px solid var(--gc);background:transparent;color:inherit;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}.dr-gt.on{background:var(--gc);color:#140E0A}',
    '.dr-sites{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-bottom:10px}',
    '.dr-site{display:grid;gap:1px;text-align:left;padding:6px 9px;border-radius:8px;border:1px solid var(--line);border-left:4px solid var(--rc);background:rgba(255,255,255,.04);color:inherit;font:inherit;cursor:pointer}',
    '.dr-site b{font-size:13px}.dr-site small{font-size:11px;opacity:.75}.dr-site.on{background:color-mix(in srgb,var(--rc) 22%,transparent);border-color:var(--rc)}.dr-site.lock{opacity:.7}.dr-site.sm{padding:4px 8px}',
    '.dr-ruin{display:grid;gap:0;border-radius:10px;overflow-x:auto;overflow-y:hidden;border:1px solid var(--line);scrollbar-width:thin;cursor:grab;user-select:none}.dr-ruin.drag{cursor:grabbing}',
    // 越往下越暗、越紅（--k：0 淺 → 3 最深）
    '.dr-row{display:grid;grid-template-columns:92px max-content;min-width:100%;width:max-content;box-sizing:border-box;align-items:center;gap:8px;padding:6px 8px;background:linear-gradient(90deg,color-mix(in srgb,var(--rc) calc(40% - var(--k) * 9%),color-mix(in srgb,#000 calc(100% - var(--k) * 18%),#8A0A14)),color-mix(in srgb,#000 calc(70% - var(--k) * 6%),color-mix(in srgb,var(--rc) 20%,#5A0A10)));border-top:1px solid rgba(0,0,0,.4)}',
    '.dr-lab{display:grid;gap:1px;line-height:1.2;position:sticky;left:0;z-index:1;align-self:stretch;align-content:center;margin:-6px 0 -6px -8px;padding:6px 6px 6px 8px;background:color-mix(in srgb,var(--rc) calc(32% - var(--k) * 7%),#0C0A0C);box-shadow:6px 0 8px -4px rgba(0,0,0,.6)}.dr-lab b{font-size:13.5px;color:#F4E9CD}.dr-lab small{font-size:10px;opacity:.8}',
    '.dr-strip{display:flex;gap:5px;padding:2px 0 4px}',
    '.dr-th{position:relative;flex:none;width:46px;height:46px;display:grid;place-items:center;padding:3px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.28);cursor:pointer}',
    '.dr-th img{max-width:100%;max-height:100%;image-rendering:pixelated;pointer-events:none}.dr-th.dim img{filter:grayscale(1) brightness(.5)}',
    '.dr-th.sel,.dr-th:hover{border-color:var(--gold,#C9A13A)}.dr-th em{position:absolute;left:2px;top:0;font-style:normal;font-size:10px;color:#FFE08A;text-shadow:0 1px 2px #000}',
    '.dr-none{opacity:.6;font-size:12px}.dr-tip{margin-top:6px}',
    '.dr-info p{margin:6px 0}.dr-info{border-left:3px solid var(--rc);padding-left:10px}',
    '.dr-core{display:grid;justify-items:center;gap:2px;margin-top:8px}.dr-core img{width:min(220px,80%);image-rendering:pixelated}.dr-core small{opacity:.75}',
    '.dr-where{display:grid;gap:5px}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
