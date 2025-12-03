import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ResidentNavbar from "./ResidentNavbar";
import PaymentStatusAlert from './PaymentStatusAlert';
import apiClient from "../../utils/apiClient";
import { Button, message, Spin, Modal } from "antd";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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
  FlagOutlined,
  BellOutlined
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
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);

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

  // Fetch up to 5 latest announcements from public documents
  const fetchLatestAnnouncement = async () => {
    setLoadingAnnouncement(true);
    try {
      const res = await apiClient.get('/api/resident/public-documents');
      // Filter for announcements only and get up to 5 latest
      const filtered = (res.data || []).filter(
        doc => doc.category && doc.category.toLowerCase() === 'announcement'
      );
      const sorted = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAnnouncements(sorted.slice(0, 5));
      setActiveAnnouncementIndex(0);
    } catch (error) {
      // Silently fail - announcement is optional
      console.error("Error fetching announcements:", error);
    }
    setLoadingAnnouncement(false);
  };

  // Fetch resident profile from API
  const fetchResidentProfile = async () => {
    try {
      const res = await apiClient.get('/api/resident/profile');
      
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
    fetchLatestAnnouncement(); // Fetch latest announcement
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
      const res = await apiClient.get('/api/document-requests/payment-status');
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
  
  // Fetch document requests for the current resident
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/document-requests');
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
      const res = await apiClient.get('/api/resident/complaints');
      
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

  const hasAnnouncements = announcements && announcements.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <ResidentNavbar />
      
      <main className="mx-auto w-full max-w-9xl space-y-4 px-3 py-4 sm:px-4 lg:px-6">
        <Card className="w-full border border-slate-200 shadow-md bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl font-bold text-slate-800">
              Resident Dashboard
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Welcome back, <span className="font-semibold text-slate-700">{username}</span>! Track your document requests and barangay services
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
                          ? 'border-emerald-200 bg-white' 
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
        <Card className="w-full border border-slate-200 shadow-md bg-gradient-to-br from-white via-slate-50/50 to-slate-100/30">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center shadow-lg border-2 border-slate-300">
                  <UserOutlined className="text-white text-2xl sm:text-3xl" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
                    {resident?.firstName}
                    {resident?.middleName ? ` ${resident.middleName}` : ''}
                    {resident?.lastName ? ` ${resident.lastName}` : ''}
                    {resident?.suffix ? <span className="ml-1">{resident.suffix}</span> : null}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    ID: {resident?._id?.substring(0, 8) || "Not available"}
                  </p>
                </div>
              </div>
              <div className="flex items-center w-full md:w-auto">
                <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                    <CalendarOutlined className="text-slate-600 text-lg" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Member Since</p>
                    <p className="text-sm sm:text-base font-semibold text-slate-800">
                      {formatDate(resident?.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Up to Date Alert Card */}
        {/* Payment Status, Dashboard Overview and Latest Announcement Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Payment Status and Dashboard Overview */}
          <div className="flex flex-col gap-4">
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
            <Card className="w-full border border-slate-200 shadow-md bg-white">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">Dashboard Overview</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-600">Track your requests, complaints, and barangay fees</CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                {/* Responsive grid: 2 columns on mobile (2x2), 4 columns on large screens */}
                <div
                  className="grid grid-cols-2 grid-rows-2 gap-2 sm:grid-cols-2 sm:grid-rows-2 lg:grid-cols-2 lg:grid-rows-2 sm:gap-4"
                >
              {/* All Requests Card */}
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                      <FileTextOutlined className="text-slate-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Documents</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">{totalRequests}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">Total requests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Complaints Card */}
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-200">
                      <ExclamationCircleOutlined className="text-amber-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Complaints</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">{totalComplaints}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">Reports filed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Balance Due Card */}
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 border border-orange-200">
                      <span className="text-black-600 text-lg sm:text-xl font-bold">₱</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Monthly</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-800">₱{totalMonthlyDue.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">Balance due</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Yearly Balance Due Card */}
              <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 border border-rose-200">
                      <CalendarOutlined className="text-rose-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Yearly</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-800">₱{totalYearlyDue.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">{new Date().getFullYear()} total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
          </div>

          {/* Right Column: Announcements Carousel (shadcn) */}
          {hasAnnouncements && (
            <Card className="w-full border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-blue-50 shadow-md h-[765px] flex flex-col">
              <CardContent className="p-3 sm:p-4 flex-1 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <BellOutlined className="text-blue-600 text-sm sm:text-base" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-blue-900">Announcements</h3>
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] sm:text-xs font-medium rounded-full">
                    {announcements.length} item{announcements.length > 1 ? 's' : ''}
                  </span>
                </div>
                
                <Carousel className="w-full">
                  <CarouselContent>
                    {announcements.map((announcement, index) => (
                      <CarouselItem key={announcement._id || index}>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                              {announcement.title}
                            </h4>
                            <span className="text-[10px] sm:text-xs text-slate-500 whitespace-nowrap">
                              {formatDate(announcement.createdAt)}
                            </span>
                          </div>
                          
                          {announcement.description && (
                            <div className="mb-1">
                              <p className="text-blue-800 text-xs sm:text-sm leading-relaxed line-clamp-2">
                                {announcement.description.length > 120
                                  ? `${announcement.description.substring(0, 120)}...`
                                  : announcement.description}
                              </p>
                              <Button
                                type="link"
                                size="small"
                                className="p-0 h-auto text-blue-600 hover:text-blue-800 font-medium mt-1"
                                onClick={() => {
                                  setActiveAnnouncementIndex(index);
                                  setShowAnnouncementModal(true);
                                }}
                              >
                                {announcement.description.length > 120 ? 'See More' : 'View Details'}
                              </Button>
                            </div>
                          )}
                          
                          {announcement.mimeType && announcement.mimeType.startsWith('image/') && (
                            <div 
                              className="w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity aspect-[4/3] flex items-center justify-center p-2 sm:p-3"
                              onClick={() => {
                                setActiveAnnouncementIndex(index);
                                setShowAnnouncementModal(true);
                              }}
                            >
                              <img
                                src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/public-documents/${announcement._id}/preview`}
                                alt={announcement.title}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </Carousel>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Announcement Modal */}
        <Modal
          open={showAnnouncementModal}
          onCancel={() => setShowAnnouncementModal(false)}
          footer={null}
          width={800}
          centered
          title={
            <div className="flex items-center gap-2">
              <BellOutlined className="text-blue-600" />
              <span className="text-lg font-semibold">Announcement</span>
            </div>
          }
        >
          {announcements[activeAnnouncementIndex] && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{announcements[activeAnnouncementIndex].title}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                  <CalendarOutlined className="text-slate-400" />
                  <span>Posted {formatDate(announcements[activeAnnouncementIndex].createdAt)}</span>
                </div>
              </div>
              
              {announcements[activeAnnouncementIndex].description && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {announcements[activeAnnouncementIndex].description}
                  </p>
                </div>
              )}
              
              {announcements[activeAnnouncementIndex].mimeType && announcements[activeAnnouncementIndex].mimeType.startsWith('image/') && (
                <div className="w-full rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <img
                    src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/resident/public-documents/${announcements[activeAnnouncementIndex]._id}/preview`}
                    alt={announcements[activeAnnouncementIndex].title}
                    className="w-full h-auto max-h-[500px] object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </Modal>
        
        {/* Recent Activity Section */}
        <Card className="w-full border border-slate-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">Recent Activity</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">Your latest document requests, complaints, and reports</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            {loading ? (
              <div className="text-center py-8">
                <div className="flex justify-center items-center">
                  <Spin size="large" tip="Loading activity..." />
                </div>
              </div>
            ) : requests.length === 0 && complaints.length === 0 ? (
              <div className="text-center py-10 sm:py-12">
                <div className="flex flex-col items-center">
                  <FileTextOutlined style={{ fontSize: '48px' }} className="text-slate-400 mb-3" />
                  <p className="text-slate-500 font-medium text-base sm:text-lg">No recent activity found</p>
                  <p className="text-slate-400 text-sm sm:text-base mt-1">Start by requesting a document or submitting a complaint/report</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-3 lg:grid-cols-3 lg:grid-rows-2 gap-2 sm:gap-4 md:gap-5">
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
                    <Card key={`${item.activityType}-${item._id}`} className="border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
                      <CardContent className="p-2 sm:p-4">
                        <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className={`h-8 w-8 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                            isRequest ? 'bg-slate-50 border-slate-200' : 
                            item.type === 'complaint' ? 'bg-amber-50 border-amber-200' : 'bg-purple-50 border-purple-200'
                          }`}>
                            {isRequest ? (
                              <FileTextOutlined className="text-slate-600 text-base sm:text-lg" />
                            ) : item.type === 'complaint' ? (
                              <ExclamationCircleOutlined className="text-amber-600 text-base sm:text-lg" />
                            ) : (
                              <FlagOutlined className="text-purple-600 text-base sm:text-lg" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                              <p className="font-semibold text-slate-800 text-xs sm:text-sm line-clamp-1">
                                {isRequest ? item.documentType : item.title}
                              </p>
                              {/* Status badges */}
                              {(item.status === "pending") && (
                                <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-md bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                                  Pending
                                </span>
                              )}
                              {(item.status === "accepted" || item.status === "investigating") && (
                                <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-md bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap">
                                  {item.status === "accepted" ? "Approved" : "Investigating"}
                                </span>
                              )}
                              {(item.status === "declined") && (
                                <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-md bg-rose-100 text-rose-700 border border-rose-200 whitespace-nowrap">
                                  Rejected
                                </span>
                              )}
                              {(item.status === "completed" || item.status === "resolved") && (
                                <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                  {item.status === "completed" ? "Released" : "Resolved"}
                                </span>
                              )}
                              {(item.status === "closed") && (
                                <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                                  Closed
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                              {isRequest ? 'Document Request' : 
                               item.type === 'complaint' ? 'Complaint' : 'Report'}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1 sm:space-y-2 bg-slate-50 rounded-lg p-2 sm:p-3 border border-slate-100">
                          {isRequest ? (
                            <div>
                              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-0.5 sm:mb-1">Purpose</p>
                              <p className="text-[10px] sm:text-xs text-slate-700 leading-relaxed">
                                {item.purpose && item.purpose.length > 80 
                                  ? `${item.purpose.substring(0, 80)}...` 
                                  : item.purpose || 'Not specified'}
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-[10px] sm:text-xs font-medium text-slate-500">Category</p>
                                  <p className="text-[10px] sm:text-xs text-slate-700">{item.category}</p>
                                </div>
                                <div className="flex-1 text-right">
                                  <p className="text-[10px] sm:text-xs font-medium text-slate-500">Location</p>
                                  <p className="text-[10px] sm:text-xs text-slate-700">{item.location}</p>
                                </div>
                              </div>
                              {item.description && (
                                <div>
                                  <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-0.5 sm:mb-1">Details</p>
                                  <p className="text-[10px] sm:text-xs text-slate-700 leading-relaxed">
                                    {item.description.length > 80 
                                      ? `${item.description.substring(0, 80)}...` 
                                      : item.description}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs">
                          <div className="flex items-center gap-1 text-slate-500">
                            <CalendarOutlined className="text-slate-400" />
                            <span>{isRequest ? 'Requested' : 'Submitted'} {formatDate(item.createdAt || item.requestedAt)}</span>
                          </div>
                          {isRequest && item.status === "completed" && item.completedAt && (
                            <div className="flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircleOutlined />
                              <span>Released {formatDate(item.completedAt)}</span>
                            </div>
                          )}
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
