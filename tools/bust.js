// 發布前：index.html 裡每個 <script src="xxx.js"> 加上版本號 ?v=（照檔案內容算的雜湊）
// 檔案改了網址就跟著變，瀏覽器不會拿舊的快取（2026-10-04：玩家的瀏覽器留著舊的 races.js，看到的還是十連抽）。
// 沒改的檔案版本號不變，照樣用快取。GitHub Actions（.github/workflows/pages.yml）每次發布自動跑，不用手動。
// 用法：node tools/bust.js _site/index.html   （在專案資料夾跑；js 檔照專案資料夾找）
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const file = process.argv[2] || '_site/index.html', root = path.join(__dirname, '..');
let html = fs.readFileSync(file, 'utf8'), n = 0;
html = html.replace(/(<script\b[^>]*\bsrc=")([\w.\-\/]+\.js)(")/g, (m, a, src, b) => {
  const f = path.join(root, src); if (!fs.existsSync(f)) return m;
  n++; return a + src + '?v=' + crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 10) + b;
});
fs.writeFileSync(file, html);
console.log('版本號：' + n + ' 個 script');
