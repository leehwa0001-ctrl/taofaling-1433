// 種族自選券、照進度送的抽選券（2026-10-04 作者：研發可以自選 SSR 的序號，並且隨著進度會送自選卷或抽選卷）
// - 自選券：SR、SSR、UR 三種（R.S.raceSelect = { SR, SSR, UR }）。在公會登記處用：從那個稀有度的種族裡自己挑一族登記（可以搜尋）。
//   序號「SSR 種族自選券」給一張 SSR 自選券（redeem.js）。
// - 照進度送（R.S.raceGifts 記送過的）：
//   公會段階每升一階：抽選券 10 張；升到冒險段：SR 自選券、討伐段：SSR 自選券、獵殺段以上：UR 自選券（每段一次）；
//   第一次走完各分級的遺跡：哈米莉亞 10 張、阿彌勒 20 張、摩爾斯 SR 自選券、克森特 SSR 自選券、卡索 UR 自選券；
//   職業等級（最高的那個）每 10 級：抽選券 10 張。
//   舊存檔第一次打開時，已經達到的進度會一次補發。
// 放在 tickets.js、ranks.js、racelist.js 後面。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s), S = () => R.S;
  const TIERS = ['SR', 'SSR', 'UR'];
  const sel = () => { const s = S(); s.raceSelect = s.raceSelect || {}; return s.raceSelect; };
  const total = () => TIERS.reduce((a, t) => a + (sel()[t] || 0), 0);
  R.giveRaceSelect = (tier, n) => { const m = sel(); m[tier] = (m[tier] || 0) + (n || 1); };

  // ---------- 自選的畫面 ----------
  const picker = tier => {
    const s = S(), host = $('hub-sheet'), el = $('hub-modal'); if (!host || !el) return; el.hidden = false;
    let q = '', pick = null; const T0 = R.TIERS[tier] || { name: tier, color: '#C8A85A' };
    const list = () => Object.keys(R.RACES).filter(id => R.RACES[id].tier === tier && (!q || R.RACES[id].name.includes(q) || (R.RACES[id].from || '').includes(q)));
    const render = () => {
      const L = list();
      host.innerHTML = '<h2>' + esc(T0.name) + ' 種族自選券</h2><p class="note">從 ' + esc(T0.name) + ' 的種族裡自己挑一族登記（用掉一張）。還有 <b>' + (sel()[tier] || 0) + '</b> 張・現在的種族：<b>' + (s.race && R.RACES[s.race] ? esc(R.RACES[s.race].name) : '未登記') + '</b></p>'
        + '<label class="field">搜尋<input id="rs-q" type="search" value="' + esc(q) + '" placeholder="族名或族種"></label>'
        + '<div class="race-cards ten rs-list">' + L.slice(0, 120).map(id => { const r = R.RACES[id]; return '<button type="button" class="race-card' + (pick === id ? ' sel' : '') + '" data-rs="' + id + '" style="--c:' + T0.color + '"><span class="tier">' + esc(T0.name) + '</span><b>' + esc(r.name) + '</b><small>' + esc(r.from || '') + '</small></button>'; }).join('') + (L.length > 120 ? '<p class="note">還有 ' + (L.length - 120) + ' 族，用搜尋縮小範圍。</p>' : '') + '</div>'
        + (pick ? '<div class="race-card race-detail" style="--c:' + T0.color + '"><span class="tier">' + esc(T0.name) + '</span><b>' + esc(R.RACES[pick].name) + '</b><small>' + esc(R.RACES[pick].from || '') + '</small><span>' + esc(R.RACES[pick].line || '') + '</span><em>' + esc((R.raceBonusText ? R.raceBonusText(pick) : []).join('・')) + '</em></div>' : '')
        + '<div class="row">' + (pick ? '<button type="button" class="btn gold" id="rs-ok">登記為「' + esc(R.RACES[pick].name) + '」（用一張）</button>' : '') + '<button type="button" class="btn" id="rs-x">收起來</button></div>';
      const qi = $('rs-q'); qi.oninput = () => { q = qi.value.trim(); const pos = qi.selectionStart; render(); const q2 = $('rs-q'); q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) { } };
      host.querySelectorAll('[data-rs]').forEach(b => { b.onclick = () => { pick = b.dataset.rs; render(); }; });
      $('rs-x').onclick = () => { el.hidden = true; R.hub(); };
      const ok = $('rs-ok'); if (ok) ok.onclick = () => { const m = sel(); if (!(m[tier] > 0) || !pick) return; m[tier]--; el.hidden = true; if (R.applyRace) R.applyRace(pick); else s.race = pick; R.save(); R.hub(); R.say && R.say('用了 ' + T0.name + ' 自選券：種族重新登記為「' + R.RACES[pick].name + '」。'); };
    };
    render();
  };

  // ---------- 照進度送 ----------
  const gifts = () => { const s = S(); s.raceGifts = s.raceGifts || { rank: -1, dan: 0, cleared: {}, lv: 0 }; return s.raceGifts; };
  const rankIndex = r => { const D = R.RANK_DANS || []; let i = 0; for (let d = 0; d < (r.dan || 0); d++) i += (D[d] && D[d].tiers.length) || 0; return i + (r.tier || 0); };
  const CLEAR = { hamilia: ['tix', 10], amile: ['tix', 20], mors: ['SR', 1], kesent: ['SSR', 1], kaso: ['UR', 1] };
  const check = () => {
    const s = S(); if (!s) return; const g = gifts(), out = []; let tix = 0;
    const give = (t, n) => { if (t === 'tix') tix += n; else { R.giveRaceSelect(t, n); out.push((R.TIERS[t] ? R.TIERS[t].name : t) + ' 自選券'); } };
    if (s.rank) {
      const ri = rankIndex(s.rank); if (g.rank < 0) g.rank = 0;   // 第一次：從新人段起算
      if (ri > g.rank) { give('tix', 10 * (ri - g.rank)); g.rank = ri; }
      for (let d = g.dan + 1; d <= (s.rank.dan || 0); d++) give(d === 1 ? 'SR' : d === 2 ? 'SSR' : 'UR', 1);
      g.dan = Math.max(g.dan, s.rank.dan || 0);
    }
    Object.keys(CLEAR).forEach(gid => { if ((s.cleared || {})[gid] > 0 && !g.cleared[gid]) { g.cleared[gid] = 1; give(CLEAR[gid][0], CLEAR[gid][1]); } });
    const lv = Math.max(0, ...Object.values(s.classes || {}).map(c => (c && c.lv) || 0)), step = Math.floor(lv / 10);
    if (step > g.lv) { give('tix', 10 * (step - g.lv)); g.lv = step; }
    if (tix) { s.raceTickets = (s.raceTickets || 0) + tix; out.unshift('種族抽選券 ' + tix + ' 張'); }
    if (out.length) { R.save(); setTimeout(() => R.banner && R.banner('公會送你：' + out.join('、'), '照你的進度送的。到公會登記處用（抽選券、自選券）'), 1500); }
  };
  R.raceGiftCheck = check;
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try {
      check();
      const body = $('hub-body'); if (!body) return;
      const anchor = body.querySelector('[data-racechg], [data-latereg]');
      if (anchor && total() > 0 && !body.querySelector('[data-rsel]')) {
        const box = document.createElement('span'); box.innerHTML = TIERS.filter(t => sel()[t] > 0).map(t => '<button type="button" class="btn gold" data-rsel="' + t + '">用 ' + esc(R.TIERS[t] ? R.TIERS[t].name : t) + ' 自選券（' + sel()[t] + ' 張）</button>').join('');
        anchor.after(box); box.querySelectorAll('[data-rsel]').forEach(b => { b.onclick = () => picker(b.dataset.rsel); });
      }
    } catch (e) { console.warn('[raceselect]', e); }
  };
  const er0 = R.endRun; if (er0) R.endRun = (...a) => { const r = er0(...a); try { check(); } catch (e) { } return r; };
})(window.R);
