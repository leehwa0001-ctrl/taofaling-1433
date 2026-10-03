// 種族細分（2026-10-04 作者給的《智慧種-族細分》《半魔族-族細分》《薩恰族-牧德族-族細分》）
// - 智慧種 38 族種、大約 700 個子族，照 PDF 的名單一個一個加進 R.RACES（races.js 原本就有的同名種族不重複）。
//   族名的邏輯照 PDF：〇〇人族＝人族外貌帶動物特徵；〇〇獸人族＝動物外貌、人族軀體；半〇〇人族＝下半身是大型四足動物（鰭人、翼人、蟲型、節鱗、兩棲各有自己的三種）。
// - 稀有度照族種（人口越少越稀有），同一族種裡外貌越不像人越稀有；每個族種在抽的時候有一個總權重，族裡的子族平分（不會因為獸人族種有 146 個子族就抽不到別的）。
// - 加成：族種給一個底，外貌（人族外貌／獸人／半身）再加一點，每個子族再照自己的特徵（貓、熊、兔、鹿……）多一項。長相照特徵配耳朵、角、尾巴、翅膀、鱗片。
// - 半魔族（UR，藏起來的）：同樣的族種前面加「魔」，帶小角、紅眼睛，加成多一點，但跟魔族一樣被東鶴的人怕（xeno 3）。
// - 半神種・薩恰族、賦神種・牧德族（UR）：各 7 個子族，加成強、不被排擠。
// 混血版只有 races.js 原本的種族有（新的子族太多，不另外做混血）。
// 放在 races.js、names.js、gearplus.js 後面。
(function (R) {
  const FAMS = [["大陸族種",["大陸人族","瑪娜人族","馬爾濟人族","米賽人族"]],["獸人族種",["鴨嘴獸人族","鴨嘴獸獸人族","針鼴人族","針鼴獸人族","袋鼠人族","袋鼠獸人族","袋熊人族","袋熊獸人族","無尾熊人族","無尾熊獸人族","袋獾人族","袋獾獸人族","袋鼬人族","袋鼬獸人族","袋鼯人族","袋鼯獸人族","袋狸人族","袋狸獸人族","負鼠人族","負鼠獸人族","刺蝟人族","刺蝟獸人族","鼩鼴人族","鼩鼴獸人族","土豚人族","土豚獸人族","蹄兔人族","蹄兔獸人族","犬狼人族","犬狼獸人族","狐人族","狐獸人族","貓人族","貓獸人族","獅人族","獅獸人族","虎人族","虎獸人族","豹人族","豹獸人族","山貓人族","山貓獸人族","熊人族","熊獸人族","熊貓人族","熊貓獸人族","鼬貂人族","鼬貂獸人族","水獺人族","水獺獸人族","獾人族","獾獸人族","臭鼬人族","臭鼬獸人族","靈貓人族","靈貓獸人族","獴人族","獴獸人族","馬人族","馬獸人族","半馬人族","犀人族","犀獸人族","半犀人族","貘人族","貘獸人族","半貘人族","豬人族","豬獸人族","河馬人族","河馬獸人族","駱駝人族","駱駝獸人族","半駱駝人族","羊駝人族","羊駝獸人族","半羊駝人族","長頸鹿人族","長頸鹿獸人族","半長頸鹿人族","牛人族","牛獸人族","半牛人族","羊人族","羊獸人族","半羊人族","羚羊人族","羚羊獸人族","半羚羊人族","鹿人族","鹿獸人族","半鹿人族","馴鹿人族","馴鹿獸人族","半馴鹿人族","駝鹿人族","駝鹿獸人族","半駝鹿人族","狐猴人族","狐猴獸人族","懶猴人族","懶猴獸人族","眼鏡猴人族","眼鏡猴獸人族","猴人族","猴獸人族","狒狒人族","狒狒獸人族","長臂猿人族","長臂猿獸人族","猿人族","猿獸人族","兔人族","兔獸人族","鼠兔人族","鼠兔獸人族","鼠人族","鼠獸人族","跳鼠人族","跳鼠獸人族","松鼠人族","松鼠獸人族","河狸人族","河狸獸人族","豪豬人族","豪豬獸人族","豚鼠人族","豚鼠獸人族","毛絲鼠人族","毛絲鼠獸人族","蝠人族","蝠獸人族","犰狳人族","犰狳獸人族","食蟻獸人族","食蟻獸獸人族","樹懶人族","樹懶獸人族","陸龜人族","陸龜獸人族","水龜人族","水龜獸人族","鱉人族","鱉獸人族","喙頭人族","喙頭獸人族"]],["精靈族種",["長耳精靈族","森精靈族","黑暗精靈族","古精靈族","蒼天精靈族"]],["矮人族種",["矮人族","礦矮人族","半矮人族","大骨矮人族","長手矮人族"]],["鰭人族種",["盲鰻鰭人族","盲鰻魚人族","七鰓鰻鰭人族","七鰓鰻魚人族","鯊鰭人族","鯊魚人族","鯊人魚族","錘頭鯊鰭人族","錘頭鯊魚人族","錘頭鯊人魚族","鯨鯊鰭人族","鯨鯊魚人族","鯨鯊人魚族","魟鰭人族","魟魚人族","魟人魚族","銀鮫鰭人族","銀鮫魚人族","銀鮫人魚族","腔棘魚鰭人族","腔棘魚魚人族","腔棘魚人魚族","肺魚鰭人族","肺魚魚人族","肺魚人魚族","鱘鰭人族","鱘魚人族","鱘人魚族","鰻鰭人族","鰻魚人族","鰻人魚族","鯉鰭人族","鯉魚人族","鯉人魚族","鯰鰭人族","鯰魚人族","鯰人魚族","電鰻鰭人族","電鰻魚人族","電鰻人魚族","鮭鰭人族","鮭魚人族","鮭人魚族","鯡鰭人族","鯡魚人族","鯡人魚族","鱈鰭人族","鱈魚人族","鱈人魚族","鱸鰭人族","鱸魚人族","鱸人魚族","鯛鰭人族","鯛魚人族","鯛人魚族","鮪鰭人族","鮪魚人族","鮪人魚族","旗魚鰭人族","旗魚魚人族","旗魚人魚族","飛魚鰭人族","飛魚魚人族","飛魚人魚族","河豚鰭人族","河豚魚人族","河豚人魚族","翻車魚鰭人族","翻車魚魚人族","海馬鰭人族","海馬魚人族","龍魚鰭人族","龍魚魚人族","龍魚人魚族","食人魚鰭人族","食人魚魚人族","食人魚人魚族","比目魚鰭人族","比目魚魚人族","安康魚鰭人族","安康魚魚人族","安康魚人魚族","燈籠魚鰭人族","燈籠魚魚人族","燈籠魚人魚族","彈塗魚鰭人族","彈塗魚魚人族","鬥魚鰭人族","鬥魚魚人族","鳉鰭人族","鳉魚人族","鮋鰭人族","鮋魚人族","鮋人魚族","箱魨鰭人族","箱魨魚人族","海豚鰭人族","海豚魚人族","海豚人魚族","鯨鰭人族","鯨魚人族","鯨人魚族","海豹鰭人族","海豹魚人族","海豹人魚族","海獅鰭人族","海獅魚人族","海獅人魚族","海象鰭人族","海象魚人族","海象人魚族","海牛鰭人族","海牛魚人族","海牛人魚族","海龜鰭人族","海龜魚人族","海蛇鰭人族","海蛇魚人族","海蛇人魚族"]],["翼人族種",["鴕鳥翼人族","鴕鳥鳥人族","鶴鴕翼人族","鶴鴕鳥人族","幾維翼人族","幾維鳥人族","企鵝翼人族","企鵝鳥人族","信天翁翼人族","信天翁鳥人族","信天翁女妖族","鵜鶘翼人族","鵜鶘鳥人族","鵜鶘女妖族","鸕鷀翼人族","鸕鷀鳥人族","鸕鷀女妖族","鷺翼人族","鷺鳥人族","鷺女妖族","鶴翼人族","鶴鳥人族","鶴女妖族","鸛翼人族","鸛鳥人族","鸛女妖族","紅鶴翼人族","紅鶴鳥人族","紅鶴女妖族","鴨翼人族","鴨鳥人族","鵝翼人族","鵝鳥人族","天鵝翼人族","天鵝鳥人族","鷗翼人族","鷗鳥人族","鷗女妖族","雞翼人族","雞鳥人族","雉翼人族","雉鳥人族","雉女妖族","孔雀翼人族","孔雀鳥人族","孔雀女妖族","鷹翼人族","鷹鳥人族","鷹女妖族","隼翼人族","隼鳥人族","隼女妖族","鷲翼人族","鷲鳥人族","鷲女妖族","鴞翼人族","鴞鳥人族","鴞女妖族","鴉翼人族","鴉鳥人族","鴉女妖族","鸚鵡翼人族","鸚鵡鳥人族","鸚鵡女妖族","鳩翼人族","鳩鳥人族","鳩女妖族","燕翼人族","燕鳥人族","燕女妖族","蜂鳥翼人族","蜂鳥鳥人族","啄木翼人族","啄木鳥人族","啄木女妖族","翠鳥翼人族","翠鳥鳥人族","翠鳥女妖族","犀鳥翼人族","犀鳥鳥人族","犀鳥女妖族","巨嘴鳥翼人族","巨嘴鳥鳥人族","巨嘴鳥女妖族","夜鷹翼人族","夜鷹鳥人族","夜鷹女妖族"]],["地精族種",["矮靈族","地精族","靈娃族","布林族","侏儒族"]],["妖精族種",["元素妖精族","仙子靈族","女皇仙子族","米靈族"]],["獸妖族種",["貓妖族","狐妖族","九尾狐族","貓又族","犬牙族","犄妖族","化妖族"]],["妖人族種",["喚源族","噬源人族","妖人族"]],["蟲型族種",["蟻蟲人族","蟻六足蟲族","蟻人蟲族","蜂蟲人族","蜂六足蟲族","蜂人蟲族","胡蜂蟲人族","胡蜂六足蟲族","胡蜂人蟲族","蝶蟲人族","蝶六足蟲族","蛾蟲人族","蛾六足蟲族","甲蟲蟲人族","甲蟲六足蟲族","甲蟲人蟲族","獨角仙蟲人族","獨角仙六足蟲族","獨角仙人蟲族","螳螂蟲人族","螳螂六足蟲族","螳螂人蟲族","直翅蟲人族","直翅六足蟲族","直翅人蟲族","蜻蜓蟲人族","蜻蜓六足蟲族","蟬蟲人族","蟬六足蟲族","蟑螂蟲人族","蟑螂六足蟲族","蠅蟲人族","蠅六足蟲族","竹節蟲蟲人族","竹節蟲六足蟲族","螢蟲人族","螢六足蟲族","椿蟲人族","椿六足蟲族"]],["節肢人族種",["蛛人族","半蛛人族","蠍人族","半蠍人族","鞭蠍人族","半鞭蠍人族","盲蛛人族","蜈蚣人族","半蜈蚣人族","馬陸人族","半馬陸人族","蟹人族","半蟹人族","寄居蟹人族","半寄居蟹人族","龍蝦人族","半龍蝦人族","蝦人族","螳蝦人族","半螳蝦人族","藤壺人族","鼠婦人族","鱟人族","半鱟人族"]],["節鱗族種",["龍鱗人族","龍人族","蛟鱗人族","蛟人族","螭鱗人族","螭人族","半螭人族","飛龍鱗人族","飛龍人族","地龍鱗人族","地龍人族","應龍鱗人族","應龍人族","翼龍鱗人族","翼龍人族","蛇鱗人族","蛇人族","半蛇人族","巴蛇鱗人族","巴蛇人族","羽蛇鱗人族","羽蛇人族","蟒鱗人族","蟒人族","蚺鱗人族","蚺人族","眼鏡蛇鱗人族","眼鏡蛇人族","半眼鏡蛇人族","蝮蝰鱗人族","蝮蝰人族","半蝮蝰人族","游蛇鱗人族","游蛇人族","半游蛇人族","水蛇鱗人族","水蛇人族","半水蛇人族","盲蛇鱗人族","盲蛇人族","半盲蛇人族","獸腳龍鱗人族","獸腳龍人族","長頸龍鱗人族","長頸龍人族","甲龍鱗人族","甲龍人族","角龍鱗人族","角龍人族"]],["巨人族種",["巨人族","獨眼巨人族","巨臂巨人族"]],["繁肢族種",["獨臂人族","四臂人族","雙頭人族","多臂人族","三足人族"]],["兩棲族種",["蜥人族","真蜥人族","鬣蜥人族","真鬣蜥人族","變色龍人族","真變色龍人族","壁虎人族","真壁虎人族","巨蜥人族","真巨蜥人族","角蜥人族","真角蜥人族","鱷人族","真鱷人族","短吻鱷人族","真短吻鱷人族","蛙人族","真蛙人族","蟾人族","真蟾人族","螈人族","真螈人族","蚓螈人族","真蚓螈人族"]],["岩礦族種",["花崗岩人族","玄武岩人族","砂岩人族","石灰岩人族","頁岩人族","大理石人族","黑曜石人族","浮石人族","鐵礦人族","銅礦人族","金礦人族","銀礦人族","錫礦人族","鉛礦人族","煤人族","硫人族"]],["晶體族種",["石英人族","紫晶人族","黃晶人族","煙晶人族","翡翠人族","瑪瑙人族","蛋白石人族","鑽石人族","紅寶人族","藍寶人族","祖母綠人族","螢石人族","方解石人族","石膏人族"]],["血族種",["純血族","源血族","恆血族","敗血族"]],["植根族種",["樹人族","花人族","草薙人族","藤枝人族","葉森人族","結菓人族"]],["流體族種",["熔岩人族","水人族","史萊姆人族","泥人族","油人族"]],["氣流族種",["雲人族","焰人族","風人族","霧人族","煙人族","雷人族"]],["聚合族種",["源人族","元素人族"]],["真菌族種",["蕈人族","菌絲族","黴人族","酵母人族"]],["擬態族種",["幻形人族","擬態人族","變形人族","化形人族","無固形人族"]],["光影族種",["光源人族","暗影人族","鏡人族","幻象人族","隱人族"]],["寰星族種",["隕星人族","散星人族","流星人族","天外礦石人族","主星人族","恆星人族"]],["吸血族種",["吸血人族","噬血人族","吸血獸人族","噬血獸人族","血精靈族","吸血矮人族","噬血矮人族","吸血節肢人族","吸血節鱗人族","吸血蟲人族","吸血妖族","噬血妖族","血妖族","吸血巨人族","噬血巨人族","吸血繁肢人族","噬血繁肢人族","吸血翼人族","噬血翼人族","吸血鰭人族","噬血鰭人族"]],["巨像族種",["岩礦巨人族","巨靈族","水晶巨像族","植巨像人族","多臂巨像人族","巨像獸人族","巨翼人族","淵洋巨海人族"]],["穴甲族種",["結晶蟲人族","岩石蟲人族","礦殼蟲人族","晶洞蟲人族"]],["泳熔族種",["熔蛙人族","熔魚人族","熔螈人族","熔蛇人族"]],["植精族種",["樹精靈族","花精靈族","草精靈族","藤精靈族","葉精靈族","菓精靈族"]],["元素精族種",["木精靈族","水精靈族","風精靈族","火精靈族","土精靈族","息精靈族","凝精靈族","光精靈族","闇精靈族","金精靈族"]],["聚種族種",["源獸人族","源鰭人族","源翼人族","源蟲人族","源植人族","源兩棲人族","源質血族","源矮人族"]],["化形族種",["氣化獸人族","擬態獸人族","流體獸人族","光影獸人族","氣化鰭人族","擬態鰭人族","流體鰭人族","光影鰭人族","氣化翼人族","擬態翼人族","流體翼人族","光影翼人族","氣化蟲人族","擬態蟲人族","流體蟲人族","光影蟲人族","氣化精靈族","擬態精靈族","流體精靈族","光影精靈族"]],["雲翼族種",["大雲翼妖人族","雨雲翼人族","白雲峰翼人族","積雲翼人族","雷雲翼人族","霧翼人族"]],["岩龍族種",["巨岩龍人族","鐵龍人族","金龍人族","銀龍人族","銅龍人族","黑曜龍人族","大理石龍人族","煤龍人族"]],["純潔族種",["純潔人族","純潔獸族","純潔龍族","純潔淵族"]]];
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const pick = (s, a) => a[Math.floor(hash(s) * a.length) % a.length];
  const SK = {
    human: ['#F1C9A5', '#D9A47C', '#A8714D', '#7A4E33'], fair: ['#F4DCC4', '#EBD0B5'], fin: ['#7FB6B0', '#6AA3A8', '#5A9AB8'], fish: ['#5A9AA8', '#4A8A9A', '#6AA8B8'],
    green: ['#7AA05A', '#6A904A'], goblin: ['#8AA858', '#7A9848'], dark: ['#6A5A7A', '#5A4A6A'], rock: ['#7A7268', '#6A645C', '#8A8278'], lava: ['#3A2C2A'],
    water: ['#7AB8E0', '#6AA8D8'], slime: ['#8AD87A', '#7AC86A'], mud: ['#7A6248'], oil: ['#2A2A30'], cloud: ['#E8EEF6', '#D8E2EE'], shade: ['#3E3A4C', '#322E40'],
    light: ['#FFF4D8', '#FFEEC8'], star: ['#3A3A6A', '#2A2A5A'], blood: ['#EDE2DC', '#E2D4CE'], wood: ['#8A6A48', '#7A5C3D'], fungus: ['#E8D8C8', '#D8C8B8'],
    reptile: ['#7A9A5A', '#6A8A4A', '#8A9A6A'], croc: ['#5A6A4A'], frog: ['#7AB85A', '#6AA84A'], bug: ['#C8B898', '#A89878'], shell: ['#C86A4A', '#B85A3A'],
    gold: ['#D8B048'], crystal: ['#B8A8E8', '#A898D8'], holy: ['#F6E8D8', '#F2E2CE']
  };
  const HAIR = { any: ['#2A1E16', '#5A3B24', '#8B5A2B', '#C9A06A', '#1A1A1A'], white: ['#F4F2EE', '#E2E6EE'], grey: ['#6D6A66', '#3E3B38', '#A9A39A'] };

  // ---------- 獸人族種：照動物分類 ----------
  const ANI = [
    [/犬狼/, { ears: 'wolf', tail: 'wolf', hairs: HAIR.grey, b: { guard: 0.08, hp: 0.04 } }],
    [/^狐$/, { ears: 'fox', tail: 'fox', hairs: ['#D2692A', '#E08A3C'], b: { magic: 0.08 } }],
    [/獅/, { ears: 'cat', tail: 'cat', whisk: 1, hairs: ['#C8963A', '#B8862E'], b: { dmg: 0.06 } }],
    [/虎/, { ears: 'cat', tail: 'cat', whisk: 1, hairs: ['#E0782A', '#D86A1E'], b: { melee: 0.08 } }],
    [/豹|山貓|靈貓|^貓$/, { ears: 'cat', tail: 'cat', whisk: 1, hairs: ['#C8A060', '#8A7A6A', '#3A3030'], b: { crit: 0.04, dodge: 0.1 } }],
    [/熊貓/, { ears: 'round', hairs: ['#1A1A1A', '#F2F2F2'], b: { hp: 0.1 } }],
    [/熊|袋熊|無尾熊/, { ears: 'round', hairs: ['#6A4A32', '#8A6A4A', '#9A9A9A'], b: { hp: 0.1, def: 1 } }],
    [/兔|袋鼠|袋鼯/, { ears: 'rabbit', hairs: ['#F2EEE6', '#C8A888', '#8A6A4A'], b: { speed: 0.06, dodge: 0.12 } }],
    [/^鹿|馴鹿|駝鹿/, { ears: 'cat', horns: 'antler', hairs: ['#A87A4A', '#8A6038'], b: { speed: 0.06, dodge: 0.08 } }],
    [/^牛$|^羊$|羚羊/, { ears: 'dog', horns: 'goat', hairs: ['#E8E2D8', '#6A4A32', '#2A2420'], b: { hp: 0.08, def: 1 } }],
    [/馬|貘|駱駝|羊駝|長頸鹿/, { ears: 'cat', hairs: ['#6A4A32', '#C8A878', '#2A2420'], b: { speed: 0.08 } }],
    [/犀|河馬|豬/, { ears: 'round', horns: 'small', hairs: ['#8A8278', '#6A5A50'], b: { hp: 0.1, def: 2 } }],
    [/猿|猴|狒狒/, { tail: 'cat', hairs: ['#6A4A32', '#3A2A20', '#C8A878'], b: { xp: 0.05, dodge: 0.08 } }],
    [/蝠/, { ears: 'cat', wings: 'demon', hairs: ['#2A2028', '#4A3A40'], b: { dodge: 0.1, night: 0.1 } }],
    [/龜|鱉|喙頭/, { scales: 1, bald: 1, b: { def: 3, hp: 0.06, speed: -0.04 } }],
    [/刺蝟|豪豬|針鼴|犰狳/, { ears: 'round', hairs: ['#8A7A6A', '#5A4A3A'], b: { thorns: 0.12, def: 1 } }],
    [/松鼠|跳鼠|鼠|河狸|豚鼠|毛絲鼠/, { ears: 'round', tail: 'fox', hairs: ['#A87A4A', '#C8A888', '#8A8A8A'], b: { dodge: 0.1, luck: 1 } }],
    [/.*/, { ears: 'round', hairs: ['#6A5A4A', '#8A7A6A', '#4A3A2E'], b: { hp: 0.05, regen: 0.2 } }]
  ];
  const aniOf = a => ANI.find(([re]) => re.test(a))[1];

  // ---------- 族種：稀有度（依外貌）、總權重、出身、被排擠的程度、加成、長相 ----------
  // forms：[正規表示式（抓出動物或特徵）, 外貌名, 稀有度, 這一組的總權重, 額外加成, 額外長相]
  const add = (a, b) => { const o = Object.assign({}, a); Object.keys(b || {}).forEach(k => { o[k] = typeof b[k] === 'number' ? Math.round(((o[k] || 0) + b[k]) * 100) / 100 : b[k]; }); return o; };
  const F = {
    大陸族種: { tier: 'N', W: 1.5, xeno: 0, from: '地表各地・大陸族種', skins: SK.human, b: { xp: 0.08 }, look: {}, line: '大陸族種的一支。學什麼都快。' },
    獸人族種: { beast: 1, xeno: 2, from: '地表・獸人族種', skins: SK.human,
      forms: [[/^半(.+)人族$/, '半身', 'SR', 1, { speed: 0.08, hp: 0.1 }, {}], [/^(.+)獸人族$/, '獸人', 'R', 2, { hp: 0.05, melee: 0.05 }, { whisk: 1 }], [/^(.+)人族$/, '人族外貌', 'N', 3, { xp: 0.04 }, {}]] },
    精靈族種: { tier: 'R', W: 1.5, xeno: 1, from: '地表森林・精靈族種', skins: SK.fair, hairs: ['#E9D8A6', '#C9C3B6', '#6B4A2E'], b: { mp: 0.15, skillCd: 0.08 }, look: { ears: 'elf' }, line: '精靈族種：長耳朵，魔力多。',
      per: { 黑暗精靈族: { skins: SK.dark, hairs: HAIR.white, b: { crit: 0.05, night: 0.1 } }, 古精靈族: { b: { mp: 0.1 } }, 蒼天精靈族: { b: { speed: 0.05 }, look: { wings: 'feather' } } } },
    矮人族種: { tier: 'R', W: 1.5, xeno: 1, from: '地下岩域・矮人族種', skins: SK.human, b: { hp: 0.1, def: 2, ore: 0.3 }, look: { beard: 1 }, line: '矮人族種：結實、耐打，掘礦是本行。' },
    鰭人族種: { xeno: 1, from: '淺海・鰭人族種',
      forms: [[/^(.+)人魚族$/, '人魚', 'SR', 1, { regen: 0.4, speed: 0.06, immune: { slow: 1 } }, { fin: 1, tail: 'dragon' }], [/^(.+)魚人族$/, '魚人', 'R', 1.5, { regen: 0.5, hp: 0.06 }, { fin: 1, bald: 1, scales: 1 }], [/^(.+)鰭人族$/, '鰭人', 'N', 2, { regen: 0.3 }, { ears: 'fin' }]],
      skinsBy: f => (f === '鰭人' ? SK.fin : SK.fish) },
    翼人族種: { xeno: 1, from: '空島・翼人族種', skins: SK.human,
      forms: [[/^(.+)女妖族$/, '女妖', 'SR', 1, { speed: 0.1, dodge: 0.2 }, { wings: 'feather' }], [/^(.+)鳥人族$/, '鳥人', 'R', 1.2, { dodge: 0.18, crit: 0.03 }, { wings: 'feather', crest: 1 }], [/^(.+)翼人族$/, '翼人', 'R', 2, { speed: 0.08, dodge: 0.15 }, { wings: 'feather' }]] },
    地精族種: { tier: 'N', W: 1, xeno: 1, from: '地下・地精族種', skins: SK.human, b: { dodge: 0.12, luck: 1 }, look: { ears: 'elf' }, line: '地精族種：個子小、手巧、運氣好。', per: { 布林族: { skins: SK.goblin }, 侏儒族: { look: { beard: 1 } } } },
    妖精族種: { tier: 'SR', W: 1, xeno: 1, from: '森林深處・妖精族種', skins: SK.fair, hairs: ['#F2E8A8', '#E8C8F0', '#A8E8D8'], b: { mp: 0.2, skillCd: 0.1, luck: 1 }, look: { ears: 'elf', wings: 'feather' }, line: '妖精族種：背上一對薄翅，魔力很多。', per: { 女皇仙子族: { tier: 'SSR', b: { mp: 0.1, regen: 0.3 }, look: { halo: 1 } } } },
    獸妖族種: { tier: 'SR', W: 1, xeno: 2, from: '地表平原・獸妖族種', skins: SK.fair, b: { magic: 0.1, calm: 0.1 }, look: { ears: 'fox', tail: 'fox' }, line: '獸妖族種：對魔力質很敏感。',
      per: { 貓妖族: { look: { ears: 'cat', tail: 'cat' }, b: { crit: 0.04 } }, 貓又族: { look: { ears: 'cat', tail: 'cat' }, b: { dodge: 0.15 } }, 九尾狐族: { tier: 'SSR', b: { magic: 0.08, mp: 0.15 } }, 犬牙族: { look: { ears: 'wolf', tail: 'wolf' }, b: { melee: 0.08 } }, 犄妖族: { look: { horns: 'small' }, b: { def: 2 } } } },
    妖人族種: { tier: 'SR', W: 0.8, xeno: 2, from: '地下・妖人族種', skins: SK.dark, hairs: ['#2A2438', '#E6E0F2'], eye: '#B8E0FF', b: { mp: 0.2, calm: 0.12 }, look: { horns: 'small', ears: 'elf' }, line: '妖人族種：眼睛會發光，擅長吸取魔力。' },
    蟲型族種: { xeno: 2, from: '地下巢穴・蟲型族種', skins: SK.bug,
      forms: [[/^(.+)六足蟲族$/, '六足', 'SR', 0.6, { speed: 0.08, hp: 0.08 }, { ears: 'antenna', eyes4: 1 }], [/^(.+)人蟲族$/, '人蟲', 'SR', 0.6, { def: 3, crit: 0.04 }, { ears: 'antenna', eyes4: 1, bald: 1 }], [/^(.+)蟲人族$/, '蟲人', 'R', 1, { dodge: 0.1 }, { ears: 'antenna' }]] },
    節肢人族種: { xeno: 2, from: '地下岩穴・節肢人族種', skins: SK.bug,
      forms: [[/^半(.+)人族$/, '半身', 'SR', 0.5, { speed: 0.06, def: 2 }, { eyes4: 1 }], [/^(.+)人族$/, '節肢', 'SR', 0.8, { crit: 0.06, critMult: 0.15 }, { eyes4: 1 }]], skinsBy: (f, a) => (/蟹|蝦|龍蝦|螳蝦|寄居/.test(a) ? SK.shell : SK.bug) },
    節鱗族種: { xeno: 2, from: '地表山地・節鱗族種', skins: SK.reptile,
      forms: [[/^半(.+)人族$/, '半身', 'SR', 0.6, { speed: 0.06, hp: 0.1 }, { scales: 1, tail: 'dragon' }], [/^(.+)鱗人族$/, '鱗人', 'SR', 1, { def: 3, hp: 0.06 }, { scales: 1 }], [/^(.+)人族$/, '鱗族外貌', 'SSR', 0.6, { def: 4, hp: 0.12, dmg: 0.08 }, { scales: 1, bald: 1, tail: 'dragon' }]],
      animal: a => (/龍|蛟|螭/.test(a) ? { look: { horns: 'dragon', crest: 1 }, b: { dmg: 0.05, immune: { burn: 1 } } } : /蛇|蟒|蚺|蝮蝰/.test(a) ? { b: { crit: 0.04, ignite: 0.05 } } : { b: { def: 1 } }) },
    巨人族種: { tier: 'SR', W: 0.6, xeno: 1, from: '地表高林・巨人族種', skins: ['#C98E66', '#B27B55'], b: { hp: 0.25, dmg: 0.08, speed: -0.06 }, look: { beard: 1 }, line: '巨人族種：又高又壯。', per: { 獨眼巨人族: { b: { crit: 0.05 } }, 巨臂巨人族: { b: { melee: 0.1 } } } },
    繁肢族種: { tier: 'SR', W: 0.6, xeno: 2, from: '地表・繁肢族種', skins: SK.human, b: { dmg: 0.06 }, look: {}, line: '繁肢族種：手腳的數目跟一般人不一樣。', per: { 四臂人族: { b: { crit: 0.05 } }, 多臂人族: { b: { crit: 0.06, dmg: 0.04 } }, 雙頭人族: { b: { mp: 0.15, xp: 0.06 }, look: { eyes4: 1 } }, 三足人族: { b: { speed: 0.08 } }, 獨臂人族: { b: { melee: 0.12 } } } },
    兩棲族種: { xeno: 2, from: '濕地・兩棲族種',
      forms: [[/^真(.+)人族$/, '兩棲外貌', 'SR', 0.8, { regen: 0.4, def: 2, hp: 0.06 }, { scales: 1, bald: 1 }], [/^(.+)人族$/, '人族外貌', 'R', 1.2, { regen: 0.3, immune: { slow: 1 } }, { scales: 1 }]],
      skinsBy: (f, a) => (/鱷/.test(a) ? SK.croc : /蛙|蟾|螈/.test(a) ? SK.frog : SK.reptile) },
    岩礦族種: { tier: 'R', W: 1.2, xeno: 2, from: '地下岩域・岩礦族種', skins: SK.rock, b: { def: 4, hp: 0.06, speed: -0.03 }, look: { rock: 1, bald: 1 }, line: '岩礦族種：石頭、礦石一樣的皮膚。',
      per: { 金礦人族: { skins: SK.gold, b: { luck: 2 } }, 銀礦人族: { skins: ['#C8CED6'], b: { ore: 0.4 } }, 黑曜石人族: { skins: ['#2A2430'], b: { crit: 0.05 } }, 浮石人族: { b: { speed: 0.06 } }, 硫人族: { skins: ['#E8D85A'], b: { ignite: 0.1 } }, 煤人族: { skins: ['#2A2828'], b: { ignite: 0.08 } } } },
    晶體族種: { tier: 'SR', W: 1, xeno: 2, from: '深域結晶・晶體族種', skins: SK.crystal, b: { mp: 0.2, crystal: 0.3 }, look: { gem: 1 }, line: '晶體族種：身上長著晶石，和魔力水晶特別有緣。', per: { 鑽石人族: { tier: 'SSR', skins: ['#E8F2FF'], b: { def: 4, crit: 0.05 } }, 紅寶人族: { skins: ['#D85A6A'], b: { dmg: 0.06 } }, 藍寶人族: { skins: ['#5A7AD8'], b: { magic: 0.08 } }, 祖母綠人族: { skins: ['#4AB87A'], b: { regen: 0.4 } } } },
    血族種: { tier: 'SSR', W: 0.5, xeno: 2, from: '地表荒原・血族種', skins: SK.blood, hairs: ['#1A1418', '#3A1A22'], eye: '#C8323A', b: { vamp: 0.04, critMult: 0.15 }, look: {}, line: '血族種：血液就是魔力的容器。', per: { 純血族: { b: { vamp: 0.02, hp: 0.08 } }, 敗血族: { b: { dmg: 0.1, hp: -0.06 } } } },
    植根族種: { tier: 'R', W: 1, xeno: 1, from: '地表森林・植根族種', skins: SK.wood, hairCol: '#4E7A36', b: { hp: 0.12, regen: 0.5, speed: -0.04 }, look: { leaves: 1 }, line: '植根族種：慢，但很難倒下。', per: { 花人族: { b: { calm: 0.1 } }, 結菓人族: { b: { luck: 2 } } } },
    流體族種: { tier: 'SR', W: 0.8, xeno: 2, from: '地下・流體族種', skins: SK.water, b: { dodge: 0.15, immune: { slow: 1 } }, look: { bald: 1 }, line: '流體族種：身體會流動，很難被打實。',
      per: { 水人族: { skins: SK.water, b: { regen: 0.4 } }, 史萊姆人族: { skins: SK.slime, b: { hp: 0.15 } }, 泥人族: { skins: SK.mud, b: { def: 3 } }, 油人族: { skins: SK.oil, b: { ignite: 0.12 } } } },
    氣流族種: { tier: 'SR', W: 0.8, xeno: 1, from: '地表高山・氣流族種', skins: SK.cloud, b: { speed: 0.08, dodge: 0.15 }, look: { wisp: 1 }, line: '氣流族種：身體像風、像雲一樣輕。', per: { 雷人族: { b: { crit: 0.06 }, look: { flame: 1 } }, 霧人族: { b: { calm: 0.15 } }, 煙人族: { skins: ['#8A8A90'], b: { calm: 0.12 } } } },
    聚合族種: { tier: 'SSR', W: 0.3, xeno: 2, from: '不明・聚合族種', skins: SK.crystal, b: { mp: 0.2, dmg: 0.08, skillCd: 0.1 }, look: { wisp: 1, gem: 1 }, line: '聚合族種：魔力質本身聚成了人形。' },
    真菌族種: { tier: 'R', W: 0.8, xeno: 2, from: '地下濕地・真菌族種', skins: SK.fungus, b: { regen: 0.5, hp: 0.06 }, look: { hood: 1, hoodCol: '#C83A3A' }, line: '真菌族種：頭頂一頂蕈傘，會慢慢長回來。', per: { 菌絲族: { look: { hoodCol: '#E8E0D0' } }, 黴人族: { look: { hoodCol: '#6A8A5A' } }, 酵母人族: { look: { hoodCol: '#E8C878' }, b: { xp: 0.06 } } } },
    擬態族種: { tier: 'SR', W: 0.6, xeno: 2, from: '地表平原・擬態族種', skins: ['#B9A6D6', '#A993C9'], hairs: ['#2B2340', '#E6E0F2'], b: { mp: 0.2, calm: 0.18 }, look: { ears: 'elf', horns: 'small' }, line: '擬態族種：擅長擬態，佩特拉不太注意得到。' },
    光影族種: { tier: 'SSR', W: 0.5, xeno: 2, from: '地下靈魂迴廊・光影族種', skins: SK.shade, eye: '#B8E0FF', b: { dodge: 0.25, back: 0.2, calm: 0.12 }, look: { wisp: 1 }, line: '光影族種：身上飄著光或影子。', per: { 光源人族: { skins: SK.light, look: { halo: 1 }, b: { regen: 0.4 } }, 鏡人族: { b: { thorns: 0.2 } }, 隱人族: { b: { calm: 0.1 } } } },
    寰星族種: { tier: 'SSR', W: 0.4, xeno: 2, from: '天外・寰星族種', skins: SK.star, eye: '#FFE08A', b: { mp: 0.2, magic: 0.1, luck: 2 }, look: { gem: 1, halo: 1 }, line: '寰星族種：從天外落下來的族種，額頭上的晶石像星星。', per: { 恆星人族: { b: { ignite: 0.12 } }, 隕星人族: { b: { def: 3 } } } },
    吸血族種: { tier: 'SSR', W: 0.5, xeno: 2, from: '地表荒原・吸血族種', skins: SK.blood, hairs: ['#1A1418', '#3A1A22', '#D8D4D8'], eye: '#C8323A', b: { vamp: 0.05, critMult: 0.15, night: 0.12 }, look: {}, line: '吸血族種：吸血〇〇族能長期儲血、消耗低；噬血〇〇族存不久，但轉化得快。',
      sub: n => (/噬血/.test(n) ? { b: { dmg: 0.08, vamp: 0.02 } } : { b: { hp: 0.06 } }) },
    巨像族種: { tier: 'SSR', W: 0.4, xeno: 2, from: '地下・巨像族種', skins: SK.rock, b: { hp: 0.3, def: 5, speed: -0.08 }, look: { rock: 1, beard: 1 }, line: '巨像族種：大得像一座雕像。' },
    穴甲族種: { tier: 'SR', W: 0.6, xeno: 2, from: '地下礦脈・穴甲族種', skins: SK.rock, b: { def: 4, ore: 0.5 }, look: { ears: 'antenna', rock: 1, bald: 1 }, line: '穴甲族種：背著礦殼的蟲人，跟礦殼是遠親。' },
    泳熔族種: { tier: 'SR', W: 0.6, xeno: 2, from: '地下溶漿洞・泳熔族種', skins: SK.lava, b: { thorns: 0.15, immune: { burn: 1 }, def: 2 }, look: { cracks: 1, fin: 1, bald: 1 }, line: '泳熔族種：在熔岩裡游泳的族種。' },
    植精族種: { tier: 'SR', W: 0.8, xeno: 1, from: '森林深處・植精族種', skins: SK.green, hairCol: '#5A8A3A', b: { regen: 0.5, mp: 0.15 }, look: { ears: 'elf', leaves: 1 }, line: '植精族種：植物的精靈。' },
    元素精族種: { tier: 'SSR', W: 0.5, xeno: 1, from: '元素界・元素精族種', skins: SK.fair, b: { magic: 0.12, mp: 0.15 }, look: { ears: 'elf', wisp: 1 }, line: '元素精族種：元素的精靈。',
      per: { 火精靈族: { b: { ignite: 0.12, immune: { burn: 1 } }, look: { flame: 1 } }, 水精靈族: { b: { regen: 0.4 } }, 凝精靈族: { b: { immune: { slow: 1 } } }, 光精靈族: { look: { halo: 1 } }, 闇精靈族: { skins: SK.dark, b: { night: 0.12 } }, 金精靈族: { b: { def: 3 } } } },
    聚種族種: { tier: 'SR', W: 0.6, xeno: 2, from: '各地・聚種族種', skins: SK.human, b: { hp: 0.06, mp: 0.06, dmg: 0.05 }, look: { ears: 'elf' }, line: '聚種族種：好幾個族種的特徵聚在一起。' },
    化形族種: { tier: 'SSR', W: 0.5, xeno: 2, from: '不明・化形族種', skins: SK.shade, b: { dodge: 0.2, calm: 0.15, mp: 0.1 }, look: { wisp: 1 }, line: '化形族種：可以化成氣、流體、光影或擬態的形狀。' },
    雲翼族種: { tier: 'SSR', W: 0.4, xeno: 1, from: '空島高空・雲翼族種', skins: SK.cloud, b: { speed: 0.12, dodge: 0.22 }, look: { wings: 'feather', wisp: 1 }, line: '雲翼族種：翅膀像雲一樣。', per: { 雷雲翼人族: { b: { crit: 0.06 } } } },
    岩龍族種: { tier: 'SSR', W: 0.4, xeno: 2, from: '地下礦脈・岩龍族種', skins: SK.rock, b: { def: 5, hp: 0.15, ore: 0.4 }, look: { horns: 'dragon', tail: 'dragon', scales: 1, bald: 1 }, line: '岩龍族種：岩石和金屬的龍人。', per: { 鐵龍人族: { skins: ['#8A8E96'] }, 銀龍人族: { skins: ['#C8CED6'] }, 銅龍人族: { skins: ['#B87A4A'] }, 黑曜龍人族: { skins: ['#2A2430'], b: { crit: 0.05 } } } },
    純潔族種: { tier: 'SSR', W: 0.2, xeno: 1, from: '不明・純潔族種', skins: SK.holy, hairs: HAIR.white, eye: '#8AD8FF', b: { regen: 0.5, calm: 0.15, luck: 2 }, look: { halo: 1, wings: 'feather' }, line: '純潔族種：幾乎沒有人見過。' }
  };
  // ---------- 做出一個子族 ----------
  const existing = new Set(Object.values(R.RACES).map(r => r.name));
  const mk = (famName, name, extra) => {
    const f = F[famName]; if (!f) return null;
    let tier = f.tier, b = Object.assign({}, f.b || {}), look = Object.assign({}, f.look || {}), skins = f.skins || SK.human, hairs = f.hairs || HAIR.any, hairCol = f.hairCol, eye = f.eye, form = '', group = 'all', line = f.line || '', W = f.W;
    if (f.forms) {
      const fm = f.forms.find(([re]) => re.test(name)); if (!fm) return null;
      const a = name.match(fm[0])[1]; form = fm[1]; tier = fm[2]; W = fm[3]; group = form; b = add(b, fm[4]); Object.assign(look, fm[5]);
      if (f.beast) { const an = aniOf(a); b = add(b, form === '獸人' ? Object.fromEntries(Object.entries(an.b).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 1.4 * 100) / 100 : v])) : an.b); ['ears', 'tail', 'horns', 'wings', 'whisk', 'scales', 'bald'].forEach(k => { if (an[k] != null) look[k] = an[k]; }); if (an.hairs) hairs = an.hairs; }
      if (f.animal) { const x = f.animal(a); b = add(b, x.b); Object.assign(look, x.look || {}); }
      if (f.skinsBy) skins = f.skinsBy(form, a);
      line = famName + '・' + form + '：' + (f.beast ? (form === '人族外貌' ? '人族的外貌，帶著' + a + '的特徵。' : form === '獸人' ? a + '的外貌，人族的軀體。' : '上半身是人，下半身是' + a + '的身體。') : form + '的' + a + '。');
    }
    const p = f.per && f.per[name]; if (p) { if (p.tier) tier = p.tier; if (p.b) b = add(b, p.b); if (p.look) Object.assign(look, p.look); if (p.skins) skins = p.skins; if (p.hairs) hairs = p.hairs; }
    if (f.sub) { const x = f.sub(name); if (x.b) b = add(b, x.b); }
    const STR = { 巨人族種: 3, 巨像族種: 3, 岩礦族種: 2, 岩龍族種: 2, 矮人族種: 2, 節鱗族種: 1, 穴甲族種: 1, 精靈族種: -1, 妖精族種: -1, 翼人族種: -1, 雲翼族種: -1 };
    return { str: STR[famName] || 0, name, tier, from: f.from, xeno: f.xeno, skins, hairs: hairCol ? undefined : hairs, hairCol, eye, b, look, line: line || famName + '的一支。', fam: famName, group };
  };
  // ---------- 智慧種 ----------
  const made = [];   // [id, def, famName, group]
  let n = 0;
  FAMS.forEach(([fam, list]) => list.forEach(name => {
    if (existing.has(name)) return;
    const d = mk(fam, name); if (!d) return;
    const id = 'r' + (++n); made.push([id, d, fam, d.group]);
  }));
  // 權重：同一個族種、同一組外貌的子族平分那一組的總權重（races.js 原本的種族各 1）
  const groupW = (fam, group) => { const f = F[fam]; if (!f.forms) return f.W; const fm = f.forms.find(x => x[1] === group); return fm ? fm[3] : 1; };
  const cnt = {}; made.forEach(([, d, fam, g]) => { const k = fam + '|' + g + '|' + d.tier; cnt[k] = (cnt[k] || 0) + 1; });
  made.forEach(([id, d, fam, g]) => { d.w = Math.round(groupW(fam, g) / cnt[fam + '|' + g + '|' + d.tier] * 10000) / 10000; delete d.group; R.RACES[id] = d; });

  // ---------- 半魔族（UR）：同樣的族種，前面加「魔」 ----------
  const HD = [];
  const demonName = s => { s = s.replace(/源/g, '魔'); return s[0] === '魔' ? s : '魔' + s; };
  FAMS.forEach(([fam, list]) => {
    const names = fam === '大陸族種' ? ['半魔人族'] : fam === '精靈族種' ? ['半魔精靈族'] : fam === '矮人族種' ? ['半魔矮人族'] : list.map(demonName);
    names.forEach((hn, i) => {
      const base = fam === '大陸族種' || fam === '精靈族種' || fam === '矮人族種' ? list[0] : list[i];
      const d = mk(fam, base); if (!d) return;
      d.name = hn; d.tier = 'UR'; d.xeno = 3; d.hd = 1; d.eye = '#C8323A'; d.from = '魔界與人界之間・半魔族（' + fam.replace('族種', '魔族種') + '）';
      d.b = add(d.b, { mp: 0.1, dmg: 0.06 }); if (!d.look.horns) d.look = Object.assign({}, d.look, { horns: 'small' });
      d.line = '半魔族：' + d.line + '東鶴的人怕半魔族，跟怕魔族一樣。';
      HD.push(d);
    });
  });
  HD.forEach(d => { d.w = Math.round(1.5 / HD.length * 10000) / 10000; R.RACES['h' + (++n)] = d; });

  // ---------- 半神種・薩恰族、賦神種・牧德族（UR） ----------
  const GOD = [
    ['薩恰人族', {}, { hp: 0.12, dmg: 0.1, regen: 0.4, luck: 2 }], ['薩恰精靈族', { ears: 'elf' }, { mp: 0.2, skillCd: 0.12, luck: 2 }], ['薩恰矮人族', { beard: 1 }, { hp: 0.15, def: 4, ore: 0.4, luck: 2 }],
    ['黃翼鷹族', { wings: 'feather', crest: 1 }, { speed: 0.1, dodge: 0.25, crit: 0.05, luck: 2 }], ['大背翼族', { wings: 'feather' }, { hp: 0.12, speed: 0.08, dodge: 0.2, luck: 2 }],
    ['薩恰地精族', { ears: 'elf' }, { dodge: 0.2, luck: 4 }], ['薩恰妖精族', { ears: 'elf', wings: 'feather' }, { mp: 0.25, skillCd: 0.12, luck: 3 }],
    ['穆德人族', {}, { hp: 0.1, mp: 0.15, xp: 0.1, luck: 2 }], ['穆德精靈族', { ears: 'elf' }, { mp: 0.25, magic: 0.1, luck: 2 }], ['穆德矮人族', { beard: 1 }, { hp: 0.12, def: 3, crystal: 0.3, luck: 2 }],
    ['白翼鷹族', { wings: 'feather', crest: 1 }, { speed: 0.1, dodge: 0.22, calm: 0.15, luck: 2 }], ['小背翼族', { wings: 'feather' }, { speed: 0.08, dodge: 0.2, regen: 0.4, luck: 2 }],
    ['穆德地精族', { ears: 'elf' }, { dodge: 0.18, calm: 0.15, luck: 3 }], ['穆德妖精族', { ears: 'elf', wings: 'feather' }, { mp: 0.25, regen: 0.4, luck: 3 }]
  ];
  GOD.forEach(([name, look, b], i) => {
    const sacha = i < 7;
    R.RACES['g' + (++n)] = { name, tier: 'UR', w: 0.5 / GOD.length, divine: 1, from: sacha ? '半神種・薩恰族' : '賦神種・牧德族', xeno: 1, skins: sacha ? ['#F2D8B8', '#E8C8A0'] : ['#F6EEE6', '#EEE4DA'], hairs: sacha ? ['#E8C04A', '#F2D27A'] : HAIR.white, eye: sacha ? '#E8B83A' : '#8AD8FF',
      b, look: Object.assign({ halo: 1 }, look), line: sacha ? '半神種・薩恰族：身上流著神的血，頭頂一圈金色的光。' : '賦神種・牧德族：被神賦予了力量的族種，頭頂一圈白色的光。' };
  });
  R.RACE_IDS = Object.keys(R.RACES);
  R.RACE_FAMS = FAMS.map(x => x[0]);

  // ---------- 城裡的路人、隊友、對手不要抽到半魔族、半神種（太顯眼） ----------
  const rr0 = R.randomRace;
  if (rr0) R.randomRace = () => { let id = rr0(), k = 0; while (R.RACES[id] && (R.RACES[id].hd || R.RACES[id].divine || R.RACES[id].tier === 'UR') && k++ < 20) id = rr0(); return R.RACES[id] && R.RACES[id].tier !== 'UR' ? id : 'human'; };
})(window.R);
