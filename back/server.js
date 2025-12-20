const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { metricsMiddleware } = require('./utils/metrics');
const { sanitizeMiddleware } = require('./middleware/sanitize');

dotenv.config();

const app = express();
// Trust proxy (needed for correct protocol detection behind reverse proxies / Vercel / Nginx)
app.enable('trust proxy');
const server = http.createServer(app);

// Basic request logger for debugging network issues
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// Attach Row-Level Security helper
const { rlsMiddleware } = require('./middleware/ownership');
app.use(rlsMiddleware);

// Enforce HTTPS (only redirect non-HTTPS when not localhost)
app.use((req, res, next) => {
  const proto = req.headers['x-forwarded-proto'];
  if (proto && proto !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
  }
  next();
});

// Enhanced security headers with CSP
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Consider removing unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: [
        "'self'",
        'data:',
        'https:',
        'blob:',
        'http://localhost:4000',
        'http://127.0.0.1:4000'
      ],
      connectSrc: [
        "'self'",
        'https://api.latorrenorth.com',
        'wss://api.latorrenorth.com',
        'https://www.latorrenorth.com',
        'https://mernstack-bims-blockchain-3.vercel.app',
        'https://*.vercel.app',
        'https://*.cloudflare.com',
        'wss://*.cloudflare.com',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://localhost:4000',
        'ws://localhost:5173',
        'ws://localhost:4000'
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Permissions Policy (formerly Feature-Policy)
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );
  next();
});

// Body parsing + size limit (already set later, keep explicit early for security) handled below

// NOTE: Removed express-mongo-sanitize due to req.query assignment error in current Express version.
// Custom lightweight sanitizer to strip Mongo operator characters from keys.
function stripDangerous(obj) {
  if (!obj || typeof obj !== 'object') return;
  Object.keys(obj).forEach(k => {
    if (k.startsWith('$') || k.includes('.')) {
      delete obj[k];
    } else {
      const val = obj[k];
      if (typeof val === 'object') stripDangerous(val);
    }
  });
}
// Will run after body parsing (moved below) – placeholder here for clarity.

// CORS MUST run before any rate-limiter so even 429/401 responses include CORS headers.
// CORS with explicit allowed origins
const allowedOrigins = [
  "https://mernstack-bims-blockchain-3.vercel.app",
  "https://www.latorrenorth.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:4000",
];

// Allow Vercel preview deployments like https://mernstack-bims-blockchain-<suffix>.vercel.app
const vercelPreviewRegex = /^https:\/\/mernstack-bims-blockchain-[a-z0-9-]+\.vercel\.app$/i;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Non-browser / curl
    const normalizedOrigin = origin.replace('127.0.0.1', 'localhost');
    if (allowedOrigins.includes(origin) ||
        allowedOrigins.includes(normalizedOrigin) ||
        vercelPreviewRegex.test(origin)) {
      return callback(null, true);
    }
    console.log("CORS BLOCKED:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate limiters with proper proxy handling (after CORS)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many auth requests from this IP. Try again in an hour.',
  validate: { trustProxy: false }
});

const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Slow down.',
  validate: { trustProxy: false }
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Increased from 1000 to allow more requests for admin operations
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false }
});

// Conditional rate limiter that skips admin delete operations
const conditionalRateLimiter = (req, res, next) => {
  // Skip rate limiting for DELETE requests on admin routes
  const isDeleteOperation = req.method === 'DELETE';
  const isAdminManagementRoute = 
    req.path.includes('/api/admin/residents') ||
    req.path.includes('/api/admin/users') ||
    req.path.includes('/api/admin/households');
  
  if (isDeleteOperation && isAdminManagementRoute) {
    return next();
  }
  
  // Apply rate limiter for all other requests
  return globalLimiter(req, res, next);
};

app.use(conditionalRateLimiter);


// Increase body size limit to support bulk operations (e.g., 2000+ IDs)
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Apply custom sanitization AFTER json parsing so we can mutate safely.
app.use((req, _res, next) => {
  try {
    if (req.body) stripDangerous(req.body);
    if (req.query) stripDangerous(req.query);
    next();
  } catch (e) {
    next(e);
  }
});

// XSS sanitization middleware (runs after JSON parsing)
app.use(sanitizeMiddleware);

// Metrics collection middleware
app.use(metricsMiddleware);

app.get('/health', (req, res) => {
  const state = require('mongoose').connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  res.json({ status: 'ok', dbState: state });
});

// Metrics endpoint (protected - only accessible internally or with auth)
const { getMetrics } = require('./utils/metrics');
const { auth, authorize } = require('./middleware/authMiddleware');
app.get('/metrics', auth, authorize('admin'), getMetrics);

// Root route for clarity
app.get('/', (_req, res) => {
  res.json({ message: 'API running', health: '/health' });
});

// Apply auth-specific limiter
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
const adminUserRoutes = require("./routes/adminUserRoutes");
app.use("/api/admin/users", adminUserRoutes);
const adminOfficialManagementRoutes = require("./routes/adminOfficialManagementRoutes");
app.use("/api/admin/officials", adminOfficialManagementRoutes);
const adminResidentRoutes = require("./routes/adminResidentRoutes");
app.use("/api/admin/residents", adminResidentRoutes);
const adminHouseholdRoutes = require("./routes/adminHouseholdRoutes");
app.use("/api/admin/households", adminHouseholdRoutes);
// Unverified resident submissions
const adminUnverifiedResidentRoutes = require('./routes/adminUnverifiedResidentRoutes');
app.use('/api/admin/unverified-residents', adminUnverifiedResidentRoutes);
const adminDocumentRequestRoutes = require('./routes/adminDocumentRequest');
app.use('/api/admin/document-requests', adminDocumentRequestRoutes);
const adminComplaintRoutes = require("./routes/adminComplaintRoutes");
app.use("/api/admin/complaints", sensitiveLimiter, adminComplaintRoutes);
const adminFinancialRoutes = require("./routes/adminFinancialRoutes");
app.use("/api/admin/financial", sensitiveLimiter, adminFinancialRoutes);
const residentDocumentRequestRoutes = require("./routes/residentDocumentRequestRoutes");
app.use("/api/document-requests", residentDocumentRequestRoutes);
const adminPublicDocumentRoutes = require("./routes/adminPublicDocumentRoutes");
app.use("/api/admin/public-documents", adminPublicDocumentRoutes);
const residentPublicDocumentRoutes = require("./routes/residentPublicDocumentRoutes");
app.use("/api/resident/public-documents", residentPublicDocumentRoutes);
const publicAnnouncementRoutes = require('./routes/publicAnnouncementRoutes');
app.use('/api/public/announcements', publicAnnouncementRoutes);
const residentComplaintRoutes = require("./routes/residentComplaintRoutes");
app.use("/api/resident/complaints", residentComplaintRoutes);
const residentProfileRoutes = require("./routes/residentProfileRoutes");
app.use("/api/resident", residentProfileRoutes);
const residentPaymentsController = require("./controllers/residentPaymentsController");
const residentNotificationRoutes = require("./routes/residentNotificationRoutes");
app.use("/api/resident/notifications", residentNotificationRoutes);
const adminNotificationRoutes = require("./routes/adminNotificationRoutes");
app.use("/api/admin/notifications", adminNotificationRoutes);
// Blockchain status routes
const blockchainRoutes = require('./routes/blockchainRoutes');
app.use('/api/blockchain', blockchainRoutes);

// Admin settings routes
const adminSettingsRoutes = require('./routes/adminSettingsRoutes');
app.use('/api/admin/settings', adminSettingsRoutes);

// Export routes (CSV downloads)
const exportRoutes = require('./routes/exportRoutes');
app.use('/api/export', exportRoutes);

// Additional admin routes for garbage management
const adminHouseholdController = require("./controllers/adminHouseholdController");
app.get("/api/admin/garbage-payments", auth, authorize("admin"), adminHouseholdController.listGarbagePayments);
app.get("/api/admin/garbage-statistics", auth, authorize("admin"), adminHouseholdController.getGarbageStatistics);

// Additional admin routes for streetlight management
app.get("/api/admin/streetlight-payments", auth, authorize("admin"), adminHouseholdController.listStreetlightPayments);
app.get("/api/admin/streetlight-statistics", auth, authorize("admin"), adminHouseholdController.getStreetlightStatistics);

// Resident-accessible routes for their own payment data
app.get("/api/resident/household", auth, adminHouseholdController.getResidentHousehold);
app.get("/api/resident/payments", auth, residentPaymentsController.getPayments);
app.get("/api/resident/household/:id/garbage", auth, adminHouseholdController.garbageSummary);
app.get("/api/resident/household/:id/streetlight", auth, adminHouseholdController.streetlightSummary);

// Fallback 404 (after all routes)
app.use((req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({ message: 'Route not found' });
});
app.use("/api/blockchain", require("./routes/blockchainRoutes"));

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[SERVER] Unhandled error:', err.message);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;

// Start only after DB connects
connectDB()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[Server] Running on port ${PORT}`);
      
      // Initialize Socket.IO after server starts
      const { initializeSocket } = require('./config/socket');
      initializeSocket(server);
    });
  })
  .catch(err => {
    console.error('[Server] Failed to start due to DB error:', err.message);
    process.exit(1);
  });
