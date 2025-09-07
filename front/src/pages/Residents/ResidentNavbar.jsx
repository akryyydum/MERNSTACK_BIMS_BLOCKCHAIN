import React, { useState, useEffect } from 'react';
import logo from '../../assets/logo.png';
import { Layout, Menu, Avatar, Dropdown, message } from 'antd';
import { 
  DashboardOutlined, 
  FileTextOutlined, 
  TeamOutlined, 
  AppstoreOutlined, 
  DollarOutlined, 
  CommentOutlined, 
  UserOutlined, 
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import { useNavigate, NavLink } from 'react-router-dom';
import axios from 'axios';

const { Header } = Layout;

const ResidentNavbar = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [residentName, setResidentName] = useState('');

  useEffect(() => {
    // Only use firstName from localStorage, fallback to 'Resident'
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        setResidentName(parsedData.firstName || 'Resident');
      } catch (error) {
        setResidentName('Resident');
      }
    } else {
      setResidentName('Resident');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userData");
    navigate("/login", { replace: true });
  };

  const profileMenu = [
    {
      key: 'profile',
      label: 'My Profile',
      icon: <UserOutlined />,
      onClick: () => navigate('/resident/profile')
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    }
  ];

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        background: '#fff',
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}
    >
      <div className="flex items-center" style={{ minWidth: 220 }}>
        <img src={logo} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', marginRight: 12 }} />
        <div className="flex flex-col justify-center">
          <span className="text-lg font-semibold leading-tight">La Torre North</span>
          <span className="text-sm font-normal text-gray-600 leading-tight">Barangay Management Information System</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <Menu
          mode="horizontal"
          className="border-none"
          selectedKeys={[window.location.pathname]}
        >
          <Menu.Item key="/resident/dashboard" icon={<DashboardOutlined />}>
            <NavLink to="/resident/dashboard" className="no-underline hover:no-underline">Dashboard</NavLink>
          </Menu.Item>
          <Menu.Item key="/resident/requests" icon={<FileTextOutlined />}>
            <NavLink to="/resident/requests" className="no-underline hover:no-underline">My Requests</NavLink>
          </Menu.Item>
          <Menu.Item key="/resident/community" icon={<TeamOutlined />}>
            <NavLink to="/resident/community" className="no-underline hover:no-underline">Community</NavLink>
          </Menu.Item>
          <Menu.Item key="/resident/services" icon={<AppstoreOutlined />}>
            <NavLink to="/resident/services" className="no-underline hover:no-underline">Services</NavLink>
          </Menu.Item>
          <Menu.Item key="/resident/payments" icon={<DollarOutlined />}>
            <NavLink to="/resident/payments" className="no-underline hover:no-underline">Payments</NavLink>
          </Menu.Item>
        </Menu>
      </div>

      <div className="ml-4">
        <Dropdown menu={{ items: profileMenu }} placement="bottomRight">
          <div className="cursor-pointer flex items-center">
            <Avatar icon={<UserOutlined />} />
            <span className="ml-2 hidden md:inline">
              {residentName ? `Welcome, ${residentName}!` : 'Welcome, Resident'}
            </span>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
};

export default ResidentNavbar;