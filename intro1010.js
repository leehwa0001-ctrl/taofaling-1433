// 公會轉職畫面的介紹不講數值（2026-10-10 作者：介紹時用省略的語氣大概講技能特色，不要直接談數值——「攻速更快」而不是「攻速 +30%」）
// - 一轉的卡片：hub.js 改用 classinfo.js 的 R.ADV_INTRO（「？」說明裡那份路線介紹）。
// - 二轉的選項（promote2.js 的畫面，R.ADV2_OPTS 的 desc）：覺醒、每個職業自己的二轉、術士的諧鳴，改成講特色；
//   新技能、新被動的名字照原本說明裡的「」抓出來，精確的數字在技能書、被動列表裡看。
// 放在 promote2.js、adv2more.js、adv2plus.js、souyu.js、haste.js、awakenbal.js 後面（最外層的 R.ADV2_OPTS）。
(function (R) {
  const op0 = R.ADV2_OPTS; if (!op0) return;
  const AWAKEN = '沿著原本的轉職路線再往上：整體更強，路線上最強的那一招多一個更猛的「覺醒」版。每條路線的覺醒都不一樣——多一個常駐的特殊效果、兩招新技能和一個新被動。';
  // [這個二轉的特色, 新被動的特色]
  const SP = {
    gunner: ['更容易暴擊、射得更快', '打倒敵人順手補子彈，暴擊更痛'],
    archer: ['更容易暴擊、打得更痛', '遠處的目標打得更痛，打倒敵人技能轉得更快'],
    warrior: ['更耐打、打得更痛', '更耐打，貼身的敵人打得更痛'],
    priest: ['更耐打，還會慢慢回血', '治療更強，打倒敵人得到護盾'],
    blade: ['更容易暴擊，暴擊更痛', '先手的一刀和翻滾後的一擊特別痛'],
    knight: ['更硬、更耐打', '被打會把傷害還回去，受到的傷害更少'],
    monk: ['出拳更快、更耐打；勢滿了自動換法，每一法的增益更強', '貼身的敵人打得更痛，打倒敵人回一點血'],
    bard: ['技能轉得更快、魔力更多', '打倒敵人技能轉得更快，魔力慢慢回來，打得更痛'],
    summoner: ['打得更痛、魔力更多', '召喚物更兇、待得更久'],
    arraymage: ['法術更強、技能轉得更快', '法彈炸得更大，技能更痛'],
    enchanter: ['打得更痛，更能無視護甲', '打身上有異常狀態的敵人更痛，普攻有時會點燃'],
    scroll: ['法術更強、技能轉得更快', '打倒敵人技能轉得更快，魔力更多，技能更痛']
  };
  const HARMONIC = '用共振圍出閉環的「奏域」，在裡面改寫法術的頻率。學會「奏域」，練得越高，能選的諧鳴越多（共鳴、鎮頻、定頻、轉調……）。平常也更會用法術：法術更強、魔力更多、技能轉得更快。';
  const learnOf = d => { const m = /學會((?:「[^」]+」)+)/.exec(String(d || '')); return m ? m[1] : ''; };
  const passiveOf = d => { const m = /新被動「([^」]+)」/.exec(String(d || '')); return m ? m[1] : ''; };
  R.ADV2_OPTS = cls => (op0(cls) || []).map(o => {
    if (!o) return o;
    let desc = null;
    if (o.id === 'awaken') desc = AWAKEN;
    else if (o.id === 'harmonic') desc = HARMONIC;
    else if (o.id === 'sp' && SP[cls]) { const t = SP[cls], sk = learnOf(o.desc), pv = passiveOf(o.desc); desc = o.name + '：' + t[0] + '。' + (sk ? '學會' + sk + '。' : '') + (pv ? '新被動「' + pv + '」：' + t[1] + '。' : ''); }
    return desc ? Object.assign({}, o, { desc, descFull: o.desc }) : o;
  });
})(window.R);
