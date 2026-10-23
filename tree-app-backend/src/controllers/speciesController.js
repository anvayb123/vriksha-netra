const Species = require('../models/Species');

// @route  POST /api/species  (admin only)
const createSpecies = async (req, res) => {
  try {
    const { name, commonNames, referenceImageUrl, scientificName, hindi, family, type, uses, habitat } = req.body;
    const normalizedName = name.trim();

    const exists = await Species.findOne({ name: normalizedName });
    if (exists) {
      return res.status(400).json({ message: 'Species already exists' });
    }

    const species = await Species.create({
      name: normalizedName,
      scientificName: scientificName || '',
      hindi: hindi || '',
      commonNames: commonNames || [],
      family: family || '',
      type: type || 'Tree',
      uses: uses || '',
      habitat: habitat || '',
      referenceImageUrl: referenceImageUrl || '',
      addedBy: req.user._id,
      isActive: true,
    });

    res.status(201).json(species);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Species already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/species  (everyone - volunteers need this for the dropdown)
const getAllSpecies = async (req, res) => {
  try {
    const species = await Species.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json(species);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  PUT /api/species/:id  (admin only)
const updateSpecies = async (req, res) => {
  try {
    const species = await Species.findById(req.params.id);
    if (!species) return res.status(404).json({ message: 'Species not found' });

    const { name, commonNames, referenceImageUrl, isActive, scientificName, hindi, family, type, uses, habitat } = req.body;
    if (name !== undefined) species.name = name.trim();
    if (commonNames !== undefined) species.commonNames = commonNames;
    if (referenceImageUrl !== undefined) species.referenceImageUrl = referenceImageUrl;
    if (isActive !== undefined) species.isActive = isActive;
    if (scientificName !== undefined) species.scientificName = scientificName;
    if (hindi !== undefined) species.hindi = hindi;
    if (family !== undefined) species.family = family;
    if (type !== undefined) species.type = type;
    if (uses !== undefined) species.uses = uses;
    if (habitat !== undefined) species.habitat = habitat;

    const updated = await species.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  DELETE /api/species/:id  (admin only) - soft delete
const deleteSpecies = async (req, res) => {
  try {
    const species = await Species.findById(req.params.id);
    if (!species) return res.status(404).json({ message: 'Species not found' });

    species.isActive = false;
    await species.save();
    res.json({ message: 'Species deactivated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createSpecies, getAllSpecies, updateSpecies, deleteSpecies };
