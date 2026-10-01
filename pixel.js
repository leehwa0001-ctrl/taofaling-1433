// 討伐令 1433：像素風
// 像素風開著的時候：
//  - 人物、遺跡生物、地板、牆是點陣圖和點陣材質（sprites.js），一個點陣像素是 1/12 公尺；
//  - 鏡頭換成正交鏡頭：近的遠的東西，像素都一樣大；
//  - 先畫在一張小畫布上（一格＝一個點陣像素），再用「整數倍」放大到螢幕，每個像素在螢幕上一樣大；
//  - 鏡頭的位置對齊像素格，走路時牆和地板的像素不會閃。
// 哪一種畫法跟著「場景是用哪一種做的」：在遺跡裡切換，會從下一層開始。
(function (R) {
  const T = () => THREE;
  // 只有像素版（作者 2026-10-01：3D 版刪掉）
  const on = true;
  R.pixelOn = () => true;
  R.setPixel = () => { document.body.classList.add('pixel'); };
  document.body.classList.add('pixel');
  // ---------- 擋在人物前面的建築：靠近人物、在鏡頭和人物之間的那一圈，挖成點陣的洞（看得到後面的人） ----------
  // 房子合併成大塊來畫（省很多 draw call），不能一棟一棟變透明，所以改在材質裡挖洞。
  const SEE = { p: { value: null }, dir: { value: null }, r: { value: 2.5 }, on: { value: 0 } };
  R.SEE = SEE;
  R.seeThrough = mat => {
    if (mat.userData.see) return mat; mat.userData.see = true;
    if (!SEE.p.value) { SEE.p.value = new (T().Vector3)(); SEE.dir.value = new (T().Vector3)(0, 0.84, 0.55); }
    const prev = mat.onBeforeCompile, key0 = Object.prototype.hasOwnProperty.call(mat, 'customProgramCacheKey') ? mat.customProgramCacheKey : null;
    mat.onBeforeCompile = (sh, rr) => {
      if (prev) prev.call(mat, sh, rr);
      sh.uniforms.seeP = SEE.p; sh.uniforms.seeDir = SEE.dir; sh.uniforms.seeR = SEE.r; sh.uniforms.seeOn = SEE.on;
      if (sh.vertexShader.indexOf('varying vec3 vWPos;') < 0) {
        sh.vertexShader = 'varying vec3 vWPos;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vec4 swp = vec4( transformed, 1.0 );\n  #ifdef USE_INSTANCING\n  swp = instanceMatrix * swp;\n  #endif\n  vWPos = ( modelMatrix * swp ).xyz;');
        sh.fragmentShader = 'varying vec3 vWPos;\n' + sh.fragmentShader;
      }
      // 圓形的洞：中間整個挖空，邊緣一圈用 4×4 的點陣慢慢收（不是整片灰色網點）
      sh.fragmentShader = 'uniform vec3 seeP;\nuniform vec3 seeDir;\nuniform float seeR;\nuniform float seeOn;\nfloat seeBayer( vec2 p ) { vec2 q = mod( floor( p ), 4.0 ); int i = int( q.x + q.y * 4.0 ); float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.; for ( int k = 0; k < 16; k++ ) if ( k == i ) return ( m[k] + 0.5 ) / 16.0; return 0.5; }\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if ( seeOn > 0.5 ) { vec3 sd = vWPos - seeP; float sa = dot( sd, seeDir ); if ( sa > 0.5 && vWPos.y > 0.45 ) { float sr = length( sd - seeDir * sa ) / seeR; if ( sr < 0.72 ) discard; if ( sr < 1.0 && seeBayer( gl_FragCoord.xy ) > ( sr - 0.72 ) / 0.28 ) discard; } }');
    };
    mat.customProgramCacheKey = () => (key0 ? key0.call(mat) : 'plain') + '|see';
    return mat;
  };
  // 每一格：人物的位置、從人物看向鏡頭的方向
  R.updateSee = (on, P, cam) => { if (!SEE.p.value) return; SEE.on.value = on ? 1 : 0; if (!on || !P) return; SEE.p.value.set(P.x, 1.5, P.z); SEE.dir.value.copy(cam.position).sub(SEE.p.value).normalize(); };
  R.markScene = scene => { scene.userData.pix = true; return scene; };

  const P = {};
  const init = () => {
    const TH = T();
    P.rt = new TH.WebGLRenderTarget(4, 4, { minFilter: TH.NearestFilter, magFilter: TH.NearestFilter, generateMipmaps: false });
    P.rt.depthTexture = new TH.DepthTexture(4, 4); P.rt.depthTexture.type = TH.UnsignedIntType;
    P.rt.depthTexture.minFilter = P.rt.depthTexture.magFilter = TH.NearestFilter;
    // 放大的時候順便描邊：旁邊的像素比自己遠很多（牆頂、屋頂、柱子的輪廓）就暗一點
    P.mat = new TH.ShaderMaterial({
      uniforms: { tColor: { value: P.rt.texture }, tDepth: { value: P.rt.depthTexture }, res: { value: new TH.Vector2(4, 4) }, scale: { value: 1 }, off: { value: new TH.Vector2(0, 0) }, dRange: { value: 1 }, edge: { value: 0.9 } },
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform float scale; uniform vec2 off; uniform float dRange; uniform float edge;',
        'float dep(vec2 p){ return texture2D(tDepth, (p + 0.5) / res).x * dRange; }',
        'void main(){',
        '  vec2 p = floor((gl_FragCoord.xy + off) / scale);',
        '  vec3 c = texture2D(tColor, (p + 0.5) / res).rgb;',
        '  float d = dep(p);',
        '  float far = max(max(dep(p + vec2(1.0, 0.0)), dep(p - vec2(1.0, 0.0))), max(dep(p + vec2(0.0, 1.0)), dep(p - vec2(0.0, 1.0))));',
        '  if (far - d > edge) c *= 0.5;',
        '  gl_FragColor = vec4(c, 1.0);',
        '  #include <encodings_fragment>',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false
    });
    P.scene = new TH.Scene(); P.cam = new TH.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new TH.Mesh(new TH.PlaneGeometry(2, 2), P.mat); quad.frustumCulled = false; P.scene.add(quad);
  };

  // 換鏡頭：像素風用正交鏡頭（位置、方向照舊，鏡頭的程式不用改）
  const useCam = (W, pix, w, h) => {
    if (!W.pcam) W.pcam = W.camera;
    if (pix && !W.ocam) W.ocam = new (T().OrthographicCamera)(-1, 1, 1, -1, 0.5, 240);
    const want = pix ? W.ocam : W.pcam;
    if (W.camera !== want) {
      want.position.copy(W.camera.position); want.quaternion.copy(W.camera.quaternion);
      if (!pix) { W.pcam.aspect = w / h; W.pcam.updateProjectionMatrix(); }
      W.camera = want;
    }
    if (W.ocam) W.ocam.aspect = w / h;
    // 像素風的最後一步只是把小畫布放大，畫布可以用螢幕真正的解析度（不會被瀏覽器再縮放一次而糊掉）
    const dpr = window.devicePixelRatio || 1, pr = pix ? dpr : Math.min(dpr, R.touch ? 1.3 : 1.75);
    if (W.renderer.getPixelRatio() !== pr) W.renderer.setPixelRatio(pr);
  };

  // 目前放大幾倍、小畫布多大（測試用）
  R.pixelInfo = () => ({ s: P.s, w: P.w, h: P.h });
  R.renderFrame = (w, h) => {
    const W = R.W, pix = !!(W.scene && W.scene.userData.pix);
    useCam(W, pix, w, h);
    if (!pix) { W.renderer.render(W.scene, W.camera); return; }
    if (!P.rt) init();
    const cam = W.camera, cv = W.renderer.domElement, bw = cv.width, bh = cv.height, PX = R.PIX.PX;
    // 一般鏡頭在人物那個距離看得到多高，換算成點陣像素；螢幕高度除以它，四捨五入成整數倍
    const a = w / h, tall = a < 1 ? 1 + (1 - a) * 0.7 : 1, dist = Math.hypot(R.CAM.h, R.CAM.back) * (W.cam ? W.cam.zoom : 1) * tall;
    const want = 2 * dist * Math.tan(22 * Math.PI / 180) / PX;
    const s = Math.max(1, Math.round(bh / want)), rw = 2 * Math.ceil(bw / s / 2), rh = 2 * Math.ceil(bh / s / 2);
    if (P.w !== rw || P.h !== rh) { P.w = rw; P.h = rh; P.rt.setSize(rw, rh); P.mat.uniforms.res.value.set(rw, rh); }
    P.s = s; P.mat.uniforms.scale.value = s; P.mat.uniforms.off.value.set(Math.floor((rw * s - bw) / 2), Math.floor((rh * s - bh) / 2));
    P.mat.uniforms.dRange.value = cam.far - cam.near;
    const hw = rw / 2 * PX, hh = rh / 2 * PX;
    if (cam.right !== hw || cam.top !== hh) { cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh; cam.updateProjectionMatrix(); }
    // 鏡頭對齊像素格：畫面的橫、直方向都挪到整數格（不動的東西每一幀都落在同樣的像素上）
    cam.updateMatrixWorld();
    const e = cam.matrixWorld.elements, p = cam.position;
    const pr = p.x * e[0] + p.y * e[1] + p.z * e[2], pu = p.x * e[4] + p.y * e[5] + p.z * e[6];
    const dr = Math.round(pr / PX) * PX - pr, du = Math.round(pu / PX) * PX - pu;
    p.x += dr * e[0] + du * e[4]; p.y += dr * e[1] + du * e[5]; p.z += dr * e[2] + du * e[6];
    cam.updateMatrixWorld();
    W.renderer.setRenderTarget(P.rt); W.renderer.render(W.scene, cam);
    W.renderer.setRenderTarget(null); W.renderer.render(P.scene, P.cam);
  };
})(window.R);
