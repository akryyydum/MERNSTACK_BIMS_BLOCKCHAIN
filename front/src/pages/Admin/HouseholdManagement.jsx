import React, { useEffect, useState, useMemo } from "react";
import { Table, Input, Button, Modal, Form, Select, message, Popconfirm, Descriptions, Tabs, InputNumber, DatePicker, Checkbox } from "antd";
import dayjs from "dayjs";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { UserOutlined, DollarOutlined, FireOutlined, ReconciliationOutlined } from "@ant-design/icons";
import axios from "axios";

// Hardcoded sample data for development
const sampleResidents = [
  {
    _id: "r1",
    firstName: "Juan",
    middleName: "Dela",
    lastName: "Cruz",
    gender: "male",
    dateOfBirth: "1985-05-15",
    contact: { mobile: "09123456789", email: "juan@example.com" },
    address: {
      street: "123 Main St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 1"
    },
    status: "verified"
  },
  {
    _id: "r2",
    firstName: "Maria",
    middleName: "Santos",
    lastName: "Garcia",
    gender: "female",
    dateOfBirth: "1990-08-20",
    contact: { mobile: "09876543210", email: "maria@example.com" },
    address: {
      street: "456 Oak Ave.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 2"
    },
    status: "verified"
  },
  {
    _id: "r3",
    firstName: "Pedro",
    middleName: "Reyes",
    lastName: "Santos",
    gender: "male",
    dateOfBirth: "1982-03-10",
    contact: { mobile: "09567891234", email: "pedro@example.com" },
    address: {
      street: "789 Elm St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 3"
    },
    status: "verified"
  },
  {
    _id: "r4",
    firstName: "Rosa",
    middleName: "Cruz",
    lastName: "Reyes",
    gender: "female",
    dateOfBirth: "1995-11-05",
    contact: { mobile: "09234567891", email: "rosa@example.com" },
    address: {
      street: "101 Pine St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 2"
    },
    status: "verified"
  },
  {
    _id: "r5",
    firstName: "Antonio",
    middleName: "Gonzales",
    lastName: "Martinez",
    gender: "male",
    dateOfBirth: "1978-07-22",
    contact: { mobile: "09345678912", email: "antonio@example.com" },
    address: {
      street: "202 Cedar St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 4"
    },
    status: "verified"
  }
];

// Sample Gas Fee Data
const sampleGasFees = [
  {
    _id: "gf1",
    householdId: "h1",
    month: "September 2025",
    totalCharge: 850.00,
    amountPaid: 500.00,
    balance: 350.00,
    lastUpdated: "2025-09-10T08:30:00Z",
    status: "partial", // fully-paid, partial, unpaid
  },
  {
    _id: "gf2",
    householdId: "h2",
    month: "September 2025",
    totalCharge: 1200.00,
    amountPaid: 1200.00,
    balance: 0.00,
    lastUpdated: "2025-09-12T14:15:00Z",
    status: "fully-paid",
  },
  {
    _id: "gf3",
    householdId: "h3",
    month: "September 2025",
    totalCharge: 650.00,
    amountPaid: 0.00,
    balance: 650.00,
    lastUpdated: "2025-09-05T10:45:00Z",
    status: "unpaid",
  }
];

const sampleHouseholds = [
  {
    _id: "h1",
    householdId: "HH-2023-001",
    headOfHousehold: "r1",
    members: ["r1", "r2"],
    address: {
      street: "123 Main St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 1",
      zipCode: "3700"
    },
    gasFee: {
      currentMonthCharge: 850.00,
      balance: 350.00,
      lastPaymentDate: "2025-09-10",
    }
  },
  {
    _id: "h2",
    householdId: "HH-2023-002",
    headOfHousehold: "r3",
    members: ["r3", "r4"],
    address: {
      street: "789 Elm St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 3",
      zipCode: "3700"
    },
    gasFee: {
      currentMonthCharge: 1200.00,
      balance: 0.00,
      lastPaymentDate: "2025-09-12",
    }
  },
  {
    _id: "h3",
    householdId: "HH-2023-003",
    headOfHousehold: "r5",
    members: ["r5"],
    address: {
      street: "202 Cedar St.",
      barangay: "La Torre North",
      municipality: "Bayombong",
      province: "Nueva Vizcaya",
      purok: "Purok 4",
      zipCode: "3700"
    },
    gasFee: {
      currentMonthCharge: 650.00,
      balance: 650.00,
      lastPaymentDate: null,
    }
  }
];

const ADDRESS_DEFAULTS = {
  barangay: "La Torre North",
  municipality: "Bayombong",
  province: "Nueva Vizcaya",
  zipCode: "3700",
};

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
  const [payOpen, setPayOpen] = useState(false);
  const [payForm] = Form.useForm();
  const [payLoading, setPayLoading] = useState(false);
  const [paySummary, setPaySummary] = useState(null);
  const [payHousehold, setPayHousehold] = useState(null);
  const [payType, setPayType] = useState("garbage"); // "garbage" | "electric"

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

  const fetchFeeSummary = async (householdId, monthStr, type) => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/households/${householdId}/${type}`, {
        headers: authHeaders(),
        params: { month: monthStr },
      });
      setPaySummary(res.data);
      payForm.setFieldsValue({
        month: dayjs(`${monthStr}-01`),
        totalCharge: Number(res.data.totalCharge || 0),
        amount: Number(res.data.balance || res.data.totalCharge || 0),
        method: undefined,
        reference: undefined,
      });
    } catch (err) {
      message.error(err?.response?.data?.message || `Failed to load ${type} summary`);
    }
  };

  const openPayFee = async (household, type) => {
    const monthStr = dayjs().format("YYYY-MM");
    setPayHousehold(household);
    setPayType(type);
    setPayOpen(true);
    await fetchFeeSummary(household._id, monthStr, type);
  };

  const onPayMonthChange = async (date) => {
    const monthStr = dayjs(date).format("YYYY-MM");
    if (payHousehold?._id) {
      await fetchFeeSummary(payHousehold._id, monthStr, payType);
    }
  };

  const submitPayFee = async () => {
    try {
      setPayLoading(true);
      const values = await payForm.validateFields();
      const payload = {
        month: dayjs(values.month).format("YYYY-MM"),
        amount: Number(values.amount),
        totalCharge: Number(values.totalCharge),
        method: values.method,
        reference: values.reference,
      };
      const res = await axios.post(
        `${API_BASE}/api/admin/households/${payHousehold._id}/${payType}/pay`,
        payload,
        { headers: authHeaders() }
      );
      message.success(res.data.status === "paid" ? `${payType === "garbage" ? "Garbage" : "Electric"} fee fully paid!` : "Partial payment recorded!");
      setPayOpen(false);
      setPaySummary(null);
      setPayHousehold(null);
      payForm.resetFields();
      fetchHouseholds();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setPayLoading(false);
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
          <Button type="primary" size="small" onClick={() => openPayFee(r, "garbage")}>Pay Garbage</Button>
          <Button type="primary" size="small" onClick={() => openPayFee(r, "electric")}>Pay Electric</Button>
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

        {/* Pay Utility Modal */}
        <Modal
          title={`Pay ${payType === "garbage" ? "Garbage" : "Electric"} Fees${payHousehold ? ` — ${payHousehold.householdId}` : ""}`}
          open={payOpen}
          onCancel={() => { setPayOpen(false); setPayHousehold(null); setPaySummary(null); }}
          onOk={submitPayFee}
          okText="Pay"
          confirmLoading={payLoading}
          width={520}
        >
          <Form form={payForm} layout="vertical">
            <Form.Item label="Fee Type">
              <Input disabled value={payType === "garbage" ? "Garbage" : "Electric"} />
            </Form.Item>
            <Form.Item
              name="month"
              label="Month"
              rules={[{ required: true, message: "Select month" }]}
            >
              <DatePicker picker="month" className="w-full" onChange={onPayMonthChange} />
            </Form.Item>
            <Form.Item
              name="totalCharge"
              label="Total Charge for Month"
              rules={[{ required: true, message: "Enter total charge" }]}
            >
              <InputNumber className="w-full" min={0} step={50} />
            </Form.Item>
            <Form.Item
              name="amount"
              label="Amount to Pay"
              rules={[
                { required: true, message: "Enter amount to pay" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const total = Number(getFieldValue("totalCharge") || 0);
                    if (value === undefined) return Promise.reject();
                    if (Number(value) < 0) return Promise.reject(new Error("Amount cannot be negative"));
                    if (Number(value) === 0) return Promise.reject(new Error("Amount must be greater than 0"));
                    if (Number(value) > total + 1e-6) {
                      return Promise.reject(new Error("Amount cannot exceed total charge"));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber className="w-full" min={0} step={50} />
            </Form.Item>
            <Form.Item name="method" label="Payment Method">
              <Select
                allowClear
                options={[
                  { value: "cash", label: "Cash" },
                  { value: "gcash", label: "GCash" },
                  { value: "bank", label: "Bank Transfer" },
                  { value: "other", label: "Other" },
                ]}
              />
            </Form.Item>
            <Form.Item name="reference" label="Reference No. (optional)">
              <Input />
            </Form.Item>

            {paySummary && (
              <div className="p-2 rounded border border-slate-200 bg-slate-50 text-sm">
                <div>Paid so far: ₱{Number(paySummary.amountPaid || 0).toFixed(2)}</div>
                <div>Balance: ₱{Number(paySummary.balance || 0).toFixed(2)}</div>
                <div>Status: {paySummary.status}</div>
              </div>
            )}
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
