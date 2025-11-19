import React, { useEffect, useState, useMemo } from "react";
import { Table, Input, Button, Modal, Form, Select, message, Popconfirm, Descriptions, Checkbox, Alert } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { UserOutlined, FileExcelOutlined, FilterOutlined } from "@ant-design/icons";
import axios from "axios";
import * as XLSX from 'xlsx';

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

  // State for export Excel functionality
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportForm] = Form.useForm();
  const [exportHasData, setExportHasData] = useState(true);
  
  // Selection state for bulk operations
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Get user info from localStorage
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    fetchResidents();
    fetchHouseholds();
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Validate export data availability when modal opens
  useEffect(() => {
    if (!exportOpen) return;

    const validateExportData = () => {
      const formValues = exportForm.getFieldsValue();
      const { exportType, householdId, purok } = formValues;

      if (exportType === 'all') {
        setExportHasData(households.length > 0);
      } else if (exportType === 'purok' && purok) {
        const householdsInPurok = households.filter(h => h.address?.purok === purok);
        setExportHasData(householdsInPurok.length > 0);
      } else if (exportType === 'single' && householdId) {
        const household = households.find(h => h._id === householdId);
        setExportHasData(household && household.members && household.members.length > 0);
      } else {
        setExportHasData(true); // Default when no filter selected yet
      }
    };

    validateExportData();
  }, [exportOpen, households, exportForm]);

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
      console.log("Households response:", res.data);
      // Handle both array and object responses
      let data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      // Sort so the most recently added household appears first (assuming last in array is newest)
      data = [...data].reverse();
      setHouseholds(data);
      setCurrentPage(1); // Reset to first page when data is refreshed
    } catch (err) {
      console.error("Fetch households error:", err);
      message.error(err?.response?.data?.message || "Failed to load households");
      setHouseholds([]); // Set empty array on error
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
        hasBusiness: values.hasBusiness || false,
        businessType: values.businessType || null,
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
      hasBusiness: household.hasBusiness || false,
      businessType: household.businessType || null,
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
          purok: values.address?.purok,
        },
        hasBusiness: values.hasBusiness || false,
        businessType: values.businessType || null,
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
  
  // Bulk Delete Households
  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select households to delete");
      return;
    }

    try {
      // Delete households one by one
      await Promise.all(
        selectedRowKeys.map(id =>
          axios.delete(`${API_BASE}/api/admin/households/${id}`, { headers: authHeaders() })
        )
      );
      
      message.success(`${selectedRowKeys.length} household(s) deleted successfully!`);
      setSelectedRowKeys([]);
      fetchHouseholds();
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete selected households");
    }
  };

  // Row selection handlers
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const onSelectAll = (selected, selectedRows, changeRows) => {
    if (selected) {
      // Select ALL households that match the current filter (across all pages)
      const allKeys = filteredHouseholds.map(household => household._id);
      setSelectedRowKeys(allKeys);
      if (allKeys.length > 10) {
        message.info(`Selected ${allKeys.length} household(s) across all pages`);
      }
    } else {
      // Deselect all
      setSelectedRowKeys([]);
    }
  };


  // Manual select all function for button
  const [selectAllClicked, setSelectAllClicked] = useState(false);
  const handleSelectAll = () => {
    const allKeys = filteredHouseholds.map(household => household._id);
    setSelectedRowKeys(allKeys);
    setSelectAllClicked(true);
    message.success(`Selected all ${allKeys.length} household(s) across all pages`);
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedRowKeys([]);
    setSelectAllClicked(false);
    message.info("Cleared all selections");
  };

  // Pagination change handler
  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
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

  // Export to Excel
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const values = await exportForm.validateFields();
      const { exportType, householdId, purok } = values;

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

      // Determine which households to export
      let householdsToExport = [];
      if (exportType === 'single') {
        const household = households.find(h => h._id === householdId);
        if (!household) {
          message.error('Selected household not found');
          return;
        }
        householdsToExport = [household];
      } else if (exportType === 'purok') {
        householdsToExport = households.filter(h => h.address?.purok === purok);
        if (householdsToExport.length === 0) {
          message.warning(`No households found in ${purok}`);
          return;
        }
      } else {
        householdsToExport = households;
      }

      // Flatten household members into individual rows with resident details
      const exportData = [];
      
      householdsToExport.forEach(household => {
        const headId = household.headOfHousehold?._id || household.headOfHousehold;
        
        (household.members || []).forEach(m => {
          const memberId = m?._id || m;
          const resident = typeof m === "object" ? m : residents.find(r => r._id === memberId);
          
          if (resident) {
            // Combine sectoral information and employment status
            const sectoralInfo = [];
            if (resident.sectoralInformation && resident.sectoralInformation !== 'None') {
              sectoralInfo.push(resident.sectoralInformation);
            }
            if (resident.employmentStatus) {
              sectoralInfo.push(resident.employmentStatus);
            }
            
            exportData.push({
              'HOUSEHOLD ID': household.householdId || 'N/A',
              'PUROK': household.address?.purok || 'N/A',
              'ROLE': String(memberId) === String(headId) ? 'Head of Household' : 'Member',
              'LAST NAME': (resident.lastName || '').toUpperCase(),
              'FIRST NAME': (resident.firstName || '').toUpperCase(),
              'MIDDLE NAME': (resident.middleName || '').toUpperCase(),
              'EXT': (resident.suffix || '').toUpperCase(),
              'PLACE OF BIRTH': resident.birthPlace || '',
              'DATE OF BIRTH': resident.dateOfBirth ? new Date(resident.dateOfBirth).toISOString().split('T')[0] : '',
              'AGE': calculateAge(resident.dateOfBirth),
              'SEX': resident.sex ? resident.sex.charAt(0).toUpperCase() + resident.sex.slice(1) : '',
              'CIVIL STATUS': resident.civilStatus ? resident.civilStatus.charAt(0).toUpperCase() + resident.civilStatus.slice(1) : '',
              'CITIZENSHIP': resident.citizenship || '',
              'OCCUPATION': resident.occupation || '',
              'SEC. INFO': sectoralInfo.join(', ') || 'None',
            });
          }
        });
      });

      if (exportData.length === 0) {
        message.warning('No household member data available for export');
        return;
      }

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-fit columns
      const colWidths = [
        { wch: 15 }, // HOUSEHOLD ID
        { wch: 10 }, // PUROK
        { wch: 18 }, // ROLE
        { wch: 15 }, // LAST NAME
        { wch: 15 }, // FIRST NAME
        { wch: 15 }, // MIDDLE NAME
        { wch: 8 },  // EXT
        { wch: 20 }, // PLACE OF BIRTH
        { wch: 15 }, // DATE OF BIRTH
        { wch: 5 },  // AGE
        { wch: 10 }, // SEX
        { wch: 15 }, // CIVIL STATUS
        { wch: 15 }, // CITIZENSHIP
        { wch: 20 }, // OCCUPATION
        { wch: 25 }, // SEC. INFO
      ];
      
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Household Members');
      
      // Generate filename with current date
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      let filename;
      if (exportType === 'single') {
        const household = householdsToExport[0];
        filename = `Household_${household.householdId}_Members_${dateStr}.xlsx`;
      } else if (exportType === 'purok') {
        filename = `${purok.replace(' ', '_')}_Households_Members_${dateStr}.xlsx`;
      } else {
        filename = `All_Households_Members_${dateStr}.xlsx`;
      }
      
      XLSX.writeFile(wb, filename);
      
      message.success('Household members exported to Excel successfully!');
      setExportOpen(false);
      exportForm.resetFields();
    } catch (error) {
      if (error.errorFields) {
        // Form validation error, don't show additional message
        return;
      }
      console.error('Export error:', error);
      message.error('Failed to export household members to Excel');
    } finally {
      setExporting(false);
    }
  };

  // Statistics
  const totalHouseholds = households.length;
  const totalMembers = households.reduce((acc, h) => acc + (h.members?.length || 0), 0);
  const avgHouseholdSize = totalHouseholds > 0 ? (totalMembers / totalHouseholds).toFixed(1) : 0;
  const singleMemberHouseholds = households.filter(h => h.members?.length === 1).length;
  const familyHouseholds = households.filter(h => h.members?.length > 1).length;

  // Purok Statistics
  const purok1Count = Array.isArray(households) ? households.filter(h => h.address?.purok === "Purok 1").length : 0;
  const purok2Count = Array.isArray(households) ? households.filter(h => h.address?.purok === "Purok 2").length : 0;
  const purok3Count = Array.isArray(households) ? households.filter(h => h.address?.purok === "Purok 3").length : 0;
  const purok4Count = Array.isArray(households) ? households.filter(h => h.address?.purok === "Purok 4").length : 0;
  const purok5Count = Array.isArray(households) ? households.filter(h => h.address?.purok === "Purok 5").length : 0;

  const fullName = (p) => [p?.firstName, p?.middleName, p?.lastName, p?.suffix].filter(Boolean).join(" ");

  // Function to render household members
  const renderHouseholdMembers = (record) => {
    // Show ALL members (including head)
    const headId = record.headOfHousehold?._id || record.headOfHousehold;
    const membersList = record.members || [];
    
    if (membersList.length === 0) {
      return (
        <div className="p-2 italic text-gray-500">No members in this household</div>
      );
    }

    return (
      <div className="p-2 bg-gray-50 rounded">
        <div className="font-medium mb-2 text-gray-700">Household Members ({membersList.length}):</div>
        <ul className="list-disc pl-5">
          {membersList.map(m => {
            const memberId = m?._id || m;
            // Get resident details
            const memberObj = typeof m === "object" ? m : residents.find(r => r._id === memberId);
            const isHead = String(memberId) === String(headId);
            
            return (
              <li key={memberId} className="py-1">
                {fullName(memberObj) || "Unknown Member"}
                {isHead && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    Head
                  </span>
                )}
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
      title: "Members Count",
      key: "membersCount",
      render: (_, record) => record.members?.length || 0,
    },
    {
      title: "Purok",
      dataIndex: ["address", "purok"],
      key: "purok",
      filters: [
        { text: "Purok 1", value: "Purok 1" },
        { text: "Purok 2", value: "Purok 2" },
        { text: "Purok 3", value: "Purok 3" },
        { text: "Purok 4", value: "Purok 4" },
        { text: "Purok 5", value: "Purok 5" },
      ],
      onFilter: (value, record) => record.address?.purok === value,
    },
    {
      title: "Business Status",
      key: "businessStatus",
      render: (_, record) => {
        if (record.hasBusiness) {
          return (
            <div className="flex flex-col">
              <span className="text-green-600 font-medium">With Business</span>
              {record.businessType && (
                <span className="text-gray-500 text-xs">{record.businessType}</span>
              )}
            </div>
          );
        }
        return <span className="text-gray-500">No Business</span>;
      },
      filters: [
        { text: "With Business", value: true },
        { text: "No Business", value: false },
      ],
      onFilter: (value, record) => record.hasBusiness === value,
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
            okText="Delete"
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
    label: `${r.firstName} ${r.middleName || ''} ${r.lastName}${r.suffix ? ' ' + r.suffix : ''}`,
    value: r._id,
  }));

  // Filtered for table search
  const filteredHouseholds = (Array.isArray(households) ? households : []).filter(h =>
    [
      h.householdId,
      h.address?.purok,
      h.address?.barangay,
      h.address?.municipality,
      h.address?.province,
      // Head of Household
      h.headOfHousehold?.firstName,
      h.headOfHousehold?.middleName,
      h.headOfHousehold?.lastName,
      h.headOfHousehold?.suffix,
      // Members
      ...(Array.isArray(h.members) ? h.members.map(m => [m?.firstName, m?.middleName, m?.lastName, m?.suffix]).flat() : []),
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
    () => availableResidentsForAdd.map(r => ({ label: `${r.firstName} ${r.middleName || ""} ${r.lastName}${r.suffix ? ' ' + r.suffix : ''}`, value: r._id })),
    [availableResidentsForAdd]
  );
  const addMemberOptions = useMemo(
    () =>
      availableResidentsForAdd
        .filter(r => String(r._id) !== String(addHeadValue || "")) // exclude selected head
        .map(r => ({ label: `${r.firstName} ${r.middleName || ""} ${r.lastName}${r.suffix ? ' ' + r.suffix : ''}`, value: r._id })),
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
    () => availableResidentsForEdit.map(r => ({ label: `${r.firstName} ${r.middleName || ""} ${r.lastName}${r.suffix ? ' ' + r.suffix : ''}`, value: r._id })),
    [availableResidentsForEdit]
  );
  const editMemberOptions = useMemo(
    () =>
      availableResidentsForEdit
        .filter(r => String(r._id) !== String(editHeadValue || "")) // exclude selected head
        .map(r => ({ label: `${r.firstName} ${r.middleName || ""} ${r.lastName}${r.suffix ? ' ' + r.suffix : ''}`, value: r._id })),
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

            {/* Second Row: Purok Statistics */}
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
            <div className="flex flex-wrap gap-2">
              <Input.Search
                allowClear
                placeholder="Search for Households"
                onSearch={v => setSearch(v.trim())}
                value={search}
                onChange={e => setSearch(e.target.value)}
                enterButton
                className="w-full sm:min-w-[350px] md:min-w-[500spx] max-w-full"
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
                + Add Household
              </Button>
              <Button 
                onClick={() => setExportOpen(true)}
              >
                Export Excel
              </Button>

              {!selectAllClicked && (
                <Button 
                  onClick={handleSelectAll}
                >
                  Select All ({filteredHouseholds.length})
                </Button>
              )}

              {selectedRowKeys.length > 0 && (
                <>
                  <Button onClick={handleClearSelection}>
                    Undo Selection
                  </Button>
                  <Popconfirm
                    title={`Delete ${selectedRowKeys.length} household(s)?`}
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
              dataSource={filteredHouseholds}
              columns={columns}
              rowSelection={{
                selectedRowKeys,
                onChange: onSelectChange,
                onSelectAll: onSelectAll,
                type: 'checkbox',
                getCheckboxProps: (record) => ({
                  name: record.householdId,
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
                current: currentPage,
                pageSize: pageSize,
                total: filteredHouseholds.length,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} residents | Selected: ${selectedRowKeys.length}`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              onChange={handleTableChange}
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
          <Alert
            message="Create New Household"
            description="Select a head of household and add household members. Only residents not yet assigned to any household will appear in the lists. You can also include business information if applicable."
            type="info"
            showIcon
            className="mb-4"
          />
          <div style={{ marginBottom: 16 }} />
          <Form form={addForm} layout="vertical">
            {/* Head of Household (only unassigned residents) */}
            <Form.Item name="headOfHousehold" label="Head of Household" rules={[{ required: true, message: 'Please select the head of household' }]}>
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
            <Form.Item name="members" label="Household Members" rules={[{ required: true, message: 'Please select at least one member' }]}>
              <Select
                mode="multiple"
                options={addMemberOptions}
                showSearch
                optionFilterProp="label"
                placeholder="Select household members"
                disabled={addOnlyMe}
              />
            </Form.Item>

            <Form.Item name={["address", "purok"]} label="Purok" rules={[{ required: true, message: 'Please select the purok' }]}>
              <Select
                options={[
                  { value: "Purok 1", label: "Purok 1" },
                  { value: "Purok 2", label: "Purok 2" },
                  { value: "Purok 3", label: "Purok 3" },
                  { value: "Purok 4", label: "Purok 4" },
                  { value: "Purok 5", label: "Purok 5" },
                ]}
                placeholder="Select purok number"
              />
            </Form.Item>

            {/* Business Status Fields */}
            <Form.Item name="hasBusiness" label="Business Status" valuePropName="checked">
              <Checkbox>This household has a business</Checkbox>
            </Form.Item>

            <Form.Item
              name="businessType"
              label="Business Type"
              rules={[
                {
                  required: Form.useWatch('hasBusiness', addForm),
                  message: 'Please specify the business type'
                }
              ]}
            >
              <Input
                placeholder="e.g., Sari-Sari store, Restaurant, etc."
                disabled={!Form.useWatch('hasBusiness', addForm)}
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
          <Alert
            message="Edit Household Information"
            description="Update the household head, members, address, and business details. You can reassign members between households or mark a household as having only the head with no additional members."
            type="info"
            showIcon
            className="mb-4"
          />
          <div style={{ marginBottom: 16 }} />
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

            {/* Business Status Fields */}
            <Form.Item name="hasBusiness" label="Business Status" valuePropName="checked">
              <Checkbox>This household has a business</Checkbox>
            </Form.Item>

            <Form.Item
              name="businessType"
              label="Business Type"
              rules={[
                {
                  required: Form.useWatch('hasBusiness', editForm),
                  message: 'Please specify the business type'
                }
              ]}
            >
              <Input
                placeholder="e.g., Sari-sari store, Restaurant, etc."
                disabled={!Form.useWatch('hasBusiness', editForm)}
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
              <Descriptions.Item label="Business Status">
                {viewHousehold.hasBusiness ? (
                  <div>
                    <span className="text-green-600 font-medium">With Business</span>
                    {viewHousehold.businessType && (
                      <div className="text-gray-600 mt-1">
                        Type: {viewHousehold.businessType}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-500">No Business</span>
                )}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        {/* Export Options Modal */}
        <Modal
          title="Export Household Members"
          open={exportOpen}
          onCancel={() => {
            setExportOpen(false);
            exportForm.resetFields();
            setExportHasData(true);
          }}
          onOk={exportToExcel}
          confirmLoading={exporting}
          okText="Export"
          okButtonProps={{ disabled: !exportHasData }}
          width={500}
        >
          <Form form={exportForm} layout="vertical">
            <Form.Item
              name="exportType"
              label="Export Type"
              rules={[{ required: true, message: 'Please select export type' }]}
              initialValue="all"
            >
              <Select
                options={[
                  { value: 'all', label: 'All Households with Members' },
                  { value: 'purok', label: 'By Purok' },
                  { value: 'single', label: 'Single Household' },
                ]}
                onChange={(value) => {
                  if (value === 'all') {
                    exportForm.setFieldsValue({ householdId: undefined, purok: undefined });
                    setExportHasData(households.length > 0);
                  } else if (value === 'purok') {
                    exportForm.setFieldsValue({ householdId: undefined });
                    setExportHasData(true); // Will be validated when purok is selected
                  } else if (value === 'single') {
                    exportForm.setFieldsValue({ purok: undefined });
                    setExportHasData(true); // Will be validated when household is selected
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => 
                prevValues.exportType !== currentValues.exportType
              }
            >
              {({ getFieldValue }) => {
                const exportType = getFieldValue('exportType');
                
                if (exportType === 'purok') {
                  return (
                    <Form.Item
                      name="purok"
                      label="Select Purok"
                      rules={[{ required: true, message: 'Please select a purok' }]}
                    >
                      <Select
                        placeholder="Select a purok"
                        onChange={(selectedPurok) => {
                          const householdsInPurok = households.filter(h => h.address?.purok === selectedPurok);
                          setExportHasData(householdsInPurok.length > 0);
                        }}
                        options={[
                          { value: 'Purok 1', label: 'Purok 1' },
                          { value: 'Purok 2', label: 'Purok 2' },
                          { value: 'Purok 3', label: 'Purok 3' },
                          { value: 'Purok 4', label: 'Purok 4' },
                          { value: 'Purok 5', label: 'Purok 5' },
                        ]}
                      />
                    </Form.Item>
                  );
                }
                
                if (exportType === 'single') {
                  return (
                    <Form.Item
                      name="householdId"
                      label="Select Household"
                      rules={[{ required: true, message: 'Please select a household' }]}
                    >
                      <Select
                        showSearch
                        placeholder="Select a household"
                        optionFilterProp="label"
                        onChange={(selectedId) => {
                          const household = households.find(h => h._id === selectedId);
                          setExportHasData(household && household.members && household.members.length > 0);
                        }}
                        options={households.map(h => {
                          const head = typeof h.headOfHousehold === "object"
                            ? h.headOfHousehold
                            : residents.find(r => r._id === h.headOfHousehold);
                          const headName = fullName(head) || 'Unknown';
                          return {
                            value: h._id,
                            label: `${h.householdId} - ${headName} (${h.address?.purok || 'N/A'})`,
                          };
                        })}
                      />
                    </Form.Item>
                  );
                }
                
                return null;
              }}
            </Form.Item>

            {!exportHasData && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 mb-3">
                <p className="font-semibold">No data matches the selected filters</p>
                <p className="text-xs mt-1">Please adjust your filter criteria to export data.</p>
              </div>
            )}

            <div className="text-sm text-gray-500 mt-2">
              <strong>Export Format:</strong>
              <ul className="list-disc ml-5 mt-2">
                <li>Household ID, Purok, Role</li>
                <li>Personal Information (Last Name, First Name, Middle Name, Suffix)</li>
                <li>Place of Birth, Date of Birth, Age</li>
                <li>Sex, Civil Status, Citizenship</li>
                <li>Occupation, Sectoral Information</li>
              </ul>
              
              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) => {
                  const exportType = getFieldValue('exportType');
                  const selectedPurok = getFieldValue('purok');
                  
                  if (exportType === 'purok' && selectedPurok) {
                    const purokHouseholds = households.filter(h => h.address?.purok === selectedPurok);
                    const totalMembers = purokHouseholds.reduce((acc, h) => acc + (h.members?.length || 0), 0);
                    
                    return (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <strong className="text-blue-800">Selected Purok Summary:</strong>
                        <div className="text-sm mt-1">
                          <div>Households: {purokHouseholds.length}</div>
                          <div>Total Members: {totalMembers}</div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (exportType === 'all') {
                    const totalMembers = households.reduce((acc, h) => acc + (h.members?.length || 0), 0);
                    return (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <strong className="text-blue-800">All Households Summary:</strong>
                        <div className="text-sm mt-1">
                          <div>Total Households: {households.length}</div>
                          <div>Total Members: {totalMembers}</div>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                }}
              </Form.Item>
            </div>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
