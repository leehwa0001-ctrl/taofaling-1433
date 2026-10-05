// 討伐令 1433：種族（登記時抽）
// 種族照《公會館員日誌》的種族表（出身地、族種）；長相照它的肖像規則（耳朵、膚色、角、翅膀……）。
// 稀有度：N、R、SR、SSR，還有一個藏起來的 UR：魔族。
// 魔族：加成很多很強，但東鶴的人怕牠們——店家不賣、路人躲開、同行的勇者大多不肯一起走，還會有私人賞金獵人追殺。
//  公會的分類是「神魔族」；登記過的會列為「受監視對象」，公會不受理針對智慧種的懸賞（所以追殺你的都是非法的私人懸賞）。
// 昭旭排外（國民黨「東鶴的飯碗，東鶴人自己端」）：越不像本地人，價錢越貴、閒話越多。戴上兜帽可以遮住（戒嚴那天會被盤查）。
(function (R) {
  const $ = id => document.getElementById(id);
  const esc = s => R.esc(s);
  R.TIERS = {
    N: { name: 'N', w: 50.4, color: '#B9BEC7' },
    R: { name: 'R', w: 31.4, color: '#62CB7E' },
    SR: { name: 'SR', w: 16, color: '#5BA8F2' },
    SSR: { name: 'SSR', w: 2, color: '#F2B64C' },
    UR: { name: 'UR', w: 0.2, color: '#E04A6A', hidden: 1 }   // 作者：降低機率（原本 0.6%）
  };
  // b：加成（hp、mp 是倍率；def 是加上去的防禦；speed、dmg、melee、magic、ranged 倍率；crit 暴擊率；critMult 暴擊傷害；dodge、skillCd 冷卻縮短；regen 每秒回復；calm 佩特拉的注意變慢；xp 經驗；vamp 吸血；ignite 點燃機率；thorns 反傷；guard 隊友少受傷；crystal 多掉魔力水晶；immune 免疫）
  // xeno：在東鶴被排擠的程度 0～3
  R.RACES = {
    human: { name: '大陸人族', tier: 'N', from: '地表平原・大陸族種', xeno: 0, skins: ['#F1C9A5', '#D9A47C', '#A8714D', '#7A4E33'], b: { xp: 0.1 }, line: '最常見的種族。學什麼都快。', look: {} },
    dog: { name: '犬人族', tier: 'N', from: '地表平原・獸人族種', xeno: 2, skins: ['#EFCFAE', '#DDB38E'], hairs: ['#B7874E', '#8B6238', '#D8B888'], b: { speed: 0.06, guard: 0.1 }, line: '垂耳的犬族。和同伴站在一起的時候特別可靠。', look: { ears: 'dog', tail: 'dog' } },
    cat: { name: '貓人族', tier: 'N', from: '地表高地・獸人族種', xeno: 2, skins: ['#F0CFAE', '#DDB08A'], b: { dodge: 0.2, crit: 0.04 }, line: '身手輕巧，翻滾回得快。', look: { ears: 'cat', tail: 'cat', whisk: 1 } },
    elf: { name: '精靈族', tier: 'R', from: '地表森林・精靈族種', xeno: 1, skins: ['#F4DCC4', '#EBD0B5'], hairs: ['#E9D8A6', '#C9C3B6', '#6B4A2E'], b: { mp: 0.2, skillCd: 0.1 }, line: '魔力多，技能轉得快。', look: { ears: 'elf' } },
    fox: { name: '狐人族', tier: 'R', from: '地表平原・獸妖族種', xeno: 2, skins: ['#F2D2B4'], hairs: ['#D2692A', '#E08A3C', '#EFE3D2'], b: { magic: 0.12, calm: 0.1 }, line: '對魔力質很敏感。法術打得重，也比較不容易被佩特拉注意。', look: { ears: 'fox', tail: 'fox' } },
    snowfox: { name: '雪狐族', tier: 'SR', from: '地表高地・獸妖族種', xeno: 2, skins: ['#F6E2D2', '#EED6C4'], hairs: ['#F4F2EE', '#E2E6EE', '#D8DCE6'], eye: '#5AA8E0', b: { magic: 0.1, mp: 0.1, immune: { slow: 1 } }, line: '雪白的狐耳和尾巴，天藍色的眼睛。寒氣凍不住，法術也打得重。', look: { ears: 'fox', tail: 'fox' } },
    wolf: { name: '狼人族', tier: 'R', from: '地表森林・獸人族種', xeno: 2, skins: ['#E6C4A2', '#CFA27E'], hairs: ['#6D6A66', '#3E3B38', '#A9A39A'], b: { hp: 0.1, melee: 0.1 }, line: '耐打，近身的時候最兇。', look: { ears: 'wolf', tail: 'wolf' } },
    sand: { name: '沙人族', tier: 'R', from: '地表沙漠・岩礦族種', xeno: 1, skins: ['#D8B98A', '#C9A673'], b: { def: 3, immune: { blind: 1 } }, line: '習慣風沙：砂幕蒙不了眼。', look: { hood: 1, hoodCol: '#C8A870' } },
    fin: { name: '鰭人族', tier: 'R', from: '淺海珊瑚礁區・鰭人族種', xeno: 1, skins: ['#7FB6B0', '#6AA3A8'], b: { regen: 0.5, immune: { slow: 1 } }, line: '傷口癒合得快，寒氣也凍不住。', look: { ears: 'fin', fin: 1, bald: 1 } },
    tree: { name: '樹人族', tier: 'R', from: '地表森林・植根族種', xeno: 1, skins: ['#8A6A48', '#7A5C3D'], hairCol: '#4E7A36', b: { hp: 0.18, regen: 0.6, speed: -0.05 }, line: '慢，但很難倒下。', look: { leaves: 1, ears: null } },
    blackstone: { name: '黑石族', tier: 'SR', from: '地下岩域・岩礦族種', xeno: 2, skins: ['#5E6168', '#4B4E55'], b: { def: 8, hp: 0.1, speed: -0.06 }, line: '石頭一樣的皮膚。', look: { rock: 1, bald: 1 } },
    winged: { name: '翼人族', tier: 'SR', from: '空島平原・翼人族種', xeno: 1, skins: ['#F3D6BC', '#E2B993'], b: { speed: 0.1, dodge: 0.25 }, line: '背上一對白色的翅膀，跑得快、閃得快。', look: { wings: 'feather' } },
    giant: { name: '巨人族', tier: 'SR', from: '地表高林・巨人族種', xeno: 1, skins: ['#C98E66', '#B27B55'], b: { hp: 0.3, dmg: 0.1, speed: -0.08 }, line: '又高又壯，打得重。', look: { beard: 1 } },
    flame: { name: '焰人族', tier: 'SR', from: '地表高山・氣流族種', xeno: 1, skins: ['#E39A5C', '#D88748'], hairCol: '#E85A2A', b: { dmg: 0.08, ignite: 0.15, immune: { burn: 1 } }, line: '頭髮是火。打到的東西有時會燒起來。', look: { flame: 1 } },
    lava: { name: '熔岩人族', tier: 'SR', from: '地下溶漿洞・流體族種', xeno: 2, skins: ['#3A2C2A'], b: { def: 5, thorns: 0.2, immune: { burn: 1 } }, line: '皮膚底下是熔岩。貼身打你的會被燙到。', look: { cracks: 1, bald: 1 } },
    phantom: { name: '幻魔族', tier: 'SR', from: '地表平原・擬態族種', xeno: 2, skins: ['#B9A6D6', '#A993C9'], hairs: ['#2B2340', '#E6E0F2'], b: { mp: 0.25, calm: 0.2 }, line: '頭頂一對小角。擅長擬態，佩特拉不太注意得到。', look: { ears: 'elf', horns: 'small' } },
    spider: { name: '節肢蛛人族', tier: 'SR', from: '地下岩穴・節肢人族種', xeno: 2, skins: ['#9A8D86', '#857873'], hairs: ['#1A1A1A', '#3B3030'], b: { crit: 0.08, critMult: 0.25 }, line: '四隻眼睛，總是看得到要害。', look: { eyes4: 1 } },
    crystal: { name: '黑水晶族', tier: 'SSR', from: '深域結晶皇宮・晶體族種', xeno: 2, skins: ['#4B3B66', '#3C2F55'], hairCol: '#1E1830', b: { mp: 0.3, skillCd: 0.2, crystal: 0.5 }, line: '額頭上長著水晶。採集魔力水晶時有額外收穫。', look: { gem: 1 } },
    // 2026-10-02 加的 SSR（作者選的）：族種照《智慧生物》的 4 系 38 族種
    vampire: { name: '吸血人族', tier: 'SSR', from: '地表荒原・吸血族種', xeno: 2, skins: ['#EDE2DC', '#E2D4CE'], hairs: ['#1A1418', '#3A1A22', '#D8D4D8'], eye: '#C8323A', b: { vamp: 0.03, critMult: 0.2, night: 0.15, hp: -0.05 }, line: '蒼白的皮膚、紅眼睛、一對小尖牙。打中會吸血；晚上出發的遺跡打得更兇。', look: { ears: 'elf', fangs: 1 } },
    shade: { name: '暗影族', tier: 'SSR', from: '地下靈魂迴廊・光影族種', xeno: 2, skins: ['#3E3A4C', '#322E40'], hairs: ['#141018', '#2A2438'], eye: '#B8E0FF', b: { dodge: 0.3, back: 0.25, calm: 0.15 }, line: '身上飄著影子，眼睛發著淡藍的光。閃得快，從背後下手特別重，佩特拉也不太注意得到。', look: { wisp: 1 } },
    golddragon: { name: '金龍人族', tier: 'SSR', from: '地下礦脈・岩龍族種', xeno: 2, skins: ['#D8B048', '#C89A38'], b: { def: 6, hp: 0.2, ore: 0.6 }, line: '金色的鱗片和龍角，和龍人族是不同的族種。鱗片堅硬，掘礦時有機會多獲得一塊礦石。', look: { horns: 'dragon', tail: 'dragon', scales: 1, bald: 1, crest: 1 } },
    dragon: { name: '龍人族', tier: 'SSR', from: '地表山地・節鱗族種', xeno: 2, skins: ['#C8553F', '#B2463A'], b: { hp: 0.2, dmg: 0.15, def: 4, immune: { burn: 1 } }, line: '鱗片、角、尾巴。很少見。', look: { horns: 'dragon', tail: 'dragon', scales: 1, bald: 1, crest: 1 } },
    demon: { name: '魔族', tier: 'UR', from: '魔界・克拉克特斯（公會分類：神魔族）', xeno: 3, skins: ['#E8D8E0', '#C8B8D0'], hairs: ['#14101A', '#E8E4F0'], eye: '#C8323A',
      b: { hp: 0.15, mp: 0.2, dmg: 0.12, def: 2, vamp: 0.01, skillCd: 0.1, regen: 0.4, calm: 0.1 },   // 作者：削弱（原本生命、傷害各 +30%）
      line: '翅膀、黑色雙角。人界的人怕你：店家不賣你東西、路人躲著走、私人賞金獵人會來找你。公會把你列為「受監視對象」——但也只有公會不准任何人討伐你。', look: { horns: 'demon', wings: 'demon' } }   // 作者：拿掉光環
  };
  // 混血：勇者證的註名本來就有「混血與否」這一欄（公會的勇者大約三成是混血）
  // 長相淡一點（留耳朵、角變小；尾巴、鱗片、四隻眼睛之類的沒有），加成減半，再多一點大陸人族那邊的學習力；
  // 看起來比較像本地人，閒話少一級
  const mixHex = (a, b) => '#' + [1, 3, 5].map(i => Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, '0')).join('');
  const HALF = ['hp', 'mp', 'speed', 'dmg', 'melee', 'magic', 'crit', 'critMult', 'dodge', 'skillCd', 'regen', 'calm', 'xp', 'vamp', 'ignite', 'thorns', 'guard', 'crystal', 'night', 'back', 'ore'];
  Object.keys(R.RACES).forEach(id => {
    const r = R.RACES[id]; if (id === 'human' || id === 'demon') return;
    const b = { xp: 0.05 };
    HALF.forEach(k => { if (r.b[k]) b[k] = Math.round(((b[k] || 0) + r.b[k] / 2) * 100) / 100; });
    if (r.b.def) b.def = Math.max(1, Math.round(r.b.def / 2));
    const L = Object.assign({}, r.look);
    ['tail', 'scales', 'eyes4', 'rock', 'cracks', 'flame', 'whisk', 'beard', 'crest', 'halo', 'fin', 'hood', 'hoodCol', 'bald', 'wisp'].forEach(k => { delete L[k]; });
    if (L.horns) L.horns = 'small';
    const hairs = (r.hairs || (r.hairCol ? [r.hairCol] : [])).concat(['#2A1E16', '#5A3B24', '#8B5A2B']);
    R.RACES[id + '_m'] = { name: r.name + '（混血）', tier: r.tier, w: 0.43, mixed: id, from: r.from + '・混血', xeno: Math.max(0, r.xeno - 1), skins: r.skins.map(s => mixHex(s, '#E6BE98')), hairs, eye: r.eye, b, line: '雙親有一邊是' + r.name + '。長相淡一點，' + r.name + '的本事只有一半，學東西倒是比較快。', look: L };
  });
  R.RACE_IDS = Object.keys(R.RACES);
  R.raceOf = () => (R.S && R.S.race ? R.RACES[R.S.race] : null);
  // 長相（給 sprites.js）
  R.raceLook = id => { const r = R.RACES[id]; if (!r) return null; return Object.assign({ skins: r.skins, hairCol: r.hairCol, eye: r.eye }, r.look); };
  // 加成的說明文字
  const PCT = v => Math.round(v * 100) + '%';
  R.raceBonusText = id => {
    const b = R.RACES[id].b, out = [];
    if (b.hp) out.push('生命 ' + (b.hp > 0 ? '+' : '') + PCT(b.hp)); if (b.mp) out.push('魔力 +' + PCT(b.mp)); if (b.def) out.push('防禦 +' + b.def);
    if (b.speed) out.push('移動 ' + (b.speed > 0 ? '+' : '') + PCT(b.speed)); if (b.dmg) out.push('傷害 +' + PCT(b.dmg)); if (b.melee) out.push('近戰傷害 +' + PCT(b.melee));
    if (b.magic) out.push('法術傷害 +' + PCT(b.magic)); if (b.crit) out.push('暴擊率 +' + PCT(b.crit)); if (b.critMult) out.push('暴擊傷害 +' + PCT(b.critMult));
    if (b.dodge) out.push('翻滾冷卻 −' + PCT(b.dodge)); if (b.skillCd) out.push('技能冷卻 −' + PCT(b.skillCd)); if (b.regen) out.push('每秒回復生命 ' + b.regen);
    if (b.calm) out.push('佩特拉的注意 −' + PCT(b.calm)); if (b.xp) out.push('經驗值 +' + PCT(b.xp)); if (b.vamp) out.push('吸血系數 +' + Math.round(b.vamp * 2000));   // vampproc.js：吸血 1% ＝ 系數 20
    if (b.ignite) out.push(PCT(b.ignite) + ' 機率點燃'); if (b.thorns) out.push('貼身反傷 ' + PCT(b.thorns)); if (b.guard) out.push('隊友受到的傷害 −' + PCT(b.guard));
    if (b.night) out.push('晚上出發的遺跡傷害 +' + PCT(b.night)); if (b.back) out.push('從背後打傷害 +' + PCT(b.back)); if (b.ore) out.push('掘礦多一塊的機率 ' + PCT(b.ore));
    if (b.crystal) out.push('魔力水晶 +' + PCT(b.crystal)); if (b.immune) out.push('不怕' + Object.keys(b.immune).map(k => ({ blind: '砂幕', slow: '寒氣減速', burn: '燃燒' })[k]).join('、'));
    return out;
  };
  R.XENO_TEXT = ['東鶴的人把你當自己人。', '有人會多看你兩眼；有些店收「外地人價」（貴一成）。', '昭旭排外：很多店收貴兩成，有人當面說難聽的話。', '整座城都怕你：大部分店不賣你東西，路人會躲開，私人賞金獵人會來找你。'];

  // ---------- 抽 ----------
  R.drawRace = () => {
    const tiers = Object.keys(R.TIERS), tot = tiers.reduce((a, t) => a + R.TIERS[t].w, 0);
    let r = Math.random() * tot, tier = 'N';
    for (const t of tiers) { r -= R.TIERS[t].w; if (r <= 0) { tier = t; break; } }
    const list = R.RACE_IDS.filter(id => R.RACES[id].tier === tier), tw = list.reduce((a, id) => a + (R.RACES[id].w || 1), 0);
    let q = Math.random() * tw;
    for (const id of list) { q -= R.RACES[id].w || 1; if (q <= 0) return id; }
    return list[list.length - 1];
  };
  // 抽種族的畫面：最多抽 4 次，從抽到的裡面選一個登記（host：放進哪個元素；done(id)：選好了）
  // o.ten：開局的連抽（2026-10-04 作者：開局改為 50 連抽；原本十連）——按一次抽五十個，從裡面選一個；卡片照稀有度排（最稀有的在前面），下面是選中那一族的說明
  R.raceGacha = (host, done, o) => {
    o = o || {}; const got = [], MAX = o.ten ? 50 : o.max || 4, TIER_I = Object.keys(R.TIERS);
    const rates = '<div class="rates">' + Object.keys(R.TIERS).map(t => { const T0 = R.TIERS[t], names = R.RACE_IDS.filter(id => R.RACES[id].tier === t && !R.RACES[id].mixed).map(id => R.RACES[id].name); return '<div class="rate" style="--c:' + T0.color + '"><b>' + T0.name + '</b><span>' + T0.w + '%</span><small>' + (T0.hidden ? '？？？' : esc(names.length > 12 ? names.slice(0, 10).join('、') + '……等 ' + names.length + ' 種' : names.join('、'))) + '</small></div>'; }).join('') + '</div><p class="note">每一族都有大約三成是混血（勇者證上註名「混血」）：長相淡一點、加成減半、經驗多一點、閒話少一些。</p>';
    const card = (id, i) => { const r = R.RACES[id], T0 = R.TIERS[r.tier]; return '<button type="button" class="race-card' + (o.pick === i ? ' sel' : '') + '" data-pick="' + i + '" style="--c:' + T0.color + '"><span class="tier">' + T0.name + '</span><b>' + esc(r.name) + '</b><small>' + esc(r.from) + '</small><span>' + esc(r.line) + '</span><em>' + esc(R.raceBonusText(id).join('・')) + '</em><i>' + esc(R.XENO_TEXT[r.xeno]) + '</i></button>'; };
    const detail = id => { const r = R.RACES[id], T0 = R.TIERS[r.tier]; return '<div class="race-card race-detail" style="--c:' + T0.color + '"><span class="tier">' + T0.name + '</span><b>' + esc(r.name) + '</b><small>' + esc(r.from) + '</small><span>' + esc(r.line) + '</span><em>' + esc(R.raceBonusText(id).join('・')) + '</em><i>' + esc(R.XENO_TEXT[r.xeno]) + '</i></div>'; };
    const render = () => {
      const drawBtn = o.ten ? (got.length ? '' : '<button type="button" class="btn pri" id="rg-draw">五十連抽</button>')
        : '<button type="button" class="btn pri" id="rg-draw"' + (got.length >= MAX ? ' disabled' : '') + '>' + (got.length ? '再抽一次（還剩 ' + (MAX - got.length) + ' 次）' : '抽') + '</button>';
      host.innerHTML = '<h2>' + (o.title || '種族登記') + '</h2><p class="note">' + esc(o.intro || (o.ten ? '勇者證上要寫種族。你是哪一族？五十連抽一次，從抽到的五十個裡面選一個登記（最稀有的排在最前面）。' : '勇者證上要寫種族。你是哪一族？最多抽 ' + MAX + ' 次，從抽到的裡面選一個登記。')) + '</p>' + rates
        + '<div class="race-cards' + (o.ten ? ' ten' : '') + '">' + (got.length ? got.map(card).join('') : '<p class="note">還沒抽。</p>') + '</div>'
        + (o.ten && o.pick != null ? detail(got[o.pick]) : '')
        + '<div class="row">' + drawBtn
        + (o.pick != null ? '<button type="button" class="btn gold" id="rg-ok">登記為「' + esc(R.RACES[got[o.pick]].name) + '」</button>' : '') + (o.cancel ? '<button type="button" class="btn" id="rg-x">先不要</button>' : '') + '</div>';
      if ($('rg-draw')) $('rg-draw').onclick = () => {
        if (got.length >= MAX) return;
        const n = o.ten ? MAX - got.length : 1, from = got.length;
        for (let k = 0; k < n; k++) got.push(R.drawRace());
        // 連抽：照稀有度排（最稀有的在前面），先選中第一張
        o.pick = got.length - 1; if (o.ten) { got.sort((a, b) => TIER_I.indexOf(R.RACES[b].tier) - TIER_I.indexOf(R.RACES[a].tier)); o.pick = 0; }
        render();
        for (let i = from; i < got.length; i++) {
          const el = host.querySelector('[data-pick="' + i + '"]'), r = R.RACES[got[i]], d = (i - from) * (n > 10 ? 0.03 : 0.09), rare = r.tier === 'SSR' || r.tier === 'UR'; if (!el) continue;
          el.style.animationDelay = rare ? d + 's, ' + (d + 0.5) + 's' : d + 's'; el.style.animationFillMode = 'backwards'; el.classList.add('flip'); if (rare) el.classList.add('shine');
        }
      };
      host.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => { o.pick = +b.dataset.pick; render(); }; });
      if ($('rg-ok')) $('rg-ok').onclick = () => done(got[o.pick]);
      if (o.cancel && $('rg-x')) $('rg-x').onclick = o.cancel;
    };
    render();
  };

  // ---------- 加成套進玩家的數值 ----------
  const cp = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp(cls), r = R.raceOf(); if (!r) return P;
    const b = r.b;
    if (b.hp) P.hpMax = Math.round(P.hpMax * (1 + b.hp)); if (b.mp) P.mpMax = Math.round(P.mpMax * (1 + b.mp));
    if (b.def) P.def += b.def; if (b.speed) P.speed *= 1 + b.speed; if (b.dmg) P.dmgMult *= 1 + b.dmg;
    const k = P.ws.kind;
    if (b.melee && (k === 'melee' || k === 'thrust')) P.ws.dmg *= 1 + b.melee;
    if (b.magic && k === 'magic') P.ws.dmg *= 1 + b.magic;
    if (b.crit) P.ws.crit += b.crit; if (b.critMult) P.critMult += b.critMult;
    if (b.dodge) P.dodgeCdMax *= 1 - b.dodge; if (b.skillCd) P.skillCdMult *= 1 - b.skillCd;
    if (b.regen) P.regen += b.regen; if (b.calm) P.calm += b.calm;
    // 吸血人族：晚上（7 點到清晨 5 點）出發的遺跡打得更兇（daytime.js 的時間）
    if (b.night && R.hourNow) { const h = R.hourNow() % 24; if (h >= 19 || h < 5) P.dmgMult *= 1 + b.night; }
    P.race = R.S.race; P.raceB = b; P.immune = b.immune || {};
    // 同行的戀人：多一點力氣（people.js 設定）
    if (R.partyBond) R.partyBond(P);
    return P;
  };
  const gx = R.gainXp;
  R.gainXp = v => { const r = R.raceOf(); gx(r && r.b.xp ? Math.round(v * (1 + r.b.xp)) : v); };
  const he = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P0 = R.W.P, b0 = P0 && P0.raceB;
    // 暗影族：從背後打（站在遺跡生物面向的反方向）
    if (b0 && b0.back && e && !e.dead && e.yaw != null) { const a = Math.atan2(P0.x - e.x, P0.z - e.z) - e.yaw; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > 2.1) raw *= 1 + b0.back; }
    const d = he(e, raw, o), P = R.W.P, b = P && P.raceB;
    if (b && d > 0) { if (b.vamp && !R.vampProc) R.healP(d * b.vamp, true); if (b.ignite && o && o.primary && Math.random() < b.ignite && !e.dead) e.st.burn = 3; }
    return d;
  };
  const hp = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const P = R.W.P, b = P && P.raceB;
    if (b && b.immune && o) { o = Object.assign({}, o); if (b.immune.blind) o.blind = 0; if (b.immune.slow) o.slow = 0; }
    const before = P ? P.hp : 0; hp(raw, src, o);
    if (b && b.thorns && src && src.hp && !src.dead && P && P.hp < before && Math.hypot(src.x - P.x, src.z - P.z) < 2.6) { src.hp -= raw * b.thorns; R.num(src.x, 1.8 * src.def.size + 0.6, src.z, Math.round(raw * b.thorns), 'ally'); if (src.hp <= 0) R.killEnemy(src); }
  };
  const ha = R.hurtAlly;
  R.hurtAlly = (a, raw, src) => { const r = R.raceOf(); ha(a, r && r.b.guard ? raw * (1 - r.b.guard) : raw, src); };
  const ke = R.killEnemy;
  R.killEnemy = (e, by) => { const wasDead = e.dead; ke(e, by); const r = R.raceOf(); if (!wasDead && r && r.b.crystal && !e.def.human && Math.random() < 0.34 * r.b.crystal) R.dropMat('crystal', 1, e.x, e.z); };

  // 金龍人族：掘礦常多敲下一塊
  const mn = R.mine;
  if (mn) R.mine = o => { mn(o); const r = R.raceOf(); if (r && r.b.ore && Math.random() < r.b.ore) { R.dropMat(Math.random() < 0.3 ? 'manaore' : 'iron', 1, o.x, o.z); R.toast('多敲下了一塊礦石'); } };

  // ---------- 排外 ----------
  // 戴著兜帽：看不出種族（戒嚴那天衛兵會要你拿下來）
  R.hoodOn = () => !!(R.S && R.S.hood && R.S.hoodOn);
  R.xenoLevel = () => { const r = R.raceOf(); if (!r) return 0; if (R.hoodOn() && !(R.eventsToday && R.eventsToday().martial)) return 0; return r.xeno; };
  // 店家的價錢倍率（null：不賣）；老岩只看東西不看人
  R.priceMul = shop => { const x = R.xenoLevel(); if (shop === 'smith' || shop === 'guild') return 1; if (x >= 3) return shop === 'suga' ? 1 : null; return 1 + [0, 0.1, 0.2][x]; };
  R.isDemon = () => !!(R.S && R.S.race === 'demon');
  // 玩家自己：捏角的外觀＋種族＋兜帽
  R.playerLook = () => { const S = R.S; if (!S) return null; return Object.assign({}, S.look || {}, { race: S.race, hood: R.hoodOn() }); };
})(window.R);
