// 自己登記套裝（2026-10-05 作者：玩家可以自己登記套裝）
// 倉庫的裝備欄下面多一塊「我的套裝」：
// - 「把身上這套存起來」：身上整套（R.GEAR_KEYS 全部：武器、頭、身、腿、腳、護符、飾品…）存成一組，可以取名字（沒取就叫「套裝 1」）。
// - 每一組：「換上」一次換回那一整套；「更新」用身上現在的蓋掉；「改名」；「刪除」。每個職業各存各的，最多 8 組。
// - 換上的時候：存的時候空著的格子會脫下（武器不會空）；那件已經賣掉、分解了（倉庫找不到），或這個職業不能用，就那一格照現在的不動，並告訴你少了哪幾件。
// - 倉庫裡的東西如果在某個套裝裡，卡片上標「套裝：名字」，賣掉、分解之前看得到。
// 資料：R.S.loadouts[職業] = [{ name, eq: { weapon: 編號, head: …} }]。放在 hub.js、acc2.js、stashui.js 後面。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s), S = () => R.S, MAX = 8;
  const isStash = () => { const tab = document.querySelector('[data-htab][aria-selected="true"]'); return tab && tab.dataset.htab === 'stash'; };
  const list = () => { const s = S(); s.loadouts = s.loadouts || {}; return (s.loadouts[s.cls] = s.loadouts[s.cls] || []); };
  const say = (t, c) => { if (R.say) R.say(t, c); };
  const snap = () => { const e = S().equip[S().cls] || {}, eq = {}; R.GEAR_KEYS.forEach(k => { eq[k] = e[k] || null; }); return eq; };
  const wear = set => {
    const s = S(), cls = s.cls, e = s.equip[cls] = s.equip[cls] || {}, miss = [];
    R.GEAR_KEYS.forEach(k => {
      const id = set.eq[k];
      if (!id) { if (k !== 'weapon') e[k] = null; return; }
      const it = R.itemById(id);
      if (!it || !R.canUse(it, cls)) { miss.push(R.GEAR_NAME[k] || k); return; }
      R.GEAR_KEYS.forEach(k2 => { if (k2 !== k && e[k2] === id) e[k2] = null; });   // 兩格飾品不會穿到同一件
      e[k] = id;
    });
    R.save && R.save(); R.hub();
    say(miss.length ? '換上「' + set.name + '」——少了：' + miss.join('、') + '（賣掉、分解了，或這個職業不能用）' : '換上「' + set.name + '」了', miss.length ? '#FFB45A' : '#9AE07A');
  };
  const summary = set => R.GEAR_KEYS.map(k => {
    const id = set.eq[k]; if (!id) return null; const it = R.itemById(id);
    return it ? '<span style="color:' + R.rarityColor(it) + '">' + esc(R.itemName(it)) + '</span>' : '<span style="color:#FF8A7A">' + esc(R.GEAR_NAME[k] || k) + '：不見了</span>';
  }).filter(Boolean).join('、') || '（全部空著）';
  const same = set => { const now = snap(); return R.GEAR_KEYS.every(k => (now[k] || null) === (set.eq[k] || null)); };
  const html = () => {
    const L = list();
    return '<h3>我的套裝</h3><p class="note">把身上這一整套存起來，之後按「換上」一次換回來。每個職業各存各的，最多 ' + MAX + ' 組。</p>'
      + '<div class="recipes lo-list">' + L.map((set, i) => '<div class="recipe lo-row"><b>' + esc(set.name) + (same(set) ? '<em style="font-style:normal;font-size:11px;color:#9AE07A;margin-left:6px">穿著</em>' : '') + '</b><small>' + summary(set) + '</small>'
        + '<span class="lo-btns"><button type="button" class="btn pri" data-lo-wear="' + i + '"' + (same(set) ? ' disabled' : '') + '>換上</button><button type="button" class="mini" data-lo-upd="' + i + '">更新</button><button type="button" class="mini" data-lo-ren="' + i + '">改名</button><button type="button" class="mini" data-lo-del="' + i + '">刪除</button></span></div>').join('') + '</div>'
      + '<div class="row lo-add"><input id="lo-name" maxlength="12" placeholder="名字（例：打領主用）" autocomplete="off" style="width:12em"><button type="button" class="btn" data-lo-save="1"' + (L.length >= MAX ? ' disabled' : '') + '>把身上這套存起來</button></div>';
  };
  const bind = box => {
    const on = (sel, f) => box.querySelectorAll(sel).forEach(b => { b.onclick = () => f(b); });
    on('[data-lo-save]', () => {
      const L = list(); if (L.length >= MAX) return;
      const nm = (($('lo-name') || {}).value || '').trim().slice(0, 12) || '套裝 ' + (L.length + 1);
      L.push({ name: nm, eq: snap() }); R.save && R.save(); R.hub(); say('存好了：「' + nm + '」', '#9AE07A');
    });
    on('[data-lo-wear]', b => { const set = list()[+b.dataset.loWear]; if (set) wear(set); });
    on('[data-lo-upd]', b => { const set = list()[+b.dataset.loUpd]; if (!set) return; set.eq = snap(); R.save && R.save(); R.hub(); say('「' + set.name + '」改成身上這套了', '#9AE07A'); });
    on('[data-lo-ren]', b => { const set = list()[+b.dataset.loRen]; if (!set) return; const v = prompt('套裝的新名字', set.name); if (v == null) return; set.name = v.trim().slice(0, 12) || set.name; R.save && R.save(); R.hub(); });
    on('[data-lo-del]', b => { const L = list(), i = +b.dataset.loDel, set = L[i]; if (!set || !confirm('刪除套裝「' + set.name + '」？（東西不會不見，只是不記這一組）')) return; L.splice(i, 1); R.save && R.save(); R.hub(); });
    const inp = $('lo-name'); if (inp) inp.onkeydown = e => { if (e.key === 'Enter') { const b = box.querySelector('[data-lo-save]'); if (b && !b.disabled) b.click(); } };
  };
  // 倉庫卡片：標在哪個套裝裡
  const tagCards = body => {
    const s = S(), where = new Map();
    Object.keys(s.loadouts || {}).forEach(c => (s.loadouts[c] || []).forEach(set => Object.values(set.eq || {}).forEach(id => { if (id && !where.has(id)) where.set(id, set.name + (c !== s.cls && R.CLASSES[c] ? '・' + R.CLASSES[c].name : '')); })));
    if (!where.size) return;
    body.querySelectorAll('[data-sell]').forEach(b => {
      const nm = where.get(b.dataset.sell), card = b.closest('.item, .card, .it, div'); if (!nm || !card || card.querySelector('.lo-tag')) return;
      const t = document.createElement('small'); t.className = 'lo-tag'; t.style.cssText = 'display:block;color:#7FC8FF;font-size:11px'; t.textContent = '套裝：' + nm; b.parentNode.insertBefore(t, b);
    });
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    const r = hub0(t, f);
    try {
      const body = $('hub-body'); if (!body || !isStash() || !S()) return r;
      const slots = body.querySelector('.slots'); if (!slots || body.querySelector('.lo-box')) return r;
      const box = document.createElement('div'); box.className = 'lo-box'; box.innerHTML = html(); slots.parentNode.insertBefore(box, slots.nextSibling); bind(box);
      tagCards(body);
    } catch (e) { console.warn('[loadout]', e); }
    return r;
  };
  const css = document.createElement('style');
  css.textContent = '.lo-box{margin:10px 0 4px}.lo-row small{display:block;line-height:1.5}.lo-btns{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.lo-add{display:flex;gap:8px;align-items:center;margin-top:6px}';
  document.head.appendChild(css);
  R.loadouts = { list, wear, snap };   // 測試用
})(window.R);
