import React, { useState, useEffect, useMemo } from "react";
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
import { UserOutlined, ReloadOutlined } from "@ant-design/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

// Use environment variable for backend API base (configure VITE_API_BASE_URL in .env and Vercel dashboard)
const API_BASE = import.meta.env.VITE_API_BASE_URL || ""; // e.g. https://your-backend.example.com
const OFFICIALS_ENDPOINT = `${API_BASE}/api/admin/officials`;
const RESIDENTS_ENDPOINT = `${API_BASE}/api/admin/residents`;

// Safe JSON parser to surface HTML/other unexpected content clearly
async function safeParseJson(res) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Expected JSON but received '${contentType || "unknown"}'.\nStatus: ${res.status} ${res.statusText}.\nBody preview: ${text.slice(0,200)}`
    );
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}. Preview: ${text.slice(0,200)}`);
  }
}

// Position hierarchy for sorting (lower number = higher rank)
const POSITION_HIERARCHY = {
  "Barangay Captain": 1,
  "Barangay Secretary": 2,
  "Barangay Treasurer": 3,
  "SK Chairman": 4,
  "Barangay Kagawad": 5,
  "Barangay IPMR": 6,
  "Admin Assistant": 7,
  "Barangay Nutrition Scholar": 8,
  "Day Care Worker": 9,
  "Chief Tanod": 10,
  "Barangay Health Worker": 11,
  "Barangay Tanod": 12,
  "Barangay Utility Worker": 13,
  "SWM Driver": 14,
  "Garbage Collector": 15,
};

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
  
  // Refresh data when page becomes visible (user switches back to tab/page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchResidents();
        fetchOfficials();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  
  const fetchOfficials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(OFFICIALS_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.message || `Failed to fetch officials: ${res.status} ${res.statusText}`);
      console.log("Officials response:", data);
      
      // Handle both array and object responses
      let officials = Array.isArray(data) ? data : (data?.data || []);
      
      // Sort officials by position hierarchy
      officials = officials.sort((a, b) => {
        const rankA = POSITION_HIERARCHY[a.position] || 999;
        const rankB = POSITION_HIERARCHY[b.position] || 999;
        
        // If same position, sort by name
        if (rankA === rankB) {
          const nameA = a.fullName || '';
          const nameB = b.fullName || '';
          return nameA.localeCompare(nameB);
        }
        
        return rankA - rankB;
      });
      
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
      const res = await fetch(RESIDENTS_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.message || `Failed to fetch residents: ${res.status} ${res.statusText}`);
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

  // Columns (memoized to re-render when residents data changes)
  const columns = useMemo(() => [
    { 
      title: "Full Name", 
      dataIndex: "fullName", 
      key: "fullName", 
      width: 220, 
      ellipsis: true,
      render: (_, record) => formatOfficialDisplayName(record),
      responsive: ['xs','sm','md','lg']
    },
    {
      title: "Position",
      dataIndex: "position",
      key: "position",
      width: 200,
      ellipsis: true,
      render: (v, record) => {
        const hierarchy = POSITION_HIERARCHY[v] || 999;
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
              #{hierarchy}
            </span>
            <span>{v || '-'}</span>
          </div>
        );
      },
      responsive: ['sm','md','lg'],
      sorter: (a, b) => {
        const rankA = POSITION_HIERARCHY[a.position] || 999;
        const rankB = POSITION_HIERARCHY[b.position] || 999;
        return rankA - rankB;
      },
      defaultSortOrder: 'ascend',
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
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(o._id)}
          >
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
      ),
      responsive: ['xs','sm','md','lg']
    }
  ], [residents]); // Re-create columns when residents data changes

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
      
      // Build payload - always include email and mobile (even as empty string) so backend knows to update/clear them
      const submitData = {
        residentId: values.residentId,
        position: values.position,
        email: (values.email || '').trim(),
        mobile: (values.mobile || '').trim()
      };
      
      const res = await fetch(OFFICIALS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(submitData)
      });
      const responseData = await safeParseJson(res);
      if (!res.ok) throw new Error(responseData.message || `Server error: ${res.status} ${res.statusText}`);
      
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

      const res = await fetch(`${OFFICIALS_ENDPOINT}/${selectedOfficial._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const responseData = await safeParseJson(res);
      if (!res.ok) throw new Error(responseData.message || "Failed to update official");
      message.success("Official updated!");
      setEditOpen(false); 
      await fetchOfficials();
      await fetchResidents();
    } catch (err) { message.error(err?.message || "Failed to update official"); }
    setEditing(false);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${OFFICIALS_ENDPOINT}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      let responseData = {};
      try { responseData = await safeParseJson(res); } catch (_) { /* ignore parse error for DELETE */ }
      if (!res.ok) throw new Error(responseData.message || "Failed to delete official");
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
                <div className="flex flex-wrap gap-2 items-center">
                <Button 
                  type="primary" 
                  onClick={() => setAddOpen(true)}
                  disabled={getAvailableResidents().length === 0}
                  title={getAvailableResidents().length === 0 ? "All residents are already officials" : "Add new official"}
                >
                  + Add Official
                </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={async () => {
                  setLoading(true);
                  await fetchResidents();
                  await fetchOfficials();
                  message.success('Data refreshed');
                  setLoading(false);
                }}
                title="Refresh data"
              >
                Refresh
              </Button>
                {getAvailableResidents().length === 0 && (
                  <span className="text-xs text-gray-500">
                    All residents are already officials
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {isMobile ? (
              <List
                dataSource={filteredOfficials}
                loading={loading}
                locale={{ emptyText: 'No officials found' }}
                renderItem={item => {
                  const hierarchy = POSITION_HIERARCHY[item.position] || 999;
                  return (
                    <List.Item className="border rounded-lg px-3 py-2 mb-2 shadow-sm">
                      <div className="w-full flex flex-col gap-1 text-sm">
                        <div className="flex justify-between">
                          <span className="font-semibold">{formatOfficialDisplayName(item)}</span>
                          <Tag color={item.isActive ? 'green':'red'}>{item.isActive ? 'Active':'Inactive'}</Tag>
                        </div>
                        <div className="text-gray-600 flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            #{hierarchy}
                          </span>
                          <span>{item.position || '—'}</span>
                        </div>
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
                  );
                }}
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
              <Input placeholder="e.g., juan.delacruz@email.com" />
            </Form.Item>
            <Form.Item
              name="mobile"
              label="Mobile"
              rules={[]}
            >
              <Input placeholder="e.g., 09123456789" />
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
          <Alert
            message="Edit Official Information"
            description="Update the official's position, contact details, and active status. Note: The full name is linked to the resident record and cannot be modified here."
            type="info"
            showIcon
            className="mb-4"
          />
          <div style={{ marginBottom: 16 }} />
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
