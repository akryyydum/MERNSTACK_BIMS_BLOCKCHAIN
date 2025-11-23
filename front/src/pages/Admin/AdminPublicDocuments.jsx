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
import apiClient from '../../utils/apiClient';
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
      const res = await apiClient.get('/api/admin/public-documents');
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
      await apiClient.post('/api/admin/public-documents', fd, {
        headers: {
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
      await apiClient.delete(`/api/admin/public-documents/${id}`);
      setDocs(prev => prev.filter(d => d._id !== id));
      message.success("Deleted");
    } catch {
      message.error("Delete failed");
    }
  };

  const download = async record => {
    try {
      const res = await apiClient.get(
        `/api/admin/public-documents/${record._id}/download`,
        {
          responseType: "blob",
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
      const res = await apiClient.get(
        `/api/admin/public-documents/${record._id}/download`,
        {
          responseType: "blob",
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
  // Verification moved to backend list response - status field per document
  // Possible statuses: verified, edited, deleted, not_registered, error
  const STATUS_COLORS = {
    verified: 'green',
    edited: 'orange',
    deleted: 'red',
    not_registered: 'default',
    error: 'volcano'
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: v => (
        <Tag color={STATUS_COLORS[v] || 'default'} className="uppercase tracking-wide">
          {v === 'not_registered' ? 'UNREGISTERED' : (v || 'N/A').toUpperCase()}
        </Tag>
      ),
      filters: [
        'verified','edited','deleted','not_registered','error'
      ].map(s => ({ text: s.toUpperCase(), value: s })),
      onFilter: (value, record) => record.status === value,
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
            
          </nav>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card className="bg-slate-50 rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold">
                    Total Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-3xl font-bold">{totalDocs}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold">
                    Total Size
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-base md:text-xl font-semibold">
                    {(totalSize / 1024 / 1024).toFixed(2)} MB
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold">
                    Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-base md:text-xl font-semibold">{categories.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 rounded-2xl shadow-md py-2 md:py-4 p-2 md:p-4">
                <CardHeader className="flex flex-row items-center justify-between p-0">
                  <CardTitle className="text-xs md:text-sm font-bold">
                    Top Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-base md:text-xl font-semibold">
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
                  className="hidden sm:inline-flex"
                >
                  Upload
                </Button>
              </div>
            </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <Table
                  rowKey="_id"
                  loading={loading}
                  dataSource={filtered}
                  columns={columns}
                  pagination={{ 
                    pageSize: 10,
                    showSizeChanger: false,
                    responsive: true,
                    className: "px-4 sm:px-0"
                  }}
                  scroll={{ x: 900 }}
                  className="mobile-responsive-table"
                />
              </div>
            </div>
          </div>
        </div>
        <style jsx global>{`
          @media (max-width: 768px) {
            .mobile-responsive-table .ant-table {
              font-size: 12px !important;
            }
            .mobile-responsive-table .ant-table-thead > tr > th {
              padding: 8px 6px !important;
              font-size: 11px !important;
              font-weight: 600 !important;
              white-space: nowrap;
            }
            .mobile-responsive-table .ant-table-tbody > tr > td {
              padding: 8px 6px !important;
              font-size: 12px !important;
              white-space: nowrap;
            }
            .mobile-responsive-table .ant-btn-sm {
              font-size: 11px !important;
              padding: 2px 6px !important;
              height: 26px !important;
            }
            .mobile-responsive-table .ant-tag {
              font-size: 11px !important;
              padding: 0 6px !important;
              margin: 1px !important;
            }
            .mobile-responsive-table .ant-table-tbody > tr > td .flex {
              gap: 4px;
            }
          }
          @media (max-width: 640px) {
            .mobile-responsive-table .ant-table-tbody > tr > td {
              white-space: nowrap !important;
            }
          }
        `}</style>

        <Modal
          title={<span className="text-base md:text-lg">Upload Public Document</span>}
          open={uploadOpen}
          onCancel={() => setUploadOpen(false)}
          onOk={handleUpload}
          confirmLoading={uploading}
          okText="Upload"
          width={600}
          className="mobile-responsive-modal"
          style={{ maxWidth: 'calc(100vw - 32px)' }}
        >
          <Alert
            message={<span className="text-sm md:text-base">Upload Public Document</span>}
            description={<span className="text-xs md:text-sm">Upload a document that will be visible to all residents. Provide a title, optional description, and select a category. Supported file types include PDF, Word, Excel, and images.</span>}
            type="info"
            showIcon
            className="mb-3 md:mb-4"
          />
          <div style={{ marginBottom: 12 }} />
          <Form layout="vertical" form={form} className="mobile-responsive-form">
            <Form.Item
              name="title"
              label={<span className="text-xs md:text-sm">Title</span>}
              rules={[{ required: true, message: "Title required" }]}
            >
              <Input className="text-sm" />
            </Form.Item>
            <Form.Item name="description" label={<span className="text-xs md:text-sm">Description</span>}>
              <Input.TextArea rows={3} className="text-sm" />
            </Form.Item>
            <Form.Item name="category" label={<span className="text-xs md:text-sm">Category</span>} initialValue="General">
              <Select
                className="text-sm"
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
              label={<span className="text-xs md:text-sm">File</span>}
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
                <p className="ant-upload-text text-xs md:text-sm">
                  Click or drag file here (max 5MB)
                </p>
              </Upload.Dragger>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={<span className="text-base md:text-lg">Document Details</span>}
          open={viewOpen}
          onCancel={() => setViewOpen(false)}
          footer={[
            viewDoc && (
              <Button
                key="download"
                icon={<DownloadOutlined />}
                onClick={() => download(viewDoc)}
                className="text-xs md:text-sm"
              >
                Download
              </Button>
            ),
            <Button key="close" onClick={() => setViewOpen(false)} className="text-xs md:text-sm">
              Close
            </Button>,
          ]}
          width={650}
          className="mobile-responsive-modal"
          style={{ maxWidth: 'calc(100vw - 32px)' }}
        >
          {viewDoc && (
            <Descriptions bordered column={1} size="middle" className="mobile-responsive-descriptions">
              <Descriptions.Item label={<span className="text-xs md:text-sm">Title</span>}>
                <span className="text-xs md:text-sm">{viewDoc.title}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span className="text-xs md:text-sm">Description</span>}>
                <span className="text-xs md:text-sm">{viewDoc.description || "-"}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span className="text-xs md:text-sm">Category</span>}>
                <span className="text-xs md:text-sm">{viewDoc.category}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span className="text-xs md:text-sm">Original Name</span>}>
                <span className="text-xs md:text-sm break-all">{viewDoc.originalName}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span className="text-xs md:text-sm">Type</span>}>
                <span className="text-xs md:text-sm">{viewDoc.mimeType}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span className="text-xs md:text-sm">Size</span>}>
                <span className="text-xs md:text-sm">
                  {(
                    viewDoc.size /
                    1024 /
                    (viewDoc.size / 1024 < 1024 ? 1 : 1024)
                  ).toFixed(2)}{" "}
                  {viewDoc.size / 1024 < 1024 ? "KB" : "MB"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={<span className="text-xs md:text-sm">Uploaded At</span>}>
                <span className="text-xs md:text-sm">{dayjs(viewDoc.createdAt).format("YYYY-MM-DD HH:mm")}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span className="text-xs md:text-sm">Blockchain Status</span>}>
                <Tag color={STATUS_COLORS[viewDoc.status] || 'default'} className="text-xs">
                  {viewDoc.status === 'not_registered' ? 'UNREGISTERED' : (viewDoc.status || 'N/A').toUpperCase()}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        <Modal
          title={<span className="text-base md:text-lg">{previewDoc ? `Preview: ${previewDoc.title}` : "Document Preview"}</span>}
          open={previewOpen}
          onCancel={closePreview}
          footer={[
            previewDoc && (
              <Button
                key="download"
                icon={<DownloadOutlined />}
                onClick={() => download(previewDoc)}
                className="text-xs md:text-sm"
              >
                Download
              </Button>
            ),
            <Button key="close" onClick={closePreview} className="text-xs md:text-sm">
              Close
            </Button>,
          ]}
          width={820}
          className="mobile-responsive-modal"
          style={{ maxWidth: 'calc(100vw - 32px)' }}
          destroyOnClose
        >
          {renderPreviewContent()}
        </Modal>
        <style jsx global>{`
          @media (max-width: 768px) {
            .mobile-responsive-modal .ant-modal-header {
              padding: 12px 16px;
            }
            .mobile-responsive-modal .ant-modal-body {
              padding: 12px 16px;
            }
            .mobile-responsive-modal .ant-modal-footer {
              padding: 8px 16px;
            }
            .mobile-responsive-modal .ant-modal-footer .ant-btn {
              font-size: 12px;
              padding: 4px 12px;
              height: 28px;
            }
            .mobile-responsive-form .ant-form-item {
              margin-bottom: 12px;
            }
            .mobile-responsive-form .ant-form-item-label {
              padding-bottom: 4px;
            }
            .mobile-responsive-form .ant-input,
            .mobile-responsive-form .ant-input-textarea,
            .mobile-responsive-form .ant-select-selector {
              font-size: 13px;
            }
            .mobile-responsive-descriptions .ant-descriptions-item-label,
            .mobile-responsive-descriptions .ant-descriptions-item-content {
              padding: 8px 12px;
            }
          }
          @media (max-width: 640px) {
            .mobile-responsive-modal .ant-modal-header {
              padding: 10px 12px;
            }
            .mobile-responsive-modal .ant-modal-body {
              padding: 10px 12px;
              max-height: calc(100vh - 180px);
              overflow-y: auto;
            }
            .mobile-responsive-modal .ant-modal-footer {
              padding: 6px 12px;
            }
            .mobile-responsive-modal .ant-modal-footer .ant-btn {
              font-size: 11px;
              padding: 3px 10px;
              height: 26px;
            }
            .mobile-responsive-form .ant-form-item {
              margin-bottom: 10px;
            }
            .mobile-responsive-form .ant-input,
            .mobile-responsive-form .ant-input-textarea,
            .mobile-responsive-form .ant-select-selector {
              font-size: 12px;
            }
            .mobile-responsive-form .ant-upload-drag {
              padding: 12px;
            }
            .mobile-responsive-descriptions .ant-descriptions-item-label,
            .mobile-responsive-descriptions .ant-descriptions-item-content {
              padding: 6px 8px;
            }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}