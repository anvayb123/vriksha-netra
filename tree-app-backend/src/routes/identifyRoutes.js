const express = require('express');
const router = express.Router();
const multer = require('multer');
const { identifyWithBestAI } = require('../utils/aiOrchestrator');
const { identifyFromDatabase } = require('../utils/indianPlantDb');

// In-memory storage for plant identification
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB max
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, true); // Accept and attempt processing
    }
  },
});

// Middleware to safely handle both multipart/form-data AND application/json
const safeUploadMiddleware = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.toLowerCase().includes('multipart/form-data')) {
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.warn('⚠️ Multer upload warning in /api/identify:', err.message);
      }
      next();
    });
  } else {
    // JSON or urlencoded, already parsed by express.json
    next();
  }
};

// @route  POST /api/identify
// @desc   Identify a plant from a photo using Multiple AI APIs (Groq Vision / Plant.id / PlantNet)
//         Supports:
//         1. Multipart upload with field 'image' or 'photo'
//         2. JSON payload: { base64: "..." } or { image: "..." }
// @access Public
router.post('/', safeUploadMiddleware, async (req, res) => {
  try {
    let imageBuffer = null;

    // Check multipart file
    if (req.file && req.file.buffer && req.file.buffer.length > 0) {
      imageBuffer = req.file.buffer;
    }

    // Check JSON body for base64
    if (!imageBuffer && req.body) {
      const b64 = req.body.base64 || req.body.image;
      if (b64 && typeof b64 === 'string') {
        const cleanB64 = b64.replace(/^data:image\/\w+;base64,/, '');
        try {
          imageBuffer = Buffer.from(cleanB64, 'base64');
        } catch (b64Err) {
          console.warn('Failed to parse base64 image:', b64Err.message);
        }
      }
    }

    if (!imageBuffer || imageBuffer.length < 32) {
      return res.status(400).json({
        success: false,
        identified: false,
        message: 'No valid image provided. Please upload or take a plant photo.',
      });
    }

    console.log(`📸 Received plant image for identification (${(imageBuffer.length / 1024).toFixed(1)} KB)`);

    // Step 1: Call AI Orchestrator (Groq Vision first, fallback to Plant.id/PlantNet)
    const apiResult = await identifyWithBestAI(imageBuffer);

    if (!apiResult || !apiResult.identified) {
      return res.json({
        success: false,
        identified: false,
        message: apiResult?.message || 'Could not identify the plant. Please try with a clearer photo.',
      });
    }

    // Step 2: Try to match against Indian plant database for extra info
    let localMatch = null;
    if (apiResult.commonName && apiResult.commonName !== 'Unknown') {
      localMatch = identifyFromDatabase(apiResult.commonName);
    }
    if (!localMatch && apiResult.scientificName && apiResult.scientificName !== 'Unknown') {
      localMatch = identifyFromDatabase(apiResult.scientificName);
    }

    // Step 3: Build enriched response
    const response = {
      success: true,
      identified: true,
      aiSource: apiResult.source || 'AI Vision',
      scientificName: apiResult.scientificName || 'Unknown',
      commonName: apiResult.commonName || 'Unknown',
      allCommonNames: apiResult.allCommonNames || [],
      confidence: apiResult.confidence || 85,
      family: apiResult.family || 'Unknown',
      genus: apiResult.genus || 'Unknown',
      type: apiResult.type || 'Tree',
      healthStatus: apiResult.healthStatus || 'Healthy',
      careTips: apiResult.careTips || '',
      uses: apiResult.uses || '',
      allResults: apiResult.allResults || [],
      localMatch: localMatch
        ? {
            name: localMatch.plant.name,
            hindi: localMatch.plant.hindi,
            uses: localMatch.plant.uses,
            habitat: localMatch.plant.habitat,
            type: localMatch.plant.type,
            family: localMatch.plant.family,
            matchScore: localMatch.score,
          }
        : null,
    };

    res.json(response);
  } catch (error) {
    console.error('Plant identification error:', error.message);
    res.status(500).json({
      success: false,
      identified: false,
      message: 'Identification service temporarily unavailable. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
