import React, { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Form, Select, message, Tag, Descriptions, Row, Col, Popconfirm, Alert } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";
import { UserOutlined, FileTextOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

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
  const [feeTypeFilter, setFeeTypeFilter] = useState(null);
  const [filters, setFilters] = useState({});
  
  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [editTransaction, setEditTransaction] = useState(null);
  
  // Forms
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [exportForm] = Form.useForm();
  // Watchers for dynamic form behavior
  const selectedCreateType = Form.useWatch('type', createForm);
  const selectedEditType = Form.useWatch('type', editForm);
  
  // Export state
  const [selectedExportTypes, setSelectedExportTypes] = useState([]);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonths, setSelectedMonths] = useState([]);
  
  // Loading states
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [exportHasData, setExportHasData] = useState(true);

  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [residents, setResidents] = useState([]);
  const [officials, setOfficials] = useState([]);
  // Blockchain maps/state
  const [blockchainFinanceMap, setBlockchainFinanceMap] = useState({});
  const [blockchainRequestsSet, setBlockchainRequestsSet] = useState(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchDashboard();
    fetchTransactions();
    fetchResidents();
    fetchOfficials();
  }, [filters]);

  // Initial blockchain data fetch (independent of filters)
  useEffect(() => {
    fetchBlockchainFinance();
    fetchBlockchainRequests();
  }, []);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, feeTypeFilter]);

  // Validate export data availability when modal opens
  useEffect(() => {
    if (!exportOpen) return;

    const validateExportData = () => {
      const formValues = exportForm.getFieldsValue();
      const { exportTypes, months } = formValues;

      // Check if there are any transactions matching the filters
      if (transactions && transactions.length > 0) {
        setExportHasData(true);
      } else {
        setExportHasData(false);
      }
    };

    validateExportData();
  }, [exportOpen, transactions, exportForm]);

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
      const res = await axios.get(`${API_BASE}/api/admin/financial/dashboard`, {
        headers: authHeaders()
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
      console.log('Fetching transactions');

      const res = await axios.get(
        `${API_BASE}/api/admin/financial/transactions`,
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
      // Reset to first page when data is refreshed
      setCurrentPage(1);
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
      // Backend returns a plain array (controller.list => res.json(residents))
      // Support both shapes: [ {...} ] or { residents: [ {...} ] }
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : (Array.isArray(data?.residents) ? data.residents : []);
      setResidents(list);
      if (!list.length) {
        console.warn('fetchResidents: received empty list. Raw response:', data);
      }
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

  // On-chain financial transactions
  const fetchBlockchainFinance = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/blockchain/financial-transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      const map = {};
      arr.forEach(tx => { if (tx.txId) map[tx.txId] = tx; });
      setBlockchainFinanceMap(map);
    } catch (err) {
      console.warn('Blockchain finance fetch failed:', err?.response?.data || err.message);
    }
  };

  // On-chain document requests (used for document_request transactions verification)
  const fetchBlockchainRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/blockchain/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      const set = new Set();
      arr.forEach(r => { if (r.requestId) set.add(r.requestId); });
      setBlockchainRequestsSet(set);
    } catch (err) {
      console.warn('Blockchain requests fetch failed:', err?.response?.data || err.message);
    }
  };

  const handleCreateTransaction = async () => {
    try {
      setCreating(true);
      const values = await createForm.validateFields();
      // Inject custom type description for 'other'
      if (values.type === 'other') {
        if (!values.customType || !values.customType.trim()) {
          message.error('Please specify the custom transaction type');
          setCreating(false);
          return;
        }
        // Prefix description with custom type for clarity if not already
        if (!values.description || !values.description.trim()) {
          values.description = values.customType.trim();
        } else if (!values.description.toLowerCase().startsWith(values.customType.toLowerCase())) {
          values.description = `${values.customType.trim()} - ${values.description.trim()}`;
        }
        // Remove helper field before sending
        delete values.customType;
      }
      // Default category to 'revenue' if not provided (should be provided)
      if (!values.category) values.category = 'revenue';
      // Normalize paymentMethod capitalization to match backend enum
      if (values.paymentMethod) {
        const pm = values.paymentMethod;
        if (pm === 'gcash') values.paymentMethod = 'Gcash';
        if (pm === 'bank_transfer') values.paymentMethod = 'Bank_transfer';
        if (pm === 'cash') values.paymentMethod = 'Cash';
        if (pm === 'other') values.paymentMethod = 'Other';
      }
      
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
        'Description': t.description,
        'Amount': t.amount,
        'Resident': t.residentName || (t.residentId ? `${t.residentId.firstName} ${t.residentId.lastName}` : (t.resident || '-')),
        'Payment Method': t.paymentMethod,
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



  const statistics = dashboardData.statistics || {};
  const revenueByType = dashboardData.revenueByType || {};
  
  // Calculate individual revenue types from revenueByType
  const documentRequestRevenue = Number(revenueByType.document_request || 0);
  const documentFeeRevenue = Number(revenueByType.document_fee || 0);
  const garbageFeeRevenue = Number(revenueByType.garbage_fee || 0);
  const streetlightFeeRevenue = Number(revenueByType.streetlight_fee || 0);
  const totalRevenue = Number(statistics.totalRevenue ?? 0);

  const handleEditTransaction = async () => {
    try {
      setCreating(true);
      const values = await editForm.validateFields();
      if (values.type === 'other' && values.customType) {
        if (!values.description || !values.description.trim()) {
          values.description = values.customType.trim();
        } else if (!values.description.toLowerCase().startsWith(values.customType.toLowerCase())) {
          values.description = `${values.customType.trim()} - ${values.description.trim()}`;
        }
        delete values.customType;
      }
      if (values.paymentMethod) {
        const pm = values.paymentMethod;
        if (pm === 'gcash') values.paymentMethod = 'Gcash';
        if (pm === 'bank_transfer') values.paymentMethod = 'Bank_transfer';
        if (pm === 'cash') values.paymentMethod = 'Cash';
        if (pm === 'other') values.paymentMethod = 'Other';
      }
      
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
  const handleDeleteResidentTransactions = async (record) => {
    try {
      setDeletingId(record.__rowKey);
      
      let successCount = 0;
      let failCount = 0;

      // Delete each transaction individually based on its type
      for (const tx of record.transactions) {
        try {
          let mongoId = tx.mongoId || tx._id;
          let paymentIndex = tx.paymentIndex;
          
          // Handle composite IDs
          if (typeof mongoId === 'string' && mongoId.includes('_')) {
            const parts = mongoId.split('_');
            
            if (parts.length === 3 && (parts[0] === 'garbage' || parts[0] === 'streetlight')) {
              // Utility payment with index: type_mongoId_index
              mongoId = parts[1];
              if (paymentIndex === undefined) {
                paymentIndex = parseInt(parts[2]);
              }
            } else if (parts.length === 2) {
              // Simple prefix format: type_mongoId (e.g., document_mongoId)
              mongoId = parts[1];
            }
          }

          if (!mongoId || !objectIdRegex.test(mongoId)) {
            console.warn('Skipping invalid transaction ID:', tx);
            failCount++;
            continue;
          }

          // Build URL with paymentIndex query param if it's a utility payment
          let deleteUrl = `${API_BASE}/api/admin/financial/transactions/${mongoId}`;
          if (tx.isUtilityPayment && paymentIndex !== undefined && !isNaN(paymentIndex)) {
            deleteUrl += `?paymentIndex=${paymentIndex}`;
          }

          await axios.delete(deleteUrl, { headers: authHeaders() });
          successCount++;
        } catch (error) {
          console.error('Error deleting transaction:', tx, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        message.success(`Successfully deleted ${successCount} transaction(s) for ${record.residentName}${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        await fetchDashboard();
        await fetchTransactions();
      } else {
        message.error('Failed to delete any transactions');
      }
    } catch (error) {
      console.error('Delete resident transactions error:', error);
      message.error(error?.response?.data?.message || 'Failed to delete transactions');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteTransaction = async (record) => {
    try {
      setDeletingId(record.__rowKey || record._id);
      
      console.log('Full record object:', record);
      console.log('record._id:', record._id);
      console.log('record.mongoId:', record.mongoId);
      console.log('record.paymentIndex:', record.paymentIndex);
      console.log('record.isUtilityPayment:', record.isUtilityPayment);
      
      // Priority order: use mongoId if available, otherwise extract from _id
      let mongoId = record.mongoId || record._id;
      let paymentIndex = record.paymentIndex;
      
      // Check if this is a composite ID (utility payment or other prefixed format)
      if (typeof mongoId === 'string' && mongoId.includes('_')) {
        const parts = mongoId.split('_');
        
        // Handle different composite ID formats:
        // 1. "garbage_MONGOID_INDEX" or "streetlight_MONGOID_INDEX" (utility payments with index)
        // 2. "document_MONGOID" (document fees without index)
        // 3. Other formats
        
        if (parts.length === 3 && (parts[0] === 'garbage' || parts[0] === 'streetlight')) {
          // Utility payment with index: type_mongoId_index
          mongoId = parts[1];
          if (paymentIndex === undefined) {
            paymentIndex = parseInt(parts[2]);
          }
          console.log('Extracted utility payment - MongoDB ID:', mongoId, 'Payment Index:', paymentIndex);
        } else if (parts.length === 2) {
          // Simple prefix format: type_mongoId (e.g., document_mongoId)
          mongoId = parts[1];
          console.log('Extracted from prefixed ID - MongoDB ID:', mongoId);
        } else {
          console.warn('Unknown composite ID format:', mongoId);
        }
      }

      if (!mongoId) {
        message.error('Missing transaction ID. Please refresh and try again.');
        setDeletingId(null);
        return;
      }   

      // Validate it's a proper MongoDB ObjectId (24 hex characters)
      if (!objectIdRegex.test(mongoId)) {
        console.error('Invalid MongoDB ID format:', mongoId);
        message.error('Invalid transaction ID format. Cannot delete.');
        setDeletingId(null);
        return;
      }

      console.log('Deleting transaction with MongoDB _id:', mongoId);

      // Build URL with paymentIndex query param if it's a utility payment
      let deleteUrl = `${API_BASE}/api/admin/financial/transactions/${mongoId}`;
      if (record.isUtilityPayment && paymentIndex !== undefined && !isNaN(paymentIndex)) {
        deleteUrl += `?paymentIndex=${paymentIndex}`;
        console.log('Adding paymentIndex to delete URL:', paymentIndex);
      }

      const response = await axios.delete(deleteUrl, { headers: authHeaders() });
      
      console.log('Delete response:', response.data);
      
      message.success('Transaction deleted successfully!');
      setSelectedRowKeys((prev) => prev.filter((key) => key !== record.__rowKey));
      await fetchDashboard();
      await fetchTransactions();
    } catch (error) {
      console.error('Delete error:', error.response || error);
      message.error(
        error?.response?.data?.message || 
        'Failed to delete transaction'
      );
    } finally {
      setDeletingId(null);
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

  // Pagination change handler
  const handleTableChange = (pagination, filters, sorter) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // Open Edit Modal
  const openEditModal = (record) => {
    setEditTransaction(record);
    editForm.setFieldsValue({
      type: record.type,
      description: record.description,
      amount: record.amount,
      category: record.category || 'revenue',
      paymentMethod: (record.paymentMethod || 'Cash').toLowerCase() === 'cash' ? 'cash'
        : (record.paymentMethod || '').toLowerCase() === 'gcash' ? 'gcash'
        : (record.paymentMethod || '').toLowerCase() === 'bank_transfer' ? 'bank_transfer'
        : (record.paymentMethod || '').toLowerCase() === 'other' ? 'other' : 'cash',
      referenceNumber: record.referenceNumber
    });
    setEditOpen(true);
  };

  const columns = [
    {
      title: 'Resident Name',
      dataIndex: 'residentName',
      key: 'residentName',
      width: 200,
      render: (text, record) => (
        <span className="font-semibold">{text}</span>
      )
    },
    {
      title: 'Total Transactions',
      dataIndex: 'transactionCount',
      key: 'transactionCount',
      width: 150,
      render: (count) => (
        <Tag color="blue">{count} transaction{count !== 1 ? 's' : ''}</Tag>
      )
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 150,
      render: (amount) => (
        <span className="font-semibold text-green-600">₱{Number(amount).toLocaleString()}</span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <div className="flex gap-2">
          <span className="text-gray-500 text-xs">Expand to see details</span>
          {record.residentName !== 'No Resident' && (
            <Popconfirm
              title="Delete All Transactions"
              description={`Are you sure you want to delete all ${record.transactionCount} transaction(s) for ${record.residentName}?`}
              onConfirm={() => handleDeleteResidentTransactions(record)}
              okText="Yes, Delete All"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deletingId === record.__rowKey}
              >
                Delete All
              </Button>
            </Popconfirm>
          )}
        </div>
      )
    }
  ];

  // Expanded row columns (individual transactions)
  const expandedColumns = [
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
        { text: 'Document Request', value: 'document_request' },
        { text: 'Document Fee', value: 'document_fee' },
      ],
      onFilter: (value, record) => record.type === value,
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
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm')
    },
    {
      title: 'Blockchain',
      dataIndex: 'blockchainStatus',
      key: 'blockchainStatus',
      render: (status) => {
        const colorMap = { verified: 'green', edited: 'orange', deleted: 'red', pending: 'default' };
        const label = (status || 'pending').toString().toUpperCase();
        return <Tag color={colorMap[status] || 'default'}>{label}</Tag>;
      }
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
              loading={deletingId === (record.__rowKey || record._id)}
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

  // Derive blockchain status for each transaction
  const deriveBlockchainStatus = (tx) => {
    if (tx.blockchain?.verified) return 'verified';
    if (tx.isUtilityPayment) return 'pending';
    if (tx.isDocumentRequest) {
      const match = blockchainRequestsSet.has(tx.referenceNumber) || blockchainRequestsSet.has(tx.transactionId);
      return match ? 'verified' : 'deleted';
    }
    const chainTx = blockchainFinanceMap[tx._id] || blockchainFinanceMap[tx.transactionId];
    if (!chainTx) return 'deleted';
    const amountMatch = Number(chainTx.amount) === Number(tx.amount);
    const descMatch = (chainTx.description || '').toLowerCase() === (tx.description || '').toLowerCase();
    return (amountMatch && descMatch) ? 'verified' : 'edited';
  };

  const enrichedTransactions = transactions.map(t => ({ ...t, blockchainStatus: deriveBlockchainStatus(t) }));

  const filteredTransactions = enrichedTransactions.filter(t => {
    // Search filter
    const matchesSearch = [
      t.transactionId,
      t.description,
      t.type,
      t.residentId?.firstName,
      t.residentId?.lastName,
      t.residentName,
      t.resident
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase());
    
    // Fee type filter
    const matchesFeeType = !feeTypeFilter || t.type === feeTypeFilter;
    
    return matchesSearch && matchesFeeType;
  });

  // Group transactions by resident for expandable table
  const groupedTransactions = filteredTransactions.reduce((acc, transaction) => {
    const residentKey = transaction.residentName || 
                       (transaction.residentId ? `${transaction.residentId.firstName} ${transaction.residentId.lastName}` : 
                       (transaction.resident || 'No Resident'));
    
    if (!acc[residentKey]) {
      acc[residentKey] = {
        residentName: residentKey,
        transactions: [],
        totalAmount: 0,
        transactionCount: 0,
        __rowKey: `grouped_${residentKey.replace(/\s+/g, '_')}`
      };
    }
    
    acc[residentKey].transactions.push(transaction);
    acc[residentKey].totalAmount += Number(transaction.amount || 0);
    acc[residentKey].transactionCount += 1;
    
    return acc;
  }, {});

  const groupedData = Object.values(groupedTransactions);

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
          <div className="px-4 pb-1">
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
                  <div className="text-3xl font-bold text-black">
                    ₱{totalRevenue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Document Request Revenue
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <FileTextOutlined className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    ₱{documentFeeRevenue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Garbage Revenue
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    ₱{garbageFeeRevenue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Streetlight Revenue
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    ₱{streetlightFeeRevenue.toLocaleString()}
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
            </div>
          </div>
        </div>

        {/* Charts Section removed as requested: Revenue by Type and Monthly Trends */}

        {/* Transactions Table Section */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <hr className="border-t border-gray-300" />
          <div className="mb-4 flex flex-row justify-between items-center gap-2">
            <div className="flex gap-2 flex-grow">
              <div className="flex-shrink-0" style={{ width: '350px' }}>
                <Input.Search
                  allowClear
                  placeholder="Search for Resident"
                  onSearch={v => setSearch(v.trim())}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  enterButton
                />
              </div>
              <Select
                placeholder="Filter by Fee Type"
                allowClear
                value={feeTypeFilter}
                onChange={setFeeTypeFilter}
                style={{ width: 200 }}
                options={[
                  { label: 'Document Request', value: 'document_request' },
                  { label: 'Document Fee', value: 'document_fee' },
                  { label: 'Garbage Fee', value: 'garbage_fee' },
                  { label: 'Streetlight Fee', value: 'streetlight_fee' },
                ]}
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button 
                loading={exporting}
                onClick={() => setExportOpen(true)}
              >
                Export to Excel
              </Button>
              <Button 
                type="primary"
                onClick={() => setCreateOpen(true)}
              >
                Add Transaction
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              dataSource={groupedData}
              loading={loading}
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    columns={expandedColumns}
                    dataSource={record.transactions}
                    pagination={false}
                    rowKey={(tx) => tx.__rowKey ?? tx._id ?? getTransactionKey(tx)}
                    size="small"
                    className="ml-8"
                  />
                ),
                rowExpandable: (record) => record.transactions && record.transactions.length > 0,
              }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: groupedData.length,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} residents | Total Transactions: ${filteredTransactions.length}`,
                pageSizeOptions: ['10', '20', '50', '100'],
                defaultPageSize: 10,
              }}
              onChange={handleTableChange}
              scroll={{ x: 800 }}
              rowKey={(record) => record.__rowKey}
            />
          </div>
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
            setExportHasData(true);
          }}
          onOk={handleExportData}
          okText="Export"
          confirmLoading={exporting}
          okButtonProps={{ disabled: !exportHasData }}
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
                  
                  // Validate if there's data to export - check actual filtered transactions
                  let filteredData = transactions;
                  const currentExportTypes = exportForm.getFieldValue('exportTypes') || values;
                  
                  if (currentExportTypes && currentExportTypes.length > 0 && !currentExportTypes.includes('all')) {
                    filteredData = filteredData.filter(t => {
                      return currentExportTypes.some(exportType => {
                        if (exportType === 'garbage_fees') return t.type === 'garbage_fee';
                        if (exportType === 'streetlight_fees') return t.type === 'streetlight_fee';
                        if (exportType === 'document_request_fees') return t.type === 'document_fee';
                        if (exportType === 'other') return t.type === 'other';
                        return false;
                      });
                    });
                  }
                  
                  setExportHasData(filteredData && filteredData.length > 0);
                }}
                maxTagCount="responsive"
              >
                <Select.Option value="all">All</Select.Option>
                <Select.Option value="garbage_fees">Garbage Fees</Select.Option>
                <Select.Option value="streetlight_fees">Streetlight Fees</Select.Option>
                <Select.Option value="document_request_fees">Document Request Fees</Select.Option>
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
                <Select.Option value="all">All Months</Select.Option>
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
            
            {!exportHasData && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200 mb-3">
                <p className="font-semibold">No data matches the selected filters</p>
                <p className="text-xs mt-1">Please adjust your filter criteria to export data.</p>
              </div>
            )}
            
            <div className="text-sm text-gray-500 mt-4 p-3 bg-blue-50 rounded">
              <p><strong>Export Information:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Default:</strong> "All" options export entire financial transactions</li>
                <li>Select a year first, then choose specific months for that year</li>
                <li>Select specific types and months for filtered exports</li>
                <li>Selecting "All" with other options will keep only "All"</li>
                <li>Export includes: Transaction ID, Type, Description, Amount, Resident Info, Payment Method, Date, and Month</li>
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
          <Alert
            message="Add Financial Transaction"
            description="Record a new financial transaction by selecting the type, and amount. You can optionally link it to a resident or official and specify payment details."
            type="info"
            showIcon
            className="mb-4"
          />
          <div style={{ marginBottom: 16 }} />
          <Form form={createForm} layout="vertical" initialValues={{ paymentMethod: 'Cash', category: 'revenue' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="type" label="Transaction Type" rules={[{ required: true, message: 'Please select a transaction type' }]}> 
                  <Select placeholder="Select type">
                    <Select.Option value="document_fee">Document Fee</Select.Option>
                    <Select.Option value="garbage_fee">Garbage Fee</Select.Option>
                    <Select.Option value="streetlight_fee">Streetlight Fee</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select a category' }]}> 
                  <Select placeholder="Select category">
                    <Select.Option value="revenue">Revenue</Select.Option>
                    <Select.Option value="expense">Expense</Select.Option>
                    <Select.Option value="allocation">Allocation</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            {selectedCreateType === 'other' && (
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="customType" label="Specify Other Transaction Type" rules={[{ required: true, message: 'Please specify the transaction type' }]}> 
                    <Input placeholder="e.g. Maintenance Fee, Donation, Miscellaneous" />
                  </Form.Item>
                </Col>
              </Row>
            )}
            
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
                <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}> 
                  <Select placeholder="Select method">
                    <Select.Option value="cash">Cash</Select.Option>
                    <Select.Option value="gcash">GCash</Select.Option>
                    <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="referenceNumber" label="Reference Number">
              <Input placeholder="Enter reference number (optional)" />
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
              <Descriptions.Item label="Description">{viewTransaction.description}</Descriptions.Item>
              <Descriptions.Item label="Amount">₱{Number(viewTransaction.amount).toLocaleString()}</Descriptions.Item>

              <Descriptions.Item label="Resident">
                {viewTransaction.residentName || 
                 (viewTransaction.residentId ? `${viewTransaction.residentId.firstName} ${viewTransaction.residentId.lastName}` : (viewTransaction.resident || '-'))}
              </Descriptions.Item>  
              <Descriptions.Item label="Payment Method">{viewTransaction.paymentMethod}</Descriptions.Item>
              <Descriptions.Item label="Transaction Date">
                {dayjs(viewTransaction.transactionDate).format('MMMM DD, YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Blockchain Status">
                {(() => {
                  const status = viewTransaction.blockchainStatus || (viewTransaction.blockchain?.verified ? 'verified' : 'pending');
                  const colorMap = { verified: 'green', edited: 'orange', deleted: 'red', pending: 'default' };
                  return <Tag color={colorMap[status] || 'default'}>{status.toUpperCase()}</Tag>;
                })()}
              </Descriptions.Item>
            </Descriptions>
          )}
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
                  <Select placeholder="Select type">
                    <Select.Option value="document_fee">Document Fee</Select.Option>
                    <Select.Option value="garbage_fee">Garbage Fee</Select.Option>
                    <Select.Option value="streetlight_fee">Streetlight Fee</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="category" label="Category" rules={[{ required: true }]}> 
                  <Select placeholder="Select category">
                    <Select.Option value="revenue">Revenue</Select.Option>
                    <Select.Option value="expense">Expense</Select.Option>
                    <Select.Option value="allocation">Allocation</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            {selectedEditType === 'other' && (
              <Form.Item shouldUpdate noStyle>
                {() => (
                  <Form.Item name="customType" label="Specify Other Transaction Type" rules={[{ required: false }]}> 
                    <Input placeholder="Update custom type (optional)" />
                  </Form.Item>
                )}
              </Form.Item>
            )}
            
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
                <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}> 
                  <Select placeholder="Select method">
                    <Select.Option value="cash">Cash</Select.Option>
                    <Select.Option value="gcash">GCash</Select.Option>
                    <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="referenceNumber" label="Reference Number">
              <Input placeholder="Enter reference number (optional)" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}