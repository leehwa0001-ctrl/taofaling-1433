// 本機測試用的小伺服器（只給開發用，不會發布：GitHub Actions 只複製根目錄的 *.js）
// index.html 只有「頁面內容」（沒有 <!doctype>、<head>），這裡跟 .github/workflows/pages.yml 一樣先包成完整的網頁。
// 用法（在專案資料夾）：node tools/serve.js      然後打開 http://localhost:5182/
//   另外：POST /__snap?f=名字.png 會把收到的圖存到 tools/snaps/（自動測試截圖用，snaps 不要 commit）
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), port = +process.argv[2] || 5182, snaps = path.join(__dirname, 'snaps');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && p === '/__snap') {
    const f = (new URL(req.url, 'http://x').searchParams.get('f') || 'snap.png').replace(/[^\w.-]/g, '_');
    if (!fs.existsSync(snaps)) fs.mkdirSync(snaps);
    const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => { fs.writeFileSync(path.join(snaps, f), Buffer.concat(chunks)); res.writeHead(200); res.end('ok'); });
    return;
  }
  if (p === '/' || p === '/index.html') {
    const body = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': types['.html'], 'Cache-Control': 'no-store' });
    return res.end('<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + body + '</body></html>');
  }
  const f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(b); });
}).listen(port, () => console.log('serving http://localhost:' + port + '/'));
