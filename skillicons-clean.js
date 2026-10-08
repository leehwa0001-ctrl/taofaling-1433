// 簡潔彩繪圖示：依招式種類取圖，載入失敗時沿用原圖。
(function (R) {
  const previous = R.skillIconURL, info = R.skillIconInfo;
  if (!previous || !info) return;
  const tiles = { slash: 0, xslash: 1, fist: 2, guard: 3, fireball: 4,
    frost: 5, bolt: 6, wave: 7, heal: 8, drain: 9, arrow: 10,
    shot: 11, orb: 12, paw: 13, note: 14, scroll: 15 };
  const extraKinds = 'spin thrust slashwave snipe boom nova quake pillar meteor zone mark vortex dash blink buff rage horn wing eye fang ghost parry orbit turret hook storm boomer jump beam breath aura dance revive infuse trap palm qi kick pole star'.split(' ');
  const ultKinds = { gunner: 'shot', archer: 'arrow', warrior: 'quake', mage: 'meteor', priest: 'revive', blade: 'xslash', knight: 'guard', monk: 'fist', bard: 'note', summoner: 'paw', arraymage: 'zone', enchanter: 'infuse', scroll: 'scroll' };
  const raceKinds = { '龍息': 'breath', '振翅': 'wing', '血之渴望': 'fang', '震地': 'quake', '精靈之光': 'heal', '隱身': 'ghost', '激流': 'wave', '晶刺': 'frost', '硬化': 'guard', '毒刺': 'thrust', '野性咆哮': 'rage', '魔焰': 'fireball' };
  // 這些舊制技能沒有 SKILL_LIB 的型別；奏域則是縮減諧鳴後保留的自訂型別。
  const specialKinds = { sanctuary: ['aura', '#ffe5a0'], wild: ['zone', '#6fb36a', 'root'], iai: ['slashwave', '#c8dcff', 'crit'], shadowstep: ['blink', '#ad83dc', 'ghost'], holycharge: ['dash', '#ffe8a0', 'stun'], fortress: ['guard', '#c9a13a'], hex: ['mark', '#9a4acf', 'curse'], shiki: ['orbit', '#ded9ff'], kekkai: ['guard', '#ffffff'], yotoRelease: ['slash', '#b83ae8'], jump: ['jump', '#edba75'], hm_field: ['zone', '#ffb8e0'] };
  const pathKinds = { sniper: 'snipe', magigun: 'bolt', bomber: 'boom', arcane: 'orbit', ranger: 'trap', hama: 'arrow', berserker: 'vortex', gladiator: 'spin', onimusha: 'ghost', elementalist: 'meteor', hexer: 'mark', waixiu: 'qi', bishop: 'aura', druid: 'heal', shinkan: 'guard', kensei: 'slashwave', shadow: 'blink', yoto: 'xslash', templar: 'guard', paladin: 'heal', dragoon: 'jump', fistsaint: 'fist', staffmonk: 'pole', inner: 'qi', aria: 'note', drummer: 'horn', serane: 'zone', beastlord: 'paw', medium: 'ghost', tamer: 'paw', shikigami: 'orbit', grandarray: 'zone', warder: 'guard', eidanora: 'aura', runesmith: 'infuse', spellblade: 'slashwave', entian: 'slash', scribe: 'meteor', sealer: 'mark', noxa: 'scroll' };
  const describe = id => {
    if (id.startsWith('ult_')) id = 'ult:' + id.slice(4);
    if (id.startsWith('ultpath:')) { const adv = id.split(':')[2]; return { kind: pathKinds[adv] || 'star', key: id, tier: 'aw', n: 1, badges: [] }; }
    if (id.startsWith('ult:')) { const cls = id.slice(4); return { kind: ultKinds[cls] || 'star', key: id, tier: 'aw', n: 1, badges: [] }; }
    if (id.startsWith('race:')) return { kind: raceKinds[id.slice(5)] || 'star', key: id, tier: '', n: 1, badges: [] };
    const o = info(id), special = specialKinds[id];
    if (!special) return o;
    return { ...o, kind: special[0], color: special[1], badges: special[2] ? [special[2]] : o.badges, tier: id === 'hm_field' ? 'sp' : 'adv', key: o.key + '|' + id };
  };
  const cache = new Map(), pending = new Map(), atlas = new Image(), extra = new Image();
  const loaded = new Set(), failed = new Set();
  R.skillIconURL = id => {
    if (!id) return '';
    const o = describe(id), extended = tiles[o.kind] == null;
    const source = extended ? extra : atlas, cols = extended ? 8 : 4, rows = extended ? 5 : 4;
    const tile = extended ? Math.max(0, extraKinds.indexOf(o.kind) < 0 ? extraKinds.indexOf('star') : extraKinds.indexOf(o.kind)) : tiles[o.kind];
    const key = id + '|' + o.key;
    if (failed.has(source)) {
      if (!/^ult[:_]|^ultpath:|^race:/.test(id)) return previous(id);
      return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#29213c"/><path d="M48 15 78 48 48 81 18 48Z" fill="#d9b96a"/></svg>');
    }
    if (!loaded.has(source)) {
      // 各技能使用獨立的暫存網址，避免共用舊圖的招式在載入後配錯圖。
      const url = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#171323"/><title>' + id.replace(/[<>&"]/g, '') + '</title></svg>');
      pending.set(url, id);
      return url;
    }
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const x = c.getContext('2d'), w = source.naturalWidth / cols, h = source.naturalHeight / rows;
    x.drawImage(source, tile % cols * w, Math.floor(tile / cols) * h, w, h, 0, 0, 96, 96);
    // 技能自己的元素色保留在色帶中；同系招式的段數與狀態另行標示。
    if (o.color) { x.fillStyle = o.color; x.fillRect(5, 89, 86, 3); }
    // 保留段數和轉職等級的辨識，不在圖案裡灑粒子。
    x.strokeStyle = o.tier === 'aw' ? '#f3cb64' : o.tier === 'sp' ? '#b38ae8' : o.tier === 'adv' ? '#cbd5e1' : '#272331';
    x.lineWidth = o.tier ? 4 : 2; x.strokeRect(2, 2, 92, 92);
    if (o.n > 1) {
      x.fillStyle = '#10101bd9'; x.fillRect(33, 3, 30, 15);
      x.fillStyle = '#fff'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center';
      x.fillText('×' + o.n, 48, 15);
    }
    const marks = { burn: '火', frost: '冰', shock: '雷', stun: '暈', curse: '咒', vamp: '血', root: '縛', crit: '暴', ghost: '隱', taunt: '嘲', pierce: '穿' };
    (o.badges || []).forEach((b, i) => {
      const left = 4 + i * 20;
      x.fillStyle = '#10101be6'; x.fillRect(left, 73, 18, 19);
      x.fillStyle = '#fff'; x.font = 'bold 13px sans-serif'; x.textAlign = 'center';
      x.fillText(marks[b] || '', left + 9, 87);
    });
    const url = c.toDataURL('image/png'); cache.set(key, url); return url;
  };
  const refresh = () => {
    // 已開啟的快捷列與技能書立刻換圖，不需要玩家重開視窗。
    const replaced = new Set();
    document.querySelectorAll('img').forEach(el => {
      const id = pending.get(el.getAttribute('src'));
      if (id) {
        const url = R.skillIconURL(id);
        if (url !== el.getAttribute('src')) { replaced.add(el.getAttribute('src')); el.src = url; }
      }
    });
    replaced.forEach(url => pending.delete(url));
  };
  atlas.onload = () => { loaded.add(atlas); refresh(); };
  extra.onload = () => { loaded.add(extra); refresh(); };
  const fail = source => { failed.add(source); refresh(); console.warn('[skill-art] 圖示素材載入失敗', source.src); };
  atlas.onerror = () => fail(atlas);
  extra.onerror = () => fail(extra);
  atlas.src = 'assets/art/skill-icons-clean-v1.png';
  extra.src = 'assets/art/skill-icons-extra-v1.png';
  R.skillArtInfo = id => { const o = describe(id); return { ...o, covered: tiles[o.kind] != null || extraKinds.includes(o.kind) }; };
  R.skillArtStatus = () => ({ loaded: loaded.size, failed: failed.size });
  R.ultIconURL = (cls, adv) => {
    const st = R.S && R.S.classes && R.S.classes[cls], active = adv === undefined ? st && st.adv : adv;
    const chosen = active && R.ultPathOf && R.ultPathOf(cls, active);
    return R.skillIconURL(chosen ? 'ultpath:' + cls + ':' + active : 'ult:' + cls);
  };
  R.raceIconURL = name => R.skillIconURL('race:' + name);
  const hud = R.hudTick;
  R.hudTick = function (...args) {
    const result = hud.apply(this, args), cls = R.W && R.W.P && R.W.P.cls;
    const button = document.querySelector('[data-tact="ult"]');
    if (button && cls) {
      let im = button.querySelector('.skill-ult-art');
      if (!im) { im = document.createElement('img'); im.className = 'skill-ult-art'; im.alt = ''; button.prepend(im); }
      const player = R.W.P, key = cls + '|' + player.adv + '|' + (R.S && R.S.ultPick && R.S.ultPick[cls]) + '|' + loaded.size;
      if (im.dataset.art !== key) { im.dataset.art = key; im.src = R.ultIconURL(cls, player.adv); }
    }
    const race = R.S && R.raceSkillOf && R.raceSkillOf(R.S.race), im = document.querySelector('[data-h2="race"] .h2-ic');
    if (race && im) {
      const key = race[1] + '|' + loaded.size;
      const url = R.raceIconURL(race[1]);
      if (im.dataset.art !== key || im.getAttribute('src') !== url) { im.dataset.art = key; im.src = url; }
    }
    return result;
  };
  const style = document.createElement('style');
  style.textContent = '.skill-ult-art{position:absolute;inset:4px;width:calc(100% - 8px);height:calc(100% - 8px);object-fit:cover;border-radius:inherit;pointer-events:none;opacity:.8}.ul-btn .ul-txt,.ul-btn kbd{z-index:2;text-shadow:0 1px 3px #000,0 0 3px #000}.ul-btn .ul-fill{z-index:1;pointer-events:none}';
  document.head.appendChild(style);
})(window.R);
