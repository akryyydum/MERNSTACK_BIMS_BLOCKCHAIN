import React, { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Form, Select, message, Tag, Descriptions, DatePicker, Row, Col, Tabs, Popconfirm } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, DollarSign, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { UserOutlined, SyncOutlined, FileTextOutlined, BarChartOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
// Charts removed: react-chartjs-2 and chart.js imports not needed after removing charts section

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
  const [exportOpen, setExportOpen] = useState(false);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [editTransaction, setEditTransaction] = useState(null);
  
  // Forms
  const [createForm] = Form.useForm();
  const [reportForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [exportForm] = Form.useForm();
  
  // Export state
  const [selectedExportType, setSelectedExportType] = useState(null);
  const [selectedExportTypes, setSelectedExportTypes] = useState([]);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonths, setSelectedMonths] = useState([]);
  
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
      
      // Get form values
      const values = await exportForm.validateFields();
      const { exportTypes, months, documentTypes } = values;
      
      // Filter transactions based on selected fee types (multiple)
      let filteredData = transactions;
      
      // Filter by transaction types (skip if "all" is selected)
      if (exportTypes && exportTypes.length > 0 && !exportTypes.includes('all')) {
        filteredData = filteredData.filter(t => {
          // Map export types to transaction types
          const typeMatches = exportTypes.some(exportType => {
            if (exportType === 'garbage_fees') return t.type === 'garbage_fee';
            if (exportType === 'streetlight_fees') return t.type === 'streetlight_fee';
            if (exportType === 'electric_fees') return t.type === 'electric_fee';
            if (exportType === 'permit_fees') return t.type === 'permit_fee';
            if (exportType === 'document_request_fees') {
              // If specific document types are selected
              if (documentTypes && documentTypes.length > 0) {
                return t.type === 'document_fee' && documentTypes.some(docType => {
                  const desc = t.description?.toLowerCase() || '';
                  if (docType === 'certificate_of_indigency') {
                    return desc.includes('indigency') || desc.includes('certificate of indigency');
                  }
                  if (docType === 'barangay_clearance') {
                    return desc.includes('barangay clearance') || desc.includes('brgy clearance');
                  }
                  if (docType === 'business_clearance') {
                    return desc.includes('business clearance') || desc.includes('bus clearance');
                  }
                  return false;
                });
              }
              // If no specific document types, include all document fees
              return t.type === 'document_fee';
            }
            if (exportType === 'other') return t.type === 'other';
            return false;
          });
          return typeMatches;
        });
      }
      
      // Filter by months (skip if "all" is selected)
      if (months && months.length > 0 && !months.includes('all')) {
        filteredData = filteredData.filter(t => {
          const transactionMonth = dayjs(t.transactionDate).format('YYYY-MM');
          return months.includes(transactionMonth);
        });
      }
      
      if (filteredData.length === 0) {
        message.warning('No transactions found with the selected filters');
        setExporting(false);
        return;
      }
      
      const excelData = filteredData.map(t => ({
        'Transaction ID': t.transactionId,
        'Type': t.type,
        'Category': t.category,
        'Description': t.description,
        'Amount': t.amount,
        'Resident': t.residentName || (t.residentId ? `${t.residentId.firstName} ${t.residentId.lastName}` : (t.resident || '-')),
        'Payment Method': t.paymentMethod,
        'Status': t.status,
        'Date': dayjs(t.transactionDate).format('YYYY-MM-DD HH:mm'),
        'Month': dayjs(t.transactionDate).format('MMMM YYYY')
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-fit columns
      const colWidths = Object.keys(excelData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Financial_Transactions');
      
      const typesText = (exportTypes?.includes('all') || !exportTypes?.length) ? 'all_types' : exportTypes.join('_');
      const monthsText = (months?.includes('all') || !months?.length) ? 'all_months' : months.map(m => dayjs(m).format('MMM_YYYY')).join('_');
      const filename = `Financial_Report_${typesText}_${monthsText}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      message.success(`Financial report exported successfully! (${filteredData.length} transactions)`);
      setExportOpen(false);
      exportForm.resetFields();
      setSelectedExportTypes([]);
      setSelectedMonths([]);
    } catch (error) {
      console.error('Export error:', error);
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
  // Removed monthlyTrends usage since Monthly Trends chart is removed

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

  // Chart data removed (Revenue by Type and Monthly Trends)

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
  const handleDeleteTransaction = async (record) => {
    try {
      setDeleting(true);
      
      console.log('Full record object:', record);
      console.log('record._id:', record._id);
      console.log('All record keys:', Object.keys(record));
      
      // For utility payments, the _id is composite like "garbage_MONGOID_INDEX"
      // We need to extract the actual MongoDB ID from it
      let mongoId = record._id;
      
      // Check if it's a composite ID (utility payment format)
      if (typeof mongoId === 'string' && mongoId.includes('_')) {
        // Split by underscore and get the middle part (the actual MongoDB ID)
        const parts = mongoId.split('_');
        if (parts.length >= 2) {
          // The MongoDB ID is the second part (index 1)
          mongoId = parts[1];
          console.log('Extracted MongoDB ID from composite:', mongoId);
        }
      }

      if (!mongoId) {
        message.error('Missing transaction ID. Please refresh and try again.');
        setDeleting(false);
        return;
      }   

      // Validate it's a proper MongoDB ObjectId (24 hex characters)
      if (!objectIdRegex.test(mongoId)) {
        console.error('Invalid MongoDB ID format:', mongoId);
        message.error('Invalid transaction ID format. Cannot delete.');
        setDeleting(false);
        return;
      }

      console.log('Deleting transaction with MongoDB _id:', mongoId);

      const response = await axios.delete(
        `${API_BASE}/api/admin/financial/transactions/${mongoId}`, 
        { headers: authHeaders() }
      );
      
      console.log('Delete response:', response.data);
      
      message.success('Transaction deleted successfully!');
      setSelectedRowKeys((prev) => prev.filter((key) => key !== record._id));
      await fetchDashboard();
      await fetchTransactions();
    } catch (error) {
      console.error('Delete error:', error.response || error);
      message.error(
        error?.response?.data?.message || 
        'Failed to delete transaction'
      );
    } finally {
      setDeleting(false);
    }
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
      paymentMethod: record.paymentMethod || 'Cash',
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
        { text: 'Electric Fee', value: 'electric_fee' },
        { text: 'Document Fee', value: 'document_fee' },
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
        if (record.resident) return record.resident; // synthesized utility payment field
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
          <Popconfirm
            title="Delete Transaction"
            description={`Are you sure you want to delete transaction ${record.transactionId}?`}
            onConfirm={() => handleDeleteTransaction(record)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              loading={deleting}
            >
              Delete
            </Button>
          </Popconfirm>
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
      t.residentId?.lastName,
      t.residentName,
      t.resident
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
                <Select.Option value="streetlight_fee">Streetlight Fee</Select.Option>
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

        {/* Charts Section removed as requested: Revenue by Type and Monthly Trends */}

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
                  onClick={() => setExportOpen(true)}
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

        {/* Export Modal */}
        <Modal
          title="Export Financial Report to Excel"
          open={exportOpen}
          onCancel={() => { 
            setExportOpen(false); 
            exportForm.resetFields(); 
            setSelectedExportTypes([]);
            setSelectedYear(dayjs().year());
            setSelectedMonths([]);
          }}
          onOk={handleExportData}
          okText="Export"
          confirmLoading={exporting}
          width={600}
        >
          <Form 
            form={exportForm} 
            layout="vertical"
            initialValues={{ 
              exportTypes: ['all'],
              year: dayjs().year(),
              months: ['all']
            }}
          >
            <Form.Item 
              name="exportTypes" 
              label="Select Fee Types (Multiple Selection)" 
              rules={[{ required: true, message: "Please select at least one fee type" }]}
            >
              <Select
                mode="multiple"
                placeholder="Choose fee types to export"
                onChange={(values) => {
                  setSelectedExportTypes(values);
                  
                  // If "All" is selected with other options, keep only "All"
                  if (values.includes('all') && values.length > 1) {
                    const allIndex = values.indexOf('all');
                    // If "All" was just added, clear others and keep only "All"
                    if (allIndex === values.length - 1) {
                      exportForm.setFieldsValue({ exportTypes: ['all'] });
                      setSelectedExportTypes(['all']);
                    } else {
                      // If other option was added after "All", remove "All"
                      const filtered = values.filter(v => v !== 'all');
                      exportForm.setFieldsValue({ exportTypes: filtered });
                      setSelectedExportTypes(filtered);
                    }
                  }
                  
                  // Clear document types if document_request_fees is not selected
                  const currentValues = exportForm.getFieldValue('exportTypes');
                  if (!currentValues?.includes('document_request_fees') && !currentValues?.includes('all')) {
                    exportForm.setFieldsValue({ documentTypes: [] });
                  }
                }}
                maxTagCount="responsive"
              >
                <Select.Option value="all">All</Select.Option>
                <Select.Option value="garbage_fees">Garbage Fees</Select.Option>
                <Select.Option value="streetlight_fees">Streetlight Fees</Select.Option>
                <Select.Option value="electric_fees">Electric Fees</Select.Option>
                <Select.Option value="permit_fees">Permit Fees</Select.Option>
                <Select.Option value="document_request_fees">Document Request Fees</Select.Option>
                <Select.Option value="other">Other</Select.Option>
              </Select>
            </Form.Item>
            
            {selectedExportTypes.includes('document_request_fees') && (
              <Form.Item 
                name="documentTypes" 
                label="Select Document Types (Optional - Multiple Selection)"
              >
                <Select 
                  mode="multiple" 
                  placeholder="Choose specific document types or leave empty for all"
                  maxTagCount="responsive"
                >
                  <Select.Option value="certificate_of_indigency">Certificate of Indigency</Select.Option>
                  <Select.Option value="barangay_clearance">Barangay Clearance</Select.Option>
                  <Select.Option value="business_clearance">Business Clearance</Select.Option>
                </Select>
              </Form.Item>
            )}
            
            <Form.Item 
              name="year" 
              label="Select Year" 
              rules={[{ required: true, message: "Please select a year" }]}
            >
              <Select
                placeholder="Choose year"
                onChange={(value) => {
                  setSelectedYear(value);
                  // Reset months when year changes
                  exportForm.setFieldsValue({ months: ['all'] });
                  setSelectedMonths(['all']);
                }}
              >
                {/* Generate years from 2020 to current year + 1 */}
                {Array.from({ length: dayjs().year() - 2019 + 1 }, (_, i) => {
                  const year = dayjs().year() + 1 - i;
                  return (
                    <Select.Option key={year} value={year}>
                      {year}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
            
            <Form.Item 
              name="months" 
              label="Select Months (Multiple Selection)" 
              rules={[{ required: true, message: "Please select at least one month" }]}
            >
              <Select
                mode="multiple"
                placeholder="Choose months to export"
                onChange={(values) => {
                  // If "All" is selected with other options, keep only "All"
                  if (values.includes('all') && values.length > 1) {
                    const allIndex = values.indexOf('all');
                    // If "All" was just added, clear others and keep only "All"
                    if (allIndex === values.length - 1) {
                      exportForm.setFieldsValue({ months: ['all'] });
                      setSelectedMonths(['all']);
                    } else {
                      // If other option was added after "All", remove "All"
                      const filtered = values.filter(v => v !== 'all');
                      exportForm.setFieldsValue({ months: filtered });
                      setSelectedMonths(filtered);
                    }
                  } else {
                    setSelectedMonths(values);
                  }
                }}
                maxTagCount="responsive"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                <Select.Option value="all">✨ All Months</Select.Option>
                {/* Generate months for selected year */}
                {Array.from({ length: 12 }, (_, i) => {
                  const month = dayjs().year(selectedYear).month(i);
                  const monthValue = month.format('YYYY-MM');
                  return (
                    <Select.Option 
                      key={monthValue} 
                      value={monthValue}
                    >
                      {month.format('MMMM YYYY')}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
            
            <div className="text-sm text-gray-500 mt-4 p-3 bg-blue-50 rounded">
              <p><strong>📊 Export Information:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Default:</strong> "All" options export entire financial transactions</li>
                <li>Select a year first, then choose specific months for that year</li>
                <li>Select specific types and months for filtered exports</li>
                <li>Selecting "All" with other options will keep only "All"</li>
                <li>Export includes: Transaction ID, Type, Category, Description, Amount, Resident Info, Payment Method, Status, Date, and Month</li>
              </ul>
            </div>
          </Form>
        </Modal>

        {/* Create Transaction Modal */}
        <Modal
          title="Add Financial Transaction"
          open={createOpen}
          onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
          onOk={handleCreateTransaction}
          confirmLoading={creating}
          width={700}
        >
          <Form form={createForm} layout="vertical" initialValues={{ paymentMethod: 'Cash' }}>
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
                  <Input value="Cash" disabled />
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
                 (viewTransaction.residentId ? `${viewTransaction.residentId.firstName} ${viewTransaction.residentId.lastName}` : (viewTransaction.resident || '-'))}
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
                  <Input value="Cash" disabled />
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