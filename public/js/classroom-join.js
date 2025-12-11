// Classroom Join Page JavaScript

import { joinClassroom } from '/js/classroom-api.js';

$(document).ready(function() {
  // Auto-format classroom code input
  $('#classroomCode').on('input', function() {
    this.value = this.value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  });
  
  $('#joinForm').on('submit', async function(e) {
    e.preventDefault();
    
    const code = $('#classroomCode').val().trim();
    const studentName = $('#studentName').val().trim();
    
    if (code.length !== 4) {
      showStatus('請輸入4位課堂代碼', 'danger');
      return;
    }
    
    if (!studentName) {
      showStatus('請輸入你的姓名', 'danger');
      return;
    }
    
    showStatus('正在加入課堂...', 'info');
    $('button[type="submit"]').prop('disabled', true);
    
    try {
      const data = await joinClassroom(code, studentName);
      
      if (data.success) {
        showStatus('加入成功! 正在跳轉...', 'success');
        setTimeout(function() {
          window.location.href = `/classroom/student/${data.code}/${encodeURIComponent(data.studentName)}`;
        }, 1000);
      } else {
        showStatus('錯誤: ' + (data.error || '未知錯誤'), 'danger');
        $('button[type="submit"]').prop('disabled', false);
      }
    } catch (error) {
      let errorMessage = '加入失敗';
      if (error.message.includes('404')) {
        errorMessage = '找不到此課堂,請確認代碼是否正確';
      } else {
        errorMessage = error.message;
      }
      showStatus(errorMessage, 'danger');
      $('button[type="submit"]').prop('disabled', false);
    }
  });
});

function showStatus(message, type) {
  $('#joinStatus').html(`<div class="alert alert-${type}">${message}</div>`);
}
