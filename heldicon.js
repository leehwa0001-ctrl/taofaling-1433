// 手上拿的武器＝背包裡那把武器的圖示（2026-10-08 作者：武器也要符合圖片的外觀——手上武器＝背包圖示）
// - 原本：人物手上的武器是程式畫的幾條線（同一類武器都長一樣，也不分材質）。
// - 現在：直接把那把武器的圖示（gear.js 的 16×16 點陣，鐵製灰、魔晶藍紫、核心金紅）畫在手上——形狀、顏色跟背包一樣。
//   照武器種類縮放（大劍、長槍、法杖原尺寸，手槍、短刀、法球小一點）；揮砍的三格照姿勢翻轉（舉起往後、砍下往前下、收招）。
//   十字鎬、拳套（兩個拳頭）、長棍照原本的畫法。
// - 背包圖示照真正的武器（gearmore.js 加的新武器也一樣），材質照那把武器的物品等級。
// 放在 sprites.js、gear.js、gearmore.js 後面。
(function (R) {
  const KEEP = new Set(['pickaxe', 'gauntlet', 'staffpole']);
  // 縮放（圖示 16 格的幾倍）
  const SIZE = { greatsword: 1, spear: 1, sniperrifle: 1, staff: 0.94, holystaff: 0.94, longbow: 0.94, rifle: 0.88, katana: 0.88, sword: 0.81, runeblade: 0.81, axe: 0.81, shotgun: 0.81, mace: 0.75, dualblades: 0.75, shortbow: 0.75, crossbow: 0.75, runedagger: 0.62, pistol: 0.62, dualpistol: 0.62, orb: 0.56 };
  const HELD = { lute: 1, flute: 1, tome: 1, bell: 1, chalk: 1, disc: 1, scrollb: 1, talisman: 1 };
  // 握的地方（圖示裡的座標）
  const GRIP = { sword: [3, 12], greatsword: [3, 12], runeblade: [3, 12], katana: [4, 12], dualblades: [8, 11], axe: [4, 13], mace: [4, 13], spear: [3, 13], staff: [4, 14], holystaff: [5, 14], orb: [8, 13], pistol: [5, 10], dualpistol: [5, 10], rifle: [4, 9], shotgun: [4, 9], sniperrifle: [4, 9], shortbow: [10, 8], longbow: [11, 8], crossbow: [8, 11], runedagger: [5, 10] };
  const BY_KIND = { melee: [3, 12], thrust: [3, 13], gun: [4, 9], bow: [10, 8], magic: [5, 14] };
  const FW = (R.HERO_FRAME && R.HERO_FRAME.FW) || 24, FH = (R.HERO_FRAME && R.HERO_FRAME.FH) || 30, BX = 4, BY = 5;
  R.drawHeldIcon = (x, ox, oy, dir, fr, L, pose, swingP) => {
    const look = L.weapon; if (!look || KEEP.has(look) || !R.itemIconCanvas) return false;
    const ext = L.ext || {}, base = ext.weaponIcon || look, tier = ext.weaponTier || 0;
    const icon = R.itemIconCanvas(base, tier); if (!icon) return false;
    const W = R.WEAPONS[look] || R.WEAPONS[base] || {}, kind = W.kind || 'melee';
    const side = dir === 2, atk = fr >= 3;
    const s = HELD[base] || HELD[look] ? 0.62 : SIZE[base] || SIZE[look] || 0.75;
    const [gx, gy] = GRIP[base] || GRIP[look] || BY_KIND[kind] || [4, 12];
    // 手在哪裡、圖示怎麼翻
    let hx, hy, fx = 1, fy = 1;
    if (swingP) {
      if (swingP === 'wind') { if (side) { hx = 9; hy = 9; fx = -1; } else { hx = 12; hy = 8; } }
      else if (swingP === 'strike') { if (side) { hx = 12; hy = 12; fy = -1; } else { hx = 6; hy = 13; fx = -1; fy = -1; } }
      else { if (side) { hx = 11; hy = 14; fy = -1; } else { hx = 5; hy = 15; fx = -1; fy = -1; } }
    } else if (side) { hx = atk ? 11 : 8; hy = atk ? 11 : 15; }
    else { hx = 12; hy = atk ? 12 : 14; }
    const map = R.heroPixelRect ? R.heroPixelRect(hx, hy, 1, 1, pose === 'sit') : [hx, hy];
    x.save();
    x.beginPath(); x.rect(ox - BX + 1, oy - BY + 1, FW - 2, FH - 2); x.clip();   // 留一格：外框描邊（sprites.js 的 outline）才不會描到隔壁那一格
    x.imageSmoothingEnabled = false;
    x.translate(ox + map[0] + 0.5, oy + map[1] + 0.5); x.scale(fx * s, fy * s);
    x.drawImage(icon, -gx - 0.5, -gy - 0.5);
    x.restore();
    return true;
  };
  // 換武器：記下真正的武器（gearmore.js 會把新武器換成舊的樣子）和材質
  const sw0 = R.setHeroWeapon;
  if (sw0) R.setHeroWeapon = (h, base) => {
    try {
      if (h && h.opt) {
        const w = R.W, P = w && w.P, it = P && P.h === h ? P.item : null;
        h.opt.weaponIcon = base; h.opt.weaponTier = it && R.tierOf ? R.tierOf(it.ilvl || 1) : 0;
      }
    } catch (e) { }
    return sw0(h, base);
  };
  // 一開始的樣子（遺跡、城裡）：材質、真正的武器跟身上的那把對不上就重畫一次
  const st0 = R.step;
  let chk = 0;
  if (st0) R.step = dt => { const r = st0(dt); chk -= dt || 0; if (chk > 0) return r; chk = 1; try { const P = R.W && R.W.P, it = P && P.item; if (P && P.h && P.h.opt && it && it.base && R.setHeroWeapon) { const tier = R.tierOf ? R.tierOf(it.ilvl || 1) : 0; if (P.h.opt.weaponIcon !== it.base || P.h.opt.weaponTier !== tier) R.setHeroWeapon(P.h, it.base); } } catch (e) { } return r; };
})(window.R);
