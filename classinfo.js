// 職業說明的「？」（2026-10-08 作者：每個職業多一個問號，按下去顯示這個職業的特色、職業效果、技能等等）
// - 出現在：捏角最後一步選武器（每一類的標題旁邊）、公會登記處的「武器登記」（每一列）。
// - 內容：基本數值、武器、職業特效（classcore.js 的 help）、大招、技能書的技能、三條轉職路線（被動、路線大招、路線技能）。
// - 視窗是自己開的（#ci-modal，最上層；Esc、點外面、「知道了」關掉）。
// - 用 MutationObserver 找畫面上的 .reg-group、.cls-row 補上按鈕（不改 creator.js、hub.js 原本的字串）。
// 放在 classcore.js、monkstance.js、ult.js、ultpath.js、skillbook.js、creator.js、hub.js 後面。
(function (R) {
  const esc = s => R.esc(String(s == null ? '' : s)), $ = id => document.getElementById(id);
  const fakeP = cls => ({ cls, adv: '', lv: 1, ws: {}, item: null, hp: 1, hpMax: 1, mp: 0, mpMax: 0, x: 0, z: 0 });
  const helpOf = cls => { const c = R.CORE && R.CORE[cls]; if (!c) return null; let t = ''; try { t = c.help ? c.help(fakeP(cls)) : ''; } catch (e) { t = ''; } return { name: c.name || '', t }; };
  const skillsOf = (cls, adv) => Object.values(R.SKILL_LIB || {}).filter(s => s && s.cls === cls && (adv ? s.adv === adv : !s.adv)).sort((a, b) => (a.lv || 0) - (b.lv || 0));
  const chip = s => '<span class="ci-sk" title="' + esc(s.desc || '') + '"><i>Lv ' + (s.lv || 1) + '</i>' + esc(s.name) + '</span>';
  R.classInfo = cls => {
    const d = R.CLASSES[cls]; if (!d) return '';
    const g = R.regGroup ? R.regGroup(cls) : null, core = helpOf(cls), U = R.ULTS && R.ULTS[cls], P = R.ULT_PATHS && R.ULT_PATHS[cls];
    const sig = R.SKILLS && R.SKILLS[d.skill];
    const base = skillsOf(cls, '');
    let h = '<div class="ci" style="--c:' + d.color + '"><h2>' + esc(d.name) + (g ? '<small>公會分類：' + esc(g.group) + '</small>' : '') + '</h2>'
      + '<p>' + esc(d.desc) + '</p><p class="ci-st"><span>生命 <b>' + d.hp + '</b></span><span>魔力 <b>' + d.mp + '</b></span><span>移動 <b>' + d.speed + '</b></span>' + (d.shield ? '<span>帶盾</span>' : '') + '</p>';
    if (g && g.list) h += '<h3>武器</h3><ul class="ci-w">' + g.list.map(([w, line]) => '<li><b>' + esc(R.regName ? R.regName(cls, w) : w) + '</b>　' + esc(line) + '</li>').join('') + '</ul>';
    if (core) h += '<h3>職業特效：' + esc(core.name) + '</h3><p>' + esc(core.t) + '</p>';
    if (U) h += '<h3>大招：' + esc(U.name) + '</h3><p>' + esc(String(U.sub || '').replace(/｜/g, '；')) + '</p><p class="note">打中、被打會累積大招能量，滿了按 V。</p>';
    h += '<h3>技能</h3>' + (sig ? '<p>一開始的技能：<b>' + esc(sig.name) + '</b>　' + esc(sig.desc || '') + '</p>' : '')
      + '<p class="note">職業等級升上去會學到新技能，到技能書換上（三格都可以換）。游標停在技能上看說明。</p><div class="ci-sks">' + base.map(chip).join('') + '</div>';
    const advs = R.ADV && R.ADV[cls];
    if (advs && advs.length) {
      h += '<h3>轉職（Lv ' + (R.PROMOTE_LV || 30) + '，交一顆魔力核心）</h3><div class="ci-advs">' + advs.map(a => {
        const pu = P && P[a.id], sk = skillsOf(cls, a.id);
        return '<div class="ci-adv"><b>' + esc(a.name) + '</b><small>' + esc(a.path || '') + '</small><p>' + esc(a.desc || '') + '</p>'
          + (pu ? '<p>路線大招「' + esc(pu.name) + '」：' + esc(pu.d || '') + '</p>' : '')
          + (sk.length ? '<div class="ci-sks">' + sk.map(chip).join('') + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    }
    return h + '</div>';
  };
  const FOOT = '<div class="row"><button type="button" class="btn pri" data-ciclose="1">知道了</button></div>';
  // 自己的視窗（最上層）：捏角畫面、公會頁面都蓋得過去，遊戲也不用暫停
  const close = () => { const m = $('ci-modal'); if (m) m.hidden = true; };
  R.showClassInfo = cls => {
    const html = R.classInfo(cls); if (!html) return;
    let m = $('ci-modal'); if (!m) { m = document.createElement('div'); m.id = 'ci-modal'; m.innerHTML = '<div class="ci-box" role="dialog" aria-modal="true"></div>'; m.onclick = ev => { if (ev.target === m) close(); }; document.body.appendChild(m); }
    const box = m.firstChild; box.innerHTML = html + FOOT; m.hidden = false; box.scrollTop = 0;
  };
  document.addEventListener('keydown', ev => { const m = $('ci-modal'); if (ev.key === 'Escape' && m && !m.hidden) { ev.stopPropagation(); close(); } }, true);
  document.addEventListener('click', ev => {
    const q = ev.target.closest && ev.target.closest('[data-clsq]');
    if (q) { ev.preventDefault(); ev.stopPropagation(); R.showClassInfo(q.dataset.clsq); return; }
    const c = ev.target.closest && ev.target.closest('[data-ciclose]');
    if (c) { ev.preventDefault(); ev.stopPropagation(); close(); }
  }, true);
  // 畫面上的職業列表補上「？」
  const btn = cls => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cls-q'; b.dataset.clsq = cls; b.textContent = '?'; b.title = '這個職業的說明'; return b; };
  const scan = () => {
    document.querySelectorAll('.reg-group:not([data-q])').forEach(gp => { gp.dataset.q = 1; const c = gp.querySelector('[data-cls]'), h = gp.querySelector('h4'); if (c && h) h.appendChild(btn(c.dataset.cls)); });
    document.querySelectorAll('.cls-grid').forEach(gr => { gr.querySelectorAll('.cls-row').forEach((row, i) => { if (row.dataset.q) return; row.dataset.q = 1; const cls = R.CLASS_IDS[i]; const b = row.querySelector('b'); if (cls && b) b.after(btn(cls)); }); });
  };
  let queued = false;
  new MutationObserver(() => { if (queued) return; queued = true; setTimeout(() => { queued = false; scan(); }, 0); }).observe(document.body, { childList: true, subtree: true });
  const css = document.createElement('style');
  css.textContent = '#ci-modal{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,6,4,.62)}#ci-modal[hidden]{display:none}'
    + '.ci-box{width:min(720px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:16px 18px;border-radius:10px;border:1px solid #5A4A38;background:#1C1714;color:#EDE6DA;box-shadow:0 10px 40px rgba(0,0,0,.6);font-size:14px}.ci-box .row{display:flex;justify-content:flex-end;margin-top:12px}.ci-box .note{opacity:.7;font-size:12.5px}'
    + '.cls-q{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-left:6px;padding:0;border-radius:50%;border:1px solid var(--c,#C9A85A);background:rgba(0,0,0,.25);color:var(--c,#E8D8A8);font:700 12px/1 system-ui,sans-serif;cursor:pointer;vertical-align:middle;flex:none}.cls-q:hover{background:var(--c,#C9A85A);color:#140F0A}'
    + '.ci h2{border-left:4px solid var(--c);padding-left:10px}.ci h2 small{display:block;font-size:12px;opacity:.7;font-weight:400}.ci h3{margin:14px 0 4px;color:var(--c);filter:brightness(1.35)}.ci p{margin:4px 0;line-height:1.6}'
    + '.ci-st{display:flex;flex-wrap:wrap;gap:6px 14px}.ci-w{margin:4px 0;padding-left:18px;line-height:1.6}.ci-sks{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}'
    + '.ci-sk{display:inline-flex;gap:5px;align-items:baseline;padding:2px 8px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);font-size:12.5px;cursor:help}.ci-sk i{font-style:normal;font-size:10.5px;opacity:.65}'
    + '.ci-advs{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}.ci-adv{padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04)}.ci-adv small{margin-left:8px;opacity:.7}.ci-adv p{font-size:13px}';
  document.head.appendChild(css);
})(window.R);
