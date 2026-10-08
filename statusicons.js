// 討伐令 1433：狀態圖示（作者 2026-10-05：把狀態圖示，一格一格的放在 HUD 上方，滑鼠放在上面可以看到效果）
// - 遺跡裡，下面那一排（生命、技能、魔力）的上方：好的狀態在大招菱形框的左邊、壞的狀態在右邊，一種一格。
// - 每一格：像素小圖示、框的顏色＝那個狀態的顏色；過掉的時間用順時針變暗的扇形表示，右下角寫剩幾秒。
// - 滑鼠放上去：名字、效果（照實際的數字算，覺醒放大過的也對）、還剩多久。
// - 顯示的東西：吃的東西（當天的加成）、技能的強化（P.sb）、戰吼／防禦／回復／旋風／要塞／狂怒／結界（P.buff）、護盾、
//   隱身、挑釁、架勢；壞的：緩速、看不見、破防／虛弱／重傷（debuff.js 的 P.dbf）、佩特拉的詛咒、元素混亂（克森特級以上）；天賦「滴血重生」（P.ttBleed：生命越低恢復量%越高）。
// - battlehud.js 原本左下角的文字狀態列（#bh-st）改成不顯示，由這裡取代。
// 放在 battlehud.js、debuff.js、enchinfuse.js 後面。
(function (R) {
  const W = R.W, $ = id => document.getElementById(id), esc = s => R.esc(s);
  const PCT = v => Math.round(Math.abs(v) * 100) + '%';

  // ---------- 像素圖示（9×9：# 主色、+ 亮色、o 暗色） ----------
  const ICON = {
    sword: ['.......##', '......###', '.....###.', '#...###..', '.#.###...', '..###....', '..##.....', '.#..#....', '#........'],
    shield: ['#########', '#+++++++#', '#+#####+#', '#+#####+#', '.#+###+#.', '.#+###+#.', '..#+#+#..', '...#+#...', '....#....'],
    crit: ['...###...', '.##+++##.', '.#+...+#.', '#+..#..+#', '#+.###.+#', '#+..#..+#', '.#+...+#.', '.##+++##.', '...###...'],
    speed: ['##..##...', '.##..##..', '..##..##.', '...##..##', '....##..#', '...##..##', '..##..##.', '.##..##..', '##..##...'],
    drop: ['....#....', '....#....', '...###...', '...#+#...', '..##+##..', '..#####..', '.#######.', '.#######.', '..#####..'],
    heart: ['.##...##.', '####.####', '#########', '####+####', '.##+++##.', '..##+##..', '...###...', '....#....', '.........'],
    bubble: ['..#####..', '.#+....#.', '#+......#', '#+......#', '#.......#', '#.......#', '#.......#', '.#.....#.', '..#####..'],
    ghost: ['..#####..', '.#######.', '##..#..##', '##..#..##', '#########', '#########', '#########', '#.##.##.#', '..#...#..'],
    alert: ['...###...', '...###...', '...###...', '...###...', '...###...', '....#....', '.........', '...###...', '...###...'],
    barrier: ['....#....', '...#+#...', '..#+.+#..', '.#+...+#.', '#+.....+#', '.#+...+#.', '..#+.+#..', '...#+#...', '....#....'],
    flame: ['....#....', '...##....', '...###...', '..####.#.', '.###+###.', '.##+++##.', '##++++###', '##+++++##', '.#######.'],
    tower: ['#.#.#.#.#', '#########', '.#######.', '.##+#+##.', '.#######.', '.###+###.', '.###+###.', '.#######.', '#########'],
    swirl: ['#########', '#.......#', '#.#####.#', '#.#...#.#', '#.#.#.#.#', '#.#.###.#', '#.#.....#', '#.#######', '#........'],
    horn: ['......#..', '..#....#.', '.##..#..#', '###.#.#.#', '###.#.#.#', '###.#.#.#', '.##..#..#', '..#....#.', '......#..'],
    bowl: ['.#.#.#...', '..#.#.#..', '.........', '#########', '#+++++++#', '.#######.', '.#######.', '..#####..', '...###...'],
    spark: ['....#....', '....#....', '...###...', '.#######.', '####+####', '.#######.', '...###...', '....#....', '....#....'],
    swords: ['#.......#', '.#.....#.', '..#...#..', '...#.#...', '....#....', '...#.#...', '..#...#..', '##.....##', '##.....##'],
    star: ['....#....', '...###...', '#########', '.#######.', '..#####..', '..##.##..', '.##...##.', '#.......#', '.........'],
    spear: ['....#####', '.......##', '......#.#', '.....#..#', '....#....', '...#.....', '..#......', '.#.......', '#........'],
    down: ['...###...', '...###...', '...###...', '...###...', '#########', '.#######.', '..#####..', '...###...', '....#....'],
    blind: ['#........', '.#.###...', '..#+++##.', '.#+#..+#.', '#+..#..+#', '.#+..#+#.', '..##++#..', '...###.#.', '........#'],
    crack: ['####.####', '#+++..++#', '#+###.#+#', '#+##.##+#', '.#+#.#+#.', '.#+.##+#.', '..#.#+#..', '...#+#...', '....#....'],
    broken: ['......##.', '.....###.', '....###..', '.........', '..##.....', '#.#......', '.#.......', '#.#......', '.........'],
    hurt: ['.##...##.', '####.####', '###.#####', '####.####', '.###.###.', '..#.###..', '...#.#...', '....#....', '.........'],
    eye: ['.........', '..#####..', '.#+...+#.', '#+.###.+#', '#+.#+#.+#', '#+.###.+#', '.#+...+#.', '..#####..', '.........'],
    lessheal: ['.##...##.', '####.####', '#########', '#ooooooo#', '.#######.', '..#####..', '...###...', '....#....', '.........'],
    bleed: ['.##...##.', '####.####', '#########', '####+####', '.##+++##.', '..##+##..', '...#+#...', '....#....', '....#....']
  };
  const mix = (c, t, k) => { const a = new THREE.Color(c), b = new THREE.Color(t); a.lerp(b, k); return '#' + a.getHexString(); };
  const iconCache = {};
  const iconUrl = (name, color) => {
    const key = name + color; if (iconCache[key]) return iconCache[key];
    const rows = ICON[name] || ICON.star, cv = document.createElement('canvas'); cv.width = 9; cv.height = 9;
    const g = cv.getContext('2d'), col = { '#': color, '+': mix(color, '#FFFFFF', 0.55), o: mix(color, '#000000', 0.6) };
    rows.forEach((r, y) => { for (let x = 0; x < 9; x++) { const c = col[r[x]]; if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } } });
    return (iconCache[key] = cv.toDataURL());
  };

  // ---------- 狀態的資料 ----------
  const FOOD = { dept: '百貨的定食', sento: '泡過錢湯', food: '吃飽了', cafe: '咖啡', drink: '熱飲', kuji: '神籤', onsen: '溫泉', churu: '楚璐檢查過', yatai: '屋台', karaoke: '唱過歌', ramen: '泡麵' };
  const BUFF = {
    warcry: ['戰吼', 'horn', '#E8603A', ['你和同行的勇者打出去的傷害 +25%']],
    guard: ['防禦', 'shield', '#C9A13A', ['受到的傷害 −40%', '身邊 4.5 公尺內的隊友受到的傷害 −30%', '周圍的敵人改打你']],
    regen: ['回復', 'heart', '#6FE08A', ['每秒回復 3% 生命']],
    whirl: ['旋風', 'swirl', '#BFE8FF', ['原地轉圈連砍：每 0.2 秒砍周圍 3 公尺', '移動 −30%']],
    fortress: ['要塞', 'tower', '#C9A13A', ['受到的傷害 −70%', '打你的敵人被反彈 30% 的傷害', '移動 −60%']],
    rage: ['狂怒', 'flame', '#FF5A4A', ['打出去的傷害 +50%', '打出去的傷害有 2.5% 變成生命']],
    kekkai: ['大結界', 'barrier', '#FFFFFF', ['擋下飛過來的投射物', '範圍內的遺跡生物變弱、走得慢']]
  };
  const DBF = {
    armor: ['破防', 'crack', '#FF9A6A', ['受到的傷害 +25%']],
    atk: ['虛弱', 'broken', '#C8A0FF', ['打出去的傷害 −25%']],
    heal: ['重傷', 'hurt', '#FF6A8A', ['受到的治療 −50%（回復藥、技能、每秒回血、吸血都算）']]
  };
  // 技能強化（P.sb 的一筆）：照欄位寫效果
  const sbLines = b => {
    const L = [];
    if (b.infuse) L.push('攻擊附加魔法傷害', '開著的時候一直扣魔力（魔力見底就斷）');
    if (b.dmg && b.dmg !== 1) L.push('打出去的傷害 ' + (b.dmg > 1 ? '+' : '−') + PCT(b.dmg - 1));
    if (b.crit) L.push('暴擊率 +' + PCT(b.crit));
    if (b.def) L.push('受到的傷害 ' + (b.def > 0 ? '−' : '+') + PCT(b.def));
    if (b.speed && b.speed !== 1) L.push('移動 ' + (b.speed > 1 ? '+' : '−') + PCT(b.speed - 1));
    if (b.vamp) L.push('吸血系數 +' + Math.round(b.vamp * 2000));
    if (b.vampMul) L.push('吸血系數 ×' + b.vampMul + '（普攻、技能、大招的吸血都算）');
    if (b.regen) L.push('每秒回復 ' + (Math.round(b.regen * 1000) / 10) + '% 生命');
    if (b.pen) L.push('穿透 +' + PCT(b.pen));
    if (b.echo) L.push('普攻有 ' + PCT(b.echo) + ' 的機率多打一下');
    if (b.burn) L.push('打中的敵人會燃燒');
    if (b.taunt) L.push('周圍的敵人改打你');
    if (b.invis) L.push('隱身（遺跡生物看不到你）');
    return L;
  };
  const sbIcon = b => b.infuse ? 'spark' : b.invis ? 'ghost' : b.taunt ? 'alert' : b.def > 0 ? 'shield' : b.burn ? 'flame' : b.dmg > 1 ? 'sword' : b.crit ? 'crit' : b.speed > 1 ? 'speed' : (b.vamp || b.vampMul) ? 'drop' : b.regen ? 'heart' : b.pen ? 'spear' : b.echo ? 'swords' : 'star';
  const sbName = (k, b) => {
    if (b.infuse) return '魔力灌注';
    const id = String(k).split(':')[0];
    if (id === 'race') { const rs = R.raceSkillOf && R.S && R.raceSkillOf(R.S.race); if (rs) return rs[1]; return '種族技能'; }
    const sk = R.SKILLS && R.SKILLS[id];
    if (sk) return sk.name + (/:zone$/.test(k) ? '（範圍裡）' : '');
    if (/^ult/.test(k)) return '大招的強化';
    return '強化';
  };
  const foodLines = b => {
    const L = []; b = b || {};
    if (b.hp) L.push('生命上限 +' + PCT(b.hp)); if (b.mp) L.push('魔力上限 +' + PCT(b.mp)); if (b.dmg) L.push('打出去的傷害 +' + PCT(b.dmg));
    if (b.skillCd) L.push('技能冷卻 −' + PCT(b.skillCd)); if (b.regen) L.push('每秒回復生命 +' + b.regen); if (b.aware) L.push('佩特拉的注意上升 −' + PCT(b.aware));
    return L;
  };

  // 現在身上有的狀態
  R.STATUS_ICON = ICON;   // 別的檔案可以加圖示
  const collect = () => {
    const P = W.P, run = W.run, S = R.S, out = []; if (!P || !run) return out;
    const add = (key, name, icon, color, lines, left, total, bad, note) => out.push({ key, name, icon, color, lines, left, total, bad: !!bad, note });
    if (S && S.buff && S.buff.until === S.day) add('food', FOOD[S.buff.kind] || '當天的加成', 'bowl', '#E8C078', foodLines(S.buff.b), null, null, false, '今天下遺跡都有效');
    const pb = P.buff || {};
    Object.keys(BUFF).forEach(k => { if (pb[k] > 0) { const d = BUFF[k]; add('b:' + k, d[0], d[1], d[2], d[3], pb[k]); } });
    let hasTaunt = false, hasInvis = false;
    if (P.sb) Object.keys(P.sb).forEach(k => {
      const b = P.sb[k]; if (!b || !(b.left > 0) || b.kekkai) return;
      if (b.taunt) hasTaunt = true; if (b.invis) hasInvis = true;
      const L = sbLines(b); if (!L.length) { const sk = R.SKILLS && R.SKILLS[String(k).split(':')[0]]; if (sk && sk.desc) L.push(sk.desc); }
      add('s:' + k, sbName(k, b), sbIcon(b), b.color || '#FFE08A', L, b.infuse ? null : b.left, b.t || null, false, b.infuse ? '魔力還撐得了大約 ' + Math.ceil(b.left) + ' 秒' : null);
    });
    if (P.shield > 0) add('shield', '護盾', 'bubble', '#8AD8FF', ['可以再擋下 ' + Math.ceil(P.shield) + ' 點傷害'], pb.shieldT > 0 ? pb.shieldT : null, 6);
    if (P.invis > 0 && !hasInvis) add('invis', '隱身', 'ghost', '#B8C8D8', ['遺跡生物看不到你'], P.invis);
    if (P.taunt > 0 && !hasTaunt && !(pb.guard > 0)) add('taunt', '挑釁', 'alert', '#E8603A', ['周圍的敵人改打你'], P.taunt);
    if (P.parryT > 0) add('parry', '架勢', 'swords', '#FFFFFF', ['擋下打過來的攻擊並反擊'], P.parryT);
    // 壞的
    if (P.slowT > 0) add('slow', '緩速', 'down', '#8AB8FF', ['移動 −40%'], P.slowT, null, true);
    if (P.blindT > 0) add('blind', '看不見', 'blind', '#C8B898', ['視野變窄、畫面變暗'], P.blindT, null, true);
    const dbf = P.dbf || {}; Object.keys(DBF).forEach(k => { if (dbf[k] > 0) { const d = DBF[k]; add('d:' + k, d[0], d[1], d[2], d[3], dbf[k], k === 'heal' ? 8 : 6, true); } });
    if (P.petraCurse > 0) add('curse', '佩特拉的詛咒', 'eye', '#C86AE8', ['被斷尾吞掉、吐到別層', '生命、魔力的回復減半'], P.petraCurse, 90, true);
    const g = run.grade || {}, aura = run.done || (run.site && run.site.outdoor) ? 0 : R.healAura ? R.healAura(run) : g.id === 'kaso' ? 0.5 : (g.lv || 0) >= 4 ? 0.25 : 0;
    if (aura) add('aura', '元素混亂', 'lessheal', '#FF8AA0', ['傷口長不好：受到的治療 −' + PCT(aura) + '（回復藥、技能、每秒回血、吸血都算）'], null, null, true, (g.name || '這個分級') + '的遺跡裡一直都有');
    const ps = R.potionState && R.potionState(); if (ps && ps.stacks) add('pot', '藥效遞減', 'drop', '#FF8A6A', ['連續喝回復藥：下一瓶只有 1/' + Math.pow(2, ps.stacks) + ' 的效果', '10 秒沒喝恢復一階，30 秒回到全效'], ps.next, 10, true);
    if (ps && ps.fight) add('fight', '戰鬥中', 'swords', '#E8A06A', ['回復藥只有八成的效果（回生命上限 20%）', '6 秒沒被打、身邊沒有醒著的遺跡生物就脫離'], null, null, true, '脫離戰鬥才會消失');
    // 天賦・滴血重生：點了就一直亮，數字照目前少掉的生命算（加的是恢復量%，不是每秒回血）
    if (P.ttBleed > 0 && P.hpMax > 0) {
      const hp = Number.isFinite(P.hp) ? P.hp : P.hpMax, miss = Math.max(0, Math.min(1, 1 - hp / P.hpMax));
      const vampPct = Math.round(P.ttBleed * miss * 1000) / 10, recovPct = Math.round(0.5 * P.ttBleed * miss * 1000) / 10, missPct = Math.round(miss * 100);
      add('ttBleed', '滴血重生', 'bleed', '#E85A6A', [
        '生命越低，吸血系數和恢復量越高',
        '目前少 ' + missPct + '% 生命：吸血系數 +' + vampPct + '%、恢復量 +' + recovPct + '%',
        '點滿時：每少 1% 生命，吸血系數 +1%、恢復量 +0.5%（每秒回血、吸血都算）'
      ], null, null, false, '天賦・恢復奧義');
    }
    // 別的檔案加的狀態（R.STATUS_EXTRA：fn(P, run, add)；frost1008.js 的凍傷）
    (R.STATUS_EXTRA || []).forEach(f => { try { f(P, run, add); } catch (e) { console.warn('[statusicons]', e); } });
    return out;
  };

  // ---------- 畫面 ----------
  const css = document.createElement('style');
  css.textContent = '#bh-st{display:none!important}'
    + '.st-grp{position:fixed;z-index:6;display:flex;gap:4px;pointer-events:none}'
    + '.st-grp.l{flex-direction:row-reverse}'
    + '.st-c{position:relative;width:30px;height:30px;box-sizing:border-box;border:1px solid var(--c);border-radius:4px;background:rgba(18,14,22,.86);box-shadow:0 0 0 1px rgba(0,0,0,.6),inset 0 0 6px rgba(0,0,0,.6);pointer-events:auto;cursor:help;overflow:hidden}'
    + '.st-c.bad{background:rgba(48,14,20,.88)}'
    + '.st-c img{position:absolute;left:5px;top:5px;width:18px;height:18px;image-rendering:pixelated}'
    + '.st-c .sw{position:absolute;inset:0;background:conic-gradient(rgba(0,0,0,.62) calc(var(--p)*1turn),transparent 0)}'
    + '.st-c i{position:absolute;right:1px;bottom:0;font:700 10px/1 system-ui,sans-serif;font-style:normal;color:#fff;text-shadow:0 0 2px #000,0 0 2px #000,0 0 2px #000}'
    + '.st-c.end{animation:stBlink .5s steps(2) infinite}@keyframes stBlink{50%{opacity:.45}}'
    + '#st-tip{position:fixed;z-index:60;max-width:260px;padding:8px 10px;border-radius:6px;background:rgba(16,12,20,.96);border:1px solid #5A4A5E;color:#EDE6DA;font-size:12px;line-height:1.5;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.5)}'
    + '#st-tip b{display:block;font-size:13px;margin-bottom:2px}#st-tip ul{margin:0;padding-left:16px}#st-tip small{display:block;margin-top:3px;color:#A89CA8}';
  document.head.appendChild(css);
  let grpL = null, grpR = null, tip = null, hover = null;
  const cells = {}, totals = {};
  const ensure = () => {
    if (grpL && grpL.isConnected) return true;
    const host = $('run'); if (!host) return false;
    grpL = document.createElement('div'); grpL.className = 'st-grp l dungeon-only'; grpR = document.createElement('div'); grpR.className = 'st-grp r dungeon-only';
    host.appendChild(grpL); host.appendChild(grpR); return true;
  };
  const tipHtml = it => '<b style="color:' + it.color + '">' + esc(it.name) + (it.bad ? '<span style="color:#FF8A8A;font-size:11px">　壞狀態</span>' : '') + '</b>'
    + (it.lines.length ? '<ul>' + it.lines.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '')
    + '<small>' + (it.note ? esc(it.note) : it.left != null ? '還剩 ' + (it.left >= 10 ? Math.ceil(it.left) : it.left.toFixed(1)) + ' 秒' : '') + '</small>';
  const showTip = (cell, it) => {
    if (!tip) { tip = document.createElement('div'); tip.id = 'st-tip'; document.body.appendChild(tip); }
    tip.innerHTML = tipHtml(it); tip.hidden = false;
    const r = cell.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(6, Math.min(innerWidth - tw - 6, r.left + r.width / 2 - tw / 2)) + 'px';
    tip.style.top = Math.max(6, r.top - th - 8) + 'px';
  };
  const hideTip = () => { hover = null; if (tip) tip.hidden = true; };
  const makeCell = key => {
    const c = document.createElement('div'); c.className = 'st-c'; c.innerHTML = '<img alt=""><div class="sw"></div><i></i>';
    c.addEventListener('mouseenter', () => { hover = key; const it = c._it; if (it) showTip(c, it); });
    c.addEventListener('mouseleave', hideTip);
    return c;
  };
  const place = () => {
    const dock = $('h2-dock'), ul = document.querySelector('#run .ul-btn');
    const vis = el => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? r : null; };   // 固定定位的沒有 offsetParent，用大小判斷
    const dr = vis(dock); if (!dr) return false;
    const ur = vis(ul);
    const cx = ur ? ur.left + ur.width / 2 : dr.left + dr.width / 2, half = ur ? ur.width / 2 + 8 : 8, bottom = innerHeight - dr.top + 8;
    grpL.style.right = (innerWidth - (cx - half)) + 'px'; grpL.style.bottom = bottom + 'px';
    grpR.style.left = (cx + half) + 'px'; grpR.style.bottom = bottom + 'px';
    return true;
  };
  const render = () => {
    if (!ensure()) return;
    const run = W.run, on = !!(run && !run.done && W.P);
    grpL.hidden = grpR.hidden = !on; if (!on) { hideTip(); return; }
    if (!place()) { grpL.hidden = grpR.hidden = true; return; }
    const items = collect(), seen = {};
    items.forEach(it => {
      seen[it.key] = 1;
      let c = cells[it.key]; if (!c) c = cells[it.key] = makeCell(it.key);
      // 總時間：有寫的用寫的；沒寫的記第一次看到時剩的（重新上了更長的就換）
      if (it.left != null) { const t0 = totals[it.key] || 0; totals[it.key] = it.total || (it.left > t0 ? it.left : t0); } else delete totals[it.key];
      const grp = it.bad ? grpR : grpL; if (c.parentNode !== grp) grp.appendChild(c);
      c._it = it; c.className = 'st-c' + (it.bad ? ' bad' : '') + (it.left != null && it.left < 2 ? ' end' : '');
      c.style.setProperty('--c', it.color);
      const img = c.firstChild, src = iconUrl(it.icon, it.color); if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      const p = it.left != null && totals[it.key] ? Math.max(0, Math.min(1, 1 - it.left / totals[it.key])) : 0; c.children[1].style.setProperty('--p', p.toFixed(3));
      const tx = it.left == null ? '' : it.left >= 10 ? String(Math.ceil(it.left)) : it.left.toFixed(1); if (c.children[2].textContent !== tx) c.children[2].textContent = tx;
      if (hover === it.key) showTip(c, it);
    });
    Object.keys(cells).forEach(k => { if (!seen[k]) { if (hover === k) hideTip(); cells[k].remove(); delete cells[k]; delete totals[k]; } });
  };
  let acc = 0;
  const tick0 = R.hudTick;
  R.hudTick = dt => { tick0(dt); acc += dt; if (acc < 0.2) return; acc = 0; try { render(); } catch (e) { console.warn('[statusicons]', e); } };
  R.statusIcons = collect;   // 給測試、其他畫面用
})(window.R);
