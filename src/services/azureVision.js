/**
 * Azure Computer Vision Service
 * Provides OCR text extraction and image analysis using Azure Cognitive Services
 */

const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { CognitiveServicesCredentials } = require('@azure/ms-rest-azure-js');
const Stream = require('stream');

// Configuration constants
const MAX_RETRIES = 10;
const POLLING_INTERVAL_MS = 1000;

let visionClient = null;
let initialized = false;

/**
 * Initialize Azure Computer Vision client
 * @returns {ComputerVisionClient|null} - Initialized client or null if config missing
 */
function initializeVisionClient() {
  if (initialized) {
    return visionClient;
  }

  const key = process.env.AZURE_VISION_KEY;
  const endpoint = process.env.AZURE_VISION_ENDPOINT;

  if (!key || !endpoint) {
    console.warn('⚠️ Warning: AZURE_VISION_KEY or AZURE_VISION_ENDPOINT not set');
    console.warn('⚠️ Azure Computer Vision features will not work');
    return null;
  }

  try {
    const credentials = new CognitiveServicesCredentials(key);
    visionClient = new ComputerVisionClient(credentials, endpoint);
    initialized = true;
    console.log('✅ Azure Computer Vision client initialized successfully');
    return visionClient;
  } catch (error) {
    console.error('❌ Failed to initialize Azure Computer Vision client:', error.message);
    return null;
  }
}

/**
 * Extract text from image using Azure Read API (OCR)
 * @param {string} imageUrl - Public URL of the image
 * @returns {Promise<Object>} - Extracted text and metadata
 */
async function extractText(imageUrl) {
  const client = initializeVisionClient();
  if (!client) {
    throw new Error('Azure Computer Vision client not initialized');
  }

  try {
    console.log('🔍 Starting OCR for image:', imageUrl);

    // Start the read operation
    const readResult = await client.read(imageUrl, {
      language: 'zh-Hant' // Support Traditional Chinese
    });

    // Get operation ID from the operation location URL
    const operationId = readResult.operationLocation.split('/').slice(-1)[0];

    // Poll for the result
    let result;
    let status;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
      result = await client.getReadResult(operationId);
      status = result.status;

      if (status === 'succeeded') {
        break;
      } else if (status === 'failed') {
        throw new Error('OCR operation failed');
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
      retryCount++;
    }

    if (status !== 'succeeded') {
      throw new Error('OCR operation timed out');
    }

    // Extract text from all pages
    const pages = result.analyzeResult.readResults;
    const allText = [];
    const allLines = [];

    for (const page of pages) {
      for (const line of page.lines) {
        allText.push(line.text);
        allLines.push({
          text: line.text,
          boundingBox: line.boundingBox,
          words: line.words.map(word => ({
            text: word.text,
            boundingBox: word.boundingBox,
            confidence: word.confidence
          }))
        });
      }
    }

    console.log('✅ OCR completed, extracted', allLines.length, 'lines');

    return {
      text: allText.join('\n'),
      lines: allLines,
      language: result.analyzeResult.readResults[0]?.language || 'unknown'
    };
  } catch (error) {
    console.error('❌ OCR error:', error.message);
    throw new Error('Failed to extract text: ' + error.message);
  }
}

/**
 * Extract text from image buffer using Azure Read API
 * @param {Buffer} buffer - Image buffer
 * @param {string} contentType - MIME type of the image (optional)
 * @returns {Promise<Object>} - Extracted text and metadata
 */
async function extractTextFromBuffer(buffer, contentType) {
  const client = initializeVisionClient();
  if (!client) {
    throw new Error('Azure Computer Vision client not initialized');
  }

  try {
    console.log('🔍 Starting OCR (buffer)');

    // Start the read operation from buffer
    const readResult = await client.readInStream(buffer, { language: 'zh-Hant' });

    // Get operation ID from the operation location URL
    const operationId = readResult.operationLocation.split('/').slice(-1)[0];

    // Poll for the result
    let result;
    let status;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
      result = await client.getReadResult(operationId);
      status = result.status;

      if (status === 'succeeded') {
        break;
      } else if (status === 'failed') {
        throw new Error('OCR operation failed');
      }

      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
      retryCount++;
    }

    if (status !== 'succeeded') {
      throw new Error('OCR operation timed out');
    }

    const pages = result.analyzeResult.readResults;
    const allText = [];
    const allLines = [];

    for (const page of pages) {
      for (const line of page.lines) {
        allText.push(line.text);
        allLines.push({
          text: line.text,
          boundingBox: line.boundingBox,
          words: line.words.map(word => ({
            text: word.text,
            boundingBox: word.boundingBox,
            confidence: word.confidence
          }))
        });
      }
    }

    console.log('✅ OCR (buffer) completed, extracted', allLines.length, 'lines');

    return {
      text: allText.join('\n'),
      lines: allLines,
      language: result.analyzeResult.readResults[0]?.language || 'unknown'
    };
  } catch (error) {
    console.error('❌ OCR (buffer) error:', error.message);
    throw new Error('Failed to extract text: ' + error.message);
  }
}

/**
 * Analyze image for tags, description, objects, and colors
 * @param {string} imageUrl - Public URL of the image
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeImage(imageUrl) {
  const client = initializeVisionClient();
  if (!client) {
    throw new Error('Azure Computer Vision client not initialized');
  }

  try {
    console.log('🔍 Starting image analysis:', imageUrl);

    // Analyze image with all features
    const analysis = await client.analyzeImage(imageUrl, {
      visualFeatures: ['Tags', 'Description', 'Objects', 'Color', 'Categories']
    });

    console.log('✅ Image analysis completed');

    return {
      tags: analysis.tags.map(tag => ({
        name: tag.name,
        confidence: tag.confidence
      })),
      description: {
        captions: analysis.description.captions.map(caption => ({
          text: caption.text,
          confidence: caption.confidence
        })),
        tags: analysis.description.tags
      },
      objects: analysis.objects.map(obj => ({
        name: obj.object,
        confidence: obj.confidence,
        boundingBox: obj.rectangle
      })),
      categories: analysis.categories.map(cat => ({
        name: cat.name,
        score: cat.score
      })),
      colors: {
        dominant: analysis.color.dominantColors,
        accent: analysis.color.accentColor
      }
    };
  } catch (error) {
    console.error('❌ Image analysis error:', error.message);
    throw new Error('Failed to analyze image: ' + error.message);
  }
}

/**
 * Analyze image from buffer using Azure analyzeImageInStream
 * @param {Buffer} buffer - Image buffer
 * @param {string} contentType - MIME type (optional)
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeImageFromBuffer(buffer, contentType) {
  const client = initializeVisionClient();
  if (!client) {
    throw new Error('Azure Computer Vision client not initialized');
  }

  try {
    console.log('🔍 Starting image analysis (buffer)');

    const analysis = await client.analyzeImageInStream(buffer, {
      visualFeatures: ['Tags', 'Description', 'Objects', 'Color', 'Categories']
    });

    console.log('✅ Image analysis (buffer) completed');

    return {
      tags: analysis.tags.map(tag => ({
        name: tag.name,
        confidence: tag.confidence
      })),
      description: {
        captions: analysis.description.captions.map(caption => ({
          text: caption.text,
          confidence: caption.confidence
        })),
        tags: analysis.description.tags
      },
      objects: analysis.objects.map(obj => ({
        name: obj.object,
        confidence: obj.confidence,
        boundingBox: obj.rectangle
      })),
      categories: analysis.categories.map(cat => ({
        name: cat.name,
        score: cat.score
      })),
      colors: {
        dominant: analysis.color.dominantColors,
        accent: analysis.color.accentColor
      }
    };
  } catch (error) {
    console.error('❌ Image analysis (buffer) error:', error.message);
    throw new Error('Failed to analyze image: ' + error.message);
  }
}

/**
 * Perform complete analysis: OCR + Image Analysis
 * Runs both operations in parallel for better performance
 * @param {string} imageUrl - Public URL of the image
 * @returns {Promise<Object>} - Combined analysis results
 */
async function completeAnalysis(imageUrl) {
  const client = initializeVisionClient();
  if (!client) {
    throw new Error('Azure Computer Vision client not initialized');
  }

  try {
    console.log('🔍 Starting complete analysis:', imageUrl);

    // Run OCR and image analysis in parallel
    const [ocrResult, analysisResult] = await Promise.all([
      extractText(imageUrl),
      analyzeImage(imageUrl)
    ]);

    console.log('✅ Complete analysis finished');

    return {
      ocr: ocrResult,
      analysis: analysisResult
    };
  } catch (error) {
    console.error('❌ Complete analysis error:', error.message);
    throw new Error('Failed to perform complete analysis: ' + error.message);
  }
}

/**
 * Perform complete analysis from a buffer (OCR + Image Analysis)
 * @param {Buffer} buffer - Image buffer
 * @param {string} contentType - MIME type (optional)
 * @returns {Promise<Object>} - Combined analysis results
 */
async function completeAnalysisFromBuffer(buffer, contentType) {
  const client = initializeVisionClient();
  if (!client) {
    throw new Error('Azure Computer Vision client not initialized');
  }

  try {
    console.log('🔍 Starting complete analysis (buffer)');

    const [ocrResult, analysisResult] = await Promise.all([
      extractTextFromBuffer(buffer, contentType),
      analyzeImageFromBuffer(buffer, contentType)
    ]);

    console.log('✅ Complete analysis (buffer) finished');

    return {
      ocr: ocrResult,
      analysis: analysisResult
    };
  } catch (error) {
    console.error('❌ Complete analysis (buffer) error:', error.message);
    throw new Error('Failed to perform complete analysis: ' + error.message);
  }
}

module.exports = {
  initializeVisionClient,
  extractText,
  analyzeImage,
  completeAnalysis,
  extractTextFromBuffer,
  analyzeImageFromBuffer,
  completeAnalysisFromBuffer,
  isInitialized: () => initialized
};
