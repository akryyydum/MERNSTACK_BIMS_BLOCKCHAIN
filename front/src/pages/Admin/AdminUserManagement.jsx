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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(undefined);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  // Remove resident creation state
  // const [createResidentOpen, setCreateResidentOpen] = useState(false);
  // const [residentForm] = Form.useForm();
  // const [creatingResident, setCreatingResident] = useState(false);
  // const [residentStep, setResidentStep] = useState(1);

  const [editOpen, setEditOpen] = useState(false);              // + add
  const [editForm] = Form.useForm();                            // + add
  const [editingUser, setEditingUser] = useState(null);         // + add
  const [savingEdit, setSavingEdit] = useState(false);          // + add

  // Fields to validate per step
  const residentStepFields = {                                  // +
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
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...(search ? { search } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
      });
      const res = await fetch(`${API_BASE}/api/admin/users?${params.toString()}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
      const data = await res.json();
      setUsers(data.items);
      setTotal(data.total);
    } catch (err) {
      message.error(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, roleFilter]);

  const onSearch = (v) => {
    setSearch(v.trim());
    setPage(1);
    // fetch immediately
    setTimeout(fetchUsers, 0);
  };

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
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      message.success("Status updated");
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
      if (users.length === 1 && page > 1) setPage(page - 1);
      else fetchUsers();
    } catch (e) {
      message.error(e.message);
    }
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

      // Frontend validation for required fields
      if (values.role === "resident") {
        if (!values.username || !values.password || !values.residentId) {
          message.error("Username, password, and resident selection are required for resident accounts.");
          setCreating(false);
          return;
        }
      } else {
        if (!values.username || !values.password || !values.fullName || !values.contact?.email || !values.contact?.mobile || !values.role) {
          message.error("Username, password, full name, email, mobile, and role are required for admin/official accounts.");
          setCreating(false);
          return;
        }
      }

      // Build payload conditionally
      let payload;
      if (values.role === "resident") {
        payload = {
          role: "resident",
          username: values.username,
          password: values.password,
          residentId: values.residentId
        };
      } else {
        payload = {
          role: values.role,
          fullName: values.fullName,
          username: values.username,
          password: values.password,
          contact: {
            email: values.contact.email,
            mobile: values.contact.mobile,
          },
        };
      }

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
      role: record.role,
      isActive: record.isActive,
      isVerified: record.isVerified,
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
          role: values.role,
          isActive: values.isActive,
          isVerified: values.isVerified,
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
            { value: "admin", label: "Admin" },
            { value: "official", label: "Official" },
            { value: "resident", label: "Resident", disabled: true }, // keep disabled here
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
      dataIndex: "isVerified",
      key: "isVerified",
      render: (v) => (v ? <Tag color="green">Verified</Tag> : <Tag color="orange">Unverified</Tag>),
    },
    {
      title: "Active",
      dataIndex: "isActive",
      key: "isActive",
      render: (v, r) => <Switch checked={v} onChange={(next) => handleToggleActive(r._id, next)} />,
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-3">
                <Card className="bg-slate-50 text-black shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Verified Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.isVerified === true).length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {users.filter(u => u.isVerified === true).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Unverified Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.isVerified === false).length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {users.filter(u => u.isVerified === false).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Active Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.isActive === true).length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {users.filter(u => u.isActive === true).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Inactive Users
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {users.filter(u => u.isActive === false).length}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {users.filter(u => u.isActive === false).length}
                  </div>
                </CardContent>
              </Card>
              </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4  space-y-4">
          <hr className="border-t border-gray-300" />

        <div className="flex flex-col md:flex-row flex-wrap gap-2  md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <Search
              allowClear
              placeholder="Search name, username, email"
              onSearch={onSearch}
              enterButton
              className="min-w-[180px] max-w-xs"
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
            dataSource={users}
            columns={columns}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
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
            if (open && createForm.getFieldValue("role") === "resident") {
              fetchUnlinkedResidents();
            }
          }}
        >
          <Form
            form={createForm}
            layout="vertical"
            onValuesChange={(changed) => {
              if (changed.role === "resident") fetchUnlinkedResidents();
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

            {roleValue !== "resident" && (
              <>
                <Form.Item
                  name="fullName"
                  label="Full name"
                  rules={[{ required: true, message: "Full name is required" }]}
                >
                  <Input />
                </Form.Item>
              </>
            )}

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

            {roleValue === "resident" ? (
              <>
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
              </>
            ) : (
              <>
                <Form.Item
                  name={["contact", "email"]}
                  label="Email"
                  rules={[
                    { required: true, message: "Email is required" },
                    { type: "email", message: "Invalid email" },
                  ]}
                >
                  <Input type="email" />
                </Form.Item>
                <Form.Item
                  name={["contact", "mobile"]}
                  label="Mobile"
                  rules={[{ required: true, message: "Mobile is required" }]}
                >
                  <Input />
                </Form.Item>
              </>
            )}
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
              <Input />
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

            <Form.Item name="isVerified" label="Verified" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}