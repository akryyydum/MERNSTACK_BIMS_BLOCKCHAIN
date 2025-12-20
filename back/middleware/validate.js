const { isEmail } = require('validator');

function sanitizeString(val) {
  return typeof val === 'string' ? val.trim() : '';
}

function validateRegister(req, res, next) {
  try {
    const body = req.body || {};
    body.username = sanitizeString(body.username);
    body.password = sanitizeString(body.password);
    if (!body.username || !body.password) {
      return res.status(400).json({ message: 'username and password are required' });
    }
    if (body.username.length < 6) {
      return res.status(400).json({ message: 'Username must be at least 6 characters' });
    }
    if (body.password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (body.contact && body.contact.email) {
      body.contact.email = sanitizeString(body.contact.email).toLowerCase();
      if (body.contact.email && !isEmail(body.contact.email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
    }
    // Avoid prototype pollution / dangerous keys
    ['__proto__', 'constructor', 'prototype'].forEach(k => { if (k in body) delete body[k]; });
    req.body = body;
    next();
  } catch (e) {
    next(e);
  }
}

function validateLogin(req, res, next) {
  const { usernameOrEmail, password } = req.body || {};
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: 'usernameOrEmail and password are required' });
  }
  req.body.usernameOrEmail = sanitizeString(usernameOrEmail);
  req.body.password = sanitizeString(password);
  if (req.body.usernameOrEmail.includes('@') && !isEmail(req.body.usernameOrEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  next();
}

module.exports = {
  validateRegister,
  validateLogin
};