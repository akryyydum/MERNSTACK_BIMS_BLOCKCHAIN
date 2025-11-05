
import React, { useMemo, useState, useEffect } from 'react';
import { AdminLayout } from './AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, Tag, Progress, Space, Divider, Spin, message, Button } from 'antd';
import { UserOutlined, TeamOutlined, FileProtectOutlined, DollarCircleOutlined, ThunderboltOutlined, CloudServerOutlined, ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#1677FF', '#13C2C2', '#69C0FF', '#FFC53D', '#F759AB'];
const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "#000000",
  },
  requests: {
    label: "Document Requests",
    color: "#3b82f6",
  },
  complaints: {
    label: "Complaints",
    color: "#f59e0b",
  },
  male: {
    label: "Male",
    color: "#60a5fa",
  },
  female: {
    label: "Female",
    color: "#f472b6",
  },
  value: {
    label: "Value",
    color: "#22c55e",
  },
};


export default function AdminDashboard() {
  const [data, setData] = useState({
    residents: [], officials: [], docRequests: [], complaints: [],
    financialDashboard: null, financialTotal: 0,
    payments: [],
    blockchain: null
  });
  const [loading, setLoading] = useState(true);
  const [requestTrendPeriod, setRequestTrendPeriod] = useState('12months'); // '7days' | '12months'
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
          `${API_BASE}/api/admin/financial/transactions?limit=1`,
          `${API_BASE}/api/admin/financial/transactions?limit=10`
        ];
        // Load core dashboard data first and tolerate partial failures
        const settled = await Promise.allSettled(
          endpoints.map(url => fetch(url, { headers, signal: abort.signal }))
        );
        const jsons = await Promise.all(
          settled.map(async (r) => (r.status === 'fulfilled' && r.value.ok) ? r.value.json() : null)
        );
        const [residents, officials, docRequests, complaints, financialDashboard, finTx, paymentsResponse] = jsons;

        // Fetch blockchain status separately; don't block dashboard if it fails
        let blockchain = null;
        try {
          const r = await fetch(`${API_BASE}/api/blockchain/status`, { headers, signal: abort.signal });
          blockchain = r.ok ? await r.json() : { ok: false, message: `Status ${r.status}` };
        } catch (err) {
          blockchain = { ok: false, message: 'Blockchain unreachable' };
        }

        setData({
          residents: Array.isArray(residents) ? residents : [],
          officials: Array.isArray(officials) ? officials : [],
          docRequests: Array.isArray(docRequests) ? docRequests : [],
          complaints: Array.isArray(complaints) ? complaints : [],
          financialDashboard: financialDashboard || null,
          financialTotal: (finTx && typeof finTx.total === 'number') ? finTx.total : 0,
          payments: paymentsResponse?.transactions || [],
          blockchain
        });
      } catch (e) {
        if (e.name !== 'AbortError') message.error(e.message || 'Failed to load dashboard');
      } finally { setLoading(false); }
    })();
    return () => abort.abort();
  }, []);

  const { residents, officials, docRequests, complaints, financialDashboard, financialTotal, payments, blockchain } = data;
  const totalResidents = residents.length;
  const activeOfficials = officials.filter(o => o.isActive).length;
  const pendingDocRequests = docRequests.filter(d => d.status === 'pending').length;

  // Calculate statistics with trends
  const statsData = useMemo(() => {
    const now = new Date();
    const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    // New subscriptions (residents added this week)
    const residentsThisWeek = residents.filter(r => r.createdAt && new Date(r.createdAt) >= lastWeekStart).length;
    const residentsLastWeek = residents.filter(r => {
      if (!r.createdAt) return false;
      const date = new Date(r.createdAt);
      return date >= new Date(lastWeekStart.getTime() - 7*24*60*60*1000) && date < lastWeekStart;
    }).length;
    const residentsChange = residentsLastWeek > 0 ? ((residentsThisWeek - residentsLastWeek) / residentsLastWeek * 100).toFixed(1) : (residentsThisWeek > 0 ? 100 : 0);
    
    // New orders (document requests this week)
    const ordersThisWeek = docRequests.filter(d => {
      const date = d.requestedAt || d.createdAt;
      return date && new Date(date) >= lastWeekStart;
    }).length;
    const ordersLastWeek = docRequests.filter(d => {
      const date = d.requestedAt || d.createdAt;
      if (!date) return false;
      const dt = new Date(date);
      return dt >= new Date(lastWeekStart.getTime() - 7*24*60*60*1000) && dt < lastWeekStart;
    }).length;
    const ordersChange = ordersLastWeek > 0 ? ((ordersThisWeek - ordersLastWeek) / ordersLastWeek * 100).toFixed(1) : (ordersThisWeek > 0 ? 100 : 0);
    
    // Average order revenue (average financial transactions this week)
    const financialThisWeek = (financialDashboard?.revenues || [])
      .filter(r => r.date && new Date(r.date) >= lastWeekStart)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const ordersThisWeekCount = ordersThisWeek || 1;
    const avgOrderRevenue = Math.round(financialThisWeek / ordersThisWeekCount);
    
    const financialLastWeek = (financialDashboard?.revenues || [])
      .filter(r => {
        if (!r.date) return false;
        const dt = new Date(r.date);
        return dt >= new Date(lastWeekStart.getTime() - 7*24*60*60*1000) && dt < lastWeekStart;
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const ordersLastWeekCount = ordersLastWeek || 1;
    const avgLastWeek = Math.round(financialLastWeek / ordersLastWeekCount);
    const avgChange = avgLastWeek > 0 ? ((avgOrderRevenue - avgLastWeek) / avgLastWeek * 100).toFixed(1) : (avgOrderRevenue > 0 ? 100 : 0);
    
    // Total revenue this month
    const currentMonth = now.getMonth();
    const totalRevenue = (financialDashboard?.revenues || [])
      .filter(r => r.date && new Date(r.date).getMonth() === currentMonth)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    const lastMonthRevenue = (financialDashboard?.revenues || [])
      .filter(r => {
        if (!r.date) return false;
        const dt = new Date(r.date);
        return dt.getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1);
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const revenueChange = lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : (totalRevenue > 0 ? 100 : 0);
    
    return {
      totalResidents: { value: totalResidents, change: parseFloat(residentsChange), sinceLast: 'Since Last week' },
      pendingRequests: { value: ordersThisWeek, change: parseFloat(ordersChange), sinceLast: 'Since Last week' },
      totalTransactions: { value: financialTotal, change: parseFloat(avgChange), sinceLast: 'Since Last week' },
      totalRevenue: { value: totalRevenue, change: parseFloat(revenueChange), sinceLast: 'from last month' }
    };
  }, [residents, docRequests, financialDashboard, financialTotal]);

  // Revenue trend for line chart (last 12 months)
  const revenueTrendData = useMemo(() => {
    const monthlyData = new Map(MONTHS.map(m => [m, 0]));
    (financialDashboard?.revenues || []).forEach(r => {
      if (!r.date) return;
      const monthLabel = MONTHS[new Date(r.date).getMonth()];
      monthlyData.set(monthLabel, (monthlyData.get(monthLabel) || 0) + (r.amount || 0));
    });
    return MONTHS.map(m => ({ month: m, value: monthlyData.get(m) }));
  }, [financialDashboard]);

  // Request trend data (dual area chart showing document requests and complaints over months)
  const requestTrendData = useMemo(() => {
    const monthlyDocRequests = new Map(MONTHS.map(m => [m, 0]));
    const monthlyComplaints = new Map(MONTHS.map(m => [m, 0]));
    
    docRequests.forEach(d => {
      const date = d.requestedAt || d.createdAt;
      if (!date) return;
      const monthLabel = MONTHS[new Date(date).getMonth()];
      monthlyDocRequests.set(monthLabel, (monthlyDocRequests.get(monthLabel) || 0) + 1);
    });
    
    complaints.forEach(c => {
      if (!c.createdAt) return;
      const monthLabel = MONTHS[new Date(c.createdAt).getMonth()];
      monthlyComplaints.set(monthLabel, (monthlyComplaints.get(monthLabel) || 0) + 1);
    });
    
    return MONTHS.map(m => ({ 
      month: m, 
      requests: monthlyDocRequests.get(m),
      complaints: monthlyComplaints.get(m)
    }));
  }, [docRequests, complaints]);

  // Filtered request trend data based on selected period
  const filteredRequestTrendData = useMemo(() => {
    const now = new Date();
    
    if (requestTrendPeriod === '7days') {
      // Last 7 days
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dayLabel = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const requestsCount = docRequests.filter(d => {
          const date = d.requestedAt || d.createdAt;
          if (!date) return false;
          const dDate = new Date(date);
          return dDate.toDateString() === targetDate.toDateString();
        }).length;
        
        const complaintsCount = complaints.filter(c => {
          if (!c.createdAt) return false;
          const cDate = new Date(c.createdAt);
          return cDate.toDateString() === targetDate.toDateString();
        }).length;
        
        data.push({ month: dayLabel, requests: requestsCount, complaints: complaintsCount });
      }
      return data;
    } else {
      // Last 12 months - use existing monthly data
      return requestTrendData;
    }
  }, [requestTrendPeriod, docRequests, complaints, requestTrendData]);

  // Gender demographics data (pie/bar chart showing male and female residents)
  const genderDemographicsData = useMemo(() => {
    const counts = { male: 0, female: 0 };
    residents.forEach(r => {
      const gender = r.gender || r.sex;
      if (gender === 'male') {
        counts.male += 1;
      } else if (gender === 'female') {
        counts.female += 1;
      } else {

      }
    });
    
    return [
      { name: 'Male', value: counts.male, percentage: residents.length > 0 ? ((counts.male / residents.length) * 100).toFixed(1) : 0 },
      { name: 'Female', value: counts.female, percentage: residents.length > 0 ? ((counts.female / residents.length) * 100).toFixed(1) : 0 }
    ];
  }, [residents]);

  const populationData = useMemo(() => {
    if (!residents.length) return [];
    const counts = { male:0, female:0 };
    residents.forEach(r => { counts[r.gender] = (counts[r.gender]||0)+1; });
    return [
      { name: 'Male', value: counts.male },
      { name: 'Female', value: counts.female }
    ];
  }, [residents]);
  const populationTotal = useMemo(() => populationData.reduce((a,b)=>a+b.value,0), [populationData]);

  const financialFlowData = useMemo(() => {
    if (!financialDashboard) return [];
    const sum = arr => (arr||[]).reduce((acc,cur)=>acc+cur.total,0);
    return [
      { name: 'Revenue', value: sum(financialDashboard.revenues) },
      { name: 'Expenses', value: sum(financialDashboard.expenses) },
      { name: 'Allocations', value: sum(financialDashboard.allocations) },
    ];
  }, [financialDashboard]);

  // Generate trend data for metric cards (last 7 days)
  const generateTrendData = useMemo(() => {
    const now = new Date();
    
    // Residents trend (last 7 days)
    const residentsTrend = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const count = residents.filter(r => {
        if (!r.createdAt) return false;
        const rDate = new Date(r.createdAt);
        return rDate.toDateString() === targetDate.toDateString();
      }).length;
      residentsTrend.push({ x: 6 - i, y: count });
    }
    
    // Document requests trend (last 7 days)
    const docRequestsTrend = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const count = docRequests.filter(d => {
        const date = d.requestedAt || d.createdAt;
        if (!date) return false;
        const dDate = new Date(date);
        return dDate.toDateString() === targetDate.toDateString();
      }).length;
      docRequestsTrend.push({ x: 6 - i, y: count });
    }
    
    // Revenue trend (last 7 days)
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const total = (financialDashboard?.revenues || [])
        .filter(r => {
          if (!r.date) return false;
          const rDate = new Date(r.date);
          return rDate.toDateString() === targetDate.toDateString();
        })
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      revenueTrend.push({ x: 6 - i, y: total });
    }
    
    return {
      residents: residentsTrend,
      docRequests: docRequestsTrend,
      revenue: revenueTrend
    };
  }, [residents, docRequests, financialDashboard]);

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

  const paymentColumns = [
    { title: 'Resident', dataIndex: 'resident' },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'pending' ? 'gold' : s === 'completed' || s === 'paid' ? 'green' : s === 'failed' || s === 'cancelled' ? 'red' : 'blue'}>{s || 'pending'}</Tag> },
    { title: 'Date', dataIndex: 'date' },
  ];
  const paymentData = useMemo(() => payments.slice(0,5).map((p,i) => {
    // Handle both regular transactions and utility payments
    let residentName = '—';
    if (p.residentName) {
      residentName = p.residentName;
    } else if (p.resident) {
      residentName = p.resident;
    } else if (p.residentId) {
      residentName = `${p.residentId.firstName||''} ${p.residentId.lastName||''}`.trim();
    }
    
    return {
      key: p._id || i,
      resident: residentName || '—',
      type: p.type || p.category || '—',
      status: p.status || 'pending',
      date: p.transactionDate || p.date || p.createdAt ? new Date(p.transactionDate || p.date || p.createdAt).toLocaleDateString() : '—'
    };
  }), [payments]);

  // Card rendering helper
  const MetricCard = ({ icon, title, value, change, sinceLast, trendData, showInfo = true }) => {
    const isPositive = change >= 0;
    const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
    const TrendIcon = isPositive ? ArrowUpOutlined : ArrowDownOutlined;
    
    // Normalize trend data for visualization
    const normalizedTrend = useMemo(() => {
      if (!trendData || trendData.length === 0) return [];
      const values = trendData.map(d => d.y);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      
      return trendData.map(d => ({
        x: d.x,
        y: min === max ? 50 : ((d.y - min) / range * 40) + 30 // Scale between 30-70
      }));
    }, [trendData]);
    
    return (
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              {icon}
              <span>{title}</span>
            </div>
            {showInfo && <InfoCircleOutlined className="text-gray-400 text-sm" />}
          </div>
          
          <div className="mb-3">
            <div className="text-3xl font-bold text-gray-900">
              {loading ? <Spin size="small" /> : value.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">{sinceLast}</div>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">Details</span>
            <span className={`text-sm font-semibold ml-auto flex items-center gap-1 ${changeColor}`}>
              {Math.abs(change).toFixed(1)}%
              <TrendIcon className="text-xs" />
            </span>
          </div>
          
          {/* Mini trend line */}
          <div className="mt-3 h-8">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={normalizedTrend}>
                  <Line 
                    type="monotone" 
                    dataKey="y" 
                    stroke={isPositive ? "#22c55e" : "#ef4444"} 
                    strokeWidth={1.5} 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        {/* Header */}
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

        {/* Content Container */}
        <div className="px-4 pb-4 space-y-4">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Residents */}
          <MetricCard
            icon={<TeamOutlined />}
            title="Total Residents"
            value={statsData.totalResidents.value}
            change={statsData.totalResidents.change}
            sinceLast={statsData.totalResidents.sinceLast}
            trendData={generateTrendData.residents}
          />
          
          {/* Pending Document Requests */}
          <MetricCard
            icon={<FileProtectOutlined />}
            title="Pending Document Requests"
            value={statsData.pendingRequests.value}
            change={statsData.pendingRequests.change}
            sinceLast={statsData.pendingRequests.sinceLast}
            trendData={generateTrendData.docRequests}
          />
          
          {/* Total Financial Transactions */}
          <MetricCard
            icon={<DollarCircleOutlined />}
            title="Total Financial Transactions"
            value={statsData.totalTransactions.value}
            change={statsData.totalTransactions.change}
            sinceLast={statsData.totalTransactions.sinceLast}
            trendData={generateTrendData.revenue}
          />
          
          {/* Total Revenue */}
          <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-600 mb-2">Total Revenue</div>
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? <Spin size="small" /> : `₱${statsData.totalRevenue.value.toLocaleString()}`}
                </div>
                <div className="text-xs text-green-600 font-medium">
                  +{statsData.totalRevenue.change}% {statsData.totalRevenue.sinceLast}
                </div>
              </div>
              
              <div className="h-16">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueTrendData}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="var(--color-revenue)" 
                        strokeWidth={2} 
                        dot={{ r: 2 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Request Trend - Full Width */}
          <div className="grid grid-cols-1 gap-4">
            {/* Total Request Trend (full width) */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Total Request Trend</h3>
                    <p className="text-sm text-gray-500">
                      {requestTrendPeriod === '7days' ? 'Document requests and complaints in the last 7 days' :
                       'Document requests and complaints from January to December'}
                    </p>
                  </div>
                  <Space>
                    <Button
                      type={requestTrendPeriod === '7days' ? 'primary' : 'default'}
                      onClick={() => setRequestTrendPeriod('7days')}
                    >
                      Last 7 days
                    </Button>
                    <Button
                      type={requestTrendPeriod === '12months' ? 'primary' : 'default'}
                      onClick={() => setRequestTrendPeriod('12months')}
                    >
                      Last 12 months
                    </Button>
                  </Space>
                </div>
              
              <div className="h-80">
                {loading ? (
                  <div className="flex items-center justify-center h-full"><Spin /></div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart 
                        data={filteredRequestTrendData} 
                        margin={{ 
                          top: 10, 
                          right: 30, 
                          left: 0, 
                          bottom: 0 
                        }}
                      >
                        <defs>
                          <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-requests)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="var(--color-requests)" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-complaints)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="var(--color-complaints)" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area 
                          type="monotone" 
                          dataKey="requests" 
                          stroke="var(--color-requests)" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorRequests)" 
                          name="Document Requests"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="complaints" 
                          stroke="var(--color-complaints)" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorComplaints)" 
                          name="Complaints"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Male/Female Demographics and Blockchain Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Male and Female Residents */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Male and Female Residents</h3>
                  <p className="text-sm text-gray-500">Gender distribution of registered residents</p>
                </div>
                
                <div className="h-80">
                  {loading ? (
                    <div className="flex items-center justify-center h-full"><Spin /></div>
                  ) : genderDemographicsData.length && genderDemographicsData.some(d => d.value > 0) ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-1/2 h-full">
                        <ChartContainer config={chartConfig} className="h-full w-full">
                          <PieChart width={249} height={320}>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Pie 
                              data={genderDemographicsData} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={80} 
                              outerRadius={120} 
                              paddingAngle={3}
                              label={({ name, percentage }) => `${name}: ${percentage}%`}
                            >
                              <Cell fill="var(--color-male)" />
                              <Cell fill="var(--color-female)" />
                            </Pie>
                          </PieChart>
                        </ChartContainer>
                      </div>
                      <div className="ml-8">
                        <Space direction="vertical" size={16}>
                          {genderDemographicsData.map((item, index) => (
                            <div key={item.name} className="flex items-center gap-3">
                              <span 
                                style={{ 
                                  display: 'inline-block', 
                                  width: 16, 
                                  height: 16, 
                                  background: index === 0 ? '#60a5fa' : index === 1 ? '#f472b6' : '#a78bfa', 
                                  borderRadius: 4 
                                }} 
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-700">{item.name}</div>
                                <div className="text-lg font-bold text-gray-900">{item.value.toLocaleString()}</div>
                                <div className="text-xs text-gray-500">{item.percentage}% of total</div>
                              </div>
                            </div>
                          ))}
                        </Space>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Blockchain Network Status */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CloudServerOutlined /> Blockchain Network Status
                  </h3>
                </div>
              
              <div className="h-64">
                {loading ? (
                  <div className="flex items-center justify-center h-full"><Spin /></div>
                ) : blockchain?.ok ? (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <div className="text-sm font-medium">
                      {`Peers active: ${Array.isArray(blockchain.peers) ? blockchain.peers.length : 0}`}
                    </div>
                    <Space wrap>
                      {(blockchain.peers || []).map((p, idx) => (
                        <Tag key={p.name || idx} color="green">{p.name || `Peer ${idx+1}`}</Tag>
                      ))}
                    </Space>
                    <Divider style={{ margin: '8px 0' }} />
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Channel: {blockchain.channel || '—'}</div>
                      <div>Last block height: {typeof blockchain.blockHeight === 'number' ? blockchain.blockHeight : '—'}</div>
                      <div>Latency: {typeof blockchain.latencyMs === 'number' ? `${blockchain.latencyMs}ms` : '—'}</div>
                      <div>Chaincode: {blockchain.chaincode?.name || '—'}</div>
                      <div className="text-[10px]">Observed: {blockchain.observedAt ? new Date(blockchain.observedAt).toLocaleString() : '—'}</div>
                    </div>
                  </Space>
                ) : (
                  <div className="flex flex-col items-start justify-center h-full text-gray-500">
                    <div className="font-medium mb-1">Blockchain unavailable</div>
                    <div className="text-xs">{blockchain?.message || 'Could not retrieve network status.'}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                <ThunderboltOutlined /> Recent Document Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32"><Spin /></div>
              ) : (
                <div className="min-w-full">
                  <Table 
                    size="small" 
                    pagination={false} 
                    columns={docRequestColumns} 
                    dataSource={docRequestData} 
                    rowKey="key" 
                    className="text-xs md:text-sm" 
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileProtectOutlined /> Recent Complaints
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32"><Spin /></div>
              ) : (
                <div className="min-w-full">
                  <Table 
                    size="small" 
                    pagination={false} 
                    columns={complaintColumns} 
                    dataSource={complaintData} 
                    rowKey="key" 
                    locale={{ emptyText: 'No complaints' }} 
                    className="text-xs md:text-sm" 
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                <DollarCircleOutlined /> Recent Payment Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32"><Spin /></div>
              ) : (
                <div className="min-w-full">
                  <Table 
                    size="small" 
                    pagination={false} 
                    columns={paymentColumns} 
                    dataSource={paymentData} 
                    rowKey="key" 
                    locale={{ emptyText: 'No payments' }} 
                    className="text-xs md:text-sm" 
                    scroll={{ x: 'max-content' }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}