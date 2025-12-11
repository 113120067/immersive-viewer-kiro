// Classroom Create Page JavaScript

import { initialize, onAuthStateChanged } from '/firebase-client.js';
import { createClassroom } from '/js/classroom-api.js';

let currentUser = null;

// Initialize Firebase and monitor auth state
(async function() {
  try {
    await initialize();
    onAuthStateChanged(user => {
      currentUser = user;
      updateAuthStatus(user);
    });
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    updateAuthStatus(null);
  }
})();

function updateAuthStatus(user) {
  const statusDiv = document.getElementById('authStatus');
  if (!statusDiv) return;
  
  if (user) {
    statusDiv.innerHTML = `
      <div class="alert alert-success">
        <i class="bi bi-check-circle-fill"></i> 
        已登入 (${escapeHtml(user.email)}) - 課堂資料將永久保存
      </div>
    `;
  } else {
    statusDiv.innerHTML = `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle-fill"></i> 
        未登入 - 課堂將在 24 小時後刪除。
        <a href="/login.html" class="alert-link">立即登入</a> 以永久保存課堂資料
      </div>
    `;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

$(document).ready(function() {
  $('#createForm').on('submit', async function(e) {
    e.preventDefault();
    
    const classroomName = $('#classroomName').val().trim();
    const fileInput = $('#wordFile')[0];
    
    if (!classroomName) {
      showStatus('請輸入課堂名稱', 'danger');
      return;
    }
    
    if (!fileInput.files || !fileInput.files[0]) {
      showStatus('請選擇檔案', 'danger');
      return;
    }
    
    const formData = new FormData();
    formData.append('classroomName', classroomName);
    formData.append('file', fileInput.files[0]);
    
    showStatus('正在建立課堂...', 'info');
    $('button[type="submit"]').prop('disabled', true);
    
    try {
      const data = await createClassroom(formData);
      
      if (data.success) {
        showSuccess(data);
      } else {
        showStatus('錯誤: ' + (data.error || '未知錯誤'), 'danger');
        $('button[type="submit"]').prop('disabled', false);
      }
    } catch (error) {
      showStatus('建立失敗: ' + error.message, 'danger');
      $('button[type="submit"]').prop('disabled', false);
    }
  });
});

function showStatus(message, type) {
  $('#uploadStatus').html(`<div class="alert alert-${type}">${message}</div>`);
}

function showSuccess(data) {
  // Hide step 1
  $('#step1').addClass('d-none');
  
  // Show step 2
  $('#step2').removeClass('d-none');
  
  // Display classroom info
  $('#classroomCode').text(data.code);
  $('#classroomInfo').html(`<strong>課堂名稱:</strong> ${data.name}`);
  $('#wordCountInfo').text(`共提取 ${data.wordCount} 個單字`);
  $('#teacherPanelLink').attr('href', `/classroom/teacher/${data.code}`);
  
  // Show storage mode info
  if (data.mode === 'firestore') {
    $('#storageMode').html(`
      <div class="alert alert-success mt-3">
        <i class="bi bi-cloud-check-fill"></i> 課堂已永久保存到雲端
      </div>
    `);
  } else {
    $('#storageMode').html(`
      <div class="alert alert-warning mt-3">
        <i class="bi bi-exclamation-triangle-fill"></i> 課堂暫存於記憶體，將在 24 小時後刪除
      </div>
    `);
  }
}
