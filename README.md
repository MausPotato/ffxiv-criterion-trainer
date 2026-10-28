# 異聞演練所（FFXIV Criterion Trainer）

FF14 異聞迷宮單人機制演練工具。選擇迷宮與機制，在不影響隊友的情況下，透過互動模擬反覆熟悉站位、移動與判定。

> 今天也要愉快的讀書ᕕ ( ᐛ ) ᕗ

## 線上體驗

預定公開入口：<https://mauspotato.github.io/ffxiv-criterion-trainer/>

目前正在設定 GitHub Pages；部署確認成功後，此處將作為正式線上入口。

## 目前開放的練習內容

### 阿羅阿羅島（Another Aloalo Island）

- 凱圖嘟凱
  - 第一機制：排隊法
  - 第二機制：吹氣泡預覽
- 拉拉魯
  - 旋轉角乘算
  - 複合魔紋
  - 平面爆雷戰術
  - 立體炸彈戰術

### 準備中

- 希拉狄哈水道（Another Sil'dihn Subterrane）
- 六根山（Another Mount Rokkon）

尚未完成或未列入正式導覽的內容，不視為目前可遊玩的公開功能。

## 練習器功能與操作方式

- 依機制提供教學模式、實戰模式或時間軸控制。
- 支援的頁面可選擇角色或隊伍配置。
- 使用 `WASD` 或方向鍵移動；部分機制可拖曳旋轉鏡頭並重置視角。
- 透過 Debuff、場地提示、狀態卡與 QUICK REFERENCE 小抄輔助判讀。
- 完成判定後可重試同一題，或切換下一題繼續練習。

各機制的流程與可用操作不同，請以頁面上的控制項和說明為準。演練內容仍在持續校正，不代表所有時間軸與遊戲內演出已完成逐幀驗證。

## 本機開發

本專案使用 Vue 3、Vite、TypeScript 與 Vue Router。

```sh
npm ci
npm run dev
```

常用檢查指令：

```sh
npm run typecheck
npm test
npm run build
```

`npm test` 會執行完整測試，並接受目前已文件化的兩項凱圖嘟凱吹氣泡 baseline；任何新增或不同的失敗仍會回傳錯誤。若要查看未套用 baseline 的原始結果，可執行 `npm run test:strict`。

## 開發狀態

目前為持續開發中的公開測試版本。功能、數值與視覺提示仍可能調整；若遇到操作或判定問題，歡迎透過 GitHub Issues 提供可重現步驟。

## 免責與版權聲明

本專案是非官方的 FINAL FANTASY XIV 玩家製作練習工具，與 SQUARE ENIX CO., LTD. 沒有官方合作、認可或隸屬關係。

FINAL FANTASY XIV、遊戲名稱及相關素材的權利歸其各自權利人所有。本專案不主張未取得權利之遊戲素材或外部內容授權；如引用外部攻略或素材，應依原作者與來源要求適當標示。若發現來源標示遺漏，請提出 Issue 協助修正。
