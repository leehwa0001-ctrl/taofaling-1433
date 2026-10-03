// 種族一覽、抽的機率重新平衡（2026-10-04 作者：可能要重新平衡一下抽取的機率，還有可以全列出所有種族和他們的數值加成）
// - 機率：N 45%、R 32%、SR 18%、SSR 4.5%、UR 0.5%（原本 50.4／31.4／16／2／0.2；子族變多，稀有的拉高一點）。
//   大陸人族是世界上最多的種族，在 N 裡面權重 4（其他原本的種族 1、新的子族照族種平分）。
// - 種族一覽：照族種分段（點開看）、可以搜尋名字、照稀有度篩選；每一族寫出處、被排擠的程度、全部的加成。
//   城裡的選單（角色）、抽種族的畫面、抽選券的畫面都有「種族一覽」。
// 放在 races2.js、tickets.js 後面。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s);
  Object.assign(R.TIERS.N, { w: 45 }); Object.assign(R.TIERS.R, { w: 32 }); Object.assign(R.TIERS.SR, { w: 18 }); Object.assign(R.TIERS.SSR, { w: 4.5 }); Object.assign(R.TIERS.UR, { w: 0.5 });
  if (R.RACES.human) R.RACES.human.w = 4;
  // 已經刪掉的種族（2026-10-04 純潔族）：讀存檔的時候換回大陸人族，還 10 張抽選券
  const mg0 = R.migrate;
  R.migrate = s => { s = mg0 ? mg0(s) : s; try { if (s && s.race && !R.RACES[s.race]) { s.race = 'human'; s.raceTickets = (s.raceTickets || 0) + 10; s.raceRefund = 1; } } catch (e) { } return s; };

  const famOf = id => { const r = R.RACES[id]; if (r.mixed) return '混血（原本的種族）'; if (r.hd) return '半魔族'; if (r.divine) return r.from; if (r.fam) return r.fam; const m = /・([^・]+族種)/.exec(r.from || ''); return m ? m[1] : '其他'; };
  const XENO = ['不被排擠', '有人多看兩眼', '被排擠', '被整座城怕'];
  const row = id => {
    const r = R.RACES[id], T0 = R.TIERS[r.tier], b = R.raceBonusText ? R.raceBonusText(id) : [];
    return '<div class="rl-row" data-n="' + esc(r.name) + '" data-t="' + r.tier + '"><span class="rl-tier" style="--c:' + T0.color + '">' + T0.name + '</span><b>' + esc(r.name) + '</b><small>' + esc(r.from || '') + '・' + XENO[r.xeno || 0] + '</small><em>' + esc(b.join('、') || '沒有加成') + '</em></div>';
  };
  R.raceListSheet = back => {
    const groups = {}; R.RACE_IDS.forEach(id => { const f = famOf(id); (groups[f] = groups[f] || []).push(id); });
    const TI = Object.keys(R.TIERS), order = Object.keys(groups).sort((a, b) => (a === '半魔族') - (b === '半魔族') || (a.indexOf('混血') >= 0) - (b.indexOf('混血') >= 0) || Math.min(...groups[a].map(id => TI.indexOf(R.RACES[id].tier))) - Math.min(...groups[b].map(id => TI.indexOf(R.RACES[id].tier))));
    const rates = TI.map(t => '<b style="color:' + R.TIERS[t].color + '">' + t + ' ' + R.TIERS[t].w + '%</b>').join('　');
    const html = '<p class="kicker">公會東鶴分館・登記處的資料</p><h2>種族一覽（' + R.RACE_IDS.length + ' 族）</h2><p class="note">抽的機率：' + rates + '（UR 藏著，抽到才知道）。點族種看裡面的子族和加成。</p>'
      + '<div class="rl-bar"><input id="rl-q" type="search" placeholder="搜尋名字（例如：狐、龍、精靈）" autocomplete="off"><span>' + ['全部'].concat(TI).map((t, i) => '<button type="button" class="mini' + (i ? '' : ' on') + '" data-rlt="' + (i ? t : '') + '">' + t + '</button>').join('') + '</span></div>'
      + '<div class="rl-list">' + order.map(f => '<details class="rl-fam"><summary><b>' + esc(f) + '</b><small>' + groups[f].length + ' 族</small></summary>' + groups[f].map(row).join('') + '</details>').join('') + '</div>';
    R.sheet(html, '<div class="row"><button type="button" class="btn pri" id="rl-x">關閉</button></div>');
    const sh = $('r-sheet'); if (sh) sh.classList.add('wide');
    let tier = '';
    const filt = () => {
      const q = ($('rl-q').value || '').trim();
      document.querySelectorAll('.rl-fam').forEach(d => {
        let n = 0; d.querySelectorAll('.rl-row').forEach(r => { const ok = (!q || r.dataset.n.indexOf(q) >= 0) && (!tier || r.dataset.t === tier); r.hidden = !ok; if (ok) n++; });
        d.hidden = !n; if (q || tier) d.open = n > 0 && n < 60; else d.open = false;
      });
    };
    $('rl-q').oninput = filt;
    document.querySelectorAll('[data-rlt]').forEach(b => { b.onclick = () => { tier = b.dataset.rlt; document.querySelectorAll('[data-rlt]').forEach(x => x.classList.toggle('on', x === b)); filt(); }; });
    $('rl-x').onclick = () => { R.closeSheet(); if (back) back(); };
  };
  // 城裡的選單、抽種族、抽選券的畫面多一顆「種族一覽」
  const addBtn = (row, back) => { if (!row || row.querySelector('.rl-open')) return; const b = document.createElement('button'); b.type = 'button'; b.className = 'btn rl-open'; b.textContent = '種族一覽'; b.onclick = () => R.raceListSheet(back); row.appendChild(b); };
  const tm = R.townMenu; if (tm) R.townMenu = (...a) => { const r = tm(...a); addBtn($('r-sheet') && $('r-sheet').querySelector('.row'), () => R.townMenu()); return r; };
  const obs = new MutationObserver(() => { document.querySelectorAll('.rates').forEach(el => { if (el.nextElementSibling && el.nextElementSibling.classList && el.nextElementSibling.classList.contains('rl-link')) return; const a = document.createElement('p'); a.className = 'rl-link'; a.innerHTML = '<button type="button" class="mini">看全部的種族和加成（種族一覽）</button>'; a.querySelector('button').onclick = () => R.raceListSheet(); el.after(a); }); });
  const start = () => obs.observe(document.body, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  const css = document.createElement('style');
  css.textContent = '.rl-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0 10px}.rl-bar input{flex:1;min-width:180px;padding:6px 10px;border-radius:6px;border:1px solid var(--line,#5A4A3A);background:rgba(255,255,255,.05);color:inherit;font:inherit}.rl-bar .mini.on{background:var(--gold,#C9A13A);color:#1A1410}'
    + '.rl-list{display:grid;gap:6px}.rl-fam{border:1px solid var(--line,#5A4A3A);border-radius:8px;padding:6px 10px;background:rgba(255,255,255,.03)}.rl-fam summary{cursor:pointer;display:flex;gap:8px;align-items:baseline}.rl-fam summary small{opacity:.7}'
    + '.rl-row{display:grid;grid-template-columns:44px minmax(120px,180px) 1fr;gap:2px 10px;padding:5px 0;border-top:1px solid rgba(255,255,255,.06);align-items:baseline}.rl-row small{opacity:.7;font-size:12px}.rl-row em{grid-column:2/-1;font-style:normal;font-size:13px;color:#E8D8A8}'
    + '.rl-tier{font-weight:700;color:var(--c);font-size:12px}.rl-link{margin:4px 0 8px}@media (max-width:640px){.rl-row{grid-template-columns:40px 1fr}.rl-row small{grid-column:2}}';
  document.head.appendChild(css);
})(window.R);
