// 轉職的條件（2026-10-04 作者：轉職的等級要調高、還要條件）
// - 職業等級 15（原本 8；data.js 的 R.PROMOTE_LV）＋ 一顆魔力核心，再加兩個條件：
//   1. 公會段位：冒險段・白銀階以上（ranks.js 的 R.S.rank）；
//   2. 轉職試煉：在公會報名之後，帶著委託（討伐令或委託板的委託）下遺跡，用這個武器類別打倒一隻精英或領主體。
//   存在 R.S.classes[職業].trial：1＝報名了、2＝通過了。
// - 轉職路線的技能：原本照 8 級轉職寫的（8、11、14、18、24 級），全部往後挪 7 級（15、18、21、25、31）——R.skillNeedLv。
// - 舊存檔：這次改之前就轉職的職業（st.advLegacy）照舊，不會被退回，路線技能的等級也照舊。重選路線不用再考。
// 放在 hub.js、ranks.js、skillbook.js、skillpoints.js、questboard.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const BASE = 8;   // 路線技能的等級原本是照 8 級轉職寫的
  // 舊存檔：已經轉職的職業記為 legacy（只做一次）
  const migrate = () => { const s = S(); if (!s || s.promoV2) return; s.promoV2 = 1; Object.values(s.classes || {}).forEach(st => { if (st && st.adv) st.advLegacy = 1; }); };
  R.skillNeedLv = (sk, st) => { if (!sk) return 99; if (sk.taught) { const t = S() && S().taught; return t && t[sk.id] ? 1 : 999; }   /* 望月瀧教的（takiteach.js） */ if (!sk.adv) return sk.lv; migrate(); return st && st.advLegacy ? sk.lv : sk.lv + (R.PROMOTE_LV - BASE); };

  // ---------- 條件 ----------
  const rankOk = () => { const r = S().rank; return !!r && (r.dan > 1 || (r.dan === 1 && r.tier >= 2)); };
  const conds = cls => {
    const s = S(), st = s.classes[cls];
    return [
      { ok: st.lv >= R.PROMOTE_LV, txt: '職業等級 ' + R.PROMOTE_LV + '（現在 ' + st.lv + '）' },
      { ok: rankOk(), txt: '公會段位：冒險段・白銀階以上（現在 ' + (R.rankName ? R.rankName() : '—') + '）' },
      { ok: st.trial === 2, txt: '轉職試煉：' + (st.trial === 2 ? '通過了' : st.trial === 1 ? '報名了——帶著委託下遺跡，用' + R.CLASSES[cls].name + '打倒一隻精英或領主體' : '還沒報名') },
      { ok: (s.mats.core || 0) >= 1, txt: '魔力核心 1 顆（有 ' + (s.mats.core || 0) + ' 顆）' }
    ];
  };
  R.promoteReady = cls => { migrate(); const st = S().classes[cls]; return !!st && (!!st.adv || conds(cls).every(c => c.ok)); };
  const sheet = (cls, back) => {
    const st = S().classes[cls], cs = conds(cls), el = $('hub-modal'); el.hidden = false;
    $('hub-sheet').innerHTML = '<h2>' + esc(R.CLASSES[cls].name) + '的轉職</h2><p class="note">轉職要公會認可：等級、段位、轉職試煉都要過，再交一顆魔力核心。</p><ul class="loot">'
      + cs.map(c => '<li style="color:' + (c.ok ? '#7AE0A0' : '#E8B07A') + '">' + (c.ok ? '✓ ' : '✗ ') + esc(c.txt) + '</li>').join('') + '</ul>'
      + '<p class="note">轉職試煉：報名之後，帶著委託（討伐令、委託板都算）下遺跡，用' + esc(R.CLASSES[cls].name) + '打倒一隻精英（蛛身牛、夜鳴獸這類）或領主體，就算通過。段位在公會登記處的委託板、討伐令升。</p>'
      + '<div class="row">' + (!st.trial ? '<button type="button" class="btn pri" id="pm-trial">報名轉職試煉</button>' : '') + '<button type="button" class="btn" id="pm-x">好了</button></div>';
    $('pm-x').onclick = () => { el.hidden = true; back && back(); };
    const tb = $('pm-trial'); if (tb) tb.onclick = () => { st.trial = 1; R.save(); R.toast && R.toast('報名了轉職試煉：帶著委託下遺跡，用' + R.CLASSES[cls].name + '打倒一隻精英或領主體。', '#E8C04A'); sheet(cls, back); };
  };
  // 公會的武器登記：還沒轉職、條件沒到的，「轉職」先打開條件
  const hub0 = R.hub;
  R.hub = (t, f) => {
    migrate(); hub0(t, f);
    try {
      document.querySelectorAll('#hub-body [data-promo]').forEach(b => {
        const cls = b.dataset.promo; if (R.promoteReady(cls)) return;
        const st = S().classes[cls]; b.textContent = st.trial === 1 ? '轉職試煉中' : '轉職條件'; b.classList.remove('gold');
        b.onclick = () => sheet(cls, () => R.hub(t, f));
      });
      const h = [...document.querySelectorAll('#hub-body h3')].find(e => e.textContent === '武器登記'); let p = h && h.nextElementSibling;
      while (p && !(p.classList.contains('note') && /魔力核心/.test(p.textContent)) && p.tagName !== 'H3') p = p.nextElementSibling;   // 技能書、技能點的按鈕列插在中間
      if (p && p.tagName !== 'H3' && !p.dataset.pm) { p.dataset.pm = 1; p.innerHTML = p.innerHTML.replace(/交一顆魔力核心，就能轉職/, '公會段位到冒險段・白銀階、通過轉職試煉、交一顆魔力核心，就能轉職'); }
    } catch (e) { console.warn('[promote]', e); }
  };
  // 轉職試煉：帶著委託，用這個武器類別打倒精英或領主體
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by);
    try {
      const s = S(), run = W().run, st = s && s.classes[s.cls];
      if (was && e.dead && st && st.trial === 1 && !st.adv && run && run.site && run.site.kind === 'ruin' && e.def && (e.def.elite || /^領主體/.test(e.def.name || '')) && (run.task || (s.quests && s.quests.length))) {
        st.trial = 2; R.save(); setTimeout(() => R.banner && R.banner('轉職試煉通過', '回公會登記處，交一顆魔力核心就能轉職' + (rankOk() ? '' : '（段位還要到冒險段・白銀階）')), 800);
      }
    } catch (err) { console.warn('[promote]', err); }
    return r;
  };
  // 轉職完成的時候：記成新制（之後重選路線不用再考）
  const en0 = R.enterTown; if (en0) R.enterTown = (...a) => { const r = en0(...a); migrate(); return r; };
})(window.R);
