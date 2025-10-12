import React, { useEffect, useState, useMemo } from "react";
import { Table, Input, Button, Modal, Form, Select, message, Popconfirm, Descriptions, Checkbox } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { UserOutlined } from "@ant-design/icons";
import axios from "axios";

const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";

export default function HouseholdManagement() {
  const [loading, setLoading] = useState(false);
  const [households, setHouseholds] = useState([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewHousehold, setViewHousehold] = useState(null);
  const [residents, setResidents] = useState([]);

  // NEW: Only me toggles
  const [addOnlyMe, setAddOnlyMe] = useState(false);
  const [editOnlyMe, setEditOnlyMe] = useState(false);

  // Get user info from localStorage
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    fetchResidents();
    fetchHouseholds();
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchResidents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/residents`, { headers: authHeaders() });
      setResidents(res.data || []);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load residents");
    }
  };

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/admin/households`, { headers: authHeaders() });
      setHouseholds(res.data || []);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load households");
    } finally {
      setLoading(false);
    }
  };

  // Add Household
  const handleAddHousehold = async () => {
    try {
      setCreating(true);

      // Ensure members follow "Only me" logic at submit time
      if (addOnlyMe) {
        const head = addForm.getFieldValue("headOfHousehold");
        addForm.setFieldsValue({ members: head ? [head] : [] });
      }

      const values = await addForm.validateFields();
      const payload = {
        headOfHousehold: values.headOfHousehold,
        members: values.members,
        address: {
          street: values.address?.street,
          purok: values.address?.purok,
        },
      };
      await axios.post(`${API_BASE}/api/admin/households`, payload, { headers: authHeaders() });
      message.success("Household added!");
      setAddOpen(false);
      addForm.resetFields();
      setAddOnlyMe(false); // reset toggle
      fetchHouseholds();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to add household");
    } finally {
      setCreating(false);
    }
  };

  // Edit Household
  const openEdit = (household) => {
    setSelectedHousehold(household);
    const { barangay, municipality, province, zipCode, ...addressRest } = household.address || {};
    editForm.setFieldsValue({
      householdId: household.householdId,
      headOfHousehold: household.headOfHousehold?._id || household.headOfHousehold,
      members: household.members?.map(m => (m._id || m)),
      address: addressRest,
    });

    // NEW: Initialize "Only me" in Edit if members is exactly [head]
    const headId = household.headOfHousehold?._id || household.headOfHousehold;
    const memberIds = (household.members || []).map(m => m._id || m).map(String);
    const isOnlyMe = headId && memberIds.length === 1 && String(memberIds[0]) === String(headId);
    setEditOnlyMe(!!isOnlyMe);

    setEditOpen(true);
  };

  const handleEditHousehold = async () => {
    try {
      setEditing(true);

      // Ensure members follow "Only me" logic at submit time
      if (editOnlyMe) {
        const head = editForm.getFieldValue("headOfHousehold");
        editForm.setFieldsValue({ members: head ? [head] : [] });
      }

      const values = await editForm.validateFields();
      const payload = {
        headOfHousehold: values.headOfHousehold,
        members: values.members,
        address: {
          street: values.address?.street,
          purok: values.address?.purok,
        },
      };
      await axios.patch(`${API_BASE}/api/admin/households/${selectedHousehold._id}`, payload, { headers: authHeaders() });
      message.success("Household updated!");
      setEditOpen(false);
      fetchHouseholds();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update household");
    } finally {
      setEditing(false);
    }
  };

  // Delete Household
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/api/admin/households/${id}`, { headers: authHeaders() });
      message.success("Household deleted!");
      fetchHouseholds();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete household");
    }
  };

  // View Household Details
  const openView = (household) => {
    // For hardcoded data, we need to fetch the actual resident objects 
    // using the member IDs
    const householdWithMembers = {
      ...household,
      // Convert references to actual resident objects for display
      memberDetails: household.members.map(memberId => 
        residents.find(r => r._id === memberId) || { firstName: "Unknown", lastName: "Resident" }
      )
    };
    
    setViewHousehold(householdWithMembers);
    setViewOpen(true);
  };

  // Statistics
  const totalHouseholds = households.length;
  const totalMembers = households.reduce((acc, h) => acc + (h.members?.length || 0), 0);
  const avgHouseholdSize = totalHouseholds > 0 ? (totalMembers / totalHouseholds).toFixed(1) : 0;
  const singleMemberHouseholds = households.filter(h => h.members?.length === 1).length;
  const familyHouseholds = households.filter(h => h.members?.length > 1).length;

  const fullName = (p) => [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(" ");

  // Function to render household members
  const renderHouseholdMembers = (record) => {
    // Get members excluding head
    const headId = record.headOfHousehold?._id || record.headOfHousehold;
    const membersList = (record.members || []).filter(m => {
      const memberId = m?._id || m;
      return String(memberId) !== String(headId);
    });
    
    if (membersList.length === 0) {
      return (
        <div className="p-2 italic text-gray-500">No additional members in this household</div>
      );
    }

    return (
      <div className="p-2 bg-gray-50 rounded">
        <div className="font-medium mb-2 text-gray-700">Household Members:</div>
        <ul className="list-disc pl-5">
          {membersList.map(m => {
            const memberId = m?._id || m;
            // Get resident details
            const memberObj = typeof m === "object" ? m : residents.find(r => r._id === memberId);
            return (
              <li key={memberId} className="py-1">
                {fullName(memberObj) || "Unknown Member"}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const columns = [
    {
      title: "Household ID",
      dataIndex: "householdId",
      key: "householdId",
    },
    {
      title: "Head of Household",
      key: "headOfHousehold",
      render: (_, record) => {
        const head = record.headOfHousehold;
        if (!head) return "Not specified";
        // If populated object, use it directly
        if (typeof head === "object") {
          return fullName(head) || "Not specified";
        }
        // Otherwise resolve by ID from residents list
        const found = residents.find(r => r._id === head);
        return fullName(found) || "Not specified";
      },
    },
    {
      title: "Address",
      key: "address",
      render: (_, r) =>
        `${r.address?.street || ""}, ${r.address?.barangay || ""}, ${r.address?.municipality || ""}, ${r.address?.province || ""}`,
    },
    {
      title: "Members Count",
      key: "membersCount",
      render: (_, record) => record.members?.length || 0,
    },
    {
      title: "Purok",
      dataIndex: ["address", "purok"],
      key: "purok",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openView(r)}>View</Button>
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm
            title="Delete household?"
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

  // Get resident options for select inputs
  const residentOptions = residents.map(r => ({
    label: `${r.firstName} ${r.middleName || ''} ${r.lastName}`,
    value: r._id,
  }));

  // Filtered for table search
  const filteredHouseholds = households.filter(h =>
    [
      h.householdId,
      h.address?.street,
      h.address?.barangay,
      h.address?.municipality,
      h.address?.province,
      h.address?.purok,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Compute assigned resident IDs across all households
  const assignedResidentIds = useMemo(() => {
    const set = new Set();
    households.forEach(h => {
      const headId = h.headOfHousehold?._id || h.headOfHousehold;
      if (headId) set.add(String(headId));
      (h.members || []).forEach(m => {
        const id = m?._id || m;
        if (id) set.add(String(id));
      });
    });
    return set;
  }, [households]);

  // Residents available for ADD (exclude anyone already assigned)
  const availableResidentsForAdd = useMemo(
    () => residents.filter(r => !assignedResidentIds.has(String(r._id))),
    [residents, assignedResidentIds]
  );

  // Watch head selections
  const addHeadValue = Form.useWatch("headOfHousehold", addForm);
  const addHeadOptions = useMemo(
    () => availableResidentsForAdd.map(r => ({ label: `${r.firstName} ${r.middleName || ""} ${r.lastName}`, value: r._id })),
    [availableResidentsForAdd]
  );
  const addMemberOptions = useMemo(
    () =>
      availableResidentsForAdd
        .filter(r => String(r._id) !== String(addHeadValue || "")) // exclude selected head
        .map(r => ({ label: `${r.firstName} ${r.middleName || ""} ${r.lastName}`, value: r._id })),
    [availableResidentsForAdd, addHeadValue]
  );

  // For EDIT: allow current household members/head, but exclude those assigned in other households
  const assignedByOthersIds = useMemo(() => {
    const set = new Set();
    households
      .filter(h => !selectedHousehold || String(h._id) !== String(selectedHousehold._id))
      .forEach(h => {
        const headId = h.headOfHousehold?._id || h.headOfHousehold;
        if (headId) set.add(String(headId));
        (h.members || []).forEach(m => {
          const id = m?._id || m;
          if (id) set.add(String(id));
        });
      });
    return set;
  }, [households, selectedHousehold]);

  const availableResidentsForEdit = useMemo(() => {
    // include anyone not assigned elsewhere OR already in this household
    const currentIds = new Set(
      (selectedHousehold?.members || []).map(m => String(m?._id || m))
    );
    if (selectedHousehold?.headOfHousehold) {
      currentIds.add(String(selectedHousehold.headOfHousehold?._id || selectedHousehold.headOfHousehold));
    }
    return residents.filter(r => !assignedByOthersIds.has(String(r._id)) || currentIds.has(String(r._id)));
  }, [residents, assignedByOthersIds, selectedHousehold]);

  const editHeadValue = Form.useWatch("headOfHousehold", editForm);
  const editHeadOptions = useMemo(
    () => availableResidentsForEdit.map(r => ({ label: `${r.firstName} ${r.middleName || ""} ${r.lastName}`, value: r._id })),
    [availableResidentsForEdit]
  );
  const editMemberOptions = useMemo(
    () =>
      availableResidentsForEdit
        .filter(r => String(r._id) !== String(editHeadValue || "")) // exclude selected head
        .map(r => ({ label: `${r.firstName} ${r.middleName || ""} ${r.lastName}`, value: r._id })),
    [availableResidentsForEdit, editHeadValue]
  );

  return (
    <AdminLayout title="Admin">
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Household Management
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
                    Total Households
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {totalHouseholds}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {totalHouseholds}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Members
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {totalMembers}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {totalMembers}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Avg. Household Size
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {avgHouseholdSize}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {avgHouseholdSize}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Single Member
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {singleMemberHouseholds}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {singleMemberHouseholds}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Family Households
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {familyHouseholds}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {familyHouseholds}
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
                placeholder="Search households"
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
                onClick={() => {
                  addForm.resetFields();
                  setAddOpen(true);
                }}
              >
                Add Household
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filteredHouseholds}
              columns={columns}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
              expandable={{
                expandedRowRender: record => renderHouseholdMembers(record),
                rowExpandable: record => record.members?.length > 0,
                expandRowByClick: true,
              }}
            />
          </div>
        </div>
        {/* Add Household Modal */}
        <Modal
          title="Add Household"
          open={addOpen}
          onCancel={() => { setAddOpen(false); setAddOnlyMe(false); }}
          onOk={handleAddHousehold}
          confirmLoading={creating}
          okText="Add"
          width={600}
        >
          <Form form={addForm} layout="vertical">
            {/* Head of Household (only unassigned residents) */}
            <Form.Item name="headOfHousehold" label="Head of Household" rules={[{ required: true }]}>
              <Select
                options={addHeadOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Select head of household"
              />
            </Form.Item>

            {/* NEW: Only me toggle */}
            <Form.Item>
              <Checkbox
                checked={addOnlyMe}
                onChange={(e) => setAddOnlyMe(e.target.checked)}
              >
                No additional members
              </Checkbox>
            </Form.Item>

            {/* Members (exclude already assigned and the selected head) */}
            <Form.Item name="members" label="Household Members" rules={[{ required: true }]}>
              <Select
                mode="multiple"
                options={addMemberOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Select household members"
                disabled={addOnlyMe}
              />
            </Form.Item>

            <Form.Item name={["address", "street"]} label="Street" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["address", "purok"]} label="Purok" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "Purok 1", label: "Purok 1" },
                  { value: "Purok 2", label: "Purok 2" },
                  { value: "Purok 3", label: "Purok 3" },
                  { value: "Purok 4", label: "Purok 4" },
                  { value: "Purok 5", label: "Purok 5" },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit Household Modal */}
        <Modal
          title="Edit Household"
          open={editOpen}
          onCancel={() => { setEditOpen(false); setEditOnlyMe(false); }}
          onOk={handleEditHousehold}
          confirmLoading={editing}
          okText="Save"
          width={600}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item label="Household ID" name="householdId">
              <Input disabled />
            </Form.Item>

            <Form.Item name="headOfHousehold" label="Head of Household" rules={[{ required: true }]}>
              <Select
                options={editHeadOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Select head of household"
              />
            </Form.Item>

            {/* NEW: Only me toggle (Edit) */}
            <Form.Item>
              <Checkbox
                checked={editOnlyMe}
                onChange={(e) => setEditOnlyMe(e.target.checked)}
              >
                Only me (no additional members)
              </Checkbox>
            </Form.Item>

            <Form.Item name="members" label="Household Members" rules={[{ required: true }]}>
              <Select
                mode="multiple"
                options={editMemberOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Select household members"
                disabled={editOnlyMe}
              />
            </Form.Item>

            <Form.Item name={["address", "street"]} label="Street" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name={["address", "purok"]} label="Purok" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "Purok 1", label: "Purok 1" },
                  { value: "Purok 2", label: "Purok 2" },
                  { value: "Purok 3", label: "Purok 3" },
                  { value: "Purok 4", label: "Purok 4" },
                  { value: "Purok 5", label: "Purok 5" },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
        {/* View Household Modal */}
        <Modal
          title="Household Details"
          open={viewOpen}
          onCancel={() => setViewOpen(false)}
          footer={null}
          width={700}
        >
          {viewHousehold && (
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Household ID">{viewHousehold.householdId}</Descriptions.Item>
              <Descriptions.Item label="Head of Household">
                {(() => {
                  const head = viewHousehold.headOfHousehold;
                  if (!head) return "Not specified";
                  if (typeof head === "object") return fullName(head) || "Not specified";
                  const found = residents.find(r => r._id === head);
                  return fullName(found) || "Not specified";
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Number of Members">
                {viewHousehold.members?.length || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Members">
                <ul className="list-disc pl-5">
                  {(viewHousehold.members || []).map(m => {
                    const id = m?._id || m;
                    const mObj = (typeof m === "object" ? m : residents.find(r => r._id === id)) || {};
                    const headId = viewHousehold.headOfHousehold?._id || viewHousehold.headOfHousehold;
                    return (
                      <li key={id}>
                        {fullName(mObj) || "Unknown Member"}
                        {id === headId && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Head of Household
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {[
                  viewHousehold.address?.street,
                  viewHousehold.address?.barangay,
                  viewHousehold.address?.municipality,
                  viewHousehold.address?.province,
                  viewHousehold.address?.zipCode,
                ].filter(Boolean).join(", ")}
              </Descriptions.Item>
              <Descriptions.Item label="Purok">{viewHousehold.address?.purok}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
