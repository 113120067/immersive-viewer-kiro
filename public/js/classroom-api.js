/**
 * Classroom API Layer
 * Provides authenticated API calls to classroom endpoints
 */

import { initialize } from '/firebase-client.js';

/**
 * Get Firebase authentication token
 * @returns {Promise<string|null>} - ID token or null if not authenticated
 */
async function getAuthToken() {
  try {
    const { auth } = await initialize();
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
  } catch (err) {
    console.warn('Failed to get auth token:', err);
  }
  return null;
}

/**
 * Make authenticated API call
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
async function apiCall(url, options = {}) {
  const token = await getAuthToken();
  const headers = { ...options.headers };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  
  return fetch(url, { ...options, headers });
}

/**
 * Create a new classroom
 * @param {FormData} formData - Form data with classroomName and file
 * @returns {Promise<Object>} - API response
 */
export async function createClassroom(formData) {
  const response = await apiCall('/classroom/create', {
    method: 'POST',
    body: formData
  });
  return await response.json();
}

/**
 * Join a classroom
 * @param {string} code - Classroom code
 * @param {string} studentName - Student name
 * @returns {Promise<Object>} - API response
 */
export async function joinClassroom(code, studentName) {
  const response = await apiCall('/classroom/join', {
    method: 'POST',
    body: { code, studentName }
  });
  return await response.json();
}

/**
 * Start learning session
 * @param {string} code - Classroom code
 * @param {string} studentName - Student name
 * @returns {Promise<Object>} - API response
 */
export async function startSession(code, studentName) {
  const response = await apiCall('/classroom/api/session/start', {
    method: 'POST',
    body: { code, studentName }
  });
  return await response.json();
}

/**
 * End learning session
 * @param {string} code - Classroom code
 * @param {string} studentName - Student name
 * @returns {Promise<Object>} - API response
 */
export async function endSession(code, studentName) {
  const response = await apiCall('/classroom/api/session/end', {
    method: 'POST',
    body: { code, studentName }
  });
  return await response.json();
}

/**
 * Get classroom leaderboard
 * @param {string} code - Classroom code
 * @returns {Promise<Object>} - API response
 */
export async function getLeaderboard(code) {
  const response = await apiCall(`/classroom/api/leaderboard/${code}`);
  return await response.json();
}

/**
 * Get student status
 * @param {string} code - Classroom code
 * @param {string} studentName - Student name
 * @returns {Promise<Object>} - API response
 */
export async function getStudentStatus(code, studentName) {
  const response = await apiCall(`/classroom/api/status/${code}/${encodeURIComponent(studentName)}`);
  return await response.json();
}

/**
 * Swap words between students
 * @param {Object} params - Swap parameters
 * @returns {Promise<Object>} - API response
 */
export async function swapWords(params) {
  const response = await apiCall('/classroom/api/word/swap', {
    method: 'POST',
    body: params
  });
  return await response.json();
}

/**
 * Record practice result
 * @param {Object} params - Practice parameters
 * @returns {Promise<Object>} - API response
 */
export async function recordPractice(params) {
  const response = await apiCall('/classroom/api/word/practice', {
    method: 'POST',
    body: params
  });
  return await response.json();
}

/**
 * Get user's owned classrooms
 * @returns {Promise<Object>} - API response
 */
export async function getMyClassrooms() {
  const response = await apiCall('/classroom/api/my-classrooms');
  return await response.json();
}

/**
 * Get user's participated classrooms
 * @returns {Promise<Object>} - API response
 */
export async function getMyParticipations() {
  const response = await apiCall('/classroom/api/my-participations');
  return await response.json();
}

/**
 * Get student progress
 * @param {string} classroomId - Classroom ID
 * @returns {Promise<Object>} - API response
 */
export async function getProgress(classroomId) {
  const response = await apiCall(`/classroom/api/progress/${classroomId}`);
  return await response.json();
}
