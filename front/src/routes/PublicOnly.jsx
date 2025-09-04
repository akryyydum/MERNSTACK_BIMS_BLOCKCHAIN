import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated, getUserRole, getDefaultPathByRole } from "../utils/auth";

const PublicOnly = () => {
  if (isAuthenticated()) {
    const role = getUserRole();
    return <Navigate to={getDefaultPathByRole(role)} replace />;
  }
  return <Outlet />;
};

export default PublicOnly;