const express = require('express');
const router = express.Router();
const { createMemoryUpload, handleMulterError } = require('../src/config/multer-config');
const { extractTextFromBuffer, tokenizeText, FILE_FORMATS } = require('../src/utils/file-processor');
const classroomStore = require('../src/utils/classroom-store');
const classroomManager = require('../src/services/classroom-manager');
const { verifyIdToken } = require('../src/middleware/auth-middleware');
const firestoreService = require('../src/services/firestore-classroom-service');

// Configure file upload
const upload = createMemoryUpload(FILE_FORMATS.getVocabFormats());

/**
 * GET /classroom - Classroom home page
 */
router.get('/', (req, res) => {
  res.render('classroom/index', { title: 'Classroom' });
});

/**
 * GET /classroom/create - Teacher create classroom page
 */
router.get('/create', (req, res) => {
  res.render('classroom/create', { title: 'Create Classroom' });
});

/**
 * POST /classroom/create - Create classroom and upload words
 */
router.post('/create', verifyIdToken({ optional: true }), upload.single('file'), async (req, res) => {
  try {
    const { classroomName } = req.body;
    
    if (!classroomName) {
      return res.status(400).json({ success: false, error: 'Classroom name is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Extract text and tokenize
    const text = await extractTextFromBuffer(req.file.buffer, req.file.originalname);
    const words = tokenizeText(text);
    
    if (words.length === 0) {
      return res.status(400).json({ success: false, error: 'No words found in the file' });
    }
    
    // Create classroom using manager (dual-mode)
    const classroom = await classroomManager.createClassroom({
      name: classroomName,
      words,
      user: req.user
    });
    
    res.json({
      success: true,
      code: classroom.code,
      name: classroom.name,
      wordCount: classroom.wordCount,
      mode: classroom.source
    });
  } catch (error) {
    console.error('Error creating classroom:', error);
    res.status(500).json({ success: false, error: 'Failed to create classroom: ' + error.message });
  }
});

/**
 * GET /classroom/teacher/:code - Teacher control panel
 */
router.get('/teacher/:code', (req, res) => {
  const classroom = classroomStore.getClassroom(req.params.code);
  
  if (!classroom) {
    return res.render('error', { 
      message: 'Classroom not found',
      error: { status: 404, stack: 'The classroom code is invalid or has expired.' }
    });
  }
  
  res.render('classroom/teacher', { 
    title: 'Teacher Control Panel',
    classroom: classroom
  });
});

/**
 * GET /classroom/join - Student join page
 */
router.get('/join', (req, res) => {
  res.render('classroom/join', { title: 'Join Classroom' });
});

/**
 * POST /classroom/join - Student join classroom
 */
router.post('/join', verifyIdToken({ optional: true }), async (req, res) => {
  const { code, studentName } = req.body;
  
  if (!code || !studentName) {
    return res.status(400).json({ success: false, error: 'Code and name are required' });
  }
  
  const result = await classroomManager.joinClassroom({
    code,
    studentName: studentName.trim(),
    user: req.user
  });
  
  if (!result.success) {
    return res.status(404).json(result);
  }
  
  res.json(result);
});

/**
 * GET /classroom/student/:code/:name - Student learning page
 */
router.get('/student/:code/:name', (req, res) => {
  const { code, name } = req.params;
  const classroom = classroomStore.getClassroom(code);
  
  if (!classroom) {
    return res.render('error', {
      message: 'Classroom not found',
      error: { status: 404, stack: 'The classroom code is invalid or has expired.' }
    });
  }
  
  // Find the student's personal word list (fallback to classroom.words)
  const studentObj = classroom.students.find(s => s.name === decodeURIComponent(name));
  const studentWords = studentObj && Array.isArray(studentObj.words) ? studentObj.words : classroom.words;

  res.render('classroom/student', {
    title: 'Learning Session',
    classroom: classroom,
    studentName: decodeURIComponent(name),
    studentWords: studentWords
  });
});

/**
 * POST /classroom/api/session/start - Start learning session
 */
router.post('/api/session/start', verifyIdToken({ optional: true }), async (req, res) => {
  const { code, studentName } = req.body;
  
  const result = await classroomManager.startSession({
    code,
    studentName,
    user: req.user
  });
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

/**
 * POST /classroom/api/session/end - End learning session
 */
router.post('/api/session/end', verifyIdToken({ optional: true }), async (req, res) => {
  const { code, studentName } = req.body;
  
  const result = await classroomManager.endSession({
    code,
    studentName,
    user: req.user
  });
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json(result);
});

/**
 * GET /classroom/api/leaderboard/:code - Get classroom leaderboard
 */
router.get('/api/leaderboard/:code', verifyIdToken({ optional: true }), async (req, res) => {
  const leaderboard = await classroomManager.getLeaderboard(req.params.code, req.user);
  
  if (!leaderboard) {
    return res.status(404).json({ success: false, error: 'Classroom not found' });
  }
  
  res.json({ success: true, leaderboard: leaderboard });
});

/**
 * GET /classroom/api/status/:code/:name - Get student status
 */
router.get('/api/status/:code/:name', verifyIdToken({ optional: true }), async (req, res) => {
  const { code, name } = req.params;
  const status = await classroomManager.getStudentStatus({
    code,
    studentName: decodeURIComponent(name),
    user: req.user
  });
  
  if (!status) {
    return res.status(404).json({ success: false, error: 'Student or classroom not found' });
  }
  
  res.json({ success: true, status: status });
});

/**
 * POST /classroom/api/word/swap - Swap words between students
 * body: { code, studentA, wordA, studentB, wordB }
 */
router.post('/api/word/swap', verifyIdToken({ optional: true }), async (req, res) => {
  const { code, studentA, wordA, studentB, wordB } = req.body;
  if (!code || !studentA || !studentB || !wordA || !wordB) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  const result = await classroomManager.swapWords({
    code,
    studentA,
    wordA,
    studentB,
    wordB,
    user: req.user
  });
  
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

/**
 * POST /classroom/api/word/remove/request - Request to remove a word from a student (creates a voting request)
 * body: { code, targetStudent, word, requestedBy }
 */
router.post('/api/word/remove/request', (req, res) => {
  const { code, targetStudent, word, requestedBy } = req.body;
  if (!code || !targetStudent || !word || !requestedBy) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  const result = classroomStore.requestRemoveWord(code, targetStudent, word, requestedBy);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  res.json({ success: true, requestId: result.requestId });
});

/**
 * POST /classroom/api/word/remove/vote - Vote to approve a remove request
 * body: { code, requestId, voterName }
 */
router.post('/api/word/remove/vote', (req, res) => {
  const { code, requestId, voterName } = req.body;
  if (!code || !requestId || !voterName) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  const result = classroomStore.voteRemoveRequest(code, requestId, voterName);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  // Return updated request status
  const reqStatus = classroomStore.getRemoveRequest(code, requestId);
  res.json({ success: true, request: reqStatus });
});

/**
 * GET /classroom/api/word/remove/:code/:requestId - Get remove request status
 */
router.get('/api/word/remove/:code/:requestId', (req, res) => {
  const { code, requestId } = req.params;
  const reqStatus = classroomStore.getRemoveRequest(code, requestId);
  if (!reqStatus) return res.status(404).json({ success: false, error: 'Request not found' });
  res.json({ success: true, request: reqStatus });
});

/**
 * GET /classroom/api/word/remove/list/:code - list all remove requests for a classroom
 */
router.get('/api/word/remove/list/:code', (req, res) => {
  const { code } = req.params;
  const list = classroomStore.getAllRemoveRequests(code);
  res.json({ success: true, requests: list });
});

/**
 * POST /classroom/api/word/practice - record a practice attempt
 * body: { code, studentName, word, correct }
 */
router.post('/api/word/practice', verifyIdToken({ optional: true }), async (req, res) => {
  const { code, studentName, word, correct } = req.body;
  if (!code || !studentName || !word || typeof correct === 'undefined') {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  const result = await classroomManager.recordPractice({
    code,
    studentName,
    word,
    correct: !!correct,
    user: req.user
  });
  
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

/**
 * GET /classroom/my - My Classrooms page
 */
router.get('/my', (req, res) => {
  res.render('classroom/my', { title: 'My Classrooms' });
});

/**
 * GET /classroom/progress/:classroomId - Learning Progress page
 */
router.get('/progress/:classroomId', (req, res) => {
  res.render('classroom/progress', { 
    title: 'Learning Progress',
    classroomId: req.params.classroomId 
  });
});

/**
 * GET /classroom/api/my-classrooms - Get user's owned classrooms
 */
router.get('/api/my-classrooms', verifyIdToken(), async (req, res) => {
  try {
    const classrooms = await firestoreService.getMyClassrooms(req.user.uid);
    res.json({ success: true, classrooms });
  } catch (error) {
    console.error('Error fetching my classrooms:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /classroom/api/my-participations - Get user's participated classrooms
 */
router.get('/api/my-participations', verifyIdToken(), async (req, res) => {
  try {
    const participations = await firestoreService.getMyParticipations(req.user.uid);
    res.json({ success: true, participations });
  } catch (error) {
    console.error('Error fetching my participations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /classroom/api/progress/:classroomId - Get student progress
 */
router.get('/api/progress/:classroomId', verifyIdToken(), async (req, res) => {
  try {
    const classroomId = req.params.classroomId;
    
    // Validate classroomId format (Firestore document IDs are alphanumeric with some special chars)
    if (!classroomId || !/^[a-zA-Z0-9_-]{1,100}$/.test(classroomId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid classroom ID format' 
      });
    }
    
    const progress = await firestoreService.getStudentProgress({
      classroomId,
      userId: req.user.uid
    });
    res.json({ success: true, ...progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handler
router.use(handleMulterError);

module.exports = router;
