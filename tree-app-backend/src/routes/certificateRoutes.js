const express = require('express');
const router = express.Router();
const { generateCertificate } = require('../controllers/certificateController');
const { protect } = require('../middleware/auth');

router.get('/', protect, generateCertificate);

module.exports = router;
