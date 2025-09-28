

    import React, { useState, useEffect } from "react";
    import { Table, Input, Button, Modal, Form, Popconfirm, message, Card as AntCard, Select } from "antd";
    import { AdminLayout } from "./AdminSidebar";
    import { UserOutlined } from "@ant-design/icons";

    const API_URL = "/api/admin/officials";

    export default function AdminOfficialManagement() {
        const [officials, setOfficials] = useState([]);
        const [loading, setLoading] = useState(false);
        const [search, setSearch] = useState("");
        const [addOpen, setAddOpen] = useState(false);
        const [addForm] = Form.useForm();
        const [creating, setCreating] = useState(false);
        const [editOpen, setEditOpen] = useState(false);
        const [editForm] = Form.useForm();
        const [editing, setEditing] = useState(false);
        const [selectedOfficial, setSelectedOfficial] = useState(null);

        useEffect(() => {
            fetchOfficials();
        }, []);

        const fetchOfficials = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(API_URL, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Failed to fetch officials");
                const data = await res.json();
                setOfficials(Array.isArray(data) ? data : []);
            } catch (err) {
                message.error(err.message || "Failed to fetch officials");
            }
            setLoading(false);
        };

        // Statistics
        const totalOfficials = officials.length;
        const activeOfficials = officials.filter(o => o.isActive).length;
        const inactiveOfficials = officials.filter(o => !o.isActive).length;

        // Table columns
        const columns = [
            { title: "Username", dataIndex: "username", key: "username" },
            { title: "Full Name", dataIndex: "fullName", key: "fullName" },
            { title: "Email", dataIndex: ["contact", "email"], key: "email", render: (_, r) => r.contact?.email || r.email },
            { title: "Mobile", dataIndex: ["contact", "mobile"], key: "mobile", render: (_, r) => r.contact?.mobile || r.mobile },
            { title: "Status", dataIndex: "isActive", key: "isActive", render: v => v ? "Active" : "Inactive" },
            {
                title: "Actions",
                key: "actions",
                render: (_, o) => (
                    <div className="flex gap-2">
                        <Button size="small" onClick={() => openEdit(o)}>Edit</Button>
                        <Popconfirm
                            title="Delete official?"
                            description="This action cannot be undone."
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDelete(o._id)}
                        >
                            <Button danger size="small">Delete</Button>
                        </Popconfirm>
                    </div>
                ),
            },
        ];

        const filteredOfficials = officials.filter(o =>
            [o.username, o.fullName, o.contact?.email || o.email, o.contact?.mobile || o.mobile]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(search.toLowerCase())
        );

        // Add Official
        const handleAddOfficial = async () => {
  try {
    setCreating(true);
    const values = await addForm.validateFields();
    const token = localStorage.getItem("token");
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
  username: values.username,
  password: values.password,
  fullName: values.fullName,
  email: values.email,
  mobile: values.mobile,
}),

    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to add official");
    }
    message.success("Official added!");
    setAddOpen(false);
    addForm.resetFields();
    fetchOfficials();
  } catch (err) {
    message.error(err?.message || "Failed to add official");
  }
  setCreating(false);
};


     // Open Edit Modal
const openEdit = (official) => {
  setSelectedOfficial(official);
  editForm.setFieldsValue({
    fullName: official.fullName,
    email: official.contact?.email || official.email,
    mobile: official.contact?.mobile || official.mobile,
    isActive: official.isActive,
  });
  setEditOpen(true);
};

// Handle Edit Official
const handleEditOfficial = async () => {
  try {
    setEditing(true);
    // Validate form fields
    const values = await editForm.validateFields();

    // Prepare data to match backend
    const body = {
      fullName: values.fullName,
      email: values.email,
      mobile: values.mobile,
      isActive: values.isActive,
    };

    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/${selectedOfficial._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to update official");
    }

    message.success("Official updated!");
    setEditOpen(false);
    fetchOfficials(); // Refresh table
  } catch (err) {
    message.error(err?.message || "Failed to update official");
  } finally {
    setEditing(false);
  }
};

// Delete Official
const handleDelete = async (id) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete official");
    }

    message.success("Official deleted!");
    fetchOfficials(); // Refresh table
  } catch (err) {
    message.error(err?.message || "Failed to delete official");
  }
};

        return (
            <AdminLayout title="Admin">
                <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
                    <div>
                        <nav className="px-5 h-20 flex items-center justify-between p-15">
                            <div>
                                <span className="text-2xl md:text-4xl font-bold text-gray-800">
                                    Officials Management
                                </span>
                            </div>
                            <div className="flex items-center outline outline-1 rounded-2xl p-5 gap-3">
                                <UserOutlined className="text-2xl text-blue-600" />
                                <div className="flex flex-col items-start">
                                    <span className="font-semibold text-gray-700">Administrator</span>
                                    <span className="text-xs text-gray-500">admin</span>
                                </div>
                            </div>
                        </nav>
                        <div className="px-4 pb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <AntCard className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4">
                                    <div className="text-sm font-bold text-black">Total Officials</div>
                                    <div className="text-3xl font-bold text-black">{totalOfficials}</div>
                                </AntCard>
                                <AntCard className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4">
                                    <div className="text-sm font-bold text-black">Active Officials</div>
                                    <div className="text-3xl font-bold text-black">{activeOfficials}</div>
                                </AntCard>
                                <AntCard className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4">
                                    <div className="text-sm font-bold text-black">Inactive Officials</div>
                                    <div className="text-3xl font-bold text-black">{inactiveOfficials}</div>
                                </AntCard>
                            </div>
                        </div>
                    </div>
                    {/* Table Section */}
                    <div className="bg-white rounded-2xl p-4 space-y-4">
                        <hr className="border-t border-gray-300" />
                        <div className="flex flex-col md:flex-row flex-wrap gap-2 md:items-center md:justify-between">
                            <div className="flex flex-wrap gap-2">
                                <Input.Search
                                    allowClear
                                    placeholder="Search officials"
                                    onSearch={v => setSearch(v.trim())}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    enterButton
                                    className="min-w-[180px] max-w-xs"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button type="primary" onClick={() => setAddOpen(true)}>
                                    Add Official
                                </Button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <Table
                                rowKey="_id"
                                loading={loading}
                                dataSource={filteredOfficials}
                                columns={columns}
                                pagination={{ pageSize: 10 }}
                                scroll={{ x: 800 }}
                            />
                        </div>
                    </div>
                    {/* Add Official Modal */}
                    <Modal
                        title="Add Official"
                        open={addOpen}
                        onCancel={() => addForm.resetFields() || setAddOpen(false)}
                        width={500}
                        footer={[
                            <Button key="cancel" onClick={() => addForm.resetFields() || setAddOpen(false)}>
                                Cancel
                            </Button>,
                            <Button key="submit" type="primary" loading={creating} onClick={handleAddOfficial}>
                                Add
                            </Button>,
                        ]}
                    >
                        <Form
  form={addForm}
  layout="vertical"
  name="addOfficialForm"
  autoComplete="off"
>
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
    rules={[{ required: true, message: "Password is required" }]}
  >
    <Input.Password />
  </Form.Item>

  <Form.Item
    name="fullName"
    label="Full Name"
    rules={[{ required: true, message: "Full Name is required" }]}
  >
    <Input />
  </Form.Item>

  <Form.Item
    name="email"
    label="Email"
    rules={[
      { required: true, message: "Valid email is required" },
      { type: "email", message: "Please enter a valid email address" }
    ]}
  >
    <Input />
  </Form.Item>

  <Form.Item
    name="mobile"
    label="Mobile"
    rules={[{ required: true, message: "Mobile is required" }]}
  >
    <Input />
  </Form.Item>
</Form>

                    </Modal>
                    {/* Edit Official Modal */}
                    <Modal
                        title="Edit Official"
                        open={editOpen}
                        onCancel={() => setEditOpen(false)}
                        width={500}
                        footer={[
                            <Button key="cancel" onClick={() => setEditOpen(false)}>
                                Cancel
                            </Button>,
                            <Button key="submit" type="primary" loading={editing} onClick={handleEditOfficial}>
                                Save
                            </Button>,
                        ]}
                    >
                        <Form form={editForm} layout="vertical">
                            <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}> <Input /> </Form.Item>
                            <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}> <Input /> </Form.Item>
                            <Form.Item name="mobile" label="Mobile" rules={[{ required: true }]}> <Input /> </Form.Item>
                            <Form.Item name="isActive" label="Status" initialValue={true}>
                                <Select options={[{ value: true, label: "Active" }, { value: false, label: "Inactive" }]} />
                            </Form.Item>
                        </Form>
                    </Modal>
                </div>
            </AdminLayout>
        );
    }
