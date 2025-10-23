import React, { useEffect, useState, useMemo } from "react";
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
    fetchRealPayments(); // Fetch real payment data instead of mock data
    // Get resident info from localStorage
    console.log("=== DASHBOARD DEBUG ===");
    console.log("userData from localStorage:", localStorage.getItem("userData"));
    console.log("userProfile from localStorage:", localStorage.getItem("userProfile"));
    console.log("username from localStorage:", localStorage.getItem("username"));
    console.log("token from localStorage:", localStorage.getItem("token"));
    console.log("Using residentData:", residentData);
    console.log("========================");
    setResident(residentData);
  }, []);

  // Auto-refresh payment data when user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("Page became visible, refreshing payment data...");
        refreshPaymentData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
      console.log("Garbage fee data:", res.data.paymentStatus?.garbageFee);
      console.log("Streetlight fee data:", res.data.paymentStatus?.streetlightFee);
      console.log("Raw payment status structure:", JSON.stringify(res.data.paymentStatus, null, 2));
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

  const refreshPaymentData = async () => {
    await checkPaymentStatus();
    await fetchRealPayments();
  };

  // Fetch real payment data from the API
  const fetchRealPayments = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found for fetching payments");
        return;
      }

      console.log("Fetching real payment data...");
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/payments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log("Real payment response:", response.data);
      
      // Process the payment data similar to ResidentPayment.jsx
      const normalizeUtilityResponse = (payload) => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;

        const containers = [
          { key: "garbage", type: "garbage" },
          { key: "garbagePayments", type: "garbage" },
          { key: "streetlight", type: "streetlight" },
          { key: "streetlightPayments", type: "streetlight" },
          { key: "utilityPayments", type: null },
          { key: "records", type: null },
          { key: "data", type: null },
        ];

        const merged = [];
        containers.forEach(({ key, type }) => {
          const value = payload[key];
          if (Array.isArray(value)) {
            value.forEach((entry) =>
              merged.push({
                ...entry,
                type: entry.type || entry.utilityType || entry.feeType || type,
              })
            );
          }
        });

        return merged;
      };

      const buildPaymentRecord = (raw) => {
        const toNumber = (value) => Number(value ?? 0);
        const typeLabel = raw.type?.toLowerCase().includes("street") ? "Streetlight Fee" : "Garbage Fee";
        const monthKey = raw.month || raw.period || raw.billingMonth;
        const amount = toNumber(raw.totalCharge);
        const amountPaid = toNumber(raw.amountPaid);
        const balance = raw.balance !== undefined ? Math.max(toNumber(raw.balance), 0) : Math.max(amount - amountPaid, 0);
        
        // Determine status based on balance
        let status = "pending";
        if (balance <= 0) {
          status = "paid";
        } else if (amountPaid > 0 && balance > 0) {
          status = "pending"; // Partially paid but still has balance
        } else {
          status = "pending"; // Unpaid
        }

        return {
          id: raw._id || raw.id || `${typeLabel.toLowerCase().replace(/\s+/g, "-")}-${monthKey || Date.now()}`,
          description: `${typeLabel} — ${monthKey || "Current Month"}`,
          type: typeLabel,
          amount,
          amountPaid,
          balance,
          status,
        };
      };

      const normalizedEntries = normalizeUtilityResponse(response.data);
      const mapped = normalizedEntries
        .filter((item) => item.month || item.dueDate)
        .map((item) => buildPaymentRecord(item));

      console.log("Processed payment data:", mapped);
      setPayments(mapped);
    } catch (error) {
      console.error("Failed to load real payment data:", error);
      // Fallback to empty payments instead of mock data
      setPayments([]);
    }
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
  
  // Payment statistics - use actual balances from payment status API
  const { totalMonthlyDue, totalYearlyDue } = useMemo(() => {
    if (paymentStatus?.paymentStatus) {
      const garbageMonthlyBalance = paymentStatus.paymentStatus.garbageFee?.paid 
        ? 0 
        : (paymentStatus.paymentStatus.garbageFee?.monthlyBalance || 0);
      const streetlightMonthlyBalance = paymentStatus.paymentStatus.streetlightFee?.paid 
        ? 0 
        : (paymentStatus.paymentStatus.streetlightFee?.monthlyBalance || 0);
      
      const garbageYearlyBalance = paymentStatus.paymentStatus.garbageFee?.yearlyBalance || 0;
      const streetlightYearlyBalance = paymentStatus.paymentStatus.streetlightFee?.yearlyBalance || 0;
      
      return {
        totalMonthlyDue: garbageMonthlyBalance + streetlightMonthlyBalance,
        totalYearlyDue: garbageYearlyBalance + streetlightYearlyBalance
      };
    }
    // Fallback to payment records if payment status not available
    const monthlyDue = payments
      .filter(p => p.status === "pending" || p.status === "overdue")
      .reduce((sum, p) => sum + (p.balance || 0), 0);
    return {
      totalMonthlyDue: monthlyDue,
      totalYearlyDue: monthlyDue * 12 // Rough estimate
    };
  }, [paymentStatus, payments]);
    
  const paidAmount = payments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + (p.amountPaid || p.amount), 0);
    
  const pendingFees = useMemo(() => {
    if (paymentStatus?.paymentStatus) {
      let count = 0;
      if (paymentStatus.paymentStatus.garbageFee && !paymentStatus.paymentStatus.garbageFee.paid && paymentStatus.paymentStatus.garbageFee.balance > 0) count++;
      if (paymentStatus.paymentStatus.streetlightFee && !paymentStatus.paymentStatus.streetlightFee.paid && paymentStatus.paymentStatus.streetlightFee.balance > 0) count++;
      return count;
    }
    return payments.filter(p => p.status === "pending" && (p.balance || 0) > 0).length;
  }, [paymentStatus, payments]);

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
                    {paymentStatus.paymentStatus?.garbageFee && (
                      <Card className={`w-full border shadow-none min-h-[120px] ${
                        paymentStatus.paymentStatus.garbageFee.paid 
                          ? 'border-emerald-200 bg-emerald-50' 
                          : 'border-rose-200 bg-white'
                      }`}>
                        <CardContent className="p-3 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 text-base mb-1">Garbage Fee</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">This Month:</span>
                                  <span className={`font-semibold ${
                                    paymentStatus.paymentStatus.garbageFee.paid ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    ₱{Number(paymentStatus.paymentStatus.garbageFee.monthlyBalance || 0).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">This Year:</span>
                                  <span className={`font-semibold ${
                                    (paymentStatus.paymentStatus.garbageFee.yearlyBalance || paymentStatus.paymentStatus.garbageFee.balance || 0) === 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    ₱{Number(paymentStatus.paymentStatus.garbageFee.yearlyBalance || paymentStatus.paymentStatus.garbageFee.balance || 0).toFixed(2)}
                                    {console.log("Garbage fee object:", paymentStatus.paymentStatus.garbageFee)}
                                    {console.log("Displaying garbage yearly balance:", paymentStatus.paymentStatus.garbageFee.yearlyBalance)}
                                    {console.log("Displaying garbage balance fallback:", paymentStatus.paymentStatus.garbageFee.balance)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-3">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                paymentStatus.paymentStatus.garbageFee.paid 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : paymentStatus.paymentStatus.garbageFee.status === 'partial'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}>
                                {paymentStatus.paymentStatus.garbageFee.paid 
                                  ? 'PAID' 
                                  : (paymentStatus.paymentStatus.garbageFee.status || 'UNPAID').toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Streetlight Fee */}
                    {paymentStatus.paymentStatus?.streetlightFee && (
                      <Card className={`w-full border shadow-none min-h-[120px] ${
                        paymentStatus.paymentStatus.streetlightFee.paid 
                          ? 'border-emerald-200 bg-emerald-50' 
                          : 'border-rose-200 bg-white'
                      }`}>
                        <CardContent className="p-3 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 text-base mb-1">Streetlight Fee</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">This Month:</span>
                                  <span className={`font-semibold ${
                                    paymentStatus.paymentStatus.streetlightFee.paid ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    ₱{Number(paymentStatus.paymentStatus.streetlightFee.monthlyBalance || 0).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">This Year:</span>
                                  <span className={`font-semibold ${
                                    (paymentStatus.paymentStatus.streetlightFee.yearlyBalance || paymentStatus.paymentStatus.streetlightFee.balance || 0) === 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    ₱{Number(paymentStatus.paymentStatus.streetlightFee.yearlyBalance || paymentStatus.paymentStatus.streetlightFee.balance || 0).toFixed(2)}
                                    {console.log("Streetlight fee object:", paymentStatus.paymentStatus.streetlightFee)}
                                    {console.log("Displaying streetlight yearly balance:", paymentStatus.paymentStatus.streetlightFee.yearlyBalance)}
                                    {console.log("Displaying streetlight balance fallback:", paymentStatus.paymentStatus.streetlightFee.balance)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-3">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                paymentStatus.paymentStatus.streetlightFee.paid 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : paymentStatus.paymentStatus.streetlightFee.status === 'partial'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}>
                                {paymentStatus.paymentStatus.streetlightFee.paid 
                                  ? 'PAID' 
                                  : (paymentStatus.paymentStatus.streetlightFee.status || 'UNPAID').toUpperCase()}
                              </span>
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
                <div className="flex gap-2">
                  <Button 
                    type="default" 
                    size="small" 
                    loading={checkingPayment}
                    onClick={refreshPaymentData}
                    className="text-blue-600"
                  >
                    Refresh
                  </Button>
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

              {/* Monthly Balance Due Card */}
              <Card className="w-full border border-amber-200 bg-amber-50">
                <CardContent className="space-y-3 px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700">Monthly Balance Due</p>
                      <p className="text-2xl font-bold text-amber-900 mt-1">₱{totalMonthlyDue.toFixed(2)}</p>
                      <p className="text-xs text-amber-600 mt-1">Current month only</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <DollarOutlined className="text-amber-600" style={{ fontSize: '24px' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Yearly Balance Due Card */}
              <Card className="w-full border border-red-200 bg-red-50">
                <CardContent className="space-y-3 px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700">Yearly Balance Due</p>
                      <p className="text-2xl font-bold text-red-900 mt-1">₱{totalYearlyDue.toFixed(2)}</p>
                      <p className="text-xs text-red-600 mt-1">Outstanding for {new Date().getFullYear()}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                      <CalendarOutlined className="text-red-600" style={{ fontSize: '24px' }} />
                    </div>
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
