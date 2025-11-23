const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
    // Try to get token from cookie first, then fallback to Authorization header
    let token = req.cookies?.accessToken;
    
    if (!token) {
        const authHeader = req.headers.authorization;
        token = authHeader?.split(' ')[1];
    }
    
    console.log("Auth middleware check:", {
        cookieToken: req.cookies?.accessToken ? "Present" : "Missing",
        headerToken: req.headers.authorization ? "Present" : "Missing",
        token: token ? "Present" : "Missing",
        url: req.originalUrl,
        method: req.method
    });
    
    if (!token) {
        console.log("No token provided");
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log("Token verification failed:", err.message);
            return res.status(403).json({ message: 'Invalid token' });
        }
        console.log("Token verified successfully for user:", decoded);
        req.user = decoded; 
        next();
    });
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        console.log("Authorization check:", {
            userRole: req.user?.role,
            requiredRoles: roles,
            authorized: roles.includes(req.user?.role)
        });
        
        if (!roles.includes(req.user.role)) {
            console.log("Access denied - insufficient role");
            return res.status(403).json({ message: 'Access denied' });
        }
        console.log("Authorization successful");
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
