/**
 * Kids Vocabulary Routes
 * 小學生英文單字圖片生成器路由
 */

const express = require('express');
const router = express.Router();

/**
 * GET /kids-vocabulary - 小學生單字生成器頁面
 */
router.get('/', (req, res) => {
  res.render('kids-vocabulary', { 
    title: '小學生英文學習圖片生成器 - 免費無需登入'
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

module.exports = router;