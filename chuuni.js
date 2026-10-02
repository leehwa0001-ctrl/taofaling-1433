// 討伐令 1433：中二的裝備名字（作者：武器很中二的名字呢？）
// 史詩以上、而且不是固定名字的傳說武器（R.LEGENDS）的裝備，鑑定之後會有自己的名字：
//   史詩：「紅蓮之牙・長劍」
//   傳說：「終焉之刻・長劍「維斯佩拉」」
//   神話：「【星墜】深淵之瞳・長劍「諾克緹絲」」
//   護具、護符：「霜天之誓的皮甲」「蒼穹之詩・護符「奧蕾莉雅」」
// 名字照裝備的編號算出來（同一件永遠同一個名字），不存進存檔。原本的「詞綴的＋階級＋種類」放在 R.plainName。
(function (R) {
  const A = ['漆黑', '深淵', '終焉', '虛空', '紅蓮', '蒼穹', '禁忌', '黃昏', '星墜', '絕對零度', '天譴', '冥府', '輪迴', '斷罪', '混沌', '永劫', '黑曜', '白夜', '鮮血', '雷霆', '霜天', '灰燼', '宵闇', '極光'];
  const B = ['焰', '牙', '翼', '瞳', '鎖', '刻', '詩', '誓', '棘', '月', '咆哮', '鎮魂歌', '啟示', '審判', '契約', '殘響', '裂痕', '王冠'];
  const N = ['諾克緹絲', '維斯佩拉', '艾瑟利昂', '萊茵格爾', '瑟蘭迪爾', '奧蕾莉雅', '格里姆瓦', '黑羽零式', '阿爾凱恩', '蕾格娜', '伊紐里斯', '薩爾瓦托', '芙蕾斯緹娜', '卡斯托爾', '梅蘭荷莉', '亞斯特拉爾', '贊德拉', '奧伯隆希爾', '魯納克羅', '絕影'];
  const T = ['星墜', '神殺', '世界樹', '終末', '零', '天獄', '虛數', '黎明'];
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const name0 = R.itemName;
  R.plainName = name0;
  R.chuuniName = it => {
    if (!it || !it.identified || it.legend || (it.rarity || 0) < 3) return null;
    let h = hash(String(it.id) + ':' + it.base); const take = a => { const v = a[h % a.length]; h = Math.floor(h / a.length) ^ (h << 7 >>> 0); h >>>= 0; return v; };
    const a = take(A), b = take(B), n = take(N), t = take(T), base = R.baseName(it), plus = it.plus ? ' +' + it.plus : '';
    if (it.kind === 'weapon') return it.rarity >= 5 ? '【' + t + '】' + a + '之' + b + '・' + base + '「' + n + '」' + plus : it.rarity >= 4 ? a + '之' + b + '・' + base + '「' + n + '」' + plus : a + '之' + b + '・' + base + plus;
    if (it.kind === 'charm') return a + '之' + b + '・護符' + (it.rarity >= 4 ? '「' + n + '」' : '') + plus;
    return (it.rarity >= 5 ? '【' + t + '】' : '') + a + '之' + b + '的' + base + (it.rarity >= 4 ? '「' + n + '」' : '') + plus;
  };
  R.itemName = it => R.chuuniName(it) || name0(it);
})(window.R);
