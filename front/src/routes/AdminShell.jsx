import React from "react";
import { Outlet } from "react-router-dom";
import { AdminLayout } from "../pages/AdminSidebar";

export default function AdminShell() {
  return (
    <AdminLayout title="Admin">
      <Outlet />
    </AdminLayout>
  );
}