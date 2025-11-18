import React, { useState, useEffect } from 'react';
import logo from '../../assets/logo.png';
import { Layout, Menu, Avatar, Dropdown, Drawer } from 'antd';
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
  EllipsisOutlined
} from '@ant-design/icons';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';

const { Header } = Layout;

const ResidentNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [residentName, setResidentName] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    // Function to load the name from localStorage
    const loadResidentName = () => {
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
    };

    // Load name on mount
    loadResidentName();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      loadResidentName();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      setIsMobile(mobile);
      setViewportWidth(width);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const renderNavigationMenu = (mode = 'horizontal') => (
    <Menu
      key={`menu-${mode}-${viewportWidth}`}
      mode={mode}
      className={mode === 'horizontal' ? 'border-none' : ''}
      selectedKeys={[location.pathname]}
      style={{ fontSize: '13px' }}
    >
      <Menu.Item
        key="/resident/dashboard"
        icon={<DashboardOutlined style={{ fontSize: '13px' }} />}
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavLink to="/resident/dashboard" className="no-underline hover:no-underline text-[13px]">
          Dashboard
        </NavLink>
      </Menu.Item>
      <Menu.Item
        key="/resident/requests"
        icon={<FileTextOutlined style={{ fontSize: '13px' }} />}
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavLink to="/resident/requests" className="no-underline hover:no-underline text-[13px]">
          My Requests
        </NavLink>
      </Menu.Item>
      <Menu.Item
        key="/resident/payments"
        icon={<DollarOutlined style={{ fontSize: '13px' }} />}
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavLink to="/resident/payments" className="no-underline hover:no-underline text-[13px]">
          Payments
        </NavLink>
      </Menu.Item>
      <Menu.Item
        key="/resident/reports-complaints"
        icon={<CommentOutlined style={{ fontSize: '13px' }} />}
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavLink to="/resident/reports-complaints" className="no-underline hover:no-underline text-[13px]">
          Reports & Complaints
        </NavLink>
      </Menu.Item>
      {mode === 'horizontal' ? (
        <Menu.SubMenu key="more" title="More" icon={<EllipsisOutlined style={{ fontSize: '13px' }} />}>
          <Menu.Item
            key="/resident/public-documents"
            icon={<FileTextOutlined style={{ fontSize: '13px' }} />}
            onClick={() => setMobileMenuOpen(false)}
          >
            <NavLink to="/resident/public-documents" className="no-underline hover:no-underline text-[13px]">
              Public Docs
            </NavLink>
          </Menu.Item>
          <Menu.Item
            key="/resident/blockchain"
            icon={<CloudSyncOutlined style={{ fontSize: '13px' }} />}
            onClick={() => setMobileMenuOpen(false)}
          >
            <NavLink to="/resident/blockchain" className="no-underline hover:no-underline text-[13px]">
              Blockchain
            </NavLink>
          </Menu.Item>
        </Menu.SubMenu>
      ) : (
        <>
          <Menu.Item
            key="/resident/public-documents"
            icon={<FileTextOutlined style={{ fontSize: '13px' }} />}
            onClick={() => setMobileMenuOpen(false)}
          >
            <NavLink to="/resident/public-documents" className="no-underline hover:no-underline text-[13px]">
              Public Docs
            </NavLink>
          </Menu.Item>
          <Menu.Item
            key="/resident/blockchain"
            icon={<CloudSyncOutlined style={{ fontSize: '13px' }} />}
            onClick={() => setMobileMenuOpen(false)}
          >
            <NavLink to="/resident/blockchain" className="no-underline hover:no-underline text-[13px]">
              Blockchain
            </NavLink>
          </Menu.Item>
        </>
      )}
    </Menu>
  );

  const renderMobileMenu = () => (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      style={{ fontSize: '13px' }}
    >
      <Menu.Item
        key="/resident/dashboard"
        icon={<DashboardOutlined style={{ fontSize: '13px' }} />}
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavLink to="/resident/dashboard" className="no-underline hover:no-underline text-[13px]">
          Dashboard
        </NavLink>
      </Menu.Item>
      <Menu.Item
        key="/resident/requests"
        icon={<FileTextOutlined style={{ fontSize: '13px' }} />}
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavLink to="/resident/requests" className="no-underline hover:no-underline text-[13px]">
          My Requests
        </NavLink>
      </Menu.Item>
      <Menu.Item
        key="/resident/payments"
        icon={<DollarOutlined style={{ fontSize: '13px' }} />}
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavLink to="/resident/payments" className="no-underline hover:no-underline text-[13px]">
          Payments
        </NavLink>
      </Menu.Item>
      <Menu.Item
        key="/resident/reports-complaints"
        icon={<CommentOutlined style={{ fontSize: '13px' }} />}
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavLink to="/resident/reports-complaints" className="no-underline hover:no-underline text-[13px]">
          Reports & Complaints
        </NavLink>
      </Menu.Item>
      <Menu.Item
        key="/resident/public-documents"
        icon={<FileTextOutlined style={{ fontSize: '13px' }} />}
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavLink to="/resident/public-documents" className="no-underline hover:no-underline text-[13px]">
          Public Docs
        </NavLink>
      </Menu.Item>
      <Menu.Item
        key="/resident/blockchain"
        icon={<CloudSyncOutlined style={{ fontSize: '13px' }} />}
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavLink to="/resident/blockchain" className="no-underline hover:no-underline text-[13px]">
          Blockchain
        </NavLink>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="/resident/profile"
        icon={<UserOutlined style={{ fontSize: '13px' }} />}
        onClick={() => {
          setMobileMenuOpen(false);
          navigate('/resident/profile');
        }}
      >
        <span className="text-[13px]">My Profile</span>
      </Menu.Item>
      <Menu.Item
        key="logout"
        icon={<LogoutOutlined style={{ fontSize: '13px' }} />}
        onClick={() => {
          setMobileMenuOpen(false);
          handleLogout();
        }}
      >
        <span className="text-[13px]">Logout</span>
      </Menu.Item>
    </Menu>
  );

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        background: '#fff',
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}
    >
      <div className="flex items-center" style={{ minWidth: isMobile ? 'auto' : 220 }}>
        {isMobile ? (
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
            className="mr-3 flex items-center rounded-md border border-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-50 md:hidden"
            title="Open menu"
          >
            <MenuUnfoldOutlined />
          </button>
        ) : (
          <>
            <img src={logo} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', marginRight: 12 }} />
            <div className="flex flex-col justify-center">
              <span className="text-lg font-semibold leading-tight">La Torre North</span>
              <span className="text-sm font-normal text-gray-600 leading-tight">Barangay Management Information System</span>
            </div>
          </>
        )}
      </div>

      {isMobile && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <img src={logo} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} />
        </div>
      )}

      <div className="hidden flex-1 justify-center md:flex" style={{ minWidth: 0 }}>
        {renderNavigationMenu()}
      </div>

      <div className="ml-auto md:ml-4 hidden md:flex">
        <Dropdown menu={{ items: profileMenu }} placement="bottomRight">
          <div className="cursor-pointer flex items-center">
            <Avatar icon={<UserOutlined />} />
            <span className="ml-2">
              {residentName ? `Welcome, ${residentName}!` : 'Welcome, Resident'}
            </span>
          </div>
        </Dropdown>
      </div>

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
              <span className="text-base font-semibold text-gray-800">
                {residentName}
              </span>
              <span className="text-xs text-gray-500">Resident</span>
            </div>
          </div>
        </div>
        {renderMobileMenu()}
      </Drawer>
    </Header>
  );
};

export default ResidentNavbar;