const express = require('express');
const router = express.Router();
const {
  createDrive,
  getAllDrives,
  getDriveById,
  updateDrive,
} = require('../controllers/driveController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, getAllDrives);
router.get('/:id', protect, getDriveById);
router.post('/', protect, adminOnly, createDrive);
router.put('/:id', protect, adminOnly, updateDrive);

module.exports = router;
