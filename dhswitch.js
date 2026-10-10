// 東鶴換成精緻版（2026-10-10 作者選 A：預設精緻版；電腦跑不動自動換回像素版；暫停選單可以自己切）
// - 所有進東鶴的路（R.enterTownNow：開遊戲、從遺跡回來、睡一晚、搭車回來、受罰……；精緻版自己的換日 CK.enter('donghe')）都改走精緻版：
//   先在背景照原本的流程把像素版的東鶴蓋一次，收下所有互動、站著的人、劇情人物和玩家的位置（city_donghe.js 的 CK.dongheHarvest），再蓋精緻版。
//   地名的橫幅只留像素版那一次（「從遺跡回來了」這些）。精緻版蓋失敗就退回像素版。
// - 選擇記在 localStorage tfl-donghe：'ck'（精緻版）、'pixel'（像素版）；沒選過＝自動（tfl-donghe-auto）。
//   自動：畫質已經自動降到「低」（ckperf.js）、動態解析度也降到底（perfhud.js）以後再量 4 秒，平均每格超過 34 毫秒（不到 30 fps）
//   → 記成像素版，當場在同一個位置換回像素版，跳一句說明；進一次東鶴要超過 10 秒的電腦也記成像素版（下次進城才換）。
//   開遊戲後的第一次進城不算時間（瀏覽器剛開始比較慢、第一次要做貼圖和編譯著色器：快的電腦也要 10 秒左右，之後 1.5 秒）。
// - 暫停選單多一顆「東鶴：換成像素版／精緻版」。
// - 斜路要用的函式庫（Clipper）還沒載好的時候，先用像素版。
// 放在所有包 R.enterTownNow、CK.enter、R.townStep、R.townMenu 的檔案後面（最外層）。
(function (R) {
  const CK = R.CK, W = R.W; if (!CK || !CK.cities || !CK.cities.donghe || !CK.dongheHarvest) return;
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } return null; };
  const mode = () => LS('tfl-donghe') || (LS('tfl-donghe-auto') === 'pixel' ? 'pixel' : 'ck');
  const ready = () => !!(window.THREE && window.ClipperLib);
  R.dongheMode = mode;
  const en0 = R.enterTownNow, ce0 = CK.enter;
  CK._enterPixel = en0;   // 收東西的時候直接蓋像素版（city_donghe.js）
  let busy = false, nEnter = 0;
  const enterCK = (from, at, o) => {
    const t0 = performance.now(), rb = R.banner; let H = null, ban = null;
    R.banner = (...a) => { if (!ban) ban = a; };
    try {
      busy = true;
      try { H = CK.dongheHarvest(from, at); } finally { busy = false; }
      const P = W.P, pos = P ? [P.x, P.z, P.yaw || 0] : (o && o.at) || null;
      CK._dongheH = H;
      try { ce0('donghe', Object.assign({}, o || {}, pos ? { at: pos } : {})); } finally { CK._dongheH = null; }
      const tw = W.town, P2 = W.P;
      if (tw) tw.from = from || null;
      if (P2) { R.collide(P2, 0.42); P2.yv = CK.heightAt(P2.x, P2.z); P2.h.g.position.set(P2.x, P2.yv, P2.z); R.placeCam(null); }   // 像素版的位置在精緻版可能壓在東西裡
    } finally { R.banner = rb; }
    if (ban) R.banner(...ban);
    const ms = performance.now() - t0;
    if (nEnter++ > 0 && ms > 10000 && !LS('tfl-donghe')) { LS('tfl-donghe-auto', 'pixel'); setTimeout(() => R.toast('精緻版的東鶴在這台電腦上蓋得太久：下次進城改用像素版（暫停選單可以換回來）', '#E8C04A'), 4000); }
  };
  R.enterTownNow = (from, at) => {
    if (busy || mode() !== 'ck' || !ready()) return en0(from, at);
    try { return enterCK(from, at); } catch (e) { console.error('[donghe] 精緻版蓋失敗，改用像素版', e); busy = false; CK._dongheH = null; return en0(from, at); }
  };
  CK.enter = (id, o) => {
    if (id !== 'donghe' || busy || CK._dongheH) return ce0(id, o);
    const at = o && o.at ? o.at.slice(0, 2) : null, from = W.town ? W.town.from : null;
    if (mode() !== 'ck' || !ready()) return en0(from, at);
    try { return enterCK(from, at, o); } catch (e) { console.error('[donghe] 精緻版蓋失敗，改用像素版', e); busy = false; CK._dongheH = null; return en0(from, at); }
  };
  // ---------- 跑不動：自動換回像素版 ----------
  let m = null;
  const back = () => {
    LS('tfl-donghe-auto', 'pixel'); m = null;
    const tw = W.town, P = W.P, at = P ? [P.x, P.z] : null, from = tw ? tw.from : null;
    R.toast('電腦有點跟不上精緻版的東鶴：換成像素版（暫停選單可以換回來）', '#E8C04A');
    if (R.fade) R.fade(() => en0(from, at)); else en0(from, at);
  };
  const watch = () => {
    const tw = W.town; if (!tw || tw.ck !== 'donghe' || tw.room || W.inside || W.paused || document.hidden || LS('tfl-donghe')) { m = null; return; }
    const pf = R.ckPerf ? R.ckPerf() : null; if (!pf || !pf.done || CK.quality() > 0 || (CK.dynScale || 1) > 0.55) { m = null; return; }
    const now = performance.now();
    if (!m || m.tw !== tw) { m = { tw, last: now, warm: 0, acc: 0, n: 0 }; return; }
    if (m.ok) return;
    const f = now - m.last; m.last = now; if (f > 250) return;
    m.warm += f; if (m.warm < 2000) return;
    m.acc += f; m.n++;
    if (m.acc >= 4000) { if (m.acc / m.n > 34) back(); else m.ok = true; }
  };
  const ts0 = R.townStep;
  R.townStep = dt => { const r = ts0(dt); try { watch(); } catch (e) { } return r; };
  // ---------- 暫停選單：自己切 ----------
  const tm0 = R.townMenu;
  if (tm0) R.townMenu = (...a) => {
    const r = tm0(...a);
    try {
      const tw = W.town, ck = !!(tw && tw.ck === 'donghe' && !tw.room), px = !!(tw && !tw.ck && !tw.hosu);
      const row = document.querySelector('#r-sheet .row');
      if (row && !W.run && !W.inside && (ck || px) && !row.querySelector('#dh-mode') && (ck || ready())) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'dh-mode';
        b.textContent = ck ? '東鶴：換成像素版' : '東鶴：換成精緻版';
        b.title = ck ? '像素版比較省電腦（電腦比較慢的時候用）' : '精緻版：照同一張地圖蓋的 3D 東鶴';
        b.onclick = () => { LS('tfl-donghe', ck ? 'pixel' : 'ck'); if (!ck) LS('tfl-donghe-auto', null); R.closeSheet(); const P = W.P, at = P ? [P.x, P.z] : null, from = tw.from || null; R.fade(() => R.enterTownNow(from, at)); };
        row.appendChild(b);
      }
    } catch (e) { console.warn('[dhswitch]', e); }
    return r;
  };
})(window.R);
