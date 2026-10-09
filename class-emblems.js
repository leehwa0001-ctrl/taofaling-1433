// 職業用靜態裝備徽章，技能仍使用各招的獨立插畫。
(function (R) {
  const ids = ['gunner', 'archer', 'warrior', 'mage', 'priest', 'blade', 'knight', 'monk', 'summoner', 'bard', 'arraymage', 'enchanter', 'scroll'];
  R.classEmblemHTML = function (id) {
    const i = ids.indexOf(id);
    if (i < 0) return '';
    const name = String(R.CLASSES[id].name).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return '<span class="class-emblem" role="img" aria-label="' + name + '職業徽章" style="background-position:' + (i % 4 * 100 / 3) + '% ' + (Math.floor(i / 4) * 100 / 3) + '%"></span>';
  };
  const css = document.createElement('style');
  css.textContent = '.class-emblem{display:inline-block;width:52px;height:52px;flex:0 0 52px;vertical-align:middle;margin:0 9px 3px 0;background-image:url(assets/art/class-emblems-v1.png);background-size:400% 400%;background-repeat:no-repeat;border-radius:8px}.cls-row>.class-emblem{float:left}.reg-group h4>.class-emblem{width:44px;height:44px}';
  document.head.appendChild(css);
})(window.R);
