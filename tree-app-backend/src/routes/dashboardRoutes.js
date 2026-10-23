const express = require('express');
const router = express.Router();
const {
  getMyStats,
  getAdminOverview,
  getDriveStats,
  getLeaderboard,
} = require('../controllers/dashboardController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/my-stats', protect, getMyStats);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/overview', protect, adminOnly, getAdminOverview);
router.get('/drive/:driveId', protect, adminOnly, getDriveStats);

module.exports = router;
