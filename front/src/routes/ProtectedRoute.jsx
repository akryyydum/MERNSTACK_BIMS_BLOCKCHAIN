import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getItem } from "../utils/storage";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    const role = getItem("role");
    const userData = getItem("userData");

    // Not logged in
    if (!role || !userData) {
      return setIsAuthorized("unauthenticated");
    }

    // User role not allowed
    if (allowedRoles.length && !allowedRoles.includes(role)) {
      return setIsAuthorized("forbidden");
    }

    // Allowed
    setIsAuthorized("allowed");
  }, []);
  
  if (isAuthorized === null) {
    return null; // OR a loader
  }

  if (isAuthorized === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (isAuthorized === "forbidden") {
    const role = getItem("role");
    if (role === "admin") return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/resident-dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
