const Drive = require('../models/Drive');

// @route  POST /api/drives  (admin only)
const createDrive = async (req, res) => {
  try {
    const { name, date, locationName, speciesAllowed } = req.body;

    const drive = await Drive.create({
      name,
      date,
      locationName: locationName || '',
      speciesAllowed: speciesAllowed || [],
      createdBy: req.user._id,
      isActive: true,
    });

    res.status(201).json(drive);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/drives  (everyone - volunteers see upcoming drives)
const getAllDrives = async (req, res) => {
  try {
    const drives = await Drive.find({ isActive: true })
      .populate('speciesAllowed', 'name')
      .sort({ date: -1 })
      .lean();
    res.json(drives);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/drives/:id
const getDriveById = async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id)
      .populate('speciesAllowed', 'name');
    if (!drive) return res.status(404).json({ message: 'Drive not found' });
    res.json(drive);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  PUT /api/drives/:id  (admin only)
const updateDrive = async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) return res.status(404).json({ message: 'Drive not found' });

    const { name, date, locationName, speciesAllowed, isActive } = req.body;
    if (name !== undefined) drive.name = name;
    if (date !== undefined) drive.date = date;
    if (locationName !== undefined) drive.locationName = locationName;
    if (speciesAllowed !== undefined) drive.speciesAllowed = speciesAllowed;
    if (isActive !== undefined) drive.isActive = isActive;

    const updated = await drive.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createDrive, getAllDrives, getDriveById, updateDrive };
