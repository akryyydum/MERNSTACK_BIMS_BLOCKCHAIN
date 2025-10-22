import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ResidentNavbar from "./ResidentNavbar";
import PaymentStatusAlert from './PaymentStatusAlert';
import { Button, message } from "antd";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  FileTextOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  CreditCardOutlined, 
  DollarOutlined,
  UserOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from "axios";

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [resident, setResident] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const residentData = Object.keys(userData).length > 0 ? userData : userProfile;
  const username = residentData.username || localStorage.getItem("username") || "Resident";

  useEffect(() => {
    // Fetch requests and resident info on component mount
    fetchRequests();
    checkPaymentStatus();
    // Get resident info from localStorage
    console.log("=== DASHBOARD DEBUG ===");
    console.log("userData from localStorage:", localStorage.getItem("userData"));
    console.log("userProfile from localStorage:", localStorage.getItem("userProfile"));
    console.log("username from localStorage:", localStorage.getItem("username"));
    console.log("token from localStorage:", localStorage.getItem("token"));
    console.log("Using residentData:", residentData);
    console.log("========================");
    setResident(residentData);
    // Generate mock payment data
    generateMockPayments();
  }, []);

  // Check payment status to determine if user can request documents
  const checkPaymentStatus = async () => {
    setCheckingPayment(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found");
        return;
      }

      console.log("Making payment status request...");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/document-requests/payment-status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Payment status response:", res.data);
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

  const handleGoToPayments = () => {
    navigate('/resident/payments');
  };
  
  // Generate mock payment data based on current date
  const generateMockPayments = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Calculate which quarter we're in (0-based)
    const currentQuarter = Math.floor(currentMonth / 3);
    
    // Create payment records for the year
    const mockPayments = [];
    
    // Create 4 quarters of payment records
    for (let quarter = 0; quarter < 4; quarter++) {
      // Calculate due date (last day of the quarter)
      const dueDate = new Date(currentYear, (quarter + 1) * 3, 0);
      
      // Determine payment status based on current date and quarter
      let status = "pending";
      if (quarter < currentQuarter) {
        // Past quarters are either paid or overdue
        status = Math.random() > 0.3 ? "paid" : "overdue";
      } else if (quarter === currentQuarter) {
        // Current quarter is pending
        status = "pending";
      } else {
        // Future quarters are upcoming
        status = "upcoming";
      }
      
      // Add garbage fee payment record
      mockPayments.push({
        id: `garbage-${currentYear}-q${quarter + 1}`,
        description: `Garbage Fee - Q${quarter + 1} ${currentYear}`,
        amount: 50,
        dueDate: dueDate.toISOString(),
        paymentDate: status === "paid" ? new Date(dueDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        status,
        type: "Garbage Fee",
        period: `Q${quarter + 1} ${currentYear}`
      });
      
      // Add streetlight fee payment record
      mockPayments.push({
        id: `streetlight-${currentYear}-q${quarter + 1}`,
        description: `Streetlight Fee - Q${quarter + 1} ${currentYear}`,
        amount: 150,
        dueDate: dueDate.toISOString(),
        paymentDate: status === "paid" ? new Date(dueDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        status,
        type: "Streetlight Fee",
        period: `Q${quarter + 1} ${currentYear}`
      });
    }
    
    setPayments(mockPayments);
  };

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
      
      // Note: Do not overwrite resident data from localStorage with document request data
    } catch (error) {
      console.error("Error fetching document requests:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        message.error("Authentication error. Please log in again.");
      } else {
        message.error("Failed to load document requests.");
      }
      setRequests([]);
    }
    setLoading(false);
  };

  // Request statistics
  const totalRequests = requests.length;
  const pendingPayments = requests.filter(r => r.status === "accepted" && !r.paymentStatus).length;
  
  // Payment statistics
  const totalDue = payments
    .filter(p => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);
    
  const paidAmount = payments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
    
  const pendingFees = payments
    .filter(p => p.status === "pending")
    .length;

  return (
    <div className="min-h-screen bg-slate-50">
      <ResidentNavbar />
      
      <main className="mx-auto w-full max-w-9xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-900">
              Resident Dashboard
            </CardTitle>
            <CardDescription>
              Welcome back, {username}! Track your document requests and barangay services
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Outstanding Payments Alert Card */}
        {paymentStatus && !paymentStatus.canRequestDocuments && paymentStatus.paymentStatus && (
          <Card className="w-full border border-rose-200 bg-rose-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center">
                    <ExclamationCircleOutlined className="text-rose-600 text-xl" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-rose-900">Payment Required</h3>
                    <span className="px-2 py-1 bg-rose-100 text-rose-800 text-xs font-medium rounded-full">
                      Action Needed
                    </span>
                  </div>
                  <p className="text-rose-800 mb-4">
                    You have outstanding fees that must be settled before you can request official documents from the barangay.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {/* Garbage Fee */}
                    {paymentStatus.paymentStatus?.garbageFee && !paymentStatus.paymentStatus.garbageFee.paid && (
                      <Card className="w-full border border-rose-200 bg-white shadow-none min-h-[80px]">
                        <CardContent className="p-2 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-slate-900 text-base">Garbage Fee</h4>
                              <p className="text-xs text-slate-600">Current Month</p>
                            </div>
                            <div className="text-right">
                              <p className="text-base font-bold text-rose-600">
                                ₱{Number(paymentStatus.paymentStatus.garbageFee.balance || 0).toFixed(2)}
                              </p>
                              <span className="text-xs text-rose-500 font-medium">UNPAID</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Streetlight Fee */}
                    {paymentStatus.paymentStatus?.streetlightFee && !paymentStatus.paymentStatus.streetlightFee.paid && (
                      <Card className="w-full border border-rose-200 bg-white shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-slate-900">Streetlight Fee</h4>
                              <p className="text-sm text-slate-600">Current Month</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-rose-600">
                                ₱{Number(paymentStatus.paymentStatus.streetlightFee.balance || 0).toFixed(2)}
                              </p>
                              <span className="text-xs text-rose-500 font-medium">UNPAID</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments Up to Date Alert Card */}
        {paymentStatus && paymentStatus.canRequestDocuments && paymentStatus.paymentStatus && (
          <Card className="w-full border border-emerald-200 bg-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircleOutlined className="text-emerald-600 text-xl" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-emerald-900">All Payments Up to Date</h3>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
                      Good Standing
                    </span>
                  </div>
                  <p className="text-emerald-800 mb-4">
                    Great! Your garbage and streetlight fees are current. You can now request official documents from the barangay.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Profile Summary */}
        <Card className="w-full border border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-200 flex items-center justify-center">
                  <UserOutlined style={{ fontSize: '20px' }} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-blue-900">{resident?.firstName} {resident?.lastName}</h2>
                  <p className="text-sm text-blue-700">Resident ID: {resident?._id?.substring(0, 8) || "Not available"}</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-md border border-slate-200">
                  <CalendarOutlined className="text-blue-600 text-sm" />
                  <div>
                    <p className="text-xs text-slate-500">Since</p>
                    <p className="text-sm font-medium text-slate-800">{new Date(resident?.createdAt).toLocaleDateString() || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Dashboard Statistics - Combined Document Requests & Barangay Fee Summary */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Dashboard Overview</CardTitle>
            <CardDescription>Manage your document requests and track barangay fee payments</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Section Headers Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4">
              <div className="md:col-span-2 flex flex-row items-center justify-between">
                <h3 className="text-md font-semibold text-slate-800 flex items-center">
                  <FileTextOutlined className="mr-2 text-blue-600" /> Document Requests
                </h3>
                <Button 
                  type="link" 
                  size="small" 
                  className="text-blue-600" 
                  onClick={() => navigate('/resident/requests')}
                >
                  Make New Request
                </Button>
              </div>
              <div className="md:col-span-2 flex flex-row items-center justify-between">
                <h3 className="text-md font-semibold text-slate-800 flex items-center">
                  <DollarOutlined className="mr-2 text-amber-600" /> Barangay Fee Summary
                </h3>
                <Button 
                  type="link" 
                  size="small" 
                  className="text-blue-600" 
                  onClick={() => navigate('/resident/payments')}
                >
                  View All Payments
                </Button>
              </div>
            </div>
            
            {/* Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* All Requests Card */}
              <Card className="w-full border border-blue-200 bg-blue-50">
                <CardContent className="space-y-3 px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">All Requests</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{totalRequests}</p>
                      <p className="text-xs text-blue-600 mt-1">Document requests made</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileTextOutlined className="text-blue-600" style={{ fontSize: '24px' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* New Request Card */}
              <Card className="w-full border border-emerald-200 bg-emerald-50">
                <CardContent className="space-y-3 px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-700">New Request</p>
                      <p className="text-lg font-bold text-emerald-900 mt-1">Request Document</p>
                      <p className="text-xs text-emerald-600 mt-1">Apply for barangay documents</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <FileTextOutlined className="text-emerald-600" style={{ fontSize: '24px' }} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="primary"
                      size="small"
                      onClick={() => {
                        if (paymentStatus?.canRequestDocuments === false && paymentStatus?.paymentStatus) {
                          message.warning("Please settle your outstanding payments before requesting documents");
                          navigate('/resident/payments');
                        } else {
                          navigate('/resident/requests');
                        }
                      }}
                      disabled={paymentStatus?.canRequestDocuments === false && paymentStatus?.paymentStatus}
                      className={`${
                        paymentStatus?.canRequestDocuments !== false 
                          ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-600" 
                          : "bg-slate-400 hover:bg-slate-500"
                      }`}
                    >
                      {(paymentStatus?.canRequestDocuments === false && paymentStatus?.paymentStatus) ? "Payments Required" : "Request Now"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Balance Due Card */}
              <Card className="w-full border border-amber-200 bg-amber-50">
                <CardContent className="space-y-3 px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700">Current Balance Due</p>
                      <p className="text-2xl font-bold text-amber-900 mt-1">₱{totalDue.toFixed(2)}</p>
                      <p className="text-xs text-amber-600 mt-1">Garbage & Streetlight fees</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <DollarOutlined className="text-amber-600" style={{ fontSize: '24px' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Schedule Card */}
              <Card className="w-full border border-blue-200 bg-blue-50">
                <CardContent className="space-y-3 px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Payment Schedule</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">Monthly</p>
                      <p className="text-xs text-blue-600 mt-1">Every Month</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <CalendarOutlined className="text-blue-600" style={{ fontSize: '24px' }} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="primary" 
                      size="small" 
                      className="bg-blue-500 hover:bg-blue-600 border-blue-600"
                      onClick={() => navigate('/resident/payments')}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Activity Section */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
            <CardDescription>Your latest document requests and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="flex justify-center items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  <span className="text-slate-500">Loading activity...</span>
                </div>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center">
                  <FileTextOutlined style={{ fontSize: '32px' }} className="text-slate-400 mb-2" />
                  <p className="text-slate-500 font-medium">No document requests found</p>
                  <p className="text-slate-400 text-sm mt-1">Click "Request Document" to create your first document request</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {requests.slice(0, 3).map((request) => (
                  <Card key={request._id} className="w-full border border-slate-200 bg-white shadow-none hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center mb-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                          <FileTextOutlined className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{request.documentType}</p>
                        </div>
                        <div className="ml-2">
                          {request.status === "pending" && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              PENDING
                            </span>
                          )}
                          {request.status === "accepted" && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              APPROVED
                            </span>
                          )}
                          {request.status === "declined" && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                              REJECTED
                            </span>
                          )}
                          {request.status === "completed" && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              RELEASED
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600">
                          <strong>Purpose:</strong> {request.purpose && request.purpose.length > 30 
                            ? `${request.purpose.substring(0, 30)}...` 
                            : request.purpose || 'Not specified'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Requested on {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-xs text-slate-500">Status:</span>
                        <span className={`text-xs font-medium ${
                          request.status === "accepted" ? "text-emerald-600" : 
                          request.status === "declined" ? "text-rose-600" : 
                          "text-slate-800"
                        }`}>
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
