// 技能精簡（2026-10-08 作者：技能太多、同質性太高；高等反而比低等弱的刪掉；「直接幫我刪」）
// - 每個職業的基礎技能（內建 3 招＋技能書）從 18～21 招壓到 12 招左右：同一種「型」、同樣效果、可以同時帶的只留一招。
//   劇情教的技能（楚璐、雷諾、瀧教的 cr_／rn_／tk_）不算、也不刪。
// - 轉職路線裡同一條路線自己重複的也刪（覺醒招的小大兩版不算重複；恩特安路線的強化技是作者要求加的，不動）。
// - 名字重複的改名（同一個職業裡兩招同名）。
// - 高等反而比低等弱、這次留下來的：超頻、虛空斬、大法陣、安可加強。
// - 舊存檔：技能欄上被刪掉的招換成「併進去」的那一招（學得到的話），學不到就空出來（用預設）；熟練度轉給那一招（取比較高的）。
// 放在所有加技能的檔案後面（skillbook*.js、adv*.js、classes2b.js、skills3.js、entianplus.js、awakenbal.js、souyu.js 後面）。
(function (R) {
  const L = R.SKILL_LIB, SK = R.SKILLS, S = () => R.S; if (!L || !SK) return;
  // 刪掉的招 → 併進去的那一招
  const MERGE = {
    // 槍手
    g_double: 'g_slug', g_suppress: 'barrage', g_incendiary: 'g_overdrive', g_frag: 'flashbang', g_flare: 'g_mine', g_quick: 'g_overdrive',
    // 弓箭手
    a_quick: 'a_scatter', a_hail: 'a_skyrain', a_tumble: 'leap', a_venom: 'a_frost', a_mark: 'a_hawk', a_gale: 'a_pierce', ra_field: 'ra_blast',
    // 戰士
    w_cleave: 'w_rend', w_leap: 'w_bull', w_iron: 'w_bloodfight', w_cyclone: 'whirl', w_menace: 'warcry', w_taunt: 'w_bloodfight', on_cleave: 'on_rend',
    // 術士
    m_embers: 'fireball', m_flamethrower: 'm_flamewall', m_frostray: 'm_lance', m_thundercloud: 'm_starfall', m_stasis: 'frostnova', m_thunder: 'chain', wx_pulse: 'wx_shell',
    // 牧師
    p_ray: 'p_light', p_hymn: 'p_bless', p_purify: 'p_refuge', p_aegis: 'ward', p_judgment: 'smite', p_halo: 'p_hallow', p_seal: 'p_chain',
    // 刀客
    b_step: 'flash', b_wave: 'b_crescent', b_thousand: 'b_swallow', b_hundred: 'flurry', b_mist: 'b_after', b_gale: 'flash',
    // 騎士
    k_wall: 'guard', k_rally: 'k_vow', k_lancecharge: 'charge', k_domain: 'guard', k_judge: 'charge', k_bulwark: 'guard',
    // 武術家
    m_kick: 'm_flurry', m_dragon: 'm_palm', m_leap: 'm_meteor',
    // 吟遊詩人
    bd_echo: 'bd_chord', bd_silence: 'bd_lullaby', bd_discord: 'bd_sonata', ai_aria: 'ai_hymn',
    // 召喚師
    sn_wolves: 'sn_legion', sn_hound: 'sn_dog', sn_colossus: 'sn_titan', ss_guard: 'ss_shiki', tm_mimic: 'tm_tame', tm_whistle: 'tm_herd',
    // 術陣師
    ry_chain: 'ry_bind', ry_eternal: 'ry_fire', ry_frost: 'ry_seal', ga_quad: 'ga_cascade', ga_twin: 'ga_cascade', wd_pillars: 'wd_ward', ed_vortex: 'ed_loop', ed_trap: 'ed_perma',
    // 附魔師
    en_pierce: 'en_rune', en_whirl: 'en_burst', en_quake: 'en_rune', en_overload: 'en_masterwork', rs_glyph: 'rs_engrave',
    // 符卷師
    sc_fan: 'sc_volley', sc_earth: 'sc_fire', sc_storm: 'sc_thunder', sl_ward: 'sl_wall'
  };
  R.SKILL_MERGED = MERGE;
  // 不刪：職業預設、預設欄位、轉職路線的招牌技能（轉職直接給的）、有覺醒版的
  const KEEP = new Set(); Object.keys(R.CLASSES || {}).forEach(c => { const C = R.CLASSES[c]; if (C && C.skill) KEEP.add(C.skill); (R.SKILL_SLOTS[c] || []).forEach(id => KEEP.add(id)); (R.ADV && R.ADV[c] || []).forEach(a => a && a.skill && KEEP.add(a.skill)); });
  const cut = Object.keys(MERGE).filter(id => L[id] && !KEEP.has(id) && !/_aw$/.test(id) && !L[id + '_aw']);
  Object.keys(MERGE).forEach(id => { if (!cut.includes(id)) delete MERGE[id]; });
  cut.forEach(id => { delete L[id]; delete SK[id]; });
  // 名字重複：同一個職業兩招同名
  const RENAME = { sp2_archer_2: '鷹眼・極', sp2_blade_2: '明鏡止水・極', sp2_monk_0: '百裂拳・極', sp2_priest_2: '天譴', sp2_bard_1: '鎮魂歌', sp2_arraymage_0: '九天陣', et_master: '恩特安的傑作', ss_shiki: '護身式神', wd_barrier: '守護結界' };
  Object.keys(RENAME).forEach(id => { if (L[id]) L[id].name = RENAME[id]; if (SK[id]) SK[id].name = RENAME[id]; });
  // 高等反而比低等弱的：加強
  const BUFF = {
    g_overdrive: [{ t: 8, dmg: 1.3, speed: 1.15 }, 16, '讓槍機超頻運轉：8 秒內傷害 +30%、移動 +15%。'],
    b_void: [{ k: 6, crit: 1 }, 16, '收刀靜止 0.7 秒，斬開前方 12 公尺的空間，必定暴擊。'],
    ry_great: [{ k: 6, r: 5.5 }, 16, '準心處畫一個巨大的法陣，0.9 秒後整片爆開。'],
    bd_encore: [{ pct: 0.4, allies: 0.4, mp: 0.4 }, 20, '觀眾喊安可：你和隊友回復 40% 生命，你再回復 40% 魔力。（效果隨魔力上限變強）']
  };
  Object.keys(BUFF).forEach(id => { const [p, cd, d] = BUFF[id]; if (!L[id]) return; Object.assign(L[id].p, p); L[id].cd = cd; if (SK[id]) Object.assign(SK[id], { cd, desc: d }); });

  // ---------- 舊存檔：技能欄、熟練度 ----------
  const learnable = (s, cls, id) => {
    if (!id || !SK[id]) return false;
    const C = R.CLASSES[cls]; if (C && (C.skill === id || (R.SKILL_SLOTS[cls] || []).includes(id))) return true;
    const l = L[id], st = s.classes && s.classes[cls]; if (!l || !st) return false;
    return l.cls === cls && (st.lv || 1) >= (l.lv || 1) && (!l.adv || l.adv === st.adv);
  };
  const fix = s => {
    if (!s || !s.classes) return s;
    if (s.loadout) Object.keys(s.loadout).forEach(cls => {
      const lo = s.loadout[cls]; if (!Array.isArray(lo)) return;
      s.loadout[cls] = lo.map(id => { if (!id || SK[id] || !MERGE[id]) return id; const t = MERGE[id]; return learnable(s, cls, t) && !lo.includes(t) ? t : null; });
    });
    Object.keys(s.classes).forEach(cls => {
      const sp = s.classes[cls] && s.classes[cls].sp; if (!sp) return;
      ['u', 'r'].forEach(k => { const m = sp[k]; if (!m) return; Object.keys(m).forEach(id => { if (SK[id] || !MERGE[id]) return; const t = MERGE[id]; m[t] = Math.max(m[t] || 0, m[id] || 0); delete m[id]; }); });
    });
    if (s.skillVar) Object.keys(s.skillVar).forEach(id => { if (!SK[id] && MERGE[id]) delete s.skillVar[id]; });
    return s;
  };
  const mg0 = R.migrate;
  R.migrate = s => fix(mg0 ? mg0(s) : s);
  if (S()) fix(S());
})(window.R);
