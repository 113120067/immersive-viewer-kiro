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

    // GitHub Storage Config
    this.githubConfig = null;

    this.voices = [];
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
    this.loadGitHubConfig();
    this.showWelcomeMessage();
    this.initializeSpeechFeatures();
    this.setupEventListeners();
    this.loadRecentWords();
    this.loadSpeechSettings();
  }

  loadGitHubConfig() {
    const owner = document.getElementById('githubOwner')?.value;
    const repo = document.getElementById('githubRepo')?.value;
    const path = document.getElementById('githubPath')?.value;

    if (owner && repo) {
      this.githubConfig = { owner, repo, path };
      console.log('✅ GitHub Storage Configured:', this.githubConfig);
    }
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
    if ('speechSynthesis' in window) {
      // Chrome 載入語音是異步的，需要監聽改變
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
        console.log(`🎤 語音包已載入: ${this.voices.length} 個語音可用`);
      };
      // 嘗試立即獲取
      this.voices = window.speechSynthesis.getVoices();
    }

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

  async calculateHash(message) {
    if (window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message.trim().toLowerCase());
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.substring(0, 12);
    } else {
      // Fallback
      let hash = 0;
      const str = message.toLowerCase().trim();
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).substring(0, 12);
    }
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

    if (!/^[a-zA-Z0-9\s.,!?'"’“”;:()\-]+$/.test(input)) {
      this.showError('請只輸入英文、數字和常見標點符號！');
      return;
    }

    if (!/[a-zA-Z]/.test(input)) {
      this.showError('請至少包含一個英文字母喔！');
      return;
    }

    this.isGenerating = true;
    this.showGenerationStatus(true);
    this.hideError();
    this.hideResult();

    // 開始 15 秒冷卻倒數 (預設)
    this.startCooldown();

    try {
      // ==========================================
      // GitHub Storage Logic Check
      // ==========================================
      if (this.githubConfig) {
        const hash = await this.calculateHash(input);
        // GitHub Pages URL
        // https://{owner}.github.io/{repo}/{path}/{hash}.jpg
        const githubUrl = `https://${this.githubConfig.owner.toLowerCase()}.github.io/${this.githubConfig.repo}/${this.githubConfig.path}/${hash}.jpg`;

        console.log(`🔍 Checking GitHub Pages for: ${input} (${hash}) -> ${githubUrl}`);

        try {
          // Check if image exists
          const checkRes = await fetch(githubUrl, { method: 'HEAD' });
          if (checkRes.ok) {
            console.log('✅ GitHub Cache Hit!');
            this.showResult({ imageUrl: githubUrl, provider: 'github' }, input);

            // 自動發音
            // 自動發音 - 已由 showResult 處理


            // 快取命中，快速冷卻
            this.quickCooldown();
            this.isGenerating = false;
            this.showGenerationStatus(false);
            return; // Done!
          }
        } catch (e) {
          console.log('⚠️ GitHub check failed or not found, generating new...');
        }

        // If not found, call Backend to Generate & Save
        console.log('🚀 Requesting backend generation...');
        try {
          const backendRes = await fetch('/kids-vocabulary/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: input })
          });
          const backendData = await backendRes.json();

          if (backendData.success) {
            console.log('✅ Backend generation success');
            this.showResult({ imageUrl: backendData.image, provider: 'backend' }, input);
            this.addToRecentWords(input, backendData.image);

            // 自動發音
            // 自動發音 - 已由 showResult 處理


            this.isGenerating = false;
            this.showGenerationStatus(false);
            return; // Done!
          } else {
            throw new Error(backendData.error || 'Backend generation failed');
          }
        } catch (backendErr) {
          console.error('❌ Backend generation error:', backendErr);
          // Fallback to client-side direct Pollinations if backend fails
          this.showError('伺服器忙碌中，嘗試使用備用線路...');
        }
      }

      // ==========================================
      // Fallback: Client-side Generation (Original Logic)
      // ==========================================
      console.log('🔗 使用前端備用生成邏輯');
      const imageUrl = this.generatePollinationsUrl(input);
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
      this.showGenerationStatus(false);
    }
  }

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

  quickCooldown() {
    if (this.isCoolingDown) {
      this.cooldownSeconds = 3;
      this.showSuccess('⚡ 圖片秒開！已為您加速冷卻時間！');
      const btnMobile = document.getElementById('generateBtn');
      const btnDesktop = document.getElementById('generateBtnDesktop');
      const text = `⚡ 速通! ${this.cooldownSeconds}s`;
      if (btnMobile) btnMobile.innerHTML = text;
      if (btnDesktop) btnDesktop.innerHTML = text;
    }
  }

  generateKidsPrompt(input) {
    const safeInput = input.replace(/[^\w\s.,!?'-]/gi, '');
    // Enhanced Safety Prompt
    return `cute cartoon illustration of ${safeInput}, safe for kids, G-rated, simple vector art, vibrant colors, for primary school educational material, white background, high quality, no guns, no blood, no violence, no nudity`;
  }

  async reportImage(word) {
    if (!confirm(`您確定要檢舉 "${word}" 的圖片嗎？\n\n如果這張圖片不適合小朋友，我們會進行審核與處理。`)) return;

    const reportBtn = document.getElementById('reportImageBtn');
    if (reportBtn) {
      reportBtn.disabled = true;
      reportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 處理中...';
    }

    try {
      const res = await fetch('/kids-vocabulary/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word })
      });
      const data = await res.json();

      if (data.success) {
        if (data.status === 'banned') {
          this.showSuccess('檢舉成功！該圖片已被刪除，下次將生成新圖片。');
          // Hide the image immediately
          const imageElement = document.getElementById('generatedImage');
          if (imageElement) imageElement.style.display = 'none';
        } else {
          this.showSuccess('感謝回報！我們會記錄您的意見。');
        }
      } else {
        if (data.message) this.showError(data.message);
        else this.showError('檢舉失敗，請稍後再試');
      }
    } catch (e) {
      console.error('Report failed:', e);
      this.showError('網路發生錯誤');
    } finally {
      if (reportBtn) {
        reportBtn.innerHTML = '<i class="fas fa-flag"></i> 已檢舉';
        // Keep disabled to prevent spam
      }
    }
  }

  generateSeed(input) {
    let hash = 0;
    const str = input.toLowerCase().trim();
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  generatePollinationsUrl(input) {
    const prompt = this.generateKidsPrompt(input);
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = this.generateSeed(input);
    const negativePrompt = encodeURIComponent('nudity, violence, blood, guns, weapons, adult content, text, watermark');
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&enhance=true&seed=${seed}&nologo=true&negative=${negativePrompt}`;
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
    this.isLoadingImage = true;
    this.updateButtonState();

    console.log('🖼️ 開始載入圖片:', data.imageUrl);
    const startTime = Date.now();
    let imageLoadTimeout;
    let retryCount = 0;
    const maxRetries = 3;

    const loadImage = (url) => {
      console.log(`🔄 嘗試載入圖片 (第 ${retryCount + 1} 次):`, url);
      imageElement.onload = () => {
        const loadTime = Date.now() - startTime;
        console.log(`✅ 圖片載入成功，耗時: ${loadTime}ms`);
        this.isLoadingImage = false;
        this.updateButtonState();
        if (imageLoadTimeout) clearTimeout(imageLoadTimeout);
        this.handlePronunciation(input);

        if (data.provider === 'github') {
          this.showSuccess(`太棒了！找到了 "${input}" 的圖書館藏書！`);
        } else {
          this.showSuccess(`太棒了！"${input}" 的圖片生成完成！`);
        }

        if (loadTime < 3000 || data.provider === 'github' || data.provider === 'backend') {
          console.log('⚡ 快取命中或後端生成！觸發快速冷卻');
          this.quickCooldown();
        }
      };

      imageElement.onerror = () => {
        if (imageLoadTimeout) clearTimeout(imageLoadTimeout);
        if (retryCount < maxRetries && data.provider !== 'backend') {
          retryCount++;
          setTimeout(() => loadImage(url), 2000 * retryCount);
        } else {
          this.isLoadingImage = false;
          this.updateButtonState();
          imageElement.alt = `${input} 的圖片載入失敗`;
          this.showError('圖片載入失敗，請重試！');
        }
      };

      imageLoadTimeout = setTimeout(() => {
        if (retryCount < maxRetries) {
          // Retry logic handled by onerror for simplicity here or could trigger reload
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

    if (aiProviderElement) {
      if (data.provider === 'github') aiProviderElement.innerHTML = '<i class="fab fa-github"></i> 圖書館藏書';
      else if (data.provider === 'backend') aiProviderElement.innerHTML = '<i class="fas fa-server"></i> 雲端生成';
      else aiProviderElement.innerHTML = '<i class="fas fa-robot"></i> AI 即時運算';

      // Remove existing report button if any
      const existingBtn = document.getElementById('reportImageBtn');
      if (existingBtn) existingBtn.remove();

      // Add Report Button
      const reportBtn = document.createElement('button');
      reportBtn.id = 'reportImageBtn';
      reportBtn.className = 'btn btn-outline-danger btn-sm ms-2';
      reportBtn.innerHTML = '<i class="fas fa-flag"></i> 檢舉';
      reportBtn.title = '這張圖片不合適？點擊檢舉';
      reportBtn.onclick = () => this.reportImage(input);
      aiProviderElement.parentNode.appendChild(reportBtn);
    }

    const filename = input.length > 20 ? input.substring(0, 20) + '...' : input;
    downloadLink.href = data.imageUrl;
    downloadLink.download = `${filename}-圖片.jpg`;

    placeholder.style.display = 'none';
    resultContainer.style.display = 'block';

    const mobileInputClear = document.getElementById('wordInput');
    const desktopInputClear = document.getElementById('wordInputDesktop');
    if (mobileInputClear) mobileInputClear.value = '';
    if (desktopInputClear) desktopInputClear.value = '';
  }

  showImagePlaceholder(imageElement, input) {
    document.getElementById('imageResult').style.display = 'none';
    document.getElementById('placeholderContent').style.display = 'block';
  }

  hideResult() {
    document.getElementById('imageResult').style.display = 'none';
    document.getElementById('placeholderContent').style.display = 'block';
  }

  showError(message) {
    const errorElement = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => { this.hideError(); }, 5000);
  }

  hideError() {
    document.getElementById('errorMessage').style.display = 'none';
  }

  showSuccess(message) {
    const successAlert = document.createElement('div');
    successAlert.className = 'alert alert-success alert-dismissible fade show mt-3 text-center';
    successAlert.innerHTML = `<i class="fas fa-check-circle me-2"></i>${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    const container = document.querySelector('.card-body');
    container.insertBefore(successAlert, container.firstChild);
    setTimeout(() => { if (successAlert.parentNode) successAlert.remove(); }, 3000);
  }

  loadSpeechSettings() {
    const pronunciationEnabled = localStorage.getItem('kidsPronunciationEnabled');
    const practiceEnabled = localStorage.getItem('kidsPracticeEnabled');
    const speechSpeed = localStorage.getItem('kidsSpeechSpeed');

    if (pronunciationEnabled !== null) document.getElementById('pronunciationToggle').checked = pronunciationEnabled === 'true';
    if (practiceEnabled !== null) {
      document.getElementById('practiceToggle').checked = practiceEnabled === 'true';
      document.getElementById('practiceToggle').dispatchEvent(new Event('change'));
    }
    if (speechSpeed !== null) document.getElementById('speechSpeedSlider').value = speechSpeed;
    this.updateSpeedDisplay();
  }

  updateSpeedDisplay() {
    const slider = document.getElementById('speechSpeedSlider');
    const speedValue = document.getElementById('speedValue');
    const speed = parseFloat(slider.value);
    let speedText = '';
    if (speed <= 0.6) speedText = '(很慢)';
    else if (speed <= 0.8) speedText = '(慢)';
    else if (speed <= 1.0) speedText = '(正常)';
    else if (speed <= 1.3) speedText = '(快)';
    else speedText = '(很快)';
    speedValue.textContent = speedText;
  }

  handlePronunciation(input) {
    const pronunciationEnabled = document.getElementById('pronunciationToggle').checked;
    if (pronunciationEnabled && this.speechSynthesis) {
      setTimeout(() => { this.pronounceWord(input); }, 1000);
    }
  }

  pronounceWord(input) {
    if (!this.speechSynthesis) {
      this.showError('您的瀏覽器不支援語音功能');
      return;
    }

    console.log(`🔊 準備發音: "${input}"`);

    // 確保語音列表已載入
    if (this.voices.length === 0) {
      this.voices = this.speechSynthesis.getVoices();
      console.log('🎤 重新嘗試獲取語音列表:', this.voices.length);
    }

    this.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(input);
    utterance.lang = 'en-US';

    const speedSlider = document.getElementById('speechSpeedSlider');
    const userSpeed = speedSlider ? parseFloat(speedSlider.value) : 0.8;
    utterance.rate = userSpeed;
    utterance.pitch = 1.1;
    utterance.volume = 1.0; // 確保最大音量

    // 尋找最佳英語聲音
    let englishVoice = null;

    // 1. 優先找 Google US English (品質較好)
    englishVoice = this.voices.find(v => v.name.includes('Google US English'));

    // 2. 其次找任何包含 Female 的英語
    if (!englishVoice) {
      englishVoice = this.voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'));
    }

    // 3. 最後找任何英語
    if (!englishVoice) {
      englishVoice = this.voices.find(v => v.lang.startsWith('en'));
    }

    if (englishVoice) {
      utterance.voice = englishVoice;
      console.log(`🗣️ 使用語音: ${englishVoice.name}`);
    } else {
      console.warn('⚠️ 找不到英語語音，使用預設語音');
    }

    utterance.onstart = () => {
      console.log('✅ 發音開始');
      const pronounceBtn = document.getElementById('pronounceBtn');
      if (pronounceBtn) {
        pronounceBtn.innerHTML = '<i class="fas fa-volume-up fa-beat"></i>';
        pronounceBtn.disabled = true;
        pronounceBtn.classList.remove('btn-primary');
        pronounceBtn.classList.add('btn-success');
      }
    };

    utterance.onend = () => {
      console.log('✅ 發音結束');
      const pronounceBtn = document.getElementById('pronounceBtn');
      if (pronounceBtn) {
        pronounceBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        pronounceBtn.disabled = false;
        pronounceBtn.classList.add('btn-primary');
        pronounceBtn.classList.remove('btn-success');
      }
    };

    utterance.onerror = (error) => {
      console.error('❌ 發音錯誤:', error);
      // 詳細錯誤記錄
      if (error.error === 'not-allowed') {
        console.error('⚠️ 發音被瀏覽器阻擋 (Autoplay Policy). 使用者必須先與頁面互動。');
      }

      const pronounceBtn = document.getElementById('pronounceBtn');
      if (pronounceBtn) {
        pronounceBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        pronounceBtn.disabled = false;
        pronounceBtn.classList.add('btn-primary');
        pronounceBtn.classList.remove('btn-success');
      }
    };

    try {
      this.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('❌ speak() 方法呼叫失敗:', e);
    }
  }

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

  stopListening() {
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop();
      this.isListening = false;
      this.updatePracticeUI();
    }
  }

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

  handleSpeechResult(result) {
    const practiceText = document.getElementById('practiceText');
    const targetInput = this.currentWord.toLowerCase();
    const wordCount = this.currentWord.trim().split(/\s+/).length;
    let similarity;
    if (wordCount === 1) {
      similarity = this.calculateSimilarity(result, targetInput);
    } else {
      const targetWords = targetInput.split(/\s+/);
      const resultWords = result.split(/\s+/);
      const matchedWords = targetWords.filter(word => resultWords.some(rWord => this.calculateSimilarity(rWord, word) > 0.7));
      similarity = matchedWords.length / targetWords.length;
    }
    if (similarity > 0.7 || result === targetInput) {
      practiceText.innerHTML = `<i class="fas fa-check-circle text-success me-1"></i><strong>太棒了！</strong> 您說的是 "${result}"，發音很棒！`;
      practiceText.parentElement.className = 'alert alert-success small mb-0';
      this.playSuccessSound();
    } else {
      const contentType = wordCount === 1 ? '單字' : '句子';
      practiceText.innerHTML = `<i class="fas fa-exclamation-triangle text-warning me-1"></i>您說的是 "${result}"，目標${contentType}是 "${this.currentWord}"。<br><small>再試一次，聽聽正確發音！</small>`;
      practiceText.parentElement.className = 'alert alert-warning small mb-0';
      setTimeout(() => { this.pronounceWord(this.currentWord); }, 1000);
    }
  }

  handleSpeechError(error) {
    const practiceText = document.getElementById('practiceText');
    let errorMessage = '語音識別發生錯誤';
    switch (error) {
      case 'no-speech': errorMessage = '沒有檢測到語音，請再試一次'; break;
      case 'audio-capture': errorMessage = '無法訪問麥克風，請檢查權限設定'; break;
      case 'not-allowed': errorMessage = '麥克風權限被拒絕，請允許使用麥克風'; break;
      case 'network': errorMessage = '網路連線問題，請檢查網路'; break;
    }
    practiceText.innerHTML = `<i class="fas fa-exclamation-circle text-danger me-1"></i>${errorMessage}`;
    practiceText.parentElement.className = 'alert alert-danger small mb-0';
    console.error('🎤 語音識別錯誤:', error);
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
        else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[str2.length][str1.length];
  }

  playSuccessSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) { console.log('無法播放音效:', error); }
  }

  getSimpleMeaning(word) {
    const meanings = {
      'apple': '蘋果', 'cat': '貓', 'dog': '狗', 'book': '書', 'house': '房子',
      'car': '汽車', 'tree': '樹', 'flower': '花', 'sun': '太陽', 'moon': '月亮',
      'star': '星星', 'water': '水', 'fire': '火', 'bird': '鳥', 'fish': '魚',
      'happy': '快樂的', 'sad': '傷心的', 'big': '大的', 'small': '小的',
      'red': '紅色', 'blue': '藍色', 'green': '綠色', 'yellow': '黃色',
      'run': '跑', 'jump': '跳', 'eat': '吃', 'sleep': '睡覺', 'play': '玩',
      'school': '學校', 'teacher': '老師', 'student': '學生', 'friend': '朋友', 'family': '家庭'
    };
    return meanings[word.toLowerCase()] || '英文單字';
  }

  getSentenceDescription(sentence) {
    const lower = sentence.toLowerCase();
    if (lower.includes('i am') || lower.includes("i'm")) return '自我介紹句型';
    if (lower.includes('i like') || lower.includes('i love')) return '表達喜好句型';
    if (lower.includes('how are you')) return '問候語句型';
    if (lower.includes('what') || lower.includes('where')) return '疑問句句型';
    return '英文句子';
  }

  addToRecentWords(input, imageUrl) {
    const wordCount = input.trim().split(/\s+/).length;
    let storageUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('data:image')) storageUrl = '';
    const wordItem = {
      word: input,
      meaning: wordCount === 1 ? this.getSimpleMeaning(input) : this.getSentenceDescription(input),
      imageUrl: storageUrl,
      timestamp: new Date().toISOString(),
      type: wordCount === 1 ? 'word' : 'sentence'
    };
    this.recentWords = this.recentWords.filter(item => item.word.toLowerCase() !== input.toLowerCase());
    this.recentWords.unshift(wordItem);
    if (this.recentWords.length > 10) this.recentWords = this.recentWords.slice(0, 10);
    localStorage.setItem('kidsRecentWords', JSON.stringify(this.recentWords));
    this.loadRecentWords();
  }

  loadRecentWords() {
    const recentWordsElement = document.getElementById('recentWords');
    if (!recentWordsElement) return;
    if (this.recentWords.length === 0) {
      recentWordsElement.innerHTML = '<p class="text-muted text-center">還沒有學過的內容</p>';
      return;
    }
    const wordsHTML = this.recentWords.slice(0, 5).map(item => {
      const displayText = item.word.length > 12 ? item.word.substring(0, 12) + '...' : item.word;
      const typeIcon = item.type === 'sentence' ? '💬' : '📝';
      return `<div class="recent-word-item" onclick="kidsVocabGenerator.loadWord('${item.word.replace(/'/g, "\\'")}')"><div class="d-flex align-items-center"><span class="me-2">${typeIcon}</span><div class="flex-grow-1"><div class="fw-bold">${displayText}</div><small class="text-muted">${item.meaning}</small></div></div></div>`;
    }).join('');
    recentWordsElement.innerHTML = wordsHTML;
  }

  loadWord(input) {
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

  showGenerationStatus(show) {
    const statusElement = document.getElementById('generationStatus');
    const generateBtnMobile = document.getElementById('generateBtn');
    const generateBtnDesktop = document.getElementById('generateBtnDesktop');
    if (show) {
      if (statusElement) statusElement.style.display = 'block';
      if (generateBtnMobile) {
        generateBtnMobile.disabled = true;
        generateBtnMobile.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
      }
      if (generateBtnDesktop) {
        generateBtnDesktop.disabled = true;
        generateBtnDesktop.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
      }
    } else {
      if (statusElement) statusElement.style.display = 'none';
      if (generateBtnMobile) {
        generateBtnMobile.disabled = false;
        generateBtnMobile.innerHTML = '🎨 生成圖片！';
      }
      if (generateBtnDesktop) {
        generateBtnDesktop.disabled = false;
        generateBtnDesktop.innerHTML = '<i class="fas fa-magic"></i> 生成圖片！';
      }
    }
  }
}

// 初始化
let kidsVocabGenerator;
document.addEventListener('DOMContentLoaded', () => {
  console.log('📱 DOM 載入完成，初始化應用');
  kidsVocabGenerator = new KidsVocabularyGenerator();
  window.kidsVocabGenerator = kidsVocabGenerator;

  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    console.log('📱 檢測到 iOS 設備，添加特殊處理');
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