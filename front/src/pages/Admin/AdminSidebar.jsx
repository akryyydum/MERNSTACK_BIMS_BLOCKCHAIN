import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { UserOutlined, UsergroupAddOutlined, DashboardOutlined, SafetyOutlined, LogoutOutlined,
    SettingOutlined, BarChartOutlined, MonitorOutlined, BlockOutlined, HomeOutlined, ExclamationCircleOutlined,
    DollarOutlined, DeleteOutlined, BulbOutlined, DownOutlined, RightOutlined
 } from "@ant-design/icons";
import AdminResidentManagement from "./AdminResidentManagement";

const defaultMenu = [
  { to: "/admin-dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
  { 
    to: "/admin/user-management", 
    label: "User Management", 
    icon: <UsergroupAddOutlined />,
    subItems: [
      { to: "/admin/residents", label: "Residents Management", icon: <UserOutlined /> },
      { 
        to: "/admin/households", 
        label: "Household Management", 
        icon: <HomeOutlined />,
        subItems: [
          { to: "/admin/garbage-fees", label: "Garbage Fees", icon: <DeleteOutlined /> },
          { to: "/admin/streetlight-fees", label: "Street Light Fees", icon: <BulbOutlined /> },
        ]
      },
      { to: "/admin/official-management", label: "Officials Management", icon: <UserOutlined /> },
    ]
  },
  { to: "/admin/document-requests", label: "Document Requests", icon: <UserOutlined /> },
  { to: "/admin/blockchain", label: "Blockchain Network", icon: <BlockOutlined /> },
  { to: "/admin/reports-complaints", label: "Reports & Complaints", icon: <ExclamationCircleOutlined /> },
  { to: "/admin/financial-reports", label: "Financial Reports", icon: <DollarOutlined /> },
  { to: "/admin/publicdocuments", label: "Public Documents", icon: <UserOutlined /> },
  { to: "/admin/settings", label: "Settings", icon: <SettingOutlined /> },
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
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("adminSidebarCollapsed");
    if (saved) setCollapsed(saved === "1");
    
    // Initialize expanded state for items with subItems (including nested)
    const initialExpanded = {};
    const initializeExpandedState = (menuItems) => {
      menuItems.forEach(item => {
        if (item.subItems) {
          initialExpanded[item.to] = false;
          // Recursively handle nested sub-items
          initializeExpandedState(item.subItems);
        }
      });
    };
    initializeExpandedState(items);
    
    // Load saved expanded state from localStorage
    const savedExpanded = localStorage.getItem("adminSidebarExpanded");
    if (savedExpanded) {
      try {
        const parsedExpanded = JSON.parse(savedExpanded);
        setExpandedItems({ ...initialExpanded, ...parsedExpanded });
      } catch (e) {
        setExpandedItems(initialExpanded);
      }
    } else {
      setExpandedItems(initialExpanded);
    }
  }, [items]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("adminSidebarCollapsed", next ? "1" : "0");
  };

  const toggleSubMenu = (itemTo) => {
    setExpandedItems(prev => {
      const newState = {
        ...prev,
        [itemTo]: !prev[itemTo]
      };
      // Persist expanded state to localStorage
      localStorage.setItem("adminSidebarExpanded", JSON.stringify(newState));
      return newState;
    });
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
            <div key={item.to}>
              {item.subItems ? (
                // Parent item with sub-items
                <div>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive ? "bg-slate-100 text-black" : "text-slate-700 hover:bg-slate-300 hover:text-black",
                      ].join(" ")
                    }
                    onClick={() => {
                      setMobileOpen(false);
                      onNavigate?.(item.to);
                    }}
                  >
                    <span className="text-slate-900 group-hover:text-slate-900">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="truncate flex-1">{item.label}</span>
                        <button
                          className="ml-auto p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-all duration-200 flex items-center justify-center"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSubMenu(item.to);
                          }}
                        >
                          <span 
                            className={`inline-block transition-transform duration-300 ease-in-out ${
                              expandedItems[item.to] ? 'rotate-180' : 'rotate-0'
                            }`}
                            style={{ fontSize: '10px' }}
                          >
                            <DownOutlined />
                          </span>
                        </button>
                      </>
                    )}
                  </NavLink>
                  
                  {/* Sub-items */}
                  {!collapsed && expandedItems[item.to] && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-300 pl-3 py-1">
                      {item.subItems.map((subItem) => (
                        <div key={subItem.to}>
                          {subItem.subItems ? (
                            // Nested sub-item with its own sub-items
                            <div>
                              <NavLink
                                to={subItem.to}
                                className={({ isActive }) =>
                                  [
                                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors relative",
                                    isActive ? "bg-slate-100 text-black" : "text-slate-600 hover:bg-slate-300 hover:text-black",
                                  ].join(" ")
                                }
                                onClick={() => {
                                  setMobileOpen(false);
                                  onNavigate?.(subItem.to);
                                }}
                              >
                                <span className="text-slate-700 group-hover:text-slate-900 text-xs">{subItem.icon}</span>
                                <span className="truncate text-sm flex-1">{subItem.label}</span>
                                <button
                                  className="ml-auto p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-all duration-200 flex items-center justify-center"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleSubMenu(subItem.to);
                                  }}
                                >
                                  <span 
                                    className={`inline-block transition-transform duration-300 ease-in-out ${
                                      expandedItems[subItem.to] ? 'rotate-180' : 'rotate-0'
                                    }`}
                                    style={{ fontSize: '8px' }}
                                  >
                                    <DownOutlined />
                                  </span>
                                </button>
                              </NavLink>
                              
                              {/* Nested sub-items */}
                              {expandedItems[subItem.to] && (
                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-3 py-1">
                                  {subItem.subItems.map((nestedItem) => (
                                    <NavLink
                                      key={nestedItem.to}
                                      to={nestedItem.to}
                                        className={({ isActive }) =>
                                          [
                                            "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors relative",
                                            isActive 
                                              ? "bg-slate-100 text-black" 
                                              : "text-slate-500 hover:bg-slate-300 hover:text-black",
                                          ].join(" ")
                                        }
                                        onClick={() => {
                                          setMobileOpen(false);
                                          // Keep both parent and sub-item expanded
                                          setExpandedItems(prev => ({
                                            ...prev,
                                            [item.to]: true,
                                            [subItem.to]: true
                                          }));
                                          onNavigate?.(nestedItem.to);
                                        }}
                                      >
                                        <span className="text-slate-600 group-hover:text-slate-900 text-xs">{nestedItem.icon}</span>
                                        <span className="truncate text-xs">{nestedItem.label}</span>
                                      </NavLink>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            // Regular sub-item
                            <NavLink
                              to={subItem.to}
                              className={({ isActive }) =>
                                [
                                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors relative",
                                  isActive 
                                    ? "bg-slate-100 text-black" 
                                    : "text-slate-600 hover:bg-slate-300 hover:text-black",
                                ].join(" ")
                              }
                              onClick={() => {
                                setMobileOpen(false);
                                const parentItem = items.find(i => i.subItems?.some(sub => sub.to === subItem.to));
                                if (parentItem) {
                                  setExpandedItems(prev => ({
                                    ...prev,
                                    [parentItem.to]: true
                                  }));
                                }
                                onNavigate?.(subItem.to);
                              }}
                            >
                              <span className="text-slate-700 group-hover:text-slate-900 text-xs">{subItem.icon}</span>
                              <span className="truncate text-sm">{subItem.label}</span>
                            </NavLink>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Regular menu item
                <NavLink
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
              )}
            </div>
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