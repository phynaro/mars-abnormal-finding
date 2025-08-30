const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure directory exists
function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ticketId = req.params.id || 'general';
    // Store under backend/uploads to match static mount in app.js
    const baseDir = path.join(__dirname, '..', '..', 'uploads', 'tickets', String(ticketId));
    try {
      ensureDirSync(baseDir);
      cb(null, baseDir);
    } catch (err) {
      cb(err, baseDir);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${timestamp}_${safeBase}${ext}`);
  }
});

const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function fileFilter(req, file, cb) {
  if (allowedMimes.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, png, webp, gif) are allowed'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

module.exports = {
  upload
};

// Avatar-specific storage under uploads/avatars/:userId
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const baseDir = path.join(__dirname, '..', '..', 'uploads', 'avatars', String(userId));
    try {
      ensureDirSync(baseDir);
      cb(null, baseDir);
    } catch (err) {
      cb(err, baseDir);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${timestamp}${ext}`);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports.uploadAvatar = uploadAvatar;
