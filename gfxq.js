// 畫質也管遺跡和東鶴的街道（2026-10-10 作者：替電腦比較差的玩家優化整個遊戲）
// - 跟精緻城市共用同一個畫質（CK.quality：0 低、1 中、2 高；記在瀏覽器）。精緻城市的暫停選單本來就有「畫質」；
//   遺跡、東鶴街道的暫停選單多一顆「畫質：高／中／低」。
// - 低：不畫陰影、火把和路燈的光只留最近的 2 盞（玩家自己的火把照舊）；中：4 盞；高：照舊（遺跡 6 盞、街道 8 盞）。
//   光的數量在一層（一條街）裡固定——數量一變，所有材質都要重新編譯、會頓一下，所以只在換層、改畫質的時候換。
//   光池的燈：run.js 的 W.pool、daytime.js 的路燈（userData.pool）。
// - 自動調整：進遺跡的每一層、進街道以後等 1.5 秒，量 3 秒的平均每格時間，超過 26 毫秒（不到 38 fps）就降一級，
//   跟 ckperf.js 一樣：自己在選單改過畫質的就不自動調。
// 放在 ckperf.js 後面。
(function (R) {
  const CK = R.CK, W = R.W; if (!CK || !CK.quality) return;
  const QN = ['低', '中', '高'];
  const LS = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const pix = () => !!(W.scene && W.scene.userData.pix);
  const poolOf = () => { const out = []; if (W.run && W.pool) return W.pool.slice(); if (W.scene) W.scene.traverse(o => { if (o.isPointLight && o.userData.pool) out.push(o); }); return out; };
  const apply = () => {
    if (!pix()) return;
    const q = CK.quality(), pool = poolOf(), n = q >= 2 ? pool.length : q === 1 ? Math.min(pool.length, 4) : Math.min(pool.length, 2);
    pool.forEach((p, i) => { p.visible = i < n; });
    if (W.moon && W.moon.isDirectionalLight) W.moon.castShadow = q > 0;
  };
  R.gfxApply = apply;
  // 換層、進街道
  const lf0 = R.loadFloor;
  if (lf0) R.loadFloor = (...a) => { const r = lf0(...a); try { apply(); arm(); } catch (e) { console.warn('[gfxq]', e); } return r; };
  // 改畫質（暫停選單、自動調整）
  const sq0 = CK.setQuality;
  CK.setQuality = q => { sq0(q); try { apply(); } catch (e) { } };
  // ---------- 自動調整 ----------
  let key = null, last = 0, warm = 0, acc = 0, n = 0, done = true, auto = false, again = 0;
  const arm = () => { key = null; done = false; last = 0; };
  const tick = () => {
    if (!pix() || W.paused || document.hidden) { last = 0; return; }
    const k = W.run ? W.F : W.town; if (key !== k) { key = k; warm = 0; acc = 0; n = 0; done = false; last = 0; apply(); }
    const now = performance.now();
    if (now > again) { again = now + 1000; apply(); }   // 街道的路燈是進城以後才點的：每秒補套一次（數量沒變就不會重新編譯）
    if (done) { last = 0; return; }
    if (last) { const f = now - last; if (f < 250) { warm += f; if (warm > 1500) { acc += f; n++; if (acc > 3000) check(acc / n); } } }
    last = now;
  };
  const check = avg => {
    acc = 0; n = 0; warm = 0; done = true;
    if (LS('tfl-cityq-user')) return;
    const q = CK.quality();
    if (avg > 26 && q > 0) { auto = true; try { CK.setQuality(q - 1); } finally { auto = false; } done = false; R.toast && R.toast('畫面有點卡：畫質自動調成「' + QN[q - 1] + '」（暫停選單可以改）', '#E8C04A'); }
  };
  const st0 = R.step;
  R.step = dt => { const r = st0(dt); try { tick(); } catch (e) { } return r; };
  const ts0 = R.townStep;
  R.townStep = dt => { const r = ts0(dt); try { if (W.town && !W.town.ck) tick(); } catch (e) { } return r; };
  // ckperf.js 用 auto 分辨「自己改的」：這裡自動降的不要記成自己改的
  const sq1 = CK.setQuality;
  CK.setQuality = q => { if (!auto) return sq1(q); let had = null; try { had = localStorage.getItem('tfl-cityq-user'); } catch (e) { } sq1(q); try { if (!had) localStorage.removeItem('tfl-cityq-user'); } catch (e) { } };
  // ---------- 暫停選單的「畫質」 ----------
  const addBtn = () => {
    const row = document.getElementById('r-sheet') && document.getElementById('r-sheet').querySelector('.row'); if (!row || row.querySelector('#gfx-q')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'gfx-q'; b.textContent = '畫質：' + QN[CK.quality()];
    b.title = '高：陰影、火把的光全開；中：光少一點；低：沒有陰影、只亮最近的兩盞光（電腦比較慢的時候用）';
    b.onclick = () => { CK.setQuality((CK.quality() + 2) % 3); b.textContent = '畫質：' + QN[CK.quality()]; };
    row.appendChild(b);
  };
  const ps = R.pauseSheet; if (ps) R.pauseSheet = (...a) => { const r = ps(...a); try { addBtn(); } catch (e) { } return r; };
})(window.R);
