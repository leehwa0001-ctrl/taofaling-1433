// 3D 城的鏡頭改回原本的俯瞰（2026-10-10 作者：換成第三人稱好像沒有好到哪裡，3D 城是不是用原本的視角比較好）
// - 預設是俯瞰：跟東鶴的街上、遺跡一樣從斜上方看（像素人物本來就是照這個角度畫的）。暫停選單的「鏡頭」還是可以切回「漫遊（低角度）」。
//   選擇改記在 tfl-citycam2：之前記下的「漫遊」是舊的預設留下來的，大家先回到俯瞰，想要再自己切。
// - 俯瞰看不到天空和地平線，所以：
//   天空不畫（天空的球不會被裁掉，原本每一格都先把整個畫面畫一次天空的雲、雜訊，再被街道蓋掉；水面倒影照樣有天空）；
//   太陽陰影只算鏡頭附近（150 公尺見方 → 100 公尺見方：要算的東西少，陰影也比較清楚）。
// - 合併繪製改成照 48 公尺的區塊切（原本 96 公尺，而且整座城加起來不到 6 萬個頂點的材質合成一整塊）：
//   低角度看得到遠處，合成大塊比較省；俯瞰一次只看得到 60×45 公尺左右，切小塊才能把看不到的整塊跳過（陰影也是）。
//   實測（每格的三角形）：東鶴 33～60 萬 → 8～29 萬，皇嶺 30～62 萬 → 20～40 萬；繪製次數差不多。進城的時候決定，切換鏡頭要下次進城才換。
// 放在 citykit*.js、ckperf.js 後面（最外層的 CK.camMode、CK.render）。
(function (R) {
  const CK = R.CK, W = R.W; if (!CK || !CK.render) return;
  const KEY = 'tfl-citycam2';
  CK.camMode = () => { try { return localStorage.getItem(KEY) || 'top'; } catch (e) { return 'top'; } };
  CK.setCamMode = m => { try { localStorage.setItem(KEY, m); } catch (e) { } };
  const cs0 = CK.chunkSize;
  CK.chunkSize = () => (CK.camMode() === 'top' ? 48 : cs0());
  CK.mergeV = () => (CK.camMode() === 'top' ? 4000 : 60000);
  const top = () => !!(W.town && W.town.ck && !W.town.room && CK.camMode() === 'top');
  // 陰影的範圍（citykit2.js 進城時設成 ±75）
  const shadowBox = r => { const L = W.town && W.town.L, sc = L && L.sun && L.sun.shadow.camera; if (!sc || sc.right === r) return; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.updateProjectionMatrix(); };
  // 天空：倒影（CK.pre 裡）畫完以後才藏起來，這一格畫完再放回去
  CK.pre = CK.pre || [];
  CK.pre.push(() => { const L = W.town && W.town.L; if (L && L.sky && top()) L.sky.visible = false; });
  const r0 = CK.render;
  CK.render = (...a) => {
    const L = W.town && W.town.L;
    shadowBox(top() ? 50 : 75);
    try { return r0(...a); } finally { if (L && L.sky) L.sky.visible = true; }
  };
})(window.R);
