import React, { useEffect, useState } from "react";
import { Input, Button, Modal, Form, Select, Popconfirm, message, Tag, Tabs } from "antd";
import ResidentNavbar from "./ResidentNavbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  PlusOutlined, 
  SearchOutlined, 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CommentOutlined
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { TextArea } = Input;
const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";

export default function ResidentReportsComplaints() {
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewComplaint, setViewComplaint] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editComplaint, setEditComplaint] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showOtherCategory, setShowOtherCategory] = useState(false);
  const [showOtherCategoryEdit, setShowOtherCategoryEdit] = useState(false);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const residentData = Object.keys(userData).length > 0 ? userData : userProfile;

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE}/api/resident/complaints`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComplaints(res.data);
    } catch (err) {
      message.error("Failed to load complaints");
      console.error(err);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const values = await createForm.validateFields();
      const token = localStorage.getItem("token");
      
      // If Other category is selected, use the custom category text
      const submitData = {
        ...values,
        category: values.category === 'Other' && values.customCategory 
          ? values.customCategory 
          : values.category
      };
      
      await axios.post(
        `${API_BASE}/api/resident/complaints`,
        submitData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success("Complaint submitted successfully!");
      setCreateOpen(false);
      createForm.resetFields();
      setShowOtherCategory(false);
      fetchComplaints();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to create complaint");
    }
    setCreating(false);
  };

  const handleEdit = async () => {
    try {
      setUpdating(true);
      const values = await editForm.validateFields();
      const token = localStorage.getItem("token");
      
      // If Other category is selected, use the custom category text
      const submitData = {
        ...values,
        category: values.category === 'Other' && values.customCategory 
          ? values.customCategory 
          : values.category
      };
      
      await axios.put(
        `${API_BASE}/api/resident/complaints/${editComplaint._id}`,
        submitData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success("Complaint updated successfully!");
      setEditOpen(false);
      editForm.resetFields();
      setEditComplaint(null);
      setShowOtherCategoryEdit(false);
      fetchComplaints();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update complaint");
    }
    setUpdating(false);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE}/api/resident/complaints/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("Complaint deleted successfully!");
      fetchComplaints();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete complaint");
    }
  };

  const openEdit = (complaint) => {
    setEditComplaint(complaint);
    
    // Check if category is a custom one (not in predefined list)
    const isCustomCategory = !categoryOptions.includes(complaint.category);
    
    editForm.setFieldsValue({
      type: complaint.type,
      category: isCustomCategory ? 'Other' : complaint.category,
      customCategory: isCustomCategory ? complaint.category : undefined,
      title: complaint.title,
      description: complaint.description,
      location: complaint.location,
      priority: complaint.priority
    });
    
    setShowOtherCategoryEdit(isCustomCategory);
    setEditOpen(true);
  };

  // Statistics
  const totalComplaints = complaints.length;
  const pendingComplaints = complaints.filter(c => c.status === "pending").length;
  const investigatingComplaints = complaints.filter(c => c.status === "investigating").length;
  const resolvedComplaints = complaints.filter(c => c.status === "resolved").length;

  // Filter complaints based on active tab and search
  const filteredComplaints = complaints.filter(c => {
    // Tab filtering
    let tabFilter = true;
    if (activeTab === "pending") {
      tabFilter = c.status === "pending";
    } else if (activeTab === "investigating") {
      tabFilter = c.status === "investigating";
    } else if (activeTab === "resolved") {
      tabFilter = c.status === "resolved" || c.status === "closed";
    }

    // Search filtering
    const searchFilter = search ? [
      c.title,
      c.description,
      c.category,
      c.location,
      c.type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()) : true;

    return tabFilter && searchFilter;
  });

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

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending": return <ClockCircleOutlined />;
      case "investigating": return <ExclamationCircleOutlined />;
      case "resolved": return <CheckCircleOutlined />;
      case "closed": return <CheckCircleOutlined />;
      default: return <FileTextOutlined />;
    }
  };

  const canEdit = (complaint) => {
    return complaint.status === "pending";
  };

  const categoryOptions = [
    'Noise Complaint',
    'Property Dispute',
    'Public Safety',
    'Infrastructure',
    'Environmental',
    'Animal Control',
    'Traffic/Parking',
    'Other'
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const typeOptions = [
    { value: 'complaint', label: 'Complaint' },
    { value: 'report', label: 'Report' }
  ];

  const purokOptions = [
    { value: 'Purok 1', label: 'Purok 1' },
    { value: 'Purok 2', label: 'Purok 2' },
    { value: 'Purok 3', label: 'Purok 3' },
    { value: 'Purok 4', label: 'Purok 4' },
    { value: 'Purok 5', label: 'Purok 5' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <ResidentNavbar />
      
      <main className="mx-auto w-full max-w-9xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold text-slate-900">
                Reports & Complaints
              </CardTitle>
              <CardDescription>
                Submit and track your reports and complaints to the barangay
              </CardDescription>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1"
            >
              Submit New
            </Button>
          </CardHeader>
        </Card>

        {/* Statistics Cards */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Summary</CardTitle>
            <CardDescription>Overview of your complaints and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Card className="w-full border border-blue-200 bg-blue-50">
                <CardContent className="space-y-2 px-4 py-5 sm:px-6">
                  <p className="text-sm font-medium text-blue-700">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{totalComplaints}</p>
                </CardContent>
              </Card>
              <Card className="w-full border border-amber-200 bg-amber-50">
                <CardContent className="space-y-2 px-4 py-5 sm:px-6">
                  <p className="text-sm font-medium text-amber-700">Pending</p>
                  <p className="text-2xl font-bold text-amber-900">{pendingComplaints}</p>
                </CardContent>
              </Card>
              <Card className="w-full border border-purple-200 bg-purple-50">
                <CardContent className="space-y-2 px-4 py-5 sm:px-6">
                  <p className="text-sm font-medium text-purple-700">Investigating</p>
                  <p className="text-2xl font-bold text-purple-900">{investigatingComplaints}</p>
                </CardContent>
              </Card>
              <Card className="w-full border border-emerald-200 bg-emerald-50">
                <CardContent className="space-y-2 px-4 py-5 sm:px-6">
                  <p className="text-sm font-medium text-emerald-700">Resolved</p>
                  <p className="text-2xl font-bold text-emerald-900">{resolvedComplaints}</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">My Complaints</CardTitle>
            <CardDescription>View and manage your submitted complaints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filter Tabs */}
            <Tabs 
              activeKey={activeTab}
              type="card"
              items={[
                {
                  key: 'all',
                  label: 'All',
                  children: null,
                },
                {
                  key: 'pending',
                  label: 'Pending',
                  children: null,
                },
                {
                  key: 'investigating',
                  label: 'Investigating',
                  children: null,
                },
                {
                  key: 'resolved',
                  label: 'Resolved',
                  children: null,
                },
              ]}
              onChange={(key) => setActiveTab(key)}
            />

            {/* Search Bar */}
            <div className="flex justify-between items-center">
              <Input
                placeholder="Search complaints..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
                allowClear
              />
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
              <table className="min-w-full bg-white table-auto">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-6 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Complaint</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Category</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Purok</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Priority</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8">
                        <div className="flex justify-center items-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                          <span className="text-slate-500">Loading complaints...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <CommentOutlined style={{ fontSize: '32px' }} className="text-slate-400 mb-2" />
                          <p className="text-slate-500 font-medium">No complaints found</p>
                          <p className="text-slate-400 text-sm mt-1">Submit your first complaint to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((complaint) => (
                      <tr key={complaint._id} className="hover:bg-slate-50 transition-colors duration-150">
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              {complaint.type === 'complaint' ? <ExclamationCircleOutlined className="text-red-600" /> : <FileTextOutlined className="text-blue-600" />}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{complaint.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Tag size="small" color={complaint.type === "complaint" ? "red" : "blue"}>
                                  {complaint.type.toUpperCase()}
                                </Tag>
                                <p className="text-xs text-slate-500">#{complaint._id.slice(-6)}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-700 hidden sm:table-cell">
                          <div className="max-w-xs truncate">{complaint.category}</div>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-700 hidden md:table-cell">
                          <div className="max-w-xs truncate">{complaint.location}</div>
                        </td>
                        <td className="py-4 px-6 hidden lg:table-cell">
                          <Tag color={getPriorityColor(complaint.priority)} size="small">
                            {complaint.priority?.toUpperCase()}
                          </Tag>
                        </td>
                        <td className="py-4 px-6 hidden sm:table-cell">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            complaint.status === "pending" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                            complaint.status === "investigating" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                            complaint.status === "resolved" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                            "bg-slate-100 text-slate-800 border border-slate-200"
                          }`}>
                            {complaint.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-1">
                            <Button
                              type="default"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => { setViewComplaint(complaint); setViewOpen(true); }}
                              className="border border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                              View
                            </Button>
                            {canEdit(complaint) && (
                              <>
                                <Button
                                  type="default"
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => openEdit(complaint)}
                                  className="border border-green-600 text-green-600 hover:bg-green-50"
                                >
                                  Edit
                                </Button>
                                <Popconfirm
                                  title="Delete complaint?"
                                  description="This action cannot be undone."
                                  okButtonProps={{ danger: true }}
                                  onConfirm={() => handleDelete(complaint._id)}
                                >
                                  <Button
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    className="border border-red-600 text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </Button>
                                </Popconfirm>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Create Modal */}
      <Modal
        title="Submit New Report/Complaint"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
          setShowOtherCategory(false);
        }}
        confirmLoading={creating}
        width={600}
      >
        <Form form={createForm} layout="vertical" className="mt-4">
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: "Please select type" }]}
          >
            <Select placeholder="Select type" options={typeOptions} />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: "Please select category" }]}
          >
            <Select 
              placeholder="Select category"
              onChange={(value) => setShowOtherCategory(value === 'Other')}
            >
              {categoryOptions.map(cat => (
                <Select.Option key={cat} value={cat}>{cat}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          {showOtherCategory && (
            <Form.Item
              name="customCategory"
              label="Specify Category"
              rules={[{ required: true, message: "Please specify the category" }]}
            >
              <Input placeholder="Enter custom category" />
            </Form.Item>
          )}

          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Please enter title" }]}
          >
            <Input placeholder="Brief title of the issue" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please enter description" }]}
          >
            <TextArea rows={4} placeholder="Detailed description of the issue" />
          </Form.Item>

          <Form.Item
            name="location"
            label="Purok"
            rules={[{ required: true, message: "Please select purok" }]}
          >
            <Select placeholder="Select purok" options={purokOptions} />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Priority"
            rules={[{ required: true, message: "Please select priority" }]}
          >
            <Select placeholder="Select priority" options={priorityOptions} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Report/Complaint"
        open={editOpen}
        onOk={handleEdit}
        onCancel={() => {
          setEditOpen(false);
          editForm.resetFields();
          setEditComplaint(null);
          setShowOtherCategoryEdit(false);
        }}
        confirmLoading={updating}
        width={600}
      >
        <Form form={editForm} layout="vertical" className="mt-4">
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: "Please select type" }]}
          >
            <Select placeholder="Select type" options={typeOptions} />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: "Please select category" }]}
          >
            <Select 
              placeholder="Select category"
              onChange={(value) => setShowOtherCategoryEdit(value === 'Other')}
            >
              {categoryOptions.map(cat => (
                <Select.Option key={cat} value={cat}>{cat}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          {showOtherCategoryEdit && (
            <Form.Item
              name="customCategory"
              label="Specify Category"
              rules={[{ required: true, message: "Please specify the category" }]}
            >
              <Input placeholder="Enter custom category" />
            </Form.Item>
          )}

          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Please enter title" }]}
          >
            <Input placeholder="Brief title of the issue" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please enter description" }]}
          >
            <TextArea rows={4} placeholder="Detailed description of the issue" />
          </Form.Item>

          <Form.Item
            name="location"
            label="Purok"
            rules={[{ required: true, message: "Please select purok" }]}
          >
            <Select placeholder="Select purok" options={purokOptions} />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Priority"
            rules={[{ required: true, message: "Please select priority" }]}
          >
            <Select placeholder="Select priority" options={priorityOptions} />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={null}
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setViewComplaint(null);
        }}
        footer={null}
        width={"90%"}
        style={{ maxWidth: "800px" }}
        bodyStyle={{ padding: 0 }}
      >
        {viewComplaint && (
          <div>
            {/* Header Section */}
            <div className="bg-gray-50 p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{viewComplaint.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Tag color={viewComplaint.type === "complaint" ? "red" : "blue"}>
                      {viewComplaint.type?.toUpperCase()}
                    </Tag>
                    <p className="text-gray-500">ID: #{viewComplaint._id?.slice(-6)}</p>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                    viewComplaint.status === "pending" ? "bg-amber-100 text-amber-800" :
                    viewComplaint.status === "investigating" ? "bg-blue-100 text-blue-800" :
                    viewComplaint.status === "resolved" ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {viewComplaint.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Details */}
            <div className="p-6">
              <h4 className="text-lg font-medium text-gray-800 mb-4">Complaint Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">CATEGORY</p>
                  <p className="text-gray-800">{viewComplaint.category}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">PRIORITY</p>
                  <Tag color={getPriorityColor(viewComplaint.priority)}>
                    {viewComplaint.priority?.toUpperCase()}
                  </Tag>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">PUROK</p>
                  <p className="text-gray-800">{viewComplaint.location}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">DATE SUBMITTED</p>
                  <p className="text-gray-800">{dayjs(viewComplaint.createdAt).format("MMMM DD, YYYY [at] h:mm A")}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500 mb-2">DESCRIPTION</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800">{viewComplaint.description}</p>
                </div>
              </div>

              {viewComplaint.response && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-500 mb-2">ADMIN RESPONSE</p>
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                    <p className="text-gray-800">{viewComplaint.response}</p>
                    {viewComplaint.resolvedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Responded on {dayjs(viewComplaint.resolvedAt).format("MMMM DD, YYYY [at] h:mm A")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              <div>
                <h4 className="text-lg font-medium text-gray-800 mb-4">Status Timeline</h4>
                
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-3.5 top-0 h-full w-0.5 bg-gray-200"></div>
                  
                  {/* Timeline Steps */}
                  <div className="space-y-6 relative">
                    {/* Submitted Step */}
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center z-10">
                        <CheckCircleOutlined className="text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-800">Submitted</p>
                        <p className="text-xs text-gray-500">{dayjs(viewComplaint.createdAt).format("MMMM DD, YYYY [at] h:mm A")}</p>
                      </div>
                    </div>
                    
                    {/* Processing Step */}
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center z-10 
                        ${viewComplaint.status === "pending" ? "bg-amber-500" : 
                          viewComplaint.status === "investigating" ? "bg-blue-500" : "bg-blue-500"}`}>
                        {viewComplaint.status === "pending" ? <ClockCircleOutlined className="text-white" /> :
                         viewComplaint.status === "investigating" ? <ExclamationCircleOutlined className="text-white" /> :
                         <CheckCircleOutlined className="text-white" />}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-800">
                          {viewComplaint.status === "pending" ? "Pending Review" :
                           viewComplaint.status === "investigating" ? "Under Investigation" :
                           "Processing Complete"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {viewComplaint.status === "pending" ? "Your complaint is awaiting review" :
                           viewComplaint.status === "investigating" ? "Your complaint is being investigated" :
                           "Your complaint has been processed"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Resolution Step */}
                    {(viewComplaint.status === "resolved" || viewComplaint.status === "closed") && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center z-10">
                          <CheckCircleOutlined className="text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-800">Resolved</p>
                          <p className="text-xs text-gray-500">
                            {viewComplaint.resolvedAt ? dayjs(viewComplaint.resolvedAt).format("MMMM DD, YYYY [at] h:mm A") : "Resolution date not available"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button onClick={() => setViewOpen(false)}>
                  Close
                </Button>
                {canEdit(viewComplaint) && (
                  <Button type="primary" icon={<EditOutlined />} onClick={() => {
                    setViewOpen(false);
                    openEdit(viewComplaint);
                  }}>
                    Edit Complaint
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
