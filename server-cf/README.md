# 討伐令 1433 多人連線伺服器（Cloudflare 版）

和 `server/`（Node.js，給 Render 用）是同一套訊息，換成 Cloudflare Workers ＋ Durable Objects。
為什麼推薦這一版，見專案根目錄的 `連線報告.md`。

## 上線（作者做一次就好）

> 2026-10-05 已經上線：`wss://taofaling-1433.1433.workers.dev`（已填進 net.js 的 PROD）。下面的步驟留著，換帳號或重新部署時照做。

1. 到 https://dash.cloudflare.com/sign-up 註冊 Cloudflare 帳號（免費方案，不用信用卡）。
2. 打開終端機，先進到這個資料夾（`cd server-cf`），再執行（**Windows 的 PowerShell 要打 `npx.cmd`**，打 `npx` 會出現「已停用指令碼執行」的紅字）：
   ```
   npx.cmd wrangler login
   ```
   瀏覽器會跳出 Cloudflare 的授權頁，按允許。
3. 再執行：
   ```
   npx.cmd wrangler deploy
   ```
   最後會印出網址，長得像 `https://taofaling-1433.你的帳號.workers.dev`。
4. 把這個網址告訴 Claude（或 Codex）：填進 `net.js` 的 `PROD`、推上去，線上版就能連了。

之後改了 `worker.js`，在這個資料夾再跑一次 `npx.cmd wrangler deploy` 就會更新。（Mac、Linux、Git Bash 打 `npx` 就好。）

## 本機測試

```
npx wrangler dev --port 8788
```

遊戲網址後面加 `?server=ws://127.0.0.1:8788`（或公會登記處「換伺服器」填這個）。

## 額度（免費方案，2026-10 查的，以 Cloudflare 官網為準）

- Durable Objects：每天 100,000 次請求、13,000 GB-秒；收到的 WebSocket 訊息每 20 則算 1 次請求。
- 遊戲每人每秒送 10 則位置：四人房一小時大約 7,200 次請求 → 每天大約可以玩 14 個「四人房小時」。
- 不收流量費。超過就改 Workers Paid（每月 5 美元）。
