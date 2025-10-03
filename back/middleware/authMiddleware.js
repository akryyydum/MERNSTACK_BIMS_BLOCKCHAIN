const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = decoded; 
        next();
    });
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};

function authorizeRoles(...allowed) {
  return (req, _res, next) => {
    if (!req.user) {
      return _res.status(401).json({ message: "Not authenticated" });
    }
    if (!allowed.includes(req.user.role)) {
      return _res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

function protect(req, res, next) {
  return exports.auth(req, res, next);
}

module.exports = {
  auth: exports.auth,
  authorize: exports.authorize,
  authorizeRoles,
  protect, // alias so existing code using protect works
};
