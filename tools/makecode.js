// 產生一個新的兌換序號（redeem.js）。用法：node tools/makecode.js 10000 "10000 費拉"
// 印出兩樣東西：序號（只交給作者，不要 commit）、要加進 redeem.js CODES 的那一行（只有雜湊）。
const crypto = require('crypto');
const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 去掉容易看錯的 I、O、0、1
const pick = n => Array.from(crypto.randomBytes(n), b => A[b % 32]).join('');
const cyrb53 = (str, seed = 0) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
const hashOf = s => cyrb53('taofaling1433:' + String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
const gold = process.argv[2] != null ? +process.argv[2] || 0 : 10000, name = process.argv[3] || gold + ' 費拉';
const code = 'TFL-' + pick(4) + '-' + pick(4) + '-' + pick(4);
console.log('序號（交給作者，不要放進 repo）：' + code);
console.log('加進 redeem.js 的 CODES：');
console.log("    { h: '" + hashOf(code) + "', gold: " + gold + ", name: '" + name + "' },");
