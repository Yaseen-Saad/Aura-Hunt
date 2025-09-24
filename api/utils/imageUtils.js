const sharp = require('sharp');

/**
 * Compress and optimize images before upload
 * @param {Buffer} buffer - The image buffer
 * @param {Object} options - Compression options
 * @returns {Buffer} - Compressed image buffer
 */
async function compressImage(buffer, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 85,
    format = 'webp',
    progressive = true
  } = options;

  try {
    let pipeline = sharp(buffer);

    // Get image metadata
    const metadata = await pipeline.metadata();
    
    // Resize if necessary
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Apply format and compression
    switch (format) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({ 
          quality, 
          progressive,
          mozjpeg: true
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({ 
          quality,
          effort: 6
        });
        break;
      case 'png':
        pipeline = pipeline.png({ 
          compressionLevel: 9,
          progressive
        });
        break;
      default:
        // Auto-detect best format
        if (metadata.hasAlpha) {
          pipeline = pipeline.png({ compressionLevel: 9 });
        } else {
          pipeline = pipeline.webp({ quality, effort: 6 });
        }
    }

    const compressedBuffer = await pipeline.toBuffer();
    
    console.log(`Image compressed: ${buffer.length} bytes → ${compressedBuffer.length} bytes (${Math.round((1 - compressedBuffer.length / buffer.length) * 100)}% reduction)`);
    
    return compressedBuffer;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original buffer if compression fails
    return buffer;
  }
}

/**
 * Generate a unique filename for uploaded images
 * @param {string} teamId - Team identifier
 * @param {string} gameName - Game/question name
 * @param {string} originalName - Original filename
 * @returns {string} - Generated filename
 */
function generateFileName(teamId, gameName, originalName) {
  const timestamp = Date.now();
  const sanitizedGameName = gameName.replace(/[^a-zA-Z0-9]/g, '_');
  const extension = originalName.split('.').pop()?.toLowerCase() || 'webp';
  return `${teamId}/${sanitizedGameName}/${timestamp}.${extension}`;
}

/**
 * Validate uploaded image
 * @param {Object} file - Multer file object
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
function validateImage(file, options = {}) {
  const {
    maxSizeBytes = 10 * 1024 * 1024, // 10MB default
    allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  } = options;

  const errors = [];

  if (!file) {
    errors.push('No file uploaded');
    return { valid: false, errors };
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`);
  }

  if (file.size > maxSizeBytes) {
    errors.push(`File too large. Maximum size: ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  compressImage,
  generateFileName,
  validateImage
};