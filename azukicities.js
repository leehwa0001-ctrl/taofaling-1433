// 討伐令 1433：昭旭重要城市據點（作者規劃 PDF《昭旭重要城市》）
// - 東鶴＝可走的主城；奉主＝hosu.js 的 3D 城；其餘十一城（皇嶺、吉山、府廳、西見、南瀧、渦旗、征遠、板北、板南、古森、岳北）
//   從東鶴站售票口搭魔導電車／渡輪前往，進「城市據點」畫面（選單式：設施、觀光章、招牌活動、分館委託）。
// - 每一城至少：公會分館（地方小委託）、數個設施對話、觀光章、一個招牌活動（吃、賭、訓練、植樹……）。
// - 拉長遊戲時長：城際旅行扣費拉＋推進日子、跨城觀光章稱號、每日分館委託、城邊中階遺跡（data.js）。
// - 放在 hosu.js／hosubranch.js 後面（再包一次售票口，把全國目的地併進選單）。
(function (R) {
  const W = R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const dan = () => (S() && S().rank && S().rank.dan) || 0;

  // ---------- 城市資料 ----------
  // fare＝單程費拉；days＝單程推進的日子；needDan＝最低段（0 新人）；island＝北州／納瓦（渡輪）
  const CITIES = [
    {
      id: 'huangling', name: '皇嶺', role: '首都', tag: '觀光・政治中心', fare: 90, days: 1, needDan: 0,
      blurb: '山嶺都城。象徵意義比實際價值更濃——昭皇居所、古蹟與向日塔。現代化之後仍偏觀光與政治中心。',
      guild: '公會昭旭分館',
      fac: [
        ['guild', '公會昭旭分館', '綠旗石樓比東鶴的更大一圈。館員說：「首都分館的委託，多半是護送與典禮警備。」'],
        ['bank', '世界央行昭旭分館', '石柱大廳。費拉的母行之一；櫃檯後面掛著昭旭與大聯合國的旗。'],
        ['uni', '昭皇大學・魔力學院分院', '校園在山腰。魔力學院的玻璃溫室晚上會自己發光。'],
        ['castle', '皇城（外苑）', '一般人只能到外苑。衛兵看了你的勇者證：「今天沒有覲見。」'],
        ['tower', '向日塔', '塔頂對準日出。觀光客排隊買票登塔。'],
        ['shrine', '山城神社', '參道很陡。木札上寫著「願旅途平安」。'],
        ['airport', '山嶺國際機場（展望台）', '魔導飛機起降。展望台賣冷飲。'],
        ['park', '山嶺遊樂場', '旋轉木馬和小型摩天輪。小孩比勇者多。']
      ],
      sights: [
        ['hl_tower', '向日塔', '塔頂', '登到最上層時，整座皇嶺與遠方的天宮島海岸線一覽無遺。'],
        ['hl_castle', '皇城外苑', '皇城', '石垣上的紋章磨得很亮。導覽說戰後重修過三次。'],
        ['hl_uni', '昭皇大學正門', '大學', '門柱刻著「昭光不滅」。學生騎腳踏車穿過正門。'],
        ['hl_shrine', '山城神社', '山城', '鈴繩很沉。搖一下，整座山好像應了一聲。']
      ],
      food: [['皇嶺點心組合', 12, '百貨地下的和菓子', { mp: 0.06 }], ['向日塔咖啡', 8, '塔下喫茶', { skillCd: 0.04 }]],
      act: { id: 'climb', name: '登向日塔（觀光）', cost: 15, desc: '買票登塔。天氣好的日子，看得到北州的雪線。', do: 'tower' }
    },
    {
      id: 'jishan', name: '吉山', role: '陪都', tag: '工業・賽博和式', fare: 70, days: 1, needDan: 0,
      blurb: '奉主淪陷後的人口第一大都、第一大工業城。德克斯凡入股後第一個開發的城市——賽博霓虹底下仍是和式町屋。',
      guild: '公會吉山分館',
      fac: [
        ['guild', '公會吉山分館', '夾在兩棟玻璃大樓中間。門口的告示寫滿工廠區的委託。'],
        ['bank', '世界央行吉山分館', '股票開盤時間人最多。'],
        ['factory', '重工廠展望廊', '高爐的熱氣隔著玻璃都感覺得到。'],
        ['tech', '朝日科技展示廳', '外骨骼試穿要預約。魔導具櫃檯排到門外。'],
        ['mine', '礦場吊橋', '原材料從這裡送進市區。吊橋晚上會亮藍燈。'],
        ['casino', '地下賭場（傳聞入口）', '後巷的鐵門。門衛看勇者證：「會員制。今天的籌碼換現金。」'],
        ['rent', '租車・魔導懸浮車行', '懸浮車要特別駕照。租普通魔導車一天 40 費拉。']
      ],
      sights: [
        ['js_neon', '霓虹十字路口', '商務區', '和式屋簷掛滿賽博招牌。德克斯凡的廣告機器人會跟你鞠躬。'],
        ['js_furnace', '高爐夜景', '工業區', '整片天空被燒成橘色。工人說這才是吉山的月亮。'],
        ['js_stock', '股票交易所大廳', '金融區', '開盤鈴一響，整層樓像遺跡反應一樣吵。']
      ],
      food: [['機械町拉麵', 10, '工廠下班人潮', { hp: 0.05, dmg: 0.03 }], ['能量罐（德克斯凡）', 7, '自動販賣機', { mp: 0.05 }]],
      act: { id: 'casino', name: '地下賭場・小賭一場', cost: 20, desc: '籌碼換現金。贏了高興，輸了當買教訓。', do: 'gamble' }
    },
    {
      id: 'futing', name: '府廳', role: '軍事城市', tag: '軍營・訓練', fare: 55, days: 1, needDan: 1,
      blurb: '昭旭軍事重鎮。多數區域不開放一般民眾；因遺跡蹤跡，公會獲有限定駐紮。',
      guild: '公會府廳特劃區',
      fac: [
        ['guild', '分會特劃區', '鐵絲網內的臨時舘舍。衛兵比館員多。'],
        ['camp', '軍營（參觀通道）', '只能走畫好的黃線。新兵在操場喊號。'],
        ['hq', '軍部正面', '門禁森嚴。你的勇者證只能換一張「暫時通行證」。'],
        ['park', '戰爭公園', '舊火砲與紀念碑。解說牌寫第二次大陸會戰。'],
        ['house', '小住宅區', '軍眷宿舍。晾衣繩上飄著制服。'],
        ['shrine', '軍神社', '供著陣亡者的牌子。香灰很厚。']
      ],
      sights: [
        ['ft_park', '戰爭公園紀念碑', '公園', '碑文很短：「記得回來的人，也記得沒回來的人。」'],
        ['ft_shrine', '軍神社', '神社', '鈴繩旁放著一排舊頭盔。']
      ],
      food: [['軍糧便當', 6, '特劃區食堂', { hp: 0.04, regen: 0.15 }], ['黑咖啡（軍部販賣部）', 4, '苦到說話變少', { skillCd: 0.05 }]],
      act: { id: 'drill', name: '戰爭公園・體能課', cost: 10, desc: '跟新兵一起跑圈。今天遺跡裡移動與傷害稍好。', do: 'drill' }
    },
    {
      id: 'xijian', name: '西見', role: '港都', tag: '港口・海洋大學', fare: 65, days: 1, needDan: 0,
      blurb: '曾是殖民地生意第一港；第二次大陸會戰遭轟炸封鎖後，改為對外貿易港。',
      guild: '公會西見分館',
      fac: [
        ['guild', '公會西見分館', '靠碼頭的石樓。潮汐表貼在門口。'],
        ['uni', '西見海洋大學', '附設魔力學院分院與水下訓練營。學生穿潛水衣走過中庭。'],
        ['port', '西見港', '貨櫃與漁船並排。汽笛一整天下不停。'],
        ['fish', '漁港拍賣場', '清晨最熱鬧。鯖魚箱子堆得比人高。'],
        ['air', '西見遠督機場', '短跑道。飛往南瀧、東鶴的小班機。'],
        ['beach', '海灘公園', '會戰彈坑填平後改的公園。夏天有攤販。'],
        ['consul', '艾美利亞領事館', '圍牆很高。大門掛兩國旗。'],
        ['ship', '造船廠／軍艦停靠處', '民用船台旁邊停著一艘退役巡洋艦。']
      ],
      sights: [
        ['xj_beach', '海灘公園', '海邊', '浪聲蓋過遠處機場的引擎。沙子裡還找得到彈殼改的飾品。'],
        ['xj_uni', '海洋大學・水下訓練營', '大學', '透明水槽裡有人在練閉氣。牌子寫「非學生勿入」。'],
        ['xj_consul', '艾美利亞領事館外', '港區', '衛兵用共通語問你有沒有預約。']
      ],
      food: [['港灣刺身定食', 14, '漁港直送', { hp: 0.06, mp: 0.03 }], ['鹽烤鯖魚', 9, '路邊摊', { hp: 0.05 }]],
      act: { id: 'dive', name: '水下訓練營體驗', cost: 18, desc: '穿上借用的潛水裝。今天魔力回復與魔力上限感覺好一點。', do: 'dive' }
    },
    {
      id: 'nanlong', name: '南瀧', role: '國際港都', tag: '深海港・外貿', fare: 75, days: 1, needDan: 0,
      blurb: '西見沒落後的第二港都（第一為東鶴）。深海港、國際停靠；清晨川湍急、夜晚霧朦朧。',
      guild: '公會南瀧分館',
      fac: [
        ['guild', '公會南瀧分館', '商業區轉角。館員會說三國語言。'],
        ['bank', '世界央行南瀧分館', '外貿匯款窗口最長。'],
        ['uni', '湍遊國際大學', '附設魔力學院與聖教學院。校園面向港口。'],
        ['statue', '卸貨第一雕像', '碼頭工人的銅像。基座刻著三年裝卸紀錄。'],
        ['cargo', '貨輪港', '起重機日夜不停。霧夜要靠燈塔。'],
        ['yard', '造船廠', '民用船殼一排排。電焊火花像夏日祭。'],
        ['mall', '商業區拱廊', '各國商品。德克斯凡罐頭堆成山。'],
        ['consul', '德克斯凡領事館', '玻璃帷幕。門口的魔導門衛會微笑。']
      ],
      sights: [
        ['nl_statue', '卸貨第一雕像', '碼頭', '銅像的肩膀被摸得發亮——據說摸了會找到好工作。'],
        ['nl_fog', '霧夜碼頭', '貨輪港', '霧裡只剩霧笛與腳步聲。川派說這才是南瀧。'],
        ['nl_uni', '湍遊國際大學鐘樓', '大學', '鐘聲混著汽笛。外籍學生在草坪野餐。']
      ],
      food: [['南瀧霧茶', 7, '拱廊茶屋', { mp: 0.07 }], ['碼頭炒麵', 11, '工人最愛', { hp: 0.05, dmg: 0.02 }]],
      act: { id: 'trade', name: '外貿公司臨工', cost: 0, desc: '搬半天貨物。給當日工錢，日子照過。', do: 'trade' }
    },
    {
      id: 'woqi', name: '渦旗', role: '漁港', tag: '漁汛・市集', fare: 85, days: 2, needDan: 0, island: 1,
      blurb: '連接納瓦與天宮的漁港。秋季銀旗魚順渦流海灣下大洋繁衍——漁民出海的時機，也是城名由來。',
      guild: '公會渦旗分館',
      fac: [
        ['guild', '公會渦旗分館', '魚市樓上。整棟都是海的味道。'],
        ['port', '渦旗漁港', '秋季最擠。網與盒子佔滿碼頭。'],
        ['market', '海魚市集', '銀旗魚拍賣聲比汽笛還大聲。'],
        ['hall', '漁業會館', '牆上記著歷年漁獲。法蘭克漁業的牌子很新。'],
        ['sushi', '壽司・渦潮', '師傅只收當天的魚。'],
        ['logi', '物流倉庫', '開發中地區旁邊。半建成的棚架。'],
        ['trade', '華爾納外貿協會', '共通語與昭旭語並用。']
      ],
      sights: [
        ['wq_eddy', '渦流展望台', '海灣', '秋天能看見銀色的魚群畫圓。'],
        ['wq_market', '海魚市集開市', '市集', '第一聲拍賣敲下去，整天都醒著。'],
        ['wq_sushi', '壽司・渦潮的櫃台', '港邊', '師傅把魚刺排成渦旗的形狀。']
      ],
      food: [['銀旗魚握壽司', 16, '季節限定', { hp: 0.07, mp: 0.04 }], ['漁港味噌湯', 5, '會館食堂', { regen: 0.2 }]],
      act: { id: 'auction', name: '海魚市集・幫忙喊價', cost: 0, desc: '幫一天忙。魚販給你小費與一盒鮮魚。', do: 'fish' }
    },
    {
      id: 'zhengyuan', name: '征遠', role: '海軍造船', tag: '造船・軍港', fare: 70, days: 1, needDan: 1,
      blurb: '西北海軍重鎮、國內最大造船場。曾造「武聖號」；會戰後以商用、民用船為主。',
      guild: '公會征遠分館',
      fac: [
        ['guild', '公會征遠分館', '軍港檢查哨旁邊。'],
        ['yard', '造船廠', '船台長度誇張。火花整夜不停。'],
        ['steel', '鋼鐵廠', '原料從港過來，鋼板從這裡出去。'],
        ['museum', '軍艦博物館', '退役艦改的展場。武聖號的模型在正中央。'],
        ['harbor', '大型海港／軍港', '民用與軍用碼頭隔開。'],
        ['train', '海軍訓練所（參觀）', '操艇課的口令傳得很遠。'],
        ['house', '船屋區', '住在水上的人家。木板路會晃。'],
        ['wreck', '舊艦遺址（岸邊）', '半沉的艦體當紀念。公會在附近設了遺跡監看。'],
        ['consul', '英尼爾斯領事館', '製藥公司也在同一條街。']
      ],
      sights: [
        ['zy_museum', '軍艦博物館・武聖號模型', '博物館', '解說員說：「它再次下海那天，整座城放假。」'],
        ['zy_wreck', '舊艦遺址', '岸邊', '浪打進破孔，發出空心的聲音。'],
        ['zy_yard', '造船廠夜景', '船台', '電焊像夏天的祭典煙火。']
      ],
      food: [['船屋海鮮鍋', 13, '船屋區', { hp: 0.06 }], ['鋼鐵廠食堂咖哩', 8, '份量驚人', { hp: 0.05, dmg: 0.03 }]],
      act: { id: 'navy', name: '海軍訓練所體驗操艇', cost: 12, desc: '手臂酸、衣服濕。今天翻滾與體力比較耐用。', do: 'navy' }
    },
    {
      id: 'banbei', name: '板北', role: '橋樑・開放港', tag: '外資・夜生活', fare: 60, days: 1, needDan: 0,
      blurb: '連結天宮與北州。會戰後外國長期駐紮，兩板中較開放也較有限制。',
      guild: '公會板北分館',
      fac: [
        ['guild', '公會板北分館', '渡輪站走路三分鐘。'],
        ['bank', '世界央行板北分館', '外匯窗口有三種語言說明。'],
        ['car', '艾美利亞造車廠', '試駕車道不開放。展示間可以坐進駕駛座。'],
        ['pharma', '英尼爾斯製藥廠', '白袍與消毒水味。'],
        ['air', '板北國際機場', '北州航線的樞紐。'],
        ['ferry', '渡輪港', '開往岳北、古森的夜船。'],
        ['club', '夜店街', '音樂很吵。衛兵偶爾巡邏。'],
        ['red', '紅燈區入口', '牌子寫「未成年人禁止」。你只在外面看一眼。'],
        ['tech', '朝日科技板北所', '和吉山總部連線的實驗樓。'],
        ['hotel', '港灣酒店', '外資蓋的。大廳水晶燈很亮。'],
        ['casino', '地下賭場', '酒店後門傳出來的骰子聲。']
      ],
      sights: [
        ['bb_ferry', '渡輪港夜景', '渡輪港', '北州的燈火在對岸一排。'],
        ['bb_car', '造車廠展示間', '工廠', '艾美利亞的車漆亮得像鏡子。'],
        ['bb_hotel', '港灣酒店大廳', '酒店', '鋼琴師在彈沒聽過的華爾納曲子。']
      ],
      food: [['機場咖哩麵包', 6, '出發前必買', { hp: 0.03, mp: 0.03 }], ['酒店下午茶', 18, '貴但好看', { mp: 0.06 }]],
      act: { id: 'casino2', name: '地下賭場・骰子', cost: 25, desc: '燈光很暗。贏或輸都算體驗。', do: 'gamble' }
    },
    {
      id: 'bannan', name: '板南', role: '觀光', tag: '城・寺・鐵路', fare: 55, days: 1, needDan: 0,
      blurb: '與板北姊妹的觀光城。橫山建築與碉堡曾是北方防禦線。',
      guild: '公會板南分館',
      fac: [
        ['guild', '公會板南分館', '中樞鐵路站前。'],
        ['castle', '板南城', '石垣與天守。觀光票含導覽。'],
        ['road', '通天道', '參道石階很長。兩邊是茶店。'],
        ['temple', '仰天寺', '鐘樓朝北。冬天鐘聲傳得很遠。'],
        ['camp', '舊陸軍營地（外圍）', '封鎖線外可以看碉堡。'],
        ['yokai', '妖物寺', '香火與封印札。住持不喜歡被拍照。'],
        ['air', '板南機場', '國內線。'],
        ['rail', '板南中樞鐵路', '往皇嶺、東鶴、板北。'],
        ['corp', '日下森電器／森川重工', '兩棟辦公樓對望。']
      ],
      sights: [
        ['bn_castle', '板南城天守', '城', '從天守看橫山，碉堡像一排牙齒。'],
        ['bn_temple', '仰天寺大鐘', '寺', '敲一下要香油錢。鐘聲往北州方向飄。'],
        ['bn_yokai', '妖物寺山門', '寺', '札很多。住持說：「不要念出聲音。」']
      ],
      food: [['通天道茶菓子', 9, '茶店', { mp: 0.05 }], ['城下烏龍麵', 10, '車站前', { hp: 0.05 }]],
      act: { id: 'pilgrim', name: '通天道參拜', cost: 5, desc: '走完石階、敲鐘、蓋朱印。理智回一點。', do: 'pilgrim' }
    },
    {
      id: 'gusen', name: '古森', role: '自然', tag: '生態・精靈', fare: 95, days: 2, needDan: 0, island: 1,
      blurb: '北州自然城市。人文與生態調和，可見大古森木與精靈部落。',
      guild: '公會古森分館',
      fac: [
        ['guild', '公會古森分館', '木造。屋頂長了苔蘚。'],
        ['nature', '自然保護協會', '牆上是動物與樹木的海報。'],
        ['plant', '植樹場', '今天種、十年後成林。'],
        ['eco', '生態平衡公司', '測量魔力與水質。'],
        ['elf', '古森精靈部落（會客處）', '外來者只能到會客的木橋。'],
        ['wood', '古森木開發／木造公司', '家具很香。'],
        ['rice', '梯田展望', '水面映著山。'],
        ['tea', '茶廠', '炒茶的味道飄很遠。'],
        ['street', '老街巷', '木格子窗。'],
        ['zoo', '動物園', '小型、重視復育。']
      ],
      sights: [
        ['gs_tree', '大古森木根系步道', '森林', '根像房屋的樑。精靈說樹還在做夢。'],
        ['gs_rice', '梯田黃昏', '梯田', '水光把天空切成一塊一塊。'],
        ['gs_elf', '精靈部落會客橋', '部落', '橋上掛著風鈴。你不會精靈語，但點頭就夠。']
      ],
      food: [['古森茶套餐', 11, '茶廠', { mp: 0.08 }], ['梯田野菜飯', 10, '老街', { hp: 0.05, regen: 0.15 }]],
      act: { id: 'plant', name: '植樹場幫忙', cost: 0, desc: '種一天樹苗。協會給津貼，理智也回一點。', do: 'plant' }
    },
    {
      id: 'yuebei', name: '岳北', role: '美食觀光', tag: '山礦洋・名物', fare: 100, days: 2, needDan: 0, island: 1,
      blurb: '北州美食都城：山、礦、洋一體。翠晶粉條、土鎧大烤肉、藍殼蟹膏拌飯聲名國際。',
      guild: '公會岳北分館',
      fac: [
        ['guild', '公會岳北分館', '食品大樓旁邊。館員都偏胖一點。'],
        ['port', '岳北漁港', '蟹籠堆成牆。'],
        ['hunt', '獵人營地', '進山前登記。'],
        ['mine', '礦山纜車', '觀光與運礦共用。'],
        ['food', '食品大樓', '整棟都是吃的。'],
        ['shop', '老字號店鋪街', '暖簾很舊、味道很新。'],
        ['air', '岳北國際機場', '德克斯凡直航。'],
        ['hotel', '岳北國際酒店', '房間看得到雪山與海。'],
        ['dex', '德克斯凡美食盟會', '評鑑盤子很嚴。'],
        ['tour', '蘭斯－波旁觀光局', '地圖送很多。']
      ],
      sights: [
        ['yb_food', '食品大樓展望餐廳', '食品大樓', '三種名物並排。湯氣像霧。'],
        ['yb_mine', '礦山纜車', '礦山', '吊廂晃過雪線，礦燈在下面一串。'],
        ['yb_port', '漁港清晨', '漁港', '藍殼蟹上岸的聲音像鼓掌。']
      ],
      food: [
        ['翠晶粉條', 15, '名物', { mp: 0.06, skillCd: 0.03 }],
        ['土鎧大烤肉', 18, '名物', { hp: 0.08, dmg: 0.04 }],
        ['藍殼蟹膏拌飯', 16, '名物', { hp: 0.06, mp: 0.05 }]
      ],
      act: { id: 'gourmet', name: '名物三吃挑戰', cost: 40, desc: '一天吃齊三種名物。撐，但遺跡加成很香。', do: 'gourmet' }
    }
  ];
  R.AZUKI_CITIES = CITIES;
  const byId = id => CITIES.find(c => c.id === id);

  // ---------- 存檔 ----------
  const st = () => { const s = S(); if (!s) return null; s.cityHub = s.cityHub || { stamps: {}, visit: {}, questDay: {}, questDone: {} }; return s.cityHub; };
  const allStamps = () => CITIES.reduce((n, c) => n + c.sights.length, 0);
  const stampCount = () => Object.keys((st() || {}).stamps || {}).length;

  R.addTitle && R.addTitle(['azukitsu', '昭旭通', '在昭旭各城蓋滿觀光章', '委託報酬 +3%', { pay: 0.03 }]);
  R.addTitle && R.addTitle(['railhand', '鐵道手', '搭城際電車／渡輪造訪 8 座城市', '移動相關小費拉 −10%（旅費顯示已含）', { }]);

  // ---------- 工具 ----------
  const pay = (n, why) => { const s = S(); if (!s || s.gold < n) { R.toast('錢不夠（要 ' + n + ' 費拉）' + (why ? '：' + why : ''), '#FF9A6A'); return false; } s.gold -= n; return true; };
  const buff = (b) => { const s = S(); s.buff = { kind: 'food', b, until: s.day }; R.save(); };
  const toastOk = (t, c) => { R.sfx && R.sfx('pick'); R.toast(t, c || '#E8C04A'); };

  // ---------- 觀光章 ----------
  const stamp = (city, sg) => {
    const g = st(); if (!g) return;
    const key = city.id + ':' + sg[0], first = !g.stamps[key], n0 = stampCount();
    if (first) { g.stamps[key] = S().day || 1; R.save(); R.sfx && R.sfx('pick'); }
    const n = stampCount(), total = allStamps();
    R.sheet('<p class="kicker">' + esc(city.name) + '・觀光章</p><h2>' + esc(sg[1]) + '</h2><p class="note">' + esc(sg[2]) + '</p><p>' + esc(sg[3]) + '</p>'
      + '<p class="note">' + (first ? '在昭旭觀光手冊上蓋了章。' : '這裡的章已經蓋過了。') + '（全國 ' + n + '／' + total + '）</p>',
      '<div class="row"><button type="button" class="btn pri" id="az-x">好</button><button type="button" class="btn" id="az-book">昭旭觀光手冊</button><button type="button" class="btn" id="az-back">回據點</button></div>');
    $('az-x').onclick = R.closeSheet; $('az-book').onclick = bookAll; $('az-back').onclick = () => hub(city.id);
    if (first && n >= total && n0 < total) {
      S().gold += 2000; R.save(); R.awardTitle && R.awardTitle('azukitsu');
      setTimeout(() => R.banner && R.banner('昭旭觀光章蓋齊了！', '觀光局送來 2000 費拉和稱號「昭旭通」。'), 500);
    }
  };
  const bookAll = () => {
    const g = st() || { stamps: {} };
    R.sheet('<p class="kicker">昭旭觀光局</p><h2>昭旭觀光手冊</h2><p class="note">從東鶴站售票口搭車到各城，在據點蓋章。蓋齊 ' + allStamps() + ' 個：2000 費拉與稱號「昭旭通」。（目前 ' + stampCount() + '）</p>'
      + CITIES.map(c => {
        const got = c.sights.filter(sg => g.stamps[c.id + ':' + sg[0]]).length;
        return '<h3>' + esc(c.name) + '（' + got + '／' + c.sights.length + '）</h3><ul class="sg-list">'
          + c.sights.map(sg => '<li class="' + (g.stamps[c.id + ':' + sg[0]] ? 'ok' : '') + '"><b>' + (g.stamps[c.id + ':' + sg[0]] ? '✓ ' : '・') + esc(sg[1]) + '</b><small>' + esc(sg[2]) + '</small></li>').join('') + '</ul>';
      }).join(''),
      '<div class="row"><button type="button" class="btn pri" id="az-x">關上</button></div>');
    $('az-x').onclick = R.closeSheet;
  };
  R.azukiBook = bookAll;

  // ---------- 招牌活動 ----------
  const doAct = (city) => {
    const a = city.act, s = S(); if (!a || !s) return;
    if (a.cost > 0 && !pay(a.cost, a.name)) return;
    if (a.do === 'gamble') {
      const win = Math.random() < 0.42, gain = win ? (a.cost * 2 + 10) : 0;
      if (win) { s.gold += gain; toastOk('贏了 ' + gain + ' 費拉。', '#7CF0A0'); }
      else toastOk('輸光這筆籌碼。門衛笑了一下。', '#FF9A6A');
      R.save(); hub(city.id); return;
    }
    if (a.do === 'drill') { buff({ dmg: 0.04, hp: 0.03 }); toastOk('體能課結束。今天下遺跡：傷害與生命稍好。'); R.save(); hub(city.id); return; }
    if (a.do === 'dive') { buff({ mp: 0.08, regen: 0.1 }); toastOk('肺還有點緊。今天下遺跡：魔力相關加成。'); R.save(); hub(city.id); return; }
    if (a.do === 'trade') {
      R.advanceDays(1); const payG = 35 + Math.floor(Math.random() * 25); s.gold += payG; R.save();
      R.banner && R.banner(city.name + '・臨工', '搬了一天貨，領到 ' + payG + ' 費拉。'); hub(city.id); return;
    }
    if (a.do === 'fish') {
      R.advanceDays(1); const tip = 28 + Math.floor(Math.random() * 30); s.gold += tip;
      s.mats = s.mats || {}; s.mats.shell = (s.mats.shell || 0) + 2;
      R.save(); R.banner && R.banner('海魚市集', '小費 ' + tip + ' 費拉，還塞了兩枚貝殼。'); hub(city.id); return;
    }
    if (a.do === 'navy') { buff({ hp: 0.03, skillCd: 0.03 }); toastOk('衣服乾了。今天翻滾與冷卻感覺輕一點。'); R.save(); hub(city.id); return; }
    if (a.do === 'pilgrim') {
      if (R.sanAdd) R.sanAdd(12); toastOk('朱印蓋好了。心情平一點（理智回復）。'); R.save(); hub(city.id); return;
    }
    if (a.do === 'plant') {
      R.advanceDays(1); s.gold += 40; if (R.sanAdd) R.sanAdd(8); R.save();
      R.banner && R.banner('植樹場', '種完一排樹苗。協會給 40 費拉。'); hub(city.id); return;
    }
    if (a.do === 'gourmet') {
      buff({ hp: 0.1, mp: 0.08, dmg: 0.05 }); toastOk('三種名物都進肚子了。今天下遺跡加成很豐盛。'); R.save(); hub(city.id); return;
    }
    if (a.do === 'tower') {
      toastOk('塔頂的風把斗篷吹起來。蓋了向日塔的印象。');
      const sg = city.sights.find(x => /向日塔/.test(x[1])); if (sg) stamp(city, sg); else hub(city.id);
      return;
    }
    hub(city.id);
  };

  // ---------- 分館每日委託 ----------
  const QUESTS = [
    ['送信到世界央行窗口', 45, '把密封信送到銀行。'],
    ['陪同觀光客半天', 55, '別讓他們走丟、也別讓他們被扒。'],
    ['協助分館整理委託板', 40, '把過期的告示撕掉、新的釘上去。'],
    ['巡視城邊遺跡監看點', 70, '看一眼魔力濃度計，回來打勾。'],
    ['採購分館食材', 50, '照清單買齊，發票拿回來。']
  ];
  const questSheet = (city) => {
    const g = st(), s = S(), day = s.day || 1;
    if (g.questDone[city.id] === day) {
      R.townTalk(city.guild, ['「今天的地方委託你做過了。明天再來。」', '「遠方的遺跡委託，還是回東鶴或奉主分館看板。」']);
      return;
    }
    if (g.questDay[city.id] !== day) { g.questDay[city.id] = day; g.questPick = g.questPick || {}; g.questPick[city.id] = Math.floor(Math.random() * QUESTS.length); R.save(); }
    const q = QUESTS[g.questPick[city.id] || 0];
    R.sheet('<p class="kicker">' + esc(city.guild) + '</p><h2>今日地方委託</h2><p><b>' + esc(q[0]) + '</b></p><p>' + esc(q[2]) + '</p><p class="note">報酬 ' + q[1] + ' 費拉。一天一城一次。大型遺跡委託請回東鶴／奉主。</p>',
      '<div class="row"><button type="button" class="btn pri" id="az-qok">接下並完成</button><button type="button" class="btn" id="az-back">回據點</button></div>');
    $('az-back').onclick = () => hub(city.id);
    $('az-qok').onclick = () => {
      g.questDone[city.id] = day; s.gold += q[1]; s.rep = (s.rep || 0) + 1;
      if (R.addDeed) R.addDeed(city.name + '：完成地方委託「' + q[0] + '」。');
      R.save(); R.sfx && R.sfx('coin');
      R.banner && R.banner(city.guild, '地方委託完成。+' + q[1] + ' 費拉');
      hub(city.id);
    };
  };

  // ---------- 設施 ----------
  const facSheet = (city, f) => {
    const [id, name, line] = f;
    if (id === 'guild') {
      R.sheet('<p class="kicker">' + esc(city.name) + '</p><h2>' + esc(name) + '</h2><p>' + esc(line) + '</p>',
        '<div class="row"><button type="button" class="btn pri" id="az-q">看今日地方委託</button><button type="button" class="btn" id="az-back">回據點</button></div>');
      $('az-q').onclick = () => questSheet(city); $('az-back').onclick = () => hub(city.id); return;
    }
    R.sheet('<p class="kicker">' + esc(city.name) + '・設施</p><h2>' + esc(name) + '</h2><p>' + esc(line) + '</p><p class="note">' + pick(['門口進進出出的人很多。', '你在登記簿上簽了名。', '衛兵看了一眼勇者證，點點頭。', '風裡有這裡特有的味道。']) + '</p>',
      '<div class="row"><button type="button" class="btn pri" id="az-back">回據點</button></div>');
    $('az-back').onclick = () => hub(city.id);
  };

  // ---------- 吃飯 ----------
  const foodSheet = (city) => {
    const s = S();
    R.sheet('<p class="kicker">' + esc(city.name) + '・食堂</p><h2>地方小吃</h2><p class="note">吃了今天下遺跡有加成（同東鶴餐廳）。費拉 ' + s.gold + '</p><div class="dn-menu">'
      + city.food.map((m, i) => '<button type="button" class="btn" data-azf="' + i + '"' + (s.gold < m[1] ? ' disabled' : '') + '><b>' + esc(m[0]) + '</b>　' + m[1] + ' 費拉<br><small>' + esc(m[2]) + '</small></button>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn" id="az-back">回據點</button></div>');
    $('az-back').onclick = () => hub(city.id);
    document.querySelectorAll('[data-azf]').forEach(b => {
      b.onclick = () => {
        const m = city.food[+b.dataset.azf]; if (!pay(m[1], m[0])) return;
        buff(m[3]); R.sfx && R.sfx('coin'); toastOk('吃了' + m[0] + '。'); hub(city.id);
      };
    });
  };

  // ---------- 據點主畫面 ----------
  const hub = (id) => {
    // 2026-10-08：有精緻 3D 城的城市（citykit.js），「回據點」就是關掉視窗、回到街上
    if (R.inCity3D && R.inCity3D()) { R.closeSheet(); return; }
    const city = byId(id); if (!city) return;
    const g = st(), visited = Object.keys(g.visit || {}).length;
    const ruin = (R.SITES || []).filter(s => s.kind === 'ruin' && Math.hypot((s.x || 0) - ((R.SITES.find(x => x.id === id) || {}).x || 0), (s.z || 0) - ((R.SITES.find(x => x.id === id) || {}).z || 0)) < 0.55);
    R.sheet('<p class="kicker">' + esc(city.role) + '・' + esc(city.tag) + '</p><h2>' + esc(city.name) + '</h2><p>' + esc(city.blurb) + '</p>'
      + '<p class="note">費拉 ' + S().gold + '・已造訪城市 ' + visited + '／' + CITIES.length + '・觀光章 ' + stampCount() + '／' + allStamps() + '</p>'
      + (ruin.length ? '<p class="note">附近遺跡：' + ruin.map(r => esc(r.name) + (r.status === 'lock' ? '（未開放）' : '')).join('、') + '——回東鶴公會或驛站接委託出發。</p>' : '')
      + '<div class="az-grid">'
      + '<button type="button" class="btn pri" data-az="guild">公會分館／地方委託</button>'
      + '<button type="button" class="btn" data-az="fac">城市設施（' + city.fac.length + '）</button>'
      + '<button type="button" class="btn" data-az="sight">觀光章（' + city.sights.length + '）</button>'
      + '<button type="button" class="btn" data-az="food">地方小吃</button>'
      + '<button type="button" class="btn" data-az="act">' + esc(city.act.name) + (city.act.cost ? '（' + city.act.cost + '）' : '') + '</button>'
      + '<button type="button" class="btn" data-az="book">昭旭觀光手冊</button>'
      + '</div>',
      '<div class="row"><button type="button" class="btn pri" id="az-home">回東鶴（' + city.fare + ' 費拉・' + city.days + ' 日）</button><button type="button" class="btn" id="az-other">轉往他城</button><button type="button" class="btn" id="az-x">先留在據點選單外</button></div>');
    document.querySelectorAll('[data-az]').forEach(b => {
      b.onclick = () => {
        const k = b.dataset.az;
        if (k === 'guild') questSheet(city);
        else if (k === 'fac') {
          R.sheet('<p class="kicker">' + esc(city.name) + '</p><h2>城市設施</h2><div class="az-grid">'
            + city.fac.map((f, i) => '<button type="button" class="btn" data-azf2="' + i + '">' + esc(f[1]) + '</button>').join('') + '</div>',
            '<div class="row"><button type="button" class="btn" id="az-back">回據點</button></div>');
          $('az-back').onclick = () => hub(city.id);
          document.querySelectorAll('[data-azf2]').forEach(x => { x.onclick = () => facSheet(city, city.fac[+x.dataset.azf2]); });
        } else if (k === 'sight') {
          R.sheet('<p class="kicker">' + esc(city.name) + '</p><h2>觀光章</h2><div class="az-grid">'
            + city.sights.map((sg, i) => '<button type="button" class="btn" data-azs="' + i + '">' + esc(sg[1]) + '</button>').join('') + '</div>',
            '<div class="row"><button type="button" class="btn" id="az-back">回據點</button></div>');
          $('az-back').onclick = () => hub(city.id);
          document.querySelectorAll('[data-azs]').forEach(x => { x.onclick = () => stamp(city, city.sights[+x.dataset.azs]); });
        } else if (k === 'food') foodSheet(city);
        else if (k === 'act') {
          R.sheet('<p class="kicker">' + esc(city.name) + '</p><h2>' + esc(city.act.name) + '</h2><p>' + esc(city.act.desc) + '</p>',
            '<div class="row"><button type="button" class="btn pri" id="az-goact">參加</button><button type="button" class="btn" id="az-back">回據點</button></div>');
          $('az-back').onclick = () => hub(city.id); $('az-goact').onclick = () => doAct(city);
        } else if (k === 'book') bookAll();
      };
    });
    $('az-x').onclick = R.closeSheet;
    $('az-home').onclick = () => goHome(city);
    $('az-other').onclick = () => ticketSheet(city.id);
  };
  R.cityHub = hub;
  // 給 3D 城用（citykit2.js、city_*.js）：觀光章、設施、小吃、地方委託、招牌活動、造訪紀錄
  R.azuki = { byId, stamp: (id, sid) => { const c = byId(id), sg = c && c.sights.find(x => x[0] === sid); if (sg) stamp(c, sg); }, fac: (id, fid) => { const c = byId(id), f = c && c.fac.find(x => x[0] === fid); if (f) facSheet(c, f); }, food: id => { const c = byId(id); if (c) foodSheet(c); }, quest: id => { const c = byId(id); if (c) questSheet(c); }, act: id => { const c = byId(id); if (c) { R.sheet('<p class="kicker">' + esc(c.name) + '</p><h2>' + esc(c.act.name) + '</h2><p>' + esc(c.act.desc) + '</p>' + (c.act.cost ? '<p class="note">' + c.act.cost + ' 費拉</p>' : ''), '<div class="row"><button type="button" class="btn pri" id="az-goact">參加</button><button type="button" class="btn" id="az-back">算了</button></div>'); $('az-back').onclick = R.closeSheet; $('az-goact').onclick = () => doAct(c); } } };

  // ---------- 旅行 ----------
  const markVisit = (id) => {
    const g = st(); if (!g) return;
    const first = !g.visit[id];
    g.visit[id] = S().day || 1; R.save();
    const n = Object.keys(g.visit).length;
    if (first && n >= 8) R.awardTitle && R.awardTitle('railhand');
  };

  const travelTo = (id, fromId) => {
    const city = byId(id); if (!city) return;
    if (dan() < city.needDan) { R.toast(city.name + '目前只接待冒險段以上的勇者（軍事／軍港管制）。', '#FF9A6A'); return; }
    const s = S(); if (!s) return;
    if (s.gold < city.fare) { R.toast('錢不夠（要 ' + city.fare + ' 費拉）。'); return; }
    // 錢不夠也比照奉主：勇者可先上車——但這裡仍要求付得起，避免白嫖刷日子；與 hosu 不同城際較遠
    R.closeSheet();
    R.fade(() => {
      // 2026-10-08：有精緻 3D 城的（citykit.js），直接進城走路（不先回到東鶴的街上：exitInterior 會晚一點把場景換回東鶴）
      if (R.CK && R.CK.cities && R.CK.cities[id]) {
        s.gold -= city.fare; R.advanceDays(city.days); markVisit(id); R.save();
        R.CK.enter(id);
        const how = city.island ? '渡輪與接駁' : '魔導電車';
        R.banner && R.banner(city.name, '搭' + how + '抵達・' + city.role + (fromId ? '（自' + ((byId(fromId) || {}).name || '') + '）' : ''));
        return;
      }
      if (W.inside && R.exitInterior) R.exitInterior();
      s.gold -= city.fare;
      R.advanceDays(city.days);
      markVisit(id);
      R.save();
      const how = city.island ? '渡輪與接駁' : '魔導電車';
      R.banner && R.banner(city.name, '搭' + how + '抵達・' + city.role + (fromId ? '（自' + ((byId(fromId) || {}).name || '') + '）' : ''));
      setTimeout(() => hub(id), 280);
    });
  };
  R.travelAzuki = travelTo;

  const goHome = (city) => {
    if (!pay(city.fare, '回東鶴')) return;
    R.closeSheet();
    R.fade(() => {
      R.advanceDays(city.days);
      R.save();
      if (W.inside && R.exitInterior) R.exitInterior();
      // 站在東鶴站附近（若在城裡）
      const tw = W.town, P = W.P;
      if (tw && !tw.hosu && P) {
        const it = (tw.inter || []).find(v => /東鶴站/.test(typeof v.label === 'string' ? v.label : ''));
        if (it) { P.x = it.x; P.z = it.z + 1.6; if (R.collide) R.collide(P, 0.42); if (P.h) P.h.g.position.set(P.x, 0, P.z); R.placeCam && R.placeCam(null); }
      }
      R.banner && R.banner('東鶴', '從' + city.name + '回來了');
      R.townHud && R.townHud(true);
    });
  };

  // ---------- 售票口選單 ----------
  const ticketSheet = (fromId) => {
    const s = S(), gold = s ? s.gold : 0;
    R.sheet('<p class="kicker">' + (fromId ? esc((byId(fromId) || {}).name || '') + '・轉乘' : '東鶴站・售票口') + '</p><h2>昭旭城際交通</h2>'
      + '<p>「要去哪一座城？單程含座位。北州、納瓦要換渡輪，日子比較久。」</p><p class="note">費拉 ' + gold + '・段位 ' + esc(R.rankName ? R.rankName() : '') + '</p>'
      + '<div class="az-grid">'
      + (!fromId ? '<button type="button" class="btn pri" id="az-hosu">奉主（3D 城・60 費拉）</button>' : '')
      + CITIES.map(c => {
        const lock = dan() < c.needDan;
        return '<button type="button" class="btn' + (lock ? '' : '') + '" data-azgo="' + c.id + '"' + (lock ? ' title="需要冒險段以上"' : '') + '>'
          + esc(c.name) + '・' + esc(c.role) + '<br><small>' + c.fare + ' 費拉・' + c.days + ' 日' + (c.island ? '・渡輪' : '') + (lock ? '・管制' : '') + '</small></button>';
      }).join('')
      + '</div>',
      '<div class="row">' + (!fromId ? '<button type="button" class="btn" id="az-ruin">到遠方的遺跡</button>' : '') + '<button type="button" class="btn" id="az-x">不搭了</button></div>');
    $('az-x').onclick = R.closeSheet;
    const hs = $('az-hosu'); if (hs) hs.onclick = () => { if (S().gold < 60) { R.toast('錢不夠（要 60 費拉）。'); return; } R.goHosu && R.goHosu(); };
    const rn = $('az-ruin'); if (rn) rn.onclick = () => { R.closeSheet(); if (ticketOrig) ticketOrig(); };
    document.querySelectorAll('[data-azgo]').forEach(b => {
      b.onclick = () => {
        const c = byId(b.dataset.azgo);
        if (c && dan() < c.needDan) { R.toast(c.name + '有軍事管制，冒險段以上才能去。', '#FF9A6A'); return; }
        travelTo(b.dataset.azgo, fromId);
      };
    });
  };
  let ticketOrig = null;
  R.azukiTicket = ticketSheet;

  // 包售票口（hosu 之後再包一次）
  const ih0 = R.interiorHud;
  R.interiorHud = (force, dt) => {
    ih0(force, dt);
    const ins = W.inside; if (!ins || ins.kind !== 'trainst' || ins.azukiHooked) return; ins.azukiHooked = 1;
    const it = ins.inter && ins.inter.find(v => /售票口/.test(v.label)); if (!it) return;
    ticketOrig = it.act;
    it.label = '售票口：昭旭城際（奉主・十一城・遠方遺跡）';
    it.act = () => ticketSheet(null);
  };

  // 城裡選單：觀光手冊
  const tm = R.townMenu;
  if (tm) R.townMenu = (...a) => {
    const r = tm(...a), row = $('r-sheet') && $('r-sheet').querySelector('.row');
    if (row && !row.querySelector('#az-open') && W.town && !W.town.hosu) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'az-open'; b.textContent = '昭旭觀光手冊';
      b.onclick = () => { R.closeSheet(); bookAll(); }; row.appendChild(b);
    }
    return r;
  };

  const css = document.createElement('style');
  css.textContent = '.az-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;margin:8px 0}.az-grid .btn{text-align:left;white-space:normal}';
  document.head.appendChild(css);
})(window.R);
