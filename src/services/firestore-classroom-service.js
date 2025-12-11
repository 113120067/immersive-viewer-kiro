/**
 * Firestore Classroom Service
 * Manages classroom data in Firestore with authentication support
 */

const { db } = require('../config/firebase-admin');
const admin = require('firebase-admin');

/**
 * Generate a unique 4-character alphanumeric classroom code
 * @returns {Promise<string>} - Unique classroom code
 */
async function generateUniqueCode() {
  if (!db) throw new Error('Firestore is not initialized');

  const crypto = require('crypto');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    let code = '';
    // Use crypto.randomBytes for cryptographically secure random generation
    const randomBytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(randomBytes[i] % chars.length);
    }

    // Check if code already exists
    const snapshot = await db.collection('classrooms')
      .where('code', '==', code)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return code;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique classroom code after ' + maxAttempts + ' attempts');
}

/**
 * Create a new classroom
 * @param {Object} params
 * @param {string} params.name - Classroom name
 * @param {Array<string>} params.words - Words to learn
 * @param {string} params.ownerId - User UID
 * @param {string} params.ownerEmail - User email
 * @returns {Promise<Object>} - Created classroom with id
 */
async function createClassroom({ name, words, ownerId, ownerEmail }) {
  if (!db) throw new Error('Firestore is not initialized');

  const code = await generateUniqueCode();
  const now = admin.firestore.Timestamp.now();

  const classroomData = {
    code,
    name,
    words: words || [],
    wordCount: (words || []).length,
    ownerId,
    ownerEmail,
    mode: 'authenticated',
    isPublic: true,
    createdAt: now,
    updatedAt: now,
    expiresAt: null
  };

  const docRef = await db.collection('classrooms').add(classroomData);

  return {
    id: docRef.id,
    ...classroomData
  };
}

/**
 * Get classroom by code
 * @param {string} code - Classroom code
 * @returns {Promise<Object|null>} - Classroom data with id or null
 */
async function getClassroomByCode(code) {
  if (!db) throw new Error('Firestore is not initialized');

  const snapshot = await db.collection('classrooms')
    .where('code', '==', code)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  };
}

/**
 * Get classroom by ID
 * @param {string} id - Classroom document ID
 * @returns {Promise<Object|null>} - Classroom data with id or null
 */
async function getClassroomById(id) {
  if (!db) throw new Error('Firestore is not initialized');

  const doc = await db.collection('classrooms').doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data()
  };
}

/**
 * Add a student to a classroom
 * @param {Object} params
 * @param {string} params.classroomId - Classroom document ID
 * @param {string} params.name - Student name
 * @param {string|null} params.userId - User UID (null for anonymous)
 * @param {string|null} params.email - User email (null for anonymous)
 * @returns {Promise<Object>} - Student data with id
 */
async function addStudent({ classroomId, name, userId = null, email = null }) {
  if (!db) throw new Error('Firestore is not initialized');

  const studentsRef = db.collection('classrooms').doc(classroomId).collection('students');

  // Check if student already exists (by name or userId)
  let query = studentsRef.where('name', '==', name);
  let snapshot = await query.limit(1).get();

  if (!snapshot.empty) {
    const existingStudent = snapshot.docs[0];
    return {
      id: existingStudent.id,
      ...existingStudent.data()
    };
  }

  // If userId is provided, also check by userId
  if (userId) {
    query = studentsRef.where('userId', '==', userId);
    snapshot = await query.limit(1).get();

    if (!snapshot.empty) {
      const existingStudent = snapshot.docs[0];
      return {
        id: existingStudent.id,
        ...existingStudent.data()
      };
    }
  }

  // Get classroom words
  const classroom = await getClassroomById(classroomId);
  if (!classroom) {
    throw new Error('Classroom not found');
  }

  const now = admin.firestore.Timestamp.now();
  const studentData = {
    name,
    userId,
    email,
    totalTime: 0,
    sessionStart: null,
    lastActive: now,
    words: classroom.words || [],
    wordStats: {},
    joinedAt: now
  };

  const docRef = await studentsRef.add(studentData);

  return {
    id: docRef.id,
    ...studentData
  };
}

/**
 * Start a learning session for a student
 * @param {Object} params
 * @param {string} params.classroomId - Classroom document ID
 * @param {string} params.studentName - Student name
 * @param {string|null} params.userId - User UID (for matching)
 * @returns {Promise<boolean>} - Success status
 */
async function startSession({ classroomId, studentName, userId = null }) {
  if (!db) throw new Error('Firestore is not initialized');

  const studentsRef = db.collection('classrooms').doc(classroomId).collection('students');
  
  // Find student by name or userId
  let query = studentsRef.where('name', '==', studentName);
  const snapshot = await query.limit(1).get();

  if (snapshot.empty) {
    return false;
  }

  const studentDoc = snapshot.docs[0];
  const now = admin.firestore.Timestamp.now();

  await studentDoc.ref.update({
    sessionStart: now,
    lastActive: now
  });

  return true;
}

/**
 * End a learning session for a student
 * @param {Object} params
 * @param {string} params.classroomId - Classroom document ID
 * @param {string} params.studentName - Student name
 * @param {string|null} params.userId - User UID (for matching)
 * @returns {Promise<number|null>} - Session duration in seconds or null
 */
async function endSession({ classroomId, studentName, userId = null }) {
  if (!db) throw new Error('Firestore is not initialized');

  const studentsRef = db.collection('classrooms').doc(classroomId).collection('students');
  
  let query = studentsRef.where('name', '==', studentName);
  const snapshot = await query.limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  const studentDoc = snapshot.docs[0];
  const studentData = studentDoc.data();

  if (!studentData.sessionStart) {
    return null;
  }

  const now = admin.firestore.Timestamp.now();
  const duration = Math.floor((now.toMillis() - studentData.sessionStart.toMillis()) / 1000);

  // Update student total time
  await studentDoc.ref.update({
    totalTime: admin.firestore.FieldValue.increment(duration),
    sessionStart: null,
    lastActive: now
  });

  // Create session record
  const sessionsRef = studentDoc.ref.collection('sessions');
  await sessionsRef.add({
    startTime: studentData.sessionStart,
    endTime: now,
    duration,
    wordsStudied: studentData.words || []
  });

  return duration;
}

/**
 * Get classroom leaderboard
 * @param {string} classroomId - Classroom document ID
 * @returns {Promise<Array>} - Sorted list of students
 */
async function getLeaderboard(classroomId) {
  if (!db) throw new Error('Firestore is not initialized');

  const studentsRef = db.collection('classrooms').doc(classroomId).collection('students');
  const snapshot = await studentsRef.orderBy('totalTime', 'desc').get();

  const leaderboard = [];
  snapshot.forEach((doc, index) => {
    const data = doc.data();
    leaderboard.push({
      rank: index + 1,
      name: data.name,
      totalTime: data.totalTime || 0,
      totalMinutes: Math.floor((data.totalTime || 0) / 60),
      totalSeconds: (data.totalTime || 0) % 60,
      isActive: data.sessionStart !== null,
      lastActive: data.lastActive
    });
  });

  return leaderboard;
}

/**
 * Get student status
 * @param {Object} params
 * @param {string} params.classroomId - Classroom document ID
 * @param {string} params.studentName - Student name
 * @param {string|null} params.userId - User UID
 * @returns {Promise<Object|null>} - Student status or null
 */
async function getStudentStatus({ classroomId, studentName, userId = null }) {
  if (!db) throw new Error('Firestore is not initialized');

  const studentsRef = db.collection('classrooms').doc(classroomId).collection('students');
  
  let query = studentsRef.where('name', '==', studentName);
  const snapshot = await query.limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  const studentDoc = snapshot.docs[0];
  const studentData = studentDoc.data();

  // Get leaderboard to calculate rank
  const leaderboard = await getLeaderboard(classroomId);
  const myRank = leaderboard.find(s => s.name === studentName);

  return {
    name: studentData.name,
    totalTime: studentData.totalTime || 0,
    isActive: studentData.sessionStart !== null,
    rank: myRank ? myRank.rank : null,
    totalStudents: leaderboard.length
  };
}

/**
 * Swap words between two students
 * @param {Object} params
 * @param {string} params.classroomId - Classroom document ID
 * @param {string} params.studentA - Student A name
 * @param {string} params.wordA - Word from student A
 * @param {string} params.studentB - Student B name
 * @param {string} params.wordB - Word from student B
 * @returns {Promise<Object>} - Result object
 */
async function swapWords({ classroomId, studentA, wordA, studentB, wordB }) {
  if (!db) throw new Error('Firestore is not initialized');

  const studentsRef = db.collection('classrooms').doc(classroomId).collection('students');

  // Find both students
  const snapshotA = await studentsRef.where('name', '==', studentA).limit(1).get();
  const snapshotB = await studentsRef.where('name', '==', studentB).limit(1).get();

  if (snapshotA.empty || snapshotB.empty) {
    return { success: false, error: 'One or both students not found' };
  }

  const studentDocA = snapshotA.docs[0];
  const studentDocB = snapshotB.docs[0];

  const dataA = studentDocA.data();
  const dataB = studentDocB.data();

  const wordsA = dataA.words || [];
  const wordsB = dataB.words || [];

  const indexA = wordsA.indexOf(wordA);
  const indexB = wordsB.indexOf(wordB);

  if (indexA === -1) {
    return { success: false, error: `${studentA} does not own the word` };
  }
  if (indexB === -1) {
    return { success: false, error: `${studentB} does not own the word` };
  }

  // Swap words
  wordsA[indexA] = wordB;
  wordsB[indexB] = wordA;

  // Update both students
  await studentDocA.ref.update({ words: wordsA });
  await studentDocB.ref.update({ words: wordsB });

  return { success: true };
}

/**
 * Record a practice result
 * @param {Object} params
 * @param {string} params.classroomId - Classroom document ID
 * @param {string} params.studentName - Student name
 * @param {string} params.word - Word practiced
 * @param {boolean} params.correct - Whether the answer was correct
 * @param {string|null} params.userId - User UID
 * @returns {Promise<Object>} - Result object with stats
 */
async function recordPractice({ classroomId, studentName, word, correct, userId = null }) {
  if (!db) throw new Error('Firestore is not initialized');

  const studentsRef = db.collection('classrooms').doc(classroomId).collection('students');
  
  let query = studentsRef.where('name', '==', studentName);
  const snapshot = await query.limit(1).get();

  if (snapshot.empty) {
    return { success: false, error: 'Student not found' };
  }

  const studentDoc = snapshot.docs[0];
  const studentData = studentDoc.data();

  const words = studentData.words || [];
  if (words.indexOf(word) === -1) {
    return { success: false, error: 'Student does not have that word' };
  }

  const wordStats = studentData.wordStats || {};
  if (!wordStats[word]) {
    wordStats[word] = { correct: 0, wrong: 0 };
  }

  if (correct) {
    wordStats[word].correct += 1;
  } else {
    wordStats[word].wrong += 1;
  }

  const now = admin.firestore.Timestamp.now();

  await studentDoc.ref.update({
    wordStats,
    lastActive: now
  });

  return { success: true, stats: wordStats[word] };
}

/**
 * Get classrooms owned by a user
 * @param {string} ownerId - User UID
 * @returns {Promise<Array>} - List of classrooms with student count
 */
async function getMyClassrooms(ownerId) {
  if (!db) throw new Error('Firestore is not initialized');

  const snapshot = await db.collection('classrooms')
    .where('ownerId', '==', ownerId)
    .orderBy('createdAt', 'desc')
    .get();

  const classrooms = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Count students
    const studentsSnapshot = await doc.ref.collection('students').get();
    const studentCount = studentsSnapshot.size;

    // Count active students (session within last 24 hours)
    const oneDayAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const activeStudentsSnapshot = await doc.ref.collection('students')
      .where('lastActive', '>', oneDayAgo)
      .get();
    const activeStudentCount = activeStudentsSnapshot.size;

    classrooms.push({
      id: doc.id,
      code: data.code,
      name: data.name,
      wordCount: data.wordCount,
      studentCount,
      activeStudentCount,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
  }

  return classrooms;
}

/**
 * Get classrooms where user is a participant
 * @param {string} userId - User UID
 * @returns {Promise<Array>} - List of classrooms with student info
 */
async function getMyParticipations(userId) {
  if (!db) throw new Error('Firestore is not initialized');

  // Use collectionGroup to find all students with this userId
  const studentsSnapshot = await db.collectionGroup('students')
    .where('userId', '==', userId)
    .orderBy('joinedAt', 'desc')
    .get();

  const participations = [];

  for (const studentDoc of studentsSnapshot.docs) {
    const studentData = studentDoc.data();
    
    // Get parent classroom
    const classroomRef = studentDoc.ref.parent.parent;
    const classroomDoc = await classroomRef.get();

    if (!classroomDoc.exists) continue;

    const classroomData = classroomDoc.data();

    // Calculate rank
    const leaderboard = await getLeaderboard(classroomDoc.id);
    const myRank = leaderboard.find(s => s.name === studentData.name);

    participations.push({
      classroomId: classroomDoc.id,
      classroomCode: classroomData.code,
      classroomName: classroomData.name,
      studentName: studentData.name,
      totalTime: studentData.totalTime || 0,
      rank: myRank ? myRank.rank : null,
      totalStudents: leaderboard.length,
      joinedAt: studentData.joinedAt,
      lastActive: studentData.lastActive
    });
  }

  return participations;
}

/**
 * Get detailed student progress
 * @param {Object} params
 * @param {string} params.classroomId - Classroom document ID
 * @param {string} params.userId - User UID
 * @returns {Promise<Object>} - Detailed progress data
 */
async function getStudentProgress({ classroomId, userId }) {
  if (!db) throw new Error('Firestore is not initialized');

  // Get classroom info
  const classroom = await getClassroomById(classroomId);
  if (!classroom) {
    throw new Error('Classroom not found');
  }

  // Find student by userId
  const studentsRef = db.collection('classrooms').doc(classroomId).collection('students');
  const studentSnapshot = await studentsRef.where('userId', '==', userId).limit(1).get();

  if (studentSnapshot.empty) {
    throw new Error('Student not found in this classroom');
  }

  const studentDoc = studentSnapshot.docs[0];
  const studentData = studentDoc.data();

  // Get sessions
  const sessionsSnapshot = await studentDoc.ref.collection('sessions')
    .orderBy('startTime', 'desc')
    .get();

  const sessions = [];
  sessionsSnapshot.forEach(doc => {
    const data = doc.data();
    sessions.push({
      id: doc.id,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      wordsStudied: data.wordsStudied || []
    });
  });

  // Calculate rank
  const leaderboard = await getLeaderboard(classroomId);
  const myRank = leaderboard.find(s => s.name === studentData.name);

  // Calculate mastery
  const wordStats = studentData.wordStats || {};
  const totalWords = studentData.words ? studentData.words.length : 0;
  let masteredWords = 0;
  
  Object.keys(wordStats).forEach(word => {
    const stats = wordStats[word];
    const total = stats.correct + stats.wrong;
    if (total > 0 && stats.correct / total >= 0.8) {
      masteredWords++;
    }
  });

  const mastery = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

  // Calculate study days
  const studyDays = new Set();
  sessions.forEach(session => {
    if (session.startTime) {
      const date = session.startTime.toDate();
      studyDays.add(date.toISOString().split('T')[0]);
    }
  });

  return {
    classroom: {
      id: classroom.id,
      code: classroom.code,
      name: classroom.name,
      wordCount: classroom.wordCount
    },
    student: {
      name: studentData.name,
      totalTime: studentData.totalTime || 0,
      rank: myRank ? myRank.rank : null,
      totalStudents: leaderboard.length,
      mastery,
      studyDays: studyDays.size,
      joinedAt: studentData.joinedAt
    },
    wordStats: studentData.wordStats || {},
    sessions
  };
}

module.exports = {
  generateUniqueCode,
  createClassroom,
  getClassroomByCode,
  getClassroomById,
  addStudent,
  startSession,
  endSession,
  getLeaderboard,
  getStudentStatus,
  swapWords,
  recordPractice,
  getMyClassrooms,
  getMyParticipations,
  getStudentProgress
};
