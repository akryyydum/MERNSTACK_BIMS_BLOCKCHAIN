import React, { useMemo, useState, useEffect } from "react";
import { Table, Input, Button, Tag, message, Space, Typography, Tabs, Modal, Checkbox, Form } from "antd";
import { SearchOutlined, FileTextOutlined, ReloadOutlined, CloudSyncOutlined, FolderOpenOutlined, DollarOutlined, BlockOutlined, UserOutlined, FilePdfOutlined } from "@ant-design/icons";
import axios from "axios";
import apiClient from "../../utils/apiClient";
import dayjs from "dayjs";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Normalize arbitrary amount input (may include symbols like ₱, +, ±, commas, spaces)
function normalizeAmount(amount) {
  if (amount == null) return 0;
  let s = String(amount).trim();
  // Detect explicit negative (leading '-')
  const isNegative = /^-/.test(s) || /\(.*\)/.test(s);
  // Strip everything except digits and decimal point
  s = s.replace(/[^0-9.]/g, '');
  if (!s) return 0;
  let val = Number(s);
  if (!Number.isFinite(val)) return 0;
  return isNegative ? -val : val;
}

// Consistent currency formatting helper (2 decimal places) removing unexpected signs like ±
function formatPeso(amount) {
  const n = normalizeAmount(amount);
  return '₱' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminBlockchainNetwork() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("requests");
  const [results, setResults] = useState([]); // on-chain document requests
  const [loading, setLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  // On-chain public documents
  const [publicDocs, setPublicDocs] = useState([]);
  const [finance, setFinance] = useState([]); // on-chain financial transactions

  // Export modal state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportForm] = Form.useForm();
  const [exporting, setExporting] = useState(false);

  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  const handleSearch = async () => {
    if (activeTab === "requests") setLoading(true);
    try {
      const res = await apiClient.get('/api/blockchain/requests');
      setResults(Array.isArray(res.data) ? res.data : []);
      setLastFetchedAt(new Date());
    } catch (err) {
      console.error(err);
      if (activeTab === "requests") message.error("Search failed, please try again.");
    }
    if (activeTab === "requests") setLoading(false);
  }; 
  const handleFinanceFetch = async () => {
    if (activeTab === "finance") setLoading(true);
    try {
      const res = await apiClient.get('/api/blockchain/financial-transactions');
      setFinance(Array.isArray(res.data) ? res.data : []);
      setLastFetchedAt(new Date());
    } catch (err) {
      console.error(err);
      if (activeTab === "finance") message.error("Failed to load financial transactions.");
    }
    if (activeTab === "finance") setLoading(false);
  };
  const handlePublicDocsFetch = async () => {
    if (activeTab === "publicdocs") setLoading(true);
    try {
      // Fetch combined data from admin endpoint (contains mongoDocs with status + blockchainDocs raw)
      const res = await apiClient.get('/api/admin/public-documents');
      const mongoDocs = res.data?.mongoDocs || [];
      const blockchainDocs = res.data?.blockchainDocs || [];

      // Build status map from mongoDocs
      const statusMap = new Map();
      mongoDocs.forEach(d => statusMap.set(d._id, d.status));

      // Merge status onto blockchain docs
      const merged = blockchainDocs.map(bDoc => {
        const status = statusMap.get(bDoc.docId) || (bDoc.deleted ? 'deleted' : bDoc.edited ? 'edited' : 'verified');
        return { ...bDoc, status };
      });
      setPublicDocs(merged);
      setLastFetchedAt(new Date());
    } catch (err) {
      console.error(err);
      if (activeTab === "publicdocs") message.error("Failed to load public documents from blockchain.");
    }
    if (activeTab === "publicdocs") setLoading(false);
  };
  const handleSync = async () => {
    if (activeTab !== "requests") return; // only valid for requests tab
    setLoading(true);
    try {
      await apiClient.post('/api/blockchain/sync-from-db');
      message.success('Sync complete');
      await handleSearch();
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.message || 'Sync failed');
    }
    setLoading(false);
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const values = await exportForm.validateFields();
      const { exportTabs } = values;

      if (!exportTabs || exportTabs.length === 0) {
        message.warning('Please select at least one tab to export');
        setExporting(false);
        return;
      }

      const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('Blockchain Network Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated on: ${dayjs().format('MMMM DD, YYYY HH:mm')}`, pageWidth / 2, yPosition, { align: 'center' });
      doc.text(`Generated by: ${username}`, pageWidth / 2, yPosition + 5, { align: 'center' });
      yPosition += 15;

      // Export Document Requests
      if (exportTabs.includes('requests')) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Document Requests', 14, yPosition);
        yPosition += 7;

        const requestData = filteredRequests.map(r => [
          r.requestId || '-',
          r.documentType || '-',
          r.requestedBy || '-',
          (r.status || '').charAt(0).toUpperCase() + (r.status || '').slice(1),
          r.requestedAt ? dayjs(r.requestedAt).format('YYYY-MM-DD HH:mm') : '-'
        ]);

        doc.autoTable({
          startY: yPosition,
          head: [['Request ID', 'Document Type', 'Resident', 'Status', 'Requested At']],
          body: requestData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
        
        // Add new page if needed
        if (yPosition > pageHeight - 30 && (exportTabs.includes('publicdocs') || exportTabs.includes('finance'))) {
          doc.addPage();
          yPosition = 20;
        }
      }

      // Export Public Documents
      if (exportTabs.includes('publicdocs')) {
        if (yPosition > 20 && yPosition < pageHeight - 60) {
          // Add spacing if on same page
          yPosition += 5;
        }
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Public Documents', 14, yPosition);
        yPosition += 7;

        const publicDocData = filteredPublicDocs.map(d => [
          d.docId || '-',
          d.title || '-',
          d.category || '-',
          d.originalName || '-',
          d.size ? `${(d.size/1024).toFixed(1)} KB` : '-',
          d.createdAt ? dayjs(d.createdAt).format('YYYY-MM-DD') : '-',
          (d.status || 'N/A').toUpperCase()
        ]);

        doc.autoTable({
          startY: yPosition,
          head: [['Doc ID', 'Title', 'Category', 'File', 'Size', 'Uploaded', 'Status']],
          body: publicDocData,
          theme: 'striped',
          headStyles: { fillColor: [147, 51, 234], fontStyle: 'bold' },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 }
        });

        yPosition = doc.lastAutoTable.finalY + 10;
        
        // Add new page if needed
        if (yPosition > pageHeight - 30 && exportTabs.includes('finance')) {
          doc.addPage();
          yPosition = 20;
        }
      }

      // Export Financial Transactions
      if (exportTabs.includes('finance')) {
        if (yPosition > 20 && yPosition < pageHeight - 60) {
          // Add spacing if on same page
          yPosition += 5;
        }
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Financial Transactions', 14, yPosition);
        yPosition += 7;

        // Match ResidentBlockchainNetwork formatting: 'P ' + localized amount to 2 decimals (en-PH)
        const financeData = filteredFinance.map(t => {
          const amountNum = Number(t.amount || 0);
          const formattedAmount = `P ${amountNum.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          return [
            t.txId || '-',
            t.requestId || '-',
            t.residentName || '-',
            formattedAmount,
            t.paymentMethod || '-',
            (t.description || '-').substring(0, 30) + ((t.description || '').length > 30 ? '...' : ''),
            t.createdAt ? dayjs(t.createdAt).format('YYYY-MM-DD HH:mm') : '-'
          ];
        });

        doc.autoTable({
          startY: yPosition,
          head: [['TX ID', 'Request ID', 'Resident', 'Amount', 'Method', 'Description', 'Created']],
          body: financeData,
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94], fontStyle: 'bold' },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 }
        });
      }

      // Save PDF
      const filename = `Blockchain_Report_${exportTabs.join('_')}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`;
      doc.save(filename);

      message.success('Report exported successfully!');
      setExportOpen(false);
      exportForm.resetFields();
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };
  // Load all data on mount - no loading state to avoid blocking
  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Load all three data sources in parallel without showing loading spinner
        await Promise.all([
          handleSearch(),
          handleFinanceFetch(),
          handlePublicDocsFetch()
        ]);
      } catch (err) {
        console.error('Error loading blockchain data:', err);
      }
    };
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived filtered data per tab
  const filteredRequests = useMemo(() => {
    // Always exclude synthetic utility payment placeholders (garbage/streetlight/electric)
    const excludeUtility = (arr) => (arr || []).filter(r => {
      const t = (r.documentType || '').toString().toLowerCase();
      // We created these on-chain as `${type}_payment` (e.g., garbage_payment, streetlight_payment, electric_payment)
      return !t.endsWith('_payment');
    });

    const base = excludeUtility(results);
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter(r => {
      const type = (r.documentType || '').toString().toLowerCase();
      const resident = (r.residentId || '').toString().toLowerCase();
      const status = (r.status || '').toString().toLowerCase();
      const id = (r.requestId || r._id || '').toString().toLowerCase();
      return type.includes(q) || resident.includes(q) || status.includes(q) || id.includes(q);
    });
  }, [results, query]);

  const filteredPublicDocs = useMemo(() => {
    if (!query) return publicDocs;
    const q = query.toLowerCase();
    return (publicDocs || []).filter(d => (
      d.title.toLowerCase().includes(q) ||
      (d.category || '').toLowerCase().includes(q) ||
      (d.originalName || '').toLowerCase().includes(q)
    ));
  }, [publicDocs, query]);

  const filteredFinance = useMemo(() => {
    if (!query) return finance;
    const q = query.toLowerCase();
    return (finance || []).filter(t => (
      (t.txId || '').toLowerCase().includes(q) ||
      (t.requestId || '').toLowerCase().includes(q) ||
      (t.residentId || '').toLowerCase().includes(q) ||
      (t.residentName || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      String(t.amount || '').toLowerCase().includes(q) ||
      (t.paymentMethod || '').toLowerCase().includes(q)
    ));
  }, [finance, query]);

  const columns = [
    {
      title: "Request ID",
      dataIndex: "requestId",
      key: "requestId",
      render: (v) => (
        <div className="flex items-center gap-2">
          <FileTextOutlined className="text-gray-500" />
          <span>{v}</span>
        </div>
      ),
    },
    {
      title: "Document Type",
      dataIndex: "documentType",
      key: "documentType",
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Resident",
      dataIndex: "requestedBy",
      key: "requestedBy",
      render: (v) => <span>{v}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) => {
        const s = (v || '').toString();
        const k = s.toLowerCase();
        let color = "default";
        if (k === "pending") color = "orange";
        if (k === "accepted") color = "green";
        if (k === "declined") color = "red";
        if (k === "completed") color = "blue";
        const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "Requested At",
      dataIndex: "requestedAt",
      key: "requestedAt",
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
      sorter: (a, b) =>
        new Date(a.requestedAt || 0) - new Date(b.requestedAt || 0),
      defaultSortOrder: "descend",
    },
  ];

  const STATUS_COLORS = {
    verified: 'green',
    edited: 'orange',
    deleted: 'red',
    not_registered: 'default',
    error: 'volcano'
  };

  const publicDocColumns = [
    { title: "Doc ID", dataIndex: "docId", key: "docId", render: (v) => <Space><FolderOpenOutlined />{v}</Space> },
    { title: "Title", dataIndex: "title", key: "title" },
    { title: "Category", dataIndex: "category", key: "category", render: (v) => <Tag color="purple">{v}</Tag> },
    { title: "File", dataIndex: "originalName", key: "originalName" },
    { title: "Size", dataIndex: "size", key: "size", render: (n) => n ? `${(n/1024).toFixed(1)} KB` : "-" },
    { title: "Uploaded", dataIndex: "createdAt", key: "createdAt", render: (v) => v ? dayjs(v).format("YYYY-MM-DD") : "-" },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => (
        <Tag color={STATUS_COLORS[v] || 'default'} className="uppercase tracking-wide">
          {v === 'not_registered' ? 'UNREGISTERED' : (v || 'N/A').toUpperCase()}
        </Tag>
      ),
      filters: ['verified','edited','deleted','not_registered','error'].map(s => ({ text: s.toUpperCase(), value: s })),
      onFilter: (value, record) => record.status === value,
    }
  ];

  const financeColumns = [
    { title: "Transaction ID", dataIndex: "txId", key: "txId", render: (v) => <Space><DollarOutlined />{v}</Space> },
    { title: "Request ID", dataIndex: "requestId", key: "requestId" },
    { title: "Resident", dataIndex: "residentName", key: "residentName" },
    { title: "Amount", dataIndex: "amount", key: "amount", render: (n) => formatPeso(n) },
    { title: "Payment Method", dataIndex: "paymentMethod", key: "paymentMethod" },
    { title: "Description", dataIndex: "description", key: "description" },
    { title: "Created", dataIndex: "createdAt", key: "createdAt", render: (v) => v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        {/* Navbar */}
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">Blockchain Network</span>
            </div>
            
          </nav>

          {/* Statistics Section */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-3 md:py-4 p-3 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">Requests</CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {filteredRequests?.length || 0}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold text-black">{filteredRequests?.length || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-3 md:py-4 p-3 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">Public Documents</CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {filteredPublicDocs?.length || 0}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold text-black">{filteredPublicDocs?.length || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-3 md:py-4 p-3 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">Finance Records</CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {filteredFinance?.length || 0}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold text-black">{filteredFinance?.length || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-3 md:py-4 p-3 md:p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold text-black">Last Fetched</CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {lastFetchedAt ? dayjs(lastFetchedAt).format('HH:mm') : '—'}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl md:text-3xl font-bold text-black">{lastFetchedAt ? dayjs(lastFetchedAt).format('HH:mm') : '—'}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Tables Section */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <hr className="border-t border-gray-300" />
          <div className="flex flex-col md:flex-row flex-wrap gap-2 md:items-center md:justify-between">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center w-full md:w-auto">
              <div className="w-full sm:w-auto">
                <Input.Search
                  allowClear
                  placeholder={activeTab === 'requests' ? 'Search for Document Requests' : activeTab === 'publicdocs' ? 'Search for Public Documents' : 'Search for Transactions'}
                  onSearch={(v) => setQuery(v.trim())}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  enterButton
                  className="w-full sm:min-w-[350px] md:min-w-[500px] max-w-full"
                />
              </div>
              {/* Unified Refresh button per active tab */}
              <div className="flex flex-row gap-2 w-full sm:w-auto">
                {activeTab === 'requests' && (
                  <>
                    <Button icon={<ReloadOutlined />} onClick={handleSearch} loading={loading} className="flex-1 sm:flex-initial whitespace-nowrap">Refresh</Button>
                    <Button icon={<CloudSyncOutlined />} onClick={handleSync} loading={loading} className="flex-1 sm:flex-initial whitespace-nowrap">Sync from DB</Button>
                  </>
                )}
                {activeTab === 'publicdocs' && (
                  <Button icon={<ReloadOutlined />} onClick={handlePublicDocsFetch} loading={loading} className="w-full sm:w-auto whitespace-nowrap">Refresh</Button>
                )}
                {activeTab === 'finance' && (
                  <Button icon={<ReloadOutlined />} onClick={handleFinanceFetch} loading={loading} className="w-full sm:w-auto whitespace-nowrap">Refresh</Button>
                )}
              </div>
            </div>
            <div className="w-full md:w-auto">
              <Button 
                type="primary" 
                icon={<FilePdfOutlined />} 
                onClick={() => setExportOpen(true)}
                className="w-full md:w-auto whitespace-nowrap"
              >
                Export to PDF
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'requests',
                  label: 'Document Requests',
                  children: (
                    <>
                      <Table
                        rowKey={(r) => r.requestId || r._id || r.id || r.key}
                        loading={loading}
                        dataSource={filteredRequests}
                        columns={columns}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 800 }}
                      />
                      {!loading && (!filteredRequests || filteredRequests.length === 0) && (
                        <div className="pt-4 text-sm text-gray-500">
                          <Typography.Text type="secondary">
                            No on-chain requests found. Try creating a document request or click "Sync from DB" to backfill existing records.
                          </Typography.Text>
                        </div>
                      )}
                    </>
                  )
                },
                {
                  key: 'publicdocs',
                  label: 'Public Documents (On-chain)',
                  children: (
                    <>
                      <Table
                        rowKey={(r) => r.docId || r._id || r.id}
                        loading={loading}
                        dataSource={filteredPublicDocs}
                        columns={publicDocColumns}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 800 }}
                      />
                      {(!loading && (!filteredPublicDocs || filteredPublicDocs.length === 0)) && (
                        <div className="pt-4 text-sm text-gray-500">
                          <Typography.Text type="secondary">
                            No on-chain public documents found.
                          </Typography.Text>
                        </div>
                      )}
                    </>
                  )
                },
                {
                  key: 'finance',
                  label: 'Financial Transactions',
                  children: (
                    <>
                      <Table
                        rowKey={(r) => r.txId}
                        loading={loading}
                        dataSource={filteredFinance}
                        columns={financeColumns}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 900 }}
                      />
                      {(!loading && (!filteredFinance || filteredFinance.length === 0)) && (
                        <div className="pt-4 text-sm text-gray-500">
                          <Typography.Text type="secondary">
                            No on-chain financial transactions found.
                          </Typography.Text>
                        </div>
                      )}
                    </>
                  )
                }
              ]}
            />
          </div>
        </div>

        {/* Export Modal */}
        <Modal
          title="Export Blockchain Data to PDF"
          open={exportOpen}
          onCancel={() => {
            setExportOpen(false);
            exportForm.resetFields();
          }}
          onOk={handleExportPDF}
          okText="Export"
          confirmLoading={exporting}
          width={500}
        >
          <Form form={exportForm} layout="vertical" initialValues={{ exportTabs: ['requests', 'publicdocs', 'finance'] }}>
            <Form.Item
              name="exportTabs"
              label="Select Tables to Export"
              rules={[{ required: true, message: 'Please select at least one table' }]}
            >
              <Checkbox.Group style={{ width: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Checkbox value="requests">
                    <Space>
                      <FileTextOutlined />
                      Document Requests ({filteredRequests.length} records)
                    </Space>
                  </Checkbox>
                  <Checkbox value="publicdocs">
                    <Space>
                      <FolderOpenOutlined />
                      Public Documents ({filteredPublicDocs.length} records)
                    </Space>
                  </Checkbox>
                  <Checkbox value="finance">
                    <Space>
                      <DollarOutlined />
                      Financial Transactions ({filteredFinance.length} records)
                    </Space>
                  </Checkbox>
                </Space>
              </Checkbox.Group>
            </Form.Item>

            <div className="text-sm text-gray-500 mt-4">
              <p><strong>Export Information:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Select one or more tables to include in the PDF report</li>
                <li>The report will include all filtered data from selected tables</li>
                <li>Current search filters will be applied to the export</li>
                <li>Generated in landscape format for better readability</li>
              </ul>
            </div>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
