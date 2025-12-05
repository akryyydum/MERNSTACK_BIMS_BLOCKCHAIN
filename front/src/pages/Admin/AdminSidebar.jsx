import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { UserOutlined, UsergroupAddOutlined, DashboardOutlined, SafetyOutlined, LogoutOutlined,
  SettingOutlined, BarChartOutlined, MonitorOutlined, BlockOutlined, HomeOutlined, ExclamationCircleOutlined,
  DeleteOutlined, BulbOutlined, DownOutlined, RightOutlined, BellOutlined, CheckOutlined
 } from "@ant-design/icons";
import { Badge, Popover, List, Button, Empty, Spin } from "antd";
import { io } from 'socket.io-client';
import apiClient from "../../utils/apiClient";
import AdminResidentManagement from "./AdminResidentManagement";

const defaultMenu = [
  { to: "/admin-dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
  { 
    to: "/admin/management", 
    label: "Management", 
    icon: <SettingOutlined />,
    subItems: [
      { to: "/admin/user-management", label: "User Management", icon: <UsergroupAddOutlined /> },
      { to: "/admin/residents", label: "Residents Management", icon: <UserOutlined /> },
      { to: "/admin/households", label: "Household Management", icon: <HomeOutlined /> },
      { to: "/admin/official-management", label: "Officials Management", icon: <UserOutlined /> },
    ]
  },
  { to: "/admin/document-requests", label: "Document Requests", icon: <UserOutlined /> },
  { to: "/admin/blockchain", label: "Blockchain Network", icon: <BlockOutlined /> },
  { to: "/admin/reports-complaints", 
    label: "Utilities", 
    icon: <ExclamationCircleOutlined />,
    subItems: [
      { to: "/admin/reports-complaints", label: "Reports & Complaints", icon: <ExclamationCircleOutlined />},
      { to: "/admin/garbage-fees", label: "Garbage Fees", icon: <DeleteOutlined /> },
      { to: "/admin/streetlight-fees", label: "Street Light Fees", icon: <BulbOutlined /> },
    ]
  },
  { to: "/admin/financial-reports", label: "Financial Reports", icon: <span className="font-bold">₱</span> },
  { to: "/admin/publicdocuments", label: "Public Documents", icon: <UserOutlined /> },
  { to: "/admin/settings", label: "Settings", icon: <SettingOutlined /> },
];

const noScrollbar = "overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
  const [animatedSections, setAnimatedSections] = useState({});
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Admin route definitions used to validate/normalize notification links
  const adminRoutes = useMemo(() => [
    "/admin-dashboard",
    "/admin/user-management",
    "/admin/residents",
    "/admin/households",
    "/admin/garbage-fees",
    "/admin/streetlight-fees",
    "/admin/document-requests",
    "/admin/reports-complaints",
    "/admin/financial-reports",
    "/admin/publicdocuments",
    "/admin/blockchain",
    "/admin/official-management",
    "/admin/settings",
  ], []);

  const typeRouteMap = useMemo(() => ({
    complaint: "/admin/reports-complaints",
    document_request: "/admin/document-requests",
    payment: "/admin/financial-reports",
    resident_registration: "/admin/residents",
    system: "/admin/settings",
  }), []);

  const resolveNotificationPath = (notification) => {
    const link = notification?.link;
    const type = notification?.type;

    if (!link) {
      return typeRouteMap[type] || "/admin-dashboard";
    }

    // External link: open in new tab handled by caller
    if (/^https?:\/\//i.test(link)) return link;

    // Ensure leading slash
    let path = link.startsWith('/') ? link : `/${link}`;

    // If missing admin prefix but matches a known admin subpath, add it
    if (!path.startsWith('/admin')) {
      const trimmed = path.replace(/^\/+/, '');
      const candidate = `/admin/${trimmed}`;
      path = candidate;
    }

    // Validate against known admin routes (allowing for params/query)
    const basePath = path.split('?')[0].replace(/\/$/, '');
    const isKnown = adminRoutes.some(r => basePath === r || basePath.startsWith(`${r}/`));
    if (!isKnown) {
      return typeRouteMap[type] || "/admin-dashboard";
    }
    return path;
  };

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

  // Fetch admin notifications
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await apiClient.get('/api/admin/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications();
    
    // Refresh notifications every 5 minutes as fallback
    const interval = setInterval(fetchNotifications, 300000);
    
    return () => clearInterval(interval);
  }, []);

  // Socket.IO for real-time admin notifications
  useEffect(() => {
    const socket = io(API_URL, {
      withCredentials: true,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 8000,
    });

    socket.on('connect', () => {
      console.log('[Admin Socket] Connected', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Admin Socket] Disconnected', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Admin Socket] Connect error', error.message);
    });

    // Admin-specific notification events
    socket.on('admin:notification:new', (data) => {
      setNotifications(prev => [data.notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      console.log('New admin notification:', data.notification.title);
    });

    socket.on('admin:notification:update', (data) => {
      setNotifications(prev => 
        prev.map(n => n._id === data.notificationId ? { ...n, ...data.updates } : n)
      );
      if (data.updates.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    });

    socket.on('admin:notification:delete', (data) => {
      const deletedNotif = notifications.find(n => n._id === data.notificationId);
      setNotifications(prev => prev.filter(n => n._id !== data.notificationId));
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('admin:notification:new');
      socket.off('admin:notification:update');
      socket.off('admin:notification:delete');
      socket.disconnect();
    };
  }, [notifications]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("adminSidebarCollapsed", next ? "1" : "0");
  };

  const toggleSubMenu = (itemTo) => {
    setAnimatedSections((prev) =>
      prev[itemTo] ? prev : { ...prev, [itemTo]: true }
    );
    setExpandedItems(prev => {
      const newState = {
        ...prev,
        [itemTo]: !prev[itemTo]
      };
      localStorage.setItem("adminSidebarExpanded", JSON.stringify(newState));
      return newState;
    });
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await apiClient.patch(`/api/admin/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/api/admin/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await apiClient.delete(`/api/admin/notifications/${notificationId}`);
      const deletedNotif = notifications.find(n => n._id === notificationId);
      setNotifications(notifications.filter(n => n._id !== notificationId));
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      // Delete all notifications by calling delete for each one
      await Promise.all(notifications.map(n => 
        apiClient.delete(`/api/admin/notifications/${n._id}`)
      ));
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    const target = resolveNotificationPath(notification);

    setNotificationsVisible(false);
    setMobileOpen(false);

    // External links open in a new tab
    if (/^https?:\/\//i.test(target)) {
      window.open(target, '_blank', 'noopener');
      return;
    }

    // Navigate to validated in-app route
    setTimeout(() => {
      navigate(target, { replace: false });
    }, 100);
  };

  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear HTTP-only cookies
      const API_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:4000';
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage
      localStorage.removeItem("role");
      navigate("/login", { replace: true });
    }
  };

  const base = "bg-slate-200 text-slate-900 border-r border-slate-300  ";
  const widthCls = collapsed ? "w-16" : "w-64";
  const mobileCls = mobileOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      {/* Mobile toggle button */}
      <button
        aria-label="Open menu"
        className="md:hidden fixed top-3 left-3 z-40 inline-flex items-center justify-center rounded-md p-2 bg-white text-white"
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
          "fixed md:static z-40 h-screen top-0 left-0",
          "md:flex md:flex-col",
          "shadow-lg md:shadow-none",
          "select-none",
          "pt-4 md:pt-6",
          mobileCls,
          className,
          "transition-all duration-300 ease-in-out",
          collapsed ? "opacity-95" : "opacity-100",
          noScrollbar,
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
            {/* Notification Bell */}
            {!collapsed && (
              <Popover
                content={
                  <div style={{ width: 380, maxWidth: 400, maxHeight: 500, overflow: 'auto' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1, gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>Admin Notifications</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {unreadCount > 0 && (
                          <Button type="link" size="small" onClick={markAllAsRead}>
                            Mark all read
                          </Button>
                        )}
                        {notifications.length > 0 && (
                          <Button type="link" size="small" danger onClick={clearAllNotifications}>
                            Clear all
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {loadingNotifications ? (
                      <div style={{ padding: 48, textAlign: 'center' }}>
                        <Spin size="large" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <Empty 
                        image={Empty.PRESENTED_IMAGE_SIMPLE} 
                        description="No notifications"
                        style={{ padding: '48px 16px' }}
                      />
                    ) : (
                      <List
                        dataSource={notifications.slice(0, 20)}
                        renderItem={(item) => {
                          const priorityColors = {
                            urgent: '#ff0000',
                            high: '#ff4d4f',
                            medium: '#faad14',
                            low: '#52c41a'
                          };
                          
                          const typeIcons = {
                            complaint: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
                            document_request: <UserOutlined style={{ color: '#1890ff' }} />,
                            payment: <span style={{ color: '#52c41a', fontWeight: 700 }}>₱</span>,
                            resident_registration: <UsergroupAddOutlined style={{ color: '#722ed1' }} />,
                            system: <SettingOutlined style={{ color: '#8c8c8c' }} />
                          };
                          
                          return (
                            <List.Item
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                backgroundColor: item.isRead ? 'transparent' : '#f0f5ff',
                                borderLeft: `3px solid ${priorityColors[item.priority] || '#d9d9d9'}`,
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = item.isRead ? 'transparent' : '#f0f5ff'}
                              onClick={() => handleNotificationClick(item)}
                              actions={[
                                !item.isRead && (
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<CheckOutlined />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(item._id);
                                    }}
                                    title="Mark as read"
                                  />
                                ),
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(item._id);
                                  }}
                                  title="Delete"
                                />
                              ].filter(Boolean)}
                            >
                              <List.Item.Meta
                                avatar={typeIcons[item.type]}
                                title={
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <span style={{ fontWeight: item.isRead ? 400 : 600, fontSize: 14, flex: 1, lineHeight: '1.4' }}>
                                      {item.title}
                                    </span>
                                    {!item.isRead && (
                                      <Badge status="processing" />
                                    )}
                                  </div>
                                }
                                description={
                                  <div>
                                    <div style={{ fontSize: 13, marginBottom: 4, color: '#595959', lineHeight: '1.5' }}>
                                      {item.message}
                                    </div>
                                    {item.residentName && (
                                      <div style={{ fontSize: 12, color: '#8c8c8c', fontStyle: 'italic' }}>
                                        From: {item.residentName}
                                      </div>
                                    )}
                                    <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
                                      {new Date(item.createdAt).toLocaleString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  </div>
                                }
                              />
                            </List.Item>
                          );
                        }}
                      />
                    )}
                  </div>
                }
                trigger="click"
                open={notificationsVisible}
                onOpenChange={setNotificationsVisible}
                placement="bottomRight"
                overlayStyle={{ zIndex: 1050 }}
              >
                <Badge count={unreadCount} offset={[-5, 5]} size="small">
                  <button
                    className="p-2 rounded hover:bg-white/10 text-slate-900 hover:text-slate-700"
                    title="Notifications"
                  >
                    <BellOutlined style={{ fontSize: 18 }} />
                  </button>
                </Badge>
              </Popover>
            )}
            
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
        <nav className={["px-2 md:px-3 space-y-1", noScrollbar].join(" ")}>
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
                    aria-expanded={Boolean(expandedItems[item.to])}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSubMenu(item.to);
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
                  <div
                    className={[
                      collapsed
                        ? "hidden"
                        : "ml-4 border-l-2 border-slate-300 pl-3 overflow-hidden",
                      animatedSections[item.to] ? "transition-all duration-300" : "transition-none",
                      expandedItems[item.to]
                        ? "max-h-[999px] opacity-100 mt-1 py-1 pointer-events-auto"
                        : "max-h-0 opacity-0 mt-0 py-0 pointer-events-none"
                    ].join(" ")}
                  >
                    <div className="space-y-1">
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
                                aria-expanded={Boolean(expandedItems[subItem.to])}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleSubMenu(subItem.to);
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
                              <div
                                className={[
                                  "ml-4 border-l-2 border-slate-200 pl-3 overflow-hidden",
                                  animatedSections[subItem.to] ? "transition-all duration-300" : "transition-none",
                                  expandedItems[subItem.to]
                                    ? "max-h-[999px] opacity-100 mt-1 py-1 pointer-events-auto"
                                    : "max-h-0 opacity-0 mt-0 py-0 pointer-events-none"
                                ].join(" ")}
                              >
                                <div className="space-y-1">
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
                              </div>
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
                  </div>
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
      
      <main className={["flex-1 p-4 h-screen rounded-3xl", noScrollbar].join(" ")}>
        {children}
      </main>
    </div>
  );
}