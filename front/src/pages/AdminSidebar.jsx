import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const iconCls = "w-5 h-5 flex-shrink-0";
const IconDashboard = () => (
  <svg className={iconCls} viewBox="0 0 24 24" fill="none">
    <path d="M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h5v8H3v-8zm7 4h11v4H10v-4z" fill="currentColor" />
  </svg>
);
const IconUsers = () => (
  <svg className={iconCls} viewBox="0 0 24 24" fill="none">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.02.38-1.96 1.02-2.78C10.1 13.49 8.87 13 8 13zm8 0c-.73 0-1.76.2-2.78.58C14.41 14.55 15 15.71 15 17v2h9v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
  </svg>
);
const IconClipboard = () => (
  <svg className={iconCls} viewBox="0 0 24 24" fill="none">
    <path d="M9 2h6v2h3a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h3V2zm0 6h6V6H9v2z" fill="currentColor"/>
  </svg>
);
const IconReport = () => (
  <svg className={iconCls} viewBox="0 0 24 24" fill="none">
    <path d="M3 13h8v8H3v-8zm10-10h8v18h-8V3zM5 15h4v4H5v-4z" fill="currentColor"/>
  </svg>
);
const IconSettings = () => (
  <svg className={iconCls} viewBox="0 0 24 24" fill="none">
    <path d="M19.14 12.94a7.49 7.49 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.43 7.43 0 00-1.63-.95l-.36-2.55A.5.5 0 0013.9 2h-3.8a.5.5 0 00-.49.41l-.36 2.55c-.58.24-1.12.55-1.63.95l-2.39-.96a.5.5 0 00-.6.22L2.3 8.04a.5.5 0 00.12.64l2.03 1.58c-.06.31-.09.63-.09.94 0 .32.03.63.09.94L2.42 13.7a.5.5 0 00-.12.64l1.92 3.32c.13.22.38.31.6.22l2.39-.96c.51.4 1.05.71 1.63.95l.36 2.55c.05.24.25.41.49.41h3.8c.24 0 .45-.17.49-.41l.36-2.55c.58-.24 1.12-.55 1.63-.95l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z" fill="currentColor"/>
  </svg>
);
const IconShield = () => (
  <svg className={iconCls} viewBox="0 0 24 24" fill="none">
    <path d="M12 2l8 4v6c0 5-3.5 9.74-8 10-4.5-.26-8-5-8-10V6l8-4z" fill="currentColor"/>
  </svg>
);
const IconLogout = () => (
  <svg className={iconCls} viewBox="0 0 24 24" fill="none">
    <path d="M10 17l-1.41-1.41L11.17 13H3v-2h8.17l-2.58-2.59L10 7l5 5-5 5zM19 3h-6v2h6v14h-6v2h6a2 2 0 002-2V5a2 2 0 00-2-2z" fill="currentColor"/>
  </svg>
);

const defaultMenu = [
  { to: "/admin-dashboard", label: "Dashboard", icon: <IconDashboard /> },
  { to: "/admin/", label: "Dashboard", icon: <IconDashboard /> },
  { to: "/admin/residents", label: "Residents Management", icon: <IconUsers /> },
  { to: "/admin/officials", label: "Officials Management", icon: <IconUsers /> },
  { to: "/admin/blockchain", label: "Blockchain Network", icon: <IconShield /> },

  { to: "/admin/monitor", label: "System Monitor", icon: <IconClipboard /> },
  { to: "/admin/analytics", label: "Analytics", icon: <IconReport /> },
  { to: "/admin/settings", label: "Settings", icon: <IconSettings /> },
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

  const base = "bg-slate-900 text-slate-200";
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
          "fixed md:static z-40 h-full md:h-auto top-0 left-0 transition-transform duration-200 ease-out",
          "md:flex md:flex-col",
          "shadow-lg md:shadow-none",
          "select-none",
          "pt-4 md:pt-6",
          mobileCls,
          className,
        ].join(" ")}
      >
        {/* Header */}
        <div className="px-3 md:px-4 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
              <IconShield />
            </div>
            {!collapsed && (
              <div className="truncate">
                <div className="text-sm font-semibold leading-5">{title}</div>
                <div className="text-xs text-slate-400">Control Panel</div>
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
                  isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
                ].join(" ")
              }
              onClick={() => {
                setMobileOpen(false);
                onNavigate?.(item.to);
              }}
            >
              <span className="text-slate-300 group-hover:text-white">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="mt-auto p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-red-200 hover:text-white hover:bg-red-500/20 transition-colors"
          >
            <span className="text-red-300">
              <IconLogout />
            </span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

/**
 * Optional layout that places the sidebar on the left and the page content on the right.
 */
export function AdminLayout({ children, title = "Admin" }) {
  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <AdminSidebar title={title} />
      <main className="flex-1 md:ml-64 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}