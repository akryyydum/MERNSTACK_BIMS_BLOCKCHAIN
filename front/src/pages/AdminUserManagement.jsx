import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Input, Select, Tag, Switch, Modal, Form, message, Popconfirm, DatePicker, Steps } from "antd";
import { AdminLayout } from "./AdminSidebar";

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

  const [createResidentOpen, setCreateResidentOpen] = useState(false);
  const [residentForm] = Form.useForm();
  const [creatingResident, setCreatingResident] = useState(false);
  const [residentStep, setResidentStep] = useState(1); // +

  const [editOpen, setEditOpen] = useState(false);              // + add
  const [editForm] = Form.useForm();                            // + add
  const [editingUser, setEditingUser] = useState(null);         // + add
  const [savingEdit, setSavingEdit] = useState(false);          // + add

  // Fields to validate per step
  const residentStepFields = {                                  // +
    1: ["username", "password", ["contact","email"], ["contact","mobile"]],
    2: ["firstName", "lastName", "dateOfBirth", "birthPlace", "gender", "civilStatus", "religion"],
    3: [
      ["address","street"], ["address","barangay"], ["address","municipality"], ["address","province"], ["address","zipCode"],
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

  const openCreateResident = () => { // +
    residentForm.resetFields();
    setResidentStep(1);
    setCreateResidentOpen(true);
  };

  const handleNextResident = async () => {                      // +
    try {
      await residentForm.validateFields(residentStepFields[residentStep]);
      setResidentStep((s) => Math.min(3, s + 1));
    } catch (_) {
      // validation errors shown by antd
    }
  };

  const handlePrevResident = () => setResidentStep((s) => Math.max(1, s - 1)); // +

  const submitCreateResident = async () => {
    try {
      // Validate all before submit
      await residentForm.validateFields([
        ...residentStepFields[1],
        ...residentStepFields[2],
        ...residentStepFields[3],
      ]);
      const values = residentForm.getFieldsValue(true);
      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth?.toISOString?.() ?? values.dateOfBirth,
      };
      setCreatingResident(true);
      const res = await fetch(`${API_BASE}/api/admin/residents`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create resident");
      }
      message.success("Resident created");
      setCreateResidentOpen(false);
      fetchUsers();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message);
    } finally {
      setCreatingResident(false);
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

  return (
    <AdminLayout title="Admin">
      <div className="space-y-4">
        <h1 className="text-5xl">User Management</h1> {/* fix class -> className */}
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
          <div className="flex gap-2">
            <Button onClick={openCreateResident}>Add Resident</Button> {/* new button */}
            <Button type="primary" onClick={openCreate}>Create User</Button>
          </div>
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

        {/* Add Resident modal (now multi-step) */}
        <Modal
          title="Add Resident"
          open={createResidentOpen}
          onCancel={() => setCreateResidentOpen(false)}
          width={800}
          footer={[
            <Button key="cancel" onClick={() => setCreateResidentOpen(false)} disabled={creatingResident}>Cancel</Button>,
            residentStep > 1 && (
              <Button key="back" onClick={handlePrevResident} disabled={creatingResident}>
                Back
              </Button>
            ),
            residentStep < 3 && (
              <Button key="next" type="primary" onClick={handleNextResident} disabled={creatingResident}>
                Next
              </Button>
            ),
            residentStep === 3 && (
              <Button key="create" type="primary" loading={creatingResident} onClick={submitCreateResident}>
                Create
              </Button>
            ),
          ]}
        >
          <Steps
            size="small"
            current={residentStep - 1}
            className="mb-4"
            items={[
              { title: "Account" },
              { title: "Identity" },
              { title: "Address & Details" },
            ]}
          />

          <Form form={residentForm} layout="vertical">
            {residentStep === 1 && (
              <>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Form.Item
                    name={["contact", "email"]}
                    label="Email"
                    rules={[{ required: true }, { type: "email" }]}
                  >
                    <Input type="email" />
                  </Form.Item>
                  <Form.Item
                    name={["contact", "mobile"]}
                    label="Mobile"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                </div>
              </>
            )}

            {residentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Form.Item name="firstName" label="First name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="middleName" label="Middle name">
                  <Input />
                </Form.Item>
                <Form.Item name="lastName" label="Last name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="suffix" label="Suffix">
                  <Input />
                </Form.Item>
                <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}>
                  <DatePicker className="w-full" />
                </Form.Item>
                <Form.Item name="birthPlace" label="Birth Place" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="civilStatus" label="Civil Status" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: "single", label: "Single" },
                      { value: "married", label: "Married" },
                      { value: "widowed", label: "Widowed" },
                      { value: "separated", label: "Separated" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="religion" label="Religion">
                  <Input />
                </Form.Item>
              </div>
            )}

            {residentStep === 3 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Form.Item name={["address", "street"]} label="Street" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name={["address", "barangay"]} label="Barangay" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name={["address", "municipality"]} label="Municipality" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name={["address", "province"]} label="Province" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name={["address", "zipCode"]} label="ZIP Code">
                    <Input />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Form.Item name="citizenship" label="Citizenship" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="occupation" label="Occupation" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="education" label="Education" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </div>
              </>
            )}
          </Form>
        </Modal>

        {/* + Edit User modal */}
        <Modal
          title="Edit User"
          open={editOpen}
          onCancel={() => setEditOpen(false)}
          onOk={submitEdit}
          okText="Save"
          confirmLoading={savingEdit}
          destroyOnClose
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="fullName" label="Full name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "admin", label: "Admin" },
                  { value: "official", label: "Official" },
                  { value: "resident", label: "Resident", disabled: true }, // keep resident immutable here
                ]}
              />
            </Form.Item>
            <Form.Item label="Email" name={["contact", "email"]} rules={[{ required: true }, { type: "email" }]}>
              <Input type="email" />
            </Form.Item>
            <Form.Item label="Mobile" name={["contact", "mobile"]} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="isVerified" label="Verified" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="isActive" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </div>
          </Form>
        </Modal>

        {/* ...existing Create User and Add Resident modals... */}
      </div>
    </AdminLayout>
  );
}