
import React, { useMemo, useState, useEffect } from 'react';
import { AdminLayout } from './AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Tag, Progress, Space, Divider, Spin, message } from 'antd';
import { UserOutlined, TeamOutlined, FileProtectOutlined, DollarCircleOutlined, ThunderboltOutlined, CloudServerOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#1677FF', '#13C2C2', '#69C0FF', '#FFC53D', '#F759AB'];
const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";


export default function AdminDashboard() {
  const [data, setData] = useState({
    residents: [], officials: [], docRequests: [], complaints: [],
    financialDashboard: null, financialTotal: 0
  });
  const [loading, setLoading] = useState(true);
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    const abort = new AbortController();
    (async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const endpoints = [
          `${API_BASE}/api/admin/residents`,
          `${API_BASE}/api/admin/officials`,
          `${API_BASE}/api/admin/document-requests`,
          `${API_BASE}/api/admin/complaints`,
          `${API_BASE}/api/admin/financial/dashboard`,
          `${API_BASE}/api/admin/financial/transactions?limit=1`
        ];
        const res = await Promise.all(endpoints.map(url => fetch(url, { headers, signal: abort.signal })));
        if (!res.every(r => r.ok)) throw new Error('Failed to load dashboard');
        const [residents, officials, docRequests, complaints, financialDashboard, finTx] = await Promise.all(res.map(r => r.json()));
        setData({
          residents: Array.isArray(residents) ? residents : [],
          officials: Array.isArray(officials) ? officials : [],
          docRequests: Array.isArray(docRequests) ? docRequests : [],
          complaints: Array.isArray(complaints) ? complaints : [],
          financialDashboard,
          financialTotal: finTx?.total || 0
        });
      } catch (e) {
        if (e.name !== 'AbortError') message.error(e.message || 'Failed to load dashboard');
      } finally { setLoading(false); }
    })();
    return () => abort.abort();
  }, []);

  const { residents, officials, docRequests, complaints, financialDashboard, financialTotal } = data;
  const totalResidents = residents.length;
  const activeOfficials = officials.filter(o => o.isActive).length;
  const pendingDocRequests = docRequests.filter(d => d.status === 'pending').length;

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

  const requestTrendData = useMemo(() => {
    const map = new Map(MONTHS.map(m => [m, 0]));
    docRequests.forEach(d => {
      const dt = d.requestedAt || d.createdAt; if (!dt) return;
      const label = MONTHS[new Date(dt).getMonth()];
      map.set(label, (map.get(label) || 0) + 1);
    });
    return MONTHS.map(m => ({ month: m, value: map.get(m) }));
  }, [docRequests]);

  const financialFlowData = useMemo(() => {
    if (!financialDashboard) return [];
    const sum = arr => (arr||[]).reduce((acc,cur)=>acc+cur.total,0);
    return [
      { name: 'Revenue', value: sum(financialDashboard.revenues) },
      { name: 'Expenses', value: sum(financialDashboard.expenses) },
      { name: 'Allocations', value: sum(financialDashboard.allocations) },
    ];
  }, [financialDashboard]);

  const docRequestColumns = [
    { title: 'Resident', dataIndex: 'resident' },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Requested', dataIndex: 'requested' },
    { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'pending' ? 'gold' : s === 'completed' ? 'green' : s === 'declined' ? 'red':'blue'}>{s}</Tag> },
  ];
  const docRequestData = useMemo(() => docRequests.slice(0,5).map((d,i) => ({
    key: d._id || i,
    resident: d.residentId ? `${d.residentId.firstName||''} ${d.residentId.lastName||''}`.trim() : '—',
    type: d.documentType,
    requested: d.requestedAt ? new Date(d.requestedAt).toLocaleDateString() : '—',
    status: d.status
  })), [docRequests]);

  const complaintColumns = [
    { title: 'Resident', dataIndex: 'resident' },
    { title: 'Title', dataIndex: 'title' },
    { title: 'Date', dataIndex: 'date' },
    { title: 'Status', dataIndex: 'status', render: s => <Tag color={{pending:'gold', investigating:'blue', resolved:'green', closed:'default'}[s] || 'default'}>{s}</Tag> },
  ];
  const complaintData = useMemo(() => complaints.slice(0,5).map(c => ({
    key: c._id,
    resident: c.residentId ? `${c.residentId.firstName||''} ${c.residentId.lastName||''}`.trim() : '—',
    title: c.title,
    date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—',
    status: c.status
  })), [complaints]);

  // Card rendering helper
  const StatCard = ({ title, icon, value }) => (
    <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between p-0">
        <CardTitle className="text-sm font-bold text-black">{title}</CardTitle>
        <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-black">{loading ? <Spin size="small" /> : value}</div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        {/* Navbar */}
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <span className="text-2xl md:text-4xl font-bold text-gray-800">Dashboard</span>
            <div className="flex items-center outline outline-1 rounded-2xl p-5 gap-3">
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
              <StatCard title="Total Residents" icon={<TeamOutlined className="h-4 w-4" />} value={totalResidents} />
              <StatCard title="Active Officials" icon={<UserOutlined className="h-4 w-4" />} value={activeOfficials} />
              <StatCard title="Pending Requests" icon={<FileProtectOutlined className="h-4 w-4" />} value={pendingDocRequests} />
              <StatCard title="Financial Transactions" icon={<DollarCircleOutlined className="h-4 w-4" />} value={financialTotal} />
            </div>
          </div>
        </div>

        {/* Charts and Analytics Section */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Population Breakdown */}
            <Card className="bg-slate-50 rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-black">Population Breakdown</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 280 }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full"><Spin /></div>
                ) : populationData.length ? (
                  <>
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie data={populationData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                          {populationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <Divider style={{ margin: '8px 0' }} />
                    <Space size={12} wrap>
                      {populationData.map((p, i) => (
                        <Space key={p.name} size={4}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS[i], borderRadius: 2 }} />
                          <span className="text-sm">{p.name} ({populationTotal ? Math.round((p.value / populationTotal) * 100) : 0}%)</span>
                        </Space>
                      ))}
                    </Space>
                  </>
                ) : <div className="flex items-center justify-center h-full text-gray-500">No data available</div>}
              </CardContent>
            </Card>
            {/* Monthly Requests Trend */}
            <Card className="bg-slate-50 rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-black">Monthly Requests Trend</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 280 }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full"><Spin /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={requestTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#1677FF" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            {/* Financial Flow */}
            <Card className="bg-slate-50 rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-black">Financial Flow</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 280 }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full"><Spin /></div>
                ) : financialFlowData.length ? (
                  <>
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie data={financialFlowData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                          {financialFlowData.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <Divider style={{ margin: '8px 0' }} />
                    <Space size={12} wrap>
                      {financialFlowData.map((p, i) => (
                        <Space key={p.name} size={4}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS[(i + 1) % COLORS.length], borderRadius: 2 }} />
                          <span className="text-sm">{p.name}</span>
                        </Space>
                      ))}
                    </Space>
                  </>
                ) : <div className="flex items-center justify-center h-full text-gray-500">No data available</div>}
              </CardContent>
            </Card>
            {/* Blockchain Status */}
            <Card className="bg-slate-50 rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-black">Blockchain Network Status</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 280 }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div className="text-sm font-medium">All 4 peers active</div>
                  <Space wrap>
                    <Tag color="green">Peer 1</Tag>
                    <Tag color="green">Peer 2</Tag>
                    <Tag color="green">Peer 3</Tag>
                    <Tag color="green">Peer 4</Tag>
                  </Space>
                  <Divider style={{ margin: '8px 0' }} />
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Last block height: 1289</div>
                    <div>Latency: 120ms</div>
                    <div>Chaincode: barangaycc@1.0</div>
                  </div>
                </Space>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tables Section */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <Card className="bg-slate-50 rounded-2xl shadow-md lg:col-span-1 xl:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-black flex items-center gap-2">
                  <ThunderboltOutlined /> Recent Document Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-32"><Spin /></div>
                ) : (
                  <Table size="small" pagination={false} columns={docRequestColumns} dataSource={docRequestData} rowKey="key" className="text-sm" />
                )}
              </CardContent>
            </Card>
            <Card className="bg-slate-50 rounded-2xl shadow-md lg:col-span-1 xl:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-black flex items-center gap-2">
                  <FileProtectOutlined /> Recent Complaints
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-32"><Spin /></div>
                ) : (
                  <Table size="small" pagination={false} columns={complaintColumns} dataSource={complaintData} rowKey="key" locale={{ emptyText: 'No complaints' }} className="text-sm" />
                )}
              </CardContent>
            </Card>
            <Card className="bg-slate-50 rounded-2xl shadow-md lg:col-span-2 xl:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-black">System Resource Monitor</CardTitle>
              </CardHeader>
              <CardContent>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div><div className="text-sm font-medium mb-2">CPU</div><Progress percent={20} size="small" status="active" /></div>
                  <div><div className="text-sm font-medium mb-2">Memory</div><Progress percent={60} size="small" status="active" strokeColor="#13C2C2" /></div>
                  <div><div className="text-sm font-medium mb-2">Disk</div><Progress percent={30} size="small" status="exception" /></div>
                  <Divider style={{ margin: '8px 0' }} />
                  <Space><CloudServerOutlined /> <span className="text-xs text-gray-500">Uptime: 4d 12h</span></Space>
                </Space>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}