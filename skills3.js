// 新職業的技能補齊（2026-10-04 作者：新職業的技能對標舊職業有點少）
// 舊職業：基本 18 招、每條轉職路線 6 招。新職業（吟遊詩人、召喚師、術陣師、附魔師、符卷師、武術家）原本基本 13 招、路線 2～3 招。
// - 基本技能：每個新職業多 5 招（17、19、21、23、25 級）。
// - 轉職路線：補到 6 招（11、18、21、24 級；轉職以後的技能等級照 promote.js 的 R.skillNeedLv 往後挪）。
//   鬼武者、外修者、式神使原本 3 招，也補到 6 招。
// - 奏域師（諧鳴奏域派系「瑟蘭派」）照《法術統整》第四項第一節：奏域裡的四種諧鳴加成——鎮頻（壓制）、共振（增幅）、轉調（轉換元素）、定頻（必中）。
// 格式和 skillbook.js 一樣：[id, 名字, 職業, 等級, 冷卻, 魔力, 型, 參數, 說明, 轉職路線]。放在 skillbook.js、skillbook2.js、classes2b.js 後面。
(function (R) {
  const L = R.SKILL_LIB; if (!L) return;
  const NEW = [
    // ---------- 基本技能 ----------
    // 吟遊詩人
    ['bd_sonata', '奏鳴曲', 'bard', 17, 14, 18, 'combo', { parts: [['nova', { r: 3.6, k: 1.2, color: '#FFB8E0' }], ['buff', { t: 6, dmg: 1.15, color: '#FFB8E0' }, 200]] }, '三個樂章一口氣彈完：震傷周圍的敵人，6 秒內傷害 +15%。'],
    ['bd_canon', '卡農', 'bard', 19, 8, 14, 'shots', { burst: 4, gap: 150, n: 2, spread: 0.3, k: 0.9, kind: 'holy', sp: 21, pierce: 1 }, '同一段旋律追著彈四次，一層疊一層。'],
    ['bd_silence', '休止符', 'bard', 21, 14, 16, 'mark', { range: 11, r: 3.4, t: 6, stun: 1.6, k: 0.5 }, '一個長長的休止符：準心附近的敵人停住 1.6 秒，6 秒內受到的傷害 +30%。'],
    ['bd_crescendo', '漸強', 'bard', 23, 10, 16, 'wave', { n: 7, step: 1.8, r: 1.8, k: 1, kb: 1.5, gap: 70, fx: 'ring', color: '#FFD0F0' }, '音量一路往前漸強，一圈比一圈遠。'],
    ['bd_encore', '安可', 'bard', 25, 22, 10, 'heal', { pct: 0.3, allies: 0.3, mp: 0.3, color: '#FFE8A0' }, '觀眾喊安可：你和隊友回復 30% 生命，你再回復 30% 魔力。'],
    // 召喚師
    ['sn_hound', '召喚・獵犬', 'summoner', 17, 14, 16, 'pet', { beast: 'okuriinu', n: 2, t: 14, k: 0.8, color: '#A88A5A' }, '捏出兩隻追得很緊的獵犬，14 秒。'],
    ['sn_swarm', '召喚・蟲群', 'summoner', 19, 12, 16, 'storm', { t: 6, gap: 0.4, r: 8, hitR: 1.3, k: 0.7, fx: 'spark', color: '#8AC88A' }, '用執念捏出一群小蟲，6 秒內一直咬附近的敵人。'],
    ['sn_link', '共感', 'summoner', 21, 18, 12, 'buff', { t: 10, dmg: 1.2, regen: 0.015, color: '#A8C8A8' }, '和召喚物共享感官：10 秒內傷害 +20%、每秒回復 1.5% 生命。'],
    ['sn_titan', '召喚・石巨人', 'summoner', 23, 22, 30, 'pet', { beast: 'nurikabe', t: 14, k: 2, speed: 3, rate: 1.1, kb: 3, color: '#8A8476' }, '捏出一尊比巨像更大的石巨人，14 秒。'],
    ['sn_legion', '召喚・軍勢', 'summoner', 25, 24, 34, 'pet', { beast: 'okuriinu', n: 5, t: 10, k: 0.6, color: '#C8A878' }, '一口氣捏出五隻泥狼組成的軍勢。'],
    // 術陣師
    ['ry_mirror', '反射陣', 'arraymage', 17, 16, 14, 'buff', { t: 5, kekkai: 1, def: 0.2, color: '#7AC8E8' }, '腳下畫反射陣：5 秒內擋下投射物、受到的傷害 −20%。'],
    ['ry_gravity', '重力陣', 'arraymage', 19, 12, 16, 'pull', { range: 10, r: 4.2, t: 3, k: 0.5 }, '準心處的重力陣把敵人吸到中間 3 秒。'],
    ['ry_frost', '法陣・霜', 'arraymage', 21, 12, 16, 'at', { range: 10, r: 3.4, k: 1.2, root: 2, delay: 500, fx: 'ring', color: '#9AD8FF' }, '準心處畫霜陣，半秒後凍住範圍內的敵人 2 秒。'],
    ['ry_star', '星陣', 'arraymage', 23, 14, 22, 'at', { range: 11, r: 2.4, k: 1.4, waves: 5, scatter: 2.5, gap: 180, delay: 400, fx: 'pillar', color: '#BFE8FF' }, '五角星的五個頂點依序落下光柱。'],
    ['ry_eternal', '永劫陣', 'arraymage', 25, 18, 26, 'zone', { zone: 'lava', range: 9, r: 3.2, life: 10, k: 0.7 }, '準心處畫一個 10 秒的焚陣，一直燒踩在上面的敵人。'],
    // 附魔師
    ['en_gale', '附魔・風', 'enchanter', 17, 14, 10, 'buff', { t: 8, speed: 1.2, crit: 0.1, color: '#BFF0D0' }, '把風的咒文刻進鞋底和刀身：8 秒內移動 +20%、暴擊率 +10%。'],
    ['en_cross', '十字刻印', 'enchanter', 19, 8, 12, 'xslash', { n: 2, spread: 1.57, len: 4, width: 0.7, k: 1.6, color: '#FFB86A' }, '刻出一個發光的十字，兩刀交錯斬出。'],
    ['en_drainblade', '吸魔刃', 'enchanter', 21, 14, 12, 'buff', { t: 8, vamp: 0.08, dmg: 1.1, color: '#C86AA8' }, '在刀刃刻上吸魔的咒文：8 秒內造成傷害的 8% 回復成生命。'],
    ['en_quake', '地裂斬', 'enchanter', 23, 10, 16, 'wave', { n: 6, step: 1.8, r: 1.6, k: 1.2, kb: 1, gap: 70, fx: 'ring', color: '#C8A878' }, '刀插進地面，咒文沿著地面一路裂過去。'],
    ['en_masterwork', '傑作', 'enchanter', 25, 24, 22, 'buff', { t: 8, dmg: 1.35, burn: 1, frost: 1, shock: 1, color: '#FFFFFF' }, '一生一次的刻印：8 秒內焰、霜、雷一起附上，傷害 +35%。'],
    // 符卷師
    ['sc_earth', '岩卷', 'scroll', 17, 10, 14, 'at', { range: 10, r: 3, k: 1.6, stun: 1, delay: 80, fx: 'boom', color: '#C8A878' }, '撕開岩卷：準心處地面隆起，敵人暈眩。'],
    ['sc_mirror', '鏡卷', 'scroll', 19, 12, 10, 'parry', { t: 1 }, '撕開鏡卷：1 秒內的攻擊全部彈回去。'],
    ['sc_chain', '連鎖雷卷', 'scroll', 21, 9, 14, 'chainx', { n: 5, jump: 6, k: 1.2, falloff: 0.85, range: 12 }, '撕開雷卷：雷在敵人之間跳五次。'],
    ['sc_storm', '暴風卷', 'scroll', 23, 14, 20, 'storm', { t: 5, gap: 0.3, r: 9, hitR: 1.4, k: 0.8, fx: 'spark', color: '#BFF0D0' }, '撕開暴風卷：5 秒內風刃到處亂割。'],
    ['sc_grand', '大卷軸', 'scroll', 25, 20, 28, 'combo', { parts: [['at', { range: 11, r: 4, k: 2.4, delay: 300, fx: 'boom', color: '#FF8A4A', burn: 1 }], ['at', { range: 11, r: 4, k: 1, root: 2, delay: 100, fx: 'ring', color: '#9AD8FF' }, 500]] }, '整張大卷軸攤開：先炸、再凍住。'],
    // 武術家
    ['m_dragon', '龍爪手', 'monk', 17, 8, 12, 'line', { len: 5, width: 1.2, k: 2.4, kb: 2, color: '#FFD27A' }, '五指成爪往前一抓，抓出一道直線。'],
    ['m_iron', '金鐘罩', 'monk', 19, 16, 12, 'guard', { t: 1.5, color: '#FFD27A' }, '運氣成罩：1.5 秒內不受傷。'],
    ['m_storm', '旋風拳', 'monk', 21, 12, 14, 'aura', { t: 4, r: 3, gap: 0.25, k: 0.6, color: '#FFB86A' }, '拳風捲成旋風，4 秒內一直打周圍。'],
    ['m_leap', '飛燕', 'monk', 23, 10, 14, 'jumpx', { range: 9, dur: 0.6, end: { r: 3.2, k: 2, stun: 0.8, color: '#FFD27A' } }, '像燕子一樣躍起，踏在準心處震暈周圍。'],
    ['m_final', '百步神拳', 'monk', 25, 14, 20, 'shots', { k: 4, pierce: 8, kind: 'eorb', sp: 28, life: 0.9 }, '隔著百步的一拳：一道拳勁穿過一整排。'],

    // ---------- 轉職路線 ----------
    // 詠嘆詩人
    ['ai_aria', '詠嘆調', 'bard', 11, 14, 18, 'heal', { pct: 0.2, allies: 0.3, shield: 0.1, color: '#FFE8A0' }, '高音的詠嘆調：你和隊友回復生命，多一層薄護盾。', 'aria'],
    ['ai_sanct', '聖詠', 'bard', 18, 18, 22, 'zone', { zone: 'sanct', self: 1, r: 5, life: 10, k: 0.35 }, '腳下展開 10 秒的聖詠圈：回復生命、灼傷敵人。', 'aria'],
    ['ai_choir', '合唱', 'bard', 21, 20, 18, 'buff', { t: 12, dmg: 1.15, def: 0.15, regen: 0.01, color: '#FFE8A0' }, '整支隊伍一起唱：12 秒內傷害 +15%、受到的傷害 −15%、慢慢回血。', 'aria'],
    ['ai_angel', '天使之聲', 'bard', 24, 30, 30, 'combo', { parts: [['heal', { pct: 0.5, allies: 0.5, color: '#FFF2C0' }], ['guard', { t: 1.2, cleanse: 1, color: '#FFF2C0' }, 0]] }, '讓人想起天使的歌聲：回復一半生命、1.2 秒內不受傷、解除不良狀態。', 'aria'],
    // 戰鼓手
    ['dm_roll', '滾奏', 'bard', 11, 9, 14, 'nova', { r: 3.2, k: 0.6, waves: 5, gap: 120, color: '#FF9A6A' }, '鼓棒滾奏：一圈一圈快速震周圍的敵人。', 'drummer'],
    ['dm_war', '戰陣鼓', 'bard', 18, 16, 14, 'buff', { t: 10, dmg: 1.25, crit: 0.1, color: '#FF9A6A' }, '戰陣鼓點：10 秒內傷害 +25%、暴擊率 +10%。', 'drummer'],
    ['dm_quake', '震地鼓', 'bard', 21, 10, 16, 'wave', { n: 7, step: 1.8, r: 1.8, k: 1.1, kb: 2, gap: 60, fx: 'ring', color: '#FF9A6A' }, '鼓聲沿著地面一路震過去。', 'drummer'],
    ['dm_finale', '終章大鼓', 'bard', 24, 18, 26, 'nova', { r: 5, k: 2.6, kb: 4, stun: 1, color: '#FF5A3A' }, '用盡全力的最後一擊：周圍的敵人重傷、被震飛暈眩。', 'drummer'],
    // 奏域師（瑟蘭派）：諧鳴的四種加成
    ['se_suppress', '鎮頻', 'bard', 11, 14, 16, 'mark', { range: 11, r: 4, t: 6, slow: 3, stun: 0.8, k: 0.3 }, '在奏域裡改寫對手法術的「m」頻，讓它不穩定：準心附近的敵人停頓、變慢，6 秒內受到的傷害 +30%。', 'serane'],
    ['se_amp', '共振', 'bard', 18, 18, 14, 'buff', { t: 8, dmg: 1.3, color: '#FFB8E0' }, '改寫自己法術的「k」「f」頻：施法前花得少、施法後放得大——8 秒內傷害 +30%。', 'serane'],
    ['se_shift', '轉調', 'bard', 21, 14, 20, 'combo', { parts: [['at', { range: 10, r: 3, k: 1.4, delay: 200, burn: 1, fx: 'boom', color: '#FF8A4A' }], ['at', { range: 10, r: 3, k: 1.2, root: 1.5, delay: 100, fx: 'ring', color: '#9AD8FF' }, 350], ['at', { range: 10, r: 3, k: 1.2, stun: 0.5, delay: 100, fx: 'pillar', color: '#E8E07A' }, 700]] }, '改寫「a」「o」頻，把魔力帶動的元素換來換去：焰、霜、雷輪流落在準心處。', 'serane'],
    ['se_lock', '定頻', 'bard', 24, 12, 20, 'shots', { n: 8, spread: 6.28, k: 1.2, homing: 9, kind: 'holy', sp: 18, life: 2.4 }, '改寫「r」「e」「l」「y」頻：八道音波必定追著目標，無視方向和障礙。', 'serane'],
    // 萬獸師
    ['bl_alpha', '頭狼', 'summoner', 11, 16, 20, 'pet', { beast: 'okuriinu', t: 16, k: 1.4, color: '#C8A878' }, '捏出一隻特別大的頭狼，16 秒。', 'beastlord'],
    ['bl_stampede', '奔騰', 'summoner', 18, 12, 18, 'wave', { n: 6, step: 1.8, r: 1.8, k: 1.2, kb: 2.5, gap: 70, fx: 'ring', color: '#C8A878' }, '一群泥做的野獸往前狂奔，撞翻一路的敵人。', 'beastlord'],
    ['bl_feral', '野性', 'summoner', 21, 18, 14, 'buff', { t: 10, dmg: 1.2, speed: 1.15, vamp: 0.04, color: '#C8A878' }, '和獸群一起野起來：10 秒內傷害 +20%、移動 +15%、吸血 4%。', 'beastlord'],
    ['bl_zoo', '百獸夜行', 'summoner', 24, 26, 34, 'pet', { beast: 'okuriinu', n: 6, t: 12, k: 0.6, color: '#C8A878' }, '六隻土狼一次放出去。', 'beastlord'],
    // 靈媒師
    ['md_wail', '哀嚎', 'summoner', 11, 12, 14, 'nova', { r: 4, k: 1, stun: 1, color: '#B8A8E8' }, '怨靈一起哀嚎：周圍的敵人嚇得愣住。', 'medium'],
    ['md_possess', '憑依', 'summoner', 18, 14, 16, 'mark', { range: 10, r: 3, t: 8, slow: 3, k: 0.6 }, '讓怨靈附在準心附近的敵人身上：8 秒內變慢、受到的傷害 +30%。', 'medium'],
    ['md_soulfire', '魂火', 'summoner', 21, 9, 14, 'shots', { n: 5, spread: 0.8, k: 1.1, homing: 6, kind: 'spirit', sp: 15, life: 2 }, '五團魂火追著敵人燒過去。', 'medium'],
    ['md_requiem', '鎮魂', 'summoner', 24, 18, 24, 'drain', { range: 11, r: 4, k: 2.4, heal: 0.6 }, '把附近的魂一口氣收回來：重傷敵人，傷害的 60% 變成你的生命。', 'medium'],
    // 遺跡馴獸師
    ['tm_sentry', '泥偶哨兵', 'summoner', 11, 14, 16, 'turret', { t: 10, rate: 0.8, reach: 9, k: 0.6, look: 'tree', color: '#8AC88A' }, '在準心處捏一尊遺跡生物模樣的泥偶，10 秒內對靠近的敵人吐泥彈。', 'tamer'],
    ['tm_mimic', '擬態', 'summoner', 18, 18, 22, 'pet', { beast: 'floor', n: 3, t: 12, k: 0.7, color: '#8AC88A' }, '捏出三隻這一層遺跡生物的樣子，12 秒。', 'tamer'],
    ['tm_herd', '趕獸', 'summoner', 21, 12, 14, 'pull', { range: 11, r: 5, t: 2, k: 0.6 }, '吹一聲長長的口哨，把一群遺跡生物趕到準心處。', 'tamer'],
    ['tm_king', '群主', 'summoner', 24, 24, 30, 'pet', { beast: 'floor', n: 4, t: 15, k: 1, color: '#8AC88A' }, '馴服整群：捏出四隻這一層的遺跡生物，15 秒。', 'tamer'],
    // 式神使（召喚師）
    ['ss_paper', '紙吹雪', 'summoner', 18, 14, 18, 'storm', { t: 5, gap: 0.3, r: 8, hitR: 1.3, k: 0.7, fx: 'spark', color: '#F2E8D0' }, '一把紙式神撒出去，5 秒內到處割。', 'shikigami'],
    ['ss_fox', '狐式神', 'summoner', 21, 16, 20, 'pet', { beast: 'okuriinu', n: 2, t: 14, k: 0.9, color: '#F2E8D0' }, '折兩隻狐狸式神，14 秒。', 'shikigami'],
    ['ss_ryu', '紙龍', 'summoner', 24, 16, 26, 'line', { len: 12, width: 1.6, k: 3, delay: 300, color: '#F2E8D0' }, '折一條紙龍，一路衝過去。', 'shikigami'],
    // 大陣師
    ['ga_quad', '四方陣', 'arraymage', 11, 12, 18, 'at', { range: 11, r: 2.6, k: 1.4, waves: 4, scatter: 3, gap: 150, delay: 400, fx: 'ring', color: '#9AE8FF' }, '在準心周圍的四個方位畫陣，依序爆開。', 'grandarray'],
    ['ga_mega', '巨陣・焰', 'arraymage', 18, 16, 22, 'zone', { zone: 'lava', range: 10, r: 4.2, life: 8, k: 0.8 }, '準心處畫一個巨大的焰陣，8 秒內一直燒。', 'grandarray'],
    ['ga_cascade', '連陣', 'arraymage', 21, 14, 24, 'at', { range: 12, r: 3, k: 1.6, waves: 6, scatter: 4, gap: 160, delay: 300, fx: 'pillar', color: '#9AE8FF' }, '六個法陣接連在準心附近爆開。', 'grandarray'],
    ['ga_final', '天陣', 'arraymage', 24, 22, 34, 'at', { range: 12, r: 7, k: 4.2, delay: 1400, fx: 'ring', color: '#FFFFFF' }, '畫一個覆蓋整片地面的天陣，蓄力 1.4 秒後爆開。', 'grandarray'],
    // 結界師
    ['wd_seal', '封鎖結界', 'arraymage', 11, 12, 14, 'mark', { range: 10, r: 3.4, t: 6, slow: 4, k: 0.3 }, '在準心處張結界：裡面的敵人 6 秒內變慢、受到的傷害 +30%。', 'warder'],
    ['wd_dome', '穹頂', 'arraymage', 18, 20, 18, 'combo', { parts: [['guard', { t: 1.2, color: '#FFE8A0' }], ['heal', { shield: 0.35, color: '#FFE8A0' }, 100]] }, '張開穹頂結界：1.2 秒內不受傷，再多一層護盾。', 'warder'],
    ['wd_pillars', '結界柱', 'arraymage', 21, 16, 18, 'turret', { t: 12, rate: 0.7, reach: 9, k: 0.6, look: 'lamp', color: '#FFE8A0' }, '在準心處立一根結界柱，12 秒內打靠近的敵人。', 'warder'],
    ['wd_sanctum', '聖域結界', 'arraymage', 24, 24, 28, 'zone', { zone: 'sanct', self: 1, r: 6, life: 12, k: 0.5 }, '腳下張開 12 秒的大結界：裡面回血、灼傷敵人。', 'warder'],
    // 艾達諾拉的傳人
    ['ed_sup', '壓制圈', 'arraymage', 11, 12, 14, 'mark', { range: 10, r: 3.6, t: 8, slow: 3, stun: 0.6, k: 0.4 }, '準心處放一個抑制圈：敵人停頓、變慢 8 秒。', 'eidanora'],
    ['ed_vortex', '漩渦陣', 'arraymage', 18, 14, 18, 'pull', { range: 11, r: 5, t: 4, k: 0.6 }, '抑制圈轉成漩渦，把敵人往中間拉 4 秒。', 'eidanora'],
    ['ed_perma', '常駐陣', 'arraymage', 21, 16, 20, 'zone', { zone: 'trap', range: 9, r: 1.6, life: 40, k: 3.2, count: 5 }, '畫五個不會散的感應陣，40 秒內都有效。', 'eidanora'],
    ['ed_master', '艾達諾拉的閉環', 'arraymage', 24, 24, 32, 'combo', { parts: [['pull', { range: 11, r: 5, t: 2, k: 0.4 }], ['at', { range: 11, r: 5, k: 3.6, delay: 200, fx: 'ring', color: '#7AC8E8' }, 2100]] }, '先把敵人吸到圈中，兩秒後整個閉環爆開。', 'eidanora'],
    // 刻印師
    ['rs_glyph', '光紋', 'enchanter', 11, 14, 12, 'buff', { t: 10, dmg: 1.15, crit: 0.08, color: '#FFE8A0' }, '在武器刻一道會發光的紋：10 秒內傷害 +15%、暴擊率 +8%。', 'runesmith'],
    ['rs_armor', '刻印甲', 'enchanter', 18, 18, 14, 'heal', { shield: 0.4, color: '#C8B898' }, '把整套護甲刻滿咒文：得到吸收 40% 生命的護盾。', 'runesmith'],
    ['rs_explode', '爆紋', 'enchanter', 21, 12, 18, 'nova', { r: 3.6, k: 2.2, burn: 1, color: '#FF8A4A' }, '讓刻在地上的紋一起炸開：周圍重傷、燃燒。', 'runesmith'],
    ['rs_eternal', '永刻', 'enchanter', 24, 24, 22, 'buff', { t: 15, dmg: 1.25, burn: 1, frost: 1, crit: 0.1, color: '#FFFFFF' }, '刻得最深的一次：15 秒內焰與霜一起附上，傷害 +25%、暴擊率 +10%。', 'runesmith'],
    // 魔劍士
    ['sb_dash', '魔劍突', 'enchanter', 11, 8, 12, 'dash', { len: 6, dur: 0.15, k: 1.6 }, '帶著附魔的劍衝出去，撞到的敵人受傷。', 'spellblade'],
    ['sb_cross', '魔劍十字', 'enchanter', 18, 10, 16, 'xslash', { n: 2, spread: 1.57, len: 5, width: 0.8, k: 2.2, color: '#FFB86A' }, '附魔的劍交錯斬出兩道劍光。', 'spellblade'],
    ['sb_blade', '劍舞', 'enchanter', 21, 14, 18, 'dance', { n: 5, range: 8, k: 1.2, crit: 0.3, gap: 130 }, '在敵人之間閃五下，每一下都帶著附魔。', 'spellblade'],
    ['sb_final', '魔劍・終', 'enchanter', 24, 20, 28, 'line', { len: 14, width: 2, k: 5, delay: 500, color: '#FF5A3A' }, '把所有咒文灌進一劍：蓄力半秒，斬出一道長長的劍光。', 'spellblade'],
    // 恩特安的傳人
    ['et_pierce', '穿魔', 'enchanter', 11, 8, 12, 'shots', { k: 2.6, pierce: 5, kind: 'hama', sp: 30, life: 0.8 }, '一道穿過魔力罩的刺擊打出去，穿五隻。', 'entian'],
    ['et_gamble', '博弈', 'enchanter', 18, 16, 10, 'buff', { t: 8, crit: 0.4, def: -0.2, color: '#FFFFFF' }, '賭一把：8 秒內暴擊率 +40%，但受到的傷害 +20%。', 'entian'],
    ['et_break', '破盾', 'enchanter', 21, 12, 12, 'mark', { range: 10, r: 3, t: 10, k: 0.6 }, '把準心附近敵人的魔力罩整片撕掉：10 秒內受到的傷害 +30%。', 'entian'],
    ['et_last', '最後的刻印', 'enchanter', 24, 16, 24, 'xslash', { n: 3, spread: 1.05, len: 5, width: 0.8, k: 3, color: '#FFFFFF' }, '三刀交錯，刀刀破罩。', 'entian'],
    // 抄寫師
    ['sr_rapid', '速寫連發', 'scroll', 11, 7, 14, 'shots', { burst: 6, gap: 70, k: 0.7, kind: 'orb', sp: 24 }, '邊寫邊撕，六張卷軸連發。', 'scribe'],
    ['sr_book', '卷軸本', 'scroll', 18, 16, 20, 'turret', { t: 10, rate: 0.5, reach: 10, k: 0.6, kind: 'orb', look: 'lamp', color: '#E8D8A8' }, '把一整本卷軸攤開放在準心處，10 秒內自己一張一張放出去。', 'scribe'],
    ['sr_copyfire', '複寫・焰', 'scroll', 21, 12, 20, 'at', { range: 10, r: 3, k: 1.2, waves: 4, scatter: 2, gap: 150, delay: 80, burn: 1, fx: 'boom', color: '#FF8A4A' }, '把火卷複寫四份，一起撕開。', 'scribe'],
    ['sr_master', '萬卷', 'scroll', 24, 20, 30, 'shots', { n: 20, spread: 6.28, k: 0.9, kind: 'orb', sp: 20 }, '身上所有的卷軸一次全撒出去。', 'scribe'],
    // 封印師
    ['sl_bind', '縛符', 'scroll', 11, 12, 14, 'zone', { zone: 'trap', range: 9, r: 1.6, life: 25, k: 1.6, count: 3 }, '貼三張縛符在地上，踩到的敵人被定住。', 'sealer'],
    ['sl_banish', '破邪符', 'scroll', 18, 10, 16, 'at', { range: 10, r: 3.2, k: 2.4, delay: 150, fx: 'pillar', color: '#F2E6A0' }, '破邪符從天落下，重傷準心處的敵人。', 'sealer'],
    ['sl_wall', '符陣', 'scroll', 21, 18, 16, 'buff', { t: 8, kekkai: 1, def: 0.3, regen: 0.01, color: '#F2E6A0' }, '四面貼符：8 秒內擋投射物、受到的傷害 −30%、慢慢回血。', 'sealer'],
    ['sl_grand', '大封印', 'scroll', 24, 22, 26, 'mark', { range: 11, r: 4.5, t: 8, stun: 2.5, k: 0.6 }, '準心附近的敵人全部封住 2.5 秒，8 秒內受到的傷害 +30%。', 'sealer'],
    // 諾克薩的傳人
    ['nx_delay', '延遲卷', 'scroll', 11, 10, 16, 'at', { range: 10, r: 3, k: 2.6, delay: 1500, fx: 'boom', color: '#FF8A4A' }, '把卷軸丟出去，1.5 秒後才炸——炸得更大。', 'noxa'],
    ['nx_mine', '預載地雷', 'scroll', 18, 14, 18, 'zone', { zone: 'trap', range: 9, r: 1.4, life: 30, k: 3, count: 4 }, '預先寫好的四張地雷卷，踩到就炸。', 'noxa'],
    ['nx_auto', '自動施放', 'scroll', 21, 18, 22, 'turret', { t: 12, rate: 0.45, reach: 10, k: 0.7, kind: 'orb', look: 'lamp', color: '#C8A85A' }, '設好條件的卷軸，12 秒內敵人一靠近就自己發動。', 'noxa'],
    ['nx_doom', '終焉預載', 'scroll', 24, 24, 34, 'combo', { parts: [['shots', { n: 12, spread: 6.28, k: 0.9, kind: 'orb', sp: 18 }], ['at', { range: 11, r: 4, k: 2.6, delay: 200, fx: 'boom', color: '#FF5A3A' }, 600]] }, '先放出一圈預載的卷軸，再在準心處引爆最後一張。', 'noxa'],
    // 拳聖
    ['fs_tiger', '猛虎硬爬山', 'monk', 18, 10, 14, 'line', { len: 5, width: 1.4, k: 3, kb: 3, stun: 0.6, color: '#FFD27A' }, '踏步出拳，一路把敵人撞飛。', 'fistsaint'],
    ['fs_thousand', '千手', 'monk', 21, 14, 18, 'nova', { r: 3, k: 0.5, waves: 8, gap: 90, color: '#FFD27A' }, '一瞬間出了上千拳：周圍的敵人被打八下。', 'fistsaint'],
    ['fs_heaven', '天地一拳', 'monk', 24, 20, 26, 'at', { range: 4, r: 3.6, k: 4.5, stun: 1.5, delay: 200, fx: 'boom', color: '#FFD27A' }, '把全身的力氣收進一拳，打在眼前的地上。', 'fistsaint'],
    // 棍僧
    ['sm_pole', '長棍突', 'monk', 18, 8, 12, 'line', { len: 6, width: 0.8, k: 2.6, kb: 2, color: '#C8A878' }, '長棍往前一突，打穿一排。', 'staffmonk'],
    ['sm_dragon', '龍捲棍', 'monk', 21, 14, 16, 'aura', { t: 4, r: 3.4, gap: 0.2, k: 0.6, color: '#C8A878' }, '棍子轉成龍捲，4 秒內一直打周圍。', 'staffmonk'],
    ['sm_mountain', '劈山棍', 'monk', 24, 16, 22, 'jumpx', { range: 9, dur: 0.6, end: { r: 3.8, k: 3, stun: 1.2, color: '#C8A878' } }, '躍起，長棍從天上劈下來。', 'staffmonk'],
    // 內修者（武術家）
    ['in_wave', '氣浪', 'monk', 11, 10, 14, 'wave', { n: 5, step: 1.8, r: 1.6, k: 1.1, kb: 2, gap: 70, fx: 'ring', color: '#FFD27A' }, '把內勁打進地面，氣浪一路推出去。', 'inner'],
    ['in_breath', '龜息', 'monk', 18, 20, 0, 'heal', { pct: 0.3, mp: 0.3 }, '閉氣調息：回復 30% 生命、30% 魔力。', 'inner'],
    ['in_iron', '鐵骨功', 'monk', 21, 18, 12, 'buff', { t: 10, def: 0.35, dmg: 1.1, color: '#FFD27A' }, '把魔力質注進骨頭：10 秒內受到的傷害 −35%、傷害 +10%。', 'inner'],
    ['in_burst', '內勁爆發', 'monk', 24, 16, 22, 'nova', { r: 4, k: 3, kb: 4, color: '#FFD27A' }, '把積在體內的魔力一口氣爆開。', 'inner'],
    // 鬼武者（戰士）
    ['on_blood', '鬼血', 'warrior', 18, 16, 12, 'buff', { t: 8, dmg: 1.3, vamp: 0.06, color: '#C83A3A' }, '鬼面的惡意吸著血：8 秒內傷害 +30%、吸血 6%。', 'onimusha'],
    ['on_cleave', '鬼哭斬', 'warrior', 21, 10, 16, 'arc', { range: 3.8, arc: 3.6, k: 2.8, kb: 2, stun: 0.6 }, '戴著鬼面橫掃一刀，周圍的敵人嚇得愣住。', 'onimusha'],
    ['on_rage', '百鬼夜行', 'warrior', 24, 24, 24, 'combo', { parts: [['buff', { t: 8, dmg: 1.4, def: -0.15, color: '#C83A3A' }], ['nova', { r: 4.5, k: 2.4, stun: 1, color: '#8A2A2A' }, 150]] }, '讓鬼面完全上身：周圍的敵人重傷暈眩，8 秒內傷害 +40%（受到的傷害 +15%）。', 'onimusha'],
    // 外修者（術士）
    ['wx_pulse', '氣脈', 'mage', 18, 18, 0, 'heal', { shield: 0.25, mp: 0.2, color: '#9AE8FF' }, '獲得可吸收相當於最大生命 25% 傷害的護盾，回復最大魔力的 20%。', 'waixiu'],
    ['wx_rain', '氣彈雨', 'mage', 21, 10, 16, 'shots', { burst: 4, gap: 80, n: 3, spread: 0.5, k: 0.9, kind: 'eorb', sp: 26 }, '將魔力罩化成氣彈，連射四輪，每輪三發。', 'waixiu'],
    ['wx_storm', '氣旋', 'mage', 24, 16, 22, 'aura', { t: 5, r: 3.6, gap: 0.2, k: 0.7, color: '#9AE8FF' }, '將魔力罩化為氣旋，持續 5 秒傷害周圍敵人。', 'waixiu']
  ];
  NEW.forEach(([id, name, cls, lv, cd, mp, type, p, desc, adv]) => {
    if (L[id]) return;
    L[id] = { id, name, cls, lv, cd, mp, type, p, desc, adv };
    R.SKILLS[id] = { name, cd, mp, desc };
  });
})(window.R);
