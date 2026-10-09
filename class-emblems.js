// 職業用靜態裝備徽章，技能仍使用各招的獨立插畫。
(function (R) {
  const ids = ['gunner', 'archer', 'warrior', 'mage', 'priest', 'blade', 'knight', 'monk', 'summoner', 'bard', 'arraymage', 'enchanter', 'scroll'];
  // 以裝備輪廓辨識，文字放在圖示外；縮小後仍保留清楚的負空間。
  const motifs = [
    '<path d="M12 20h29v9H27v7h-9v-8h-6zM39 17h9v6h-9"/><path d="M22 39h25v8H35v7h-8v-9h-5z"/>',
    '<path d="M22 11q33 21 0 42M22 11v42M12 32h38m-8-7 8 7-8 7" fill="none" stroke-width="4"/>',
    '<path d="M29 11h6l4 24-7 7-7-7zM21 41h22v5H21zM29 46h6v9h-6zM13 18l7 4v11l-7-4zM51 18l-7 4v11l7-4z"/>',
    '<path d="m32 8 8 9-8 9-8-9zM29 27h6v9h-6zM11 34q10-4 19 3v18q-9-7-19-3zM53 34q-10-4-19 3v18q9-7 19-3z"/>',
    '<path d="M28 10h8v12h12v8H36v14h-8V30H16v-8h12zM15 44l13 5h8l13-5v8l-13 5h-8l-13-5z"/>',
    '<path d="m16 12 7 3 24 33-5 5-27-33zM48 12l-7 3-8 11 5 7 11-13zM25 36l-9 12 5 5 9-12z"/>',
    '<path d="M32 11 49 18v17q-3 13-17 21-14-8-17-21V18z" fill="none" stroke-width="4"/><path d="M29 20h6v23h-6zM22 27h20v5H22z"/>',
    '<path d="M17 30V17h7v13h3V12h7v18h3V15h7v17h3V23h6v16l-12 14H25L13 40V28zM26 47h15v9H26z"/>',
    '<path d="M12 36q10-5 18 2v17q-8-6-18-2zM52 36q-10-5-18 2v17q8-6 18-2zM21 18l4-8 7 6 7-6 4 8-3 12-8 4-8-4z"/>',
    '<path d="M16 12h9v6h-4v18q0 12 11 12t11-12V18h-4v-6h9v24q0 18-16 18T16 36z"/><path d="M26 20v23m6-23v23m6-23v23M22 22h20" fill="none" stroke-width="2"/>',
    '<path d="m32 10 21 37H11z" fill="none" stroke-width="4"/><circle cx="32" cy="10" r="5"/><circle cx="11" cy="47" r="5"/><circle cx="53" cy="47" r="5"/><path d="m32 26 8 14H24z"/>',
    '<circle cx="32" cy="32" r="17" fill="none" stroke-width="4"/><path d="m44 9 7 7-23 25-6-6zM18 35l12 12-4 4-12-12zM13 45l6 6-7 7-6-6z"/>',
    '<path d="M17 12h30v8H25v25h23v8H17zM29 24h20v5H29zM29 34h16v5H29z"/>'
  ];
  R.classEmblemHTML = function (id) {
    const i = ids.indexOf(id);
    if (i < 0) return '';
    const name = String(R.CLASSES[id].name).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const color = R.CLASSES[id].color;
    return '<span class="class-emblem" role="img" aria-label="' + name + '職業徽章" style="--emblem-color:' + color + '"><svg viewBox="0 0 64 64" aria-hidden="true"><g fill="currentColor" stroke="currentColor" stroke-width="0" stroke-linejoin="miter">' + motifs[i] + '</g></svg></span>';
  };
  const css = document.createElement('style');
  css.textContent = '.class-emblem{display:inline-block;box-sizing:border-box;width:52px;height:52px;flex:0 0 52px;vertical-align:middle;margin:0 9px 3px 0;padding:4px;background:#171921;color:#f2e9d7;border:2px solid var(--emblem-color,#9c8b69);border-radius:50%}.class-emblem svg{display:block;width:100%;height:100%}.cls-row>.class-emblem{float:left}.reg-group h4>.class-emblem{width:44px;height:44px}';
  document.head.appendChild(css);
})(window.R);
