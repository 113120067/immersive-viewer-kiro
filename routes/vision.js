/**
 * Vision API Routes
 * Handles image upload, OCR, and Azure Computer Vision analysis
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const azureVision = require('../src/services/azureVision');

// Configure multer for image uploads (5MB limit, images only)
const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: IMAGE_SIZE_LIMIT
  },
  fileFilter: function (req, file, cb) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/bmp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, BMP) are allowed'));
    }
  }
});

// This route implementation now performs analysis directly on the uploaded buffer
// and does not persist images or analysis results to cloud storage or Firestore.

/**
 * POST /vision/analyze
 * Upload image and perform complete analysis (OCR + Image Analysis)
 */
router.post('/analyze', imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }

    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    console.log('📤 Processing image upload (buffer analysis):', req.file.originalname);

    // Perform complete analysis directly on the uploaded buffer
    const result = await azureVision.completeAnalysisFromBuffer(req.file.buffer, req.file.mimetype);

    // Return results without persisting image or analysis
    return res.json({
      success: true,
      analysisId: null,
      imageUrl: null,
      result: {
        ocr: result.ocr,
        analysis: result.analysis
      }
    });
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Analysis failed: ' + error.message
    });
  }
});

/**
 * POST /vision/ocr-only
 * Upload image and perform OCR text extraction only
 */
router.post('/ocr-only', imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }

    console.log('📤 Processing OCR-only request (buffer) :', req.file.originalname);

    // Perform OCR on buffer
    const ocrResult = await azureVision.extractTextFromBuffer(req.file.buffer, req.file.mimetype);

    return res.json({
      success: true,
      imageUrl: null,
      result: ocrResult
    });
  } catch (error) {
    console.error('❌ OCR error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'OCR failed: ' + error.message
    });
  }
});

/**
 * GET /vision/analysis/:id
 * Retrieve a specific analysis result
 */
router.get('/analysis/:id', async (req, res) => {
  try {
    // Persistence is disabled in this deployment. Stored analysis lookup is not available.
    return res.status(410).json({
      success: false,
      error: 'Persistence disabled: analysis storage not available'
    });
  } catch (error) {
    console.error('❌ Retrieval error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis: ' + error.message
    });
  }
});

/**
 * GET /vision/search
 * Search analysis results by text or tags
 * Query parameters:
 *   - userId: Filter by user ID (required)
 *   - query: Search term
 *   - type: 'text' or 'tags' (default: 'text')
 *   - limit: Max results (default: 20)
 */
router.get('/search', async (req, res) => {
  try {
    // Persistence is disabled for this deployment. Return empty results.
    return res.json({
      success: true,
      count: 0,
      results: []
    });
  } catch (error) {
    console.error('❌ Search error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Search failed: ' + error.message
    });
  }
});

/**
 * Error handler for multer errors
 */
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File size exceeds limit (${IMAGE_SIZE_LIMIT / (1024 * 1024)}MB)`
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error: ' + err.message
    });
  }
  // Pass other errors to next handler
  next(err);
});

module.exports = router;
