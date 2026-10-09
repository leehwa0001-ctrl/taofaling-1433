// 武器、防具、素材再多一點（2026-10-04 作者：武器種類也要多起來了；裝備種類可以再多，素材可以再多）
// - 武器：每個職業多一把（13 把）。符卷師的是毛筆（作者：卷軸派的裝備可以有毛筆、牛皮紙）。
//   拿在手上的樣子、背包格數照武器的種類（sprites.js、raid.js 原本的寫法）；圖示畫在這裡（gear.js 的 R.ICON_EXTRA）。
// - 防具：每個部位多兩種（輕、中、重的變化，名字和數值不同）。
// - 素材：獸骨、蛛絲、羽毛、鱗片、餘燼核、靈質、毒囊——遺跡生物照樣子掉（名字有骨的掉獸骨、蛛的掉蛛絲、鳥鴉蝠蛾掉羽毛……），一般 6%、精英 30%。
//   鐵匠鋪多三個用新素材的配方（骨鍛、鱗甲、靈紋）。
// 放在 data.js、gear.js、classes2.js、crafting.js、sprites.js 後面。
(function (R) {
  const rnd = Math.random;
  // ---------- 武器 ----------
  Object.assign(R.WEAPONS, {
    dualpistol: { name: '雙槍（舊制）', cls: ['gunner'], kind: 'gun', dmg: 7, pellets: 2, rate: 3.6, speed: 27, range: 12, mag: 16, reload: 1.3, spread: 0.12, legacy: 1 },
    sniperrifle: { name: '狙擊步槍', cls: ['gunner'], kind: 'gun', dmg: 28, rate: 0.75, speed: 55, range: 24, mag: 5, reload: 2.7, spread: 0.015 },
    repeater: { name: '連弩', cls: ['archer'], kind: 'bow', dmg: 11, rate: 3.2, speed: 32, range: 15 },
    warhammer: { name: '巨鎚', cls: ['warrior'], kind: 'melee', dmg: 32, rate: 0.85, range: 2.6, arc: 2, kb: 4, stun: 0.25 },
    wand: { name: '短杖', cls: ['mage'], kind: 'magic', dmg: 9, rate: 3.4, speed: 20, range: 13, mp: 1 },
    censer: { name: '香爐', cls: ['priest'], kind: 'magic', dmg: 9, rate: 1.9, speed: 14, range: 11, mp: 1.5, splash: 1.6, holy: 1 },
    nodachi: { name: '野太刀', cls: ['blade'], kind: 'melee', dmg: 24, rate: 1.6, range: 3.2, arc: 2.2, kb: 1.5 },
    halberd: { name: '斧槍', cls: ['knight'], kind: 'thrust', dmg: 22, rate: 1.4, range: 4, width: 1.1, kb: 2.5 },
    claws: { name: '鐵爪', cls: ['monk'], kind: 'melee', dmg: 24, hits: 1, rate: 3.2, range: 3.4, arc: 1.4, kb: 0.4, skillK: 0.7333 },   // 2026-10-09 作者：一下普攻只揮一次（原本三爪）、傷害 ×3、範圍 ×2；skillK：技能、大招的威力維持原本（8×三爪）
    harp: { name: '豎琴', cls: ['bard'], kind: 'magic', dmg: 7, pellets: 3, rate: 1.8, speed: 16, range: 13, mp: 1.5, spread: 0.4 },
    totem: { name: '圖騰', cls: ['summoner'], kind: 'magic', dmg: 14, rate: 1.5, speed: 14, range: 12, mp: 2, splash: 1.4 },
    compass: { name: '羅盤', cls: ['arraymage'], kind: 'magic', dmg: 10, rate: 2.2, speed: 18, range: 14, mp: 1.5, homing: 1 },
    runeaxe: { name: '附魔斧', cls: ['enchanter'], kind: 'melee', dmg: 20, rate: 1.5, range: 2.5, arc: 2, kb: 2.5 },
    brush: { name: '毛筆', cls: ['scroll'], kind: 'magic', dmg: 8, rate: 3, speed: 22, range: 14, mp: 1 }
  });
  // ---------- 防具 ----------
  Object.assign(R.ARMOR, {
    head_plume: { slot: 'head', w: 'light', name: '羽冠', def: 0.8, spd: 0.01 }, head_horn: { slot: 'head', w: 'heavy', name: '角盔', def: 2.4, spd: -0.015 },
    body_robe: { slot: 'body', w: 'light', name: '法袍', def: 1.3, spd: 0.01 }, body_scale: { slot: 'body', w: 'medium', name: '鱗甲', def: 3.8, spd: -0.025 },
    legs_wrap: { slot: 'legs', w: 'light', name: '綁腿', def: 0.7, spd: 0.01 }, legs_skirt: { slot: 'legs', w: 'medium', name: '戰裙', def: 2.1, spd: -0.012 },
    feet_cloth: { slot: 'feet', w: 'light', name: '布鞋', def: 0.3, spd: 0.04 }, feet_war: { slot: 'feet', w: 'heavy', name: '戰靴', def: 1.7, spd: -0.015 }
  });
  // ---------- 素材 ----------
  Object.assign(R.MATS, {
    bone: { name: '獸骨', color: '#E8E0CC', value: 7, desc: '遺跡生物的骨頭，又硬又輕。鐵匠鋪的「骨鍛」用得到。' },
    silk: { name: '蛛絲', color: '#F2F2F8', value: 9, desc: '黏性很強的絲，揉開以後很韌。' },
    feather: { name: '羽毛', color: '#C8D8F0', value: 6, desc: '會飛的遺跡生物身上掉的羽毛。' },
    scale: { name: '鱗片', color: '#5AA8A0', value: 10, desc: '一片一片的硬鱗，鐵匠鋪的「鱗甲」用得到。' },
    ember: { name: '餘燼核', color: '#FF7A3A', value: 14, desc: '摸起來還是溫的火焰結晶。' },
    ecto: { name: '靈質', color: '#B8A8E8', value: 16, desc: '影子一樣的遺跡生物留下的半透明凝膠。鐵匠鋪的「靈紋」用得到。' },
    venom: { name: '毒囊', color: '#8AC83A', value: 8, desc: '裝著毒液的小囊，要小心拿。' }
  });
  if (R.RECIPES) R.RECIPES.push(
    { tier: 1, name: '骨鍛', ilvl: 5, mats: { bone: 6, iron: 2 }, gold: 150, weights: [0, 45, 45, 10, 0] },
    { tier: 2, name: '鱗甲', ilvl: 7, mats: { scale: 6, silk: 3, crystal: 3 }, gold: 320, weights: [0, 10, 50, 35, 5] },
    { tier: 2, name: '靈紋', ilvl: 9, mats: { ecto: 4, ember: 3, venom: 3, core: 1 }, gold: 600, weights: [0, 0, 30, 50, 20] }
  );
  const MAT_OF = e => {
    const n = (e.def && e.def.name) || '';
    if (/骨|骸/.test(n)) return 'bone'; if (/蛛/.test(n)) return 'silk'; if (/鳥|鴉|蝠|蛾|翼/.test(n)) return 'feather';
    if (/蛇|蜥|鯊|魚|蟾|鱗|蛙|蟹/.test(n)) return 'scale'; if (/焰|火|熔|灰燼|燈/.test(n)) return 'ember'; if (/靈|影|魂|瞳|霧/.test(n)) return 'ecto';
    if (/獸|犬|貓|狸|狐|鼠|鼬|牛|豬|狼|鹿|貂/.test(n)) return 'bone'; if (/蟲|蠍|菇|傘|芽|根|樹|蜂|藤/.test(n)) return 'venom';
    return rnd() < 0.5 ? 'venom' : 'bone';
  };
  const ke0 = R.killEnemy;
  R.killEnemy = (e, by) => {
    const was = e && !e.dead, r = ke0(e, by);
    try { const run = R.W.run; if (was && e.dead && run && run.site && run.site.kind === 'ruin' && !(e.def && (e.def.wild || e.def.boss || e.def.human))) { if (rnd() < (e.def.elite ? 0.3 : 0.06)) R.dropMat(MAT_OF(e), 1, e.x, e.z); } } catch (err) { }
    return r;
  };
  // ---------- 拿在手上的樣子：借用同一種類、樣子相近的武器（sprites.js） ----------
  const LOOK = R.WEAPON_LOOK = Object.assign(R.WEAPON_LOOK || {}, { dualpistol: 'pistol', sniperrifle: 'rifle', repeater: 'crossbow', warhammer: 'mace', wand: 'staff', censer: 'bell', nodachi: 'katana', halberd: 'spear', claws: 'gauntlet', harp: 'lute', totem: 'staff', compass: 'disc', runeaxe: 'axe', brush: 'chalk' });   // 別的檔案可以再加（R.WEAPON_LOOK）
  const mk0 = R.makeHeroSprite;
  R.makeHeroSprite = (cls, base, look) => { const h = mk0(cls, LOOK[base] || base, look); if (LOOK[base]) h.base = base; return h; };
  const sw0 = R.setHeroWeapon;
  R.setHeroWeapon = (h, base) => { sw0(h, base); if (LOOK[base] && h) R.spriteLook(h, { weapon: LOOK[base] }); };
  // ---------- 圖示（16×16 點陣） ----------
  R.ICON_EXTRA = Object.assign(R.ICON_EXTRA || {}, {
    dualpistol: ({ rc, m, WOOD }) => { rc(1, 3, 7, 2, m[1]); rc(5, 5, 2, 3, WOOD[0]); rc(8, 9, 7, 2, m[1]); rc(12, 11, 2, 3, WOOD[0]); rc(1, 3, 2, 1, m[0]); rc(8, 9, 2, 1, m[0]); },
    sniperrifle: ({ rc, ln, m, WOOD }) => { ln(1, 8, 14, 8, m[1], 2); rc(8, 5, 4, 2, m[0]); rc(12, 7, 3, 2, m[2]); ln(5, 9, 3, 13, WOOD[0], 2); },
    repeater: ({ rc, ln, m, WOOD }) => { ln(2, 13, 13, 2, WOOD[0], 2); ln(3, 6, 10, 13, m[1], 2); rc(10, 1, 4, 3, m[0]); rc(11, 4, 2, 2, m[2]); },
    warhammer: ({ rc, ln, m, WOOD }) => { ln(3, 14, 10, 7, WOOD[0], 2); rc(8, 1, 7, 6, m[1]); rc(8, 1, 7, 2, m[0]); rc(10, 7, 3, 1, m[2]); },
    wand: ({ ln, circ, m, WOOD, GEM, tier }) => { ln(3, 13, 11, 5, WOOD[1], 2); circ(12, 4, 2.2, GEM[tier] || GEM[0]); circ(11.5, 3.5, 0.8, '#FFFFFF'); },
    censer: ({ ln, circ, rc, m }) => { ln(8, 1, 8, 6, m[2], 1); circ(8, 10, 4.5, m[1]); rc(4, 9, 9, 2, m[0]); circ(6, 4, 1.4, '#E8E8F0'); circ(10, 3, 1.2, '#E8E8F0'); },
    nodachi: ({ ln, rc, m }) => { ln(15, 0, 7, 8, m[0], 2); ln(14, 0, 6, 8, m[1], 1); rc(4, 8, 4, 2, m[2]); ln(5, 10, 1, 14, '#2A2420', 2); },
    halberd: ({ ln, poly, m, WOOD }) => { ln(2, 14, 13, 3, WOOD[0], 2); poly([[10, 1], [15, 1], [15, 6], [12, 4]], m[0]); poly([[12, 6], [9, 9], [8, 5]], m[1]); },
    claws: ({ rc, ln, m, LEATHER }) => { rc(3, 8, 9, 6, LEATHER[0]); ln(4, 8, 4, 2, m[0], 1); ln(7, 8, 8, 1, m[0], 1); ln(10, 8, 12, 2, m[0], 1); rc(3, 12, 9, 2, LEATHER[1]); },
    harp: ({ ln, arc, m, WOOD }) => { arc(8, 9, 6, Math.PI * 1.1, Math.PI * 1.95, WOOD[0], 2); ln(3, 6, 3, 14, WOOD[0], 2); for (let i = 5; i < 13; i += 2) ln(i, 5 + (i - 5) * 0.3, i, 14, '#F2E8C8', 1); },
    totem: ({ rc, m, WOOD }) => { rc(5, 2, 6, 13, WOOD[0]); rc(5, 2, 6, 3, '#C83A3A'); rc(6, 6, 1, 2, '#1A1410'); rc(9, 6, 1, 2, '#1A1410'); rc(6, 10, 4, 1, '#1A1410'); rc(3, 4, 2, 2, WOOD[1]); rc(11, 4, 2, 2, WOOD[1]); },
    compass: ({ circ, ln, m }) => { circ(8, 8, 6.5, m[1]); circ(8, 8, 5, '#E8E0CC'); ln(8, 4, 8, 12, '#C83A3A', 1); ln(4, 8, 12, 8, '#2A2420', 1); circ(8, 8, 1, m[0]); },
    runeaxe: ({ ln, poly, rc, m, WOOD }) => { ln(3, 14, 11, 4, WOOD[0], 2); poly([[9, 1], [15, 4], [14, 9], [10, 7]], m[0]); rc(12, 4, 1, 1, '#7AC8FF'); rc(13, 6, 1, 1, '#FF8A4A'); },
    brush: ({ ln, rc, poly }) => { ln(2, 14, 10, 6, '#8A5A2A', 2); rc(1, 13, 3, 2, '#C8A86A'); poly([[10, 6], [15, 1], [13, 5], [12, 7]], '#1A1410'); },
    head_plume: ({ poly, rc, ln }) => { poly([[2, 11], [8, 5], [14, 11]], '#C8A86A'); rc(2, 11, 13, 2, '#9A7A44'); ln(8, 5, 12, 0, '#E8E8FF', 2); ln(9, 5, 13, 2, '#9AC8F0', 1); },
    head_horn: ({ circ, rc, poly, m }) => { circ(8, 9, 5.5, m[1]); rc(3, 9, 10, 6, m[1]); rc(4, 10, 8, 1, '#1A1620'); poly([[3, 6], [0, 1], [5, 4]], '#E8E0CC'); poly([[13, 6], [16, 1], [11, 4]], '#E8E0CC'); },
    body_robe: ({ poly, rc }) => { poly([[4, 2], [12, 2], [15, 15], [1, 15]], '#5A4A8A'); rc(7, 2, 2, 13, '#C8A86A'); rc(4, 2, 8, 2, '#3A2E6A'); },
    body_scale: ({ rc, m }) => { rc(3, 2, 10, 12, '#3E7A72'); for (let y = 3; y < 13; y += 2) for (let x = 4; x < 12; x += 2) rc(x + (y % 4 ? 1 : 0), y, 1, 1, '#7AC8C0'); rc(3, 2, 10, 1, m[1]); },
    legs_wrap: ({ rc }) => { rc(4, 1, 3, 14, '#C8B89A'); rc(9, 1, 3, 14, '#C8B89A'); for (let y = 2; y < 15; y += 3) { rc(4, y, 3, 1, '#8A7A5A'); rc(9, y, 3, 1, '#8A7A5A'); } },
    legs_skirt: ({ poly, rc, m }) => { poly([[3, 2], [13, 2], [15, 11], [1, 11]], '#8A3A3A'); rc(3, 2, 10, 2, m[1]); rc(4, 11, 3, 4, '#5A4A3A'); rc(9, 11, 3, 4, '#5A4A3A'); },
    feet_cloth: ({ rc }) => { rc(2, 8, 5, 5, '#7A8AA8'); rc(9, 8, 5, 5, '#7A8AA8'); rc(1, 12, 6, 2, '#4E5A78'); rc(9, 12, 6, 2, '#4E5A78'); },
    feet_war: ({ rc, m }) => { rc(2, 4, 5, 10, m[1]); rc(9, 4, 5, 10, m[1]); rc(1, 12, 7, 3, m[2]); rc(9, 12, 7, 3, m[2]); rc(2, 4, 5, 1, m[0]); rc(9, 4, 5, 1, m[0]); }
  });
})(window.R);
