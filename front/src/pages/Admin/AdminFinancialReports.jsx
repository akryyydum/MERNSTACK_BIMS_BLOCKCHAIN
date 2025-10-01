import React, { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Form, Select, message, Tag, Descriptions, DatePicker, Card, Row, Col, Statistic, Tabs } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { ArrowUpRight, DollarSign, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { UserOutlined, SyncOutlined, FileTextOutlined, BarChartOutlined } from "@ant-design/icons";
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
  const [viewTransaction, setViewTransaction] = useState(null);
  
  // Forms
  const [createForm] = Form.useForm();
  const [reportForm] = Form.useForm();
  
  // Loading states
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    fetchDashboard();
    fetchTransactions();
  }, [dateRange, filters]);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

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
      const params = {
        startDate: dateRange[0]?.format('YYYY-MM-DD'),
        endDate: dateRange[1]?.format('YYYY-MM-DD'),
        ...filters
      };
      
      const res = await axios.get(`${API_BASE}/api/admin/financial/transactions`, {
        headers: authHeaders(),
        params
      });
      
      setTransactions(res.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      message.error('Failed to load transactions');
    }
    setLoading(false);
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
        'Date': dayjs(t.transactionDate).format('YYYY-MM-DD HH:mm'),
        'Blockchain Hash': t.blockchain?.hash || '-',
        'Blockchain Verified': t.blockchain?.verified ? 'Yes' : 'No'
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

  // Calculate summary statistics
  const totalRevenue = dashboardData.revenues?.reduce((sum, r) => sum + r.total, 0) || 0;
  const totalExpenses = dashboardData.expenses?.reduce((sum, e) => sum + e.total, 0) || 0;
  const totalAllocations = dashboardData.allocations?.reduce((sum, a) => sum + a.total, 0) || 0;
  const netIncome = totalRevenue - totalExpenses;

  // Chart data
  const revenueChartData = {
    labels: dashboardData.revenues?.map(r => r._id.replace('_', ' ').toUpperCase()) || [],
    datasets: [{
      label: 'Revenue by Type',
      data: dashboardData.revenues?.map(r => r.total) || [],
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'
      ]
    }]
  };

  const monthlyTrendData = {
    labels: dashboardData.monthlyTrends?.map(m => `${m._id.year}-${String(m._id.month).padStart(2, '0')}`) || [],
    datasets: [
      {
        label: 'Revenue',
        data: dashboardData.monthlyTrends?.filter(m => m._id.category === 'revenue').map(m => m.total) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      },
      {
        label: 'Expenses',
        data: dashboardData.monthlyTrends?.filter(m => m._id.category === 'expense').map(m => m.total) || [],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      }
    ]
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
      )
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
      render: (_, record) => 
        record.residentId ? `${record.residentId.firstName} ${record.residentId.lastName}` : '-'
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
      title: 'Blockchain',
      key: 'blockchain',
      render: (_, record) => 
        record.blockchain?.verified ? 
        <Tag color="green">Verified</Tag> : 
        <Tag color="orange">Pending</Tag>
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
        <Button size="small" onClick={() => { setViewTransaction(record); setViewOpen(true); }}>
          View
        </Button>
      )
    }
  ];

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
    <AdminLayout title="Financial Reports">
      <div className="space-y-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Financial & Resource Allocation Reports</h1>
            <p className="text-gray-600 mt-1">Comprehensive financial tracking with blockchain integration</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow">
            <UserOutlined className="text-2xl text-blue-600" />
            <div>
              <div className="font-semibold text-gray-700">{userProfile.fullName || "Administrator"}</div>
              <div className="text-xs text-gray-500">{username}</div>
            </div>
          </div>
        </div>

        {/* Date Range and Controls */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
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
            </div>
            <div className="flex gap-2">
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

        {/* Summary Cards */}
        <Row gutter={16}>
          <Col span={6}>
            <Card className="shadow-md">
              <Statistic
                title="Total Revenue"
                value={totalRevenue}
                precision={2}
                prefix="₱"
                valueStyle={{ color: '#10B981' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="shadow-md">
              <Statistic
                title="Total Expenses"
                value={totalExpenses}
                precision={2}
                prefix="₱"
                valueStyle={{ color: '#EF4444' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="shadow-md">
              <Statistic
                title="Net Income"
                value={netIncome}
                precision={2}
                prefix="₱"
                valueStyle={{ color: netIncome >= 0 ? '#10B981' : '#EF4444' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="shadow-md">
              <Statistic
                title="Total Allocations"
                value={totalAllocations}
                precision={2}
                prefix="₱"
                valueStyle={{ color: '#F59E0B' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Charts */}
        <Row gutter={16}>
          <Col span={12}>
            <Card title="Revenue by Type" className="shadow-md">
              {dashboardData.revenues?.length > 0 ? (
                <Pie data={revenueChartData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
              ) : (
                <div className="text-center text-gray-500 py-8">No revenue data available</div>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Monthly Trends" className="shadow-md">
              {dashboardData.monthlyTrends?.length > 0 ? (
                <Line data={monthlyTrendData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
              ) : (
                <div className="text-center text-gray-500 py-8">No trend data available</div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Transactions Table */}
        <Card title="Financial Transactions" className="shadow-md">
          <div className="mb-4 flex justify-between items-center">
            <Input.Search
              placeholder="Search transactions..."
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
            />
            <Button
              loading={exporting}
              onClick={handleExportData}
            >
              Export to Excel
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={filteredTransactions}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* Create Transaction Modal */}
        <Modal
          title="Add Financial Transaction"
          open={createOpen}
          onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
          onOk={handleCreateTransaction}
          confirmLoading={creating}
          width={600}
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
      </div>
    </AdminLayout>
  );
}