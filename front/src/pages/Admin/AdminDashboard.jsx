import React, { useMemo, useState, useEffect } from 'react';
import { AdminLayout } from './AdminSidebar';
import {
  Card,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Progress,
  Space,
  Divider,
  Spin,
  message,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  FileProtectOutlined,
  DollarCircleOutlined,
  ThunderboltOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const { Title, Text } = Typography;

// Month labels for grouping
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const COLORS = ['#1677FF', '#13C2C2', '#69C0FF', '#FFC53D', '#F759AB'];

export default function AdminDashboard() {
  // Data state
  const [residents, setResidents] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [docRequests, setDocRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [financialDashboard, setFinancialDashboard] = useState(null);
  const [financialTotal, setFinancialTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all dashboard data
  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      setLoading(true); setError(null);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [resResidents, resOfficials, resDocs, resComplaints, resFinDash, resFinTx] = await Promise.all([
          fetch('/api/admin/residents', { headers, signal: abort.signal }),
          fetch('/api/admin/officials', { headers, signal: abort.signal }),
            fetch('/api/admin/document-requests', { headers, signal: abort.signal }),
          fetch('/api/admin/complaints', { headers, signal: abort.signal }),
          fetch('/api/admin/financial/dashboard', { headers, signal: abort.signal }),
          fetch('/api/admin/financial/transactions?limit=1', { headers, signal: abort.signal })
        ]);
        if (![resResidents,resOfficials,resDocs,resComplaints,resFinDash,resFinTx].every(r => r.ok)) {
          throw new Error('Failed to load one or more dashboard resources');
        }
        const [residentsData, officialsData, docsData, complaintsData, finDashData, finTxData] = await Promise.all([
          resResidents.json(), resOfficials.json(), resDocs.json(), resComplaints.json(), resFinDash.json(), resFinTx.json()
        ]);
        setResidents(Array.isArray(residentsData) ? residentsData : []);
        setOfficials(Array.isArray(officialsData) ? officialsData : []);
        setDocRequests(Array.isArray(docsData) ? docsData : []);
        setComplaints(Array.isArray(complaintsData) ? complaintsData : []);
        setFinancialDashboard(finDashData);
        setFinancialTotal(finTxData?.total || 0);
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('[Dashboard] load error', e);
          setError(e.message || 'Failed to load');
          message.error(e.message || 'Failed to load dashboard');
        }
      } finally { setLoading(false); }
    }
    load();
    return () => abort.abort();
  }, []);

  // Derived metrics
  const totalResidents = residents.length;
  const activeOfficials = officials.filter(o => o.isActive).length;
  const pendingDocRequests = docRequests.filter(d => d.status === 'pending').length;

  // Population breakdown (gender)
  const populationData = useMemo(() => {
    if (!residents.length) return [];
    const counts = { male:0, female:0, other:0 };
    residents.forEach(r => { counts[r.gender] = (counts[r.gender]||0)+1; });
    return [
      { name: 'Male', value: counts.male },
      { name: 'Female', value: counts.female },
      { name: 'Others', value: counts.other }
    ];
  }, [residents]);
  const populationTotal = useMemo(() => populationData.reduce((a,b)=>a+b.value,0), [populationData]);

  // Monthly requests trend from document requests
  const requestTrendData = useMemo(() => {
    const map = new Map();
    MONTHS.forEach(m => map.set(m, 0));
    docRequests.forEach(d => {
      const dt = d.requestedAt || d.createdAt; if (!dt) return;
      const date = new Date(dt);
      const label = MONTHS[date.getMonth()];
      map.set(label, (map.get(label) || 0) + 1);
    });
    return MONTHS.map(m => ({ month: m, value: map.get(m) }));
  }, [docRequests]);

  // Financial flow (revenue vs expenses vs allocations) from financial dashboard
  const financialFlowData = useMemo(() => {
    if (!financialDashboard) return [];
    const sum = arr => (arr||[]).reduce((acc,cur)=>acc+cur.total,0);
    const revenueTotal = sum(financialDashboard.revenues);
    const expenseTotal = sum(financialDashboard.expenses);
    const allocationTotal = sum(financialDashboard.allocations);
    return [
      { name: 'Revenue', value: revenueTotal },
      { name: 'Expenses', value: expenseTotal },
      { name: 'Allocations', value: allocationTotal },
    ];
  }, [financialDashboard]);

  // Recent document requests (top 5)
  const docRequestColumns = [
    { title: 'Resident', dataIndex: 'resident', key: 'resident' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'Requested', dataIndex: 'requested', key: 'requested' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: s => <Tag color={s === 'pending' ? 'gold' : s === 'completed' ? 'green' : s === 'declined' ? 'red':'blue'}>{s}</Tag> },
  ];
  const docRequestData = useMemo(() => {
    return docRequests
      .slice(0,5)
      .map((d,i) => ({
        key: d._id || i,
        resident: d.residentId ? `${d.residentId.firstName||''} ${d.residentId.lastName||''}`.trim() : '—',
        type: d.documentType,
        requested: d.requestedAt ? new Date(d.requestedAt).toLocaleDateString() : '—',
        status: d.status
      }));
  }, [docRequests]);

  // Complaints placeholder until backend aggregated endpoint (keep static or show empty)
  const complaintColumns = [
    { title: 'Resident', dataIndex: 'resident' },
    { title: 'Title', dataIndex: 'title' },
    { title: 'Date', dataIndex: 'date' },
    { title: 'Status', dataIndex: 'status', render: s => {
        const map = { pending:'gold', investigating:'blue', resolved:'green', closed:'default'};
        return <Tag color={map[s] || 'default'}>{s}</Tag>;
      }
    },
  ];
  const complaintData = useMemo(() => complaints.slice(0,5).map(c => ({
    key: c._id,
    resident: c.residentId ? `${c.residentId.firstName||''} ${c.residentId.lastName||''}`.trim() : '—',
    title: c.title,
    date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—',
    status: c.status
  })), [complaints]);

  return (
    <AdminLayout title="Admin">
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Title level={3} style={{ margin: 0 }}>Barangay Management System Dashboard</Title>

        {/* Statistic Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Card loading={loading}>
              <Statistic title="Total Residents" value={totalResidents} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card loading={loading}>
              <Statistic title="Active Officials" value={activeOfficials} prefix={<UserOutlined />} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card loading={loading}>
              <Statistic title="Pending Document Requests" value={pendingDocRequests} prefix={<FileProtectOutlined />} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card loading={loading}>
              <Statistic title="Total Financial Transactions" value={financialTotal} prefix={<DollarCircleOutlined />} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* Population Breakdown */}
          <Col xs={24} md={6}>
            <Card title="Population Breakdown" bodyStyle={{ height: 280 }} loading={loading}>
              {populationData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={populationData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {populationData.map((entry, index) => (
                        <Cell key={`pop-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Spin />
              )}
              <Divider style={{ margin: '8px 0' }} />
              <Space size={12} wrap>
                {populationData.map((p, i) => (
                  <Space key={p.name} size={4}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS[i], borderRadius: 2 }} />
                    <Text>{p.name} ({populationTotal ? Math.round((p.value / populationTotal) * 100) : 0}%)</Text>
                  </Space>
                ))}
              </Space>
            </Card>
          </Col>

          {/* Monthly Requests Trend */}
          <Col xs={24} md={6}>
            <Card title="Monthly Requests Trend" bodyStyle={{ height: 280 }} loading={loading}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={requestTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#1677FF" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Financial Flow */}
          <Col xs={24} md={6}>
            <Card title="Financial Flow" bodyStyle={{ height: 280 }} loading={loading}>
              {financialFlowData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={financialFlowData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {financialFlowData.map((entry, index) => (
                        <Cell key={`fin-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Spin />
              )}
              <Divider style={{ margin: '8px 0' }} />
              <Space size={12} wrap>
                {financialFlowData.map((p, i) => (
                  <Space key={p.name} size={4}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS[(i + 1) % COLORS.length], borderRadius: 2 }} />
                    <Text>{p.name}</Text>
                  </Space>
                ))}
              </Space>
            </Card>
          </Col>

          {/* Blockchain Status */}
          <Col xs={24} md={6}>
            <Card title="Blockchain Network Status" bodyStyle={{ height: 280 }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Text>All 4 peers active</Text>
                <Space wrap>
                  <Tag color="green">Peer 1</Tag>
                  <Tag color="green">Peer 2</Tag>
                  <Tag color="green">Peer 3</Tag>
                  <Tag color="green">Peer 4</Tag>
                </Space>
                <Divider style={{ margin: '8px 0' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Last block height: 1289</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>Latency: 120ms</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>Chaincode: barangaycc@1.0</Text>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={10}>
            <Card title="Recent Document Requests" extra={<ThunderboltOutlined />} loading={loading}>
              <Table size="small" pagination={false} columns={docRequestColumns} dataSource={docRequestData} rowKey="key" />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Recent Complaints" extra={<FileProtectOutlined />} loading={loading}>
              <Table size="small" pagination={false} columns={complaintColumns} dataSource={complaintData} rowKey="key" locale={{ emptyText: 'No complaints' }} />
            </Card>
          </Col>
          <Col xs={24} md={6}>
            <Card title="System Resource Monitor">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Text>CPU</Text>
                  <Progress percent={20} size="small" status="active" />
                </div>
                <div>
                  <Text>Memory</Text>
                  <Progress percent={60} size="small" status="active" strokeColor="#13C2C2" />
                </div>
                <div>
                  <Text>Disk</Text>
                  <Progress percent={30} size="small" status="exception" />
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <Space>
                  <CloudServerOutlined /> <Text type="secondary">Uptime: 4d 12h</Text>
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </AdminLayout>
  );
}