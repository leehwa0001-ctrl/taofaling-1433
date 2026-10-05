// 傷害統計（作者 2026-10-05：可以顯示隊友的 DPS 和傷害累積；連線也是）
// - 遺跡裡右邊（佩特拉的注意下面）一個小面板：你、同行的勇者（電腦控制）、你的召喚物、多人連線的朋友，一人一行：
//   名字、這一趟累積的傷害、每秒傷害（最近 8 秒）、佔全隊的比例條。點標題可以收起來／打開（記在這台瀏覽器）。
// - 自己的傷害：包最外層的 R.hurtEnemy，量遺跡生物實際少掉的血（燃燒、範圍持續、反擊都算）。
//   同行的勇者、召喚物：包 R.allyHit（by 是 W.allies 裡的人就算那個人，別的算「召喚物」；別的隊伍 rival 不算）。
// - 多人連線：每 1 秒送自己的 { k: 'dm', rid, tot, dps }（自己＋自己的召喚物、勇者），收到的照房間成員的名字列出來；
//   10 秒沒收到就標灰。朋友的電腦控制隊友不另外列。
// - 換一趟遺跡重新算；換樓層不重算。
// 放在 net.js、netparty.js、vampproc.js、talentcap.js 後面（index.html 後段）。
(function (R) {
  const W = () => R.W, N = () => R.net || {}, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const now = () => performance.now() / 1000, WIN = 8;
  let runRef = null, rows = new Map();   // key → { name, tot, ev: [[t, d]], col, kind }
  const remote = new Map();   // 連線的朋友：id → { tot, dps, t }
  const reset = run => { runRef = run; rows = new Map(); remote.clear(); };
  const row = (key, name, col, kind) => { let r = rows.get(key); if (!r) { r = { name, tot: 0, ev: [], col, kind }; rows.set(key, r); } return r; };
  const add = (key, name, col, kind, d) => {
    const run = W().run; if (!run || run.done || !(d > 0)) return;
    if (run !== runRef) reset(run);
    const r = row(key, name, col, kind); r.tot += d; r.ev.push([now(), d]);
    if (r.ev.length > 400) r.ev.splice(0, r.ev.length - 400);
  };
  const dpsOf = r => { const t = now(); let s = 0; for (let i = r.ev.length - 1; i >= 0 && t - r.ev[i][0] <= WIN; i--) s += r.ev[i][1]; return s / WIN; };

  // ---------- 自己 ----------
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const h0 = e && !e.dead ? e.hp : 0, r = he0(e, raw, o);
    try { if (e && h0 > 0) { const d = h0 - Math.max(0, e.hp); if (d > 0) add('me', (R.S && R.S.name) || '你', '#FFD27A', 'me', d); } } catch (err) { }
    return r;
  };
  // ---------- 同行的勇者、召喚物 ----------
  const ah0 = R.allyHit;
  if (ah0) R.allyHit = (e, dmg, by) => {
    const h0 = e && !e.dead ? e.hp : 0, r = ah0(e, dmg, by);
    try {
      if (e && h0 > 0 && !(by && by.rival)) {
        const d = h0 - Math.max(0, e.hp);
        if (d > 0) {
          const ally = by && (W().allies || []).includes(by);
          if (ally) add('a:' + (by.name || by.cls), by.name || '隊友', '#9AD8FF', 'ally', d);
          else add('summon', '召喚物', '#B8E07A', 'summon', d);
        }
      }
    } catch (err) { }
    return r;
  };

  // ---------- 多人連線 ----------
  const crun = () => { const run = W().run; return run && run.coop && !run.coop.solo && !run.done && N().room ? run : null; };
  let sendT = 0;
  const myTot = () => { let t = 0, d = 0; rows.forEach(r => { if (r.kind !== 'remote') { t += r.tot; d += dpsOf(r); } }); return [t, d]; };
  const onMsg = (from, d) => {
    if (!d || d.k !== 'dm') return false;
    const run = crun(); if (!run || d.rid !== run.coop.seed) return true;
    if (!(Number.isFinite(d.tot) && d.tot >= 0 && d.tot < 1e13 && Number.isFinite(d.dps) && d.dps >= 0 && d.dps < 1e12)) return true;
    if (run !== runRef) reset(run);
    remote.set(from, { tot: d.tot, dps: d.dps, t: now() });
    return true;
  };
  const hook = () => { const n = N(); if (!n.send || n.dmHooked) return; const prev = n.onMsg2; n.onMsg2 = (from, d) => { if (d && onMsg(from, d)) return; if (prev) prev(from, d); }; n.dmHooked = 1; };
  hook();

  // ---------- 面板 ----------
  const css = document.createElement('style');
  css.textContent = '#dm-meter{position:fixed;right:12px;z-index:5;width:230px;background:rgba(16,12,20,.82);border:1px solid #4A4050;border-radius:8px;padding:6px 8px;font-size:12px;color:#EDE6DA;pointer-events:auto}'
    + '#dm-meter h4{margin:0;font-size:12px;font-weight:700;color:#E8C04A;cursor:pointer;display:flex;justify-content:space-between;gap:6px}#dm-meter h4 small{color:#A89CA8;font-weight:400}'
    + '#dm-meter .dm-r{position:relative;margin-top:4px;padding:2px 5px;border-radius:4px;overflow:hidden;display:flex;justify-content:space-between;gap:6px;white-space:nowrap}'
    + '#dm-meter .dm-r i{position:absolute;left:0;top:0;bottom:0;opacity:.28;z-index:0}#dm-meter .dm-r b,#dm-meter .dm-r span{position:relative;z-index:1}'
    + '#dm-meter .dm-r b{font-weight:600;overflow:hidden;text-overflow:ellipsis;max-width:110px}#dm-meter .dm-r span{color:#C8C0B0;font-variant-numeric:tabular-nums}'
    + '#dm-meter .dm-r.off{opacity:.45}#dm-meter.min .dm-r{display:none}';
  document.head.appendChild(css);
  const fmt = v => v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e4 ? (v / 1e3).toFixed(1) + 'K' : String(Math.round(v));
  let box = null, min = false;
  try { min = localStorage.getItem('tf-dm-min') === '1'; } catch (e) { }
  const ensure = () => {
    if (box && box.isConnected) return box;
    const host = $('run'); if (!host) return null;
    box = document.createElement('div'); box.id = 'dm-meter'; box.className = 'dungeon-only' + (min ? ' min' : '');
    box.addEventListener('click', ev => { if (!ev.target.closest('h4')) return; min = !min; box.classList.toggle('min', min); try { localStorage.setItem('tf-dm-min', min ? '1' : '0'); } catch (e) { } });
    host.appendChild(box); return box;
  };
  const render = () => {
    const b = ensure(); if (!b) return;
    const run = W().run; if (!run || run.done) { b.hidden = true; return; }
    if (run !== runRef) reset(run);
    const aw = $('r-aware-box'), r0 = aw && aw.getBoundingClientRect(); b.style.top = (r0 && r0.height ? Math.round(r0.bottom + 8) : 230) + 'px';
    const list = [];
    rows.forEach((r, k) => list.push({ name: r.name, tot: r.tot, dps: dpsOf(r), col: r.col, off: false, me: k === 'me' }));
    const n = N(), t = now();
    remote.forEach((v, id) => { const m = (n.members || []).find(x => x.id === id); if (!m && t - v.t > 15) return; list.push({ name: (m ? m.name : '朋友') + '（連線）', tot: v.tot, dps: t - v.t > 10 ? 0 : v.dps, col: '#E89AE0', off: t - v.t > 10 }); });
    if (!list.length) { b.hidden = true; return; }
    b.hidden = false;
    list.sort((a, c) => c.tot - a.tot);
    const sum = list.reduce((a, x) => a + x.tot, 0) || 1, top = list[0].tot || 1;
    const html = '<h4><span>傷害統計<small>（這一趟）</small></span><small>' + (min ? '▸ 打開' : '累積・每秒 ▾') + '</small></h4>'
      + list.map(x => '<div class="dm-r' + (x.off ? ' off' : '') + '"><i style="width:' + Math.round(x.tot / top * 100) + '%;background:' + x.col + '"></i><b style="color:' + x.col + '">' + esc(x.name) + '</b><span>' + fmt(x.tot) + '・' + fmt(x.dps) + '/s・' + Math.round(x.tot / sum * 100) + '%</span></div>').join('');
    if (b.innerHTML !== html) b.innerHTML = html;
  };
  let acc = 0;
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt);
    try {
      acc += dt; if (acc >= 0.5) { acc = 0; render(); }
      const run = crun(); if (run) { hook(); sendT -= dt; if (sendT <= 0) { sendT = 1; const [tot, dps] = myTot(); N().send({ k: 'dm', rid: run.coop.seed, tot: Math.round(tot), dps: Math.round(dps) }); } }
    } catch (e) { console.warn('[dmgmeter]', e); }
    return r;
  };
  R.dmAdd = d => add('me', (R.S && R.S.name) || '你', '#FFD27A', 'me', d);   // 不走 R.hurtEnemy 的傷害（反擊）用
  R.damageMeter = () => { const out = {}; rows.forEach((r, k) => { out[k] = { name: r.name, tot: Math.round(r.tot), dps: Math.round(dpsOf(r)) }; }); remote.forEach((v, id) => { out['net:' + id] = v; }); return out; };
})(window.R);
