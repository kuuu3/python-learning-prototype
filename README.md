# Python 初學者錯誤診斷與適性練習 Prototype

這是一個純前端數位學習 prototype，目標是協助 Python 初學者發現常見錯誤概念，並透過提示、修正題、遷移題、自我說明與學習摘要完成適性練習。

## 核心功能

- 初始診斷：記錄答案、信心程度與錯誤概念
- 主題練習：`list_index`、`range_loop`、`conditionals`、`type_conversion`
- 題庫抽題：各主題至少 8 題，核心 `list_index` 題量更完整
- 三層提示：依學生需求逐層顯示
- 錯誤概念補救：不同錯誤類型顯示不同補救卡與對比案例
- 作答時間：記錄有效時間、原始時間、分頁離開時間與過快作答確認
- 自我說明：偵測已提到與可補充的關鍵概念，不自動評分
- 總複習：四個主題混合抽題，產生跨主題摘要
- 學習紀錄：保存作答紀錄與狀態轉移紀錄
- 管理頁：展示模式、題庫統計、localStorage 狀態、驗收檢查、T01-T10 測試情境、JSON 匯出

## 使用方式

直接用瀏覽器開啟 `index.html`。

建議學生流程：

1. 開始診斷
2. 依建議或自行選主題練習
3. 完成自我說明與自我評量
4. 進入總複習
5. 查看學習摘要

管理/展示流程：

1. 點右上角 `管理`
2. 使用 `建立展示資料`
3. 查看驗收檢查與 T01-T10 測試情境
4. 匯出 JSON 學習紀錄

## 規格對照

| 規格重點 | Prototype 實作 |
|---|---|
| localStorage 五個 key | `profile`、`progress`、`attempts`、`session`、`summaries` |
| 初始診斷 | 診斷題、答案、信心程度、我不知道 |
| 學生模型 | 掌握度、錯誤風險、提示依賴、遷移能力、流暢度 |
| 三層提示 | Level 1 / 2 / 3 提示 |
| 錯誤概念映射 | answer errorMap 對應 errorType |
| 補救內容 | repairContentByError 顯示補救卡 |
| 作答時間 | 有效時間、原始時間、inactive time |
| 過快提醒 | 低於 2.5 秒需確認後再提交 |
| 分頁切換 | visibilitychange 暫停有效作答時間 |
| 自我說明 | 關鍵概念偵測與 selfAssessment |
| 總複習 | 四主題混合抽題與跨主題摘要 |
| 狀態轉移 | sessionTransitionLog，最多 100 筆 |
| 管理驗收 | 管理頁檢查清單與 T01-T10 |

## 測試情境 T01-T10

管理頁會顯示以下情境的支援或完成狀態：

- T01 全部答對且信心高
- T02 答對但信心低
- T03 答錯且信心高
- T04 選擇我不知道
- T05 過快作答提醒
- T06 分頁切換暫停有效時間
- T07 同一錯誤連續多次
- T08 localStorage JSON 損毀
- T09 schemaVersion 不同
- T10 遷移題失敗

## 技術

- HTML
- CSS
- JavaScript
- localStorage

