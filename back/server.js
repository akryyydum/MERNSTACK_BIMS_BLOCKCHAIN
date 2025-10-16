const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');

dotenv.config();

const app = express();

// Basic request logger for debugging network issues
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// Development-friendly CORS (allow explicit origins + any localhost port)
const explicitOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);
const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // same-origin / curl / postman
    if (explicitOrigins.includes(origin) || localhostRegex.test(origin)) return callback(null, true);
    console.warn('[CORS] Blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
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
//const adminDocumentRequestRoutes = require('./routes/adminDocumentRequest');
//app.use('/api/admin/document-requests', adminDocumentRequestRoutes);
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
app.get("/api/resident/payments", auth, adminHouseholdController.getResidentPayments);
app.get("/api/resident/household/:id/garbage", auth, adminHouseholdController.garbageSummary);
app.get("/api/resident/household/:id/streetlight", auth, adminHouseholdController.streetlightSummary);

// Fallback 404 (after all routes)
app.use((req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({ message: 'Route not found' });
});

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
    app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));
  })
  .catch(err => {
    console.error('[Server] Failed to start due to DB error:', err.message);
    process.exit(1);
  });
