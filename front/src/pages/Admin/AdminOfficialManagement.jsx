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
  Alert,
} from "antd";
import { AdminLayout } from "./AdminSidebar";
import { UserOutlined } from "@ant-design/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

const API_URL = "/api/admin/officials";

// Position limits configuration
const POSITION_LIMITS = {
  // Single positions (limit 1)
  "Barangay Captain": 1,
  "Barangay IPMR": 1,
  "Barangay Secretary": 1,
  "Barangay Treasurer": 1,
  "SK Chairman": 1,
  "Admin Assistant": 1,
  "Barangay Nutrition Scholar": 1,
  "Day Care Worker": 1,
  "Chief Tanod": 1,
  "SWM Driver": 1,
  
  // Multiple positions
  "Barangay Kagawad": 7,
  "Barangay Health Worker": 5,
  "Barangay Utility Worker": 2,
  "Barangay Tanod": 9,
  "Garbage Collector": 3,
};

export default function AdminOfficialManagement() {
  const [officials, setOfficials] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [selectedOfficial, setSelectedOfficial] = useState(null);
  const [selectedResident, setSelectedResident] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => { 
    fetchOfficials(); 
    fetchResidents();
  }, []);
  
  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  
  const fetchOfficials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_URL, { headers: { Authorization: `Bearer ${token}` } });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch officials: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("Officials response:", data);
      
      // Handle both array and object responses
      const officials = Array.isArray(data) ? data : (data?.data || []);
      setOfficials(officials);
    } catch (err) { 
      console.error("Fetch officials error:", err);
      message.error(err.message || "Failed to fetch officials");
      setOfficials([]); // Set empty array on error
    }
    setLoading(false);
  };

  const fetchResidents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/residents", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch residents: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("Residents response (officials page):", data);
      
      // Handle both array and object responses
      const residents = Array.isArray(data) ? data : (data?.data || []);
      setResidents(residents);
    } catch (err) {
      console.error("Fetch residents error (officials page):", err);
      message.error(err.message || "Failed to fetch residents");
      setResidents([]); // Set empty array on error
    }
  };

  const totalOfficials = officials.length;
  const activeOfficials = officials.filter(o => o.isActive).length;
  const inactiveOfficials = totalOfficials - activeOfficials;

  // Helper to format official display name with middle initial (if resident data available)
  const formatOfficialDisplayName = (official) => {
    if (!official) return '';
    // Try direct residentId match first
    let resident = null;
    if (official.residentId) {
      resident = residents.find(r => r._id === official.residentId);
    }
    // Fallback: match by normalized full name
    if (!resident && official.fullName) {
      const target = official.fullName.toLowerCase().replace(/\s+/g, ' ').trim();
      resident = residents.find(r => {
        const composed = `${r.firstName || ''} ${r.middleName || ''} ${r.lastName || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
        return composed === target;
      }) || null;
    }
    if (resident) {
      const first = resident.firstName || '';
      const middle = resident.middleName ? (resident.middleName.trim()[0].toUpperCase() + '.') : '';
      const last = resident.lastName || '';
      const suffix = resident.suffix ? resident.suffix.trim() : '';
      return [first, middle, last, suffix].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    }
    // If we can't map to resident, return stored fullName as-is
    return official.fullName || '';
  };

  // Position validation function
  const validatePositionLimit = (position, excludeOfficialId = null) => {
    const maxAllowed = POSITION_LIMITS[position];
    if (!maxAllowed) {
      return { isValid: false, message: "Invalid position selected" };
    }

    // Count current officials in this position (excluding the one being edited if applicable)
    const currentCount = officials.filter(official => 
      official.position === position && 
      official.isActive && 
      official._id !== excludeOfficialId
    ).length;

    const isValid = currentCount < maxAllowed;
    const remaining = maxAllowed - currentCount;

    return {
      isValid,
      currentCount,
      maxAllowed,
      remaining,
      message: isValid 
        ? `${remaining} slot(s) remaining for ${position}`
        : `Position limit reached. Maximum ${maxAllowed} ${position}${maxAllowed > 1 ? 's' : ''} allowed (currently ${currentCount})`
    };
  };

  // Filter residents that are not already officials
  const getAvailableResidents = () => {
    // Method 1: Get all official names for comparison (normalize for matching)
    const officialNames = officials.map(official => (
      official.fullName?.toLowerCase().replace(/\s+/g, ' ').trim() || ''
    )).filter(name => name.length > 0);
    
    // Method 2: Get residents who have user accounts linked to current officials
    const currentOfficialUserIds = officials.map(official => official._id);
    const residentsWithOfficialAccounts = residents.filter(resident => {
      if (!resident.user) return false;
      const userId = typeof resident.user === 'string' ? resident.user : resident.user._id;
      return currentOfficialUserIds.includes(userId);
    });
    
    // Method 3: Check if any official has a residentId that matches
    const officialResidentIds = officials
      .map(official => official.residentId)
      .filter(Boolean);
    
    // Filter out residents using all methods
    const availableResidents = residents.filter(resident => {
      const residentFullName = resident.fullName || 
        `${resident.firstName || ''} ${resident.middleName || ''} ${resident.lastName || ''}`.replace(/\s+/g, ' ').trim();
      const residentName = residentFullName.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Method 1: Exclude if name matches an official
      const isAlreadyOfficialByName = officialNames.includes(residentName);
      
      // Method 2: Exclude if resident has a user account that's an official
      let isAlreadyOfficialByAccount = false;
      if (resident.user) {
        const userId = typeof resident.user === 'string' ? resident.user : resident.user._id;
        isAlreadyOfficialByAccount = currentOfficialUserIds.includes(userId);
      }
      
      // Method 3: Exclude if resident ID is linked to an official
      const isAlreadyOfficialByResidentId = officialResidentIds.includes(resident._id);
      
      const shouldExclude = isAlreadyOfficialByName || isAlreadyOfficialByAccount || isAlreadyOfficialByResidentId;
      return !shouldExclude;
    });
    
    return availableResidents;
  };

  // Columns
  const columns = [
    { 
      title: "Full Name", 
      dataIndex: "fullName", 
      key: "fullName", 
      width: 200, 
      ellipsis: true,
      render: (_, record) => formatOfficialDisplayName(record),
      responsive: ['xs','sm','md','lg']
    },
    {
      title: "Position",
      dataIndex: "position",
      key: "position",
      width: 160,
      ellipsis: true,
      render: v => v || '-',
      responsive: ['sm','md','lg']
    },
    {
      title: "Email",
      dataIndex: ["contact","email"],
      key: "email",
      width: 200,
      ellipsis: true,
      render: (_, r) => r.contact?.email || r.email || '-',
      responsive: ['md','lg']
    },
    {
      title: "Mobile",
      dataIndex: ["contact","mobile"],
      key: "mobile",
      width: 140,
      ellipsis: true,
      render: (_, r) => r.contact?.mobile || r.mobile || '-',
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
            description="This action cannot be undone."
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(o._id)}
          >
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
      ),
      responsive: ['xs','sm','md','lg']
    }
  ];

  const filteredOfficials = (Array.isArray(officials) ? officials : []).filter(o =>
    [o.fullName, o.position, o.contact?.email || o.email, o.contact?.mobile || o.mobile]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const handleAddOfficial = async () => {
    try {
      setCreating(true);
      const values = await addForm.validateFields();
      if (!values.residentId) {
        throw new Error("No resident selected");
      }
      if (!values.position) {
        throw new Error("No position selected");
      }
      
      const token = localStorage.getItem("token");
      
      // Build payload without blank optional fields
      const submitData = {
        residentId: values.residentId,
        position: values.position,
      };
      const email = (values.email || '').trim();
      const mobile = (values.mobile || '').trim();
      if (email) submitData.email = email;
      if (mobile) submitData.mobile = mobile;
      
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(submitData)
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.message || `Server error: ${res.status} ${res.statusText}`);
      }
      
      message.success("Official added!");
      setAddOpen(false); 
      addForm.resetFields(); 
      setSelectedResident(null);
      
      // Refresh data and wait for it to complete
      await fetchOfficials();
      await fetchResidents();
    } catch (err) { 
      message.error(err?.message || "Failed to add official"); 
    }
    setCreating(false);
  };

  const openEdit = (official) => { setSelectedOfficial(official); setEditOpen(true); };

  useEffect(() => {
    if (editOpen && selectedOfficial) {
      editForm.setFieldsValue({
        fullName: selectedOfficial.fullName || "",
        position: selectedOfficial.position || "",
        email: selectedOfficial.contact?.email || selectedOfficial.email || "",
        mobile: selectedOfficial.contact?.mobile || selectedOfficial.mobile || "",
        isActive: typeof selectedOfficial.isActive === "boolean" ? selectedOfficial.isActive : true,
      });
    }
  }, [editOpen, selectedOfficial, editForm]);

  const handleEditOfficial = async () => {
    try {
      setEditing(true);
      const values = await editForm.validateFields();
      const token = localStorage.getItem("token");
      // Only send fields that are provided; allow clearing by sending empty string which backend unsets
      const payload = {};
      if (values.fullName !== undefined) payload.fullName = values.fullName;
      if (values.position !== undefined) payload.position = values.position;
      if (values.isActive !== undefined) payload.isActive = values.isActive;
      if (values.email !== undefined) payload.email = (values.email || '').trim();
      if (values.mobile !== undefined) payload.mobile = (values.mobile || '').trim();

      const res = await fetch(`${API_URL}/${selectedOfficial._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to update official");
      message.success("Official updated!");
      setEditOpen(false); fetchOfficials();
    } catch (err) { message.error(err?.message || "Failed to update official"); }
    setEditing(false);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Failed to delete official");
      message.success("Official deleted!"); 
      
      // adjust page if last item removed
      if (filteredOfficials.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
      else {
        // Refresh data and wait for completion
        await fetchOfficials();
        await fetchResidents();
      }
    } catch (err) { message.error(err?.message || "Failed to delete official"); }
  };
  
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
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Officials
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {totalOfficials}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {totalOfficials}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Active Officials
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {activeOfficials}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {activeOfficials}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Inactive Officials
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {inactiveOfficials}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {inactiveOfficials}
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
              placeholder="Search for Officials"
              onSearch={(v) => setSearch(v.trim())}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              enterButton
              className="w-full sm:min-w-[350px] md:min-w-[500px] max-w-full"
            />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button 
                type="primary" 
                onClick={() => setAddOpen(true)}
                disabled={getAvailableResidents().length === 0}
                title={getAvailableResidents().length === 0 ? "All residents are already officials" : "Add new official"}
              >
                Add Official
              </Button>
              {getAvailableResidents().length === 0 && (
                <span className="text-xs text-gray-500">
                  All residents are already officials
                </span>
              )}
            </div>
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
                pagination={{
                  current: currentPage,
                  pageSize: pageSize,
                  total: filteredOfficials.length,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} officials`,
                  pageSizeOptions: ['10', '20', '50', '100'],
                }}
                onChange={handleTableChange}
                scroll={{ x: 800 }}
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
            setSelectedResident(null);
            setAddOpen(false);
          }}
          width={500}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                addForm.resetFields();
                setSelectedResident(null);
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
          <Alert
            message="Add New Official"
            description="Select a resident from the list and assign them a barangay position. Only residents who are not yet officials will appear in the dropdown. Ensure all contact information is complete."
            type="info"
            showIcon
            className="mb-4"
          />
          <div style={{ marginBottom: 16 }} />
          <Form form={addForm} layout="vertical" autoComplete="off">
            <Form.Item
              name="residentId"
              label="Select Resident"
              rules={[{ required: true, message: "Please select a resident" }]}
            >
              <Select
                placeholder="Select a resident"
                showSearch
                optionFilterProp="children"
                notFoundContent={getAvailableResidents().length === 0 ? "All residents are already officials" : "No residents found"}
                disabled={getAvailableResidents().length === 0}
                dropdownRender={(menu) => (
                  <div>
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                      <span className="text-sm text-gray-600">Available Residents</span>
                      <span className="text-xs text-gray-500 font-medium">
                        {getAvailableResidents().length} available
                      </span>
                    </div>
                    {menu}
                  </div>
                )}
                onDropdownVisibleChange={(open) => {
                  if (open) {
                    getAvailableResidents();
                  }
                }}
                onChange={(value) => {
                  const resident = residents.find(r => r._id === value);
                  if (resident) {
                    setSelectedResident(resident);
                    const email = resident.contact?.email || '';
                    const mobile = resident.contact?.mobile || '';
                    
                    addForm.setFieldsValue({
                      email: email,
                      mobile: mobile
                    });

                    // Alert if resident doesn't have contact info
                    if (!email && !mobile) {
                      message.warning("This resident has no email or mobile number on file. You can add them as an official and update contact information later.");
                    } else if (!email) {
                      message.info("This resident has no email on file. You can update it after adding as an official.");
                    } else if (!mobile) {
                      message.info("This resident has no mobile number on file. You can update it after adding as an official.");
                    }
                  }
                }}
              >
                {getAvailableResidents().map(resident => {
                  const fullName = resident.fullName || 
                    `${resident.firstName || ''} ${resident.middleName || ''} ${resident.lastName || ''}`.replace(/\s+/g, ' ').trim();
                  return (
                    <Select.Option key={resident._id} value={resident._id}>
                      {fullName}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
            <Form.Item
              name="position"
              label="Position"
              rules={[
                { required: true, message: "Please select a position" },
                {
                  validator: async (_, value) => {
                    if (value) {
                      const validation = validatePositionLimit(value);
                      if (!validation.isValid) {
                        throw new Error(validation.message);
                      }
                    }
                  }
                }
              ]}
            >
              <Select 
                placeholder="Select a position"
                onChange={(value) => {
                  const validation = validatePositionLimit(value);
                  if (!validation.isValid) {
                    message.warning(validation.message);
                  } else if (validation.remaining <= 2) {
                    message.info(validation.message);
                  }
                }}
              >
                {Object.keys(POSITION_LIMITS).map(position => {
                  const validation = validatePositionLimit(position);
                  return (
                    <Select.Option 
                      key={position}
                      value={position} 
                      disabled={!validation.isValid}
                      title={!validation.isValid ? validation.message : `${validation.remaining} slot(s) available`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{position}</span>
                        <span className={`text-xs ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          ({validation.currentCount}/{validation.maxAllowed})
                        </span>
                      </div>
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { 
                  type: "email", 
                  message: "Enter a valid email",
                  required: false
                },
              ]}
            >
              <Input placeholder="e.g., 09123456789" />
            </Form.Item>
            <Form.Item
              name="mobile"
              label="Mobile"
              rules={[]}
            >
              <Input placeholder="e.g., juan.delacruz@email.com" />
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
            <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: "Full Name is required" }]}> 
              <Input disabled />
            </Form.Item>
            <Form.Item 
              name="position" 
              label="Position" 
              rules={[
                { required: true, message: "Position is required" },
                {
                  validator: async (_, value) => {
                    if (value) {
                      const validation = validatePositionLimit(value, selectedOfficial?._id);
                      if (!validation.isValid) {
                        throw new Error(validation.message);
                      }
                    }
                  }
                }
              ]}
            >
              <Select 
                placeholder="Select a position"
                onChange={(value) => {
                  const validation = validatePositionLimit(value, selectedOfficial?._id);
                  if (!validation.isValid) {
                    message.warning(validation.message);
                  } else if (validation.remaining <= 2) {
                    message.info(validation.message);
                  }
                }}
              >
                {Object.keys(POSITION_LIMITS).map(position => {
                  const validation = validatePositionLimit(position, selectedOfficial?._id);
                  return (
                    <Select.Option 
                      key={position}
                      value={position} 
                      disabled={!validation.isValid}
                      title={!validation.isValid ? validation.message : `${validation.remaining} slot(s) available`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{position}</span>
                        <span className={`text-xs ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          ({validation.currentCount}/{validation.maxAllowed})
                        </span>
                      </div>
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Enter a valid email" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="mobile" label="Mobile">
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
