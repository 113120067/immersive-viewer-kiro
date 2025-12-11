/**
 * Classroom Progress Page JavaScript
 */

import { initialize, onAuthStateChanged } from '/firebase-client.js';
import { getProgress } from '/js/classroom-api.js';

let currentUser = null;
let progressData = null;
let chart = null;

/**
 * Initialize page
 */
async function init() {
  try {
    await initialize();
    
    onAuthStateChanged(user => {
      currentUser = user;
      
      if (user) {
        loadProgress();
      } else {
        showNotLoggedIn();
      }
    });
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    showNotLoggedIn();
  }
}

/**
 * Show not logged in view
 */
function showNotLoggedIn() {
  document.getElementById('notLoggedIn').style.display = 'block';
  document.getElementById('progressContent').style.display = 'none';
}

/**
 * Load progress data
 */
async function loadProgress() {
  const spinner = document.getElementById('loadingSpinner');
  const content = document.getElementById('progressContent');
  
  spinner.style.display = 'block';
  
  try {
    // Get classroomId from URL path
    const pathParts = window.location.pathname.split('/');
    const classroomId = pathParts[pathParts.length - 1];
    
    const data = await getProgress(classroomId);
    
    if (data.success) {
      progressData = data;
      renderProgress();
      content.style.display = 'block';
    } else {
      alert('載入進度失敗: ' + data.error);
    }
  } catch (error) {
    console.error('Error loading progress:', error);
    alert('載入進度失敗: ' + error.message);
  } finally {
    spinner.style.display = 'none';
  }
}

/**
 * Render progress data
 */
function renderProgress() {
  if (!progressData) return;
  
  // Render classroom info
  renderClassroomInfo();
  
  // Render statistics
  renderStatistics();
  
  // Render chart
  renderChart();
  
  // Render word stats
  renderWordStats();
  
  // Render session history
  renderSessionHistory();
}

/**
 * Render classroom information
 */
function renderClassroomInfo() {
  const { classroom } = progressData;
  
  document.getElementById('classroomName').textContent = classroom.name;
  document.getElementById('classroomCode').textContent = classroom.code;
  document.getElementById('classroomWordCount').textContent = classroom.wordCount;
}

/**
 * Render statistics cards
 */
function renderStatistics() {
  const { student } = progressData;
  
  const totalMinutes = Math.floor(student.totalTime / 60);
  document.getElementById('totalTime').textContent = totalMinutes + ' 分鐘';
  
  const rankText = student.rank ? `${student.rank} / ${student.totalStudents}` : 'N/A';
  document.getElementById('rank').textContent = rankText;
  
  document.getElementById('studyDays').textContent = student.studyDays + ' 天';
  document.getElementById('mastery').textContent = student.mastery + '%';
}

/**
 * Render learning time chart
 */
function renderChart() {
  const { sessions } = progressData;
  
  if (!sessions || sessions.length === 0) {
    document.getElementById('learningChart').style.display = 'none';
    return;
  }
  
  // Group sessions by date
  const dailyData = {};
  
  sessions.forEach(session => {
    const date = formatSessionDate(session.startTime);
    const minutes = Math.round(session.duration / 60);
    
    if (!dailyData[date]) {
      dailyData[date] = 0;
    }
    dailyData[date] += minutes;
  });
  
  // Sort dates
  const sortedDates = Object.keys(dailyData).sort();
  const values = sortedDates.map(date => dailyData[date]);
  
  // Create chart
  const ctx = document.getElementById('learningChart');
  
  if (chart) {
    chart.destroy();
  }
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: '學習時間 (分鐘)',
        data: values,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        title: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '分鐘'
          }
        },
        x: {
          title: {
            display: true,
            text: '日期'
          }
        }
      }
    }
  });
}

/**
 * Render word statistics
 */
function renderWordStats() {
  const { wordStats } = progressData;
  const container = document.getElementById('wordStats');
  
  if (!wordStats || Object.keys(wordStats).length === 0) {
    container.innerHTML = '<p class="text-muted">尚無練習記錄</p>';
    return;
  }
  
  let html = '<div class="list-group">';
  
  Object.entries(wordStats).forEach(([word, stats]) => {
    const total = stats.correct + stats.wrong;
    const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
    
    // Validate accuracy is a number between 0-100
    const safeAccuracy = Math.max(0, Math.min(100, isNaN(accuracy) ? 0 : accuracy));
    
    let badgeClass = 'bg-success';
    if (safeAccuracy < 50) badgeClass = 'bg-danger';
    else if (safeAccuracy < 80) badgeClass = 'bg-warning';
    
    html += `
      <div class="list-group-item">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong>${escapeHtml(word)}</strong>
          <span class="badge ${badgeClass}">${safeAccuracy}%</span>
        </div>
        <div class="progress" style="height: 20px;">
          <div class="progress-bar bg-success" role="progressbar" 
               style="width: ${(stats.correct / total) * 100}%"
               aria-valuenow="${stats.correct}" aria-valuemin="0" aria-valuemax="${total}">
            正確: ${stats.correct}
          </div>
          <div class="progress-bar bg-danger" role="progressbar" 
               style="width: ${(stats.wrong / total) * 100}%"
               aria-valuenow="${stats.wrong}" aria-valuemin="0" aria-valuemax="${total}">
            錯誤: ${stats.wrong}
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Render session history
 */
function renderSessionHistory() {
  const { sessions } = progressData;
  const container = document.getElementById('sessionHistory');
  
  if (!sessions || sessions.length === 0) {
    container.innerHTML = '<p class="text-muted">尚無學習記錄</p>';
    return;
  }
  
  let html = '<div class="table-responsive"><table class="table table-striped">';
  html += '<thead><tr><th>開始時間</th><th>結束時間</th><th>時長</th><th>學習單字數</th></tr></thead>';
  html += '<tbody>';
  
  sessions.forEach(session => {
    const startTime = formatSessionDateTime(session.startTime);
    const endTime = formatSessionDateTime(session.endTime);
    const duration = formatDuration(session.duration);
    const wordCount = session.wordsStudied ? session.wordsStudied.length : 0;
    
    html += `
      <tr>
        <td>${startTime}</td>
        <td>${endTime}</td>
        <td>${duration}</td>
        <td>${wordCount}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/**
 * Format session date (for chart)
 */
function formatSessionDate(timestamp) {
  let date;
  
  if (timestamp && timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000);
  } else if (timestamp && timestamp.toDate) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return 'N/A';
  }
  
  return date.toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Format session datetime
 */
function formatSessionDateTime(timestamp) {
  let date;
  
  if (timestamp && timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000);
  } else if (timestamp && timestamp.toDate) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return 'N/A';
  }
  
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format duration in seconds to readable string
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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

// Initialize on load
init();
