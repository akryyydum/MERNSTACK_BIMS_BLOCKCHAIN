const mime = require('mime-types');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Allowed MIME types by category
const ALLOWED_MIME_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  all: [], // Will be populated
};

ALLOWED_MIME_TYPES.all = [
  ...ALLOWED_MIME_TYPES.images,
  ...ALLOWED_MIME_TYPES.documents,
];

// File signatures (magic numbers) for validation
const FILE_SIGNATURES = {
  'image/jpeg': [
    { signature: 'ffd8ff', offset: 0 },
  ],
  'image/png': [
    { signature: '89504e47', offset: 0 },
  ],
  'image/gif': [
    { signature: '474946383761', offset: 0 }, // GIF87a
    { signature: '474946383961', offset: 0 }, // GIF89a
  ],
  'application/pdf': [
    { signature: '25504446', offset: 0 }, // %PDF
  ],
  'application/zip': [ // DOCX, XLSX are zip files
    { signature: '504b0304', offset: 0 },
    { signature: '504b0506', offset: 0 },
    { signature: '504b0708', offset: 0 },
  ],
};

/**
 * Validate file MIME type against allowed types
 */
function validateMimeType(mimeType, category = 'all') {
  const allowedTypes = ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.all;
  return allowedTypes.includes(mimeType);
}

/**
 * Read file signature (first bytes)
 */
async function readFileSignature(filePath, bytes = 12) {
  try {
    const buffer = Buffer.alloc(bytes);
    const fd = await fs.open(filePath, 'r');
    await fd.read(buffer, 0, bytes, 0);
    await fd.close();
    return buffer.toString('hex');
  } catch (error) {
    console.error('Error reading file signature:', error);
    return null;
  }
}

/**
 * Verify file signature matches MIME type
 */
async function verifyFileSignature(filePath, mimeType) {
  const signature = await readFileSignature(filePath);
  
  if (!signature) return false;
  
  // Check for Office documents (they're all ZIP files)
  if (mimeType.includes('openxmlformats')) {
    const zipSignatures = FILE_SIGNATURES['application/zip'];
    return zipSignatures.some(sig => 
      signature.startsWith(sig.signature.toLowerCase())
    );
  }
  
  const expectedSignatures = FILE_SIGNATURES[mimeType];
  
  if (!expectedSignatures) {
    console.warn(`No signature validation for MIME type: ${mimeType}`);
    return true; // Allow if no signature defined
  }
  
  return expectedSignatures.some(sig => 
    signature.startsWith(sig.signature.toLowerCase())
  );
}

/**
 * Validate file extension
 */
function validateExtension(filename, category = 'all') {
  const ext = path.extname(filename).toLowerCase();
  const validExtensions = {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    all: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  };
  
  const allowed = validExtensions[category] || validExtensions.all;
  return allowed.includes(ext);
}

/**
 * Validate file size
 */
function validateFileSize(size, maxSizeMB = 10) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return size <= maxBytes;
}

/**
 * Generate safe filename
 */
function generateSafeFilename(originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase();
  const basename = path.basename(originalFilename, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);
  
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  
  return `${basename}_${timestamp}_${random}${ext}`;
}

/**
 * Comprehensive file validation
 */
async function validateFile(file, options = {}) {
  const {
    category = 'all',
    maxSizeMB = 10,
    checkSignature = true,
  } = options;
  
  const errors = [];
  
  // Validate existence
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }
  
  // Validate size
  if (!validateFileSize(file.size, maxSizeMB)) {
    errors.push(`File size exceeds ${maxSizeMB}MB limit`);
  }
  
  // Validate extension
  if (!validateExtension(file.originalname || file.filename, category)) {
    errors.push('Invalid file extension');
  }
  
  // Validate MIME type
  const mimeType = file.mimetype || mime.lookup(file.originalname);
  if (!validateMimeType(mimeType, category)) {
    errors.push('Invalid file type');
  }
  
  // Validate file signature if file path is available
  if (checkSignature && file.path) {
    const signatureValid = await verifyFileSignature(file.path, mimeType);
    if (!signatureValid) {
      errors.push('File signature does not match declared type');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    mimeType,
  };
}

/**
 * Multer file filter factory
 */
function createFileFilter(options = {}) {
  return async (req, file, cb) => {
    const { category = 'all', maxSizeMB = 10 } = options;
    
    // Check extension and MIME type
    if (!validateExtension(file.originalname, category)) {
      return cb(new Error('Invalid file extension'), false);
    }
    
    if (!validateMimeType(file.mimetype, category)) {
      return cb(new Error('Invalid file type'), false);
    }
    
    cb(null, true);
  };
}

/**
 * Quarantine file for scanning (move to temp location)
 */
async function quarantineFile(filePath) {
  const quarantineDir = path.join(__dirname, '../uploads/quarantine');
  
  try {
    await fs.mkdir(quarantineDir, { recursive: true });
    
    const filename = path.basename(filePath);
    const quarantinePath = path.join(quarantineDir, `${Date.now()}_${filename}`);
    
    await fs.rename(filePath, quarantinePath);
    
    return quarantinePath;
  } catch (error) {
    console.error('Error quarantining file:', error);
    throw error;
  }
}

/**
 * Release file from quarantine to final destination
 */
async function releaseFromQuarantine(quarantinePath, destinationPath) {
  try {
    const destDir = path.dirname(destinationPath);
    await fs.mkdir(destDir, { recursive: true });
    await fs.rename(quarantinePath, destinationPath);
    return destinationPath;
  } catch (error) {
    console.error('Error releasing file from quarantine:', error);
    throw error;
  }
}

/**
 * Delete file safely
 */
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

module.exports = {
  validateFile,
  validateMimeType,
  validateExtension,
  validateFileSize,
  verifyFileSignature,
  generateSafeFilename,
  createFileFilter,
  quarantineFile,
  releaseFromQuarantine,
  deleteFile,
  ALLOWED_MIME_TYPES,
};
