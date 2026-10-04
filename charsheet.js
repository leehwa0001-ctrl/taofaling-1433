// 角色總數值（作者 2026-10-03：倉庫那邊可以有個角色總共數值，看到裝備、被動全部的數值）
// - 公會的倉庫頁（換裝備的地方）最上面多一塊「角色總數值」：R.calcPlayer 算出來的最後數字（裝備、被動、天賦、種族、稱號、熟練度全部算進去），
//   下面列出這些數字是從哪裡來的（裝備詞綴的合計、裝上的被動、點的天賦、種族、稱號、熟練度、今天吃的東西）。
// - 吃東西的加成只在遺跡裡算，這裡另外寫出來。
(function (R) {
  const S = () => R.S, esc = s => R.esc(s);
  const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
  const n1 = v => (Math.round(v * 10) / 10).toString();
  const row = (k, v, note) => '<div class="cs-row"><span>' + esc(k) + '</span><b>' + v + '</b>' + (note ? '<small>' + esc(note) + '</small>' : '') + '</div>';
  R.charSheetHtml = cls => {
    const s = S(); cls = cls || s.cls; let P; try { P = R.calcPlayer(cls); } catch (e) { return ''; }
    const st = s.classes[cls], eq = R.equipped(cls), ws = P.ws || {}, w = P.item && R.WEAPONS[P.item.base] || {};
    const hit = (ws.dmg || 0) * (P.dmgMult || 1), per = hit * (ws.pellets || 1) * (w.hits || 1), crit = Math.min(1, ws.crit || 0), cm = P.critMult || 1.5, dps = per * (ws.rate || 1) * (1 + crit * (cm - 1));
    const elem = [['fire', '火'], ['frost', '冰'], ['shock', '雷']].filter(([k]) => ws[k]).map(([k, n]) => n + ' ' + n1(ws[k])).join('・');
    let h = '<details class="cs-box" open><summary>角色總數值（' + esc(R.clsName(cls)) + ' Lv ' + st.lv + '）：裝備、被動、天賦、種族、稱號全部算進去</summary><div class="cs-grid">';
    h += '<div class="cs-sec"><h4>基本</h4>' + row('生命', Math.round(P.hpMax)) + row('魔力', Math.round(P.mpMax)) + row('防禦', n1(P.def || 0)) + row('移動速度', n1(P.speed || 0) + ' 公尺／秒')
      + (P.str != null ? row('力量', P.str, P.tooHeavy ? '護具太重：移動、翻滾變慢' : '') : '') + (P.weightDrag ? row('武器重量', '−' + Math.round(P.weightDrag * 100) + '% 移動') : '') + '</div>';
    h += '<div class="cs-sec"><h4>攻擊</h4>' + row('武器', esc(P.item ? R.itemName(P.item) : '（沒有）')) + row('每一下', n1(hit) + ((ws.pellets || 1) > 1 ? ' × ' + ws.pellets : '') + ((w.hits || 1) > 1 ? ' × ' + w.hits : ''), '傷害倍率 ' + pct((P.dmgMult || 1) - 1))
      + row('攻擊速度', n1(ws.rate || 0) + ' 次／秒') + row('估計每秒傷害', Math.round(dps), '含暴擊的平均') + row('暴擊率', Math.round(crit * 100) + '%') + row('暴擊傷害', '×' + n1(cm))
      + (ws.vamp ? row('吸血', (R.vampLine && R.vampLine()) || Math.round(ws.vamp * 1000) / 10 + '%') : '') + (elem ? row('屬性', elem) : '') + (ws.pierce ? row('穿透', ws.pierce) : '') + (ws.range ? row('攻擊距離', (ws.range0 ? pct(ws.range / ws.range0 - 1) + '（' : '') + n1(ws.range) + ' 公尺' + (ws.range0 ? '）' : ''), ws.range0 ? '比武器原本的 ' + n1(ws.range0) + ' 公尺' : '') : '')
      + (ws.arc && w.arc ? row('攻擊範圍', pct(ws.arc / w.arc - 1) + '（揮砍 ' + Math.round(ws.arc * 180 / Math.PI) + '°）', '比武器原本的 ' + Math.round(w.arc * 180 / Math.PI) + '°') : '') + '</div>';
    h += '<div class="cs-sec"><h4>防守・其他</h4>' + row('翻滾冷卻', n1(P.dodgeCdMax || 0) + ' 秒') + (P.haste != null ? row('技能急速', '+' + Math.round(P.haste), '冷卻 ' + pct((P.skillCdMult || 1) - 1)) : row('技能冷卻', pct((P.skillCdMult || 1) - 1))) + row('每秒回復', n1(P.regen || 0) + ' 生命') + (P.mpRegen ? row('回魔', '每秒 +' + n1(P.mpRegen) + ' 魔力') : '') + (P.pen ? row('穿透', '無視 ' + Math.round(P.pen * 100) + '% 護甲') : '')
      + row('佩特拉的注意', P.calm ? '上升慢 ' + Math.round(P.calm * 100) + '%' : '照常') + (P.greed ? row('撿錢', pct(P.greed)) : '') + ((P.accGuard || P.talGuard) ? row('受到的傷害', '−' + Math.round(((P.accGuard || 0) + (P.talGuard || 0)) * 100) + '%') : '')
      + (P.luck ? row('幸運', P.luck + ' 點', '寶箱比較不會空、寶物數量多一點、暴擊率高一點') : '') + (P.accLucky ? row('寶物數量', pct(P.accLucky)) : '') + (P.immune && Object.keys(P.immune).length ? row('免疫', Object.keys(P.immune).join('、')) : '') + '</div>';
    h += '</div><h4>從哪裡來</h4><div class="cs-src">';
    // 裝備
    const items = R.GEAR_KEYS.map(k => eq[k]).filter(Boolean), aff = {};
    items.forEach(it => { if (!it.identified) return; (it.affixes || []).forEach(a => { const d = R.affixDef(it, a.id); if (!d) return; aff[a.id] = aff[a.id] || { d, v: 0 }; aff[a.id].v += a.v; }); });
    h += '<div><b>裝備</b><ul>' + (items.length ? items.map(it => '<li style="color:' + R.rarityColor(it) + '">' + esc(R.itemName(it)) + (it.identified ? '' : '（未鑑定，詞綴沒有效果）') + '</li>').join('') : '<li>（什麼都沒穿）</li>') + '</ul>'
      + (Object.keys(aff).length ? '<small>詞綴合計：' + Object.values(aff).map(x => esc(x.d.txt(Math.round(x.v * 100) / 100))).join('、') + '</small>' : '') + '</div>';
    // 被動
    const pv = R.passivesOf ? R.passivesOf(cls) : [];
    h += '<div><b>被動</b><ul>' + (pv.length ? pv.map(id => { const p = R.PASSIVES[id]; return p ? '<li>' + esc(p.name || p.n || id) + '：' + esc(p.desc || p.d || '') + '</li>' : ''; }).join('') : '<li>（沒有裝上被動）</li>') + '</ul></div>';
    // 天賦
    const tal = st.sp && st.sp.t ? Object.keys(st.sp.t).filter(k => st.sp.t[k] > 0) : [];
    h += '<div><b>天賦</b><ul>' + (tal.length ? tal.map(k => { const t = (R.TALENTS || []).find(x => x[0] === k); return t ? '<li>' + esc(t[1]) + ' ★' + st.sp.t[k] + '：' + esc(t[4]) + ' × ' + st.sp.t[k] + '</li>' : ''; }).join('') : '<li>（還沒點天賦）</li>') + '</ul></div>';
    // 種族、稱號、熟練度、吃的
    const rb = R.raceBonusText && s.race ? R.raceBonusText(s.race) : [];
    const tn = R.titleName ? R.titleName() : '', tt = tn && R.TITLES ? R.TITLES.find(t => t[1] === tn) : null;
    const pf = R.profLv ? [P.item ? '武器 ' + (R.profLv.weapon(P.item.base) || 0) + ' 級' : '', '魔法 ' + (R.profLv.magic() || 0) + ' 級', '敏捷 ' + (R.profLv.agi() || 0) + ' 級'].filter(Boolean).join('・') : '';
    const bf = s.buff && s.buff.until === s.day && s.buff.b ? Object.keys(s.buff.b).map(k => ({ hp: '生命', mp: '魔力', dmg: '傷害', skillCd: '技能急速', regen: '回復', aware: '佩特拉的注意' })[k] || k).join('、') : '';
    h += '<div><b>其他</b><ul>' + (rb.length ? '<li>種族：' + esc(rb.join('・')) + '</li>' : '') + (tn ? '<li>稱號「' + esc(tn) + '」' + (tt ? '：' + esc(tt[3]) : '') + '</li>' : '<li>稱號：沒有戴</li>') + (pf ? '<li>熟練度：' + esc(pf) + '</li>' : '')
      + (bf ? '<li>今天吃的東西：' + esc(bf) + '（下遺跡的時候才算，上面的數字沒有含）</li>' : '') + '</ul></div>';
    h += '</div></details>';
    return h;
  };
  // 公會的倉庫頁最上面
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const tab = document.querySelector('[data-htab][aria-selected="true"]'), body = document.getElementById('hub-body'); if (!body || !tab || tab.dataset.htab !== 'stash') return;
    const box = document.createElement('div'); box.innerHTML = R.charSheetHtml(); if (box.firstChild) body.prepend(box.firstChild);
  };
  const css = document.createElement('style');
  css.textContent = '.cs-box{background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin:0 0 12px}.cs-box summary{cursor:pointer;font-weight:bold;color:var(--gold,#C9A13A)}'
    + '.cs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px 16px;margin-top:8px}.cs-sec h4,.cs-box>h4{margin:6px 0 4px;font-size:13px;opacity:.85}'
    + '.cs-row{display:grid;grid-template-columns:1fr auto;gap:0 8px;padding:2px 0;border-bottom:1px dashed rgba(255,255,255,.08)}.cs-row b{text-align:right}.cs-row small{grid-column:1/-1;opacity:.7;font-size:11px}'
    + '.cs-src{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px 16px;font-size:13px}.cs-src ul{margin:2px 0 4px;padding-left:1.1em}.cs-src small{opacity:.8}';
  document.head.appendChild(css);
})(window.R);
