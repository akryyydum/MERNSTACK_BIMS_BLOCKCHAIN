import React, { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Descriptions, Tag, Select, message, Form } from "antd";
import { AdminLayout } from "./AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { UserOutlined } from "@ant-design/icons";
import axios from "axios";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

export default function AdminDocumentRequests() {

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRequest, setViewRequest] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [residents, setResidents] = useState([]);

  const [createForm] = Form.useForm();

  const userProfile =JSON.parse(localStorage.getItem("userProfile")) || {};
  const username = userProfile.username || localStorage.getItem("username") || "Admin";

  useEffect(() => {
    fetchRequests();
    fetchResidents();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/document-requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data);
    } catch (error) {
      console.error("Error fetching document requests:", error);
      message.error("Failed to load document requests.");
    }
    setLoading(false);
  };

  const fetchResidents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/residents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResidents(res.data);
    } catch (err) {
      message.error("Failed to load residents");
    }
  };

  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === "PENDING").length;
  const approvedRequests = requests.filter(r => r.status === "APPROVED").length;
  const rejectedRequests = requests.filter(r => r.status === "REJECTED").length;
  const releasedRequests = requests.filter(r => r.status === "RELEASED").length;

  const columns = [
    {
      title: "Resident",
      key: "resident",
      render: (_, r) =>
        r.residentId
          ? [r.residentId.firstName, r.residentId.middleName, r.residentId.lastName].filter(Boolean).join(" ")
          : "-",
    },
    {
      title: "Civil Status",
      key: "civilStatus",
      render: (_, r) => r.residentId?.civilStatus || "-",
    },
    {
      title: "Purok",
      key: "purok",
      render: (_, r) => r.residentId?.address?.purok || "-",
    },
    {
      title: "Document Type",
      dataIndex: "documentType",
      key: "documentType",
    },
    {
      title: "Purpose",
      dataIndex: "purpose",
      key: "purpose",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: v => {
        let color = "default";
        if (v === "PENDING") color = "orange";
        else if (v === "APPROVED") color = "green";
        else if (v === "REJECTED") color = "red";
        else if (v === "RELEASED") color = "blue";
        return <Tag color={color} className="capitalize">{v}</Tag>;
      },
    },
    {
      title: "Requested At",
      dataIndex: "requestedAt",
      key: "requestedAt",
      render: v => (v ? new Date(v).toLocaleString() : ""),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => { openView(r); }}>View Details</Button>
          <Button size="small" onClick={() => handlePrint(r)}>Print</Button>
        </div>
      ),
    }
  ];

  const filteredRequests = requests.filter(r =>
  [
    r.residentId?.firstName,
    r.residentId?.middleName,
    r.residentId?.lastName,
    r.residentId?.suffix,
    r.documentType,
    r.purpose,
    r.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(search.toLowerCase())
);

   const openView = (request) => {
    setViewRequest(request);
    setViewOpen(true);
   };

   async function loadFile(url) {
  const response = await fetch(url);
  return await response.arrayBuffer();
}

const handlePrint = async (record) => {
  const fullName = record.residentId
    ? [record.residentId.firstName, record.residentId.middleName, record.residentId.lastName, record.residentId.suffix]
        .filter(Boolean)
        .join(" ")
    : "-";

  const data = {
    name: fullName,
    civilStatus: record.residentId?.civilStatus || "-",
    purok: record.residentId?.address?.purok || "-",
    docType: record.documentType || "-",
    purpose: record.purpose || "-",
  };

  try {
    // 1. Load the template
    const content = await loadFile("/BARANGAY CLEARANCE.docx"); // adjust filename as needed
    const zip = new PizZip(content);

    // 2. Render the template
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(data);

    // 3. Export modified file
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    saveAs(out, `document-request-${fullName.replace(/\s+/g, "_")}.docx`);
  } catch (err) {
    console.error("Error generating document:", err);
    message.error("Failed to generate document.");
  }
};

  return (
    <AdminLayout>
     <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        {/* Navbar */}
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Document Requests
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
          {/* Statistics Section */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Total Requests
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {totalRequests}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {totalRequests}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Pending
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {pendingRequests}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {pendingRequests}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Approved
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {approvedRequests}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {approvedRequests}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Rejected
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {rejectedRequests}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {rejectedRequests}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 text-black rounded-2xl shadow-md py-4 p-4 transition duration-200 hover:scale-105 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold text-black">
                    Released
                  </CardTitle>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                    <ArrowUpRight className="h-3 w-3" />
                    {releasedRequests}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-black">
                    {releasedRequests}
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
                placeholder="Search document requests"
                onSearch={v => setSearch(v.trim())}
                value={search}
                onChange={e => setSearch(e.target.value)}
                enterButton
                className="min-w-[180px] max-w-xs"
              />
              <Button type="primary" onClick={() => setCreateOpen(true)}>
                Create Request Document
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filteredRequests}
              columns={columns}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </div>
        </div>
        {/* View Request Modal */}
        <Modal
          title="Document Request Details"
          open={viewOpen}
          onCancel={() => setViewOpen(false)}
          footer={null}
          width={700}
        >
          {viewRequest && (
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Resident">
                {viewRequest.residentId
                  ? [viewRequest.residentId.firstName, viewRequest.residentId.middleName, viewRequest.residentId.lastName, viewRequest.residentId.suffix].filter(Boolean).join(" ")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Civil Status">
                {viewRequest.residentId?.civilStatus || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Purok">
                {viewRequest.residentId?.address?.purok || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Document Type">{viewRequest.documentType}</Descriptions.Item>
              <Descriptions.Item label="Purpose">{viewRequest.purpose}</Descriptions.Item>
              <Descriptions.Item label="Status">{viewRequest.status}</Descriptions.Item>
              <Descriptions.Item label="Requested At">{viewRequest.requestedAt ? new Date(viewRequest.requestedAt).toLocaleString() : ""}</Descriptions.Item>
              <Descriptions.Item label="Updated At">{viewRequest.updatedAt ? new Date(viewRequest.updatedAt).toLocaleString() : ""}</Descriptions.Item>
              <Descriptions.Item label="Blockchain Hash">{viewRequest.blockchain?.hash || "-"}</Descriptions.Item>
              <Descriptions.Item label="Blockchain TxID">{viewRequest.blockchain?.lastTxId || "-"}</Descriptions.Item>
              <Descriptions.Item label="Issued By">{viewRequest.blockchain?.issuedBy || "-"}</Descriptions.Item>
              <Descriptions.Item label="Issued At">{viewRequest.blockchain?.issuedAt ? new Date(viewRequest.blockchain.issuedAt).toLocaleString() : "-"}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
        {/* Create Request Modal */}
        <Modal
          title="Create Document Request"
          open={createOpen}
          onCancel={() => setCreateOpen(false)}
          onOk={async () => {
            try {
              setCreating(true);
              const values = await createForm.validateFields();
              const token = localStorage.getItem("token");
              await axios.post(
                `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/admin/document-requests`,
                values,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              message.success("Document request created!");
              setCreateOpen(false);
              createForm.resetFields();
              fetchRequests();
            } catch (err) {
              message.error(err?.response?.data?.message || "Failed to create document request");
            }
            setCreating(false);
          }}
          confirmLoading={creating}
          okText="Create"
          width={600}
        >
          <Form form={createForm} layout="vertical">
            <Form.Item name="residentId" label="Resident" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Select resident"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {residents.map(r => (
                  <Select.Option key={r._id} value={r._id}>
                    {[r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(" ")}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="requestedBy" label="Requested By" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Select requester"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {residents.map(r => (
                  <Select.Option key={r._id} value={r._id}>
                    {[r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(" ")}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="documentType" label="Document Type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "Barangay Certificate", label: "Barangay Certificate" },
                  { value: "Indigency", label: "Indigency" },
                  { value: "Barangay Clearance", label: "Barangay Clearance" },
                  { value: "Residency", label: "Residency" },
                  { value: "Business Clearance", label: "Business Clearance" },
                ]}
              />
            </Form.Item>
            <Form.Item name="purpose" label="Purpose" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
