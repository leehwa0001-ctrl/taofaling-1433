// 靜態職業紋章；圖集依照 ids 排成四欄，名稱保留在圖示外。
(function (R) {
  const ids = ['gunner', 'archer', 'warrior', 'mage', 'priest', 'blade', 'knight', 'monk', 'summoner', 'bard', 'arraymage', 'enchanter', 'scroll'];
  R.classEmblemHTML = function (id) {
    const i = ids.indexOf(id);
    if (i < 0) return '';
    const name = String(R.CLASSES[id].name).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return '<span class="class-emblem" role="img" aria-label="' + name + '職業徽章" style="background-position:' + (i % 4 * 100 / 3) + '% ' + (Math.floor(i / 4) * 100 / 3) + '%"></span>';
  };
  const css = document.createElement('style');
  css.textContent = '.class-emblem{display:inline-block;box-sizing:border-box;width:64px;height:64px;flex:0 0 64px;vertical-align:middle;margin:0 9px 3px 0;background:#181820 url("assets/art/class-heraldry-v3.png") no-repeat;background-size:400% 400%;border-radius:4px}.cls-row>.class-emblem{float:left}.reg-group h4>.class-emblem{width:56px;height:56px}';
  document.head.appendChild(css);
})(window.R);
