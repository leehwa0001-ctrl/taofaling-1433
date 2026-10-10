// 人物素材（作者用人物編輯器匯出的 character-kit-layers.json）→ 遊戲用的精簡資料 charkit-data.js（2026-10-11）
// 用法：node tools/charkit-convert.js <character-kit-layers.json 的路徑>
// - 每一格是上色規則（0 空、1 描邊黑、2 底色、3 暗 45%、4 暗 70%、5 隨機色、6 外形線、7 半透明、8 高光白、9 亮 45%），顏色在遊戲裡照人物的外觀上。
// - 一張圖 45×45 → 一串字：0～9 換成 a～j，連續的同一格寫成「字母＋個數」（a41b11……）。
// - 動作照名字對：站立、移動、單手揮擊、雙手揮擊；四個方向 front／back／left／right。圖層照名字存（衣服、褲子、鞋子、髮型、眼睛、眼鏡、眉毛……）。
const fs = require('fs'), path = require('path');
const src = process.argv[2]; if (!src) { console.error('用法：node tools/charkit-convert.js <json>'); process.exit(1); }
const j = JSON.parse(fs.readFileSync(src, 'utf8'));
const enc = a => { let s = '', i = 0; while (i < a.length) { const v = a[i] | 0; let n = 1; while (i + n < a.length && (a[i + n] | 0) === v) n++; s += String.fromCharCode(97 + Math.max(0, Math.min(9, v))) + (n > 1 ? n : ''); i += n; } return s; };
const DIRS = ['front', 'back', 'left', 'right'];
const ACT = { '站立': 'stand', '移動': 'move', '單手揮擊': 'swing1', '雙手揮擊': 'swing2' };
const frameOf = f => { const o = {}; DIRS.forEach(d => { o[d] = enc(f[d] || []); }); return o; };
const race = j.body.races[0], acts = race.groups[0].actions, idOf = {};
const body = {}; acts.forEach(a => { const k = ACT[a.name] || a.id; idOf[a.id] = k; body[k] = a.frames.map(frameOf); });
const layers = {};
j.layers.forEach(l => {
  const vs = {};
  l.variants.forEach(v => { const by = {}; Object.keys(v.byAction || {}).forEach(id => { const k = idOf[id] || id; by[k] = v.byAction[id].map(frameOf); }); const has = Object.values(by).some(fr => fr.some(f => DIRS.some(d => /[b-j]/.test(f[d])))); if (has) vs[v.name] = by; });
  if (Object.keys(vs).length) layers[l.name] = vs;
});
const out = { grid: j.grid, race: race.name, body, layers };
const dst = path.join(__dirname, '..', 'charkit-data.js');
fs.writeFileSync(dst, '// 人物素材的資料（tools/charkit-convert.js 從作者的 character-kit-layers.json 轉出來的，不要手改）\nwindow.R = window.R || {}; window.R.CHARKIT = ' + JSON.stringify(out) + ';\n');
console.log('寫好了：' + dst + '（' + Math.round(fs.statSync(dst).size / 1024) + ' KB）；圖層：' + Object.keys(layers).map(k => k + '×' + Object.keys(layers[k]).length).join('、'));
