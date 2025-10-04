const sharp = require('sharp');
const path = require('path');

/**
 * Compress and resize image for profile avatars
 * @param {Buffer} imageBuffer - Input image buffer
 * @param {Object} options - Compression options
 * @returns {Promise<Buffer>} Compressed image buffer
 */
async function compressAvatar(imageBuffer, options = {}) {
  const defaultOptions = {
    maxWidth: 512,
    maxHeight: 512,
    quality: 85,
    format: 'jpeg'
  };
  
  const config = { ...defaultOptions, ...options };
  
  try {
    const processedImage = await sharp(imageBuffer)
      .resize(config.maxWidth, config.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: config.quality,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();
    
    return processedImage;
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error('Failed to compress image');
  }
}

/**
 * Compress and resize image for ticket attachments
 * @param {Buffer} imageBuffer - Input image buffer
 * @param {Object} options - Compression options
 * @returns {Promise<Buffer>} Compressed image buffer
 */
async function compressTicketImage(imageBuffer, options = {}) {
  const defaultOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 90,
    format: 'jpeg'
  };
  
  const config = { ...defaultOptions, ...options };
  
  try {
    const processedImage = await sharp(imageBuffer)
      .resize(config.maxWidth, config.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: config.quality,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();
    
    return processedImage;
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error('Failed to compress image');
  }
}

/**
 * Get file size reduction info
 * @param {Buffer} originalBuffer - Original image buffer
 * @param {Buffer} compressedBuffer - Compressed image buffer
 * @returns {Object} Size reduction information
 */
function getSizeReductionInfo(originalBuffer, compressedBuffer) {
  const originalSize = originalBuffer.length;
  const compressedSize = compressedBuffer.length;
  const reductionPercentage = Math.round(((originalSize - compressedSize) / originalSize) * 100);
  
  return {
    originalSizeKB: Math.round(originalSize / 1024),
    compressedSizeKB: Math.round(compressedSize / 1024),
    reductionKB: Math.round((originalSize - compressedSize) / 1024),
    reductionPercentage
  };
}

module.exports = {
  compressAvatar,
  compressTicketImage,
  getSizeReductionInfo
};
