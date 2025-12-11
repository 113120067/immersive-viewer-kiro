/**
 * Classroom Manager
 * Manages dual-mode storage: in-memory for anonymous users, Firestore for authenticated users
 */

const classroomStore = require('../utils/classroom-store');
const firestoreService = require('./firestore-classroom-service');
const { db } = require('../config/firebase-admin');

class ClassroomManager {
  /**
   * Create a new classroom
   * @param {Object} params
   * @param {string} params.name - Classroom name
   * @param {Array<string>} params.words - Words to learn
   * @param {Object|null} params.user - User object (null for anonymous)
   * @returns {Promise<Object>} - Created classroom
   */
  async createClassroom({ name, words, user }) {
    if (user && db) {
      // Authenticated mode - use Firestore
      try {
        const classroom = await firestoreService.createClassroom({
          name,
          words,
          ownerId: user.uid,
          ownerEmail: user.email
        });
        return {
          ...classroom,
          source: 'firestore'
        };
      } catch (error) {
        console.error('[ClassroomManager] Failed to create classroom in Firestore:', error.message);
        // Fallback to memory
        const classroom = classroomStore.createClassroom(name, words);
        classroom.mode = 'anonymous';
        return {
          ...classroom,
          source: 'memory'
        };
      }
    } else {
      // Anonymous mode - use memory
      const classroom = classroomStore.createClassroom(name, words);
      classroom.mode = 'anonymous';
      return {
        ...classroom,
        source: 'memory'
      };
    }
  }

  /**
   * Get classroom by code
   * @param {string} code - Classroom code
   * @param {Object|null} user - User object
   * @returns {Promise<Object|null>} - Classroom data or null
   */
  async getClassroom(code, user) {
    // Try Firestore first if available
    if (db) {
      try {
        const classroom = await firestoreService.getClassroomByCode(code);
        if (classroom) {
          // Check access permissions
          if (classroom.isPublic || (user && classroom.ownerId === user.uid)) {
            return {
              ...classroom,
              source: 'firestore'
            };
          } else {
            // Private classroom, no access
            return null;
          }
        }
      } catch (error) {
        console.error('[ClassroomManager] Failed to get classroom from Firestore:', error.message);
      }
    }

    // Fallback to memory
    const classroom = classroomStore.getClassroom(code);
    if (classroom) {
      return {
        ...classroom,
        source: 'memory'
      };
    }

    return null;
  }

  /**
   * Join a classroom
   * @param {Object} params
   * @param {string} params.code - Classroom code
   * @param {string} params.studentName - Student name
   * @param {Object|null} params.user - User object
   * @returns {Promise<Object>} - Result object
   */
  async joinClassroom({ code, studentName, user }) {
    const classroom = await this.getClassroom(code, user);
    
    if (!classroom) {
      return { success: false, error: 'Classroom not found' };
    }

    if (classroom.source === 'firestore') {
      try {
        await firestoreService.addStudent({
          classroomId: classroom.id,
          name: studentName,
          userId: user ? user.uid : null,
          email: user ? user.email : null
        });
        return { success: true, code, studentName };
      } catch (error) {
        console.error('[ClassroomManager] Failed to join classroom in Firestore:', error.message);
        return { success: false, error: 'Failed to join classroom' };
      }
    } else {
      // Memory mode
      const result = classroomStore.addStudent(code, studentName);
      if (result) {
        return { success: true, code, studentName };
      } else {
        return { success: false, error: 'Failed to join classroom' };
      }
    }
  }

  /**
   * Start learning session
   * @param {Object} params
   * @param {string} params.code - Classroom code
   * @param {string} params.studentName - Student name
   * @param {Object|null} params.user - User object
   * @returns {Promise<Object>} - Result object
   */
  async startSession({ code, studentName, user }) {
    const classroom = await this.getClassroom(code, user);
    
    if (!classroom) {
      return { success: false, error: 'Classroom not found' };
    }

    if (classroom.source === 'firestore') {
      try {
        const success = await firestoreService.startSession({
          classroomId: classroom.id,
          studentName,
          userId: user ? user.uid : null
        });
        return { success };
      } catch (error) {
        console.error('[ClassroomManager] Failed to start session in Firestore:', error.message);
        return { success: false, error: 'Failed to start session' };
      }
    } else {
      // Memory mode
      const success = classroomStore.startSession(code, studentName);
      return { success };
    }
  }

  /**
   * End learning session
   * @param {Object} params
   * @param {string} params.code - Classroom code
   * @param {string} params.studentName - Student name
   * @param {Object|null} params.user - User object
   * @returns {Promise<Object>} - Result object with duration
   */
  async endSession({ code, studentName, user }) {
    const classroom = await this.getClassroom(code, user);
    
    if (!classroom) {
      return { success: false, error: 'Classroom not found' };
    }

    if (classroom.source === 'firestore') {
      try {
        const duration = await firestoreService.endSession({
          classroomId: classroom.id,
          studentName,
          userId: user ? user.uid : null
        });
        if (duration !== null) {
          return { success: true, duration };
        } else {
          return { success: false, error: 'Failed to end session' };
        }
      } catch (error) {
        console.error('[ClassroomManager] Failed to end session in Firestore:', error.message);
        return { success: false, error: 'Failed to end session' };
      }
    } else {
      // Memory mode
      const duration = classroomStore.endSession(code, studentName);
      if (duration !== null) {
        return { success: true, duration };
      } else {
        return { success: false, error: 'Failed to end session' };
      }
    }
  }

  /**
   * Get leaderboard
   * @param {string} code - Classroom code
   * @param {Object|null} user - User object
   * @returns {Promise<Array|null>} - Leaderboard or null
   */
  async getLeaderboard(code, user) {
    const classroom = await this.getClassroom(code, user);
    
    if (!classroom) {
      return null;
    }

    if (classroom.source === 'firestore') {
      try {
        return await firestoreService.getLeaderboard(classroom.id);
      } catch (error) {
        console.error('[ClassroomManager] Failed to get leaderboard from Firestore:', error.message);
        return null;
      }
    } else {
      // Memory mode
      return classroomStore.getLeaderboard(code);
    }
  }

  /**
   * Get student status
   * @param {Object} params
   * @param {string} params.code - Classroom code
   * @param {string} params.studentName - Student name
   * @param {Object|null} params.user - User object
   * @returns {Promise<Object|null>} - Student status or null
   */
  async getStudentStatus({ code, studentName, user }) {
    const classroom = await this.getClassroom(code, user);
    
    if (!classroom) {
      return null;
    }

    if (classroom.source === 'firestore') {
      try {
        return await firestoreService.getStudentStatus({
          classroomId: classroom.id,
          studentName,
          userId: user ? user.uid : null
        });
      } catch (error) {
        console.error('[ClassroomManager] Failed to get student status from Firestore:', error.message);
        return null;
      }
    } else {
      // Memory mode
      return classroomStore.getStudentStatus(code, studentName);
    }
  }

  /**
   * Swap words between students
   * @param {Object} params
   * @param {string} params.code - Classroom code
   * @param {string} params.studentA - Student A name
   * @param {string} params.wordA - Word from student A
   * @param {string} params.studentB - Student B name
   * @param {string} params.wordB - Word from student B
   * @param {Object|null} params.user - User object
   * @returns {Promise<Object>} - Result object
   */
  async swapWords({ code, studentA, wordA, studentB, wordB, user }) {
    const classroom = await this.getClassroom(code, user);
    
    if (!classroom) {
      return { success: false, error: 'Classroom not found' };
    }

    if (classroom.source === 'firestore') {
      try {
        return await firestoreService.swapWords({
          classroomId: classroom.id,
          studentA,
          wordA,
          studentB,
          wordB
        });
      } catch (error) {
        console.error('[ClassroomManager] Failed to swap words in Firestore:', error.message);
        return { success: false, error: 'Failed to swap words' };
      }
    } else {
      // Memory mode
      return classroomStore.swapWords(code, studentA, wordA, studentB, wordB);
    }
  }

  /**
   * Record practice result
   * @param {Object} params
   * @param {string} params.code - Classroom code
   * @param {string} params.studentName - Student name
   * @param {string} params.word - Word practiced
   * @param {boolean} params.correct - Whether answer was correct
   * @param {Object|null} params.user - User object
   * @returns {Promise<Object>} - Result object
   */
  async recordPractice({ code, studentName, word, correct, user }) {
    const classroom = await this.getClassroom(code, user);
    
    if (!classroom) {
      return { success: false, error: 'Classroom not found' };
    }

    if (classroom.source === 'firestore') {
      try {
        return await firestoreService.recordPractice({
          classroomId: classroom.id,
          studentName,
          word,
          correct,
          userId: user ? user.uid : null
        });
      } catch (error) {
        console.error('[ClassroomManager] Failed to record practice in Firestore:', error.message);
        return { success: false, error: 'Failed to record practice' };
      }
    } else {
      // Memory mode
      return classroomStore.recordPracticeResult(code, studentName, word, correct);
    }
  }
}

module.exports = new ClassroomManager();
