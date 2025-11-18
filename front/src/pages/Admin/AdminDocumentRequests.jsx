import React, { useEffect, useState } from "react";
import { Table, Input, InputNumber, Button, Modal, Descriptions, Tag, Select, message, Form, Popconfirm, Alert } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { UserOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import { DatePicker } from "antd";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminDocumentRequests() {

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Pagination change handler
  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [residents, setResidents] = useState([]);
  const [filteredHouseholdMembers, setFilteredHouseholdMembers] = useState([]); // For Document For dropdown
  // Households and payment gating state
  const [households, setHouseholds] = useState([]);
  const [paymentsCheckLoading, setPaymentsCheckLoading] = useState(false);
  const [unpaidMonths, setUnpaidMonths] = useState({ garbage: [], streetlight: [] });
  const [blockCreate, setBlockCreate] = useState(false);
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  // Accept modal for Business Clearance amount
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptRecord, setAcceptRecord] = useState(null);
  const [acceptForm] = Form.useForm();
  const [deletingId, setDeletingId] = useState(null);

  const [createForm] = Form.useForm();
  const selectedCreateDocType = Form.useWatch("documentType", createForm); // NEW
  const selectedRequestFor = Form.useWatch("requestFor", createForm); // Person document is for

  // Export state
  const [exportOpen, setExportOpen] = useState(false);
    // Officials (for captain name on templates)
    const [captainName, setCaptainName] = useState(null);

  const [exportForm] = Form.useForm();
  const exportRangeType = Form.useWatch("rangeType", exportForm) || "month";
  const [exportHasData, setExportHasData] = useState(true);

  // Dynamic settings for document fees
  const [settings, setSettings] = useState(null);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('documentRequestColumnsVisibility');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      residentName: true,
      civilStatus: true,
      purok: true,
      totalRequests: true,
      statusSummary: true,
    };
  });

  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('documentRequestColumnsVisibility', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const userProfile =JSON.parse(localStorage.getItem("userProfile")) || {};
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    fetchRequests();
    fetchResidents();
    fetchHouseholds();
    fetchCaptain();
    // Fetch settings (admin endpoint)
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSettings(res.data || null);
      } catch (_) {}
    })();
  }, []);

  // Validate export data availability when modal opens
  useEffect(() => {
    if (!exportOpen) return;

    const validateExportData = () => {
      const formValues = exportForm.getFieldsValue();
      const { docTypeFilter, purokFilter } = formValues;

      let filtered = requests;
      if (docTypeFilter && docTypeFilter !== 'all') {
        filtered = filtered.filter(r => r.documentType === docTypeFilter);
      }
      if (purokFilter && purokFilter !== 'all') {
        filtered = filtered.filter(r => r.requestedBy?.address?.purok === purokFilter);
      }

      setExportHasData(filtered.length > 0);
    };

    validateExportData();
  }, [exportOpen, requests, exportForm]);

  // Helper: newest first
  const sortByNewest = (arr) =>
    [...arr].sort(
      (a, b) =>
        new Date(b.requestedAt || b.updatedAt || b.createdAt || 0) -
        new Date(a.requestedAt || a.updatedAt || a.createdAt || 0)
    );

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/document-requests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRequests(sortByNewest(res.data)); // sort here
    } catch (error) {
      console.error("Error fetching document requests:", error);
      message.error("Failed to load document requests.");
    }
    setLoading(false);
  };

  const fetchResidents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/residents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResidents(res.data);
    } catch {
      message.error("Failed to load residents");
    }
  };

  // Fetch households for resident->household mapping
  const fetchHouseholds = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/households`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHouseholds(res.data || []);
    } catch (err) {
      console.error("Failed to load households", err);
    }
  };

  // Fetch Barangay Captain full name from officials list
  const fetchCaptain = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/officials`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const officials = Array.isArray(res.data) ? res.data : [];
      // Prefer active captain; fallback to any with that position
      const isCaptain = (o) => String(o?.position || '').toLowerCase() === 'barangay captain';
      const activeCaptain = officials.find(o => isCaptain(o) && o.isActive);
      const anyCaptain = activeCaptain || officials.find(isCaptain);
      if (anyCaptain) {
        setCaptainName(anyCaptain.fullName || anyCaptain.name || null);
      }
    } catch (err) {
      // Non-fatal: printing will still work, tokens will be blank
      console.warn('Failed to fetch officials for captain name:', err?.message || err);
    }
  };

  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === "pending").length;
  const approvedRequests = requests.filter(r => r.status === "accepted").length;
  const rejectedRequests = requests.filter(r => r.status === "declined").length;
  const releasedRequests = requests.filter(r => r.status === "completed").length;

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/document-requests/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRequests(prev => prev.filter(r => r._id !== id));
      message.success("Request deleted.");
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete request");
    }
  };

  const handleDeleteAllRequests = async (record) => {
    try {
      setDeletingId(record.__rowKey);
      const token = localStorage.getItem("token");
      
      let successCount = 0;
      let failCount = 0;

      // Delete each request individually
      for (const request of record.requests) {
        try {
          await axios.delete(
            `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/document-requests/${request._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          successCount++;
        } catch (error) {
          console.error('Error deleting request:', request, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        message.success(`Successfully deleted ${successCount} request(s) for ${record.residentName}${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        fetchRequests();
      } else {
        message.error('Failed to delete any requests');
      }
    } catch (error) {
      console.error('Delete all requests error:', error);
      message.error('Failed to delete requests');
    } finally {
      setDeletingId(null);
    }
  };

  const allColumns = [
    {
      title: "Resident Name",
      key: "residentName",
      columnKey: "residentName",
      render: (text, record) => (
        <span className="font-semibold">{record.residentName}</span>
      )
    },
    {
      title: "Civil Status",
      key: "civilStatus",
      columnKey: "civilStatus",
      render: (_, record) => record.civilStatus || "-"
    },
    {
      title: "Purok",
      key: "purok",
      columnKey: "purok",
      render: (_, record) => record.purok || "-"
    },
    {
      title: "Total Requests",
      dataIndex: "totalRequests",
      key: "totalRequests",
      columnKey: "totalRequests",
      width: 120,
      render: (count) => (
        <Tag color="blue">{count} request{count !== 1 ? 's' : ''}</Tag>
      )
    },
    {
      title: "Status Summary",
      key: "statusSummary",
      columnKey: "statusSummary",
      render: (_, record) => (
        <div className="flex gap-1 flex-wrap">
          {record.pendingCount > 0 && <Tag color="orange">{record.pendingCount} Pending</Tag>}
          {record.acceptedCount > 0 && <Tag color="green">{record.acceptedCount} Accepted</Tag>}
          {record.declinedCount > 0 && <Tag color="red">{record.declinedCount} Declined</Tag>}
          {record.completedCount > 0 && <Tag color="blue">{record.completedCount} Completed</Tag>}
        </div>
      )
    },
    {
      title: "Actions",
      key: "actions",
      columnKey: "actions",
      width: 200,
      render: (_, record) => (
        <div className="flex gap-2">
          <span className="text-gray-500 text-xs">Expand to see details</span>
          {record.residentName !== 'Unknown Resident' && (
            <Popconfirm
              title="Delete All Requests"
              description={`Do you want to delete all ${record.totalRequests} request(s) for ${record.residentName}?`}
              onConfirm={() => handleDeleteAllRequests(record)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deletingId === record.__rowKey}
              >
                Delete All
              </Button>
            </Popconfirm>
          )}
        </div>
      )
    }
  ];

  // Expanded row columns (individual requests)
  const expandedColumns = [
    {
      title: "Requested By",
      key: "requestedBy",
      render: (_, r) =>
        r.requestedBy
          ? [r.requestedBy.firstName, r.requestedBy.middleName, r.requestedBy.lastName].filter(Boolean).join(" ")
          : "-",
    },
    {
      title: "Document Type",
      dataIndex: "documentType",
      key: "documentType",
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      width: 70,
      render: (v) => Number(v || 1)
    },
    {
      title: "Purpose",
      dataIndex: "purpose",
      key: "purpose",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: v => {
        let color = "default";
        if (v === "pending") color = "orange";
        else if (v === "accepted") color = "green";
        else if (v === "declined") color = "red";
        else if (v === "completed") color = "blue";
        return <Tag color={color} className="capitalize">{v}</Tag>;
      },
    },
    {
      title: "Requested At",
      dataIndex: "requestedAt",
      key: "requestedAt",
      render: v => (v ? new Date(v).toLocaleString() : ""),
      sorter: (a, b) =>
        new Date(a.requestedAt || 0) - new Date(b.requestedAt || 0),
      defaultSortOrder: "descend",
      sortDirections: ["descend", "ascend"],
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => { openView(r); }}>View Details</Button>
          {r.status !== 'declined' && r.status !== 'pending' && (
            <Button size="small" onClick={() => handlePrint(r)}>Print</Button>
          )}
          {r.status === "pending" && (
            <>
              <Button size="small" type="primary" onClick={() => {
                if (r.documentType === 'Business Clearance') {
                  setAcceptRecord(r);
                  acceptForm.setFieldsValue({ amount: r.feeAmount || undefined });
                  setAcceptOpen(true);
                } else {
                  handleAction(r._id, 'accept');
                }
              }}>Accept</Button>
              <Popconfirm
                title="Reject this request?"
                description="This action cannot be undone."
                okText="Reject"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                onConfirm={() => handleAction(r._id, 'decline')}
              >
                <Button size="small" danger>Decline</Button>
              </Popconfirm>
            </>
          )}
          {r.status === "accepted" && (
            <Button size="small" type="default" onClick={() => handleAction(r._id, 'complete')}>Mark as Completed</Button>
          )}
          <Popconfirm
            title="Delete this request?"
            description="This action cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r._id)}
          >
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </div>
      ),
    }
  ];

  // Filter columns based on visibility
  // Show columns by default unless explicitly set to false; keeps Actions visible even if not in the toggle list
  const columns = allColumns.filter(col => {
    const key = col.columnKey;
    if (key === 'actions') return true; // always show actions
    const v = visibleColumns[key];
    return v !== false; // hide only when explicitly false
  });

  const sortedRequests = sortByNewest(requests);
  const filteredRequests = sortedRequests.filter(r =>
    [
      // Requested By (person who made the request)
      r.requestedBy?.firstName,
      r.requestedBy?.middleName,
      r.requestedBy?.lastName,
      r.requestedBy?.suffix,
      // Request For (person the document is for)
      r.requestFor?.firstName,
      r.requestFor?.middleName,
      r.requestFor?.lastName,
      r.requestFor?.suffix,
      // Fallback to residentId if requestFor not available
      r.residentId?.firstName,
      r.residentId?.middleName,
      r.residentId?.lastName,
      r.residentId?.suffix,
      r.documentType,
      r.purpose,
      r.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Group requests by resident for expandable table
  const groupedRequests = filteredRequests.reduce((acc, request) => {
    // Try to get the most complete resident data
    const person = request.requestFor || request.residentId || request.requestedBy;
    const residentKey = person
      ? [person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(" ")
      : 'Unknown Resident';
    
    if (!acc[residentKey]) {
      // Find the latest resident data from residents array to get updated information
      const latestResidentData = residents.find(r => r._id === person?._id) || person;
      
      acc[residentKey] = {
        residentName: residentKey,
        residentData: latestResidentData,
        civilStatus: latestResidentData?.civilStatus || '-',
        purok: latestResidentData?.address?.purok || '-',
        requests: [],
        totalRequests: 0,
        pendingCount: 0,
        acceptedCount: 0,
        declinedCount: 0,
        completedCount: 0,
        __rowKey: `grouped_${residentKey.replace(/\s+/g, '_')}`
      };
    }
    
    acc[residentKey].requests.push(request);
    acc[residentKey].totalRequests += 1;
    if (request.status === 'pending') acc[residentKey].pendingCount += 1;
    if (request.status === 'accepted') acc[residentKey].acceptedCount += 1;
    if (request.status === 'declined') acc[residentKey].declinedCount += 1;
    if (request.status === 'completed') acc[residentKey].completedCount += 1;
    
    return acc;
  }, {});

  const groupedData = Object.values(groupedRequests);

  // Unique list of Puroks for export filtering
  const uniquePuroks = Array.from(
    new Set(
      [
        ...(residents || []).map((res) => res?.address?.purok).filter(Boolean),
        ...(requests || []).map((req) => req?.residentId?.address?.purok).filter(Boolean),
      ]
    )
  ).sort((a, b) => String(a).localeCompare(String(b)));

  // Helper: find the household that contains a given resident ID
  const findHouseholdByResident = (residentId) => {
    if (!residentId) return null;
    for (const h of households) {
      const headId = h?.headOfHousehold?._id || h?.headOfHousehold;
      if (String(headId) === String(residentId)) return h;
      const hasMember = (h?.members || []).some(m => String(m?._id || m) === String(residentId));
      if (hasMember) return h;
    }
    return null;
  };

  // When requestedBy changes, update Document For options
  useEffect(() => {
    if (!createOpen) return;
    const requestedById = createForm.getFieldValue('requestedBy');
    if (!requestedById) {
      setFilteredHouseholdMembers([]);
      createForm.setFieldsValue({ requestFor: undefined });
      return;
    }
    const household = findHouseholdByResident(requestedById);
    if (!household) {
      setFilteredHouseholdMembers([]);
      createForm.setFieldsValue({ requestFor: undefined });
      return;
    }
    // Get head and members as resident objects
    const allIds = [household.headOfHousehold, ...(household.members || [])].map(m => (typeof m === 'object' ? m._id : m));
    const allObjs = residents.filter(r => allIds.includes(r._id));
    setFilteredHouseholdMembers(allObjs);
    // If current requestFor is not in this household, reset it
    const currentRequestFor = createForm.getFieldValue('requestFor');
    if (!allIds.includes(currentRequestFor)) {
      createForm.setFieldsValue({ requestFor: undefined });
    }
  }, [households, residents, createOpen, createForm.getFieldValue('requestedBy')]);

  // Ensure Document For dropdown enables/disables reactively
  const [requestedById, setRequestedById] = useState();


  // Compute unpaid months for garbage and streetlight up to and including current month
  const computeUnpaidMonths = async (householdId) => {
    if (!householdId) {
      setUnpaidMonths({ garbage: [], streetlight: [] });
      setBlockCreate(false);
      return;
    }
    try {
      setPaymentsCheckLoading(true);
      const token = localStorage.getItem("token");
      const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const now = dayjs();
      const year = now.year();
      const currentMonthIdx = now.month() + 1; // 1..12
      const months = Array.from({ length: currentMonthIdx }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);

      // For each month, fetch both statuses
      const garbagePromises = months.map(m =>
        axios.get(`${API}/api/admin/households/${householdId}/garbage`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { month: m },
        }).then(res => ({ month: m, status: res.data?.status || "unpaid" }))
          .catch(() => ({ month: m, status: "unpaid" }))
      );
      const streetPromises = months.map(m =>
        axios.get(`${API}/api/admin/households/${householdId}/streetlight`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { month: m },
        }).then(res => ({ month: m, status: res.data?.status || "unpaid" }))
          .catch(() => ({ month: m, status: "unpaid" }))
      );

      const [garbageResults, streetResults] = await Promise.all([
        Promise.all(garbagePromises),
        Promise.all(streetPromises)
      ]);

      // Collect months that are not fully paid
      const garbageUnpaid = garbageResults
        .filter(r => r.status !== "paid")
        .map(r => ({ month: r.month, isCurrent: r.month === now.format("YYYY-MM") }));
      const streetUnpaid = streetResults
        .filter(r => r.status !== "paid")
        .map(r => ({ month: r.month, isCurrent: r.month === now.format("YYYY-MM") }));

      setUnpaidMonths({ garbage: garbageUnpaid, streetlight: streetUnpaid });
      // Block create if there exists any unpaid for current/past months in either
      const hasUnpaid = garbageUnpaid.length > 0 || streetUnpaid.length > 0;
      setBlockCreate(Boolean(hasUnpaid));
    } catch (err) {
      console.error("Error computing unpaid months", err);
      // Be safe: if we can't verify, block creation
      setBlockCreate(true);
    } finally {
      setPaymentsCheckLoading(false);
    }
  };

  // React when resident selection changes in create modal
  useEffect(() => {
    if (!createOpen) return; // only check when modal open
    // reset and recompute when resident changes
    setUnpaidMonths({ garbage: [], streetlight: [] });
    setBlockCreate(false);
    if (selectedRequestFor && households?.length) {
      const hh = findHouseholdByResident(selectedRequestFor);
      if (hh?._id) {
        computeUnpaidMonths(hh._id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRequestFor, households, createOpen]);

   const openView = (request) => {
    setViewRequest(request);
    setViewOpen(true);
   };

   async function loadFile(url) {
  const response = await fetch(url);
  return await response.arrayBuffer();
}

//eto mga files
const TEMPLATE_MAP = {
  "Barangay Certificate": "/BARANGAY CERTIFICATE.docx",
  "Certificate of Indigency": "/INDIGENCY.docx",
  "Barangay Clearance": "/BARANGAY CLEARANCE.docx",
  "Residency": "/CERTIFICATE OF RESIDENCY.docx",
  "Business Clearance": "/BUSINESS CLEARANCE.docx",
};

function getTemplatePath(docType) {
  return TEMPLATE_MAP[docType];
}

function ordinalSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

// Remove zero-padding for day numbers
function pad2(n) {
  return String(n);
}

// Derive pronouns from resident sex/gender
function resolveGender(resident) {
  const g = (resident?.sex || resident?.gender || resident?.genderIdentity || "").toString().toLowerCase();
  if (g.startsWith("m")) return "male";
  if (g.startsWith("f")) return "female";
  return "unknown";
}

function getPronouns(resident) {
  const g = resolveGender(resident);
  if (g === "female") {
    return { subject: "she", object: "her", possessive: "her", reflexive: "herself", honorific: "Ms." };
  }
  if (g === "male") {
    return { subject: "he", object: "him", possessive: "his", reflexive: "himself", honorific: "Mr." };
  }
  return { subject: "they", object: "them", possessive: "their", reflexive: "themselves", honorific: "" };
}

function capFirst(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
// Convert "st", "nd", "rd", "th" into real Unicode superscript
function toSuperscript(suffix) {
  return suffix
    .replace("st", "ˢᵗ")
    .replace("nd", "ⁿᵈ")
    .replace("rd", "ʳᵈ")
    .replace("th", "ᵗʰ");
}

function buildTemplateData(docType, record) {
  const r = record.requestFor || record.residentId || {};
  const fullName = [r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(" ") || "-";
  const requestedAt = record.requestedAt ? new Date(record.requestedAt) : new Date();

const dayNum = requestedAt.getDate();

// Generate normal suffix first (st, nd, rd, th)
const suffixRaw = ordinalSuffix(dayNum);

// Convert to Unicode superscript
const suffix = toSuperscript(suffixRaw);
                           // <--- ADD
  const monthLong = requestedAt.toLocaleString("en-US", { month: "long" });
  const yearStr = String(requestedAt.getFullYear());

  const barangay = r.address?.barangay || "Barangay La Torre North";
  const municipality = r.address?.municipality || "Bayombong";
  const province = r.address?.province || "Nueva Vizcaya";
  const locationLine = [barangay, municipality, province].filter(Boolean).join(", ");

  const p = getPronouns(r);

  const common = {
    name: fullName,
    civilStatus: r.civilStatus || "-",
    purok: r.address?.purok || "-",
    purpose: record.purpose || "-",
    docType: record.documentType || "-",

    // DATE FIELDS
    day: dayNum,               // normal number, e.g., 21
    suffix,                    // the superscript token (make THIS superscript in .docx)
    dayOrdinal: `${dayNum}${suffix}`, // optional combined

    month: monthLong,
    year: yearStr,
    issuedLine: `ISSUED this ${dayNum}${suffix} day of ${monthLong}, ${yearStr} at ${locationLine}.`,
    location: locationLine,

    // pronouns...
    heShe: p.subject,
    himHer: p.object,
    hisHer: p.possessive,
    himselfHerself: p.reflexive,
    honorific: p.honorific,
    HE_SHE: p.subject,
    HIM_HER: p.object,
    HIS_HER: p.possessive,
    HIMSELF_HERSELF: p.reflexive,
    HONORIFIC: p.honorific,
    He_She: capFirst(p.subject),
    Him_Her: capFirst(p.object),
    His_Her: capFirst(p.possessive),
    Himself_Herself: capFirst(p.reflexive),
    Honorific: p.honorific,
    // Captain name tokens (populated later in handlePrint to include fetched value)
    captainName: '',
    barangayCaptain: '',
    BARANGAY_CAPTAIN: '',
    CAPTAIN_NAME: '',
    captain: '',
  };

  switch (docType) {
    case "Business Clearance":
      return { ...common, businessName: record.businessName || "-" };
    default:
      return common;
  }
}


// Keys to skip when uppercasing
const PRONOUN_KEYS = new Set([
  "heShe","himHer","hisHer","himselfHerself","honorific",
  "HE_SHE","HIM_HER","HIS_HER","HIMSELF_HERSELF","HONORIFIC",
  "He_She","Him_Her","His_Her","Himself_Herself","Honorific",
  "dayOrdinalMixed","issuedLineMixed", "dayOrdinal" // keep these mixed-case overrides
]);

// Uppercase all string values recursively, except keys in PRONOUN_KEYS
function toUpperDeep(value, skipKeys = PRONOUN_KEYS) {
  if (value == null) return value;
  if (typeof value === "string") return value.toUpperCase();
  if (Array.isArray(value)) return value.map(v => toUpperDeep(v, skipKeys));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = skipKeys.has(k) ? v : toUpperDeep(v, skipKeys);
    }
    return out;
  }
  return value;
}

const handlePrint = async (record) => {
    if (record.status === 'declined') {
      message.error('Cannot print a declined request.');
      return;
    }
  const templatePath = getTemplatePath(record.documentType);
  if (!templatePath) {
    message.error(`No template mapped for "${record.documentType}".`);
    return;
  }
  if (record.documentType === "Business Clearance" && !record.businessName) {
    message.error("Business name is required to print Business Clearance.");
    return;
  }

  const raw = buildTemplateData(record.documentType, record);
  // Ensure captain fetched; if not yet available, try once synchronously
  if (!captainName) {
    try { await fetchCaptain(); } catch (_) { /* ignore */ }
  }
  const captainFullName = captainName || '';
  // Inject captain name variants to match possible template tokens
  raw.captainName = captainFullName;
  raw.barangayCaptain = captainFullName;
  raw.BARANGAY_CAPTAIN = captainFullName;
  raw.CAPTAIN_NAME = captainFullName;
  raw.captain = captainFullName;
  const data = toUpperDeep(raw); // pronoun keys are preserved by PRONOUN_KEYS

  // Keep mixed-case ordinal/issued line if you use them
  data.dayOrdinalMixed = raw.dayOrdinal;
  data.issuedLineMixed = raw.issuedLine;

  try {
    const content = await loadFile(templatePath);
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(data);
    const safeName = (data.name || "RESIDENT").replace(/\s+/g, "_");
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    saveAs(out, `${record.documentType.replace(/\s+/g, "_")}-${safeName}.docx`);
  } catch (err) {
    console.error("Docxtemplater error:", err.properties?.errors || err);
    message.error("Failed to generate document.");
  }
};

const handleAction = async (id, action) => {
  try {
    const token = localStorage.getItem("token");
    await axios.patch(
      `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/document-requests/${id}/${action}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setRequests(prev =>
      sortByNewest(
        prev.map(r =>
          r._id === id
            ? { ...r, status: action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'completed' }
            : r
        )
      )
    );
    message.success(`Request ${action === 'accept' ? 'approved' : action === 'decline' ? 'declined' : 'completed'}!`);
  } catch {
    message.error("Action failed");
  }
};

// Helpers for export
function formatResidentName(resident) {
  if (!resident) return "-";
  const parts = [resident.firstName, resident.middleName, resident.lastName, resident.suffix]
    .filter(Boolean);
  return parts.join(" ");
}

function getRange(rangeType, period) {
  const p = dayjs(period);
  if (rangeType === 'day') {
    return { start: p.startOf('day'), end: p.endOf('day') };
  }
  if (rangeType === 'week') {
    return { start: p.startOf('week'), end: p.endOf('week') };
  }
  // month default
  return { start: p.startOf('month'), end: p.endOf('month') };
}

function toCsv(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [];
  lines.push(headers.join(','));
  for (const row of rows) {
    lines.push(headers.map((h) => esc(row[h])).join(','));
  }
  return lines.join('\n');
}

const handleExport = async () => {
  try {
  const { rangeType, period, reportType, docTypeFilter, purokFilter } = await exportForm.validateFields();
      const { start, end } = getRange(rangeType, period);

      // Date range filter
      let filtered = requests.filter(r => {
        const t = dayjs(r.requestedAt).valueOf();
        return t >= start.valueOf() && t <= end.valueOf();
      });

      // Document type filter
      const docFilter = docTypeFilter || 'all';
      if (docFilter && docFilter !== 'all') {
        filtered = filtered.filter(r => r.documentType === docFilter);
      }

      // Purok filter
      const purokVal = purokFilter || 'all';
      if (purokVal && purokVal !== 'all') {
        filtered = filtered.filter(r => (r?.residentId?.address?.purok || '').toString() === purokVal.toString());
      }

      if (!filtered.length) {
        message.warning("No requests found for the selected filters.");
        return;
      }

      let rows = [];
      let filenamePrefix = 'DocumentRequests';

      if (reportType === 'top_requesters') {
        // Group by resident and count requests
        const counts = new Map();
        for (const r of filtered) {
          const id = r?.residentId?._id || r?.residentId || 'unknown';
          if (!id || id === 'unknown') continue; // skip records without resident
          const prev = counts.get(id) || { count: 0, resident: r.residentId };
          counts.set(id, { count: prev.count + 1, resident: prev.resident || r.residentId });
        }
        const ranked = Array.from(counts.entries())
          .map(([id, { count, resident }]) => ({ id, count, resident }))
          .sort((a, b) => b.count - a.count);

        rows = ranked.map((entry, idx) => ({
          Rank: idx + 1,
          Resident: formatResidentName(entry.resident),
          ResidentId: entry.id,
          Requests: entry.count,
          DocumentTypeFilter: docFilter,
          PurokFilter: purokVal,
        }));
        filenamePrefix = 'TopRequesters';
      } else {
        // Detailed rows
        rows = filtered.map(r => ({
          Resident: formatResidentName(r.residentId),
          CivilStatus: r.residentId?.civilStatus || "-",
          Purok: r.residentId?.address?.purok || "-",
          DocumentType: r.documentType,
          Purpose: r.purpose || "",
          BusinessName: r.documentType === "Business Clearance" ? (r.businessName || "") : "",
          RequestedAt: r.requestedAt ? dayjs(r.requestedAt).format("YYYY-MM-DD HH:mm") : "",
          UpdatedAt: r.updatedAt ? dayjs(r.updatedAt).format("YYYY-MM-DD HH:mm") : "",
        }));
      }

      const csv = toCsv(rows);
      const filenameBase =
        rangeType === "day"
          ? dayjs(period).format("YYYYMMDD")
          : rangeType === "week"
          ? `W${dayjs(period).format("GGGG-ww")}` // ISO week label
          : dayjs(period).format("YYYYMM");

      const docSlug = (docFilter || 'all').replace(/\s+/g, '_').toLowerCase();
      const purokSlug = (purokVal || 'all').toString().replace(/\s+/g, '_').toLowerCase();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `${filenamePrefix}-${docSlug}-${purokSlug}-${rangeType}-${filenameBase}.csv`);
      message.success("Export generated.");
      setExportOpen(false);
  } catch (e) {
    // validation or other errors
  }
};

  return (
    <AdminLayout>
    <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        {/* Navbar */}
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Document Requests
              </span>
            </div>
            
          </nav>
          {/* Statistics Section */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Requests
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {totalRequests}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {totalRequests}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Pending
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {pendingRequests}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {pendingRequests}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Approved
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {approvedRequests}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {approvedRequests}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Rejected
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {rejectedRequests}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {rejectedRequests}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Released
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {releasedRequests}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {releasedRequests}
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
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full md:w-auto">
              <div className="w-full sm:w-auto">
                <Input.Search
                  allowClear
                  placeholder="Search for Document Requests"
                  onSearch={v => setSearch(v.trim())}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  enterButton
                  className="w-full sm:min-w-[350px] md:min-w-[500px] max-w-full"
                />
              </div>
              {/* Customize Columns Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2 whitespace-nowrap">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="7" height="7" x="3" y="3" rx="1" />
                      <rect width="7" height="7" x="14" y="3" rx="1" />
                      <rect width="7" height="7" x="14" y="14" rx="1" />
                      <rect width="7" height="7" x="3" y="14" rx="1" />
                    </svg>
                    Customize Columns
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.civilStatus}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, civilStatus: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Civil Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.purok}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, purok: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Purok
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.totalRequests}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, totalRequests: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Total Requests
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.statusSummary}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, statusSummary: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Status Summary
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="primary" onClick={() => setCreateOpen(true)}>
                + Create Request Document
              </Button>
              <Button
                onClick={() => {
                  setExportOpen(true);
                  // initialize default export values
                  exportForm.setFieldsValue({ reportType: 'detailed', docTypeFilter: 'all', purokFilter: 'all', rangeType: "month", period: dayjs() });
                }}
              >
                Export as Excel
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="__rowKey"
              loading={loading}
              dataSource={groupedData}
              columns={columns}
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    columns={expandedColumns}
                    dataSource={record.requests}
                    pagination={{
                      defaultPageSize: 5,
                      showTotal: (total) => `Total ${total} requests`,
                      showSizeChanger: false,
                      showQuickJumper: false,
                      showLessItems: true,
                      itemRender: (page, type, originalElement) => {
                        if (type === 'prev') {
                          return originalElement;
                        }
                        if (type === 'next') {
                          return originalElement;
                        }
                        return null;
                      },
                    }}
                    rowKey="_id"
                    size="medium"
                    className="ml-8"
                  />
                ),
                rowExpandable: (record) => record.requests && record.requests.length > 0,
              }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: groupedData.length,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} residents | Total Requests: ${filteredRequests.length}`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
              onChange={handleTableChange}
              scroll={{ x: 800 }}
            />
          </div>
        </div>
        {/* View Request Modal */}
        <Modal
          title="Document Request Details"
          open={viewOpen}
          onCancel={() => setViewOpen(false)}
          footer={null}
          width={700}
        >
          {viewRequest && (
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Requested By">
                {viewRequest.requestedBy
                  ? [viewRequest.requestedBy.firstName, viewRequest.requestedBy.middleName, viewRequest.requestedBy.lastName, viewRequest.requestedBy.suffix].filter(Boolean).join(" ")
                  : (viewRequest.residentId
                    ? [viewRequest.residentId.firstName, viewRequest.residentId.middleName, viewRequest.residentId.lastName, viewRequest.residentId.suffix].filter(Boolean).join(" ")
                    : "-")}
              </Descriptions.Item>
              <Descriptions.Item label="Document For">
                {(() => {
                  const person = viewRequest.requestFor || viewRequest.residentId;
                  return person
                    ? [person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(" ")
                    : "-";
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Civil Status">
                {(() => {
                  const person = viewRequest.requestFor || viewRequest.residentId;
                  return person?.civilStatus || "-";
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Purok">
                {(() => {
                  const person = viewRequest.requestFor || viewRequest.residentId;
                  return person?.address?.purok || "-";
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Document Type">{viewRequest.documentType}</Descriptions.Item>
              <Descriptions.Item label="Purpose">{viewRequest.purpose}</Descriptions.Item>
              {viewRequest.documentType === "Business Clearance" && (
                <Descriptions.Item label="Business Name">{viewRequest.businessName || "-"}</Descriptions.Item>
              )}
              <Descriptions.Item label="Amount">
                {viewRequest.documentType === "Business Clearance" && (!viewRequest.amount || viewRequest.amount === 0)
                  ? "To be set by admin"
                  : viewRequest.amount !== undefined && viewRequest.amount !== null 
                  ? `₱${viewRequest.amount.toFixed(2)}` 
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {(() => {
                  let color = "default";
                  if (viewRequest.status === "pending") color = "orange";
                  else if (viewRequest.status === "accepted") color = "green";
                  else if (viewRequest.status === "declined") color = "red";
                  else if (viewRequest.status === "completed") color = "blue";
                  return <Tag color={color} className="capitalize">{viewRequest.status}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Requested At">{viewRequest.requestedAt ? new Date(viewRequest.requestedAt).toLocaleString() : ""}</Descriptions.Item>
              <Descriptions.Item label="Updated At">{viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString() : ""}</Descriptions.Item>
              <Descriptions.Item label="Blockchain Hash">{viewRequest.blockchain?.hash || "-"}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
        {/* Create Request Modal */}
        <Modal
          title="Create Document Request"
          open={createOpen}
          onCancel={() => { setCreateOpen(false); setShowUnpaidModal(false); setUnpaidMonths({ garbage: [], streetlight: [] }); setBlockCreate(false); createForm.resetFields(); }}
          onOk={async () => {
            try {
              setCreating(true);
              const values = await createForm.validateFields();
              
              // Calculate amount based on document type for admin requests
              const indigencyFee = settings?.documentFees?.indigency ?? 0;
              const clearanceFee = settings?.documentFees?.barangayClearance ?? 100;
              let amount = 0;
              if (values.documentType === 'Certificate of Indigency') amount = Number(indigencyFee) || 0;
              else if (values.documentType === 'Barangay Clearance') amount = Number(clearanceFee) || 0;
              else if (values.documentType === 'Business Clearance') amount = 0; // Set by admin later
              
              const payload = {
                ...values,
                amount: amount
              };
              
              console.log("Sending admin create request with payload:", payload);
              
              const token = localStorage.getItem("token");
              await axios.post(
                `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/document-requests`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              message.success("Document request created!");
              setCreateOpen(false);
              createForm.resetFields();
              fetchRequests();
            } catch (err) {
              console.error("Admin create request error:", err);
              message.error(err?.response?.data?.message || "Failed to create document request");
            }
            setCreating(false);
          }}
          confirmLoading={creating}
          okText="Create"
          okButtonProps={{ disabled: blockCreate || paymentsCheckLoading }}
          width={600}
        >
          <Alert
            message="Create Document Request"
            description="Select the resident requesting the document and choose the document type. The system will automatically check for unpaid fees and calculate applicable amounts."
            type="info"
            showIcon
            className="mb-4"
          />
          <div style={{ marginBottom: 16 }} />
          <Form form={createForm} layout="vertical">
            <Form.Item name="requestedBy" label="Requested By" rules={[{ required: true, message: "Please select who is making the request" }]}> 
              <Select
                showSearch
                placeholder="Select who is making the request"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
                onChange={val => setRequestedById(val)}
                value={requestedById}
              >
                {residents.map(r => (
                  <Select.Option key={r._id} value={r._id}>
                    {[r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(" ")}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="requestFor" label="Document For" rules={[{ required: true, message: "Please select who the document is for" }]}> 
              <Select
                showSearch
                placeholder={requestedById ? "Select head/member of household" : "Select 'Requested By' first"}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
                disabled={!requestedById}
              >
                {filteredHouseholdMembers.map(r => (
                  <Select.Option key={r._id} value={r._id}>
                    {[r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(" ")}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {createOpen && (
              <React.Fragment>
                {(() => {
                  const formRequestedBy = createForm.getFieldValue('requestedBy');
                  if (formRequestedBy !== requestedById) setRequestedById(formRequestedBy);
                })()}
              </React.Fragment>
            )}
            
            {selectedRequestFor && (
              <div className="mb-3 -mt-2 flex items-center gap-2">
                <Button size="small" onClick={() => setShowUnpaidModal(true)} disabled={paymentsCheckLoading}>
                  View Unpaid Months
                </Button>
                {paymentsCheckLoading ? (
                  <span className="text-xs text-gray-500">Checking payments…</span>
                ) : blockCreate ? (
                  <span className="text-xs text-red-600 font-medium">Creation disabled: resident has unpaid garbage/streetlight fees.</span>
                ) : (
                  <span className="text-xs text-green-600">All fees up-to-date.</span>
                )}
              </div>
            )}
            
            <Form.Item name="documentType" label="Document Type" rules={[{ required: true, message: "Please select document type" }]}>
              <Select
                placeholder="Select document type"
                options={[
                  { value: "Certificate of Indigency", label: "Certificate of Indigency" },
                  { value: "Barangay Clearance", label: "Barangay Clearance" },
                  { value: "Business Clearance", label: "Business Clearance" },
                ]}
              />
              
            </Form.Item>

            {selectedCreateDocType && (
              <Alert
                message={
                  selectedCreateDocType === 'Certificate of Indigency' 
                    ? `Amount: ₱${Number(settings?.documentFees?.indigency ?? 0).toFixed(2)}` 
                    : selectedCreateDocType === 'Barangay Clearance'
                    ? `Amount: ₱${Number(settings?.documentFees?.barangayClearance ?? 100).toFixed(2)}`
                    : 'Amount: To be set by admin upon acceptance'
                }
                type={selectedCreateDocType === 'Certificate of Indigency' ? 'success' : 'info'}
                showIcon
                className="mb-4"
              />
            )}

            <Form.Item name="quantity" label="Quantity" initialValue={1} rules={[{ required: true, type: 'number', min: 1, message: 'Enter quantity (min 1)' }]}>
              <InputNumber 
                min={1} 
                className="w-full" 
                parser={value => value.replace(/[^0-9]/g, '')}
                inputMode="numeric"
                onKeyPress={e => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
            </Form.Item>

            {selectedCreateDocType === "Business Clearance" && (
              <Form.Item
                name="businessName"
                label="Business Name"
                rules={[{ required: true, message: "Please enter business name" }]}
              >
                <Input placeholder="Enter registered business name" />
              </Form.Item>
            )}

            <Form.Item name="purpose" label="Purpose" rules={[{ required: true, message: "Please state the purpose of the document" }]}> 
              <Input.TextArea placeholder="State the purpose of the document request" autoSize={{ minRows: 3, maxRows: 6 }} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Unpaid Months Viewer */}
        <Modal
          title="Unpaid Months"
          open={showUnpaidModal}
          onCancel={() => setShowUnpaidModal(false)}
          footer={null}
          width={520}
        >
          {!selectedRequestFor ? (
            <div className="text-sm text-gray-500">Select a resident to view payment status.</div>
          ) : paymentsCheckLoading ? (
            <div className="text-sm text-gray-500">Loading unpaid months…</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="font-semibold mb-2">Garbage Fees</div>
                {unpaidMonths.garbage.length === 0 ? (
                  <div className="text-sm text-green-600">No unpaid months.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {unpaidMonths.garbage.map(({ month, isCurrent }) => (
                      <Tag key={`g-${month}`} color={isCurrent ? 'gold' : 'red'}>
                        {dayjs(`${month}-01`).format('MMM YYYY')}{isCurrent ? ' (Current)' : ''}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="font-semibold mb-2">Streetlight Fees</div>
                {unpaidMonths.streetlight.length === 0 ? (
                  <div className="text-sm text-green-600">No unpaid months.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {unpaidMonths.streetlight.map(({ month, isCurrent }) => (
                      <Tag key={`s-${month}`} color={isCurrent ? 'gold' : 'red'}>
                        {dayjs(`${month}-01`).format('MMM YYYY')}{isCurrent ? ' (Current)' : ''}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">Legend: Red = past unpaid, Yellow = current month unpaid.</div>
            </div>
          )}
        </Modal>

        {/* Accept Modal for Business Clearance */}
        <Modal
          title="Accept Request: Business Clearance"
          open={acceptOpen}
          onCancel={() => setAcceptOpen(false)}
          onOk={async () => {
            try {
              const { amount } = await acceptForm.validateFields();
              setAccepting(true);
              const token = localStorage.getItem("token");
              await axios.patch(
                `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/document-requests/${acceptRecord._id}/accept`,
                { amount: Number(amount) },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              message.success('Request accepted and recorded');
              setAcceptOpen(false);
              await fetchRequests(); // Refresh the full list to get updated data
            } catch (err) {
              message.error(err?.response?.data?.message || 'Failed to accept request');
            }
            setAccepting(false);
          }}
          confirmLoading={accepting}
          okText="Accept"
          width={420}
        >
          {acceptRecord && (
            <Form form={acceptForm} layout="vertical" initialValues={{ amount: acceptRecord.feeAmount }}>
              <Form.Item label="Document">
                <Input value={`${acceptRecord.documentType} x ${acceptRecord.quantity || 1}`} readOnly />
              </Form.Item>
              <Form.Item name="amount" label="Unit Amount (₱)" rules={[{ required: true, type: 'number', min: 0, message: 'Enter a valid amount' }]}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Form>
          )}
        </Modal>

        {/* Export Modal */}
        <Modal
          title="Export Document Requests"
          open={exportOpen}
          onCancel={() => {
            setExportOpen(false);
            setExportHasData(true);
          }}
          onOk={handleExport}
          okText="Export"
          okButtonProps={{ disabled: !exportHasData }}
          width={420}
        >
          <Form form={exportForm} layout="vertical" initialValues={{ reportType: 'detailed', docTypeFilter: 'all', purokFilter: 'all', rangeType: "month", period: dayjs() }}>
            <Form.Item name="reportType" label="Report Type" rules={[{ required: true }]}>
              <Select
                onChange={() => {
                  const formValues = exportForm.getFieldsValue();
                  const { docTypeFilter, purokFilter, rangeType, period } = formValues;
                  
                  let filtered = requests;
                  
                  // Apply date range filter if period is set
                  if (rangeType && period) {
                    const { start, end } = getRange(rangeType, period);
                    filtered = filtered.filter(r => {
                      const t = dayjs(r.requestedAt).valueOf();
                      return t >= start.valueOf() && t <= end.valueOf();
                    });
                  }
                  
                  // Apply document type filter
                  if (docTypeFilter && docTypeFilter !== 'all') {
                    filtered = filtered.filter(r => r.documentType === docTypeFilter);
                  }
                  
                  // Apply purok filter
                  if (purokFilter && purokFilter !== 'all') {
                    filtered = filtered.filter(r => (r?.residentId?.address?.purok || '').toString() === purokFilter.toString());
                  }
                  
                  setExportHasData(filtered.length > 0);
                }}
                options={[
                  { value: 'detailed', label: 'Detailed Rows' },
                  { value: 'top_requesters', label: 'Top Requesters (Most Requests)' },
                ]}
              />
            </Form.Item>
            <Form.Item name="docTypeFilter" label="Document Type">
              <Select
                onChange={(value) => {
                  const formValues = exportForm.getFieldsValue();
                  const { purokFilter, rangeType, period } = formValues;
                  
                  let filtered = requests;
                  
                  // Apply date range filter if period is set
                  if (rangeType && period) {
                    const { start, end } = getRange(rangeType, period);
                    filtered = filtered.filter(r => {
                      const t = dayjs(r.requestedAt).valueOf();
                      return t >= start.valueOf() && t <= end.valueOf();
                    });
                  }
                  
                  // Apply document type filter
                  if (value && value !== 'all') {
                    filtered = filtered.filter(r => r.documentType === value);
                  }
                  
                  // Apply purok filter
                  if (purokFilter && purokFilter !== 'all') {
                    filtered = filtered.filter(r => (r?.residentId?.address?.purok || '').toString() === purokFilter.toString());
                  }
                  
                  setExportHasData(filtered.length > 0);
                }}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'Certificate of Indigency', label: 'Certificate of Indigency' },
                  { value: 'Barangay Clearance', label: 'Barangay Clearance' },
                  { value: 'Business Clearance', label: 'Business Clearance' },
                ]}
              />
            </Form.Item>
            <Form.Item name="purokFilter" label="Purok">
              <Select
                showSearch
                optionFilterProp="label"
                onChange={(value) => {
                  const formValues = exportForm.getFieldsValue();
                  const { docTypeFilter, rangeType, period } = formValues;
                  
                  let filtered = requests;
                  
                  // Apply date range filter if period is set
                  if (rangeType && period) {
                    const { start, end } = getRange(rangeType, period);
                    filtered = filtered.filter(r => {
                      const t = dayjs(r.requestedAt).valueOf();
                      return t >= start.valueOf() && t <= end.valueOf();
                    });
                  }
                  
                  // Apply document type filter
                  if (docTypeFilter && docTypeFilter !== 'all') {
                    filtered = filtered.filter(r => r.documentType === docTypeFilter);
                  }
                  
                  // Apply purok filter
                  if (value && value !== 'all') {
                    filtered = filtered.filter(r => (r?.residentId?.address?.purok || '').toString() === value.toString());
                  }
                  
                  setExportHasData(filtered.length > 0);
                }}
                options={[
                  { value: 'all', label: 'All' },
                  ...uniquePuroks.map((p) => ({ value: p, label: String(p) })),
                ]}
              />
            </Form.Item>
            <Form.Item name="rangeType" label="Range Type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "month", label: "Month" },
                  { value: "week", label: "Week" },
                  { value: "day", label: "Day" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="period"
              label={exportRangeType === "day" ? "Select Day" : exportRangeType === "week" ? "Select Week" : "Select Month"}
              rules={[{ required: true, message: "Please select a period" }]}
            >
              <DatePicker
                className="w-full"
                picker={exportRangeType === "day" ? "date" : exportRangeType}
                disabledDate={date => {
                  if (exportRangeType === 'month') {
                    // Disable months after the current month
                    return date > dayjs().endOf('month');
                  }
                  return false;
                }}
              />
            </Form.Item>
            {!exportHasData && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 mt-3">
                <p className="font-semibold">No data matches the selected filters</p>
                <p className="text-xs mt-1">Please adjust your filter criteria to export data.</p>
              </div>
            )}
            <div className="text-sm text-gray-500 mt-6">
              <strong>Export Format:</strong>
              <ul className="list-disc ml-5 mt-2">
                <li>Resident Name (Requested By)</li>
                <li>Civil Status, Purok</li>
                <li>Document Type, Business Name</li>
                <li>Requested At, Updated At</li>
              </ul>
            </div>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
