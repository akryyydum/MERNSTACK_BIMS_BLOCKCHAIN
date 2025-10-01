import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { UserOutlined, UsergroupAddOutlined, DashboardOutlined, SafetyOutlined, LogoutOutlined,
    SettingOutlined, BarChartOutlined, MonitorOutlined, BlockOutlined, HomeOutlined, ExclamationCircleOutlined
 } from "@ant-design/icons";
import AdminResidentManagement from "./AdminResidentManagement";

const defaultMenu = [
  { to: "/admin-dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
  { to: "/admin/user-management", label: "User Management", icon: <UsergroupAddOutlined /> },
  { to: "/admin/residents", label: "Residents Management", icon: <UserOutlined /> },
  { to: "/admin/households", label: "Household Management", icon: <HomeOutlined /> },
  { to: "/admin/official-management", label: "Officials Management", icon: <UserOutlined /> },
  { to: "/admin/document-requests", label: "Document Requests", icon: <UserOutlined /> },
  { to: "/admin/reports-complaints", label: "Reports & Complaints", icon: <ExclamationCircleOutlined /> },
  { to: "/admin/blockchain", label: "Blockchain Network", icon:<BlockOutlined /> },

  { to: "/admin/monitor", label: "System Monitor", icon: <MonitorOutlined /> },
  { to: "/admin/analytics", label: "Analytics", icon: <BarChartOutlined /> },
  { to: "/admin/settings", label: "Settings", icon: <SettingOutlined /> },
  { to: "/admin/publicdocuments", label: "Public Documents", icon: <UserOutlined /> },
];

export default function AdminSidebar({
  title = "Admin",
  menuItems,
  className = "",
  onNavigate,
  collapsible = true,
}) {
  const navigate = useNavigate();
  const items = useMemo(() => menuItems ?? defaultMenu, [menuItems]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("adminSidebarCollapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);
  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("adminSidebarCollapsed", next ? "1" : "0");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  };

  const base = "bg-slate-200 text-slate-900 border-r border-slate-300  ";
  const widthCls = collapsed ? "w-16" : "w-64";
  const mobileCls = mobileOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      {/* Mobile toggle button */}
      <button
        aria-label="Open menu"
        className="md:hidden fixed top-3 left-3 z-40 inline-flex items-center justify-center rounded-md p-2 bg-slate-900 text-white"
        onClick={() => setMobileOpen(true)}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
        </svg>
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          base,
          widthCls,
          "md:translate-x-0",
          "fixed md:static z-40 h-screen top-0 left-0", // use h-screen here
          "md:flex md:flex-col",
          "shadow-lg md:shadow-none",
          "select-none",
          "pt-4 md:pt-6",
          mobileCls,
          className,
          "transition-all duration-300 ease-in-out",
          collapsed ? "opacity-95" : "opacity-100",
          "overflow-y-auto", // keep this for sidebar scroll
        ].join(" ")}
      >
        {/* Header */}
        <div className="px-3 md:px-4 pb-4 flex items-center justify-between border-b mb-3 border-slate-300">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
              <SafetyOutlined />
            </div>
            {!collapsed && (
              <div className="truncate">
                <div className="text-sm font-semibold leading-5">{title}</div>
                <div className="text-xs text-slate-900">Control Panel</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Close on mobile */}
            <button
              className="md:hidden p-2 rounded hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.3 5.71L12 12.01l-6.29-6.3-1.41 1.42 6.29 6.29-6.29 6.29 1.41 1.42L12 14.85l6.29 6.28 1.41-1.42-6.29-6.29 6.29-6.29-1.41-1.42z" />
              </svg>
            </button>
            {collapsible && (
              <button
                className="hidden md:inline-flex p-2 rounded hover:bg-white/10"
                onClick={toggleCollapse}
                title={collapsed ? "Expand" : "Collapse"}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  {collapsed ? (
                    <path d="M8 5v14l11-7L8 5z" />
                  ) : (
                    <path d="M16 19V5L5 12l11 7z" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Menu */}
        <nav className="px-2 md:px-3 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-slate-100 text-black" : "text-slate-200 hover:bg-slate-300 hover:text-white",
                ].join(" ")
              }
              onClick={() => {
                setMobileOpen(false);
                onNavigate?.(item.to);
              }}
            >
              <span className="text-slate-900 group-hover:text-slate-900">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="mt-auto p-3">
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
            className={[
              "transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500",
              collapsed
                ? "w-10 h-10 flex items-center justify-center text-red-300 hover:bg-red-500 hover:text-white"
                : "w-full flex items-center gap-3 px-3 py-2 text-red-200 hover:text-white hover:bg-red-700"
            ].join(" ")}
          >
            <LogoutOutlined />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

      </aside>
    </>
  );
}

export function AdminLayout({ children, title = "Admin" }) {
  return (
    <div className="min-h-screen bg-slate-200 md:flex">
      <AdminSidebar title={title} />
      
      <main className="flex-1 p-4 overflow-y-auto h-screen rounded-3xl">
        {children}
      </main>
    </div>
  );
}