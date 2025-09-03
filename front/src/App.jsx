import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Login from './auth/Login'
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicOnly from "./routes/PublicOnly";
import AdminDashboard from "./pages/AdminDashboard";
import OfficialDashboard from "./pages/OfficialDashboard";
import ResidentDashboard from "./pages/ResidentDashboard";

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
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    /**   <div className="min-h-screen bg-gradient-to-r from-navy-900 via-navy-800 to-navy-950 flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#0a192f' }}>
        <div className="relative bg-white/90 backdrop-blur-sm shadow-2xl rounded-3xl px-10 py-12 max-w-4xl w-full flex flex-col items-center border-t border-l border-white/50 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-900/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-green-700/20 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-blue-800 rounded-full blur-md opacity-30 animate-pulse"></div>
              <img src="/vite.svg" alt="Barangay Logo" className="relative w-24 h-24 drop-shadow-xl" />
            </div>

            <h1 className="text-5xl font-extrabold mb-3 text-center bg-gradient-to-r from-blue-900 to-green-600 bg-clip-text text-transparent">
              La Torre North
            </h1>
            <h2 className="text-3xl font-bold mb-4 text-center text-gray-700">
              Barangay Information Management System
            </h2>
            
            <div className="h-1 w-20 bg-gradient-to-r from-blue-900 to-green-600 rounded-full mb-6"></div>
            
            <p className="text-lg text-gray-600 mb-10 text-center max-w-lg">
              Empowering communities with digital solutions for efficient barangay governance, 
              resident records, and transparent services.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg">
              <button className="group relative bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-900 hover:to-blue-950 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden">
                <span className="relative z-10 flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Resident Portal
                </span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              </button>
              
              <button className="group relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden">
                <span className="relative z-10 flex items-center justify-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Barangay Staff Login
                </span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              </button>
            </div>
          
            <div className="mt-12 w-full">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-4"></div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>
                  &copy; {new Date().getFullYear()} Barangay La Torre North
                </div>
                <div>
                  Secured with Blockchain Technology
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      **/

  )
}

export default App
