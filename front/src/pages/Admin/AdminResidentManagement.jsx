import React, { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Form, Select, DatePicker, Popconfirm, message, Switch, Descriptions, Steps } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { UserOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

// Set your fixed location defaults here
const ADDRESS_DEFAULTS = {
  barangay: "La Torre North",
  municipality: "Bayombong",
  province: "Nueva Vizcaya",
  zipCode: "3700",
};

// Occupation options
const OCCUPATION_OPTIONS = [
  { value: "Student", label: "Student" },
  { value: "Teacher", label: "Teacher" },
  { value: "Doctor", label: "Doctor" },
  { value: "Nurse", label: "Nurse" },
  { value: "Engineer", label: "Engineer" },
  { value: "Lawyer", label: "Lawyer" },
  { value: "Police Officer", label: "Police Officer" },
  { value: "Military", label: "Military" },
  { value: "Government Employee", label: "Government Employee" },
  { value: "Business Owner", label: "Business Owner" },
  { value: "Farmer", label: "Farmer" },
  { value: "Driver", label: "Driver" },
  { value: "Mechanic", label: "Mechanic" },
  { value: "Carpenter", label: "Carpenter" },
  { value: "Electrician", label: "Electrician" },
  { value: "Plumber", label: "Plumber" },
  { value: "Construction Worker", label: "Construction Worker" },
  { value: "Security Guard", label: "Security Guard" },
  { value: "Salesperson", label: "Salesperson" },
  { value: "Cashier", label: "Cashier" },
  { value: "Cook", label: "Cook" },
  { value: "Housewife", label: "Housewife" },
  { value: "Retired", label: "Retired" },
  { value: "Unemployed", label: "Unemployed" },
  { value: "Self-Employed", label: "Self-Employed" },
  { value: "Freelancer", label: "Freelancer" },
  { value: "Other", label: "Other" }
];

// NEW: Consistent API base
const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";

export default function AdminResidentManagement() {
  const [loading, setLoading] = useState(false);
  const [residents, setResidents] = useState([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewResident, setViewResident] = useState(null);
  const [addStep, setAddStep] = useState(0);
  const [editStep, setEditStep] = useState(0);

  // Export state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportForm] = Form.useForm();

  // Get user info from localStorage (or context/auth if you have it)
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    // Check authentication before fetching
    const token = localStorage.getItem("token");
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    
    console.log("Auth check:", {
      token: token ? "Present" : "Missing",
      userProfile,
      role: userProfile.role
    });
    
    if (!token) {
      message.error("No authentication token found. Please login again.");
      return;
    }
    
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      console.log("API_BASE:", API_BASE);
      console.log("Token:", token ? "Present" : "Missing");
      
      const res = await axios.get(
        `${API_BASE}/api/admin/residents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResidents(res.data);
    } catch (err) {
      console.error("Fetch residents error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      message.error(err.response?.data?.message || "Failed to fetch residents");
    }
    setLoading(false);
  };

  // Add Resident
  const handleAddResident = async () => {
    try {
      setCreating(true);
      const values = await addForm.validateFields();
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/api/admin/residents`,
        {
          ...values,
          dateOfBirth: values.dateOfBirth.format("YYYY-MM-DD"),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("Resident added!");
      setAddOpen(false);
      addForm.resetFields();
      fetchResidents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to add resident");
    }
    setCreating(false);
  };

  // Edit Resident
  const openEdit = (resident) => {
    setSelectedResident(resident);
    editForm.setFieldsValue({
      ...resident,
      // Force default, keep other address fields (like purok) intact
      address: { ...(resident.address || {}), ...ADDRESS_DEFAULTS },
      dateOfBirth: resident.dateOfBirth ? dayjs(resident.dateOfBirth) : null,
    });
    setEditStep(0);
    setEditOpen(true);
  };

  const handleEditResident = async () => {
    try {
      setEditing(true);
      const values = await editForm.validateFields();
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/api/admin/residents/${selectedResident._id}`,
        {
          ...values,
          dateOfBirth: values.dateOfBirth.format("YYYY-MM-DD"),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("Resident updated!");
      setEditOpen(false);
      fetchResidents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update resident");
    }
    setEditing(false);
  };

  // Delete Resident
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_BASE}/api/admin/residents/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("Resident deleted!");
      fetchResidents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete resident");
    }
  };

  // Verify Resident
  const handleToggleVerify = async (id, next) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/api/admin/residents/${id}/verify`,
        { status: next ? "verified" : "unverified" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success(next ? "Resident verified!" : "Resident unverified!");
      fetchResidents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update verification");
    }
  };

  // Export to Excel
  const handleExport = async () => {
    try {
      const { purokFilter } = await exportForm.validateFields();
      
      // Filter residents by purok
      let filtered = residents;
      if (purokFilter !== "all") {
        filtered = residents.filter(r => r.address?.purok === purokFilter);
      }

      if (!filtered.length) {
        message.warning("No residents found for the selected purok.");
        return;
      }

      // Prepare data for Excel
      const excelData = filtered.map(r => ({
        "Full Name": [r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(" "),
        "Gender": r.gender || "",
        "Date of Birth": r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString() : "",
        "Birth Place": r.birthPlace || "",
        "Civil Status": r.civilStatus || "",
        "Religion": r.religion || "",
        "Ethnicity": r.ethnicity || "",
        "Citizenship": r.citizenship || "",
        "Occupation": r.occupation || "",
        "Mobile": r.contact?.mobile || "",
        "Email": r.contact?.email || "",
        "Purok": r.address?.purok || "",
        "Barangay": r.address?.barangay || "",
        "Municipality": r.address?.municipality || "",
        "Province": r.address?.province || "",
        "ZIP Code": r.address?.zipCode || "",
        "Status": r.status || "",
        "Created At": r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Auto-fit columns
      const colWidths = Object.keys(excelData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      const sheetName = purokFilter === "all" ? "All_Puroks" : `Purok_${purokFilter.replace(" ", "_")}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate filename
      const timestamp = dayjs().format("YYYYMMDD_HHmmss");
      const filename = `Residents_${sheetName}_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
      
      message.success("Excel file exported successfully!");
      setExportOpen(false);
      exportForm.resetFields();
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export data");
    }
  };

  // Statistics
  const totalResidents = residents.length;
  const maleResidents = residents.filter(r => r.gender === "male").length;
  const femaleResidents = residents.filter(r => r.gender === "female").length;
  const activeResidents = residents.filter(r => r.status === "verified").length;
  const inactiveResidents = residents.filter(r => r.status !== "verified").length;

  // Purok statistics
  const purok1Count = residents.filter(r => r.address?.purok === "Purok 1").length;
  const purok2Count = residents.filter(r => r.address?.purok === "Purok 2").length;
  const purok3Count = residents.filter(r => r.address?.purok === "Purok 3").length;
  const purok4Count = residents.filter(r => r.address?.purok === "Purok 4").length;
  const purok5Count = residents.filter(r => r.address?.purok === "Purok 5").length;

  const columns = [
    {
      title: "Full Name",
      key: "fullName",
      render: (_, r) =>
        [r.firstName, r.middleName, r.lastName, r.suffix]
          .filter(Boolean)
          .join(" "),
    },
  { title: "Gender", dataIndex: "gender", key: "gender" },
  { title: "Date of Birth", dataIndex: "dateOfBirth", key: "dateOfBirth", render: v => v ? new Date(v).toLocaleDateString() : "" },
  { title: "Civil Status", dataIndex: "civilStatus", key: "civilStatus" },
  { title: "Religion", dataIndex: "religion", key: "religion" },
  { title: "Mobile", dataIndex: ["contact", "mobile"], key: "mobile", render: (_, r) => r.contact?.mobile },
  { 
    title: "Purok", 
    key: "purok", 
    render: (_, r) => r.address?.purok ? r.address.purok.replace("Purok ", "") : "",
    filters: [
      { text: "Purok 1", value: "Purok 1" },
      { text: "Purok 2", value: "Purok 2" },
      { text: "Purok 3", value: "Purok 3" },
      { text: "Purok 4", value: "Purok 4" },
      { text: "Purok 5", value: "Purok 5" },
    ],
    onFilter: (value, record) => record.address?.purok === value,
  },
  { title: "Citizenship", dataIndex: "citizenship", key: "citizenship" },
  { title: "Ethnicity", dataIndex: "ethnicity", key: "ethnicity" },
  { title: "Occupation", dataIndex: "occupation", key: "occupation" },
  // ...existing code...
     {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v, r) => (
        <Switch
          checked={v === "verified"}
          onChange={next => handleToggleVerify(r._id, next)}
          checkedChildren={null}
          unCheckedChildren={null}
          className="bg-transparent"
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openView(r)}>View</Button>
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm
            title="Delete resident?"
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

  const filteredResidents = residents.filter(r =>
    [
      r.firstName,
      r.middleName,
      r.lastName,
      r.suffix,
      r.contact?.email,
      r.contact?.mobile,
      r.address?.barangay,
      r.address?.municipality,
      r.address?.province,
      r.citizenship,
      r.religion,
      r.ethnicity,
      r.occupation,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const openView = (resident) => {
    setViewResident(resident);
    setViewOpen(true);
  };

  const stepItems = [
    {
      key: "personal",
      title: "Personal",
      fields: [
        "firstName",
        "middleName",
        "lastName",
        "suffix",
        "dateOfBirth",
        "birthPlace",
        "gender",
        "civilStatus",
        "religion",
        "ethnicity",
      ],
    },
    {
      key: "address",
      title: "Address",
      fields: [
        ["address", "purok"],
        ["address", "barangay"],
        ["address", "municipality"],
        ["address", "province"],
        ["address", "zipCode"],
      ],
    },
    {
      key: "other",
      title: "Other & Contact",
      fields: [
        "citizenship",
        "occupation",
        ["contact", "mobile"],
        ["contact", "email"],
      ],
    },
  ];

  const validateStep = (form, step) => form.validateFields(stepItems[step].fields);

  return (
    <AdminLayout title="Admin">
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Residents Management
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
                    Total Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {totalResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {totalResidents}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Male Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {maleResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {maleResidents}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Female Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {femaleResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {femaleResidents}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Verified Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {activeResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {activeResidents}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Unverified Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {inactiveResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {inactiveResidents}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Purok Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mt-4">
              <Card className="bg-blue-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">Purok 1</CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {purok1Count}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">{purok1Count}</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">Purok 2</CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {purok2Count}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">{purok2Count}</div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">Purok 3</CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {purok3Count}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">{purok3Count}</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">Purok 4</CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {purok4Count}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">{purok4Count}</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">Purok 5</CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {purok5Count}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">{purok5Count}</div>
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
                placeholder="Search residents"
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
                  setAddStep(0);
                  // Apply the defaults each time Add is opened
                  addForm.setFieldsValue({
                    address: { ...(addForm.getFieldValue("address") || {}), ...ADDRESS_DEFAULTS },
                    citizenship: "Filipino",
                  });
                  setAddOpen(true);
                }}
              >
                Add Resident
              </Button>
              <Button
                onClick={() => {
                  exportForm.setFieldsValue({ purokFilter: "all" });
                  setExportOpen(true);
                }}
              >
                Export Excel
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filteredResidents}
              columns={columns}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                showQuickJumper: false,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                simple: false,
              }}
              scroll={{ x: 800 }}
            />
          </div>
        </div>

        {/* Export Modal */}
        <Modal
          title="Export Residents to Excel"
          open={exportOpen}
          onCancel={() => { setExportOpen(false); exportForm.resetFields(); }}
          onOk={handleExport}
          okText="Export"
          width={400}
        >
          <Form form={exportForm} layout="vertical" initialValues={{ purokFilter: "all" }}>
            <Form.Item 
              name="purokFilter" 
              label="Select Purok" 
              rules={[{ required: true, message: "Please select a purok" }]}
            >
              <Select
                placeholder="Choose purok to export"
                options={[
                  { value: "all", label: "All Puroks" },
                  { value: "Purok 1", label: "Purok 1" },
                  { value: "Purok 2", label: "Purok 2" },
                  { value: "Purok 3", label: "Purok 3" },
                  { value: "Purok 4", label: "Purok 4" },
                  { value: "Purok 5", label: "Purok 5" },
                ]}
              />
            </Form.Item>
            <div className="text-sm text-gray-500 mt-2">
              <p><strong>Export includes:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Personal information (name, gender, birth date)</li>
                <li>Contact details (mobile, email)</li>
                <li>Address information</li>
              </ul>
            </div>
          </Form>
        </Modal>

        {/* Add Resident Modal */}
        <Modal
          title="Add Resident"
          open={addOpen}
          onCancel={() => { setAddOpen(false); setAddStep(0); }}
          width={900}
          bodyStyle={{ padding: '24px 48px' }}
          footer={[
            <Button key="cancel" onClick={() => { setAddOpen(false); setAddStep(0); }}>
              Cancel
            </Button>,
            addStep > 0 && (
              <Button key="prev" onClick={() => setAddStep(s => s - 1)}>
                Previous
              </Button>
            ),
            addStep < stepItems.length - 1 ? (
              <Button
                key="next"
                type="primary"
                onClick={async () => {
                  try {
                    await validateStep(addForm, addStep);
                    setAddStep(s => s + 1);
                  } catch {}
                }}
              >
                Next
              </Button>
            ) : (
              <Button
                key="submit"
                type="primary"
                loading={creating}
                onClick={handleAddResident}
              >
                Add
              </Button>
            ),
          ]}
        >
          <Steps
            size="small"
            current={addStep}
            items={stepItems.map(s => ({ title: s.title }))}
            className="mb-2"
          />
          <Form form={addForm} layout="vertical" className="compact-form">
            <style jsx="true">{`
              .compact-form .ant-form-item {
                margin-bottom: 8px;
              }
              .compact-form .ant-form-item-label {
                padding-bottom: 4px;
              }
              .compact-form .ant-form-item-explain {
                min-height: 18px;
              }
              .form-row {
                display: flex;
                gap: 8px;
                margin-bottom: 0;
              }
              .form-row .ant-form-item {
                flex: 1;
              }
            `}</style>
            
            {/* Step 1 - Personal */}
            <div style={{ display: addStep === 0 ? "block" : "none" }}>
              <div className="form-row">
                <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </div>
              
              <div className="form-row">
                <Form.Item name="middleName" label="Middle Name">
                  <Input />
                </Form.Item>
                <Form.Item name="suffix" label="Suffix">
                  <Input />
                </Form.Item>
              </div>
              
              <div className="form-row">
                <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}>
                  <DatePicker className="w-full" />
                </Form.Item>
                <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </Form.Item>
              </div>
              
              <Form.Item name="birthPlace" label="Birth Place" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              
              <div className="form-row">
                <Form.Item name="civilStatus" label="Civil Status" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: "single", label: "Single" },
                      { value: "married", label: "Married" },
                      { value: "widowed", label: "Widowed" },
                      { value: "separated", label: "Separated" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="religion" label="Religion">
                  <Input placeholder="e.g., Catholic, Protestant, Islam" />
                </Form.Item>
              </div>
              
              <Form.Item name="ethnicity" label="Ethnicity" rules={[{ required: true }]}>
                <Input placeholder="e.g., Ilocano, Tagalog, Igorot" />
              </Form.Item>
            </div>

            {/* Step 2 - Address */}
            <div style={{ display: addStep === 1 ? "block" : "none" }}>
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
              
              <div className="form-row">
                <Form.Item name={["address", "barangay"]} label="Barangay" rules={[{ required: true }]}>
                  <Input disabled />
                </Form.Item>
                <Form.Item name={["address", "zipCode"]} label="ZIP Code">
                  <Input disabled />
                </Form.Item>
              </div>
              
              <div className="form-row">
                <Form.Item name={["address", "municipality"]} label="Municipality" rules={[{ required: true }]}>
                  <Input disabled />
                </Form.Item>
                <Form.Item name={["address", "province"]} label="Province" rules={[{ required: true }]}>
                  <Input disabled />
                </Form.Item>
              </div>
            </div>

            {/* Step 3 - Other & Contact */}
            <div style={{ display: addStep === 2 ? "block" : "none" }}>
              <Form.Item name="citizenship" label="Citizenship" rules={[{ required: true }]}>
                <Input disabled />
              </Form.Item>
              
              <div className="form-row">
                <Form.Item name="occupation" label="Occupation" rules={[{ required: true }]}>
                  <Input placeholder="e.g., Teacher, Engineer, Farmer" />
                </Form.Item>
              </div>
              
              <div className="form-row">
                <Form.Item name={["contact", "mobile"]} label="Mobile" rules={[{ type: "string" }]}>
                  <Input />
                </Form.Item>
                <Form.Item name={["contact", "email"]} label="Email" rules={[{ type: "email", required: false }]}> 
                  <Input />
                </Form.Item>
              </div>
            </div>
          </Form>
        </Modal>

        {/* Edit Resident Modal */}
        <Modal
          title="Edit Resident"
          open={editOpen}
          onCancel={() => { setEditOpen(false); setEditStep(0); }}
          width={900}
          bodyStyle={{ padding: '24px 48px' }}
          footer={[
            <Button key="cancel" onClick={() => { setEditOpen(false); setEditStep(0); }}>
              Cancel
            </Button>,
            editStep > 0 && (
              <Button key="prev" onClick={() => setEditStep(s => s - 1)}>
                Previous
              </Button>
            ),
            editStep < stepItems.length - 1 ? (
              <Button
                key="next"
                type="primary"
                onClick={async () => {
                  try {
                    await validateStep(editForm, editStep);
                    setEditStep(s => s + 1);
                  } catch {}
                }}
              >
                Next
              </Button>
            ) : (
              <Button
                key="submit"
                type="primary"
                loading={editing}
                onClick={handleEditResident}
              >
                Save
              </Button>
            ),
          ]}
        >
          <Steps
            size="small"
            current={editStep}
            items={stepItems.map(s => ({ title: s.title }))}
            className="mb-2"
          />
          <Form form={editForm} layout="vertical" className="compact-form">
            <style jsx="true">{`
              .compact-form .ant-form-item {
                margin-bottom: 8px;
              }
              .compact-form .ant-form-item-label {
                padding-bottom: 4px;
              }
              .compact-form .ant-form-item-explain {
                min-height: 18px;
              }
              .form-row {
                display: flex;
                gap: 8px;
                margin-bottom: 0;
              }
              .form-row .ant-form-item {
                flex: 1;
              }
            `}</style>
            
            {/* Step 1 - Personal */}
            <div style={{ display: editStep === 0 ? "block" : "none" }}>
              <div className="form-row">
                <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </div>
              
              <div className="form-row">
                <Form.Item name="middleName" label="Middle Name">
                  <Input />
                </Form.Item>
                <Form.Item name="suffix" label="Suffix">
                  <Input />
                </Form.Item>
              </div>
              
              <div className="form-row">
                <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}>
                  <DatePicker className="w-full" />
                </Form.Item>
                <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </Form.Item>
              </div>
              
              <Form.Item name="birthPlace" label="Birth Place" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              
              <div className="form-row">
                <Form.Item name="civilStatus" label="Civil Status" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: "single", label: "Single" },
                      { value: "married", label: "Married" },
                      { value: "widowed", label: "Widowed" },
                      { value: "separated", label: "Separated" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="religion" label="Religion">
                  <Input placeholder="e.g., Catholic, Protestant, Islam" />
                </Form.Item>
              </div>
              
              <Form.Item name="ethnicity" label="Ethnicity" rules={[{ required: true }]}>
                <Input placeholder="e.g., Ilocano, Tagalog, Igorot" />
              </Form.Item>
            </div>
            
            {/* Step 2 - Address */}
            <div style={{ display: editStep === 1 ? "block" : "none" }}>
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
              
              <div className="form-row">
                <Form.Item name={["address", "barangay"]} label="Barangay" rules={[{ required: true }]}>
                  <Input disabled />
                </Form.Item>
                <Form.Item name={["address", "zipCode"]} label="ZIP Code">
                  <Input disabled />
                </Form.Item>
              </div>
              
              <div className="form-row">
                <Form.Item name={["address", "municipality"]} label="Municipality" rules={[{ required: true }]}>
                  <Input disabled />
                </Form.Item>
                <Form.Item name={["address", "province"]} label="Province" rules={[{ required: true }]}>
                  <Input disabled />
                </Form.Item>
              </div>
            </div>

            {/* Step 3 - Other & Contact */}
            <div style={{ display: editStep === 2 ? "block" : "none" }}>
              <Form.Item name="citizenship" label="Citizenship" rules={[{ required: true }]}>
                <Input disabled />
              </Form.Item>
              
              <div className="form-row">
                <Form.Item name="occupation" label="Occupation" rules={[{ required: true }]}>
                  <Input placeholder="e.g., Teacher, Engineer, Farmer" />
                </Form.Item>
              </div>
              
              <div className="form-row">
                <Form.Item name={["contact", "mobile"]} label="Mobile" rules={[{ type: "string" }]}>
                  <Input />
                </Form.Item>
                <Form.Item name={["contact", "email"]} label="Email" rules={[{ type: "email", required: false }]}> 
                  <Input />
                </Form.Item>
              </div>
            </div>
          </Form>
        </Modal>
        {/* View Resident Modal */}
        <Modal
          title="Resident Details"
          open={viewOpen}
          onCancel={() => setViewOpen(false)}
          footer={null}
          width={700}
        >
          {viewResident && (
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Full Name">
                {[viewResident.firstName, viewResident.middleName, viewResident.lastName, viewResident.suffix].filter(Boolean).join(" ")}
              </Descriptions.Item>
              <Descriptions.Item label="Username">{viewResident.user?.username || "-"}</Descriptions.Item>
              <Descriptions.Item label="Gender">{viewResident.gender}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">{viewResident.dateOfBirth ? new Date(viewResident.dateOfBirth).toLocaleDateString() : ""}</Descriptions.Item>
              <Descriptions.Item label="Civil Status">{viewResident.civilStatus}</Descriptions.Item>
              <Descriptions.Item label="Birth Place">{viewResident.birthPlace}</Descriptions.Item>
              <Descriptions.Item label="Religion">{viewResident.religion || "-"}</Descriptions.Item>
              <Descriptions.Item label="Ethnicity">{viewResident.ethnicity}</Descriptions.Item>
              <Descriptions.Item label="Citizenship">{viewResident.citizenship}</Descriptions.Item>
              <Descriptions.Item label="Occupation">{viewResident.occupation}</Descriptions.Item>
              {viewResident.contact?.mobile && (
                <Descriptions.Item label="Mobile">{viewResident.contact.mobile}</Descriptions.Item>
              )}
              <Descriptions.Item label="Email">{viewResident.contact?.email}</Descriptions.Item>
              <Descriptions.Item label="Address">
                {[
                  viewResident.address?.barangay,
                  viewResident.address?.municipality,
                  viewResident.address?.province,
                  viewResident.address?.zipCode,
                ].filter(Boolean).join(", ")}
              </Descriptions.Item>
              <Descriptions.Item label="Purok">{viewResident.address?.purok}</Descriptions.Item>
              <Descriptions.Item label="Status">{viewResident.status}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}