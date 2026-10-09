// 幀數小框、精緻城市的動態解析度（2026-10-10 作者：3D 城還是會卡——替電腦比較差的玩家）
// - 幀數小框：F3 或暫停選單的「顯示幀數」開關（記在瀏覽器）。顯示每秒幾格、每格幾毫秒（這一秒最慢的一格）、
//   一格畫幾次（繪製次數）、幾個三角形、畫質、解析度、顯示卡的名字——玩家說卡的時候，請他把這一行抄下來，就知道卡在哪。
//   只在玩家自己的畫面上顯示，不會送到任何地方。
// - 動態解析度（精緻城市）：畫質是「低」、或是自己在選單選過畫質（不再自動降）的時候，每 2 秒看一次平均每格時間：
//   超過 24 毫秒（不到 42 fps）解析度降一成（最低五成），連續兩次低於 18 毫秒升回一成；剛升上去又變卡的話，30 秒內不再升。
//   解析度只改精緻城市的那一張大畫布（citykit.js 的 CK.render 乘 CK.dynScale），像素風本來就是小畫布放大，不用改。
// 放在 gfxq.js 後面。
(function (R) {
  const CK = R.CK, W = R.W; if (!CK) return;
  const QN = ['低', '中', '高'];
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } return null; };
  CK.dynScale = 1;
  // ---------- 動態解析度 ----------
  let last = 0, acc = 0, n = 0, winT = 0, good = 0, lockUntil = 0, lastUp = 0;
  const dynOn = () => CK.quality() === 0 || !!LS('tfl-cityq-user');
  const dynTick = () => {
    const tw = W.town; if (!tw || !tw.ck || W.inside || W.paused || document.hidden || !dynOn()) { last = 0; return; }
    const now = performance.now();
    if (last) { const f = now - last; if (f < 250) { acc += f; n++; winT += f; } }
    last = now;
    if (winT < 2000 || n < 10) return;
    const avg = acc / n; acc = 0; n = 0; winT = 0;
    if (avg > 24 && CK.dynScale > 0.5) { if (now - lastUp < 6000) lockUntil = now + 30000; CK.dynScale = Math.max(0.5, Math.round((CK.dynScale - 0.1) * 10) / 10); good = 0; }
    else if (avg < 18 && CK.dynScale < 1 && now > lockUntil) { if (++good >= 2) { CK.dynScale = Math.min(1, Math.round((CK.dynScale + 0.1) * 10) / 10); good = 0; lastUp = now; } }
    else good = 0;
  };
  const ts0 = R.townStep;
  R.townStep = dt => { const r = ts0(dt); try { dynTick(); } catch (e) { } return r; };
  // ---------- 幀數小框 ----------
  let on = LS('tfl-fps') === '1', box = null, fr = 0, worst = 0, t0 = 0, lastF = 0, calls = 0, tris = 0, gpu = null;
  const gpuName = () => {
    if (gpu !== null) return gpu; gpu = '';
    try { const gl = W.renderer && W.renderer.getContext(), ext = gl && gl.getExtension('WEBGL_debug_renderer_info'); if (ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '').replace(/^ANGLE \((.*)\)$/, '$1').replace(/ Direct3D.*$/, '').replace(/\(0x[0-9A-Fa-f]+\)/g, '').replace(/^[^,()]+,\s*/, '').trim(); } catch (e) { }
    return gpu;
  };
  const ensureBox = () => {
    if (box) return box;
    box = document.createElement('div'); box.id = 'fps-box';
    box.style.cssText = 'position:fixed;left:50%;top:4px;transform:translateX(-50%);z-index:9999;pointer-events:none;font:12px/1.4 ui-monospace,Consolas,monospace;color:#F4ECD8;background:rgba(20,16,14,.72);padding:2px 10px;border-radius:6px;white-space:nowrap;max-width:96vw;overflow:hidden;text-overflow:ellipsis';
    document.body.appendChild(box); return box;
  };
  const show = v => { on = v; LS('tfl-fps', v ? '1' : null); if (v) ensureBox().hidden = false; else if (box) box.hidden = true; fr = 0; worst = 0; t0 = 0; };
  R.showFps = show;
  const rf0 = R.renderFrame;
  R.renderFrame = (w, h) => {
    if (!on || !W.renderer) return rf0(w, h);
    const info = W.renderer.info, ar = info.autoReset; info.autoReset = false; info.reset();
    try { rf0(w, h); } finally { calls = info.render.calls; tris = info.render.triangles; info.autoReset = ar; }
    const now = performance.now();
    if (lastF) { const f = now - lastF; if (f < 1000) { fr++; worst = Math.max(worst, f); } }
    lastF = now; if (!t0) t0 = now;
    if (now - t0 >= 1000) {
      const fps = fr * 1000 / (now - t0), ck = !!(W.scene && W.scene.userData.hq), r = W.renderer;
      ensureBox().textContent = Math.round(fps) + ' fps｜每格 ' + (fps ? (1000 / fps).toFixed(1) : '—') + ' ms（最慢 ' + Math.round(worst) + '）｜畫 ' + calls + ' 次｜' + Math.round(tris / 1000) + 'k 三角形｜畫質 ' + QN[CK.quality()] + (ck ? '・解析度 ' + Math.round(r.getPixelRatio() * 100) + '%' : '') + (gpuName() ? '｜' + gpuName() : '');
      fr = 0; worst = 0; t0 = now;
    }
  };
  addEventListener('keydown', e => { if (e.code === 'F3' && !e.repeat) { e.preventDefault(); show(!on); } });
  // 暫停選單的開關：遺跡、東鶴街道（R.pauseSheet）、精緻城市（有 #ck-q 的那一張）
  const addBtn = () => {
    const row = document.getElementById('r-sheet') && document.getElementById('r-sheet').querySelector('.row'); if (!row || row.querySelector('#fps-tg')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'fps-tg'; b.textContent = on ? '隱藏幀數' : '顯示幀數（F3）';
    b.title = '畫面上方顯示每秒幾格、繪製次數、顯示卡——覺得卡的時候可以把這一行抄給作者';
    b.onclick = () => { show(!on); b.textContent = on ? '隱藏幀數' : '顯示幀數（F3）'; };
    row.appendChild(b);
  };
  const ps = R.pauseSheet; if (ps) R.pauseSheet = (...a) => { const r = ps(...a); try { addBtn(); } catch (e) { } return r; };
  const sh0 = R.sheet; if (sh0) R.sheet = (...a) => { const r = sh0(...a); try { if (document.getElementById('ck-q')) addBtn(); } catch (e) { } return r; };
  if (on) setTimeout(() => show(true), 0);
})(window.R);
