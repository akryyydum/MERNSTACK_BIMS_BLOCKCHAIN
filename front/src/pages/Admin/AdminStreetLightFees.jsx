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
  
  // Year selection (from 2025 to current)
  const currentYearValue = dayjs().year();
  const [streetlightYear, setStreetlightYear] = useState(currentYearValue);
  const [garbageYear, setGarbageYear] = useState(currentYearValue);
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
  const [garbagePayOpen, setGarbagePayOpen] = useState(false);
  const [garbageForm] = Form.useForm();
  const [garbageSelectedMonths, setGarbageSelectedMonths] = useState([]);
  const [garbageMonthPaymentStatus, setGarbageMonthPaymentStatus] = useState({});
  const [garbagePayLoading, setGarbagePayLoading] = useState(false);
  const [allGarbageMonthsPaid, setAllGarbageMonthsPaid] = useState(false);
  const [isValidGarbageSelection, setIsValidGarbageSelection] = useState(true);

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
  const getStreetlightMonthlyFee = () => {
    return settings && Number.isFinite(Number(settings.streetlightMonthlyFee))
      ? Number(settings.streetlightMonthlyFee)
      : 10;
  };
  const getStreetlightEffectiveMonth = () => {
    if (!settings?.feeHistory) return null;
    const entries = settings.feeHistory.filter(f => f.kind === 'streetlightMonthlyFee');
    if (!entries.length) return null;
    const latest = entries.sort((a,b)=> (a.effectiveMonth < b.effectiveMonth ? 1 : -1))[0];
    return latest.effectiveMonth;
  };
  const getGarbageMonthlyFee = (hasBusiness) => {
    if (settings) {
      const monthly = hasBusiness ? Number(settings.garbageFeeBusinessAnnual || 0) : Number(settings.garbageFeeRegularAnnual || 0);
      return Number.isFinite(monthly) && monthly >= 0 ? monthly : (hasBusiness ? 50 : 35);
    }
    return hasBusiness ? 50 : 35;
  };

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('streetlightFeesColumnsVisibility');
    const defaultColumns = {
      householdId: true,
      headOfHousehold: true,
      purok: true,
      monthlyFee: true,
      paymentStatus: true,
      balance: true,
      actions: true,
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
    localStorage.setItem('streetlightFeesColumnsVisibility', JSON.stringify(columnsToSave));
  }, [visibleColumns]);

  // Get user info from localStorage
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    fetchHouseholds();
    fetchStreetlightPayments();
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
      // Reset selections when year changes
      setSelectedMonths([]);
      payForm.setFieldValue('selectedMonths', []);
      fetchYearlyPaymentStatus(payHousehold._id);
    }
  }, [streetlightYear]);

  useEffect(() => {
    if (garbagePayOpen && payHousehold) {
      setGarbageSelectedMonths([]);
      garbageForm.setFieldValue('selectedMonths', []);
      fetchGarbageYearlyPaymentStatus(payHousehold._id);
    }
  }, [garbageYear]);

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
        const payments = streetlightPayments.filter(p => p.household?.householdId === h.householdId);
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
  }, [exportOpen, households, streetlightPayments, exportForm]);

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

  // Fetch payment status for all months in selected year (streetlight)
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
  const currentYear = dayjs().year();
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

  // SEQUENTIAL UNCHECKING VALIDATION
  const validateSequentialUnchecking = (targetMonth, currentSelectedMonths) => {
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

  // SEQUENTIAL UNCHECKING VALIDATION FOR GARBAGE
  const validateGarbageSequentialUnchecking = (targetMonth, currentSelectedMonths) => {
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

  // Select all allowed months that can be paid sequentially
  const selectAllAllowedMonths = () => {
    // Get all months that could potentially be selected (including currently selected ones)
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
    const fee = getStreetlightMonthlyFee();
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

  const openPayFee = async (household) => {
    setPayHousehold(household);
    setPayOpen(true);
    
    // Check if all garbage months are paid for this household
    const allPaid = await checkIfAllGarbageMonthsPaid(household._id);
    setAllGarbageMonthsPaid(allPaid);
    
    // Fetch payment status for all months in the current year
  const yearlyStatus = await fetchYearlyPaymentStatus(household._id);
    
    // Find unpaid months and set as initial selection
    const unpaidMonths = Object.keys(yearlyStatus).filter(month => !yearlyStatus[month].isPaid);
    const initialMonths = unpaidMonths.slice(0, 1); // Start with current month if unpaid
    setSelectedMonths(initialMonths);
    
    // Calculate initial totals
    const defaultFee = getStreetlightMonthlyFee();
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
  const currentYear = streetlightYear;
      
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
      
      const fee = getStreetlightMonthlyFee();
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
            `${API_BASE}/api/admin/households/${householdId}/streetlight/payments`,
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
        fetchStreetlightPayments(),
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

  // Garbage payment functions for cross-payment functionality
  const fetchGarbageYearlyPaymentStatus = async (householdId) => {
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
      
      setGarbageMonthPaymentStatus(monthStatuses);
      return monthStatuses;
    } catch (err) {
      console.error("Error fetching garbage payment status:", err);
      message.error("Failed to load garbage payment status for the year");
      return {};
    }
  };

  // Helper function to check if all garbage months are paid
  const checkIfAllGarbageMonthsPaid = async (householdId) => {
    try {
      const yearlyStatus = await fetchGarbageYearlyPaymentStatus(householdId);
      const currentYear = garbageYear;
      const allMonths = [];
      
      // Generate all months for current year
      for (let month = 1; month <= 12; month++) {
        allMonths.push(`${currentYear}-${String(month).padStart(2, "0")}`);
      }
      
      // Check if all months are paid
      return allMonths.every(monthKey => yearlyStatus[monthKey]?.isPaid);
    } catch (error) {
      console.error("Error checking garbage payment status:", error);
      return false;
    }
  };

  const proceedToGarbagePayment = async () => {
    if (!payHousehold) return;
    
    // Close the streetlight payment modal first
    setPayOpen(false);
    
    // Very fast transition, then open garbage modal
    setTimeout(async () => {
      // Fetch garbage payment status for all months in the current year
      const yearlyStatus = await fetchGarbageYearlyPaymentStatus(payHousehold._id);
      
      // Find unpaid months and set as initial selection
      const unpaidMonths = Object.keys(yearlyStatus).filter(month => !yearlyStatus[month].isPaid);
      const initialMonths = unpaidMonths.slice(0, 1); // Start with current month if unpaid
      setGarbageSelectedMonths(initialMonths);
      
      // Calculate initial totals
      const defaultFee = getGarbageMonthlyFee(payHousehold?.hasBusiness);
      const totalCharge = initialMonths.length * getStreetlightMonthlyFee();
      
      garbageForm.setFieldsValue({
        hasBusiness: payHousehold?.hasBusiness || false,
        selectedMonths: initialMonths,
        totalCharge: totalCharge,
        amount: totalCharge,
        method: "Cash",
      });
      
      setGarbagePayOpen(true);
    }, 50); // Super fast 50ms transition
  };

  const submitBothPayments = async () => {
    try {
      console.log("Starting combined payment submission...");
      setGarbagePayLoading(true);
      
      // Validate both forms
      const streetlightValues = await payForm.validateFields();
      const garbageValues = await garbageForm.validateFields();
      
      if (!selectedMonths || selectedMonths.length === 0) {
        message.error("Please select at least one month for streetlight payment");
        return;
      }
      
      if (!garbageSelectedMonths || garbageSelectedMonths.length === 0) {
        message.error("Please select at least one month for garbage payment");
        return;
      }

      // STRICT SEQUENTIAL VALIDATION FOR STREETLIGHT PAYMENTS
      for (const monthKey of selectedMonths) {
        const validation = validateSequentialPayment(monthKey, selectedMonths, monthPaymentStatus);
        if (!validation.valid) {
          message.error(`Streetlight Payment - Sequential Payment Violation: ${validation.message}`);
          setGarbagePayLoading(false);
          return;
        }
      }

      // STRICT SEQUENTIAL VALIDATION FOR GARBAGE PAYMENTS  
      for (const monthKey of garbageSelectedMonths) {
        const validation = validateGarbageSequentialPayment(monthKey, garbageSelectedMonths, garbageMonthPaymentStatus);
        if (!validation.valid) {
          message.error(`Garbage Payment - Sequential Payment Violation: ${validation.message}`);
          setGarbagePayLoading(false);
          return;
        }
      }

      console.log("Both payment data:", {
        streetlightValues,
        garbageValues,
        streetlightMonths: selectedMonths,
        garbageMonths: garbageSelectedMonths,
        payHousehold: payHousehold
      });

      // Process Streetlight Payment
      const streetlightAmountPerMonth = Number(streetlightValues.amount) / selectedMonths.length;
      
      const streetlightPaymentPromises = selectedMonths.map(monthKey => {
        const payload = {
          month: monthKey,
          amount: streetlightAmountPerMonth,
          totalCharge: getStreetlightMonthlyFee(),
          method: streetlightValues.method,
          reference: streetlightValues.reference,
          paidBy: payHousehold?.payingMember?._id || payHousehold?.headOfHousehold?._id,
          paidByName: payHousehold?.payingMember ? fullName(payHousehold.payingMember) : fullName(payHousehold.headOfHousehold),
        };
        
        console.log("Streetlight payment payload for month", monthKey, ":", payload);
        
        return axios.post(
          `${API_BASE}/api/admin/households/${payHousehold._id}/streetlight/pay`,
          payload,
          { headers: authHeaders() }
        );
      });

      // Process Garbage Payment
      const garbageFee = getGarbageMonthlyFee(garbageValues.hasBusiness);
      const garbageAmountPerMonth = Number(garbageValues.amount) / garbageSelectedMonths.length;
      
      const garbagePaymentPromises = garbageSelectedMonths.map(monthKey => {
        const payload = {
          month: monthKey,
          amount: garbageAmountPerMonth,
          totalCharge: garbageFee,
          method: garbageValues.method || "Cash",
          reference: garbageValues.reference,
          hasBusiness: Boolean(garbageValues.hasBusiness),
          paidBy: payHousehold?.payingMember?._id || payHousehold?.headOfHousehold?._id,
          paidByName: payHousehold?.payingMember ? fullName(payHousehold.payingMember) : fullName(payHousehold.headOfHousehold),
        };
        
        console.log("Garbage payment payload for month", monthKey, ":", payload);
        
        return axios.post(`${API_BASE}/api/admin/households/${payHousehold._id}/garbage/pay`, payload, { headers: authHeaders() });
      });

      // Submit both payments simultaneously
      await Promise.all([...streetlightPaymentPromises, ...garbagePaymentPromises]);
      
      const streetlightPaidMonths = selectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ");
      const garbagePaidMonths = garbageSelectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ");
      
      message.success(`Both payments recorded successfully! Streetlight: ${streetlightPaidMonths} | Garbage: ${garbagePaidMonths}`);
      
      // Close both modals and reset all states
      setPayOpen(false);
      setGarbagePayOpen(false);
      setPaySummary(null);
      setPayHousehold(null);
      setSelectedMonths([]);
      setGarbageSelectedMonths([]);
      setMonthPaymentStatus({});
      setGarbageMonthPaymentStatus({});
      payForm.resetFields();
      garbageForm.resetFields();
      
      // Show refreshing indicator and refresh all data
      setRefreshing(true);
      try {
        await Promise.all([
          fetchHouseholds(),
          fetchStreetlightPayments(),
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
      setGarbagePayLoading(false);
    }
  };

  const submitGarbagePayment = async () => {
    try {
      console.log("Starting garbage payment submission...");
      setGarbagePayLoading(true);
      const values = await garbageForm.validateFields();
      
      if (!garbageSelectedMonths || garbageSelectedMonths.length === 0) {
        message.error("Please select at least one month to pay");
        return;
      }

      console.log("Garbage payment data:", {
        values,
        selectedMonths: garbageSelectedMonths,
        payHousehold: payHousehold
      });

      const amountPerMonth = Number(values.amount) / garbageSelectedMonths.length;
      
      // Submit payments for each selected month
      const paymentPromises = garbageSelectedMonths.map(monthKey => {
        const payload = {
          month: monthKey,
          amount: amountPerMonth,
          totalCharge: getGarbageMonthlyFee(garbageForm.getFieldValue("hasBusiness")),
          method: values.method || "Cash",
          reference: values.reference,
          hasBusiness: Boolean(garbageForm.getFieldValue("hasBusiness")),
          paidBy: payHousehold?.payingMember?._id || payHousehold?.headOfHousehold?._id,
          paidByName: payHousehold?.payingMember ? fullName(payHousehold.payingMember) : fullName(payHousehold.headOfHousehold),
        };
        
        console.log("Garbage payment payload for month", monthKey, ":", payload);
        
        return axios.post(`${API_BASE}/api/admin/households/${payHousehold._id}/garbage/pay`, payload, { headers: authHeaders() });
      });

      await Promise.all(paymentPromises);
      
      const paidMonths = garbageSelectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ");
      message.success(`Garbage payment recorded for ${garbageSelectedMonths.length} month(s): ${paidMonths}`);
      
      // Close garbage modal and reset
      setGarbagePayOpen(false);
      setGarbageSelectedMonths([]);
      setGarbageMonthPaymentStatus({});
      garbageForm.resetFields();
      
    } catch (err) {
      console.error("Garbage payment error:", err);
      message.error(err?.response?.data?.message || "Failed to record garbage payment");
    } finally {
      setGarbagePayLoading(false);
    }
  };

  // Garbage validation functions (copied from AdminGarbageFees)
  const validateGarbageSequentialPayment = (monthKey, currentSelectedMonths, paymentStatuses) => {
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

  const getGarbageAllowedMonths = (paymentStatuses, currentSelectedMonths) => {
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

  const selectAllGarbageAllowedMonths = () => {
    // Get all months that could potentially be selected
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
      const monthData = garbageMonthPaymentStatus[monthKey];
      const isPaid = monthData?.isPaid || false;
      
      if (!isPaid) {
        allAllowedMonths.push(monthKey);
      } else if (allAllowedMonths.length > 0) {
        // If we hit a paid month after finding unpaid months, stop
        break;
      }
    }
    
    setGarbageSelectedMonths(allAllowedMonths);
    garbageForm.setFieldValue("selectedMonths", allAllowedMonths);
    
    // Update total charge calculation
    const fee = getGarbageMonthlyFee(garbageForm.getFieldValue("hasBusiness"));
    const totalCharge = allAllowedMonths.length * fee;
    garbageForm.setFieldValue("totalCharge", totalCharge);
    garbageForm.setFieldValue("amount", totalCharge);
  };

  const clearAllGarbageSelections = () => {
    setGarbageSelectedMonths([]);
    garbageForm.setFieldValue("selectedMonths", []);
    garbageForm.setFieldValue("totalCharge", 0);
    garbageForm.setFieldValue("amount", 0);
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
    monthlyRate: getStreetlightMonthlyFee(),
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
      const monthlyRate = getStreetlightMonthlyFee();
      
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
  }, [households, settings]);

  // Excel Export Functions
  const exportToExcel = async (values) => {
    setExporting(true);
    try {
      // Fetch fresh payment data before exporting
      const paymentRes = await axios.get(`${API_BASE}/api/admin/streetlight-payments`, { headers: authHeaders() });
      const freshStreetlightPayments = paymentRes.data || [];
      
      console.log('Fresh streetlight payment data for export:', freshStreetlightPayments);
      
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
        exportData = await generateYearlyExportData(freshStreetlightPayments, paymentStatus, filteredHouseholds);
        const purokSuffix = purokFilter && purokFilter !== 'all' ? `_${purokFilter.replace(/\s+/g, '_')}` : '';
        filename = `Streetlight_Fees_${new Date().getFullYear()}${purokSuffix}_${paymentStatus === 'all' ? 'Complete' : paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}.xlsx`;
      } else if (exportType === 'chosen-month') {
        // Export chosen month data
        const selectedMonthStr = dayjs(selectedMonth).format('YYYY-MM');
        exportData = await generateMonthlyExportData(selectedMonthStr, freshStreetlightPayments, paymentStatus, filteredHouseholds);
        const monthName = dayjs(selectedMonth).format('MMMM_YYYY');
        const purokSuffix = purokFilter && purokFilter !== 'all' ? `_${purokFilter.replace(/\s+/g, '_')}` : '';
        filename = `Streetlight_Fees_${monthName}${purokSuffix}_${paymentStatus === 'all' ? 'All' : paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}.xlsx`;
      } else if (exportType === 'current-month') {
        // Export current month data
        const currentMonth = dayjs().format('YYYY-MM');
        exportData = await generateMonthlyExportData(currentMonth, freshStreetlightPayments, paymentStatus, filteredHouseholds);
        const monthName = dayjs().format('MMMM_YYYY');
        const purokSuffix = purokFilter && purokFilter !== 'all' ? `_${purokFilter.replace(/\s+/g, '_')}` : '';
        filename = `Streetlight_Fees_${monthName}${purokSuffix}_Current_${paymentStatus === 'all' ? 'All' : paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}.xlsx`;
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

  const generateYearlyExportData = async (paymentData, paymentStatus = 'all', householdsToExport = null) => {
    const exportData = [];
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => 
      dayjs().month(i).format('YYYY-MM')
    );

    const householdList = householdsToExport || households;
    console.log('Generating yearly streetlight export with payments:', paymentData);
    console.log('Households for export:', householdList);
    console.log('Payment status filter:', paymentStatus);

    for (const household of householdList) {
      // Check if household should be included based on payment status filter
      const householdPayments = paymentData.filter(p => p.household && p.household.householdId === household.householdId);
      const hasPaidPayments = householdPayments.some(p => p.amountPaid > 0);
      const hasUnpaidMonths = months.some(month => {
        const payment = householdPayments.find(p => p.month === month);
        return !payment || payment.amountPaid === 0;
      });

      // Apply payment status filter
      if (paymentStatus === 'paid' && !hasPaidPayments) continue;
      if (paymentStatus === 'unpaid' && !hasUnpaidMonths) continue;

      const baseData = {
        'Household ID': household.householdId,
        'Head of Household': fullName(household.headOfHousehold),
        'Purok': household.address?.purok || 'N/A',
        'Monthly Fee': `₱${Number(getStreetlightMonthlyFee()).toFixed(2)}`,
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
        
      const expectedFee = getStreetlightMonthlyFee();
      const expectedTotal = expectedFee * 12;
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
    console.log('Generating monthly streetlight export for:', monthStr);
    console.log('Payment data:', paymentData);
    console.log('Households:', householdList);
    console.log('Payment status filter:', paymentStatus);

    for (const household of householdList) {
      const payment = paymentData.find(p => 
        p.household?.householdId === household.householdId && 
        p.month === monthStr
      );

      console.log(`Streetlight payment for ${household.householdId} in ${monthStr}:`, payment);

      const expectedFee = getStreetlightMonthlyFee();
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
        'Monthly Fee': `₱${Number(expectedFee).toFixed(2)}`,
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
      title: "Monthly Fee",
      key: "monthlyFee",
      columnKey: "monthlyFee",
      render: () => `₱${Number(getStreetlightMonthlyFee()).toFixed(2)}`,
    },
    {
      title: "Payment Status",
      key: "paymentStatus",
      columnKey: "paymentStatus",
      render: (_, record) => {
        // Mirror the view modal's logic to ensure matching status
        const currentYear = streetlightYear;
        let allPaid = true;
        let anyPaid = false;
        const isSameHousehold = (a, b) => {
          if (!a || !b) return false;
          return String(a) === String(b);
        };
        for (let month = 1; month <= 12; month++) {
          const monthStr = `${currentYear}-${String(month).padStart(2, "0")}`;
          const monthPayment = streetlightPayments.find(payment => {
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
        const defaultFee = getStreetlightMonthlyFee();
  const currentYear = streetlightYear;
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
    const safeHouseholds = Array.isArray(households) ? households : [];
    if (!search) return safeHouseholds;
    const term = search.toLowerCase();
    return safeHouseholds.filter((h) => {
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
                      <span className="font-semibold">Monthly:</span> ₱{Number(stats.monthlyRate).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">Yearly:</span> ₱{(Number(stats.monthlyRate) * 12).toFixed(2)}
                    </div>
                    {getStreetlightEffectiveMonth() && (
                      <div className="text-xs text-gray-500">Effective Since: {dayjs(getStreetlightEffectiveMonth()+'-01').format('MMM YYYY')}</div>
                    )}
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

          <Table
            columns={columns}
            dataSource={filteredHouseholds}
            rowKey="_id"
            loading={loading || refreshing}
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
                  `${range[0]}-${range[1]} of ${total} Streetlight fee payments | Selected: ${selectedRowKeys.length}`,
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
              key="garbage"
              type="default"
              onClick={proceedToGarbagePayment}
              disabled={allGarbageMonthsPaid}
              className={`${allGarbageMonthsPaid 
                ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700'
              }`}
              title={allGarbageMonthsPaid ? 'All garbage months are already paid' : ''}
            >
              Proceed to Garbage Payment
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              loading={payLoading}
              onClick={submitPayFee}
            >
              Record Streetlight Payment
            </Button>
          ]}
          width={850}
        >
          <Form form={payForm} layout="vertical" initialValues={{ method: "Cash" }}>
            <Form.Item label="Fee Type" className="mb-3">
              <Input disabled value="Streetlight Maintenance Fee" size="small" />
            </Form.Item>
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg mb-3">
              <div className="text-sm font-semibold text-gray-700">Fee Information</div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Monthly Rate:</span> ₱{Number(getStreetlightMonthlyFee()).toFixed(2)} (current effective)
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Annual Rate:</span> ₱{(Number(getStreetlightMonthlyFee()) * 12).toFixed(2)}
              </div>
              {getStreetlightEffectiveMonth() && (
                <div className="text-xs text-gray-500">Effective Since: {dayjs(getStreetlightEffectiveMonth()+'-01').format('MMM YYYY')}</div>
              )}
              <div className="text-xs text-gray-500">
                💡 Streetlight fees are the same for all households regardless of business status
              </div>
            </div>
            {/* Month Selection - with Year Selector */}
            <Form.Item
              name="selectedMonths"
              label="Select Months to Pay"
              rules={[{ required: true, message: "Select at least one month" }]}
              className="mb-3"
            >
              <div className="mb-2">
                <label className="block text-xs text-gray-600 mb-1">Year</label>
                <Select 
                  size="small" 
                  value={streetlightYear} 
                  onChange={(y) => {
                    setStreetlightYear(y);
                  }}
                  style={{ width: 180 }}
                >
                  {yearOptions.map(y => (
                    <Select.Option key={y} value={y}>
                      {y}{y === currentYearValue ? ' (current year)' : ''}
                    </Select.Option>
                  ))}
                </Select>
              </div>
              <div className="mb-3 flex gap-2">
                <Button
                  type="primary"
                  size="small"
                  onClick={selectAllAllowedMonths}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Select All Available {(() => {
                    const currentYear = streetlightYear;
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
                                payForm.setFieldValue("selectedMonths", newSelectedMonths);
                                
                                // Update total charge calculation
                                const fee = getStreetlightMonthlyFee();
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
                                payForm.setFieldValue("selectedMonths", newSelectedMonths);
                                
                                // Update total charge calculation
                                const fee = getStreetlightMonthlyFee();
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
                  <div>Fee per Month: ₱{Number(getStreetlightMonthlyFee()).toFixed(2)}</div>
                  <div>Total Amount: ₱{(selectedMonths.length * Number(getStreetlightMonthlyFee())).toFixed(2)}</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {selectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ")}
                  </div>
                </div>
              </div>
            )}
          </Form>
        </Modal>

        {/* Garbage Payment Modal */}
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
          open={garbagePayOpen}
          onCancel={() => { 
            setGarbagePayOpen(false);
            setGarbageSelectedMonths([]);
            setGarbageMonthPaymentStatus({});
            garbageForm.resetFields();
          }}
          footer={[
            <Button 
              key="cancel" 
              onClick={() => { 
                setGarbagePayOpen(false);
                setGarbageSelectedMonths([]);
                setGarbageMonthPaymentStatus({});
                garbageForm.resetFields();
              }}
            >
              Cancel
            </Button>,
            <Button 
              key="back" 
              onClick={() => {
                setGarbagePayOpen(false);
                setPayOpen(true);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 hover:border-gray-600"
            >
              ← Back to Streetlight
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              loading={garbagePayLoading}
              onClick={submitBothPayments}
            >
              Record Payment for Both
            </Button>
          ]}
          width={850}
        >
          <Form form={garbageForm} layout="vertical" initialValues={{ method: "Cash" }}>
            <Form.Item label="Fee Type" className="mb-3">
              <Input disabled value="Garbage Collection Fee" size="small" />
            </Form.Item>
            <Form.Item
              name="hasBusiness"
              label="Business Status"
              className="mb-3"
            >
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="businessStatus"
                    checked={!garbageForm.getFieldValue("hasBusiness")}
                    disabled
                    readOnly
                    className="text-blue-600"
                  />
                  <span className={`text-sm ${!garbageForm.getFieldValue("hasBusiness") ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                    ₱{getGarbageMonthlyFee(false).toFixed(2)} - No Business
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="businessStatus"
                    checked={garbageForm.getFieldValue("hasBusiness")}
                    disabled
                    readOnly
                    className="text-blue-600"
                  />
                  <span className={`text-sm ${garbageForm.getFieldValue("hasBusiness") ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
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
                <Select 
                  size="small" 
                  value={garbageYear} 
                  onChange={(y) => {
                    setGarbageYear(y);
                  }}
                  style={{ width: 180 }}
                >
                  {yearOptions.map(y => (
                    <Select.Option key={y} value={y}>
                      {y}{y === currentYearValue ? ' (current year)' : ''}
                    </Select.Option>
                  ))}
                </Select>
              </div>
              <div className="mb-3 flex gap-2">
                <Button
                  type="primary"
                  size="small"
                  onClick={selectAllGarbageAllowedMonths}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Select All Available {(() => {
                    const currentYear = garbageYear;
                    const allMonths = [];
                    for (let month = 1; month <= 12; month++) {
                      allMonths.push(`${currentYear}-${String(month).padStart(2, "0")}`);
                    }
                    const availableCount = allMonths.filter(monthKey => {
                      const monthData = garbageMonthPaymentStatus[monthKey];
                      return !(monthData?.isPaid);
                    }).length;
                    return availableCount > 0 ? `(${availableCount})` : '';
                  })()}
                </Button>
                <Button
                  size="small"
                  onClick={clearAllGarbageSelections}
                  disabled={garbageSelectedMonths.length === 0}
                >
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(garbageMonthPaymentStatus)
                  .sort()
                  .map(monthKey => {
                    const monthData = garbageMonthPaymentStatus[monthKey];
                    const isPaid = monthData?.isPaid;
                    const monthName = dayjs(`${monthKey}-01`).format("MMM YYYY");
                    const balance = monthData?.balance || 0;
                    
                    // Check if this month is allowed to be selected based on sequential payment rule
                    const allowedMonths = getGarbageAllowedMonths(garbageMonthPaymentStatus, garbageSelectedMonths);
                    const isAllowed = allowedMonths.has(monthKey);
                    const isDisabled = isPaid || !isAllowed;
                    
                    return (
                      <div
                        key={monthKey}
                        className={`p-2 border rounded-lg ${
                          isPaid 
                            ? 'bg-green-50 border-green-200 text-green-700' 
                            : garbageSelectedMonths.includes(monthKey)
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
                            checked={garbageSelectedMonths.includes(monthKey)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Validate before adding
                                const validation = validateGarbageSequentialPayment(monthKey, garbageSelectedMonths, garbageMonthPaymentStatus);
                                if (!validation.valid) {
                                  message.error(validation.message);
                                  return;
                                }
                                
                                const newSelectedMonths = [...garbageSelectedMonths, monthKey];
                                setGarbageSelectedMonths(newSelectedMonths);
                                garbageForm.setFieldValue("selectedMonths", newSelectedMonths);
                                
                                // Update total charge calculation
                                const fee = getGarbageMonthlyFee(garbageForm.getFieldValue("hasBusiness"));
                                const totalCharge = newSelectedMonths.length * fee;
                                garbageForm.setFieldValue("totalCharge", totalCharge);
                                garbageForm.setFieldValue("amount", totalCharge);
                              } else {
                                // SEQUENTIAL UNCHECKING VALIDATION FOR GARBAGE
                                const uncheckValidation = validateGarbageSequentialUnchecking(monthKey, garbageSelectedMonths);
                                if (!uncheckValidation.valid) {
                                  message.error(uncheckValidation.message);
                                  return; // Prevent unchecking
                                }
                                
                                const newSelectedMonths = garbageSelectedMonths.filter(m => m !== monthKey);
                                setGarbageSelectedMonths(newSelectedMonths);
                                garbageForm.setFieldValue("selectedMonths", newSelectedMonths);
                                
                                // Update total charge calculation
                                const fee = getGarbageMonthlyFee(garbageForm.getFieldValue("hasBusiness"));
                                const totalCharge = newSelectedMonths.length * fee;
                                garbageForm.setFieldValue("totalCharge", totalCharge);
                                garbageForm.setFieldValue("amount", totalCharge);
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
              {garbageSelectedMonths.length > 0 && (
                <div className="mt-1 text-sm text-blue-600">
                  Selected: {garbageSelectedMonths.length} month(s)
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
            <Form.Item
              name="totalCharge"
              label={`Total Charge (${garbageSelectedMonths.length} month${garbageSelectedMonths.length !== 1 ? 's' : ''})`}
              rules={[{ required: true, message: "Total charge calculated automatically" }]}
              className="mb-3"
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
              className="mb-3"
            >
              <InputNumber className="w-full" min={0} step={50} size="small" />
            </Form.Item>
            <Form.Item name="method" label="Payment Method" className="mb-3">
              <Input value="Cash" disabled size="small" />
            </Form.Item>

            {garbageSelectedMonths.length > 0 && (
              <div className="p-3 rounded-lg border border-green-300 bg-green-50 text-sm">
                <div className="font-semibold text-green-800 mb-3 text-center">Combined Payment Summary</div>
                
                {/* Streetlight Payment Section */}
                {selectedMonths.length > 0 && (
                  <div className="mb-3 p-2 bg-white rounded border border-green-200">
                    <div className="font-medium text-green-700 mb-2">Streetlight Fees</div>
                    <div className="space-y-1 text-xs">
                      <div>Selected Months: {selectedMonths.length}</div>
                      <div>Fee per Month: ₱{Number(getStreetlightMonthlyFee()).toFixed(2)}</div>
                      <div className="font-medium">Subtotal: ₱{(selectedMonths.length * Number(getStreetlightMonthlyFee())).toFixed(2)}</div>
                      <div className="text-xs text-green-600 mt-1">
                        {selectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ")}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Garbage Payment Section */}
                <div className="mb-3 p-2 bg-white rounded border border-green-200">
                  <div className="font-medium text-green-700 mb-2">Garbage Collection Fees</div>
                  <div className="space-y-1 text-xs">
                    <div>Selected Months: {garbageSelectedMonths.length}</div>
                    <div>Fee per Month: ₱{garbageForm.getFieldValue("hasBusiness") ? "50.00" : "35.00"}</div>
                    <div className="font-medium">Subtotal: ₱{(garbageSelectedMonths.length * (getGarbageMonthlyFee(garbageForm.getFieldValue("hasBusiness")))).toFixed(2)}</div>
                    <div className="text-xs text-green-600 mt-1">
                      {garbageSelectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ")}
                    </div>
                  </div>
                </div>
                
                {/* Grand Total */}
                <div className="border-t border-green-300 pt-2 mt-3">
                  <div className="font-bold text-green-800 text-center">
                    GRAND TOTAL: ₱{(
                      (selectedMonths.length * Number(getStreetlightMonthlyFee())) + 
                      (garbageSelectedMonths.length * (getGarbageMonthlyFee(garbageForm.getFieldValue("hasBusiness"))))
                    ).toFixed(2)}
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
                ₱{Number(getStreetlightMonthlyFee()).toFixed(2)}{getStreetlightEffectiveMonth() ? ` (effective ${dayjs(getStreetlightEffectiveMonth()+'-01').format('MMM YYYY')})` : ''}
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
                  const currentYear = streetlightYear;
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
          width={500}
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