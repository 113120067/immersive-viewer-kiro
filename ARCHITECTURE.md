# 共用模組架構說明

## 🎯 目的
避免功能重複和不一致,透過模組化設計集中管理共用邏輯。

## 📁 架構說明

### 1. **檔案處理模組** (`src/utils/file-processor.js`)

**功能:**
- 統一所有檔案格式處理邏輯
- 支援的格式管理集中化
- 提供文字提取、分詞等共用功能

**主要函數:**
```javascript
FILE_FORMATS.getAllFormats()      // 取得所有支援格式
FILE_FORMATS.getVocabFormats()    // 取得單字提取支援格式
FILE_FORMATS.getDocumentFormats() // 取得文件閱讀支援格式

extractTextFromBuffer(buffer, filename, options)  // 從記憶體提取文字
extractTextFromFile(filePath, options)             // 從檔案提取文字
tokenizeText(text)                                 // 文字分詞
formatAsHtml(text)                                 // 格式化為 HTML
```

**使用範例:**
```javascript
const { extractTextFromBuffer, tokenizeText, FILE_FORMATS } = require('../utils/file-processor');

// 提取文字
const text = await extractTextFromBuffer(buffer, filename);

// 分詞
const words = tokenizeText(text);

// 檢查支援格式
const allowedFormats = FILE_FORMATS.getVocabFormats();
```

---

### 2. **Multer 設定模組** (`src/config/multer-config.js`)

**功能:**
- 統一檔案上傳設定
- 集中管理檔案大小限制
- 提供記憶體和磁碟儲存兩種模式

**主要函數:**
```javascript
createMemoryUpload(allowedExtensions, errorMessage)  // 記憶體儲存模式
createDiskUpload(destination, allowedExtensions)     // 磁碟儲存模式
handleMulterError(err, req, res, next)               // 統一錯誤處理
```

**使用範例:**
```javascript
const { createMemoryUpload, handleMulterError, FILE_SIZE_LIMIT } = require('../config/multer-config');
const { FILE_FORMATS } = require('../utils/file-processor');

// 建立上傳中介軟體
const upload = createMemoryUpload(
  FILE_FORMATS.getVocabFormats(),
  'Only text documents and spreadsheets are allowed'
);

// 在路由中使用
router.post('/api/upload', upload.single('file'), async (req, res) => {
  // ... 處理邏輯
});

// 錯誤處理
router.use(handleMulterError);
```

---

### 3. **Immersive Reader 設定模組** (`public/js/ir-config.js`)

**功能:**
- 統一 Immersive Reader 設定
- 提供預設選項(繁體中文介面)
- 簡化啟動流程

**主要函數:**
```javascript
IRConfig.getDefaultOptions(customOptions)  // 取得預設選項
IRConfig.createData(title, content, lang)  // 建立資料結構
IRConfig.launch(title, content, options)   // 啟動 IR
```

**預設設定:**
- `uiLang: 'zh-Hant'` - 繁體中文介面
- `disableGrammar: false` - 啟用音節、圖片字典
- `disableTranslation: false` - 啟用翻譯功能

**使用範例:**
```javascript
// 在 HTML 中引入 (已在 layout.pug 中引入)
<script src="/js/ir-config.js"></script>

// 使用預設設定啟動
await IRConfig.launch('My Title', content);

// 自訂設定
await IRConfig.launch('My Title', content, {
  lang: 'zh-Hant',  // 內容語言
  onExit: () => console.log('Closed')
});
```

---

## 🔄 遷移指南

### 如何更新現有路由使用共用模組:

#### **Upload 路由範例:**
```javascript
const { extractTextFromFile, formatAsHtml, FILE_FORMATS } = require('../src/utils/file-processor');
const { createDiskUpload, handleMulterError } = require('../src/config/multer-config');

// 使用共用設定
const upload = createDiskUpload(
  'tmp/uploads/',
  FILE_FORMATS.getDocumentFormats()
);

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // 使用共用提取函數
    const text = await extractTextFromFile(req.file.path, { preserveHtml: true });
    const content = formatAsHtml(text);
    
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 使用共用錯誤處理
router.use(handleMulterError);
```

#### **Upload-Vocab 路由範例:**
```javascript
const { extractTextFromBuffer, tokenizeText, FILE_FORMATS } = require('../utils/file-processor');
const { createMemoryUpload, handleMulterError } = require('../config/multer-config');

// 使用共用設定
const upload = createMemoryUpload(FILE_FORMATS.getVocabFormats());

router.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    // 使用共用提取函數
    const text = await extractTextFromBuffer(req.file.buffer, req.file.originalname);
    const words = tokenizeText(text);
    
    res.json({ success: true, words, wordCount: words.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.use(handleMulterError);
```

---

## ✅ 優點

1. **一致性**: 所有功能使用相同的邏輯
2. **可維護性**: 修改一處,全域生效
3. **可測試性**: 共用模組更容易單元測試
4. **可擴展性**: 新增功能時只需更新共用模組
5. **減少重複**: DRY (Don't Repeat Yourself) 原則

---

## 📝 維護規範

### 新增檔案格式支援:

1. 在 `FILE_FORMATS` 中註冊新格式
2. 在 `extractTextFromBuffer` 和 `extractTextFromFile` 中實作處理邏輯
3. 所有使用該模組的路由自動支援新格式

### 修改 Immersive Reader 設定:

1. 只需修改 `ir-config.js` 中的 `getDefaultIROptions`
2. 所有頁面自動套用新設定

### 調整檔案大小限制:

1. 只需修改 `multer-config.js` 中的 `FILE_SIZE_LIMIT`
2. 所有上傳功能自動套用新限制

---

## 🚀 後續建議

1. ✅ 已建立共用模組
2. ⏳ 待重構現有路由使用共用模組
3. ⏳ 新增單元測試
4. ⏳ 建立 CI/CD 流程確保一致性

---

## 📚 課堂系統雙模式儲存架構

### 架構概述

課堂系統採用**雙模式儲存架構**，根據使用者登入狀態自動選擇儲存方式：

```
                        User Request
                             |
                             v
                   ┌─────────────────┐
                   │ Auth Middleware │
                   │ (optional auth) │
                   └─────────┬───────┘
                             |
                             v
                   ┌─────────────────┐
                   │ Classroom       │
                   │ Manager         │
                   └─────────┬───────┘
                             |
               ┌─────────────┴─────────────┐
               |                           |
               v                           v
     ┌─────────────────┐       ┌─────────────────┐
     │ Memory Store    │       │ Firestore       │
     │ (Anonymous)     │       │ (Authenticated) │
     └─────────────────┘       └─────────────────┘
           |                           |
           v                           v
     24hr expiry              Permanent storage
```

---

### 資料流程

#### 未登入使用者（記憶體模式）
1. 使用者訪問 `/classroom/create`
2. `verifyIdToken({ optional: true })` 中介層設定 `req.user = null`
3. `classroomManager.createClassroom()` 檢測到 `user === null`
4. 呼叫 `classroomStore.createClassroom()` 儲存到記憶體
5. 設定 24 小時自動刪除定時器
6. 回傳 `{ source: 'memory' }` 標記

#### 登入使用者（Firestore 模式）
1. 使用者訪問 `/classroom/create` (已登入)
2. `verifyIdToken({ optional: true })` 驗證 token，設定 `req.user = { uid, email }`
3. `classroomManager.createClassroom()` 檢測到 `user !== null`
4. 呼叫 `firestoreService.createClassroom()` 儲存到 Firestore
5. 建立 classroom 文件，包含 `ownerId` 和 `ownerEmail`
6. 回傳 `{ source: 'firestore' }` 標記

---

### 核心模組

#### 1. Firebase Admin SDK 配置 (`src/config/firebase-admin.js`)

**職責：**
- 初始化 Firebase Admin SDK
- 讀取環境變數 `FIREBASE_SERVICE_ACCOUNT`
- 提供 `admin` 和 `db` 實例

**容錯處理：**
- 如果環境變數未設定，輸出警告但不中斷執行
- 允許應用在未配置 Firestore 時仍可運作（記憶體模式）

---

#### 2. 認證中介層 (`src/middleware/auth-middleware.js`)

**函數：** `verifyIdToken(options)`

**參數：**
- `optional` (boolean): 是否允許未登入請求通過

**行為：**
```javascript
// optional = false (必須登入)
// 無 token → 401 Unauthorized
// 無效 token → 401 Unauthorized
// 有效 token → req.user = { uid, email, emailVerified }

// optional = true (選擇性登入)
// 無 token → req.user = null, next()
// 無效 token → req.user = null, next()
// 有效 token → req.user = { uid, email, emailVerified }, next()
```

---

#### 3. Firestore Classroom Service (`src/services/firestore-classroom-service.js`)

**Firestore 資料結構：**

```javascript
// Collection: classrooms
{
  code: "ABC1",                    // 4位英數字（唯一）
  name: "英文課",
  words: ["apple", "banana"],
  wordCount: 2,
  ownerId: "firebase-uid",
  ownerEmail: "teacher@example.com",
  mode: "authenticated",
  isPublic: true,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  expiresAt: null
}

// Subcollection: classrooms/{id}/students
{
  name: "小明",
  userId: "firebase-uid" | null,  // 登入學生才有
  email: "student@example.com" | null,
  totalTime: 3600,                 // 秒
  sessionStart: Timestamp | null,
  lastActive: Timestamp,
  words: ["apple"],                // 個人單字清單
  wordStats: {
    "apple": { correct: 5, wrong: 2 }
  },
  joinedAt: Timestamp
}

// Subcollection: classrooms/{id}/students/{sid}/sessions
{
  startTime: Timestamp,
  endTime: Timestamp,
  duration: 1800,                  // 秒
  wordsStudied: ["apple", "banana"]
}
```

**主要函數：**
- `generateUniqueCode()` - 生成唯一 4 位代碼（最多嘗試 10 次）
- `createClassroom({ name, words, ownerId, ownerEmail })` - 建立課堂
- `getClassroomByCode(code)` / `getClassroomById(id)` - 查詢課堂
- `addStudent({ classroomId, name, userId, email })` - 加入課堂
- `startSession({ classroomId, studentName, userId })` - 開始會話
- `endSession({ classroomId, studentName, userId })` - 結束會話（建立 session 記錄）
- `getLeaderboard(classroomId)` - 取得排行榜（依 totalTime 降序）
- `getMyClassrooms(ownerId)` - 取得使用者建立的課堂
- `getMyParticipations(userId)` - 取得使用者參與的課堂（使用 collectionGroup）
- `getStudentProgress({ classroomId, userId })` - 取得詳細進度

---

#### 4. Classroom Manager (`src/services/classroom-manager.js`)

**職責：** 統一管理雙模式儲存，對外提供一致的 API

**核心邏輯：**
```javascript
async createClassroom({ name, words, user }) {
  if (user && db) {
    // Firestore 模式
    try {
      return await firestoreService.createClassroom(...);
    } catch (error) {
      // 失敗時回退到記憶體模式
      return classroomStore.createClassroom(...);
    }
  } else {
    // 記憶體模式
    return classroomStore.createClassroom(...);
  }
}
```

**所有方法都支援：**
- 自動選擇儲存模式
- 錯誤回退機制
- 回傳統一格式資料（包含 `source` 標記）

---

### API 端點列表

#### 公開端點（選擇性認證）

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| POST | `/classroom/create` | 建立課堂 | Optional |
| POST | `/classroom/join` | 加入課堂 | Optional |
| POST | `/classroom/api/session/start` | 開始學習 | Optional |
| POST | `/classroom/api/session/end` | 結束學習 | Optional |
| GET | `/classroom/api/leaderboard/:code` | 排行榜 | Optional |
| GET | `/classroom/api/status/:code/:name` | 學生狀態 | Optional |
| POST | `/classroom/api/word/swap` | 單字交換 | Optional |
| POST | `/classroom/api/word/practice` | 記錄練習 | Optional |

#### 私有端點（需要認證）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/classroom/my` | 我的課堂頁面 |
| GET | `/classroom/progress/:classroomId` | 學習進度頁面 |
| GET | `/classroom/api/my-classrooms` | 查詢建立的課堂 |
| GET | `/classroom/api/my-participations` | 查詢參與的課堂 |
| GET | `/classroom/api/progress/:classroomId` | 取得學習進度 |

---

### 前端架構

#### Classroom API Layer (`public/js/classroom-api.js`)

**功能：**
- 統一處理 Firebase 認證 token
- 自動在 HTTP header 加入 `Authorization: Bearer <token>`
- 提供所有課堂 API 的封裝函數

**範例：**
```javascript
import { createClassroom, getMyClassrooms } from '/js/classroom-api.js';

// 自動處理認證
const result = await createClassroom(formData);
const classrooms = await getMyClassrooms();
```

#### 我的課堂頁面 (`classroom-my.js`)

**功能：**
- 監聽 Firebase 登入狀態 (`onAuthStateChanged`)
- 顯示兩個區塊：
  1. **我建立的課堂**：呼叫 `getMyClassrooms()`
  2. **我參加的課堂**：呼叫 `getMyParticipations()`
- 渲染課堂卡片（代碼、名稱、統計、快速連結）

#### 學習進度頁面 (`classroom-progress.js`)

**功能：**
- 載入課堂和學生資料
- 使用 **Chart.js** 繪製學習時間趨勢圖
- 顯示單字統計（進度條顯示正確率）
- 渲染學習會話歷史記錄

**統計卡片：**
1. 總學習時間（分鐘）
2. 班級排名（X / Y）
3. 學習天數
4. 單字掌握度（百分比）

---

### 安全性

#### Firestore Security Rules

**核心規則：**
- **公開課堂**：任何人可讀取
- **私人課堂**：只有擁有者可讀取
- **建立課堂**：需要登入，且 `ownerId` 必須是當前使用者
- **加入課堂**：任何人可建立學生記錄
- **更新學生資料**：該學生本人或課堂擁有者
- **刪除學生**：只有課堂擁有者

#### Token 驗證流程

```
Client → Authorization: Bearer <token>
  ↓
auth-middleware.js
  ↓
admin.auth().verifyIdToken(token)
  ↓
Success: req.user = { uid, email }
Failure: 401 或 req.user = null (optional mode)
```

---

### 效能優化

#### Firestore 索引

1. **classrooms collection**:
   - `(ownerId, createdAt DESC)` - 查詢使用者的課堂
   - `(code)` - 快速代碼查詢

2. **students collectionGroup**:
   - `(userId, joinedAt DESC)` - 查詢使用者參與的課堂
   - `(totalTime DESC)` - 排行榜排序

3. **sessions subcollection**:
   - `(startTime DESC)` - 會話歷史排序

#### 快取策略

- Firestore 自動啟用本地快取
- 減少重複查詢
- 使用 `limit()` 限制回傳筆數

---

### 向下相容

**設計原則：**
- 保留原有 `classroom-store.js` 不修改
- 新功能透過 `classroom-manager.js` 包裝
- 未設定 Firebase Admin 時不會中斷執行
- 記憶體模式完全獨立運作

**遷移路徑：**
1. 未配置 Firebase：所有課堂使用記憶體模式
2. 配置 Firebase Web：登入功能可用，但課堂仍在記憶體
3. 配置 Firebase Admin：登入使用者的課堂永久保存

---

### 部署指南

#### 1. 基本部署（僅記憶體模式）
```bash
npm install
npm start
```

#### 2. 完整部署（含 Firestore）

**步驟：**
1. 設定 `.env` 檔案（參考 `.env.example`）
2. 部署 Firestore 規則和索引：
   ```bash
   firebase deploy --only firestore
   ```
3. 重啟應用：
   ```bash
   npm start
   ```

#### 3. 驗證部署

**檢查 Firebase Admin 初始化：**
```bash
# 啟動時應看到：
[Firebase Admin] Successfully initialized
```

**檢查 Firestore 連線：**
- 登入並建立課堂
- 前往 Firebase Console > Firestore
- 確認 `classrooms` collection 已建立

---

### 疑難排解

#### Firebase Admin 無法初始化
- 檢查 `FIREBASE_SERVICE_ACCOUNT` 環境變數
- 確認 JSON 格式正確
- 查看 console 錯誤訊息

#### 課堂無法保存到 Firestore
- 確認已部署 Firestore 規則
- 檢查 Firebase Admin 是否成功初始化
- 查看伺服器 console 錯誤訊息

#### 索引錯誤
```bash
# 部署索引
firebase deploy --only firestore:indexes

# 或在 Firebase Console 手動建立索引
# 錯誤訊息會包含建立索引的連結
```

---

## 🔗 相關文件

- [TESTING.md](./TESTING.md) - 測試指南
- [ReadMe.md](./ReadMe.md) - 使用說明
- [firestore.rules](./firestore.rules) - 安全規則
- [firestore.indexes.json](./firestore.indexes.json) - 索引配置

