import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import './App.css'
import Login from './auth/Login'
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicOnly from "./routes/PublicOnly";
import AdminDashboard from "./pages/AdminDashboard";
import OfficialDashboard from "./pages/OfficialDashboard";
import ResidentDashboard from "./pages/ResidentDashboard";
import SplashRedirect from "./routes/SplashRedirect";
import AdminUserManagement from "./pages/AdminUserManagement"; // add
import AdminResidentManagement from "./pages/AdminResidentManagement";

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
          <Route path="/admin/user-management" element={<AdminUserManagement />} /> {/* add */}
          <Route path="/admin/residents" element={<AdminResidentManagement />} />
        </Route>

        {/* Official only */}
        <Route element={<ProtectedRoute allowedRoles={["official"]} />}>
          <Route path="/official-dashboard" element={<OfficialDashboard />} />
        </Route>

        {/* Resident only */}
        <Route element={<ProtectedRoute allowedRoles={["resident"]} />}>
          <Route path="/resident-dashboard" element={<ResidentDashboard />} />
        </Route>

        {/* Default and 404 handling */}
        <Route path="/" element={<SplashRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>

  )
}

export default App
