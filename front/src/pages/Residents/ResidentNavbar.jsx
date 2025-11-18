import React, { useState, useEffect } from "react";
import logo from "../../assets/logo.png";
import { Layout, Menu, Avatar, Dropdown, Drawer } from "antd";
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
} from "@ant-design/icons";
import { useNavigate, NavLink, useLocation } from "react-router-dom";

const { Header } = Layout;

const ResidentNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [residentName, setResidentName] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      {/* LEFT */}
      <div className="flex items-center min-w-[200px]">
        {isMobile ? (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="mr-3 flex items-center rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-100"
          >
            <MenuUnfoldOutlined />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <img src={logo} className="w-12 h-12 object-contain" />
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold text-black">La Torre North</span>
              <span className="text-[8px] text-gray-600">
                Barangay Management Information System
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CENTER MENU */}
      <div className="hidden lg:flex flex-1 justify-center min-w-0 overflow-hidden">
        {desktopMenu}
      </div>

      {/* RIGHT PROFILE */}
      <div className="hidden lg:flex items-center ml-auto min-w-[200px] justify-end">
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
            <div className="flex flex-col">
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
