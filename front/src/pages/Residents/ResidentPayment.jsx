import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Tabs, Table, Pagination } from "antd";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
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
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_BASE}/api/resident/payments`, {
        headers,
      });

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
    () =>
      payments.reduce(
        (acc, payment) => {
          const balance = payment.balance || 0;
          if (payment.status === "pending" || payment.status === "overdue") {
            acc.totalDue += balance;
          }
          if (payment.status === "overdue") {
            acc.overdueAmount += balance;
          }
          acc.paidAmount += payment.amountPaid || 0;
          return acc;
        },
        { totalDue: 0, overdueAmount: 0, paidAmount: 0 }
      ),
    [payments]
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
      <main className="mx-auto w-full max-w-9xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold text-slate-900">
                Resident Payments
              </CardTitle>
              <CardDescription>
                Track your garbage and streetlight fee payments, outstanding balances, and due dates.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-blue-900">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs font-medium text-blue-700">Payment Schedule</p>
                <p className="text-sm font-semibold">Monthly (Due end of month)</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Payment Summary</CardTitle>
            <CardDescription>Overview of your current balances and recent payments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="w-full border border-amber-200 bg-amber-50">
                <CardContent className="space-y-2 px-4 py-5 sm:px-6">
                  <p className="text-sm font-medium text-amber-700">Current Balance Due</p>
                  <p className="text-2xl font-bold text-amber-900">
                    ₱{totals.totalDue.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-600">
                    Includes pending and overdue balances across all fees.
                  </p>
                </CardContent>
              </Card>
              <Card className="w-full border border-rose-200 bg-rose-50">
                <CardContent className="space-y-2 px-4 py-5 sm:px-6">
                  <p className="text-sm font-medium text-rose-700">Overdue Amount</p>
                  <p className="text-2xl font-bold text-rose-900">
                    ₱{totals.overdueAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-rose-600">
                    Amounts past due that need immediate attention.
                  </p>
                </CardContent>
              </Card>
              <Card className="w-full border border-emerald-200 bg-emerald-50">
                <CardContent className="space-y-2 px-4 py-5 sm:px-6">
                  <p className="text-sm font-medium text-emerald-700">Total Paid (This Year)</p>
                  <p className="text-2xl font-bold text-emerald-900">
                    ₱{totals.paidAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-emerald-600">
                    Total successful payments recorded for your household.
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Barangay Fee Information
            </CardTitle>
            <CardDescription>
              Monthly rates for garbage collection and streetlight maintenance services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className="w-full border border-slate-200 bg-white shadow-none">
                <CardContent className="space-y-3 px-4 py-5 sm:px-6">
                  <p className="text-base font-semibold text-blue-800">Garbage Collection Fee</p>
                  <p className="text-sm text-muted-foreground">
                    Covers waste management services for your household, billed monthly.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Monthly Rate (Standard):</span>
                      <span className="font-semibold text-slate-900">₱35.00</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Monthly Rate (With Business):</span>
                      <span className="font-semibold text-slate-900">₱50.00</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Annual Total Range:</span>
                      <span className="font-semibold text-slate-900">₱420.00 – ₱600.00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="w-full border border-slate-200 bg-white shadow-none">
                <CardContent className="space-y-3 px-4 py-5 sm:px-6">
                  <p className="text-base font-semibold text-blue-800">Streetlight Maintenance Fee</p>
                  <p className="text-sm text-muted-foreground">
                    Funds the maintenance of community streetlights, collected monthly.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Monthly Rate:</span>
                      <span className="font-semibold text-slate-900">₱10.00</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Annual Total:</span>
                      <span className="font-semibold text-slate-900">₱120.00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong className="font-semibold text-slate-900">Note:</strong> Payments are due by the
              last calendar day of each month. Balances that remain unsettled after the due date
              automatically become overdue.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Monthly Overview</CardTitle>
              <CardDescription>Monitor billing status for each month across your fees.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Garbage Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Streetlight Fee
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {monthlyOverview.map((month) => (
                    <tr key={month.monthKey} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-700">{month.label}</td>
                      <td className="px-6 py-4">
                        {renderOverviewCell(month.garbage, month.garbageStatus)}
                      </td>
                      <td className="px-6 py-4">
                        {renderOverviewCell(month.streetlight, month.streetlightStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Payment History</CardTitle>
              <CardDescription>Review individual charges and their payment status.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs 
                defaultActiveKey="all"
                className="mb-6"
                type="card"
                items={[
                  {
                    key: 'all',
                    label: `All (${statusCounts.all})`,
                    children: null,
                  },
                  {
                    key: 'pending',
                    label: `Pending (${statusCounts.pending})`,
                    children: null,
                  },
                  {
                    key: 'overdue',
                    label: `Overdue (${statusCounts.overdue})`,
                    children: null,
                  },
                  {
                    key: 'paid',
                    label: `Paid (${statusCounts.paid})`,
                    children: null,
                  },
                ]}
                onChange={(key) => {
                  setActiveTab(key);
                }}
              />
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Charge
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          Loading...
                        </td>
                      </tr>
                    ) : filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-slate-500">
                          No payments found
                        </td>
                      </tr>
                    ) : (
                      paginatedPayments.map((payment) => (
                        <tr key={payment.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                <DollarSign className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{payment.type}</p>
                                <p className="text-xs text-slate-500">{payment.period}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-700">{payment.type}</td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-slate-700">₱{payment.amount.toFixed(2)}</p>
                              <p className="text-xs text-slate-500">Paid: ₱{payment.amountPaid.toFixed(2)}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-700">₱{payment.balance.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            {payment.status === 'paid' && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                                PAID
                              </span>
                            )}
                            {payment.status === 'pending' && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                PENDING
                              </span>
                            )}
                            {payment.status === 'overdue' && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                OVERDUE
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
                <div className="mt-4 flex items-center justify-end">
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
