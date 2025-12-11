/**
 * Vision Uploader Client
 * Handles image upload, analysis, and result display
 */

// State management
let currentUserId = null;

/**
 * Initialize the vision uploader (async)
 */
async function initVisionUploader() {
  console.log('🚀 Initializing Vision Uploader');
  
  try {
    // Wait to get user ID (async)
    currentUserId = await getUserId();
    console.log('✅ Current User ID:', currentUserId);
  } catch (error) {
    console.error('❌ Failed to get user ID:', error);
    // Use fallback ID
    currentUserId = 'anonymous-' + Date.now();
  }
  
  // Set up event listeners
  const fileInput = document.getElementById('imageInput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const ocrOnlyBtn = document.getElementById('ocrOnlyBtn');
  
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
    console.log('✅ File input listener attached');
  } else {
    console.warn('⚠️ imageInput element not found');
  }
  
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => uploadAndAnalyze('analyze'));
    console.log('✅ Analyze button listener attached');
  } else {
    console.warn('⚠️ analyzeBtn element not found');
  }
  
  if (ocrOnlyBtn) {
    ocrOnlyBtn.addEventListener('click', () => uploadAndAnalyze('ocr-only'));
    console.log('✅ OCR only button listener attached');
  } else {
    console.warn('⚠️ ocrOnlyBtn element not found');
  }
  
  // Load recent analyses
  await loadRecentAnalyses();
  
  console.log('✅ Vision Uploader initialized successfully');
}

/**
 * Get user ID (async - waits for Firebase Auth)
 */
async function getUserId() {
  try {
    // Wait for Firebase initialization (if exists)
    if (window.firebaseReady) {
      console.log('⏳ Waiting for Firebase initialization...');
      await window.firebaseReady;
      console.log('✅ Firebase ready');
    }
    
    // Try to get current user from Firebase Auth
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      const uid = window.firebaseAuth.currentUser.uid;
      console.log('👤 Using Firebase Auth user ID:', uid);
      return uid;
    } else {
      console.log('👤 No Firebase user authenticated, using fallback');
    }
  } catch (error) {
    console.warn('⚠️ Firebase Auth not available:', error.message);
  }
  
  // Fallback: use localStorage
  let userId = localStorage.getItem('visionUserId');
  if (!userId) {
    userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('visionUserId', userId);
    console.log('🆔 Generated new user ID:', userId);
  } else {
    console.log('🆔 Using cached user ID:', userId);
  }
  return userId;
}

/**
 * Handle file selection and preview
 */
function handleFileSelect(event) {
  const file = event.target.files[0];
  const preview = document.getElementById('imagePreview');
  const error = document.getElementById('uploadError');
  
  // Clear previous error
  if (error) {
    error.style.display = 'none';
  }
  
  if (!file) {
    if (preview) {
      preview.innerHTML = '';
    }
    return;
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/bmp'];
  if (!allowedTypes.includes(file.type)) {
    showError('Please select a valid image file (JPEG, PNG, GIF, BMP)');
    return;
  }
  
  // Validate file size (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    showError('File size must be less than 5MB');
    return;
  }
  
  // Show preview
  const reader = new FileReader();
  reader.onload = function(e) {
    if (preview) {
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
        <p class="mt-2"><strong>${file.name}</strong> (${(file.size / 1024).toFixed(2)} KB)</p>
      `;
    }
  };
  reader.readAsDataURL(file);
}

/**
 * Upload and analyze image
 */
async function uploadAndAnalyze(endpoint) {
  const fileInput = document.getElementById('imageInput');
  const file = fileInput?.files[0];
  
  if (!file) {
    showError('Please select an image file');
    return;
  }
  
  // Show loading state
  showLoading(true);
  clearResults();
  
  try {
    // Create FormData
    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', currentUserId);
    
    // Upload and analyze
    const response = await fetch(`/vision/${endpoint}`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Analysis failed');
    }
    
    // Display results
    displayResults(data, endpoint);
    
    // Reload recent analyses
    loadRecentAnalyses();
    
  } catch (error) {
    console.error('Upload error:', error);
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Display analysis results
 */
function displayResults(data, endpoint) {
  const resultsDiv = document.getElementById('analysisResults');
  if (!resultsDiv) return;
  
  resultsDiv.style.display = 'block';
  
  let html = '<div class="card"><div class="card-body">';
  
  // Image URL
  if (data.imageUrl) {
    html += `
      <div class="mb-3">
        <h5>Analyzed Image</h5>
        <img src="${data.imageUrl}" alt="Analyzed" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
      </div>
    `;
  }
  
  if (endpoint === 'analyze' && data.result) {
    // OCR Results
    if (data.result.ocr) {
      html += '<div class="mb-4">';
      html += '<h5><i class="fas fa-font"></i> OCR Text Recognition</h5>';
      html += `<div class="alert alert-info"><strong>Language:</strong> ${data.result.ocr.language || 'Unknown'}</div>`;
      html += '<div class="card"><div class="card-body">';
      html += `<pre style="white-space: pre-wrap; max-height: 200px; overflow-y: auto;">${escapeHtml(data.result.ocr.text || 'No text detected')}</pre>`;
      html += '</div></div>';
      html += `<p class="text-muted mt-2">Lines detected: ${data.result.ocr.lines?.length || 0}</p>`;
      html += '</div>';
    }
    
    // Tags
    if (data.result.analysis?.tags) {
      html += '<div class="mb-4">';
      html += '<h5><i class="fas fa-tags"></i> Smart Tags</h5>';
      html += '<div>';
      data.result.analysis.tags.slice(0, 10).forEach(tag => {
        const confidence = (tag.confidence * 100).toFixed(1);
        html += `<span class="badge bg-primary me-2 mb-2">${escapeHtml(tag.name)} (${confidence}%)</span>`;
      });
      html += '</div></div>';
    }
    
    // Description
    if (data.result.analysis?.description?.captions) {
      html += '<div class="mb-4">';
      html += '<h5><i class="fas fa-comment-alt"></i> AI Description</h5>';
      data.result.analysis.description.captions.forEach(caption => {
        const confidence = (caption.confidence * 100).toFixed(1);
        html += `<div class="alert alert-success">${escapeHtml(caption.text)} <span class="badge bg-success">${confidence}%</span></div>`;
      });
      html += '</div>';
    }
    
    // Objects
    if (data.result.analysis?.objects && data.result.analysis.objects.length > 0) {
      html += '<div class="mb-4">';
      html += '<h5><i class="fas fa-cube"></i> Detected Objects</h5>';
      html += '<ul class="list-group">';
      data.result.analysis.objects.forEach(obj => {
        const confidence = (obj.confidence * 100).toFixed(1);
        html += `<li class="list-group-item">${escapeHtml(obj.name)} <span class="badge bg-info">${confidence}%</span></li>`;
      });
      html += '</ul></div>';
    }
    
    // Colors
    if (data.result.analysis?.colors) {
      html += '<div class="mb-4">';
      html += '<h5><i class="fas fa-palette"></i> Color Analysis</h5>';
      html += '<div>';
      if (data.result.analysis.colors.dominant) {
        html += '<p><strong>Dominant Colors:</strong> ';
        data.result.analysis.colors.dominant.forEach(color => {
          html += `<span class="badge me-1" style="background-color: ${color}; color: white;">${color}</span>`;
        });
        html += '</p>';
      }
      if (data.result.analysis.colors.accent) {
        html += `<p><strong>Accent Color:</strong> <span class="badge" style="background-color: ${data.result.analysis.colors.accent}; color: white;">${data.result.analysis.colors.accent}</span></p>`;
      }
      html += '</div></div>';
    }
  } else if (endpoint === 'ocr-only' && data.result) {
    // OCR only results
    html += '<div class="mb-4">';
    html += '<h5><i class="fas fa-font"></i> OCR Text Recognition</h5>';
    html += `<div class="alert alert-info"><strong>Language:</strong> ${data.result.language || 'Unknown'}</div>`;
    html += '<div class="card"><div class="card-body">';
    html += `<pre style="white-space: pre-wrap; max-height: 300px; overflow-y: auto;">${escapeHtml(data.result.text || 'No text detected')}</pre>`;
    html += '</div></div>';
    html += `<p class="text-muted mt-2">Lines detected: ${data.result.lines?.length || 0}</p>`;
    html += '</div>';
  }
  
  html += '</div></div>';
  resultsDiv.innerHTML = html;
}

/**
 * Load recent analyses from server
 */
async function loadRecentAnalyses() {
  const recentDiv = document.getElementById('recentAnalyses');
  if (!recentDiv) return;
  
  try {
    const response = await fetch(`/vision/search?userId=${currentUserId}&limit=5`);
    const data = await response.json();
    
    if (!data.success || !data.results || data.results.length === 0) {
      recentDiv.innerHTML = '<p class="text-muted">No recent analyses found.</p>';
      return;
    }
    
    let html = '<div class="list-group">';
    data.results.forEach(item => {
      const date = item.createdAt ? new Date(item.createdAt._seconds * 1000).toLocaleString() : 'Unknown';
      const preview = item.ocrText ? item.ocrText.substring(0, 100) + '...' : 'No text';
      
      html += `
        <div class="list-group-item">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${escapeHtml(item.fileName || 'Unknown')}</h6>
            <small>${date}</small>
          </div>
          <p class="mb-1 text-muted small">${escapeHtml(preview)}</p>
          ${item.tags ? item.tags.slice(0, 3).map(tag => `<span class="badge bg-secondary me-1">${escapeHtml(tag.name)}</span>`).join('') : ''}
        </div>
      `;
    });
    html += '</div>';
    
    recentDiv.innerHTML = html;
  } catch (error) {
    console.error('Error loading recent analyses:', error);
    recentDiv.innerHTML = '<p class="text-danger">Failed to load recent analyses.</p>';
  }
}

/**
 * Show error message
 */
function showError(message) {
  const errorDiv = document.getElementById('uploadError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

/**
 * Show/hide loading state
 */
function showLoading(isLoading) {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const ocrOnlyBtn = document.getElementById('ocrOnlyBtn');
  const spinner = document.getElementById('loadingSpinner');
  
  if (analyzeBtn) {
    analyzeBtn.disabled = isLoading;
    analyzeBtn.textContent = isLoading ? 'Analyzing...' : 'Complete Analysis';
  }
  
  if (ocrOnlyBtn) {
    ocrOnlyBtn.disabled = isLoading;
    ocrOnlyBtn.textContent = isLoading ? 'Processing...' : 'OCR Only';
  }
  
  if (spinner) {
    spinner.style.display = isLoading ? 'block' : 'none';
  }
}

/**
 * Clear results display
 */
function clearResults() {
  const resultsDiv = document.getElementById('analysisResults');
  if (resultsDiv) {
    resultsDiv.style.display = 'none';
    resultsDiv.innerHTML = '';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready (async)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initVisionUploader().catch(err => {
      console.error('Failed to initialize Vision Uploader:', err);
    });
  });
} else {
  initVisionUploader().catch(err => {
    console.error('Failed to initialize Vision Uploader:', err);
  });
}
