// 快速移動（2026-10-04 回饋：遺跡出來直接站在遺跡門口、城很大、走路慢，想接任務要從頭走一遍）
// - 公會的接駁馬車（免費）：城裡按 T、或選單的「快速移動」——公會、鐵匠鋪、白藤堂、倉庫、赤提燈、東鶴站、驛站、銀行、醫院、自己的家，
//   還有城邊的遺跡入口。開車的時候、被通緝的時候不載。
// - 從遺跡回來：結算畫面多一個「搭接駁馬車回公會」。
// 放在 town.js、gtamap.js、vehicles.js、home.js 後面。
(function (R) {
  const W = R.W, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const SPOTS = [['公會東鶴分館', /^走進公會東鶴分館/], ['老岩的鐵匠鋪', /^走進老岩的鐵匠鋪/], ['白藤堂（藥鋪）', /^走進白藤堂/], ['倉庫', /^走進倉庫/], ['赤提燈（居酒屋・宿屋）', /^走進赤提燈/],
    ['東鶴站（往奉主）', /^走進東鶴站/], ['驛站（往全國的遺跡）', /^走進驛站/], ['世界中央銀行', /^走進世界中央銀行/], ['東鶴醫院', /^走進東鶴醫院/], ['自己的家（公團住宅）', /^回家|^公團住宅/]];
  const lbl = it => (typeof it.label === 'string' ? it.label : (() => { try { return it.label; } catch (e) { return ''; } })()) || '';
  const spots = () => {
    const tw = W.town; if (!tw) return [];
    const out = SPOTS.map(([n, re]) => { const it = tw.inter.find(v => re.test(lbl(v))); return it ? { n, x: it.x, z: it.z } : null; }).filter(Boolean);
    Object.entries(tw.gates || {}).forEach(([id, p]) => { const s = R.SITES.find(v => v.id === id); if (s) out.push({ n: '遺跡入口：' + s.name, x: p[0], z: p[1], gate: 1 }); });
    return out;
  };
  const go = sp => {
    const P = W.P; if (!P || !W.town) return;
    R.closeSheet && R.closeSheet();
    // 在建築物裡面（新手指引的「前往」會直接叫這裡）：先走出門，回到城裡的場景再搭車——不然會被傳到建築物場景外面的一片黑暗裡
    if (W.inside) { if (R.exitInterior) R.exitInterior(); let n = 0; const t = setInterval(() => { if (!W.inside) { clearInterval(t); go(sp); } else if (++n > 40) clearInterval(t); }, 100); return; }
    R.fade(() => {
      P.x = sp.x; P.z = sp.z + 1.6; if (R.collide) R.collide(P, 0.42); if (P.h) P.h.g.position.set(P.x, 0, P.z);
      (W.town.allies || []).forEach((a, i) => { a.x = P.x + (i ? 1.5 : -1.5); a.z = P.z + 1.5; });
      R.placeCam && R.placeCam(null); R.townHud && R.townHud(true);
      R.banner && R.banner(sp.n, '搭公會的接駁馬車過來了');
    });
  };
  R.ftSpots = spots; R.ftGo = go;   // guide.js（新手指引的「前往」）用
  R.fastTravel = () => {
    if (!W.town || W.run) return;
    if (W.town.hosu) { R.toast('奉主沒有公會的接駁馬車。回東鶴要到奉主站搭電車。'); return; }
    if (W.inside) { if (R.exitInterior) R.exitInterior(); let n = 0; const t = setInterval(() => { if (!W.inside) { clearInterval(t); R.fastTravel(); } else if (++n > 40) clearInterval(t); }, 100); return; }   // 在建築物裡：先走出門再叫車（也救得了之前被傳進黑暗裡的人）
    if (R.VEH && R.VEH.cur) { R.toast('先下車。'); return; }
    if (R.crime && R.crime.heat > 0) { R.toast('被通緝的時候，接駁馬車不載你。', '#FF9A6A'); return; }
    const list = spots();
    R.sheet('<p class="kicker">公會的接駁馬車</p><h2>快速移動</h2><p class="note">免費。登記過的勇者都能搭。（在城裡按 T 也能叫車）</p><div class="ft-grid">'
      + list.map((s, i) => '<button type="button" class="btn' + (s.gate ? '' : ' pri') + '" data-ft="' + i + '">' + esc(s.n) + '</button>').join('') + '</div>',
      '<div class="row"><button type="button" class="btn" id="ft-x">不搭了</button></div>');
    $('ft-x').onclick = R.closeSheet;
    document.querySelectorAll('[data-ft]').forEach(b => { b.onclick = () => go(list[+b.dataset.ft]); });
  };
  // T 鍵
  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 't' || e.repeat || !W.town || W.run || !$('run') || $('run').hidden || (R.sheetOpen && R.sheetOpen()) || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
    R.fastTravel();
  });
  // 城裡的選單：多一顆「快速移動」
  const tm = R.townMenu;
  if (tm) R.townMenu = (...a) => { const r = tm(...a), row = $('r-sheet') && $('r-sheet').querySelector('.row'); if (row && !row.querySelector('#ft-open') && W.town && !W.town.hosu) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'ft-open'; b.textContent = '快速移動（T）'; b.onclick = () => { R.closeSheet(); setTimeout(R.fastTravel, 50); }; row.insertBefore(b, row.children[1] || null); } return r; };
  // 遺跡回來：直接回公會
  let toGuild = false;
  const rs0 = R.results;
  R.results = (...a) => {
    const r = rs0(...a), row = $('r-sheet') && $('r-sheet').querySelector('.row'), ok = $('rs-ok');
    if (row && ok && !row.querySelector('#rs-guild')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'rs-guild'; b.textContent = '搭接駁馬車回公會'; b.onclick = () => { toGuild = true; ok.click(); }; row.appendChild(b); }
    return r;
  };
  const en0 = R.enterTownNow;
  R.enterTownNow = (...a) => {
    const r = en0(...a);
    if (toGuild) { toGuild = false; const g = spots().find(s => /^公會/.test(s.n)), P = W.P; if (g && P && W.town && !W.town.hosu) { P.x = g.x; P.z = g.z + 1.6; if (R.collide) R.collide(P, 0.42); if (P.h) P.h.g.position.set(P.x, 0, P.z); (W.town.allies || []).forEach((al, i) => { al.x = P.x + (i ? 1.5 : -1.5); al.z = P.z + 1.5; if (al.h) al.h.g.position.set(al.x, 0, al.z); }); R.placeCam && R.placeCam(null); setTimeout(() => R.banner && R.banner('公會東鶴分館', '搭接駁馬車回來了'), 400); } }
    return r;
  };
  const css = document.createElement('style');
  css.textContent = '.ft-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px}';
  document.head.appendChild(css);
})(window.R);
