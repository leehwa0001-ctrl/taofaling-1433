// 覺醒技能的威力（2026-10-05 作者：覺醒的技能都比原本爛）
// - 實測（像公會訓練場的木樁：正前方 2.2 公尺一隻＋3.2 公尺附近一群六隻，近戰也打得到、沒有牆擋；職業 44 級、★0；每招 12 秒）：
//   覺醒版（promote2.js，路線上等級最高的那一招 ×1.5）本身比原版強，但有些路線等級最高的那招剛好很弱（破魔師的千本、符術士的萬卷……），
//   覺醒版還是比路線上最強的原版弱；40／44 級學的新招（adv2plus.js）大多只有路線最強原版每秒傷害的一到八成（八方斬一成、萬卷不到一成）。
// - 照實測給每一招一個倍率，讓有傷害的覺醒技能「每秒傷害（÷冷卻）」至少是路線上最強原版的 1.3 倍：
//   乘在技能參數裡所有的 k（傷害＝力道 × k，組合技每一段都乘）。四面八方的招（八方斬、千影）測試只打到前面那群，倍率先除以 3；
//   吸生命的（鎮魂、咒殺）最多 ×4（回血也會跟著變多）、治療兼傷害的天使降臨最多 ×3、其他最多 ×6。
// - 純輔助、控場的不動：覺醒・狩獵時刻、不落、化身、大封印，鬥士的挑戰、萬咒、大天使之翼、八方結界、影之牢、定音一擊、魂鎖、結界牢籠、看穿、大封絕。
// - 新招照「路線:第幾招」對（舊路線換了職業的也一樣，例如戰士的內修者用武術家的內修者）；覺醒版說明裡的「威力 ×1.5」改成實際的倍率。
// 放在 promote2.js、adv2plus.js 後面。
(function (R) {
  const LIB = R.SKILL_LIB || {};
  const AW = { 'sn_one_aw': 1.35, 'mg_tri_aw': 1.75, 'bo_carpet_aw': 1.3, 'hm_thousand_aw': 2.25, 'on_rage_aw': 1.15, 'bi_light_aw': 2.55, 'sh_pillars_aw': 1.15, 'ks_mushin_aw': 1.45, 'sd_assassinate_aw': 1.3, 'dg_skyfall_aw': 1.15, 'fs_heaven_aw': 1.15, 'sm_mountain_aw': 2.25, 'in_burst_aw': 2.4, 'dm_finale_aw': 1.5, 'se_lock_aw': 2.55, 'md_requiem_aw': 4, 'ss_ryu_aw': 2.2, 'ga_final_aw': 2.1, 'ed_master_aw': 1.95, 'et_last_aw': 2.2, 'sr_master_aw': 6, 'nx_doom_aw': 1.75 };
  const A2 = { 'sniper:0': 1.8, 'sniper:1': 2.1, 'magigun:1': 1.65, 'bomber:0': 1.85, 'bomber:1': 2.5, 'arcane:0': 2.4, 'arcane:1': 1.15, 'ranger:0': 1.15, 'hama:0': 1.7, 'hama:1': 2.7, 'berserker:1': 1.6, 'gladiator:0': 1.1, 'elementalist:0': 1.85, 'elementalist:1': 2.7, 'hexer:1': 4, 'waixiu:0': 2.7, 'druid:0': 1.5, 'shinkan:1': 1.45, 'kensei:0': 3.3, 'kensei:1': 2.25, 'templar:1': 1.8, 'paladin:0': 1.55, 'paladin:1': 2.3, 'fistsaint:0': 1.2, 'fistsaint:1': 1.1, 'staffmonk:0': 1.8, 'staffmonk:1': 2.5, 'inner:0': 1.15, 'aria:1': 1.8, 'serane:0': 1.95, 'serane:1': 6, 'beastlord:0': 1.05, 'beastlord:1': 1.3, 'medium:0': 3.8, 'tamer:0': 2.05, 'shikigami:0': 4.5, 'shikigami:1': 3.65, 'grandarray:0': 1.5, 'grandarray:1': 1.6, 'eidanora:0': 2.5, 'eidanora:1': 2.1, 'runesmith:0': 2.25, 'runesmith:1': 1.25, 'entian:0': 1.65, 'scribe:0': 4.4, 'scribe:1': 2.1, 'sealer:0': 1.2 };
  const mulK = (o, m) => { if (!o || typeof o !== 'object') return; if (typeof o.k === 'number') o.k *= m; Object.keys(o).forEach(k => { if (k !== 'k' && o[k] && typeof o[k] === 'object') mulK(o[k], m); }); };
  const f1 = v => String(Math.round(v * 10) / 10);
  const done = new Set();   // 舊路線的新招在兩個職業共用同一份參數：只乘一次
  Object.keys(LIB).forEach(id => {
    const s = LIB[id]; if (!s || !s.p || done.has(s.p)) return;
    let m = AW[id] || 0;
    const a = /^a2_[a-z0-9]+_([a-z0-9]+)_(\d)$/.exec(id); if (a) m = A2[a[1] + ':' + a[2]] || 0;
    if (!(m > 1)) return;
    mulK(s.p, m); done.add(s.p);
    if (AW[id] && s.desc) { s.desc = s.desc.replace('威力 ×1.5', '威力 ×' + f1(1.5 * m)); if (R.SKILLS[id]) R.SKILLS[id].desc = s.desc; }
  });
  // 二轉畫面的說明：覺醒版不只 ×1.5 了
  const op0 = R.ADV2_OPTS;
  if (op0) R.ADV2_OPTS = cls => op0(cls).map(o => (o.id === 'awaken' && o.desc ? Object.assign({}, o, { desc: o.desc.replace('（威力 ×1.5）', '（威力 ×1.5 以上）') }) : o));
})(window.R);
