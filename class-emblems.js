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
  css.textContent = '.class-emblem{display:inline-block;box-sizing:border-box;width:64px;height:64px;flex:0 0 64px;vertical-align:middle;margin:0 9px 3px 0;background:#181820 url("assets/art/class-heraldry-v4.png") no-repeat;background-size:400% 400%;border-radius:4px}.cls-row>.class-emblem{float:left}.reg-group h4>.class-emblem{width:56px;height:56px}';
  document.head.appendChild(css);
  const partyCss = document.createElement('style');
  partyCss.textContent = '.net-roster li{display:flex;align-items:center;gap:8px}.net-roster .class-emblem{width:40px;height:40px;flex:0 0 40px;margin:0}.net-roster li>span:last-child{min-width:0;overflow-wrap:anywhere}#r-party .pm{position:relative}#r-party .np-class{position:absolute;left:3px;top:37px;pointer-events:none}#r-party .np-class .class-emblem{display:block;width:24px;height:24px;margin:0}#r-party .pm:has(.np-class){min-height:65px}#r-party .pm:has(.np-class)>canvas{align-self:start}body.touch #r-party .np-class{top:29px}body.touch #r-party .pm:has(.np-class){min-height:57px}';
  document.head.appendChild(partyCss);
})(window.R);
