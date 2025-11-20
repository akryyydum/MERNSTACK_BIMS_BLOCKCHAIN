import React, { useEffect, useState, useMemo } from "react";
import { Table, Input, Button, Modal, Form, Select, message, Popconfirm, Descriptions, DatePicker, InputNumber, Tag } from "antd";
import dayjs from "dayjs";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ChevronDown, Info } from "lucide-react";
import { UserOutlined, DeleteOutlined, PlusOutlined, FileExcelOutlined, HomeOutlined, CloseOutlined } from "@ant-design/icons";
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

// Responsive styles for mobile and tablet
const responsiveStyles = `
  @media (max-width: 768px) {
    .garbage-action-buttons {
      flex-wrap: wrap !important;
      gap: 8px !important;
      row-gap: 8px !important;
    }
    .garbage-action-buttons .ant-btn {
      flex: 1 1 45%;
      min-width: 120px;
      max-width: 100%;
    }
  }
    .garbage-modal-responsive .ant-modal-header {
      padding: 12px 16px;
    }
    .garbage-modal-responsive .ant-modal-title {
      font-size: 15px;
      line-height: 1.3;
    }
    .garbage-modal-responsive .ant-modal-footer {
      padding: 10px 16px !important;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .garbage-modal-responsive .ant-modal-footer .ant-btn {
      margin: 0 !important;
      flex: 1 1 auto;
      min-width: 80px !important;
    }
    .responsive-garbage-form .ant-form-item-label > label {
      font-size: 13px;
    }
    .responsive-garbage-form .ant-form-item-explain,
    .responsive-garbage-form .ant-form-item-extra {
      font-size: 11px;
    }
    .garbage-fees-table .ant-table {
      font-size: 12px;
    }
    .garbage-fees-table .ant-table-thead > tr > th {
      padding: 8px 6px;
      font-size: 11px;
    }
    .garbage-fees-table .ant-table-tbody > tr > td {
      padding: 8px 6px;
      font-size: 12px;
    }
    .garbage-fees-table .ant-btn-sm {
      font-size: 11px;
      padding: 2px 6px;
      height: 26px;
    }
    .garbage-fees-table .ant-tag {
      font-size: 11px;
      padding: 0 6px;
      margin: 1px;
    }
  }
  
  @media (max-width: 640px) {
    .garbage-modal-responsive .ant-modal {
      max-width: calc(100vw - 16px) !important;
      margin: 8px !important;
      top: 12px !important;
    }
    .garbage-modal-responsive .ant-modal-body {
      max-height: calc(100vh - 140px);
      overflow-y: auto;
      padding: 12px !important;
    }
    .garbage-modal-responsive .ant-modal-header {
      padding: 10px 12px;
    }
    .garbage-modal-responsive .ant-modal-title {
      font-size: 14px;
    }
    .garbage-fees-table .ant-table-tbody > tr > td {
      white-space: nowrap;
    }
  }
`;

export default function AdminGarbageFees() {
  const [loading, setLoading] = useState(false);
  const [households, setHouseholds] = useState([]);
  const [garbagePayments, setGarbagePayments] = useState([]);
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
  
  // Responsive breakpoint for Add Payment modal (mobile < 640px)
  const [isMobileAddPayment, setIsMobileAddPayment] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));
  useEffect(() => {
    const handleResize = () => {
      setIsMobileAddPayment(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // State for payment history modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyHousehold, setHistoryHousehold] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  // Year selection (from 2025 to current)
  const currentYearValue = dayjs().year();
  const [garbageYear, setGarbageYear] = useState(currentYearValue);
  const [streetlightYear, setStreetlightYear] = useState(currentYearValue);
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = 2025; y <= currentYearValue; y++) years.push(y);
    return years;
  }, [currentYearValue]);
  
  // State for multiple month payments
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [monthPaymentStatus, setMonthPaymentStatus] = useState({});
  const [isValidSelection, setIsValidSelection] = useState(true);
  
  // State for cross-payment functionality
  const [streetlightPayOpen, setStreetlightPayOpen] = useState(false);
  const [streetlightForm] = Form.useForm();
  const [streetlightSelectedMonths, setStreetlightSelectedMonths] = useState([]);
  const [streetlightMonthPaymentStatus, setStreetlightMonthPaymentStatus] = useState({});
  const [streetlightPayLoading, setStreetlightPayLoading] = useState(false);
  const [allStreetlightMonthsPaid, setAllStreetlightMonthsPaid] = useState(false);
  const [isValidStreetlightSelection, setIsValidStreetlightSelection] = useState(true);

  // State for export Excel modal
  const [exportOpen, setExportOpen] = useState(false);
  const [exportForm] = Form.useForm();
  const [exporting, setExporting] = useState(false);
  const [exportHasData, setExportHasData] = useState(true);

  // State for select all and bulk operations
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkResetLoading, setBulkResetLoading] = useState(false);
  const [selectAllClicked, setSelectAllClicked] = useState(false);

  // Dynamic settings for fees
  const [settings, setSettings] = useState(null);
  const getGarbageMonthlyFee = (hasBusiness) => {
    if (settings) {
      const monthly = hasBusiness ? Number(settings.garbageFeeBusinessAnnual || 0) : Number(settings.garbageFeeRegularAnnual || 0);
      return Number.isFinite(monthly) && monthly >= 0 ? monthly : (hasBusiness ? 50 : 35);
    }
    return hasBusiness ? 50 : 35;
  };
  const getStreetlightMonthlyFee = () => {
    return settings && Number.isFinite(Number(settings.streetlightMonthlyFee))
      ? Number(settings.streetlightMonthlyFee)
      : 10;
  };

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('garbageFeesColumnsVisibility');
    const defaultColumns = {
      householdId: true,
      headOfHousehold: true,
      purok: true,
      business: true,
      currentFee: true,
      paymentStatus: true,
      balance: true,
      actions: true
    };
    
    if (saved) {
      const parsedSaved = JSON.parse(saved);
      // Ensure essential columns (householdId, headOfHousehold, actions) are always visible
      return {
        ...parsedSaved,
        householdId: true,
        headOfHousehold: true,
        actions: true
      };
    }
    return defaultColumns;
  });

  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    // Ensure essential columns are always visible before saving
    const columnsToSave = {
      ...visibleColumns,
      householdId: true,
      headOfHousehold: true,
      actions: true
    };
    localStorage.setItem('garbageFeesColumnsVisibility', JSON.stringify(columnsToSave));
  }, [visibleColumns]);

  // Get user info from localStorage
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    fetchHouseholds();
    fetchGarbagePayments();
  }, []);

  // Fetch settings once
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/settings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        if (res.ok) setSettings(data);
      } catch (_) {}
    };
    fetchSettings();
  }, []);

  // Refetch payment status when selected year changes while modal is open
  useEffect(() => {
    if (payOpen && payHousehold) {
      setSelectedMonths([]);
      payForm.setFieldValue('selectedMonths', []);
      fetchYearlyPaymentStatus(payHousehold._id);
    }
  }, [garbageYear]);

  useEffect(() => {
    if (streetlightPayOpen && payHousehold) {
      setStreetlightSelectedMonths([]);
      streetlightForm.setFieldValue('selectedMonths', []);
      fetchStreetlightYearlyPaymentStatus(payHousehold._id);
    }
  }, [streetlightYear]);

  // Validate export data availability when modal opens or form values change
  const validateExportData = () => {
    if (!exportOpen) return;

    const formValues = exportForm.getFieldsValue();
    const { paymentStatus, purokFilter } = formValues;

    // Filter households by purok if specified
    let filteredHouseholds = households || [];
    if (purokFilter && purokFilter !== 'all') {
      filteredHouseholds = filteredHouseholds.filter(h => h.address?.purok === purokFilter);
    }

    // Further filter by payment status if needed (basic check)
    if (paymentStatus === 'paid') {
      // Check if there are any households with payments
      const hasAnyPaid = filteredHouseholds.some(h => {
        const payments = garbagePayments.filter(p => p.household?.householdId === h.householdId);
        return payments.some(p => p.amountPaid > 0);
      });
      setExportHasData(hasAnyPaid);
    } else if (paymentStatus === 'unpaid') {
      // For unpaid, we need at least some households
      setExportHasData(filteredHouseholds.length > 0);
    } else {
      // For 'all', just check if we have households
      setExportHasData(filteredHouseholds.length > 0);
    }
  };

  useEffect(() => {
    validateExportData();
  }, [exportOpen, households, garbagePayments, exportForm]);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/admin/households`, { headers: authHeaders() });
      // Show most recently added household first
      const data = Array.isArray(res.data) ? res.data.slice().reverse() : [];
      setHouseholds(data);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load households");
    } finally {
      setLoading(false);
    }
  };

  const fetchGarbagePayments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/garbage-payments`, { headers: authHeaders() });
      setGarbagePayments(res.data || []);
    } catch (err) {
      console.error("Error fetching garbage payments:", err);
      message.warning("Could not load payment history. Table may not show updated payment status.");
    }
  };

  // Fetch payment status for all months in current year
  const fetchYearlyPaymentStatus = async (householdId) => {
    try {
      const currentYear = garbageYear;
      const monthStatuses = {};
      
      // Check payment status for each month of the current year
      for (let month = 1; month <= 12; month++) {
        const monthStr = `${currentYear}-${String(month).padStart(2, "0")}`;
        try {
          const res = await axios.get(`${API_BASE}/api/admin/households/${householdId}/garbage`, {
            headers: authHeaders(),
            params: { month: monthStr },
          });
          monthStatuses[monthStr] = {
            ...res.data,
            isPaid: res.data.status === 'paid'
          };
        } catch (err) {
          // If no payment record exists, consider it unpaid
          const household = households.find(h => h._id === householdId);
          const defaultFee = getGarbageMonthlyFee(household?.hasBusiness);
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

  // Validate sequential payment: cannot pay future months without paying previous unpaid months
  const validateSequentialPayment = (monthKey, currentSelectedMonths, paymentStatuses) => {
    const currentYear = garbageYear;
    const allMonths = [];
    
    // Generate all months for current year
    for (let month = 1; month <= 12; month++) {
      allMonths.push(`${currentYear}-${String(month).padStart(2, "0")}`);
    }
    
    const selectedMonth = dayjs(`${monthKey}-01`);
    const selectedMonthIndex = allMonths.indexOf(monthKey);
    
    // Find the earliest unpaid month
    let earliestUnpaidIndex = -1;
    for (let i = 0; i < allMonths.length; i++) {
      const monthData = paymentStatuses[allMonths[i]];
      const isMonthPaid = monthData?.isPaid || false;
      const isMonthSelected = currentSelectedMonths.includes(allMonths[i]);
      
      if (!isMonthPaid && !isMonthSelected) {
        earliestUnpaidIndex = i;
        break;
      }
    }
    
    // If trying to select a month that comes after an unpaid month, show validation error
    if (earliestUnpaidIndex !== -1 && selectedMonthIndex > earliestUnpaidIndex) {
      const earliestUnpaidMonth = dayjs(`${allMonths[earliestUnpaidIndex]}-01`).format("MMMM YYYY");
      return {
        valid: false,
        message: `You must pay ${earliestUnpaidMonth} before selecting ${selectedMonth.format("MMMM YYYY")}`
      };
    }
    
    return { valid: true };
  };

  // Validate entire month selection for sequential compliance
  const validateEntireSelection = (selectedMonthsList, paymentStatuses) => {
    for (const monthKey of selectedMonthsList) {
      const validation = validateSequentialPayment(monthKey, selectedMonthsList, paymentStatuses);
      if (!validation.valid) {
        return validation;
      }
    }
    return { valid: true };
  };

  // Validate if a month can be unchecked (sequential unchecking rule)
  const validateSequentialUnchecking = (monthToUncheck, currentSelectedMonths) => {
    if (currentSelectedMonths.length <= 1) {
      return { valid: true }; // Can always uncheck if it's the only or last selected month
    }

    // Sort selected months
    const sortedSelected = [...currentSelectedMonths].sort();
    
    // Find the latest (most recent) selected month
    const latestSelectedMonth = sortedSelected[sortedSelected.length - 1];
    
    // Only allow unchecking if this is the latest selected month
    if (monthToUncheck !== latestSelectedMonth) {
      const uncheckMonth = dayjs(`${monthToUncheck}-01`).format("MMMM YYYY");
      const latestMonth = dayjs(`${latestSelectedMonth}-01`).format("MMMM YYYY");
      return {
        valid: false,
        message: `Must uncheck ${latestMonth} first before unchecking ${uncheckMonth}. Uncheck from most recent to oldest.`
      };
    }

    return { valid: true };
  };

  // SEQUENTIAL UNCHECKING VALIDATION FOR STREETLIGHT
  const validateStreetlightSequentialUnchecking = (targetMonth, currentSelectedMonths) => {
    if (currentSelectedMonths.length === 0) {
      return { valid: true };
    }

    if (currentSelectedMonths.length === 1 && currentSelectedMonths.includes(targetMonth)) {
      return { valid: true }; // Can uncheck the only selected month
    }

    // Find the latest (most recent) selected month
    const sortedSelectedMonths = [...currentSelectedMonths].sort();
    const latestSelectedMonth = sortedSelectedMonths[sortedSelectedMonths.length - 1];

    // Only allow unchecking the latest month first
    if (targetMonth !== latestSelectedMonth) {
      const latestMonthFormatted = dayjs(latestSelectedMonth, 'YYYY-MM').format('MMMM YYYY');
      const targetMonthFormatted = dayjs(targetMonth, 'YYYY-MM').format('MMMM YYYY');
      return {
        valid: false,
        message: `Must uncheck ${latestMonthFormatted} first before unchecking ${targetMonthFormatted}. Uncheck from most recent to oldest.`
      };
    }

    return { valid: true };
  };

  // Get allowed months that can be selected based on sequential payment rule
  const getAllowedMonths = (paymentStatuses, currentSelectedMonths) => {
    const currentYear = garbageYear;
    const allMonths = [];
    
    // Generate all months for current year
    for (let month = 1; month <= 12; month++) {
      allMonths.push(`${currentYear}-${String(month).padStart(2, "0")}`);
    }
    
    const allowedMonths = new Set();
    
    // Find consecutive unpaid months from the beginning
    for (let i = 0; i < allMonths.length; i++) {
      const monthKey = allMonths[i];
      const monthData = paymentStatuses[monthKey];
      const isPaid = monthData?.isPaid || false;
      const isSelected = currentSelectedMonths.includes(monthKey);
      
      if (isPaid) {
        // If month is already paid, it's not selectable but continue checking next months
        continue;
      } else if (isSelected) {
        // If month is currently selected, allow it and continue
        allowedMonths.add(monthKey);
      } else {
        // Found first unpaid and unselected month
        allowedMonths.add(monthKey);
        break; // Only allow up to this point
      }
    }
    
    return allowedMonths;
  };

  // Select all allowed months that can be paid sequentially
  const selectAllAllowedMonths = () => {
    // Get all months that could potentially be selected (including currently selected ones)
    const currentYear = garbageYear;
    const allMonths = [];
    
    // Generate all months for current year
    for (let month = 1; month <= 12; month++) {
      allMonths.push(`${currentYear}-${String(month).padStart(2, "0")}`);
    }
    
    const allAllowedMonths = [];
    
    // Find all consecutive unpaid months from the beginning
    for (let i = 0; i < allMonths.length; i++) {
      const monthKey = allMonths[i];
      const monthData = monthPaymentStatus[monthKey];
      const isPaid = monthData?.isPaid || false;
      
      if (!isPaid) {
        allAllowedMonths.push(monthKey);
      } else if (allAllowedMonths.length > 0) {
        // If we hit a paid month after finding unpaid months, stop
        break;
      }
    }
    
    setSelectedMonths(allAllowedMonths);
    payForm.setFieldValue("selectedMonths", allAllowedMonths);
    
    // Update total charge calculation
    const fee = getGarbageMonthlyFee(payForm.getFieldValue("hasBusiness"));
    const totalCharge = allAllowedMonths.length * fee;
    payForm.setFieldValue("totalCharge", totalCharge);
    payForm.setFieldValue("amount", totalCharge);
  };

  // Clear all selected months
  const clearAllSelections = () => {
    setSelectedMonths([]);
    payForm.setFieldValue("selectedMonths", []);
    payForm.setFieldValue("totalCharge", 0);
    payForm.setFieldValue("amount", 0);
  };

  const fetchFeeSummary = async (householdId, monthStr) => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/households/${householdId}/garbage`, {
        headers: authHeaders(),
        params: { month: monthStr },
      });
      setPaySummary(res.data);
      
      // Get the household info to set business status
      const household = households.find(h => h._id === householdId);
      const defaultFee = getGarbageMonthlyFee(household?.hasBusiness);
      
      payForm.setFieldsValue({
        month: dayjs(`${monthStr}-01`),
        hasBusiness: household?.hasBusiness || false,
        totalCharge: Number(res.data.totalCharge || defaultFee),
        amount: Number(res.data.balance || res.data.totalCharge || defaultFee),
        method: "Cash",
      });
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load garbage fee summary");
    }
  };

  const openPayFee = async (household) => {
    setPayHousehold(household);
    setPayOpen(true);
    
    // Check if all streetlight months are paid for this household
    const allPaid = await checkIfAllStreetlightMonthsPaid(household._id);
    setAllStreetlightMonthsPaid(allPaid);
    
    // Fetch payment status for all months in the current year
  const yearlyStatus = await fetchYearlyPaymentStatus(household._id);
    
    // Find unpaid months and set as initial selection
    const unpaidMonths = Object.keys(yearlyStatus).filter(month => !yearlyStatus[month].isPaid);
    const initialMonths = unpaidMonths.slice(0, 1); // Start with current month if unpaid
    setSelectedMonths(initialMonths);
    
    // Calculate initial totals
    const defaultFee = getGarbageMonthlyFee(household?.hasBusiness);
    const totalCharge = initialMonths.length * defaultFee;
    
    payForm.setFieldsValue({
      hasBusiness: household?.hasBusiness || false,
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
        return;
      }

      // STRICT SEQUENTIAL VALIDATION: Check each selected month against the sequential rule
      for (const monthKey of selectedMonths) {
        const validation = validateSequentialPayment(monthKey, selectedMonths, monthPaymentStatus);
        if (!validation.valid) {
          message.error(`Sequential Payment Violation: ${validation.message}`);
          setPayLoading(false);
          return; // Stop submission completely
        }
      }

      // Additional validation: Ensure no gaps exist in the selected months sequence
      const sortedSelectedMonths = [...selectedMonths].sort();
  const currentYear = garbageYear;
      
      // Check for gaps in previous months that should be paid first
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${currentYear}-${String(month).padStart(2, "0")}`;
        const monthData = monthPaymentStatus[monthKey];
        const isMonthPaid = monthData?.isPaid || false;
        const isMonthSelected = selectedMonths.includes(monthKey);
        
        // If this month is not paid and not selected, check if any later months are selected
        if (!isMonthPaid && !isMonthSelected) {
          const laterSelectedMonths = selectedMonths.filter(selected => {
            const selectedMonthNum = parseInt(selected.split('-')[1]);
            return selectedMonthNum > month;
          });
          
          if (laterSelectedMonths.length > 0) {
            const unpaidMonth = dayjs(`${monthKey}-01`).format("MMMM YYYY");
            const laterMonth = dayjs(`${laterSelectedMonths[0]}-01`).format("MMMM YYYY");
            message.error(`Cannot pay ${laterMonth} when ${unpaidMonth} remains unpaid. Please pay previous months first.`);
            setPayLoading(false);
            return;
          }
        }
      }
      
      const fee = getGarbageMonthlyFee(values.hasBusiness);
      const amountPerMonth = Number(values.amount) / selectedMonths.length;
      
      // Process payment for each selected month
      const paymentPromises = selectedMonths.map(monthKey => {
        const payload = {
          month: monthKey,
          amount: amountPerMonth,
          totalCharge: fee,
          method: values.method,
          reference: values.reference,
          hasBusiness: Boolean(values.hasBusiness),
          paidBy: payHousehold?.payingMember?._id || payHousehold?.headOfHousehold?._id, // Include who made the payment
          paidByName: payHousehold?.payingMember ? fullName(payHousehold.payingMember) : fullName(payHousehold.headOfHousehold),
        };
        
        return axios.post(
          `${API_BASE}/api/admin/households/${payHousehold._id}/garbage/pay`,
          payload,
          { headers: authHeaders() }
        );
      });
      
      // Wait for all payments to complete
      const results = await Promise.all(paymentPromises);
      
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
          fetchGarbagePayments(),
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
      message.error(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setPayLoading(false);
    }
  };

  const deleteHouseholdPayments = async (household) => {
    try {
      setRefreshing(true);
      
      const res = await axios.delete(`${API_BASE}/api/admin/households/${household._id}/garbage/payments`, {
        headers: authHeaders()
      });
      
      message.success(`${res.data.deletedCount} payment records deleted for ${household.householdId}. Reset to unpaid status.`);
      
      // Refresh all data
      await Promise.all([
        fetchHouseholds(),
        fetchGarbagePayments(),
        fetchStatistics()
      ]);
      
    } catch (err) {
      console.error("Error deleting payments:", err);
      message.error(err?.response?.data?.message || "Failed to delete payment records");
    } finally {
      setRefreshing(false);
    }
  };

  // Bulk reset selected households
  const handleBulkReset = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select households to reset');
      return;
    }

    try {
      setBulkResetLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const householdId of selectedRowKeys) {
        try {
          await axios.delete(
            `${API_BASE}/api/admin/households/${householdId}/garbage/payments`,
            { headers: authHeaders() }
          );
          successCount++;
        } catch (err) {
          console.error(`Failed to reset household ${householdId}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        message.success(`Successfully reset ${successCount} household(s)`);
      }
      if (failCount > 0) {
        message.error(`Failed to reset ${failCount} household(s)`);
      }

      setSelectedRowKeys([]);
      setSelectAllClicked(false);
      await Promise.all([
        fetchHouseholds(),
        fetchGarbagePayments(),
        fetchStatistics()
      ]);
    } catch (err) {
      message.error('Reset all operation failed');
    } finally {
      setBulkResetLoading(false);
    }
  };

  // Manual select all function for button
  const handleSelectAll = () => {
    const allKeys = filteredHouseholds.map(household => household._id);
    setSelectedRowKeys(allKeys);
    setSelectAllClicked(true);
    message.success(`Selected all ${allKeys.length} household(s) across all pages`);
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedRowKeys([]);
    setSelectAllClicked(false);
    message.info("Cleared all selections");
  };

  // Streetlight payment functions for cross-payment functionality
  const fetchStreetlightYearlyPaymentStatus = async (householdId) => {
    try {
      const currentYear = streetlightYear;
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
          const defaultFee = getStreetlightMonthlyFee();
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
      
      setStreetlightMonthPaymentStatus(monthStatuses);
      return monthStatuses;
    } catch (err) {
      console.error("Error fetching streetlight payment status:", err);
      message.error("Failed to load streetlight payment status for the year");
      return {};
    }
  };

  // Helper function to check if all streetlight months are paid
  const checkIfAllStreetlightMonthsPaid = async (householdId) => {
    try {
      const yearlyStatus = await fetchStreetlightYearlyPaymentStatus(householdId);
      const currentYear = streetlightYear;
      const allMonths = [];
      
      // Generate all months for current year
      for (let month = 1; month <= 12; month++) {
        allMonths.push(`${currentYear}-${String(month).padStart(2, "0")}`);
      }
      
      // Check if all months are paid
      return allMonths.every(monthKey => yearlyStatus[monthKey]?.isPaid);
    } catch (error) {
      console.error("Error checking streetlight payment status:", error);
      return false;
    }
  };

  const proceedToStreetlightPayment = async () => {
    if (!payHousehold) return;
    
    // Close the garbage payment modal first
    setPayOpen(false);
    
    // Very fast transition, then open streetlight modal
    setTimeout(async () => {
      // Fetch streetlight payment status for all months in the current year
      const yearlyStatus = await fetchStreetlightYearlyPaymentStatus(payHousehold._id);
      
      // Find unpaid months and set as initial selection
      const unpaidMonths = Object.keys(yearlyStatus).filter(month => !yearlyStatus[month].isPaid);
      const initialMonths = unpaidMonths.slice(0, 1); // Start with current month if unpaid
      setStreetlightSelectedMonths(initialMonths);
      
      // Calculate initial totals
      const totalCharge = initialMonths.length * getStreetlightMonthlyFee();
      
      streetlightForm.setFieldsValue({
        selectedMonths: initialMonths,
        totalCharge: totalCharge,
        amount: totalCharge,
        method: "Cash",
      });
      
      setStreetlightPayOpen(true);
    }, 50); // Super fast 50ms transition
  };

  const submitBothPayments = async () => {
    try {
      console.log("Starting combined payment submission...");
      setStreetlightPayLoading(true);
      
      // Validate both forms
      const garbageValues = await payForm.validateFields();
      const streetlightValues = await streetlightForm.validateFields();
      
      if (!selectedMonths || selectedMonths.length === 0) {
        message.error("Please select at least one month for garbage payment");
        return;
      }
      
      if (!streetlightSelectedMonths || streetlightSelectedMonths.length === 0) {
        message.error("Please select at least one month for streetlight payment");
        return;
      }

      // STRICT SEQUENTIAL VALIDATION FOR GARBAGE PAYMENTS
      for (const monthKey of selectedMonths) {
        const validation = validateSequentialPayment(monthKey, selectedMonths, monthPaymentStatus);
        if (!validation.valid) {
          message.error(`Garbage Payment - Sequential Payment Violation: ${validation.message}`);
          setStreetlightPayLoading(false);
          return;
        }
      }

      // STRICT SEQUENTIAL VALIDATION FOR STREETLIGHT PAYMENTS  
      for (const monthKey of streetlightSelectedMonths) {
        const validation = validateStreetlightSequentialPayment(monthKey, streetlightSelectedMonths, streetlightMonthPaymentStatus);
        if (!validation.valid) {
          message.error(`Streetlight Payment - Sequential Payment Violation: ${validation.message}`);
          setStreetlightPayLoading(false);
          return;
        }
      }

      console.log("Both payment data:", {
        garbageValues,
        streetlightValues,
        garbageMonths: selectedMonths,
        streetlightMonths: streetlightSelectedMonths,
        payHousehold: payHousehold
      });

      // Process Garbage Payment
      const garbageFee = getGarbageMonthlyFee(garbageValues.hasBusiness);
      const garbageAmountPerMonth = Number(garbageValues.amount) / selectedMonths.length;
      
      const garbagePaymentPromises = selectedMonths.map(monthKey => {
        const payload = {
          month: monthKey,
          amount: garbageAmountPerMonth,
          totalCharge: garbageFee,
          method: garbageValues.method,
          reference: garbageValues.reference,
          hasBusiness: Boolean(garbageValues.hasBusiness),
          paidBy: payHousehold?.payingMember?._id || payHousehold?.headOfHousehold?._id,
          paidByName: payHousehold?.payingMember ? fullName(payHousehold.payingMember) : fullName(payHousehold.headOfHousehold),
        };
        
        console.log("Garbage payment payload for month", monthKey, ":", payload);
        
        return axios.post(
          `${API_BASE}/api/admin/households/${payHousehold._id}/garbage/pay`,
          payload,
          { headers: authHeaders() }
        );
      });

      // Process Streetlight Payment
      const streetlightAmountPerMonth = Number(streetlightValues.amount) / streetlightSelectedMonths.length;
      
      const streetlightPaymentPromises = streetlightSelectedMonths.map(monthKey => {
        const payload = {
          month: monthKey,
          amount: streetlightAmountPerMonth,
          totalCharge: getStreetlightMonthlyFee(),
          method: streetlightValues.method || "Cash",
          reference: streetlightValues.reference,
          paidBy: payHousehold?.payingMember?._id || payHousehold?.headOfHousehold?._id,
          paidByName: payHousehold?.payingMember ? fullName(payHousehold.payingMember) : fullName(payHousehold.headOfHousehold),
        };
        
        console.log("Streetlight payment payload for month", monthKey, ":", payload);
        
        return axios.post(`${API_BASE}/api/admin/households/${payHousehold._id}/streetlight/pay`, payload, { headers: authHeaders() });
      });

      // Submit both payments simultaneously
      await Promise.all([...garbagePaymentPromises, ...streetlightPaymentPromises]);
      
      const garbagePaidMonths = selectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ");
      const streetlightPaidMonths = streetlightSelectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ");
      
      message.success(`Both payments recorded successfully! Garbage: ${garbagePaidMonths} | Streetlight: ${streetlightPaidMonths}`);
      
      // Close both modals and reset all states
      setPayOpen(false);
      setStreetlightPayOpen(false);
      setPaySummary(null);
      setPayHousehold(null);
      setSelectedMonths([]);
      setStreetlightSelectedMonths([]);
      setMonthPaymentStatus({});
      setStreetlightMonthPaymentStatus({});
      payForm.resetFields();
      streetlightForm.resetFields();
      
      // Show refreshing indicator and refresh all data
      setRefreshing(true);
      try {
        await Promise.all([
          fetchHouseholds(),
          fetchGarbagePayments(),
          fetchStatistics()
        ]);
        
        message.success("Payments recorded and table updated successfully!");
      } catch (refreshError) {
        console.error("Error refreshing data:", refreshError);
        message.warning("Payments recorded but there was an issue refreshing the display. Please refresh the page.");
      } finally {
        setRefreshing(false);
      }
      
    } catch (err) {
      console.error("Combined payment error:", err);
      message.error(err?.response?.data?.message || "Failed to record payments");
    } finally {
      setStreetlightPayLoading(false);
    }
  };

  const submitStreetlightPayment = async () => {
    try {
      console.log("Starting streetlight payment submission...");
      setStreetlightPayLoading(true);
      const values = await streetlightForm.validateFields();
      
      if (!streetlightSelectedMonths || streetlightSelectedMonths.length === 0) {
        message.error("Please select at least one month to pay");
        return;
      }

      console.log("Streetlight payment data:", {
        values,
        selectedMonths: streetlightSelectedMonths,
        payHousehold: payHousehold
      });

      const amountPerMonth = Number(values.amount) / streetlightSelectedMonths.length;
      
      // Submit payments for each selected month
      const paymentPromises = streetlightSelectedMonths.map(monthKey => {
        const payload = {
          month: monthKey,
          amount: amountPerMonth,
          totalCharge: getStreetlightMonthlyFee(),
          method: values.method || "Cash",
          reference: values.reference,
          paidBy: payHousehold?.payingMember?._id || payHousehold?.headOfHousehold?._id,
          paidByName: payHousehold?.payingMember ? fullName(payHousehold.payingMember) : fullName(payHousehold.headOfHousehold),
        };
        
        console.log("Streetlight payment payload for month", monthKey, ":", payload);
        
        return axios.post(`${API_BASE}/api/admin/households/${payHousehold._id}/streetlight/pay`, payload, { headers: authHeaders() });
      });

      await Promise.all(paymentPromises);
      
      const paidMonths = streetlightSelectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ");
      message.success(`Streetlight payment recorded for ${streetlightSelectedMonths.length} month(s): ${paidMonths}`);
      
      // Close streetlight modal and reset
      setStreetlightPayOpen(false);
      setStreetlightSelectedMonths([]);
      setStreetlightMonthPaymentStatus({});
      streetlightForm.resetFields();
      
    } catch (err) {
      console.error("Streetlight payment error:", err);
      message.error(err?.response?.data?.message || "Failed to record streetlight payment");
    } finally {
      setStreetlightPayLoading(false);
    }
  };

  // Streetlight validation functions (copied from AdminStreetLightFees)
  const validateStreetlightSequentialPayment = (monthKey, currentSelectedMonths, paymentStatuses) => {
    const currentYear = streetlightYear;
    const allMonths = [];
    
    // Generate all months for current year
    for (let month = 1; month <= 12; month++) {
      allMonths.push(`${currentYear}-${String(month).padStart(2, "0")}`);
    }
    
    const selectedMonth = dayjs(`${monthKey}-01`);
    const selectedMonthIndex = allMonths.indexOf(monthKey);
    
    // Find the earliest unpaid month
    let earliestUnpaidIndex = -1;
    for (let i = 0; i < allMonths.length; i++) {
      const monthData = paymentStatuses[allMonths[i]];
      const isMonthPaid = monthData?.isPaid || false;
      const isMonthSelected = currentSelectedMonths.includes(allMonths[i]);
      
      if (!isMonthPaid && !isMonthSelected) {
        earliestUnpaidIndex = i;
        break;
      }
    }
    
    // If trying to select a month that comes after an unpaid month, show validation error
    if (earliestUnpaidIndex !== -1 && selectedMonthIndex > earliestUnpaidIndex) {
      const earliestUnpaidMonth = dayjs(`${allMonths[earliestUnpaidIndex]}-01`).format("MMMM YYYY");
      return {
        valid: false,
        message: `You must pay ${earliestUnpaidMonth} before selecting ${selectedMonth.format("MMMM YYYY")}`
      };
    }
    
    return { valid: true };
  };

  const getStreetlightAllowedMonths = (paymentStatuses, currentSelectedMonths) => {
    const currentYear = streetlightYear;
    const allMonths = [];
    
    // Generate all months for current year
    for (let month = 1; month <= 12; month++) {
      allMonths.push(`${currentYear}-${String(month).padStart(2, "0")}`);
    }
    
    const allowedMonths = new Set();
    
    // Find consecutive unpaid months from the beginning
    for (let i = 0; i < allMonths.length; i++) {
      const monthKey = allMonths[i];
      const monthData = paymentStatuses[monthKey];
      const isPaid = monthData?.isPaid || false;
      const isSelected = currentSelectedMonths.includes(monthKey);
      
      if (isPaid) {
        // If month is already paid, it's not selectable but continue checking next months
        continue;
      } else if (isSelected) {
        // If month is currently selected, allow it and continue
        allowedMonths.add(monthKey);
      } else {
        // Found first unpaid and unselected month
        allowedMonths.add(monthKey);
        break; // Only allow up to this point
      }
    }
    
    return allowedMonths;
  };

  const selectAllStreetlightAllowedMonths = () => {
    // Get all months that could potentially be selected
    const currentYear = streetlightYear;
    const allMonths = [];
    
    // Generate all months for current year
    for (let month = 1; month <= 12; month++) {
      allMonths.push(`${currentYear}-${String(month).padStart(2, "0")}`);
    }
    
    const allAllowedMonths = [];
    
    // Find all consecutive unpaid months from the beginning
    for (let i = 0; i < allMonths.length; i++) {
      const monthKey = allMonths[i];
      const monthData = streetlightMonthPaymentStatus[monthKey];
      const isPaid = monthData?.isPaid || false;
      
      if (!isPaid) {
        allAllowedMonths.push(monthKey);
      } else if (allAllowedMonths.length > 0) {
        // If we hit a paid month after finding unpaid months, stop
        break;
      }
    }
    
    setStreetlightSelectedMonths(allAllowedMonths);
    streetlightForm.setFieldValue("selectedMonths", allAllowedMonths);
    
    // Update total charge calculation
    const fee = getStreetlightMonthlyFee();
    const totalCharge = allAllowedMonths.length * fee;
    streetlightForm.setFieldValue("totalCharge", totalCharge);
    streetlightForm.setFieldValue("amount", totalCharge);
  };

  const clearAllStreetlightSelections = () => {
    setStreetlightSelectedMonths([]);
    streetlightForm.setFieldValue("selectedMonths", []);
    streetlightForm.setFieldValue("totalCharge", 0);
    streetlightForm.setFieldValue("amount", 0);
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
      const res = await axios.get(`${API_BASE}/api/admin/garbage-payments`, {
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
    feeStructure: {
      noBusiness: 35,
      withBusiness: 50,
      expectedMonthly: 0,
      expectedYearly: 0
    },
    totalCollected: {
      yearly: 0,
      monthly: 0
    },
    balance: {
      yearly: 0,
      monthly: 0
    },
    collectionRate: 0
  });
  
  // Fetch statistics
  const fetchStatistics = async () => {
    console.log('=== fetchStatistics called ===');
    try {
      // Fetch fresh payment data
      console.log('Fetching garbage payments...');
      const paymentRes = await axios.get(`${API_BASE}/api/admin/garbage-payments`, { headers: authHeaders() });
      const freshGarbagePayments = paymentRes.data || [];
      console.log('Garbage payments fetched:', freshGarbagePayments.length);
      
      // Calculate statistics from fresh data (like streetlight does)
      const currentYear = dayjs().year();
      const currentMonth = dayjs().format('YYYY-MM');
      const totalHouseholds = households.length;
      
      console.log('Calculating stats for:', { currentYear, currentMonth, totalHouseholds });
      
      // Calculate expected totals
      let expectedMonthly = 0;
      households.forEach(household => {
        const fee = getGarbageMonthlyFee(household.hasBusiness);
        expectedMonthly += fee;
      });
      const expectedYearly = expectedMonthly * 12;
      
      // Calculate collections from payments
      let yearlyCollected = 0;
      let monthlyCollected = 0;
      
      freshGarbagePayments.forEach(payment => {
        if (payment.household && payment.amountPaid > 0) {
          const paymentYear = dayjs(payment.month + '-01').year();
          if (paymentYear === currentYear) {
            yearlyCollected += Number(payment.amountPaid || 0);
          }
          if (payment.month === currentMonth) {
            monthlyCollected += Number(payment.amountPaid || 0);
          }
        }
      });
      
      const yearlyOutstanding = expectedYearly - yearlyCollected;
      const monthlyOutstanding = expectedMonthly - monthlyCollected;
      const collectionRate = expectedYearly > 0 ? (yearlyCollected / expectedYearly) * 100 : 0;
      
      const newStats = {
        totalHouseholds,
        feeStructure: {
          noBusiness: getGarbageMonthlyFee(false),
          withBusiness: getGarbageMonthlyFee(true),
          expectedMonthly,
          expectedYearly
        },
        totalCollected: {
          yearly: yearlyCollected,
          monthly: monthlyCollected
        },
        balance: {
          yearly: yearlyOutstanding,
          monthly: monthlyOutstanding
        },
        collectionRate: parseFloat(collectionRate.toFixed(1))
      };
      
      console.log('Setting new stats:', newStats);
      setStats(newStats);
      
      // Update the payments state with fresh data
      setGarbagePayments(freshGarbagePayments);
      console.log('Stats updated successfully');
    } catch (err) {
      console.error("Error fetching statistics:", err);
      console.error("Error details:", err.response?.data);
      // Fallback to calculated stats from household data
      const totalHouseholds = households.length || 5;
      const currentYear = dayjs().year();
      const currentMonth = dayjs().format('YYYY-MM');
      
      // Calculate expected monthly and yearly totals based on actual households
      let expectedMonthly = 0;
      let totalYearlyBalance = 0;
      let totalYearlyCollected = 0;
      let totalMonthlyBalance = 0;
      let totalMonthlyCollected = 0;
      
      households.forEach(household => {
        const defaultFee = getGarbageMonthlyFee(household.hasBusiness);
        expectedMonthly += defaultFee;
        
        // Calculate yearly balance for this household (same logic as table)
        let householdYearlyBalance = 0;
        let householdYearlyPaid = 0;
        
        // Check all months of current year for this household
        for (let month = 1; month <= 12; month++) {
          const monthStr = `${currentYear}-${String(month).padStart(2, "0")}`;
          
          // Find payment record for this month
          const monthPayment = garbagePayments.find(payment => 
            payment.household?._id === household._id && payment.month === monthStr
          );
          
          if (monthPayment) {
            householdYearlyBalance += Number(monthPayment.balance || 0);
            householdYearlyPaid += Number(monthPayment.amountPaid || 0);
            
            // If this is current month, add to monthly totals
            if (monthStr === currentMonth) {
              totalMonthlyBalance += Number(monthPayment.balance || 0);
              totalMonthlyCollected += Number(monthPayment.amountPaid || 0);
            }
          } else {
            // No payment record means full balance is due
            householdYearlyBalance += defaultFee;
            
            // If this is current month, add to monthly totals
            if (monthStr === currentMonth) {
              totalMonthlyBalance += defaultFee;
            }
          }
        }
        
        totalYearlyBalance += householdYearlyBalance;
        totalYearlyCollected += householdYearlyPaid;
      });
      
      // If no households loaded, use fallback values
      if (households.length === 0) {
        expectedMonthly = 205;
        totalYearlyBalance = 1925;
        totalYearlyCollected = 605;
        totalMonthlyBalance = 155;
        totalMonthlyCollected = 50;
      }
      
      const expectedYearly = expectedMonthly * 12;
      
      const collectionRate = expectedYearly > 0 ? ((totalYearlyCollected / expectedYearly) * 100) : 0;
      
      setStats({
        totalHouseholds,
        feeStructure: {
          noBusiness: 35,
          withBusiness: 50,
          expectedMonthly,
          expectedYearly
        },
        totalCollected: {
          yearly: totalYearlyCollected,
          monthly: totalMonthlyCollected
        },
        balance: {
          yearly: totalYearlyBalance,
          monthly: totalMonthlyBalance
        },
        collectionRate: parseFloat(collectionRate.toFixed(1))
      });
    }
  };
  
  useEffect(() => {
    console.log('useEffect for fetchStatistics triggered:', { 
      householdsLength: households.length, 
      settingsExists: !!settings 
    });
    if (households.length > 0 || settings) {
      fetchStatistics();
    }
  }, [households, settings]);

  // Excel Export Functions
  const exportToExcel = async (values) => {
    setExporting(true);
    try {
      // Fetch fresh payment data before exporting
      const paymentRes = await axios.get(`${API_BASE}/api/admin/garbage-payments`, { headers: authHeaders() });
      const freshGarbagePayments = paymentRes.data || [];
      
      console.log('Fresh payment data for export:', freshGarbagePayments);
      
      const { exportType, selectedMonth, paymentStatus, purokFilter } = values;
      let exportData = [];
      let filename = '';
      
      // Filter households by purok if specified
      let filteredHouseholds = households;
      if (purokFilter && purokFilter !== 'all') {
        filteredHouseholds = households.filter(h => h.address?.purok === purokFilter);
      }
      
      if (exportType === 'whole-year') {
        // Export whole year data
        exportData = await generateYearlyExportData(freshGarbagePayments, paymentStatus, filteredHouseholds);
        const purokSuffix = purokFilter && purokFilter !== 'all' ? `_${purokFilter.replace(/\s+/g, '_')}` : '';
        filename = `Garbage_Fees_${new Date().getFullYear()}${purokSuffix}_${paymentStatus === 'all' ? 'Complete' : paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}.xlsx`;
      } else if (exportType === 'chosen-month') {
        // Export chosen month data
        const selectedMonthStr = dayjs(selectedMonth).format('YYYY-MM');
        exportData = await generateMonthlyExportData(selectedMonthStr, freshGarbagePayments, paymentStatus, filteredHouseholds);
        const monthName = dayjs(selectedMonth).format('MMMM_YYYY');
        const purokSuffix = purokFilter && purokFilter !== 'all' ? `_${purokFilter.replace(/\s+/g, '_')}` : '';
        filename = `Garbage_Fees_${monthName}${purokSuffix}_${paymentStatus === 'all' ? 'All' : paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}.xlsx`;
      } else if (exportType === 'current-month') {
        // Export current month data
        const currentMonth = dayjs().format('YYYY-MM');
        exportData = await generateMonthlyExportData(currentMonth, freshGarbagePayments, paymentStatus, filteredHouseholds);
        const monthName = dayjs().format('MMMM_YYYY');
        const purokSuffix = purokFilter && purokFilter !== 'all' ? `_${purokFilter.replace(/\s+/g, '_')}` : '';
        filename = `Garbage_Fees_${monthName}${purokSuffix}_Current_${paymentStatus === 'all' ? 'All' : paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}.xlsx`;
      }

      if (exportData.length === 0) {
        Modal.warning({
          title: 'No Data Available',
          content: 'There is no data matching your selected filters to export. Please adjust your filter criteria and try again.',
          okText: 'OK'
        });
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

      XLSX.utils.book_append_sheet(wb, ws, 'Garbage Fees Report');
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

  const generateYearlyExportData = async (paymentData, paymentStatus = 'all', householdsToExport = null) => {
    const exportData = [];
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => 
      dayjs().month(i).format('YYYY-MM')
    );

    const householdList = householdsToExport || households;
    console.log('Generating yearly export with payments:', paymentData);
    console.log('Households for export:', householdList);
    console.log('Payment status filter:', paymentStatus);

    for (const household of householdList) {
      // Check if household should be included based on payment status filter
      const householdPayments = paymentData.filter(p => p.household?.householdId === household.householdId);
      const hasPaidPayments = householdPayments.some(p => p.amountPaid > 0);
      const hasUnpaidMonths = months.some(month => {
        const payment = householdPayments.find(p => p.month === month);
        return !payment || payment.amountPaid === 0;
      });

      // Apply payment status filter
      if (paymentStatus === 'paid' && !hasPaidPayments) continue;
      if (paymentStatus === 'unpaid' && !hasUnpaidMonths) continue;

      const feeRate = getGarbageMonthlyFee(household.hasBusiness);
      const baseData = {
        'Household ID': household.householdId,
        'Head of Household': fullName(household.headOfHousehold),
        'Purok': household.address?.purok || 'N/A',
        'Business Status': household.hasBusiness ? 'With Business' : 'No Business',
        'Fee Rate': `₱${Number(feeRate).toFixed(2)}`,
      };

      // Add monthly payment status for the year
      for (const month of months) {
        const monthName = dayjs(month).format('MMM YYYY');
        const payment = paymentData.find(p => 
          p.household?.householdId === household.householdId && 
          p.month === month
        );
        
        console.log(`Checking payment for ${household.householdId} in ${month}:`, payment);
        
        baseData[`${monthName} Status`] = payment && payment.amountPaid > 0 ? 'Paid' : 'Unpaid';
        baseData[`${monthName} Amount`] = payment ? `₱${payment.amountPaid}` : '₱0';
      }

      // Calculate totals
      const totalPaid = paymentData
        .filter(p => p.household?.householdId === household.householdId && 
                dayjs(p.month + '-01').year() === currentYear)
        .reduce((sum, p) => sum + p.amountPaid, 0);
        
      const expectedFee = getGarbageMonthlyFee(household.hasBusiness);
      const expectedTotal = Number(expectedFee) * 12;
      const balance = expectedTotal - totalPaid;

      baseData['Total Paid'] = `₱${totalPaid}`;
      baseData['Expected Total'] = `₱${expectedTotal}`;
      baseData['Balance'] = `₱${balance}`;

      exportData.push(baseData);
    }

    return exportData;
  };

  const generateMonthlyExportData = async (monthStr, paymentData, paymentStatus = 'all', householdsToExport = null) => {
    const exportData = [];
    const targetMonth = dayjs(monthStr);

    const householdList = householdsToExport || households;
    console.log('Generating monthly export for:', monthStr);
    console.log('Payment data:', paymentData);
    console.log('Households:', householdList);
    console.log('Payment status filter:', paymentStatus);

    for (const household of householdList) {
      const payment = paymentData.find(p => 
        p.household?.householdId === household.householdId && 
        p.month === monthStr
      );

      console.log(`Payment for ${household.householdId} in ${monthStr}:`, payment);

      const expectedFee = getGarbageMonthlyFee(household.hasBusiness);
      const paidAmount = payment ? payment.amountPaid : 0;
      const status = payment && payment.amountPaid > 0 ? 'Paid' : 'Unpaid';
      const balance = expectedFee - paidAmount;

      // Apply payment status filter
      if (paymentStatus === 'paid' && status !== 'Paid') continue;
      if (paymentStatus === 'unpaid' && status !== 'Unpaid') continue;

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
        'Business Status': household.hasBusiness ? 'With Business' : 'No Business',
        'Expected Fee': `₱${Number(expectedFee).toFixed(2)}`,
        'Paid Amount': `₱${paidAmount}`,
        'Payment Status': status,
        'Balance': `₱${balance}`,
        'Payment Date': paymentDate,
        'Month': targetMonth.format('MMMM YYYY')
      });
    }

    console.log('Generated export data:', exportData);
    return exportData;
  };

  const fullName = (p) => [p?.firstName, p?.middleName, p?.lastName, p?.suffix].filter(Boolean).join(" ");

  // Get all members with their household info for searching - memoized for performance
  const allMembersWithHousehold = useMemo(() => {
    const membersWithHousehold = [];
    
    households.forEach(household => {
      if (household.members && Array.isArray(household.members)) {
        household.members.forEach(member => {
          const memberName = fullName(member);
          membersWithHousehold.push({
            id: member._id,
            name: memberName,
            member: member,
            household: household,
            isHead: member._id === household.headOfHousehold._id,
            searchText: `${memberName} ${household.householdId} ${household.address?.street || ''} ${household.address?.purok || ''}`.toLowerCase()
          });
        });
      }
    });
    
    return membersWithHousehold;
  }, [households]);

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
      title: "Business",
      key: "business",
      columnKey: "business",
      render: (_, record) => {
        if (record.hasBusiness) {
          return <Tag color="blue">With Business</Tag>;
        } else {
          return <Tag color="default">No Business</Tag>;
        }
      },
    },
    {
      title: "Current Month Fee",
      key: "currentFee",
      columnKey: "currentFee",
      render: (_, record) => {
        const fee = getGarbageMonthlyFee(record.hasBusiness);
        return `₱${fee.toFixed(2)}`;
      },
    },
    {
      title: "Payment Status",
      key: "paymentStatus",
      columnKey: "paymentStatus",
      render: (_, record) => {
        // Mirror streetlight logic: iterate months and derive status
        const currentYear = garbageYear; // use selected year state
        let allPaid = true;
        let anyPaid = false;
        const isSameHousehold = (a, b) => {
          if (!a || !b) return false;
          return String(a) === String(b);
        };
        for (let month = 1; month <= 12; month++) {
          const monthStr = `${currentYear}-${String(month).padStart(2, "0")}`;
          const monthPayment = garbagePayments.find(payment => {
            const h1 = payment.household?._id || payment.household;
            const h2 = record._id;
            return isSameHousehold(h1, h2) && payment.month === monthStr;
          });
          if (!monthPayment || monthPayment.status !== 'paid') allPaid = false;
          if (monthPayment && (monthPayment.status === 'paid' || monthPayment.status === 'partial')) anyPaid = true;
        }
        if (allPaid) return <Tag color="green">Fully Paid</Tag>;
        if (anyPaid) return <Tag color="orange">Partially Paid</Tag>;
        return <Tag color="red">Unpaid</Tag>;
      },
    },
    {
      title: "Balance",
      key: "balance",
      columnKey: "balance",
      render: (_, record) => {
        // Calculate total unpaid balance for current year
        const defaultFee = getGarbageMonthlyFee(record.hasBusiness);
        const currentYear = dayjs().year();
        let totalBalance = 0;
        let totalPaid = 0;
        let lastPaymentDate = null;
        
        // Check all months of current year for this household
        for (let month = 1; month <= 12; month++) {
          const monthStr = `${currentYear}-${String(month).padStart(2, "0")}`;
          
          // Find payment record for this month
          const monthPayment = garbagePayments.find(payment => 
            payment.household?._id === record._id && payment.month === monthStr
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
            // No payment record means full balance is due
            totalBalance += defaultFee;
          }
        }
        
        return (
          <div>
            <div className="font-semibold">₱{totalBalance.toFixed(2)}</div>
            {totalPaid > 0 && (
              <div className="text-xs text-gray-500">
                Paid: ₱{totalPaid.toFixed(2)}
              </div>
            )}
            {lastPaymentDate && (
              <div className="text-xs text-gray-400">
                Last: {dayjs(lastPaymentDate).format('MM/DD/YY')}
              </div>
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
        // Check if household has any payments
        const hasPayments = garbagePayments.some(payment => 
          payment.household?._id === r._id
        );
        
        return (
          <div className="flex gap-1">
            <Button size="small" onClick={() => openView(r)}>View</Button>
            <Button size="small" onClick={() => openPaymentHistory(r)}>History</Button>
            {hasPayments && (
              <Popconfirm
                title="Reset Payment Records"
                description={`Delete ALL payment records for ${r.householdId}? This will reset them to unpaid status.`}
                onConfirm={() => deleteHouseholdPayments(r)}
                okText="Reset"
                cancelText="Cancel"
                okType="danger"
              >
                <Button 
                  size="small" 
                  danger 
                  title="Reset all payment records for this household"
                >
                  Reset
                </Button>
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  // Filter columns based on visibility
  const columns = allColumns.filter(col => visibleColumns[col.columnKey]);

  const filteredHouseholds = (Array.isArray(households) ? households : []).filter(h =>
    [
      h.householdId,
      h.address?.street,
      h.address?.purok,
      fullName(h.headOfHousehold),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Admin">
      <style>{responsiveStyles}</style>
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Garbage Fees Management
              </span>
            </div>
          </nav>
          
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Total Households
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {stats.totalHouseholds}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold text-black">
                    {stats.totalHouseholds}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Fee Structure
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    ₱{(stats.feeStructure?.expectedMonthly || 0).toFixed(2)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-xs md:text-sm text-gray-600">
                      <span className="font-semibold">No Business (Monthly):</span> ₱{Number(stats.feeStructure?.noBusiness || 35).toFixed(2)}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">
                      <span className="font-semibold">With Business (Monthly):</span> ₱{Number(stats.feeStructure?.withBusiness || 50).toFixed(2)}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-500 pt-1">
                      Aggregate Monthly (All Households): ₱{(stats.feeStructure?.expectedMonthly || 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-500">
                      Aggregate Yearly (All Households): ₱{(stats.feeStructure?.expectedYearly || 0).toFixed(2)}
                    </div>
                    {settings?.feeHistory && (() => {
                      const gbHist = settings.feeHistory.filter(f => f.kind === 'garbageFeeRegularAnnual' || f.kind === 'garbageFeeBusinessAnnual');
                      if (!gbHist.length) return null;
                      const latestMonth = gbHist.sort((a,b)=> (a.effectiveMonth < b.effectiveMonth ? 1 : -1))[0].effectiveMonth;
                      return <div className="text-[10px] md:text-xs text-gray-400">Effective Since: {dayjs(latestMonth+'-01').format('MMM YYYY')}</div>;
                    })()}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Total Collected
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    ₱{stats.totalCollected?.monthly || 0}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-xs md:text-sm text-gray-600">
                      <span className="font-semibold">Year:</span> ₱{stats.totalCollected?.yearly || 0}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">
                      <span className="font-semibold">Month:</span> ₱{stats.totalCollected?.monthly || 0}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black shadow-md py-2 md:py-4 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Balance
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    ₱{stats.balance?.monthly || 0}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-xs md:text-sm text-gray-600">
                      <span className="font-semibold">Year:</span> ₱{stats.balance?.yearly || 0}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">
                      <span className="font-semibold">Month:</span> ₱{stats.balance?.monthly || 0}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 md:py-10 p-2 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg col-span-2 lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">
                    Collection Rate
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {stats.collectionRate || 0}%
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold text-black">
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
                allowClear
                placeholder="Search for Head Household or Household ID"
                onSearch={v => setSearch(v.trim())}
                value={search}
                onChange={e => setSearch(e.target.value)}
                enterButton
                className="w-full sm:min-w-[350px] md:min-w-[500px] max-w-full"
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
                    checked={visibleColumns.business}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, business: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Business
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.currentFee}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, currentFee: checked })
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    Current Month Fee
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
            <div className="flex flex-wrap gap-2 garbage-action-buttons">
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

              {!selectAllClicked && (
                <Button onClick={handleSelectAll} type="default">
                  Select All ({filteredHouseholds.length})
                </Button>
              )}

              {selectedRowKeys.length > 0 && (
                <>
                  <Button onClick={handleClearSelection}>
                    Undo Selection
                  </Button>
                  <Popconfirm
                    title={`Reset ${selectedRowKeys.length} household(s)?`}
                    description="This action cannot be undone."
                    okButtonProps={{ danger: true }}
                    onConfirm={handleBulkReset}
                  >
                    <Button danger>
                      Reset All ({selectedRowKeys.length})
                    </Button>
                  </Popconfirm>
                </>
              )}
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <Table
                  size="middle"
                  rowKey="_id"
                  loading={loading || refreshing}
                  dataSource={filteredHouseholds}
                  columns={columns}
                  rowSelection={{
                    selectedRowKeys,
                    onChange: (selectedKeys) => {
                      setSelectedRowKeys(selectedKeys);
                      if (selectedKeys.length === 0) {
                        setSelectAllClicked(false);
                      }
                    },
                    selections: [
                      Table.SELECTION_ALL,
                      Table.SELECTION_INVERT,
                      Table.SELECTION_NONE,
                    ],
                  }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => 
                      `${range[0]}-${range[1]} of ${total} Garbage fee payments | Selected: ${selectedRowKeys.length}`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    defaultPageSize: 10,
                    size: 'default'
                  }}
                  scroll={{ x: 800 }}
                  className="garbage-fees-table"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add Payment Modal - Household Selection */}
        <Modal
          title="Add Garbage Fee Payment"
          open={addPaymentOpen}
          destroyOnClose
          className="garbage-modal-responsive"
          onCancel={() => {
            setAddPaymentOpen(false);
            setShowMemberSelection(false);
            setSelectedHouseholdForPayment(null);
            setSearchType('household');
            addPaymentForm.resetFields();
          }}
          onOk={async () => {
            try {
              const values = await addPaymentForm.validateFields();
              
              if (!showMemberSelection) {
                // First step: household selected, now show member selection
                const selectedHousehold = households.find(h => h._id === values.householdId);
                if (selectedHousehold) {
                  setSelectedHouseholdForPayment(selectedHousehold);
                  setShowMemberSelection(true);
                  // Set default member as head of household
                  addPaymentForm.setFieldValue('payingMemberId', selectedHousehold.headOfHousehold._id);
                }
              } else {
                // Second step: member selected, proceed to payment
                const payingMemberId = values.payingMemberId;
                const payingMember = selectedHouseholdForPayment.members.find(m => m._id === payingMemberId);
                
                setAddPaymentOpen(false);
                setShowMemberSelection(false);
                addPaymentForm.resetFields();
                
                // Open payment modal with additional info about who's paying
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
                  const selectedMemberData = allMembersWithHousehold.find(m => m.id === values.memberId);
                  
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
              {searchType === 'member' ? "Proceed to Payment" : 
               showMemberSelection ? "Proceed to Payment" : "Select Member"}
            </Button>
          ]}
          okText={showMemberSelection ? "Proceed to Payment" : "Select Member"}
          width={window.innerWidth < 640 ? '95%' : window.innerWidth < 768 ? '90%' : 900}
          bodyStyle={{ 
            padding: window.innerWidth < 640 ? 12 : window.innerWidth < 768 ? 16 : 24,
            maxHeight: window.innerWidth < 768 ? '75vh' : 'auto',
            overflowY: 'auto'
          }}
        >
          <Form form={addPaymentForm} layout="vertical" size={window.innerWidth < 640 ? 'middle' : 'large'} className="responsive-garbage-form">
            {!showMemberSelection ? (
              <div className="space-y-4">
                {/* Search Type Selection */}
                <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
                  <div className="text-base font-medium mb-4">How would you like to search?</div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      type={searchType === 'household' ? 'primary' : 'default'}
                      icon={<HomeOutlined />}
                      size="large"
                      className="w-full sm:w-auto"
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
                      className="w-full sm:w-auto"
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
                  // Household Search
                  <Form.Item
                    name="householdId"
                    label="Select Household"
                    rules={[{ required: true, message: "Please select a household" }]}
                  >
                    <Select
                      showSearch
                      placeholder="Search by household ID, head of household, or Purok"
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
                  // Member Search
                  <Form.Item
                    name="memberId"
                    label="Search by Member Name"
                    rules={[{ required: true, message: "Please select a household member" }]}
                  >
                    <Select
                      showSearch
                      placeholder="Type at least 2 characters to search..."
                      filterOption={(input, option) => {
                        if (!input || input.length < 2) return false;
                        return option?.searchtext?.includes(input.toLowerCase()) || false;
                      }}
                      notFoundContent="Type at least 2 characters to search"
                      virtual={true}
                      listHeight={400}
                    >
                      {allMembersWithHousehold.map(memberData => (
                        <Select.Option 
                          key={memberData.id} 
                          value={memberData.id}
                          searchtext={memberData.searchText}
                        >
                          <span className="font-medium">{memberData.name}</span>
                          {memberData.isHead && <> <Tag color="blue" size="small">Head</Tag></>}
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
                    {selectedHouseholdForPayment?.address?.street}{selectedHouseholdForPayment?.address?.purok ? `, ${selectedHouseholdForPayment?.address?.purok}` : ""}
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
                  💡 Any household member can make garbage fee payments on behalf of the household.
                </div>
              </div>
            )}
          </Form>
        </Modal>

        {/* Pay Garbage Fee Modal */}
        <Modal
          title={
            <div>
              {`Record Garbage Fee Payment${payHousehold ? ` — ${payHousehold.householdId}` : ""}`}
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
          className="garbage-modal-responsive"
          onCancel={() => { 
            setPayOpen(false); 
            setPayHousehold(null); 
            setPaySummary(null); 
            setSelectedMonths([]);
            setMonthPaymentStatus({});
            payForm.resetFields();
          }}
          footer={[
            <Button 
              key="cancel" 
              onClick={() => { 
                setPayOpen(false); 
                setPayHousehold(null); 
                setPaySummary(null); 
                setSelectedMonths([]);
                setMonthPaymentStatus({});
                payForm.resetFields();
              }}
            >
              Cancel
            </Button>,
            <Button
              key="streetlight"
              type="default"
              onClick={proceedToStreetlightPayment}
              disabled={allStreetlightMonthsPaid}
              className={`${allStreetlightMonthsPaid 
                ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700'
              }`}
              title={allStreetlightMonthsPaid ? 'All streetlight months are already paid' : ''}
            >
              Proceed to Streetlight Payment
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              loading={payLoading}
              disabled={!isValidSelection || selectedMonths.length === 0}
              onClick={submitPayFee}
              className={!isValidSelection ? 'opacity-50 cursor-not-allowed' : ''}
              title={!isValidSelection ? 'Please select months sequentially (no gaps allowed)' : ''}
            >
              Record Garbage Payment
            </Button>
          ]}
          width={window.innerWidth < 640 ? '95%' : window.innerWidth < 768 ? '90%' : window.innerWidth < 1024 ? '95%' : 1300}
          centered={window.innerWidth >= 768}
          style={{ top: window.innerWidth < 768 ? 12 : 20 }}
          bodyStyle={{
            padding: window.innerWidth < 640 ? 12 : window.innerWidth < 768 ? 16 : 24,
            maxHeight: window.innerWidth < 768 ? '75vh' : 'auto',
            overflowY: 'auto'
          }}
        >
          <Form form={payForm} layout="vertical" initialValues={{ method: "Cash" }} size={window.innerWidth < 640 ? 'small' : 'middle'} className="responsive-garbage-form">
            <Form.Item label="Fee Type" className="mb-2">
              <Input disabled value="Garbage Collection Fee" size="small" />
            </Form.Item>
            <Form.Item
              name="hasBusiness"
              label="Business Status"
              className="mb-2"
            >
              <div className="space-y-1 p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="businessStatus"
                    checked={!payForm.getFieldValue("hasBusiness")}
                    disabled
                    readOnly
                    className="text-blue-600"
                  />
                  <span className={`text-sm ${!payForm.getFieldValue("hasBusiness") ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                    ₱{getGarbageMonthlyFee(false).toFixed(2)} - No Business
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="businessStatus"
                    checked={payForm.getFieldValue("hasBusiness")}
                    disabled
                    readOnly
                    className="text-blue-600"
                  />
                  <span className={`text-sm ${payForm.getFieldValue("hasBusiness") ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                    ₱{getGarbageMonthlyFee(true).toFixed(2)} - With Business
                  </span>
                </div>
                <div className="text-xs text-gray-500 italic">
                  📝 Business status is determined from household registration and cannot be changed here.
                </div>
              </div>
            </Form.Item>
            <Form.Item
              name="selectedMonths"
              label="Select Months to Pay"
              rules={[{ required: true, message: "Select at least one month" }]}
              className="mb-3"
            >
              <div className="mb-2">
                <label className="block text-xs text-gray-600 mb-1">Year</label>
                <Select size="small" value={garbageYear} onChange={(y)=>{setGarbageYear(y);}} style={{width:180}}>
                  {yearOptions.map(y => (
                    <Select.Option key={y} value={y}>{y}{y===currentYearValue?' (current year)':''}</Select.Option>
                  ))}
                </Select>
              </div>
              <div className="mb-2 flex gap-2">
                <Button
                  type="primary"
                  size="small"
                  onClick={selectAllAllowedMonths}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Select All Available {(() => {
                    const currentYear = garbageYear;
                    const allMonths = [];
                    for (let month = 1; month <= 12; month++) {
                      allMonths.push(`${currentYear}-${String(month).padStart(2, "0")}`);
                    }
                    const availableCount = allMonths.filter(monthKey => {
                      const monthData = monthPaymentStatus[monthKey];
                      return !(monthData?.isPaid);
                    }).length;
                    return availableCount > 0 ? `(${availableCount})` : '';
                  })()}
                </Button>
                <Button
                  size="small"
                  onClick={clearAllSelections}
                  disabled={selectedMonths.length === 0}
                >
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(monthPaymentStatus)
                  .sort()
                  .map(monthKey => {
                    const monthData = monthPaymentStatus[monthKey];
                    const isPaid = monthData?.isPaid;
                    const monthName = dayjs(`${monthKey}-01`).format("MMM YYYY");
                    const balance = monthData?.balance || 0;
                    
                    // Check if this month is allowed to be selected based on sequential payment rule
                    const allowedMonths = getAllowedMonths(monthPaymentStatus, selectedMonths);
                    const isAllowed = allowedMonths.has(monthKey);
                    const isDisabled = isPaid || !isAllowed;
                    
                    return (
                      <div
                        key={monthKey}
                        className={`p-2 border rounded-lg ${
                          isPaid 
                            ? 'bg-green-50 border-green-200 text-green-700' 
                            : selectedMonths.includes(monthKey)
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : !isAllowed
                            ? 'bg-red-50 border-red-200 text-red-500'
                            : 'bg-white border-gray-200'
                        }`}
                        title={!isAllowed && !isPaid ? "Must pay previous unpaid months first" : ""}
                      >
                        <label className={`flex items-center ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            disabled={isDisabled}
                            checked={selectedMonths.includes(monthKey)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Validate before adding
                                const validation = validateSequentialPayment(monthKey, selectedMonths, monthPaymentStatus);
                                if (!validation.valid) {
                                  message.error(validation.message);
                                  return;
                                }
                                
                                const newSelectedMonths = [...selectedMonths, monthKey];
                                setSelectedMonths(newSelectedMonths);
                                
                                // Update validation state
                                const entireSelectionValid = validateEntireSelection(newSelectedMonths, monthPaymentStatus);
                                setIsValidSelection(entireSelectionValid.valid);
                                
                                payForm.setFieldValue("selectedMonths", newSelectedMonths);
                                
                                // Update total charge calculation (use dynamic settings)
                                const fee = getGarbageMonthlyFee(payForm.getFieldValue("hasBusiness"));
                                const totalCharge = newSelectedMonths.length * fee;
                                payForm.setFieldValue("totalCharge", totalCharge);
                                payForm.setFieldValue("amount", totalCharge);
                              } else {
                                // SEQUENTIAL UNCHECKING VALIDATION
                                const uncheckValidation = validateSequentialUnchecking(monthKey, selectedMonths);
                                if (!uncheckValidation.valid) {
                                  message.error(uncheckValidation.message);
                                  return; // Prevent unchecking
                                }
                                
                                const newSelectedMonths = selectedMonths.filter(m => m !== monthKey);
                                setSelectedMonths(newSelectedMonths);
                                
                                // Update validation state
                                const entireSelectionValid = validateEntireSelection(newSelectedMonths, monthPaymentStatus);
                                setIsValidSelection(entireSelectionValid.valid);
                                payForm.setFieldValue("selectedMonths", newSelectedMonths);
                                
                                // Update total charge calculation (use dynamic settings)
                                const fee = getGarbageMonthlyFee(payForm.getFieldValue("hasBusiness"));
                                const totalCharge = newSelectedMonths.length * fee;
                                payForm.setFieldValue("totalCharge", totalCharge);
                                payForm.setFieldValue("amount", totalCharge);
                              }
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
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2 text-sm">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-800">
                    <div className="font-semibold">Sequential Payment Rule</div>
                    <div className="text-xs text-blue-700 mt-1">
                      You must pay previous unpaid months before paying future months. 
                      For example, if January is unpaid, you cannot pay February until January is paid first.
                    </div>
                  </div>
                </div>
              </div>
            </Form.Item>
            <div className="grid grid-cols-3 gap-3 mb-1">
              <Form.Item
                name="totalCharge"
                label={`Total Charge (${selectedMonths.length} month${selectedMonths.length !== 1 ? 's' : ''})`}
                rules={[{ required: true, message: "Total charge calculated automatically" }]}
                className="mb-0"
              >
                <InputNumber className="w-full" disabled size="small" />
              </Form.Item>
              <Form.Item
                name="amount"
                label="Amount to Pay"
                rules={[
                  { required: true, message: "Enter amount to pay" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const total = Number(getFieldValue("totalCharge") || 0);
                      if (value === undefined) return Promise.reject();
                      if (Number(value) < 0) return Promise.reject(new Error("Amount cannot be negative"));
                      if (Number(value) === 0) return Promise.reject(new Error("Amount must be greater than 0"));
                      if (Number(value) > total + 1e-6) {
                        return Promise.reject(new Error("Amount cannot exceed total charge"));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
                className="mb-0"
              >
                <InputNumber 
                  className="w-full" 
                  min={0} 
                  step={50} 
                  size="small"
                  parser={value => value.replace(/[^0-9]/g, '')}
                  inputMode="numeric"
                  onKeyPress={e => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>
              <Form.Item name="method" label="Payment Method" className="mb-0">
                <Input value="Cash" disabled size="small" />
              </Form.Item>
            </div>

            {selectedMonths.length > 0 && (
              <div className="p-2 rounded border border-blue-200 bg-blue-50 text-sm">
                <div className="font-semibold text-blue-800 mb-1">Payment Summary:</div>
                <div className="space-y-0.5 text-xs">
                  <div>Selected Months: {selectedMonths.length}</div>
                  <div>Fee per Month: ₱{getGarbageMonthlyFee(payForm.getFieldValue("hasBusiness")).toFixed(2)}</div>
                  <div>Total Amount: ₱{(selectedMonths.length * getGarbageMonthlyFee(payForm.getFieldValue("hasBusiness"))).toFixed(2)}</div>
                </div>
              </div>
            )}
          </Form>
        </Modal>

        {/* Streetlight Payment Modal */}
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
          open={streetlightPayOpen}
          className="garbage-modal-responsive"
          onCancel={() => { 
            setStreetlightPayOpen(false);
            setStreetlightSelectedMonths([]);
            setStreetlightMonthPaymentStatus({});
            streetlightForm.resetFields();
          }}
          footer={[
            <Button 
              key="cancel" 
              onClick={() => { 
                setStreetlightPayOpen(false);
                setStreetlightSelectedMonths([]);
                setStreetlightMonthPaymentStatus({});
                streetlightForm.resetFields();
              }}
            >
              Cancel
            </Button>,
            <Button 
              key="back" 
              onClick={() => {
                setStreetlightPayOpen(false);
                setPayOpen(true);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600"
            >
              ← Back to Garbage
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              loading={streetlightPayLoading}
              onClick={submitBothPayments}
            >
              Record Payment for Both
            </Button>
          ]}
          width={window.innerWidth < 640 ? '95%' : window.innerWidth < 768 ? '90%' : window.innerWidth < 1024 ? '95%' : 1300}
          centered={window.innerWidth >= 768}
          style={{ top: window.innerWidth < 768 ? 12 : 20 }}
          bodyStyle={{
            padding: window.innerWidth < 640 ? 12 : window.innerWidth < 768 ? 16 : 24,
            maxHeight: window.innerWidth < 768 ? '75vh' : 'auto',
            overflowY: 'auto'
          }}
        >
          <Form form={streetlightForm} layout="vertical" initialValues={{ method: "Cash" }} size={window.innerWidth < 640 ? 'small' : 'middle'} className="responsive-garbage-form">
            <Form.Item label="Fee Type" className="mb-2">
              <Input disabled value="Streetlight Maintenance Fee" size="small" />
            </Form.Item>
            <div className="space-y-1 p-2 bg-gray-50 rounded-lg mb-2">
              <div className="text-sm font-semibold text-gray-700">Fee Information</div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Monthly Rate:</span> ₱{getStreetlightMonthlyFee().toFixed(2)} (applies to all households)
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Annual Rate:</span> ₱{(12 * getStreetlightMonthlyFee()).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                💡 Streetlight fees are the same for all households regardless of business status
              </div>
            </div>
            <Form.Item
              name="selectedMonths"
              label="Select Months to Pay"
              rules={[{ required: true, message: "Select at least one month" }]}
              className="mb-2"
            >
              <div className="mb-2">
                <label className="block text-xs text-gray-600 mb-1">Year</label>
                <Select size="small" value={streetlightYear} onChange={(y)=>{setStreetlightYear(y);}} style={{width:180}}>
                  {yearOptions.map(y => (
                    <Select.Option key={y} value={y}>{y}{y===currentYearValue?' (current year)':''}</Select.Option>
                  ))}
                </Select>
              </div>
              <div className="mb-3 flex gap-2">
                <Button
                  type="primary"
                  size="small"
                  onClick={selectAllStreetlightAllowedMonths}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Select All Available {(() => {
                    const currentYear = streetlightYear;
                    const allMonths = [];
                    for (let month = 1; month <= 12; month++) {
                      allMonths.push(`${currentYear}-${String(month).padStart(2, "0")}`);
                    }
                    const availableCount = allMonths.filter(monthKey => {
                      const monthData = streetlightMonthPaymentStatus[monthKey];
                      return !(monthData?.isPaid);
                    }).length;
                    return availableCount > 0 ? `(${availableCount})` : '';
                  })()}
                </Button>
                <Button
                  size="small"
                  onClick={clearAllStreetlightSelections}
                  disabled={streetlightSelectedMonths.length === 0}
                >
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(streetlightMonthPaymentStatus)
                  .sort()
                  .map(monthKey => {
                    const monthData = streetlightMonthPaymentStatus[monthKey];
                    const isPaid = monthData?.isPaid;
                    const monthName = dayjs(`${monthKey}-01`).format("MMM YYYY");
                    const balance = monthData?.balance || 0;
                    
                    // Check if this month is allowed to be selected based on sequential payment rule
                    const allowedMonths = getStreetlightAllowedMonths(streetlightMonthPaymentStatus, streetlightSelectedMonths);
                    const isAllowed = allowedMonths.has(monthKey);
                    const isDisabled = isPaid || !isAllowed;
                    
                    return (
                      <div
                        key={monthKey}
                        className={`p-2 border rounded-lg ${
                          isPaid 
                            ? 'bg-green-50 border-green-200 text-green-700' 
                            : streetlightSelectedMonths.includes(monthKey)
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : !isAllowed
                            ? 'bg-red-50 border-red-200 text-red-500'
                            : 'bg-white border-gray-200'
                        }`}
                        title={!isAllowed && !isPaid ? "Must pay previous unpaid months first" : ""}
                      >
                        <label className={`flex items-center ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            disabled={isDisabled}
                            checked={streetlightSelectedMonths.includes(monthKey)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Validate before adding
                                const validation = validateStreetlightSequentialPayment(monthKey, streetlightSelectedMonths, streetlightMonthPaymentStatus);
                                if (!validation.valid) {
                                  message.error(validation.message);
                                  return;
                                }
                                
                                const newSelectedMonths = [...streetlightSelectedMonths, monthKey];
                                setStreetlightSelectedMonths(newSelectedMonths);
                                streetlightForm.setFieldValue("selectedMonths", newSelectedMonths);
                                
                                // Update total charge calculation (use dynamic streetlight fee)
                                const fee = getStreetlightMonthlyFee();
                                const totalCharge = newSelectedMonths.length * fee;
                                streetlightForm.setFieldValue("totalCharge", totalCharge);
                                streetlightForm.setFieldValue("amount", totalCharge);
                              } else {
                                // SEQUENTIAL UNCHECKING VALIDATION FOR STREETLIGHT
                                const uncheckValidation = validateStreetlightSequentialUnchecking(monthKey, streetlightSelectedMonths);
                                if (!uncheckValidation.valid) {
                                  message.error(uncheckValidation.message);
                                  return; // Prevent unchecking
                                }
                                
                                const newSelectedMonths = streetlightSelectedMonths.filter(m => m !== monthKey);
                                setStreetlightSelectedMonths(newSelectedMonths);
                                streetlightForm.setFieldValue("selectedMonths", newSelectedMonths);
                                
                                // Update total charge calculation (use dynamic streetlight fee)
                                const fee = getStreetlightMonthlyFee();
                                const totalCharge = newSelectedMonths.length * fee;
                                streetlightForm.setFieldValue("totalCharge", totalCharge);
                                streetlightForm.setFieldValue("amount", totalCharge);
                              }
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
              {streetlightSelectedMonths.length > 0 && (
                <div className="mt-1 text-sm text-blue-600">
                  Selected: {streetlightSelectedMonths.length} month(s)
                </div>
              )}
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2 text-sm">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-800">
                    <div className="font-semibold">Sequential Payment Rule</div>
                    <div className="text-xs text-blue-700 mt-1">
                      You must pay previous unpaid months before paying future months. 
                      For example, if January is unpaid, you cannot pay February until January is paid first.
                    </div>
                  </div>
                </div>
              </div>
            </Form.Item>
            <div className="grid grid-cols-3 gap-3 mb-1">
              <Form.Item
                name="totalCharge"
                label={`Total Charge (${streetlightSelectedMonths.length} month${streetlightSelectedMonths.length !== 1 ? 's' : ''})`}
                rules={[{ required: true, message: "Total charge calculated automatically" }]}
                className="mb-0"
              >
                <InputNumber className="w-full" disabled size="small" />
              </Form.Item>
              <Form.Item
                name="amount"
                label="Amount to Pay"
                rules={[
                  { required: true, message: "Enter amount to pay" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const total = Number(getFieldValue("totalCharge") || 0);
                      if (value === undefined) return Promise.reject();
                      if (Number(value) < 0) return Promise.reject(new Error("Amount cannot be negative"));
                      if (Number(value) === 0) return Promise.reject(new Error("Amount must be greater than 0"));
                      if (Number(value) > total + 1e-6) {
                        return Promise.reject(new Error("Amount cannot exceed total charge"));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
                className="mb-0"
              >
                <InputNumber 
                  className="w-full" 
                  min={0} 
                  step={10} 
                  size="small"
                  parser={value => value.replace(/[^0-9]/g, '')}
                  inputMode="numeric"
                  onKeyPress={e => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>
              <Form.Item name="method" label="Payment Method" className="mb-0">
                <Input value="Cash" disabled size="small" />
              </Form.Item>
            </div>

            {streetlightSelectedMonths.length > 0 && (
              <div className="space-y-3">
                {/* Combined Payment Summary */}
                <div className="p-3 rounded border border-green-200 bg-green-50 text-sm">
                  <div className="font-semibold text-green-800 mb-2">Combined Payment Summary:</div>
                  
                  {/* Garbage Payment Info */}
                  {selectedMonths.length > 0 && (
                    <div className="bg-white p-2 rounded mb-2 border border-green-200">
                      <div className="font-medium text-green-700 text-xs mb-1">Garbage Collection Fee:</div>
                      <div className="space-y-0.5 text-xs text-gray-700">
                        <div>Selected Months: {selectedMonths.length}</div>
                        <div>Fee per Month: ₱{getGarbageMonthlyFee(payForm.getFieldValue("hasBusiness")).toFixed(2)}</div>
                        <div>Subtotal: ₱{(selectedMonths.length * getGarbageMonthlyFee(payForm.getFieldValue("hasBusiness"))).toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Streetlight Payment Info */}
                  <div className="bg-white p-2 rounded mb-2 border border-green-200">
                    <div className="font-medium text-green-700 text-xs mb-1">Streetlight Maintenance Fee:</div>
                    <div className="space-y-0.5 text-xs text-gray-700">
                      <div>Selected Months: {streetlightSelectedMonths.length}</div>
                      <div>Fee per Month: ₱{getStreetlightMonthlyFee().toFixed(2)}</div>
                      <div>Subtotal: ₱{(streetlightSelectedMonths.length * getStreetlightMonthlyFee()).toFixed(2)}</div>
                    </div>
                  </div>
                  
                  {/* Grand Total */}
                  <div className="border-t border-green-300 pt-2 mt-3">
                    <div div className="font-bold text-green-800 text-center">
                      Grand Total: ₱{(
                        (selectedMonths.length * getGarbageMonthlyFee(payForm.getFieldValue("hasBusiness"))) + 
                        (streetlightSelectedMonths.length * getStreetlightMonthlyFee())
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Form>
        </Modal>

        {/* View Household Details Modal */}
        <Modal
          title="Household Details"
          open={viewOpen}
          className="garbage-modal-responsive"
          onCancel={() => setViewOpen(false)}
          footer={null}
          width={window.innerWidth < 640 ? '95%' : window.innerWidth < 768 ? '90%' : 700}
          bodyStyle={{
            padding: window.innerWidth < 640 ? 12 : window.innerWidth < 768 ? 16 : 24,
            maxHeight: window.innerWidth < 768 ? '75vh' : 'auto',
            overflowY: 'auto'
          }}
        >
          {viewHousehold && (
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Household ID">{viewHousehold.householdId}</Descriptions.Item>
              <Descriptions.Item label="Head of Household">
                {fullName(viewHousehold.headOfHousehold) || "Not specified"}
              </Descriptions.Item>
              <Descriptions.Item label="Purok">
                {viewHousehold.address?.purok || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Members Count">
                {viewHousehold.members?.length || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Business Status">
                {viewHousehold.hasBusiness ? (
                  <Tag color="blue">Has Business</Tag>
                ) : (
                  <Tag color="default">No Business</Tag>
                )}
                {viewHousehold.businessType && (
                  <span className="ml-2 text-gray-600">({viewHousehold.businessType})</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Current Garbage Fee">
                ₱{getGarbageMonthlyFee(viewHousehold.hasBusiness).toFixed(2)}/month
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                {(() => {
                  // Calculate overall payment status for current year
                  const monthlyRate = getGarbageMonthlyFee(viewHousehold.hasBusiness);
                  const currentYear = dayjs().year();
                  let totalExpected = 0;
                  let totalPaid = 0;
                  
                  // Check all months of current year
                  for (let month = 1; month <= 12; month++) {
                    const monthStr = `${currentYear}-${String(month).padStart(2, "0")}`;
                    totalExpected += monthlyRate;
                    
                    const monthPayment = garbagePayments.find(payment => 
                      payment.household?._id === viewHousehold._id && payment.month === monthStr
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
                })()}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        {/* Payment History Modal */}
        <Modal
          title={`Payment History${historyHousehold ? ` — ${historyHousehold.householdId}` : ""}`}
          open={historyOpen}
          className="garbage-modal-responsive"
          onCancel={() => {
            setHistoryOpen(false);
            setHistoryHousehold(null);
            setHistoryData([]);
          }}
          footer={null}
          width={window.innerWidth < 640 ? '95%' : window.innerWidth < 768 ? '90%' : 800}
          bodyStyle={{
            padding: window.innerWidth < 640 ? 12 : window.innerWidth < 768 ? 16 : 24,
            maxHeight: window.innerWidth < 768 ? '75vh' : 'auto',
            overflowY: 'auto'
          }}
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
          title="Export Garbage Fees to Excel"
          open={exportOpen}
          className="garbage-modal-responsive"
          onCancel={() => {
            setExportOpen(false);
            exportForm.resetFields();
            setExportHasData(true);
          }}
          footer={[
            <Button key="cancel" onClick={() => {
              setExportOpen(false);
              exportForm.resetFields();
              setExportHasData(true);
            }}>
              Cancel
            </Button>,
            <Button
              key="export"
              type="primary"
              loading={exporting}
              disabled={!exportHasData}
              onClick={() => exportForm.submit()}
            >
              Export to Excel
            </Button>
          ]}
          width={window.innerWidth < 640 ? '95%' : window.innerWidth < 768 ? '90%' : 500}
          bodyStyle={{
            padding: window.innerWidth < 640 ? 12 : window.innerWidth < 768 ? 16 : 24,
            maxHeight: window.innerWidth < 768 ? '75vh' : 'auto',
            overflowY: 'auto'
          }}
        >
          <Form
            form={exportForm}
            layout="vertical"
            onFinish={exportToExcel}
            onValuesChange={() => {
              // Re-validate when form values change
              setTimeout(() => validateExportData(), 100);
            }}
            initialValues={{
              exportType: 'current-month',
              paymentStatus: 'all',
              purokFilter: 'all'
            }}
            size={window.innerWidth < 640 ? 'small' : 'middle'}
            className="responsive-garbage-form"
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
              name="paymentStatus"
              label="Payment Status"
              rules={[{ required: true, message: 'Please select payment status' }]}
            >
              <Select placeholder="Select payment status to export">
                <Select.Option value="all">All (Paid and Unpaid)</Select.Option>
                <Select.Option value="paid">Paid Only</Select.Option>
                <Select.Option value="unpaid">Unpaid Only</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="purokFilter"
              label="Filter by Purok (Optional)"
            >
              <Select 
                placeholder="Select purok or leave as All"
                allowClear
              >
                <Select.Option value="all">All Puroks</Select.Option>
                <Select.Option value="Purok 1">Purok 1</Select.Option>
                <Select.Option value="Purok 2">Purok 2</Select.Option>
                <Select.Option value="Purok 3">Purok 3</Select.Option>
                <Select.Option value="Purok 4">Purok 4</Select.Option>
                <Select.Option value="Purok 5">Purok 5</Select.Option>
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

            {!exportHasData && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 mb-3">
                <p className="font-semibold">⚠️ No data matches the selected filters</p>
                <p className="text-xs mt-1">Please adjust your filter criteria to export data.</p>
              </div>
            )}

            <div className="text-sm text-gray-500 mt-2">
              <p><strong>Export Information:</strong></p>
              <Form.Item noStyle shouldUpdate>
                {({ getFieldValue }) => {
                  const exportType = getFieldValue('exportType');
                  const paymentStatus = getFieldValue('paymentStatus');
                  
                  const getPaymentStatusText = () => {
                    switch(paymentStatus) {
                      case 'paid': return 'Paid households only';
                      case 'unpaid': return 'Unpaid households only';
                      default: return 'All households (paid and unpaid)';
                    }
                  };
                  
                  if (exportType === 'current-month') {
                    return (
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Current month: {dayjs().format('MMMM YYYY')}</li>
                        <li>Filter: {getPaymentStatusText()}</li>
                        <li>Household ID, Head of Household, Address (Purok)</li>
                        <li>Business status (₱{getGarbageMonthlyFee(false).toFixed(2)} or ₱{getGarbageMonthlyFee(true).toFixed(2)}/month)</li>
                        <li>Payment dates, amounts, and balances</li>
                      </ul>
                    );
                  } else if (exportType === 'chosen-month') {
                    const selectedMonth = getFieldValue('selectedMonth');
                    return (
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Selected month: {selectedMonth ? dayjs(selectedMonth).format('MMMM YYYY') : 'Please select month'}</li>
                        <li>Filter: {getPaymentStatusText()}</li>
                        <li>Household ID, Head of Household, Address (Purok)</li>
                        <li>Business status (₱{getGarbageMonthlyFee(false).toFixed(2)} or ₱{getGarbageMonthlyFee(true).toFixed(2)}/month)</li>
                        <li>Payment dates, amounts, and balances</li>
                      </ul>
                    );
                  } else if (exportType === 'whole-year') {
                    return (
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Full year report: {new Date().getFullYear()}</li>
                        <li>Filter: {getPaymentStatusText()}</li>
                        <li>Monthly breakdown for selected households</li>
                        <li>Payment status for each month (Jan-Dec)</li>
                        <li>Yearly totals and balances</li>
                      </ul>
                    );
                  }
                  return null;
                }}
              </Form.Item>
            </div>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}