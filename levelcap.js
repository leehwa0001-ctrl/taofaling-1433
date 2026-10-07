// 職業等級上限 100（原本 50 → 80 → 100；遺跡最深到 100 層、卡索級與近神段斷心階還要再練）。滿級之後經驗照樣累積：每攢滿「一級的經驗」換兩個技能點（st.spBonus，skillpoints.js 用）。
// 放在 run.js 後面、其他包住 R.gainXp 的檔案前面：這裡拿到的是種族、飾品、加注條款……都加成過的經驗值。
(function (R) {
  const CAP = 100;
  R.LV_CAP = CAP;
  const gx0 = R.gainXp;
  R.gainXp = v => {
    const S = R.S, st = S && S.classes[S.cls]; if (!st) return gx0(v);
    if (st.lv < CAP) { gx0(v); if (st.lv <= CAP) return; st.spBonus = (st.spBonus || 0) + (st.lv - CAP); st.lv = CAP; st.xp = 0; return; }
    // 滿級：經驗攢滿一級就換一個技能點
    st.lv = CAP; st.xp += v; const need = R.xpNeed(CAP);
    while (st.xp >= need) { st.xp -= need; st.spBonus = (st.spBonus || 0) + 1; R.banner && R.banner('滿級的歷練：技能點 +2', '在暫停選單或公會的「技能點・天賦」用掉它'); }
  };
})(window.R);
