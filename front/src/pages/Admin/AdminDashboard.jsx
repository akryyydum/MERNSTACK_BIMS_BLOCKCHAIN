import React from "react";
import { AdminLayout } from "./AdminSidebar";

export default function AdminDashboard() {
  return (
    <AdminLayout title="Admin">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="p-4 bg-white rounded-lg shadow">Total Residents</div>
        <div className="p-4 bg-white rounded-lg shadow">Pending Requests</div>
        <div className="p-4 bg-white rounded-lg shadow">System Health</div>
      </div>
    </AdminLayout>
  );
}