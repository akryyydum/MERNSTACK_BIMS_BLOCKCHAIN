
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ResidentNavbar from "./ResidentNavbar";
import PaymentStatusAlert from './PaymentStatusAlert';
import { Button, message, Spin } from "antd";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  FileTextOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  CreditCardOutlined, 
  DollarOutlined,
  UserOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  AlertOutlined,
  FlagOutlined
} from '@ant-design/icons';
import axios from "axios";

export default function ResidentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [resident, setResident] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const residentData = Object.keys(userData).length > 0 ? userData : userProfile;
  const username = residentData.username || localStorage.getItem("username") || "Resident";

  // Utility function to safely format dates
  const formatDate = (dateValue) => {
    if (!dateValue) return "Not available";
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString();
  };

  // Fetch resident profile from API
  const fetchResidentProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setResident(residentData);
        return;
      }

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setResident(res.data);
    } catch (error) {
      // Fallback to localStorage data
      setResident(residentData);
    }
  };

  useEffect(() => {
    // Fetch requests and resident info on component mount
    fetchRequests();
    fetchComplaints(); // Fetch complaints/reports
    checkPaymentStatus();
    fetchRealPayments(); // Fetch real payment data instead of mock data
    fetchResidentProfile(); // Fetch full resident profile from API
    // Avoid logging sensitive localStorage contents
  }, []);

  // Auto-refresh payment data when user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
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
        return;
      }

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/document-requests/payment-status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPaymentStatus(res.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        message.error("Authentication error. Please log in again.");
      } else if (error.response?.status === 400) {
        // Set a default status that allows document requests for now
        setPaymentStatus({
          canRequestDocuments: true,
          message: "Payment status not available - proceeding with document requests",
          paymentStatus: null
        });
      } else {
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
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/payments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      
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

      setPayments(mapped);
    } catch (error) {
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

  // Fetch complaints/reports from API
  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/complaints`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setComplaints(res.data);
    } catch (error) {
      // On error, set empty complaints
      setComplaints([]);
    }
  };

  // Request statistics
  const totalRequests = requests.length;
  const pendingPayments = requests.filter(r => r.status === "accepted" && !r.paymentStatus).length;
  
  // Complaint statistics  
  const totalComplaints = complaints.length;
  const pendingComplaints = complaints.filter(c => c.status === "pending").length;
  
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
      
      <main className="mx-auto w-full max-w-9xl space-y-4 px-3 py-4 sm:px-4 lg:px-6">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl font-semibold text-slate-900">
              Resident Dashboard
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Welcome back, {username}! Track your document requests and barangay services
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Outstanding Payments Alert Card */}
        {paymentStatus && !paymentStatus.canRequestDocuments && paymentStatus.paymentStatus && (
          <Card className="w-full border border-rose-200 bg-rose-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-rose-100 flex items-center justify-center">
                    <ExclamationCircleOutlined className="text-rose-600 text-sm sm:text-base" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm sm:text-base font-semibold text-rose-900">Payment Required</h3>
                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] sm:text-xs font-medium rounded-full">
                      Action Needed
                    </span>
                  </div>
                  <p className="text-rose-800 mb-3 text-xs sm:text-sm">
                    You have outstanding fees that must be settled before you can request official documents from the barangay.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
                    {/* Garbage Fee */}
                    {paymentStatus.paymentStatus?.garbageFee && (
                      <Card className={`w-full border shadow-none min-h-[80px] sm:min-h-[100px] ${
                        paymentStatus.paymentStatus.garbageFee.paid 
                          ? 'border-emerald-200 bg-emerald-50' 
                          : 'border-rose-200 bg-white'
                      }`}>
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 text-xs sm:text-sm mb-0.5 sm:mb-1">Garbage Fee</h4>
                              <div className="space-y-0.5">
                                <div className="flex justify-between text-[10px] sm:text-xs">
                                  <span className="text-slate-600">This Month:</span>
                                  <span className={`font-semibold ${
                                    paymentStatus.paymentStatus.garbageFee.paid ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    ₱{Number(paymentStatus.paymentStatus.garbageFee.monthlyBalance || 0).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[10px] sm:text-xs">
                                  <span className="text-slate-600">This Year:</span>
                                  <span className={`font-semibold ${
                                    (paymentStatus.paymentStatus.garbageFee.yearlyBalance || paymentStatus.paymentStatus.garbageFee.balance || 0) === 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    ₱{Number(paymentStatus.paymentStatus.garbageFee.yearlyBalance || paymentStatus.paymentStatus.garbageFee.balance || 0).toFixed(2)}
                                    {/* debug logs removed */}
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
                      <Card className={`w-full border shadow-none min-h-[80px] sm:min-h-[100px] ${
                        paymentStatus.paymentStatus.streetlightFee.paid 
                          ? 'border-emerald-200 bg-emerald-50' 
                          : 'border-rose-200 bg-white'
                      }`}>
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 text-xs sm:text-sm mb-0.5 sm:mb-1">Streetlight Fee</h4>
                              <div className="space-y-0.5">
                                <div className="flex justify-between text-[10px] sm:text-xs">
                                  <span className="text-slate-600">This Month:</span>
                                  <span className={`font-semibold ${
                                    paymentStatus.paymentStatus.streetlightFee.paid ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    ₱{Number(paymentStatus.paymentStatus.streetlightFee.monthlyBalance || 0).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[10px] sm:text-xs">
                                  <span className="text-slate-600">This Year:</span>
                                  <span className={`font-semibold ${
                                    (paymentStatus.paymentStatus.streetlightFee.yearlyBalance || paymentStatus.paymentStatus.streetlightFee.balance || 0) === 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    ₱{Number(paymentStatus.paymentStatus.streetlightFee.yearlyBalance || paymentStatus.paymentStatus.streetlightFee.balance || 0).toFixed(2)}
                                    {/* debug logs removed */}
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

        {/* User Profile Summary */}
        <Card className="w-full border border-blue-200 bg-blue-50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col md:flex-row justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-200 flex items-center justify-center">
                  <UserOutlined style={{ fontSize: '16px' }} className="text-blue-600 sm:text-lg" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-blue-900">
                    {resident?.firstName}
                    {resident?.middleName ? ` ${resident.middleName}` : ''}
                    {resident?.lastName ? ` ${resident.lastName}` : ''}
                    {resident?.suffix ? <span className="ml-1">{resident.suffix}</span> : null}
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-700">
                    Resident ID: {resident?._id?.substring(0, 8) || "Not available"}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded-md border border-slate-200">
                  <CalendarOutlined className="text-blue-600 text-xs" />
                  <div>
                    <p className="text-[10px] text-slate-500">Since</p>
                    <p className="text-xs sm:text-sm font-medium text-slate-800">
                      {formatDate(resident?.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Up to Date Alert Card */}
        {paymentStatus && paymentStatus.canRequestDocuments && paymentStatus.paymentStatus && (
          <Card className="w-full border border-emerald-200 bg-emerald-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircleOutlined className="text-emerald-600 text-sm sm:text-base" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm sm:text-base font-semibold text-emerald-900">All Payments Up to Date</h3>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-medium rounded-full">
                      Good Standing
                    </span>
                  </div>
                  <p className="text-emerald-800 mb-3 text-xs sm:text-sm">
                    Great! Your garbage and streetlight fees are current. You can now request official documents from the barangay.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Dashboard Statistics - Combined Document Requests, Complaints & Barangay Fee Summary */}
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">Dashboard Overview</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Manage your document requests, complaints, and track barangay fee payments</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {/* Use flexbox with order for mobile, grid for desktop with 4 columns for the 4 main cards */}
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              
              {/* All Requests Card */}
              <Card className="w-full border border-blue-200 bg-blue-50">
                <CardContent className="space-y-1 px-2 py-2 sm:px-2.5 sm:py-3">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-blue-100 flex items-center justify-center mb-1">
                      <FileTextOutlined className="text-blue-600 text-[10px] sm:text-xs" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] sm:text-[10px] font-medium text-blue-700 mb-0.5">All Requests</p>
                      <p className="text-sm sm:text-base font-bold text-blue-900">{totalRequests}</p>
                      <p className="text-[8px] sm:text-[9px] text-blue-600 mt-0.5 leading-tight">Requests made</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Complaints Card */}
              <Card className="w-full border border-orange-200 bg-orange-50">
                <CardContent className="space-y-1 px-2 py-2 sm:px-2.5 sm:py-3">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-orange-100 flex items-center justify-center mb-1">
                      <ExclamationCircleOutlined className="text-orange-600 text-[10px] sm:text-xs" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] sm:text-[10px] font-medium text-orange-700 mb-0.5">All Complaints</p>
                      <p className="text-sm sm:text-base font-bold text-orange-900">{totalComplaints}</p>
                      <p className="text-[8px] sm:text-[9px] text-orange-600 mt-0.5 leading-tight">Reports submitted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Balance Due Card */}
              <Card className="w-full border border-amber-200 bg-amber-50">
                <CardContent className="space-y-1 px-2 py-2 sm:px-2.5 sm:py-3">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-amber-100 flex items-center justify-center mb-1">
                      <DollarOutlined className="text-amber-600 text-[10px] sm:text-xs" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] sm:text-[10px] font-medium text-amber-700 mb-0.5">Monthly Due</p>
                      <p className="text-sm sm:text-base font-bold text-amber-900">₱{totalMonthlyDue.toFixed(2)}</p>
                      <p className="text-[8px] sm:text-[9px] text-amber-600 mt-0.5 leading-tight">Current month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Yearly Balance Due Card */}
              <Card className="w-full border border-red-200 bg-red-50">
                <CardContent className="space-y-1 px-2 py-2 sm:px-2.5 sm:py-3">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-red-100 flex items-center justify-center mb-1">
                      <CalendarOutlined className="text-red-600 text-[10px] sm:text-xs" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] sm:text-[10px] font-medium text-red-700 mb-0.5">Yearly Due</p>
                      <p className="text-sm sm:text-base font-bold text-red-900">₱{totalYearlyDue.toFixed(2)}</p>
                      <p className="text-[8px] sm:text-[9px] text-red-600 mt-0.5 leading-tight">{new Date().getFullYear()} total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Activity Section */}
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">Recent Activity</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Your latest document requests, complaints, and reports</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            {loading ? (
              <div className="text-center py-6">
                <div className="flex justify-center items-center">
                  <Spin size="small" tip="Loading activity..." />
                </div>
              </div>
            ) : requests.length === 0 && complaints.length === 0 ? (
              <div className="text-center py-8 sm:py-10">
                <div className="flex flex-col items-center">
                  <FileTextOutlined style={{ fontSize: '24px' }} className="text-slate-400 mb-1.5" />
                  <p className="text-slate-500 font-medium text-sm">No recent activity found</p>
                  <p className="text-slate-400 text-xs mt-0.5">Start by requesting a document or submitting a complaint/report</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {/* Combine and sort requests and complaints by date, show latest 6 items */}
                {[
                  ...requests.map(item => ({ ...item, activityType: 'request' })),
                  ...complaints.map(item => ({ ...item, activityType: 'complaint' }))
                ]
                .sort((a, b) => new Date(b.createdAt || b.requestedAt) - new Date(a.createdAt || a.requestedAt))
                .slice(0, 6)
                .map((item) => {
                  const isRequest = item.activityType === 'request';
                  const isComplaint = item.activityType === 'complaint';
                  
                  return (
                    <Card key={`${item.activityType}-${item._id}`} className="w-full border border-slate-200 bg-white shadow-none hover:shadow-md transition-shadow">
                      <CardContent className="p-2 sm:p-2.5">
                        <div className="flex items-center mb-1.5">
                          <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center mr-1.5 ${
                            isRequest ? 'bg-blue-100' : 
                            item.type === 'complaint' ? 'bg-orange-100' : 'bg-purple-100'
                          }`}>
                            {isRequest ? (
                              <FileTextOutlined className="text-blue-600 text-[10px] sm:text-xs" />
                            ) : item.type === 'complaint' ? (
                              <ExclamationCircleOutlined className="text-orange-600 text-[10px] sm:text-xs" />
                            ) : (
                              <FlagOutlined className="text-purple-600 text-[10px] sm:text-xs" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate text-[10px] sm:text-xs">
                              {isRequest ? item.documentType : item.title}
                            </p>
                            <p className="text-[8px] sm:text-[9px] text-slate-500">
                              {isRequest ? 'Document Request' : 
                               item.type === 'complaint' ? 'Complaint' : 'Report'}
                            </p>
                          </div>
                          <div className="ml-1">
                            {/* Status badges */}
                            {(item.status === "pending") && (
                              <span className="px-1 py-0.5 text-[8px] sm:text-[9px] font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                PENDING
                              </span>
                            )}
                            {(item.status === "accepted" || item.status === "investigating") && (
                              <span className="px-1 py-0.5 text-[8px] sm:text-[9px] font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                {item.status === "accepted" ? "APPROVED" : "INVESTIGATING"}
                              </span>
                            )}
                            {(item.status === "declined") && (
                              <span className="px-1 py-0.5 text-[8px] sm:text-[9px] font-medium rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                REJECTED
                              </span>
                            )}
                            {(item.status === "completed" || item.status === "resolved") && (
                              <span className="px-1 py-0.5 text-[8px] sm:text-[9px] font-medium rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {item.status === "completed" ? "RELEASED" : "RESOLVED"}
                              </span>
                            )}
                            {(item.status === "closed") && (
                              <span className="px-1 py-0.5 text-[8px] sm:text-[9px] font-medium rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                                CLOSED
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          {isRequest ? (
                            <p className="text-[8px] sm:text-[9px] text-slate-600">
                              <strong>Purpose:</strong> {item.purpose && item.purpose.length > 30 
                                ? `${item.purpose.substring(0, 30)}...` 
                                : item.purpose || 'Not specified'}
                            </p>
                          ) : (
                            <>
                              <p className="text-[8px] sm:text-[9px] text-slate-600">
                                <strong>Category:</strong> {item.category}
                              </p>
                              <p className="text-[8px] sm:text-[9px] text-slate-600">
                                <strong>Location:</strong> {item.location}
                              </p>
                              {item.description && (
                                <p className="text-[8px] sm:text-[9px] text-slate-600">
                                  <strong>Details:</strong> {item.description.length > 40 
                                    ? `${item.description.substring(0, 40)}...` 
                                    : item.description}
                                </p>
                              )}
                            </>
                          )}
                          <p className="text-[8px] sm:text-[9px] text-slate-500">
                            {isRequest ? 'Requested' : 'Submitted'} on {formatDate(item.createdAt || item.requestedAt)}
                          </p>
                          {isRequest && item.status === "completed" && item.completedAt && (
                            <p className="text-[8px] sm:text-[9px] text-emerald-600 font-medium">
                              Released on {formatDate(item.completedAt)}
                            </p>
                          )}
                        </div>
                        <div className="mt-1.5 flex justify-between items-center">
                          <span className="text-[8px] sm:text-[9px] text-slate-500">Status:</span>
                          <span className={`text-[8px] sm:text-[9px] font-medium ${
                            (item.status === "accepted" || item.status === "resolved") ? "text-emerald-600" : 
                            (item.status === "declined") ? "text-rose-600" : 
                            (item.status === "investigating") ? "text-blue-600" :
                            "text-slate-800"
                          }`}>
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
