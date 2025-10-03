const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const cors = require('cors');

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: [process.env.FRONTEND_ORIGIN || 'http://localhost:5173', 'http://localhost:3000'],
}));

app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
const adminUserRoutes = require("./routes/adminUserRoutes");
app.use("/api/admin/users", adminUserRoutes);
const adminOfficialManagementRoutes = require("./routes/adminOfficialManagementRoutes");
app.use("/api/admin/officials", adminOfficialManagementRoutes);
const adminResidentRoutes = require("./routes/adminResidentRoutes");
app.use("/api/admin/residents", adminResidentRoutes);
const adminDocumentRequestRoutes = require('./routes/adminDocumentRequest');
app.use('/api/admin/document-requests', adminDocumentRequestRoutes);
const residentDocumentRequestRoutes = require("./routes/residentDocumentRequestRoutes");
app.use("/api/document-requests", residentDocumentRequestRoutes);
const adminHouseholdRoutes = require("./routes/adminHouseholdRoutes");
app.use("/api/admin/households", adminHouseholdRoutes);
const adminComplaintRoutes = require("./routes/adminComplaintRoutes");
app.use("/api/admin/complaints", adminComplaintRoutes);
const adminFinancialRoutes = require("./routes/adminFinancialRoutes");
app.use("/api/admin/financial", adminFinancialRoutes);
const adminPublicDocumentRoutes = require("./routes/adminPublicDocumentRoutes");
app.use("/api/admin/public-documents", adminPublicDocumentRoutes);
const residentPublicDocumentRoutes = require("./routes/residentPublicDocumentRoutes");
app.use("/api/resident/public-documents", residentPublicDocumentRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
