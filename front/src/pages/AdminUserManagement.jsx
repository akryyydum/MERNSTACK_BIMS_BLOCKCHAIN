import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Input, Select, Tag, Switch, Modal, Form, message, Popconfirm } from "antd";
import { AdminLayout } from "./AdminSidebar"; // add

const { Search } = Input;
const { Option } = Select;

export default function AdminUserManagement() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(undefined);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

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

  const openCreate = () => {
    createForm.resetFields();
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create user");
      }
      message.success("User created");
      setCreateOpen(false);
      fetchUsers();
    } catch (e) {
      if (e?.errorFields) return; // form validation error
      message.error(e.message);
    } finally {
      setCreating(false);
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
            { value: "resident", label: "Resident", disabled: true }, // prevent demoting to resident via UI
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
        <Popconfirm
          title="Delete user?"
          description="This action cannot be undone."
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDelete(r._id)}
        >
          <Button danger size="small">Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <AdminLayout title="Admin">
      <div className="space-y-4">
        <h1 class="text-5xl">User Management</h1>
        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div className="flex gap-2">
            <Search
              allowClear
              placeholder="Search name, username, email"
              onSearch={onSearch}
              enterButton
            />
            <Select
              allowClear
              placeholder="Filter role"
              style={{ width: 160 }}
              value={roleFilter}
              onChange={setRoleFilter}
            >
              <Option value="admin">Admin</Option>
              <Option value="official">Official</Option>
              <Option value="resident">Resident</Option>
            </Select>
          </div>
          <Button type="primary" onClick={openCreate}>Create User</Button>
        </div>

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
        />

        <Modal
          title="Create User"
          open={createOpen}
          onOk={submitCreate}
          confirmLoading={creating}
          onCancel={() => setCreateOpen(false)}
          okText="Create"
        >
          <Form form={createForm} layout="vertical">
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
                ]}
              />
            </Form.Item>
            <Form.Item
              name="fullName"
              label="Full name"
              rules={[{ required: true, message: "Full name is required" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: "Username is required" }]}
            >
              <Input autoComplete="off" />
            </Form.Item>
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
            <Form.Item
              name="password"
              label="Temporary password"
              rules={[{ required: true, message: "Password is required" }, { min: 6 }]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}