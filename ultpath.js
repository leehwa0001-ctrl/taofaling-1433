// 轉職後的大招（2026-10-08 作者：每個職業轉職後的大招要有個別的差距——狂戰士把敵人往自己吸、劍鬥士在原本的大招上多一道 360 度斬擊、
//   鬼武者又不一樣；玩家可以選要用原本職業的大招，還是轉職後的大招）
// - 每一條轉職路線一招「路線大招」：原本的大招照放，再加上這條路線的特殊效果（名字、畫面上的大字也換成路線的）。
// - 選哪一個存在 R.S.ultPick[職業]（'base'＝原版、其他＝路線版）；轉職後沒選過就用路線版。
// - 技能書最上面多一張「大招」卡片，卡片最下面選（skillbook.js 的 R.SB_HEAD、R.SB_FOOT）。
// - 舊路線（內修者戰士、式神使術士、外修者武術家）借用同名路線的效果。
// 放在 ult.js、monk.js、classes2b.js、ultbal.js 後面。
(function (R) {
  const U = R.ULTS; if (!U) return;
  const W = () => R.W, S = () => R.S, rnd = Math.random, esc = s => R.esc(s), CT = () => performance.now() / 1000;
  const later = (f, ms) => { const run = W().run; setTimeout(() => { const w = W(); if (w.run === run && w.P && !w.P.dead && run && !run.done) f(w.P); }, ms); };
  const alive = e => e && !e.dead && !e.under && !e.dormant && !e.fake;
  const near = (x, z, r) => (W().enemies || []).filter(e => alive(e) && Math.hypot(e.x - x, e.z - z) < r + ((e.def && e.def.size) || 1) * 0.5);
  const fl = (x, z) => (R.nearestFloor ? R.nearestFloor(x, z) : [x, z]);
  const aim = (P, max) => { let x = P.aimX != null ? P.aimX : P.x + Math.sin(P.aimA || 0) * 6, z = P.aimZ != null ? P.aimZ : P.z + Math.cos(P.aimA || 0) * 6; const d = Math.hypot(x - P.x, z - P.z); if (d > max) { x = P.x + (x - P.x) / d * max; z = P.z + (z - P.z) / d * max; } return fl(x, z); };
  const T = () => R.SKILL_TYPES || {};
  const buff = (P, id, o) => { if (T().buff) T().buff(Object.assign({ _id: 'ultp:' + id, t: 6 }, o), P); };
  const shake = v => R.shake && R.shake(v);
  const st = (e, k, v) => { if (e.st) e.st[k] = Math.max(e.st[k] || 0, v); };
  // 持續效果（每一幀）：回傳 false 結束
  const dyn = f => { const w = W(), run = w.run; if (w.dyn) w.dyn.push(dt => (W().run === run && !run.done ? f(dt) : false)); };
  // 把敵人往某一點吸（領主體、核心不動）
  const pull = (getXZ, r, t, sp) => { let left = t; dyn(dt => { left -= dt; const [x, z] = getXZ(); (W().enemies || []).forEach(e => { if (!alive(e) || (e.def && (e.def.boss || e.def.lordPlus)) || e.id === 'petra') return; const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz); if (d > r || d < 1.2) return; e.x += dx / d * Math.min(d - 1.1, sp * dt); e.z += dz / d * Math.min(d - 1.1, sp * dt); }); return left > 0; }); };
  // 一圈 360 度斬擊
  // 2026-10-08 作者：360 度斬擊不像斬擊——原本是一圈 0.08 秒就閃完的月牙＋一圈光點。改成：角色轉一圈，四道刀光接著繞一圈掃過去，最後留一道整圈的刀痕
  const spin = (P, r, dmg, o, c) => {
    const a0 = P.aimA || 0, dir = rnd() < 0.5 ? 1 : -1, x = P.x, z = P.z;
    for (let k = 0; k < 4; k++) later(P => { R.fx('swing', P.x, 0, P.z, { a: a0 + dir * k * Math.PI / 2, arc: 2.1, range: r, big: true, dir: -dir, color: c }); if (k % 2 === 0) R.sfx && R.sfx('swing'); }, k * 45);
    later(P => R.fx('swing', P.x, 0, P.z, { a: a0 + dir * Math.PI, arc: 6.28, range: r + 0.3, color: '#FFFFFF' }), 170);
    let t = 0; const g = P.h && P.h.g, y0 = g ? g.rotation.y : 0; if (g) dyn(dt => { t += dt; const k = Math.min(1, t / 0.2); g.rotation.y = y0 + dir * k * Math.PI * 2; return k < 1; });
    R.aoe(x, z, r, dmg, Object.assign({ primary: false }, o)); if (R.swingAnim && P.h) R.swingAnim(P.h, 0.02, 0.2);
  };
  // 一條直線
  const line = (P, len, width, dmg, o, c) => { const a = P.aimA || 0, sx = P.x, sz = P.z, ca = Math.sin(a), sa = Math.cos(a); R.fx('slash', sx, 1, sz, { a, len }); R.fx('line', sx, 1, sz, { a, len, color: c }); near(sx, sz, len + 2).forEach(e => { const dx = e.x - sx, dz = e.z - sz, along = dx * ca + dz * sa, side = Math.abs(dx * sa - dz * ca), rad = ((e.def && e.def.size) || 1) * 0.5; if (along < -0.3 || along > len + rad || side > width + rad) return; R.hurtEnemy(e, dmg, Object.assign({ primary: false }, o)); if (o && o.brk && R.elemBreak) R.elemBreak(e); }); };
  // 一段時間內的區域：每 gap 秒打一次
  const field = (x, z, r, t, gap, f, c) => { let left = t, tick = 0; dyn(dt => { left -= dt; tick -= dt; if (tick <= 0) { tick = gap; R.fx('ring', x, 0.1, z, { r, color: c }); f(x, z); } return left > 0; }); };
  // 這一招打中的一般攻擊（普攻）多做一件事，持續 t 秒
  const onHits = [];
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => { const h0 = e && e.hp, r = he0(e, raw, o); if (onHits.length && e && h0 > e.hp && o && o.primary) { const now = CT(), P = W().P; for (let i = onHits.length - 1; i >= 0; i--) { const h = onHits[i]; if (h.until < now) onHits.splice(i, 1); else try { h.f(e, raw, P); } catch (er) { } } } return r; };
  const whileHit = (t, f) => onHits.push({ until: CT() + t, f });
  // 妖刀：閃斬期間打倒的回生命
  const ke0 = R.killEnemy;
  if (ke0) R.killEnemy = (e, by) => { const was = e && !e.dead, r = ke0(e, by), P = W().P; if (was && e && !e.fake && P && P._yotoT > CT()) R.healP(P.hpMax * 0.04); return r; };

  // ---------- 每一條路線 ----------
  // go(P, b)：b＝大招的傷害基準（R.ultBase，一下普攻×職業係數）；原本的大招已經放出去了
  const PATH = {
    gunner: {
      sniper: { name: '穿心風暴', d: '掃射結束時朝準心補一發貫穿一切的狙擊彈（傷害 ×8、必定暴擊）。', go: (P, b) => later(P => { line(P, 30, 0.7, b * 8, { crit: true }, '#E8F4FF'); shake(0.5); R.sfx && R.sfx('gun'); }, 3150) },
      magigun: { name: '元素風暴', d: '掃射時前方的敵人輪流被點燃、冰住減速、電到麻痺。', go: P => { for (let i = 0; i < 6; i++) later(P => { const a = P.aimA || 0; near(P.x, P.z, 14).forEach(e => { let d = Math.atan2(e.x - P.x, e.z - P.z) - a; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) > 0.65) return; if (i % 3 === 0) st(e, 'burn', 3); else if (i % 3 === 1) st(e, 'slow', 2); else st(e, 'stun', 0.4); }); R.fx('ring', P.x, 0.1, P.z, { r: 2, color: ['#FF7A3A', '#8AD8FF', '#FFE85A'][i % 3] }); }, 200 + i * 500); } },
      bomber: { name: '焦土風暴', d: '掃射結束時，準心方向一路連炸五次（每次傷害 ×2.5）；爆炸會讓佩特拉注意到。', go: (P, b) => later(P => { const a = P.aimA || 0, x0 = P.x, z0 = P.z; for (let i = 1; i <= 5; i++) later(() => { const [x, z] = fl(x0 + Math.sin(a) * i * 2.6, z0 + Math.cos(a) * i * 2.6); R.fx('boom', x, 0.4, z, { r: 3, color: '#FF8A3A' }); R.aoe(x, z, 3, b * 2.5, { kb: 3, burn: true }); shake(0.3); }, i * 120); R.addAware && R.addAware(6, 'boom'); }, 3100) }
    },
    archer: {
      arcane: { name: '星軌追跡', d: '箭雨落下的時候，自動朝身邊 14 公尺內的敵人放出 20 支追蹤魔箭（每支傷害 ×1.8）。', go: (P, b) => { for (let i = 0; i < 20; i++) later(P => { const L = near(P.x, P.z, 14); if (!L.length) return; const e = L[Math.floor(rnd() * L.length)]; R.fx('bolt', P.x, 1.2, P.z, { to: e, color: '#C8A8FF' }); R.hurtEnemy(e, b * 1.8, { primary: false }); }, 400 + i * 110); } },   // 2026-10-08 實測 12 支×0.9 只多 4%，加強
      ranger: { name: '獵場箭雨', d: '落點的敵人先被捕獸夾定住 2 秒；翻滾馬上能用，8 秒內移動 +25%。', go: P => { const [x, z] = aim(P, 13); later(() => near(x, z, 6.5).forEach(e => { st(e, 'root', 2); R.fx('ring', e.x, 0.1, e.z, { r: 0.9, color: '#C8A86A' }); }), 450); P.dodgeCd = 0; buff(P, 'ranger', { t: 8, speed: 1.25, color: '#8AE07A' }); } },
      hama: { name: '破魔流星', d: '最後落下一支巨大的破魔矢：落點 7 公尺內的敵人再受傷害 ×4，而且破甲 5 秒（受到的傷害 +15%）。', go: (P, b) => { const [x, z] = aim(P, 13); later(() => { R.fx('pillar', x, 0, z, { r: 2.2, color: '#FFFFFF' }); R.fx('ring', x, 0.1, z, { r: 7, color: '#FFE8A0' }); near(x, z, 7).forEach(e => { if (R.elemBreak) R.elemBreak(e); }); R.aoe(x, z, 7, b * 4, { primary: false }); shake(0.5); }, 2650); } }
    },
    warrior: {
      berserker: { name: '血渦天崩', d: '跳起來的時候把 10 公尺內的敵人往自己吸過來；落地後 6 秒傷害 +20%、吸血 15%。', go: P => { pull(() => [W().P.x, W().P.z], 10, 1.0, 9); R.fx('ring', P.x, 0.1, P.z, { r: 10, color: '#C82A2A' }); later(P => buff(P, 'berserker', { t: 6, dmg: 1.2, vamp: 0.15, color: '#FF4A4A' }), 700); } },
      gladiator: { name: '天崩・迴旋', d: '落地之後接兩圈 360 度迴旋斬（每圈傷害 ×3、擊退）。', go: (P, b) => { [900, 1150].forEach(ms => later(P => { spin(P, 4.8, b * 3, { kb: 3 }, '#FFC08A'); shake(0.35); }, ms)); } },
      onimusha: { name: '鬼哭天崩', d: '戴上鬼面劈下：落地處 8 公尺內的敵人嚇得愣住 1.5 秒，留下 5 秒的鬼火一直燒（每 0.5 秒傷害 ×0.6）。', go: (P, b) => later(P => { const x = P.x, z = P.z; near(x, z, 8).forEach(e => st(e, 'stun', 1.5)); R.fx('poof', x, 1, z, { color: '#7A3AFF', n: 30 }); field(x, z, 5, 5, 0.5, (x, z) => { R.aoe(x, z, 5, b * 0.6, { primary: false, props: false }); R.fx('poof', x + (rnd() - 0.5) * 6, 0.5, z + (rnd() - 0.5) * 6, { color: '#9A5AFF', n: 6 }); }, '#7A3AFF'); }, 750) }
    },
    mage: {
      elementalist: { name: '元素隕星', d: '七顆隕星輪流帶火、冰、雷：燒、減速、麻痺；最後再落一顆大的（傷害 ×5）。', go: (P, b) => { const [x, z] = aim(P, 13); for (let k = 0; k < 7; k++) later(() => near(x, z, 6.5).forEach(e => { if (k % 3 === 0) st(e, 'burn', 3); else if (k % 3 === 1) st(e, 'slow', 3); else st(e, 'stun', 0.5); }), 720 + k * 180); later(() => { R.fx('mark', x, 0, z, { r: 4, t: 0.4 }); }, 1700); later(() => { R.fx('pillar', x, 0, z, { r: 1.8, color: '#FFFFFF' }); R.fx('boom', x, 0.6, z, { r: 4.5, color: '#FFB86A' }); R.aoe(x, z, 4.5, b * 5, { burn: true }); shake(0.6); }, 2100); } },
      hexer: { name: '咒星', d: '隕星落下之前，落點 7 公尺內的敵人先被詛咒 8 秒（受到的傷害變多、變慢）。', go: P => { const [x, z] = aim(P, 13); R.fx('ring', x, 0.1, z, { r: 7, color: '#9A4ACF' }); near(x, z, 7).forEach(e => { st(e, 'curse', 8); st(e, 'slow', 3); }); } },
      waixiu: { name: '氣罩流星', d: '施放時魔力罩一口氣長滿（25% 生命的護盾）；隕星落完把魔力罩炸開，震飛周圍 5 公尺（傷害 ×4）。', go: (P, b) => { P.shield = Math.max(P.shield || 0, P.hpMax * 0.25); if (P.buff) P.buff.shieldT = Math.max(P.buff.shieldT || 0, 6); later(P => { R.fx('boom', P.x, 0.5, P.z, { r: 5, color: '#9AD8FF' }); R.aoe(P.x, P.z, 5, b * 4, { kb: 6 }); shake(0.5); }, 2000); } }
    },
    priest: {
      bishop: { name: '大聖域', d: '再展開一片更大的聖域（9 公尺、12 秒）；你和隊友多一層 30% 生命的護盾。', go: (P, b) => { if (R.addZone) R.addZone({ kind: 'sanct', x: P.x, z: P.z, r: 9, life: 12, dmg: b * 0.5 }); if (T().heal) T().heal({ _id: 'ultp:bishop', shield: 0.3, allyShield: 0.3 }, P, W(), b); } },
      druid: { name: '萬木回春', d: '藤蔓纏住 8 公尺內的敵人 3 秒；12 秒內每秒回 3% 生命。', go: P => { near(P.x, P.z, 8).forEach(e => { st(e, 'root', 3); R.fx('ring', e.x, 0.1, e.z, { r: 0.9, color: '#6AC85A' }); }); buff(P, 'druid', { t: 12, regen: 0.03, color: '#8AE07A' }); } },
      shinkan: { name: '結界降臨', d: '張開 6 秒的結界：擋下所有投射物，靠近的遺跡生物打你 −40%；範圍內的敵人變慢。', go: P => { buff(P, 'shinkan', { t: 6, kekkai: 1, color: '#FFFFFF' }); near(P.x, P.z, 7).forEach(e => st(e, 'slow', 6)); } }
    },
    blade: {
      kensei: { name: '千刃・一閃', d: '斬完收刀，朝準心一刀斬出 16 公尺（傷害 ×8、必定暴擊）。', go: (P, b) => later(P => { P.stance = Math.max(P.stance || 0, 0.25); later(P => { line(P, 16, 1.2, b * 8, { crit: true }, '#E8F4FF'); shake(0.6); }, 250); }, 1700) },
      shadow: { name: '千刃・影殺', d: '斬完隱身 3 秒，隱身中暴擊率 +50%。', go: P => later(P => { P.invis = Math.max(P.invis || 0, 3); buff(P, 'shadow', { t: 3, crit: 0.5, color: '#5A5A8A' }); R.fx('poof', P.x, 1, P.z, { color: '#3A3A5A', n: 20 }); }, 1600) },
      yoto: { name: '千刃・妖刀', d: '閃斬時每打倒一隻回 4% 生命；最後放出一圈妖氣斬（6 公尺、傷害 ×4）。', go: (P, b) => { P._yotoT = CT() + 3.5; later(P => { spin(P, 6, b * 4, {}, '#C83A6A'); shake(0.5); }, 1700); } }
    },
    knight: {
      templar: { name: '聖殿城塞', d: '城塞期間身邊 4.5 公尺一直被震（每 0.5 秒傷害 ×0.6）；結束後 6 秒受到的傷害 −40%。', go: (P, b) => { for (let i = 1; i <= 8; i++) later(P => { R.aoe(P.x, P.z, 4.5, b * 0.6, { primary: false, props: false }); R.fx('ring', P.x, 0.1, P.z, { r: 4.5, color: '#FFE8A0' }); }, i * 500); later(P => buff(P, 'templar', { t: 6, def: 0.4, color: '#FFE08A' }), 4000); } },
      paladin: { name: '聖光城塞', d: '城塞期間每秒回 5% 生命（身邊隊友也回）；結束時多放一圈聖光（7 公尺、傷害 ×4）。', go: (P, b) => { for (let i = 1; i <= 4; i++) later(P => { R.healP(P.hpMax * 0.05); (W().allies || []).forEach(a => { if (!a.downed && Math.hypot(a.x - P.x, a.z - P.z) < 7) a.hp = Math.min(a.hpMax, a.hp + a.hpMax * 0.05); }); R.fx('ring', P.x, 0.1, P.z, { r: 2, color: '#FFE8A0' }); }, i * 1000); later(P => { R.fx('pillar', P.x, 0, P.z, { r: 2.5, color: '#FFE8A0' }); R.aoe(P.x, P.z, 7, b * 4, { stun: 0.6 }); }, 4100); } },
      dragoon: { name: '龍墜城塞', d: '城塞結束時高高跳起，落在準心處把周圍 6 公尺的敵人擊飛（傷害 ×6）。', go: (P, b) => later(P => { const [x, z] = aim(P, 10); P.jump = { t: 0, dur: 0.6, x0: P.x, z0: P.z, x1: x, z1: z }; P.air = 0.6; P.iframe = Math.max(P.iframe || 0, 0.8); later(() => { R.fx('boom', x, 0.4, z, { r: 6, color: '#8AB8FF' }); R.fx('ring', x, 0.1, z, { r: 8, color: '#FFFFFF' }); R.aoe(x, z, 6, b * 6, { stun: 1 }); R.knockUp && R.knockUp(x, z, 6); shake(0.8); }, 600); }, 4300) }
    },
    monk: {
      fistsaint: { name: '百裂天崩', d: '每一拳變成一陣連打：閃到每隻遺跡生物面前時多打三拳（每拳傷害 ×1.5）。', go: (P, b) => { const sq = R.monkUltTargets ? R.monkUltTargets(P) : near(P.x, P.z, 12).slice(0, 6); sq.forEach((e0, i) => { for (let k = 0; k < 3; k++) later(P => { const e = R.monkUltPick ? R.monkUltPick(sq, i) : e0; if (!alive(e)) return; R.hurtEnemy(e, b * 1.5, { primary: false }); R.fx('spark', e.x, 1.2, e.z, { a: P.aimA || 0, crit: k === 2 }); }, 150 + i * 160 + 30 + k * 40); }); } },   // 2026-10-08 實測：每一拳都會擊退，原本「身邊 3 公尺」的連打幾乎打不到，改成跟著原本的目標打
      staffmonk: { name: '風車天崩', d: '最後一擊的同時長棍掄三圈，一圈比一圈大（5、7、9 公尺，每圈傷害 ×2.5、擊退）。', go: (P, b) => { const n = Math.min(6, near(P.x, P.z, 12).length); [[0, 5], [200, 7], [400, 9]].forEach(([ms, r]) => later(P => spin(P, r, b * 2.5, { kb: 3 }, '#FFC85A'), 220 + n * 160 + ms)); } },   // 2026-10-08 實測：最後一擊會把敵人擊退 5 公尺，原本在那之後才掄 4.5 公尺打不到
      inner: { name: '氣海天崩', d: '施放時回 20% 生命、30% 魔力；最後一擊讓 6 公尺內的敵人暈 2 秒，打中的行壁直接碎掉。', go: P => { R.healP(P.hpMax * 0.2); P.mp = Math.min(P.mpMax, P.mp + P.mpMax * 0.3); const n = Math.min(6, near(P.x, P.z, 12).length); later(P => { near(P.x, P.z, 6).forEach(e => st(e, 'stun', 2)); ((W().F && W().F.props) || []).forEach(p => { if (p.alive && p.kind === 'plug' && Math.hypot(p.x - P.x, p.z - P.z) < 6 && R.hitProp) R.hitProp(p, 1e9, false); }); }, 320 + n * 160); } }
    },
    bard: {
      aria: { name: '詠嘆狂想', d: '你和隊友多一層 30% 生命的護盾、清掉變慢和看不清楚；10 秒內受到的傷害 −20%。', go: (P, b) => { if (T().heal) T().heal({ _id: 'ultp:aria', shield: 0.3, allyShield: 0.3, cleanse: 1 }, P, W(), b); buff(P, 'aria', { t: 10, def: 0.2, color: '#FFB8E0' }); } },
      drummer: { name: '戰鼓狂想', d: '震擊多敲三下（6 公尺、擊退）；技能冷卻減少 30%。', go: (P, b) => { for (let i = 0; i < 3; i++) later(P => { R.fx('ring', P.x, 0.1, P.z, { r: 6, color: '#FF9A5A' }); R.aoe(P.x, P.z, 6, b * 1.6, { kb: 2, primary: false }); shake(0.25); }, 1600 + i * 300); P.skillCd = (P.skillCd || 0) * 0.7; if (P.skCd) P.skCd = P.skCd.map(c => (c || 0) * 0.7); } },
      serane: { name: '奏域狂想', d: '腳下展開 10 秒的奏域：裡面回血、灼傷敵人。', go: (P, b) => { if (R.addZone) R.addZone({ kind: 'sanct', x: P.x, z: P.z, r: 6, life: 10, dmg: b * 0.5 }); R.fx('ring', P.x, 0.1, P.z, { r: 6, color: '#FFB8E0' }); } }
    },
    summoner: {
      beastlord: { name: '萬獸夜行', d: '多捏三隻土狼，一起咬 12 秒。', go: (P, b) => { if (T().pet) T().pet({ _id: 'ultp:beast' + rnd(), beast: 'okuriinu', n: 3, t: 12, k: 0.35 }, P, W(), b); } },   // 2026-10-08 實測太強（3 秒內 +185%），調低
      medium: { name: '百鬼附身', d: '怨靈纏住 8 公尺內所有敵人 8 秒，一直咬、讓牠們變慢；回 20% 生命。', go: (P, b) => { R.healP(P.hpMax * 0.2); const L = near(P.x, P.z, 8); let left = 8, tick = 0; dyn(dt => { left -= dt; tick -= dt; if (tick <= 0) { tick = 0.5; L.forEach(e => { if (!alive(e)) return; R.hurtEnemy(e, b * 0.3, { primary: false }); st(e, 'slow', 0.6); R.fx('poof', e.x, 1, e.z, { color: '#8A7AAA', n: 3 }); }); } return left > 0; }); } },
      tamer: { name: '百獸馴服', d: '再捏出一隻這一層的遺跡生物替你打 15 秒。', go: (P, b) => { if (T().pet) T().pet({ _id: 'ultp:tame' + rnd(), beast: 'floor', n: 1, t: 15, k: 0.6 }, P, W(), b); } },   // 2026-10-08 實測太強（+270%），兩隻→一隻
      shikigami: { name: '式神夜行', d: '放出五隻紙式神環繞你、自動攻擊 10 秒。', go: P => { P.orbit = Math.max(P.orbit || 0, 10); P.orbitN = Math.max(P.orbitN || 0, 5); } }   // 2026-10-08 實測：六隻 15 秒太強（前面的召喚物沒清掉，數字偏高），四隻 8 秒又比原版弱；五隻 10 秒
    },
    arraymage: {
      grandarray: { name: '天地大陣・極', d: '大陣最後再爆一次，範圍大四成（10 公尺、傷害 ×3）。', go: (P, b) => { const x = P.x, z = P.z; later(() => { R.fx('ring', x, 0.1, z, { r: 10, color: '#7AC8E8' }); R.fx('boom', x, 0.5, z, { r: 10, color: '#BFE8FF' }); R.aoe(x, z, 10, b * 3, {}); shake(0.6); }, 2200); } },
      warder: { name: '天地結界', d: '12 秒內每秒回 3% 生命、受到的傷害 −25%。', go: P => buff(P, 'warder', { t: 12, regen: 0.03, def: 0.25, color: '#7AC8E8' }) },
      eidanora: { name: '不散大陣', d: '大陣爆完不散：留下 10 秒的抑制圈，一直傷害、讓敵人變慢。', go: (P, b) => { const x = P.x, z = P.z; later(() => field(x, z, 7, 10, 0.5, (x, z) => { R.aoe(x, z, 7, b * 0.45, { primary: false, props: false }); near(x, z, 7).forEach(e => st(e, 'slow', 0.8)); }, '#4A9AC8'), 1700); } }
    },
    enchanter: {
      runesmith: { name: '萬象刻印', d: '再刻上毒和金：附魔期間普攻打中的敵人會中毒、破甲。', go: P => whileHit(12, (e, raw, P) => { if (R.elemPoison) R.elemPoison(e, P); if (R.elemBreak) R.elemBreak(e); }) },
      spellblade: { name: '萬象劍氣', d: '附魔期間普攻打中時，順手把劍氣打出去（穿過一整排敵人）。', go: P => whileHit(12, (e, raw, P) => { if (R.elemWind) R.elemWind(P, e, raw, 0.6); }) },
      entian: { name: '萬象撕裂', d: '施放時朝準心撕開一道 14 公尺的直線（傷害 ×5、必定暴擊、破甲）。', go: (P, b) => later(P => { line(P, 14, 1, b * 5, { crit: true, brk: true }, '#FF8A4A'); shake(0.5); }, 200) }
    },
    scroll: {
      scribe: { name: '萬卷疊爆', d: '準心處再連爆五張火卷（每張傷害 ×1.8、燃燒）。', go: (P, b) => { if (T().at) T().at({ _id: 'ultp:scribe', range: 12, r: 3, k: 1.8, waves: 5, gap: 250, delay: 500, burn: 1, color: '#FF8A3A' }, P, W(), b); } },
      sealer: { name: '萬卷封印', d: '準心 6 公尺內的敵人被封住 3 秒，詛咒 6 秒（受到的傷害變多）。', go: P => { const [x, z] = aim(P, 12); R.fx('ring', x, 0.1, z, { r: 6, color: '#F2D88A' }); near(x, z, 6).forEach(e => { st(e, 'stun', 3); st(e, 'curse', 6); }); } },
      noxa: { name: '預載・萬卷', d: '預載的卷軸再全部放一輪；回 30% 魔力。', go: (P, b) => { P.mp = Math.min(P.mpMax, P.mp + P.mpMax * 0.3); later(P => { if (T().shots) T().shots({ _id: 'ultp:noxa', n: 24, spread: 6.28, k: 1.1, kind: 'orb', sp: 18, burst: 2, gap: 200 }, P, W(), b); }, 1300); } }
    }
  };
  // 舊路線借用
  PATH.warrior.inner = PATH.monk.inner; PATH.mage.shikigami = PATH.summoner.shikigami; PATH.monk.waixiu = PATH.mage.waixiu;
  R.ULT_PATHS = PATH;

  // ---------- 用哪一個 ----------
  const advOf = cls => { const s = S(), c = s && s.classes && s.classes[cls]; return c && c.adv; };
  const pickOf = cls => { const s = S(); return (s && s.ultPick && s.ultPick[cls]) || 'path'; };
  const pathOf = (cls, adv) => { const a = adv || advOf(cls), L = PATH[cls]; return a && L && L[a] && pickOf(cls) !== 'base' ? L[a] : null; };
  R.ultPathOf = pathOf;
  const advName = (cls, id) => { const a = (R.ADV[cls] || []).find(x => x.id === id); return a ? a.name : ''; };
  Object.keys(U).forEach(cls => {
    const u = U[cls]; if (!u || u._path) return; u._path = 1;
    let name = u.name, sub = u.sub; const g = u.go;
    const cur = () => { const P = W().P; return P && P.cls === cls ? pathOf(cls, P.adv) : pathOf(cls); };
    Object.defineProperty(u, 'name', { get: () => { const p = cur(); return p ? p.name : name; }, set: v => { name = v; }, configurable: true, enumerable: true });
    Object.defineProperty(u, 'sub', { get: () => { const p = cur(); return p ? advName(cls, (W().P && W().P.adv) || advOf(cls)) + '的大招：' + name + '＋' + p.d : sub; }, set: v => { sub = v; }, configurable: true, enumerable: true });
    u.baseName = () => name; u.baseSub = () => sub;
    u.go = P => { g(P); const p = pathOf(cls, P.adv); if (p) try { p.go(P, R.ultBase(P)); } catch (e) { console.warn('[ultpath]', e); } };
  });

  // ---------- 技能書：最上面的「大招」卡片，最下面選 ----------
  (R.SB_HEAD = R.SB_HEAD || []).push((cls, st) => {
    const u = U[cls]; if (!u) return '';
    const ic = R.ultIconURL ? R.ultIconURL(cls) : R.skillIconURL && R.skillIconURL('ult_' + cls);
    return '<details class="sb-group" open><summary><b>大招</b> <small>遺跡裡集滿量表按 V（或點大招鈕）</small></summary><div class="recipes sb-list"><div class="recipe sb-card sb-ult"><div class="sb-pick">'
      + (ic ? '<img class="sb-ico" src="' + ic + '" alt="" draggable="false">' : '<span class="sb-ico sb-ico-ult" aria-hidden="true">★</span>')
      + '<b>' + esc(u.baseName ? u.baseName() : u.name) + '</b><small>' + esc(R.CLASSES[cls].name) + '的大招</small><span>' + esc(u.baseSub ? u.baseSub() : u.sub) + '</span></div><div class="sb-foot" data-foot="ult:' + cls + '"></div></div></div></details>';
  });
  (R.SB_FOOT = R.SB_FOOT || []).push(function fill(foot, id) {
    const m = /^ult:(\w+)$/.exec(id || ''); if (!m) return;
    const cls = m[1], L = PATH[cls] || {}, adv = advOf(cls), mine = adv && L[adv], u = U[cls];
    let box = foot.querySelector('.up-box'); if (!box) { box = document.createElement('div'); box.className = 'up-box'; foot.appendChild(box); }
    if (!mine) {
      const list = (R.ADV[cls] || []).filter(a => !a.legacy && L[a.id]);
      box.innerHTML = '<div class="sv-vars"><span class="sv-lock">轉職以後可以換成路線的大招：</span></div>' + list.map(a => '<div class="up-d"><b>' + esc(a.name) + '・' + esc(L[a.id].name) + '</b>：' + esc(L[a.id].d) + '</div>').join('');
      return;
    }
    const pk = pickOf(cls), on = pk !== 'base';
    box.innerHTML = '<div class="sv-vars"><span class="sv-h">大招</span><button type="button" class="' + (on ? '' : 'on') + '" data-up="base">原版・' + esc(u.baseName ? u.baseName() : '') + '</button><button type="button" class="' + (on ? 'on' : '') + '" data-up="path">' + esc(advName(cls, adv)) + '・' + esc(mine.name) + '</button></div>'
      + '<div class="up-d">' + (on ? '<b>' + esc(mine.name) + '</b>：原本的大招照放，再加上——' + esc(mine.d) : '<b>原版</b>：用' + esc(R.CLASSES[cls].name) + '原本的大招。') + '</div>';
    const card = foot.closest('.sb-ult'), art = card && card.querySelector('.sb-ico');
    if (art && R.ultIconURL) art.src = R.ultIconURL(cls);
    box.querySelectorAll('[data-up]').forEach(b => {
      if (R.skillIconURL) { const im = document.createElement('img'); im.src = R.skillIconURL(b.dataset.up === 'base' ? 'ult:' + cls : 'ultpath:' + cls + ':' + adv); im.alt = ''; im.width = im.height = 28; im.style.cssText = 'vertical-align:middle;margin-right:5px;border-radius:4px'; b.prepend(im); }
      b.onclick = e => { e.stopPropagation(); const s = S(); s.ultPick = s.ultPick || {}; s.ultPick[cls] = b.dataset.up; R.save && R.save(); fill(foot, id); };
    });
  });
  const css = document.createElement('style');
  css.textContent = '.sb-ult{border-color:#C9A13A;background:linear-gradient(180deg,rgba(201,161,58,.12),transparent 70%),var(--bg2)}'
    + '.sb-ult,.sb-ult .sb-pick{cursor:default}.sb-ico-ult{display:grid;place-items:center;font-size:24px;color:#FFE08A;border:1px solid #C9A13A;text-shadow:0 0 8px #E8C04A}'
    + '.up-box{display:grid;gap:4px}.up-d{font-size:11.5px;line-height:1.45;color:var(--dim)}.up-d b{color:#E8D8B0}';
  document.head.appendChild(css);
})(window.R);
