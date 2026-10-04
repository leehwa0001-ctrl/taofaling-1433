// 理智（San 值）（2026-10-04 作者：新增 San 值，看佩特拉核心會掉 San 值，可以睡覺或玩遊戲、賭博回 San 值）
// - R.S.san：0～100，一開始 100。
// - 會掉：遺跡裡離佩特拉核心 14 公尺以內（打核心的時候、保留區最深處看著它的時候），越近掉越快，最快每秒 1.15；
//   在保留區最深處「看著佩特拉核心」那一下再 −6（20 秒內只算一次）。
// - 會回：睡一晚 +45（家裡、宿屋、旅館都算；一趟遺跡花掉的天數不算）；
//   玩遊戲（卡拉 OK、夾娃娃機）每 5 秒 +1、賭博（雀莊、柏青哥、拉霸機）每 4 秒 +1——看那個遊戲的畫面開著沒有。
//   電玩店的格鬥電玩玩一台 +3（interiors2.js 呼叫 R.sanAdd）。
// - 低的時候（只在遺跡裡）：
//   40～69 不安：畫面四周暗一點，偶爾聽到奇怪的聲音；
//   20～39 動搖：再暗一點，打出去的傷害 −10%；
//   0～19 崩潰邊緣：打出去的傷害 −20%、受到的傷害 +15%，奇怪的聲音更常出現。
// - 遺跡裡左上角、城裡（不是滿的時候）顯示理智；角色總數值也有一行。
// 放在 run.js、calendar.js、charsheet.js、dmgtype.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), rnd = Math.random;
  const get = () => { const s = S(); return s ? (s.san == null ? 100 : s.san) : 100; };
  const set = v => { const s = S(); if (!s) return; s.san = Math.max(0, Math.min(100, v)); };   // 不在這裡四捨五入：每一格扣的量很小
  const TIER = [[70, '清醒', '#9AE0B0'], [40, '不安', '#E8D07A'], [20, '動搖', '#F0A060'], [0, '崩潰邊緣', '#F06A6A']];
  const tier = v => TIER.find(t => v >= t[0]);
  R.sanValue = get; R.sanAdd = d => { set(get() + d); };
  R.sanTier = () => tier(get())[1];
  const WHISPER = ['（遠處好像有人在叫你的名字。）', '（你停下來，後面卻好像又響了一步。）', '（牆上的紋路剛剛是不是動了一下？）', '（剛才數到第幾個了？你看著背包，又從頭數了一遍。）', '（耳邊有很規律的搏動聲，跟心跳對不上。）', '（眼角有東西動了一下。轉過去看，什麼都沒有。）', '（同一個轉角，好像已經走過一次了。）'];
  // ---------- 遺跡裡：靠近核心會掉、低的時候的效果 ----------
  const coreOf = w => (w.enemies || []).find(e => e.id === 'petra' && !e.dead) || (w.F && w.F.coreView);
  let whisperT = 30, hudT = 0, lookCd = 0, lastShown = null;
  const fx = () => { let el = $('san-fx'); if (!el) { const f = $('r-field'); el = document.createElement('div'); el.id = 'san-fx'; el.className = 'veil'; el.style.cssText = 'transition:opacity 1.2s;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 45%,rgba(40,10,50,.85) 100%);opacity:0'; if (f) f.after(el); else document.body.appendChild(el); } return el; };
  const st0 = R.step;
  R.step = dt => {
    st0(dt);
    const w = W(), run = w.run, P = w.P; if (lookCd > 0) lookCd -= dt;
    if (run && !run.done && !w.paused && P && !P.dead) {
      const c = coreOf(w);
      if (c) { const d = Math.hypot(c.x - P.x, c.z - P.z); if (d < 14) set(get() - (0.15 + (1 - d / 14)) * dt); }
      const v = get();
      if (v < 70) { whisperT -= dt * (v < 20 ? 2.2 : v < 40 ? 1.5 : 1); if (whisperT <= 0) { whisperT = 35 + rnd() * 30; R.toast && R.toast(WHISPER[Math.floor(rnd() * WHISPER.length)], '#B8A0D8'); } }
    }
    hudT -= dt; if (hudT > 0) return; hudT = 0.5; hud();
  };
  const hud = () => {
    const w = W(), run = w.run, v = get(), t = tier(v), inRun = !!(run && !run.done);
    fx().style.opacity = inRun ? (v >= 70 ? 0 : v >= 40 ? 0.25 : v >= 20 ? 0.45 : 0.65) : 0;
    let el = $('r-san');
    if (!el) { const tl = $('r-tl'); if (!tl) return; el = document.createElement('div'); el.id = 'r-san'; el.className = 'glass r-misc'; el.style.cursor = 'pointer'; el.onclick = () => R.toast && R.toast('理智（San）：靠近佩特拉核心會掉；睡覺、玩遊戲、賭博會回來。現在 ' + Math.round(get()) + '（' + R.sanTier() + '）。', '#B8A0D8'); tl.appendChild(el); }
    const scr = $('run'), show = inRun || (!!S() && v < 100 && !!scr && !scr.hidden);   // 城裡（含室內）：不是滿的才顯示
    el.hidden = !show; if (!show) return;
    const txt = '理智 <b style="color:' + t[2] + '">' + Math.round(v) + '</b>・' + t[1];
    if (txt !== lastShown) { el.innerHTML = txt; lastShown = txt; }
  };
  R.sanHud = hud;
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { const v = get(); return he0(e, W().run && v < 40 ? raw * (v < 20 ? 0.8 : 0.9) : raw, o); };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => hp0(W().run && get() < 20 && raw > 0 ? raw * 1.15 : raw, src, o);
  // 看著佩特拉核心
  const cs0 = R.coreSheet;
  if (cs0) R.coreSheet = () => {
    cs0();
    if (lookCd > 0) return; lookCd = 20; set(get() - 6);
    try { const sh = $('r-sheet'); if (sh) { const p = document.createElement('p'); p.className = 'note'; p.style.color = '#C8A8FF'; p.textContent = '眼球轉向這邊。你移開視線，過了一會兒還是忍不住看回去。（理智 −6，現在 ' + Math.round(get()) + '）'; const row = sh.querySelector('.row'); if (row) row.before(p); else sh.appendChild(p); } } catch (e) { }
  };
  // ---------- 回復：睡覺 ----------
  let inEndRun = false;
  const er0 = R.endRun;
  R.endRun = (...a) => { inEndRun = true; try { return er0(...a); } finally { inEndRun = false; } };
  const ad0 = R.advanceDays;
  R.advanceDays = n => {
    const before = get(), r = ad0(n);
    if (!inEndRun && n > 0 && before < 100) { set(before + 45 * n); setTimeout(() => R.toast && R.toast('睡了一覺，腦袋清楚多了。理智 ' + Math.round(before) + ' → ' + Math.round(get()), '#B8A0D8'), 1800); R.save && R.save(); }
    return r;
  };
  // ---------- 回復：玩遊戲、賭博（看哪個遊戲的畫面開著） ----------
  const GAMES = [['ka-cv', 5, '唱歌'], ['cl-cv', 5, '夾娃娃'], ['mj-cv', 4, '打麻將'], ['pc-cv', 4, '打柏青哥'], ['sl-cv', 4, '玩拉霸']];
  const acc = {}; let saveT = 0;
  setInterval(() => {
    const s = S(); if (!s) return; if (!W().run) hud();   // 城裡不跑 R.step，顯示在這裡更新
    if (get() >= 100) return;
    const g = GAMES.find(x => { const c = $(x[0]); return c && c.isConnected && c.getClientRects().length > 0; }); if (!g) return;
    acc[g[0]] = (acc[g[0]] || 0) + 1;
    if (acc[g[0]] >= g[1]) { acc[g[0]] = 0; const was = get(); set(was + 1); if (Math.floor(get() / 10) > Math.floor(was / 10)) R.toast && R.toast(g[2] + '讓心情放鬆了。理智 ' + Math.round(get()), '#B8A0D8'); if (++saveT >= 10) { saveT = 0; R.save && R.save(); } }
  }, 1000);
  // ---------- 角色總數值 ----------
  const ch0 = R.charSheetHtml;
  if (ch0) R.charSheetHtml = cls => { const h = ch0(cls), v = get(), t = tier(v); return h.replace('<h4>基本</h4>', '<h4>基本</h4><div class="cs-row"><span>理智（San）</span><b style="color:' + t[2] + '">' + Math.round(v) + '／100</b><small>' + t[1] + (v < 40 ? (v < 20 ? '：遺跡裡傷害 −20%、受到的傷害 +15%' : '：遺跡裡傷害 −10%') : '') + '</small></div>'); };
})(window.R);
