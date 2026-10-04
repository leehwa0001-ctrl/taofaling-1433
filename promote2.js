// 二次轉職（2026-10-04 作者：新增一個二次轉職，也可以上架諧鳴為法師的二轉的派系，諧鳴有五種派系）
// - 條件：職業等級 40、已經轉職、公會段位討伐段以上、通過二轉試煉（報名後帶著委託下遺跡，用這個武器類別打倒一隻領主體），
//   再交魔力核心 3 顆、高純度魔力水晶 2 個。存在 R.S.classes[職業]：trial2（1＝報名了、2＝通過了）、adv2（選了哪一個）。
// - 選項：
//   覺醒（每個職業都有）：走原本的轉職路線再往上——傷害 +12%、生命 +10%、技能冷卻 −8%；
//     路線上最強的那一招多一個「覺醒」版（威力 ×1.5），40 級學會。
//   諧鳴（術士）：諧鳴有五個派系，公會目前只登錄了「瑟蘭派」（《法術統整》第四項第一節）——
//     用共振圍出「奏域」、改寫法術的頻率：奏域、共鳴、鎮頻、共振、轉調、定頻六招（40～45 級學會）；
//     魔法傷害 +10%、魔力 +15%、技能冷卻 −5%。其他四個派系等作者的設定。
// - 選過以後可以重選（交 1 顆魔力核心）。技能書多一段「二次轉職」（skillbook.js）。
// 放在 promote.js、skillbook.js、skills3.js、classes2b.js、dmgtype.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const LV = 40, COST = { core: 3, purecry: 2 };
  const LIB = R.SKILL_LIB || {};
  const scaleK = p => { const q = JSON.parse(JSON.stringify(p || {})); const f = o => { if (!o || typeof o !== 'object') return; if (typeof o.k === 'number') o.k *= 1.5; Object.values(o).forEach(f); }; f(q); return q; };
  // ---------- 覺醒技：每條路線最強的那一招 ×1.5 ----------
  const AW = {};
  R.CLASS_IDS.forEach(cls => (R.ADV[cls] || []).filter(a => !a.legacy).forEach(a => {
    const own = Object.values(LIB).filter(s => s.cls === cls && s.adv === a.id && !s.adv2).sort((x, y) => y.lv - x.lv)[0]; if (!own) return;
    const id = own.id + '_aw', desc = '（二轉・覺醒）' + own.desc + '威力 ×1.5。';
    LIB[id] = { id, name: '覺醒・' + own.name, cls, lv: LV, cd: own.cd, mp: Math.round(own.mp * 1.25), type: own.type, p: scaleK(own.p), desc, adv: a.id, adv2: 'awaken' };
    R.SKILLS[id] = { name: '覺醒・' + own.name, cd: own.cd, mp: Math.round(own.mp * 1.25), desc }; AW[cls + ':' + a.id] = id;
  }));
  // ---------- 諧鳴（瑟蘭派）：術士用的奏域技能 ----------
  const HM = Object.values(LIB).filter(s => s.cls === 'bard' && s.adv === 'serane' && !s.adv2).sort((x, y) => x.lv - y.lv).map((s, i) => {
    const id = 'hm_' + s.id.replace(/^se_/, ''), desc = '（二轉・諧鳴・瑟蘭派）' + s.desc;
    LIB[id] = { id, name: s.name, cls: 'mage', lv: LV + i, cd: s.cd, mp: s.mp, type: s.type, p: JSON.parse(JSON.stringify(s.p)), desc, adv2: 'harmonic' };
    R.SKILLS[id] = { name: s.name, cd: s.cd, mp: s.mp, desc }; return id;
  });
  const OPTS = cls => [{ id: 'awaken', name: '覺醒', desc: '走原本的轉職路線再往上：傷害 +12%、生命 +10%、技能冷卻 −8%。路線上最強的那一招多一個「覺醒」版（威力 ×1.5）。' }]
    .concat(cls === 'mage' && HM.length ? [{ id: 'harmonic', name: '諧鳴・瑟蘭派', desc: '諧鳴有五個派系，公會目前只登錄了瑟蘭派：用共振圍出閉環的「奏域」，在裡面改寫法術的頻率。學會' + HM.map(id => '「' + R.SKILLS[id].name + '」').join('') + '（40～' + (LV + HM.length - 1) + ' 級）。魔法傷害 +10%、魔力 +15%、技能冷卻 −5%。' }] : []);
  R.ADV2_OPTS = OPTS;   // adv2more.js 會包住它，加每個職業自己的二轉、諧鳴的其他派系
  const optName = (cls, id) => { const o = R.ADV2_OPTS(cls).find(x => x.id === id); return o ? o.name : ''; };
  // ---------- 技能書：學會的條件 ----------
  const nl0 = R.skillNeedLv;
  R.skillNeedLv = (sk, st) => (sk && sk.adv2 ? (st && st.adv2 === sk.adv2 && (!sk.adv || sk.adv === st.adv) ? sk.lv : 999) : nl0(sk, st));
  R.adv2Req = (s, st) => '二次轉職：' + (optName(s.cls, s.adv2) || '覺醒') + '・Lv ' + s.lv;
  R.adv2Title = (cls, st) => '二次轉職' + (st.adv2 ? '・' + optName(cls, st.adv2) + '（你選的）' : '（職業等級 ' + LV + '、轉職以後）');
  // ---------- 名字、數值 ----------
  const cn0 = R.clsName;
  R.clsName = cls => { const n = cn0(cls), st = S() && S().classes[cls]; return st && st.adv2 ? n + '・' + optName(cls, st.adv2) : n; };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const st = S().classes[cls];
      if (st && st.adv2 === 'awaken') { P.dmgMult *= 1.12; P.hpMax = Math.round(P.hpMax * 1.1); P.skillCdMult *= 0.92; }
      if (st && st.adv2 === 'harmonic') { P.matk = (P.matk || 1) + 0.1; P.mpMax = Math.round(P.mpMax * 1.15); P.skillCdMult *= 0.95; }
      P.adv2 = st && st.adv2 || null;
    } catch (e) { }
    return P;
  };
  // ---------- 條件、畫面 ----------
  const rankOk = () => { const r = S().rank; return !!r && r.dan >= 2; };
  const conds = cls => {
    const s = S(), st = s.classes[cls];
    return [
      { ok: st.lv >= LV, txt: '職業等級 ' + LV + '（現在 ' + st.lv + '）' },
      { ok: !!st.adv, txt: '已經轉職（' + (st.adv ? R.ADV[cls].find(a => a.id === st.adv).name : '還沒') + '）' },
      { ok: rankOk(), txt: '公會段位：討伐段以上（現在 ' + (R.rankName ? R.rankName() : '—') + '）' },
      { ok: st.trial2 === 2, txt: '二轉試煉：' + (st.trial2 === 2 ? '通過了' : st.trial2 === 1 ? '報名了——帶著委託下遺跡，用' + R.CLASSES[cls].name + '打倒一隻領主體' : '還沒報名') },
      { ok: (s.mats.core || 0) >= COST.core && (s.mats.purecry || 0) >= COST.purecry, txt: '魔力核心 ' + COST.core + ' 顆（有 ' + (s.mats.core || 0) + '）、高純度魔力水晶 ' + COST.purecry + ' 個（有 ' + (s.mats.purecry || 0) + '）' }
    ];
  };
  const sheet = (cls, back) => {
    const s = S(), st = s.classes[cls], cs = conds(cls), ready = cs.every(c => c.ok), el = $('hub-modal'); el.hidden = false;
    const redo = !!st.adv2, canRedo = redo && (s.mats.core || 0) >= 1;
    $('hub-sheet').innerHTML = '<h2>' + esc(R.CLASSES[cls].name) + '的二次轉職</h2>'
      + (redo ? '<p class="note">現在：' + esc(optName(cls, st.adv2)) + '。想換的話交 1 顆魔力核心重選。</p>' : '<p class="note">二次轉職要公會認可：等級、段位、二轉試煉都要過，再交魔力核心 ' + COST.core + ' 顆、高純度魔力水晶 ' + COST.purecry + ' 個。</p><ul class="loot">' + cs.map(c => '<li style="color:' + (c.ok ? '#7AE0A0' : '#E8B07A') + '">' + (c.ok ? '✓ ' : '✗ ') + esc(c.txt) + '</li>').join('') + '</ul>')
      + '<div class="recipes">' + R.ADV2_OPTS(cls).map(o => '<div class="recipe"><b>' + esc(o.name) + (st.adv2 === o.id ? '（現在的）' : '') + '</b><small>' + esc(o.desc) + '</small><button type="button" class="btn' + (st.adv2 === o.id ? '' : ' pri') + '" data-p2="' + o.id + '"' + (st.adv2 === o.id || !(redo ? canRedo : ready) ? ' disabled' : '') + '>' + (redo ? '重選這一個（魔力核心 1 顆）' : '選這一個') + '</button></div>').join('') + '</div>'
      + '<div class="row">' + (!st.trial2 && !redo ? '<button type="button" class="btn pri" id="p2-trial"' + (st.lv >= LV && st.adv ? '' : ' disabled') + '>報名二轉試煉</button>' : '') + '<button type="button" class="btn" id="p2-x">好了</button></div>';
    $('p2-x').onclick = () => { el.hidden = true; back && back(); };
    const tb = $('p2-trial'); if (tb) tb.onclick = () => { st.trial2 = 1; R.save(); R.toast && R.toast('報名了二轉試煉：帶著委託下遺跡，用' + R.CLASSES[cls].name + '打倒一隻領主體。', '#E8C04A'); sheet(cls, back); };
    document.querySelectorAll('[data-p2]').forEach(b => { b.onclick = () => {
      const id = b.dataset.p2;
      if (redo) { if ((s.mats.core || 0) < 1) return; s.mats.core--; }
      else { if (!conds(cls).every(c => c.ok)) return; s.mats.core -= COST.core; s.mats.purecry -= COST.purecry; }
      st.adv2 = id; R.save(); R.sfx && R.sfx('levelup');
      R.banner && R.banner('二次轉職：' + optName(cls, id), R.CLASSES[cls].name + '・Lv ' + st.lv);
      sheet(cls, back);
    }; });
  };
  R.adv2Sheet = sheet;
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try {
      document.querySelectorAll('#hub-body [data-promo]').forEach(b => {
        const cls = b.dataset.promo, st = S().classes[cls]; if (!st || !st.adv || b.parentNode.querySelector('[data-p2open]')) return;
        const x = document.createElement('button'); x.type = 'button'; x.className = 'mini' + (st.lv >= LV && !st.adv2 ? ' gold' : ''); x.dataset.p2open = cls;
        x.textContent = st.adv2 ? '二轉：' + optName(cls, st.adv2) : st.trial2 === 1 ? '二轉試煉中' : '二次轉職';
        x.onclick = () => sheet(cls, () => R.hub(t, f)); b.after(x);
      });
    } catch (e) { console.warn('[promote2]', e); }
  };
  // ---------- 二轉試煉：帶著委託，用這個武器類別打倒領主體 ----------
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by);
    try {
      const s = S(), run = W().run, st = s && s.classes[s.cls];
      if (was && e.dead && st && st.trial2 === 1 && !st.adv2 && run && run.site && run.site.kind === 'ruin' && e.def && /^領主體/.test(e.def.name || '') && (run.task || (s.quests && s.quests.length))) {
        st.trial2 = 2; R.save(); setTimeout(() => R.banner && R.banner('二轉試煉通過', '回公會登記處的「武器登記」，選二次轉職'), 1000);
      }
    } catch (err) { console.warn('[promote2]', err); }
    return r;
  };
  R.promote2Debug = { AW, HM, conds };
})(window.R);
