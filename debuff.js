// 遺跡生物的破防、虛弱、重傷；克森特級以上治療變少
// （2026-10-05 作者：克森特級以上，可能會有降治療和降回血、吸血的效果；怪物可以有破防或讓玩家降攻擊的手段）
// - 克森特級以上（魔力太濃，傷口長不好）：受到的治療（回復藥、技能、每秒回血、吸血全部算）−40%（克森特級）／−60%（卡索級）。
//   （2026-10-05 作者：降治療的效果加強——原本 −25%／−40%，重傷原本 6 秒 −60%）
// - 遺跡生物打中你的時候可能帶一種狀態（摩爾斯級以上）：
//   破防（6 秒：受到的傷害 +25%）、虛弱（6 秒：打出去的傷害 −25%）、重傷（8 秒：受到的治療再 −80%）。
//   每一種生物固定帶一種（照編號算，大約六成的生物有）；精英、領主體三種都可能。
//   機率：一般 15%、精英 30%、領主體 40%，卡索級再 +10%。同一種再中就重新計時（不疊加）。
//   卡索專屬：噬界者、虛甲騎士＝破防；錯位影、稜鏡體＝虛弱；殘響、裂隙獵手＝重傷。
// - 左上角一格顯示：中了什麼、還剩幾秒；克森特級以上也寫治療少多少。中的那一下頭上跳字。
// 放在所有包 R.healP、R.hurtPlayer、R.hurtEnemy 的檔案後面（kasoplus.js 後面）。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id), rnd = Math.random;
  const KIND = {
    armor: { n: '破防', c: '#FF9A6A', t: 6, d: '受到的傷害 +25%' },
    atk: { n: '虛弱', c: '#C8A0FF', t: 6, d: '打出去的傷害 −25%' },
    heal: { n: '重傷', c: '#FF6A8A', t: 8, d: '受到的治療 −80%' }
  };
  const FIX = { k_maw: 'armor', k_hollow: 'armor', k_shade: 'atk', k_prism: 'atk', k_echo: 'heal', k_echo_s: 'heal', k_rift: 'heal' };
  const hash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const baseId = id => String(id || '').replace(/_v\d+$/, '');
  const kindOf = e => { const id = baseId(e.id); if (FIX[id]) return FIX[id]; if (e.def && (e.def.elite || e.def.boss)) return ['armor', 'atk', 'heal'][Math.floor(rnd() * 3)]; return [null, 'armor', 'atk', 'heal', null][hash(id) % 5]; };
  const lv = run => (run && run.grade && run.grade.lv) || 0;
  const auraOf = run => (!run || run.done ? 0 : run.grade && run.grade.id === 'kaso' ? 0.6 : lv(run) >= 4 ? 0.4 : 0);
  const D = P => P.dbf || (P.dbf = {});
  const on = (P, k) => !!(P && P.dbf && P.dbf[k] > 0);
  R.playerDebuff = (k, t) => { const P = W().P; if (!P || P.dead || !KIND[k]) return; const was = on(P, k); D(P)[k] = Math.max(D(P)[k] || 0, t || KIND[k].t); if (!was) R.num && R.num(P.x, 2.8, P.z, KIND[k].n + '！', 'crit'); };

  // ---------- 治療 ----------
  const hl0 = R.healP;
  R.healP = (v, q) => {
    const w = W(), P = w.P; if (!P || !w.run || v <= 0) return hl0(v, q);
    let k = 1 - auraOf(w.run); if (on(P, 'heal')) k *= 0.2;
    return hl0(v * k, q);
  };
  // ---------- 受到的傷害、打出去的傷害 ----------
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const w = W(), P = w.P; if (!P || !w.run) return hp0(raw, src, o);
    if (on(P, 'armor') && raw > 0) raw *= 1.25;
    const h = P.hp, r = hp0(raw, src, o);
    try {
      if (P.hp < h && !P.dead && src && src.def && !src.dead && lv(w.run) >= 3) {
        const k = kindOf(src);
        if (k) { const ch = (src.def.boss ? 0.4 : src.def.elite ? 0.3 : 0.15) + (w.run.grade.id === 'kaso' ? 0.1 : 0); if (rnd() < ch) R.playerDebuff(k); }
      }
    } catch (err) { console.warn('[debuff]', err); }
    return r;
  };
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { const P = W().P; return he0(e, on(P, 'atk') ? raw * 0.75 : raw, o); };
  // ---------- 時間、左上角 ----------
  let hudT = 0;
  const chip = () => { let el = $('r-dbf'); if (!el) { const tl = $('r-tl'); if (!tl) return null; el = document.createElement('div'); el.id = 'r-dbf'; el.className = 'glass dungeon-only r-misc'; tl.appendChild(el); } return el; };
  const hud = () => {
    const w = W(), P = w.P, run = w.run, el = $('r-dbf'); const a = auraOf(run), list = P && P.dbf ? Object.keys(KIND).filter(k => P.dbf[k] > 0) : [];
    if (!run || run.done || !P || (!a && !list.length)) { if (el) el.hidden = true; return; }
    const c = chip(); if (!c) return; c.hidden = false;
    const h = list.map(k => '<b style="color:' + KIND[k].c + '">' + KIND[k].n + ' ' + Math.ceil(P.dbf[k]) + '</b>').join('　') + (a ? (list.length ? '　' : '') + '<span style="opacity:.75">魔力太濃：治療 −' + Math.round(a * 100) + '%</span>' : '');
    if (c.dataset.h !== h) { c.dataset.h = h; c.innerHTML = h; c.title = list.map(k => KIND[k].n + '：' + KIND[k].d).concat(a ? ['克森特級以上：受到的治療、回血、吸血 −' + Math.round(a * 100) + '%'] : []).join('\n'); }
  };
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), w = W(), P = w.P;
    if (P && P.dbf && !w.paused) Object.keys(P.dbf).forEach(k => { P.dbf[k] = Math.max(0, P.dbf[k] - dt); });
    hudT -= dt; if (hudT <= 0) { hudT = 0.25; hud(); }
    return r;
  };
  // 換樓層不清，回到地面清掉
  const er0 = R.endRun;
  if (er0) R.endRun = (...a) => { const P = W().P; if (P) P.dbf = {}; return er0(...a); };
  R.DEBUFF_KIND = KIND;
})(window.R);
