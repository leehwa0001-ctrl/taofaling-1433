// 槍手的槍（2026-10-08 作者）
// - 狙擊步槍：傷害 ×1.5、子彈穿透 2 隻；拿在手上是長槍管＋瞄準鏡（以前借步槍的樣子，不像狙擊槍）。
// - 刪掉手槍：手槍全部變成「雙槍」——每次射出的子彈數 ×2、換彈速度 ×2（換彈時間減半），圖示、拿在手上都是兩把槍。
//   舊的雙槍（舊制）也換彈 ×2。存檔裡的手槍不用改（武器種類的 id 一樣是 pistol，名字和數值改成雙槍）。
// - 翻滾射擊：換彈匣改成補 30% 的子彈；必定暴擊改成熟練度 ★3 可以選的變化「要害」（之後 3 發必定暴擊）。
//   同日：換彈中翻滾不打斷換彈，下一匣多 30%（combat.js 的 P._ammoBonus、run.js 換好的時候加上去）。
// - 被動（同日第二批，作者：被動同質性很高）：快速裝填＝換彈時間 −20%；彈殼回收＝擊倒補 10% 彈匣（最少 1 發）；槍聖之眼＝補 20%；
//   老練＝傷害 +15%、換彈時間 −30%；彈道學＝暴擊傷害 +40%、攻擊射程 +20%；狙擊手的轉職被動＝暴擊率 +5%、攻擊射程 +30%（combat.js）。
// 放在所有改 R.WEAPONS 的檔案後面（gearmore.js、balance20261006.js 後面），skillvar.js 後面。
(function (R) {
  const Wp = R.WEAPONS;
  if (Wp.sniperrifle && !Wp.sniperrifle._g1008) Object.assign(Wp.sniperrifle, { dmg: Wp.sniperrifle.dmg * 1.5, pierce: 2, _g1008: 1 });
  if (Wp.pistol && !Wp.pistol._g1008) Object.assign(Wp.pistol, { name: '雙槍', pellets: (Wp.pistol.pellets || 1) * 2, reload: Wp.pistol.reload / 2, spread: Math.max(Wp.pistol.spread || 0, 0.07), dual: 1, _g1008: 1 });
  if (Wp.dualpistol && !Wp.dualpistol._g1008) Object.assign(Wp.dualpistol, { reload: Wp.dualpistol.reload / 2, dual: 1, _g1008: 1 });
  // 登記武器的說明
  const g = R.REG && R.REG.find(x => x.cls === 'gunner');
  if (g) g.list.forEach(row => { if (row[0] === 'pistol') row[1] = '左右手各一把：每次兩發、換彈很快。'; });
  // 拿在手上的樣子：雙槍、狙擊步槍用自己的（sprites.js 的槍那一段），不再借別的武器
  if (R.WEAPON_LOOK) { delete R.WEAPON_LOOK.dualpistol; delete R.WEAPON_LOOK.sniperrifle; }
  // 圖示：手槍改成雙槍的圖
  if (R.ICON_EXTRA && R.ICON_EXTRA.dualpistol) R.ICON_EXTRA.pistol = R.ICON_EXTRA.dualpistol;
  // 翻滾射擊
  if (R.SKILLS && R.SKILLS.roll) R.SKILLS.roll.desc = '往後翻滾（翻滾的時候不會受傷），彈匣補回 30% 的子彈。熟練度 ★3 可以選「要害」：翻滾之後 3 發必定暴擊。';
  // 被動（2026-10-08 作者：被動技能同質性很高）：照作者給的數字，蓋掉 passives.js 照等級放大的值
  const PV = R.PASSIVES || {};
  const setPv = (id, desc, fx) => { if (PV[id]) Object.assign(PV[id], { desc, fx }); };
  setPv('gu1', '換彈時間 −20%。', { reload: 0.2 });
  setPv('gu7', '擊倒遺跡生物，彈匣立刻補 10% 的子彈（最少 1 發）。', { killAmmoP: 0.1 });
  setPv('gu9', '傷害 +15%；換彈時間 −30%。', { dmg: 0.15, reload: 0.3 });
  setPv('gu11', '暴擊傷害 +40%；攻擊射程 +20%。', { critMult: 0.4, range: 0.2 });
  if (PV.a2p_gunner_sp) Object.assign(PV.a2p_gunner_sp, { fx: { killAmmoP: 0.2, critMult: 0.25 }, desc: String(PV.a2p_gunner_sp.desc || '').replace(/擊倒遺跡生物，彈匣補 \d+ 發/, '擊倒遺跡生物，彈匣立刻補 20% 的子彈（最少 1 發）') });
  const V = R.SKILL_VARIANTS;
  if (V && !V.rollcrit) V.rollcrit = { n: '要害', d: '翻滾之後 3 發必定暴擊', ok: () => true, f: () => { } };
  const sv0 = R.skillVariants;
  if (sv0) R.skillVariants = id => { const v = sv0(id); return id === 'roll' && !v.includes('rollcrit') ? ['rollcrit'].concat(v) : v; };
})(window.R);
