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
    
    this.init();
  }

  /**
   * 初始化
   */
  async init() {
    try {
      // 直接載入功能，無需認證
      this.loadRecentWords();
      this.setupEventListeners();
      this.initializeSpeechFeatures();
      
      // 顯示歡迎訊息
      this.showWelcomeMessage();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showError('系統初始化失敗，請重新整理頁面');
    }
  }

  /**
   * 顯示歡迎訊息
   */
  showWelcomeMessage() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
      welcomeMessage.innerHTML = `
        <h5>👋 歡迎小朋友！</h5>
        <p class="mb-2">輸入英文單字或句子，我會幫你畫一張可愛的圖片來學習！</p>
        <p class="mb-0 small text-muted">✨ 完全免費使用，無需註冊登入</p>
      `;
      welcomeMessage.className = 'alert alert-success text-center mb-4';
    }
  }

  /**
   * 初始化語音功能
   */
  initializeSpeechFeatures() {
    // 檢查瀏覽器支援
    if (!this.speechSynthesis) {
      console.warn('瀏覽器不支援語音合成');
      document.getElementById('pronunciationToggle').disabled = true;
    }
    
    // 初始化語音識別
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-US';
      
      this.speechRecognition.onresult = (event) => {
        const result = event.results[0][0].transcript.toLowerCase().trim();
        this.handleSpeechResult(result);
      };
      
      this.speechRecognition.onerror = (event) => {
        this.handleSpeechError(event.error);
      };
      
      this.speechRecognition.onend = () => {
        this.isListening = false;
        this.updatePracticeUI();
      };
    } else {
      console.warn('瀏覽器不支援語音識別');
      document.getElementById('practiceToggle').disabled = true;
    }
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 表單提交
    const form = document.getElementById('simpleVocabForm');
    if (form) {
      console.log('✅ 找到表單，設置事件監聽器');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('📝 表單提交事件觸發');
        this.generateImage();
      });
    } else {
      console.error('❌ 找不到表單 #simpleVocabForm');
    }

    // 手機版輸入框 Enter 鍵
    const wordInput = document.getElementById('wordInput');
    if (wordInput) {
      wordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.generateImage();
        }
      });

      // 輸入框焦點效果
      wordInput.addEventListener('focus', () => {
        wordInput.style.borderColor = '#20c997';
      });

      wordInput.addEventListener('blur', () => {
        wordInput.style.borderColor = '#28a745';
      });
    }

    // 桌面版輸入框 Enter 鍵
    const wordInputDesktop = document.getElementById('wordInputDesktop');
    if (wordInputDesktop) {
      wordInputDesktop.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.generateImage();
        }
      });

      // 輸入框焦點效果
      wordInputDesktop.addEventListener('focus', () => {
        wordInputDesktop.style.borderColor = '#20c997';
      });

      wordInputDesktop.addEventListener('blur', () => {
        wordInputDesktop.style.borderColor = '#28a745';
      });
    }
    
    // 發音功能切換
    const pronunciationToggle = document.getElementById('pronunciationToggle');
    pronunciationToggle.addEventListener('change', () => {
      localStorage.setItem('kidsPronunciationEnabled', pronunciationToggle.checked);
    });
    
    // 練習功能切換
    const practiceToggle = document.getElementById('practiceToggle');
    practiceToggle.addEventListener('change', () => {
      const practiceBtn = document.getElementById('practiceBtn');
      const practiceResult = document.getElementById('practiceResult');
      
      if (practiceToggle.checked) {
        practiceBtn.style.display = 'block';
        practiceResult.style.display = 'block';
      } else {
        practiceBtn.style.display = 'none';
        practiceResult.style.display = 'none';
        this.stopListening();
      }
      
      localStorage.setItem('kidsPracticeEnabled', practiceToggle.checked);
    });
    
    // 發音按鈕
    const pronounceBtn = document.getElementById('pronounceBtn');
    pronounceBtn.addEventListener('click', () => {
      if (this.currentWord) {
        this.pronounceWord(this.currentWord);
      }
    });
    
    // 練習按鈕
    const practiceBtn = document.getElementById('practiceBtn');
    practiceBtn.addEventListener('click', () => {
      if (this.isListening) {
        this.stopListening();
      } else {
        this.startListening();
      }
    });
    
    // 語音速度滑桿
    const speechSpeedSlider = document.getElementById('speechSpeedSlider');
    speechSpeedSlider.addEventListener('input', () => {
      this.updateSpeedDisplay();
      localStorage.setItem('kidsSpeechSpeed', speechSpeedSlider.value);
    });
    
    // 載入保存的設定
    this.loadSpeechSettings();
  }

  /**
   * 生成圖片
   */
  async generateImage() {
    console.log('🎨 generateImage 方法被調用');
    if (this.isGenerating) {
      console.log('⚠️ 正在生成中，跳過');
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
    
    console.log('獲取到的輸入值:', input);

    // 驗證輸入
    if (!input) {
      this.showError('請輸入英文單字或句子！');
      return;
    }

    if (input.length > 100) {
      this.showError('輸入太長了！請輸入簡短的英文單字或句子。');
      return;
    }

    // 檢查是否包含中文或特殊字符（允許基本標點符號）
    if (!/^[a-zA-Z\s.,!?'-]+$/.test(input)) {
      this.showError('請只輸入英文字母和基本標點符號！');
      return;
    }

    try {
      this.isGenerating = true;
      this.showGenerationStatus(true);
      this.hideError();
      this.hideResult();

      // 直接使用 Pollinations 免費服務，無需後端 API
      console.log('🔗 開始生成 Pollinations URL');
      const imageUrl = this.generatePollinationsUrl(input);
      console.log('🔗 生成的圖片 URL:', imageUrl);
      
      // 模擬 API 響應格式
      const data = {
        success: true,
        imageUrl: imageUrl,
        provider: 'pollinations'
      };

      console.log('📊 準備顯示結果:', data);
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
      this.showGenerationStatus(false);
    }
  }

  /**
   * 生成適合小學生的提示詞
   */
  generateKidsPrompt(input) {
    // 判斷是單字還是句子
    const wordCount = input.trim().split(/\s+/).length;
    
    if (wordCount === 1) {
      // 單字：使用簡單的卡通風格
      return `cute cartoon ${input}`;
    } else {
      // 句子：生成場景圖片
      return `cute cartoon illustration of "${input}" for kids, colorful, simple, educational`;
    }
  }

  /**
   * 直接生成 Pollinations 圖片 URL
   */
  generatePollinationsUrl(input) {
    const prompt = this.generateKidsPrompt(input);
    const encodedPrompt = encodeURIComponent(prompt);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&enhance=true`;
  }

  /**
   * 顯示結果
   */
  showResult(data, input) {
    console.log('🎯 showResult called with:', { input, imageUrl: data.imageUrl });
    
    const imageElement = document.getElementById('generatedImage');
    const wordTitleElement = document.getElementById('wordTitle');
    const wordMeaningElement = document.getElementById('wordMeaning');
    const aiProviderElement = document.getElementById('aiProvider');
    const downloadLink = document.getElementById('downloadLink');
    const resultContainer = document.getElementById('imageResult');
    const placeholder = document.getElementById('placeholderContent');

    console.log('🎯 DOM elements found:', {
      imageElement: !!imageElement,
      wordTitleElement: !!wordTitleElement,
      wordMeaningElement: !!wordMeaningElement,
      aiProviderElement: !!aiProviderElement,
      downloadLink: !!downloadLink,
      resultContainer: !!resultContainer,
      placeholder: !!placeholder
    });

    // 檢查必要元素是否存在
    if (!imageElement || !resultContainer || !placeholder) {
      console.error('❌ 缺少必要的 DOM 元素');
      this.showError('頁面元素載入有問題，請重新整理頁面');
      return;
    }

    // 儲存當前輸入（單字或句子）
    this.currentWord = input;
    
    // 使用延遲載入策略，圖片載入完成後才發音
    this.loadImageWithFallback(imageElement, input, data.imageUrl);

    // 設置內容資訊
    const wordCount = input.trim().split(/\s+/).length;
    if (wordCount === 1) {
      // 單字顯示
      wordTitleElement.textContent = input.toUpperCase();
      wordMeaningElement.textContent = this.getSimpleMeaning(input);
    } else {
      // 句子顯示
      wordTitleElement.textContent = input;
      wordTitleElement.style.fontSize = '1.2em'; // 句子用較小字體
      wordMeaningElement.textContent = this.getSentenceDescription(input);
    }

    // 設置 AI 提供商（顯示為友善的免費 AI）
    aiProviderElement.innerHTML = '🌸 由免費 AI 生成';

    // 設置下載連結
    const filename = input.length > 20 ? input.substring(0, 20) + '...' : input;
    downloadLink.href = data.imageUrl;
    downloadLink.download = `${filename}-圖片.png`;

    // 顯示結果
    placeholder.style.display = 'none';
    resultContainer.style.display = 'block';

    // 清空輸入框（手機版和桌面版）
    const mobileInputClear = document.getElementById('wordInput');
    const desktopInputClear = document.getElementById('wordInputDesktop');
    if (mobileInputClear) mobileInputClear.value = '';
    if (desktopInputClear) desktopInputClear.value = '';

    const contentType = wordCount === 1 ? '單字' : '句子';
    this.showSuccess(`太棒了！"${input}" 的圖片生成完成！`);
  }

  /**
   * 使用多重備用策略載入圖片
   */
  loadImageWithFallback(imageElement, input, originalUrl) {
    console.log('🎯 Loading image with fallback strategy');
    
    // 為句子和單字生成不同的備用 URL
    const wordCount = input.trim().split(/\s+/).length;
    let urls;
    
    if (wordCount === 1) {
      // 單字的備用策略
      urls = [
        originalUrl, // 原始 URL
        `https://image.pollinations.ai/prompt/${encodeURIComponent('cute cartoon ' + input)}`, // 簡化版本
        `https://image.pollinations.ai/prompt/${encodeURIComponent(input)}`, // 最簡版本
      ];
    } else {
      // 句子的備用策略
      urls = [
        originalUrl, // 原始 URL
        `https://image.pollinations.ai/prompt/${encodeURIComponent('cartoon scene ' + input)}`, // 場景版本
        `https://image.pollinations.ai/prompt/${encodeURIComponent(input)}`, // 最簡版本
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
      pronounceBtn.innerHTML = '<i class="fas fa-volume-up me-1"></i>🔊 發音中...';
      pronounceBtn.disabled = true;
    };
    
    utterance.onend = () => {
      console.log('✅ 發音完成');
      const pronounceBtn = document.getElementById('pronounceBtn');
      pronounceBtn.innerHTML = '<i class="fas fa-volume-up me-1"></i>🔊 發音';
      pronounceBtn.disabled = false;
    };
    
    utterance.onerror = (error) => {
      console.error('❌ 發音錯誤:', error);
      const pronounceBtn = document.getElementById('pronounceBtn');
      pronounceBtn.innerHTML = '<i class="fas fa-volume-up me-1"></i>🔊 發音';
      pronounceBtn.disabled = false;
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
  kidsVocabGenerator = new KidsVocabularyGenerator();
  
  // 全域函數供 HTML 調用
  window.kidsVocabGenerator = kidsVocabGenerator;
});