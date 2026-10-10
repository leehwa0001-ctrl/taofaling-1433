// 多人連線：看得到隊友的狀態欄（2026-10-05 作者：應該也要看的到連線的隊友的狀態欄）
// 原本左下角的隊友欄（hudframe.js 的 #r-party）只有電腦控制的隊友，連線的朋友剩多少血、有沒有倒下都看不到。
// 現在：
// - 連線中每 0.5 秒送自己的狀態 { k: 'ps', rid, hp, hm, mp, mm, sh, lv, cls, adv, dn, db }（生命、魔力、護盾、等級、職業、轉職、倒下、身上的破防／虛弱／重傷）。
// - 隊友欄照原本的樣子多幾行連線的朋友：頭像（從對方的人物切）、名字（後面標「連線」）、職業 等級・生命、血條，
//   再多一條細的魔力條、身上的狀態（破防 4 這樣）；倒下會變灰、寫「倒下了：走過去扶起來」（net2.js 扶得起來）。
//   超過 4 秒沒收到寫「連線不穩」，超過 15 秒就先拿掉。
// 放在 hudframe.js、net.js、net2.js 後面。
(function (R) {
  const W = () => R.W, N = () => R.net || {}, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const crun = () => { const run = W().run; return run && run.coop && !run.coop.solo && !run.done && N().room ? run : null; };
  const now = () => performance.now();
  const stats = new Map();   // 送的人 → { hp, hm, mp, mm, lv, cls, adv, dn, db, rid, t }
  const num = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;

  // ---------- 送自己的狀態 ----------
  let sendT = 0;
  const tick = dt => {
    const run = crun(); if (!run) { if (stats.size) stats.clear(); return; }
    hook();
    sendT -= dt; if (sendT > 0) return; sendT = 0.5;
    if (N().floorBusy && N().floorBusy()) return;   // 換層中暫緩狀態包，留給控制／戰鬥
    const P = W().P, S = R.S; if (!P || !S) return;
    const st = S.classes && S.classes[S.cls] || {};
    const db = P.dbf ? Object.keys(P.dbf).filter(k => P.dbf[k] > 0).map(k => [k, Math.ceil(P.dbf[k])]) : [];
    try { N().send({ k: 'ps', rid: run.coop.seed, hp: Math.max(0, Math.round(P.hp)), hm: Math.round(P.hpMax), mp: Math.max(0, Math.round(P.mp || 0)), mm: Math.round(P.mpMax || 0), sh: Math.max(0, Math.round(P.shield || 0)), lv: st.lv || 1, cls: P.cls, adv: P.adv || null, dn: P.dead ? 1 : 0, db }); } catch (e) { }
  };
  const onMsg = (from, d) => {
    if (!d || d.k !== 'ps') return false;
    const run = crun(); if (!run || d.rid !== run.coop.seed) return true;
    if (!num(d.hp, 0, 1e9) || !num(d.hm, 1, 1e9) || !num(d.mp, 0, 1e9) || !num(d.mm, 0, 1e9) || !R.CLASSES[d.cls]) return true;
    const db = Array.isArray(d.db) ? d.db.filter(x => Array.isArray(x) && R.DEBUFF_KIND && R.DEBUFF_KIND[x[0]] && num(x[1], 0, 99)).slice(0, 3) : [];
    stats.set(from, { hp: d.hp, hm: d.hm, mp: d.mp, mm: d.mm, sh: num(d.sh, 0, 1e9) ? d.sh : 0, lv: num(d.lv, 1, 999) ? d.lv : 1, cls: d.cls, adv: typeof d.adv === 'string' ? d.adv : null, dn: !!d.dn, db, t: now() });
    return true;
  };
  const hook = () => { const n = N(); if (!n.send || n.psHooked) return; const prev = n.onMsg2; n.onMsg2 = (from, d) => { if (d && onMsg(from, d)) return; if (prev) prev(from, d); }; n.psHooked = 1; };
  hook();
  const st0 = R.step;
  R.step = dt => { const r = st0(dt); try { tick(dt); } catch (e) { console.warn('[netparty]', e); } return r; };

  // ---------- 隊友欄 ----------
  const mates = () => {
    const n = N(), t = now();
    return (n.members || []).filter(m => m.id !== n.me && stats.has(m.id) && t - stats.get(m.id).t < 20000).map(m => {
      const s = stats.get(m.id), r = n.remotes && n.remotes.get(m.id), adv = s.adv && R.ADV && R.ADV[s.cls] ? R.ADV[s.cls].find(a => a.id === s.adv) : null;
      const down = s.dn || !!(r && r.h && r.h.down);
      return { name: m.name || '隊友', cls: s.cls, m: { lv: s.lv }, hp: down ? 0 : s.hp, hpMax: s.hm, downed: down, h: r && r.h, net: m.id, s, advName: adv ? adv.name : null, stale: t - s.t > 6000 };
    });
  };
  const decorate = (n0, list) => {
    const el = $('r-party'); if (!el) return;
    el.querySelectorAll('.pm[data-i]').forEach(row => {
      const a = list[+row.dataset.i - n0]; if (!a || +row.dataset.i < n0) return;
      const span = row.querySelector('.pm-t span'); if (span && !span.querySelector('em.np')) span.insertAdjacentHTML('beforeend', '<em class="np" style="color:#7FE0FF">連線</em>');
      const box = row.querySelector('.pm-t'); if (!box) return;
      // 徽章獨立於姓名與生命數字，倒下或更新狀態時也保留。
      let emblem = row.querySelector('.np-class');
      if (R.classEmblemHTML && (!emblem || emblem.dataset.cls !== a.cls)) {
        if (!emblem) { emblem = document.createElement('div'); emblem.className = 'np-class'; row.appendChild(emblem); }
        emblem.dataset.cls = a.cls; emblem.innerHTML = R.classEmblemHTML(a.cls);
      }
      let mp = box.querySelector('.np-mp'); if (!mp) { mp = document.createElement('div'); mp.className = 'meter np-mp'; mp.style.cssText = 'height:3px;margin-top:1px'; mp.innerHTML = '<i style="background:linear-gradient(90deg,#2A4A8A,#5AA8FF)"></i>'; box.appendChild(mp); }
      mp.firstChild.style.width = (a.s.mm ? Math.max(0, Math.min(1, a.s.mp / a.s.mm)) * 100 : 0) + '%';
      let sh = box.querySelector('.np-sh'); if (!sh) { sh = document.createElement('b'); sh.className = 'np-sh'; sh.style.cssText = 'position:absolute;top:0;height:100%;background:rgba(138,216,255,.55);pointer-events:none'; const meter = row.querySelector('.meter'); if (meter) { if (getComputedStyle(meter).position === 'static') meter.style.position = 'relative'; meter.appendChild(sh); } }
      const shv = a.s.sh > 0 && a.s.hm ? Math.min(1, a.s.sh / a.s.hm) : 0; const hpFrac = a.s.hm ? Math.max(0, Math.min(1, a.hp / a.s.hm)) : 0;
      sh.style.width = (shv * 100) + '%'; sh.style.left = Math.min(100 - shv * 100, hpFrac * 100) + '%'; sh.hidden = !shv;
      const sm = row.querySelector('small');
      if (sm && !a.downed) { const t = (a.advName || (R.CLASSES[a.cls] ? R.CLASSES[a.cls].name : '')) + ' Lv ' + a.m.lv + '・' + Math.ceil(a.hp) + '／' + Math.round(a.hpMax) + (a.s.sh > 0 ? '・盾 ' + Math.ceil(a.s.sh) : '') + (a.stale ? '・連線不穩' : ''); if (sm.textContent !== t) sm.textContent = t; }
      let db = box.querySelector('.np-db'); if (!db) { db = document.createElement('div'); db.className = 'np-db'; db.style.cssText = 'font-size:10px;line-height:1.2;white-space:nowrap;overflow:hidden'; box.appendChild(db); }
      const h = a.s.db.map(([k, s]) => '<b style="color:' + R.DEBUFF_KIND[k].c + '">' + esc(R.DEBUFF_KIND[k].n) + ' ' + s + '</b>').join(' ');
      if (db.dataset.h !== h) { db.dataset.h = h; db.innerHTML = h; db.hidden = !h; }
      row.style.opacity = a.stale ? '0.6' : '';
    });
  };
  const ph0 = R.partyHud;
  R.partyHud = () => {
    const w = W(), run = crun(); if (!run) return ph0();
    const list = mates(); if (!list.length) return ph0();
    const real = w.allies || [], ord = run.order;
    w.allies = real.concat(list); if (!real.length) run.order = null;   // 只有連線的朋友：不顯示「指揮」
    try { ph0(); } finally { w.allies = real; if (!real.length) run.order = ord; }
    try { decorate(real.length, list); } catch (e) { console.warn('[netparty]', e); }
  };
  R.netParty = { stats, mates };   // 測試用
})(window.R);
