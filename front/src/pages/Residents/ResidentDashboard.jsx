import React from "react";
import { useNavigate } from "react-router-dom";

export default function ResidentDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  };

  return (
    <div className="p-6">
      Resident Dashboard
      <button
        onClick={handleLogout}
        style={{ marginLeft: 16, padding: "6px 16px", background: "#e53e3e", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
      >
        Logout
      </button>
    </div>
  );
}