// 角色總數值（作者 2026-10-03：倉庫那邊可以有個角色總共數值，看到裝備、被動全部的數值）
// - 公會的倉庫頁（換裝備的地方）最上面多一塊「角色總數值」：R.calcPlayer 算出來的最後數字（裝備、被動、天賦、種族、稱號、熟練度全部算進去），
//   下面列出這些數字是從哪裡來的（裝備詞綴的合計、裝上的被動、點的天賦、種族、稱號、熟練度、今天吃的東西）。
// - 吃東西的加成只在遺跡裡算，這裡另外寫出來。
// - 2026-10-05：遺跡暫停選單也開總數值（opt.live／戰鬥中用 W.P，滴血重生、技能強化、護盾等目前狀態看得到，方便確認被動有沒有真的運作）。
(function (R) {
  const S = () => R.S, esc = s => R.esc(s);
  const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
  const n1 = v => (Number.isFinite(+v) ? Math.round(v * 10) / 10 : 0).toString();   // 算不出來（NaN）就寫 0，不要顯示 NaN
  const row = (k, v, note) => '<div class="cs-row"><span>' + esc(k) + '</span><b>' + v + '</b>' + (note ? '<small>' + esc(note) + '</small>' : '') + '</div>';
  R.charSheetHtml = (cls, opt) => {
    const s = S(); cls = cls || s.cls; let P; const live = !!(opt && opt.live);
    try {
      if (live && R.W && R.W.P && R.W.run) P = R.W.P;
      else P = R.calcPlayer(cls);
    } catch (e) { return ''; }
    const st = s.classes[cls], eq = R.equipped(cls), ws = P.ws || {}, w = P.item && R.WEAPONS[P.item.base] || {};
    const hit = (ws.dmg || 0) * (P.dmgMult || 1), per = hit * (ws.pellets || 1) * (w.hits || 1), crit = Math.min(1, ws.crit || 0), cm = P.critMult || 1.5, dps = per * (ws.rate || 1) * (1 + crit * (cm - 1));
    const elem = [['fire', '火'], ['frost', '冰'], ['shock', '雷']].filter(([k]) => ws[k]).map(([k, n]) => n + ' ' + n1(ws[k])).join('・');
    const liveNote = live ? '（戰鬥中・目前狀態）' : '';
    let h = '<details class="cs-box" open><summary>角色總數值（' + esc(R.clsName(cls)) + ' Lv ' + st.lv + '）' + liveNote + '：裝備、被動、天賦、種族、稱號全部算進去</summary><div class="cs-grid">';
    h += '<div class="cs-sec"><h4>基本</h4>' + row('生命', (live && Number.isFinite(P.hp) ? Math.round(P.hp) + '／' : '') + Math.round(P.hpMax)) + row('魔力', (live && Number.isFinite(P.mp) ? Math.round(P.mp) + '／' : '') + Math.round(P.mpMax)) + (R.mpRegenOf ? row('每秒回魔', n1(R.mpRegenOf(P)) + ' 魔力') : '') + row('防禦', n1(P.def || 0)) + row('移動速度', n1(P.speed || 0) + ' 公尺／秒')
      + (P.str != null ? row('力量', P.str, P.tooHeavy ? '護具太重：移動、翻滾變慢' : '') : '') + (P.weightDrag ? row('武器重量', '−' + Math.round(P.weightDrag * 100) + '% 移動') : '') + '</div>';
    h += '<div class="cs-sec"><h4>攻擊</h4>' + row('武器', esc(P.item ? R.itemName(P.item) : '（沒有）')) + row('每一下', n1(hit) + ((ws.pellets || 1) > 1 ? ' × ' + ws.pellets : '') + ((w.hits || 1) > 1 ? ' × ' + w.hits : ''), '傷害倍率 ' + pct((P.dmgMult || 1) - 1))
      + row('攻擊速度', n1(ws.rate || 0) + ' 次／秒') + row('估計每秒傷害', Math.round(dps), '含暴擊的平均') + row('暴擊率', Math.round(crit * 100) + '%') + row('暴擊傷害', '×' + n1(cm))
      + (() => { const vi = R.vampInfo ? R.vampInfo(P) : null; const bl = (() => { if (!(P.ttBleed > 0 && P.hpMax > 0)) return ''; const hp = live && Number.isFinite(P.hp) ? P.hp : P.hpMax, miss = Math.max(0, Math.min(1, 1 - hp / P.hpMax)), vp = Math.round(P.ttBleed * miss * 1000) / 10, rp = Math.round(0.5 * P.ttBleed * miss * 1000) / 10; return row('滴血重生', '吸血係數 +' + vp + '%・恢復量 +' + rp + '%', live ? '目前少 ' + Math.round(miss * 100) + '% 生命（上面的吸血係數、回血、回復加成都已經算進去）' + (vi && vi.x <= 0 ? '；身上沒有別的吸血，0 加成後還是 0' : '') : '這裡當滿血算；到遺跡裡按暫停看目前生命的數字'); })(); if (vi) return row('吸血係數', vi.x) + bl + (vi.x > 0 ? row('回血機率', n1(vi.chance * 100) + '%', '每次攻擊（同一瞬間打到的算一次）；系數 ÷（系數＋250）') + row('每次回血', vi.heal, '普攻打一隻；一次打到多隻 ×(1＋√隻數)÷2') + (vi.skHeal ? row('技能／大招回血', vi.skHeal, '必定觸發：普攻的回血量 × 回血機率 ÷ 2（×' + (Math.round(vi.skMult * 1000) / 1000) + '）') : '') : ''); return ws.vamp ? row('吸血', Math.round(ws.vamp * 1000) / 10 + '%') : ''; })() + (elem ? row('屬性', elem) : '') + (ws.pierce ? row('穿透', ws.pierce) : '') + (ws.range ? row('攻擊距離', (ws.range0 ? pct(ws.range / ws.range0 - 1) + '（' : '') + n1(ws.range) + ' 公尺' + (ws.range0 ? '）' : ''), ws.range0 ? '比武器原本的 ' + n1(ws.range0) + ' 公尺' : '') : '')
      + (ws.arc && w.arc ? row('攻擊範圍', pct(ws.arc / w.arc - 1) + '（揮砍 ' + Math.round(ws.arc * 180 / Math.PI) + '°）', '比武器原本的 ' + Math.round(w.arc * 180 / Math.PI) + '°') : '') + '</div>';
    h += '<div class="cs-sec"><h4>防守・其他</h4>' + row('翻滾冷卻', n1(P.dodgeCdMax || 0) + ' 秒') + (P.haste != null ? row('技能急速', '+' + Math.round(P.haste), '冷卻 ' + pct((P.skillCdMult || 1) - 1)) : row('技能冷卻', pct((P.skillCdMult || 1) - 1)))
      + (() => { const base = +P.regen || 0, mul = R.regenMul ? R.regenMul(P) : 0.3, amp = Math.max(0, 1 + (R.recovAmpOf ? R.recovAmpOf(P) : (+P.recovAmp || 0))), per5 = base * mul * amp * 5; return row('每 5 秒回復', n1(per5) + ' 生命', '持續回血折算（面板 ' + n1(base) + ' × 實際倍率）；體感大約每 5 秒回這麼多'); })()
      + (() => { const ra = R.recovAmpOf ? R.recovAmpOf(P) : (+P.recovAmp || 0), hm = (1 + ((P.pv && +P.pv.heal) || 0)) * (+P.healMul || 1) * (R.hasAdv && R.hasAdv('bishop') ? 1.3 : 1); return row('回復加成', (ra >= 0 ? '+' : '') + Math.round(ra * 100) + '%', live ? '恢復量：每秒回血、吸血都算（已含滴血重生，照目前生命）' : '恢復量：每秒回血、吸血都算（滴血重生照目前生命另算：這裡當滿血）') + (Math.abs(hm - 1) > 0.001 ? row('受到的治療', (hm >= 1 ? '+' : '') + Math.round((hm - 1) * 100) + '%', '治療技能、吸血、藥水回的都算') : ''); })()   /* 2026-10-05 作者：角色總數值沒有顯示回復加成 */ + (live && P.shield > 0 ? row('護盾', Math.round(P.shield)) : '') + (P.mpRegen ? row('回魔', '每秒 +' + n1(P.mpRegen) + ' 魔力') : '') + (P.pen ? row('穿透', '無視 ' + Math.round(P.pen * 100) + '% 護甲') : '')
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
  // 遺跡暫停：開總數值（用目前戰鬥中的 P，方便確認被動／滴血重生／吸血有沒有生效）
  const ps0 = R.pauseSheet;
  if (ps0) R.pauseSheet = () => {
    const run = R.W && R.W.run; if (!run) return ps0();
    const stats = R.charSheetHtml(null, { live: true }) || '';
    // 2026-10-05 作者：哈米莉亞級、阿彌勒級的第 0 層（休息區）和訓練場，「放棄這一趟」改成「直接回程」——跟從入口走出去一樣，東西都帶得走、不會掉裝備
    const train = !!(run.site && run.site.kind === 'train'), safe = !run.done && (train || !!(run.grade && run.grade.floor0 && run.floor === 0));
    const where = train ? '' : '・' + (R.floorLabel ? R.floorLabel(run) : '第 ' + (run.floor + 1) + ' 層');
    R.sheet('<h2>暫停</h2><p>' + esc(run.site.name) + where + '</p>'
      + '<p class="note">' + (R.touch ? '左搖桿移動・右搖桿瞄準並攻擊・按鈕：技能、翻滾、互動、回復藥、背包・右上角的箭頭轉動視角、「遠近」拉近拉遠' : 'WASD 移動・滑鼠瞄準、左鍵或 F 攻擊・R 或右鍵、3、4 技能・點 Shift 翻滾、按住 Shift 跑步・空白鍵互動・Q／E 轉視角・滾輪拉近拉遠・1 回復藥・2 魔力藥・X 換彈・I 背包・Tab 地圖') + '</p>'
      + '<p class="note">佩特拉的注意：打破東西、爆炸、喚群燈大叫、被群瞳盯著都會讓它上升；什麼都不做會慢慢降，換一層剩四成。滿了會觸發遺跡的反應。牆上張開的眼睛越多，代表它越注意你。</p>'
      + stats,
      '<div class="row"><button type="button" class="btn pri" id="ps-x">繼續</button><button type="button" class="btn" id="ps-mute">' + (R.isMuted() ? '打開音效' : '關掉音效') + '</button>' + (R.S && R.S.hood ? '<button type="button" class="btn" id="ps-hood">' + (R.S.hoodOn ? '拿下兜帽' : '戴上兜帽') + '</button>' : '') + (safe ? '<button type="button" class="btn" id="ps-quit" title="跟從入口走出去一樣：背包、素材都帶回去">直接回程</button>' : '<button type="button" class="btn" id="ps-quit">放棄這一趟（當作倒下）</button>') + '</div>');
    const $ = id => document.getElementById(id);
    $('ps-x').onclick = R.closeSheet;
    $('ps-mute').onclick = () => { R.toggleMute(); R.pauseSheet(); };
    $('ps-quit').onclick = safe ? () => { R.closeSheet(); if (train && R.trainLeave) R.trainLeave(); else R.extract('exit'); } : () => { R.closeSheet(); R.W.P.hp = 0; R.onPlayerDown(); };
    if ($('ps-hood')) $('ps-hood').onclick = () => { R.toggleHood(); R.pauseSheet(); };
  };
  const css = document.createElement('style');
  css.textContent = '.cs-box{background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin:0 0 12px}.cs-box summary{cursor:pointer;font-weight:bold;color:var(--gold,#C9A13A)}'
    + '.cs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px 16px;margin-top:8px}.cs-sec h4,.cs-box>h4{margin:6px 0 4px;font-size:13px;opacity:.85}'
    + '.cs-row{display:grid;grid-template-columns:1fr auto;gap:0 8px;padding:2px 0;border-bottom:1px dashed rgba(255,255,255,.08)}.cs-row b{text-align:right}.cs-row small{grid-column:1/-1;opacity:.7;font-size:11px}'
    + '.cs-src{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px 16px;font-size:13px}.cs-src ul{margin:2px 0 4px;padding-left:1.1em}.cs-src small{opacity:.8}';
  document.head.appendChild(css);
})(window.R);
