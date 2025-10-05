import React, { useState, useEffect } from "react";
import {
  Table,
  Input,
  Button,
  Modal,
  Form,
  Popconfirm,
  message,
  Card as AntCard,
  Select,
  List,
  Tag,
  Space,
} from "antd";
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
  const [isMobile, setIsMobile] = useState(false);

  // Track window size for responsive layout (fallback mobile cards)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640); // <640px -> mobile
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

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
  const activeOfficials = officials.filter((o) => o.isActive).length;
  const inactiveOfficials = officials.filter((o) => !o.isActive).length;

  // Columns
  const columns = [
    { 
      title: "Username", 
      dataIndex: "username", 
      key: "username", 
      width: 140,
      ellipsis: true,
      responsive: ['xs','sm','md','lg']
    },
    { 
      title: "Full Name", 
      dataIndex: "fullName", 
      key: "fullName", 
      width: 180, 
      ellipsis: true,
      responsive: ['sm','md','lg']
    },
    {
      title: "Position",
      dataIndex: "position",
      key: "position",
      width: 140,
      ellipsis: true,
      render: v => v || '-',
      responsive: ['md','lg']
    },
    {
      title: "Email",
      dataIndex: ["contact","email"],
      key: "email",
      width: 200,
      ellipsis: true,
      render: (_, r) => r.contact?.email || r.email,
      responsive: ['lg']
    },
    {
      title: "Mobile",
      dataIndex: ["contact","mobile"],
      key: "mobile",
      width: 140,
      ellipsis: true,
      render: (_, r) => r.contact?.mobile || r.mobile,
      responsive: ['sm','md','lg']
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      width: 90,
      render: v => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
      responsive: ['sm','md','lg']
    },
    {
      title: "Actions",
      key: "actions",
      fixed: 'right',
      width: 110,
      render: (_, o) => (
        <Space>
          <Button size="small" onClick={() => openEdit(o)}>Edit</Button>
          <Popconfirm
            title="Delete official?"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(o._id)}
          >
            <Button danger size="small">Del</Button>
          </Popconfirm>
        </Space>
      ),
      responsive: ['xs','sm','md','lg']
    }
  ];

  const filteredOfficials = officials.filter((o) =>
    [o.username, o.fullName, o.position, o.contact?.email || o.email, o.contact?.mobile || o.mobile]
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
          position: values.position,
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
    setEditOpen(true);
  };

  // Auto-populate form when modal opens
  useEffect(() => {
    if (editOpen && selectedOfficial) {
      editForm.setFieldsValue({
        fullName: selectedOfficial.fullName || "",
        position: selectedOfficial.position || "",
        email:
          selectedOfficial.contact?.email || selectedOfficial.email || "",
        mobile:
          selectedOfficial.contact?.mobile || selectedOfficial.mobile || "",
        isActive:
          typeof selectedOfficial.isActive === "boolean"
            ? selectedOfficial.isActive
            : true,
      });
    }
  }, [editOpen, selectedOfficial, editForm]);

  // Handle Edit
  const handleEditOfficial = async () => {
    try {
      setEditing(true);
      const values = await editForm.validateFields();
      const body = {
        fullName: values.fullName,
        position: values.position,
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
      fetchOfficials();
    } catch (err) {
      message.error(err?.message || "Failed to update official");
    } finally {
      setEditing(false);
    }
  };

  // Delete
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
      fetchOfficials();
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
                <span className="font-semibold text-gray-700">
                  Administrator
                </span>
                <span className="text-xs text-gray-500">admin</span>
              </div>
            </div>
          </nav>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AntCard className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4">
                <div className="text-sm font-bold text-black">
                  Total Officials
                </div>
                <div className="text-3xl font-bold text-black">
                  {totalOfficials}
                </div>
              </AntCard>
              <AntCard className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4">
                <div className="text-sm font-bold text-black">
                  Active Officials
                </div>
                <div className="text-3xl font-bold text-black">
                  {activeOfficials}
                </div>
              </AntCard>
              <AntCard className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4">
                <div className="text-sm font-bold text-black">
                  Inactive Officials
                </div>
                <div className="text-3xl font-bold text-black">
                  {inactiveOfficials}
                </div>
              </AntCard>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <hr className="border-t border-gray-300" />
          <div className="flex flex-col md:flex-row flex-wrap gap-2 md:items-center md:justify-between">
            <Input.Search
              allowClear
              placeholder="Search officials"
              onSearch={(v) => setSearch(v.trim())}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              enterButton
              className="min-w-[180px] max-w-xs"
            />
            <Button type="primary" onClick={() => setAddOpen(true)}>
              Add Official
            </Button>
          </div>
          <div className="overflow-x-auto">
            {isMobile ? (
              <List
                dataSource={filteredOfficials}
                loading={loading}
                locale={{ emptyText: 'No officials found' }}
                renderItem={item => (
                  <List.Item className="border rounded-lg px-3 py-2 mb-2 shadow-sm">
                    <div className="w-full flex flex-col gap-1 text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold">{item.fullName}</span>
                        <Tag color={item.isActive ? 'green':'red'}>{item.isActive ? 'Active':'Inactive'}</Tag>
                      </div>
                      <div className="text-gray-600">{item.position || '—'}</div>
                      <div className="text-gray-500 break-all">{item.contact?.email || item.email}</div>
                      <div className="text-gray-500">{item.contact?.mobile || item.mobile}</div>
                      <div className="flex gap-2 pt-1">
                        <Button size="small" onClick={() => openEdit(item)}>Edit</Button>
                        <Popconfirm
                          title="Delete official?"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleDelete(item._id)}
                        >
                          <Button size="small" danger>Delete</Button>
                        </Popconfirm>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Table
                rowKey="_id"
                loading={loading}
                dataSource={filteredOfficials}
                columns={columns}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                scroll={{ x: 'max-content' }}
                size="middle"
              />
            )}
          </div>
        </div>

        {/* Add Modal */}
        <Modal
          title="Add Official"
          open={addOpen}
          onCancel={() => {
            addForm.resetFields();
            setAddOpen(false);
          }}
          width={500}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                addForm.resetFields();
                setAddOpen(false);
              }}
            >
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={creating}
              onClick={handleAddOfficial}
            >
              Add
            </Button>,
          ]}
        >
          <Form form={addForm} layout="vertical" autoComplete="off">
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
              name="position"
              label="Position"
              rules={[{ required: true, message: "Position is required" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Valid email is required" },
                { type: "email", message: "Enter a valid email" },
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

        {/* Edit Modal */}
        <Modal
          title="Edit Official"
          open={editOpen}
          onCancel={() => {
            setEditOpen(false);
            editForm.resetFields();
            setSelectedOfficial(null);
          }}
          width={500}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setEditOpen(false);
                editForm.resetFields();
                setSelectedOfficial(null);
              }}
            >
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={editing}
              onClick={handleEditOfficial}
            >
              Save
            </Button>,
          ]}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="position" label="Position" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="mobile" label="Mobile" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="isActive" label="Status" initialValue={true}>
              <Select
                options={[
                  { value: true, label: "Active" },
                  { value: false, label: "Inactive" },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
