// 存檔轉移：存檔存在「這個網址」的瀏覽器裡（localStorage），換網址就看不到。
// 標題畫面的存檔格下面：「匯出」把存檔變成一串代碼（可以複製），到新網址「匯入」貼上，就能帶著舊存檔繼續玩。
// 代碼：T1433Z-（gzip 壓縮後的 base64）或 T1433J-（沒壓縮的 base64）；也接受直接貼上存檔的 JSON。
(function (R) {
  const $ = id => document.getElementById(id), esc = s => R.esc(s);
  const KEY = i => 'ruins1433-slot' + i;
  const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => { const bin = atob(s.replace(/\s+/g, '')), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
  const pipe = async (bytes, Stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('gzip'))).arrayBuffer());
  const encode = async json => { const raw = new TextEncoder().encode(json); try { if (window.CompressionStream) return 'T1433Z-' + b64(await pipe(raw, CompressionStream)); } catch (e) { } return 'T1433J-' + b64(raw); };
  const decode = async code => {
    code = (code || '').trim();
    if (code.startsWith('{')) return JSON.parse(code);
    if (code.startsWith('T1433Z-')) { if (!window.DecompressionStream) throw new Error('這個瀏覽器太舊，打不開壓縮的代碼'); return JSON.parse(new TextDecoder().decode(await pipe(unb64(code.slice(7)), DecompressionStream))); }
    if (code.startsWith('T1433J-')) return JSON.parse(new TextDecoder().decode(unb64(code.slice(7))));
    throw new Error('這不是《討伐令 1433》的存檔代碼');
  };
  const valid = s => s && typeof s === 'object' && s.classes && s.equip && Array.isArray(s.stash) && R.CLASSES[s.cls] && (s.v === 1 || s.v === 2);

  // ---------- 彈出視窗（標題畫面沒有遊戲裡的視窗） ----------
  let modal = null;
  const open = html => {
    if (!modal) { modal = document.createElement('div'); modal.className = 'modal'; modal.id = 'sc-modal'; modal.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"></div>'; document.body.appendChild(modal); modal.onclick = e => { if (e.target === modal) close(); }; }
    modal.firstChild.innerHTML = html; modal.hidden = false; return modal.firstChild;
  };
  const close = () => { if (modal) modal.hidden = true; };

  const exportSlot = async i => {
    const raw = localStorage.getItem(KEY(i)); if (!raw) return;
    const code = await encode(raw), inf = R.slotInfo(i);
    const box = open('<h2>匯出存檔 ' + i + '</h2><p class="note">' + esc(inf ? inf.name + '・' + inf.race + '・' + inf.cls + ' Lv ' + inf.lv : '') + '</p><p class="note">把下面整串代碼複製起來（可以貼在記事本、傳給自己），到新網址的標題畫面按「匯入存檔」貼上。代碼裡只有遊戲的存檔。</p>'
      + '<textarea id="sc-code" class="sc-code" readonly>' + esc(code) + '</textarea><p class="note" id="sc-msg"></p><div class="row"><button type="button" class="btn pri" id="sc-copy">複製代碼</button><button type="button" class="btn" id="sc-x">關閉</button></div>');
    const ta = $('sc-code'); ta.focus(); ta.select();
    $('sc-copy').onclick = async () => {
      let ok = false; try { await navigator.clipboard.writeText(code); ok = true; } catch (e) { ta.select(); try { ok = document.execCommand('copy'); } catch (e2) { } }
      $('sc-msg').textContent = ok ? '複製好了。' : '這個瀏覽器不讓網頁直接複製：請長按（或 Ctrl＋A、Ctrl＋C）把框裡的代碼全選複製。';
    };
    $('sc-x').onclick = close;
  };
  let armed = 0;
  const importBox = msg => {
    armed = 0;
    open('<h2>匯入存檔</h2><p class="note">把在舊網址「匯出」的代碼貼進來（或選存成檔案的代碼），再選要放進哪一格。</p>'
      + '<textarea id="sc-in" class="sc-code" placeholder="T1433Z-……"></textarea><label class="field">或是選檔案<input type="file" id="sc-file" accept=".txt,.json,text/plain,application/json"></label>'
      + '<p class="note" id="sc-msg">' + esc(msg || '') + '</p><div class="row">' + [1, 2, 3].map(i => { const inf = R.slotInfo(i); return '<button type="button" class="btn' + (inf ? '' : ' pri') + '" data-imp="' + i + '">放進存檔 ' + i + (inf ? '（會蓋掉「' + esc(inf.name) + '」）' : '（空的）') + '</button>'; }).join('') + '<button type="button" class="btn" id="sc-x">關閉</button></div>');
    $('sc-file').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { $('sc-in').value = t.trim(); $('sc-msg').textContent = '讀好檔案了，選一格放進去。'; }); };
    document.querySelectorAll('#sc-modal [data-imp]').forEach(b => { b.onclick = async () => {
      const i = +b.dataset.imp, msgEl = $('sc-msg');
      let s; try { s = await decode($('sc-in').value); } catch (e) { msgEl.textContent = '讀不出來：' + (e.message || e); return; }
      if (!valid(s)) { msgEl.textContent = '讀不出來：這不是完整的存檔。'; return; }
      if (R.slotInfo(i) && armed !== i) { armed = i; msgEl.textContent = '存檔 ' + i + ' 已經有人了。再按一次「放進存檔 ' + i + '」就會蓋掉。'; return; }
      if (R.migrate) s = R.migrate(s);
      try { localStorage.setItem(KEY(i), JSON.stringify(s)); } catch (e) { msgEl.textContent = '存不進去：' + (e.message || e); return; }
      if (R.slot === i) R.S = null; if (R.goTitle) R.goTitle();
      open('<h2>匯入好了</h2><p>存檔 ' + i + '：' + esc(s.name || '勇者') + '。關掉這個視窗，按存檔 ' + i + ' 的「讀取」就能繼續玩。</p><div class="row"><button type="button" class="btn pri" id="sc-x">關閉</button></div>'); $('sc-x').onclick = close;
    }; });
    $('sc-x').onclick = close;
  };

  // ---------- 標題畫面：存檔格下面的一排按鈕 ----------
  const bar = () => {
    const host = $('t-slots'); if (!host) return;
    let el = $('t-transfer'); if (!el) { el = document.createElement('div'); el.id = 't-transfer'; el.className = 't-transfer'; host.after(el); }
    el.innerHTML = '<b>存檔轉移</b><small>換了網址（新版的連結）看不到舊存檔時：在舊網址「匯出」，到新網址「匯入」。</small><div class="row">'
      + [1, 2, 3].filter(i => R.slotInfo(i)).map(i => '<button type="button" class="mini" data-exp="' + i + '">匯出存檔 ' + i + '</button>').join('') + '<button type="button" class="mini gold" id="t-import">匯入存檔</button></div>';
    el.querySelectorAll('[data-exp]').forEach(b => { b.onclick = () => exportSlot(+b.dataset.exp); });
    $('t-import').onclick = () => importBox();
  };
  // 存檔格每次重畫（讀取、刪除、回到標題）就跟著重畫
  const watch = () => { const host = $('t-slots'); if (!host) return; new MutationObserver(bar).observe(host, { childList: true }); bar(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  R.saveCode = { encode, decode, exportSlot, importBox };
})(window.R);
