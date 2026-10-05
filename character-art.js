// 人物美術：對話立繪與可換裝的大頭小人。素材與遊戲一起發布。
(function (R) {
  const atlas = 'assets/art/story-portraits-v2.png';
  const people = [
    { id: 'taki', image: 'assets/art/taki-portrait-v3.png', names: ['望月瀧', '瀧'], x: 0, w: 710, clip: 'polygon(0 0,100% 0,100% 29%,91% 29%,91% 47%,100% 57%,100% 100%,0 100%)' },
    { id: 'reno', names: ['雷諾・雷提歐', '雷諾'], x: 670, w: 440, clip: 'polygon(0 0,100% 0,100% 100%,0 100%,0 87%,19% 87%,19% 73%,13% 73%,13% 56%,0 49%)' },
    { id: 'churu', names: ['楚璐・洛朗', '楚璐'], x: 1110, w: 510, clip: 'polygon(0 0,100% 0,100% 62%,94% 62%,94% 76%,100% 80%,100% 100%,0 100%)' },
    { id: 'achan', names: ['阿杏'], x: 1620, w: 552, clip: 'polygon(0 0,100% 0,100% 100%,7% 100%,7% 92%,0 92%)' }
  ];
  const style = document.createElement('style');
  style.textContent = `
    #r-sheet.character-dialog{width:min(960px,94vw);max-width:960px;padding:0;overflow:hidden;border:2px solid #aa8750;background:#1d1c26;box-shadow:0 18px 70px #0009}
    .character-layout{display:grid;grid-template-columns:40% 1fr;height:min(480px,78vh);max-height:82vh}
    .character-portrait{position:relative;align-self:stretch;overflow:hidden;background:radial-gradient(ellipse at 50% 70%,#65534a55,transparent 70%),linear-gradient(160deg,#333240,#1b1a23);border-right:1px solid #aa875055;display:flex;align-items:flex-end;justify-content:center;padding:18px 0 0}
    .character-cutout{display:block;flex:none;height:100%;max-width:100%;aspect-ratio:var(--pw)/724;background-image:url('${atlas}');background-repeat:no-repeat;background-size:calc(2172 / var(--pw) * 100%) 100%;background-position:calc(var(--px) / (2172 - var(--pw)) * 100%) 0;filter:drop-shadow(3px 4px 0 #14121a80);animation:character-arrive .18s ease-out}
    .character-portrait-image{display:block;width:100%;height:100%;object-fit:contain;object-position:center bottom;animation:character-arrive .18s ease-out}
    .character-copy{padding:28px 26px;overflow-y:auto;min-width:0;line-height:1.8}.character-copy h2{color:#f1dbb5}.character-copy .row{margin-top:24px;flex-wrap:wrap}
    @keyframes character-arrive{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
    @media(max-width:600px){.character-layout{grid-template-columns:1fr;height:auto;max-height:88vh;min-height:0}.character-portrait{height:260px;border-right:0;border-bottom:1px solid #aa875055;padding:8px 0 0}.character-cutout{height:290px;width:auto;align-self:flex-start;background-position-y:0}.character-copy{padding:16px 20px;max-height:52vh}}
    @media(prefers-reduced-motion:reduce){.character-cutout,.character-portrait-image{animation:none}}
  `;
  document.head.appendChild(style);
  // 只看說話者標題，不因正文提到另一個人的名字就換人。
  const identify = html => {
    const box = document.createElement('div'); box.innerHTML = html;
    const heads = [...box.querySelectorAll('h2,.kicker')].map(e => e.textContent.trim());
    return people.find(p => heads.some(t => p.names.some(n => t === n || t.startsWith(n + ' '))));
  };
  const sheet = R.sheet;
  R.sheet = (html, foot) => {
    const p = typeof html === 'string' && identify(html);
    if (p) {
      const portrait = p.image
        ? '<img class="character-portrait-image" src="' + p.image + '" alt="' + p.names[0] + '立繪" decoding="async">'
        : '<div class="character-cutout" role="img" aria-label="' + p.names[0] + '立繪" style="--px:' + p.x + ';--pw:' + p.w + ';clip-path:' + (p.clip || 'none') + '"></div>';
      html = '<div class="character-layout"><div class="character-portrait">' + portrait + '</div><div class="character-copy">' + html + (foot || '') + '</div></div>';
    }
    const result = sheet(html, p ? '' : foot), el = document.getElementById('r-sheet');
    if (el) el.classList.toggle('character-dialog', !!p);
    return result;
  };
  // 重畫各個矩形筆觸，不改人物看板尺寸與碰撞。各髮型、種族、衣物仍沿用原本圖層。
  R.heroPixelRect = (a, b, w, h, sit) => {
    const y = v => v <= 9 ? v * 1.3 : 11.7 + (v - 9) * (11.3 / 14);
    const head = b + h <= 9, k = head ? 1.2 : 1;
    if (sit) return [a, b, w, h];
    const x0 = Math.round(8 + (a - 8) * k), x1 = Math.round(8 + (a + w - 8) * k);
    const y0 = Math.round(y(b)), y1 = Math.round(y(b + h));
    return [x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)];
  };
  // 原生像素稿加倍取樣後補細邊、受光面；保留種類、變種色與原本兩幀動畫。
  // 這是程式繪製的怪物素材，與上方 AI 繪製的立繪是兩條獨立管線。
  R.detailBeastCanvas = source => {
    const c = document.createElement('canvas'); c.width = source.width * 2; c.height = source.height * 2;
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(source, 0, 0, c.width, c.height);
    const orig = source.getContext('2d').getImageData(0, 0, source.width, source.height).data;
    const dst = ctx.getImageData(0, 0, c.width, c.height), a = dst.data;
    const on = (x,y) => x>=0 && y>=0 && x<source.width && y<source.height && orig[(y*source.width+x)*4+3]>0;
    for (let y=0;y<source.height;y++) for(let x=0;x<source.width;x++) {
      const i=(y*source.width+x)*4; if(!orig[i+3])continue;
      const bright=(orig[i]+orig[i+1]+orig[i+2])/3;
      if(bright<42)continue;
      const darker = (nx,ny) => !on(nx,ny) || (orig[(ny*source.width+nx)*4]+orig[(ny*source.width+nx)*4+1]+orig[(ny*source.width+nx)*4+2])/3 < bright-28;
      const top=darker(x,y-1), left=darker(x-1,y), bottom=darker(x,y+1);
      // 不撒隨機雜點：只沿輪廓加亮、下緣收暗，讓毛皮、甲殼的轉折更清楚。
      for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++){
        const k=(top&&sy===0 || left&&sx===0)?1.14:(bottom&&sy===1?0.8:1);
        const j=((y*2+sy)*c.width+x*2+sx)*4;
        for(let ch=0;ch<3;ch++)a[j+ch]=Math.min(255,Math.round(orig[i+ch]*k));
      }
    }
    ctx.putImageData(dst,0,0);return c;
  };
})(window.R);
