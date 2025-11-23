const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const http = require('http');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Basic request logger for debugging network issues
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

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
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Treat 127.0.0.1 the same as localhost for dev convenience
    const normalizedOrigin = origin.replace('127.0.0.1', 'localhost');

    if (allowedOrigins.includes(origin) ||
        allowedOrigins.includes(normalizedOrigin) ||
        vercelPreviewRegex.test(origin)) {
      return callback(null, true);
    } else {
      console.log("CORS BLOCKED:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  const state = require('mongoose').connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  res.json({ status: 'ok', dbState: state });
});
// Root route for clarity
app.get('/', (_req, res) => {
  res.json({ message: 'API running', health: '/health' });
});

app.use('/api/auth', require('./routes/authRoutes'));
const adminUserRoutes = require("./routes/adminUserRoutes");
app.use("/api/admin/users", adminUserRoutes);
const adminOfficialManagementRoutes = require("./routes/adminOfficialManagementRoutes");
app.use("/api/admin/officials", adminOfficialManagementRoutes);
const adminResidentRoutes = require("./routes/adminResidentRoutes");
app.use("/api/admin/residents", adminResidentRoutes);
// Unverified resident submissions
const adminUnverifiedResidentRoutes = require('./routes/adminUnverifiedResidentRoutes');
app.use('/api/admin/unverified-residents', adminUnverifiedResidentRoutes);
const adminDocumentRequestRoutes = require('./routes/adminDocumentRequest');
app.use('/api/admin/document-requests', adminDocumentRequestRoutes);
const adminComplaintRoutes = require("./routes/adminComplaintRoutes");
app.use("/api/admin/complaints", adminComplaintRoutes);
const adminFinancialRoutes = require("./routes/adminFinancialRoutes");
app.use("/api/admin/financial", adminFinancialRoutes);
const residentDocumentRequestRoutes = require("./routes/residentDocumentRequestRoutes");
app.use("/api/document-requests", residentDocumentRequestRoutes);
const adminHouseholdRoutes = require("./routes/adminHouseholdRoutes");
app.use("/api/admin/households", adminHouseholdRoutes);
const adminPublicDocumentRoutes = require("./routes/adminPublicDocumentRoutes");
app.use("/api/admin/public-documents", adminPublicDocumentRoutes);
const residentPublicDocumentRoutes = require("./routes/residentPublicDocumentRoutes");
app.use("/api/resident/public-documents", residentPublicDocumentRoutes);
const residentComplaintRoutes = require("./routes/residentComplaintRoutes");
app.use("/api/resident/complaints", residentComplaintRoutes);
const residentProfileRoutes = require("./routes/residentProfileRoutes");
app.use("/api/resident", residentProfileRoutes);
const residentPaymentsController = require("./controllers/residentPaymentsController");
const residentNotificationRoutes = require("./routes/residentNotificationRoutes");
app.use("/api/resident/notifications", residentNotificationRoutes);
// Blockchain status routes
const blockchainRoutes = require('./routes/blockchainRoutes');
app.use('/api/blockchain', blockchainRoutes);

// Admin settings routes
const adminSettingsRoutes = require('./routes/adminSettingsRoutes');
app.use('/api/admin/settings', adminSettingsRoutes);

// Additional admin routes for garbage management
const adminHouseholdController = require("./controllers/adminHouseholdController");
const { auth, authorize } = require("./middleware/authMiddleware");
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
