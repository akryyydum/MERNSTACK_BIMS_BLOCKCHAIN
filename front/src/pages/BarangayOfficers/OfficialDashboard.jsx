import React from "react";

export default function OfficialDashboard() {
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <div>Official Dashboard</div>
      <button
        onClick={handleLogout}
        className="self-start bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded transition-colors duration-200"
      >
        Logout
      </button>
    </div>
  );
}