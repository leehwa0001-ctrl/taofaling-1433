// 望月瀧教你刀法（2026-10-04 作者：瀧可能會有特殊技能（刀客上沒有的），戀人後就可以教玩家）
// - 成為戀人之後，和瀧說話多一個「請瀧教你刀法」：照順序教 靜水 → 三圈一結 → 瀧落。
//   要用刀的職業（刀客）的等級到 10／20／30，而且上一次學過已經 7 天（R.S.takiLesson = { n, day }）。
// - 學會的存在 R.S.taught[技能]；技能書（刀客）多一段「望月瀧教的」（skillbook.js），學會的技能照一般技能放進技能格。
//   學會的判斷在 promote.js 的 R.skillNeedLv（沒學＝999 級）。
// 放在 skillbook2.js、people.js、promote.js 後面。
(function (R) {
  const S = () => R.S, $ = id => document.getElementById(id);
  const LESSONS = [
    { id: 'tk_still', name: '靜水', cd: 16, mp: 14, type: 'buff', p: { t: 5, def: 0.35, crit: 0.4, color: '#BFE8FF' }, need: 10,
      desc: '讓呼吸靜下來：5 秒內受到的傷害 −35%，暴擊率 +40%。望月瀧教的。',
      lines: ['「先別拔。你肩膀太緊了。」', '瀧讓你把手放鬆，再照著她的動作做一次。', '「對，這樣就好。先看清楚，再動。」'] },
    { id: 'tk_knot', name: '三圈一結', cd: 14, mp: 18, type: 'combo', p: { parts: [['nova', { r: 3.4, k: 0.9, waves: 3, gap: 200, color: '#9AD8FF' }], ['nova', { r: 3.6, k: 0.8, root: 2, color: '#FFFFFF' }, 650]] }, need: 20,
      desc: '迴旋三刀，最後收緊：周圍的敵人連砍三下，再被定住 2 秒。望月瀧教的。',
      lines: ['「這招有三刀。你先看我的手，不用跟著做。」', '她沒有拔刀，用手比出三次轉向，到了最後一下才收攏手指。', '「最後這下別散掉。前面繞完，要收得回來。再試一次。」'] },
    { id: 'tk_fall', name: '瀧落', cd: 12, mp: 22, type: 'blink', p: { range: 9, iframe: 0.4, end: { r: 3.5, k: 3.4, stun: 1, color: '#BFE8FF' } }, need: 30,
      desc: '躍起，連人帶刀落在準心處：周圍的敵人重傷、暈眩。望月瀧教的。',
      lines: ['「今天教你瀧落。先練落地，刀等一下再拿。」', '你練了幾次落地，瀧才開始比劃出刀的方向。她講得不快，遇到說不清楚的地方，就再做一遍。', '「不要往下看。落在哪裡，跳之前就要決定好。」'] }
  ];
  const DAYS = 7;
  // 加進技能書：刀客的技能，學了才算會（promote.js 的 R.skillNeedLv）
  if (R.SKILL_LIB) LESSONS.forEach(L => { R.SKILL_LIB[L.id] = { id: L.id, name: L.name, cls: 'blade', lv: 1, cd: L.cd, mp: L.mp, type: L.type, p: L.p, desc: L.desc, taught: 'taki' }; R.SKILLS[L.id] = { name: L.name, cd: L.cd, mp: L.mp, desc: L.desc }; });
  R.TAKI_LESSONS = LESSONS;
  const next = () => { const t = S().taught || {}; return LESSONS.find(L => !t[L.id]); };
  const status = () => {
    const s = S(), L = next(); if (!L) return { done: true };
    const lv = s.classes.blade ? s.classes.blade.lv : 0, last = s.takiLesson && s.takiLesson.day, wait = last != null ? last + DAYS - (s.day || 0) : 0;
    return { L, lvOk: lv >= L.need, lv, wait: Math.max(0, wait) };
  };
  R.personExtras = R.personExtras || [];
  R.personExtras.push({
    html: id => {
      if (id !== 'taki' || S().rel.taki !== 'lover') return '';
      const st = status(); if (st.done) return '';
      const ok = st.lvOk && !st.wait, why = !st.lvOk ? '刀客 Lv ' + st.L.need + ' 才學得會' : st.wait ? st.wait + ' 天後再教' : '';
      return '<button type="button" class="btn' + (ok ? ' gold' : '') + '" id="tk-teach"' + (ok ? '' : ' disabled') + ' title="' + R.esc(why) + '">請瀧教你刀法：' + R.esc(st.L.name) + (why ? '（' + R.esc(why) + '）' : '') + '</button>';
    },
    bind: id => {
      const b = $('tk-teach'); if (!b || id !== 'taki') return;
      b.onclick = () => {
        const s = S(), st = status(); if (st.done || !st.lvOk || st.wait) return;
        s.taught = s.taught || {}; s.taught[st.L.id] = 1; s.takiLesson = { n: Object.keys(s.taught).length, day: s.day || 0 }; R.save();
        R.closeSheet(); R.townTalk('望月瀧', st.L.lines.concat(['（學會了「' + st.L.name + '」：刀客的技能書，「望月瀧教的」那一段）']));
        R.sfx && R.sfx('magic');
      };
    }
  });
})(window.R);
