const express = require('express');
const router = express.Router();
const {
  identifyTreePhoto,
  createTreeLog,
  getMyTreeLogs,
  getAllTreeLogs,
  getTreeQRCode,
  getPublicTreeDetails,
  reviewTreeLog,
} = require('../controllers/treeLogController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public route for anyone scanning the QR code
router.get('/public/:id', getPublicTreeDetails);

router.post('/identify', upload.single('photo'), identifyTreePhoto);
router.post('/', protect, upload.single('photo'), createTreeLog);
router.get('/my', protect, getMyTreeLogs);
router.get('/:id/qr', protect, getTreeQRCode);
router.get('/', protect, adminOnly, getAllTreeLogs);
router.put('/:id/review', protect, adminOnly, reviewTreeLog);

module.exports = router;
