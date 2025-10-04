const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { compressAvatar, getSizeReductionInfo } = require('../utils/imageCompression');

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

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  }
});

module.exports = {
  upload,
  uploadMemory
};

// Avatar-specific storage under uploads/avatars/:userId (without compression)
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

// Avatar upload with compression (stored in memory first, then compressed)
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB temporary limit for large files before compression
  }
});

// Middleware to compress avatar after upload
const compressAvatarMiddleware = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    console.log(`Original avatar size: ${Math.round(req.file.buffer.length / 1024)}KB`);
    
    // Compress the image
    const compressedBuffer = await compressAvatar(req.file.buffer, {
      maxWidth: 512,
      maxHeight: 512,
      quality: 85
    });
    
    // Get compression info
    const reductionInfo = getSizeReductionInfo(req.file.buffer, compressedBuffer);
    console.log(`Avatar compressed: ${reductionInfo.originalSizeKB}KB → ${reductionInfo.compressedSizeKB}KB (${reductionInfo.reductionPercentage}% reduction)`);
    
    // Create destination directory
    const userId = req.user?.id || 'unknown';
    const baseDir = path.join(__dirname, '..', '..', 'uploads', 'avatars', String(userId));
    ensureDirSync(baseDir);
    
    // Generate filename
    const timestamp = Date.now();
    const filename = `avatar_${timestamp}.jpg`; // Always save as JPEG after compression
    const fullPath = path.join(baseDir, filename);
    
    // Write compressed image to disk
    await fs.promises.writeFile(fullPath, compressedBuffer);
    
    // Update req.file to match disk storage format
    req.file = {
      ...req.file,
      filename,
      path: fullPath,
      size: compressedBuffer.length
    };
    
    // Add compression info to request for logging
    req.compressionInfo = reductionInfo;
    
    next();
  } catch (error) {
    console.error('Avatar compression error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process image',
      error: error.message
    });
  }
};

module.exports.uploadAvatar = uploadAvatar;
module.exports.compressAvatarMiddleware = compressAvatarMiddleware;