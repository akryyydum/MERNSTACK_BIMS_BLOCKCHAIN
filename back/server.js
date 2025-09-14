const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors'); // NEW

dotenv.config();
connectDB();

const app = express();

// Allow frontend origins to call this API
app.use(cors({
  origin: [process.env.FRONTEND_ORIGIN || 'http://localhost:5173', 'http://localhost:3000'], // NEW
})); // NEW

app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
const adminUserRoutes = require("./routes/adminUserRoutes");
app.use("/api/admin/users", adminUserRoutes);
const adminResidentRoutes = require("./routes/adminResidentRoutes");
app.use("/api/admin/residents", adminResidentRoutes);
const adminDocumentRequestRoutes = require('./routes/adminDocumentRequest');
app.use('/api/admin/document-requests', adminDocumentRequestRoutes);
const residentDocumentRequestRoutes = require("./routes/residentDocumentRequestRoutes");
app.use("/api/document-requests", residentDocumentRequestRoutes);
const adminHouseholdRoutes = require("./routes/adminHouseholdRoutes");
app.use("/api/admin/households", adminHouseholdRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
