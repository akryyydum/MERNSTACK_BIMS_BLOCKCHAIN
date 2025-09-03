import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated, getUserRole, getDefaultPathByRole } from "../utils/auth";

export default function SplashRedirect() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const role = getUserRole();
  return <Navigate to={getDefaultPathByRole(role)} replace />;
}