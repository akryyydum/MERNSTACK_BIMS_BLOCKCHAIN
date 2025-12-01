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
import apiClient from "@/utils/apiClient";
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
      console.log("Fetching resident profile...");
      const res = await apiClient.get('/api/resident/profile');
      
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
      console.log("Fetching household info...");
      const res = await apiClient.get('/api/resident/household');
      
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
      const res = await apiClient.get('/api/document-requests/payment-status');
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
      const res = await apiClient.get('/api/resident/payments');
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
      const res = await apiClient.get('/api/document-requests');
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
      const chainRes = await apiClient.get('/api/blockchain/requests/me');
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
      <main className="mx-auto w-full max-w-9xl space-y-4 px-3 py-4 sm:px-4 lg:px-6">
        <Card className="w-full border border-slate-200 shadow-md bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-800">My Document Requests</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-600">
                  Submit and track your official barangay documents
                </CardDescription>
              </div>
              <Button 
                type="primary"
                size="large"
                icon={<FileTextOutlined />}
                onClick={handleNewRequest}
                className={`bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-2 w-full sm:w-auto ${
                  (!isInHousehold || (paymentStatus?.canRequestDocuments === false && paymentStatus?.paymentStatus))
                    ? "bg-gray-400 hover:bg-gray-500" 
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={!isInHousehold || (paymentStatus?.canRequestDocuments === false && paymentStatus?.paymentStatus)}
                loading={checkingPayment}
              >
                New Request
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Household Status Alert */}
        {!isInHousehold && (
          <Card className="w-full border border-amber-200 bg-amber-50 shadow-md">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <WarningOutlined className="text-amber-600 text-sm sm:text-base" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-semibold text-amber-900 mb-1.5">
                    Household Registration Required
                  </h3>
                  <p className="text-amber-800 text-xs sm:text-sm">
                    You must be registered as part of a household before you can request documents. Please visit the barangay office to register your household or to be added to an existing household.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Status Alert */}
        {paymentStatus && !paymentStatus.canRequestDocuments && paymentStatus.paymentStatus && (
            <CardContent className="p-3 sm:p-4">
              <PaymentStatusAlert 
                paymentStatus={paymentStatus}
                onPaymentClick={handleGoToPayments}
              />
            </CardContent>
        )}


        <Card className="w-full border border-slate-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">Request Statistics</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">Overview of your document requests</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            {/* Request Statistics Cards */}
            <div className="grid grid-cols-2 grid-rows-2 gap-2 sm:grid-cols-2 sm:grid-rows-2 lg:grid-cols-4 lg:grid-rows-1 sm:gap-4">
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                      <FileTextOutlined className="text-slate-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">All Requests</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">{totalRequests}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">Total documents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-amber-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-200">
                      <ClockCircleOutlined className="text-amber-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Pending</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">{pendingRequests}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">In progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-emerald-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                      <CheckCircleOutlined className="text-emerald-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Approved</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">{approvedRequests}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">Accepted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-rose-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 border border-rose-200">
                      <CloseCircleOutlined className="text-rose-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Rejected</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">{rejectedRequests}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">Declined</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
          
        {/* Document Requests Table */}
        <Card className="w-full border border-slate-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">Document Requests</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">Track and manage your document requests</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            {/* Filter Tabs */}
            <Tabs 
              defaultActiveKey="all"
              className="mb-4"
              type="card"
              items={[
                {
                  key: 'all',
                  label: 'All Requests',
                  children: null,
                },
                {
                  key: 'pending',
                  label: 'Pending',
                  children: null,
                },
                {
                  key: 'approved',
                  label: 'Approved',
                  children: null,
                },
                {
                  key: 'rejected',
                  label: 'Rejected',
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
          
          <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
            <table className="min-w-full bg-white table-auto">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Document</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Document For</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Purpose</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">Blockchain</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide hidden lg:table-cell">Amount</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <Spin tip="Loading requests..." />
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-10 sm:py-12">
                      <div className="flex flex-col items-center">
                        <FileTextOutlined style={{ fontSize: '48px' }} className="text-slate-400 mb-3" />
                        <p className="text-slate-500 font-medium text-base sm:text-lg">No document requests found</p>
                        <p className="text-slate-400 text-sm sm:text-base mt-1">Click "New Request" to create a document request</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                            <FileTextOutlined className="text-slate-600 text-base" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{request.documentType}</p>
                            <p className="text-xs text-slate-500">ID: {request._id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-700 hidden md:table-cell">
                        <div className="flex items-center">
                          {(() => {
                            const person = request.requestFor || request.residentId;
                            return person ? (
                              <div>
                                <p className="font-medium text-slate-800 text-sm">
                                  {[person.firstName, person.lastName].filter(Boolean).join(" ")}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {person._id === resident?._id ? "(You)" : "(Family Member)"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-700 hidden sm:table-cell">
                        <div className="max-w-xs truncate">{request.purpose}</div>
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{new Date(request.requestedAt).toLocaleDateString()}</p>
                          <p className="text-xs text-slate-500">{new Date(request.requestedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 hidden sm:table-cell">
                        {request.status === "pending" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-md bg-amber-100 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        )}
                        {request.status === "accepted" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Approved
                          </span>
                        )}
                        {(request.status === "declined" || request.status === "rejected") && (
                          <span className="px-2 py-1 text-xs font-medium rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                            Rejected
                          </span>
                        )}
                        {request.status === "completed" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 border border-blue-200">
                            Released
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell">
                        {(() => {
                          const s = request.blockchainStatus || 'not_registered';
                          const upper = s === 'not_registered' ? 'Unregistered' : s.charAt(0).toUpperCase() + s.slice(1);
                          const colorMap = {
                            verified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                            edited: 'bg-orange-100 text-orange-700 border-orange-200',
                            deleted: 'bg-rose-100 text-rose-700 border-rose-200',
                            error: 'bg-rose-100 text-rose-700 border-rose-200',
                            not_registered: 'bg-slate-100 text-slate-600 border-slate-200'
                          };
                          return (
                            <span className={`px-2 py-1 text-xs font-medium rounded-md border ${colorMap[s] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {upper}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-4 hidden lg:table-cell">
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
                                <span className="text-sm font-medium text-emerald-600">
                                  ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              );
                            } else {
                              return <span className="text-sm text-slate-400">TBD</span>;
                            }
                          }
                          
                          const totalAmount = baseAmount * quantity;
                          
                          if (baseAmount === 0) {
                            return <span className="text-sm text-slate-600">Free</span>;
                          } else {
                            return (
                              <span className="text-sm text-slate-600">
                                ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            );
                          }
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        <Button
                          type="primary"
                          onClick={() => openView(request)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          View Details
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
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredRequests.length)} of {filteredRequests.length} requests
              </p>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={filteredRequests.length}
                showSizeChanger={false}
                showQuickJumper={false}
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
      width={900}
      className="document-tracking-modal"
    >
        {viewRequest && (
          <div>
            {/* Header Section */}
            <div className="bg-slate-50 p-2 border-b border-slate-200">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-800 leading-tight">{viewRequest.documentType}</h3>
                  <p className="text-slate-600 text-xs mt-0.5">Request ID: {viewRequest._id}</p>
                </div>
                {/* Status Badge */}
                <div className="flex-shrink-0">
                  {viewRequest.status === "pending" && (
                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200">Pending</span>
                  )}
                  {viewRequest.status === "accepted" && (
                    <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200">Approved</span>
                  )}
                  {(viewRequest.status === "declined" || viewRequest.status === "rejected") && (
                    <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200">Rejected</span>
                  )}
                  {viewRequest.status === "completed" && (
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Released</span>
                  )}
                </div>
              </div>
            </div>
            {/* Document Details */}
            <div className="p-3">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Request Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div>
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">PURPOSE</p>
                  <p className="mt-0.5 text-xs text-slate-800">{viewRequest.purpose}</p>
                </div>
                
                <div>
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">DOCUMENT TYPE</p>
                  <p className="mt-0.5 text-xs text-slate-800">{viewRequest.documentType}</p>
                </div>
                
                <div>
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">QUANTITY</p>
                  <p className="mt-0.5 text-xs text-slate-800">{viewRequest.quantity || 1}</p>
                </div>
                
                <div>
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">REQUESTED DATE</p>
                  <p className="mt-0.5 text-xs text-slate-800">{viewRequest.requestedAt ? new Date(viewRequest.requestedAt).toLocaleString() : "-"}</p>
                </div>
                
                <div>
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">LAST UPDATED</p>
                  <p className="mt-0.5 text-xs text-slate-800">{viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString() : "-"}</p>
                </div>
                
                {/* Total Amount */}
                <div>
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">TOTAL AMOUNT</p>
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
                        return <p className="mt-1 text-sm text-amber-600 italic">Amount to be determined by admin</p>;
                      } else {
                        // For rejected status or if no amount set
                        baseAmount = 0;
                      }
                    }
                    
                    const totalAmount = baseAmount * quantity;
                    
                    if (baseAmount === 0) {
                      return <p className="mt-0.5 text-base font-semibold text-slate-600">Free</p>;
                    } else {
                      return (
                        <p className="mt-0.5 text-base font-semibold text-emerald-600">
                          ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      );
                    }
                  })()}
                </div>
                
                {viewRequest.documentType === "Business Clearance" && (
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">BUSINESS NAME</p>
                    <p className="mt-0.5 text-xs text-slate-800">{viewRequest.businessName || "-"}</p>
                  </div>
                )}
              </div>
              
              {/* Status Timeline */}
              <div className="mb-2">
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Request Timeline</h4>
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-2 top-0 h-full w-0.5 bg-slate-200"></div>
                  {/* Timeline Steps */}
                  <div className="space-y-2 relative">
                    {/* Requested Step (Always shown) */}
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center z-10">
                        <CheckCircleOutlined className="text-white text-xs" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-800">Requested</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{viewRequest.requestedAt ? new Date(viewRequest.requestedAt).toLocaleString() : "-"}</p>
                      </div>
                    </div>
                    
                    {/* Processing Step (Always shown but styled differently based on status) */}
                    <div className="flex items-start gap-2">
                      <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center z-10 ${viewRequest.status === "pending" ? "bg-amber-500" : "bg-blue-500"}`}>
                        <ClockCircleOutlined className="text-white text-xs" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-800">Processing</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {viewRequest.status === "pending" 
                            ? "Your request is being processed" 
                            : "Your request has been processed"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Approved/Rejected Step (Shown when not pending) */}
                    {viewRequest.status !== "pending" && (
                      <div className="flex items-start gap-2">
                        <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center z-10 ${viewRequest.status === "accepted" || viewRequest.status === "completed" ? "bg-emerald-500" : "bg-rose-500"}`}>
                          {viewRequest.status === "accepted" || viewRequest.status === "completed" ? (
                            <CheckCircleOutlined className="text-white text-xs" />
                          ) : (
                            <CloseCircleOutlined className="text-white text-xs" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-800">{viewRequest.status === "accepted" || viewRequest.status === "completed" ? "Approved" : "Rejected"}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString() : "-"}</p>
                          {viewRequest.status === "declined" && viewRequest.declineReason && (
                            <div className="mt-2 bg-rose-50 border border-rose-200 rounded p-2">
                              <p className="text-[11px] font-medium text-rose-700 mb-1">Reason for rejection:</p>
                              <p className="text-xs text-rose-600">{viewRequest.declineReason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Released Step (Shown only for released docs) */}
                    {viewRequest.status === "completed" && (
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center z-10">
                          <CheckCircleOutlined className="text-white text-xs" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-800">Released</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{viewRequest.completedAt || viewRequest.releasedAt ? new Date(viewRequest.completedAt || viewRequest.releasedAt).toLocaleString() : "Your document has been released"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Blockchain Information (if available) */}
              {viewRequest.blockchain?.hash && (
                <div className="border-t border-slate-200 pt-3">
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Blockchain Verification</h4>
                  <div className="bg-slate-50 p-2 rounded-lg space-y-2 border border-slate-200">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">HASH</p>
                      <p className="mt-0.5 font-mono text-xs break-all text-slate-800">{viewRequest.blockchain.hash || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">TRANSACTION ID</p>
                      <p className="mt-0.5 font-mono text-xs break-all text-slate-800">{viewRequest.blockchain.lastTxId || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">ISSUED BY</p>
                      <p className="mt-0.5 text-xs text-slate-800">{viewRequest.blockchain.issuedBy || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">ISSUED DATE</p>
                      <p className="mt-0.5 text-xs text-slate-800">{viewRequest.blockchain.issuedAt ? new Date(viewRequest.blockchain.issuedAt).toLocaleString() : "-"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer with close button */}
            <div className="bg-slate-50 p-2 flex justify-end border-t border-slate-200">
              <Button 
                onClick={() => setViewOpen(false)}
                className="bg-slate-600 hover:bg-slate-700 text-white text-xs px-3 py-1"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Request Modal - Two Step */}
      {(() => {
        const [createStep, setCreateStep] = React.useState(0); // 0 = instructions, 1 = form
        // Patch: useEffect to reset step on open/close
        React.useEffect(() => { if (!createOpen) setCreateStep(0); }, [createOpen]);
        return (
          <Modal
            title={<span className="text-lg font-bold text-slate-800">Request New Document</span>}
            open={createOpen}
            onCancel={() => {
              if (createStep === 1) setCreateStep(0);
              else setCreateOpen(false);
            }}
            footer={null}
            width={750}
          >
            {createStep === 0 ? (
              <div className="p-5">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-5">
                  <h4 className="text-blue-800 font-medium text-base mb-2">Important Information</h4>
                  <p className="text-blue-700 text-sm leading-relaxed">
                    Your document request will be reviewed by barangay officials. Processing time may vary depending on the type of document and current volume of requests.
                  </p>
                  <ul className="text-blue-700 text-sm mt-3 list-disc pl-5">
                    <li>Ensure all information is accurate and complete.</li>
                    <li>Payment (if required) must be settled before release.</li>
                  </ul>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button onClick={() => setCreateOpen(false)} className="bg-slate-600 hover:bg-slate-700 text-white">Cancel</Button>
                  <Button type="primary" className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreateStep(1)}>Next</Button>
                </div>
              </div>
            ) : (
              <div className="py-5">
                <Form 
                  form={createForm} 
                  layout="vertical"
                  initialValues={{
                    residentId: resident?._id,
                    requestFor: resident?._id,
                    quantity: 1,
                    amount: 0
                  }}
                  onValuesChange={(changed, values) => {
                    if ("documentType" in changed && changed.documentType !== "Business Clearance") {
                      createForm.setFieldsValue({ businessName: undefined });
                    }
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
                      const payload = {
                        documentType: values.documentType,
                        quantity: values.quantity,
                        purpose: values.purpose,
                        amount: values.amount,
                        residentId: values.residentId,
                        requestFor: values.requestFor,
                        ...(values.businessName && { businessName: values.businessName })
                      };
                      await apiClient.post(
                        '/api/document-requests',
                        payload
                      );
                      message.success("Document request submitted successfully!");
                      setCreateOpen(false);
                      createForm.resetFields();
                      fetchRequests();
                      checkPaymentStatus();
                    } catch (err) {
                      console.error("Error creating request:", err);
                      if (err.response?.status === 401) {
                        message.error("Authentication error. Please log in again.");
                      } else if (err.response?.status === 403 && err.response?.data?.reason === "NOT_IN_HOUSEHOLD") {
                        message.error(err.response.data.message || "You must be part of a household to request documents");
                        setCreateOpen(false);
                        setIsInHousehold(false);
                      } else if (err.response?.status === 403) {
                        message.error("Authentication error. Please log in again.");
                      } else if (err.response?.status === 400 && err.response?.data?.paymentStatus) {
                        message.error(err.response.data.message || "Outstanding payments must be settled first");
                        setCreateOpen(false);
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
                    label={<span className="text-slate-700 font-medium text-sm">Resident</span>}
                    rules={[{ required: true, message: 'Please select a resident' }]}
                  >
                    <Select
                      placeholder={resident ? `${resident.firstName} ${resident.lastName} (You)` : "Loading resident..."}
                      className="w-full"
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
                    label={<span className="text-slate-700 font-medium text-sm">Request For</span>}
                    rules={[{ required: true, message: 'Please select who this request is for' }]}
                  >
                    <Select
                      placeholder="Select household member"
                      className="w-full"
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
                    label={<span className="text-slate-700 font-medium text-sm">Document Type</span>}
                    rules={[{ required: true, message: 'Please select a document type' }]}
                  >
                    <Select
                      placeholder="Select document type"
                      className="w-full"
                      onChange={(value) => {
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
                  {/* Amount & Quantity in one row */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Form.Item 
                        name="amount" 
                        label={<span className="text-slate-700 font-medium text-sm">Amount</span>}
                        rules={[{ required: true, message: 'Amount is required' }]}
                        extra="Amount is auto-calculated based on type and quantity."
                      >
                        <InputNumber 
                          min={0} 
                          className="w-full" 
                          disabled
                          formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(value) => value.replace(/\₱\s?|(,*)/g, '')}
                          placeholder="Amount will be calculated automatically"
                        />
                      </Form.Item>
                    </div>
                    <div className="w-40">
                      <Form.Item 
                        name="quantity" 
                        label={<span className="text-slate-700 font-medium text-sm">Quantity</span>} 
                        initialValue={1}
                        rules={[{ required: true, type: 'number', min: 1, message: 'Enter quantity' }]}
                      >
                        <InputNumber
                          min={1}
                          className="w-full"
                          parser={value => (value ? value.replace(/[^\d]/g, '') : '')}
                          onKeyPress={e => {
                            if (!/\d/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(value) => {
                            const currentDocType = createForm.getFieldValue("documentType");
                            const currentQuantity = value || 1;
                            const baseAmount = documentPricing[currentDocType] || 0;
                            const totalAmount = baseAmount * currentQuantity;
                            createForm.setFieldValue("amount", totalAmount);
                          }}
                        />
                      </Form.Item>
                    </div>
                  </div>
                  {selectedDocType === "Business Clearance" && (
                    <Form.Item
                      name="businessName"
                      label={<span className="text-slate-700 font-medium text-sm">Business Name</span>}
                      rules={[{ required: true, message: 'Please enter your business name' }]}
                    >
                      <Input 
                        placeholder="Enter registered business name" 
                        className="w-full"
                      />
                    </Form.Item>
                  )}
                  <Form.Item 
                    name="purpose" 
                    label={<span className="text-slate-700 font-medium text-sm">Purpose</span>}
                    rules={[{ required: true, message: 'Please specify the purpose for your request' }]}
                    extra="Clearly state why you need this document"
                  >
                    <Input.TextArea 
                      rows={4}
                      placeholder="Example: For employment requirements, school enrollment, business registration, etc."
                      className="w-full"
                    />
                  </Form.Item>
                  <div className="flex justify-between gap-3 pt-4 border-t border-slate-200 -mb-5 -mx-6 px-6 pb-5 bg-slate-50">
                    <Button onClick={() => setCreateStep(0)} className="bg-slate-600 hover:bg-slate-700 text-white">Previous</Button>
                    <Button 
                      type="primary" 
                      htmlType="submit"
                      loading={creating}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={!isInHousehold || (paymentStatus?.canRequestDocuments === false && paymentStatus?.paymentStatus)}
                    >
                      Submit Request
                    </Button>
                  </div>
                </Form>
              </div>
            )}
          </Modal>
        );
      })()}
    </>
  );
}
