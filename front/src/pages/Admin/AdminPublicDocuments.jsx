import React, { useEffect, useState } from "react";
import { AdminLayout } from "./AdminSidebar";
import {
  Table,
  Input,
  Button,
  Modal,
  Form,
  Upload,
  Tag,
  message,
  Popconfirm,
  Descriptions,
  Select,
  Spin,
  Alert,
} from "antd";
import {
  UploadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileImageOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
  UserOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORY_COLORS = {
  General: "blue",
  Announcement: "purple",
  Finance: "green",
  Health: "red",
  Education: "orange",
};

function iconFor(mime = "") {
  if (/pdf$/i.test(mime)) return <FilePdfOutlined className="text-red-600" />;
  if (/word|docx?|officedocument\.word/i.test(mime)) return <FileWordOutlined className="text-blue-600" />;
  if (/image/i.test(mime)) return <FileImageOutlined className="text-green-600" />;
  return <FileTextOutlined className="text-gray-500" />;
}

const isPreviewable = (mime = "") => {
  if (!mime) return false;
  const lower = mime.toLowerCase();
  return (
    lower.includes("pdf") ||
    lower.includes("image") ||
    lower.includes("word") ||
    lower.includes("excel") ||
    lower.includes("spreadsheet") ||
    lower.includes("officedocument")
  );
};

export default function AdminPublicDocuments() {
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form] = Form.useForm();
  
  const userProfile = JSON.parse(localStorage.getItem("userProfile")) || {};
  const username =
    userProfile.username || localStorage.getItem("username") || "Admin";

  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${baseURL}/api/admin/public-documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Accept both legacy array and new object shape { mongoDocs, blockchainDocs }
      const list = Array.isArray(res.data) ? res.data : (res.data?.mongoDocs || []);
      setDocs(list);
    } catch (err) {
      console.error("Fetch admin public docs error", err?.response?.status, err?.response?.data);
      message.error("Failed to fetch documents");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const filtered = docs.filter(d =>
    [
      d.title,
      d.description,
      d.category,
      d.originalName,
      d.mimeType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalDocs = docs.length;
  const totalSize = docs.reduce((a, b) => a + (b.size || 0), 0);
  const categories = [...new Set(docs.map(d => d.category || "General"))];
  const topCat = categories
    .map(c => ({
      c,
      count: docs.filter(d => d.category === c).length,
    }))
    .sort((a, b) => b.count - a.count)[0]?.c;

  const handleUpload = async () => {
    try {
      const values = await form.validateFields();
      const fileList = values.file;
      if (!fileList || !fileList.length) {
        message.error("File required");
        return;
      }
      const fileObj = fileList[0].originFileObj;
      if (!fileObj) {
        message.error("File object missing");
        return;
      }
      const fd = new FormData();
      fd.append("title", values.title);
      fd.append("description", values.description || "");
      fd.append("category", values.category || "General");
      fd.append("file", fileObj);

      setUploading(true);
      const token = localStorage.getItem("token");
      await axios.post(`${baseURL}/api/admin/public-documents`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      message.success("Uploaded");
      setUploadOpen(false);
      form.resetFields();
      fetchDocs();
    } catch (e) {
      console.error("Upload error", e?.response?.status, e?.response?.data);
      if (e?.errorFields) return;
      message.error("Upload failed");
    }
    setUploading(false);

  };
  

  const handleDelete = async id => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${baseURL}/api/admin/public-documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs(prev => prev.filter(d => d._id !== id));
      message.success("Deleted");
    } catch {
      message.error("Delete failed");
    }
  };

  const download = async record => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${baseURL}/api/admin/public-documents/${record._id}/download`,
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.originalName || record.title;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("Download failed");
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewDoc(null);
    setPreviewError("");
    setPreviewLoading(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
  };

  const openPreview = async record => {
    if (!isPreviewable(record.mimeType)) {
      message.info("Preview is not available for this file type.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    setPreviewDoc(record);
    setPreviewOpen(true);
    setPreviewError("");
    setPreviewLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${baseURL}/api/admin/public-documents/${record._id}/download`,
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const blobUrl = URL.createObjectURL(res.data);
      setPreviewUrl(blobUrl);
    } catch (err) {
      console.error("Preview error", err?.response?.status, err?.response?.data);
      setPreviewError(
        err?.response?.data?.message || "Unable to load preview for this document"
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  // Verify document integrity against blockchain hash
  const verifyIntegrity = async (record) => {
    if (!record?._id) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${baseURL}/api/admin/public-documents/${record._id}/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res?.data?.isValid) {
        message.success("Document is authentic!");
      } else {
        message.error("Document has been tampered!");
      }
    } catch (err) {
      console.error("Verify integrity error", err?.response?.status, err?.response?.data);
      message.error(err?.response?.data?.message || "Verification failed");
    }
  };

  const renderPreviewContent = () => {
    if (previewLoading) {
      return (
        <div className="flex h-[480px] items-center justify-center">
          <Spin tip="Loading preview..." />
        </div>
      );
    }

    if (previewError) {
      return (
        <Alert
          type="error"
          message="Preview Error"
          description={previewError}
          showIcon
        />
      );
    }

    if (!previewDoc || !previewUrl) {
      return (
        <Alert
          type="info"
          message="Preview Unavailable"
          description="No preview content to display."
          showIcon
        />
      );
    }

    const mime = previewDoc.mimeType?.toLowerCase() || "";

    if (mime.includes("image")) {
      return (
        <div className="flex max-h-[480px] items-center justify-center overflow-auto">
          <img src={previewUrl} alt={previewDoc.title} className="max-h-[460px]" />
        </div>
      );
    }

    if (mime.includes("pdf")) {
      return (
        <iframe
          src={previewUrl}
          title={`Preview ${previewDoc.title}`}
          className="h-[480px] w-full rounded-md border"
        />
      );
    }

    if (
      mime.includes("word") ||
      mime.includes("excel") ||
      mime.includes("spreadsheet") ||
      mime.includes("officedocument")
    ) {
      return (
        <object
          data={previewUrl}
          type={previewDoc.mimeType}
          className="h-[480px] w-full rounded-md border"
        >
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Alert
              type="warning"
              message="Preview might not be supported in this browser"
              description="You can download the file instead."
              showIcon
            />
            <Button
              onClick={() => download(previewDoc)}
              icon={<DownloadOutlined />}
            >
              Download
            </Button>
          </div>
        </object>
      );
    }

    return (
      <Alert
        type="info"
        message="Preview Not Supported"
        description="This file type cannot be previewed. Download to view the file."
        showIcon
      />
    );
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (v, r) => (
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            setViewDoc(r);
            setViewOpen(true);
          }}
        >
          {iconFor(r.mimeType)}
          <span className="font-medium">{v}</span>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: v => (
        <Tag color={CATEGORY_COLORS[v] || "default"} className="capitalize">
          {v || "General"}
        </Tag>
      ),
    },
    {
      title: "Type",
      dataIndex: "mimeType",
      key: "mimeType",
      render: v => v?.split("/").pop(),
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      render: v =>
        v
          ? (v / 1024 < 1024
              ? (v / 1024).toFixed(1) + " KB"
              : (v / 1024 / 1024).toFixed(2) + " MB")
          : "-",
    },
    {
      title: "Uploaded",
      dataIndex: "createdAt",
      key: "createdAt",
      render: v => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : ""),
      sorter: (a, b) =>
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      defaultSortOrder: "descend",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <div className="flex gap-2">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openPreview(r)}
            disabled={!isPreviewable(r.mimeType)}
          >
            View
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => download(r)}
          >
            Download
          </Button>
          <Button
            size="small"
            onClick={() => verifyIntegrity(r)}
          >
            Verify
          </Button>
          <Popconfirm
            title="Delete document?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(r._id)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 px-2 md:px-1 bg-white rounded-2xl outline outline-offset-1 outline-slate-300">
        <div>
          <nav className="px-5 h-20 flex items-center justify-between p-15">
            <div>
              <span className="text-2xl md:text-4xl font-bold text-gray-800">
                Public Documents
              </span>
            </div>
            <div className="flex items-center outline-1 outline-slate-300 rounded-2xl p-5 gap-3">
              <UserOutlined className="text-2xl text-blue-600" />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-gray-700">
                  {userProfile.fullName || "Administrator"}
                </span>
                <span className="text-xs text-gray-500">{username}</span>
              </div>
            </div>
          </nav>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="bg-slate-50 rounded-2xl shadow-md py-4 p-4">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold">
                    Total Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalDocs}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 rounded-2xl shadow-md py-4 p-4">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold">
                    Total Size
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {(totalSize / 1024 / 1024).toFixed(2)} MB
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 rounded-2xl shadow-md py-4 p-4">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold">
                    Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">{categories.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 rounded-2xl shadow-md py-4 p-4">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-sm font-bold">
                    Top Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {topCat || "—"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 space-y-4">
          <hr className="border-t border-gray-300" />
            <div className="flex flex-col md:flex-row flex-wrap gap-2 md:items-center md:justify-between">
              <div className="flex w-full gap-2 items-center">
                <Input.Search
                  allowClear
                  placeholder="Search public documents"
                  onSearch={v => setSearch(v.trim())}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  enterButton
                  className="flex-1 min-w-0 sm:min-w-[350px] md:min-w-[500px] max-w-full"
                />
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => {
                    setUploadOpen(true);
                    form.resetFields();
                  }}
                >
                  Upload
                </Button>
              </div>
            </div>
          <div className="overflow-x-auto">
            <Table
              rowKey="_id"
              loading={loading}
              dataSource={filtered}
              columns={columns}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 900 }}
            />
          </div>
        </div>

        <Modal
          title="Upload Public Document"
          open={uploadOpen}
          onCancel={() => setUploadOpen(false)}
          onOk={handleUpload}
          confirmLoading={uploading}
          okText="Upload"
          width={600}
        >
          <Form layout="vertical" form={form}>
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, message: "Title required" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="category" label="Category" initialValue="General">
              <Select
                options={[
                  "General",
                  "Announcement",
                  "Finance",
                  "Health",
                  "Education",
                ].map(c => ({ value: c, label: c }))}
              />
            </Form.Item>
            <Form.Item
              name="file"
              label="File"
              valuePropName="fileList"
              rules={[{ required: true, message: "File required" }]}
              getValueFromEvent={e => {
                if (Array.isArray(e)) return e;
                return e && e.fileList;
              }}
            >
              <Upload.Dragger
                multiple={false}
                beforeUpload={() => false}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                maxCount={1}
              >
                <p className="ant-upload-drag-icon">
                  <UploadOutlined />
                </p>
                <p className="ant-upload-text">
                  Click or drag file here (max 5MB)
                </p>
              </Upload.Dragger>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Document Details"
          open={viewOpen}
          onCancel={() => setViewOpen(false)}
          footer={[
            viewDoc && (
              <Button
                key="download"
                icon={<DownloadOutlined />}
                onClick={() => download(viewDoc)}
              >
                Download
              </Button>
            ),
            <Button key="close" onClick={() => setViewOpen(false)}>
              Close
            </Button>,
          ]}
          width={650}
        >
          {viewDoc && (
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Title">
                {viewDoc.title}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {viewDoc.description || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                {viewDoc.category}
              </Descriptions.Item>
              <Descriptions.Item label="Original Name">
                {viewDoc.originalName}
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                {viewDoc.mimeType}
              </Descriptions.Item>
              <Descriptions.Item label="Size">
                {(
                  viewDoc.size /
                  1024 /
                  (viewDoc.size / 1024 < 1024 ? 1 : 1024)
                ).toFixed(2)}{" "}
                {viewDoc.size / 1024 < 1024 ? "KB" : "MB"}
              </Descriptions.Item>
              <Descriptions.Item label="Uploaded At">
                {dayjs(viewDoc.createdAt).format("YYYY-MM-DD HH:mm")}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        <Modal
          title={previewDoc ? `Preview: ${previewDoc.title}` : "Document Preview"}
          open={previewOpen}
          onCancel={closePreview}
          footer={[
            previewDoc && (
              <Button
                key="download"
                icon={<DownloadOutlined />}
                onClick={() => download(previewDoc)}
              >
                Download
              </Button>
            ),
            <Button key="close" onClick={closePreview}>
              Close
            </Button>,
          ]}
          width={820}
          destroyOnClose
        >
          {renderPreviewContent()}
        </Modal>
      </div>
    </AdminLayout>
  );
}