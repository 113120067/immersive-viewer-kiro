/**
 * Farm Game MVP - English Learning Game
 * 基於語音指令的農場遊戲
 */

class FarmGameMVP {
  constructor() {
    this.gameState = {
      gold: 100,
      plots: {
        1: { status: 'empty', crop: null, plantTime: null },
        2: { status: 'empty', crop: null, plantTime: null },
        3: { status: 'empty', crop: null, plantTime: null },
        4: { status: 'empty', crop: null, plantTime: null }
      },
      currentTask: 'plant_carrot',
      taskProgress: 0,
      isListening: false
    };

    this.vocabulary = {
      carrot: {
        word: 'carrot',
        phonetic: '/ˈkær.ət/',
        audio: null
      }
    };

    this.tasks = {
      plant_carrot: {
        instruction: 'Plant the carrot',
        expectedPhrases: ['plant the carrot', 'planting carrot', 'plant carrot'],
        action: 'plant',
        target: 'carrot'
      },
      harvest_carrot: {
        instruction: 'Harvest now',
        expectedPhrases: ['harvest now', 'harvest carrot', 'harvest the carrot'],
        action: 'harvest',
        target: 'carrot'
      }
    };

    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    
    this.init();
  }

  /**
   * 初始化遊戲
   */
  init() {
    this.setupSpeechRecognition();
    this.setupEventListeners();
    this.updateUI();
    this.speakInstruction('Welcome to Smart Farm! Plant the carrot to start learning.');
  }

  /**
   * 設置語音識別
   */
  setupSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      this.gameState.isListening = true;
      this.updateListeningUI();
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log('👂 Recognized:', transcript);
      
      document.getElementById('recognizedText').textContent = transcript;
      this.processVoiceCommand(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      this.gameState.isListening = false;
      this.updateListeningUI();
    };

    this.recognition.onend = () => {
      console.log('🔇 Speech recognition ended');
      this.gameState.isListening = false;
      this.updateListeningUI();
    };
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 語音控制按鈕
    document.getElementById('startListening').addEventListener('click', () => {
      this.startListening();
    });

    document.getElementById('stopListening').addEventListener('click', () => {
      this.stopListening();
    });

    // 播放單詞發音
    document.querySelectorAll('.play-word').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const word = e.target.dataset.word;
        this.speakWord(word);
      });
    });

    // 農場地塊點擊（備用操作）
    document.querySelectorAll('.farm-plot').forEach(plot => {
      plot.addEventListener('click', (e) => {
        const plotId = e.target.closest('.farm-plot').dataset.plot;
        console.log('🖱️ Clicked plot:', plotId);
        // 可以添加視覺提示，但主要操作還是通過語音
      });
    });
  }

  /**
   * 開始語音監聽
   */
  startListening() {
    if (!this.recognition) {
      alert('Speech recognition not available');
      return;
    }

    try {
      this.recognition.start();
      this.speakInstruction(this.tasks[this.gameState.currentTask].instruction);
    } catch (error) {
      console.error('Failed to start recognition:', error);
    }
  }

  /**
   * 停止語音監聽
   */
  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * 處理語音指令
   */
  processVoiceCommand(transcript) {
    const currentTask = this.tasks[this.gameState.currentTask];
    const score = this.calculatePronunciationScore(transcript, currentTask.expectedPhrases);
    
    document.getElementById('pronunciationScore').textContent = `${score}%`;

    if (score >= 60) {
      this.executeGameAction(currentTask.action, currentTask.target);
      this.speakFeedback(`Great! Score: ${score}%. Action completed.`);
    } else {
      this.speakFeedback(`Try again! Score: ${score}%. Say: ${currentTask.instruction}`);
    }
  }

  /**
   * 計算發音分數（簡化版）
   */
  calculatePronunciationScore(transcript, expectedPhrases) {
    let bestScore = 0;
    
    expectedPhrases.forEach(phrase => {
      const similarity = this.calculateSimilarity(transcript, phrase);
      bestScore = Math.max(bestScore, similarity);
    });

    return Math.round(bestScore * 100);
  }

  /**
   * 計算字符串相似度（簡化版）
   */
  calculateSimilarity(str1, str2) {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    
    let matches = 0;
    words2.forEach(word => {
      if (words1.some(w => w.includes(word) || word.includes(w))) {
        matches++;
      }
    });

    return matches / words2.length;
  }

  /**
   * 執行遊戲動作
   */
  executeGameAction(action, target) {
    if (action === 'plant' && target === 'carrot') {
      this.plantCarrot();
    } else if (action === 'harvest' && target === 'carrot') {
      this.harvestCarrot();
    }
  }

  /**
   * 種植胡蘿蔔
   */
  plantCarrot() {
    // 找到第一個空地塊
    const emptyPlot = Object.keys(this.gameState.plots).find(
      plotId => this.gameState.plots[plotId].status === 'empty'
    );

    if (emptyPlot) {
      this.gameState.plots[emptyPlot] = {
        status: 'growing',
        crop: 'carrot',
        plantTime: Date.now()
      };

      this.gameState.gold -= 10;
      this.gameState.taskProgress = 50;
      this.gameState.currentTask = 'harvest_carrot';

      // 3秒後成熟（演示用）
      setTimeout(() => {
        if (this.gameState.plots[emptyPlot].status === 'growing') {
          this.gameState.plots[emptyPlot].status = 'ready';
          this.updateUI();
          this.speakInstruction('Your carrot is ready! Say: Harvest now');
        }
      }, 3000);

      this.updateUI();
      console.log('🌱 Carrot planted in plot', emptyPlot);
    } else {
      this.speakFeedback('No empty plots available!');
    }
  }

  /**
   * 收穫胡蘿蔔
   */
  harvestCarrot() {
    const readyPlot = Object.keys(this.gameState.plots).find(
      plotId => this.gameState.plots[plotId].status === 'ready' && 
                this.gameState.plots[plotId].crop === 'carrot'
    );

    if (readyPlot) {
      this.gameState.plots[readyPlot] = {
        status: 'empty',
        crop: null,
        plantTime: null
      };

      this.gameState.gold += 30;
      this.gameState.taskProgress = 100;
      
      // 重置任務
      setTimeout(() => {
        this.gameState.currentTask = 'plant_carrot';
        this.gameState.taskProgress = 0;
        this.updateUI();
        this.speakInstruction('Well done! Plant another carrot to continue learning.');
      }, 2000);

      this.updateUI();
      console.log('🌾 Carrot harvested from plot', readyPlot);
    } else {
      this.speakFeedback('No carrots ready to harvest!');
    }
  }

  /**
   * 更新UI
   */
  updateUI() {
    // 更新金幣
    document.getElementById('goldAmount').textContent = this.gameState.gold;
    
    // 更新當前任務
    document.getElementById('currentTask').textContent = 
      this.tasks[this.gameState.currentTask].instruction;
    
    // 更新期望指令
    document.getElementById('expectedCommand').textContent = 
      `"${this.tasks[this.gameState.currentTask].instruction}"`;
    
    // 更新任務進度
    document.getElementById('taskProgress').style.width = 
      `${this.gameState.taskProgress}%`;
    
    // 更新農場地塊
    Object.keys(this.gameState.plots).forEach(plotId => {
      const plot = this.gameState.plots[plotId];
      const plotElement = document.querySelector(`[data-plot="${plotId}"]`);
      const statusElement = plotElement.querySelector('.plot-status');
      const plantBtn = plotElement.querySelector('.plant-btn');
      const harvestBtn = plotElement.querySelector('.harvest-btn');

      switch (plot.status) {
        case 'empty':
          statusElement.textContent = 'Empty';
          statusElement.className = 'plot-status text-muted';
          plantBtn.style.display = 'block';
          harvestBtn.style.display = 'none';
          break;
        case 'growing':
          statusElement.textContent = '🌱 Growing...';
          statusElement.className = 'plot-status text-warning';
          plantBtn.style.display = 'none';
          harvestBtn.style.display = 'none';
          break;
        case 'ready':
          statusElement.textContent = '🥕 Ready!';
          statusElement.className = 'plot-status text-success';
          plantBtn.style.display = 'none';
          harvestBtn.style.display = 'block';
          break;
      }
    });
  }

  /**
   * 更新語音監聽UI
   */
  updateListeningUI() {
    const startBtn = document.getElementById('startListening');
    const stopBtn = document.getElementById('stopListening');

    if (this.gameState.isListening) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      startBtn.innerHTML = '<i class="fas fa-microphone"></i> Listening...';
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      startBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Listening';
    }
  }

  /**
   * 語音播放指令
   */
  speakInstruction(text) {
    this.speak(text, 0.9, 1.0);
  }

  /**
   * 語音播放回饋
   */
  speakFeedback(text) {
    this.speak(text, 1.0, 1.1);
  }

  /**
   * 播放單詞
   */
  speakWord(word) {
    this.speak(word, 0.8, 0.9);
  }

  /**
   * 通用語音播放
   */
  speak(text, rate = 1.0, pitch = 1.0) {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 0.8;
    utterance.lang = 'en-US';

    this.synthesis.speak(utterance);
  }
}

// 初始化遊戲
let farmGame;
document.addEventListener('DOMContentLoaded', () => {
  farmGame = new FarmGameMVP();
});

export default FarmGameMVP;