const sanitizeHtml = require('sanitize-html');

// Default sanitization options - very strict
const defaultOptions = {
  allowedTags: [], // No HTML tags allowed by default
  allowedAttributes: {},
  disallowedTagsMode: 'recursiveEscape',
};

// Lenient options for rich text fields (if needed in future)
const richTextOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
  allowedAttributes: {},
  disallowedTagsMode: 'recursiveEscape',
};

/**
 * Sanitize a single string value
 */
function sanitizeString(value, options = defaultOptions) {
  if (typeof value !== 'string') return value;
  return sanitizeHtml(value, options);
}

/**
 * Recursively sanitize all string fields in an object
 */
function sanitizeObject(obj, options = defaultOptions) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Skip dangerous prototype properties
        if (['__proto__', 'constructor', 'prototype'].includes(key)) {
          continue;
        }
        sanitized[key] = sanitizeObject(obj[key], options);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware to sanitize request body, query, and params
 */
function sanitizeMiddleware(req, res, next) {
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    res.status(500).json({ message: 'Input sanitization failed' });
  }
}

/**
 * Sanitize specific fields in request body
 */
function sanitizeFields(fields = []) {
  return (req, res, next) => {
    try {
      if (req.body && fields.length > 0) {
        fields.forEach(field => {
          if (req.body[field] !== undefined) {
            req.body[field] = sanitizeString(req.body[field]);
          }
        });
      }
      next();
    } catch (error) {
      console.error('Field sanitization error:', error);
      res.status(500).json({ message: 'Input sanitization failed' });
    }
  };
}

/**
 * Sanitize rich text fields (allows basic formatting)
 */
function sanitizeRichText(fields = []) {
  return (req, res, next) => {
    try {
      if (req.body && fields.length > 0) {
        fields.forEach(field => {
          if (req.body[field] !== undefined) {
            req.body[field] = sanitizeString(req.body[field], richTextOptions);
          }
        });
      }
      next();
    } catch (error) {
      console.error('Rich text sanitization error:', error);
      res.status(500).json({ message: 'Input sanitization failed' });
    }
  };
}

module.exports = {
  sanitizeMiddleware,
  sanitizeFields,
  sanitizeRichText,
  sanitizeString,
  sanitizeObject,
};
