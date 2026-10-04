// 體力（2026-10-04 作者：玩家新增體力條，讓他們用在翻滾、跑步、防禦（新增））
// - 體力 100（P.stam／P.stamMax），只在遺跡裡用（城裡跑步不扣）。每秒回 25。
//   2026-10-05 作者：體力條改成邊消耗邊回復——用掉以後不用再等 1 秒才回；跑步、舉盾的時候也在回（回一半）。
//   跑步的消耗跟著從每秒 12 改成 22（一邊回 12.5，實際每秒少 9.5，滿的大約跑 10 秒，跟原本差不多）。
// - 翻滾：扣 30，不夠就滾不出去（翻滾冷卻照舊）。
// - 跑步（按住 Shift／手機的「跑步」）：每秒扣 22（同時回一半）；扣光就跑不動，要回到 30 才能再跑。
// - 防禦（新的動作：按住 Z，按鍵設定可以改；手機多一個「防禦」鈕，點一下舉起、再點一下放下）：
//   舉著的時候走路變慢一半、不能普攻、體力回一半；面向的左右各 75 度內打過來的攻擊，傷害 −70%（騎士拿盾 −85%），
//   每擋一下扣體力：8＋這一下佔生命的比例×60。剛舉起的 0.25 秒內擋到＝完美防禦：完全不受傷、不扣體力，打你的那隻愣 0.8 秒。
//   體力扣光＝防禦被打破：這一下只擋一半、人愣 0.8 秒，1.5 秒內不能再舉。陷阱、地形、看不出從哪裡來的傷害擋不了。
// - 鍛鍊（2026-10-04 作者：加可以鍛鍊體力，在熟練那邊）：用掉的體力每 15 點，熟練度的「體力的鍛鍊」+1（prof.js）；每級體力上限 +5、回復 +4%（下一趟遺跡開始算）。
//   作者：跑久了或經常受傷都會增加體力——城裡跑步（不扣體力）每跑 4 秒 +1；受傷：掉的生命每一管（滿血那麼多）+40。
// - 體力條在技能列的上緣（手機在畫面最下面）；快沒了變黃、扣光變紅。
// 放在 run.js、combat.js、keybinds.js、hud2.js、hud3.js、adv2more.js 後面（包 R.dodge、R.running、R.hurtPlayer、R.attack、R.step、R.tact）。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id), TH = () => window.THREE;
  const MAX = 100, REGEN = 25, DELAY = 0, DODGE = 30, RUN = 22, RESUME = 30, ARC = 1.3;
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const live = () => { const w = W(); return !!(w && w.run && !w.town && w.P && !w.run.done); };
  const trained = () => (R.profLv && R.profLv.stam ? R.profLv.stam() : 0), maxOf = () => MAX + 5 * trained();
  const init = P => { if (P.stam == null || !P.stamMax) { P.stamMax = maxOf(); P.stamRegen = REGEN * (1 + 0.04 * trained()); P.stam = P.stamMax; } };
  let spent = 0;
  const use = (P, v) => { const d = Math.min(P.stam, v); P.stam = Math.max(0, P.stam - v); P.stamT = DELAY; if (P.stam <= 0) P.stamOut = true; spent += d; if (spent >= 15 && R.profGain) { const n = Math.floor(spent / 15); spent -= n * 15; R.profGain('stam', null, n); } };
  let warnT = 0;
  const warn = () => { if (warnT > 0) return; warnT = 1.2; R.toast && R.toast('體力不夠', '#E0A03A'); };

  // ---------- 翻滾 ----------
  const dg0 = R.dodge;
  R.dodge = (...a) => {
    const P = W().P; if (!P || !live()) return dg0(...a);
    init(P);
    if (P.dodgeCd > 0 || P.dead || P.knockT > 0 || P.dashT > 0 || P.jump) return dg0(...a);
    if (P.stam < DODGE) { warn(); return; }
    const c0 = P.dodgeCd || 0, r = dg0(...a);
    if ((P.dodgeCd || 0) > c0 || P.dashT > 0) { use(P, DODGE); P.guard = false; }
    return r;
  };
  // ---------- 跑步 ----------
  const rn0 = R.running;
  R.running = () => { const r = rn0(); if (!r || !live()) return r; const P = W().P; return !(P.stamOut || P.guard); };
  // ---------- 防禦：不能普攻 ----------
  const at0 = R.attack;
  R.attack = (...a) => { const P = W().P; if (P && P.guard && live()) return; return at0(...a); };
  // ---------- 防禦：擋傷害 ----------
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const w = W(), P = w.P;
    if (P && P.guard && live() && raw > 0 && !P.dead && !((P.iframe || 0) > 0) && src && src.x != null && !src.dead) {
      const d = Math.abs(wrap(Math.atan2(src.x - P.x, src.z - P.z) - (P.aimA || 0)));
      if (d < ARC) {
        if (w.run.t - (P.guardT0 || -9) < 0.25) {   // 完美防禦
          if (src.st) src.st.stun = Math.max(src.st.stun || 0, 0.8);
          R.fx && R.fx('ring', P.x, 1, P.z, { r: 1.6, color: '#FFE08A' }); R.fx && R.fx('spark', P.x + Math.sin(P.aimA) * 0.9, 1.1, P.z + Math.cos(P.aimA) * 0.9, { a: P.aimA, crit: true });
          R.sfx && R.sfx('crit'); R.num && R.num(P.x, 2.4, P.z, '完美防禦', 'crit'); flash(1);
          return 0;
        }
        use(P, 8 + 60 * raw / Math.max(1, P.hpMax));
        if (P.stam <= 0) {   // 防禦被打破
          P.guard = false; P.guardLock = 1.5; P.knockT = Math.max(P.knockT || 0, 0.8);
          R.fx && R.fx('poof', P.x, 1.1, P.z, { color: '#9AD8FF', n: 14 }); R.toast && R.toast('防禦被打破了！', '#FF9A6A');
          raw *= 0.5;
        } else {
          raw *= 1 - (P.cls === 'knight' ? 0.85 : 0.7);
          R.fx && R.fx('spark', P.x + Math.sin(P.aimA) * 0.9, 1.1, P.z + Math.cos(P.aimA) * 0.9, { a: P.aimA }); flash(0.6);
        }
      }
    }
    const h0 = P ? P.hp : 0, out = hp0(raw, src, o);
    if (P && live() && P.hp < h0 && R.profGain) { hurtAcc += (h0 - Math.max(0, P.hp)) / Math.max(1, P.hpMax) * 40; if (hurtAcc >= 1) { const n = Math.floor(hurtAcc); hurtAcc -= n; R.profGain('stam', null, n); } }   // 常受傷也是鍛鍊
    return out;
  };
  let hurtAcc = 0;
  // 城裡跑步（不扣體力）：跑 4 秒 +1
  let townRun = 0;
  // 等所有檔案都載完再包（奉主 hosu.js 會整個換掉 R.townStep）；有沒有在跑看真的有沒有移動
  const hookTown = () => { const ts0 = R.townStep; if (!ts0 || ts0.stamHooked) return; const f = dt => { const w = W(), P = w.P, x0 = P ? P.x : 0, z0 = P ? P.z : 0, r = ts0(dt); try { if (w.town && !w.run && !w.paused && P && R.running && R.running() && Math.hypot(P.x - x0, P.z - z0) > dt * 1.5) { townRun += dt; if (townRun >= 4 && R.profGain) { townRun -= 4; R.profGain('stam', null, 1); } } } catch (e) { } return r; }; f.stamHooked = true; R.townStep = f; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookTown); else setTimeout(hookTown, 0);
  // ---------- 盾的樣子：面前一片半透明的弧 ----------
  let shield = null, glow = 0;
  const flash = v => { glow = Math.max(glow, v); };
  const shieldMesh = () => {
    const t = TH(), w = W(); if (!t || !w.scene) return null;
    if (!shield) { shield = new t.Mesh(new t.CylinderGeometry(1.05, 1.05, 1.5, 18, 1, true, -ARC, ARC * 2), new t.MeshBasicMaterial({ color: '#9AD8FF', transparent: true, opacity: 0.3, side: t.DoubleSide, depthWrite: false })); shield.renderOrder = 5; }
    if (shield.parent !== w.scene) w.scene.add(shield);
    return shield;
  };
  // ---------- 手機：防禦鈕 ----------
  let touchGuard = false;
  const tc0 = R.tact;
  R.tact = a => { if (a === 'guard') { touchGuard = !touchGuard; document.querySelectorAll('[data-tact="guard"]').forEach(b => b.classList.toggle('on', touchGuard)); return; } return tc0(a); };
  const ensureBtn = () => {
    const br = $('r-br'); if (!br || br.querySelector('[data-tact="guard"]')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'act dungeon-only touch-only'; b.dataset.tact = 'guard'; b.textContent = '防禦';
    b.addEventListener('click', () => R.tact('guard')); br.appendChild(b);
  };
  // ---------- 體力條 ----------
  const ensureBar = () => {
    let el = $('st-bar'); if (el) return el;
    const host = document.querySelector('#h2-dock .h2-mid') || $('run'); if (!host) return null;
    el = document.createElement('div'); el.id = 'st-bar'; el.className = 'dungeon-only'; el.title = '體力：翻滾、跑步、防禦會用到'; el.innerHTML = '<i></i>'; host.appendChild(el); return el;
  };
  let hudT = 0, last = '';
  // ---------- 每一幀 ----------
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), w = W(), P = w && w.P;
    try {
      if (warnT > 0) warnT -= dt;
      if (!P || !live()) { if (shield && shield.parent) shield.parent.remove(shield); P && (P.guard = false); return r; }
      init(P);
      if (P.guardLock > 0) P.guardLock -= dt;
      // 防禦：按住 Z（或手機的鈕）
      const I = R.input || { keys: {} }, want = (!!I.keys.z || touchGuard) && !P.dead && !(P.knockT > 0) && !P.jump && !(P.dashT > 0) && !(P.guardLock > 0) && !w.paused;
      if (want && !P.guard) { if (P.stam > 0) { P.guard = true; P.guardT0 = w.run.t; P.charging = false; } else warn(); }
      if (!want) P.guard = false;
      // 跑步扣體力
      const runNow = !w.paused && R.running() && P.moveA != null && !P.dead; if (runNow) use(P, RUN * dt);
      // 回復
      if (!w.paused) {
        if (P.stamT > 0) P.stamT -= dt;
        else if (P.stam < P.stamMax) P.stam = Math.min(P.stamMax, P.stam + (P.stamRegen || REGEN) * (P.guard || runNow ? 0.5 : 1) * dt);   // 邊用邊回
        if (P.stamOut && P.stam >= RESUME) P.stamOut = false;
      }
      // 盾
      const m = P.guard ? shieldMesh() : shield;
      if (m) { m.visible = !!P.guard; if (P.guard) { m.position.set(P.x, 0.95, P.z); m.rotation.y = P.aimA || 0; glow = Math.max(0, glow - dt * 3); m.material.opacity = 0.28 + glow * 0.5; m.material.color.set(glow > 0.8 ? '#FFE08A' : '#9AD8FF'); } }
      // 畫面
      hudT -= dt; if (hudT <= 0) {
        hudT = 0.05; ensureBtn(); const el = ensureBar();
        if (el) { const k = P.stam / P.stamMax, s = Math.round(k * 1000) / 10 + '|' + (P.stamOut ? 'o' : k < 0.3 ? 'l' : '') + (P.guard ? 'g' : ''); if (s !== last) { last = s; el.firstChild.style.width = (k * 100).toFixed(1) + '%'; el.classList.toggle('low', !P.stamOut && k < 0.3); el.classList.toggle('out', !!P.stamOut); el.classList.toggle('guard', !!P.guard); } }
      }
    } catch (e) { console.warn('[stamina]', e); }
    return r;
  };
  // 換樓層：盾重新放進新的場景；體力回滿
  const lf0 = R.loadFloor;
  R.loadFloor = (f, o) => { const r = lf0(f, o), P = W().P; if (shield && shield.parent) shield.parent.remove(shield); if (P) { P.stamMax = maxOf(); P.stamRegen = REGEN * (1 + 0.04 * trained()); P.stam = P.stamMax; P.stamOut = false; P.guard = false; } return r; };

  const css = document.createElement('style');
  css.textContent = [
    '#st-bar{position:absolute;left:30px;right:30px;top:5px;height:5px;border-radius:3px;background:#0A0806;box-shadow:inset 0 0 0 1px #2A2018,0 0 0 1px rgba(0,0,0,.6);z-index:2;pointer-events:auto}',
    '#st-bar i{display:block;height:100%;width:100%;border-radius:3px;background:linear-gradient(90deg,#4AA84A,#B8E070);box-shadow:0 0 6px rgba(184,224,112,.45);transition:width .08s linear}',
    '#st-bar.low i{background:linear-gradient(90deg,#C8822A,#F0C050)}#st-bar.out i{background:#C84A3A;box-shadow:none}#st-bar.guard{box-shadow:inset 0 0 0 1px #9AD8FF,0 0 8px rgba(154,216,255,.5)}',
    '#run.town #st-bar{display:none}',
    // 電腦版：排在技能格和經驗條中間（原本疊在面板上緣，會被技能格的數字擋住；2026-10-04 作者：體力條會被技能擋住）
    'body:not(.touch) #st-bar{position:relative;left:auto;right:auto;top:auto;order:1;align-self:stretch;margin:0 2px;height:6px}',
    'body.touch #st-bar{position:fixed;left:50%;right:auto;top:auto;width:34vw;transform:translateX(-50%);bottom:calc(max(8px,env(safe-area-inset-bottom)) + 4px);height:6px}',
    'body.touch #r-br [data-tact="guard"]{right:calc(var(--r) + var(--js) + 6px);bottom:calc(var(--b0) + 100px)}body.touch #r-br [data-tact="guard"].on{box-shadow:inset 0 0 0 2px #9AD8FF}',
    'body:not(.touch) #r-br [data-tact="guard"]{display:none!important}'
  ].join('\n');
  document.head.appendChild(css);
})(window.R);
