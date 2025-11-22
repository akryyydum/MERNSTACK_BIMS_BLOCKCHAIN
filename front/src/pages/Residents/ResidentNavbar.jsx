import React, { useState, useEffect } from "react";
import logo from "../../assets/logo.png";
import { Layout, Menu, Avatar, Dropdown, Drawer, Badge, Popover, List, Button, Empty, Spin } from "antd";
import {
  DashboardOutlined,
  FileTextOutlined,
  DollarOutlined,
  CommentOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloudSyncOutlined,
  EllipsisOutlined,
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import axios from "axios";
import { useSocket } from "../../hooks/useSocket";

const { Header } = Layout;

// Get API URL from environment or default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const ResidentNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [residentName, setResidentName] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    const loadResidentName = () => {
      const userData = localStorage.getItem("userData");
      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          setResidentName(parsedData.firstName || "Resident");
        } catch {
          setResidentName("Resident");
        }
      } else {
        setResidentName("Resident");
      }
    };

    loadResidentName();
    window.addEventListener("profileUpdated", loadResidentName);
    return () => window.removeEventListener("profileUpdated", loadResidentName);
  }, []);

  useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth < 1024);   // match Tailwind LG breakpoint
    if (window.innerWidth >= 1024) {
      setMobileMenuOpen(false);
    }
  };

  handleResize();
  window.addEventListener("resize", handleResize);

  return () => window.removeEventListener("resize", handleResize);
}, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(`${API_URL}/api/resident/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
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

  // Socket.IO for real-time notifications
  useSocket(
    // onNewNotification
    (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Optional: Show a toast notification
      console.log('New notification:', notification.title);
    },
    // onNotificationUpdate
    (notificationId, updates) => {
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, ...updates } : n)
      );
      if (updates.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    },
    // onNotificationDelete
    (notificationId) => {
      const deletedNotif = notifications.find(n => n._id === notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  );

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/api/resident/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
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
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/api/resident/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_URL}/api/resident/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      const deletedNotif = notifications.find(n => n._id === notificationId);
      setNotifications(notifications.filter(n => n._id !== notificationId));
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
      setNotificationsVisible(false);
    }
  };


  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userData");
    navigate("/login", { replace: true });
  };

  const profileMenu = [
    {
      key: "profile",
      label: "My Profile",
      icon: <UserOutlined />,
      onClick: () => navigate("/resident/profile"),
    },
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  // Notification content for popover
  const notificationContent = (
    <div style={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>
      
      {loadingNotifications ? (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description="No notifications"
          style={{ padding: '32px 16px' }}
        />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(item) => {
            const priorityColors = {
              high: '#ff4d4f',
              medium: '#faad14',
              low: '#52c41a'
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
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: item.isRead ? 400 : 600, fontSize: 13 }}>
                        {item.title}
                      </span>
                      {!item.isRead && (
                        <Badge status="processing" />
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <div style={{ fontSize: 12, marginBottom: 4 }}>{item.message}</div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                        {new Date(item.createdAt).toLocaleString()}
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
  );

  const menuItems = [
    {
      key: "/resident/dashboard",
      icon: <DashboardOutlined style={{ fontSize: "13px" }} />,
      label: <NavLink to="/resident/dashboard">Dashboard</NavLink>,
    },
    {
      key: "/resident/requests",
      icon: <FileTextOutlined style={{ fontSize: "13px" }} />,
      label: <NavLink to="/resident/requests">My Requests</NavLink>,
    },
    {
      key: "/resident/payments",
      icon: <DollarOutlined style={{ fontSize: "13px" }} />,
      label: <NavLink to="/resident/payments">Payments</NavLink>,
    },
    {
      key: "/resident/reports-complaints",
      icon: <CommentOutlined style={{ fontSize: "13px" }} />,
      label: (
        <NavLink to="/resident/reports-complaints">
          Reports & Complaints
        </NavLink>
      ),
    },
    {
      key: "/resident/public-documents",
      icon: <FileTextOutlined style={{ fontSize: "13px" }} />,
      label: <NavLink to="/resident/public-documents">Public Docs</NavLink>,
    },
    {
      key: "/resident/blockchain",
      icon: <CloudSyncOutlined style={{ fontSize: "13px" }} />,
      label: <NavLink to="/resident/blockchain">Blockchain</NavLink>,
    },
  ];

  const desktopMenu = (
    <Menu
      mode="horizontal"
      selectedKeys={[location.pathname]}
      overflowedIndicator={<EllipsisOutlined />}
      className="border-none flex-1 min-w-0 justify-center text-[13px]"
      style={{ background: "transparent" }}
    >
      {menuItems.map((item) => (
        <Menu.Item key={item.key} icon={item.icon}>
          {item.label}
        </Menu.Item>
      ))}
    </Menu>
  );

  const mobileMenu = (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      style={{ fontSize: "13px" }}
    >
      {menuItems.map((item) => (
        <Menu.Item key={item.key} icon={item.icon} onClick={() => setMobileMenuOpen(false)}>
          {item.label}
        </Menu.Item>
      ))}

      <Menu.Divider />

      <Menu.Item
        key="profile"
        icon={<UserOutlined />}
        onClick={() => {
          setMobileMenuOpen(false);
          navigate("/resident/profile");
        }}
      >
        My Profile
      </Menu.Item>

      <Menu.Item
        key="logout"
        icon={<LogoutOutlined />}
        onClick={() => {
          setMobileMenuOpen(false);
          handleLogout();
        }}
      >
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <Header
      className="sticky top-0 z-50 w-full px-6 flex items-center"
      style={{
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* LEFT (menu button on mobile, branding on desktop) */}
      <div className="flex items-center min-w-[60px] lg:min-w-[200px]">
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="mr-3 flex items-center rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-100"
            aria-label="Open navigation menu"
          >
            <MenuUnfoldOutlined />
          </button>
        )}
        {!isMobile && (
          <div className="flex items-center gap-3">
            <img src={logo} className="w-12 h-12 object-contain" alt="Barangay Logo" />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold text-black">La Torre North</span>
              <span className="text-[8px] text-gray-600">Barangay Management Information System</span>
            </div>
          </div>
        )}
      </div>

      {/* CENTER (logo centered on mobile) */}
      {isMobile && (
        <div className="flex flex-1 justify-center items-center lg:hidden">
          <img src={logo} className="w-12 h-12 object-contain" alt="Barangay Logo" />
        </div>
      )}

      {/* RIGHT - Notification Bell (Mobile Only) */}
      {isMobile && (
        <div className="flex items-center min-w-[60px] justify-end lg:hidden">
          <Popover
            content={notificationContent}
            trigger="click"
            placement="bottomRight"
          >
            <Badge count={unreadCount} offset={[-5, 5]}>
              <Button
                type="text"
                shape="circle"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Badge>
          </Popover>
        </div>
      )}

      {/* CENTER MENU */}
      <div className="hidden lg:flex flex-1 justify-center min-w-0 overflow-hidden">
        {desktopMenu}
      </div>

      {/* RIGHT PROFILE */}
      <div className="hidden lg:flex items-center ml-auto min-w-[200px] justify-end gap-4">
        {/* Notification Bell */}
        <Popover
          content={notificationContent}
          trigger="click"
          open={notificationsVisible}
          onOpenChange={setNotificationsVisible}
          placement="bottomRight"
        >
          <Badge count={unreadCount} offset={[-5, 5]}>
            <Button
              type="text"
              shape="circle"
              icon={<BellOutlined style={{ fontSize: 18 }} />}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </Badge>
        </Popover>

        {/* Profile Dropdown */}
        <Dropdown menu={{ items: profileMenu }} placement="bottomRight">
          <div className="cursor-pointer flex items-center gap-2 truncate">
            <Avatar icon={<UserOutlined />} />
            <span className="truncate text-sm text-black max-w-[160px]">
              Welcome, {residentName}!
            </span>
          </div>
        </Dropdown>
      </div>

      {/* MOBILE DRAWER */}
      <Drawer
        placement="left"
        width={280}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        closeIcon={<MenuFoldOutlined />}
        bodyStyle={{ padding: 0 }}
      >
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Avatar icon={<UserOutlined />} size="large" />
            <div className="flex flex-col flex-1">
              <span className="text-base font-semibold text-gray-800">{residentName}</span>
              <span className="text-xs text-gray-500">Resident</span>
            </div>
          </div>
        </div>

        {mobileMenu}
      </Drawer>
    </Header>
  );
};

export default ResidentNavbar;
