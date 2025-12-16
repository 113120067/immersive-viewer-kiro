/**
 * Kids Vocabulary Generator
 * 專為小學生設計的簡化英文單字圖片生成器
 * 無需登入，直接使用免費 AI 服務
 */

class KidsVocabularyGenerator {
  constructor() {
    this.isGenerating = false;
    this.recentWords = JSON.parse(localStorage.getItem('kidsRecentWords') || '[]');
    this.currentWord = '';
    this.speechSynthesis = window.speechSynthesis;
    this.speechRecognition = null;
    this.isListening = false;

    // Rate Limiting
    this.isCoolingDown = false;
    this.cooldownSeconds = 15;
    this.cooldownTimer = null;

    this.init();
    this.isLoadingImage = false;
  }

  /**
   * 更新按鈕狀態 (統一管理所有狀態邏輯)
   */
  updateButtonState() {
    const btnMobile = document.getElementById('generateBtn');
    const btnDesktop = document.getElementById('generateBtnDesktop');

    // 決定按鈕文字和狀態
    let isDisabled = false;
    let buttonText = '🎨 生成圖片！';

    if (this.isLoadingImage) {
      isDisabled = true;
      buttonText = '🎨 正在繪製中...';
    } else if (this.isCoolingDown) {
      isDisabled = true;
      buttonText = `⏳ 請等待 ${this.cooldownSeconds}s`;
    }

    // 更新手機版按鈕
    if (btnMobile) {
      btnMobile.disabled = isDisabled;
      btnMobile.innerHTML = buttonText;
    }

    // 更新桌面版按鈕
    if (btnDesktop) {
      btnDesktop.disabled = isDisabled;
      btnDesktop.innerHTML = buttonText;
    }
  }

  init() {
    this.showWelcomeMessage();
    this.initializeSpeechFeatures();
    this.setupEventListeners();
    this.loadRecentWords();
    this.loadSpeechSettings();
  }

  showWelcomeMessage() {
    const welcomeMsg = document.getElementById('welcomeMessage');
    if (welcomeMsg) {
      setTimeout(() => {
        welcomeMsg.style.opacity = '1';
      }, 500);
    }
  }

  initializeSpeechFeatures() {
    // 初始化語音識別
    if ('webkitSpeechRecognition' in window) {
      this.speechRecognition = new webkitSpeechRecognition();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-US';

      this.speechRecognition.onstart = () => {
        this.isListening = true;
        this.updatePracticeUI();
      };

      this.speechRecognition.onend = () => {
        this.isListening = false;
        this.updatePracticeUI();
      };

      this.speechRecognition.onresult = (event) => {
        const result = event.results[0][0].transcript;
        this.handleSpeechResult(result);
      };

      this.speechRecognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        this.isListening = false;
        this.updatePracticeUI();
        if (event.error === 'not-allowed') {
          this.showError('請允許使用麥克風才能練習發音喔！');
        }
      };
    } else {
      const practiceBtn = document.getElementById('practiceBtn');
      if (practiceBtn) {
        practiceBtn.style.display = 'none';
      }
    }
  }

  setupEventListeners() {
    // 綁定生成按鈕事件
    const btnMobile = document.getElementById('generateBtn');
    const btnDesktop = document.getElementById('generateBtnDesktop');

    if (btnMobile) {
      btnMobile.addEventListener('click', (e) => {
        e.preventDefault();
        this.generateImage();
      });
    }

    if (btnDesktop) {
      btnDesktop.addEventListener('click', (e) => {
        e.preventDefault();
        this.generateImage();
      });
    }

    // 綁定輸入框 Enter 事件
    const inputMobile = document.getElementById('wordInput');
    const inputDesktop = document.getElementById('wordInputDesktop');

    const handleEnter = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.generateImage();
      }
    };

    if (inputMobile) inputMobile.addEventListener('keypress', handleEnter);
    if (inputDesktop) inputDesktop.addEventListener('keypress', handleEnter);

    // 語音功能相關事件
    const pronounceBtn = document.getElementById('pronounceBtn');
    if (pronounceBtn) {
      pronounceBtn.addEventListener('click', () => {
        if (this.currentWord) {
          this.pronounceWord(this.currentWord);
        }
      });
    }

    const practiceBtn = document.getElementById('practiceBtn');
    if (practiceBtn) {
      practiceBtn.addEventListener('click', () => {
        if (this.isListening) {
          this.stopListening();
        } else {
          this.startListening();
        }
      });
    }

    // 設定選項事件
    const pronunciationToggle = document.getElementById('pronunciationToggle');
    if (pronunciationToggle) {
      pronunciationToggle.addEventListener('change', (e) => {
        localStorage.setItem('kidsPronunciationEnabled', e.target.checked);
      });
    }

    const practiceToggle = document.getElementById('practiceToggle');
    if (practiceToggle) {
      practiceToggle.addEventListener('change', (e) => {
        localStorage.setItem('kidsPracticeEnabled', e.target.checked);
        const practiceBtn = document.getElementById('practiceBtn');
        const practiceResult = document.getElementById('practiceResult');

        if (practiceBtn) {
          practiceBtn.style.display = e.target.checked ? 'block' : 'none';
        }
        if (practiceResult && !e.target.checked) {
          practiceResult.style.display = 'none';
        }
      });
    }

    const speechSpeedSlider = document.getElementById('speechSpeedSlider');
    if (speechSpeedSlider) {
      speechSpeedSlider.addEventListener('input', (e) => {
        localStorage.setItem('kidsSpeechSpeed', e.target.value);
        this.updateSpeedDisplay();
      });
    }

    // 綁定快速單字卡 (Quick Chips) 點擊事件
    const quickChips = document.querySelectorAll('.quick-chip');
    quickChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const word = chip.dataset.word;
        if (word) {
          const input = window.innerWidth < 576 ?
            document.getElementById('wordInput') :
            document.getElementById('wordInputDesktop');

          if (input) {
            input.value = word;
            this.generateImage();
          }
        }
      });
    });

    // 綁定清除按鈕
    const clearBtns = document.querySelectorAll('.btn-clear-input');
    clearBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const inputId = btn.dataset.target;
        const input = document.getElementById(inputId);
        if (input) {
          input.value = '';
          input.focus();
        }
      });
    });
  }

  async generateImage() {
    console.log('🎨 generateImage 方法被調用');

    if (this.isGenerating) {
      console.log('⚠️ 正在生成中，跳過');
      return;
    }

    if (this.isCoolingDown) {
      this.showError(`請稍等 ${this.cooldownSeconds} 秒後再試！`);
      return;
    }

    // 獲取輸入值（手機版或桌面版）
    const mobileInput = document.getElementById('wordInput');
    const desktopInput = document.getElementById('wordInputDesktop');

    let input = '';
    if (mobileInput && mobileInput.offsetParent !== null) {
      input = mobileInput.value.trim();
    } else if (desktopInput && desktopInput.offsetParent !== null) {
      input = desktopInput.value.trim();
    } else if (mobileInput) {
      input = mobileInput.value.trim();
    } else if (desktopInput) {
      input = desktopInput.value.trim();
    }

    if (!input) {
      this.showError('請輸入英文單字或句子！');
      return;
    }

    if (input.length > 100) {
      this.showError('輸入太長了！請輸入簡短的英文單字或句子。');
      return;
    }

    // 1. 寬鬆的字元檢查：允許英文、數字、常見標點符號
    // 允許的符號: . , ! ? ' " - ; : ( ) 以及智慧型引號 ’ “ ”
    if (!/^[a-zA-Z0-9\s.,!?'"’“”;:()\-]+$/.test(input)) {
      this.showError('請只輸入英文、數字和常見標點符號！');
      return;
    }

    // 2. 內容意義檢查：確保至少包含一個英文字母
    // 避免只輸入 "123" 或 "!!!" 這種無意義內容
    if (!/[a-zA-Z]/.test(input)) {
      this.showError('請至少包含一個英文字母喔！');
      return;
    }

    try {
      this.isGenerating = true;
      this.showGenerationStatus(true);
      this.hideError();
      this.hideResult();

      // 開始 15 秒冷卻倒數
      this.startCooldown();

      console.log('🔗 開始生成 Pollinations URL');
      const imageUrl = this.generatePollinationsUrl(input);
      console.log('🔗 生成的圖片 URL:', imageUrl);

      const data = {
        success: true,
        imageUrl: imageUrl,
        provider: 'pollinations'
      };

      if (data.success) {
        this.showResult(data, input);
        this.addToRecentWords(input, data.imageUrl);
      } else {
        this.showError('生成圖片失敗，請再試一次！');
      }

    } catch (error) {
      console.error('Generation error:', error);
      this.showError('網路連線有問題，請再試一次！');
    } finally {
      this.isGenerating = false;
      // 注意：這裡不取消冷卻，冷卻是獨立的
      this.showGenerationStatus(false);
    }
  }

  /**
   * 開始冷卻倒數
   */
  startCooldown() {
    this.isCoolingDown = true;
    this.cooldownSeconds = 15;
    this.updateButtonState();

    if (this.cooldownTimer) clearInterval(this.cooldownTimer);

    this.cooldownTimer = setInterval(() => {
      this.cooldownSeconds--;
      this.updateButtonState();

      if (this.cooldownSeconds <= 0) {
        clearInterval(this.cooldownTimer);
        this.isCoolingDown = false;
        this.updateButtonState();
      }
    }, 1000);
  }

  /**
   * 快速冷卻 (當重複單字或快取命中時觸發)
   * 將剩餘等待時間縮短，改善體驗
   */
  quickCooldown() {
    // 只有在還在冷卻中才調整
    if (this.isCoolingDown) {
      this.cooldownSeconds = 3; // 縮短為 3 秒
      this.showSuccess('⚡ 圖片秒開！已為您加速冷卻時間！');

      const btnMobile = document.getElementById('generateBtn');
      const btnDesktop = document.getElementById('generateBtnDesktop');

      // 更新按鈕文字提示用戶
      const text = `⚡ 速通! ${this.cooldownSeconds}s`;
      if (btnMobile) btnMobile.innerHTML = text;
      if (btnDesktop) btnDesktop.innerHTML = text;
    }
  }

  /**
   * 生成適合小朋友的 Prompt
   */
  /**
   * 生成適合小朋友的 Prompt
   */
  generateKidsPrompt(input) {
    const safeInput = input.replace(/[^\w\s.,!?'-]/gi, '');
    // 加入強力的正向引導，並透過文字描述排除不適合內容
    return `cute cartoon illustration of ${safeInput}, simple vector art, vibrant colors, for children educational material, white background, high quality, no guns, no blood, no violence, no nudity`;
  }

  /**
   * 根據輸入內容生成固定的種子碼 (Seed)
   * 這樣相同的輸入就會產生相同的圖片，可以利用瀏覽器快取
   */
  generateSeed(input) {
    let hash = 0;
    const str = input.toLowerCase().trim();
    if (str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash);
  }

  /**
   * 直接生成 Pollinations 圖片 URL
   */
  generatePollinationsUrl(input) {
    const prompt = this.generateKidsPrompt(input);
    const encodedPrompt = encodeURIComponent(prompt);

    // 加入 seed 參數來確保輸出一致性，利用快取
    const seed = this.generateSeed(input);

    // 🔒 安全性更新：
    // 1. safe=true: 啟用 API 層級的 NSFW 過濾
    // 2. nologo=true: 移除可能的浮水印
    // 3. negative=Prompt: 明確排除不當內容 (增強安全性，減少誤判)
    const negativePrompt = encodeURIComponent('nudity, violence, blood, guns, weapons, adult content, text, watermark');
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&enhance=true&seed=${seed}&safe=true&nologo=true&negative=${negativePrompt}`;
  }

  showResult(data, input) {
    console.log('🎯 showResult called with:', { input, imageUrl: data.imageUrl });

    const imageElement = document.getElementById('generatedImage');
    const wordTitleElement = document.getElementById('wordTitle');
    const wordMeaningElement = document.getElementById('wordMeaning');
    const aiProviderElement = document.getElementById('aiProvider');
    const downloadLink = document.getElementById('downloadLink');
    const resultContainer = document.getElementById('imageResult');
    const placeholder = document.getElementById('placeholderContent');

    if (!imageElement || !resultContainer || !placeholder) {
      console.error('❌ 缺少必要的 DOM 元素');
      return;
    }

    this.currentWord = input;

    // 設定正在載入狀態
    this.isLoadingImage = true;
    this.updateButtonState();

    console.log('🖼️ 開始載入圖片:', data.imageUrl);

    // 記錄開始載入的時間，用於判斷是否為快取命中
    const startTime = Date.now();

    let imageLoadTimeout;
    let retryCount = 0;
    const maxRetries = 3;

    const loadImage = (url) => {
      console.log(`🔄 嘗試載入圖片 (第 ${retryCount + 1} 次):`, url);

      imageElement.onload = () => {
        const loadTime = Date.now() - startTime;
        console.log(`✅ 圖片載入成功，耗時: ${loadTime}ms`);

        // 載入完成，解除載入鎖定
        this.isLoadingImage = false;
        this.updateButtonState();

        if (imageLoadTimeout) clearTimeout(imageLoadTimeout);
        this.handlePronunciation(input);

        // 圖片真正載入完成後才顯示成功訊息
        this.showSuccess(`太棒了！"${input}" 的圖片生成完成！`);

        // 🟢 智慧型冷卻邏輯 (Smart Cooldown)
        // 如果載入時間小於 3000ms (3秒)，代表是快取命中 (Cache Hit)
        if (loadTime < 3000) {
          console.log('⚡ 快取命中！觸發快速冷卻');
          this.quickCooldown();
        }
      };

      imageElement.onerror = () => {
        if (imageLoadTimeout) clearTimeout(imageLoadTimeout);

        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => loadImage(url), 2000 * retryCount);
        } else {
          // 失敗也要解除鎖定
          this.isLoadingImage = false;
          this.updateButtonState();

          imageElement.alt = `${input} 的圖片載入失敗`;
          imageElement.alt = `${input} 的圖片載入失敗`;
          this.showError('圖片載入失敗。如果在「安全模式」下某些單字(如 flower)一直失敗，可能是被 AI 誤判為不適合兒童，請嘗試更具體的描述(如 red flower)！');
        }
      };

      imageLoadTimeout = setTimeout(() => {
        if (retryCount < maxRetries) {
          retryCount++;
          loadImage(url);
        } else {
          imageElement.alt = `${input} 的圖片載入超時`;
          this.showError('圖片載入超時，請檢查網路連線後重試');
        }
      }, 15000);

      imageElement.src = url;
      imageElement.alt = `${input} 的圖片`;
    };

    loadImage(data.imageUrl);

    const wordCount = input.trim().split(/\s+/).length;
    if (wordCount === 1) {
      wordTitleElement.textContent = input.toUpperCase();
      wordMeaningElement.textContent = this.getSimpleMeaning(input);
    } else {
      wordTitleElement.textContent = input;
      wordTitleElement.style.fontSize = '1.2em';
      wordMeaningElement.textContent = this.getSentenceDescription(input);
    }




    const filename = input.length > 20 ? input.substring(0, 20) + '...' : input;
    downloadLink.href = data.imageUrl;
    downloadLink.download = `${filename}-圖片.png`;

    placeholder.style.display = 'none';
    resultContainer.style.display = 'block';

    const mobileInputClear = document.getElementById('wordInput');
    const desktopInputClear = document.getElementById('wordInputDesktop');
    if (mobileInputClear) mobileInputClear.value = '';
    if (desktopInputClear) desktopInputClear.value = '';

  }

  /**
   * 使用多重備用策略載入圖片
   */
  loadImageWithFallback(imageElement, input, originalUrl) {
    console.log('🎯 Loading image with fallback strategy');

    // 為句子和單字生成不同的備用 URL
    const wordCount = input.trim().split(/\s+/).length;
    let urls;

    // 生成固定的種子，確保備用策略也能利用快取
    const seed = this.generateSeed(input);

    if (wordCount === 1) {
      // 單字的備用策略
      urls = [
        originalUrl, // 原始 URL
        `https://image.pollinations.ai/prompt/${encodeURIComponent('cute cartoon ' + input)}?seed=${seed}`, // 簡化版本
        `https://image.pollinations.ai/prompt/${encodeURIComponent(input)}?seed=${seed}`, // 最簡版本
      ];
    } else {
      // 句子的備用策略
      urls = [
        originalUrl, // 原始 URL
        `https://image.pollinations.ai/prompt/${encodeURIComponent('cartoon scene ' + input)}?seed=${seed}`, // 場景版本
        `https://image.pollinations.ai/prompt/${encodeURIComponent(input)}?seed=${seed}`, // 最簡版本
      ];
    }

    let currentIndex = 0;

    const tryNextUrl = () => {
      if (currentIndex >= urls.length) {
        // 所有 URL 都失敗，顯示佔位符
        this.showImagePlaceholder(imageElement, input);
        return;
      }

      const currentUrl = urls[currentIndex];
      console.log(`🔄 Trying URL ${currentIndex + 1}/${urls.length}:`, currentUrl);

      imageElement.onload = () => {
        console.log('✅ Image loaded successfully with URL:', currentUrl);
        // 圖片載入成功後才觸發發音
        this.handlePronunciation(input);
      };

      imageElement.onerror = () => {
        console.log(`❌ URL ${currentIndex + 1} failed, trying next...`);
        currentIndex++;

        // 給 Pollinations 一些時間生成圖片
        setTimeout(tryNextUrl, 2000);
      };

      imageElement.src = currentUrl;
      imageElement.alt = `${input} 的圖片`;
    };

    // 開始嘗試載入
    tryNextUrl();
  }

  /**
   * 顯示圖片佔位符
   */
  showImagePlaceholder(imageElement, input) {
    console.log('📝 Showing placeholder for:', input);

    imageElement.style.display = 'none';

    // 檢查是否已經有佔位符
    const existingPlaceholder = imageElement.parentNode.querySelector('.image-placeholder');
    if (existingPlaceholder) {
      existingPlaceholder.remove();
    }

    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';
    placeholder.style.cssText = `
      width: 300px; 
      height: 300px; 
      background: linear-gradient(45deg, #f8f9fa, #e9ecef); 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border: 3px solid #28a745; 
      border-radius: 15px; 
      font-family: Arial, sans-serif;
      text-align: center;
      margin: 0 auto;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;

    // 根據輸入長度調整顯示
    const displayText = input.length > 20 ? input.substring(0, 20) + '...' : input;
    const fontSize = input.length > 10 ? '18px' : '24px';

    placeholder.innerHTML = `
      <div>
        <div style="font-size: 48px; margin-bottom: 15px;">🎨</div>
        <div style="font-size: ${fontSize}; font-weight: bold; color: #28a745; margin-bottom: 10px; line-height: 1.2;">${displayText}</div>
        <div style="font-size: 16px; color: #6c757d; margin-bottom: 5px;">圖片生成中...</div>
        <div style="font-size: 14px; color: #adb5bd;">AI 正在創作您的圖片</div>
        <button onclick="location.reload()" style="
          margin-top: 15px; 
          padding: 8px 16px; 
          background: #28a745; 
          color: white; 
          border: none; 
          border-radius: 20px; 
          cursor: pointer;
          font-size: 14px;
        ">🔄 重新生成</button>
      </div>
    `;

    imageElement.parentNode.insertBefore(placeholder, imageElement);

    this.showError('圖片正在生成中！Pollinations 需要一些時間來創作您的圖片，請點擊「重新生成」按鈕重試。');
  }

  /**
   * 獲取簡單的中文意思（基本詞彙）
   */
  getSimpleMeaning(word) {
    const meanings = {
      'apple': '蘋果',
      'cat': '貓',
      'dog': '狗',
      'book': '書',
      'house': '房子',
      'car': '汽車',
      'tree': '樹',
      'flower': '花',
      'sun': '太陽',
      'moon': '月亮',
      'star': '星星',
      'water': '水',
      'fire': '火',
      'bird': '鳥',
      'fish': '魚',
      'happy': '快樂的',
      'sad': '傷心的',
      'big': '大的',
      'small': '小的',
      'red': '紅色',
      'blue': '藍色',
      'green': '綠色',
      'yellow': '黃色',
      'run': '跑',
      'jump': '跳',
      'eat': '吃',
      'sleep': '睡覺',
      'play': '玩',
      'school': '學校',
      'teacher': '老師',
      'student': '學生',
      'friend': '朋友',
      'family': '家庭'
    };

    return meanings[word.toLowerCase()] || '英文單字';
  }

  /**
   * 獲取句子的描述
   */
  getSentenceDescription(sentence) {
    // 分析句子類型並提供適當的描述
    const lowerSentence = sentence.toLowerCase();

    if (lowerSentence.includes('i am') || lowerSentence.includes("i'm")) {
      return '自我介紹句型';
    } else if (lowerSentence.includes('i like') || lowerSentence.includes('i love')) {
      return '表達喜好句型';
    } else if (lowerSentence.includes('how are you')) {
      return '問候語句型';
    } else if (lowerSentence.includes('what') || lowerSentence.includes('where') || lowerSentence.includes('when')) {
      return '疑問句句型';
    } else if (lowerSentence.includes('can you') || lowerSentence.includes('could you')) {
      return '請求句型';
    } else if (lowerSentence.includes('thank you') || lowerSentence.includes('thanks')) {
      return '感謝句型';
    } else if (lowerSentence.includes('good morning') || lowerSentence.includes('good afternoon') || lowerSentence.includes('good evening')) {
      return '問候句型';
    } else if (lowerSentence.includes('there is') || lowerSentence.includes('there are')) {
      return '存在句型';
    } else {
      return '英文句子';
    }
  }

  /**
   * 添加到最近單字/句子
   */
  addToRecentWords(input, imageUrl) {
    const wordCount = input.trim().split(/\s+/).length;
    const wordItem = {
      word: input,
      meaning: wordCount === 1 ? this.getSimpleMeaning(input) : this.getSentenceDescription(input),
      imageUrl: imageUrl,
      timestamp: new Date().toISOString(),
      type: wordCount === 1 ? 'word' : 'sentence'
    };

    // 移除重複的項目
    this.recentWords = this.recentWords.filter(item => item.word.toLowerCase() !== input.toLowerCase());

    // 添加到開頭
    this.recentWords.unshift(wordItem);

    // 限制數量
    if (this.recentWords.length > 10) {
      this.recentWords = this.recentWords.slice(0, 10);
    }

    localStorage.setItem('kidsRecentWords', JSON.stringify(this.recentWords));
    this.loadRecentWords();
  }

  /**
   * 載入最近單字/句子
   */
  loadRecentWords() {
    const recentWordsElement = document.getElementById('recentWords');

    if (this.recentWords.length === 0) {
      recentWordsElement.innerHTML = '<p class="text-muted text-center">還沒有學過的內容</p>';
      return;
    }

    const wordsHTML = this.recentWords.slice(0, 5).map(item => {
      const displayText = item.word.length > 12 ? item.word.substring(0, 12) + '...' : item.word;
      const typeIcon = item.type === 'sentence' ? '💬' : '📝';

      return `
        <div class="recent-word-item" onclick="kidsVocabGenerator.loadWord('${item.word.replace(/'/g, "\\'")}')">
          <div class="d-flex align-items-center">
            <span class="me-2">${typeIcon}</span>
            <div class="flex-grow-1">
              <div class="fw-bold">${displayText}</div>
              <small class="text-muted">${item.meaning}</small>
            </div>
          </div>
        </div>
      `;
    }).join('');

    recentWordsElement.innerHTML = wordsHTML;
  }

  /**
   * 載入單字/句子到輸入框
   */
  loadWord(input) {
    // 載入到可見的輸入框
    const mobileInput = document.getElementById('wordInput');
    const desktopInput = document.getElementById('wordInputDesktop');

    if (mobileInput && mobileInput.offsetParent !== null) {
      mobileInput.value = input;
      mobileInput.focus();
    } else if (desktopInput) {
      desktopInput.value = input;
      desktopInput.focus();
    }
  }

  /**
   * 顯示生成狀態
   */
  showGenerationStatus(show) {
    const statusElement = document.getElementById('generationStatus');
    const generateBtnMobile = document.getElementById('generateBtn');
    const generateBtnDesktop = document.getElementById('generateBtnDesktop');

    if (show) {
      statusElement.style.display = 'block';

      // 手機版按鈕
      if (generateBtnMobile) {
        generateBtnMobile.disabled = true;
        generateBtnMobile.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
      }

      // 桌面版按鈕
      if (generateBtnDesktop) {
        generateBtnDesktop.disabled = true;
        generateBtnDesktop.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
      }
    } else {
      statusElement.style.display = 'none';

      // 手機版按鈕
      if (generateBtnMobile) {
        generateBtnMobile.disabled = false;
        generateBtnMobile.innerHTML = '🎨 生成圖片！';
      }

      // 桌面版按鈕
      if (generateBtnDesktop) {
        generateBtnDesktop.disabled = false;
        generateBtnDesktop.innerHTML = '<i class="fas fa-magic"></i> 生成圖片！';
      }
    }
  }

  /**
   * 隱藏結果
   */
  hideResult() {
    document.getElementById('imageResult').style.display = 'none';
    document.getElementById('placeholderContent').style.display = 'block';
  }

  /**
   * 顯示錯誤訊息
   */
  showError(message) {
    const errorElement = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    errorText.textContent = message;
    errorElement.style.display = 'block';

    setTimeout(() => {
      this.hideError();
    }, 5000);
  }

  /**
   * 隱藏錯誤訊息
   */
  hideError() {
    document.getElementById('errorMessage').style.display = 'none';
  }

  /**
   * 顯示成功訊息
   */
  showSuccess(message) {
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success alert-dismissible fade show mt-3 text-center';
    successAlert.innerHTML = `
      <i class="fas fa-check-circle me-2"></i>${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const container = document.querySelector('.card-body');
    container.insertBefore(successAlert, container.firstChild);

    setTimeout(() => {
      if (successAlert.parentNode) {
        successAlert.remove();
      }
    }, 3000);
  }

  /**
   * 載入語音設定
   */
  loadSpeechSettings() {
    const pronunciationEnabled = localStorage.getItem('kidsPronunciationEnabled');
    const practiceEnabled = localStorage.getItem('kidsPracticeEnabled');
    const speechSpeed = localStorage.getItem('kidsSpeechSpeed');

    if (pronunciationEnabled !== null) {
      document.getElementById('pronunciationToggle').checked = pronunciationEnabled === 'true';
    }

    if (practiceEnabled !== null) {
      document.getElementById('practiceToggle').checked = practiceEnabled === 'true';
      // 觸發 change 事件來更新 UI
      document.getElementById('practiceToggle').dispatchEvent(new Event('change'));
    }

    if (speechSpeed !== null) {
      document.getElementById('speechSpeedSlider').value = speechSpeed;
    }

    // 更新速度顯示
    this.updateSpeedDisplay();
  }

  /**
   * 更新速度顯示
   */
  updateSpeedDisplay() {
    const slider = document.getElementById('speechSpeedSlider');
    const speedValue = document.getElementById('speedValue');
    const speed = parseFloat(slider.value);

    let speedText = '';
    if (speed <= 0.6) {
      speedText = '(很慢)';
    } else if (speed <= 0.8) {
      speedText = '(慢)';
    } else if (speed <= 1.0) {
      speedText = '(正常)';
    } else if (speed <= 1.3) {
      speedText = '(快)';
    } else {
      speedText = '(很快)';
    }

    speedValue.textContent = speedText;
  }

  /**
   * 處理發音
   */
  handlePronunciation(input) {
    const pronunciationEnabled = document.getElementById('pronunciationToggle').checked;

    if (pronunciationEnabled && this.speechSynthesis) {
      // 延遲一秒後自動發音，讓用戶先看到圖片
      setTimeout(() => {
        this.pronounceWord(input);
      }, 1000);
    }
  }

  /**
   * 發音單字或句子
   */
  pronounceWord(input) {
    if (!this.speechSynthesis) {
      this.showError('您的瀏覽器不支援語音功能');
      return;
    }

    // 停止當前發音
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(input);
    utterance.lang = 'en-US';

    // 使用用戶設定的語音速度
    const speedSlider = document.getElementById('speechSpeedSlider');
    const userSpeed = speedSlider ? parseFloat(speedSlider.value) : 0.8;

    utterance.rate = userSpeed;
    utterance.pitch = 1.1; // 保持清晰的音調
    utterance.volume = 0.8;

    // 選擇最佳語音
    const voices = this.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice =>
      voice.lang.startsWith('en') &&
      (voice.name.includes('Female') || voice.name.includes('Google'))
    ) || voices.find(voice => voice.lang.startsWith('en'));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      console.log('🔊 開始發音:', input);
      const pronounceBtn = document.getElementById('pronounceBtn');
      // 僅改變圖示或狀態，不改變原本的精簡佈局
      pronounceBtn.innerHTML = '<i class="fas fa-volume-up fa-beat"></i>';
      pronounceBtn.disabled = true;
      pronounceBtn.classList.remove('btn-primary');
      pronounceBtn.classList.add('btn-success');
    };

    utterance.onend = () => {
      console.log('✅ 發音完成');
      const pronounceBtn = document.getElementById('pronounceBtn');
      pronounceBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
      pronounceBtn.disabled = false;
      pronounceBtn.classList.add('btn-primary');
      pronounceBtn.classList.remove('btn-success');
    };

    utterance.onerror = (error) => {
      console.error('❌ 發音錯誤:', error);
      const pronounceBtn = document.getElementById('pronounceBtn');
      pronounceBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
      pronounceBtn.disabled = false;
      pronounceBtn.classList.add('btn-primary');
      pronounceBtn.classList.remove('btn-success');
    };

    this.speechSynthesis.speak(utterance);
  }

  /**
   * 開始語音識別
   */
  startListening() {
    if (!this.speechRecognition || !this.currentWord) {
      this.showError('語音識別不可用或沒有內容可練習');
      return;
    }

    this.isListening = true;
    this.updatePracticeUI();

    try {
      this.speechRecognition.start();
      console.log('🎤 開始語音識別');
    } catch (error) {
      console.error('語音識別啟動失敗:', error);
      this.isListening = false;
      this.updatePracticeUI();
    }
  }

  /**
   * 停止語音識別
   */
  stopListening() {
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop();
      this.isListening = false;
      this.updatePracticeUI();
    }
  }

  /**
   * 更新練習 UI
   */
  updatePracticeUI() {
    const practiceBtn = document.getElementById('practiceBtn');
    const practiceSpinner = document.getElementById('practiceSpinner');
    const practiceText = document.getElementById('practiceText');

    if (this.isListening) {
      practiceBtn.innerHTML = '<i class="fas fa-stop me-1"></i>🛑 停止';
      practiceBtn.className = 'btn btn-danger btn-sm w-100';
      practiceSpinner.style.display = 'inline-block';
      practiceText.textContent = '正在聽取您的發音...';
    } else {
      practiceBtn.innerHTML = '<i class="fas fa-microphone me-1"></i>🎤 練習';
      practiceBtn.className = 'btn btn-warning btn-sm w-100';
      practiceSpinner.style.display = 'none';
      if (practiceText.textContent.includes('正在聽取')) {
        practiceText.textContent = '點擊麥克風開始練習發音...';
      }
    }
  }

  /**
   * 處理語音識別結果
   */
  handleSpeechResult(result) {
    const practiceText = document.getElementById('practiceText');
    const targetInput = this.currentWord.toLowerCase();

    console.log('🎤 識別結果:', result, '目標內容:', targetInput);

    // 根據內容類型調整相似度檢查
    const wordCount = this.currentWord.trim().split(/\s+/).length;
    let similarity;

    if (wordCount === 1) {
      // 單字：嚴格比對
      similarity = this.calculateSimilarity(result, targetInput);
    } else {
      // 句子：較寬鬆的比對，檢查關鍵詞
      const targetWords = targetInput.split(/\s+/);
      const resultWords = result.split(/\s+/);
      const matchedWords = targetWords.filter(word =>
        resultWords.some(rWord => this.calculateSimilarity(rWord, word) > 0.7)
      );
      similarity = matchedWords.length / targetWords.length;
    }

    if (similarity > 0.7 || result === targetInput) {
      // 發音正確
      practiceText.innerHTML = `
        <i class="fas fa-check-circle text-success me-1"></i>
        <strong>太棒了！</strong> 您說的是 "${result}"，發音很棒！
      `;
      practiceText.parentElement.className = 'alert alert-success small mb-0';

      // 播放成功音效（如果可能）
      this.playSuccessSound();
    } else {
      // 發音需要改進
      const contentType = wordCount === 1 ? '單字' : '句子';
      practiceText.innerHTML = `
        <i class="fas fa-exclamation-triangle text-warning me-1"></i>
        您說的是 "${result}"，目標${contentType}是 "${this.currentWord}"。<br>
        <small>再試一次，聽聽正確發音！</small>
      `;
      practiceText.parentElement.className = 'alert alert-warning small mb-0';

      // 自動播放正確發音
      setTimeout(() => {
        this.pronounceWord(this.currentWord);
      }, 1000);
    }
  }

  /**
   * 處理語音識別錯誤
   */
  handleSpeechError(error) {
    const practiceText = document.getElementById('practiceText');

    let errorMessage = '語音識別發生錯誤';

    switch (error) {
      case 'no-speech':
        errorMessage = '沒有檢測到語音，請再試一次';
        break;
      case 'audio-capture':
        errorMessage = '無法訪問麥克風，請檢查權限設定';
        break;
      case 'not-allowed':
        errorMessage = '麥克風權限被拒絕，請允許使用麥克風';
        break;
      case 'network':
        errorMessage = '網路連線問題，請檢查網路';
        break;
    }

    practiceText.innerHTML = `
      <i class="fas fa-exclamation-circle text-danger me-1"></i>
      ${errorMessage}
    `;
    practiceText.parentElement.className = 'alert alert-danger small mb-0';

    console.error('🎤 語音識別錯誤:', error);
  }

  /**
   * 計算字串相似度
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * 計算編輯距離
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 播放成功音效
   */
  playSuccessSound() {
    // 使用 Web Audio API 播放簡單的成功音效
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('無法播放音效:', error);
    }
  }


}

// 初始化
let kidsVocabGenerator;
document.addEventListener('DOMContentLoaded', () => {
  console.log('📱 DOM 載入完成，初始化應用');
  kidsVocabGenerator = new KidsVocabularyGenerator();

  // 全域函數供 HTML 調用
  window.kidsVocabGenerator = kidsVocabGenerator;

  // iOS 特殊處理：添加全域點擊處理器
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    console.log('📱 檢測到 iOS 設備，添加特殊處理');

    // 為整個文檔添加觸控事件監聽
    document.addEventListener('touchstart', function (e) {
      const target = e.target;
      if (target.id === 'generateBtn' || target.id === 'generateBtnDesktop') {
        console.log('📱 iOS 觸控事件：生成按鈕被點擊');
        e.preventDefault();
        if (kidsVocabGenerator && !kidsVocabGenerator.isGenerating) {
          kidsVocabGenerator.generateImage();
        }
      }
    }, { passive: false });

    // 添加點擊事件作為備用
    document.addEventListener('click', function (e) {
      const target = e.target;
      if (target.id === 'generateBtn' || target.id === 'generateBtnDesktop') {
        console.log('📱 iOS 點擊事件：生成按鈕被點擊');
        e.preventDefault();
        if (kidsVocabGenerator && !kidsVocabGenerator.isGenerating) {
          kidsVocabGenerator.generateImage();
        }
      }
    });
  }
});

// 全域錯誤處理
window.addEventListener('error', function (e) {
  console.error('💥 全域錯誤:', e.error);
  if (kidsVocabGenerator) {
    kidsVocabGenerator.showError('發生未預期的錯誤，請重新整理頁面');
  }
});

window.addEventListener('unhandledrejection', function (e) {
  console.error('💥 Promise 錯誤:', e.reason);
  if (kidsVocabGenerator) {
    kidsVocabGenerator.showError('網路請求失敗，請檢查連線後重試');
  }
});