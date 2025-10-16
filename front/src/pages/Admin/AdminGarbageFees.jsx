import React, { useEffect, useState, useMemo } from "react";
import { Table, Input, Button, Modal, Form, Select, message, Popconfirm, Descriptions, DatePicker, InputNumber, Tag } from "antd";
import dayjs from "dayjs";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { UserOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";

const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";

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
  
  // State for payment history modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyHousehold, setHistoryHousehold] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  
  // State for multiple month payments
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [monthPaymentStatus, setMonthPaymentStatus] = useState({});

  // Get user info from localStorage
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    fetchHouseholds();
    fetchGarbagePayments();
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
      const currentYear = dayjs().year();
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
          const defaultFee = household?.hasBusiness ? 50 : 35;
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

  const fetchFeeSummary = async (householdId, monthStr) => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/households/${householdId}/garbage`, {
        headers: authHeaders(),
        params: { month: monthStr },
      });
      setPaySummary(res.data);
      
      // Get the household info to set business status
      const household = households.find(h => h._id === householdId);
      const defaultFee = household?.hasBusiness ? 50 : 35;
      
      payForm.setFieldsValue({
        month: dayjs(`${monthStr}-01`),
        hasBusiness: household?.hasBusiness || false,
        totalCharge: Number(res.data.totalCharge || defaultFee),
        amount: Number(res.data.balance || res.data.totalCharge || defaultFee),
        method: undefined,
        reference: undefined,
      });
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load garbage fee summary");
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
    const defaultFee = household?.hasBusiness ? 50 : 35;
    const totalCharge = initialMonths.length * defaultFee;
    
    payForm.setFieldsValue({
      hasBusiness: household?.hasBusiness || false,
      selectedMonths: initialMonths,
      totalCharge: totalCharge,
      amount: totalCharge,
      method: undefined,
      reference: undefined,
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
      
      const fee = values.hasBusiness ? 50 : 35;
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
    monthlyRate: 150,
    totalCollected: 0,
    totalOutstanding: 0,
    collectionRate: 0
  });
  
  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/garbage-statistics`, { headers: authHeaders() });
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching statistics:", err);
      // Fallback to calculated stats if API fails
      const totalHouseholds = households.length;
      let expectedRevenue = 0;
      households.forEach(household => {
        expectedRevenue += household.hasBusiness ? 50 : 35;
      });
      const avgMonthlyRate = totalHouseholds > 0 ? expectedRevenue / totalHouseholds : 35;
      const totalCollected = households.reduce((sum, h) => sum + (h.garbageFee?.amountPaid || 0), 0);
      const totalOutstanding = expectedRevenue - totalCollected;
      const collectionRate = expectedRevenue > 0 ? ((totalCollected / expectedRevenue) * 100).toFixed(1) : 0;
      
      setStats({
        totalHouseholds,
        monthlyRate: avgMonthlyRate,
        expectedRevenue,
        totalCollected,
        totalOutstanding,
        collectionRate
      });
    }
  };
  
  useEffect(() => {
    fetchStatistics();
  }, [households]);

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

  const columns = [
    {
      title: "Household ID",
      dataIndex: "householdId",
      key: "householdId",
    },
    {
      title: "Head of Household",
      key: "headOfHousehold",
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
      title: "Address",
      key: "address",
      render: (_, r) =>
        `${r.address?.street || ""}, ${r.address?.purok || ""}`,
    },
    {
      title: "Business",
      key: "business",
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
      render: (_, record) => {
        const fee = record.hasBusiness ? 50 : 35;
        return `₱${fee.toFixed(2)}`;
      },
    },
    {
      title: "Payment Status",
      key: "paymentStatus",
      render: (_, record) => {
        // Calculate overall payment status for current year
        const defaultFee = record.hasBusiness ? 50 : 35;
        const currentYear = dayjs().year();
        let totalExpected = 0;
        let totalPaid = 0;
        
        // Check all months of current year
        for (let month = 1; month <= 12; month++) {
          const monthStr = `${currentYear}-${String(month).padStart(2, "0")}`;
          totalExpected += defaultFee;
          
          const monthPayment = garbagePayments.find(payment => 
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
      render: (_, record) => {
        // Calculate total unpaid balance for current year
        const defaultFee = record.hasBusiness ? 50 : 35;
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
      render: (_, r) => {
        // Check if household has any payments
        const hasPayments = garbagePayments.some(payment => 
          payment.household?._id === r._id
        );
        
        return (
          <div className="flex gap-1 flex-wrap">
            <Button size="small" onClick={() => openView(r)}>View</Button>
            <Button size="small" onClick={() => openPaymentHistory(r)}>History</Button>
            {hasPayments && (
              <Popconfirm
                title="Delete Payment Records"
                description={`Delete ALL payment records for ${r.householdId}? This will reset them to unpaid status.`}
                onConfirm={() => deleteHouseholdPayments(r)}
                okText="Yes, Delete"
                cancelText="Cancel"
                okType="danger"
              >
                <Button 
                  size="small" 
                  danger 
                  title="Delete all payment records for this household"
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

  const filteredHouseholds = households.filter(h =>
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
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Garbage Fees Management
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
                    Monthly Rate
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    ₱{stats.monthlyRate}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    ₱{stats.monthlyRate}
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
                    ₱{(stats.totalCollected || 0).toFixed(2)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    ₱{(stats.totalCollected || 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black shadow-md py-10 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Outstanding
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    ₱{(stats.totalOutstanding || 0).toFixed(2)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    ₱{(stats.totalOutstanding || 0).toFixed(2)}
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
            <div className="flex flex-wrap gap-2">
              <Input.Search
                allowClear
                placeholder="Search households"
                onSearch={v => setSearch(v.trim())}
                value={search}
                onChange={e => setSearch(e.target.value)}
                enterButton
                className="min-w-[180px] max-w-xs"
              />
              <Button 
                type="primary" 
                onClick={() => setAddPaymentOpen(true)}
              >
                Add Payment
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600 self-center">
                Collection Rate: {stats.collectionRate || 0}%
              </span>
              {refreshing && (
                <span className="text-sm text-blue-600 self-center">
                  🔄 Updating payment data...
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              loading={loading || refreshing}
              dataSource={filteredHouseholds}
              columns={columns}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </div>
        </div>

        {/* Add Payment Modal - Household Selection */}
        <Modal
          title="Add Garbage Fee Payment"
          open={addPaymentOpen}
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
              {searchType === 'member' ? "Proceed to Payment" : 
               showMemberSelection ? "Proceed to Payment" : "Select Member"}
            </Button>
          ]}
          okText={showMemberSelection ? "Proceed to Payment" : "Select Member"}
          width={700}
        >
          <Form form={addPaymentForm} layout="vertical">
            {!showMemberSelection ? (
              <div className="space-y-4">
                {/* Search Type Selection */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium mb-3">How would you like to search?</div>
                  <div className="flex gap-4">
                    <Button 
                      type={searchType === 'household' ? 'primary' : 'default'}
                      onClick={() => {
                        setSearchType('household');
                        addPaymentForm.resetFields();
                      }}
                    >
                      🏠 Search by Household
                    </Button>
                    <Button 
                      type={searchType === 'member' ? 'primary' : 'default'}
                      onClick={() => {
                        setSearchType('member');
                        addPaymentForm.resetFields();
                      }}
                    >
                      👤 Search by Member Name
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
                      placeholder="Search by household ID, head of household, or address"
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option?.children?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {households.map(household => (
                        <Select.Option key={household._id} value={household._id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {household.householdId} - {fullName(household.headOfHousehold)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {household.address?.street}, {household.address?.purok}
                            </span>
                          </div>
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
                      placeholder="Type member name to search..."
                      optionFilterProp="children"
                      filterOption={(input, option) => {
                        const memberData = getAllMembersWithHousehold().find(m => m.id === option?.value);
                        return memberData?.searchText?.includes(input.toLowerCase()) || false;
                      }}
                    >
                      {getAllMembersWithHousehold().map(memberData => (
                        <Select.Option key={memberData.id} value={memberData.id}>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{memberData.name}</span>
                              {memberData.isHead && (
                                <Tag color="blue" size="small">Head of Household</Tag>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">
                              Household: {memberData.household.householdId} | {memberData.household.address?.street}, {memberData.household.address?.purok}
                            </span>
                          </div>
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
          width={720}
        >
          <Form form={payForm} layout="vertical">
            <Form.Item label="Fee Type">
              <Input disabled value="Garbage Collection Fee" />
            </Form.Item>
            <Form.Item
              name="hasBusiness"
              label="Business Status"
            >
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
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
                    Without Business (₱35/month)
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
                    With Business (₱50/month)
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2 italic">
                  📝 Business status is determined from household registration and cannot be changed here.
                </div>
              </div>
            </Form.Item>
            <Form.Item
              name="selectedMonths"
              label="Select Months to Pay (Current Year Only)"
              rules={[{ required: true, message: "Select at least one month" }]}
            >
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
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
                        className={`p-2 border rounded ${
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
                              const fee = payForm.getFieldValue("hasBusiness") ? 50 : 35;
                              const totalCharge = newSelectedMonths.length * fee;
                              payForm.setFieldValue("totalCharge", totalCharge);
                              payForm.setFieldValue("amount", totalCharge);
                            }}
                            className="mr-2"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-xs">{monthName}</div>
                            {isPaid ? (
                              <div className="text-xs text-green-600">✓ Paid</div>
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
                <div className="mt-2 text-sm text-blue-600">
                  Selected: {selectedMonths.length} month(s)
                </div>
              )}
            </Form.Item>
            <Form.Item
              name="totalCharge"
              label={`Total Charge (${selectedMonths.length} month${selectedMonths.length !== 1 ? 's' : ''})`}
              rules={[{ required: true, message: "Total charge calculated automatically" }]}
            >
              <InputNumber className="w-full" disabled />
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
            >
              <InputNumber className="w-full" min={0} step={50} />
            </Form.Item>
            <Form.Item name="method" label="Payment Method">
              <Select
                allowClear
                options={[
                  { value: "cash", label: "Cash" },
                  { value: "gcash", label: "GCash" },
                  { value: "bank", label: "Bank Transfer" },
                  { value: "other", label: "Other" },
                ]}
              />
            </Form.Item>
            <Form.Item name="reference" label="Reference No. (optional)">
              <Input />
            </Form.Item>

            {selectedMonths.length > 0 && (
              <div className="p-3 rounded border border-blue-200 bg-blue-50 text-sm">
                <div className="font-semibold text-blue-800 mb-2">Payment Summary:</div>
                <div className="space-y-1">
                  <div>Selected Months: {selectedMonths.length}</div>
                  <div>Fee per Month: ₱{payForm.getFieldValue("hasBusiness") ? "50.00" : "35.00"}</div>
                  <div>Total Amount: ₱{(selectedMonths.length * (payForm.getFieldValue("hasBusiness") ? 50 : 35)).toFixed(2)}</div>
                  <div className="text-xs text-blue-600 mt-2">
                    {selectedMonths.map(m => dayjs(`${m}-01`).format("MMM YYYY")).join(", ")}
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
          onCancel={() => setViewOpen(false)}
          footer={null}
          width={700}
        >
          {viewHousehold && (
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Household ID">{viewHousehold.householdId}</Descriptions.Item>
              <Descriptions.Item label="Head of Household">
                {fullName(viewHousehold.headOfHousehold) || "Not specified"}
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {[
                  viewHousehold.address?.street,
                  viewHousehold.address?.purok,
                  viewHousehold.address?.barangay,
                  viewHousehold.address?.municipality,
                ].filter(Boolean).join(", ")}
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
                ₱{viewHousehold.hasBusiness ? "50.00" : "35.00"}/month
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                {(() => {
                  // Calculate overall payment status for current year
                  const monthlyRate = viewHousehold.hasBusiness ? 50 : 35;
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
      </div>
    </AdminLayout>
  );
}