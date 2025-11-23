/**
 * CAPTCHA Verification Middleware
 * Supports Google reCAPTCHA v2 and v3
 * 
 * Setup:
 * 1. Get reCAPTCHA keys from https://www.google.com/recaptcha/admin
 * 2. Add to .env:
 *    RECAPTCHA_SECRET_KEY=your_secret_key
 *    RECAPTCHA_ENABLED=true
 * 3. Add reCAPTCHA script to frontend
 * 4. Include captcha token in request body as 'captchaToken'
 */

const https = require('https');

/**
 * Verify reCAPTCHA token with Google
 */
async function verifyCaptchaToken(token, remoteip) {
  return new Promise((resolve, reject) => {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey) {
      return reject(new Error('RECAPTCHA_SECRET_KEY not configured'));
    }
    
    const postData = new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: remoteip || '',
    }).toString();
    
    const options = {
      hostname: 'www.google.com',
      port: 443,
      path: '/recaptcha/api/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Middleware to verify reCAPTCHA
 * Checks for captchaToken in request body
 */
function verifyCaptcha(options = {}) {
  return async (req, res, next) => {
    // Skip if CAPTCHA is disabled
    if (process.env.RECAPTCHA_ENABLED !== 'true') {
      return next();
    }
    
    const {
      minScore = 0.5, // For v3, minimum score threshold
      action = null, // For v3, expected action name
    } = options;
    
    const token = req.body.captchaToken;
    
    if (!token) {
      return res.status(400).json({
        message: 'CAPTCHA token required',
        code: 'CAPTCHA_REQUIRED',
      });
    }
    
    try {
      const remoteip = req.ip || req.connection?.remoteAddress;
      const result = await verifyCaptchaToken(token, remoteip);
      
      if (!result.success) {
        console.warn('[CAPTCHA] Verification failed:', result['error-codes']);
        return res.status(400).json({
          message: 'CAPTCHA verification failed',
          code: 'CAPTCHA_FAILED',
        });
      }
      
      // For reCAPTCHA v3, check score
      if (result.score !== undefined) {
        if (result.score < minScore) {
          console.warn(`[CAPTCHA] Score too low: ${result.score}`);
          return res.status(400).json({
            message: 'CAPTCHA score too low. Please try again.',
            code: 'CAPTCHA_SCORE_LOW',
          });
        }
        
        // Verify action if specified
        if (action && result.action !== action) {
          console.warn(`[CAPTCHA] Action mismatch: expected ${action}, got ${result.action}`);
          return res.status(400).json({
            message: 'CAPTCHA action mismatch',
            code: 'CAPTCHA_ACTION_MISMATCH',
          });
        }
      }
      
      // Store CAPTCHA result in request for logging
      req.captchaResult = {
        success: true,
        score: result.score,
        action: result.action,
      };
      
      next();
    } catch (error) {
      console.error('[CAPTCHA] Verification error:', error);
      
      // In production, you might want to fail closed (reject request)
      // For now, we'll fail open to avoid blocking legitimate users
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({
          message: 'CAPTCHA verification error',
          code: 'CAPTCHA_ERROR',
        });
      }
      
      next();
    }
  };
}

/**
 * Invisible CAPTCHA middleware (for v3)
 */
function invisibleCaptcha(action) {
  return verifyCaptcha({ minScore: 0.5, action });
}

/**
 * Strict CAPTCHA middleware (for sensitive operations)
 */
function strictCaptcha(action) {
  return verifyCaptcha({ minScore: 0.7, action });
}

module.exports = {
  verifyCaptcha,
  invisibleCaptcha,
  strictCaptcha,
  verifyCaptchaToken,
};
