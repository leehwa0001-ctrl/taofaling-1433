// 多人連線：治療／護盾／祝福打得到連線隊友（2026-10-05）
// 原本 heal、守護之印、光盾、神蹟、聖域降臨、復活、安魂曲、光環回血只掃 W.allies（電腦隊友），
//   連線的朋友站在旁邊也吃不到。
// 做法：
// - R.nearAllies(P, range, { downed })：電腦隊友＋連線人物（remote proxy，有 .remote id）
// - R.aidAlly(al, { healPct, shieldPct, healAbs, shieldAbs, shieldT, cleanse, revive, revivePct, quiet, iframe })（healAbs、shieldAbs＝固定量，疊在原本的護盾上；rateK、rateT＝攻速加成）：
//     電腦隊友直接改血／盾；連線隊友送 { k:'aid', rid,f,n, hp,sh,sht,cl,rv,q,ifr }，對方自己 healP／加盾／站起來
// - 包住 SKILL_TYPES.heal／revive／aura、castSkillId('ward')、CORE.priest.act、CORE.bard.play、ULTS.priest.go
// 放在 net.js、net2.js、skillbook.js、skills.js、adv2more.js、ult.js、classcore2.js、skillbook2.js 後面。
(function (R) {
  const W = () => R.W, N = () => R.net || {};
  const crun = () => { const run = W().run; return run && run.coop && !run.coop.solo && !run.done && N().room ? run : null; };
  const num = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
  const tag = run => ({ rid: run.coop.seed, f: run.floor, n: run.coop.n });
  const nameOf = id => { const m = (N().members || []).find(x => x.id === id); return m ? m.name : '隊友'; };

  // ---------- 目標：電腦隊友＋連線人物 ----------
  R.nearAllies = (P, range, o) => {
    const out = [], r = range == null ? 7 : range, onlyDown = !!(o && o.downed);
    if (!P) return out;
    (W().allies || []).forEach(al => {
      if (!al) return;
      if (onlyDown ? !al.downed : al.downed) return;
      if (Math.hypot(al.x - P.x, al.z - P.z) <= r) out.push(al);
    });
    const rm = N().remotes;
    if (rm) rm.forEach((peer, id) => {
      if (!peer || !peer.h) return;
      const down = !!(peer.h.down);
      if (onlyDown ? !down : down) return;
      if (Math.hypot(peer.x - P.x, peer.z - P.z) > r) return;
      out.push({ ally: true, remote: id, x: peer.x, z: peer.z, y: peer.y || 0, downed: down, dead: down, hp: 1, hpMax: 100, name: nameOf(id), h: peer.h, shield: 0, shieldT: 0 });
    });
    return out;
  };

  const sendAid = (id, o) => {
    const run = crun(); if (!run || id == null || !N().send) return;
    const d = Object.assign({ k: 'aid' }, tag(run));
    if (o.healPct > 0) d.hp = Math.round(Math.min(1, o.healPct) * 1000) / 1000;
    if (o.shieldPct > 0) { d.sh = Math.round(Math.min(1, o.shieldPct) * 1000) / 1000; d.sht = o.shieldT > 0 ? Math.min(30, o.shieldT) : 6; }
    if (o.healAbs > 0) d.ha = Math.round(Math.min(1e5, o.healAbs));   // 2026-10-10 吟遊詩人的樂譜：照吟遊詩人的魔力上限算的固定量（不是對方生命的％）
    if (o.shieldAbs > 0) { d.sa = Math.round(Math.min(1e5, o.shieldAbs)); d.sht = o.shieldT > 0 ? Math.min(30, o.shieldT) : 6; }
    if (o.rateK > 1) { d.rk = Math.round(Math.min(3, o.rateK) * 1000) / 1000; d.rt = o.rateT > 0 ? Math.min(30, o.rateT) : 8; }   // 吟遊詩人的八分音符：攻速加成
    if (o.cleanse) d.cl = 1;
    if (o.revive) { d.rv = 1; if (!(d.hp > 0) && o.revivePct > 0) d.hp = Math.round(Math.min(1, o.revivePct) * 1000) / 1000; }
    if (o.quiet) d.q = 1;
    if (o.iframe > 0) d.ifr = Math.min(10, o.iframe);
    if (!(d.hp > 0) && !(d.sh > 0) && !(d.ha > 0) && !(d.sa > 0) && !(d.rk > 1) && !d.cl && !d.rv) return;
    try { N().send(d, id); } catch (e) { }
  };

  R.aidAlly = (al, o) => {
    if (!al || !o) return;
    if (al.remote != null) {
      sendAid(al.remote, o);
      if (R.fx && (o.healPct > 0 || o.shieldPct > 0 || o.healAbs > 0 || o.shieldAbs > 0 || o.revive)) R.fx(o.revive ? 'spawn' : 'ring', al.x, 0.1, al.z, { r: 1.2, color: '#FFE8A0' });
      return;
    }
    if (o.revive && al.downed) {
      al.downed = false; al.hp = al.hpMax * (o.revivePct || o.healPct || 0.5);
      if (o.shieldPct > 0) { al.shield = Math.max(al.shield || 0, al.hpMax * o.shieldPct); al.shieldT = o.shieldT || 6; }
      R.setDown && R.setDown(al.h, false);
      R.fx && R.fx('spawn', al.x, 0.1, al.z, { color: '#FFE8A0' });
      return;
    }
    if (al.downed) return;
    if (o.healPct > 0) {
      const v = al.hpMax * o.healPct;
      al.hp = Math.min(al.hpMax, al.hp + v);
      if (!o.quiet) R.num && R.num(al.x, 2.2, al.z, '+' + Math.round(v), 'heal');
    }
    if (o.shieldPct > 0) { al.shield = Math.max(al.shield || 0, al.hpMax * o.shieldPct); al.shieldT = o.shieldT || 6; }
    if (o.healAbs > 0) { al.hp = Math.min(al.hpMax, al.hp + o.healAbs); if (!o.quiet) R.num && R.num(al.x, 2.2, al.z, '+' + Math.round(o.healAbs), 'heal'); }
    if (o.shieldAbs > 0) { al.shield = Math.min(al.hpMax, (al.shield || 0) + o.shieldAbs); al.shieldT = Math.max(al.shieldT || 0, o.shieldT || 6); }
    if (o.healPct > 0 || o.shieldPct > 0 || o.healAbs > 0 || o.shieldAbs > 0) R.fx && R.fx('ring', al.x, 0.1, al.z, { r: 1.2, color: '#FFE8A0' });
  };

  R.aidNear = (P, range, o) => {
    const opts = o || {};
    R.nearAllies(P, range, { downed: !!opts.revive }).forEach(al => R.aidAlly(al, opts));
  };

  // ---------- 收到援助 ----------
  const applyAid = (from, d) => {
    const run = crun(); if (!run || d.rid !== run.coop.seed || d.f !== run.floor || d.n !== run.coop.n) return true;
    if (!(N().members || []).some(m => m.id === from)) return true;
    const P = W().P; if (!P) return true;
    let revived = false;
    if (d.rv && (P.netDown || P.dead)) {
      const pct = num(d.hp, 0.05, 1) ? d.hp : 0.35;
      P.netDown = null; P.dead = false; P.hp = Math.max(1, Math.round(P.hpMax * pct));
      P.iframe = Math.max(P.iframe || 0, num(d.ifr, 0, 10) ? d.ifr : 2);
      R.setDown && R.setDown(P.h, false);
      R.fx && R.fx('spawn', P.x, 0.1, P.z, { color: '#FFE8A0' });
      R.toast && R.toast((nameOf(from) || '隊友') + '把你救起來了！', '#FFE8A0');
      revived = true;
    }
    if (!P.dead || revived) {
      if (!d.rv && num(d.hp, 0, 1) && d.hp > 0) R.healP(P.hpMax * d.hp, !!d.q);
      if (num(d.sh, 0, 1) && d.sh > 0) {
        P.shield = Math.max(P.shield || 0, P.hpMax * d.sh);
        if (P.buff) P.buff.shieldT = Math.max(P.buff.shieldT || 0, num(d.sht, 0, 30) ? d.sht : 6);
        R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 1.4, color: '#FFE8A0' });
        R.fx && R.fx('block', P.x, 1.2, P.z);
      }
      if (num(d.ha, 0, 1e5) && d.ha > 0) R.healP(d.ha, !!d.q);
      if (num(d.sa, 0, 1e5) && d.sa > 0) { P.shield = Math.min(P.hpMax, (P.shield || 0) + d.sa); if (P.buff) P.buff.shieldT = Math.max(P.buff.shieldT || 0, num(d.sht, 0, 30) ? d.sht : 6); R.fx && R.fx('ring', P.x, 0.1, P.z, { r: 1.4, color: '#7FE8B8' }); }
      if (num(d.rk, 1, 3) && d.rk > 1 && P.ws) { P.sb = P.sb || {}; const old = P.sb['bd:ally']; if (old && old.rate) P.ws.rate /= old.rate; const t = num(d.rt, 0, 30) ? d.rt : 8; P.sb['bd:ally'] = { left: t, t, rate: d.rk, color: '#FFE08A' }; P.ws.rate *= d.rk; }
      if (d.cl) { P.slowT = 0; P.blindT = 0; if (P.dbf) Object.keys(P.dbf).forEach(k => { P.dbf[k] = 0; }); }
      if (num(d.ifr, 0, 10) && d.ifr > 0 && !d.rv) P.iframe = Math.max(P.iframe || 0, d.ifr);
    }
    return true;
  };
  const onMsg = (from, d) => { if (!d || d.k !== 'aid') return false; try { return applyAid(from, d); } catch (e) { console.warn('[netaid]', e); return true; } };
  const hook = () => { const n = N(); if (!n.send || n.aidHooked) return; const prev = n.onMsg2; n.onMsg2 = (from, d) => { if (d && onMsg(from, d)) return; if (prev) prev(from, d); }; n.aidHooked = 1; };
  hook();

  // ---------- 包住技能入口 ----------
  const healRemotes = (P, range, o) => {
    if (!crun() || !P) return;
    R.nearAllies(P, range).forEach(al => { if (al.remote == null) return; R.aidAlly(al, o); });
  };

  const T = R.SKILL_TYPES;
  if (T && T.heal) {
    const h0 = T.heal;
    T.heal = (s, P, w, pw) => {
      const r = h0(s, P, w, pw);
      if (r === false) return r;
      if (s.allies > 0 || s.allyShield > 0) healRemotes(P, 7, { healPct: s.allies || 0, shieldPct: s.allyShield || 0, shieldT: 6 });
      return r;
    };
  }
  if (T && T.revive) {
    const rv0 = T.revive;
    T.revive = (s, P, w, pw) => {
      let nR = 0;
      R.nearAllies(P, s.range || 30, { downed: true }).forEach(al => {
        if (al.remote == null) return;
        R.aidAlly(al, { revive: 1, revivePct: s.pct || 0.5, shieldPct: s.shield || 0, shieldT: 6, iframe: 2 });
        R.toast && R.toast(al.name + '站起來了！', '#FFE8A0');
        nR++;
      });
      const charge0 = P.reviveCharge || 0;
      const r = rv0(s, P, w, pw);
      if (nR > 0 && (P.reviveCharge || 0) > charge0) P.reviveCharge = charge0;
      return r;
    };
  }
  if (T && T.aura) {
    const a0 = T.aura;
    T.aura = (s, P, w, pw) => {
      a0(s, P, w, pw);
      if (!(s.heal > 0)) return;
      const run = w.run, reach = s.r > 0 ? s.r : 3; let left = s.t || 6, tick = 0;
      w.dyn.push(dt => {
        if (W().run !== run || !P || P.dead) return false;
        left -= dt; tick -= dt;
        if (tick <= 0) { tick = s.gap || 0.5; healRemotes(P, reach, { healPct: s.heal, quiet: 1 }); }
        return left > 0;
      });
    };
  }

  const cs0 = R.castSkillId;
  if (typeof cs0 === 'function') {
    R.castSkillId = id => {
      const r = cs0(id);
      if (id === 'ward') healRemotes(W().P, 6, { shieldPct: 0.2, shieldT: 6 });
      return r;
    };
  }

  const CORE = R.CORE;
  if (CORE && CORE.priest && CORE.priest.act) {
    const act0 = CORE.priest.act.bind(CORE.priest);
    CORE.priest.act = P => {
      act0(P);
      if (!crun() || !P) return;
      R.nearAllies(P, 5).forEach(al => { if (al.remote != null) R.aidAlly(al, { healPct: 0.3, cleanse: 1 }); });
      if (P.adv === 'bishop') R.nearAllies(P, 5, { downed: true }).forEach(al => { if (al.remote != null) R.aidAlly(al, { revive: 1, revivePct: 0.4, iframe: 2 }); });
    };
  }
  if (CORE && CORE.bard && CORE.bard.play) {
    const play0 = CORE.bard.play.bind(CORE.bard);
    CORE.bard.play = (P, s) => {
      play0(P, s);
      if (!s || s.n !== '安魂曲' || !P) return;
      const all = (R.legOf && R.legOf(P) === 'lg_allsong') ? 1.5 : 1;
      const heal = ((P.adv === 'aria' ? 1.5 : 1) * all);
      healRemotes(P, 7, { healPct: 0.15 * heal });
    };
  }

  const U = R.ULTS;
  if (U && U.priest && U.priest.go) {
    const go0 = U.priest.go;
    U.priest.go = P => {
      go0(P);
      R.nearAllies(P, 12).forEach(al => { if (al.remote != null) R.aidAlly(al, { healPct: 1, shieldPct: 0.35, shieldT: 8 }); });
      R.nearAllies(P, 12, { downed: true }).forEach(al => { if (al.remote != null) R.aidAlly(al, { revive: 1, revivePct: 1, shieldPct: 0.35, shieldT: 8, iframe: 2 }); });
    };
  }

  const st0 = R.step;
  R.step = dt => { const r = st0(dt); try { hook(); } catch (e) { } return r; };

  R.netAid = { nearAllies: R.nearAllies, aidAlly: R.aidAlly, aidNear: R.aidNear };
})(window.R);
