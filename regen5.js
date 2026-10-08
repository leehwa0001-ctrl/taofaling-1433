// 每五秒回復（2026-10-08 作者：「每秒回復 XX 生命」全部改成「每五秒回復 XX 生命」，效果也改成每 5 秒跳一次，
//   數字直接寫成 5 秒實際回的量——裝備、被動、技能、天賦、角色總數值都一樣，敘述和實際效果不再對不上）
// - 效果：所有持續回血（hpflow.js 的 ×0.3 那一套：P.regen、德魯伊、回復增益、技能強化、光環、聖燈這類）先存起來（P.regenBank），每 5 秒一次回給你。
//   做法：持續回血一定是 R.healP(數值 × R.regenMul(P))，regenMul 被叫到的下一次 healP 就存起來。天賦「不死」照原本的回復量存（R.regenBank）。
// - 說明：畫面上所有「每秒回復 X 生命」改寫成「每五秒回復 Y 生命」，Y＝X × 0.3 × 5（實際 5 秒回的量）；「不死」的 X × 5。魔力的每秒回復不動。
//   用 MutationObserver 改畫面上的字（技能書、裝備、被動、天賦、狀態圖示、角色總數值、tooltip 都吃到）；更新公告裡的舊紀錄不改。
(function (R) {
  const W = () => R.W, PERIOD = 5, MUL = 0.3 * PERIOD;
  // ---------- 效果 ----------
  let flag = false;
  const rm0 = R.regenMul || (() => 0.3);
  R.regenMul = P => { flag = true; Promise.resolve().then(() => { flag = false; }); return rm0(P); };
  const hp0 = R.healP;
  R.healP = (v, q) => {
    if (flag) { flag = false; const P = W().P; if (P && v > 0) { P.regenBank = (P.regenBank || 0) + v; return; } }
    return hp0(v, q);
  };
  R.regenBank = v => { const P = W().P; if (P && v > 0) P.regenBank = (P.regenBank || 0) + v; };
  const pay = P => { const b = P.regenBank || 0; P.regenBank = 0; if (!(b > 0) || P.dead) return; const h0 = P.hp; hp0(b, true); const got = P.hp - h0; if (got >= 1 && R.num) R.num(P.x, 2.4, P.z, '+' + Math.round(got), 'heal'); };
  const tick = dt => { const P = W().P; if (!P) return; P.regenT = (P.regenT || 0) + dt; if (P.regenT >= PERIOD) { P.regenT -= PERIOD; pay(P); } };
  const st0 = R.step; if (st0) R.step = dt => { const r = st0(dt); tick(dt); return r; };
  const ts0 = R.townStep; if (ts0) R.townStep = dt => { const r = ts0(dt); if (!W().run) tick(dt); return r; };
  R.regenNext = () => { const P = W().P; return P ? Math.max(0, PERIOD - (P.regenT || 0)) : 0; };

  // ---------- 說明 ----------
  const fmt = v => String(Math.round(v * 100) / 100);
  const RULES = [
    [/每級每秒回復最大生命\s*([\d.]+)\s*%/g, (m, x) => '每級每五秒回復最大生命 ' + fmt(x * PERIOD) + '%'],
    [/每秒回復\s*([\d.]+)\s*%\s*(的)?(最大)?生命/g, (m, x, de, mx) => '每五秒回復 ' + fmt(x * MUL) + '% ' + (mx || '') + '生命'],
    [/每秒回復最大生命\s*([\d.]+)\s*%/g, (m, x) => '每五秒回復最大生命 ' + fmt(x * MUL) + '%'],
    [/每秒回復\s*([\d.]+)\s*(點\s*)?生命/g, (m, x) => '每五秒回復 ' + fmt(x * MUL) + ' 生命'],
    [/每秒回復生命\s*([+＋−\-])\s*([\d.]+)/g, (m, s, x) => '每五秒回復生命 ' + s + fmt(x * MUL)],
    [/每秒回復生命\s*([\d.]+)/g, (m, x) => '每五秒回復生命 ' + fmt(x * MUL)],
    [/每秒回復生命/g, () => '每五秒回復生命'],
    [/每秒回血\s*([+＋−\-]?)\s*([\d.]+)/g, (m, s, x) => '每五秒回血 ' + s + fmt(x * MUL)]
  ];
  R.per5 = s => { if (typeof s !== 'string' || (s.indexOf('每秒回復') < 0 && s.indexOf('每秒回血') < 0)) return s; RULES.forEach(([re, f]) => { s = s.replace(re, f); }); return s; };
  const skip = el => !!(el && el.closest && el.closest('.news-box, #news-ov, script, style, textarea, input'));
  const fixNode = n => {
    if (n.nodeType === 3) { const t = n.nodeValue; if (t && (t.indexOf('每秒回復') >= 0 || t.indexOf('每秒回血') >= 0) && !skip(n.parentElement)) { const u = R.per5(t); if (u !== t) n.nodeValue = u; } return; }
    if (n.nodeType !== 1 || skip(n)) return;
    const ti = n.getAttribute && n.getAttribute('title'); if (ti && ti.indexOf('每秒回') >= 0) { const u = R.per5(ti); if (u !== ti) n.setAttribute('title', u); }
    if ((n.textContent || '').indexOf('每秒回') < 0 && !(n.querySelector && n.querySelector('[title*="每秒回"]'))) return;
    const tw = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); let x; while ((x = tw.nextNode())) fixNode(x);
    n.querySelectorAll && n.querySelectorAll('[title*="每秒回"]').forEach(el => { if (!skip(el)) el.setAttribute('title', R.per5(el.getAttribute('title'))); });
  };
  const start = () => {
    fixNode(document.body);
    new MutationObserver(list => list.forEach(m => { if (m.type === 'characterData') fixNode(m.target); else if (m.type === 'attributes') fixNode(m.target); else m.addedNodes.forEach(fixNode); }))
      .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})(window.R);
