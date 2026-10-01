# CLAUDE.md（給 Claude Code；內容和 AGENTS.md 相同，兩邊的 AI 照同一份規則）

這個資料夾是作者的網頁遊戲《討伐令 1433》（艾菲爾斯特・昭旭聯合王國的遺跡肉鴿）。
**開工前先讀 `開發說明.md`**：程式結構、寫法的規矩、設定的規則都在那裡。

## 協作的規矩（Claude Code 和 Codex 共用這個資料夾）

0. **專案的資料夾：`C:\Users\user\Documents\討伐令1433`**（有 git）。不要再改其他地方的複本（例如 Claude 的暫存資料夾）。
   **線上版只有一個網址：https://leehwa0001-ctrl.github.io/taofaling-1433/**（GitHub Pages，repo：https://github.com/leehwa0001-ctrl/taofaling-1433 ，公開）。
   改完、commit 之後 `git push`，GitHub Actions 會自動把 `index.html` 包成完整的網頁發布（`.github/workflows/pages.yml`，一兩分鐘後生效）。兩個帳號的 Claude、Codex 都一樣，**不用再發布到 claude.ai 的 Artifact**。
   舊的 Artifact 網址（S18gM8…、PNpsZN37…）不再更新；玩家在舊網址的標題畫面「匯出存檔」，到新網址「匯入存檔」就能接著玩（savecode.js）。
1. **輪流改，不要同時改。** 開工前先 `git status`、`git log -3` 看看別人剛改了什麼；收工前 commit。
2. **commit 訊息用繁體中文**，寫清楚改了什麼、為什麼。例如：`遺跡：斷尾型改成封住房間前後的出入口`。
3. **一次只做一件事。** 大改動（例如重寫某個系統）先跟作者確認。
4. **不要重新排版或整檔重寫**別人寫的檔案，只改需要改的那幾段。這樣 diff 才看得懂，合併也不容易衝突。
5. 新功能盡量放在**新的 .js 檔**，用「包住原本函式」的方式接上（見開發說明第三節），再加進 `index.html`。
6. 改完：
   - 每個改過的檔案跑 `node --check 檔名.js`；
   - 用瀏覽器實際玩過一次（城裡走一圈、下一趟遺跡）；
   - 打開瀏覽器的 console 確認沒有錯誤。
7. **不能違反的設定**：
   - 玩家沒有性別，台詞不用「他／她」指玩家；
   - 不寫色情內容，未成年角色（阿杏）只能是朋友；
   - 遺跡生物不用日本妖怪的原名；
   - 世界叫艾菲爾斯特。
   - 其他見開發說明第四節。有疑問就問作者，不要自己發明會跟設定衝突的東西。
8. 不要把作者的個人資料（email 等）寫進程式或送到任何外部服務。

## 檢查語法（一次全部）

```
for f in *.js; do node --check "$f" || echo "FAIL $f"; done
```
