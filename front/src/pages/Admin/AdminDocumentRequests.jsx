import React, { useEffect, useState } from "react";
import { Table, Input, InputNumber, Button, Modal, Descriptions, Tag, Select, message, Form, Popconfirm } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { UserOutlined } from "@ant-design/icons";
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

  const [createForm] = Form.useForm();
  const selectedCreateDocType = Form.useWatch("documentType", createForm); // NEW
  const selectedRequestFor = Form.useWatch("requestFor", createForm); // Person document is for

  // Export state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportForm] = Form.useForm();
  const exportRangeType = Form.useWatch("rangeType", exportForm) || "month";

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('documentRequestColumnsVisibility');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      requestedBy: true,
      requestFor: true,
      civilStatus: true,
      purok: true,
      documentType: true,
      quantity: true,
      purpose: true,
      status: true,
      requestedAt: true,
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
  }, []);

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

  const allColumns = [
    {
      title: "Requested By",
      key: "requestedBy",
      columnKey: "requestedBy",
      render: (_, r) =>
        r.requestedBy
          ? [r.requestedBy.firstName, r.requestedBy.middleName, r.requestedBy.lastName].filter(Boolean).join(" ")
          : "-",
    },
    {
      title: "Document For",
      key: "requestFor",
      columnKey: "requestFor",
      render: (_, r) => {
        const person = r.requestFor || r.residentId;
        return person
          ? [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ")
          : "-";
      },
    },
    {
      title: "Civil Status",
      key: "civilStatus",
      columnKey: "civilStatus",
      render: (_, r) => {
        const person = r.requestFor || r.residentId;
        return person?.civilStatus || "-";
      },
    },
    {
      title: "Purok",
      key: "purok",
      columnKey: "purok",
      render: (_, r) => {
        const person = r.requestFor || r.residentId;
        return person?.address?.purok || "-";
      },
    },
    {
      title: "Document Type",
      dataIndex: "documentType",
      key: "documentType",
      columnKey: "documentType",
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      columnKey: "quantity",
      width: 70,
      render: (v) => Number(v || 1)
    },
    {
      title: "Purpose",
      dataIndex: "purpose",
      key: "purpose",
      columnKey: "purpose",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      columnKey: "status",
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
      columnKey: "requestedAt",
      render: v => (v ? new Date(v).toLocaleString() : ""),
      sorter: (a, b) =>
        new Date(a.requestedAt || 0) - new Date(b.requestedAt || 0),
      defaultSortOrder: "descend",
      sortDirections: ["descend", "ascend"],
    },
    {
      title: "Actions",
      key: "actions",
      columnKey: "actions",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => { openView(r); }}>View Details</Button>
          <Button size="small" onClick={() => handlePrint(r)}>Print</Button>
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
              <Button size="small" danger onClick={() => handleAction(r._id, 'decline')}>Decline</Button>
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
  );  // Unique list of Puroks for export filtering
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
  "Indigency": "/INDIGENCY.docx",
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

function pad2(n) {
  return String(n).padStart(2, "0");
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

function buildTemplateData(docType, record) {
  // Use requestFor (person document is for) instead of residentId (person who requested)
  const r = record.requestFor || record.residentId || {};
  const fullName = [r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(" ") || "-";
  const requestedAt = record.requestedAt ? new Date(record.requestedAt) : new Date();

  const dayNum = requestedAt.getDate();
  const ord = ordinalSuffix(dayNum);
  const dayOrdinalMixed = `${pad2(dayNum)}${ord}`;   // e.g., 02nd
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
    // date tokens
    day: dayNum,
    dayOrdinal: dayOrdinalMixed,
    month: monthLong,
    year: yearStr,
    issuedLine: `ISSUED this ${dayOrdinalMixed} day of ${monthLong}, ${yearStr} at ${locationLine}.`,
    location: locationLine,

    // lowercase pronouns for inline usage
    heShe: p.subject,
    himHer: p.object,
    hisHer: p.possessive,
    himselfHerself: p.reflexive,
    honorific: p.honorific,

    // uppercase token names but values stay lowercase (per your requirement)
    HE_SHE: p.subject,
    HIM_HER: p.object,
    HIS_HER: p.possessive,
    HIMSELF_HERSELF: p.reflexive,
    HONORIFIC: p.honorific,

    // Capitalized versions for sentence starts (use these right after a period)
    He_She: capFirst(p.subject),
    Him_Her: capFirst(p.object),
    His_Her: capFirst(p.possessive),
    Himself_Herself: capFirst(p.reflexive),
    Honorific: p.honorific, // usually already capitalized (Mr./Ms.)
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
  "dayOrdinalMixed","issuedLineMixed" // keep these mixed-case overrides
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
    console.error("Error generating document:", err);
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
          Status: r.status,
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
            <div className="flex items-center outline outline-1 rounded-2xl p-5 gap-3">
              <UserOutlined className="text-2xl text-blue-600" />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-gray-700">{userProfile.fullName || "Administrator"}</span>
                <span className="text-xs text-gray-500">{username}</span>
              </div>
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
              <Input.Search
                allowClear
                placeholder="Search for Document Requests"
                onSearch={v => setSearch(v.trim())}
                value={search}
                onChange={e => setSearch(e.target.value)}
                enterButton
                className="min-w-[500px] max-w-xs"
              />             
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
                    checked={visibleColumns.requestedBy}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, requestedBy: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Requested By
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.requestFor}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, requestFor: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Document For
                  </DropdownMenuCheckboxItem>
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
                    checked={visibleColumns.documentType}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, documentType: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Document Type
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.quantity}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, quantity: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Quantity
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.purpose}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, purpose: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Purpose
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.status}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, status: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.requestedAt}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, requestedAt: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Requested At
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="primary" onClick={() => setCreateOpen(true)}>
                Create Request Document
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
              rowKey="_id"
              loading={loading}
              dataSource={filteredRequests}
              columns={columns}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: filteredRequests.length,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} requests`,
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
              <Descriptions.Item label="Status">{viewRequest.status}</Descriptions.Item>
              <Descriptions.Item label="Requested At">{viewRequest.requestedAt ? new Date(viewRequest.requestedAt).toLocaleString() : ""}</Descriptions.Item>
              <Descriptions.Item label="Updated At">{viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString() : ""}</Descriptions.Item>
              <Descriptions.Item label="Blockchain Hash">{viewRequest.blockchain?.hash || "-"}</Descriptions.Item>
              <Descriptions.Item label="Blockchain TxID">{viewRequest.blockchain?.lastTxId || "-"}</Descriptions.Item>
              <Descriptions.Item label="Issued By">{viewRequest.blockchain?.issuedBy || "-"}</Descriptions.Item>
              <Descriptions.Item label="Issued At">{viewRequest.blockchain?.issuedAt ? new Date(viewRequest.blockchain.issuedAt).toLocaleString() : "-"}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
        {/* Create Request Modal */}
        <Modal
          title="Create Document Request"
          open={createOpen}
          onCancel={() => { setCreateOpen(false); setShowUnpaidModal(false); setUnpaidMonths({ garbage: [], streetlight: [] }); setBlockCreate(false); }}
          onOk={async () => {
            try {
              setCreating(true);
              const values = await createForm.validateFields();
              
              // Calculate amount based on document type for admin requests
              let amount = 0;
              if (values.documentType === 'Indigency') amount = 0;
              else if (values.documentType === 'Barangay Clearance') amount = 100;
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
          <Form form={createForm} layout="vertical">
            <Form.Item name="requestedBy" label="Requested By" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Select who is making the request"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {residents.map(r => (
                  <Select.Option key={r._id} value={r._id}>
                    {[r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(" ")}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item name="requestFor" label="Document For" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Select who the document is for"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {residents.map(r => (
                  <Select.Option key={r._id} value={r._id}>
                    {[r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(" ")}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            
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
            
            <Form.Item name="documentType" label="Document Type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "Indigency", label: "Indigency" },
                  { value: "Barangay Clearance", label: "Barangay Clearance" },
                  { value: "Business Clearance", label: "Business Clearance" },
                ]}
              />
            </Form.Item>

            <Form.Item name="quantity" label="Quantity" initialValue={1} rules={[{ required: true, type: 'number', min: 1, message: 'Enter quantity (min 1)' }]}>
              <InputNumber min={1} className="w-full" />
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

            <Form.Item name="purpose" label="Purpose" rules={[{ required: true }]}>
              <Input />
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
              setRequests(prev => prev.map(r => r._id === acceptRecord._id ? { ...r, status: 'accepted', feeAmount: Number(amount) } : r));
              message.success('Request accepted and recorded');
              setAcceptOpen(false);
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
          onCancel={() => setExportOpen(false)}
          onOk={handleExport}
          okText="Export"
          width={420}
        >
          <Form form={exportForm} layout="vertical" initialValues={{ reportType: 'detailed', docTypeFilter: 'all', purokFilter: 'all', rangeType: "month", period: dayjs() }}>
            <Form.Item name="reportType" label="Report Type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'detailed', label: 'Detailed Rows' },
                  { value: 'top_requesters', label: 'Top Requesters (Most Requests)' },
                ]}
              />
            </Form.Item>
            <Form.Item name="docTypeFilter" label="Document Type">
              <Select
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'Indigency', label: 'Indigency' },
                  { value: 'Barangay Clearance', label: 'Barangay Clearance' },
                  { value: 'Business Clearance', label: 'Business Clearance' },
                ]}
              />
            </Form.Item>
            <Form.Item name="purokFilter" label="Purok">
              <Select
                showSearch
                optionFilterProp="label"
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
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
