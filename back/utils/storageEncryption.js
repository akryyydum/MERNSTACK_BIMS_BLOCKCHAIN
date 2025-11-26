const crypto = require('crypto');

// Encryption key derived from JWT_SECRET
function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key';
  // Derive a 32-byte key from the JWT secret
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt data for client-side storage
 * Returns base64-encoded encrypted data with IV
 */
function encryptForStorage(data) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    const jsonData = JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Prepend IV to encrypted data (IV is not secret)
    const ivBase64 = iv.toString('base64');
    return `${ivBase64}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Failed to encrypt data:', error.message);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt data from client-side storage
 * Expects base64-encoded encrypted data with IV prefix
 */
function decryptFromStorage(encryptedData) {
  try {
    const key = getEncryptionKey();
    const [ivBase64, encrypted] = encryptedData.split(':');
    
    if (!ivBase64 || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('[Decryption] Failed to decrypt data:', error.message);
    throw new Error('Decryption failed');
  }
}

module.exports = {
  encryptForStorage,
  decryptFromStorage,
};
