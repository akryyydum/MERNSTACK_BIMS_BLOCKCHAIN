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

// Sectoral Information options
const SECTORAL_OPTIONS = [
  { value: "Solo Parent", label: "Solo Parent" },
  { value: "OFW", label: "OFW (Overseas Filipino Worker)" },
  { value: "PWD", label: "PWD (Person with Disability)" },
  { value: "OSC - Out of School Children", label: "OSC - Out of School Children" },
  { value: "OSY - Out of School Youth", label: "OSY - Out of School Youth" },
  { value: "OSA - Out of School Adult", label: "OSA - Out of School Adult" },
  { value: "None", label: "None" }
];

// Employment Status options
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "Unemployed", label: "Unemployed" },
  { value: "Labor Force", label: "Labor Force" }
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
  const [exportEthnicityOther, setExportEthnicityOther] = useState(false);
  const [exportReligionOther, setExportReligionOther] = useState(false);
  const [exportFilterType, setExportFilterType] = useState(null);

  // Selection state for bulk operations
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importForm] = Form.useForm();
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

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
      // Clear selection when data refreshes
      setSelectedRowKeys([]);
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

  // Reject Resident
  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/api/admin/residents/${id}/verify`,
        { status: "rejected" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("Resident rejected!");
      fetchResidents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to reject resident");
    }
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

  // Bulk Delete Residents
  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select residents to delete");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      // Delete residents one by one
      await Promise.all(
        selectedRowKeys.map(id =>
          axios.delete(
            `${API_BASE}/api/admin/residents/${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      
      message.success(`${selectedRowKeys.length} resident(s) deleted successfully!`);
      setSelectedRowKeys([]);
      fetchResidents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete selected residents");
    }
  };

  // Row selection handlers
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const onSelectAll = (selected, selectedRows, changeRows) => {
    if (selected) {
      // Select ALL residents that match the current filter (across all pages)
      const allKeys = filteredResidents.map(resident => resident._id);
      setSelectedRowKeys(allKeys);
      if (allKeys.length > 10) {
        message.info(`Selected ${allKeys.length} resident(s) across all pages`);
      }
    } else {
      // Deselect all
      setSelectedRowKeys([]);
    }
  };

  // Manual select all function for button
  const handleSelectAll = () => {
    const allKeys = filteredResidents.map(resident => resident._id);
    setSelectedRowKeys(allKeys);
    message.success(`Selected all ${allKeys.length} resident(s) across all pages`);
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedRowKeys([]);
    message.info("Cleared all selections");
  };

  // Verify Resident
  const handleToggleVerify = async (id, next) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/api/admin/residents/${id}/verify`,
        { status: next ? "verified" : "pending" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success(next ? "Resident verified!" : "Resident status set to pending!");
      fetchResidents();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update verification");
    }
  };

  // Import Residents
  const handleImport = async () => {
    try {
      setImporting(true);
      const values = await importForm.validateFields();
      
      if (!importFile) {
        message.error("Please select a file to import");
        setImporting(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("purok", values.purok);

      console.log("Importing residents:", {
        fileName: importFile.name,
        fileSize: importFile.size,
        purok: values.purok,
      });

      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/admin/residents/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Import response:", res.data);
      
      const { created, updated, skipped, errors } = res.data;
      
      if (created > 0 || updated > 0) {
        message.success(`Import complete! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`, 5);
      } else if (skipped > 0) {
        message.warning(`All rows skipped (${skipped}). Check details below.`, 5);
      }
      
      if (errors && errors.length > 0) {
        console.warn("Import errors:", errors);
        errors.forEach(err => {
          console.error(`Row ${err.row}: ${err.message}`);
        });
        message.error(`${errors.length} row(s) had errors. Check console for details.`, 5);
      }
      
      setImportOpen(false);
      importForm.resetFields();
      setImportFile(null);
      fetchResidents();
    } catch (err) {
      console.error("Import error:", err);
      console.error("Error details:", err.response?.data);
      message.error(err.response?.data?.message || "Failed to import residents");
    } finally {
      setImporting(false);
    }
  };

  // Export to Excel
  const handleExport = async () => {
    try {
      const { purokFilter, filterType, ethnicityValue, ethnicityOtherText, religionValue, religionOtherText, ageValue } = await exportForm.validateFields();
      
      // Helper function to calculate age
      const calculateAge = (birthDate) => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return age;
      };
      
      // Filter residents by purok
      let filtered = residents;
      if (purokFilter !== "all") {
        filtered = residents.filter(r => r.address?.purok === purokFilter);
      }
      
      // Apply additional filters based on filterType
      if (filterType === "ethnicity" && ethnicityValue) {
        const ethnicityToMatch = ethnicityValue === "Others" ? ethnicityOtherText : ethnicityValue;
        filtered = filtered.filter(r => {
          const residentEthnicity = r.ethnicity || "";
          return residentEthnicity.toLowerCase().includes(ethnicityToMatch.toLowerCase());
        });
      } else if (filterType === "religion" && religionValue) {
        const religionToMatch = religionValue === "Others" ? religionOtherText : religionValue;
        filtered = filtered.filter(r => {
          const residentReligion = r.religion || "";
          return residentReligion.toLowerCase().includes(religionToMatch.toLowerCase());
        });
      } else if (filterType === "age" && ageValue) {
        if (ageValue === "senior") {
          filtered = filtered.filter(r => calculateAge(r.dateOfBirth) >= 60);
        } else if (ageValue === "non-senior") {
          filtered = filtered.filter(r => calculateAge(r.dateOfBirth) < 60);
        }
      }

      if (!filtered.length) {
        message.warning("No residents found for the selected filters.");
        return;
      }

      // Prepare data for Excel
      const excelData = filtered.map(r => ({
        "Full Name": [r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(" "),
        "Sex": r.sex || "",
        "Age": calculateAge(r.dateOfBirth),
        "Date of Birth": r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString() : "",
        "Birth Place": r.birthPlace || "",
        "Civil Status": r.civilStatus || "",
        "Religion": r.religion || "",
        "Ethnicity": r.ethnicity || "",
        "Citizenship": r.citizenship || "",
        "Occupation": r.occupation || "",
        "Sectoral Information": r.sectoralInformation || "",
        "Employment Status": r.employmentStatus || "",
        "Registered Voter": r.registeredVoter ? "Yes" : "No",
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
      let filterPart = "";
      if (filterType === "ethnicity" && ethnicityValue) {
        filterPart = `_${ethnicityValue === "Others" ? ethnicityOtherText.replace(/\s+/g, "_") : ethnicityValue}`;
      } else if (filterType === "religion" && religionValue) {
        filterPart = `_${religionValue === "Others" ? religionOtherText.replace(/\s+/g, "_") : religionValue}`;
      } else if (filterType === "age" && ageValue) {
        filterPart = ageValue === "senior" ? "_SeniorCitizens" : "_NonSeniorCitizens";
      }
      const filename = `Residents_${sheetName}${filterPart}_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
      
      message.success("Excel file exported successfully!");
      setExportOpen(false);
      exportForm.resetFields();
      setExportEthnicityOther(false);
      setExportReligionOther(false);
      setExportFilterType(null);
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export data");
    }
  };

  // Statistics
  const totalResidents = residents.length;
  const maleResidents = residents.filter(r => r.sex === "male").length;
  const femaleResidents = residents.filter(r => r.sex === "female").length;
  const activeResidents = residents.filter(r => r.status === "verified").length;
  const pendingResidents = residents.filter(r => r.status === "pending").length;
  const rejectedResidents = residents.filter(r => r.status === "rejected").length;

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
  { title: "Sex", dataIndex: "sex", key: "sex" },
  { title: "Date of Birth", dataIndex: "dateOfBirth", key: "dateOfBirth", render: v => v ? new Date(v).toLocaleDateString() : "" },
  { title: "Civil Status", dataIndex: "civilStatus", key: "civilStatus" },
  { title: "Religion", dataIndex: "religion", key: "religion" },
  { title: "Mobile Number", dataIndex: ["contact", "mobile"], key: "mobile", render: (_, r) => r.contact?.mobile },
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
  { title: "Sectoral Info", dataIndex: "sectoralInformation", key: "sectoralInformation" },
  { title: "Employment Status", dataIndex: "employmentStatus", key: "employmentStatus", render: (value) => value || "-" },
  { 
    title: "Registered Voter", 
    dataIndex: "registeredVoter", 
    key: "registeredVoter",
    render: (value) => value ? "Yes" : "No",
    filters: [
      { text: "Yes", value: true },
      { text: "No", value: false },
    ],
    onFilter: (value, record) => record.registeredVoter === value,
  },
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
      filters: [
        { text: "Verified", value: "verified" },
        { text: "Pending", value: "pending" },
        { text: "Rejected", value: "rejected" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      fixed: 'right',
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

  const filteredResidents = residents
    .filter(r =>
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
        r.sectoralInformation,
        r.employmentStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return b._id.localeCompare(a._id);
    });

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
        "sex",
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
        "sectoralInformation",
        "registeredVoter",
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
                    Pending Residents
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {pendingResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {pendingResidents}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Second Row: Rejected + Purok Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 mt-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Rejected
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {rejectedResidents}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {rejectedResidents}
                  </div>
                </CardContent>
              </Card>
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
              <Card className="bg-pink-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
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
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Input.Search
                allowClear
                placeholder="Search for residents"
                onSearch={v => setSearch(v.trim())}
                value={search}
                onChange={e => setSearch(e.target.value)}
                enterButton
                className="w-full sm:min-w-[280px] md:min-w-[350px] lg:min-w-[450px] max-w-2xl"
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
              <Button
                onClick={() => {
                  setImportOpen(true);
                }}
              >
                Import Residents
              </Button>

              <Button onClick={handleSelectAll} type="default">
                Select All ({filteredResidents.length})
              </Button>

              {selectedRowKeys.length > 0 && (
                <>
                  <Button onClick={handleClearSelection}>
                    Clear Selection
                  </Button>
                  <Popconfirm
                    title={`Delete ${selectedRowKeys.length} resident(s)?`}
                    description="This action cannot be undone."
                    okButtonProps={{ danger: true }}
                    onConfirm={handleBulkDelete}
                  >
                    <Button danger>
                      Delete Selected ({selectedRowKeys.length})
                    </Button>
                  </Popconfirm>
                </>
              )}

            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filteredResidents}
              columns={columns}
              rowSelection={{
                selectedRowKeys,
                onChange: onSelectChange,
                onSelectAll: onSelectAll,
                type: 'checkbox',
                getCheckboxProps: (record) => ({
                  name: record.name,
                }),
                selections: [
                  {
                    key: 'all-pages',
                    text: 'Select All Pages',
                    onSelect: () => {
                      handleSelectAll();
                    },
                  },
                  {
                    key: 'clear-all',
                    text: 'Clear All',
                    onSelect: () => {
                      handleClearSelection();
                    },
                  },
                ],
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                showQuickJumper: false,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} | Selected: ${selectedRowKeys.length}`,
                simple: false,
              }}
              scroll={{ x: 1400 }}
            />
          </div>
        </div>

        {/* Export Modal */}
        <Modal
          title="Export Residents to Excel"
          open={exportOpen}
          onCancel={() => { 
            setExportOpen(false); 
            exportForm.resetFields(); 
            setExportEthnicityOther(false);
            setExportReligionOther(false);
            setExportFilterType(null);
          }}
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
            
            <Form.Item 
              name="filterType" 
              label="Filter By (Optional)"
            >
              <Select
                placeholder="Select filter type"
                allowClear
                onChange={(value) => {
                  setExportFilterType(value);
                  setExportEthnicityOther(false);
                  setExportReligionOther(false);
                  // Clear related fields when filter type changes
                  exportForm.setFieldsValue({
                    ethnicityValue: undefined,
                    ethnicityOtherText: undefined,
                    religionValue: undefined,
                    religionOtherText: undefined,
                    ageValue: undefined,
                  });
                }}
                options={[
                  { value: "ethnicity", label: "Ethnicity" },
                  { value: "religion", label: "Religion" },
                  { value: "age", label: "Age" },
                ]}
              />
            </Form.Item>
            
            {/* Ethnicity Filter */}
            {exportFilterType === "ethnicity" && (
              <>
                <Form.Item 
                  name="ethnicityValue" 
                  label="Select Ethnicity"
                  rules={[{ required: true, message: "Please select ethnicity" }]}
                >
                  <Select
                    placeholder="Select ethnicity"
                    onChange={(value) => setExportEthnicityOther(value === "Others")}
                    options={[
                      { value: "Ilocano", label: "Ilocano" },
                      { value: "Tagalog", label: "Tagalog" },
                      { value: "Ifugao", label: "Ifugao" },
                      { value: "Igorot", label: "Igorot" },
                      { value: "Others", label: "Others" },
                    ]}
                  />
                </Form.Item>
                
                {exportEthnicityOther && (
                  <Form.Item 
                    name="ethnicityOtherText" 
                    label="Specify Ethnicity"
                    rules={[{ required: true, message: "Please specify the ethnicity" }]}
                  >
                    <Input placeholder="Enter ethnicity" />
                  </Form.Item>
                )}
              </>
            )}
            
            {/* Religion Filter */}
            {exportFilterType === "religion" && (
              <>
                <Form.Item 
                  name="religionValue" 
                  label="Select Religion"
                  rules={[{ required: true, message: "Please select religion" }]}
                >
                  <Select
                    placeholder="Select religion"
                    onChange={(value) => setExportReligionOther(value === "Others")}
                    options={[
                      { value: "Roman Catholic", label: "Roman Catholic" },
                      { value: "Islam", label: "Islam" },
                      { value: "Others", label: "Others" },
                    ]}
                  />
                </Form.Item>
                
                {exportReligionOther && (
                  <Form.Item 
                    name="religionOtherText" 
                    label="Specify Religion"
                    rules={[{ required: true, message: "Please specify the religion" }]}
                  >
                    <Input placeholder="Enter religion" />
                  </Form.Item>
                )}
              </>
            )}
            
            {/* Age Filter */}
            {exportFilterType === "age" && (
              <Form.Item 
                name="ageValue" 
                label="Select Age Group"
                rules={[{ required: true, message: "Please select age group" }]}
              >
                <Select
                  placeholder="Select age group"
                  options={[
                    { value: "senior", label: "Senior Citizens (60 years and above)" },
                    { value: "non-senior", label: "Non-Senior Citizens (Below 60 years)" },
                  ]}
                />
              </Form.Item>
            )}
            
            <div className="text-sm text-gray-500 mt-2">
              <p><strong>Export includes:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Personal information (name, sex, age, birth date)</li>
                <li>Contact details (mobile, email)</li>
                <li>Address information</li>
              </ul>
            </div>
          </Form>
        </Modal>

        {/* Import Modal */}
        <Modal
          title="Import Residents from Excel"
          open={importOpen}
          onCancel={() => {
            setImportOpen(false);
            importForm.resetFields();
            setImportFile(null);
          }}
          onOk={handleImport}
          confirmLoading={importing}
          okText="Import"
          width={500}
        >
          <Form form={importForm} layout="vertical">
            <Form.Item
              name="purok"
              label="Select Purok"
              rules={[{ required: true, message: "Please select a purok for imported residents" }]}
            >
              <Select
                placeholder="Choose purok for imported residents"
                options={[
                  { value: "Purok 1", label: "Purok 1" },
                  { value: "Purok 2", label: "Purok 2" },
                  { value: "Purok 3", label: "Purok 3" },
                  { value: "Purok 4", label: "Purok 4" },
                  { value: "Purok 5", label: "Purok 5" },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Select Excel File"
              rules={[{ required: true, message: "Please select a file" }]}
            >
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setImportFile(file);
                }}
              />
            </Form.Item>

            {importFile && (
              <div className="text-sm text-gray-600 mt-2 p-3 bg-blue-50 rounded">
                <strong>Selected file:</strong> {importFile.name}
              </div>
            )}

            <div className="text-sm text-gray-600 mt-4 p-3 bg-gray-50 rounded">
              <strong>Import Instructions:</strong>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>All imported residents will be assigned to the selected Purok</li>
                <li>File should contain columns: LAST NAME, FIRST NAME, MIDDLE NAME, etc.</li>
                <li>Date format should be YYYY-MM-DD or MM/DD/YYYY</li>
                <li>Required fields: First Name, Last Name, Date of Birth, Sex</li>
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
                  <DatePicker 
                    className="w-full" 
                    disabledDate={current => current && current > new Date()}
                    placeholder="Select date of birth"
                  />
                </Form.Item>
                <Form.Item name="sex" label="Sex" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
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
              
              <Form.Item name="ethnicity" label="Ethnicity" rules={[{ required: false }]}>
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
              
              <Form.Item name="occupation" label="Occupation" rules={[{ required: true }]}>
                <Input placeholder="e.g., Teacher, Engineer, Farmer" />
              </Form.Item>
              
              <Form.Item name="sectoralInformation" label="Sectoral Information" rules={[{ required: false }]}>
                <Select
                  placeholder="Select sectoral information"
                  options={SECTORAL_OPTIONS}
                  allowClear
                />
              </Form.Item>
              
              <Form.Item name="employmentStatus" label="Employment Status" rules={[{ required: false }]}>
                <Select
                  placeholder="Select employment status"
                  options={EMPLOYMENT_STATUS_OPTIONS}
                  allowClear
                />
              </Form.Item>
              
              <Form.Item name="registeredVoter" label="Registered Voter" rules={[{ required: false }]} valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
              
              <div className="form-row">
                <Form.Item name={["contact", "mobile"]} label="Mobile Number" rules={[{ type: "string" }]}>
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
                  <DatePicker 
                    className="w-full" 
                    disabledDate={current => current && current > new Date()}
                    placeholder="Select date of birth"
                  />
                </Form.Item>
                <Form.Item name="sex" label="Sex" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
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
              
              <Form.Item name="ethnicity" label="Ethnicity" rules={[{ required: false }]}>
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
              
              <Form.Item name="occupation" label="Occupation" rules={[{ required: true }]}>
                <Input placeholder="e.g., Teacher, Engineer, Farmer" />
              </Form.Item>
              
              <Form.Item name="sectoralInformation" label="Sectoral Information" rules={[{ required: false }]}>
                <Select
                  placeholder="Select sectoral information"
                  options={SECTORAL_OPTIONS}
                  allowClear
                />
              </Form.Item>
              
              <Form.Item name="employmentStatus" label="Employment Status" rules={[{ required: false }]}>
                <Select
                  placeholder="Select employment status"
                  options={EMPLOYMENT_STATUS_OPTIONS}
                  allowClear
                />
              </Form.Item>
              
              <Form.Item name="registeredVoter" label="Registered Voter" rules={[{ required: false }]} valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
              
              <div className="form-row">
                <Form.Item name={["contact", "mobile"]} label="Mobile Number" rules={[{ type: "string" }]}>
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
              <Descriptions.Item label="Sex">{viewResident.sex}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">{viewResident.dateOfBirth ? new Date(viewResident.dateOfBirth).toLocaleDateString() : ""}</Descriptions.Item>
              <Descriptions.Item label="Civil Status">{viewResident.civilStatus}</Descriptions.Item>
              <Descriptions.Item label="Birth Place">{viewResident.birthPlace}</Descriptions.Item>
              <Descriptions.Item label="Religion">{viewResident.religion || "-"}</Descriptions.Item>
              <Descriptions.Item label="Ethnicity">{viewResident.ethnicity}</Descriptions.Item>
              <Descriptions.Item label="Citizenship">{viewResident.citizenship}</Descriptions.Item>
              <Descriptions.Item label="Occupation">{viewResident.occupation}</Descriptions.Item>
              <Descriptions.Item label="Sectoral Information">{viewResident.sectoralInformation || "None"}</Descriptions.Item>
              <Descriptions.Item label="Employment Status">{viewResident.employmentStatus || "Not Specified"}</Descriptions.Item>
              <Descriptions.Item label="Registered Voter">{viewResident.registeredVoter ? "Yes" : "No"}</Descriptions.Item>
              {viewResident.contact?.mobile && (
                <Descriptions.Item label="Mobile Number">{viewResident.contact.mobile}</Descriptions.Item>
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