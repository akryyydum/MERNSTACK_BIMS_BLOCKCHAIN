import React, { useEffect, useState, useMemo } from "react";
import { Table, Input, Button, Modal, Form, Select, message, Popconfirm, Descriptions, DatePicker, InputNumber, Tag } from "antd";
import dayjs from "dayjs";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { UserOutlined, DeleteOutlined, PlusOutlined, FileExcelOutlined, HomeOutlined } from "@ant-design/icons";
import axios from "axios";
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";

export default function AdminStreetLightFees() {
  const [loading, setLoading] = useState(false);
  const [households, setHouseholds] = useState([]);
  const [streetlightPayments, setStreetlightPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payForm] = Form.useForm();
  const [payLoading, setPayLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paySummary, setPaySummary] = useState(null);
  const [payHousehold, setPayHousehold] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewHousehold, setViewHousehold] = useState(null);
  
  // State for general add payment modal
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [addPaymentForm] = Form.useForm();
  const [selectedHouseholdForPayment, setSelectedHouseholdForPayment] = useState(null);
  const [showMemberSelection, setShowMemberSelection] = useState(false);
  const [searchType, setSearchType] = useState('household'); // 'household' or 'member'
  
  // State for payment history modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyHousehold, setHistoryHousehold] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  
  // State for multiple month payments
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [monthPaymentStatus, setMonthPaymentStatus] = useState({});

  // State for export Excel modal
  const [exportOpen, setExportOpen] = useState(false);
  const [exportForm] = Form.useForm();
  const [exporting, setExporting] = useState(false);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('streetlightFeesColumnsVisibility');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      purok: true,
      monthlyFee: true,
      paymentStatus: true,
      balance: true
    };
  });

  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('streetlightFeesColumnsVisibility', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Get user info from localStorage
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    fetchHouseholds();
    fetchStreetlightPayments();
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/admin/households`, { headers: authHeaders() });
      setHouseholds(res.data || []);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load households");
    } finally {
      setLoading(false);
    }
  };

  const fetchStreetlightPayments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/streetlight-payments`, { headers: authHeaders() });
      setStreetlightPayments(res.data || []);
    } catch (err) {
      console.error("Error fetching streetlight payments:", err);
      message.warning("Could not load payment history. Table may not show updated payment status.");
    }
  };

  // Fetch payment status for all months in current year
  const fetchYearlyPaymentStatus = async (householdId) => {
    try {
      const currentYear = dayjs().year();
      const monthStatuses = {};
      
      // Check payment status for each month of the current year
      for (let month = 1; month <= 12; month++) {
        const monthStr = `${currentYear}-${String(month).padStart(2, "0")}`;
        try {
          const res = await axios.get(`${API_BASE}/api/admin/households/${householdId}/streetlight`, {
            headers: authHeaders(),
            params: { month: monthStr },
          });
          monthStatuses[monthStr] = {
            ...res.data,
            isPaid: res.data.status === 'paid'
          };
        } catch (err) {
          // If no payment record exists, consider it unpaid
          const defaultFee = 10; // Fixed fee for streetlight
          monthStatuses[monthStr] = {
            month: monthStr,
            totalCharge: defaultFee,
            amountPaid: 0,
            balance: defaultFee,
            status: 'unpaid',
            isPaid: false
          };
        }
      }
      
      setMonthPaymentStatus(monthStatuses);
      return monthStatuses;
    } catch (err) {
      console.error("Error fetching yearly payment status:", err);
      message.error("Failed to load payment status for the year");
      return {};
    }
  };

  const openPayFee = async (household) => {
    setPayHousehold(household);
    setPayOpen(true);
    
    // Fetch payment status for all months in the current year
    const yearlyStatus = await fetchYearlyPaymentStatus(household._id);
    
    // Find unpaid months and set as initial selection
    const unpaidMonths = Object.keys(yearlyStatus).filter(month => !yearlyStatus[month].isPaid);
    const initialMonths = unpaidMonths.slice(0, 1); // Start with current month if unpaid
    setSelectedMonths(initialMonths);
    
    // Calculate initial totals
    const defaultFee = 10; // Fixed fee for streetlight
    const totalCharge = initialMonths.length * defaultFee;
    
    payForm.setFieldsValue({
      selectedMonths: initialMonths,
      totalCharge: totalCharge,
      amount: totalCharge,
      method: "Cash",
    });
  };

  const submitPayFee = async () => {
    try {
      setPayLoading(true);
      const values = await payForm.validateFields();
      if (!selectedMonths || selectedMonths.length === 0) {
        message.error("Please select at least one month to pay");
        setPayLoading(false);
        return;
      }
      const fee = 10;
      const amount = Number(values.amount);
      if (!amount || amount <= 0) {
        message.error("Amount must be greater than 0");
        setPayLoading(false);
        return;
      }
      // Process payment for each selected month
      const paymentPromises = selectedMonths.map(monthKey => {
        // Always send all required fields, and ensure month is a string
        const payload = {
          month: String(monthKey),
          amount: amount / selectedMonths.length,
          totalCharge: fee,
          method: values.method || "cash",
          reference: values.reference || "",
        };
        return axios.post(
          `${API_BASE}/api/admin/households/${payHousehold._id}/streetlight/pay`,
          payload,
          { headers: authHeaders() }
        ).catch(error => {
          // Log backend error for debugging
          console.error("Streetlight payment error:", error?.response?.data || error);
          throw error;
        });
      });
      // Wait for all payments to complete
      await Promise.all(paymentPromises);
      // Show success message
      const paidMonths = selectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ");
      message.success(`Payment recorded for ${selectedMonths.length} month(s): ${paidMonths}`);
      // Reset form and state
      setPayOpen(false);
      setPaySummary(null);
      setPayHousehold(null);
      setSelectedMonths([]);
      setMonthPaymentStatus({});
      payForm.resetFields();
      // Show refreshing indicator and refresh all data
      setRefreshing(true);
      try {
        await Promise.all([
          fetchHouseholds(),
          fetchStreetlightPayments(),
          fetchStatistics()
        ]);
        message.success("Payment recorded and table updated successfully!");
      } catch (refreshError) {
        console.error("Error refreshing data:", refreshError);
        message.warning("Payment recorded but there was an issue refreshing the display. Please refresh the page.");
      } finally {
        setRefreshing(false);
      }
    } catch (err) {
      // Show backend error message if available
      message.error(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setPayLoading(false);
    }
  };

  const deleteHouseholdPayments = async (household) => {
    try {
      setRefreshing(true);
      
      const res = await axios.delete(`${API_BASE}/api/admin/households/${household._id}/streetlight/payments`, {
        headers: authHeaders()
      });
      
      message.success(`${res.data.deletedCount} payment records deleted for ${household.householdId}. Reset to unpaid status.`);
      
      // Refresh all data
      await Promise.all([
        fetchHouseholds(),
        fetchStreetlightPayments(),
        fetchStatistics()
      ]);
      
    } catch (err) {
      console.error("Error deleting payments:", err);
      message.error(err?.response?.data?.message || "Failed to delete payment records");
    } finally {
      setRefreshing(false);
    }
  };

  const openView = (household) => {
    setViewHousehold(household);
    setViewOpen(true);
  };

  const openPaymentHistory = async (household) => {
    try {
      setHistoryHousehold(household);
      setHistoryOpen(true);
      
      // Fetch payment history for this household
      const res = await axios.get(`${API_BASE}/api/admin/streetlight-payments`, {
        headers: authHeaders(),
        params: { householdId: household._id }
      });
      
      // Filter payments for this specific household
      const householdPayments = res.data.filter(payment => 
        payment.household._id === household._id || payment.household === household._id
      );
      
      setHistoryData(householdPayments);
    } catch (err) {
      console.error("Error fetching payment history:", err);
      message.error("Failed to load payment history");
    }
  };

  // Stat state
  const [stats, setStats] = useState({
    totalHouseholds: 0,
    monthlyRate: 10,
    totalCollected: {
      yearly: 0,
      monthly: 0
    },
    outstanding: {
      yearly: 0,
      monthly: 0
    },
    collectionRate: 0
  });
  
  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = dayjs().format('YYYY-MM');
      
      // Fetch fresh streetlight payments
      const paymentRes = await axios.get(`${API_BASE}/api/admin/streetlight-payments`, { headers: authHeaders() });
      const payments = paymentRes.data || [];
      
      console.log('Streetlight payments for statistics:', payments);
      console.log('Current month:', currentMonth);
      console.log('Current year:', currentYear);
      
      // Debug: Show all payments with their details
      payments.forEach((payment, index) => {
        console.log(`Payment ${index + 1}:`, {
          id: payment._id,
          household: payment.household?.householdId,
          month: payment.month,
          amountPaid: payment.amountPaid,
          type: payment.type
        });
      });
      
      const totalHouseholds = households.length;
      const monthlyRate = 10; // Fixed rate for streetlight
      
      // Calculate yearly collections (only count payments with valid household references)
      const yearlyPayments = payments.filter(p => {
        const paymentYear = dayjs(p.month + '-01').year();
        const hasValidHousehold = p.household && p.household.householdId;
        console.log(`Payment ${p._id} month: ${p.month}, year: ${paymentYear}, household: ${p.household?.householdId}, valid: ${hasValidHousehold}, matches current year: ${paymentYear === currentYear}`);
        return paymentYear === currentYear && hasValidHousehold;
      });
      const yearlyCollected = yearlyPayments.reduce((sum, p) => {
        console.log(`Adding yearly payment: ${p.amountPaid} from household ${p.household?.householdId}`);
        return sum + p.amountPaid;
      }, 0);
      
      // Calculate monthly collections (only count payments with valid household references)
      const monthlyPayments = payments.filter(p => {
        const hasValidHousehold = p.household && p.household.householdId;
        console.log(`Payment ${p._id} month: ${p.month}, current month: ${currentMonth}, household: ${p.household?.householdId}, valid: ${hasValidHousehold}, matches: ${p.month === currentMonth}`);
        return p.month === currentMonth && hasValidHousehold;
      });
      const monthlyCollected = monthlyPayments.reduce((sum, p) => {
        console.log(`Adding monthly payment: ${p.amountPaid} from household ${p.household?.householdId}`);
        return sum + p.amountPaid;
      }, 0);
      
      console.log('Yearly collected:', yearlyCollected);
      console.log('Monthly collected:', monthlyCollected);
      
      // Calculate expected amounts
      const expectedYearly = totalHouseholds * monthlyRate * 12;
      const expectedMonthly = totalHouseholds * monthlyRate;
      
      // Calculate outstanding amounts
      const yearlyOutstanding = expectedYearly - yearlyCollected;
      const monthlyOutstanding = expectedMonthly - monthlyCollected;
      
      // Calculate collection rate
      const collectionRate = expectedYearly > 0 ? 
        parseFloat(((yearlyCollected / expectedYearly) * 100).toFixed(1)) : 0;
      
      setStats({
        totalHouseholds,
        monthlyRate,
        totalCollected: {
          yearly: yearlyCollected,
          monthly: monthlyCollected
        },
        outstanding: {
          yearly: yearlyOutstanding,
          monthly: monthlyOutstanding
        },
        collectionRate
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Set default values if there's an error
      setStats({
        totalHouseholds: households.length,
        monthlyRate: 10,
        totalCollected: {
          yearly: 0,
          monthly: 0
        },
        outstanding: {
          yearly: households.length * 10 * 12,
          monthly: households.length * 10
        },
        collectionRate: 0
      });
    }
  };
  
  useEffect(() => {
    fetchStatistics();
  }, [households]);

  // Excel Export Functions
  const exportToExcel = async (values) => {
    setExporting(true);
    try {
      // Fetch fresh payment data before exporting
      const paymentRes = await axios.get(`${API_BASE}/api/admin/streetlight-payments`, { headers: authHeaders() });
      const freshStreetlightPayments = paymentRes.data || [];
      
      console.log('Fresh streetlight payment data for export:', freshStreetlightPayments);
      
      const { exportType, selectedMonth } = values;
      let exportData = [];
      let filename = '';
      
      if (exportType === 'whole-year') {
        // Export whole year data
        exportData = await generateYearlyExportData(freshStreetlightPayments);
        filename = `Streetlight_Fees_${new Date().getFullYear()}_Complete.xlsx`;
      } else if (exportType === 'chosen-month') {
        // Export chosen month data
        const selectedMonthStr = dayjs(selectedMonth).format('YYYY-MM');
        exportData = await generateMonthlyExportData(selectedMonthStr, freshStreetlightPayments);
        const monthName = dayjs(selectedMonth).format('MMMM_YYYY');
        filename = `Streetlight_Fees_${monthName}.xlsx`;
      } else if (exportType === 'current-month') {
        // Export current month data
        const currentMonth = dayjs().format('YYYY-MM');
        exportData = await generateMonthlyExportData(currentMonth, freshStreetlightPayments);
        const monthName = dayjs().format('MMMM_YYYY');
        filename = `Streetlight_Fees_${monthName}_Current.xlsx`;
      }

      if (exportData.length === 0) {
        message.warning('No data available for export');
        return;
      }

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-fit columns
      const colWidths = exportData.reduce((acc, row) => {
        Object.keys(row).forEach((key, idx) => {
          const value = row[key] ? row[key].toString() : '';
          acc[idx] = Math.max(acc[idx] || 0, value.length + 2, key.length + 2);
        });
        return acc;
      }, []);
      
      ws['!cols'] = colWidths.map(width => ({ width: Math.min(width, 50) }));

      XLSX.utils.book_append_sheet(wb, ws, 'Streetlight Fees Report');
      XLSX.writeFile(wb, filename);
      
      message.success('Excel file exported successfully!');
      setExportOpen(false);
      exportForm.resetFields();
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export Excel file');
    } finally {
      setExporting(false);
    }
  };

  const generateYearlyExportData = async (paymentData) => {
    const exportData = [];
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => 
      dayjs().month(i).format('YYYY-MM')
    );

    console.log('Generating yearly streetlight export with payments:', paymentData);
    console.log('Households for export:', households);

    for (const household of households) {
      const baseData = {
        'Household ID': household.householdId,
        'Head of Household': fullName(household.headOfHousehold),
        'Purok': household.address?.purok || 'N/A',
        'Monthly Fee': '₱10',
      };

      // Add monthly payment status for the year
      for (const month of months) {
        const monthName = dayjs(month).format('MMM YYYY');
      const payment = paymentData.find(p => 
        p.household && p.household.householdId && 
        p.household.householdId === household.householdId && 
        p.month === month
      );        console.log(`Checking streetlight payment for ${household.householdId} in ${month}:`, payment);
        
        baseData[`${monthName} Status`] = payment && payment.amountPaid > 0 ? 'Paid' : 'Unpaid';
        baseData[`${monthName} Amount`] = payment ? `₱${payment.amountPaid}` : '₱0';
      }

      // Calculate totals (only count payments with valid household references)
      const totalPaid = paymentData
        .filter(p => p.household && p.household.householdId && 
                p.household.householdId === household.householdId && 
                dayjs(p.month + '-01').year() === currentYear)
        .reduce((sum, p) => sum + p.amountPaid, 0);
        
      const expectedFee = 10; // Fixed rate for streetlight
      const expectedTotal = expectedFee * 12;
      const balance = expectedTotal - totalPaid;

      baseData['Total Paid'] = `₱${totalPaid}`;
      baseData['Expected Total'] = `₱${expectedTotal}`;
      baseData['Balance'] = `₱${balance}`;

      exportData.push(baseData);
    }

    return exportData;
  };

  const generateMonthlyExportData = async (monthStr, paymentData) => {
    const exportData = [];
    const targetMonth = dayjs(monthStr);

    console.log('Generating monthly streetlight export for:', monthStr);
    console.log('Payment data:', paymentData);
    console.log('Households:', households);

    for (const household of households) {
      const payment = paymentData.find(p => 
        p.household?.householdId === household.householdId && 
        p.month === monthStr
      );

      console.log(`Streetlight payment for ${household.householdId} in ${monthStr}:`, payment);

      const expectedFee = 10; // Fixed rate for streetlight
      const paidAmount = payment ? payment.amountPaid : 0;
      const status = payment && payment.amountPaid > 0 ? 'Paid' : 'Unpaid';
      const balance = expectedFee - paidAmount;

      // Get the latest payment date from payments array
      let paymentDate = 'Not Paid';
      if (payment && payment.payments && payment.payments.length > 0) {
        const latestPayment = payment.payments[payment.payments.length - 1];
        paymentDate = dayjs(latestPayment.paidAt).format('MMMM DD, YYYY');
      }

      exportData.push({
        'Household ID': household.householdId,
        'Head of Household': fullName(household.headOfHousehold),
        'Purok': household.address?.purok || 'N/A',
        'Monthly Fee': `₱${expectedFee}`,
        'Paid Amount': `₱${paidAmount}`,
        'Payment Status': status,
        'Balance': `₱${balance}`,
        'Payment Date': paymentDate,
        'Month': targetMonth.format('MMMM YYYY')
      });
    }

    console.log('Generated streetlight export data:', exportData);
    return exportData;
  };

  const fullName = (p) => [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(" ");

  // Get all members with their household info for searching
  const getAllMembersWithHousehold = () => {
    const membersWithHousehold = [];
    
    households.forEach(household => {
      if (household.members && Array.isArray(household.members)) {
        household.members.forEach(member => {
          membersWithHousehold.push({
            id: member._id,
            name: fullName(member),
            member: member,
            household: household,
            isHead: member._id === household.headOfHousehold._id,
            searchText: `${fullName(member)} ${household.householdId} ${household.address?.street} ${household.address?.purok}`.toLowerCase()
          });
        });
      }
    });
    
    return membersWithHousehold;
  };

  const allColumns = [
    {
      title: "Household ID",
      dataIndex: "householdId",
      key: "householdId",
      columnKey: "householdId",
    },
    {
      title: "Head of Household",
      key: "headOfHousehold",
      columnKey: "headOfHousehold",
      render: (_, record) => {
        const head = record.headOfHousehold;
        if (!head) return "Not specified";
        if (typeof head === "object") {
          return fullName(head) || "Not specified";
        }
        return "Unknown";
      },
    },
    {
      title: "Purok",
      key: "Purok",
      columnKey: "purok",
      render: (_, record) => {
        // Remove the word 'Purok' if present, show only the number
        const purok = record.address?.purok || "";
        if (typeof purok === "string") {
          return purok.replace(/purok\s*/i, "").trim();
        }
        return purok;
      },
      filters: [
        { text: "Purok 1", value: "Purok 1" },
        { text: "Purok 2", value: "Purok 2" },
        { text: "Purok 3", value: "Purok 3" },
        { text: "Purok 4", value: "Purok 4" },
        { text: "Purok 5", value: "Purok 5" },
      ],
      onFilter: (value, record) => record.address?.purok === value,
    },
    {
      title: "Monthly Fee",
      key: "monthlyFee",
      columnKey: "monthlyFee",
      render: () => "₱10.00", // Fixed fee for streetlight
    },
    {
      title: "Payment Status",
      key: "paymentStatus",
      columnKey: "paymentStatus",
      render: (_, record) => {
        // Calculate overall payment status for current year
        const defaultFee = 10;
        const currentYear = dayjs().year();
        let totalExpected = 0;
        let totalPaid = 0;
        
        // Check all months of current year
        for (let month = 1; month <= 12; month++) {
          const monthStr = `${currentYear}-${String(month).padStart(2, "0")}`;
          totalExpected += defaultFee;
          
          const monthPayment = streetlightPayments.find(payment => 
            payment.household?._id === record._id && payment.month === monthStr
          );
          
          if (monthPayment) {
            totalPaid += Number(monthPayment.amountPaid || 0);
          }
        }
        
        const balance = totalExpected - totalPaid;
        
        if (balance <= 0) {
          return <Tag color="green">Fully Paid</Tag>;
        } else if (totalPaid > 0) {
          return <Tag color="orange">Partially Paid</Tag>;
        } else {
          return <Tag color="red">Unpaid</Tag>;
        }
      },
    },
    {
      title: "Balance",
      key: "balance",
      columnKey: "balance",
      render: (_, record) => {
        // Calculate total unpaid balance for current year
        const defaultFee = 10;
        const currentYear = dayjs().year();
        let totalBalance = 0;
        let totalPaid = 0;
        let lastPaymentDate = null;
        const isSameHousehold = (a, b) => {
          if (!a || !b) return false;
          return String(a) === String(b);
        };
        for (let month = 1; month <= 12; month++) {
          const monthStr = `${currentYear}-${String(month).padStart(2, "0")}`;
          const monthPayment = streetlightPayments.find(payment =>
            (isSameHousehold(payment.household?._id, record._id) || isSameHousehold(payment.household, record._id)) && payment.month === monthStr
          );
          if (monthPayment) {
            totalBalance += Number(monthPayment.balance || 0);
            totalPaid += Number(monthPayment.amountPaid || 0);
            if (monthPayment.payments && monthPayment.payments.length > 0) {
              const latestPayment = monthPayment.payments[monthPayment.payments.length - 1];
              if (!lastPaymentDate || new Date(latestPayment.paidAt) > new Date(lastPaymentDate)) {
                lastPaymentDate = latestPayment.paidAt;
              }
            }
          } else {
            totalBalance += defaultFee;
          }
        }
        return (
          <div>
            <div className="font-semibold">₱{totalBalance.toFixed(2)}</div>
            {totalPaid > 0 && (
              <div className="text-xs text-gray-500">Paid: ₱{totalPaid.toFixed(2)}</div>
            )}
            {lastPaymentDate && (
              <div className="text-xs text-gray-400">Last: {dayjs(lastPaymentDate).format('MM/DD/YY')}</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      columnKey: "actions",
      render: (_, r) => {
        const isSameHousehold = (a, b) => {
          if (!a || !b) return false;
          return String(a) === String(b);
        };
        const hasPayments = streetlightPayments.some(payment => isSameHousehold(payment.household?._id, r._id) || isSameHousehold(payment.household, r._id));
        return (
          <div className="flex gap-1 flex-wrap">
            <Button size="small" onClick={() => openView(r)}>View</Button>
            <Button size="small" onClick={() => openPaymentHistory(r)}>History</Button>
            {hasPayments && (
              <Popconfirm
                title="Delete Payment Records"
                description={`Delete ALL payment records for ${r.householdId}? This will reset them to unpaid status.`}
                onConfirm={() => deleteHouseholdPayments(r)}
                okText="Delete"
                cancelText="Cancel"
                okType="danger"
              >
                <Button size="small" danger title="Delete all payment records for this household">Reset</Button>
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  // Filter columns based on visibility
  const columns = allColumns.filter(col => visibleColumns[col.columnKey]);

  const filteredHouseholds = useMemo(() => {
    if (!search) return households;
    const term = search.toLowerCase();
    return households.filter((h) => {
      const householdId = h.householdId?.toLowerCase() || "";
      const headName = fullName(h.headOfHousehold)?.toLowerCase() || "";
      const street = h.address?.street?.toLowerCase() || "";
      const purok = h.address?.purok?.toLowerCase() || "";
      return householdId.includes(term) || headName.includes(term) || street.includes(term) || purok.includes(term);
    });
  }, [households, search]);

  return (
    <AdminLayout title="Admin">
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Streetlight Fees Management
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
          
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Households
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {stats.totalHouseholds}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {stats.totalHouseholds}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Fee Structure
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    ₱{stats.monthlyRate}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">Monthly:</span> ₱{stats.monthlyRate}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">Yearly:</span> ₱{stats.monthlyRate * 12}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Collected
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    ₱{stats.totalCollected?.monthly || 0}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">Year:</span> ₱{stats.totalCollected?.yearly || 0}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">Month:</span> ₱{stats.totalCollected?.monthly || 0}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Balance
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    ₱{stats.outstanding?.monthly || 0}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">Year:</span> ₱{stats.outstanding?.yearly || 0}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">Month:</span> ₱{stats.outstanding?.monthly || 0}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Collection Rate
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {stats.collectionRate || 0}%
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {stats.collectionRate || 0}%
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
                placeholder="Search households..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 300 }}
                allowClear
                className="flex-1 sm:min-w-[280px] md:min-w-[300px]"
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
                    checked={visibleColumns.purok}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, purok: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Purok
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.monthlyFee}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, monthlyFee: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Monthly Fee
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.paymentStatus}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, paymentStatus: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Payment Status
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.balance}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, balance: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Balance
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                type="primary" 
                onClick={() => setAddPaymentOpen(true)}
              >
                + Add Payment
              </Button>
              <Button 
                onClick={() => setExportOpen(true)}
              >
                Export Excel
              </Button>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={filteredHouseholds}
            rowKey="_id"
            loading={loading || refreshing}
            pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total}`,
                pageSizeOptions: ['10', '20', '50', '100'],
                defaultPageSize: 10,
                size: 'default'
              }}
              scroll={{ x: 800 }}
          />
        </div>

        {/* Add Payment Modal */}
        <Modal
          title={
            <div>
              {searchType === 'household' ? 'Add Streetlight Fee Payment' : 'Add Payment by Member'}
              {!showMemberSelection && (
                <div className="flex gap-2 mt-2">
                </div>
              )}
            </div>
          }
          open={addPaymentOpen}
          onCancel={() => {
            setAddPaymentOpen(false);
            setShowMemberSelection(false);
            setSelectedHouseholdForPayment(null);
            setSearchType('household');
            addPaymentForm.resetFields();
          }}
          footer={[
            <Button key="cancel" onClick={() => {
              setAddPaymentOpen(false);
              setShowMemberSelection(false);
              setSelectedHouseholdForPayment(null);
              setSearchType('household');
              addPaymentForm.resetFields();
            }}>
              Cancel
            </Button>,
            ...(showMemberSelection ? [
              <Button key="back" onClick={() => {
                setShowMemberSelection(false);
                setSelectedHouseholdForPayment(null);
              }}>
                ← Back
              </Button>
            ] : []),
            <Button key="submit" type="primary" onClick={async () => {
              try {
                const values = await addPaymentForm.validateFields();
                
                if (searchType === 'member') {
                  // Member search: directly proceed to payment
                  const allMembers = getAllMembersWithHousehold();
                  const selectedMemberData = allMembers.find(m => m.id === values.memberId);
                  
                  if (selectedMemberData) {
                    setAddPaymentOpen(false);
                    addPaymentForm.resetFields();
                    setSearchType('household');
                    
                    // Open payment modal with member info
                    const householdWithPayingMember = {
                      ...selectedMemberData.household,
                      payingMember: selectedMemberData.member
                    };
                    openPayFee(householdWithPayingMember);
                  }
                } else if (!showMemberSelection) {
                  // Household search: show member selection
                  const selectedHousehold = households.find(h => h._id === values.householdId);
                  if (selectedHousehold) {
                    setSelectedHouseholdForPayment(selectedHousehold);
                    setShowMemberSelection(true);
                    addPaymentForm.setFieldValue('payingMemberId', selectedHousehold.headOfHousehold._id);
                  }
                } else {
                  // Member selection: proceed to payment
                  const payingMemberId = values.payingMemberId;
                  const payingMember = selectedHouseholdForPayment.members.find(m => m._id === payingMemberId);
                  
                  setAddPaymentOpen(false);
                  setShowMemberSelection(false);
                  addPaymentForm.resetFields();
                  
                  const householdWithPayingMember = {
                    ...selectedHouseholdForPayment,
                    payingMember: payingMember
                  };
                  openPayFee(householdWithPayingMember);
                  setSelectedHouseholdForPayment(null);
                }
              } catch (err) {
                console.error("Form validation failed:", err);
              }
            }}>
              {showMemberSelection ? 'Continue to Payment' : 
               searchType === 'member' ? 'Continue to Payment' : 
               'Select Member'}
            </Button>
          ]}
          width={900}
        >
          <Form form={addPaymentForm} layout="vertical" size="large">
            {!showMemberSelection ? (
              <div className="space-y-4">
                {/* Search Type Selection */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="text-base font-medium mb-4">How would you like to search?</div>
                  <div className="flex gap-4">
                    <Button 
                      type={searchType === 'household' ? 'primary' : 'default'}
                      icon={<HomeOutlined />}
                      size="large"
                      onClick={() => {
                        setSearchType('household');
                        addPaymentForm.resetFields();
                      }}
                    >
                      Search by Household
                    </Button>
                    <Button 
                      type={searchType === 'member' ? 'primary' : 'default'}
                      icon={<UserOutlined />}
                      size="large"
                      onClick={() => {
                        setSearchType('member');
                        addPaymentForm.resetFields();
                      }}
                    >
                      Search by Member Name
                    </Button>
                  </div>
                </div>
                {searchType === 'household' ? (
                  <Form.Item
                    name="householdId"
                    label="Select Household"
                    rules={[{ required: true, message: "Please select a household" }]}
                  >
                    <Select
                      showSearch
                      placeholder="Search by household ID, head of household, or address"
                      optionFilterProp="label"
                      filterOption={(input, option) =>
                        (option?.label || '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {households.map(household => (
                        <Select.Option
                          key={household._id}
                          value={household._id}
                          label={`${household.householdId} - ${fullName(household.headOfHousehold)}${household.address?.purok ? ` - ${household.address.purok}` : ''}`.trim()}
                        >
                          <span className="font-bold">{household.householdId}</span> - {fullName(household.headOfHousehold)}{household.address?.purok ? ` - ${household.address.purok}` : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                ) : (
                  <Form.Item
                    name="memberId"
                    label="Search by Member Name"
                    rules={[{ required: true, message: "Please select a household member" }]}
                  >
                    <Select
                      showSearch
                      placeholder="Type member name to search..."
                      optionFilterProp="children"
                      filterOption={(input, option) => {
                        const memberData = getAllMembersWithHousehold().find(m => m.id === option?.value);
                        return memberData?.searchText?.includes(input.toLowerCase()) || false;
                      }}
                    >
                      {getAllMembersWithHousehold().map(memberData => (
                        <Select.Option key={memberData.id} value={memberData.id}>
                          <span className="font-medium">{memberData.name}</span>
                          {memberData.isHead && <> <Tag color="blue" size="small">Head of Household</Tag></>}
                          {' - '}<span className="font-bold">{memberData.household.householdId}</span>
                          {memberData.household.address?.purok && ` - ${memberData.household.address.purok}`}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
                <div className="text-xs text-gray-500">
                  💡 {searchType === 'household' 
                    ? "Select a household, then choose which member is making the payment" 
                    : "Search by member name to quickly find their household and proceed to payment"}
                </div>
              </div>
            ) : (
              // Step 2: Member Selection
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800">Selected Household</h4>
                  <p className="text-blue-700">
                    {selectedHouseholdForPayment?.householdId} - {fullName(selectedHouseholdForPayment?.headOfHousehold)}
                  </p>
                  <p className="text-sm text-blue-600">
                    {selectedHouseholdForPayment?.address?.street}, {selectedHouseholdForPayment?.address?.purok}
                  </p>
                </div>
                
                <Form.Item
                  name="payingMemberId"
                  label="Who is making the payment?"
                  rules={[{ required: true, message: "Please select who is making the payment" }]}
                >
                  <Select placeholder="Select household member">
                    {selectedHouseholdForPayment?.members?.map(member => (
                      <Select.Option key={member._id} value={member._id}>
                        <div className="flex items-center gap-2">
                          <span>{fullName(member)}</span>
                          {member._id === selectedHouseholdForPayment.headOfHousehold._id && (
                            <Tag color="blue" size="small">Head of Household</Tag>
                          )}
                        </div>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <div className="text-xs text-gray-500">
                  💡 Any household member can make streetlight fee payments on behalf of the household.
                </div>
              </div>
            )}
          </Form>
        </Modal>

        {/* Pay Streetlight Fee Modal */}
        <Modal
          title={
            <div>
              {`Record Streetlight Fee Payment${payHousehold ? ` — ${payHousehold.householdId}` : ""}`}
              {payHousehold?.payingMember && (
                <div className="text-sm text-gray-600 font-normal mt-1">
                  Payment by: {fullName(payHousehold.payingMember)}
                  {payHousehold.payingMember._id === payHousehold.headOfHousehold._id && 
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Head of Household</span>
                  }
                </div>
              )}
            </div>
          }
          open={payOpen}
          onCancel={() => { 
            setPayOpen(false); 
            setPayHousehold(null); 
            setPaySummary(null); 
            setSelectedMonths([]);
            setMonthPaymentStatus({});
            payForm.resetFields();
          }}
          onOk={submitPayFee}
          okText="Record Payment"
          confirmLoading={payLoading}
          width={850}
        >
          <Form form={payForm} layout="vertical" initialValues={{ method: "Cash" }}>
            <Form.Item label="Fee Type" className="mb-3">
              <Input disabled value="Streetlight Maintenance Fee" size="small" />
            </Form.Item>
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg mb-3">
              <div className="text-sm font-semibold text-gray-700">Fee Information</div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Monthly Rate:</span> ₱10.00 (fixed for all households)
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Annual Rate:</span> ₱120.00
              </div>
              <div className="text-xs text-gray-500">
                💡 Streetlight fees are the same for all households regardless of business status
              </div>
            </div>
            {/* Month Selection - Consistent with Garbage Fees */}
            <Form.Item
              name="selectedMonths"
              label="Select Months to Pay (Current Year Only)"
              rules={[{ required: true, message: "Select at least one month" }]}
              className="mb-3"
            >
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(monthPaymentStatus)
                  .sort()
                  .map(monthKey => {
                    const monthData = monthPaymentStatus[monthKey];
                    const isPaid = monthData?.isPaid;
                    const monthName = dayjs(`${monthKey}-01`).format("MMM YYYY");
                    const balance = monthData?.balance || 0;
                    return (
                      <div
                        key={monthKey}
                        className={`p-2 border rounded-lg ${
                          isPaid 
                            ? 'bg-green-50 border-green-200 text-green-700' 
                            : selectedMonths.includes(monthKey)
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isPaid}
                            checked={selectedMonths.includes(monthKey)}
                            onChange={(e) => {
                              const newSelectedMonths = e.target.checked
                                ? [...selectedMonths, monthKey]
                                : selectedMonths.filter(m => m !== monthKey);
                              setSelectedMonths(newSelectedMonths);
                              payForm.setFieldValue("selectedMonths", newSelectedMonths);
                              // Update total charge calculation
                              const fee = 10;
                              const totalCharge = newSelectedMonths.length * fee;
                              payForm.setFieldValue("totalCharge", totalCharge);
                              payForm.setFieldValue("amount", totalCharge);
                            }}
                            className="mr-2"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{monthName}</div>
                            {isPaid ? (
                              <div className="text-xs text-green-600 font-medium">✓ Paid</div>
                            ) : (
                              <div className="text-xs text-gray-500">₱{balance.toFixed(0)}</div>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })
                }
              </div>
              {selectedMonths.length > 0 && (
                <div className="mt-1 text-sm text-blue-600">
                  Selected: {selectedMonths.length} month(s)
                </div>
              )}
            </Form.Item>
            <Form.Item
              name="totalCharge"
              label={`Total Charge (${selectedMonths.length} month${selectedMonths.length !== 1 ? 's' : ''})`}
              rules={[{ required: true, message: "Total charge calculated automatically" }]}
              className="mb-3"
            >
              <InputNumber className="w-full" disabled size="small" />
            </Form.Item>
            <Form.Item
              name="amount"
              label="Amount to Pay"
              rules={[{ required: true, message: "Enter amount to pay" }]}
              className="mb-3"
            >
              <InputNumber className="w-full" min={0} step={10} size="small" />
            </Form.Item>
            <Form.Item name="method" label="Payment Method" className="mb-3">
              <Input value="Cash" disabled size="small" />
            </Form.Item>
            {selectedMonths.length > 0 && (
              <div className="p-2 rounded border border-blue-200 bg-blue-50 text-sm">
                <div className="font-semibold text-blue-800 mb-1">Payment Summary:</div>
                <div className="space-y-0.5 text-xs">
                  <div>Selected Months: {selectedMonths.length}</div>
                  <div>Fee per Month: ₱10.00</div>
                  <div>Total Amount: ₱{(selectedMonths.length * 10).toFixed(2)}</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {selectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ")}
                  </div>
                </div>
              </div>
            )}
          </Form>
        </Modal>

        {/* View Household Modal */}
        <Modal
          title={`Household Details${viewHousehold ? ` — ${viewHousehold.householdId}` : ""}`}
          open={viewOpen}
          onCancel={() => {
            setViewOpen(false);
            setViewHousehold(null);
          }}
          footer={null}
          width={600}
        >
          {viewHousehold && (
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Household ID">
                {viewHousehold.householdId}
              </Descriptions.Item>
              <Descriptions.Item label="Head of Household">
                {fullName(viewHousehold.headOfHousehold)}
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {`${viewHousehold.address?.street || ""}, ${viewHousehold.address?.purok || ""}, ${viewHousehold.address?.barangay || ""}`}
              </Descriptions.Item>
              <Descriptions.Item label="Monthly Fee">
                ₱10.00 (fixed rate)
              </Descriptions.Item>
              <Descriptions.Item label="Current Balance">
                ₱{Number(viewHousehold.streetlightFee?.balance || 10).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Last Payment">
                {viewHousehold.streetlightFee?.lastPaymentDate 
                  ? dayjs(viewHousehold.streetlightFee.lastPaymentDate).format("MM/DD/YYYY")
                  : "No payments recorded"
                }
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                {(() => {
                  // Use the same logic as the main table for payment status
                  const currentYear = dayjs().year();
                  let allPaid = true;
                  let anyPaid = false;
                  for (let month = 1; month <= 12; month++) {
                    const monthStr = `${currentYear}-${String(month).padStart(2, "0")}`;
                    const monthPayment = streetlightPayments.find(payment => {
                      const h1 = payment.household?._id || payment.household;
                      const h2 = viewHousehold._id;
                      return String(h1) === String(h2) && payment.month === monthStr;
                    });
                    if (!monthPayment || monthPayment.status !== 'paid') allPaid = false;
                    if (monthPayment && (monthPayment.status === 'paid' || monthPayment.status === 'partial')) anyPaid = true;
                  }
                  if (allPaid) return <Tag color="green">Fully Paid</Tag>;
                  if (anyPaid) return <Tag color="orange">Partially Paid</Tag>;
                  return <Tag color="red">Unpaid</Tag>;
                })()}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        {/* Payment History Modal */}
        <Modal
          title={`Payment History${historyHousehold ? ` — ${historyHousehold.householdId}` : ""}`}
          open={historyOpen}
          onCancel={() => {
            setHistoryOpen(false);
            setHistoryHousehold(null);
            setHistoryData([]);
          }}
          footer={null}
          width={800}
        >
          {historyHousehold && (
            <div>
              <div className="mb-4">
                <strong>Household:</strong> {historyHousehold.householdId} - {fullName(historyHousehold.headOfHousehold)}
              </div>
              
              {historyData.length > 0 ? (
                <Table
                  dataSource={historyData}
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: "Month",
                      dataIndex: "month",
                      key: "month",
                      render: (month) => dayjs(`${month}-01`).format("MMMM YYYY")
                    },
                    {
                      title: "Total Charge",
                      dataIndex: "totalCharge",
                      key: "totalCharge",
                      render: (amount) => `₱${Number(amount || 0).toFixed(2)}`
                    },
                    {
                      title: "Amount Paid",
                      dataIndex: "amountPaid",
                      key: "amountPaid",
                      render: (amount) => `₱${Number(amount || 0).toFixed(2)}`
                    },
                    {
                      title: "Balance",
                      dataIndex: "balance",
                      key: "balance",
                      render: (amount) => `₱${Number(amount || 0).toFixed(2)}`
                    },
                    {
                      title: "Status",
                      dataIndex: "status",
                      key: "status",
                      render: (status) => {
                        const color = status === 'paid' ? 'green' : status === 'partial' ? 'orange' : 'red';
                        return <Tag color={color}>{status?.toUpperCase()}</Tag>;
                      }
                    },
                    {
                      title: "Last Payment",
                      dataIndex: "updatedAt",
                      key: "updatedAt",
                      render: (date) => dayjs(date).format("MM/DD/YYYY")
                    }
                  ]}
                />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No payment history found for this household.
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Export Excel Modal */}
        <Modal
          title="Export Streetlight Fees to Excel"
          open={exportOpen}
          onCancel={() => {
            setExportOpen(false);
            exportForm.resetFields();
          }}
          footer={[
            <Button key="cancel" onClick={() => {
              setExportOpen(false);
              exportForm.resetFields();
            }}>
              Cancel
            </Button>,
            <Button
              key="export"
              type="primary"
              loading={exporting}
              onClick={() => exportForm.submit()}
              icon={<FileExcelOutlined />}
            >
              Export to Excel
            </Button>
          ]}
          width={500}
        >
          <Form
            form={exportForm}
            layout="vertical"
            onFinish={exportToExcel}
            initialValues={{
              exportType: 'current-month'
            }}
          >
            <Form.Item
              name="exportType"
              label="Export Type"
              rules={[{ required: true, message: 'Please select export type' }]}
            >
              <Select placeholder="Select what to export">
                <Select.Option value="current-month">Current Month</Select.Option>
                <Select.Option value="chosen-month">Chosen Month</Select.Option>
                <Select.Option value="whole-year">Whole Year</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.exportType !== currentValues.exportType
              }
            >
              {({ getFieldValue }) => {
                const exportType = getFieldValue('exportType');
                return exportType === 'chosen-month' ? (
                  <Form.Item
                    name="selectedMonth"
                    label="Select Month"
                    rules={[{ required: true, message: 'Please select a month' }]}
                  >
                    <DatePicker
                      picker="month"
                      placeholder="Select month and year"
                      style={{ width: '100%' }}
                      format="MMMM YYYY"
                    />
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>

            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-sm text-blue-800">
                <div className="font-semibold mb-2">Export Information:</div>
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue }) => {
                    const exportType = getFieldValue('exportType');
                    if (exportType === 'current-month') {
                      return (
                        <div className="space-y-1">
                          <div>• Current month: {dayjs().format('MMMM YYYY')}</div>
                          <div>• Includes all households with payment status</div>
                          <div>• Shows payment dates, amounts, and balances</div>
                        </div>
                      );
                    } else if (exportType === 'chosen-month') {
                      const selectedMonth = getFieldValue('selectedMonth');
                      return (
                        <div className="space-y-1">
                          <div>• Selected month: {selectedMonth ? dayjs(selectedMonth).format('MMMM YYYY') : 'Please select month'}</div>
                          <div>• Includes all households with payment status</div>
                          <div>• Shows payment dates, amounts, and balances</div>
                        </div>
                      );
                    } else if (exportType === 'whole-year') {
                      return (
                        <div className="space-y-1">
                          <div>• Full year report: {new Date().getFullYear()}</div>
                          <div>• Monthly breakdown for all households</div>
                          <div>• Shows payment status for each month</div>
                          <div>• Includes yearly totals and balances</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                </Form.Item>
              </div>
            </div>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}