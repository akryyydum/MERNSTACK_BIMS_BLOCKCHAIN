import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isAuthenticated, getUserRole, getDefaultPathByRole } from "../utils/auth";

export default function SplashRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasNavigated = useRef(false);
  
  useEffect(() => {
    // Only navigate once
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    
    if (!isAuthenticated()) {
      navigate("/login", { replace: true });
      return;
    }
    
    const role = getUserRole();
    const path = getDefaultPathByRole(role);
    
    // Prevent navigating to the same path or back to root
    if (path && path !== "/" && path !== location.pathname) {
      navigate(path, { replace: true });
    } else if (!role) {
      // If no role, go to login
      navigate("/login", { replace: true });
    }
  }, []);

  // Return null while navigation is in progress
  return null;
}