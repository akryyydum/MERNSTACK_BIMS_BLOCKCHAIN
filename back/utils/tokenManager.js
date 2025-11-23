const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate access token (short-lived)
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
}

/**
 * Generate refresh token (long-lived)
 */
function generateRefreshToken(payload) {
  // Add a random jti (JWT ID) for tracking
  const tokenPayload = {
    ...payload,
    jti: crypto.randomBytes(16).toString('hex'),
    type: 'refresh',
  };
  
  return jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  });
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    throw new Error('Invalid access token');
  }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    throw new Error('Invalid refresh token');
  }
}

/**
 * Generate token pair (access + refresh)
 */
function generateTokenPair(payload) {
  // Remove sensitive fields
  const { passwordHash, verificationToken, ...cleanPayload } = payload;
  
  return {
    accessToken: generateAccessToken(cleanPayload),
    refreshToken: generateRefreshToken(cleanPayload),
  };
}

/**
 * Decode token without verification (for inspection only)
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  return Date.now() >= decoded.exp * 1000;
}

/**
 * Extract token from Authorization header
 */
function extractBearerToken(authHeader) {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Middleware to extract and verify access token
 */
function authenticateToken(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }
    
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.message === 'Access token expired') {
      return res.status(401).json({
        message: 'Access token expired',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(403).json({ message: error.message });
  }
}

/**
 * Refresh token endpoint handler
 */
async function refreshTokenHandler(req, res, User) {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Optional: Check if token is revoked (requires token blacklist/whitelist in DB)
    // This would query User model for stored valid refresh tokens
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user || !user.isActive) {
      return res.status(403).json({ message: 'User not found or inactive' });
    }
    
    // Generate new token pair
    const tokenPayload = {
      id: user._id,
      role: user.role,
      residentId: decoded.residentId,
    };
    
    const tokens = generateTokenPair(tokenPayload);
    
    // Set new tokens in HTTP-only cookies
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
    
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
    
    // Optional: Store new refresh token in DB and invalidate old one
    // user.refreshTokens = user.refreshTokens || [];
    // user.refreshTokens.push({ token: tokens.refreshToken, createdAt: new Date() });
    // await user.save();
    
    res.json({
      message: 'Tokens refreshed successfully'
    });
  } catch (error) {
    console.error('[Token] Refresh error:', error.message);
    return res.status(403).json({ message: error.message });
  }
}

/**
 * Logout handler - invalidate refresh token
 */
async function logoutHandler(req, res, User) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        
        // Optional: Remove token from user's whitelist in DB
        // const user = await User.findById(decoded.id);
        // if (user) {
        //   user.refreshTokens = (user.refreshTokens || []).filter(
        //     t => t.token !== refreshToken
        //   );
        //   await user.save();
        // }
      } catch (error) {
        console.error('[Token] Logout token verification error:', error.message);
      }
    }
    
    // Clear cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Token] Logout error:', error.message);
    res.status(200).json({ message: 'Logged out' }); // Always succeed for UX
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  decodeToken,
  isTokenExpired,
  extractBearerToken,
  authenticateToken,
  refreshTokenHandler,
  logoutHandler,
};
