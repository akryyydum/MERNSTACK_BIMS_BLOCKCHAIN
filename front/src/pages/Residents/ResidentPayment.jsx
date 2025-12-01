import React, { useEffect, useMemo, useState } from "react";
import apiClient from "@/utils/apiClient";
import { Tabs, Table, Pagination } from "antd";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
} from "lucide-react";

import ResidentNavbar from "./ResidentNavbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";

const toNumber = (value) => Number(value ?? 0);

const parseMonthToDueDate = (monthKey, fallback) => {
  if (typeof monthKey === "string" && monthKey.includes("-")) {
    const [year, month] = monthKey.split("-");
    if (!Number.isNaN(Number(year)) && !Number.isNaN(Number(month))) {
      return new Date(Number(year), Number(month), 0);
    }
  }
  if (fallback) return new Date(fallback);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
};

const formatMonthPeriod = (monthKey, fallbackDate) => {
  if (typeof monthKey === "string" && monthKey.includes("-")) {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
  }
  if (fallbackDate) {
    const date = new Date(fallbackDate);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
  }
  return monthKey || "N/A";
};

const computeStatus = (balance, dueDate) => {
  const normalizedBalance = Number(balance || 0);
  if (normalizedBalance <= 0) return "paid";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const sameMonth =
    due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth();

  if (due < today) return "overdue";
  if (sameMonth) return "pending";
  return "upcoming";
};

const deriveMissingStatus = (monthKey) => {
  const due = parseMonthToDueDate(monthKey);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sameMonth = due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth();
  if (due < today) return "overdue";
  if (sameMonth) return "pending";
  return "upcoming";
};

const deriveTypeLabel = (type) => {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("street")) return "Streetlight Fee";
  return "Garbage Fee";
};

const normalizeUtilityResponse = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const containers = [
    { key: "garbage", type: "garbage" },
    { key: "garbagePayments", type: "garbage" },
    { key: "streetlight", type: "streetlight" },
    { key: "streetlightPayments", type: "streetlight" },
    { key: "utilityPayments", type: "garbage" }, // These are garbage fees
    { key: "gasPayments", type: "garbage" }, // Gas payments are also garbage fees
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
  const typeLabel = deriveTypeLabel(raw.type);
  const monthKey = raw.month || raw.period || raw.billingMonth;
  const dueDate = parseMonthToDueDate(monthKey, raw.dueDate);
  const amount = toNumber(raw.totalCharge);
  const amountPaid = toNumber(raw.amountPaid);
  const balance =
    raw.balance !== undefined
      ? Math.max(toNumber(raw.balance), 0)
      : Math.max(amount - amountPaid, 0);
  const status = computeStatus(balance, dueDate);

  const latestPayment =
    Array.isArray(raw.payments) && raw.payments.length > 0
      ? raw.payments[raw.payments.length - 1]
      : null;
  const paymentDateCandidate =
    raw.completedAt ||
    raw.completedDate ||
    latestPayment?.paidAt ||
    raw.updatedAt ||
    raw.transactionDate;

  return {
    id:
      raw._id ||
      raw.id ||
      `${typeLabel.toLowerCase().replace(/\s+/g, "-")}-${monthKey || Date.now()}`,
    description: `${typeLabel} — ${formatMonthPeriod(monthKey, raw.dueDate)}`,
    type: typeLabel,
    period: formatMonthPeriod(monthKey, raw.dueDate),
    amount,
    amountPaid,
    balance,
    dueDate: dueDate.toISOString(),
    paymentDate: paymentDateCandidate ? new Date(paymentDateCandidate).toISOString() : null,
    status,
    monthKey:
      monthKey ||
      `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}`,
  };
};

export default function ResidentPayment() {
  const [loading, setLoading] = useState(false);
  const [resident, setResident] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    setResident(userProfile);
    fetchResidentPayments();
  }, []);

  const fetchResidentPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/resident/payments');

      // Store the payment summary for annual calculations
      setPaymentSummary(response.data);
      
      const normalizedEntries = normalizeUtilityResponse(response.data);
      const mapped = normalizedEntries
        .filter((item) => item.month || item.dueDate)
        .map((item) => buildPaymentRecord(item))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

      setPayments(mapped);
    } catch (error) {
      console.error("Failed to load resident payments:", error);
      setError(error?.response?.data?.message || "Unable to load your payment history right now.");
      setPayments([]);
      setPaymentSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const statusCounts = useMemo(
    () =>
      payments.reduce(
        (acc, payment) => {
          acc.all += 1;
          acc[payment.status] = (acc[payment.status] || 0) + 1;
          return acc;
        },
        { all: 0, pending: 0, overdue: 0, paid: 0, upcoming: 0 }
      ),
    [payments]
  );

  const totals = useMemo(
    () => {
      // Use payment summary data if available, otherwise calculate from payments
      if (paymentSummary) {
        const garbageFees = paymentSummary.garbageFees || {};
        const streetlightFees = paymentSummary.streetlightFees || {};
        
        return {
          totalDue: (garbageFees.outstandingBalance || 0) + (streetlightFees.outstandingBalance || 0),
          overdueAmount: 0, // Would need additional logic for overdue calculation
          paidAmount: (garbageFees.totalPaid || 0) + (streetlightFees.totalPaid || 0),
          garbageYearlyTotal: garbageFees.annualTotal || 0,
          garbageYearlyDue: garbageFees.outstandingBalance || 0,
          garbageYearlyPaid: garbageFees.totalPaid || 0,
          streetlightYearlyTotal: streetlightFees.annualTotal || 0,
          streetlightYearlyDue: streetlightFees.outstandingBalance || 0,
          streetlightYearlyPaid: streetlightFees.totalPaid || 0
        };
      }

      // Fallback to old calculation method if no payment summary
      return payments.reduce(
        (acc, payment) => {
          const balance = payment.balance || 0;
          const amountPaid = payment.amountPaid || 0;
          const totalAmount = payment.amount || 0;
          
          // Overall totals
          if (payment.status === "pending" || payment.status === "overdue") {
            acc.totalDue += balance;
          }
          if (payment.status === "overdue") {
            acc.overdueAmount += balance;
          }
          acc.paidAmount += amountPaid;
          
          // Yearly totals by type (current year only)
          const currentYear = new Date().getFullYear();
          const paymentYear = payment.monthKey ? parseInt(payment.monthKey.split('-')[0]) : currentYear;
          
          if (paymentYear === currentYear) {
            if (payment.type === "Garbage Fee") {
              acc.garbageYearlyTotal += totalAmount;
              acc.garbageYearlyPaid += amountPaid;
              acc.garbageYearlyDue += balance;
            } else if (payment.type === "Streetlight Fee") {
              acc.streetlightYearlyTotal += totalAmount;
              acc.streetlightYearlyPaid += amountPaid;
              acc.streetlightYearlyDue += balance;
            }
          }
          
          return acc;
        },
        { 
          totalDue: 0, 
          overdueAmount: 0, 
          paidAmount: 0,
          garbageYearlyTotal: 0,
          garbageYearlyDue: 0,
          garbageYearlyPaid: 0,
          streetlightYearlyTotal: 0,
          streetlightYearlyDue: 0,
          streetlightYearlyPaid: 0
        }
      );
    },
    [payments, paymentSummary]
  );

  const filteredPayments = useMemo(() => {
    if (activeTab === "all") return payments;
    return payments.filter((payment) => payment.status === activeTab);
  }, [payments, activeTab]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredPayments.slice(startIndex, endIndex);
  }, [filteredPayments, currentPage, pageSize]);

  // Reset to first page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const monthlyOverview = useMemo(() => {
    const map = new Map();

    payments.forEach((payment) => {
      const key =
        payment.monthKey ||
        (payment.dueDate ? new Date(payment.dueDate).toISOString().slice(0, 7) : null);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          monthKey: key,
          dueDate: parseMonthToDueDate(key, payment.dueDate),
          label: formatMonthPeriod(key, payment.dueDate),
          garbage: null,
          streetlight: null,
        });
      }
      const entry = map.get(key);
      if (payment.type === "Garbage Fee") entry.garbage = payment;
      if (payment.type === "Streetlight Fee") entry.streetlight = payment;
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    for (let month = 0; month < 12; month += 1) {
      const key = `${currentYear}-${String(month + 1).padStart(2, "0")}`;
      if (!map.has(key)) {
        map.set(key, {
          monthKey: key,
          dueDate: parseMonthToDueDate(key),
          label: formatMonthPeriod(key),
          garbage: null,
          streetlight: null,
        });
      }
    }

    const rows = Array.from(map.values()).map((entry) => {
      const dueISO = entry.dueDate.toISOString();
      return {
        ...entry,
        dueDate: dueISO,
        garbageStatus: entry.garbage ? entry.garbage.status : deriveMissingStatus(entry.monthKey),
        streetlightStatus: entry.streetlight
          ? entry.streetlight.status
          : deriveMissingStatus(entry.monthKey),
      };
    });

    rows.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return rows;
  }, [payments]);

  const renderStatus = (status) => {
    const config = {
      paid: {
        label: "Paid",
        className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
        Icon: CheckCircle2,
      },
      pending: {
        label: "Pending",
        className: "border border-sky-200 bg-sky-50 text-sky-700",
        Icon: Clock,
      },
      overdue: {
        label: "Overdue",
        className: "border border-rose-200 bg-rose-50 text-rose-700",
        Icon: AlertTriangle,
      },
    };

    const { label, className, Icon } =
      config[status] || {
        label: status,
        className: "border border-slate-200 bg-slate-50 text-slate-600",
        Icon: Info,
      };

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  };

  const renderOverviewCell = (record, status) => {
    const charge = record?.amount ?? 0;
    const paid = record?.amountPaid ?? 0;
    const description = record
      ? `Charge ₱${charge.toFixed(2)} · Paid ₱${paid.toFixed(2)}`
      : status === "overdue"
      ? "No payment recorded"
      : status === "pending"
      ? "Due this month"
      : "Awaiting billing";

    return (
      <div className="flex flex-col gap-1">
        {renderStatus(status)}
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ResidentNavbar />
      <main className="mx-auto w-full max-w-9xl space-y-4 px-3 py-4 sm:px-4 lg:px-6">
        <Card className="w-full border border-slate-200 shadow-md bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-800">
                  Resident Payments
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-600">
                  Track your garbage and streetlight fee payments, outstanding balances, and due dates.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 sm:px-4 sm:py-3 text-blue-900">
                <span className="text-lg sm:text-xl font-bold text-blue-600">₱</span>
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-blue-700">Payment Schedule</p>
                  <p className="text-xs sm:text-sm font-semibold">Monthly (Due end of month)</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {error && (
          <Card className="w-full bg-rose-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-rose-900 mb-1">
                    Unable to Load Payment Information
                  </h4>
                  <p className="text-sm text-rose-700">
                    {error}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="w-full border border-slate-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">Payment Summary</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">Overview of your current balances and recent payments</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 grid-rows-2 gap-2 sm:gap-4 md:grid-cols-3 md:grid-rows-1">
              <Card className="w-full border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-amber-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-200">
                      <span className="text-amber-600 text-2xl sm:text-3xl font-bold">₱</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Balance Due</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">₱{totals.totalDue.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">Outstanding</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="w-full border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-rose-50 to-white">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 border border-rose-200">
                      <AlertTriangle className="text-rose-600 text-lg sm:text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Overdue</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">₱{totals.overdueAmount.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">Needs attention</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="w-full border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-emerald-50 to-white col-span-2 md:col-span-1">
                <CardContent className="p-2 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                      <span className="text-emerald-600 text-2xl sm:text-3xl font-bold">₱</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Total Paid</p>
                      <p className="text-xl sm:text-3xl font-bold text-slate-800">₱{totals.paidAmount.toFixed(2)}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">This year</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Yearly Breakdown by Fee Type */}
        <Card className="w-full border border-slate-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">
              {new Date().getFullYear()} Yearly Breakdown
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Detailed breakdown of garbage and streetlight fees for the current year
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              {/* Garbage Fee Yearly Summary */}
              <Card className="w-full border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-orange-50 to-white">
                <CardContent className="p-3 sm:px-4 sm:py-5">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-orange-100 flex items-center justify-center border border-orange-200">
                      <span className="text-orange-600 text-xl sm:text-2xl font-bold">₱</span>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-800">Garbage Fees</h3>
                      <p className="text-[10px] sm:text-xs text-slate-500">Year-to-date</p>
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-slate-600">Outstanding:</span>
                      <span className="text-sm sm:text-base font-bold text-slate-800">
                        ₱{totals.garbageYearlyDue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-slate-600">Total Paid:</span>
                      <span className="text-sm sm:text-base font-semibold text-emerald-700">
                        ₱{totals.garbageYearlyPaid.toFixed(2)}
                      </span>
                    </div>
                    <hr className="border-slate-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-medium text-slate-600">Total Fees:</span>
                      <span className="text-base sm:text-lg font-bold text-slate-800">
                        ₱{totals.garbageYearlyTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Streetlight Fee Yearly Summary */}
              <Card className="w-full border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-blue-50 to-white">
                <CardContent className="p-3 sm:px-4 sm:py-5">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200">
                      <span className="text-blue-600 text-xl sm:text-2xl font-bold">₱</span>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-800">Streetlight Fees</h3>
                      <p className="text-[10px] sm:text-xs text-slate-500">Year-to-date</p>
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-slate-600">Outstanding:</span>
                      <span className="text-sm sm:text-base font-bold text-slate-800">
                        ₱{totals.streetlightYearlyDue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-slate-600">Total Paid:</span>
                      <span className="text-sm sm:text-base font-semibold text-emerald-700">
                        ₱{totals.streetlightYearlyPaid.toFixed(2)}
                      </span>
                    </div>
                    <hr className="border-slate-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-medium text-slate-600">Total Fees:</span>
                      <span className="text-base sm:text-lg font-bold text-slate-800">
                        ₱{totals.streetlightYearlyTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full border border-slate-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">
              Barangay Fee Information
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Monthly rates for garbage collection and streetlight maintenance services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-5 sm:space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              <Card className="w-full border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="space-y-2 p-3 sm:space-y-3 sm:px-4 sm:py-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center border border-orange-200">
                      <span className="text-orange-600 text-lg font-bold">₱</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-slate-800">Garbage Collection Fee</p>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Covers waste management services for your household, billed monthly
                  </p>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Standard Rate:</span>
                      <span className="font-semibold text-slate-900">₱35.00/month</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">With Business:</span>
                      <span className="font-semibold text-slate-900">₱50.00/month</span>
                    </div>
                    <hr className="border-slate-200 my-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Annual Range:</span>
                      <span className="font-bold text-slate-900">₱420.00 – ₱600.00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="w-full border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="space-y-2 p-3 sm:space-y-3 sm:px-4 sm:py-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center border border-blue-200">
                      <span className="text-blue-600 text-lg font-bold">₱</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-slate-800">Streetlight Maintenance Fee</p>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Funds the maintenance of community streetlights, collected monthly
                  </p>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Monthly Rate:</span>
                      <span className="font-semibold text-slate-900">₱10.00/month</span>
                    </div>
                    <hr className="border-slate-200 my-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Annual Total:</span>
                      <span className="font-bold text-slate-900">₱120.00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-xs sm:text-sm text-blue-900">
                <strong className="font-semibold">Important:</strong> Payments are due by the
                last calendar day of each month. Balances that remain unsettled after the due date
                automatically become overdue.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
          <Card className="w-full border border-slate-200 shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">Monthly Overview</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-600">Monitor billing status for each month across your fees</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
                <table className="min-w-full bg-white table-auto">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Month
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Garbage Fee
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Streetlight Fee
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {monthlyOverview.map((month) => (
                      <tr key={month.monthKey} className="hover:bg-slate-50 transition-colors duration-150">
                        <td className="py-4 px-4 text-sm text-slate-700 font-medium">{month.label}</td>
                        <td className="py-4 px-4">
                          {renderOverviewCell(month.garbage, month.garbageStatus)}
                        </td>
                        <td className="py-4 px-4">
                          {renderOverviewCell(month.streetlight, month.streetlightStatus)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full border border-slate-200 shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">Payment History</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-600">Review individual charges and their payment status</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <Tabs 
                defaultActiveKey="all"
                className="mb-4"
                type="card"
                items={[
                  {
                    key: 'all',
                    label: 'All Payments',
                    children: null,
                  },
                  {
                    key: 'pending',
                    label: 'Pending',
                    children: null,
                  },
                  {
                    key: 'overdue',
                    label: 'Overdue',
                    children: null,
                  },
                  {
                    key: 'paid',
                    label: 'Paid',
                    children: null,
                  },
                ]}
                onChange={(key) => {
                  setActiveTab(key);
                }}
              />
              
              <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
                <table className="min-w-full bg-white table-auto">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Description
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                        Type
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Charge
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide hidden md:table-cell">
                        Balance
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8">
                          <div className="flex justify-center items-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            <span className="ml-2 text-slate-500">Loading payments...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 sm:py-12">
                          <div className="flex flex-col items-center">
                            <span className="text-slate-400 text-5xl font-bold mb-3">₱</span>
                            <p className="text-slate-500 font-medium text-base sm:text-lg">No payments found</p>
                            <p className="text-slate-400 text-sm sm:text-base mt-1">
                              {activeTab === 'all' ? 'No payment records available' : `No ${activeTab} payments`}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50 transition-colors duration-150">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                                <span className="text-slate-600 text-lg font-bold">₱</span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 text-sm">{payment.type}</p>
                                <p className="text-xs text-slate-500">{payment.period}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-700 hidden sm:table-cell">{payment.type}</td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="text-sm font-medium text-slate-700">₱{payment.amount.toFixed(2)}</p>
                              <p className="text-xs text-slate-500">Paid: ₱{payment.amountPaid.toFixed(2)}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-700 font-medium hidden md:table-cell">
                            ₱{payment.balance.toFixed(2)}
                          </td>
                          <td className="py-4 px-4">
                            {payment.status === 'paid' && (
                              <span className="px-2 py-1 text-xs font-medium rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Paid
                              </span>
                            )}
                            {payment.status === 'pending' && (
                              <span className="px-2 py-1 text-xs font-medium rounded-md bg-amber-100 text-amber-700 border border-amber-200">
                                Pending
                              </span>
                            )}
                            {payment.status === 'overdue' && (
                              <span className="px-2 py-1 text-xs font-medium rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                                Overdue
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {filteredPayments.length > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length} payments
                  </p>
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={filteredPayments.length}
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
        </div>
      </main>
    </div>
  );
}
