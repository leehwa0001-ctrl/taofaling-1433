// 新職業的技能、召喚物、轉職的被動、大招（職業本身在 classes2.js）
// - 技能照 skillbook.js 的「型」組；召喚師多一個新的型「pet」：用遺跡生物的點陣圖捏出一隻會追著敵人咬的召喚物（照霍克的「土」狗）。
// - 附魔師的附魔：buff 多 frost（打中的敵人變慢）、shock（打中的時候電一下旁邊的敵人）。
// 放在 skillbook2.js、ult.js、passives.js 後面。
(function (R) {
  const W = () => R.W, rnd = Math.random, dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const T = R.SKILL_TYPES, LIB = R.SKILL_LIB, K = R.SKILL_KIT;
  if (!T || !LIB) return;
  // ---------- 召喚物 ----------
  T.pet = (s, P, w, pw) => {
    const run = w.run, n = s.n || 1, mul = (P.petMul || 1);
    let ids = s.beast === 'floor' ? (run.grade.pool || []).filter(id => R.ENEMIES[id] && !R.ENEMIES[id].boss && !R.ENEMIES[id].elite && !R.ENEMIES[id].fly) : [s.beast || 'okuriinu'];
    if (!ids.length || !R.ENEMIES[ids[0]]) ids = ['okuriinu'];
    for (let k = 0; k < n; k++) {
      const id = ids[Math.floor(rnd() * ids.length)], m = R.makeBeast(id), a = (P.aimA || 0) + (k - (n - 1) / 2) * 0.9;
      const pet = { x: P.x + Math.sin(a) * 1.4, z: P.z + Math.cos(a) * 1.4, t: rnd(), cd: 0, left: (s.t || 12) * (P.petLife || 1) };
      if (R.nearestFloor) { const q = R.nearestFloor(pet.x, pet.z); pet.x = q[0]; pet.z = q[1]; }
      const g = m.g; if (s.scale) g.scale.setScalar(s.scale); g.position.set(pet.x, 0, pet.z); w.scene.add(g);
      R.fx('poof', pet.x, 0.6, pet.z, { color: s.color || '#C8A878', n: 14 });
      w.dyn.push(dt => {
        if (W().run !== run || P.dead) { w.scene.remove(g); return false; }
        pet.left -= dt; pet.t += dt; pet.cd -= dt;
        if (pet.left <= 0) { R.fx('poof', pet.x, 0.6, pet.z, { color: s.color || '#C8A878', n: 12 }); w.scene.remove(g); return false; }
        let tg = null, bd = 1e9; w.enemies.forEach(e => { if (e.dead || e.under || e.invuln) return; const d = dist(e, pet); if (d < bd && dist(e, P) < 15) { bd = d; tg = e; } });
        const goal = tg || { x: P.x - Math.sin(P.aimA || 0) * 1.6, z: P.z - Math.cos(P.aimA || 0) * 1.6 }, dx = goal.x - pet.x, dz = goal.z - pet.z, d = Math.hypot(dx, dz), reach = tg ? 0.9 + tg.def.size * 0.45 : 1.2;
        let moving = false;
        if (d > reach) { const sp = Math.min((s.speed || 6.5) * dt, d - reach); pet.x += dx / d * sp; pet.z += dz / d * sp; if (R.collide) R.collide(pet, 0.35); moving = true; }
        else if (tg && pet.cd <= 0) { pet.cd = s.rate || 0.8; R.hurtEnemy(tg, pw * (s.k || 0.6) * mul, { primary: false, kb: s.kb || 0.4 }); R.fx('spark', tg.x, 0.8, tg.z, { a: Math.atan2(dx, dz) }); }
        g.position.set(pet.x, 0, pet.z); if (R.animBeast) R.animBeast(m, id, pet.t, moving);
        return true;
      });
    }
    if (P.petHeal) R.healP(P.hpMax * P.petHeal, true);
  };
  // ---------- 附魔：霜、雷 ----------
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const P = W().P, r = he0(e, raw, o);
    try {
      if (P && P.sb && o && o.primary && e && !e.dead) {
        const L = Object.values(P.sb);
        if (L.some(b => b.frost)) { e.st.slow = Math.max(e.st.slow || 0, 1.5); }
        if (L.some(b => b.shock) && rnd() < 0.35) { const n2 = W().enemies.find(x => x !== e && !x.dead && dist(x, e) < 4); if (n2) { R.fx('spark', n2.x, 1, n2.z, { a: rnd() * 6, crit: true }); he0(n2, raw * 0.6, { primary: false }); } }
      }
    } catch (err) { }
    return r;
  };
  // ---------- 技能：[id, 名字, 職業, 等級, 冷卻, 魔力, 型, 參數, 說明, 轉職路線] ----------
  const NEW = [
    // 吟遊詩人
    ['bd_anthem', '激昂之歌', 'bard', 1, 12, 10, 'buff', { t: 8, dmg: 1.15, speed: 1.1, color: '#FFB8E0' }, '彈一段激昂的曲子：8 秒內傷害 +15%、移動 +10%。'],
    ['bd_chord', '和弦', 'bard', 2, 5, 8, 'shots', { n: 3, spread: 0.35, k: 0.9, kind: 'holy', sp: 20, pierce: 1 }, '一次撥三條弦，三道音波扇形飛出去。'],
    ['bd_requiem', '安魂曲', 'bard', 3, 14, 18, 'heal', { pct: 0.2, allies: 0.25, color: '#FFD0F0' }, '溫柔的曲子：你回復 20% 生命，隊友回復 25%。'],
    ['bd_discord', '不協和音', 'bard', 4, 9, 12, 'nova', { r: 3.6, k: 1, stun: 1.2, color: '#E87AB8' }, '刺耳的不協和音：周圍的敵人暈眩。'],
    ['bd_lullaby', '搖籃曲', 'bard', 5, 12, 14, 'mark', { range: 10, r: 3.2, t: 5, slow: 4, stun: 1, k: 0.3 }, '在準心處響起搖籃曲：範圍內的敵人睡著一下、變慢、受到的傷害變多。'],
    ['bd_blast', '音爆', 'bard', 6, 7, 12, 'line', { len: 9, width: 1.6, k: 2, kb: 3, color: '#FFD0F0' }, '把一個重音打成直線的音爆，震退敵人。'],
    ['bd_rondo', '輪旋曲', 'bard', 8, 14, 14, 'orbit', { t: 8, n: 3 }, '三個音符繞著你轉 8 秒，打到靠近的敵人。'],
    ['bd_drum', '戰鼓', 'bard', 10, 16, 12, 'buff', { t: 8, crit: 0.15, def: 0.2, color: '#FF9A6A' }, '敲起戰鼓：8 秒內暴擊率 +15%、受到的傷害 −20%。'],
    ['bd_echo', '回音', 'bard', 12, 10, 14, 'shots', { burst: 3, gap: 120, k: 1.1, kind: 'holy', sp: 22, pierce: 2 }, '同一段旋律彈三次，回音一波一波追上去。'],
    ['bd_finale', '終曲', 'bard', 15, 16, 24, 'at', { range: 11, r: 4, k: 0.9, waves: 4, gap: 300, fx: 'ring', color: '#FFB8E0' }, '整首曲子的高潮：準心處連續四波音浪。'],
    ['ai_hymn', '頌歌', 'bard', 8, 16, 22, 'heal', { pct: 0.35, allies: 0.4, shield: 0.15, allyShield: 0.15, color: '#FFE8A0' }, '你和隊友回復一大口生命，再多一層護盾。', 'aria'],
    ['ai_grace', '恩典', 'bard', 14, 18, 16, 'buff', { t: 10, dmg: 1.2, crit: 0.1, regen: 0.02, color: '#FFE8A0' }, '10 秒內傷害 +20%、暴擊率 +10%、每秒回復 2% 生命。', 'aria'],
    ['dm_thunder', '雷鼓', 'bard', 8, 9, 14, 'nova', { r: 3.4, k: 1.3, kb: 2.5, waves: 3, gap: 280, color: '#FF9A6A' }, '連敲三下，一圈一圈的鼓聲震飛周圍的敵人。', 'drummer'],
    ['dm_march', '進行曲', 'bard', 14, 14, 12, 'buff', { t: 10, speed: 1.2, dmg: 1.1, color: '#FFB86A' }, '踩著進行曲：10 秒內移動 +20%、傷害 +10%。', 'drummer'],
    ['se_field', '奏域', 'bard', 8, 14, 20, 'zone', { zone: 'sanct', self: 1, r: 5, life: 8, k: 0.4 }, '腳下展開 8 秒的奏域：裡面回復生命、灼傷敵人。', 'serane'],
    ['se_resonance', '共鳴', 'bard', 14, 12, 18, 'storm', { t: 6, gap: 0.45, r: 8, hitR: 1.6, k: 0.8, fx: 'spark', color: '#FFB8E0' }, '奏域裡的共振一下一下打在附近的敵人身上（6 秒）。', 'serane'],
    // 召喚師
    ['sn_dog', '召喚・土犬', 'summoner', 1, 12, 14, 'pet', { beast: 'okuriinu', t: 14, k: 0.7, color: '#A88A5A' }, '用執念把泥土捏成一隻狗（像霍克的「土」狗）：14 秒內跟著你咬敵人。'],
    ['sn_wisp', '游靈', 'summoner', 2, 10, 10, 'orbit', { t: 8, n: 2 }, '兩團游靈繞著你轉 8 秒，撞到靠近的敵人。'],
    ['sn_crow', '召喚・鴉群', 'summoner', 3, 12, 14, 'shotx', { n: 6, spread: 1.4, k: 0.6, homing: 6, kind: 'spirit', sp: 14, life: 2 }, '六隻魔力捏成的烏鴉飛出去，追著敵人撞上去。'],
    ['sn_shield', '盾靈', 'summoner', 5, 14, 12, 'heal', { shield: 0.3, color: '#A8C8A8' }, '召喚一面盾靈擋在身前：得到吸收 30% 生命的護盾。'],
    ['sn_golem', '召喚・泥偶', 'summoner', 6, 14, 18, 'turret', { t: 10, rate: 0.9, reach: 9, k: 0.9, look: 'tree', color: '#8A6A44' }, '在準心處捏一尊泥偶 10 秒，朝敵人丟泥團。'],
    ['sn_bond', '魂繫', 'summoner', 8, 16, 0, 'heal', { pct: 0.12, mp: 0.25 }, '把召喚物的魔力收回來：回復 12% 生命、25% 魔力。'],
    ['sn_sacrifice', '獻祭', 'summoner', 10, 10, 14, 'nova', { r: 3.4, k: 2, color: '#C8A878' }, '讓召喚物在身邊炸開：周圍的敵人重傷。'],
    ['sn_wolves', '召喚・狼群', 'summoner', 12, 16, 22, 'pet', { beast: 'okuriinu', n: 3, t: 10, k: 0.5, color: '#A88A5A' }, '一口氣捏出三隻土狼，10 秒內一起咬。'],
    ['sn_spirit', '附靈', 'summoner', 13, 12, 14, 'mark', { range: 10, r: 2.8, t: 8, k: 0.5 }, '讓靈纏上準心附近的敵人：8 秒內受到的傷害 +30%。'],
    ['sn_colossus', '召喚・巨像', 'summoner', 15, 20, 30, 'pet', { beast: 'nurikabe', t: 12, k: 1.6, speed: 3.5, rate: 1.2, kb: 2.5, color: '#8A8476' }, '捏出一尊會走路的巨像 12 秒，一拳把敵人打飛。'],
    ['bl_pack', '百獸', 'summoner', 8, 18, 26, 'pet', { beast: 'okuriinu', n: 4, t: 12, k: 0.55, color: '#A88A5A' }, '一口氣召喚四隻土狼。', 'beastlord'],
    ['bl_roar', '獸吼', 'summoner', 14, 14, 12, 'buff', { t: 8, dmg: 1.25, color: '#C8A878' }, '帶頭吼一聲：8 秒內你和召喚物的傷害 +25%。', 'beastlord'],
    ['md_haunt', '附身', 'summoner', 8, 14, 20, 'storm', { t: 8, gap: 0.5, r: 8, hitR: 1.3, k: 0.8, fx: 'spark', color: '#B8A8E8' }, '放出怨靈纏著周圍的敵人 8 秒，一直咬。', 'medium'],
    ['md_drain', '吸魂', 'summoner', 14, 10, 14, 'drain', { range: 10, r: 2.8, k: 1.4, heal: 0.5 }, '把準心附近敵人的魂吸過來：傷害的一半變成你的生命。', 'medium'],
    ['tm_tame', '馴服', 'summoner', 8, 16, 22, 'pet', { beast: 'floor', n: 2, t: 15, k: 0.8, color: '#8AC88A' }, '用執念捏出這一層遺跡生物的樣子，兩隻替你打 15 秒。', 'tamer'],
    ['tm_whistle', '口哨', 'summoner', 14, 12, 10, 'pull', { range: 10, r: 4, t: 2.5, k: 0.4 }, '吹一聲口哨：準心附近的敵人被拉到一起。', 'tamer'],
    // 術陣師
    ['ry_burst', '法陣・爆', 'arraymage', 1, 6, 10, 'at', { range: 10, r: 2.6, k: 2, delay: 600, fx: 'ring', color: '#7AC8E8' }, '在準心處畫一個閉環的法陣，0.6 秒後爆開。'],
    ['ry_bind', '法陣・縛', 'arraymage', 2, 9, 10, 'zone', { zone: 'trap', range: 8, r: 1.4, life: 20, k: 2.2 }, '在準心處畫一個陷阱陣：踩到的敵人被定住、受傷。'],
    ['ry_heal', '法陣・癒', 'arraymage', 3, 14, 16, 'zone', { zone: 'sanct', self: 1, r: 4, life: 7, k: 0.25 }, '腳下畫一個癒陣 7 秒：站在裡面回復生命，敵人會被灼傷。'],
    ['ry_fire', '法陣・焰', 'arraymage', 4, 10, 14, 'zone', { zone: 'lava', range: 9, r: 2.4, life: 6, k: 0.5 }, '準心處畫一個焰陣，6 秒內一直燒踩在上面的敵人。'],
    ['ry_seal', '封印陣', 'arraymage', 5, 12, 14, 'mark', { range: 10, r: 3, t: 6, slow: 3, stun: 1.2, k: 0.4 }, '封住準心附近的敵人：暈眩、變慢，受到的傷害變多。'],
    ['ry_gate', '傳送陣', 'arraymage', 6, 8, 10, 'blink', { range: 8, iframe: 0.3 }, '畫一個傳送陣，一步移到準心處。'],
    ['ry_chain', '連環陣', 'arraymage', 8, 12, 16, 'zone', { zone: 'trap', range: 8, r: 1.2, life: 20, k: 1.8, count: 4 }, '一次畫四個陷阱陣，圍成一圈。'],
    ['ry_lamp', '結界燈', 'arraymage', 10, 16, 18, 'turret', { t: 10, rate: 0.7, reach: 9, k: 0.8, look: 'lamp', color: '#7AC8E8' }, '立一座結界燈 10 秒，朝敵人放出陣光。'],
    ['ry_storm', '雷陣', 'arraymage', 12, 14, 20, 'storm', { t: 6, gap: 0.5, r: 8, hitR: 1.5, k: 1, stun: 0.3, color: '#BFE8FF' }, '6 秒內雷陣一直劈附近的敵人。'],
    ['ry_great', '大法陣', 'arraymage', 15, 16, 28, 'at', { range: 11, r: 5, k: 3.2, delay: 900, fx: 'ring', color: '#7AC8E8' }, '準心處畫一個巨大的法陣，0.9 秒後整片爆開。'],
    ['ga_grand', '大法陣・極', 'arraymage', 8, 14, 26, 'at', { range: 12, r: 6, k: 3.6, delay: 1000, fx: 'ring', color: '#9AE8FF' }, '準心處畫一個巨大的閉環，一秒後爆開。', 'grandarray'],
    ['ga_twin', '雙環', 'arraymage', 14, 10, 18, 'at', { range: 10, r: 3, k: 1.8, waves: 2, gap: 400, delay: 500, fx: 'ring', color: '#9AE8FF' }, '同一個位置畫兩層環，連爆兩次。', 'grandarray'],
    ['wd_ward', '守護陣', 'arraymage', 8, 16, 18, 'turret', { t: 10, rate: 1, reach: 8, k: 0.5, look: 'lamp', self: 1, color: '#FFE8A0' }, '腳下立一座守護陣的燈 10 秒，朝敵人放光；再加一層護盾。', 'warder'],
    ['wd_barrier', '結界', 'arraymage', 14, 16, 14, 'buff', { t: 5, kekkai: 1, def: 0.3, color: '#FFE8A0' }, '張開結界 5 秒：擋下投射物、受到的傷害 −30%。', 'warder'],
    ['ed_loop', '抑制圈', 'arraymage', 8, 12, 16, 'pull', { range: 10, r: 3.6, t: 6, k: 0.35 }, '準心處放一個長時間的抑制圈：6 秒內把敵人往中間拉、一直傷害。', 'eidanora'],
    ['ed_trap', '感應陣', 'arraymage', 14, 10, 12, 'zone', { zone: 'trap', range: 8, r: 1.6, life: 30, k: 3, count: 3 }, '畫三個感應陣，踩到的敵人重傷、被定住。', 'eidanora'],
    // 附魔師
    ['en_flame', '附魔・焰', 'enchanter', 1, 12, 10, 'buff', { t: 8, burn: 1, dmg: 1.1, color: '#FF7A3A' }, '把焰的咒文刻進武器：8 秒內打中的敵人燃燒、傷害 +10%。'],
    ['en_rune', '刻印斬', 'enchanter', 2, 5, 8, 'line', { len: 4, width: 1, k: 2, color: '#FFB86A' }, '一刀斬出刻著咒文的直線。'],
    ['en_frost', '附魔・霜', 'enchanter', 3, 12, 10, 'buff', { t: 8, frost: 1, def: 0.1, color: '#9AD8FF' }, '把霜的咒文刻進武器：8 秒內打中的敵人變慢、受到的傷害 −10%。'],
    ['en_whirl', '符文旋斬', 'enchanter', 4, 7, 10, 'arc', { range: 2.6, arc: 6.28, k: 0.9, hits: 3, gap: 110 }, '轉三圈，刻在刀上的符文一圈一圈亮起來。'],
    ['en_break', '破魔', 'enchanter', 5, 10, 10, 'mark', { range: 9, r: 2.6, t: 8, k: 0.6 }, '撕開準心附近敵人的魔力罩：8 秒內受到的傷害 +30%。'],
    ['en_shock', '附魔・雷', 'enchanter', 6, 12, 10, 'buff', { t: 8, shock: 1, crit: 0.08, color: '#E8E07A' }, '把雷的咒文刻進武器：8 秒內打中的時候常常電到旁邊的敵人、暴擊率 +8%。'],
    ['en_aegis', '附魔護甲', 'enchanter', 8, 14, 12, 'heal', { shield: 0.3, color: '#C8B898' }, '在護甲上刻一層咒文：得到吸收 30% 生命的護盾。'],
    ['en_burst', '魔力爆發', 'enchanter', 10, 9, 14, 'nova', { r: 3.2, k: 1.8, kb: 2, color: '#FFB86A' }, '武器裡的咒文一口氣爆開，震飛周圍的敵人。'],
    ['en_pierce', '穿甲刺', 'enchanter', 12, 8, 12, 'line', { len: 6, width: 0.8, k: 3, crit: 0.6, color: '#FFFFFF' }, '一刺穿過一整排，60% 機率暴擊。'],
    ['en_overload', '過載', 'enchanter', 15, 18, 16, 'buff', { t: 6, dmg: 1.4, burn: 1, shock: 1, def: -0.15, color: '#FF5A3A' }, '把武器的咒文灌到過載：6 秒內傷害 +40%、又燒又電，但受到的傷害 +15%。'],
    ['rs_triple', '三重附魔', 'enchanter', 8, 16, 18, 'buff', { t: 10, burn: 1, frost: 1, shock: 1, dmg: 1.1, color: '#FFFFFF' }, '焰、霜、雷一次刻上去 10 秒。', 'runesmith'],
    ['rs_engrave', '深刻', 'enchanter', 14, 12, 12, 'buff', { t: 12, crit: 0.12, dmg: 1.12, color: '#FFE8A0' }, '把咒文刻得更深：12 秒內暴擊率 +12%、傷害 +12%。', 'runesmith'],
    ['sb_wave', '劍氣', 'enchanter', 8, 7, 12, 'shots', { k: 1.8, pierce: 6, kind: 'hama', sp: 26, life: 0.7 }, '把附魔的斬擊打出去，穿過一整排敵人。', 'spellblade'],
    ['sb_storm', '劍雨', 'enchanter', 14, 14, 20, 'at', { range: 10, r: 3.4, k: 0.8, waves: 4, gap: 220, fx: 'rain', color: '#FFB86A' }, '附魔的劍氣從天上落下來，準心處連下四波。', 'spellblade'],
    ['et_tear', '撕裂', 'enchanter', 8, 8, 14, 'line', { len: 7, width: 1.1, k: 3.5, crit: 1, color: '#FFFFFF' }, '一刀撕開魔力罩：直線、必定暴擊。', 'entian'],
    ['et_flaw', '找破綻', 'enchanter', 14, 14, 10, 'buff', { t: 8, crit: 0.25, color: '#FFFFFF' }, '看穿魔力罩的破綻：8 秒內暴擊率 +25%。', 'entian'],
    // 符卷師
    ['sc_volley', '連發卷軸', 'scroll', 1, 5, 8, 'shots', { burst: 3, gap: 60, n: 2, spread: 0.2, k: 0.7, kind: 'orb', sp: 22 }, '一口氣撕開三張卷軸，零前搖連發。'],
    ['sc_fire', '火卷', 'scroll', 2, 7, 10, 'at', { range: 10, r: 2.6, k: 1.8, delay: 80, fx: 'boom', color: '#FF8A4A', burn: 1 }, '撕開火卷：準心處立刻炸開、燒起來。'],
    ['sc_ice', '冰卷', 'scroll', 3, 9, 12, 'at', { range: 10, r: 3, k: 1, delay: 80, root: 2, fx: 'ring', color: '#9AD8FF' }, '撕開冰卷：準心處的敵人凍住 2 秒。'],
    ['sc_wind', '風卷', 'scroll', 4, 6, 8, 'dash', { len: 6, dur: 0.15, k: 0.8 }, '撕開風卷，一陣風把你送出去 6 公尺（不會受傷）。'],
    ['sc_heal', '癒卷', 'scroll', 5, 14, 14, 'heal', { pct: 0.25, color: '#B8F0B8' }, '撕開癒卷：回復 25% 生命。'],
    ['sc_thunder', '雷卷', 'scroll', 6, 9, 14, 'storm', { t: 3, gap: 0.35, r: 8, hitR: 1.4, k: 1, stun: 0.3, color: '#E8E07A' }, '撕開雷卷：3 秒內雷一直劈附近的敵人。'],
    ['sc_wall', '盾卷', 'scroll', 8, 14, 12, 'heal', { shield: 0.3, color: '#E8D8A8' }, '撕開盾卷：得到吸收 30% 生命的護盾。'],
    ['sc_fan', '扇卷', 'scroll', 10, 8, 14, 'shots', { n: 7, spread: 1.2, k: 0.8, kind: 'orb', sp: 20 }, '七張卷軸扇形撒出去。'],
    ['sc_seal', '鎖卷', 'scroll', 12, 10, 12, 'mark', { range: 10, r: 2.8, t: 6, stun: 1, k: 0.4 }, '把準心附近的敵人鎖住 1 秒，6 秒內受到的傷害變多。'],
    ['sc_meteor', '隕卷', 'scroll', 15, 16, 26, 'at', { range: 11, r: 3.6, k: 1.6, waves: 3, gap: 250, delay: 100, fx: 'boom', color: '#FF8A4A' }, '三張隕卷一起撕：準心處連炸三次。'],
    ['sr_stack', '疊卷', 'scroll', 8, 10, 18, 'at', { range: 10, r: 2.8, k: 1.3, waves: 5, gap: 140, delay: 60, fx: 'boom', color: '#FF8A4A' }, '一次撕開五張火卷，準心處連爆。', 'scribe'],
    ['sr_copy', '速寫', 'scroll', 14, 16, 10, 'heal', { mp: 0.4 }, '當場抄一疊卷軸：回復 40% 魔力。', 'scribe'],
    ['sl_seal', '封印符', 'scroll', 8, 10, 14, 'mark', { range: 10, r: 2.6, t: 6, stun: 3, k: 0.5 }, '準心處的敵人被封住 3 秒、受到的傷害 +30%。', 'sealer'],
    ['sl_ward', '護符', 'scroll', 14, 16, 12, 'buff', { t: 6, kekkai: 1, def: 0.25, color: '#F2E6A0' }, '貼上護符：6 秒內擋下投射物、受到的傷害 −25%。', 'sealer'],
    ['nx_burst', '預載・全開', 'scroll', 8, 14, 22, 'shots', { n: 16, spread: 6.28, k: 0.8, kind: 'orb', sp: 18 }, '把預先寫好的卷軸一次全放出去：十六發，四面八方。', 'noxa'],
    ['nx_chain', '連鎖預載', 'scroll', 14, 12, 18, 'shots', { burst: 5, gap: 70, k: 0.9, kind: 'orb', sp: 24, pierce: 1 }, '預載的卷軸一張接一張自己發動，五連發。', 'noxa']
  ];
  NEW.forEach(([id, name, cls, lv, cd, mp, type, p, desc, adv]) => { LIB[id] = { id, name, cls, lv, cd, mp, type, p, desc, adv }; R.SKILLS[id] = { name, cd, mp, desc }; });
  Object.assign(R.SKILL_SLOTS, { bard: ['bd_requiem', 'bd_blast'], summoner: ['sn_crow', 'sn_golem'], arraymage: ['ry_heal', 'ry_gate'], enchanter: ['en_frost', 'en_shock'], scroll: ['sc_ice', 'sc_thunder'] });

  // ---------- 職業、轉職的被動 ----------
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls), a = P.adv;
    try {
      if (cls === 'enchanter') P.pen = Math.min(0.85, (P.pen || 0) + 0.2);   // 附魔派：穿得透魔力罩
      if (cls === 'summoner') { P.petMul = 1; P.petLife = 1; }
      if (a === 'aria') { P.healMul = (P.healMul || 1) * 1.3; }
      if (a === 'drummer') { P.skillCdMult *= 0.88; if (P.ws) P.ws.crit += 0.06; }
      if (a === 'serane') { P.calm += 0.2; P.mpMax = Math.round(P.mpMax * 1.2); }
      if (a === 'beastlord') { P.petMul = 1.4; P.petLife = 1.3; }
      if (a === 'medium') P.petHeal = 0.06;
      if (a === 'tamer') { P.calm += 0.15; P.petMul = 1.2; }
      if (a === 'grandarray') P.dmgMult *= 1.15;
      if (a === 'warder') P.def += 3;
      if (a === 'eidanora') P.skillCdMult *= 0.9;
      if (a === 'runesmith') { P.pen = Math.min(0.85, (P.pen || 0) + 0.15); if (P.ws) P.ws.fire = (P.ws.fire || 0) + 0.1; }
      if (a === 'spellblade') { P.dmgMult *= 1.1; P.mpMax = Math.round(P.mpMax * 1.25); }
      if (a === 'entian') P.pen = Math.min(0.9, (P.pen || 0) + 0.3);
      if (a === 'scribe') P.skillCdMult *= 0.85;
      if (a === 'sealer' && P.ws) P.ws.crit += 0.08;
      if (a === 'noxa') { P.mpMax = Math.round(P.mpMax * 1.3); const run = W().run; if (run && run.grade && (run.grade.lv || 0) >= 4) P.dmgMult *= 1.1; }
    } catch (e) { }
    return P;
  };
  const hl0 = R.healP;
  R.healP = (v, q) => { const P = W().P; return hl0(P && P.healMul ? v * P.healMul : v, q); };   // 詠嘆詩人：治療 +30%
  // 受到的傷害（結界師 −12%、詠嘆詩人的隊友）
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => { const P = W().P; if (P && P.adv === 'warder') raw *= 0.88; return hp0(raw, src, o); };
  if (R.hurtAlly) { const ha0 = R.hurtAlly; R.hurtAlly = (a, dmg, src) => { const P = W().P; if (P && P.adv === 'aria') dmg *= 0.85; return ha0(a, dmg, src); }; }

  // ---------- 大招、光的顏色 ----------
  Object.assign(R.CLASS_GLOW || {}, { bard: '#FFB8E0', summoner: '#A8C88A', arraymage: '#7AC8E8', enchanter: '#FF8A4A', scroll: '#F2D88A' });
  const pw = P => { const ws = P.ws || {}; return (ws.dmg || 10) * (ws.pellets > 1 ? ws.pellets : 1) * (ws.hits || 1) * (ws.rate || 1) / 2 * (P.dmgMult || 1); };
  const cast = (type, s, P) => { try { T[type](Object.assign({ _id: 'ult:' + type + rnd() }, s), P, W(), pw(P)); } catch (e) { console.warn('[classes2b]', e); } };
  if (R.ULTS) Object.assign(R.ULTS, {
    bard: { name: '狂想曲', sub: '吟遊詩人的大招：一首曲子讓你和隊友回滿一大口、周圍的敵人連續被震', go: P => { cast('heal', { pct: 0.5, allies: 0.5, shield: 0.2 }, P); cast('nova', { r: 5, k: 1.6, stun: 1, waves: 5, gap: 300, color: '#FFB8E0' }, P); cast('buff', { t: 10, dmg: 1.3, color: '#FFB8E0' }, P); } },
    summoner: { name: '百鬼夜行', sub: '召喚師的大招：一口氣捏出六隻召喚物和一尊巨像', go: P => { cast('pet', { beast: 'okuriinu', n: 6, t: 15, k: 0.7 }, P); cast('pet', { beast: 'nurikabe', n: 1, t: 15, k: 2, speed: 3.5, rate: 1.1, kb: 3 }, P); } },
    arraymage: { name: '天地大陣', sub: '術陣師的大招：以你為中心畫一個巨大的閉環，連爆三次', go: P => { cast('at', { range: 0.1, r: 7, k: 3, waves: 3, gap: 500, delay: 600, fx: 'ring', color: '#7AC8E8' }, P); cast('heal', { shield: 0.3 }, P); } },
    enchanter: { name: '萬象附魔', sub: '附魔師的大招：焰、霜、雷一起灌進武器，周圍一圈魔力爆發', go: P => { cast('buff', { t: 12, burn: 1, frost: 1, shock: 1, dmg: 1.4, crit: 0.2, color: '#FFFFFF' }, P); cast('nova', { r: 5, k: 3, kb: 4, color: '#FF8A4A' }, P); } },
    scroll: { name: '萬卷齊發', sub: '符卷師的大招：把身上的卷軸全部撕開，四面八方連發', go: P => { cast('shots', { n: 24, spread: 6.28, k: 1.1, kind: 'orb', sp: 18, burst: 3, gap: 200 }, P); cast('storm', { t: 4, gap: 0.25, r: 9, hitR: 1.5, k: 1.2, color: '#F2D88A' }, P); } }
  });
})(window.R);
