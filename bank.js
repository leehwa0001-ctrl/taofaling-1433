// 銀行存款（作者 2026-10-04：新增可以在銀行存錢）
// - 世界中央銀行・東鶴分行的營業大廳，左邊的窗口是「存款窗口」：存、領，每天照餘額給 0.2% 的利息（複利，一天算一次）。
// - 存在銀行的錢，扒手扒不走、罰金也不會從這裡扣（只動錢包裡的 R.S.gold）。
// - 存檔：R.S.bank = { bal, last（上次算利息的那天）, earned（累計利息） }。
(function (R) {
  const S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const RATE = 0.002;
  const acct = () => { const s = S(); s.bank = s.bank || { bal: 0, last: s.day || 0, earned: 0 }; return s.bank; };
  const fmt = n => Math.floor(n).toLocaleString('zh-TW');
  // 利息：每過一天算一次
  const accrue = () => { const s = S(); if (!s) return 0; const b = acct(); let got = 0; while (b.last < (s.day || 0)) { const i = Math.floor(b.bal * RATE); b.bal += i; b.earned += i; got += i; b.last++; } return got; };
  R.bankAccrue = accrue;
  const nd0 = R.onNewDay;
  R.onNewDay = () => { nd0(); try { const g = accrue(); if (g > 0) R.save(); } catch (e) { console.warn('[bank]', e); } };
  R.bankSheet = () => {
    const s = S(); accrue(); const b = acct();
    R.sheet('<p class="kicker">世界中央銀行・東鶴分行</p><h2>存款窗口</h2><p>櫃員把存款單遞過來。「要存多少？利息每天算一次，日利率 0.2%。」存進銀行的錢不會被扒走。</p>'
      + '<div class="bk-box"><div><small>錢包</small><b>' + fmt(s.gold) + ' 費拉</b></div><div><small>存款</small><b>' + fmt(b.bal) + ' 費拉</b></div><div><small>累計利息</small><b>' + fmt(b.earned) + ' 費拉</b></div><div><small>明天的利息</small><b>約 ' + fmt(b.bal * RATE) + ' 費拉</b></div></div>'
      + '<div class="row bk-row"><input id="bk-amt" type="number" min="1" step="100" placeholder="金額" inputmode="numeric"><button type="button" class="btn pri" data-bk="in">存</button><button type="button" class="btn" data-bk="out">領</button></div>'
      + '<div class="row bk-row"><button type="button" class="btn" data-bq="in:1000">存 1,000</button><button type="button" class="btn" data-bq="in:10000">存 10,000</button><button type="button" class="btn" data-bq="in:all">全部存</button><button type="button" class="btn" data-bq="out:1000">領 1,000</button><button type="button" class="btn" data-bq="out:all">全部領</button></div>',
      '<div class="row"><button type="button" class="btn" id="bk-x">好了</button></div>');
    const move = (dir, v) => {
      const amt = v === 'all' ? (dir === 'in' ? s.gold : b.bal) : Math.floor(+v || 0); if (amt <= 0) { R.toast('請輸入金額。'); return; }
      if (dir === 'in') { if (amt > s.gold) { R.toast('錢包裡沒有那麼多。'); return; } s.gold -= amt; b.bal += amt; R.toast('存了 ' + fmt(amt) + ' 費拉。', '#E8C04A'); }
      else { if (amt > b.bal) { R.toast('存款沒有那麼多。'); return; } b.bal -= amt; s.gold += amt; R.toast('領了 ' + fmt(amt) + ' 費拉。', '#E8C04A'); }
      R.sfx && R.sfx('coin'); R.save(); R.bankSheet();
    };
    document.querySelectorAll('[data-bk]').forEach(el => { el.onclick = () => move(el.dataset.bk, $('bk-amt').value); });
    document.querySelectorAll('[data-bq]').forEach(el => { el.onclick = () => { const [d, v] = el.dataset.bq.split(':'); move(d, v); }; });
    $('bk-x').onclick = R.closeSheet;
  };
  // 營業大廳：左邊的窗口
  const FN = R.INTERIOR_FURNISH;
  if (FN && FN.bank) { const f0 = FN.bank; FN.bank = c => { const r = f0(c); try { c.inter(-5.25, -c.HD + 4.4, 1.8, '存款窗口（存錢、領錢）', R.bankSheet); } catch (e) { console.warn('[bank]', e); } return r; }; }
  const css = document.createElement('style');
  css.textContent = '.bk-box{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:8px 0}.bk-box>div{background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:8px 10px}.bk-box small{display:block;opacity:.75}.bk-box b{font-size:1.15em;color:var(--gold,#C9A13A)}.bk-row{flex-wrap:wrap;gap:6px}.bk-row input{flex:1;min-width:8em;padding:6px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg2);color:inherit;font:inherit}';
  document.head.appendChild(css);
})(window.R);
