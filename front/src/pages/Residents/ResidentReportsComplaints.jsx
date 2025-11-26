import React, { useEffect, useState } from "react";
import { Input, Button, Modal, Form, Select, Popconfirm, message, Tag, Tabs, Alert } from "antd";
import ResidentNavbar from "./ResidentNavbar";
import apiClient from "../../utils/apiClient";
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
  const [createStep, setCreateStep] = useState(0); // 0 = instructions, 1 = form

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
      const res = await apiClient.get('/api/resident/complaints');
      setComplaints(res.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        message.error(err.response?.data?.message || "Resident profile not found");
      } else if (status === 400) {
        message.error(err.response?.data?.message || "Bad request loading complaints");
      } else if (status === 401 || status === 403) {
        message.error("Session expired. Please log in again.");
      } else {
        message.error("Failed to load complaints");
      }
      console.error('Fetch complaints error:', err.response?.data || err.message);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const values = await createForm.validateFields();
      
      // If Other category is selected, use the custom category text
      const submitData = {
        ...values,
        category: values.category === 'Other' && values.customCategory 
          ? values.customCategory 
          : values.category
      };
      
      await apiClient.post(
        '/api/resident/complaints',
        submitData
      );
      
      message.success("Complaint submitted successfully!");
      setCreateOpen(false);
      createForm.resetFields();
      setShowOtherCategory(false);
      fetchComplaints();
    } catch (err) {
      const status = err.response?.status;
      if (status === 400 && err.response?.data?.missing) {
        message.error(`Missing: ${err.response.data.missing.join(', ')}`);
      } else if (status === 400 && err.response?.data?.errors) {
        message.error(err.response.data.errors[0] || 'Validation error');
      } else if (status === 404) {
        message.error(err.response?.data?.message || 'Resident profile not found');
      } else {
        message.error(err?.response?.data?.message || "Failed to create complaint");
      }
    }
    setCreating(false);
  };

  const handleEdit = async () => {
    try {
      setUpdating(true);
      const values = await editForm.validateFields();
      
      // If Other category is selected, use the custom category text
      const submitData = {
        ...values,
        category: values.category === 'Other' && values.customCategory 
          ? values.customCategory 
          : values.category
      };
      
      await apiClient.put(
        `/api/resident/complaints/${editComplaint._id}`,
        submitData
      );
      
      message.success("Complaint updated successfully!");
      setEditOpen(false);
      editForm.resetFields();
      setEditComplaint(null);
      setShowOtherCategoryEdit(false);
      fetchComplaints();
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        message.error(err.response?.data?.message || 'Complaint not found');
      } else if (status === 400) {
        message.error(err.response?.data?.message || 'Bad request updating complaint');
      } else {
        message.error(err?.response?.data?.message || "Failed to update complaint");
      }
    }
    setUpdating(false);
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(
        `/api/resident/complaints/${id}`
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
      
      <main className="mx-auto w-full max-w-9xl space-y-4 px-3 py-4 sm:px-4 lg:px-6">
        <Card className="w-full border border-slate-200 shadow-md bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-800">
                  Reports & Complaints
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-600">
                  Submit and track your reports and complaints to the barangay
                </CardDescription>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setCreateOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-2 w-full sm:w-auto"
              >
                Submit New
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Summary Statistics */}
        <Card className="w-full border border-slate-200 shadow-md bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">Summary</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">Overview of your complaints and their current status</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-200">
                      <CommentOutlined className="text-blue-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Total</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">{totalComplaints}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">All reports</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-200">
                      <ClockCircleOutlined className="text-amber-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Pending</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">{pendingComplaints}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">Under review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 border border-purple-200">
                      <ExclamationCircleOutlined className="text-purple-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Investigating</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">{investigatingComplaints}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">In progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                      <CheckCircleOutlined className="text-emerald-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Resolved</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">{resolvedComplaints}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Card */}
        <Card className="w-full border border-slate-200 shadow-md bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">My Complaints</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">View and manage your submitted complaints</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4 sm:space-y-6">
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
              className="complaints-tabs"
            />

            {/* Search Bar */}
            <div className="flex justify-between items-center">
              <Input
                placeholder="Search complaints..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64"
                allowClear
              />
            </div>

            {/* Complaints List */}
            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="flex justify-center items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500"></div>
                  <span className="text-slate-500 text-sm sm:text-base">Loading complaints...</span>
                </div>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="text-center py-10 sm:py-16 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex flex-col items-center">
                  <CommentOutlined style={{ fontSize: '40px' }} className="text-slate-400 mb-3" />
                  <p className="text-slate-500 font-medium text-base sm:text-lg">No complaints found</p>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">Submit your first complaint to get started</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredComplaints.map((complaint) => (
                  <Card key={complaint._id} className="border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
                    <CardContent className="p-3 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Icon and Main Info */}
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                            complaint.type === 'complaint' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                          }`}>
                            {complaint.type === 'complaint' ? 
                              <ExclamationCircleOutlined className="text-red-600 text-lg sm:text-xl" /> : 
                              <FileTextOutlined className="text-blue-600 text-lg sm:text-xl" />
                            }
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-slate-800 text-sm sm:text-base line-clamp-2">{complaint.title}</h3>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Tag size="small" color={complaint.type === "complaint" ? "red" : "blue"}>
                                    {complaint.type.toUpperCase()}
                                  </Tag>
                                  <span className="text-xs text-slate-500">#{complaint._id.slice(-6)}</span>
                                </div>
                              </div>
                              
                              {/* Status Badge */}
                              <div className="flex-shrink-0">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                                  complaint.status === "pending" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                  complaint.status === "investigating" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                  complaint.status === "resolved" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                  "bg-slate-100 text-slate-800 border border-slate-200"
                                }`}>
                                  {complaint.status?.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            {/* Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-3 bg-slate-50 rounded-lg p-2 sm:p-3 border border-slate-100">
                              <div>
                                <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-0.5">Category</p>
                                <p className="text-xs sm:text-sm text-slate-700 truncate">{complaint.category}</p>
                              </div>
                              <div>
                                <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-0.5">Purok</p>
                                <p className="text-xs sm:text-sm text-slate-700 truncate">{complaint.location}</p>
                              </div>
                              <div className="col-span-2 sm:col-span-1">
                                <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-0.5">Priority</p>
                                <Tag color={getPriorityColor(complaint.priority)} size="small">
                                  {complaint.priority?.toUpperCase()}
                                </Tag>
                              </div>
                            </div>

                            {/* Description Preview */}
                            {complaint.description && (
                              <div className="mt-3">
                                <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
                                  {complaint.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex sm:flex-col gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-4 justify-end sm:justify-start">
                          <Button
                            type="default"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => { setViewComplaint(complaint); setViewOpen(true); }}
                            className="border border-blue-600 text-blue-600 hover:bg-blue-50 flex-1 sm:flex-none sm:w-full"
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
                                className="border border-green-600 text-green-600 hover:bg-green-50 flex-1 sm:flex-none sm:w-full"
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
                                  className="border border-red-600 text-red-600 hover:bg-red-50 flex-1 sm:flex-none sm:w-full"
                                >
                                  Delete
                                </Button>
                              </Popconfirm>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create Modal */}
      <Modal
        title={<span className="text-base sm:text-lg font-semibold">Submit New Report/Complaint</span>}
        open={createOpen}
        onOk={createStep === 0 ? () => setCreateStep(1) : handleCreate}
        onCancel={() => {
          if (createStep === 1) {
            setCreateStep(0);
          } else {
            setCreateOpen(false);
            setCreateStep(0);
            createForm.resetFields();
            setShowOtherCategory(false);
          }
        }}
        confirmLoading={creating}
        width="95%"
        style={{ maxWidth: '750px', top: 20 }}
        okText={createStep === 0 ? "Next" : "Submit"}
        cancelText={createStep === 0 ? "Cancel" : "Previous"}
        className="mobile-modal"
      >
        {createStep === 0 ? (
          <Alert
            message={<span className="text-base font-semibold">Instructions for Submitting a Complaint or Report</span>}
            description={
              <div className="space-y-2 text-sm leading-relaxed">
                <p>• <strong>Type:</strong> Choose "Complaint" for issues requiring immediate attention or "Report" for informational submissions.</p>
                <p>• <strong>Category:</strong> Select the most appropriate category. Choose "Other" if your issue doesn't fit existing options.</p>
                <p>• <strong>Priority:</strong> Set urgency level - "Urgent" for emergencies, "High" for serious issues, "Medium" for moderate concerns, "Low" for minor issues.</p>
                <p>• <strong>Description:</strong> Provide clear, detailed information including dates, times, and any relevant circumstances.</p>
                <p>• <strong>Purok:</strong> Specify the location where the issue occurred or is occurring.</p>
                <p className="text-blue-600 font-semibold mt-3 pt-2 border-t border-blue-200">Note: You can only edit or delete complaints while they are in "Pending" status.</p>
              </div>
            }
            type="info"
            showIcon
            className="my-4"
          />
        ) : (
          <Form form={createForm} layout="vertical" className="mt-2 space-y-2">
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
            <TextArea rows={3} placeholder="Detailed description of the issue" />
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
        )}
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
        width={750}
      >
        <Alert
          message="Editing Your Complaint or Report"
          description={
            <div className="space-1 text-s leading-tight">
              <p>• Review and update any details that need correction or clarification.</p>
              <p>• Ensure all information is accurate before submitting changes.</p>
              <p>• You can change the priority level if the urgency has changed.</p>
              <p className="text-amber-600 font-medium mt-1">Important: Once your complaint status changes from "Pending", you will no longer be able to edit or delete it.</p>
            </div>
          }
          type="warning"
          showIcon
          className="mb-2"
        />
        <div style={{ marginBottom: '16px' }} />
        <Form form={editForm} layout="vertical" className="mt-2 space-y-2">
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: "Please select type" }]}
            style={{ marginBottom: 4 }}
          >
            <Select placeholder="Select type" options={typeOptions} />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: "Please select category" }]}
            style={{ marginBottom: 4 }}
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
              style={{ marginBottom: 4 }}
            >
              <Input placeholder="Enter custom category" />
            </Form.Item>
          )}

          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Please enter title" }]}
            style={{ marginBottom: 4 }}
          >
            <Input placeholder="Brief title of the issue" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: "Please enter description" }]}
            style={{ marginBottom: 4 }}
          >
            <TextArea rows={3} placeholder="Detailed description of the issue" />
          </Form.Item>

          <Form.Item
            name="location"
            label="Purok"
            rules={[{ required: true, message: "Please select purok" }]}
            style={{ marginBottom: 4 }}
          >
            <Select placeholder="Select purok" options={purokOptions} />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Priority"
            rules={[{ required: true, message: "Please select priority" }]}
            style={{ marginBottom: 4 }}
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
        width="95%"
        style={{ maxWidth: "950px", top: 20 }}
        bodyStyle={{ padding: 0 }}
        className="mobile-modal"
      >
        {viewComplaint && (
          <div>
            {/* Header Section */}
            <div className="bg-gray-50 p-3 sm:p-4 border-b">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 break-words">{viewComplaint.title}</h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Tag color={viewComplaint.type === "complaint" ? "red" : "blue"}>
                      {viewComplaint.type?.toUpperCase()}
                    </Tag>
                    <p className="text-xs sm:text-sm text-gray-500">ID: #{viewComplaint._id?.slice(-6)}</p>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="flex-shrink-0">
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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
            <div className="p-3 sm:p-4 md:p-5">
              <h4 className="text-sm sm:text-base font-medium text-gray-800 mb-3">Complaint Details</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">CATEGORY</p>
                  <p className="text-sm sm:text-base text-gray-800 break-words">{viewComplaint.category}</p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">PRIORITY</p>
                  <Tag color={getPriorityColor(viewComplaint.priority)} size="small">
                    {viewComplaint.priority?.toUpperCase()}
                  </Tag>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">PUROK</p>
                  <p className="text-sm text-gray-800">{viewComplaint.location}</p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">DATE SUBMITTED</p>
                  <p className="text-xs sm:text-sm text-gray-800 break-words">{dayjs(viewComplaint.createdAt).format("MMMM DD, YYYY [at] h:mm A")}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1.5">DESCRIPTION</p>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-800 leading-relaxed break-words">{viewComplaint.description}</p>
                </div>
              </div>

              {viewComplaint.response && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-1.5">ADMIN RESPONSE</p>
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-400">
                    <p className="text-xs sm:text-sm text-gray-800 leading-relaxed break-words">{viewComplaint.response}</p>
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
                <h4 className="text-sm sm:text-base font-medium text-gray-800 mb-3">Status Timeline</h4>
                
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-3 sm:left-4 top-0 h-full w-0.5 bg-gray-200"></div>
                  
                  {/* Timeline Steps */}
                  <div className="space-y-4 relative">
                    {/* Submitted Step */}
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-500 flex items-center justify-center z-10">
                        <CheckCircleOutlined className="text-white text-xs sm:text-sm" />
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <p className="text-xs sm:text-sm font-medium text-gray-800">Submitted</p>
                        <p className="text-xs text-gray-500 break-words">{dayjs(viewComplaint.createdAt).format("MMMM DD, YYYY [at] h:mm A")}</p>
                      </div>
                    </div>
                    
                    {/* Processing Step */}
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center z-10 
                        ${viewComplaint.status === "pending" ? "bg-amber-500" : 
                          viewComplaint.status === "investigating" ? "bg-blue-500" : "bg-blue-500"}`}>
                        {viewComplaint.status === "pending" ? <ClockCircleOutlined className="text-white text-xs sm:text-sm" /> :
                         viewComplaint.status === "investigating" ? <ExclamationCircleOutlined className="text-white text-xs sm:text-sm" /> :
                         <CheckCircleOutlined className="text-white text-xs sm:text-sm" />}
                      </div>
                      <div className="ml-3 sm:ml-4">
                        <p className="text-xs sm:text-sm font-medium text-gray-800">
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
                        <div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-green-500 flex items-center justify-center z-10">
                          <CheckCircleOutlined className="text-white text-xs sm:text-sm" />
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <p className="text-xs sm:text-sm font-medium text-gray-800">Resolved</p>
                          <p className="text-xs text-gray-500 break-words">
                            {viewComplaint.resolvedAt ? dayjs(viewComplaint.resolvedAt).format("MMMM DD, YYYY [at] h:mm A") : "Resolution date not available"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-3 border-t">
                <Button onClick={() => setViewOpen(false)} className="w-full sm:w-auto">
                  Close
                </Button>
                {canEdit(viewComplaint) && (
                  <Button type="primary" icon={<EditOutlined />} onClick={() => {
                    setViewOpen(false);
                    openEdit(viewComplaint);
                  }} className="w-full sm:w-auto">
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
