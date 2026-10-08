// 技能變化（作者 2026-10-05：都做——每一招 2～3 種變化在技能書裡選，同一個職業玩出很多種組合）
// - 技能書（skillbook.js 的「型」組成的技能）每一招有三種變化，照這招做的事挑。
// - 2026-10-05 作者：變化改成全部淨增益（不要增減益參半，不然很多變化不想選）；選變化要熟練度 ★3 以上；
//   變化選項直接放在技能書每一格技能的下方（跟裝備詞綴那樣，點了就能換），不再另外一大段。
//   2026-10-08 作者：改放在技能書每一張技能卡片（說明那格）的最下面，上面換技能的那排只管換技能。
// - 存在 R.S.skillVar[技能編號]；放技能的時候改那一次的參數（包 R.SKILL_TYPES 的每一種「型」，組合技的每一段也會改），冷卻在放出去之後乘。
// 放在所有加技能、技能「型」的檔案後面（skillbal2.js、buildfx.js 後面）。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const scaleBuff = (p, m) => { if (p.dmg > 1) p.dmg = 1 + (p.dmg - 1) * m; if (p.crit) p.crit *= m; if (p.def > 0) p.def *= m; if (p.speed > 1) p.speed = 1 + (p.speed - 1) * m; if (p.regen) p.regen *= m; if (p.vamp) p.vamp *= m; };
  // 全部淨增益：只加好處，不拿別的換
  const VAR = {
    wide: { n: '擴散', d: '範圍 +40%（揮砍、直線的距離 +25%）、傷害 +10%', ok: p => p.k && (p.r || p.arc || p.width || p.n > 1 || p.scatter), f: p => { p.k *= 1.1; if (p.r) p.r *= 1.4; if (p.arc) p.arc = Math.min(6.28, p.arc * 1.4); if (p.width) p.width *= 1.4; if (p.n > 1) p.n = Math.ceil(p.n * 1.4); if (p.scatter) p.scatter *= 1.4; if (p.spread) p.spread *= 1.3; if (p.range && (p.arc || p.width)) p.range *= 1.25; } },
    focus: { n: '凝聚', d: '傷害 +35%', ok: p => !!p.k, f: p => { p.k *= 1.35; } },
    multi: { n: '連擊', d: '多一段、每一段傷害不變', ok: p => p.k && (p.hits || p.waves || p.burst), f: p => { if (p.hits) p.hits += 1; else if (p.waves) p.waves += 1; else p.burst += 1; } },
    burn: { n: '焚燒', d: '打中的會燃燒、傷害 +5%', ok: p => p.k && !p.burn, f: p => { p.k *= 1.05; p.burn = 1; } },
    chill: { n: '冰凍', d: '打中的減速 2 秒、傷害 +5%', ok: p => p.k && !p.slow, f: p => { p.k *= 1.05; p.slow = 2; } },
    stun: { n: '震盪', d: '打中的暈 0.6 秒、傷害 +5%', ok: p => p.k && !(p.stun >= 0.6), f: p => { p.k *= 1.05; p.stun = Math.max(p.stun || 0, 0.6); } },
    leech: { n: '吸血', d: '這一招吸血系數 +100', ok: p => !!p.k, f: p => { p.vamp = (p.vamp || 0) + 0.05; } },
    swift: { n: '迅捷', d: '冷卻 −30%', ok: () => true, cd: 0.7, f: p => { } },
    long: { n: '持久', d: '持續時間 +50%', ok: p => !!p.t, f: p => { p.t *= 1.5; } },
    strong: { n: '強化', d: '效果 +30%', ok: p => p.t && (p.dmg > 1 || p.crit || p.def || p.speed > 1 || p.regen || p.vamp), f: p => { scaleBuff(p, 1.3); } },
    big: { n: '大治療', d: '回復 +40%、冷卻 −10%', ok: p => !!(p.pct || p.allies), cd: 0.9, f: p => { if (p.pct) p.pct *= 1.4; if (p.allies) p.allies *= 1.4; } },
    ward: { n: '護盾', d: '多給 20% 生命的護盾（回復量不變）', ok: p => !!(p.pct || p.allies || p.shield), f: p => { p.shield = Math.max(p.shield || 0, 0.2); } }
  };
  const NEED = 3;   // 熟練度 ★3 以上才能選變化
  const hash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  const hue = c => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '')); if (!m) return -1; const n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 0.12) return -1; let h = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn); h *= 60; return h < 0 ? h + 360 : h; };
  const params = L => { if (!L) return {}; if (L.type === 'combo') return Object.assign({}, ...(L.p.parts || []).map(x => x[1] || {})); return L.p || {}; };
  // 這一招有哪三種變化
  const cache = {};
  R.skillVariants = id => {
    if (cache[id]) return cache[id];
    const L = R.SKILL_LIB && R.SKILL_LIB[id];
    if (!L) return (cache[id] = R.SKILLS && R.SKILLS[id] ? ['swift'] : []);
    const p = params(L), t = L.type === 'combo' ? ((L.p.parts || []).find(x => !['buff', 'guard'].includes(x[0])) || [L.type])[0] : L.type;
    let cand;
    if (t === 'buff') cand = ['long', 'strong', 'swift'];
    else if (t === 'heal' || t === 'revive') cand = ['big', 'ward', 'swift'];
    else if (t === 'pet') cand = ['wide', 'focus', 'swift'];
    else if (p.k) { const h = hue(p.color), el = h >= 0 && (h < 45 || h > 330) ? 'burn' : h >= 170 && h <= 260 ? 'chill' : 'stun'; cand = ['wide', 'focus', 'multi', el, 'leech', 'swift']; }
    else cand = ['long', 'swift'];
    cand = cand.filter(k => VAR[k] && (VAR[k].ok(p) || k === 'swift'));
    if (cand.length > 3) { const h = hash(id), keep = cand.slice(); const out = []; for (let i = 0; i < 3; i++) { out.push(keep.splice((h >> (i * 4)) % keep.length, 1)[0]); } cand = out.sort((a, b) => Object.keys(VAR).indexOf(a) - Object.keys(VAR).indexOf(b)); }
    return (cache[id] = cand.slice(0, 3));
  };
  R.SKILL_VARIANTS = VAR;
  const rankOf = id => (R.skillRank ? R.skillRank(id) : 0);
  const unlocked = id => rankOf(id) >= NEED;
  const chosen = id => {
    if (!id || !unlocked(id)) return null;
    const s = S(), v = s && s.skillVar && s.skillVar[id];
    return v && VAR[v] && R.skillVariants(id).includes(v) ? v : null;
  };
  R.skillVarOf = chosen;
  R.skillVarNeed = NEED;

  // ---------- 放技能的時候改參數 ----------
  const T = R.SKILL_TYPES;
  if (T) Object.keys(T).forEach(k => {
    const f = T[k];
    T[k] = (s, P, w, pw) => {
      try {
        const id = s && s._id ? String(s._id).split(':')[0] : null, v = id && chosen(id);
        if (v && VAR[v].f && !(s && s._var) && (v === 'swift' || VAR[v].ok(s))) { s = Object.assign({}, s, { _var: v }); VAR[v].f(s); }
      } catch (e) { }
      return f(s, P, w, pw);
    };
  });
  // 冷卻：放出去之後乘
  const cdOf = (P, i) => (i === 0 ? P.skillCd || 0 : (P.skCd && P.skCd[i]) || 0);
  const setCd = (P, i, v) => { if (i === 0) P.skillCd = v; else { P.skCd = P.skCd || []; P.skCd[i] = v; } };
  const wrapCast = (f, slotOf) => (...a) => {
    const P = W().P; if (!P) return f(...a);
    const i = slotOf(a), c0 = cdOf(P, i), r = f(...a), c1 = cdOf(P, i);
    if (c1 > c0 + 0.01) { const id = i === 0 ? P.skill : R.slotSkill ? R.slotSkill(P, i) : null, v = id && chosen(id); if (v && VAR[v].cd) setCd(P, i, c1 * VAR[v].cd); }
    return r;
  };
  if (R.castSlot) R.castSlot = wrapCast(R.castSlot, a => a[0] || 0);
  if (R.useSkill) R.useSkill = wrapCast(R.useSkill, () => 0);

  // ---------- 技能書：變化選項放在每一張技能卡片的最下面（2026-10-08 作者：不要放在上面換技能的地方） ----------
  const css = document.createElement('style');
  css.textContent = '.sv-vars{display:flex;flex-wrap:wrap;align-items:center;gap:3px}'
    + '.sv-vars .sv-h{font-size:11px;color:var(--gold);margin-right:2px}'
    + '.sv-vars button{font-size:11px;padding:2px 7px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:inherit;cursor:pointer;line-height:1.3}'
    + '.sv-vars button.on{outline:2px solid #E8C04A;background:rgba(232,192,74,.2);border-color:transparent}'
    + '.sv-vars .sv-lock{font-size:11px;opacity:.7;line-height:1.35}'
    + '.sb-foot .sv-d{font-size:11.5px;line-height:1.4;color:var(--dim)}.sb-foot .sv-d b{color:#E8D8B0;font-weight:700}';
  document.head.appendChild(css);
  const fill = (foot, id) => {
    if (!id || !R.SKILLS[id]) return;
    const vs = R.skillVariants(id); if (!vs.length) return;
    let box = foot.querySelector('.sv-box');
    if (!box) { box = document.createElement('div'); box.className = 'sv-box'; foot.insertBefore(box, foot.firstChild); }
    const cur = chosen(id), r = rankOf(id);
    if (!unlocked(id)) { box.innerHTML = '<div class="sv-vars"><span class="sv-lock">變化（這招練到 ★' + NEED + ' 才能選，目前 ★' + r + '）：' + vs.map(v => esc(VAR[v].n)).join('・') + '</span></div>'; return; }
    box.innerHTML = '<div class="sv-vars"><span class="sv-h">變化</span><button type="button" class="' + (cur ? '' : 'on') + '" data-v="">原版</button>'
      + vs.map(v => '<button type="button" class="' + (cur === v ? 'on' : '') + '" data-v="' + v + '" title="' + esc(VAR[v].d) + '">' + esc(VAR[v].n) + '</button>').join('') + '</div>'
      + '<div class="sv-d">' + (cur ? '<b>' + esc(VAR[cur].n) + '</b>：' + esc(VAR[cur].d) : '原版：不改這招。') + '</div>';
    box.querySelectorAll('[data-v]').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        const st = S(); st.skillVar = st.skillVar || {};
        if (b.dataset.v) st.skillVar[id] = b.dataset.v; else delete st.skillVar[id];
        R.save(); fill(foot, id);
      };
    });
  };
  (R.SB_FOOT = R.SB_FOOT || []).push(fill);
})(window.R);
