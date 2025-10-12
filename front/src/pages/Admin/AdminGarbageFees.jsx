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
  const [paySummary, setPaySummary] = useState(null);
  const [payHousehold, setPayHousehold] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewHousehold, setViewHousehold] = useState(null);

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
      // Don't show error for now as this endpoint might not exist yet
    }
  };

  const fetchFeeSummary = async (householdId, monthStr) => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/households/${householdId}/garbage`, {
        headers: authHeaders(),
        params: { month: monthStr },
      });
      setPaySummary(res.data);
      payForm.setFieldsValue({
        month: dayjs(`${monthStr}-01`),
        totalCharge: Number(res.data.totalCharge || 0),
        amount: Number(res.data.balance || res.data.totalCharge || 0),
        method: undefined,
        reference: undefined,
      });
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load garbage fee summary");
    }
  };

  const openPayFee = async (household) => {
    const monthStr = dayjs().format("YYYY-MM");
    setPayHousehold(household);
    setPayOpen(true);
    await fetchFeeSummary(household._id, monthStr);
  };

  const onPayMonthChange = async (date) => {
    const monthStr = dayjs(date).format("YYYY-MM");
    if (payHousehold?._id) {
      await fetchFeeSummary(payHousehold._id, monthStr);
    }
  };

  const submitPayFee = async () => {
    try {
      setPayLoading(true);
      const values = await payForm.validateFields();
      const payload = {
        month: dayjs(values.month).format("YYYY-MM"),
        amount: Number(values.amount),
        totalCharge: Number(values.totalCharge),
        method: values.method,
        reference: values.reference,
      };
      const res = await axios.post(
        `${API_BASE}/api/admin/households/${payHousehold._id}/garbage/pay`,
        payload,
        { headers: authHeaders() }
      );
      
      if (res.data.status === "paid") {
        message.success("Garbage fee fully paid!");
      } else {
        message.success("Partial payment recorded!");
      }
      
      // Reset form and state
      setPayOpen(false);
      setPaySummary(null);
      setPayHousehold(null);
      payForm.resetFields();
      
      // Refresh all data
      fetchHouseholds();
      fetchGarbagePayments();
      fetchStatistics(); // Also refresh statistics
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setPayLoading(false);
    }
  };

  const openView = (household) => {
    setViewHousehold(household);
    setViewOpen(true);
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
      const monthlyRate = 150;
      const totalExpectedRevenue = totalHouseholds * monthlyRate;
      const totalCollected = households.reduce((sum, h) => sum + (h.garbageFee?.amountPaid || 0), 0);
      const totalOutstanding = totalExpectedRevenue - totalCollected;
      const collectionRate = totalExpectedRevenue > 0 ? ((totalCollected / totalExpectedRevenue) * 100).toFixed(1) : 0;
      
      setStats({
        totalHouseholds,
        monthlyRate,
        expectedRevenue: totalExpectedRevenue,
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
      title: "Current Month Fee",
      key: "currentFee",
      render: () => `₱${stats.monthlyRate ? stats.monthlyRate.toFixed(2) : "150.00"}`,
    },
    {
      title: "Payment Status",
      key: "paymentStatus",
      render: (_, record) => {
        const status = record.garbageFee?.status || 'unpaid';
        if (status === 'paid') {
          return <Tag color="green">Paid</Tag>;
        } else if (status === 'partial') {
          return <Tag color="orange">Partial</Tag>;
        } else {
          return <Tag color="red">Unpaid</Tag>;
        }
      },
    },
    {
      title: "Balance",
      key: "balance",
      render: (_, record) => {
        const balance = record.garbageFee?.balance || stats.monthlyRate || 150;
        return `₱${balance.toFixed(2)}`;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openView(r)}>View</Button>
          <Button type="primary" size="small" onClick={() => openPayFee(r)}>
            Record Payment
          </Button>
        </div>
      ),
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
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600 self-center">
                Collection Rate: {stats.collectionRate || 0}%
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filteredHouseholds}
              columns={columns}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </div>
        </div>

        {/* Pay Garbage Fee Modal */}
        <Modal
          title={`Record Garbage Fee Payment${payHousehold ? ` — ${payHousehold.householdId}` : ""}`}
          open={payOpen}
          onCancel={() => { setPayOpen(false); setPayHousehold(null); setPaySummary(null); }}
          onOk={submitPayFee}
          okText="Record Payment"
          confirmLoading={payLoading}
          width={520}
        >
          <Form form={payForm} layout="vertical">
            <Form.Item label="Fee Type">
              <Input disabled value="Garbage Collection Fee" />
            </Form.Item>
            <Form.Item
              name="month"
              label="Month"
              rules={[{ required: true, message: "Select month" }]}
            >
              <DatePicker picker="month" className="w-full" onChange={onPayMonthChange} />
            </Form.Item>
            <Form.Item
              name="totalCharge"
              label="Total Charge for Month"
              rules={[{ required: true, message: "Enter total charge" }]}
            >
              <InputNumber className="w-full" min={0} step={50} />
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

            {paySummary && (
              <div className="p-2 rounded border border-slate-200 bg-slate-50 text-sm">
                <div>Paid so far: ₱{Number(paySummary.amountPaid || 0).toFixed(2)}</div>
                <div>Balance: ₱{Number(paySummary.balance || 0).toFixed(2)}</div>
                <div>Status: {paySummary.status}</div>
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
              <Descriptions.Item label="Current Garbage Fee">
                ₱{monthlyRate.toFixed(2)}/month
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                {(() => {
                  const balance = viewHousehold.garbageFee?.balance || monthlyRate;
                  if (balance === 0) {
                    return <Tag color="green">Fully Paid</Tag>;
                  } else if (balance < monthlyRate) {
                    return <Tag color="orange">Partially Paid</Tag>;
                  } else {
                    return <Tag color="red">Unpaid</Tag>;
                  }
                })()}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}