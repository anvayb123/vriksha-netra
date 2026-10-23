const multer = require('multer');

// Memory storage - file seedha buffer mein aata hai, disk pe save nahi hota
// (Cloudinary ko directly stream kar denge)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

module.exports = upload;
