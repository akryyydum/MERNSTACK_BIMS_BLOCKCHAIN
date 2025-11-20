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

// Helper function to format transaction type for display
const formatTransactionType = (type) => {
  if (!type) return '';
  // Handle legacy 'document_fee' by treating it as 'document_request'
  const normalizedType = type === 'document_fee' ? 'document_request' : type;
  return normalizedType.replace(/_/g, ' ').toUpperCase();
};

export default function AdminFinancialReports() {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({});
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
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
  const selectedCreateCategory = Form.useWatch('category', createForm);
  const selectedEditCategory = Form.useWatch('category', editForm);
  const selectedCreateDocType = Form.useWatch('documentType', createForm);
  const selectedEditDocType = Form.useWatch('documentType', editForm);
  const selectedCreateHasBusiness = Form.useWatch('hasBusiness', createForm);
  const selectedEditHasBusiness = Form.useWatch('hasBusiness', editForm);
  
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
  const [households, setHouseholds] = useState([]);
  // Officials removed: no longer recorded

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchDashboard();
    fetchTransactions();
    fetchResidents();
    fetchHouseholds();
  }, [filters]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, feeTypeFilter]);

  // Auto-set amount removed - garbage and streetlight fees are now manual input

  // Auto-populate description when document type is selected in create form
  useEffect(() => {
    if (selectedCreateType === 'document_request' && selectedCreateDocType) {
      const currentDesc = createForm.getFieldValue('description') || '';
      // Only auto-set if description is empty or starts with a document type prefix
      const docTypes = ['Certificate of Indigency', 'Barangay Clearance', 'Business Clearance'];
      const hasPrefix = docTypes.some(type => currentDesc.startsWith(type));
      if (!currentDesc || hasPrefix) {
        createForm.setFieldsValue({ description: `${selectedCreateDocType} - ` });
      }
    }
  }, [selectedCreateDocType]);

  // Auto-set amount removed - garbage and streetlight fees are now manual input

  // Auto-populate description when document type is selected in edit form
  useEffect(() => {
    if (selectedEditType === 'document_request' && selectedEditDocType) {
      const currentDesc = editForm.getFieldValue('description') || '';
      // Only auto-set if description is empty or starts with a document type prefix
      const docTypes = ['Certificate of Indigency', 'Barangay Clearance', 'Business Clearance'];
      const hasPrefix = docTypes.some(type => currentDesc.startsWith(type));
      if (!currentDesc || hasPrefix) {
        editForm.setFieldsValue({ description: `${selectedEditDocType} - ` });
      }
    }
  }, [selectedEditDocType]);

  // Validate export data availability when modal opens or form changes
  const validateExportData = () => {
    if (!exportOpen) return;

    const formValues = exportForm.getFieldsValue();
    const { exportTypes, months, documentTypes, year } = formValues;

    let filteredData = transactions || [];
    
    // Filter by transaction types
    if (exportTypes && exportTypes.length > 0 && !exportTypes.includes('all')) {
      filteredData = filteredData.filter(t => {
        return exportTypes.some(exportType => {
          if (exportType === 'garbage_fees') return t.type === 'garbage_fee';
          if (exportType === 'streetlight_fees') return t.type === 'streetlight_fee';
          if (exportType === 'document_request_fees') {
            if (documentTypes && documentTypes.length > 0) {
              return t.type === 'document_request' && documentTypes.some(docType => {
                const desc = t.description?.toLowerCase() || '';
                if (docType === 'certificate_of_indigency') return desc.includes('indigency');
                if (docType === 'barangay_clearance') return desc.includes('barangay clearance');
                if (docType === 'business_clearance') return desc.includes('business clearance');
                return false;
              });
            }
            return t.type === 'document_request';
          }
          return false;
        });
      });
    }
    
    // Filter by year and months
    if (months && months.length > 0 && !months.includes('all')) {
      // Specific months selected
      filteredData = filteredData.filter(t => {
        const transactionMonth = dayjs(t.transactionDate).format('YYYY-MM');
        return months.includes(transactionMonth);
      });
    } else if (year) {
      // All months selected, but filter by year
      filteredData = filteredData.filter(t => {
        const transactionYear = dayjs(t.transactionDate).year();
        return transactionYear === year;
      });
    }

    setExportHasData(filteredData.length > 0);
  };

  useEffect(() => {
    validateExportData();
  }, [exportOpen, transactions]);

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
      
      console.log('Dashboard data:', res.data);
      console.log('Revenue by type:', res.data.revenueByType);
      setDashboardData(res.data);
      setDashboardRefreshKey(prev => prev + 1); // Force re-render of statistics cards
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
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.residents || raw?.data || []);
      if (!Array.isArray(list)) {
        console.warn('Unexpected residents response shape:', raw);
        setResidents([]);
      } else {
        setResidents(list);
      }
      console.log('Residents loaded:', list.length);
    } catch (error) {
      console.error('Error fetching residents:', error);
      setResidents([]);
    }
  };

  const fetchHouseholds = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/households`, {
        headers: authHeaders()
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setHouseholds(list);
      console.log('Households loaded:', list.length);
    } catch (error) {
      console.error('Error fetching households:', error);
      setHouseholds([]);
    }
  };

  // Filter residents based on hasBusiness selection for garbage fees
  const getFilteredResidents = (hasBusiness) => {
    if (hasBusiness === undefined || hasBusiness === null) {
      return residents; // Show all residents if no filter
    }

    // Get household IDs that match the hasBusiness criteria
    const matchingHouseholdIds = households
      .filter(h => h.hasBusiness === hasBusiness)
      .map(h => h._id);

    // Get resident IDs from matching households (head and members)
    const matchingResidentIds = new Set();
    households
      .filter(h => h.hasBusiness === hasBusiness)
      .forEach(household => {
        if (household.headOfHousehold) {
          matchingResidentIds.add(
            typeof household.headOfHousehold === 'string' 
              ? household.headOfHousehold 
              : household.headOfHousehold._id
          );
        }
        if (household.members && Array.isArray(household.members)) {
          household.members.forEach(member => {
            matchingResidentIds.add(
              typeof member === 'string' ? member : member._id
            );
          });
        }
      });

    // Filter residents by matching IDs
    return residents.filter(r => matchingResidentIds.has(r._id));
  };

  // Removed: officials API no longer needed

  const handleCreateTransaction = async () => {
    try {
      setCreating(true);
      const values = await createForm.validateFields();
      
      // Validation: Utility fees require a resident
      if ((values.type === 'garbage_fee' || values.type === 'streetlight_fee') && !values.residentId) {
        message.error('Please select a resident for utility payments');
        setCreating(false);
        return;
      }
      
      // If type is 'other', use the customType value
      const payload = { ...values };
      if (values.type === 'other' && values.customType) {
        payload.description = `${values.customType}: ${values.description || ''}`.trim();
      }
      
      console.log('Creating transaction with values:', payload);
      await axios.post(`${API_BASE}/api/admin/financial/transactions`, payload, {
        headers: authHeaders()
      });
      
      console.log('Transaction created successfully, refreshing dashboard...');
      message.success('Transaction created successfully!');
      setCreateOpen(false);
      createForm.resetFields();
      await fetchDashboard();
      await fetchTransactions();
      console.log('Dashboard and transactions refreshed');
    } catch (error) {
      console.error('Error creating transaction:', error);
      console.error('Error response:', error.response?.data);
      message.error(error?.response?.data?.message || 'Failed to create transaction');
    }
    setCreating(false);
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      
      // Get form values
      const values = await exportForm.validateFields();
      const { exportTypes, months, documentTypes, year } = values;
      
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
                return t.type === 'document_request' && documentTypes.some(docType => {
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
              // If no specific document types, include all document requests
              return t.type === 'document_request';
            }
            return false;
          });
          return typeMatches;
        });
      }
      
      // Filter by year and months
      if (months && months.length > 0 && !months.includes('all')) {
        // Specific months selected
        filteredData = filteredData.filter(t => {
          const transactionMonth = dayjs(t.transactionDate).format('YYYY-MM');
          return months.includes(transactionMonth);
        });
      } else if (year) {
        // All months selected, but filter by year
        filteredData = filteredData.filter(t => {
          const transactionYear = dayjs(t.transactionDate).year();
          return transactionYear === year;
        });
      }
      
      if (filteredData.length === 0) {
        Modal.warning({
          title: 'No Data Available',
          content: 'There are no transactions matching your selected filters to export. Please adjust your filter criteria and try again.',
          okText: 'OK'
        });
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
  // Include both document_request for backward compatibility
  const documentRequestRevenue = Number(revenueByType.document_request || 0);
  const garbageFeeRevenue = Number(revenueByType.garbage_fee || 0);
  const streetlightFeeRevenue = Number(revenueByType.streetlight_fee || 0);
  const totalRevenue = Number(statistics.totalRevenue ?? 0);
  const totalExpenses = Number(statistics.totalExpenses ?? 0);
  const balance = Number(statistics.balance ?? 0);

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
        // 2. "document_MONGOID" (document request fees without index)
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
      paymentMethod: record.paymentMethod || 'Cash',
    });
    setEditOpen(true);
  };

  // Delete all transactions for a grouped resident (Financial + Document + Utility payments)
  async function handleDeleteAllTransactions(groupRecord) {
    try {
      setDeletingId(groupRecord.__rowKey);
      const token = localStorage.getItem('token');
      let successCount = 0;
      let failCount = 0;

      for (const tx of groupRecord.transactions) {
        try {
          // Utility synthesized payment (garbage/streetlight) entries
          if (tx.isUtilityPayment && tx.mongoId && tx.paymentIndex !== undefined) {
            await axios.delete(`${API_BASE}/api/admin/financial/transactions/${tx.mongoId}?paymentIndex=${tx.paymentIndex}`, { headers: { Authorization: `Bearer ${token}` } });
            successCount++;
            continue;
          }
          // Real FinancialTransaction
          const isObjectId = typeof tx._id === 'string' && /^[0-9a-fA-F]{24}$/.test(tx._id);
          if (isObjectId) {
            await axios.delete(`${API_BASE}/api/admin/financial/transactions/${tx._id}`, { headers: { Authorization: `Bearer ${token}` } });
            successCount++;
            continue;
          }
          // DocumentRequest synthetic id pattern: document_<mongoId>
          if (typeof tx._id === 'string' && tx._id.startsWith('document_')) {
            const docId = tx._id.replace('document_', '');
            if (/^[0-9a-fA-F]{24}$/.test(docId)) {
              await axios.delete(`${API_BASE}/api/admin/document-requests/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
              successCount++;
              continue;
            }
          }
        } catch (innerErr) {
          console.error('Delete error (single tx):', tx, innerErr);
          failCount++;
        }
      }

      if (successCount > 0) {
        message.success(`Deleted ${successCount} transaction(s) for ${groupRecord.residentName}${failCount ? ` (${failCount} failed)` : ''}`);
        await fetchTransactions();
      } else {
        message.error('No transactions deleted');
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Bulk deletion failed');
    } finally {
      setDeletingId(null);
    }
  }

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
      width: 100,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs whitespace-nowrap">Expand to see details</span>
          {record.transactionCount > 0 && (
            <Popconfirm
              title="Delete All Transactions"
              description={`Delete all ${record.transactionCount} transaction(s) for ${record.residentName}? This cannot be undone.`}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDeleteAllTransactions(record)}
            >
              <Button 
                size="small" 
                danger 
                icon={<DeleteOutlined />} 
                className="w-fit" 
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
        <Tag color="blue">{formatTransactionType(type)}</Tag>
      ),
      filters: [
        { text: 'Garbage Fee', value: 'garbage_fee' },
        { text: 'Streetlight Fee', value: 'streetlight_fee' },
        { text: 'Document Request Fee', value: 'document_request' },
        { text: 'Other', value: 'other' },
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
            description={`Do you want to delete transaction ${record.transactionId}?`}
            onConfirm={() => handleDeleteTransaction(record)}
            okText="Delete"
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

  const filteredTransactions = transactions.filter(t => {
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
               (transaction.resident || 'Barangay Official'));
    
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
            
          </nav>

          {/* Statistics Section */}
          <div className="px-4 pb-1" key={dashboardRefreshKey}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-green-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg border-2 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-green-800">
                    Total Revenue
                  </CardTitle>
                  <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">
                    ₱{totalRevenue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg border-2 border-red-200">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-red-800">
                    Total Expenses
                  </CardTitle>
                  <div className="flex items-center gap-1 text-red-600 text-xs font-semibold">
                    <TrendingUp className="h-4 w-4 rotate-180" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-700">
                    ₱{totalExpenses.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className={`${balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg border-2`}>
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className={`text-sm font-bold ${balance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                    Net Balance
                  </CardTitle>
                  <div className={`flex items-center gap-1 ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'} text-xs font-semibold`}>
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                    ₱{balance.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Revenue - Expenses</div>
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
                    ₱{documentRequestRevenue.toLocaleString()}
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
                  { label: 'Document Request Fee', value: 'document_request' },
                  { label: 'Garbage Fee', value: 'garbage_fee' },
                  { label: 'Streetlight Fee', value: 'streetlight_fee' },
                  { label: 'Other', value: 'other' },
                ]}
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button 
                type="primary"
                onClick={() => { fetchResidents(); fetchHouseholds(); setCreateOpen(true); }}
              >
                + Add Transaction
              </Button>
              <Button 
                loading={exporting}
                onClick={() => setExportOpen(true)}
              >
                Export to Excel
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="__rowKey"
              loading={loading}
              dataSource={groupedData}
              columns={columns}
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    columns={expandedColumns}
                    dataSource={record.transactions}
                    pagination={{
                      defaultPageSize: 5,
                      showTotal: (total) => `Total of ${total} transactions`,
                      showSizeChanger: false,
                      showQuickJumper: false,
                      showLessItems: true,
                      itemRender: (page, type, originalElement) => {
                        if (type === 'prev') {
                          return originalElement;
                        }
                        if (type === 'next') {
                          return originalElement;
                        }
                        return null;
                      },
                    }}
                    rowKey={(tx) => tx.__rowKey ?? tx._id ?? getTransactionKey(tx)}
                    size="medium"
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
              }}
              onChange={handleTableChange}
              scroll={{ x: 800 }}
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
            onValuesChange={validateExportData}
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
                        if (exportType === 'document_request_fees') return t.type === 'document_request';
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
            
            <div className="text-sm text-gray-500 mt-2">
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
                <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select a category' }]}>
                  <Select placeholder="Select category">
                    <Select.Option value="revenue">Revenue</Select.Option>
                    <Select.Option value="expense">Expenses</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="type" label="Transaction Type" rules={[{ required: true, message: 'Please select a transaction type' }]}> 
                  <Select placeholder="Select transaction type">
                    <Select.Option value="document_request">Document Request Fee</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {selectedCreateType === 'other' && (
              <Form.Item 
                name="customType" 
                label="Specify Transaction Type" 
                rules={[{ required: true, message: 'Please specify the transaction type' }]}
              >
                <Input placeholder="Enter custom transaction type" />
              </Form.Item>
            )}

            {selectedCreateType === 'garbage_fee' && (
              <>
                <Form.Item 
                  name="hasBusiness" 
                  label="Has Business?" 
                  rules={[{ required: true, message: 'Please select' }]}
                  initialValue={false}
                  extra="Selecting this option will filter residents by their household's business status"
                >
                  <Select placeholder="Select option">
                    <Select.Option value={false}>No (₱35/month)</Select.Option>
                    <Select.Option value={true}>Yes (₱50/month)</Select.Option>
                  </Select>
                </Form.Item>
              </>
            )}
            {selectedCreateType === 'streetlight_fee' && (
              <Form.Item label="Streetlight Fee Amount">
                <Input
                  value={createForm.getFieldValue('amount') || ''}
                  prefix="₱"
                  readOnly
                  placeholder="12.00 (Fixed Amount)"
                />
              </Form.Item>
            )}
            
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item 
                  name="residentId"
                  label={selectedCreateType === 'garbage_fee' || selectedCreateType === 'streetlight_fee' ? 'Resident (Required for Utility Fees)' : 'Resident (Optional)'}
                  rules={[
                    {
                      required: selectedCreateType === 'garbage_fee' || selectedCreateType === 'streetlight_fee',
                      message: 'Please select a resident for utility payments'
                    }
                  ]}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder={
                      selectedCreateType === 'garbage_fee' && selectedCreateHasBusiness === undefined
                        ? "Please select 'Has Business?' first"
                        : "Select resident"
                    }
                    disabled={selectedCreateType === 'garbage_fee' && selectedCreateHasBusiness === undefined}
                    style={{ width: '100%' }}
                    dropdownStyle={{ minWidth: 250 }}
                  >
                    {(selectedCreateType === 'garbage_fee'
                      ? getFilteredResidents(selectedCreateHasBusiness)
                      : residents
                    ).map(r => (
                      <Select.Option key={r._id} value={r._id}>
                        {r.firstName} {r.middleName ? r.middleName + ' ' : ''}{r.lastName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter a description' }]}>
              <Input.TextArea rows={3} placeholder="Enter description" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="amount" 
                  label="Amount" 
                  rules={[
                    { required: true, message: 'Please enter the amount' },
                    () => ({
                      validator(_, value) {
                        if (!value) return Promise.reject();
                        const numValue = Number(value);
                        if (numValue < 0) return Promise.reject(new Error('Amount cannot be negative'));
                        if (numValue === 0) return Promise.reject(new Error('Amount must be greater than 0'));
                        if (numValue > 100000) return Promise.reject(new Error('Amount cannot exceed ₱100,000'));
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <Input 
                    type="number" 
                    prefix="₱" 
                    placeholder="Enter amount (max ₱100,000)"
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                        e.preventDefault();
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="paymentMethod" label="Payment Method">
                  <Input value="Cash" disabled />
                </Form.Item>
              </Col>
            </Row>
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
              <Descriptions.Item label="Category">
                <Tag color={viewTransaction.category === 'revenue' ? 'green' : 'red'}>
                  {viewTransaction.category === 'revenue' ? 'Revenue' : 'Expense'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color="blue">{formatTransactionType(viewTransaction.type)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Description">{viewTransaction.description}</Descriptions.Item>
              <Descriptions.Item label="Amount">₱{Number(viewTransaction.amount).toLocaleString()}</Descriptions.Item>

              <Descriptions.Item label="Resident">
                {viewTransaction.residentName || 
                 (viewTransaction.residentId ? `${viewTransaction.residentId.firstName} ${viewTransaction.residentId.lastName}` : (viewTransaction.resident || 'Barangay Official'))}
              </Descriptions.Item>  
              <Descriptions.Item label="Payment Method">{viewTransaction.paymentMethod}</Descriptions.Item>
              <Descriptions.Item label="Transaction Date">
                {dayjs(viewTransaction.transactionDate).format('MMMM DD, YYYY HH:mm')}
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
          <Alert
            message="Edit Financial Transaction"
            description="Update the details of this financial transaction. You can modify the category, type, amount, and other information. Changes will be saved to the system."
            type="info"
            showIcon
            className="mb-4"
          />
          <div style={{ marginBottom: 16 }} />
          <Form form={editForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select a category' }]}>
                  <Select placeholder="Select category">
                    <Select.Option value="revenue">Revenue</Select.Option>
                    <Select.Option value="expense">Expenses</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="type" label="Transaction Type" rules={[{ required: true, message: 'Please select a transaction type' }]}>
                  <Select placeholder="Select transaction type">
                    <Select.Option value="document_request">Document Request</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            {selectedEditType === 'other' && (
              <Form.Item 
                name="customType" 
                label="Specify Transaction Type" 
                rules={[{ required: true, message: 'Please specify the transaction type' }]}
              >
                <Input placeholder="Enter custom transaction type" />
              </Form.Item>
            )}

            {selectedEditType === 'garbage_fee' && (
              <>
                <Form.Item 
                  name="hasBusiness" 
                  label="Has Business?" 
                  rules={[{ required: true, message: 'Please select' }]}
                  extra="Selecting this option will filter residents by their household's business status"
                >
                  <Select placeholder="Select option">
                    <Select.Option value={false}>No (₱35/month)</Select.Option>
                    <Select.Option value={true}>Yes (₱50/month)</Select.Option>
                  </Select>
                </Form.Item>
              </>
            )}
            {selectedEditType === 'streetlight_fee' && (
              <Form.Item label="Streetlight Fee Amount">
                <Input
                  value={editForm.getFieldValue('amount') || ''}
                  prefix="₱"
                  readOnly
                  placeholder="12.00"
                />
              </Form.Item>
            )}
            
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item 
                  name="residentId"
                  label={selectedEditType === 'garbage_fee' || selectedEditType === 'streetlight_fee' ? 'Resident (Required for Utility Fees)' : 'Resident (Optional)'}
                  rules={[
                    {
                      required: selectedEditType === 'garbage_fee' || selectedEditType === 'streetlight_fee',
                      message: 'Please select a resident for utility payments'
                    }
                  ]}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder={
                      selectedEditType === 'garbage_fee' && selectedEditHasBusiness === undefined
                        ? "Please select 'Has Business?' first"
                        : "Select resident"
                    }
                    disabled={selectedEditType === 'garbage_fee' && selectedEditHasBusiness === undefined}
                    style={{ width: '100%' }}
                    dropdownStyle={{ minWidth: 250 }}
                  >
                    {(selectedEditType === 'garbage_fee'
                      ? getFilteredResidents(selectedEditHasBusiness)
                      : residents
                    ).map(r => (
                      <Select.Option key={r._id} value={r._id}>
                        {r.firstName} {r.middleName ? r.middleName + ' ' : ''}{r.lastName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter a description' }]}>
              <Input.TextArea rows={3} placeholder="Enter description" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="amount" 
                  label="Amount" 
                  rules={[
                    { required: true, message: 'Please enter an amount' },
                    {
                      validator: (_, value) => {
                        if (!value) {
                          return Promise.reject();
                        }
                        if (value < 0) {
                          return Promise.reject('Amount cannot be negative');
                        }
                        if (value <= 0) {
                        return Promise.reject('Amount must be greater than 0');
                      }
                      if (value > 100000) {
                        return Promise.reject('Amount cannot exceed ₱100,000');
                      }
                      return Promise.resolve();
                    }
                  }
                ]}>
                  <Input 
                    type="number" 
                    prefix="₱" 
                    placeholder="Enter amount (max ₱100,000)"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="paymentMethod" label="Payment Method">
                  <Input value="Cash" disabled />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}