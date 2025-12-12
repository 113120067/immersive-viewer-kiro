# 🎓 智慧教室管理系統

> 整合 Microsoft Immersive Reader、Azure AI 和 Firebase 的現代化學習平台

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-9+-orange.svg)](https://firebase.google.com/)
[![Azure](https://img.shields.io/badge/Azure-AI-blue.svg)](https://azure.microsoft.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🌟 功能特色

### 🏫 智慧教室管理
- **雙模式儲存**：匿名用戶（記憶體24小時）+ 認證用戶（Firebase永久）
- **即時進度追蹤**：學習時間、單字掌握度、排行榜
- **教師控制面板**：課堂管理、學生監控、統計分析
- **學生學習介面**：個人進度、互動學習、成就系統

### 🤖 AI 智慧功能
- **Azure Computer Vision**：OCR文字識別、圖像分析
- **Microsoft Immersive Reader**：沉浸式閱讀體驗
- **智慧詞彙提取**：多格式文件處理、自動分詞
- **多語言支援**：特別優化繁體中文

### 🔐 安全性設計
- **Firebase Authentication**：OAuth 2.0 認證
- **Firestore Security Rules**：資料存取控制
- **輸入驗證**：防止 XSS 和注入攻擊
- **環境變數管理**：敏感資料保護

## 🚀 快速開始

### 前置需求
- Node.js 18+
- npm 或 yarn
- Firebase 專案（選用）
- Azure Computer Vision 服務（選用）

### 基礎安裝（記憶體模式）
```bash
# 1. 克隆專案
git clone https://github.com/你的用戶名/immersive-viewer-enhanced.git
cd immersive-viewer-enhanced

# 2. 安裝依賴
npm install

# 3. 啟動服務
npm start

# 4. 開啟瀏覽器
# http://localhost:3000
```

### 完整安裝（雲端模式）

#### 1. 設定 Firebase
```bash
# 建立 Firebase 專案
# 1. 到 https://console.firebase.google.com/
# 2. 建立新專案
# 3. 啟用 Authentication 和 Firestore
# 4. 下載服務帳戶金鑰
```

#### 2. 設定 Azure Computer Vision
```bash
# 1. 到 https://portal.azure.com/
# 2. 建立 Computer Vision 資源
# 3. 取得 API Key 和 Endpoint
```

#### 3. 配置環境變數
```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env 文件，填入你的服務金鑰
```

#### 4. 部署 Firestore 規則
```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 登入 Firebase
firebase login

# 部署規則和索引
firebase deploy --only firestore
```

## 📁 專案結構

```
immersive-viewer-enhanced/
├── 📂 src/
│   ├── 📂 config/           # 配置文件
│   │   ├── firebase-admin.js    # Firebase Admin SDK
│   │   └── multer-config.js     # 文件上傳配置
│   ├── 📂 middleware/       # 中介軟體
│   │   └── auth-middleware.js   # 認證中介軟體
│   ├── 📂 services/         # 服務層
│   │   ├── classroom-manager.js      # 教室管理器
│   │   ├── firestore-classroom-service.js  # Firestore 服務
│   │   └── azureVision.js            # Azure AI 服務
│   └── 📂 utils/            # 工具函數
├── 📂 routes/               # API 路由
├── 📂 views/                # 頁面模板
├── 📂 public/               # 靜態資源
│   └── 📂 js/               # 前端 JavaScript
└── 📂 docs/                 # 文檔
```

## 🎯 使用場景

### 👨‍🏫 教師使用流程
1. **建立課堂**：上傳詞彙文件，生成課堂代碼
2. **分享代碼**：學生使用4位代碼加入課堂
3. **監控進度**：即時查看學習統計和排行榜
4. **管理課堂**：查看詳細進度、匯出報告

### 👨‍🎓 學生使用流程
1. **加入課堂**：輸入課堂代碼和姓名
2. **開始學習**：使用 Immersive Reader 學習詞彙
3. **追蹤進度**：查看個人統計和班級排名
4. **互動功能**：單字交換、練習記錄

## 🔧 API 文檔

### 教室管理 API
```javascript
// 建立課堂
POST /classroom/create
Content-Type: multipart/form-data
Authorization: Bearer <token> (optional)

// 加入課堂
POST /classroom/join
{
  "code": "ABC1",
  "studentName": "小明"
}

// 開始學習會話
POST /classroom/api/session/start
{
  "code": "ABC1",
  "studentName": "小明"
}
```

### 認證 API
```javascript
// 我的課堂（需要認證）
GET /classroom/api/my-classrooms
Authorization: Bearer <token>

// 學習進度（需要認證）
GET /classroom/api/progress/:classroomId
Authorization: Bearer <token>
```

## 📊 資料庫設計

### Firestore 集合結構
```javascript
// classrooms 集合
{
  code: "ABC1",
  name: "英文課",
  words: ["apple", "banana"],
  ownerId: "firebase-uid",
  createdAt: Timestamp
}

// classrooms/{id}/students 子集合
{
  name: "小明",
  totalTime: 3600,
  wordStats: {
    "apple": { correct: 5, wrong: 2 }
  }
}
```

## 🛡️ 安全性

### Firestore Security Rules
```javascript
// 只有課堂擁有者可以讀取私人課堂
match /classrooms/{classroomId} {
  allow read: if resource.data.isPublic == true 
    || request.auth.uid == resource.data.ownerId;
  allow create: if request.auth != null 
    && request.auth.uid == request.resource.data.ownerId;
}
```

### 環境變數安全
- 所有敏感資料存放在 `.env` 文件
- `.env` 已加入 `.gitignore`
- 生產環境使用平台環境變數

## 🚀 部署指南

### Vercel 部署
```bash
# 1. 安裝 Vercel CLI
npm i -g vercel

# 2. 部署
vercel

# 3. 設定環境變數
vercel env add FIREBASE_SERVICE_ACCOUNT
```

### Railway 部署
```bash
# 1. 連接 GitHub repository
# 2. 在 Railway 控制台設定環境變數
# 3. 自動部署
```

## 🧪 測試

```bash
# 執行測試
npm test

# 測試覆蓋率
npm run test:coverage

# 端對端測試
npm run test:e2e
```

## 📈 效能優化

- **Firestore 索引**：優化查詢效能
- **CDN 快取**：靜態資源加速
- **圖片壓縮**：減少載入時間
- **代碼分割**：按需載入

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 📄 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 文件

## 🙏 致謝

- [Microsoft Immersive Reader](https://docs.microsoft.com/azure/applied-ai-services/immersive-reader/)
- [Azure Computer Vision](https://azure.microsoft.com/services/cognitive-services/computer-vision/)
- [Firebase](https://firebase.google.com/)
- [Express.js](https://expressjs.com/)

## 📞 聯絡方式

- 專案連結：[https://github.com/你的用戶名/immersive-viewer-enhanced](https://github.com/你的用戶名/immersive-viewer-enhanced)
- 問題回報：[Issues](https://github.com/你的用戶名/immersive-viewer-enhanced/issues)

---

⭐ 如果這個專案對你有幫助，請給個星星支持！