// 熟練度（努力值；作者 2026-10-02：拿重武器去打，武器的基本數值會加；多打幾場之後拿重武器會比較敏捷；
// 練魔法看釋放的次數；敏捷靠穿比較輕的裝備）
// - 武器熟練度：每把武器（基本型）分開算。出手打到東西 +1、用它打倒 +2。每級：這種武器的基本傷害 +2%、攻擊速度 +1%。
// - 重量：重的武器走路比較慢（大劍 −7.5%、戰斧 −6%、戰錘 −5%、長槍 −4%、長劍 −2.5%……輕的武器不扣）；
//   武器熟練度每升一級，重量的拖累少一成，10 級就不拖累了。
// - 魔法熟練度：法杖、法球、聖杖每發一次 +1；魔導士、神官放技能 +2。每級：魔法武器的傷害 +2%、每發的魔力 −3%。
// - 敏捷：打倒遺跡生物的時候，身上全是輕裝 +2、上衣是輕裝 +1（重裝不加）。每級：移動 +1%、翻滾冷卻 −2%。
// - 等級：熟練 n 級要 30 × n² 點（1 級 30、5 級 750、10 級 3000）。升級的效果從下一趟遺跡開始算。
// - 存檔：R.S.prof = { w: {武器: 點數}, magic, agi }。公會登記處的勇者證下面有一覽。
// 放在 skillpoints.js 後面（包住 R.calcPlayer、R.attack、R.hurtEnemy、R.killEnemy、R.useSkill、R.castSlot）。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const MAX = 10, lvOf = xp => Math.min(MAX, Math.floor(Math.sqrt((xp || 0) / 30))), need = lv => 30 * lv * lv;
  // 重量：每 1 點走路慢 2.5%
  const WEIGHT = { greatsword: 3, axe: 2.4, mace: 2, spear: 1.6, sword: 1, shotgun: 0.8, rifle: 0.8, crossbow: 0.8 };
  R.WEAPON_WEIGHT = WEIGHT;
  const pf = () => { const s = S(); s.prof = s.prof || { w: {}, magic: 0, agi: 0 }; s.prof.w = s.prof.w || {}; return s.prof; };
  R.profLv = { weapon: base => lvOf(pf().w[base]), magic: () => lvOf(pf().magic), agi: () => lvOf(pf().agi) };
  const MAGIC_CLS = ['mage', 'priest'];

  // ---------- 加點數：升級的時候說一聲 ----------
  const gain = (kind, base, v) => {
    const p = pf(), before = kind === 'w' ? lvOf(p.w[base]) : lvOf(p[kind]);
    if (kind === 'w') p.w[base] = (p.w[base] || 0) + v; else p[kind] = (p[kind] || 0) + v;
    const after = kind === 'w' ? lvOf(p.w[base]) : lvOf(p[kind]);
    if (after > before) {
      const name = kind === 'w' ? (R.WEAPONS[base] ? R.WEAPONS[base].name : base) + '的熟練度' : kind === 'magic' ? '魔法熟練度' : '敏捷';
      setTimeout(() => R.banner && R.banner(name + '升到 ' + after + ' 級', lineOf(kind, base, after) + '（下一趟遺跡開始算）'), 900);
    }
  };
  const lineOf = (kind, base, lv) => {
    if (kind === 'w') { const wt = WEIGHT[base] || 0; return '基本傷害 +' + 2 * lv + '%、攻擊速度 +' + lv + '%' + (wt ? '、重量的拖累 −' + lv * 10 + '%' : ''); }
    if (kind === 'magic') return '魔法武器的傷害 +' + 2 * lv + '%、每發的魔力 −' + 3 * lv + '%';
    return '移動 +' + lv + '%、翻滾冷卻 −' + 2 * lv + '%';
  };

  // ---------- 效果：算玩家數值的時候加上去 ----------
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const ws = P.ws, base = P.item && P.item.base, wl = base ? lvOf(pf().w[base]) : 0, ml = lvOf(pf().magic), al = lvOf(pf().agi);
      if (ws) {
        ws.dmg *= 1 + 0.02 * wl; ws.rate *= 1 + 0.01 * wl;
        if (ws.kind === 'magic') { ws.dmg *= 1 + 0.02 * ml; if (ws.mp) ws.mp *= Math.max(0.4, 1 - 0.03 * ml); }
      }
      const drag = (WEIGHT[base] || 0) * 0.025 * (1 - wl / MAX);
      P.speed *= (1 - drag) * (1 + 0.01 * al);
      P.dodgeCdMax *= 1 - 0.02 * al;
      P.weightDrag = drag;
    } catch (e) { }
    return P;
  };

  // ---------- 怎麼練 ----------
  // 出手：記下這一下（1.2 秒內打到東西才算；子彈飛得慢也算得到）；魔法武器每發一次就算
  let swing = null;
  const at0 = R.attack;
  R.attack = (...a) => {
    const P = W().P, run = W().run, cd0 = P ? P.atkCd : 0, mp0 = P ? P.mp : 0, r = at0(...a);
    if (P && run && P.atkCd > cd0 + 0.001) {
      const magic = P.ws && P.ws.kind === 'magic';
      if (magic && !(P.mp < mp0)) return r;   // 魔力不夠：沒發出去
      swing = { t: run.t, base: P.item && P.item.base, hit: false, run };
      if (magic) gain('magic', null, 1);
    }
    return r;
  };
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const run = W().run, s = swing;
    if (s && run && s.run === run && !s.hit && e && !e.dead && run.t - s.t < 1.2 && run.t >= s.t && !(o && (o.dot || o.burn))) { s.hit = true; if (s.base) gain('w', s.base, 1); }
    return he0(e, raw, o);
  };
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by), run = W().run, P = W().P;
    if (was && e.dead && run && P && !by && !(e.def && e.def.human)) {
      const s = swing; if (s && s.run === run && run.t - s.t < 1.5 && s.base) gain('w', s.base, 2);
      // 敏捷：看身上的裝備有多輕
      const eq = R.equipped ? R.equipped(P.cls) : {}, ws = R.SLOTS.map(sl => eq[sl.id] && R.ARMOR[eq[sl.id].base] ? R.ARMOR[eq[sl.id].base].w : 'light');
      const v = ws.every(w => w === 'light') ? 2 : ws[R.SLOTS.findIndex(sl => sl.id === 'body')] === 'light' ? 1 : 0;
      if (v) gain('agi', null, v);
    }
    return r;
  };
  // 魔導士、神官放技能
  const castGain = () => { const P = W().P; if (P && MAGIC_CLS.includes(P.cls)) gain('magic', null, 2); };
  const us0 = R.useSkill;
  if (us0) R.useSkill = (...a) => { const P = W().P, b = P ? P.skillCd || 0 : 0, r = us0(...a); if (P && (P.skillCd || 0) > b + 0.01) castGain(); return r; };
  const cs0 = R.castSlot;
  if (cs0) R.castSlot = i => { const P = W().P, b = P && P.skCd ? P.skCd[i] || 0 : 0, r = cs0(i); if (P && P.skCd && (P.skCd[i] || 0) > b + 0.01) castGain(); return r; };

  // ---------- 公會登記處：勇者證下面的熟練度一覽 ----------
  const bar = (xp, lv) => { const a = need(lv), b = need(Math.min(MAX, lv + 1)), f = lv >= MAX ? 1 : ((xp || 0) - a) / (b - a); return '<i style="display:inline-block;width:80px;height:5px;background:rgba(0,0,0,.25);border-radius:3px;vertical-align:middle;margin-left:6px;overflow:hidden"><em style="display:block;height:100%;width:' + Math.round(Math.max(0, Math.min(1, f)) * 100) + '%;background:#C9A13A"></em></i>'; };
  const box = () => {
    const p = pf(), cls = S().cls, mine = R.weaponsFor ? R.weaponsFor(cls) : [];
    const ws = Object.keys(R.WEAPONS).filter(k => mine.includes(k) || p.w[k]);
    const row = (name, xp, line) => { const lv = lvOf(xp); return '<li><b>' + esc(name) + '</b>　' + lv + ' 級' + bar(xp, lv) + '<br><small class="note">' + esc(line(lv)) + '</small></li>'; };
    return '<h3>熟練度</h3><p class="note">拿哪種武器打，那種武器就越順手：基本傷害、攻擊速度慢慢加上去，重的武器也越拿越輕（走路不再被拖慢）。魔法看釋放的次數；敏捷靠穿輕裝打倒遺跡生物。效果從下一趟遺跡開始算。</p><ul class="loot">'
      + ws.map(k => row(R.WEAPONS[k].name + (WEIGHT[k] ? '（重量 ' + WEIGHT[k] + '）' : ''), p.w[k], lv => lineOf('w', k, lv) + (WEIGHT[k] ? '；現在走路慢 ' + (WEIGHT[k] * 2.5 * (1 - lv / MAX)).toFixed(1) + '%' : ''))).join('')
      + row('魔法', p.magic, lv => lineOf('magic', null, lv)) + row('敏捷', p.agi, lv => lineOf('agi', null, lv)) + '</ul>';
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'); if (!body) return;
    const h3 = [...body.querySelectorAll('h3')].find(x => x.textContent === '勇者證'); if (!h3) return;
    let at = h3.nextElementSibling; while (at && at.tagName !== 'H3') at = at.nextElementSibling;
    const sec = document.createElement('div'); sec.className = 'prof-box'; sec.innerHTML = box();
    h3.parentNode.insertBefore(sec, at);
  };
})(window.R);
