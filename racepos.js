// 種族技能在快捷欄的位置（2026-10-08 作者：種族技能可以移動到 6 個技能格的最左邊或最右邊）
// - 「按鍵設定」最下面多一列：種族技能的位置——中間（原本，第二格後面）／最左邊／最右邊。
// - 存在這台電腦（localStorage，跟按鍵設定一樣），每個存檔都一樣。手機的按鈕排法不變。
// 放在 racial.js、keybinds.js、hud3.js 後面。
(function (R) {
  const KEY = 'ruins1433-racepos', $ = id => document.getElementById(id);
  const get = () => { try { return localStorage.getItem(KEY) || 'mid'; } catch (e) { return 'mid'; } };
  const apply = v => { document.body.dataset.racePos = v; };
  const set = v => { try { localStorage.setItem(KEY, v); } catch (e) { } apply(v); };
  apply(get());
  const css = document.createElement('style');
  // 藥水 order 1、2；技能 3（第一格）、4（第二格）、5（其他）；翻滾 6。同一個 order 照擺進去的先後，種族技能最後才加。
  css.textContent = 'body:not(.touch)[data-race-pos="left"] #r-br [data-h2="race"]{order:2!important}body:not(.touch)[data-race-pos="right"] #r-br [data-h2="race"]{order:5!important}'
    + '.rp-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px;padding-top:8px;border-top:1px dashed var(--line)}.rp-row span{margin-right:4px}';
  document.head.appendChild(css);
  const ks0 = R.keySheet;
  if (ks0) R.keySheet = (...a) => {
    const r = ks0(...a);
    try {
      const keys = document.querySelector('#r-sheet .keys'); if (!keys) return r;
      const v = get(), row = document.createElement('div'); row.className = 'rp-row';
      row.innerHTML = '<span>種族技能的位置</span>' + [['mid', '中間'], ['left', '最左邊'], ['right', '最右邊']].map(([k, n]) => '<button type="button" class="btn mini' + (v === k ? ' pri' : '') + '" data-rp="' + k + '">' + n + '</button>').join('');
      keys.after(row);
      row.querySelectorAll('[data-rp]').forEach(b => { b.onclick = e => { e.stopPropagation(); set(b.dataset.rp); row.querySelectorAll('[data-rp]').forEach(x => x.classList.toggle('pri', x === b)); }; });
    } catch (e) { }
    return r;
  };
  R.racePos = { get, set };
})(window.R);
