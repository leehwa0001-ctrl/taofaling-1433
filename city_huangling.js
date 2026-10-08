// 皇嶺（首都）的 3D 城（作者的《昭旭重要城市》：對標京都；首都；山嶺都城、碉堡、城堡，昭旭皇室的象徵、昭皇住的地方；
// 現代化了，但更偏觀光城市和政治中心。主要設施：公會昭旭分館、世界央行昭旭分館、昭皇大學（附設魔力學院分院）、昭旭城古蹟、皇城、向日塔；
// 子設施：觀光地、山嶺國際機場、遊樂場、各式山城、神社）。2026-10-08 作者：城市不用太像素化、精緻化，大小約三分之二個東鶴。
// 地圖（北是 -z）：
//   北：皇城（護城河圍著的石垣島，只開放到正門前；外苑是兩邊的松林）
//   中：皇嶺大通（從皇城前一直到車站）；公會昭旭分館、世界央行昭旭分館隔著大通相對；議政院；古寺的五重塔（觀光地）；拱廊商店街
//   東：昭皇大學（紅磚、鐘樓、魔力學院的玻璃溫室）、向日川和兩座拱橋、河岸步道、遊樂場
//   西：昭旭城古蹟（台地上的石垣、殘存的隅櫓、碉堡）、山城神社（千本鳥居的長石階）、町家的老街
//   南：皇嶺站、向日塔；機場的接駁巴士。四周是山，山脊上看得到幾座山城。
// 觀光章照 azukicities.js 的 hl_tower、hl_castle、hl_uni、hl_shrine，加一個 hl_ruin（昭旭城古蹟）。
// 2026-10-08 作者給了「建設中的皇嶺」的概念圖，照完工的樣子改建（citykit6.js）：
//   皇城＝護城河的島（二之丸、本丸的台、御殿、櫓、正門的渡櫓）＋北邊一層一層石垣的城山，最上面是天守「向日殿」和兩座小天守；
//   一般的大樓換成和風高樓（每層一圈瓦的屋簷、白牆、障子窗）；城市外圍一圈高的石牆（櫓、西門、電車和向日川的門）；
//   城外是杉林，西北邊是雪頂的火山（冒煙）；大通、站前、皇城前掛昭旭的旗（紅日、雪山、浪），路燈換成木的燈籠柱。
(function (R) {
  const CK = R.CK, W = R.W, S = () => R.S;
  // 觀光章多一個：昭旭城古蹟
  const AZ = (R.AZUKI_CITIES || []).find(c => c.id === 'huangling');
  if (AZ && !AZ.sights.find(s => s[0] === 'hl_ruin')) AZ.sights.push(['hl_ruin', '昭旭城古蹟', '古蹟', '昭光帝國時代的舊城。石垣只剩西北兩面，隅櫓是唯一沒燒掉的建築。導覽牌說：「舊都的城，守的是山口；新的皇城，守的是人心。」']);
  const az = () => R.azuki;

  CK.define({
    id: 'huangling', name: '皇嶺', seed: 1433, stationName: '皇嶺站',
    land: [[-1000, -980], [1000, -980], [1000, 980], [-1000, 980]],   // 地面一直鋪到山腳（低角度的鏡頭看得到）
    walk: [-180, -165, 180, 165], spawn: [0, 138, Math.PI], camYaw: Math.PI,   // 鏡頭在北邊、看著車站（鏡頭在南邊會卡在車站裡）
    banner: '昭旭的首都・山嶺都城',
    plaza: [0, 130],
    gossip: ['「昭皇今年的巡幸，聽說要從北州回來才辦。」', '「議政院前面又有人在抗議了。」', '「向日塔的展望台，早上第一班人最多。」', '「昭皇大學的溫室晚上會發光，學生都在那邊熬夜。」', '「山城神社的石階有五百三十二級，下雪天會滑。」', '「德克斯凡的資本進來以後，大通的老店一間一間關了。」'],
    guards: [[-7, -101, 0], [7, -101, 0], [-12, 127, Math.PI]],   // 衛兵：皇城的正門前、站前（ckcrime.js）
    patrols: [[[-10.5, -78], [-10.5, 100]], [[10.5, 100], [10.5, -78]], [[-84, 77.4], [-16, 77.4]]],
    firstTip: '第一次來皇嶺：Tab 看地圖。皇城、向日塔、昭皇大學、山城神社、昭旭城古蹟都有觀光章；公會昭旭分館在大通的東邊；回東鶴到南邊的皇嶺站。',
    mapNote: '北邊是皇城，南邊是皇嶺站。',
    ads: ['昭旭鐵道', '皇嶺銘菓・山月', '德克斯凡商會', '昭皇大學', '向日塔', '天宮海運', '白藤堂製藥'],
    vendLines: ['罐裝的焙茶，熱的。', '皇嶺限定的柚子熱飲。', '熱咖啡，罐子上印著向日塔。'],
    carCols: ['#E8E4DC', '#2A2A30', '#6A1E22', '#2E4A6A', '#C8C0B0', '#4A5A4A', '#B8BCC2', '#1A1A1E'],
    build(B) {
      const M = CK.M, g = B.g, P = B.part, BOX = B.box, rr = B.rr, pk = B.pk, rnd = B.rnd;
      // ---------- 道路 ----------
      const X0 = -204, X1 = 140;   // 2026-10-08：西邊的路接到城牆（-204）；向日通從西門出城
      B.road(X0, -92, X1, -82, { sw: 4, name: '北嶺通' });
      B.road(-8, -82, 8, 110, { sw: 5, name: '皇嶺大通', line: 'y' });
      B.road(X0, -22, 98, -14, { sw: 3.5, name: '昭陽通' });
      B.road(-300, 48, X1, 56, { sw: 3.5, name: '向日通' });
      B.road(X0, 110, X1, 118, { sw: 4, name: '站前通' });
      B.road(-98, -82, -90, 110, { sw: 3.5, name: '西堀通' });
      B.road(90, -82, 98, 110, { sw: 3.5, name: '東堀通' });
      // 河岸步道（向日川的西岸）
      B.plaza(144, -200, 150, 200, 'gravel');
      // ---------- 向日川（東邊，南北流） ----------
      B.water([[150, -260], [168, -260], [170, -150], [166, -40], [169, 60], [166, 170], [168, 260], [150, 260], [150, 120], [150, -120]], { level: -1.6, bank: 'ishi', name: '向日川' });
      B.zone([[168, -260], [260, -260], [260, 260], [168, 260], [166, 170], [169, 60], [166, -40], [170, -150]], 'grass', 0.02);
      // 兩座拱橋（走得過去，中間高 1.3 公尺）、一座車道的橋
      B.bridge(148, -62, 172, -56, { rise: 1.3, deck: 0.12, mat: 'woodD', railMat: 'verm', rail: true });
      B.bridge(148, 72, 172, 78, { rise: 1.3, deck: 0.12, mat: 'woodD', railMat: 'verm', rail: true });
      // 東岸：河岸的步道（窄）
      B.plaza(170, -200, 180, 200, 'gravel', { noCurb: true });
      // ---------- 皇城 ----------
      // 護城河（C 字形：南邊正中間是土橋）
      B.water([[-62, -158], [62, -158], [62, -100], [6, -100], [6, -108], [50, -108], [50, -150], [-50, -150], [-50, -108], [-6, -108], [-6, -100], [-62, -100]], { level: -1.4, bank: 'ishi', name: '皇城の濠' });
      B.terrace(-50, -150, 50, -108, 3.6, { wall: 'ishi', top: 'gravel', open: [] });
      B.plaza(-6, -108, 6, -100, 'gran');           // 土橋
      B.plaza(-62, -100, 62, -96, 'gran');           // 皇城前（跟北大路的人行道接起來）
      B.area('皇城', [-62, -160, 62, -100]); B.area('皇城前廣場', [-62, -100, 62, -92]);
      castle(B);
      // 外苑（護城河兩邊的松林）
      [[-180, -165, -66, -96], [66, -165, 140, -96]].forEach((r, i) => {
        B.zone(r, 'gravel', 0.02);
        for (let k = 0; k < 26; k++) { const x = rr(r[0] + 4, r[2] - 4), z = rr(r[1] + 4, r[3] - 5); if (Math.abs(z - (r[1] + r[3]) / 2) < 3) continue; B.tree(x, z, 'pine', rr(0.9, 1.3)); }
        // 步道、石燈籠、長椅
        B.zone([r[0], (r[1] + r[3]) / 2 - 2, r[2], (r[1] + r[3]) / 2 + 2], 'gran', 0.03);
        for (let x = r[0] + 10; x < r[2] - 6; x += 18) { B.lantern(x, (r[1] + r[3]) / 2 - 3.4, 0.9); B.bench(x + 6, (r[1] + r[3]) / 2 + 3.2, Math.PI); }
        B.area(i ? '皇城外苑（東）' : '皇城外苑（西）', r);
        B.walk([[r[0] + 2, (r[1] + r[3]) / 2], [r[2] - 2, (r[1] + r[3]) / 2]], 4);
      });
      B.label('皇城', 0, -132, 1); B.label('外苑', -120, -130); B.label('外苑', 102, -130);

      // ---------- 北大路以南：西（議政院、銀行）、東（公會、百貨） ----------
      // 世界央行昭旭分館：大通西邊，正面朝東
      bank(B, [-40, -74, -14, -52]);
      // 昭旭議政院：三條通北邊，正面朝南；前面是庭
      parliament(B, [-84, -70, -46, -36]);
      B.zone([-84, -34, -46, -26], 'grass', 0.02); for (let x = -80; x <= -50; x += 10) B.tree(x, -30, 'shrub', 1.2);
      // 公會昭旭分館：大通東邊，正面朝西
      guild(B, [16, -74, 42, -50]);
      // 皇嶺百貨：正面朝南（三條通）
      dept(B, [50, -60, 85, -26]);
      B.row('n', -77.5, 44, 85, 14, { style: 'wafu', h: 22 }, 9, 14, () => ({ h: rr(16, 30) }));   // 北大路沿街（和風高樓）
      B.row('w', 13.5, -48, -26, 12, { style: 'wafu', h: 11 }, 7, 10, () => ({ h: rr(9, 13), name: pk(['皇嶺銘菓・山月', '和紙・千代', '茶舖・山霧', '漆器・朱', '扇子・風雅']) }));
      B.row('e', -13.5, -48, -26, 12, { style: 'wafu', h: 18 }, 8, 11, () => ({ h: rr(14, 24) }));
      B.area('皇嶺大通', [-13, -92, 13, 122]); B.area('官廳街', [-86, -78, -13, -25]); B.area('公會・百貨', [13, -78, 86, -25]);
      // ---------- 昭皇大學（東洞院通以東、北大路～五條通） ----------
      university(B, [101.5, -78, 140, 44.5]);
      // ---------- 中段 ----------
      // 西：古寺（昭光寺）和五重塔
      temple(B, [-84, -6, -40, 42]);
      const tofuRow = B.row('e', -13.5, -8, 42, 13, { style: 'machiya', h: 6.4 }, 5.5, 7.5, i => (i === 1 ? { name: '湯豆腐・南山', noren: '#2A3A5A' } : i % 2 ? { name: pk(['甘味處・白玉', '扇子・風雅', '和菓子・山月', '口紅・紅屋']) } : {}));
      { const r = tofuRow[1].r; CK.door(B, -12.3, (r[1] + r[3]) / 2, 'hl_tofu', '走進湯豆腐・南山', '#E8A03A', Math.PI / 2); }
      B.row('n', -10, -38, -27, 12, { style: 'machiya', h: 6.4 }, 5, 6, () => ({}));
      // 東：拱廊商店街（南北，走路的）＋兩邊的店
      arcade(B, [36, -10.5, 50, 44.5]);
      B.row('w', 13.5, -8, 42, 12, { style: 'wafu', h: 26 }, 10, 16, (i) => (i === 0 ? { name: '皇嶺觀光案內所', h: 11 } : { h: rr(20, 36) }));
      B.row('e', 86.5, -8, 42, 14, { style: 'wafu', h: 30 }, 14, 20, () => ({ h: rr(22, 40) }));
      const bookRow = B.row('n', -10, 55, 72, 12, { style: 'wafu', h: 11 }, 7, 10, i => (i === 0 ? { name: '書店・積學堂', h: 11 } : { h: rr(9, 14), name: rnd() < 0.5 ? pk(['喫茶・向日葵', '眼鏡・光', '文具・墨', '花店・浪']) : null }));
      { const r = bookRow[0].r; CK.door(B, (r[0] + r[2]) / 2, -11.2, 'hl_books', '走進書店・積學堂', '#C8B08A', Math.PI); }
      B.area('昭光寺', [-86, -10, -38, 44]); B.area('昭陽商店街（拱廊）', [34, -12, 52, 46]); B.area('昭皇大學', [100, -80, 142, 46]);
      // ---------- 西：昭旭城古蹟、山城神社 ----------
      ruins(B, [-172, -74, -108, -30]);
      shrine(B, [-176, -4, -116, 40]);
      B.area('昭旭城古蹟', [-180, -80, -102, -25]); B.area('山城神社', [-180, -10, -102, 45]);
      // ---------- 南段 ----------
      // 町家的老街（西）
      // 兩條石板巷（東西向，走路的）：町家面對巷子
      B.plaza(-86.5, 74, -13, 80, 'gran'); B.plaza(-86.5, 90.5, -13, 96.5, 'gran');   // 巷子 6 公尺寬（鏡頭從上面斜看，太窄會被屋簷蓋住）
      const shopN = () => ({ name: pk(['料亭・山水', '蕎麥・更科', '漬物・大山', '豆腐・森屋', '酒藏・月影', '甘味・小豆', '扇子・風雅']) });
      B.row('s', 74, -84, -16, 12, { style: 'machiya', h: 6.4 }, 5, 7, i => (i % 3 === 1 ? shopN() : {}));
      B.row('n', 80, -84, -16, 10.5, { style: 'machiya', h: 6.4 }, 5, 7, i => (i % 3 === 0 ? shopN() : {}));
      B.row('n', 96.5, -84, -16, 9, { style: 'machiya', h: 6.4 }, 5, 7, i => (i % 4 === 2 ? shopN() : {}));
      [-70, -50, -30].forEach(x => { B.lantern(x, 74.9, 0.7); B.lantern(x + 8, 91.4, 0.7); });
      B.walk([[-84, 77.4], [-16, 77.4]], 3); B.walk([[-16, 94], [-84, 94]], 2);
      B.area('町家老街', [-86, 59, -13, 106]);
      // 東：飯店、辦公（大通東）、遊樂場
      const innRow = B.row('w', 13.5, 62, 104, 14, { style: 'wafu', h: 32 }, 12, 18, i => (i === 0 ? { h: 14.4, name: '旅館・嶺月', vsign: '旅館', accent: 'verm' } : { h: rr(26, 42) }));
      { const r = innRow[0].r; CK.door(B, r[0] - 1.2, (r[1] + r[3]) / 2, 'hl_inn', '走進旅館・嶺月（住宿）', '#7AC8E8', -Math.PI / 2); }
      B.row('e', 86.5, 62, 104, 12, { style: 'wafu', h: 26 }, 10, 14, () => ({ h: rr(20, 34) }));
      B.row('s', 104, 32, 70, 14, { style: 'wafu', h: 12 }, 8, 12, () => ({ h: rr(10, 15), name: rnd() < 0.6 ? pk(['居酒屋・一獻', '拉麵・山嶺', '烤雞串・鳥平', '咖哩・印度屋']) : null }));
      amusement(B, [101.5, 59.5, 140, 106]);
      B.area('山嶺遊樂場', [100, 58, 142, 108]);
      // 西南：住宅
      B.road(-204, 77, -98, 81, { sw: 0, line: 'none', name: '西坂' });
      B.row('s', 76.6, -178, -104, 12, { style: 'machiya', h: 6.4 }, 6, 8, () => ({}));
      B.row('n', 81.4, -178, -104, 11, { style: 'machiya', h: 6.4 }, 6, 8, () => ({}));
      B.row('s', 105.6, -178, -104, 10, { style: 'machiya', h: 6.4 }, 6, 8, () => ({}));
      B.area('西坂（住宅）', [-180, 58, -102, 106]);
      // ---------- 車站、向日塔 ----------
      station(B, [-50, 145, 50, 165]);
      B.plaza(-55, 121, 55, 145, 'gran');
      tower(B, 74, 134);
      B.row('n', 122, -178, -62, 14, { style: 'wafu', h: 24 }, 10, 16, () => ({ h: rr(18, 32) }));
      B.row('n', 122, 88, 140, 14, { style: 'wafu', h: 28 }, 12, 18, () => ({ h: rr(20, 34) }));
      B.area('皇嶺站', [-56, 120, 56, 165]); B.area('向日塔', [60, 120, 90, 150]);
      B.label('皇嶺站', 0, 152, 1); B.label('向日塔', 74, 134); B.label('昭皇大學', 120, -18); B.label('昭光寺', -62, 18); B.label('山城神社', -146, 18); B.label('昭旭城古蹟', -140, -52); B.label('山嶺遊樂場', 120, 82); B.label('公會昭旭分館', 27, -62); B.label('世界央行', -27, -63); B.label('議政院', -65, -53); B.label('向日川', 158, 0);
      // ---------- 行道樹、路燈、街上的東西 ----------
      for (let z = -74; z <= 104; z += 12) { if (z > -26 && z < -6 || z > 44 && z < 62) continue; [-12, 12].forEach(x => { if (z > -70 && z < -54) return; B.tree(x, z, 'bare', 1.15); }); }
      for (let z = -76; z <= 106; z += 24) { if (z > -26 && z < -8 || z > 44 && z < 60) continue; B.chochin(-8.4, z, Math.PI / 2); B.chochin(8.4, z + 12, -Math.PI / 2); }
      // 昭旭的旗（大通兩邊、站前廣場、皇城前）
      for (let z = -64; z <= 100; z += 24) { if (z > -26 && z < -8 || z > 44 && z < 60) continue; B.nobori(-9.5, z + 6, Math.PI / 2, { h: 8.5, side: 1 }); B.nobori(9.5, z - 6, -Math.PI / 2, { h: 8.5, side: 1 }); }
      [[-48, 142], [-30, 142], [30, 142], [48, 142]].forEach(([x, z]) => B.nobori(x, z, 0, { h: 10, w: 2, bh: 5.2, side: x < 0 ? 1 : -1 }));
      [[-30, -97.6], [30, -97.6]].forEach(([x, z]) => B.nobori(x, z, 0, { h: 10, w: 2, bh: 5.2, side: x < 0 ? -1 : 1 }));
      // 老街、神社前的燈籠柱
      [-78, -58, -38, -22].forEach(x => { B.chochin(x, 74.6, 0); B.chochin(x + 6, 96, Math.PI); });
      [[-90, -78.5], [-40, -78.5], [40, -78.5], [-60, -11.2], [60, -11.2], [-60, 59.2], [60, 59.2], [-120, 121.6], [120, 121.6]].forEach(([x, z]) => B.lamp(x, z, z > 0 && z < 60 ? Math.PI : 0));
      [[-12.4, -36, Math.PI / 2], [12.4, 30, -Math.PI / 2], [-12.4, 88, Math.PI / 2], [30, 124.2, Math.PI], [-40, 124.2, Math.PI]].forEach(([x, z, ry]) => B.vend(x, z, ry));
      B.mailbox(-12.4, 100); B.mailbox(12.6, -36);
      B.busStop(-28, 125.2, Math.PI, '機場接駁巴士');
      B.inter(-28, 123.2, 2.2, '山嶺國際機場的接駁巴士（看看）', () => az().fac('huangling', 'airport'), '#5A8AC8');
      // 電線桿（住宅、老街那邊）
      B.poles([[-101, 60], [-101, 75], [-101, 90], [-101, 105]], { ry: Math.PI / 2 });
      B.poles([[-176, 77.3], [-150, 77.3], [-124, 77.3]], {});
      // ---------- 路人、車 ----------
      [[-10.5, -78, -10.5, 106], [10.5, -78, 10.5, 106], [-176, -80, 138, -80], [-176, -12.5, 96, -12.5], [-176, 46.5, 138, 46.5], [-176, 58, 138, 58], [-176, 120, 138, 120], [-176, -94, 138, -94], [-88.5, -78, -88.5, 106], [88.5, -78, 88.5, 106], [147, -160, 147, 160], [-40, 128, 40, 128]].forEach(([a, b, c, d]) => B.walk([[a, b], [c, d]], Math.max(2, Math.round(Math.hypot(c - a, d - b) / 26))));
      // 左側通行：往北的車道在路的西半邊、往南的在東半邊、往西的在南半邊、往東的在北半邊（三個圈都只左轉）
      B.route([[-4, 50], [-4, -84.5], [-92, -84.5], [-92, 50]], 4);
      B.route([[4, -84.5], [4, 112], [92, 112], [92, -84.5]], 4);
      B.route([[92, 54], [-92, 54], [-92, 112], [92, 112]], 3);
      // 電車（車站南邊，東西向）
      B.rail([[-700, 176], [700, 176]], { col: '#E8E4DC', stripe: '#C8402A', cars: 6, v: 16 });
      // ---------- 說話的人 ----------
      // 可以偷的東西（ckcrime.js）
      B.steal(38.6, 18, '從土產店門口的籃子摸走一盒點心', 'souvenir', () => ({ gift: Math.random() < 0.5 ? 'dorayaki' : 'dango', n: 1 }), { time: 1.2 });
      B.steal(-40, 75.6, '偷拿漬物店門口的醃蘿蔔（換點零錢）', 'pickle', () => ({ gold: 3 + Math.floor(Math.random() * 8) }), { time: 1.0 });
      B.steal(-12.6, 98, '撬開路邊的募款箱', 'charity', () => ({ gold: 8 + Math.floor(Math.random() * 20) }), { time: 2.0, max: 1 });
      B.talker(-3, 126, Math.PI, '剛下車的觀光客', ['「我從東鶴來的。皇嶺的路是棋盤，比東鶴好認多了。」', '「向日塔要排隊嗎？我想看日落。」', '「車站的天花板是玻璃的，好像走進溫室。」']);
      B.talker(18, 124, Math.PI, '計程車司機', ['「去皇城？走大通直直往北，十分鐘。」', '「首都的計程車是黑的，東鶴的是黃的。你看，這就是首都的面子。」', '「下雪天上山城神社的石階會滑。小心點。」']);
      B.talker(4, -97.5, Math.PI, '皇城前的衛兵', ['「外苑可以參觀，正門以內不開放。」', '「今天沒有覲見。勇者證收好。」', '「拍照可以，不要站上石垣。」']);
      B.talker(-60, -98, 0, '外苑的導覽員', ['「皇城是戰後重修的。石垣最下面那幾層，是昭光帝國時代的。」', '「護城河冬天會結薄冰。去年有隻天鵝困在冰上，衛兵拿竿子去救。」', '「北邊的山上，看得到三座山城的影子。以前山嶺就是靠那些城守的。」']);
      B.talker(12.4, -67, -Math.PI / 2, '公會分館的館員', ['「首都分館的委託，多半是護送和典禮的警備。」', '「遺跡的大委託請回東鶴或奉主。這邊是地方小事。」', '「議政院前面最近有人抗議，路過的時候小心。」']);
      B.talker(-12.4, -57, Math.PI / 2, '銀行前的職員', ['「世界央行的昭旭分館。費拉的母行之一。」', '「外幣兌換在二號窗口。德克斯凡的票子最多。」', '「午休時間不換錢喔。」']);
      B.talker(-66, -30, 0, '抗議的人', ['「議會選舉一定要去投票！不投票就不能抱怨！」', '「德克斯凡的資本進來以後，皇嶺的老店一間一間關了。」', '「我們不是反對外國人，是反對把城賣掉。」']);
      B.talker(104, -24, -Math.PI / 2, '大學的學生', ['「魔力學院的溫室晚上會自己發光。我們都在那邊熬夜寫報告。」', '「正門的『昭光不滅』是第一任校長寫的。」', '「考試周圖書館搶不到位子，我都跑去神社的石階讀書。」']);
      B.talker(-104, 24, Math.PI / 2, '神社的巫女', ['「石階有五百三十二級。鳥居是信眾一座一座捐的。」', '「抽個籤吧？大吉的話，綁在左邊的架子上。」', '「下雪的時候，鳥居的朱紅色最好看。」']);
      B.talker(-104, -40, Math.PI / 2, '古蹟的老人', ['「舊城燒掉那年，我爺爺還是小孩。他說火燒了三天。」', '「隅櫓是唯一留下來的。那時候守城的人，一直守到最後。」', '「石垣上長的那棵松，比我還老。」']);
      B.talker(-12.4, 30, Math.PI / 2, '町家的老闆娘', ['「這間店我們家開了一百二十年。屋頂的瓦是祖父換的。」', '「湯豆腐冬天最好。坐進來暖一下吧。」', '「觀光客多是好事，但房租一直漲。」']);
      B.talker(43, 20, 0, '拱廊的店員', ['「昭陽商店街的拱廊下雪也能逛。」', '「皇嶺點心組合？去百貨地下買，那邊最齊。」', '「這條街以前是寺町，現在全是店了。」']);
      B.talker(146, 0, -Math.PI / 2, '河邊的釣客', ['「向日川的水是從山上下來的，冬天冷到手會痛。」', '「拱橋的欄杆是朱漆的，每三年重新漆一次。」', '「早上清晨的時候，河上會起霧。」']);
      B.talker(118, 104, Math.PI, '遊樂場的小孩', ['「摩天輪轉一圈要八分鐘！」', '「旋轉木馬的白馬是我的！」', '「冬天遊樂場人好少，可以一直玩。」']);
      B.talker(70, 121.5, Math.PI, '向日塔的售票員', ['「向日塔的塔頂對著日出的方向。早上第一班最多人。」', '「天氣好的話，看得到天宮島的海岸線。」', '「上去要 15 費拉。」']);
      // ---------- 遠景：四周的山、山城 ----------
      // 城外的田（外圍房子再過去）
      [[-1000, -980, 1000, -380], [-1000, 380, 1000, 980], [-1000, -380, -380, 380], [380, -380, 1000, 380]].forEach(r => B.zone(r, 'grass', 0.01));
      mountains(B);
      outerWalls(B);
      // 城牆內側的一圈和風高樓（走不到；從城裡看出去是一整排天際線，像概念圖那樣密）；路口留空
      const edgeT = () => ({ h: rr(24, 46), step: B.rnd() < 0.5 ? 2 : 3 });
      [[-160, -94], [-80, -24], [-12, 46], [58, 75], [83, 108], [120, 166]].forEach(([a, b]) => B.row('e', -182, a, b, 18, { style: 'wafu', h: 30 }, 12, 18, edgeT));
      [[-160, -66], [-52, 70], [80, 166]].forEach(([a, b]) => B.row('w', 182, a, b, 18, { style: 'wafu', h: 30 }, 12, 18, edgeT));
      // 城外的杉林（城牆外面一圈；河、電車那一條不種）
      const wet = (x, z) => x > 140 && x < 180, rail = (x, z) => Math.abs(z - 176) < 9;
      [[-680, -420, -226, 640], [226, -420, 680, 640], [-226, 218, 226, 640], [-680, -680, 680, -372]].forEach(r => B.forest(r, Math.round((r[2] - r[0]) * (r[3] - r[1]) / 340), { skip: (x, z) => wet(x, z) || rail(x, z) || Math.hypot(x, z) > 700 }));
      // 西北的火山（雪頂，山頂冒煙）
      CK.volcano(B, -1050, -1250, { r: 560, h: 640, snow: 0.56 });
    },
    tick(dt, tw, P) {
      // 飛機（山嶺國際機場）：每一分鐘左右從西南飛向東北
      const pl = tw.plane; if (pl) { pl.t += dt; const k = (pl.t % 70) / 70, x = -900 + k * 1800, z = 600 - k * 1300; pl.g.position.set(x, 180 + k * 120, z); pl.g.rotation.y = Math.atan2(1800, -1300); pl.g.visible = k < 0.98; }
    }
  });


  // ================= 走得進去的店、空間（2026-10-08 作者：皇嶺也要有可以進去的商店或空間；citykit5.js） =================
  // 小吃（跟奉主一樣：吃了當天下遺跡有加成）
  const eatMenu = (title, say, menu) => {
    const s = S();
    R.sheet('<p class="kicker">皇嶺</p><h2>' + R.esc(title) + '</h2><p>' + R.esc(say) + '</p><p class="note">吃了之後，今天下遺跡有加成（一天算最後吃的那一餐）。費拉 ' + s.gold + '</p><div class="dn-menu">'
      + menu.map((m, i) => '<button type="button" class="btn" data-hlf="' + i + '"' + (s.gold < m[1] ? ' disabled' : '') + '><b>' + R.esc(m[0]) + '</b>　' + m[1] + ' 費拉<br><small>' + R.esc(m[2]) + '</small></button>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn pri" id="hlf-x">不吃了</button></div>');
    document.getElementById('hlf-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-hlf]').forEach(b => { b.onclick = () => { const m = menu[+b.dataset.hlf]; if (s.gold < m[1]) return; s.gold -= m[1]; s.buff = { kind: 'food', b: m[3], until: s.day }; R.save(); R.sfx && R.sfx('coin'); R.closeSheet(); R.toast('吃了' + m[0] + '。今天下遺跡有加成。', '#E8C04A'); }; });
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  // 公會昭旭分館
  CK.defineRoom({ id: 'hl_guild', name: '公會昭旭分館', hint: '大廳比東鶴分館高一層樓；委託板貼滿首都的護送和警備', w: 18, d: 14, h: 4.6, floor: 'gran', wall: 'plaster', wain: 'woodD', build(B, K) {
    K.counter(0, -4.4, 9, 0.9, { mat: 'woodB', top: 'wood' }); K.register(-3, -4.4);
    K.wallSign('公會昭旭分館', 'n', 0, 3.4, { size: 0.7, bg: '#2E5A3A', fg: '#F4ECD8' });
    K.board(-6.2, -6.9, 3.2); K.board(6.2, -6.9, 3.2);
    B.inter(0, -3.3, 2.2, '櫃台：今日地方委託', () => R.azuki.quest('huangling'), '#3E9A5A');
    B.inter(-6.2, -5.9, 2, '委託板（看看）', () => R.townTalk('公會昭旭分館・委託板', [pick(['典禮警備：昭皇巡幸當天，皇城前廣場的人群疏導。報酬另議。', '護送：魔力學院的教授要去北州的古森取樣，求兩名同行者。', '急件：議政院的地下室傳出怪聲。勇者證討伐段以上。——下面有人寫「是老鼠」。', '尋人：遊樂場走失的小孩，穿紅色外套。（已找到，請撕掉）'])]));
    B.talker(2.5, -5.4, 0, '分館的館員', ['「首都分館的委託，多半是護送和典禮的警備。」', '「遠方遺跡的大委託，請回東鶴或奉主的分館。」', '「議政院前面最近有人抗議，路過的時候小心。」']);
    B.talker(-2.5, -5.4, 0, '分館的書記', ['「勇者證給我看一下……東鶴登記的？那邊的館長還好嗎？」', '「地方委託一天一件。做完明天再來。」']);
    B.talker(-5.5, 2, Math.PI / 2, '休息的勇者', ['「首都的委託都很無聊。護送、站崗、護送、站崗。」', '「我是為了看向日塔的日出才來皇嶺的。」']);
    K.bench(-6, 0.5, 3, Math.PI / 2); K.bench(6, 0.5, 3, -Math.PI / 2); K.bench(-6, 3.5, 3, Math.PI / 2);
    K.plant(-8.2, 5.8); K.plant(8.2, 5.8); K.plant(-8.2, -5.8); K.plant(8.2, -5.8);
    K.rug(0, 1.5, 4, 8, '#2E5A3A');
    K.lamp(-4, 0); K.lamp(4, 0); K.lamp(0, -3);
  } });
  // 世界中央銀行・昭旭分館
  CK.defineRoom({ id: 'hl_bank', name: '世界中央銀行・昭旭分館', hint: '大理石的大廳，腳步聲很響', w: 20, d: 14, h: 5.6, floor: 'marble', wall: 'plaster', wain: 'ashlar', trim: 'gold', amb: 0.9, build(B, K) {
    K.counter(0, -3.6, 15, 0.8, { mat: 'woodB', top: 'marble', h: 1.1 });
    for (let x = -6; x <= 6; x += 3) { B.box(CK.M('glassL'), x - 1.4, 1.1, -3.65, x + 1.4, 2.3, -3.55); B.box(CK.M('gold'), x - 1.45, 2.3, -3.7, x + 1.45, 2.36, -3.5); }
    [-7.5, -2.5, 2.5, 7.5].forEach(x => { B.part(B.g.cyl24, CK.M('marble'), x, 2.8, 1.5, 0.9, 5.6, 0.9); B.solid(x - 0.45, 1.05, x + 0.45, 1.95, 'deco'); });
    K.wallSign('世界中央銀行', 'n', 0, 3.8, { size: 0.65, bg: '#F2F0EA', fg: '#3A2E20' });
    B.inter(-3, -2.5, 2.2, '存款・借款窗口', () => R.bankSheet ? R.bankSheet() : R.toast('今天窗口休息。'), '#C8A040');
    B.inter(3, -2.5, 2.2, '股票窗口', () => R.stockSheet ? R.stockSheet() : R.toast('今天不開盤。'), '#C8A040');
    B.talker(-3, -4.6, 0, '存款窗口的行員', ['「費拉的母行之一。存款、借款都在這裡。」', '「外幣兌換在二號窗口。德克斯凡的票子最多。」']);
    B.talker(3, -4.6, 0, '股票窗口的行員', ['「開盤的時候這裡吵得跟遺跡一樣。」', '「東鶴冒險用品最近漲了不少。」']);
    B.talker(6, 4, Math.PI, '排隊的商人', ['「匯款到德克斯凡要三天。我等不了三天。」', '「這張票子……被說是假的。我在奉主收的。」']);
    K.bench(-7, 4.5, 3.5, 0); K.bench(0, 4.5, 3.5, 0);
    K.plant(-9, -5.8, 1.2); K.plant(9, -5.8, 1.2);
    K.lamp(-5, 0); K.lamp(5, 0); K.lamp(0, 3);
  } });
  // 皇嶺百貨・地下美食街
  CK.defineRoom({ id: 'hl_dept', name: '皇嶺百貨・地下美食街', hint: '試吃的香味從四面八方飄過來', w: 22, d: 14, h: 4, floor: 'tile', wall: 'plaster', wain: 'woodD', build(B, K) {
    K.showcase(-6, -5, 6, 0); K.showcase(6, -5, 6, 0); K.showcase(-6, 0, 6, 0); K.showcase(6, 0, 6, 0);
    K.wallSign('和菓子', 'n', -6, 2.8, { size: 0.55, bg: '#5A1A2A', fg: '#FFE8B0', lit: 1 }); K.wallSign('洋菓子・麵包', 'n', 6, 2.8, { size: 0.55, bg: '#1A2A4A', fg: '#FFE8B0', lit: 1 });
    B.inter(-6, -4.0, 2.2, '和菓子櫃（皇嶺點心組合）', () => R.azuki.food('huangling'), '#E8A03A');
    B.inter(6, -4.0, 2.2, '洋菓子櫃（試吃、買點心）', () => R.azuki.food('huangling'), '#E8A03A');
    B.inter(-6, 1.0, 2, '試吃（免費）', () => R.toast(pick(['試吃的羊羹。甜得剛好。', '試吃的煎餅，很脆。', '店員又塞了一塊給你。']), '#E8C04A'));
    B.talker(-6, -6.2, 0, '和菓子櫃的店員', ['「皇嶺的點心組合，送禮最受歡迎。」', '「冬天限定的柚子羊羹，今天最後幾條。」']);
    B.talker(6, -6.2, 0, '洋菓子櫃的店員', ['「德克斯凡的師傅做的蛋糕，下午三點出爐。」', '「麵包買三送一。」']);
    B.talker(0, 3.5, Math.PI, '逛街的太太', ['「地下街是皇嶺最好吃的地方。」', '「你也是來買伴手禮的？」']);
    K.shelf(-10.6, 3, 4, Math.PI / 2); K.shelf(10.6, 3, 4, -Math.PI / 2);
    K.lamp(-6, -2.5); K.lamp(6, -2.5); K.lamp(0, 3);
  } });
  // 和菓子・山月（町家）
  CK.defineRoom({ id: 'hl_wagashi', name: '皇嶺點心・山月', hint: '暖簾後面，木頭的展示櫃裡擺著當季的和菓子', w: 10, d: 8, h: 3.2, floor: 'wfloor', wall: 'plaster', wain: 'woodB', build(B, K) {
    K.tatami(-5, -4, 5, -1.6);
    K.showcase(0, 0.2, 5, 0, ['#F4E8E0', '#E8A0B0', '#A8C878', '#8A5A3A', '#F0D080', '#D0A0D8']);
    K.shoji(-2.5, -3.9, 4, 0); K.shoji(2.5, -3.9, 4, 0);
    B.inter(0, 1.3, 2, '買點心吃', () => eatMenu('皇嶺點心・山月', '「今天的生菓子是『雪椿』。」', [['生菓子「雪椿」配抹茶', 10, '白色的練切包著紅豆餡，配一碗熱抹茶', { mp: 0.06, regen: 0.1 }], ['柚子羊羹', 7, '冬天限定，柚子的香味很清楚', { hp: 0.04, mp: 0.03 }], ['烤糰子（三串）', 6, '醬油烤的，甜甜鹹鹹', { hp: 0.05 }]]), '#E8A03A');
    B.talker(0, -1.0, 0, '山月的老闆娘', ['「我們家的和菓子，從昭光帝國的時候做到現在。」', '「生菓子只放得了一天，今天吃掉喔。」', '「下雪的日子，店裡最安靜。」']);
    K.lamp(0, -0.8);
  } });
  // 塔下喫茶「向日」
  CK.defineRoom({ id: 'hl_cafe', name: '塔下喫茶「向日」', hint: '咖啡的香味，留聲機在放舊的曲子', w: 12, d: 9, h: 3.4, floor: 'wfloor', wall: 'brick', wain: 'woodB', build(B, K) {
    K.counter(-2, -3.3, 6, 0.8, { mat: 'woodB', top: 'woodD' });
    K.shelf(-2, -4.2, 6, 0, { h: 2.2, cols: ['#E8E4DC', '#8A5A3A', '#5A3A2A', '#E8C060'] });
    [[2.5, 0], [-3, 1.5], [3.5, 2.8]].forEach(([x, z]) => K.cafeSet(x, z));
    B.inter(-2, -2.3, 2, '點咖啡、點心', () => R.azuki.food('huangling'), '#E8A03A');
    B.talker(-2, -3.85, 0, '喫茶店的老闆', ['「向日塔的日出那班人走了以後，這裡才安靜。」', '「咖啡豆是從西見港進來的。」', '「厚片吐司配咖啡，早上十一點以前加一顆蛋。」']);
    B.talker(-4.5, 1.4, Math.PI / 2, '看報紙的老先生', ['「議會選舉……哪一黨上台都一樣。」', '「我每天坐這個位子，二十年了。」']);
    K.plant(5.2, -3.6); K.lamp(-2, -1.5); K.lamp(3, 1.5);
  } });
  // 湯豆腐・南山（料亭）
  CK.defineRoom({ id: 'hl_tofu', name: '湯豆腐・南山', hint: '榻榻米的座敷，土鍋冒著熱氣', w: 12, d: 10, h: 3.2, floor: 'wfloor', wall: 'plaster', wain: 'woodB', build(B, K) {
    K.tatami(-6, -5, 6, 1.5);
    [[-3.5, -2.5], [0, -2.5], [3.5, -2.5]].forEach(([x, z]) => { B.Bt.yOff = 0.22; K.lowTable(x, z, 1.4, 1.0); K.cushion(x - 0.9, z, '#7A2A3A'); K.cushion(x + 0.9, z, '#7A2A3A'); B.part(B.g.cyl, CK.M('black'), x, 0.42, z, 0.4, 0.14, 0.4); B.part(B.g.cyl, CK.M('white'), x, 0.5, z, 0.32, 0.03, 0.32); B.Bt.yOff = 0; });
    K.shoji(-6, -4.95, 4, 0); K.shoji(2, -4.95, 6, 0);
    K.counter(-3.5, 3.4, 4, 0.6, { mat: 'woodB' });
    B.inter(0, 2.6, 2.2, '點湯豆腐', () => eatMenu('湯豆腐・南山', '「豆腐是今天早上用山上的水做的。」', [['湯豆腐定食', 12, '昆布高湯裡的嫩豆腐，配柚子醋和蔥', { hp: 0.06, regen: 0.15 }], ['田樂豆腐', 8, '烤過的豆腐塗上甜味噌', { hp: 0.04, dmg: 0.02 }], ['豆腐皮蓋飯', 10, '湯葉鋪在白飯上，淋一點醬汁', { mp: 0.05, hp: 0.03 }]]), '#E8A03A');
    B.talker(-3.5, 2.6, Math.PI, '南山的女將', ['「歡迎光臨。鞋子脫在這裡。」', '「冬天的湯豆腐，客人都是為了暖身子來的。」']);
    B.talker(3.5, -1.2, Math.PI, '吃飯的觀光客', ['「這豆腐好燙，可是停不下來。」', '「早上去了山城神社，石階爬到腿軟。」']);
    K.lamp(-2, -2); K.lamp(3, -2);
  } });
  // 旅館・嶺月
  CK.defineRoom({ id: 'hl_inn', name: '旅館・嶺月', hint: '玄關的地板擦得發亮，裡面是榻榻米的客房', w: 14, d: 10, h: 3.4, floor: 'wfloor', wall: 'plaster', wain: 'woodD', build(B, K) {
    K.counter(-3.5, 2.2, 4, 0.8, { mat: 'woodB' });
    K.tatami(-7, -5, 7, -0.5); K.shoji(-3.5, -0.5, 7, 0); K.shoji(3.5, -0.5, 7, 0);
    [-4.5, -1.5].forEach(x => { B.Bt.yOff = 0.22; K.futon(x, -2.8); B.Bt.yOff = 0; });
    B.Bt.yOff = 0.22; K.lowTable(3.5, -2.8, 1.4, 1.0); K.cushion(2.6, -2.8, '#5A3A2A'); K.cushion(4.4, -2.8, '#5A3A2A'); B.Bt.yOff = 0;
    B.solid(-7, -1.0, 7, -0.0, 'wall');   // 客房要從櫃台辦入住（拉門關著）
    B.inter(-3.5, 3.2, 2.2, '住一晚（30 費拉）', () => { const d = W.town.outer && W.town.outer.P; CK.innStay('huangling', 30, d || { x: 12.3, z: 70, yaw: -Math.PI / 2 }); }, '#7AC8E8');
    B.talker(-3.5, 1.2, 0, '嶺月的掌櫃', ['「歡迎。一晚三十費拉，附早餐。」', '「客房看得到皇城的天守，晚上會點燈。」', '「勇者大人？最近來皇嶺的勇者變多了。」']);
    K.bench(4, 3.2, 3, 0); K.plant(6.3, 4.2); K.lamp(-3.5, 2.5); K.lamp(3, 2.5);
  } });
  // 書店・積學堂
  CK.defineRoom({ id: 'hl_books', name: '書店・積學堂', hint: '舊書和新書的味道混在一起', w: 12, d: 10, h: 3.6, floor: 'wfloor', wall: 'plaster', wain: 'woodD', build(B, K) {
    K.books(-3, -4.6, 5, 0); K.books(3, -4.6, 5, 0); K.books(-5.75, 0, 6, Math.PI / 2); K.books(5.75, 0, 6, -Math.PI / 2);
    K.books(-1.5, 0.5, 3.4, 0); K.books(1.9, 0.5, 3.4, Math.PI);
    K.counter(3.8, 3.4, 2.6, 0.7, { mat: 'woodB' });
    const LORE = [['《昭光帝國興亡錄》', '「……帝國在本土城市戰之後分成兩半，北州的貴族不肯投降，直到最後一位將軍在古森自盡。」'], ['《遺跡生物圖鑑・首都版》', '「皇嶺附近的遺跡，生物多半怕光。帶燈的勇者活得比較久。」'], ['《魔力學概論》（昭皇大學教科書）', '「魔力是可以測量的。佩特拉的核心，是迄今發現密度最高的魔力體。」'], ['《皇嶺觀光導覽》', '「向日塔的展望台：天氣好時可遠眺天宮島海岸線。」'], ['《艾菲爾斯特地理》', '「昭旭聯合王國由天宮島、北州島、納瓦諸島組成。」']];
    B.inter(-1.5, 2.0, 2.2, '翻翻書', () => { const b = pick(LORE); R.townTalk('書店・積學堂', ['你翻開' + b[0] + '。', b[1]]); }, '#C8B08A');
    B.talker(3.8, 4.2, Math.PI, '積學堂的店主', ['「皇嶺的舊書店有三十幾家，我們最老。」', '「找遺跡的資料？右邊那排，最下面。」', '「站著看可以，不要折到書角。」']);
    K.lamp(0, -1.5); K.lamp(0, 2.5);
  } });
  // 皇嶺站・大廳
  CK.defineRoom({ id: 'hl_station', name: '皇嶺站・大廳', hint: '「往東鶴的魔導電車，即將進站——」', w: 26, d: 14, h: 7, floor: 'gran', wall: 'conc', wain: 'metal', trim: 'steelD', amb: 1.0, build(B, K) {
    K.gates(0, -3.5, 7, 1.5);
    B.box(CK.M('steelD'), -13, 0, -3.6, -5.6, 1.1, -3.4); B.box(CK.M('steelD'), 5.6, 0, -3.6, 13, 1.1, -3.4); B.solid(-13, -3.6, -5.6, -3.4, 'wall'); B.solid(5.6, -3.6, 13, -3.4, 'wall'); B.solid(-5.6, -4.2, 5.6, -2.8, 'wall');
    K.counter(-9, 1.0, 5, 0.9, { mat: 'steelD', top: 'marble' }); B.box(CK.M('glassL'), -11.4, 1.05, 0.95, -6.6, 2.4, 1.05);
    K.wallSign('皇嶺站', 'n', 0, 5.6, { size: 1.2, bg: '#1A2A4A', fg: '#FFFFFF', lit: 1 });
    K.wallSign('東鶴　奉主　吉山　府廳　西見', 'n', 0, 4.4, { size: 0.45, bg: '#0E0E14', fg: '#FFD84A', lit: 1 });
    B.inter(-9, 2.2, 2.4, '售票口（回東鶴、轉往他城）', () => CK.ticket(), '#5A8AC8');
    B.inter(0, -1.6, 2.4, '時刻表', () => R.townTalk('皇嶺站的時刻表', ['往東鶴：每天六班（魔導電車，一天）', '往奉主：每小時一班', '往吉山、府廳：每天四班', '往北州（古森、岳北）：接西見的渡輪', '山嶺國際機場：接駁巴士在站前廣場的西邊']), '#5A8AC8');
    B.talker(-9, 0.0, 0, '售票口的站務員', ['「往東鶴的票嗎？」', '「北州要轉渡輪，日子比較久。」']);
    K.shelf(10, 2, 4, -Math.PI / 2, { cols: ['#C83A3A', '#E8E4DC', '#E8B830', '#3A7A4A'] });
    B.inter(8.6, 2, 2, '車站的小賣店', () => R.azuki.food('huangling'), '#E8A03A');
    K.bench(-3, 4.5, 4, 0); K.bench(3, 4.5, 4, 0);
    B.talker(0, 2.5, Math.PI, '等車的上班族', ['「首都的電車從來不誤點。」', '「東鶴？要坐一整天呢。」']);
    K.lamp(-8, 0); K.lamp(0, 2); K.lamp(8, 0);
  } });

  // ================= 地標 =================
  // ---- 皇城：石垣島上的白牆、隅櫓、御殿、天守（向日殿）；正門（櫓門）關著 ----
  function castle(B) {
    const M = CK.M, BOX = B.box, g = B.g, P = B.part, y0 = 4, y1 = 9;
    // ---- 護城河裡的島（二之丸）：斜的石垣、白的土塀、四個角的櫓 ----
    B.terrace(-50, -150, 50, -108, y0, { wall: 'ishi', top: 'gravel', open: [] });
    B.ishigaki(-50, -150, 50, -108, -1.6, y0, { batter: 0.26 });
    B.dobei(-50, -150, 50, -108, y0, { gaps: [[-12, -111, 12, -105]] });
    [[-44, -144], [44, -144], [-44, -113.6], [44, -113.6]].forEach(([x, z]) => B.yagura(x, z, y0, 2, 1));
    // 本丸的台（島上再高一層）、御殿、兩個櫓
    B.terrace(-38, -146, 38, -122, y1, { wall: 'ishi', top: 'gravel', open: [] });
    B.ishigaki(-38, -146, 38, -122, y0, y1, { batter: 0.26 });
    B.dobei(-38, -146, 38, -122, y1, { sides: 'swe', gaps: [[-6, -124, 6, -120]] });
    [[-33, -126.5], [33, -126.5]].forEach(([x, z]) => B.yagura(x, z, y1, 3, 0.9));
    hall(B, -14, -137, 20, 11, y1, 'copper'); hall(B, 14, -137, 20, 11, y1, 'copper');
    // 正門：石垣的門洞、關著的門、上面的渡櫓
    const gz = -106.9;
    BOX(M('ishi'), -12, 0, gz - 2.4, -4.6, y0, gz); BOX(M('ishi'), 4.6, 0, gz - 2.4, 12, y0, gz);
    BOX(M('woodB'), -4.6, 0, gz - 0.25, 4.6, y0 - 0.1, gz - 0.1);   // 門板在斜石垣的前面（石垣往下越來越外撒）
    BOX(M('bronze'), -4.4, 0.2, gz - 0.1, -0.05, y0 - 0.4, gz + 0.02); BOX(M('bronze'), 0.05, 0.2, gz - 0.1, 4.4, y0 - 0.4, gz + 0.02);
    for (let i = 0; i < 6; i++) [-2.2, 2.2].forEach(x => P(g.sph, M('gold'), x, 0.8 + i * 0.5, gz + 0.04, 0.14, 0.14, 0.06));
    B.yagura(0, gz - 3.6, y0, 1, 1, { w: 26, d: 6.6 });
    B.solid(-12, gz - 2.4, 12, gz + 0.3, 'house');
    B.inter(0, -104.8, 2.6, '觀光景點：皇城外苑（正門・觀光章）', () => az().stamp('huangling', 'hl_castle'), '#E8C04A').sight = 'hl_castle';
    B.inter(3.6, -102.6, 2, '皇城的正門（關著）', () => az().fac('huangling', 'castle'));
    [-14, 14].forEach(x => B.lantern(x, -98.2, 1.2));
    [[-44, -130], [44, -130], [-26, -112], [26, -112]].forEach(([x, z]) => B.tree(x, z, 'pine', 1.15));
    B.foot([-50, -150, 50, -108], 'castle', 20);
    // ---- 北邊的城山：一層一層的石垣（每層上面土塀、櫓、松），最上面是天守「向日殿」 ----
    const tiers = [[-215, -380, 150, -169, 0, 12], [-120, -360, 118, -194, 12, 22], [-88, -345, 86, -216, 22, 32], [-54, -320, 54, -240, 32, 42]];
    B.ishigaki(172, -380, 215, -169, 0, 12, { batter: 0.3, top: 'grass' });   // 向日川東邊的那一塊（河從中間的峽谷流出去）
    B.dobei(172, -380, 215, -169, 12, { sides: 'sw', ins: 0.8 });
    tiers.forEach(([a, b, c, d, lo, hi], i) => {
      B.ishigaki(a, b, c, d, lo, hi, { batter: 0.3, top: 'grass' });
      B.dobei(a, b, c, d, hi, { sides: 'swe', ins: 0.8 });
      [[a + 7, d - 6], [c - 7, d - 6]].forEach(([x, z]) => B.yagura(x, z, hi, i < 2 ? 2 : 3, i < 2 ? 1.1 : 1.25));
      if (i < 2) [-1, 1].forEach(sd => B.yagura(sd * (c - a) * 0.21, d - 5, hi, 2, 1));
      // 多聞櫓：沿著前緣，一段一段的長櫓（白牆、瓦）
      for (let x = a + 24; x < c - 24; x += i < 2 ? 44 : 30) { if (Math.abs(x - (a + c) / 2) < 14 && i === 3) continue; if (i < 2 && Math.abs(Math.abs(x) - (c - a) * 0.21) < 14) continue; B.yagura(x, d - 4.2, hi, 1, 0.9, { w: i < 2 ? 22 : 16, d: 6, shachi: false }); }
      if (i === 1 || i === 2) [-1, 1].forEach(sd => hall(B, sd * (c - a) * 0.28, d - 22, 18, 10, hi, 'copper'));
      B.Bt.yOff = hi;
      for (let k = 0; k < 12 + i * 3; k++) { const x = B.rr(a + 6, c - 6), z = B.rr(Math.max(b, d - 60) + 4, d - 9); if (i === 3 && Math.abs(x) < 42) continue; B.tree(x, z, B.rnd() < 0.6 ? 'pine' : 'cedar', B.rr(1.1, 1.6)); }
      [-1, 1].forEach(sd => B.nobori((a + c) / 2 + sd * (c - a) * 0.36, d - 2.6, 0, { h: 10, w: 2, bh: 5.2, side: sd, solid: false }));
      B.Bt.yOff = 0;
    });
    // 天守「向日殿」（六層、五重的屋頂）＋東西兩座小天守、中間的渡櫓
    B.tenshu(0, -280, 42, { w: 34, d: 26, base: 8, floors: 6, s: 1.2 });
    B.tenshu(-31, -266, 42, { w: 14, d: 12, base: 4, floors: 3 });
    B.tenshu(30, -262, 42, { w: 13, d: 11, base: 4, floors: 3 });
    B.yagura(-17.5, -270, 46, 1, 1, { w: 9, d: 6 }); B.yagura(17, -268, 46, 1, 1, { w: 8, d: 6 });
  }
  // 御殿：木柱、白牆、入母屋（寄棟＋上面的山牆）
  function hall(B, x, z, w, d, y0, mat, wh) {
    const M = CK.M, BOX = B.box, g = B.g, P = B.part, h = wh || 5;
    BOX(M('ashlar'), x - w / 2 - 0.6, y0, z - d / 2 - 0.6, x + w / 2 + 0.6, y0 + 0.8, z + d / 2 + 0.6);
    BOX(M('white'), x - w / 2 + 0.6, y0 + 0.8, z - d / 2 + 0.6, x + w / 2 - 0.6, y0 + h, z + d / 2 - 0.6);
    for (let k = -w / 2; k <= w / 2 + 0.01; k += w / Math.round(w / 2.4)) [-d / 2, d / 2].forEach(dz => P(g.cyl, M('woodB'), x + k, y0 + 0.8 + (h - 0.8) / 2, z + dz, 0.4, h - 0.8, 0.4));
    BOX(M('woodB'), x - w / 2, y0 + h - 0.5, z - d / 2 - 0.1, x + w / 2, y0 + h, z + d / 2 + 0.1);
    B.roof(x, z, w, d, { type: 'hip', y: y0 + h, h: d * 0.26, o: 1.6, sori: 0.4, mat, ridge: false, under: 'woodD' });
    B.roof(x, z, w * 0.55, d * 0.45, { type: 'gable', y: y0 + h + d * 0.2, h: d * 0.26, o: 0.5, sori: 0.2, mat, gableMat: 'woodB', under: 'woodD' });
  }

  // ---- 世界央行昭旭分館：石造、六根柱子、三角楣、台階（正面朝東） ----
  function bank(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, cz = (z0 + z1) / 2, h = 14;
    B.bld({ r: [x0, z0, x1 - 6, z1], h, style: 'brick', face: 'e', col: '#E8E0D4', top: false });
    // 柱廊（往大通凸出）
    const fx = x1 - 6, L = z1 - z0 - 4;
    B.box(M('ashlar'), fx, 0, z0 + 2, x1 - 0.5, 1.2, z1 - 2);
    for (let i = 0; i < 3; i++) B.box(M('ashlar'), x1 - 0.5 - i * 0.45 - 0.45, 0, z0 + 2.5, x1 - 0.5 - i * 0.45, 1.2 - i * 0.4, z1 - 2.5);
    for (let i = 0; i < 6; i++) { const zz = z0 + 2.8 + i * (L - 1.6) / 5; P(g.cyl24, M('white'), x1 - 2.4, 1.2 + 5.2, zz, 1.1, 10.4, 1.1); P(g.box, M('white'), x1 - 2.4, 1.4, zz, 1.4, 0.4, 1.4); P(g.box, M('white'), x1 - 2.4, 11.6, zz, 1.4, 0.4, 1.4); }
    B.box(M('white'), fx, 11.8, z0 + 2, x1 - 1, 13.2, z1 - 2);
    P(g.prism, M('white'), x1 - 3.5, 13.2, cz, L + 1, 3, 5, 0, Math.PI / 2, 0);
    B.sign('世界中央銀行・昭旭分館', 'e', x1 - 1, cz, 12.5, { size: 0.62, bg: '#F2F0EA', fg: '#3A2E20', weight: 'bold' });
    B.solid(fx, z0 + 2, x1 - 0.5, z1 - 2, 'house');
    CK.door(B, x1 + 1.2, cz, 'hl_bank', '走進世界央行昭旭分館（存款、股票）', '#C8A040', Math.PI / 2);
  }
  // ---- 議政院：中央高塔（階梯狀的金字塔頂），左右兩翼（正面朝南） ----
  function parliament(B, r) {
    const M = CK.M, [x0, z0, x1, z1] = r, cx = (x0 + x1) / 2;
    // 2026-10-08：照概念圖改成和風（兩翼＋中央的高樓，銅瓦、朱色的線）
    B.bld({ r: [x0, z0 + 6, cx - 5, z1], h: 14.4, style: 'wafu', face: 's', col: '#EEE8DA', roofMat: 'copper', accent: 'verm' });
    B.bld({ r: [cx + 5, z0 + 6, x1, z1], h: 14.4, style: 'wafu', face: 's', col: '#EEE8DA', roofMat: 'copper', accent: 'verm' });
    B.bld({ r: [cx - 5, z0, cx + 5, z1 + 1], h: 28.8, style: 'wafu', face: 's', col: '#F2EEE6', roofMat: 'copper', accent: 'verm', step: 3 });
    void M;
    B.sign('昭旭議政院', 's', z1 + 1, cx, 6.5, { size: 0.9, bg: '#2A2A30', fg: '#E8D8A8' });
    B.inter(cx, z1 + 3, 2.6, '昭旭議政院（政治中心・參觀走廊）', () => R.townTalk('昭旭議政院', ['參觀走廊的玻璃後面，是空著的議場。', ['「議會選舉快到了。四個黨的海報貼滿了整條三條通。」', '「昭皇不參與政治——至少憲法是這樣寫的。」', '「議場的天花板是從北州運來的古森木做的。」'][Math.floor(Math.random() * 3)]]), '#8A9AB0');
  }
  // ---- 公會昭旭分館：石造三層、綠色的旗、門口的燈（正面朝西） ----
  function guild(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, cz = (z0 + z1) / 2;
    B.bld({ r, h: 13.5, style: 'brick', face: 'w', col: '#D8D0C0', top: false });
    // 入口的門廊
    B.box(M('ashlar'), x0 - 2.4, 0, cz - 4, x0, 0.4, cz + 4);
    [cz - 3.4, cz + 3.4].forEach(z => P(g.cyl, M('ashlar'), x0 - 2, 2.4, z, 0.7, 4.4, 0.7));
    B.box(M('ashlar'), x0 - 2.6, 4.6, cz - 4.2, x0, 5.2, cz + 4.2);
    B.box(M('shopLit'), x0 - 0.06, 0.4, cz - 2.2, x0, 4.2, cz + 2.2);
    // 綠色的旗（公會的徽章）
    const flagTex = R.guildFlagTex ? R.guildFlagTex(24, 40, true) : null;
    if (flagTex) { const fm = new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.9, side: THREE.DoubleSide }); fm.userData.shared = false; [cz - 7, cz + 7].forEach(z => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.6), fm); m.position.set(x0 - 0.15, 8.6, z); m.rotation.y = -Math.PI / 2; m.castShadow = true; B.group.add(m); }); }
    B.flag(x0 - 1.5, cz - 9.5, 14, '#2E6A3E');
    B.sign('公會昭旭分館', 'w', x0 - 2.6, cz, 5.9, { size: 0.72, bg: '#2E5A3A', fg: '#F4ECD8', box: 1, lit: 1 });
    B.solid(x0 - 2.6, cz - 4.2, x0, cz - 2.9, 'deco'); B.solid(x0 - 2.6, cz + 2.9, x0, cz + 4.2, 'deco');
    CK.door(B, x0 - 3.2, cz, 'hl_guild', '走進公會昭旭分館（地方委託）', '#3E9A5A', -Math.PI / 2);
  }
  // ---- 皇嶺百貨（正面朝南） ----
  function dept(B, r) {
    const M = CK.M, [x0, z0, x1, z1] = r, cx = (x0 + x1) / 2;
    B.bld({ r, h: 32.4, style: 'wafu', face: 's', col: '#F2EEE6', roofMat: 'copper', accent: 'verm', step: 3 });   // 2026-10-08：和風高樓
    B.sign('皇嶺百貨', 's', z1 + 0.06, cx, 8.6, { size: 1.6, bg: '#5A1A2A', fg: '#FFE8B0', box: 1, lit: 1 });
    void M; void x0; void x1;
    CK.door(B, cx - 6, z1 + 3, 'hl_dept', '走進皇嶺百貨（地下美食街）', '#E8A03A', 0);
  }
  // ---- 昭皇大學：正門、紅磚的本館＋鐘樓、圖書館、魔力學院的溫室、中庭 ----
  function university(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r;
    B.zone([x0, z0, x1, z1], 'grass', 0.02);
    B.zone([x0, -22, x1 - 6, -16], 'gran', 0.03);   // 從正門往東的步道
    B.zone([116, z0 + 4, 122, 4], 'gran', 0.03); B.zone([116, 28, 122, z1 - 4], 'gran', 0.03);
    // 正門：兩根石柱、「昭光不滅」
    [-25.5, -12.5].forEach(z => { B.box(M('ashlar'), x0, 0, z - 1, x0 + 2, 4.2, z + 1); B.solid(x0, z - 1, x0 + 2, z + 1, 'deco'); });
    B.sign('昭光不滅', 'w', x0, -25.5, 2.6, { size: 0.45, vert: 1, bg: '#E6E2DA', fg: '#2A2420' });
    B.sign('昭皇大學', 'w', x0, -12.5, 2.6, { size: 0.45, vert: 1, bg: '#E6E2DA', fg: '#2A2420' });
    B.fence(x0 + 1, z0 + 1, x0 + 1, -27, 1.6, 'steelD'); B.fence(x0 + 1, -11, x0 + 1, z1 - 1, 1.6, 'steelD');
    B.solid(x0 + 0.9, z0 + 1, x0 + 1.1, -27, 'deco'); B.solid(x0 + 0.9, -11, x0 + 1.1, z1 - 1, 'deco');
    B.inter(x0 - 1.6, -19, 2.6, '觀光景點：昭皇大學正門（觀光章）', () => az().stamp('huangling', 'hl_uni'), '#E8C04A').sight = 'hl_uni';
    // 本館＋鐘樓（正面朝西）
    B.bld({ r: [124, -40, 138, 0], h: 13, style: 'brick', face: 'w', top: false, roof: 'hip', roofMat: 'copper' });
    const tx = 131, tz = -20; B.box(M('brick'), tx - 3, 0, tz - 3, tx + 3, 26, tz + 3); B.solid(tx - 3, tz - 3, tx + 3, tz + 3);
    B.box(M('ashlar'), tx - 3.2, 18, tz - 3.2, tx + 3.2, 18.6, tz + 3.2); B.box(M('ashlar'), tx - 3.2, 25.4, tz - 3.2, tx + 3.2, 26, tz + 3.2);
    [['w', tx - 3.05], ['e', tx + 3.05]].forEach(([f, c]) => B.part(g.cyl24, M('white'), c, 22, tz, 3.2, 0.12, 3.2, 0, 0, Math.PI / 2));
    B.roof(tx, tz, 6.4, 6.4, { type: 'pyramid', y: 26, h: 5, o: 0.3, mat: 'copper' });
    tickClock(B, tx - 3.15, 22, tz);
    // 圖書館（正面朝南）、講堂
    B.bld({ r: [104, 6, 136, 26], h: 10.5, style: 'brick', face: 'n', top: false, roof: 'gable', roofMat: 'copper' });
    B.bld({ r: [104, -76, 128, -52], h: 14, style: 'brick', face: 's', top: false, roof: 'hip', roofMat: 'copper' });
    B.sign('昭皇大學圖書館', 'n', 6, 120, 8.2, { size: 0.55, bg: '#5A2A20', fg: '#F4E8D0' });
    // 魔力學院分院的溫室：玻璃、晚上會自己發光（藍綠色）
    const gx = 110, gz = -38, gw = 10, gd = 14;
    B.box(M('ashlar'), gx - gw / 2, 0, gz - gd / 2, gx + gw / 2, 0.6, gz + gd / 2);
    const glow = CK.mat('greenhouseGlow', { col: '#A8F0E0', em: '#5AE8C8', ei: 1.4, neon: true, snow: 0 }); glow.userData.ei0 = 1.4;
    B.box(glow, gx - gw / 2 + 0.6, 0.6, gz - gd / 2 + 0.6, gx + gw / 2 - 0.6, 3.2, gz + gd / 2 - 0.6);
    B.box(M('glassL'), gx - gw / 2, 0.6, gz - gd / 2, gx + gw / 2, 4.2, gz + gd / 2);
    P(g.cyl, M('glassL'), gx, 4.2, gz, gw, gd, gw, Math.PI / 2, 0, 0, { uv: 'keep' });
    for (let z = gz - gd / 2; z <= gz + gd / 2 + 0.01; z += 2) { B.box(M('metal'), gx - gw / 2, 0.6, z - 0.05, gx - gw / 2 + 0.1, 4.2, z + 0.05); B.box(M('metal'), gx + gw / 2 - 0.1, 0.6, z - 0.05, gx + gw / 2, 4.2, z + 0.05); }
    for (let i = 0; i < 6; i++) B.tree(gx + rr2(-3, 3), gz + rr2(-5, 5), 'shrub', 1.1);
    B.solid(gx - gw / 2, gz - gd / 2, gx + gw / 2, gz + gd / 2, 'house'); B.foot([gx - gw / 2, gz - gd / 2, gx + gw / 2, gz + gd / 2], 'glass', 6);
    B.inter(gx + gw / 2 + 1.2, gz, 2.4, '昭皇大學・魔力學院分院的溫室（看看）', () => az().fac('huangling', 'uni'), '#5AE8C8');
    // 中庭的樹、長椅
    [[108, -8], [114, 34], [134, 34], [106, 38]].forEach(([x, z]) => B.tree(x, z, 'bare', 1.3));
    [[113, 34], [113, -50]].forEach(([x, z]) => B.bench(x, z, Math.PI / 2));
    B.walk([[x0 + 3, -19], [119, -19], [119, 3]], 3); B.walk([[119, 29], [119, 41]], 1);
    function rr2(a, b) { return a + (b - a) * B.rnd(); }
  }
  // 鐘樓的指針（照遊戲裡的時間走）
  function tickClock(B, x, y, z) {
    const TH = THREE, m = new TH.MeshStandardMaterial({ color: '#1A1A1E', roughness: 0.5 }), hh = new TH.Mesh(new TH.BoxGeometry(0.08, 1.0, 0.12), m), mm = new TH.Mesh(new TH.BoxGeometry(0.08, 1.4, 0.08), m);
    [hh, mm].forEach(o => { o.geometry.translate(0, o === hh ? 0.45 : 0.65, 0); o.position.set(x - 0.08, y, z); o.rotation.y = -Math.PI / 2; B.group.add(o); });
    W.town.anim.push(() => { const h = R.hourNow ? R.hourNow() : 12; hh.rotation.z = -((h % 12) / 12) * Math.PI * 2; mm.rotation.z = -((h % 1)) * Math.PI * 2; });
  }
  // ---- 昭光寺：山門、本堂、五重塔（觀光地） ----
  function temple(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r;
    B.zone(r, 'gravel', 0.02);
    // 土塀
    B.box(M('cream'), x0, 0, z0, x1, 2.4, z0 + 0.6); B.box(M('cream'), x0, 0, z1 - 0.6, x1 - 9, 2.4, z1); B.box(M('cream'), x0, 0, z0, x0 + 0.6, 2.4, z1);
    B.box(M('cream'), x1 - 0.6, 0, z0, x1, 2.4, (z0 + z1) / 2 - 3); B.box(M('cream'), x1 - 0.6, 0, (z0 + z1) / 2 + 3, x1, 2.4, z1);
    [[x0, z0, x1, z0 + 0.6], [x0, z1 - 0.6, x1 - 9, z1], [x0, z0, x0 + 0.6, z1], [x1 - 0.6, z0, x1, (z0 + z1) / 2 - 3], [x1 - 0.6, (z0 + z1) / 2 + 3, x1, z1]].forEach(q => { B.solid(q[0], q[1], q[2], q[3], 'wall'); B.box(M('kawara'), q[0] - 0.2, 2.4, q[1] - 0.2, q[2] + 0.2, 2.65, q[3] + 0.2); });
    // 山門（東邊，對著大通那條巷子）
    const mz = (z0 + z1) / 2; [-2.6, 2.6].forEach(dz => { P(g.cyl, M('verm'), x1 - 0.3, 2.2, mz + dz, 0.5, 4.4, 0.5); B.solid(x1 - 0.6, mz + dz - 0.3, x1, mz + dz + 0.3, 'deco'); }); B.roof(x1 - 0.3, mz, 7.4, 3.4, { type: 'gable', y: 4.4, h: 1.2, o: 0.6, sori: 0.2, ry: Math.PI / 2, mat: 'kawara', gableWall: false });
    // 本堂
    hall(B, x0 + 12, z0 + 14, 18, 12, 0, 'kawara', 5.5);
    B.solid(x0 + 2.4, z0 + 7.4, x0 + 21.6, z0 + 20.6, 'house'); B.foot([x0 + 2.4, z0 + 7.4, x0 + 21.6, z0 + 20.6], 'temple', 10);
    // 五重塔
    const px = x0 + 14, pz = z1 - 13; let y = 0.8, w = 7.2;
    B.box(M('ashlar'), px - 5, 0, pz - 5, px + 5, 0.8, pz + 5);
    for (let i = 0; i < 5; i++) { const hh = 3.1; B.box(M('verm'), px - w / 2, y, pz - w / 2, px + w / 2, y + hh, pz + w / 2); B.box(M('white'), px - w / 2 - 0.02, y + hh * 0.35, pz - w / 2 - 0.02, px + w / 2 + 0.02, y + hh * 0.75, pz + w / 2 + 0.02); B.roof(px, pz, w, w, { type: 'pyramid', y: y + hh, h: 1.1, o: 1.5, sori: 0.4, mat: 'kawara', ridge: false }); y += hh + 0.45; w -= 0.8; }
    P(g.cyl8, M('bronze'), px, y + 3.5, pz, 0.3, 7, 0.3); for (let k = 0; k < 9; k++) P(g.torus, M('bronze'), px, y + 1.4 + k * 0.55, pz, 1.1 - k * 0.05, 1.1 - k * 0.05, 1.1 - k * 0.05, Math.PI / 2, 0, 0);
    B.solid(px - 5, pz - 5, px + 5, pz + 5, 'house'); B.foot([px - 5, pz - 5, px + 5, pz + 5], 'tower', 30);
    B.inter(px + 6.6, pz, 2.6, '昭光寺的五重塔（觀光地）', () => R.townTalk('昭光寺・五重塔', ['皇嶺最高的木造塔，五層，戰火裡燒掉過兩次，現在的是第三代。', ['「塔的中心柱沒有落地，是吊著的。地震的時候整座塔會像鐘擺一樣晃。」', '「每一層的屋簷都比下一層小一點點，從下面看才會覺得塔很高。」', '「冬天的五重塔配雪，是皇嶺明信片賣最好的一張。」'][Math.floor(Math.random() * 3)]]), '#E8C04A');
    for (let i = 0; i < 4; i++) B.lantern(x1 - 6 - i * 6, mz - 3.5, 0.9);
    [[x0 + 30, z0 + 6], [x0 + 6, z1 - 6], [x0 + 34, z1 - 8]].forEach(([x, z]) => B.tree(x, z, 'pine', 1.1));
    B.walk([[x1 + 2, mz], [x0 + 26, mz]], 2);
  }
  // ---- 昭陽商店街：南北的拱廊（走路的），兩邊是店 ----
  function arcade(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, cx = (x0 + x1) / 2;
    B.plaza(cx - 3, z0, cx + 3, z1, 'pav');
    const SH = [['皇嶺點心・山月', 'food'], ['土產・千代', null], ['藥妝・白藤', null], ['書店・積學堂', null], ['和服・染', null], ['喫茶・六角', null], ['遊樂場・星光', null], ['唱片・音盤', null], ['拉麵・新京', null], ['香・松香', null]];
    let k = 0;
    const each = side => (i, rr0) => { const sp = SH[k++ % SH.length]; const o = { name: sp[0], vsign: sp[0].split('・')[0], neon: 0 }; if (sp[1] === 'food') { const ix = side === 'e' ? rr0[2] + 1.4 : rr0[0] - 1.4; CK.door(B, ix, (rr0[1] + rr0[3]) / 2, 'hl_wagashi', '走進' + sp[0], '#E8A03A', side === 'e' ? Math.PI / 2 : -Math.PI / 2); } return o; };
    B.row('e', cx - 3, z0 + 0.5, z1 - 0.5, cx - 3 - x0 + 4, { style: 'house', h: 8 }, 5, 8, each('e'));
    B.row('w', cx + 3, z0 + 0.5, z1 - 0.5, x1 - cx - 3 + 4, { style: 'house', h: 8 }, 5, 8, each('w'));
    // 拱廊的屋頂（拱形的玻璃）、柱、入口的招牌
    P(g.cyl, M('glassL'), cx, 7.2, (z0 + z1) / 2, 6.4, z1 - z0, 2.4, Math.PI / 2, 0, 0, { uv: 'keep' });
    for (let z = z0 + 2; z < z1; z += 6) { [-3.05, 3.05].forEach(dx => P(g.box, M('steel'), cx + dx, 3.6, z, 0.18, 7.2, 0.18)); P(g.box, M('steel'), cx, 7.25, z, 6.4, 0.16, 0.16); }
    [z0, z1].forEach(z => { P(g.box, M('steelD'), cx, 8.0, z, 6.8, 1.2, 0.4); B.sign('昭陽商店街', z === z0 ? 'n' : 's', z + (z === z0 ? -0.2 : 0.2), cx, 8.0, { size: 0.9, bg: '#8A1A1A', fg: '#FFE8B0', lit: 1 }); });
    B.walk([[cx - 1, z0 - 2], [cx - 1, z1 + 2]], 5); B.walk([[cx + 1.2, z1 + 2], [cx + 1.2, z0 - 2]], 4);
  }
  // ---- 昭旭城古蹟：台地、殘破的石垣、隅櫓、碉堡、天守台的礎石 ----
  function ruins(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, h = 4.5;
    B.terrace(x0, z0, x1, z1, h, { wall: 'ishi', top: 'gravel', open: [[x1 - 0.4, -56, x1 + 0.4, -48]] });
    B.stairs(x1, -56, -101.5, -48, 'w', 0.12, h, { mat: 'ashlar' });
    // 上面：草、殘存的石垣（缺了一大塊）
    B.zone([x0 + 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5], 'grass', h + 0.02);
    const wallSeg = (a, b, c, d, hh) => { B.box(M('ishi'), a, h, b, c, h + hh, d); B.solid(a, b, c, d, 'wall'); };
    wallSeg(x0 + 2, z0 + 2, x0 + 30, z0 + 5, 3.4); wallSeg(x0 + 2, z0 + 2, x0 + 5, z0 + 26, 3.4); wallSeg(x0 + 40, z0 + 2, x0 + 52, z0 + 5, 1.6); wallSeg(x0 + 2, z0 + 32, x0 + 5, z0 + 38, 1.2);
    // 隅櫓（唯一沒燒掉的）
    B.box(M('ishi'), x0 + 4, h, z0 + 4, x0 + 12, h + 3.4, z0 + 12);
    B.yagura(x0 + 8, z0 + 8, h + 3.4, 3, 0.75);
    B.solid(x0 + 5, z0 + 5, x0 + 11, z0 + 11, 'house');
    // 碉堡：圓形的石砌砲台（現代加的）
    const bx = x1 - 12, bz = z0 + 12; P(g.cyl24, M('concD'), bx, h + 1.4, bz, 10, 2.8, 10); P(g.cyl24, M('steelD'), bx, h + 2.9, bz, 10.4, 0.25, 10.4); B.box(M('black'), bx - 1.6, h + 1.2, bz + 4.6, bx + 1.6, h + 2, bz + 5.2);
    B.solid(bx - 5, bz - 5, bx + 5, bz + 5, 'house');
    // 天守台的礎石（格子）
    const fx = x0 + 34, fz = z0 + 24; B.box(M('ishi'), fx - 8, h, fz - 6, fx + 8, h + 0.6, fz + 6); B.solid(fx - 8, fz - 6, fx + 8, fz + 6, 'deco');
    for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) P(g.cyl8, M('ashlar'), fx + i * 2.2, h + 0.75, fz + j * 2.2, 0.8, 0.3, 0.8);
    B.tree(x0 + 22, z0 + 14, 'pine', 1.5); B.tree(x0 + 12, z1 - 8, 'pine', 1.2); B.tree(x1 - 8, z1 - 8, 'bare', 1.2);
    // 說明牌
    P(g.box, M('woodD'), x1 - 9, h + 1.1, z1 - 14, 1.6, 1.0, 0.12); P(g.box, M('woodD'), x1 - 9, h + 0.4, z1 - 14, 0.1, 0.8, 0.1);
    B.inter(x1 - 9, z1 - 12.6, 2.4, '觀光景點：昭旭城古蹟（說明牌・觀光章）', () => az().stamp('huangling', 'hl_ruin'), '#E8C04A').sight = 'hl_ruin';
    B.walk([[-111, -52], [-111, -40], [-150, -40]], 2);
  }
  // ---- 山城神社：台地（高 6）＋長石階＋千本鳥居、拜殿、本殿、狛犬、繪馬、籤 ----
  function shrine(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, h = 6, sz = 18;
    B.terrace(x0, z0, x1, z1, h, { wall: 'ishi', top: 'gravel', open: [[x1 - 0.4, sz - 3, x1 + 0.4, sz + 3]] });
    // 石階：從人行道（-101.5）往西爬到台地（x1）；中間平台
    B.stairs(-108, sz - 3, -101.5, sz + 3, 'w', 0.12, 2.6, { mat: 'gran' });
    B.terrace(-112, sz - 4, -108, sz + 4, 2.6, { wall: 'ishi', top: 'gran', open: [[-112.4, sz - 3, -111.6, sz + 3], [-108.4, sz - 3, -107.6, sz + 3]] });
    B.stairs(x1, sz - 3, -112, sz + 3, 'w', 2.6, h, { mat: 'gran' });
    // 千本鳥居（沿著石階）
    for (let x = -103; x > x1 - 1; x -= 1.9) { const y = CK.heightAt ? 0 : 0; const t = B.torii; void y; t(x, sz, Math.PI / 2, 4.4, 3.6, 'verm'); }
    // 鳥居要站在石階上：上面的那幾座要抬高——用框蓋（直接改 y 比較麻煩：重做一次）
    // 拜殿、本殿
    const sx = x0 + 22; hall(B, sx, sz, 14, 9, h, 'copper', 4.6);
    B.solid(sx - 7.6, sz - 5.1, sx + 7.6, sz + 5.1, 'house'); B.foot([sx - 7.6, sz - 5.1, sx + 7.6, sz + 5.1], 'temple', 10);
    hall(B, x0 + 8, sz, 8, 7, h + 0.6, 'copper', 4);
    B.solid(x0 + 3.4, sz - 4.1, x0 + 12.6, sz + 4.1, 'house');
    // 賽錢箱、鈴
    P(g.box, M('woodD'), sx + 8.2, h + 0.5, sz, 0.9, 0.8, 2.2); B.solid(sx + 7.7, sz - 1.1, sx + 8.7, sz + 1.1, 'deco');
    P(g.cyl8, M('verm'), sx + 8.0, h + 2.6, sz, 0.06, 2.2, 0.06); P(g.sph, M('gold'), sx + 8.0, h + 3.8, sz, 0.45, 0.45, 0.45);
    B.inter(sx + 9.6, sz, 2.4, '觀光景點：山城神社（參拜・觀光章）', () => az().stamp('huangling', 'hl_shrine'), '#E8C04A').sight = 'hl_shrine';
    // 狛犬、石燈籠、繪馬架、籤
    [-3.4, 3.4].forEach(dz => { P(g.box, M('ashlar'), x1 - 3, h + 0.5, sz + dz, 1.2, 1.0, 1.2); P(g.ico, M('ashlar'), x1 - 3, h + 1.5, sz + dz, 0.9, 1.2, 0.8); B.solid(x1 - 3.6, sz + dz - 0.6, x1 - 2.4, sz + dz + 0.6, 'deco'); });
    [x1 - 8, x1 - 14].forEach(x => [-4.5, 4.5].forEach(dz => B.lantern(x, sz + dz, 1)));
    P(g.box, M('woodD'), sx - 2, h + 1.2, sz + 7.5, 4, 1.2, 0.2); P(g.box, M('wood'), sx - 2, h + 1.2, sz + 7.4, 3.6, 0.9, 0.1); B.solid(sx - 4, sz + 7.3, sx, sz + 7.7, 'deco');
    B.inter(sx - 2, sz + 6.2, 2, '抽籤（1 費拉）', () => { const s = S(); if (s.gold < 1) { R.toast('錢不夠。'); return; } s.gold -= 1; R.save(); const L = [['大吉', '「萬事如意。旅途平安。」'], ['吉', '「遇到的人會幫你。」'], ['中吉', '「慢慢來。雪會停的。」'], ['小吉', '「別急著下遺跡，先吃飽。」'], ['末吉', '「現在不順，之後會好。」'], ['凶', '「把籤綁在架子上，壞運氣就留在這裡。」']], o = L[Math.floor(Math.random() * L.length)]; R.townTalk('山城神社・籤', ['抽到了「' + o[0] + '」。', o[1]]); });
    // 杉樹林（台地上、後面）
    for (let i = 0; i < 18; i++) { const x = x0 + 2 + B.rnd() * (x1 - x0 - 4), z = B.rnd() < 0.5 ? z0 + 2 + B.rnd() * 8 : z1 - 2 - B.rnd() * 8; B.tree(x, z, 'cedar', 1.1 + B.rnd() * 0.4); }
    B.walk([[-102, sz + 1.2], [x1 - 4, sz + 1.2], [sx + 10, sz + 1.2]], 3);
  }
  // ---- 山嶺遊樂場：摩天輪、旋轉木馬、售票亭（會轉） ----
  function amusement(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, TH = THREE, tw = W.town;
    B.plaza(x0, z0, x1, z1, 'pav', { noCurb: true });
    B.fence(x0 + 0.5, z0 + 0.5, x1 - 0.5, z0 + 0.5, 1.3, 'verm'); B.fence(x1 - 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5, 1.3, 'verm'); B.fence(x0 + 0.5, z1 - 0.5, x1 - 0.5, z1 - 0.5, 1.3, 'verm');
    B.solid(x0 + 0.5, z0 + 0.4, x1 - 0.5, z0 + 0.6, 'wall'); B.solid(x1 - 0.6, z0 + 0.5, x1 - 0.4, z1 - 0.5, 'wall'); B.solid(x0 + 0.5, z1 - 0.6, x1 - 0.5, z1 - 0.4, 'wall');
    // 摩天輪
    const wx = x1 - 12, wz = z0 + 16, R0 = 11, cy = 13;
    [-1.8, 1.8].forEach(dz => { P(g.box, M('white'), wx - 4, cy / 2, wz + dz, 0.4, cy + 1, 0.4, 0, 0, -0.3); P(g.box, M('white'), wx + 4, cy / 2, wz + dz, 0.4, cy + 1, 0.4, 0, 0, 0.3); });
    B.solid(wx - 6, wz - 2.5, wx + 6, wz + 2.5, 'deco');
    const wheel = new TH.Group(); wheel.position.set(wx, cy, wz); B.group.add(wheel);
    const wm = CK.M('white'), gm = [CK.M('red'), CK.M('blue'), CK.M('yellow'), CK.M('green')], neonW = CK.mat('wheelNeon', { col: '#FFE8F4', em: '#FF8AD8', ei: 1.6, neon: true }); neonW.userData.ei0 = 1.6;
    const ring = new TH.Mesh(new TH.TorusGeometry(R0, 0.18, 6, 48), neonW); wheel.add(ring);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, sp = new TH.Mesh(g.box, wm); sp.scale.set(0.12, R0, 0.12); sp.position.set(Math.sin(a) * R0 / 2, Math.cos(a) * R0 / 2, 0); sp.rotation.z = -a; wheel.add(sp); }
    const gond = []; for (let i = 0; i < 12; i++) { const c = new TH.Mesh(g.box, gm[i % 4]); c.scale.set(1.4, 1.6, 1.4); c.castShadow = true; B.group.add(c); gond.push(c); }
    tw.anim.push((dt, t) => { const a = t * 0.08; wheel.rotation.z = a; gond.forEach((c, i) => { const b = a + i / 12 * Math.PI * 2; c.position.set(wx + Math.sin(b) * R0, cy - Math.cos(b) * R0 - 1.0, wz); }); });
    // 旋轉木馬
    const cx = x0 + 12, cz = z1 - 14; P(g.cyl24, M('cream'), cx, 0.3, cz, 10, 0.6, 10); P(g.cone, M('red'), cx, 5.6, cz, 11, 2.4, 11); P(g.cyl, M('gold'), cx, 2.6, cz, 0.6, 5, 0.6);
    B.solid(cx - 5, cz - 5, cx + 5, cz + 5, 'deco');
    const car = new TH.Group(); car.position.set(cx, 0, cz); B.group.add(car);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, hs = new TH.Mesh(g.box, i % 2 ? CK.M('white') : CK.M('cream')); hs.scale.set(0.5, 0.9, 1.4); hs.position.set(Math.sin(a) * 3.6, 1.6, Math.cos(a) * 3.6); hs.rotation.y = a + Math.PI / 2; const pole = new TH.Mesh(g.cyl8, CK.M('gold')); pole.scale.set(0.08, 4.2, 0.08); pole.position.set(Math.sin(a) * 3.6, 2.6, Math.cos(a) * 3.6); car.add(hs, pole); }
    tw.anim.push((dt, t) => { car.rotation.y = t * 0.6; car.children.forEach((c, i) => { if (i % 2 === 0) c.position.y = 1.6 + Math.sin(t * 2 + i) * 0.35; }); });
    // 售票亭、招牌
    B.bld({ r: [x0 + 2, z0 + 3, x0 + 8, z0 + 8], h: 3.6, style: 'house', face: 'e', name: '售票', top: false, roof: 'flat' });
    B.sign('山嶺遊樂場', 'w', x0 - 0.1, (z0 + z1) / 2, 5, { size: 1.1, bg: '#E83A6A', fg: '#FFFFFF', neon: 1 });
    P(g.box, M('steelD'), x0 - 0.3, 3.4, (z0 + z1) / 2, 0.3, 6.8, 0.3);
    B.inter(x0 + 9.4, z0 + 5.5, 2.4, '山嶺遊樂場（搭摩天輪）', () => az().fac('huangling', 'park'), '#E83A6A');
    B.walk([[x0 + 3, z0 + 12], [x1 - 4, z0 + 12]], 3); B.walk([[x0 + 22, z0 + 30], [x0 + 22, z1 - 4]], 2);
  }
  // ---- 皇嶺站：玻璃的大廳、雨棚、站名 ----
  function station(B, r) {
    const M = CK.M, g = B.g, P = B.part, [x0, z0, x1, z1] = r, cx = (x0 + x1) / 2;
    B.bld({ r: [x0, z0 + 2, x1, z1], h: 16, style: 'glass', face: 'n', col: '#C8D4DC', top: false });
    // 大廳的正面：高的玻璃牆＋鋼架
    B.box(M('glass'), cx - 18, 0.3, z0 + 1.9, cx + 18, 15, z0 + 2.0);
    for (let x = cx - 18; x <= cx + 18.01; x += 3) B.box(M('metal'), x - 0.1, 0.3, z0 + 1.8, x + 0.1, 15, z0 + 2.1);
    for (let y = 3.5; y < 15; y += 3.8) B.box(M('metal'), cx - 18, y - 0.08, z0 + 1.8, cx + 18, y + 0.08, z0 + 2.1);
    B.box(M('shopLit'), cx - 17.8, 0.3, z0 + 2.05, cx + 17.8, 3.6, z0 + 2.1);
    // 雨棚
    B.box(M('metal'), cx - 22, 4.6, z0 - 5, cx + 22, 4.9, z0 + 2); [-20, -10, 0, 10, 20].forEach(dx => P(g.cyl8, M('metal'), cx + dx, 2.3, z0 - 4.4, 0.3, 4.6, 0.3));
    [-20, -10, 0, 10, 20].forEach(dx => B.solid(cx + dx - 0.2, z0 - 4.6, cx + dx + 0.2, z0 - 4.2, 'deco'));
    B.sign('皇嶺站', 'n', z0 + 1.8, cx, 17.6, { size: 2.2, bg: '#1A2A4A', fg: '#FFFFFF', box: 1, lit: 1 });
    CK.door(B, cx, z0 - 1.2, 'hl_station', '走進皇嶺站（售票口：回東鶴、轉往他城）', '#5A8AC8', Math.PI);
    B.inter(cx - 10, z0 - 1.2, 2.4, '皇嶺站的時刻表', () => R.townTalk('皇嶺站的時刻表', ['往東鶴：每天六班（魔導電車，一天）', '往奉主：每小時一班', '往吉山、府廳：每天四班', '往北州（古森、岳北）：接西見的渡輪', '山嶺國際機場：接駁巴士在站前廣場的西邊']));
  }
  // ---- 向日塔：塔底的大樓＋細長的白塔、展望台（朝東）、紅白的天線 ----
  function tower(B, x, z) {
    const M = CK.M, g = B.g, P = B.part, TH = THREE;
    B.bld({ r: [x - 11, z - 9, x + 11, z + 9], h: 31.5, style: 'office', face: 'n', col: '#E8E4DC', top: false });
    const y0 = 32.3; B.box(M('white'), x - 11.2, 31.4, z - 9.2, x + 11.2, y0, z + 9.2);
    P(g.cyl24, M('white'), x, y0 + 30, z, 6, 60, 6); P(g.cone, M('white'), x, y0 + 4, z, 12, 8, 12);
    P(g.cyl24, M('white'), x, y0 + 58, z, 13, 7, 13); P(g.cyl24, M('glass'), x, y0 + 58.3, z, 13.2, 3.8, 13.2);
    P(g.cyl24, CK.mat('towerWin', { col: '#FFF0D0', em: '#FFE0A8', ei: 0, lamp: true, snow: 0 }), x, y0 + 58.3, z, 12.6, 3.6, 12.6);
    P(g.cyl24, M('white'), x, y0 + 62.5, z, 8, 2, 8); P(g.cone, M('red'), x, y0 + 64.5, z, 6.4, 2.4, 6.4);
    for (let i = 0; i < 6; i++) P(g.cyl8, i % 2 ? M('white') : M('red'), x, y0 + 66.5 + i * 2.2, z, 0.9 - i * 0.1, 2.2, 0.9 - i * 0.1);
    const beacon = new TH.Mesh(g.sph, CK.mat('beacon', { col: '#FF2A1A', em: '#FF2A1A', ei: 3, snow: 0 })); beacon.position.set(x, y0 + 80, z); beacon.scale.setScalar(0.8); B.group.add(beacon);
    W.town.anim.push((dt, t) => { beacon.visible = Math.sin(t * 3) > 0; });
    B.sign('向日塔', 'n', z - 9, x, 28, { size: 1.6, bg: '#E8E4DC', fg: '#B8202A', box: 1, lit: 1 });
    B.inter(x - 4, z - 10.4, 2.6, '觀光景點：向日塔（觀光章）', () => az().stamp('huangling', 'hl_tower'), '#E8C04A').sight = 'hl_tower';
    B.inter(x + 4, z - 10.4, 2.4, '登向日塔（15 費拉）', () => az().act('huangling'), '#E8A03A');
    CK.door(B, x + 9, z - 10.4, 'hl_cafe', '走進塔下喫茶「向日」', '#E8A03A', Math.PI);
    B.label('向日塔', x, z);
    // 飛機（山嶺國際機場）
    const pg = new TH.Group(), wm = CK.M('white'); [[0, 0, 0, 3, 3, 30], [0, 0, 2, 34, 0.4, 5], [0, 2.4, 13, 0.4, 5, 3], [0, 0.6, 13, 10, 0.3, 2.5]].forEach(([a, b, c, sx, sy, sz]) => { const m = new TH.Mesh(g.box, wm); m.position.set(a, b, c); m.scale.set(sx, sy, sz); pg.add(m); });
    B.group.add(pg); W.town.plane = { g: pg, t: 20 };
  }
  // ---- 外圍的城牆：高 14 公尺的斜石垣、上面的土塀、櫓；西門（向日通）、電車的門（東西）、向日川的水門（南） ----
  function outerWalls(B) {
    const H = 14, seg = (x0, z0, x1, z1, sides) => { B.ishigaki(x0, z0, x1, z1, 0, H, { batter: 0.28, top: 'gravel' }); B.dobei(x0, z0, x1, z1, H, { sides: sides || 'nesw', ins: 0.6 }); };
    // 南（z 196～205）：向日川的水門 x 148～172
    seg(-213, 196, 148, 205, 'nsw'); seg(172, 196, 213, 205, 'nse');
    // 西（x -213～-204）：西門 z 44～60、電車 z 169～183
    seg(-213, -169, -204, 44, 'we'); seg(-213, 60, -204, 169, 'we'); seg(-213, 183, -204, 196, 'we');
    // 東（x 204～213）：電車 z 169～183
    seg(204, -169, 213, 169, 'we'); seg(204, 183, 213, 196, 'we');
    // 門
    B.yaguraGate(-208.5, 52, Math.PI / 2, 14, H, { d: 10, name: '西門' });
    B.yaguraGate(-208.5, 176, Math.PI / 2, 12, H, { d: 10 }); B.yaguraGate(208.5, 176, Math.PI / 2, 12, H, { d: 10 });
    B.yaguraGate(160, 200.5, 0, 22, H, { d: 10, name: '向日水門' });
    // 角櫓（三層）、中間的櫓（二層）
    [[-208.5, 200.5], [208.5, 200.5]].forEach(([x, z]) => B.yagura(x, z, H, 3, 1.2));
    [-120, -40, 60].forEach(x => B.yagura(x, 200.5, H, 2, 1));
    [-110, -20, 110].forEach(z => { B.yagura(-208.5, z, H, 2, 1); B.yagura(208.5, z, H, 2, 1); });
    // 牆上的旗（裡面那一面）
    for (let x = -190; x <= 190; x += 38) { if (x > 140 && x < 180) continue; B.hata(x, H - 3.6, 195.0, Math.PI, 1.8, 4.2); }
    for (let z = -150; z <= 180; z += 40) { if (Math.abs(z - 52) < 12 || Math.abs(z - 176) < 12) continue; B.hata(-203.0, H - 3.6, z, Math.PI / 2, 1.8, 4.2); B.hata(203.0, H - 3.6, z, -Math.PI / 2, 1.8, 4.2); }
  }
  // ---- 遠景：四周的山（雪頂）、山脊上的山城 ----
  function mountains(B) {
    // 四面環山（南邊開一個口：平原、機場）；山脊上三座山城
    const hAt = CK.mountains(B, { r0: 680, r1: 2800, h: 420, seed: 11, low: [[Math.PI * 0.32, Math.PI * 0.68, 0.18]], snow: 250 });
    [[-Math.PI / 2, 900], [-Math.PI * 0.8, 960], [-Math.PI * 0.2, 940]].forEach(([a, rad]) => { const aa = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), x = Math.cos(a) * rad, z = Math.sin(a) * rad, y = hAt(aa, rad) - 3; B.box(CK.M('ishi'), x - 16, y - 10, z - 12, x + 16, y + 5, z + 12); B.yagura(x, z, y + 5, 3, 1.6); });
  }
})(window.R);
