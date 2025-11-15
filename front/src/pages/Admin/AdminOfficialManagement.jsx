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

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => { 
    fetchOfficials(); 
    fetchResidents();
  }, []);
  
  const fetchOfficials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_URL, { headers: { Authorization: `Bearer ${token}` } });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch officials: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("Fetched officials:", data);
      setOfficials(data || []);
    } catch (err) { 
      console.error("Error fetching officials:", err);
      message.error(err.message || "Failed to fetch officials"); 
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
      console.log("Fetched residents:", data);
      setResidents(data || []);
    } catch (err) { 
      console.error("Error fetching residents:", err);
      message.error(err.message || "Failed to fetch residents"); 
    }
  };

  const totalOfficials = officials.length;
  const activeOfficials = officials.filter(o => o.isActive).length;
  const inactiveOfficials = totalOfficials - activeOfficials;

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
    console.log("=== FILTERING DEBUG START ===");
    console.log("Total officials:", officials.length);
    console.log("Total residents:", residents.length);
    
    // Method 1: Get all official names for comparison (normalize for matching)
    const officialNames = officials.map(official => {
      const name = official.fullName?.toLowerCase().replace(/\s+/g, ' ').trim() || '';
      console.log(`Official: "${official.fullName}" -> normalized: "${name}"`);
      return name;
    }).filter(name => name.length > 0);
    
    // Method 2: Get residents who have user accounts linked to current officials
    const currentOfficialUserIds = officials.map(official => official._id);
    const residentsWithOfficialAccounts = residents.filter(resident => {
      if (!resident.user) return false;
      
      // Handle both cases: user field as ID string or populated object
      const userId = typeof resident.user === 'string' ? resident.user : resident.user._id;
      const isLinkedToOfficial = currentOfficialUserIds.includes(userId);
      
      if (isLinkedToOfficial) {
        console.log(`Resident "${resident.fullName || `${resident.firstName} ${resident.lastName}`}" has user account linked to official (${userId})`);
      }
      
      return isLinkedToOfficial;
    });
    
    // Method 3: Check if any official has a residentId that matches
    const officialResidentIds = officials
      .map(official => official.residentId)
      .filter(Boolean);
    
    console.log("Current official names:", officialNames);
    console.log("Current official user IDs:", currentOfficialUserIds);
    console.log("Residents with official accounts:", residentsWithOfficialAccounts.map(r => r.fullName || `${r.firstName} ${r.lastName}`));
    console.log("Official resident IDs:", officialResidentIds);
    
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
      
      if (shouldExclude) {
        console.log(`❌ Excluding: "${residentFullName}" | Name match: ${isAlreadyOfficialByName} | Account match: ${isAlreadyOfficialByAccount} | ResidentId match: ${isAlreadyOfficialByResidentId}`);
      } else {
        console.log(`✅ Including: "${residentFullName}"`);
      }
      
      return !shouldExclude;
    });
    
    console.log(`RESULT: Available residents: ${availableResidents.length}/${residents.length}`);
    console.log("=== FILTERING DEBUG END ===");
    
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

  const filteredOfficials = officials.filter(o =>
    [o.fullName, o.position, o.contact?.email || o.email, o.contact?.mobile || o.mobile]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const handleAddOfficial = async () => {
    try {
      setCreating(true);
      const values = await addForm.validateFields();
      console.log("Form values:", values);
      console.log("Selected resident:", selectedResident);
      
      // Additional validation logging
      if (!values.residentId) {
        throw new Error("No resident selected");
      }
      if (!values.position) {
        throw new Error("No position selected");
      }
      
      // Log contact information status
      console.log("Email value:", values.email || "(empty)");
      console.log("Mobile value:", values.mobile || "(empty)");
      console.log("Will submit with empty contact info:", !values.email && !values.mobile);
      
      const token = localStorage.getItem("token");
      
      // Ensure empty strings for missing contact info
      const submitData = {
        ...values,
        email: values.email?.trim() || '',
        mobile: values.mobile?.trim() || ''
      };
      
      console.log("Data being submitted:", submitData);
      
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(submitData)
      });
      
      const responseData = await res.json();
      console.log("Server response:", responseData);
      
      if (!res.ok) {
        console.error("Server error details:", {
          status: res.status,
          statusText: res.statusText,
          response: responseData
        });
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
      console.error("Error adding official:", err);
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
      const res = await fetch(`${API_URL}/${selectedOfficial._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
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
      
      // Refresh data and wait for completion
      await fetchOfficials();
      await fetchResidents();
    } catch (err) { message.error(err?.message || "Failed to delete official"); }
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
                    console.log("=== DROPDOWN DEBUG ===");
                    console.log("Officials in table:");
                    officials.forEach((official, i) => {
                      console.log(`  ${i+1}. ${official.fullName} (ID: ${official._id})`);
                    });
                    
                    console.log("\nAll residents:");
                    residents.forEach((resident, i) => {
                      const residentName = resident.fullName || `${resident.firstName} ${resident.middleName || ''} ${resident.lastName}`.replace(/\s+/g, ' ').trim();
                      console.log(`  ${i+1}. ${residentName} (ID: ${resident._id})`);
                    });
                    
                    const available = getAvailableResidents();
                    console.log("\nFiltering complete!");
                  }
                }}
                onChange={(value) => {
                  const resident = residents.find(r => r._id === value);
                  console.log("Selected resident:", resident);
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
                { required: true, message: "Position is required" },
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
              <Input placeholder="Optional" />
            </Form.Item>
            <Form.Item
              name="mobile"
              label="Mobile"
              rules={[]}
            >
              <Input placeholder="Optional" />
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
