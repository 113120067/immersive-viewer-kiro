/**
 * Kids Vocabulary Routes
 * 小學生英文單字圖片生成器路由
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const githubStorage = require('../src/services/github-storage');
const reportService = require('../src/services/image-report-service');

/**
 * GET /kids-vocabulary - 小學生單字生成器頁面
 */
router.get('/', (req, res) => {
  res.render('kids-vocabulary', {
    title: '小學生英文學習圖片生成器 - 免費無需登入',
    githubOwner: process.env.GITHUB_OWNER,
    githubRepo: process.env.GITHUB_REPO,
    githubPath: process.env.GITHUB_PATH || 'public/library'
  });
});

/**
 * GET /kids-vocabulary/words - 獲取適合小學生的單字範例
 */
router.get('/words', (req, res) => {
  const kidsWords = {
    animals: [
      { word: 'cat', meaning: '貓' },
      { word: 'dog', meaning: '狗' },
      { word: 'bird', meaning: '鳥' },
      { word: 'fish', meaning: '魚' },
      { word: 'rabbit', meaning: '兔子' },
      { word: 'elephant', meaning: '大象' },
      { word: 'lion', meaning: '獅子' },
      { word: 'tiger', meaning: '老虎' }
    ],
    colors: [
      { word: 'red', meaning: '紅色' },
      { word: 'blue', meaning: '藍色' },
      { word: 'green', meaning: '綠色' },
      { word: 'yellow', meaning: '黃色' },
      { word: 'orange', meaning: '橘色' },
      { word: 'purple', meaning: '紫色' },
      { word: 'pink', meaning: '粉紅色' },
      { word: 'black', meaning: '黑色' }
    ],
    objects: [
      { word: 'book', meaning: '書' },
      { word: 'pen', meaning: '筆' },
      { word: 'bag', meaning: '書包' },
      { word: 'chair', meaning: '椅子' },
      { word: 'table', meaning: '桌子' },
      { word: 'car', meaning: '汽車' },
      { word: 'ball', meaning: '球' },
      { word: 'toy', meaning: '玩具' }
    ],
    actions: [
      { word: 'run', meaning: '跑' },
      { word: 'jump', meaning: '跳' },
      { word: 'eat', meaning: '吃' },
      { word: 'sleep', meaning: '睡覺' },
      { word: 'play', meaning: '玩' },
      { word: 'read', meaning: '讀' },
      { word: 'write', meaning: '寫' },
      { word: 'sing', meaning: '唱歌' }
    ],
    feelings: [
      { word: 'happy', meaning: '快樂的' },
      { word: 'sad', meaning: '傷心的' },
      { word: 'angry', meaning: '生氣的' },
      { word: 'excited', meaning: '興奮的' },
      { word: 'tired', meaning: '累的' },
      { word: 'hungry', meaning: '餓的' },
      { word: 'thirsty', meaning: '渴的' },
      { word: 'sleepy', meaning: '想睡的' }
    ]
  };

  res.json({
    success: true,
    words: kidsWords
  });
});

/**
 * GET /kids-vocabulary/random - 獲取隨機單字
 */
router.get('/random', (req, res) => {
  const allWords = [
    'apple', 'cat', 'dog', 'book', 'house', 'car', 'tree', 'flower',
    'sun', 'moon', 'star', 'water', 'fire', 'bird', 'fish', 'happy',
    'sad', 'big', 'small', 'red', 'blue', 'green', 'yellow', 'run',
    'jump', 'eat', 'sleep', 'play', 'school', 'teacher', 'student',
    'friend', 'family', 'love', 'smile', 'laugh', 'dance', 'music'
  ];

  const randomWord = allWords[Math.floor(Math.random() * allWords.length)];

  res.json({
    success: true,
    word: randomWord
  });
});

/**
 * POST /kids-vocabulary/report - 檢舉不當圖片
 * Community Reporting System Endpoint
 */
router.post('/report', async (req, res) => {
  const { word } = req.body;
  const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!word) {
    return res.status(400).json({ success: false, error: 'Missing word' });
  }

  try {
    const result = await reportService.reportImage(word, userIp);

    // If banned, perform deletion immediately
    if (result.status === 'banned') {
      // Background delete from GitHub to update fast
      // Note: We don't await this to keep UI responsive, also frontend will reload
      githubStorage.deleteImage(word, 'jpg')
        .then(() => console.log(`🗑️ Banned image deleted for: ${word}`))
        .catch(err => console.error(`❌ Delete banned image failed: ${err.message}`));
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ success: false, error: 'Report failed' });
  }
});

/**
 * POST /kids-vocabulary/generate - 生成圖片並存檔
 */
router.post('/generate', async (req, res) => {
  const { word } = req.body;
  if (!word) {
    return res.status(400).json({ success: false, error: '缺少單字' });
  }

  // 1. 生成 Prompt (與前端邏輯一致，確保風格統一)
  const safeInput = word.replace(/[^\w\s.,!?'-]/gi, '');
  const prompt = `cute cartoon illustration of ${safeInput}, safe for kids, G-rated, simple vector art, vibrant colors, for primary school educational material, white background, high quality, no guns, no blood, no violence, no nudity`;

  // 2. Fetch Version for Seed (Community Reporting Integration)
  const version = await reportService.getWordVersion(word);

  // 3. 生成 Seed (Hash + Version)
  let seed = 0;
  const str = word.toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    seed = ((seed << 5) - seed) + str.charCodeAt(i);
    seed = seed & seed;
  }
  seed = Math.abs(seed) + version; // Add version offset to force new image

  const negativePrompt = encodeURIComponent('nudity, violence, blood, guns, weapons, adult content, text, watermark');
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&enhance=true&seed=${seed}&nologo=true&negative=${negativePrompt}`;

  try {
    console.log(`🎨 Backend generating for: ${word} (v${version})`);

    // 4. 後端下載圖片 (Buffer)
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    // 5. 立即回傳給使用者 (Base64) - 讓用戶不用等 GitHub
    const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    res.json({
      success: true,
      image: base64Image, // 提供 Base64 直接顯示
      source: 'backend-proxy',
      version: version
    });

    // 6. [背景任務] 上傳至 GitHub
    // 不用 await，讓它在背景跑
    githubStorage.uploadImage(word, buffer, 'jpg')
      .then(url => {
        if (url) console.log(`✅ Background upload complete: ${url}`);
      })
      .catch(err => {
        console.error(`❌ Background upload failed: ${err.message}`);
      });

  } catch (error) {
    console.error('Generation error:', error.message);
    res.status(500).json({ success: false, error: '圖片生成失敗' });
  }
});

module.exports = router;