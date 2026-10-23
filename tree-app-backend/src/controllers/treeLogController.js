const TreeLog = require('../models/TreeLog');
const Species = require('../models/Species');
const QRCode = require('qrcode');
const { uploadImageBuffer } = require('../utils/cloudinary');
const { identifyWithBestAI } = require('../utils/aiOrchestrator');
const { matchAgainstDropdown } = require('../utils/fuzzyMatch');

// @route  POST /api/tree-logs/identify
// Photo leke AI se identify karwata hai, dropdown ke against match karta hai.
const identifyTreePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo provided' });
    }

    const { driveId } = req.body;

    // Get species pool from database
    let speciesPool;
    if (driveId) {
      const Drive = require('../models/Drive');
      const drive = await Drive.findById(driveId).populate('speciesAllowed');
      speciesPool = drive ? drive.speciesAllowed.filter(s => s.isActive) : [];
    }
    if (!speciesPool || speciesPool.length === 0) {
      speciesPool = await Species.find({ isActive: true }).lean();
    }

    const aiResult = await identifyWithBestAI(req.file.buffer);

    if (!aiResult.identified) {
      return res.json({
        matched: false,
        rawGuess: null,
        confidence: 0,
        message: 'AI could not identify anything. Please pick species manually.',
      });
    }

    const rawGuess = aiResult.commonName !== 'Unknown' ? aiResult.commonName : aiResult.scientificName;
    const match = matchAgainstDropdown(rawGuess, speciesPool);
    if (match) {
      return res.json({
        matched: true,
        speciesId: match.species._id,
        speciesName: match.species.name,
        confidence: aiResult.confidence,
        matchScore: Math.round(match.matchScore * 100),
      });
    }

    return res.json({
      matched: false,
      rawGuess: aiResult.rawGuess,
      confidence: aiResult.confidence,
      message: 'No confident match in dropdown. This may be a new species - will be flagged for review.',
    });
  } catch (error) {
    res.status(500).json({ message: 'AI identification failed', error: error.message });
  }
};

const mongoose = require('mongoose');

// @route  POST /api/tree-logs
// Final save - photo upload to Cloudinary + TreeLog entry in MongoDB
const createTreeLog = async (req, res) => {
  try {
    const { driveId, speciesId, count, rawGuess, aiConfidence, latitude, longitude } = req.body;

    let photoUrl = '';
    if (req.file) {
      try {
        const uploadResult = await uploadImageBuffer(req.file.buffer, 'tree-logs');
        photoUrl = uploadResult.secure_url;
      } catch (uploadErr) {
        console.warn('Cloudinary upload warning:', uploadErr.message);
      }
    }

    // Resolve speciesId safely (could be ObjectId or name string from offline mode)
    let resolvedSpeciesId = null;
    if (speciesId) {
      if (mongoose.Types.ObjectId.isValid(speciesId)) {
        resolvedSpeciesId = speciesId;
      } else {
        const matched = await Species.findOne({
          $or: [
            { name: new RegExp(`^${speciesId}$`, 'i') },
            { commonNames: new RegExp(speciesId, 'i') },
          ],
        });
        if (matched) resolvedSpeciesId = matched._id;
      }
    }

    const resolvedDriveId = (driveId && mongoose.Types.ObjectId.isValid(driveId)) ? driveId : null;
    const flagged = !resolvedSpeciesId;

    const treeLog = await TreeLog.create({
      user: req.user._id,
      drive: resolvedDriveId,
      species: resolvedSpeciesId,
      count: count ? Number(count) : 1,
      photoUrl,
      aiRawGuess: rawGuess || (speciesId && !resolvedSpeciesId ? speciesId : ''),
      aiConfidenceScore: aiConfidence ? Number(aiConfidence) : null,
      flaggedForReview: flagged,
      reviewedByAdmin: false,
      location: (latitude && longitude) ? {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      } : undefined,
    });

    // Update user's denormalized tree count
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalTreesPlanted: treeLog.count },
    });

    res.status(201).json(treeLog);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/tree-logs/my  (volunteer apni history dekhta hai)
const getMyTreeLogs = async (req, res) => {
  try {
    const logs = await TreeLog.find({ user: req.user._id })
      .populate('species', 'name scientificName hindi')
      .populate('drive', 'name date')
      .sort({ createdAt: -1 })
      .lean();

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/tree-logs  (admin - all logs, with optional filters)
const getAllTreeLogs = async (req, res) => {
  try {
    const { driveId, flaggedOnly } = req.query;
    const filter = {};
    if (driveId) filter.drive = driveId;
    if (flaggedOnly === 'true') filter.flaggedForReview = true;

    const logs = await TreeLog.find(filter)
      .populate('user', 'name email totalTreesPlanted')
      .populate('species', 'name scientificName hindi family type uses habitat referenceImageUrl')
      .populate('drive', 'name date location')
      .sort({ createdAt: -1 })
      .lean();

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/tree-logs/:id/qr  (generate QR code for a specific tree log)
const getTreeQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Tree ID' });
    }

    const log = await TreeLog.findById(id)
      .populate('user', 'name email totalTreesPlanted')
      .populate('species', 'name scientificName hindi family type uses habitat referenceImageUrl')
      .populate('drive', 'name date location')
      .lean();

    if (!log) {
      return res.status(404).json({ message: 'Tree record not found' });
    }

    // Host URL for public scanning
    const host = req.get('host');
    const protocol = req.protocol;
    const publicUrl = `${protocol}://${host}/tree/${log._id}`;

    // High quality QR Code Data URL
    const qrCodeUrl = await QRCode.toDataURL(publicUrl, {
      width: 450,
      margin: 2,
      color: {
        dark: '#020906',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    res.json({
      success: true,
      qrCodeUrl,
      publicUrl,
      tree: {
        _id: log._id,
        treeName: log.species?.name || log.aiRawGuess || 'Planted Tree',
        scientificName: log.species?.scientificName || '',
        hindiName: log.species?.hindi || '',
        family: log.species?.family || '',
        type: log.species?.type || 'Tree',
        uses: log.species?.uses || '',
        habitat: log.species?.habitat || '',
        photoUrl: log.photoUrl || log.species?.referenceImageUrl || '',
        plantedBy: log.user?.name || 'Green Volunteer',
        plantedByEmail: log.user?.email || '',
        plantedByTreesTotal: log.user?.totalTreesPlanted || 1,
        plantedDate: log.createdAt,
        driveName: log.drive?.name || 'Independent Plantation',
        location: log.location,
        count: log.count || 1,
        aiConfidenceScore: log.aiConfidenceScore,
        reviewedByAdmin: log.reviewedByAdmin,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate QR code', error: error.message });
  }
};

// @route  GET /api/tree-logs/public/:id  (Public details for QR scanner)
const getPublicTreeDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Tree ID' });
    }

    const log = await TreeLog.findById(id)
      .populate('user', 'name email totalTreesPlanted')
      .populate('species', 'name scientificName hindi family type uses habitat referenceImageUrl')
      .populate('drive', 'name date location')
      .lean();

    if (!log) {
      return res.status(404).json({ message: 'Tree record not found' });
    }

    res.json({
      success: true,
      tree: {
        _id: log._id,
        treeName: log.species?.name || log.aiRawGuess || 'Planted Tree',
        scientificName: log.species?.scientificName || '',
        hindiName: log.species?.hindi || '',
        family: log.species?.family || '',
        type: log.species?.type || 'Tree',
        uses: log.species?.uses || '',
        habitat: log.species?.habitat || '',
        photoUrl: log.photoUrl || log.species?.referenceImageUrl || '',
        plantedBy: log.user?.name || 'Green Volunteer',
        plantedByEmail: log.user?.email || '',
        plantedByTreesTotal: log.user?.totalTreesPlanted || 1,
        plantedDate: log.createdAt,
        driveName: log.drive?.name || 'Independent Plantation',
        location: log.location,
        count: log.count || 1,
        aiConfidenceScore: log.aiConfidenceScore,
        reviewedByAdmin: log.reviewedByAdmin,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  PUT /api/tree-logs/:id/review  (admin resolves a flagged entry)
const reviewTreeLog = async (req, res) => {
  try {
    const { speciesId } = req.body;

    const log = await TreeLog.findByIdAndUpdate(
      req.params.id,
      {
        species: speciesId,
        flaggedForReview: false,
        reviewedByAdmin: true,
      },
      { new: true }
    )
      .populate('species', 'name')
      .populate('user', 'name');

    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  identifyTreePhoto,
  createTreeLog,
  getMyTreeLogs,
  getAllTreeLogs,
  getTreeQRCode,
  getPublicTreeDetails,
  reviewTreeLog,
};
