// 技能書：每個職業十幾種技能、轉職後每條路線再多三種（含原本的轉職技能），三格技能（R／右鍵、3、4）都可以自己換。
// - 學會：照職業等級（轉職的技能要走那條路線）。換技能：城裡的暫停選單、公會的「武器登記」旁邊。遺跡裡不能換。
// - 原本的技能（combat.js 的 R.useSkill、skills.js 的十四個）照舊；新技能用下面的幾種「型」組出來（射擊、範圍、落點、直線、揮砍、衝刺、瞬移、強化、治療……）。
// - 存在 R.S.loadout[職業] = [第一格, 第二格, 第三格]（null＝預設）。
// - 說法照設定的施法派別：槍手是科技派（刻了咒文的魔力鋼彈頭）、術士念咒文、牧師祈禱、神官用結界和祓。
(function (R) {
  const W = () => R.W, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const later = (f, ms) => { const run = W().run, sc = W().scene; setTimeout(() => { const w = W(); if (w.run === run && w.scene === sc && w.P && !w.P.dead && run && !run.done) f(); }, ms); };
  const power = ws => (ws.dmg * (ws.pellets > 1 ? ws.pellets : 1) * (ws.hits || 1) * ws.rate) / 2;
  const KIND = { gunner: 'bullet', archer: 'arrow', mage: 'orb', priest: 'holy', blade: 'eorb', warrior: 'eorb', knight: 'eorb', monk: 'eorb' };

  // ---------- 新技能：[id, 名字, 職業, 等級, 冷卻, 魔力, 型, 參數, 說明, 轉職路線] ----------
  const NEW = [
    // 槍手
    ['g_double', '雙發點射', 'gunner', 2, 4, 6, 'shots', { burst: 2, gap: 90, k: 1.1, sp: 34 }, '連扣兩發刻了咒文的魔力鋼彈頭，每一發都比平常重。'],
    ['g_ricochet', '跳彈', 'gunner', 4, 7, 10, 'shots', { n: 5, spread: 0.5, k: 0.7, pierce: 1 }, '朝前方扇形打出五發跳彈，每一發可以穿過一隻敵人。'],
    ['g_smoke', '煙幕彈', 'gunner', 5, 12, 10, 'at', { range: 8, r: 3.2, k: 0.3, slow: 3, invis: 1.5, fx: 'poof', color: '#B8B8C0' }, '丟出煙幕：範圍內的敵人變慢，你隱身 1.5 秒。'],
    ['g_incendiary', '燒夷彈頭', 'gunner', 8, 14, 14, 'buff', { t: 8, burn: 1, color: '#FF7A3A' }, '換上燒夷彈頭：8 秒內打中的敵人都會燃燒。'],
    ['g_mine', '感應地雷', 'gunner', 10, 9, 12, 'zone', { zone: 'trap', range: 6, r: 1.3, life: 25, k: 3 }, '在準心處埋一顆刻了感應咒文的地雷：踩到的敵人受重傷、被定住。'],
    ['g_overdrive', '超頻', 'gunner', 12, 18, 16, 'buff', { t: 6, dmg: 1.2, speed: 1.15, color: '#FFE08A' }, '讓槍機超頻運轉：6 秒內傷害 +20%、移動 +15%。'],
    ['g_rail', '魔導貫穿彈', 'gunner', 15, 11, 20, 'line', { len: 16, width: 0.6, k: 3.2, delay: 350, color: '#9AD8FF' }, '蓄力 0.35 秒，射出貫穿一直線的魔導彈。'],
    // 弓箭手
    ['a_quick', '速射', 'archer', 2, 4, 6, 'shots', { burst: 3, gap: 110, k: 0.8 }, '連射三箭。'],
    ['a_scatter', '散射', 'archer', 4, 7, 10, 'shots', { n: 7, spread: 0.75, k: 0.6 }, '一次搭上七支箭，扇形射出去。'],
    ['a_frost', '霜晶箭頭', 'archer', 5, 8, 12, 'shots', { k: 1.6, root: 1.2, kind: 'cold', sp: 30 }, '射出霜晶箭頭的箭：打中的敵人被凍在原地 1.2 秒。'],
    ['a_hail', '連綿箭雨', 'archer', 8, 12, 18, 'at', { range: 12, r: 3, k: 0.6, waves: 5, gap: 250, fx: 'rain' }, '朝準心處連續拋射，五波箭雨。'],
    ['a_mark', '獵人標記', 'archer', 10, 10, 10, 'mark', { range: 12, r: 2.6, t: 8 }, '標記準心附近的獵物：8 秒內受到的傷害 +30%。'],
    ['a_hawk', '鷹眼', 'archer', 12, 16, 12, 'buff', { t: 8, crit: 0.25, color: '#E8D8B8' }, '集中精神：8 秒內暴擊率 +25%。'],
    ['a_tumble', '側滾射擊', 'archer', 15, 6, 8, 'dash', { side: 1, len: 3.5, dur: 0.22, then: { type: 'shots', n: 2, spread: 0.12, k: 1.2 } }, '往旁邊滾開（滾的時候不會受傷），同時射出兩箭。'],
    // 戰士
    ['w_cleave', '劈砍', 'warrior', 2, 4, 6, 'arc', { range: 3, arc: 2.2, k: 1.6, kb: 1.5 }, '雙手掄起武器，往前大大劈一刀。'],
    ['w_leap', '躍擊', 'warrior', 4, 9, 12, 'dash', { len: 5, dur: 0.25, end: { r: 2.6, k: 1.8, stun: 0.6, color: '#C8B08A' } }, '往前躍出 5 公尺，落地砸出震波，震到的敵人暈眩。'],
    ['w_iron', '鐵壁', 'warrior', 5, 14, 10, 'buff', { t: 5, def: 0.35, color: '#AEB6C0' }, '咬緊牙關：5 秒內受到的傷害 −35%。'],
    ['w_rend', '撕裂', 'warrior', 8, 7, 10, 'arc', { range: 3, arc: 1.8, k: 1.2, curse: 5 }, '砍出撕裂的傷口：被砍到的敵人 5 秒內受到的傷害 +30%。'],
    ['w_cyclone', '大迴旋', 'warrior', 10, 10, 14, 'nova', { r: 3.4, k: 1.0, kb: 2, waves: 3, gap: 250, color: '#FF8A6A' }, '連轉三圈，砍到身邊所有的敵人並擊退。'],
    ['w_taunt', '挑釁', 'warrior', 12, 12, 8, 'buff', { t: 4, def: 0.25, taunt: 4, color: '#E8603A' }, '大吼一聲：吸引周圍敵人攻擊你，4 秒內你受到的傷害 −25%。'],
    ['w_execute', '斬首', 'warrior', 15, 9, 14, 'line', { len: 4, width: 1.2, k: 2.2, execute: 1, color: '#FF5A4A' }, '往前重重一斬；生命剩三成以下的敵人吃兩倍傷害。'],
    // 術士
    ['m_bolt', '魔力飛彈', 'mage', 2, 3, 8, 'shots', { n: 3, spread: 0.2, k: 0.8, homing: 4, sp: 18, life: 1.4 }, '念一句短咒，射出三發會追蹤的魔力飛彈。'],
    ['m_lance', '冰槍', 'mage', 4, 6, 14, 'shots', { k: 2.2, pierce: 3, root: 0.8, kind: 'cold', sp: 26 }, '凝出一支冰槍：穿過三隻敵人，命中的敵人會短暫凍結。'],
    ['m_flamewall', '火牆', 'mage', 5, 10, 20, 'line', { len: 8, width: 1.1, k: 1.2, burn: 1, color: '#FF7A3A' }, '在面前燒出一道火牆：直線上的敵人受傷並燃燒。'],
    ['m_gravity', '重力井', 'mage', 8, 12, 24, 'pull', { range: 11, r: 4.5, t: 1.6, k: 0.35 }, '在準心處開一個重力井：把周圍的敵人吸過去，持續受傷。'],
    ['m_blink', '閃現', 'mage', 10, 8, 12, 'blink', { range: 6, end: { r: 2, k: 0.8, slow: 2, color: '#B89AFF' } }, '瞬間移動到準心方向 6 公尺，落點炸開一圈寒氣。'],
    ['m_thunder', '落雷', 'mage', 12, 9, 22, 'at', { range: 12, r: 2.2, k: 2.0, stun: 0.6, waves: 3, gap: 200, scatter: 2.5, fx: 'pillar', color: '#BFE8FF' }, '念出雷咒：準心附近連落三道雷。'],
    ['m_manashield', '魔力護盾', 'mage', 15, 16, 20, 'heal', { shield: 0.3, color: '#B89AFF' }, '把魔力化成護盾：吸收最大生命 30% 的傷害。'],
    // 牧師
    ['p_light', '光彈', 'priest', 2, 3, 8, 'shots', { k: 1.4, homing: 3, sp: 20, kind: 'holy' }, '祈禱，射出一發會追蹤的光彈。'],
    ['p_bless', '祝福', 'priest', 4, 14, 16, 'buff', { t: 8, dmg: 1.15, regen: 0.015, color: '#FFE8A0' }, '8 秒內傷害 +15%，每秒回復 1.5% 生命。'],
    ['p_purify', '淨化', 'priest', 5, 10, 14, 'heal', { pct: 0.15, cleanse: 1, nova: { r: 3, k: 0.8, color: '#FFE8A0' } }, '回復 15% 生命、解除變慢和看不清楚，並灼傷身邊的敵人。'],
    ['p_judgment', '審判', 'priest', 8, 10, 20, 'at', { range: 10, r: 3, k: 3, delay: 600, stun: 1, fx: 'pillar', color: '#FFE8A0' }, '0.6 秒後在準心處落下審判的光柱，範圍內的敵人暈眩。'],
    ['p_prayer', '群體治療', 'priest', 10, 18, 28, 'heal', { pct: 0.3, allies: 0.3 }, '你和身邊的隊友回復 30% 生命。'],
    ['p_halo', '光環', 'priest', 12, 16, 18, 'zone', { zone: 'sanct', self: 1, r: 3.5, life: 5, k: 0.3 }, '在腳下展開光環 5 秒：站在裡面回復生命，灼傷進來的敵人。'],
    ['p_seal', '聖印', 'priest', 15, 12, 16, 'mark', { range: 10, r: 3, t: 6, stun: 0.5 }, '在準心處烙下聖印：敵人暈眩一下，6 秒內受到的傷害 +30%。'],
    // 刀客
    ['b_draw', '拔刀', 'blade', 2, 4, 6, 'line', { len: 3.5, width: 0.8, k: 1.8, crit: 0.5, color: '#FFFFFF' }, '拔刀斬出一直線，五成機率暴擊。'],
    ['b_crescent', '月牙斬', 'blade', 4, 7, 10, 'shots', { k: 1.4, pierce: 3, kind: 'hama', sp: 24, life: 0.5 }, '把刀氣斬出去：飛行的斬擊穿過三隻敵人。'],
    ['b_swallow', '燕返', 'blade', 5, 8, 10, 'arc', { range: 2.8, arc: 2.4, k: 1.3, hits: 2, gap: 140, back: 1 }, '往前斬一刀，馬上反手往後再斬一刀。'],
    ['b_after', '殘影', 'blade', 8, 10, 10, 'blink', { back: 1, range: 4, invis: 1.5 }, '往後撤，只留下殘影：隱身 1.5 秒。'],
    ['b_thousand', '千刃', 'blade', 10, 12, 18, 'arc', { range: 2.6, arc: 6.28, k: 0.6, hits: 6, gap: 90 }, '原地連斬六刀，砍到身邊所有的敵人。'],
    ['b_mirror', '明鏡', 'blade', 12, 16, 10, 'buff', { t: 6, crit: 0.3, dmg: 1.1, color: '#FFFFFF' }, '心靜如鏡：6 秒內暴擊率 +30%、傷害 +10%。'],
    ['b_gale', '疾風突', 'blade', 15, 8, 14, 'dash', { len: 8, dur: 0.2, k: 2.4, end: { r: 2.2, k: 1.0, color: '#BFE8FF' } }, '一口氣突進 8 公尺，斬過路上的敵人，停下來再補一圈。'],
    // 騎士
    ['k_thrust', '突刺', 'knight', 2, 4, 6, 'line', { len: 4, width: 0.6, k: 1.8, kb: 1, color: '#D8DEE6' }, '往前一記長長的突刺。'],
    ['k_wall', '盾牆', 'knight', 4, 12, 10, 'buff', { t: 3, def: 0.5, taunt: 3, color: '#C9A13A' }, '舉盾站穩：3 秒內受到的傷害 −50%，周圍的敵人改打你。'],
    ['k_rally', '鼓舞', 'knight', 5, 16, 12, 'heal', { pct: 0.1, allyShield: 0.2, buff: { t: 6, dmg: 1.15 } }, '回復 10% 生命，身邊隊友得到護盾；6 秒內傷害 +15%。'],
    ['k_sweep', '橫掃', 'knight', 8, 8, 12, 'arc', { range: 3.4, arc: 2.6, k: 1.4, kb: 2.5, stun: 0.4 }, '用盾和劍橫掃一大片，把敵人推開。'],
    ['k_bulwark', '不動', 'knight', 10, 18, 14, 'buff', { t: 4, def: 0.6, regen: 0.02, speed: 0.6, color: '#C9A13A' }, '4 秒內受到的傷害 −60%、每秒回復 2% 生命，但走得慢。'],
    ['k_judge', '制裁', 'knight', 12, 10, 16, 'dash', { len: 5, dur: 0.25, k: 2, stun: 1, end: { r: 2.6, k: 1.2, color: '#FFE8A0' } }, '衝上去撞暈敵人，落地再震一圈。'],
    ['k_vow', '誓約', 'knight', 15, 20, 20, 'heal', { pct: 0.25, shield: 0.25 }, '回復 25% 生命，並得到吸收 25% 生命的護盾。'],
    // ---------- 轉職路線的技能 ----------
    ['s_headshot', '爆頭', 'gunner', 8, 9, 14, 'line', { len: 18, width: 0.4, k: 5, crit: 1, delay: 600, color: '#FFE08A' }, '瞄準 0.6 秒，射出必定暴擊的一槍。', 'sniper'],
    ['s_camo', '偽裝', 'gunner', 14, 16, 12, 'buff', { t: 4, crit: 0.3, invis: 3, color: '#6A7A5A' }, '披上偽裝隱身 3 秒；4 秒內暴擊率 +30%。', 'sniper'],
    ['mg_storm', '元素風暴', 'gunner', 8, 11, 20, 'shots', { n: 9, spread: 1.2, k: 0.8, elem: 'cycle' }, '一口氣打出九發元素彈：火、冰、雷輪流。', 'magigun'],
    ['mg_cannon', '魔導砲', 'gunner', 14, 12, 26, 'shots', { k: 4, kind: 'fire', sp: 16, radius: 3.5, life: 1.4 }, '射出一發巨大的魔導砲彈，打中就大範圍爆炸、燃燒。', 'magigun'],
    ['bo_cluster', '集束彈', 'gunner', 8, 10, 16, 'at', { range: 11, r: 2, k: 1.6, waves: 4, gap: 120, scatter: 2.5, fx: 'boom', color: '#FFB45A', aware: 3 }, '丟出會散開的集束彈：準心附近連炸四下（佩特拉會注意到）。', 'bomber'],
    ['bo_demo', '定向爆破', 'gunner', 14, 14, 20, 'line', { len: 7, width: 1.6, k: 3.5, kb: 2, color: '#FFB45A', aware: 4 }, '把爆裂核心的威力往前方集中炸出去（佩特拉會注意到）。', 'bomber'],
    ['ar_star', '星落', 'archer', 8, 12, 20, 'at', { range: 12, r: 1.6, k: 1.2, waves: 6, gap: 110, scatter: 3, fx: 'pillar', color: '#B89AFF' }, '射向天空的魔箭化成六道光落下。', 'arcane'],
    ['ar_barrage', '魔弓連射', 'archer', 14, 10, 18, 'shots', { burst: 6, gap: 80, k: 0.9, homing: 6 }, '連射六支會追蹤的魔箭。', 'arcane'],
    ['ra_net', '投網', 'archer', 8, 10, 12, 'at', { range: 9, r: 3, k: 0.3, root: 2.5, fx: 'ring', color: '#C8B888' }, '往準心丟出網子：範圍內的敵人被纏住 2.5 秒。', 'ranger'],
    ['ra_field', '陷阱陣', 'archer', 14, 14, 18, 'zone', { zone: 'trap', range: 8, r: 1.2, life: 25, k: 2, count: 3 }, '在準心附近一次布下三個捕獸夾。', 'ranger'],
    ['hm_seal', '破魔結印', 'archer', 8, 12, 18, 'nova', { r: 4.5, k: 2, stun: 1, color: '#FFFFFF' }, '結印：以自己為中心放出破魔之光，周圍的遺跡生物暈眩。', 'hama'],
    ['hm_volley', '破魔連矢', 'archer', 14, 10, 20, 'shots', { n: 3, spread: 0.3, k: 2, pierce: 99, kind: 'hama', sp: 34 }, '三支破魔矢一起射出，射穿直線上的一切。', 'hama'],
    ['bs_thirst', '嗜血', 'warrior', 8, 12, 10, 'buff', { t: 6, dmg: 1.2, vamp: 0.08, color: '#B8322A' }, '6 秒內傷害 +20%，打出去的傷害有 8% 變成生命。', 'berserker'],
    ['bs_rampage', '暴走', 'warrior', 14, 14, 16, 'arc', { range: 3.4, arc: 6.28, k: 1.3, hits: 4, gap: 160, kb: 1.5 }, '失去理智地亂砍四圈。', 'berserker'],
    ['gl_counter', '反擊架勢', 'warrior', 8, 8, 8, 'parry', { t: 0.8 }, '擺出架勢 0.8 秒：被遺跡生物打到會擋下，並反擊必定暴擊的一刀。', 'gladiator'],
    ['gl_finale', '終幕', 'warrior', 14, 14, 18, 'arc', { range: 3, arc: 2.4, k: 1.1, hits: 5, gap: 140, kb: 1 }, '鬥技場上的終幕連斬：五連擊。', 'gladiator'],
    ['in_breath', '吐納', 'monk', 8, 14, 0, 'heal', { pct: 0.1, mp: 0.3 }, '吐納遺跡裡飄散的魔力質：回復 30% 魔力、10% 生命。', 'inner'],
    ['in_palm', '崩拳', 'monk', 14, 9, 14, 'line', { len: 5, width: 1.2, k: 3, kb: 3, stun: 0.8, color: '#BFE8FF' }, '一拳把氣勁打成一直線，震退、震暈前方的敵人。', 'inner'],
    ['el_blizzard', '暴風雪', 'mage', 8, 14, 28, 'at', { range: 12, r: 3.5, k: 0.7, slow: 3, waves: 6, gap: 400, fx: 'poof', color: '#DDF2FF' }, '在準心處召來 2.4 秒的暴風雪：敵人持續受傷、變慢。', 'elementalist'],
    ['el_inferno', '煉獄', 'mage', 14, 16, 32, 'nova', { r: 5, k: 2.5, burn: 1, color: '#FF7A3A' }, '以自己為中心燒出一片煉獄：周圍的敵人重傷並燃燒。', 'elementalist'],
    ['hx_drain', '吸取', 'mage', 8, 8, 14, 'drain', { range: 10, k: 2, heal: 0.5 }, '從準心方向最近的敵人身上吸走生命：傷害的一半回到你身上。', 'hexer'],
    ['hx_plague', '疫咒', 'mage', 14, 14, 24, 'mark', { range: 12, r: 5, t: 8, slow: 4, k: 0.5 }, '大範圍的詛咒：8 秒內受到的傷害 +30%、變慢。', 'hexer'],
    ['sk_crane', '紙鶴', 'mage', 8, 10, 16, 'shots', { n: 5, spread: 0.6, k: 0.9, homing: 6, kind: 'spirit', sp: 16, life: 1.8 }, '放出五隻紙鶴式神，追著敵人撞上去。', 'shikigami'],
    ['sk_guard', '護法', 'mage', 14, 16, 24, 'orbit', { t: 12, n: 5 }, '五隻式神環繞你 12 秒，自動攻擊靠近的敵人。', 'shikigami'],
    ['bi_miracle', '奇蹟', 'priest', 8, 24, 36, 'heal', { pct: 0.6, allies: 0.5, cleanse: 1 }, '你回復 60% 生命、隊友回復 50%，解除不良狀態。', 'bishop'],
    ['bi_lance', '聖槍', 'priest', 14, 10, 20, 'line', { len: 12, width: 0.8, k: 3.5, color: '#FFE8A0' }, '祈禱化成一支光之槍，貫穿一直線。', 'bishop'],
    ['dr_thorns', '荊棘', 'priest', 8, 10, 16, 'nova', { r: 3.5, k: 1, root: 1.5, color: '#6FB36A' }, '腳下長出荊棘：周圍的敵人受傷、被纏住。', 'druid'],
    ['dr_bloom', '花開', 'priest', 14, 16, 24, 'zone', { zone: 'sanct', self: 1, r: 4, life: 8, k: 0.3 }, '腳下開出一片花：8 秒內站在裡面回復生命，灼傷進來的敵人。', 'druid'],
    ['sh_harae', '祓', 'priest', 8, 10, 18, 'nova', { r: 4, k: 1.8, kb: 2, color: '#FFFFFF' }, '揮動御幣祓除：周圍的遺跡生物受傷、被推開。', 'shinkan'],
    ['sh_barrier', '大結界', 'priest', 14, 20, 30, 'buff', { t: 8, kekkai: 1, color: '#FFFFFF' }, '張開 8 秒的大結界：擋下投射物，範圍內的遺跡生物變弱。', 'shinkan'],
    ['ks_issen', '一閃', 'blade', 8, 10, 16, 'line', { len: 10, width: 1, k: 4.5, crit: 1, delay: 500, color: '#FFFFFF' }, '靜止 0.5 秒，一刀斬出 10 公尺，必定暴擊。', 'kensei'],
    ['ks_still', '明鏡止水', 'blade', 14, 18, 12, 'parry', { t: 1.2, buff: { t: 5, crit: 0.3 } }, '架勢 1.2 秒：擋下攻擊並反擊；之後 5 秒暴擊率 +30%。', 'kensei'],
    ['sd_backstab', '背刺', 'blade', 8, 8, 12, 'blink', { behind: 1, range: 12, hit: 3.5, crit: 1 }, '閃到最近的敵人背後，刺出必定暴擊的一刀。', 'shadow'],
    ['sd_stitch', '影縫', 'blade', 14, 12, 16, 'at', { range: 9, r: 3, k: 0.8, root: 2, invis: 2, fx: 'ring', color: '#3A2A4A' }, '以影子束縛敵人：範圍內的敵人定身 2 秒，你隱身 2 秒。', 'shadow'],
    ['yt_drink', '啜血', 'blade', 8, 10, 10, 'arc', { range: 3, arc: 6.28, k: 1.2, vamp: 0.3 }, '妖刀轉一圈啜飲：傷害的三成變成你的生命。', 'yoto'],
    ['yt_mad', '妖氣', 'blade', 14, 16, 14, 'buff', { t: 6, dmg: 1.35, def: -0.15, color: '#B83AE8' }, '釋放妖刀吸收的魔力質：6 秒內傷害 +35%，但受到的傷害 +15%。', 'yoto'],
    ['tp_aegis', '神盾', 'knight', 8, 16, 16, 'heal', { shield: 0.4, color: '#C9A13A' }, '得到吸收 40% 生命的神盾。', 'templar'],
    ['tp_crusade', '聖戰', 'knight', 14, 14, 18, 'nova', { r: 4, k: 2, stun: 1, taunt: 4, color: '#C9A13A' }, '高舉長劍：周圍的敵人暈眩，接下來 4 秒改打你。', 'templar'],
    ['pl_hands', '按手禮', 'knight', 8, 16, 20, 'heal', { pct: 0.4, allies: 0.3 }, '你回復 40% 生命，隊友回復 30%。', 'paladin'],
    ['pl_hammer', '審判之錘', 'knight', 14, 10, 18, 'at', { range: 10, r: 2.6, k: 3, stun: 1.2, delay: 400, fx: 'pillar', color: '#FFE8A0' }, '在準心處落下光之錘，敵人暈眩。', 'paladin'],
    ['dg_spear', '擲槍', 'knight', 8, 7, 12, 'shots', { k: 2.6, pierce: 4, kind: 'hama', sp: 30 }, '把長槍擲出去，穿過四隻敵人（槍會自己飛回來）。', 'dragoon'],
    ['dg_dive', '龍落', 'knight', 14, 12, 20, 'blink', { range: 9, iframe: 0.4, end: { r: 3.5, k: 3, stun: 1, color: '#9AD8FF' } }, '躍上半空，砸在準心處：周圍的敵人重傷、暈眩。', 'dragoon'],
    // 武術家（2026-10-04 新職業）：拳套近身連打、長棍掃一片；氣功的技能用魔力質（eorb）
    ['m_flurry', '連環拳', 'monk', 1, 6, 8, 'arc', { range: 2.3, arc: 1.7, k: 0.55, hits: 5, gap: 80 }, '一口氣往前打出五拳。'],
    ['m_step', '縮地', 'monk', 2, 5, 6, 'dash', { len: 5, dur: 0.15, k: 1.2 }, '一步跨到 5 公尺外，順手打倒擋路的敵人（跨的時候不會受傷）。'],
    ['m_palm', '推掌', 'monk', 3, 7, 10, 'line', { len: 4.5, width: 1.3, k: 2.2, kb: 3.5, color: '#FFD08A' }, '一掌推出去，直線上的敵人被震飛。'],
    ['m_kick', '旋風腿', 'monk', 4, 7, 10, 'arc', { range: 2.7, arc: 6.28, k: 1.1, hits: 2, gap: 160 }, '原地旋身踢兩圈，踢到身邊所有的敵人。'],
    ['m_focus', '運氣', 'monk', 5, 14, 10, 'buff', { t: 8, dmg: 1.15, speed: 1.1, color: '#FFB45A' }, '把氣運到四肢：8 秒內傷害 +15%、移動 +10%。'],
    ['m_counter', '化勁', 'monk', 6, 8, 8, 'parry', { t: 0.8, buff: { t: 4, dmg: 1.2 } }, '架勢 0.8 秒：卸掉打過來的力道並反擊；之後 4 秒傷害 +20%。'],
    ['m_wave', '氣功波', 'monk', 8, 8, 14, 'shots', { k: 1.9, pierce: 2, kind: 'eorb', sp: 22 }, '把氣凝成一團打出去，穿過兩隻敵人。'],
    ['m_stomp', '震腳', 'monk', 10, 10, 14, 'nova', { r: 3.4, k: 1.5, stun: 1, color: '#E8C878' }, '一腳踏地：周圍的敵人震暈 1 秒。'],
    ['m_breathe', '調息', 'monk', 12, 16, 0, 'heal', { pct: 0.15, mp: 0.25 }, '調勻呼吸：回復 15% 生命、25% 魔力。'],
    ['m_meteor', '流星腳', 'monk', 15, 12, 18, 'blink', { range: 8, iframe: 0.3, end: { r: 2.8, k: 2.6, stun: 0.8, color: '#FFB45A' } }, '躍起一腳踢到準心處：落地的地方周圍敵人重傷、暈眩。'],
    // 拳聖
    ['fs_hundred', '百裂拳', 'monk', 8, 8, 14, 'arc', { range: 2.4, arc: 1.8, k: 0.5, hits: 8, gap: 60 }, '一口氣打出八拳。', 'fistsaint'],
    ['fs_rising', '昇龍拳', 'monk', 14, 10, 16, 'nova', { r: 2.6, k: 2.8, stun: 1.2, color: '#FF9A4A' }, '一記上勾拳把身邊的敵人打飛、暈眩。', 'fistsaint'],
    ['fs_iron', '鐵布衫', 'monk', 14, 16, 12, 'buff', { t: 6, def: 0.4, dmg: 1.1, color: '#C8B898' }, '繃緊全身：6 秒內受到的傷害 −40%、傷害 +10%。', 'fistsaint'],
    // 棍僧（武術家的變化路線）
    ['sm_wheel', '風車棍', 'monk', 8, 8, 14, 'arc', { range: 3.3, arc: 6.28, k: 0.8, hits: 4, gap: 120 }, '長棍掄四圈，掃開身邊所有敵人。', 'staffmonk'],
    ['sm_vault', '撐竿跳', 'monk', 14, 8, 10, 'blink', { range: 7, iframe: 0.35, end: { r: 2.4, k: 1.6, color: '#C8A878' } }, '長棍一撐跳到準心處，落地掃一圈。', 'staffmonk'],
    ['sm_sweep', '掃堂棍', 'monk', 14, 9, 12, 'arc', { range: 3.4, arc: 3.2, k: 1.6, stun: 1 }, '貼地一掃：前方的敵人被絆倒（暈眩 1 秒）。', 'staffmonk'],
    // 外修者（術士的外修派「東方派」：體外的魔力罩當矛也當盾；2026-10-04 從武術家搬過來）
    ['wx_burst', '氣爆', 'mage', 8, 8, 14, 'nova', { r: 3.4, k: 1.9, kb: 4, color: '#9AE8FF' }, '把體外的魔力罩一口氣炸開：震飛、震傷周圍的敵人。', 'waixiu'],
    ['wx_palm', '隔空掌', 'mage', 14, 5, 10, 'shots', { k: 2.2, kind: 'eorb', sp: 30, pierce: 1 }, '用魔力罩的魔力隔空打一掌，幾乎沒有前搖。', 'waixiu'],
    ['wx_shell', '氣罩', 'mage', 14, 14, 14, 'heal', { shield: 0.35, color: '#9AE8FF' }, '把魔力罩一口氣撐厚：得到吸收 35% 生命的護盾。', 'waixiu'],
    // 鬼武者（戰士的第三條路，2026-10-04 內修者搬到武術家之後補上）
    ['on_rend', '鬼斬', 'warrior', 8, 8, 14, 'arc', { range: 3.4, arc: 2.6, k: 2.4, stun: 0.6, kb: 1.5 }, '戴著鬼面往前大斬一刀，打中的敵人被嚇得愣住。', 'onimusha'],
    ['on_mask', '鬼面', 'warrior', 14, 16, 12, 'buff', { t: 6, dmg: 1.3, def: -0.1, color: '#C83A3A' }, '讓鬼面的惡意上身：6 秒內傷害 +30%，但受到的傷害 +10%。', 'onimusha'],
    ['on_howl', '鬼哭', 'warrior', 14, 12, 14, 'nova', { r: 4, k: 1.2, stun: 0.8, taunt: 3, color: '#8A2A2A' }, '一聲鬼哭：周圍的敵人暈眩，接下來 3 秒改打你。', 'onimusha']
  ];
  const LIB = {};
  NEW.forEach(([id, name, cls, lv, cd, mp, type, p, desc, adv]) => { LIB[id] = { id, name, cls, lv, cd, mp, type, p, desc, adv }; R.SKILLS[id] = { name, cd, mp, desc }; });
  // 原本就有的技能：基本技能（等級 1）、skills.js 的兩個（等級 3、6）、轉職技能（轉職那條路線）
  const BUILTIN = new Set(['roll', 'volley', 'whirl', 'fireball', 'heal', 'flash', 'charge', 'snipe', 'element', 'grenade', 'homing', 'trap', 'hamaya', 'rage', 'combo', 'qijin', 'meteor', 'hex', 'shiki', 'sanctuary', 'wild', 'kekkai', 'iai', 'shadowstep', 'yotoRelease', 'fortress', 'holycharge', 'jump']);
  const OLD = {};
  R.CLASS_IDS.forEach(cls => {
    OLD[R.CLASSES[cls].skill] = { cls, lv: 1 };
    (R.SKILL_SLOTS[cls] || []).forEach((id, i) => { OLD[id] = { cls, lv: R.SKILL_UNLOCK[i + 1] }; });
    (R.ADV[cls] || []).forEach(a => { OLD[a.skill] = { cls, lv: 8, adv: a.id }; });   // 8＝原本的轉職等級；實際要幾級看 R.skillNeedLv（promote.js）
  });
  const info = id => LIB[id] || OLD[id];
  R.SKILL_LIB = LIB;

  // ---------- 學會了沒、裝了什麼 ----------
  const need = (s, st) => (R.skillNeedLv ? R.skillNeedLv(s, st) : s.lv);   // 轉職路線的技能：轉職等級調高以後往後挪（promote.js）
  const known = (cls, st, id) => { const s = info(id); return !!s && s.cls === cls && st.lv >= need(s, st) && (!s.adv || s.adv === st.adv); };
  const allOf = cls => Object.keys(OLD).filter(id => OLD[id].cls === cls).concat(Object.keys(LIB).filter(id => LIB[id].cls === cls));
  const NSLOT = () => R.SKILL_UNLOCK.length;   // 技能格的數目（skills.js；2026-10-04 起五格）
  const defaults = (cls, st) => [st.adv ? R.ADV[cls].find(a => a.id === st.adv).skill : R.CLASSES[cls].skill, (R.SKILL_SLOTS[cls] || [])[0], (R.SKILL_SLOTS[cls] || [])[1]].concat(Array(Math.max(0, NSLOT() - 3)).fill(null));
  R.loadoutOf = cls => {
    const S = R.S, st = S.classes[cls], def = defaults(cls, st);
    S.loadout = S.loadout || {}; const lo = S.loadout[cls] || [];
    const out = Array.from({ length: NSLOT() }, (_, i) => (lo[i] && known(cls, st, lo[i]) ? lo[i] : null));
    // 沒換過的格子用預設；預設的技能已經被放在別格，就找一個還沒裝的
    // 一格一格填：已經裝上的（包括這一輪剛填的）不再重複；新的第四、五格沒有預設，就填還沒裝的學會的技能（沒有就空著）
    const used = new Set(out.filter(Boolean));
    return out.map((id, i) => { if (id) return id; const d = def[i]; if (d && !used.has(d)) { used.add(d); return d; } const k = allOf(cls).find(x => known(cls, st, x) && !used.has(x)); if (k) { used.add(k); return k; } return i < 3 ? d : null; });
  };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => { const P = cp0(cls); try { P.skill = R.loadoutOf(cls)[0]; } catch (e) { } return P; };
  R.slotSkill = (P, i) => { const lo = R.S ? R.loadoutOf(P.cls) : []; if (i === 0) return P.skill; return P.lv >= R.SKILL_UNLOCK[i] ? lo[i] || null : null; };

  // ---------- 放技能 ----------
  const us0 = R.useSkill;
  const cdGet = (P, i) => (i === 0 ? P.skillCd : (P.skCd && P.skCd[i]) || 0);
  const cdSet = (P, i, v) => { if (i === 0) P.skillCd = v; else { P.skCd = P.skCd || [0, 0, 0]; P.skCd[i] = v; } };
  const castAny = (id, i) => {
    const w = W(), P = w.P; if (!P || !w.run || w.paused || !id) return;
    const sk = R.SKILLS[id]; if (!sk) return;
    if (cdGet(P, i) > 0 || P.dead || P.knockT > 0 || P.jump || P.stance > 0) return;
    if (P.mp < sk.mp) { R.toast('魔力不夠'); return; }
    if (BUILTIN.has(id)) {
      // combat.js 的技能：借第一格的冷卻、魔力扣法放一次
      const s0 = P.skill, c0 = P.skillCd; P.skill = id; P.skillCd = 0; us0(); const cd = P.skillCd; P.skill = s0; P.skillCd = i === 0 ? cd : c0; if (i !== 0) cdSet(P, i, cd); return;
    }
    P.mp -= sk.mp; cdSet(P, i, sk.cd * P.skillCdMult);
    const ok = LIB[id] ? run(LIB[id], P, w) : R.castSkillId ? R.castSkillId(id) : false;
    if (ok === false) { P.mp += sk.mp; cdSet(P, i, 0.3); return; }
    R.sfx && R.sfx('skill');
  };
  R.useSkill = () => { const P = W().P; if (!P) return; if (BUILTIN.has(P.skill)) return us0(); castAny(P.skill, 0); };
  R.castSlot = i => {
    const w = W(), P = w.P; if (!P || !w.run || w.paused) return;
    if (i === 0) { R.useSkill(); return; }
    const id = R.slotSkill(P, i);
    if (!id) { R.toast('職業等級 ' + R.SKILL_UNLOCK[i] + ' 才會打開這一格'); return; }
    castAny(id, i);
  };

  // ---------- 技能的「型」 ----------
  const aimIn = (P, max) => { const d = Math.hypot(P.aimX - P.x, P.aimZ - P.z), k = d > max ? max / d : 1; return [P.x + (P.aimX - P.x) * k, P.z + (P.aimZ - P.z) * k]; };
  const slowIn = (x, z, r, t) => W().enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < r + e.def.size * 0.5) e.st.slow = Math.max(e.st.slow, t); });
  const nova = (P, w, s, pw, x, z) => {
    // 沒給位置：每一波都在你現在的位置（邊轉邊走）
    const one = () => { const cx = x == null ? P.x : x, cz = z == null ? P.z : z; R.fx('ring', cx, 0.1, cz, { r: s.r, color: s.color || '#FFFFFF' }); R.aoe(cx, cz, s.r, pw * s.k, { stun: s.stun, root: s.root, curse: s.curse, kb: s.kb, burn: s.burn }); if (s.slow) slowIn(cx, cz, s.r, s.slow); };
    const n = s.waves || 1; for (let i = 0; i < n; i++) { if (i === 0) one(); else later(one, i * (s.gap || 250)); }
    if (s.taunt) P.taunt = Math.max(P.taunt || 0, s.taunt);
  };
  const T = {
    shots(s, P, w, pw) {
      const n = s.n || 1, kind = s.kind || KIND[P.cls] || 'bullet', b = s.burst || 1;
      for (let j = 0; j < b; j++) later(() => {
        for (let i = 0; i < n; i++) { const aa = P.aimA + (n > 1 ? (i - (n - 1) / 2) * (s.spread || 0.3) / (n - 1) * 2 : 0); R.fire({ kind, owner: 'p', x: P.x, z: P.z, a: aa, speed: s.sp || 28, dmg: pw * s.k, life: s.life || 0.9, pierce: s.pierce || 0, homing: s.homing || 0, root: s.root, stun: s.stun, crit: s.crit, radius: s.radius, elem: s.elem === 'cycle' ? ['fire', 'frost', 'shock'][i % 3] : s.elem, primary: false }); }
        P.h.recoil = 1; if (kind === 'bullet') R.fx('muzzle', P.x + Math.sin(P.aimA) * 0.9, 1.15, P.z + Math.cos(P.aimA) * 0.9, {});
        R.sfx && R.sfx(kind === 'bullet' ? 'gun' : kind === 'arrow' ? 'bow' : 'magic');
      }, j * (s.gap || 100));
    },
    nova(s, P, w, pw) { nova(P, w, s, pw); },
    at(s, P, w, pw) {
      const [x0, z0] = aimIn(P, s.range || 10), n = s.waves || 1;
      R.fx('mark', x0, 0, z0, { r: s.r, t: (s.delay || 300) / 1000 });
      for (let i = 0; i < n; i++) later(() => {
        const x = x0 + (s.scatter ? (Math.random() - 0.5) * 2 * s.scatter : 0), z = z0 + (s.scatter ? (Math.random() - 0.5) * 2 * s.scatter : 0);
        const fx = s.fx || 'boom'; if (fx === 'pillar') R.fx('pillar', x, 0, z, { r: s.r * 0.6, color: s.color }); else if (fx === 'rain') R.fx('rain', x, 0, z, { r: s.r }); else if (fx === 'poof') R.fx('poof', x, 0.6, z, { color: s.color, n: 18 }); else if (fx === 'ring') R.fx('ring', x, 0.1, z, { r: s.r, color: s.color }); else R.fx('boom', x, 0.6, z, { r: s.r, color: s.color });
        R.aoe(x, z, s.r, pw * s.k, { stun: s.stun, root: s.root, curse: s.curse, kb: s.kb, burn: s.burn }); if (s.slow) slowIn(x, z, s.r, s.slow);
        if (s.aware) R.addAware(s.aware, 'boom'); if (i === 0 && s.r >= 2.5) R.shake(0.2);
      }, (s.delay || 300) + i * (s.gap || 200));
      if (s.invis) P.invis = Math.max(P.invis || 0, s.invis);
    },
    line(s, P, w, pw) {
      const a = P.aimA; if (s.delay) P.stance = s.delay / 1000;
      later(() => {
        const sx = P.x, sz = P.z, ca = Math.sin(a), sa = Math.cos(a);
        R.fx('slash', sx, 1, sz, { a, len: s.len });
        w.enemies.forEach(e => {
          if (e.dead || e.under) return; const dx = e.x - sx, dz = e.z - sz, along = dx * ca + dz * sa, side = Math.abs(dx * sa - dz * ca), rad = e.def.size * 0.5;
          if (along < -0.3 || along > s.len + rad || side > s.width + rad) return;
          const exe = s.execute && e.hp < e.hpMax * 0.3 ? 2 : 1;
          R.hurtEnemy(e, pw * s.k * exe, { crit: s.crit >= 1 || (s.crit && Math.random() < s.crit), stun: s.stun, kb: s.kb, curse: s.curse, root: s.root });
          if (s.burn) e.st.burn = 3;
        });
        if (s.aware) R.addAware(s.aware, 'boom'); if (s.k >= 3) R.shake(0.25);
      }, s.delay || 0);
    },
    arc(s, P, w, pw) {
      const n = s.hits || 1; P.stance = Math.max(P.stance || 0, Math.min(0.6, n * (s.gap || 120) / 1000));
      for (let i = 0; i < n; i++) later(() => {
        const a = P.aimA + (s.back && i % 2 ? Math.PI : 0), hp0 = s.vamp ? w.enemies.reduce((t, e) => t + (e.dead ? 0 : e.hp), 0) : 0;
        R.swingAnim(P.h, 0.02, 0.12); R.melee(a, s.range, s.arc, pw * s.k, 0, 0, 0, { kb: s.kb, stun: s.stun, curse: s.curse, dir: i % 2 ? -1 : 1, hs: 1, primary: false });
        if (s.vamp) { const hp1 = w.enemies.reduce((t, e) => t + (e.dead ? 0 : e.hp), 0); if (hp0 > hp1) R.healP((hp0 - hp1) * s.vamp); }
        R.sfx && R.sfx('swing');
      }, i * (s.gap || 120));
    },
    dash(s, P, w, pw) {
      const a = s.side ? P.aimA + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2 : P.aimA;
      R.dash(a, s.len, s.dur || 0.22, { iframe: true, hit: s.k ? pw * s.k : 0, stun: s.stun, kb: s.kb, end: s.end ? () => nova(P, w, s.end, pw) : null });
      if (s.side) R.startRoll(P.h, a, s.dur || 0.22);
      R.fx('dust', P.x, 0.15, P.z, {});
      if (s.then) T[s.then.type](s.then, P, w, pw);
    },
    blink(s, P, w, pw) {
      let x, z;
      if (s.behind) { const tg = R.nearestEnemy(P.x, P.z, s.range); if (!tg) { R.toast('附近沒有敵人'); return false; } [x, z] = R.nearestFloor(tg.x - Math.sin(tg.yaw || 0) * 1.4, tg.z - Math.cos(tg.yaw || 0) * 1.4); s._tg = tg; }
      else if (s.back) [x, z] = R.nearestFloor(P.x - Math.sin(P.aimA) * s.range, P.z - Math.cos(P.aimA) * s.range);
      else [x, z] = R.nearestFloor(...aimIn(P, s.range));
      R.fx('blink', P.x, 1, P.z); P.x = x; P.z = z; R.collide(P, 0.42); R.fx('blink', P.x, 1, P.z);
      P.iframe = Math.max(P.iframe || 0, s.iframe || 0.25);
      if (s.invis) P.invis = Math.max(P.invis || 0, s.invis);
      if (s.hit && s._tg && !s._tg.dead) { P.aimA = Math.atan2(s._tg.x - P.x, s._tg.z - P.z); R.swingAnim(P.h, 0.02, 0.25); R.hurtEnemy(s._tg, pw * s.hit, { crit: !!s.crit, primary: false }); R.fx('spark', s._tg.x, 1.2, s._tg.z, { a: P.aimA, crit: true }); }
      if (s.end) nova(P, w, s.end, pw);
    },
    buff(s, P) {
      P.sb = P.sb || {}; const b = P.sb[s._id] = Object.assign({ left: s.t }, s);
      if (s.speed) { P.speed *= s.speed; b.spd = s.speed; }
      if (s.taunt) P.taunt = Math.max(P.taunt || 0, s.taunt);
      if (s.invis) P.invis = Math.max(P.invis || 0, s.invis);
      if (s.kekkai) P.buff.kekkai = Math.max(P.buff.kekkai || 0, s.t);
      R.fx('ring', P.x, 0.1, P.z, { r: 2, color: s.color || '#FFFFFF' });
    },
    heal(s, P, w, pw) {
      if (s.pct) R.healP(P.hpMax * s.pct);
      if (s.shield) { P.shield = Math.max(P.shield || 0, P.hpMax * s.shield); P.buff.shieldT = Math.max(P.buff.shieldT || 0, 6); }
      if (s.mp) P.mp = Math.min(P.mpMax, P.mp + P.mpMax * s.mp);
      if (s.cleanse) { P.slowT = 0; P.blindT = 0; }
      (w.allies || []).forEach(al => { if (al.downed || dist(al, P) > 7) return; if (s.allies) al.hp = Math.min(al.hpMax, al.hp + al.hpMax * s.allies); if (s.allyShield) { al.shield = Math.max(al.shield || 0, al.hpMax * s.allyShield); al.shieldT = 6; } if (s.allies || s.allyShield) R.fx('ring', al.x, 0.1, al.z, { r: 1.2, color: '#FFE8A0' }); });
      if (s.nova) nova(P, w, s.nova, pw);
      if (s.buff) T.buff(Object.assign({ _id: s._id + ':b' }, s.buff), P);
      R.fx('ring', P.x, 0.1, P.z, { r: 2.5, color: s.color || '#FFE8A0' });
    },
    zone(s, P, w, pw) {
      const [x0, z0] = s.self ? [P.x, P.z] : aimIn(P, s.range || 8), n = s.count || 1;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, o = n > 1 ? 1.8 : 0, [x, z] = R.nearestFloor(x0 + Math.sin(a) * o, z0 + Math.cos(a) * o); R.addZone({ kind: s.zone, x, z, r: s.r, life: s.life, dmg: pw * s.k }); }
    },
    mark(s, P, w, pw) {
      const [x, z] = aimIn(P, s.range || 10); R.fx('ring', x, 0.1, z, { r: s.r, color: '#9A4ACF' });
      w.enemies.forEach(e => { if (e.dead || Math.hypot(e.x - x, e.z - z) > s.r + e.def.size * 0.5) return; e.st.curse = Math.max(e.st.curse, s.t); if (s.slow) e.st.slow = Math.max(e.st.slow, s.slow); if (s.stun) e.st.stun = Math.max(e.st.stun, s.stun); if (s.k) R.hurtEnemy(e, pw * s.k, {}); });
    },
    pull(s, P, w, pw) {
      const [x, z] = aimIn(P, s.range || 10), run = w.run; let left = s.t, tick = 0;
      R.fx('ring', x, 0.1, z, { r: s.r, color: '#6A4ACF' });
      w.dyn.push(dt => {
        if (W().run !== run) return false; left -= dt; tick -= dt;
        w.enemies.forEach(e => { if (e.dead || e.def.boss) return; const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz); if (d > s.r + 1 || d < 0.3) return; e.x += dx / d * Math.min(d, 5 * dt); e.z += dz / d * Math.min(d, 5 * dt); });
        if (tick <= 0) { tick = 0.3; R.aoe(x, z, s.r, pw * s.k, { props: false }); R.fx('ring', x, 0.1, z, { r: s.r * 0.6, color: '#9A7AFF' }); }
        return left > 0;
      });
    },
    chain(s, P, w, pw) { if (R.castSkillId) return R.castSkillId('chain'); },
    orbit(s, P) { P.orbit = Math.max(P.orbit || 0, s.t); P.orbitN = Math.max(P.orbitN || 0, s.n); },
    parry(s, P) { P.parryT = s.t; P.stance = s.t; R.swingAnim(P.h, s.t, s.t + 0.02); R.fx('ring', P.x, 0.1, P.z, { r: 1.4, color: '#FFFFFF' }); if (s.buff) T.buff(Object.assign({ _id: 'parry:b' }, s.buff), P); },
    drain(s, P, w, pw) {
      const tg = R.nearestEnemy(P.x, P.z, s.range, P.aimA) || R.nearestEnemy(P.x, P.z, s.range * 0.6); if (!tg) { R.toast('附近沒有敵人'); return false; }
      const h0 = tg.hp; R.fx('bolt', P.x, 1, P.z, { to: tg }); R.hurtEnemy(tg, pw * s.k, {}); R.healP(Math.max(0, h0 - tg.hp) * s.heal);
    }
  };
  const run = (sk, P, w) => { const s = Object.assign({ _id: sk.id }, sk.p); return T[sk.type](s, P, w, power(P.ws)); };
  R.SKILL_TYPES = T; R.SKILL_KIT = { later, aimIn, nova, slowIn, power };   // skillbook2.js 加新的「型」和技能

  // ---------- 強化的效果：傷害、暴擊、燃燒、吸血、減傷、回復、移動 ----------
  const sbList = P => (P && P.sb ? Object.values(P.sb) : []);
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P, L = sbList(P); if (!L.length || !e || e.dead) return he0(e, raw, o);
    let m = 1, crit = 0, burn = false, vamp = 0; L.forEach(b => { if (b.dmg) m *= b.dmg; if (b.crit) crit += b.crit; if (b.burn) burn = true; if (b.vamp) vamp += b.vamp; });
    o = Object.assign({}, o); if (crit && Math.random() < crit) o.crit = true;
    const h0 = e.hp, r = he0(e, raw * m, o);
    if (burn && o.primary && !e.dead) e.st.burn = 3;
    if (vamp && h0 > e.hp) R.healP((h0 - Math.max(0, e.hp)) * vamp, true);
    return r;
  };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const L = sbList(W().P); L.forEach(b => { if (b.def) raw *= 1 - b.def; }); return hp0(raw, src, o); };
  const step0 = R.step;
  R.step = dt => {
    step0(dt);
    const w = W(), P = w.P; if (!P || !P.sb || !w.run || w.paused) return;
    Object.keys(P.sb).forEach(k => { const b = P.sb[k]; b.left -= dt; if (b.regen) R.healP(P.hpMax * b.regen * dt, true); if (b.left <= 0) { if (b.spd) P.speed /= b.spd; delete P.sb[k]; } });
  };
  // 換樓層：強化跟著帶下去（時間照算）；回到地面就清掉
  const er0 = R.endRun;
  if (er0) R.endRun = (...a) => { const P = W().P; if (P && P.sb) { sbList(P).forEach(b => { if (b.spd) P.speed /= b.spd; }); P.sb = {}; } return er0(...a); };

  // ---------- 升級：學會新技能 ----------
  const gx0 = R.gainXp;
  R.gainXp = v => {
    const S = R.S, cls = S.cls, st = S.classes[cls], lv0 = st.lv; gx0(v);
    if (st.lv === lv0) return;
    const got = Object.keys(LIB).filter(id => { const s = LIB[id]; const L = need(s, st); return s.cls === cls && L > lv0 && L <= st.lv && (!s.adv || s.adv === st.adv); });
    if (got.length) setTimeout(() => R.banner('學會新技能：' + got.map(id => LIB[id].name).join('、'), '回到城裡，在暫停選單或公會的「技能書」把它換上去'), 3600);
  };

  // ---------- 技能書（換技能的畫面） ----------
  const KEYS = () => (R.touch ? ['技能鈕', '第二鈕', '第三鈕', '第四鈕', '第五鈕'] : ['R／右鍵', '3', '4', '5', '6']);
  let pickSlot = 0;
  const book = (host, close) => {
    const S = R.S, cls = S.cls, st = S.classes[cls], lo = R.loadoutOf(cls), keys = KEYS();
    const ids = allOf(cls), learned = ids.filter(id => known(cls, st, id)), locked = ids.filter(id => !known(cls, st, id));
    const req = id => { const s = info(id); if (s.taught) return '望月瀧教的：成為戀人之後向她學'; if (s.adv && s.adv !== st.adv) return '轉職：' + R.ADV[cls].find(a => a.id === s.adv).name + (need(s, st) > R.PROMOTE_LV ? '・Lv ' + need(s, st) : ''); return '職業等級 ' + need(s, st); };
    // 照轉職路線分段：基本技能、你走的那條路線、其他路線（收起來）
    const groups = ids => {
      const advs = (R.ADV[cls] || []).filter(a => !a.legacy || a.id === st.adv).map(a => a.id).sort((a, b) => (b === st.adv) - (a === st.adv));
      const gk = id => { const s = info(id) || {}; return s.taught ? 'taught' : (s.adv || null); };   // 望月瀧教的（takiteach.js）自己一段
      return [null].concat(advs, ['taught']).map(r => {
        const list = ids.filter(id => gk(id) === r); if (!list.length) return '';
        const a = r && r !== 'taught' && R.ADV[cls].find(x => x.id === r), got = list.filter(id => known(cls, st, id)), mine = r === 'taught' ? got.length > 0 : (!r || r === st.adv || !st.adv);
        const title = r === 'taught' ? '望月瀧教的' : r ? '轉職・' + a.name + (r === st.adv ? '（你的路線）' : st.adv ? '（別的路線）' : '（職業等級 ' + R.PROMOTE_LV + ' 轉職以後）') : '基本・' + R.CLASSES[cls].name;
        return '<details class="sb-group"' + (mine ? ' open' : '') + '><summary><b>' + esc(title) + '</b> <small>學會 ' + got.length + '／' + list.length + '</small></summary><div class="recipes sb-list">'
          + got.map(id => card(id, true)).join('') + list.filter(id => !known(cls, st, id)).map(id => card(id, false)).join('') + '</div></details>';
      }).join('');
    };
    const card = (id, ok) => { const sk = R.SKILLS[id], at = lo.indexOf(id), s = info(id); return '<button type="button" class="recipe sb-card' + (at >= 0 ? ' on' : '') + (ok ? '' : ' lock') + '" data-sk="' + id + '"' + (ok ? '' : ' disabled') + '><b>' + esc(sk.name) + (s.adv ? ' <small class="sb-adv">' + esc(R.ADV[cls].find(a => a.id === s.adv).name) + '</small>' : '') + (at >= 0 ? ' <small class="sb-at">裝在「' + keys[at] + '」</small>' : '') + '</b><small>' + (R.skillTag && R.skillTag(id) ? esc(R.skillTag(id)) + '・' : '') + '冷卻 ' + sk.cd + ' 秒・魔力 ' + sk.mp + (ok ? '' : '・' + esc(req(id))) + '</small><span>' + esc(sk.desc) + '</span></button>'; };
    host.innerHTML = '<h2>技能書・' + esc(R.clsName(cls)) + ' Lv ' + st.lv + '</h2><p class="note">每一格技能都可以換。先點上面的一格，再點下面學會的技能。第二到第五格在職業等級 ' + R.SKILL_UNLOCK.slice(1).join('、') + ' 打開。進了遺跡就不能換。</p>'
      + '<div class="row sb-slots">' + Array.from({ length: NSLOT() }, (_, i) => i).map(i => { const open = i === 0 || st.lv >= R.SKILL_UNLOCK[i]; return '<button type="button" class="btn' + (pickSlot === i ? ' pri' : '') + '" data-slot="' + i + '"' + (open ? '' : ' disabled') + '>' + keys[i] + '：' + (open ? esc(R.SKILLS[lo[i]].name) : 'Lv ' + R.SKILL_UNLOCK[i] + ' 打開') + '</button>'; }).join('') + '<button type="button" class="btn" data-reset="1">恢復預設</button></div>'
      + '<p class="note">學會 ' + learned.length + '／' + ids.length + ' 種。依轉職路線分類，可展開各區查看學習條件。</p>' + groups(ids)
      + '<div class="row"><button type="button" class="btn pri" data-close="1">好了</button></div>';
    host.querySelectorAll('[data-slot]').forEach(b => { b.onclick = () => { pickSlot = +b.dataset.slot; book(host, close); }; });
    host.querySelectorAll('[data-sk]').forEach(b => { b.onclick = () => {
      const id = b.dataset.sk, cur = R.loadoutOf(cls).slice(), from = cur.indexOf(id);
      if (pickSlot > 0 && st.lv < R.SKILL_UNLOCK[pickSlot]) return;
      if (from >= 0) cur[from] = cur[pickSlot]; cur[pickSlot] = id;
      S.loadout = S.loadout || {}; S.loadout[cls] = cur; R.save(); book(host, close);
    }; });
    host.querySelector('[data-reset]').onclick = () => { S.loadout = S.loadout || {}; S.loadout[cls] = [null, null, null]; R.save(); book(host, close); };
    host.querySelector('[data-close]').onclick = close;
  };
  R.skillBook = where => {
    if (W().run) { R.toast('遺跡裡不能換技能。'); return; }
    if (where === 'hub') { const host = $('hub-sheet'), el = $('hub-modal'); el.hidden = false; book(host, () => { el.hidden = true; R.hub(); }); host.scrollTop = 0; return; }
    R.sheet('<div id="sb-host"></div>'); book($('sb-host'), () => R.closeSheet());
  };
  // 城裡的暫停選單：多一個「技能書」
  const tm0 = R.townMenu;
  if (tm0) R.townMenu = () => { tm0(); const row = document.querySelector('#r-sheet .row'); if (!row) return; const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = '技能書（換技能）'; b.onclick = () => R.skillBook('town'); row.insertBefore(b, row.children[1] || null); };
  // 公會：武器登記那一段多一個按鈕
  const hub0 = R.hub;
  R.hub = (t, f) => {
    hub0(t, f);
    const body = $('hub-body'); if (!body) return;
    const h = [...body.querySelectorAll('h3')].find(e => e.textContent === '武器登記'); if (!h) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn pri'; b.textContent = '技能書：換「' + R.clsName(R.S.cls) + '」的技能'; b.onclick = () => R.skillBook('hub');
    const p = document.createElement('div'); p.className = 'row'; p.appendChild(b); h.after(p);
  };
})(window.R);
