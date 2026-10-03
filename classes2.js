// 新職業（2026-10-04 作者：職業只有新增一個太少了；PDF《法術統整》可以參考來發想職業）
// 照《法術統整》第五章的施法派系：
//   吟遊詩人＝吟遊派「馬里奧派」（把咒文編成曲子彈出來；鼓舞隊伍、聲音攻擊）
//   召喚師＝召喚派「霍克派」（靠執念把魔力捏成具象的召喚物；霍克的「土」狗）
//   術陣師＝術陣派「艾達諾拉派」（閉環的法陣：陷阱、結界、持續的場域）
//   附魔師＝附魔派「恩特安派」（把咒文刻進武器：焰、霜、雷；穿透魔力罩）
//   符卷師＝卷軸派「諾克薩派」（預先寫好的卷軸：零前搖、可以一次放好幾張）
// 這裡放職業、武器、登記、轉職路線；技能、召喚、轉職的被動、大招在 classes2b.js。放在 data.js 後面。
(function (R) {
  Object.assign(R.CLASSES, {
    bard: { name: '吟遊詩人', hp: 98, mp: 85, speed: 6.1, skill: 'bd_anthem', color: '#C86AA8', desc: '魯特琴、長笛。吟遊派：把咒文編成曲子彈出來，鼓舞自己和隊友、用音波攻擊。', look: { top: '#8A3A6A', hair: '#E8C878', cloak: '#4A2A5A' } },
    summoner: { name: '召喚師', hp: 92, mp: 100, speed: 5.9, skill: 'sn_dog', color: '#6A8A5A', desc: '契約書、召喚鈴。召喚派：用執念把魔力捏成具象的召喚物，替你咬、替你擋。', look: { top: '#3E5A3A', hair: '#2A2420', cloak: '#5A4A2E' } },
    arraymage: { name: '術陣師', hp: 90, mp: 105, speed: 5.9, skill: 'ry_burst', color: '#4A8AA8', desc: '陣筆、陣盤。術陣派：在地上畫閉環的法陣——陷阱、結界、持續燒人的場域。', look: { top: '#2E4A6A', hair: '#C8D0D8', cloak: '#1E3A4A' } },
    enchanter: { name: '附魔師', hp: 118, mp: 60, speed: 6.2, skill: 'en_flame', color: '#B85A3A', desc: '附魔劍、附魔短刀。附魔派：把咒文刻進武器裡，揮出焰、霜、雷；打得穿魔力罩（無視一部分護甲）。', look: { top: '#6A3A2E', hair: '#1A1418', cloak: '#3A2A2A' } },
    scroll: { name: '符卷師', hp: 90, mp: 95, speed: 6.2, skill: 'sc_volley', color: '#C8A85A', desc: '卷軸、符紙。卷軸派：預先寫好咒文的卷軸，注入一點魔力就發動，零前搖、可以一次放好幾張。', look: { top: '#8A7A4A', hair: '#3A2A1E', cloak: '#6A5A3A' } }
  });
  Object.assign(R.WEAPONS, {
    lute: { name: '魯特琴', cls: ['bard'], kind: 'magic', dmg: 10, rate: 1.9, speed: 16, range: 12, mp: 1.5, pierce: 2 },
    flute: { name: '長笛', cls: ['bard'], kind: 'magic', dmg: 5.5, pellets: 2, rate: 2.6, speed: 19, range: 13, mp: 1, homing: 1, spread: 0.2 },
    tome: { name: '契約書', cls: ['summoner'], kind: 'magic', dmg: 12, rate: 1.7, speed: 15, range: 13, mp: 2, splash: 1 },
    bell: { name: '召喚鈴', cls: ['summoner'], kind: 'magic', dmg: 6, pellets: 2, rate: 2.2, speed: 17, range: 13, mp: 1.5, homing: 1, spread: 0.25 },
    chalk: { name: '陣筆', cls: ['arraymage'], kind: 'magic', dmg: 13, rate: 2, speed: 16, range: 13, mp: 2, splash: 1.2 },
    disc: { name: '陣盤', cls: ['arraymage'], kind: 'magic', dmg: 7, pellets: 2, rate: 2.4, speed: 17, range: 12, mp: 1.5, homing: 1, spread: 0.3 },
    runeblade: { name: '附魔劍', cls: ['enchanter'], kind: 'melee', dmg: 15, rate: 2.1, range: 2.4, arc: 1.8, kb: 1 },
    runedagger: { name: '附魔短刀', cls: ['enchanter'], kind: 'melee', dmg: 9, hits: 2, rate: 3, range: 1.9, arc: 1.4 },
    scrollb: { name: '卷軸', cls: ['scroll'], kind: 'magic', dmg: 7, pellets: 3, rate: 1.6, speed: 18, range: 12, mp: 2, spread: 0.35 },
    talisman: { name: '符紙', cls: ['scroll'], kind: 'magic', dmg: 11, rate: 2.3, speed: 22, range: 14, mp: 1.5 }
  });
  Object.assign(R.STARTER, { bard: 'lute', summoner: 'tome', arraymage: 'chalk', enchanter: 'runeblade', scroll: 'scrollb' });
  R.REG.push(
    { cls: 'bard', group: '樂器', list: [['lute', '音波穿過兩隻敵人。'], ['flute', '兩個會追蹤的音符。']] },
    { cls: 'summoner', group: '召喚媒介', list: [['tome', '會爆開的魔力彈。'], ['bell', '兩發會追蹤的鈴音。']] },
    { cls: 'arraymage', group: '陣具', list: [['chalk', '會爆開的陣光。'], ['disc', '兩發會追蹤的陣光。']] },
    { cls: 'enchanter', group: '附魔兵器', list: [['runeblade', '平衡，刻著咒文。'], ['runedagger', '一次砍兩下。']] },
    { cls: 'scroll', group: '卷軸', list: [['scrollb', '一次三張，扇形打出去。'], ['talisman', '射得快、射得遠。']] }
  );
  Object.assign(R.ADV, {
    bard: [
      { id: 'aria', name: '詠嘆詩人', path: '強化', skill: 'ai_hymn', desc: '技能「頌歌」：你和隊友都回復一大口生命，還多一層護盾。被動：治療 +30%、隊友受到的傷害 −15%。' },
      { id: 'drummer', name: '戰鼓手', path: '變化', skill: 'dm_thunder', desc: '技能「雷鼓」：連敲三下，一圈一圈的鼓聲震飛周圍的敵人。被動：技能冷卻 −12%、暴擊率 +6%。' },
      { id: 'serane', name: '奏域師', path: '昭旭・遺跡', skill: 'se_field', desc: '諧鳴奏域派系「瑟蘭派」：用共振圍出一個閉環的「奏域」。技能「奏域」：腳下展開 8 秒的奏域，裡面回血、灼傷敵人。被動：佩特拉的注意上升 −20%、魔力 +20%。' }],
    summoner: [
      { id: 'beastlord', name: '萬獸師', path: '強化', skill: 'bl_pack', desc: '技能「百獸」：一口氣召喚四隻土狼。被動：召喚物的傷害 +40%、多撐一陣子。' },
      { id: 'medium', name: '靈媒師', path: '變化', skill: 'md_haunt', desc: '技能「附身」：放出怨靈纏著周圍的敵人 8 秒，一直咬。被動：每次召喚回復 6% 生命（回收召喚物的空虛感，換成了生命）。' },
      { id: 'tamer', name: '遺跡馴獸師', path: '昭旭・遺跡', skill: 'tm_tame', desc: '技能「馴服」：用執念捏出這一層遺跡生物的樣子，替你打 15 秒。被動：佩特拉的注意上升 −15%、召喚物的傷害 +20%。' },
      // 式神使（2026-10-04 從術士搬過來：紙式神也是用執念捏出來的召喚物）
      { id: 'shikigami', name: '式神使', path: '式神', skill: 'ss_shiki', desc: '把執念寫進紙裡，折成會動的式神。技能「式神」：放出三隻紙式神環繞你、自動攻擊 10 秒。被動：常駐一隻式神。' }],
    arraymage: [
      { id: 'grandarray', name: '大陣師', path: '強化', skill: 'ga_grand', desc: '技能「大法陣」：準心處畫一個巨大的閉環，一秒後爆開。被動：法陣的範圍 +25%（技能傷害 +15%）。' },
      { id: 'warder', name: '結界師', path: '變化', skill: 'wd_ward', desc: '技能「守護陣」：腳下立一座結界燈 10 秒，一直回復你。被動：受到的傷害 −12%、防禦 +3。' },
      { id: 'eidanora', name: '艾達諾拉的傳人', path: '昭旭・遺跡', skill: 'ed_loop', desc: '術陣派的開創者「艾達諾拉」的抑制圈：法陣不散。技能「抑制圈」：準心處放一個長時間的法陣，持續傷害、讓敵人變慢。被動：技能的魔力消耗少一成（技能冷卻 −10%）。' }],
    enchanter: [
      { id: 'runesmith', name: '刻印師', path: '強化', skill: 'rs_triple', desc: '技能「三重附魔」：焰、霜、雷一次刻上去 10 秒。被動：穿透 +15%、燃燒機率 +10%。' },
      { id: 'spellblade', name: '魔劍士', path: '變化', skill: 'sb_wave', desc: '技能「劍氣」：把附魔的斬擊打出去，穿過一整排敵人。被動：法術傷害也算進近戰（傷害 +10%）、魔力 +25%。' },
      { id: 'entian', name: '恩特安的傳人', path: '昭旭・遺跡', skill: 'et_tear', desc: '「附魔之父」恩特安的作品撕得開魔力罩。技能「撕裂」：一刀直線，必定暴擊。被動：穿透 +30%（無視更多護甲）。' }],
    scroll: [
      { id: 'scribe', name: '抄寫師', path: '強化', skill: 'sr_stack', desc: '技能「疊卷」：一次撕開五張火卷，準心處連爆。被動：技能冷卻 −15%。' },
      { id: 'sealer', name: '封印師', path: '變化', skill: 'sl_seal', desc: '技能「封印符」：準心處的敵人被封住 3 秒、受到的傷害 +30%。被動：暴擊率 +8%。' },
      { id: 'noxa', name: '諾克薩的傳人', path: '昭旭・遺跡', skill: 'nx_burst', desc: '卷軸派「諾克薩派」：預載的咒文。技能「預載・全開」：把預先寫好的卷軸一次全放出去，四面八方。被動：魔力 +30%；高濃度的魔力環境（克森特級以上）傷害 +10%。' }]
  });
  R.CLASS_IDS = Object.keys(R.CLASSES);
})(window.R);
