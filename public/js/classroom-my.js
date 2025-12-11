/**
 * My Classrooms Page JavaScript
 */

import { initialize, onAuthStateChanged } from '/firebase-client.js';
import { getMyClassrooms, getMyParticipations } from '/js/classroom-api.js';

let currentUser = null;

/**
 * Initialize page
 */
async function init() {
  try {
    await initialize();
    
    onAuthStateChanged(user => {
      currentUser = user;
      
      if (user) {
        showLoggedInView(user);
        loadClassrooms();
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
  document.getElementById('userInfo').style.display = 'none';
  document.getElementById('teacherSection').style.display = 'none';
  document.getElementById('studentSection').style.display = 'none';
}

/**
 * Show logged in view
 */
function showLoggedInView(user) {
  document.getElementById('notLoggedIn').style.display = 'none';
  document.getElementById('userInfo').style.display = 'block';
  document.getElementById('userEmail').textContent = `登入帳號: ${user.email}`;
}

/**
 * Load classrooms
 */
async function loadClassrooms() {
  const spinner = document.getElementById('loadingSpinner');
  spinner.style.display = 'block';
  
  try {
    // Load teacher classrooms
    const teacherData = await getMyClassrooms();
    if (teacherData.success) {
      renderTeacherClassrooms(teacherData.classrooms);
    }
    
    // Load student participations
    const studentData = await getMyParticipations();
    if (studentData.success) {
      renderStudentParticipations(studentData.participations);
    }
  } catch (error) {
    console.error('Error loading classrooms:', error);
    alert('載入課堂資料失敗: ' + error.message);
  } finally {
    spinner.style.display = 'none';
  }
}

/**
 * Render teacher classrooms
 */
function renderTeacherClassrooms(classrooms) {
  const container = document.getElementById('teacherClassrooms');
  const emptyMsg = document.getElementById('noTeacherClassrooms');
  const section = document.getElementById('teacherSection');
  
  section.style.display = 'block';
  container.innerHTML = '';
  
  if (classrooms.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  
  emptyMsg.style.display = 'none';
  
  classrooms.forEach(classroom => {
    const card = createTeacherCard(classroom);
    container.appendChild(card);
  });
}

/**
 * Create teacher classroom card
 */
function createTeacherCard(classroom) {
  const col = document.createElement('div');
  col.className = 'col-md-6 col-lg-4 mb-4';
  
  const createdDate = classroom.createdAt ? formatDate(classroom.createdAt) : 'N/A';
  
  col.innerHTML = `
    <div class="card h-100">
      <div class="card-body">
        <h5 class="card-title">${escapeHtml(classroom.name)}</h5>
        <p class="card-text">
          <strong>代碼:</strong> <span class="badge bg-primary fs-6">${classroom.code}</span><br>
          <strong>單字數:</strong> ${classroom.wordCount}<br>
          <strong>學生數:</strong> ${classroom.studentCount} 
          (活躍: ${classroom.activeStudentCount})<br>
          <strong>建立日期:</strong> ${createdDate}
        </p>
      </div>
      <div class="card-footer">
        <a href="/classroom/teacher/${classroom.code}" class="btn btn-sm btn-primary">控制面板</a>
        <a href="/classroom/student/${classroom.code}/teacher" class="btn btn-sm btn-secondary">學習頁面</a>
      </div>
    </div>
  `;
  
  return col;
}

/**
 * Render student participations
 */
function renderStudentParticipations(participations) {
  const container = document.getElementById('studentClassrooms');
  const emptyMsg = document.getElementById('noStudentClassrooms');
  const section = document.getElementById('studentSection');
  
  section.style.display = 'block';
  container.innerHTML = '';
  
  if (participations.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  
  emptyMsg.style.display = 'none';
  
  participations.forEach(participation => {
    const card = createStudentCard(participation);
    container.appendChild(card);
  });
}

/**
 * Create student participation card
 */
function createStudentCard(participation) {
  const col = document.createElement('div');
  col.className = 'col-md-6 col-lg-4 mb-4';
  
  const totalMinutes = Math.floor(participation.totalTime / 60);
  const joinedDate = participation.joinedAt ? formatDate(participation.joinedAt) : 'N/A';
  const lastActiveDate = participation.lastActive ? formatDate(participation.lastActive) : 'N/A';
  
  col.innerHTML = `
    <div class="card h-100">
      <div class="card-body">
        <h5 class="card-title">${escapeHtml(participation.classroomName)}</h5>
        <p class="card-text">
          <strong>代碼:</strong> <span class="badge bg-info">${participation.classroomCode}</span><br>
          <strong>學生名稱:</strong> ${escapeHtml(participation.studentName)}<br>
          <strong>學習時間:</strong> ${totalMinutes} 分鐘<br>
          <strong>排名:</strong> ${participation.rank || 'N/A'} / ${participation.totalStudents}<br>
          <strong>加入日期:</strong> ${joinedDate}<br>
          <strong>最後活動:</strong> ${lastActiveDate}
        </p>
      </div>
      <div class="card-footer">
        <a href="/classroom/student/${participation.classroomCode}/${encodeURIComponent(participation.studentName)}" 
           class="btn btn-sm btn-primary">開始學習</a>
        <a href="/classroom/progress/${participation.classroomId}" 
           class="btn btn-sm btn-success">學習進度</a>
      </div>
    </div>
  `;
  
  return col;
}

/**
 * Format Firestore timestamp to readable date
 */
function formatDate(timestamp) {
  let date;
  
  if (timestamp && timestamp._seconds) {
    // Firestore Timestamp
    date = new Date(timestamp._seconds * 1000);
  } else if (timestamp && timestamp.toDate) {
    // Firestore Timestamp object
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return 'N/A';
  }
  
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
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
