// 會反傷的遺跡生物（作者 2026-10-05：我要怪物有反傷的機制，並且圖鑑會寫他們的由來和習性）
// 三種，圖鑑的說明寫【由來】【習性】【怎麼打】：
// - 棘殼甲（摩爾斯級以上）：被打就把殼闔上 2.5 秒（倒刺發亮、不動、受到的傷害 −50%），闔著的時候打牠，35% 的傷害彈回來；之後殼打開 3 秒。
// - 鏡鱗蛇（摩爾斯級以上）：鱗片像鏡子，從 3 公尺外打牠（子彈、法術、遠距離的招）25% 彈回來；貼身打不會。會保持距離吐毒液。
// - 荊棘母株（克森特級以上的精英）：不會動，每 4 秒往四面射一圈倒刺；打牠 20% 彈回來；6 公尺內的同伴被打也會彈回 10%。
// 彈回來的傷害照你打出去的算，但最多是那隻遺跡生物自己一下的 1.2 倍（後期你一下幾萬，不會被自己的傷害秒掉）；同一隻 0.3 秒最多彈一次。
// 彈回來照樣扣你的防禦、減傷。
// 新的生物不在任何地區的名單上，所以這個分級的遺跡都會出現（region.js 的「沒有地區的生物」）。
// 放在 monsters8.js、region.js、vampproc.js 後面。
(function (R) {
  const W = () => R.W, rnd = Math.random;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

  Object.assign(R.ENEMIES, {
    tb_shell: { name: '棘殼甲', hp: 120, dmg: 14, speed: 2.2, xp: 26, size: 1, armor: 0.3, ai: 'tbshell', color: '#6A5A3A', eye: '#FFB84A',
      desc: '【由來】佩特拉核心把落進遺跡的鐵礦屑和魔力質一起揉進甲殼，長出一身倒鉤。公會的紀錄說，牠們多半出現在常被硬闖、打壞東西的遺跡——像是遺跡拿來懲罰破壞者的東西。【習性】平常貼著牆慢慢爬，看起來像一塊長刺的石頭。一被打就把殼闔起來、倒刺發出橘光，這時候打下去的力道會順著倒刺彈回來（三成五）。殼闔上兩秒半就會打開，打開的三秒內最好打。【怎麼打】看到倒刺發亮就停手或換別隻打，等殼打開再一口氣打。' },
    tb_snake: { name: '鏡鱗蛇', hp: 90, dmg: 16, speed: 3.2, xp: 30, size: 1, ai: 'tbsnake', color: '#8AA8C8', eye: '#E8F8FF',
      desc: '【由來】遺跡深處被濃魔力一遍一遍沖刷的蛇類生物，鱗片磨得跟鏡子一樣亮。體內的魔力水晶長在鱗片底下，會把打在身上的魔力沿著鱗片折回去。【習性】喜歡盤在柱子、石堆旁邊，和人保持距離，抬頭吐毒液。從遠處打在牠身上的子彈、法術、遠距離的招式，有兩成五會被鱗片彈回出手的人身上；貼在身邊用刀、用拳頭打就彈不回來。【怎麼打】衝到身邊打，或讓近戰的隊友去處理。' },
    tb_mother: { name: '荊棘母株', hp: 380, dmg: 18, speed: 0, xp: 80, size: 1.5, armor: 0.15, elite: 1, ai: 'tbmother', color: '#3A5A2A', eye: '#E85A4A',
      desc: '【由來】佩特拉核心在受損嚴重的區域「種」下的東西，根扎進地板裡，把周圍受到的破壞記下來、原樣還回去。公會把它分在精英，遇到要回報。【習性】不會移動。每隔四秒把一圈倒刺往四面八方射出去。打它的傷害有兩成會被刺彈回來；六公尺內的遺跡生物被打時，母株也會替牠們彈回一成。【怎麼打】先把母株附近的小隻引開再打，或從倒刺的縫隙鑽進去集中打母株——母株倒了，附近的就不會再彈了。' }
  });

  // ---------- 點陣圖（朝右畫；kasoplus.js 那一套） ----------
  const grid = (w, h) => {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    const o = {
      p(x, y, c) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c; },
      rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) o.p(x + i, y + j, c); },
      line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) o.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
      ell(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.05) o.p(x, y, c); },
      disc(cx, cy, r, c) { o.ell(cx, cy, r, r, c); },
      rows: () => g.map(r => r.join(''))
    };
    return o;
  };
  const add = (id, pal, w, h, draw) => { if (!R.BEAST_ART) return; const [a, b] = [0, 1].map(fr => { const G = grid(w, h); draw(G, fr); return G.rows(); }); R.BEAST_ART[id] = { pal, a, b }; };
  add('tb_shell', { k: '#2A2218', s: '#6A5A3A', l: '#9A8A5A', t: '#FFB84A', e: '#FFE8A0' }, 20, 16, (G, fr) => {
    G.ell(10, 9, 8, 5, 's'); G.ell(10, 8, 6, 3, 'l');
    for (let x = 4; x <= 16; x += 3) G.line(x, 5, x - 1, 2, 't');
    G.disc(17, 9, 2, 'k'); G.p(18, 8, 'e');
    if (fr) { G.line(5, 13, 3, 15, 'k'); G.line(10, 13, 10, 15, 'k'); G.line(14, 13, 16, 15, 'k'); } else { G.line(5, 13, 6, 15, 'k'); G.line(10, 13, 9, 15, 'k'); G.line(14, 13, 13, 15, 'k'); }
  });
  add('tb_snake', { b: '#8AA8C8', w: '#E8F8FF', d: '#4A6A8A', e: '#1A2A3A', g: '#9AE07A' }, 20, 16, (G, fr) => {
    for (let i = 0; i < 12; i++) { const x = 2 + i, y = 12 + Math.round(Math.sin(i * 0.9 + (fr ? 1.4 : 0)) * 1.5); G.rect(x, y, 1, 2, i % 2 ? 'w' : 'b'); }
    G.line(14, 12, 15, 6, 'b'); G.line(15, 12, 16, 6, 'w'); G.ell(16, 5, 2.5, 1.8, 'd'); G.p(17, 4, 'e'); G.p(18, 6, 'g'); if (fr) G.p(19, 6, 'g');
  });
  add('tb_mother', { r: '#2A1A10', v: '#3A5A2A', l: '#6A8A3A', t: '#E8C8A0', e: '#E85A4A' }, 24, 22, (G, fr) => {
    G.line(6, 21, 9, 15, 'r'); G.line(18, 21, 15, 15, 'r'); G.line(12, 21, 12, 15, 'r');
    G.ell(12, 11, 8, 6, 'v'); G.ell(12, 10, 5.5, 4, 'l');
    for (let a = 0; a < 10; a++) { const t = a / 10 * Math.PI * 2, k = fr ? 10 : 9; G.line(12 + Math.cos(t) * 6, 11 + Math.sin(t) * 4.5, 12 + Math.cos(t) * k, 11 + Math.sin(t) * (k * 0.7), 't'); }
    G.disc(12, 10, 1.8, 'e');
  });

  // ---------- 行為（combat.js 的 R.AI_X） ----------
  const AI = R.AI_X = R.AI_X || {};
  const glow = (e, on) => { const sp = e.m && e.m.sp; if (sp && sp.mat && sp.mat.emissive) { sp.mat.emissive.set(on ? '#FF8A2A' : '#000000'); sp.mat.emissiveIntensity = on ? 0.55 : 0; } };
  AI.tbshell = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a;
    if (e.shut > 0) { e.shut -= dt; glow(e, true); if (e.shut <= 0) { e.open = 3; glow(e, false); } return false; }
    if (e.open > 0) e.open -= dt;
    if (d > e.def.size + 0.7) { if (walk) { H.move(e, a, sp, dt); return true; } }
    else if (e.cd <= 0) { e.cd = 1.1; H.hurtT(P, e.dmg, e); }
    return false;
  };
  AI.tbsnake = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; const side = e.side || (e.side = rnd() < 0.5 ? 1 : -1), want = d < 4.5 ? a + Math.PI : d > 8 ? a : a + Math.PI / 2 * side; let mv = false;
    if (walk) { H.move(e, want, sp * (d < 4.5 ? 1.15 : 0.8), dt); mv = true; }
    if (e.cd <= 0 && d < 11) { e.cd = 2 + rnd() * 0.8; R.fire({ kind: 'seed', owner: 'e', x: e.x, z: e.z, a, speed: 8, dmg: e.dmg, life: 1.8, src: e }); }
    return mv;
  };
  AI.tbmother = (e, P, d, a, sp, dt, walk, H) => {
    e.yaw = a; e.ring = (e.ring || 2) - dt;
    if (e.ring <= 0.6 && !e.warned) { e.warned = true; R.fx && R.fx('ring', e.x, 0.1, e.z, { r: 2.4, color: '#E8C8A0' }); }
    if (e.ring <= 0) { e.ring = 4; e.warned = false; const n = 12, o = rnd() * Math.PI; for (let i = 0; i < n; i++) R.fire({ kind: 'feather', owner: 'e', x: e.x, z: e.z, a: o + i / n * Math.PI * 2, speed: 7, dmg: e.dmg, life: 2, src: e }); }
    if (d < e.def.size + 0.9 && e.cd <= 0) { e.cd = 1.4; H.hurtT(P, e.dmg * 0.8, e); }
    return false;
  };

  // ---------- 反傷 ----------
  const mothers = () => (W().enemies || []).filter(o => !o.dead && o.id === 'tb_mother');
  const fracOf = (e, P) => {
    let f = 0;
    if (e.id === 'tb_shell' && e.shut > 0) f = 0.35;
    else if (e.id === 'tb_snake' && dist(e, P) > 3) f = 0.25;
    else if (e.id === 'tb_mother') f = 0.2;
    if (e.id !== 'tb_mother' && mothers().some(m => dist(m, e) < 6)) f = Math.max(f, 0.1);
    return f;
  };
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    // 棘殼甲：闔著的時候受到的傷害 −50%；被打就闔上（打開的那三秒不會）
    if (e && !e.dead && e.id === 'tb_shell' && !(e.shut > 0) && !(e.open > 0) && !e.mirror) { e.shut = 2.5; e.shutNew = true; R.num && R.num(e.x, 2.2, e.z, '闔殼', 'hurt'); }   // 闔上的那一下不彈
    if (e && e.id === 'tb_shell' && e.shut > 0) raw *= 0.5;
    const h0 = e && !e.dead ? e.hp : 0, r = he0(e, raw, o);
    try {
      const P = W().P, run = W().run;
      if (P && !P.dead && run && !run.done && e && h0 > 0 && !(o && o.reflect)) {
        const took = h0 - Math.max(0, e.hp), f = took > 0 && !e.shutNew ? fracOf(e, P) : 0, t = run.t || 0; e.shutNew = false;
        if (f > 0 && !((e.tbT || 0) > t)) {
          e.tbT = t + 0.3;
          const v = Math.min(took * f, Math.max(1, e.dmg || 1) * 1.2);
          R.fx && R.fx('spark', P.x, 1.2, P.z, { a: angTo(P, e), crit: false });
          R.hurtPlayer(v, e, { reflect: true });
        }
      }
    } catch (err) { console.warn('[thornbeasts]', err); }
    return r;
  };

  // ---------- 放進分級 ----------
  const addPool = (gid, ids) => { const g = R.gradeById && R.gradeById(gid); if (g && g.pool) ids.forEach(i => { if (!g.pool.includes(i)) g.pool.push(i); }); };
  ['mors', 'kesent', 'kaso'].forEach(g => addPool(g, ['tb_shell', 'tb_snake']));
  ['kesent', 'kaso'].forEach(g => addPool(g, ['tb_mother']));
})(window.R);
