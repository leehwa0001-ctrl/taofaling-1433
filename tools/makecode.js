// 產生一個新的兌換序號（redeem.js）。
// 印出兩樣東西：序號（只交給作者，不要 commit）、要加進 redeem.js CODES 的那一行（只有雜湊）。
//
// 用法（向後相容）：
//   node tools/makecode.js 10000 "10000 費拉"          → gold: 10000
//   node tools/makecode.js                              → gold: 10000（預設）
//
// 其他獎勵（可並用；第一個數字參數若沒寫 --gold 仍當成 gold，方便舊用法）：
//   node tools/makecode.js --tickets 1000 "種族抽選券 1000 張"
//   node tools/makecode.js --books 1 --tickets 200 --core 1 --gold 5000 "補償禮包"
//   node tools/makecode.js --raceSelect SSR "SSR 種族自選券"
//   node tools/makecode.js --pack guild "公會遠征背包"
//   node tools/makecode.js --potions 10,10 "回復藥、魔力藥各 10 瓶"
//   node tools/makecode.js --unban "清空停權"
//   node tools/makecode.js --admin "管理員號"
//
const crypto = require('crypto');
const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 去掉容易看錯的 I、O、0、1
const pick = n => Array.from(crypto.randomBytes(n), b => A[b % 32]).join('');
const cyrb53 = (str, seed = 0) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
const hashOf = s => cyrb53('taofaling1433:' + String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));

const args = process.argv.slice(2), flags = {}, pos = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--unban' || a === '--admin') { flags[a.slice(2)] = 1; continue; }
  if (a.startsWith('--') && i + 1 < args.length) { flags[a.slice(2)] = args[++i]; continue; }
  pos.push(a);
}
// 舊用法：第一個位置參數是 gold；若有任何非 gold 旗標且沒寫 --gold／位置 gold，就不要預設塞 gold
const hasRewardFlag = ['tickets', 'books', 'core', 'raceSelect', 'pack', 'potions', 'unban', 'admin', 'gold'].some(k => flags[k] != null);
let gold = flags.gold != null ? +flags.gold || 0 : (pos[0] != null && /^\d+$/.test(pos[0]) ? +pos[0] : null);
if (gold == null && !hasRewardFlag) gold = 10000;
const namePos = (pos[0] != null && /^\d+$/.test(pos[0])) ? pos[1] : pos[0];
const fields = [];
if (gold) fields.push('gold: ' + gold);
if (flags.tickets != null) fields.push('tickets: ' + (+flags.tickets || 0));
if (flags.books != null) fields.push('books: ' + (+flags.books || 0));
if (flags.core != null) fields.push('core: ' + (+flags.core || 0));
if (flags.raceSelect) fields.push("raceSelect: '" + String(flags.raceSelect).replace(/'/g, '') + "'");
if (flags.pack) fields.push("pack: '" + String(flags.pack).replace(/'/g, '') + "'");
if (flags.potions) {
  const [hp, mp] = String(flags.potions).split(',').map(x => +x || 0);
  fields.push('potions: { hp: ' + hp + ', mp: ' + (mp || hp) + ' }');
}
if (flags.unban) fields.push('unban: 1');
if (flags.admin) fields.push('admin: 1');
const name = namePos || (flags.unban ? '清空停權' : flags.admin ? '管理員號' : flags.tickets != null ? ('種族抽選券 ' + flags.tickets + ' 張') : flags.raceSelect ? (flags.raceSelect + ' 種族自選券') : flags.pack ? flags.pack : (gold ? gold + ' 費拉' : '禮包'));
if (!fields.length) { console.error('請指定獎勵，例如：node tools/makecode.js --tickets 1000'); process.exit(1); }
fields.push("name: '" + String(name).replace(/'/g, '') + "'");

const code = 'TFL-' + pick(4) + '-' + pick(4) + '-' + pick(4);
console.log('序號（交給作者，不要放進 repo）：' + code);
console.log('加進 redeem.js 的 CODES：');
console.log('    { h: \'' + hashOf(code) + '\', ' + fields.join(', ') + ' },');
