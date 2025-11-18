import React, { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Form, Select, Popconfirm, message, Tag, Descriptions, Alert } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { UserOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const [createForm] = Form.useForm();
  const [responseForm] = Form.useForm();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('complaintsColumnsVisibility');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      id: true,
      type: true,
      title: true,
      submittedBy: true,
      purok: true,
      category: true,
      priority: true,
      status: true,
      dateSubmitted: true,
      actions: true,
    };
  });

  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('complaintsColumnsVisibility', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

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
      let values = await createForm.validateFields();
      if (values.category === "Other") {
        values = { ...values, category: customCategory || "Other" };
      }
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/api/admin/complaints`,
        values,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("Complaint created successfully!");
      setCreateOpen(false);
      createForm.resetFields();
      setCustomCategory("");
      setIsOtherCategory(false);
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

  const allColumns = [
    {
      title: "ID",
      dataIndex: "_id",
      key: "_id",
      columnKey: "id",
      width: 80,
      render: (id) => `#${id.slice(-6)}`,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      columnKey: "type",
      width: 100,
      render: (type) => (
        <Tag color={type === "complaint" ? "red" : "blue"}>
          {type.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: "Complaint", value: "complaint" },
        { text: "Report", value: "report" },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      columnKey: "title",
      width: 200,
    },
    {
      title: "Submitted By",
      key: "resident",
      columnKey: "submittedBy",
      width: 150,
      render: (_, record) => formatResidentName(record.residentId),
    },
    {
      title: "Purok",
      dataIndex: "location",
      key: "location",
      columnKey: "purok",
      width: 150,
      render: (location) => location || 'Not specified',
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      columnKey: "category",
      width: 120,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      columnKey: "priority",
      width: 100,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>
          {priority.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: "Low", value: "low" },
        { text: "Medium", value: "medium" },
        { text: "High", value: "high" },
        { text: "Urgent", value: "urgent" },
      ],
      onFilter: (value, record) => record.priority === value,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      columnKey: "status",
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: "Pending", value: "pending" },
        { text: "Investigating", value: "investigating" },
        { text: "Resolved", value: "resolved" },
        { text: "Closed", value: "closed" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Date Submitted",
      dataIndex: "createdAt",
      key: "createdAt",
      columnKey: "dateSubmitted",
      width: 120,
      render: (date) => dayjs(date).format("MMM DD, YYYY"),
    },
    {
      title: "Actions",
      key: "actions",
      columnKey: "actions",
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <div className="flex gap-1 flex-wrap">
          <Button size="small" onClick={() => { setViewComplaint(record); setViewOpen(true); }}>
            View
          </Button>
          {record.status !== "resolved" && record.status !== "closed" && (
            <Button size="small" type="primary" onClick={() => openResponse(record)}>
              Update
            </Button>
          )}
          <Popconfirm
            title="Delete complaint?"
            description="This action cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  // Filter columns based on visibility
  const columns = allColumns.filter(col => visibleColumns[col.columnKey]);

  const filteredComplaints = (Array.isArray(complaints) ? complaints : []).filter(c =>
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
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full md:w-auto">
              <Input.Search
                allowClear
                placeholder="Search for Report or Complaint Title or Submitted By"
                onSearch={v => setSearch(v.trim())}
                value={search}
                onChange={e => setSearch(e.target.value)}
                enterButton
                className="w-full sm:min-w-[350px] md:min-w-[500px] max-w-full"
              />
              
              {/* Customize Columns Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2 whitespace-nowrap">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="7" height="7" x="3" y="3" rx="1" />
                      <rect width="7" height="7" x="14" y="3" rx="1" />
                      <rect width="7" height="7" x="14" y="14" rx="1" />
                      <rect width="7" height="7" x="3" y="14" rx="1" />
                    </svg>
                    Customize Columns
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.submittedBy}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, submittedBy: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Submitted By
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.purok}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, purok: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Purok
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.category}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, category: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Category
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.priority}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, priority: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Priority
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.status}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, status: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.dateSubmitted}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, dateSubmitted: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Date Submitted
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                type="primary"
                onClick={() => setCreateOpen(true)}
              >
                + Create Report/Complaint
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
                showQuickJumper: true,
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
          <Alert
            message="Create Report or Complaint"
            description="Select the resident filing this report or complaint, choose the type, and provide a detailed description."
            type="info"
            showIcon
            className="mb-3"
          />
          <div style={{ marginBottom: 16 }} /> 
          <Form form={createForm} layout="vertical" className="mt-3" style={{ marginBottom: 0 }}>
            <Form.Item name="residentId" label="Resident" rules={[{ required: true, message: "Please select a resident" }]} style={{ marginBottom: 12 }}>
              <Select
                placeholder="Select resident"
                showSearch
                filterOption={(input, option) => {
                  if (!option?.label) return false;
                  return option.label.toLowerCase().includes(input.toLowerCase());
                }}
                options={residents.map(r => ({
                  key: r._id,
                  value: r._id,
                  label: `${formatResidentName(r)} - ${r.address?.purok || 'N/A'}`
                }))}
              />
            </Form.Item>
            <Form.Item name="type" label="Type" rules={[{ required: true, message: "Please select a type" }]} style={{ marginBottom: 12 }}>
              <Select
              placeholder="Select type"
                options={[
                  { value: "complaint", label: "Complaint" },
                  { value: "report", label: "Report" },
                ]}
              />
            </Form.Item>
            <Form.Item name="category" label="Category" rules={[{ required: true, message: "Please select a category" }]} style={{ marginBottom: isOtherCategory ? 8 : 12 }}>
              <Select
                placeholder="Select category"
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
                onChange={val => {
                  setIsOtherCategory(val === "Other");
                  if (val !== "Other") setCustomCategory("");
                }}
              />
            </Form.Item>
            {isOtherCategory && (
              <Form.Item
                label="Please specify category"
                required
                style={{ marginBottom: 12 }}
                validateStatus={!customCategory ? "error" : "success"}
                help={!customCategory ? "Please enter a category" : ""}
              >
                <Input
                  placeholder="Enter custom category"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                />
              </Form.Item>
            )}
            <Form.Item name="title" label="Title" rules={[{ required: true, message: "Please enter a title" }]} style={{ marginBottom: 12 }}>
              <Input placeholder="Briefly title of the issue" />
            </Form.Item>
            <Form.Item name="description" label="Description" rules={[{ required: true, message: "Please enter a description" }]} style={{ marginBottom: 12 }}>
              <TextArea rows={3} placeholder="Detailed description of the issue" />
            </Form.Item>
            <Form.Item name="location" label="Purok" rules={[{ required: true, message: "Please select a purok" }]} style={{ marginBottom: 12 }}>
              <Select
                placeholder="Select purok"
                options={[
                  { value: "Purok 1", label: "Purok 1" },
                  { value: "Purok 2", label: "Purok 2" },
                  { value: "Purok 3", label: "Purok 3" },
                  { value: "Purok 4", label: "Purok 4" },
                  { value: "Purok 5", label: "Purok 5" },
                ]}
              />
            </Form.Item>
            <Form.Item name="priority" label="Priority" rules={[{ required: true, message: "Please select a priority" }]} style={{ marginBottom: 0 }}>
              <Select
                placeholder="Select priority"
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