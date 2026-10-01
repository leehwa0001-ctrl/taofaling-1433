// 討伐令 1433：測試存檔（作者：給我個測試號）
// 網址後面加 ?test（例如 https://…/taofaling-1433/?test），標題畫面會多一顆「建立測試存檔」：
// 每個職業 Lv 20、99999 費拉、回復藥魔力藥各 30、每種素材 50（含魔力核心，可以轉職）、
// 每種武器一把神話、每種護具一件傳說、一個神話護符，每個職業都穿好；共通的被動全部學會。
// 用掉第一格空的存檔；三格都滿了就蓋掉第三格。一般玩家的網址沒有 ?test，看不到這顆按鈕。
(function (R) {
  if (!/[?&]test\b/.test(location.search)) return;
  const $ = id => document.getElementById(id);
  const make = () => {
    let slot = 0; for (let i = 1; i <= R.SLOT_N; i++) if (!R.slotInfo(i)) { slot = i; break; } if (!slot) slot = R.SLOT_N;
    const race = 'human', rc = R.RACES[race];
    R.slot = slot;
    R.S = R.freshSave('warrior', { name: '測試員', race, look: { hs: 'short', hair: '#2A1E16', skin: rc.skins[0], eye: '#1A1714', top: '#3A4A5A', cloak: '#5A3A2A', acc: 'none', accCol: '#C8323A' } });
    if (R.ensureWorld) R.ensureWorld();
    const S = R.S;
    Object.keys(R.CLASSES).forEach(c => { R.ensureKit(c); S.classes[c].lv = 20; S.classes[c].xp = 0; });
    S.gold = 99999; S.potions.hp = 30; S.potions.mp = 30;
    Object.keys(R.MATS).forEach(k => { S.mats[k] = (S.mats[k] || 0) + 50; });
    const weapons = {}; Object.keys(R.WEAPONS).forEach(base => { const it = R.makeItem({ kind: 'weapon', base, ilvl: 9, rarity: 5, identified: true }); S.stash.push(it); weapons[base] = it; });
    const armor = {}; Object.keys(R.ARMOR).forEach(base => { const it = R.makeItem({ kind: 'armor', base, ilvl: 9, rarity: 4, identified: true }); S.stash.push(it); armor[base] = it; });
    const charm = R.makeItem({ kind: 'charm', base: 'charm', ilvl: 9, rarity: 5, identified: true }); S.stash.push(charm);
    Object.keys(R.CLASSES).forEach(c => { const e = S.equip[c] = S.equip[c] || {}; e.weapon = weapons[R.weaponsFor(c)[0]].id; ['head', 'body', 'legs', 'feet'].forEach(k => { e[k] = armor[k + '_medium'].id; }); e.charm = charm.id; });
    if (R.PASSIVES) S.pvBought = Object.keys(R.PASSIVES).filter(id => R.PASSIVES[id].cls === '*');
    S.stats = S.stats || {}; S.stats.helped = 1;
    R.save();
    if (R.say) R.say('測試存檔建立好了（存檔 ' + slot + '）');
    if (R.syncStatus) R.syncStatus();
    R.enterTown();
  };
  const addBtn = () => {
    const box = document.querySelector('#title .t-btns'); if (!box || $('t-test')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 't-test';
    b.innerHTML = '建立測試存檔<small>Lv 20、99999 費拉、整套神話裝備（用第一格空的存檔，滿了就蓋掉第三格）</small>';
    b.onclick = make; box.appendChild(b);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBtn); else addBtn();
})(window.R);
