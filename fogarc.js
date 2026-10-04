// 濃霧改成半圓形（2026-10-04 作者：濃霧改成半圓形）
// - 濃霧樓層（ruinvar.js 的 F.fogMin）原本是角色四周一圈 4.5 公尺（照離鏡頭的距離算的霧）。
//   現在看得到的是「面前的半圓」：朝準心（P.aimA，滑鼠／右搖桿／F 鎖定）的那一半看得到 8 公尺，背後只剩身邊 2.5 公尺；
//   邊緣 2 公尺慢慢變濃。轉身（轉準心）才看得到後面的遺跡生物。
// - 做法：改 three.js 的霧（ShaderChunk 的 fog_*）——頂點算出世界座標的 xz，片段裡照「離角色多遠、在面前還是背後」算霧的濃度，
//   跟原本的霧取比較濃的那個。兩個 uniform（fogArc：角色的 x、z 和面向；fogArc2：前、後的距離、邊緣、開關）塞進每個內建材質，
//   值是同一個物件（不是 Vector4，three.js 複製 uniform 時就不會複製它），每一格改一次全部材質一起變。沒開的時候跟原本一模一樣。
// - 像素風放大時的描邊（pixel.js）：霧裡的像素不描邊，不然牆的輪廓會從霧裡透出來，背後的地形一看就知道。
// - 遺跡生物頭上的名牌（monlabel.js）：在霧裡的不顯示（R.fogHides）。
// - three.js 是 main.js 在背景載入的（R.three）：要在任何東西畫出來之前改好，所以接在 R.three 上（main.js 設 R.three 的時候）。
// - 2026-10-05 作者：迷霧還是有點看不到視野——視角縮成 45 度但自身半徑提高，45 度角的視野可以無限遠。
//   現在：朝準心 45 度的扇形（左右各 22.5 度，邊上 4 度左右慢慢變濃）一路看到底；扇形外面只看得到身邊 5 公尺（原本背後 2.5）。
//   照鏡頭距離的霧退到 60 公尺外（等於沒有）。fogArc2 改成：x＝扇形半角的 cos、y＝身邊的半徑、z＝邊緣、w＝開關。
// - 2026-10-05 作者：迷霧還是太難看到了——扇形外面整片不透明的白，只剩牆的線。
//   現在：扇形外面的霧最濃七成（看得到地形、遺跡生物的影子，名牌照樣藏起來）；身邊看得清楚的 5→8 公尺、邊緣 1.5→3 公尺慢慢變濃；
//   扇形 45→60 度（左右各 30 度）。
// 放在 dread.js、ruinvar.js 後面、main.js 前面（包 R.updateLights）。
(function (R) {
  const CONE = Math.cos(30 * Math.PI / 180), SELF = 8, SOFT = 3, FAR = 60, MAXF = 0.7;   // MAXF：扇形外最濃幾成
  const W = R.W, ARC = { x: 0, y: 0, z: 0, w: 1 }, ARC2 = { x: CONE, y: SELF, z: SOFT, w: 0 };
  let done = false;
  const patch = () => {
    const T = window.THREE; if (done || !T || !T.ShaderChunk) return; done = true;
    const C = T.ShaderChunk;
    C.fog_pars_vertex += '\n#ifdef USE_FOG\n\tvarying vec2 vFogXZ;\n#endif';
    C.fog_vertex += '\n#ifdef USE_FOG\n\tvFogXZ = ( ( mvPosition.xyz - viewMatrix[ 3 ].xyz ) * mat3( viewMatrix ) ).xz;\n#endif';
    C.fog_pars_fragment += '\n#ifdef USE_FOG\n\tvarying vec2 vFogXZ;\n\tuniform vec4 fogArc;\n\tuniform vec4 fogArc2;\n#endif';
    C.fog_fragment = C.fog_fragment.replace('gl_FragColor.rgb = mix(',
      'if ( fogArc2.w > 0.5 ) {\n\t\tvec2 fd = vFogXZ - fogArc.xy; float fl = length( fd );\n\t\tfloat fc = fl > 0.001 ? dot( fd / fl, fogArc.zw ) : 1.0;\n'
      + '\t\tfloat fs = min( fogArc2.z, fogArc2.y * 0.6 ), fself = smoothstep( fogArc2.y - fs, fogArc2.y, fl ), fcone = 1.0 - smoothstep( fogArc2.x - 0.03, fogArc2.x + 0.03, fc );\n'
      + '\t\tfogFactor = max( fogFactor, min( fself, fcone ) * ' + MAXF.toFixed(2) + ' );\n\t}\n\tgl_FragColor.rgb = mix(');
    Object.keys(T.ShaderLib).forEach(k => { const u = T.ShaderLib[k].uniforms; if (u && u.fogColor) { u.fogArc = { value: ARC }; u.fogArc2 = { value: ARC2 }; } });
  };
  if (window.THREE) patch();
  // main.js 設 R.three（載入 three.js 的 Promise）的時候，先接上 patch，後面 .then 的（進城、進遺跡）都會等它
  if (!R.three) {
    let p0 = null;
    Object.defineProperty(R, 'three', { configurable: true, enumerable: true, get: () => p0, set: p => { p0 = p && p.then ? p.then(v => { patch(); return v; }) : p; } });
  }

  // 這一點在霧裡嗎（遺跡生物的名牌用，monlabel.js）：跟材質裡的霧同一個算法，濃度過六成就算看不見
  R.fogHides = (x, z) => {
    if (!ARC2.w) return false;
    const dx = x - ARC.x, dz = z - ARC.y, l = Math.hypot(dx, dz), c = l > 0.001 ? (dx * ARC.z + dz * ARC.w) / l : 1;
    const ss = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const s = Math.min(ARC2.z, ARC2.y * 0.6);
    return Math.min(ss(ARC2.y - s, ARC2.y, l), 1 - ss(ARC2.x - 0.03, ARC2.x + 0.03, c)) > 0.6;   // 霧最濃只到七成，名牌照「霧的六成深」藏（跟原本一樣的地方）
  };

  // ---------- 每一格：角色的位置、面向 ----------
  let ang = null;
  const ul = R.updateLights;
  R.updateLights = dt => {
    ul(dt);
    const run = W.run, P = W.P, F = W.F;
    const on = !!(done && run && P && F && F.fogMin && !(run.site && run.site.outdoor));
    ARC2.w = on ? 1 : 0;
    const pm = R.pixPost && R.pixPost.uniforms.fogOn; if (pm) pm.value = on ? 1 : 0;
    if (!on) { ang = null; return; }
    const a = P.aimA != null ? P.aimA : Math.PI;
    if (ang == null) ang = a; else { let d = a - ang; d = Math.atan2(Math.sin(d), Math.cos(d)); ang += d * Math.min(1, (dt || 0.016) * 14); }
    ARC.x = P.x; ARC.y = P.z; ARC.z = Math.sin(ang); ARC.w = Math.cos(ang); ARC2.x = CONE; ARC2.y = SELF; ARC2.z = SOFT;
    // 照鏡頭距離的霧退到很遠（扇形裡一路看到底）
    const fg = W.scene && W.scene.fog; if (fg && fg.isFog && W.camera) { const cd = Math.hypot(W.camera.position.x - P.x, W.camera.position.y - 1, W.camera.position.z - P.z); fg.near = cd + FAR; fg.far = cd + FAR + 10; }
    const pu = R.pixPost && R.pixPost.uniforms; if (pu && pu.fogArc && W.camera) { pu.fogArc.value = ARC; pu.fogArc2.value = ARC2; pu.projInv.value = W.camera.projectionMatrixInverse; pu.camWorld.value = W.camera.matrixWorld; }
  };
})(window.R);
