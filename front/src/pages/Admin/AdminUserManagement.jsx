import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Input, Select, Tag, Switch, Modal, Form, message, Popconfirm, Alert } from "antd";
import { AdminLayout } from "./AdminSidebar";
import apiClient from "../../utils/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight } from "lucide-react"
import { UserOutlined } from "@ant-design/icons";

const { Search } = Input;
const { Option } = Select;

// Add responsive styles for modals
const modalStyles = `
  @media (max-width: 768px) {
    .user-modal-responsive .ant-modal-header {
      padding: 12px 16px;
    }
    .user-modal-responsive .ant-modal-title {
      font-size: 16px;
    }
    .user-modal-responsive .ant-modal-footer {
      padding: 10px 16px !important;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .user-modal-responsive .ant-modal-footer .ant-btn {
      margin: 0 !important;
      flex: 1 1 auto;
      min-width: 80px !important;
    }
    .responsive-form .ant-form-item-label > label {
      font-size: 13px;
    }
    .responsive-form .ant-form-item-explain,
    .responsive-form .ant-form-item-extra {
      font-size: 11px;
    }
    .ant-alert-icon {
      font-size: 16px;
    }
    .create-user-btn {
      width: 100% !important;
      min-width: 0 !important;
      margin-top: 4px;
    }
  }
  
  @media (max-width: 640px) {
    .user-modal-responsive .ant-modal {
      max-width: calc(100vw - 16px) !important;
      margin: 8px !important;
      top: 16px !important;
    }
    
    .user-modal-responsive .ant-modal-body {
      max-height: calc(100vh - 160px);
    }
    .create-user-btn {
      width: 100% !important;
      min-width: 0 !important;
      margin-top: 4px;
    }
  }
`;

export default function AdminUserManagement() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // Store all users for statistics

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);            
  const [editForm] = Form.useForm();                           
  const [editingUser, setEditingUser] = useState(null);         
  const [savingEdit, setSavingEdit] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [mobileTaken, setMobileTaken] = useState(false);

  // Change Password Modal
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordForm] = Form.useForm();
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState(false);          

  const residentStepFields = {                                 
    1: ["username", "password", ["contact","email"], ["contact","mobile"]],
    2: ["firstName", "lastName", "dateOfBirth", "birthPlace", "gender", "civilStatus", "religion"],
    3: [
      ["address","street"], ["address","purok"], 
      ["address","barangay"], ["address","municipality"], ["address","province"], ["address","zipCode"],
      "citizenship", "occupation", "education"
    ],
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all users without pagination (like resident management)
      const res = await apiClient.get('/api/admin/users?limit=1000');
      const data = res.data;
      setUsers(data.items || []);
      setAllUsers(data.items || []);
      setTotal(data.total || (data.items || []).length);
      // Reset to first page when data is refreshed
      setCurrentPage(1);
    } catch (err) {
      message.error(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  // Reset to page 1 when search or role filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const handleRoleChange = async (userId, nextRole) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      message.success("Role updated");
      fetchUsers();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleToggleActive = async (userId, next) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ 
          isActive: next
        }),
      });
      if (!res.ok) throw new Error("Failed to update active status");
      message.success(next ? "User activated!" : "User deactivated!");
      fetchUsers();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleToggleStatus = async (userId, next) => {
    try {
      const payload = { 
        residentStatus: next ? "verified" : "pending"
      };
      console.log('Sending status update:', payload);
      
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Status update error:', errorData);
        throw new Error(errorData.message || "Failed to update status");
      }
      
      message.success(next ? "User verified!" : "User set to pending!");
      fetchUsers();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleDelete = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to delete user");
      message.success("User deleted");
      // adjust page if last item removed
      if (users.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
      else fetchUsers();
    } catch (e) {
      message.error(e.message);
    }
  };

  // Pagination change handler
  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // Unlinked residents to attach when role === 'resident'
  const [unlinkedResidents, setUnlinkedResidents] = useState([]);
  const [loadingUnlinked, setLoadingUnlinked] = useState(false);

  const fetchUnlinkedResidents = async () => {
    setLoadingUnlinked(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/residents?unlinked=true`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to load residents without account");
      const data = await res.json();
      setUnlinkedResidents(data || []);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoadingUnlinked(false);
    }
  };

  const openCreate = () => {
    createForm.resetFields();
    createForm.setFieldsValue({ role: "official" });
    setUsernameTaken(false);
    setEmailTaken(false);
    setMobileTaken(false);
    setCreateOpen(true);
  };

  const roleValue = Form.useWatch("role", createForm);

  const submitCreate = async () => {
    try {
      const values = await createForm.validateFields();
      
      // Check if username already exists
      const existingUser = allUsers.find(u => u.username.toLowerCase() === values.username.toLowerCase());
      if (existingUser) {
        setUsernameTaken(true);
        message.error("Username is already taken. Please choose a different username.");
        return;
      }
      
      setCreating(true);
      setUsernameTaken(false);

      // All roles now use the same validation: username, password, residentId, role
      if (!values.username || !values.password || !values.residentId || !values.role) {
        message.error("Username, password, resident selection, and role are required.");
        setCreating(false);
        return;
      }

      // Build unified payload for all roles
      const payload = {
        role: values.role,
        username: values.username,
        password: values.password,
        residentId: values.residentId,
        residentStatus: 'verified', // Automatically verified when created by admin
      };

      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create user");
      }
      message.success("User created");
      setCreateOpen(false);
      fetchUsers();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  // + open edit
  const openEdit = (record) => {
    setEditingUser(record);
    setEditOpen(true);
    setUsernameTaken(false);
    setEmailTaken(false);
    setMobileTaken(false);
    editForm.setFieldsValue({
      fullName: record.fullName,
      username: record.username,
      role: record.role,
      isActive: record.isActive,
      isVerified: record.isVerified,
      residentStatus: record.residentStatus || 'pending',
      contact: {
        email: record.contact?.email,
        mobile: record.contact?.mobile,
      },
    });
  };

  // Open change password modal
  const openChangePassword = () => {
    changePasswordForm.resetFields();
    setCurrentPasswordError(false);
    setChangePasswordOpen(true);
  };

  // Submit change password
  const submitChangePassword = async () => {
    try {
      const values = await changePasswordForm.validateFields();
      setChangingPassword(true);

      // Change to new password (admin can change without current password)
      const res = await fetch(`${API_BASE}/api/admin/users/${editingUser._id}/change-password`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          newPassword: values.newPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to change password");
      }

      message.success("Password changed successfully");
      setChangePasswordOpen(false);
      changePasswordForm.resetFields();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message);
    } finally {
      setChangingPassword(false);
    }
  };

  // + submit edit
  const submitEdit = async () => {
    try {
      const values = await editForm.validateFields();
      
      // Check if username already exists (excluding current user)
      if (values.username && values.username !== editingUser.username) {
        const existingUsername = allUsers.find(u => 
          u.username.toLowerCase() === values.username.toLowerCase() &&
          u._id !== editingUser._id
        );
        if (existingUsername) {
          setUsernameTaken(true);
          message.error("Username is already taken. Please choose a different username.");
          return;
        }
      }
      
      // Check if email already exists (excluding current user)
      if (values.contact?.email) {
        const existingEmail = allUsers.find(u => 
          u.contact?.email?.toLowerCase() === values.contact.email.toLowerCase() &&
          u._id !== editingUser._id
        );
        if (existingEmail) {
          setEmailTaken(true);
          message.error("Email is already registered to another user.");
          return;
        }
      }
      
      // Check if mobile already exists (excluding current user)
      if (values.contact?.mobile) {
        const existingMobile = allUsers.find(u => 
          u.contact?.mobile === values.contact.mobile &&
          u._id !== editingUser._id
        );
        if (existingMobile) {
          setMobileTaken(true);
          message.error("Mobile number is already registered to another user.");
          return;
        }
      }
      
      setSavingEdit(true);
      setUsernameTaken(false);
      setEmailTaken(false);
      setMobileTaken(false);
      const res = await fetch(`${API_BASE}/api/admin/users/${editingUser._id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          fullName: values.fullName,
          username: values.username,
          role: values.role,
          isActive: values.isActive,
          isVerified: values.isVerified,
          residentStatus: values.residentStatus,
          contact: {
            email: values.contact?.email,
            mobile: values.contact?.mobile,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update user");
      }
      message.success("User updated");
      setEditOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter users based on search input and status filter
  const [statusFilter, setStatusFilter] = useState(null);
  const filteredUsers = users
    .filter(user => {
      // Search filter
      const matchesSearch = [
        user.fullName,
        user.username,
        user.contact?.email,
        user.contact?.mobile,
        user.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      // Status filter
      const matchesStatus = !statusFilter || statusFilter.length === 0 || statusFilter.includes((user.residentStatus || 'pending'));
      // Role filter
      const matchesRole = !roleFilter || roleFilter.length === 0 || roleFilter.includes(user.role);
      return matchesSearch && matchesStatus && matchesRole;
    })
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return b._id.localeCompare(a._id);
    });

  const columns = [
    {
      title: "Name",
      dataIndex: "fullName",
      key: "fullName",
      render: (v, r) => (
        <div>
          <div className="font-medium">{v || r.username}</div>
          <div className="text-xs text-gray-500">{r.username}</div>
        </div>
      ),
    },
    {
      title: "Contact",
      key: "contact",
      render: (_, r) => (
        <div className="text-xs">
          <div>{r.contact?.email}</div>
          <div className="text-gray-500">{r.contact?.mobile}</div>
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role, r) => (
        <Select
          size="small"
          value={role}
          onChange={(val) => handleRoleChange(r._id, val)}
          options={[
            {
              value: "admin",
              label: "Admin",
              disabled: users.filter(u => u.role === "admin").length >= 1 && r.role !== "admin"
            },
            { value: "official", label: "Official", disabled: false },
            { value: "resident", label: "Resident", disabled: false },
          ]}
        />
      ),
      filters: [
        { text: "Admin", value: "admin" },
        { text: "Official", value: "official" },
        { text: "Resident", value: "resident" },
      ],
      filteredValue: roleFilter || null,
      onFilter: (value, record) => {
        return record.role === value;
      },
    },
    {
      title: "Status",
      dataIndex: "residentStatus",
      key: "residentStatus",
      render: (_, r) => {
        const status = r.residentStatus || 'pending';
        const statusColors = {
          'verified': 'green',
          'pending': 'orange',
        };
        const statusLabels = {
          'verified': 'Verified',
          'pending': 'Pending',
        };
        return (
          <Tag color={statusColors[status]}>
            {statusLabels[status]}
          </Tag>
        );
      },
      filters: [
        { text: "Verified", value: "verified" },
        { text: "Pending", value: "pending" },
      ],
      filteredValue: statusFilter || null,
      onFilter: (value, record) => {
        return (record.residentStatus || 'pending') === value;
      },
    },
    {
      title: "Active",
      dataIndex: "isActive",
      key: "isActive",
      render: (v, r) => (
        <div style={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
          <Switch
            checked={v}
            onChange={(next) => handleToggleActive(r._id, next)}
            checkedChildren={null}
            unCheckedChildren={null}
            className="bg-transparent"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
      ),
    },
    {
      title: "Status Switch",
      key: "statusSwitch",
      render: (_, r) => {
        const status = r.residentStatus || 'pending';
        const isVerified = status === 'verified';
        return (
          <div style={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
            <Switch
              checked={isVerified}
              onChange={(next) => handleToggleStatus(r._id, next)}
              checkedChildren={null}
              unCheckedChildren={null}
              className="bg-transparent"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm
            title="Delete user?"
            description="This action cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r._id)}
          >
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  // Get user info from localStorage (or context/auth if you have it)
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  // Check if there is already an admin (for disabling admin option)
  const adminCount = users.filter(u => u.role === "admin").length;
  const editingIsAdmin = editingUser && editingUser.role === "admin";

  // Sync status filter from table
  const handleTableChangeWithStatus = (pagination, filters) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
    setStatusFilter(filters.residentStatus || null);
    setRoleFilter(filters.role || null);
  };

  return (
    <AdminLayout title="Admin">
      <style>{modalStyles}</style>
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300 " >
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                User Management
              </span>
            </div>
           
          </nav>
          {/* Statistics Section */}
          <div className="px-4 pb-4">
            {/* Row 1: Total Users, Total Officials, Total Residents, Verified Users */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Total Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-3xl font-bold text-black">
                    {users.length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Total Officials
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.role === "official").length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-3xl font-bold text-black">
                    {users.filter(u => u.role === "official").length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Total Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.role === "resident").length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-3xl font-bold text-black">
                    {users.filter(u => u.role === "resident").length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Verified Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.residentStatus === 'verified').length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-3xl font-bold text-black">
                    {users.filter(u => u.residentStatus === 'verified').length}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Row 2: Pending Users, Active Users, Inactive Users - Full Width */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mt-2 md:mt-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Pending Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => (u.residentStatus || 'pending') === 'pending').length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-3xl font-bold text-black">
                    {users.filter(u => (u.residentStatus || 'pending') === 'pending').length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Active Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.isActive).length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-3xl font-bold text-black">
                    {users.filter(u => u.isActive).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg col-span-2 md:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Inactive Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => !u.isActive).length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-3xl font-bold text-black">
                    {users.filter(u => !u.isActive).length}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4  space-y-4">
          <hr className="border-t border-gray-300" />

        <div className="flex flex-col md:flex-row flex-wrap gap-2  md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Search
              allowClear
              placeholder="Search for Users by Name, Username, or Email"
              onSearch={v => setSearch(v.trim())}
              value={search}
              onChange={e => setSearch(e.target.value)}
              enterButton
              className="w-full sm:min-w-[350px] md:min-w-[500px] max-w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="primary" onClick={openCreate} className="create-user-btn"> + Create User</Button>
          </div>
        </div>

        {/* Responsive table wrapper aligned with AdminBlockchainNetwork.jsx */}
        <div className="overflow-x-auto">
          <Table
            rowKey="_id"
            loading={loading}
            dataSource={filteredUsers}
            columns={columns}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: filteredUsers.length,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            onChange={handleTableChangeWithStatus}
            scroll={{ x: 800 }}
            className="responsive-table"
          />
          {!loading && filteredUsers.length === 0 && (
            <div className="pt-4 text-sm text-gray-500">
              No users found.
            </div>
          )}
        </div>
  </div>
        <Modal
          title="Create User"
          open={createOpen}
          onOk={submitCreate}
          confirmLoading={creating}
          onCancel={() => setCreateOpen(false)}
          okText="Create"
          width={window.innerWidth < 768 ? (window.innerWidth < 480 ? "95vw" : "90vw") : 520}
          bodyStyle={{ 
            padding: window.innerWidth < 480 ? 12 : window.innerWidth < 768 ? 16 : 24,
            maxHeight: window.innerWidth < 768 ? '80vh' : 'auto',
            overflowY: window.innerWidth < 768 ? 'auto' : 'visible'
          }}
          afterOpenChange={(open) => {
            if (open) {
              fetchUnlinkedResidents(); // Fetch for all roles now
            }
          }}
          className="user-modal-responsive"
        >
          <Alert
            message="Create New User Account"
            description="Select a role, provide login credentials, and link this user account to an existing resident profile. The selected resident must not already have a user account."
            type="info"
            showIcon
            className="mb-12"
            style={{
              fontSize: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '13px' : '14px',
              padding: window.innerWidth < 480 ? '8px 12px' : window.innerWidth < 768 ? '10px 14px' : '12px 16px',
              marginBottom: window.innerWidth < 480 ? '12px' : '16px'
            }}
          />
          <div style={{ marginBottom: window.innerWidth < 480 ? 8 : 12 }} />
          <Form
            form={createForm}
            layout="vertical"
            onValuesChange={(changed) => {
              if (changed.role) fetchUnlinkedResidents(); // Fetch when role changes
            }}
            style={{
              '--form-item-margin': window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px'
            }}
            className="responsive-form"
          >
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Role is required" }]}
              initialValue="resident"
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}
            >
              <Select
                options={[
                  { value: "official", label: "Official" },
                  { value: "admin", label: "Admin", disabled: adminCount >= 1 },
                  { value: "resident", label: "Resident" },
                ]}
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>

            <Form.Item
              name="residentId"
              label="Select Resident (no account yet)"
              rules={[{ required: true, message: "Please select a resident" }]}
              extra="List shows residents without a linked user account."
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}
            >
              <Select
                loading={loadingUnlinked}
                placeholder="Choose resident"
                showSearch
                optionFilterProp="label"
                options={unlinkedResidents.map(r => ({
                  value: r._id,
                  label: `${r.lastName}, ${r.firstName}${r.middleName ? " " + r.middleName : ""}${r.suffix ? " " + r.suffix : ""} • ${r.address?.purok || ""}`,
                }))}
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>
            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: "Username is required" },
                { min: 6, message: "Username must be at least 6 characters" },
              ]}
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}
            >
              <Input 
                autoComplete="off" 
                placeholder="Username (minimum of 6 characters)"
                onChange={(e) => {
                  const username = e.target.value;
                  if (username) {
                    const exists = allUsers.some(u => u.username.toLowerCase() === username.toLowerCase());
                    setUsernameTaken(exists);
                  } else {
                    setUsernameTaken(false);
                  }
                }}
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>

            {usernameTaken && (
              <Alert
                message="Username is already taken"
                description="Please choose a different username."
                type="error"
                showIcon
                style={{ 
                  marginBottom: window.innerWidth < 480 ? 12 : 16,
                  fontSize: window.innerWidth < 480 ? '12px' : '13px',
                  padding: window.innerWidth < 480 ? '6px 10px' : '8px 12px'
                }}
              />
            )}

            <Form.Item
              name="password"
              label="Create a password"
              rules={[
                { required: true, message: "Password is required" },
                { min: 6, message: "Password must be at least 6 characters" }
              ]}
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}
            >
              <Input.Password 
                autoComplete="new-password" 
                placeholder="At least 6 characters"
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Re-type password"
              dependencies={['password']}
              rules={[
                { required: true, message: "Please confirm your password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}
            >
              <Input.Password 
                placeholder="Re-enter password"
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>

            {/* Optional preview */}
            {(() => {
              const rid = createForm.getFieldValue("residentId");
              const sel = unlinkedResidents.find(r => r._id === rid);
              return sel ? (
                <div className="text-xs text-gray-600">
                  Email: {sel.contact?.email || "-"} • Mobile: {sel.contact?.mobile || "-"}
                </div>
              ) : null;
            })()}
          </Form>
        </Modal>

        {/* ADD THIS: Edit User Modal */}
        <Modal
          title="Edit User"
          open={editOpen}
          onOk={submitEdit}
          confirmLoading={savingEdit}
          onCancel={() => { setEditOpen(false); setEditingUser(null); }}
          okText="Save"
          width={window.innerWidth < 768 ? (window.innerWidth < 480 ? "95vw" : "90vw") : 800}
          bodyStyle={{ 
            padding: window.innerWidth < 480 ? 12 : window.innerWidth < 768 ? 16 : 24,
            maxHeight: window.innerWidth < 768 ? '80vh' : 'auto',
            overflowY: window.innerWidth < 768 ? 'auto' : 'visible'
          }}
          className="user-modal-responsive"
        >
          <Alert
            message="Edit User Information"
            description="Update user credentials and contact information. Email and mobile must be unique across all users."
            type="info"
            showIcon
            className="mb-4"
            style={{
              fontSize: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '13px' : '14px',
              padding: window.innerWidth < 480 ? '8px 12px' : window.innerWidth < 768 ? '10px 14px' : '12px 16px',
              marginBottom: window.innerWidth < 480 ? '8px' : '12px'
            }}
          />
          <div style={{ marginBottom: window.innerWidth < 480 ? 8 : 12 }} />
          <Form form={editForm} layout="vertical" style={{ gap: 0 }} className="responsive-form">
            <Form.Item
              name="fullName"
              label="Full name"
              rules={[{ required: true, message: "Full name is required" }]}
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}
            >
              <Input 
                disabled
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>

            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: "Username is required" },
                { min: 6, message: "Username must be at least 6 characters" },
              ]}
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}
            >
              <Input 
                placeholder="Username (minimum of 6 characters)"
                onChange={(e) => {
                  const username = e.target.value;
                  if (username && username !== editingUser?.username) {
                    const exists = allUsers.some(u => 
                      u.username.toLowerCase() === username.toLowerCase() &&
                      u._id !== editingUser?._id
                    );
                    setUsernameTaken(exists);
                  } else {
                    setUsernameTaken(false);
                  }
                }}
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>

            {usernameTaken && (
              <Alert
                message="Username is already taken"
                description="Please choose a different username."
                type="error"
                showIcon
                style={{ 
                  marginBottom: window.innerWidth < 480 ? 12 : 16,
                  fontSize: window.innerWidth < 480 ? '12px' : '13px',
                  padding: window.innerWidth < 480 ? '6px 10px' : '8px 12px'
                }}
              />
            )}

            <Form.Item 
              label={<span>Password </span>} 
              required
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}>
              <Button 
                type="default" 
                onClick={openChangePassword}
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              >
                Change Password
              </Button>
            </Form.Item>

            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Role is required" }]}
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}
            >
              <Select
                options={[
                  { value: "admin", label: "Admin", disabled: adminCount >= 1 && !editingIsAdmin },
                  { value: "official", label: "Official" },
                  { value: "resident", label: "Resident" },
                ]}
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>

            <Form.Item
              name={["contact", "email"]}
              label="Email"
              rules={[{ type: "email", message: "Invalid email" }]}
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}
            >
              <Input 
                type="email" 
                placeholder="juan.delacruz@email.com"
                onChange={(e) => {
                  const email = e.target.value;
                  if (email) {
                    const exists = allUsers.some(u => 
                      u.contact?.email?.toLowerCase() === email.toLowerCase() &&
                      u._id !== editingUser?._id
                    );
                    setEmailTaken(exists);
                  } else {
                    setEmailTaken(false);
                  }
                }}
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>

            {emailTaken && (
              <Alert
                message="Email is already registered"
                description="This email is already used by another user."
                type="error"
                showIcon
                style={{ 
                  marginBottom: window.innerWidth < 480 ? 12 : 16,
                  fontSize: window.innerWidth < 480 ? '12px' : '13px',
                  padding: window.innerWidth < 480 ? '6px 10px' : '8px 12px'
                }}
              />
            )}

            <Form.Item
              name={["contact", "mobile"]}
              label="Mobile Number"
              rules={[{
                required: false,
                pattern: /^09\d{9}$/,
                message: "Only numbers are allowed"
              }]}
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}
            >
              <Input 
                type="tel" 
                placeholder="09123456789"
                onChange={(e) => {
                  const mobile = e.target.value;
                  if (mobile) {
                    const exists = allUsers.some(u => 
                      u.contact?.mobile === mobile &&
                      u._id !== editingUser?._id
                    );
                    setMobileTaken(exists);
                  } else {
                    setMobileTaken(false);
                  }
                }}
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>

            {mobileTaken && (
              <Alert
                message="Mobile number is already registered"
                description="This mobile number is already used by another user."
                type="error"
                showIcon
                style={{ 
                  marginBottom: window.innerWidth < 480 ? 12 : 16,
                  fontSize: window.innerWidth < 480 ? '12px' : '13px',
                  padding: window.innerWidth < 480 ? '6px 10px' : '8px 12px'
                }}
              />
            )}

            <Form.Item
              name="residentStatus"
              label="Resident Status"
              rules={[{ required: true, message: "Status is required" }]}
              style={{ marginBottom: window.innerWidth < 480 ? '8px' : window.innerWidth < 768 ? '12px' : '24px' }}
            >
              <Select
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "verified", label: "Verified" },
                ]}
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Change Password Modal */}
        <Modal
          title="Change Password"
          open={changePasswordOpen}
          onOk={submitChangePassword}
          confirmLoading={changingPassword}
          onCancel={() => {
            setChangePasswordOpen(false);
            changePasswordForm.resetFields();
            setCurrentPasswordError(false);
          }}
          okText="Change Password"
          width={window.innerWidth < 768 ? (window.innerWidth < 480 ? "95vw" : "90vw") : 500}
          bodyStyle={{ 
            padding: window.innerWidth < 480 ? 12 : window.innerWidth < 768 ? 16 : 24,
            maxHeight: window.innerWidth < 768 ? '70vh' : 'auto',
            overflowY: window.innerWidth < 768 ? 'auto' : 'visible'
          }}
          className="user-modal-responsive"
        >
          <Alert
            message="Change User Password"
            description="Provide a new password for this user. The new password must be at least 6 characters long."
            type="warning"
            showIcon
            className="mb-4"
            style={{
              fontSize: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '13px' : '14px',
              padding: window.innerWidth < 480 ? '8px 12px' : window.innerWidth < 768 ? '10px 14px' : '12px 16px',
              marginBottom: window.innerWidth < 480 ? '8px' : '12px'
            }}
          />
          <div style={{ marginBottom: window.innerWidth < 480 ? 8 : 12 }} />
          <Form form={changePasswordForm} layout="vertical" className="responsive-form">
            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: "New password is required" },
                { min: 6, message: "Password must be at least 6 characters" },
              ]}
              style={{ marginBottom: window.innerWidth < 480 ? '12px' : window.innerWidth < 768 ? '16px' : '24px' }}
            >
              <Input.Password 
                placeholder="Enter new password (min 6 chars)"
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Re-type New Password"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: "Please confirm your new password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
              style={{ marginBottom: window.innerWidth < 480 ? '8px' : window.innerWidth < 768 ? '12px' : '24px' }}
            >
              <Input.Password 
                placeholder="Re-enter new password"
                style={{ fontSize: window.innerWidth < 480 ? '13px' : '14px' }}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}