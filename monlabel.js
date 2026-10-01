// 討伐令 1433：遺跡生物頭上的名牌（小圖示＋名字＋生命條），圖鑑的小圖示和數值
// - 13 公尺內、在畫面上的生物才標（太遠的不標，畫面才不會亂）；領主體、佩特拉核心有上方的大血條，不另外標。
// - 精英、帶頭的是橘色；人（惡質的勇者、賞金獵人）是紅色。
// - 圖鑑：同一張小圖示（照生物自己的點陣圖），加上生命、傷害、速度和「打倒過幾隻」（R.S.dexKills：每一趟遺跡結束時加進去）。
(function (R) {
  const W = R.W, $ = id => document.getElementById(id), esc = s => R.esc(s);

  // ---------- 小圖示：生物點陣圖的第一格，整數倍放大 ----------
  const icons = {};
  R.beastIconURL = (id, k) => {
    k = k || 3; const key = id + ':' + k; if (icons[key] != null) return icons[key];
    let url = '';
    try {
      const d = R.ENEMIES[id]; if (d && !d.human && R.beastSheetOf) {
        const sh = R.beastSheetOf(id), c = document.createElement('canvas'); c.width = sh.fw * k; c.height = sh.fh * k;
        const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(sh.c, 0, 0, sh.fw, sh.fh, 0, 0, c.width, c.height); url = c.toDataURL();
      }
    } catch (e) { url = ''; }
    return (icons[key] = url);
  };
  const rankOf = e => (e.def.human ? 'human' : e.def.elite || e.role === 'leader' ? 'elite' : '');

  // ---------- 名牌 ----------
  const tags = new Map();
  let layer = null, v = null;
  const ensureLayer = () => { if (layer && layer.isConnected) return layer; layer = document.createElement('div'); layer.id = 'r-tags'; const nums = $('r-nums'); nums.parentNode.insertBefore(layer, nums); return layer; };
  const makeTag = e => {
    const el = document.createElement('div'), d = e.def, rank = rankOf(e), url = R.beastIconURL(e.id, 2);
    el.className = 'mtag ' + rank;
    el.innerHTML = (url ? '<img src="' + url + '" alt="">' : '<span class="mg">' + (d.human ? '人' : esc(d.name.slice(-1))) + '</span>') + '<b>' + (rank === 'elite' ? '◆' : '') + esc(d.name.split('・').pop()) + '</b><i><em></em></i>';
    ensureLayer().appendChild(el);
    const t = { el, bar: el.querySelector('em'), top: null, last: -1 }; tags.set(e, t); return t;
  };
  const topOf = e => {
    const s = e.m && e.m.spr;
    if (s && s.geometry) { if (!s.geometry.boundingBox) s.geometry.computeBoundingBox(); return (s.position.y || 0) + s.geometry.boundingBox.max.y * (s.scale ? s.scale.y : 1) + 0.25; }
    return 2.2;
  };
  const clearTags = () => { tags.forEach(t => t.el.remove()); tags.clear(); };
  R.clearMonTags = clearTags;
  const updateTags = () => {
    const run = W.run, P = W.P;
    if (!run || !P || !W.camera || !window.THREE) { if (tags.size) clearTags(); return; }
    if (!v) v = new THREE.Vector3();
    const w = window.innerWidth, h = window.innerHeight, live = new Set();
    for (const e of W.enemies) {
      const d = e.def; if (e.dead || !d || d.boss || d.noTag) continue;
      if (Math.abs(e.x - P.x) > 13 || Math.abs(e.z - P.z) > 13 || Math.hypot(e.x - P.x, e.z - P.z) > 13) continue;
      if (e.m && e.m.g && e.m.g.visible === false) continue;
      let t = tags.get(e) || makeTag(e); if (t.top == null) t.top = topOf(e);
      v.set(e.x, (e.m && e.m.g ? e.m.g.position.y : 0) + t.top, e.z).project(W.camera);
      if (v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.2) { t.el.style.display = 'none'; live.add(e); continue; }
      t.el.style.display = '';
      t.el.style.transform = 'translate(' + Math.round((v.x + 1) / 2 * w) + 'px,' + Math.round((1 - v.y) / 2 * h) + 'px) translate(-50%,-100%)';
      const pc = Math.max(0, Math.min(1, e.hp / e.hpMax)); if (pc !== t.last) { t.last = pc; t.bar.style.width = (pc * 100).toFixed(1) + '%'; }
      live.add(e);
    }
    tags.forEach((t, e) => { if (!live.has(e)) { t.el.remove(); tags.delete(e); } });
  };
  const uf = R.updateFx;
  R.updateFx = dt => { uf(dt); updateTags(); };
  // 換樓層、回城：名牌清掉
  const lf = R.loadFloor;
  if (lf) R.loadFloor = (...a) => { clearTags(); return lf(...a); };

  // ---------- 圖鑑：打倒過幾隻 ----------
  const er = R.endRun;
  R.endRun = (...a) => {
    const run = W.run, S = R.S;
    if (run && run.killIds && S) { S.dexKills = S.dexKills || {}; Object.keys(run.killIds).forEach(id => { S.dexKills[id] = (S.dexKills[id] || 0) + run.killIds[id]; }); }
    clearTags();
    return er(...a);
  };
  // main.js 的圖鑑卡片用：小圖示、數值
  R.dexIcon = (id, fallback) => { const url = R.beastIconURL(id, 3), e = R.ENEMIES[id]; return url ? '<span class="em em-img" style="--c:' + e.color + '"><img src="' + url + '" alt=""></span>' : fallback; };
  R.dexStats = id => {
    const e = R.ENEMIES[id], S = R.S, k = S && S.dexKills ? S.dexKills[id] || 0 : 0;
    const sp = e.speed >= 5 ? '很快' : e.speed >= 3.2 ? '快' : e.speed >= 2.2 ? '普通' : '慢';
    const tags2 = [e.fly ? '會飛' : '', e.shoot ? '遠程' : '', e.armor ? '甲殼（減傷 ' + Math.round(e.armor * 100) + '%）' : '', e.elite ? '精英' : '', e.boss ? '領主級' : ''].filter(Boolean);
    return '<div class="dexstat"><span>生命 <b>' + e.hp + '</b></span><span>傷害 <b>' + e.dmg + '</b></span><span>速度 <b>' + sp + '</b></span>' + (tags2.length ? '<span>' + esc(tags2.join('・')) + '</span>' : '') + (S ? '<span>打倒過 <b>' + k + '</b> 隻</span>' : '') + '</div>';
  };
})(window.R);
