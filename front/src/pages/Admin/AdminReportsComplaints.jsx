import React, { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Form, Select, Popconfirm, message, Tag, Descriptions } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { UserOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { TextArea } = Input;
const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";

export default function AdminReportsComplaints() {
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [residents, setResidents] = useState([]);
  const [search, setSearch] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewComplaint, setViewComplaint] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [responseOpen, setResponseOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const [createForm] = Form.useForm();
  const [responseForm] = Form.useForm();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    fetchComplaints();
    fetchResidents();
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE}/api/admin/complaints`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComplaints(res.data);
      // Reset to first page when data is refreshed
      setCurrentPage(1);
    } catch (err) {
      message.error("Failed to load complaints");
    }
    setLoading(false);
  };

  const fetchResidents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE}/api/admin/residents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResidents(res.data);
    } catch (err) {
      console.error("Failed to load residents:", err);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const values = await createForm.validateFields();
      const token = localStorage.getItem("token");
      
      await axios.post(
        `${API_BASE}/api/admin/complaints`,
        values,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success("Complaint created successfully!");
      setCreateOpen(false);
      createForm.resetFields();
      fetchComplaints();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to create complaint");
    }
    setCreating(false);
  };

  const handleStatusUpdate = async (id, status, response = "") => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/api/admin/complaints/${id}/status`,
        { status, response },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("Status updated successfully!");
      fetchComplaints();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE}/api/admin/complaints/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("Complaint deleted successfully!");
      fetchComplaints();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete complaint");
    }
  };

  const openResponse = (complaint) => {
    setSelectedComplaint(complaint);
    responseForm.setFieldsValue({
      status: complaint.status,
      response: complaint.response || ""
    });
    setResponseOpen(true);
  };

  const handleResponse = async () => {
    try {
      const values = await responseForm.validateFields();
      await handleStatusUpdate(selectedComplaint._id, values.status, values.response);
      setResponseOpen(false);
      responseForm.resetFields();
    } catch (err) {
      // Validation error
    }
  };

  // Statistics
  const totalComplaints = complaints.length;
  const pendingComplaints = complaints.filter(c => c.status === "pending").length;
  const investigatingComplaints = complaints.filter(c => c.status === "investigating").length;
  const resolvedComplaints = complaints.filter(c => c.status === "resolved").length;
  const closedComplaints = complaints.filter(c => c.status === "closed").length;

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "orange";
      case "investigating": return "blue";
      case "resolved": return "green";
      case "closed": return "gray";
      default: return "default";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent": return "red";
      case "high": return "orange";
      case "medium": return "blue";
      case "low": return "green";
      default: return "default";
    }
  };

  const formatResidentName = (resident) => {
    if (!resident) return "-";
    return [resident.firstName, resident.middleName, resident.lastName, resident.suffix]
      .filter(Boolean)
      .join(" ");
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "_id",
      key: "_id",
      width: 80,
      render: (id) => `#${id.slice(-6)}`,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type) => (
        <Tag color={type === "complaint" ? "red" : "blue"}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: 200,
    },
    {
      title: "Submitted By",
      key: "resident",
      width: 150,
      render: (_, record) => formatResidentName(record.residentId),
    },
    {
      title: "Purok",
      dataIndex: "location",
      key: "location",
      width: 150,
      render: (location) => location || 'Not specified',
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 120,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>
          {priority.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Date Submitted",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date) => dayjs(date).format("MMM DD, YYYY"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_, record) => (
        <div className="flex gap-1 flex-wrap">
          <Button size="small" onClick={() => { setViewComplaint(record); setViewOpen(true); }}>
            View
          </Button>
          <Button size="small" type="primary" onClick={() => openResponse(record)}>
            Update
          </Button>
          <Popconfirm
            title="Delete complaint?"
            description="This action cannot be undone."
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filteredComplaints = complaints.filter(c =>
    [
      c.title,
      c.description,
      c.category,
      c.location,
      c.type,
      formatResidentName(c.residentId),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Pagination change handler
  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  return (
    <AdminLayout title="Admin">
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Reports & Complaints Management
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
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Reports
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {totalComplaints}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {totalComplaints}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Pending
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {pendingComplaints}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {pendingComplaints}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Investigating
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {investigatingComplaints}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {investigatingComplaints}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Resolved
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {resolvedComplaints}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {resolvedComplaints}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Closed
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {closedComplaints}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {closedComplaints}
                  </div>
                </CardContent>
              </Card>
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
                placeholder="Search reports & complaints"
                onSearch={v => setSearch(v.trim())}
                value={search}
                onChange={e => setSearch(e.target.value)}
                enterButton
                className="min-w-[180px] max-w-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="primary"
                onClick={() => setCreateOpen(true)}
              >
                Create Report/Complaint
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filteredComplaints}
              columns={columns}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: filteredComplaints.length,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} reports/complaints`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              onChange={handleTableChange}
              scroll={{ x: 1200 }}
            />
          </div>
        </div>

        {/* Create Modal */}
        <Modal
          title="Create Report/Complaint"
          open={createOpen}
          onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
          onOk={handleCreate}
          confirmLoading={creating}
          width={600}
        >
          <Form form={createForm} layout="vertical">
            <Form.Item name="residentId" label="Resident" rules={[{ required: true }]}>
              <Select
                placeholder="Select resident"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {residents.map(r => (
                  <Select.Option key={r._id} value={r._id}>
                    {formatResidentName(r)} - {r.address?.purok}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "complaint", label: "Complaint" },
                  { value: "report", label: "Report" },
                ]}
              />
            </Form.Item>
            <Form.Item name="category" label="Category" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "Noise Complaint", label: "Noise Complaint" },
                  { value: "Property Dispute", label: "Property Dispute" },
                  { value: "Public Safety", label: "Public Safety" },
                  { value: "Infrastructure", label: "Infrastructure" },
                  { value: "Environmental", label: "Environmental" },
                  { value: "Animal Control", label: "Animal Control" },
                  { value: "Traffic/Parking", label: "Traffic/Parking" },
                  { value: "Other", label: "Other" },
                ]}
              />
            </Form.Item>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description" rules={[{ required: true }]}>
              <TextArea rows={4} />
            </Form.Item>
            <Form.Item name="location" label="Purok" rules={[{ required: true }]}>
              <Select
                placeholder="Select purok"
                options={[
                  { value: "Purok 1", label: "Purok 1" },
                  { value: "Purok 2", label: "Purok 2" },
                  { value: "Purok 3", label: "Purok 3" },
                  { value: "Purok 4", label: "Purok 4" },
                  { value: "Purok 5", label: "Purok 5" },
                  { value: "Purok 6", label: "Purok 6" },
                ]}
              />
            </Form.Item>
            <Form.Item name="priority" label="Priority">
              <Select
                defaultValue="medium"
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                  { value: "urgent", label: "Urgent" },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* View Modal */}
        <Modal
          title="Report/Complaint Details"
          open={viewOpen}
          onCancel={() => setViewOpen(false)}
          footer={null}
          width={700}
        >
          {viewComplaint && (
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="ID">#{viewComplaint._id.slice(-6)}</Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color={viewComplaint.type === "complaint" ? "red" : "blue"}>
                  {viewComplaint.type.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Title">{viewComplaint.title}</Descriptions.Item>
              <Descriptions.Item label="Submitted By">
                {formatResidentName(viewComplaint.residentId)}
              </Descriptions.Item>
              <Descriptions.Item label="Resident Contact">
                {viewComplaint.residentId?.contact?.mobile} | {viewComplaint.residentId?.contact?.email}
              </Descriptions.Item>
              <Descriptions.Item label="Purok">
                {viewComplaint.location || 'Not specified'}
              </Descriptions.Item>
              <Descriptions.Item label="Category">{viewComplaint.category}</Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={getPriorityColor(viewComplaint.priority)}>
                  {viewComplaint.priority.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(viewComplaint.status)}>
                  {viewComplaint.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Description">{viewComplaint.description}</Descriptions.Item>
              <Descriptions.Item label="Admin Response">
                {viewComplaint.response || "No response yet"}
              </Descriptions.Item>
              <Descriptions.Item label="Date Submitted">
                {dayjs(viewComplaint.createdAt).format("MMMM DD, YYYY HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {dayjs(viewComplaint.updatedAt).format("MMMM DD, YYYY HH:mm")}
              </Descriptions.Item>
              {viewComplaint.resolvedBy && (
                <Descriptions.Item label="Resolved By">
                  {viewComplaint.resolvedBy.username}
                </Descriptions.Item>
              )}
              {viewComplaint.resolvedAt && (
                <Descriptions.Item label="Resolved At">
                  {dayjs(viewComplaint.resolvedAt).format("MMMM DD, YYYY HH:mm")}
                </Descriptions.Item>
              )}
            </Descriptions>
          )}
        </Modal>

        {/* Response Modal */}
        <Modal
          title="Update Status & Response"
          open={responseOpen}
          onCancel={() => { setResponseOpen(false); responseForm.resetFields(); }}
          onOk={handleResponse}
          width={600}
        >
          <Form form={responseForm} layout="vertical">
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "investigating", label: "Investigating" },
                  { value: "resolved", label: "Resolved" },
                  { value: "closed", label: "Closed" },
                ]}
              />
            </Form.Item>
            <Form.Item name="response" label="Response/Notes">
              <TextArea rows={4} placeholder="Enter response or notes for the resident..." />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}