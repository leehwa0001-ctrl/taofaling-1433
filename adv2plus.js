// 二次轉職：每一個都有「特殊效果＋新主動技能＋新被動」（2026-10-04 作者：二轉感覺都要加職業本身的主動跟被動技能。
//   戰士類別的覺醒只有加強原本就有的技能而已，還只有一招，挺尷尬的。二轉應該可以增加 1. 職業本身特殊效果（類似劍鬥士攻速增加之類的）
//   2. 新主動技能（不要跟原本的重複）3. 新被動技能）
// - 覺醒（promote2.js）：原本只有「傷害 +12%、生命 +10%、冷卻 −8%」和路線最強那一招的 ×1.5 版。現在照你走的轉職路線（四十條，各不一樣）再加：
//     1. 那條路線的特殊效果（常駐，例如劍鬥士：攻速 +15%、擊倒遺跡生物技能冷卻少 0.5 秒）；
//     2. 兩招新技能（40、44 級）——新的招式，不是原本的招式加強；×1.5 的覺醒版照舊留著；
//     3. 一個新被動（40 級，要裝在被動欄）。
//   已經不再列出的舊路線（戰士的內修者、術士的式神使、武術家的外修者）也照那條路線給。
// - 每個職業自己的二轉（adv2more.js：槍聖、戰神……）、諧鳴五派：原本就有常駐效果和招式，再各加一個新被動。
// - 被動照 passives.js 的寫法（p.adv2、p.adv：選了那一個二轉、走那條路線才學得會）；被動用到的新效果：
//     guard 受到的傷害 −、boss 打精英和領主體 +、killCd 擊倒後技能冷卻 −秒、skillDmg 技能傷害 +、first 打還沒受傷的 +、
//     status 打身上有異常狀態（燃燒、變慢、暈眩、定住、詛咒）的 +、mpRegen 每秒回魔力、killShield 擊倒後得到護盾、
//     near 3.5 公尺內 +、hurtRage 被打之後 3 秒內 +、crowd 身邊 6 公尺每一隻敵人 +（最多五隻）、petMul／petLife 召喚物的傷害／時間。
//   其他（low、far、rage、leech、slow、stun、burn、killHeal、killMp、thorns、heal…）照 passives.js 原本的。
// 放在 promote2.js、adv2more.js、passives.js、skillbook.js、skillbook2.js、classes2b.js 後面。
(function (R) {
  const W = () => R.W, S = () => R.S, LIB = R.SKILL_LIB || {};
  // ---------- 覺醒：每條路線 [特殊效果的名字, 效果, 說明, [新被動：名字, 效果, 說明], [兩招：[名字, 型, 參數, 冷卻, 魔力, 說明]]] ----------
  const AWK = {
    // 槍手
    sniper: ['鷹隼', { crit: 0.1, far: 0.25 }, '暴擊率 +10%、8 公尺外的目標傷害 +25%', ['屏息', { first: 0.5, critMult: 0.2 }, '打還沒受傷的目標傷害 +50%；暴擊傷害 +20%。'], [
      ['斷罪之瞳', 'line', { len: 24, width: 0.6, k: 6.5, crit: 1, delay: 600, color: '#FFE8A0' }, 16, 28, '架好槍瞄 0.6 秒：一直線 24 公尺，必定暴擊。'],
      ['彈道預判', 'shotx', { burst: 3, gap: 160, k: 2.2, sp: 40, pierce: 2, stun: 0.3 }, 12, 22, '連開三槍，每一發穿過兩隻敵人，打中的愣一下。']]],
    magigun: ['元素共鳴', { burn: 0.12, slow: 0.12, status: 0.2 }, '普攻 12% 機率燃燒、12% 機率變慢；打身上有異常狀態的敵人傷害 +20%', ['魔導迴路', { skillDmg: 0.2, mpRegen: 1 }, '技能傷害 +20%；在遺跡裡每秒回復 1 點魔力。'], [
      ['三相魔導彈', 'shots', { n: 3, spread: 0.25, k: 2.4, elem: 'cycle', sp: 30, pierce: 1 }, 10, 22, '火、冰、雷三發並排射出，各帶自己的元素，各穿過一隻。'],
      ['魔導過載', 'beam', { t: 2.2, tick: 0.12, len: 12, width: 0.9, k: 0.6, slow: 2 }, 18, 30, '槍口灌滿魔力：射出 2.2 秒的粗光束，跟著準心轉，打到的變慢。']]],
    bomber: ['爆心', { skillDmg: 0.2, stun: 0.06 }, '技能傷害 +20%；普攻 6% 機率把目標震暈', ['防爆裝甲', { guard: 0.12, killShield: 0.04 }, '受到的傷害 −12%；擊倒遺跡生物得到 4% 生命的護盾（最多 30%）。'], [
      ['連環爆破', 'wave', { n: 7, step: 1.8, r: 1.8, k: 1.6, kb: 1.5, gap: 90, color: '#FF8A3A' }, 14, 26, '往前埋一串爆裂核心，一個接一個炸開。'],
      ['大爆破', 'at', { range: 12, r: 6, k: 4, kb: 3, delay: 1000, fx: 'boom', color: '#FF6A2A', aware: 6 }, 22, 36, '把最大的那顆爆裂核心丟到準心處：1 秒後大爆炸（佩特拉的注意 +6）。']]],
    // 弓手
    arcane: ['星辰加護', { crit: 0.06, skillDmg: 0.15 }, '暴擊率 +6%、技能傷害 +15%', ['觀星', { far: 0.2, killMp: 6 }, '8 公尺外的目標傷害 +20%；擊倒遺跡生物回復 6 點魔力。'], [
      ['天狼星', 'shotx', { k: 5, sp: 40, pierce: 6, stun: 0.6 }, 14, 24, '一支拉滿的星光箭：穿過六隻敵人，打中的愣住。'],
      ['流星群', 'at', { range: 13, r: 3, k: 1.4, waves: 5, gap: 180, scatter: 2.5, delay: 400, fx: 'pillar', color: '#BFE8FF' }, 16, 28, '五道星光落在準心附近，一道接一道。']]],
    ranger: ['野外求生', { speed: 0.08, dodge: 0.15, dodgeHit: 0.3 }, '移動 +8%、翻滾冷卻 −15%；翻滾後的下一擊 +30%', ['獵物的弱點', { status: 0.25, slow: 0.1 }, '打身上有異常狀態的敵人傷害 +25%；普攻 10% 機率讓目標變慢。'], [
      ['陷阱網', 'zone', { zone: 'trap', count: 4, r: 1.6, life: 10, k: 2.4, range: 9 }, 18, 26, '在準心附近一口氣布下四個陷阱。'],
      ['回馬箭', 'blink', { back: 1, range: 6, iframe: 0.4, end: { r: 3, k: 1.4, slow: 2.5, color: '#9AE07A' } }, 10, 16, '往後一躍拉開六公尺，落地時射出一圈箭：周圍的敵人受傷、變慢。']]],
    hama: ['破魔', { boss: 0.25, calm: 0.1 }, '打精英、領主體傷害 +25%；佩特拉的注意 −10%', ['清淨之矢', { ranged: 0.12, killHeal: 0.02 }, '遠程傷害 +12%；擊倒遺跡生物回復 2% 生命。'], [
      ['破魔・天弓', 'line', { len: 22, width: 1.2, k: 5, stun: 1, delay: 400, color: '#FFE8A0' }, 16, 28, '蓄力 0.4 秒，射出一道 22 公尺的破魔光，打中的愣住。'],
      ['鳴弦', 'nova', { r: 6, k: 1.6, stun: 1.5, waves: 2, gap: 400, color: '#FFE8A0' }, 18, 24, '拉響弓弦兩次：周圍的遺跡生物被震暈。']]],
    // 戰士
    berserker: ['血怒', { low: 0.2, leech: 0.015 }, '生命低於 30% 時傷害 +20%；造成傷害的 1.5% 回復成生命', ['越戰越勇', { hurtRage: 0.25, hp: 0.1 }, '被打之後 3 秒內傷害 +25%；生命 +10%。'], [
      ['血之狂宴', 'arc', { range: 4.5, arc: 3.6, k: 1.4, hits: 4, gap: 110, vamp: 0.075, kb: 1 }, 12, 20, '狂亂地連砍四下，打到的傷害有 7.5% 回成生命。'],
      ['怒濤', 'dash', { len: 8, dur: 0.25, k: 2.6, kb: 3, end: { r: 3.5, k: 2, stun: 0.8, color: '#FF5A3A' } }, 14, 22, '一路撞過去八公尺，最後往地上一砸：周圍的敵人暈眩。']]],
    gladiator: ['鬥技場', { rate: 0.15, killCd: 0.5 }, '攻速 +15%；擊倒遺跡生物，技能冷卻少 0.5 秒', ['觀眾的歡呼', { rage: 0.2, killHeal: 0.015 }, '擊倒遺跡生物：3 秒內傷害 +20%、回復 1.5% 生命。'], [
      ['致勝三連斬', 'xslash', { n: 3, spread: 1.0, len: 5.5, width: 0.8, k: 2.2, gap: 120 }, 10, 20, '三道斬擊依序斬出，張成扇形。'],
      ['鬥士的挑戰', 'combo', { parts: [['nova', { r: 5, k: 1.2, kb: 2, taunt: 4, color: '#FFD27A' }], ['buff', { t: 6, dmg: 1.3, def: 0.2, color: '#FFD27A' }, 0]] }, 24, 24, '大吼一聲：周圍的敵人被震開、只盯著你；6 秒內傷害 +30%、受到的傷害 −20%。']]],
    onimusha: ['鬼面', { guard: 0.08, status: 0.2 }, '受到的傷害 −8%；打被嚇住（暈眩、變慢…）的敵人傷害 +20%', ['惡意轉化', { hurtRage: 0.2, killShield: 0.05 }, '被打之後 3 秒內傷害 +20%；擊倒遺跡生物得到 5% 生命的護盾（最多 30%）。'], [
      ['鬼神斬', 'line', { len: 9, width: 2, k: 4.5, stun: 1, delay: 300, color: '#C83A3A' }, 14, 26, '舉刀 0.3 秒，往前斬出一道寬大的鬼斬，打中的嚇得愣住。'],
      ['鬼哭領域', 'aura', { t: 6, r: 4, gap: 0.4, k: 0.9, slow: 1, color: '#8A2A3A' }, 20, 26, '6 秒內身邊一直響著鬼哭，附近的敵人一直受傷、變慢。']]],
    // 術士
    elementalist: ['元素支配', { burn: 0.15, slow: 0.1, dmg: 0.08 }, '普攻 15% 機率燃燒、10% 機率變慢；傷害 +8%', ['元素循環', { status: 0.2, killMp: 6 }, '打身上有異常狀態的敵人傷害 +20%；擊倒遺跡生物回復 6 點魔力。'], [
      ['三元素爆', 'combo', { parts: [['at', { range: 11, r: 3.5, k: 1.8, delay: 200, burn: 1, fx: 'boom', color: '#FF6A2A' }], ['at', { range: 11, r: 3.5, k: 1.8, delay: 100, slow: 3, fx: 'ring', color: '#9AD8FF' }, 350], ['at', { range: 11, r: 3.5, k: 2.2, delay: 100, stun: 0.8, fx: 'pillar', color: '#FFE87A' }, 700]] }, 16, 30, '準心處火、冰、雷依序炸開：燃燒、變慢、暈眩。'],
      ['熔岩之河', 'wave', { n: 8, step: 1.6, r: 1.6, k: 1.4, burn: 1, gap: 70, color: '#FF6A2A' }, 14, 26, '地面裂開，一道熔岩往前竄出去，路上的敵人燃燒。']]],
    hexer: ['詛咒加深', { status: 0.25, slow: 0.08 }, '打身上有詛咒或異常狀態的敵人傷害 +25%；普攻 8% 機率讓目標變慢', ['怨念', { killMp: 8, leech: 0.015 }, '擊倒遺跡生物回復 8 點魔力；造成傷害的 1.5% 回復成生命。'], [
      ['萬咒', 'mark', { range: 12, r: 6, t: 8, slow: 3, k: 0.8 }, 18, 28, '準心一大片的敵人被詛咒 8 秒（受到的傷害 +30%）、變慢。'],
      ['咒殺', 'drain', { range: 12, k: 4, heal: 0.4 }, 14, 24, '對準一隻敵人吸出牠的生命：重傷，傷害的 40% 回成你的生命。']]],
    waixiu: ['氣罩外放', { guard: 0.1, skillCd: 0.06 }, '受到的傷害 −10%、技能冷卻 −6%', ['周天', { mpRegen: 1.5, regen: 1 }, '在遺跡裡每秒回復 1.5 點魔力、1 點生命。'], [
      ['氣龍', 'wave', { n: 9, step: 1.5, r: 1.8, k: 1.5, kb: 2, gap: 60, fx: 'ring', color: '#BFE8FF' }, 14, 26, '把魔力罩擰成一條氣龍往前竄，一路撞飛敵人。'],
      ['金剛氣罩', 'heal', { shield: 0.4, buff: { t: 6, def: 0.3, color: '#BFE8FF' } }, 26, 24, '獲得可吸收相當於最大生命 40% 傷害的護盾；6 秒內受到的傷害 −30%。']]],
    // 牧師
    bishop: ['聖職', { heal: 0.2, regen: 1 }, '治療 +20%；每秒回復 1 點生命', ['最後的祈禱', { killShield: 0.03, guard: 0.08 }, '受到的傷害 −8%；擊倒遺跡生物得到 3% 生命的護盾（最多 30%）。'], [
      ['大天使之翼', 'combo', { parts: [['heal', { pct: 0.35, allies: 0.35, shield: 0.2, allyShield: 0.2 }], ['nova', { r: 5, k: 2, stun: 1, color: '#FFE8A0' }, 200]] }, 30, 36, '你和隊友回 35% 生命、多一層護盾；周圍的敵人被聖光震暈。'],
      ['光柱之刑', 'storm', { t: 5, gap: 0.35, r: 10, hitR: 1.6, k: 1.3, fx: 'pillar', color: '#FFE8A0' }, 18, 30, '5 秒內光柱一道一道落在附近的敵人身上。']]],
    druid: ['森之加護', { regen: 1.5, hp: 0.08 }, '每秒回復 1.5 點生命、生命 +8%', ['荊棘之身', { thorns: 0.25, guard: 0.06 }, '被打的時候把 25% 的傷害還回去；受到的傷害 −6%。'], [
      ['大地之怒', 'wave', { n: 8, step: 1.6, r: 1.7, k: 1.6, stun: 0.4, gap: 70, fx: 'ring', color: '#6FB36A' }, 14, 26, '藤蔓從腳下一路往前竄出，纏住、打暈路上的敵人。'],
      ['生命綻放', 'heal', { pct: 0.3, allies: 0.3, buff: { t: 10, regen: 0.02, color: '#6FB36A' } }, 28, 30, '你和隊友回 30% 生命；10 秒內每秒再回 2%。']]],
    shinkan: ['祓清', { calm: 0.15, boss: 0.15 }, '佩特拉的注意 −15%；打精英、領主體傷害 +15%', ['結界術', { guard: 0.1, def: 5 }, '受到的傷害 −10%、防禦 +5。'], [
      ['八方結界', 'combo', { parts: [['buff', { t: 5, kekkai: 1, color: '#FFFFFF' }], ['nova', { r: 5, k: 1.4, kb: 4, color: '#FFFFFF' }, 0]] }, 24, 28, '張開 5 秒的結界擋下投射物，同時把周圍的遺跡生物彈開。'],
      ['大祓・極', 'at', { range: 0.1, r: 7, k: 2.4, waves: 2, gap: 500, stun: 1, delay: 300, fx: 'ring', color: '#FFFFFF' }, 20, 32, '以你為中心祓兩次：七公尺內的遺跡生物重傷、暈眩。']]],
    // 劍士
    kensei: ['劍心', { critMult: 0.3, crit: 0.05 }, '暴擊傷害 +30%、暴擊率 +5%', ['居合之心', { dodgeHit: 0.5, first: 0.3 }, '翻滾後的下一擊 +50%；打還沒受傷的目標傷害 +30%。'], [
      ['八方斬', 'xslash', { n: 8, around: 1, len: 5, width: 0.7, k: 1.8 }, 14, 24, '向八個方向同時斬出。'],
      ['次元斬', 'at', { range: 10, r: 3, k: 2.2, waves: 3, gap: 150, scatter: 1.2, delay: 200, fx: 'ring', color: '#DDEEFF' }, 14, 24, '在準心處的空間斬出三道裂痕。']]],
    shadow: ['暗影', { first: 0.3, dodge: 0.15 }, '打還沒受傷的目標傷害 +30%；翻滾冷卻 −15%', ['無聲', { calm: 0.15, killCd: 0.8 }, '佩特拉的注意 −15%；擊倒遺跡生物，技能冷卻少 0.8 秒。'], [
      ['千影', 'shots', { n: 12, spread: 6.28, k: 1.1, kind: 'eorb', sp: 22, life: 0.9, pierce: 1 }, 12, 22, '身邊的影子化成十二把飛刀，往四面八方射出。'],
      ['影之牢', 'at', { range: 10, r: 4, k: 1.5, root: 2, delay: 250, fx: 'ring', color: '#3A2A4A' }, 16, 22, '準心處的影子伸出來，抓住 4 公尺內的敵人 2 秒。']]],
    yoto: ['妖刀飢渴', { leech: 0.015, rage: 0.15 }, '造成傷害的 1.5% 回復成生命；擊倒遺跡生物後 3 秒內傷害 +15%', ['妖氣纏身', { near: 0.2, guard: 0.06 }, '3.5 公尺內的敵人傷害 +20%；受到的傷害 −6%。'], [
      ['妖刀・千鬼', 'arc', { range: 5.5, arc: 6.28, k: 1.6, hits: 3, gap: 150, vamp: 0.05 }, 14, 24, '刀轉三圈：周圍的敵人全被斬，傷害的 5% 回成生命。'],
      ['血月', 'line', { len: 14, width: 1.6, k: 5, delay: 400, color: '#C83A5A' }, 16, 28, '妖刀蓄滿血氣，斬出一道 14 公尺的血月。']]],
    // 騎士
    templar: ['堡壘', { guard: 0.12, def: 5 }, '受到的傷害 −12%、防禦 +5', ['反擊之盾', { thorns: 0.3, hp: 0.1 }, '被打的時候把 30% 的傷害還回去；生命 +10%。'], [
      ['聖殿之壁', 'combo', { parts: [['guard', { t: 1.5, color: '#C8D0D8' }], ['buff', { t: 8, def: 0.4, color: '#C8D0D8' }, 0]] }, 30, 24, '1.5 秒內不受傷，之後 8 秒受到的傷害 −40%。'],
      ['神聖裁決', 'at', { range: 10, r: 4.5, k: 3.5, stun: 1, delay: 500, fx: 'pillar', color: '#FFE8A0' }, 16, 28, '準心處落下一道聖光：重傷、暈眩。']]],
    paladin: ['聖光庇佑', { heal: 0.2, killHeal: 0.015 }, '治療 +20%；擊倒遺跡生物回復 1.5% 生命', ['信仰之力', { regen: 1.2, def: 3 }, '每秒回復 1.2 點生命、防禦 +3。'], [
      ['聖光鎚', 'boomer', { range: 9, sp: 16, k: 2.4, stun: 0.6, look: 'disc' }, 12, 22, '把聖光凝成的鎚子扔出去再接回來，來回都會打暈敵人。'],
      ['天使降臨', 'combo', { parts: [['heal', { pct: 0.25, allies: 0.25, shield: 0.15 }], ['aura', { t: 6, r: 3.5, gap: 0.4, k: 0.6, heal: 0.01, color: '#FFE8A0' }, 100]] }, 28, 32, '回 25% 生命、多一層護盾；6 秒內身邊的光環一直灼傷敵人、回血。']]],
    dragoon: ['龍血', { crit: 0.05, first: 0.25 }, '暴擊率 +5%；打還沒受傷的目標傷害 +25%（從天而降的第一擊）', ['龍鱗', { guard: 0.1, hp: 0.08 }, '受到的傷害 −10%、生命 +8%。'], [
      ['龍槍・連星', 'shots', { n: 3, spread: 0.3, k: 3, kind: 'eorb', sp: 30, pierce: 4 }, 12, 24, '連扔三把龍槍，每把穿過四隻敵人。'],
      ['龍之吐息', 'breath', { t: 1.8, tick: 0.15, range: 6.5, arc: 1, k: 0.6, burn: 1, color: '#9AD8FF' }, 16, 28, '龍的血在體內燒起來：往前噴出 1.8 秒的龍息，燒到的敵人燃燒。']]],
    // 武術家
    fistsaint: ['拳意', { rate: 0.1, critMult: 0.25 }, '攻速 +10%、暴擊傷害 +25%', ['連擊', { near: 0.15, killCd: 0.5 }, '3.5 公尺內的敵人傷害 +15%；擊倒遺跡生物，技能冷卻少 0.5 秒。'], [
      ['破山拳', 'line', { len: 7, width: 1.5, k: 4.5, kb: 5, stun: 0.8, delay: 250 }, 14, 24, '蓄力一拳，拳風轟出七公尺，把路上的敵人打飛。'],
      ['旋風百腿', 'aura', { t: 3, r: 3, gap: 0.2, k: 0.9, color: '#FFD27A' }, 14, 22, '原地旋轉踢 3 秒，身邊的敵人被連續踢中。']]],
    staffmonk: ['棍法', { guard: 0.08, arc: 0.15 }, '受到的傷害 −8%、攻擊範圍 +15%', ['如意', { stun: 0.08, crowd: 0.03 }, '普攻 8% 機率把目標打暈；身邊 6 公尺每一隻敵人，傷害 +3%（最多五隻）。'], [
      ['天地棍', 'arc', { range: 6, arc: 6.28, k: 2.2, hits: 2, gap: 200, kb: 3 }, 14, 24, '長棍伸長掄兩圈，掃飛身邊所有的敵人。'],
      ['棍林', 'wave', { n: 6, step: 1.8, r: 1.5, k: 1.8, stun: 0.5, gap: 70, color: '#C8A878' }, 12, 22, '長棍一路往前點地，地面接連炸開，打暈路上的敵人。']]],
    inner: ['內勁', { regen: 1.2, mpRegen: 1, def: 4 }, '每秒回復 1.2 點生命、1 點魔力；防禦 +4', ['金剛之軀', { guard: 0.1, hp: 0.1 }, '受到的傷害 −10%、生命 +10%。'], [
      ['寸勁・極', 'line', { len: 4, width: 1.4, k: 6, kb: 6, stun: 1, delay: 300 }, 14, 24, '貼身一掌、勁力全放：短距離的極大傷害。'],
      ['周天循環', 'heal', { pct: 0.3, mp: 0.3, buff: { t: 8, def: 0.2, regen: 0.015, color: '#FFD27A' } }, 30, 0, '吐納一次：回 30% 生命、30% 魔力；8 秒內受到的傷害 −20%、持續回血。']]],
    // 吟遊詩人
    aria: ['天籟', { heal: 0.25, mp: 0.1 }, '治療 +25%、魔力 +10%', ['餘韻', { killShield: 0.03, regen: 1 }, '擊倒遺跡生物得到 3% 生命的護盾（最多 30%）；每秒回復 1 點生命。'], [
      ['天使合唱', 'combo', { parts: [['heal', { pct: 0.4, allies: 0.4, shield: 0.25, allyShield: 0.25, color: '#FFE8F0' }], ['buff', { t: 8, dmg: 1.15, color: '#FFE8F0' }, 0]] }, 32, 36, '回復自己與附近隊友的生命並提供護盾；8 秒內自身傷害 +15%。'],
      ['詠嘆・光', 'beam', { t: 2, tick: 0.15, len: 10, width: 0.8, k: 0.5, selfHeal: 0.008 }, 14, 24, '把歌聲凝成一道光，照 2 秒，打到敵人的同時回復你。']]],
    drummer: ['鼓點', { skillCd: 0.08, crit: 0.05, rate: 0.08 }, '技能冷卻 −8%、暴擊率 +5%、攻速 +8%', ['節奏', { killCd: 0.6, rage: 0.15 }, '擊倒遺跡生物：技能冷卻少 0.6 秒、3 秒內傷害 +15%。'], [
      ['雷霆節拍', 'storm', { t: 5, gap: 0.3, r: 9, hitR: 1.6, k: 1.2, stun: 0.3, fx: 'spark', color: '#FFE87A' }, 18, 28, '每一拍都有一道雷落在附近的敵人身上，5 秒。'],
      ['定音一擊', 'combo', { parts: [['nova', { r: 4, k: 1.5, stun: 1, color: '#FFD27A' }], ['buff', { t: 8, dmg: 1.2, def: 0.15, color: '#FFD27A' }, 0]] }, 22, 24, '重重一擊定音鼓：周圍的敵人暈眩；8 秒內傷害 +20%、受到的傷害 −15%。']]],
    serane: ['奏域擴張', { skillDmg: 0.15, calm: 0.15 }, '技能傷害 +15%；佩特拉的注意 −15%', ['共鳴體', { mpRegen: 1.5, killMp: 5 }, '在遺跡裡每秒回復 1.5 點魔力；擊倒遺跡生物回復 5 點魔力。'], [
      ['大奏域', 'zone', { zone: 'sanct', self: 1, r: 7, life: 10, k: 0.6 }, 26, 32, '腳下展開一個 7 公尺的大奏域 10 秒：裡面回血、灼傷敵人。'],
      ['共振破', 'chainx', { n: 6, jump: 6, k: 1.6, falloff: 0.9, stun: 0.3, range: 12 }, 12, 22, '共振沿著敵人一路跳六次，打中的愣一下。']]],
    // 召喚師
    beastlord: ['群獸', { petMul: 0.25, petLife: 0.2 }, '召喚物的傷害 +25%、持續時間 +20%', ['獸王之心', { guard: 0.08, killHeal: 0.015 }, '受到的傷害 −8%；擊倒遺跡生物回復 1.5% 生命。'], [
      ['獸王咆哮', 'combo', { parts: [['nova', { r: 5, k: 1, stun: 1.2, color: '#C8A878' }], ['pet', { beast: 'okuriinu', n: 2, t: 12, k: 1.2, color: '#C8A878' }, 200]] }, 24, 32, '一聲咆哮震暈周圍的敵人，再叫出兩隻大狼，12 秒。'],
      ['獸群狩獵', 'storm', { t: 6, gap: 0.4, r: 10, hitR: 1.4, k: 1.1, fx: 'spark', color: '#C8A878' }, 18, 28, '看不見的獸群在附近狩獵：6 秒內一下一下撲向敵人。']]],
    medium: ['冥通', { leech: 0.015, killMp: 5 }, '造成傷害的 1.5% 回復成生命；擊倒遺跡生物回復 5 點魔力', ['怨靈守護', { guard: 0.08, thorns: 0.2 }, '受到的傷害 −8%；被打的時候把 20% 的傷害還回去。'], [
      ['怨靈潮', 'shots', { n: 10, spread: 6.28, k: 1.2, homing: 8, kind: 'holy', sp: 14, life: 2.5 }, 16, 28, '放出十隻怨靈，四面八方追著敵人咬。'],
      ['魂鎖', 'hook', { range: 12, k: 1.8, stun: 1.2 }, 12, 18, '用魂鎖把一隻敵人拉到面前，打暈。']]],
    tamer: ['馴獸', { petMul: 0.2, calm: 0.12 }, '召喚物的傷害 +20%；佩特拉的注意 −12%', ['遺跡的氣味', { killHeal: 0.02, speed: 0.06 }, '擊倒遺跡生物回復 2% 生命；移動 +6%。'], [
      ['捕獲網', 'at', { range: 10, r: 4, k: 1.2, root: 2.5, delay: 300, fx: 'ring', color: '#C8A878' }, 16, 22, '往準心處撒一張大網：4 公尺內的敵人被纏住 2.5 秒。'],
      ['同化', 'buff', { t: 10, dmg: 1.25, speed: 1.12, vamp: 0.02, color: '#C8A878' }, 30, 24, '學遺跡生物的樣子：10 秒內傷害 +25%、移動 +12%、吸血 2%。']]],
    shikigami: ['紙式', { petMul: 0.2, skillCd: 0.06 }, '召喚物的傷害 +20%、技能冷卻 −6%', ['紙護法', { guard: 0.08, killShield: 0.03 }, '受到的傷害 −8%；擊倒遺跡生物得到 3% 生命的護盾（最多 30%）。'], [
      ['式神・雷鳥', 'shotx', { burst: 6, gap: 90, k: 0.9, sp: 24, stun: 0.3, look: 'card' }, 12, 22, '連放六張雷鳥式神，打中的麻一下。'],
      ['式神・守門', 'turret', { t: 12, rate: 0.6, reach: 10, k: 0.7, kind: 'holy', look: 'lamp', color: '#F4EEDC' }, 22, 28, '在準心處立一尊守門的式神 12 秒，自動攻擊附近的敵人。']]],
    // 術陣師
    grandarray: ['陣域', { skillDmg: 0.15, splash: 0.2 }, '技能傷害 +15%、法彈爆炸範圍 +20%', ['閉環增幅', { dmg: 0.1, killMp: 5 }, '傷害 +10%；擊倒遺跡生物回復 5 點魔力。'], [
      ['三重天陣', 'at', { range: 12, r: 4.5, k: 2.4, waves: 3, gap: 350, delay: 600, fx: 'boom', color: '#7AC8E8' }, 20, 34, '準心處同一個法陣連爆三次。'],
      ['陣雨', 'at', { range: 12, r: 2.2, k: 1.4, waves: 8, gap: 110, scatter: 3.5, delay: 300, fx: 'pillar', color: '#7AC8E8' }, 16, 28, '準心附近接連亮起八個小法陣。']]],
    warder: ['結界', { guard: 0.12, regen: 1 }, '受到的傷害 −12%；每秒回復 1 點生命', ['反轉結界', { thorns: 0.25, def: 4 }, '被打的時候把 25% 的傷害還回去；防禦 +4。'], [
      ['結界牢籠', 'at', { range: 11, r: 4, k: 0.8, root: 3, delay: 300, fx: 'ring', color: '#9AD8FF' }, 18, 24, '準心處立起結界，困住 4 公尺內的敵人 3 秒。'],
      ['不破之陣', 'heal', { shield: 0.35, allyShield: 0.35, buff: { t: 8, def: 0.3, color: '#9AD8FF' } }, 30, 30, '你和隊友多一層 35% 生命的護盾；8 秒內受到的傷害 −30%。']]],
    eidanora: ['抑制', { status: 0.2, slow: 0.12 }, '打身上有異常狀態的敵人傷害 +20%；普攻 12% 機率讓目標變慢', ['永續', { skillCd: 0.1, mpRegen: 1 }, '技能冷卻 −10%；在遺跡裡每秒回復 1 點魔力。'], [
      ['閉環崩壞', 'combo', { parts: [['pull', { range: 11, r: 4.5, t: 2, k: 0.4 }], ['at', { range: 11, r: 4.5, k: 3.2, delay: 100, fx: 'boom', color: '#7AC8E8' }, 2000]] }, 22, 32, '準心處的閉環把敵人吸進來 2 秒，再整個崩開（崩在那時候的準心處）。'],
      ['閉環射線', 'beam', { t: 2, tick: 0.12, len: 11, width: 0.8, k: 0.5, slow: 2 }, 16, 26, '法陣串成一條，射出 2 秒的光束，打到的變慢。']]],
    // 附魔師
    runesmith: ['刻印', { burn: 0.12, pen: 0.1 }, '普攻 12% 機率燃燒；無視護甲 +10%', ['符文共鳴', { status: 0.2, crit: 0.05 }, '打身上有異常狀態的敵人傷害 +20%；暴擊率 +5%。'], [
      ['符文地雷', 'zone', { zone: 'trap', count: 3, r: 1.6, life: 12, k: 2.6, range: 9 }, 18, 26, '在準心附近刻下三個符文地雷，踩到就炸。'],
      ['千刻', 'shotx', { burst: 5, gap: 100, n: 3, spread: 0.4, k: 0.8, sp: 28, burn: 1, look: 'blade' }, 14, 26, '把刻好的符文刀片一波一波射出去，打中的燃燒。']]],
    spellblade: ['魔劍合一', { dmg: 0.1, mpRegen: 1 }, '傷害 +10%；在遺跡裡每秒回復 1 點魔力', ['劍氣縱橫', { skillDmg: 0.15, killMp: 5 }, '技能傷害 +15%；擊倒遺跡生物回復 5 點魔力。'], [
      ['魔劍・天穿', 'shots', { n: 3, spread: 0.3, k: 2.6, kind: 'eorb', sp: 30, pierce: 5 }, 12, 24, '三道劍氣並排射出，各穿過五隻。'],
      ['魔劍風暴', 'aura', { t: 5, r: 3.5, gap: 0.25, k: 0.8, color: '#9AE8FF' }, 18, 26, '附魔的劍氣在身邊旋轉 5 秒。']]],
    entian: ['破甲', { pen: 0.15, boss: 0.15 }, '無視護甲 +15%；打精英、領主體傷害 +15%', ['博弈', { critMult: 0.3, first: 0.2 }, '暴擊傷害 +30%；打還沒受傷的目標傷害 +20%。'], [
      ['破界', 'line', { len: 12, width: 1.2, k: 5.5, crit: 1, delay: 500, color: '#9AE8FF' }, 16, 28, '蓄力 0.5 秒，一刀撕開魔力罩：12 公尺直線，必定暴擊。'],
      ['看穿', 'combo', { parts: [['mark', { range: 12, r: 4, t: 8, k: 0.5 }], ['buff', { t: 8, crit: 0.3, color: '#9AE8FF' }, 0]] }, 22, 22, '看穿準心附近敵人的破綻：8 秒內牠們受到的傷害 +30%；你的暴擊率 +30%。']]],
    // 符卷師
    scribe: ['速寫', { skillCd: 0.08, mpRegen: 1 }, '技能冷卻 −8%；在遺跡裡每秒回復 1 點魔力', ['抄寫不輟', { killCd: 0.5, mp: 0.15 }, '擊倒遺跡生物，技能冷卻少 0.5 秒；魔力 +15%。'], [
      ['卷軸風暴', 'shots', { n: 8, spread: 1.2, k: 1.2, burst: 3, gap: 200, kind: 'holy', sp: 22 }, 16, 30, '一口氣撕開三疊卷軸，每疊八張扇形射出。'],
      ['複寫・隕', 'at', { range: 12, r: 3, k: 1.6, waves: 4, gap: 250, scatter: 2, delay: 300, fx: 'boom', color: '#FF8A4A' }, 16, 28, '同一張隕卷複寫四份：準心附近連爆四次。']]],
    sealer: ['封印術', { stun: 0.08, status: 0.2 }, '普攻 8% 機率把目標打暈；打身上有異常狀態的敵人傷害 +20%', ['符咒加持', { guard: 0.08, crit: 0.06 }, '受到的傷害 −8%、暴擊率 +6%。'], [
      ['封魔符', 'shotx', { burst: 4, gap: 120, n: 2, spread: 0.3, k: 1.2, sp: 24, stun: 0.6, look: 'card' }, 12, 22, '連射八張封魔符，打中的被封住一下。'],
      ['大封絕', 'mark', { range: 13, r: 6, t: 10, slow: 4, stun: 2, k: 0.8 }, 22, 30, '一大片的封印：準心 6 公尺內的敵人暈眩 2 秒、變慢，10 秒內受到的傷害 +30%。']]],
    noxa: ['預載', { skillDmg: 0.15, mp: 0.15 }, '技能傷害 +15%、魔力 +15%', ['高濃度', { mpRegen: 1.5, killMp: 4 }, '在遺跡裡每秒回復 1.5 點魔力；擊倒遺跡生物回復 4 點魔力。'], [
      ['迴旋卷', 'boomer', { n: 3, range: 9, sp: 16, k: 1.8, look: 'card' }, 12, 22, '三張預載好的卷軸丟出去再飛回來，來回都會炸。'],
      ['預載・天幕', 'storm', { t: 6, gap: 0.3, r: 10, hitR: 1.5, k: 1.1, fx: 'boom', color: '#C8A85A' }, 20, 30, '頭上預載的卷軸一張一張自己點燃，6 秒內一直砸向附近的敵人。']]]
  };
  // ---------- 職業自己的二轉（adv2more.js）、諧鳴五派：各加一個新被動 [名字, 效果, 說明] ----------
  const SPP = {
    gunner: ['槍聖之眼', { killAmmo: 3, critMult: 0.25 }, '擊倒遺跡生物，彈匣補 3 發；暴擊傷害 +25%。'],
    archer: ['天弓之心', { far: 0.25, killCd: 0.5 }, '8 公尺外的目標傷害 +25%；擊倒遺跡生物，技能冷卻少 0.5 秒。'],
    warrior: ['戰神之軀', { guard: 0.1, near: 0.15 }, '受到的傷害 −10%；3.5 公尺內的敵人傷害 +15%。'],
    priest: ['聖者的祝福', { heal: 0.25, killShield: 0.03 }, '治療 +25%；擊倒遺跡生物得到 3% 生命的護盾（最多 30%）。'],
    blade: ['劍聖之道', { first: 0.3, dodgeHit: 0.4 }, '打還沒受傷的目標傷害 +30%；翻滾後的下一擊 +40%。'],
    knight: ['團長的威嚴', { thorns: 0.25, guard: 0.08 }, '被打的時候把 25% 的傷害還回去；受到的傷害 −8%。'],
    monk: ['武神之拳', { near: 0.15, killHeal: 0.015 }, '3.5 公尺內的敵人傷害 +15%；擊倒遺跡生物回復 1.5% 生命。'],
    bard: ['樂聖的餘音', { killCd: 0.5, mpRegen: 1 }, '擊倒遺跡生物，技能冷卻少 0.5 秒；在遺跡裡每秒回復 1 點魔力。'],
    summoner: ['萬靈之主', { petMul: 0.25, petLife: 0.2 }, '召喚物的傷害 +25%、持續時間 +20%。'],
    arraymage: ['陣聖之環', { splash: 0.3, skillDmg: 0.15 }, '法彈爆炸範圍 +30%；技能傷害 +15%。'],
    enchanter: ['宗師之手', { status: 0.2, burn: 0.12 }, '打身上有異常狀態的敵人傷害 +20%；普攻 12% 機率燃燒。'],
    scroll: ['符聖之筆', { killCd: 0.5, mp: 0.2 }, '擊倒遺跡生物，技能冷卻少 0.5 秒；魔力 +20%。']
  };
  const HMP = {
    harmonic: ['奏域共鳴', { mpRegen: 1.5, skillDmg: 0.12 }, '在遺跡裡每秒回復 1.5 點魔力；技能傷害 +12%。'],
    hm_zhen: ['頻率干擾', { guard: 0.12, slow: 0.15 }, '受到的傷害 −12%；普攻 15% 機率讓目標變慢。'],
    hm_gong: ['共振增幅', { killMp: 6, critMult: 0.25 }, '擊倒遺跡生物回復 6 點魔力；暴擊傷害 +25%。'],
    hm_zhuan: ['轉調迴路', { status: 0.2, burn: 0.12 }, '打身上有異常狀態的敵人傷害 +20%；普攻 12% 機率燃燒。'],
    hm_ding: ['定頻鎖定', { far: 0.2, crit: 0.06 }, '8 公尺外的目標傷害 +20%；暴擊率 +6%。']
  };

  // ---------- 加進技能書、被動 ----------
  const add = (id, o) => { LIB[id] = Object.assign({ id }, o); R.SKILLS[id] = { name: o.name, cd: o.cd, mp: o.mp, desc: o.desc }; };
  const PL = R.PASSIVE_LIST, PB = R.PASSIVES;
  const addPv = (id, cls, name, fx, desc, adv2, adv, need) => { if (!PL || !PB || PB[id]) return; const p = { id, cls, lv: 40, name, desc, fx, adv2, adv, need }; PL.push(p); PB[id] = p; };
  const SK = {};   // 'cls:route' → [兩招的 id]
  R.CLASS_IDS.forEach(cls => (R.ADV[cls] || []).forEach(a => {
    const d = AWK[a.id]; if (!d) return;
    SK[cls + ':' + a.id] = d[4].map(([name, type, p, cd, mp, desc], i) => { const id = 'a2_' + cls + '_' + a.id + '_' + i; add(id, { name, cls, lv: 40 + i * 4, cd, mp, type, p, desc: '（二轉・覺醒・' + a.name + '）' + desc, adv: a.id, adv2: 'awaken' }); return id; });
    addPv('a2p_' + cls + '_' + a.id, cls, d[3][0], d[3][1], '（二轉・覺醒・' + a.name + '）' + d[3][2], 'awaken', a.id, '二次轉職：覺醒（' + a.name + '）');
  }));
  Object.keys(SPP).forEach(cls => { const o = (R.ADV2_OPTS(cls) || []).find(x => x.id === 'sp'); addPv('a2p_' + cls + '_sp', cls, SPP[cls][0], SPP[cls][1], '（二轉・' + (o ? o.name : '') + '）' + SPP[cls][2], 'sp', null, '二次轉職：' + (o ? o.name : '')); });
  Object.keys(HMP).forEach(id => { const o = (R.ADV2_OPTS('mage') || []).find(x => x.id === id); if (o) addPv('a2p_mage_' + id, 'mage', HMP[id][0], HMP[id][1], '（二轉・' + o.name + '）' + HMP[id][2], id, null, '二次轉職：' + o.name); });

  // ---------- 二轉畫面的說明 ----------
  const pvTxt = p => '新被動「' + p[0] + '」：' + p[2];
  const op0 = R.ADV2_OPTS;
  R.ADV2_OPTS = cls => op0(cls).map(o => {
    if (o.id === 'awaken') {
      const st = S() && S().classes[cls], a = st && st.adv && (R.ADV[cls] || []).find(x => x.id === st.adv), d = a && AWK[a.id];
      const more = d ? a.name + '的覺醒「' + d[0] + '」：' + d[2] + '。學會「' + d[4][0][0] + '」（40 級）、「' + d[4][1][0] + '」（44 級）。' + pvTxt(d[3])
        : '每條轉職路線的覺醒都不一樣：一個特殊效果、兩招新技能、一個新被動。';
      return Object.assign({}, o, { desc: o.desc + more });
    }
    const p = o.id === 'sp' ? SPP[cls] : cls === 'mage' ? HMP[o.id] : null;
    return p ? Object.assign({}, o, { desc: o.desc + pvTxt(p) }) : o;
  });

  // ---------- 數值：覺醒的特殊效果；被動的新效果先算好 ----------
  const NUM = {
    hp: (P, v) => { P.hpMax = Math.round(P.hpMax * (1 + v)); }, mp: (P, v) => { P.mpMax = Math.round(P.mpMax * (1 + v)); }, def: (P, v) => { P.def = (P.def || 0) + v; },
    speed: (P, v) => { P.speed *= 1 + v; }, dmg: (P, v) => { P.dmgMult *= 1 + v; }, critMult: (P, v) => { P.critMult += v; },
    crit: (P, v) => { if (P.ws) P.ws.crit = (P.ws.crit || 0) + v; }, rate: (P, v) => { if (P.ws && P.ws.rate) P.ws.rate *= 1 + v; },
    arc: (P, v) => { if (P.ws && P.ws.arc) P.ws.arc *= 1 + v; }, splash: (P, v) => { if (P.ws && P.ws.splash) P.ws.splash *= 1 + v; },
    ranged: (P, v) => { if (P.ws && (P.ws.kind === 'gun' || P.ws.kind === 'bow')) P.ws.dmg *= 1 + v; },
    dodge: (P, v) => { P.dodgeCdMax *= 1 - v; }, skillCd: (P, v) => { P.skillCdMult *= 1 - v; }, regen: (P, v) => { P.regen = (P.regen || 0) + v; }, calm: (P, v) => { P.calm = (P.calm || 0) + v; },
    pen: (P, v) => { P.pen = Math.min(0.8, (P.pen || 0) + v); }, petMul: (P, v) => { P.petMul = (P.petMul || 1) * (1 + v); }, petLife: (P, v) => { P.petLife = (P.petLife || 1) * (1 + v); }
  };
  const cp0 = R.calcPlayer;
  R.calcPlayer = cls => {
    const P = cp0(cls);
    try {
      const st = S().classes[cls], pv = P.pv = P.pv || {};
      // 被動（passives.js 已經算進 P.pv）裡的召喚物加成
      if (pv.petMul) NUM.petMul(P, pv.petMul); if (pv.petLife) NUM.petLife(P, pv.petLife);
      // 覺醒的特殊效果：數值的直接加，其他的（命中、擊倒、受傷時才算的）放進 P.pv
      const d = st && st.adv2 === 'awaken' && st.adv ? AWK[st.adv] : null;
      if (d) Object.keys(d[1]).forEach(k => { const v = d[1][k]; if (NUM[k]) NUM[k](P, v); else pv[k] = (pv[k] || 0) + v; });
    } catch (e) { console.warn('[adv2plus]', e); }
    return P;
  };

  // ---------- 命中、擊倒、受傷、每一幀 ----------
  const pvOf = () => { const P = W().P; return P && W().run && P.pv ? P.pv : null; };
  const isBig = e => !!(e.def && (e.def.elite || e.def.boss || /^領主體/.test(e.def.name || ''))) || !!e.elite;
  const hasSt = e => !!(e.st && (e.st.curse > 0 || e.st.slow > 0 || e.st.stun > 0 || e.st.burn > 0 || e.st.root > 0));
  const he0 = R.hurtEnemy;
  R.hurtEnemy = (e, raw, o) => {
    const f = pvOf();
    if (f && e && !e.dead && raw > 0 && !(o && o.thorns)) {
      const P = W().P; let m = 1;
      if (f.skillDmg && !(o && o.primary)) m += f.skillDmg;
      if (f.boss && isBig(e)) m += f.boss;
      if (f.first && e.hp >= e.hpMax * 0.9) m += f.first;
      if (f.status && hasSt(e)) m += f.status;
      if (f.near && Math.hypot(e.x - P.x, e.z - P.z) < 3.5) m += f.near;
      if (f.hurtRage && P.a2Rage > 0) m += f.hurtRage;
      if (f.crowd && P.a2Crowd) m += f.crowd * P.a2Crowd;
      raw *= m;
    }
    return he0(e, raw, o);
  };
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by), f = pvOf(), P = W().P;
    if (was && e.dead && f && P && !(by && by.rival) && !(R._reflectKill > 0) && !(R._vampBlock > 0)) {
      if (f.killCd) { P.skillCd = Math.max(0, (P.skillCd || 0) - f.killCd); if (P.skCd) P.skCd = P.skCd.map(c => Math.max(0, (c || 0) - f.killCd)); }
      if (f.killShield) { P.shield = Math.min(P.hpMax * 0.3, Math.max(P.shield || 0, 0) + P.hpMax * f.killShield); if (P.buff) P.buff.shieldT = Math.max(P.buff.shieldT || 0, 6); }
    }
    return r;
  };
  const hp0 = R.hurtPlayer;
  R.hurtPlayer = (raw, src, o) => {
    const f = pvOf(), P = W().P;
    if (f && f.guard && raw > 0) raw *= 1 - Math.min(0.5, f.guard);
    const h = P ? P.hp : 0, r = hp0(raw, src, o);
    if (f && f.hurtRage && P && P.hp < h) P.a2Rage = 3;
    return r;
  };
  let ct = 0;
  const st0 = R.step;
  R.step = dt => {
    const r = st0(dt), w = W(), P = w.P, f = pvOf();
    if (f && P && !P.dead && !w.paused) {
      if (f.mpRegen) P.mp = Math.min(P.mpMax, P.mp + f.mpRegen * dt);
      if (P.a2Rage > 0) P.a2Rage -= dt;
      if (f.crowd) { ct -= dt; if (ct <= 0) { ct = 0.4; P.a2Crowd = Math.min(5, (w.enemies || []).filter(e => !e.dead && !e.under && Math.hypot(e.x - P.x, e.z - P.z) < 6).length); } }
    }
    return r;
  };
  R.adv2plusDebug = { AWK, SPP, HMP, SK };
})(window.R);
