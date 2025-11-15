import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Input, Select, Tag, Switch, Modal, Form, message, Popconfirm } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight } from "lucide-react"
import { UserOutlined } from "@ant-design/icons";

const { Search } = Input;
const { Option } = Select;

export default function AdminUserManagement() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(undefined);
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

  const residentStepFields = {                                 
    1: ["username", "password", ["contact","email"], ["contact","mobile"]],
    2: ["firstName", "lastName", "dateOfBirth", "birthPlace", "gender", "civilStatus", "religion"],
    3: [
      ["address","street"], ["address","purok"], 
      ["address","barangay"], ["address","municipality"], ["address","province"], ["address","zipCode"],
      "citizenship", "occupation", "education"
    ],
  };

  const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";
  const token = localStorage.getItem("token");
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
  );

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all users without pagination (like resident management)
      const res = await fetch(`${API_BASE}/api/admin/users?limit=1000`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
      const data = await res.json();
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
    setCreateOpen(true);
  };

  const roleValue = Form.useWatch("role", createForm);

  const submitCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);

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
        residentId: values.residentId
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

  // + submit edit
  const submitEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setSavingEdit(true);
      const res = await fetch(`${API_BASE}/api/admin/users/${editingUser._id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          fullName: values.fullName,
          username: values.username,
          password: values.password, // Only included if provided
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

  // Filter users based on search input (client-side filtering like resident management)
  const filteredUsers = users
    .filter(user =>
      [
        user.fullName,
        user.username,
        user.contact?.email,
        user.contact?.mobile,
        user.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
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
      filteredValue: roleFilter ? [roleFilter] : null,
      onFilter: () => true, // handled server-side; keep UI synced
    },
    {
      title: "Verified",
      key: "verified",
      render: (_, r) => {
        const status = r.residentStatus || 'pending';
        const statusColors = {
          'verified': 'green',
          'pending': 'orange',
          'rejected': 'red'
        };
        const statusLabels = {
          'verified': 'Verified',
          'pending': 'Pending',
          'rejected': 'Rejected'
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
        { text: "Rejected", value: "rejected" },
      ],
      onFilter: (value, record) => (record.residentStatus || 'pending') === value,
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
      title: "Status",
      key: "status",
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
      filters: [
        { text: "Verified", value: "verified" },
        { text: "Pending", value: "pending" },
      ],
      onFilter: (value, record) => {
        const status = record.residentStatus || 'pending';
        if (value === 'verified') return status === 'verified';
        return status === 'pending';
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button> {/* + */}
          <Popconfirm
            title="Delete user?"
            description="This action cannot be undone."
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

  return (
    <AdminLayout title="Admin">
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300 " >
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                User Management
              </span>
            </div>
            <div className="flex items-center outline outline-1 rounded-2xl p-5 gap-3">
              <UserOutlined className="text-2xl text-blue-600" />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-gray-700">{userProfile.fullName || "Administrator"}</span>
                <span className="text-xs text-gray-500">{username}</span>
              </div>
            </div>
          </nav>
          {/* Statistics Section */}
          <div className="px-4 pb-4">
            {/* Row 1: Total Users, Total Officials, Total Residents, Verified Users */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {users.length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Officials
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.role === "official").length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {users.filter(u => u.role === "official").length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.role === "resident").length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {users.filter(u => u.role === "resident").length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Verified Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.residentStatus === 'verified').length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {users.filter(u => u.residentStatus === 'verified').length}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Row 2: Pending Users, Active Users, Inactive Users, Rejected Users */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Pending Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => (u.residentStatus || 'pending') === 'pending').length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {users.filter(u => (u.residentStatus || 'pending') === 'pending').length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Rejected Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.residentStatus === 'rejected').length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {users.filter(u => u.residentStatus === 'rejected').length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Active Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.isActive).length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {users.filter(u => u.isActive).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Inactive Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => !u.isActive).length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
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
            {/* Removed Add Resident */}
            <Button type="primary" onClick={openCreate}>Create User</Button>
          </div>
        </div>

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
            onChange={handleTableChange}
            scroll={{ x: 800 }}
          />
        </div>
  </div>
        <Modal
          title="Create User"
          open={createOpen}
          onOk={submitCreate}
          confirmLoading={creating}
          onCancel={() => setCreateOpen(false)}
          okText="Create"
          width={window.innerWidth < 600 ? "95vw" : 520}
          bodyStyle={{ padding: window.innerWidth < 600 ? 8 : 24 }}
          afterOpenChange={(open) => {
            if (open) {
              fetchUnlinkedResidents(); // Fetch for all roles now
            }
          }}
        >
          <Form
            form={createForm}
            layout="vertical"
            onValuesChange={(changed) => {
              if (changed.role) fetchUnlinkedResidents(); // Fetch when role changes
            }}
          >
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Role is required" }]}
              initialValue="official"
            >
              <Select
                options={[
                  { value: "official", label: "Official" },
                  { value: "admin", label: "Admin" },
                  { value: "resident", label: "Resident" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: "Username is required" }]}
            >
              <Input autoComplete="off" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Temporary password"
              rules={[{ required: true, message: "Password is required" }, { min: 6 }]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>

            {/* All roles now use resident selection */}
            <Form.Item
              name="residentId"
              label="Select Resident (no account yet)"
              rules={[{ required: true, message: "Please select a resident" }]}
              extra="List shows residents without a linked user account."
            >
              <Select
                loading={loadingUnlinked}
                placeholder="Choose resident"
                showSearch
                optionFilterProp="label"
                options={unlinkedResidents.map(r => ({
                  value: r._id,
                  label: `${r.lastName}, ${r.firstName}${r.middleName ? " " + r.middleName : ""} • ${r.address?.purok || ""}`,
                }))}
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
          width={window.innerWidth < 600 ? "95vw" : 520}
          bodyStyle={{ padding: window.innerWidth < 600 ? 8 : 24 }}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item
              name="fullName"
              label="Full name"
              rules={[{ required: true, message: "Full name is required" }]}
            >
              <Input disabled />
            </Form.Item>

            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: "Username is required" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ min: 6, message: "Password must be at least 6 characters" }]}
            >
              <Input.Password placeholder="Leave blank to keep current password" />
            </Form.Item>

            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Role is required" }]}
            >
              <Select
                options={[
                  { value: "admin", label: "Admin" },
                  { value: "official", label: "Official" },
                  { value: "resident", label: "Resident" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name={["contact", "email"]}
              label="Email"
              rules={[{ type: "email", message: "Invalid email" }]}
            >
              <Input type="email" />
            </Form.Item>

            <Form.Item
              name={["contact", "mobile"]}
              label="Mobile"
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="residentStatus"
              label="Resident Status"
              rules={[{ required: true, message: "Status is required" }]}
            >
              <Select
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "verified", label: "Verified" },
                  { value: "rejected", label: "Rejected" },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}