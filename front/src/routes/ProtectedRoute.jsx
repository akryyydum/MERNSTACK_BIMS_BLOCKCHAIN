import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated, getUserRole, getDefaultPathByRole } from "../utils/auth";

const ProtectedRoute = ({ allowedRoles }) => {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  const role = getUserRole();
  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultPathByRole(role)} replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;