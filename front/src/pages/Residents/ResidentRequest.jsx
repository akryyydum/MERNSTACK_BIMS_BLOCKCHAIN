import React, { useEffect, useState } from "react";
import { Table, Input, InputNumber, Button, Modal, Descriptions, Tag, Select, message, Form, Tabs, Pagination } from "antd";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { 
  UserOutlined, 
  FileTextOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileOutlined,
  DownloadOutlined
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
  
  // New state for form enhancements
  const [householdMembers, setHouseholdMembers] = useState([]);
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
      // Fallback to localStorage
      const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
      console.log("Fallback to localStorage userProfile:", userProfile);
      if (userProfile._id) {
        setResident(userProfile);
        createForm.setFieldsValue({
          residentId: userProfile._id,
          requestFor: userProfile._id
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
        return;
      }

      console.log("Fetching household info...");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/household`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log("Household API response:", res.data);
      
      if (res.data && res.data.members) {
        // Filter out the current resident from members list to avoid duplication
        // The current resident will be shown separately as "You"
        const currentUserProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        console.log("Current user profile:", currentUserProfile);
        
        // Filter members that aren't the current user
        const otherMembers = res.data.members.filter(member => {
          console.log("Checking member:", member);
          return member._id !== currentUserProfile._id;
        });
        
        console.log("Other household members:", otherMembers);
        setHouseholdMembers(otherMembers);
      } else {
        console.log("No members found in household data");
        setHouseholdMembers([]);
      }
    } catch (error) {
      console.error("Error fetching household information:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);
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
      setRequests(res.data);
      
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
      <main className="mx-auto w-full max-w-9xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold text-slate-900">My Document Requests</CardTitle>
              <CardDescription>
                Submit and track your official barangay documents
              </CardDescription>
            </div>
            <Button 
              type="primary" 
              size="large" 
              onClick={handleNewRequest}
              className={`shadow-sm flex items-center gap-1 ${
                paymentStatus?.canRequestDocuments !== false || !paymentStatus?.paymentStatus
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "bg-gray-400 hover:bg-gray-500"
              }`}
              icon={<FileTextOutlined />}
              disabled={paymentStatus?.canRequestDocuments === false && paymentStatus?.paymentStatus}
              loading={checkingPayment}
            >
              New Request
            </Button>
          </CardHeader>
        </Card>

        {/* Payment Status Alert */}
        {paymentStatus && !paymentStatus.canRequestDocuments && paymentStatus.paymentStatus && (
          <div className="rounded-lg border px-4 py-3 text-sm text-rose-700 mb-5">
            <PaymentStatusAlert 
              paymentStatus={paymentStatus}
              onPaymentClick={handleGoToPayments}
            />
          </div>
        )}


        <Card className="w-full">
          <CardContent className="space-y-6">
            {/* Request Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="w-full border border-blue-200 bg-blue-50">
                <CardContent className="space-y-2 px-4 py-5 sm:px-6">
                  <p className="text-sm font-medium text-blue-700">All Requests</p>
                  <p className="text-2xl font-bold text-blue-900">{totalRequests}</p>
                </CardContent>
              </Card>
              <Card className="w-full border border-amber-200 bg-amber-50">
                <CardContent className="space-y-2 px-4 py-5 sm:px-6">
                  <p className="text-sm font-medium text-amber-700">Pending</p>
                  <p className="text-2xl font-bold text-amber-900">{pendingRequests}</p>
                </CardContent>
              </Card>
              <Card className="w-full border border-emerald-200 bg-emerald-50">
                <CardContent className="space-y-2 px-4 py-5 sm:px-6">
                  <p className="text-sm font-medium text-emerald-700">Approved</p>
                  <p className="text-2xl font-bold text-emerald-900">{approvedRequests}</p>
                </CardContent>
              </Card>
              <Card className="w-full border border-rose-200 bg-rose-50">
                <CardContent className="space-y-2 px-4 py-5 sm:px-6">
                  <p className="text-sm font-medium text-rose-700">Rejected</p>
                  <p className="text-2xl font-bold text-rose-900">{rejectedRequests}</p>
                </CardContent>
              </Card>
            </div>
          
          {/* Filter Tabs */}
          <Tabs 
            defaultActiveKey="all"
            className="mb-6"
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
          
          <div className="border rounded-lg overflow-x-auto shadow-sm">
            <table className="min-w-full bg-white table-auto">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Document For</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Purpose</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Amount</th>
                  <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        <span className="text-gray-500">Loading requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <FileTextOutlined style={{ fontSize: '32px' }} className="text-gray-400 mb-2" />
                        <p className="text-gray-500 font-medium">No document requests found</p>
                        <p className="text-gray-400 text-sm mt-1">Click "New Request" to create a document request</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <FileTextOutlined className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{request.documentType}</p>
                            <p className="text-xs text-gray-500">ID: {request._id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 hidden md:table-cell">
                        <div className="flex items-center">
                          {(() => {
                            const person = request.requestFor || request.residentId;
                            return person ? (
                              <div>
                                <p className="font-medium text-gray-800">
                                  {[person.firstName, person.lastName].filter(Boolean).join(" ")}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {person._id === resident?._id ? "(You)" : "(Family Member)"}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 hidden sm:table-cell">
                        <div className="max-w-xs truncate">{request.purpose}</div>
                      </td>
                      <td className="py-4 px-6 hidden md:table-cell">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{new Date(request.requestedAt).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">{new Date(request.requestedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 hidden sm:table-cell">
                        {request.status === "pending" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                            PENDING
                          </span>
                        )}
                        {request.status === "accepted" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            APPROVED
                          </span>
                        )}
                        {(request.status === "declined" || request.status === "rejected") && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            REJECTED
                          </span>
                        )}
                        {request.status === "completed" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            RELEASED
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 hidden lg:table-cell">
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
                            if (request.status === "accepted" && (request.feeAmount || request.amount)) {
                              baseAmount = request.feeAmount || request.amount || 0;
                              const totalAmount = baseAmount * quantity;
                              return (
                                <span className="text-sm font-medium text-green-600">
                                  ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              );
                            } else {
                              return <span className="text-sm text-gray-400">TBD</span>;
                            }
                          }
                          
                          const totalAmount = baseAmount * quantity;
                          
                          if (baseAmount === 0) {
                            return <span className="text-sm text-gray-600">Free</span>;
                          } else {
                            return (
                              <span className="text-sm text-gray-600">
                                ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            );
                          }
                        })()}
                      </td>
                      <td className="py-4 px-6">
                        <Button
                          type="default"
                          size="small"
                          onClick={() => openView(request)}
                          className="border border-blue-600 text-blue-600 hover:bg-blue-50"
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
            <div className="mt-4 flex items-center justify-end">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={filteredRequests.length}
                showSizeChanger={false}
                showQuickJumper={true}
                showTotal={(total, range) => 
                  `${range[0]}-${range[1]} of ${total} requests`
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
      style={{ maxWidth: "700px" }}
      className="document-tracking-modal"
      bodyStyle={{ padding: 0 }}
    >
        {viewRequest && (
          <div>
            {/* Header Section */}
            <div className="bg-gray-50 p-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{viewRequest.documentType}</h3>
                  <p className="text-gray-500 mt-1">Request ID: {viewRequest._id}</p>
                </div>
                
                {/* Status Badge */}
                <div>
                  {viewRequest.status === "pending" && (
                    <div className="px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                      PENDING
                    </div>
                  )}
                  {viewRequest.status === "accepted" && (
                    <div className="px-4 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                      APPROVED
                    </div>
                  )}
                  {(viewRequest.status === "declined" || viewRequest.status === "rejected") && (
                    <div className="px-4 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                      REJECTED
                    </div>
                  )}
                  {viewRequest.status === "completed" && (
                    <div className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                      RELEASED
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Document Details */}
            <div className="p-4">
              <h4 className="text-lg font-medium text-gray-800 mb-3">Request Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">PURPOSE</p>
                  <p className="mt-1">{viewRequest.purpose}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">DOCUMENT TYPE</p>
                  <p className="mt-1">{viewRequest.documentType}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">QUANTITY</p>
                  <p className="mt-1">{viewRequest.quantity || 1}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">REQUESTED DATE</p>
                  <p className="mt-1">{viewRequest.requestedAt ? new Date(viewRequest.requestedAt).toLocaleString() : "-"}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">LAST UPDATED</p>
                  <p className="mt-1">{viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString() : "-"}</p>
                </div>
                
                {/* Total Amount */}
                <div>
                  <p className="text-sm font-medium text-gray-500">TOTAL AMOUNT</p>
                  {(() => {
                    const quantity = viewRequest.quantity || 1;
                    let baseAmount = 0;
                    
                    if (viewRequest.documentType === "Indigency") {
                      baseAmount = 0;
                    } else if (viewRequest.documentType === "Barangay Clearance") {
                      baseAmount = 100;
                    } else if (viewRequest.documentType === "Business Clearance") {
                      if (viewRequest.status === "accepted" && (viewRequest.feeAmount || viewRequest.amount)) {
                        baseAmount = viewRequest.feeAmount || viewRequest.amount || 0;
                      } else {
                        return <p className="mt-1 text-sm text-amber-600 italic">Amount to be determined by admin</p>;
                      }
                    }
                    
                    const totalAmount = baseAmount * quantity;
                    
                    if (baseAmount === 0) {
                      return <p className="mt-1 text-lg font-semibold text-gray-600">Free</p>;
                    } else {
                      return (
                        <p className="mt-1 text-lg font-semibold text-green-600">
                          ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      );
                    }
                  })()}
                </div>
                
                {viewRequest.documentType === "Business Clearance" && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">BUSINESS NAME</p>
                    <p className="mt-1">{viewRequest.businessName || "-"}</p>
                  </div>
                )}
              </div>
              
              {/* Status Timeline */}
              <div className="mb-4">
                <h4 className="text-lg font-medium text-gray-800 mb-2">Request Timeline</h4>
                
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-3.5 top-0 h-full w-0.5 bg-gray-200"></div>
                  
                  {/* Timeline Steps */}
                  <div className="space-y-4 relative">
                    {/* Requested Step (Always shown) */}
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center z-10">
                        <CheckCircleOutlined className="text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-800">Requested</p>
                        <p className="text-xs text-gray-500">{viewRequest.requestedAt ? new Date(viewRequest.requestedAt).toLocaleString() : "-"}</p>
                      </div>
                    </div>
                    
                    {/* Processing Step (Always shown but styled differently based on status) */}
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center z-10 
                        ${viewRequest.status === "pending" ? "bg-amber-500" : "bg-blue-500"}`}>
                        <ClockCircleOutlined className="text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-800">Processing</p>
                        <p className="text-xs text-gray-500">
                          {viewRequest.status === "pending" 
                            ? "Your request is being processed" 
                            : "Your request has been processed"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Approved/Rejected Step (Shown when not pending) */}
                    {viewRequest.status !== "pending" && (
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center z-10
                          ${viewRequest.status === "accepted" || viewRequest.status === "completed" ? "bg-green-500" : "bg-red-500"}`}>
                          {viewRequest.status === "accepted" || viewRequest.status === "completed" ? (
                            <CheckCircleOutlined className="text-white" />
                          ) : (
                            <CloseCircleOutlined className="text-white" />
                          )}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-800">
                            {viewRequest.status === "accepted" || viewRequest.status === "completed" ? "Approved" : "Rejected"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString() : "-"}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Released Step (Shown only for released docs) */}
                    {viewRequest.status === "completed" && (
                      <div className="flex items-start">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center z-10">
                          <CheckCircleOutlined className="text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-800">Released</p>
                          <p className="text-xs text-gray-500">Your document has been released</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Blockchain Information (if available) */}
              {viewRequest.blockchain?.hash && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-lg font-medium text-gray-800 mb-2">Blockchain Verification</h4>
                  <div className="bg-gray-50 p-2 rounded-lg space-y-2">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">HASH</p>
                      <p className="mt-1 font-mono text-sm break-all">{viewRequest.blockchain.hash || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">TRANSACTION ID</p>
                      <p className="mt-1 font-mono text-sm break-all">{viewRequest.blockchain.lastTxId || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">ISSUED BY</p>
                      <p className="mt-1">{viewRequest.blockchain.issuedBy || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">ISSUED DATE</p>
                      <p className="mt-1">{viewRequest.blockchain.issuedAt ? new Date(viewRequest.blockchain.issuedAt).toLocaleString() : "-"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer with close button */}
            <div className="bg-gray-50 p-2 flex justify-end border-t">
              <Button onClick={() => setViewOpen(false)}>Close</Button>
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
        style={{ maxWidth: "600px" }}
        bodyStyle={{ padding: 0 }}
      >
        <div className="bg-gray-50 p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-800">Request New Document</h3>
          <p className="text-gray-500 text-sm mt-1">
            Fill out the form below to request an official document
          </p>
        </div>
        
        <div className="p-6">
          <Form 
            form={createForm} 
            layout="vertical" 
            className="space-y-4"
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
                if (err.response?.status === 401 || err.response?.status === 403) {
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
              label={<span className="text-gray-700 font-medium">Resident</span>}
              rules={[{ required: true, message: 'Please select a resident' }]}
            >
              <Select
                placeholder={resident ? `${resident.firstName} ${resident.lastName} (You)` : "Loading resident..."}
                size="large"
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
              label={<span className="text-gray-700 font-medium">Request For</span>}
              rules={[{ required: true, message: 'Please select who this request is for' }]}
            >
              <Select
                placeholder="Select household member"
                size="large"
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
              label={<span className="text-gray-700 font-medium">Document Type</span>}
              rules={[{ required: true, message: 'Please select a document type' }]}
            >
              <Select
                placeholder="Select document type"
                size="large"
                className="w-full"
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
              label={<span className="text-gray-700 font-medium">Amount</span>}
              rules={[{ required: true, message: 'Amount is required' }]}
              help="Amount is automatically calculated based on document type and quantity"
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

            {selectedDocType === "Business Clearance" && (
              <Form.Item
                name="businessName"
                label={<span className="text-gray-700 font-medium">Business Name</span>}
                rules={[{ required: true, message: 'Please enter your business name' }]}
              >
                <Input placeholder="Enter registered business name" />
              </Form.Item>
            )}
            <Form.Item 
              name="quantity" 
              label={<span className="text-gray-700 font-medium">Quantity</span>} 
              initialValue={1}
              rules={[{ required: true, type: 'number', min: 1, message: 'Enter quantity (min 1)' }]}
            >
              <InputNumber 
                min={1} 
                className="w-full"
                onChange={(value) => {
                  // Update the amount field based on quantity and current document type
                  const currentDocType = createForm.getFieldValue("documentType");
                  const currentQuantity = value || 1;
                  const baseAmount = documentPricing[currentDocType] || 0;
                  const totalAmount = baseAmount * currentQuantity;
                  createForm.setFieldValue("amount", totalAmount);
                }}
              />
            </Form.Item>
            
            <Form.Item 
              name="purpose" 
              label={<span className="text-gray-700 font-medium">Purpose</span>}
              rules={[{ required: true, message: 'Please specify the purpose for your request' }]}
              help="Clearly state why you need this document"
            >
              <Input.TextArea 
                rows={4} 
                placeholder="Example: For employment requirements, school enrollment, business registration, etc."
                className="w-full"
              />
            </Form.Item>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
              <h4 className="text-blue-800 font-medium text-sm mb-1">Important Information</h4>
              <p className="text-blue-700 text-xs">
                Your document request will be reviewed by barangay officials. Processing time may vary depending on the type of document and current volume of requests.
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={creating}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={paymentStatus?.canRequestDocuments === false && paymentStatus?.paymentStatus}
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
