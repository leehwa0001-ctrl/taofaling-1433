// 難度：血量 ×2、後期的保底（2026-10-04 作者：難度有點太低，血量調整成 2 倍，傷害差不多；加條款打 2 倍血的領主一樣一下就被秒；
//   後期玩家太輕鬆，可以加難後期）
// - 所有遺跡生物（人和狩獵場的野獸除外）生命 ×2。
// - 後期的保底（摩爾斯級以上）：玩家的傷害每升一級 +3%、再乘裝備、暴擊，到後期會把遺跡生物的加成甩開（那些加成都有上限）。
//   照「同等級的標準一下普攻」算一個最低生命（2026-10-05 改；原本照玩家自己的）：普通 4～10 下、精英 18～36 下、領主體 120～240 下、佩特拉核心 200～400 下（越深越多，照走到第幾成）。
//   遺跡生物的生命至少是這個數字（加注條款的生命倍率另外再乘）。
// - 傷害不動（作者：傷害目前感覺差不多）。
// - 穿透加強（見下面）。
// 放在所有包 R.spawnEnemy、R.enemyDefend 的檔案後面（最外面）。
(function (R) {
  const W = () => R.W, S = () => R.S;
  const isLord = d => !!(d && (/^領主體/.test(d.name || '')));
  // 玩家一下普攻的傷害（含等級、裝備、物攻魔攻、暴擊的平均）
  let cache = { t: -1, v: 0 };
  const hitOf = () => {
    const w = W(), P = w.P, run = w.run; if (!P || !P.ws) return 0;
    if (run && cache.t === run.floor && cache.run === run) return cache.v;
    const ws = P.ws, b = P.item && R.WEAPONS[P.item.base] || {}, mag = ws.kind === 'magic';
    const v = (ws.dmg || 0) * (P.dmgMult || 1) * (mag ? (P.matk || 1) : (P.patk || 1)) * (ws.pellets || 1) * (b.hits || 1) * (1 + Math.min(1, ws.crit || 0) * ((P.critMult || 1.5) - 1));
    cache = { t: run ? run.floor : -1, run, v }; return v;
  };
  R.playerHitEstimate = hitOf;
  // 2026-10-05 作者：保底改照「同等級的標準傷害」算（跟 dmgfloor.js 的怪物傷害保底一樣）——
  //   原本照你自己的一下普攻算，傷害、暴擊的寶石、詞綴、天賦、種族到後期全被抵掉，堆裝備沒感覺。
  //   標準＝同等級的一般勇者：一把每秒 35 傷害的武器（武器表的中位數，換算成長劍那樣每秒 2.3 下＝一下 15.2）、
  //   同等級的「史詩 +5、傷害詞綴 15%、暴擊 10%」。不看你拿什麼武器——武器的每秒傷害、攻速、裝備、天賦、暴擊、種族全部都算數：
  //   比標準強的人殺得快，比標準弱的人殺得慢。STD 調難易度。
  //   R.playerHitEstimate（你實際打一下多少）照舊給炸彈、棘背狼的毛用。
  const STD = { dps: 35, rate: 2.3, rar: 1.42, plus: 5, aff: 0.15, crit: 0.1, critMult: 1.8 };
  let cacheS = { t: -1, v: 0 };
  const stdHit = () => {
    const w = W(), P = w.P, run = w.run; if (!P || !P.item) return 0;
    if (run && cacheS.t === run.floor && cacheS.run === run) return cacheS.v;
    const st = S() && S().classes && S().classes[P.cls], lv = Math.max(1, (st && st.lv) || P.lv || 1);
    const v = STD.dps / STD.rate * (1 + 0.13 * (lv - 1)) * STD.rar * (1 + 0.08 * STD.plus) * (1 + STD.aff) * (1 + 0.03 * (lv - 1)) * (1 + STD.crit * (STD.critMult - 1));
    cacheS = { t: run ? run.floor : -1, run, v }; return v;
  };
  R.standardHit = stdHit;
  // 坦度差距縮小（2026-10-04 作者：坦克跟脆皮的坦度差太多，差了快 10 倍，清完小怪常常剩幾隻很硬的；坦克生命至少 −30%、脆皮 ×2）：
  //   一般的遺跡生物照「生命 ÷ (1 − 護甲)」分：25 以下的脆皮 ×2、100 以上的坦克 ×0.65，中間照對數慢慢接（中位數 46 大約 ×1.2）。
  //   原本最脆 9、最硬 217（24 倍），大部分落在 18～120；調完大部分落在 36～78。精英、領主體、核心不動；變種照原本那一種算。
  const toughK = d => {
    const b = d && d.vbase ? R.ENEMIES[d.vbase] || d : d; if (!b || b.elite || b.boss || isLord(b) || b.human || b.wild) return 1;
    const t = (b.hp || 1) / (1 - Math.min(0.9, b.armor || 0)), lo = 25, hi = 100;
    if (t <= lo) return 2; if (t >= hi) return 0.65;
    const x = (Math.log(t) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)); return Math.exp(Math.log(2) + x * (Math.log(0.65) - Math.log(2)));
  };
  R.toughK = toughK;
  const se0 = R.spawnEnemy;
  R.spawnEnemy = (id, x, z, room, o) => {
    const e = se0(id, x, z, room, o), run = W().run; if (!e || !run || !e.def || e.def.human || e.def.wild || e.fake) return e;
    let hp = e.hpMax * 2 * (e.id === 'petra' ? 1 : toughK(e.def));   // 全部 ×2；一般的照坦度拉近
    try {
      const g = run.grade && run.grade.lv || 1;
      if (g >= 3) {
        const depth = Math.max(0, Math.min(1, (run.floor || 0) / Math.max(1, (run.floors || 1) - 1))), hit = stdHit();   // 照同等級的標準，不照你自己
        const n = e.id === 'petra' ? 200 : isLord(e.def) ? 120 : e.def.elite || e.def.boss ? 18 : 4, extra = e.id === 'petra' ? 200 : isLord(e.def) ? 120 : 0;   // 一般、精英的深度加成改由 deepbonus.js 乘（2026-10-04）
        const pk = run.pact && run.pact.sel && run.pact.sel.hp ? [1, 1.5, 2][run.pact.sel.hp] : 1;
        hp = Math.max(hp, hit * (n + extra * depth) * (g >= 5 ? 1.3 : g >= 4 ? 1 : 0.7) * pk);
      }
    } catch (err) { }
    const k = hp / e.hpMax; e.hp *= k; e.hpMax = hp;
    return e;
  };
  // ---------- 穿透（2026-10-04 回報：穿甲感覺沒有效果，坦克打起來還是超硬） ----------
  // 原本：護甲 × (1 − 穿透)，22% 穿透打 35% 護甲只多 12% 傷害；格擋、縮殼、護盾、「堅硬」這些減傷完全不受影響。
  // 現在：物理傷害無視的護甲是穿透的兩倍（50% 穿透就完全無視護甲）；每 1% 穿透再打穿 1.5% 的格擋、縮殼、護盾之類的減傷。
  const he1 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P, pen = P ? P.pen || 0 : 0;
    if (e && !e.dead && pen > 0 && e.def && e.def.armor && !(R.isMagHit && R.isMagHit(o))) { const a = e.def.armor, a1 = Math.min(0.9, a * (1 - pen)), a2 = a * Math.max(0, 1 - pen * 2); raw *= (1 - a2) / (1 - a1); }
    return he1(e, raw, o);
  };
  const pa = (R.W_AFFIX || []).find(a => a.id === 'pen'); if (pa) pa.txt = v => '穿透 ' + v + '%（無視 ' + Math.min(100, v * 2) + '% 護甲、打穿 ' + Math.min(100, Math.round(v * 1.5)) + '% 格擋之類的減傷）';
  const cs0 = R.charSheetHtml;
  if (cs0) R.charSheetHtml = cls => { const h = cs0(cls); try { const P = R.calcPlayer(cls || R.S.cls), p = P.pen || 0; if (!p) return h; return h.replace('無視 ' + Math.round(p * 100) + '% 護甲', '無視 ' + Math.min(100, Math.round(p * 200)) + '% 護甲、打穿 ' + Math.min(100, Math.round(p * 150)) + '% 減傷'); } catch (e) { return h; } };
  const ed0 = R.enemyDefend;
  if (ed0) R.enemyDefend = (e, dmg, o, crit) => {
    const out = ed0(e, dmg, o, crit), P = W().P, pen = P ? P.pen || 0 : 0;
    if (pen > 0 && dmg > 0 && out < dmg) { const r = out / dmg; return dmg * (r + (1 - r) * Math.min(1, pen * 1.5)); }
    return out;
  };
})(window.R);
