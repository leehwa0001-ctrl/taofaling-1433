// 種族的主動技能（2026-10-04 作者：有些種族也可以有多一個主動技能之類的）
// - 一部分族種（看種族資料的 from）多一招種族技能：遺跡裡按 T（按鍵設定「種族技能」可以改），冷卻 40 秒、不花魔力。
//   技能用 skillbook.js 的「型」組出來，威力照手上的武器算（R.SKILL_KIT.power）。
// - 種族一覽、勇者證的加成說明會多一行「種族技能」。遺跡裡左上角顯示技能和冷卻。
// - 城裡按 T 照舊是快速移動（fasttravel.js）。
// 放在 skillbook.js、racebal.js、keybinds.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id);
  const CD = 40;
  // [族種關鍵字, 名字, 型, 參數, 說明]
  const LIST = [
    [['岩龍族種', '龍人'], '龍息', 'breath', { t: 1.4, tick: 0.15, range: 5.5, arc: 0.9, k: 0.55, burn: 1, color: '#FF8A3A' }, '往前噴一口龍焰，燒傷前方的敵人。'],
    [['翼人族種', '雲翼族種'], '振翅', 'blink', { range: 7, iframe: 0.4, end: { r: 2.6, k: 1.2, kb: 3, color: '#DDF2FF' } }, '展翅飛到準心處，落地的風壓把周圍的敵人吹開。'],
    [['吸血族種', '血族種'], '血之渴望', 'drain', { range: 9, r: 2.8, k: 1.8, heal: 0.6 }, '吸取準心附近敵人的血：傷害的 60% 變成你的生命。'],
    [['巨人族種', '巨像族種'], '震地', 'nova', { r: 4, k: 1.6, stun: 1.2, kb: 2, color: '#C8A878' }, '用全身的重量踏地：周圍的敵人暈眩、被震開。'],
    [['精靈族種', '妖精族種', '植精族種'], '精靈之光', 'heal', { pct: 0.25, allies: 0.2, color: '#BFF0B0' }, '借森林的光：你回復 25% 生命，隊友回復 20%。'],
    [['光影族種', '化形族種', '擬態族種'], '隱身', 'at', { range: 0.1, r: 2.6, k: 0.2, slow: 2, invis: 3, fx: 'poof', color: '#3A3A4A' }, '融進影子裡：隱身 3 秒，身邊的敵人變慢。'],
    [['鰭人族種', '兩棲族種'], '激流', 'wave', { n: 6, step: 1.8, r: 1.6, k: 1, kb: 2.5, gap: 60, fx: 'ring', color: '#5FC8E0' }, '捲起一道激流往前沖，把敵人沖開。'],
    [['晶體族種'], '晶刺', 'shots', { n: 7, spread: 1.2, k: 1, kind: 'cold', sp: 22 }, '從身上射出七根晶刺。'],
    [['岩礦族種', '穴甲族種', '節鱗族種'], '硬化', 'guard', { t: 1.6, color: '#A8A49A' }, '皮膚一瞬間變得像岩石：1.6 秒內不受傷。'],
    [['節肢人族種', '蟲型族種', '繁肢族種'], '毒刺', 'line', { len: 6, width: 0.8, k: 2, curse: 6, color: '#8AC83A' }, '一刺穿過一排，被刺中的敵人中毒（受到的傷害 +30%）。'],
    [['獸人族種', '獸妖族種'], '野性咆哮', 'buff', { t: 8, dmg: 1.2, speed: 1.15, color: '#C8A878' }, '一聲咆哮：8 秒內傷害 +20%、移動 +15%。'],
    [['神魔族'], '魔焰', 'at', { range: 10, r: 3, k: 2, burn: 1, delay: 200, fx: 'boom', color: '#8A2AC8' }, '在準心處點起魔界的火焰。']
  ];
  const of = id => { const r = id && R.RACES[id]; if (!r) return null; const src = (r.from || '') + '|' + (r.name || ''); return LIST.find(x => x[0].some(k => src.includes(k))) || null; };
  R.raceSkillOf = of;
  let cd = 0;
  const cast = () => {
    const w = W(), run = w.run, P = w.P, s = S(); if (!run || run.done || w.paused || !P || P.dead || !s) return;
    const sk = of(s.race); if (!sk) return;
    if (cd > 0) { R.toast && R.toast('種族技能「' + sk[1] + '」還要 ' + Math.ceil(cd) + ' 秒。'); return; }
    const T = R.SKILL_TYPES && R.SKILL_TYPES[sk[2]]; if (!T) return;
    const pw = R.SKILL_KIT && R.SKILL_KIT.power && P.ws ? R.SKILL_KIT.power(P.ws) : 20;
    try { T(Object.assign({ _id: 'race' }, sk[3]), P, w, pw); } catch (e) { console.warn('[racial]', e); return; }
    cd = CD; R.num && R.num(P.x, 2.4, P.z, sk[1], 'heal');
  };
  R.castRaceSkill = cast;
  window.addEventListener('keydown', e => { if (e.repeat || (e.key || '').toLowerCase() !== 't' || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return; const run = $('run'); if (!run || run.hidden || !W().run) return; cast(); });
  // 冷卻、左上角
  const st0 = R.step; let hudT = 0;
  R.step = dt => {
    st0(dt); if (cd > 0 && W().run && !W().paused) cd -= dt;
    hudT -= dt; if (hudT > 0) return; hudT = 0.4;
    const w = W(), s = S(), sk = s && of(s.race); let el = $('r-race');
    if (!w.run || w.run.done || !sk) { if (el) el.hidden = true; return; }
    if (!el) { const tl = $('r-tl'); if (!tl) return; el = document.createElement('div'); el.id = 'r-race'; el.className = 'glass dungeon-only r-misc'; el.style.cursor = 'pointer'; el.onclick = () => R.toast && R.toast('種族技能「' + sk[1] + '」：' + sk[4]); tl.appendChild(el); }
    el.hidden = false; el.innerHTML = '種族技能 <b>' + sk[1] + '</b>（' + (R.keyName ? R.keyName('race') : 'T') + '）' + (cd > 0 ? '・' + Math.ceil(cd) + ' 秒' : '・<b style="color:#7AE0A0">好了</b>');
  };
  const lf0 = R.loadFloor; R.loadFloor = (f, o) => { const r = lf0(f, o); if (f === 0 || (W().run && W().run.floor === 0)) cd = 0; return r; };
  // 加成說明：多一行種族技能
  const bt0 = R.raceBonusText;
  R.raceBonusText = id => { const out = bt0 ? bt0(id) : [], sk = of(id); if (sk) out.push('種族技能「' + sk[1] + '」（' + (R.keyName ? R.keyName('race') : 'T') + '，冷卻 ' + CD + ' 秒）：' + sk[4]); return out; };
})(window.R);
