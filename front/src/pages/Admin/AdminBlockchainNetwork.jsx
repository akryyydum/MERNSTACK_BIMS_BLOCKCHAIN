import React, { useState } from "react";
import { Table, Input, Button, Tag, message } from "antd";
import { SearchOutlined, FileTextOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import AdminSidebar from "./AdminSidebar";

export default function AdminBlockchainNetwork() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const handleSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${baseURL}/api/requests?type=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
      message.error("Search failed, please try again.");
    }
    setLoading(false);
  }; 

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
      dataIndex: "residentId",
      key: "residentId",
      render: (v) => <span>{v}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) => {
        let color = "default";
        if (v === "Pending") color = "orange";
        if (v === "Accepted") color = "green";
        if (v === "Declined") color = "red";
        if (v === "Completed") color = "blue";
        return <Tag color={color}>{v}</Tag>;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">Search Document Requests</h1>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Enter document type (e.g. Barangay Clearance)"
            allowClear
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
            prefix={<SearchOutlined />}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
          >
            Search
          </Button>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <Table
            rowKey="requestId"
            loading={loading}
            dataSource={results}
            columns={columns}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
          />
        </div>
      </div>
    </div>
  );
}
