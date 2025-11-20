import React, { useEffect, useState } from "react";
import { Table, Input, InputNumber, Button, Modal, Descriptions, Tag, Select, message, Form, Tabs, Pagination, Spin } from "antd";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { 
  UserOutlined, 
  FileTextOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileOutlined,
  DownloadOutlined,
  WarningOutlined
} from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import ResidentNavbar from './ResidentNavbar';
import PaymentStatusAlert from './PaymentStatusAlert';

export default function ResidentRequest() {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resident, setResident] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [monthsStatus, setMonthsStatus] = useState({ garbage: { paid: [], unpaid: [] }, streetlight: { paid: [], unpaid: [] } });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Blockchain status mapping
  const [chainStatusesLoaded, setChainStatusesLoaded] = useState(false);
  
  // New state for form enhancements
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [isInHousehold, setIsInHousehold] = useState(true);
  const [documentPricing, setDocumentPricing] = useState({
    "Indigency": 0,
    "Barangay Clearance": 100,
    "Business Clearance": 0 // Will be set by admin
  });

  const navigate = useNavigate();
  const [createForm] = Form.useForm();
  const selectedDocType = Form.useWatch("documentType", createForm);


  useEffect(() => {
    // Only fetch requests on initial load
    fetchRequests();
    fetchResidentProfile(); // Fetch resident profile
    fetchHouseholdInfo();
    checkPaymentStatus();
    fetchPaymentsSummary();
  }, []);

  // Fetch resident profile information
  const fetchResidentProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found for resident profile fetch");
        return;
      }

      console.log("Fetching resident profile...");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log("Resident profile API response:", res.data);
      
      if (res.data) {
        setResident(res.data);
        // Set default form values when resident data is loaded
        console.log("Setting form defaults for resident:", res.data._id);
        createForm.setFieldsValue({
          residentId: res.data._id,
          requestFor: res.data._id
        });
      }
    } catch (error) {
      console.error("Error fetching resident profile:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
      }
      // Fallback to localStorage (prefer userData from login)
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
      const fallbackResidentId = userData?.residentId || userProfile?._id;
      const fallbackFirstName = userData?.firstName || userProfile?.firstName;
      const fallbackLastName = userData?.lastName || userProfile?.lastName;
      console.log("Fallback to localStorage userData/userProfile:", { userData, userProfile });
      if (fallbackResidentId) {
        const fallbackResident = {
          _id: fallbackResidentId,
          firstName: fallbackFirstName,
          lastName: fallbackLastName,
        };
        setResident(fallbackResident);
        createForm.setFieldsValue({
          residentId: fallbackResidentId,
          requestFor: fallbackResidentId
        });
      }
    }
  };

  // Fetch household information and members
  const fetchHouseholdInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found for household fetch");
        setIsInHousehold(false);
        return;
      }

      console.log("Fetching household info...");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/household`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log("Household API response:", res.data);
      
      if (res.data && res.data.members) {
        // Resident is in a household
        setIsInHousehold(true);
        
        // Filter out the current resident from members list to avoid duplication
        // The current resident will be shown separately as "You"
        const userData = JSON.parse(localStorage.getItem("userData") || "{}");
        const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        const currentResidentId = resident?._id || userData?.residentId || userProfile?._id;
        console.log("Current resident context:", { currentResidentId, userData, userProfile });
        
        // Filter members that aren't the current user
        const otherMembers = res.data.members.filter(member => {
          console.log("Checking member:", member);
          return member._id !== currentResidentId;
        });
        
        console.log("Other household members:", otherMembers);
        setHouseholdMembers(otherMembers);
      } else {
        console.log("No members found in household data");
        setIsInHousehold(false);
        setHouseholdMembers([]);
      }
    } catch (error) {
      console.error("Error fetching household information:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);
        
        // If 404, resident is not in a household
        if (error.response.status === 404) {
          setIsInHousehold(false);
        }
      }
      // Set empty array as fallback
      setHouseholdMembers([]);
    }
  };

  // Check payment status to determine if user can request documents
  const checkPaymentStatus = async () => {
    setCheckingPayment(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("You are not logged in. Please log in first.");
        return;
      }

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/document-requests/payment-status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPaymentStatus(res.data);
    } catch (error) {
      console.error("Error checking payment status:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        message.error("Authentication error. Please log in again.");
      } else if (error.response?.status === 400) {
        console.log("Bad request - possibly no household associated with resident");
        // Set a default status that allows document requests for now
        setPaymentStatus({
          canRequestDocuments: true,
          message: "Payment status not available - proceeding with document requests",
          paymentStatus: null
        });
      } else {
        console.log("Payment status check failed, allowing document requests by default");
        // Don't show error to user, just allow document requests
        setPaymentStatus({
          canRequestDocuments: true,
          message: "Payment validation unavailable",
          paymentStatus: null
        });
      }
    }
    setCheckingPayment(false);
  };

  // Fetch resident payment records to show paid/unpaid months for current year
  const fetchPaymentsSummary = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/payments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPaymentsSummary(res.data);

      const currentYear = new Date().getFullYear();
      const months = Array.from({ length: new Date().getMonth() + 1 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`);
      const mark = (items = [], type) => {
        const map = new Map(items.filter(p => p.type === type).map(p => [p.month, p]));
        const paid = []; const unpaid = [];
        months.forEach(m => {
          const rec = map.get(m);
          if (rec && (rec.status === 'paid' || Number(rec.balance) <= 0)) paid.push(m); else unpaid.push(m);
        });
        return { paid, unpaid };
      };
      const g = mark([...(res.data.utilityPayments || [])], 'garbage');
      const s = mark([...(res.data.streetlightPayments || [])], 'streetlight');
      setMonthsStatus({ garbage: g, streetlight: s });
    } catch (e) {
      // ignore
    }
  };

  // (Removed unused fetchUserInfo function)

  // Fetch document requests for the current resident
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        message.error("You are not logged in. Please log in first.");
        setLoading(false);
        return;
      }

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/document-requests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const baseRequests = Array.isArray(res.data) ? res.data : [];
      setRequests(baseRequests);
      // Fetch blockchain statuses after setting base requests
      fetchBlockchainStatuses(baseRequests);
      
      // If we have requests with resident information, update the resident state
      if (res.data && res.data.length > 0 && res.data[0].residentId) {
        setResident(res.data[0].residentId);
      }
    } catch (error) {
      console.error("Error fetching document requests:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        message.error("Authentication error. Please log in again.");
      } else {
        message.error("Failed to load document requests.");
      }
      // Set empty array instead of undefined
      setRequests([]);
    }
    setLoading(false);
  };

  // Fetch blockchain request statuses for this resident and merge
  const fetchBlockchainStatuses = async (current = requests) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const chainRes = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/blockchain/requests/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const chainData = Array.isArray(chainRes.data) ? chainRes.data : [];
      const map = new Map(
        chainData.map(r => [r.requestId, r])
      );
      const merged = (current || []).map(r => {
        const chain = map.get(r._id) || map.get(r.requestId);
        let blockchainStatus = 'not_registered';
        if (chain && chain.status) {
          const s = (chain.status || '').toLowerCase();
          if (['verified','edited','deleted','error'].includes(s)) blockchainStatus = s; else blockchainStatus = s || 'not_registered';
        }
        return { ...r, blockchainStatus };
      });
      setRequests(merged);
      setChainStatusesLoaded(true);
    } catch (err) {
      console.warn('Blockchain statuses fetch failed:', err.message || err);
      // Keep existing requests; mark as loaded to avoid repeated attempts
      setChainStatusesLoaded(true);
    }
  };

  // Request statistics
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === "pending").length;
  const approvedRequests = requests.filter(r => r.status === "accepted").length;
  const rejectedRequests = requests.filter(r => r.status === "declined" || r.status === "rejected").length;

  const filteredRequests = requests.filter(r => {
    // Handle the tab filtering
    if (search === "pending") {
      return r.status === "pending";
    } else if (search === "approved") {
      return r.status === "accepted";
    } else if (search === "rejected") {
      return r.status === "declined" || r.status === "rejected";
    }
    
    // Default: show all requests
    return true;
  });

  // Calculate paginated requests
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to first page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const openView = (request) => {
    setViewRequest(request);
    setViewOpen(true);
  };

  const handleNewRequest = () => {
    if (!isInHousehold) {
      message.error("You must be part of a household to request documents. Please contact the barangay office.");
      return;
    }
    if (!paymentStatus?.canRequestDocuments && paymentStatus?.paymentStatus) {
      message.warning("Please settle your outstanding payments before requesting documents");
      return;
    }
    // Reset form and set initial values
    createForm.resetFields();
    createForm.setFieldsValue({
      residentId: resident?._id,
      requestFor: resident?._id,
      quantity: 1,
      amount: 0
    });
    setCreateOpen(true);
  };

  const handleGoToPayments = () => {
    navigate('/resident/payments');
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50">
      <ResidentNavbar />
      <main className="mx-auto w-full max-w-9xl space-y-3 px-2 py-3 sm:space-y-8 sm:px-4 sm:py-6 lg:px-8">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 sm:text-2xl">My Document Requests</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Submit and track your official barangay documents
              </CardDescription>
            </div>
            <Button 
              type="primary" 
              size="small"
              onClick={handleNewRequest}
              className={`shadow-sm flex items-center gap-1 text-xs h-7 px-2 sm:h-8 sm:px-4 sm:text-sm lg:size-large ${
                (!isInHousehold || (paymentStatus?.canRequestDocuments === false && paymentStatus?.paymentStatus))
                  ? "bg-gray-400 hover:bg-gray-500" 
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              icon={<FileTextOutlined className="text-xs sm:text-sm" />}
              disabled={!isInHousehold || (paymentStatus?.canRequestDocuments === false && paymentStatus?.paymentStatus)}
              loading={checkingPayment}
            >
              <span className="hidden xs:inline sm:inline">New Request</span>
              <span className="inline xs:hidden sm:hidden">New</span>
            </Button>
          </CardHeader>
        </Card>

        {/* Household Status Alert */}
        {!isInHousehold && (
          <div className="rounded border border-amber-200 bg-amber-50 px-2 py-2 mb-3 sm:rounded-lg sm:px-4 sm:py-3 sm:mb-5">
            <div className="flex items-start gap-2 sm:gap-0">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 sm:h-10 sm:w-10 sm:mr-3">
                  <WarningOutlined className="text-amber-500 text-sm align-middle sm:text-2xl" />
                </span>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-amber-800 sm:text-base">
                  Household Registration Required
                </h3>
                <div className="mt-1 text-xs text-amber-700 sm:mt-2 sm:text-sm">
                  <p>
                    You must be registered as part of a household before you can request documents.<br className="hidden sm:inline" />
                    <span className="inline sm:hidden"> </span>Please visit the barangay office to register your household or to be added to an existing household.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Status Alert */}
        {paymentStatus && !paymentStatus.canRequestDocuments && paymentStatus.paymentStatus && (
          <div className="rounded border px-2 py-2 text-xs text-rose-700 mb-3 sm:rounded-lg sm:border sm:px-4 sm:py-3 sm:text-sm sm:mb-5">
            <PaymentStatusAlert 
              paymentStatus={paymentStatus}
              onPaymentClick={handleGoToPayments}
            />
          </div>
        )}


        <Card className="w-full">
          <CardContent className="space-y-3 p-3 sm:space-y-6 sm:p-6">
            {/* Request Statistics Cards */}
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <div className="flex gap-2 min-w-max sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-4 sm:min-w-0">
                <Card className="w-32 flex-shrink-0 border border-blue-200 bg-blue-50 shadow-sm sm:w-full sm:shadow">
                  <CardContent className="space-y-1 px-2 py-2 sm:space-y-2 sm:px-4 sm:py-5 lg:px-6">
                    <p className="text-[10px] font-medium text-blue-700 leading-tight sm:text-sm">All Requests</p>
                    <p className="text-lg font-bold text-blue-900 sm:text-2xl">{totalRequests}</p>
                  </CardContent>
                </Card>
                <Card className="w-32 flex-shrink-0 border border-amber-200 bg-amber-50 shadow-sm sm:w-full sm:shadow">
                  <CardContent className="space-y-1 px-2 py-2 sm:space-y-2 sm:px-4 sm:py-5 lg:px-6">
                    <p className="text-[10px] font-medium text-amber-700 leading-tight sm:text-sm">Pending</p>
                    <p className="text-lg font-bold text-amber-900 sm:text-2xl">{pendingRequests}</p>
                  </CardContent>
                </Card>
                <Card className="w-32 flex-shrink-0 border border-emerald-200 bg-emerald-50 shadow-sm sm:w-full sm:shadow">
                  <CardContent className="space-y-1 px-2 py-2 sm:space-y-2 sm:px-4 sm:py-5 lg:px-6">
                    <p className="text-[10px] font-medium text-emerald-700 leading-tight sm:text-sm">Approved</p>
                    <p className="text-lg font-bold text-emerald-900 sm:text-2xl">{approvedRequests}</p>
                  </CardContent>
                </Card>
                <Card className="w-32 flex-shrink-0 border border-rose-200 bg-rose-50 shadow-sm sm:w-full sm:shadow">
                  <CardContent className="space-y-1 px-2 py-2 sm:space-y-2 sm:px-4 sm:py-5 lg:px-6">
                    <p className="text-[10px] font-medium text-rose-700 leading-tight sm:text-sm">Rejected</p>
                    <p className="text-lg font-bold text-rose-900 sm:text-2xl">{rejectedRequests}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          
          {/* Filter Tabs */}
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <Tabs 
              defaultActiveKey="all"
              className="mb-3 sm:mb-6 [&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-tab]:px-2 [&_.ant-tabs-tab]:py-1 [&_.ant-tabs-tab]:text-[11px] [&_.ant-tabs-tab]:min-w-0 sm:[&_.ant-tabs-tab]:px-4 sm:[&_.ant-tabs-tab]:py-2 sm:[&_.ant-tabs-tab]:text-sm"
              type="card"
              items={[
                {
                  key: 'all',
                  label: <span className="whitespace-nowrap">All Requests</span>,
                  children: null,
                },
                {
                  key: 'pending',
                  label: <span className="whitespace-nowrap">Pending</span>,
                  children: null,
                },
                {
                  key: 'approved',
                  label: <span className="whitespace-nowrap">Approved</span>,
                  children: null,
                },
                {
                  key: 'rejected',
                  label: <span className="whitespace-nowrap">Rejected</span>,
                  children: null,
                },
              ]}
              onChange={(key) => {
                if (key === 'all') {
                  setSearch("");
                } else if (key === 'pending') {
                  setSearch("pending");
                } else if (key === 'approved') {
                  setSearch("approved");
                } else if (key === 'rejected') {
                  setSearch("rejected");
                }
              }}
            />
          </div>
          
          <div className="border rounded overflow-x-auto shadow-sm sm:rounded-lg">
            <table className="min-w-full bg-white table-auto">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="py-1.5 px-2 text-left text-[9px] font-medium text-gray-500 uppercase tracking-tight sm:py-3 sm:px-6 sm:text-xs sm:tracking-wider">Document</th>
                  <th className="py-1.5 px-2 text-left text-[9px] font-medium text-gray-500 uppercase tracking-tight hidden md:table-cell sm:py-3 sm:px-6 sm:text-xs sm:tracking-wider">Document For</th>
                  <th className="py-1.5 px-2 text-left text-[9px] font-medium text-gray-500 uppercase tracking-tight hidden sm:table-cell sm:py-3 sm:px-6 sm:text-xs sm:tracking-wider">Purpose</th>
                  <th className="py-1.5 px-2 text-left text-[9px] font-medium text-gray-500 uppercase tracking-tight hidden md:table-cell sm:py-3 sm:px-6 sm:text-xs sm:tracking-wider">Date</th>
                  <th className="py-1.5 px-2 text-left text-[9px] font-medium text-gray-500 uppercase tracking-tight hidden sm:table-cell sm:py-3 sm:px-6 sm:text-xs sm:tracking-wider">Status</th>
                  <th className="py-1.5 px-2 text-left text-[9px] font-medium text-gray-500 uppercase tracking-tight hidden md:table-cell sm:py-3 sm:px-6 sm:text-xs sm:tracking-wider">Blockchain</th>
                  <th className="py-1.5 px-2 text-left text-[9px] font-medium text-gray-500 uppercase tracking-tight hidden lg:table-cell sm:py-3 sm:px-6 sm:text-xs sm:tracking-wider">Amount</th>
                  <th className="py-1.5 px-2 text-left text-[9px] font-medium text-gray-500 uppercase tracking-tight sm:py-3 sm:px-6 sm:text-xs sm:tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 sm:py-8">
                      <div className="flex justify-center items-center">
                        <Spin tip="Loading requests..." size="small" className="sm:size-default" />
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-6 sm:py-12">
                      <div className="flex flex-col items-center">
                        <FileTextOutlined style={{ fontSize: '20px' }} className="text-gray-400 mb-1 sm:text-[32px] sm:mb-2" />
                        <p className="text-gray-500 font-medium text-xs sm:text-base">No document requests found</p>
                        <p className="text-gray-400 text-[10px] mt-0.5 sm:text-sm sm:mt-1">Click "New Request" to create a document request</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-2 px-2 sm:py-4 sm:px-6">
                        <div className="flex items-center gap-1.5 sm:gap-0">
                          <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center sm:h-8 sm:w-8 sm:mr-3">
                            <FileTextOutlined className="text-blue-600 text-[10px] sm:text-sm" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-[10px] leading-tight sm:text-sm">{request.documentType}</p>
                            <p className="text-[8px] text-gray-500 sm:text-xs">ID: {request._id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[10px] text-gray-700 hidden md:table-cell sm:py-4 sm:px-6 sm:text-sm">
                        <div className="flex items-center">
                          {(() => {
                            const person = request.requestFor || request.residentId;
                            return person ? (
                              <div>
                                <p className="font-medium text-gray-800 text-[10px] leading-tight sm:text-sm">
                                  {[person.firstName, person.lastName].filter(Boolean).join(" ")}
                                </p>
                                <p className="text-[8px] text-gray-500 sm:text-xs">
                                  {person._id === resident?._id ? "(You)" : "(Family Member)"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[10px] text-gray-700 hidden sm:table-cell sm:py-4 sm:px-6 sm:text-sm">
                        <div className="max-w-xs truncate">{request.purpose}</div>
                      </td>
                      <td className="py-2 px-2 hidden md:table-cell sm:py-4 sm:px-6">
                        <div>
                          <p className="text-[10px] font-medium text-gray-700 sm:text-sm">{new Date(request.requestedAt).toLocaleDateString()}</p>
                          <p className="text-[8px] text-gray-500 sm:text-xs">{new Date(request.requestedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </td>
                      <td className="py-2 px-2 hidden sm:table-cell sm:py-4 sm:px-6">
                        {request.status === "pending" && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-amber-100 text-amber-800 sm:px-2 sm:py-1 sm:text-xs">
                            PENDING
                          </span>
                        )}
                        {request.status === "accepted" && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-green-100 text-green-800 sm:px-2 sm:py-1 sm:text-xs">
                            APPROVED
                          </span>
                        )}
                        {(request.status === "declined" || request.status === "rejected") && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-red-100 text-red-800 sm:px-2 sm:py-1 sm:text-xs">
                            REJECTED
                          </span>
                        )}
                        {request.status === "completed" && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-blue-100 text-blue-800 sm:px-2 sm:py-1 sm:text-xs">
                            RELEASED
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 hidden md:table-cell sm:py-4 sm:px-6">
                        {(() => {
                          const s = request.blockchainStatus || 'not_registered';
                          const upper = s === 'not_registered' ? 'UNREGISTERED' : s.toUpperCase();
                          const colorMap = {
                            verified: 'bg-green-100 text-green-800',
                            edited: 'bg-orange-100 text-orange-800',
                            deleted: 'bg-red-100 text-red-800',
                            error: 'bg-rose-100 text-rose-700',
                            not_registered: 'bg-gray-100 text-gray-600'
                          };
                          return (
                            <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full sm:px-2 sm:py-1 sm:text-xs ${colorMap[s] || 'bg-gray-100 text-gray-600'}`}>
                              {upper}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2 px-2 hidden lg:table-cell sm:py-4 sm:px-6">
                        {(() => {
                          // Calculate total amount based on document type and quantity
                          const quantity = request.quantity || 1;
                          let baseAmount = 0;
                          
                          if (request.documentType === "Indigency") {
                            baseAmount = 0;
                          } else if (request.documentType === "Barangay Clearance") {
                            baseAmount = 100;
                          } else if (request.documentType === "Business Clearance") {
                            // For business clearance, use assigned fee amount or stored amount
                            if ((request.status === "accepted" || request.status === "completed") && (request.feeAmount || request.amount)) {
                              baseAmount = request.feeAmount || request.amount || 0;
                              const totalAmount = baseAmount * quantity;
                              return (
                                <span className="text-[10px] font-medium text-green-600 sm:text-sm">
                                  ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              );
                            } else {
                              return <span className="text-[10px] text-gray-400 sm:text-sm">TBD</span>;
                            }
                          }
                          
                          const totalAmount = baseAmount * quantity;
                          
                          if (baseAmount === 0) {
                            return <span className="text-[10px] text-gray-600 sm:text-sm">Free</span>;
                          } else {
                            return (
                              <span className="text-[10px] text-gray-600 sm:text-sm">
                                ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            );
                          }
                        })()}
                      </td>
                      <td className="py-2 px-2 sm:py-4 sm:px-6">
                        <Button
                          type="default"
                          size="small"
                          onClick={() => openView(request)}
                          className="border border-blue-600 text-blue-600 hover:bg-blue-50 h-6 text-[10px] px-2 sm:h-auto sm:text-sm sm:px-3"
                        >
                          Track
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredRequests.length > 0 && (
            <div className="mt-2 flex items-center justify-end sm:mt-4">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={filteredRequests.length}
                showSizeChanger={false}
                showQuickJumper={false}
                size="small"
                className="[&_.ant-pagination-item]:min-w-[24px] [&_.ant-pagination-item]:h-6 [&_.ant-pagination-item]:text-[10px] [&_.ant-pagination-item]:leading-6 [&_.ant-pagination-prev]:min-w-[24px] [&_.ant-pagination-prev]:h-6 [&_.ant-pagination-next]:min-w-[24px] [&_.ant-pagination-next]:h-6 sm:size-default sm:[&_.ant-pagination-item]:min-w-[32px] sm:[&_.ant-pagination-item]:h-8 sm:[&_.ant-pagination-item]:text-sm sm:[&_.ant-pagination-prev]:min-w-[32px] sm:[&_.ant-pagination-prev]:h-8 sm:[&_.ant-pagination-next]:min-w-[32px] sm:[&_.ant-pagination-next]:h-8"
                showTotal={(total, range) => 
                  <span className="text-[10px] sm:text-sm">{range[0]}-{range[1]} of {total} requests</span>
                }
                onChange={(page) => {
                  setCurrentPage(page);
                }}
              />
            </div>
          )}
          </CardContent>
        </Card>
      </main>
    </div>

    {/* View Request Modal */}
    <Modal
      title={null}
      open={viewOpen}
      onCancel={() => setViewOpen(false)}
      footer={null}
      width={"100%"}
      style={{ maxWidth: "900px" }}
      className="document-tracking-modal [&_.ant-modal-content]:p-0"
      bodyStyle={{ padding: 0 }}
    >
        {viewRequest && (
          <div>
            {/* Header Section */}
            <div className="bg-gray-50 p-2 border-b sm:p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-gray-800 truncate sm:text-lg">{viewRequest.documentType}</h3>
                  <p className="text-gray-500 text-[9px] mt-0.5 truncate sm:text-xs">Request ID: {viewRequest._id}</p>
                </div>
                
                {/* Status Badge */}
                <div className="flex-shrink-0">
                  {viewRequest.status === "pending" && (
                    <div className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-medium whitespace-nowrap sm:px-3 sm:py-1 sm:text-xs">
                      PENDING
                    </div>
                  )}
                  {viewRequest.status === "accepted" && (
                    <div className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[9px] font-medium whitespace-nowrap sm:px-3 sm:py-1 sm:text-xs">
                      APPROVED
                    </div>
                  )}
                  {(viewRequest.status === "declined" || viewRequest.status === "rejected") && (
                    <div className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[9px] font-medium whitespace-nowrap sm:px-3 sm:py-1 sm:text-xs">
                      REJECTED
                    </div>
                  )}
                  {viewRequest.status === "completed" && (
                    <div className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-medium whitespace-nowrap sm:px-3 sm:py-1 sm:text-xs">
                      RELEASED
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Document Details */}
            <div className="p-2 sm:p-4">
              <h4 className="text-[10px] font-medium text-gray-800 mb-1 sm:text-sm sm:mb-1.5">Request Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mb-2 sm:gap-2">
                <div>
                  <p className="text-[8px] font-medium text-gray-500 uppercase sm:text-xs">PURPOSE</p>
                  <p className="mt-0.5 text-[10px] leading-tight sm:text-sm">{viewRequest.purpose}</p>
                </div>
                
                <div>
                  <p className="text-[8px] font-medium text-gray-500 uppercase sm:text-xs">DOCUMENT TYPE</p>
                  <p className="mt-0.5 text-[10px] sm:text-sm">{viewRequest.documentType}</p>
                </div>
                
                <div>
                  <p className="text-[8px] font-medium text-gray-500 uppercase sm:text-xs">QUANTITY</p>
                  <p className="mt-0.5 text-[10px] sm:text-sm">{viewRequest.quantity || 1}</p>
                </div>
                
                <div>
                  <p className="text-[8px] font-medium text-gray-500 uppercase sm:text-xs">REQUESTED DATE</p>
                  <p className="mt-0.5 text-[10px] sm:text-sm">{viewRequest.requestedAt ? new Date(viewRequest.requestedAt).toLocaleString() : "-"}</p>
                </div>
                
                <div>
                  <p className="text-[8px] font-medium text-gray-500 uppercase sm:text-xs">LAST UPDATED</p>
                  <p className="mt-0.5 text-[10px] sm:text-sm">{viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString() : "-"}</p>
                </div>
                
                {/* Total Amount */}
                <div>
                  <p className="text-[8px] font-medium text-gray-500 uppercase sm:text-xs">TOTAL AMOUNT</p>
                  {(() => {
                    const quantity = viewRequest.quantity || 1;
                    let baseAmount = 0;
                    
                    if (viewRequest.documentType === "Indigency") {
                      baseAmount = 0;
                    } else if (viewRequest.documentType === "Barangay Clearance") {
                      baseAmount = 100;
                    } else if (viewRequest.documentType === "Business Clearance") {
                      // Show amount for accepted or completed status
                      if ((viewRequest.status === "accepted" || viewRequest.status === "completed") && (viewRequest.feeAmount || viewRequest.amount)) {
                        baseAmount = viewRequest.feeAmount || viewRequest.amount || 0;
                      } else if (viewRequest.status === "pending") {
                        return <p className="mt-0.5 text-[10px] text-amber-600 italic sm:mt-1 sm:text-sm">Amount to be determined by admin</p>;
                      } else {
                        // For rejected status or if no amount set
                        baseAmount = 0;
                      }
                    }
                    
                    const totalAmount = baseAmount * quantity;
                    
                    if (baseAmount === 0) {
                      return <p className="mt-0.5 text-sm font-semibold text-gray-600 sm:mt-1 sm:text-lg">Free</p>;
                    } else {
                      return (
                        <p className="mt-0.5 text-sm font-semibold text-green-600 sm:mt-1 sm:text-lg">
                          ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      );
                    }
                  })()}
                </div>
                
                {viewRequest.documentType === "Business Clearance" && (
                  <div>
                    <p className="text-[8px] font-medium text-gray-500 uppercase sm:text-xs">BUSINESS NAME</p>
                    <p className="mt-0.5 text-[10px] sm:mt-1 sm:text-sm">{viewRequest.businessName || "-"}</p>
                  </div>
                )}
              </div>
              
              {/* Status Timeline */}
              <div className="mb-2">
                <h4 className="text-[10px] font-medium text-gray-800 mb-1 sm:text-sm sm:mb-1.5">Request Timeline</h4>
                
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-2 top-0 h-full w-px bg-gray-200 sm:left-3 sm:w-0.5"></div>
                  
                  {/* Timeline Steps */}
                  <div className="space-y-1.5 relative sm:space-y-2">
                    {/* Requested Step (Always shown) */}
                    <div className="flex items-start gap-1.5 sm:gap-0">
                      <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center z-10 sm:h-7 sm:w-7">
                        <CheckCircleOutlined className="text-white text-[9px] sm:text-xs" />
                      </div>
                      <div className="sm:ml-3">
                        <p className="text-[9px] font-medium text-gray-800 leading-tight sm:text-xs">Requested</p>
                        <p className="text-[8px] text-gray-500 sm:text-xs">{viewRequest.requestedAt ? new Date(viewRequest.requestedAt).toLocaleString() : "-"}</p>
                      </div>
                    </div>
                    
                    {/* Processing Step (Always shown but styled differently based on status) */}
                    <div className="flex items-start gap-1.5 sm:gap-0">
                      <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center z-10 sm:h-7 sm:w-7
                        ${viewRequest.status === "pending" ? "bg-amber-500" : "bg-blue-500"}`}>
                        <ClockCircleOutlined className="text-white text-[9px] sm:text-xs" />
                      </div>
                      <div className="sm:ml-3">
                        <p className="text-[9px] font-medium text-gray-800 leading-tight sm:text-xs">Processing</p>
                        <p className="text-[8px] text-gray-500 leading-tight sm:text-xs">
                          {viewRequest.status === "pending" 
                            ? "Your request is being processed" 
                            : "Your request has been processed"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Approved/Rejected Step (Shown when not pending) */}
                    {viewRequest.status !== "pending" && (
                      <div className="flex items-start gap-1.5 sm:gap-0">
                        <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center z-10 sm:h-7 sm:w-7
                          ${viewRequest.status === "accepted" || viewRequest.status === "completed" ? "bg-green-500" : "bg-red-500"}`}>
                          {viewRequest.status === "accepted" || viewRequest.status === "completed" ? (
                            <CheckCircleOutlined className="text-white text-[9px] sm:text-xs" />
                          ) : (
                            <CloseCircleOutlined className="text-white text-[9px] sm:text-xs" />
                          )}
                        </div>
                        <div className="sm:ml-3">
                          <p className="text-[9px] font-medium text-gray-800 leading-tight sm:text-xs">
                            {viewRequest.status === "accepted" || viewRequest.status === "completed" ? "Approved" : "Rejected"}
                          </p>
                          <p className="text-[8px] text-gray-500 sm:text-xs">
                            {viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString() : "-"}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Released Step (Shown only for released docs) */}
                    {viewRequest.status === "completed" && (
                      <div className="flex items-start gap-1.5 sm:gap-0">
                        <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center z-10 sm:h-7 sm:w-7">
                          <CheckCircleOutlined className="text-white text-[9px] sm:text-xs" />
                        </div>
                        <div className="sm:ml-3">
                          <p className="text-[9px] font-medium text-gray-800 leading-tight sm:text-xs">Released</p>
                          <p className="text-[8px] text-gray-500 leading-tight sm:text-xs">
                            {viewRequest.completedAt || viewRequest.releasedAt 
                              ? new Date(viewRequest.completedAt || viewRequest.releasedAt).toLocaleString() 
                              : "Your document has been released"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Blockchain Information (if available) */}
              {viewRequest.blockchain?.hash && (
                <div className="border-t border-gray-200 pt-2">
                  <h4 className="text-[10px] font-medium text-gray-800 mb-1 sm:text-sm sm:mb-1.5">Blockchain Verification</h4>
                  <div className="bg-gray-50 p-1.5 rounded space-y-1 sm:rounded-lg">
                    <div>
                      <p className="text-[8px] font-medium text-gray-500 uppercase sm:text-xs">HASH</p>
                      <p className="mt-0.5 font-mono text-[9px] break-all sm:text-xs">{viewRequest.blockchain.hash || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-medium text-gray-500 uppercase sm:text-xs">TRANSACTION ID</p>
                      <p className="mt-0.5 font-mono text-[9px] break-all sm:text-xs">{viewRequest.blockchain.lastTxId || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-medium text-gray-500 uppercase sm:text-xs">ISSUED BY</p>
                      <p className="mt-0.5 text-[10px] sm:text-sm">{viewRequest.blockchain.issuedBy || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-medium text-gray-500 uppercase sm:text-xs">ISSUED DATE</p>
                      <p className="mt-0.5 text-[10px] sm:text-sm">{viewRequest.blockchain.issuedAt ? new Date(viewRequest.blockchain.issuedAt).toLocaleString() : "-"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer with close button */}
            <div className="bg-gray-50 p-2 flex justify-end border-t sm:p-3">
              <Button 
                onClick={() => setViewOpen(false)}
                size="small"
                className="h-6 text-[10px] px-2 sm:h-8 sm:text-sm sm:px-4"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Request Modal */}
      <Modal
        title={null}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width={"90%"}
        style={{ maxWidth: "750px" }}
        bodyStyle={{ padding: 0 }}
        className="[&_.ant-modal-content]:p-0 [&_.ant-modal-close]:top-2 [&_.ant-modal-close]:right-2 [&_.ant-modal-close-x]:w-8 [&_.ant-modal-close-x]:h-8 [&_.ant-modal-close-x]:leading-8 [&_.ant-modal-close-x]:text-base sm:[&_.ant-modal-close]:top-4 sm:[&_.ant-modal-close]:right-4 sm:[&_.ant-modal-close-x]:w-12 sm:[&_.ant-modal-close-x]:h-12 sm:[&_.ant-modal-close-x]:leading-[3rem] sm:[&_.ant-modal-close-x]:text-xl"
      >
        <div className="bg-gray-50 p-2 border-b sm:p-4">
          <h3 className="text-xs font-semibold text-gray-800 sm:text-base">Request New Document</h3>
          <p className="text-gray-500 text-[9px] mt-0.5 sm:text-xs">
            Fill out the form below to request an official document
          </p>
        </div>
        
        <div className="p-2 sm:p-4">
          <Form 
            form={createForm} 
            layout="vertical" 
            className="space-y-1.5 sm:space-y-2 [&_.ant-form-item]:mb-2 sm:[&_.ant-form-item]:mb-4 [&_.ant-form-item-label]:pb-0.5 sm:[&_.ant-form-item-label]:pb-1"
            initialValues={{
              residentId: resident?._id,
              requestFor: resident?._id,
              quantity: 1,
              amount: 0
            }}
            onValuesChange={(changed, values) => {
              // Handle business name field visibility
              if ("documentType" in changed && changed.documentType !== "Business Clearance") {
                createForm.setFieldsValue({ businessName: undefined });
              }
              
              // Handle amount updates based on document type or quantity
              if ("documentType" in changed || "quantity" in changed) {
                const currentDocType = changed.documentType || values.documentType;
                const currentQuantity = changed.quantity || values.quantity || 1;
                const baseAmount = documentPricing[currentDocType] || 0;
                const totalAmount = baseAmount * currentQuantity;
                createForm.setFieldsValue({ amount: totalAmount });
              }
            }}
            onFinish={async (values) => {
              try {
                setCreating(true);
                const token = localStorage.getItem("token");
                if (!token) {
                  message.error("You are not logged in. Please log in first.");
                  setCreating(false);
                  return;
                }
                
                // Prepare the payload with new fields
                const payload = {
                  documentType: values.documentType,
                  quantity: values.quantity,
                  purpose: values.purpose,
                  amount: values.amount,
                  residentId: values.residentId,
                  requestFor: values.requestFor,
                  ...(values.businessName && { businessName: values.businessName })
                };
                
                await axios.post(
                  `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/document-requests`,
                  payload,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                message.success("Document request submitted successfully!");
                setCreateOpen(false);
                createForm.resetFields();
                fetchRequests();
                // Refresh payment status after successful request
                checkPaymentStatus();
              } catch (err) {
                console.error("Error creating request:", err);
                if (err.response?.status === 401) {
                  message.error("Authentication error. Please log in again.");
                } else if (err.response?.status === 403 && err.response?.data?.reason === "NOT_IN_HOUSEHOLD") {
                  // Handle household validation error
                  message.error(err.response.data.message || "You must be part of a household to request documents");
                  setCreateOpen(false);
                  setIsInHousehold(false);
                } else if (err.response?.status === 403) {
                  message.error("Authentication error. Please log in again.");
                } else if (err.response?.status === 400 && err.response?.data?.paymentStatus) {
                  // Handle payment validation error
                  message.error(err.response.data.message || "Outstanding payments must be settled first");
                  setCreateOpen(false);
                  // Update payment status to show current state
                  setPaymentStatus({
                    canRequestDocuments: false,
                    paymentStatus: err.response.data.paymentStatus,
                    message: err.response.data.details
                  });
                } else {
                  message.error(err?.response?.data?.message || "Failed to create document request");
                }
              }
              setCreating(false);
            }}
          >
            {/* Resident Dropdown */}
            <Form.Item 
              name="residentId" 
              label={<span className="text-gray-700 font-medium text-[10px] sm:text-sm">Resident</span>}
              rules={[{ required: true, message: 'Please select a resident' }]}
              help={<span className="text-[8px] sm:text-xs">Select resident</span>}
            >
              <Select
                placeholder={resident ? `${resident.firstName} ${resident.lastName} (You)` : "Loading resident..."}
                size="small"
                className="w-full [&_.ant-select-selector]:h-7 [&_.ant-select-selector]:text-[10px] sm:[&_.ant-select-selector]:h-8 sm:[&_.ant-select-selector]:text-sm lg:size-default"
                disabled={!resident}
              >
                {resident && (
                  <Select.Option value={resident._id}>
                    {resident.firstName} {resident.lastName} (You)
                  </Select.Option>
                )}
              </Select>
            </Form.Item>

            {/* Request For Dropdown */}
            <Form.Item 
              name="requestFor" 
              label={<span className="text-gray-700 font-medium text-[10px] sm:text-sm">Request For</span>}
              rules={[{ required: true, message: 'Please select who this request is for' }]}
              help={<span className="text-[8px] sm:text-xs">Select household member</span>}
            >
              <Select
                placeholder="Select household member"
                size="small"
                className="w-full [&_.ant-select-selector]:h-7 [&_.ant-select-selector]:text-[10px] sm:[&_.ant-select-selector]:h-8 sm:[&_.ant-select-selector]:text-sm lg:size-default"
                loading={!resident}
              >
                {resident && (
                  <Select.Option value={resident._id}>
                    {resident.firstName} {resident.lastName} (You)
                  </Select.Option>
                )}
                {householdMembers.map((member) => (
                  <Select.Option key={member._id} value={member._id}>
                    {member.firstName} {member.lastName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* Document Type - Updated options */}
            <Form.Item 
              name="documentType" 
              label={<span className="text-gray-700 font-medium text-[10px] sm:text-sm">Document Type</span>}
              rules={[{ required: true, message: 'Please select a document type' }]}
              help={<span className="text-[8px] sm:text-xs">Choose document type</span>}
            >
              <Select
                placeholder="Select document type"
                size="small"
                className="w-full [&_.ant-select-selector]:h-7 [&_.ant-select-selector]:text-[10px] sm:[&_.ant-select-selector]:h-8 sm:[&_.ant-select-selector]:text-sm lg:size-default"
                onChange={(value) => {
                  // Update the amount field based on document type and current quantity
                  const currentQuantity = createForm.getFieldValue("quantity") || 1;
                  const baseAmount = documentPricing[value] || 0;
                  const totalAmount = baseAmount * currentQuantity;
                  createForm.setFieldValue("amount", totalAmount);
                }}
                options={[
                  { value: "Indigency", label: "Certificate of Indigency" },
                  { value: "Barangay Clearance", label: "Barangay Clearance" },
                  { value: "Business Clearance", label: "Business Clearance" },
                ]}
              />
            </Form.Item>

            {/* Amount Field - Read only */}
            <Form.Item 
              name="amount" 
              label={<span className="text-gray-700 font-medium text-[10px] sm:text-sm">Amount</span>}
              rules={[{ required: true, message: 'Amount is required' }]}
              help={<span className="text-[8px] sm:text-xs">Amount is automatically calculated based on document type and quantity</span>}
            >
              <InputNumber 
                min={0} 
                className="w-full [&_.ant-input-number-input]:h-7 [&_.ant-input-number-input]:text-[10px] sm:[&_.ant-input-number-input]:h-8 sm:[&_.ant-input-number-input]:text-sm" 
                disabled
                formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                placeholder="Amount will be calculated automatically"
                size="small"
              />
            </Form.Item>

            {selectedDocType === "Business Clearance" && (
              <Form.Item
                name="businessName"
                label={<span className="text-gray-700 font-medium text-[10px] sm:text-sm">Business Name</span>}
                rules={[{ required: true, message: 'Please enter your business name' }]}
                help={<span className="text-[8px] sm:text-xs">Enter your business name</span>}
              >
                <Input 
                  placeholder="Enter registered business name" 
                  size="small"
                  className="[&_input]:h-7 [&_input]:text-[10px] sm:[&_input]:h-8 sm:[&_input]:text-sm"
                />
              </Form.Item>
            )}
            <Form.Item 
              name="quantity" 
              label={<span className="text-gray-700 font-medium text-[10px] sm:text-sm">Quantity</span>} 
              initialValue={1}
              rules={[{ required: true, type: 'number', min: 1, message: 'Enter quantity' }]}
              help={<span className="text-[8px] sm:text-xs">Enter quantity</span>}
            >
              <InputNumber
                min={1}
                className="w-full [&_.ant-input-number-input]:h-7 [&_.ant-input-number-input]:text-[10px] sm:[&_.ant-input-number-input]:h-8 sm:[&_.ant-input-number-input]:text-sm"
                parser={value => (value ? value.replace(/[^\d]/g, '') : '')}
                onKeyPress={e => {
                  if (!/\d/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(value) => {
                  // Update the amount field based on quantity and current document type
                  const currentDocType = createForm.getFieldValue("documentType");
                  const currentQuantity = value || 1;
                  const baseAmount = documentPricing[currentDocType] || 0;
                  const totalAmount = baseAmount * currentQuantity;
                  createForm.setFieldValue("amount", totalAmount);
                }}
                size="small"
              />
            </Form.Item>
            
            <Form.Item 
              name="purpose" 
              label={<span className="text-gray-700 font-medium text-[10px] sm:text-sm">Purpose</span>}
              rules={[{ required: true, message: 'Please specify the purpose for your request' }]}
              help={<span className="text-[8px] sm:text-xs">Clearly state why you need this document</span>}
            >
              <Input.TextArea 
                rows={3}
                placeholder="Example: For employment requirements, school enrollment, business registration, etc."
                className="w-full [&_textarea]:text-[10px] sm:[&_textarea]:text-sm sm:rows-4"
                size="small"
              />
            </Form.Item>
            
            <div className="bg-blue-50 p-1.5 rounded border border-blue-100 mb-2 sm:p-2 sm:rounded-lg">
              <h4 className="text-blue-800 font-medium text-[9px] mb-0.5 sm:text-xs">Important Information</h4>
              <p className="text-blue-700 text-[8px] leading-tight sm:text-xs">
                Your document request will be reviewed by barangay officials. Processing time may vary depending on the type of document and current volume of requests.
              </p>
            </div>
            
            <div className="flex justify-end gap-2 sm:gap-3">
              <Button 
                onClick={() => setCreateOpen(false)}
                size="small"
                className="h-6 text-[10px] px-2 sm:h-8 sm:text-sm sm:px-4"
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={creating}
                size="small"
                className="bg-blue-600 hover:bg-blue-700 h-6 text-[10px] px-2 sm:h-8 sm:text-sm sm:px-4"
                disabled={!isInHousehold || (paymentStatus?.canRequestDocuments === false && paymentStatus?.paymentStatus)}
              >
                Submit Request
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </>
  );
}
