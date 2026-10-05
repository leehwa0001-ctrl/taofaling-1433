// 技能變化（作者 2026-10-05：都做——每一招 2～3 種變化在技能書裡選，同一個職業玩出很多種組合）
// - 技能書（skillbook.js 的「型」組成的技能）每一招有三種變化，照這招做的事挑：
//   打人的招：擴散（範圍 +40%、傷害 −20%）、凝聚（傷害 +35%、範圍 −30%）、連擊（多一段、每段 −25%）、
//            焚燒／冰凍／震盪（附加燃燒、減速 2 秒或暈 0.6 秒，照招式的顏色挑一種；傷害 −10%～15%）、吸血（這招吸血系數 +100、傷害 −10%）、迅捷（冷卻 −30%、傷害 −20%）。
//   增益：持久（持續 +50%、效果 −20%）、強化（效果 +30%、持續 −30%）、迅捷。治療：大治療（回復 +40%、冷卻 +30%）、護盾（多 15% 護盾、回復 −30%）、迅捷。
//   召喚：擴散（多召喚、每隻 −20%）、凝聚（少一點、每隻更強）、迅捷。
//   同一招固定是哪三種（照技能的編號算），每一招都可能不一樣。職業原本的招（不是技能書的）只有「迅捷」。
// - 存在 R.S.skillVar[技能編號]；放技能的時候改那一次的參數（包 R.SKILL_TYPES 的每一種「型」，組合技的每一段也會改），冷卻在放出去之後乘。
// - 技能書上面（技能格下面）多一段「技能變化」：裝著的五招，每一招點一種（原版／三種變化）。
// 放在所有加技能、技能「型」的檔案後面（skillbal2.js、buildfx.js 後面）。
(function (R) {
  const W = () => R.W, S = () => R.S, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const scaleBuff = (p, m) => { if (p.dmg > 1) p.dmg = 1 + (p.dmg - 1) * m; if (p.crit) p.crit *= m; if (p.def > 0) p.def *= m; if (p.speed > 1) p.speed = 1 + (p.speed - 1) * m; if (p.regen) p.regen *= m; if (p.vamp) p.vamp *= m; };
  const VAR = {
    wide: { n: '擴散', d: '範圍 +40%（揮砍、直線的距離 +25%）、傷害 −20%', ok: p => p.k && (p.r || p.arc || p.width || p.n > 1 || p.scatter), f: p => { p.k *= 0.8; if (p.r) p.r *= 1.4; if (p.arc) p.arc = Math.min(6.28, p.arc * 1.4); if (p.width) p.width *= 1.4; if (p.n > 1) p.n = Math.ceil(p.n * 1.4); if (p.scatter) p.scatter *= 1.4; if (p.spread) p.spread *= 1.3; if (p.range && (p.arc || p.width)) p.range *= 1.25; } },
    focus: { n: '凝聚', d: '傷害 +35%、範圍 −30%', ok: p => !!p.k, f: p => { p.k *= 1.35; if (p.r) p.r *= 0.7; if (p.arc) p.arc *= 0.7; if (p.width) p.width *= 0.7; if (p.n > 1) p.n = Math.max(1, Math.round(p.n * 0.6)); if (p.scatter) p.scatter *= 0.6; } },
    multi: { n: '連擊', d: '多一段、每段傷害 −25%', ok: p => p.k && (p.hits || p.waves || p.burst), f: p => { p.k *= 0.75; if (p.hits) p.hits += 1; else if (p.waves) p.waves += 1; else p.burst += 1; } },
    burn: { n: '焚燒', d: '打中的會燃燒、傷害 −10%', ok: p => p.k && !p.burn, f: p => { p.k *= 0.9; p.burn = 1; } },
    chill: { n: '冰凍', d: '打中的減速 2 秒、傷害 −10%', ok: p => p.k && !p.slow, f: p => { p.k *= 0.9; p.slow = 2; } },
    stun: { n: '震盪', d: '打中的暈 0.6 秒、傷害 −15%', ok: p => p.k && !(p.stun >= 0.6), f: p => { p.k *= 0.85; p.stun = Math.max(p.stun || 0, 0.6); } },
    leech: { n: '吸血', d: '這一招吸血系數 +100、傷害 −10%', ok: p => !!p.k, f: p => { p.k *= 0.9; p.vamp = (p.vamp || 0) + 0.05; } },
    swift: { n: '迅捷', d: '冷卻 −30%、效果 −20%', ok: () => true, cd: 0.7, f: p => { if (p.k) p.k *= 0.8; else if (p.t) p.t *= 0.8; if (p.pct) p.pct *= 0.8; } },
    long: { n: '持久', d: '持續時間 +50%、效果 −20%', ok: p => !!p.t, f: p => { p.t *= 1.5; scaleBuff(p, 0.8); } },
    strong: { n: '強化', d: '效果 +30%、持續時間 −30%', ok: p => p.t && (p.dmg > 1 || p.crit || p.def || p.speed > 1 || p.regen || p.vamp), f: p => { p.t *= 0.7; scaleBuff(p, 1.3); } },
    big: { n: '大治療', d: '回復 +40%、冷卻 +30%', ok: p => !!(p.pct || p.allies), cd: 1.3, f: p => { if (p.pct) p.pct *= 1.4; if (p.allies) p.allies *= 1.4; } },
    ward: { n: '護盾', d: '多給 15% 生命的護盾、回復 −30%', ok: p => !!(p.pct || p.allies), f: p => { if (p.pct) p.pct *= 0.7; if (p.allies) p.allies *= 0.7; p.shield = Math.max(p.shield || 0, 0.15); } }
  };
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
    cand = cand.filter(k => VAR[k] && VAR[k].ok(p) || k === 'swift');
    if (cand.length > 3) { const h = hash(id), keep = cand.slice(); const out = []; for (let i = 0; i < 3; i++) { out.push(keep.splice((h >> (i * 4)) % keep.length, 1)[0]); } cand = out.sort((a, b) => Object.keys(VAR).indexOf(a) - Object.keys(VAR).indexOf(b)); }
    return (cache[id] = cand.slice(0, 3));
  };
  R.SKILL_VARIANTS = VAR;
  const chosen = id => { const s = S(), v = s && s.skillVar && s.skillVar[id]; return v && VAR[v] && R.skillVariants(id).includes(v) ? v : null; };
  R.skillVarOf = chosen;

  // ---------- 放技能的時候改參數 ----------
  const T = R.SKILL_TYPES;
  if (T) Object.keys(T).forEach(k => {
    const f = T[k];
    T[k] = (s, P, w, pw) => {
      try {
        const id = s && s._id ? String(s._id).split(':')[0] : null, v = id && chosen(id);
        if (v && VAR[v].f && !(s && s._var) && (v === 'swift' || VAR[v].ok(s))) { s = Object.assign({}, s, { _var: v }); VAR[v].f(s); }   // 組合技：只改用得上的那幾段
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

  // ---------- 技能書：技能變化 ----------
  const css = document.createElement('style');
  css.textContent = '.sv-box{margin:10px 0;padding:8px;border:1px solid var(--line);border-radius:10px;background:rgba(0,0,0,.18)}.sv-box h3{margin:0 0 4px}'
    + '.sv-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0}.sv-row b{min-width:9em}.sv-row button{font-size:12px}.sv-row button.on{outline:2px solid #E8C04A;background:rgba(232,192,74,.18)}';
  document.head.appendChild(css);
  const html = () => {
    const s = S(), cls = s.cls, P0 = { cls, skill: null }, lo = R.loadoutOf ? R.loadoutOf(cls) : [];
    const st = s.classes[cls], first = st.adv && R.ADV[cls] ? (R.ADV[cls].find(a => a.id === st.adv) || {}).skill : R.CLASSES[cls].skill;
    const ids = [first].concat(lo.slice(1)).filter(Boolean).filter((id, i, a) => a.indexOf(id) === i && R.SKILLS[id]);
    return '<div class="sv-box"><h3>技能變化</h3><p class="note">裝著的每一招選一種變化（原版或三種之一），改的是這一招的範圍、傷害、冷卻、附加效果。換技能、換變化都只能在城裡。</p>'
      + ids.map(id => { const vs = R.skillVariants(id), cur = chosen(id); if (!vs.length) return ''; return '<div class="sv-row"><b>' + esc(R.SKILLS[id].name) + '</b><button type="button" class="mini' + (cur ? '' : ' on') + '" data-sv="' + id + '" data-v="">原版</button>' + vs.map(v => '<button type="button" class="mini' + (cur === v ? ' on' : '') + '" data-sv="' + id + '" data-v="' + v + '" title="' + esc(VAR[v].d) + '">' + esc(VAR[v].n) + '<small>（' + esc(VAR[v].d) + '）</small></button>').join('') + '</div>'; }).join('')
      + '</div>';
  };
  const inject = () => {
    const slots = document.querySelector('.sb-slots'); if (!slots || !S()) return;
    const host = slots.parentNode; if (host.querySelector('.sv-box')) return;
    const box = document.createElement('div'); box.innerHTML = html(); const el = box.firstChild;
    const rs = host.querySelector('[data-reset]'), after = rs && rs.closest('.row') !== slots ? (rs.closest('.row') || rs) : slots;   // 放在技能格、恢復預設的下面（不要埋在整串技能的最後面）
    host.insertBefore(el, after.nextSibling);
    el.querySelectorAll('[data-sv]').forEach(b => { b.onclick = () => { const s = S(); s.skillVar = s.skillVar || {}; if (b.dataset.v) s.skillVar[b.dataset.sv] = b.dataset.v; else delete s.skillVar[b.dataset.sv]; R.save(); el.remove(); inject(); }; });
  };
  setInterval(() => { try { inject(); } catch (e) { } }, 400);
})(window.R);
