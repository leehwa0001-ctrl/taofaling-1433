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
// 放在 dread.js、ruinvar.js 後面、main.js 前面（包 R.updateLights）。
(function (R) {
  const W = R.W, ARC = { x: 0, y: 0, z: 0, w: 1 }, ARC2 = { x: 8, y: 2.5, z: 2, w: 0 };
  const FRONT = 8, BACK = 2.5, SOFT = 2;
  let done = false;
  const patch = () => {
    const T = window.THREE; if (done || !T || !T.ShaderChunk) return; done = true;
    const C = T.ShaderChunk;
    C.fog_pars_vertex += '\n#ifdef USE_FOG\n\tvarying vec2 vFogXZ;\n#endif';
    C.fog_vertex += '\n#ifdef USE_FOG\n\tvFogXZ = ( ( mvPosition.xyz - viewMatrix[ 3 ].xyz ) * mat3( viewMatrix ) ).xz;\n#endif';
    C.fog_pars_fragment += '\n#ifdef USE_FOG\n\tvarying vec2 vFogXZ;\n\tuniform vec4 fogArc;\n\tuniform vec4 fogArc2;\n#endif';
    C.fog_fragment = C.fog_fragment.replace('gl_FragColor.rgb = mix(',
      'if ( fogArc2.w > 0.5 ) {\n\t\tvec2 fd = vFogXZ - fogArc.xy; float fl = length( fd );\n\t\tfloat fc = fl > 0.001 ? dot( fd / fl, fogArc.zw ) : 1.0;\n'
      + '\t\tfloat fr = mix( fogArc2.y, fogArc2.x, smoothstep( -0.1, 0.1, fc ) ), fs = min( fogArc2.z, fr * 0.6 );\n'
      + '\t\tfogFactor = max( fogFactor, smoothstep( fr - fs, fr, fl ) );\n\t}\n\tgl_FragColor.rgb = mix(');
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
    const r = ARC2.y + (ARC2.x - ARC2.y) * ss(-0.1, 0.1, c), s = Math.min(ARC2.z, r * 0.6);
    return ss(r - s, r, l) > 0.6;
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
    ARC.x = P.x; ARC.y = P.z; ARC.z = Math.sin(ang); ARC.w = Math.cos(ang); ARC2.x = FRONT; ARC2.y = BACK; ARC2.z = SOFT;
    // 照鏡頭距離的霧退到半圓外面（只剩更遠的地方）
    const fg = W.scene && W.scene.fog; if (fg && fg.isFog && W.camera) { const cd = Math.hypot(W.camera.position.x - P.x, W.camera.position.y - 1, W.camera.position.z - P.z); fg.near = cd + FRONT; fg.far = cd + FRONT + 10; }
    const pu = R.pixPost && R.pixPost.uniforms; if (pu && pu.fogArc && W.camera) { pu.fogArc.value = ARC; pu.fogArc2.value = ARC2; pu.projInv.value = W.camera.projectionMatrixInverse; pu.camWorld.value = W.camera.matrixWorld; }
  };
})(window.R);
