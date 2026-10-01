// 討伐令 1433：存檔（三格）
// 每一格是一個角色。舊版只有一個存檔，第一次打開時搬到第 1 格。
(function (R) {
  const OLD = 'ruins1433-v1', PFX = 'ruins1433-slot', LAST = 'ruins1433-last';
  R.SLOT_N = 3;
  const key = i => PFX + i;
  const raw = i => { try { return JSON.parse(localStorage.getItem(key(i)) || 'null'); } catch (e) { return null; } };
  try { if (!localStorage.getItem(key(1)) && localStorage.getItem(OLD)) localStorage.setItem(key(1), localStorage.getItem(OLD)); } catch (e) { }
  R.slot = 1;
  try { R.slot = Math.min(R.SLOT_N, Math.max(1, +(localStorage.getItem(LAST) || 1) || 1)); } catch (e) { }
  R.save = () => {
    if (!R.S) return;
    try { R.S.savedAt = Date.now(); localStorage.setItem(key(R.slot), JSON.stringify(R.S)); localStorage.setItem(LAST, String(R.slot)); } catch (e) { }
  };
  R.loadSlot = i => { const s = raw(i); if (!s || !(s.v === 1 || s.v === 2)) return null; const m = R.migrate ? R.migrate(s) : s; return m; };
  R.load = () => R.loadSlot(R.slot);
  R.useSlot = i => { R.slot = i; R.S = R.loadSlot(i); if (R.S && R.ensureWorld) R.ensureWorld(); try { localStorage.setItem(LAST, String(i)); } catch (e) { } return R.S; };
  R.deleteSlot = i => { try { localStorage.removeItem(key(i)); } catch (e) { } if (R.slot === i) R.S = null; };
  // 標題畫面上顯示的摘要
  R.slotInfo = i => {
    const s = raw(i); if (!s || !s.classes) return null;
    const st = s.classes[s.cls] || { lv: 1 }, race = s.race && R.RACES[s.race] ? R.RACES[s.race].name : '種族未登記';
    let date = ''; try { if (R.dateOf) date = R.shortDate(R.dateOf(s.day || 0)); } catch (e) { }
    return { name: s.name || '（沒有名字的勇者）', race, cls: R.CLASSES[s.cls] ? R.CLASSES[s.cls].name : s.cls, lv: st.lv, gold: s.gold, date, at: s.savedAt || 0 };
  };
})(window.R);
