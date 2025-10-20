import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import './App.css'
import Login from './auth/Login'
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicOnly from "./routes/PublicOnly";
import AdminDashboard from "./pages/Admin/AdminDashboard";
// import OfficialDashboard from "./pages/BarangayOfficers/OfficialDashboard"; // File doesn't exist
import ResidentDashboard from "./pages/Residents/ResidentDashboard";
import ResidentRequest from "./pages/Residents/ResidentRequest";
import ResidentPayment from "./pages/Residents/ResidentPayment";
import SplashRedirect from "./routes/SplashRedirect";
import AdminUserManagement from "./pages/Admin/AdminUserManagement";
import AdminResidentManagement from "./pages/Admin/AdminResidentManagement";
import AdminDocumentRequests from "./pages/Admin/AdminDocumentRequests";
import HouseholdManagement from "./pages/Admin/HouseholdManagement";
import AdminGarbageFees from "./pages/Admin/AdminGarbageFees";
import AdminStreetLightFees from "./pages/Admin/AdminStreetLightFees";
import AdminPublicDocuments from "./pages/Admin/AdminPublicDocuments";
import AdminOfficialManagement from "./pages/Admin/AdminOfficialManagement";
import AdminReportsComplaints from "./pages/Admin/AdminReportsComplaints";
import AdminFinancialReports from "./pages/Admin/AdminFinancialReports";
import AdminBlockchainNetwork from "./pages/Admin/AdminBlockchainNetwork";
import ResidentPublicDocuments from "./pages/Residents/ResidentPublicDocuments";
import ResidentReportsComplaints from "./pages/Residents/ResidentReportsComplaints";
function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route (blocked for authenticated users) */}
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Admin only */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin/user-management" element={<AdminUserManagement />} />
          <Route path="/admin/residents" element={<AdminResidentManagement />} />
          <Route path="/admin/households" element={<HouseholdManagement />} />
          <Route path="/admin/garbage-fees" element={<AdminGarbageFees />} />
          <Route path="/admin/streetlight-fees" element={<AdminStreetLightFees />} />
          <Route path="/admin/document-requests" element={<AdminDocumentRequests />} />
          <Route path="/admin/reports-complaints" element={<AdminReportsComplaints />} />
          <Route path="/admin/financial-reports" element={<AdminFinancialReports />} />
          <Route path="/admin/publicdocuments" element={<AdminPublicDocuments />} />
          <Route path="/admin/blockchain" element={<AdminBlockchainNetwork />} />
          <Route path="/admin/official-management" element={<AdminOfficialManagement />} />
        </Route>

        {/* Official only */}
        <Route element={<ProtectedRoute allowedRoles={["official"]} />}>
          {/* <Route path="/official-dashboard" element={<OfficialDashboard />} /> */}
        </Route>

        {/* Resident only */}
        <Route element={<ProtectedRoute allowedRoles={["resident"]} />}>
          <Route path="/resident-dashboard" element={<ResidentDashboard />} />
          <Route path="/resident/dashboard" element={<ResidentDashboard />} />
          <Route path="/resident/requests" element={<ResidentRequest />} />
          <Route path="/resident/payments" element={<ResidentPayment />} />
          <Route path="/resident/reports-complaints" element={<ResidentReportsComplaints />} />
          <Route path="/resident/public-documents" element={<ResidentPublicDocuments />} />
        </Route>

        {/* Default and 404 handling */}
        <Route path="/" element={<SplashRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>

  )
}

export default App
