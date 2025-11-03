import React, { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Form, Select, message, Tag, Descriptions, DatePicker, Row, Col, Tabs } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, DollarSign, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { UserOutlined, SyncOutlined, FileTextOutlined, BarChartOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const getTransactionKey = (transaction = {}) => {
  const rawKey =
    transaction?._id ??
    transaction?.id ??
    transaction?.transactionId ??
    transaction?.key ??
    "";

  if (!rawKey && rawKey !== 0) return "";
  if (typeof rawKey === "string") return rawKey;
  if (typeof rawKey === "number") return String(rawKey);
  if (rawKey && typeof rawKey === "object" && typeof rawKey.toString === "function") {
    return rawKey.toString();
  }
  return String(rawKey ?? "");
};

export default function AdminFinancialReports() {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [filters, setFilters] = useState({});
  
  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [editTransaction, setEditTransaction] = useState(null);
  
  // Forms
  const [createForm] = Form.useForm();
  const [reportForm] = Form.useForm();
  const [editForm] = Form.useForm();
  
  // Loading states
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [residents, setResidents] = useState([]);
  const [officials, setOfficials] = useState([]);

  useEffect(() => {
    fetchDashboard();
    fetchTransactions();
    fetchResidents();
    fetchOfficials();
  }, [dateRange, filters]);

  // Helper function for auth headers
  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchDashboard = async () => {
    try {
      const params = {
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD')
      };
      
      const res = await axios.get(`${API_BASE}/api/admin/financial/dashboard`, {
        headers: authHeaders(),
        params
      });
      
      setDashboardData(res.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      message.error('Failed to load financial dashboard');
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange[0]) params.append('startDate', dateRange[0].toISOString());
      if (dateRange[1]) params.append('endDate', dateRange[1].toISOString());
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      
      // Only show completed/pending transactions, not cancelled
      if (filters.status) {
        params.append('status', filters.status);
      } else {
        // Don't show cancelled by default
        params.append('status', 'completed');
      }

      console.log('Fetching transactions with params:', params.toString());

      const res = await axios.get(
        `${API_BASE}/api/admin/financial/transactions?${params}`,
        { headers: authHeaders() }
      );
      
      console.log('Transactions fetched:', res.data.transactions?.length);
      const fetchedTransactions = (res.data.transactions || []).map((tx) => ({
        ...tx,
        __rowKey: getTransactionKey(tx),
      }));

      setTransactions(fetchedTransactions);
      setSelectedRowKeys((prev) =>
        prev.filter((key) =>
          fetchedTransactions.some((tx) => getTransactionKey(tx) === key)
        )
      );
    } catch (error) {
      console.error('Error fetching transactions:', error);
      message.error('Failed to fetch transactions');
    }
    setLoading(false);
  };

  const fetchResidents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/residents`, {
        headers: authHeaders()
      });
      setResidents(res.data.residents || []);
    } catch (error) {
      console.error('Error fetching residents:', error);
    }
  };

  const fetchOfficials = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/officials`, {
        headers: authHeaders()
      });
      setOfficials(res.data || []);
    } catch (error) {
      console.error('Error fetching officials:', error);
    }
  };

  const handleCreateTransaction = async () => {
    try {
      setCreating(true);
      const values = await createForm.validateFields();
      
      await axios.post(`${API_BASE}/api/admin/financial/transactions`, values, {
        headers: authHeaders()
      });
      
      message.success('Transaction created successfully!');
      setCreateOpen(false);
      createForm.resetFields();
      fetchDashboard();
      fetchTransactions();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to create transaction');
    }
    setCreating(false);
  };

  const handleSyncDocumentFees = async () => {
    try {
      setSyncing(true);
      const res = await axios.post(`${API_BASE}/api/admin/financial/sync-document-fees`, {}, {
        headers: authHeaders()
      });
      
      message.success(res.data.message);
      fetchDashboard();
      fetchTransactions();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to sync document fees');
    }
    setSyncing(false);
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      
      const excelData = transactions.map(t => ({
        'Transaction ID': t.transactionId,
        'Type': t.type,
        'Category': t.category,
        'Description': t.description,
        'Amount': t.amount,
        'Resident': t.residentId ? `${t.residentId.firstName} ${t.residentId.lastName}` : '-',
        'Payment Method': t.paymentMethod,
        'Status': t.status,
        'Date': dayjs(t.transactionDate).format('YYYY-MM-DD HH:mm')
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-fit columns
      const colWidths = Object.keys(excelData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Financial_Transactions');
      
      const filename = `Financial_Report_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      message.success('Financial report exported successfully!');
    } catch (error) {
      message.error('Failed to export data');
    }
    setExporting(false);
  };

  const generateReport = async () => {
    try {
      const values = await reportForm.validateFields();
      const params = {
        type: values.reportType,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD')
      };
      
      const res = await axios.get(`${API_BASE}/api/admin/financial/reports`, {
        headers: authHeaders(),
        params
      });
      
      // Handle different report types
      if (values.reportType === 'summary') {
        Modal.info({
          title: 'Financial Summary Report',
          width: 600,
          content: (
            <div className="space-y-4">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="Total Revenue" value={res.data.totalRevenue} prefix="₱" />
                </Col>
                <Col span={12}>
                  <Statistic title="Total Expenses" value={res.data.totalExpenses} prefix="₱" />
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="Net Income" value={res.data.netIncome} prefix="₱" />
                </Col>
                <Col span={12}>
                  <Statistic title="Total Transactions" value={res.data.transactionCount} />
                </Col>
              </Row>
            </div>
          )
        });
      }
      
      setReportOpen(false);
      reportForm.resetFields();
    } catch (error) {
      message.error('Failed to generate report');
    }
  };

  const statistics = dashboardData.statistics || {};
  const revenues = Array.isArray(dashboardData.revenues) ? dashboardData.revenues : statistics.revenues || [];
  const expenses = Array.isArray(dashboardData.expenses) ? dashboardData.expenses : statistics.expenses || [];
  const allocations = Array.isArray(dashboardData.allocations) ? dashboardData.allocations : statistics.allocations || [];
  const monthlyTrends = Array.isArray(dashboardData.monthlyTrends) ? dashboardData.monthlyTrends : statistics.monthlyTrends || [];

  const totalRevenue = revenues.length
    ? revenues.reduce((sum, r) => sum + Number(r.total || 0), 0)
    : Number(statistics.totalRevenue ?? statistics.totalIncome ?? 0);

  const totalExpenses = expenses.length
    ? expenses.reduce((sum, e) => sum + Number(e.total || 0), 0)
    : Number(statistics.totalExpenses ?? statistics.expenseTotal ?? 0);

  const totalAllocations = allocations.length
    ? allocations.reduce((sum, a) => sum + Number(a.total || 0), 0)
    : Number(statistics.totalAllocations ?? statistics.allocationTotal ?? 0);

  const netIncome = Number(
    statistics.netIncome ?? statistics.balance ?? (totalRevenue - totalExpenses)
  );

  // Chart data
  const revenueChartData = {
    labels: revenues.map(r => (r._id ? String(r._id).replace(/_/g, ' ').toUpperCase() : '')),
    datasets: [{
      label: 'Revenue by Type',
      data: revenues.map(r => Number(r.total || 0)),
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'
      ]
    }]
  };

  const monthlyTrendData = {
    labels: monthlyTrends.map(m => {
      const id = m?._id || {};
      return `${id.year ?? '----'}-${String(id.month ?? 1).padStart(2, '0')}`;
    }),
    datasets: [
      {
        label: 'Revenue',
        data: monthlyTrends
          .filter(m => m._id?.category === 'revenue')
          .map(m => Number(m.total || 0)),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      },
      {
        label: 'Expenses',
        data: monthlyTrends
          .filter(m => m._id?.category === 'expense')
          .map(m => Number(m.total || 0)),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      }
    ]
  };

  const handleEditTransaction = async () => {
    try {
      setCreating(true);
      const values = await editForm.validateFields();
      
      await axios.put(
        `${API_BASE}/api/admin/financial/transactions/${editTransaction._id}`, 
        values, 
        { headers: authHeaders() }
      );
      
      message.success('Transaction updated successfully!');
      setEditOpen(false);
      editForm.resetFields();
      setEditTransaction(null);
      fetchDashboard();
      fetchTransactions();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to update transaction');
    }
    setCreating(false);
  };

  // Handle Delete Transaction
  const handleDeleteTransaction = (record) => {
    Modal.confirm({
      title: 'Delete Transaction',
      content: `Are you sure you want to delete transaction ${record.transactionId}?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const transactionKey = getTransactionKey(record);

          if (!transactionKey || transactionKey === "undefined" || transactionKey === "null") {
            message.error('Missing transaction identifier. Please refresh and try again.');
            return;
          }

          const isMongoId = objectIdRegex.test(transactionKey);
          console.log('Deleting transaction:', transactionKey, 'isMongoId:', isMongoId); // Debug log

          const response = await axios.delete(
            `${API_BASE}/api/admin/financial/transactions/${transactionKey}`, 
            { headers: authHeaders() }
          );
          
          console.log('Delete response:', response.data); // Debug log
          
          message.success('Transaction deleted successfully!');
          setSelectedRowKeys((prev) => prev.filter((key) => key !== transactionKey));
          fetchDashboard();
          fetchTransactions();
        } catch (error) {
          console.error('Delete error:', error.response || error); // Debug log
          message.error(
            error?.response?.data?.message || 
            'Failed to delete transaction'
          );
        }
      }
    });
  };

  // Handle Bulk Delete
  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select transactions to delete');
      return;
    }

    Modal.confirm({
      title: 'Delete Multiple Transactions',
      content: `Are you sure you want to delete ${selectedRowKeys.length} transaction(s)?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setDeleting(true);
          console.log('Bulk deleting IDs:', selectedRowKeys); // Debug log
          
          const uniqueKeys = Array.from(new Set(
            (selectedRowKeys || [])
              .filter((key) => key && key !== "undefined" && key !== "null")
              .map((key) => (typeof key === "string" ? key : String(key)))
          ));

          if (!uniqueKeys.length) {
            message.error('No valid transaction identifiers selected.');
            return;
          }

          const response = await axios.post(
            `${API_BASE}/api/admin/financial/transactions/bulk-delete`,
            { ids: uniqueKeys },
            { headers: authHeaders() }
          );
          
          console.log('Bulk delete response:', response.data); // Debug log
          
          message.success(`${uniqueKeys.length} transaction(s) deleted successfully!`);
          setSelectedRowKeys([]);
          fetchDashboard();
          fetchTransactions();
        } catch (error) {
          console.error('Bulk delete error:', error.response || error); // Debug log
          message.error(
            error?.response?.data?.message || 
            'Failed to delete transactions'
          );
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  // Open Edit Modal
  const openEditModal = (record) => {
    setEditTransaction(record);
    editForm.setFieldsValue({
      type: record.type,
      category: record.category,
      description: record.description,
      amount: record.amount,
      paymentMethod: record.paymentMethod,
      referenceNumber: record.referenceNumber
    });
    setEditOpen(true);
  };

  const columns = [
    {
      title: 'Transaction ID',
      dataIndex: 'transactionId',
      key: 'transactionId',
      width: 150
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color="blue">{type.replace('_', ' ').toUpperCase()}</Tag>
      ),
      filters: [
        { text: 'Garbage Fee', value: 'garbage_fee' },
        { text: 'Streetlight Fee', value: 'streetlight_fee' },
        { text: 'Document Request Fee', value: 'document_request_fee' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => {
        const color = category === 'revenue' ? 'green' : category === 'expense' ? 'red' : 'orange';
        return <Tag color={color}>{category.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `₱${Number(amount).toLocaleString()}`
    },
    {
      title: 'Resident',
      key: 'resident',
      render: (_, record) => {
        // Use stored name first, fallback to populated data
        if (record.residentName) return record.residentName;
        if (record.residentId) return `${record.residentId.firstName} ${record.residentId.lastName}`;
        return '-';
      }
    },
    {
      title: 'Official',
      key: 'official',
      render: (_, record) => {
        // Use stored name first, fallback to populated data
        if (record.officialName) return record.officialName;
        if (record.officialId) return `${record.officialId.firstName} ${record.officialId.lastName}`;
        return '-';
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'completed' ? 'green' : status === 'pending' ? 'orange' : 'red';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm')
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button 
            size="small" 
            onClick={() => { setViewTransaction(record); setViewOpen(true); }}
          >
            View
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>
          <Button
            size="small"
            danger
            onClick={() => handleDeleteTransaction(record)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  // Row selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      const sanitizedKeys = (selectedKeys || [])
        .filter((key) => key && key !== "undefined" && key !== "null")
        .map((key) => (typeof key === "string" ? key : String(key)));
      setSelectedRowKeys(sanitizedKeys);
    }
  };

  const filteredTransactions = transactions.filter(t =>
    [
      t.transactionId,
      t.description,
      t.type,
      t.category,
      t.residentId?.firstName,
      t.residentId?.lastName
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        {/* Navbar */}
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Financial Reports
              </span>
            </div>
            <div className="flex items-center outline-1 outline-offset-1 outline-slate-300 rounded-2xl p-5 gap-3">
              <UserOutlined className="text-2xl text-blue-600" />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-gray-700">{userProfile.fullName || "Administrator"}</span>
                <span className="text-xs text-gray-500">{username}</span>
              </div>
            </div>
          </nav>

          {/* Statistics Section */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Revenue
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    ₱{totalRevenue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Expenses
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    ₱{totalExpenses.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Net Income
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₱{netIncome.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Allocations
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <PieChart className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    ₱{totalAllocations.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row flex-wrap gap-2 md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
                className="min-w-[200px]"
              />
              <Select
                placeholder="Filter by type"
                allowClear
                style={{ width: 150 }}
                onChange={(value) => setFilters({...filters, type: value})}
              >
                <Select.Option value="document_fee">Document Fee</Select.Option>
                <Select.Option value="garbage_fee">Garbage Fee</Select.Option>
                <Select.Option value="electric_fee">Electric Fee</Select.Option>
                <Select.Option value="permit_fee">Permit Fee</Select.Option>
                <Select.Option value="other">Other</Select.Option>
              </Select>
              <Select
                placeholder="Filter by category"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => setFilters({...filters, category: value})}
              >
                <Select.Option value="revenue">Revenue</Select.Option>
                <Select.Option value="expense">Expense</Select.Option>
                <Select.Option value="allocation">Allocation</Select.Option>
              </Select>
              {/* ADD STATUS FILTER */}
              <Select
                placeholder="Filter by status"
                allowClear
                style={{ width: 150 }}
                value={filters.status}
                onChange={(value) => {
                  setFilters({...filters, status: value});
                  // Trigger refetch when status changes
                  setTimeout(() => fetchTransactions(), 100);
                }}
              >
                <Select.Option value="completed">Completed</Select.Option>
                <Select.Option value="pending">Pending</Select.Option>
                <Select.Option value="cancelled">Cancelled</Select.Option>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* ADD THIS BULK DELETE BUTTON */}
              {selectedRowKeys.length > 0 && (
                <Button 
                  danger
                  loading={deleting}
                  onClick={handleBulkDelete}
                  icon={<DeleteOutlined />}
                >
                  Delete Selected ({selectedRowKeys.length})
                </Button>
              )}
              <Button 
                icon={<SyncOutlined />} 
                loading={syncing}
                onClick={handleSyncDocumentFees}
              >
                Sync Document Fees
              </Button>
              <Button 
                icon={<FileTextOutlined />}
                onClick={() => setReportOpen(true)}
              >
                Generate Report
              </Button>
              <Button 
                type="primary"
                onClick={() => setCreateOpen(true)}
              >
                Add Transaction
              </Button>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-50 rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-black">Revenue by Type</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 300 }}>
                {dashboardData.revenues?.length > 0 ? (
                  <Pie data={revenueChartData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">No revenue data available</div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-50 rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-black">Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 300 }}>
                {dashboardData.monthlyTrends?.length > 0 ? (
                  <Line data={monthlyTrendData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">No trend data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transactions Table Section */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <Card className="bg-slate-50 rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-black">Financial Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Input.Search
                  placeholder="Search transactions..."
                  allowClear
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-w-[180px] max-w-xs"
                />
                <Button
                  loading={exporting}
                  onClick={handleExportData}
                >
                  Export to Excel
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table
                  columns={columns}
                  dataSource={filteredTransactions}
                  loading={loading}
                  rowSelection={rowSelection}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1400 }}
                  size="small"
                  rowKey={(record) => record.__rowKey ?? record._id ?? getTransactionKey(record)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Transaction Modal */}
        <Modal
          title="Add Financial Transaction"
          open={createOpen}
          onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
          onOk={handleCreateTransaction}
          confirmLoading={creating}
          width={700}
        >
          <Form form={createForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="type" label="Transaction Type" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="document_fee">Document Fee</Select.Option>
                    <Select.Option value="garbage_fee">Garbage Fee</Select.Option>
                    <Select.Option value="electric_fee">Electric Fee</Select.Option>
                    <Select.Option value="permit_fee">Permit Fee</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="revenue">Revenue</Select.Option>
                    <Select.Option value="expense">Expense</Select.Option>
                    <Select.Option value="allocation">Allocation</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {/* NEW: Add Resident and Official selectors */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="residentId" label="Resident (Optional)">
                  <Select
                    showSearch
                    allowClear
                    placeholder="Select resident"
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {residents.map(r => (
                      <Select.Option key={r._id} value={r._id}>
                        {r.firstName} {r.lastName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="officialId" label="Official (Optional)">
                  <Select
                    showSearch
                    allowClear
                    placeholder="Select official"
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {officials.map(o => (
                      <Select.Option key={o._id} value={o._id}>
                        {o.firstName} {o.lastName} - {o.position}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="Description" rules={[{ required: true }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                  <Input type="number" prefix="₱" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="paymentMethod" label="Payment Method">
                  <Select>
                    <Select.Option value="cash">Cash</Select.Option>
                    <Select.Option value="gcash">GCash</Select.Option>
                    <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="referenceNumber" label="Reference Number">
              <Input />
            </Form.Item>
          </Form>
        </Modal>

        {/* View Transaction Modal */}
        <Modal
          title="Transaction Details"
          open={viewOpen}
          onCancel={() => setViewOpen(false)}
          footer={null}
          width={700}
        >
          {viewTransaction && (
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Transaction ID">{viewTransaction.transactionId}</Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color="blue">{viewTransaction.type.replace('_', ' ').toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                <Tag color={viewTransaction.category === 'revenue' ? 'green' : 'red'}>
                  {viewTransaction.category.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Description">{viewTransaction.description}</Descriptions.Item>
              <Descriptions.Item label="Amount">₱{Number(viewTransaction.amount).toLocaleString()}</Descriptions.Item>
              
              {/* NEW: Show resident name */}
              <Descriptions.Item label="Resident">
                {viewTransaction.residentName || 
                 (viewTransaction.residentId ? `${viewTransaction.residentId.firstName} ${viewTransaction.residentId.lastName}` : '-')}
              </Descriptions.Item>
              
              {/* NEW: Show official name */}
              <Descriptions.Item label="Official">
                {viewTransaction.officialName || 
                 (viewTransaction.officialId ? `${viewTransaction.officialId.firstName} ${viewTransaction.officialId.lastName}` : '-')}
              </Descriptions.Item>
              
              <Descriptions.Item label="Payment Method">{viewTransaction.paymentMethod}</Descriptions.Item>
              <Descriptions.Item label="Reference Number">{viewTransaction.referenceNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={viewTransaction.status === 'completed' ? 'green' : 'orange'}>
                  {viewTransaction.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Transaction Date">
                {dayjs(viewTransaction.transactionDate).format('MMMM DD, YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Blockchain Hash">
                {viewTransaction.blockchain?.hash || 'Not recorded'}
              </Descriptions.Item>
              <Descriptions.Item label="Blockchain Verified">
                {viewTransaction.blockchain?.verified ? 
                  <Tag color="green">Yes</Tag> : 
                  <Tag color="orange">Pending</Tag>
                }
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        {/* Generate Report Modal */}
        <Modal
          title="Generate Financial Report"
          open={reportOpen}
          onCancel={() => { setReportOpen(false); reportForm.resetFields(); }}
          onOk={generateReport}
          width={500}
        >
          <Form form={reportForm} layout="vertical">
            <Form.Item name="reportType" label="Report Type" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="summary">Summary Report</Select.Option>
                <Select.Option value="detailed">Detailed Report</Select.Option>
                <Select.Option value="allocation">Allocation Report</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="dateRange" label="Date Range" rules={[{ required: true }]}>
              <RangePicker className="w-full" />
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit Transaction Modal */}
        <Modal
          title="Edit Financial Transaction"
          open={editOpen}
          onCancel={() => { 
            setEditOpen(false); 
            editForm.resetFields(); 
            setEditTransaction(null);
          }}
          onOk={handleEditTransaction}
          confirmLoading={creating}
          width={700}
        >
          <Form form={editForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="type" label="Transaction Type" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="document_fee">Document Fee</Select.Option>
                    <Select.Option value="garbage_fee">Garbage Fee</Select.Option>
                    <Select.Option value="electric_fee">Electric Fee</Select.Option>
                    <Select.Option value="permit_fee">Permit Fee</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="revenue">Revenue</Select.Option>
                    <Select.Option value="expense">Expense</Select.Option>
                    <Select.Option value="allocation">Allocation</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {/* NEW: Add Resident and Official selectors */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="residentId" label="Resident (Optional)">
                  <Select
                    showSearch
                    allowClear
                    placeholder="Select resident"
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {residents.map(r => (
                      <Select.Option key={r._id} value={r._id}>
                        {r.firstName} {r.lastName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="officialId" label="Official (Optional)">
                  <Select
                    showSearch
                    allowClear
                    placeholder="Select official"
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {officials.map(o => (
                      <Select.Option key={o._id} value={o._id}>
                        {o.firstName} {o.lastName} - {o.position}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="Description" rules={[{ required: true }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                  <Input type="number" prefix="₱" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="paymentMethod" label="Payment Method">
                  <Select>
                    <Select.Option value="cash">Cash</Select.Option>
                    <Select.Option value="gcash">GCash</Select.Option>
                    <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="referenceNumber" label="Reference Number">
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}