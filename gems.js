// 寶石鑲嵌（2026-10-04 作者：增加鑲嵌寶石在武器防裝上，寶石可以打怪掉，概率很低）
// - 七種寶石（素材，R.MATS）：紅玉＝傷害、藍玉＝魔力、綠玉＝生命、黃玉＝暴擊率、紫晶＝暴擊傷害、白晶＝防禦、黑曜＝穿透（無視護甲）。
// - 打倒遺跡生物掉：一般 0.4%、精英 3%、領主體和佩特拉核心 15%（遺跡裡；野獸不掉）。
// - 鐵匠鋪「精煉・重鑄」那一頁：開孔（稀有 1、史詩 2、傳說 2、神話 3 個孔）、鑲嵌（換上新的，舊的會碎掉）。
//   孔存在裝備上（it.sockets = ['ruby', null…]）。穿在身上的裝備，寶石的效果照算（R.calcPlayer）；說明會列出來。
// 放在 crafting.js、gearplus.js、affixplus.js 後面。
(function (R) {
  const S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s), rnd = Math.random;
  const GEMS = {
    gem_ruby: { name: '紅玉', color: '#E8404A', txt: '傷害 +4%', fx: { dmg: 0.04 } },
    gem_sapph: { name: '藍玉', color: '#4A7AE8', txt: '魔力 +10%', fx: { mp: 0.1 } },
    gem_emer: { name: '綠玉', color: '#3AC86A', txt: '生命 +5%', fx: { hp: 0.05 } },
    gem_topaz: { name: '黃玉', color: '#E8C03A', txt: '暴擊率 +6%', fx: { crit: 0.06 } },   // 2026-10-04 作者：黃色寶石效益太低（原本 +2%＝平均傷害只多 1.6%，紅玉是 +4%）
    gem_ameth: { name: '紫晶', color: '#A86AE8', txt: '暴擊傷害 +10%', fx: { critMult: 0.1 } },
    gem_dia: { name: '白晶', color: '#E8F2FF', txt: '防禦 +2', fx: { def: 2 } },
    gem_obsid: { name: '黑曜', color: '#3A2E44', txt: '無視護甲 +3%', fx: { pen: 0.03 } }
  };
  const IDS = Object.keys(GEMS);
  IDS.forEach(k => { R.MATS[k] = R.MATS[k] || { name: GEMS[k].name, color: GEMS[k].color, value: 120, desc: '遺跡生物體內結出來的寶石，很少見。鐵匠鋪可以鑲在裝備的孔裡：' + GEMS[k].txt + '。' }; });
  R.GEMS = GEMS;
  const SOCK = [0, 0, 1, 2, 2, 3];   // 照稀有度：最多幾個孔
  const maxSock = it => (it && (it.kind === 'weapon' || it.kind === 'armor') && it.identified ? SOCK[it.rarity] || 0 : 0);
  // ---------- 掉落 ----------
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by);
    try {
      const run = R.W.run; if (!was || !e.dead || !run || !run.site || run.site.kind !== 'ruin' || (e.def && e.def.wild)) return r;
      const p = e.def && (e.def.boss || /^領主體/.test(e.def.name || '')) ? 0.15 : e.def && e.def.elite ? 0.03 : 0.004;
      if (rnd() < p) { const g = IDS[Math.floor(rnd() * IDS.length)]; R.dropMat(g, 1, e.x, e.z); setTimeout(() => R.toast && R.toast('掉了一顆' + GEMS[g].name + '！', GEMS[g].color), 300); }
    } catch (err) { }
    return r;
  };
  // ---------- 效果 ----------
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const eq = R.equipped(cls), sum = {};
      R.GEAR_KEYS.forEach(k => { const it = eq[k]; (it && it.sockets || []).forEach(g => { if (g && GEMS[g]) Object.keys(GEMS[g].fx).forEach(f => { sum[f] = (sum[f] || 0) + GEMS[g].fx[f]; }); }); });
      if (sum.dmg) P.dmgMult *= 1 + sum.dmg; if (sum.mp) P.mpMax = Math.round(P.mpMax * (1 + sum.mp)); if (sum.hp) P.hpMax = Math.round(P.hpMax * (1 + sum.hp));
      if (sum.crit && P.ws) P.ws.crit += sum.crit; if (sum.critMult) P.critMult += sum.critMult; if (sum.def) P.def = (P.def || 0) + sum.def; if (sum.pen) P.pen = Math.min(0.8, (P.pen || 0) + sum.pen);
    } catch (e) { }
    return P;
  };
  const il0 = R.itemLines;
  R.itemLines = it => { const L = il0(it); try { if (it && it.sockets && it.sockets.length) L.push('寶石孔：' + it.sockets.map(g => g && GEMS[g] ? GEMS[g].name + '（' + GEMS[g].txt + '）' : '空').join('・')); } catch (e) { } return L; };
  // ---------- 鐵匠鋪：開孔、鑲嵌 ----------
  const drillPrice = it => 500 + 400 * (it.sockets ? it.sockets.length : 0) + 150 * it.rarity;
  const sheet = it => {
    const s = S(), socks = it.sockets || [], have = IDS.filter(g => (s.mats[g] || 0) > 0), dp = drillPrice(it), canDrill = socks.length < maxSock(it);
    // 2026-10-05 作者：鑲嵌的側邊放個說明，表示每個寶石的效果（窄的畫面排到下面）
    const guide = '<aside style="flex:0 1 230px;min-width:200px;border-left:1px solid var(--line,#5A4A3A);padding-left:12px"><b>寶石一覽</b><ul style="list-style:none;padding:0;margin:6px 0;display:grid;gap:4px">'
      + IDS.map(g => '<li><span style="display:inline-block;width:.8em;height:.8em;border-radius:50%;background:' + GEMS[g].color + ';border:1px solid #AAA;vertical-align:-1px"></span> <b>' + GEMS[g].name + '</b>：' + GEMS[g].txt + ' <small>（有 ' + (s.mats[g] || 0) + '）</small></li>').join('')
      + '</ul><small>效果照身上穿著的裝備算，同一種寶石可以疊。打倒遺跡生物會掉：一般 0.4%、精英 3%、領主體和佩特拉核心 15%。</small></aside>';
    R.hubSheet('<p class="kicker">鐵匠鋪</p><h2>鑲嵌：' + esc(R.itemName(it)) + '</h2><div style="display:flex;flex-wrap:wrap;gap:12px"><div style="flex:1 1 280px;min-width:0"><p class="note">老岩：「孔開了就補不回去。寶石鑲進去，再換的話舊的會碎掉——想清楚。」這件最多 ' + maxSock(it) + ' 個孔。</p>'
      + (socks.length ? '<div class="recipes">' + socks.map((g, i) => '<div class="recipe"><b>孔 ' + (i + 1) + '：' + (g && GEMS[g] ? '<span style="color:' + GEMS[g].color + '">' + GEMS[g].name + '</span>（' + GEMS[g].txt + '）' : '空') + '</b><div class="row">' + (have.length ? have.map(h => '<button type="button" class="mini" data-gem="' + i + ':' + h + '" style="color:' + GEMS[h].color + '">鑲' + GEMS[h].name + '（' + s.mats[h] + '）</button>').join('') : '<small>身上沒有寶石（打遺跡生物很少會掉）</small>') + '</div></div>').join('') + '</div>' : '<p class="note">還沒有孔。</p>')
      + (canDrill ? '<div class="row"><button type="button" class="btn pri" id="gm-drill"' + (s.gold < dp ? ' disabled' : '') + '>開一個孔（' + dp + ' 費拉）</button></div>' : '') + '</div>' + guide + '</div>',
      '<div class="row"><button type="button" class="btn" id="gm-x">好了</button></div>');
    $('gm-x').onclick = () => R.hubSheetClose();
    const dr = $('gm-drill'); if (dr) dr.onclick = () => { if (s.gold < dp || (it.sockets || []).length >= maxSock(it)) return; s.gold -= dp; it.sockets = (it.sockets || []).concat([null]); R.save(); R.sfx && R.sfx('chest'); sheet(it); };
    document.querySelectorAll('[data-gem]').forEach(b => { b.onclick = () => { const [i, g] = b.dataset.gem.split(':'); if (!(s.mats[g] > 0)) return; const old = it.sockets[+i]; if (old && !confirm('換上' + GEMS[g].name + '，原本的' + GEMS[old].name + '會碎掉？')) return; s.mats[g]--; it.sockets[+i] = g; R.save(); R.sfx && R.sfx('magic'); sheet(it); }; });
  };
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    try {
      document.querySelectorAll('#hub-body [data-reforge]').forEach(rb => {
        const it = R.itemById(rb.dataset.reforge); if (!it || !maxSock(it) || rb.parentNode.querySelector('[data-gemopen]')) return;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.dataset.gemopen = it.id; b.textContent = '鑲嵌（孔 ' + (it.sockets || []).length + '／' + maxSock(it) + '）'; b.onclick = () => sheet(it);
        rb.after(b);
      });
    } catch (e) { console.warn('[gems]', e); }
  };
})(window.R);
