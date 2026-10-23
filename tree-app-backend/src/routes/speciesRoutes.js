const express = require('express');
const router = express.Router();
const {
  createSpecies,
  getAllSpecies,
  updateSpecies,
  deleteSpecies,
} = require('../controllers/speciesController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getAllSpecies);
router.post('/', protect, adminOnly, createSpecies);
router.put('/:id', protect, adminOnly, updateSpecies);
router.delete('/:id', protect, adminOnly, deleteSpecies);

module.exports = router;
